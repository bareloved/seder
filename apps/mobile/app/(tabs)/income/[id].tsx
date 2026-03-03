import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../providers/ApiProvider";
import { useIncomeMutations } from "../../../hooks/useIncomeMutations";
import {
  IncomeForm,
  type IncomeFormData,
} from "../../../components/income/IncomeForm";

export default function IncomeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const api = useApi();
  const { create, update, remove } = useIncomeMutations();

  const {
    data: entryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["income-entry", id],
    queryFn: () => api.income.get(id!),
    enabled: !isNew && !!id,
  });

  const entry = entryData?.data;

  const handleSubmit = async (data: IncomeFormData) => {
    try {
      if (isNew) {
        await create.mutateAsync({
          date: data.date,
          description: data.description,
          clientName: data.clientName,
          amountGross: data.amountGross,
          amountPaid: data.amountPaid,
          vatRate: data.vatRate,
          includesVat: data.includesVat,
          notes: data.notes,
        });
      } else {
        await update.mutateAsync({
          id: id!,
          data: {
            date: data.date,
            description: data.description,
            clientName: data.clientName,
            amountGross: data.amountGross,
            amountPaid: data.amountPaid,
            vatRate: data.vatRate,
            includesVat: data.includesVat,
            notes: data.notes,
          },
        });
      }
      router.back();
    } catch (err) {
      Alert.alert("שגיאה", "לא ניתן לשמור את הנתונים");
    }
  };

  const handleDelete = () => {
    Alert.alert("מחיקת הכנסה", "האם למחוק את ההכנסה?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(id!);
            router.back();
          } catch {
            Alert.alert("שגיאה", "לא ניתן למחוק");
          }
        },
      },
    ]);
  };

  if (!isNew && isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!isNew && error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>שגיאה בטעינת הנתונים</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? "הכנסה חדשה" : "עריכת הכנסה",
          headerRight: !isNew
            ? () => (
                <Text
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  מחק
                </Text>
              )
            : undefined,
        }}
      />
      <IncomeForm
        initialData={entry}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
  deleteButton: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
});
