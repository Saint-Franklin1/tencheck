import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a human-friendly error from any auth failure, especially
 * the generic "Failed to fetch" that occurs when the deployed build
 * cannot reach the Supabase auth endpoint (missing env vars, blocked
 * network, wrong URL, etc).
 */
export const explainAuthError = async (err: unknown): Promise<string> => {
  const msg = (err as any)?.message || String(err || "");
  if (!/fetch|network|load failed|cors/i.test(msg)) return msg;

  // Attempt a direct ping to the auth settings endpoint to differentiate
  // configuration vs network issues.
  try {
    const url = (supabase as any).supabaseUrl || "";
    if (!url) return "Backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your hosting environment.";
    const r = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: (supabase as any).supabaseKey || "" },
    });
    if (!r.ok) {
      return `Cannot reach backend (HTTP ${r.status}). Check VITE_SUPABASE_URL and the publishable key in your deployment.`;
    }
    return "Login request was blocked by your browser or network. Try again, disable extensions, or test on the published URL.";
  } catch {
    return "Cannot reach the authentication server. Verify your deployment has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY set, and that your network allows requests to *.supabase.co.";
  }
};
