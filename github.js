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

export function avatarUrl(owner, size = 160) {
  return owner ? `https://github.com/${owner}.png?size=${size}` : null;
}

export function mapRepo(r) {
  const owner = r.owner && r.owner.login ? r.owner.login : "";
  return {
    id: r.full_name,
    slug: r.full_name,
    name: r.name,
    owner,
    avatar: avatarUrl(owner),
    tagline: r.description || "Brak opisu.",
    description: r.description || "",
    url: r.html_url,
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    issues: r.open_issues_count || 0,
    language: r.language || null,
    accent: accentFor(r.language),
    homepage: r.homepage || null,
    topics: r.topics || [],
    source: "github",
  };
}

export function mapCurated(c) {
  return {
    id: `${c.owner}/${c.name}`,
    slug: `${c.owner}/${c.name}`,
    name: c.name,
    owner: c.owner,
    avatar: avatarUrl(c.owner),
    tagline: c.description,
    description: c.description,
    url: c.url,
    stars: c.stars,
    forks: 0,
    issues: 0,
    language: c.language || null,
    accent: accentFor(c.language),
    homepage: null,
    topics: [],
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

export async function getRepo(fullName) {
  if (!fullName) return null;
  const key = `uw:gh:repo:${fullName}`;
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const res = await fetch(`${API}/repos/${fullName}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const mapped = mapRepo(await res.json());
      writeCache(key, mapped);
      return mapped;
    }
  } catch {
    /* offline */
  }
  const cur = CURATED.find((c) => `${c.owner}/${c.name}` === fullName);
  return cur ? mapCurated(cur) : null;
}
