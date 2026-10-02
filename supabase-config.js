/*
=================================================
SUPABASE CONFIG
Game Guild Platform v2.0.0
=================================================
*/


window.SUPABASE_URL =
"https://istzefagggvkrhwfjbox.supabase.co";


window.SUPABASE_ANON_KEY =
"sb_publishable_4s5x20f-Odw5CYCLiBbWIg_5tsF2qQL";





// Создание клиента Supabase


window.supabaseClient =
supabase.createClient(

    window.SUPABASE_URL,

    window.SUPABASE_ANON_KEY

);





console.log(
"Supabase подключён"
);
