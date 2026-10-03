/* =========================================================
   GAME PLATFORM
   SUPABASE AUTH
   PROFILE
   PRESENCE
   GLOBAL CHAT
   WEBRTC BASIC
========================================================= */

"use strict";

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";

const APP_VERSION =
    "1.7.2";


let supabaseClient = null;

let currentUser = null;
let currentSession = null;
let currentPage = "home";

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
   DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   HTML ESCAPE
========================================================= */

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


/* =========================================================
   HIDDEN
========================================================= */

function setHidden(element, hidden) {

    if (!element) {
        return;
    }

    element.classList.toggle(
        "hidden",
        Boolean(hidden)
    );
}


/* =========================================================
   AUTH MESSAGE
========================================================= */

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


/* =========================================================
   PROFILE MESSAGE
========================================================= */

function showProfileMessage(message, type) {

    if (!profileMessage) {
        return;
    }

    profileMessage.textContent =
        message || "";

    profileMessage.className =
        "modal-message";

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

    const footer =
        document.querySelector(".auth-footer");

    if (footer) {

        footer.innerHTML =
            "GAME PLATFORM <span>•</span> v" +
            APP_VERSION;

    }
}


/* =========================================================
   SUPABASE INIT
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

                loginTab.classList.add("active");

                if (registerTab) {
                    registerTab.classList.remove("active");
                }

                setHidden(loginForm, false);
                setHidden(registerForm, true);

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

                registerTab.classList.add("active");

                if (loginTab) {
                    loginTab.classList.remove("active");
                }

                setHidden(loginForm, true);
                setHidden(registerForm, false);

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

        showAuthMessage(
            "Вход выполнен.",
            "success"
        );

        await enterApplication();

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        let message =
            error && error.message
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

        showAuthMessage(
            "Аккаунт успешно создан.",
            "success"
        );

        await enterApplication();

    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        showAuthMessage(
            error && error.message
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
        async function (event, session) {

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

            if (currentUser) {

                await enterApplication();

            } else {

                leaveApplication();
            }

        }
    );
}


/* =========================================================
   INITIAL SESSION
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

    const defaultNickname =
        metadata.nickname ||
        (
            currentUser.email
                ? currentUser.email.split("@")[0]
                : "Player"
        );

    const defaultStatus =
        metadata.status ||
        "Онлайн";

    try {

        const selectResult =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();

        if (selectResult.error) {

            console.error(
                "Profile select error:",
                selectResult.error
            );

            profileData = {
                nickname: defaultNickname,
                status: defaultStatus,
                age: null,
                city: "",
                about: "",
                avatar_url: "",
                vip_level: 0
            };

            return;
        }

        if (selectResult.data) {

            profileData =
                Object.assign(
                    {
                        nickname: defaultNickname,
                        status: defaultStatus,
                        age: null,
                        city: "",
                        about: "",
                        avatar_url: "",
                        vip_level: 0
                    },
                    selectResult.data
                );

            return;
        }

        const insertResult =
            await supabaseClient
                .from("profiles")
                .insert({
                    id: currentUser.id,
                    nickname: defaultNickname,
                    status: defaultStatus,
                    age: null,
                    city: "",
                    about: "",
                    avatar_url: "",
                    vip_level: 0
                })
                .select()
                .single();

        if (insertResult.error) {

            console.error(
                "Profile insert error:",
                insertResult.error
            );

            profileData = {
                nickname: defaultNickname,
                status: defaultStatus,
                age: null,
                city: "",
                about: "",
                avatar_url: "",
                vip_level: 0
            };

            return;
        }

        profileData =
            insertResult.data || {
                nickname: defaultNickname,
                status: defaultStatus,
                age: null,
                city: "",
                about: "",
                avatar_url: "",
                vip_level: 0
            };

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        profileData = {
            nickname: defaultNickname,
            status: defaultStatus,
            age: null,
            city: "",
            about: "",
            avatar_url: "",
            vip_level: 0
        };
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


function renderAvatar(element, nickname, avatarUrl) {

    if (!element) {
        return;
    }

    element.innerHTML = "";

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
                    "";

                element.textContent =
                    getAvatarLetter(nickname);

            };

        element.appendChild(
            image
        );

        return;
    }

    element.textContent =
        getAvatarLetter(nickname);
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

    const number =
        Number(level) || 0;

    return roman[number] || "";
}


function createVipBadge(level) {

    const numericLevel =
        Number(level) || 0;

    if (numericLevel <= 0) {
        return "";
    }

    return (
        '<span class="vip-badge" ' +
        'title="VIP уровень ' +
        escapeHtml(numericLevel) +
        '">' +
        "VIP " +
        escapeHtml(
            getRomanVip(numericLevel)
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


    document
        .querySelectorAll(
            "[data-profile-nickname]"
        )
        .forEach(function (element) {

            element.textContent =
                nickname;

        });


    document
        .querySelectorAll(
            "[data-profile-status]"
        )
        .forEach(function (element) {

            element.textContent =
                status;

        });


    const nicknameElements = [
        $("header-nickname"),
        $("profile-nickname")
    ];

    nicknameElements.forEach(function (element) {

        if (element) {
            element.textContent =
                nickname;
        }

    });


    const statusElements = [
        $("header-status"),
        $("profile-status")
    ];

    statusElements.forEach(function (element) {

        if (element) {
            element.textContent =
                status;
        }

    });


    const avatarElements = [
        $("header-avatar"),
        $("profile-avatar")
    ];

    avatarElements.forEach(function (element) {

        renderAvatar(
            element,
            nickname,
            profileData.avatar_url || ""
        );

    });


    if (profileNicknameInput) {
        profileNicknameInput.value =
            nickname;
    }


    if (profileStatusInput) {
        profileStatusInput.value =
            status;
    }


    renderVipBadges();
}


/* =========================================================
   VIP BADGES
========================================================= */

