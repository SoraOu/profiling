import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { getDb } from "@/db/database";

// ─── helpers ────────────────────────────────────────────────────────────────

function parseJSON(val: any, fallback: any = []) {
  try { return JSON.parse(val || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function has(arr: string[], item: string): string {
  return arr.includes(item) ? "Yes" : "";
}
function copingFreq(arr: { strategy: string; frequency: string }[], name: string): string {
  const found = arr.find((s) => s.strategy === name);
  return found ? (found.frequency || "Yes") : "";
}
function yn(val: any): string {
  return val ? "Yes" : "";
}

// ─── export value mappers ────────────────────────────────────────────────────

function mapLocationType(val: string | null): string {
  if (!val) return "";
  const v = val.toLowerCase();
  if (v.includes("urban")) return "Urban";
  if (v.includes("inland")) return "Rural-Inland";
  if (v.includes("coastal")) return "Rural-Coastal";
  if (v.includes("upland")) return "Rural-Upland";
  return val;
}

function mapDwellingType(val: string | null): string {
  if (!val) return "";
  const v = val.toLowerCase();
  if (v.includes("semi")) return "Semi-Concrete";
  if (v.includes("light")) return "Light Materials";
  if (v.includes("makeshift")) return "Makeshift";
  if (v.includes("concrete")) return "Concrete";
  return val;
}

function mapToiletFacility(val: string | null): string {
  if (!val) return "";
  const v = val.toLowerCase();
  if (v.includes("water-sealed") || v.includes("water sealed")) return "Water-Sealed (Own)";
  if (v.includes("shared")) return "Shared";
  if (v.includes("pit")) return "Pit Latrine";
  if (v.includes("open")) return "Open Defecation";
  return val;
}

function mapWaterSource(val: string | null): string {
  if (!val) return "";
  const v = val.toLowerCase();
  if (v.includes("level iii") || v.includes("level 3")) return "Level III";
  if (v.includes("level ii") || v.includes("level 2")) return "Level II";
  if (v.includes("level i") || v.includes("level 1")) return "Level I";
  if (v.includes("refill")) return "Refilling Station";
  if (v.includes("unimp") || v.includes("ilog") || v.includes("unimproved")) return "Unimproved";
  return val;
}

function mapIncomeRange(val: string | null): string {
  if (!val) return "";
  const v = val.toLowerCase();
  if (v.includes("5,000") || v.includes("5000") || (v.includes("below") && !v.includes("20"))) return "5000 & Below";
  if (v.includes("5,001") || (v.includes("10,000") && !v.includes("20"))) return "5k-10k";
  if (v.includes("10,001") || v.includes("20,000")) return "10k-20k";
  if (v.includes("20,001") || (v.includes("above") && !v.includes("5"))) return "20k & Above";
  return val;
}

// ─── row builder (Detail + Raw) ──────────────────────────────────────────────

function buildRow(
  yr: any, brgy: any, hh: any,
  fh: any, fhIndex: number,
  child: any | null, childIndex: number,
  totalFamilies: number,
  allFamilyHeads: any[]
) {
  const incomeSources: string[] = parseJSON(fh.income_sources);
  const govPrograms: string[] = parseJSON(fh.gov_programs);
  const livelihoods: string[] = parseJSON(fh.livelihoods);
  const copingStrategies: { strategy: string; frequency: string }[] = parseJSON(fh.coping_strategies);
  const skills: string[] = parseJSON(fh.skills);
  const nutritionalStatuses: string[] = child ? parseJSON(child.nutritional_statuses) : [];

  let rowType: string;
  if (child === null) {
    rowType = fhIndex === 0 ? "HH" : "FM";
  } else {
    if (fhIndex === 0 && childIndex === 0) rowType = "HH";
    else if (childIndex === 0) rowType = "FM";
    else rowType = "M";
  }

  // Family member counts — only populated on the first row of each HH (fhIndex === 0)
  const family1Members = fhIndex === 0 ? (allFamilyHeads[0]?.member_count ?? "") : "";
  const family2Members = fhIndex === 0 ? (allFamilyHeads[1]?.member_count ?? "") : "";
  const family3Members = fhIndex === 0 ? (allFamilyHeads[2]?.member_count ?? "") : "";
  const family4Members = fhIndex === 0 ? (allFamilyHeads[3]?.member_count ?? "") : "";

  return {
    "Row Type": rowType,
    "HH ID": hh.hh_id,
    "Date of Interview": fh.date_of_interview,
    "Barangay": brgy.name,
    "Municipality": brgy.municipality,
    "HH Head Name": hh.hh_head_name,
    "Respondent Name": fh.name,
    "Contact No.": fh.contact_no,
    "Location Type": mapLocationType(hh.location_type),
    "No. of Families in HH": fhIndex === 0 ? totalFamilies : "",
    "Total HH Members": fhIndex === 0 ? fh.member_count : "",
    "Family 1 — No. of Members": family1Members,
    "Family 2 — No. of Members": family2Members,
    "Family 3 — No. of Members": family3Members,
    "Family 4 — No. of Members": family4Members,
    "Dwelling Type": mapDwellingType(hh.dwelling_type),
    "Toilet Facility": mapToiletFacility(hh.toilet_facility),
    "Water Source (Drinking)": mapWaterSource(hh.water_drinking),
    "Water Source (Daily Use)": mapWaterSource(hh.water_daily_use),
    "Waste Disposal": hh.waste_disposal,
    "Farming (Income)": has(incomeSources, "Farming"),
    "Fishing (Income)": has(incomeSources, "Fishing"),
    "Labor": has(incomeSources, "Labor (skilled/unskilled)"),
    "Gov't Employment": has(incomeSources, "Government employment"),
    "Private Employment": has(incomeSources, "Private employment"),
    "Business": has(incomeSources, "Business"),
    "Remittances": has(incomeSources, "Remittances"),
    "Others (Income)": has(incomeSources, "Others"),
    "Income Range": mapIncomeRange(fh.income_range),
    "Assistance Amount": fh.gov_assistance_amount ?? "",
    "4Ps": has(govPrograms, "4Ps (Pantawid Pamilyang Pilipino Program)"),
    "Supp. Feeding": has(govPrograms, "Supplementary Feeding Program"),
    "Tutok Kainan": has(govPrograms, "Tutok Kainan"),
    "Livelihood Assistance": has(govPrograms, "Livelihood Assistance"),
    "DOLE": has(livelihoods, "DOLE"),
    "DA": has(livelihoods, "DA"),
    "LGU": has(livelihoods, "LGU"),
    "PhilHealth": has(govPrograms, "PhilHealth Member"),
    "Others (Program)": has(govPrograms, "Others"),
    "Interview Date (auto)": fh.date_of_interview,
    "Member Name": child ? child.name : "",
    "Birthday": child ? child.birthday : "",
    "Age in Days": child ? child.age_in_days : "",
    "UW": has(nutritionalStatuses, "UW"),
    "SUW": has(nutritionalStatuses, "SUW"),
    "MAM": has(nutritionalStatuses, "MAM"),
    "SAM": has(nutritionalStatuses, "SAM"),
    "ST": has(nutritionalStatuses, "ST"),
    "SST": has(nutritionalStatuses, "SST"),
    "OW": has(nutritionalStatuses, "OW"),
    "OB": has(nutritionalStatuses, "OB"),
    "Disability": child ? (child.disability || "") : "",
    "Medical Condition": child ? (child.medical_condition || "") : "",
    "Q1 (0-3)": fh.hfias_q1,
    "Q2 (0-3)": fh.hfias_q2,
    "Q3 (0-3)": fh.hfias_q3,
    "Q4 (0-3)": fh.hfias_q4,
    "Q5 (0-3)": fh.hfias_q5,
    "Q6 (0-3)": fh.hfias_q6,
    "Q7 (0-3)": fh.hfias_q7,
    "Q8 (0-3)": fh.hfias_q8,
    "Q9 (0-3)": fh.hfias_q9,
    "Total Score": fh.hfias_total,
    "Interpretation": fh.hfias_interpretation,
    "Borrow Food/Money": copingFreq(copingStrategies, "Borrow food/money"),
    "Reduce Meal Size": copingFreq(copingStrategies, "Reduce meal size"),
    "Skip Meals": copingFreq(copingStrategies, "Skip meals"),
    "Buy Cheaper Food": copingFreq(copingStrategies, "Buy cheaper food"),
    "Sell Assets": copingFreq(copingStrategies, "Sell assets"),
    "Cooking": has(skills, "Cooking / Food preparation"),
    "Baking": has(skills, "Baking"),
    "Food Processing": has(skills, "Food processing (e.g., drying, preserving, bottling)"),
    "Sari-Sari Store": has(skills, "Sari-sari store / small business management"),
    "Farming (Skill)": has(skills, "Farming (crop production)"),
    "Gardening": has(skills, "Gardening / Urban gardening"),
    "Livestock": has(skills, "Basic livestock raising (chicken, pigs, goats)"),
    "Fishing (Skill)": has(skills, "Fishing / Aquaculture"),
    "Carpentry": has(skills, "Carpentry"),
    "Masonry": has(skills, "Masonry"),
    "Sewing": has(skills, "Sewing / Tailoring"),
    "Handicrafts": has(skills, "Handicrafts (weaving, beadwork, etc.)"),
    "Driving": has(skills, "Driving"),
    "Housekeeping": has(skills, "Housekeeping / Domestic work"),
    "Computer/Digital": has(skills, "Computer / Digital skills"),
  };
}

// ─── summary aggregator ──────────────────────────────────────────────────────

async function aggregateBarangay(db: any, brgy: any) {
  const households = await (db as any).getAllAsync(
    "SELECT * FROM households WHERE barangay_id = ? AND is_draft = 0", [brgy.id]
  );

  let totalHH = households.length;
  let totalFamilies = 0;
  let totalMembers = 0;
  let totalChildren = 0;

  // counters – init all to 0
  const loc = { urban: 0, ruralInland: 0, ruralCoastal: 0, ruralUpland: 0 };
  const dwell = { concrete: 0, semiConcrete: 0, light: 0, makeshift: 0 };
  const toilet = { waterSealed: 0, shared: 0, pitLatrine: 0, open: 0 };
  const waterD = { l1: 0, l2: 0, l3: 0, refill: 0, unimp: 0 };
  const waterU = { l1: 0, l2: 0, l3: 0, refill: 0, unimp: 0 };
  const waste = { collected: 0, burned: 0, openDump: 0, composting: 0 };
  const income = { farming: 0, fishing: 0, labor: 0, govt: 0, private: 0, business: 0, remit: 0, others: 0 };
  const incRange = { low: 0, mid1: 0, mid2: 0, high: 0 };
  let govAssist = 0;
  const prog = { fourPs: 0, suppFeeding: 0, tutok: 0, livelihood: 0, dole: 0, da: 0, lgu: 0, philHealth: 0, others: 0 };
  const nutr = { uw: 0, suw: 0, mam: 0, sam: 0, st: 0, sst: 0, ow: 0, ob: 0 };
  let withDisability = 0;
  let withMedical = 0;
  let totalFoodScore = 0;
  let scoreFamilies = 0;
  const hfias = { secure: 0, mild: 0, moderate: 0, severe: 0 };
  const coping = { borrow: 0, reduceMeal: 0, skip: 0, cheaper: 0, sellAssets: 0 };
  const skills = { cooking: 0, baking: 0, foodProc: 0, sariSari: 0, farming: 0, gardening: 0, livestock: 0, fishing: 0, carpentry: 0, masonry: 0, sewing: 0, handicrafts: 0, driving: 0, housekeeping: 0, computer: 0 };

  for (const hh of households) {
    // Location
    const lt = (hh.location_type || "").toLowerCase();
    if (lt.includes("urban")) loc.urban++;
    else if (lt.includes("inland")) loc.ruralInland++;
    else if (lt.includes("coastal")) loc.ruralCoastal++;
    else if (lt.includes("upland")) loc.ruralUpland++;

    // Dwelling
    const dt = (hh.dwelling_type || "").toLowerCase();
    if (dt.includes("concrete") && !dt.includes("semi")) dwell.concrete++;
    else if (dt.includes("semi")) dwell.semiConcrete++;
    else if (dt.includes("light")) dwell.light++;
    else if (dt.includes("makeshift")) dwell.makeshift++;

    // Toilet
    const tf = (hh.toilet_facility || "").toLowerCase();
    if (tf.includes("water-sealed") || tf.includes("water sealed")) toilet.waterSealed++;
    else if (tf.includes("shared")) toilet.shared++;
    else if (tf.includes("pit")) toilet.pitLatrine++;
    else if (tf.includes("open")) toilet.open++;

    // Water drinking
    const wd = (hh.water_drinking || "").toLowerCase();
    if (wd.includes("level i") && !wd.includes("ii") && !wd.includes("iii")) waterD.l1++;
    else if (wd.includes("level ii") && !wd.includes("iii")) waterD.l2++;
    else if (wd.includes("level iii")) waterD.l3++;
    else if (wd.includes("refill")) waterD.refill++;
    else if (wd.includes("unimp") || wd.includes("ilog") || wd.includes("unimproved")) waterD.unimp++;

    // Water daily use
    const wu = (hh.water_daily_use || "").toLowerCase();
    if (wu.includes("level i") && !wu.includes("ii") && !wu.includes("iii")) waterU.l1++;
    else if (wu.includes("level ii") && !wu.includes("iii")) waterU.l2++;
    else if (wu.includes("level iii")) waterU.l3++;
    else if (wu.includes("refill")) waterU.refill++;
    else if (wu.includes("unimp") || wu.includes("ilog") || wu.includes("unimproved")) waterU.unimp++;

    // Waste
    const wt = (hh.waste_disposal || "").toLowerCase();
    if (wt.includes("collect")) waste.collected++;
    else if (wt.includes("burn")) waste.burned++;
    else if (wt.includes("open")) waste.openDump++;
    else if (wt.includes("compost")) waste.composting++;

    const familyHeads = await (db as any).getAllAsync(
      "SELECT * FROM family_heads WHERE household_id = ?", [hh.id]
    );
    totalFamilies += familyHeads.length;

    for (const fh of familyHeads) {
      totalMembers += fh.member_count || 0;

      const src: string[] = parseJSON(fh.income_sources);
      if (src.includes("Farming")) income.farming++;
      if (src.includes("Fishing")) income.fishing++;
      if (src.includes("Labor (skilled/unskilled)")) income.labor++;
      if (src.includes("Government employment")) income.govt++;
      if (src.includes("Private employment")) income.private++;
      if (src.includes("Business")) income.business++;
      if (src.includes("Remittances")) income.remit++;
      if (src.includes("Others")) income.others++;

      const ir = (fh.income_range || "");
      if (ir.includes("5,000") || ir.includes("5000")) incRange.low++;
      else if (ir.includes("5,001") || ir.includes("10,000")) incRange.mid1++;
      else if (ir.includes("10,001") || ir.includes("20,000")) incRange.mid2++;
      else if (ir.includes("20,001") || ir.includes("above")) incRange.high++;

      const gp: string[] = parseJSON(fh.gov_programs);
      const lv: string[] = parseJSON(fh.livelihoods);
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

      // HFIAS
      const score = fh.hfias_total || 0;
      totalFoodScore += score;
      scoreFamilies++;
      if (score === 0) hfias.secure++;
      else if (score <= 7) hfias.mild++;
      else if (score <= 14) hfias.moderate++;
      else hfias.severe++;

      // Coping
      const cp: { strategy: string }[] = parseJSON(fh.coping_strategies);
      const cpNames = cp.map((c) => c.strategy);
      if (cpNames.includes("Borrow food/money")) coping.borrow++;
      if (cpNames.includes("Reduce meal size")) coping.reduceMeal++;
      if (cpNames.includes("Skip meals")) coping.skip++;
      if (cpNames.includes("Buy cheaper food")) coping.cheaper++;
      if (cpNames.includes("Sell assets")) coping.sellAssets++;

      // Skills
      const sk: string[] = parseJSON(fh.skills);
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

      // Children
      const children = await (db as any).getAllAsync(
        "SELECT * FROM children WHERE family_head_id = ?", [fh.id]
      );
      totalChildren += children.length;

      for (const child of children) {
        const ns: string[] = parseJSON(child.nutritional_statuses);
        if (ns.includes("UW")) nutr.uw++;
        if (ns.includes("SUW")) nutr.suw++;
        if (ns.includes("MAM")) nutr.mam++;
        if (ns.includes("SAM")) nutr.sam++;
        if (ns.includes("ST")) nutr.st++;
        if (ns.includes("SST")) nutr.sst++;
        if (ns.includes("OW")) nutr.ow++;
        if (ns.includes("OB")) nutr.ob++;
        if (child.disability) withDisability++;
        if (child.medical_condition) withMedical++;
      }
    }
  }

  const avgScore = scoreFamilies > 0 ? (totalFoodScore / scoreFamilies).toFixed(1) : "0.0";

  return {
    brgyName: brgy.name,
    totalHH, totalFamilies, totalMembers, totalChildren,
    loc, dwell, toilet, waterD, waterU, waste,
    income, incRange, govAssist, prog,
    nutr, withDisability, withMedical,
    avgScore, hfias, coping, skills,
  };
}

// ─── Excel formatting helpers ─────────────────────────────────────────────────

function applyDetailFormatting(ws: XLSX.WorkSheet, rowCount: number) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const numCols = range.e.c + 1;

  // Column widths
  ws["!cols"] = Array(numCols).fill(null).map((_, i) => ({ wch: i < 3 ? 10 : 18 }));

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Style header row
  for (let c = 0; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      fill: { fgColor: { rgb: "1a7a4a" }, patternType: "solid" },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "FFFFFF" } },
        bottom: { style: "thin", color: { rgb: "FFFFFF" } },
        left: { style: "thin", color: { rgb: "FFFFFF" } },
        right: { style: "thin", color: { rgb: "FFFFFF" } },
      },
    };
  }

  // Alternating row colors
  for (let r = 1; r <= rowCount; r++) {
    const isAlt = r % 2 === 0;
    const bg = isAlt ? "f0f7f3" : "FFFFFF";
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      ws[addr].s = {
        fill: { fgColor: { rgb: bg }, patternType: "solid" },
        font: { sz: 9 },
        alignment: { vertical: "center" },
        border: {
          bottom: { style: "hair", color: { rgb: "cccccc" } },
          right: { style: "hair", color: { rgb: "cccccc" } },
        },
      };
    }
  }
}

