import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { getDb, generateHhId } from "@/db/database";
import {
  LOCATION_TYPES,
  DWELLING_TYPES,
  TOILET_FACILITIES,
  WATER_SOURCES,
  WASTE_DISPOSAL_TYPES,
} from "@/db/types";

export default function NewHouseholdScreen() {
  const { yearId, barangayId } = useLocalSearchParams<{
    yearId: string;
    barangayId: string;
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

  async function saveHousehold(isDraft: boolean) {
    if (!isDraft && (!hhHeadName || !purok || !locationType)) {
      Alert.alert(
        "Missing Fields",
        "Please fill in HH Head Name, Purok, and Location Type."
      );
      return;
    }

    setSaving(true);
    try {
      const db = await getDb();

      const brgy = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM barangays WHERE id = ?",
        [barangayId]
      );
      const yr = await db.getFirstAsync<{ year: number }>(
        "SELECT year FROM survey_years WHERE id = ?",
        [yearId]
      );

      let hhId: string | null = null;
      if (!isDraft && hhHeadName && purok) {
        const lastName = hhHeadName.trim().split(" ").pop() ?? hhHeadName;
        const existing = await db.getAllAsync<{ hh_id: string }>(
          "SELECT hh_id FROM households WHERE barangay_id = ? AND hh_id IS NOT NULL",
          [barangayId]
        );
        const existingIds = existing.map((r) => r.hh_id);
        hhId = await generateHhId(
          yr?.year ?? 0,
          brgy?.name ?? "",
          purok,
          lastName,
          existingIds
        );
      }

      await db.runAsync(
        `INSERT INTO households
          (year_id, barangay_id, is_draft, hh_id, hh_head_name, purok,
           location_type, dwelling_type, toilet_facility,
           water_drinking, water_daily_use, waste_disposal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          yearId,
          barangayId,
          isDraft ? 1 : 0,
          hhId,
          hhHeadName || null,
          purok || null,
          locationType || null,
          dwellingType || null,
          toiletFacility || null,
          waterDrinking || null,
          waterDailyUse || null,
          wasteDisposal || null,
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
              <Text
                style={[
                  styles.optionText,
                  selected === opt && styles.optionTextSelected,
                ]}
              >
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
      <Stack.Screen options={{ title: "New Household" }} />

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
            <Text
              style={[
                styles.optionText,
                locationType === type && styles.optionTextSelected,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Chapter IV — Housing & Environmental Conditions</Text>

      <OptionGroup
        label="Type of Dwelling Unit"
        options={DWELLING_TYPES}
        selected={dwellingType}
        onSelect={setDwellingType}
      />

      <OptionGroup
        label="Toilet Facility"
        options={TOILET_FACILITIES}
        selected={toiletFacility}
        onSelect={setToiletFacility}
      />

      <OptionGroup
        label="Water Source (Drinking)"
        options={WATER_SOURCES}
        selected={waterDrinking}
        onSelect={setWaterDrinking}
      />

      <OptionGroup
        label="Water Source (Daily Use)"
        options={WATER_SOURCES}
        selected={waterDailyUse}
        onSelect={setWaterDailyUse}
      />

      <OptionGroup
        label="Waste Disposal"
        options={WASTE_DISPOSAL_TYPES}
        selected={wasteDisposal}
        onSelect={setWasteDisposal}
      />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.draftBtn}
          onPress={() => saveHousehold(true)}
          disabled={saving}
        >
          <Text style={styles.draftBtnText}>Save as Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => saveHousehold(false)}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a7a4a",
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    fontSize: 15,
  },
  optionGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  optionSelected: { backgroundColor: "#1a7a4a", borderColor: "#1a7a4a" },
  optionText: { fontSize: 13, color: "#444" },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  buttons: { flexDirection: "row", gap: 12, marginTop: 32 },
  draftBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a7a4a",
    alignItems: "center",
  },
  draftBtnText: { color: "#1a7a4a", fontWeight: "600", fontSize: 15 },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1a7a4a",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});