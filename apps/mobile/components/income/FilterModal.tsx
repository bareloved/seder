import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type { Category, Client } from "@seder/shared";
import { useCategories } from "../../hooks/useCategories";
import { useClients } from "../../hooks/useClients";
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

export type SortColumn = "date" | "description" | "amount" | "category" | "status";
export type SortDirection = "asc" | "desc";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: string[];
  onCategoryChange: (ids: string[]) => void;
  selectedClient: string; // "all" or client id
  onClientChange: (id: string) => void;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn, direction: SortDirection) => void;
  onApply: () => void;
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { value: SortColumn; label: string }[] = [
  { value: "date", label: "תאריך" },
  { value: "description", label: "תיאור" },
  { value: "amount", label: "סכום" },
  { value: "category", label: "קטגוריה" },
  { value: "status", label: "סטטוס" },
];

// ---------------------------------------------------------------------------
// Category helpers (same as EditIncomeModal)
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

export function FilterModal({
  visible,
  onClose,
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoryChange,
  selectedClient,
  onClientChange,
  sortColumn,
  sortDirection,
  onSort,
  onApply,
}: FilterModalProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const { data: categoriesData } = useCategories();
  const { data: clientsData } = useClients();

  const categories = (categoriesData?.data ?? []).filter((c: Category) => !c.isArchived);
  const clients: Client[] = clientsData?.data ?? [];

  // Dropdown state
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [clientDropdownVisible, setClientDropdownVisible] = useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);

  const [categoryDropdownPos, setCategoryDropdownPos] = useState({ x: 0, y: 0, width: 0 });
  const [clientDropdownPos, setClientDropdownPos] = useState({ x: 0, y: 0, width: 0 });
  const [sortDropdownPos, setSortDropdownPos] = useState({ x: 0, y: 0, width: 0 });

  const categoryButtonRef = useRef<View>(null);
  const clientButtonRef = useRef<View>(null);
  const sortButtonRef = useRef<View>(null);

  // Derived display text
  const categoryLabel =
    selectedCategories.length === 0
      ? "כל הקטגוריות"
      : `${selectedCategories.length} נבחרו`;

  const selectedClientObj = clients.find((c) => c.id === selectedClient);
  const clientLabel = selectedClient === "all" ? "כל הלקוחות" : selectedClientObj?.name ?? "כל הלקוחות";

  const currentSortOption = SORT_OPTIONS.find((o) => o.value === sortColumn);
  const sortLabel = `${currentSortOption?.label ?? "תאריך"} ${sortDirection === "asc" ? "\u2191" : "\u2193"}`;

  // Handlers
  const openDropdown = (
    ref: React.RefObject<View | null>,
    setPos: (pos: { x: number; y: number; width: number }) => void,
    setVisible: (v: boolean) => void,
  ) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setPos({ x, y: y + height + 4, width });
      setVisible(true);
    });
  };

  const toggleCategory = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedCategories.includes(id)) {
      onCategoryChange(selectedCategories.filter((c) => c !== id));
    } else {
      onCategoryChange([...selectedCategories, id]);
    }
  };

  const selectClient = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClientChange(id);
    setClientDropdownVisible(false);
  };

  const selectSort = (column: SortColumn) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (column === sortColumn) {
      onSort(column, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(column, "desc");
    }
    setSortDropdownVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: c.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Text style={[styles.headerTitle, { color: c.text }]}>סינון</Text>
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
            {/* Search */}
            <View style={styles.field}>
              <View style={[styles.searchContainer, { borderColor: c.border, backgroundColor: c.card }]}>
                <SymbolView name="magnifyingglass" tintColor={c.textLight} size={16} />
                <TextInput
                  style={[styles.searchInput, { writingDirection: "rtl" as const, color: c.text }]}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholder="חיפוש..."
                  placeholderTextColor={c.textLight}
                  textAlign="right"
                  clearButtonMode="while-editing"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Categories */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.textMuted }]}>קטגוריות</Text>
              <TouchableOpacity
                ref={categoryButtonRef}
                style={[styles.pickerButton, { borderColor: c.border, backgroundColor: c.card }]}
                onPress={() => openDropdown(categoryButtonRef, setCategoryDropdownPos, setCategoryDropdownVisible)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    { color: c.text },
                    selectedCategories.length === 0 && { color: c.textLight },
                  ]}
                  numberOfLines={1}
                >
                  {categoryLabel}
                </Text>
                <SymbolView name="chevron.down" tintColor={c.textLight} size={12} />
              </TouchableOpacity>
            </View>

            {/* Clients */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.textMuted }]}>לקוחות</Text>
              <TouchableOpacity
                ref={clientButtonRef}
                style={[styles.pickerButton, { borderColor: c.border, backgroundColor: c.card }]}
                onPress={() => openDropdown(clientButtonRef, setClientDropdownPos, setClientDropdownVisible)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    { color: c.text },
                    selectedClient === "all" && { color: c.textLight },
                  ]}
                  numberOfLines={1}
                >
                  {clientLabel}
                </Text>
                <SymbolView name="chevron.down" tintColor={c.textLight} size={12} />
              </TouchableOpacity>
            </View>

            {/* Sort */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.textMuted }]}>מיון</Text>
              <TouchableOpacity
                ref={sortButtonRef}
                style={[styles.pickerButton, { borderColor: c.border, backgroundColor: c.card }]}
                onPress={() => openDropdown(sortButtonRef, setSortDropdownPos, setSortDropdownVisible)}
              >
                <Text style={[styles.pickerText, { color: c.text }]} numberOfLines={1}>
                  {sortLabel}
                </Text>
                <SymbolView name="chevron.down" tintColor={c.textLight} size={12} />
              </TouchableOpacity>
            </View>

            {/* Apply */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onApply();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.applyButtonText}>החל</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Category Dropdown (multi-select) */}
      <Modal
        visible={categoryDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setCategoryDropdownVisible(false)}
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
              {categories.map((cat: Category) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.dropdownItem, isSelected && { backgroundColor: c.brandLight }]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <View style={styles.dropdownItemContent}>
                      <SymbolView
                        name={getCategoryIconName(cat.icon) as any}
                        tintColor={getCategoryColor(cat.color)}
                        size={18}
                      />
                      <Text style={[styles.dropdownItemText, { color: c.text }]}>{cat.name}</Text>
                    </View>
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

      {/* Client Dropdown (single-select) */}
      <Modal
        visible={clientDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClientDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setClientDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownCard,
              {
                position: "absolute",
                top: clientDropdownPos.y,
                left: clientDropdownPos.x,
                minWidth: clientDropdownPos.width,
                backgroundColor: c.card,
                borderColor: c.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={styles.dropdownList} bounces={false}>
              <TouchableOpacity
                style={[styles.dropdownItem, selectedClient === "all" && { backgroundColor: c.brandLight }]}
                onPress={() => selectClient("all")}
              >
                <Text style={[styles.dropdownItemText, { color: c.text }]}>כל הלקוחות</Text>
                {selectedClient === "all" && (
                  <SymbolView name="checkmark" tintColor={colors.brand} size={16} />
                )}
              </TouchableOpacity>
              {clients.map((client) => {
                const isSelected = selectedClient === client.id;
                return (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.dropdownItem, isSelected && { backgroundColor: c.brandLight }]}
                    onPress={() => selectClient(client.id)}
                  >
                    <Text style={[styles.dropdownItemText, { color: c.text }]}>{client.name}</Text>
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

      {/* Sort Dropdown */}
      <Modal
        visible={sortDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setSortDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownCard,
              {
                position: "absolute",
                top: sortDropdownPos.y,
                left: sortDropdownPos.x,
                minWidth: sortDropdownPos.width,
                backgroundColor: c.card,
                borderColor: c.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={styles.dropdownList} bounces={false}>
              {SORT_OPTIONS.map((opt) => {
                const isActive = sortColumn === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropdownItem, isActive && { backgroundColor: c.brandLight }]}
                    onPress={() => selectSort(opt.value)}
                  >
                    <Text style={[styles.dropdownItemText, { color: c.text }]}>{opt.label}</Text>
                    {isActive && (
                      <Text style={styles.sortArrow}>
                        {sortDirection === "asc" ? "\u2191" : "\u2193"}
                      </Text>
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
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    maxHeight: "80%",
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
  field: {},
  label: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: spacing.xs + 2,
  },

  // Search
  searchContainer: {
    flexDirection: rtlRow,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    minHeight: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: spacing.md,
  },

  // Picker button
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
  pickerTextMuted: {
    color: colors.textLight,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  // Apply button
  applyButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  applyButtonText: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.white,
  },

  // Dropdown
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dropdownItemSelected: {
    backgroundColor: colors.brandLight,
  },
  dropdownItemContent: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  dropdownItemText: {
    fontSize: typography.lg,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: "right",
  },
  sortArrow: {
    fontSize: typography.lg,
    fontFamily: fonts.numbersMedium,
    color: colors.brand,
  },
});