function renderVipBadges() {

    const html =
        createVipBadge(
            profileData.vip_level
        );

    document
        .querySelectorAll(
            "[data-vip-badge]"
        )
        .forEach(function (element) {

            element.innerHTML =
                html;

        });
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

    showProfileMessage(
        "Сохранение...",
        "info"
    );

    try {

        const updateData = {
            nickname: nickname,
            status: status || "Онлайн",
            updated_at: new Date().toISOString()
        };


        const ageInput =
            $("profile-age-input");

        if (ageInput) {

            const ageValue =
                ageInput.value.trim();

            updateData.age =
                ageValue
                    ? Number(ageValue)
                    : null;
        }


        const cityInput =
            $("profile-city-input");

        if (cityInput) {

            updateData.city =
                cityInput.value.trim();
        }


        const aboutInput =
            $("profile-about-input");

        if (aboutInput) {

            updateData.about =
                aboutInput.value.trim();
        }


        const avatarInput =
            $("profile-avatar-input");

        if (avatarInput) {

            updateData.avatar_url =
                avatarInput.value.trim();
        }


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

    } catch (error) {

        console.error(
            "Save profile error:",
            error
        );

        showProfileMessage(
            error && error.message
                ? error.message
                : "Не удалось сохранить профиль."
        );
    }
}


/* =========================================================
   APPLICATION
========================================================= */

let applicationStarted = false;

async function enterApplication() {

    if (!currentUser) {
        return;
    }

    if (authScreen) {
        authScreen.style.display =
            "none";
    }

    if (appShell) {

        appShell.classList.add(
            "active"
        );

        appShell.style.display =
            "";
    }

    await ensureProfile();

    applyProfile();

    renderPage(
        currentPage
    );

    initGlobalPresence();

    applicationStarted = true;
}


function leaveApplication() {

    if (appShell) {

        appShell.classList.remove(
            "active"
        );

        appShell.style.display =
            "none";
    }

    if (authScreen) {
        authScreen.style.display =
            "";
    }

    stopChatRealtime();

    stopPresence();

    currentUser = null;
    currentSession = null;

    applicationStarted = false;
}


