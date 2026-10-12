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

export async function aiRunStream({ message, agent, model }, onEvent) {
  if (!base) throw new Error("Most AI nieskonfigurowany (config.js).");
  const res = await fetch(base + "/ai/run", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ message, agent, model }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        try {
          onEvent(JSON.parse(json));
        } catch {
          /* ignore */
        }
      }
    }
  }
}
