/*
====================================================
GAME PLATFORM
SUPABASE CONFIG

File:
supabase/config.js

Creates:
window.supabaseClient

====================================================
*/


(function(){

"use strict";


const SUPABASE_URL =
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY =
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



if(!window.supabase){

    console.error(
        "Supabase SDK не загружен"
    );

    return;

}



window.supabaseClient =
window.supabase.createClient(

    SUPABASE_URL,

    SUPABASE_KEY

);



console.log(
    "[GamePlatform] Supabase ready"
);



})();
