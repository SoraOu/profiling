import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "@/db/database";
import { Household, FamilyHead } from "@/db/types";

export default function HouseholdDetailScreen() {
  const { yearId, barangayId, householdId } = useLocalSearchParams<{
    yearId: string;
    barangayId: string;
    householdId: string;
  }>();
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [familyHeads, setFamilyHeads] = useState<FamilyHead[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);

  async function loadData() {
    const db = await getDb();
    const hh = await db.getFirstAsync<Household>(
      "SELECT * FROM households WHERE id = ?",
      [householdId]
    );
    setHousehold(hh ?? null);

    const fhs = await db.getAllAsync<FamilyHead>(
      "SELECT * FROM family_heads WHERE household_id = ? ORDER BY created_at ASC",
      [householdId]
    );
    setFamilyHeads(fhs);
    setTotalMembers(fhs.reduce((sum, fh) => sum + (fh.member_count ?? 0), 0));
  }

useFocusEffect(
  useCallback(() => {
    loadData();
  }, [householdId])
);

  if (!household) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: household.hh_head_name ?? "Household Details" }} />

      {household.is_draft === 1 && (
        <View style={styles.draftBanner}>
          <Ionicons name="warning-outline" size={16} color="#ffa000" />
          <Text style={styles.draftText}>Draft — not included in exports</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.hhId}>{household.hh_id ?? "No HH ID (Draft)"}</Text>
        <Text style={styles.hhName}>{household.hh_head_name ?? "—"}</Text>
        <Text style={styles.hhMeta}>Purok: {household.purok ?? "—"}</Text>
        <Text style={styles.hhMeta}>Location: {household.location_type ?? "—"}</Text>
        <Text style={styles.hhMeta}>Dwelling: {household.dwelling_type ?? "—"}</Text>
        <Text style={styles.hhMeta}>Toilet: {household.toilet_facility ?? "—"}</Text>
        <Text style={styles.hhMeta}>Drinking Water: {household.water_drinking ?? "—"}</Text>
        <Text style={styles.hhMeta}>Daily Water: {household.water_daily_use ?? "—"}</Text>
        <Text style={styles.hhMeta}>Waste Disposal: {household.waste_disposal ?? "—"}</Text>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() =>
          router.push(
            `/years/${yearId}/barangays/${barangayId}/households/${householdId}/edit`
          )
        }
      >
        <Ionicons name="create-outline" size={18} color="#1a7a4a" />
        <Text style={styles.editBtnText}>Edit Household Info</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{familyHeads.length}</Text>
          <Text style={styles.statLabel}>Families</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalMembers}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Family Heads</Text>

      {familyHeads.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color="#ccc" />
          <Text style={styles.emptyText}>No family heads yet.</Text>
        </View>
      )}

      {familyHeads.map((fh) => (
        <TouchableOpacity
          key={fh.id}
          style={styles.fhCard}
          onPress={() =>
            router.push(
              `/years/${yearId}/barangays/${barangayId}/households/${householdId}/family-heads/${fh.id}`
            )
          }
        >
          <View style={styles.fhLeft}>
            <Ionicons name="person" size={20} color="#1a7a4a" />
            <View>
              <Text style={styles.fhName}>{fh.name ?? "Unnamed"}</Text>
              <Text style={styles.fhMeta}>{fh.member_count} member(s)</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.addFhBtn}
        onPress={() =>
          router.push(
            `/years/${yearId}/barangays/${barangayId}/households/${householdId}/family-heads/new`
          )
        }
      >
        <Ionicons name="add" size={20} color="#1a7a4a" />
        <Text style={styles.addFhText}>Add Family Head</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  draftBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff8e1", padding: 10, borderRadius: 8,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#ffa000",
  },
  draftText: { color: "#ffa000", fontWeight: "600", fontSize: 13 },
  card: {
    backgroundColor: "#fff", borderRadius: 10,
    padding: 16, elevation: 2, gap: 4,
  },
  hhId: { fontSize: 12, color: "#888", marginBottom: 4 },
  hhName: { fontSize: 20, fontWeight: "bold", color: "#222", marginBottom: 8 },
  hhMeta: { fontSize: 14, color: "#555" },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 12, padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: "#1a7a4a", backgroundColor: "#fff",
  },
  editBtnText: { color: "#1a7a4a", fontWeight: "600", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statBox: {
    flex: 1, backgroundColor: "#1a7a4a", borderRadius: 10,
    padding: 16, alignItems: "center",
  },
  statNumber: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  statLabel: { fontSize: 13, color: "#a8d5b5", marginTop: 2 },
  sectionTitle: {
    fontSize: 14, fontWeight: "700", color: "#1a7a4a",
    marginTop: 20, marginBottom: 10, textTransform: "uppercase",
  },
  empty: { alignItems: "center", padding: 24, gap: 8 },
  emptyText: { fontSize: 14, color: "#aaa" },
  fhCard: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", elevation: 2, marginBottom: 10,
  },
  fhLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  fhName: { fontSize: 15, fontWeight: "500", color: "#222" },
  fhMeta: { fontSize: 12, color: "#888" },
  addFhBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 12, padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: "#1a7a4a", backgroundColor: "#e8f5e9",
  },
  addFhText: { color: "#1a7a4a", fontWeight: "600", fontSize: 15 },
});