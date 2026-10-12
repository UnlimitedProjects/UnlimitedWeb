import { CURATED, accentFor, MIN_STARS_FEATURED } from "./data.js";

const API = "https://api.github.com";
const DAY = 86400000;

const dayIndex = () => Math.floor(Date.now() / DAY);

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > 3 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota */
  }
}

export function mapRepo(r) {
  return {
    id: r.full_name,
    slug: r.full_name,
    name: r.name,
    owner: r.owner && r.owner.login ? r.owner.login : "",
    tagline: r.description || "Brak opisu.",
    description: r.description || "",
    url: r.html_url,
    stars: r.stargazers_count || 0,
    language: r.language || null,
    accent: accentFor(r.language),
    source: "github",
  };
}

export function mapCurated(c) {
  return {
    id: `${c.owner}/${c.name}`,
    slug: `${c.owner}/${c.name}`,
    name: c.name,
    owner: c.owner,
    tagline: c.description,
    description: c.description,
    url: c.url,
    stars: c.stars,
    language: c.language || null,
    accent: accentFor(c.language),
    source: "github",
  };
}

async function search(q, perPage) {
  const res = await fetch(`${API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  return (data.items || []).map(mapRepo);
}

export async function fetchTopRepos({ minStars = 10000, perPage = 80 } = {}) {
  const key = `uw:gh:top:${minStars}:${perPage}`;
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const items = await search(`stars:>=${minStars}`, perPage);
    if (items.length) {
      writeCache(key, items);
      return items;
    }
    throw new Error("empty");
  } catch {
    return CURATED.map(mapCurated);
  }
}

export async function projectOfTheDay() {
  const key = `uw:gh:pod:${dayIndex()}`;
  const cached = readCache(key);
  if (cached) return cached;
  let pool = [];
  try {
    pool = await search(`stars:>=${MIN_STARS_FEATURED}`, 100);
  } catch {
    /* offline */
  }
  if (!pool.length) pool = CURATED.filter((c) => c.stars >= MIN_STARS_FEATURED).map(mapCurated);
  const pick = pool[dayIndex() % pool.length];
  writeCache(key, pick);
  return pick;
}
