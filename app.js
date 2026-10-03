"use strict";


/* =========================================================
   GAME PLATFORM
   AUTH
   PROFILE
   VIP
   PRESENCE
   CHAT
   WEBRTC CONFERENCE
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";

const APP_VERSION =
    "1.8.0";


/* =========================================================
   GLOBAL STATE
========================================================= */

let supabaseClient = null;

let currentUser = null;

let currentSession = null;

let currentPage = "home";

let applicationStarted = false;

let profileData = {
    nickname: "Player",
    status: "Онлайн",
    age: null,
    city: "",
    about: "",
    avatar_url: "",
    vip_level: 0
};


/* =========================================================
   PRESENCE
========================================================= */

let presenceChannel = null;

let presenceUsers = [];


/* =========================================================
   CHAT
========================================================= */

let chatChannel = null;


/* =========================================================
   CONFERENCE
========================================================= */

let conferenceChannel = null;

let conferenceJoined = false;

let conferenceRoom = "global";

let localStream = null;

let screenStream = null;

let micEnabled = true;

let cameraEnabled = true;

let screenSharing = false;

let peerConnections = {};

let conferenceParticipants = {};


/* =========================================================
   DOM
========================================================= */

let authScreen = null;

let appShell = null;

let authTitle = null;

let authSubtitle = null;

let loginTab = null;

let registerTab = null;

let loginForm = null;

let registerForm = null;

let authMessage = null;

let loginEmail = null;

let loginPassword = null;

let registerNickname = null;

let registerEmail = null;

let registerPassword = null;

let registerPasswordConfirm = null;

let logoutButton = null;

let profileForm = null;

let profileNicknameInput = null;

let profileStatusInput = null;

let profileMessage = null;


/* =========================================================
   HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function setHidden(element, state) {

    if (!element) {
        return;
    }

    element.classList.toggle(
        "hidden",
        Boolean(state)
    );

}


function showAuthMessage(message, type) {

    if (!authMessage) {
        return;
    }

    authMessage.textContent =
        message || "";

    authMessage.className =
        "auth-message";

    if (type) {
        authMessage.classList.add(type);
    }

}


function showProfileMessage(message, type) {

    if (!profileMessage) {
        return;
    }

    profileMessage.textContent =
        message || "";

    profileMessage.className =
        "auth-message";

    if (type) {
        profileMessage.classList.add(type);
    }

}


/* =========================================================
   VERSION
========================================================= */

function updateVersion() {

    document
        .querySelectorAll(".site-version")
        .forEach(function (element) {

            element.textContent =
                "v" + APP_VERSION;

        });

}


/* =========================================================
   SUPABASE
========================================================= */

function initSupabase() {

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Supabase library is not loaded."
        );

        return false;
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


        window.supabaseClient =
            supabaseClient;


        window.gamePlatformSupabase =
            supabaseClient;


        return true;

    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );

        return false;

    }

}


/* =========================================================
   AUTH TABS
========================================================= */

function initAuthTabs() {

    if (loginTab) {

        loginTab.addEventListener(
            "click",
            function () {

                loginTab.classList.add(
                    "active"
                );

                if (registerTab) {

                    registerTab.classList.remove(
                        "active"
                    );

                }


                setHidden(
                    loginForm,
                    false
                );


                setHidden(
                    registerForm,
                    true
                );


                if (authTitle) {

                    authTitle.textContent =
                        "Добро пожаловать";

                }


                if (authSubtitle) {

                    authSubtitle.textContent =
                        "Войдите в свой игровой профиль";

                }


                showAuthMessage("");

            }
        );

    }


    if (registerTab) {

        registerTab.addEventListener(
            "click",
            function () {

                registerTab.classList.add(
                    "active"
                );


                if (loginTab) {

                    loginTab.classList.remove(
                        "active"
                    );

                }


                setHidden(
                    loginForm,
                    true
                );


                setHidden(
                    registerForm,
                    false
                );


                if (authTitle) {

                    authTitle.textContent =
                        "Создание аккаунта";

                }


                if (authSubtitle) {

                    authSubtitle.textContent =
                        "Создайте игровой профиль";

                }


                showAuthMessage("");

            }
        );

    }

}


/* =========================================================
   FORMS
========================================================= */

function initForms() {

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await loginUser();

            }
        );

    }


    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await registerUser();

            }
        );

    }


    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await saveProfile();

            }
        );

    }

}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser() {

    if (!supabaseClient) {

        showAuthMessage(
            "Supabase не подключён."
        );

        return;
    }


    const email =
        loginEmail
            ? loginEmail.value.trim()
            : "";


    const password =
        loginPassword
            ? loginPassword.value
            : "";


    if (!email || !password) {

        showAuthMessage(
            "Введите email и пароль."
        );

        return;
    }


    showAuthMessage(
        "Выполняется вход...",
        "info"
    );


    try {

        const result =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });


        if (result.error) {
            throw result.error;
        }


        currentSession =
            result.data.session || null;


        currentUser =
            result.data.user || null;


        if (currentUser) {

            await enterApplication();

        }

    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        let message =
            error &&
            error.message
                ? error.message
                : "Не удалось выполнить вход.";


        if (
            message
                .toLowerCase()
                .includes("invalid login credentials")
        ) {

            message =
                "Неверный email или пароль.";

        }


        showAuthMessage(
            message
        );

    }

}


/* =========================================================
   REGISTER
========================================================= */

async function registerUser() {

    if (!supabaseClient) {

        showAuthMessage(
            "Supabase не подключён."
        );

        return;
    }


    const nickname =
        registerNickname
            ? registerNickname.value.trim()
            : "";


    const email =
        registerEmail
            ? registerEmail.value.trim()
            : "";


    const password =
        registerPassword
            ? registerPassword.value
            : "";


    const confirm =
        registerPasswordConfirm
            ? registerPasswordConfirm.value
            : "";


    if (
        nickname.length < 3 ||
        nickname.length > 24
    ) {

        showAuthMessage(
            "Никнейм должен содержать от 3 до 24 символов."
        );

        return;
    }


    if (!email) {

        showAuthMessage(
            "Введите email."
        );

        return;
    }


    if (password.length < 6) {

        showAuthMessage(
            "Пароль должен содержать минимум 6 символов."
        );

        return;
    }


    if (password !== confirm) {

        showAuthMessage(
            "Пароли не совпадают."
        );

        return;
    }


    showAuthMessage(
        "Создание аккаунта...",
        "info"
    );


    try {

        const result =
            await supabaseClient.auth.signUp({

                email,

                password,

                options: {
                    data: {
                        nickname,
                        status: "Онлайн"
                    }
                }

            });


        if (result.error) {
            throw result.error;
        }


        currentSession =
            result.data.session || null;


        currentUser =
            result.data.user || null;


        if (!currentSession) {

            showAuthMessage(
                "Аккаунт создан. Проверьте email для подтверждения регистрации.",
                "success"
            );

            return;
        }


        await enterApplication();

    } catch (error) {

        console.error(
            "Register error:",
            error
        );


        showAuthMessage(
            error &&
            error.message
                ? error.message
                : "Не удалось создать аккаунт."
        );

    }

}


