/* =====================================================
   GAME PLATFORM — app.js
   Auth + Profile + Chat + Conference + Online + Games + Guilds
   Guilds привязаны к играм; игры добавляются пользователями.
===================================================== */

const SUPABASE_URL = "https://uvzaoobtysostmfwyfxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";
const MIROTALK_BASE = "https://p2p.mirotalk.com";
const IMG_LOAD_TIMEOUT = 8000;

/* ===== СОСТОЯНИЕ ===== */
let currentUser = null;
let currentProfile = null;
let availableColumns = null;
let chatChannel = null;
let currentRoom = null;
let roomsPollTimer = null;
let joiningRoom = false;
let savingProfile = false;
let avatarPreviewTimer = null;

// online
let presenceChannel = null;
let onlineUsers = {};

// guilds
let guildsCache = [];
let guildMembersCache = {};
let currentGuildId = null;
let guildsAvailable = true;
let guildsGameIdAvailable = true;
let currentGameFilter = 0; // 0 = все

// games
let gamesCache = [];
let gamesAvailable = true;
let gameIconTimer = null;

/* ===== ХЕЛПЕРЫ ===== */
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

/* ===== URL / IMG ===== */
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

/* ===== СХЕМА profiles ===== */
async function detectProfileColumns(userId){
    const wanted = ["id","nickname","avatar_url","vip_level","age","city","about"];
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
    errLog("SCHEMA:", result.error.message);
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
        if(!has("about")) missing.push("about");
        if(!has("city"))  missing.push("city");
        if(!has("age"))   missing.push("age");
        if(missing.length){
            warn.classList.remove("hidden");
            warn.innerHTML = "⚠️ В <code>profiles</code> отсутствуют колонки: <b>" +
                missing.join(", ") + "</b>.<br>Поля скрыты.";
        } else warn.classList.add("hidden");
    }
}

/* ===== СТАРТ ===== */
document.addEventListener("DOMContentLoaded", () => {
    log("START");
    initAuth();
    initNavigation();
    initChat();
    initConference();
    initProfileForm();
    initGames();
    initGuilds();

    supabaseClient.auth.onAuthStateChange((event, session) => {
        log("AUTH EVENT:", event);
        if(event === "SIGNED_OUT"){ currentUser = null; }
        else if(session && session.user){ currentUser = session.user; }
    });

    checkSession();
});

/* ===== AUTH ===== */
function initAuth(){
    const loginTab = $("login-tab");
    const registerTab = $("register-tab");

    if(loginTab){
        loginTab.onclick = () => {
            loginTab.classList.add("active");
            if(registerTab) registerTab.classList.remove("active");
            $("login-form").classList.remove("hidden");
            $("register-form").classList.add("hidden");
            setAuthMessage("");
        };
    }
    if(registerTab){
        registerTab.onclick = () => {
            registerTab.classList.add("active");
            if(loginTab) loginTab.classList.remove("active");
            $("register-form").classList.remove("hidden");
            $("login-form").classList.add("hidden");
            setAuthMessage("");
        };
    }

    const loginForm = $("login-form");
    if(loginForm){
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); e.stopPropagation();
            setAuthMessage("Вход…", true);
            const email = $("login-email").value.trim();
            const password = $("login-password").value;
            try{
                const r = await supabaseClient.auth.signInWithPassword({ email, password });
                if(r.error){ errLog("LOGIN", r.error.message); setAuthMessage(r.error.message); return; }
                currentUser = r.data.user; setAuthMessage(""); openApp();
            }catch(err){ setAuthMessage("Ошибка: " + err.message); }
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
            }catch(err){ setAuthMessage("Ошибка: " + err.message); }
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
            }catch(e){ errLog("LOGOUT", e); location.reload(); }
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

/* ===== APP ===== */
async function openApp(){
    $("auth-screen").classList.add("hidden");
    $("app").classList.remove("hidden");
    log("APP OPEN");

    if(currentUser){
        try{
            await supabaseClient.from("conference_users").delete().eq("user_id", currentUser.id);
        }catch(e){ errLog("STALE", e); }
    }

    await safeRun(loadProfile);
    await safeRun(loadNews);
    await safeRun(loadMessages);
    await safeRun(loadHomeRecentMessages);
    await safeRun(loadHomeStats);
    await safeRun(loadGames);
    await safeRun(loadGuilds);

    startChatRealtime();
    initOnlinePresence();

    await safeRun(loadRooms);

    if(roomsPollTimer) clearInterval(roomsPollTimer);
    roomsPollTimer = setInterval(() => {
        loadRooms().catch(e => errLog("ROOMS POLL", e));
    }, 5000);
}

