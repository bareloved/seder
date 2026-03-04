import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type { IncomeEntry, Category, Client } from "@seder/shared";
import { useCategories } from "../../hooks/useCategories";
import { useClients } from "../../hooks/useClients";
import { useIncomeMutations } from "../../hooks/useIncomeMutations";
import {
  colors,
  darkColors,
  spacing,
  borderRadius,
  typography,
  fonts,
  shadows,
  rtlRow,
  rtlRowReverse,
} from "../../lib/theme";
import { useDarkMode } from "../../providers/DarkModeProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditIncomeModalProps {
  entry: IncomeEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

type DisplayStatus = "שולם" | "נשלחה" | "בוצע" | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEBREW_WEEKDAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function getDisplayStatus(entry: IncomeEntry): DisplayStatus {
  if (entry.paymentStatus === "paid" || entry.invoiceStatus === "paid") {
    return "שולם";
  }
  if (entry.invoiceStatus === "sent") {
    return "נשלחה";
  }
  const d = new Date(entry.date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) return null;
  return "בוצע";
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  const weekday = HEBREW_WEEKDAYS_SHORT[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(2);
  return `${weekday}, ${day}.${month}.${year}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditIncomeModal({ entry, onClose, onSaved }: EditIncomeModalProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const { data: categoriesData } = useCategories();
  const { data: clientsData } = useClients();
  const { update, markPaid, markSent } = useIncomeMutations();

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amountGross, setAmountGross] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Picker visibility
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryDropdownPos, setCategoryDropdownPos] = useState({ x: 0, y: 0, width: 0 });
  const categoryButtonRef = useRef<View>(null);

  const categories = (categoriesData?.data ?? []).filter((c: Category) => !c.isArchived);
  const clients: Client[] = clientsData?.data ?? [];
  const selectedCategory = categories.find((c: Category) => c.id === categoryId);

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setClientName(entry.clientName ?? "");
      setClientId(entry.clientId ?? null);
      setDescription(entry.description ?? "");
      setAmountGross(entry.amountGross ? String(Math.round(entry.amountGross)) : "");
      setCategoryId(entry.categoryId ?? null);
      setNotes(entry.notes ?? "");
      setIsDirty(false);
    }
  }, [entry]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const displayStatus = entry ? getDisplayStatus(entry) : null;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    if (!entry) return;
    try {
      await update.mutateAsync({
        id: entry.id,
        data: {
          clientName,
          clientId,
          description,
          amountGross: parseFloat(amountGross) || 0,
          categoryId,
          notes: notes || null,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      onClose();
    } catch {
      Alert.alert("שגיאה", "לא ניתן לשמור את השינויים");
    }
  };

  const handleMarkSent = async () => {
    if (!entry) return;
    try {
      await markSent.mutateAsync(entry.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      onClose();
    } catch {
      Alert.alert("שגיאה", "לא ניתן לעדכן סטטוס");
    }
  };

  const handleMarkPaid = async () => {
    if (!entry) return;
    try {
      await markPaid.mutateAsync(entry.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      onClose();
    } catch {
      Alert.alert("שגיאה", "לא ניתן לעדכן סטטוס");
    }
  };

  const isSaving = update.isPending || markPaid.isPending || markSent.isPending;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={entry !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContainer, { backgroundColor: c.card }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: c.border }]}>
              <Text style={[styles.headerTitle, { color: c.text }]}>פרטי עבודה</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <SymbolView name="xmark" tintColor={c.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Row 1: Client + Date */}
              <View style={styles.row}>
                {/* Client */}
                <View style={styles.fieldHalf}>
                  <View style={styles.labelRow}>
                    <SymbolView name="person" tintColor={c.textMuted} size={14} />
                    <Text style={[styles.label, { color: c.textMuted }]}>לקוח</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pickerButton, { borderColor: c.border, backgroundColor: c.card }]}
                    onPress={() => setClientPickerVisible(true)}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        { color: c.text },
                        !clientName && { color: c.textLight },
                      ]}
                      numberOfLines={1}
                    >
                      {clientName || "בחר לקוח"}
                    </Text>
                    <SymbolView name="chevron.down" tintColor={c.textLight} size={12} />
                  </TouchableOpacity>
                </View>

                {/* Date */}
                <View style={styles.fieldHalf}>
                  <View style={styles.labelRow}>
                    <SymbolView name="calendar" tintColor={c.textMuted} size={14} />
                    <Text style={[styles.label, { color: c.textMuted }]}>תאריך</Text>
                  </View>
                  <View style={[styles.dateDisplay, { borderColor: c.border, backgroundColor: c.backgroundTertiary }]}>
                    <Text style={[styles.dateText, { color: c.textSecondary }]}>
                      {entry ? formatDateDisplay(entry.date) : ""}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Row 2: Description */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <SymbolView name="doc.text" tintColor={c.textMuted} size={14} />
                  <Text style={[styles.label, { color: c.textMuted }]}>תיאור עבודה</Text>
                </View>
                <TextInput
                  style={[styles.input, { writingDirection: "rtl" as const, borderColor: c.border, backgroundColor: c.card, color: c.text }]}
                  value={description}
                  onChangeText={(t) => { setDescription(t); markDirty(); }}
                  placeholder="תיאור העבודה"
                  placeholderTextColor={c.textLight}
                  textAlign="right"
                />
              </View>

              {/* Row 3: Amount + Category */}
              <View style={styles.row}>
                {/* Amount */}
                <View style={styles.fieldHalf}>
                  <View style={styles.labelRow}>
                    <SymbolView name="creditcard" tintColor={c.textMuted} size={14} />
                    <Text style={[styles.label, { color: c.textMuted }]}>סכום</Text>
                  </View>
                  <View style={[styles.amountContainer, { borderColor: c.border, backgroundColor: c.card }]}>
                    <Text style={[styles.currencySymbol, { color: c.textLight }]}>₪</Text>
                    <TextInput
                      style={[styles.amountInput, { color: c.text }]}
                      value={amountGross}
                      onChangeText={(t) => { setAmountGross(t.replace(/[^0-9]/g, "")); markDirty(); }}
                      placeholder="0"
                      placeholderTextColor={c.textLight}
                      keyboardType="number-pad"
                      textAlign="right"
                      selectTextOnFocus
                    />
                  </View>
                </View>

                {/* Category */}
                <View style={styles.fieldHalf}>
                  <View style={styles.labelRow}>
                    <SymbolView name="tag" tintColor={c.textMuted} size={14} />
                    <Text style={[styles.label, { color: c.textMuted }]}>קטגוריה</Text>
                  </View>
                  <TouchableOpacity
                    ref={categoryButtonRef}
                    style={[styles.pickerButton, { borderColor: c.border, backgroundColor: c.card }]}
                    onPress={() => {
                      categoryButtonRef.current?.measureInWindow((x, y, width, height) => {
                        setCategoryDropdownPos({ x, y: y + height + 4, width });
                        setCategoryPickerVisible(true);
                      });
                    }}
                  >
                    {selectedCategory ? (
                      <View style={styles.categoryChipInline}>
                        <SymbolView
                          name={getCategoryIconName(selectedCategory.icon) as any}
                          tintColor={getCategoryColor(selectedCategory.color)}
                          size={16}
                        />
                        <Text style={[styles.pickerText, { color: c.text }]} numberOfLines={1}>
                          {selectedCategory.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.placeholderText, { color: c.textLight }]}>בחר קטגוריה</Text>
                    )}
                    <SymbolView name="chevron.down" tintColor={c.textLight} size={12} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 4: Notes */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <SymbolView name="note.text" tintColor={c.textMuted} size={14} />
                  <Text style={[styles.label, { color: c.textMuted }]}>הערות</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.notesInput, { writingDirection: "rtl" as const, borderColor: c.border, backgroundColor: c.card, color: c.text }]}
                  value={notes}
                  onChangeText={(t) => { setNotes(t); markDirty(); }}
                  placeholder="הערות נוספות..."
                  placeholderTextColor={c.textLight}
                  textAlign="right"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: c.border }]}>
              {/* Dynamic action button */}
              {isDirty ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.actionButtonText}>שמור שינויים</Text>
                  )}
                </TouchableOpacity>
              ) : displayStatus === "בוצע" ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.invoiceButton]}
                  onPress={handleMarkSent}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <View style={styles.actionButtonContent}>
                      <SymbolView name="doc.text" tintColor={colors.white} size={16} />
                      <Text style={styles.actionButtonText}>שלחתי חשבונית</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : displayStatus === "נשלחה" ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.paidButton]}
                  onPress={handleMarkPaid}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <View style={styles.actionButtonContent}>
                      <SymbolView name="checkmark" tintColor={colors.white} size={16} />
                      <Text style={styles.actionButtonText}>התקבל תשלום</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeButtonText, { color: c.textMuted }]}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Client Picker Modal */}
      <Modal
        visible={clientPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClientPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setClientPickerVisible(false)}
        >
          <View style={[styles.pickerCard, { backgroundColor: c.card }]}>
            <Text style={[styles.pickerTitle, { color: c.text, borderBottomColor: c.border }]}>בחר לקוח</Text>
            <ScrollView style={styles.pickerList}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.pickerItem,
                    clientId === client.id && { backgroundColor: c.brandLight },
                  ]}
                  onPress={() => {
                    setClientId(client.id);
                    setClientName(client.name);
                    markDirty();
                    setClientPickerVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: c.text },
                      clientId === client.id && styles.pickerItemTextSelected,
                    ]}
                  >
                    {client.name}
                  </Text>
                  {clientId === client.id && (
                    <SymbolView name="checkmark" tintColor={colors.brand} size={16} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Dropdown */}
      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setCategoryPickerVisible(false)}
        >
          <View
            style={[
              styles.dropdownCard,
              {
                position: "absolute",
                top: categoryDropdownPos.y,
                left: categoryDropdownPos.x,
                minWidth: categoryDropdownPos.width,
                backgroundColor: c.card,
                borderColor: c.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={styles.dropdownList} bounces={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCategoryId(cat.id);
                    markDirty();
                    setCategoryPickerVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <SymbolView
                    name={getCategoryIconName(cat.icon) as any}
                    tintColor={getCategoryColor(cat.color)}
                    size={18}
                  />
                  <Text style={[styles.dropdownItemText, { color: c.text }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Category color helper
// ---------------------------------------------------------------------------

// Lucide icon name → SF Symbol name
const CATEGORY_ICON_MAP: Record<string, string> = {
  Sparkles: "sparkles",
  SlidersHorizontal: "slider.horizontal.3",
  Mic2: "mic",
  BookOpen: "book",
  Layers: "square.3.layers.3d",
  Circle: "circle",
  Music: "music.note",
  Headphones: "headphones",
  Guitar: "guitars",
  Piano: "pianokeys",
  Drum: "drum.fill",
  Radio: "radio",
  Video: "video",
  Camera: "camera",
  Briefcase: "briefcase",
  GraduationCap: "graduationcap",
  Users: "person.2",
  Calendar: "calendar",
  Star: "star",
  Heart: "heart",
  Zap: "bolt",
  Trophy: "trophy",
};

function getCategoryIconName(lucideIcon?: string | null): string {
  if (!lucideIcon) return "circle";
  return CATEGORY_ICON_MAP[lucideIcon] ?? "circle";
}

const CATEGORY_COLORS: Record<string, string> = {
  emerald: colors.emerald,
  indigo: colors.indigo,
  sky: colors.sky,
  amber: colors.amber,
  purple: colors.purple,
  rose: colors.rose,
  slate: colors.slate,
  blue: "#3b82f6",
  teal: "#14b8a6",
  orange: "#f97316",
  pink: "#ec4899",
  cyan: "#06b6d4",
};

function getCategoryColor(color: string): string {
  return CATEGORY_COLORS[color] ?? colors.slate;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  keyboardView: {
    justifyContent: "center",
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    maxHeight: "100%",
    ...shadows.lg,
  },

  // Header
  header: {
    flexDirection: rtlRow,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontFamily: fonts.bold,
    color: colors.text,
  },

  // Body
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },

  // Fields
  row: {
    flexDirection: rtlRow,
    gap: spacing.md,
  },
  fieldHalf: {
    flex: 1,
  },
  field: {},
  labelRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs + 2,
  },
  label: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: spacing.md,
  },

  // Amount
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  amountInput: {
    flex: 1,
    fontSize: typography.lg,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    paddingVertical: spacing.md,
    textAlign: "right",
  },
  currencySymbol: {
    fontSize: typography.base,
    fontFamily: fonts.numbersMedium,
    color: colors.textLight,
    marginRight: spacing.sm,
  },

  // Pickers
  pickerButton: {
    flexDirection: rtlRow,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: colors.white,
  },
  pickerText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  placeholderText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.textLight,
    flex: 1,
    textAlign: "right",
  },

  // Date
  dateDisplay: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
  },
  dateText: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersRegular,
    color: colors.textSecondary,
    textAlign: "right",
  },

  // Category chip inline
  categoryChipInline: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Footer
  footer: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  actionButtonContent: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.white,
  },
  saveButton: {
    backgroundColor: "#1e293b", // slate-900
  },
  invoiceButton: {
    backgroundColor: "#3b82f6", // blue-500
  },
  paidButton: {
    backgroundColor: "#10b981", // emerald-500
  },
  closeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  closeButtonText: {
    fontSize: typography.lg,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },

  // Category dropdown
  dropdownOverlay: {
    flex: 1,
  },
  dropdownCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    ...shadows.lg,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dropdownItemText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
  },

  // Picker modals
  pickerOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["3xl"],
  },
  pickerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: "100%",
    maxHeight: 400,
    ...shadows.lg,
  },
  pickerTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: "right",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerList: {
    paddingVertical: spacing.sm,
  },
  pickerItem: {
    flexDirection: rtlRow,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  pickerItemSelected: {
    backgroundColor: colors.brandLight,
  },
  pickerItemText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: "right",
  },
  pickerItemTextSelected: {
    fontFamily: fonts.semibold,
    color: colors.brand,
  },
});
