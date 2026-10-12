import { CURATED, STAR_FILTERS, MIN_STARS_FEATURED } from "./data.js";
import { fetchTopRepos, projectOfTheDay, mapCurated } from "./github.js";
import { supabaseConfigured, getProjects } from "./supabase.js";
import { localProjects, toProject } from "./store.js";

const state = {
  github: [],
  admin: [],
  pod: null,
  tab: "all",
  filter: "all",
  query: "",
  ready: false,
};

const el = {
  tabs: document.getElementById("tabs"),
  filters: document.getElementById("filters"),
  hero: document.getElementById("hero"),
  shelves: document.getElementById("shelves"),
  search: document.getElementById("search"),
  podReroll: document.getElementById("pod-reroll"),
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function initials(p) {
  const a = (p.owner || "").slice(0, 1);
  const b = (p.name || "?").replace(/[^a-z0-9]/gi, "").slice(0, 1);
  return ((a + b) || String(p.name || "?").slice(0, 2)).toUpperCase();
}

function fmtStars(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mln`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1).replace(".", ",")}k`;
  return String(v);
}

const allProjects = () => [...state.admin, ...state.github];

function allTabs() {
  const counts = {};
  for (const p of state.github) if (p.language) counts[p.language] = (counts[p.language] || 0) + 1;
  const langs = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([l]) => l);
  const list = [{ id: "all", label: "Wszystkie" }];
  if (state.admin.length) list.push({ id: "admin", label: "Dodane" });
  for (const l of langs) list.push({ id: l, label: l });
  return list;
}

function matches(p) {
  const q = state.query.trim().toLowerCase();
  if (q && ![p.name, p.owner, p.tagline, p.language].join(" ").toLowerCase().includes(q)) return false;
  const f = STAR_FILTERS.find((x) => x.id === state.filter);
  if (f && (Number(p.stars) || 0) < f.min) return false;
  if (state.tab === "admin") return p.source !== "github";
  if (state.tab !== "all" && p.language !== state.tab) return false;
  return true;
}

function tileHTML(p, i) {
  return `
    <a class="tile glass" href="${esc(p.url)}" target="_blank" rel="noopener" style="--a:${esc(p.accent)};--i:${i}" data-tile title="${esc(p.owner ? p.owner + "/" + p.name : p.name)}">
      <span class="tile__icon" aria-hidden="true">${esc(initials(p))}</span>
      <span class="tile__name">${esc(p.name)}</span>
      <span class="tile__meta">
        <span class="tile__rating"><span class="material-icons" aria-hidden="true">star</span>${fmtStars(p.stars)}</span>
        ${p.language ? `<span class="tile__dot" aria-hidden="true"></span><span>${esc(p.language)}</span>` : ""}
      </span>
    </a>`;
}

function shelfHTML(title, items, id) {
  if (!items.length) return "";
  const body = items.map((p, i) => tileHTML(p, Math.min(i, 12))).join("");
  return `
    <section class="shelf" aria-labelledby="sh-${id}">
      <div class="shelf__head"><h2 class="shelf__title" id="sh-${id}">${esc(title)}</h2></div>
      <div class="shelf__viewport">
        <div class="shelf__track">${body}</div>
        <button class="shelf__arrow shelf__arrow--prev glass" type="button" aria-label="Poprzednie"><span class="material-icons">chevron_left</span></button>
        <button class="shelf__arrow shelf__arrow--next glass" type="button" aria-label="Następne"><span class="material-icons">chevron_right</span></button>
      </div>
    </section>`;
}

function renderTabs() {
  const tabs = allTabs();
  if (!tabs.some((t) => t.id === state.tab)) state.tab = "all";
  el.tabs.innerHTML = tabs
    .map((t) => `<button class="tab" role="tab" data-tab="${esc(t.id)}" aria-selected="${t.id === state.tab}">${esc(t.label)}</button>`)
    .join("");
  el.tabs.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      renderTabs();
      render();
    })
  );
}

function renderFilters() {
  el.filters.innerHTML = STAR_FILTERS.map(
    (f) => `<button class="chip glass" type="button" data-filter="${f.id}" aria-pressed="${f.id === state.filter}">${esc(f.label)}</button>`
  ).join("");
  el.filters.querySelectorAll(".chip").forEach((b) =>
    b.addEventListener("click", () => {
      state.filter = b.dataset.filter;
      renderFilters();
      render();
    })
  );
}

