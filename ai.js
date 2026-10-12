import { AI_BASE_URL, AI_TOKEN } from "./config.js";

const base = (AI_BASE_URL || "").replace(/\/$/, "");

export const aiConfigured = Boolean(base);

function headers() {
  const h = { "Content-Type": "application/json" };
  if (AI_TOKEN) h.Authorization = `Bearer ${AI_TOKEN}`;
  return h;
}

async function call(path, { method = "GET", body, timeoutMs = 120000 } = {}) {
  if (!base) throw new Error("Most AI nieskonfigurowany (config.js).");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(base + path, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(t);
  }
}

export const aiHealth = () => call("/health", { timeoutMs: 5000 });
export const aiAgents = () => call("/agents", { timeoutMs: 8000 });
export const aiDraft = (idea, category) => call("/ai/draft", { method: "POST", body: { idea, category }, timeoutMs: 180000 });
export const aiResearch = (queries, concurrency = 6) =>
  call("/ai/research", { method: "POST", body: { queries, concurrency }, timeoutMs: 120000 });
export const aiChat = (message, agent) => call("/ai/chat", { method: "POST", body: { message, agent }, timeoutMs: 240000 });
