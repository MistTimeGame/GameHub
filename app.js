"use strict";


/* =========================================================
   GAME PLATFORM
   AUTH
   PROFILE
   VIP
   PRESENCE
   CHAT
   WEBRTC CONFERENCE
   MULTIPLE CONFERENCE ROOMS
   VOICE SETTINGS
   PUSH TO TALK
   1080P
   PICTURE IN PICTURE
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";

const APP_VERSION =
    "1.8.4";


/* =========================================================
   GLOBAL STATE
========================================================= */

let supabaseClient = null;

let currentUser = null;

let currentSession = null;

let currentPage = "home";

let applicationStarted = false;


/* =========================================================
   PROFILE
========================================================= */

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

let globalChatRoomId = null;


/* =========================================================
   CONFERENCE
========================================================= */

let conferenceChannel = null;

let conferenceJoined = false;

let conferenceRoom =
    localStorage.getItem(
        "gp_conference_room"
    ) || "Общая";


let localStream = null;

let screenStream = null;

let micEnabled = false;

let cameraEnabled = false;

let screenSharing = false;

let peerConnections = {};

let conferenceParticipants = {};

let conferenceRemoteAudio = {};

let conferenceNegotiating = {};


/* =========================================================
   VOICE SETTINGS
========================================================= */

let voiceSettings = {

    microphoneId: "",

    outputDeviceId: "",

    noiseSuppression: true,

    echoCancellation: true,

    autoGainControl: true,

    inputVolume: 100,

    mode: "toggle",

    videoQuality: "1080"

};

let voiceSettingsOpen = false;

let pushToTalkActive = false;


/* =========================================================
   PICTURE IN PICTURE
========================================================= */

let documentPiPWindow = null;


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
   BASIC HELPERS
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


function setHidden(
    element,
    state
) {

    if (!element) {

        return;

    }


    element.classList.toggle(
        "hidden",
        Boolean(state)
    );

}


