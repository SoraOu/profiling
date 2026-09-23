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
import { FamilyHead, Child } from "@/db/types";

export default function FamilyHeadDetailScreen() {
  const { yearId, barangayId, householdId, familyHeadId } =
    useLocalSearchParams<{
      yearId: string;
      barangayId: string;
      householdId: string;
      familyHeadId: string;
    }>();
  const router = useRouter();
  const [fh, setFh] = useState<FamilyHead | null>(null);
  const [children, setChildren] = useState<Child[]>([]);

  async function loadData() {
    const db = await getDb();
    const result = await db.getFirstAsync<FamilyHead>(
      "SELECT * FROM family_heads WHERE id = ?",
      [familyHeadId]
    );
    setFh(result ?? null);

    const kids = await db.getAllAsync<Child>(
      "SELECT * FROM children WHERE family_head_id = ? ORDER BY created_at ASC",
      [familyHeadId]
    );
    setChildren(kids);
  }

useFocusEffect(
  useCallback(() => {
    loadData();
  }, [familyHeadId])
);

  if (!fh) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const basePath = `/years/${yearId}/barangays/${barangayId}/households/${householdId}/family-heads/${familyHeadId}`;

  const chapters = [
    { key: "chapter-5", label: "Chapter V", sub: "Socio-Economic", icon: "cash-outline" },
    { key: "chapter-7", label: "Chapter VII", sub: "Food Insecurity (HFIAS)", icon: "restaurant-outline" },
    { key: "chapter-8", label: "Chapter VIII", sub: "Coping Strategies", icon: "shield-outline" },
    { key: "chapter-9", label: "Chapter IX", sub: "Household Skills", icon: "construct-outline" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: fh.name ?? "Family Head" }} />

      <View style={styles.card}>
        <Text style={styles.fhName}>{fh.name ?? "—"}</Text>
        <Text style={styles.fhMeta}>Date of Interview: {fh.date_of_interview ?? "—"}</Text>
        <Text style={styles.fhMeta}>Contact: {fh.contact_no ?? "—"}</Text>
        <Text style={styles.fhMeta}>Members: {fh.member_count}</Text>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => router.push(`${basePath}/edit`)}
      >
        <Ionicons name="create-outline" size={18} color="#1a7a4a" />
        <Text style={styles.editBtnText}>Edit Info</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Chapters</Text>
      {chapters.map((ch) => (
        <TouchableOpacity
          key={ch.key}
          style={styles.chapterCard}
          onPress={() => router.push(`${basePath}/${ch.key}`)}
        >
          <View style={styles.chapterLeft}>
            <Ionicons name={ch.icon as any} size={22} color="#1a7a4a" />
            <View>
              <Text style={styles.chapterLabel}>{ch.label}</Text>
              <Text style={styles.chapterSub}>{ch.sub}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Children (Chapter VI)</Text>

      {children.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={40} color="#ccc" />
          <Text style={styles.emptyText}>No children yet.</Text>
        </View>
      )}

      {children.map((child) => (
        <TouchableOpacity
          key={child.id}
          style={styles.childCard}
          onPress={() => router.push(`${basePath}/children/${child.id}`)}
        >
          <View style={styles.chapterLeft}>
            <Ionicons name="person" size={20} color="#1a7a4a" />
            <View>
              <Text style={styles.chapterLabel}>{child.name ?? "Unnamed"}</Text>
              <Text style={styles.chapterSub}>
                {child.age_in_days != null
                  ? `${child.age_in_days} days old`
                  : "No birthday set"}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push(`${basePath}/children/new`)}
      >
        <Ionicons name="add" size={20} color="#1a7a4a" />
        <Text style={styles.addBtnText}>Add Child</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 10,
    padding: 16, elevation: 2, gap: 4,
  },
  fhName: { fontSize: 20, fontWeight: "bold", color: "#222", marginBottom: 8 },
  fhMeta: { fontSize: 14, color: "#555" },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 12, padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: "#1a7a4a", backgroundColor: "#fff",
  },
  editBtnText: { color: "#1a7a4a", fontWeight: "600", fontSize: 14 },
  sectionTitle: {
    fontSize: 14, fontWeight: "700", color: "#1a7a4a",
    marginTop: 20, marginBottom: 10, textTransform: "uppercase",
  },
  chapterCard: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", elevation: 2, marginBottom: 10,
  },
  chapterLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  chapterLabel: { fontSize: 15, fontWeight: "600", color: "#222" },
  chapterSub: { fontSize: 12, color: "#888", marginTop: 2 },
  childCard: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", elevation: 2, marginBottom: 10,
  },
  empty: { alignItems: "center", padding: 24, gap: 8 },
  emptyText: { fontSize: 14, color: "#aaa" },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 12, padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: "#1a7a4a", backgroundColor: "#e8f5e9",
  },
  addBtnText: { color: "#1a7a4a", fontWeight: "600", fontSize: 15 },
});