function buildSummarySheet(aggregates: any[], year: number): XLSX.WorkSheet {
  const brgyCols = aggregates.map((a) => a.brgyName);
  const hasTotal = aggregates.length > 1;

  // Indicator rows definition
  const SECTION = "SECTION";
  const DATA = "DATA";

  type IndicatorRow =
    | { type: "SECTION"; label: string }
    | { type: "DATA"; label: string; key: (a: any) => number | string };

  const rows: IndicatorRow[] = [
    { type: SECTION, label: "I. IDENTIFYING INFORMATION" },
    { type: DATA, label: "Total Households Surveyed", key: (a) => a.totalHH },
    { type: SECTION, label: "II. LOCATION CLASSIFICATION" },
    { type: DATA, label: "Urban", key: (a) => a.loc.urban },
    { type: DATA, label: "Rural-Inland", key: (a) => a.loc.ruralInland },
    { type: DATA, label: "Rural-Coastal", key: (a) => a.loc.ruralCoastal },
    { type: DATA, label: "Rural-Upland", key: (a) => a.loc.ruralUpland },
    { type: SECTION, label: "III. HOUSEHOLD COMPOSITION" },
    { type: DATA, label: "Total No. of Families", key: (a) => a.totalFamilies },
    { type: DATA, label: "Total HH Members", key: (a) => a.totalMembers },
    { type: SECTION, label: "IV-A. DWELLING TYPE" },
    { type: DATA, label: "Concrete", key: (a) => a.dwell.concrete },
    { type: DATA, label: "Semi-Concrete", key: (a) => a.dwell.semiConcrete },
    { type: DATA, label: "Light Materials", key: (a) => a.dwell.light },
    { type: DATA, label: "Makeshift", key: (a) => a.dwell.makeshift },
    { type: SECTION, label: "IV-B. TOILET FACILITY" },
    { type: DATA, label: "Water-Sealed (Own)", key: (a) => a.toilet.waterSealed },
    { type: DATA, label: "Shared", key: (a) => a.toilet.shared },
    { type: DATA, label: "Pit Latrine", key: (a) => a.toilet.pitLatrine },
    { type: DATA, label: "Open Defecation", key: (a) => a.toilet.open },
    { type: SECTION, label: "IV-C. WATER SOURCE" },
    { type: DATA, label: "Level I (Drinking)", key: (a) => a.waterD.l1 },
    { type: DATA, label: "   – Daily Use", key: (a) => a.waterU.l1 },
    { type: DATA, label: "Level II (Drinking)", key: (a) => a.waterD.l2 },
    { type: DATA, label: "   – Daily Use", key: (a) => a.waterU.l2 },
    { type: DATA, label: "Level III (Drinking)", key: (a) => a.waterD.l3 },
    { type: DATA, label: "   – Daily Use", key: (a) => a.waterU.l3 },
    { type: DATA, label: "Refilling Station (Drinking)", key: (a) => a.waterD.refill },
    { type: DATA, label: "   – Daily Use", key: (a) => a.waterU.refill },
    { type: DATA, label: "Unimproved (Drinking)", key: (a) => a.waterD.unimp },
    { type: DATA, label: "   – Daily Use", key: (a) => a.waterU.unimp },
    { type: SECTION, label: "IV-D. WASTE DISPOSAL" },
    { type: DATA, label: "Collected", key: (a) => a.waste.collected },
    { type: DATA, label: "Burned", key: (a) => a.waste.burned },
    { type: DATA, label: "Open Dumping", key: (a) => a.waste.openDump },
    { type: DATA, label: "Composting", key: (a) => a.waste.composting },
    { type: SECTION, label: "V-A. INCOME SOURCE" },
    { type: DATA, label: "Farming (Income)", key: (a) => a.income.farming },
    { type: DATA, label: "Fishing (Income)", key: (a) => a.income.fishing },
    { type: DATA, label: "Labor", key: (a) => a.income.labor },
    { type: DATA, label: "Gov't Employment", key: (a) => a.income.govt },
    { type: DATA, label: "Private Employment", key: (a) => a.income.private },
    { type: DATA, label: "Business", key: (a) => a.income.business },
    { type: DATA, label: "Remittances", key: (a) => a.income.remit },
    { type: DATA, label: "Others (Income)", key: (a) => a.income.others },
    { type: SECTION, label: "V-B. INCOME RANGE" },
    { type: DATA, label: "5,000 & Below", key: (a) => a.incRange.low },
    { type: DATA, label: "5k-10k", key: (a) => a.incRange.mid1 },
    { type: DATA, label: "10k-20k", key: (a) => a.incRange.mid2 },
    { type: DATA, label: "20k & Above", key: (a) => a.incRange.high },
    { type: DATA, label: "Government and Private Assistances", key: (a) => a.govAssist },
    { type: SECTION, label: "V-C. GOVERNMENT PROGRAMS" },
    { type: DATA, label: "4Ps", key: (a) => a.prog.fourPs },
    { type: DATA, label: "Supp. Feeding", key: (a) => a.prog.suppFeeding },
    { type: DATA, label: "Tutok Kainan", key: (a) => a.prog.tutok },
    { type: DATA, label: "Livelihood Assistance", key: (a) => a.prog.livelihood },
    { type: DATA, label: "   – DOLE", key: (a) => a.prog.dole },
    { type: DATA, label: "   – DA", key: (a) => a.prog.da },
    { type: DATA, label: "   – LGU", key: (a) => a.prog.lgu },
    { type: DATA, label: "PhilHealth", key: (a) => a.prog.philHealth },
    { type: DATA, label: "Others (Program)", key: (a) => a.prog.others },
    { type: SECTION, label: "VI. HEALTH & NUTRITION STATUS" },
    { type: DATA, label: "Total Members Assessed", key: (a) => a.totalChildren },
    { type: DATA, label: "UW", key: (a) => a.nutr.uw },
    { type: DATA, label: "SUW", key: (a) => a.nutr.suw },
    { type: DATA, label: "MAM", key: (a) => a.nutr.mam },
    { type: DATA, label: "SAM", key: (a) => a.nutr.sam },
    { type: DATA, label: "ST", key: (a) => a.nutr.st },
    { type: DATA, label: "SST", key: (a) => a.nutr.sst },
    { type: DATA, label: "OW", key: (a) => a.nutr.ow },
    { type: DATA, label: "OB", key: (a) => a.nutr.ob },
    { type: DATA, label: "With Disability", key: (a) => a.withDisability },
    { type: DATA, label: "With Medical Condition", key: (a) => a.withMedical },
    { type: SECTION, label: "VII. FOOD INSECURITY (HFIAS)" },
    { type: DATA, label: "Average Food Insecurity Score", key: (a) => a.avgScore },
    { type: DATA, label: "Fully Secure (Score = 0)", key: (a) => a.hfias.secure },
    { type: DATA, label: "Mild (Score 1-7)", key: (a) => a.hfias.mild },
    { type: DATA, label: "Moderate (Score 8-14)", key: (a) => a.hfias.moderate },
    { type: DATA, label: "Severe (Score 15-27)", key: (a) => a.hfias.severe },
    { type: SECTION, label: "VIII. COPING STRATEGIES" },
    { type: DATA, label: "Borrow Food/Money", key: (a) => a.coping.borrow },
    { type: DATA, label: "Reduce Meal Size", key: (a) => a.coping.reduceMeal },
    { type: DATA, label: "Skip Meals", key: (a) => a.coping.skip },
    { type: DATA, label: "Buy Cheaper Food", key: (a) => a.coping.cheaper },
    { type: DATA, label: "Sell Assets", key: (a) => a.coping.sellAssets },
    { type: SECTION, label: "IX. HOUSEHOLD SKILLS" },
    { type: DATA, label: "Cooking", key: (a) => a.skills.cooking },
    { type: DATA, label: "Baking", key: (a) => a.skills.baking },
    { type: DATA, label: "Food Processing", key: (a) => a.skills.foodProc },
    { type: DATA, label: "Sari-Sari Store", key: (a) => a.skills.sariSari },
    { type: DATA, label: "Farming (Skill)", key: (a) => a.skills.farming },
    { type: DATA, label: "Gardening", key: (a) => a.skills.gardening },
    { type: DATA, label: "Livestock", key: (a) => a.skills.livestock },
    { type: DATA, label: "Fishing (Skill)", key: (a) => a.skills.fishing },
    { type: DATA, label: "Carpentry", key: (a) => a.skills.carpentry },
    { type: DATA, label: "Masonry", key: (a) => a.skills.masonry },
    { type: DATA, label: "Sewing", key: (a) => a.skills.sewing },
    { type: DATA, label: "Handicrafts", key: (a) => a.skills.handicrafts },
    { type: DATA, label: "Driving", key: (a) => a.skills.driving },
    { type: DATA, label: "Housekeeping", key: (a) => a.skills.housekeeping },
    { type: DATA, label: "Computer/Digital", key: (a) => a.skills.computer },
  ];

  // Build 2D array
  // Row 0: title
  // Row 1: header (INDICATOR + barangay names + TOTAL?)
  const totalCols = 1 + aggregates.length + (hasTotal ? 1 : 0);
  const aoa: any[][] = [];

  // Title row
  const titleRow = Array(totalCols).fill("");
  titleRow[0] = `MUNICIPAL NUTRITION OFFICE - MOGPOG | Household Profiling Summary ${year}`;
  aoa.push(titleRow);

  // Header row
  const headerRow = ["INDICATOR", ...brgyCols];
  if (hasTotal) headerRow.push("TOTAL");
  aoa.push(headerRow);

  // Data rows
  for (const row of rows) {
    if (row.type === "SECTION") {
      const sRow = Array(totalCols).fill("");
      sRow[0] = row.label;
      aoa.push(sRow);
    } else {
      const vals = aggregates.map((a) => row.key(a));
      const total = hasTotal
        ? vals.reduce((sum: number, v: any) => sum + (typeof v === "number" ? v : parseFloat(String(v)) || 0), 0)
        : null;
      const dRow: any[] = [row.label, ...vals];
      if (hasTotal) dRow.push(total);
      aoa.push(dRow);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = [
    { wch: 38 }, // INDICATOR
    ...aggregates.map(() => ({ wch: 18 })),
    ...(hasTotal ? [{ wch: 12 }] : []),
  ];

  // Merge title across all columns
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

  // Styling
  const GREEN = "1a7a4a";
  const LIGHT_GREEN = "e8f5ee";
  const DARK_GREEN = "145c38";
  const WHITE = "FFFFFF";
  const GRAY = "f5f5f5";

  // Title cell
  const titleCell = ws["A1"];
  if (titleCell) {
    titleCell.s = {
      fill: { fgColor: { rgb: DARK_GREEN }, patternType: "solid" },
      font: { color: { rgb: WHITE }, bold: true, sz: 13 },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // Header row (row index 1)
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 1, c });
    if (!ws[addr]) ws[addr] = { t: "s", v: "" };
    ws[addr].s = {
      fill: { fgColor: { rgb: GREEN }, patternType: "solid" },
      font: { color: { rgb: WHITE }, bold: true, sz: 11, },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "medium", color: { rgb: WHITE } },
        bottom: { style: "medium", color: { rgb: WHITE } },
        left: { style: "thin", color: { rgb: WHITE } },
        right: { style: "thin", color: { rgb: WHITE } },
      },
    };
  }

  // Data rows (starting at aoa index 2 = excel row 3)
  let aoaRowIdx = 2;
  for (const row of rows) {
    if (row.type === "SECTION") {
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: aoaRowIdx, c });
        if (!ws[addr]) ws[addr] = { t: "s", v: "" };
        ws[addr].s = {
          fill: { fgColor: { rgb: LIGHT_GREEN }, patternType: "solid" },
          font: { bold: true, sz: 10, color: { rgb: DARK_GREEN } },
          alignment: { horizontal: "left", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "aaaaaa" } },
            bottom: { style: "thin", color: { rgb: "aaaaaa" } },
          },
        };
      }
    } else {
      const isAlt = aoaRowIdx % 2 === 0;
      const bg = isAlt ? "f9fdf9" : WHITE;
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: aoaRowIdx, c });
        if (!ws[addr]) ws[addr] = { t: "z", v: "" };
        const isTotal = hasTotal && c === totalCols - 1;
        ws[addr].s = {
          fill: { fgColor: { rgb: isTotal ? LIGHT_GREEN : bg }, patternType: "solid" },
          font: { sz: 10, bold: isTotal || c === 0 ? true : false },
          alignment: {
            horizontal: c === 0 ? "left" : "center",
            vertical: "center",
          },
          border: {
            bottom: { style: "hair", color: { rgb: "dddddd" } },
            right: { style: "hair", color: { rgb: "dddddd" } },
            left: c === 0 ? { style: "thin", color: { rgb: "aaaaaa" } } : undefined,
          },
        };
      }
    }
    aoaRowIdx++;
  }

  // Row heights
  ws["!rows"] = [
    { hpt: 30 }, // title
    { hpt: 32 }, // header
    ...rows.map((r) => ({ hpt: r.type === "SECTION" ? 22 : 18 })),
  ];

  return ws;
}

