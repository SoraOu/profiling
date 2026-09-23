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
import { SKILLS_LIST } from "@/db/types";

export default function ChapterNineScreen() {
  const { familyHeadId } = useLocalSearchParams<{ familyHeadId: string }>();
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>([]);
  const [othersText, setOthersText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [familyHeadId]);

  async function loadData() {
    const db = await getDb();
    const fh = await db.getFirstAsync<any>(
      "SELECT skills FROM family_heads WHERE id = ?",
      [familyHeadId]
    );
    if (fh) {
      setSkills(JSON.parse(fh.skills || "[]"));
    }
  }

  function toggleSkill(skill: string) {
    setSkills(
      skills.includes(skill)
        ? skills.filter((s) => s !== skill)
        : [...skills, skill]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE family_heads SET skills = ? WHERE id = ?",
        [JSON.stringify(skills), familyHeadId]
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
      <Stack.Screen options={{ title: "Chapter IX — Household Skills" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Chapter IX — Household Skills</Text>
        <Text style={styles.hint}>
          Skills of Household Members. Piliin lahat ng naaangkop.
        </Text>

        {SKILLS_LIST.map((skill) => (
          <TouchableOpacity
            key={skill}
            style={styles.skillRow}
            onPress={() => toggleSkill(skill)}
          >
            <View style={[styles.checkbox, skills.includes(skill) && styles.checkboxChecked]}>
              {skills.includes(skill) && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.skillText, skills.includes(skill) && styles.skillTextActive]}>
              {skill}
            </Text>
          </TouchableOpacity>
        ))}

        {skills.includes("Others") && (
          <>
            <Text style={styles.label}>Specify Others</Text>
            <TextInput
              style={styles.input}
              value={othersText}
              onChangeText={setOthersText}
              placeholder="e.g. Paggupit ng Buhok"
            />
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save Chapter IX"}
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
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
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
  skillText: { fontSize: 14, color: "#444", flex: 1 },
  skillTextActive: { color: "#1a7a4a", fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    fontSize: 15,
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