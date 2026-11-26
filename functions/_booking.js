import { bookingConfig, serviceById } from "./_config.js";
import {
  HttpError,
  addMinutes,
  calendarEvent,
  calendarRequest,
  createDocumentsAtomically,
  deleteDocument,
  getDocument,
  overlaps,
  queryDocuments,
  updateDocument,
  zonedDateTime,
} from "./_lib.js";

const REQUIRED_TEXT = ["name", "phone", "email", "vehicleMake", "vehicleModel", "vehicleYear"];

export function validateBooking(input, config) {
  const booking = {};
  for (const field of REQUIRED_TEXT) {
    const value = String(input[field] || "").trim();
    if (!value) throw new HttpError(400, `Missing required field: ${field}.`, "invalid_booking");
    booking[field] = value.slice(0, 200);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) {
    throw new HttpError(400, "Please enter a valid email address.", "invalid_email");
  }
  const service = serviceById(config, String(input.serviceId || ""));
  if (!service) throw new HttpError(400, "Please choose a valid service.", "invalid_service");
  const bookingType = String(input.bookingType || "fitting-only");
  const supports =
    bookingType === "fitting-only"
      ? service.fittingOnly
      : bookingType === "supply-and-fit"
        ? service.supplyAndFit
        : false;
  if (!supports) throw new HttpError(400, "That booking type is not available for this service.", "invalid_booking_type");
  const date = String(input.date || "");
  const slot = String(input.slot || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(slot)) {
    throw new HttpError(400, "Please choose a valid appointment date and time.", "invalid_appointment");
  }
  const leadHours =
    bookingType === "supply-and-fit"
      ? Number(config.supplyAndFitLeadHours ?? 168)
      : Number(config.bookingLeadHours ?? 24);
  if (new Date(`${date}T${slot}:00`).getTime() < Date.now() + leadHours * 3_600_000) {
    throw new HttpError(
      400,
      bookingType === "supply-and-fit"
        ? "Supply & Fit bookings require at least seven days' notice."
        : "This appointment requires at least 24 hours' notice.",
      "appointment_too_soon"
    );
  }
  const fittingLocation = input.fittingLocation === "mobile" ? "mobile" : "workshop";
  if (fittingLocation === "mobile" && !config.allowMobileFitting) {
    throw new HttpError(400, "Mobile fitting is not currently available online.", "mobile_unavailable");
  }
  Object.assign(booking, {
    serviceId: service.id,
    service: service.name,
    items: service.name,
    bookingType,
    bookingSlotDuration: Number(service.slotMinutes),
    estimatedJobDuration: Number(service.jobMinutes),
    date,
    slot,
    registration: String(input.registration || "").trim().toUpperCase().slice(0, 20),
    engineVariant: String(input.engineVariant || "").trim().slice(0, 200),
    additionalInformation: String(input.additionalInformation || "").trim().slice(0, 4000),
    notes: String(input.notes || "").trim().slice(0, 4000),
    partDetails: String(input.partDetails || "").trim().slice(0, 4000),
    productLink: String(input.productLink || "").trim().slice(0, 2000),
    uploadedImages: Array.isArray(input.uploadedImages) ? input.uploadedImages.slice(0, 6).map(String) : [],
    fittingLocation,
    address: fittingLocation === "mobile" ? String(input.address || "").trim().slice(0, 500) : "",
    vehicle: `${booking.vehicleMake} ${booking.vehicleModel} (${booking.vehicleYear})`,
    requestId: String(input.requestId || crypto.randomUUID()),
  });
  if (fittingLocation === "mobile" && !booking.address) {
    throw new HttpError(400, "An address is required for mobile fitting.", "address_required");
  }
  booking.approvalRequired = service.approvalRequired || bookingType === "supply-and-fit";
  return booking;
}

export function lockPaths(booking) {
  const paths = [];
  const duration = Number(booking.bookingSlotDuration);
  for (let minute = 0; minute < duration; minute += 15) {
    const slot = addMinutes(booking.slot, minute).replace(":", "");
    paths.push(`availability/${booking.date}_${slot}`);
  }
  return paths;
}

export async function reserveBooking(env, booking, bookingStatus = "confirmed") {
  const documents = (bookingStatus === "confirmed" ? lockPaths(booking) : []).map((path) => ({
    path,
    value: {
      date: booking.date,
      slot: path.split("/").pop().slice(-4).replace(/(\d{2})(\d{2})/, "$1:$2"),
      bookingSlotDuration: 15,
      bookingId: booking.id,
      requestId: booking.requestId,
    },
  }));
  documents.push({
    path: `bookings/${booking.id}`,
    value: {
      ...booking,
      bookingStatus,
      status: bookingStatus === "confirmed" ? "confirmed" : "pending",
      calendarSyncStatus: bookingStatus === "confirmed" ? "pending" : "not_required",
      createdAt: new Date().toISOString(),
    },
  });
  await createDocumentsAtomically(env, documents);
}

