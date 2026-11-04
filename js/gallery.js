/* Yorkshire Autotech — full gallery page with per-service filters */

const FILTERS = [
  { key: "all", label: "All Work" },
  { key: "coding-diagnostic", label: "Coding & Retrofits" },
  { key: "ambient-lighting", label: "Ambient Lighting" },
  { key: "carplay-android-auto", label: "CarPlay & Android Auto" },
  { key: "starlight-headliner", label: "Starlight Headlining" },
  { key: "reverse-camera", label: "Reverse Cameras" },
  { key: "dashcam", label: "Dashcams" },
  { key: "steering-wheel-upgrade", label: "Steering Wheels" },
  { key: "virtual-cockpit", label: "Virtual Cockpits" },
];

let allImages = [];   // { url, fullUrl, tag, label }
let activeTag = "all";
let lightboxList = [];
let lightboxIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  renderFilterBar();
  loadAllImages();
  bindLightbox();
});

function renderFilterBar() {
  const bar = document.getElementById("galleryFilterBar");
  bar.innerHTML = FILTERS.map(
    (f) => `<button class="filter-btn ${f.key === "all" ? "active" : ""}" data-tag="${f.key}">${f.label}</button>`
  ).join("");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tag]");
    if (!btn) return;
    activeTag = btn.dataset.tag;
    bar.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderGrid();
  });
}

/* Fetch every tag once, merge into one list */
async function loadAllImages() {
  const grid = document.getElementById("galleryPageGrid");
  const tags = FILTERS.filter((f) => f.key !== "all");
  try {
    const results = await Promise.all(
      tags.map((f) =>
        fetch(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/list/${f.key}.json`)
          .then((r) => (r.ok ? r.json() : { resources: [] }))
          .catch(() => ({ resources: [] }))
          .then((data) =>
            (data.resources || []).map((r) => ({
              tag: f.key,
              label: f.label,
              url: cloudinaryUrl(r),
              fullUrl: `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/w_1600,f_auto,q_auto/v${r.version}/${r.public_id}.${r.format}`,
            }))
          )
      )
    );
    allImages = results.flat();
    if (allImages.length === 0) throw new Error("empty");

    /* Shuffle so "All Work" mixes every service */
    for (let i = allImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
    }
    renderGrid();
  } catch {
    grid.innerHTML = `<div class="testi-loading">Photos coming soon — follow us on socials for the latest work.</div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById("galleryPageGrid");
  const countEl = document.getElementById("galleryCount");
  const list = activeTag === "all" ? allImages : allImages.filter((img) => img.tag === activeTag);
  lightboxList = list;

  const activeLabel = FILTERS.find((f) => f.key === activeTag).label;
  countEl.textContent = `${list.length} photo${list.length !== 1 ? "s" : ""} — ${activeLabel}`;

  grid.innerHTML = list
    .map(
      (img, i) => `
      <button class="gallery-page-item" data-index="${i}" aria-label="View photo larger">
        <img src="${img.url}" alt="${img.label} by Yorkshire Autotech" loading="lazy">
        <span class="gp-label">${img.label}</span>
      </button>`
    )
    .join("");

  grid.querySelectorAll("[data-index]").forEach((btn) =>
    btn.addEventListener("click", () => openLightbox(Number(btn.dataset.index)))
  );
}

/* ---------- Lightbox ---------- */
function bindLightbox() {
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("lightboxNext").addEventListener("click", () => stepLightbox(1));
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if (e.target.id === "lightbox") closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("lightbox").classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
}

function openLightbox(index) {
  lightboxIndex = index;
  document.getElementById("lightboxImg").src = lightboxList[lightboxIndex].fullUrl;
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}

function stepLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + lightboxList.length) % lightboxList.length;
  document.getElementById("lightboxImg").src = lightboxList[lightboxIndex].fullUrl;
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}
