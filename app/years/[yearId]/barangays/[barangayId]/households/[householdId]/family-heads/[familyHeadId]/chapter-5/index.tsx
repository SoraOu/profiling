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
import { Stack } from "expo-router";
import { getDb } from "@/db/database";
import {
  INCOME_SOURCES,
  INCOME_RANGES,
  GOV_PROGRAMS,
  LIVELIHOOD_SOURCES,
} from "@/db/types";

export default function ChapterFiveScreen() {
  const { familyHeadId } = useLocalSearchParams<{ familyHeadId: string }>();
  const router = useRouter();

  const [incomeSources, setIncomeSources] = useState<string[]>([]);
  const [incomeSourcesOther, setIncomeSourcesOther] = useState("");
  const [incomeRange, setIncomeRange] = useState("");
  const [hasGovAssistance, setHasGovAssistance] = useState(false);
  const [govAssistanceAmount, setGovAssistanceAmount] = useState("");
  const [govPrograms, setGovPrograms] = useState<string[]>([]);
  const [livelihoods, setLivelihoods] = useState<string[]>([]);
  const [govProgramsOther, setGovProgramsOther] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [familyHeadId]);

  async function loadData() {
    const db = await getDb();
    const fh = await db.getFirstAsync<any>(
      "SELECT * FROM family_heads WHERE id = ?",
      [familyHeadId]
    );
    if (fh) {
      setIncomeSources(JSON.parse(fh.income_sources || "[]"));
      setIncomeSourcesOther(fh.income_sources_other ?? "");
      setIncomeRange(fh.income_range ?? "");
      setGovPrograms(JSON.parse(fh.gov_programs || "[]"));
      setLivelihoods(JSON.parse(fh.livelihoods || "[]"));
      setGovProgramsOther(fh.gov_programs_other ?? "");
      // Load saved assistance amount and restore toggle state
      const savedAmount = fh.gov_assistance_amount ?? "";
      setGovAssistanceAmount(savedAmount);
      setHasGovAssistance(savedAmount !== "");
    }
  }

  function toggleItem(
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) {
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        `UPDATE family_heads SET
          income_sources = ?,
          income_sources_other = ?,
          income_range = ?,
          gov_assistance_amount = ?,
          gov_programs = ?,
          livelihoods = ?,
          gov_programs_other = ?
         WHERE id = ?`,
        [
          JSON.stringify(incomeSources),
          incomeSourcesOther || null,
          incomeRange || null,
          hasGovAssistance ? (govAssistanceAmount || null) : null,
          JSON.stringify(govPrograms),
          JSON.stringify(livelihoods),
          govProgramsOther || null,
          familyHeadId,
        ]
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
      <Stack.Screen options={{ title: "Chapter V — Socio-Economic" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <Text style={styles.sectionTitle}>V-A — Main Source of Income</Text>
        <View style={styles.optionGroup}>
          {INCOME_SOURCES.map((src) => (
            <TouchableOpacity
              key={src}
              style={[styles.option, incomeSources.includes(src) && styles.optionSelected]}
              onPress={() => toggleItem(incomeSources, setIncomeSources, src)}
            >
              <Text style={[styles.optionText, incomeSources.includes(src) && styles.optionTextSelected]}>
                {src}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {incomeSources.includes("Others") && (
          <>
            <Text style={styles.label}>Specify Others</Text>
            <TextInput
              style={styles.input}
              value={incomeSourcesOther}
              onChangeText={setIncomeSourcesOther}
              placeholder="e.g. Buy and sell"
            />
          </>
        )}

        <Text style={styles.sectionTitle}>V-B — Estimated Monthly Income</Text>
        <View style={styles.optionGroup}>
          {INCOME_RANGES.map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.option, incomeRange === range && styles.optionSelected]}
              onPress={() => setIncomeRange(range)}
            >
              <Text style={[styles.optionText, incomeRange === range && styles.optionTextSelected]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => {
            if (hasGovAssistance) setGovAssistanceAmount("");
            setHasGovAssistance(!hasGovAssistance);
          }}
        >
          <View style={[styles.checkbox, hasGovAssistance && styles.checkboxChecked]}>
            {hasGovAssistance && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>Gov't & Private Assistances</Text>
        </TouchableOpacity>
        {hasGovAssistance && (
          <>
            <Text style={styles.label}>Amount (₱)</Text>
            <TextInput
              style={styles.input}
              value={govAssistanceAmount}
              onChangeText={setGovAssistanceAmount}
              keyboardType="numeric"
              placeholder="e.g. 500"
            />
          </>
        )}

        <Text style={styles.sectionTitle}>V-C — Participation in Government Programs</Text>
        <View style={styles.optionGroup}>
          {GOV_PROGRAMS.map((prog) => (
            <TouchableOpacity
              key={prog}
              style={[styles.option, govPrograms.includes(prog) && styles.optionSelected]}
              onPress={() => toggleItem(govPrograms, setGovPrograms, prog)}
            >
              <Text style={[styles.optionText, govPrograms.includes(prog) && styles.optionTextSelected]}>
                {prog}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {govPrograms.includes("Livelihood Assistance") && (
          <>
            <Text style={styles.label}>Livelihood Source</Text>
            <View style={styles.optionGroup}>
              {LIVELIHOOD_SOURCES.map((src) => (
                <TouchableOpacity
                  key={src}
                  style={[styles.option, livelihoods.includes(src) && styles.optionSelected]}
                  onPress={() => toggleItem(livelihoods, setLivelihoods, src)}
                >
                  <Text style={[styles.optionText, livelihoods.includes(src) && styles.optionTextSelected]}>
                    {src}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {govPrograms.includes("Others") && (
          <>
            <Text style={styles.label}>Specify Others</Text>
            <TextInput
              style={styles.input}
              value={govProgramsOther}
              onChangeText={setGovProgramsOther}
              placeholder="e.g. TUPAD"
            />
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save Chapter V"}
          </Text>
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
  optionGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff",
  },
  optionSelected: { backgroundColor: "#1a7a4a", borderColor: "#1a7a4a" },
  optionText: { fontSize: 13, color: "#444" },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
    borderColor: "#1a7a4a", alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#1a7a4a" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  checkLabel: { fontSize: 14, color: "#444" },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 8, backgroundColor: "#1a7a4a", alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});