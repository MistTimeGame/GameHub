/* =========================================================
   GAME PLATFORM
   AUTH + PRESENCE + CHAT + WEBRTC
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";


/* =========================================================
   APP
========================================================= */

const APP_VERSION = "1.7.0";


let supabaseClient = null;

let currentUser = null;

let currentSession = null;

let currentPage = "home";


/* =========================================================
   PROFILE
========================================================= */

let profileData = {
    nickname: "Player",
    status: "Онлайн"
};


/* =========================================================
   PRESENCE
========================================================= */

let onlinePresenceChannel = null;

let onlinePlayers = [];

const presenceKey =
    typeof crypto !== "undefined" &&
    crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;


/* =========================================================
   CHAT
========================================================= */

let chatRooms = [];

let activeChatRoom = null;

let chatChannel = null;

const profileCache = new Map();


/* =========================================================
   WEBRTC
========================================================= */

let callChannel = null;

let callRoom = null;

let callSessionId = null;

let localMediaStream = null;

let screenMediaStream = null;

let callPeers = new Map();

let callPresenceUsers = new Map();

let pendingIceCandidates = new Map();

let sentOffers = new Set();

let callIsClosing = false;


/*
   STUN нужен для первичного ICE discovery.
   Для production-конференции желательно добавить
   свой TURN-сервер.
*/

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
    document.getElementById("auth-screen");

const appShell =
    document.getElementById("app-shell");

const loginTab =
    document.getElementById("login-tab");

const registerTab =
    document.getElementById("register-tab");

const loginForm =
    document.getElementById("login-form");

const registerForm =
    document.getElementById("register-form");

const authTitle =
    document.getElementById("auth-title");

const authSubtitle =
    document.getElementById("auth-subtitle");

const authMessage =
    document.getElementById("auth-message");


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
            typeof window.supabase.createClient !== "function"
        ) {

            showAuthMessage(
                "Не удалось загрузить Supabase.",
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
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    }
                );

        } catch (error) {

            console.error(
                error
            );

            showAuthMessage(
                "Не удалось подключить Supabase.",
                "error"
            );

            return;
        }


        subscribeToAuthChanges();

        await loadInitialSession();

    }
);


/* =========================================================
   AUTH
========================================================= */

async function loadInitialSession() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            error
        );

        showAuthMessage(
            "Ошибка загрузки сессии.",
            "error"
        );

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


