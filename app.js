/* =====================================================
   GAME PLATFORM — app.js (FULL)
   Auth + Profile + Chat + Conference + Online
   + Games + Guilds (overlay, roles, materials) + Templates
===================================================== */

const SUPABASE_URL = "https://uvzaoobtysostmfwyfxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";
const MIROTALK_BASE = "https://p2p.mirotalk.com";
const IMG_LOAD_TIMEOUT = 8000;

/* ============================================================
   СОСТОЯНИЕ
============================================================ */
let currentUser = null;
let currentProfile = null;
let availableColumns = null;
let chatChannel = null;

let currentRoom = null;
let roomsPollTimer = null;
let joiningRoom = false;

let savingProfile = false;
let avatarPreviewTimer = null;

let presenceChannel = null;
let onlineUsers = {};

let guildsCache = [];
let guildMembersCache = {};
let currentGuildId = null;
let guildsAvailable = true;
let guildsGameIdAvailable = true;
let currentGameFilter = 0;
let currentGuildTab = "members";

let gamesCache = [];
let gamesAvailable = true;
let gameIconTimer = null;

let templatesCache = [];
let templatesAvailable = true;

/* ============================================================
   ХЕЛПЕРЫ
============================================================ */
function $(id){ return document.getElementById(id); }
function log(...a){ console.log("[GP]", ...a); }
function errLog(...a){ console.error("[GP][ОШИБКА]", ...a); }

function escapeHtml(s){
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function setAuthMessage(t, ok){
    const el = $("auth-message"); if(!el) return;
    el.textContent = t || ""; el.classList.toggle("ok", !!ok);
}
function setText(id, t){ const el = $(id); if(el) el.textContent = t; }
function setRoomStatus(t, cls){
    const el = $("room-status"); if(!el) return;
    el.textContent = t || ""; el.className = "room-status" + (cls ? " " + cls : "");
}
function setProfileStatus(t, cls){
    const el = $("profile-status"); if(!el) return;
    el.textContent = t || ""; el.className = "profile-status" + (cls ? " " + cls : "");
}
function setAvatarHint(t, cls){
    const el = $("pf-avatar-hint"); if(!el) return;
    el.textContent = t || "Прямая ссылка на картинку (jpg, png, webp, gif).";
    el.className = "field-hint" + (cls ? " " + cls : "");
}
function setGameStatus(t, cls){
    const el = $("game-status"); if(!el) return;
    el.textContent = t || ""; el.className = "profile-status" + (cls ? " " + cls : "");
}
function setTplStatus(t, cls){
    const el = $("tpl-status"); if(!el) return;
    el.textContent = t || ""; el.className = "profile-status" + (cls ? " " + cls : "");
}
function switchPage(pageName){
    document.querySelectorAll(".menu-button").forEach(b => {
        b.classList.toggle("active", b.dataset.page === pageName);
    });
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = $(pageName);
    if(page) page.classList.add("active");
}
function isAdmin(){
    return !!(currentProfile && currentProfile.is_admin === true);
}

async function ensureAuth(){
    if(currentUser && currentUser.id) return currentUser;
    try{
        const { data } = await supabaseClient.auth.getUser();
        if(data && data.user){ currentUser = data.user; return currentUser; }
        const s = await supabaseClient.auth.getSession();
        if(s.data && s.data.session && s.data.session.user){
            currentUser = s.data.session.user; return currentUser;
        }
    }catch(e){ errLog("ensureAuth", e); }
    return null;
}

/* ============================================================
   URL / IMG утилиты
============================================================ */
function isValidHttpUrl(str){
    if(!str) return true;
    try{ const u = new URL(str); return u.protocol === "http:" || u.protocol === "https:"; }
    catch(e){ return false; }
}
function isValidNickname(str){
    const s = (str || "").trim();
    return s.length >= 2 && s.length <= 30;
}
function normalizeImageUrl(url){
    if(!url) return "";
    let s = url.trim(); if(!s) return "";
    const imgur = s.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)\/?$/);
    if(imgur) return "https://i.imgur.com/" + imgur[1] + ".jpg";
    const gyazo = s.match(/^https?:\/\/(?:www\.)?gyazo\.com\/([a-f0-9]+)\/?$/i);
    if(gyazo) return "https://i.gyazo.com/" + gyazo[1] + ".png";
    return s;
}
function faviconFromUrl(url){
    try{
        const u = new URL(url);
        return "https://www.google.com/s2/favicons?domain=" + u.hostname + "&sz=128";
    }catch(e){ return ""; }
}
function testImageUrl(url){
    return new Promise((resolve) => {
        if(!url || !isValidHttpUrl(url)) return resolve(false);
        const img = new Image();
        img.referrerPolicy = "no-referrer";
        let settled = false;
        const finish = (ok) => { if(settled) return; settled = true;
            img.onload = null; img.onerror = null; resolve(ok); };
        const timer = setTimeout(() => finish(false), IMG_LOAD_TIMEOUT);
        img.onload = () => { clearTimeout(timer); finish(img.naturalWidth > 0); };
        img.onerror = () => { clearTimeout(timer); finish(false); };
        const sep = url.includes("?") ? "&" : "?";
        img.src = url + sep + "_t=" + Date.now();
    });
}
function setImage(id, url){
    const el = $(id); if(!el) return;
    el.referrerPolicy = "no-referrer"; el.decoding = "async";
    const clean = normalizeImageUrl(url || "");
    if(!clean){ el.onerror = null; el.src = DEFAULT_AVATAR; return; }
    el.onerror = () => { errLog("AVATAR FAIL:", id, clean); el.onerror = null; el.src = DEFAULT_AVATAR; };
    el.src = clean;
}
function humanFileSize(bytes){
    if(bytes == null) return "";
    const n = Number(bytes);
    if(!isFinite(n) || n <= 0) return "";
    if(n < 1024) return n + " Б";
    if(n < 1024*1024) return (n/1024).toFixed(1) + " КБ";
    if(n < 1024*1024*1024) return (n/1024/1024).toFixed(1) + " МБ";
    return (n/1024/1024/1024).toFixed(2) + " ГБ";
}
function fileIconByName(name, type){
    const n = (name || "").toLowerCase();
    const t = (type || "").toLowerCase();
    if(t.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(n)) return "🖼";
    if(t.startsWith("video/") || /\.(mp4|webm|mov|avi|mkv)$/.test(n)) return "🎬";
    if(t.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a)$/.test(n)) return "🎵";
    if(/\.(zip|rar|7z|tar|gz)$/.test(n)) return "🗜";
    if(/\.(pdf)$/.test(n)) return "📕";
    if(/\.(doc|docx)$/.test(n)) return "📄";
    if(/\.(xls|xlsx|csv)$/.test(n)) return "📊";
    if(/\.(txt|md|log)$/.test(n)) return "📝";
    if(/\.(json|xml|yml|yaml|ini|cfg)$/.test(n)) return "⚙";
    return "📎";
}
function fileExt(name){
    const n = String(name || "");
    const m = n.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "bin";
}
function fileViewerKind(name, type){
    const n = (name || "").toLowerCase();
    const t = (type || "").toLowerCase();
    if(t.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(n)) return "image";
    if(t.startsWith("video/") || /\.(mp4|webm|mov|ogv)$/.test(n)) return "video";
    if(t.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a)$/.test(n)) return "audio";
    if(t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
    return "other";
}

/* ============================================================
   СХЕМА profiles
============================================================ */
async function detectProfileColumns(userId){
    const wanted = ["id","nickname","avatar_url","vip_level","age","city","about","is_admin"];
    const available = new Set(["id"]);
    const trySel = async (cols) => {
        const { data, error } = await supabaseClient
            .from("profiles").select(cols).eq("id", userId).maybeSingle();
        return { data, error };
    };
    let result = await trySel(wanted.join(","));
    if(!result.error){
        wanted.forEach(c => available.add(c));
        return { columns: available, row: result.data };
    }
    for(const col of wanted){
        if(col === "id") continue;
        const t = await trySel("id," + col);
        if(!t.error) available.add(col);
    }
    const cols = wanted.filter(c => available.has(c)).join(",");
    result = await trySel(cols);
    return { columns: available, row: result.data };
}

function applySchemaVisibility(){
    if(!availableColumns) return;
    const has = (c) => availableColumns.has(c);
    if($("field-avatar")) $("field-avatar").classList.toggle("hidden", !has("avatar_url"));
    if($("field-city"))   $("field-city").classList.toggle("hidden", !has("city"));
    if($("field-age"))    $("field-age").classList.toggle("hidden", !has("age"));
    if($("field-about"))  $("field-about").classList.toggle("hidden", !has("about"));
    const row = $("field-row-city-age");
    if(row) row.classList.toggle("hidden", !(has("city") || has("age")));
    const warn = $("schema-warning");
    if(warn){
        const missing = [];
        if(!has("about"))    missing.push("about");
        if(!has("city"))     missing.push("city");
        if(!has("age"))      missing.push("age");
        if(!has("is_admin")) missing.push("is_admin");
        if(missing.length){
            warn.classList.remove("hidden");
            warn.innerHTML = "⚠️ В <code>profiles</code> отсутствуют колонки: <b>" +
                missing.join(", ") + "</b>.<br>Функционал ограничен.";
        } else warn.classList.add("hidden");
    }
}