/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(function (button) {

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
                        .forEach(function (item) {

                            item.classList.toggle(
                                "active",
                                item.dataset.page === page
                            );

                        });

                    renderPage(page);

                }
            );

        });
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


    if (!title || !content) {
        return;
    }


    stopChatRealtime();


    if (page === "home") {

        title.textContent =
            "Главная";

        if (kicker) {
            kicker.textContent =
                "PLATFORM";
        }

        if (badge) {
            badge.textContent =
                "HOME";
        }

        content.innerHTML = `
            <div class="welcome-grid">

                <article class="info-card">
                    <div class="info-card-icon">◈</div>
                    <div>
                        <strong>Игры</strong>
                        <p>Каталог игр платформы.</p>
                    </div>
                </article>

                <article class="info-card">
                    <div class="info-card-icon">♜</div>
                    <div>
                        <strong>Гильдии</strong>
                        <p>Сообщества игроков внутри игр.</p>
                    </div>
                </article>

                <article class="info-card">
                    <div class="info-card-icon">◉</div>
                    <div>
                        <strong>Онлайн</strong>
                        <p>Сейчас игроков онлайн: ${presenceUsers.length}</p>
                    </div>
                </article>

            </div>
        `;

        return;
    }


    if (page === "games") {

        title.textContent =
            "Игры";

        if (kicker) {
            kicker.textContent =
                "GAME CATALOG";
        }

        if (badge) {
            badge.textContent =
                "GAMES";
        }

        content.innerHTML = `
            <div class="welcome-grid">

                <article class="info-card">
                    <div class="info-card-icon">◈</div>
                    <div>
                        <strong>World of Sea Battle</strong>
                        <p>Игровой раздел платформы.</p>
                        <button
                            type="button"
                            class="modal-primary-button"
                            id="wosb-button"
                        >
                            Открыть игру
                        </button>
                    </div>
                </article>

            </div>
        `;

        const gameButton =
            $("wosb-button");

        if (gameButton) {

            gameButton.addEventListener(
                "click",
                function () {

                    alert(
                        "Игровой раздел будет добавлен следующим этапом."
                    );

                }
            );

        }

        return;
    }


    if (page === "news") {

        title.textContent =
            "Новости";

        if (kicker) {
            kicker.textContent =
                "COMMUNITY";
        }

        if (badge) {
            badge.textContent =
                "NEWS";
        }

        content.innerHTML = `
            <div class="welcome-grid">

                <article class="info-card">
                    <div class="info-card-icon">◫</div>
                    <div>
                        <strong>Новости платформы</strong>
                        <p>Раздел готовится к наполнению.</p>
                    </div>
                </article>

            </div>
        `;

        return;
    }


    if (page === "online") {

        title.textContent =
            "Онлайн";

        if (kicker) {
            kicker.textContent =
                "COMMUNITY";
        }

        if (badge) {
            badge.textContent =
                "ONLINE";
        }

        content.innerHTML = `
            <div class="info-card">
                <div class="info-card-icon">◉</div>

                <div>
                    <strong>
                        Игроки онлайн:
                        <span id="online-page-count">
                            ${presenceUsers.length}
                        </span>
                    </strong>

                    <div
                        id="online-player-list"
                        style="margin-top:16px;"
                    ></div>
                </div>
            </div>
        `;

        renderOnlinePlayers();

        return;
    }


    if (page === "profile") {

        title.textContent =
            "Профиль";

        if (kicker) {
            kicker.textContent =
                "PLAYER";
        }

        if (badge) {
            badge.textContent =
                "PROFILE";
        }

        content.innerHTML = `
            <div class="welcome-grid">

                <article class="info-card">

                    <div
                        class="info-card-icon"
                        id="page-profile-avatar"
                    >
                        ${escapeHtml(
                            getAvatarLetter(
                                profileData.nickname
                            )
                        )}
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

                        <button
                            type="button"
                            class="modal-primary-button"
                            id="page-profile-edit"
                            style="margin-top:12px;"
                        >
                            Редактировать профиль
                        </button>

                    </div>

                </article>

            </div>
        `;

        renderVipBadges();

        const editButton =
            $("page-profile-edit");

        if (editButton) {

            editButton.addEventListener(
                "click",
                function () {

                    openProfileVip();

                }
            );
        }

        return;
    }


    if (page === "chat") {

        title.textContent =
            "Чат";

        if (kicker) {
            kicker.textContent =
                "COMMUNITY CHAT";
        }

        if (badge) {
            badge.textContent =
                "CHAT";
        }

        initSimpleChat();

        return;
    }


    title.textContent =
        "Главная";

    if (kicker) {
        kicker.textContent =
            "PLATFORM";
    }

    if (badge) {
        badge.textContent =
            "HOME";
    }

    content.innerHTML = "";
}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    const heroGames =
        $("hero-games-button");

    if (heroGames) {

        heroGames.addEventListener(
            "click",
            function () {

                const button =
                    document.querySelector(
                        '[data-page="games"]'
                    );

                if (button) {
                    button.click();
                }

            }
        );
    }


    const heroOnline =
        $("hero-online-button");

    if (heroOnline) {

        heroOnline.addEventListener(
            "click",
            function () {

                openModal(
                    "online-modal"
                );

                renderOnlinePlayers();

            }
        );
    }


    const headerOnline =
        $("header-online-button");

    if (headerOnline) {

        headerOnline.addEventListener(
            "click",
            function () {

                openModal(
                    "online-modal"
                );

                renderOnlinePlayers();

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
}


/* =========================================================
   MODALS
========================================================= */

function initModals() {

    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    closeModal(
                        button.dataset.closeModal
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(function (overlay) {

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

        });
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

function prepareProfileModal() {

    const modal =
        $("profile-modal");

    if (!modal) {
        return;
    }


    if (
        !profileNicknameInput ||
        !profileStatusInput
    ) {
        return;
    }


    if (!$("profile-age-input")) {

        const ageInput =
            document.createElement("input");

        ageInput.type =
            "number";

        ageInput.id =
            "profile-age-input";

        ageInput.min =
            "1";

        ageInput.max =
            "120";

        ageInput.placeholder =
            "Возраст";

        ageInput.className =
            profileNicknameInput.className ||
            "modal-input";

        profileStatusInput
            .parentNode
            .appendChild(ageInput);
    }


    if (!$("profile-city-input")) {

        const cityInput =
            document.createElement("input");

        cityInput.type =
            "text";

        cityInput.id =
            "profile-city-input";

        cityInput.placeholder =
            "Город";

        cityInput.className =
            profileNicknameInput.className ||
            "modal-input";

        profileStatusInput
            .parentNode
            .appendChild(cityInput);
    }


    if (!$("profile-avatar-input")) {

        const avatarInput =
            document.createElement("input");

        avatarInput.type =
            "url";

        avatarInput.id =
            "profile-avatar-input";

        avatarInput.placeholder =
            "Ссылка на фото";

        avatarInput.className =
            profileNicknameInput.className ||
            "modal-input";

        profileStatusInput
            .parentNode
            .appendChild(avatarInput);
    }


    if (!$("profile-about-input")) {

        const aboutInput =
            document.createElement("textarea");

        aboutInput.id =
            "profile-about-input";

        aboutInput.placeholder =
            "О себе";

        aboutInput.rows =
            4;

        aboutInput.className =
            profileNicknameInput.className ||
            "modal-input";

        profileStatusInput
            .parentNode
            .appendChild(aboutInput);
    }
}


function fillProfileModal() {

    if (profileNicknameInput) {

        profileNicknameInput.value =
            profileData.nickname || "";

    }


    if (profileStatusInput) {

        profileStatusInput.value =
            profileData.status || "";

    }


    const ageInput =
        $("profile-age-input");

    if (ageInput) {

        ageInput.value =
            profileData.age !== null &&
            profileData.age !== undefined
                ? profileData.age
                : "";
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


    showProfileMessage("");
}


function openOldProfileModal() {

    if (!currentUser) {
        return;
    }

    prepareProfileModal();

    fillProfileModal();

    openModal(
        "profile-modal"
    );
}


/* =========================================================
   PROFILE VIP BRIDGE
========================================================= */

function openProfileVip() {

    if (!currentUser) {
        return;
    }


    if (
        typeof window.openVipProfile ===
        "function"
    ) {

        try {

            window.openVipProfile(
                currentUser.id
            );

            return;

        } catch (error) {

            console.error(
                "VIP profile error:",
                error
            );

        }
    }


    openOldProfileModal();
}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

    if (!supabaseClient) {
        return;
    }

    try {

        await stopPresence();

        await leaveCall();

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


        await new Promise(function (resolve) {

            let resolved =
                false;

            presenceChannel.subscribe(
                async function (status) {

                    console.log(
                        "Presence status:",
                        status
                    );

                    if (
                        status === "SUBSCRIBED" &&
                        !resolved
                    ) {

                        resolved = true;

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
                                    0,

                                online_at:
                                    new Date().toISOString()
                            });

                        } catch (error) {

                            console.error(
                                "Presence track error:",
                                error
                            );
                        }

                        resolve();

                    }

                }
            );

        });

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

        const users = [];


        Object.keys(state)
            .forEach(function (key) {

                const entries =
                    state[key] || [];

                entries.forEach(function (entry) {

                    users.push(entry);

                });

            });


        const unique = {};

        users.forEach(function (user) {

            if (
                user &&
                user.user_id
            ) {

                unique[user.user_id] =
                    user;

            }

        });


        presenceUsers =
            Object.keys(unique)
                .map(function (key) {

                    return unique[key];

                });


        updateOnlineCounters();

        renderOnlinePlayers();

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
        "hero-online-count",
        "online-modal-count"
    ]
        .forEach(function (id) {

            const element =
                $(id);

            if (element) {

                element.textContent =
                    String(count);

            }

        });


    const pageCount =
        $("online-page-count");

    if (pageCount) {

        pageCount.textContent =
            String(count);

    }
}


function renderOnlinePlayers() {

    const list =
        $("online-player-list");

    if (!list) {
        return;
    }


    if (!presenceUsers.length) {

        list.innerHTML = `
            <div class="info-card">
                <strong>Никого нет онлайн</strong>
            </div>
        `;

        return;
    }


    list.innerHTML =
        presenceUsers
            .map(function (user) {

                const vip =
                    createVipBadge(
                        user.vip_level || 0
                    );

                return `
                    <div class="online-player">

                        <div class="mini-avatar">
                            ${escapeHtml(
                                getAvatarLetter(
                                    user.nickname || "P"
                                )
                            )}
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

                            ${vip}

                        </div>

                    </div>
                `;

            })
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

        await supabaseClient.removeChannel(
            presenceChannel
        );

    } catch (error) {

        console.error(
            "Stop presence error:",
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

async function initSimpleChat() {

    const content =
        $("page-content");

    if (!content) {
        return;
    }


    content.innerHTML = `
        <div class="chat-layout">

            <div
                class="chat-messages"
                id="chat-messages"
            >
                <div class="info-card">
                    <div class="info-card-icon">◌</div>
                    <div>
                        <strong>Загрузка чата...</strong>
                        <p>Подключение к Realtime.</p>
                    </div>
                </div>
            </div>

            <form
                class="chat-input-row"
                id="chat-form"
            >

                <input
                    type="text"
                    id="chat-input"
                    placeholder="Введите сообщение..."
                    maxlength="1000"
                    autocomplete="off"
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
            "Chat load error:",
            result.error.message
        );

        const container =
            $("chat-messages");

        if (container) {

            container.innerHTML = `
                <div class="info-card">
                    <strong>Чат пока не настроен</strong>
                    <p>
                        Проверь таблицу chat_messages в Supabase.
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
                <strong>Пока нет сообщений.</strong>
                <p>Напишите первое сообщение.</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        messages
            .map(function (message) {

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

            })
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
        supabaseClient
            .channel(
                "global-chat-" +
                Date.now()
            )
            .on(
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

        supabaseClient.removeChannel(
            chatChannel
        );

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
            error && error.message
                ? error.message
                : "Не удалось отправить сообщение."
        );
    }
}


/* =========================================================
   VIDEO
========================================================= */

async function startCall(roomName) {

    if (!currentUser) {
        return;
    }


    callRoom =
        roomName || "global";


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
        .forEach(function (track) {

            track.enabled =
                micEnabled;

        });


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
        .forEach(function (track) {

            track.enabled =
                cameraEnabled;

        });


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
            "Браузер не поддерживает демонстрацию экрана."
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
                    .forEach(function (track) {

                        track.stop();

                    });
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
            .forEach(function (track) {

                track.stop();

            });
    }


    localStream =
        null;


    if (screenStream) {

        screenStream
            .getTracks()
            .forEach(function (track) {

                track.stop();

            });
    }


    screenStream =
        null;


    Object.keys(peerConnections)
        .forEach(function (key) {

            try {

                peerConnections[key].close();

            } catch (error) {

                console.error(
                    error
                );

            }

        });


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


/* =========================================================
   CALL BUTTONS
========================================================= */

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
   STARTUP
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /* ---------------------------------------------
           DOM
        --------------------------------------------- */

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


        /* ---------------------------------------------
           Initial state
        --------------------------------------------- */

        updateVersion();


        if (appShell) {

            appShell.style.display =
                "none";
        }


        /* ---------------------------------------------
           UI
        --------------------------------------------- */

        initAuthTabs();

        initForms();

        initNavigation();

        initModals();

        initButtons();

        initCallButtons();


        /* ---------------------------------------------
           Supabase
        --------------------------------------------- */

        const supabaseReady =
            initSupabase();


        if (!supabaseReady) {

            showAuthMessage(
                "Не удалось загрузить Supabase."
            );

            return;
        }


        /* ---------------------------------------------
           AUTH
        --------------------------------------------- */

        subscribeAuthState();

        await loadInitialSession();


        /* ---------------------------------------------
           PROFILE BUTTONS
        --------------------------------------------- */

        const profileButton =
            $("profile-edit-button");


        if (profileButton) {

            profileButton.addEventListener(
                "click",
                function () {

                    openProfileVip();

                }
            );

        }


        const headerProfile =
            $("header-profile-button");


        if (headerProfile) {

            headerProfile.addEventListener(
                "click",
                function () {

                    openProfileVip();

                }
            );

        }


        prepareProfileModal();


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

    openProfile: openProfileVip,

    openModal: openModal,

    closeModal: closeModal,

    renderPage: renderPage

};
