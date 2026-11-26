/* Yorkshire Autotech — bookings admin dashboard */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const backend = window.BookingBackend;

  const loginBox = document.getElementById("loginBox");
  const dashboard = document.getElementById("dashboard");
  const demoBanner = document.getElementById("demoBanner");

  if (!backend.isLive) {
    demoBanner.style.display = "block";
    document.getElementById("calendarStatus").textContent = "Google Calendar is available after the live server is configured.";
    document.getElementById("connectCalendar").disabled = true;
    document.getElementById("refreshCalendarStatus").disabled = true;
  }

  /* Must match the admin email in firestore.rules. */
  const ADMIN_EMAIL = "yorkshireautotech@outlook.com";

  /* ----- Auth ----- */
  backend.onAdminAuth((user) => {
    const signedIn = !!user;
    loginBox.style.display = signedIn || !backend.isLive ? "none" : "block";
    dashboard.style.display = signedIn ? "block" : "none";
    if (signedIn && backend.isLive) {
      const email = (user.email || "").toLowerCase();
      document.getElementById("signedInAs").textContent = `Signed in as ${user.email || "(no email)"}`;
      const warn = document.getElementById("adminAccountWarning");
      warn.textContent = email === ADMIN_EMAIL ? "" :
        `This account isn't the admin account (${ADMIN_EMAIL}), so bookings can't be loaded or changed. Sign out and sign in with ${ADMIN_EMAIL}.`;
      warn.classList.toggle("show", email !== ADMIN_EMAIL);
    }
    if (signedIn) loadBookings();
  });

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("loginError");
    errEl.classList.remove("show");
    try {
      await backend.adminSignIn(
        document.getElementById("adminEmail").value.trim(),
        document.getElementById("adminPassword").value
      );
    } catch {
      errEl.classList.add("show");
    }
  });

  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await backend.adminSignOut();
    if (!backend.isLive) location.reload();
  });

  document.getElementById("refreshBtn").addEventListener("click", loadBookings);
  document.getElementById("refreshCalendarStatus").addEventListener("click", loadCalendarStatus);
  document.getElementById("connectCalendar").addEventListener("click", async () => {
    const button = document.getElementById("connectCalendar");
    button.disabled = true;
    try {
      await backend.startCalendarConnection();
    } catch (err) {
      alert(err.message || "Google Calendar could not be connected.");
      button.disabled = false;
    }
  });
  document.getElementById("saveBookingConfig").addEventListener("click", saveBookingConfig);

  /* ----- Add a booking manually (existing/phone bookings) ----- */
  const abDate = document.getElementById("abDate");
  const abSlot = document.getElementById("abSlot");
  const abService = document.getElementById("abService");

  abDate.addEventListener("change", loadSlots);
  abService.addEventListener("change", loadSlots);

  async function loadSlots() {
    abSlot.innerHTML = '<option value="">Loading…</option>';
    abSlot.disabled = true;
    if (!abDate.value) { abSlot.innerHTML = '<option value="">Pick a date first</option>'; return; }
    try {
      const slots = await backend.getAvailableSlots(abDate.value, abService.value);
      abSlot.innerHTML = '<option value="">Choose a slot</option>' +
        slots.map((slot) => `<option value="${slot}">${backend.slotLabel(slot)}</option>`).join("");
    } catch (error) {
      abSlot.innerHTML = `<option value="">${esc(error.message)}</option>`;
      return;
    }
    abSlot.disabled = false;
  }

  /* ----- Paste from WhatsApp ----- */
  document.getElementById("waFillBtn").addEventListener("click", async () => {
    const out = document.getElementById("waPasteResult");
    const found = window.parseWhatsAppText(document.getElementById("waPaste").value);
    const filled = [];
    const missing = [];
    const set = (id, value, label) => {
      const el = document.getElementById(id);
      el.classList.remove("wa-filled");
      if (value) {
        el.value = value;
        el.classList.add("wa-filled");
        filled.push(label);
      } else if (!el.value) {
        missing.push(label);
      }
    };

    set("abName", found.name, "name");
    set("abPhone", found.phone, "phone");
    set("abVehicle", found.vehicle, "vehicle");
    set("abItems", found.service, "job");
    set("abNotes", found.notes, "notes");

    abDate.classList.remove("wa-filled");
    abSlot.classList.remove("wa-filled");
    if (found.date) {
      abDate.value = found.date;
      abDate.classList.add("wa-filled");
      filled.push("date");
      await loadSlots();
      const option = found.time && abSlot.querySelector(`option[value="${found.time}"]:not([disabled])`);
      if (option) {
        abSlot.value = found.time;
        abSlot.classList.add("wa-filled");
        filled.push("time");
      } else {
        missing.push(found.time ? "time (that slot isn't free or isn't open that day)" : "time");
      }
    } else {
      missing.push("date", "time");
    }

    out.textContent = (filled.length ? `Filled in: ${filled.join(", ")}. ` : "Couldn't find any details. ") +
      (missing.length ? `Please add: ${missing.join(", ")}. ` : "") + "Check everything before adding the booking.";
  });

  document.getElementById("addBookingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("addError");
    errEl.classList.remove("show");
    if (!abSlot.value) {
      errEl.textContent = "Please choose a time slot.";
      errEl.classList.add("show");
      return;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await backend.adminAddBooking({
        date: abDate.value,
        slot: abSlot.value,
        name: document.getElementById("abName").value.trim(),
        phone: document.getElementById("abPhone").value.trim(),
        email: "",
        vehicle: document.getElementById("abVehicle").value.trim(),
        serviceId: abService.value,
        items: document.getElementById("abItems").value.trim() || "Added by admin",
        total: 0,
        notes: document.getElementById("abNotes").value.trim(),
      });
      e.target.reset();
      document.querySelectorAll(".wa-filled").forEach((el) => el.classList.remove("wa-filled"));
      document.getElementById("waPaste").value = "";
      document.getElementById("waPasteResult").textContent = "";
      abSlot.innerHTML = '<option value="">Pick a date first</option>';
      abSlot.disabled = true;
      loadBookings();
    } catch (err) {
      errEl.textContent = err.message || "Couldn't add the booking — please try again.";
      errEl.classList.add("show");
    }
    btn.disabled = false;
  });

  /* ----- Rendering ----- */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function whenLabel(b) {
    const d = new Date(b.date + "T12:00:00");
    const dateStr = isNaN(d) ? b.date : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    return `${dateStr} · ${backend.slotLabel(b.slot, b.bookingSlotDuration || 60)}`;
  }

  function card(b) {
    const d = new Date(b.date + "T12:00:00");
    const niceDate = isNaN(d) ? b.date : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const contactMsg =
      `Hi ${b.name}, it's Yorkshire Autotech. Thanks for your booking request (${b.ref}) — ` +
      `${b.items} on ${niceDate} at ${backend.slotLabel(b.slot)}. ` +
      `We'd just like to confirm a few details with you before we book you in.`;
    const waBtn = b.phone
      ? `<a class="btn btn-outline" href="${backend.waLink(b.phone, contactMsg)}" target="_blank" rel="noopener">💬 WhatsApp</a>`
      : "";
    const emailBtn = b.email
      ? `<a class="btn btn-outline" href="mailto:${esc(b.email)}?subject=${encodeURIComponent(`Your booking request ${b.ref} — Yorkshire Autotech`)}&body=${encodeURIComponent(contactMsg)}">✉️ Email</a>`
      : "";
    const status = b.bookingStatus || b.status || "pending";
    const sync = b.calendarSyncStatus || "not_required";
    const eventUrl = b.googleCalendarEventId
      ? `https://calendar.google.com/calendar/u/0/r/eventedit/${encodeURIComponent(b.googleCalendarEventId)}`
      : "";
    const actions =
      ["pending", "pending_approval"].includes(status)
        ? `${waBtn}${emailBtn}
           <button class="btn btn-gold" data-booking-action="confirm" data-id="${esc(b.id)}">✓ Approve &amp; add to calendar</button>
           <button class="btn btn-danger" data-booking-action="reject" data-id="${esc(b.id)}">✕ Reject</button>
           <button class="btn btn-outline" data-edit="${esc(b.id)}">Edit details</button>
           <button class="btn btn-outline" data-reschedule="${esc(b.id)}">Change requested time</button>`
        : status === "confirmed"
          ? `${waBtn}${emailBtn}
             <button class="btn btn-gold" data-booking-action="complete" data-id="${esc(b.id)}">✓ Mark completed</button>
             <button class="btn btn-outline" data-reschedule="${esc(b.id)}">Reschedule</button>
             <button class="btn btn-outline" data-edit="${esc(b.id)}">Edit details</button>
             <button class="btn btn-danger" data-booking-action="cancel" data-id="${esc(b.id)}">Cancel &amp; free slot</button>`
          : waBtn + emailBtn;
    const photoMarkup = (b.uploadedImages || []).length
      ? `<div class="booking-photos">${b.uploadedImages.map((url) => `<a href="${esc(url)}" target="_blank" rel="noopener"><img class="booking-photo" src="${esc(url)}" alt="Customer supplied part"></a>`).join("")}</div>`
      : "";
    return `
      <div class="booking-card ${esc(status)}">
        <div class="bc-head">
          <span class="bc-when">${whenLabel(b)}</span>
          <span><span class="status-pill ${esc(status)}">${esc(status.replace("_", " "))}</span> <span class="bc-ref">${esc(b.ref)}</span></span>
        </div>
        <div class="bc-grid">
          <span><strong>${esc(b.name)}</strong></span>
          ${b.phone ? `<span>📞 ${esc(b.phone)}</span>` : ""}
          ${b.email ? `<span>✉️ ${esc(b.email)}</span>` : ""}
          ${b.vehicle ? `<span>🚗 ${esc(b.vehicle)}</span>` : ""}
          <span>🛠 ${esc(b.items || b.service)}${Number(b.total) > 0 ? ` — £${Number(b.total).toLocaleString("en-GB")}` : ""}</span>
          <span>Type: <strong>${esc(b.bookingType === "supply-and-fit" ? "Supply & Fit" : "Fitting Only")}</strong></span>
          <span>Reserved: <strong>${Number(b.bookingSlotDuration || 60)} minutes</strong></span>
          <span>Estimated work: <strong>${Number(b.estimatedJobDuration || b.bookingSlotDuration || 60)} minutes</strong></span>
          ${b.registration ? `<span>Registration: <strong>${esc(b.registration)}</strong></span>` : ""}
          ${b.partDetails ? `<span>Parts: ${esc(b.partDetails)}</span>` : ""}
          ${b.productLink ? `<span><a class="gold-text" href="${esc(b.productLink)}" target="_blank" rel="noopener">Product link</a></span>` : ""}
          ${b.fittingLocation ? `<span>Location: ${esc(b.fittingLocation)}${b.address ? ` — ${esc(b.address)}` : ""}</span>` : ""}
          ${b.notes ? `<span>📝 ${esc(b.notes)}</span>` : ""}
          ${b.additionalInformation ? `<span>Details: ${esc(b.additionalInformation)}</span>` : ""}
        </div>
        <div class="bc-grid">
          <span>Calendar: <span class="sync-status ${esc(sync)}">${esc(sync.replace("_", " "))}</span></span>
          ${eventUrl ? `<span><a class="gold-text" href="${eventUrl}" target="_blank" rel="noopener">View Google Calendar event</a></span>` : ""}
          ${b.calendarLastError ? `<span style="color:#e06c6c">${esc(b.calendarLastError)}</span>` : ""}
        </div>
        ${photoMarkup}
        <div class="bc-actions">${actions}${sync === "failed" ? `<button class="btn btn-outline" data-booking-action="retry-sync" data-id="${esc(b.id)}">↻ Retry calendar sync</button>` : ""}</div>
      </div>`;
  }

  let bookings = [];

  async function loadBookings() {
    try {
      bookings = await backend.getBookings();
    } catch (err) {
      alert("Couldn't load bookings: " + err.message);
      return;
    }
    renderBookings();
    populateServiceFilter();
    loadEnquiries();
  }

  function filteredBookings() {
    const search = document.getElementById("bookingSearch")?.value.trim().toLowerCase() || "";
    const service = document.getElementById("bookingServiceFilter")?.value || "";
    const type = document.getElementById("bookingTypeFilter")?.value || "";
    return bookings.filter((booking) => {
      const searchable = [booking.name, booking.ref, booking.registration, booking.phone, booking.email]
        .filter(Boolean).join(" ").toLowerCase();
      return (!search || searchable.includes(search))
        && (!service || booking.serviceId === service || booking.items === service || booking.service === service)
        && (!type || booking.bookingType === type);
    });
  }

  function renderBookings() {
    const list = filteredBookings();
    const byStatus = (...statuses) => list.filter((b) => statuses.includes(b.bookingStatus || b.status));
    const fill = (elId, items, empty) => {
      document.getElementById(elId).innerHTML =
        items.length ? items.map(card).join("") : `<p class="admin-empty">${empty}</p>`;
    };
    fill("pendingList", byStatus("pending", "pending_approval"), "No pending requests.");
    fill("confirmedList", byStatus("confirmed"), "Nothing confirmed yet.");
    fill("completedList", byStatus("completed"), "Nothing completed yet.");
    fill("rejectedList", byStatus("rejected", "cancelled"), "None.");

    document.querySelectorAll("[data-booking-action]").forEach((btn) =>
      btn.addEventListener("click", () => act(btn.dataset.id, btn.dataset.bookingAction, btn))
    );
    document.querySelectorAll("[data-reschedule]").forEach((btn) =>
      btn.addEventListener("click", () => rescheduleBooking(btn.dataset.reschedule))
    );
    document.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => editBooking(btn.dataset.edit))
    );
  }

  function populateServiceFilter() {
    const select = document.getElementById("bookingServiceFilter");
    const services = [...new Set(bookings.map((booking) => booking.service || booking.items).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All services</option>' +
      services.map((service) => `<option value="${esc(service)}">${esc(service)}</option>`).join("");
  }

  ["bookingSearch", "bookingServiceFilter", "bookingTypeFilter"].forEach((id) => {
    document.getElementById(id).addEventListener(id === "bookingSearch" ? "input" : "change", renderBookings);
  });

  function enquiryCard(q) {
    const created = new Date(q.createdAt);
    const when = isNaN(created) ? "" : created.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const replyMsg = `Hi ${q.name}, it's Yorkshire Autotech. Thanks for your quote enquiry (${q.ref}) about ${q.service}.`;
    const waBtn = q.phone
      ? `<a class="btn btn-outline" href="${backend.waLink(q.phone, replyMsg)}" target="_blank" rel="noopener">💬 WhatsApp</a>`
      : "";
    const emailBtn = q.email
      ? `<a class="btn btn-outline" href="mailto:${esc(q.email)}?subject=${encodeURIComponent(`Your quote enquiry ${q.ref} — Yorkshire Autotech`)}&body=${encodeURIComponent(replyMsg)}">✉️ Email</a>`
      : "";
    const handled = q.status === "handled";
    return `
      <div class="booking-card ${handled ? "rejected" : "pending"}">
        <div class="bc-head">
          <span class="bc-when">${esc(when)}</span>
          <span><span class="status-pill ${handled ? "rejected" : "pending"}">${handled ? "handled" : "new"}</span> <span class="bc-ref">${esc(q.ref)}</span></span>
        </div>
        <div class="bc-grid">
          <span><strong>${esc(q.name)}</strong></span>
          ${q.phone ? `<span>📞 ${esc(q.phone)}</span>` : ""}
          ${q.email ? `<span>✉️ ${esc(q.email)}</span>` : ""}
          ${q.vehicle ? `<span>🚗 ${esc(q.vehicle)}</span>` : ""}
          <span>🛠 ${esc(q.service)}</span>
          ${q.message ? `<span>📝 ${esc(q.message)}</span>` : ""}
        </div>
        <div class="bc-actions">${waBtn}${emailBtn}
          <button class="btn ${handled ? "btn-outline" : "btn-gold"}" data-enq="${esc(q.id)}" data-enq-status="${handled ? "new" : "handled"}">${handled ? "↺ Mark as new" : "✓ Mark handled"}</button>
        </div>
      </div>`;
  }

  async function loadEnquiries() {
    const el = document.getElementById("enquiryList");
    if (!el) return;
    let enquiries = [];
    try {
      enquiries = await backend.getEnquiries();
    } catch (err) {
      el.innerHTML = `<p class="admin-empty">Couldn't load enquiries: ${esc(err.message)}</p>`;
      return;
    }
    el.innerHTML = enquiries.length
      ? enquiries.map(enquiryCard).join("")
      : `<p class="admin-empty">No enquiries yet.</p>`;
    el.querySelectorAll("[data-enq]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await backend.setEnquiryStatus(btn.dataset.enq, btn.dataset.enqStatus);
        } catch (err) {
          alert(err.message || "Something went wrong — please try again.");
        }
        loadEnquiries();
      })
    );
  }

  async function act(id, action, btn) {
    const booking = bookings.find((b) => String(b.id) === String(id));
    if (!booking) return;
    if (action === "cancel" &&
        !confirm("Cancel this confirmed booking and make the slot available again?")) return;
    if (action === "reject" && !confirm("Reject this booking request?")) return;
    btn.disabled = true;
    try {
      await backend.adminBookingAction(id, { action });
    } catch (err) {
      alert(err.message || "Something went wrong — please try again.");
    }
    loadBookings();
  }

  async function rescheduleBooking(id) {
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;
    const date = prompt("New appointment date (YYYY-MM-DD)", booking.date);
    if (!date) return;
    const slot = prompt("New start time (HH:MM)", booking.slot);
    if (!slot) return;
    const duration = prompt("Calendar slot duration in minutes", booking.bookingSlotDuration || 60);
    if (!duration) return;
    try {
      const result = await backend.adminBookingAction(id, {
        action: "reschedule",
        date,
        slot,
        bookingSlotDuration: Number(duration),
      });
      if (result.message) alert(result.message);
      loadBookings();
    } catch (error) {
      alert(error.message || "The booking could not be rescheduled.");
    }
  }

  async function editBooking(id) {
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;
    const fields = ["name", "phone", "email", "vehicle", "registration", "notes", "estimatedJobDuration"];
    const updates = {};
    for (const field of fields) {
      const replacement = prompt(
        `${field === "estimatedJobDuration" ? "Estimated work duration (minutes)" : field} — leave blank to keep current`,
        booking[field] == null ? "" : String(booking[field])
      );
      if (replacement === null) return;
      if (replacement !== "" && replacement !== String(booking[field] || "")) {
        updates[field] = field === "estimatedJobDuration" ? Number(replacement) : replacement;
      }
    }
    if (!Object.keys(updates).length) return;
    try {
      await backend.adminBookingAction(id, { action: "update", ...updates });
      loadBookings();
    } catch (error) {
      alert(error.message || "The booking could not be updated.");
    }
  }

  async function loadCalendarStatus() {
    const output = document.getElementById("calendarStatus");
    try {
      const status = await backend.calendarStatus();
      output.textContent = status.connected
        ? `Connected to ${status.calendarId}.`
        : `Not connected${status.message ? ` — ${status.message}` : "."}`;
      output.className = `calendar-status ${status.connected ? "connected" : ""}`;
      document.getElementById("connectCalendar").textContent = status.connected ? "Reconnect Google Calendar" : "Connect Google Calendar";
    } catch (error) {
      output.textContent = error.message;
      output.className = "calendar-status error";
    }
  }

  async function loadBookingConfig() {
    const field = document.getElementById("bookingConfigJson");
    try {
      field.value = JSON.stringify(await backend.getAdminBookingConfig(), null, 2);
      const config = JSON.parse(field.value);
      abService.innerHTML = config.services.map((service) =>
        `<option value="${esc(service.id)}">${esc(service.name)}</option>`
      ).join("");
    } catch (error) {
      field.value = JSON.stringify({ error: error.message }, null, 2);
    }
  }

  async function saveBookingConfig() {
    const error = document.getElementById("configError");
    error.classList.remove("show");
    try {
      const config = JSON.parse(document.getElementById("bookingConfigJson").value);
      await backend.saveAdminBookingConfig(config);
      alert("Booking configuration saved.");
    } catch (err) {
      error.textContent = err.message || "The configuration could not be saved.";
      error.classList.add("show");
    }
  }

  const params = new URLSearchParams(location.search);
  if (params.has("calendar")) {
    alert(params.get("calendar") === "connected"
      ? "Google Calendar connected successfully."
      : `Google Calendar was not connected: ${params.get("message") || "Please try again."}`);
    history.replaceState(null, "", location.pathname);
  }

  backend.onAdminAuth((user) => {
    if (user && backend.isLive) {
      loadCalendarStatus();
      loadBookingConfig();
    }
  });
});