/* ============================================================
   СТАРТ
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    log("START");

    initAuth();
    initNavigation();
    initChat();
    initConference();
    initProfileForm();
    initGames();
    initGuilds();
    initGuildOverlay();
    initFileViewer();
    initTemplates();

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if(event === "SIGNED_OUT") currentUser = null;
        else if(session && session.user) currentUser = session.user;
    });

    checkSession();
});

/* ============================================================
   АВТОРИЗАЦИЯ
============================================================ */
function initAuth(){
    const loginTab = $("login-tab"), registerTab = $("register-tab");

    if(loginTab) loginTab.onclick = () => {
        loginTab.classList.add("active");
        if(registerTab) registerTab.classList.remove("active");
        $("login-form").classList.remove("hidden");
        $("register-form").classList.add("hidden");
        setAuthMessage("");
    };
    if(registerTab) registerTab.onclick = () => {
        registerTab.classList.add("active");
        if(loginTab) loginTab.classList.remove("active");
        $("register-form").classList.remove("hidden");
        $("login-form").classList.add("hidden");
        setAuthMessage("");
    };

    const loginForm = $("login-form");
    if(loginForm){
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); e.stopPropagation();
            setAuthMessage("Вход…", true);
            const email = $("login-email").value.trim();
            const password = $("login-password").value;
            if(!email || !password){ setAuthMessage("Заполните email и пароль", "err"); return; }
            try{
                const r = await supabaseClient.auth.signInWithPassword({ email, password });
                if(r.error){
                    errLog("LOGIN", r.error.message);
                    setAuthMessage(r.error.message);
                    return;
                }
                currentUser = r.data.user;
                setAuthMessage("");
                openApp();
            }catch(err){
                errLog("LOGIN EXC", err);
                setAuthMessage("Ошибка: " + err.message);
            }
        });
    }

    const registerForm = $("register-form");
    if(registerForm){
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault(); e.stopPropagation();
            setAuthMessage("Регистрация…", true);
            const nickname = $("register-nickname").value.trim() || "Player";
            const email = $("register-email").value.trim();
            const password = $("register-password").value;
            if(!email || !password){ setAuthMessage("Заполните все поля", "err"); return; }
            try{
                const r = await supabaseClient.auth.signUp({
                    email, password, options:{ data:{ nickname } }
                });
                if(r.error){ setAuthMessage(r.error.message); return; }
                const user = r.data.user;
                if(!user){ setAuthMessage("Проверьте email.", true); return; }
                try{
                    await supabaseClient.from("profiles").insert({
                        id: user.id, nickname,
                        avatar_url: DEFAULT_AVATAR, vip_level: 0
                    });
                }catch(err){ errLog("PROFILE CREATE", err); }
                if(!r.data.session){
                    setAuthMessage("Регистрация успешна. Подтвердите email.", true);
                    if(loginTab) loginTab.click();
                    return;
                }
                currentUser = user; setAuthMessage(""); openApp();
            }catch(err){
                errLog("REGISTER EXC", err);
                setAuthMessage("Ошибка: " + err.message);
            }
        });
    }

    const logout = $("logout");
    if(logout){
        logout.onclick = async () => {
            try{
                if(presenceChannel){
                    try{ await presenceChannel.untrack(); }catch(e){}
                    try{ supabaseClient.removeChannel(presenceChannel); }catch(e){}
                    presenceChannel = null;
                }
                closeMiroTalkRoom();
                await supabaseClient.auth.signOut();
                location.reload();
            }catch(e){ location.reload(); }
        };
    }
}

async function checkSession(){
    try{
        const { data } = await supabaseClient.auth.getSession();
        if(data.session && data.session.user){
            currentUser = data.session.user;
            openApp();
        }
    }catch(e){ errLog("SESSION", e); }
}

/* ============================================================
   ОТКРЫТИЕ ПРИЛОЖЕНИЯ
============================================================ */
async function openApp(){
    $("auth-screen").classList.add("hidden");
    $("app").classList.remove("hidden");

    if(currentUser){
        try{
            await supabaseClient.from("conference_users").delete().eq("user_id", currentUser.id);
        }catch(e){}
    }

    await safeRun(loadProfile);
    await safeRun(loadNews);
    await safeRun(loadMessages);
    await safeRun(loadHomeRecentMessages);
    await safeRun(loadHomeStats);
    await safeRun(loadGames);
    await safeRun(loadGuilds);
    await safeRun(loadTemplates);

    startChatRealtime();
    initOnlinePresence();

    await safeRun(loadRooms);

    if(roomsPollTimer) clearInterval(roomsPollTimer);
    roomsPollTimer = setInterval(() => loadRooms().catch(e => errLog(e)), 5000);
}
async function safeRun(fn){ try{ await fn(); } catch(e){ errLog(fn.name, e); } }

/* ============================================================
   НАВИГАЦИЯ
============================================================ */
function initNavigation(){
    const buttons = document.querySelectorAll(".menu-button[data-page]");
    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
            const page = $(btn.dataset.page);
            if(page) page.classList.add("active");

            const p = btn.dataset.page;
            if(p === "conference") loadRooms().catch(e => errLog(e));
            if(p === "chat") loadMessages().catch(e => errLog(e));
            if(p === "profile") loadProfile().catch(e => errLog(e));
            if(p === "home"){ loadHomeStats().catch(e => errLog(e)); loadHomeRecentMessages().catch(e => errLog(e)); }
            if(p === "games") loadGames().catch(e => errLog(e));
            if(p === "guilds") loadGuilds().catch(e => errLog(e));
            if(p === "templates") loadTemplates().catch(e => errLog(e));
            if(p === "online") renderOnlinePage();
        };
    });
}

/* ============================================================
   ONLINE PRESENCE
============================================================ */
function initOnlinePresence(){
    if(!currentUser || presenceChannel) return;
    presenceChannel = supabaseClient.channel("online-users", {
        config: { presence: { key: currentUser.id } }
    });
    presenceChannel
        .on("presence", { event: "sync" }, () => {
            buildOnlineUsers(presenceChannel.presenceState());
            updateOnlineCounters();
            renderOnlinePage();
        })
        .subscribe(async (status) => {
            if(status === "SUBSCRIBED"){
                await presenceChannel.track({
                    user_id: currentUser.id,
                    nickname: currentProfile?.nickname || "Player",
                    avatar_url: currentProfile?.avatar_url || DEFAULT_AVATAR,
                    online_at: new Date().toISOString()
                });
            }
        });
}
function buildOnlineUsers(state){
    onlineUsers = {};
    Object.keys(state).forEach(key => {
        (state[key] || []).forEach(item => {
            if(item && item.user_id) onlineUsers[item.user_id] = item;
        });
    });
}
function updateOnlineCounters(){
    const count = Object.keys(onlineUsers).length;
    setText("online-count", String(count));
    setText("dash-online", String(count));
}
function renderOnlinePage(){
    const box = $("online-list-page"); if(!box) return;
    const list = Object.values(onlineUsers);
    setText("online-page-count", String(list.length));
    if(list.length === 0){
        box.innerHTML = "<div class='dash-recent-empty'>Никого нет онлайн</div>";
        return;
    }
    box.innerHTML = "";
    list.sort((a,b) => (a.nickname||"").localeCompare(b.nickname||""));
    list.forEach(u => {
        const div = document.createElement("div");
        div.className = "online-user-card";
        const nick = u.nickname || "Player";
        const isMe = u.user_id === currentUser.id;
        const initial = nick[0].toUpperCase();
        div.innerHTML =
            "<div class='online-user-avatar'>" +
                (u.avatar_url ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(u.avatar_url) + "'>" : escapeHtml(initial)) +
            "</div><div>" +
                "<div class='online-user-name'>" + escapeHtml(nick) + (isMe ? " (вы)" : "") + "</div>" +
                "<div class='online-user-meta'>🟢 в сети</div>" +
            "</div>";
        box.appendChild(div);
    });
}

/* ============================================================
   ГЛАВНАЯ
============================================================ */
async function loadHomeStats(){
    updateOnlineCounters();
    try{
        const { data } = await supabaseClient.from("conference_rooms").select("id");
        setText("dash-rooms", String((data || []).length));
    }catch(e){ setText("dash-rooms", "—"); }
    try{
        const { count } = await supabaseClient.from("messages").select("*", { count:"exact", head:true });
        setText("dash-messages", String(count || 0));
    }catch(e){ setText("dash-messages", "—"); }
    try{
        const { count } = await supabaseClient.from("templates").select("*", { count:"exact", head:true });
        setText("dash-templates", String(count || 0));
    }catch(e){ setText("dash-templates", "—"); }
}
async function loadHomeRecentMessages(){
    const box = $("home-recent-messages"); if(!box) return;
    const { data, error } = await supabaseClient
        .from("messages").select("nickname, text, created_at")
        .order("created_at", { ascending:false }).limit(8);
    if(error || !data || data.length === 0){
        box.innerHTML = "<div class='dash-recent-empty'>Сообщений пока нет</div>";
        return;
    }
    box.innerHTML = "";
    data.forEach(m => {
        const div = document.createElement("div");
        div.className = "dash-recent-item";
        const time = m.created_at ? new Date(m.created_at).toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" }) : "";
        const text = (m.text||"").slice(0, 90) + ((m.text||"").length > 90 ? "…" : "");
        div.innerHTML = "<b>" + escapeHtml(m.nickname || "Гость") + "</b>" +
            "<span class='dash-recent-time'>" + escapeHtml(time) + "</span>" +
            "<div>" + escapeHtml(text) + "</div>";
        box.appendChild(div);
    });
}

