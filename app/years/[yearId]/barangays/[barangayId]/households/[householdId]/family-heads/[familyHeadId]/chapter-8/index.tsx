import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router"; // ADD THIS IMPORT
import { getDb } from "@/db/database";
import { COPING_STRATEGIES_LIST } from "@/db/types";

export default function ChapterEightScreen() {
  const { familyHeadId } = useLocalSearchParams<{ familyHeadId: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<{ strategy: string; frequency: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [familyHeadId]);

  async function loadData() {
    const db = await getDb();
    const fh = await db.getFirstAsync<any>(
      "SELECT coping_strategies FROM family_heads WHERE id = ?",
      [familyHeadId]
    );
    if (fh) {
      setSelected(JSON.parse(fh.coping_strategies || "[]"));
    }
  }

  function isSelected(strategy: string) {
    return selected.some((s) => s.strategy === strategy);
  }

  function toggleStrategy(strategy: string) {
    if (isSelected(strategy)) {
      setSelected(selected.filter((s) => s.strategy !== strategy));
    } else {
      setSelected([...selected, { strategy, frequency: "" }]);
    }
  }

  function setFrequency(strategy: string, frequency: string) {
    setSelected(
      selected.map((s) => s.strategy === strategy ? { ...s, frequency } : s)
    );
  }

  async function save() {
    setSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE family_heads SET coping_strategies = ? WHERE id = ?",
        [JSON.stringify(selected), familyHeadId]
      );
      router.back();
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Chapter VIII — Coping Strategies" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Chapter VIII — Coping Strategies</Text>
        <Text style={styles.hint}>
          Mga Paraan ng Pag-angkop ng Pamilya. Piliin at ilagay ang dalas bawat linggo.
        </Text>

        {COPING_STRATEGIES_LIST.map((strategy) => {
          const active = isSelected(strategy);
          const item = selected.find((s) => s.strategy === strategy);
          return (
            <View key={strategy} style={styles.strategyCard}>
              <TouchableOpacity
                style={styles.strategyRow}
                onPress={() => toggleStrategy(strategy)}
              >
                <View style={[styles.checkbox, active && styles.checkboxChecked]}>
                  {active && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.strategyText, active && styles.strategyTextActive]}>
                  {strategy}
                </Text>
              </TouchableOpacity>
              {active && (
                <View style={styles.frequencyRow}>
                  <Text style={styles.freqLabel}>Dalas bawat linggo:</Text>
                  <TextInput
                    style={styles.freqInput}
                    value={item?.frequency ?? ""}
                    onChangeText={(v) => setFrequency(strategy, v)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save Chapter VIII"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a7a4a",
    marginTop: 8,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hint: { fontSize: 13, color: "#888", marginBottom: 16 },
  strategyCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  strategyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#1a7a4a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: "#1a7a4a" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  strategyText: { fontSize: 14, color: "#444", flex: 1 },
  strategyTextActive: { color: "#1a7a4a", fontWeight: "600" },
  frequencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  freqLabel: { fontSize: 13, color: "#666" },
  freqInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 6,
    width: 60,
    textAlign: "center",
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#1a7a4a",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});