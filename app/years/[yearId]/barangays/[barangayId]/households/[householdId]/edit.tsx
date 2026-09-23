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
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { getDb } from "@/db/database";
import {
  LOCATION_TYPES,
  DWELLING_TYPES,
  TOILET_FACILITIES,
  WATER_SOURCES,
  WASTE_DISPOSAL_TYPES,
} from "@/db/types";

export default function EditHouseholdScreen() {
  const { yearId, barangayId, householdId } = useLocalSearchParams<{
    yearId: string;
    barangayId: string;
    householdId: string;
  }>();
  const router = useRouter();

  const [hhHeadName, setHhHeadName] = useState("");
  const [purok, setPurok] = useState("");
  const [locationType, setLocationType] = useState("");
  const [dwellingType, setDwellingType] = useState("");
  const [toiletFacility, setToiletFacility] = useState("");
  const [waterDrinking, setWaterDrinking] = useState("");
  const [waterDailyUse, setWaterDailyUse] = useState("");
  const [wasteDisposal, setWasteDisposal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [householdId]);

  async function loadData() {
    const db = await getDb();
    const hh = await db.getFirstAsync<any>(
      "SELECT * FROM households WHERE id = ?",
      [householdId]
    );
    if (hh) {
      setHhHeadName(hh.hh_head_name ?? "");
      setPurok(hh.purok ?? "");
      setLocationType(hh.location_type ?? "");
      setDwellingType(hh.dwelling_type ?? "");
      setToiletFacility(hh.toilet_facility ?? "");
      setWaterDrinking(hh.water_drinking ?? "");
      setWaterDailyUse(hh.water_daily_use ?? "");
      setWasteDisposal(hh.waste_disposal ?? "");
    }
  }

  async function save() {
    if (!hhHeadName || !purok || !locationType) {
      Alert.alert("Missing Fields", "Please fill in HH Head Name, Purok, and Location Type.");
      return;
    }
    setSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        `UPDATE households SET
          hh_head_name = ?, purok = ?, location_type = ?,
          dwelling_type = ?, toilet_facility = ?,
          water_drinking = ?, water_daily_use = ?, waste_disposal = ?
         WHERE id = ?`,
        [
          hhHeadName, purok, locationType,
          dwellingType || null, toiletFacility || null,
          waterDrinking || null, waterDailyUse || null,
          wasteDisposal || null, householdId,
        ]
      );
      router.back();
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setSaving(false);
    }
  }

  function OptionGroup({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: readonly string[];
    selected: string;
    onSelect: (v: string) => void;
  }) {
    return (
      <>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.optionGroup}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.option, selected === opt && styles.optionSelected]}
              onPress={() => onSelect(opt)}
            >
              <Text style={[styles.optionText, selected === opt && styles.optionTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Edit Household" }} />

      <Text style={styles.sectionTitle}>Chapter I — Identifying Information</Text>

      <Text style={styles.label}>Name of Household Head *</Text>
      <TextInput
        style={styles.input}
        value={hhHeadName}
        onChangeText={setHhHeadName}
        placeholder="e.g. Juan dela Cruz"
      />

      <Text style={styles.label}>Purok *</Text>
      <TextInput
        style={styles.input}
        value={purok}
        onChangeText={setPurok}
        placeholder="e.g. Purok 1"
      />

      <Text style={styles.sectionTitle}>Chapter II — Location Classification *</Text>
      <View style={styles.optionGroup}>
        {LOCATION_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.option, locationType === type && styles.optionSelected]}
            onPress={() => setLocationType(type)}
          >
            <Text style={[styles.optionText, locationType === type && styles.optionTextSelected]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Chapter IV — Housing & Environmental Conditions</Text>

      <OptionGroup label="Type of Dwelling Unit" options={DWELLING_TYPES} selected={dwellingType} onSelect={setDwellingType} />
      <OptionGroup label="Toilet Facility" options={TOILET_FACILITIES} selected={toiletFacility} onSelect={setToiletFacility} />
      <OptionGroup label="Water Source (Drinking)" options={WATER_SOURCES} selected={waterDrinking} onSelect={setWaterDrinking} />
      <OptionGroup label="Water Source (Daily Use)" options={WATER_SOURCES} selected={waterDailyUse} onSelect={setWaterDailyUse} />
      <OptionGroup label="Waste Disposal" options={WASTE_DISPOSAL_TYPES} selected={wasteDisposal} onSelect={setWasteDisposal} />

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
      </TouchableOpacity>
    </ScrollView>
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
  saveBtn: {
    marginTop: 32, padding: 16, borderRadius: 8,
    backgroundColor: "#1a7a4a", alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});