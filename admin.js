import { supabaseConfigured, currentUser, signIn, signOut, addProject, getProjects } from "./supabase.js";
import { localProjects, saveLocalProject, removeLocalProject, toProject } from "./store.js";
import { aiConfigured, aiHealth, aiAgents, aiDraft, aiResearch, aiChat, aiRunStream } from "./ai.js";

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

// ---------------- AI bridge (mini-agenci) ----------------

function setDot(state) {
  $("ai-dot").dataset.state = state;
}

async function initAi() {
  if (!aiConfigured) {
    setDot("off");
    $("ai-status").textContent = "Most AI nieskonfigurowany (config.js).";
    return;
  }
  try {
    const h = await aiHealth();
    setDot("on");
    $("ai-status").textContent = `Most online · research: ${h.researchProvider || "?"}${h.tokenRequired ? " · token wymagany" : ""}`;
  } catch {
    setDot("off");
    $("ai-status").textContent = "Most offline — uruchom: npm --prefix coder run serve";
  }
  try {
    const { agents } = await aiAgents();
    const list = agents || [];
    const options = list.map((a) => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("");
    $("ai-agent").innerHTML = options;
    const cwa = $("cwa-agent");
    if (cwa) cwa.innerHTML = options;
    $("ai-agents").innerHTML = list
      .map((a) => `<span class="agent-chip" title="${esc(a.description)}">${esc(a.name)}</span>`)
      .join("");
  } catch {
    /* ignore */
  }
}

function aiApplyDraft(idea) {
  const btn = $("ai-draft-btn");
  return async () => {
    if (!idea()) {
      setNote($("ai-note"), "error", "Najpierw opisz pomysł.");
      return;
    }
    btn.disabled = true;
    setNote($("ai-note"), "", "Mini-agenci pracują…");
    try {
      const { draft, note } = await aiDraft(idea());
      if (!draft) {
        setNote($("ai-note"), "error", "Nie udało się wygenerować draftu.");
        return;
      }
      $("name").value = draft.name || "";
      $("tagline").value = draft.tagline || "";
      $("description").value = draft.description || "";
      if (["app", "game", "tool", "site"].includes(draft.category)) $("category").value = draft.category;
      if (/^#[0-9a-f]{6}$/i.test(draft.accent || "")) $("accent").value = draft.accent;
      openBuilder(true);
      renderPreview();
      setNote($("ai-note"), "ok", `Gotowe (${draft.source || "ai"}). Popraw i opublikuj.${note ? " · " + note : ""}`);
    } catch (err) {
      setNote($("ai-note"), "error", "Błąd AI: " + err.message);
    } finally {
      btn.disabled = false;
    }
  };
}

async function init() {
  initTheme();
  initAi();

  $("start-btn").addEventListener("click", () => openBuilder(true));
  $("cancel-btn").addEventListener("click", () => openBuilder(false));
  $("preview-btn").addEventListener("click", openPreview);
  $("add-form").addEventListener("submit", publish);
  $("add-form").addEventListener("input", renderPreview);
  $("category").addEventListener("change", renderPreview);
  $("accent").addEventListener("input", renderPreview);
  $("featured").addEventListener("change", renderPreview);

  $("ai-draft-btn").addEventListener("click", aiApplyDraft(() => $("ai-idea").value.trim()));

  $("ai-research-btn").addEventListener("click", async () => {
    const idea = $("ai-idea").value.trim();
    if (!idea) {
      setNote($("ai-note"), "error", "Opisz temat do researchu.");
      return;
    }
    const btn = $("ai-research-btn");
    btn.disabled = true;
    setNote($("ai-note"), "", "Research w toku…");
    try {
      const r = await aiResearch([idea]);
      const first = (r.results && r.results[0] && r.results[0].results) || [];
      setNote($("ai-note"), "ok", `${r.count} zapytań · ${first.length} wyników (${r.provider}). Np.: ${(first[0] && first[0].title) || "brak"}`);
    } catch (err) {
      setNote($("ai-note"), "error", "Błąd researchu: " + err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $("ai-chat-btn").addEventListener("click", async () => {
    const msg = $("ai-msg").value.trim();
    if (!msg) return;
    const pre = $("ai-reply");
    pre.hidden = false;
    pre.textContent = "…";
    try {
      const r = await aiChat(msg, $("ai-agent").value || "worker");
      pre.textContent = r.reply || r.error || "(brak odpowiedzi)";
    } catch (err) {
      pre.textContent = "Błąd: " + err.message;
    }
  });

  // Create With AI — chat + konsola na żywo
  const chatLog = $("chat-log");
  const consoleEl = $("cwa-console");
  const cwaMsg = $("cwa-msg");
  const cwaSend = $("cwa-send");

  const consoleLine = (text) => {
    const t = new Date().toLocaleTimeString("pl-PL");
    consoleEl.textContent += `[${t}] ${text}\n`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };
  const bubble = (role, text) => {
    const div = document.createElement("div");
    div.className = `bubble bubble--${role}`;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  };

  async function sendCwa() {
    const message = cwaMsg.value.trim();
    if (!message) return;
    const agent = $("cwa-agent").value || "worker";
    cwaSend.disabled = true;
    setNote($("cwa-note"), "", "");
    bubble("user", message);
    cwaMsg.value = "";
    consoleLine(`▶ ${agent}: ${message.slice(0, 120)}`);
    let asst = null;
    try {
      await aiRunStream({ message, agent }, (ev) => {
        if (ev.type === "assistant") {
          if (!asst) asst = bubble("ai", "");
          asst.textContent += ev.text;
          chatLog.scrollTop = chatLog.scrollHeight;
        } else if (ev.type === "tool") {
          consoleLine(`🔧 ${ev.name} ${ev.input ? JSON.stringify(ev.input).slice(0, 160) : ""}`);
        } else if (ev.type === "log") {
          consoleLine(ev.text);
        } else if (ev.type === "error") {
          consoleLine("✖ " + ev.text);
          setNote($("cwa-note"), "error", ev.text);
        } else if (ev.type === "done") {
          consoleLine("■ zakończono");
        }
      });
    } catch (err) {
      consoleLine("✖ " + err.message);
      setNote($("cwa-note"), "error", err.message);
    } finally {
      cwaSend.disabled = false;
    }
  }

  cwaSend.addEventListener("click", sendCwa);
  cwaMsg.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendCwa();
    }
  });
  $("cwa-clear").addEventListener("click", () => {
    consoleEl.textContent = "";
  });

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