async function safeRun(fn){
    try{ await fn(); } catch(e){ errLog(fn.name, e); }
}

/* ===== НАВИГАЦИЯ ===== */
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
            if(p === "online") renderOnlinePage();
        };
    });
}

/* ===== ONLINE PRESENCE ===== */
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
                (u.avatar_url
                    ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(u.avatar_url) + "'>"
                    : escapeHtml(initial)) +
            "</div>" +
            "<div>" +
                "<div class='online-user-name'>" + escapeHtml(nick) + (isMe ? " (вы)" : "") + "</div>" +
                "<div class='online-user-meta'>🟢 в сети</div>" +
            "</div>";
        box.appendChild(div);
    });
}

/* ===== ГЛАВНАЯ ===== */
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
        const { count } = await supabaseClient.from("guilds").select("*", { count:"exact", head:true });
        setText("dash-guilds", String(count || 0));
    }catch(e){ setText("dash-guilds", "—"); }
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
        const time = m.created_at
            ? new Date(m.created_at).toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" })
            : "";
        const text = (m.text||"").slice(0, 90) + ((m.text||"").length > 90 ? "…" : "");
        div.innerHTML =
            "<b>" + escapeHtml(m.nickname || "Гость") + "</b>" +
            "<span class='dash-recent-time'>" + escapeHtml(time) + "</span>" +
            "<div>" + escapeHtml(text) + "</div>";
        box.appendChild(div);
    });
}

/* ============================================================
   ИГРЫ (динамические, с авто-иконкой)
============================================================ */
function initGames(){
    const toggleBtn = $("toggle-add-game");
    const cancelBtn = $("cancel-game-btn");
    const saveBtn = $("save-game-btn");
    const urlInput = $("game-url-input");
    const iconInput = $("game-icon-input");

    if(toggleBtn){
        toggleBtn.onclick = () => {
            const panel = $("add-game-panel");
            if(!panel) return;
            panel.classList.toggle("hidden");
            if(!panel.classList.contains("hidden")){
                $("game-name-input")?.focus();
            }
        };
    }
    if(cancelBtn){
        cancelBtn.onclick = () => closeAddGameForm();
    }
    if(saveBtn){
        saveBtn.onclick = saveNewGame;
    }

    // Автопревью иконки при вводе URL или своей иконки
    if(urlInput){
        urlInput.addEventListener("input", () => {
            if(gameIconTimer) clearTimeout(gameIconTimer);
            gameIconTimer = setTimeout(previewGameIcon, 400);
        });
    }
    if(iconInput){
        iconInput.addEventListener("input", () => {
            if(gameIconTimer) clearTimeout(gameIconTimer);
            gameIconTimer = setTimeout(previewGameIcon, 400);
        });
    }
}

function closeAddGameForm(){
    const panel = $("add-game-panel");
    if(panel) panel.classList.add("hidden");
    if($("game-name-input")) $("game-name-input").value = "";
    if($("game-url-input")) $("game-url-input").value = "";
    if($("game-desc-input")) $("game-desc-input").value = "";
    if($("game-icon-input")) $("game-icon-input").value = "";
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
    if(!url){
        wrap.innerHTML = "<span>🎮</span>";
        return;
    }
    const img = document.createElement("img");
    img.referrerPolicy = "no-referrer";
    img.alt = "";
    img.onerror = () => { wrap.innerHTML = "<span>🎮</span>"; };
    img.src = url;
    wrap.appendChild(img);
}

function previewGameIcon(){
    const urlInput = $("game-url-input");
    const iconInput = $("game-icon-input");
    const text = $("game-icon-preview-text");
    if(!urlInput || !text) return;

    const siteUrl = (urlInput.value || "").trim();
    const customIcon = (iconInput?.value || "").trim();

    if(!siteUrl && !customIcon){
        resetGamePreview();
        return;
    }

    if(!isValidHttpUrl(siteUrl) && siteUrl){
        text.textContent = "Некорректная ссылка на сайт";
        text.className = "game-icon-preview-text err";
        renderGamePreviewIcon("");
        return;
    }

    // Если задана своя иконка — используем её
    if(customIcon && isValidHttpUrl(customIcon)){
        text.textContent = "Своя иконка будет использована";
        text.className = "game-icon-preview-text ok";
        renderGamePreviewIcon(customIcon);
        return;
    }

    // Иначе — favicon с сайта
    const fav = faviconFromUrl(siteUrl);
    if(!fav){
        text.textContent = "Не удалось определить сайт";
        text.className = "game-icon-preview-text err";
        renderGamePreviewIcon("");
        return;
    }
    text.textContent = "Иконка подтянута с сайта игры";
    text.className = "game-icon-preview-text ok";
    renderGamePreviewIcon(fav);
}

