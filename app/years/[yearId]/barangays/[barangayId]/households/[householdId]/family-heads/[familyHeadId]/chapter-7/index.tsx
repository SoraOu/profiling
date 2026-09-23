import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router";
import { getDb } from "@/db/database";
import { HFIAS_QUESTIONS } from "@/db/types";

const FREQUENCY_OPTIONS = [
  { label: "Hindi", value: 0 },
  { label: "Bihira (1-2x)", value: 1 },
  { label: "Minsan (3-10x)", value: 2 },
  { label: "Madalas (10x+)", value: 3 },
];

function getInterpretation(total: number): string {
  if (total === 0) return "Food Secure";
  if (total <= 7) return "Mildly Food Insecure";
  if (total <= 14) return "Moderately Food Insecure";
  return "Severely Food Insecure";
}

export default function ChapterSevenScreen() {
  const { familyHeadId } = useLocalSearchParams<{ familyHeadId: string }>();
  const router = useRouter();
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [saving, setSaving] = useState(false);

  const total = scores.reduce((a, b) => a + b, 0);
  const interpretation = getInterpretation(total);

  useEffect(() => {
    loadData();
  }, [familyHeadId]);

  async function loadData() {
    const db = await getDb();
    const fh = await db.getFirstAsync<any>(
      "SELECT hfias_q1,hfias_q2,hfias_q3,hfias_q4,hfias_q5,hfias_q6,hfias_q7,hfias_q8,hfias_q9 FROM family_heads WHERE id = ?",
      [familyHeadId]
    );
    if (fh) {
      setScores([
        fh.hfias_q1, fh.hfias_q2, fh.hfias_q3,
        fh.hfias_q4, fh.hfias_q5, fh.hfias_q6,
        fh.hfias_q7, fh.hfias_q8, fh.hfias_q9,
      ]);
    }
  }

  function setScore(index: number, value: number) {
    const updated = [...scores];
    updated[index] = value;
    setScores(updated);
  }

  async function save() {
    setSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        `UPDATE family_heads SET
          hfias_q1=?, hfias_q2=?, hfias_q3=?,
          hfias_q4=?, hfias_q5=?, hfias_q6=?,
          hfias_q7=?, hfias_q8=?, hfias_q9=?,
          hfias_total=?, hfias_interpretation=?
         WHERE id = ?`,
        [...scores, total, interpretation, familyHeadId]
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
      <Stack.Screen options={{ title: "Chapter VII — Food Insecurity" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Chapter VII — HFIAS</Text>
        <Text style={styles.hint}>
          Suriin ang bawat isa. 0=Hindi kailanman, 1=Bihira, 2=Minsan, 3=Madalas
        </Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Total Score</Text>
          <Text style={styles.scoreNumber}>{total}</Text>
          <Text style={[
            styles.interpretation,
            total === 0 ? styles.secure :
            total <= 7 ? styles.mild :
            total <= 14 ? styles.moderate : styles.severe
          ]}>
            {interpretation}
          </Text>
        </View>

        {HFIAS_QUESTIONS.map((q, i) => (
          <View key={i} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Q{i + 1}</Text>
            <Text style={styles.questionText}>{q}</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.freqBtn,
                    scores[i] === opt.value && styles.freqBtnSelected,
                  ]}
                  onPress={() => setScore(i, opt.value)}
                >
                  <Text style={[
                    styles.freqText,
                    scores[i] === opt.value && styles.freqTextSelected,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Chapter VII"}</Text>
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
  hint: { fontSize: 13, color: "#888", marginBottom: 12 },
  scoreCard: {
    backgroundColor: "#1a7a4a",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  scoreLabel: { color: "#a8d5b5", fontSize: 13 },
  scoreNumber: { color: "#fff", fontSize: 48, fontWeight: "bold" },
  interpretation: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  secure: { color: "#a8d5b5" },
  mild: { color: "#fff176" },
  moderate: { color: "#ffb74d" },
  severe: { color: "#ef9a9a" },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a7a4a",
    marginBottom: 4,
  },
  questionText: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 12 },
  frequencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  freqBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },
  freqBtnSelected: { backgroundColor: "#1a7a4a", borderColor: "#1a7a4a" },
  freqText: { fontSize: 12, color: "#444" },
  freqTextSelected: { color: "#fff", fontWeight: "600" },
  saveBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#1a7a4a",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});