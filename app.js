/*
=========================================================
GAMEHUB
Основной frontend
=========================================================

Этот файл отвечает за:

- маршрутизацию;
- главную страницу;
- поиск;
- регистрацию;
- вход;
- выход;
- профиль;
- смену пароля;
- создание игры;
- отображение игр;
- отображение гильдий;
- базовую структуру гильдий;
- проверку авторизации;
- подключение Supabase.

Игровые механики конкретной игры НЕ должны
зашиваться сюда.

Например механика WOSB будет находиться
в отдельном модуле:

games/wosb/

=========================================================
*/


/* ======================================================
   ПРОВЕРКА CONFIG
====================================================== */

if (!window.GAMEHUB_CONFIG_READY) {

    console.warn(
        "GameHub: необходимо заполнить supabase-config.js"
    );

}


/* ======================================================
   SUPABASE CLIENT
====================================================== */

let supabaseClient = null;

if (
    window.GAMEHUB_CONFIG &&
    window.GAMEHUB_CONFIG.SUPABASE_URL &&
    window.GAMEHUB_CONFIG.SUPABASE_ANON_KEY
) {

    supabaseClient = window.supabase.createClient(

        window.GAMEHUB_CONFIG.SUPABASE_URL,

        window.GAMEHUB_CONFIG.SUPABASE_ANON_KEY

    );

}


/* ======================================================
   GLOBAL STATE
====================================================== */

const state = {

    session: null,

    user: null,

    profile: null,

    currentGame: null,

    currentGuild: null

};


/* ======================================================
   DOM
====================================================== */

const app = document.getElementById("app");

const headerUserArea =
    document.getElementById("header-user-area");

const toastElement =
    document.getElementById("toast");

const modalOverlay =
    document.getElementById("modal-overlay");

const modalElement =
    document.getElementById("modal");

const modalContent =
    document.getElementById("modal-content");

const modalClose =
    document.getElementById("modal-close");


/* ======================================================
   UTILITY
====================================================== */


/*
Безопасный вывод пользовательского текста.
*/

function escapeHtml(value) {

    if (value === null || value === undefined) {

        return "";

    }

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


/*
Получение параметров query string.
*/

function getQueryParams() {

    const hash = window.location.hash;

    const questionIndex =
        hash.indexOf("?");

    if (questionIndex === -1) {

        return new URLSearchParams();

    }

    return new URLSearchParams(
        hash.substring(questionIndex + 1)
    );

}


/*
Получение пути из hash.
*/

function getRoute() {

    let hash =
        window.location.hash || "#/";

    hash =
        hash.replace(/^#/, "");

    if (!hash) {

        hash = "/";

    }

    const questionIndex =
        hash.indexOf("?");

    if (questionIndex !== -1) {

        hash =
            hash.substring(0, questionIndex);

    }

    if (!hash.startsWith("/")) {

        hash =
            "/" + hash;

    }

    return hash;

}


/*
Разбор маршрута.
*/

function getRouteParts() {

    return getRoute()

        .split("/")

        .filter(Boolean);

}


/*
Переход.
*/

function navigate(path) {

    window.location.hash = path;

}


/*
Уведомление.
*/

function showToast(
    message,
    type = "default"
) {

    if (!toastElement) {

        return;

    }

    toastElement.textContent =
        message;

    toastElement.className =
        "toast show";

    if (type === "success") {

        toastElement.style.background =
            "#16834b";

    }
    else if (type === "error") {

        toastElement.style.background =
            "#d93636";

    }
    else if (type === "warning") {

        toastElement.style.background =
            "#a66a00";

    }
    else {

        toastElement.style.background =
            "#17212b";

    }

    clearTimeout(
        showToast.timeout
    );

    showToast.timeout =
        setTimeout(() => {

            toastElement.classList.remove(
                "show"
            );

        }, 3000);

}


/*
Открытие модального окна.
*/

function openModal(content) {

    modalContent.innerHTML =
        content;

    modalOverlay.hidden =
        false;

    document.body.style.overflow =
        "hidden";

}


/*
Закрытие модального окна.
*/

function closeModal() {

    modalOverlay.hidden =
        true;

    modalContent.innerHTML =
        "";

    document.body.style.overflow =
        "";

}


/*
HTML кнопки назад.
*/

function backButton(
    fallback = "#/"
) {

    return `
        <button
            class="btn btn-secondary"
            type="button"
            onclick="
                if (history.length > 1) {
                    history.back();
                } else {
                    location.hash='${fallback}';
                }
            "
        >
            ← Назад
        </button>
    `;

}


/* ======================================================
   SUPABASE CHECK
====================================================== */

function isSupabaseConfigured() {

    return Boolean(

        supabaseClient &&

        window.GAMEHUB_CONFIG_READY

    );

}


/*
Если Supabase не настроен,
показываем понятное сообщение.
*/

function renderConfigurationError() {

    app.innerHTML = `

        <div class="page">

            <div class="card">

                <h1>
                    Настройка Supabase
                </h1>

                <div class="notice notice-warning">

                    <strong>
                        Supabase ещё не подключён.
                    </strong>

                    <p>
                        Откройте файл
                        <b>supabase-config.js</b>
                        и вставьте URL проекта и
                        публичный ключ Supabase.
                    </p>

                </div>

                <div class="divider"></div>

                <p class="muted">

                    После этого обновите страницу.

                </p>

            </div>

        </div>

    `;

}


/* ======================================================
   AUTH
====================================================== */


/*
Загрузка текущей сессии.
*/

async function loadSession() {

    if (!isSupabaseConfigured()) {

        return;

    }

    const result =
        await supabaseClient.auth.getSession();

    if (result.error) {

        console.error(
            result.error
        );

        return;

    }

    state.session =
        result.data.session;

    state.user =
        state.session?.user || null;


    if (state.user) {

        await loadProfile();

    }

}


/*
Загрузка профиля.
*/

async function loadProfile() {

    if (!state.user) {

        state.profile =
            null;

        return;

    }

    const result =
        await supabaseClient

            .from("profiles")

            .select("*")

            .eq(
                "id",
                state.user.id
            )

            .maybeSingle();


    if (result.error) {

        console.error(
            "Ошибка профиля:",
            result.error
        );

        state.profile =
            null;

        return;

    }

    state.profile =
        result.data;

}


/*
Обновление шапки.
*/

function renderHeader() {

    if (!headerUserArea) {

        return;

    }


    if (!state.user) {

        headerUserArea.innerHTML = `

            <a
                href="#/login"
                class="btn btn-secondary btn-small"
            >
                Войти
            </a>

            <a
                href="#/register"
                class="btn btn-small"
            >
                Регистрация
            </a>

        `;

        return;

    }


    const nickname =
        state.profile?.nickname ||
        state.user.email ||
        "Пользователь";


    const isOwner =
        state.profile?.role === "owner";


    headerUserArea.innerHTML = `

        <div class="user-mini">

            <div class="user-mini-avatar">

                ${escapeHtml(
                    nickname
                        .substring(0, 1)
                        .toUpperCase()
                )}

            </div>

            <span class="user-mini-name">

                ${escapeHtml(nickname)}

            </span>

        </div>

        <a
            href="#/profile"
            class="btn btn-secondary btn-small"
        >
            Профиль
        </a>

        ${
            isOwner
                ? `
                    <a
                        href="#/admin"
                        class="btn btn-secondary btn-small"
                    >
                        Админ
                    </a>
                  `
                : ""
        }

        <button
            class="btn btn-small"
            type="button"
            onclick="logoutUser()"
        >
            Выйти
        </button>

    `;

}


/*
Выход.
*/

async function logoutUser() {

    if (!supabaseClient) {

        return;

    }

    const result =
        await supabaseClient.auth.signOut();

    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }

    state.session = null;

    state.user = null;

    state.profile = null;

    renderHeader();

    navigate("/");

    showToast(
        "Вы вышли из аккаунта",
        "success"
    );

}


/*
Проверка авторизации.
*/

function requireAuth() {

    if (!state.user) {

        navigate(
            "/login?redirect=" +
            encodeURIComponent(
                getRoute()
            )
        );

        return false;

    }

    return true;

}


/* ======================================================
   HOME
====================================================== */

async function renderHome() {

    let games = [];

    if (isSupabaseConfigured()) {

        const result =
            await supabaseClient

                .from("games")

                .select("*")

                .eq(
                    "is_published",
                    true
                )

                .order(
                    "name",
                    {
                        ascending: true
                    }
                );

        if (!result.error) {

            games =
                result.data || [];

        }

    }


    app.innerHTML = `

        <div class="page">

            <section class="card hero">

                <h1>
                    Игровая платформа
                </h1>

                <p>

                    Игры, гильдии, союзы,
                    форумы, рынок, рейтинги
                    и игровые инструменты
                    в одной платформе.

                </p>

                <div class="actions">

                    <a
                        href="#/search"
                        class="btn"
                    >
                        Найти игру
                    </a>

                    <a
                        href="#/create-game"
                        class="btn btn-secondary"
                    >
                        Создать игру
                    </a>

                </div>

            </section>


            <div
                class="actions"
                style="justify-content:space-between"
            >

                <h2>
                    Игры
                </h2>

                <a
                    href="#/search"
                    class="btn btn-secondary btn-small"
                >
                    Все игры
                </a>

            </div>


            ${
                games.length
                    ? `
                        <section class="grid">

                            ${games
                                .map(
                                    renderGameCard
                                )
                                .join("")}

                        </section>
                      `
                    : `
                        <div class="card">

                            <div class="empty-state">

                                <div
                                    class="empty-state-icon"
                                >
                                    🎮
                                </div>

                                <h3>
                                    Игр пока нет
                                </h3>

                                <p>
                                    Создайте первую игру,
                                    чтобы начать формировать
                                    игровое сообщество.
                                </p>

                                ${
                                    state.user
                                        ? `
                                            <a
                                                href="#/create-game"
                                                class="btn"
                                            >
                                                Создать игру
                                            </a>
                                          `
                                        : `
                                            <a
                                                href="#/register"
                                                class="btn"
                                            >
                                                Зарегистрироваться
                                            </a>
                                          `
                                }

                            </div>

                        </div>
                      `
            }

        </div>

    `;

}


/*
Карточка игры.
*/

function renderGameCard(game) {

    const image =
        game.image_url
            ? `
                <img
                    class="game-card-image"
                    src="${escapeHtml(game.image_url)}"
                    alt=""
                >
              `
            : `
                <div
                    class="game-card-image"
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:48px;
                    "
                >
                    🎮
                </div>
              `;


    return `

        <article class="card game-card">

            ${image}

            <div class="game-card-content">

                <h3
                    class="game-card-title"
                >
                    ${escapeHtml(game.name)}
                </h3>

                <p
                    class="game-card-description"
                >
                    ${escapeHtml(
                        game.description ||
                        "Описание игры пока не добавлено."
                    )}
                </p>

                <a
                    href="#/game/${game.id}"
                    class="btn btn-small"
                >
                    Открыть игру
                </a>

            </div>

        </article>

    `;

}


/* ======================================================
   SEARCH
====================================================== */

async function renderSearch() {

    let games = [];

    if (isSupabaseConfigured()) {

        const result =
            await supabaseClient

                .from("games")

                .select("*")

                .eq(
                    "is_published",
                    true
                )

                .order(
                    "name",
                    {
                        ascending: true
                    }
                );

        if (!result.error) {

            games =
                result.data || [];

        }

    }


    app.innerHTML = `

        <div class="page">

            <div class="card">

                <h1>
                    Поиск игр
                </h1>

                <div class="search-box">

                    <span class="search-icon">
                        🔎
                    </span>

                    <input
                        id="game-search"
                        type="search"
                        placeholder="Введите название игры..."
                        autocomplete="off"
                    >

                </div>

            </div>


            <div
                id="game-search-results"
                class="grid"
                style="margin-top:16px"
            >

                ${
                    games.length
                        ? games
                            .map(
                                renderGameCard
                            )
                            .join("")
                        : `
                            <div class="card empty-state">
                                Игр пока нет.
                            </div>
                          `
                }

            </div>

        </div>

    `;


    const input =
        document.getElementById(
            "game-search"
        );

    const results =
        document.getElementById(
            "game-search-results"
        );


    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();


            const filtered =
                games.filter(
                    game => {

                        const text =
                            (
                                game.name +
                                " " +
                                (
                                    game.description ||
                                    ""
                                )
                            )
                                .toLowerCase();

                        return text.includes(
                            query
                        );

                    }
                );


            if (!filtered.length) {

                results.innerHTML = `

                    <div
                        class="card empty-state"
                    >

                        Ничего не найдено.

                    </div>

                `;

                return;

            }


            results.innerHTML =
                filtered
                    .map(
                        renderGameCard
                    )
                    .join("");

        }
    );

}


