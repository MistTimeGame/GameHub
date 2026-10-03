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

const APP_VERSION =
    "1.7.2";


/* =========================================================
   GLOBAL STATE
========================================================= */

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


/* =========================================================
   PRESENCE
========================================================= */

let presenceChannel = null;

let presenceUsers = {};

let presenceReady = false;


/* =========================================================
   CHAT
========================================================= */

let currentChatRoom = {
    type: "global",
    gameId: null,
    guildId: null
};

let chatChannel = null;

let chatMessages = [];

let chatSubscriptionReady = false;


/* =========================================================
   WEBRTC
========================================================= */

let callChannel = null;

let localStream = null;

let screenStream = null;

let peerConnections = {};

let callRoomId = null;

let callParticipants = {};

let microphoneEnabled = true;

let cameraEnabled = true;

let screenSharing = false;


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

const authMessage =
    document.getElementById("auth-message");

const authTitle =
    document.getElementById("auth-title");

const authSubtitle =
    document.getElementById("auth-subtitle");

const logoutButton =
    document.getElementById("logout-button");

const profileForm =
    document.getElementById("profile-form");


/* =========================================================
   BASIC HELPERS
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


function getInitials(name) {

    const text =
        String(name || "Player")
            .trim();

    if (!text) {
        return "?";
    }

    const parts =
        text
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 1) {
        return parts[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined
            ? ""
            : value;
}


function showAuthMessage(message, type = "error") {

    if (!authMessage) {
        return;
    }

    authMessage.textContent =
        message || "";

    authMessage.className =
        "auth-message " +
        type;
}


function clearAuthMessage() {

    if (!authMessage) {
        return;
    }

    authMessage.textContent = "";

    authMessage.className =
        "auth-message";
}


function showModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add("open");
}


function hideModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("open");
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


    document
        .querySelectorAll(".auth-footer")
        .forEach(function (element) {

            const spans =
                element.querySelectorAll("span");

            if (spans.length > 0) {
                spans[0].nextSibling.textContent =
                    " v" + APP_VERSION;
            }

        });
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

                if (loginForm) {
                    loginForm.classList.remove("hidden");
                }

                if (registerForm) {
                    registerForm.classList.add("hidden");
                }

                if (authTitle) {
                    authTitle.textContent =
                        "Добро пожаловать";
                }

                if (authSubtitle) {
                    authSubtitle.textContent =
                        "Войдите в свой игровой профиль";
                }

                clearAuthMessage();

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

                if (registerForm) {
                    registerForm.classList.remove("hidden");
                }

                if (loginForm) {
                    loginForm.classList.add("hidden");
                }

                if (authTitle) {
                    authTitle.textContent =
                        "Создать профиль";
                }

                if (authSubtitle) {
                    authSubtitle.textContent =
                        "Присоединитесь к игровому сообществу";
                }

                clearAuthMessage();

            }
        );

    }

}


/* =========================================================
   INIT FORMS
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


    const emailInput =
        document.getElementById("login-email");

    const passwordInput =
        document.getElementById("login-password");


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";


    if (!email || !password) {

        showAuthMessage(
            "Введите email и пароль."
        );

        return;
    }


    clearAuthMessage();


    const submitButton =
        loginForm
            ? loginForm.querySelector(
                'button[type="submit"]'
            )
            : null;


    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Вход...";
    }


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
            throw error;
        }


        currentSession =
            data.session || null;

        currentUser =
            data.user || null;


        if (!currentUser) {

            throw new Error(
                "Supabase не вернул пользователя."
            );

        }


        await enterApplication();

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showAuthMessage(
            error.message ||
            "Не удалось войти."
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Войти";

        }

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


    const nicknameInput =
        document.getElementById(
            "register-nickname"
        );

    const emailInput =
        document.getElementById(
            "register-email"
        );

    const passwordInput =
        document.getElementById(
            "register-password"
        );

    const confirmInput =
        document.getElementById(
            "register-password-confirm"
        );


    const nickname =
        nicknameInput
            ? nicknameInput.value.trim()
            : "";

    const email =
        emailInput
            ? emailInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";

    const confirmPassword =
        confirmInput
            ? confirmInput.value
            : "";


    if (!nickname) {

        showAuthMessage(
            "Введите никнейм."
        );

        return;
    }


    if (password !== confirmPassword) {

        showAuthMessage(
            "Пароли не совпадают."
        );

        return;
    }


    if (password.length < 6) {

        showAuthMessage(
            "Пароль должен содержать минимум 6 символов."
        );

        return;
    }


    clearAuthMessage();


    const submitButton =
        registerForm
            ? registerForm.querySelector(
                'button[type="submit"]'
            )
            : null;


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Создание...";

    }


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

                    emailRedirectTo:
                        redirectUrl,

                    data: {

                        nickname,

                        status: "Онлайн"

                    }

                }

            });


        if (error) {
            throw error;
        }


        currentSession =
            data.session || null;

        currentUser =
            data.user || null;


        if (data.session) {

            await enterApplication();

        } else {

            showAuthMessage(
                "Аккаунт создан. Проверьте почту для подтверждения.",
                "success"
            );

        }

    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        showAuthMessage(
            error.message ||
            "Не удалось создать аккаунт."
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Создать аккаунт";

        }

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
        async function (
            event,
            session
        ) {

            currentSession =
                session || null;

            currentUser =
                session
                    ? session.user
                    : null;


            if (session && session.user) {

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

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {
            throw error;
        }


        currentSession =
            data.session || null;

        currentUser =
            data.session
                ? data.session.user
                : null;


        if (currentSession && currentUser) {

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
   ENTER APPLICATION
========================================================= */

