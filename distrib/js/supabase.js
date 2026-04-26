// /js/supabase.js

const SUPABASE_URL = "https://nxrezfbzhhuxtnwhbjzz.supabase.co";
const SUPABASE_KEY = "sb_publishable_pv2SCbULI-7GStKIuRmWFg_zbaC69KE";

// Initialisation UNIQUE (globale)
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}
