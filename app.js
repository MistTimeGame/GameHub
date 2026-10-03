```javascript
/* =========================================================
   GAME PLATFORM
   SUPABASE AUTH
   PRESENCE
   GLOBAL / GAME / GUILD CHAT
   WEBRTC VIDEO CONFERENCE
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";


/* =========================================================
   APP
========================================================= */

const APP_VERSION =
    "1.7.2";


let supabaseClient =
    null;


let currentUser =
    null;


let currentSession =
    null;


let currentPage =
    "home";


/* =========================================================
   PROFILE
========================================================= */

let profileData = {

    nickname:
        "Player",

    status:
        "Онлайн"

};


/* =========================================================
   GLOBAL PRESENCE
========================================================= */

let onlinePresenceChannel =
    null;


let onlinePlayers =
    [];


const presenceKey =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"

        ? crypto.randomUUID()

        : (
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2)
        );


/* =========================================================
   CHAT
========================================================= */

let chatRooms =
    [];

let activeChatRoom =
    null;

let chatChannel =
    null;


/* =========================================================
   VIDEO CALL
========================================================= */

let callChannel =
    null;

let callRoom =
    null;

let callSessionId =
    null;

let localMediaStream =
    null;

let screenMediaStream =
    null;

let callPeers =
    new Map();

let callPresenceUsers =
    new Map();

let pendingIceCandidates =
    new Map();

let sentOffers =
    new Set();


const ICE_SERVERS = [

    {
        urls:
            "stun:stun.l.google.com:19302"
    }

];


/* =========================================================
   DOM
========================================================= */

const authScreen =
    document.getElementById(
        "auth-screen"
    );


const appShell =
    document.getElementById(
        "app-shell"
    );


const loginTab =
    document.getElementById(
        "login-tab"
    );


const registerTab =
    document.getElementById(
        "register-tab"
    );


const loginForm =
    document.getElementById(
        "login-form"
    );


const registerForm =
    document.getElementById(
        "register-form"
    );


const authTitle =
    document.getElementById(
        "auth-title"
    );


const authSubtitle =
    document.getElementById(
        "auth-subtitle"
    );


const authMessage =
    document.getElementById(
        "auth-message"
    );


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        updateVersion();

        initAuthTabs();

        initForms();

        initNavigation();

        initModals();

        initButtons();


        if (
            !window.supabase ||
            typeof window.supabase.createClient !==
                "function"
        ) {

            showAuthMessage(
                "Не удалось загрузить библиотеку Supabase.",
                "error"
            );

            return;
        }


        try {

            supabaseClient =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_PUBLISHABLE_KEY,
                    {

                        auth: {

                            persistSession:
                                true,

                            autoRefreshToken:
                                true,

                            detectSessionInUrl:
                                true

                        }

                    }
                );

        } catch (error) {

            console.error(
                "Supabase initialization error:",
                error
            );

            showAuthMessage(
                "Не удалось подключить Supabase.",
                "error"
            );

            return;
        }


        subscribeAuthState();

        await loadInitialSession();

    }
);


/* =========================================================
   SESSION
========================================================= */

async function loadInitialSession() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        showAuthMessage(
            "Не удалось получить текущую сессию.",
            "error"
        );

        showAuthScreen();

        return;
    }


    currentSession =
        data.session || null;


    currentUser =
        data.session
            ? data.session.user
            : null;


    if (currentUser) {

        await enterApplication();

    } else {

        showAuthScreen();

    }

}


function subscribeAuthState() {

    supabaseClient.auth.onAuthStateChange(
        (
            event,
            session
        ) => {

            console.log(
                "Auth state:",
                event
            );


            currentSession =
                session || null;


            currentUser =
                session
                    ? session.user
                    : null;


            if (session) {

                setTimeout(
                    () => {

                        enterApplication();

                    },
                    0
                );

            } else {

                setTimeout(
                    () => {

                        cleanupRealtime();

                        showAuthScreen();

                    },
                    0
                );

            }

        }
    );

}


/* =========================================================
   AUTH TABS
========================================================= */

function initAuthTabs() {

    loginTab?.addEventListener(
        "click",
        () => {

            loginTab.classList.add(
                "active"
            );

            registerTab.classList.remove(
                "active"
            );


            loginForm.classList.remove(
                "hidden"
            );

            registerForm.classList.add(
                "hidden"
            );


            authTitle.textContent =
                "Добро пожаловать";


            authSubtitle.textContent =
                "Войдите в свой игровой профиль";


            clearAuthMessage();

        }
    );


    registerTab?.addEventListener(
        "click",
        () => {

            registerTab.classList.add(
                "active"
            );

            loginTab.classList.remove(
                "active"
            );


            registerForm.classList.remove(
                "hidden"
            );

            loginForm.classList.add(
                "hidden"
            );


            authTitle.textContent =
                "Создать профиль";


            authSubtitle.textContent =
                "Присоединитесь к Game Platform";


            clearAuthMessage();

        }
    );

}


/* =========================================================
   FORMS
========================================================= */

function initForms() {

    loginForm?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await loginUser();

        }
    );


    registerForm?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await registerUser();

        }
    );


    document
        .getElementById(
            "profile-form"
        )
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveProfile();

            }
        );

}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser() {

    const email =
        document
            .getElementById(
                "login-email"
            )
            ?.value
            .trim();


    const password =
        document
            .getElementById(
                "login-password"
            )
            ?.value || "";


    if (!email || !password) {

        showAuthMessage(
            "Введите email и пароль.",
            "error"
        );

        return;
    }


    setAuthLoading(
        loginForm,
        true
    );


    clearAuthMessage();


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .signInWithPassword({

                    email,

                    password

                });


        if (error) {

            showAuthMessage(
                translateSupabaseError(error),
                "error"
            );

            return;
        }


        if (!data || !data.user) {

            showAuthMessage(
                "Supabase не вернул пользователя после входа.",
                "error"
            );

            return;
        }


        currentSession =
            data.session || null;


        currentUser =
            data.user;


        console.log(
            "Login successful:",
            currentUser.id
        );


        await enterApplication();

    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        showAuthMessage(
            translateSupabaseError(error),
            "error"
        );

    } finally {

        setAuthLoading(
            loginForm,
            false
        );

    }

}


/* =========================================================
   REGISTER
========================================================= */

async function registerUser() {

    const nickname =
        document
            .getElementById(
                "register-nickname"
            )
            ?.value
            .trim() || "";


    const email =
        document
            .getElementById(
                "register-email"
            )
            ?.value
            .trim() || "";


    const password =
        document
            .getElementById(
                "register-password"
            )
            ?.value || "";


    const passwordConfirm =
        document
            .getElementById(
                "register-password-confirm"
            )
            ?.value || "";


    if (
        nickname.length < 3
    ) {

        showAuthMessage(
            "Никнейм должен содержать минимум 3 символа.",
            "error"
        );

        return;
    }


    if (
        nickname.length > 24
    ) {

        showAuthMessage(
            "Никнейм не должен быть длиннее 24 символов.",
            "error"
        );

        return;
    }


    if (!email) {

        showAuthMessage(
            "Введите email.",
            "error"
        );

        return;
    }


    if (
        password.length < 6
    ) {

        showAuthMessage(
            "Пароль должен содержать минимум 6 символов.",
            "error"
        );

        return;
    }


    if (
        password !==
        passwordConfirm
    ) {

        showAuthMessage(
            "Пароли не совпадают.",
            "error"
        );

        return;
    }


    setAuthLoading(
        registerForm,
        true
    );


    clearAuthMessage();


    const redirectUrl =
        window.location.origin +
        window.location.pathname;


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .signUp({

                    email,

                    password,

                    options: {

                        data: {

                            nickname,

                            status:
                                "Онлайн"

                        },

                        emailRedirectTo:
                            redirectUrl

                    }

                });


        if (error) {

            showAuthMessage(
                translateSupabaseError(error),
                "error"
            );

            return;
        }


        if (
            data.user &&
            !data.session
        ) {

            registerForm.reset();


            showAuthMessage(
                "Аккаунт создан. Проверьте почту и подтвердите email.",
                "success"
            );

            return;
        }


        currentSession =
            data.session || null;


        currentUser =
            data.user || null;


        if (!currentUser) {

            showAuthMessage(
                "Регистрация выполнена, но пользователь не был возвращён.",
                "error"
            );

            return;
        }


        await enterApplication();

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        showAuthMessage(
            translateSupabaseError(error),
            "error"
        );

    } finally {

        setAuthLoading(
            registerForm,
            false
        );

    }

}


/* =========================================================
   ENTER APPLICATION
========================================================= */

async function enterApplication() {

    if (!currentUser) {

        showAuthScreen();

        return;

    }


    console.log(
        "Entering application:",
        currentUser.id
    );


    if (authScreen) {

        authScreen.style.display =
            "none";

    }


    if (appShell) {

        appShell.classList.add(
            "visible"
        );

    }


    /*
       ВАЖНО:
       Ошибка profiles больше НЕ должна
       блокировать вход в приложение.
    */

    try {

        await ensureProfile();

    } catch (error) {

        console.error(
            "ensureProfile failed:",
            error
        );

    }


    applyProfile();


    renderPage(
        currentPage
    );


    try {

        await initGlobalPresence();

    } catch (error) {

        console.error(
            "Presence initialization failed:",
            error
        );

    }

}


/* =========================================================
   PROFILE
========================================================= */

async function ensureProfile() {

    if (!currentUser) {

        return;

    }


    const metadata =
        currentUser.user_metadata || {};


    const nickname =
        metadata.nickname ||
        (
            currentUser.email
                ? currentUser.email.split("@")[0]
                : "Player"
        );


    const status =
        metadata.status ||
        "Онлайн";


    /*
       Сначала пытаемся прочитать существующий профиль.

       Это безопаснее, чем делать upsert сразу:
       если RLS на UPDATE настроен неправильно,
       обычный вход пользователя всё равно не ломается.
    */

    try {

        const {
            data: existingProfile,
            error: selectError
        } =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();


        if (selectError) {

            console.error(
                "Profile select error:",
                selectError
            );


            profileData = {

                nickname,

                status

            };


            return;

        }


        if (existingProfile) {

            profileData =
                existingProfile;


            return;

        }


        /*
           Профиля ещё нет.
           Создаём его только один раз.
        */

        const {
            data: newProfile,
            error: insertError
        } =
            await supabaseClient
                .from("profiles")
                .insert({

                    id:
                        currentUser.id,

                    nickname,

                    status,

                    vip_level:
                        0

                })
                .select()
                .single();


        if (insertError) {

            console.error(
                "Profile insert error:",
                insertError
            );


            /*
               Даже если создание профиля
               запрещено RLS, приложение
               продолжает работу.
            */

            profileData = {

                nickname,

                status

            };


            return;

        }


        profileData =
            newProfile || {

                nickname,

                status

            };


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );


        profileData = {

            nickname,

            status

        };

    }

}


function getUserNickname() {

    return (
        profileData.nickname ||
        "Player"
    );

}


function getUserStatus() {

    return (
        profileData.status ||
        "Онлайн"
    );

}


function applyProfile() {

    const nickname =
        getUserNickname();


    const status =
        getUserStatus();


    const letter =
        nickname
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "?";


    const headerNickname =
        document.getElementById(
            "header-nickname"
        );


    const profileNickname =
        document.getElementById(
            "profile-nickname"
        );


    const headerStatus =
        document.getElementById(
            "header-status"
        );


    const profileStatus =
        document.getElementById(
            "profile-status"
        );


    const headerAvatar =
        document.getElementById(
            "header-avatar"
        );


    const profileAvatar =
        document.getElementById(
            "profile-avatar"
        );


    if (headerNickname) {

        headerNickname.textContent =
            nickname;

    }


    if (profileNickname) {

        profileNickname.textContent =
            nickname;

    }


    if (headerStatus) {

        headerStatus.textContent =
            status;

    }


    if (profileStatus) {

        profileStatus.textContent =
            status;

    }


    if (headerAvatar) {

        headerAvatar.textContent =
            letter;

    }


    if (profileAvatar) {

        profileAvatar.textContent =
            letter;

    }

}


function openProfile() {

    const nicknameInput =
        document.getElementById(
            "profile-nickname-input"
        );


    const statusInput =
        document.getElementById(
            "profile-status-input"
        );


    const message =
        document.getElementById(
            "profile-message"
        );


    if (nicknameInput) {

        nicknameInput.value =
            getUserNickname();

    }


    if (statusInput) {

        statusInput.value =
            getUserStatus();

    }


    if (message) {

        message.textContent =
            "";

    }


    openModal(
        "profile-modal"
    );

}


async function saveProfile() {

    const nickname =
        document
            .getElementById(
                "profile-nickname-input"
            )
            ?.value
            .trim() || "";


    const status =
        document
            .getElementById(
                "profile-status-input"
            )
            ?.value
            .trim() ||
        "Онлайн";


    if (
        nickname.length < 3
    ) {

        showModalMessage(
            "Никнейм должен содержать минимум 3 символа.",
            "error"
        );

        return;
    }


    if (
        nickname.length > 24
    ) {

        showModalMessage(
            "Никнейм не должен быть длиннее 24 символов.",
            "error"
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .updateUser(
                    {
                        data: {

                            nickname,

                            status

                        }
                    }
                );


        if (error) {

            showModalMessage(
                translateSupabaseError(error),
                "error"
            );

            return;
        }


        currentUser =
            data.user;


        await ensureProfile();


        applyProfile();


        await updateGlobalPresence();


        renderOnlinePlayers();


        showModalMessage(
            "Профиль сохранён.",
            "success"
        );


        setTimeout(
            () => {

                closeModal(
                    "profile-modal"
                );

            },
            700
        );

    } catch (error) {

        console.error(
            "Save profile error:",
            error
        );


        showModalMessage(
            translateSupabaseError(error),
            "error"
        );

    }

}


/* =========================================================
   GLOBAL PRESENCE
========================================================= */

async function initGlobalPresence() {

    await cleanupGlobalPresence();


    if (
        !currentUser
    ) {

        return;

    }


    try {

        await supabaseClient.realtime.setAuth();

    } catch (error) {

        console.warn(
            "Realtime auth:",
            error
        );

    }


    onlinePresenceChannel =
        supabaseClient.channel(
            "presence:global",
            {

                config: {

                    private: true,

                    presence: {

                        key:
                            presenceKey

                    }

                }

            }
        );


    onlinePresenceChannel.on(
        "presence",
        {
            event:
                "sync"
        },
        () => {

            refreshPresenceList();

        }
    );


    onlinePresenceChannel.on(
        "presence",
        {
            event:
                "join"
        },
        () => {

            refreshPresenceList();

        }
    );


    onlinePresenceChannel.on(
        "presence",
        {
            event:
                "leave"
        },
        () => {

            refreshPresenceList();

        }
    );


    onlinePresenceChannel.subscribe(
        async (
            status,
            error
        ) => {

            console.log(
                "Global Presence:",
                status,
                error
            );


            if (
                status ===
                "SUBSCRIBED"
            ) {

                await updateGlobalPresence();

            }

        }
    );

}


async function updateGlobalPresence() {

    if (
        !onlinePresenceChannel ||
        !currentUser
    ) {

        return;

    }


    try {

        await onlinePresenceChannel.track({

            user_id:
                currentUser.id,

            nickname:
                getUserNickname(),

            status:
                getUserStatus(),

            page:
                currentPage,

            online_at:
                new Date().toISOString()

        });

    } catch (error) {

        console.error(
            "Presence track:",
            error
        );

    }

}


function refreshPresenceList() {

    if (
        !onlinePresenceChannel
    ) {

        return;

    }


    const state =
        onlinePresenceChannel.presenceState();


    const users =
        new Map();


    Object.values(
        state
    ).forEach(
        entries => {

            entries.forEach(
                entry => {

                    if (
                        !entry.user_id
                    ) {

                        return;

                    }


                    users.set(
                        entry.user_id,
                        entry
                    );

                }
            );

        }
    );


    onlinePlayers =
        Array.from(
            users.values()
        );


    const count =
        onlinePlayers.length;


    const headerCount =
        document.getElementById(
            "online-header-count"
        );


    const sideCount =
        document.getElementById(
            "online-side-count"
        );


    const heroCount =
        document.getElementById(
            "hero-online-count"
        );


    const modalCount =
        document.getElementById(
            "online-modal-count"
        );


    if (headerCount) {

        headerCount.textContent =
            count;

    }


    if (sideCount) {

        sideCount.textContent =
            count;

    }


    if (heroCount) {

        heroCount.textContent =
            count;

    }


    if (modalCount) {

        modalCount.textContent =
            count;

    }


    renderOnlinePlayers();

}


function renderOnlinePlayers() {

    const list =
        document.getElementById(
            "online-player-list"
        );


    if (!list) {

        return;

    }


    if (!onlinePlayers.length) {

        list.innerHTML = `

            <div class="chat-empty">
                Сейчас никто не онлайн.
            </div>

        `;

        return;

    }


    list.innerHTML =
        onlinePlayers
            .map(
                player => {

                    const nickname =
                        player.nickname ||
                        "Player";


                    const letter =
                        nickname
                            .charAt(0)
                            .toUpperCase() ||
                        "?";


                    return `

                        <div class="online-player">

                            <div class="online-player-avatar">
                                ${escapeHtml(letter)}
                            </div>

                            <div class="online-player-copy">

                                <strong>
                                    ${escapeHtml(
                                        nickname
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        player.status ||
                                        "Онлайн"
                                    )}
                                </span>

                            </div>

                            <div class="online-player-status">

                                <span class="status-dot"></span>

                                ONLINE

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