function showAuthMessage(
    message,
    type
) {

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


function showProfileMessage(
    message,
    type
) {

    if (!profileMessage) {

        return;

    }


    profileMessage.textContent =
        message || "";


    profileMessage.className =
        "auth-message";


    if (type) {

        profileMessage.classList.add(
            type
        );

    }

}


function showInfo(
    message
) {

    let toast =
        document.getElementById(
            "gp-toast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "gp-toast";


        Object.assign(
            toast.style,
            {

                position:
                    "fixed",

                left:
                    "50%",

                bottom:
                    "90px",

                transform:
                    "translateX(-50%)",

                zIndex:
                    "99999",

                maxWidth:
                    "calc(100vw - 30px)",

                padding:
                    "12px 16px",

                border:
                    "1px solid rgba(30,40,50,0.2)",

                borderRadius:
                    "14px",

                background:
                    "rgba(255,255,255,0.96)",

                color:
                    "#30363d",

                boxShadow:
                    "0 8px 30px rgba(0,0,0,0.15), 0 0 20px rgba(59,141,245,0.12)",

                fontSize:
                    "12px",

                lineHeight:
                    "1.5",

                textAlign:
                    "center"

            }
        );


        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    clearTimeout(
        showInfo.timer
    );


    showInfo.timer =
        setTimeout(
            function () {

                if (toast) {

                    toast.remove();

                }

            },
            4500
        );

}


function updateVersion() {

    document
        .querySelectorAll(
            ".site-version"
        )
        .forEach(
            function (element) {

                element.textContent =
                    "v" + APP_VERSION;

            }
        );

}


/* =========================================================
   SUPABASE
========================================================= */

function initSupabase() {

    if (
        !window.supabase ||
        typeof window.supabase.createClient !==
            "function"
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


    if (
        !email ||
        !password
    ) {

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

                email:
                    email,

                password:
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
                .includes(
                    "invalid login credentials"
                )
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


    if (
        password.length < 6
    ) {

        showAuthMessage(
            "Пароль должен содержать минимум 6 символов."
        );

        return;

    }


    if (
        password !==
        confirm
    ) {

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

                email:
                    email,

                password:
                    password,

                options: {

                    data: {

                        nickname:
                            nickname,

                        status:
                            "Онлайн"

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
        function (
            event,
            session
        ) {

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
   AVATAR
========================================================= */

function normalizeAvatarUrl(
    value
) {

    let url =
        String(
            value ||
            ""
        ).trim();


    if (!url) {

        return "";

    }


    if (
        url.startsWith("//")
    ) {

        url =
            "https:" +
            url;

    }


    if (
        !url.startsWith("http://") &&
        !url.startsWith("https://") &&
        !url.startsWith("data:image/")
    ) {

        url =
            "https://" +
            url;

    }


    return url;

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


    const url =
        normalizeAvatarUrl(
            avatarUrl
        );


    if (!url) {

        element.textContent =
            "🤖";

        return;

    }


    const image =
        document.createElement(
            "img"
        );


    image.alt =
        nickname
            ? "Аватар " +
              nickname
            : "Avatar";


    image.decoding =
        "async";


    image.loading =
        "eager";


    image.referrerPolicy =
        "no-referrer";


    image.src =
        url;


    image.onload =
        function () {

            element.innerHTML =
                "";

            element.appendChild(
                image
            );

        };


    image.onerror =
        function () {

            console.warn(
                "Avatar image could not be loaded:",
                url
            );


            element.innerHTML =
                "🤖";

        };


    element.appendChild(
        image
    );

}


function initAvatarPreview() {

    const input =
        $("profile-avatar-input");


    if (!input) {

        return;

    }


    input.addEventListener(
        "input",
        function () {

            renderAvatar(

                $("profile-modal-avatar"),

                profileData.nickname,

                input.value

            );

        }
    );

}


/* =========================================================
   VIP
========================================================= */

function getVipRoman(
    level
) {

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


function createVipBadge(
    level
) {

    const number =
        Number(
            level
        ) || 0;


    if (
        number <= 0
    ) {

        return "";

    }


    return (

        '<span class="vip-badge">' +

        "VIP " +

        escapeHtml(
            getVipRoman(
                number
            )
        ) +

        "</span>"

    );

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


            if (
                !profileData.avatar_url &&
                metadata.avatar_url
            ) {

                profileData.avatar_url =
                    normalizeAvatarUrl(
                        metadata.avatar_url
                    );

            }


            return;

        }


        const insertResult =
            await supabaseClient
                .from("profiles")
                .insert({

                    id:
                        currentUser.id,

                    nickname:
                        defaultNickname,

                    status:
                        defaultStatus,

                    avatar_url:
                        metadata.avatar_url
                            ? normalizeAvatarUrl(
                                metadata.avatar_url
                            )
                            : null,

                    age:
                        metadata.age ||
                        null,

                    city:
                        metadata.city ||
                        null,

                    about:
                        metadata.about ||
                        null,

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

        } else {

            profileData.nickname =
                defaultNickname;


            profileData.status =
                defaultStatus;


            if (
                metadata.avatar_url &&
                !profileData.avatar_url
            ) {

                profileData.avatar_url =
                    normalizeAvatarUrl(
                        metadata.avatar_url
                    );

            }

        }

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );


        profileData.nickname =
            defaultNickname;


        profileData.status =
            defaultStatus;


        if (
            metadata.avatar_url &&
            !profileData.avatar_url
        ) {

            profileData.avatar_url =
                normalizeAvatarUrl(
                    metadata.avatar_url
                );

        }

    }

}


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
            profileData.age ||
            "";

    }


    if ($("profile-city-input")) {

        $("profile-city-input").value =
            profileData.city ||
            "";

    }


    if ($("profile-avatar-input")) {

        $("profile-avatar-input").value =
            profileData.avatar_url ||
            "";

    }


    if ($("profile-about-input")) {

        $("profile-about-input").value =
            profileData.about ||
            "";

    }

}


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
            "Никнейм должен содержать от 3 до 24 символов.",
            "error"
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
            ? Number(
                ageInput.value
            )
            : null;


    if (
        age !== null &&
        (
            !Number.isInteger(age) ||
            age < 1 ||
            age > 120
        )
    ) {

        showProfileMessage(
            "Возраст должен быть от 1 до 120 лет.",
            "error"
        );

        return;

    }


    const avatarUrl =
        avatarInput
            ? normalizeAvatarUrl(
                avatarInput.value
            )
            : "";


    const city =
        cityInput
            ? cityInput.value.trim()
            : "";


    const about =
        aboutInput
            ? aboutInput.value.trim()
            : "";


    showProfileMessage(
        "Сохранение...",
        "info"
    );


    try {

        const profileUpdate = {

            nickname:
                nickname,

            status:
                status ||
                "Онлайн",

            age:
                age,

            city:
                city,

            about:
                about,

            avatar_url:
                avatarUrl ||
                null,

            updated_at:
                new Date().toISOString()

        };


        const result =
            await supabaseClient
                .from("profiles")
                .update(
                    profileUpdate
                )
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


        try {

            await supabaseClient.auth.updateUser({

                data: {

                    nickname:
                        nickname,

                    status:
                        status ||
                        "Онлайн",

                    age:
                        age,

                    city:
                        city,

                    about:
                        about,

                    avatar_url:
                        avatarUrl

                }

            });

        } catch (error) {

            console.warn(
                "Auth metadata update:",
                error
            );

        }


        applyProfile();


        await updateConferencePresenceProfile();


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
            700
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
                : "Не удалось сохранить профиль.",

            "error"

        );

    }

}


/* =========================================================
   ENTER APPLICATION
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
   LEAVE APPLICATION
========================================================= */

async function leaveApplication() {

    if (!applicationStarted) {

        currentUser =
            null;

        currentSession =
            null;

        return;

    }


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

                                        item.dataset.page ===
                                        page

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

                                        item.dataset.page ===
                                        page

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
   HOME
========================================================= */

function renderHome() {

    const content =
        $("page-content");


    if (!content) {

        return;

    }


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
                                GAME PLATFORM
                            </strong>

                            <p>
                                Игры, сообщества,
                                гильдии и общение
                                объединяются в одном месте.
                            </p>

                        </div>

                    </article>


                    <article class="news-item">

                        <div class="news-icon">
                            ▱
                        </div>

                        <div class="news-info">

                            <strong>
                                Чат + видеоконференция
                            </strong>

                            <p>
                                Общая конференция
                                доступна внутри чата.
                            </p>

                        </div>

                    </article>


                    <article class="news-item">

                        <div class="news-icon">
                            ◎
                        </div>

                        <div class="news-info">

                            <strong>
                                Профили и VIP
                            </strong>

                            <p>
                                Фото, город, возраст,
                                информация о себе
                                и 12 уровней VIP.
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
                    трансляций и материалов
                    игрового сообщества.
                </p>

            </section>

        </div>


        <section class="content-card">

            <div class="content-card-header">

                <strong class="content-card-title">
                    Игровое пространство
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
                        Добавить игру
                    </strong>

                    <span>
                        Новый игровой проект
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
                        Новые игры платформы
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


    if (!content) {

        return;

    }


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
                        Игровой раздел
                    </span>

                    <button
                        id="wosb-open"
                        type="button"
                        class="primary-button"
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
                    "Игровой раздел будет подключён следующим этапом."
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


    if (!content) {

        return;

    }


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
                            Развитие платформы
                        </strong>

                        <p>
                            GAME PLATFORM создаётся
                            как универсальная база
                            для разных игр.
                        </p>

                    </div>

                </article>


                <article class="news-item">

                    <div class="news-icon">
                        ▱
                    </div>

                    <div class="news-info">

                        <strong>
                            Общение
                        </strong>

                        <p>
                            Текстовый чат и видеоконференция
                            объединены в одном разделе.
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


    if (!content) {

        return;

    }


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


    if (!content) {

        return;

    }


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
                ></div>


                <div>

                    <strong
                        style="
                            display:block;
                            font-size:20px;
                            margin-bottom:5px;
                            font-weight:500;
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


                    <div data-vip-badge></div>


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
   CHAT ROOM
========================================================= */

async function getGlobalChatRoomId() {

    if (
        globalChatRoomId &&
        supabaseClient
    ) {

        return globalChatRoomId;

    }


    if (!supabaseClient) {

        return null;

    }


    try {

        const result =
            await supabaseClient
                .from("chat_rooms")
                .select("id")
                .eq(
                    "type",
                    "global"
                )
                .limit(1)
                .maybeSingle();


        if (
            result.error ||
            !result.data
        ) {

            return null;

        }


        globalChatRoomId =
            result.data.id;


        return globalChatRoomId;

    } catch (error) {

        console.error(
            "Global room:",
            error
        );


        return null;

    }

}


/* =========================================================
   CHAT MESSAGE
========================================================= */

function getMessageText(
    message
) {

    if (!message) {

        return "";

    }


    return (
        message.body ??
        message.message ??
        message.text ??
        ""
    );

}


/* =========================================================
   CHAT
========================================================= */

async function renderChat() {

    const content =
        $("page-content");


    if (!content) {

        return;

    }


    injectConferenceStyles();


    content.innerHTML = `

        <div class="chat-page">

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

                    <span
                        id="conference-participants-count"
                        class="conference-count"
                    >
                        0
                    </span>

                </div>


                <div class="conference-room-bar">

                    <div class="conference-room-title">

                        <span>
                            Комната
                        </span>

                        <strong
                            id="conference-room-label"
                        >
                            ${escapeHtml(
                                conferenceRoom
                            )}
                        </strong>

                    </div>


                    <div class="conference-room-controls">

                        <select
                            id="conference-room-select"
                            class="conference-select"
                        >

                            <option value="Общая">
                                Общая
                            </option>

                            <option value="Комната 2">
                                Комната 2
                            </option>

                            <option value="Комната 3">
                                Комната 3
                            </option>

                            <option value="Комната 4">
                                Комната 4
                            </option>

                            <option value="Игровая 1">
                                Игровая 1
                            </option>

                            <option value="Игровая 2">
                                Игровая 2
                            </option>

                        </select>


                        <input
                            id="conference-room-custom"
                            class="conference-room-input"
                            maxlength="60"
                            placeholder="Название комнаты..."
                        >


                        <button
                            id="conference-room-apply"
                            type="button"
                            class="conference-button"
                        >
                            Применить
                        </button>

                    </div>

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
                            ${escapeHtml(
                                conferenceRoom
                            )}
                        </strong>

                        <span>
                            Войти можно без камеры и микрофона.
                        </span>

                    </div>

                </div>


                <div class="conference-quality-info">

                    <span>
                        Видео до
                        <strong>
                            1080p FHD
                        </strong>
                    </span>

                    <span>
                        Комната:
                        <strong
                            id="conference-quality-room"
                        >
                            ${escapeHtml(
                                conferenceRoom
                            )}
                        </strong>
                    </span>

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
                        Микрофон: выкл.
                    </button>


                    <button
                        id="conference-camera"
                        type="button"
                        class="conference-button"
                    >
                        Камера: выкл.
                    </button>


                    <button
                        id="conference-screen"
                        type="button"
                        class="conference-button"
                    >
                        Экран
                    </button>


                    <button
                        id="conference-voice-settings"
                        type="button"
                        class="conference-button"
                    >
                        ⚙ Голос
                    </button>


                    <button
                        id="conference-refresh"
                        type="button"
                        class="conference-button"
                    >
                        Обновить
                    </button>

                </div>


                <div
                    id="conference-voice-settings-panel"
                    class="conference-settings-panel"
                    hidden
                >

                    <div class="conference-settings-head">

                        <div>

                            <strong>
                                Настройки голоса
                            </strong>

                            <span>
                                Голосовая панель
                            </span>

                        </div>


                        <button
                            id="conference-voice-settings-close"
                            type="button"
                            class="conference-settings-close"
                        >
                            ×
                        </button>

                    </div>


                    <div class="conference-setting">

                        <label>
                            Микрофон
                        </label>

                        <select
                            id="voice-mic-device"
                            class="conference-select"
                        ></select>

                    </div>


                    <div class="conference-setting">

                        <label>
                            Устройство вывода
                        </label>

                        <select
                            id="voice-output-device"
                            class="conference-select"
                        ></select>

                    </div>


                    <div class="conference-setting">

                        <label>
                            Режим микрофона
                        </label>

                        <select
                            id="voice-mode"
                            class="conference-select"
                        >

                            <option value="toggle">
                                Нажатие — включить/выключить
                            </option>

                            <option value="push">
                                Зажать кнопку — говорить
                            </option>

                        </select>

                    </div>


                    <div class="conference-setting">

                        <label>
                            Громкость микрофона
                        </label>

                        <div class="conference-slider-row">

                            <input
                                id="voice-volume"
                                type="range"
                                min="0"
                                max="150"
                                value="100"
                                step="1"
                            >

                            <strong id="voice-volume-label">
                                100%
                            </strong>

                        </div>

                    </div>


                    <div class="conference-setting">

                        <label>
                            Качество видео
                        </label>

                        <select
                            id="voice-video-quality"
                            class="conference-select"
                        >

                            <option value="auto">
                                Авто
                            </option>

                            <option value="720">
                                HD 720p
                            </option>

                            <option value="1080">
                                Full HD 1080p
                            </option>

                        </select>

                    </div>


                    <div class="conference-setting-check">

                        <label>

                            <input
                                id="voice-noise-suppression"
                                type="checkbox"
                                checked
                            >

                            <span>
                                Шумоподавление
                            </span>

                        </label>

                    </div>


                    <div class="conference-setting-check">

                        <label>

                            <input
                                id="voice-echo-cancellation"
                                type="checkbox"
                                checked
                            >

                            <span>
                                Эхоподавление
                            </span>

                        </label>

                    </div>


                    <div class="conference-setting-check">

                        <label>

                            <input
                                id="voice-auto-gain"
                                type="checkbox"
                                checked
                            >

                            <span>
                                Автоусиление
                            </span>

                        </label>

                    </div>


                    <div
                        id="conference-ptt-wrap"
                        class="conference-ptt-wrap"
                        hidden
                    >

                        <button
                            id="conference-ptt"
                            type="button"
                            class="conference-ptt-button"
                        >
                            Зажмите для разговора
                        </button>

                        <span>
                            Клавиша V тоже работает.
                        </span>

                    </div>


                    <div
                        id="voice-settings-message"
                        class="conference-settings-message"
                    ></div>


                    <button
                        id="voice-settings-save"
                        type="button"
                        class="conference-main-button"
                        style="margin-top:14px;"
                    >
                        Сохранить настройки
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
   PAGE ROUTER
========================================================= */

function renderPage(
    page
) {

    const title =
        $("page-title");


    const kicker =
        $("page-kicker");


    const badge =
        $("page-badge");


    if (
        !title ||
        !kicker ||
        !badge
    ) {

        return;

    }


    if (
        page !==
        "chat"
    ) {

        stopChatRealtime();

    }


    if (
        page ===
        "home"
    ) {

        title.textContent =
            "Главная";

        kicker.textContent =
            "PLATFORM";

        badge.textContent =
            "HOME";

        renderHome();

        return;

    }


    if (
        page ===
        "games"
    ) {

        title.textContent =
            "Игры";

        kicker.textContent =
            "GAME CATALOG";

        badge.textContent =
            "GAMES";

        renderGames();

        return;

    }


    if (
        page ===
        "news"
    ) {

        title.textContent =
            "Новости";

        kicker.textContent =
            "COMMUNITY";

        badge.textContent =
            "NEWS";

        renderNews();

        return;

    }


    if (
        page ===
        "online"
    ) {

        title.textContent =
            "Онлайн";

        kicker.textContent =
            "COMMUNITY";

        badge.textContent =
            "ONLINE";

        renderOnlinePage();

        return;

    }


    if (
        page ===
        "profile"
    ) {

        title.textContent =
            "Профиль";

        kicker.textContent =
            "PLAYER";

        badge.textContent =
            "PROFILE";

        renderProfilePage();

        return;

    }


    if (
        page ===
        "chat"
    ) {

        title.textContent =
            "Чат";

        kicker.textContent =
            "COMMUNITY";

        badge.textContent =
            "CHAT";

        renderChat();

        return;

    }


    renderHome();

}


/* =========================================================
   MODALS
========================================================= */

function openModal(
    id
) {

    const modal =
        $(id);


    if (!modal) {

        return;

    }


    modal.classList.add(
        "active"
    );

}


function closeModal(
    id
) {

    const modal =
        $(id);


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "active"
    );

}


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
                            event.target ===
                            overlay
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


/* =========================================================
   PROFILE BUTTONS
========================================================= */

function initProfileButtons() {

    [
        $("profile-edit-button"),
        $("header-profile-button")
    ]
        .forEach(
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
   SOCIAL
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
                event:
                    "sync"
            },
            updatePresenceUsers
        );


        presenceChannel.on(
            "presence",
            {
                event:
                    "join"
            },
            updatePresenceUsers
        );


        presenceChannel.on(
            "presence",
            {
                event:
                    "leave"
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
                    status ===
                    "SUBSCRIBED"
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


        const unique =
            {};


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


        renderOnlinePlayers(
            "online-player-list"
        );


        renderOnlinePlayers(
            "online-page-list"
        );

    } catch (error) {

        console.error(
            "Presence sync:",
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
                        String(
                            count
                        );

                }

            }
        );

}


function renderOnlinePlayers(
    targetId
) {

    const element =
        $(targetId);


    if (!element) {

        return;

    }


    if (
        !presenceUsers.length
    ) {

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

                            <div
                                class="avatar avatar-medium"
                                data-online-avatar="${escapeHtml(
                                    user.user_id || ""
                                )}"
                            ></div>

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


    element
        .querySelectorAll(
            "[data-online-avatar]"
        )
        .forEach(
            function (avatarElement) {

                const user =
                    presenceUsers.find(
                        function (item) {

                            return (
                                item.user_id ===
                                avatarElement.dataset.onlineAvatar
                            );

                        }
                    );


                renderAvatar(

                    avatarElement,

                    user
                        ? user.nickname
                        : "Player",

                    user
                        ? user.avatar_url
                        : ""

                );

            }
        );

}


async function updateConferencePresenceProfile() {

    if (
        !presenceChannel ||
        !currentUser
    ) {

        return;

    }


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

        console.warn(
            "Global presence update:",
            error
        );

    }

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

        console.warn(
            error
        );

    }


    try {

        await supabaseClient.removeChannel(
            presenceChannel
        );

    } catch (error) {

        console.warn(
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

async function loadChatMessages() {

    const container =
        $("chat-messages");


    if (
        !container ||
        !supabaseClient
    ) {

        return;

    }


    const roomId =
        await getGlobalChatRoomId();


    let result = null;


    if (roomId) {

        result =
            await supabaseClient
                .from("chat_messages")
                .select("*")
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
                .limit(100);

    }


    if (
        !result ||
        result.error
    ) {

        result =
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

    }


    if (result.error) {

        container.innerHTML = `

            <div class="conference-placeholder">

                <strong>
                    Не удалось загрузить чат
                </strong>

                <span>
                    ${escapeHtml(
                        result.error.message
                    )}
                </span>

            </div>

        `;

        return;

    }


    renderChatMessages(
        result.data ||
        []
    );

}


function renderChatMessages(
    messages
) {

    const container =
        $("chat-messages");


    if (!container) {

        return;

    }


    if (
        !messages.length
    ) {

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
                                    getMessageText(
                                        message
                                    )
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


    const roomId =
        await getGlobalChatRoomId();


    let result = null;


    if (roomId) {

        result =
            await supabaseClient
                .from("chat_messages")
                .insert({

                    room_id:
                        roomId,

                    user_id:
                        currentUser.id,

                    nickname:
                        profileData.nickname ||
                        "Player",

                    room_type:
                        "global",

                    body:
                        message,

                    message:
                        message

                });

    }


    if (
        !result ||
        result.error
    ) {

        result =
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

    }


    if (result.error) {

        showInfo(
            "Не удалось отправить сообщение: " +
            result.error.message
        );

        return;

    }


    input.value =
        "";


    await loadChatMessages();

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
                "chat_messages"

        },

        function () {

            loadChatMessages();

        }

    );


    chatChannel.subscribe(
        function (status) {

            console.log(
                "Chat Realtime:",
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

            console.warn(
                error
            );

        }

    }


    chatChannel =
        null;

}


/* =========================================================
   CONFERENCE STYLES
========================================================= */

function injectConferenceStyles() {

    if (
        document.getElementById(
            "conference-extra-style"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "conference-extra-style";


    style.textContent = `

        .conference-room-bar {
            display:flex;
            gap:12px;
            align-items:flex-end;
            justify-content:space-between;
            flex-wrap:wrap;
            padding:12px 0;
            border-bottom:1px solid rgba(30,40,50,.08);
        }

        .conference-room-title {
            display:flex;
            flex-direction:column;
            gap:3px;
            min-width:140px;
        }

        .conference-room-title span {
            color:#7d8792;
            font-size:10px;
            text-transform:uppercase;
            letter-spacing:.7px;
        }

        .conference-room-title strong {
            color:#20252b;
            font-size:14px;
        }

        .conference-room-controls {
            display:flex;
            flex-wrap:wrap;
            gap:7px;
            justify-content:flex-end;
            flex:1;
        }

        .conference-select,
        .conference-room-input {
            min-height:38px;
            padding:0 11px;
            border-radius:10px;
            border:1px solid rgba(30,40,50,.14);
            background:rgba(255,255,255,.96);
            color:#20252b;
            font:inherit;
            font-size:12px;
            outline:none;
        }

        .conference-room-input {
            width:210px;
        }

        .conference-select:focus,
        .conference-room-input:focus {
            border-color:#4f8df7;
            box-shadow:0 0 0 3px rgba(79,141,247,.12);
        }

        .conference-quality-info {
            display:flex;
            justify-content:space-between;
            gap:10px;
            flex-wrap:wrap;
            margin:9px 0 12px;
            color:#7d8792;
            font-size:10px;
        }

        .conference-quality-info strong {
            color:#303942;
        }

        .conference-count {
            min-width:28px;
            height:28px;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:999px;
            background:rgba(79,141,247,.08);
            color:#3f79dd;
            font-size:11px;
            font-weight:700;
        }

        .conference-settings-panel {
            margin-top:14px;
            padding:16px;
            border:1px solid rgba(30,40,50,.11);
            border-radius:16px;
            background:
                linear-gradient(
                    180deg,
                    rgba(255,255,255,.99),
                    rgba(244,247,250,.96)
                );
            box-shadow:
                0 14px 36px rgba(31,45,61,.10);
        }

        .conference-settings-head {
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:10px;
            margin-bottom:14px;
        }

        .conference-settings-head div {
            display:flex;
            flex-direction:column;
            gap:3px;
        }

        .conference-settings-head strong {
            font-size:14px;
            color:#20252b;
        }

        .conference-settings-head span {
            font-size:10px;
            color:#818b95;
        }

        .conference-settings-close {
            width:32px;
            height:32px;
            border:1px solid rgba(30,40,50,.1);
            border-radius:10px;
            background:#fff;
            cursor:pointer;
            font-size:18px;
            color:#606a74;
        }

        .conference-setting,
        .conference-setting-check {
            display:flex;
            flex-direction:column;
            gap:7px;
            margin-top:12px;
        }

        .conference-setting label,
        .conference-setting-check span {
            color:#56616c;
            font-size:11px;
        }

        .conference-setting-check label {
            display:flex;
            align-items:center;
            gap:8px;
            cursor:pointer;
        }

        .conference-slider-row {
            display:flex;
            gap:12px;
            align-items:center;
        }

        .conference-slider-row input[type="range"] {
            flex:1;
        }

        .conference-slider-row strong {
            width:45px;
            text-align:right;
            font-size:11px;
            color:#3f79dd;
        }

        .conference-ptt-wrap {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:7px;
            margin-top:14px;
            padding-top:14px;
            border-top:1px solid rgba(30,40,50,.07);
        }

        .conference-ptt-wrap span {
            color:#818b95;
            font-size:10px;
        }

        .conference-ptt-button {
            width:100%;
            min-height:46px;
            border-radius:13px;
            border:1px solid rgba(63,121,221,.25);
            background:
                linear-gradient(
                    180deg,
                    #f6f9ff,
                    #e8f0ff
                );
            color:#3f79dd;
            font:inherit;
            font-weight:700;
            cursor:pointer;
            touch-action:none;
        }

        .conference-ptt-button.active {
            background:
                linear-gradient(
                    180deg,
                    #4f8df7,
                    #3d78df
                );
            color:#fff;
        }

        .conference-settings-message {
            min-height:18px;
            margin-top:9px;
            color:#4f8df7;
            font-size:10px;
        }

        .conference-video-toolbar {
            position:absolute;
            right:8px;
            bottom:8px;
            display:flex;
            gap:6px;
            opacity:0;
            transition:opacity .18s ease;
            z-index:4;
        }

        .video-tile:hover .conference-video-toolbar {
            opacity:1;
        }

        .conference-video-toolbar button {
            width:32px;
            height:30px;
            padding:0;
            border:1px solid rgba(255,255,255,.34);
            border-radius:9px;
            background:rgba(20,28,38,.74);
            color:#fff;
            cursor:pointer;
            backdrop-filter:blur(8px);
        }

        .video-tile {
            position:relative;
            overflow:hidden;
        }

        .conference-video-quality {
            position:absolute;
            left:8px;
            top:8px;
            z-index:3;
            padding:4px 7px;
            border-radius:8px;
            background:rgba(20,28,38,.68);
            color:#fff;
            font-size:9px;
            pointer-events:none;
        }

        .conference-video-name {
            position:absolute;
            left:8px;
            bottom:8px;
            z-index:3;
            max-width:70%;
            padding:5px 8px;
            border-radius:8px;
            background:rgba(20,28,38,.72);
            color:#fff;
            font-size:10px;
            pointer-events:none;
        }

        .conference-participant-status {
            position:absolute;
            left:8px;
            top:34px;
            z-index:3;
            display:flex;
            gap:4px;
            font-size:9px;
            color:#fff;
            pointer-events:none;
        }

        @media (max-width:700px) {

            .conference-room-controls {
                justify-content:stretch;
                width:100%;
            }

            .conference-room-controls > * {
                flex:1 1 140px;
                min-width:0;
            }

            .conference-room-input {
                width:auto;
            }

            .conference-controls {
                display:grid !important;
                grid-template-columns:repeat(2, minmax(0,1fr));
            }

            .conference-controls > button {
                width:100%;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   CONFERENCE ROOM HELPERS
========================================================= */

function normalizeConferenceRoom(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .slice(
            0,
            60
        );

}


function saveConferenceRoom() {

    try {

        localStorage.setItem(
            "gp_conference_room",
            conferenceRoom
        );

    } catch (error) {

        console.warn(
            error
        );

    }

}


function updateConferenceRoomUI() {

    const label =
        $("conference-room-label");


    const qualityRoom =
        $("conference-quality-room");


    const select =
        $("conference-room-select");


    if (label) {

        label.textContent =
            conferenceRoom;

    }


    if (qualityRoom) {

        qualityRoom.textContent =
            conferenceRoom;

    }


    if (select) {

        const found =
            Array.from(
                select.options
            )
                .find(
                    function (option) {

                        return (
                            option.value ===
                            conferenceRoom
                        );

                    }
                );


        if (found) {

            select.value =
                conferenceRoom;

        } else {

            select.value =
                "Общая";

        }

    }

}


/*
   Ключевой момент:
   одинаковая строка комнаты превращается
   в одинаковый Supabase Realtime topic.
*/

function getConferenceChannelName() {

    const room =
        normalizeConferenceRoom(
            conferenceRoom
        );


    const safeRoom =
        room
            .toLowerCase()
            .normalize("NFKD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-z0-9а-яё]+/gi,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );


    return (
        "game-platform-conference-" +
        (
            safeRoom ||
            "common"
        )
    );

}


/* =========================================================
   SWITCH ROOM
========================================================= */

async function switchConferenceRoom(
    room
) {

    const nextRoom =
        normalizeConferenceRoom(
            room
        );


    if (!nextRoom) {

        showInfo(
            "Введите название комнаты."
        );

        return;

    }


    if (
        conferenceJoined
    ) {

        await stopConference();

    }


    conferenceRoom =
        nextRoom;


    saveConferenceRoom();


    updateConferenceRoomUI();


    showInfo(
        "Выбрана комната «" +
        conferenceRoom +
        "»."
    );

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


    const settings =
        $("conference-voice-settings");


    const refresh =
        $("conference-refresh");


    const roomApply =
        $("conference-room-apply");


    const roomSelect =
        $("conference-room-select");


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
            async function () {

                if (
                    voiceSettings.mode ===
                    "push"
                ) {

                    openVoiceSettings();

                    return;

                }


                await toggleConferenceMic();

            }
        );

    }


    if (camera) {

        camera.addEventListener(
            "click",
            async function () {

                await toggleConferenceCamera();

            }
        );

    }


    if (screen) {

        screen.addEventListener(
            "click",
            async function () {

                await toggleConferenceScreen();

            }
        );

    }


    if (settings) {

        settings.addEventListener(
            "click",
            toggleVoiceSettings
        );

    }


    if (refresh) {

        refresh.addEventListener(
            "click",
            function () {

                updateConferenceVideos();

                updateConferenceParticipantCount();

            }
        );

    }


    if (roomApply) {

        roomApply.addEventListener(
            "click",
            async function () {

                const custom =
                    $("conference-room-custom");


                let room =
                    custom &&
                    custom.value.trim()
                        ? custom.value.trim()
                        : (
                            roomSelect
                                ? roomSelect.value
                                : conferenceRoom
                        );


                await switchConferenceRoom(
                    room
                );

            }
        );

    }


    if (roomSelect) {

        roomSelect.value =
            conferenceRoom;


        roomSelect.addEventListener(
            "change",
            function () {

                const custom =
                    $("conference-room-custom");


                if (custom) {

                    custom.value =
                        "";

                }

            }
        );

    }


    initVoiceSettingsUI();


    updateConferenceRoomUI();


    updateConferenceButtons();


    updateConferenceMediaButtons();

}


/* =========================================================
   CONFERENCE STATUS
========================================================= */

function setConferenceStatus(
    text
) {

    const element =
        $("conference-status");


    if (element) {

        element.textContent =
            text;

    }

}


/* =========================================================
   MEDIA ERROR
========================================================= */

function getMediaErrorMessage(
    error
) {

    if (!error) {

        return "Не удалось получить доступ к устройству.";

    }


    switch (
        error.name
    ) {

        case "NotAllowedError":

            return (
                "Доступ к устройству запрещён. " +
                "Разрешите доступ в настройках браузера."
            );


        case "NotFoundError":

            return (
                "Запрошенное устройство не найдено."
            );


        case "NotReadableError":

            return (
                "Устройство уже используется другой программой."
            );


        case "OverconstrainedError":

            return (
                "Устройство не поддерживает выбранные параметры."
            );


        case "SecurityError":

            return (
                "Браузер заблокировал доступ к устройству."
            );


        default:

            return (
                "Ошибка устройства: " +
                (
                    error.message ||
                    error.name ||
                    "неизвестная ошибка"
                )
            );

    }

}


/* =========================================================
   MEDIA ENVIRONMENT
========================================================= */

function checkMediaEnvironment() {

    if (
        !window.isSecureContext &&
        location.hostname !==
            "localhost" &&
        location.hostname !==
            "127.0.0.1"
    ) {

        return {

            ok:
                false,

            message:
                "Камера и микрофон требуют HTTPS."

        };

    }


    if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !==
            "function"
    ) {

        return {

            ok:
                false,

            message:
                "Браузер не предоставляет доступ к устройствам."

        };

    }


    return {
        ok:
            true
    };

}


/* =========================================================
   DEVICE ENUMERATION
========================================================= */

async function enumerateMediaDevices() {

    if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.enumerateDevices !==
            "function"
    ) {

        return [];

    }


    try {

        return await navigator.mediaDevices.enumerateDevices();

    } catch (error) {

        console.warn(
            error
        );


        return [];

    }

}


/* =========================================================
   VOICE SETTINGS
========================================================= */

async function openVoiceSettings() {

    const panel =
        $("conference-voice-settings-panel");


    if (!panel) {

        return;

    }


    voiceSettingsOpen =
        true;


    panel.hidden =
        false;


    await populateVoiceSettings();


    updatePushToTalkVisibility();

}


function closeVoiceSettings() {

    const panel =
        $("conference-voice-settings-panel");


    if (panel) {

        panel.hidden =
            true;

    }


    voiceSettingsOpen =
        false;

}


function toggleVoiceSettings() {

    if (
        voiceSettingsOpen
    ) {

        closeVoiceSettings();

    } else {

        openVoiceSettings();

    }

}


function updatePushToTalkVisibility() {

    const wrapper =
        $("conference-ptt-wrap");


    const mode =
        $("voice-mode");


    if (wrapper) {

        wrapper.hidden =
            !(
                voiceSettings.mode ===
                "push"
            );

    }


    if (mode) {

        mode.value =
            voiceSettings.mode;

    }


    if (
        voiceSettings.mode ===
        "push"
    ) {

        if (
            conferenceJoined &&
            !pushToTalkActive
        ) {

            setMicTrackState(
                false
            );

        }

    }

}


async function populateVoiceSettings() {

    const devices =
        await enumerateMediaDevices();


    const microphones =
        devices.filter(
            function (device) {

                return (
                    device.kind ===
                    "audioinput"
                );

            }
        );


    const outputs =
        devices.filter(
            function (device) {

                return (
                    device.kind ===
                    "audiooutput"
                );

            }
        );


    const micSelect =
        $("voice-mic-device");


    if (micSelect) {

        micSelect.innerHTML =
            "";


        if (!microphones.length) {

            micSelect.innerHTML =
                `
                    <option value="">
                        Микрофон не найден
                    </option>
                `;

        } else {

            microphones.forEach(
                function (
                    device,
                    index
                ) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        device.deviceId ||
                        "";


                    option.textContent =
                        device.label ||
                        (
                            "Микрофон " +
                            (
                                index + 1
                            )
                        );


                    micSelect.appendChild(
                        option
                    );

                }
            );


            if (
                voiceSettings.microphoneId &&
                microphones.some(
                    function (device) {

                        return (
                            device.deviceId ===
                            voiceSettings.microphoneId
                        );

                    }
                )
            ) {

                micSelect.value =
                    voiceSettings.microphoneId;

            }

        }

    }


    const outputSelect =
        $("voice-output-device");


    if (outputSelect) {

        outputSelect.innerHTML =
            "";


        if (!outputs.length) {

            outputSelect.innerHTML =
                `
                    <option value="">
                        Вывод по умолчанию
                    </option>
                `;

        } else {

            outputs.forEach(
                function (
                    device,
                    index
                ) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        device.deviceId ||
                        "";


                    option.textContent =
                        device.label ||
                        (
                            "Динамики " +
                            (
                                index + 1
                            )
                        );


                    outputSelect.appendChild(
                        option
                    );

                }
            );


            if (
                voiceSettings.outputDeviceId &&
                outputs.some(
                    function (device) {

                        return (
                            device.deviceId ===
                            voiceSettings.outputDeviceId
                        );

                    }
                )
            ) {

                outputSelect.value =
                    voiceSettings.outputDeviceId;

            }

        }

    }


    const noise =
        $("voice-noise-suppression");


    if (noise) {

        noise.checked =
            voiceSettings.noiseSuppression;

    }


    const echo =
        $("voice-echo-cancellation");


    if (echo) {

        echo.checked =
            voiceSettings.echoCancellation;

    }


    const gain =
        $("voice-auto-gain");


    if (gain) {

        gain.checked =
            voiceSettings.autoGainControl;

    }


    const volume =
        $("voice-volume");


    if (volume) {

        volume.value =
            String(
                voiceSettings.inputVolume
            );

    }


    const volumeLabel =
        $("voice-volume-label");


    if (volumeLabel) {

        volumeLabel.textContent =
            voiceSettings.inputVolume +
            "%";

    }


    const mode =
        $("voice-mode");


    if (mode) {

        mode.value =
            voiceSettings.mode;

    }


    const quality =
        $("voice-video-quality");


    if (quality) {

        quality.value =
            voiceSettings.videoQuality;

    }


    updatePushToTalkVisibility();

}


/* =========================================================
   VOICE SETTINGS SAVE
========================================================= */

async function saveVoiceSettingsFromUI() {

    const mic =
        $("voice-mic-device");


    const output =
        $("voice-output-device");


    const noise =
        $("voice-noise-suppression");


    const echo =
        $("voice-echo-cancellation");


    const gain =
        $("voice-auto-gain");


    const volume =
        $("voice-volume");


    const mode =
        $("voice-mode");


    const quality =
        $("voice-video-quality");


    if (mic) {

        voiceSettings.microphoneId =
            mic.value ||
            "";

    }


    if (output) {

        voiceSettings.outputDeviceId =
            output.value ||
            "";

    }


    if (noise) {

        voiceSettings.noiseSuppression =
            noise.checked;

    }


    if (echo) {

        voiceSettings.echoCancellation =
            echo.checked;

    }


    if (gain) {

        voiceSettings.autoGainControl =
            gain.checked;

    }


    if (volume) {

        voiceSettings.inputVolume =
            Number(
                volume.value
            ) || 0;

    }


    if (mode) {

        voiceSettings.mode =
            mode.value;

    }


    if (quality) {

        voiceSettings.videoQuality =
            quality.value;

    }


    if (
        conferenceJoined &&
        voiceSettings.microphoneId
    ) {

        await replaceMicrophoneDevice(
            voiceSettings.microphoneId
        );

    }


    if (
        conferenceJoined &&
        getLocalTrack(
            "video"
        )
    ) {

        await applyVideoQualityConstraints();

    }


    await applyOutputDevice();


    updatePushToTalkVisibility();


    const message =
        $("voice-settings-message");


    if (message) {

        message.textContent =
            "✓ Настройки сохранены";


        setTimeout(
            function () {

                message.textContent =
                    "";

            },
            2000
        );

    }

}


function initVoiceSettingsUI() {

    const close =
        $("conference-voice-settings-close");


    const save =
        $("voice-settings-save");


    const mode =
        $("voice-mode");


    const volume =
        $("voice-volume");


    const quality =
        $("voice-video-quality");


    if (close) {

        close.addEventListener(
            "click",
            closeVoiceSettings
        );

    }


    if (save) {

        save.addEventListener(
            "click",
            saveVoiceSettingsFromUI
        );

    }


    if (mode) {

        mode.addEventListener(
            "change",
            function () {

                voiceSettings.mode =
                    mode.value;


                updatePushToTalkVisibility();

            }
        );

    }


    if (volume) {

        volume.addEventListener(
            "input",
            function () {

                voiceSettings.inputVolume =
                    Number(
                        volume.value
                    ) || 0;


                const label =
                    $("voice-volume-label");


                if (label) {

                    label.textContent =
                        voiceSettings.inputVolume +
                        "%";

                }

            }
        );

    }


    if (quality) {

        quality.addEventListener(
            "change",
            function () {

                voiceSettings.videoQuality =
                    quality.value;

            }
        );

    }


    const ptt =
        $("conference-ptt");


    if (ptt) {

        ptt.addEventListener(
            "pointerdown",
            async function (event) {

                event.preventDefault();

                await pushToTalkStart();

            }
        );


        ptt.addEventListener(
            "pointerup",
            async function (event) {

                event.preventDefault();

                await pushToTalkStop();

            }
        );


        ptt.addEventListener(
            "pointercancel",
            async function (event) {

                event.preventDefault();

                await pushToTalkStop();

            }
        );

    }


    document.addEventListener(
        "keydown",
        async function (event) {

            if (
                event.key.toLowerCase() !==
                "v"
            ) {

                return;

            }


            if (
                event.repeat ||
                event.ctrlKey ||
                event.altKey ||
                event.metaKey
            ) {

                return;

            }


            if (
                voiceSettings.mode !==
                "push"
            ) {

                return;

            }


            if (
                document.activeElement &&
                (
                    document.activeElement.tagName ===
                        "INPUT" ||
                    document.activeElement.tagName ===
                        "TEXTAREA" ||
                    document.activeElement.tagName ===
                        "SELECT"
                )
            ) {

                return;

            }


            await pushToTalkStart();

        }
    );


    document.addEventListener(
        "keyup",
        async function (event) {

            if (
                event.key.toLowerCase() !==
                "v"
            ) {

                return;

            }


            if (
                voiceSettings.mode !==
                "push"
            ) {

                return;

            }


            await pushToTalkStop();

        }
    );


    populateVoiceSettings();

}


/* =========================================================
   AUDIO
========================================================= */

async function requestAudioTrack() {

    const environment =
        checkMediaEnvironment();


    if (!environment.ok) {

        throw new Error(
            environment.message
        );

    }


    const audioConstraints = {

        echoCancellation:
            voiceSettings.echoCancellation,

        noiseSuppression:
            voiceSettings.noiseSuppression,

        autoGainControl:
            voiceSettings.autoGainControl

    };


    if (
        voiceSettings.microphoneId
    ) {

        audioConstraints.deviceId = {

            exact:
                voiceSettings.microphoneId

        };

    }


    const stream =
        await navigator.mediaDevices.getUserMedia({

            audio:
                audioConstraints,

            video:
                false

        });


    const track =
        stream.getAudioTracks()[0];


    if (!track) {

        stream
            .getTracks()
            .forEach(
                function (item) {

                    item.stop();

                }
            );


        throw new Error(
            "Микрофон не вернул аудиотрек."
        );

    }


    return track;

}


/* =========================================================
   VIDEO
========================================================= */

function getVideoConstraints() {

    if (
        voiceSettings.videoQuality ===
        "720"
    ) {

        return {

            width: {

                ideal:
                    1280,

                max:
                    1280

            },

            height: {

                ideal:
                    720,

                max:
                    720

            },

            frameRate: {

                ideal:
                    30,

                max:
                    30

            }

        };

    }


    if (
        voiceSettings.videoQuality ===
        "1080"
    ) {

        return {

            width: {

                ideal:
                    1920,

                max:
                    1920

            },

            height: {

                ideal:
                    1080,

                max:
                    1080

            },

            frameRate: {

                ideal:
                    30,

                max:
                    30

            }

        };

    }


    return {

        width: {

            ideal:
                1920,

            max:
                1920

        },

        height: {

            ideal:
                1080,

            max:
                1080

        },

        frameRate: {

            ideal:
                30,

            max:
                30

        }

    };

}


async function requestVideoTrack() {

    const environment =
        checkMediaEnvironment();


    if (!environment.ok) {

        throw new Error(
            environment.message
        );

    }


    const stream =
        await navigator.mediaDevices.getUserMedia({

            video:
                getVideoConstraints(),

            audio:
                false

        });


    const track =
        stream.getVideoTracks()[0];


    if (!track) {

        stream
            .getTracks()
            .forEach(
                function (item) {

                    item.stop();

                }
            );


        throw new Error(
            "Камера не вернула видеотрек."
        );

    }


    return track;

}


/* =========================================================
   LOCAL TRACK
========================================================= */

function ensureLocalStream() {

    if (!localStream) {

        localStream =
            new MediaStream();

    }


    return localStream;

}


function getLocalTrack(
    kind
) {

    if (!localStream) {

        return null;

    }


    return (
        localStream
            .getTracks()
            .find(
                function (track) {

                    return (
                        track.kind ===
                        kind
                    );

                }
            ) ||
        null
    );

}


/* =========================================================
   ENABLE MICROPHONE
========================================================= */

async function enableConferenceMic() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return false;

    }


    const existing =
        getLocalTrack(
            "audio"
        );


    if (existing) {

        await setMicTrackState(
            true
        );


        return true;

    }


    try {

        const track =
            await requestAudioTrack();


        ensureLocalStream();


        localStream.addTrack(
            track
        );


        track.enabled =
            true;


        micEnabled =
            true;


        await replaceAudioOnPeers(
            track
        );


        updateConferenceMediaButtons();


        return true;

    } catch (error) {

        console.error(
            "Microphone:",
            error
        );


        micEnabled =
            false;


        updateConferenceMediaButtons();


        showInfo(
            getMediaErrorMessage(
                error
            )
        );


        return false;

    }

}


/* =========================================================
   MICROPHONE TRACK STATE
========================================================= */

async function setMicTrackState(
    enabled
) {

    const track =
        getLocalTrack(
            "audio"
        );


    if (!track) {

        micEnabled =
            false;


        updateConferenceMediaButtons();


        return;

    }


    track.enabled =
        Boolean(
            enabled
        );


    micEnabled =
        Boolean(
            enabled
        );


    updateConferenceMediaButtons();

}


/* =========================================================
   TOGGLE MICROPHONE
========================================================= */

async function toggleConferenceMic() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return;

    }


    if (
        voiceSettings.mode ===
        "push"
    ) {

        openVoiceSettings();

        return;

    }


    const track =
        getLocalTrack(
            "audio"
        );


    if (!track) {

        await enableConferenceMic();

        return;

    }


    await setMicTrackState(
        !micEnabled
    );

}


