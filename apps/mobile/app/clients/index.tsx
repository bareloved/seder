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
import {
  colors,
  fonts,
  spacing,
  borderRadius,
  typography,
  shadows,
  formatCurrency,
  rtlRow,
} from "../../lib/theme";

// ---------------------------------------------------------------------------
// Client screen
// ---------------------------------------------------------------------------

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

  const renderClient = ({ item }: { item: unknown }) => {
    const client = item as {
      id: string;
      name: string;
      totalEarned?: number;
      jobCount?: number;
      isArchived?: boolean;
    };

    const hasEarnings =
      client.totalEarned != null && client.totalEarned > 0;

    return (
      <TouchableOpacity
        style={styles.clientCard}
        onLongPress={() => handleArchive(client.id, client.name)}
        activeOpacity={0.7}
      >
        <View style={styles.clientRow}>
          {client.isArchived ? (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedBadgeText}>ארכיון</Text>
            </View>
          ) : null}

          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{client.name}</Text>
            <View style={styles.clientMeta}>
              {client.totalEarned != null ? (
                <Text
                  style={[
                    styles.metaAmount,
                    hasEarnings && styles.metaAmountPositive,
                  ]}
                >
                  {formatCurrency(client.totalEarned)}
                </Text>
              ) : null}
              {client.jobCount != null ? (
                <Text style={styles.metaJobs}>
                  {client.jobCount} עבודות
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "לקוחות",
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
          <Text style={styles.createLabel}>לקוח חדש</Text>
          <TextInput
            style={[styles.input, { writingDirection: "rtl" }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="שם הלקוח"
            placeholderTextColor={colors.textLight}
            textAlign="right"
          />
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
              {create.isPending ? "יוצר..." : "הוסף לקוח"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Client list */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) => (item as { id: string }).id}
            renderItem={renderClient}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  אין לקוחות עדיין. הוסף את הראשון!
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

  // -- Client list --
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
    gap: spacing.sm,
  },
  clientCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  clientRow: {
    flexDirection: rtlRow,
    alignItems: "center",
    gap: spacing.md,
  },
  clientInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  clientName: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  clientMeta: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaAmount: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontFamily: fonts.numbersSemibold,
  },
  metaAmountPositive: {
    color: colors.success,
  },
  metaJobs: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
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