async function openOnlinePlayers() {

    refreshPresenceList();

    openModal(
        "online-modal"
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {

    document
        .querySelectorAll(
            ".side-tile[data-page]"
        )
        .forEach(
            tile => {

                tile.addEventListener(
                    "click",
                    async () => {

                        await openPage(
                            tile.dataset.page
                        );

                    }
                );

            }
        );

}


async function openPage(
    page
) {

    currentPage =
        page;


    document
        .querySelectorAll(
            ".side-tile[data-page]"
        )
        .forEach(
            tile => {

                tile.classList.toggle(
                    "active",
                    tile.dataset.page === page
                );

            }
        );


    renderPage(
        page
    );


    await updateGlobalPresence();

}


/* =========================================================
   PAGE RENDER
========================================================= */

function renderPage(
    page
) {

    const pages = {

        home: {

            kicker:
                "PLATFORM",

            title:
                "Главная",

            badge:
                "HOME",

            content: `

                <div class="welcome-grid">

                    <article class="info-card">

                        <div class="info-card-icon">
                            ◈
                        </div>

                        <div>

                            <strong>
                                Игры
                            </strong>

                            <p>
                                Каждая игра получает
                                отдельную комнату чата.
                            </p>

                        </div>

                    </article>


                    <article class="info-card">

                        <div class="info-card-icon">
                            ♜
                        </div>

                        <div>

                            <strong>
                                Гильдии
                            </strong>

                            <p>
                                Для каждой гильдии
                                создаётся отдельный чат.
                            </p>

                        </div>

                    </article>


                    <article class="info-card">

                        <div class="info-card-icon">
                            ◉
                        </div>

                        <div>

                            <strong>
                                Видеосвязь
                            </strong>

                            <p>
                                Камера, микрофон
                                и демонстрация экрана.
                            </p>

                        </div>

                    </article>

                </div>

            `

        },


        games: {

            kicker:
                "LIBRARY",

            title:
                "Игры",

            badge:
                "GAMES",

            content: `

                <div
                    class="games-list"
                    id="games-list"
                >

                    <div class="info-card">

                        <div class="info-card-icon">
                            ◈
                        </div>

                        <div>

                            <strong>
                                Загружаем игры...
                            </strong>

                            <p>
                                Формируем каталог.
                            </p>

                        </div>

                    </div>

                </div>

            `

        },


        news: {

            kicker:
                "COMMUNITY",

            title:
                "Новости",

            badge:
                "NEWS",

            content: `

                <div class="welcome-grid">

                    <article class="info-card">

                        <div class="info-card-icon">
                            ◫
                        </div>

                        <div>

                            <strong>
                                Новости
                            </strong>

                            <p>
                                Здесь появится лента
                                новостей сообщества.
                            </p>

                        </div>

                    </article>

                </div>

            `

        },


        online: {

            kicker:
                "COMMUNITY",

            title:
                "Онлайн",

            badge:
                "LIVE",

            content: `

                <div class="welcome-grid">

                    <article class="info-card">

                        <div class="info-card-icon">
                            ◉
                        </div>

                        <div>

                            <strong>
                                ${onlinePlayers.length}
                                игроков онлайн
                            </strong>

                            <p>
                                Список обновляется
                                через Realtime Presence.
                            </p>

                        </div>

                    </article>

                </div>

            `

        },


        profile: {

            kicker:
                "ACCOUNT",

            title:
                "Профиль",

            badge:
                "PROFILE",

            content: `

                <div class="welcome-grid">

                    <article class="info-card">

                        <div class="info-card-icon">
                            ◎
                        </div>

                        <div>

                            <strong>
                                ${escapeHtml(
                                    getUserNickname()
                                )}
                            </strong>

                            <p>
                                ${escapeHtml(
                                    getUserStatus()
                                )}
                            </p>

                        </div>

                    </article>

                </div>

            `

        },


        chat: {

            kicker:
                "COMMUNITY",

            title:
                "Чат",

            badge:
                "REALTIME",

            content:
                getChatPageHtml()

        }

    };


    const config =
        pages[page] ||
        pages.home;


    const pageKicker =
        document.getElementById(
            "page-kicker"
        );


    const pageTitle =
        document.getElementById(
            "page-title"
        );


    const pageBadge =
        document.getElementById(
            "page-badge"
        );


    const pageContent =
        document.getElementById(
            "page-content"
        );


    if (pageKicker) {

        pageKicker.textContent =
            config.kicker;

    }


    if (pageTitle) {

        pageTitle.textContent =
            config.title;

    }


    if (pageBadge) {

        pageBadge.textContent =
            config.badge;

    }


    if (pageContent) {

        pageContent.innerHTML =
            config.content;

    }


    if (
        page === "chat"
    ) {

        initChatPage();

    }


    if (
        page === "games"
    ) {

        loadGames();

    }

}


/* =========================================================
   GAMES
========================================================= */

async function loadGames() {

    const container =
        document.getElementById(
            "games-list"
        );


    if (!container) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("games")
            .select(
                `
                    id,
                    name,
                    slug,
                    description
                `
            )
            .order(
                "name",
                {
                    ascending:
                        true
                }
            );


    if (error) {

        container.innerHTML = `

            <article class="info-card">

                <div class="info-card-icon">
                    !
                </div>

                <div>

                    <strong>
                        Не удалось загрузить игры
                    </strong>

                    <p>
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                </div>

            </article>

        `;

        return;

    }


    if (!data.length) {

        container.innerHTML = `

            <article class="info-card">

                <div class="info-card-icon">
                    ◈
                </div>

                <div>

                    <strong>
                        Игр пока нет
                    </strong>

                    <p>
                        После добавления игры её
                        чат создастся автоматически.
                    </p>

                </div>

            </article>

        `;

        return;

    }


    container.innerHTML =
        data
            .map(
                game => {

                    return `

                        <article class="game-card">

                            <div class="game-card-title">
                                ${escapeHtml(
                                    game.name
                                )}
                            </div>


                            <div class="game-card-description">
                                ${escapeHtml(
                                    game.description ||
                                    "Игровое сообщество"
                                )}
                            </div>


                            <button
                                type="button"
                                class="game-chat-link"
                                data-game-id="${game.id}"
                            >
                                Открыть чат игры
                            </button>

                        </article>

                    `;

                }
            )
            .join("");


    container
        .querySelectorAll(
            ".game-chat-link"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await openGameChat(
                            button.dataset.gameId
                        );

                    }
                );

            }
        );

}


