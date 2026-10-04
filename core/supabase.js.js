// ============================================================
// GAMEHUB - SUPABASE
// ============================================================


const SUPABASE_URL =
    "https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY =
    "sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



if (!window.supabase) {

    console.error(
        "[GameHub] Supabase JS library не загружена."
    );

}
else {


    const gameHubSupabase =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );


    window.GameHub =
        window.GameHub || {};


    window.GameHub.supabase =
        gameHubSupabase;


    console.log(
        "[GameHub] Supabase connected"
    );

}