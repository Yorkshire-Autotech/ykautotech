/* Yorkshire Autotech — shared site behaviour */

document.addEventListener("DOMContentLoaded", () => {
  /* ----- Sticky header ----- */
  const header = document.getElementById("siteHeader");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ----- Mobile nav toggle ----- */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
    navLinks.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => navLinks.classList.remove("open"))
    );
    // A menu opened on a narrow viewport should not remain open when the browser is widened.
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) navLinks.classList.remove("open");
    }, { passive: true });
  }

  /* ----- Scroll reveal animations ----- */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  /* ----- Footer year ----- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----- Hero rotating service word ----- */
  const rotator = document.getElementById("heroRotator");
  if (rotator) {
    const words = [
      "Coding & Retrofits",
      "Ambient Lighting",
      "Apple CarPlay & Android Auto",
      "Starlight Headlining",
      "Reverse Cameras",
      "Dashcams",
      "Steering Wheel Upgrades",
      "Virtual Cockpits",
    ];
    let wi = 0;
    setInterval(() => {
      rotator.classList.add("swap");
      setTimeout(() => {
        wi = (wi + 1) % words.length;
        rotator.textContent = words[wi];
        rotator.classList.remove("swap");
      }, 400);
    }, 2600);
  }

  /* ----- Cart badge (shared with shop) ----- */
  updateCartBadge();

  /* ----- Nav CTA: Checkout Now opens slot picker when basket has items ----- */
  document.getElementById("navCta")?.addEventListener("click", (e) => {
    const cta = e.currentTarget;
    if (cta.dataset.mode === "checkout") {
      e.preventDefault();
      openSlotPickerFromBasket();
    }
  });

  /* ----- Booking form vehicle dropdowns ----- */
  const formMake = document.getElementById("formMake");
  const formModel = document.getElementById("formModel");
  const formYear = document.getElementById("formYear");
  if (formMake && formModel && formYear) {
    Object.keys(BOOKING_VEHICLES).forEach((m) => formMake.add(new Option(m, m)));

    formMake.addEventListener("change", () => {
      formModel.innerHTML = '<option value="">Model</option>';
      formYear.innerHTML = '<option value="">Year</option>';
      formYear.disabled = true;
      if (formMake.value) {
        Object.keys(BOOKING_VEHICLES[formMake.value]).forEach((m) => formModel.add(new Option(m, m)));
        formModel.disabled = false;
      } else formModel.disabled = true;
    });

    formModel.addEventListener("change", () => {
      formYear.innerHTML = '<option value="">Year</option>';
      if (formModel.value) {
        const { from, to } = BOOKING_VEHICLES[formMake.value][formModel.value];
        for (let y = to; y >= from; y--) formYear.add(new Option(y, y));
        formYear.disabled = false;
      } else formYear.disabled = true;
    });
  }

  /* ----- Booking form ----- */
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = (id) => (document.getElementById(id) || {}).value || "";
      const vehicle = [val("formYear"), val("formMake"), val("formModel")].filter(Boolean).join(" ");
      const enquiry = {
        ref: "YQ-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        name: val("name").trim(),
        phone: val("phone").trim(),
        email: val("email").trim(),
        vehicle,
        service: val("service"),
        message: val("message").trim(),
      };

      const backend = window.BookingBackend;
      if (backend) backend.submitEnquiry(enquiry).catch(() => {});

      const waMessage =
        `Hi Yorkshire Autotech! I'd like a free quote.\n\n` +
        `Reference: ${enquiry.ref}\n` +
        `Name: ${enquiry.name}\n` +
        `Phone: ${enquiry.phone}\n` +
        `Email: ${enquiry.email}\n` +
        (vehicle ? `Vehicle: ${vehicle}\n` : "") +
        `Service: ${enquiry.service}\n` +
        (enquiry.message ? `Message: ${enquiry.message}\n` : "") +
        `\nThanks!`;
      const waHref = backend
        ? backend.waLink(backend.businessWhatsApp, waMessage)
        : `https://wa.me/447476173159?text=${encodeURIComponent(waMessage)}`;
      window.open(waHref, "_blank", "noopener");

      const success = document.getElementById("formSuccess");
      if (success) {
        success.innerHTML =
          `⚠️ <strong>Almost done — your enquiry isn't sent until you press send in WhatsApp.</strong><br>` +
          `WhatsApp should have opened with your details filled in. If it didn't, use the button below.` +
          `<a class="btn btn-gold btn-block" href="${waHref}" target="_blank" rel="noopener">💬 Send My Enquiry on WhatsApp</a>`;
        success.classList.add("show");
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      bookingForm.reset();
    });
  }

  /* ----- Service: Add to Basket (instant add + toast) ----- */
  const ambientOverlay = document.getElementById("ambientOptionsOverlay");
  const ambientModal = document.getElementById("ambientOptionsModal");
  const starlightOverlay = document.getElementById("starlightOptionsOverlay");
  const starlightModal = document.getElementById("starlightOptionsModal");

  function closeAmbientOptions() {
    ambientOverlay?.classList.remove("open");
    ambientModal?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function closeStarlightOptions() {
    starlightOverlay?.classList.remove("open");
    starlightModal?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function addServiceToBasket(id, name = SERVICE_PRODUCTS[id]?.name) {
    const product = SERVICE_PRODUCTS[id];
    if (!product) return;
    const cart = getCart();
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ key: id, id, qty: 1, name, price: product.fitted });
    saveCart(cart);
    showToast(`✓ ${name} added to basket`);
  }

  document.querySelectorAll("[data-service-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.serviceAdd;
      if (id === "ambient-lighting") {
        ambientOverlay?.classList.add("open");
        ambientModal?.classList.add("open");
        document.body.style.overflow = "hidden";
        return;
      }
      if (id === "starlight") {
        starlightOverlay?.classList.add("open");
        starlightModal?.classList.add("open");
        document.body.style.overflow = "hidden";
        return;
      }
      addServiceToBasket(id);
    });
  });

  document.getElementById("closeAmbientOptions")?.addEventListener("click", closeAmbientOptions);
  ambientOverlay?.addEventListener("click", closeAmbientOptions);
  document.querySelectorAll("[data-ambient-option]").forEach((option) => {
    option.addEventListener("click", () => {
      const tier = option.dataset.ambientOption;
      const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
      addServiceToBasket(`ambient-lighting-${tier}`, `64-Colour Ambient Lighting — ${tierName}`);
      closeAmbientOptions();
    });
    document.getElementById("closeStarlightOptions")?.addEventListener("click", closeStarlightOptions);
    starlightOverlay?.addEventListener("click", closeStarlightOptions);
    document.querySelectorAll("[data-starlight-option]").forEach((option) => {
      option.addEventListener("click", () => {
        const tier = option.dataset.starlightOption;
        const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
        addServiceToBasket(`starlight-${tier}`, `Starlight Headlining — ${tierName} Package`);
        closeStarlightOptions();
      });
    });
  });

  /* ----- Booking request modal (opened from basket) ----- */
  const slotOverlay = document.getElementById("slotOverlay");
  const slotModal = document.getElementById("slotModal");
  const slotContent = document.getElementById("slotContent");

  function closeSlot() {
    slotOverlay?.classList.remove("open");
    slotModal?.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.getElementById("closeSlot")?.addEventListener("click", closeSlot);
  slotOverlay?.addEventListener("click", closeSlot);

  /* ----- Basket drawer ----- */
  const cartOverlay = document.getElementById("cartOverlay");
  const cartDrawer = document.getElementById("cartDrawer");

  function closeCart() {
    cartOverlay?.classList.remove("open");
    cartDrawer?.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.getElementById("closeCart")?.addEventListener("click", closeCart);
  cartOverlay?.addEventListener("click", closeCart);

  document.getElementById("cartLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    updateHomeCartUI();
    cartOverlay?.classList.add("open");
    cartDrawer?.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  document.getElementById("cartItems")?.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const rem = e.target.closest("[data-remove]");
    if (!inc && !dec && !rem) return;
    const key = (inc?.dataset.inc) || (dec?.dataset.dec) || (rem?.dataset.remove);
    let cart = getCart();
    const item = cart.find((i) => i.key === key);
    if (!item) return;
    if (inc) item.qty += 1;
    if (dec) item.qty = Math.max(0, item.qty - 1);
    if (rem) item.qty = 0;
    cart = cart.filter((i) => i.qty > 0);
    saveCart(cart);
    updateHomeCartUI();
  });

  function updateHomeCartUI() {
    const itemsEl = document.getElementById("cartItems");
    const footEl = document.getElementById("cartFoot");
    if (!itemsEl || !footEl) return;
    const cart = getCart();

    if (cart.length === 0) {
      itemsEl.innerHTML = `<div class="cart-empty">🛒<br><br>Your basket is empty.<br>Add a service to get started.</div>`;
      footEl.style.display = "none";
      return;
    }

    itemsEl.innerHTML = cart.map((i) => `
      <div class="cart-item">
        <button class="cart-remove" data-remove="${i.key}" aria-label="Remove">✕</button>
        <div class="cart-item-info">
          <strong>${i.name}</strong>
          <span class="cart-item-mode">Fitted at our workshop</span>
          <span class="cart-item-price">£${i.price.toLocaleString("en-GB")} each</span>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-dec="${i.key}">−</button>
          <span>${i.qty}</span>
          <button class="qty-btn" data-inc="${i.key}">+</button>
        </div>
      </div>`).join("");

    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    footEl.style.display = "block";
    footEl.innerHTML = `
      <div class="cart-total-row grand"><span>Total</span><span>£${total.toLocaleString("en-GB")}</span></div>
      <button class="btn btn-gold btn-block" id="basketChooseSlot">Request Your Booking</button>`;
    document.getElementById("basketChooseSlot").addEventListener("click", openSlotPickerFromBasket);
  }

  /* Six-step booking flow inside the slot modal, opened from the basket. */
  async function openSlotPickerFromBasket() {
    if (!slotContent) return;
    const cart = getCart();
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const cartNames = cart.map((i) => i.name).join(", ");
    const fallbackServices = [
      { id: "diagnostics-coding", name: "Diagnostics & Coding", slotMinutes: 60, jobMinutes: 60, fittingOnly: true, supplyAndFit: true },
      { id: "carplay", name: "CarPlay / Android Auto", slotMinutes: 60, jobMinutes: 60, fittingOnly: true, supplyAndFit: true },
      { id: "ambient-lighting", name: "Ambient Lighting", slotMinutes: 60, jobMinutes: 240, fittingOnly: true, supplyAndFit: true },
      { id: "starlight-headlining", name: "Starlight Headliner", slotMinutes: 120, jobMinutes: 480, fittingOnly: true, supplyAndFit: true },
      { id: "reverse-camera", name: "Reverse Camera", slotMinutes: 120, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
      { id: "dashcam", name: "Dashcam Installation", slotMinutes: 120, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
      { id: "virtual-cockpit", name: "Virtual Cockpit", slotMinutes: 120, jobMinutes: 240, fittingOnly: true, supplyAndFit: true },
      { id: "steering-wheel", name: "Steering Wheel Upgrades", slotMinutes: 60, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
      { id: "ecu-programming", name: "ECU / TCU Programming", slotMinutes: 60, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
      { id: "ecu-cloning", name: "ECU Cloning", slotMinutes: 120, jobMinutes: 240, fittingOnly: true, supplyAndFit: true },
      { id: "retrofits", name: "Retrofits", slotMinutes: 60, jobMinutes: 180, fittingOnly: true, supplyAndFit: true },
      { id: "electrical-upgrades", name: "Other Electrical Upgrades", slotMinutes: 60, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
    ];
    let config = { services: fallbackServices, bookingLeadHours: 24, supplyAndFitLeadHours: 168, maxAdvanceDays: 180, workingHours: {}, allowMobileFitting: true };
    try {
      config = (await window.BookingBackend.getBookingConfig()) || config;
    } catch (error) {
      if (window.BookingBackend.isLive) {
        showToast(`⚠ ${error.message}`);
      }
    }
    const state = {
      step: 1,
      service: null,
      bookingType: "fitting-only",
      fittingLocation: "workshop",
      date: "",
      slot: "",
      uploadedImages: [],
      requestId: crypto.randomUUID(),
    };
    const lowerCartName = cartNames.toLowerCase();
    state.service =
      config.services.find((service) => lowerCartName.includes(service.name.toLowerCase().split(" / ")[0])) ||
      config.services.find((service) => lowerCartName.includes(service.id.replace(/-/g, " "))) ||
      config.services.find((service) => lowerCartName.includes("ambient") && service.id === "ambient-lighting") ||
      config.services[0];

    closeCart();
    slotContent.innerHTML = `
      <div class="booking-progress" aria-label="Booking progress"></div>
      <span class="eyebrow" id="bookingStepLabel">Step 1 of 6</span>
      <h3>Book Your <span class="gold-text">Workshop Visit</span></h3>
      <p class="modal-sub" id="bookingStepIntro">Select the service you need.</p>
      <form id="bookingRequestForm" class="form" style="padding:0;background:none;border:none">
        <section class="booking-step" data-step="1">
          <div class="form-group">
            <label for="brService">Service *</label>
            <select id="brService" required>
              ${config.services.map((service) => `<option value="${escapeHtml(service.id)}" ${service.id === state.service.id ? "selected" : ""}>${escapeHtml(service.name)}</option>`).join("")}
            </select>
          </div>
          <div class="booking-duration-note">
            <span>Reserved in the calendar: <strong id="brSlotDuration"></strong></span>
            <span>Estimated work duration: <strong id="brJobDuration"></strong></span>
          </div>
        </section>
        <section class="booking-step" data-step="2" hidden>
          <div class="booking-type-grid">
            <label class="booking-type-card">
              <input type="radio" name="bookingType" value="fitting-only" checked>
              <strong>Fitting Only</strong>
              <span>You supply compatible parts. Eligible appointments are confirmed immediately.</span>
            </label>
            <label class="booking-type-card">
              <input type="radio" name="bookingType" value="supply-and-fit">
              <strong>Supply &amp; Fit</strong>
              <span>We source the parts and check compatibility, pricing and timing. Approval is required.</span>
            </label>
          </div>
          <div class="form-group" id="brPartsGroup">
            <label for="brPartDetails" id="brPartDetailsLabel">Part details</label>
            <textarea id="brPartDetails" placeholder="Brand, model, part number and anything else we should know"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group" id="brProductLinkGroup"><label for="brProductLink">Product link</label><input type="url" id="brProductLink" placeholder="https://…"></div>
            <div class="form-group" id="brPhotosGroup"><label for="brPhotos">Photographs of the requested work</label><input type="file" id="brPhotos" accept="image/jpeg,image/png,image/webp" multiple></div>
          </div>
          <p class="booking-small" id="brPhotoStatus">Up to six JPG, PNG or WebP images, 8 MB each.</p>
        </section>
        <section class="booking-step" data-step="3" hidden>
          <div class="form-group">
            <label>Your Vehicle *</label>
            <div class="vehicle-row">
              <select id="bkMake" required><option value="">Make</option></select>
              <select id="bkModel" required disabled><option value="">Model</option></select>
              <select id="bkYear" required disabled><option value="">Year</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label for="brRegistration">Registration</label><input type="text" id="brRegistration" maxlength="20" autocomplete="off" placeholder="AB12 CDE"></div>
            <div class="form-group"><label for="brEngine">Engine / variant</label><input type="text" id="brEngine" placeholder="e.g. 2.0 TDI, M-Sport"></div>
          </div>
          <div class="form-group"><label for="brAdditional">Additional information</label><textarea id="brAdditional" placeholder="Tell us about modifications, warning lights or compatibility questions"></textarea></div>
        </section>
        <section class="booking-step" data-step="4" hidden>
          <div class="form-row">
            <div class="form-group"><label for="brName">Full Name *</label><input type="text" id="brName" required autocomplete="name"></div>
            <div class="form-group"><label for="brPhone">Telephone *</label><input type="tel" id="brPhone" required autocomplete="tel" placeholder="07..."></div>
          </div>
          <div class="form-group"><label for="brEmail">Email *</label><input type="email" id="brEmail" required autocomplete="email"></div>
          <div class="form-group">
            <label for="brLocation">Fitting location *</label>
            <select id="brLocation"><option value="workshop">Yorkshire Autotech workshop</option>${config.allowMobileFitting ? '<option value="mobile">Mobile fitting</option>' : ""}</select>
          </div>
          <div class="form-group" id="brAddressGroup" hidden><label for="brAddress">Mobile fitting address *</label><input type="text" id="brAddress" autocomplete="street-address"></div>
        </section>
        <section class="booking-step" data-step="5" hidden>
          <div class="form-group">
            <label>Appointment date *</label>
            <input type="date" id="brDate" min="" max="" required>
            <span class="date-hint">Times shown use current Google Calendar availability.</span>
            <span class="date-error" id="brDateError">Please pick an appointment date.</span>
          </div>
          <div class="form-group">
            <label>Appointment time *</label>
            <div class="slot-grid" id="brSlots"><span class="slot-hint">Pick a date to check live availability.</span></div>
            <span class="date-error" id="brSlotError">Please choose an available time.</span>
          </div>
        </section>
        <section class="booking-step" data-step="6" hidden>
          <div class="booking-review" id="bookingReview"></div>
          <label class="booking-consent"><input type="checkbox" id="brConsent" required> I agree that these details may be used to arrange and manage this appointment.</label>
          <p class="form-error" id="bookingSubmitError" role="alert"></p>
        </section>
        <div class="booking-step-actions">
          <button type="button" class="btn btn-outline" id="bookingBack" hidden>Back</button>
          <button type="button" class="btn btn-gold" id="bookingNext">Continue</button>
        </div>
      </form>`;

    const form = slotContent.querySelector("#bookingRequestForm");
    const nextBtn = slotContent.querySelector("#bookingNext");
    const backBtn = slotContent.querySelector("#bookingBack");
    const serviceSelect = slotContent.querySelector("#brService");
    const slotGrid = slotContent.querySelector("#brSlots");
    const dateInput = slotContent.querySelector("#brDate");
    const makeSel = slotContent.querySelector("#bkMake");
    const modelSel = slotContent.querySelector("#bkModel");
    const yearSel = slotContent.querySelector("#bkYear");
    const vehicles = window.VEHICLES || BOOKING_VEHICLES;
    Object.keys(vehicles).forEach((m) => makeSel.add(new Option(m, m)));
    makeSel.value = "";
    makeSel.addEventListener("change", () => {
      modelSel.innerHTML = '<option value="">Model</option>';
      yearSel.innerHTML = '<option value="">Year</option>';
      yearSel.disabled = true;
      if (makeSel.value) {
        Object.keys(vehicles[makeSel.value]).forEach((m) => modelSel.add(new Option(m, m)));
        modelSel.disabled = false;
      } else modelSel.disabled = true;
    });

    modelSel.addEventListener("change", () => {
      yearSel.innerHTML = '<option value="">Year</option>';
      if (modelSel.value && makeSel.value) {
        const { from, to } = vehicles[makeSel.value][modelSel.value];
        for (let y = to; y >= from; y--) yearSel.add(new Option(y, y));
        yearSel.disabled = false;
      } else yearSel.disabled = true;
    });

    const toYMD = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const latestDate = new Date(Date.now() + Number(config.maxAdvanceDays || 180) * 86400000);
    dateInput.max = toYMD(latestDate);

    function updateService() {
      state.service = config.services.find((service) => service.id === serviceSelect.value);
      slotContent.querySelector("#brSlotDuration").textContent = `${state.service.slotMinutes} minutes`;
      slotContent.querySelector("#brJobDuration").textContent = `${state.service.jobMinutes} minutes`;
      const fitting = form.querySelector('input[value="fitting-only"]');
      const supplied = form.querySelector('input[value="supply-and-fit"]');
      fitting.disabled = !state.service.fittingOnly;
      supplied.disabled = !state.service.supplyAndFit;
      if (!fitting.disabled) fitting.checked = true;
      else supplied.checked = true;
      updateBookingType();
    }
    function updateBookingType() {
      state.bookingType = form.querySelector('input[name="bookingType"]:checked')?.value || "fitting-only";
      const fittingOnly = state.bookingType === "fitting-only";
      slotContent.querySelector("#brPartsGroup").hidden = false;
      slotContent.querySelector("#brPartDetailsLabel").textContent =
        fittingOnly ? "Part details" : "Describe what you would like fitted";
      slotContent.querySelector("#brPartDetails").placeholder = fittingOnly
        ? "Brand, model, part number and anything else we should know"
        : "Tell us exactly what you want, any package options and the finish you are looking for";
      slotContent.querySelector("#brProductLinkGroup").hidden = !fittingOnly;
      slotContent.querySelector("#brProductLink").disabled = !fittingOnly;
      if (!fittingOnly) slotContent.querySelector("#brProductLink").value = "";
      slotContent.querySelector("#brPhotosGroup").hidden = fittingOnly;
      slotContent.querySelector("#brPhotos").disabled = fittingOnly;
      slotContent.querySelector("#brPhotoStatus").hidden = fittingOnly;
      const leadHours = state.bookingType === "supply-and-fit"
        ? Number(config.supplyAndFitLeadHours ?? 168)
        : Number(config.bookingLeadHours ?? 24);
      dateInput.min = toYMD(new Date(Date.now() + leadHours * 3600000));
      const hint = slotContent.querySelector('[data-step="5"] .date-hint');
      hint.textContent = state.bookingType === "supply-and-fit"
        ? "Supply & Fit appointments require at least seven days' notice."
        : "Fitting Only appointments require at least 24 hours' notice.";
      if (dateInput.value && dateInput.value < dateInput.min) {
        dateInput.value = "";
        slotGrid.innerHTML = '<span class="slot-hint">Choose a date within the required notice period.</span>';
        state.date = "";
        state.slot = "";
      }
    }
    serviceSelect.addEventListener("change", updateService);
    form.querySelectorAll('input[name="bookingType"]').forEach((input) => input.addEventListener("change", updateBookingType));
    slotContent.querySelector("#brLocation").addEventListener("change", (event) => {
      state.fittingLocation = event.target.value;
      slotContent.querySelector("#brAddressGroup").hidden = state.fittingLocation !== "mobile";
      slotContent.querySelector("#brAddress").required = state.fittingLocation === "mobile";
    });

    async function renderSlots() {
      state.slot = "";
      state.date = dateInput.value;
      slotContent.querySelector("#brSlotError").classList.remove("show");
      if (!state.date) return;
      slotGrid.innerHTML = '<span class="slot-hint">Checking availability…</span>';
      try {
        const slots = await window.BookingBackend.getAvailableSlots(
          state.date,
          state.service.id,
          state.service.slotMinutes,
          state.bookingType
        );
        if (state.date !== dateInput.value) return;
        if (!slots.some((slot) => slot.available)) {
          slotGrid.innerHTML = slots.length
            ? slots.map((slot) =>
                `<button type="button" class="slot-btn taken" data-slot="${slot.time}" disabled aria-label="Unavailable">
                  <span class="slot-time">${window.BookingBackend.slotLabel(slot.time, state.service.slotMinutes)}</span>
                </button>`
              ).join("")
            : '<span class="slot-hint">No times are available on this date. Please choose another day.</span>';
          return;
        }
        slotGrid.innerHTML = slots.map((slot) =>
          `<button type="button" class="slot-btn${slot.available ? "" : " taken"}" data-slot="${slot.time}" ${slot.available ? "" : "disabled aria-label=\"Unavailable\""}>
            <span class="slot-time">${window.BookingBackend.slotLabel(slot.time, state.service.slotMinutes)}</span>
          </button>`
        ).join("");
        slotGrid.querySelectorAll(".slot-btn:not(.taken)").forEach((button) => {
          button.addEventListener("click", () => {
            slotGrid.querySelectorAll(".slot-btn").forEach((item) => item.classList.remove("selected"));
            button.classList.add("selected");
            state.slot = button.dataset.slot;
            slotContent.querySelector("#brSlotError").classList.remove("show");
          });
        });
      } catch (error) {
        slotGrid.innerHTML = `<span class="slot-hint" role="alert">${escapeHtml(error.message)}</span>`;
      }
    }
    dateInput.addEventListener("change", renderSlots);

    async function uploadPhotos() {
      const files = [...slotContent.querySelector("#brPhotos").files];
      if (!files.length) return;
      if (files.length > 6) throw new Error("Please choose no more than six photographs.");
      const status = slotContent.querySelector("#brPhotoStatus");
      const uploaded = [];
      for (const file of files) {
        status.textContent = `Uploading ${file.name}…`;
        const body = new FormData();
        body.append("file", file);
        body.append("companyWebsite", "");
        const response = await fetch("/api/uploads", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Photo upload failed.");
        uploaded.push(data.url);
      }
      state.uploadedImages = uploaded;
      status.textContent = `${uploaded.length} photograph${uploaded.length === 1 ? "" : "s"} ready.`;
    }

    const intros = [
      "Select the service you need.",
      "Choose who supplies the parts and tell us about them.",
      "Tell us about your vehicle.",
      "Tell us how to contact you and where the work will happen.",
      "Choose a live appointment slot.",
      "Check the details before submitting.",
    ];
    function renderStep() {
      form.querySelectorAll(".booking-step").forEach((section) => {
        section.hidden = Number(section.dataset.step) !== state.step;
      });
      slotContent.querySelector("#bookingStepLabel").textContent = `Step ${state.step} of 6`;
      slotContent.querySelector("#bookingStepIntro").textContent = intros[state.step - 1];
      slotContent.querySelector(".booking-progress").innerHTML = Array.from({ length: 6 }, (_, index) =>
        `<span class="${index + 1 <= state.step ? "active" : ""}"></span>`
      ).join("");
      backBtn.hidden = state.step === 1;
      nextBtn.textContent = state.step === 6
        ? (state.bookingType === "supply-and-fit" || state.service.approvalRequired ? "Submit for Approval" : "Confirm Booking")
        : "Continue";
      if (state.step === 6) renderReview();
    }

    function durationLabel(minutes) {
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      return hours ? `${hours} hr${hours > 1 ? "s" : ""}${remainder ? ` ${remainder} min` : ""}` : `${minutes} min`;
    }
    function renderReview() {
      const dateLabel = state.date
        ? new Date(`${state.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "Not selected";
      slotContent.querySelector("#bookingReview").innerHTML = `
        <div><strong>Service</strong><span>${escapeHtml(state.service.name)}</span></div>
        <div><strong>Booking type</strong><span>${state.bookingType === "fitting-only" ? "Fitting Only" : "Supply & Fit"}</span></div>
        <div><strong>Vehicle</strong><span>${escapeHtml([yearSel.value, makeSel.value, modelSel.value].filter(Boolean).join(" "))}</span></div>
        <div><strong>Customer</strong><span>${escapeHtml(slotContent.querySelector("#brName").value)} · ${escapeHtml(slotContent.querySelector("#brPhone").value)}</span></div>
        <div><strong>Appointment</strong><span>${escapeHtml(dateLabel)} at ${state.slot ? escapeHtml(window.BookingBackend.slotLabel(state.slot, state.service.slotMinutes)) : "Not selected"}</span></div>
        <div><strong>Reserved time</strong><span>${durationLabel(state.service.slotMinutes)}</span></div>
        <div><strong>Estimated work</strong><span>${durationLabel(state.service.jobMinutes)}</span></div>
        ${total ? `<div><strong>Basket estimate</strong><span>£${total.toLocaleString("en-GB")}</span></div>` : ""}
      `;
    }

    function validateStep() {
      const section = form.querySelector(`.booking-step[data-step="${state.step}"]`);
      const controls = [...section.querySelectorAll("input, select, textarea")].filter((item) => !item.disabled && !item.hidden && item.offsetParent !== null);
      for (const control of controls) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return false;
        }
      }
      if (state.step === 5 && (!state.date || !state.slot)) {
        slotContent.querySelector(state.date ? "#brSlotError" : "#brDateError").classList.add("show");
        return false;
      }
      return true;
    }

    async function submit() {
      const button = nextBtn;
      button.disabled = true;
      button.textContent = "Saving booking…";
      slotContent.querySelector("#bookingSubmitError").textContent = "";
      try {
        const approvalRequired = state.bookingType === "supply-and-fit" || Boolean(state.service.approvalRequired);
        const result = await window.BookingBackend.createCalendarBooking({
          requestId: state.requestId,
          serviceId: state.service.id,
          bookingType: state.bookingType,
          approvalRequired,
          bookingSlotDuration: state.service.slotMinutes,
          estimatedJobDuration: state.service.jobMinutes,
          name: slotContent.querySelector("#brName").value.trim(),
          phone: slotContent.querySelector("#brPhone").value.trim(),
          email: slotContent.querySelector("#brEmail").value.trim(),
          vehicleMake: makeSel.value,
          vehicleModel: modelSel.value,
          vehicleYear: yearSel.value,
          registration: slotContent.querySelector("#brRegistration").value.trim(),
          engineVariant: slotContent.querySelector("#brEngine").value.trim(),
          additionalInformation: slotContent.querySelector("#brAdditional").value.trim(),
          fittingLocation: state.fittingLocation,
          address: slotContent.querySelector("#brAddress").value.trim(),
          date: state.date,
          slot: state.slot,
          partDetails: slotContent.querySelector("#brPartDetails").value.trim(),
          productLink: slotContent.querySelector("#brProductLink").value.trim(),
          uploadedImages: state.uploadedImages,
          notes: approvalRequired ? `Supply & Fit / approval request. Basket: ${cartNames}` : `Basket: ${cartNames}`,
          total,
        });
        const pending = result.status === "pending_approval" || result.status === "pending";
        const dateLabel = new Date(`${state.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
        const message =
          `Hi Yorkshire Autotech, booking ${result.ref} has been submitted for ${state.service.name} ` +
          `on ${dateLabel} at ${window.BookingBackend.slotLabel(state.slot, state.service.slotMinutes)}. ` +
          `Vehicle: ${yearSel.value} ${makeSel.value} ${modelSel.value}, registration ${slotContent.querySelector("#brRegistration").value || "not supplied"}. ` +
          `Booking type: ${state.bookingType === "fitting-only" ? "Fitting Only" : "Supply & Fit"}.`;
        slotContent.innerHTML = `
          <div class="checkout-success">
            <div class="tick">${pending ? "📋" : "✅"}</div>
            <h3>${pending ? "Request Sent for Approval" : "Booking Confirmed"}</h3>
            <p>Reference <span class="order-ref">${escapeHtml(result.ref)}</span>.<br>
            ${pending
              ? `We’ll check compatibility, parts, pricing and availability, then contact you. Your requested time is not reserved until we approve it.`
              : `Your appointment is reserved in the workshop calendar for ${escapeHtml(dateLabel)} at ${escapeHtml(window.BookingBackend.slotLabel(state.slot, state.service.slotMinutes))}.`}
            </p>
            <br>
            <a class="btn btn-gold btn-block" href="${window.BookingBackend.waLink(window.BookingBackend.businessWhatsApp, message)}" target="_blank" rel="noopener">💬 Contact Us on WhatsApp</a>
            <p class="wa-hint">Your details are pre-filled — press send if you would like to message us now.</p>
            <button class="btn btn-outline" id="bookingSuccessClose">Continue Browsing</button>
          </div>`;
        saveCart([]);
        document.getElementById("bookingSuccessClose").addEventListener("click", closeSlot);
      } catch (error) {
        slotContent.querySelector("#bookingSubmitError").textContent = error.message || "The booking could not be saved.";
        button.disabled = false;
        button.textContent = state.bookingType === "supply-and-fit" || state.service.approvalRequired
          ? "Submit for Approval"
          : "Confirm Booking";
      }
    }

    nextBtn.addEventListener("click", async () => {
      if (!validateStep()) return;
      nextBtn.disabled = true;
      try {
        if (state.step === 2 && slotContent.querySelector("#brPhotos").files.length) await uploadPhotos();
        if (state.step === 6) {
          await submit();
          return;
        }
        state.step += 1;
        renderStep();
      } catch (error) {
        showToast(`⚠ ${error.message}`);
      } finally {
        if (state.step !== 6 || slotContent.querySelector("#bookingSubmitError")) nextBtn.disabled = false;
      }
    });
    backBtn.addEventListener("click", () => {
      state.step = Math.max(1, state.step - 1);
      renderStep();
    });

    updateService();
    renderStep();
    slotOverlay.classList.add("open");
    slotModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  /* ----- Service: Gallery modal ----- */
  const galleryOverlay = document.getElementById("galleryOverlay");
  const galleryModal = document.getElementById("galleryModal");
  const galleryContent = document.getElementById("galleryContent");

  function closeGallery() {
    galleryOverlay?.classList.remove("open");
    galleryModal?.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-gallery]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = GALLERIES[btn.dataset.gallery];
      if (!g || !galleryContent) return;

      /* Loading state */
      galleryContent.innerHTML = `
        <h3>${g.title}</h3>
        <p class="modal-sub">A selection of our recent ${g.title.toLowerCase()} work.</p>
        <div class="gallery-grid"><div class="gallery-item" style="grid-column:1/-1"><div class="gi-placeholder"><span class="gi-icon">${g.icon}</span><span class="gi-text">Loading gallery…</span></div></div></div>`;
      galleryOverlay.classList.add("open");
      galleryModal.classList.add("open");
      document.body.style.overflow = "hidden";

      /* Pull images live from Cloudinary by tag */
      fetch(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/list/${g.tag}.json`)
        .then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); })
        .then((data) => {
          const items = (data.resources || []);
          if (items.length === 0) throw new Error("empty");
          galleryContent.innerHTML = `
            <h3>${g.title}</h3>
            <p class="modal-sub">A selection of our recent ${g.title.toLowerCase()} work.</p>
            <div class="gallery-grid">
              ${items.map((r) => `
                <div class="gallery-item">
                  <img src="${cloudinaryUrl(r)}" alt="${g.title} work by Yorkshire Autotech" loading="lazy">
                </div>`).join("")}
            </div>`;
        })
        .catch(() => {
          galleryContent.innerHTML = `
            <h3>${g.title}</h3>
            <p class="modal-sub">A selection of our recent ${g.title.toLowerCase()} work.</p>
            <div class="gallery-grid">
              <div class="gallery-item" style="grid-column:1/-1"><div class="gi-placeholder"><span class="gi-icon">${g.icon}</span><span class="gi-text">Photos coming soon — follow us on socials for the latest work.</span></div></div>
            </div>`;
        });
    });
  });

  document.getElementById("closeGallery")?.addEventListener("click", closeGallery);
  galleryOverlay?.addEventListener("click", closeGallery);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGallery(); });

  /* ----- Work marquee: pull all tags from Cloudinary ----- */
  loadWorkMarquee();

  /* ----- Live Google reviews ----- */
  loadGoogleReviews();
});

/* Fetch every gallery tag, merge, shuffle, duplicate for seamless loop */
async function loadWorkMarquee() {
  const track = document.getElementById("marqueeTrack");
  if (!track) return;

  const tags = [...new Set(Object.values(GALLERIES).map((g) => g.tag))];
  try {
    const results = await Promise.all(
      tags.map((tag) =>
        fetch(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/list/${tag}.json`)
          .then((r) => (r.ok ? r.json() : { resources: [] }))
          .catch(() => ({ resources: [] }))
      )
    );
    const all = results.flatMap((r) => r.resources || []);
    if (all.length === 0) throw new Error("no images");

    /* Shuffle so the strip mixes all services */
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }

    const item = (r) => `
      <div class="marquee-item">
        <img src="${cloudinaryUrl(r)}" alt="Recent work by Yorkshire Autotech" loading="lazy">
      </div>`;

    /* Render the set twice — animation shifts -50% for a seamless loop */
    track.innerHTML = all.map(item).join("") + all.map(item).join("");

    /* Keep the loop speed consistent regardless of image count (~55px/s) */
    const totalWidth = all.length * (260 + 18); // item width + gap
    track.style.animationDuration = Math.max(30, totalWidth / 55) + "s";
  } catch {
    track.innerHTML = `<div class="marquee-loading">Follow us on socials to see our latest work.</div>`;
  }
}

/* ----- Live Google reviews via Places API ----- */
const GOOGLE_API_KEY = "AIzaSyBwTOASurhdKDSThIt_quQ8muQ0YkKsSzQ";
const GOOGLE_PLACE_ID = "ChIJqawxm4QHMUoRjHi_JlszAlg";
const GOOGLE_REVIEWS_URL = "https://search.google.com/local/reviews?placeid=" + GOOGLE_PLACE_ID;

async function loadGoogleReviews() {
  const grid = document.getElementById("googleReviews");
  const summary = document.getElementById("googleSummary");
  if (!grid) return;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${GOOGLE_PLACE_ID}?fields=rating,userRatingCount,reviews&key=${GOOGLE_API_KEY}`,
      { headers: { "X-Goog-FieldMask": "rating,userRatingCount,reviews.rating,reviews.text,reviews.relativePublishTimeDescription,reviews.publishTime,reviews.authorAttribution" } }
    );
    if (!res.ok) throw new Error("api");
    const data = await res.json();

    /* Summary badge: ★ 5.0 · 38 Google reviews */
    if (summary && data.rating) {
      summary.innerHTML = `
        <div class="google-badge">
          <span class="g-logo">Google</span>
          <span class="g-stars">${"★".repeat(Math.round(data.rating))}</span>
          <span class="g-score">${data.rating.toFixed(1)}</span>
          <span class="g-count">${data.userRatingCount || ""} reviews</span>
        </div>`;
    }

    /* Sort by newest first, then take 5 */
    const reviews = (data.reviews || [])
      .slice()
      .sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
      .slice(0, 5);
    if (reviews.length === 0) throw new Error("empty");

    grid.innerHTML = reviews
      .map(
        (r) => `
      <div class="testi-card">
        <div class="testi-stars">${"★".repeat(r.rating || 5)}${"☆".repeat(5 - (r.rating || 5))}</div>
        <p>"${escapeHtml(r.text?.text || "").slice(0, 280)}${(r.text?.text || "").length > 280 ? "…" : ""}"</p>
        <span class="testi-name">— ${escapeHtml(r.authorAttribution?.displayName || "Google user")}<span class="testi-time">${r.relativePublishTimeDescription || ""}</span></span>
      </div>`
      )
      .join("");

    initReviewCarousel(reviews.length);
  } catch {
    /* Graceful fallback — link out to Google instead */
    grid.innerHTML = `<div class="testi-loading">Read our reviews on <a href="${GOOGLE_REVIEWS_URL}" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:underline">Google</a>.</div>`;
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ----- Infinite review carousel (swipe / arrows / dots) ----- */
function initReviewCarousel(count) {
  const track = document.getElementById("googleReviews");
  const dotsWrap = document.getElementById("reviewDots");
  const prevBtn = document.getElementById("reviewPrev");
  const nextBtn = document.getElementById("reviewNext");
  if (!track || count === 0) return;

  /* Clone first & last slides for the seamless loop */
  const slides = [...track.children];
  const firstClone = slides[0].cloneNode(true);
  const lastClone = slides[slides.length - 1].cloneNode(true);
  track.appendChild(firstClone);
  track.insertBefore(lastClone, slides[0]);

  let index = 1; // start on the first real slide
  let width = track.clientWidth;

  const goTo = (i, animate = true) => {
    track.classList.toggle("dragging", !animate);
    track.style.transform = `translateX(${-i * width}px)`;
    index = i;
    updateDots();
  };

  const realIndex = () => ((index - 1 + count) % count);

  const updateDots = () => {
    if (!dotsWrap) return;
    dotsWrap.querySelectorAll(".review-dot").forEach((d, i) =>
      d.classList.toggle("active", i === realIndex())
    );
  };

  /* Build dots */
  if (dotsWrap) {
    dotsWrap.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("button");
      dot.className = "review-dot";
      dot.setAttribute("aria-label", `Review ${i + 1}`);
      dot.addEventListener("click", () => goTo(i + 1));
      dotsWrap.appendChild(dot);
    }
  }

  /* After the slide transition, silently jump across the clone seam */
  track.addEventListener("transitionend", () => {
    if (index === count + 1) goTo(1, false);
    if (index === 0) goTo(count, false);
  });

  prevBtn?.addEventListener("click", () => goTo(index - 1));
  nextBtn?.addEventListener("click", () => goTo(index + 1));

  /* Touch / mouse swipe */
  let startX = 0, dragging = false;
  const onStart = (x) => { startX = x; dragging = true; track.classList.add("dragging"); };
  const onEnd = (x) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("dragging");
    const diff = x - startX;
    if (Math.abs(diff) > 50) goTo(diff < 0 ? index + 1 : index - 1);
    else goTo(index); // snap back
  };

  track.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX), { passive: true });
  track.addEventListener("touchend", (e) => onEnd(e.changedTouches[0].clientX));
  track.addEventListener("mousedown", (e) => { e.preventDefault(); onStart(e.clientX); });
  track.addEventListener("mouseup", (e) => onEnd(e.clientX));
  track.addEventListener("mouseleave", (e) => { if (dragging) onEnd(e.clientX); });

  window.addEventListener("resize", () => { width = track.clientWidth; goTo(index, false); });

  /* Initial position */
  goTo(1, false);
  requestAnimationFrame(() => updateDots());
}

/* ----- Cart helpers shared across pages ----- */
const CART_KEY = "yorkshire_Autotech_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? "grid" : "none";

  /* Swap the nav CTA between Book Now and Checkout Now */
  const cta = document.getElementById("navCta");
  if (cta) {
    if (count > 0) {
      cta.textContent = "Checkout Now";
      cta.classList.add("checkout-mode");
      cta.dataset.mode = "checkout";
    } else {
      cta.textContent = "Book Now";
      cta.classList.remove("checkout-mode");
      cta.dataset.mode = "book";
    }
  }
}

