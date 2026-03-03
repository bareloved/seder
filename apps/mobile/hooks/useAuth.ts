import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from "../lib/auth-storage";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getAuthToken().then((token) => setIsAuthenticated(!!token));
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || "שגיאה בהתחברות");
        }

        const data = await res.json();

        // Better Auth returns { token, user } or sets session cookie
        // Extract session token from response
        if (data.session?.token || data.token) {
          const token = data.session?.token || data.token;
          await setAuthToken(token);
          setIsAuthenticated(true);
          router.replace("/(tabs)/income");
        } else {
          throw new Error("לא התקבל טוקן מהשרת");
        }

        return data;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || "שגיאה בהרשמה");
        }

        const data = await res.json();

        if (data.session?.token || data.token) {
          const token = data.session?.token || data.token;
          await setAuthToken(token);
          setIsAuthenticated(true);
          router.replace("/(tabs)/income");
        } else {
          throw new Error("לא התקבל טוקן מהשרת");
        }

        return data;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await clearAuthToken();
    setIsAuthenticated(false);
    router.replace("/(auth)/sign-in");
  }, []);

  return { isAuthenticated, isLoading, signIn, signUp, signOut };
}
