import { useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Props {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  showToday?: boolean;
}

export default function DatePickerField({ label, value, onChange, showToday = false }: Props) {
  const [show, setShow] = useState(false);

  function parseDate(str: string): Date {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  function formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function setToday() {
    onChange(formatDate(new Date()));
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
          <Text style={value ? styles.inputText : styles.placeholder}>
            {value || "Tap to select date"}
          </Text>
        </TouchableOpacity>
        {showToday && (
          <TouchableOpacity style={styles.todayBtn} onPress={setToday}>
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {show && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShow(Platform.OS === "ios");
            if (event.type === "set" && selectedDate) {
              onChange(formatDate(selectedDate));
            }
            if (Platform.OS === "android") setShow(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1, backgroundColor: "#fff", borderRadius: 8,
    borderWidth: 1, borderColor: "#ddd", padding: 12,
  },
  inputText: { fontSize: 15, color: "#222" },
  placeholder: { fontSize: 15, color: "#aaa" },
  todayBtn: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8,
    backgroundColor: "#1a7a4a", alignItems: "center", justifyContent: "center",
  },
  todayBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});