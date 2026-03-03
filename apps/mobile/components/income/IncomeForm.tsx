import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from "react-native";
import type { IncomeEntry } from "@seder/shared";

interface IncomeFormProps {
  initialData?: IncomeEntry;
  onSubmit: (data: IncomeFormData) => void;
  isSubmitting: boolean;
}

export interface IncomeFormData {
  date: string;
  description: string;
  clientName: string;
  amountGross: number;
  amountPaid: number;
  vatRate: number;
  includesVat: boolean;
  invoiceStatus: string;
  paymentStatus: string;
  notes: string;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function IncomeForm({
  initialData,
  onSubmit,
  isSubmitting,
}: IncomeFormProps) {
  const [date, setDate] = useState(initialData?.date ?? today());
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [clientName, setClientName] = useState(
    initialData?.clientName ?? ""
  );
  const [amountGross, setAmountGross] = useState(
    initialData?.amountGross?.toString() ?? ""
  );
  const [amountPaid, setAmountPaid] = useState(
    initialData?.amountPaid?.toString() ?? "0"
  );
  const [vatRate, setVatRate] = useState(
    initialData?.vatRate?.toString() ?? "18"
  );
  const [includesVat, setIncludesVat] = useState(
    initialData?.includesVat ?? true
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const handleSubmit = () => {
    onSubmit({
      date,
      description,
      clientName,
      amountGross: parseFloat(amountGross) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      vatRate: parseFloat(vatRate) || 18,
      includesVat,
      invoiceStatus: initialData?.invoiceStatus ?? "draft",
      paymentStatus: initialData?.paymentStatus ?? "unpaid",
      notes,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>תאריך</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        textAlign="left"
      />

      <Text style={styles.label}>תיאור</Text>
      <TextInput
        style={[styles.input, styles.rtlInput]}
        value={description}
        onChangeText={setDescription}
        placeholder="למשל: הופעה בברברס"
        textAlign="right"
      />

      <Text style={styles.label}>לקוח</Text>
      <TextInput
        style={[styles.input, styles.rtlInput]}
        value={clientName}
        onChangeText={setClientName}
        placeholder="שם הלקוח"
        textAlign="right"
      />

      <Text style={styles.label}>סכום ברוטו (₪)</Text>
      <TextInput
        style={styles.input}
        value={amountGross}
        onChangeText={setAmountGross}
        placeholder="0"
        keyboardType="decimal-pad"
        textAlign="left"
      />

      <Text style={styles.label}>סכום ששולם (₪)</Text>
      <TextInput
        style={styles.input}
        value={amountPaid}
        onChangeText={setAmountPaid}
        placeholder="0"
        keyboardType="decimal-pad"
        textAlign="left"
      />

      <Text style={styles.label}>אחוז מע״מ</Text>
      <TextInput
        style={styles.input}
        value={vatRate}
        onChangeText={setVatRate}
        placeholder="18"
        keyboardType="decimal-pad"
        textAlign="left"
      />

      <View style={styles.switchRow}>
        <Switch
          value={includesVat}
          onValueChange={setIncludesVat}
          trackColor={{ true: "#2563eb" }}
        />
        <Text style={styles.switchLabel}>כולל מע״מ</Text>
      </View>

      <Text style={styles.label}>הערות</Text>
      <TextInput
        style={[styles.input, styles.rtlInput, styles.multilineInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="הערות נוספות..."
        multiline
        numberOfLines={3}
        textAlign="right"
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>
          {isSubmitting
            ? "שומר..."
            : initialData
              ? "עדכון"
              : "הוסף הכנסה"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  rtlInput: {
    writingDirection: "rtl",
  },
  multilineInput: {
    minHeight: 80,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 16,
    gap: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
