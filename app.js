```javascript
/* =========================================================
   GAME PLATFORM
   SUPABASE AUTH
   PROFILE
   PRESENCE
   GLOBAL / GAME / GUILD CHAT
   WEBRTC VIDEO CONFERENCE
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

let currentChatRoom = "global";


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

let authScreen;

let appShell;

let authTitle;

let authSubtitle;

let loginTab;

let registerTab;

let loginForm;

let registerForm;

let authMessage;

let loginEmail;

let loginPassword;

let registerNickname;

let registerEmail;

let registerPassword;

let registerPasswordConfirm;

let logoutButton;

let profileForm;

let profileNicknameInput;

let profileStatusInput;

let profileMessage;


/* =========================================================
   HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
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


function showAuthMessage(message, type = "error") {

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


function showProfileMessage(message, type = "error") {

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


function setHidden(element, hidden) {

    if (!element) {
        return;
    }

    element.classList.toggle(
        "hidden",
        hidden
    );
}


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

                registerTab.classList.add("active");

                if (loginTab) {
                    loginTab.classList.remove("active");
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
   AUTH FORMS
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
            "Supabase ещё не инициализирован."
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
            result.data.session;

        currentUser =
            result.data.user;


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
            error.message ||
            "Не удалось выполнить вход.";


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
            "Supabase ещё не инициализирован."
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
            result.data.session;

        currentUser =
            result.data.user;


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
            error.message ||
            "Не удалось создать аккаунт."
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
                session
                    ? session.user
                    : null;


            if (
                session &&
                session.user
            ) {

                await enterApplication();

            } else {

                leaveApplication();

            }

        }
    );

}


/* =========================================================
   LOAD SESSION
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


        if (
            currentSession &&
            currentUser
        ) {

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

    if (!currentUser || !supabaseClient) {
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
                nickname: nickname,
                status: status,
                vip_level: 0
            };

            applyProfile();

            return;

        }


        if (selectResult.data) {

            profileData =
                selectResult.data;

            return;

        }


        const insertResult =
            await supabaseClient
                .from("profiles")
                .insert({

                    id: currentUser.id,

                    nickname: nickname,

                    status: status,

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
                nickname: nickname,
                status: status,
                vip_level: 0
            };

            applyProfile();

            return;

        }


        profileData =
            insertResult.data ||
            {
                nickname: nickname,
                status: status,
                vip_level: 0
            };


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );


        profileData = {
            nickname: nickname,
            status: status,
            vip_level: 0
        };

    }

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


    const avatarElements = [

        $("header-avatar"),

        $("profile-avatar")

    ];


    avatarElements.forEach(
        function (element) {

            if (!element) {
                return;
            }


            if (profileData.avatar_url) {

                element.innerHTML =
                    '<img src="' +
                    escapeHtml(
                        profileData.avatar_url
                    ) +
                    '" alt="Avatar">';

            } else {

                element.textContent =
                    getAvatarLetter(nickname);

            }

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

}


function getAvatarLetter(nickname) {

    const value =
        String(nickname || "P").trim();


    if (!value) {
        return "P";
    }


    return value
        .charAt(0)
        .toUpperCase();

}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

    if (!currentUser || !supabaseClient) {

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

        const result =
            await supabaseClient
                .from("profiles")
                .update({

                    nickname: nickname,

                    status:
                        status || "Онлайн",

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
            result.data;


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
            error.message ||
            "Не удалось сохранить профиль."
        );

    }

}


/* =========================================================
   APPLICATION
========================================================= */

async function enterApplication() {

    if (!currentUser) {
        return;
    }


    if (authScreen) {
        authScreen.style.display =
            "none";
    }


    if (appShell) {
        appShell.classList.add("active");
        appShell.style.display =
            "";
    }


    await ensureProfile();


    applyProfile();


    renderPage(
        currentPage
    );


    initGlobalPresence();

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


    currentUser =
        null;

    currentSession =
        null;


    if (presenceChannel) {

        try {

            supabaseClient
                .removeChannel(
                    presenceChannel
                );

        } catch (error) {

            console.error(
                error
            );

        }

        presenceChannel =
            null;

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


                        renderPage(page);

                    }
                );

            }
        );

}


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
                            Игры
                        </strong>

                        <p>
                            Каталог игр платформы.
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
                            Сообщества игроков
                            внутри игр.
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
                            Игровой раздел находится
                            в разработке.
                        </p>

                    </div>

                </article>

            </div>

        `;

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
                            Новости платформы
                        </strong>

                        <p>
                            Раздел готовится
                            к наполнению.
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

            <div class="welcome-grid">

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
                            ${presenceUsers.length}
                        </p>

                    </div>

                </article>

            </div>

        `;

        renderOnlinePlayers();

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

                    <div class="info-card-icon">
                        ◎
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

                    </div>

                </article>

            </div>

        `;

        return;

    }


    if (page === "chat") {

        title.textContent =
            "Чат";

        kicker.textContent =
            "COMMUNITY CHAT";

        badge.textContent =
            "CHAT";


        content.innerHTML = `

            <div class="info-card">

                <div class="info-card-icon">
                    ◌
                </div>

                <div>

                    <strong>
                        Глобальный чат
                    </strong>

                    <p>
                        Чат будет подключён
                        к Realtime.
                    </p>

                </div>

            </div>

        `;

        initSimpleChat();

        return;

    }

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

            }
        );

    }


    const youtubeButtons = [

        $("youtube-button"),

        $("right-youtube-button")

    ];


    youtubeButtons.forEach(
        function (button) {

            if (button) {

                button.addEventListener(
                    "click",
                    function () {

                        window.open(
                            "https://www.youtube.com/",
                            "_blank",
                            "noopener"
                        );

                    }
                );

            }

        }
    );


    const twitchButtons = [

        $("twitch-button"),

        $("right-twitch-button")

    ];


    twitchButtons.forEach(
        function (button) {

            if (button) {

                button.addEventListener(
                    "click",
                    function () {

                        window.open(
                            "https://www.twitch.tv/",
                            "_blank",
                            "noopener"
                        );

                    }
                );

            }

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

function openOldProfileModal() {

    if (!currentUser) {
        return;
    }


    if (profileNicknameInput) {

        profileNicknameInput.value =
            profileData.nickname ||
            "";

    }


    if (profileStatusInput) {

        profileStatusInput.value =
            profileData.status ||
            "";

    }


    showProfileMessage("");


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

            await supabaseClient
                .removeChannel(
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


        presenceChannel
            .on(
                "presence",
                {
                    event: "sync"
                },
                function () {

                    updatePresenceUsers();

                }
            );


        presenceChannel
            .on(
                "presence",
                {
                    event: "join"
                },
                function () {

                    updatePresenceUsers();

                }
            );


        presenceChannel
            .on(
                "presence",
                {
                    event: "leave"
                },
                function () {

                    updatePresenceUsers();

                }
            );


        const status =
            await presenceChannel.subscribe(
                async function (status) {

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

                            online_at:
                                new Date().toISOString()

                        });

                    }

                }
            );


        console.log(
            "Presence:",
            status
        );


    } catch (error) {

        console.error(
            "Presence error:",
            error
        );

    }

}


