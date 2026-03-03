import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { listUserCalendars } from "@/lib/googleCalendar";
import { getValidGoogleAccessToken } from "@/lib/googleTokens";

export async function GET() {
  try {
    const userId = await requireAuth();
    try {
      const accessToken = await getValidGoogleAccessToken(userId);
      const calendars = await listUserCalendars(accessToken);
      return apiSuccess({ connected: true, calendars });
    } catch {
      return apiSuccess({ connected: false, calendars: [] });
    }
  } catch (error) {
    return apiError(error);
  }
}
