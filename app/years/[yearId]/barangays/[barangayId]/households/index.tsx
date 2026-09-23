import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "@/db/database";
import { Household } from "@/db/types";

function parseJSON(val: any, fallback: any = []) {
  try { return JSON.parse(val || JSON.stringify(fallback)); }
  catch { return fallback; }
}

async function aggregateBarangay(db: any, barangayId: string) {
  const households = await db.getAllAsync(
    "SELECT * FROM households WHERE barangay_id = ? AND is_draft = 0", [barangayId]
  );
  let totalHH = households.length;
  let totalFamilies = 0, totalMembers = 0, totalChildren = 0;
  const loc = { urban: 0, ruralInland: 0, ruralCoastal: 0, ruralUpland: 0 };
  const dwell = { concrete: 0, semiConcrete: 0, light: 0, makeshift: 0 };
  const nutr = { uw: 0, suw: 0, mam: 0, sam: 0, st: 0, sst: 0, ow: 0, ob: 0 };
  const income = { farming: 0, fishing: 0, labor: 0, govt: 0, private: 0, business: 0, remit: 0, others: 0 };
  const incRange = { low: 0, mid1: 0, mid2: 0, high: 0 };
  const hfias = { secure: 0, mild: 0, moderate: 0, severe: 0 };
  const coping = { borrow: 0, reduceMeal: 0, skip: 0, cheaper: 0, sellAssets: 0 };
  let totalFoodScore = 0, scoreFamilies = 0;

  for (const hh of households) {
    const lt = (hh.location_type || "").toLowerCase();
    if (lt.includes("urban")) loc.urban++;
    else if (lt.includes("inland")) loc.ruralInland++;
    else if (lt.includes("coastal")) loc.ruralCoastal++;
    else if (lt.includes("upland")) loc.ruralUpland++;

    const dt = (hh.dwelling_type || "").toLowerCase();
    if (dt.includes("concrete") && !dt.includes("semi")) dwell.concrete++;
    else if (dt.includes("semi")) dwell.semiConcrete++;
    else if (dt.includes("light")) dwell.light++;
    else if (dt.includes("makeshift")) dwell.makeshift++;

    const familyHeads = await db.getAllAsync(
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

      const ir = fh.income_range || "";
      if (ir.includes("5,000") || ir.includes("5000")) incRange.low++;
      else if (ir.includes("5,001") || ir.includes("10,000")) incRange.mid1++;
      else if (ir.includes("10,001") || ir.includes("20,000")) incRange.mid2++;
      else if (ir.includes("20,001") || ir.includes("above")) incRange.high++;

      const score = fh.hfias_total || 0;
      totalFoodScore += score; scoreFamilies++;
      if (score === 0) hfias.secure++;
      else if (score <= 7) hfias.mild++;
      else if (score <= 14) hfias.moderate++;
      else hfias.severe++;

      const cp: { strategy: string }[] = parseJSON(fh.coping_strategies);
      const cpNames = cp.map((c) => c.strategy);
      if (cpNames.includes("Borrow food/money")) coping.borrow++;
      if (cpNames.includes("Reduce meal size")) coping.reduceMeal++;
      if (cpNames.includes("Skip meals")) coping.skip++;
      if (cpNames.includes("Buy cheaper food")) coping.cheaper++;
      if (cpNames.includes("Sell assets")) coping.sellAssets++;

      const children = await db.getAllAsync(
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
      }
    }
  }
  const avgScore = scoreFamilies > 0 ? (totalFoodScore / scoreFamilies).toFixed(1) : "0.0";
  return { totalHH, totalFamilies, totalMembers, totalChildren, loc, dwell, nutr, income, incRange, hfias, coping, avgScore };
}

