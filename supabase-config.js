/*
=========================================================
GAMEHUB — SUPABASE CONFIG
=========================================================

Здесь находятся только публичные данные подключения
к Supabase.

ВАЖНО:

1. URL проекта можно использовать во frontend.

2. anon/public key можно использовать во frontend.

3. НИКОГДА не вставляйте сюда:

   service_role key

4. Service role key должен использоваться только
   на сервере и никогда не публиковаться в GitHub Pages.

=========================================================
*/


window.GAMEHUB_CONFIG = {

    /*
    -----------------------------------------------------
    URL ПРОЕКТА SUPABASE
    -----------------------------------------------------

    Пример:

    https://abcdefghijkl.supabase.co

    -----------------------------------------------------
    */

    SUPABASE_URL:
        "https://YOUR_PROJECT_ID.supabase.co",


    /*
    -----------------------------------------------------
    ANON / PUBLIC KEY
    -----------------------------------------------------

    Найдёте в:

    Supabase
    →
    Project Settings
    →
    API
    →
    Publishable / anon key

    В зависимости от интерфейса Supabase название
    ключа может отличаться.

    -----------------------------------------------------
    */

    SUPABASE_ANON_KEY:
        "YOUR_SUPABASE_ANON_KEY",


    /*
    -----------------------------------------------------
    НАСТРОЙКИ ПРИЛОЖЕНИЯ
    -----------------------------------------------------
    */

    APP_NAME:
        "GameHub",


    /*
    -----------------------------------------------------
    ХРАНИЛИЩЕ ИЗОБРАЖЕНИЙ
    -----------------------------------------------------

    В дальнейшем здесь будет использоваться bucket:

        game-assets

    В нём будут находиться:

        games/
        guilds/
        ships/
        materials/
        builds/
        gallery/
        etc.

    -----------------------------------------------------
    */

    STORAGE_BUCKET:
        "game-assets"

};


/*
=========================================================
ПРОВЕРКА КОНФИГУРАЦИИ
=========================================================
*/

window.GAMEHUB_CONFIG_READY = (
    typeof window.GAMEHUB_CONFIG.SUPABASE_URL === "string" &&
    window.GAMEHUB_CONFIG.SUPABASE_URL.length > 0 &&
    !window.GAMEHUB_CONFIG.SUPABASE_URL.includes("YOUR_PROJECT_ID") &&

    typeof window.GAMEHUB_CONFIG.SUPABASE_ANON_KEY === "string" &&
    window.GAMEHUB_CONFIG.SUPABASE_ANON_KEY.length > 0 &&
    !window.GAMEHUB_CONFIG.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")
);