async function updatePresenceUsers() {

    if (!presenceChannel) {
        return;
    }


    try {

        const state =
            presenceChannel.presenceState();


        const users = [];


        Object.keys(state)
            .forEach(
                function (key) {

                    const entries =
                        state[key] || [];


                    entries.forEach(
                        function (entry) {

                            users.push(entry);

                        }
                    );

                }
            );


        presenceUsers =
            users;


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


    const ids = [

        "online-header-count",

        "online-side-count",

        "hero-online-count",

        "online-modal-count"

    ];


    ids.forEach(
        function (id) {

            const element =
                $(id);

            if (element) {

                element.textContent =
                    count;

            }

        }
    );

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

                <strong>
                    Никого нет онлайн
                </strong>

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
                                ${escapeHtml(
                                    getAvatarLetter(
                                        user.nickname ||
                                        "P"
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

        await supabaseClient
            .removeChannel(
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
   SIMPLE CHAT
========================================================= */

function initSimpleChat() {

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

                    <div class="info-card-icon">
                        ◌
                    </div>

                    <div>

                        <strong>
                            Глобальный чат
                        </strong>

                        <p>
                            Realtime-чат готов
                            к подключению.
                        </p>

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


    loadChatMessages();

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

    }

}


/* =========================================================
   VIDEO CONFERENCE
========================================================= */

async function startCall(roomName = "global") {

    if (!currentUser) {
        return;
    }


    callRoom =
        roomName;


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
            "Не удалось получить доступ к камере или микрофону."
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


async function toggleMicrophone() {

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


async function toggleCamera() {

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

    if (!navigator.mediaDevices) {
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


            const screenTrack =
                screenStream.getVideoTracks()[0];


            if (screenTrack) {

                screenTrack.onended =
                    function () {

                        screenSharing =
                            false;

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

                    peerConnections[key]
                        .close();

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

            await supabaseClient
                .removeChannel(
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
   PROFILE VIP BRIDGE
========================================================= */

function openProfileVip() {

    if (
        typeof window.openVipProfile ===
        "function"
    ) {

        window.openVipProfile(
            currentUser
                ? currentUser.id
                : null
        );

        return;

    }


    openOldProfileModal();

}


/* =========================================================
   DOM READY
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
           Version
        --------------------------------------------- */

        updateVersion();


        /* ---------------------------------------------
           Initial application state
        --------------------------------------------- */

        if (appShell) {

            appShell.style.display =
                "none";

        }


        /* ---------------------------------------------
           Auth UI
        --------------------------------------------- */

        initAuthTabs();

        initForms();

        initNavigation();

        initModals();

        initButtons();

        initCallButtons();


        /* ---------------------------------------------
           Supabase check
        --------------------------------------------- */

        if (
            !window.supabase ||
            typeof window.supabase.createClient !==
            "function"
        ) {

            console.error(
                "Supabase JS library is not loaded."
            );


            showAuthMessage(
                "Не удалось загрузить библиотеку Supabase."
            );

            return;

        }


        /* ---------------------------------------------
           Create Supabase client
        --------------------------------------------- */

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


            window.supabaseClient =
                supabaseClient;


            window.gamePlatformSupabase =
                supabaseClient;


        } catch (error) {

            console.error(
                "Supabase initialization error:",
                error
            );


            showAuthMessage(
                "Ошибка подключения Supabase: " +
                error.message
            );

            return;

        }


        /* ---------------------------------------------
           Auth
        --------------------------------------------- */

        subscribeAuthState();

        await loadInitialSession();


        /* ---------------------------------------------
           Other
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

    }
);


/* =========================================================
   DEBUG
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

    openProfile: openProfileVip

};
```
