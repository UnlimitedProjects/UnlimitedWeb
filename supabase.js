import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("your-project")
);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export async function ping() {
  if (!supabase) return { ok: false, reason: "not-configured" };
  const { error } = await supabase.from("waitlist").select("id", { count: "exact", head: true });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function joinWaitlist(email, source = "landing") {
  if (!supabase) throw new Error("Supabase nie skonfigurowany (web/config.js).");
  const { data, error } = await supabase
    .from("waitlist")
    .insert({ email: email.trim().toLowerCase(), source })
    .select()
    .single();
  if (error) {
    const e = new Error(error.message);
    e.code = error.code;
    throw e;
  }
  return data;
}
