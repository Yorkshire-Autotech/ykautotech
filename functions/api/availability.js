import { bookingConfig, serviceById } from "../_config.js";
import {
  calendarRequest,
  errorResponse,
  HttpError,
  json,
  overlaps,
  queryDocuments,
  zonedDateTime,
  addMinutes,
} from "../_lib.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || "";
    const serviceId = url.searchParams.get("serviceId") || "";
    const overrideMinutes = Number(url.searchParams.get("duration") || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, "A valid date is required.", "invalid_date");
    }
    const config = await bookingConfig(env);
    const service = serviceById(config, serviceId);
    const duration = overrideMinutes || Number(service?.slotMinutes || 60);
    if (duration < 15 || duration > 720) {
      throw new HttpError(400, "Appointment duration is invalid.", "invalid_duration");
    }
    const day = new Date(`${date}T12:00:00`).getDay();
    const now = Date.now();
    const earliest = now + Number(config.bookingLeadHours || 0) * 3_600_000;
    const latest = now + Number(config.maxAdvanceDays || 180) * 86_400_000;
    const dateTime = new Date(`${date}T23:59:59`).getTime();
    if (config.holidays.includes(date) || dateTime < earliest || dateTime > latest) {
      return json({ date, duration, slots: [], reason: "outside_booking_window" });
    }
    const periods = config.workingHours[String(day)] || [];
    if (!periods.length) return json({ date, duration, slots: [], reason: "closed" });

    const timeZone = env.BUSINESS_TIME_ZONE || "Europe/London";
    const timeMin = zonedDateTime(date, "00:00", timeZone);
    const timeMax = zonedDateTime(date, "23:59", timeZone);
    const busyData = await calendarRequest(env, "/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone,
        items: [{ id: env.GOOGLE_CALENDAR_ID }],
      }),
    });
    const googleBusy = (busyData.calendars?.[env.GOOGLE_CALENDAR_ID]?.busy || []).map((busy) => ({
      start: new Date(busy.start).getTime(),
      end: new Date(busy.end).getTime(),
    }));
    const localBusy = await queryDocuments(env, "availability", "date", "EQUAL", date);
    const firebaseBusy = localBusy.map((record) => ({
      start: new Date(zonedDateTime(record.date, record.slot, timeZone)).getTime(),
      end: new Date(
        zonedDateTime(record.date, addMinutes(record.slot, Number(record.bookingSlotDuration || 60)), timeZone)
      ).getTime(),
    }));
    const busy = [...googleBusy, ...firebaseBusy];
    const slots = [];
    const increment = Math.max(15, Number(config.slotIncrementMinutes || 30));
    for (const period of periods) {
      for (let time = period.start; time < period.end; time = addMinutes(time, increment)) {
        const endTime = addMinutes(time, duration);
        if (endTime > period.end) continue;
        const startMs = new Date(zonedDateTime(date, time, timeZone)).getTime();
        const endMs = new Date(zonedDateTime(date, endTime, timeZone)).getTime();
        if (startMs < earliest) continue;
        if (!busy.some((item) => overlaps(startMs, endMs, item.start, item.end))) slots.push(time);
      }
    }
    return json({ date, duration, slots: [...new Set(slots)] });
  } catch (error) {
    return errorResponse(error);
  }
}
