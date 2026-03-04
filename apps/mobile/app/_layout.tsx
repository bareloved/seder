import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import 'react-native-reanimated';

import { QueryProvider } from '../providers/QueryProvider';
import { ApiProvider } from '../providers/ApiProvider';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { DarkModeProvider, useDarkMode } from '../providers/DarkModeProvider';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Force RTL for Hebrew - requires full app restart to take effect
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  I18nManager.allowRTL(true);
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Ploni-Regular': require('../assets/fonts/Ploni-Regular.otf'),
    'Ploni-Medium': require('../assets/fonts/Ploni-Medium.otf'),
    'Ploni-DemiBold': require('../assets/fonts/Ploni-DemiBold.otf'),
    'Ploni-Bold': require('../assets/fonts/Ploni-Bold.otf'),
    'Montserrat_400Regular': require('../assets/fonts/Montserrat_400Regular.ttf'),
    'Montserrat_500Medium': require('../assets/fonts/Montserrat_500Medium.ttf'),
    'Montserrat_600SemiBold': require('../assets/fonts/Montserrat_600SemiBold.ttf'),
    'Montserrat_700Bold': require('../assets/fonts/Montserrat_700Bold.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <DarkModeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </DarkModeProvider>
  );
}

function RootLayoutNav() {
  const { isDark } = useDarkMode();
  const { isAuthenticated } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isAuthenticated === null) return; // Still loading

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/income');
    }
  }, [isAuthenticated, segments]);

  return (
    <QueryProvider>
      <ApiProvider>
        <PushNotificationHandler isAuthenticated={isAuthenticated === true} />
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="categories/index" options={{ presentation: 'modal', title: 'קטגוריות' }} />
            <Stack.Screen name="clients/index" options={{ presentation: 'modal', title: 'לקוחות' }} />
            <Stack.Screen name="calendar/index" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_left' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </ApiProvider>
    </QueryProvider>
  );
}

function PushNotificationHandler({ isAuthenticated }: { isAuthenticated: boolean }) {
  usePushNotifications(isAuthenticated);
  return null;
}