/* =========================================================
   AUTH STATE
========================================================= */

function subscribeAuthState() {

    if (!supabaseClient) {
        return;
    }


    supabaseClient.auth.onAuthStateChange(
        function (event, session) {

            console.log(
                "Auth event:",
                event
            );


            currentSession =
                session || null;


            currentUser =
                session &&
                session.user
                    ? session.user
                    : null;


            if (
                currentUser &&
                !applicationStarted
            ) {

                setTimeout(
                    function () {

                        enterApplication();

                    },
                    0
                );

            }


            if (!currentUser) {

                leaveApplication();

            }

        }
    );

}


/* =========================================================
   SESSION
========================================================= */

async function loadInitialSession() {

    if (!supabaseClient) {
        return;
    }


    try {

        const result =
            await supabaseClient.auth.getSession();


        if (result.error) {
            throw result.error;
        }


        currentSession =
            result.data.session || null;


        currentUser =
            currentSession
                ? currentSession.user
                : null;


        if (currentUser) {

            await enterApplication();

        } else {

            leaveApplication();

        }

    } catch (error) {

        console.error(
            "Session error:",
            error
        );


        leaveApplication();

    }

}


/* =========================================================
   PROFILE
========================================================= */

async function ensureProfile() {

    if (
        !currentUser ||
        !supabaseClient
    ) {
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


    try {

        const result =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();


        if (
            !result.error &&
            result.data
        ) {

            profileData =
                Object.assign(
                    {},
                    profileData,
                    result.data
                );


            return;

        }


        const insert =
            await supabaseClient
                .from("profiles")
                .insert({

                    id:
                        currentUser.id,

                    nickname:
                        nickname,

                    status:
                        status,

                    vip_level:
                        0

                })
                .select()
                .single();


        if (
            !insert.error &&
            insert.data
        ) {

            profileData =
                Object.assign(
                    {},
                    profileData,
                    insert.data
                );

        } else {

            profileData.nickname =
                nickname;

            profileData.status =
                status;

        }

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        profileData.nickname =
            nickname;

        profileData.status =
            status;

    }

}


/* =========================================================
   AVATAR
========================================================= */

function renderAvatar(
    element,
    nickname,
    avatarUrl
) {

    if (!element) {
        return;
    }


    element.innerHTML =
        "";


    if (avatarUrl) {

        const image =
            document.createElement("img");


        image.src =
            avatarUrl;


        image.alt =
            "Avatar";


        image.onerror =
            function () {

                element.textContent =
                    "🤖";

            };


        element.appendChild(
            image
        );


        return;
    }


    element.textContent =
        "🤖";

}


/* =========================================================
   VIP
========================================================= */

function getVipRoman(level) {

    const roman = [

        "",

        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "X",
        "XI",
        "XII"

    ];


    return roman[
        Number(level) || 0
    ] || "";

}


function createVipBadge(level) {

    const number =
        Number(level) || 0;


    if (number <= 0) {
        return "";
    }


    return (

        '<span class="vip-badge">' +

            "VIP " +

            escapeHtml(
                getVipRoman(number)
            ) +

        "</span>"

    );

}


/* =========================================================
   APPLY PROFILE
========================================================= */

function applyProfile() {

    const nickname =
        profileData.nickname ||
        "Player";


    const status =
        profileData.status ||
        "Онлайн";


    if ($("header-nickname")) {

        $("header-nickname").textContent =
            nickname;

    }


    if ($("profile-nickname")) {

        $("profile-nickname").textContent =
            nickname;

    }


    if ($("header-status")) {

        $("header-status").textContent =
            status;

    }


    if ($("profile-status")) {

        $("profile-status").textContent =
            status;

    }


    renderAvatar(
        $("header-avatar"),
        nickname,
        profileData.avatar_url
    );


    renderAvatar(
        $("profile-avatar"),
        nickname,
        profileData.avatar_url
    );


    renderAvatar(
        $("profile-modal-avatar"),
        nickname,
        profileData.avatar_url
    );


    document
        .querySelectorAll(
            "[data-vip-badge]"
        )
        .forEach(
            function (element) {

                element.innerHTML =
                    createVipBadge(
                        profileData.vip_level
                    );

            }
        );


    if (profileNicknameInput) {

        profileNicknameInput.value =
            nickname;

    }


    if (profileStatusInput) {

        profileStatusInput.value =
            status;

    }


    if ($("profile-age-input")) {

        $("profile-age-input").value =
            profileData.age || "";

    }


    if ($("profile-city-input")) {

        $("profile-city-input").value =
            profileData.city || "";

    }


    if ($("profile-avatar-input")) {

        $("profile-avatar-input").value =
            profileData.avatar_url || "";

    }


    if ($("profile-about-input")) {

        $("profile-about-input").value =
            profileData.about || "";

    }

}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

    if (
        !currentUser ||
        !supabaseClient
    ) {

        showProfileMessage(
            "Пользователь не авторизован.",
            "error"
        );

        return;

    }


    const nickname =
        profileNicknameInput.value.trim();


    const status =
        profileStatusInput.value.trim();


    if (
        nickname.length < 3 ||
        nickname.length > 24
    ) {

        showProfileMessage(
            "Никнейм должен содержать от 3 до 24 символов.",
            "error"
        );

        return;

    }


    const age =
        $("profile-age-input") &&
        $("profile-age-input").value
            ? Number(
                $("profile-age-input").value
            )
            : null;


    const city =
        $("profile-city-input")
            ? $("profile-city-input").value.trim()
            : "";


    const avatar =
        $("profile-avatar-input")
            ? $("profile-avatar-input").value.trim()
            : "";


    const about =
        $("profile-about-input")
            ? $("profile-about-input").value.trim()
            : "";


    showProfileMessage(
        "Сохранение...",
        "info"
    );


    try {

        const result =
            await supabaseClient
                .from("profiles")
                .update({

                    nickname,

                    status:
                        status || "Онлайн",

                    age,

                    city,

                    avatar_url:
                        avatar,

                    about,

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    currentUser.id
                )
                .select()
                .single();


        if (result.error) {
            throw result.error;
        }


        profileData =
            Object.assign(
                {},
                profileData,
                result.data
            );


        applyProfile();


        showProfileMessage(
            "Профиль сохранён.",
            "success"
        );


        setTimeout(
            function () {

                closeModal(
                    "profile-modal"
                );

            },
            500
        );


    } catch (error) {

        console.error(
            "Save profile error:",
            error
        );


        showProfileMessage(
            error &&
            error.message
                ? error.message
                : "Ошибка сохранения профиля.",
            "error"
        );

    }

}


/* =========================================================
   ENTER
========================================================= */

async function enterApplication() {

    if (
        !currentUser ||
        applicationStarted
    ) {
        return;
    }


    applicationStarted =
        true;


    if (authScreen) {

        authScreen.classList.add(
            "hidden-screen"
        );

    }


    if (appShell) {

        appShell.classList.add(
            "active"
        );

    }


    await ensureProfile();


    applyProfile();


    renderPage(
        currentPage
    );


    await initPresence();


    console.log(
        "GAME PLATFORM",
        APP_VERSION,
        "READY"
    );

}


/* =========================================================
   LEAVE
========================================================= */

async function leaveApplication() {

    applicationStarted =
        false;


    await stopConference();


    await stopPresence();


    stopChatRealtime();


    currentUser =
        null;


    currentSession =
        null;


    if (appShell) {

        appShell.classList.remove(
            "active"
        );

    }


    if (authScreen) {

        authScreen.classList.remove(
            "hidden-screen"
        );

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const page =
                            button.dataset.page;


                        if (!page) {
                            return;
                        }


                        currentPage =
                            page;


                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.toggle(
                                        "active",
                                        item.dataset.page === page
                                    );

                                }
                            );


                        document
                            .querySelectorAll(
                                ".mobile-nav button"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.toggle(
                                        "active",
                                        item.dataset.page === page
                                    );

                                }
                            );


                        renderPage(
                            page
                        );

                    }
                );

            }
        );

}