/* ============================================================
   ИГРЫ
============================================================ */
function initGames(){
    const toggleBtn = $("toggle-add-game");
    const cancelBtn = $("cancel-game-btn");
    const saveBtn = $("save-game-btn");
    const urlInput = $("game-url-input");
    const iconInput = $("game-icon-input");

    if(toggleBtn) toggleBtn.onclick = () => {
        const panel = $("add-game-panel"); if(!panel) return;
        panel.classList.toggle("hidden");
        if(!panel.classList.contains("hidden")) $("game-name-input")?.focus();
    };
    if(cancelBtn) cancelBtn.onclick = () => closeAddGameForm();
    if(saveBtn) saveBtn.onclick = saveNewGame;
    if(urlInput) urlInput.addEventListener("input", () => {
        if(gameIconTimer) clearTimeout(gameIconTimer);
        gameIconTimer = setTimeout(previewGameIcon, 400);
    });
    if(iconInput) iconInput.addEventListener("input", () => {
        if(gameIconTimer) clearTimeout(gameIconTimer);
        gameIconTimer = setTimeout(previewGameIcon, 400);
    });
}
function closeAddGameForm(){
    const panel = $("add-game-panel"); if(panel) panel.classList.add("hidden");
    ["game-name-input","game-url-input","game-desc-input","game-icon-input"].forEach(id => {
        const el = $(id); if(el) el.value = "";
    });
    setGameStatus("");
    resetGamePreview();
}
function resetGamePreview(){
    const wrap = $("game-icon-preview-wrap");
    const text = $("game-icon-preview-text");
    if(wrap) wrap.innerHTML = "<span>🎮</span>";
    if(text){ text.textContent = "Превью иконки появится здесь"; text.className = "game-icon-preview-text"; }
}
function renderGamePreviewIcon(url){
    const wrap = $("game-icon-preview-wrap"); if(!wrap) return;
    wrap.innerHTML = "";
    if(!url){ wrap.innerHTML = "<span>🎮</span>"; return; }
    const img = document.createElement("img");
    img.referrerPolicy = "no-referrer"; img.alt = "";
    img.onerror = () => { wrap.innerHTML = "<span>🎮</span>"; };
    img.src = url;
    wrap.appendChild(img);
}
function previewGameIcon(){
    const urlInput = $("game-url-input"), iconInput = $("game-icon-input"), text = $("game-icon-preview-text");
    if(!urlInput || !text) return;
    const siteUrl = (urlInput.value || "").trim();
    const customIcon = (iconInput?.value || "").trim();
    if(!siteUrl && !customIcon){ resetGamePreview(); return; }
    if(!isValidHttpUrl(siteUrl) && siteUrl){
        text.textContent = "Некорректная ссылка на сайт";
        text.className = "game-icon-preview-text err";
        renderGamePreviewIcon("");
        return;
    }
    if(customIcon && isValidHttpUrl(customIcon)){
        text.textContent = "Своя иконка";
        text.className = "game-icon-preview-text ok";
        renderGamePreviewIcon(customIcon);
        return;
    }
    const fav = faviconFromUrl(siteUrl);
    if(!fav){
        text.textContent = "Не удалось определить сайт";
        text.className = "game-icon-preview-text err";
        renderGamePreviewIcon("");
        return;
    }
    text.textContent = "Иконка подтянута с сайта";
    text.className = "game-icon-preview-text ok";
    renderGamePreviewIcon(fav);
}
async function loadGames(){
    const box = $("games-list"); if(!box) return;
    const { data, error } = await supabaseClient.from("games").select("*")
        .order("created_at", { ascending: false });
    if(error){
        gamesAvailable = false;
        box.innerHTML = "<div class='dash-recent-empty'>Раздел требует таблицы <code>games</code>.</div>";
        return;
    }
    gamesAvailable = true;
    gamesCache = data || [];

    const guildCounts = {};
    try{
        const gRes = await supabaseClient.from("guilds").select("game_id");
        (gRes.data || []).forEach(g => { if(g.game_id) guildCounts[g.game_id] = (guildCounts[g.game_id]||0) + 1; });
    }catch(e){}

    if(gamesCache.length === 0){
        box.innerHTML = "<div class='dash-recent-empty'>Игр пока нет. Добавьте первую!</div>";
        return;
    }
    box.innerHTML = "";
    gamesCache.forEach(g => {
        const card = document.createElement("div");
        card.className = "game-card";
        const guildCount = guildCounts[g.id] || 0;
        const icon = g.icon_url || faviconFromUrl(g.url) || "";

        card.innerHTML =
            "<div class='game-card-header'><div class='game-card-icon'>" +
            (icon ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(icon) + "' onerror=\"this.style.display='none';this.parentNode.textContent='🎮'\">" : "🎮") +
            "</div><div class='game-card-title'>" + escapeHtml(g.name) + "</div></div>" +
            "<div class='game-card-desc'>" + escapeHtml(g.description || "Без описания") + "</div>" +
            "<div class='game-card-actions'></div>";
        const actions = card.querySelector(".game-card-actions");
        const openBtn = document.createElement("button");
        openBtn.className = "main-button"; openBtn.type = "button"; openBtn.textContent = "🌐 Сайт";
        openBtn.onclick = () => window.open(g.url, "_blank", "noopener");
        actions.appendChild(openBtn);

        const guildBtn = document.createElement("button");
        guildBtn.className = "main-button"; guildBtn.type = "button";
        guildBtn.textContent = "⚔ " + (guildCount ? "Гильдии (" + guildCount + ")" : "Создать гильдию");
        guildBtn.onclick = () => {
            currentGameFilter = g.id;
            switchPage("guilds");
            loadGuilds().catch(e => errLog(e));
        };
        actions.appendChild(guildBtn);

        if(isAdmin()){
            const del = document.createElement("button");
            del.className = "game-delete"; del.type = "button";
            del.title = "Удалить (только админ)"; del.textContent = "×";
            del.onclick = (e) => { e.stopPropagation(); deleteGame(g.id, g.name); };
            card.appendChild(del);
        }
        box.appendChild(card);
    });
}
async function saveNewGame(){
    const user = await ensureAuth();
    if(!user){ setGameStatus("Нет авторизации", "err"); return; }
    if(!gamesAvailable){ setGameStatus("Таблица games не создана", "err"); return; }
    const name = ($("game-name-input").value || "").trim();
    const url = ($("game-url-input").value || "").trim();
    const description = ($("game-desc-input").value || "").trim();
    const customIcon = ($("game-icon-input").value || "").trim();
    if(!name || name.length < 2){ setGameStatus("Название: минимум 2 символа", "err"); return; }
    if(!isValidHttpUrl(url) || !url){ setGameStatus("Ссылка на сайт некорректна", "err"); return; }
    if(customIcon && !isValidHttpUrl(customIcon)){ setGameStatus("Ссылка на иконку некорректна", "err"); return; }

    const iconUrl = customIcon || faviconFromUrl(url);
    setGameStatus("Сохранение…", "loading");
    const ins = await supabaseClient.from("games").insert({
        name, description: description || null, url, icon_url: iconUrl, added_by: user.id
    }).select().single();
    if(ins.error){ setGameStatus("Ошибка: " + ins.error.message, "err"); return; }
    setGameStatus("Игра добавлена ✓");
    setTimeout(() => setGameStatus(""), 1500);
    closeAddGameForm();
    await loadGames();
    populateGuildGameSelect();
    renderGuildGameFilter();
}
async function deleteGame(id, name){
    if(!isAdmin()){
        alert("Удалять игры может только администратор сайта.");
        return;
    }
    if(!confirm("Удалить игру «" + name + "»?")) return;
    const del = await supabaseClient.from("games").delete().eq("id", id);
    if(del.error){
        if(/row-level security|policy/i.test(del.error.message || "")){
            alert("Удаление запрещено политикой безопасности Supabase.");
        } else {
            alert("Ошибка: " + del.error.message);
        }
        return;
    }
    if(currentGameFilter === id) currentGameFilter = 0;
    await loadGames();
    await loadGuilds();
    populateGuildGameSelect();
    renderGuildGameFilter();
}

/* ============================================================
   ГИЛЬДИИ
============================================================ */
function initGuilds(){
    const toggle = $("guild-create-toggle");
    const cancel = $("guild-create-cancel");
    const create = $("guild-create-btn");

    if(toggle) toggle.onclick = () => {
        const panel = $("guild-create-panel"); if(!panel) return;
        panel.classList.toggle("hidden");
        if(!panel.classList.contains("hidden")) $("guild-name-input")?.focus();
    };
    if(cancel) cancel.onclick = () => {
        const panel = $("guild-create-panel"); if(panel) panel.classList.add("hidden");
    };
    if(create) create.onclick = createGuild;
}

function initGuildOverlay(){
    const back = $("guild-overlay-back");
    if(back) back.onclick = () => closeGuildOverlay();
    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
            if($("file-viewer") && !$("file-viewer").classList.contains("hidden")) closeFileViewer();
            else if($("template-viewer") && !$("template-viewer").classList.contains("hidden")) closeTemplateViewer();
            else if($("guild-overlay") && !$("guild-overlay").classList.contains("hidden")) closeGuildOverlay();
        }
    });
}

function openGuildOverlay(){
    const el = $("guild-overlay");
    if(el) el.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}
function closeGuildOverlay(){
    const el = $("guild-overlay");
    if(el) el.classList.add("hidden");
    document.body.style.overflow = "";
    currentGuildId = null;
}

function renderGuildGameFilter(){
    const box = $("guilds-game-filter"); if(!box) return;
    box.innerHTML = "";
    const allChip = document.createElement("div");
    allChip.className = "guild-filter-chip" + (currentGameFilter === 0 ? " active" : "");
    allChip.textContent = "Все игры";
    allChip.onclick = () => { currentGameFilter = 0; loadGuilds().catch(e => errLog(e)); };
    box.appendChild(allChip);

    gamesCache.forEach(g => {
        const chip = document.createElement("div");
        chip.className = "guild-filter-chip" + (currentGameFilter === g.id ? " active" : "");
        const icon = g.icon_url || faviconFromUrl(g.url);
        chip.innerHTML = (icon ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(icon) + "' onerror=\"this.style.display='none'\">" : "") +
            "<span>" + escapeHtml(g.name) + "</span>";
        chip.onclick = () => { currentGameFilter = g.id; loadGuilds().catch(e => errLog(e)); };
        box.appendChild(chip);
    });
}

