import {
  cookie,
  errorResponse,
  redirectUrl,
  requireGoogleConfig,
  verifyFirebaseUser,
} from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  try {
    await verifyFirebaseUser(request, env);
    requireGoogleConfig(env);
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
        "Set-Cookie": cookie("ya_oauth_state", state, { maxAge: 600 }),
      },
    });
  } catch (error) {
    return redirectUrlError(error, env);
  }
}

function redirectUrlError(error, env) {
  if (error.status) console.warn("Calendar connection rejected", error.code);
  const url = new URL(redirectUrl(env, "/admin.html"));
  url.searchParams.set("calendar", "error");
  url.searchParams.set("message", error.message || "Google Calendar could not be connected.");
  return errorResponse(error).status === 500
    ? new Response(null, { status: 302, headers: { Location: url } })
    : new Response(null, { status: 302, headers: { Location: url } });
}
