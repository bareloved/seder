import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { router } from "expo-router";
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getUserProfile,
  setUserProfile,
  clearUserProfile,
  type UserProfile,
} from "../lib/auth-storage";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://sedder.app";

// Strip invisible Unicode characters (RTL/LTR marks, BOM, zero-width chars)
// that iOS keyboards or RTL mode can insert into text inputs
function sanitize(str: string): string {
  return str.replace(/[\u200E\u200F\u200B\u200C\u200D\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').trim();
}

interface AuthContextValue {
  isAuthenticated: boolean | null;
  isLoading: boolean;
  user: UserProfile | null;
  signIn: (email: string, password: string) => Promise<unknown>;
  signUp: (name: string, email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    Promise.all([getAuthToken(), getUserProfile()]).then(([token, profile]) => {
      setIsAuthenticated(!!token);
      if (profile) setUser(profile);
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: sanitize(email), password: sanitize(password) }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || "שגיאה בהתחברות");
        }

        const data = await res.json();

        if (data.session?.token || data.token) {
          const token = data.session?.token || data.token;
          await setAuthToken(token);

          const profile: UserProfile = {
            name: data.user?.name ?? undefined,
            email: data.user?.email ?? undefined,
            image: data.user?.image ?? undefined,
          };
          await setUserProfile(profile);
          setUser(profile);
          setIsAuthenticated(true);
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
          body: JSON.stringify({ name: sanitize(name), email: sanitize(email), password: sanitize(password) }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || "שגיאה בהרשמה");
        }

        const data = await res.json();

        if (data.session?.token || data.token) {
          const token = data.session?.token || data.token;
          await setAuthToken(token);

          const profile: UserProfile = {
            name: data.user?.name ?? name,
            email: data.user?.email ?? email,
            image: data.user?.image ?? undefined,
          };
          await setUserProfile(profile);
          setUser(profile);
          setIsAuthenticated(true);
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
    await clearUserProfile();
    setUser(null);
    setIsAuthenticated(false);
    router.replace("/(auth)/sign-in");
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
