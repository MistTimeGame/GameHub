/* =====================================================
   GAME PLATFORM — app.js
   Auth + Profile + Chat + Conference + Online + Games + Guilds
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

// online presence
let presenceChannel = null;
let onlineUsers = {}; // userId -> { user_id, nickname, avatar_url, online_at }

// games
let tttBoard = ["","","","","","","","",""];
let tttGameOver = false;
let tttScore = { wins:0, draws:0, losses:0 };

// guilds
let guildsCache = [];
let guildMembersCache = {};
let currentGuildId = null;
let guildsAvailable = true;

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
    el.textContent = t || "Прямая ссылка на картинку (jpg, png, webp, gif). Не ссылка на страницу!";
    el.className = "field-hint" + (cls ? " " + cls : "");
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

/* ===== URL ===== */
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

/* ===== АВТОРИЗАЦИЯ ===== */
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

/* ===== ОТКРЫТИЕ APP ===== */
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

    startChatRealtime();
    initOnlinePresence();

    await safeRun(loadRooms);
    await safeRun(loadGuilds);

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
            if(p === "guilds") loadGuilds().catch(e => errLog(e));
            if(p === "online") renderOnlinePage();
        };
    });
}

/* ============================================================
   ONLINE PRESENCE
============================================================ */
function initOnlinePresence(){
    if(!currentUser) return;
    if(presenceChannel) return;

    presenceChannel = supabaseClient.channel("online-users", {
        config: { presence: { key: currentUser.id } }
    });

    presenceChannel
        .on("presence", { event: "sync" }, () => {
            const state = presenceChannel.presenceState();
            buildOnlineUsers(state);
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
                log("PRESENCE TRACKED");
            }
        });
}

