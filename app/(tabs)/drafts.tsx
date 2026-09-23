// app/(tabs)/drafts.tsx
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "@/db/database";

interface DraftItem {
  householdId: number;
  yearId: number;
  barangayId: number;
  hhHeadName: string | null;
  purok: string | null;
  barangayName: string;
  year: number;
  familyCount: number;
  completedFamilies: number; // families with all 4 chapters filled
}

// A family head is "chapter-complete" if it has at least one non-default value
// in each of: income_range (ch5), hfias_total > 0 (ch7),
// coping_strategies not empty (ch8), skills not empty (ch9)
function isFamilyComplete(fh: any): boolean {
  const ch5 = !!(fh.income_range);
  const ch7 = (fh.hfias_total ?? 0) > 0;
  let ch8 = false;
  let ch9 = false;
  try { ch8 = JSON.parse(fh.coping_strategies || "[]").length > 0; } catch {}
  try { ch9 = JSON.parse(fh.skills || "[]").length > 0; } catch {}
  return ch5 && ch7 && ch8 && ch9;
}

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [])
  );

  async function loadDrafts() {
    setLoading(true);
    try {
      const db = await getDb();
      const households = await db.getAllAsync<any>(`
        SELECT h.id, h.year_id, h.barangay_id, h.hh_head_name, h.purok,
               b.name AS barangayName, sy.year
        FROM households h
        JOIN barangays b ON b.id = h.barangay_id
        JOIN survey_years sy ON sy.id = h.year_id
        WHERE h.is_draft = 1
        ORDER BY sy.year DESC, b.name ASC, h.created_at DESC
      `);

      const items: DraftItem[] = [];
      for (const hh of households) {
        const fhs = await db.getAllAsync<any>(
          "SELECT income_range, hfias_total, coping_strategies, skills FROM family_heads WHERE household_id = ?",
          [hh.id]
        );
        const completedFamilies = fhs.filter(isFamilyComplete).length;
        items.push({
          householdId: hh.id,
          yearId: hh.year_id,
          barangayId: hh.barangay_id,
          hhHeadName: hh.hh_head_name,
          purok: hh.purok,
          barangayName: hh.barangayName,
          year: hh.year,
          familyCount: fhs.length,
          completedFamilies,
        });
      }
      setDrafts(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a7a4a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {drafts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={56} color="#1a7a4a" />
          <Text style={styles.emptyTitle}>No drafts!</Text>
          <Text style={styles.emptyText}>All households have been submitted.</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Ionicons name="warning-outline" size={16} color="#ffa000" />
            <Text style={styles.headerText}>
              {drafts.length} draft household{drafts.length !== 1 ? "s" : ""} — not included in exports
            </Text>
          </View>
          <FlatList
            data={drafts}
            keyExtractor={(item) => item.householdId.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const allDone = item.familyCount > 0 && item.completedFamilies === item.familyCount;
              const noneStarted = item.familyCount === 0;
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() =>
                    router.push(
                      `/years/${item.yearId}/barangays/${item.barangayId}/households/${item.householdId}`
                    )
                  }
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <Ionicons name="home-outline" size={22} color="#ffa000" />
                      <View>
                        <Text style={styles.hhName}>{item.hhHeadName ?? "Unnamed Household"}</Text>
                        <Text style={styles.hhMeta}>{item.barangayName} · {item.purok ?? "No Purok"} · {item.year}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#888" />
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressRow}>
                    {noneStarted ? (
                      <Text style={styles.progressText}>No family heads added yet</Text>
                    ) : (
                      <>
                        <View style={styles.progressBarBg}>
                          <View style={[
                            styles.progressBarFill,
                            { width: `${(item.completedFamilies / item.familyCount) * 100}%` },
                            allDone && styles.progressBarDone,
                          ]} />
                        </View>
                        <Text style={styles.progressText}>
                          {item.completedFamilies}/{item.familyCount} families complete
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Chapter checklist hint */}
                  <View style={styles.chapterHints}>
                    {["Ch.V Income", "Ch.VII HFIAS", "Ch.VIII Coping", "Ch.IX Skills"].map((ch) => (
                      <View key={ch} style={styles.chapterTag}>
                        <Text style={styles.chapterTagText}>{ch}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: "#1a7a4a" },
  emptyText: { fontSize: 14, color: "#888" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff8e1", padding: 12,
    borderBottomWidth: 1, borderBottomColor: "#ffe0b2",
  },
  headerText: { fontSize: 13, color: "#e65100", fontWeight: "600" },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    elevation: 2, borderLeftWidth: 4, borderLeftColor: "#ffa000",
    gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  hhName: { fontSize: 15, fontWeight: "600", color: "#222" },
  hhMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: "#ffe0b2", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: 8, backgroundColor: "#ffa000", borderRadius: 4 },
  progressBarDone: { backgroundColor: "#1a7a4a" },
  progressText: { fontSize: 11, color: "#888", width: 120, textAlign: "right" },
  chapterHints: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chapterTag: { backgroundColor: "#f0f0f0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chapterTagText: { fontSize: 10, color: "#666" },
});