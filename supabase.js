import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("your-project")
);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true } })
  : null;

export async function getProjects() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("slug,name,category,tagline,description,url,rating,installs,featured,accent")
    .order("installs", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
