import { supabaseConfigured, currentUser, signIn, signOut, addProject, getProjects } from "./supabase.js";
import { localProjects, saveLocalProject, removeLocalProject, toProject } from "./store.js";

const $ = (id) => document.getElementById(id);

const authPanel = $("auth-panel");
const workspace = $("workspace");
const startPanel = $("start-panel");
const builder = $("builder");
const authNote = $("auth-note");
const addNote = $("add-note");
const listEl = $("list");
const listSub = $("list-sub");

const CATS = { app: "Aplikacja", game: "Gra", tool: "Narzędzie", site: "Strona" };

let user = null;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "projekt";

const initials = (name) => {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || "?").trim().slice(0, 2).toUpperCase() || "?";
};

const fmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mln`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1).replace(".", ",")}k`;
  return String(v);
};

const stars = (n) =>
  Array.from({ length: 5 }, (_, i) => `<span class="material-icons ${i < Math.round(n) ? "on" : ""}">star</span>`).join("");

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

function setNote(node, kind, msg) {
  node.dataset.kind = kind || "";
  node.textContent = msg || "";
}

function showWorkspace(on) {
  authPanel.hidden = on;
  workspace.hidden = !on;
}

function openBuilder(on) {
  startPanel.hidden = on;
  builder.hidden = !on;
  if (on) {
    renderPreview();
    $("name").focus();
  }
}

function readForm() {
  return {
    name: $("name").value.trim(),
    category: $("category").value,
    accent: $("accent").value || "#7c5cff",
    tagline: $("tagline").value.trim(),
    description: $("description").value.trim(),
    url: $("url").value.trim(),
    installs: Number($("installs").value) || 0,
    rating: Number($("rating").value) || 0,
    featured: $("featured").checked,
  };
}

function renderPreview() {
  const p = readForm();
  const name = p.name || "Nazwa projektu";
  const tagline = p.tagline || p.description || "Krótki opis pojawi się tutaj.";
  const cat = CATS[p.category] || p.category;

  $("pv-tile").innerHTML = `
    <a class="tile glass" style="--a:${esc(p.accent)}" tabindex="-1">
      <span class="tile__icon"><span class="tile__initials">${esc(initials(name))}</span></span>
      <span class="tile__name">${esc(name)}</span>
      <span class="tile__meta">
        <span class="tile__rating"><span class="material-icons">star</span>${fmt(p.installs)}</span>
        <span class="tile__dot"></span><span>${esc(cat)}</span>
      </span>
    </a>`;

  $("pv-page").innerHTML = `
    <div class="hero glass" style="--a:${esc(p.accent)}">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__body project-head">
        <span class="project-head__icon" style="--a:${esc(p.accent)}">
          <span class="project-head__initials">${esc(initials(name))}</span>
        </span>
        <div class="project-head__info">
          <p class="hero__eyebrow"><span class="material-icons">apps</span> Dodane${p.featured ? " · wyróżniony" : ""}</p>
          <h1 class="hero__name"><b>${esc(name)}</b></h1>
          <p class="hero__tagline">${esc(tagline)}</p>
          <div class="hero__row">
            <span class="hero__cta" aria-hidden="true">Otwórz</span>
            <span class="hero__stat"><span class="material-icons">star</span>${fmt(p.installs)} · ${esc(cat)}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="preview__rating">${stars(p.rating)} <span>${(Number(p.rating) || 0).toFixed(1).replace(".", ",")}</span></div>`;
}

async function refreshList() {
  const locals = localProjects();
  let remote = [];
  if (supabaseConfigured && user) {
    try {
      remote = await getProjects();
    } catch {
      remote = [];
    }
  }
  const items = [
    ...locals.map((p) => ({ ...p, _local: true })),
    ...remote.map((p) => ({ ...p, _local: false })),
  ];
  listSub.textContent = items.length
    ? `${items.length} projekt(y). Lokalne możesz usuwać / podglądać.`
    : "Brak projektów. Kliknij Start making a project.";
  listEl.innerHTML = items
    .map(
      (p) => `
      <li>
        <span>
          <strong>${esc(p.name)}</strong>
          <br /><small>${esc(CATS[p.category] || p.category || "app")} · ${p._local ? "lokalny" : "baza"}</small>
        </span>
        <span style="display:flex;gap:8px">
          <a class="btn btn--ghost" style="padding:8px 14px" href="./project.html?id=${encodeURIComponent(p.slug || p.id)}" target="_blank" rel="noopener">Podgląd</a>
          ${p._local ? `<button class="btn btn--ghost" data-del="${p.id}" type="button" style="padding:8px 14px">Usuń</button>` : ""}
        </span>
      </li>`
    )
    .join("");
  listEl.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      removeLocalProject(b.dataset.del);
      refreshList();
    })
  );
}

async function publish(e) {
  e.preventDefault();
  const btn = $("add-btn");
  const project = readForm();
  if (!project.name || !project.url) {
    setNote(addNote, "error", "Nazwa i link są wymagane.");
    return;
  }
  btn.disabled = true;
  setNote(addNote, "", "Zapisywanie…");
  try {
    if (supabaseConfigured && user) {
      try {
        await addProject(project);
        setNote(addNote, "ok", "Opublikowano w bazie Supabase.");
      } catch (err) {
        saveLocalProject(project);
        setNote(addNote, "ok", "Baza odrzuciła zapis — zapisano lokalnie. (" + err.message + ")");
      }
    } else {
      saveLocalProject(project);
      setNote(addNote, "ok", "Opublikowano lokalnie — widać w hubie.");
    }
    refreshList();
  } finally {
    btn.disabled = false;
  }
}

function openPreview() {
  const p = readForm();
  sessionStorage.setItem("uw:preview", JSON.stringify({ ...p, slug: slugify(p.name) }));
  window.open("./project.html?preview=1", "_blank", "noopener");
}

async function init() {
  initTheme();

  $("start-btn").addEventListener("click", () => openBuilder(true));
  $("cancel-btn").addEventListener("click", () => openBuilder(false));
  $("preview-btn").addEventListener("click", openPreview);
  $("add-form").addEventListener("submit", publish);
  $("add-form").addEventListener("input", renderPreview);
  $("category").addEventListener("change", renderPreview);
  $("accent").addEventListener("input", renderPreview);
  $("featured").addEventListener("change", renderPreview);

  if (!supabaseConfigured) {
    setNote($("who"), "error", "Tryb lokalny (localStorage) — brak konfiguracji Supabase.");
    showWorkspace(true);
    openBuilder(true);
    refreshList();
    return;
  }

  user = await currentUser();
  if (user) {
    showWorkspace(true);
    $("who").textContent = `Zalogowany jako ${user.email}`;
  }
  refreshList();

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("login-btn").disabled = true;
    setNote(authNote, "", "Logowanie…");
    try {
      user = await signIn($("email").value.trim(), $("password").value);
      setNote(authNote, "ok", "Zalogowano.");
      showWorkspace(true);
      $("who").textContent = `Zalogowany jako ${user.email}`;
      refreshList();
    } catch (err) {
      setNote(authNote, "error", err.message);
    } finally {
      $("login-btn").disabled = false;
    }
  });

  $("logout-btn").addEventListener("click", async () => {
    await signOut();
    user = null;
    showWorkspace(false);
    openBuilder(false);
    setNote(authNote, "", "");
    refreshList();
  });
}

init();
