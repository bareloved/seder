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
import {
  useClientsWithAnalytics,
  useClientMutations,
} from "../../hooks/useClients";

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

export default function ClientsScreen() {
  const { data, isLoading } = useClientsWithAnalytics();
  const { create, archive } = useClientMutations();
  const [newName, setNewName] = useState("");

  const clients = data?.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם לקוח");
      return;
    }
    try {
      await create.mutateAsync({ name: newName.trim() });
      setNewName("");
    } catch {
      Alert.alert("שגיאה", "לא ניתן ליצור לקוח");
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
      <Stack.Screen options={{ title: "לקוחות" }} />
      <View style={styles.container}>
        <View style={styles.createSection}>
          <TextInput
            style={[styles.input, styles.rtlInput]}
            value={newName}
            onChangeText={setNewName}
            placeholder="שם הלקוח"
            textAlign="right"
          />
          <TouchableOpacity
            style={[styles.createButton, create.isPending && styles.disabled]}
            onPress={handleCreate}
            disabled={create.isPending}
          >
            <Text style={styles.createButtonText}>הוסף לקוח</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#2563eb"
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) =>
              (item as { id: string }).id
            }
            renderItem={({ item }) => {
              const client = item as {
                id: string;
                name: string;
                totalEarned?: number;
                jobCount?: number;
                isArchived?: boolean;
              };
              return (
                <TouchableOpacity
                  style={styles.clientItem}
                  onLongPress={() => handleArchive(client.id, client.name)}
                >
                  <View style={styles.clientRow}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <View style={styles.clientMeta}>
                        {client.totalEarned != null ? (
                          <Text style={styles.metaText}>
                            {formatCurrency(client.totalEarned)}
                          </Text>
                        ) : null}
                        {client.jobCount != null ? (
                          <Text style={styles.metaText}>
                            {client.jobCount} עבודות
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {client.isArchived ? (
                      <Text style={styles.archivedBadge}>ארכיון</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>אין לקוחות</Text>
              </View>
            }
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
  clientItem: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 10,
    padding: 14,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  clientInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  clientMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#6b7280",
  },
  archivedBadge: {
    fontSize: 12,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginStart: 10,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
});