function buildOnlineUsers(state){
    onlineUsers = {};
    Object.keys(state).forEach(key => {
        const arr = state[key] || [];
        arr.forEach(item => {
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
    const box = $("online-list-page");
    if(!box) return;
    const list = Object.values(onlineUsers);
    setText("online-page-count", String(list.length));

    if(list.length === 0){
        box.innerHTML = "<div class='dash-recent-empty'>Никого нет онлайн</div>";
        return;
    }

    box.innerHTML = "";
    list.sort((a,b) => (a.nickname || "").localeCompare(b.nickname || ""));
    list.forEach(u => {
        const div = document.createElement("div");
        div.className = "online-user-card";
        const nick = u.nickname || "Player";
        const isMe = u.user_id === currentUser.id;
        const initial = nick[0].toUpperCase();
        div.innerHTML =
            "<div class='online-user-avatar'>" +
                (u.avatar_url
                    ? "<img referrerpolicy='no-referrer' src='" + escapeHtml(u.avatar_url) + "' onerror=\"this.style.display='none';this.parentNode.textContent='" + escapeHtml(initial) + "'\">"
                    : escapeHtml(initial)) +
            "</div>" +
            "<div>" +
                "<div class='online-user-name'>" + escapeHtml(nick) + (isMe ? " (вы)" : "") + "</div>" +
                "<div class='online-user-meta'>🟢 в сети</div>" +
            "</div>";
        box.appendChild(div);
    });
}

/* ============================================================
   ГЛАВНАЯ — ДАШБОРД
============================================================ */
async function loadHomeStats(){
    // Онлайн — из presence
    updateOnlineCounters();

    // Комнаты
    try{
        const { data } = await supabaseClient.from("conference_rooms").select("id");
        setText("dash-rooms", String((data || []).length));
    }catch(e){ setText("dash-rooms", "—"); }

    // Сообщения
    try{
        const { count } = await supabaseClient
            .from("messages").select("*", { count: "exact", head: true });
        setText("dash-messages", String(count || 0));
    }catch(e){ setText("dash-messages", "—"); }

    // Гильдии
    try{
        const { count } = await supabaseClient
            .from("guilds").select("*", { count: "exact", head: true });
        setText("dash-guilds", String(count || 0));
    }catch(e){ setText("dash-guilds", "—"); }
}

async function loadHomeRecentMessages(){
    const box = $("home-recent-messages");
    if(!box) return;

    const { data, error } = await supabaseClient
        .from("messages").select("nickname, text, created_at")
        .order("created_at", { ascending: false }).limit(8);

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
        const text = (m.text || "").slice(0, 90) + ((m.text || "").length > 90 ? "…" : "");
        div.innerHTML =
            "<b>" + escapeHtml(m.nickname || "Гость") + "</b>" +
            "<span class='dash-recent-time'>" + escapeHtml(time) + "</span>" +
            "<div>" + escapeHtml(text) + "</div>";
        box.appendChild(div);
    });
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
        log("SCHEMA:", Array.from(columns));
        applySchemaVisibility();
        if(row){
            currentProfile = row;
            applyProfileToUI(row);
            fillProfileForm(row);
            return;
        }
    }

    const cols = Array.from(availableColumns).join(",");
    let result = await supabaseClient
        .from("profiles").select(cols).eq("id", user.id).maybeSingle();

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
    const input = $("pf-avatar"), img = $("profile-avatar");
    if(!input || !img) return;

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

    if(!isValidNickname(nickname)){
        setProfileStatus("Никнейм: 2–30 символов", "err"); return;
    }
    if(avatarUrl && !isValidHttpUrl(avatarUrl)){
        setProfileStatus("Ссылка на аватар некорректна", "err"); return;
    }
    let age = null;
    if(ageRaw !== ""){
        const n = parseInt(ageRaw, 10);
        if(isNaN(n) || n < 1 || n > 120){ setProfileStatus("Возраст: 1–120", "err"); return; }
        age = n;
    }
    if(city.length > 40){ setProfileStatus("Город: до 40 символов", "err"); return; }
    if(about.length > 300){ setProfileStatus("О себе: до 300 символов", "err"); return; }

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
        if(!ok){ setProfileStatus("Аватар не загрузился: ссылка не ведёт на изображение", "err"); return; }
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

        // Обновляем presence, чтобы в онлайне подтянулся новый ник
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

/* ============================================================
   НОВОСТИ
============================================================ */
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

    let nickname = "Player";
    if(currentProfile && currentProfile.nickname) nickname = currentProfile.nickname;

    const result = await supabaseClient.from("messages").insert({
        user_id: user.id, nickname, text
    });
    if(result.error){ errLog("MSG INSERT", result.error.message); alert("Ошибка: " + result.error.message); return; }

    input.value = "";
    loadHomeRecentMessages().catch(e => errLog(e));
}

async function loadMessages(){
    const box = $("messages");
    if(!box) return;

    const { data, error } = await supabaseClient
        .from("messages").select("*").order("created_at", { ascending: true }).limit(300);

    if(error){
        box.innerHTML = "<div class='chat-message'><div class='chat-body'>Ошибка: " +
            escapeHtml(error.message) + "</div></div>";
        return;
    }

    // Подгружаем профили для аватарок
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
   ИГРЫ — Крестики-нолики
============================================================ */
function initGames(){
    const board = $("ttt-board");
    if(!board) return;

    const saved = localStorage.getItem("ttt-score");
    if(saved){
        try{ tttScore = JSON.parse(saved); }catch(e){}
    }
    renderTttScore();

    document.getElementById("ttt-reset")?.addEventListener("click", newTttGame);

    // Переключение карточек (пока только ttt активна)
    document.querySelectorAll(".game-card").forEach(card => {
        card.onclick = () => {
            if(card.classList.contains("disabled")) return;
            document.querySelectorAll(".game-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
        };
    });

    newTttGame();
}

function newTttGame(){
    tttBoard = ["","","","","","","","",""];
    tttGameOver = false;
    setText("ttt-status", "Ваш ход (❌)");
    renderTttBoard();
}

function renderTttBoard(){
    const board = $("ttt-board"); if(!board) return;
    board.innerHTML = "";
    tttBoard.forEach((val, i) => {
        const cell = document.createElement("div");
        cell.className = "ttt-cell";
        if(val){ cell.classList.add("filled"); cell.classList.add(val.toLowerCase()); }
        cell.textContent = val === "X" ? "❌" : val === "O" ? "⭕" : "";
        cell.onclick = () => tttPlay(i);
        board.appendChild(cell);
    });
}

function tttPlay(i){
    if(tttGameOver || tttBoard[i] !== "") return;
    tttBoard[i] = "X";
    renderTttBoard();
    if(checkTTTEnd()) return;
    setTimeout(() => {
        const aiMove = tttBestMove(tttBoard, "O");
        if(aiMove !== -1){
            tttBoard[aiMove] = "O";
            renderTttBoard();
            checkTTTEnd();
        }
    }, 250);
}

function checkTTTEnd(){
    const win = tttWinner(tttBoard);
    if(win){
        tttGameOver = true;
        highlightTTTWin(win.line);
        if(win.player === "X"){
            tttScore.wins++;
            setText("ttt-status", "🎉 Вы победили!");
        } else {
            tttScore.losses++;
            setText("ttt-status", "🤖 ИИ победил");
        }
        saveTttScore();
        renderTttScore();
        return true;
    }
    if(tttBoard.every(v => v !== "")){
        tttGameOver = true;
        tttScore.draws++;
        setText("ttt-status", "🤝 Ничья");
        saveTttScore();
        renderTttScore();
        return true;
    }
    setText("ttt-status", "Ваш ход (❌)");
    return false;
}

function tttWinner(b){
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for(const [a,b2,c] of lines){
        if(b[a] && b[a] === b[b2] && b[a] === b[c]){
            return { player: b[a], line: [a,b2,c] };
        }
    }
    return null;
}

function highlightTTTWin(line){
    const cells = document.querySelectorAll(".ttt-cell");
    line.forEach(idx => cells[idx]?.classList.add("win"));
}

function tttBestMove(b, ai){
    const human = ai === "O" ? "X" : "O";

    // 1. Победить
    for(let i=0;i<9;i++){
        if(b[i] === ""){
            b[i] = ai;
            if(tttWinner(b)){ b[i] = ""; return i; }
            b[i] = "";
        }
    }
    // 2. Заблокировать
    for(let i=0;i<9;i++){
        if(b[i] === ""){
            b[i] = human;
            if(tttWinner(b)){ b[i] = ""; return i; }
            b[i] = "";
        }
    }
    // 3. Центр
    if(b[4] === "") return 4;
    // 4. Углы
    const corners = [0,2,6,8].filter(i => b[i] === "");
    if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
    // 5. Любой свободный
    const free = b.map((v,i) => v === "" ? i : -1).filter(i => i !== -1);
    return free.length ? free[Math.floor(Math.random()*free.length)] : -1;
}

function renderTttScore(){
    setText("ttt-wins", String(tttScore.wins));
    setText("ttt-draws", String(tttScore.draws));
    setText("ttt-losses", String(tttScore.losses));
}
function saveTttScore(){
    try{ localStorage.setItem("ttt-score", JSON.stringify(tttScore)); }catch(e){}
}

/* ============================================================
   ГИЛЬДИИ
============================================================ */
function initGuilds(){
    const btn = $("guild-create-btn");
    if(btn) btn.onclick = createGuild;
}

async function loadGuilds(){
    const box = $("guilds-list");
    if(!box) return;

    const { data, error } = await supabaseClient
        .from("guilds").select("*").order("created_at", { ascending: false });

    if(error){
        guildsAvailable = false;
        box.innerHTML =
            "<div class='dash-recent-empty'>" +
            "Раздел «Гильдии» требует создания таблиц в Supabase.<br><br>" +
            "Откройте SQL Editor и выполните запрос из комментария в начале файла <code>app.js</code>." +
            "</div>";
        return;
    }
    guildsAvailable = true;
    guildsCache = data || [];

    if(guildsCache.length === 0){
        box.innerHTML = "<div class='dash-recent-empty'>Гильдий пока нет. Создайте первую!</div>";
        return;
    }

    // Загружаем состав гильдий
    guildMembersCache = {};
    try{
        const { data: members } = await supabaseClient
            .from("guild_members").select("guild_id, user_id, nickname, role");
        (members || []).forEach(m => {
            if(!guildMembersCache[m.guild_id]) guildMembersCache[m.guild_id] = [];
            guildMembersCache[m.guild_id].push(m);
        });
    }catch(e){ errLog("GUILD MEMBERS", e); }

    box.innerHTML = "";
    guildsCache.forEach(g => {
        const members = guildMembersCache[g.id] || [];
        const isMember = members.some(m => m.user_id === currentUser.id);

        const card = document.createElement("div");
        card.className = "guild-card" + (currentGuildId === g.id ? " active" : "");
        card.innerHTML =
            "<h3>⚔ " + escapeHtml(g.name) + "</h3>" +
            "<p>" + escapeHtml((g.description || "").slice(0, 80)) + "</p>" +
            "<div class='guild-meta'>" +
                "<span>👥 " + members.length + "</span>" +
                (isMember ? "<span class='joined-badge'>Вы в гильдии</span>" : "") +
            "</div>";
        card.onclick = () => openGuild(g.id);
        box.appendChild(card);
    });

    // Если открыта какая-то — обновим детали
    if(currentGuildId) openGuild(currentGuildId);
}

async function createGuild(){
    const user = await ensureAuth();
    if(!user){ alert("Нет авторизации"); return; }
    if(!guildsAvailable){ alert("Таблицы гильдий не созданы"); return; }

    const name = $("guild-name-input").value.trim();
    const description = $("guild-desc-input").value.trim();
    if(!name){ alert("Введите название"); return; }

    const ins = await supabaseClient.from("guilds").insert({
        name, description: description || null, owner_id: user.id
    }).select().single();

    if(ins.error){
        errLog("CREATE GUILD", ins.error.message);
        alert("Ошибка: " + ins.error.message);
        return;
    }

    // Автоматически вступаем как владелец
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
    document.querySelectorAll(".guild-card").forEach(c => c.classList.remove("active"));

    const guild = guildsCache.find(g => g.id === guildId);
    if(!guild) return;

    const members = guildMembersCache[guildId] || [];
    const isMember = members.some(m => m.user_id === currentUser.id);

    // Владелец
    let ownerNick = "—";
    if(guild.owner_id){
        const ownerMember = members.find(m => m.user_id === guild.owner_id);
        if(ownerMember) ownerNick = ownerMember.nickname || "—";
        else {
            const p = await supabaseClient.from("profiles").select("nickname").eq("id", guild.owner_id).maybeSingle();
            if(p.data) ownerNick = p.data.nickname || "—";
        }
    }

    const detail = $("guild-detail");
    detail.innerHTML =
        "<h2>⚔ " + escapeHtml(guild.name) + "</h2>" +
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
        return;
    }

    const del = await supabaseClient.from("guild_members").delete()
        .eq("guild_id", guildId).eq("user_id", user.id);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    await loadGuilds();
}

/* ============================================================
   КОНФЕРЕНЦИЯ (MiroTalk P2P)
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
    if(!name){ alert("Введите название комнаты"); return; }

    setRoomStatus("Создание комнаты…");
    const result = await supabaseClient.from("conference_rooms")
        .insert({ name, description: description || null }).select().single();

    if(result.error){
        errLog("CREATE ROOM", result.error.message);
        setRoomStatus("Ошибка: " + result.error.message, "err"); return;
    }
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

    if(rooms.length === 0){
        box.innerHTML = "<p style='color:#888'>Комнат пока нет. Создайте первую!</p>";
        return;
    }
    const sorted = rooms.slice().sort((a, b) => (counts[b.id]||0) - (counts[a.id]||0));

    box.innerHTML = "";
    sorted.forEach(room => {
        const count = counts[room.id] || 0;
        const card = document.createElement("div");
        card.className = "room-card";
        card.innerHTML =
            "<h3>🎙 " + escapeHtml(room.name || "Комната") + "</h3>" +
            "<p>" + escapeHtml(room.description || "") + "</p>" +
            "<p>👥 " + count + (count === 1 ? " участник" : " участников") + "</p>";
        const btn = document.createElement("button");
        btn.className = "main-button"; btn.type = "button"; btn.textContent = "Войти";
        btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); joinRoom(room); };
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

/* ===== BEFORE UNLOAD ===== */
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

/* ============================================================
   END
============================================================ */