/* =========================================================
   HOME PAGE
========================================================= */

function renderHome() {

    const content =
        $("page-content");


    content.innerHTML = `

        <section class="home-hero">

            <div class="hero-content">

                <div class="hero-small">
                    GAME PLATFORM
                </div>

                <h2>
                    Добро пожаловать,<br>
                    ${escapeHtml(
                        profileData.nickname ||
                        "Player"
                    )}
                </h2>

                <p>
                    Игры, сообщества, новости,
                    общение и видеосвязь —
                    всё игровое пространство
                    в одном месте.
                </p>

            </div>

        </section>


        <div class="home-grid">


            <section class="content-card">

                <div class="content-card-header">

                    <strong class="content-card-title">
                        Последние новости
                    </strong>

                    <span class="content-card-label">
                        NEWS
                    </span>

                </div>


                <div class="news-list">


                    <article class="news-item">

                        <div class="news-icon">
                            ◈
                        </div>

                        <div class="news-info">

                            <strong>
                                Добро пожаловать
                            </strong>

                            <p>
                                GAME PLATFORM развивается
                                как единое пространство
                                для разных игр и сообществ.
                            </p>

                        </div>

                    </article>


                    <article class="news-item">

                        <div class="news-icon">
                            ●
                        </div>

                        <div class="news-info">

                            <strong>
                                Общение в реальном времени
                            </strong>

                            <p>
                                В чате можно общаться
                                и подключаться к общей
                                видеоконференции.
                            </p>

                        </div>

                    </article>


                    <article class="news-item">

                        <div class="news-icon">
                            ◎
                        </div>

                        <div class="news-info">

                            <strong>
                                Новый профиль
                            </strong>

                            <p>
                                Доступны возраст,
                                город, информация о себе,
                                фотография и VIP-статус.
                            </p>

                        </div>

                    </article>


                </div>

            </section>


            <section class="content-card media-card">

                <div class="media-symbol">
                    ▶
                </div>

                <h3>
                    Видео и трансляции
                </h3>

                <p>
                    Раздел для игровых видео,
                    трансляций и будущих
                    видеоматериалов сообщества.
                </p>

            </section>


        </div>


        <section class="content-card">

            <div class="content-card-header">

                <strong class="content-card-title">
                    Ваши игры
                </strong>

                <span class="content-card-label">
                    GAMES
                </span>

            </div>


            <div class="game-card-grid">


                <article class="game-card">

                    <div class="game-card-icon">
                        ◈
                    </div>

                    <strong>
                        World of Sea Battle
                    </strong>

                    <span>
                        Игровое сообщество
                    </span>

                </article>


                <article class="game-card">

                    <div class="game-card-icon">
                        +
                    </div>

                    <strong>
                        Новая игра
                    </strong>

                    <span>
                        Добавить игровой проект
                    </span>

                </article>


                <article class="game-card">

                    <div class="game-card-icon">
                        …
                    </div>

                    <strong>
                        Скоро
                    </strong>

                    <span>
                        Новые проекты платформы
                    </span>

                </article>


            </div>

        </section>

    `;

}


/* =========================================================
   GAMES
========================================================= */

function renderGames() {

    const content =
        $("page-content");


    content.innerHTML = `

        <section class="content-card">

            <div class="content-card-header">

                <strong class="content-card-title">
                    Игры
                </strong>

                <span class="content-card-label">
                    CATALOG
                </span>

            </div>


            <div class="game-card-grid">


                <article class="game-card">

                    <div class="game-card-icon">
                        ◈
                    </div>

                    <strong>
                        World of Sea Battle
                    </strong>

                    <span>
                        Открыть игровой раздел
                    </span>

                    <button
                        id="wosb-open"
                        class="primary-button"
                        type="button"
                        style="margin-top:12px;"
                    >
                        Открыть
                    </button>

                </article>


                <article class="game-card">

                    <div class="game-card-icon">
                        +
                    </div>

                    <strong>
                        Добавить игру
                    </strong>

                    <span>
                        Новый проект
                    </span>

                </article>


            </div>

        </section>

    `;


    const button =
        $("wosb-open");


    if (button) {

        button.addEventListener(
            "click",
            function () {

                showInfo(
                    "Раздел World of Sea Battle будет подключён следующим этапом."
                );

            }
        );

    }

}


/* =========================================================
   NEWS
========================================================= */

function renderNews() {

    const content =
        $("page-content");


    content.innerHTML = `

        <section class="content-card">

            <div class="content-card-header">

                <strong class="content-card-title">
                    Новости платформы
                </strong>

                <span class="content-card-label">
                    NEWS
                </span>

            </div>


            <div class="news-list">


                <article class="news-item">

                    <div class="news-icon">
                        ◈
                    </div>

                    <div class="news-info">

                        <strong>
                            GAME PLATFORM
                        </strong>

                        <p>
                            Платформа развивается
                            как шаблон для разных игр,
                            сообществ и гильдий.
                        </p>

                    </div>

                </article>


                <article class="news-item">

                    <div class="news-icon">
                        ▱
                    </div>

                    <div class="news-info">

                        <strong>
                            Чат и видеосвязь
                        </strong>

                        <p>
                            Видеоконференция теперь
                            находится непосредственно
                            внутри чата.
                        </p>

                    </div>

                </article>


            </div>

        </section>

    `;

}


/* =========================================================
   ONLINE
========================================================= */

function renderOnlinePage() {

    const content =
        $("page-content");


    content.innerHTML = `

        <section class="content-card">

            <div class="content-card-header">

                <strong class="content-card-title">
                    Игроки онлайн
                </strong>

                <span class="content-card-label">
                    ONLINE
                </span>

            </div>


            <div
                id="online-page-list"
                class="online-list"
                style="padding-top:15px;"
            ></div>

        </section>

    `;


    renderOnlinePlayers(
        "online-page-list"
    );

}


/* =========================================================
   PROFILE PAGE
========================================================= */

