(() => {
"use strict";

```
/* =========================================================
   CONFIGURATION
========================================================= */

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    document.body.innerHTML = `
        <div style="
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:30px;
            font-family:Arial,sans-serif;
            background:#f3f5f8;
        ">
            <div style="
                max-width:600px;
                padding:30px;
                background:white;
                border:1px solid #ddd;
                border-radius:16px;
                box-shadow:0 10px 40px rgba(0,0,0,.08);
            ">
                <h2>Ошибка конфигурации</h2>
                <p>
                    Не найден SUPABASE_URL или SUPABASE_ANON_KEY.
                </p>
            </div>
        </div>
    `;

    return;
}

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {
    guildId: null,
    gameId: null,

    guild: null,
    game: null,

    user: null,
    profile: null,
    gameProfile: null,

    members: [],
    memberProfiles: {},

    news: [],
    gallery: [],
    documents: [],
    applications: [],
    relations: [],

    otherGuilds: [],

    currentMember: null,

    isMember: false,
    isLeader: false,
    isOfficer: false,
    isDiplomat: false,
    canManage: false,

    initialized: false
};


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => {
    return Array.from(document.querySelectorAll(selector));
};


/* =========================================================
   URL
========================================================= */

function getGuildIdFromUrl() {
    const params = new URLSearchParams(window.location.search);

    return params.get("id");
}


/* =========================================================
   ESCAPE HTML
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
   URL SAFETY
========================================================= */

function safeUrl(value) {
    if (!value) {
        return "";
    }

    const valueString = String(value).trim();

    try {
        const url = new URL(valueString);

        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {
            return url.href;
        }
    } catch (error) {
        return "";
    }

    return "";
}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}


function formatDateTime(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* =========================================================
   FILE SIZE
========================================================= */

function formatFileSize(bytes) {
    if (!bytes || Number(bytes) <= 0) {
        return "0 Б";
    }

    const size = Number(bytes);

    if (size < 1024) {
        return `${size} Б`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} КБ`;
    }

    if (size < 1024 * 1024 * 1024) {
        return `${(size / 1024 / 1024).toFixed(1)} МБ`;
    }

    return `${(size / 1024 / 1024 / 1024).toFixed(1)} ГБ`;
}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(name) {
    if (!name) {
        return "?";
    }

    const words = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) {
        return "?";
    }

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (
        words[0].charAt(0) +
        words[1].charAt(0)
    ).toUpperCase();
}


/* =========================================================
   ROLE NAMES
========================================================= */

function getRoleName(role) {
    const roles = {
        member: "Участник",
        officer: "Офицер",
        diplomat: "Дипломат",
        leader: "Лидер"
    };

    return roles[role] || role || "Участник";
}


function getApplicationStatusName(status) {
    const statuses = {
        pending: "На рассмотрении",
        accepted: "Принята",
        rejected: "Отклонена",
        cancelled: "Отменена"
    };

    return statuses[status] || status || "—";
}


function getRelationTypeName(type) {
    const types = {
        alliance: "Союз",
        neutral: "Нейтралитет",
        hostile: "Враждебные отношения"
    };

    return types[type] || type || "—";
}


