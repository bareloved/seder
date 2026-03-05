import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCategories, useCategoryMutations } from "../../hooks/useCategories";
import type { CategoryColor } from "@seder/shared";
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
  rtlRow,
} from "../../lib/theme";

// ---------------------------------------------------------------------------
// Color palette for categories
// ---------------------------------------------------------------------------

const CATEGORY_COLORS = [
  { name: "emerald", hex: colors.emerald },
  { name: "indigo", hex: colors.indigo },
  { name: "sky", hex: colors.sky },
  { name: "amber", hex: colors.amber },
  { name: "purple", hex: colors.purple },
  { name: "rose", hex: colors.rose },
  { name: "slate", hex: colors.slate },
];

const COLOR_CIRCLE_SIZE = 32;

// ---------------------------------------------------------------------------
// Category screen
// ---------------------------------------------------------------------------

export default function CategoriesScreen() {
  const { data, isLoading } = useCategories();
  const { create, archive } = useCategoryMutations();
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState<CategoryColor>("emerald");

  const categories = data?.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם קטגוריה");
      return;
    }
    try {
      await create.mutateAsync({ name: newName.trim(), color: selectedColor, icon: "Circle" });
      setNewName("");
    } catch {
      Alert.alert("שגיאה", "לא ניתן ליצור קטגוריה");
    }
  };

  const handleArchive = (id: string, name: string) => {
    Alert.alert("ארכיון", `להעביר את "${name}" לארכיון?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "ארכיון",
        onPress: () => archive.mutateAsync(id),
      },
    ]);
  };

  const renderCategory = ({ item }: { item: unknown }) => {
    const cat = item as {
      id: string;
      name: string;
      color: string;
      isArchived?: boolean;
    };
    const colorHex =
      CATEGORY_COLORS.find((c) => c.name === cat.color)?.hex ?? colors.slate;

    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onLongPress={() => handleArchive(cat.id, cat.name)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryRow}>
          <SymbolView name="line.3.horizontal" tintColor={colors.textLight} size={16} />
          {cat.isArchived ? (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedBadgeText}>ארכיון</Text>
            </View>
          ) : null}
          <View style={styles.categorySpacer} />
          <View style={styles.categoryNameRow}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <View
              style={[styles.categoryDot, { backgroundColor: colorHex }]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "קטגוריות",
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontFamily: fonts.semibold,
            fontSize: typography.lg,
            color: colors.text,
          },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.screen}>
        {/* Create section */}
        <View style={styles.createCard}>
          <Text style={styles.createLabel}>קטגוריה חדשה</Text>
          <TextInput
            style={[styles.input, { writingDirection: "rtl" }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="שם הקטגוריה"
            placeholderTextColor={colors.textLight}
            textAlign="right"
          />

          {/* Color picker */}
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                onPress={() => setSelectedColor(c.name as CategoryColor)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.hex },
                    selectedColor === c.name && styles.colorSelected,
                  ]}
                >
                  {selectedColor === c.name ? (
                    <SymbolView name="checkmark" tintColor={colors.white} size={14} />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Create button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              create.isPending && styles.buttonDisabled,
            ]}
            onPress={handleCreate}
            disabled={create.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>
              {create.isPending ? "יוצר..." : "הוסף קטגוריה"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category list */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => (item as { id: string }).id}
            renderItem={renderCategory}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  אין קטגוריות עדיין. צור את הראשונה!
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },

  // -- Create section --
  createCard: {
    backgroundColor: colors.card,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  },
  createLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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

  // -- Color picker --
  colorRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  colorCircle: {
    width: COLOR_CIRCLE_SIZE,
    height: COLOR_CIRCLE_SIZE,
    borderRadius: COLOR_CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: colors.brand,
    width: COLOR_CIRCLE_SIZE + 2,
    height: COLOR_CIRCLE_SIZE + 2,
    borderRadius: (COLOR_CIRCLE_SIZE + 2) / 2,
  },

  // -- Create button --
  createButton: {
    backgroundColor: colors.brand,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.white,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },

  // -- Category list --
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
    gap: spacing.sm,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  categoryRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.md,
  },
  categorySpacer: {
    flex: 1,
  },
  categoryNameRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
  },

  // -- Archive badge --
  archivedBadge: {
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  archivedBadgeText: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },

  // -- Loading / Empty --
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingTop: spacing["5xl"],
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
});
