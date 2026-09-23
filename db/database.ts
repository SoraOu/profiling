// db/database.ts
import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;
  dbPromise = SQLite.openDatabaseAsync("mogpog_mno.db").then(async (db) => {
    await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    dbInstance = db;
    return db;
  });
  return dbPromise;
}

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS survey_years (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS barangays (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, municipality TEXT NOT NULL DEFAULT 'Mogpog', year_id INTEGER NOT NULL, FOREIGN KEY (year_id) REFERENCES survey_years(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS households (id INTEGER PRIMARY KEY AUTOINCREMENT, year_id INTEGER NOT NULL, barangay_id INTEGER NOT NULL, is_draft INTEGER NOT NULL DEFAULT 1, hh_id TEXT, hh_head_name TEXT, purok TEXT, location_type TEXT, dwelling_type TEXT, toilet_facility TEXT, water_drinking TEXT, water_daily_use TEXT, waste_disposal TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (year_id) REFERENCES survey_years(id) ON DELETE CASCADE, FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS family_heads (id INTEGER PRIMARY KEY AUTOINCREMENT, household_id INTEGER NOT NULL, name TEXT, date_of_interview TEXT, contact_no TEXT, member_count INTEGER DEFAULT 0, income_sources TEXT DEFAULT '[]', income_sources_other TEXT, income_range TEXT, gov_programs TEXT DEFAULT '[]', livelihoods TEXT DEFAULT '[]', gov_programs_other TEXT, hfias_q1 INTEGER DEFAULT 0, hfias_q2 INTEGER DEFAULT 0, hfias_q3 INTEGER DEFAULT 0, hfias_q4 INTEGER DEFAULT 0, hfias_q5 INTEGER DEFAULT 0, hfias_q6 INTEGER DEFAULT 0, hfias_q7 INTEGER DEFAULT 0, hfias_q8 INTEGER DEFAULT 0, hfias_q9 INTEGER DEFAULT 0, hfias_total INTEGER DEFAULT 0, hfias_interpretation TEXT, coping_strategies TEXT DEFAULT '[]', skills TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS children (id INTEGER PRIMARY KEY AUTOINCREMENT, family_head_id INTEGER NOT NULL, household_id INTEGER NOT NULL, name TEXT, birthday TEXT, age_in_days INTEGER, nutritional_statuses TEXT DEFAULT '[]', disability TEXT, medical_condition TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (family_head_id) REFERENCES family_heads(id) ON DELETE CASCADE, FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE);
    `,
  },
  {
    version: 2,
    sql: `ALTER TABLE family_heads ADD COLUMN gov_assistance_amount TEXT;`,
  },
  // Feature: GPS tagging on households
  {
    version: 3,
    sql: `
      ALTER TABLE households ADD COLUMN latitude REAL;
      ALTER TABLE households ADD COLUMN longitude REAL;
    `,
  },
  // Feature: skills_other free-text on family_heads
  {
    version: 4,
    sql: `ALTER TABLE family_heads ADD COLUMN skills_other TEXT;`,
  },
];

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);`);

  for (const migration of MIGRATIONS) {
    const already = await db.getFirstAsync<{ version: number }>(
      "SELECT version FROM schema_migrations WHERE version = ?", [migration.version]
    );
    if (already) continue;

    // Split multi-statement migrations and run each individually
    const stmts = migration.sql.split(";").map((s) => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      try {
        await db.execAsync(stmt + ";");
      } catch (e: any) {
        if (!String(e).includes("duplicate column")) throw e;
      }
    }
    await db.runAsync("INSERT INTO schema_migrations (version) VALUES (?)", [migration.version]);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function computeHfiasInterpretation(total: number): string {
  if (total === 0) return "Food Secure";
  if (total <= 7) return "Mildly Food Insecure";
  if (total <= 14) return "Moderately Food Insecure";
  return "Severely Food Insecure";
}

export async function generateHhId(
  year: number, barangay: string, purok: string,
  lastName: string, existingIds: string[]
): Promise<string> {
  const base = `${year}-${barangay}-${purok}-${lastName}`.replace(/\s+/g, "").toUpperCase();
  if (!existingIds.includes(base)) return base;
  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function parseJSON(val: any, fallback: any = []) {
  try { return JSON.parse(val || JSON.stringify(fallback)); }
  catch { return fallback; }
}

// ─── Optimized aggregate — single JOIN replaces N+1 loops ─────────────────────
//
//  Used by both export.tsx and the in-app Dashboard.
//  Returns the same shape as the old aggregateBarangay helpers.

export async function aggregateBarangayOptimized(db: any, barangayId: number | string) {
  const rows = await db.getAllAsync(`
    SELECT
      h.id         AS hh_id,
      h.location_type, h.dwelling_type, h.toilet_facility,
      h.water_drinking, h.water_daily_use, h.waste_disposal,
      fh.id        AS fh_id,
      fh.member_count, fh.income_sources, fh.income_range,
      fh.gov_programs, fh.livelihoods,
      fh.hfias_total, fh.coping_strategies, fh.skills,
      c.id         AS child_id,
      c.nutritional_statuses, c.disability, c.medical_condition
    FROM households h
    LEFT JOIN family_heads fh ON fh.household_id = h.id
    LEFT JOIN children     c  ON c.family_head_id = fh.id
    WHERE h.barangay_id = ? AND h.is_draft = 0
  `, [barangayId]);

  const hhSeen = new Set<number>();
  const fhSeen = new Set<number>();

  let totalHH = 0, totalFamilies = 0, totalMembers = 0, totalChildren = 0;
  const loc   = { urban: 0, ruralInland: 0, ruralCoastal: 0, ruralUpland: 0 };
  const dwell = { concrete: 0, semiConcrete: 0, light: 0, makeshift: 0 };
  const toilet = { waterSealed: 0, shared: 0, pitLatrine: 0, open: 0 };
  const waterD = { l1: 0, l2: 0, l3: 0, refill: 0, unimp: 0 };
  const waterU = { l1: 0, l2: 0, l3: 0, refill: 0, unimp: 0 };
  const waste  = { collected: 0, burned: 0, openDump: 0, composting: 0 };
  const income = { farming: 0, fishing: 0, labor: 0, govt: 0, private: 0, business: 0, remit: 0, others: 0 };
  const incRange = { low: 0, mid1: 0, mid2: 0, high: 0 };
  let govAssist = 0;
  const prog = { fourPs: 0, suppFeeding: 0, tutok: 0, livelihood: 0, dole: 0, da: 0, lgu: 0, philHealth: 0, others: 0 };
  const nutr = { uw: 0, suw: 0, mam: 0, sam: 0, st: 0, sst: 0, ow: 0, ob: 0 };
  let withDisability = 0, withMedical = 0;
  let totalFoodScore = 0, scoreFamilies = 0;
  const hfias = { secure: 0, mild: 0, moderate: 0, severe: 0 };
  const coping = { borrow: 0, reduceMeal: 0, skip: 0, cheaper: 0, sellAssets: 0 };
  const skills = {
    cooking: 0, baking: 0, foodProc: 0, sariSari: 0,
    farming: 0, gardening: 0, livestock: 0, fishing: 0,
    carpentry: 0, masonry: 0, sewing: 0, handicrafts: 0,
    driving: 0, housekeeping: 0, computer: 0,
  };

  for (const row of rows) {
    // ── Household (once per unique hh) ───────────────────────────────
    if (!hhSeen.has(row.hh_id)) {
      hhSeen.add(row.hh_id);
      totalHH++;

      const lt = (row.location_type || "").toLowerCase();
      if (lt.includes("urban")) loc.urban++;
      else if (lt.includes("inland")) loc.ruralInland++;
      else if (lt.includes("coastal")) loc.ruralCoastal++;
      else if (lt.includes("upland")) loc.ruralUpland++;

      const dt = (row.dwelling_type || "").toLowerCase();
      if (dt.includes("concrete") && !dt.includes("semi")) dwell.concrete++;
      else if (dt.includes("semi")) dwell.semiConcrete++;
      else if (dt.includes("light")) dwell.light++;
      else if (dt.includes("makeshift")) dwell.makeshift++;

      const tf = (row.toilet_facility || "").toLowerCase();
      if (tf.includes("water-sealed") || tf.includes("water sealed")) toilet.waterSealed++;
      else if (tf.includes("shared")) toilet.shared++;
      else if (tf.includes("pit")) toilet.pitLatrine++;
      else if (tf.includes("open")) toilet.open++;

      const countWater = (s: string, bucket: typeof waterD) => {
        const v = s.toLowerCase();
        if (v.includes("level i") && !v.includes("ii") && !v.includes("iii")) bucket.l1++;
        else if (v.includes("level ii") && !v.includes("iii")) bucket.l2++;
        else if (v.includes("level iii")) bucket.l3++;
        else if (v.includes("refill")) bucket.refill++;
        else if (v.includes("unimp") || v.includes("ilog") || v.includes("unimproved")) bucket.unimp++;
      };
      countWater(row.water_drinking || "", waterD);
      countWater(row.water_daily_use || "", waterU);

      const wt = (row.waste_disposal || "").toLowerCase();
      if (wt.includes("collect")) waste.collected++;
      else if (wt.includes("burn")) waste.burned++;
      else if (wt.includes("open")) waste.openDump++;
      else if (wt.includes("compost")) waste.composting++;
    }

    // ── Family head (once per unique fh) ─────────────────────────────
    if (row.fh_id && !fhSeen.has(row.fh_id)) {
      fhSeen.add(row.fh_id);
      totalFamilies++;
      totalMembers += row.member_count || 0;

      const src: string[] = parseJSON(row.income_sources);
      if (src.includes("Farming")) income.farming++;
      if (src.includes("Fishing")) income.fishing++;
      if (src.includes("Labor (skilled/unskilled)")) income.labor++;
      if (src.includes("Government employment")) income.govt++;
      if (src.includes("Private employment")) income.private++;
      if (src.includes("Business")) income.business++;
      if (src.includes("Remittances")) income.remit++;
      if (src.includes("Others")) income.others++;

      const ir = row.income_range || "";
      if (ir.includes("5,000") || ir.includes("5000")) incRange.low++;
      else if (ir.includes("5,001") || ir.includes("10,000")) incRange.mid1++;
      else if (ir.includes("10,001") || ir.includes("20,000")) incRange.mid2++;
      else if (ir.includes("20,001") || ir.includes("above")) incRange.high++;

      const gp: string[] = parseJSON(row.gov_programs);
      const lv: string[] = parseJSON(row.livelihoods);
      if (gp.length > 0 || lv.length > 0) govAssist++;
      if (gp.includes("4Ps (Pantawid Pamilyang Pilipino Program)")) prog.fourPs++;
      if (gp.includes("Supplementary Feeding Program")) prog.suppFeeding++;
      if (gp.includes("Tutok Kainan")) prog.tutok++;
      if (gp.includes("Livelihood Assistance")) prog.livelihood++;
      if (lv.includes("DOLE")) prog.dole++;
      if (lv.includes("DA")) prog.da++;
      if (lv.includes("LGU")) prog.lgu++;
      if (gp.includes("PhilHealth Member")) prog.philHealth++;
      if (gp.includes("Others")) prog.others++;

      const score = row.hfias_total || 0;
      totalFoodScore += score;
      scoreFamilies++;
      if (score === 0) hfias.secure++;
      else if (score <= 7) hfias.mild++;
      else if (score <= 14) hfias.moderate++;
      else hfias.severe++;

      const cp: { strategy: string }[] = parseJSON(row.coping_strategies);
      const cpNames = cp.map((c: any) => c.strategy);
      if (cpNames.includes("Borrow food/money")) coping.borrow++;
      if (cpNames.includes("Reduce meal size")) coping.reduceMeal++;
      if (cpNames.includes("Skip meals")) coping.skip++;
      if (cpNames.includes("Buy cheaper food")) coping.cheaper++;
      if (cpNames.includes("Sell assets")) coping.sellAssets++;

      const sk: string[] = parseJSON(row.skills);
      if (sk.includes("Cooking / Food preparation")) skills.cooking++;
      if (sk.includes("Baking")) skills.baking++;
      if (sk.includes("Food processing (e.g., drying, preserving, bottling)")) skills.foodProc++;
      if (sk.includes("Sari-sari store / small business management")) skills.sariSari++;
      if (sk.includes("Farming (crop production)")) skills.farming++;
      if (sk.includes("Gardening / Urban gardening")) skills.gardening++;
      if (sk.includes("Basic livestock raising (chicken, pigs, goats)")) skills.livestock++;
      if (sk.includes("Fishing / Aquaculture")) skills.fishing++;
      if (sk.includes("Carpentry")) skills.carpentry++;
      if (sk.includes("Masonry")) skills.masonry++;
      if (sk.includes("Sewing / Tailoring")) skills.sewing++;
      if (sk.includes("Handicrafts (weaving, beadwork, etc.)")) skills.handicrafts++;
      if (sk.includes("Driving")) skills.driving++;
      if (sk.includes("Housekeeping / Domestic work")) skills.housekeeping++;
      if (sk.includes("Computer / Digital skills")) skills.computer++;
    }

    // ── Child ─────────────────────────────────────────────────────────
    if (row.child_id) {
      totalChildren++;
      const ns: string[] = parseJSON(row.nutritional_statuses);
      if (ns.includes("UW")) nutr.uw++;
      if (ns.includes("SUW")) nutr.suw++;
      if (ns.includes("MAM")) nutr.mam++;
      if (ns.includes("SAM")) nutr.sam++;
      if (ns.includes("ST")) nutr.st++;
      if (ns.includes("SST")) nutr.sst++;
      if (ns.includes("OW")) nutr.ow++;
      if (ns.includes("OB")) nutr.ob++;
      if (row.disability) withDisability++;
      if (row.medical_condition) withMedical++;
    }
  }

  const avgScore = scoreFamilies > 0 ? (totalFoodScore / scoreFamilies).toFixed(1) : "0.0";

  return {
    totalHH, totalFamilies, totalMembers, totalChildren,
    loc, dwell, toilet, waterD, waterU, waste,
    income, incRange, govAssist, prog,
    nutr, withDisability, withMedical,
    avgScore, hfias, coping, skills,
  };
}