/* =========================================================
   PUSH TO TALK
========================================================= */

async function pushToTalkStart() {

    if (
        !conferenceJoined ||
        voiceSettings.mode !==
            "push" ||
        pushToTalkActive
    ) {

        return;

    }


    pushToTalkActive =
        true;


    if (
        !getLocalTrack(
            "audio"
        )
    ) {

        await enableConferenceMic();

    }


    await setMicTrackState(
        true
    );


    const button =
        $("conference-ptt");


    if (button) {

        button.classList.add(
            "active"
        );


        button.textContent =
            "Говорите...";

    }

}


async function pushToTalkStop() {

    if (
        !pushToTalkActive
    ) {

        return;

    }


    pushToTalkActive =
        false;


    if (
        voiceSettings.mode ===
        "push"
    ) {

        await setMicTrackState(
            false
        );

    }


    const button =
        $("conference-ptt");


    if (button) {

        button.classList.remove(
            "active"
        );


        button.textContent =
            "Зажмите для разговора";

    }

}


/* =========================================================
   REPLACE AUDIO
========================================================= */

async function replaceAudioOnPeers(
    track
) {

    const peerIds =
        Object.keys(
            peerConnections
        );


    for (
        const peerId of peerIds
    ) {

        const connection =
            peerConnections[
                peerId
            ];


        if (!connection) {

            continue;

        }


        let transceiver =
            connection
                .getTransceivers()
                .find(
                    function (item) {

                        return (
                            item.receiver &&
                            item.receiver.track &&
                            item.receiver.track.kind ===
                                "audio"
                        );

                    }
                );


        if (!transceiver) {

            transceiver =
                connection.addTransceiver(

                    "audio",

                    {

                        direction:
                            "sendrecv"

                    }

                );

        }


        try {

            await transceiver.sender.replaceTrack(
                track
            );


            transceiver.direction =
                "sendrecv";

        } catch (error) {

            console.warn(
                "Audio replace:",
                error
            );

        }

    }


    await renegotiatePeers();

}


