import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("your-project")
);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true } })
  : null;

export async function getProjects(timeoutMs = 6000) {
  if (!supabase) return [];
  const query = supabase
    .from("projects")
    .select("slug,name,category,tagline,description,url,rating,installs,featured,accent")
    .order("installs", { ascending: false });
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), timeoutMs)
  );
  const { data, error } = await Promise.race([query, timeout]);
  if (error) throw new Error(error.message);
  return data ?? [];
}
