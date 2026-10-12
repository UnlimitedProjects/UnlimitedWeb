import { CATEGORIES, FALLBACK_PROJECTS } from "./data.js";
import { supabaseConfigured, getProjects } from "./supabase.js";

const state = {
  projects: [],
  category: "all",
  query: "",
};

const el = {
  chips: document.getElementById("chips"),
  featured: document.getElementById("featured"),
  shelf: document.getElementById("shelf"),
  grid: document.getElementById("grid"),
  count: document.getElementById("result-count"),
  empty: document.getElementById("empty"),
  search: document.getElementById("search"),
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const catLabel = (id) => (CATEGORIES.find((c) => c.id === id) || { label: id }).label;

function initials(name) {
  const clean = String(name || "?").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

const fmtInstalls = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)} mln`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)} tys.`;
  return String(v);
};

const STAR =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.9 6.26 6.86.6-5.2 4.5 1.55 6.72L12 16.9 5.89 20.08 7.44 13.36 2.24 8.86l6.86-.6L12 2Z"/></svg>';

function cardHTML(p) {
  return `
    <article class="card" role="listitem" style="--a:${esc(p.accent || "#0fae74")}">
      <div class="card__top">
        <span class="tile" aria-hidden="true">${esc(initials(p.name))}</span>
        <div class="card__id">
          <h3 class="card__name">${esc(p.name)}</h3>
          <p class="card__cat">${esc(catLabel(p.category))}</p>
        </div>
      </div>
      <p class="card__tagline">${esc(p.tagline || p.description || "")}</p>
      <div class="card__foot">
        <span class="rating">${STAR}${(Number(p.rating) || 0).toFixed(1)}</span>
        <a class="open" href="${esc(p.url || "#")}" target="_blank" rel="noopener">Otwórz</a>
      </div>
    </article>`;
}

function renderChips() {
  el.chips.innerHTML = CATEGORIES.map(
    (c) =>
      `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${c.id === state.category}">${esc(
        c.label
      )}</button>`
  ).join("");
  el.chips.querySelectorAll(".chip").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      renderChips();
      render();
    })
  );
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  return state.projects.filter((p) => {
    if (state.category !== "all" && p.category !== state.category) return false;
    if (!q) return true;
    return [p.name, p.tagline, p.description, catLabel(p.category)].join(" ").toLowerCase().includes(q);
  });
}

function renderFeatured(list) {
  const p = list.find((x) => x.featured) || list[0];
  if (!p) {
    el.featured.innerHTML = "";
    return;
  }
  el.featured.innerHTML = `
    <div class="banner" style="--a:${esc(p.accent || "#0fae74")}">
      <div>
        <p class="banner__eyebrow">Wyróżniony projekt</p>
        <h2 class="banner__name">${esc(p.name)}</h2>
        <p class="banner__tagline">${esc(p.tagline || p.description || "")}</p>
        <div class="banner__meta">
          <span class="rating" style="color:inherit">${STAR}${(Number(p.rating) || 0).toFixed(1)}</span>
          <span>${fmtInstalls(p.installs)} pobrań</span>
        </div>
      </div>
      <a class="banner__cta" href="${esc(p.url || "#")}" target="_blank" rel="noopener">Otwórz</a>
    </div>`;
}

function render() {
  const list = filtered();

  el.shelf.innerHTML = state.projects
    .slice()
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 8)
    .map(cardHTML)
    .join("");

  el.grid.innerHTML = list.map(cardHTML).join("");
  el.empty.hidden = list.length !== 0;
  el.count.textContent = `${list.length} ${list.length === 1 ? "projekt" : "projektów"}`;
}

function renderSkeleton() {
  el.shelf.innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton"></div>').join("");
  el.grid.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton"></div>').join("");
}

function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const order = ["light", "dark"];
  const stored = localStorage.getItem("uw-theme");
  const initial =
    stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.setAttribute("data-theme", initial);
  btn.addEventListener("click", () => {
    const next = order[(order.indexOf(root.getAttribute("data-theme")) + 1) % order.length];
    root.setAttribute("data-theme", next);
    localStorage.setItem("uw-theme", next);
  });
}

async function load() {
  renderSkeleton();
  let projects = [];
  if (supabaseConfigured) {
    try {
      projects = await getProjects();
    } catch (err) {
      console.warn("Supabase:", err.message);
    }
  }
  if (!projects.length) projects = FALLBACK_PROJECTS;
  state.projects = projects;
  renderFeatured(projects);
  renderChips();
  render();
}

el.search.addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

initTheme();
load();
