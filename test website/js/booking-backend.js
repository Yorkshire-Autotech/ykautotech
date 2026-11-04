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

  function slotLabel(slot) {
    const [h, m] = slot.split(":").map(Number);
    const fmt = (hh, mm) => {
      const suffix = hh >= 12 ? "pm" : "am";
      const h12 = ((hh + 11) % 12) + 1;
      return `${h12}:${String(mm).padStart(2, "0")}${suffix}`;
    };
    return `${fmt(h, m)} – ${fmt(h + 1, m)}`;
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

  /* ----- Public API ----- */
  const api = {
    isLive,
    slotsForDate,
    slotLabel,
    waLink,
    toIntlPhone,
    businessWhatsApp: WHATSAPP_NUMBER,

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
        status: "pending",
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
    },

    /* ===== Admin functions (admin.html) ===== */

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
      const record = Object.assign({}, booking, {
        ref: "YA-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });
      const slotId = `${record.date}_${record.slot}`;
      if (isLive) {
        const slotRef = db.collection("availability").doc(slotId);
        const bookingRef = db.collection("bookings").doc();
        await db.runTransaction(async (tx) => {
          const slotDoc = await tx.get(slotRef);
          if (slotDoc.exists) throw new Error("That slot is already confirmed for another booking.");
          tx.set(bookingRef, record);
          tx.set(slotRef, { date: record.date, slot: record.slot, bookingId: bookingRef.id });
        });
      } else {
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