/* =========================================================
   OPEN GAME CHAT
========================================================= */

async function openGameChat(
    gameId
) {

    await loadChatRooms();


    const room =
        chatRooms.find(
            item =>
                item.type ===
                    "game"
                &&
                item.game_id ===
                    gameId
        );


    if (!room) {

        alert(
            "Чат этой игры ещё не создан."
        );

        return;

    }


    if (
        currentPage !==
        "chat"
    ) {

        await openPage(
            "chat"
        );

    }


    await selectChatRoom(
        room.id
    );

}


/* =========================================================
   CHAT HTML
========================================================= */

function getChatPageHtml() {

    return `

        <div class="chat-layout">


            <aside class="chat-rooms-panel">

                <input
                    type="text"
                    class="chat-room-search"
                    id="chat-room-search"
                    placeholder="Поиск комнаты..."
                >


                <div class="chat-rooms-title">
                    ROOMS
                </div>


                <div
                    class="chat-room-list"
                    id="chat-room-list"
                ></div>

            </aside>


            <section class="chat-main">


                <header class="chat-header">

                    <div class="chat-header-copy">

                        <strong id="chat-room-title">
                            Выберите комнату
                        </strong>

                        <span id="chat-room-subtitle">
                            Realtime
                        </span>

                    </div>


                    <button
                        type="button"
                        class="chat-call-button"
                        id="chat-call-button"
                    >
                        ◉
                        Видеоконференция
                    </button>

                </header>


                <div
                    class="chat-message-list"
                    id="chat-message-list"
                >

                    <div class="chat-empty">
                        Выберите комнату слева.
                    </div>

                </div>


                <form
                    class="chat-form"
                    id="chat-form"
                >

                    <textarea
                        class="chat-input"
                        id="chat-input"
                        maxlength="4000"
                        rows="1"
                        placeholder="Напишите сообщение..."
                    ></textarea>


                    <button
                        type="submit"
                        class="chat-send-button"
                    >
                        Отправить
                    </button>

                </form>

            </section>

        </div>

    `;

}