async function enterApplication() {

    if (!currentUser) {
        return;
    }


    if (authScreen) {
        authScreen.classList.add("hidden");
    }


    if (appShell) {
        appShell.classList.add("visible");
    }


    await ensureProfile();

    applyProfile();

    renderPage(currentPage);

    initGlobalPresence();

}


/* =========================================================
   LEAVE APPLICATION
========================================================= */

function leaveApplication() {

    currentUser = null;

    currentSession = null;

    profileData = {
        nickname: "Player",
        status: "Онлайн",
        age: null,
        city: "",
        about: "",
        avatar_url: "",
        vip_level: 0
    };


    if (appShell) {
        appShell.classList.remove("visible");
    }


    if (authScreen) {
        authScreen.classList.remove("hidden");
    }


    cleanupPresence();

    cleanupChat();

    cleanupCall();


    clearProfileUI();

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


    try {

        const {
            data: existingProfile,
            error: selectError
        } =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", currentUser.id)
                .maybeSingle();


        if (selectError) {

            console.error(
                "Profile select error:",
                selectError
            );

            profileData = {
                nickname,
                status,
                vip_level: 0
            };

            return;

        }


        if (existingProfile) {

            profileData =
                existingProfile;

            return;

        }


        const {
            data: newProfile,
            error: insertError
        } =
            await supabaseClient
                .from("profiles")
                .insert({

                    id: currentUser.id,

                    nickname,

                    status,

                    vip_level: 0

                })
                .select()
                .single();


        if (insertError) {

            console.error(
                "Profile insert error:",
                insertError
            );

            profileData = {
                nickname,
                status,
                vip_level: 0
            };

            return;

        }


        profileData =
            newProfile || {
                nickname,
                status,
                vip_level: 0
            };


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        profileData = {
            nickname,
            status,
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


    setText(
        "header-nickname",
        nickname
    );

    setText(
        "header-status",
        status
    );

    setText(
        "profile-nickname",
        nickname
    );

    setText(
        "profile-status",
        status
    );


    const headerAvatar =
        document.getElementById(
            "header-avatar"
        );

    const profileAvatar =
        document.getElementById(
            "profile-avatar"
        );


    const avatarUrl =
        profileData.avatar_url ||
        "";


    if (avatarUrl) {

        if (headerAvatar) {

            headerAvatar.innerHTML =
                `<img src="${escapeHtml(avatarUrl)}" alt="Avatar">`;

        }


        if (profileAvatar) {

            profileAvatar.innerHTML =
                `<img src="${escapeHtml(avatarUrl)}" alt="Avatar">`;

        }

    } else {

        const initials =
            getInitials(nickname);


        if (headerAvatar) {
            headerAvatar.textContent =
                initials;
        }


        if (profileAvatar) {
            profileAvatar.textContent =
                initials;
        }

    }


    const nicknameInput =
        document.getElementById(
            "profile-nickname-input"
        );

    const statusInput =
        document.getElementById(
            "profile-status-input"
        );


    if (nicknameInput) {
        nicknameInput.value =
            nickname;
    }


    if (statusInput) {
        statusInput.value =
            status;
    }

}


/* =========================================================
   CLEAR PROFILE UI
========================================================= */

function clearProfileUI() {

    setText(
        "header-nickname",
        "Player"
    );

    setText(
        "header-status",
        "Онлайн"
    );

    setText(
        "profile-nickname",
        "Player"
    );

    setText(
        "profile-status",
        "Онлайн"
    );


    const headerAvatar =
        document.getElementById(
            "header-avatar"
        );

    const profileAvatar =
        document.getElementById(
            "profile-avatar"
        );


    if (headerAvatar) {
        headerAvatar.textContent = "?";
    }


    if (profileAvatar) {
        profileAvatar.textContent = "?";
    }

}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

    if (!currentUser) {
        return;
    }


    const nicknameInput =
        document.getElementById(
            "profile-nickname-input"
        );

    const statusInput =
        document.getElementById(
            "profile-status-input"
        );


    const nickname =
        nicknameInput
            ? nicknameInput.value.trim()
            : "";


    const status =
        statusInput
            ? statusInput.value.trim()
            : "";


    const message =
        document.getElementById(
            "profile-message"
        );


    if (!nickname) {

        if (message) {
            message.textContent =
                "Введите никнейм.";
        }

        return;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .update({

                    nickname,

                    status:
                        status ||
                        "Онлайн",

                    updated_at:
                        new Date().toISOString()

                })
                .eq("id", currentUser.id)
                .select()
                .single();


        if (error) {
            throw error;
        }


        profileData =
            data || profileData;


        applyProfile();


        if (message) {

            message.textContent =
                "Профиль сохранён.";

            message.className =
                "modal-message success";

        }


    } catch (error) {

        console.error(
            "Save profile error:",
            error
        );


        if (message) {

            message.textContent =
                error.message ||
                "Не удалось сохранить профиль.";

            message.className =
                "modal-message error";

        }

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {

    document
        .querySelectorAll(
            ".side-tile[data-page]"
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
                        .forEach(
                            function (item) {

                                item.classList.toggle(
                                    "active",
                                    item === button
                                );

                            }
                        );


                    renderPage(page);

                }
            );

        });

}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    const heroGamesButton =
        document.getElementById(
            "hero-games-button"
        );


    if (heroGamesButton) {

        heroGamesButton.addEventListener(
            "click",
            function () {

                currentPage = "games";

                activatePageButton("games");

                renderPage("games");

            }
        );

    }


    const heroOnlineButton =
        document.getElementById(
            "hero-online-button"
        );


    if (heroOnlineButton) {

        heroOnlineButton.addEventListener(
            "click",
            function () {

                showModal(
                    "online-modal"
                );

            }
        );

    }


    const headerOnlineButton =
        document.getElementById(
            "header-online-button"
        );


    if (headerOnlineButton) {

        headerOnlineButton.addEventListener(
            "click",
            function () {

                showModal(
                    "online-modal"
                );

            }
        );

    }


    const youtubeButtons = [
        document.getElementById(
            "youtube-button"
        ),
        document.getElementById(
            "right-youtube-button"
        )
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
        document.getElementById(
            "twitch-button"
        ),
        document.getElementById(
            "right-twitch-button"
        )
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


    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        hideModal(
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
                            event.target ===
                            overlay
                        ) {

                            overlay.classList.remove(
                                "open"
                            );

                        }

                    }
                );

            }
        );


    const callClose =
        document.getElementById(
            "call-close-x"
        );


    if (callClose) {

        callClose.addEventListener(
            "click",
            leaveCall
        );

    }


    const callLeave =
        document.getElementById(
            "call-leave-button"
        );


    if (callLeave) {

        callLeave.addEventListener(
            "click",
            leaveCall
        );

    }


    const micButton =
        document.getElementById(
            "call-mic-button"
        );


    if (micButton) {

        micButton.addEventListener(
            "click",
            toggleMicrophone
        );

    }


    const cameraButton =
        document.getElementById(
            "call-camera-button"
        );


    if (cameraButton) {

        cameraButton.addEventListener(
            "click",
            toggleCamera
        );

    }


    const screenButton =
        document.getElementById(
            "call-screen-button"
        );


    if (screenButton) {

        screenButton.addEventListener(
            "click",
            toggleScreenShare
        );

    }


    const profileButton =
        document.getElementById(
            "profile-edit-button"
        );


    if (profileButton) {

        profileButton.addEventListener(
            "click",
            function () {

                showModal(
                    "profile-modal"
                );

            }
        );

    }

}


