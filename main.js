import { CATEGORIES, FALLBACK_PROJECTS } from "./data.js";
import { supabaseConfigured, getProjects } from "./supabase.js";

const TABS = [
  { id: "all", label: "Wszystkie" },
  { id: "app", label: "Aplikacje" },
  { id: "game", label: "Gry" },
  { id: "tool", label: "Narzędzia" },
  { id: "site", label: "Strony" },
];

const FILTERS = [
  { id: "reco", label: "Polecane" },
  { id: "top", label: "Najpopularniejsze" },
  { id: "rated", label: "Najlepiej oceniane" },
  { id: "featured", label: "Wyróżnione" },
];

const state = { projects: [], tab: "all", filter: "reco", query: "" };

const el = {
  tabs: document.getElementById("tabs"),
  filters: document.getElementById("filters"),
  hero: document.getElementById("hero"),
  shelves: document.getElementById("shelves"),
  search: document.getElementById("search"),
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const catLabel = (id) => (CATEGORIES.find((c) => c.id === id) || { label: id }).label;

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || "?").trim().slice(0, 2).toUpperCase();
}

const fmtInstalls = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mln`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1).replace(".", ",")} tys.`;
  return String(v);
};

const fmtRating = (r) => (Number(r) || 0).toFixed(1).replace(".", ",");

function tileHTML(p) {
  return `
    <a class="tile" href="${esc(p.url || "#")}" target="_blank" rel="noopener" title="${esc(p.name)}">
      <span class="tile__icon" style="--a:${esc(p.accent || "#01875f")}" aria-hidden="true">${esc(initials(p.name))}</span>
      <span class="tile__name">${esc(p.name)}</span>
      <span class="tile__meta">
        <span class="tile__rating">
          <span class="material-icons" aria-hidden="true" style="color:#ffce00">star</span>${fmtRating(p.rating)}
        </span>
        <span class="tile__dot" aria-hidden="true"></span>
        <span>${fmtInstalls(p.installs)}</span>
      </span>
    </a>`;
}

function renderTabs() {
  el.tabs.innerHTML = TABS.map(
    (t) =>
      `<button class="tab" role="tab" data-tab="${t.id}" aria-selected="${t.id === state.tab}">${esc(t.label)}</button>`
  ).join("");
  el.tabs.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      renderTabs();
      render();
    })
  );
}

function renderFilters() {
  el.filters.innerHTML = FILTERS.map(
    (f) =>
      `<button class="chip" type="button" data-filter="${f.id}" aria-pressed="${f.id === state.filter}">${esc(f.label)}</button>`
  ).join("");
  el.filters.querySelectorAll(".chip").forEach((b) =>
    b.addEventListener("click", () => {
      state.filter = b.dataset.filter;
      renderFilters();
      render();
    })
  );
}

function byTab(list) {
  return state.tab === "all" ? list : list.filter((p) => p.category === state.tab);
}

function byQuery(list) {
  const q = state.query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((p) =>
    [p.name, p.tagline, p.description, catLabel(p.category)].join(" ").toLowerCase().includes(q)
  );
}

function sortFor(filter, list) {
  const arr = list.slice();
  if (filter === "top") return arr.sort((a, b) => (Number(b.installs) || 0) - (Number(a.installs) || 0));
  if (filter === "rated") return arr.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  return arr.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
}

function renderHero(pool) {
  const p = pool.find((x) => x.featured) || pool[0];
  if (!p) {
    el.hero.innerHTML = "";
    return;
  }
  el.hero.innerHTML = `
    <div class="hero__card" style="--a:${esc(p.accent || "#01875f")}">
      <p class="hero__eyebrow">Wyróżniony projekt</p>
      <h1 class="hero__name">${esc(p.name)}</h1>
      <p class="hero__tagline">${esc(p.tagline || p.description || "")}</p>
      <div class="hero__row">
        <a class="hero__cta" href="${esc(p.url || "#")}" target="_blank" rel="noopener">Otwórz</a>
        <span class="hero__rating">
          <span class="material-icons" aria-hidden="true">star</span>${fmtRating(p.rating)}
          <span style="opacity:.85;color:#fff;font-weight:400"> · ${fmtInstalls(p.installs)} pobrań</span>
        </span>
      </div>
    </div>`;
}

function shelfHTML(title, items, id) {
  const body = items.length ? items.map(tileHTML).join("") : `<p class="shelf__empty">Brak projektów.</p>`;
  const arrows = items.length
    ? `<button class="shelf__arrow shelf__arrow--prev" type="button" aria-label="Poprzednie" data-dir="-1">
         <span class="material-icons">chevron_left</span></button>
       <button class="shelf__arrow shelf__arrow--next" type="button" aria-label="Następne" data-dir="1">
         <span class="material-icons">chevron_right</span></button>`
    : "";
  return `
    <section class="shelf" aria-labelledby="sh-${id}">
      <div class="shelf__head">
        <h2 class="shelf__title" id="sh-${id}">${esc(title)}</h2>
      </div>
      <div class="shelf__viewport">
        <div class="shelf__track" data-track>${body}</div>
        ${arrows}
      </div>
    </section>`;
}

function wireArrows() {
  el.shelves.querySelectorAll(".shelf__viewport").forEach((vp) => {
    const track = vp.querySelector("[data-track]");
    const prev = vp.querySelector(".shelf__arrow--prev");
    const next = vp.querySelector(".shelf__arrow--next");
    if (!track || !prev || !next) return;
    const step = () => Math.max(240, Math.round(track.clientWidth * 0.85));
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
}

function render() {
  const pool = byQuery(byTab(state.projects));
  renderHero(pool);

  const reco = sortFor("rated", pool).slice(0, 14);
  const top = sortFor("top", pool).slice(0, 14);
  const featuredOnly = pool.filter((p) => p.featured);
  const all = sortFor(state.filter, pool);

  const primary = state.filter === "top" ? top : state.filter === "featured" ? featuredOnly : reco;

  el.shelves.innerHTML =
    (primary.length ? shelfHTML("Polecane dla Ciebie", primary, "a") : "") +
    (top.length ? shelfHTML("Popularne teraz", top, "b") : "") +
    (all.length ? shelfHTML(all.length === pool.length ? "Wszystkie projekty" : `Wyniki: ${catLabel(state.tab)}`, all, "c") : "") +
    (!pool.length ? `<p class="shelf__empty" style="padding:40px 16px;text-align:center">Nic nie znaleziono.</p>` : "");

  wireArrows();
}

function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const pref = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const stored = localStorage.getItem("uw-theme");
  const set = (mode) => {
    root.setAttribute("data-theme", mode);
    localStorage.setItem("uw-theme", mode);
  };
  set(stored || pref);
  btn.addEventListener("click", () => set(root.getAttribute("data-theme") === "dark" ? "light" : "dark"));
}

async function load() {
  renderTabs();
  renderFilters();
  state.projects = FALLBACK_PROJECTS;
  render();

  if (!supabaseConfigured) return;
  try {
    const projects = await getProjects();
    if (projects && projects.length) {
      state.projects = projects;
      render();
    }
  } catch (err) {
    console.warn("Supabase:", err.message);
  }
}

el.search.addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

initTheme();
load();