/* ======================================================
   LOGIN
====================================================== */

async function renderLogin() {

    const params =
        getQueryParams();

    const redirect =
        params.get("redirect") ||
        "/";


    app.innerHTML = `

        <div class="page">

            <div
                class="card"
                style="
                    max-width:480px;
                    margin:0 auto;
                "
            >

                <h1>
                    Вход
                </h1>

                <p class="muted">
                    Войдите в свой аккаунт
                    GameHub.
                </p>

                <form
                    id="login-form"
                    class="form"
                >

                    <div class="form-group">

                        <label
                            class="form-label"
                            for="login-email"
                        >
                            Email
                        </label>

                        <input
                            id="login-email"
                            type="email"
                            required
                            autocomplete="email"
                        >

                    </div>


                    <div class="form-group">

                        <label
                            class="form-label"
                            for="login-password"
                        >
                            Пароль
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            required
                            autocomplete="current-password"
                        >

                    </div>


                    <button
                        class="btn btn-full"
                        type="submit"
                    >
                        Войти
                    </button>

                </form>


                <div class="divider"></div>


                <p class="muted">

                    Нет аккаунта?

                    <a
                        href="#/register"
                        style="color:var(--primary);font-weight:700"
                    >
                        Зарегистрироваться
                    </a>

                </p>

            </div>

        </div>

    `;


    document
        .getElementById("login-form")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await loginUser(
                    redirect
                );

            }
        );

}


/*
Авторизация.
*/

async function loginUser(
    redirect = "/"
) {

    if (!isSupabaseConfigured()) {

        showToast(
            "Сначала настройте Supabase.",
            "warning"
        );

        return;

    }


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


    const result =
        await supabaseClient.auth
            .signInWithPassword({

                email,

                password

            });


    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }


    state.session =
        result.data.session;

    state.user =
        state.session?.user || null;


    await loadProfile();

    renderHeader();


    navigate(
        redirect || "/"
    );


    showToast(
        "Вы успешно вошли.",
        "success"
    );

}


/* ======================================================
   REGISTER
====================================================== */

async function renderRegister() {

    app.innerHTML = `

        <div class="page">

            <div
                class="card"
                style="
                    max-width:520px;
                    margin:0 auto;
                "
            >

                <h1>
                    Регистрация
                </h1>

                <p class="muted">

                    Создайте аккаунт,
                    чтобы вступать в гильдии
                    и создавать игровые сообщества.

                </p>


                <form
                    id="register-form"
                    class="form"
                >

                    <div class="form-group">

                        <label
                            class="form-label"
                            for="register-nickname"
                        >
                            Никнейм
                        </label>

                        <input
                            id="register-nickname"
                            type="text"
                            maxlength="40"
                            required
                            autocomplete="nickname"
                            placeholder="Ваш никнейм"
                        >

                        <div class="form-help">

                            Это имя будет использоваться
                            в профиле платформы.

                        </div>

                    </div>


                    <div class="form-group">

                        <label
                            class="form-label"
                            for="register-email"
                        >
                            Email
                        </label>

                        <input
                            id="register-email"
                            type="email"
                            required
                            autocomplete="email"
                        >

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label
                                class="form-label"
                                for="register-password"
                            >
                                Пароль
                            </label>

                            <input
                                id="register-password"
                                type="password"
                                minlength="8"
                                required
                                autocomplete="new-password"
                            >

                        </div>


                        <div class="form-group">

                            <label
                                class="form-label"
                                for="register-password-confirm"
                            >
                                Повтор пароля
                            </label>

                            <input
                                id="register-password-confirm"
                                type="password"
                                minlength="8"
                                required
                                autocomplete="new-password"
                            >

                        </div>

                    </div>


                    <button
                        class="btn btn-full"
                        type="submit"
                    >
                        Создать аккаунт
                    </button>

                </form>


                <div class="divider"></div>


                <p class="muted">

                    Уже есть аккаунт?

                    <a
                        href="#/login"
                        style="color:var(--primary);font-weight:700"
                    >
                        Войти
                    </a>

                </p>

            </div>

        </div>

    `;


    document
        .getElementById(
            "register-form"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await registerUser();

            }
        );

}


/*
Регистрация.
*/

async function registerUser() {

    if (!isSupabaseConfigured()) {

        showToast(
            "Сначала настройте Supabase.",
            "warning"
        );

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


    if (nickname.length < 2) {

        showToast(
            "Никнейм должен содержать минимум 2 символа.",
            "warning"
        );

        return;

    }


    if (password !== passwordConfirm) {

        showToast(
            "Пароли не совпадают.",
            "error"
        );

        return;

    }


    if (password.length < 8) {

        showToast(
            "Пароль должен содержать минимум 8 символов.",
            "warning"
        );

        return;

    }


    const result =
        await supabaseClient.auth.signUp({

            email,

            password,

            options: {

                data: {

                    nickname

                }

            }

        });


    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }


    /*
    В зависимости от настроек Supabase
    пользователь либо сразу получает сессию,
    либо должен подтвердить email.
    */

    if (result.data.session) {

        state.session =
            result.data.session;

        state.user =
            result.data.user;

        await loadProfile();

        renderHeader();

        navigate("/");

        showToast(
            "Аккаунт создан.",
            "success"
        );

    }
    else {

        showToast(
            "Аккаунт создан. Проверьте почту для подтверждения.",
            "success"
        );

        navigate("/login");

    }

}


/* ======================================================
   PROFILE
====================================================== */