function renderProfilePage() {

    const content =
        $("page-content");


    content.innerHTML = `

        <section class="content-card">

            <div
                style="
                    padding:20px;
                    display:flex;
                    align-items:center;
                    gap:15px;
                "
            >

                <div
                    id="page-avatar"
                    class="avatar avatar-large"
                >
                    🤖
                </div>


                <div>

                    <strong
                        style="
                            display:block;
                            font-size:20px;
                            margin-bottom:5px;
                        "
                    >
                        ${escapeHtml(
                            profileData.nickname ||
                            "Player"
                        )}
                    </strong>

                    <div
                        style="
                            color:#828b95;
                            font-size:11px;
                            margin-bottom:5px;
                        "
                    >
                        ${escapeHtml(
                            profileData.status ||
                            "Онлайн"
                        )}
                    </div>

                    <div
                        data-vip-badge
                    ></div>

                    <div
                        style="
                            color:#828b95;
                            font-size:10px;
                            margin-top:9px;
                        "
                    >
                        ${
                            profileData.city
                                ? escapeHtml(
                                    profileData.city
                                )
                                : "Город не указан"
                        }
                    </div>

                    <button
                        id="page-edit-profile"
                        type="button"
                        class="primary-button"
                        style="
                            margin-top:13px;
                            padding:0 16px;
                        "
                    >
                        Редактировать
                    </button>

                </div>

            </div>

        </section>

    `;


    renderAvatar(
        $("page-avatar"),
        profileData.nickname,
        profileData.avatar_url
    );


    document
        .querySelectorAll(
            "[data-vip-badge]"
        )
        .forEach(
            function (element) {

                element.innerHTML =
                    createVipBadge(
                        profileData.vip_level
                    );

            }
        );


    const button =
        $("page-edit-profile");


    if (button) {

        button.addEventListener(
            "click",
            openProfileModal
        );

    }

}


/* =========================================================
   CHAT PAGE
========================================================= */

async function renderChat() {

    const content =
        $("page-content");


    content.innerHTML = `

        <div class="chat-page">


            <!-- CHAT -->

            <section class="chat-card">


                <div class="chat-header">

                    <strong>
                        Общий чат
                    </strong>

                    <span>
                        Realtime
                    </span>

                </div>


                <div
                    id="chat-messages"
                    class="chat-messages"
                ></div>


                <form
                    id="chat-form"
                    class="chat-input"
                >

                    <input
                        id="chat-input"
                        type="text"
                        maxlength="1000"
                        autocomplete="off"
                        placeholder="Введите сообщение..."
                    >

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Отправить
                    </button>

                </form>


            </section>


            <!-- CONFERENCE -->

            <section class="conference-card">


                <div class="conference-header">

                    <div>

                        <strong>
                            Видеоконференция
                        </strong>

                        <div
                            id="conference-status"
                            class="conference-status"
                        >
                            НЕ ПОДКЛЮЧЕНО
                        </div>

                    </div>


                    <span>
                        ●
                    </span>

                </div>


                <div
                    id="conference-videos"
                    class="conference-videos"
                >

                    <div class="conference-placeholder">

                        <div class="conference-placeholder-icon">
                            ◉
                        </div>

                        <strong>
                            Общая конференция
                        </strong>

                        <span>
                            Камера и микрофон работают
                            прямо внутри страницы чата.
                        </span>

                    </div>

                </div>


                <button
                    id="conference-join"
                    type="button"
                    class="conference-main-button"
                >
                    Войти в конференцию
                </button>


                <button
                    id="conference-leave"
                    type="button"
                    class="conference-main-button leave"
                    style="display:none;"
                >
                    Покинуть конференцию
                </button>


                <div class="conference-controls">

                    <button
                        id="conference-mic"
                        type="button"
                        class="conference-button"
                    >
                        Микрофон
                    </button>

                    <button
                        id="conference-camera"
                        type="button"
                        class="conference-button"
                    >
                        Камера
                    </button>

                    <button
                        id="conference-screen"
                        type="button"
                        class="conference-button"
                    >
                        Экран
                    </button>

                    <button
                        id="conference-refresh"
                        type="button"
                        class="conference-button"
                    >
                        Обновить
                    </button>

                </div>


            </section>


        </div>

    `;


    await loadChatMessages();

    startChatRealtime();


    const form =
        $("chat-form");


    if (form) {

        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await sendChatMessage();

            }
        );

    }


    initConferenceUI();

}


/* =========================================================
   PAGE RENDER
========================================================= */

function renderPage(page) {

    const title =
        $("page-title");


    const kicker =
        $("page-kicker");


    const badge =
        $("page-badge");


    const content =
        $("page-content");


    if (
        !title ||
        !kicker ||
        !badge ||
        !content
    ) {

        return;

    }


    if (
        page !== "chat"
    ) {

        stopChatRealtime();

    }


    if (
        page !== "home" &&
        conferenceJoined
    ) {

        /* Do not stop conference automatically.
           User may keep it alive while navigating. */

    }


    if (page === "home") {

        title.textContent =
            "Главная";

        kicker.textContent =
            "PLATFORM";

        badge.textContent =
            "HOME";

        renderHome();

        return;

    }


    if (page === "games") {

        title.textContent =
            "Игры";

        kicker.textContent =
            "GAME CATALOG";

        badge.textContent =
            "GAMES";

        renderGames();

        return;

    }


    if (page === "news") {

        title.textContent =
            "Новости";

        kicker.textContent =
            "COMMUNITY";

        badge.textContent =
            "NEWS";

        renderNews();

        return;

    }


    if (page === "online") {

        title.textContent =
            "Онлайн";

        kicker.textContent =
            "COMMUNITY";

        badge.textContent =
            "ONLINE";

        renderOnlinePage();

        return;

    }


    if (page === "profile") {

        title.textContent =
            "Профиль";

        kicker.textContent =
            "PLAYER";

        badge.textContent =
            "PROFILE";

        renderProfilePage();

        return;

    }


    if (page === "chat") {

        title.textContent =
            "Чат";

        kicker.textContent =
            "COMMUNITY";

        badge.textContent =
            "CHAT";

        renderChat();

        return;

    }


    renderPage("home");

}


/* =========================================================
   SOCIAL BUTTONS
========================================================= */

function initSocialButtons() {

    [
        $("youtube-button"),
        $("right-youtube-button")
    ]
        .forEach(
            function (button) {

                if (!button) {
                    return;
                }


                button.addEventListener(
                    "click",
                    function () {

                        window.open(
                            "https://www.youtube.com/",
                            "_blank",
                            "noopener,noreferrer"
                        );

                    }
                );

            }
        );


    [
        $("twitch-button"),
        $("right-twitch-button")
    ]
        .forEach(
            function (button) {

                if (!button) {
                    return;
                }


                button.addEventListener(
                    "click",
                    function () {

                        window.open(
                            "https://www.twitch.tv/",
                            "_blank",
                            "noopener,noreferrer"
                        );

                    }
                );

            }
        );

}


/* =========================================================
   PROFILE BUTTONS
========================================================= */

