/* =========================================================
   GAME PLATFORM
   SUPABASE
   AUTH
   PROFILE
   VIP
   PRESENCE
   CHAT
   WEBRTC
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";

const APP_VERSION =
    "1.7.2";


/* =========================================================
   STATE
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

let presenceChannel = null;

let presenceUsers = [];

let chatChannel = null;

let localStream = null;

let screenStream = null;

let callChannel = null;

let peerConnections = {};

let callRoom = null;

let micEnabled = true;

let cameraEnabled = true;

let screenSharing = false;


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
   HELPERS
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


function setHidden(element, hidden) {

    if (!element) {
        return;
    }

    element.classList.toggle(
        "hidden",
        Boolean(hidden)
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

        authMessage.classList.add(
            type
        );

    }

}


function showProfileMessage(message, type) {

    if (!profileMessage) {
        return;
    }

    profileMessage.textContent =
        message || "";

    profileMessage.className =
        "modal-message";

    if (type) {

        profileMessage.classList.add(
            type
        );

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
            "Supabase JS library is not loaded."
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

                email: email,

                password: password

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


    const confirmPassword =
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


    if (password !== confirmPassword) {

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

                email: email,

                password: password,

                options: {
                    data: {
                        nickname: nickname,
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
                session && session.user
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
                    {
                        nickname: nickname,
                        status: status,
                        age: null,
                        city: "",
                        about: "",
                        avatar_url: "",
                        vip_level: 0
                    },
                    result.data
                );

            return;

        }


        if (result.error) {

            console.error(
                "Profile select error:",
                result.error
            );

        }


        const insertResult =
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
            !insertResult.error &&
            insertResult.data
        ) {

            profileData =
                Object.assign(
                    {},
                    profileData,
                    insertResult.data
                );

            return;

        }


        if (insertResult.error) {

            console.error(
                "Profile insert error:",
                insertResult.error
            );

        }


        profileData =
            Object.assign(
                {},
                profileData,
                {
                    nickname: nickname,
                    status: status
                }
            );

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

    }

}


/* =========================================================
   AVATAR
========================================================= */

function getAvatarLetter(nickname) {

    const value =
        String(nickname || "P")
            .trim();


    if (!value) {
        return "P";
    }


    return value
        .charAt(0)
        .toUpperCase();

}


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


        image.loading =
            "lazy";


        image.onerror =
            function () {

                element.innerHTML =
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

function getRomanVip(level) {

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


    const value =
        Number(level) || 0;


    return roman[value] || "";

}


function createVipBadge(level) {

    const value =
        Number(level) || 0;


    if (value <= 0) {
        return "";
    }


    return (
        '<span class="vip-badge">' +
        "VIP " +
        escapeHtml(
            getRomanVip(value)
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


    const nicknameElements = [

        $("header-nickname"),

        $("profile-nickname")

    ];


    nicknameElements.forEach(
        function (element) {

            if (element) {

                element.textContent =
                    nickname;

            }

        }
    );


    const statusElements = [

        $("header-status"),

        $("profile-status")

    ];


    statusElements.forEach(
        function (element) {

            if (element) {

                element.textContent =
                    status;

            }

        }
    );


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


    if (profileNicknameInput) {

        profileNicknameInput.value =
            nickname;

    }


    if (profileStatusInput) {

        profileStatusInput.value =
            status;

    }


    const ageInput =
        $("profile-age-input");


    if (ageInput) {

        ageInput.value =
            profileData.age || "";

    }


    const cityInput =
        $("profile-city-input");


    if (cityInput) {

        cityInput.value =
            profileData.city || "";

    }


    const avatarInput =
        $("profile-avatar-input");


    if (avatarInput) {

        avatarInput.value =
            profileData.avatar_url || "";

    }


    const aboutInput =
        $("profile-about-input");


    if (aboutInput) {

        aboutInput.value =
            profileData.about || "";

    }


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
            "Пользователь не авторизован."
        );

        return;

    }


    const nickname =
        profileNicknameInput
            ? profileNicknameInput.value.trim()
            : "";


    const status =
        profileStatusInput
            ? profileStatusInput.value.trim()
            : "";


    if (
        nickname.length < 3 ||
        nickname.length > 24
    ) {

        showProfileMessage(
            "Никнейм должен содержать от 3 до 24 символов."
        );

        return;

    }


    const ageInput =
        $("profile-age-input");


    const cityInput =
        $("profile-city-input");


    const avatarInput =
        $("profile-avatar-input");


    const aboutInput =
        $("profile-about-input");


    const age =
        ageInput &&
        ageInput.value
            ? Number(ageInput.value)
            : null;


    const updateData = {

        nickname:
            nickname,

        status:
            status || "Онлайн",

        age:
            age,

        city:
            cityInput
                ? cityInput.value.trim()
                : "",

        avatar_url:
            avatarInput
                ? avatarInput.value.trim()
                : "",

        about:
            aboutInput
                ? aboutInput.value.trim()
                : "",

        updated_at:
            new Date().toISOString()

    };


    showProfileMessage(
        "Сохранение...",
        "info"
    );


    try {

        const result =
            await supabaseClient
                .from("profiles")
                .update(updateData)
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
            600
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
                : "Не удалось сохранить профиль."
        );

    }

}