async function renderProfile() {

    if (!requireAuth()) {

        return;

    }


    const nickname =
        state.profile?.nickname || "";


    app.innerHTML = `

        <div class="page">

            <div class="card">

                <div class="actions">

                    ${backButton()}

                    <h1
                        style="margin:0"
                    >
                        Настройки аккаунта
                    </h1>

                </div>

            </div>


            <div class="card">

                <h2>
                    Основная информация
                </h2>

                <form
                    id="profile-form"
                    class="form"
                >

                    <div class="form-group">

                        <label
                            class="form-label"
                        >
                            Никнейм
                        </label>

                        <input
                            id="profile-nickname"
                            type="text"
                            maxlength="40"
                            value="${escapeHtml(nickname)}"
                            required
                        >

                    </div>


                    <div class="form-group">

                        <label
                            class="form-label"
                        >
                            Email
                        </label>

                        <input
                            type="email"
                            value="${escapeHtml(
                                state.user.email || ""
                            )}"
                            disabled
                        >

                        <div class="form-help">

                            Email используется
                            для входа в аккаунт.

                        </div>

                    </div>


                    <button
                        class="btn"
                        type="submit"
                    >
                        Сохранить изменения
                    </button>

                </form>

            </div>


            <div class="card">

                <h2>
                    Смена пароля
                </h2>

                <div class="notice">

                    Текущий пароль не отображается
                    и не хранится в открытом виде.
                    Изменить пароль можете только вы.

                </div>

                <div
                    style="height:15px"
                ></div>


                <form
                    id="password-form"
                    class="form"
                >

                    <div class="form-row">

                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Новый пароль
                            </label>

                            <input
                                id="new-password"
                                type="password"
                                minlength="8"
                                required
                                autocomplete="new-password"
                            >

                        </div>


                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Повтор нового пароля
                            </label>

                            <input
                                id="new-password-confirm"
                                type="password"
                                minlength="8"
                                required
                                autocomplete="new-password"
                            >

                        </div>

                    </div>


                    <button
                        class="btn"
                        type="submit"
                    >
                        Изменить пароль
                    </button>

                </form>

            </div>

        </div>

    `;


    document
        .getElementById(
            "profile-form"
        )
        .addEventListener(
            "submit",
            saveProfile
        );


    document
        .getElementById(
            "password-form"
        )
        .addEventListener(
            "submit",
            changePassword
        );

}


/*
Сохранение профиля.
*/

async function saveProfile(
    event
) {

    event.preventDefault();


    const nickname =
        document
            .getElementById(
                "profile-nickname"
            )
            .value
            .trim();


    if (nickname.length < 2) {

        showToast(
            "Никнейм слишком короткий.",
            "warning"
        );

        return;

    }


    const result =
        await supabaseClient

            .from("profiles")

            .update({

                nickname

            })

            .eq(
                "id",
                state.user.id
            );


    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }


    state.profile.nickname =
        nickname;


    renderHeader();


    showToast(
        "Профиль сохранён.",
        "success"
    );

}


/*
Смена пароля.
*/

async function changePassword(
    event
) {

    event.preventDefault();


    const password =
        document
            .getElementById(
                "new-password"
            )
            .value;

    const confirm =
        document
            .getElementById(
                "new-password-confirm"
            )
            .value;


    if (password !== confirm) {

        showToast(
            "Пароли не совпадают.",
            "error"
        );

        return;

    }


    if (password.length < 8) {

        showToast(
            "Пароль должен содержать минимум 8 символов.",
            "warning"
        );

        return;

    }


    const result =
        await supabaseClient.auth
            .updateUser({

                password

            });


    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }


    event.target.reset();


    showToast(
        "Пароль успешно изменён.",
        "success"
    );

}


/* ======================================================
   CREATE GAME
====================================================== */

async function renderCreateGame() {

    if (!requireAuth()) {

        return;

    }


    app.innerHTML = `

        <div class="page">

            <div class="card">

                ${backButton()}

                <h1>
                    Создать игру
                </h1>

                <p class="muted">

                    Игра станет отдельной сущностью
                    платформы. После создания к ней
                    можно подключать игровые модули.

                </p>

            </div>


            <div class="card">

                <form
                    id="create-game-form"
                    class="form"
                >

                    <div class="form-group">

                        <label
                            class="form-label"
                            for="game-name"
                        >
                            Название игры
                        </label>

                        <input
                            id="game-name"
                            type="text"
                            maxlength="100"
                            required
                        >

                    </div>


                    <div class="form-group">

                        <label
                            class="form-label"
                            for="game-slug"
                        >
                            Системный идентификатор
                        </label>

                        <input
                            id="game-slug"
                            type="text"
                            maxlength="50"
                            pattern="[a-z0-9-]+"
                            placeholder="например: wosb"
                            required
                        >

                        <div class="form-help">

                            Только латинские буквы,
                            цифры и дефис.

                            Для World of Sea Battle
                            можно использовать:
                            <b>wosb</b>

                        </div>

                    </div>


                    <div class="form-group">

                        <label
                            class="form-label"
                            for="game-description"
                        >
                            Описание
                        </label>

                        <textarea
                            id="game-description"
                            maxlength="2000"
                        ></textarea>

                    </div>


                    <div class="notice">

                        Игровые механики не нужно
                        добавлять сюда.

                        Они подключаются отдельно
                        через модули игры.

                    </div>


                    <button
                        class="btn"
                        type="submit"
                    >
                        Создать игру
                    </button>

                </form>

            </div>

        </div>

    `;


    document
        .getElementById(
            "create-game-form"
        )
        .addEventListener(
            "submit",
            createGame
        );

}


/*
Создание игры.
*/

async function createGame(
    event
) {

    event.preventDefault();


    const name =
        document
            .getElementById(
                "game-name"
            )
            .value
            .trim();

    const slug =
        document
            .getElementById(
                "game-slug"
            )
            .value
            .trim()
            .toLowerCase();

    const description =
        document
            .getElementById(
                "game-description"
            )
            .value
            .trim();


    if (!/^[a-z0-9-]+$/.test(slug)) {

        showToast(
            "Идентификатор содержит недопустимые символы.",
            "warning"
        );

        return;

    }


    const result =
        await supabaseClient

            .from("games")

            .insert({

                name,

                slug,

                description,

                owner_id:
                    state.user.id,

                is_published:
                    true

            })

            .select()

            .single();


    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }


    showToast(
        "Игра создана.",
        "success"
    );


    navigate(
        "/game/" +
        result.data.id
    );

}


/* ======================================================
   GAME
====================================================== */

async function getGameById(
    id
) {

    if (!isSupabaseConfigured()) {

        return null;

    }


    const result =
        await supabaseClient

            .from("games")

            .select("*")

            .eq(
                "id",
                id
            )

            .maybeSingle();


    if (result.error) {

        console.error(
            result.error
        );

        return null;

    }


    return result.data;

}


/*
Страница игры.
*/

async function renderGame(
    gameId
) {

    const game =
        await getGameById(
            gameId
        );


    if (!game) {

        renderNotFound(
            "Игра не найдена."
        );

        return;

    }


    state.currentGame =
        game;


    let guilds = [];


    const guildResult =
        await supabaseClient

            .from("guilds")

            .select("*")

            .eq(
                "game_id",
                gameId
            )

            .eq(
                "is_public",
                true
            )

            .order(
                "name",
                {
                    ascending: true
                }
            );


    if (!guildResult.error) {

        guilds =
            guildResult.data || [];

    }


    app.innerHTML = `

        <div class="page">


            <section class="card">

                <div class="game-header">

                    ${
                        game.image_url
                            ? `
                                <img
                                    class="game-header-image"
                                    src="${escapeHtml(
                                        game.image_url
                                    )}"
                                    alt=""
                                >
                              `
                            : `
                                <div
                                    class="game-header-image"
                                    style="
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-size:42px;
                                    "
                                >
                                    🎮
                                </div>
                              `
                    }


                    <div class="game-header-info">

                        <h1>
                            ${escapeHtml(
                                game.name
                            )}
                        </h1>

                        <p class="muted">

                            ${escapeHtml(
                                game.description ||
                                "Описание игры отсутствует."
                            )}

                        </p>

                    </div>

                </div>

            </section>


            <nav class="tabs">

                <a
                    href="#/game/${game.id}"
                    class="tab active"
                >
                    Обзор
                </a>

                <a
                    href="#/game/${game.id}/news"
                    class="tab"
                >
                    Новости
                </a>

                <a
                    href="#/game/${game.id}/guilds"
                    class="tab"
                >
                    Гильдии
                </a>

                <a
                    href="#/game/${game.id}/forum"
                    class="tab"
                >
                    Форум
                </a>

                <a
                    href="#/game/${game.id}/market"
                    class="tab"
                >
                    Рынок
                </a>

                <a
                    href="#/game/${game.id}/rating"
                    class="tab"
                >
                    Рейтинг
                </a>

                ${
                    game.slug === "wosb"
                        ? `
                            <a
                                href="#/game/${game.id}/wosb"
                                class="tab"
                            >
                                Инструменты WOSB
                            </a>
                          `
                        : ""
                }

            </nav>


            <section class="stats-grid">

                <div class="stat-card">

                    <div class="stat-label">
                        Публичных гильдий
                    </div>

                    <div class="stat-value">
                        ${guilds.length}
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        Новости
                    </div>

                    <div class="stat-value">
                        —
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        Темы форума
                    </div>

                    <div class="stat-value">
                        —
                    </div>

                </div>

            </section>


            <h2 class="section-title">
                Гильдии
            </h2>


            ${
                guilds.length
                    ? `
                        <section class="grid">

                            ${guilds
                                .map(
                                    renderGuildCard
                                )
                                .join("")}

                        </section>
                      `
                    : `
                        <div class="card">

                            <div class="empty-state">

                                <div class="empty-state-icon">
                                    🛡️
                                </div>

                                <h3>
                                    Гильдий пока нет
                                </h3>

                                <p>
                                    Создайте первую гильдию
                                    этой игры.
                                </p>

                                ${
                                    state.user
                                        ? `
                                            <button
                                                class="btn"
                                                type="button"
                                                onclick="
                                                    openCreateGuildModal(
                                                        '${game.id}'
                                                    )
                                                "
                                            >
                                                Создать гильдию
                                            </button>
                                          `
                                        : ""
                                }

                            </div>

                        </div>
                      `
            }

        </div>

    `;

}


