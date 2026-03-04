import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import type { IncomeEntry } from "@seder/shared";
import { useCategories } from "../../hooks/useCategories";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  sharedStyles,
  rtlRow,
  getInvoiceStatusStyle,
  getPaymentStatusStyle,
} from "../../lib/theme";

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
  categoryId?: string;
  notes: string;
}

const INVOICE_STATUSES = ["draft", "sent", "paid", "cancelled"] as const;
const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  emerald: "#10b981",
  indigo: "#6366f1",
  sky: "#0ea5e9",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#64748b",
};

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
  const [invoiceStatus, setInvoiceStatus] = useState(
    initialData?.invoiceStatus ?? "draft"
  );
  const [paymentStatus, setPaymentStatus] = useState(
    initialData?.paymentStatus ?? "unpaid"
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    initialData?.categoryId ?? undefined
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const { data: categoriesData } = useCategories();
  const categories = (categoriesData?.data ?? []) as Array<{
    id: string;
    name: string;
    color: string;
    isArchived?: boolean;
  }>;
  const activeCategories = categories.filter((c) => !c.isArchived);

  // Focus state tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getInputStyle = useCallback(
    (field: string) => [
      styles.input,
      focusedField === field && styles.inputFocused,
    ],
    [focusedField]
  );

  const handleSubmit = () => {
    onSubmit({
      date,
      description,
      clientName,
      amountGross: parseFloat(amountGross) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      vatRate: parseFloat(vatRate) || 18,
      includesVat,
      invoiceStatus,
      paymentStatus,
      categoryId,
      notes,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Date section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>פרטי הכנסה</Text>
        <View style={styles.separator} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>תאריך</Text>
          <TextInput
            style={getInputStyle("date")}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textLight}
            textAlign="left"
            onFocus={() => setFocusedField("date")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>תיאור</Text>
          <TextInput
            style={[...getInputStyle("description"), styles.rtlInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="למשל: הופעה בברברס"
            placeholderTextColor={colors.textLight}
            textAlign="right"
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>לקוח</Text>
          <TextInput
            style={[...getInputStyle("clientName"), styles.rtlInput]}
            value={clientName}
            onChangeText={setClientName}
            placeholder="שם הלקוח"
            placeholderTextColor={colors.textLight}
            textAlign="right"
            onFocus={() => setFocusedField("clientName")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* Category selector */}
        {activeCategories.length > 0 ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>קטגוריה</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {/* "None" chip */}
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !categoryId && styles.categoryChipSelected,
                ]}
                onPress={() => setCategoryId(undefined)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    !categoryId && styles.categoryChipTextSelected,
                  ]}
                >
                  ללא
                </Text>
              </TouchableOpacity>
              {activeCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                const colorHex = CATEGORY_COLORS[cat.color] ?? colors.slate;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategoryId(cat.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.categoryDot, { backgroundColor: colorHex }]}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {/* Financial section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סכומים</Text>
        <View style={styles.separator} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>סכום ברוטו (₪)</Text>
          <TextInput
            style={[...getInputStyle("amountGross"), styles.numberInput]}
            value={amountGross}
            onChangeText={setAmountGross}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            textAlign="left"
            onFocus={() => setFocusedField("amountGross")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>סכום ששולם (₪)</Text>
          <TextInput
            style={[...getInputStyle("amountPaid"), styles.numberInput]}
            value={amountPaid}
            onChangeText={setAmountPaid}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            textAlign="left"
            onFocus={() => setFocusedField("amountPaid")}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      {/* Status section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סטטוס</Text>
        <View style={styles.separator} />

        {/* Invoice status selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>סטטוס חשבונית</Text>
          <View style={styles.segmentedControl}>
            {INVOICE_STATUSES.map((status) => {
              const style = getInvoiceStatusStyle(status);
              const isSelected = invoiceStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.segment,
                    isSelected && { backgroundColor: style.bg },
                  ]}
                  onPress={() => setInvoiceStatus(status)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isSelected && { color: style.text },
                    ]}
                  >
                    {style.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Payment status selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>סטטוס תשלום</Text>
          <View style={styles.segmentedControl}>
            {PAYMENT_STATUSES.map((status) => {
              const style = getPaymentStatusStyle(status);
              const isSelected = paymentStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.segment,
                    isSelected && { backgroundColor: style.bg },
                  ]}
                  onPress={() => setPaymentStatus(status)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isSelected && { color: style.text },
                    ]}
                  >
                    {style.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* VAT section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>מע״מ</Text>
        <View style={styles.separator} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>אחוז מע״מ</Text>
          <TextInput
            style={[...getInputStyle("vatRate"), styles.numberInput]}
            value={vatRate}
            onChangeText={setVatRate}
            placeholder="18"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            textAlign="left"
            onFocus={() => setFocusedField("vatRate")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <View style={styles.switchRow}>
          <Switch
            value={includesVat}
            onValueChange={setIncludesVat}
            trackColor={{
              false: colors.borderDark,
              true: colors.brand,
            }}
            thumbColor={colors.white}
          />
          <Text style={styles.switchLabel}>כולל מע״מ</Text>
        </View>
      </View>

      {/* Notes section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>הערות</Text>
        <View style={styles.separator} />

        <View style={styles.fieldGroup}>
          <TextInput
            style={[
              ...getInputStyle("notes"),
              styles.rtlInput,
              styles.multilineInput,
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="הערות נוספות..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
            onFocus={() => setFocusedField("notes")}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.submitText}>
            {initialData ? "עדכון" : "הוסף הכנסה"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing["5xl"],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 44,
  },
  numberInput: {
    fontFamily: fonts.numbersRegular,
  },
  inputFocused: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  rtlInput: {
    writingDirection: "rtl",
  },
  multilineInput: {
    minHeight: 88,
    paddingTop: spacing.md,
  },

  // Category selector
  categoryRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    flexDirection: rtlRow,
    alignItems: "center",
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  categoryChipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryChipText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.brandDark,
    fontFamily: fonts.semibold,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: rtlRow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: colors.border,
  },
  segmentText: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },

  // Switch
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  switchLabel: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.brand,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: spacing.sm,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.white,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
});