function subscribeToAuthChanges() {

    supabaseClient.auth.onAuthStateChange(
        (
            event,
            session
        ) => {

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

    loginTab.addEventListener(
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


    registerTab.addEventListener(
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

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await loginUser();

        }
    );


    registerForm.addEventListener(
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
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveProfile();

            }
        );

}


async function loginUser() {

    const email =
        document
            .getElementById(
                "login-email"
            )
            .value
            .trim();


    const password =
        document
            .getElementById(
                "login-password"
            )
            .value;


    setAuthLoading(
        loginForm,
        true
    );


    const {
        data,
        error
    } =
        await supabaseClient.auth.signInWithPassword({

            email,
            password

        });


    setAuthLoading(
        loginForm,
        false
    );


    if (error) {

        showAuthMessage(
            translateSupabaseError(error),
            "error"
        );

        return;
    }


    currentSession =
        data.session;

    currentUser =
        data.user;


    await enterApplication();

}


async function registerUser() {

    const nickname =
        document
            .getElementById(
                "register-nickname"
            )
            .value
            .trim();


    const email =
        document
            .getElementById(
                "register-email"
            )
            .value
            .trim();


    const password =
        document
            .getElementById(
                "register-password"
            )
            .value;


    const confirmPassword =
        document
            .getElementById(
                "register-password-confirm"
            )
            .value;


    if (nickname.length < 3) {

        showAuthMessage(
            "Никнейм слишком короткий.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showAuthMessage(
            "Пароль должен содержать минимум 6 символов.",
            "error"
        );

        return;
    }


    if (password !== confirmPassword) {

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


    const redirectUrl =
        window.location.origin +
        window.location.pathname;


    const {
        data,
        error
    } =
        await supabaseClient.auth.signUp({

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


    setAuthLoading(
        registerForm,
        false
    );


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

        showAuthMessage(
            "Аккаунт создан. Подтвердите email через письмо.",
            "success"
        );

        registerForm.reset();

        return;
    }


    currentSession =
        data.session;

    currentUser =
        data.user;


    await enterApplication();

}


/* =========================================================
   ENTER APP
========================================================= */

async function enterApplication() {

    if (!currentUser) {

        showAuthScreen();

        return;
    }


    authScreen.style.display =
        "none";


    appShell.classList.add(
        "visible"
    );


    await ensureProfile();

    applyProfile();

    renderPage(
        currentPage
    );

    await initOnlinePresence();

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


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .upsert(
                {
                    id:
                        currentUser.id,

                    nickname,

                    status

                },
                {
                    onConflict:
                        "id"
                }
            )
            .select()
            .single();


    if (!error && data) {

        profileData = data;

    } else {

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


    document.getElementById(
        "header-nickname"
    ).textContent =
        nickname;


    document.getElementById(
        "profile-nickname"
    ).textContent =
        nickname;


    document.getElementById(
        "header-status"
    ).textContent =
        status;


    document.getElementById(
        "profile-status"
    ).textContent =
        status;


    document.getElementById(
        "header-avatar"
    ).textContent =
        letter;


    document.getElementById(
        "profile-avatar"
    ).textContent =
        letter;

}


function openProfile() {

    document.getElementById(
        "profile-nickname-input"
    ).value =
        getUserNickname();


    document.getElementById(
        "profile-status-input"
    ).value =
        getUserStatus();


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
            .value
            .trim();


    const status =
        document
            .getElementById(
                "profile-status-input"
            )
            .value
            .trim() ||
        "Онлайн";


    const message =
        document.getElementById(
            "profile-message"
        );


    if (nickname.length < 3) {

        message.textContent =
            "Минимум 3 символа.";

        message.className =
            "modal-message error";

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient.auth.updateUser({

            data: {

                nickname,

                status

            }

        });


    if (error) {

        message.textContent =
            translateSupabaseError(
                error
            );

        message.className =
            "modal-message error";

        return;
    }


    currentUser =
        data.user;


    const {
        data: profile
    } =
        await supabaseClient
            .from("profiles")
            .upsert(
                {
                    id:
                        currentUser.id,

                    nickname,

                    status,

                    updated_at:
                        new Date().toISOString()

                },
                {
                    onConflict:
                        "id"
                }
            )
            .select()
            .single();


    if (profile) {

        profileData =
            profile;

    } else {

        profileData = {
            nickname,
            status
        };

    }


    applyProfile();

    await updatePresence();

    renderOnlinePlayers();


    message.textContent =
        "Профиль сохранён.";

    message.className =
        "modal-message success";


    setTimeout(
        () => {

            closeModal(
                "profile-modal"
            );

        },
        700
    );

}


/* =========================================================
   ONLINE PRESENCE
========================================================= */

async function initOnlinePresence() {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return;
    }


    await cleanupOnlinePresence();


    await supabaseClient.realtime.setAuth();


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

            updateOnlineFromPresence();

        }
    );


    onlinePresenceChannel.on(
        "presence",
        {
            event:
                "join"
        },
        () => {

            updateOnlineFromPresence();

        }
    );


    onlinePresenceChannel.on(
        "presence",
        {
            event:
                "leave"
        },
        () => {

            updateOnlineFromPresence();

        }
    );


    onlinePresenceChannel.subscribe(
        async status => {

            if (
                status === "SUBSCRIBED"
            ) {

                await updatePresence();

            }

        }
    );

}


async function updatePresence() {

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
            "Presence track error:",
            error
        );

    }

}


function updateOnlineFromPresence() {

    if (!onlinePresenceChannel) {
        return;
    }


    const state =
        onlinePresenceChannel.presenceState();


    const uniqueUsers =
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


                    uniqueUsers.set(
                        entry.user_id,
                        entry
                    );

                }
            );

        }
    );


    onlinePlayers =
        Array.from(
            uniqueUsers.values()
        );


    const count =
        onlinePlayers.length;


    document.getElementById(
        "online-header-count"
    ).textContent =
        count;


    document.getElementById(
        "online-side-count"
    ).textContent =
        count;


    document.getElementById(
        "hero-online-count"
    ).textContent =
        count;


    document.getElementById(
        "online-modal-count"
    ).textContent =
        count;


    renderOnlinePlayers();

}


