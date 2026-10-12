import { supabaseConfigured, ping, joinWaitlist } from "./supabase.js";

const root = document.documentElement;
const THEMES = ["auto", "light", "dark"];

function currentTheme() {
  const stored = localStorage.getItem("uw-theme");
  return THEMES.includes(stored) ? stored : "auto";
}

function applyTheme(mode) {
  if (mode === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
  localStorage.setItem("uw-theme", mode);
  const btn = document.getElementById("theme-toggle");
  const state = document.getElementById("theme-state");
  if (state) state.textContent = mode;
  if (btn) btn.setAttribute("aria-pressed", String(mode === "dark"));
}

function initTheme() {
  applyTheme(currentTheme());
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
    applyTheme(next);
  });
}

function initCounters() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nodes = [...document.querySelectorAll("[data-count]")];
  if (!nodes.length) return;

  const render = (el, value) => {
    el.textContent = String(value);
  };

  const animate = (el, target) => {
    if (reduce) return render(el, target);
    const dur = 900;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      render(el, Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          animate(e.target, Number(e.target.dataset.count) || 0);
          obs.unobserve(e.target);
        }
      }
    },
    { threshold: 0.4 }
  );
  nodes.forEach((n) => {
    render(n, 0);
    io.observe(n);
  });
}

function initWaitlist() {
  const form = document.getElementById("waitlist");
  const input = document.getElementById("email");
  const button = document.getElementById("waitlist-submit");
  const status = document.getElementById("waitlist-status");
  if (!form || !input || !button || !status) return;

  const setState = (kind, message) => {
    status.dataset.kind = kind || "";
    status.textContent = message || "";
    input.setAttribute("aria-invalid", kind === "error" ? "true" : "false");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = input.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error", "Podaj poprawny adres e-mail.");
      input.focus();
      return;
    }

    if (!supabaseConfigured) {
      setState("error", "Backend nie jest jeszcze podłączony (web/config.js).");
      return;
    }

    button.setAttribute("aria-busy", "true");
    button.disabled = true;
    setState("", "Zapisuję…");

    try {
      await joinWaitlist(email);
      form.reset();
      setState("ok", "Jesteś na liście. Odezwiemy się przy starcie.");
    } catch (err) {
      if (err.code === "23505") {
        setState("ok", "Ten adres już jest na liście.");
      } else if (err.code === "42501" || /row-level security|permission/i.test(err.message)) {
        setState("error", "Backend odrzucił zapis (RLS). Sprawdź migracje w sql/.");
      } else {
        setState("error", `Nie udało się zapisać: ${err.message}`);
      }
    } finally {
      button.setAttribute("aria-busy", "false");
      button.disabled = false;
    }
  });
}

async function initBackendStatus() {
  const el = document.getElementById("sb-state");
  if (!el) return;
  if (!supabaseConfigured) {
    el.dataset.state = "error";
    el.textContent = "supabase: brak konfiguracji";
    return;
  }
  try {
    const res = await ping();
    el.dataset.state = res.ok ? "ok" : "error";
    el.textContent = res.ok ? "supabase: online" : "supabase: błąd";
  } catch {
    el.dataset.state = "error";
    el.textContent = "supabase: offline";
  }
}

initTheme();
initCounters();
initWaitlist();
initBackendStatus();