function renderHero() {
  const p = state.pod;
  if (!p) {
    el.hero.innerHTML = "";
    return;
  }
  el.hero.innerHTML = `
    <div class="hero glass" style="--a:${esc(p.accent)}">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__body">
        <p class="hero__eyebrow"><span class="material-icons">auto_awesome</span> Projekt GitHub dnia</p>
        <h1 class="hero__name">${esc(p.owner ? p.owner + "/" : "")}<b>${esc(p.name)}</b></h1>
        <p class="hero__tagline">${esc(p.tagline)}</p>
        <div class="hero__row">
          <a class="hero__cta" href="${esc(p.url)}" target="_blank" rel="noopener">Otwórz na GitHubie</a>
          <button class="hero__reroll glass" type="button" id="pod-reroll"><span class="material-icons">casino</span> Losuj inne</button>
          <span class="hero__stat"><span class="material-icons" aria-hidden="true">star</span>${fmtStars(p.stars)}${p.language ? ` · ${esc(p.language)}` : ""}</span>
        </div>
      </div>
    </div>`;
  const btn = document.getElementById("pod-reroll");
  if (btn) btn.addEventListener("click", reroll);
}

function reroll() {
  const pool = state.github.filter((p) => p.stars >= MIN_STARS_FEATURED);
  const src = pool.length ? pool : CURATED.filter((c) => c.stars >= MIN_STARS_FEATURED).map(mapCurated);
  if (!src.length) return;
  let pick = state.pod;
  for (let i = 0; i < 8 && pick === state.pod; i++) pick = src[Math.floor(Math.random() * src.length)];
  state.pod = pick;
  renderHero();
}

function render() {
  const pool = allProjects().filter(matches);
  const byStars = pool.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0));
  const added = state.admin.filter(matches);

  el.shelves.innerHTML =
    shelfHTML("Dodane projekty", added, "added") +
    shelfHTML("Popularne na GitHubie", byStars.slice(0, 14), "top") +
    shelfHTML(state.tab === "all" ? "Wszystkie projekty" : `Wszystkie · ${state.tab}`, byStars.slice(0, 40), "all") +
    (!pool.length ? `<p class="empty glass" style="margin:32px 16px">Nic nie znaleziono.</p>` : "");

  wireShelves();
}

function wireShelves() {
  el.shelves.querySelectorAll(".shelf__viewport").forEach((vp) => {
    const track = vp.querySelector(".shelf__track");
    const prev = vp.querySelector(".shelf__arrow--prev");
    const next = vp.querySelector(".shelf__arrow--next");
    const step = () => Math.max(260, Math.round(track.clientWidth * 0.85));
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  el.shelves.querySelectorAll("[data-tile]").forEach((t) => {
    t.addEventListener("pointermove", (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      t.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const pref = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const stored = localStorage.getItem("uw-theme");
  const set = (m) => {
    root.setAttribute("data-theme", m);
    localStorage.setItem("uw-theme", m);
  };
  set(stored || pref);
  btn.addEventListener("click", () => set(root.getAttribute("data-theme") === "dark" ? "light" : "dark"));
}

async function load() {
  renderFilters();
  renderTabs();

  state.github = CURATED.map(mapCurated);
  state.admin = localProjects().map(toProject);
  state.pod = (state.github.find((p) => p.stars >= MIN_STARS_FEATURED) || state.github[0]) || null;
  state.ready = true;
  renderTabs();
  render();
  renderHero();

  const tasks = [];
  tasks.push(
    fetchTopRepos({ minStars: 10000, perPage: 80 })
      .then((repos) => {
        if (repos && repos.length) {
          state.github = repos;
          renderTabs();
          render();
        }
      })
      .catch(() => {})
  );
  tasks.push(
    projectOfTheDay()
      .then((pod) => {
        if (pod) {
          state.pod = pod;
          renderHero();
        }
      })
      .catch(() => {})
  );
  if (supabaseConfigured) {
    tasks.push(
      getProjects()
        .then((rows) => {
          if (rows && rows.length) {
            state.admin = [...localProjects().map(toProject), ...rows.map(toProject)];
            render();
          }
        })
        .catch(() => {})
    );
  }
  await Promise.allSettled(tasks);
}

el.search.addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

initTheme();
load();