export async function isCalendarFree(env, booking, ignoreOwnEvent = false) {
  const timeZone = env.BUSINESS_TIME_ZONE || "Europe/London";
  const start = zonedDateTime(booking.date, booking.slot, timeZone);
  const end = zonedDateTime(booking.date, addMinutes(booking.slot, booking.bookingSlotDuration), timeZone);
  if (ignoreOwnEvent && booking.googleCalendarEventId) {
    const params = new URLSearchParams({
      timeMin: start,
      timeMax: end,
      timeZone,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    const events = await calendarRequest(
      env,
      `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events?${params}`
    );
    return !(events.items || []).some((event) =>
      event.id !== booking.googleCalendarEventId &&
      event.transparency !== "transparent" &&
      event.start?.dateTime &&
      overlaps(
        new Date(start).getTime(),
        new Date(end).getTime(),
        new Date(event.start.dateTime).getTime(),
        new Date(event.end.dateTime).getTime()
      )
    );
  }
  const result = await calendarRequest(env, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: start,
      timeMax: end,
      timeZone,
      items: [{ id: env.GOOGLE_CALENDAR_ID }],
    }),
  });
  return !(result.calendars?.[env.GOOGLE_CALENDAR_ID]?.busy || []).some((busy) =>
    overlaps(new Date(start).getTime(), new Date(end).getTime(), new Date(busy.start).getTime(), new Date(busy.end).getTime())
  );
}

export async function syncCalendarEvent(env, booking) {
  if (!(await isCalendarFree(env, booking)) && !booking.googleCalendarEventId) {
    throw new HttpError(409, "That appointment is no longer available. Please choose another time.", "slot_conflict");
  }
  const encodedCalendar = encodeURIComponent(env.GOOGLE_CALENDAR_ID);
  const event = calendarEvent(booking, env);
  const endpoint = booking.googleCalendarEventId
    ? `/calendars/${encodedCalendar}/events/${encodeURIComponent(booking.googleCalendarEventId)}`
    : `/calendars/${encodedCalendar}/events`;
  const created = await calendarRequest(env, endpoint, {
    method: booking.googleCalendarEventId ? "PATCH" : "POST",
    body: JSON.stringify(event),
  });
  await updateDocument(env, `bookings/${booking.id}`, {
    googleCalendarEventId: created.id,
    calendarSyncStatus: "synced",
    calendarLastSyncedAt: new Date().toISOString(),
    calendarLastError: "",
  });
  return created;
}

export async function clearBookingLocks(env, booking) {
  for (const path of lockPaths(booking)) {
    try {
      await deleteDocument(env, path);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
}

export async function loadBooking(env, id) {
  const booking = await getDocument(env, `bookings/${id}`);
  if (!booking) throw new HttpError(404, "Booking not found.", "booking_not_found");
  return booking;
}

export async function existingRequest(env, requestId) {
  const matches = await queryDocuments(env, "bookings", "requestId", "EQUAL", requestId);
  return matches[0] || null;
}

export async function createBooking(env, input) {
  const config = await bookingConfig(env);
  const booking = validateBooking(input, config);
  const existing = await existingRequest(env, booking.requestId);
  if (existing) return existing;
  booking.id = crypto.randomUUID();
  booking.ref = `YA-${booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  if (booking.approvalRequired) {
    await reserveBooking(env, booking, "pending_approval");
    booking.bookingStatus = "pending_approval";
    booking.status = "pending";
    booking.calendarSyncStatus = "not_required";
    return booking;
  }
  if (!(await isCalendarFree(env, booking))) {
    throw new HttpError(409, "That appointment is no longer available. Please choose another time.", "slot_conflict");
  }
  await reserveBooking(env, booking, "confirmed");
  booking.bookingStatus = "confirmed";
  booking.status = "confirmed";
  try {
    await syncCalendarEvent(env, booking);
    booking.calendarSyncStatus = "synced";
  } catch (error) {
    await updateDocument(env, `bookings/${booking.id}`, {
      calendarSyncStatus: "failed",
      calendarLastError: error.message,
    });
    booking.calendarSyncStatus = "failed";
    booking.calendarLastError = error.message;
  }
  return booking;
}