/* =========================================================
   CHAT PAGE
========================================================= */

function initChatPage() {

    const form =
        document.getElementById(
            "chat-form"
        );


    const input =
        document.getElementById(
            "chat-input"
        );


    const search =
        document.getElementById(
            "chat-room-search"
        );


    const callButton =
        document.getElementById(
            "chat-call-button"
        );


    form?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await sendChatMessage();

        }
    );


    input?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                    "Enter"
                &&
                !event.shiftKey
            ) {

                event.preventDefault();

                form.requestSubmit();

            }

        }
    );


    search?.addEventListener(
        "input",
        () => {

            renderChatRooms(
                search.value
            );

        }
    );


    callButton?.addEventListener(
        "click",
        async () => {

            if (
                !activeChatRoom
            ) {

                return;

            }


            await openVideoCall(
                activeChatRoom
            );

        }
    );


    loadChatRooms();

}


/* =========================================================
   LOAD ROOMS
========================================================= */

async function loadChatRooms() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("chat_rooms")
            .select(
                `
                    id,
                    type,
                    name,
                    game_id,
                    guild_id,
                    created_at
                `
            )
            .order(
                "created_at",
                {
                    ascending:
                        true
                }
            );


    if (error) {

        console.error(
            "Chat room loading:",
            error
        );


        const list =
            document.getElementById(
                "chat-room-list"
            );


        if (list) {

            list.innerHTML = `

                <div class="chat-empty">

                    Ошибка загрузки комнат.

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            `;

        }


        return false;

    }


    chatRooms =
        data || [];


    renderChatRooms();


    if (
        activeChatRoom
    ) {

        const exists =
            chatRooms.some(
                room =>
                    room.id ===
                    activeChatRoom.id
            );


        if (!exists) {

            activeChatRoom =
                null;

        }

    }


    if (
        !activeChatRoom &&
        chatRooms.length
    ) {

        const globalRoom =
            chatRooms.find(
                room =>
                    room.type ===
                    "global"
            );


        await selectChatRoom(
            globalRoom
                ? globalRoom.id
                : chatRooms[0].id
        );

    }


    return true;

}


/* =========================================================
   RENDER ROOMS
========================================================= */

function renderChatRooms(
    searchText = ""
) {

    const list =
        document.getElementById(
            "chat-room-list"
        );


    if (!list) {

        return;

    }


    const query =
        searchText
            .trim()
            .toLowerCase();


    const rooms =
        chatRooms.filter(
            room => {

                if (!query) {

                    return true;

                }


                return (
                    String(room.name || "")
                        .toLowerCase()
                        .includes(
                            query
                        )

                    ||

                    String(room.type || "")
                        .toLowerCase()
                        .includes(
                            query
                        )
                );

            }
        );


    if (!rooms.length) {

        list.innerHTML = `

            <div class="chat-empty">

                Нет доступных комнат.

            </div>

        `;

        return;

    }


    list.innerHTML =
        rooms
            .map(
                room => {

                    const icon =
                        room.type ===
                        "global"
                            ? "◎"
                            :
                        room.type ===
                        "game"
                            ? "◈"
                            :
                        "♜";


                    const type =
                        room.type ===
                        "global"
                            ? "GLOBAL"
                            :
                        room.type ===
                        "game"
                            ? "GAME"
                            :
                        "GUILD";


                    return `

                        <button
                            type="button"
                            class="chat-room-button ${
                                activeChatRoom &&
                                activeChatRoom.id ===
                                    room.id
                                    ? "active"
                                    : ""
                            }"
                            data-room-id="${escapeHtml(room.id)}"
                        >

                            <span class="chat-room-icon">
                                ${icon}
                            </span>


                            <span class="chat-room-copy">

                                <strong>
                                    ${escapeHtml(
                                        room.name
                                    )}
                                </strong>

                                <span>
                                    ${type}
                                </span>

                            </span>


                            <span class="chat-room-type">
                                #
                            </span>

                        </button>

                    `;

                }
            )
            .join("");


    list
        .querySelectorAll(
            ".chat-room-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await selectChatRoom(
                            button.dataset.roomId
                        );

                    }
                );

            }
        );

}


/* =========================================================
   SELECT ROOM
========================================================= */

async function selectChatRoom(
    roomId
) {

    const room =
        chatRooms.find(
            item =>
                item.id ===
                roomId
        );


    if (!room) {

        return;

    }


    activeChatRoom =
        room;


    renderChatRooms();


    const title =
        document.getElementById(
            "chat-room-title"
        );


    const subtitle =
        document.getElementById(
            "chat-room-subtitle"
        );


    if (title) {

        title.textContent =
            room.name;

    }


    if (subtitle) {

        subtitle.textContent =

            room.type ===
                "global"

                ? "Все пользователи платформы"

                :

            room.type ===
                "game"

                ? "Игровое сообщество"

                :

            "Закрытый чат гильдии";

    }


    await subscribeChatRoom(
        room
    );


    await loadChatHistory(
        room.id
    );


    document
        .getElementById(
            "chat-input"
        )
        ?.focus();

}


