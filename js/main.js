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
      const success = document.getElementById("formSuccess");
      if (success) {
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
      const name = tier === "bespoke" ? SERVICE_PRODUCTS["ambient-lighting-bespoke"].name : `64-Colour Ambient Lighting — ${tierName}`;
      addServiceToBasket(`ambient-lighting-${tier}`, name);
      closeAmbientOptions();
    });
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

  /* Booking request form inside the slot modal, opened from the basket */
  let bookingVehicle = { make: "", model: "", year: "" };

  function openSlotPickerFromBasket() {
    if (!slotContent) return;
    const cart = getCart();
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const names = cart.map((i) => i.name).join(", ");

    /* Earliest requestable fitting date = 7 days from today */
    const minFitting = new Date();
    minFitting.setDate(minFitting.getDate() + 7);
    const minFittingStr = `${minFitting.getFullYear()}-${String(minFitting.getMonth() + 1).padStart(2, "0")}-${String(minFitting.getDate()).padStart(2, "0")}`;
    const minFittingLabel = minFitting.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    closeCart();
    slotContent.innerHTML = `
      <h3>Request Your <span class="gold-text">Booking</span></h3>
      <p class="modal-sub">Send us your details and preferred date — <strong>we'll confirm by phone or email</strong> before anything is booked in.</p>
      <div class="order-summary">
        ${cart.map((i) => `<div class="sum-row"><span>${i.name} × ${i.qty}</span><span>£${(i.price * i.qty).toLocaleString("en-GB")}</span></div>`).join("")}
        <div class="sum-row total"><span>Total</span><span>£${total.toLocaleString("en-GB")}</span></div>
      </div>
      <form id="bookingRequestForm" class="form" style="padding:0;background:none;border:none">
        <div class="form-row">
          <div class="form-group"><label for="brName">Full Name *</label><input type="text" id="brName" required placeholder="Your name"></div>
          <div class="form-group"><label for="brPhone">Phone *</label><input type="tel" id="brPhone" required placeholder="07..."></div>
        </div>
        <div class="form-group"><label for="brEmail">Email *</label><input type="email" id="brEmail" required placeholder="you@email.com"></div>
        <div class="form-group">
          <label>Your Vehicle *</label>
          <div class="vehicle-row">
            <select id="bkMake" required><option value="">Make</option></select>
            <select id="bkModel" required disabled><option value="">Model</option></select>
            <select id="bkYear" required disabled><option value="">Year</option></select>
          </div>
        </div>
        <div class="form-group">
          <label>Preferred Fitting Date *</label>
          <div class="cal" id="brCal"></div>
          <span class="date-hint">Earliest availability: ${minFittingLabel}</span>
          <span class="date-error" id="brDateError">Please pick a fitting date.</span>
        </div>
        <div class="form-group">
          <label>Preferred Time Slot *</label>
          <div class="slot-grid" id="brSlots"><span class="slot-hint">Pick a date to see available times.</span></div>
          <span class="date-error" id="brSlotError">Please choose a time slot.</span>
        </div>
        <div class="form-group"><label for="brNotes">Notes</label><textarea id="brNotes" placeholder="Anything we should know? Additional strips, specific requests…"></textarea></div>
        <button type="submit" class="btn btn-gold btn-block">Request Booking — £${total.toLocaleString("en-GB")}</button>
      </form>`;

    /* Populate makes from the shared VEHICLES data if present, else a local list */
    const makeSel = slotContent.querySelector("#bkMake");
    const modelSel = slotContent.querySelector("#bkModel");
    const yearSel = slotContent.querySelector("#bkYear");
    const vehicles = window.VEHICLES || BOOKING_VEHICLES;
    Object.keys(vehicles).forEach((m) => makeSel.add(new Option(m, m)));

    makeSel.addEventListener("change", () => {
      bookingVehicle.make = makeSel.value;
      bookingVehicle.model = "";
      bookingVehicle.year = "";
      modelSel.innerHTML = '<option value="">Model</option>';
      yearSel.innerHTML = '<option value="">Year</option>';
      yearSel.disabled = true;
      if (makeSel.value) {
        Object.keys(vehicles[makeSel.value]).forEach((m) => modelSel.add(new Option(m, m)));
        modelSel.disabled = false;
      } else modelSel.disabled = true;
    });

    modelSel.addEventListener("change", () => {
      bookingVehicle.model = modelSel.value;
      bookingVehicle.year = "";
      yearSel.innerHTML = '<option value="">Year</option>';
      if (modelSel.value) {
        const { from, to } = vehicles[bookingVehicle.make][modelSel.value];
        for (let y = to; y >= from; y--) yearSel.add(new Option(y, y));
        yearSel.disabled = false;
      } else yearSel.disabled = true;
    });

    yearSel.addEventListener("change", () => {
      bookingVehicle.year = yearSel.value;
    });

    /* ----- Time slot picker: shows the day's slots, greys out confirmed ones ----- */
    const slotGrid = slotContent.querySelector("#brSlots");
    let selectedSlot = "";
    let selectedDate = "";

    async function renderSlots(dateStr) {
      selectedSlot = "";
      slotContent.querySelector("#brSlotError").classList.remove("show");
      if (!dateStr || dateStr < minFittingStr) {
        slotGrid.innerHTML = '<span class="slot-hint">Pick a date to see available times.</span>';
        return;
      }
      slotGrid.innerHTML = '<span class="slot-hint">Checking availability…</span>';
      let booked = [];
      try {
        booked = await window.BookingBackend.getConfirmedSlots(dateStr);
      } catch { /* if availability can't be fetched, show all slots */ }
      /* Date may have changed while we were fetching */
      if (selectedDate !== dateStr) return;

      const slots = window.BookingBackend.slotsForDate(dateStr);
      slotGrid.innerHTML = slots.map((s) => {
        const taken = booked.includes(s);
        return `<button type="button" class="slot-btn${taken ? " taken" : ""}" data-slot="${s}" ${taken ? "disabled" : ""}>
            ${window.BookingBackend.slotLabel(s)}${taken ? "<span>Booked</span>" : ""}
          </button>`;
      }).join("");

      slotGrid.querySelectorAll(".slot-btn:not(.taken)").forEach((btn) => {
        btn.addEventListener("click", () => {
          slotGrid.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          selectedSlot = btn.dataset.slot;
          slotContent.querySelector("#brSlotError").classList.remove("show");
        });
      });
    }

    /* ----- Always-visible calendar for the fitting date ----- */
    const calEl = slotContent.querySelector("#brCal");
    const toYMD = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const minMonth = new Date(minFitting.getFullYear(), minFitting.getMonth(), 1);
    let calMonth = new Date(minMonth);

    function renderCal() {
      const year = calMonth.getFullYear();
      const month = calMonth.getMonth();
      const monthLabel = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      const atMinMonth = calMonth <= minMonth;
      /* Monday-first offset for the 1st of the month */
      const lead = (new Date(year, month, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let cells = "";
      for (let i = 0; i < lead; i++) cells += '<span class="cal-cell empty"></span>';
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const ymd = toYMD(date);
        const disabled = ymd < minFittingStr;
        const classes = ["cal-cell"];
        if (disabled) classes.push("off");
        if (ymd === selectedDate) classes.push("selected");
        cells += disabled
          ? `<span class="${classes.join(" ")}">${day}</span>`
          : `<button type="button" class="${classes.join(" ")}" data-date="${ymd}">${day}</button>`;
      }

      calEl.innerHTML = `
        <div class="cal-head">
          <button type="button" class="cal-nav" id="calPrev" aria-label="Previous month" ${atMinMonth ? "disabled" : ""}>‹</button>
          <span class="cal-month">${monthLabel}</span>
          <button type="button" class="cal-nav" id="calNext" aria-label="Next month">›</button>
        </div>
        <div class="cal-grid cal-days">
          ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span>${d}</span>`).join("")}
        </div>
        <div class="cal-grid">${cells}</div>`;

      calEl.querySelector("#calPrev").addEventListener("click", () => {
        calMonth = new Date(year, month - 1, 1);
        renderCal();
      });
      calEl.querySelector("#calNext").addEventListener("click", () => {
        calMonth = new Date(year, month + 1, 1);
        renderCal();
      });
      calEl.querySelectorAll(".cal-cell[data-date]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedDate = btn.dataset.date;
          calEl.querySelectorAll(".cal-cell.selected").forEach((c) => c.classList.remove("selected"));
          btn.classList.add("selected");
          slotContent.querySelector("#brDateError").classList.remove("show");
          renderSlots(selectedDate);
        });
      });
    }
    renderCal();

    slotContent.querySelector("#bookingRequestForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!selectedDate) {
        slotContent.querySelector("#brDateError").classList.add("show");
        calEl.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (!selectedSlot) {
        slotContent.querySelector("#brSlotError").classList.add("show");
        slotGrid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const chosen = new Date(selectedDate + "T12:00:00");
      const ref = "YA-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const vehicleStr = [bookingVehicle.year, bookingVehicle.make, bookingVehicle.model].filter(Boolean).join(" ");
      const dateLabel = chosen.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      const slotText = window.BookingBackend.slotLabel(selectedSlot);

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      try {
        await window.BookingBackend.submitBooking({
          ref,
          name: slotContent.querySelector("#brName").value.trim(),
          phone: slotContent.querySelector("#brPhone").value.trim(),
          email: slotContent.querySelector("#brEmail").value.trim(),
          vehicle: vehicleStr,
          items: names,
          total,
          date: selectedDate,
          slot: selectedSlot,
          notes: slotContent.querySelector("#brNotes").value.trim(),
        });
      } catch {
        submitBtn.disabled = false;
        submitBtn.textContent = `Request Booking — £${total.toLocaleString("en-GB")}`;
        showToast("⚠ Couldn't send your request — please try again.");
        return;
      }

      const waMessage =
        `Hi Yorkshire Autotech! I've just sent a booking request on your website.\n\n` +
        `Reference: ${ref}\n` +
        `Name: ${slotContent.querySelector("#brName").value.trim()}\n` +
        `Service: ${names}\n` +
        (vehicleStr ? `Vehicle: ${vehicleStr}\n` : "") +
        `Date: ${dateLabel}\n` +
        `Time: ${slotText}\n` +
        `Total: £${total.toLocaleString("en-GB")}\n\n` +
        `Please confirm my booking. Thanks!`;
      const waHref = window.BookingBackend.waLink(window.BookingBackend.businessWhatsApp, waMessage);

      slotContent.innerHTML = `
        <div class="checkout-success">
          <div class="tick">✅</div>
          <h3>Booking Request Received</h3>
          <p>Thank you! Your reference is <span class="order-ref">${ref}</span>.<br>
          We've received your request for <strong style="color:var(--gold-light)">${names}</strong>${vehicleStr ? ` for your ${vehicleStr}` : ""} on <strong style="color:var(--gold-light)">${dateLabel}</strong> at <strong style="color:var(--gold-light)">${slotText}</strong>.<br><br>
          <strong>Nothing is booked in yet</strong> — <strong style="color:var(--gold-light)">please confirm your details with us via WhatsApp</strong> using the button below, and we'll get you booked in. You can also reach us by phone or email if you prefer.</p>
          <br>
          <a class="btn btn-gold btn-block" href="${waHref}" target="_blank" rel="noopener">💬 Send Us Your Booking on WhatsApp</a>
          <p class="wa-hint">Fastest way to get confirmed — your booking details are pre-written, just press send.</p>
          <button class="btn btn-outline" id="bookingSuccessClose">Continue Browsing</button>
        </div>`;
      saveCart([]);
      document.getElementById("bookingSuccessClose").addEventListener("click", closeSlot);
    });

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
  "ambient-lighting-bespoke": { name: "Bespoke OEM-Style Ambient Lighting (from £400, final price on request)", fitted: 400 },
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
