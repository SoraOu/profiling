import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, StyleSheet,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { getDb } from "@/db/database";
import DatePickerField from "@/components/DatePickerField";

export default function NewFamilyHeadScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [dateOfInterview, setDateOfInterview] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [memberCount, setMemberCount] = useState("0");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name) {
      Alert.alert("Missing Field", "Please enter the family head's name.");
      return;
    }
    setSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO family_heads (household_id, name, date_of_interview, contact_no, member_count)
         VALUES (?, ?, ?, ?, ?)`,
        [householdId, name, dateOfInterview || null, contactNo || null, parseInt(memberCount) || 0]
      );
      router.back();
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "New Family Head" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Family Head — Identifying Info</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input} value={name} onChangeText={setName}
          placeholder="e.g. Maria Santos"
        />

        <DatePickerField
          label="Date of Interview"
          value={dateOfInterview}
          onChange={setDateOfInterview}
          showToday
        />

        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={styles.input} value={contactNo} onChangeText={setContactNo}
          placeholder="e.g. 09123456789" keyboardType="phone-pad"
        />

        <Text style={styles.label}>Number of Members in Family</Text>
        <TextInput
          style={styles.input} value={memberCount} onChangeText={setMemberCount}
          keyboardType="numeric" placeholder="0"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save & Continue"}</Text>
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
    marginTop: 20, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderRadius: 8, borderWidth: 1,
    borderColor: "#ddd", padding: 12, fontSize: 15,
  },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 8, backgroundColor: "#1a7a4a", alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});