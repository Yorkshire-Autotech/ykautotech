import { cookie, errorResponse, json, readJson, verifyFirebaseUser } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  try {
    const { idToken } = await readJson(request, 10_000);
    if (!idToken) return json({ error: "Firebase ID token is required." }, { status: 400 });
    await verifyFirebaseUser(new Request(request.url, {
      headers: { Authorization: `Bearer ${idToken}` },
    }), env);
    return json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": cookie("ya_admin_session", idToken, { maxAge: 3600 }),
        },
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
