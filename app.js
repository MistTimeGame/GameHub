/* =========================================================
   GAME PLATFORM
   SUPABASE AUTH
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";


/* =========================================================
   APP CONFIG
========================================================= */

const APP_VERSION = "1.6.1";

let supabaseClient = null;

let currentUser = null;
let currentSession = null;

let currentPage = "home";


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

const onlineModal =
    document.getElementById("online-modal");

const profileModal =
    document.getElementById("profile-modal");

const profileForm =
    document.getElementById("profile-form");

const pageTitle =
    document.getElementById("page-title");

const pageKicker =
    document.getElementById("page-kicker");

const pageBadge =
    document.getElementById("page-badge");

const pageContent =
    document.getElementById("page-content");


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        updateVersion();

        initNavigation();

        initAuthTabs();

        initForms();

        initModals();

        initButtons();


        if (
            !window.supabase ||
            typeof window.supabase.createClient !== "function"
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
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    }
                );

        } catch (error) {

            console.error(
                "Supabase initialization error:",
                error
            );

            showAuthMessage(
                "Ошибка подключения к Supabase.",
                "error"
            );

            return;
        }


        subscribeToAuthChanges();

        await loadInitialSession();

    }
);


/* =========================================================
   INITIAL SESSION
========================================================= */

async function loadInitialSession() {

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "getSession error:",
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

    } catch (error) {

        console.error(
            "Session loading error:",
            error
        );

        showAuthMessage(
            "Ошибка загрузки авторизации.",
            "error"
        );

        showAuthScreen();

    }
}


/* =========================================================
   AUTH STATE
========================================================= */