/* =========================================================
   REPLACE MICROPHONE DEVICE
========================================================= */

async function replaceMicrophoneDevice(
    deviceId
) {

    if (!conferenceJoined) {

        return false;

    }


    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({

                audio: {

                    deviceId: {

                        exact:
                            deviceId

                    },

                    echoCancellation:
                        voiceSettings.echoCancellation,

                    noiseSuppression:
                        voiceSettings.noiseSuppression,

                    autoGainControl:
                        voiceSettings.autoGainControl

                },

                video:
                    false

            });


        const newTrack =
            stream.getAudioTracks()[0];


        if (!newTrack) {

            throw new Error(
                "Не удалось получить новый микрофон."
            );

        }


        const oldTrack =
            getLocalTrack(
                "audio"
            );


        ensureLocalStream();


        if (oldTrack) {

            try {

                oldTrack.stop();

            } catch (error) {

                console.warn(
                    error
                );

            }


            localStream.removeTrack(
                oldTrack
            );

        }


        localStream.addTrack(
            newTrack
        );


        newTrack.enabled =
            micEnabled;


        voiceSettings.microphoneId =
            deviceId;


        await replaceAudioOnPeers(
            newTrack
        );


        updateConferenceMediaButtons();


        return true;

    } catch (error) {

        console.error(
            "Microphone device:",
            error
        );


        showInfo(
            getMediaErrorMessage(
                error
            )
        );


        return false;

    }

}


