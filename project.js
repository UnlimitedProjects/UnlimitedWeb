import { getRepo, mapCurated, avatarUrl } from "./github.js";
import { CURATED } from "./data.js";
import { localProjects, toProject } from "./store.js";
import { getReviews, addReview, averageRating, ratingBuckets } from "./reviews.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const slug = params.get("id") || params.get("project") || "";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const vtName = (s) => "vt-" + String(s).replace(/[^a-zA-Z0-9_-]/g, "-");

function initials(p) {
  const a = (p.owner || "").slice(0, 1);
  const b = (p.name || "?").replace(/[^a-z0-9]/gi, "").slice(0, 1);
  return ((a + b) || String(p.name || "?").slice(0, 2)).toUpperCase();
}

function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 100000 ? 0 : 1).replace(".", ",")}k`;
  return String(v);
}

function initTheme() {
  const root = document.documentElement;
  const pref = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const set = (m) => {
    root.setAttribute("data-theme", m);
    localStorage.setItem("uw-theme", m);
  };
  set(localStorage.getItem("uw-theme") || pref);
  $("theme-toggle").addEventListener("click", () => set(root.getAttribute("data-theme") === "dark" ? "light" : "dark"));
}

async function findProject(id) {
  const repo = await getRepo(id);
  if (repo) return repo;
  const local = localProjects().find((p) => p.slug === id || p.id === id || p.name === id);
  if (local) return toProject(local);
  const cur = CURATED.find((c) => `${c.owner}/${c.name}` === id);
  return cur ? mapCurated(cur) : null;
}

function renderHead(p) {
  const host = $("project-head");
  if (!p) {
    document.title = "Nie znaleziono — UnlimitedWeb";
    host.innerHTML = `<div class="panel glass"><h1 class="panel__title">Nie znaleziono projektu</h1><p class="panel__sub">Sprawdź link albo wróć do huba.</p><a class="btn" href="./index.html">Wróć do huba</a></div>`;
    return;
  }
  document.title = `${p.name} — UnlimitedWeb`;
  const avatar = p.avatar || avatarUrl(p.owner, 320);
  host.innerHTML = `
    <div class="hero glass" style="--a:${esc(p.accent)}">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__body project-head">
        <span class="project-head__icon" style="--a:${esc(p.accent)};view-transition-name:${vtName(p.slug || p.id)}">
          ${avatar ? `<img src="${esc(avatar)}" alt="" onerror="this.remove()" />` : ""}
          <span class="project-head__initials">${esc(initials(p))}</span>
        </span>
        <div class="project-head__info">
          <p class="hero__eyebrow"><span class="material-icons">apps</span> ${esc(p.owner || "Projekt")}</p>
          <h1 class="hero__name"><b>${esc(p.name)}</b></h1>
          <p class="hero__tagline">${esc(p.tagline || p.description || "Brak opisu.")}</p>
          <div class="hero__row">
            <a class="hero__cta" href="${esc(p.url)}" target="_blank" rel="noopener">Otwórz na GitHubie</a>
            ${p.homepage ? `<a class="hero__reroll glass" href="${esc(p.homepage)}" target="_blank" rel="noopener"><span class="material-icons">public</span> Strona</a>` : ""}
            <span class="hero__stat"><span class="material-icons">star</span>${fmt(p.stars)}${p.language ? ` · ${esc(p.language)}` : ""}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function renderSummary(reviews) {
  const avg = averageRating(reviews);
  const buckets = ratingBuckets(reviews);
  const total = reviews.length || 1;
  const bars = [5, 4, 3, 2, 1]
    .map(
      (n) => `
      <div class="bar">
        <span class="bar__n">${n}<span class="material-icons">star</span></span>
        <span class="bar__track"><span class="bar__fill" style="width:${(buckets[n] / total) * 100}%"></span></span>
        <span class="bar__c">${buckets[n]}</span>
      </div>`
    )
    .join("");
  $("rating-summary").innerHTML = `
    <div class="summary">
      <div class="summary__score">
        <div class="summary__num">${reviews.length ? avg.toFixed(1).replace(".", ",") : "—"}</div>
        <div class="summary__stars">${starsHTML(Math.round(avg))}</div>
        <div class="summary__count">${reviews.length} ${reviews.length === 1 ? "ocena" : "ocen"}</div>
      </div>
      <div class="summary__bars">${bars}</div>
    </div>`;
}

function starsHTML(n) {
  return Array.from({ length: 5 }, (_, i) => `<span class="material-icons ${i < n ? "on" : ""}">star</span>`).join("");
}

function renderReviews(reviews) {
  const host = $("reviews");
  if (!reviews.length) {
    host.innerHTML = `<li class="reviews__empty">Brak recenzji. Bądź pierwszy!</li>`;
    return;
  }
  host.innerHTML = reviews
    .map(
      (r) => `
      <li class="review">
        <div class="review__top">
          <span class="review__avatar" aria-hidden="true">${esc((r.author || "A").slice(0, 1).toUpperCase())}</span>
          <span class="review__author">${esc(r.author || "Anonim")}</span>
          <span class="review__stars">${starsHTML(Math.round(Number(r.rating) || 0))}</span>
          <span class="review__date">${new Date(r.created_at).toLocaleDateString("pl-PL")}</span>
        </div>
        ${r.comment ? `<p class="review__text">${esc(r.comment)}</p>` : ""}
      </li>`
    )
    .join("");
}

let value = 5;
function initStars() {
  const wrap = $("stars");
  const paint = (v) => {
    wrap.querySelectorAll(".star").forEach((b) => {
      const on = Number(b.dataset.v) <= v;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", String(Number(b.dataset.v) === value));
    });
  };
  wrap.addEventListener("click", (e) => {
    const b = e.target.closest(".star");
    if (!b) return;
    value = Number(b.dataset.v);
    paint(value);
  });
  wrap.addEventListener("pointerover", (e) => {
    const b = e.target.closest(".star");
    if (b) paint(Number(b.dataset.v));
  });
  wrap.addEventListener("pointerleave", () => paint(value));
  paint(value);
}

async function refresh() {
  const reviews = await getReviews(slug);
  renderSummary(reviews);
  renderReviews(reviews);
}

async function init() {
  initTheme();
  initStars();
  const project = await findProject(slug);
  renderHead(project);

  $("review-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("review-btn");
    btn.disabled = true;
    try {
      await addReview({
        slug,
        rating: value,
        comment: $("comment").value.trim(),
        author: $("author").value.trim(),
      });
      $("comment").value = "";
      $("review-note").dataset.kind = "ok";
      $("review-note").textContent = "Dzięki za ocenę!";
      await refresh();
    } catch (err) {
      $("review-note").dataset.kind = "error";
      $("review-note").textContent = "Nie udało się dodać: " + err.message;
    } finally {
      btn.disabled = false;
    }
  });

  if (slug) await refresh();
}

init();
