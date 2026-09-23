import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { getDb } from "@/db/database";
import { NUTRITIONAL_STATUSES } from "@/db/types";
import DatePickerField from "@/components/DatePickerField";

function calculateAgeInDays(birthdayStr: string): number | null {
  const date = new Date(birthdayStr);
  if (isNaN(date.getTime())) return null;
  return Math.floor((new Date().getTime() - date.getTime()) / 86400000);
}

export default function ChildDetailScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [nutritionalStatuses, setNutritionalStatuses] = useState<string[]>([]);
  const [disability, setDisability] = useState("");
  const [medicalCondition, setMedicalCondition] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [childId]);

  async function loadData() {
    const db = await getDb();
    const child = await db.getFirstAsync<any>("SELECT * FROM children WHERE id = ?", [childId]);
    if (child) {
      setName(child.name ?? "");
      setBirthday(child.birthday ?? "");
      setNutritionalStatuses(JSON.parse(child.nutritional_statuses || "[]"));
      setDisability(child.disability ?? "");
      setMedicalCondition(child.medical_condition ?? "");
    }
  }

  function toggleStatus(status: string) {
    setNutritionalStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }

  async function save() {
    if (!name) {
      Alert.alert("Missing Field", "Please enter the child's name.");
      return;
    }
    const ageInDays = birthday ? calculateAgeInDays(birthday) : null;
    setSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        `UPDATE children SET name=?, birthday=?, age_in_days=?, nutritional_statuses=?, disability=?, medical_condition=? WHERE id=?`,
        [name, birthday || null, ageInDays, JSON.stringify(nutritionalStatuses),
          disability || null, medicalCondition || null, childId]
      );
      router.back();
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteChild() {
    Alert.alert("Delete Child", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const db = await getDb();
          await db.runAsync("DELETE FROM children WHERE id = ?", [childId]);
          router.back();
        },
      },
    ]);
  }

  const ageInDays = birthday ? calculateAgeInDays(birthday) : null;

  return (
    <>
      <Stack.Screen options={{ title: "Edit Child" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Edit Child Record</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Juan Santos Jr." />

        <DatePickerField label="Birthday" value={birthday} onChange={setBirthday} />
        {ageInDays !== null && (
          <Text style={styles.ageDisplay}>
            Age: {ageInDays} days ({Math.floor(ageInDays / 30)} months)
          </Text>
        )}

        <Text style={styles.label}>Nutritional Status (multi-select)</Text>
        <View style={styles.statusGrid}>
          {NUTRITIONAL_STATUSES.map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.statusBtn, nutritionalStatuses.includes(status) && styles.statusBtnSelected]}
              onPress={() => toggleStatus(status)}
            >
              <Text style={[styles.statusText, nutritionalStatuses.includes(status) && styles.statusTextSelected]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Disability (if any)</Text>
        <TextInput style={styles.input} value={disability} onChangeText={setDisability} placeholder="e.g. Visual Impairment" />

        <Text style={styles.label}>Medical Condition (if any)</Text>
        <TextInput style={styles.input} value={medicalCondition} onChangeText={setMedicalCondition} placeholder="e.g. Asthma" />

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={deleteChild}>
          <Text style={styles.deleteBtnText}>Delete Child Record</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14, fontWeight: "700", color: "#1a7a4a",
    marginTop: 8, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderRadius: 8, borderWidth: 1,
    borderColor: "#ddd", padding: 12, fontSize: 15,
  },
  ageDisplay: { fontSize: 13, color: "#1a7a4a", fontWeight: "600", marginTop: 6, marginLeft: 4 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff",
    minWidth: 60, alignItems: "center",
  },
  statusBtnSelected: { backgroundColor: "#1a7a4a", borderColor: "#1a7a4a" },
  statusText: { fontSize: 14, fontWeight: "600", color: "#444" },
  statusTextSelected: { color: "#fff" },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 8, backgroundColor: "#1a7a4a", alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  deleteBtn: { marginTop: 12, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: "#e53935", alignItems: "center" },
  deleteBtnText: { color: "#e53935", fontWeight: "600", fontSize: 15 },
});