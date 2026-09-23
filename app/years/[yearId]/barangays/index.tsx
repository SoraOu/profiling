import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "@/db/database";
import { Barangay } from "@/db/types";
import { BARANGAYS } from "@/constants/barangays";

export default function BarangaysScreen() {
  const { yearId } = useLocalSearchParams<{ yearId: string }>();
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  async function loadData() {
    const db = await getDb();
    const yr = await db.getFirstAsync<{ year: number }>(
      "SELECT year FROM survey_years WHERE id = ?",
      [yearId]
    );
    setYear(yr?.year ?? null);

    const result = await db.getAllAsync<Barangay>(
      "SELECT * FROM barangays WHERE year_id = ? ORDER BY name ASC",
      [yearId]
    );
    setBarangays(result);
  }

useFocusEffect(
  useCallback(() => {
    loadData();
  }, [yearId])
);

  async function addBarangay(name: string) {
    const db = await getDb();
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM barangays WHERE name = ? AND year_id = ?",
      [name, yearId]
    );
    if (existing) {
      setModalVisible(false);
      return;
    }
    await db.runAsync(
      "INSERT INTO barangays (name, municipality, year_id) VALUES (?, 'Mogpog', ?)",
      [name, yearId]
    );
    setModalVisible(false);
    loadData();
  }

  const addedNames = barangays.map((b) => b.name);
  const available = BARANGAYS.filter((b) => !addedNames.includes(b));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: year ? `Survey Year ${year}` : "Barangays" }} />

      <Text style={styles.subtitle}>Survey Year: {year}</Text>

      <FlatList
        data={barangays}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No barangays yet.</Text>
            <Text style={styles.emptySubtext}>Tap + to add a barangay.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(`/years/${yearId}/barangays/${item.id}/households`)
            }
          >
            <View style={styles.cardLeft}>
              <Ionicons name="location" size={22} color="#1a7a4a" />
              <Text style={styles.barangayText}>{item.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Barangay</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#444" />
              </TouchableOpacity>
            </View>

            {available.length === 0 ? (
              <Text style={styles.allAdded}>All 37 barangays have been added.</Text>
            ) : (
              <FlatList
                data={available}
                keyExtractor={(item) => item}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => addBarangay(item)}
                  >
                    <Ionicons name="location-outline" size={18} color="#1a7a4a" />
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
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
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  barangayText: { fontSize: 15, color: "#222", fontWeight: "500" },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#222" },
  modalList: { flexGrow: 0 },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemText: { fontSize: 15, color: "#222" },
  allAdded: { textAlign: "center", color: "#aaa", padding: 24 },
});