async function loadGames(){
    const box = $("games-list"); if(!box) return;

    const { data, error } = await supabaseClient
        .from("games").select("*").order("created_at", { ascending: false });

    if(error){
        gamesAvailable = false;
        box.innerHTML =
            "<div class='dash-recent-empty'>" +
            "Раздел «Игры» требует создания таблицы <code>games</code> в Supabase.<br>" +
            "Откройте SQL Editor и выполните SQL из комментария в начале <code>app.js</code>." +
            "</div>";
        return;
    }
    gamesAvailable = true;
    gamesCache = data || [];

    // Загружаем количество гильдий по каждой игре
    const guildCounts = {};
    try{
        const gRes = await supabaseClient.from("guilds").select("game_id");
        (gRes.data || []).forEach(g => {
            if(g.game_id) guildCounts[g.game_id] = (guildCounts[g.game_id] || 0) + 1;
        });
    }catch(e){ /* column game_id может отсутствовать */ }

    if(gamesCache.length === 0){
        box.innerHTML = "<div class='dash-recent-empty'>Игр пока нет. Добавьте первую!</div>";
        return;
    }

    box.innerHTML = "";
    gamesCache.forEach(g => {
        const card = document.createElement("div");
        card.className = "game-card";

        const guildCount = guildCounts[g.id] || 0;
        const isOwn = g.added_by === currentUser.id;
        const icon = g.icon_url || faviconFromUrl(g.url) || "";

        card.innerHTML =
            "<div class='game-card-header'>" +
                "<div class='game-card-icon'>" +
                    (icon
                        ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(icon) +
                          "' onerror=\"this.style.display='none';this.parentNode.textContent='🎮'\">"
                        : "🎮") +
                "</div>" +
                "<div class='game-card-title'>" + escapeHtml(g.name) + "</div>" +
            "</div>" +
            "<div class='game-card-desc'>" + escapeHtml(g.description || "Без описания") + "</div>" +
            "<div class='game-card-actions'></div>";

        const actions = card.querySelector(".game-card-actions");

        const openBtn = document.createElement("button");
        openBtn.className = "main-button";
        openBtn.type = "button";
        openBtn.textContent = "🌐 Сайт";
        openBtn.onclick = () => window.open(g.url, "_blank", "noopener");
        actions.appendChild(openBtn);

        const guildBtn = document.createElement("button");
        guildBtn.className = "main-button";
        guildBtn.type = "button";
        guildBtn.textContent = "⚔ " + (guildCount ? "Гильдии (" + guildCount + ")" : "Создать гильдию");
        guildBtn.onclick = () => {
            currentGameFilter = g.id;
            switchPage("guilds");
            loadGuilds().catch(e => errLog(e));
        };
        actions.appendChild(guildBtn);

        if(isOwn){
            const del = document.createElement("button");
            del.className = "game-delete";
            del.type = "button";
            del.title = "Удалить игру";
            del.textContent = "×";
            del.onclick = (e) => {
                e.stopPropagation();
                deleteGame(g.id, g.name);
            };
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

    if(!name || name.length < 2){
        setGameStatus("Название: минимум 2 символа", "err");
        $("game-name-input").focus();
        return;
    }
    if(!isValidHttpUrl(url) || !url){
        setGameStatus("Ссылка на сайт некорректна", "err");
        $("game-url-input").focus();
        return;
    }
    if(customIcon && !isValidHttpUrl(customIcon)){
        setGameStatus("Ссылка на иконку некорректна", "err");
        return;
    }

    // Итоговая иконка: своя или favicon с сайта
    const iconUrl = customIcon || faviconFromUrl(url);

    setGameStatus("Сохранение…", "loading");

    const payload = {
        name,
        description: description || null,
        url,
        icon_url: iconUrl,
        added_by: user.id
    };

    const ins = await supabaseClient.from("games").insert(payload).select().single();

    if(ins.error){
        errLog("CREATE GAME", ins.error.message);
        setGameStatus("Ошибка: " + ins.error.message, "err");
        return;
    }

    setGameStatus("Игра добавлена ✓");
    setTimeout(() => setGameStatus(""), 1500);
    closeAddGameForm();
    await loadGames();
    populateGuildGameSelect();
    renderGuildGameFilter();
}

async function deleteGame(id, name){
    if(!confirm("Удалить игру «" + name + "»? Гильдии этой игры останутся, но потеряют привязку.")) return;

    const del = await supabaseClient.from("games").delete().eq("id", id);
    if(del.error){
        errLog("DELETE GAME", del.error.message);
        alert("Ошибка: " + del.error.message);
        return;
    }
    if(currentGameFilter === id) currentGameFilter = 0;
    await loadGames();
    await loadGuilds();
    populateGuildGameSelect();
    renderGuildGameFilter();
}

/* ============================================================
   ГИЛЬДИИ (привязаны к играм)
============================================================ */
function initGuilds(){
    const btn = $("guild-create-btn");
    if(btn) btn.onclick = createGuild;
}

function renderGuildGameFilter(){
    const box = $("guilds-game-filter"); if(!box) return;

    box.innerHTML = "";

    // Чип "Все"
    const allChip = document.createElement("div");
    allChip.className = "guild-filter-chip" + (currentGameFilter === 0 ? " active" : "");
    allChip.textContent = "Все игры";
    allChip.onclick = () => {
        currentGameFilter = 0;
        loadGuilds().catch(e => errLog(e));
    };
    box.appendChild(allChip);

    // Чипы игр
    gamesCache.forEach(g => {
        const chip = document.createElement("div");
        chip.className = "guild-filter-chip" + (currentGameFilter === g.id ? " active" : "");
        const icon = g.icon_url || faviconFromUrl(g.url);
        chip.innerHTML =
            (icon ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(icon) +
                "' onerror=\"this.style.display='none'\">" : "") +
            "<span>" + escapeHtml(g.name) + "</span>";
        chip.onclick = () => {
            currentGameFilter = g.id;
            loadGuilds().catch(e => errLog(e));
        };
        box.appendChild(chip);
    });
}

function populateGuildGameSelect(){
    const sel = $("guild-game-select"); if(!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Выберите игру —</option>';
    gamesCache.forEach(g => {
        const opt = document.createElement("option");
        opt.value = String(g.id);
        opt.textContent = g.name;
        sel.appendChild(opt);
    });
    // Если отфильтровано — предвыберем
    if(currentGameFilter > 0){
        sel.value = String(currentGameFilter);
    } else if(current){
        sel.value = current;
    }
}

async function loadGuilds(){
    const box = $("guilds-list"); if(!box) return;

    // Загружаем список игр для фильтра и селекта
    if(gamesCache.length === 0 && gamesAvailable){
        await loadGames();
    }
    populateGuildGameSelect();
    renderGuildGameFilter();

    // Запрос гильдий (с фильтром по игре)
    let query = supabaseClient.from("guilds").select("*");
    if(currentGameFilter > 0) query = query.eq("game_id", currentGameFilter);

    let { data, error } = await query.order("created_at", { ascending: false });

    // Если колонки game_id нет — показываем предупреждение
    if(error && /column.*game_id.*does not exist/i.test(error.message || "")){
        guildsGameIdAvailable = false;
        // Запрашиваем без фильтра
        const fallback = await supabaseClient.from("guilds").select("*")
            .order("created_at", { ascending: false });
        data = fallback.data;
        error = fallback.error;
    } else {
        guildsGameIdAvailable = true;
    }

    if(error){
        guildsAvailable = false;
        box.innerHTML =
            "<div class='dash-recent-empty'>" +
            "Раздел «Гильдии» требует создания таблиц <code>guilds</code> и <code>guild_members</code>.<br>" +
            "Смотрите SQL в комментарии в начале <code>app.js</code>." +
            "</div>";
        return;
    }
    guildsAvailable = true;
    guildsCache = data || [];

    // Подтягиваем состав гильдий
    guildMembersCache = {};
    try{
        const { data: members } = await supabaseClient
            .from("guild_members").select("guild_id, user_id, nickname, role");
        (members || []).forEach(m => {
            if(!guildMembersCache[m.guild_id]) guildMembersCache[m.guild_id] = [];
            guildMembersCache[m.guild_id].push(m);
        });
    }catch(e){ errLog("GUILD MEMBERS", e); }

    if(guildsCache.length === 0){
        const msg = currentGameFilter > 0
            ? "В этой игре пока нет гильдий. Создайте первую!"
            : "Гильдий пока нет. Создайте первую!";
        box.innerHTML = "<div class='dash-recent-empty'>" + msg + "</div>";
        return;
    }

    box.innerHTML = "";
    guildsCache.forEach(g => {
        const members = guildMembersCache[g.id] || [];
        const isMember = members.some(m => m.user_id === currentUser.id);
        const game = gamesCache.find(x => x.id === g.game_id);

        const card = document.createElement("div");
        card.className = "guild-card" + (currentGuildId === g.id ? " active" : "");
        card.innerHTML =
            "<h3>⚔ " + escapeHtml(g.name) + "</h3>" +
            "<p>" + escapeHtml((g.description || "").slice(0, 80)) + "</p>" +
            "<div class='guild-meta'>" +
                (game ? "<span class='guild-game-badge'>🎮 " + escapeHtml(game.name) + "</span>" : "") +
                "<span>👥 " + members.length + "</span>" +
                (isMember ? "<span class='joined-badge'>Вы в гильдии</span>" : "") +
            "</div>";
        card.onclick = () => openGuild(g.id);
        box.appendChild(card);
    });

    if(currentGuildId){
        const still = guildsCache.find(x => x.id === currentGuildId);
        if(still) openGuild(currentGuildId);
        else {
            currentGuildId = null;
            $("guild-detail").innerHTML =
                "<div class='guild-detail-empty'><div class='guild-detail-icon'>⚔</div>" +
                "<p>Выберите гильдию из списка</p></div>";
        }
    }
}

async function createGuild(){
    const user = await ensureAuth();
    if(!user){ alert("Нет авторизации"); return; }
    if(!guildsAvailable){ alert("Таблицы гильдий не созданы"); return; }
    if(!guildsGameIdAvailable){
        alert("Колонка guilds.game_id отсутствует. Выполните SQL:\n\n" +
              "alter table guilds add column if not exists game_id bigint references games(id) on delete set null;");
        return;
    }

    const gameId = parseInt($("guild-game-select").value, 10);
    const name = $("guild-name-input").value.trim();
    const description = $("guild-desc-input").value.trim();

    if(!gameId){ alert("Выберите игру"); $("guild-game-select").focus(); return; }
    if(!name || name.length < 2){ alert("Название: минимум 2 символа"); return; }

    const ins = await supabaseClient.from("guilds").insert({
        name,
        description: description || null,
        owner_id: user.id,
        game_id: gameId
    }).select().single();

    if(ins.error){
        errLog("CREATE GUILD", ins.error.message);
        alert("Ошибка: " + ins.error.message);
        return;
    }

    await supabaseClient.from("guild_members").insert({
        guild_id: ins.data.id,
        user_id: user.id,
        nickname: currentProfile?.nickname || "Player",
        role: "owner"
    });

    $("guild-name-input").value = "";
    $("guild-desc-input").value = "";

    currentGuildId = ins.data.id;
    await loadGuilds();
}

async function openGuild(guildId){
    currentGuildId = guildId;

    const guild = guildsCache.find(g => g.id === guildId);
    if(!guild) return;

    const members = guildMembersCache[guildId] || [];
    const isMember = members.some(m => m.user_id === currentUser.id);
    const game = gamesCache.find(x => x.id === guild.game_id);

    // Владелец
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

    const detail = $("guild-detail");
    detail.innerHTML =
        "<h2>⚔ " + escapeHtml(guild.name) + "</h2>" +
        (game
            ? "<div class='guild-detail-game'>" +
                "<img referrerpolicy='no-referrer' src='" +
                escapeHtml(game.icon_url || faviconFromUrl(game.url)) +
                "' onerror=\"this.style.display='none'\">" +
                "🎮 " + escapeHtml(game.name) + "</div>"
            : "<div class='guild-detail-game' style='background:#f8fafc;border-color:#e3e9f2;color:#98a2b5'>🎮 Игра не привязана</div>") +
        "<div class='guild-owner'>Владелец: <b>" + escapeHtml(ownerNick) + "</b></div>" +
        "<div class='guild-detail-desc'>" + escapeHtml(guild.description || "Без описания") + "</div>" +
        "<div class='guild-members-title'>Участники · " + members.length + "</div>" +
        "<div class='guild-members-list' id='guild-members-list'></div>" +
        "<div class='guild-detail-actions' id='guild-detail-actions'></div>";

    const membersList = $("guild-members-list");
    if(members.length === 0){
        membersList.innerHTML = "<span style='color:#98a2b5;font-size:13px'>Пока никого</span>";
    } else {
        members.forEach(m => {
            const chip = document.createElement("div");
            chip.className = "guild-member-chip";
            chip.innerHTML =
                escapeHtml(m.nickname || "Участник") +
                (m.role === "owner" ? " <span class='role-owner'>👑 владелец</span>" : "") +
                (m.user_id === currentUser.id ? " (вы)" : "");
            membersList.appendChild(chip);
        });
    }

    const actions = $("guild-detail-actions");

    // Кнопка перехода к игре в каталоге
    if(game){
        const openSite = document.createElement("button");
        openSite.className = "main-button secondary";
        openSite.type = "button";
        openSite.textContent = "🌐 Сайт игры";
        openSite.onclick = () => window.open(game.url, "_blank", "noopener");
        actions.appendChild(openSite);
    }

    if(isMember){
        const leave = document.createElement("button");
        leave.className = "main-button secondary";
        leave.type = "button";
        leave.textContent = "Покинуть гильдию";
        leave.onclick = () => leaveGuild(guildId, guild.owner_id === currentUser.id);
        actions.appendChild(leave);
    } else {
        const join = document.createElement("button");
        join.className = "main-button";
        join.type = "button";
        join.textContent = "Вступить";
        join.onclick = () => joinGuild(guildId);
        actions.appendChild(join);
    }
}

async function joinGuild(guildId){
    const user = await ensureAuth();
    if(!user) return;
    const ins = await supabaseClient.from("guild_members").insert({
        guild_id: guildId,
        user_id: user.id,
        nickname: currentProfile?.nickname || "Player",
        role: "member"
    });
    if(ins.error){ errLog("JOIN GUILD", ins.error.message); alert("Ошибка: " + ins.error.message); return; }
    await loadGuilds();
}

async function leaveGuild(guildId, isOwner){
    const user = await ensureAuth();
    if(!user) return;

    if(isOwner){
        const members = guildMembersCache[guildId] || [];
        if(members.length > 1){
            alert("Нельзя покинуть гильдию, пока в ней есть другие участники. Сначала передайте владение или удалите гильдию.");
            return;
        }
        if(!confirm("Вы владелец. Удалить гильдию?")) return;
        await supabaseClient.from("guilds").delete().eq("id", guildId);
        await supabaseClient.from("guild_members").delete().eq("guild_id", guildId);
        currentGuildId = null;
        $("guild-detail").innerHTML =
            "<div class='guild-detail-empty'><div class='guild-detail-icon'>⚔</div>" +
            "<p>Выберите гильдию из списка</p></div>";
        await loadGuilds();
        await loadGames();
        return;
    }

    const del = await supabaseClient.from("guild_members").delete()
        .eq("guild_id", guildId).eq("user_id", user.id);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    await loadGuilds();
    await loadGames();
}

/* ===== ПРОФИЛЬ ===== */
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
    if(!isValidHttpUrl(url)){
        setAvatarHint("Некорректная ссылка", "err"); setImage("profile-avatar", ""); return;
    }
    if(url !== raw){
        input.value = url;
        setAvatarHint("Ссылка нормализована: " + url, "loading");
    }
    setAvatarHint("Проверка ссылки…", "loading");
    const ok = await testImageUrl(url);
    if(ok){
        setAvatarHint("✓ Картинка загружена", "ok");
        setImage("profile-avatar", url);
    } else {
        setAvatarHint("✗ Не удалось загрузить. Проверьте прямую ссылку.", "err");
        setImage("profile-avatar", "");
    }
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
    }catch(err){
        setProfileStatus("Ошибка: " + err.message, "err");
    }finally{ savingProfile = false; }
}

/* ===== НОВОСТИ ===== */
async function loadNews(){
    const boxHome = $("news-list");
    const boxPage = $("news-page-list");

    const { data, error } = await supabaseClient
        .from("news").select("*").order("created_at", { ascending: false });

    const empty = "<p style='color:#888'>Новостей пока нет</p>";
    if(error){
        if(boxHome) boxHome.innerHTML = empty;
        if(boxPage) boxPage.innerHTML = empty;
        return;
    }
    if(!data || data.length === 0){
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

/* ===== ЧАТ ===== */
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

/* ===== КОНФЕРЕНЦИЯ ===== */
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

/* ===== УТИЛИТЫ ===== */
function switchPage(pageName){
    document.querySelectorAll(".menu-button").forEach(b => {
        b.classList.toggle("active", b.dataset.page === pageName);
    });
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = $(pageName);
    if(page) page.classList.add("active");
}

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

