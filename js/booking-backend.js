/* Yorkshire Autotech — booking backend.
 *
 * One small API used by the booking modal (main.js) and the admin page (admin.js).
 * If js/firebase-config.js contains real Firebase keys it talks to Cloud Firestore,
 * so confirmed slots are blocked for every visitor. Otherwise it falls back to a
 * DEMO MODE backed by localStorage (this browser only) so the flow can be tested.
 *
 * Firestore data model:
 *   bookings/{id}      — full booking request (customer details). NOT publicly readable.
 *   availability/{id}  — "{date}_{slot}" docs for CONFIRMED bookings only.
 *                        Publicly readable (contains no personal data) so the
 *                        website can grey out taken slots.
 */
(function () {
  "use strict";

  /* ----- Business contact details for booking notifications ----- */
  const NOTIFY_EMAIL = "yorkshireautotech@outlook.com";
  const WHATSAPP_NUMBER = "+447476173159";

  /* Convert a UK phone number to international wa.me format */
  function toIntlPhone(phone) {
    const digits = String(phone || "").replace(/[^\d]/g, "");
    if (digits.startsWith("44")) return digits;
    if (digits.startsWith("0")) return "44" + digits.slice(1);
    return digits;
  }

  /* Build a WhatsApp click-to-chat link */
  function waLink(number, text) {
    return `https://wa.me/${toIntlPhone(number)}?text=${encodeURIComponent(text)}`;
  }

  /* ----- Slot schedule: 1 hour slots, back to back -----
   * Sat–Thu 9:00–17:00  → 09:00 … 16:00
   * Friday  14:00–17:00 → 14:00, 15:00, 16:00
   */
  const WEEK_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  const FRIDAY_SLOTS = ["14:00", "15:00", "16:00"];

  function slotsForDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d)) return [];
    return d.getDay() === 5 ? FRIDAY_SLOTS.slice() : WEEK_SLOTS.slice();
  }

  function slotLabel(slot, duration = 60) {
    const [h, m] = slot.split(":").map(Number);
    const fmt = (hh, mm) => {
      hh = hh + Math.floor(mm / 60);
      mm = mm % 60;
      const suffix = hh >= 12 ? "pm" : "am";
      const h12 = ((hh + 11) % 12) + 1;
      return `${h12}:${String(mm).padStart(2, "0")}${suffix}`;
    };
    const end = h * 60 + m + Number(duration);
    return `${fmt(h, m)} – ${fmt(Math.floor(end / 60), end % 60)}`;
  }

  /* ----- Firebase vs demo mode ----- */
  const cfg = window.FIREBASE_CONFIG || {};
  const isLive =
    typeof firebase !== "undefined" &&
    cfg.apiKey && cfg.projectId &&
    !String(cfg.apiKey).startsWith("PASTE-");

  let db = null;
  if (isLive) {
    firebase.initializeApp(cfg);
    db = firebase.firestore();
  }

  /* ----- Demo-mode storage (localStorage, this browser only) ----- */
  const DEMO_KEY = "ya_demo_bookings";
  const demoRead = () => {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch { return []; }
  };
  const demoWrite = (list) => localStorage.setItem(DEMO_KEY, JSON.stringify(list));
  const DEMO_ENQ_KEY = "ya_demo_enquiries";
  const demoReadEnquiries = () => {
    try { return JSON.parse(localStorage.getItem(DEMO_ENQ_KEY)) || []; } catch { return []; }
  };
  const demoWriteEnquiries = (list) => localStorage.setItem(DEMO_ENQ_KEY, JSON.stringify(list));

  /* ----- Public API ----- */
  const api = {
    isLive,
    slotsForDate,
    slotLabel,
    waLink,
    toIntlPhone,
    businessWhatsApp: WHATSAPP_NUMBER,

    async getBookingConfig() {
      if (!isLive) return null;
      const response = await fetch("/api/config");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Booking configuration is unavailable.");
      return data;
    },

    async getAvailableSlots(dateStr, serviceId, duration, bookingType = "fitting-only") {
      if (!isLive) {
        const booked = await api.getConfirmedSlots(dateStr);
        return slotsForDate(dateStr).filter((slot) => !booked.includes(slot));
      }
      const params = new URLSearchParams({ date: dateStr, serviceId: serviceId || "" });
      if (duration) params.set("duration", duration);
      params.set("bookingType", bookingType);
      const response = await fetch(`/api/availability?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Availability could not be checked.");
      return data.slotOptions ||
        (data.slots || []).map((time) => ({ time, available: true }));
    },

    async adminApi(path, options = {}) {
      if (!isLive) throw new Error("Admin API is unavailable in demo mode.");
      const user = firebase.auth().currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const response = await fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The admin request failed.");
      return data;
    },

    async createCalendarBooking(booking) {
      if (!isLive) return api.submitBooking(booking);
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The booking could not be saved.");
      fetch(`https://formsubmit.co/ajax/${NOTIFY_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `${data.status === "pending_approval" ? "Booking approval request" : "Booking confirmed"} ${data.ref}`,
          _template: "table",
          Reference: data.ref,
          Name: booking.name,
          Phone: booking.phone,
          Email: booking.email,
          Vehicle: [booking.vehicleYear, booking.vehicleMake, booking.vehicleModel].filter(Boolean).join(" "),
          Registration: booking.registration || "Not supplied",
          Service: booking.serviceId,
          "Booking type": booking.bookingType,
          Date: data.date,
          Slot: data.slot,
          "Reserved minutes": data.bookingSlotDuration,
          "Estimated work minutes": data.estimatedJobDuration,
          Notes: booking.notes || "None",
        }),
      }).catch(() => {});
      return data;
    },

    async calendarStatus() {
      return api.adminApi("/api/calendar/status");
    },

    async startCalendarConnection() {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error("Please sign in again.");
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/calendar/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Calendar authorisation could not start.");
      location.assign("/api/calendar/connect");
    },

    async adminBookingAction(id, payload) {
      if (!isLive) {
        const booking = (await api.getBookings()).find((item) => item.id === id);
        if (!booking) throw new Error("Booking not found.");
        if (payload.action === "confirm") return api.confirmBooking(booking);
        if (payload.action === "reject" || payload.action === "cancel") return api.rejectBooking(booking);
        const list = demoRead();
        const target = list.find((item) => item.id === id);
        Object.assign(target || {}, payload);
        if (payload.action === "complete") Object.assign(target || {}, { status: "completed", bookingStatus: "completed" });
        delete (target || {}).action;
        demoWrite(list);
        return { ok: true };
      }
      return api.adminApi(`/api/admin/bookings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    async getAdminBookingConfig() {
      return api.adminApi("/api/admin/config");
    },

    async saveAdminBookingConfig(config) {
      return api.adminApi("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
    },

    /* Slots already confirmed (and therefore unavailable) on a given date. */
    async getConfirmedSlots(dateStr) {
      if (isLive) {
        const snap = await db.collection("availability").where("date", "==", dateStr).get();
        return snap.docs.map((d) => d.data().slot);
      }
      return demoRead()
        .filter((b) => b.date === dateStr && b.status === "confirmed")
        .map((b) => b.slot);
    },

    /* Customer submits a booking request — stored as "pending". */
    async submitBooking(booking) {
      const record = Object.assign({}, booking, {
        status: booking.approvalRequired ? "pending" : "confirmed",
        bookingStatus: booking.approvalRequired ? "pending_approval" : "confirmed",
        calendarSyncStatus: "not_required",
        createdAt: new Date().toISOString(),
      });
      if (isLive) {
        await db.collection("bookings").add(record);
      } else {
        const list = demoRead();
        record.id = "demo-" + Date.now();
        list.push(record);
        demoWrite(list);
      }
      /* Fire-and-forget email notification to the business — a failure here
       * must never block the booking, which is already safely stored. */
      try {
        fetch(`https://formsubmit.co/ajax/${NOTIFY_EMAIL}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: `New booking request ${record.ref} — ${record.date} ${slotLabel(record.slot)}`,
            _template: "table",
            Reference: record.ref,
            Name: record.name,
            Phone: record.phone,
            Email: record.email,
            Vehicle: record.vehicle || "—",
            Services: record.items,
            Total: "£" + Number(record.total || 0).toLocaleString("en-GB"),
            Date: record.date,
            Slot: slotLabel(record.slot),
            Notes: record.notes || "—",
          }),
        }).catch(() => {});
      } catch { /* ignore */ }
      return record;
    },

    /* Quote enquiry from the contact form — saved silently for the admin. */
    async submitEnquiry(enquiry) {
      const record = Object.assign({}, enquiry, {
        status: "new",
        createdAt: new Date().toISOString(),
      });
      if (isLive) {
        await db.collection("enquiries").add(record);
      } else {
        const list = demoReadEnquiries();
        record.id = "demo-enq-" + Date.now();
        list.push(record);
        demoWriteEnquiries(list);
      }
    },

    /* ===== Admin functions (admin.html) ===== */

    async getEnquiries() {
      if (isLive) {
        const snap = await db.collection("enquiries").orderBy("createdAt", "desc").get();
        return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      }
      return demoReadEnquiries().slice().reverse();
    },

    async setEnquiryStatus(id, status) {
      if (isLive) {
        await db.collection("enquiries").doc(id).update({ status });
      } else {
        const list = demoReadEnquiries();
        const target = list.find((e) => e.id === id);
        if (target) target.status = status;
        demoWriteEnquiries(list);
      }
    },

    async adminSignIn(email, password) {
      if (!isLive) return; // demo mode needs no login
      await firebase.auth().signInWithEmailAndPassword(email, password);
    },

    async adminSignOut() {
      if (isLive) await firebase.auth().signOut();
    },

    /* Resolves with the signed-in user (or null). In demo mode always "signed in". */
    onAdminAuth(callback) {
      if (!isLive) { callback({ email: "demo" }); return; }
      firebase.auth().onAuthStateChanged(callback);
    },

    async getBookings() {
      if (isLive) {
        const snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
        return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      }
      return demoRead().slice().reverse();
    },

    /* Admin adds an existing booking directly — created as confirmed, slot blocked immediately. */
    async adminAddBooking(booking) {
      if (isLive) {
        return api.adminApi("/api/admin/bookings", {
          method: "POST",
          body: JSON.stringify(booking),
        });
      }
      const record = Object.assign({}, booking, {
        ref: "YA-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });
      const slotId = `${record.date}_${record.slot}`;
      {
        const list = demoRead();
        const clash = list.find((b) => b.date === record.date && b.slot === record.slot && b.status === "confirmed");
        if (clash) throw new Error("That slot is already confirmed for another booking.");
        record.id = "demo-" + Date.now();
        list.push(record);
        demoWrite(list);
      }
    },

    /* Confirm a booking: mark it confirmed and block its slot site-wide.
     * Fails if that slot was already confirmed for another booking. */
    async confirmBooking(booking) {
      const slotId = `${booking.date}_${booking.slot}`;
      if (isLive) {
        const slotRef = db.collection("availability").doc(slotId);
        const bookingRef = db.collection("bookings").doc(booking.id);
        await db.runTransaction(async (tx) => {
          const slotDoc = await tx.get(slotRef);
          if (slotDoc.exists && slotDoc.data().bookingId !== booking.id) {
            throw new Error("That slot has already been confirmed for another booking.");
          }
          tx.set(slotRef, { date: booking.date, slot: booking.slot, bookingId: booking.id });
          tx.update(bookingRef, { status: "confirmed" });
        });
      } else {
        const list = demoRead();
        const clash = list.find(
          (b) => b.id !== booking.id && b.date === booking.date && b.slot === booking.slot && b.status === "confirmed"
        );
        if (clash) throw new Error("That slot has already been confirmed for another booking.");
        const target = list.find((b) => b.id === booking.id);
        if (target) target.status = "confirmed";
        demoWrite(list);
      }
    },

    /* Reject a pending request, or cancel a confirmed one (frees the slot again). */
    async rejectBooking(booking) {
      const slotId = `${booking.date}_${booking.slot}`;
      if (isLive) {
        if (booking.status === "confirmed") {
          await db.collection("availability").doc(slotId).delete();
        }
        await db.collection("bookings").doc(booking.id).update({ status: "rejected" });
      } else {
        const list = demoRead();
        const target = list.find((b) => b.id === booking.id);
        if (target) target.status = "rejected";
        demoWrite(list);
      }
    },
  };

  window.BookingBackend = api;
})();