/* =========================================================
   ENABLE CAMERA
========================================================= */

async function enableConferenceCamera() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return false;

    }


    const existing =
        getLocalTrack(
            "video"
        );


    if (existing) {

        existing.enabled =
            true;


        cameraEnabled =
            true;


        updateLocalVideo();

        updateConferenceMediaButtons();


        return true;

    }


    try {

        const track =
            await requestVideoTrack();


        ensureLocalStream();


        localStream.addTrack(
            track
        );


        track.enabled =
            true;


        cameraEnabled =
            true;


        await replaceVideoOnPeers(
            track
        );


        await applyVideoQualityConstraints();


        updateLocalVideo();


        updateConferenceMediaButtons();


        return true;

    } catch (error) {

        console.error(
            "Camera:",
            error
        );


        cameraEnabled =
            false;


        updateConferenceMediaButtons();


        showInfo(
            getMediaErrorMessage(
                error
            )
        );


        return false;

    }

}


/* =========================================================
   TOGGLE CAMERA
========================================================= */

async function toggleConferenceCamera() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return;

    }


    const track =
        getLocalTrack(
            "video"
        );


    if (!track) {

        await enableConferenceCamera();

        return;

    }


    cameraEnabled =
        !cameraEnabled;


    track.enabled =
        cameraEnabled;


    updateLocalVideo();


    updateConferenceMediaButtons();

}


