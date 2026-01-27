// /js/supabase.js

const SUPABASE_URL = "https://pqozgsgytzntrqscevrt.supabase.co";
const SUPABASE_KEY = "PUBLIC_ANON_KEY";

// Initialisation UNIQUE (globale)
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}