function populateGuildGameSelect(){
    const sel = $("guild-game-select"); if(!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Выберите игру —</option>';
    gamesCache.forEach(g => {
        const opt = document.createElement("option");
        opt.value = String(g.id); opt.textContent = g.name;
        sel.appendChild(opt);
    });
    if(currentGameFilter > 0) sel.value = String(currentGameFilter);
    else if(current) sel.value = current;
}

async function loadGuilds(){
    const box = $("guilds-list"); if(!box) return;
    if(gamesCache.length === 0 && gamesAvailable) await loadGames();
    populateGuildGameSelect();
    renderGuildGameFilter();

    let query = supabaseClient.from("guilds").select("*");
    if(currentGameFilter > 0) query = query.eq("game_id", currentGameFilter);
    let { data, error } = await query.order("created_at", { ascending: false });

    if(error && /column.*game_id.*does not exist/i.test(error.message || "")){
        guildsGameIdAvailable = false;
        const fb = await supabaseClient.from("guilds").select("*").order("created_at", { ascending: false });
        data = fb.data; error = fb.error;
    } else guildsGameIdAvailable = true;

    if(error){
        guildsAvailable = false;
        box.innerHTML = "<div class='dash-recent-empty'>Раздел требует таблиц <code>guilds</code> и <code>guild_members</code>.</div>";
        return;
    }
    guildsAvailable = true;
    guildsCache = data || [];

    guildMembersCache = {};
    try{
        const { data: members } = await supabaseClient
            .from("guild_members").select("guild_id, user_id, nickname, role, status");
        (members || []).forEach(m => {
            if(!guildMembersCache[m.guild_id]) guildMembersCache[m.guild_id] = [];
            guildMembersCache[m.guild_id].push(m);
        });
    }catch(e){ errLog("GUILD MEMBERS", e); }

    if(guildsCache.length === 0){
        const msg = currentGameFilter > 0 ? "В этой игре пока нет гильдий." : "Гильдий пока нет. Создайте первую!";
        box.innerHTML = "<div class='dash-recent-empty'>" + msg + "</div>";
        return;
    }

    box.innerHTML = "";
    guildsCache.forEach(g => {
        const members = guildMembersCache[g.id] || [];
        const my = members.find(m => m.user_id === currentUser.id);
        const approved = members.filter(m => m.status === "approved" || !m.status);
        const game = gamesCache.find(x => x.id === g.game_id);
        const icon = g.icon_url || (game ? (game.icon_url || faviconFromUrl(game.url)) : "");

        const card = document.createElement("div");
        card.className = "guild-card";
        card.innerHTML =
            "<div class='guild-card-icon'>" +
            (icon ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(icon) + "' onerror=\"this.style.display='none';this.parentNode.textContent='⚔'\">" : "⚔") +
            "</div>" +
            "<div class='guild-card-body'>" +
                "<h3>⚔ " + escapeHtml(g.name) + "</h3>" +
                "<p>" + escapeHtml(g.description || "Без описания") + "</p>" +
                "<div class='guild-meta'>" +
                    (game ? "<span class='guild-game-badge'>🎮 " + escapeHtml(game.name) + "</span>" : "") +
                    "<span>👥 " + approved.length + "</span>" +
                    (my && (my.status === "approved" || !my.status) ? "<span class='joined-badge'>Вы в гильдии</span>" : "") +
                    (my && my.status === "pending" ? "<span class='pending-badge'>Заявка на рассмотрении</span>" : "") +
                "</div>" +
            "</div>";
        card.onclick = () => openGuildOverlayFor(g.id);
        box.appendChild(card);
    });
}

async function createGuild(){
    const user = await ensureAuth();
    if(!user){ alert("Нет авторизации"); return; }
    if(!guildsAvailable){ alert("Таблицы гильдий не созданы"); return; }
    if(!guildsGameIdAvailable){
        alert("Колонка guilds.game_id отсутствует. Выполните SQL в Supabase.");
        return;
    }
    const gameId = parseInt($("guild-game-select").value, 10);
    const name = $("guild-name-input").value.trim();
    const description = $("guild-desc-input").value.trim();
    if(!gameId){ alert("Выберите игру"); return; }
    if(!name || name.length < 2){ alert("Название: минимум 2 символа"); return; }

    const ins = await supabaseClient.from("guilds").insert({
        name, description: description || null, owner_id: user.id, game_id: gameId
    }).select().single();
    if(ins.error){ alert("Ошибка: " + ins.error.message); return; }

    await supabaseClient.from("guild_members").insert({
        guild_id: ins.data.id,
        user_id: user.id,
        nickname: currentProfile?.nickname || "Player",
        role: "owner",
        status: "approved"
    });

    $("guild-name-input").value = "";
    $("guild-desc-input").value = "";
    $("guild-create-panel").classList.add("hidden");
    currentGuildTab = "members";
    await loadGuilds();
    await openGuildOverlayFor(ins.data.id);
}

function getMyMembership(guildId){
    const members = guildMembersCache[guildId] || [];
    return members.find(m => m.user_id === currentUser.id) || null;
}
function isManager(guildId){
    const my = getMyMembership(guildId);
    if(!my) return false;
    if(my.status && my.status !== "approved") return false;
    return my.role === "owner" || my.role === "deputy";
}
function isOwner(guildId){
    const my = getMyMembership(guildId);
    if(!my) return false;
    if(my.status && my.status !== "approved") return false;
    return my.role === "owner";
}

async function openGuildOverlayFor(guildId){
    currentGuildId = guildId;

    const guild = guildsCache.find(g => g.id === guildId);
    if(!guild) return;

    const members = guildMembersCache[guildId] || [];
    const my = getMyMembership(guildId);
    const amManager = isManager(guildId);
    const amOwner = isOwner(guildId);
    const game = gamesCache.find(x => x.id === guild.game_id);
    const icon = guild.icon_url || (game ? (game.icon_url || faviconFromUrl(game.url)) : "");

    setText("guild-overlay-header-title", "⚔ " + (guild.name || "Гильдия"));

    const headerActions = $("guild-overlay-header-actions");
    if(headerActions) headerActions.innerHTML = "";

    const heroActions = [];
    if(game){
        heroActions.push({
            label: "🌐 Сайт игры",
            cls: "main-button secondary",
            onClick: () => window.open(game.url, "_blank", "noopener")
        });
    }
    if(!my){
        heroActions.push({
            label: "✉️ Запросить вступление",
            cls: "main-button",
            onClick: () => requestJoinGuild(guildId)
        });
    } else if(my.status === "pending"){
        heroActions.push({
            label: "⏳ Заявка на рассмотрении",
            cls: "main-button secondary",
            disabled: true,
            onClick: () => {}
        });
        heroActions.push({
            label: "Отменить заявку",
            cls: "main-button danger",
            onClick: () => cancelJoinRequest(guildId)
        });
    } else if(amOwner){
        heroActions.push({
            label: "🗑 Распустить гильдию",
            cls: "main-button danger",
            onClick: () => dissolveGuild(guildId)
        });
    } else {
        heroActions.push({
            label: "Покинуть гильдию",
            cls: "main-button secondary",
            onClick: () => leaveGuild(guildId)
        });
    }

    let ownerNick = "—";
    if(guild.owner_id){
        const ownerMember = members.find(m => m.user_id === guild.owner_id);
        if(ownerMember) ownerNick = ownerMember.nickname || "—";
        else {
            const p = await supabaseClient.from("profiles").select("nickname")
                .eq("id", guild.owner_id).maybeSingle();
            if(p.data) ownerNick = p.data.nickname || "—";
        }
    }

    const approved = members.filter(m => m.status === "approved" || !m.status);
    const pending = members.filter(m => m.status === "pending");

    const body = $("guild-overlay-body");
    body.innerHTML = `
        <div class="guild-hero">
            <div class="guild-hero-icon" id="gd-icon">
                ${icon
                    ? `<img referrerpolicy="no-referrer" src="${escapeHtml(icon)}" onerror="this.style.display='none';this.parentNode.textContent='⚔'">`
                    : "⚔"}
                ${amManager ? `<button class="guild-hero-icon-edit" id="gd-icon-edit" type="button" title="Изменить иконку">✏️</button>` : ""}
                <input type="file" id="gd-icon-file" accept="image/*" hidden>
            </div>
            <div class="guild-hero-info">
                <h1>⚔ ${escapeHtml(guild.name)}</h1>
                <div class="guild-hero-meta">
                    ${game
                        ? `<span class="guild-game-badge">
                             <img referrerpolicy="no-referrer" src="${escapeHtml(game.icon_url || faviconFromUrl(game.url))}" onerror="this.style.display='none'">
                             🎮 ${escapeHtml(game.name)}
                           </span>`
                        : `<span class="guild-game-badge" style="background:#f8fafc;border-color:#e3e9f2;color:#98a2b5">🎮 Игра не привязана</span>`}
                    <span class="guild-game-badge" style="background:#dff5e1;color:#155724">👥 ${approved.length} участников</span>
                </div>
                <div class="guild-hero-desc">${escapeHtml(guild.description || "Без описания")}</div>
                <div class="guild-hero-desc" style="font-size:12.5px;color:#98a2b5">
                    Владелец: <b style="color:#b9830a">${escapeHtml(ownerNick)}</b>
                </div>
                <div class="guild-hero-actions" id="guild-hero-actions"></div>
            </div>
        </div>

        <div class="guild-tabs">
            <button class="guild-tab-btn ${currentGuildTab === "members" ? "active" : ""}" data-tab="members" type="button">
                👥 Участники (${approved.length})
            </button>
            <button class="guild-tab-btn ${currentGuildTab === "materials" ? "active" : ""}" data-tab="materials" type="button">
                📁 Материалы
            </button>
        </div>

        <div class="guild-tab-panel">
            <div class="guild-tab-content ${currentGuildTab === "members" ? "active" : ""}" id="guild-tab-members"></div>
            <div class="guild-tab-content ${currentGuildTab === "materials" ? "active" : ""}" id="guild-tab-materials"></div>
        </div>
    `;

    const heroActionsBox = $("guild-hero-actions");
    heroActions.forEach(a => {
        const btn = document.createElement("button");
        btn.className = a.cls; btn.type = "button";
        btn.textContent = a.label;
        if(a.disabled) btn.disabled = true;
        btn.onclick = a.onClick;
        heroActionsBox.appendChild(btn);
    });

    if(amManager){
        const edit = $("gd-icon-edit");
        const fileInput = $("gd-icon-file");
        if(edit && fileInput){
            edit.onclick = () => fileInput.click();
            fileInput.onchange = () => {
                const f = fileInput.files && fileInput.files[0];
                if(f) uploadGuildIcon(guildId, f);
            };
        }
    }

    body.querySelectorAll(".guild-tab-btn").forEach(btn => {
        btn.onclick = () => {
            const t = btn.dataset.tab;
            currentGuildTab = t;
            body.querySelectorAll(".guild-tab-btn").forEach(b =>
                b.classList.toggle("active", b.dataset.tab === t));
            body.querySelectorAll(".guild-tab-content").forEach(c =>
                c.classList.remove("active"));
            const target = $("guild-tab-" + t);
            if(target) target.classList.add("active");
        };
    });

    openGuildOverlay();
    renderMembersTab(guildId, approved, pending, amManager, amOwner);
    await renderMaterialsTab(guildId, amManager);
}

function renderMembersTab(guildId, approved, pending, amManager, amOwner){
    const box = $("guild-tab-members"); if(!box) return;
    box.innerHTML = "";

    if(pending.length > 0){
        const sec = document.createElement("div");
        sec.className = "guild-pending-section";
        sec.innerHTML = "<div class='guild-pending-title'>Заявки на вступление · " + pending.length + "</div>";
        pending.forEach(p => {
            const row = document.createElement("div");
            row.className = "guild-pending-item";
            row.innerHTML = "<div class='guild-pending-name'>" + escapeHtml(p.nickname || "Player") + "</div>";

            if(amManager){
                const approve = document.createElement("button");
                approve.className = "main-button"; approve.type = "button";
                approve.textContent = "✓ Принять";
                approve.onclick = () => approveMember(guildId, p.user_id);
                row.appendChild(approve);

                const reject = document.createElement("button");
                reject.className = "main-button danger"; reject.type = "button";
                reject.textContent = "× Отклонить";
                reject.onclick = () => rejectMember(guildId, p.user_id);
                row.appendChild(reject);
            } else {
                const wait = document.createElement("span");
                wait.style.cssText = "color:#8a6a10;font-size:12.5px;font-weight:700";
                wait.textContent = "Ожидает одобрения";
                row.appendChild(wait);
            }
            sec.appendChild(row);
        });
        box.appendChild(sec);
    }

    const list = document.createElement("div");
    list.className = "guild-members-list";

    const order = { owner: 0, deputy: 1, member: 2 };
    const sorted = approved.slice().sort((a,b) => (order[a.role]??9) - (order[b.role]??9));

    if(sorted.length === 0){
        list.innerHTML = "<div class='dash-recent-empty'>Пока никого</div>";
    }

    sorted.forEach(m => {
        const row = document.createElement("div");
        row.className = "guild-member-row";

        const initial = (m.nickname || "?")[0].toUpperCase();
        const roleLabel = m.role === "owner" ? "👑 Владелец" :
                          m.role === "deputy" ? "🛡 Заместитель" :
                          "Участник";
        const roleCls = m.role === "owner" ? "owner" :
                        m.role === "deputy" ? "deputy" : "member";

        row.innerHTML = `
            <div class="guild-member-avatar">${escapeHtml(initial)}</div>
            <div class="guild-member-info">
                <div class="guild-member-name">${escapeHtml(m.nickname || "Player")}${m.user_id === currentUser.id ? " (вы)" : ""}</div>
                <div class="guild-member-role ${roleCls}">${roleLabel}</div>
            </div>
            <div class="guild-member-actions"></div>
        `;

        const acts = row.querySelector(".guild-member-actions");
        const isMe = m.user_id === currentUser.id;

        if(amManager && !isMe){
            if(m.role === "member"){
                if(amOwner){
                    const promote = document.createElement("button");
                    promote.className = "main-button small"; promote.type = "button";
                    promote.textContent = "🛡 В замы";
                    promote.onclick = () => changeRole(guildId, m.user_id, "deputy");
                    acts.appendChild(promote);
                }
                const kick = document.createElement("button");
                kick.className = "main-button danger small"; kick.type = "button";
                kick.textContent = "Кикнуть";
                kick.onclick = () => kickMember(guildId, m.user_id, m.nickname);
                acts.appendChild(kick);
            } else if(m.role === "deputy" && amOwner){
                const demote = document.createElement("button");
                demote.className = "main-button secondary small"; demote.type = "button";
                demote.textContent = "Снять зама";
                demote.onclick = () => changeRole(guildId, m.user_id, "member");
                acts.appendChild(demote);

                const kick = document.createElement("button");
                kick.className = "main-button danger small"; kick.type = "button";
                kick.textContent = "Кикнуть";
                kick.onclick = () => kickMember(guildId, m.user_id, m.nickname);
                acts.appendChild(kick);
            }
        }

        if(amOwner && !isMe && m.role !== "owner"){
            const transfer = document.createElement("button");
            transfer.className = "main-button secondary small"; transfer.type = "button";
            transfer.textContent = "👑 Передать";
            transfer.title = "Передать владение";
            transfer.onclick = () => transferOwnership(guildId, m.user_id, m.nickname);
            acts.appendChild(transfer);
        }

        list.appendChild(row);
    });
    box.appendChild(list);
}

async function requestJoinGuild(guildId){
    const user = await ensureAuth();
    if(!user) return;
    const ins = await supabaseClient.from("guild_members").insert({
        guild_id: guildId, user_id: user.id,
        nickname: currentProfile?.nickname || "Player",
        role: "member", status: "pending"
    });
    if(ins.error){ alert("Ошибка: " + ins.error.message); return; }
    await loadGuilds();
    await openGuildOverlayFor(guildId);
}
async function cancelJoinRequest(guildId){
    const user = await ensureAuth();
    if(!user) return;
    await supabaseClient.from("guild_members").delete()
        .eq("guild_id", guildId).eq("user_id", user.id);
    await loadGuilds();
    await openGuildOverlayFor(guildId);
}
async function approveMember(guildId, userId){
    const up = await supabaseClient.from("guild_members")
        .update({ status: "approved" })
        .eq("guild_id", guildId).eq("user_id", userId);
    if(up.error){ alert("Ошибка: " + up.error.message); return; }
    await loadGuilds();
    await openGuildOverlayFor(guildId);
}
async function rejectMember(guildId, userId){
    if(!confirm("Отклонить заявку?")) return;
    const del = await supabaseClient.from("guild_members").delete()
        .eq("guild_id", guildId).eq("user_id", userId);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    await loadGuilds();
    await openGuildOverlayFor(guildId);
}
async function kickMember(guildId, userId, nickname){
    if(!confirm("Кикнуть " + (nickname || "участника") + "?")) return;
    const del = await supabaseClient.from("guild_members").delete()
        .eq("guild_id", guildId).eq("user_id", userId);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    await loadGuilds();
    await openGuildOverlayFor(guildId);
}
async function changeRole(guildId, userId, newRole){
    const up = await supabaseClient.from("guild_members")
        .update({ role: newRole })
        .eq("guild_id", guildId).eq("user_id", userId);
    if(up.error){ alert("Ошибка: " + up.error.message); return; }
    await loadGuilds();
    await openGuildOverlayFor(guildId);
}
async function transferOwnership(guildId, newOwnerId, nickname){
    if(!confirm("Передать владение " + (nickname || "игроку") + "?")) return;
    const user = await ensureAuth();
    if(!user) return;

    const up1 = await supabaseClient.from("guilds")
        .update({ owner_id: newOwnerId }).eq("id", guildId);
    if(up1.error){ alert("Ошибка: " + up1.error.message); return; }

    await supabaseClient.from("guild_members")
        .update({ role: "owner", status: "approved" })
        .eq("guild_id", guildId).eq("user_id", newOwnerId);

    await supabaseClient.from("guild_members")
        .update({ role: "deputy" })
        .eq("guild_id", guildId).eq("user_id", user.id);

    await loadGuilds();
    await openGuildOverlayFor(guildId);
}

async function dissolveGuild(guildId){
    const user = await ensureAuth();
    if(!user){ alert("Нет авторизации"); return; }
    if(!isOwner(guildId)){
        alert("Распустить гильдию может только её глава.");
        return;
    }
    const members = guildMembersCache[guildId] || [];
    const approved = members.filter(m => m.status === "approved" || !m.status);
    if(approved.length > 1){
        alert("Нельзя распустить гильдию, пока в ней есть другие участники.");
        return;
    }
    if(!confirm("Распустить гильдию со всеми материалами? Действие необратимо.")) return;

    try{
        const matsRes = await supabaseClient.from("guild_materials").select("file_path").eq("guild_id", guildId);
        const paths = (matsRes.data || []).map(m => m.file_path).filter(Boolean);
        if(paths.length > 0) await supabaseClient.storage.from("guild-files").remove(paths);
    }catch(e){ errLog("DISSOLVE STORAGE", e); }

    await supabaseClient.from("guild_materials").delete().eq("guild_id", guildId);
    await supabaseClient.from("guild_members").delete().eq("guild_id", guildId);
    const del = await supabaseClient.from("guilds").delete().eq("id", guildId);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }

    closeGuildOverlay();
    await loadGuilds();
    await loadGames();
}

