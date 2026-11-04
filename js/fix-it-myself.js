/* Filters Shopify Buy Button products by vehicle make and model.
   Supports the store's existing tags, e.g. BMW / BMW 3 Series and Audi / Audi Q7.
*/
document.addEventListener("DOMContentLoaded", () => {
  const make = document.getElementById("diyVehicleMake");
  const model = document.getElementById("diyVehicleModel");
  const reset = document.getElementById("diyVehicleFilterReset");
  const status = document.getElementById("diyVehicleFilterStatus");
  const vehicles = window.BOOKING_VEHICLES;
  if (!make || !model || !reset || !status || !vehicles) return;

  const productSelector = ".shopify-buy__product";
  const supportedMakes = ["Audi", "BMW", "Cupra", "Mercedes-Benz", "MINI", "SEAT", "Škoda", "Volkswagen"];
  let shopifyProducts = null;
  const normalise = (value) => String(value || "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const hasPhrase = (text, value) => {
    const phrase = normalise(value);
    return phrase && ` ${normalise(text)} `.includes(` ${phrase} `);
  };

  supportedMakes
    .filter((vehicleMake) => vehicles[vehicleMake])
    .forEach((vehicleMake) => make.add(new Option(vehicleMake, vehicleMake)));

  function resetModels() {
    model.innerHTML = '<option value="">Select model</option>';
    if (make.value) {
      Object.keys(vehicles[make.value]).sort().forEach((vehicleModel) => model.add(new Option(vehicleModel, vehicleModel)));
      model.disabled = false;
    } else {
      model.disabled = true;
    }
  }

  function productMatches(product) {
    const selectedMake = make.value;
    const selectedModel = model.value;
    if (!selectedMake || !selectedModel) return true;

    const productText = product.textContent || "";
    const taggedMakes = (product.dataset.vehicleMakes || "").split("|").filter(Boolean);
    const taggedModels = (product.dataset.vehicleModels || "").split("|").filter(Boolean);
    const hasFitmentData = taggedMakes.length || taggedModels.length;

    if (hasFitmentData) {
      return (!taggedMakes.length || taggedMakes.some((value) => normalise(value) === normalise(selectedMake)))
        && (!taggedModels.length || taggedModels.some((value) => normalise(value) === normalise(selectedModel)));
    }

    // Supports products whose title explicitly names the compatible vehicle.
    return hasPhrase(productText, selectedMake) && hasPhrase(productText, selectedModel);
  }

  function addFitmentToProductCards(products) {
    const cards = [...document.querySelectorAll(productSelector)];
    cards.forEach((card) => {
      const product = products.find((item) => hasPhrase(card.textContent, item.title));
      if (!product) return;

      const makes = [];
      const models = [];
      const productDetails = [...(product.tags || []), product.title].join(" ");
      (product.tags || []).forEach((tag) => {
        const [key, ...valueParts] = tag.split(":");
        const value = valueParts.join(":").trim();
        if (/^(make|brand)$/i.test(key) && value) makes.push(value);
        if (/^model$/i.test(key) && value) models.push(value);
        if (/^fitment$/i.test(key) && value.includes("|")) {
          const [vehicleMake, vehicleModel] = value.split("|").map((part) => part.trim());
          if (vehicleMake) makes.push(vehicleMake);
          if (vehicleModel) models.push(vehicleModel);
        }

        // Existing Shopify tags use the friendly format "BMW 3 Series".
        supportedMakes.forEach((vehicleMake) => {
          if (normalise(tag) === normalise(vehicleMake)) makes.push(vehicleMake);
          if (normalise(tag).startsWith(`${normalise(vehicleMake)} `)) {
            makes.push(vehicleMake);
            models.push(tag.slice(vehicleMake.length).trim());
          }
        });
      });

      // Covers products with no tags where the make/model appears in the title.
      supportedMakes.forEach((vehicleMake) => {
        if (hasPhrase(productDetails, vehicleMake)) makes.push(vehicleMake);
        Object.keys(vehicles[vehicleMake] || {}).forEach((vehicleModel) => {
          if (hasPhrase(productDetails, vehicleModel)) {
            makes.push(vehicleMake);
            models.push(vehicleModel);
          }
        });
      });
      card.dataset.vehicleMakes = [...new Set(makes)].join("|");
      card.dataset.vehicleModels = [...new Set(models)].join("|");
    });
  }

  async function loadShopifyFitment() {
    if (shopifyProducts) {
      addFitmentToProductCards(shopifyProducts);
      return;
    }
    try {
      const response = await fetch("https://uimpug-s5.myshopify.com/api/2025-01/graphql.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": "61579b8d16aa51aa6b6feeb578209861",
        },
        body: JSON.stringify({
          query: "{ collection(id: \\\"gid://shopify/Collection/755943965062\\\") { products(first: 250) { nodes { title tags } } } }",
        }),
      });
      const data = await response.json();
      shopifyProducts = data?.data?.collection?.products?.nodes;
      if (shopifyProducts) {
        addFitmentToProductCards(shopifyProducts);
        applyFilters();
      }
    } catch {
      // Product titles remain a useful fallback if Shopify fitment tags are unavailable.
    }
  }

  function applyFilters() {
    const products = [...document.querySelectorAll(productSelector)];
    const hasVehicle = Boolean(make.value && model.value);
    let matches = 0;

    products.forEach((product) => {
      const visible = productMatches(product);
      if (product.dataset.originalDisplay === undefined) product.dataset.originalDisplay = product.style.display;
      product.hidden = !visible;
      product.style.display = visible ? product.dataset.originalDisplay : "none";
      if (visible) matches += 1;
    });

    reset.hidden = !make.value;
    if (!hasVehicle) {
      status.textContent = make.value ? "Now choose your model to see compatible parts." : "Choose your make and model to check compatible parts.";
    } else if (products.length === 0) {
      status.textContent = "Loading compatible parts… your filter will apply automatically.";
    } else if (matches === 0) {
      status.textContent = `No compatible parts are currently shown for your ${make.value} ${model.value}.`;
    } else {
      status.textContent = `${matches} compatible part${matches === 1 ? "" : "s"} shown for your ${make.value} ${model.value}.`;
    }
  }

  make.addEventListener("change", () => {
    resetModels();
    applyFilters();
  });
  model.addEventListener("change", applyFilters);
  reset.addEventListener("click", () => {
    make.value = "";
    resetModels();
    applyFilters();
  });

  // Shopify loads its collection asynchronously; re-apply whenever it renders a card.
  new MutationObserver(() => {
    if (shopifyProducts) addFitmentToProductCards(shopifyProducts);
    applyFilters();
  }).observe(document.body, { childList: true, subtree: true });
  loadShopifyFitment();
  applyFilters();
});
