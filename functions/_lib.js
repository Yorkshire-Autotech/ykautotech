const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const FIREBASE_JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export class HttpError extends Error {
  constructor(status, message, code = "request_error") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    return json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error("Booking API error", error);
  return json(
    { error: "The booking service is temporarily unavailable.", code: "internal_error" },
    { status: 500 }
  );
}

export async function readJson(request, maxBytes = 1_000_000) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new HttpError(413, "Request is too large.", "payload_too_large");
  const body = await request.text();
  if (body.length > maxBytes) throw new HttpError(413, "Request is too large.", "payload_too_large");
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.", "invalid_json");
  }
}

function base64UrlDecode(input) {
  const value = input.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(value + "=".repeat((4 - (value.length % 4)) % 4)), (c) =>
    c.charCodeAt(0)
  );
  return new TextDecoder().decode(bytes);
}

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0)).buffer;
}

async function verifyRs256(signature, data, pem, isPrivate = false) {
  const key = await crypto.subtle.importKey(
    isPrivate ? "pkcs8" : "spki",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    [isPrivate ? "sign" : "verify"]
  );
  const bytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0)
  );
  return isPrivate
    ? base64UrlEncode(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(data))))
    : crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, bytes, new TextEncoder().encode(data));
}

async function googleServiceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    throw new HttpError(503, "Firebase server access is not configured.", "firebase_not_configured");
  }
  let account;
  try {
    account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  } catch {
    throw new HttpError(503, "Firebase server credentials are invalid.", "firebase_not_configured");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: account.client_email,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const assertion = `${header}.${payload}.${await verifyRs256("", `${header}.${payload}`, account.private_key, true)}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) {
    throw new HttpError(503, "Firebase server authentication failed.", "firebase_auth_failed");
  }
  return token.access_token;
}

async function firestoreRequest(env, path, options = {}) {
  const projectId = env.FIREBASE_PROJECT_ID || JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || "{}").project_id;
  if (!projectId) throw new HttpError(503, "FIREBASE_PROJECT_ID is not configured.", "firebase_not_configured");
  const token = await googleServiceAccount(env);
  const documentRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const endpoint = path.startsWith(":") ? `${documentRoot}${path}` : `${documentRoot}/${path}`;
  const response = await fetch(
    endpoint,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );
  const body = await response.text();
  const data = body ? JSON.parse(body) : {};
  if (!response.ok) {
    console.error("Firestore REST error", response.status, data);
    throw new HttpError(
      response.status === 404 ? 404 : 502,
      response.status === 404 ? "The requested booking record was not found." : "Firebase operation failed.",
      "firebase_error"
    );
  }
  return data;
}

export function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  return { mapValue: { fields: toFirestoreFields(value) } };
}

export function toFirestoreFields(value) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, toFirestoreValue(item)])
  );
}

export function fromFirestoreValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if (value.mapValue) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

export function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

export function fromFirestoreDocument(document) {
  if (!document) return null;
  return { id: document.name.split("/").pop(), ...fromFirestoreFields(document.fields) };
}

export async function getDocument(env, path) {
  return fromFirestoreDocument(await firestoreRequest(env, path));
}

export async function getDocumentIfExists(env, path) {
  try {
    return await getDocument(env, path);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function putDocument(env, path, value) {
  return firestoreRequest(env, path, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFirestoreFields(value) }),
  });
}

export async function updateDocument(env, path, value) {
  const mask = Object.keys(value);
  const query = new URLSearchParams();
  mask.forEach((field) => query.append("updateMask.fieldPaths", field));
  return firestoreRequest(
    env,
    `${path}?${query.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields: toFirestoreFields(value) }),
    }
  );
}

export async function listDocuments(env, collection, orderBy) {
  const suffix = orderBy ? `?orderBy=${encodeURIComponent(orderBy)}` : "";
  const result = await firestoreRequest(env, `${collection}${suffix}`);
  return (result.documents || []).map(fromFirestoreDocument);
}

export async function queryDocuments(env, collection, field, operator, value) {
  const result = await firestoreRequest(env, ":runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: operator,
            value: toFirestoreValue(value),
          },
        },
      },
    }),
  });
  return result.map((row) => fromFirestoreDocument(row.document)).filter(Boolean);
}