async function leaveGuild(guildId){
    const user = await ensureAuth();
    if(!user) return;
    if(isOwner(guildId)){
        alert("Вы глава гильдии. Используйте «Распустить гильдию» или передайте владение.");
        return;
    }
    if(!confirm("Покинуть гильдию?")) return;
    const del = await supabaseClient.from("guild_members").delete()
        .eq("guild_id", guildId).eq("user_id", user.id);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    closeGuildOverlay();
    await loadGuilds();
    await loadGames();
}

async function uploadGuildIcon(guildId, file){
    const user = await ensureAuth();
    if(!user) return;
    if(!file.type.startsWith("image/")){ alert("Только изображения"); return; }
    if(file.size > 5 * 1024 * 1024){ alert("Файл больше 5 МБ"); return; }

    const ext = fileExt(file.name) || "png";
    const path = user.id + "/" + guildId + "-" + Date.now() + "." + ext;

    const iconWrap = $("gd-icon");
    if(iconWrap){
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = iconWrap.querySelector("img");
            if(img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    const up = await supabaseClient.storage
        .from("guild-icons").upload(path, file, { upsert: false, cacheControl: "3600" });
    if(up.error){ alert("Ошибка загрузки: " + up.error.message); return; }

    const { data: pub } = supabaseClient.storage.from("guild-icons").getPublicUrl(path);
    const upd = await supabaseClient.from("guilds").update({ icon_url: pub.publicUrl }).eq("id", guildId);
    if(upd.error){ alert("Ошибка сохранения: " + upd.error.message); return; }

    await loadGuilds();
    await openGuildOverlayFor(guildId);
}

async function renderMaterialsTab(guildId, amManager){
    const box = $("guild-tab-materials"); if(!box) return;
    box.innerHTML = "";

    if(amManager){
        const form = document.createElement("div");
        form.className = "material-upload-form";
        form.innerHTML = `
            <h3>📤 Загрузить материал</h3>
            <div class="material-form-row">
                <input id="mat-title" placeholder="Название (будет на кнопке)" maxlength="80">
                <input id="mat-desc" placeholder="Краткое описание (необязательно)" maxlength="200">
            </div>
            <label class="material-file-input">
                <span class="file-icon">📎</span>
                <span class="file-text" id="mat-file-text"><b>Выберите файл</b> или перетащите сюда</span>
                <input type="file" id="mat-file">
            </label>
            <div class="upload-progress hidden" id="mat-progress">
                <div class="upload-progress-bar" id="mat-progress-bar"></div>
            </div>
            <div class="profile-actions" style="margin-top:12px">
                <button class="main-button" id="mat-upload-btn" type="button">Загрузить</button>
            </div>
            <div class="profile-status" id="mat-status"></div>
        `;
        box.appendChild(form);

        const fileInput = $("mat-file");
        const fileText = $("mat-file-text");
        fileInput.onchange = () => {
            const f = fileInput.files[0];
            if(f) fileText.innerHTML = "<b>" + escapeHtml(f.name) + "</b> · " + humanFileSize(f.size);
            else fileText.innerHTML = "<b>Выберите файл</b> или перетащите сюда";
        };
        const dropZone = form.querySelector(".material-file-input");
        dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.style.background = "#eaf2ff"; });
        dropZone.addEventListener("dragleave", () => { dropZone.style.background = ""; });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault(); dropZone.style.background = "";
            const f = e.dataTransfer.files[0];
            if(f){
                fileInput.files = e.dataTransfer.files;
                fileText.innerHTML = "<b>" + escapeHtml(f.name) + "</b> · " + humanFileSize(f.size);
            }
        });
        $("mat-upload-btn").onclick = () => uploadMaterial(guildId);
    }

    const listWrap = document.createElement("div");
    listWrap.id = "materials-board";
    listWrap.className = "materials-board";
    listWrap.innerHTML = "<div class='dash-recent-empty'>Загрузка материалов…</div>";
    box.appendChild(listWrap);

    const { data, error } = await supabaseClient
        .from("guild_materials").select("*")
        .eq("guild_id", guildId)
        .order("created_at", { ascending: false });

    if(error){
        listWrap.innerHTML = "<div class='dash-recent-empty'>Материалов пока нет</div>";
        return;
    }
    const mats = data || [];

    if(mats.length === 0){
        listWrap.innerHTML = "<div class='dash-recent-empty'>Материалов пока нет" +
            (amManager ? ". Загрузите первый!" : "") + "</div>";
        return;
    }

    listWrap.innerHTML = "";
    mats.forEach(m => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "material-btn";
        btn.dataset.id = m.id;

        const ico = fileIconByName(m.file_name || m.file_url, m.file_type);
        const canDelete = amManager || (m.uploaded_by === currentUser.id);

        btn.innerHTML =
            "<div class='material-btn-icon'>" + ico + "</div>" +
            "<div class='material-btn-body'>" +
                "<div class='material-btn-title'>" + escapeHtml(m.title || "Без названия") + "</div>" +
                "<div class='material-btn-meta'>" +
                    escapeHtml(m.file_name || "") +
                    (m.file_size ? " · " + humanFileSize(m.file_size) : "") +
                "</div>" +
            "</div>";

        btn.onclick = () => openFileViewer(m);

        if(canDelete){
            const del = document.createElement("span");
            del.className = "material-btn-delete";
            del.title = "Удалить";
            del.textContent = "×";
            del.onclick = (e) => { e.stopPropagation(); deleteMaterial(guildId, m); };
            btn.appendChild(del);
        }
        listWrap.appendChild(btn);
    });
}