/* ----- Cloudinary gallery config -----
   Each service gallery pulls all images with the given tag
   from the Yorkshire Autotech Cloudinary account.
   Upload + tag a photo in Cloudinary and it appears here automatically. */
const CLOUDINARY_CLOUD = "db7olgnqq";

/* ----- Service prices (fitted, at workshop) ----- */
const SERVICE_PRODUCTS = {
  "coding-session": { name: "Coding & Feature Activation Session", fitted: 30 },
  "ambient-lighting-bronze": { name: "64-Colour Ambient Lighting — Bronze", fitted: 60 },
  "ambient-lighting-silver": { name: "64-Colour Ambient Lighting — Silver", fitted: 200 },
  "ambient-lighting-gold": { name: "64-Colour Ambient Lighting — Gold", fitted: 250 },
  "carplay-retrofit": { name: "Wireless CarPlay & Android Auto Retrofit", fitted: 60 },
  "starlight": { name: "Starlight Headliner Kit", fitted: 598 },
  "starlight-bronze": { name: "Starlight Headlining — Bronze Package", fitted: 350 },
  "starlight-silver": { name: "Starlight Headlining — Silver Package", fitted: 500 },
  "starlight-gold": { name: "Starlight Headlining — Gold Package", fitted: 600 },
  "reverse-camera": { name: "OEM-Style Reverse Camera Kit", fitted: 100 },
  "dashcam-4k": { name: "4K Front & Rear Dashcam", fitted: 60 },
  "steering-wheel": { name: "Custom Carbon Fibre Steering Wheel", fitted: 100 },
  "virtual-cockpit": { name: "Virtual Cockpit Digital Cluster", fitted: 300 },
};