function getRelationStatusName(status) {
    const statuses = {
        pending: "Ожидает подтверждения",
        accepted: "Принято",
        rejected: "Отклонено",
        terminated: "Прекращено"
    };

    return statuses[status] || status || "—";
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "info") {
    const container = $("#toast-container");

    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <div class="toast-content">
            ${escapeHtml(message)}
        </div>

        <button
            class="toast-close"
            type="button"
            aria-label="Закрыть"
        >
            ×
        </button>
    `;

    container.appendChild(toast);

    const closeButton = toast.querySelector(".toast-close");

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            toast.remove();
        });
    }

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 4500);
}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}


function closeModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");

    const openModals = $$(".modal:not(.hidden)");

    if (!openModals.length) {
        document.body.style.overflow = "";
    }
}


function closeAllModals() {
    $$(".modal").forEach((modal) => {
        modal.classList.add("hidden");
    });

    document.body.style.overflow = "";
}


/* =========================================================
   CONFIRM
========================================================= */

let confirmResolver = null;


function askConfirm(title, message) {
    return new Promise((resolve) => {
        confirmResolver = resolve;

        const titleElement = $("#confirm-title");
        const messageElement = $("#confirm-message");

        if (titleElement) {
            titleElement.textContent = title || "Подтверждение";
        }

        if (messageElement) {
            messageElement.textContent = message || "Вы уверены?";
        }

        openModal("confirm-modal");
    });
}


function resolveConfirm(value) {
    if (typeof confirmResolver === "function") {
        const resolver = confirmResolver;

        confirmResolver = null;

        resolver(value);
    }

    closeModal("confirm-modal");
}


/* =========================================================
   AUTH
========================================================= */

async function getCurrentUser() {
    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error) {
        console.error("Ошибка получения пользователя:", error);
        return null;
    }

    return data?.user || null;
}


async function loadCurrentProfile() {
    if (!state.user) {
        state.profile = null;
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", state.user.id)
        .maybeSingle();

    if (error) {
        console.error("Ошибка загрузки профиля:", error);

        state.profile = null;

        return;
    }

    state.profile = data || null;
}


async function loadCurrentGameProfile() {
    state.gameProfile = null;

    if (!state.user || !state.gameId) {
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("game_profiles")
        .select("*")
        .eq("game_id", state.gameId)
        .eq("user_id", state.user.id)
        .maybeSingle();

    if (error) {
        console.warn(
            "Не удалось загрузить игровой профиль:",
            error
        );

        return;
    }

    state.gameProfile = data || null;
}


async function logout() {
    await supabase.auth.signOut();

    window.location.href = "index.html";
}


/* =========================================================
   LOAD GUILD
========================================================= */

async function loadGuild() {
    const {
        data,
        error
    } = await supabase
        .from("guilds")
        .select("*")
        .eq("id", state.guildId)
        .maybeSingle();

    if (error) {
        console.error("Ошибка загрузки гильдии:", error);

        throw new Error(
            error.message || "Не удалось загрузить гильдию."
        );
    }

    if (!data) {
        throw new Error("Гильдия не найдена.");
    }

    state.guild = data;
    state.gameId = data.game_id;
}


/* =========================================================
   LOAD GAME
========================================================= */

async function loadGame() {
    if (!state.gameId) {
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("games")
        .select("*")
        .eq("id", state.gameId)
        .maybeSingle();

    if (error) {
        console.error("Ошибка загрузки игры:", error);
        state.game = null;
        return;
    }

    state.game = data || null;
}


/* =========================================================
   LOAD CURRENT MEMBERSHIP
========================================================= */

async function loadCurrentMembership() {
    state.currentMember = null;

    state.isMember = false;
    state.isLeader = false;
    state.isOfficer = false;
    state.isDiplomat = false;
    state.canManage = false;

    if (!state.user) {
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("guild_members")
        .select("*")
        .eq("guild_id", state.guildId)
        .eq("user_id", state.user.id)
        .is("left_at", null)
        .maybeSingle();

    if (error) {
        console.warn(
            "Ошибка проверки членства:",
            error
        );

        return;
    }

    if (!data) {
        return;
    }

    state.currentMember = data;

    state.isMember = true;
    state.isLeader = data.role === "leader";
    state.isOfficer = data.role === "officer";
    state.isDiplomat = data.role === "diplomat";

    state.canManage =
        state.isLeader ||
        state.isOfficer;
}


/* =========================================================
   LOAD MEMBERS
========================================================= */

async function loadMembers() {
    const {
        data,
        error
    } = await supabase
        .from("guild_members")
        .select("*")
        .eq("guild_id", state.guildId)
        .is("left_at", null)
        .order("joined_at", {
            ascending: true
        });

    if (error) {
        console.error(
            "Ошибка загрузки участников:",
            error
        );

        state.members = [];

        throw new Error(
            error.message ||
            "Не удалось загрузить участников."
        );
    }

    state.members = data || [];

    await loadMemberProfiles();
}


async function loadMemberProfiles() {
    state.memberProfiles = {};

    const userIds = [
        ...new Set(
            state.members
                .map((member) => member.user_id)
                .filter(Boolean)
        )
    ];

    if (!userIds.length) {
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

    if (error) {
        console.warn(
            "Не удалось загрузить профили участников:",
            error
        );

        return;
    }

    (data || []).forEach((profile) => {
        state.memberProfiles[profile.id] = profile;
    });
}


/* =========================================================
   LOAD NEWS
========================================================= */

async function loadNews() {
    let query = supabase
        .from("guild_news")
        .select("*")
        .eq("guild_id", state.guildId)
        .order("pinned", {
            ascending: false
        })
        .order("created_at", {
            ascending: false
        });

    if (!state.isMember) {
        query = query.eq("visibility", "public");
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        console.error(
            "Ошибка загрузки новостей:",
            error
        );

        state.news = [];

        return;
    }

    state.news = data || [];
}


/* =========================================================
   LOAD GALLERY
========================================================= */

async function loadGallery() {
    let query = supabase
        .from("guild_gallery")
        .select("*")
        .eq("guild_id", state.guildId)
        .order("created_at", {
            ascending: false
        });

    if (!state.isMember) {
        query = query.eq("visibility", "public");
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        console.error(
            "Ошибка загрузки галереи:",
            error
        );

        state.gallery = [];

        return;
    }

    state.gallery = data || [];
}


/* =========================================================
   LOAD DOCUMENTS
========================================================= */

async function loadDocuments() {
    let query = supabase
        .from("guild_documents")
        .select("*")
        .eq("guild_id", state.guildId)
        .order("created_at", {
            ascending: false
        });

    if (!state.isMember) {
        query = query.eq("visibility", "public");
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        console.error(
            "Ошибка загрузки документов:",
            error
        );

        state.documents = [];

        return;
    }

    state.documents = data || [];
}


/* =========================================================
   LOAD APPLICATIONS
========================================================= */

async function loadApplications() {
    state.applications = [];

    if (!state.user) {
        return;
    }

    if (!state.canManage) {
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("guild_applications")
        .select("*")
        .eq("guild_id", state.guildId)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(
            "Ошибка загрузки заявок:",
            error
        );

        return;
    }

    state.applications = data || [];
}


/* =========================================================
   LOAD RELATIONS
========================================================= */

async function loadRelations() {
    state.relations = [];

    const {
        data,
        error
    } = await supabase
        .from("guild_relations")
        .select("*")
        .or(
            `guild_a_id.eq.${state.guildId},guild_b_id.eq.${state.guildId}`
        )
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(
            "Ошибка загрузки дипломатии:",
            error
        );

        return;
    }

    state.relations = data || [];

    await enrichRelations();
}


async function enrichRelations() {
    if (!state.relations.length) {
        return;
    }

    const guildIds = [
        ...new Set(
            state.relations
                .map((relation) => {
                    if (
                        relation.guild_a_id ===
                        state.guildId
                    ) {
                        return relation.guild_b_id;
                    }

                    return relation.guild_a_id;
                })
                .filter(Boolean)
        )
    ];

    if (!guildIds.length) {
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("guilds")
        .select("*")
        .in("id", guildIds);

    if (error) {
        console.warn(
            "Не удалось загрузить связанные гильдии:",
            error
        );

        return;
    }

    const map = {};

    (data || []).forEach((guild) => {
        map[guild.id] = guild;
    });

    state.relations = state.relations.map((relation) => {
        const otherGuildId =
            relation.guild_a_id === state.guildId
                ? relation.guild_b_id
                : relation.guild_a_id;

        return {
            ...relation,
            otherGuild: map[otherGuildId] || null
        };
    });
}


/* =========================================================
   LOAD OTHER GUILDS
========================================================= */

async function loadOtherGuilds() {
    if (!state.gameId) {
        state.otherGuilds = [];
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("guilds")
        .select("*")
        .eq("game_id", state.gameId)
        .neq("id", state.guildId)
        .order("name", {
            ascending: true
        });

    if (error) {
        console.warn(
            "Не удалось загрузить список гильдий:",
            error
        );

        state.otherGuilds = [];

        return;
    }

    state.otherGuilds = data || [];
}


/* =========================================================
   INITIAL DATA LOAD
========================================================= */

async function loadAllData() {
    await loadGuild();
    await loadGame();

    state.user = await getCurrentUser();

    await loadCurrentProfile();
    await loadCurrentGameProfile();
    await loadCurrentMembership();

    await Promise.all([
        loadMembers(),
        loadNews(),
        loadGallery(),
        loadDocuments(),
        loadRelations(),
        loadOtherGuilds()
    ]);

    await loadApplications();

    renderEverything();

    state.initialized = true;
}


/* =========================================================
   RENDER HEADER
========================================================= */

function renderHeader() {
    const guild = state.guild;

    if (!guild) {
        return;
    }

    const logo =
        safeUrl(guild.logo_url) ||
        createPlaceholderLogo(
            guild.name || "Guild"
        );

    const headerLogo = $("#header-guild-logo");
    const heroLogo = $("#hero-guild-logo");

    if (headerLogo) {
        headerLogo.src = logo;
    }

    if (heroLogo) {
        heroLogo.src = logo;
    }

    const headerName = $("#header-guild-name");
    const heroName = $("#hero-guild-name");

    if (headerName) {
        headerName.textContent =
            guild.name || "Гильдия";
    }

    if (heroName) {
        heroName.textContent =
            guild.name || "Гильдия";
    }

    const headerTag = $("#header-guild-tag");
    const heroTag = $("#hero-guild-tag");

    if (guild.tag) {
        if (headerTag) {
            headerTag.textContent =
                `[${guild.tag}]`;

            headerTag.classList.remove("hidden");
        }

        if (heroTag) {
            heroTag.textContent =
                `[${guild.tag}]`;

            heroTag.classList.remove("hidden");
        }
    } else {
        if (headerTag) {
            headerTag.classList.add("hidden");
        }

        if (heroTag) {
            heroTag.classList.add("hidden");
        }
    }

    const gameName =
        state.game?.name ||
        "Игра";

    const headerGameName =
        $("#header-game-name");

    if (headerGameName) {
        headerGameName.textContent =
            gameName;
    }

    const description =
        guild.description ||
        "Описание гильдии отсутствует.";

    const heroDescription =
        $("#hero-guild-description");

    if (heroDescription) {
        heroDescription.textContent =
            description;
    }

    const banner =
        safeUrl(guild.banner_url);

    const bannerElement =
        $("#guild-banner");

    if (bannerElement) {
        if (banner) {
            bannerElement.style.backgroundImage =
                `url("${banner}")`;
        } else {
            bannerElement.style.backgroundImage =
                `
                linear-gradient(
                    135deg,
                    #dce5f0 0%,
                    #cdd7e4 50%,
                    #e9edf2 100%
                )
                `;
        }
    }

    renderHeroLinks();
}


function renderHeroLinks() {
    const container = $("#hero-links");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const links = [];

    const website =
        safeUrl(state.guild?.website_url);

    const discord =
        safeUrl(state.guild?.discord_url);

    if (website) {
        links.push({
            text: "Сайт",
            url: website
        });
    }

    if (discord) {
        links.push({
            text: "Discord",
            url: discord
        });
    }

    links.forEach((link) => {
        const element =
            document.createElement("a");

        element.className = "hero-link";

        element.href = link.url;
        element.target = "_blank";
        element.rel = "noopener noreferrer";

        element.textContent = link.text;

        container.appendChild(element);
    });
}


/* =========================================================
   RENDER CURRENT USER
========================================================= */

function renderCurrentUser() {
    const name =
        state.profile?.display_name ||
        state.profile?.username ||
        state.user?.email ||
        "Гость";

    const nameElement =
        $("#current-user-name");

    if (nameElement) {
        nameElement.textContent = name;
    }

    const avatar =
        safeUrl(state.profile?.avatar_url);

    const avatarElement =
        $("#current-user-avatar");

    if (!avatarElement) {
        return;
    }

    if (avatar) {
        avatarElement.innerHTML = `
            <img
                src="${escapeHtml(avatar)}"
                alt=""
            >
        `;
    } else {
        avatarElement.textContent =
            getInitials(name);
    }
}


/* =========================================================
   RENDER ABOUT
========================================================= */

function renderAbout() {
    const guild = state.guild;

    if (!guild) {
        return;
    }

    const description =
        $("#about-description");

    if (description) {
        description.textContent =
            guild.description ||
            "Описание отсутствует.";
    }

    const name =
        $("#about-name");

    if (name) {
        name.textContent =
            guild.name || "—";
    }

    const tag =
        $("#about-tag");

    if (tag) {
        tag.textContent =
            guild.tag
                ? `[${guild.tag}]`
                : "—";
    }

    const memberCount =
        $("#about-members-count");

    if (memberCount) {
        memberCount.textContent =
            String(state.members.length);
    }

    const created =
        $("#about-created-at");

    if (created) {
        created.textContent =
            formatDate(guild.created_at);
    }

    const linksContainer =
        $("#about-links");

    if (linksContainer) {
        linksContainer.innerHTML = "";

        const links = [];

        const website =
            safeUrl(guild.website_url);

        const discord =
            safeUrl(guild.discord_url);

        if (website) {
            links.push({
                name: "Официальный сайт",
                url: website
            });
        }

        if (discord) {
            links.push({
                name: "Discord",
                url: discord
            });
        }

        if (!links.length) {
            linksContainer.textContent =
                "Ссылки не указаны.";

            return;
        }

        links.forEach((link) => {
            const element =
                document.createElement("a");

            element.className =
                "about-link";

            element.href = link.url;
            element.target = "_blank";
            element.rel = "noopener noreferrer";

            element.textContent =
                link.name;

            linksContainer.appendChild(element);
        });
    }
}


/* =========================================================
   RENDER MEMBERS
========================================================= */

function renderMembers() {
    const container =
        $("#members-list");

    if (!container) {
        return;
    }

    const count =
        $("#members-count-label");

    if (count) {
        const word =
            getRussianPlural(
                state.members.length,
                "участник",
                "участника",
                "участников"
            );

        count.textContent =
            `${state.members.length} ${word}`;
    }

    if (!state.members.length) {
        container.innerHTML = `
            <div class="empty-card">
                В гильдии пока нет участников.
            </div>
        `;

        return;
    }

    const sortedMembers =
        [...state.members].sort((a, b) => {
            const roleOrder = {
                leader: 0,
                officer: 1,
                diplomat: 2,
                member: 3
            };

            return (
                (roleOrder[a.role] ?? 99) -
                (roleOrder[b.role] ?? 99)
            );
        });

    container.innerHTML =
        sortedMembers
            .map((member) => {
                const profile =
                    state.memberProfiles[
                        member.user_id
                    ];

                const displayName =
                    profile?.display_name ||
                    profile?.username ||
                    member.nickname ||
                    "Игрок";

                const avatar =
                    safeUrl(
                        profile?.avatar_url
                    );

                const avatarHtml =
                    avatar
                        ? `
                            <img
                                src="${escapeHtml(avatar)}"
                                alt=""
                            >
                        `
                        : escapeHtml(
                            getInitials(displayName)
                        );

                return `
                    <article class="member-card">

                        <div class="member-avatar">
                            ${avatarHtml}
                        </div>

                        <div class="member-main">

                            <div class="member-name">
                                ${escapeHtml(displayName)}
                            </div>

                            <div class="member-nickname">
                                Ник: ${escapeHtml(
                                    member.nickname || "—"
                                )}
                            </div>

                            <div class="
                                member-role
                                ${escapeHtml(member.role || "member")}
                            ">
                                ${escapeHtml(
                                    getRoleName(member.role)
                                )}
                            </div>

                        </div>

                    </article>
                `;
            })
            .join("");
}


function getRussianPlural(
    number,
    one,
    few,
    many
) {
    const n = Math.abs(number) % 100;
    const n1 = n % 10;

    if (n > 10 && n < 20) {
        return many;
    }

    if (n1 > 1 && n1 < 5) {
        return few;
    }

    if (n1 === 1) {
        return one;
    }

    return many;
}


/* =========================================================
   RENDER NEWS
========================================================= */

function renderNews() {
    const container =
        $("#news-list");

    if (!container) {
        return;
    }

    if (!state.news.length) {
        container.innerHTML = `
            <div class="empty-card">
                Новостей пока нет.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.news
            .map((news) => {
                const canEdit =
                    state.canManage ||
                    news.author_id ===
                        state.user?.id;

                return `
                    <article
                        class="
                            news-card
                            ${news.pinned ? "pinned" : ""}
                        "
                    >

                        <div class="news-header">

                            <div>

                                <h3 class="news-title">
                                    ${escapeHtml(
                                        news.title
                                    )}
                                </h3>

                                <div class="news-meta">
                                    ${formatDateTime(
                                        news.created_at
                                    )}
                                </div>

                            </div>

                            ${
                                news.pinned
                                    ? `
                                        <span class="
                                            news-pinned-label
                                        ">
                                            Закреплено
                                        </span>
                                    `
                                    : ""
                            }

                        </div>


                        <div class="news-content">
                            ${escapeHtml(
                                news.content
                            )}
                        </div>


                        ${
                            canEdit
                                ? `
                                    <div class="news-actions">

                                        <button
                                            type="button"
                                            class="
                                                secondary-button
                                                delete-news-button
                                            "
                                            data-id="${escapeHtml(
                                                news.id
                                            )}"
                                        >
                                            Удалить
                                        </button>

                                    </div>
                                `
                                : ""
                        }

                    </article>
                `;
            })
            .join("");
}


