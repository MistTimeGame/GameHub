/* =========================================================
   GAME HUB — APP.JS
   Supabase frontend
   ========================================================= */

(() => {
    "use strict";

    /* =========================================================
       1. SUPABASE CONFIG
       ========================================================= */

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

    let supabaseClient = null;
    let currentUser = null;
    let currentProfile = null;

    /* =========================================================
       2. BASIC HELPERS
       ========================================================= */

    function $(selector) {
        return document.querySelector(selector);
    }

    function $all(selector) {
        return document.querySelectorAll(selector);
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showMessage(message, type = "info") {
        console.log(`[${type}] ${message}`);

        let box = document.querySelector("#app-message");

        if (!box) {
            box = document.createElement("div");
            box.id = "app-message";

            box.style.position = "fixed";
            box.style.right = "20px";
            box.style.bottom = "20px";
            box.style.zIndex = "99999";
            box.style.padding = "14px 18px";
            box.style.borderRadius = "12px";
            box.style.fontSize = "14px";
            box.style.maxWidth = "420px";
            box.style.boxShadow = "0 10px 30px rgba(0,0,0,.15)";

            document.body.appendChild(box);
        }

        box.textContent = message;

        if (type === "error") {
            box.style.background = "#ffe5e5";
            box.style.color = "#a00000";
        } else if (type === "success") {
            box.style.background = "#e4f8e9";
            box.style.color = "#146b2c";
        } else {
            box.style.background = "#e8f0ff";
            box.style.color = "#174ea6";
        }

        clearTimeout(box._timer);

        box._timer = setTimeout(() => {
            box.remove();
        }, 4000);
    }

    /* =========================================================
       3. SUPABASE INITIALIZATION
       ========================================================= */

    function initSupabase() {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("Supabase configuration not found.");

            showSetupScreen();

            return false;
        }

        if (!window.supabase) {
            console.error("Supabase JS library not loaded.");

            showMessage(
                "Не удалось загрузить библиотеку Supabase.",
                "error"
            );

            return false;
        }

        try {
            supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );

            console.log("Supabase initialized.");

            return true;
        } catch (error) {
            console.error("Supabase initialization error:", error);

            showMessage(
                "Ошибка инициализации Supabase.",
                "error"
            );

            return false;
        }
    }

    /* =========================================================
       4. SETUP SCREEN
       ========================================================= */

    function showSetupScreen() {
        const existing = document.querySelector("#supabase-setup-message");

        if (existing) {
            return;
        }

        const container = document.createElement("div");

        container.id = "supabase-setup-message";

        container.innerHTML = `
            <div style="
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:30px;
                background:#f5f7fa;
                font-family:Arial,sans-serif;
                box-sizing:border-box;
            ">
                <div style="
                    width:100%;
                    max-width:600px;
                    background:#ffffff;
                    border-radius:20px;
                    padding:35px;
                    box-shadow:0 15px 50px rgba(0,0,0,.10);
                ">
                    <h1 style="
                        margin:0 0 15px;
                        font-size:28px;
                    ">
                        Настройка Supabase
                    </h1>

                    <p style="
                        margin:0 0 20px;
                        color:#555;
                        line-height:1.6;
                    ">
                        Supabase ещё не подключён.
                    </p>

                    <p style="
                        margin:0 0 20px;
                        color:#555;
                        line-height:1.6;
                    ">
                        Откройте файл
                        <strong>supabase-config.js</strong>
                        и вставьте URL проекта и публичный ключ Supabase.
                    </p>

                    <div style="
                        background:#f4f6f8;
                        border-radius:12px;
                        padding:15px;
                        font-family:monospace;
                        font-size:13px;
                        line-height:1.7;
                        overflow:auto;
                    ">
                        window.SUPABASE_URL = "https://...";
                        <br>
                        window.SUPABASE_ANON_KEY = "sb_publishable_...";
                    </div>

                    <p style="
                        margin:20px 0 0;
                        color:#777;
                        font-size:14px;
                    ">
                        После изменения файла обновите страницу.
                    </p>
                </div>
            </div>
        `;

        document.body.innerHTML = "";

        document.body.appendChild(container);
    }

    /* =========================================================
       5. AUTH
       ========================================================= */

    async function loadCurrentUser() {
        if (!supabaseClient) {
            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient.auth.getUser();

            if (error) {
                console.error("getUser error:", error);
                return null;
            }

            currentUser = data?.user || null;

            return currentUser;
        } catch (error) {
            console.error("loadCurrentUser error:", error);

            return null;
        }
    }

    async function loadCurrentProfile() {
        if (!supabaseClient || !currentUser) {
            currentProfile = null;
            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", currentUser.id)
                .maybeSingle();

            if (error) {
                console.error("Profile loading error:", error);

                currentProfile = null;

                return null;
            }

            currentProfile = data || null;

            return currentProfile;
        } catch (error) {
            console.error("loadCurrentProfile error:", error);

            currentProfile = null;

            return null;
        }
    }

    async function registerUser(email, password, displayName = "") {
        if (!supabaseClient) {
            showMessage(
                "Supabase ещё не подключён.",
                "error"
            );

            return null;
        }

        if (!email || !password) {
            showMessage(
                "Введите email и пароль.",
                "error"
            );

            return null;
        }

        if (password.length < 6) {
            showMessage(
                "Пароль должен содержать минимум 6 символов.",
                "error"
            );

            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        display_name: displayName.trim()
                    }
                }
            });

            if (error) {
                console.error("Registration error:", error);

                showMessage(
                    error.message || "Ошибка регистрации.",
                    "error"
                );

                return null;
            }

            if (data.user) {
                showMessage(
                    "Регистрация выполнена.",
                    "success"
                );
            }

            return data;
        } catch (error) {
            console.error("registerUser error:", error);

            showMessage(
                "Не удалось выполнить регистрацию.",
                "error"
            );

            return null;
        }
    }

    async function loginUser(email, password) {
        if (!supabaseClient) {
            showMessage(
                "Supabase ещё не подключён.",
                "error"
            );

            return null;
        }

        if (!email || !password) {
            showMessage(
                "Введите email и пароль.",
                "error"
            );

            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                console.error("Login error:", error);

                showMessage(
                    error.message || "Ошибка входа.",
                    "error"
                );

                return null;
            }

            currentUser = data.user;

            await loadCurrentProfile();

            showMessage(
                "Вы успешно вошли.",
                "success"
            );

            await updateInterface();

            return data;
        } catch (error) {
            console.error("loginUser error:", error);

            showMessage(
                "Не удалось выполнить вход.",
                "error"
            );

            return null;
        }
    }

    async function logoutUser() {
        if (!supabaseClient) {
            return;
        }

        try {
            const {
                error
            } = await supabaseClient.auth.signOut();

            if (error) {
                console.error("Logout error:", error);

                showMessage(
                    "Ошибка выхода.",
                    "error"
                );

                return;
            }

            currentUser = null;
            currentProfile = null;

            showMessage(
                "Вы вышли из аккаунта.",
                "success"
            );

            await updateInterface();
        } catch (error) {
            console.error("logoutUser error:", error);
        }
    }

    async function changePassword(newPassword) {
        if (!supabaseClient) {
            return false;
        }

        if (!currentUser) {
            showMessage(
                "Сначала войдите в аккаунт.",
                "error"
            );

            return false;
        }

        if (!newPassword || newPassword.length < 6) {
            showMessage(
                "Новый пароль должен содержать минимум 6 символов.",
                "error"
            );

            return false;
        }

        try {
            const {
                error
            } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                console.error("Password change error:", error);

                showMessage(
                    error.message || "Не удалось изменить пароль.",
                    "error"
                );

                return false;
            }

            showMessage(
                "Пароль успешно изменён.",
                "success"
            );

            return true;
        } catch (error) {
            console.error("changePassword error:", error);

            showMessage(
                "Ошибка изменения пароля.",
                "error"
            );

            return false;
        }
    }

    async function resetPassword(email) {
        if (!supabaseClient) {
            return false;
        }

        if (!email) {
            showMessage(
                "Введите email.",
                "error"
            );

            return false;
        }

        try {
            const {
                error
            } = await supabaseClient.auth.resetPasswordForEmail(
                email.trim(),
                {
                    redirectTo: window.location.origin
                }
            );

            if (error) {
                console.error("Reset password error:", error);

                showMessage(
                    error.message || "Ошибка восстановления пароля.",
                    "error"
                );

                return false;
            }

            showMessage(
                "Инструкция для восстановления пароля отправлена на email.",
                "success"
            );

            return true;
        } catch (error) {
            console.error("resetPassword error:", error);

            showMessage(
                "Не удалось отправить письмо.",
                "error"
            );

            return false;
        }
    }

    /* =========================================================
       6. SUPABASE AUTH STATE
       ========================================================= */

    function setupAuthListener() {
        if (!supabaseClient) {
            return;
        }

        supabaseClient.auth.onAuthStateChange(
            async (event, session) => {
                console.log(
                    "Auth event:",
                    event
                );

                currentUser = session?.user || null;

                if (currentUser) {
                    await loadCurrentProfile();
                } else {
                    currentProfile = null;
                }

                await updateInterface();
            }
        );
    }

    /* =========================================================
       7. GAMES
       ========================================================= */

    async function loadGames() {
        if (!supabaseClient) {
            return [];
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("games")
                .select("*")
                .eq("status", "published")
                .order("name", {
                    ascending: true
                });

            if (error) {
                console.error("Games loading error:", error);

                return [];
            }

            return data || [];
        } catch (error) {
            console.error("loadGames error:", error);

            return [];
        }
    }

    async function loadAllGamesForOwner() {
        if (!supabaseClient || !currentUser) {
            return [];
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("games")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                console.error(
                    "Owner games loading error:",
                    error
                );

                return [];
            }

            return data || [];
        } catch (error) {
            console.error(
                "loadAllGamesForOwner error:",
                error
            );

            return [];
        }
    }

    async function getGameById(gameId) {
        if (!supabaseClient || !gameId) {
            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("games")
                .select("*")
                .eq("id", gameId)
                .maybeSingle();

            if (error) {
                console.error(
                    "Game loading error:",
                    error
                );

                return null;
            }

            return data || null;
        } catch (error) {
            console.error(
                "getGameById error:",
                error
            );

            return null;
        }
    }

    async function createGame(gameData) {
        if (!supabaseClient || !currentUser) {
            showMessage(
                "Для создания игры необходимо войти в аккаунт.",
                "error"
            );

            return null;
        }

        if (!gameData?.name) {
            showMessage(
                "Введите название игры.",
                "error"
            );

            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("games")
                .insert({
                    name: gameData.name.trim(),
                    slug: gameData.slug
                        ? gameData.slug.trim()
                        : createSlug(gameData.name),
                    description: gameData.description || "",
                    logo_url: gameData.logo_url || null,
                    banner_url: gameData.banner_url || null,
                    status: gameData.status || "draft",
                    created_by: currentUser.id
                })
                .select()
                .single();

            if (error) {
                console.error(
                    "Create game error:",
                    error
                );

                showMessage(
                    error.message || "Не удалось создать игру.",
                    "error"
                );

                return null;
            }

            showMessage(
                "Игра создана.",
                "success"
            );

            return data;
        } catch (error) {
            console.error(
                "createGame error:",
                error
            );

            showMessage(
                "Ошибка создания игры.",
                "error"
            );

            return null;
        }
    }

    function createSlug(name) {
        return String(name || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-zа-яё0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "");
    }

    /* =========================================================
       8. GUILDS
       ========================================================= */

    async function loadGameGuilds(gameId) {
        if (!supabaseClient || !gameId) {
            return [];
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("guilds")
                .select("*")
                .eq("game_id", gameId)
                .eq("is_active", true)
                .order("name", {
                    ascending: true
                });

            if (error) {
                console.error(
                    "Guilds loading error:",
                    error
                );

                return [];
            }

            return data || [];
        } catch (error) {
            console.error(
                "loadGameGuilds error:",
                error
            );

            return [];
        }
    }

    async function createGuild(gameId, name, description = "") {
        if (!supabaseClient || !currentUser) {
            showMessage(
                "Для создания гильдии необходимо войти.",
                "error"
            );

            return null;
        }

        if (!gameId) {
            showMessage(
                "Не выбрана игра.",
                "error"
            );

            return null;
        }

        if (!name || !name.trim()) {
            showMessage(
                "Введите название гильдии.",
                "error"
            );

            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient.rpc(
                "create_guild",
                {
                    p_game_id: gameId,
                    p_name: name.trim(),
                    p_description: description || ""
                }
            );

            if (error) {
                console.error(
                    "Create guild error:",
                    error
                );

                showMessage(
                    error.message || "Не удалось создать гильдию.",
                    "error"
                );

                return null;
            }

            showMessage(
                "Гильдия создана.",
                "success"
            );

            return data;
        } catch (error) {
            console.error(
                "createGuild error:",
                error
            );

            showMessage(
                "Ошибка создания гильдии.",
                "error"
            );

            return null;
        }
    }

    async function loadMyGuilds(gameId) {
        if (!supabaseClient || !currentUser || !gameId) {
            return [];
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("guild_members")
                .select(`
                    *,
                    guilds (
                        id,
                        name,
                        slug,
                        description,
                        logo_url,
                        game_id
                    )
                `)
                .eq("user_id", currentUser.id)
                .eq("game_id", gameId)
                .is("left_at", null);

            if (error) {
                console.error(
                    "My guilds loading error:",
                    error
                );

                return [];
            }

            return data || [];
        } catch (error) {
            console.error(
                "loadMyGuilds error:",
                error
            );

            return [];
        }
    }

    async function leaveGuild(guildId) {
        if (!supabaseClient || !currentUser) {
            return false;
        }

        try {
            const {
                error
            } = await supabaseClient.rpc(
                "leave_guild",
                {
                    p_guild_id: guildId
                }
            );

            if (error) {
                console.error(
                    "Leave guild error:",
                    error
                );

                showMessage(
                    error.message || "Не удалось покинуть гильдию.",
                    "error"
                );

                return false;
            }

            showMessage(
                "Вы покинули гильдию.",
                "success"
            );

            return true;
        } catch (error) {
            console.error(
                "leaveGuild error:",
                error
            );

            showMessage(
                "Ошибка выхода из гильдии.",
                "error"
            );

            return false;
        }
    }

    /* =========================================================
       9. GUILD APPLICATIONS
       ========================================================= */

    async function applyToGuild(guildId, nickname, message = "") {
        if (!supabaseClient || !currentUser) {
            showMessage(
                "Для подачи заявки необходимо войти.",
                "error"
            );

            return null;
        }

        if (!guildId) {
            return null;
        }

        if (!nickname || !nickname.trim()) {
            showMessage(
                "Укажите игровой ник.",
                "error"
            );

            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("guild_applications")
                .insert({
                    guild_id: guildId,
                    game_id: await getGuildGameId(guildId),
                    user_id: currentUser.id,
                    nickname: nickname.trim(),
                    message: message || "",
                    status: "pending"
                })
                .select()
                .single();

            if (error) {
                console.error(
                    "Application error:",
                    error
                );

                showMessage(
                    error.message || "Не удалось отправить заявку.",
                    "error"
                );

                return null;
            }

            showMessage(
                "Заявка отправлена.",
                "success"
            );

            return data;
        } catch (error) {
            console.error(
                "applyToGuild error:",
                error
            );

            showMessage(
                "Ошибка отправки заявки.",
                "error"
            );

            return null;
        }
    }

    async function getGuildGameId(guildId) {
        if (!supabaseClient || !guildId) {
            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("guilds")
                .select("game_id")
                .eq("id", guildId)
                .maybeSingle();

            if (error) {
                console.error(
                    "Guild game loading error:",
                    error
                );

                return null;
            }

            return data?.game_id || null;
        } catch (error) {
            console.error(
                "getGuildGameId error:",
                error
            );

            return null;
        }
    }

    /* =========================================================
       10. PROFILE
       ========================================================= */

    async function updateProfile(profileData) {
        if (!supabaseClient || !currentUser) {
            return null;
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("profiles")
                .update({
                    display_name:
                        profileData.display_name !== undefined
                            ? profileData.display_name
                            : undefined,

                    avatar_url:
                        profileData.avatar_url !== undefined
                            ? profileData.avatar_url
                            : undefined
                })
                .eq("id", currentUser.id)
                .select()
                .single();

            if (error) {
                console.error(
                    "Profile update error:",
                    error
                );

                showMessage(
                    error.message || "Не удалось сохранить профиль.",
                    "error"
                );

                return null;
            }

            currentProfile = data;

            showMessage(
                "Профиль сохранён.",
                "success"
            );

            await updateInterface();

            return data;
        } catch (error) {
            console.error(
                "updateProfile error:",
                error
            );

            showMessage(
                "Ошибка сохранения профиля.",
                "error"
            );

            return null;
        }
    }

    /* =========================================================
       11. ADMIN
       ========================================================= */

    function isOwner() {
        return (
            currentProfile &&
            currentProfile.role === "owner"
        );
    }

    async function checkOwner() {
        if (!currentUser) {
            return false;
        }

        if (currentProfile?.role === "owner") {
            return true;
        }

        return false;
    }

    /* =========================================================
       12. PUBLIC UI
       ========================================================= */

    async function renderGames(container) {
        if (!container) {
            return;
        }

        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
                color:#777;
            ">
                Загрузка игр...
            </div>
        `;

        const games = await loadGames();

        if (!games.length) {
            container.innerHTML = `
                <div style="
                    padding:40px 20px;
                    text-align:center;
                    color:#777;
                ">
                    <div style="
                        font-size:42px;
                        margin-bottom:10px;
                    ">
                        🎮
                    </div>

                    <h3 style="
                        margin:0 0 8px;
                        color:#333;
                    ">
                        Игр пока нет
                    </h3>

                    <p style="margin:0;">
                        После добавления игры она появится здесь.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML = games.map(game => `
            <article
                class="game-card"
                data-game-id="${escapeHtml(game.id)}"
                style="
                    background:#fff;
                    border:1px solid #e5e7eb;
                    border-radius:18px;
                    padding:20px;
                    cursor:pointer;
                    transition:.2s;
                "
            >
                <div style="
                    display:flex;
                    align-items:center;
                    gap:15px;
                ">
                    ${
                        game.logo_url
                            ? `
                                <img
                                    src="${escapeHtml(game.logo_url)}"
                                    alt=""
                                    style="
                                        width:70px;
                                        height:70px;
                                        border-radius:16px;
                                        object-fit:cover;
                                    "
                                >
                            `
                            : `
                                <div style="
                                    width:70px;
                                    height:70px;
                                    border-radius:16px;
                                    background:#eef2f7;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    font-size:30px;
                                ">
                                    🎮
                                </div>
                            `
                    }

                    <div>
                        <h3 style="
                            margin:0 0 6px;
                            font-size:20px;
                        ">
                            ${escapeHtml(game.name)}
                        </h3>

                        <p style="
                            margin:0;
                            color:#777;
                            font-size:14px;
                        ">
                            ${escapeHtml(
                                game.description || "Описание отсутствует"
                            )}
                        </p>
                    </div>
                </div>
            </article>
        `).join("");

        container
            .querySelectorAll(".game-card")
            .forEach(card => {
                card.addEventListener("click", () => {
                    const gameId =
                        card.dataset.gameId;

                    openGame(gameId);
                });
            });
    }

    function openGame(gameId) {
        if (!gameId) {
            return;
        }

        const url =
            `game.html?id=${encodeURIComponent(gameId)}`;

        window.location.href = url;
    }

    /* =========================================================
       13. AUTH FORMS
       ========================================================= */

    function setupAuthForms() {
        const loginForm =
            document.querySelector("#login-form");

        if (loginForm) {
            loginForm.addEventListener(
                "submit",
                async event => {
                    event.preventDefault();

                    const email =
                        loginForm.querySelector(
                            '[name="email"]'
                        )?.value || "";

                    const password =
                        loginForm.querySelector(
                            '[name="password"]'
                        )?.value || "";

                    await loginUser(
                        email,
                        password
                    );
                }
            );
        }

        const registerForm =
            document.querySelector("#register-form");

        if (registerForm) {
            registerForm.addEventListener(
                "submit",
                async event => {
                    event.preventDefault();

                    const email =
                        registerForm.querySelector(
                            '[name="email"]'
                        )?.value || "";

                    const password =
                        registerForm.querySelector(
                            '[name="password"]'
                        )?.value || "";

                    const displayName =
                        registerForm.querySelector(
                            '[name="display_name"]'
                        )?.value || "";

                    await registerUser(
                        email,
                        password,
                        displayName
                    );
                }
            );
        }

        $all("[data-action='login']")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    async () => {
                        const email =
                            document.querySelector(
                                "#login-email"
                            )?.value || "";

                        const password =
                            document.querySelector(
                                "#login-password"
                            )?.value || "";

                        await loginUser(
                            email,
                            password
                        );
                    }
                );
            });

        $all("[data-action='logout']")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    logoutUser
                );
            });
    }

    /* =========================================================
       14. INTERFACE UPDATE
       ========================================================= */

    async function updateInterface() {
        const loggedInElements =
            $all("[data-auth='logged-in']");

        const loggedOutElements =
            $all("[data-auth='logged-out']");

        loggedInElements.forEach(element => {
            element.style.display =
                currentUser
                    ? ""
                    : "none";
        });

        loggedOutElements.forEach(element => {
            element.style.display =
                currentUser
                    ? "none"
                    : "";
        });

        const userNameElements =
            $all("[data-user-name]");

        userNameElements.forEach(element => {
            element.textContent =
                currentProfile?.display_name ||
                currentUser?.email ||
                "Пользователь";
        });

        const ownerElements =
            $all("[data-owner-only]");

        ownerElements.forEach(element => {
            element.style.display =
                isOwner()
                    ? ""
                    : "none";
        });

        const gamesContainer =
            document.querySelector(
                "#games-list"
            );

        if (gamesContainer) {
            await renderGames(
                gamesContainer
            );
        }
    }

    /* =========================================================
       15. SEARCH
       ========================================================= */

    async function searchGames(query) {
        if (!supabaseClient) {
            return [];
        }

        const search =
            String(query || "").trim();

        if (!search) {
            return loadGames();
        }

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("games")
                .select("*")
                .eq("status", "published")
                .or(
                    `name.ilike.%${search}%,description.ilike.%${search}%`
                )
                .order("name", {
                    ascending: true
                });

            if (error) {
                console.error(
                    "Game search error:",
                    error
                );

                return [];
            }

            return data || [];
        } catch (error) {
            console.error(
                "searchGames error:",
                error
            );

            return [];
        }
    }

    function setupGameSearch() {
        const searchInput =
            document.querySelector(
                "#game-search"
            );

        const searchButton =
            document.querySelector(
                "#game-search-button"
            );

        const results =
            document.querySelector(
                "#games-list"
            );

        if (!searchInput || !results) {
            return;
        }

        const runSearch =
            async () => {
                results.innerHTML = `
                    <div style="
                        padding:30px;
                        text-align:center;
                        color:#777;
                    ">
                        Поиск...
                    </div>
                `;

                const games =
                    await searchGames(
                        searchInput.value
                    );

                if (!games.length) {
                    results.innerHTML = `
                        <div style="
                            padding:30px;
                            text-align:center;
                            color:#777;
                        ">
                            Ничего не найдено.
                        </div>
                    `;

                    return;
                }

                results.innerHTML =
                    games.map(game => `
                        <article
                            class="game-card"
                            data-game-id="${escapeHtml(game.id)}"
                            style="
                                background:#fff;
                                border:1px solid #e5e7eb;
                                border-radius:18px;
                                padding:20px;
                                cursor:pointer;
                            "
                        >
                            <h3 style="
                                margin:0 0 8px;
                            ">
                                ${escapeHtml(game.name)}
                            </h3>

                            <p style="
                                margin:0;
                                color:#777;
                            ">
                                ${escapeHtml(
                                    game.description || ""
                                )}
                            </p>
                        </article>
                    `).join("");

                results
                    .querySelectorAll(".game-card")
                    .forEach(card => {
                        card.addEventListener(
                            "click",
                            () => {
                                openGame(
                                    card.dataset.gameId
                                );
                            }
                        );
                    });
            };

        if (searchButton) {
            searchButton.addEventListener(
                "click",
                runSearch
            );
        }

        searchInput.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    runSearch();
                }
            }
        );
    }

    /* =========================================================
       16. CREATE GAME FORM
       ========================================================= */

    function setupCreateGameForm() {
        const form =
            document.querySelector(
                "#create-game-form"
            );

        if (!form) {
            return;
        }

        form.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                if (!currentUser) {
                    showMessage(
                        "Сначала войдите в аккаунт.",
                        "error"
                    );

                    return;
                }

                const name =
                    form.querySelector(
                        '[name="name"]'
                    )?.value || "";

                const slug =
                    form.querySelector(
                        '[name="slug"]'
                    )?.value || "";

                const description =
                    form.querySelector(
                        '[name="description"]'
                    )?.value || "";

                const logoUrl =
                    form.querySelector(
                        '[name="logo_url"]'
                    )?.value || "";

                const result =
                    await createGame({
                        name,
                        slug,
                        description,
                        logo_url: logoUrl,
                        status: "draft"
                    });

                if (result) {
                    form.reset();
                }
            }
        );
    }

    /* =========================================================
       17. CONNECTION TEST
       ========================================================= */

    async function testSupabaseConnection() {
        if (!supabaseClient) {
            return false;
        }

        try {
            const {
                error
            } = await supabaseClient
                .from("games")
                .select("id")
                .limit(1);

            if (error) {
                console.error(
                    "Supabase connection test failed:",
                    error
                );

                return false;
            }

            console.log(
                "Supabase connection successful."
            );

            return true;
        } catch (error) {
            console.error(
                "Supabase connection test error:",
                error
            );

            return false;
        }
    }

    /* =========================================================
       18. DEBUG INFORMATION
       ========================================================= */

    function exposeDebugAPI() {
        window.GameHub = {
            supabase: () =>
                supabaseClient,

            user: () =>
                currentUser,

            profile: () =>
                currentProfile,

            login: loginUser,

            register: registerUser,

            logout: logoutUser,

            changePassword: changePassword,

            resetPassword: resetPassword,

            loadGames: loadGames,

            searchGames: searchGames,

            createGame: createGame,

            loadGameGuilds: loadGameGuilds,

            createGuild: createGuild,

            applyToGuild: applyToGuild,

            leaveGuild: leaveGuild,

            updateProfile: updateProfile,

            isOwner: isOwner,

            testConnection:
                testSupabaseConnection
        };
    }

    /* =========================================================
       19. APPLICATION START
       ========================================================= */

    async function startApp() {
        console.log(
            "========================================"
        );

        console.log(
            "GAME HUB STARTING"
        );

        console.log(
            "========================================"
        );

        if (!initSupabase()) {
            return;
        }

        exposeDebugAPI();

        await loadCurrentUser();

        if (currentUser) {
            await loadCurrentProfile();
        }

        setupAuthListener();

        setupAuthForms();

        setupGameSearch();

        setupCreateGameForm();

        await updateInterface();

        console.log(
            "GAME HUB READY"
        );

        console.log(
            "User:",
            currentUser
        );

        console.log(
            "Profile:",
            currentProfile
        );
    }

    /* =========================================================
       20. START WHEN DOM IS READY
       ========================================================= */

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            startApp
        );
    } else {
        startApp();
    }

})();
