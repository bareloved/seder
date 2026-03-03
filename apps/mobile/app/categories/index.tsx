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
import { useCategories, useCategoryMutations } from "../../hooks/useCategories";

const COLORS = [
  { name: "emerald", hex: "#10b981" },
  { name: "indigo", hex: "#6366f1" },
  { name: "sky", hex: "#0ea5e9" },
  { name: "amber", hex: "#f59e0b" },
  { name: "purple", hex: "#a855f7" },
  { name: "rose", hex: "#f43f5e" },
  { name: "slate", hex: "#64748b" },
];

export default function CategoriesScreen() {
  const { data, isLoading, refetch } = useCategories();
  const { create, archive } = useCategoryMutations();
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState("emerald");

  const categories = data?.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם קטגוריה");
      return;
    }
    try {
      await create.mutateAsync({ name: newName.trim(), color: selectedColor });
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

  return (
    <>
      <Stack.Screen options={{ title: "קטגוריות" }} />
      <View style={styles.container}>
        <View style={styles.createSection}>
          <TextInput
            style={[styles.input, styles.rtlInput]}
            value={newName}
            onChangeText={setNewName}
            placeholder="שם הקטגוריה"
            textAlign="right"
          />
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.hex },
                  selectedColor === c.name && styles.colorSelected,
                ]}
                onPress={() => setSelectedColor(c.name)}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.createButton, create.isPending && styles.disabled]}
            onPress={handleCreate}
            disabled={create.isPending}
          >
            <Text style={styles.createButtonText}>הוסף קטגוריה</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => (item as { id: string }).id}
            renderItem={({ item }) => {
              const cat = item as { id: string; name: string; color: string; isArchived?: boolean };
              const colorHex =
                COLORS.find((c) => c.name === cat.color)?.hex ?? "#64748b";
              return (
                <View style={styles.categoryItem}>
                  <TouchableOpacity
                    onLongPress={() => handleArchive(cat.id, cat.name)}
                  >
                    <View style={styles.categoryRow}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: colorHex },
                        ]}
                      />
                      <Text style={styles.categoryName}>{cat.name}</Text>
                      {cat.isArchived ? (
                        <Text style={styles.archivedBadge}>ארכיון</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  createSection: {
    backgroundColor: "#fff",
    padding: 16,
    margin: 12,
    borderRadius: 12,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  rtlInput: {
    writingDirection: "rtl",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#111827",
  },
  createButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  list: {
    paddingBottom: 40,
  },
  categoryItem: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 10,
    padding: 14,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  categoryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  archivedBadge: {
    fontSize: 12,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