/* Vehicle data for the booking form */
const BOOKING_VEHICLES = {
  "Alfa Romeo": {
    "Giulia": { from: 2016, to: 2026 }, "Stelvio": { from: 2017, to: 2026 }, "Tonale": { from: 2022, to: 2026 },
  },
  "Audi": {
    "A1": { from: 2010, to: 2026 }, "A3": { from: 2012, to: 2026 }, "A4": { from: 2008, to: 2026 },
    "A5": { from: 2007, to: 2026 }, "A6": { from: 2011, to: 2026 }, "A7": { from: 2010, to: 2026 },
    "A8": { from: 2010, to: 2026 }, "Q2": { from: 2016, to: 2026 }, "Q3": { from: 2011, to: 2026 },
    "Q5": { from: 2008, to: 2026 }, "Q7": { from: 2006, to: 2026 }, "TT": { from: 2014, to: 2023 },
  },
  "BMW": {
    "1 Series": { from: 2011, to: 2026 }, "2 Series": { from: 2014, to: 2026 }, "3 Series": { from: 2012, to: 2026 },
    "4 Series": { from: 2013, to: 2026 }, "5 Series": { from: 2010, to: 2026 }, "6 Series": { from: 2011, to: 2026 },
    "X1": { from: 2015, to: 2026 }, "X3": { from: 2010, to: 2026 }, "X4": { from: 2014, to: 2026 },
    "X5": { from: 2013, to: 2026 }, "X6": { from: 2014, to: 2026 },
  },
  "Citroën": {
    "C3": { from: 2010, to: 2026 }, "C4": { from: 2010, to: 2026 }, "Berlingo": { from: 2008, to: 2026 },
  },
  "Cupra": {
    "Formentor": { from: 2020, to: 2026 }, "Leon": { from: 2020, to: 2026 }, "Born": { from: 2021, to: 2026 },
  },
  "Dacia": {
    "Duster": { from: 2012, to: 2026 }, "Sandero": { from: 2013, to: 2026 }, "Jogger": { from: 2022, to: 2026 },
  },
  "Fiat": {
    "500": { from: 2007, to: 2026 }, "Panda": { from: 2011, to: 2026 }, "Tipo": { from: 2015, to: 2026 },
  },
  "Ford": {
    "Fiesta": { from: 2008, to: 2023 }, "Focus": { from: 2011, to: 2026 }, "Puma": { from: 2019, to: 2026 },
    "Kuga": { from: 2012, to: 2026 }, "Transit Custom": { from: 2012, to: 2026 }, "Ranger": { from: 2011, to: 2026 },
  },
  "Honda": {
    "Civic": { from: 2011, to: 2026 }, "Jazz": { from: 2008, to: 2026 }, "CR-V": { from: 2012, to: 2026 },
  },
  "Hyundai": {
    "i10": { from: 2013, to: 2026 }, "i20": { from: 2014, to: 2026 }, "i30": { from: 2011, to: 2026 },
    "Tucson": { from: 2015, to: 2026 }, "Kona": { from: 2017, to: 2026 },
  },
  "Jaguar": {
    "F-Pace": { from: 2016, to: 2026 }, "E-Pace": { from: 2017, to: 2026 }, "XE": { from: 2015, to: 2024 },
    "XF": { from: 2015, to: 2024 },
  },
  "Kia": {
    "Picanto": { from: 2011, to: 2026 }, "Ceed": { from: 2012, to: 2026 }, "Sportage": { from: 2010, to: 2026 },
    "Niro": { from: 2016, to: 2026 }, "Stonic": { from: 2017, to: 2026 },
  },
  "Land Rover": {
    "Range Rover Evoque": { from: 2011, to: 2026 }, "Range Rover Sport": { from: 2013, to: 2026 },
    "Discovery Sport": { from: 2014, to: 2026 }, "Defender": { from: 2020, to: 2026 },
  },
  "Lexus": {
    "IS": { from: 2013, to: 2026 }, "NX": { from: 2014, to: 2026 }, "UX": { from: 2019, to: 2026 },
  },
  "Mazda": {
    "Mazda2": { from: 2014, to: 2026 }, "Mazda3": { from: 2013, to: 2026 }, "CX-3": { from: 2015, to: 2026 },
    "CX-5": { from: 2012, to: 2026 }, "MX-5": { from: 2015, to: 2026 },
  },
  "Mercedes-Benz": {
    "A-Class": { from: 2012, to: 2026 }, "B-Class": { from: 2011, to: 2026 }, "C-Class": { from: 2007, to: 2026 },
    "CLA": { from: 2013, to: 2026 }, "E-Class": { from: 2009, to: 2026 }, "GLA": { from: 2014, to: 2026 },
    "GLC": { from: 2015, to: 2026 },
  },
  "MG": {
    "MG3": { from: 2013, to: 2026 }, "MG ZS": { from: 2017, to: 2026 }, "MG HS": { from: 2019, to: 2026 },
  },
  "MINI": {
    "Hatch": { from: 2014, to: 2026 }, "Countryman": { from: 2017, to: 2026 }, "Clubman": { from: 2015, to: 2024 },
  },
  "Mitsubishi": {
    "ASX": { from: 2010, to: 2021 }, "Outlander": { from: 2012, to: 2021 }, "L200": { from: 2010, to: 2021 },
  },
  "Nissan": {
    "Micra": { from: 2010, to: 2023 }, "Juke": { from: 2010, to: 2026 }, "Qashqai": { from: 2013, to: 2026 },
    "Leaf": { from: 2011, to: 2026 }, "X-Trail": { from: 2014, to: 2026 },
  },
  "Peugeot": {
    "208": { from: 2012, to: 2026 }, "308": { from: 2013, to: 2026 }, "2008": { from: 2013, to: 2026 },
    "3008": { from: 2009, to: 2026 }, "5008": { from: 2017, to: 2026 },
  },
  "Porsche": {
    "Cayenne": { from: 2010, to: 2026 }, "Macan": { from: 2014, to: 2026 }, "911": { from: 2012, to: 2026 },
  },
  "Renault": {
    "Clio": { from: 2012, to: 2026 }, "Captur": { from: 2013, to: 2026 }, "Megane": { from: 2008, to: 2024 },
    "Kadjar": { from: 2015, to: 2022 },
  },
  "SEAT": {
    "Ibiza": { from: 2008, to: 2026 }, "Leon": { from: 2012, to: 2026 }, "Arona": { from: 2017, to: 2026 },
    "Ateca": { from: 2016, to: 2026 },
  },
  "Škoda": {
    "Fabia": { from: 2007, to: 2026 }, "Octavia": { from: 2013, to: 2026 }, "Karoq": { from: 2017, to: 2026 },
    "Kodiaq": { from: 2017, to: 2026 }, "Superb": { from: 2015, to: 2026 },
  },
  "Suzuki": {
    "Swift": { from: 2010, to: 2026 }, "Vitara": { from: 2015, to: 2026 }, "Jimny": { from: 2018, to: 2026 },
  },
  "Tesla": {
    "Model 3": { from: 2019, to: 2026 }, "Model Y": { from: 2022, to: 2026 },
  },
  "Toyota": {
    "Yaris": { from: 2011, to: 2026 }, "Corolla": { from: 2018, to: 2026 }, "C-HR": { from: 2016, to: 2026 },
    "RAV4": { from: 2013, to: 2026 }, "Aygo": { from: 2014, to: 2022 },
  },
  "Vauxhall": {
    "Corsa": { from: 2014, to: 2026 }, "Astra": { from: 2015, to: 2026 }, "Mokka": { from: 2012, to: 2026 },
    "Crossland": { from: 2017, to: 2026 }, "Grandland": { from: 2017, to: 2026 },
  },
  "Volkswagen": {
    "Golf": { from: 2008, to: 2026 }, "Polo": { from: 2009, to: 2026 }, "Passat": { from: 2010, to: 2026 },
    "Tiguan": { from: 2007, to: 2026 }, "T-Roc": { from: 2017, to: 2026 }, "Transporter": { from: 2010, to: 2026 },
  },
  "Volvo": {
    "XC40": { from: 2017, to: 2026 }, "XC60": { from: 2008, to: 2026 }, "V40": { from: 2012, to: 2019 },
    "S60": { from: 2010, to: 2026 },
  },
};
window.BOOKING_VEHICLES = BOOKING_VEHICLES;

