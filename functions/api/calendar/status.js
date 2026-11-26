import { errorResponse, getDocumentIfExists, json, requireGoogleConfig, verifyFirebaseUser } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  try {
    await verifyFirebaseUser(request, env);
    requireGoogleConfig(env);
    const data = await getDocumentIfExists(env, "settings/googleCalendar");
    return json({
      configured: true,
      connected: Boolean(data?.connected && data.refreshToken),
      calendarId: env.GOOGLE_CALENDAR_ID,
      lastSyncedAt: data?.updatedAt || null,
      lastError: data?.lastError || "",
    });
  } catch (error) {
    if (error.code === "google_not_configured" || error.code === "firebase_not_configured") {
      return json({ configured: false, connected: false, message: error.message }, { status: 503 });
    }
    return errorResponse(error);
  }
}