function initProfileButtons() {

    const buttons = [

        $("profile-edit-button"),

        $("header-profile-button")

    ];


    buttons.forEach(
        function (button) {

            if (!button) {
                return;
            }


            button.addEventListener(
                "click",
                openProfileModal
            );

        }
    );

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
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

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
            function (overlay) {

                overlay.addEventListener(
                    "click",
                    function (event) {

                        if (
                            event.target === overlay
                        ) {

                            overlay.classList.remove(
                                "active"
                            );

                        }

                    }
                );

            }
        );

}


function openModal(id) {

    const modal =
        $(id);


    if (!modal) {
        return;
    }


    modal.classList.add(
        "active"
    );

}


function closeModal(id) {

    const modal =
        $(id);


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );

}


/* =========================================================
   PROFILE MODAL
========================================================= */

function openProfileModal() {

    if (!currentUser) {
        return;
    }


    applyProfile();


    showProfileMessage(
        ""
    );


    openModal(
        "profile-modal"
    );

}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

    if (!supabaseClient) {
        return;
    }


    await stopConference();

    await stopPresence();

    stopChatRealtime();


    try {

        const result =
            await supabaseClient.auth.signOut();


        if (result.error) {
            throw result.error;
        }

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

}


/* =========================================================
   PRESENCE
========================================================= */

async function initPresence() {

    if (
        !supabaseClient ||
        !currentUser
    ) {

        return;
    }


    try {

        if (presenceChannel) {

            await supabaseClient.removeChannel(
                presenceChannel
            );

        }


        presenceChannel =
            supabaseClient.channel(
                "global-presence",
                {
                    config: {
                        presence: {
                            key:
                                currentUser.id
                        }
                    }
                }
            );


        presenceChannel.on(
            "presence",
            {
                event: "sync"
            },
            updatePresenceUsers
        );


        presenceChannel.on(
            "presence",
            {
                event: "join"
            },
            updatePresenceUsers
        );


        presenceChannel.on(
            "presence",
            {
                event: "leave"
            },
            updatePresenceUsers
        );


        presenceChannel.subscribe(
            async function (status) {

                console.log(
                    "Presence:",
                    status
                );


                if (
                    status === "SUBSCRIBED"
                ) {

                    await presenceChannel.track({

                        user_id:
                            currentUser.id,

                        nickname:
                            profileData.nickname ||
                            "Player",

                        status:
                            profileData.status ||
                            "Онлайн",

                        avatar_url:
                            profileData.avatar_url ||
                            "",

                        vip_level:
                            profileData.vip_level ||
                            0

                    });

                }

            }
        );

    } catch (error) {

        console.error(
            "Presence error:",
            error
        );

    }

}


function updatePresenceUsers() {

    if (!presenceChannel) {
        return;
    }


    try {

        const state =
            presenceChannel.presenceState();


        const unique = {};


        Object.keys(state)
            .forEach(
                function (key) {

                    const entries =
                        state[key] || [];


                    entries.forEach(
                        function (entry) {

                            if (
                                entry &&
                                entry.user_id
                            ) {

                                unique[
                                    entry.user_id
                                ] =
                                    entry;

                            }

                        }
                    );

                }
            );


        presenceUsers =
            Object.keys(unique)
                .map(
                    function (key) {

                        return unique[key];

                    }
                );


        updateOnlineCounters();


        if (
            currentPage === "online"
        ) {

            renderOnlinePlayers(
                "online-page-list"
            );

        }


        renderOnlinePlayers(
            "online-player-list"
        );

    } catch (error) {

        console.error(
            "Presence sync error:",
            error
        );

    }

}


function updateOnlineCounters() {

    const count =
        presenceUsers.length;


    [
        "online-header-count",
        "online-side-count",
        "online-side-card-count",
        "online-modal-count",
        "hero-online-count-right"
    ]
        .forEach(
            function (id) {

                const element =
                    $(id);


                if (element) {

                    element.textContent =
                        String(count);

                }

            }
        );

}


