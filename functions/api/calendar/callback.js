import {
  calendarRequest,
  cookie,
  getDocumentIfExists,
  HttpError,
  putDocument,
  redirectUrl,
} from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const adminUrl = new URL(redirectUrl(env, "/admin.html"));
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieState = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)ya_oauth_state=([^;]+)/)?.[1];
    if (!code || !state || decodeURIComponent(cookieState || "") !== state) {
      throw new HttpError(400, "The Google authorisation request could not be verified.", "invalid_oauth_state");
    }
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const token = await response.json();
    if (!response.ok || !token.access_token) {
      throw new HttpError(502, token.error_description || "Google did not issue an access token.", "oauth_exchange_failed");
    }

    const existing = await getDocumentIfExists(env, "settings/googleCalendar");
    const refreshToken = token.refresh_token || existing?.refreshToken;
    if (!refreshToken) {
      throw new HttpError(409, "Google did not return a refresh token. Disconnect access and reconnect.", "refresh_token_missing");
    }
    await putDocument(env, "settings/googleCalendar", {
      refreshToken,
      accessToken: token.access_token,
      expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
      calendarId: env.GOOGLE_CALENDAR_ID,
      connected: true,
      updatedAt: new Date().toISOString(),
      lastError: "",
    });
    await calendarRequest(env, `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}`);

    adminUrl.searchParams.set("calendar", "connected");
    return new Response(null, {
      status: 302,
      headers: {
        Location: adminUrl.toString(),
        "Set-Cookie": cookie("ya_oauth_state", "", { maxAge: 0 }),
      },
    });
  } catch (error) {
    console.error("Calendar callback failed", error);
    adminUrl.searchParams.set("calendar", "error");
    adminUrl.searchParams.set("message", error.message || "Google Calendar could not be connected.");
    return new Response(null, {
      status: 302,
      headers: {
        Location: adminUrl.toString(),
        "Set-Cookie": cookie("ya_oauth_state", "", { maxAge: 0 }),
      },
    });
  }
}
