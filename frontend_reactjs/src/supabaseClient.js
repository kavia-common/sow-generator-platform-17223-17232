import { createClient } from "@supabase/supabase-js";

/**
 * Supabase initialization from environment variables.
 * IMPORTANT: Ask user to set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in .env
 */
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Soft-guard to help local development notice missing configuration
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env variables are missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in your .env."
  );
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_KEY || "");

// PUBLIC_INTERFACE
export async function supabaseEmailSignup(email) {
  /** Sign up a user via magic link; requires REACT_APP_SITE_URL in env for redirect */
  const emailRedirectTo = process.env.REACT_APP_SITE_URL || window.location.origin;
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo }
  });
}