function renderOnlinePlayers(targetId) {

    const element =
        $(targetId);


    if (!element) {
        return;
    }


    if (!presenceUsers.length) {

        element.innerHTML = `

            <div class="conference-placeholder">

                <strong>
                    Никого нет онлайн
                </strong>

                <span>
                    Игроки появятся здесь
                    после подключения.
                </span>

            </div>

        `;

        return;

    }


    element.innerHTML =
        presenceUsers
            .map(
                function (user) {

                    return `

                        <div class="online-player">

                            <div class="avatar avatar-medium">
                                🤖
                            </div>

                            <div>

                                <strong>
                                    ${escapeHtml(
                                        user.nickname ||
                                        "Player"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        user.status ||
                                        "Онлайн"
                                    )}
                                </span>

                                ${createVipBadge(
                                    user.vip_level ||
                                    0
                                )}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


async function stopPresence() {

    if (
        !presenceChannel ||
        !supabaseClient
    ) {

        return;
    }


    try {

        await presenceChannel.untrack();

    } catch (error) {

        console.error(
            error
        );

    }


    try {

        await supabaseClient.removeChannel(
            presenceChannel
        );

    } catch (error) {

        console.error(
            error
        );

    }


    presenceChannel =
        null;


    presenceUsers =
        [];


    updateOnlineCounters();

}


/* =========================================================
   CHAT DATABASE
========================================================= */

async function loadChatMessages() {

    if (!supabaseClient) {
        return;
    }


    const container =
        $("chat-messages");


    if (!container) {
        return;
    }


    const result =
        await supabaseClient
            .from("chat_messages")
            .select("*")
            .eq(
                "room_type",
                "global"
            )
            .order(
                "created_at",
                {
                    ascending:
                        true
                }
            )
            .limit(100);


    if (result.error) {

        container.innerHTML = `

            <div class="conference-placeholder">

                <strong>
                    Чат пока не настроен
                </strong>

                <span>
                    Проверьте таблицу
                    chat_messages в Supabase.
                </span>

            </div>

        `;

        return;
    }


    renderChatMessages(
        result.data || []
    );

}


function renderChatMessages(messages) {

    const container =
        $("chat-messages");


    if (!container) {
        return;
    }


    if (!messages.length) {

        container.innerHTML = `

            <div class="conference-placeholder">

                <strong>
                    Пока нет сообщений
                </strong>

                <span>
                    Напишите первое сообщение.
                </span>

            </div>

        `;

        return;
    }


    container.innerHTML =
        messages
            .map(
                function (message) {

                    const mine =
                        currentUser &&
                        message.user_id ===
                            currentUser.id;


                    return `

                        <div
                            class="chat-message ${
                                mine
                                    ? "mine"
                                    : ""
                            }"
                        >

                            <strong>
                                ${escapeHtml(
                                    message.nickname ||
                                    "Player"
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    message.message ||
                                    ""
                                )}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");


    container.scrollTop =
        container.scrollHeight;

}


async function sendChatMessage() {

    const input =
        $("chat-input");


    if (
        !input ||
        !currentUser ||
        !supabaseClient
    ) {

        return;
    }


    const message =
        input.value.trim();


    if (!message) {
        return;
    }


    try {

        const result =
            await supabaseClient
                .from("chat_messages")
                .insert({

                    user_id:
                        currentUser.id,

                    nickname:
                        profileData.nickname ||
                        "Player",

                    room_type:
                        "global",

                    message:
                        message

                });


        if (result.error) {
            throw result.error;
        }


        input.value =
            "";


        await loadChatMessages();

    } catch (error) {

        console.error(
            "Chat send:",
            error
        );

    }

}


function startChatRealtime() {

    stopChatRealtime();


    if (!supabaseClient) {
        return;
    }


    chatChannel =
        supabaseClient.channel(
            "global-chat-" +
            Date.now()
        );


    chatChannel.on(
        "postgres_changes",
        {
            event:
                "INSERT",

            schema:
                "public",

            table:
                "chat_messages",

            filter:
                "room_type=eq.global"

        },
        function () {

            loadChatMessages();

        }
    );


    chatChannel.subscribe();

}


function stopChatRealtime() {

    if (
        chatChannel &&
        supabaseClient
    ) {

        try {

            supabaseClient.removeChannel(
                chatChannel
            );

        } catch (error) {

            console.error(
                error
            );

        }

    }


    chatChannel =
        null;

}


/* =========================================================
   CONFERENCE UI
========================================================= */

function initConferenceUI() {

    const join =
        $("conference-join");

    const leave =
        $("conference-leave");

    const mic =
        $("conference-mic");

    const camera =
        $("conference-camera");

    const screen =
        $("conference-screen");

    const refresh =
        $("conference-refresh");


    if (join) {

        join.addEventListener(
            "click",
            startConference
        );

    }


    if (leave) {

        leave.addEventListener(
            "click",
            stopConference
        );

    }


    if (mic) {

        mic.addEventListener(
            "click",
            toggleConferenceMic
        );

    }


    if (camera) {

        camera.addEventListener(
            "click",
            toggleConferenceCamera
        );

    }


    if (screen) {

        screen.addEventListener(
            "click",
            toggleConferenceScreen
        );

    }


    if (refresh) {

        refresh.addEventListener(
            "click",
            function () {

                if (conferenceJoined) {

                    updateConferenceVideos();

                }

            }
        );

    }

}


function setConferenceStatus(text) {

    const element =
        $("conference-status");


    if (element) {

        element.textContent =
            text;

    }

}


/* =========================================================
   START CONFERENCE
========================================================= */

async function startConference() {

    if (
        conferenceJoined ||
        !currentUser ||
        !supabaseClient
    ) {

        return;
    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        setConferenceStatus(
            "КАМЕРА НЕДОСТУПНА"
        );

        showInfo(
            "Браузер не поддерживает доступ к камере и микрофону."
        );

        return;
    }


    try {

        setConferenceStatus(
            "ПОДКЛЮЧЕНИЕ..."
        );


        localStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode:
                        "user"
                },

                audio:
                    true

            });


        conferenceJoined =
            true;


        conferenceParticipants =
            {};


        conferenceChannel =
            supabaseClient.channel(
                "conference-" +
                conferenceRoom,
                {
                    config: {
                        broadcast: {
                            self:
                                false
                        }
                    }
                }
            );


        conferenceChannel.on(
            "broadcast",
            {
                event:
                    "join"
            },
            async function (payload) {

                const peerId =
                    payload &&
                    payload.payload
                        ? payload.payload.userId
                        : null;


                if (
                    !peerId ||
                    peerId === currentUser.id
                ) {

                    return;
                }


                await createPeerOffer(
                    peerId
                );

            }
        );


        conferenceChannel.on(
            "broadcast",
            {
                event:
                    "offer"
            },
            async function (payload) {

                const data =
                    payload &&
                    payload.payload
                        ? payload.payload
                        : null;


                if (!data) {
                    return;
                }


                if (
                    data.to !==
                    currentUser.id
                ) {

                    return;
                }


                await handleOffer(
                    data
                );

            }
        );


        conferenceChannel.on(
            "broadcast",
            {
                event:
                    "answer"
            },
            async function (payload) {

                const data =
                    payload &&
                    payload.payload
                        ? payload.payload
                        : null;


                if (!data) {
                    return;
                }


                if (
                    data.to !==
                    currentUser.id
                ) {

                    return;
                }


                await handleAnswer(
                    data
                );

            }
        );


        conferenceChannel.on(
            "broadcast",
            {
                event:
                    "ice"
            },
            async function (payload) {

                const data =
                    payload &&
                    payload.payload
                        ? payload.payload
                        : null;


                if (!data) {
                    return;
                }


                if (
                    data.to !==
                    currentUser.id
                ) {

                    return;
                }


                await handleIceCandidate(
                    data
                );

            }
        );


        conferenceChannel.on(
            "broadcast",
            {
                event:
                    "leave"
            },
            function (payload) {

                const peerId =
                    payload &&
                    payload.payload
                        ? payload.payload.userId
                        : null;


                if (peerId) {

                    removePeer(
                        peerId
                    );

                }

            }
        );


        await new Promise(
            function (resolve) {

                conferenceChannel.subscribe(
                    async function (status) {

                        if (
                            status ===
                            "SUBSCRIBED"
                        ) {

                            updateLocalVideo();


                            await conferenceChannel.send({

                                type:
                                    "broadcast",

                                event:
                                    "join",

                                payload: {

                                    userId:
                                        currentUser.id,

                                    nickname:
                                        profileData.nickname ||
                                        "Player"

                                }

                            });


                            resolve();

                        }

                    }
                );

            }
        );


        setConferenceStatus(
            "ПОДКЛЮЧЕНО"
        );


        updateConferenceButtons();


    } catch (error) {

        console.error(
            "Conference error:",
            error
        );


        await stopConference();


        setConferenceStatus(
            "ОШИБКА"
        );


        showInfo(
            "Не удалось получить доступ к камере или микрофону."
        );

    }

}


/* =========================================================
   PEER CONNECTION
========================================================= */

function createPeerConnection(
    peerId
) {

    if (peerConnections[peerId]) {

        return peerConnections[peerId];

    }


    const connection =
        new RTCPeerConnection({

            iceServers: [

                {
                    urls:
                        "stun:stun.l.google.com:19302"
                },

                {
                    urls:
                        "stun:stun1.l.google.com:19302"
                }

            ]

        });


    peerConnections[peerId] =
        connection;


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                function (track) {

                    connection.addTrack(
                        track,
                        localStream
                    );

                }
            );

    }


    connection.onicecandidate =
        async function (event) {

            if (
                !event.candidate ||
                !conferenceChannel
            ) {

                return;
            }


            await conferenceChannel.send({

                type:
                    "broadcast",

                event:
                    "ice",

                payload: {

                    from:
                        currentUser.id,

                    to:
                        peerId,

                    candidate:
                        event.candidate

                }

            });

        };


    connection.ontrack =
        function (event) {

            const stream =
                event.streams &&
                event.streams[0]
                    ? event.streams[0]
                    : null;


            if (!stream) {
                return;
            }


            addRemoteVideo(
                peerId,
                stream
            );

        };


    connection.onconnectionstatechange =
        function () {

            if (
                connection.connectionState ===
                "failed"
            ) {

                connection.restartIce();

            }


            if (
                connection.connectionState ===
                "closed" ||
                connection.connectionState ===
                "disconnected"
            ) {

                setTimeout(
                    function () {

                        removePeer(
                            peerId
                        );

                    },
                    1000
                );

            }

        };


    return connection;

}


