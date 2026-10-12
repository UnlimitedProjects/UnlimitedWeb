import { supabaseConfigured, supabase } from "./supabase.js";

const KEY = (slug) => `uw:reviews:${slug}`;

export function localReviews(slug) {
  try {
    return JSON.parse(localStorage.getItem(KEY(slug))) || [];
  } catch {
    return [];
  }
}

function saveLocal(slug, list) {
  localStorage.setItem(KEY(slug), JSON.stringify(list));
}

export async function getReviews(slug) {
  let remote = [];
  if (supabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,comment,author,created_at")
        .eq("project_slug", slug)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) remote = data;
    } catch {
      /* offline */
    }
  }
  const local = localReviews(slug);
  return [...local, ...remote].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function addReview({ slug, rating, comment, author }) {
  const row = {
    project_slug: slug,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    comment: comment || null,
    author: author || null,
  };
  if (supabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("reviews").insert(row).select().single();
      if (!error && data) return data;
    } catch {
      /* fall through to local */
    }
  }
  const local = { ...row, id: `local-${Date.now()}`, created_at: new Date().toISOString() };
  saveLocal(slug, [local, ...localReviews(slug)]);
  return local;
}

export function averageRating(list) {
  if (!list.length) return 0;
  return list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length;
}

export function ratingBuckets(list) {
  const b = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of list) {
    const k = Math.round(Number(r.rating) || 0);
    if (b[k] !== undefined) b[k]++;
  }
  return b;
}