/* =========================================================
   RENDER GALLERY
========================================================= */

function renderGallery() {
    const container =
        $("#gallery-list");

    if (!container) {
        return;
    }

    if (!state.gallery.length) {
        container.innerHTML = `
            <div class="empty-card">
                В галерее пока нет изображений.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.gallery
            .map((item) => {
                const image =
                    safeUrl(item.image_url);

                if (!image) {
                    return "";
                }

                const canDelete =
                    state.canManage ||
                    item.uploaded_by ===
                        state.user?.id;

                return `
                    <article class="gallery-card">

                        <div class="
                            gallery-image-wrapper
                        ">

                            <a
                                href="${escapeHtml(image)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >

                                <img
                                    class="gallery-image"
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(
                                        item.title || ""
                                    )}"
                                    loading="lazy"
                                >

                            </a>

                        </div>


                        <div class="gallery-info">

                            <div class="gallery-title">
                                ${escapeHtml(
                                    item.title ||
                                    "Изображение"
                                )}
                            </div>

                            ${
                                item.description
                                    ? `
                                        <div class="
                                            gallery-description
                                        ">
                                            ${escapeHtml(
                                                item.description
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                            <div class="gallery-meta">
                                ${formatDate(
                                    item.created_at
                                )}
                            </div>

                            ${
                                canDelete
                                    ? `
                                        <div
                                            style="
                                                margin-top:10px;
                                            "
                                        >
                                            <button
                                                type="button"
                                                class="
                                                    secondary-button
                                                    delete-gallery-button
                                                "
                                                data-id="${escapeHtml(
                                                    item.id
                                                )}"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                    </article>
                `;
            })
            .join("");
}


/* =========================================================
   RENDER DOCUMENTS
========================================================= */

async function getDocumentUrl(storagePath) {
    if (!storagePath) {
        return "";
    }

    const {
        data,
        error
    } = await supabase.storage
        .from("guild-documents")
        .createSignedUrl(
            storagePath,
            3600
        );

    if (error) {
        console.warn(
            "Ошибка создания ссылки документа:",
            error
        );

        return "";
    }

    return data?.signedUrl || "";
}


async function renderDocuments() {
    const container =
        $("#documents-list");

    if (!container) {
        return;
    }

    if (!state.documents.length) {
        container.innerHTML = `
            <div class="empty-card">
                Документов пока нет.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.documents
            .map((document) => {
                const canDelete =
                    state.canManage ||
                    document.uploaded_by ===
                        state.user?.id;

                return `
                    <article class="document-card">

                        <div class="document-icon">
                            📄
                        </div>

                        <div class="document-main">

                            <div class="document-name">
                                ${escapeHtml(
                                    document.name ||
                                    "Документ"
                                )}
                            </div>

                            ${
                                document.description
                                    ? `
                                        <div class="
                                            document-description
                                        ">
                                            ${escapeHtml(
                                                document.description
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                            <div class="document-meta">
                                ${escapeHtml(
                                    document.mime_type ||
                                    "Файл"
                                )}
                                ·
                                ${formatFileSize(
                                    document.file_size
                                )}
                                ·
                                ${formatDate(
                                    document.created_at
                                )}
                            </div>

                        </div>


                        <div class="document-actions">

                            <button
                                type="button"
                                class="
                                    primary-button
                                    open-document-button
                                "
                                data-path="${escapeHtml(
                                    document.storage_path || ""
                                )}"
                            >
                                Открыть
                            </button>

                            ${
                                canDelete
                                    ? `
                                        <button
                                            type="button"
                                            class="
                                                secondary-button
                                                delete-document-button
                                            "
                                            data-id="${escapeHtml(
                                                document.id
                                            )}"
                                        >
                                            Удалить
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </article>
                `;
            })
            .join("");
}


