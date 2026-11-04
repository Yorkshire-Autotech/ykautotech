/* Yorkshire Autotech — bookings admin dashboard */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const backend = window.BookingBackend;

  const loginBox = document.getElementById("loginBox");
  const dashboard = document.getElementById("dashboard");
  const demoBanner = document.getElementById("demoBanner");

  if (!backend.isLive) demoBanner.style.display = "block";

  /* Must match the admin email in firestore.rules */
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

  /* ----- Add a booking manually (existing/phone bookings) ----- */
  const abDate = document.getElementById("abDate");
  const abSlot = document.getElementById("abSlot");

  abDate.addEventListener("change", async () => {
    abSlot.innerHTML = '<option value="">Loading…</option>';
    abSlot.disabled = true;
    if (!abDate.value) { abSlot.innerHTML = '<option value="">Pick a date first</option>'; return; }
    let booked = [];
    try { booked = await backend.getConfirmedSlots(abDate.value); } catch { /* show all */ }
    const slots = backend.slotsForDate(abDate.value);
    abSlot.innerHTML = '<option value="">Choose a slot</option>' + slots.map((s) => {
      const taken = booked.includes(s);
      return `<option value="${s}" ${taken ? "disabled" : ""}>${backend.slotLabel(s)}${taken ? " — booked" : ""}</option>`;
    }).join("");
    abSlot.disabled = false;
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
        vehicle: "",
        items: document.getElementById("abItems").value.trim() || "Added by admin",
        total: 0,
        notes: document.getElementById("abNotes").value.trim(),
      });
      e.target.reset();
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
    return `${dateStr} · ${backend.slotLabel(b.slot)}`;
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
    const actions =
      b.status === "pending"
        ? `${waBtn}${emailBtn}
           <button class="btn btn-gold" data-confirm="${b.id}">✓ Confirm — block this slot</button>
           <button class="btn btn-danger" data-reject="${b.id}">✕ Reject</button>`
        : b.status === "confirmed"
          ? `${waBtn}${emailBtn}
             <button class="btn btn-danger" data-reject="${b.id}">Cancel booking — free the slot</button>`
          : "";
    return `
      <div class="booking-card ${b.status}">
        <div class="bc-head">
          <span class="bc-when">${whenLabel(b)}</span>
          <span><span class="status-pill ${b.status}">${b.status}</span> <span class="bc-ref">${esc(b.ref)}</span></span>
        </div>
        <div class="bc-grid">
          <span><strong>${esc(b.name)}</strong></span>
          ${b.phone ? `<span>📞 ${esc(b.phone)}</span>` : ""}
          ${b.email ? `<span>✉️ ${esc(b.email)}</span>` : ""}
          ${b.vehicle ? `<span>🚗 ${esc(b.vehicle)}</span>` : ""}
          <span>🛠 ${esc(b.items)}${Number(b.total) > 0 ? ` — £${Number(b.total).toLocaleString("en-GB")}` : ""}</span>
          ${b.notes ? `<span>📝 ${esc(b.notes)}</span>` : ""}
        </div>
        <div class="bc-actions">${actions}</div>
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
    const byStatus = (s) => bookings.filter((b) => b.status === s);
    const fill = (elId, list, empty) => {
      document.getElementById(elId).innerHTML =
        list.length ? list.map(card).join("") : `<p class="admin-empty">${empty}</p>`;
    };
    fill("pendingList", byStatus("pending"), "No pending requests. 🎉");
    fill("confirmedList", byStatus("confirmed"), "Nothing confirmed yet.");
    fill("rejectedList", byStatus("rejected"), "None.");

    document.querySelectorAll("[data-confirm]").forEach((btn) =>
      btn.addEventListener("click", () => act(btn.dataset.confirm, "confirm", btn))
    );
    document.querySelectorAll("[data-reject]").forEach((btn) =>
      btn.addEventListener("click", () => act(btn.dataset.reject, "reject", btn))
    );
  }

  async function act(id, action, btn) {
    const booking = bookings.find((b) => String(b.id) === String(id));
    if (!booking) return;
    if (action === "reject" && booking.status === "confirmed" &&
        !confirm("Cancel this confirmed booking and make the slot available again?")) return;
    btn.disabled = true;
    try {
      if (action === "confirm") await backend.confirmBooking(booking);
      else await backend.rejectBooking(booking);
    } catch (err) {
      alert(err.message || "Something went wrong — please try again.");
    }
    loadBookings();
  }
});