const GALLERIES = {
  coding:     { title: "Coding & Retrofits",          icon: "⚡", tag: "coding-diagnostic" },
  ambient:    { title: "Ambient Lighting",             icon: "💡", tag: "ambient-lighting" },
  carplay:    { title: "CarPlay & Android Auto",       icon: "📱", tag: "carplay-android-auto" },
  starlight:  { title: "Starlight Headlining",         icon: "✨", tag: "starlight-headliner" },
  reversecam: { title: "Reverse Cameras",              icon: "📷", tag: "reverse-camera" },
  dashcam:    { title: "Dashcams",                     icon: "🎥", tag: "dashcam" },
  steering:   { title: "Steering Wheel Upgrades",      icon: "🛞", tag: "steering-wheel-upgrade" },
  cockpit:    { title: "Virtual Cockpits",             icon: "🖥️", tag: "virtual-cockpit" },
  more:       { title: "More Of Our Work",             icon: "➕", tag: "ambient-lighting" },
};

/* Build an optimised Cloudinary URL from a resource entry.
   w=700 keeps it light for gallery grids; f_auto/q_auto serve WebP/AVIF where supported. */
function cloudinaryUrl(resource) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/w_700,c_fill,f_auto,q_auto/v${resource.version}/${resource.public_id}.${resource.format}`;
}

/* ----- Toast notification ----- */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
