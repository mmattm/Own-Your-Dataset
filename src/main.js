import * as exifr from "exifr";

import { Grid } from "./grid.js";
import { Feed } from "./Feed.js";
import { Alt } from "./Alt.js";
import "./style.css";

// ------------------------------------------------
// MODE INITIAL : "grid" | "feed" | "alt"
// ------------------------------------------------
const INITIAL_VIEW = "grid";
// ------------------------------------------------

// ------------------- LOAD DATASET -------------------
async function loadDataset() {
  const res = await fetch("/dataset.json");
  return await res.json();
}

loadDataset().then((photos) => initApp(photos));

// ------------------------------------------------
// TOGGLE INFO (affiche les EXIF)
// ------------------------------------------------
export let SHOW_INFO = false;

export function toggleInfo() {
  SHOW_INFO = !SHOW_INFO;

  document.body.classList.toggle("info_active", SHOW_INFO);

  const btn = document.getElementById("info");
  btn.classList.toggle("active", SHOW_INFO);
}

// ------------------------------------------------
// TOGGLE BACKGROUND IMAGE (montrer / cacher thumb-bg)
// ------------------------------------------------
export let SHOW_BG = false;

export function toggleBackground() {
  SHOW_BG = !SHOW_BG;

  document.body.classList.toggle("bg_active", SHOW_BG);

  const btn = document.getElementById("show");
  btn.classList.toggle("active", SHOW_BG);
}
// ------------------------------------------------
// charge EXIF + génère HTML
// ------------------------------------------------
async function getExifHTML(src, meta) {
  try {
    const exif = await exifr.parse(src, {
      gps: true,
      tiff: true,
      ifd0: true,
      exif: true,
    });

    // Date
    let date = "";
    if (exif?.DateTimeOriginal) {
      date = new Date(exif.DateTimeOriginal).toLocaleDateString("fr-CH");
    }

    // GPS
    const lat = exif?.latitude ?? null;
    const lng = exif?.longitude ?? null;

    return `
      <div>${meta?.title ?? ""}</div>
      <div>${lat ? `${lat.toFixed(4)}°, ${lng.toFixed(4)}°` : ""}</div>
      <div>${date}</div>
    `;
  } catch (e) {
    console.warn("EXIF parse error:", e);

    return `
      <div>${meta?.title ?? ""}</div>
      <div></div>
      <div></div>
    `;
  }
}

// ------------------------------------------------
// LOGIQUE APP GLOBALE
// ------------------------------------------------
function initApp(photos) {
  const images = photos.map((p) => `/Dataset/Output/${p.filename}`);
  document.getElementById("info").addEventListener("click", toggleInfo);
  document.getElementById("show").addEventListener("click", toggleBackground);

  const views = document.querySelectorAll(".view");

  let gridInstance = false;
  let feedInstance = false;
  let altInstance = false;

  const buttons = document.querySelectorAll("nav button");

  // ------------------------------------------------
  // CLICK HANDLER : ACTIVER UNE VUE
  // ------------------------------------------------
  function activateView(target) {
    const viewEl = document.getElementById(target);

    // ------------------------------------------------
    // GRID VIEW
    // ------------------------------------------------
    if (target === "grid" && !gridInstance) {
      const container = document.getElementById("gridView");

      images.forEach(async (src, i) => {
        if (i > 11) return;

        const wrap = document.createElement("div");
        wrap.className = "thumb";

        const info = document.createElement("div");
        info.className = "thumb-info";
        info.innerHTML = await getExifHTML(src, photos[i]);
        wrap.appendChild(info);

        const bg = document.createElement("div");
        bg.className = "thumb-bg";
        bg.style.backgroundImage = `url('${src}')`;
        wrap.appendChild(bg);

        // 3) Append wrapper
        container.appendChild(wrap);

        // 4) Création du canvas p5
        new Grid(wrap, src, photos[i], i);
      });

      gridInstance = true;
    }

    // ------------------------------------------------
    // FEED VIEW
    // ------------------------------------------------
    if (target === "feed" && !feedInstance) {
      const container = document.getElementById("feedView");

      images.forEach(async (src, i) => {
        const wrap = document.createElement("div");
        wrap.className = "grid-item";

        const media = document.createElement("div");
        media.className = "feed-media";
        wrap.appendChild(media);

        // BACKGROUND
        const bg = document.createElement("div");
        bg.className = "feed-bg";
        bg.style.backgroundImage = `url('${src}')`;
        media.appendChild(bg);

        // CANVAS WRAPPER
        const canvasWrapper = document.createElement("div");
        canvasWrapper.className = "feed-canvas";
        media.appendChild(canvasWrapper);

        // INFOS
        const info = document.createElement("div");
        info.className = "feed-info";
        info.innerHTML = await getExifHTML(src, photos[i]);
        wrap.appendChild(info);

        container.appendChild(wrap);

        // Création du sketch Feed
        new Feed(canvasWrapper, src, photos[i], i);
      });

      feedInstance = true;
    }

    // ------------------------------------------------
    // ALT VIEW
    // ------------------------------------------------
    if (target === "alt" && !altInstance) {
      const container = document.getElementById("altView");
      new Alt(container, photos);
      altInstance = true;
    }

    // ------------------------------------------------
    // UI SWITCH VUES
    // ------------------------------------------------
    views.forEach((v) => v.classList.remove("active"));
    viewEl.classList.add("active");

    buttons.forEach((b) => b.classList.remove("active"));
    document
      .querySelector(`button[data-view="${target}"]`)
      .classList.add("active");
  }

  // ------------------------------------------------
  // INIT des boutons de navigation
  // ------------------------------------------------
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => activateView(btn.dataset.view));
  });

  // ------------------------------------------------
  // Lancement sur vue initiale
  // ------------------------------------------------
  const validViews = ["grid", "feed", "alt"];
  const startView = validViews.includes(INITIAL_VIEW) ? INITIAL_VIEW : "grid";
  activateView(startView);
}
