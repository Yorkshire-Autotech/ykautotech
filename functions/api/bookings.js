import { createBooking } from "../_booking.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    const input = await readJson(request);
    const booking = await createBooking(env, input);
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