async function uploadMaterial(guildId){
    const user = await ensureAuth();
    if(!user) return;

    const title = ($("mat-title").value || "").trim();
    const description = ($("mat-desc").value || "").trim();
    const fileInput = $("mat-file");
    const file = fileInput.files && fileInput.files[0];
    const status = $("mat-status");

    status.className = "profile-status";
    if(!title){ status.textContent = "Укажите название"; status.classList.add("err"); return; }
    if(!file){ status.textContent = "Выберите файл"; status.classList.add("err"); return; }
    if(file.size > 100 * 1024 * 1024){
        status.textContent = "Файл больше 100 МБ";
        status.classList.add("err");
        return;
    }

    const ext = fileExt(file.name);
    const path = user.id + "/" + guildId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2,8) + "." + ext;

    status.textContent = "Загрузка файла…";
    status.classList.add("loading");

    const progressWrap = $("mat-progress");
    const progressBar = $("mat-progress-bar");
    if(progressWrap){ progressWrap.classList.remove("hidden"); progressBar.style.width = "0%"; }

    let p = 0;
    const fake = setInterval(() => {
        p = Math.min(p + 5 + Math.random()*10, 90);
        if(progressBar) progressBar.style.width = p + "%";
    }, 200);

    const up = await supabaseClient.storage
        .from("guild-files")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });

    clearInterval(fake);
    if(progressBar) progressBar.style.width = "100%";

    if(up.error){
        errLog("FILE UPLOAD", up.error.message);
        status.textContent = "Ошибка загрузки: " + up.error.message;
        status.classList.remove("loading");
        status.classList.add("err");
        return;
    }

    const { data: pub } = supabaseClient.storage.from("guild-files").getPublicUrl(path);

    const ins = await supabaseClient.from("guild_materials").insert({
        guild_id: guildId,
        uploaded_by: user.id,
        title,
        description: description || null,
        file_url: pub.publicUrl,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || null
    });

    if(ins.error){
        status.textContent = "Ошибка: " + ins.error.message;
        status.classList.remove("loading");
        status.classList.add("err");
        return;
    }

    status.textContent = "Материал загружен ✓";
    status.classList.remove("loading");
    setTimeout(() => status.textContent = "", 2000);

    $("mat-title").value = "";
    $("mat-desc").value = "";
    $("mat-file").value = "";
    $("mat-file-text").innerHTML = "<b>Выберите файл</b> или перетащите сюда";

    await openGuildOverlayFor(guildId);
}

async function deleteMaterial(guildId, mat){
    if(!confirm("Удалить материал «" + (mat.title || "без названия") + "»?")) return;
    const del = await supabaseClient.from("guild_materials").delete().eq("id", mat.id);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    if(mat.file_path){
        try{ await supabaseClient.storage.from("guild-files").remove([mat.file_path]); }
        catch(e){ errLog("DELETE FILE", e); }
    }
    await openGuildOverlayFor(guildId);
}

/* ============================================================
   FILE VIEWER
============================================================ */
function initFileViewer(){
    const close = $("file-viewer-close");
    if(close) close.onclick = closeFileViewer;
    const dl = $("file-viewer-download");
    if(dl) dl.onclick = () => {
        const url = dl.dataset.url;
        const name = dl.dataset.name || "";
        if(!url) return;
        const a = document.createElement("a");
        a.href = url; a.download = name; a.target = "_blank"; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
    };
}
function openFileViewer(m){
    const wrap = $("file-viewer");
    const title = $("file-viewer-title");
    const body = $("file-viewer-body");
    const dl = $("file-viewer-download");
    if(!wrap || !body) return;

    title.textContent = m.title || m.file_name || "Файл";
    dl.dataset.url = m.file_url;
    dl.dataset.name = m.file_name || "";

    const kind = fileViewerKind(m.file_name, m.file_type);
    body.innerHTML = "";

    if(kind === "image"){
        const img = document.createElement("img");
        img.referrerPolicy = "no-referrer";
        img.src = m.file_url;
        img.alt = m.title || "";
        body.appendChild(img);
    } else if(kind === "video"){
        const v = document.createElement("video");
        v.src = m.file_url; v.controls = true; v.playsInline = true;
        body.appendChild(v);
    } else if(kind === "audio"){
        const a = document.createElement("audio");
        a.src = m.file_url; a.controls = true;
        body.appendChild(a);
    } else if(kind === "pdf"){
        const ifr = document.createElement("iframe");
        ifr.src = m.file_url;
        body.appendChild(ifr);
    } else {
        const fallback = document.createElement("div");
        fallback.className = "viewer-fallback";
        fallback.innerHTML =
            "<span class='big'>" + fileIconByName(m.file_name, m.file_type) + "</span>" +
            "<p>Предпросмотр недоступен.<br>Скачайте файл, чтобы открыть его.</p>";
        const btn = document.createElement("button");
        btn.className = "main-button"; btn.type = "button";
        btn.textContent = "⬇ Скачать файл";
        btn.onclick = () => {
            const a = document.createElement("a");
            a.href = m.file_url; a.download = m.file_name || "";
            a.target = "_blank"; a.rel = "noopener";
            document.body.appendChild(a); a.click(); a.remove();
        };
        fallback.appendChild(btn);
        body.appendChild(fallback);
    }
    wrap.classList.remove("hidden");
}
function closeFileViewer(){
    const wrap = $("file-viewer");
    if(wrap) wrap.classList.add("hidden");
    const body = $("file-viewer-body");
    if(body) body.innerHTML = "";
}

/* ============================================================
   ШАБЛОНЫ
============================================================ */
function initTemplates(){
    const toggle = $("toggle-add-template");
    const cancel = $("cancel-template-btn");
    const save = $("save-template-btn");
    const copyBtn = $("copy-ai-prompt");
    const closeViewer = $("tpl-viewer-close");

    if(toggle) toggle.onclick = () => {
        const panel = $("add-template-panel"); if(!panel) return;
        panel.classList.toggle("hidden");
        if(!panel.classList.contains("hidden")) $("tpl-title")?.focus();
    };
    if(cancel) cancel.onclick = () => {
        const panel = $("add-template-panel");
        if(panel) panel.classList.add("hidden");
        setTplStatus("");
    };
    if(save) save.onclick = saveTemplate;
    if(copyBtn) copyBtn.onclick = copyAiPrompt;
    if(closeViewer) closeViewer.onclick = closeTemplateViewer;
}

function copyAiPrompt(){
    const box = $("ai-prompt-box");
    if(!box) return;
    const text = box.textContent;
    const done = () => {
        const btn = $("copy-ai-prompt");
        if(!btn) return;
        const old = btn.textContent;
        btn.textContent = "✓ Скопировано";
        setTimeout(() => btn.textContent = old, 1500);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
}
function fallbackCopy(text, cb){
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand("copy"); cb && cb(); }catch(e){ errLog("COPY FAIL", e); }
    ta.remove();
}

async function loadTemplates(){
    const box = $("templates-list"); if(!box) return;

    const { data, error } = await supabaseClient
        .from("templates").select("*")
        .order("created_at", { ascending: false });

    if(error){
        templatesAvailable = false;
        box.innerHTML =
            "<div class='dash-recent-empty'>Раздел «Шаблоны» требует таблицы <code>templates</code> в Supabase.</div>";
        return;
    }
    templatesAvailable = true;
    templatesCache = data || [];

    if(templatesCache.length === 0){
        box.innerHTML =
            "<div class='dash-recent-empty'>Шаблонов пока нет. Загрузите первый или сгенерируйте через ИИ!</div>";
        return;
    }

    box.innerHTML = "";
    templatesCache.forEach(t => box.appendChild(buildTemplateCard(t)));
}

function buildTemplateCard(t){
    const card = document.createElement("div");
    card.className = "tpl-card";

    const cat = t.category || "general";
    const catLabel = {
        wosb: "🎮 WOSB",
        general: "📄 Общее",
        guild: "⚔ Гильдии",
        other: "📁 Другое"
    }[cat] || "📄";

    const date = t.created_at
        ? new Date(t.created_at).toLocaleDateString("ru-RU", { day:"2-digit", month:"short", year:"numeric" })
        : "";

    const preview = (t.content || "").slice(0, 120).replace(/\s+/g, " ");
    const isOwner = t.uploaded_by === currentUser.id;
    const canDelete = isOwner || isAdmin();

    card.innerHTML =
        "<div class='tpl-card-header'>" +
            "<div class='tpl-card-icon'>📄</div>" +
            "<div class='tpl-card-info'>" +
                "<div class='tpl-card-title'>" + escapeHtml(t.title || "Без названия") + "</div>" +
                "<span class='tpl-card-cat " + cat + "'>" + catLabel + "</span>" +
            "</div>" +
        "</div>" +
        "<div class='tpl-card-desc'>" + escapeHtml(t.description || preview || "Без описания") + "</div>" +
        "<div class='tpl-card-meta'>" +
            "<span>📅 " + escapeHtml(date) + "</span>" +
            "<span>🔒 только просмотр</span>" +
        "</div>" +
        "<div class='tpl-card-actions'></div>";

    const actions = card.querySelector(".tpl-card-actions");
    const openBtn = document.createElement("button");
    openBtn.className = "main-button";
    openBtn.type = "button";
    openBtn.textContent = "👁 Открыть";
    openBtn.onclick = () => openTemplateViewer(t);
    actions.appendChild(openBtn);

    if(canDelete){
        const del = document.createElement("button");
        del.className = "tpl-delete";
        del.type = "button";
        del.title = "Удалить";
        del.textContent = "×";
        del.onclick = (e) => { e.stopPropagation(); deleteTemplate(t); };
        card.appendChild(del);
    }
    return card;
}

async function saveTemplate(){
    const user = await ensureAuth();
    if(!user){ setTplStatus("Нет авторизации", "err"); return; }
    if(!templatesAvailable){ setTplStatus("Таблица templates не создана", "err"); return; }

    const title = ($("tpl-title").value || "").trim();
    const description = ($("tpl-desc").value || "").trim();
    const category = ($("tpl-category").value || "general").trim();
    const content = ($("tpl-content").value || "").trim();

    if(!title || title.length < 2){ setTplStatus("Название: минимум 2 символа", "err"); return; }
    if(!content || content.length < 20){ setTplStatus("Вставьте HTML-код шаблона", "err"); return; }
    if(content.length > 500000){ setTplStatus("Шаблон слишком большой (макс 500 000 символов)", "err"); return; }

    setTplStatus("Сохранение…", "loading");

    const ins = await supabaseClient.from("templates").insert({
        title,
        description: description || null,
        category,
        content,
        uploaded_by: user.id
    }).select().single();

    if(ins.error){
        errLog("SAVE TEMPLATE", ins.error.message);
        setTplStatus("Ошибка: " + ins.error.message, "err");
        return;
    }

    setTplStatus("Шаблон загружен ✓");
    setTimeout(() => setTplStatus(""), 1500);

    $("tpl-title").value = "";
    $("tpl-desc").value = "";
    $("tpl-content").value = "";
    $("tpl-category").value = "general";
    $("add-template-panel").classList.add("hidden");

    await loadTemplates();
}

