import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "../../db/database";
import { SurveyYear } from "../../db/types";

export default function YearsScreen() {
  const [years, setYears] = useState<SurveyYear[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [yearInput, setYearInput] = useState("");
  const router = useRouter();

  async function loadYears() {
    const db = await getDb();
    const result = await db.getAllAsync<SurveyYear>(
      "SELECT * FROM survey_years ORDER BY year DESC"
    );
    setYears(result);
  }

useFocusEffect(
  useCallback(() => {
    loadYears();
  }, [])
);

  async function addYear() {
    const year = parseInt(yearInput);
    if (isNaN(year) || year < 2000 || year > 2100) {
      Alert.alert("Invalid Year", "Please enter a valid year.");
      return;
    }
    try {
      const db = await getDb();
      await db.runAsync("INSERT INTO survey_years (year) VALUES (?)", [year]);
      setModalVisible(false);
      setYearInput("");
      loadYears();
    } catch (e) {
      Alert.alert("Error", "That year already exists.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Municipal Nutrition Office · Mogpog</Text>

      <FlatList
        data={years}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No survey years yet.</Text>
            <Text style={styles.emptySubtext}>Tap + to add a year.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/years/${item.id}/barangays`)}
          >
            <View style={styles.cardLeft}>
              <Ionicons name="calendar" size={28} color="#1a7a4a" />
              <Text style={styles.yearText}>{item.year}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setYearInput(new Date().getFullYear().toString());
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Survey Year</Text>
            <TextInput
              style={styles.modalInput}
              value={yearInput}
              onChangeText={setYearInput}
              keyboardType="numeric"
              maxLength={4}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={addYear}>
                <Text style={styles.modalConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  subtitle: {
    textAlign: "center",
    color: "#666",
    fontSize: 13,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  yearText: { fontSize: 22, fontWeight: "bold", color: "#222" },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyText: { fontSize: 16, color: "#aaa", fontWeight: "600" },
  emptySubtext: { fontSize: 13, color: "#ccc" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#1a7a4a",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#222" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  modalCancelText: { color: "#666", fontWeight: "600" },
  modalConfirm: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1a7a4a",
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontWeight: "600" },
});