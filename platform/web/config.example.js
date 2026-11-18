// Copy to config.js (CI generates it from repository secrets). The anon/publishable key is safe in the browser
// because row level security protects the data. Never put a service_role key here.
window.TULIKA_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-PUBLISHABLE-ANON-KEY",
};