async function deleteTemplate(t){
    const user = await ensureAuth();
    if(!user) return;

    const isOwner = t.uploaded_by === user.id;
    if(!isOwner && !isAdmin()){
        alert("Удалить шаблон может только автор или администратор.");
        return;
    }
    if(!confirm("Удалить шаблон «" + (t.title || "без названия") + "»?")) return;

    const del = await supabaseClient.from("templates").delete().eq("id", t.id);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    await loadTemplates();
}

function openTemplateViewer(t){
    const wrap = $("template-viewer");
    const titleEl = $("tpl-viewer-title");
    const subEl = $("tpl-viewer-sub");
    const frame = $("tpl-viewer-frame");
    if(!wrap || !frame) return;

    titleEl.textContent = t.title || "Шаблон";

    const cat = t.category || "general";
    const catLabel = {
        wosb: "🎮 World of Sea Battle",
        general: "📄 Общее",
        guild: "⚔ Гильдии",
        other: "📁 Другое"
    }[cat] || "📄";

    const date = t.created_at
        ? new Date(t.created_at).toLocaleDateString("ru-RU", { day:"2-digit", month:"long", year:"numeric" })
        : "";

    subEl.textContent = catLabel + (date ? " · " + date : "");

    frame.setAttribute("sandbox", "");
    frame.srcdoc = t.content || "<html><body style='font-family:sans-serif;padding:40px;color:#888'>Пустой шаблон</body></html>";

    wrap.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}
function closeTemplateViewer(){
    const wrap = $("template-viewer");
    if(wrap) wrap.classList.add("hidden");
    const frame = $("tpl-viewer-frame");
    if(frame) frame.srcdoc = "";
    document.body.style.overflow = "";
}

/* ============================================================
   ПРОФИЛЬ
============================================================ */
async function loadProfile(){
    const user = await ensureAuth();
    if(!user) return;
    if(!availableColumns){
        const { columns, row } = await detectProfileColumns(user.id);
        availableColumns = columns;
        applySchemaVisibility();
        if(row){
            currentProfile = row;
            applyProfileToUI(row);
            fillProfileForm(row);
            return;
        }
    }
    const cols = Array.from(availableColumns).join(",");
    let result = await supabaseClient.from("profiles").select(cols).eq("id", user.id).maybeSingle();
    if(result.error){ errLog("PROFILE SELECT", result.error.message); return; }

    if(!result.data){
        const nick = user.email ? user.email.split("@")[0] : "Player";
        const payload = { id: user.id, nickname: nick };
        if(availableColumns.has("avatar_url")) payload.avatar_url = DEFAULT_AVATAR;
        if(availableColumns.has("vip_level")) payload.vip_level = 0;
        const create = await supabaseClient.from("profiles").insert(payload);
        if(create.error){ errLog("PROFILE INSERT", create.error.message); return; }
        return loadProfile();
    }
    currentProfile = result.data;
    applyProfileToUI(currentProfile);
    fillProfileForm(currentProfile);
    loadGames().catch(e => errLog(e));
}

function applyProfileToUI(p){
    if(!p) return;
    setText("top-name", p.nickname || "Player");
    setImage("top-avatar", p.avatar_url);
    setText("profile-name", p.nickname || "Player");
    setText("vip-level", "VIP " + (p.vip_level || 0));
    setImage("profile-avatar", p.avatar_url);
    setText("profile-id", p.id || "—");
    setText("side-name", p.nickname || "Player");
    setText("side-vip", "VIP " + (p.vip_level || 0));
    setImage("side-avatar", p.avatar_url);

    const adminBadge = $("admin-badge");
    if(adminBadge){
        if(p.is_admin === true) adminBadge.classList.remove("hidden");
        else adminBadge.classList.add("hidden");
    }
}

function fillProfileForm(p){
    if(!p) return;
    if($("pf-nickname")) $("pf-nickname").value = p.nickname || "";
    if($("pf-avatar") && availableColumns.has("avatar_url")) $("pf-avatar").value = p.avatar_url || "";
    if($("pf-city")   && availableColumns.has("city"))       $("pf-city").value = p.city || "";
    if($("pf-age")    && availableColumns.has("age"))        $("pf-age").value = (p.age == null ? "" : p.age);
    if($("pf-about")  && availableColumns.has("about"))      $("pf-about").value = p.about || "";
    updateAboutCounter();
}
function updateAboutCounter(){
    const ta = $("pf-about"), counter = $("pf-about-count");
    if(ta && counter) counter.textContent = ta.value.length;
}

function initProfileForm(){
    const form = $("profile-form"); if(!form) return;
    const avatarInput = $("pf-avatar");
    if(avatarInput){
        avatarInput.addEventListener("input", () => {
            if(avatarPreviewTimer) clearTimeout(avatarPreviewTimer);
            avatarPreviewTimer = setTimeout(previewAvatar, 500);
        });
    }
    const aboutInput = $("pf-about");
    if(aboutInput) aboutInput.addEventListener("input", updateAboutCounter);
    const saveBtn = $("save-profile"); if(saveBtn) saveBtn.onclick = saveProfileChanges;
    const resetBtn = $("reset-profile");
    if(resetBtn) resetBtn.onclick = () => {
        if(!currentProfile) return;
        fillProfileForm(currentProfile);
        setImage("profile-avatar", currentProfile.avatar_url);
        setAvatarHint("");
        setProfileStatus("Изменения сброшены");
        setTimeout(() => setProfileStatus(""), 1500);
    };
}

async function previewAvatar(){
    const input = $("pf-avatar"); if(!input) return;
    const raw = input.value.trim();
    const url = normalizeImageUrl(raw);
    if(!raw){ setImage("profile-avatar", ""); setAvatarHint(""); return; }
    if(!isValidHttpUrl(url)){ setAvatarHint("Некорректная ссылка", "err"); setImage("profile-avatar", ""); return; }
    if(url !== raw){ input.value = url; setAvatarHint("Ссылка нормализована", "loading"); }
    setAvatarHint("Проверка ссылки…", "loading");
    const ok = await testImageUrl(url);
    if(ok){ setAvatarHint("✓ Картинка загружена", "ok"); setImage("profile-avatar", url); }
    else { setAvatarHint("✗ Не удалось загрузить", "err"); setImage("profile-avatar", ""); }
}

async function saveProfileChanges(){
    if(savingProfile) return;
    const user = await ensureAuth();
    if(!user){ setProfileStatus("Нет авторизации", "err"); return; }
    if(!availableColumns){ setProfileStatus("Обновите страницу", "err"); return; }

    const nickname = ($("pf-nickname").value || "").trim();
    const avatarRaw = availableColumns.has("avatar_url") ? ($("pf-avatar").value || "").trim() : "";
    const avatarUrl = normalizeImageUrl(avatarRaw);
    const city = availableColumns.has("city") ? ($("pf-city").value || "").trim() : "";
    const ageRaw = availableColumns.has("age") ? $("pf-age").value : "";
    const about = availableColumns.has("about") ? ($("pf-about").value || "").trim() : "";

    if(!isValidNickname(nickname)){ setProfileStatus("Никнейм: 2–30 символов", "err"); return; }
    if(avatarUrl && !isValidHttpUrl(avatarUrl)){ setProfileStatus("Ссылка на аватар некорректна", "err"); return; }
    let age = null;
    if(ageRaw !== ""){
        const n = parseInt(ageRaw, 10);
        if(isNaN(n) || n < 1 || n > 120){ setProfileStatus("Возраст: 1–120", "err"); return; }
        age = n;
    }
    if(city.length > 40){ setProfileStatus("Город: до 40", "err"); return; }
    if(about.length > 300){ setProfileStatus("О себе: до 300", "err"); return; }

    if(!currentProfile || nickname !== currentProfile.nickname){
        savingProfile = true;
        setProfileStatus("Проверка никнейма…", "loading");
        const { data: dup } = await supabaseClient
            .from("profiles").select("id").eq("nickname", nickname).neq("id", user.id).maybeSingle();
        if(dup && dup.id){ savingProfile = false; setProfileStatus("Никнейм занят", "err"); return; }
        savingProfile = false;
    }
    if(avatarUrl){
        setProfileStatus("Проверка ссылки на аватар…", "loading");
        const ok = await testImageUrl(avatarUrl);
        if(!ok){ setProfileStatus("Аватар не загрузился", "err"); return; }
    }

    const payload = { nickname };
    if(availableColumns.has("avatar_url")) payload.avatar_url = avatarUrl || null;
    if(availableColumns.has("city"))       payload.city = city || null;
    if(availableColumns.has("age"))        payload.age = age;
    if(availableColumns.has("about"))      payload.about = about || null;

    savingProfile = true;
    setProfileStatus("Сохранение…", "loading");

    try{
        const update = await supabaseClient
            .from("profiles").update(payload).eq("id", user.id).select().single();

        if(update.error){
            const m = (update.error.message||"").match(/Could not find the '([^']+)' column/);
            if(m && m[1]){
                const bad = m[1];
                availableColumns.delete(bad);
                applySchemaVisibility();
                delete payload[bad];
                const retry = await supabaseClient.from("profiles")
                    .update(payload).eq("id", user.id).select().single();
                if(retry.error){ setProfileStatus("Ошибка: " + retry.error.message, "err"); savingProfile = false; return; }
                currentProfile = retry.data || Object.assign({}, currentProfile, payload);
                applyProfileToUI(currentProfile);
                setProfileStatus("Сохранено (схема скорректирована) ✓");
                setTimeout(() => setProfileStatus(""), 2500);
                savingProfile = false;
                return;
            }
            setProfileStatus("Ошибка: " + update.error.message, "err");
            savingProfile = false;
            return;
        }

        currentProfile = update.data || Object.assign({}, currentProfile, payload);
        applyProfileToUI(currentProfile);

        if(presenceChannel && presenceChannel.state === "joined"){
            try{
                await presenceChannel.track({
                    user_id: user.id,
                    nickname: currentProfile.nickname || "Player",
                    avatar_url: currentProfile.avatar_url || DEFAULT_AVATAR,
                    online_at: new Date().toISOString()
                });
            }catch(e){ errLog("PRESENCE UPDATE", e); }
        }

        setProfileStatus("Сохранено ✓");
        setTimeout(() => setProfileStatus(""), 2200);
        loadGames().catch(e => errLog(e));
    }catch(err){
        setProfileStatus("Ошибка: " + err.message, "err");
    }finally{ savingProfile = false; }
}