/* =========================================================
   ENTER APPLICATION
========================================================= */

async function enterApplication() {

    if (!currentUser) {
        return;
    }


    if (applicationStarted) {

        return;

    }


    console.log(
        "ENTER APPLICATION:",
        currentUser.id
    );


    if (authScreen) {

        authScreen.classList.add(
            "hidden-screen"
        );

        authScreen.style.setProperty(
            "display",
            "none",
            "important"
        );

    }


    if (!appShell) {

        console.error(
            "app-shell not found."
        );

        return;

    }


    appShell.classList.add(
        "active"
    );


    appShell.style.setProperty(
        "display",
        "flex",
        "important"
    );


    appShell.style.setProperty(
        "visibility",
        "visible",
        "important"
    );


    appShell.style.setProperty(
        "opacity",
        "1",
        "important"
    );


    await ensureProfile();


    applyProfile();


    applicationStarted =
        true;


    renderPage(
        currentPage
    );


    await initGlobalPresence();


    console.log(
        "APPLICATION READY"
    );

}


/* =========================================================
   LEAVE APPLICATION
========================================================= */

function leaveApplication() {

    applicationStarted =
        false;


    stopChatRealtime();


    stopPresence();


    if (appShell) {

        appShell.classList.remove(
            "active"
        );

        appShell.style.setProperty(
            "display",
            "none",
            "important"
        );

    }


    if (authScreen) {

        authScreen.classList.remove(
            "hidden-screen"
        );

        authScreen.style.setProperty(
            "display",
            "flex",
            "important"
        );

        authScreen.style.visibility =
            "visible";

        authScreen.style.opacity =
            "1";

    }


    currentUser =
        null;


    currentSession =
        null;

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
                                ".side-tile[data-page]"
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
   RENDER PAGE
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
        !content
    ) {

        return;

    }


    if (page !== "chat") {

        stopChatRealtime();

    }


    if (page === "home") {

        title.textContent =
            "Главная";


        kicker.textContent =
            "PLATFORM";


        badge.textContent =
            "HOME";


        content.innerHTML = `

            <div class="welcome-grid">

                <article class="info-card">

                    <div class="info-card-icon">
                        ◈
                    </div>

                    <div>

                        <strong>
                            Добро пожаловать
                        </strong>

                        <p>
                            GAME PLATFORM —
                            игровая платформа.
                        </p>

                    </div>

                </article>


                <article class="info-card">

                    <div class="info-card-icon">
                        ♜
                    </div>

                    <div>

                        <strong>
                            Игры
                        </strong>

                        <p>
                            Здесь будут ваши игровые проекты.
                        </p>

                    </div>

                </article>


                <article class="info-card">

                    <div class="info-card-icon">
                        ◉
                    </div>

                    <div>

                        <strong>
                            Игроки онлайн
                        </strong>

                        <p>
                            Сейчас в сети:
                            <strong>
                                ${presenceUsers.length}
                            </strong>
                        </p>

                    </div>

                </article>

            </div>

        `;


        return;

    }


    if (page === "games") {

        title.textContent =
            "Игры";


        kicker.textContent =
            "GAME CATALOG";


        badge.textContent =
            "GAMES";


        content.innerHTML = `

            <div class="welcome-grid">

                <article class="info-card">

                    <div class="info-card-icon">
                        ◈
                    </div>

                    <div>

                        <strong>
                            World of Sea Battle
                        </strong>

                        <p>
                            Игровой раздел платформы.
                        </p>

                        <button
                            type="button"
                            class="modal-primary-button"
                            id="open-wosb-button"
                        >
                            Открыть
                        </button>

                    </div>

                </article>

            </div>

        `;


        const gameButton =
            $("open-wosb-button");


        if (gameButton) {

            gameButton.addEventListener(
                "click",
                function () {

                    alert(
                        "Раздел World of Sea Battle готовится."
                    );

                }
            );

        }


        return;

    }


    if (page === "news") {

        title.textContent =
            "Новости";


        kicker.textContent =
            "COMMUNITY";


        badge.textContent =
            "NEWS";


        content.innerHTML = `

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
                            Раздел будет использоваться
                            для новостей платформы.
                        </p>

                    </div>

                </article>

            </div>

        `;


        return;

    }


    if (page === "online") {

        title.textContent =
            "Онлайн";


        kicker.textContent =
            "COMMUNITY";


        badge.textContent =
            "ONLINE";


        content.innerHTML = `

            <div class="info-card">

                <div class="info-card-icon">
                    ◉
                </div>

                <div>

                    <strong>
                        Игроки онлайн:
                        ${presenceUsers.length}
                    </strong>

                    <div
                        id="online-player-list-page"
                        style="margin-top:16px;"
                    ></div>

                </div>

            </div>

        `;


        renderOnlinePlayers(
            "online-player-list-page"
        );


        return;

    }


    if (page === "profile") {

        title.textContent =
            "Профиль";


        kicker.textContent =
            "PLAYER";


        badge.textContent =
            "PROFILE";


        content.innerHTML = `

            <div class="welcome-grid">

                <article class="info-card">

                    <div
                        class="info-card-icon"
                        id="page-profile-avatar"
                    >
                        🤖
                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(
                                profileData.nickname ||
                                "Player"
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(
                                profileData.status ||
                                "Онлайн"
                            )}
                        </p>

                        <div
                            data-vip-badge
                            style="margin-top:8px;"
                        ></div>

                        <p>
                            ${
                                profileData.city
                                    ? escapeHtml(
                                        profileData.city
                                    )
                                    : "Город не указан"
                            }
                        </p>

                        <button
                            type="button"
                            id="page-profile-edit"
                            class="modal-primary-button"
                        >
                            Редактировать профиль
                        </button>

                    </div>

                </article>

            </div>

        `;


        const avatar =
            $("page-profile-avatar");


        renderAvatar(
            avatar,
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
            $("page-profile-edit");


        if (button) {

            button.addEventListener(
                "click",
                openProfileModal
            );

        }


        return;

    }


    if (page === "chat") {

        title.textContent =
            "Чат";


        kicker.textContent =
            "COMMUNITY CHAT";


        badge.textContent =
            "CHAT";


        initChat();


        return;

    }


    renderPage("home");

}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    const heroOnlineButton =
        $("header-online-button");


    if (heroOnlineButton) {

        heroOnlineButton.addEventListener(
            "click",
            function () {

                openModal(
                    "online-modal"
                );

                renderOnlinePlayers(
                    "online-player-list"
                );

            }
        );

    }


    const youtubeButtons = [

        $("youtube-button"),

        $("right-youtube-button")

    ];


    youtubeButtons.forEach(
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


    const twitchButtons = [

        $("twitch-button"),

        $("right-twitch-button")

    ];


    twitchButtons.forEach(
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


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutUser
        );

    }


    const profileButton =
        $("profile-edit-button");


    if (profileButton) {

        profileButton.addEventListener(
            "click",
            openProfileModal
        );

    }


    const headerProfile =
        $("header-profile-button");


    if (headerProfile) {

        headerProfile.addEventListener(
            "click",
            openProfileModal
        );

    }


    const callButton =
        $("start-call-button");


    if (callButton) {

        callButton.addEventListener(
            "click",
            function () {

                startCall(
                    "global"
                );

            }
        );

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


    if (profileNicknameInput) {

        profileNicknameInput.value =
            profileData.nickname || "";

    }


    if (profileStatusInput) {

        profileStatusInput.value =
            profileData.status || "";

    }


    const age =
        $("profile-age-input");


    if (age) {

        age.value =
            profileData.age || "";

    }


    const city =
        $("profile-city-input");


    if (city) {

        city.value =
            profileData.city || "";

    }


    const avatar =
        $("profile-avatar-input");


    if (avatar) {

        avatar.value =
            profileData.avatar_url || "";

    }


    const about =
        $("profile-about-input");


    if (about) {

        about.value =
            profileData.about || "";

    }


    renderAvatar(
        $("profile-modal-avatar"),
        profileData.nickname,
        profileData.avatar_url
    );


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


    try {

        await leaveCall();

        await stopPresence();


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

async function initGlobalPresence() {

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

            presenceChannel =
                null;

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
            function () {

                updatePresenceUsers();

            }
        );


        presenceChannel.on(
            "presence",
            {
                event: "join"
            },
            function () {

                updatePresenceUsers();

            }
        );


        presenceChannel.on(
            "presence",
            {
                event: "leave"
            },
            function () {

                updatePresenceUsers();

            }
        );


        presenceChannel.subscribe(
            async function (status) {

                console.log(
                    "Presence status:",
                    status
                );


                if (
                    status === "SUBSCRIBED"
                ) {

                    try {

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

                    } catch (error) {

                        console.error(
                            "Presence track error:",
                            error
                        );

                    }

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


        const unique =
            {};


        Object.keys(state)
            .forEach(
                function (key) {

                    const records =
                        state[key] || [];


                    records.forEach(
                        function (record) {

                            if (
                                record &&
                                record.user_id
                            ) {

                                unique[
                                    record.user_id
                                ] =
                                    record;

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


        renderOnlinePlayers(
            "online-player-list"
        );


        if (
            currentPage === "online"
        ) {

            renderOnlinePlayers(
                "online-player-list-page"
            );

        }

    } catch (error) {

        console.error(
            "Presence update error:",
            error
        );

    }

}


function updateOnlineCounters() {

    const count =
        presenceUsers.length;


    const ids = [

        "online-header-count",

        "online-side-count",

        "online-side-card-count",

        "online-modal-count",

        "hero-online-count-right"

    ];


    ids.forEach(
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

    const list =
        $(targetId);


    if (!list) {
        return;
    }


    if (!presenceUsers.length) {

        list.innerHTML = `

            <div class="info-card">

                <strong>
                    Никого нет онлайн
                </strong>

                <p>
                    Пользователи появятся здесь
                    после подключения.
                </p>

            </div>

        `;

        return;

    }


    list.innerHTML =
        presenceUsers
            .map(
                function (user) {

                    return `

                        <div class="online-player">

                            <div class="mini-avatar">
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
            "Presence untrack error:",
            error
        );

    }


    try {

        await supabaseClient.removeChannel(
            presenceChannel
        );

    } catch (error) {

        console.error(
            "Presence remove error:",
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
   CHAT
========================================================= */

async function initChat() {

    const content =
        $("page-content");


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="chat-layout">

            <div
                id="chat-messages"
                class="chat-messages"
            >

                <div class="info-card">

                    <strong>
                        Загрузка...
                    </strong>

                </div>

            </div>


            <form
                id="chat-form"
                class="chat-input-row"
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
                    class="modal-primary-button"
                >
                    Отправить
                </button>

            </form>

        </div>

    `;


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


    await loadChatMessages();


    startChatRealtime();

}


async function loadChatMessages() {

    if (!supabaseClient) {
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
                    ascending: true
                }
            )
            .limit(100);


    if (result.error) {

        console.warn(
            "Chat load:",
            result.error.message
        );


        const container =
            $("chat-messages");


        if (container) {

            container.innerHTML = `

                <div class="info-card">

                    <strong>
                        Чат не загружен
                    </strong>

                    <p>
                        Проверьте таблицу
                        chat_messages в Supabase.
                    </p>

                </div>

            `;

        }


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

            <div class="info-card">

                <strong>
                    Пока нет сообщений.
                </strong>

                <p>
                    Напишите первое сообщение.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        messages
            .map(
                function (message) {

                    return `

                        <div class="chat-message">

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


function startChatRealtime() {

    if (
        !supabaseClient ||
        chatChannel
    ) {

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
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: "room_type=eq.global"
        },
        function () {

            loadChatMessages();

        }
    );


    chatChannel.subscribe(
        function (status) {

            console.log(
                "Chat realtime:",
                status
            );

        }
    );

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
            "Chat send error:",
            error
        );


        alert(
            error &&
            error.message
                ? error.message
                : "Не удалось отправить сообщение."
        );

    }

}


/* =========================================================
   WEBRTC BASIC
========================================================= */

async function startCall(roomName) {

    if (!currentUser) {
        return;
    }


    callRoom =
        roomName ||
        "global";


    openModal(
        "call-modal"
    );


    updateCallStatus(
        "Получение камеры и микрофона..."
    );


    try {

        localStream =
            await navigator.mediaDevices.getUserMedia({

                video: true,

                audio: true

            });


        const video =
            $("local-video");


        if (video) {

            video.srcObject =
                localStream;

        }


        micEnabled =
            true;


        cameraEnabled =
            true;


        updateCallStatus(
            "Камера и микрофон подключены."
        );

    } catch (error) {

        console.error(
            "Media error:",
            error
        );


        updateCallStatus(
            "Нет доступа к камере или микрофону."
        );

    }

}


function updateCallStatus(message) {

    const element =
        $("call-status");


    if (element) {

        element.textContent =
            message;

    }

}


function toggleMicrophone() {

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


    updateCallStatus(
        micEnabled
            ? "Микрофон включён."
            : "Микрофон выключен."
    );

}


function toggleCamera() {

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


    updateCallStatus(
        cameraEnabled
            ? "Камера включена."
            : "Камера выключена."
    );

}


async function toggleScreenShare() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getDisplayMedia
    ) {

        updateCallStatus(
            "Демонстрация экрана не поддерживается."
        );

        return;

    }


    try {

        if (!screenSharing) {

            screenStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });


            screenSharing =
                true;


            updateCallStatus(
                "Демонстрация экрана включена."
            );


            const track =
                screenStream.getVideoTracks()[0];


            if (track) {

                track.onended =
                    function () {

                        screenSharing =
                            false;

                        screenStream =
                            null;

                        updateCallStatus(
                            "Демонстрация экрана завершена."
                        );

                    };

            }

        } else {

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


            screenSharing =
                false;


            updateCallStatus(
                "Демонстрация экрана выключена."
            );

        }

    } catch (error) {

        console.error(
            "Screen share error:",
            error
        );

    }

}


async function leaveCall() {

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


    Object.keys(peerConnections)
        .forEach(
            function (key) {

                try {

                    peerConnections[key].close();

                } catch (error) {

                    console.error(
                        error
                    );

                }

            }
        );


    peerConnections =
        {};


    if (
        callChannel &&
        supabaseClient
    ) {

        try {

            await supabaseClient.removeChannel(
                callChannel
            );

        } catch (error) {

            console.error(
                error
            );

        }

    }


    callChannel =
        null;


    callRoom =
        null;


    closeModal(
        "call-modal"
    );

}


function initCallButtons() {

    const mic =
        $("call-mic-button");


    if (mic) {

        mic.addEventListener(
            "click",
            toggleMicrophone
        );

    }


    const camera =
        $("call-camera-button");


    if (camera) {

        camera.addEventListener(
            "click",
            toggleCamera
        );

    }


    const screen =
        $("call-screen-button");


    if (screen) {

        screen.addEventListener(
            "click",
            toggleScreenShare
        );

    }


    const leave =
        $("call-leave-button");


    if (leave) {

        leave.addEventListener(
            "click",
            leaveCall
        );

    }


    const close =
        $("call-close-x");


    if (close) {

        close.addEventListener(
            "click",
            leaveCall
        );

    }

}


/* =========================================================
   DOM READY
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


        updateVersion();


        if (appShell) {

            appShell.classList.remove(
                "active"
            );

            appShell.style.setProperty(
                "display",
                "none",
                "important"
            );

            appShell.style.visibility =
                "hidden";

        }


        if (authScreen) {

            authScreen.classList.remove(
                "hidden-screen"
            );

            authScreen.style.setProperty(
                "display",
                "flex",
                "important"
            );

            authScreen.style.visibility =
                "visible";

            authScreen.style.opacity =
                "1";

        }


        initAuthTabs();

        initForms();

        initNavigation();

        initModals();

        initButtons();

        initCallButtons();


        if (!initSupabase()) {

            showAuthMessage(
                "Не удалось загрузить библиотеку Supabase."
            );

            return;

        }


        subscribeAuthState();


        await loadInitialSession();


        console.log(
            "GAME PLATFORM " +
            APP_VERSION +
            " started."
        );

    }
);


/* =========================================================
   GLOBAL API
========================================================= */

window.gamePlatform = {

    getUser: function () {

        return currentUser;

    },


    getSession: function () {

        return currentSession;

    },


    getProfile: function () {

        return profileData;

    },


    getSupabase: function () {

        return supabaseClient;

    },


    startCall: startCall,


    leaveCall: leaveCall,


    openProfile: openProfileModal,


    openModal: openModal,


    closeModal: closeModal,


    renderPage: renderPage

};
