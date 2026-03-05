import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useApi } from "../providers/ApiProvider";

const isExpoGo = Constants.appOwnership === "expo";

if (!isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Native notification module not available
  }
}

export function usePushNotifications(isAuthenticated: boolean) {
  const api = useApi();

  useEffect(() => {
    if (!isAuthenticated) return;
    // Push notifications require a development build on a physical device
    if (isExpoGo || !Device.isDevice) return;
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

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      await api.devices.register({
        token: tokenData.data,
        platform: Platform.OS as "ios" | "android",
      });
    } catch (error) {
      console.warn("Push notification registration failed:", error);
    }
  }
}