/* =========================================================
   OFFER
========================================================= */

async function createPeerOffer(
    peerId
) {

    if (
        !conferenceJoined ||
        peerId === currentUser.id
    ) {

        return;
    }


    try {

        const connection =
            createPeerConnection(
                peerId
            );


        const offer =
            await connection.createOffer();


        await connection.setLocalDescription(
            offer
        );


        if (!conferenceChannel) {
            return;
        }


        await conferenceChannel.send({

            type:
                "broadcast",

            event:
                "offer",

            payload: {

                from:
                    currentUser.id,

                to:
                    peerId,

                offer:
                    offer

            }

        });

    } catch (error) {

        console.error(
            "Offer error:",
            error
        );

    }

}


/* =========================================================
   OFFER HANDLER
========================================================= */

async function handleOffer(
    data
) {

    try {

        const peerId =
            data.from;


        if (!peerId) {
            return;
        }


        const connection =
            createPeerConnection(
                peerId
            );


        await connection.setRemoteDescription(
            new RTCSessionDescription(
                data.offer
            )
        );


        const answer =
            await connection.createAnswer();


        await connection.setLocalDescription(
            answer
        );


        await conferenceChannel.send({

            type:
                "broadcast",

            event:
                "answer",

            payload: {

                from:
                    currentUser.id,

                to:
                    peerId,

                answer:
                    answer

            }

        });


    } catch (error) {

        console.error(
            "Handle offer error:",
            error
        );

    }

}


/* =========================================================
   ANSWER
========================================================= */

async function handleAnswer(
    data
) {

    try {

        const connection =
            peerConnections[
                data.from
            ];


        if (!connection) {
            return;
        }


        await connection.setRemoteDescription(
            new RTCSessionDescription(
                data.answer
            )
        );

    } catch (error) {

        console.error(
            "Answer error:",
            error
        );

    }

}


/* =========================================================
   ICE
========================================================= */

async function handleIceCandidate(
    data
) {

    try {

        const connection =
            peerConnections[
                data.from
            ];


        if (!connection) {
            return;
        }


        await connection.addIceCandidate(
            new RTCIceCandidate(
                data.candidate
            )
        );

    } catch (error) {

        console.error(
            "ICE error:",
            error
        );

    }

}


/* =========================================================
   LOCAL VIDEO
========================================================= */

function updateLocalVideo() {

    const container =
        $("conference-videos");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (!localStream) {
        return;
    }


    addVideoTile(
        currentUser.id,
        localStream,
        profileData.nickname || "Вы",
        true
    );

}


/* =========================================================
   REMOTE VIDEO
========================================================= */

function addRemoteVideo(
    peerId,
    stream
) {

    conferenceParticipants[
        peerId
    ] =
        stream;


    const existing =
        document.querySelector(
            '[data-peer-id="' +
            peerId +
            '"]'
        );


    if (existing) {

        const video =
            existing.querySelector(
                "video"
            );


        if (video) {

            video.srcObject =
                stream;

        }


        return;

    }


    addVideoTile(
        peerId,
        stream,
        "Участник",
        false
    );

}


function addVideoTile(
    id,
    stream,
    name,
    local
) {

    const container =
        $("conference-videos");


    if (!container) {
        return;
    }


    const placeholder =
        container.querySelector(
            ".conference-placeholder"
        );


    if (placeholder) {
        placeholder.remove();
    }


    const tile =
        document.createElement(
            "div"
        );


    tile.className =
        "video-tile";


    tile.dataset.peerId =
        id;


    const video =
        document.createElement(
            "video"
        );


    video.autoplay =
        true;


    video.playsInline =
        true;


    video.muted =
        local;


    video.srcObject =
        stream;


    const label =
        document.createElement(
            "div"
        );


    label.className =
        "video-tile-label";


    label.textContent =
        local
            ? "Вы"
            : name;


    tile.appendChild(
        video
    );


    tile.appendChild(
        label
    );


    container.appendChild(
        tile
    );

}


/* =========================================================
   REMOVE PEER
========================================================= */

function removePeer(
    peerId
) {

    if (
        peerConnections[peerId]
    ) {

        try {

            peerConnections[
                peerId
            ].close();

        } catch (error) {

            console.error(
                error
            );

        }

    }


    delete peerConnections[
        peerId
    ];


    delete conferenceParticipants[
        peerId
    ];


    const tile =
        document.querySelector(
            '[data-peer-id="' +
            peerId +
            '"]'
        );


    if (tile) {

        tile.remove();

    }


    updateConferenceVideos();

}


/* =========================================================
   CONFERENCE VIDEOS
========================================================= */

function updateConferenceVideos() {

    const container =
        $("conference-videos");


    if (!container) {
        return;
    }


    if (
        localStream &&
        !document.querySelector(
            '[data-peer-id="' +
            currentUser.id +
            '"]'
        )
    ) {

        updateLocalVideo();

    }


    if (
        !localStream &&
        Object.keys(
            conferenceParticipants
        ).length === 0
    ) {

        container.innerHTML = `

            <div class="conference-placeholder">

                <div class="conference-placeholder-icon">
                    ◉
                </div>

                <strong>
                    Конференция не подключена
                </strong>

                <span>
                    Нажмите «Войти в конференцию».
                </span>

            </div>

        `;

    }

}


/* =========================================================
   MICROPHONE
========================================================= */

function toggleConferenceMic() {

    if (!localStream) {
        return;
    }


    micEnabled =
        !micEnabled;


    localStream
        .getAudioTracks()
        .forEach(
            function (track) {

                track.enabled =
                    micEnabled;

            }
        );


    const button =
        $("conference-mic");


    if (button) {

        button.classList.toggle(
            "active",
            !micEnabled
        );


        button.textContent =
            micEnabled
                ? "Микрофон"
                : "Микрофон выкл.";

    }

}


/* =========================================================
   CAMERA
========================================================= */

function toggleConferenceCamera() {

    if (!localStream) {
        return;
    }


    cameraEnabled =
        !cameraEnabled;


    localStream
        .getVideoTracks()
        .forEach(
            function (track) {

                track.enabled =
                    cameraEnabled;

            }
        );


    const button =
        $("conference-camera");


    if (button) {

        button.classList.toggle(
            "active",
            !cameraEnabled
        );


        button.textContent =
            cameraEnabled
                ? "Камера"
                : "Камера выкл.";

    }

}


/* =========================================================
   SCREEN SHARE
========================================================= */