function renderOnlinePlayers() {

    const container =
        document.getElementById(
            "online-player-list"
        );


    if (!container) {
        return;
    }


    if (!onlinePlayers.length) {

        container.innerHTML = `
            <div class="chat-empty">
                Сейчас никто не онлайн.
            </div>
        `;

        return;
    }


    container.innerHTML =
        onlinePlayers
            .map(
                user => {

                    const nickname =
                        user.nickname ||
                        "Player";

                    const letter =
                        nickname
                            .charAt(0)
                            .toUpperCase();


                    return `
                        <div class="online-player">

                            <div class="online-player-avatar">
                                ${escapeHtml(letter)}
                            </div>

                            <div class="online-player-copy">

                                <strong>
                                    ${escapeHtml(nickname)}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        user.status || "Онлайн"
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
                    () => {

                        openPage(
                            tile.dataset.page
                        );

                    }
                );

            }
        );

}


async function openPage(page) {

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


    await updatePresence();

}


function renderPage(page) {

    const pageConfig = {

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
                                Выбирайте игру и переходите
                                в её игровое сообщество.
                            </p>

                        </div>

                    </article>


                    <article class="info-card">

                        <div class="info-card-icon">
                            ◎
                        </div>

                        <div>

                            <strong>
                                Игроки
                            </strong>

                            <p>
                                Онлайн отображается
                                через Supabase Realtime.
                            </p>

                        </div>

                    </article>


                    <article class="info-card">

                        <div class="info-card-icon">
                            ◌
                        </div>

                        <div>

                            <strong>
                                Общение
                            </strong>

                            <p>
                                Глобальные, игровые и
                                гильдейские комнаты.
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
                                Формируем список
                                игровых сообществ.
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
                                Новости сообщества
                            </strong>

                            <p>
                                Здесь позже появится
                                полноценная лента.
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
                                Нажмите кнопку
                                «Онлайн» сверху,
                                чтобы открыть список.
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

        }

    };


    if (page === "chat") {

        pageConfig.chat = {

            kicker:
                "COMMUNITY",

            title:
                "Чат",

            badge:
                "REALTIME",

            content: getChatPageHtml()

        };

    }


    const config =
        pageConfig[page] ||
        pageConfig.home;


    document.getElementById(
        "page-kicker"
    ).textContent =
        config.kicker;


    document.getElementById(
        "page-title"
    ).textContent =
        config.title;


    document.getElementById(
        "page-badge"
    ).textContent =
        config.badge;


    document.getElementById(
        "page-content"
    ).innerHTML =
        config.content;


    if (page === "chat") {

        initChatPage();

    }


    if (page === "games") {

        loadGamesPage();

    }

}


/* =========================================================
   GAMES
========================================================= */

async function loadGamesPage() {

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
                    ascending: true
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
                        Когда игра будет добавлена
                        в базу, её чат будет создан
                        автоматически.
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

                            <div class="game-card-footer">

                                <span>
                                    ${escapeHtml(
                                        game.slug
                                    )}
                                </span>

                                <button
                                    type="button"
                                    class="game-chat-link"
                                    data-game-id="${game.id}"
                                >
                                    Открыть чат
                                </button>

                            </div>

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
   GAME CHAT
========================================================= */

async function openGameChat(
    gameId
) {

    const room =
        chatRooms.find(
            item =>
                item.game_id === gameId &&
                item.type === "game"
        );


    if (room) {

        await openPage(
            "chat"
        );

        await selectChatRoom(
            room.id
        );

        return;
    }


    await loadChatRooms();


    const refreshedRoom =
        chatRooms.find(
            item =>
                item.game_id === gameId &&
                item.type === "game"
        );


    if (refreshedRoom) {

        await openPage(
            "chat"
        );

        await selectChatRoom(
            refreshedRoom.id
        );

    }

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
                >
                </div>

            </aside>


            <section class="chat-main">


                <header class="chat-header">

                    <div class="chat-header-copy">

                        <strong id="chat-room-title">
                            Выберите комнату
                        </strong>

                        <span id="chat-room-subtitle">
                            Realtime chat
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
                        rows="1"
                        maxlength="4000"
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
   CHAT PAGE INIT
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


    const callButton =
        document.getElementById(
            "chat-call-button"
        );


    if (form) {

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await sendChatMessage();

            }
        );

    }


    if (input) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    form.requestSubmit();

                }

            }
        );

    }


    if (callButton) {

        callButton.addEventListener(
            "click",
            async () => {

                if (!activeChatRoom) {

                    setCallMessage(
                        "Сначала выберите чат."
                    );

                    return;
                }


                await openCall(
                    activeChatRoom
                );

            }
        );

    }


    const searchInput =
        document.getElementById(
            "chat-room-search"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                renderChatRooms(
                    searchInput.value
                );

            }
        );

    }


    loadChatRooms();

}


/* =========================================================
   LOAD CHAT ROOMS
========================================================= */

async function loadChatRooms() {

    const container =
        document.getElementById(
            "chat-room-list"
        );


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
                    ascending: true
                }
            );


    if (error) {

        if (container) {

            container.innerHTML = `
                <div class="chat-empty">

                    Не удалось загрузить комнаты.

                    <br><br>

                    Выполни SQL из инструкции
                    в Supabase SQL Editor.

                </div>
            `;

        }

        return;
    }


    chatRooms =
        data || [];


    renderChatRooms();


    if (!activeChatRoom && chatRooms.length) {

        const globalRoom =
            chatRooms.find(
                room =>
                    room.type === "global"
            );


        await selectChatRoom(
            (
                globalRoom ||
                chatRooms[0]
            ).id
        );

    }


    if (
        activeChatRoom &&
        !chatRooms.some(
            room =>
                room.id === activeChatRoom.id
        )
    ) {

        await selectChatRoom(
            chatRooms[0]?.id
        );

    }

}


/* =========================================================
   RENDER ROOMS
========================================================= */

function renderChatRooms(
    searchText = ""
) {

    const container =
        document.getElementById(
            "chat-room-list"
        );


    if (!container) {
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
                    room.name
                        .toLowerCase()
                        .includes(query)
                    ||
                    room.type
                        .toLowerCase()
                        .includes(query)
                );

            }
        );


    container.innerHTML =
        rooms
            .map(
                room => {

                    const icon =
                        room.type === "global"
                            ? "◎"
                            : room.type === "game"
                                ? "◈"
                                : "♜";


                    const typeLabel =
                        room.type === "global"
                            ? "GLOBAL"
                            : room.type === "game"
                                ? "GAME"
                                : "GUILD";


                    return `
                        <button
                            type="button"
                            class="chat-room-button ${
                                activeChatRoom &&
                                activeChatRoom.id === room.id
                                    ? "active"
                                    : ""
                            }"
                            data-room-id="${room.id}"
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
                                    ${typeLabel}
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


    container
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
                item.id === roomId
        );


    if (!room) {
        return;
    }


    activeChatRoom =
        room;


    renderChatRooms();


    document.getElementById(
        "chat-room-title"
    ).textContent =
        room.name;


    document.getElementById(
        "chat-room-subtitle"
    ).textContent =
        room.type === "global"
            ? "Все пользователи платформы"
            : room.type === "game"
                ? "Игровой чат"
                : "Чат гильдии";


    await subscribeToChatRoom(
        room
    );


    await loadChatHistory(
        room.id
    );


    const input =
        document.getElementById(
            "chat-input"
        );


    if (input) {
        input.focus();
    }

}


