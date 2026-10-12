import { supabaseConfigured, currentUser, signIn, signOut, addProject, getProjects } from "./supabase.js";
import { localProjects, saveLocalProject, removeLocalProject } from "./store.js";

const $ = (id) => document.getElementById(id);

const authPanel = $("auth-panel");
const addPanel = $("add-panel");
const authNote = $("auth-note");
const addNote = $("add-note");
const listEl = $("list");
const listSub = $("list-sub");

let user = null;

function initTheme() {
  const root = document.documentElement;
  const pref = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const set = (m) => {
    root.setAttribute("data-theme", m);
    localStorage.setItem("uw-theme", m);
  };
  set(localStorage.getItem("uw-theme") || pref);
  $("theme-toggle").addEventListener("click", () =>
    set(root.getAttribute("data-theme") === "dark" ? "light" : "dark")
  );
}

function showAddPanel(on) {
  authPanel.hidden = on;
  addPanel.hidden = !on;
}

function setNote(node, kind, msg) {
  node.dataset.kind = kind || "";
  node.textContent = msg || "";
}

async function refreshList() {
  const locals = localProjects();
  let remote = [];
  if (supabaseConfigured && user) {
    try {
      remote = await getProjects();
    } catch (e) {
      remote = [];
    }
  }
  const items = [
    ...locals.map((p) => ({ ...p, _local: true })),
    ...remote.map((p) => ({ ...p, _local: false })),
  ];
  listSub.textContent = items.length
    ? `${items.length} projekt(y). Lokalne możesz usuwać.`
    : "Brak projektów. Dodaj pierwszy powyżej.";
  listEl.innerHTML = items
    .map(
      (p) => `
      <li>
        <span>
          <strong>${escapeHtml(p.name)}</strong>
          <br /><small>${escapeHtml(p.category || "app")} · ${p._local ? "lokalny" : "baza"} · ${escapeHtml(p.url || "")}</small>
        </span>
        ${
          p._local
            ? `<button class="btn btn--ghost" data-del="${p.id}" type="button" style="padding:8px 14px">Usuń</button>`
            : `<a class="link" href="${escapeHtml(p.url || "#")}" target="_blank" rel="noopener">Otwórz</a>`
        }
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

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function readForm() {
  return {
    name: $("name").value.trim(),
    category: $("category").value,
    accent: $("accent").value,
    tagline: $("tagline").value.trim(),
    description: $("description").value.trim(),
    url: $("url").value.trim(),
    installs: Number($("installs").value) || 0,
    rating: Number($("rating").value) || 0,
    featured: $("featured").checked,
  };
}

async function onSubmit(e) {
  e.preventDefault();
  const btn = $("add-btn");
  const project = readForm();
  if (!project.name || !project.url) {
    setNote(addNote, "error", "Nazwa i link są wymagane.");
    return;
  }
  btn.disabled = true;
  try {
    if (supabaseConfigured && user) {
      await addProject(project);
      setNote(addNote, "ok", "Dodano do bazy Supabase.");
    } else {
      saveLocalProject(project);
      setNote(addNote, "ok", "Dodano lokalnie (zobaczysz w hubie).");
    }
    e.target.reset();
    $("accent").value = "#7c5cff";
    refreshList();
  } catch (err) {
    setNote(addNote, "error", "Nie udało się: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

async function init() {
  initTheme();
  $("add-form").addEventListener("submit", onSubmit);

  if (!supabaseConfigured) {
    setNote(authNote, "error", "Supabase nie skonfigurowany — działam w trybie lokalnym.");
    showAddPanel(true);
    $("who").textContent = "Tryb lokalny (localStorage).";
    refreshList();
    return;
  }

  user = await currentUser();
  if (user) {
    showAddPanel(true);
    $("who").textContent = `Zalogowany jako ${user.email}`;
  } else {
    showAddPanel(false);
  }
  refreshList();

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("login-btn").disabled = true;
    setNote(authNote, "", "Logowanie…");
    try {
      user = await signIn($("email").value.trim(), $("password").value);
      setNote(authNote, "ok", "Zalogowano.");
      showAddPanel(true);
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
    showAddPanel(false);
    setNote(authNote, "", "");
    refreshList();
  });
}

init();