/* ============================================================
   НОВОСТИ
============================================================ */
async function loadNews(){
    const boxHome = $("news-list");
    const boxPage = $("news-page-list");
    const { data, error } = await supabaseClient
        .from("news").select("*").order("created_at", { ascending: false });

    const empty = "<p style='color:#888'>Новостей пока нет</p>";
    if(error || !data || data.length === 0){
        if(boxHome) boxHome.innerHTML = empty;
        if(boxPage) boxPage.innerHTML = empty;
        return;
    }
    const render = (list, limit) => {
        const frag = document.createDocumentFragment();
        (limit ? list.slice(0, limit) : list).forEach(item => {
            const div = document.createElement("div");
            div.className = "news-item";
            div.innerHTML =
                "<h3>" + escapeHtml(item.title || "") + "</h3>" +
                "<p>" + escapeHtml(item.text || "") + "</p>";
            frag.appendChild(div);
        });
        return frag;
    };
    if(boxHome){ boxHome.innerHTML = ""; boxHome.appendChild(render(data, 3)); }
    if(boxPage){ boxPage.innerHTML = ""; boxPage.appendChild(render(data, 0)); }
}

/* ============================================================
   ЧАТ
============================================================ */
function initChat(){
    const button = $("send-message");
    if(button) button.onclick = sendMessage;
    const input = $("message-text");
    if(input){
        input.addEventListener("keydown", (e) => {
            if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); }
        });
    }
}
async function sendMessage(){
    const user = await ensureAuth();
    if(!user){ alert("Нет авторизации"); return; }
    const input = $("message-text"); if(!input) return;
    const text = input.value.trim(); if(!text) return;

    const nickname = (currentProfile && currentProfile.nickname) || "Player";
    const result = await supabaseClient.from("messages").insert({
        user_id: user.id, nickname, text
    });
    if(result.error){ errLog("MSG INSERT", result.error.message); alert("Ошибка: " + result.error.message); return; }
    input.value = "";
    loadHomeRecentMessages().catch(e => errLog(e));
}
async function loadMessages(){
    const box = $("messages"); if(!box) return;
    const { data, error } = await supabaseClient
        .from("messages").select("*").order("created_at", { ascending: true }).limit(300);

    if(error){
        box.innerHTML = "<div class='chat-message'><div class='chat-body'>Ошибка: " +
            escapeHtml(error.message) + "</div></div>";
        return;
    }
    const userIds = Array.from(new Set((data || []).map(m => m.user_id).filter(Boolean)));
    const profiles = {};
    if(userIds.length){
        const pRes = await supabaseClient
            .from("profiles").select("id, nickname, avatar_url").in("id", userIds);
        (pRes.data || []).forEach(p => profiles[p.id] = p);
    }
    box.innerHTML = "";
    (data || []).forEach(m => appendMessage(m, profiles[m.user_id]));
    box.scrollTop = box.scrollHeight;
}
function appendMessage(m, profile){
    const box = $("messages"); if(!box) return;
    const isOwn = currentUser && m.user_id === currentUser.id;
    const nick = (profile && profile.nickname) || m.nickname || "Гость";
    const avatar = (profile && profile.avatar_url) || DEFAULT_AVATAR;

    const div = document.createElement("div");
    div.className = "chat-message" + (isOwn ? " own" : "");
    div.dataset.id = m.id;

    const time = m.created_at
        ? new Date(m.created_at).toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" })
        : "";
    const initial = nick[0].toUpperCase();

    div.innerHTML =
        "<div class='chat-avatar'>" +
            "<img referrerpolicy='no-referrer' src='" + escapeHtml(avatar) +
            "' onerror=\"this.style.display='none';this.parentNode.textContent='" +
            escapeHtml(initial) + "'\">" +
        "</div>" +
        "<div class='chat-body'>" +
            "<div class='chat-head'><b>" + escapeHtml(nick) + "</b>" +
                "<span class='msg-time'>" + escapeHtml(time) + "</span></div>" +
            "<div class='chat-text'>" + escapeHtml(m.text || "") + "</div>" +
        "</div>";

    if(isOwn){
        const del = document.createElement("button");
        del.className = "chat-delete";
        del.title = "Удалить";
        del.textContent = "×";
        del.onclick = () => deleteMessage(m.id);
        div.appendChild(del);
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
async function deleteMessage(id){
    if(!confirm("Удалить сообщение?")) return;
    const { error } = await supabaseClient.from("messages").delete().eq("id", id);
    if(error){ errLog("MSG DELETE", error.message); alert("Ошибка: " + error.message); return; }
    const el = document.querySelector(".chat-message[data-id='" + id + "']");
    if(el) el.remove();
}
function startChatRealtime(){
    if(chatChannel) return;
    chatChannel = supabaseClient
        .channel("public-messages")
        .on("postgres_changes",
            { event: "INSERT", schema: "public", table: "messages" },
            async (payload) => {
                const m = payload.new;
                const pRes = await supabaseClient
                    .from("profiles").select("nickname, avatar_url")
                    .eq("id", m.user_id).maybeSingle();
                appendMessage(m, pRes.data);
                loadHomeRecentMessages().catch(e => errLog(e));
            })
        .on("postgres_changes",
            { event: "DELETE", schema: "public", table: "messages" },
            (payload) => {
                const el = document.querySelector(".chat-message[data-id='" + payload.old.id + "']");
                if(el) el.remove();
            })
        .subscribe();
}

/* ============================================================
   КОНФЕРЕНЦИЯ
============================================================ */
function initConference(){
    const createBtn = $("create-room-btn");
    if(createBtn) createBtn.onclick = createRoom;
    const leave = $("leave-room");
    if(leave) leave.onclick = leaveRoom;
}
async function createRoom(){
    const user = await ensureAuth();
    if(!user){ alert("Нет авторизации"); return; }
    const name = $("room-name-input").value.trim();
    const description = $("room-desc-input").value.trim();
    if(!name){ alert("Введите название"); return; }

    setRoomStatus("Создание…");
    const result = await supabaseClient.from("conference_rooms")
        .insert({ name, description: description || null }).select().single();
    if(result.error){ setRoomStatus("Ошибка: " + result.error.message, "err"); return; }
    $("room-name-input").value = "";
    $("room-desc-input").value = "";
    setRoomStatus("");
    await loadRooms();
    await joinRoom(result.data);
}
async function loadRooms(){
    const box = $("rooms-list"); if(!box) return;
    const roomsRes = await supabaseClient.from("conference_rooms").select("*").order("id");
    if(roomsRes.error){ box.innerHTML = "<p style='color:#888'>Ошибка загрузки</p>"; return; }
    const rooms = roomsRes.data || [];

    const usersRes = await supabaseClient.from("conference_users").select("room_id");
    const counts = {};
    (usersRes.data || []).forEach(u => {
        counts[u.room_id] = (counts[u.room_id] || 0) + 1;
    });
    if(rooms.length === 0){ box.innerHTML = "<p style='color:#888'>Комнат нет. Создайте первую!</p>"; return; }
    const sorted = rooms.slice().sort((a,b) => (counts[b.id]||0)-(counts[a.id]||0));
    box.innerHTML = "";
    sorted.forEach(room => {
        const count = counts[room.id] || 0;
        const card = document.createElement("div");
        card.className = "room-card";
        card.innerHTML =
            "<h3>🎙 " + escapeHtml(room.name || "Комната") + "</h3>" +
            "<p>" + escapeHtml(room.description || "") + "</p>" +
            "<p>👥 " + count + (count===1 ? " участник" : " участников") + "</p>";
        const btn = document.createElement("button");
        btn.className = "main-button"; btn.type="button"; btn.textContent="Войти";
        btn.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); joinRoom(room); };
        card.appendChild(btn);
        box.appendChild(card);
    });
}
async function joinRoom(room){
    if(joiningRoom) return;
    joiningRoom = true;
    try{
        const user = await ensureAuth();
        if(!user){ setRoomStatus("Требуется вход", "err"); return; }
        await supabaseClient.from("conference_users").delete().eq("user_id", user.id);
        const nickname = currentProfile?.nickname || "Player";
        const ins = await supabaseClient.from("conference_users").insert({
            room_id: room.id, user_id: user.id, nickname
        });
        if(ins.error) errLog("ROOM USER INSERT", ins.error.message);
        currentRoom = room;

        const miroRoomId = "gp-" + room.id;
        const miroUrl = MIROTALK_BASE + "/join/?" +
            "room=" + encodeURIComponent(miroRoomId) +
            "&name=" + encodeURIComponent(nickname) +
            "&audio=1&video=1&screen=1&chat=1&notify=1";
        const container = $("mirotalk-container");
        container.innerHTML =
            '<iframe src="' + miroUrl + '" ' +
            'allow="camera; microphone; speaker-selection; display-capture; fullscreen; clipboard-read; clipboard-write; web-share; autoplay; picture-in-picture" ' +
            'allowfullscreen style="width:100%;height:100%;border:0;"></iframe>';
        setText("current-room-title", "🎙 " + (room.name || "Комната"));
        setRoomStatus("Подключено к MiroTalk P2P", "ok");
    }catch(err){
        errLog("JOIN EXC", err);
        setRoomStatus("Ошибка: " + err.message, "err");
    }finally{ joiningRoom = false; }
}
function closeMiroTalkRoom(){
    const c = $("mirotalk-container"); if(!c) return;
    c.innerHTML =
        "<div class='mirotalk-placeholder'>" +
        "<div class='mirotalk-placeholder-icon'>🎥</div>" +
        "<p>Выберите комнату из списка слева, чтобы начать конференцию</p>" +
        "</div>";
}
async function leaveRoom(){
    const user = await ensureAuth();
    if(currentRoom && user){
        try{
            await supabaseClient.from("conference_users").delete()
                .eq("user_id", user.id).eq("room_id", currentRoom.id);
        }catch(e){ errLog("LEAVE DB", e); }
    }
    closeMiroTalkRoom();
    setText("current-room-title", "Комната не выбрана");
    setRoomStatus("");
    currentRoom = null;
    await loadRooms();
}

/* ============================================================
   BEFORE UNLOAD
============================================================ */
window.addEventListener("beforeunload", () => {
    if(currentRoom && currentUser){
        try{
            supabaseClient.from("conference_users").delete()
                .eq("user_id", currentUser.id).eq("room_id", currentRoom.id);
        }catch(e){}
    }
    if(presenceChannel){
        try{ presenceChannel.untrack(); }catch(e){}
    }
});