/* =========================================================
   CHAT REALTIME
========================================================= */

async function subscribeToChatRoom(
    room
) {

    await removeChatChannel();


    await supabaseClient.realtime.setAuth();


    chatChannel =
        supabaseClient.channel(
            `chat:${room.id}`,
            {
                config: {

                    private: true,

                    broadcast: {

                        ack: true,

                        self: false

                    }

                }
            }
        );


    chatChannel.on(
        "broadcast",
        {
            event: "INSERT"
        },
        async payload => {

            const record =
                payload &&
                payload.payload &&
                payload.payload.record;


            if (
                !record ||
                record.room_id !== room.id
            ) {
                return;
            }


            await addLiveChatMessage(
                record
            );

        }
    );


    chatChannel.subscribe(
        status => {

            if (
                status === "SUBSCRIBED"
            ) {

                console.log(
                    "Chat subscribed:",
                    room.id
                );

            }

        }
    );

}


/* =========================================================
   CHAT HISTORY
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
                    ascending: true
                }
            )
            .limit(200);


    if (error) {

        list.innerHTML = `
            <div class="chat-empty">

                Ошибка загрузки сообщений:

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
                message,
                false
            );

        }
    );


    scrollChatToBottom();

}


/* =========================================================
   LIVE MESSAGE
========================================================= */