/* =========================================================
   REPLACE VIDEO
========================================================= */

async function replaceVideoOnPeers(
    track
) {

    const peerIds =
        Object.keys(
            peerConnections
        );


    for (
        const peerId of peerIds
    ) {

        const connection =
            peerConnections[
                peerId
            ];


        if (!connection) {

            continue;

        }


        let transceiver =
            connection
                .getTransceivers()
                .find(
                    function (item) {

                        return (
                            item.receiver &&
                            item.receiver.track &&
                            item.receiver.track.kind ===
                                "video"
                        );

                    }
                );


        if (!transceiver) {

            transceiver =
                connection.addTransceiver(

                    "video",

                    {

                        direction:
                            "sendrecv"

                    }

                );

        }


        try {

            await transceiver.sender.replaceTrack(
                track
            );


            transceiver.direction =
                "sendrecv";

        } catch (error) {

            console.warn(
                "Video replace:",
                error
            );

        }

    }


    await configureAllVideoSenders();


    await renegotiatePeers();

}


/* =========================================================
   VIDEO QUALITY
========================================================= */

function getVideoBitrate() {

    if (
        voiceSettings.videoQuality ===
        "720"
    ) {

        return 2800000;

    }


    return 6000000;

}


async function configureVideoSender(
    sender
) {

    if (!sender) {

        return;

    }


    try {

        const parameters =
            sender.getParameters();


        if (!parameters.encodings) {

            parameters.encodings =
                [
                    {}
                ];

        }


        parameters.encodings[0].maxBitrate =
            getVideoBitrate();


        parameters.encodings[0].maxFramerate =
            30;


        await sender.setParameters(
            parameters
        );

    } catch (error) {

        console.warn(
            "Video sender parameters:",
            error
        );

    }

}


async function configureAllVideoSenders() {

    const peers =
        Object.keys(
            peerConnections
        );


    for (
        const peerId of peers
    ) {

        const connection =
            peerConnections[
                peerId
            ];


        if (!connection) {

            continue;

        }


        const senders =
            connection.getSenders();


        for (
            const sender of senders
        ) {

            if (
                sender.track &&
                sender.track.kind ===
                    "video"
            ) {

                await configureVideoSender(
                    sender
                );

            }

        }

    }

}


async function applyVideoQualityConstraints() {

    const track =
        getLocalTrack(
            "video"
        );


    if (!track) {

        return;

    }


    try {

        await track.applyConstraints(
            getVideoConstraints()
        );

    } catch (error) {

        console.warn(
            "Video constraints:",
            error
        );

    }


    await configureAllVideoSenders();

}


/* =========================================================
   PEER CREATION
========================================================= */

function createPeerConnection(
    peerId
) {

    if (
        peerConnections[
            peerId
        ]
    ) {

        return peerConnections[
            peerId
        ];

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


    peerConnections[
        peerId
    ] =
        connection;


    const localAudio =
        getLocalTrack(
            "audio"
        );


    const localVideo =
        getLocalTrack(
            "video"
        );


    /*
       Даже когда своих устройств нет,
       создаём receive-only направления.
    */

    if (localAudio) {

        connection.addTrack(
            localAudio,
            localStream
        );

    } else {

        connection.addTransceiver(

            "audio",

            {

                direction:
                    "recvonly"

            }

        );

    }


    if (localVideo) {

        connection.addTrack(
            localVideo,
            localStream
        );

    } else {

        connection.addTransceiver(

            "video",

            {

                direction:
                    "recvonly"

            }

        );

    }


    connection.onicecandidate =
        async function (event) {

            if (
                !event.candidate ||
                !conferenceChannel ||
                !currentUser
            ) {

                return;

            }


            try {

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

            } catch (error) {

                console.warn(
                    "ICE send:",
                    error
                );

            }

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


            const participant =
                conferenceParticipants[
                    peerId
                ] ||
                {

                    nickname:
                        "Участник",

                    avatar_url:
                        ""

                };


            participant.stream =
                stream;


            conferenceParticipants[
                peerId
            ] =
                participant;


            addRemoteVideo(

                peerId,

                stream,

                participant.nickname,

                participant.avatar_url

            );

        };


    connection.onconnectionstatechange =
        function () {

            console.log(
                "Peer",
                peerId,
                connection.connectionState
            );


            if (
                connection.connectionState ===
                "failed"
            ) {

                try {

                    connection.restartIce();

                } catch (error) {

                    console.warn(
                        error
                    );

                }

            }


            if (
                connection.connectionState ===
                    "closed" ||
                connection.connectionState ===
                    "disconnected"
            ) {

                removePeer(
                    peerId
                );

            }

        };


    connection.onnegotiationneeded =
        function () {

            renegotiatePeer(
                peerId
            );

        };


    return connection;

}


/* =========================================================
   DETERMINISTIC INITIATOR
========================================================= */

function shouldInitiatePeer(
    localId,
    remoteId
) {

    if (
        !localId ||
        !remoteId
    ) {

        return false;

    }


    /*
       Всегда инициирует пользователь
       с лексикографически меньшим UUID.
       Поэтому два клиента не создают offer одновременно.
    */

    return (
        String(localId) <
        String(remoteId)
    );

}


/* =========================================================
   RENEGOTIATE ONE PEER
========================================================= */

async function renegotiatePeer(
    peerId
) {

    if (
        !conferenceJoined ||
        !conferenceChannel ||
        !currentUser ||
        !peerId
    ) {

        return;

    }


    /*
       Не запускаем renegotiation одновременно
       для одного peer.
    */

    if (
        conferenceNegotiating[
            peerId
        ]
    ) {

        return;

    }


    const connection =
        peerConnections[
            peerId
        ];


    if (!connection) {

        return;

    }


    if (
        connection.signalingState !==
        "stable"
    ) {

        return;

    }


    if (
        !shouldInitiatePeer(
            currentUser.id,
            peerId
        )
    ) {

        return;

    }


    conferenceNegotiating[
        peerId
    ] =
        true;


    try {

        const offer =
            await connection.createOffer();


        await connection.setLocalDescription(
            offer
        );


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
            "Renegotiate peer:",
            error
        );

    } finally {

        setTimeout(
            function () {

                delete conferenceNegotiating[
                    peerId
                ];

            },
            500
        );

    }

}


/* =========================================================
   RENEGOTIATE ALL
========================================================= */

async function renegotiatePeers() {

    const peers =
        Object.keys(
            peerConnections
        );


    for (
        const peerId of peers
    ) {

        await renegotiatePeer(
            peerId
        );

    }

}


/* =========================================================
   OFFER
========================================================= */

async function createPeerOffer(
    peerId
) {

    if (
        !conferenceJoined ||
        !currentUser ||
        !peerId
    ) {

        return;

    }


    if (
        !shouldInitiatePeer(
            currentUser.id,
            peerId
        )
    ) {

        return;

    }


    const connection =
        createPeerConnection(
            peerId
        );


    if (
        connection.signalingState !==
        "stable"
    ) {

        return;

    }


    try {

        const offer =
            await connection.createOffer();


        await connection.setLocalDescription(
            offer
        );


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
            "Create offer:",
            error
        );

    }

}


/* =========================================================
   HANDLE OFFER
========================================================= */

async function handleOffer(
    data
) {

    if (
        !data ||
        !data.from ||
        !data.offer ||
        !currentUser
    ) {

        return;

    }


    if (
        data.to !==
        currentUser.id
    ) {

        return;

    }


    const peerId =
        data.from;


    /*
       Если offer уже пришёл от правильного инициатора,
       принимаем его.
    */

    const connection =
        createPeerConnection(
            peerId
        );


    try {

        if (
            connection.signalingState ===
            "have-local-offer"
        ) {

            await connection.setLocalDescription({

                type:
                    "rollback"

            });

        }


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
            "Handle offer:",
            error
        );

    }

}


/* =========================================================
   HANDLE ANSWER
========================================================= */

async function handleAnswer(
    data
) {

    if (
        !data ||
        !data.from ||
        !data.answer ||
        !currentUser
    ) {

        return;

    }


    if (
        data.to !==
        currentUser.id
    ) {

        return;

    }


    const connection =
        peerConnections[
            data.from
        ];


    if (!connection) {

        return;

    }


    try {

        if (
            connection.signalingState !==
            "have-local-offer"
        ) {

            return;

        }


        await connection.setRemoteDescription(

            new RTCSessionDescription(
                data.answer
            )

        );

    } catch (error) {

        console.error(
            "Handle answer:",
            error
        );

    }

}


/* =========================================================
   HANDLE ICE
========================================================= */

async function handleIceCandidate(
    data
) {

    if (
        !data ||
        !data.from ||
        !data.candidate ||
        !currentUser
    ) {

        return;

    }


    if (
        data.to !==
        currentUser.id
    ) {

        return;

    }


    const connection =
        peerConnections[
            data.from
        ];


    if (!connection) {

        return;

    }


    try {

        await connection.addIceCandidate(

            new RTCIceCandidate(
                data.candidate
            )

        );

    } catch (error) {

        console.warn(
            "ICE candidate:",
            error
        );

    }

}


/* =========================================================
   CONFERENCE PRESENCE
========================================================= */