/*
Карточка гильдии.
*/

function renderGuildCard(
    guild
) {

    return `

        <article class="card">

            <div class="guild-header">

                ${
                    guild.image_url
                        ? `
                            <img
                                class="guild-header-image"
                                src="${escapeHtml(
                                    guild.image_url
                                )}"
                                alt=""
                            >
                          `
                        : `
                            <div
                                class="guild-header-image"
                                style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    font-size:35px;
                                "
                            >
                                🛡️
                            </div>
                          `
                }


                <div>

                    <h3>
                        ${escapeHtml(
                            guild.name
                        )}
                    </h3>

                    <span
                        class="badge badge-success"
                    >
                        Публичная
                    </span>

                </div>

            </div>


            <p class="muted">

                ${escapeHtml(
                    guild.description ||
                    "Описание отсутствует."
                )}

            </p>


            <a
                href="#/guild/${guild.id}"
                class="btn btn-small"
            >
                Открыть гильдию
            </a>

        </article>

    `;

}


/* ======================================================
   GUILDS
====================================================== */

async function renderGuilds(
    gameId
) {

    const game =
        await getGameById(
            gameId
        );


    if (!game) {

        renderNotFound(
            "Игра не найдена."
        );

        return;

    }


    const result =
        await supabaseClient

            .from("guilds")

            .select("*")

            .eq(
                "game_id",
                gameId
            )

            .eq(
                "is_public",
                true
            )

            .order(
                "name",
                {
                    ascending: true
                }
            );


    const guilds =
        result.data || [];


    app.innerHTML = `

        <div class="page">

            <div class="card">

                <div class="actions">

                    ${backButton(
                        "/game/" +
                        gameId
                    )}

                    <h1
                        style="margin:0"
                    >
                        Гильдии
                    </h1>

                    <div
                        style="margin-left:auto"
                    >

                        ${
                            state.user
                                ? `
                                    <button
                                        class="btn"
                                        type="button"
                                        onclick="
                                            openCreateGuildModal(
                                                '${gameId}'
                                            )
                                        "
                                    >
                                        + Создать гильдию
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                </div>


                <p class="muted">

                    ${escapeHtml(
                        game.name
                    )}

                </p>

            </div>


            <div
                class="grid"
                style="margin-top:16px"
            >

                ${
                    guilds.length
                        ? guilds
                            .map(
                                renderGuildCard
                            )
                            .join("")
                        : `
                            <div class="card empty-state">

                                Гильдий пока нет.

                            </div>
                          `
                }

            </div>

        </div>

    `;

}


/*
Создание гильдии.
*/

function openCreateGuildModal(
    gameId
) {

    if (!requireAuth()) {

        return;

    }


    openModal(`

        <h2>
            Создать гильдию
        </h2>

        <form
            id="create-guild-form"
            class="form"
        >

            <div class="form-group">

                <label
                    class="form-label"
                >
                    Название
                </label>

                <input
                    id="guild-name"
                    maxlength="100"
                    required
                >

            </div>


            <div class="form-group">

                <label
                    class="form-label"
                >
                    Описание
                </label>

                <textarea
                    id="guild-description"
                    maxlength="3000"
                ></textarea>

            </div>


            <div class="form-group">

                <label
                    class="form-label"
                >
                    Приватность
                </label>

                <select
                    id="guild-visibility"
                >

                    <option value="true">
                        Публичная
                    </option>

                    <option value="false">
                        Закрытая
                    </option>

                </select>

            </div>


            <div class="actions actions-right">

                <button
                    class="btn btn-secondary"
                    type="button"
                    onclick="closeModal()"
                >
                    Отмена
                </button>

                <button
                    class="btn"
                    type="submit"
                >
                    Создать
                </button>

            </div>

        </form>

    `);


    document
        .getElementById(
            "create-guild-form"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const name =
                    document
                        .getElementById(
                            "guild-name"
                        )
                        .value
                        .trim();

                const description =
                    document
                        .getElementById(
                            "guild-description"
                        )
                        .value
                        .trim();

                const isPublic =
                    document
                        .getElementById(
                            "guild-visibility"
                        )
                        .value === "true";


                if (!name) {

                    showToast(
                        "Введите название гильдии.",
                        "warning"
                    );

                    return;

                }


                const result =
                    await supabaseClient

                        .from("guilds")

                        .insert({

                            game_id:
                                gameId,

                            name,

                            description,

                            owner_id:
                                state.user.id,

                            is_public:
                                isPublic

                        })

                        .select()

                        .single();


                if (result.error) {

                    showToast(
                        result.error.message,
                        "error"
                    );

                    return;

                }


                closeModal();


                showToast(
                    "Гильдия создана.",
                    "success"
                );


                navigate(
                    "/guild/" +
                    result.data.id
                );

            }
        );

}


/* ======================================================
   GET GUILD
====================================================== */

async function getGuildById(
    guildId
) {

    if (!isSupabaseConfigured()) {

        return null;

    }


    const result =
        await supabaseClient

            .from("guilds")

            .select("*")

            .eq(
                "id",
                guildId
            )

            .maybeSingle();


    if (result.error) {

        console.error(
            result.error
        );

        return null;

    }


    return result.data;

}


/* ======================================================
   GUILD PAGE
====================================================== */

async function renderGuild(
    guildId,
    section = "about"
) {

    const guild =
        await getGuildById(
            guildId
        );


    if (!guild) {

        renderNotFound(
            "Гильдия не найдена или у вас нет доступа."
        );

        return;

    }


    state.currentGuild =
        guild;


    const game =
        await getGameById(
            guild.game_id
        );


    /*
    Проверяем текущее членство.
    */

    let membership =
        null;


    if (state.user) {

        const membershipResult =
            await supabaseClient

                .from("guild_members")

                .select("*")

                .eq(
                    "guild_id",
                    guildId
                )

                .eq(
                    "user_id",
                    state.user.id
                )

                .is(
                    "left_at",
                    null
                )

                .maybeSingle();


        if (!membershipResult.error) {

            membership =
                membershipResult.data;

        }

    }


    /*
    Владелец гильдии тоже имеет доступ.
    */

    const isGuildOwner =
        state.user &&
        guild.owner_id === state.user.id;


    const isSiteOwner =
        state.profile?.role === "owner";


    const hasPrivateAccess =
        Boolean(
            membership ||
            isGuildOwner ||
            isSiteOwner
        );


    /*
    Если раздел приватный,
    но пользователь больше не состоит
    в гильдии — доступ запрещаем.
    */

    const privateSections = [

        "news",

        "members",

        "gallery",

        "documents",

        "diplomacy",

        "applications"

    ];


    if (
        privateSections.includes(section) &&
        !hasPrivateAccess
    ) {

        app.innerHTML = `

            <div class="page">

                <div class="card">

                    <div class="notice notice-danger">

                        <strong>
                            Доступ закрыт.
                        </strong>

                        <p>

                            Этот раздел доступен
                            только участникам данной
                            гильдии.

                        </p>

                    </div>

                    <div
                        style="margin-top:15px"
                    >

                        <a
                            href="#/guild/${guild.id}"
                            class="btn"
                        >
                            Вернуться к гильдии
                        </a>

                    </div>

                </div>

            </div>

        `;

        return;

    }


    /*
    Рендер основной оболочки.
    */

    app.innerHTML = `

        <div class="page">

            <section class="card">

                <div class="guild-header">

                    ${
                        guild.image_url
                            ? `
                                <img
                                    class="guild-header-image"
                                    src="${escapeHtml(
                                        guild.image_url
                                    )}"
                                    alt=""
                                >
                              `
                            : `
                                <div
                                    class="guild-header-image"
                                    style="
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-size:36px;
                                    "
                                >
                                    🛡️
                                </div>
                              `
                    }


                    <div>

                        <h1>
                            ${escapeHtml(
                                guild.name
                            )}
                        </h1>

                        <p class="muted">

                            ${
                                game
                                    ? escapeHtml(
                                        game.name
                                    )
                                    : ""
                            }

                        </p>

                    </div>

                </div>

            </section>


            <nav class="tabs">

                <a
                    class="tab ${
                        section === "about"
                            ? "active"
                            : ""
                    }"
                    href="#/guild/${guild.id}"
                >
                    О нас
                </a>

                <a
                    class="tab ${
                        section === "news"
                            ? "active"
                            : ""
                    }"
                    href="#/guild/${guild.id}/news"
                >
                    Новости
                </a>

                <a
                    class="tab ${
                        section === "members"
                            ? "active"
                            : ""
                    }"
                    href="#/guild/${guild.id}/members"
                >
                    Участники
                </a>

                <a
                    class="tab ${
                        section === "gallery"
                            ? "active"
                            : ""
                    }"
                    href="#/guild/${guild.id}/gallery"
                >
                    Галерея
                </a>

                <a
                    class="tab ${
                        section === "documents"
                            ? "active"
                            : ""
                    }"
                    href="#/guild/${guild.id}/documents"
                >
                    Документы
                </a>

                <a
                    class="tab ${
                        section === "diplomacy"
                            ? "active"
                            : ""
                    }"
                    href="#/guild/${guild.id}/diplomacy"
                >
                    Дипломатия
                </a>

                <a
                    class="tab ${
                        section === "applications"
                            ? "active"
                            : ""
                    }"
                    href="#/guild/${guild.id}/applications"
                >
                    Заявки
                </a>

            </nav>


            ${
                section === "about"
                    ? renderGuildAbout(
                        guild,
                        membership,
                        isGuildOwner,
                        isSiteOwner
                    )
                    : ""
            }

            ${
                section === "members"
                    ? await renderGuildMembers(
                        guild
                    )
                    : ""
            }

            ${
                section === "diplomacy"
                    ? await renderGuildDiplomacy(
                        guild
                    )
                    : ""
            }

            ${
                section === "news"
                    ? renderPrivateSection(
                        "Новости гильдии",
                        "Здесь будут внутренние новости гильдии."
                    )
                    : ""
            }

            ${
                section === "gallery"
                    ? renderPrivateSection(
                        "Галерея",
                        "Здесь будет галерея гильдии."
                    )
                    : ""
            }

            ${
                section === "documents"
                    ? renderPrivateSection(
                        "Документы",
                        "Здесь будут документы гильдии."
                    )
                    : ""
            }

            ${
                section === "applications"
                    ? renderPrivateSection(
                        "Заявки",
                        "Здесь будут заявки на вступление."
                    )
                    : ""
            }

        </div>

    `;

}


/*
О нас.
*/

function renderGuildAbout(
    guild,
    membership,
    isGuildOwner,
    isSiteOwner
) {

    let joinButton = "";


    if (
        state.user &&
        !membership &&
        !isGuildOwner
    ) {

        joinButton = `

            <button
                class="btn"
                type="button"
                onclick="
                    openJoinGuildModal(
                        '${guild.id}'
                    )
                "
            >
                Вступить в гильдию
            </button>

        `;

    }


    if (membership) {

        joinButton = `

            <button
                class="btn btn-danger"
                type="button"
                onclick="
                    leaveGuild(
                        '${guild.id}'
                    )
                "
            >
                Покинуть гильдию
            </button>

        `;

    }


    return `

        <section class="card">

            <h2>
                О нас
            </h2>

            <p>

                ${escapeHtml(
                    guild.description ||
                    "Описание гильдии пока не заполнено."
                )}

            </p>


            <div class="divider"></div>


            <div class="actions">

                ${joinButton}

                ${
                    isGuildOwner || isSiteOwner
                        ? `
                            <button
                                class="btn btn-secondary"
                                type="button"
                                onclick="
                                    showToast(
                                        'Настройки гильдии будут подключены в следующем модуле.'
                                    )
                                "
                            >
                                Управление
                            </button>
                          `
                        : ""
                }

            </div>

        </section>

    `;

}


/* ======================================================
   JOIN GUILD
====================================================== */

function openJoinGuildModal(
    guildId
) {

    if (!requireAuth()) {

        return;

    }


    openModal(`

        <h2>
            Вступление в гильдию
        </h2>

        <p class="muted">

            Укажите ваш игровой никнейм.
            Именно он будет отображаться
            среди участников гильдии.

        </p>


        <form
            id="join-guild-form"
            class="form"
        >

            <div class="form-group">

                <label
                    class="form-label"
                >
                    Никнейм в игре
                </label>

                <input
                    id="join-nickname"
                    maxlength="80"
                    required
                    placeholder="Например: SamuRay"
                >

            </div>


            <div class="actions actions-right">

                <button
                    class="btn btn-secondary"
                    type="button"
                    onclick="closeModal()"
                >
                    Отмена
                </button>

                <button
                    class="btn"
                    type="submit"
                >
                    Вступить
                </button>

            </div>

        </form>

    `);


    document
        .getElementById(
            "join-guild-form"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await joinGuild(
                    guildId
                );

            }
        );

}


/*
Вступление.
*/

async function joinGuild(
    guildId
) {

    const nickname =
        document
            .getElementById(
                "join-nickname"
            )
            .value
            .trim();


    if (!nickname) {

        showToast(
            "Введите никнейм.",
            "warning"
        );

        return;

    }


    const guild =
        await getGuildById(
            guildId
        );


    if (!guild) {

        showToast(
            "Гильдия не найдена.",
            "error"
        );

        return;

    }


    /*
    Важнейшее правило:
    пользователь может иметь только одну
    активную гильдию внутри конкретной игры.
    */

    const existing =
        await supabaseClient

            .from("guild_members")

            .select("id,guild_id")

            .eq(
                "game_id",
                guild.game_id
            )

            .eq(
                "user_id",
                state.user.id
            )

            .is(
                "left_at",
                null
            )

            .maybeSingle();


    if (existing.data) {

        showToast(
            "В этой игре вы уже состоите в гильдии. Сначала выйдите из неё.",
            "warning"
        );

        closeModal();

        return;

    }


    const result =
        await supabaseClient

            .from("guild_members")

            .insert({

                game_id:
                    guild.game_id,

                guild_id:
                    guild.id,

                user_id:
                    state.user.id,

                nickname,

                role:
                    "member"

            });


    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }


    closeModal();


    showToast(
        "Вы вступили в гильдию.",
        "success"
    );


    await renderGuild(
        guildId
    );

}


/*
Выход из гильдии.
*/

async function leaveGuild(
    guildId
) {

    if (
        !confirm(
            "Вы действительно хотите покинуть гильдию?"
        )
    ) {

        return;

    }


    const result =
        await supabaseClient

            .from("guild_members")

            .update({

                left_at:
                    new Date().toISOString()

            })

            .eq(
                "guild_id",
                guildId
            )

            .eq(
                "user_id",
                state.user.id
            )

            .is(
                "left_at",
                null
            );


    if (result.error) {

        showToast(
            result.error.message,
            "error"
        );

        return;

    }


    showToast(
        "Вы покинули гильдию.",
        "success"
    );


    await renderGuild(
        guildId
    );

}


/* ======================================================
   GUILD MEMBERS
====================================================== */

async function renderGuildMembers(
    guild
) {

    const result =
        await supabaseClient

            .from("guild_members")

            .select(
                "id,nickname,role,joined_at"
            )

            .eq(
                "guild_id",
                guild.id
            )

            .is(
                "left_at",
                null
            )

            .order(
                "joined_at",
                {
                    ascending: true
                }
            );


    if (result.error) {

        return `

            <div class="card">

                <div class="notice notice-danger">

                    Не удалось загрузить участников.

                </div>

            </div>

        `;

    }


    const members =
        result.data || [];


    return `

        <section class="card">

            <div class="actions">

                <h2
                    style="margin:0"
                >
                    Участники
                </h2>

                <span
                    class="badge badge-primary"
                >
                    ${members.length}
                </span>

            </div>


            <div
                class="list"
                style="margin-top:16px"
            >

                ${
                    members.length
                        ? members
                            .map(
                                member => `

                                    <div
                                        class="list-item"
                                    >

                                        <div
                                            class="actions"
                                            style="
                                                justify-content:
                                                space-between;
                                            "
                                        >

                                            <div>

                                                <strong>

                                                    ${escapeHtml(
                                                        member.nickname
                                                    )}

                                                </strong>

                                                <div
                                                    class="muted small"
                                                >

                                                    Вступил:
                                                    ${new Date(
                                                        member.joined_at
                                                    ).toLocaleDateString(
                                                        "ru-RU"
                                                    )}

                                                </div>

                                            </div>


                                            <span
                                                class="badge"
                                            >

                                                ${escapeHtml(
                                                    member.role
                                                )}

                                            </span>

                                        </div>

                                    </div>

                                `
                            )
                            .join("")
                        : `
                            <div class="empty-state">
                                В гильдии пока нет участников.
                            </div>
                          `
                }

            </div>

        </section>

    `;

}


/* ======================================================
   DIPLOMACY
====================================================== */

async function renderGuildDiplomacy(
    guild
) {

    /*
    На этом этапе загружаем отношения,
    в которых участвует текущая гильдия.
    */

    const result =
        await supabaseClient

            .from("guild_relations")

            .select("*")

            .eq(
                "game_id",
                guild.game_id
            )

            .or(
                `guild_a_id.eq.${guild.id},guild_b_id.eq.${guild.id}`
            );


    if (result.error) {

        return `

            <section class="card">

                <div
                    class="notice notice-danger"
                >

                    Не удалось загрузить дипломатию.

                </div>

            </section>

        `;

    }


    const relations =
        result.data || [];


    const active =
        relations.filter(
            relation =>
                relation.status === "active"
        );


    return `

        <section class="card">

            <div class="actions">

                <h2
                    style="margin:0"
                >
                    Дипломатия
                </h2>

                ${
                    state.user &&
                    guild.owner_id === state.user.id
                        ? `
                            <button
                                class="btn"
                                type="button"
                                onclick="
                                    openDiplomacyModal(
                                        '${guild.id}',
                                        '${guild.game_id}'
                                    )
                                "
                            >
                                + Предложить союз
                            </button>
                          `
                        : ""
                }

            </div>


            <p class="muted">

                Дипломатические отношения
                между гильдиями этой игры.

            </p>


            <div
                class="list"
                style="margin-top:16px"
            >

                ${
                    active.length
                        ? active
                            .map(
                                relation => `

                                    <div
                                        class="list-item"
                                    >

                                        <span
                                            class="badge badge-success"
                                        >
                                            ${
                                                relation.relation_type ===
                                                "alliance"
                                                    ? "🤝 Союз"
                                                    : relation.relation_type ===
                                                      "hostile"
                                                        ? "⚔ Вражда"
                                                        : "⚪ Нейтралитет"
                                            }
                                        </span>

                                        <p
                                            class="muted"
                                        >
                                            ID отношения:
                                            ${escapeHtml(
                                                relation.id
                                            )}
                                        </p>

                                    </div>

                                `
                            )
                            .join("")
                        : `
                            <div
                                class="empty-state"
                            >

                                Дипломатических отношений
                                пока нет.

                            </div>
                          `
                }

            </div>

        </section>

    `;

}


/*
Открытие предложения союза.

Полная логика будет расширена
в модуле дипломатии.
*/

function openDiplomacyModal(
    guildId,
    gameId
) {

    openModal(`

        <h2>
            Предложить дипломатические отношения
        </h2>

        <form
            id="diplomacy-form"
            class="form"
        >

            <div class="form-group">

                <label
                    class="form-label"
                >
                    ID второй гильдии
                </label>

                <input
                    id="diplomacy-target"
                    required
                    placeholder="UUID гильдии"
                >

            </div>


            <div class="form-group">

                <label
                    class="form-label"
                >
                    Тип отношений
                </label>

                <select
                    id="diplomacy-type"
                >

                    <option value="alliance">
                        🤝 Союз
                    </option>

                    <option value="neutral">
                        ⚪ Нейтралитет
                    </option>

                    <option value="hostile">
                        ⚔ Вражда
                    </option>

                </select>

            </div>


            <div class="actions actions-right">

                <button
                    class="btn btn-secondary"
                    type="button"
                    onclick="closeModal()"
                >
                    Отмена
                </button>

                <button
                    class="btn"
                    type="submit"
                >
                    Отправить
                </button>

            </div>

        </form>

    `);


    document
        .getElementById(
            "diplomacy-form"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const targetId =
                    document
                        .getElementById(
                            "diplomacy-target"
                        )
                        .value
                        .trim();

                const type =
                    document
                        .getElementById(
                            "diplomacy-type"
                        )
                        .value;


                if (
                    !targetId ||
                    targetId === guildId
                ) {

                    showToast(
                        "Укажите другую гильдию.",
                        "warning"
                    );

                    return;

                }


                const result =
                    await supabaseClient

                        .from(
                            "guild_relations"
                        )

                        .insert({

                            game_id:
                                gameId,

                            guild_a_id:
                                guildId,

                            guild_b_id:
                                targetId,

                            relation_type:
                                type,

                            status:
                                "pending",

                            created_by:
                                state.user.id

                        });


                if (result.error) {

                    showToast(
                        result.error.message,
                        "error"
                    );

                    return;

                }


                closeModal();


                showToast(
                    "Предложение отправлено.",
                    "success"
                );


                await renderGuild(
                    guildId,
                    "diplomacy"
                );

            }
        );

}


/* ======================================================
   PRIVATE SECTIONS
====================================================== */

function renderPrivateSection(
    title,
    description
) {

    return `

        <section class="card">

            <h2>
                ${escapeHtml(title)}
            </h2>

            <p class="muted">

                ${escapeHtml(
                    description
                )}

            </p>

            <div class="notice">

                Раздел подключён к архитектуре
                приватной гильдии.

            </div>

        </section>

    `;

}


/* ======================================================
   GAME PLACEHOLDER SECTIONS
====================================================== */

async function renderGameSection(
    gameId,
    section
) {

    const game =
        await getGameById(
            gameId
        );


    if (!game) {

        renderNotFound(
            "Игра не найдена."
        );

        return;

    }


    const titles = {

        news:
            "Новости",

        forum:
            "Форум",

        market:
            "Рынок",

        rating:
            "Рейтинг"

    };


    app.innerHTML = `

        <div class="page">

            <div class="card">

                ${backButton(
                    "/game/" +
                    gameId
                )}

                <h1>
                    ${escapeHtml(
                        titles[section] ||
                        section
                    )}
                </h1>

                <p class="muted">

                    Игра:
                    ${escapeHtml(
                        game.name
                    )}

                </p>


                <div class="notice">

                    Этот раздел уже предусмотрен
                    архитектурой платформы.

                    Его функционал будет подключаться
                    отдельно и не потребует изменения
                    системы аккаунтов и гильдий.

                </div>

            </div>

        </div>

    `;

}


/* ======================================================
   WOSB MODULE
====================================================== */


/*
Основная страница модуля WOSB.

Данные находятся отдельно:

games/wosb/

Основной app.js не содержит
характеристики конкретных кораблей.
*/

async function renderWosbModule(
    gameId
) {

    const game =
        await getGameById(
            gameId
        );


    if (!game) {

        renderNotFound(
            "Игра не найдена."
        );

        return;

    }


    if (game.slug !== "wosb") {

        renderNotFound(
            "Модуль WOSB недоступен для этой игры."
        );

        return;

    }


    app.innerHTML = `

        <div class="page">

            <div class="card">

                ${backButton(
                    "/game/" +
                    gameId
                )}

                <h1>
                    World of Sea Battle
                </h1>

                <p class="muted">

                    Игровые инструменты WOSB.

                </p>

            </div>


            <section
                class="grid"
                style="margin-top:16px"
            >

                <a
                    href="#/game/${gameId}/wosb/ships"
                    class="card"
                >

                    <h3>
                        🚢 Корабли
                    </h3>

                    <p class="muted">

                        База кораблей игры.

                    </p>

                </a>


                <a
                    href="#/game/${gameId}/wosb/builds"
                    class="card"
                >

                    <h3>
                        ⚙️ Билды
                    </h3>

                    <p class="muted">

                        Сохранённые конфигурации
                        кораблей.

                    </p>

                </a>


                <a
                    href="#/game/${gameId}/wosb/damage"
                    class="card"
                >

                    <h3>
                        💥 Калькулятор урона
                    </h3>

                    <p class="muted">

                        Расчёт с учётом пушек,
                        мортир, специалистов,
                        апгрейдов и боеприпасов.

                    </p>

                </a>

            </section>

        </div>

    `;

}


/*
Загрузка JSON игрового модуля.

Это ключевой принцип архитектуры.

Добавление или изменение корабля
не требует редактирования app.js.
*/

async function loadGameModuleJson(
    gameSlug,
    filename
) {

    const response =
        await fetch(
            `games/${encodeURIComponent(
                gameSlug
            )}/${encodeURIComponent(
                filename
            )}`
        );


    if (!response.ok) {

        throw new Error(
            `Не удалось загрузить ${filename}`
        );

    }


    return response.json();

}


/*
Калькулятор WOSB.

Пока здесь будет безопасная базовая
демонстрационная реализация.

Реальные игровые коэффициенты будут
загружаться из отдельных файлов.
*/

async function renderWosbDamage(
    gameId
) {

    const game =
        await getGameById(
            gameId
        );


    if (!game || game.slug !== "wosb") {

        renderNotFound(
            "Модуль WOSB недоступен."
        );

        return;

    }


    let data;


    try {

        const [
            ships,
            cannons,
            mortars,
            specialists,
            upgrades,
            ammunition,
            damageConfig
        ] = await Promise.all([

            loadGameModuleJson(
                "wosb",
                "ships.json"
            ),

            loadGameModuleJson(
                "wosb",
                "cannons.json"
            ),

            loadGameModuleJson(
                "wosb",
                "mortars.json"
            ),

            loadGameModuleJson(
                "wosb",
                "specialists.json"
            ),

            loadGameModuleJson(
                "wosb",
                "upgrades.json"
            ),

            loadGameModuleJson(
                "wosb",
                "ammunition.json"
            ),

            loadGameModuleJson(
                "wosb",
                "damage-config.json"
            )

        ]);


        data = {

            ships:
                ships.ships || [],

            cannons:
                cannons.cannons || [],

            mortars:
                mortars.mortars || [],

            specialists:
                specialists.specialists || [],

            upgrades:
                upgrades.upgrades || [],

            ammunition:
                ammunition.ammunition || [],

            config:
                damageConfig

        };

    }
    catch (error) {

        app.innerHTML = `

            <div class="page">

                <div class="card">

                    <h1>
                        Ошибка загрузки WOSB
                    </h1>

                    <div
                        class="notice notice-danger"
                    >

                        ${escapeHtml(
                            error.message
                        )}

                    </div>

                </div>

            </div>

        `;

        return;

    }


    app.innerHTML = `

        <div class="page">

            <div class="card">

                ${backButton(
                    "/game/" +
                    gameId +
                    "/wosb"
                )}

                <h1>
                    Калькулятор урона WOSB
                </h1>

                <p class="muted">

                    Все характеристики
                    загружаются из файлов игрового
                    модуля.

                </p>

            </div>


            <div class="card">

                <form
                    id="damage-calculator"
                    class="form"
                >

                    <div class="form-row">

                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Корабль
                            </label>

                            <select
                                id="damage-ship"
                            >

                                ${
                                    data.ships
                                        .map(
                                            item => `
                                                <option
                                                    value="${escapeHtml(
                                                        item.id
                                                    )}"
                                                >
                                                    ${escapeHtml(
                                                        item.name
                                                    )}
                                                </option>
                                            `
                                        )
                                        .join("")
                                }

                            </select>

                        </div>


                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Боеприпас
                            </label>

                            <select
                                id="damage-ammunition"
                            >

                                ${
                                    data.ammunition
                                        .map(
                                            item => `
                                                <option
                                                    value="${escapeHtml(
                                                        item.id
                                                    )}"
                                                >
                                                    ${escapeHtml(
                                                        item.name
                                                    )}
                                                </option>
                                            `
                                        )
                                        .join("")
                                }

                            </select>

                        </div>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Пушка
                            </label>

                            <select
                                id="damage-cannon"
                            >

                                ${
                                    data.cannons
                                        .map(
                                            item => `
                                                <option
                                                    value="${escapeHtml(
                                                        item.id
                                                    )}"
                                                >
                                                    ${escapeHtml(
                                                        item.name
                                                    )}
                                                </option>
                                            `
                                        )
                                        .join("")
                                }

                            </select>

                        </div>


                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Количество пушек
                            </label>

                            <input
                                id="damage-cannon-quantity"
                                type="number"
                                min="0"
                                value="8"
                                required
                            >

                        </div>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Мортира
                            </label>

                            <select
                                id="damage-mortar"
                            >

                                ${
                                    data.mortars
                                        .map(
                                            item => `
                                                <option
                                                    value="${escapeHtml(
                                                        item.id
                                                    )}"
                                                >
                                                    ${escapeHtml(
                                                        item.name
                                                    )}
                                                </option>
                                            `
                                        )
                                        .join("")
                                }

                            </select>

                        </div>


                        <div class="form-group">

                            <label
                                class="form-label"
                            >
                                Количество мортир
                            </label>

                            <input
                                id="damage-mortar-quantity"
                                type="number"
                                min="0"
                                value="2"
                                required
                            >

                        </div>

                    </div>


                    <div class="form-group">

                        <label
                            class="form-label"
                        >
                            Специалисты
                        </label>

                        <div
                            class="choice-grid"
                        >

                            ${
                                data.specialists
                                    .map(
                                        item => `

                                            <label
                                                class="choice-card"
                                            >

                                                <input
                                                    type="checkbox"
                                                    class="damage-specialist"
                                                    value="${escapeHtml(
                                                        item.id
                                                    )}"
                                                >

                                                <span>

                                                    <strong>
                                                        ${escapeHtml(
                                                            item.name
                                                        )}
                                                    </strong>

                                                    ${
                                                        item.description
                                                            ? `
                                                                <br>

                                                                <span
                                                                    class="muted small"
                                                                >
                                                                    ${escapeHtml(
                                                                        item.description
                                                                    )}
                                                                </span>
                                                              `
                                                            : ""
                                                    }

                                                </span>

                                            </label>

                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </div>


                    <div class="form-group">

                        <label
                            class="form-label"
                        >
                            Апгрейды
                        </label>

                        <div
                            class="choice-grid"
                        >

                            ${
                                data.upgrades
                                    .map(
                                        item => `

                                            <label
                                                class="choice-card"
                                            >

                                                <input
                                                    type="checkbox"
                                                    class="damage-upgrade"
                                                    value="${escapeHtml(
                                                        item.id
                                                    )}"
                                                >

                                                <span>

                                                    <strong>
                                                        ${escapeHtml(
                                                            item.name
                                                        )}
                                                    </strong>

                                                    ${
                                                        item.description
                                                            ? `
                                                                <br>

                                                                <span
                                                                    class="muted small"
                                                                >
                                                                    ${escapeHtml(
                                                                        item.description
                                                                    )}
                                                                </span>
                                                              `
                                                            : ""
                                                    }

                                                </span>

                                            </label>

                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </div>


                    <button
                        class="btn"
                        type="submit"
                    >
                        Рассчитать урон
                    </button>

                </form>


                <div
                    id="damage-result"
                    style="margin-top:20px"
                ></div>

            </div>

        </div>

    `;


    document
        .getElementById(
            "damage-calculator"
        )
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();

                calculateWosbDamage(
                    data
                );

            }
        );

}


/*
Расчёт WOSB.

ВАЖНО:

Это пока универсальный каркас,
а не утверждение конкретной формулы
World of Sea Battle.

Когда будут внесены реальные
характеристики и правила расчёта,
формулу можно вынести в отдельный:

games/wosb/damage-calculator.js

и полностью отделить её от платформы.
*/

function calculateWosbDamage(
    data
) {

    const findById =
        (
            collection,
            id
        ) => collection.find(
            item => item.id === id
        );


    const ship =
        findById(
            data.ships,
            document
                .getElementById(
                    "damage-ship"
                )
                .value
        );


    const cannon =
        findById(
            data.cannons,
            document
                .getElementById(
                    "damage-cannon"
                )
                .value
        );


    const mortar =
        findById(
            data.mortars,
            document
                .getElementById(
                    "damage-mortar"
                )
                .value
        );


    const ammunition =
        findById(
            data.ammunition,
            document
                .getElementById(
                    "damage-ammunition"
                )
                .value
        );


    const cannonQuantity =
        Number(
            document
                .getElementById(
                    "damage-cannon-quantity"
                )
                .value
        ) || 0;


    const mortarQuantity =
        Number(
            document
                .getElementById(
                    "damage-mortar-quantity"
                )
                .value
        ) || 0;


    const selectedSpecialistIds =
        Array.from(
            document.querySelectorAll(
                ".damage-specialist:checked"
            )
        )
        .map(
            input => input.value
        );


    const selectedUpgradeIds =
        Array.from(
            document.querySelectorAll(
                ".damage-upgrade:checked"
            )
        )
        .map(
            input => input.value
        );


    const specialists =
        data.specialists.filter(
            item =>
                selectedSpecialistIds.includes(
                    item.id
                )
        );


    const upgrades =
        data.upgrades.filter(
            item =>
                selectedUpgradeIds.includes(
                    item.id
                )
        );


    if (!cannon || !mortar) {

        showToast(
            "Не выбраны орудия.",
            "warning"
        );

        return;

    }


    /*
    Базовые значения.

    Все отсутствующие значения считаем нулём
    или единицей для коэффициентов.
    */

    const cannonDamage =
        Number(
            cannon.damage || 0
        );


    const mortarDamage =
        Number(
            mortar.damage || 0
        );


    const cannonReload =
        Number(
            cannon.reload_seconds || 1
        );


    const shipMultiplier =
        Number(
            ship?.damage_multiplier || 1
        );


    const ammunitionMultiplier =
        Number(
            ammunition?.damage_multiplier || 1
        );


    const ammunitionPenetrationMultiplier =
        Number(
            ammunition?.penetration_multiplier || 1
        );


    /*
    Суммируем модификаторы специалистов.
    */

    let multiplier = 1;

    let flatDamage = 0;


    for (
        const specialist
        of specialists
    ) {

        multiplier *=
            Number(
                specialist.damage_multiplier ||
                1
            );

        flatDamage +=
            Number(
                specialist.damage_flat ||
                0
            );

    }


    /*
    Апгрейды.
    */

    for (
        const upgrade
        of upgrades
    ) {

        multiplier *=
            Number(
                upgrade.damage_multiplier ||
                1
            );

        flatDamage +=
            Number(
                upgrade.damage_flat ||
                0
            );

    }


    /*
    Базовый залп.
    */

    const baseDamage =

        (
            cannonDamage *
            cannonQuantity

        ) +

        (
            mortarDamage *
            mortarQuantity
        );


    /*
    Применение коэффициентов.
    */

    const totalDamage =

        (
            baseDamage *
            shipMultiplier *
            ammunitionMultiplier *
            multiplier

        ) +

        flatDamage;


    /*
    Условный DPS.

    Это демонстрационный расчёт.

    Реальная формула WOSB должна учитывать
    реальные игровые правила.
    */

    const damagePerMinute =

        totalDamage *
        (
            60 /
            cannonReload
        );


    const penetration =

        (
            Number(
                cannon.penetration ||
                0
            ) *

            ammunitionPenetrationMultiplier
        );


    const result =
        document
            .getElementById(
                "damage-result"
            );


    result.innerHTML = `

        <div class="calculator-result">


            <div class="result-card">

                <div class="result-label">
                    Урон залпа
                </div>

                <div class="result-value">

                    ${Math.round(
                        totalDamage
                    ).toLocaleString(
                        "ru-RU"
                    )}

                </div>

            </div>


            <div class="result-card">

                <div class="result-label">
                    Урон в минуту
                </div>

                <div class="result-value">

                    ${Math.round(
                        damagePerMinute
                    ).toLocaleString(
                        "ru-RU"
                    )}

                </div>

            </div>


            <div class="result-card">

                <div class="result-label">
                    Пробитие
                </div>

                <div class="result-value">

                    ${Math.round(
                        penetration
                    ).toLocaleString(
                        "ru-RU"
                    )}

                </div>

            </div>


            <div class="result-card">

                <div class="result-label">
                    Общий множитель
                </div>

                <div class="result-value">

                    ${multiplier.toFixed(2)}×

                </div>

            </div>


        </div>


        <div
            class="notice"
            style="margin-top:15px"
        >

            Расчёт выполнен на основании
            выбранных корабля, орудий,
            боеприпаса, специалистов
            и апгрейдов.

        </div>

    `;

}


/*
Страница кораблей WOSB.
*/

async function renderWosbShips(
    gameId
) {

    const game =
        await getGameById(
            gameId
        );


    if (!game || game.slug !== "wosb") {

        renderNotFound(
            "Модуль WOSB недоступен."
        );

        return;

    }


    let data;


    try {

        data =
            await loadGameModuleJson(
                "wosb",
                "ships.json"
            );

    }
    catch (error) {

        app.innerHTML = `

            <div class="card">

                <h1>
                    Ошибка загрузки кораблей
                </h1>

                <div class="notice notice-danger">

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            </div>

        `;

        return;

    }


    const ships =
        data.ships || [];


    app.innerHTML = `

        <div class="page">

            <div class="card">

                ${backButton(
                    "/game/" +
                    gameId +
                    "/wosb"
                )}

                <h1>
                    Корабли WOSB
                </h1>

                <p class="muted">

                    Данные загружаются из
                    games/wosb/ships.json.

                </p>

            </div>


            <div class="grid">

                ${
                    ships.length
                        ? ships
                            .map(
                                ship => `

                                    <article
                                        class="card"
                                    >

                                        <h3>

                                            ${escapeHtml(
                                                ship.name
                                            )}

                                        </h3>

                                        <p
                                            class="muted"
                                        >

                                            Нация:
                                            ${escapeHtml(
                                                ship.nation ||
                                                "—"
                                            )}

                                            <br>

                                            Класс:
                                            ${escapeHtml(
                                                ship.class ||
                                                "—"
                                            )}

                                            <br>

                                            Уровень:
                                            ${escapeHtml(
                                                ship.level ||
                                                "—"
                                            )}

                                        </p>

                                    </article>

                                `
                            )
                            .join("")
                        : `
                            <div class="card empty-state">

                                Кораблей пока нет.

                            </div>
                          `
                }

            </div>

        </div>

    `;

}


/*
Билды WOSB.
*/

async function renderWosbBuilds(
    gameId
) {

    const game =
        await getGameById(
            gameId
        );


    if (!game || game.slug !== "wosb") {

        renderNotFound(
            "Модуль WOSB недоступен."
        );

        return;

    }


    let data;


    try {

        data =
            await loadGameModuleJson(
                "wosb",
                "builds.json"
            );

    }
    catch (error) {

        app.innerHTML = `

            <div class="card">

                <h1>
                    Ошибка загрузки билдов
                </h1>

                <div class="notice notice-danger">

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            </div>

        `;

        return;

    }


    const builds =
        data.builds || [];


    app.innerHTML = `

        <div class="page">

            <div class="card">

                ${backButton(
                    "/game/" +
                    gameId +
                    "/wosb"
                )}

                <h1>
                    Билды WOSB
                </h1>

                <p class="muted">

                    Билды будут использовать
                    те же игровые данные, что
                    и калькулятор.

                </p>

            </div>


            ${
                builds.length
                    ? `
                        <div class="grid">

                            ${builds
                                .map(
                                    build => `

                                        <article
                                            class="card"
                                        >

                                            <h3>

                                                ${escapeHtml(
                                                    build.name
                                                )}

                                            </h3>

                                            <p
                                                class="muted"
                                            >

                                                Автор:
                                                ${escapeHtml(
                                                    build.author ||
                                                    "—"
                                                )}

                                            </p>

                                            <p>

                                                ${escapeHtml(
                                                    build.description ||
                                                    ""
                                                )}

                                            </p>

                                        </article>

                                    `
                                )
                                .join("")}

                        </div>
                      `
                    : `
                        <div class="card empty-state">

                            <div
                                class="empty-state-icon"
                            >
                                ⚙️
                            </div>

                            <h3>
                                Билдов пока нет
                            </h3>

                            <p>
                                Они будут добавляться
                                через отдельную систему
                                контента.
                            </p>

                        </div>
                      `
            }

        </div>

    `;

}


/* ======================================================
   NOT FOUND
====================================================== */

function renderNotFound(
    message = "Страница не найдена."
) {

    app.innerHTML = `

        <div class="page">

            <div class="card">

                <div class="empty-state">

                    <div class="empty-state-icon">
                        🔎
                    </div>

                    <h1>
                        Не найдено
                    </h1>

                    <p>
                        ${escapeHtml(
                            message
                        )}
                    </p>

                    <a
                        href="#/"
                        class="btn"
                    >
                        На главную
                    </a>

                </div>

            </div>

        </div>

    `;

}


/* ======================================================
   ROUTER
====================================================== */

async function router() {

    /*
    Всегда обновляем шапку.
    */

    renderHeader();


    /*
    Если Supabase вообще не настроен,
    показываем инструкцию.
    */

    if (!isSupabaseConfigured()) {

        /*
        Страницу конфигурации оставляем доступной,
        чтобы пользователь видел, что делать.
        */

        const route =
            getRoute();


        if (
            route !== "/login" &&
            route !== "/register"
        ) {

            renderConfigurationError();

            return;

        }

    }


    const parts =
        getRouteParts();


    /*
    Главная.
    */

    if (!parts.length) {

        await renderHome();

        return;

    }


    /*
    Login.
    */

    if (
        parts[0] === "login"
    ) {

        await renderLogin();

        return;

    }


    /*
    Register.
    */

    if (
        parts[0] === "register"
    ) {

        await renderRegister();

        return;

    }


    /*
    Search.
    */

    if (
        parts[0] === "search"
    ) {

        await renderSearch();

        return;

    }


    /*
    Profile.
    */

    if (
        parts[0] === "profile"
    ) {

        await renderProfile();

        return;

    }


    /*
    Create game.
    */

    if (
        parts[0] === "create-game"
    ) {

        await renderCreateGame();

        return;

    }


    /*
    Admin.
    */

    if (
        parts[0] === "admin"
    ) {

        if (!requireAuth()) {

            return;

        }

        /*
        Полноценная админка будет отдельным
        admin.html/admin.js.
        */

        window.location.href =
            "admin.html";

        return;

    }


    /*
    GAME ROUTES
    */

    if (
        parts[0] === "game"
    ) {

        const gameId =
            parts[1];


        if (!gameId) {

            renderNotFound(
                "Игра не указана."
            );

            return;

        }


        /*
        /game/:id
        */

        if (
            parts.length === 2
        ) {

            await renderGame(
                gameId
            );

            return;

        }


        /*
        /game/:id/news
        */

        if (
            parts[2] === "news"
        ) {

            await renderGameSection(
                gameId,
                "news"
            );

            return;

        }


        /*
        /game/:id/guilds
        */

        if (
            parts[2] === "guilds"
        ) {

            await renderGuilds(
                gameId
            );

            return;

        }


        /*
        /game/:id/forum
        */

        if (
            parts[2] === "forum"
        ) {

            await renderGameSection(
                gameId,
                "forum"
            );

            return;

        }


        /*
        /game/:id/market
        */

        if (
            parts[2] === "market"
        ) {

            await renderGameSection(
                gameId,
                "market"
            );

            return;

        }


        /*
        /game/:id/rating
        */

        if (
            parts[2] === "rating"
        ) {

            await renderGameSection(
                gameId,
                "rating"
            );

            return;

        }


        /*
        WOSB MODULE
        */

        if (
            parts[2] === "wosb"
        ) {

            /*
            /game/:id/wosb
            */

            if (
                parts.length === 3
            ) {

                await renderWosbModule(
                    gameId
                );

                return;

            }


            /*
            /game/:id/wosb/damage
            */

            if (
                parts[3] === "damage"
            ) {

                await renderWosbDamage(
                    gameId
                );

                return;

            }


            /*
            /game/:id/wosb/ships
            */

            if (
                parts[3] === "ships"
            ) {

                await renderWosbShips(
                    gameId
                );

                return;

            }


            /*
            /game/:id/wosb/builds
            */

            if (
                parts[3] === "builds"
            ) {

                await renderWosbBuilds(
                    gameId
                );

                return;

            }

        }

    }


    /*
    GUILD ROUTES
    */

    if (
        parts[0] === "guild"
    ) {

        const guildId =
            parts[1];


        if (!guildId) {

            renderNotFound(
                "Гильдия не указана."
            );

            return;

        }


        /*
        /guild/:id
        */

        if (
            parts.length === 2
        ) {

            await renderGuild(
                guildId,
                "about"
            );

            return;

        }


        const guildSection =
            parts[2];


        const allowedSections = [

            "news",

            "members",

            "gallery",

            "documents",

            "diplomacy",

            "applications"

        ];


        if (
            allowedSections.includes(
                guildSection
            )
        ) {

            await renderGuild(
                guildId,
                guildSection
            );

            return;

        }

    }


    /*
    Если ничего не подошло.
    */

    renderNotFound();

}


/* ======================================================
   MODAL EVENTS
====================================================== */

if (modalClose) {

    modalClose.addEventListener(
        "click",
        closeModal
    );

}

if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalOverlay
            ) {

                closeModal();

            }

        }
    );

}


/* ======================================================
   ESC CLOSE MODAL
====================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            !modalOverlay.hidden
        ) {

            closeModal();

        }

    }
);


/* ======================================================
   AUTH STATE LISTENER
====================================================== */

if (supabaseClient) {

    supabaseClient.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {

            state.session =
                session;

            state.user =
                session?.user || null;


            if (state.user) {

                await loadProfile();

            }
            else {

                state.profile =
                    null;

            }


            renderHeader();

        }
    );

}


/* ======================================================
   START APPLICATION
====================================================== */

async function startApplication() {

    /*
    Если config ещё не заполнен,
    не пытаемся обращаться к Supabase.
    */

    if (
        isSupabaseConfigured()
    ) {

        await loadSession();

    }


    renderHeader();

    await router();

}


/* ======================================================
   HASH CHANGE
====================================================== */

window.addEventListener(
    "hashchange",
    async () => {

        await router();

    }
);


/* ======================================================
   START
====================================================== */

startApplication();