async function addLiveChatMessage(
    record
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
            `[data-message-id="${record.id}"]`
        )
    ) {
        return;
    }


    let message =
        profileCache.get(
            record.user_id
        );


    if (!message) {

        const {
            data
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


        message =
            data;

    }


    if (!message) {
        return;
    }


    appendChatMessage(
        message,
        true
    );


    scrollChatToBottom();

}


/* =========================================================
   APPEND MESSAGE
========================================================= */

function appendChatMessage(
    message,
    isLive
) {

    const list =
        document.getElementById(
            "chat-message-list"
        );


    if (!list) {
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
        (
            message.user_id === currentUser?.id
                ? getUserNickname()
                : "Player"
        );


    profileCache.set(
        message.user_id,
        {
            nickname
        }
    );


    const own =
        message.user_id === currentUser?.id;


    const letter =
        nickname
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "?";


    const time =
        formatTime(
            message.created_at
        );


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        `chat-message ${own ? "own" : ""}`;


    wrapper.dataset.messageId =
        message.id;


    wrapper.innerHTML = `

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
                ${escapeHtml(nickname)}
            </div>

            <div class="chat-message-text">
                ${escapeHtml(message.body)}
            </div>

            <div class="chat-message-meta">
                ${time}
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
        wrapper
    );


    if (isLive) {

        wrapper.animate(
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
                duration: 220,
                easing: "ease-out"
            }
        );

    }

}


/* =========================================================
   SEND CHAT
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
            .from("chat_messages")
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
   VIDEO CALL
========================================================= */

async function openCall(
    room
) {

    if (
        callChannel ||
        callSessionId
    ) {
        return;
    }


    callRoom =
        room;

    callSessionId =
        crypto.randomUUID();

    callIsClosing =
        false;


    document.getElementById(
        "call-room-title"
    ).textContent =
        room.name;


    document.getElementById(
        "call-status"
    ).textContent =
        "Запрашиваем камеру и микрофон...";


    document.getElementById(
        "call-modal"
    ).classList.add(
        "open"
    );


    try {

        await prepareLocalMedia();

        await initCallChannel();

        setCallStatus(
            "Вы подключены к конференции."
        );

    } catch (error) {

        console.error(
            "Call error:",
            error
        );

        setCallStatus(
            `Ошибка: ${error.message || "не удалось подключиться"}`
        );

    }

}


/* =========================================================
   LOCAL MEDIA
========================================================= */

async function prepareLocalMedia() {

    const localVideo =
        document.getElementById(
            "local-video"
        );


    try {

        localMediaStream =
            await navigator.mediaDevices.getUserMedia({

                video: true,

                audio: true

            });

    } catch (videoError) {

        console.warn(
            "Camera+microphone error:",
            videoError
        );


        try {

            localMediaStream =
                await navigator.mediaDevices.getUserMedia({

                    video: false,

                    audio: true

                });

        } catch (audioError) {

            console.warn(
                "Microphone error:",
                audioError
            );


            localMediaStream =
                new MediaStream();

        }

    }


    if (localVideo) {

        localVideo.srcObject =
            localMediaStream;

    }

}


/* =========================================================
   CALL CHANNEL
========================================================= */

async function initCallChannel() {

    await supabaseClient.realtime.setAuth();


    callChannel =
        supabaseClient.channel(
            `call:${callRoom.id}`,
            {

                config: {

                    private: true,

                    broadcast: {

                        ack: false,

                        self: false

                    },

                    presence: {

                        key:
                            callSessionId

                    }

                }

            }
        );


    callChannel.on(
        "broadcast",
        {
            event: "signal"
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
            event: "sync"
        },
        () => {

            syncCallParticipants();

        }
    );


    callChannel.on(
        "presence",
        {
            event: "join"
        },
        () => {

            syncCallParticipants();

        }
    );


    callChannel.on(
        "presence",
        {
            event: "leave"
        },
        payload => {

            const leftUser =
                payload?.key;


            if (leftUser) {

                removeCallPeer(
                    leftUser
                );

            }


            syncCallParticipants();

        }
    );


    callChannel.subscribe(
        async status => {

            if (
                status !== "SUBSCRIBED"
            ) {
                return;
            }


            await callChannel.track({

                user_id:
                    currentUser.id,

                nickname:
                    getUserNickname(),

                session_id:
                    callSessionId,

                joined_at:
                    new Date().toISOString()

            });


            syncCallParticipants();

        }
    );

}


/* =========================================================
   CALL PARTICIPANTS
========================================================= */

function syncCallParticipants() {

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
            [key, entries]
        ) => {

            const user =
                entries?.[0];


            if (
                !user ||
                user.session_id === callSessionId
            ) {
                return;
            }


            callPresenceUsers.set(
                user.session_id,
                {
                    ...user,
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


            await getOrCreatePeerConnection(
                peer
            );


            if (
                shouldOffer &&
                !sentOffers.has(
                    peer.session_id
                )
            ) {

                sentOffers.add(
                    peer.session_id
                );


                await createOfferForPeer(
                    peer
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
        ).pc;

    }


    const pc =
        new RTCPeerConnection({

            iceServers:
                ICE_SERVERS

        });


    /*
       Передаём локальные дорожки.
    */

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
        event => {

            if (
                event.candidate
            ) {

                sendCallSignal(
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

            }

        };


    pc.ontrack =
        event => {

            const stream =
                event.streams[0];


            if (stream) {

                attachRemoteStream(
                    peer,
                    stream
                );

            }

        };


    pc.onconnectionstatechange =
        () => {

            const state =
                pc.connectionState;


            if (
                state === "failed" ||
                state === "closed"
            ) {

                removeCallPeer(
                    peer.session_id
                );

            }

        };


    callPeers.set(
        peer.session_id,
        {
            pc,
            meta:
                peer
        }
    );


    return pc;

}


/* =========================================================
   OFFER
========================================================= */

async function createOfferForPeer(
    peer
) {

    const pc =
        await getOrCreatePeerConnection(
            peer
        );


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

                description:
                    pc.localDescription

            }
        );

    } catch (error) {

        console.error(
            "Offer error:",
            error
        );

    }

}


/* =========================================================
   WEBRTC SIGNAL
========================================================= */

async function handleWebRTCSignal(
    signal
) {

    if (
        !signal ||
        signal.to !== callSessionId
    ) {
        return;
    }


    const peer =
        callPresenceUsers.get(
            signal.from
        );


    if (!peer) {
        return;
    }


    const pc =
        await getOrCreatePeerConnection(
            peer
        );


    try {

        if (
            signal.type === "offer"
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

                    description:
                        pc.localDescription

                }
            );


            return;

        }


        if (
            signal.type === "answer"
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
            signal.type === "ice"
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
                    .get(signal.from)
                    .push(
                        signal.candidate
                    );

            }

        }

    } catch (error) {

        console.error(
            "WebRTC signaling error:",
            error
        );

    }

}


/* =========================================================
   ICE QUEUE
========================================================= */

async function flushPendingIce(
    peerId,
    pc
) {

    const candidates =
        pendingIceCandidates.get(
            peerId
        );


    if (!candidates) {
        return;
    }


    for (
        const candidate
        of candidates
    ) {

        try {

            await pc.addIceCandidate(
                candidate
            );

        } catch (error) {

            console.warn(
                "ICE candidate error:",
                error
            );

        }

    }


    pendingIceCandidates.delete(
        peerId
    );

}


/* =========================================================
   SIGNAL
========================================================= */

async function sendCallSignal(
    payload
) {

    if (!callChannel) {
        return;
    }


    try {

        await callChannel.send({

            type:
                "broadcast",

            event:
                "signal",

            payload

        });

    } catch (error) {

        console.error(
            "Signal send error:",
            error
        );

    }

}


/* =========================================================
   REMOTE VIDEO
========================================================= */

function attachRemoteStream(
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
   REMOVE PEER
========================================================= */

function removeCallPeer(
    peerId
) {

    const peer =
        callPeers.get(
            peerId
        );


    if (peer) {

        try {
            peer.pc.close();
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
   COUNT
========================================================= */

function updateCallParticipantCount() {

    const count =
        callSessionId
            ? callPresenceUsers.size + 1
            : 0;


    const element =
        document.getElementById(
            "call-participant-count"
        );


    if (element) {

        element.textContent =
            count;

    }

}


/* =========================================================
   MICROPHONE
========================================================= */

function toggleMicrophone() {

    if (!localMediaStream) {
        return;
    }


    const tracks =
        localMediaStream
            .getAudioTracks();


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


    const button =
        document.getElementById(
            "call-mic-button"
        );


    button.classList.toggle(
        "active",
        enabled
    );


    setCallMessage(
        enabled
            ? "Микрофон включён."
            : "Микрофон выключен."
    );

}


/* =========================================================
   CAMERA
========================================================= */

function toggleCamera() {

    if (!localMediaStream) {
        return;
    }


    const tracks =
        localMediaStream
            .getVideoTracks();


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


    const button =
        document.getElementById(
            "call-camera-button"
        );


    button.classList.toggle(
        "active",
        enabled
    );


    setCallMessage(
        enabled
            ? "Камера включена."
            : "Камера выключена."
    );

}


/* =========================================================
   SCREEN SHARE
========================================================= */

async function toggleScreenShare() {

    if (screenMediaStream) {

        stopScreenShare();

        return;
    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getDisplayMedia
    ) {

        setCallMessage(
            "Браузер не поддерживает демонстрацию экрана."
        );

        return;
    }


    try {

        screenMediaStream =
            await navigator.mediaDevices.getDisplayMedia({

                video: true,

                audio: false

            });


        const screenTrack =
            screenMediaStream.getVideoTracks()[0];


        const localVideo =
            document.getElementById(
                "local-video"
            );


        if (localVideo) {

            localVideo.srcObject =
                screenMediaStream;

        }


        for (
            const peer
            of callPeers.values()
        ) {

            const sender =
                peer.pc
                    .getSenders()
                    .find(
                        item =>
                            item.track &&
                            item.track.kind === "video"
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
            .classList.add(
                "active"
            );


        setCallMessage(
            "Вы демонстрируете экран."
        );

    } catch (error) {

        console.warn(
            "Screen share cancelled:",
            error
        );

        screenMediaStream =
            null;

    }

}


/* =========================================================
   STOP SCREEN
========================================================= */

async function stopScreenShare() {

    if (!screenMediaStream) {
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
            ? localMediaStream
                .getVideoTracks()[0]
            : null;


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
        const peer
        of callPeers.values()
    ) {

        const sender =
            peer.pc
                .getSenders()
                .find(
                    item =>
                        item.track &&
                        item.track.kind === "video"
                );


        if (sender) {

            try {

                await sender.replaceTrack(
                    cameraTrack || null
                );

            } catch {}

        }

    }


    document
        .getElementById(
            "call-screen-button"
        )
        .classList.remove(
            "active"
        );


    setCallMessage(
        "Демонстрация экрана остановлена."
    );

}


/* =========================================================
   CLOSE CALL
========================================================= */

async function closeCall() {

    if (callIsClosing) {
        return;
    }


    callIsClosing =
        true;


    try {

        if (screenMediaStream) {

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


        if (localMediaStream) {

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
            peer => {

                try {
                    peer.pc.close();
                } catch {}

            }
        );


        callPeers.clear();

        callPresenceUsers.clear();

        pendingIceCandidates.clear();

        sentOffers.clear();


        if (callChannel) {

            await supabaseClient
                .removeChannel(
                    callChannel
                );

        }

    } finally {

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


        document.getElementById(
            "call-video-grid"
        ).querySelectorAll(
            "[data-peer-id]"
        ).forEach(
            element => {
                element.remove();
            }
        );


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
                "call-modal"
            )
            .classList.remove(
                "open"
            );


        updateCallParticipantCount();


        callIsClosing =
            false;

    }

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
                            event.target ===
                            overlay
                        ) {

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
                event.key === "Escape"
            ) {

                closeModal(
                    "online-modal"
                );

                closeModal(
                    "profile-modal"
                );

            }

        }
    );

}


function openModal(id) {

    document
        .getElementById(id)
        ?.classList.add(
            "open"
        );

}


function closeModal(id) {

    document
        .getElementById(id)
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
        .addEventListener(
            "click",
            () => {

                renderOnlinePlayers();

                document.getElementById(
                    "online-modal-count"
                ).textContent =
                    onlinePlayers.length;

                openModal(
                    "online-modal"
                );

            }
        );


    document
        .getElementById(
            "hero-online-button"
        )
        .addEventListener(
            "click",
            () => {

                renderOnlinePlayers();

                document.getElementById(
                    "online-modal-count"
                ).textContent =
                    onlinePlayers.length;

                openModal(
                    "online-modal"
                );

            }
        );


    document
        .getElementById(
            "hero-games-button"
        )
        .addEventListener(
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
        .addEventListener(
            "click",
            openProfile
        );


    document
        .getElementById(
            "profile-edit-button"
        )
        .addEventListener(
            "click",
            openProfile
        );


    document
        .getElementById(
            "youtube-button"
        )
        .addEventListener(
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
        .addEventListener(
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
        .addEventListener(
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
        .addEventListener(
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
        .addEventListener(
            "click",
            logoutUser
        );


    document
        .getElementById(
            "call-mic-button"
        )
        .addEventListener(
            "click",
            toggleMicrophone
        );


    document
        .getElementById(
            "call-camera-button"
        )
        .addEventListener(
            "click",
            toggleCamera
        );


    document
        .getElementById(
            "call-screen-button"
        )
        .addEventListener(
            "click",
            toggleScreenShare
        );


    document
        .getElementById(
            "call-leave-button"
        )
        .addEventListener(
            "click",
            closeCall
        );


    document
        .getElementById(
            "call-close-x"
        )
        .addEventListener(
            "click",
            closeCall
        );

}


/* =========================================================
   CLEANUP
========================================================= */

async function cleanupOnlinePresence() {

    if (!onlinePresenceChannel) {
        return;
    }


    try {

        await supabaseClient
            .removeChannel(
                onlinePresenceChannel
            );

    } catch (error) {

        console.warn(
            error
        );

    }


    onlinePresenceChannel =
        null;

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
            error
        );

    }


    chatChannel =
        null;

}


async function cleanupRealtime() {

    await closeCall();

    await removeChatChannel();

    await cleanupOnlinePresence();

}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

    await cleanupRealtime();


    const {
        error
    } =
        await supabaseClient.auth.signOut();


    if (error) {

        console.error(
            error
        );

        return;
    }


    currentUser =
        null;

    currentSession =
        null;


    showAuthScreen();

}


/* =========================================================
   CALL MESSAGE
========================================================= */

function setCallStatus(
    text
) {

    const element =
        document.getElementById(
            "call-status"
        );


    if (element) {

        element.textContent =
            text;

    }

}


function setCallMessage(
    text
) {

    const element =
        document.getElementById(
            "call-message"
        );


    if (element) {

        element.textContent =
            text;

    }

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


    const date =
        new Date(
            value
        );


    return date.toLocaleTimeString(
        "ru-RU",
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

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


function scrollChatToBottom() {

    const list =
        document.getElementById(
            "chat-message-list"
        );


    if (!list) {
        return;
    }


    list.scrollTop =
        list.scrollHeight;

}


/* =========================================================
   AUTH UI
========================================================= */

function showAuthScreen() {

    appShell.classList.remove(
        "visible"
    );

    authScreen.style.display =
        "flex";

}


function showAuthMessage(
    message,
    type = ""
) {

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

    authMessage.textContent =
        "";

    authMessage.className =
        "auth-message";

}


function setAuthLoading(
    form,
    loading
) {

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

        button.dataset.original =
            button.innerHTML;

        button.innerHTML =
            "<span>Подождите...</span>";

    } else {

        button.disabled =
            false;

        button.innerHTML =
            button.dataset.original ||
            "<span>Продолжить</span>";

    }

}


/* =========================================================
   AUTH ERROR
========================================================= */

function translateSupabaseError(
    error
) {

    const text =
        String(
            error?.message ||
            ""
        );


    const lower =
        text.toLowerCase();


    if (
        lower.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "Неверный email или пароль."
        );

    }


    if (
        lower.includes(
            "email not confirmed"
        )
    ) {

        return (
            "Email ещё не подтверждён."
        );

    }


    if (
        lower.includes(
            "user already registered"
        )
    ) {

        return (
            "Пользователь с таким email уже существует."
        );

    }


    return (
        text ||
        "Произошла ошибка."
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
   PUBLIC
========================================================= */

window.GamePlatform = {

    getUser() {
        return currentUser;
    },

    getSession() {
        return currentSession;
    },

    openProfile,

    openOnlinePlayers() {

        renderOnlinePlayers();

        openModal(
            "online-modal"
        );

    },

    openCall,

    logout:
        logoutUser

};