export async function createDocumentsAtomically(env, documents) {
  const projectId = env.FIREBASE_PROJECT_ID || JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || "{}").project_id;
  const token = await googleServiceAccount(env);
  const root = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
  const begin = await fetch(`${root}/documents:beginTransaction`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ options: { readWrite: {} } }),
  });
  const transaction = await begin.json();
  if (!begin.ok || !transaction.transaction) throw new HttpError(502, "Firebase transaction could not start.", "firebase_error");
  const response = await fetch(`${root}/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction: transaction.transaction,
      writes: documents.map(({ path, value }) => ({
        update: {
          name: `${root}/documents/${path}`,
          fields: toFirestoreFields(value),
        },
        currentDocument: { exists: false },
      })),
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    const conflict = response.status === 409 || /already exists|ABORTED/i.test(JSON.stringify(result));
    throw new HttpError(
      conflict ? 409 : 502,
      conflict ? "That appointment has just been booked. Please choose another time." : "The booking could not be saved.",
      conflict ? "slot_conflict" : "firebase_error"
    );
  }
  return result;
}

export async function deleteDocument(env, path) {
  return firestoreRequest(env, path, { method: "DELETE" });
}

export function bearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)ya_admin_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function verifyFirebaseUser(request, env) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "An authenticated admin session is required.", "authentication_required");
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Invalid authentication token.", "invalid_token");
  let header;
  let claims;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]));
    claims = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    throw new HttpError(401, "Invalid authentication token.", "invalid_token");
  }
  const projectId = env.FIREBASE_PROJECT_ID || JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || "{}").project_id;
  if (
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    Number(claims.exp) * 1000 <= Date.now()
  ) {
    throw new HttpError(401, "Invalid or expired admin session.", "invalid_token");
  }
  const keysResponse = await fetch(FIREBASE_JWK_URL);
  if (!keysResponse.ok) throw new HttpError(503, "Unable to verify the admin session.", "auth_unavailable");
  const { keys = [] } = await keysResponse.json();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new HttpError(401, "Invalid authentication token.", "invalid_token");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signatureBytes = Uint8Array.from(
    atob(parts[2].replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (parts[2].length % 4)) % 4)),
    (character) => character.charCodeAt(0)
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signatureBytes,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new HttpError(401, "Invalid authentication token.", "invalid_token");
  const allowed = (env.ADMIN_EMAILS || "yorkshireautotech@outlook.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(String(claims.email).toLowerCase())) {
    throw new HttpError(403, "This account is not authorised to manage bookings.", "not_admin");
  }
  return claims;
}

export function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.secure !== false) parts.push("Secure");
  return parts.join("; ");
}

export function redirectUrl(env, path) {
  const origin = env.SITE_ORIGIN || "https://yorkshireautotech.co.uk";
  return new URL(path, origin).toString();
}

export function requireGoogleConfig(env) {
  for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "GOOGLE_CALENDAR_ID"]) {
    if (!env[name]) throw new HttpError(503, `Google Calendar is not configured (${name} missing).`, "google_not_configured");
  }
}

export async function googleAccessToken(env) {
  requireGoogleConfig(env);
  const account = await getDocumentIfExists(env, "settings/googleCalendar");
  if (!account?.refreshToken) {
    throw new HttpError(409, "Google Calendar is not connected.", "calendar_not_connected");
  }
  if (account.accessToken && Number(account.expiresAt) > Date.now() + 60_000) return account.accessToken;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
    }),
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) {
    await updateDocument(env, "settings/googleCalendar", {
      connected: false,
      lastError: token.error_description || "Google refresh failed.",
      updatedAt: new Date().toISOString(),
    });
    throw new HttpError(502, "Google Calendar authorisation needs to be renewed.", "calendar_refresh_failed");
  }
  await updateDocument(env, "settings/googleCalendar", {
    accessToken: token.access_token,
    expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
    connected: true,
    lastError: "",
    updatedAt: new Date().toISOString(),
  });
  return token.access_token;
}

export async function calendarRequest(env, path, options = {}) {
  const accessToken = await googleAccessToken(env);
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) : {};
  if (!response.ok) {
    console.error("Google Calendar API error", response.status, data);
    throw new HttpError(502, "Google Calendar could not complete the request.", "calendar_error");
  }
  return data;
}

export function calendarEvent(booking, env) {
  const start = `${booking.date}T${booking.slot}:00`;
  const duration = Number(booking.bookingSlotDuration || 60);
  const endDate = new Date(`${start}+00:00`);
  endDate.setUTCMinutes(endDate.getUTCMinutes() + duration);
  const end = endDate.toISOString().slice(0, 19);
  const vehicle = booking.vehicle || [booking.vehicleMake, booking.vehicleModel, booking.vehicleYear].filter(Boolean).join(" ");
  return {
    summary: `${booking.items || booking.service} – ${vehicle} – ${booking.registration || ""}`.replace(/\s+–\s*$/, ""),
    description: [
      `Customer: ${booking.name}`,
      `Telephone: ${booking.phone}`,
      `Vehicle: ${vehicle}`,
      `Registration: ${booking.registration || "Not supplied"}`,
      `Service: ${booking.items || booking.service}`,
      `Booking type: ${booking.bookingType || "Workshop booking"}`,
      `Estimated fitting duration: ${booking.estimatedJobDuration || duration} minutes`,
      `Customer notes: ${booking.notes || "None"}`,
      `Firebase booking reference: ${booking.ref}`,
    ].join("\n"),
    start: { dateTime: start, timeZone: env.BUSINESS_TIME_ZONE || "Europe/London" },
    end: { dateTime: end, timeZone: env.BUSINESS_TIME_ZONE || "Europe/London" },
    extendedProperties: {
      private: { bookingRef: booking.ref, bookingId: booking.id || "", source: "yorkshire-autotech" },
    },
  };
}

export function addMinutes(time, minutes) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function zonedDateTime(date, time, timeZone = "Europe/London") {
  const localAsUtc = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(localAsUtc);
  const label = parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = label.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const offset = match ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] || 0)) : 0;
  return new Date(localAsUtc.getTime() - offset * 60_000).toISOString();
}

export function assertSameOrigin(request, env) {
  if (request.method === "GET") return;
  const origin = request.headers.get("Origin");
  if (origin && env.SITE_ORIGIN && origin !== env.SITE_ORIGIN && origin !== new URL(request.url).origin) {
    throw new HttpError(403, "Cross-origin requests are not allowed.", "origin_not_allowed");
  }
}
