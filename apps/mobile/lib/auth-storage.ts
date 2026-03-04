import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "seder_auth_token";
const PROFILE_KEY = "seder_user_profile";

export interface UserProfile {
  name?: string;
  email?: string;
  image?: string;
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const json = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json) as UserProfile;
  } catch {
    return null;
  }
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearUserProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(PROFILE_KEY);
}