/* =========================================================
   CHAT REALTIME
========================================================= */

async function subscribeChatRoom(
    room
) {

    await removeChatChannel();


    try {

        await supabaseClient.realtime.setAuth();

    } catch (error) {

        console.warn(
            "Realtime setAuth:",
            error
        );

    }


    chatChannel =
        supabaseClient.channel(
            `chat:${room.id}`,
            {

                config: {

                    private:
                        true,

                    broadcast: {

                        self:
                            false,

                        ack:
                            true

                    }

                }

            }
        );


    chatChannel.on(
        "broadcast",
        {
            event:
                "INSERT"
        },
        async payload => {

            const record =
                payload?.payload?.record;


            if (!record) {

                return;

            }


            if (
                record.room_id !==
                room.id
            ) {

                return;

            }


            await receiveLiveMessage(
                record
            );

        }
    );


    chatChannel.subscribe(
        (
            status,
            error
        ) => {

            console.log(
                "Chat channel:",
                status,
                error
            );


            if (error) {

                console.error(
                    "Chat channel error:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   HISTORY
========================================================= */

async function loadChatHistory(
    roomId
) {

    const list =
        document.getElementById(
            "chat-message-list"
        );


    if (!list) {

        return;

    }


    list.innerHTML = `

        <div class="chat-empty">
            Загружаем сообщения...
        </div>

    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("chat_messages")
            .select(
                `
                    id,
                    room_id,
                    user_id,
                    body,
                    created_at,
                    profiles (
                        nickname,
                        status
                    )
                `
            )
            .eq(
                "room_id",
                roomId
            )
            .order(
                "created_at",
                {
                    ascending:
                        true
                }
            )
            .limit(
                300
            );


    if (error) {

        list.innerHTML = `

            <div class="chat-empty">

                Ошибка загрузки сообщений.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

        return;

    }


    list.innerHTML = "";


    if (!data.length) {

        list.innerHTML = `

            <div class="chat-empty">
                Это начало истории чата.
            </div>

        `;

        return;

    }


    data.forEach(
        message => {

            appendChatMessage(
                message
            );

        }
    );


    scrollChatToBottom();

}


/* =========================================================
   RECEIVE LIVE MESSAGE
========================================================= */

async function receiveLiveMessage(
    record
) {

    const exists =
        document.querySelector(
            `[data-message-id="${record.id}"]`
        );


    if (exists) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("chat_messages")
            .select(
                `
                    id,
                    room_id,
                    user_id,
                    body,
                    created_at,
                    profiles (
                        nickname,
                        status
                    )
                `
            )
            .eq(
                "id",
                record.id
            )
            .maybeSingle();


    if (error || !data) {

        console.warn(
            "Live message loading:",
            error
        );

        return;

    }


    appendChatMessage(
        data,
        true
    );


    scrollChatToBottom();

}


/* =========================================================
   APPEND MESSAGE
========================================================= */

function appendChatMessage(
    message,
    animate = false
) {

    const list =
        document.getElementById(
            "chat-message-list"
        );


    if (!list) {

        return;

    }


    if (
        document.querySelector(
            `[data-message-id="${message.id}"]`
        )
    ) {

        return;

    }


    const empty =
        list.querySelector(
            ".chat-empty"
        );


    if (empty) {

        empty.remove();

    }


    const profile =
        Array.isArray(
            message.profiles
        )

            ? message.profiles[0]

            : message.profiles;


    const nickname =
        profile?.nickname ||
        "Player";


    const own =
        currentUser &&
        message.user_id ===
            currentUser.id;


    const letter =
        nickname
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "?";


    const element =
        document.createElement(
            "div"
        );


    element.className =
        own
            ? "chat-message own"
            : "chat-message";


    element.dataset.messageId =
        message.id;


    element.innerHTML = `

        ${
            own
                ? ""

                : `

                    <div class="chat-message-avatar">
                        ${escapeHtml(letter)}
                    </div>

                `
        }


        <div class="chat-message-body">

            <div class="chat-message-author">
                ${escapeHtml(
                    nickname
                )}
            </div>


            <div class="chat-message-text">
                ${escapeHtml(
                    message.body
                )}
            </div>


            <div class="chat-message-meta">
                ${formatTime(
                    message.created_at
                )}
            </div>

        </div>


        ${
            own

                ? `

                    <div class="chat-message-avatar">
                        ${escapeHtml(letter)}
                    </div>

                `

                : ""

        }

    `;


    list.appendChild(
        element
    );


    if (animate) {

        element.animate(
            [
                {
                    opacity: 0,

                    transform:
                        "translateY(8px)"
                },

                {
                    opacity: 1,

                    transform:
                        "translateY(0)"
                }

            ],
            {
                duration:
                    220,

                easing:
                    "ease-out"
            }
        );

    }

}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendChatMessage() {

    if (
        !currentUser ||
        !activeChatRoom
    ) {

        return;

    }


    const input =
        document.getElementById(
            "chat-input"
        );


    if (!input) {

        return;

    }


    const body =
        input.value.trim();


    if (!body) {

        return;

    }


    if (
        body.length > 4000
    ) {

        return;

    }


    input.disabled =
        true;


    const {
        error
    } =
        await supabaseClient
            .from(
                "chat_messages"
            )
            .insert(
                {

                    room_id:
                        activeChatRoom.id,

                    user_id:
                        currentUser.id,

                    body

                }
            );


    input.disabled =
        false;


    if (error) {

        alert(
            `Не удалось отправить сообщение:\n${error.message}`
        );

        return;

    }


    input.value =
        "";

    input.focus();

}


/* =========================================================
   VIDEO CALL OPEN
========================================================= */

async function openVideoCall(
    room
) {

    if (
        callChannel
    ) {

        return;

    }


    callRoom =
        room;


    callSessionId =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"

            ? crypto.randomUUID()

            : (
                Date.now().toString(36) +
                "-" +
                Math.random().toString(36).slice(2)
            );


    const callRoomTitle =
        document.getElementById(
            "call-room-title"
        );


    const callStatus =
        document.getElementById(
            "call-status"
        );


    const callModal =
        document.getElementById(
            "call-modal"
        );


    if (callRoomTitle) {

        callRoomTitle.textContent =
            room.name;

    }


    if (callStatus) {

        callStatus.textContent =
            "Запрашиваем камеру и микрофон...";

    }


    callModal?.classList.add(
        "open"
    );


    try {

        await prepareLocalMedia();

        await initCallChannel();


        setCallStatus(
            "Вы подключены к видеоконференции."
        );

    } catch (error) {

        console.error(
            "Video call error:",
            error
        );


        setCallStatus(
            error.message ||
            "Не удалось запустить видеоконференцию."
        );

    }

}


/* =========================================================
   LOCAL MEDIA
========================================================= */

async function prepareLocalMedia() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        throw new Error(
            "Браузер не поддерживает камеру и микрофон."
        );

    }


    try {

        localMediaStream =
            await navigator.mediaDevices.getUserMedia(
                {

                    video:
                        true,

                    audio:
                        true

                }
            );

    } catch (firstError) {

        console.warn(
            "Camera+microphone:",
            firstError
        );


        try {

            localMediaStream =
                await navigator.mediaDevices.getUserMedia(
                    {

                        video:
                            false,

                        audio:
                            true

                    }
                );

        } catch (secondError) {

            console.warn(
                "Microphone:",
                secondError
            );


            localMediaStream =
                new MediaStream();

        }

    }


    const localVideo =
        document.getElementById(
            "local-video"
        );


    if (localVideo) {

        localVideo.srcObject =
            localMediaStream;

    }


    const micButton =
        document.getElementById(
            "call-mic-button"
        );


    const cameraButton =
        document.getElementById(
            "call-camera-button"
        );


    if (
        localMediaStream
            .getAudioTracks()
            .length
    ) {

        micButton?.classList.add(
            "active"
        );

    }


    if (
        localMediaStream
            .getVideoTracks()
            .length
    ) {

        cameraButton?.classList.add(
            "active"
        );

    }

}


/* =========================================================
   CALL CHANNEL
========================================================= */

async function initCallChannel() {

    try {

        await supabaseClient.realtime.setAuth();

    } catch (error) {

        console.warn(
            "Call setAuth:",
            error
        );

    }


    callChannel =
        supabaseClient.channel(
            `call:${callRoom.id}`,
            {

                config: {

                    private:
                        true,

                    presence: {

                        key:
                            callSessionId

                    },

                    broadcast: {

                        self:
                            false,

                        ack:
                            false

                    }

                }

            }
        );


    callChannel.on(
        "broadcast",
        {
            event:
                "signal"
        },
        async payload => {

            await handleWebRTCSignal(
                payload?.payload
            );

        }
    );


    callChannel.on(
        "presence",
        {
            event:
                "sync"
        },
        () => {

            rebuildCallPresence();

        }
    );


    callChannel.on(
        "presence",
        {
            event:
                "join"
        },
        () => {

            rebuildCallPresence();

        }
    );


    callChannel.on(
        "presence",
        {
            event:
                "leave"
        },
        payload => {

            if (
                payload?.key
            ) {

                removeCallPeer(
                    payload.key
                );

            }


            rebuildCallPresence();

        }
    );


    callChannel.subscribe(
        async (
            status,
            error
        ) => {

            console.log(
                "Call channel:",
                status,
                error
            );


            if (
                status ===
                "SUBSCRIBED"
            ) {

                await callChannel.track(
                    {

                        user_id:
                            currentUser.id,

                        nickname:
                            getUserNickname(),

                        session_id:
                            callSessionId,

                        joined_at:
                            new Date().toISOString()

                    }
                );


                rebuildCallPresence();

            }


            if (error) {

                console.error(
                    "Call channel error:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   CALL PRESENCE
========================================================= */

function rebuildCallPresence() {

    if (!callChannel) {

        return;

    }


    const state =
        callChannel.presenceState();


    callPresenceUsers.clear();


    Object.entries(
        state
    ).forEach(
        (
            [
                key,
                entries
            ]
        ) => {

            const entry =
                entries?.[0];


            if (
                !entry ||
                entry.session_id ===
                    callSessionId
            ) {

                return;

            }


            callPresenceUsers.set(
                entry.session_id,
                {

                    ...entry,

                    presence_key:
                        key

                }
            );

        }
    );


    updateCallParticipantCount();


    callPresenceUsers.forEach(
        async peer => {

            const shouldOffer =
                callSessionId <
                peer.session_id;


            const pc =
                await getOrCreatePeerConnection(
                    peer
                );


            if (
                shouldOffer
                &&
                !sentOffers.has(
                    peer.session_id
                )
            ) {

                sentOffers.add(
                    peer.session_id
                );


                await createPeerOffer(
                    peer,
                    pc
                );

            }

        }
    );

}


/* =========================================================
   PEER CONNECTION
========================================================= */

async function getOrCreatePeerConnection(
    peer
) {

    if (
        callPeers.has(
            peer.session_id
        )
    ) {

        return callPeers.get(
            peer.session_id
        );

    }


    const pc =
        new RTCPeerConnection(
            {

                iceServers:
                    ICE_SERVERS

            }
        );


    if (localMediaStream) {

        localMediaStream
            .getTracks()
            .forEach(
                track => {

                    pc.addTrack(
                        track,
                        localMediaStream
                    );

                }
            );

    }


    pc.onicecandidate =
        async event => {

            if (
                !event.candidate
            ) {

                return;

            }


            await sendCallSignal(
                {

                    type:
                        "ice",

                    to:
                        peer.session_id,

                    from:
                        callSessionId,

                    candidate:
                        event.candidate

                }
            );

        };


    pc.ontrack =
        event => {

            const stream =
                event.streams[0];


            if (stream) {

                attachRemoteVideo(
                    peer,
                    stream
                );

            }

        };


    pc.onconnectionstatechange =
        () => {

            if (
                pc.connectionState ===
                    "failed"
                ||
                pc.connectionState ===
                    "closed"
            ) {

                removeCallPeer(
                    peer.session_id
                );

            }

        };


    callPeers.set(
        peer.session_id,
        pc
    );


    return pc;

}


/* =========================================================
   CREATE OFFER
========================================================= */

async function createPeerOffer(
    peer,
    pc
) {

    try {

        const offer =
            await pc.createOffer();


        await pc.setLocalDescription(
            offer
        );


        await sendCallSignal(
            {

                type:
                    "offer",

                to:
                    peer.session_id,

                from:
                    callSessionId,

                nickname:
                    getUserNickname(),

                description:
                    pc.localDescription

            }
        );

    } catch (error) {

        console.error(
            "Offer:",
            error
        );

    }

}


/* =========================================================
   SIGNAL
========================================================= */

async function handleWebRTCSignal(
    signal
) {

    if (
        !signal ||
        signal.to !==
            callSessionId
    ) {

        return;

    }


    let peer =
        callPresenceUsers.get(
            signal.from
        );


    if (!peer) {

        peer = {

            session_id:
                signal.from,

            nickname:
                signal.nickname ||
                "Player"

        };


        callPresenceUsers.set(
            signal.from,
            peer
        );

    }


    const pc =
        await getOrCreatePeerConnection(
            peer
        );


    try {

        if (
            signal.type ===
            "offer"
        ) {

            await pc.setRemoteDescription(
                new RTCSessionDescription(
                    signal.description
                )
            );


            await flushPendingIce(
                signal.from,
                pc
            );


            const answer =
                await pc.createAnswer();


            await pc.setLocalDescription(
                answer
            );


            await sendCallSignal(
                {

                    type:
                        "answer",

                    to:
                        signal.from,

                    from:
                        callSessionId,

                    nickname:
                        getUserNickname(),

                    description:
                        pc.localDescription

                }
            );


            return;

        }


        if (
            signal.type ===
            "answer"
        ) {

            await pc.setRemoteDescription(
                new RTCSessionDescription(
                    signal.description
                )
            );


            await flushPendingIce(
                signal.from,
                pc
            );


            return;

        }


        if (
            signal.type ===
            "ice"
        ) {

            if (
                pc.remoteDescription
            ) {

                await pc.addIceCandidate(
                    signal.candidate
                );

            } else {

                if (
                    !pendingIceCandidates.has(
                        signal.from
                    )
                ) {

                    pendingIceCandidates.set(
                        signal.from,
                        []
                    );

                }


                pendingIceCandidates
                    .get(
                        signal.from
                    )
                    .push(
                        signal.candidate
                    );

            }

        }

    } catch (error) {

        console.error(
            "WebRTC signal:",
            error
        );

    }

}


/* =========================================================
   ICE
========================================================= */

async function flushPendingIce(
    peerId,
    pc
) {

    const queue =
        pendingIceCandidates.get(
            peerId
        );


    if (!queue) {

        return;

    }


    for (
        const candidate
        of queue
    ) {

        try {

            await pc.addIceCandidate(
                candidate
            );

        } catch (error) {

            console.warn(
                "ICE:",
                error
            );

        }

    }


    pendingIceCandidates.delete(
        peerId
    );

}


/* =========================================================
   SEND CALL SIGNAL
========================================================= */

async function sendCallSignal(
    payload
) {

    if (!callChannel) {

        return;

    }


    try {

        await callChannel.send(
            {

                type:
                    "broadcast",

                event:
                    "signal",

                payload

            }
        );

    } catch (error) {

        console.error(
            "Call signal:",
            error
        );

    }

}


/* =========================================================
   REMOTE VIDEO
========================================================= */

function attachRemoteVideo(
    peer,
    stream
) {

    const grid =
        document.getElementById(
            "call-video-grid"
        );


    if (!grid) {

        return;

    }


    let tile =
        grid.querySelector(
            `[data-peer-id="${peer.session_id}"]`
        );


    if (!tile) {

        tile =
            document.createElement(
                "div"
            );


        tile.className =
            "call-video-tile";


        tile.dataset.peerId =
            peer.session_id;


        tile.innerHTML = `

            <video
                autoplay
                playsinline
            ></video>


            <div class="call-video-label">
                ${escapeHtml(
                    peer.nickname ||
                    "Player"
                )}
            </div>

        `;


        grid.appendChild(
            tile
        );

    }


    const video =
        tile.querySelector(
            "video"
        );


    if (video) {

        video.srcObject =
            stream;

    }

}


/* =========================================================
   SCREEN SHARE
========================================================= */

async function toggleScreenShare() {

    if (
        screenMediaStream
    ) {

        await stopScreenShare();

        return;

    }


    if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getDisplayMedia !==
            "function"
    ) {

        setCallMessage(
            "Браузер не поддерживает демонстрацию экрана."
        );

        return;

    }


    try {

        screenMediaStream =
            await navigator.mediaDevices.getDisplayMedia(
                {

                    video: {

                        frameRate:
                            30

                    },

                    audio:
                        true

                }
            );


        const screenTrack =
            screenMediaStream.getVideoTracks()[0];


        if (!screenTrack) {

            throw new Error(
                "Не удалось получить экран."
            );

        }


        const localVideo =
            document.getElementById(
                "local-video"
            );


        if (localVideo) {

            localVideo.srcObject =
                screenMediaStream;

        }


        for (
            const pc
            of callPeers.values()
        ) {

            const sender =
                pc
                    .getSenders()
                    .find(
                        item =>
                            item.track &&
                            item.track.kind ===
                            "video"
                    );


            if (sender) {

                await sender.replaceTrack(
                    screenTrack
                );

            }

        }


        screenTrack.onended =
            () => {

                stopScreenShare();

            };


        document
            .getElementById(
                "call-screen-button"
            )
            ?.classList.add(
                "active"
            );


        setCallMessage(
            "Демонстрация экрана включена."
        );

    } catch (error) {

        console.warn(
            "Screen sharing:",
            error
        );


        screenMediaStream =
            null;


        setCallMessage(
            "Демонстрация экрана отменена."
        );

    }

}


/* =========================================================
   STOP SCREEN SHARE
========================================================= */

async function stopScreenShare() {

    if (
        !screenMediaStream
    ) {

        return;

    }


    screenMediaStream
        .getTracks()
        .forEach(
            track => {

                try {

                    track.stop();

                } catch {}

            }
        );


    screenMediaStream =
        null;


    const cameraTrack =
        localMediaStream
            ?.getVideoTracks()[0]
        ||
        null;


    const localVideo =
        document.getElementById(
            "local-video"
        );


    if (
        localVideo &&
        localMediaStream
    ) {

        localVideo.srcObject =
            localMediaStream;

    }


    for (
        const pc
        of callPeers.values()
    ) {

        const sender =
            pc
                .getSenders()
                .find(
                    item =>
                        item.track &&
                        item.track.kind ===
                            "video"
                );


        if (sender) {

            try {

                await sender.replaceTrack(
                    cameraTrack
                );

            } catch (error) {

                console.warn(
                    "replaceTrack:",
                    error
                );

            }

        }

    }


    document
        .getElementById(
            "call-screen-button"
        )
        ?.classList.remove(
            "active"
        );


    setCallMessage(
        "Демонстрация экрана остановлена."
    );

}


/* =========================================================
   MIC
========================================================= */

function toggleMicrophone() {

    const tracks =
        localMediaStream
            ?.getAudioTracks()
        ||
        [];


    if (!tracks.length) {

        setCallMessage(
            "Микрофон недоступен."
        );

        return;

    }


    const enabled =
        !tracks[0].enabled;


    tracks.forEach(
        track => {

            track.enabled =
                enabled;

        }
    );


    document
        .getElementById(
            "call-mic-button"
        )
        ?.classList.toggle(
            "active",
            enabled
        );

}


/* =========================================================
   CAMERA
========================================================= */

function toggleCamera() {

    const tracks =
        localMediaStream
            ?.getVideoTracks()
        ||
        [];


    if (!tracks.length) {

        setCallMessage(
            "Камера недоступна."
        );

        return;

    }


    const enabled =
        !tracks[0].enabled;


    tracks.forEach(
        track => {

            track.enabled =
                enabled;

        }
    );


    document
        .getElementById(
            "call-camera-button"
        )
        ?.classList.toggle(
            "active",
            enabled
        );

}


/* =========================================================
   CALL COUNT
========================================================= */

function updateCallParticipantCount() {

    const element =
        document.getElementById(
            "call-participant-count"
        );


    if (element) {

        element.textContent =
            callPresenceUsers.size + 1;

    }

}


/* =========================================================
   REMOVE PEER
========================================================= */

function removeCallPeer(
    peerId
) {

    const pc =
        callPeers.get(
            peerId
        );


    if (pc) {

        try {

            pc.close();

        } catch {}


        callPeers.delete(
            peerId
        );

    }


    const tile =
        document.querySelector(
            `[data-peer-id="${peerId}"]`
        );


    if (tile) {

        tile.remove();

    }


    sentOffers.delete(
        peerId
    );


    pendingIceCandidates.delete(
        peerId
    );


    updateCallParticipantCount();

}


/* =========================================================
   CLOSE CALL
========================================================= */

async function closeVideoCall() {

    if (
        screenMediaStream
    ) {

        screenMediaStream
            .getTracks()
            .forEach(
                track => {

                    try {

                        track.stop();

                    } catch {}

                }
            );

    }


    if (
        localMediaStream
    ) {

        localMediaStream
            .getTracks()
            .forEach(
                track => {

                    try {

                        track.stop();

                    } catch {}

                }
            );

    }


    callPeers.forEach(
        pc => {

            try {

                pc.close();

            } catch {}

        }
    );


    callPeers.clear();

    callPresenceUsers.clear();

    pendingIceCandidates.clear();

    sentOffers.clear();


    if (
        callChannel
    ) {

        try {

            await supabaseClient
                .removeChannel(
                    callChannel
                );

        } catch (error) {

            console.warn(
                "remove call channel:",
                error
            );

        }

    }


    callChannel =
        null;


    callRoom =
        null;


    callSessionId =
        null;


    localMediaStream =
        null;


    screenMediaStream =
        null;


    const localVideo =
        document.getElementById(
            "local-video"
        );


    if (localVideo) {

        localVideo.srcObject =
            null;

    }


    document
        .getElementById(
            "call-video-grid"
        )
        ?.querySelectorAll(
            "[data-peer-id]"
        )
        .forEach(
            element => {

                element.remove();

            }
        );


    document
        .getElementById(
            "call-modal"
        )
        ?.classList.remove(
            "open"
        );


    updateCallParticipantCount();

}


/* =========================================================
   MODALS
========================================================= */

function initModals() {

    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            button.dataset.closeModal
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(
            overlay => {

                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target !==
                            overlay
                        ) {

                            return;

                        }


                        if (
                            overlay.id ===
                            "call-modal"
                        ) {

                            closeVideoCall();

                        } else {

                            closeModal(
                                overlay.id
                            );

                        }

                    }
                );

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;

            }


            const callModal =
                document.getElementById(
                    "call-modal"
                );


            if (
                callModal?.classList.contains(
                    "open"
                )
            ) {

                closeVideoCall();

            }


            closeModal(
                "online-modal"
            );


            closeModal(
                "profile-modal"
            );

        }
    );

}


function openModal(
    id
) {

    document
        .getElementById(
            id
        )
        ?.classList.add(
            "open"
        );

}


function closeModal(
    id
) {

    document
        .getElementById(
            id
        )
        ?.classList.remove(
            "open"
        );

}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    document
        .getElementById(
            "header-online-button"
        )
        ?.addEventListener(
            "click",
            openOnlinePlayers
        );


    document
        .getElementById(
            "hero-online-button"
        )
        ?.addEventListener(
            "click",
            openOnlinePlayers
        );


    document
        .getElementById(
            "hero-games-button"
        )
        ?.addEventListener(
            "click",
            () => {

                openPage(
                    "games"
                );

            }
        );


    document
        .getElementById(
            "header-profile-button"
        )
        ?.addEventListener(
            "click",
            openProfile
        );


    document
        .getElementById(
            "profile-edit-button"
        )
        ?.addEventListener(
            "click",
            openProfile
        );


    document
        .getElementById(
            "youtube-button"
        )
        ?.addEventListener(
            "click",
            () => {

                window.open(
                    "https://www.youtube.com/",
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


    document
        .getElementById(
            "twitch-button"
        )
        ?.addEventListener(
            "click",
            () => {

                window.open(
                    "https://www.twitch.tv/",
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


    document
        .getElementById(
            "right-youtube-button"
        )
        ?.addEventListener(
            "click",
            () => {

                window.open(
                    "https://www.youtube.com/",
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


    document
        .getElementById(
            "right-twitch-button"
        )
        ?.addEventListener(
            "click",
            () => {

                window.open(
                    "https://www.twitch.tv/",
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


    document
        .getElementById(
            "logout-button"
        )
        ?.addEventListener(
            "click",
            logoutUser
        );


    document
        .getElementById(
            "call-mic-button"
        )
        ?.addEventListener(
            "click",
            toggleMicrophone
        );


    document
        .getElementById(
            "call-camera-button"
        )
        ?.addEventListener(
            "click",
            toggleCamera
        );


    document
        .getElementById(
            "call-screen-button"
        )
        ?.addEventListener(
            "click",
            toggleScreenShare
        );


    document
        .getElementById(
            "call-leave-button"
        )
        ?.addEventListener(
            "click",
            closeVideoCall
        );


    document
        .getElementById(
            "call-close-x"
        )
        ?.addEventListener(
            "click",
            closeVideoCall
        );

}


/* =========================================================
   CLEANUP
========================================================= */

async function cleanupGlobalPresence() {

    if (
        !onlinePresenceChannel
    ) {

        return;

    }


    try {

        await supabaseClient
            .removeChannel(
                onlinePresenceChannel
            );

    } catch (error) {

        console.warn(
            "Presence cleanup:",
            error
        );

    }


    onlinePresenceChannel =
        null;


    onlinePlayers =
        [];

}


async function removeChatChannel() {

    if (!chatChannel) {

        return;

    }


    try {

        await supabaseClient
            .removeChannel(
                chatChannel
            );

    } catch (error) {

        console.warn(
            "Chat cleanup:",
            error
        );

    }


    chatChannel =
        null;

}


async function cleanupRealtime() {

    await closeVideoCall();

    await removeChatChannel();

    await cleanupGlobalPresence();

}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

    await cleanupRealtime();


    const {
        error
    } =
        await supabaseClient
            .auth
            .signOut();


    if (error) {

        console.error(
            "Logout:",
            error
        );

    }


    currentUser =
        null;


    currentSession =
        null;


    profileData = {

        nickname:
            "Player",

        status:
            "Онлайн"

    };


    showAuthScreen();

}


/* =========================================================
   AUTH UI
========================================================= */

function showAuthScreen() {

    appShell?.classList.remove(
        "visible"
    );


    if (authScreen) {

        authScreen.style.display =
            "flex";

    }

}


function showAuthMessage(
    message,
    type = ""
) {

    if (!authMessage) {

        console.error(
            message
        );

        return;

    }


    authMessage.textContent =
        message;


    authMessage.className =
        "auth-message";


    if (type) {

        authMessage.classList.add(
            type
        );

    }

}


function clearAuthMessage() {

    if (!authMessage) {

        return;

    }


    authMessage.textContent =
        "";


    authMessage.className =
        "auth-message";

}


function setAuthLoading(
    form,
    loading
) {

    if (!form) {

        return;

    }


    const button =
        form.querySelector(
            "button[type='submit']"
        );


    if (!button) {

        return;

    }


    if (loading) {

        button.disabled =
            true;


        button.dataset.originalText =
            button.innerHTML;


        button.innerHTML =
            "Подождите...";

    } else {

        button.disabled =
            false;


        button.innerHTML =
            button.dataset.originalText ||
            "Продолжить";

    }

}


/* =========================================================
   MODAL MESSAGE
========================================================= */

function showModalMessage(
    message,
    type = ""
) {

    const element =
        document.getElementById(
            "profile-message"
        );


    if (!element) {

        return;

    }


    element.textContent =
        message;


    element.className =
        "modal-message";


    if (type) {

        element.classList.add(
            type
        );

    }

}


/* =========================================================
   CALL MESSAGE
========================================================= */

function setCallStatus(
    message
) {

    const element =
        document.getElementById(
            "call-status"
        );


    if (element) {

        element.textContent =
            message;

    }

}


function setCallMessage(
    message
) {

    const element =
        document.getElementById(
            "call-message"
        );


    if (element) {

        element.textContent =
            message;

    }

}


/* =========================================================
   ERROR
========================================================= */

function translateSupabaseError(
    error
) {

    const raw =
        String(
            error?.message ||
            ""
        );


    const text =
        raw.toLowerCase();


    if (
        text.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "Неверный email или пароль."
        );

    }


    if (
        text.includes(
            "email not confirmed"
        )
    ) {

        return (
            "Email ещё не подтверждён."
        );

    }


    if (
        text.includes(
            "user already registered"
        )
    ) {

        return (
            "Пользователь с таким email уже зарегистрирован."
        );

    }


    if (
        text.includes(
            "rate limit"
        )
    ) {

        return (
            "Слишком много запросов. Попробуйте позже."
        );

    }


    if (
        text.includes(
            "infinite recursion"
        )
    ) {

        return (
            "Ошибка политики безопасности профиля Supabase. Выполните исправление RLS для profiles."
        );

    }


    if (
        text.includes(
            "row-level security"
        )
    ) {

        return (
            "Supabase заблокировал операцию с профилем. Проверьте RLS таблицы profiles."
        );

    }


    return (
        raw ||
        "Произошла ошибка."
    );

}


/* =========================================================
   HELPERS
========================================================= */

function formatTime(
    value
) {

    if (!value) {

        return "";

    }


    return new Date(
        value
    ).toLocaleTimeString(
        "ru-RU",
        {

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}


function scrollChatToBottom() {

    const list =
        document.getElementById(
            "chat-message-list"
        );


    if (list) {

        list.scrollTop =
            list.scrollHeight;

    }

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   VERSION
========================================================= */

function updateVersion() {

    document
        .querySelectorAll(
            ".site-version"
        )
        .forEach(
            element => {

                element.textContent =
                    `v${APP_VERSION}`;

            }
        );

}


/* =========================================================
   PUBLIC API
========================================================= */

window.GamePlatform = {

    getUser() {

        return currentUser;

    },


    getSession() {

        return currentSession;

    },


    openProfile,


    openOnlinePlayers,


    openVideoCall,


    logout:
        logoutUser

};
```
