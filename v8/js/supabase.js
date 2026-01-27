// supabase.js
const SUPABASE_URL = "https://pqozgsgytzntrqscevrt.supabase.co";
const SUPABASE_KEY = "PUBLIC_ANON_KEY";

if (!window._supabaseClient) {
  window._supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

export const supabase = window._supabaseClient;