function subscribeToAuthChanges() {

    const {
        data
    } =
        supabaseClient.auth.onAuthStateChange(
            (event, session) => {

                currentSession =
                    session || null;

                currentUser =
                    session
                        ? session.user
                        : null;


                console.log(
                    "Supabase Auth:",
                    event
                );


                if (session) {

                    setTimeout(
                        () => {
                            enterApplication();
                        },
                        0
                    );

                } else {

                    showAuthScreen();

                }

            }
        );


    if (
        data &&
        data.subscription
    ) {

        window.addEventListener(
            "beforeunload",
            () => {

                data.subscription.unsubscribe();

            }
        );

    }
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


    profileForm.addEventListener(
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

    if (!supabaseClient) {
        return;
    }


    const email =
        document
            .getElementById("login-email")
            .value
            .trim();


    const password =
        document
            .getElementById("login-password")
            .value;


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
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });


        if (error) {

            console.error(
                "Login error:",
                error
            );

            showAuthMessage(
                translateSupabaseError(error),
                "error"
            );

            return;
        }


        currentSession =
            data.session || null;

        currentUser =
            data.user || null;


        if (!currentUser) {

            showAuthMessage(
                "Вход не выполнен. Попробуйте ещё раз.",
                "error"
            );

            return;
        }


        await enterApplication();


    } catch (error) {

        console.error(
            "Login exception:",
            error
        );

        showAuthMessage(
            "Произошла ошибка при входе.",
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

    if (!supabaseClient) {
        return;
    }


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


    const passwordConfirm =
        document
            .getElementById(
                "register-password-confirm"
            )
            .value;


    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (nickname.length < 3) {

        showAuthMessage(
            "Никнейм должен содержать минимум 3 символа.",
            "error"
        );

        return;
    }


    if (nickname.length > 24) {

        showAuthMessage(
            "Никнейм должен содержать максимум 24 символа.",
            "error"
        );

        return;
    }


    if (!/^[a-zA-Zа-яА-Я0-9_.\- ]+$/.test(nickname)) {

        showAuthMessage(
            "Никнейм содержит недопустимые символы.",
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


    if (password !== passwordConfirm) {

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


    try {

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

                        nickname:
                            nickname,

                        status:
                            "Онлайн"

                    },

                    emailRedirectTo:
                        redirectUrl

                }

            });


        if (error) {

            console.error(
                "Registration error:",
                error
            );

            showAuthMessage(
                translateSupabaseError(error),
                "error"
            );

            return;
        }


        /*
          Supabase может создать пользователя,
          но не открыть session, если включено
          подтверждение email.
        */

        if (
            data &&
            data.user &&
            !data.session
        ) {

            showAuthMessage(
                "Регистрация выполнена. Проверьте почту и подтвердите email.",
                "success"
            );

            registerForm.reset();

            return;
        }


        if (
            data &&
            data.session
        ) {

            currentSession =
                data.session;

            currentUser =
                data.user;


            await enterApplication();

            return;
        }


        showAuthMessage(
            "Аккаунт создан. Проверьте почту.",
            "success"
        );


    } catch (error) {

        console.error(
            "Registration exception:",
            error
        );

        showAuthMessage(
            "Произошла ошибка при регистрации.",
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


    authScreen.style.display =
        "none";


    appShell.classList.add(
        "visible"
    );


    applyUserToInterface();


    renderPage(
        currentPage
    );


    await refreshOnline();

}


/* =========================================================
   SHOW AUTH SCREEN
========================================================= */

function showAuthScreen() {

    appShell.classList.remove(
        "visible"
    );


    authScreen.style.display =
        "flex";

}


/* =========================================================
   USER DATA
========================================================= */

function getUserNickname() {

    if (!currentUser) {
        return "Player";
    }


    const metadata =
        currentUser.user_metadata || {};


    return (
        metadata.nickname ||
        (
            currentUser.email
                ? currentUser.email.split("@")[0]
                : "Player"
        )
    );
}


function getUserStatus() {

    if (!currentUser) {
        return "Онлайн";
    }


    const metadata =
        currentUser.user_metadata || {};


    return (
        metadata.status ||
        "Онлайн"
    );
}


/* =========================================================
   APPLY USER TO INTERFACE
========================================================= */

function applyUserToInterface() {

    const nickname =
        getUserNickname();


    const status =
        getUserStatus();


    const firstLetter =
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
            firstLetter;
    }


    if (profileAvatar) {
        profileAvatar.textContent =
            firstLetter;
    }

}


/* =========================================================
   PROFILE
========================================================= */

function openProfile() {

    if (!currentUser) {
        return;
    }


    document.getElementById(
        "profile-nickname-input"
    ).value =
        getUserNickname();


    document.getElementById(
        "profile-status-input"
    ).value =
        getUserStatus();


    document.getElementById(
        "profile-message"
    ).textContent =
        "";


    document.getElementById(
        "profile-message"
    ).className =
        "modal-message";


    openModal(
        "profile-modal"
    );

}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return;
    }


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
            "Никнейм должен содержать минимум 3 символа.";

        message.className =
            "modal-message error";

        return;
    }


    if (nickname.length > 24) {

        message.textContent =
            "Никнейм должен содержать максимум 24 символа.";

        message.className =
            "modal-message error";

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.updateUser({

                data: {

                    nickname:
                        nickname,

                    status:
                        status

                }

            });


        if (error) {

            console.error(
                "Profile update error:",
                error
            );

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


        applyUserToInterface();

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


    } catch (error) {

        console.error(
            "Profile exception:",
            error
        );

        message.textContent =
            "Не удалось сохранить профиль.";

        message.className =
            "modal-message error";

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {

    const tiles =
        document.querySelectorAll(
            ".side-tile[data-page]"
        );


    tiles.forEach(
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


function openPage(page) {

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

}


/* =========================================================
   PAGE RENDER
========================================================= */

function renderPage(page) {

    const pages = {

        home: {

            kicker:
                "PLATFORM",

            title:
                "Главная",

            badge:
                "HOME",

            html: `
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
                                Здесь будут реальные пользователи
                                платформы.
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
                                Онлайн и чат подключим через
                                Supabase Realtime.
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

            html: `
                <div class="welcome-grid">

                    <article class="info-card">

                        <div class="info-card-icon">
                            ◈
                        </div>

                        <div>

                            <strong>
                                Каталог игр
                            </strong>

                            <p>
                                Здесь будет список игр платформы.
                                После выбора игры откроются
                                сообщества и гильдии.
                            </p>

                        </div>

                    </article>

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

            html: `
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
                                Здесь будут новости платформы
                                и игровых сообществ.
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

            html: `
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
                                Нажмите на кнопку онлайн,
                                чтобы открыть список игроков.
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

            html: `
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
                "CHAT",

            html: `
                <div class="welcome-grid">

                    <article class="info-card">

                        <div class="info-card-icon">
                            ◌
                        </div>

                        <div>

                            <strong>
                                Realtime Chat
                            </strong>

                            <p>
                                Следующим этапом подключим
                                настоящий чат между пользователями
                                через Supabase Realtime.
                            </p>

                        </div>

                    </article>

                </div>
            `
        }

    };


    const config =
        pages[page] ||
        pages.home;


    pageKicker.textContent =
        config.kicker;


    pageTitle.textContent =
        config.title;


    pageBadge.textContent =
        config.badge;


    pageContent.innerHTML =
        config.html;

}


/* =========================================================
   ONLINE
=========================================================

   Пока Realtime Presence не подключён.
   Сейчас показываем авторизованного пользователя.
   После подключения сервера/Realtime здесь появятся
   все реально находящиеся онлайн пользователи.

========================================================= */

async function refreshOnline() {

    const count =
        currentUser
            ? 1
            : 0;


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

    const list =
        document.getElementById(
            "online-player-list"
        );


    if (!list) {
        return;
    }


    if (!currentUser) {

        list.innerHTML = `
            <div class="online-player">

                <div class="online-player-copy">

                    <strong>
                        Сейчас никто не онлайн
                    </strong>

                    <span>
                        Войдите в аккаунт
                    </span>

                </div>

            </div>
        `;

        return;
    }


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


    list.innerHTML = `
        <div class="online-player">

            <div class="online-player-avatar">
                ${escapeHtml(letter)}
            </div>

            <div class="online-player-copy">

                <strong>
                    ${escapeHtml(nickname)}
                </strong>

                <span>
                    ${escapeHtml(status)}
                </span>

            </div>

            <div class="online-player-status">

                <span class="status-dot"></span>

                ONLINE

            </div>

        </div>
    `;

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
                            event.target === overlay
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

    const modal =
        document.getElementById(id);


    if (!modal) {
        return;
    }


    modal.classList.add(
        "open"
    );

}


function closeModal(id) {

    const modal =
        document.getElementById(id);


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );

}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    const headerOnlineButton =
        document.getElementById(
            "header-online-button"
        );


    if (headerOnlineButton) {

        headerOnlineButton.addEventListener(
            "click",
            openOnlinePlayers
        );

    }


    const heroOnlineButton =
        document.getElementById(
            "hero-online-button"
        );


    if (heroOnlineButton) {

        heroOnlineButton.addEventListener(
            "click",
            openOnlinePlayers
        );

    }


    const heroGamesButton =
        document.getElementById(
            "hero-games-button"
        );


    if (heroGamesButton) {

        heroGamesButton.addEventListener(
            "click",
            () => {

                openPage(
                    "games"
                );

            }
        );

    }


    const headerProfileButton =
        document.getElementById(
            "header-profile-button"
        );


    if (headerProfileButton) {

        headerProfileButton.addEventListener(
            "click",
            openProfile
        );

    }


    const profileEditButton =
        document.getElementById(
            "profile-edit-button"
        );


    if (profileEditButton) {

        profileEditButton.addEventListener(
            "click",
            openProfile
        );

    }


    const youtubeButton =
        document.getElementById(
            "youtube-button"
        );


    if (youtubeButton) {

        youtubeButton.addEventListener(
            "click",
            () => {

                openSocial(
                    "youtube"
                );

            }
        );

    }


    const twitchButton =
        document.getElementById(
            "twitch-button"
        );


    if (twitchButton) {

        twitchButton.addEventListener(
            "click",
            () => {

                openSocial(
                    "twitch"
                );

            }
        );

    }


    const rightYoutubeButton =
        document.getElementById(
            "right-youtube-button"
        );


    if (rightYoutubeButton) {

        rightYoutubeButton.addEventListener(
            "click",
            () => {

                openSocial(
                    "youtube"
                );

            }
        );

    }


    const rightTwitchButton =
        document.getElementById(
            "right-twitch-button"
        );


    if (rightTwitchButton) {

        rightTwitchButton.addEventListener(
            "click",
            () => {

                openSocial(
                    "twitch"
                );

            }
        );

    }


    const logoutButton =
        document.getElementById(
            "logout-button"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutUser
        );

    }

}


/* =========================================================
   ONLINE MODAL
========================================================= */

function openOnlinePlayers() {

    renderOnlinePlayers();

    openModal(
        "online-modal"
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

        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {

            console.error(
                "Logout error:",
                error
            );

            return;
        }


        currentUser = null;

        currentSession = null;


        showAuthScreen();


    } catch (error) {

        console.error(
            "Logout exception:",
            error
        );

    }

}


/* =========================================================
   SOCIAL
========================================================= */

function openSocial(type) {

    const urls = {

        youtube:
            "https://www.youtube.com/",

        twitch:
            "https://www.twitch.tv/"

    };


    if (!urls[type]) {
        return;
    }


    window.open(
        urls[type],
        "_blank",
        "noopener,noreferrer"
    );

}


/* =========================================================
   AUTH MESSAGES
========================================================= */

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


/* =========================================================
   LOADING
========================================================= */

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


        button.dataset.originalText =
            button.innerHTML;


        button.innerHTML =
            "<span>Подождите...</span>";

    } else {

        button.disabled =
            false;


        button.innerHTML =
            button.dataset.originalText ||
            "<span>Продолжить</span>";

    }

}


/* =========================================================
   SUPABASE ERROR TRANSLATION
========================================================= */

function translateSupabaseError(
    error
) {

    const rawMessage =
        error?.message || "";


    const message =
        String(
            rawMessage
        ).toLowerCase();


    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "Неверный email или пароль."
        );

    }


    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        return (
            "Email ещё не подтверждён. Проверьте почту."
        );

    }


    if (
        message.includes(
            "user already registered"
        )
    ) {

        return (
            "Пользователь с таким email уже зарегистрирован."
        );

    }


    if (
        message.includes(
            "password"
        ) &&
        message.includes(
            "6"
        )
    ) {

        return (
            "Пароль должен содержать минимум 6 символов."
        );

    }


    if (
        message.includes(
            "rate limit"
        )
    ) {

        return (
            "Слишком много запросов. Попробуйте позже."
        );

    }


    if (
        message.includes(
            "invalid"
        ) &&
        message.includes(
            "email"
        )
    ) {

        return (
            "Проверьте правильность email."
        );

    }


    if (
        message.includes(
            "network"
        )
    ) {

        return (
            "Ошибка сети. Проверьте подключение к интернету."
        );

    }


    if (rawMessage) {

        return rawMessage;

    }


    return (
        "Произошла ошибка. Попробуйте ещё раз."
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

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


    logout() {

        return logoutUser();

    }

};