// ─── Barangay Picker Modal ────────────────────────────────────────────────────

interface BarangayOption {
  id: number;
  name: string;
  year: number;
  yearId: number;
}

interface PickerProps {
  visible: boolean;
  options: BarangayOption[];
  exportType: "detail" | "summary";
  onClose: () => void;
  onSelect: (selected: BarangayOption[] | "all") => void;
}

function BarangayPicker({ visible, options, exportType, onClose, onSelect }: PickerProps) {
  const [selected, setSelected] = useState<number[]>([]);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function confirm() {
    if (selected.length === 0) {
      Alert.alert("No Selection", "Please select at least one barangay.");
      return;
    }
    const isAll = selected.length === options.length;
    if (isAll) {
      onSelect("all");
    } else {
      onSelect(options.filter((o) => selected.includes(o.id)));
    }
    setSelected([]);
  }

  function selectAll() {
    setSelected(options.map((o) => o.id));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>
              Select Barangay{exportType === "detail" ? " — Detail Export" : " — Summary Export"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={pickerStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={pickerStyles.selectAll} onPress={selectAll}>
            <Text style={pickerStyles.selectAllText}>Select All</Text>
          </TouchableOpacity>

          <FlatList
            data={options}
            keyExtractor={(item) => item.id.toString()}
            style={pickerStyles.list}
            renderItem={({ item }) => {
              const checked = selected.includes(item.id);
              return (
                <TouchableOpacity
                  style={[pickerStyles.item, checked && pickerStyles.itemSelected]}
                  onPress={() => toggle(item.id)}
                >
                  <View style={[pickerStyles.checkbox, checked && pickerStyles.checkboxChecked]}>
                    {checked && <Text style={pickerStyles.checkmark}>✓</Text>}
                  </View>
                  <View>
                    <Text style={[pickerStyles.itemText, checked && pickerStyles.itemTextSelected]}>
                      {item.name}
                    </Text>
                    <Text style={pickerStyles.itemSub}>Year: {item.year}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity style={pickerStyles.confirmBtn} onPress={confirm}>
            <Text style={pickerStyles.confirmText}>
              Export {selected.length > 0 ? `(${selected.length} selected)` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExportScreen() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerOptions, setPickerOptions] = useState<BarangayOption[]>([]);
  const [pendingExportType, setPendingExportType] = useState<"detail" | "summary">("detail");

  async function openPicker(type: "detail" | "summary") {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<any>(`
        SELECT b.id, b.name, sy.year, sy.id as yearId
        FROM barangays b
        JOIN survey_years sy ON b.year_id = sy.id
        WHERE EXISTS (
          SELECT 1 FROM households h
          WHERE h.barangay_id = b.id AND h.is_draft = 0
        )
        ORDER BY sy.year DESC, b.name ASC
      `);

      if (rows.length === 0) {
        Alert.alert("No Data", "No submitted households found. Make sure households are not saved as drafts.");
        return;
      }

      setPickerOptions(rows);
      setPendingExportType(type);
      setPickerVisible(true);
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  }

  async function handleSelection(selected: BarangayOption[] | "all") {
    setPickerVisible(false);
    if (pendingExportType === "detail") {
      await runDetailExport(selected);
    } else {
      await runSummaryExport(selected);
    }
  }

  async function runDetailExport(selected: BarangayOption[] | "all") {
    setLoading(true);
    setStatus("Loading data...");
    try {
      const db = await getDb();
      const allBrgy = selected === "all" ? pickerOptions : selected;
      const wb = XLSX.utils.book_new();

      // Group by year for filename
      const years = [...new Set(allBrgy.map((b) => b.year))];
      const yearLabel = years.length === 1 ? years[0] : years.join("-");
      const brgyLabel =
        allBrgy.length > 1
          ? "All"
          : allBrgy[0].name.replace(/\s+/g, "");

      for (const brgy of allBrgy) {
        const yr = await db.getFirstAsync<any>(
          "SELECT * FROM survey_years WHERE id = ?", [brgy.yearId]
        );
        const households = await db.getAllAsync<any>(
          "SELECT * FROM households WHERE barangay_id = ? AND is_draft = 0", [brgy.id]
        );
        const rows: any[] = [];

        for (const hh of households) {
          const familyHeads = await db.getAllAsync<any>(
            "SELECT * FROM family_heads WHERE household_id = ?", [hh.id]
          );
          const totalFamilies = familyHeads.length;

          for (let fhIndex = 0; fhIndex < familyHeads.length; fhIndex++) {
            const fh = familyHeads[fhIndex];
            const children = await db.getAllAsync<any>(
              "SELECT * FROM children WHERE family_head_id = ?", [fh.id]
            );
            if (children.length === 0) {
              rows.push(buildRow(yr, brgy, hh, fh, fhIndex, null, 0, totalFamilies, familyHeads));
            } else {
              for (let ci = 0; ci < children.length; ci++) {
                rows.push(buildRow(yr, brgy, hh, fh, fhIndex, children[ci], ci, totalFamilies, familyHeads));
              }
            }
          }
        }

        if (rows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(rows);
          applyDetailFormatting(ws, rows.length);
          XLSX.utils.book_append_sheet(wb, ws, brgy.name.substring(0, 31));
        }
      }

      setStatus("Writing file...");
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx", cellStyles: true });
      const filename = `Mogpog-${brgyLabel}-${yearLabel}.xlsx`;
      const path = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, wbout, { encoding: "base64" as any });
      setStatus("Done!");
      await Sharing.shareAsync(path, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Export: ${filename}`,
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Export Failed", String(e));
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  async function runSummaryExport(selected: BarangayOption[] | "all") {
    setLoading(true);
    setStatus("Aggregating data...");
    try {
      const db = await getDb();
      const allBrgy = selected === "all" ? pickerOptions : selected;

      const years = [...new Set(allBrgy.map((b) => b.year))];
      const yearLabel = years.length === 1 ? years[0] : years.join("-");
      const brgyLabel =
        allBrgy.length > 1
          ? "All"
          : allBrgy[0].name.replace(/\s+/g, "");

      const aggregates = [];
      for (const brgy of allBrgy) {
        setStatus(`Aggregating ${brgy.name}...`);
        const agg = await aggregateBarangay(db, brgy);
        aggregates.push(agg);
      }

      setStatus("Building sheet...");
      const ws = buildSummarySheet(aggregates, yearLabel as any);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Summary");

      setStatus("Writing file...");
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx", cellStyles: true });
      const filename = `Mogpog-Summary-${brgyLabel}-${yearLabel}.xlsx`;
      const path = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, wbout, { encoding: "base64" as any });
      setStatus("Done!");
      await Sharing.shareAsync(path, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Export: ${filename}`,
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Export Failed", String(e));
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Export Data</Text>
      <Text style={styles.subtitle}>Draft households are excluded. You'll pick which barangay to export.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Detail Export</Text>
        <Text style={styles.cardDesc}>
          One sheet per barangay — all columns per household, family head, and child.
          For verification with the nutrition officer.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => openPicker("detail")} disabled={loading}>
          <Text style={styles.btnText}>Export Detail (.xlsx)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Summary Export</Text>
        <Text style={styles.cardDesc}>
          Aggregated indicators per barangay in one sheet — totals, counts, and breakdowns.
        </Text>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => openPicker("summary")} disabled={loading}>
          <Text style={styles.btnText}>Export Summary (.xlsx)</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1a7a4a" />
          <Text style={styles.loadingText}>{status}</Text>
        </View>
      )}

      <BarangayPicker
        visible={pickerVisible}
        options={pickerOptions}
        exportType={pendingExportType}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelection}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", color: "#222", marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#888", marginBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, elevation: 2, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#222" },
  cardDesc: { fontSize: 14, color: "#666", lineHeight: 20 },
  btn: { marginTop: 8, padding: 14, borderRadius: 8, backgroundColor: "#1a7a4a", alignItems: "center" },
  btnSecondary: { backgroundColor: "#2196F3" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  loadingBox: { alignItems: "center", padding: 24, gap: 12 },
  loadingText: { fontSize: 14, color: "#666" },
});

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#eee" },
  title: { fontSize: 16, fontWeight: "700", color: "#222", flex: 1 },
  close: { fontSize: 18, color: "#888", paddingLeft: 12 },
  selectAll: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#1a7a4a", alignItems: "center" },
  selectAllText: { color: "#1a7a4a", fontWeight: "600", fontSize: 14 },
  list: { marginHorizontal: 16, marginTop: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: "#f9f9f9" },
  itemSelected: { backgroundColor: "#e8f5ee", borderWidth: 1, borderColor: "#1a7a4a" },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkboxChecked: { backgroundColor: "#1a7a4a", borderColor: "#1a7a4a" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  itemText: { fontSize: 14, color: "#333", fontWeight: "600" },
  itemTextSelected: { color: "#1a7a4a" },
  itemSub: { fontSize: 12, color: "#888", marginTop: 2 },
  confirmBtn: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 10, backgroundColor: "#1a7a4a", alignItems: "center" },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});