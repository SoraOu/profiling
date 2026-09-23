// app/(tabs)/reports.tsx
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDb, aggregateBarangayOptimized } from "@/db/database";

// ─── Shared mini-chart components ────────────────────────────────────────────

function BarChart({ data, colors }: { data: { label: string; value: number }[]; colors?: string[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={chartS.container}>
      {data.map((item, i) => (
        <View key={item.label} style={chartS.row}>
          <Text style={chartS.label} numberOfLines={1}>{item.label}</Text>
          <View style={chartS.barBg}>
            <View style={[chartS.bar, {
              width: `${(item.value / max) * 100}%`,
              backgroundColor: colors?.[i % (colors?.length ?? 1)] ?? "#1a7a4a",
            }]} />
          </View>
          <Text style={chartS.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function PieRow({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <View>
      <View style={chartS.pieRow}>
        {data.map((item, i) => (
          <View key={item.label} style={[chartS.pieSegment, {
            flex: item.value || 0.01,
            backgroundColor: colors[i % colors.length],
          }]} />
        ))}
      </View>
      <View style={chartS.legend}>
        {data.map((item, i) => (
          <View key={item.label} style={chartS.legendItem}>
            <View style={[chartS.legendDot, { backgroundColor: colors[i % colors.length] }]} />
            <Text style={chartS.legendText}>{item.label}: {item.value}{total > 0 ? ` (${Math.round((item.value / total) * 100)}%)` : ""}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={secS.container}>
      <TouchableOpacity style={secS.header} onPress={() => setOpen(!open)}>
        <Text style={secS.title}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#1a7a4a" />
      </TouchableOpacity>
      {open && <View style={secS.body}>{children}</View>}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const [years, setYears] = useState<{ id: number; year: number }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadYears();
    }, [])
  );

  async function loadYears() {
    const db = await getDb();
    const rows = await db.getAllAsync<{ id: number; year: number }>(
      "SELECT * FROM survey_years ORDER BY year DESC"
    );
    setYears(rows);
    if (rows.length > 0 && selectedYearId === null) {
      loadData(rows[0].id);
    }
  }

  async function loadData(yearId: number) {
    setSelectedYearId(yearId);
    setLoading(true);
    setData(null);
    try {
      const db = await getDb();
      const barangays = await db.getAllAsync<{ id: number; name: string }>(
        "SELECT id, name FROM barangays WHERE year_id = ?", [yearId]
      );

      // Aggregate all barangays together
      const totals = {
        totalHH: 0, totalFamilies: 0, totalMembers: 0, totalChildren: 0,
        loc: { urban: 0, ruralInland: 0, ruralCoastal: 0, ruralUpland: 0 },
        dwell: { concrete: 0, semiConcrete: 0, light: 0, makeshift: 0 },
        toilet: { waterSealed: 0, shared: 0, pitLatrine: 0, open: 0 },
        income: { farming: 0, fishing: 0, labor: 0, govt: 0, private: 0, business: 0, remit: 0, others: 0 },
        incRange: { low: 0, mid1: 0, mid2: 0, high: 0 },
        nutr: { uw: 0, suw: 0, mam: 0, sam: 0, st: 0, sst: 0, ow: 0, ob: 0 },
        hfias: { secure: 0, mild: 0, moderate: 0, severe: 0 },
        coping: { borrow: 0, reduceMeal: 0, skip: 0, cheaper: 0, sellAssets: 0 },
        skills: {
          cooking: 0, baking: 0, foodProc: 0, sariSari: 0,
          farming: 0, gardening: 0, livestock: 0, fishing: 0,
          carpentry: 0, masonry: 0, sewing: 0, handicrafts: 0,
          driving: 0, housekeeping: 0, computer: 0,
        },
        avgScore: "0.0",
        withDisability: 0, withMedical: 0,
        barangayCount: barangays.length,
      };

      let totalFoodScore = 0;
      let scoreFamilies = 0;

      for (const brgy of barangays) {
        const agg = await aggregateBarangayOptimized(db, brgy.id);
        totals.totalHH += agg.totalHH;
        totals.totalFamilies += agg.totalFamilies;
        totals.totalMembers += agg.totalMembers;
        totals.totalChildren += agg.totalChildren;
        totals.withDisability += agg.withDisability;
        totals.withMedical += agg.withMedical;

        (Object.keys(totals.loc) as (keyof typeof totals.loc)[]).forEach((k) => { totals.loc[k] += agg.loc[k]; });
        (Object.keys(totals.dwell) as (keyof typeof totals.dwell)[]).forEach((k) => { totals.dwell[k] += agg.dwell[k]; });
        (Object.keys(totals.toilet) as (keyof typeof totals.toilet)[]).forEach((k) => { totals.toilet[k] += agg.toilet[k]; });
        (Object.keys(totals.income) as (keyof typeof totals.income)[]).forEach((k) => { totals.income[k] += agg.income[k]; });
        (Object.keys(totals.incRange) as (keyof typeof totals.incRange)[]).forEach((k) => { totals.incRange[k] += agg.incRange[k]; });
        (Object.keys(totals.nutr) as (keyof typeof totals.nutr)[]).forEach((k) => { totals.nutr[k] += agg.nutr[k]; });
        (Object.keys(totals.hfias) as (keyof typeof totals.hfias)[]).forEach((k) => { totals.hfias[k] += agg.hfias[k]; });
        (Object.keys(totals.coping) as (keyof typeof totals.coping)[]).forEach((k) => { totals.coping[k] += agg.coping[k]; });
        (Object.keys(totals.skills) as (keyof typeof totals.skills)[]).forEach((k) => { totals.skills[k] += agg.skills[k]; });

        const sf = parseInt(agg.totalFamilies as any);
        const sc = parseFloat(agg.avgScore) * sf;
        totalFoodScore += sc;
        scoreFamilies += sf;
      }

      totals.avgScore = scoreFamilies > 0 ? (totalFoodScore / scoreFamilies).toFixed(1) : "0.0";
      setData(totals);
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setLoading(false);
    }
  }

  const selectedYear = years.find((y) => y.id === selectedYearId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analytics Report</Text>

      {/* Year Picker */}
      {years.length > 1 && (
        <View style={styles.yearRow}>
          <Text style={styles.yearLabel}>Survey Year:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
            {years.map((y) => (
              <TouchableOpacity
                key={y.id}
                style={[styles.yearChip, y.id === selectedYearId && styles.yearChipActive]}
                onPress={() => loadData(y.id)}
              >
                <Text style={[styles.yearChipText, y.id === selectedYearId && styles.yearChipTextActive]}>
                  {y.year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1a7a4a" />
          <Text style={styles.loadingText}>Aggregating data...</Text>
        </View>
      )}

      {!loading && !data && (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No submitted data yet.</Text>
        </View>
      )}

      {data && !loading && (
        <>
          {/* Summary Stats */}
          <View style={styles.statsGrid}>
            {[
              { n: data.totalHH, l: "Households", icon: "home" },
              { n: data.totalFamilies, l: "Families", icon: "people" },
              { n: data.totalMembers, l: "Members", icon: "person" },
              { n: data.totalChildren, l: "Children", icon: "happy" },
            ].map((s) => (
              <View key={s.l} style={styles.statBox}>
                <Ionicons name={s.icon as any} size={20} color="#a8d5b5" />
                <Text style={styles.statNum}>{s.n}</Text>
                <Text style={styles.statLbl}>{s.l}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.subheading}>
            {selectedYear?.year} · {data.barangayCount} barangay{data.barangayCount !== 1 ? "s" : ""}
          </Text>

          <Section title="🍚 Food Security (HFIAS)">
            <Text style={styles.metaText}>Average Score: {data.avgScore}</Text>
            <PieRow
              data={[
                { label: "Secure", value: data.hfias.secure },
                { label: "Mild", value: data.hfias.mild },
                { label: "Moderate", value: data.hfias.moderate },
                { label: "Severe", value: data.hfias.severe },
              ]}
              colors={["#1a7a4a", "#f9c74f", "#f8961e", "#e63946"]}
            />
          </Section>

          <Section title="👶 Nutritional Status (Children)">
            {data.totalChildren === 0
              ? <Text style={styles.metaText}>No children recorded.</Text>
              : <BarChart
                  data={[
                    { label: "UW", value: data.nutr.uw },
                    { label: "SUW", value: data.nutr.suw },
                    { label: "MAM", value: data.nutr.mam },
                    { label: "SAM", value: data.nutr.sam },
                    { label: "ST", value: data.nutr.st },
                    { label: "SST", value: data.nutr.sst },
                    { label: "OW", value: data.nutr.ow },
                    { label: "OB", value: data.nutr.ob },
                  ]}
                  colors={["#e63946","#e63946","#f8961e","#e63946","#f8961e","#e63946","#f9c74f","#f9c74f"]}
                />
            }
            {data.withDisability > 0 && (
              <Text style={styles.metaText}>With Disability: {data.withDisability}</Text>
            )}
            {data.withMedical > 0 && (
              <Text style={styles.metaText}>With Medical Condition: {data.withMedical}</Text>
            )}
          </Section>

          <Section title="💰 Estimated Monthly Income">
            <PieRow
              data={[
                { label: "≤₱5k", value: data.incRange.low },
                { label: "₱5k–10k", value: data.incRange.mid1 },
                { label: "₱10k–20k", value: data.incRange.mid2 },
                { label: ">₱20k", value: data.incRange.high },
              ]}
              colors={["#e63946","#f8961e","#f9c74f","#1a7a4a"]}
            />
          </Section>

          <Section title="🌾 Income Sources">
            <BarChart
              data={[
                { label: "Farming", value: data.income.farming },
                { label: "Fishing", value: data.income.fishing },
                { label: "Labor", value: data.income.labor },
                { label: "Gov't", value: data.income.govt },
                { label: "Private", value: data.income.private },
                { label: "Business", value: data.income.business },
                { label: "Remittances", value: data.income.remit },
                { label: "Others", value: data.income.others },
              ]}
            />
          </Section>

          <Section title="🛡️ Coping Strategies">
            <BarChart
              data={[
                { label: "Borrow", value: data.coping.borrow },
                { label: "Reduce Meals", value: data.coping.reduceMeal },
                { label: "Skip Meals", value: data.coping.skip },
                { label: "Buy Cheaper", value: data.coping.cheaper },
                { label: "Sell Assets", value: data.coping.sellAssets },
              ]}
              colors={["#e63946","#f8961e","#e63946","#f9c74f","#e63946"]}
            />
          </Section>

          <Section title="🔧 Household Skills">
            <BarChart
              data={[
                { label: "Cooking", value: data.skills.cooking },
                { label: "Baking", value: data.skills.baking },
                { label: "Food Proc", value: data.skills.foodProc },
                { label: "Sari-Sari", value: data.skills.sariSari },
                { label: "Farming", value: data.skills.farming },
                { label: "Gardening", value: data.skills.gardening },
                { label: "Livestock", value: data.skills.livestock },
                { label: "Fishing", value: data.skills.fishing },
                { label: "Carpentry", value: data.skills.carpentry },
                { label: "Masonry", value: data.skills.masonry },
                { label: "Sewing", value: data.skills.sewing },
                { label: "Handicrafts", value: data.skills.handicrafts },
                { label: "Driving", value: data.skills.driving },
                { label: "Housekpg", value: data.skills.housekeeping },
                { label: "Computer", value: data.skills.computer },
              ]}
            />
          </Section>

          <Section title="🏠 Dwelling Type">
            <PieRow
              data={[
                { label: "Concrete", value: data.dwell.concrete },
                { label: "Semi-Concrete", value: data.dwell.semiConcrete },
                { label: "Light Materials", value: data.dwell.light },
                { label: "Makeshift", value: data.dwell.makeshift },
              ]}
              colors={["#4361ee","#1a7a4a","#f9c74f","#e63946"]}
            />
          </Section>

          <Section title="🚽 Toilet Facility">
            <PieRow
              data={[
                { label: "Water-Sealed", value: data.toilet.waterSealed },
                { label: "Shared", value: data.toilet.shared },
                { label: "Pit Latrine", value: data.toilet.pitLatrine },
                { label: "Open Defecation", value: data.toilet.open },
              ]}
              colors={["#1a7a4a","#f9c74f","#f8961e","#e63946"]}
            />
          </Section>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", color: "#222", marginBottom: 12 },
  subheading: { fontSize: 13, color: "#888", marginBottom: 12, textAlign: "center" },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  yearLabel: { fontSize: 13, color: "#555", fontWeight: "600" },
  yearScroll: { flexGrow: 0 },
  yearChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#1a7a4a", marginRight: 8 },
  yearChipActive: { backgroundColor: "#1a7a4a" },
  yearChipText: { fontSize: 13, color: "#1a7a4a", fontWeight: "600" },
  yearChipTextActive: { color: "#fff" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statBox: { flex: 1, minWidth: "22%", backgroundColor: "#1a7a4a", borderRadius: 10, padding: 12, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  statLbl: { fontSize: 10, color: "#a8d5b5", textAlign: "center" },
  metaText: { fontSize: 13, color: "#555", marginBottom: 8, fontWeight: "600" },
  loadingBox: { alignItems: "center", padding: 40, gap: 12 },
  loadingText: { color: "#888", fontSize: 14 },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, color: "#aaa" },
});

const secS = StyleSheet.create({
  container: { marginBottom: 10, borderRadius: 10, backgroundColor: "#fff", overflow: "hidden", elevation: 2 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, backgroundColor: "#f0f7f3" },
  title: { fontSize: 14, fontWeight: "700", color: "#1a7a4a" },
  body: { padding: 14 },
});

const chartS = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { width: 76, fontSize: 11, color: "#555" },
  barBg: { flex: 1, height: 16, backgroundColor: "#e8f5ee", borderRadius: 4, overflow: "hidden" },
  bar: { height: 16, borderRadius: 4, minWidth: 4 },
  value: { width: 28, fontSize: 11, color: "#333", textAlign: "right" },
  pieRow: { flexDirection: "row", height: 20, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  pieSegment: { height: 20 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#555" },
});