/* =========================================================
   ACTIVATE PAGE BUTTON
========================================================= */

function activatePageButton(page) {

    document
        .querySelectorAll(
            ".side-tile[data-page]"
        )
        .forEach(
            function (button) {

                button.classList.toggle(
                    "active",
                    button.dataset.page === page
                );

            }
        );

}


/* =========================================================
   PAGE RENDER
========================================================= */

function renderPage(page) {

    const content =
        document.getElementById(
            "page-content"
        );

    const title =
        document.getElementById(
            "page-title"
        );

    const kicker =
        document.getElementById(
            "page-kicker"
        );

    const badge =
        document.getElementById(
            "page-badge"
        );


    if (!content) {
        return;
    }


    const pages = {

        home: {

            title: "Главная",

            kicker: "PLATFORM",

            badge: "HOME",

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
                                Каждая игра получает
                                отдельный чат.
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
                                существует свой чат.
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

            title: "Игры",

            kicker: "GAMES",

            badge: "02",

            html: `

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
                                Игровое сообщество,
                                гильдии и чат.
                            </p>

                            <button
                                type="button"
                                class="modal-primary-button"
                                data-chat-game="world-of-sea-battle"
                            >
                                Открыть игру
                            </button>

                        </div>

                    </article>


                    <article class="info-card">

                        <div class="info-card-icon">
                            +
                        </div>

                        <div>

                            <strong>
                                Добавить игру
                            </strong>

                            <p>
                                Каталог платформы
                                рассчитан на разные игры.
                            </p>

                        </div>

                    </article>

                </div>

            `

        },


        news: {

            title: "Новости",

            kicker: "NEWS",

            badge: "03",

            html: `

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
                                Здесь будут отображаться
                                новости игр и сообщества.
                            </p>

                        </div>

                    </article>

                </div>

            `

        },


        online: {

            title: "Игроки онлайн",

            kicker: "COMMUNITY",

            badge: "04",

            html: `

                <div>

                    <div class="online-modal-status">

                        Сейчас онлайн:

                        <strong
                            id="page-online-count"
                        >
                            0
                        </strong>

                    </div>


                    <div
                        class="online-player-list"
                        id="page-online-list"
                    ></div>

                </div>

            `

        },


        profile: {

            title: "Профиль",

            kicker: "PROFILE",

            badge: "05",

            html: `

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

                            <button
                                type="button"
                                class="modal-primary-button"
                                id="page-profile-edit"
                            >
                                Редактировать профиль
                            </button>

                        </div>

                    </article>

                </div>

            `

        },


        chat: {

            title: "Чат",

            kicker: "REALTIME",

            badge: "06",

            html: `

                <div class="chat-page">

                    <div class="chat-room-tabs">

                        <button
                            type="button"
                            class="chat-room-button active"
                            data-chat-room="global"
                        >
                            Общий
                        </button>

                        <button
                            type="button"
                            class="chat-room-button"
                            data-chat-room="game"
                        >
                            Игра
                        </button>

                        <button
                            type="button"
                            class="chat-room-button"
                            data-chat-room="guild"
                        >
                            Гильдия
                        </button>

                    </div>


                    <div
                        class="chat-messages"
                        id="chat-messages"
                    ></div>


                    <form
                        class="chat-form"
                        id="chat-form"
                    >

                        <input
                            type="text"
                            id="chat-input"
                            placeholder="Введите сообщение..."
                            autocomplete="off"
                            maxlength="2000"
                            required
                        >

                        <button
                            type="submit"
                        >
                            Отправить
                        </button>

                    </form>

                </div>

            `

        }

    };


    const page =
        pages[page] ||
        pages.home;


    if (title) {
        title.textContent =
            page.title;
    }


    if (kicker) {
        kicker.textContent =
            page.kicker;
    }


    if (badge) {
        badge.textContent =
            page.badge;
    }


    content.innerHTML =
        page.html;


    if (page === pages.online) {

        renderOnlinePlayers();

    }


    if (page === pages.profile) {

        const edit =
            document.getElementById(
                "page-profile-edit"
            );


        if (edit) {

            edit.addEventListener(
                "click",
                function () {

                    showModal(
                        "profile-modal"
                    );

                }
            );

        }

    }


    if (page === pages.chat) {

        initChatPage();

    }

}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

    try {

        if (supabaseClient) {

            await supabaseClient.auth.signOut();

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

    if (!supabaseClient || !currentUser) {
        return;
    }


    cleanupPresence();


    presenceChannel =
        supabaseClient.channel(
            "global-presence",
            {
                config: {
                    presence: {
                        key: currentUser.id
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

                const state =
                    presenceChannel.presenceState();

                presenceUsers =
                    {};


                Object.keys(state)
                    .forEach(
                        function (key) {

                            const entries =
                                state[key] || [];


                            if (entries.length > 0) {

                                presenceUsers[key] =
                                    entries[0];

                            }

                        }
                    );


                updateOnlineCount();

                renderOnlinePlayers();

            }
        )
        .on(
            "presence",
            {
                event: "join"
            },
            function () {

                updateOnlineCount();

                renderOnlinePlayers();

            }
        )
        .on(
            "presence",
            {
                event: "leave"
            },
            function () {

                updateOnlineCount();

                renderOnlinePlayers();

            }
        );


    const result =
        await presenceChannel.subscribe(
            async function (status) {

                if (
                    status ===
                    "SUBSCRIBED"
                ) {

                    presenceReady =
                        true;


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


    return result;

}


/* =========================================================
   CLEANUP PRESENCE
========================================================= */

function cleanupPresence() {

    presenceReady = false;

    presenceUsers = {};


    if (
        presenceChannel &&
        supabaseClient
    ) {

        try {

            supabaseClient.removeChannel(
                presenceChannel
            );

        } catch (error) {

            console.error(
                "Presence cleanup error:",
                error
            );

        }

    }


    presenceChannel =
        null;


    updateOnlineCount();

}


/* =========================================================
   ONLINE COUNT
========================================================= */

function updateOnlineCount() {

    const count =
        Object.keys(
            presenceUsers
        ).length;


    setText(
        "online-header-count",
        count
    );

    setText(
        "online-side-count",
        count
    );

    setText(
        "hero-online-count",
        count
    );

    setText(
        "online-modal-count",
        count
    );

    setText(
        "call-participant-count",
        Object.keys(callParticipants).length + 1
    );

    setText(
        "page-online-count",
        count
    );

}


/* =========================================================
   ONLINE PLAYERS
========================================================= */

function renderOnlinePlayers() {

    const containers = [

        document.getElementById(
            "online-player-list"
        ),

        document.getElementById(
            "page-online-list"
        )

    ];


    containers.forEach(
        function (container) {

            if (!container) {
                return;
            }


            const users =
                Object.values(
                    presenceUsers
                );


            if (!users.length) {

                container.innerHTML = `
                    <div class="info-card">
                        <div class="info-card-icon">◉</div>
                        <div>
                            <strong>Пока никого нет</strong>
                            <p>Будьте первым игроком онлайн.</p>
                        </div>
                    </div>
                `;

                return;

            }


            container.innerHTML =
                users
                    .map(
                        function (user) {

                            return `

                                <div class="online-player">

                                    <div class="mini-avatar">
                                        ${escapeHtml(
                                            getInitials(
                                                user.nickname
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
    );

}


/* =========================================================
   CHAT PAGE
========================================================= */

function initChatPage() {

    const form =
        document.getElementById(
            "chat-form"
        );


    if (form) {

        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await sendChatMessage();

            }
        );

    }


    document
        .querySelectorAll(
            "[data-chat-room]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                "[data-chat-room]"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.toggle(
                                        "active",
                                        item === button
                                    );

                                }
                            );


                        const room =
                            button.dataset.chatRoom;


                        if (room === "global") {

                            switchChatRoom(
                                "global"
                            );

                        }

                        if (room === "game") {

                            switchChatRoom(
                                "game"
                            );

                        }

                        if (room === "guild") {

                            switchChatRoom(
                                "guild"
                            );

                        }

                    }
                );

            }
        );


    switchChatRoom(
        "global"
    );

}


/* =========================================================
   CHAT ROOM
========================================================= */

async function switchChatRoom(
    type,
    gameId = null,
    guildId = null
) {

    currentChatRoom = {

        type,

        gameId,

        guildId

    };


    cleanupChat();


    chatMessages = [];


    renderChatMessages();


    if (!supabaseClient || !currentUser) {
        return;
    }


    await loadChatMessages();


    const channelName =
        getChatChannelName();


    chatChannel =
        supabaseClient.channel(
            channelName
        );


    chatChannel.on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "chat_messages"
        },
        function (payload) {

            const message =
                payload.new;


            if (
                !message ||
                !message.id
            ) {
                return;
            }


            if (
                !isMessageForCurrentRoom(
                    message
                )
            ) {
                return;
            }


            if (
                chatMessages.some(
                    function (item) {
                        return item.id === message.id;
                    }
                )
            ) {
                return;
            }


            chatMessages.push(
                message
            );


            renderChatMessages();

        }
    );


    chatChannel.subscribe(
        function (status) {

            if (
                status ===
                "SUBSCRIBED"
            ) {

                chatSubscriptionReady =
                    true;

            }

        }
    );

}


/* =========================================================
   CHAT CHANNEL NAME
========================================================= */

function getChatChannelName() {

    if (
        currentChatRoom.type ===
        "game"
    ) {

        return (
            "chat-game-" +
            (
                currentChatRoom.gameId ||
                "default"
            )
        );

    }


    if (
        currentChatRoom.type ===
        "guild"
    ) {

        return (
            "chat-guild-" +
            (
                currentChatRoom.guildId ||
                "default"
            )
        );

    }


    return "chat-global";

}


/* =========================================================
   CHAT MESSAGE FILTER
========================================================= */

function isMessageForCurrentRoom(
    message
) {

    if (!message) {
        return false;
    }


    if (
        currentChatRoom.type ===
        "global"
    ) {

        return (
            message.room_type ===
            "global"
        );

    }


    if (
        currentChatRoom.type ===
        "game"
    ) {

        return (
            message.room_type ===
            "game" &&
            String(
                message.game_id || ""
            ) ===
            String(
                currentChatRoom.gameId || ""
            )
        );

    }


    if (
        currentChatRoom.type ===
        "guild"
    ) {

        return (
            message.room_type ===
            "guild" &&
            String(
                message.guild_id || ""
            ) ===
            String(
                currentChatRoom.guildId || ""
            )
        );

    }


    return false;

}


/* =========================================================
   LOAD CHAT
========================================================= */

async function loadChatMessages() {

    if (!supabaseClient) {
        return;
    }


    try {

        let query =
            supabaseClient
                .from("chat_messages")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                )
                .limit(100);


        if (
            currentChatRoom.type ===
            "global"
        ) {

            query =
                query.eq(
                    "room_type",
                    "global"
                );

        }


        if (
            currentChatRoom.type ===
            "game"
        ) {

            query =
                query
                    .eq(
                        "room_type",
                        "game"
                    )
                    .eq(
                        "game_id",
                        currentChatRoom.gameId
                    );

        }


        if (
            currentChatRoom.type ===
            "guild"
        ) {

            query =
                query
                    .eq(
                        "room_type",
                        "guild"
                    )
                    .eq(
                        "guild_id",
                        currentChatRoom.guildId
                    );

        }


        const {
            data,
            error
        } =
            await query;


        if (error) {
            throw error;
        }


        chatMessages =
            data || [];


        renderChatMessages();


    } catch (error) {

        console.error(
            "Load chat error:",
            error
        );

        const container =
            document.getElementById(
                "chat-messages"
            );


        if (container) {

            container.innerHTML = `

                <div class="info-card">

                    <div class="info-card-icon">
                        !
                    </div>

                    <div>

                        <strong>
                            Не удалось загрузить чат
                        </strong>

                        <p>
                            ${escapeHtml(
                                error.message ||
                                "Ошибка Supabase"
                            )}
                        </p>

                    </div>

                </div>

            `;

        }

    }

}


/* =========================================================
   SEND CHAT
========================================================= */

async function sendChatMessage() {

    if (!supabaseClient || !currentUser) {
        return;
    }


    const input =
        document.getElementById(
            "chat-input"
        );


    if (!input) {
        return;
    }


    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    try {

        const payload = {

            user_id:
                currentUser.id,

            nickname:
                profileData.nickname ||
                "Player",

            message:
                text,

            room_type:
                currentChatRoom.type

        };


        if (
            currentChatRoom.type ===
            "game"
        ) {

            payload.game_id =
                currentChatRoom.gameId;

        }


        if (
            currentChatRoom.type ===
            "guild"
        ) {

            payload.guild_id =
                currentChatRoom.guildId;

        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from("chat_messages")
                .insert(payload)
                .select()
                .single();


        if (error) {
            throw error;
        }


        if (
            data &&
            !chatMessages.some(
                function (item) {
                    return item.id === data.id;
                }
            )
        ) {

            chatMessages.push(
                data
            );

        }


        input.value = "";

        renderChatMessages();


    } catch (error) {

        console.error(
            "Send chat error:",
            error
        );

        alert(
            error.message ||
            "Не удалось отправить сообщение."
        );

    }

}


/* =========================================================
   RENDER CHAT
========================================================= */

function renderChatMessages() {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return;
    }


    if (!chatMessages.length) {

        container.innerHTML = `

            <div class="info-card">

                <div class="info-card-icon">
                    ◌
                </div>

                <div>

                    <strong>
                        Чат пуст
                    </strong>

                    <p>
                        Отправьте первое сообщение.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    container.innerHTML =
        chatMessages
            .map(
                function (message) {

                    return `

                        <div class="chat-message">

                            <div class="chat-message-avatar">
                                ${escapeHtml(
                                    getInitials(
                                        message.nickname
                                    )
                                )}
                            </div>

                            <div class="chat-message-body">

                                <div class="chat-message-top">

                                    <strong>
                                        ${escapeHtml(
                                            message.nickname ||
                                            "Player"
                                        )}
                                    </strong>

                                    <span>
                                        ${formatDate(
                                            message.created_at
                                        )}
                                    </span>

                                </div>

                                <div class="chat-message-text">
                                    ${escapeHtml(
                                        message.message ||
                                        ""
                                    )}
                                </div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    container.scrollTop =
        container.scrollHeight;

}


/* =========================================================
   CLEANUP CHAT
========================================================= */

function cleanupChat() {

    chatSubscriptionReady =
        false;


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
                "Chat cleanup error:",
                error
            );

        }

    }


    chatChannel =
        null;

}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value) {
        return "";
    }


    try {

        return new Date(
            value
        ).toLocaleString(
            "ru-RU",
            {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch (error) {

        return "";

    }

}


/* =========================================================
   WEBRTC
========================================================= */

const RTC_CONFIGURATION = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        }

    ]

};


/* =========================================================
   OPEN CALL
========================================================= */

async function openCall(
    roomId
) {

    if (!currentUser) {

        alert(
            "Сначала войдите в аккаунт."
        );

        return;

    }


    callRoomId =
        roomId ||
        "global";


    showModal(
        "call-modal"
    );


    const status =
        document.getElementById(
            "call-status"
        );


    if (status) {
        status.textContent =
            "Подключение...";
    }


    try {

        await startLocalMedia();

        await initCallChannel();


    } catch (error) {

        console.error(
            "Call error:",
            error
        );


        if (status) {

            status.textContent =
                error.message ||
                "Ошибка видеосвязи.";

        }

    }

}


/* =========================================================
   LOCAL MEDIA
========================================================= */

async function startLocalMedia() {

    if (localStream) {
        return localStream;
    }


    localStream =
        await navigator.mediaDevices.getUserMedia({

            video: true,

            audio: true

        });


    const video =
        document.getElementById(
            "local-video"
        );


    if (video) {

        video.srcObject =
            localStream;

    }


    return localStream;

}


/* =========================================================
   CALL CHANNEL
========================================================= */

async function initCallChannel() {

    if (
        !supabaseClient ||
        !currentUser ||
        !callRoomId
    ) {

        return;

    }


    if (callChannel) {

        try {

            supabaseClient.removeChannel(
                callChannel
            );

        } catch (error) {

            console.error(
                error
            );

        }

    }


    callParticipants = {};


    const channelName =
        "video-room-" +
        callRoomId;


    callChannel =
        supabaseClient.channel(
            channelName
        );


    callChannel
        .on(
            "broadcast",
            {
                event: "signal"
            },
            async function (payload) {

                const data =
                    payload.payload;


                if (!data) {
                    return;
                }


                if (
                    data.from ===
                    currentUser.id
                ) {

                    return;

                }


                await handleSignal(
                    data
                );

            }
        )
        .on(
            "presence",
            {
                event: "sync"
            },
            function () {

                const state =
                    callChannel.presenceState();


                Object.keys(state)
                    .forEach(
                        function (key) {

                            if (
                                key !==
                                currentUser.id
                            ) {

                                callParticipants[key] =
                                    state[key][0] ||
                                    {};

                            }

                        }
                    );


                updateCallParticipantCount();

            }
        );


    await callChannel.subscribe(
        async function (status) {

            if (
                status ===
                "SUBSCRIBED"
            ) {

                await callChannel.track({

                    user_id:
                        currentUser.id,

                    nickname:
                        profileData.nickname ||
                        "Player"

                });


                const statusElement =
                    document.getElementById(
                        "call-status"
                    );


                if (statusElement) {

                    statusElement.textContent =
                        "Комната подключена";

                }

            }

        }
    );

}


/* =========================================================
   SIGNAL HANDLER
========================================================= */

async function handleSignal(
    data
) {

    const from =
        data.from;


    if (!from) {
        return;
    }


    if (
        data.type ===
        "offer"
    ) {

        const pc =
            await createPeerConnection(
                from
            );


        await pc.setRemoteDescription(
            new RTCSessionDescription(
                data.offer
            )
        );


        const answer =
            await pc.createAnswer();


        await pc.setLocalDescription(
            answer
        );


        sendSignal(
            from,
            {
                type: "answer",
                answer
            }
        );


        return;

    }


    if (
        data.type ===
        "answer"
    ) {

        const pc =
            peerConnections[from];


        if (!pc) {
            return;
        }


        await pc.setRemoteDescription(
            new RTCSessionDescription(
                data.answer
            )
        );


        return;

    }


    if (
        data.type ===
        "candidate"
    ) {

        const pc =
            peerConnections[from];


        if (!pc) {
            return;
        }


        try {

            await pc.addIceCandidate(
                new RTCIceCandidate(
                    data.candidate
                )
            );

        } catch (error) {

            console.error(
                "ICE candidate error:",
                error
            );

        }

    }

}


/* =========================================================
   CREATE PEER CONNECTION
========================================================= */

async function createPeerConnection(
    remoteUserId
) {

    if (
        peerConnections[
            remoteUserId
        ]
    ) {

        return peerConnections[
            remoteUserId
        ];

    }


    const pc =
        new RTCPeerConnection(
            RTC_CONFIGURATION
        );


    peerConnections[
        remoteUserId
    ] =
        pc;


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                function (track) {

                    pc.addTrack(
                        track,
                        localStream
                    );

                }
            );

    }


    pc.onicecandidate =
        function (event) {

            if (
                event.candidate
            ) {

                sendSignal(
                    remoteUserId,
                    {
                        type:
                            "candidate",

                        candidate:
                            event.candidate
                    }
                );

            }

        };


    pc.ontrack =
        function (event) {

            const stream =
                event.streams[0];


            if (!stream) {
                return;
            }


            addRemoteVideo(
                remoteUserId,
                stream
            );

        };


    pc.onconnectionstatechange =
        function () {

            if (
                [
                    "failed",
                    "closed",
                    "disconnected"
                ].includes(
                    pc.connectionState
                )
            ) {

                removeRemoteVideo(
                    remoteUserId
                );

            }

        };


    return pc;

}


/* =========================================================
   SEND SIGNAL
========================================================= */

function sendSignal(
    target,
    payload
) {

    if (!callChannel) {
        return;
    }


    callChannel.send({

        type: "broadcast",

        event: "signal",

        payload: {

            ...payload,

            from:
                currentUser.id,

            target

        }

    });

}


/* =========================================================
   ADD REMOTE VIDEO
========================================================= */

function addRemoteVideo(
    userId,
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
        document.getElementById(
            "remote-video-" +
            userId
        );


    if (!tile) {

        tile =
            document.createElement(
                "div"
            );


        tile.className =
            "call-video-tile";


        tile.id =
            "remote-video-" +
            userId;


        const video =
            document.createElement(
                "video"
            );


        video.autoplay = true;

        video.playsInline = true;

        video.srcObject =
            stream;


        tile.appendChild(
            video
        );


        const label =
            document.createElement(
                "div"
            );


        label.className =
            "call-video-label";


        label.textContent =
            callParticipants[
                userId
            ]?.nickname ||
            "Игрок";


        tile.appendChild(
            label
        );


        grid.appendChild(
            tile
        );

    } else {

        const video =
            tile.querySelector(
                "video"
            );


        if (video) {

            video.srcObject =
                stream;

        }

    }


    updateCallParticipantCount();

}


/* =========================================================
   REMOVE REMOTE VIDEO
========================================================= */

function removeRemoteVideo(
    userId
) {

    const tile =
        document.getElementById(
            "remote-video-" +
            userId
        );


    if (tile) {

        tile.remove();

    }


    const pc =
        peerConnections[
            userId
        ];


    if (pc) {

        try {
            pc.close();
        } catch (error) {
            console.error(error);
        }

    }


    delete peerConnections[
        userId
    ];


    delete callParticipants[
        userId
    ];


    updateCallParticipantCount();

}


/* =========================================================
   CALL PARTICIPANT COUNT
========================================================= */

function updateCallParticipantCount() {

    const count =
        Object.keys(
            callParticipants
        ).length + 1;


    setText(
        "call-participant-count",
        count
    );

}


/* =========================================================
   MICROPHONE
========================================================= */

function toggleMicrophone() {

    if (!localStream) {
        return;
    }


    microphoneEnabled =
        !microphoneEnabled;


    localStream
        .getAudioTracks()
        .forEach(
            function (track) {

                track.enabled =
                    microphoneEnabled;

            }
        );


    const button =
        document.getElementById(
            "call-mic-button"
        );


    if (button) {

        button.classList.toggle(
            "active",
            microphoneEnabled
        );

    }

}


/* =========================================================
   CAMERA
========================================================= */

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


    const button =
        document.getElementById(
            "call-camera-button"
        );


    if (button) {

        button.classList.toggle(
            "active",
            cameraEnabled
        );

    }

}


/* =========================================================
   SCREEN SHARE
========================================================= */

async function toggleScreenShare() {

    if (!localStream) {
        return;
    }


    if (screenSharing) {

        await stopScreenShare();

        return;

    }


    try {

        screenStream =
            await navigator.mediaDevices.getDisplayMedia({

                video: true,

                audio: false

            });


        const screenTrack =
            screenStream.getVideoTracks()[0];


        const senderPromises =
            Object.values(
                peerConnections
            )
            .map(
                function (pc) {

                    const sender =
                        pc
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
                        screenTrack
                    ) {

                        return sender.replaceTrack(
                            screenTrack
                        );

                    }


                    return Promise.resolve();

                }
            );


        await Promise.all(
            senderPromises
        );


        screenSharing =
            true;


        const button =
            document.getElementById(
                "call-screen-button"
            );


        if (button) {

            button.classList.add(
                "active"
            );

        }


        screenTrack.onended =
            function () {

                stopScreenShare();

            };


    } catch (error) {

        console.error(
            "Screen share error:",
            error
        );

    }

}


/* =========================================================
   STOP SCREEN SHARE
========================================================= */

async function stopScreenShare() {

    if (!screenSharing) {
        return;
    }


    const cameraTrack =
        localStream
            ? localStream.getVideoTracks()[0]
            : null;


    if (cameraTrack) {

        const senderPromises =
            Object.values(
                peerConnections
            )
            .map(
                function (pc) {

                    const sender =
                        pc
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

                        return sender.replaceTrack(
                            cameraTrack
                        );

                    }


                    return Promise.resolve();

                }
            );


        await Promise.all(
            senderPromises
        );

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


    screenSharing =
        false;


    const button =
        document.getElementById(
            "call-screen-button"
        );


    if (button) {

        button.classList.remove(
            "active"
        );

    }

}


/* =========================================================
   LEAVE CALL
========================================================= */

async function leaveCall() {

    try {

        if (screenSharing) {

            await stopScreenShare();

        }


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
            function (userId) {

                const pc =
                    peerConnections[
                        userId
                    ];


                if (pc) {

                    try {
                        pc.close();
                    } catch (error) {
                        console.error(error);
                    }

                }

            }
        );


        peerConnections = {};

        callParticipants = {};


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

        callRoomId =
            null;


        const video =
            document.getElementById(
                "local-video"
            );


        if (video) {

            video.srcObject =
                null;

        }


        hideModal(
            "call-modal"
        );


        updateCallParticipantCount();


    } catch (error) {

        console.error(
            "Leave call error:",
            error
        );

    }

}


/* =========================================================
   CLEANUP CALL
========================================================= */

function cleanupCall() {

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


    Object.values(
        peerConnections
    )
    .forEach(
        function (pc) {

            try {
                pc.close();
            } catch (error) {
                console.error(error);
            }

        }
    );


    peerConnections = {};

    callParticipants = {};


    if (
        callChannel &&
        supabaseClient
    ) {

        try {

            supabaseClient.removeChannel(
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

    callRoomId =
        null;

}


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.gamePlatformSupabase =
    null;


window.openGameCall =
    openCall;


window.gamePlatformOpenCall =
    openCall;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        updateVersion();

        initAuthTabs();

        initForms();

        initNavigation();

        initButtons();


        /*
         * Проверяем библиотеку Supabase.
         */

        if (
            !window.supabase ||
            typeof window.supabase.createClient !==
            "function"
        ) {

            console.error(
                "Supabase JS library is not loaded."
            );


            showAuthMessage(
                "Не удалось загрузить Supabase."
            );


            return;

        }


        /*
         * Единственное место создания клиента.
         */

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


            window.gamePlatformSupabase =
                supabaseClient;


            /*
             * Совместимость с profile-vip.js.
             */

            window.supabaseClient =
                supabaseClient;


        } catch (error) {

            console.error(
                "Supabase initialization error:",
                error
            );


            showAuthMessage(
                "Ошибка подключения к Supabase: " +
                (
                    error.message ||
                    "неизвестная ошибка"
                )
            );


            return;

        }


        subscribeAuthState();

        await loadInitialSession();

    }
);
```
