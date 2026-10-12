import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("your-project")
);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

const SELECT =
  "slug,name,category,tagline,description,url,rating,installs,featured,accent,created_at";

export async function getProjects(timeoutMs = 6000) {
  if (!supabase) return [];
  const query = supabase.from("projects").select(SELECT).order("created_at", { ascending: false });
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs));
  const { data, error } = await Promise.race([query, timeout]);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data ? data.user : null;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase nie skonfigurowany.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function addProject(project) {
  if (!supabase) throw new Error("Supabase nie skonfigurowany.");
  const user = await currentUser();
  const row = {
    name: project.name,
    slug:
      project.slug ||
      String(project.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    category: project.category || "app",
    tagline: project.tagline || null,
    description: project.description || null,
    url: project.url || null,
    rating: project.rating ?? 0,
    installs: project.installs ?? 0,
    featured: Boolean(project.featured),
    accent: project.accent || "#7c5cff",
    owner: user ? user.id : null,
  };
  const { data, error } = await supabase.from("projects").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}
