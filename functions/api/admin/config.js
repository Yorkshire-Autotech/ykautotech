import { bookingConfig, saveBookingConfig } from "../../_config.js";
import {
  HttpError,
  errorResponse,
  json,
  readJson,
  verifyFirebaseUser,
} from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  try {
    await verifyFirebaseUser(request, env);
    return json(await bookingConfig(env));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    await verifyFirebaseUser(request, env);
    const config = await readJson(request);
    if (!Array.isArray(config.services) || !config.services.length || !config.workingHours) {
      throw new HttpError(400, "Services and working hours are required.", "invalid_config");
    }
    for (const service of config.services) {
      if (
        !service.id ||
        !service.name ||
        !Number.isFinite(Number(service.slotMinutes)) ||
        !Number.isFinite(Number(service.jobMinutes)) ||
        Number(service.slotMinutes) < 15 ||
        Number(service.jobMinutes) < 15
      ) {
        throw new HttpError(400, "Every service needs a name and valid slot/job durations.", "invalid_service");
      }
    }
    await saveBookingConfig(env, config);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
