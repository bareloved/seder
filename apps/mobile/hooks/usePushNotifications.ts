import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useApi } from "../providers/ApiProvider";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(isAuthenticated: boolean) {
  const api = useApi();

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPush();
  }, [isAuthenticated]);

  async function registerForPush() {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      await api.devices.register({
        token: tokenData.data,
        platform: Platform.OS as "ios" | "android",
      });
    } catch (error) {
      console.warn("Push notification registration failed:", error);
    }
  }
}