function extractConferencePresence(
    state
) {

    const users =
        [];


    Object.keys(state || {})
        .forEach(
            function (key) {

                const entries =
                    state[key] || [];


                entries.forEach(
                    function (entry) {

                        if (!entry) {

                            return;

                        }


                        const userId =
                            entry.userId ||
                            entry.user_id ||
                            key;


                        if (!userId) {

                            return;

                        }


                        if (
                            currentUser &&
                            userId ===
                                currentUser.id
                        ) {

                            return;

                        }


                        users.push({

                            userId:
                                userId,

                            nickname:
                                entry.nickname ||
                                "Участник",

                            avatar_url:
                                entry.avatar_url ||
                                ""

                        });

                    }
                );

            }
        );


    const unique =
        {};


    users.forEach(
        function (user) {

            unique[
                user.userId
            ] =
                user;

        }
    );


    return Object.values(
        unique
    );

}


/* =========================================================
   SYNC CONFERENCE PEERS
========================================================= */

async function syncConferencePeers() {

    if (
        !conferenceChannel ||
        !conferenceJoined ||
        !currentUser
    ) {

        return;

    }


    const state =
        conferenceChannel.presenceState();


    const users =
        extractConferencePresence(
            state
        );


    updateConferenceParticipantCount(
        users.length + 1
    );


    for (
        const user of users
    ) {

        conferenceParticipants[
            user.userId
        ] =
            Object.assign(

                {},

                conferenceParticipants[
                    user.userId
                ] || {},

                {

                    nickname:
                        user.nickname,

                    avatar_url:
                        user.avatar_url

                }

            );


        /*
           Важное исправление:
           уже присутствующий участник тоже
           становится обнаруживаемым после sync.
        */

        if (
            shouldInitiatePeer(
                currentUser.id,
                user.userId
            )
        ) {

            await createPeerOffer(
                user.userId
            );

        }

    }

}


/* =========================================================
   CONFERENCE START
========================================================= */

async function startConference() {

    if (
        conferenceJoined ||
        !currentUser ||
        !supabaseClient
    ) {

        return;

    }


    if (!conferenceRoom) {

        conferenceRoom =
            "Общая";

    }


    setConferenceStatus(
        "ПОДКЛЮЧЕНИЕ..."
    );


    conferenceJoined =
        true;


    localStream =
        null;


    screenStream =
        null;


    micEnabled =
        false;


    cameraEnabled =
        false;


    screenSharing =
        false;


    peerConnections =
        {};


    conferenceParticipants =
        {};


    conferenceNegotiating =
        {};


    try {

        const channelName =
            getConferenceChannelName();


        console.log(
            "Joining conference room:",
            conferenceRoom,
            channelName
        );


        /*
           ВОТ ГЛАВНОЕ ИЗМЕНЕНИЕ:
           Presence включён непосредственно
           на конференционном канале.
        */

        conferenceChannel =
            supabaseClient.channel(

                channelName,

                {

                    config: {

                        broadcast: {

                            self:
                                false

                        },

                        presence: {

                            key:
                                currentUser.id

                        }

                    }

                }

            );


        /*
           Полная синхронизация уже присутствующих.
        */

        conferenceChannel.on(

            "presence",

            {
                event:
                    "sync"
            },

            async function () {

                console.log(
                    "Conference Presence SYNC",
                    conferenceRoom
                );


                await syncConferencePeers();

            }

        );


        /*
           Новый участник.
        */

        conferenceChannel.on(

            "presence",

            {
                event:
                    "join"
            },

            async function (payload) {

                const key =
                    payload &&
                    payload.key
                        ? payload.key
                        : null;


                const entries =
                    payload &&
                    payload.newPresences
                        ? payload.newPresences
                        : [];


                if (!key) {

                    return;

                }


                if (
                    key ===
                    currentUser.id
                ) {

                    return;

                }


                const entry =
                    entries[0] ||
                    {};


                conferenceParticipants[
                    key
                ] =
                    {

                        nickname:
                            entry.nickname ||
                            "Участник",

                        avatar_url:
                            entry.avatar_url ||
                            ""

                    };


                updateConferenceParticipantCount();


                if (
                    shouldInitiatePeer(
                        currentUser.id,
                        key
                    )
                ) {

                    await createPeerOffer(
                        key
                    );

                }

            }

        );


        /*
           Выход участника.
        */

        conferenceChannel.on(

            "presence",

            {
                event:
                    "leave"
            },

            function (payload) {

                const key =
                    payload &&
                    payload.key
                        ? payload.key
                        : null;


                if (key) {

                    removePeer(
                        key
                    );

                }

            }

        );


        /*
           Broadcast signaling.
        */

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


                await handleIceCandidate(
                    data
                );

            }

        );


        conferenceChannel.subscribe(
            async function (
                status,
                error
            ) {

                console.log(
                    "Conference subscribe:",
                    status,
                    error || ""
                );


                if (
                    status ===
                    "SUBSCRIBED"
                ) {

                    /*
                       Сначала публикуем себя.
                    */

                    await conferenceChannel.track({

                        userId:
                            currentUser.id,

                        nickname:
                            profileData.nickname ||
                            "Player",

                        avatar_url:
                            profileData.avatar_url ||
                            "",

                        status:
                            profileData.status ||
                            "Онлайн",

                        room:
                            conferenceRoom,

                        camera:
                            false,

                        microphone:
                            false

                    });


                    setConferenceStatus(
                        "ПОДКЛЮЧЕНО"
                    );


                    updateConferenceButtons();


                    updateConferenceMediaButtons();


                    updateConferenceParticipantCount();


                    updateLocalVideo();


                    /*
                       Сразу после track() запрашиваем
                       актуальное Presence состояние.
                    */

                    setTimeout(
                        async function () {

                            await syncConferencePeers();

                        },
                        150
                    );


                    showInfo(
                        "Вы вошли в комнату «" +
                        conferenceRoom +
                        "»."
                    );

                }


                if (
                    status ===
                        "CHANNEL_ERROR" ||
                    status ===
                        "TIMED_OUT" ||
                    status ===
                        "CLOSED"
                ) {

                    setConferenceStatus(
                        "ОШИБКА"
                    );


                    showInfo(
                        "Не удалось подключиться к комнате «" +
                        conferenceRoom +
                        "»."
                    );

                }

            }
        );

    } catch (error) {

        console.error(
            "Conference start:",
            error
        );


        await stopConference();


        setConferenceStatus(
            "ОШИБКА"
        );


        showInfo(
            "Не удалось подключить конференцию."
        );

    }

}


/* =========================================================
   UPDATE CONFERENCE PRESENCE
========================================================= */

