import { bookingConfig, serviceById } from "../../_config.js";
import { isCalendarFree, syncCalendarEvent } from "../../_booking.js";
import { createDocumentsAtomically, errorResponse, HttpError, json, readJson, updateDocument, verifyFirebaseUser } from "../../_lib.js";
import { lockPaths } from "../../_booking.js";

export async function onRequestPost({ request, env }) {
  try {
    await verifyFirebaseUser(request, env);
    const input = await readJson(request);
    const config = await bookingConfig(env);
    const service = serviceById(config, String(input.serviceId || "electrical-upgrades")) || config.services[0];
    const booking = {
      id: crypto.randomUUID(),
      ref: `YA-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      date: String(input.date || ""),
      slot: String(input.slot || ""),
      name: String(input.name || "").trim(),
      phone: String(input.phone || "").trim(),
      email: String(input.email || "").trim(),
      vehicle: String(input.vehicle || "").trim(),
      vehicleMake: String(input.vehicle || "").trim(),
      vehicleModel: "",
      vehicleYear: "",
      registration: String(input.registration || "").toUpperCase(),
      service: service.name,
      serviceId: service.id,
      items: String(input.items || service.name).trim(),
      bookingType: "admin-manual",
      bookingSlotDuration: Number(input.bookingSlotDuration || service.slotMinutes),
      estimatedJobDuration: Number(input.estimatedJobDuration || service.jobMinutes),
      notes: String(input.notes || "").trim(),
      status: "confirmed",
      bookingStatus: "confirmed",
      requestId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      calendarSyncStatus: "pending",
      createdByAdmin: true,
    };
    if (!booking.name || !/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^\d{2}:\d{2}$/.test(booking.slot)) {
      throw new HttpError(400, "Name, date and time are required.", "invalid_booking");
    }
    if (!(await isCalendarFree(env, booking))) {
      throw new HttpError(409, "That appointment is no longer available.", "slot_conflict");
    }
    await createDocumentsAtomically(env, [
      ...lockPaths(booking).map((path) => ({
        path,
        value: {
          date: booking.date,
          slot: path.split("/").pop().slice(-4).replace(/(\d{2})(\d{2})/, "$1:$2"),
          bookingSlotDuration: 15,
          bookingId: booking.id,
          requestId: booking.requestId,
        },
      })),
      { path: `bookings/${booking.id}`, value: booking },
    ]);
    try {
      await syncCalendarEvent(env, booking);
    } catch (error) {
      await updateDocument(env, `bookings/${booking.id}`, {
        calendarSyncStatus: "failed",
        calendarLastError: error.message,
      });
      return json({ ...booking, calendarSyncStatus: "failed", message: error.message }, { status: 202 });
    }
    return json(booking, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