function BarChart({ data, colors }: { data: { label: string; value: number }[]; colors?: string[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chartStyles.container}>
      {data.map((item, i) => (
        <View key={item.label} style={chartStyles.row}>
          <Text style={chartStyles.label} numberOfLines={1}>{item.label}</Text>
          <View style={chartStyles.barBg}>
            <View style={[chartStyles.bar, {
              width: `${(item.value / max) * 100}%`,
              backgroundColor: colors?.[i % (colors?.length ?? 1)] ?? "#1a7a4a"
            }]} />
          </View>
          <Text style={chartStyles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function PieRow({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <View>
      <View style={chartStyles.pieRow}>
        {data.map((item, i) => (
          <View key={item.label} style={[chartStyles.pieSegment, {
            flex: item.value || 0.01,
            backgroundColor: colors[i % colors.length],
          }]} />
        ))}
      </View>
      <View style={chartStyles.legend}>
        {data.map((item, i) => (
          <View key={item.label} style={chartStyles.legendItem}>
            <View style={[chartStyles.legendDot, { backgroundColor: colors[i % colors.length] }]} />
            <Text style={chartStyles.legendText}>
              {item.label}: {item.value}{total > 0 ? ` (${Math.round(item.value / total * 100)}%)` : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={sectionStyles.container}>
      <TouchableOpacity style={sectionStyles.header} onPress={() => setOpen(!open)}>
        <Text style={sectionStyles.title}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#1a7a4a" />
      </TouchableOpacity>
      {open && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

function Dashboard({ barangayId, refreshKey }: { barangayId: string; refreshKey: number }) {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const db = await getDb();
      const result = await aggregateBarangay(db, barangayId);
      setData(result);
    } catch (e) {
      Alert.alert("Error loading dashboard", String(e));
    } finally {
      setLoading(false);
    }
  }

  // Properly refresh when refreshKey changes and dashboard is open
  useEffect(() => {
    if (open) load();
  }, [refreshKey]);

  function toggle() {
    if (!open) load(); // always refresh on open
    setOpen(!open);
  }

  return (
    <View style={dashStyles.wrapper}>
      <TouchableOpacity style={dashStyles.toggleBtn} onPress={toggle}>
        <Ionicons name="bar-chart-outline" size={18} color="#1a7a4a" />
        <Text style={dashStyles.toggleText}>Barangay Dashboard</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#1a7a4a" />
      </TouchableOpacity>

      {open && (
        <View style={dashStyles.content}>
          {loading && <Text style={dashStyles.loadingText}>Loading data...</Text>}
          {data && !loading && (
            <>
              <View style={dashStyles.statsRow}>
                <View style={dashStyles.statBox}>
                  <Text style={dashStyles.statNum}>{data.totalHH}</Text>
                  <Text style={dashStyles.statLbl}>Households</Text>
                </View>
                <View style={dashStyles.statBox}>
                  <Text style={dashStyles.statNum}>{data.totalFamilies}</Text>
                  <Text style={dashStyles.statLbl}>Families</Text>
                </View>
                <View style={dashStyles.statBox}>
                  <Text style={dashStyles.statNum}>{data.totalMembers}</Text>
                  <Text style={dashStyles.statLbl}>Members</Text>
                </View>
                <View style={dashStyles.statBox}>
                  <Text style={dashStyles.statNum}>{data.totalChildren}</Text>
                  <Text style={dashStyles.statLbl}>Children</Text>
                </View>
              </View>

              <Section title="🍚 Food Security (HFIAS)">
                <Text style={dashStyles.avgScore}>Avg Score: {data.avgScore}</Text>
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
                <BarChart
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
                  colors={["#e63946", "#e63946", "#f8961e", "#e63946", "#f8961e", "#e63946", "#f9c74f", "#f9c74f"]}
                />
              </Section>

              <Section title="💰 Income Range">
                <PieRow
                  data={[
                    { label: "≤5k", value: data.incRange.low },
                    { label: "5k-10k", value: data.incRange.mid1 },
                    { label: "10k-20k", value: data.incRange.mid2 },
                    { label: ">20k", value: data.incRange.high },
                  ]}
                  colors={["#e63946", "#f8961e", "#f9c74f", "#1a7a4a"]}
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

              <Section title="📍 Location Classification">
                <PieRow
                  data={[
                    { label: "Urban", value: data.loc.urban },
                    { label: "Inland", value: data.loc.ruralInland },
                    { label: "Coastal", value: data.loc.ruralCoastal },
                    { label: "Upland", value: data.loc.ruralUpland },
                  ]}
                  colors={["#4361ee", "#1a7a4a", "#06d6a0", "#f9c74f"]}
                />
              </Section>

              <Section title="🏠 Dwelling Type">
                <PieRow
                  data={[
                    { label: "Concrete", value: data.dwell.concrete },
                    { label: "Semi", value: data.dwell.semiConcrete },
                    { label: "Light", value: data.dwell.light },
                    { label: "Makeshift", value: data.dwell.makeshift },
                  ]}
                  colors={["#4361ee", "#1a7a4a", "#f9c74f", "#e63946"]}
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
                  colors={["#e63946", "#f8961e", "#e63946", "#f9c74f", "#e63946"]}
                />
              </Section>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function HouseholdsScreen() {
  const { yearId, barangayId } = useLocalSearchParams<{ yearId: string; barangayId: string }>();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [barangayName, setBarangayName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  async function loadData() {
    const db = await getDb();
    const brgy = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM barangays WHERE id = ?", [barangayId]
    );
    setBarangayName(brgy?.name ?? "");
    const result = await db.getAllAsync<Household>(
      "SELECT * FROM households WHERE barangay_id = ? ORDER BY created_at DESC", [barangayId]
    );
    setHouseholds(result);
    setRefreshKey(k => k + 1); // trigger dashboard refresh
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [barangayId])
  );

  async function deleteHousehold(id: number) {
    Alert.alert(
      "Delete Household",
      "Are you sure? This will delete all family heads and children under this household.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            const db = await getDb();
            await db.runAsync("DELETE FROM households WHERE id = ?", [id]);
            loadData();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Barangay ${barangayName}` }} />
      <FlatList
        data={households}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.subtitle}>Barangay {barangayName}</Text>
            <Dashboard barangayId={barangayId} refreshKey={refreshKey} />
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No households yet.</Text>
            <Text style={styles.emptySubtext}>Tap + to add a household.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.is_draft === 1 && styles.draftCard]}
            onPress={() =>
              router.push(`/years/${yearId}/barangays/${barangayId}/households/${item.id}`)
            }
            onLongPress={() => deleteHousehold(item.id)}
          >
            <View style={styles.cardLeft}>
              <Ionicons name="home" size={22} color={item.is_draft === 1 ? "#aaa" : "#1a7a4a"} />
              <View>
                <Text style={styles.hhName}>{item.hh_head_name ?? "Unnamed Household"}</Text>
                <Text style={styles.hhId}>{item.is_draft === 1 ? "Draft" : item.hh_id ?? ""}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/years/${yearId}/barangays/${barangayId}/households/new`)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  subtitle: {
    textAlign: "center", color: "#666", fontSize: 13,
    paddingVertical: 10, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e0e0e0",
  },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  card: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", elevation: 2,
  },
  draftCard: { borderLeftWidth: 4, borderLeftColor: "#ffa000" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  hhName: { fontSize: 15, color: "#222", fontWeight: "500" },
  hhId: { fontSize: 12, color: "#888", marginTop: 2 },
  empty: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyText: { fontSize: 16, color: "#aaa", fontWeight: "600" },
  emptySubtext: { fontSize: 13, color: "#ccc" },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    backgroundColor: "#1a7a4a", width: 56, height: 56,
    borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 4,
  },
});

const dashStyles = StyleSheet.create({
  wrapper: { backgroundColor: "#fff", borderRadius: 10, marginBottom: 12, overflow: "hidden", elevation: 2 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  toggleText: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1a7a4a" },
  content: { padding: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  loadingText: { textAlign: "center", color: "#888", padding: 16 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: "#1a7a4a", borderRadius: 8, padding: 10, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  statLbl: { fontSize: 10, color: "#a8d5b5", marginTop: 2 },
  avgScore: { fontSize: 13, color: "#666", marginBottom: 8, fontWeight: "600" },
});

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 8, borderRadius: 8, backgroundColor: "#f9f9f9", overflow: "hidden" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, backgroundColor: "#f0f7f3",
  },
  title: { fontSize: 13, fontWeight: "700", color: "#1a7a4a" },
  body: { padding: 12 },
});

const chartStyles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { width: 72, fontSize: 11, color: "#555" },
  barBg: { flex: 1, height: 16, backgroundColor: "#e8f5ee", borderRadius: 4, overflow: "hidden" },
  bar: { height: 16, borderRadius: 4, minWidth: 4 },
  value: { width: 28, fontSize: 11, color: "#333", textAlign: "right" },
  pieRow: { flexDirection: "row", height: 20, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  pieSegment: { height: 20 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#555" },
});