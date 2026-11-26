import {
  clearBookingLocks,
  isCalendarFree,
  loadBooking,
  lockPaths,
  syncCalendarEvent,
} from "../../../_booking.js";
import {
  HttpError,
  calendarRequest,
  createDocumentsAtomically,
  deleteDocument,
  errorResponse,
  json,
  readJson,
  updateDocument,
  verifyFirebaseUser,
} from "../../../_lib.js";

async function acquireLocks(env, booking, paths = lockPaths(booking)) {
  if (!paths.length) return;
  await createDocumentsAtomically(
    env,
    paths.map((path) => ({
      path,
      value: {
        date: booking.date,
        slot: path.split("/").pop().slice(-4).replace(/(\d{2})(\d{2})/, "$1:$2"),
        bookingSlotDuration: 15,
        bookingId: booking.id,
        requestId: booking.requestId || booking.ref,
      },
    }))
  );
}

async function releaseLocks(env, paths) {
  for (const path of paths) {
    try {
      await deleteDocument(env, path);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
}

async function syncOrMarkFailure(env, booking) {
  try {
    await syncCalendarEvent(env, booking);
  } catch (error) {
    await updateDocument(env, `bookings/${booking.id}`, {
      calendarSyncStatus: "failed",
      calendarLastError: error.message,
      calendarLastSyncedAt: new Date().toISOString(),
    });
    return { calendarSyncStatus: "failed", message: error.message };
  }
  return { calendarSyncStatus: "synced", message: "" };
}

export async function onRequestPatch({ request, env, params }) {
  try {
    await verifyFirebaseUser(request, env);
    const payload = await readJson(request);
    const booking = await loadBooking(env, params.id);
    const action = String(payload.action || "");

    if (action === "approve" || action === "confirm") {
      if (!(await isCalendarFree(env, booking))) {
        throw new HttpError(409, "That appointment is no longer available.", "slot_conflict");
      }
      await acquireLocks(env, booking);
      await updateDocument(env, `bookings/${booking.id}`, {
        status: "confirmed",
        bookingStatus: "confirmed",
        calendarSyncStatus: "pending",
        confirmedAt: new Date().toISOString(),
      });
      Object.assign(booking, { status: "confirmed", bookingStatus: "confirmed" });
      return json({ ok: true, ...(await syncOrMarkFailure(env, booking)) });
    }

    if (action === "reject") {
      await clearBookingLocks(env, booking);
      await updateDocument(env, `bookings/${booking.id}`, {
        status: "rejected",
        bookingStatus: "rejected",
        rejectedAt: new Date().toISOString(),
      });
      return json({ ok: true });
    }

    if (action === "cancel") {
      if (booking.googleCalendarEventId) {
        await calendarRequest(
          env,
          `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(booking.googleCalendarEventId)}`,
          { method: "DELETE" }
        );
      }
      await clearBookingLocks(env, booking);
      await updateDocument(env, `bookings/${booking.id}`, {
        status: "cancelled",
        bookingStatus: "cancelled",
        calendarSyncStatus: "cancelled",
        cancelledAt: new Date().toISOString(),
      });
      return json({ ok: true });
    }

    if (action === "complete") {
      await updateDocument(env, `bookings/${booking.id}`, {
        status: "completed",
        bookingStatus: "completed",
        completedAt: new Date().toISOString(),
      });
      return json({ ok: true });
    }

    if (action === "retry-sync") {
      return json({ ok: true, ...(await syncOrMarkFailure(env, booking)) });
    }

    if (action === "reschedule") {
      const date = String(payload.date || "");
      const slot = String(payload.slot || "");
      const duration = Number(payload.bookingSlotDuration || booking.bookingSlotDuration || 60);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(slot)) {
        throw new HttpError(400, "A valid replacement date and time are required.", "invalid_appointment");
      }
      if ((booking.bookingStatus || booking.status) !== "confirmed") {
        await updateDocument(env, `bookings/${booking.id}`, {
          date,
          slot,
          bookingSlotDuration: duration,
        });
        return json({ ok: true, calendarSyncStatus: "not_required", message: "Requested appointment updated." });
      }
      const replacement = { ...booking, date, slot, bookingSlotDuration: duration };
      if (!(await isCalendarFree(env, replacement, true))) {
        throw new HttpError(409, "The replacement appointment is not available.", "slot_conflict");
      }
      const oldPaths = lockPaths(booking);
      const newPaths = lockPaths(replacement);
      const oldPathSet = new Set(oldPaths);
      const newPathSet = new Set(newPaths);
      await acquireLocks(env, replacement, newPaths.filter((path) => !oldPathSet.has(path)));
      await updateDocument(env, `bookings/${booking.id}`, {
        date,
        slot,
        bookingSlotDuration: duration,
        calendarSyncStatus: "pending",
      });
      Object.assign(replacement, { date, slot, bookingSlotDuration: duration });
      const sync = await syncOrMarkFailure(env, replacement);
      await releaseLocks(env, oldPaths.filter((path) => !newPathSet.has(path)));
      return json({ ok: true, ...sync });
    }

    if (action === "update") {
      const allowed = [
        "name",
        "phone",
        "email",
        "vehicleMake",
        "vehicleModel",
        "vehicleYear",
        "vehicle",
        "registration",
        "engineVariant",
        "additionalInformation",
        "notes",
        "partDetails",
        "productLink",
        "estimatedJobDuration",
      ];
      const updates = Object.fromEntries(allowed.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
      if (!Object.keys(updates).length) throw new HttpError(400, "No editable fields were supplied.", "invalid_update");
      await updateDocument(env, `bookings/${booking.id}`, updates);
      if ((booking.bookingStatus || booking.status) === "confirmed") {
        Object.assign(booking, updates);
        const sync = await syncOrMarkFailure(env, booking);
        return json({ ok: true, ...sync });
      }
      return json({ ok: true });
    }

    throw new HttpError(400, "Unknown booking action.", "invalid_action");
  } catch (error) {
    return errorResponse(error);
  }
}