async function toggleConferenceScreen() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getDisplayMedia
    ) {

        showInfo(
            "Ваш браузер не поддерживает демонстрацию экрана."
        );

        return;
    }


    if (!conferenceJoined) {
        return;
    }


    try {

        if (!screenSharing) {

            screenStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video:
                        true
                });


            const screenTrack =
                screenStream.getVideoTracks()[0];


            if (!screenTrack) {
                return;
            }


            screenSharing =
                true;


            Object.keys(
                peerConnections
            )
                .forEach(
                    function (peerId) {

                        const connection =
                            peerConnections[
                                peerId
                            ];


                        const sender =
                            connection
                                .getSenders()
                                .find(
                                    function (item) {

                                        return (
                                            item.track &&
                                            item.track.kind ===
                                            "video"
                                        );

                                    }
                                );


                        if (sender) {

                            sender.replaceTrack(
                                screenTrack
                            );

                        }

                    }
                );


            screenTrack.onended =
                function () {

                    stopScreenShare();

                };


            const button =
                $("conference-screen");


            if (button) {

                button.classList.add(
                    "active"
                );


                button.textContent =
                    "Экран вкл.";

            }


        } else {

            await stopScreenShare();

        }

    } catch (error) {

        console.error(
            "Screen share error:",
            error
        );

    }

}


async function stopScreenShare() {

    screenSharing =
        false;


    if (screenStream) {

        screenStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );

    }


    screenStream =
        null;


    const cameraTrack =
        localStream &&
        localStream.getVideoTracks()[0]
            ? localStream.getVideoTracks()[0]
            : null;


    Object.keys(
        peerConnections
    )
        .forEach(
            function (peerId) {

                const connection =
                    peerConnections[
                        peerId
                    ];


                const sender =
                    connection
                        .getSenders()
                        .find(
                            function (item) {

                                return (
                                    item.track &&
                                    item.track.kind ===
                                    "video"
                                );

                            }
                        );


                if (
                    sender &&
                    cameraTrack
                ) {

                    sender.replaceTrack(
                        cameraTrack
                    );

                }

            }
        );


    const button =
        $("conference-screen");


    if (button) {

        button.classList.remove(
            "active"
        );


        button.textContent =
            "Экран";

    }

}


/* =========================================================
   CONFERENCE BUTTON STATE
========================================================= */

function updateConferenceButtons() {

    const join =
        $("conference-join");


    const leave =
        $("conference-leave");


    if (join) {

        join.style.display =
            conferenceJoined
                ? "none"
                : "block";

    }


    if (leave) {

        leave.style.display =
            conferenceJoined
                ? "block"
                : "none";

    }

}


/* =========================================================
   STOP CONFERENCE
========================================================= */

async function stopConference() {

    if (
        conferenceChannel &&
        currentUser
    ) {

        try {

            await conferenceChannel.send({

                type:
                    "broadcast",

                event:
                    "leave",

                payload: {

                    userId:
                        currentUser.id

                }

            });

        } catch (error) {

            console.error(
                error
            );

        }

    }


    if (screenStream) {

        screenStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );

    }


    screenStream =
        null;


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );

    }


    localStream =
        null;


    Object.keys(
        peerConnections
    )
        .forEach(
            function (peerId) {

                try {

                    peerConnections[
                        peerId
                    ].close();

                } catch (error) {

                    console.error(
                        error
                    );

                }

            }
        );


    peerConnections =
        {};


    conferenceParticipants =
        {};


    if (
        conferenceChannel &&
        supabaseClient
    ) {

        try {

            await supabaseClient.removeChannel(
                conferenceChannel
            );

        } catch (error) {

            console.error(
                error
            );

        }

    }


    conferenceChannel =
        null;


    conferenceJoined =
        false;


    screenSharing =
        false;


    const videos =
        $("conference-videos");


    if (videos) {

        videos.innerHTML = `

            <div class="conference-placeholder">

                <div class="conference-placeholder-icon">
                    ◉
                </div>

                <strong>
                    Общая конференция
                </strong>

                <span>
                    Камера и микрофон работают
                    прямо внутри страницы чата.
                </span>

            </div>

        `;

    }


    setConferenceStatus(
        "НЕ ПОДКЛЮЧЕНО"
    );


    updateConferenceButtons();


    if ($("conference-mic")) {

        $("conference-mic").textContent =
            "Микрофон";

        $("conference-mic").classList.remove(
            "active"
        );

    }


    if ($("conference-camera")) {

        $("conference-camera").textContent =
            "Камера";

        $("conference-camera").classList.remove(
            "active"
        );

    }


    if ($("conference-screen")) {

        $("conference-screen").textContent =
            "Экран";

        $("conference-screen").classList.remove(
            "active"
        );

    }

}


/* =========================================================
   INFO
========================================================= */

function showInfo(message) {

    console.log(
        message
    );

    window.alert(
        message
    );

}


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        authScreen =
            $("auth-screen");

        appShell =
            $("app-shell");

        authTitle =
            $("auth-title");

        authSubtitle =
            $("auth-subtitle");

        loginTab =
            $("login-tab");

        registerTab =
            $("register-tab");

        loginForm =
            $("login-form");

        registerForm =
            $("register-form");

        authMessage =
            $("auth-message");

        loginEmail =
            $("login-email");

        loginPassword =
            $("login-password");

        registerNickname =
            $("register-nickname");

        registerEmail =
            $("register-email");

        registerPassword =
            $("register-password");

        registerPasswordConfirm =
            $("register-password-confirm");

        logoutButton =
            $("logout-button");

        profileForm =
            $("profile-form");

        profileNicknameInput =
            $("profile-nickname-input");

        profileStatusInput =
            $("profile-status-input");

        profileMessage =
            $("profile-message");


        if (appShell) {

            appShell.classList.remove(
                "active"
            );

        }


        updateVersion();

        initAuthTabs();

        initForms();

        initNavigation();

        initModals();

        initSocialButtons();

        initProfileButtons();


        if (!initSupabase()) {

            showAuthMessage(
                "Не удалось загрузить Supabase."
            );

            return;

        }


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logoutUser
            );

        }


        const onlineButton =
            $("header-online-button");


        if (onlineButton) {

            onlineButton.addEventListener(
                "click",
                function () {

                    renderOnlinePlayers(
                        "online-player-list"
                    );

                    openModal(
                        "online-modal"
                    );

                }
            );

        }


        subscribeAuthState();


        await loadInitialSession();


        console.log(
            "GAME PLATFORM " +
            APP_VERSION +
            " STARTED"
        );

    }
);


/* =========================================================
   GLOBAL API
========================================================= */

window.gamePlatform = {

    getUser:
        function () {
            return currentUser;
        },

    getSession:
        function () {
            return currentSession;
        },

    getProfile:
        function () {
            return profileData;
        },

    getSupabase:
        function () {
            return supabaseClient;
        },

    startConference:
        startConference,

    stopConference:
        stopConference,

    openProfile:
        openProfileModal,

    openModal:
        openModal,

    closeModal:
        closeModal

};
