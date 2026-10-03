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
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3_2_Q_IPVc60J3".replace(
        "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3_2_Q_IPVc60J3",
        "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3"
    );

const APP_VERSION =
    "1.8.2";


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

let globalChatRoomId = null;


/* =========================================================
   CONFERENCE
========================================================= */

let conferenceChannel = null;

let conferenceJoined = false;

let conferenceRoom = "global";

let localStream = null;

let screenStream = null;

let micEnabled = false;

let cameraEnabled = false;

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


/* =========================================================
   NOTICE
========================================================= */

function showInfo(message) {

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


        toast.style.position =
            "fixed";


        toast.style.left =
            "50%";


        toast.style.bottom =
            "90px";


        toast.style.transform =
            "translateX(-50%)";


        toast.style.zIndex =
            "99999";


        toast.style.maxWidth =
            "calc(100vw - 30px)";


        toast.style.padding =
            "12px 16px";


        toast.style.border =
            "1px solid rgba(30,40,50,0.2)";


        toast.style.borderRadius =
            "14px";


        toast.style.background =
            "rgba(255,255,255,0.96)";


        toast.style.color =
            "#30363d";


        toast.style.boxShadow =
            "0 8px 30px rgba(0,0,0,0.15), 0 0 20px rgba(59,141,245,0.12)";


        toast.style.fontSize =
            "12px";


        toast.style.lineHeight =
            "1.5";


        toast.style.textAlign =
            "center";


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


/* =========================================================
   VERSION
========================================================= */

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


            /*
               Если avatar_url в profiles пустой,
               но он есть в Auth metadata,
               используем metadata как резерв.
            */

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
                        metadata.age || null,

                    city:
                        metadata.city || null,

                    about:
                        metadata.about || null,

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


            if (insertResult.error) {

                console.error(
                    "Profile insert error:",
                    insertResult.error
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


/* =========================================================
   AVATAR URL
========================================================= */

function normalizeAvatarUrl(
    value
) {

    let url =
        String(value || "").trim();


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


/* =========================================================
   AVATAR RENDER
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
            ? "Аватар " + nickname
            : "Avatar";


    image.decoding =
        "async";


    image.loading =
        "eager";


    image.referrerPolicy =
        "no-referrer";


    /*
       ВАЖНО:
       не добавляем cache-bust параметр.
       Некоторые CDN, VK/Google/внешние хостинги
       ломают такие ссылки после изменения URL.
    */

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


/* =========================================================
   AVATAR PREVIEW
========================================================= */

function initAvatarPreview() {

    const input =
        $("profile-avatar-input");


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        function () {

            const value =
                normalizeAvatarUrl(
                    input.value
                );


            renderAvatar(

                $("profile-modal-avatar"),

                profileData.nickname,

                value

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
        Number(level) || 0;


    if (number <= 0) {
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


    let avatarUrl =
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
                status || "Онлайн",

            age:
                age,

            city:
                city,

            about:
                about,

            avatar_url:
                avatarUrl || null,

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

            console.error(
                "Profile update error:",
                result.error
            );

            throw result.error;

        }


        profileData =
            Object.assign(

                {},

                profileData,

                result.data

            );


        /*
           Также сохраняем данные в Auth metadata.
           Это резервный источник для профиля.
        */

        try {

            const authResult =
                await supabaseClient.auth.updateUser({

                    data: {

                        nickname:
                            nickname,

                        status:
                            status || "Онлайн",

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


            if (authResult.error) {

                console.warn(
                    "Auth metadata update:",
                    authResult.error
                );

            }

        } catch (error) {

            console.warn(
                "Auth metadata update failed:",
                error
            );

        }


        applyProfile();


        renderAvatar(

            $("profile-modal-avatar"),

            nickname,

            avatarUrl

        );


        renderAvatar(

            $("header-avatar"),

            nickname,

            avatarUrl

        );


        renderAvatar(

            $("profile-avatar"),

            nickname,

            avatarUrl

        );


        /*
           Если Presence уже работает,
           отправляем обновлённый avatar_url
           в presence-state.
        */

        if (
            presenceChannel &&
            currentUser
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

                console.warn(
                    "Presence profile refresh:",
                    error
                );

            }

        }


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
                                доступна непосредственно
                                внутри чата.
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

                .select(
                    "id"
                )

                .eq(
                    "type",
                    "global"
                )

                .limit(
                    1
                )

                .maybeSingle();


        if (
            result.error ||
            !result.data
        ) {

            console.error(
                "Global chat room error:",
                result.error
            );


            return null;

        }


        globalChatRoomId =
            result.data.id;


        return globalChatRoomId;

    } catch (error) {

        console.error(
            "Global chat room exception:",
            error
        );


        return null;

    }

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
                            Войти можно даже без камеры и микрофона.
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
   PAGE ROUTER
========================================================= */

function renderPage(page) {

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


    renderHome();

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


function renderOnlinePlayers(
    targetId
) {

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

                    const avatar =
                        user.avatar_url ||
                        "";


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

                const userId =
                    avatarElement.dataset.onlineAvatar;


                const user =
                    presenceUsers.find(
                        function (item) {

                            return (
                                item.user_id ===
                                userId
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
            "Presence untrack:",
            error
        );

    }


    try {

        await supabaseClient.removeChannel(
            presenceChannel
        );

    } catch (error) {

        console.warn(
            "Presence remove:",
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

    const container =
        $("chat-messages");


    if (
        !container ||
        !supabaseClient
    ) {

        return;

    }


    container.innerHTML = `

        <div class="conference-placeholder">

            <strong>
                Загрузка чата...
            </strong>

            <span>
                Подключение к базе данных.
            </span>

        </div>

    `;


    const roomId =
        await getGlobalChatRoomId();


    if (!roomId) {

        container.innerHTML = `

            <div class="conference-placeholder">

                <strong>
                    Глобальная комната чата не найдена
                </strong>

                <span>
                    Проверьте таблицу chat_rooms и глобальную комнату.
                </span>

            </div>

        `;

        return;

    }


    const result =
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


    if (result.error) {

        console.error(
            "Chat load error:",
            result.error
        );


        container.innerHTML = `

            <div class="conference-placeholder">

                <strong>
                    Не удалось загрузить чат
                </strong>

                <span>
                    ${escapeHtml(
                        result.error.message ||
                        "Ошибка базы данных"
                    )}
                </span>

            </div>

        `;

        return;

    }


    renderChatMessages(
        result.data || []
    );

}


function getMessageText(message) {

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


function renderChatMessages(
    messages
) {

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


    if (!roomId) {

        showInfo(
            "Глобальная комната чата не найдена."
        );

        return;

    }


    /*
       Отправляем сразу оба варианта содержимого:
       body — для новой схемы;
       message — для совместимости со старой.
    */

    const payload = {

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

    };


    const result =
        await supabaseClient

            .from("chat_messages")

            .insert(
                payload
            );


    if (result.error) {

        console.error(
            "Chat send error:",
            result.error
        );


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


    const channelName =
        "global-chat-" +
        Date.now();


    chatChannel =
        supabaseClient.channel(
            channelName
        );


    const filter =
        globalChatRoomId
            ? "room_id=eq." +
                globalChatRoomId
            : undefined;


    const changesConfig = {

        event:
            "INSERT",

        schema:
            "public",

        table:
            "chat_messages"

    };


    if (filter) {

        changesConfig.filter =
            filter;

    }


    chatChannel.on(

        "postgres_changes",

        changesConfig,

        function () {

            loadChatMessages();

        }

    );


    chatChannel.subscribe(
        async function (status) {

            console.log(
                "Chat Realtime:",
                status
            );


            if (
                status ===
                "SUBSCRIBED"
            ) {

                const roomId =
                    await getGlobalChatRoomId();


                if (
                    roomId &&
                    chatChannel
                ) {

                    console.log(
                        "Global chat room:",
                        roomId
                    );

                }

            }

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

                updateConferenceVideos();

            }
        );

    }


    updateConferenceButtons();

    updateConferenceMediaButtons();

}


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
   MEDIA ERROR DESCRIPTION
========================================================= */

function getMediaErrorMessage(
    error
) {

    if (!error) {

        return (
            "Не удалось получить доступ " +
            "к устройству."
        );

    }


    switch (
        error.name
    ) {

        case "NotAllowedError":

            return (
                "Доступ к устройству запрещён. " +
                "Разрешите использование камеры или микрофона " +
                "в настройках браузера."
            );


        case "PermissionDeniedError":

            return (
                "Браузер запретил доступ к устройству."
            );


        case "NotFoundError":

            return (
                "Запрошенное устройство не найдено."
            );


        case "DevicesNotFoundError":

            return (
                "Запрошенное устройство не найдено."
            );


        case "NotReadableError":

            return (
                "Устройство уже используется другим приложением."
            );


        case "TrackStartError":

            return (
                "Не удалось запустить устройство."
            );


        case "OverconstrainedError":

            return (
                "Устройство не поддерживает запрошенный режим."
            );


        case "SecurityError":

            return (
                "Браузер заблокировал доступ к устройству."
            );


        case "TypeError":

            return (
                "Устройство недоступно. " +
                "Проверьте HTTPS-соединение."
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
   MEDIA DEVICE CHECK
========================================================= */

function checkMediaEnvironment() {

    if (
        !window.isSecureContext &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
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
                "Этот браузер не предоставляет доступ к устройствам."

        };

    }


    return {
        ok:
            true
    };

}


/* =========================================================
   REQUEST AUDIO
========================================================= */

async function requestAudioTrack() {

    const environment =
        checkMediaEnvironment();


    if (!environment.ok) {

        throw new Error(
            environment.message
        );

    }


    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({

                audio: {

                    echoCancellation:
                        true,

                    noiseSuppression:
                        true,

                    autoGainControl:
                        true

                },

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

    } catch (error) {

        throw error;

    }

}


/* =========================================================
   REQUEST VIDEO
========================================================= */

async function requestVideoTrack() {

    const environment =
        checkMediaEnvironment();


    if (!environment.ok) {

        throw new Error(
            environment.message
        );

    }


    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {

                        ideal:
                            "user"

                    },

                    width: {

                        ideal:
                            1280

                    },

                    height: {

                        ideal:
                            720

                    }

                },

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

    } catch (firstError) {

        console.warn(
            "Primary video request failed:",
            firstError
        );


        if (
            firstError &&
            (
                firstError.name ===
                    "OverconstrainedError" ||
                firstError.name ===
                    "ConstraintNotSatisfiedError"
            )
        ) {

            const fallback =
                await navigator.mediaDevices.getUserMedia({

                    video:
                        true,

                    audio:
                        false

                });


            const track =
                fallback.getVideoTracks()[0];


            if (!track) {

                fallback
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


        throw firstError;

    }

}


/* =========================================================
   LOCAL STREAM HELPERS
========================================================= */

function ensureLocalStream() {

    if (!localStream) {

        localStream =
            new MediaStream();

    }


    return localStream;

}


function addTrackToLocalStream(
    track
) {

    const stream =
        ensureLocalStream();


    const existing =
        stream
            .getTracks()
            .find(
                function (item) {

                    return (
                        item.kind ===
                        track.kind
                    );

                }
            );


    if (existing) {

        existing.stop();

        stream.removeTrack(
            existing
        );

    }


    stream.addTrack(
        track
    );


    return stream;

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
   ADD OR REPLACE LOCAL TRACK
========================================================= */

async function addOrReplaceLocalTrack(
    kind,
    track
) {

    Object.keys(
        peerConnections
    )
        .forEach(
            async function (peerId) {

                const connection =
                    peerConnections[
                        peerId
                    ];


                if (
                    !connection ||
                    connection.connectionState ===
                        "closed"
                ) {

                    return;

                }


                try {

                    let sender =
                        connection
                            .getSenders()
                            .find(
                                function (item) {

                                    return (
                                        item.track &&
                                        item.track.kind ===
                                            kind
                                    );

                                }
                            );


                    let transceiver =
                        connection
                            .getTransceivers()
                            .find(
                                function (item) {

                                    return (
                                        item.receiver &&
                                        item.receiver.track &&
                                        item.receiver.track.kind ===
                                            kind
                                    );

                                }
                            );


                    if (!transceiver) {

                        transceiver =
                            connection.addTransceiver(
                                kind,
                                {
                                    direction:
                                        "sendrecv"
                                }
                            );

                    }


                    sender =
                        transceiver.sender;


                    if (sender) {

                        await sender.replaceTrack(
                            track
                        );

                    }


                    transceiver.direction =
                        "sendrecv";

                } catch (error) {

                    console.warn(
                        "Replace local track error:",
                        error
                    );

                }

            }
        );


    updateLocalVideo();

    await renegotiatePeers();

}


/* =========================================================
   REMOVE LOCAL TRACK
========================================================= */

async function removeLocalTrack(
    kind
) {

    if (!localStream) {
        return;
    }


    const track =
        getLocalTrack(
            kind
        );


    if (track) {

        track.stop();

        try {

            localStream.removeTrack(
                track
            );

        } catch (error) {

            console.warn(
                error
            );

        }

    }


    Object.keys(
        peerConnections
    )
        .forEach(
            async function (peerId) {

                const connection =
                    peerConnections[
                        peerId
                    ];


                if (!connection) {
                    return;
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
                                        kind
                                );

                            }
                        );


                if (transceiver) {

                    try {

                        await transceiver.sender.replaceTrack(
                            null
                        );


                        transceiver.direction =
                            "recvonly";

                    } catch (error) {

                        console.warn(
                            "Remove local track:",
                            error
                        );

                    }

                }

            }
        );


    updateLocalVideo();

    await renegotiatePeers();

}


/* =========================================================
   ENABLE AUDIO
========================================================= */

async function enableConferenceMic() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return false;

    }


    if (
        getLocalTrack(
            "audio"
        )
    ) {

        const track =
            getLocalTrack(
                "audio"
            );


        track.enabled =
            true;


        micEnabled =
            true;


        updateConferenceMediaButtons();

        return true;

    }


    try {

        const track =
            await requestAudioTrack();


        addTrackToLocalStream(
            track
        );


        track.enabled =
            true;


        micEnabled =
            true;


        await addOrReplaceLocalTrack(
            "audio",
            track
        );


        updateConferenceMediaButtons();


        return true;

    } catch (error) {

        console.error(
            "Microphone error:",
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
   ENABLE VIDEO
========================================================= */

async function enableConferenceCamera() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return false;

    }


    if (
        getLocalTrack(
            "video"
        )
    ) {

        const track =
            getLocalTrack(
                "video"
            );


        track.enabled =
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


        addTrackToLocalStream(
            track
        );


        track.enabled =
            true;


        cameraEnabled =
            true;


        await addOrReplaceLocalTrack(
            "video",
            track
        );


        updateLocalVideo();

        updateConferenceMediaButtons();


        return true;

    } catch (error) {

        console.error(
            "Camera error:",
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
   CONFERENCE BUTTON STATE
========================================================= */

function updateConferenceMediaButtons() {

    const mic =
        $("conference-mic");


    const camera =
        $("conference-camera");


    if (mic) {

        mic.textContent =
            micEnabled
                ? "Микрофон: вкл."
                : "Микрофон: выкл.";


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


    const screen =
        $("conference-screen");


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


    setConferenceStatus(
        "ПОДКЛЮЧЕНИЕ..."
    );


    /*
       ВАЖНО:
       здесь больше НЕТ getUserMedia().
       Камера и микрофон НЕ обязательны.
    */

    micEnabled =
        false;


    cameraEnabled =
        false;


    screenSharing =
        false;


    localStream =
        null;


    conferenceJoined =
        true;


    conferenceParticipants =
        {};


    try {

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

                const data =
                    payload &&
                    payload.payload
                        ? payload.payload
                        : null;


                if (!data) {
                    return;
                }


                if (
                    !data.userId ||
                    data.userId ===
                        currentUser.id
                ) {

                    return;

                }


                await createPeerOffer(
                    data.userId
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

                const data =
                    payload &&
                    payload.payload
                        ? payload.payload
                        : null;


                if (
                    data &&
                    data.userId
                ) {

                    removePeer(
                        data.userId
                    );

                }

            }

        );


        conferenceChannel.subscribe(
            async function (status) {

                console.log(
                    "Conference Realtime:",
                    status
                );


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
                                "Player",

                            avatar_url:
                                profileData.avatar_url ||
                                ""

                        }

                    });


                    setConferenceStatus(
                        "ПОДКЛЮЧЕНО"
                    );


                    updateConferenceButtons();

                    updateConferenceMediaButtons();

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
                        "ОШИБКА ПОДКЛЮЧЕНИЯ"
                    );


                    showInfo(
                        "Не удалось подключить конференцию к Supabase Realtime."
                    );

                }

            }
        );

    } catch (error) {

        console.error(
            "Conference setup error:",
            error
        );


        await stopConference();


        setConferenceStatus(
            "ОШИБКА"
        );


        showInfo(
            "Не удалось подключить конференцию. " +
            "Проверьте соединение с Supabase Realtime."
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


    /*
       Если локальных устройств пока нет,
       создаём recvonly transceivers.
       Это позволяет принимать медиа,
       даже если собственная камера/гарнитура выключены.
    */

    const localAudio =
        getLocalTrack(
            "audio"
        );


    const localVideo =
        getLocalTrack(
            "video"
        );


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


    return connection;

}


/* =========================================================
   RENEGOTIATE
========================================================= */

async function renegotiatePeers() {

    if (
        !conferenceJoined ||
        !conferenceChannel
    ) {

        return;

    }


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


        if (
            !connection ||
            connection.connectionState ===
                "closed"
        ) {

            continue;

        }


        if (
            connection.signalingState !==
            "stable"
        ) {

            continue;

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
                "Renegotiation error:",
                error
            );

        }

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
        !peerId ||
        peerId ===
            currentUser.id
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
   HANDLE OFFER
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


        if (
            connection.signalingState ===
            "closed"
        ) {

            return;

        }


        if (
            connection.signalingState !==
            "stable" &&
            connection.signalingState !==
            "have-local-offer"
        ) {

            return;

        }


        if (
            connection.signalingState ===
            "have-local-offer"
        ) {

            try {

                await connection.setLocalDescription(
                    {
                        type:
                            "rollback"
                    }
                );

            } catch (error) {

                console.warn(
                    "Rollback failed:",
                    error
                );

            }

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
            "Handle offer error:",
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

    try {

        const connection =
            peerConnections[
                data.from
            ];


        if (!connection) {
            return;
        }


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
            "Answer error:",
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


    const oldLocal =
        container.querySelector(
            '[data-peer-id="' +
            (
                currentUser
                    ? currentUser.id
                    : "local"
            ) +
            '"]'
        );


    if (oldLocal) {

        oldLocal.remove();

    }


    if (
        !conferenceJoined ||
        !currentUser
    ) {

        return;

    }


    const videoTrack =
        getLocalTrack(
            "video"
        );


    if (
        videoTrack &&
        cameraEnabled
    ) {

        const stream =
            localStream;


        addVideoTile(

            currentUser.id,

            stream,

            profileData.nickname ||
                "Вы",

            true

        );

        return;

    }


    addLocalPlaceholderTile();

}


function addLocalPlaceholderTile() {

    const container =
        $("conference-videos");


    if (!container || !currentUser) {
        return;
    }


    const placeholder =
        container.querySelector(
            ".conference-placeholder"
        );


    if (placeholder && conferenceParticipants &&
        Object.keys(conferenceParticipants).length === 0) {

        placeholder.remove();

    }


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
                min-height:120px;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-direction:column;
                gap:8px;
                background:rgba(30,40,50,.06);
                border-radius:12px;
            "
        >

            <div
                style="
                    font-size:42px;
                "
            >
                ${getLocalTrack("video") ? "◉" : "🤖"}
            </div>

            <strong>
                ${escapeHtml(
                    profileData.nickname ||
                    "Вы"
                )}
            </strong>

            <span
                style="
                    font-size:11px;
                    opacity:.7;
                "
            >
                ${
                    cameraEnabled
                        ? "Камера активна"
                        : "Камера выключена"
                }
            </span>

        </div>

    `;


    container.appendChild(
        tile
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


    const existing =
        container.querySelector(
            '[data-peer-id="' +
            id +
            '"]'
        );


    if (existing) {

        const existingVideo =
            existing.querySelector(
                "video"
            );


        if (existingVideo) {

            existingVideo.srcObject =
                stream;

        }


        return;

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


    const tile =
        document.querySelector(
            '[data-peer-id="' +
            peerId +
            '"]'
        );


    if (tile) {

        tile.remove();

    }


    if (
        conferenceJoined &&
        Object.keys(
            peerConnections
        ).length === 0
    ) {

        const localTile =
            document.querySelector(
                '[data-peer-id="' +
                (
                    currentUser
                        ? currentUser.id
                        : ""
                ) +
                '"]'
            );


        if (!localTile) {

            addLocalPlaceholderTile();

        }

    }

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


/* =========================================================
   MIC
========================================================= */

async function toggleConferenceMic() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return;

    }


    const existingTrack =
        getLocalTrack(
            "audio"
        );


    if (!existingTrack) {

        await enableConferenceMic();

        return;

    }


    micEnabled =
        !micEnabled;


    existingTrack.enabled =
        micEnabled;


    if (!micEnabled) {

        /*
           Track остаётся в localStream,
           но перестаёт передавать звук.
        */

    }


    updateConferenceMediaButtons();

}


/* =========================================================
   CAMERA
========================================================= */

async function toggleConferenceCamera() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return;

    }


    const existingTrack =
        getLocalTrack(
            "video"
        );


    if (!existingTrack) {

        await enableConferenceCamera();

        return;

    }


    cameraEnabled =
        !cameraEnabled;


    existingTrack.enabled =
        cameraEnabled;


    updateLocalVideo();

    updateConferenceMediaButtons();

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
                    async function (peerId) {

                        const connection =
                            peerConnections[
                                peerId
                            ];


                        if (!connection) {
                            return;
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
                                screenTrack
                            );


                            transceiver.direction =
                                "sendrecv";

                        } catch (error) {

                            console.warn(
                                "Screen sender error:",
                                error
                            );

                        }

                    }
                );


            /*
               Показываем экран локально.
            */

            const container =
                $("conference-videos");


            if (container) {

                const oldLocal =
                    container.querySelector(
                        '[data-peer-id="' +
                        currentUser.id +
                        '"]'
                    );


                if (oldLocal) {

                    oldLocal.remove();

                }


                addVideoTile(

                    currentUser.id,

                    screenStream,

                    profileData.nickname ||
                        "Вы",

                    true

                );

            }


            screenTrack.onended =
                function () {

                    stopScreenShare();

                };


            updateConferenceMediaButtons();

            await renegotiatePeers();

        } else {

            await stopScreenShare();

        }

    } catch (error) {

        console.error(
            "Screen share error:",
            error
        );


        screenSharing =
            false;


        screenStream =
            null;


        updateConferenceMediaButtons();

    }

}


/* =========================================================
   STOP SCREEN SHARE
========================================================= */

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


    Object.keys(
        peerConnections
    )
        .forEach(
            async function (peerId) {

                const connection =
                    peerConnections[
                        peerId
                    ];


                if (!connection) {
                    return;
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
                    return;
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
                        "Restore camera track:",
                        error
                    );

                }

            }
        );


    updateLocalVideo();

    updateConferenceMediaButtons();

    await renegotiatePeers();

}


/* =========================================================
   REFRESH CONFERENCE VIDEO
========================================================= */

function updateConferenceVideos() {

    if (!conferenceJoined) {

        showInfo(
            "Сначала войдите в конференцию."
        );

        return;

    }


    updateLocalVideo();


    Object.keys(
        conferenceParticipants
    )
        .forEach(
            function (peerId) {

                const stream =
                    conferenceParticipants[
                        peerId
                    ];


                if (!stream) {
                    return;
                }


                addRemoteVideo(
                    peerId,
                    stream
                );

            }
        );

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

            console.warn(
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


    setConferenceStatus(
        "НЕ ПОДКЛЮЧЕНО"
    );


    updateConferenceButtons();

    updateConferenceMediaButtons();


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
