/*
=================================================
SUPABASE CONFIG
GAME GUILD PLATFORM
=================================================
*/

window.SUPABASE_URL =
  "https://istzefagggvkrhwfjbox.supabase.co";

window.SUPABASE_ANON_KEY =
  "sb_publishable_4s5x20f-Odw5CYCLiBbWIg_5tsF2qQL";

// Единственный клиент на всё приложение.
// app.js будет использовать window.supabaseClient,
// а не создавать второй клиент.
window.supabaseClient = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// Email-адреса владельцев платформы (опционально)
window.PLATFORM_OWNER_EMAILS = [
  // "you@example.com",
];