/* =========================================================
   RENDER DIPLOMACY
========================================================= */

function renderDiplomacy() {
    const container =
        $("#diplomacy-list");

    if (!container) {
        return;
    }

    if (!state.relations.length) {
        container.innerHTML = `
            <div class="empty-card">
                Дипломатических отношений пока нет.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.relations
            .map((relation) => {
                const otherGuild =
                    relation.otherGuild;

                const name =
                    otherGuild?.name ||
                    "Неизвестная гильдия";

                const logo =
                    safeUrl(
                        otherGuild?.logo_url
                    ) ||
                    createPlaceholderLogo(name);

                const canAccept =
                    relation.status === "pending" &&
                    state.isLeader &&
                    relation.guild_b_id ===
                        state.guildId;

                const canTerminate =
                    relation.status === "accepted" &&
                    (
                        state.isLeader ||
                        state.isDiplomat
                    );

                return `
                    <article class="relation-card">

                        <div class="relation-logo">

                            <img
                                src="${escapeHtml(logo)}"
                                alt=""
                            >

                        </div>


                        <div class="relation-main">

                            <div class="relation-name">
                                ${escapeHtml(name)}
                            </div>

                            <div class="
                                relation-type
                                ${escapeHtml(
                                    relation.relation_type || ""
                                )}
                            ">
                                ${escapeHtml(
                                    getRelationTypeName(
                                        relation.relation_type
                                    )
                                )}
                            </div>

                            <div class="
                                relation-status
                                ${escapeHtml(
                                    relation.status || ""
                                )}
                            ">
                                ${escapeHtml(
                                    getRelationStatusName(
                                        relation.status
                                    )
                                )}
                            </div>

                        </div>


                        <div class="relation-actions">

                            ${
                                canAccept
                                    ? `
                                        <button
                                            type="button"
                                            class="
                                                primary-button
                                                accept-relation-button
                                            "
                                            data-id="${escapeHtml(
                                                relation.id
                                            )}"
                                        >
                                            Принять
                                        </button>

                                        <button
                                            type="button"
                                            class="
                                                secondary-button
                                                reject-relation-button
                                            "
                                            data-id="${escapeHtml(
                                                relation.id
                                            )}"
                                        >
                                            Отклонить
                                        </button>
                                    `
                                    : ""
                            }

                            ${
                                canTerminate
                                    ? `
                                        <button
                                            type="button"
                                            class="
                                                danger-button
                                                terminate-relation-button
                                            "
                                            data-id="${escapeHtml(
                                                relation.id
                                            )}"
                                        >
                                            Прекратить
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </article>
                `;
            })
            .join("");
}


/* =========================================================
   RENDER APPLICATIONS
========================================================= */

function renderApplications() {
    const management =
        $("#applications-management");

    const applicationFormArea =
        $("#application-form-area");

    const list =
        $("#applications-list");

    if (state.isMember) {
        if (applicationFormArea) {
            applicationFormArea.classList.add("hidden");
        }
    } else {
        if (applicationFormArea) {
            applicationFormArea.classList.remove("hidden");
        }
    }

    if (!state.canManage) {
        if (management) {
            management.classList.add("hidden");
        }

        return;
    }

    if (management) {
        management.classList.remove("hidden");
    }

    if (!list) {
        return;
    }

    if (!state.applications.length) {
        list.innerHTML = `
            <div class="empty-card">
                Новых заявок нет.
            </div>
        `;

        return;
    }

    list.innerHTML =
        state.applications
            .map((application) => {
                const canReview =
                    application.status === "pending";

                return `
                    <article class="application-card">

                        <div class="application-top">

                            <div>

                                <div class="application-user">
                                    Игровой ник:
                                    ${escapeHtml(
                                        application.nickname
                                    )}
                                </div>

                                <div class="
                                    application-nickname
                                ">
                                    Создана:
                                    ${formatDateTime(
                                        application.created_at
                                    )}
                                </div>

                            </div>

                            <span class="
                                status-badge
                                ${
                                    application.status ===
                                    "accepted"
                                        ? "success"
                                        : application.status ===
                                          "rejected"
                                        ? "danger"
                                        : application.status ===
                                          "cancelled"
                                        ? "danger"
                                        : "warning"
                                }
                            ">
                                ${escapeHtml(
                                    getApplicationStatusName(
                                        application.status
                                    )
                                )}
                            </span>

                        </div>


                        ${
                            application.message
                                ? `
                                    <div class="
                                        application-message
                                    ">
                                        ${escapeHtml(
                                            application.message
                                        )}
                                    </div>
                                `
                                : ""
                        }


                        ${
                            canReview
                                ? `
                                    <div class="
                                        application-actions
                                    ">

                                        <button
                                            type="button"
                                            class="
                                                primary-button
                                                accept-application-button
                                            "
                                            data-id="${escapeHtml(
                                                application.id
                                            )}"
                                        >
                                            Принять
                                        </button>

                                        <button
                                            type="button"
                                            class="
                                                danger-button
                                                reject-application-button
                                            "
                                            data-id="${escapeHtml(
                                                application.id
                                            )}"
                                        >
                                            Отклонить
                                        </button>

                                    </div>
                                `
                                : ""
                        }

                    </article>
                `;
            })
            .join("");
}


/* =========================================================
   RENDER SETTINGS
========================================================= */

function renderSettings() {
    const guild =
        state.guild;

    if (!guild) {
        return;
    }

    const name =
        $("#settings-name");

    const tag =
        $("#settings-tag");

    const description =
        $("#settings-description");

    const website =
        $("#settings-website");

    const discord =
        $("#settings-discord");

    const isPublic =
        $("#settings-public");

    const logoUrl =
        $("#settings-logo-url");

    const bannerUrl =
        $("#settings-banner-url");

    if (name) {
        name.value =
            guild.name || "";
    }

    if (tag) {
        tag.value =
            guild.tag || "";
    }

    if (description) {
        description.value =
            guild.description || "";
    }

    if (website) {
        website.value =
            guild.website_url || "";
    }

    if (discord) {
        discord.value =
            guild.discord_url || "";
    }

    if (isPublic) {
        isPublic.checked =
            guild.is_public !== false;
    }

    if (logoUrl) {
        logoUrl.value =
            guild.logo_url || "";
    }

    if (bannerUrl) {
        bannerUrl.value =
            guild.banner_url || "";
    }

    renderSettingsImages();
}


function renderSettingsImages() {
    const logoPreview =
        $("#settings-logo-preview");

    const bannerPreview =
        $("#settings-banner-preview");

    const logo =
        safeUrl(state.guild?.logo_url);

    const banner =
        safeUrl(state.guild?.banner_url);

    if (logoPreview) {
        logoPreview.src =
            logo ||
            createPlaceholderLogo(
                state.guild?.name || "Guild"
            );
    }

    if (bannerPreview) {
        if (banner) {
            bannerPreview.style.backgroundImage =
                `url("${banner}")`;
        } else {
            bannerPreview.style.backgroundImage =
                `
                linear-gradient(
                    135deg,
                    #dce5f0,
                    #cdd7e4
                )
                `;
        }
    }
}


/* =========================================================
   RENDER PERMISSIONS
========================================================= */