async function updateConferencePresence() {

    if (
        !conferenceChannel ||
        !conferenceJoined ||
        !currentUser
    ) {

        return;

    }


    try {

        await conferenceChannel.track({

            userId:
                currentUser.id,

            nickname:
                profileData.nickname ||
                "Player",

            avatar_url:
                profileData.avatar_url ||
                "",

            status:
                profileData.status ||
                "Онлайн",

            room:
                conferenceRoom,

            camera:
                cameraEnabled,

            microphone:
                micEnabled

        });

    } catch (error) {

        console.warn(
            "Conference presence track:",
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


    if (
        !container ||
        !conferenceJoined ||
        !currentUser
    ) {

        return;

    }


    const existing =
        container.querySelector(
            '[data-peer-id="' +
            currentUser.id +
            '"]'
        );


    if (existing) {

        existing.remove();

    }


    const localVideo =
        getLocalTrack(
            "video"
        );


    if (
        localVideo &&
        cameraEnabled
    ) {

        const tile =
            createVideoTile(

                currentUser.id,

                localStream,

                profileData.nickname ||
                    "Вы",

                true,

                profileData.avatar_url ||
                    ""

            );


        container.appendChild(
            tile
        );

    } else {

        const tile =
            document.createElement(
                "div"
            );


        tile.className =
            "video-tile";


        tile.dataset.peerId =
            currentUser.id;


        tile.innerHTML = `

            <div
                style="
                    width:100%;
                    height:100%;
                    min-height:130px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    flex-direction:column;
                    gap:9px;
                    background:
                        linear-gradient(
                            180deg,
                            rgba(255,255,255,.94),
                            rgba(237,241,245,.98)
                        );
                    border-radius:12px;
                "
            >

                <div
                    style="
                        font-size:42px;
                    "
                >
                    🤖
                </div>

                <strong>
                    ${escapeHtml(
                        profileData.nickname ||
                        "Вы"
                    )}
                </strong>

                <span
                    style="
                        font-size:10px;
                        color:#7e8994;
                    "
                >
                    Камера выключена
                </span>

            </div>

        `;


        container.appendChild(
            tile
        );

    }


    applyOutputDevice();

}


/* =========================================================
   VIDEO TILE
========================================================= */

function createVideoTile(
    id,
    stream,
    name,
    local,
    avatarUrl
) {

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


    const quality =
        document.createElement(
            "div"
        );


    quality.className =
        "conference-video-quality";


    quality.textContent =
        "LIVE";


    const label =
        document.createElement(
            "div"
        );


    label.className =
        "conference-video-name";


    label.textContent =
        local
            ? name +
              " · Вы"
            : name;


    const toolbar =
        document.createElement(
            "div"
        );


    toolbar.className =
        "conference-video-toolbar";


    const pip =
        document.createElement(
            "button"
        );


    pip.type =
        "button";


    pip.title =
        "Открыть отдельно";


    pip.textContent =
        "⛶";


    pip.addEventListener(
        "click",
        function () {

            openVideoWindow(
                video
            );

        }
    );


    const fullscreen =
        document.createElement(
            "button"
        );


    fullscreen.type =
        "button";


    fullscreen.title =
        "Полный экран";


    fullscreen.textContent =
        "↗";


    fullscreen.addEventListener(
        "click",
        async function () {

            try {

                if (
                    video.requestFullscreen
                ) {

                    await video.requestFullscreen();

                }

            } catch (error) {

                console.warn(
                    error
                );

            }

        }
    );


    toolbar.appendChild(
        pip
    );


    toolbar.appendChild(
        fullscreen
    );


    tile.appendChild(
        video
    );


    tile.appendChild(
        quality
    );


    tile.appendChild(
        label
    );


    tile.appendChild(
        toolbar
    );


    video.addEventListener(
        "loadedmetadata",
        function () {

            quality.textContent =
                getVideoResolutionLabel(
                    video
                );


            applyVideoOutputDevice(
                video
            );

        }
    );


    return tile;

}


/* =========================================================
   VIDEO RESOLUTION LABEL
========================================================= */

function getVideoResolutionLabel(
    video
) {

    if (
        !video ||
        !video.videoWidth ||
        !video.videoHeight
    ) {

        return "LIVE";

    }


    const width =
        video.videoWidth;


    const height =
        video.videoHeight;


    if (
        width >= 1900 &&
        height >= 1000
    ) {

        return "1080p";

    }


    if (
        width >= 1200 &&
        height >= 650
    ) {

        return "720p";

    }


    return (
        width +
        "×" +
        height
    );

}


/* =========================================================
   REMOTE VIDEO
========================================================= */

function addRemoteVideo(
    peerId,
    stream,
    name,
    avatarUrl
) {

    const container =
        $("conference-videos");


    if (!container) {

        return;

    }


    const existing =
        container.querySelector(
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


            applyVideoOutputDevice(
                video
            );

        }


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
        createVideoTile(

            peerId,

            stream,

            name ||
                "Участник",

            false,

            avatarUrl ||
                ""

        );


    container.appendChild(
        tile
    );


    applyOutputDevice();


    updateConferenceParticipantCount();

}


/* =========================================================
   OUTPUT DEVICE
========================================================= */

async function applyVideoOutputDevice(
    video
) {

    if (
        !video ||
        !voiceSettings.outputDeviceId
    ) {

        return;

    }


    if (
        typeof video.setSinkId !==
            "function"
    ) {

        return;

    }


    try {

        await video.setSinkId(
            voiceSettings.outputDeviceId
        );

    } catch (error) {

        console.warn(
            "setSinkId:",
            error
        );

    }

}


async function applyOutputDevice() {

    const videos =
        document.querySelectorAll(
            "#conference-videos video"
        );


    for (
        const video of videos
    ) {

        await applyVideoOutputDevice(
            video
        );

    }

}


/* =========================================================
   PICTURE IN PICTURE
========================================================= */

async function openVideoWindow(
    video
) {

    if (!video) {

        return;

    }


    try {

        await video.play();

    } catch (error) {

        console.warn(
            error
        );

    }


    if (
        document.pictureInPictureEnabled &&
        typeof video.requestPictureInPicture ===
            "function"
    ) {

        try {

            await video.requestPictureInPicture();

            return;

        } catch (error) {

            console.warn(
                "PiP:",
                error
            );

        }

    }


    if (
        "documentPictureInPicture" in
        window
    ) {

        try {

            const pipWindow =
                await window.documentPictureInPicture.requestWindow({

                    width:
                        900,

                    height:
                        560

                });


            documentPiPWindow =
                pipWindow;


            const style =
                pipWindow.document.createElement(
                    "style"
                );


            style.textContent = `

                html,
                body {
                    margin:0;
                    width:100%;
                    height:100%;
                    background:#11151b;
                    overflow:hidden;
                }

                video {
                    width:100%;
                    height:100%;
                    object-fit:contain;
                    background:#000;
                }

            `;


            pipWindow.document.head.appendChild(
                style
            );


            const parent =
                video.parentNode;


            const nextSibling =
                video.nextSibling;


            pipWindow.document.body.appendChild(
                video
            );


            pipWindow.addEventListener(
                "pagehide",
                function () {

                    if (!parent) {

                        return;

                    }


                    if (
                        nextSibling &&
                        nextSibling.parentNode ===
                            parent
                    ) {

                        parent.insertBefore(
                            video,
                            nextSibling
                        );

                    } else {

                        parent.appendChild(
                            video
                        );

                    }


                    documentPiPWindow =
                        null;

                }
            );


            return;

        } catch (error) {

            console.warn(
                "Document PiP:",
                error
            );

        }

    }


    showInfo(
        "Этот браузер не поддерживает отдельное окно видео."
    );

}


/* =========================================================
   UPDATE CONFERENCE VIDEOS
========================================================= */

function updateConferenceVideos() {

    if (!conferenceJoined) {

        return;

    }


    updateLocalVideo();


    Object.keys(
        conferenceParticipants
    )
        .forEach(
            function (peerId) {

                const participant =
                    conferenceParticipants[
                        peerId
                    ];


                if (
                    participant &&
                    participant.stream
                ) {

                    addRemoteVideo(

                        peerId,

                        participant.stream,

                        participant.nickname,

                        participant.avatar_url

                    );

                }

            }
        );


    updateConferenceParticipantCount();


    applyOutputDevice();

}


/* =========================================================
   PARTICIPANT COUNT
========================================================= */

function updateConferenceParticipantCount(
    explicitCount
) {

    const element =
        $("conference-participants-count");


    if (!element) {

        return;

    }


    if (
        typeof explicitCount ===
        "number"
    ) {

        element.textContent =
            String(
                explicitCount
            );

        return;

    }


    const count =
        conferenceJoined
            ? (
                Object.keys(
                    conferenceParticipants
                ).length +
                1
            )
            : 0;


    element.textContent =
        String(
            count
        );

}


/* =========================================================
   REMOVE PEER
========================================================= */

function removePeer(
    peerId
) {

    if (
        peerConnections[
            peerId
        ]
    ) {

        try {

            peerConnections[
                peerId
            ].close();

        } catch (error) {

            console.warn(
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


    delete conferenceNegotiating[
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


    updateConferenceParticipantCount();

}


/* =========================================================
   SCREEN SHARE
========================================================= */

async function toggleConferenceScreen() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return;

    }


    if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getDisplayMedia !==
            "function"
    ) {

        showInfo(
            "Этот браузер не поддерживает демонстрацию экрана."
        );

        return;

    }


    try {

        if (!screenSharing) {

            screenStream =
                await navigator.mediaDevices.getDisplayMedia({

                    video:
                        true

                });


            const track =
                screenStream.getVideoTracks()[0];


            if (!track) {

                return;

            }


            screenSharing =
                true;


            const peers =
                Object.keys(
                    peerConnections
                );


            for (
                const peerId of peers
            ) {

                const connection =
                    peerConnections[
                        peerId
                    ];


                if (!connection) {

                    continue;

                }


                let transceiver =
                    connection
                        .getTransceivers()
                        .find(
                            function (item) {

                                return (
                                    item.receiver &&
                                    item.receiver.track &&
                                    item.receiver.track.kind ===
                                        "video"
                                );

                            }
                        );


                if (!transceiver) {

                    transceiver =
                        connection.addTransceiver(

                            "video",

                            {

                                direction:
                                    "sendrecv"

                            }

                        );

                }


                try {

                    await transceiver.sender.replaceTrack(
                        track
                    );


                    transceiver.direction =
                        "sendrecv";

                } catch (error) {

                    console.warn(
                        "Screen replace:",
                        error
                    );

                }

            }


            const localVideo =
                document
                    .querySelector(
                        '[data-peer-id="' +
                        currentUser.id +
                        '"] video'
                    );


            if (localVideo) {

                localVideo.srcObject =
                    screenStream;

            }


            track.onended =
                function () {

                    stopScreenShare();

                };


            await configureAllVideoSenders();


            await renegotiatePeers();


            updateConferenceMediaButtons();

        } else {

            await stopScreenShare();

        }

    } catch (error) {

        console.error(
            "Screen share:",
            error
        );


        screenSharing =
            false;


        screenStream =
            null;


        updateConferenceMediaButtons();

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
        getLocalTrack(
            "video"
        );


    const peers =
        Object.keys(
            peerConnections
        );


    for (
        const peerId of peers
    ) {

        const connection =
            peerConnections[
                peerId
            ];


        if (!connection) {

            continue;

        }


        const transceiver =
            connection
                .getTransceivers()
                .find(
                    function (item) {

                        return (
                            item.receiver &&
                            item.receiver.track &&
                            item.receiver.track.kind ===
                                "video"
                        );

                    }
                );


        if (!transceiver) {

            continue;

        }


        try {

            if (cameraTrack) {

                await transceiver.sender.replaceTrack(
                    cameraTrack
                );


                transceiver.direction =
                    "sendrecv";

            } else {

                await transceiver.sender.replaceTrack(
                    null
                );


                transceiver.direction =
                    "recvonly";

            }

        } catch (error) {

            console.warn(
                "Restore screen:",
                error
            );

        }

    }


    updateLocalVideo();


    updateConferenceMediaButtons();


    await configureAllVideoSenders();


    await renegotiatePeers();

}


/* =========================================================
   CONFERENCE BUTTONS
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


function updateConferenceMediaButtons() {

    const mic =
        $("conference-mic");


    const camera =
        $("conference-camera");


    const screen =
        $("conference-screen");


    if (mic) {

        if (
            voiceSettings.mode ===
            "push"
        ) {

            mic.textContent =
                "Микрофон: PTT";

        } else {

            mic.textContent =
                micEnabled
                    ? "Микрофон: вкл."
                    : "Микрофон: выкл.";

        }


        mic.classList.toggle(
            "active",
            micEnabled
        );

    }


    if (camera) {

        camera.textContent =
            cameraEnabled
                ? "Камера: вкл."
                : "Камера: выкл.";


        camera.classList.toggle(
            "active",
            cameraEnabled
        );

    }


    if (screen) {

        screen.textContent =
            screenSharing
                ? "Экран: вкл."
                : "Экран";


        screen.classList.toggle(
            "active",
            screenSharing
        );

    }


    updateConferencePresence();

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

            await conferenceChannel.untrack();

        } catch (error) {

            console.warn(
                "Conference untrack:",
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

                    try {

                        track.stop();

                    } catch (error) {

                        console.warn(
                            error
                        );

                    }

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

                    console.warn(
                        error
                    );

                }

            }
        );


    peerConnections =
        {};


    conferenceParticipants =
        {};


    conferenceNegotiating =
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

            console.warn(
                error
            );

        }

    }


    conferenceChannel =
        null;


    conferenceJoined =
        false;


    micEnabled =
        false;


    cameraEnabled =
        false;


    screenSharing =
        false;


    pushToTalkActive =
        false;


    setConferenceStatus(
        "НЕ ПОДКЛЮЧЕНО"
    );


    updateConferenceButtons();

    updateConferenceMediaButtons();

    updateConferenceParticipantCount(
        0
    );


    const videos =
        $("conference-videos");


    if (videos) {

        videos.innerHTML = `

            <div class="conference-placeholder">

                <div class="conference-placeholder-icon">
                    ◉
                </div>

                <strong>
                    ${escapeHtml(
                        conferenceRoom
                    )}
                </strong>

                <span>
                    Войти можно без камеры и микрофона.
                </span>

            </div>

        `;

    }

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


        updateVersion();


        if (appShell) {

            appShell.classList.remove(
                "active"
            );

        }


        initAuthTabs();

        initForms();

        initNavigation();

        initModals();

        initSocialButtons();

        initProfileButtons();

        initAvatarPreview();


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logoutUser
            );

        }


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
