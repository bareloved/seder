import { useState, useEffect, useRef } from "react";
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
import type { Category, Client } from "@seder/shared";
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
} from "../../lib/theme";
import { useDarkMode } from "../../providers/DarkModeProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddIncomeModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEBREW_WEEKDAYS_SHORT = ["\u05D0\u05F3", "\u05D1\u05F3", "\u05D2\u05F3", "\u05D3\u05F3", "\u05D4\u05F3", "\u05D5\u05F3", "\u05E9\u05F3"];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
// Category helpers (shared with EditIncomeModal)
// ---------------------------------------------------------------------------

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
// Component
// ---------------------------------------------------------------------------

export function AddIncomeModal({ visible, onClose, onSaved }: AddIncomeModalProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const { data: categoriesData } = useCategories();
  const { data: clientsData } = useClients();
  const { create } = useIncomeMutations();

  // Form state
  const [date, setDate] = useState(todayISO);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amountGross, setAmountGross] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Picker visibility
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryDropdownPos, setCategoryDropdownPos] = useState({ x: 0, y: 0, width: 0 });
  const categoryButtonRef = useRef<View>(null);

  // Date picker
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const categories = (categoriesData?.data ?? []).filter((c: Category) => !c.isArchived);
  const clients: Client[] = clientsData?.data ?? [];
  const selectedCategory = categories.find((c: Category) => c.id === categoryId);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setDate(todayISO());
      setClientName("");
      setClientId(null);
      setDescription("");
      setAmountGross("");
      setCategoryId(null);
      setNotes("");
    }
  }, [visible]);

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // Build days for current month of selected date
  function getDaysInMonth() {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const day = i + 1;
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!description.trim()) {
      Alert.alert("שגיאה", "יש להזין תיאור עבודה");
      return;
    }
    const amount = parseFloat(amountGross) || 0;
    if (amount <= 0) {
      Alert.alert("שגיאה", "יש להזין סכום");
      return;
    }
    try {
      await create.mutateAsync({
        date,
        description: description.trim(),
        clientName,
        clientId: clientId ?? undefined,
        amountGross: amount,
        amountPaid: 0,
        vatRate: 18,
        includesVat: true,
        invoiceStatus: "draft",
        paymentStatus: "unpaid",
        categoryId: categoryId ?? undefined,
        notes: notes || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      onClose();
    } catch {
      Alert.alert("שגיאה", "לא ניתן ליצור הכנסה חדשה");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContainer, { backgroundColor: c.card }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: c.border }]}>
              <Text style={[styles.headerTitle, { color: c.text }]}>עבודה חדשה</Text>
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
                  <TouchableOpacity
                    style={[styles.dateDisplay, { borderColor: c.border, backgroundColor: c.card }]}
                    onPress={() => setDatePickerVisible(true)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.dateText, { color: c.text }]}>{formatDateDisplay(date)}</Text>
                  </TouchableOpacity>
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
                  onChangeText={setDescription}
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
                      onChangeText={(t) => setAmountGross(t.replace(/[^0-9]/g, ""))}
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
                  onChangeText={setNotes}
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
              <TouchableOpacity
                style={[styles.actionButton, styles.createButton]}
                onPress={handleCreate}
                disabled={create.isPending}
                activeOpacity={0.8}
              >
                {create.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <View style={styles.actionButtonContent}>
                    <SymbolView name="plus" tintColor={colors.white} size={16} />
                    <Text style={styles.actionButtonText}>הוסף עבודה</Text>
                  </View>
                )}
              </TouchableOpacity>

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
                    setCategoryPickerVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <SymbolView
                    name={getCategoryIconName(cat.icon) as any}
                    tintColor={getCategoryColor(cat.color)}
                    size={18}
                  />
                  <Text style={[styles.dropdownItemText, { color: c.text }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View style={[styles.datePickerCard, { backgroundColor: c.card }]}>
            {/* Month nav */}
            <View style={[styles.datePickerHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => shiftDate(-30)} hitSlop={8}>
                <SymbolView name="chevron.right" tintColor={c.textMuted} size={14} />
              </TouchableOpacity>
              <Text style={[styles.datePickerMonth, { color: c.text }]}>
                {(() => {
                  const d = new Date(date);
                  const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
                  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
                })()}
              </Text>
              <TouchableOpacity onPress={() => shiftDate(30)} hitSlop={8}>
                <SymbolView name="chevron.left" tintColor={c.textMuted} size={14} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.datePickerList} showsVerticalScrollIndicator={false}>
              {getDaysInMonth().map((dayStr) => {
                const isSelected = dayStr === date;
                const d = new Date(dayStr);
                const dayLabel = `${HEBREW_WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}`;
                return (
                  <TouchableOpacity
                    key={dayStr}
                    style={[styles.datePickerItem, isSelected && { backgroundColor: c.brandLight }]}
                    onPress={() => {
                      setDate(dayStr);
                      setDatePickerVisible(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.datePickerItemText, { color: c.text }, isSelected && styles.datePickerItemTextSelected]}>
                      {dayLabel}
                    </Text>
                    {isSelected && (
                      <SymbolView name="checkmark" tintColor={colors.brand} size={16} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles — matches EditIncomeModal exactly
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
    backgroundColor: colors.white,
    justifyContent: "center",
  },
  dateText: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    textAlign: "right",
  },

  // Category chip inline
  categoryChipInline: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: 6,
    flex: 1,
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
  createButton: {
    backgroundColor: colors.brand,
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

  // Date picker
  datePickerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: "100%",
    maxHeight: 400,
    ...shadows.lg,
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  datePickerMonth: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  datePickerList: {
    paddingVertical: spacing.sm,
  },
  datePickerItem: {
    flexDirection: rtlRow,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  datePickerItemSelected: {
    backgroundColor: colors.brandLight,
  },
  datePickerItemText: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersRegular,
    color: colors.text,
    textAlign: "right",
  },
  datePickerItemTextSelected: {
    fontFamily: fonts.numbersSemibold,
    color: colors.brand,
  },
});