function renderPermissions() {
    const settingsNav =
        $("#settings-nav");

    const editAbout =
        $("#edit-about-button");

    const createNews =
        $("#create-news-button");

    const uploadGallery =
        $("#upload-gallery-button");

    const uploadDocument =
        $("#upload-document-button");

    const createRelation =
        $("#create-relation-button");

    if (settingsNav) {
        if (state.isLeader) {
            settingsNav.classList.remove("hidden");
        } else {
            settingsNav.classList.add("hidden");
        }
    }

    if (editAbout) {
        if (state.isLeader) {
            editAbout.classList.remove("hidden");
        } else {
            editAbout.classList.add("hidden");
        }
    }

    if (createNews) {
        if (state.canManage) {
            createNews.classList.remove("hidden");
        } else {
            createNews.classList.add("hidden");
        }
    }

    if (uploadGallery) {
        if (state.canManage) {
            uploadGallery.classList.remove("hidden");
        } else {
            uploadGallery.classList.add("hidden");
        }
    }

    if (uploadDocument) {
        if (state.canManage) {
            uploadDocument.classList.remove("hidden");
        } else {
            uploadDocument.classList.add("hidden");
        }
    }

    if (createRelation) {
        if (
            state.isLeader ||
            state.isDiplomat
        ) {
            createRelation.classList.remove("hidden");
        } else {
            createRelation.classList.add("hidden");
        }
    }

    const applicationCount =
        $("#applications-count");

    const pendingCount =
        state.applications.filter(
            (application) =>
                application.status === "pending"
        ).length;

    if (
        applicationCount &&
        state.canManage &&
        pendingCount > 0
    ) {
        applicationCount.textContent =
            String(pendingCount);

        applicationCount.classList.remove(
            "hidden"
        );
    } else if (applicationCount) {
        applicationCount.classList.add(
            "hidden"
        );
    }

    const leaveButton =
        $("#leave-guild-button");

    if (leaveButton) {
        if (state.isMember) {
            leaveButton.classList.remove(
                "hidden"
            );
        } else {
            leaveButton.classList.add(
                "hidden"
            );
        }

        if (state.isLeader) {
            leaveButton.textContent =
                "Передача лидерства";
        } else {
            leaveButton.textContent =
                "Выйти из гильдии";
        }
    }
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {
    renderHeader();
    renderCurrentUser();
    renderAbout();
    renderMembers();
    renderNews();
    renderGallery();
    renderDocuments();
    renderDiplomacy();
    renderApplications();
    renderSettings();
    renderPermissions();
}


/* =========================================================
   PLACEHOLDER LOGO
========================================================= */

function createPlaceholderLogo(name) {
    const initials =
        getInitials(name);

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="300"
            height="300"
            viewBox="0 0 300 300"
        >
            <rect
                width="300"
                height="300"
                rx="45"
                fill="#eaf2ff"
            />

            <text
                x="150"
                y="165"
                text-anchor="middle"
                font-family="Arial, sans-serif"
                font-size="100"
                font-weight="700"
                fill="#2677e8"
            >
                ${escapeHtml(initials)}
            </text>
        </svg>
    `;

    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg)
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

function switchSection(sectionName) {
    $$(".nav-item").forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionName
        );
    });

    $$(".content-section").forEach((section) => {
        section.classList.remove("active");
    });

    const target =
        document.getElementById(
            `section-${sectionName}`
        );

    if (target) {
        target.classList.add("active");
    }

    if (sectionName === "documents") {
        renderDocuments();
    }
}


/* =========================================================
   CREATE NEWS
========================================================= */

async function createNews(event) {
    event.preventDefault();

    if (!state.canManage) {
        showToast(
            "У вас нет прав для публикации новостей.",
            "error"
        );

        return;
    }

    const title =
        $("#news-title")?.value.trim();

    const content =
        $("#news-content")?.value.trim();

    const pinned =
        Boolean(
            $("#news-pinned")?.checked
        );

    if (!title) {
        showToast(
            "Введите заголовок новости.",
            "warning"
        );

        return;
    }

    if (!content) {
        showToast(
            "Введите текст новости.",
            "warning"
        );

        return;
    }

    const {
        error
    } = await supabase
        .from("guild_news")
        .insert({
            guild_id: state.guildId,
            author_id: state.user.id,
            title,
            content,
            visibility: "members",
            pinned
        });

    if (error) {
        console.error(
            "Ошибка создания новости:",
            error
        );

        showToast(
            `Не удалось создать новость: ${error.message}`,
            "error"
        );

        return;
    }

    $("#news-form")?.reset();

    closeModal("news-modal");

    showToast(
        "Новость опубликована.",
        "success"
    );

    await loadNews();

    renderNews();
}


/* =========================================================
   DELETE NEWS
========================================================= */

async function deleteNews(newsId) {
    const news =
        state.news.find(
            (item) => item.id === newsId
        );

    if (!news) {
        return;
    }

    if (
        !state.canManage &&
        news.author_id !== state.user?.id
    ) {
        showToast(
            "У вас нет прав для удаления этой новости.",
            "error"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Удалить новость",
            "Новость будет удалена. Продолжить?"
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase
        .from("guild_news")
        .delete()
        .eq("id", newsId);

    if (error) {
        console.error(
            "Ошибка удаления новости:",
            error
        );

        showToast(
            `Не удалось удалить новость: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Новость удалена.",
        "success"
    );

    await loadNews();

    renderNews();
}


/* =========================================================
   GALLERY UPLOAD
========================================================= */

async function uploadGallery(event) {
    event.preventDefault();

    if (!state.canManage) {
        showToast(
            "У вас нет прав для загрузки изображений.",
            "error"
        );

        return;
    }

    const title =
        $("#gallery-title")?.value.trim();

    const description =
        $("#gallery-description")?.value.trim();

    const file =
        $("#gallery-file")?.files?.[0];

    if (!title) {
        showToast(
            "Введите название изображения.",
            "warning"
        );

        return;
    }

    if (!file) {
        showToast(
            "Выберите изображение.",
            "warning"
        );

        return;
    }

    if (!file.type.startsWith("image/")) {
        showToast(
            "Можно загружать только изображения.",
            "error"
        );

        return;
    }

    const maxSize =
        10 * 1024 * 1024;

    if (file.size > maxSize) {
        showToast(
            "Размер изображения не должен превышать 10 МБ.",
            "error"
        );

        return;
    }

    const extension =
        getFileExtension(file.name) ||
        "jpg";

    const filePath =
        `${state.guildId}/${crypto.randomUUID()}.${extension}`;

    showToast(
        "Загрузка изображения...",
        "info"
    );

    const {
        error: uploadError
    } = await supabase.storage
        .from("guild-gallery")
        .upload(
            filePath,
            file,
            {
                cacheControl: "3600",
                upsert: false
            }
        );

    if (uploadError) {
        console.error(
            "Ошибка загрузки изображения:",
            uploadError
        );

        showToast(
            `Не удалось загрузить изображение: ${uploadError.message}`,
            "error"
        );

        return;
    }

    const {
        data: publicData
    } = supabase.storage
        .from("guild-gallery")
        .getPublicUrl(filePath);

    const imageUrl =
        publicData?.publicUrl || "";

    if (!imageUrl) {
        showToast(
            "Не удалось получить ссылку на изображение.",
            "error"
        );

        return;
    }

    const {
        error: insertError
    } = await supabase
        .from("guild_gallery")
        .insert({
            guild_id: state.guildId,
            uploaded_by: state.user.id,
            title,
            description:
                description || null,
            image_url: imageUrl,
            visibility: "members"
        });

    if (insertError) {
        console.error(
            "Ошибка записи галереи:",
            insertError
        );

        await supabase.storage
            .from("guild-gallery")
            .remove([filePath]);

        showToast(
            `Не удалось сохранить изображение: ${insertError.message}`,
            "error"
        );

        return;
    }

    $("#gallery-form")?.reset();

    closeModal("gallery-modal");

    showToast(
        "Изображение добавлено в галерею.",
        "success"
    );

    await loadGallery();

    renderGallery();
}


/* =========================================================
   DELETE GALLERY
========================================================= */

