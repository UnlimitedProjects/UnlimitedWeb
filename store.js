const KEY = "uw:projects:local";

export function localProjects() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function saveLocalProject(p) {
  const list = localProjects();
  const item = { ...p, id: `local-${Date.now()}`, source: "local", created_at: new Date().toISOString() };
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list));
  return item;
}

export function removeLocalProject(id) {
  const list = localProjects().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function toProject(row) {
  return {
    id: row.slug || row.id,
    slug: row.slug || row.id,
    name: row.name,
    owner: row.owner_name || "Dodane",
    tagline: row.tagline || row.description || "Brak opisu.",
    description: row.description || "",
    url: row.url || "#",
    stars: Number(row.installs) || 0,
    rating: Number(row.rating) || 0,
    language: null,
    accent: row.accent || "#7c5cff",
    category: row.category || "app",
    source: row.source || "db",
  };
}
