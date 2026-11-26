import { createBooking } from "../_booking.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    const booking = await createBooking(env, await readJson(request));
    return json(
      {
        id: booking.id,
        ref: booking.ref,
        status: booking.bookingStatus,
        date: booking.date,
        slot: booking.slot,
        bookingSlotDuration: booking.bookingSlotDuration,
        estimatedJobDuration: booking.estimatedJobDuration,
        calendarSyncStatus: booking.calendarSyncStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