async function deleteGalleryItem(id) {
    const item =
        state.gallery.find(
            (galleryItem) =>
                galleryItem.id === id
        );

    if (!item) {
        return;
    }

    if (
        !state.canManage &&
        item.uploaded_by !== state.user?.id
    ) {
        showToast(
            "У вас нет прав для удаления изображения.",
            "error"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Удалить изображение",
            "Изображение будет удалено из галереи."
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase
        .from("guild_gallery")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(
            "Ошибка удаления изображения:",
            error
        );

        showToast(
            `Не удалось удалить изображение: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Изображение удалено.",
        "success"
    );

    await loadGallery();

    renderGallery();
}


/* =========================================================
   DOCUMENT UPLOAD
========================================================= */

async function uploadDocument(event) {
    event.preventDefault();

    if (!state.canManage) {
        showToast(
            "У вас нет прав для загрузки документов.",
            "error"
        );

        return;
    }

    const name =
        $("#document-name")?.value.trim();

    const description =
        $("#document-description")?.value.trim();

    const file =
        $("#document-file")?.files?.[0];

    if (!name) {
        showToast(
            "Введите название документа.",
            "warning"
        );

        return;
    }

    if (!file) {
        showToast(
            "Выберите файл.",
            "warning"
        );

        return;
    }

    const maxSize =
        50 * 1024 * 1024;

    if (file.size > maxSize) {
        showToast(
            "Размер документа не должен превышать 50 МБ.",
            "error"
        );

        return;
    }

    const extension =
        getFileExtension(file.name);

    const safeExtension =
        extension
            ? `.${extension}`
            : "";

    const filePath =
        `${state.guildId}/${crypto.randomUUID()}${safeExtension}`;

    showToast(
        "Загрузка документа...",
        "info"
    );

    const {
        error: uploadError
    } = await supabase.storage
        .from("guild-documents")
        .upload(
            filePath,
            file,
            {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type ||
                    "application/octet-stream"
            }
        );

    if (uploadError) {
        console.error(
            "Ошибка загрузки документа:",
            uploadError
        );

        showToast(
            `Не удалось загрузить документ: ${uploadError.message}`,
            "error"
        );

        return;
    }

    const {
        error: insertError
    } = await supabase
        .from("guild_documents")
        .insert({
            guild_id: state.guildId,
            uploaded_by: state.user.id,
            name,
            description:
                description || null,
            storage_path: filePath,
            mime_type:
                file.type ||
                "application/octet-stream",
            file_size: file.size,
            visibility: "members"
        });

    if (insertError) {
        console.error(
            "Ошибка записи документа:",
            insertError
        );

        await supabase.storage
            .from("guild-documents")
            .remove([filePath]);

        showToast(
            `Не удалось сохранить документ: ${insertError.message}`,
            "error"
        );

        return;
    }

    $("#document-form")?.reset();

    closeModal("document-modal");

    showToast(
        "Документ загружен.",
        "success"
    );

    await loadDocuments();

    await renderDocuments();
}


/* =========================================================
   OPEN DOCUMENT
========================================================= */

async function openDocument(storagePath) {
    if (!storagePath) {
        showToast(
            "У документа отсутствует путь к файлу.",
            "error"
        );

        return;
    }

    showToast(
        "Получаем ссылку на документ...",
        "info"
    );

    const url =
        await getDocumentUrl(storagePath);

    if (!url) {
        showToast(
            "Не удалось открыть документ. Проверьте Storage Policies.",
            "error"
        );

        return;
    }

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   DELETE DOCUMENT
========================================================= */

async function deleteDocument(id) {
    const document =
        state.documents.find(
            (item) => item.id === id
        );

    if (!document) {
        return;
    }

    if (
        !state.canManage &&
        document.uploaded_by !== state.user?.id
    ) {
        showToast(
            "У вас нет прав для удаления документа.",
            "error"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Удалить документ",
            "Документ будет удалён из гильдии."
        );

    if (!confirmed) {
        return;
    }

    const {
        error: deleteRowError
    } = await supabase
        .from("guild_documents")
        .delete()
        .eq("id", id);

    if (deleteRowError) {
        console.error(
            "Ошибка удаления документа:",
            deleteRowError
        );

        showToast(
            `Не удалось удалить документ: ${deleteRowError.message}`,
            "error"
        );

        return;
    }

    if (document.storage_path) {
        const {
            error: storageError
        } = await supabase.storage
            .from("guild-documents")
            .remove([
                document.storage_path
            ]);

        if (storageError) {
            console.warn(
                "Файл удалён не был:",
                storageError
            );
        }
    }

    showToast(
        "Документ удалён.",
        "success"
    );

    await loadDocuments();

    await renderDocuments();
}


/* =========================================================
   APPLY TO GUILD
========================================================= */

async function submitApplication(event) {
    event.preventDefault();

    if (!state.user) {
        showToast(
            "Для подачи заявки необходимо войти.",
            "error"
        );

        return;
    }

    if (state.isMember) {
        showToast(
            "Вы уже состоите в этой гильдии.",
            "info"
        );

        return;
    }

    const nickname =
        $("#application-nickname")
            ?.value
            .trim();

    const message =
        $("#application-message")
            ?.value
            .trim();

    if (!nickname) {
        showToast(
            "Введите игровой ник.",
            "warning"
        );

        return;
    }

    const {
        data: existing,
        error: existingError
    } = await supabase
        .from("guild_applications")
        .select("id,status")
        .eq("guild_id", state.guildId)
        .eq("user_id", state.user.id)
        .eq("status", "pending")
        .maybeSingle();

    if (existingError) {
        console.error(
            "Ошибка проверки заявки:",
            existingError
        );

        showToast(
            existingError.message,
            "error"
        );

        return;
    }

    if (existing) {
        showToast(
            "У вас уже есть активная заявка в эту гильдию.",
            "warning"
        );

        return;
    }

    const {
        error
    } = await supabase
        .from("guild_applications")
        .insert({
            guild_id: state.guildId,
            game_id: state.gameId,
            user_id: state.user.id,
            nickname,
            message:
                message || null,
            status: "pending"
        });

    if (error) {
        console.error(
            "Ошибка подачи заявки:",
            error
        );

        showToast(
            `Не удалось отправить заявку: ${error.message}`,
            "error"
        );

        return;
    }

    $("#application-form")?.reset();

    showToast(
        "Заявка отправлена.",
        "success"
    );
}


/* =========================================================
   ACCEPT APPLICATION
========================================================= */

async function acceptApplication(id) {
    if (!state.canManage) {
        showToast(
            "Недостаточно прав.",
            "error"
        );

        return;
    }

    const application =
        state.applications.find(
            (item) => item.id === id
        );

    if (!application) {
        return;
    }

    const confirmed =
        await askConfirm(
            "Принять заявку",
            `Принять игрока ${application.nickname} в гильдию?`
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase.rpc(
        "accept_guild_application",
        {
            p_application_id: id
        }
    );

    if (error) {
        console.error(
            "Ошибка принятия заявки:",
            error
        );

        showToast(
            `Не удалось принять заявку: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Заявка принята.",
        "success"
    );

    await loadApplications();
    await loadMembers();

    renderMembers();
    renderApplications();
    renderPermissions();
}


/* =========================================================
   REJECT APPLICATION
========================================================= */

async function rejectApplication(id) {
    if (!state.canManage) {
        showToast(
            "Недостаточно прав.",
            "error"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Отклонить заявку",
            "Заявка будет отклонена."
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase.rpc(
        "reject_guild_application",
        {
            p_application_id: id
        }
    );

    if (error) {
        console.error(
            "Ошибка отклонения заявки:",
            error
        );

        showToast(
            `Не удалось отклонить заявку: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Заявка отклонена.",
        "success"
    );

    await loadApplications();

    renderApplications();
    renderPermissions();
}


/* =========================================================
   CREATE RELATION
========================================================= */

async function createRelation(event) {
    event.preventDefault();

    if (
        !state.isLeader &&
        !state.isDiplomat
    ) {
        showToast(
            "Недостаточно прав для управления дипломатией.",
            "error"
        );

        return;
    }

    const guildBId =
        $("#relation-guild")?.value;

    const relationType =
        $("#relation-type")?.value;

    if (!guildBId) {
        showToast(
            "Выберите гильдию.",
            "warning"
        );

        return;
    }

    if (!relationType) {
        showToast(
            "Выберите тип отношений.",
            "warning"
        );

        return;
    }

    const alreadyExists =
        state.relations.some((relation) => {
            const samePair =
                (
                    relation.guild_a_id === state.guildId &&
                    relation.guild_b_id === guildBId
                ) ||
                (
                    relation.guild_b_id === state.guildId &&
                    relation.guild_a_id === guildBId
                );

            return (
                samePair &&
                (
                    relation.status === "pending" ||
                    relation.status === "accepted"
                )
            );
        });

    if (alreadyExists) {
        showToast(
            "С этой гильдией уже существуют активные отношения.",
            "warning"
        );

        return;
    }

    const {
        error
    } = await supabase
        .from("guild_relations")
        .insert({
            game_id: state.gameId,
            guild_a_id: state.guildId,
            guild_b_id: guildBId,
            relation_type: relationType,
            status: "pending",
            created_by: state.user.id
        });

    if (error) {
        console.error(
            "Ошибка создания дипломатических отношений:",
            error
        );

        showToast(
            `Не удалось отправить предложение: ${error.message}`,
            "error"
        );

        return;
    }

    $("#relation-form")?.reset();

    closeModal("relation-modal");

    showToast(
        "Дипломатическое предложение отправлено.",
        "success"
    );

    await loadRelations();

    renderDiplomacy();
}


/* =========================================================
   ACCEPT RELATION
========================================================= */

async function acceptRelation(id) {
    if (!state.isLeader) {
        showToast(
            "Только лидер может принять дипломатическое предложение.",
            "error"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Принять предложение",
            "Принять дипломатические отношения?"
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase.rpc(
        "accept_guild_relation",
        {
            p_relation_id: id
        }
    );

    if (error) {
        console.error(
            "Ошибка принятия отношения:",
            error
        );

        showToast(
            `Не удалось принять предложение: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Дипломатические отношения приняты.",
        "success"
    );

    await loadRelations();

    renderDiplomacy();
}


/* =========================================================
   REJECT RELATION
========================================================= */

async function rejectRelation(id) {
    if (!state.isLeader) {
        showToast(
            "Только лидер может отклонить предложение.",
            "error"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Отклонить предложение",
            "Отклонить дипломатическое предложение?"
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase
        .from("guild_relations")
        .update({
            status: "rejected"
        })
        .eq("id", id);

    if (error) {
        console.error(
            "Ошибка отклонения отношения:",
            error
        );

        showToast(
            `Не удалось отклонить предложение: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Предложение отклонено.",
        "success"
    );

    await loadRelations();

    renderDiplomacy();
}


/* =========================================================
   TERMINATE RELATION
========================================================= */

async function terminateRelation(id) {
    if (
        !state.isLeader &&
        !state.isDiplomat
    ) {
        showToast(
            "Недостаточно прав.",
            "error"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Прекратить отношения",
            "Дипломатические отношения будут прекращены."
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase.rpc(
        "terminate_guild_relation",
        {
            p_relation_id: id
        }
    );

    if (error) {
        console.error(
            "Ошибка прекращения отношения:",
            error
        );

        showToast(
            `Не удалось прекратить отношения: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Дипломатические отношения прекращены.",
        "success"
    );

    await loadRelations();

    renderDiplomacy();
}


/* =========================================================
   UPDATE GUILD SETTINGS
========================================================= */

async function saveGuildSettings(event) {
    event.preventDefault();

    if (!state.isLeader) {
        showToast(
            "Только лидер может изменять настройки гильдии.",
            "error"
        );

        return;
    }

    const name =
        $("#settings-name")
            ?.value
            .trim();

    const tag =
        $("#settings-tag")
            ?.value
            .trim();

    const description =
        $("#settings-description")
            ?.value
            .trim();

    const website =
        $("#settings-website")
            ?.value
            .trim();

    const discord =
        $("#settings-discord")
            ?.value
            .trim();

    const isPublic =
        Boolean(
            $("#settings-public")?.checked
        );

    const logoUrl =
        $("#settings-logo-url")
            ?.value
            .trim();

    const bannerUrl =
        $("#settings-banner-url")
            ?.value
            .trim();

    if (!name) {
        showToast(
            "Название гильдии не может быть пустым.",
            "warning"
        );

        return;
    }

    if (
        website &&
        !safeUrl(website)
    ) {
        showToast(
            "Укажите корректный URL сайта.",
            "warning"
        );

        return;
    }

    if (
        discord &&
        !safeUrl(discord)
    ) {
        showToast(
            "Укажите корректный URL Discord.",
            "warning"
        );

        return;
    }

    if (
        logoUrl &&
        !safeUrl(logoUrl)
    ) {
        showToast(
            "Укажите корректный URL логотипа.",
            "warning"
        );

        return;
    }

    if (
        bannerUrl &&
        !safeUrl(bannerUrl)
    ) {
        showToast(
            "Укажите корректный URL баннера.",
            "warning"
        );

        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("guilds")
        .update({
            name,
            tag:
                tag || null,
            description:
                description || null,
            website_url:
                website || null,
            discord_url:
                discord || null,
            is_public:
                isPublic,
            logo_url:
                logoUrl || null,
            banner_url:
                bannerUrl || null,
            updated_at:
                new Date().toISOString()
        })
        .eq("id", state.guildId)
        .select("*")
        .maybeSingle();

    if (error) {
        console.error(
            "Ошибка обновления гильдии:",
            error
        );

        showToast(
            `Не удалось сохранить настройки: ${error.message}`,
            "error"
        );

        return;
    }

    if (data) {
        state.guild = data;
    }

    showToast(
        "Настройки гильдии сохранены.",
        "success"
    );

    renderEverything();
}


/* =========================================================
   IMAGE SETTINGS
========================================================= */

async function saveImageSettings() {
    if (!state.isLeader) {
        showToast(
            "Только лидер может изменять изображения.",
            "error"
        );

        return;
    }

    const logoUrl =
        $("#settings-logo-url")
            ?.value
            .trim();

    const bannerUrl =
        $("#settings-banner-url")
            ?.value
            .trim();

    if (
        logoUrl &&
        !safeUrl(logoUrl)
    ) {
        showToast(
            "Укажите корректный URL логотипа.",
            "warning"
        );

        return;
    }

    if (
        bannerUrl &&
        !safeUrl(bannerUrl)
    ) {
        showToast(
            "Укажите корректный URL баннера.",
            "warning"
        );

        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("guilds")
        .update({
            logo_url:
                logoUrl || null,
            banner_url:
                bannerUrl || null,
            updated_at:
                new Date().toISOString()
        })
        .eq("id", state.guildId)
        .select("*")
        .maybeSingle();

    if (error) {
        console.error(
            "Ошибка сохранения изображений:",
            error
        );

        showToast(
            `Не удалось сохранить изображения: ${error.message}`,
            "error"
        );

        return;
    }

    if (data) {
        state.guild = data;
    }

    showToast(
        "Изображения сохранены.",
        "success"
    );

    renderHeader();
    renderSettingsImages();
}


/* =========================================================
   LEAVE GUILD
========================================================= */

async function leaveGuild() {
    if (!state.isMember) {
        return;
    }

    if (state.isLeader) {
        showToast(
            "Лидер не может просто выйти из гильдии. Сначала передайте лидерство.",
            "warning"
        );

        return;
    }

    const confirmed =
        await askConfirm(
            "Выйти из гильдии",
            "Вы действительно хотите покинуть гильдию?"
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase.rpc(
        "leave_guild",
        {
            p_guild_id: state.guildId
        }
    );

    if (error) {
        console.error(
            "Ошибка выхода из гильдии:",
            error
        );

        showToast(
            `Не удалось выйти из гильдии: ${error.message}`,
            "error"
        );

        return;
    }

    showToast(
        "Вы вышли из гильдии.",
        "success"
    );

    setTimeout(() => {
        window.location.href =
            `game.html?id=${encodeURIComponent(
                state.gameId
            )}`;
    }, 700);
}


/* =========================================================
   OPEN RELATION MODAL
========================================================= */

function prepareRelationModal() {
    const select =
        $("#relation-guild");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Выберите гильдию
        </option>
    `;

    state.otherGuilds.forEach((guild) => {
        const option =
            document.createElement("option");

        option.value = guild.id;

        option.textContent =
            guild.tag
                ? `${guild.name} [${guild.tag}]`
                : guild.name;

        select.appendChild(option);
    });
}


/* =========================================================
   FILE EXTENSION
========================================================= */

function getFileExtension(fileName) {
    if (!fileName) {
        return "";
    }

    const lastDot =
        fileName.lastIndexOf(".");

    if (lastDot === -1) {
        return "";
    }

    return fileName
        .substring(lastDot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupNavigation() {
    $$(".nav-item").forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                const section =
                    button.dataset.section;

                if (section) {
                    switchSection(section);
                }
            }
        );
    });
}


function setupHeader() {
    const backButton =
        $("#back-button");

    if (backButton) {
        backButton.addEventListener(
            "click",
            () => {
                if (state.gameId) {
                    window.location.href =
                        `game.html?id=${encodeURIComponent(
                            state.gameId
                        )}`;
                } else {
                    window.location.href =
                        "index.html";
                }
            }
        );
    }

    const logoutButton =
        $("#logout-button");

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logout
        );
    }
}


function setupForms() {
    $("#news-form")?.addEventListener(
        "submit",
        createNews
    );

    $("#gallery-form")?.addEventListener(
        "submit",
        uploadGallery
    );

    $("#document-form")?.addEventListener(
        "submit",
        uploadDocument
    );

    $("#application-form")?.addEventListener(
        "submit",
        submitApplication
    );

    $("#relation-form")?.addEventListener(
        "submit",
        createRelation
    );

    $("#guild-settings-form")?.addEventListener(
        "submit",
        saveGuildSettings
    );
}


function setupButtons() {
    $("#create-news-button")?.addEventListener(
        "click",
        () => {
            if (!state.canManage) {
                return;
            }

            $("#news-form")?.reset();

            openModal("news-modal");
        }
    );


    $("#upload-gallery-button")?.addEventListener(
        "click",
        () => {
            if (!state.canManage) {
                return;
            }

            $("#gallery-form")?.reset();

            openModal("gallery-modal");
        }
    );


    $("#upload-document-button")?.addEventListener(
        "click",
        () => {
            if (!state.canManage) {
                return;
            }

            $("#document-form")?.reset();

            openModal("document-modal");
        }
    );


    $("#create-relation-button")?.addEventListener(
        "click",
        () => {
            if (
                !state.isLeader &&
                !state.isDiplomat
            ) {
                return;
            }

            prepareRelationModal();

            openModal("relation-modal");
        }
    );


    $("#edit-about-button")?.addEventListener(
        "click",
        () => {
            if (!state.isLeader) {
                return;
            }

            switchSection("settings");
        }
    );


    $("#save-image-settings-button")?.addEventListener(
        "click",
        saveImageSettings
    );


    $("#leave-guild-button")?.addEventListener(
        "click",
        leaveGuild
    );
}


function setupModalButtons() {
    $$("[data-close-modal]").forEach(
        (button) => {
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


    $$(".modal-overlay").forEach(
        (overlay) => {
            overlay.addEventListener(
                "click",
                () => {
                    const modal =
                        overlay.closest(".modal");

                    if (modal) {
                        closeModal(
                            modal.id
                        );
                    }
                }
            );
        }
    );


    $("#confirm-cancel")?.addEventListener(
        "click",
        () => {
            resolveConfirm(false);
        }
    );


    $("#confirm-ok")?.addEventListener(
        "click",
        () => {
            resolveConfirm(true);
        }
    );
}


function setupDynamicEvents() {
    document.addEventListener(
        "click",
        async (event) => {
            const deleteNewsButton =
                event.target.closest(
                    ".delete-news-button"
                );

            if (deleteNewsButton) {
                await deleteNews(
                    deleteNewsButton.dataset.id
                );

                return;
            }


            const deleteGalleryButton =
                event.target.closest(
                    ".delete-gallery-button"
                );

            if (deleteGalleryButton) {
                await deleteGalleryItem(
                    deleteGalleryButton.dataset.id
                );

                return;
            }


            const deleteDocumentButton =
                event.target.closest(
                    ".delete-document-button"
                );

            if (deleteDocumentButton) {
                await deleteDocument(
                    deleteDocumentButton.dataset.id
                );

                return;
            }


            const openDocumentButton =
                event.target.closest(
                    ".open-document-button"
                );

            if (openDocumentButton) {
                await openDocument(
                    openDocumentButton.dataset.path
                );

                return;
            }


            const acceptApplicationButton =
                event.target.closest(
                    ".accept-application-button"
                );

            if (acceptApplicationButton) {
                await acceptApplication(
                    acceptApplicationButton.dataset.id
                );

                return;
            }


            const rejectApplicationButton =
                event.target.closest(
                    ".reject-application-button"
                );

            if (rejectApplicationButton) {
                await rejectApplication(
                    rejectApplicationButton.dataset.id
                );

                return;
            }


            const acceptRelationButton =
                event.target.closest(
                    ".accept-relation-button"
                );

            if (acceptRelationButton) {
                await acceptRelation(
                    acceptRelationButton.dataset.id
                );

                return;
            }


            const rejectRelationButton =
                event.target.closest(
                    ".reject-relation-button"
                );

            if (rejectRelationButton) {
                await rejectRelation(
                    rejectRelationButton.dataset.id
                );

                return;
            }


            const terminateRelationButton =
                event.target.closest(
                    ".terminate-relation-button"
                );

            if (terminateRelationButton) {
                await terminateRelation(
                    terminateRelationButton.dataset.id
                );

                return;
            }
        }
    );
}


/* =========================================================
   AUTH STATE
========================================================= */

function setupAuthListener() {
    supabase.auth.onAuthStateChange(
        async (event, session) => {
            if (event === "SIGNED_OUT") {
                window.location.href =
                    "index.html";

                return;
            }

            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {
                state.user =
                    session.user;

                await loadCurrentProfile();
                await loadCurrentGameProfile();
                await loadCurrentMembership();

                await Promise.all([
                    loadMembers(),
                    loadNews(),
                    loadGallery(),
                    loadDocuments(),
                    loadRelations()
                ]);

                await loadApplications();

                renderEverything();
            }
        }
    );
}


/* =========================================================
   ERROR SCREEN
========================================================= */

function showFatalError(message) {
    const app =
        $("#app");

    if (!app) {
        return;
    }

    app.innerHTML = `
        <div style="
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:30px;
        ">

            <div style="
                width:min(650px,100%);
                padding:30px;
                background:#ffffff;
                border:1px solid #e1e5ea;
                border-radius:18px;
                box-shadow:0 18px 60px rgba(28,36,48,.12);
            ">

                <h2 style="
                    margin:0 0 12px;
                    color:#d84b4b;
                ">
                    Не удалось открыть гильдию
                </h2>

                <p style="
                    margin:0 0 20px;
                    color:#6b7280;
                    line-height:1.6;
                ">
                    ${escapeHtml(message)}
                </p>

                <button
                    type="button"
                    id="fatal-back-button"
                    style="
                        min-height:42px;
                        padding:0 18px;
                        border:0;
                        border-radius:10px;
                        background:#2677e8;
                        color:#fff;
                        font-weight:600;
                        cursor:pointer;
                    "
                >
                    Вернуться к игре
                </button>

            </div>

        </div>
    `;

    $("#fatal-back-button")?.addEventListener(
        "click",
        () => {
            if (state.gameId) {
                window.location.href =
                    `game.html?id=${encodeURIComponent(
                        state.gameId
                    )}`;
            } else {
                window.location.href =
                    "index.html";
            }
        }
    );
}


/* =========================================================
   INIT
========================================================= */

async function init() {
    state.guildId =
        getGuildIdFromUrl();

    if (!state.guildId) {
        showFatalError(
            "В адресе страницы не указан ID гильдии."
        );

        return;
    }

    setupNavigation();
    setupHeader();
    setupForms();
    setupButtons();
    setupModalButtons();
    setupDynamicEvents();
    setupAuthListener();

    try {
        await loadAllData();
    } catch (error) {
        console.error(
            "Ошибка запуска страницы гильдии:",
            error
        );

        showFatalError(
            error?.message ||
            "Произошла неизвестная ошибка."
        );
    }
}


/* =========================================================
   GLOBAL API
========================================================= */

window.GuildHub = {
    supabase,
    state,

    reload: async () => {
        await loadAllData();
    },

    switchSection,

    loadGuild,
    loadMembers,
    loadNews,
    loadGallery,
    loadDocuments,
    loadRelations,

    logout
};


/* =========================================================
   START
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        init
    );
} else {
    init();
}
```

})();
