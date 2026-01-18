import { db } from "@/db/client";
import { account } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { google } from "googleapis";

// Buffer time (5 minutes) before actual expiration to refresh proactively
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

export class GoogleTokenError extends Error {
  constructor(
    message: string,
    public readonly requiresReconnect: boolean = false
  ) {
    super(message);
    this.name = "GoogleTokenError";
  }
}

interface GoogleAccount {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
}

/**
 * Gets a valid Google access token for the user, refreshing if necessary.
 *
 * @param userId - The user's ID
 * @returns A valid access token
 * @throws GoogleTokenError if no Google account exists or token refresh fails
 */
export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  // Get the user's Google account
  const [googleAccount] = await db
    .select({
      id: account.id,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
    })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "google")
      )
    )
    .limit(1);

  if (!googleAccount) {
    throw new GoogleTokenError("Google Calendar not connected", true);
  }

  if (!googleAccount.accessToken) {
    throw new GoogleTokenError("No access token available", true);
  }

  // Check if token is expired or will expire soon
  if (isTokenExpired(googleAccount.accessTokenExpiresAt)) {
    // Try to refresh the token
    if (!googleAccount.refreshToken) {
      throw new GoogleTokenError(
        "No refresh token available. Please reconnect Google Calendar.",
        true
      );
    }

    const newAccessToken = await refreshGoogleToken(
      googleAccount.id,
      googleAccount.refreshToken
    );
    return newAccessToken;
  }

  return googleAccount.accessToken;
}

/**
 * Checks if a token is expired or will expire within the buffer period.
 */
function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    // If no expiration date, assume it might be expired
    return true;
  }

  const now = Date.now();
  const expirationTime = expiresAt.getTime();

  // Return true if token expires within the buffer period
  return now >= expirationTime - EXPIRATION_BUFFER_MS;
}

/**
 * Refreshes the Google access token using the refresh token.
 * Updates the database with the new token.
 *
 * @param accountId - The account record ID
 * @param refreshToken - The refresh token
 * @returns The new access token
 */
async function refreshGoogleToken(
  accountId: string,
  refreshToken: string
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new GoogleTokenError(
        "Failed to refresh token: no access token returned",
        true
      );
    }

    // Calculate expiration time
    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default to 1 hour if not provided

    // Update the database with the new token
    await db
      .update(account)
      .set({
        accessToken: credentials.access_token,
        accessTokenExpiresAt: expiresAt,
        // Update refresh token if a new one was provided (token rotation)
        ...(credentials.refresh_token && {
          refreshToken: credentials.refresh_token,
        }),
        updatedAt: new Date(),
      })
      .where(eq(account.id, accountId));

    console.log(`Successfully refreshed Google token for account ${accountId}`);

    return credentials.access_token;
  } catch (error) {
    console.error("Failed to refresh Google token:", error);

    // Check if the refresh token is invalid/revoked
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("Token has been expired or revoked")
    ) {
      throw new GoogleTokenError(
        "Google authorization has been revoked. Please reconnect Google Calendar.",
        true
      );
    }

    throw new GoogleTokenError(
      `Failed to refresh Google token: ${errorMessage}`,
      true
    );
  }
}

/**
 * Wrapper to execute a function with automatic token refresh on auth errors.
 *
 * @param userId - The user's ID
 * @param fn - The function to execute with the access token
 * @returns The result of the function
 */
export async function withGoogleToken<T>(
  userId: string,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  const accessToken = await getValidGoogleAccessToken(userId);

  try {
    return await fn(accessToken);
  } catch (error) {
    // Check if it's an auth error (401/403)
    const status =
      (error as { code?: number; response?: { status?: number } })?.code ??
      (error as { code?: number; response?: { status?: number } })?.response?.status;

    if (status === 401 || status === 403) {
      console.log(`Auth error (${status}) detected, attempting token refresh...`);

      // Force refresh by getting a new token
      // First, mark the current token as expired
      const [googleAccount] = await db
        .select({
          id: account.id,
          refreshToken: account.refreshToken,
        })
        .from(account)
        .where(
          and(
            eq(account.userId, userId),
            eq(account.providerId, "google")
          )
        )
        .limit(1);

      if (!googleAccount?.refreshToken) {
        throw new GoogleTokenError(
          "No refresh token available. Please reconnect Google Calendar.",
          true
        );
      }

      // Refresh the token
      const newAccessToken = await refreshGoogleToken(
        googleAccount.id,
        googleAccount.refreshToken
      );

      // Retry with the new token
      return await fn(newAccessToken);
    }

    // Re-throw non-auth errors
    throw error;
  }
}
