/* =====================================================
   GAME PLATFORM — app.js
   Auth + Profile (полный CRUD) + Chat + Conference
===================================================== */

const SUPABASE_URL = "https://uvzaoobtysostmfwyfxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";
const MIROTALK_BASE = "https://p2p.mirotalk.com";

/* =====================================================
   СОСТОЯНИЕ
===================================================== */

let currentUser = null;
let currentProfile = null;
let chatChannel = null;
let currentRoom = null;
let roomsPollTimer = null;
let joiningRoom = false;
let savingProfile = false;

/* =====================================================
   ХЕЛПЕРЫ
===================================================== */

function $(id){ return document.getElementById(id); }
function log(...a){ console.log("[GP]", ...a); }
function errLog(...a){ console.error("[GP][ОШИБКА]", ...a); }

function escapeHtml(s){
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setAuthMessage(text, ok){
    const el = $("auth-message");
    if(!el) return;
    el.textContent = text || "";
    el.classList.toggle("ok", !!ok);
}

function setText(id, text){
    const el = $(id);
    if(el) el.textContent = text;
}

function setRoomStatus(text, cls){
    const el = $("room-status");
    if(!el) return;
    el.textContent = text || "";
    el.className = "room-status" + (cls ? " " + cls : "");
}

function setProfileStatus(text, cls){
    const el = $("profile-status");
    if(!el) return;
    el.textContent = text || "";
    el.className = "profile-status" + (cls ? " " + cls : "");
}

function setImage(id, url){
    const el = $(id);
    if(!el) return;
    const clean = (url || "").trim();
    el.onerror = () => { el.onerror = null; el.src = DEFAULT_AVATAR; };
    el.src = clean || DEFAULT_AVATAR;
}

async function ensureAuth(){
    if(currentUser && currentUser.id) return currentUser;
    try{
        const { data } = await supabaseClient.auth.getUser();
        if(data && data.user){ currentUser = data.user; return currentUser; }
        const session = await supabaseClient.auth.getSession();
        if(session.data && session.data.session && session.data.session.user){
            currentUser = session.data.session.user;
            return currentUser;
        }
    }catch(e){ errLog("ensureAuth", e); }
    return null;
}

/* =====================================================
   ВАЛИДАЦИЯ
===================================================== */

function isValidHttpUrl(str){
    if(!str) return true; // пусто — валидно
    try{
        const u = new URL(str);
        return u.protocol === "http:" || u.protocol === "https:";
    }catch(e){ return false; }
}

function isValidNickname(str){
    const s = (str || "").trim();
    return s.length >= 2 && s.length <= 30;
}

/* =====================================================
   СТАРТ
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    log("START");
    initAuth();
    initNavigation();
    initChat();
    initConference();
    initProfileForm();

    supabaseClient.auth.onAuthStateChange((event, session) => {
        log("AUTH EVENT:", event);
        if(event === "SIGNED_OUT"){ currentUser = null; }
        else if(session && session.user){ currentUser = session.user; }
    });

    checkSession();
});

/* =====================================================
   АВТОРИЗАЦИЯ
===================================================== */

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
            e.preventDefault();
            e.stopPropagation();
            setAuthMessage("Вход…", true);

            const email = $("login-email").value.trim();
            const password = $("login-password").value;

            try{
                const result = await supabaseClient.auth.signInWithPassword({ email, password });
                if(result.error){
                    errLog("LOGIN", result.error.message);
                    setAuthMessage(result.error.message);
                    return;
                }
                currentUser = result.data.user;
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
            e.preventDefault();
            e.stopPropagation();
            setAuthMessage("Регистрация…", true);

            const nickname = $("register-nickname").value.trim() || "Player";
            const email = $("register-email").value.trim();
            const password = $("register-password").value;

            try{
                const result = await supabaseClient.auth.signUp({
                    email, password, options: { data: { nickname } }
                });

                if(result.error){
                    errLog("REGISTER", result.error.message);
                    setAuthMessage(result.error.message);
                    return;
                }

                const user = result.data.user;
                if(!user){
                    setAuthMessage("Проверьте email для подтверждения.", true);
                    return;
                }

                try{
                    await supabaseClient.from("profiles").insert({
                        id: user.id, nickname,
                        avatar_url: DEFAULT_AVATAR,
                        vip_level: 0
                    });
                }catch(err){ errLog("PROFILE CREATE EXC", err); }

                if(!result.data.session){
                    setAuthMessage("Регистрация успешна. Подтвердите email.", true);
                    if(loginTab) loginTab.click();
                    return;
                }

                currentUser = user;
                setAuthMessage("");
                openApp();
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
                closeMiroTalkRoom();
                await supabaseClient.auth.signOut();
                location.reload();
            }catch(e){
                errLog("LOGOUT", e);
                location.reload();
            }
        };
    }
}

async function checkSession(){
    try{
        const { data } = await supabaseClient.auth.getSession();
        if(data.session && data.session.user){
            currentUser = data.session.user;
            log("SESSION", currentUser.id);
            openApp();
        }
    }catch(e){ errLog("SESSION", e); }
}

/* =====================================================
   ОТКРЫТИЕ ПРИЛОЖЕНИЯ
===================================================== */

async function openApp(){
    const auth = $("auth-screen");
    const app = $("app");
    if(auth) auth.classList.add("hidden");
    if(app) app.classList.remove("hidden");

    log("APP OPEN");

    if(currentUser){
        try{
            await supabaseClient.from("conference_users").delete().eq("user_id", currentUser.id);
        }catch(e){ errLog("STALE CLEANUP", e); }
    }

    await safeRun(loadProfile);
    await safeRun(loadNews);
    await safeRun(loadMessages);
    startChatRealtime();
    await safeRun(loadRooms);

    if(roomsPollTimer) clearInterval(roomsPollTimer);
    roomsPollTimer = setInterval(() => {
        loadRooms().catch(e => errLog("ROOMS POLL", e));
    }, 5000);
}

async function safeRun(fn){
    try{ await fn(); }
    catch(e){ errLog(fn.name, e); }
}

/* =====================================================
   НАВИГАЦИЯ
===================================================== */

function initNavigation(){
    const buttons = document.querySelectorAll(".menu-button[data-page]");
    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
            const page = $(btn.dataset.page);
            if(page) page.classList.add("active");

            if(btn.dataset.page === "conference") loadRooms().catch(e => errLog(e));
            if(btn.dataset.page === "chat") loadMessages().catch(e => errLog(e));
            if(btn.dataset.page === "profile") loadProfile().catch(e => errLog(e));
        };
    });
}

/* =====================================================
   ПРОФИЛЬ
===================================================== */

async function loadProfile(){
    const user = await ensureAuth();
    if(!user) return;

    let result = await supabaseClient
        .from("profiles").select("*").eq("id", user.id).maybeSingle();

    if(result.error){ errLog("PROFILE SELECT", result.error.message); return; }

    if(!result.data){
        const fallbackNick = user.email ? user.email.split("@")[0] : "Player";
        const create = await supabaseClient.from("profiles").insert({
            id: user.id, nickname: fallbackNick,
            avatar_url: DEFAULT_AVATAR, vip_level: 0
        });
        if(create.error){ errLog("PROFILE INSERT", create.error.message); return; }
        return loadProfile();
    }

    currentProfile = result.data;
    applyProfileToUI(currentProfile);
    fillProfileForm(currentProfile);
}

function applyProfileToUI(p){
    if(!p) return;

    // Топбар
    setText("top-name", p.nickname || "Player");
    setImage("top-avatar", p.avatar_url);

    // Карточка профиля
    setText("profile-name", p.nickname || "Player");
    setText("vip-level", "VIP " + (p.vip_level || 0));
    setImage("profile-avatar", p.avatar_url);
    setText("profile-id", p.id || "—");

    // Правая панель
    setText("side-name", p.nickname || "Player");
    setText("side-vip", "VIP " + (p.vip_level || 0));
    setImage("side-avatar", p.avatar_url);
}

function fillProfileForm(p){
    if(!p) return;
    if($("pf-nickname")) $("pf-nickname").value = p.nickname || "";
    if($("pf-avatar")) $("pf-avatar").value = p.avatar_url || "";
    if($("pf-city")) $("pf-city").value = p.city || "";
    if($("pf-age")) $("pf-age").value = (p.age == null ? "" : p.age);
    if($("pf-about")) $("pf-about").value = p.about || "";
    updateAboutCounter();
}

function updateAboutCounter(){
    const ta = $("pf-about");
    const counter = $("pf-about-count");
    if(ta && counter) counter.textContent = ta.value.length;
}

function initProfileForm(){
    const form = $("profile-form");
    if(!form) return;

    // Live-превью аватара
    const avatarInput = $("pf-avatar");
    if(avatarInput){
        avatarInput.addEventListener("input", () => {
            const url = avatarInput.value.trim();
            const img = $("profile-avatar");
            if(!img) return;
            if(!url){
                img.src = DEFAULT_AVATAR;
                return;
            }
            if(isValidHttpUrl(url)){
                img.onerror = () => { img.onerror = null; img.src = DEFAULT_AVATAR; };
                img.src = url;
            }
        });
    }

    // Счётчик символов "о себе"
    const aboutInput = $("pf-about");
    if(aboutInput){
        aboutInput.addEventListener("input", updateAboutCounter);
    }

    // Кнопка «Сохранить»
    const saveBtn = $("save-profile");
    if(saveBtn) saveBtn.onclick = saveProfileChanges;

    // Кнопка «Сбросить»
    const resetBtn = $("reset-profile");
    if(resetBtn) resetBtn.onclick = () => {
        if(!currentProfile){ return; }
        fillProfileForm(currentProfile);
        setProfileStatus("Изменения сброшены");
        setTimeout(() => setProfileStatus(""), 1500);
    };
}

async function saveProfileChanges(){
    if(savingProfile) return;

    const user = await ensureAuth();
    if(!user){ setProfileStatus("Нет авторизации", "err"); return; }

    // ---- Валидация ----
    const nickname = ($("pf-nickname").value || "").trim();
    const avatarUrl = ($("pf-avatar").value || "").trim();
    const city = ($("pf-city").value || "").trim();
    const ageRaw = $("pf-age").value;
    const about = ($("pf-about").value || "").trim();

    if(!isValidNickname(nickname)){
        setProfileStatus("Никнейм: 2–30 символов", "err");
        $("pf-nickname").focus();
        return;
    }

    if(avatarUrl && !isValidHttpUrl(avatarUrl)){
        setProfileStatus("Ссылка на аватар некорректна (нужен http/https)", "err");
        $("pf-avatar").focus();
        return;
    }

    let age = null;
    if(ageRaw !== ""){
        const n = parseInt(ageRaw, 10);
        if(isNaN(n) || n < 1 || n > 120){
            setProfileStatus("Возраст: от 1 до 120", "err");
            $("pf-age").focus();
            return;
        }
        age = n;
    }

    if(city.length > 40){
        setProfileStatus("Город: до 40 символов", "err");
        return;
    }

    if(about.length > 300){
        setProfileStatus("О себе: до 300 символов", "err");
        return;
    }

    // ---- Проверка уникальности никнейма ----
    // (если поле nickname в БД не unique — защищаемся вручную)
    if(!currentProfile || nickname !== currentProfile.nickname){
        savingProfile = true;
        setProfileStatus("Проверка никнейма…", "loading");

        const { data: dup, error: dupErr } = await supabaseClient
            .from("profiles")
            .select("id, nickname")
            .eq("nickname", nickname)
            .neq("id", user.id)
            .maybeSingle();

        if(dupErr && dupErr.code !== "PGRST116"){
            errLog("DUP CHECK", dupErr.message);
        }

        if(dup && dup.id){
            savingProfile = false;
            setProfileStatus("Никнейм уже занят", "err");
            $("pf-nickname").focus();
            return;
        }
    }

    // ---- Сохранение ----
    savingProfile = true;
    setProfileStatus("Сохранение…", "loading");

    const payload = {
        nickname,
        avatar_url: avatarUrl || null,
        city: city || null,
        age: age,
        about: about || null
    };

    try{
        const update = await supabaseClient
            .from("profiles")
            .update(payload)
            .eq("id", user.id)
            .select()
            .single();

        if(update.error){
            errLog("PROFILE SAVE", update.error.message);
            setProfileStatus("Ошибка: " + update.error.message, "err");
            savingProfile = false;
            return;
        }

        currentProfile = update.data;
        applyProfileToUI(currentProfile);
        setProfileStatus("Сохранено ✓");
        setTimeout(() => setProfileStatus(""), 2200);

    }catch(err){
        errLog("PROFILE SAVE EXC", err);
        setProfileStatus("Ошибка: " + err.message, "err");
    }finally{
        savingProfile = false;
    }
}

/* =====================================================
   НОВОСТИ
===================================================== */

async function loadNews(){
    const box = $("news-list");
    if(!box) return;

    const result = await supabaseClient.from("news").select("*")
        .order("created_at", { ascending: false });

    if(result.error){
        box.innerHTML = "<p style='color:#888'>Новостей пока нет</p>";
        return;
    }
    if(!result.data || result.data.length === 0){
        box.innerHTML = "<p style='color:#888'>Новостей пока нет</p>";
        return;
    }

    box.innerHTML = "";
    result.data.forEach(item => {
        const div = document.createElement("div");
        div.className = "news-item";
        div.innerHTML =
            "<h3>" + escapeHtml(item.title || "") + "</h3>" +
            "<p>" + escapeHtml(item.text || "") + "</p>";
        box.appendChild(div);
    });
}

/* =====================================================
   ЧАТ
===================================================== */

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

    const input = $("message-text");
    if(!input) return;
    const text = input.value.trim();
    if(!text) return;

    let nickname = "Player";
    if(currentProfile && currentProfile.nickname) nickname = currentProfile.nickname;
    else {
        const profile = await supabaseClient
            .from("profiles").select("nickname").eq("id", user.id).maybeSingle();
        if(profile.data && profile.data.nickname) nickname = profile.data.nickname;
    }

    const result = await supabaseClient.from("messages").insert({
        user_id: user.id, nickname, text
    });

    if(result.error){
        errLog("MESSAGE INSERT", result.error.message);
        alert("Ошибка отправки: " + result.error.message);
        return;
    }
    input.value = "";
}

async function loadMessages(){
    const box = $("messages");
    if(!box) return;

    const result = await supabaseClient.from("messages").select("*")
        .order("created_at", { ascending: true }).limit(300);

    if(result.error){
        box.innerHTML = "<div class='chat-message'>Ошибка: " + escapeHtml(result.error.message) + "</div>";
        return;
    }
    box.innerHTML = "";
    (result.data || []).forEach(m => appendMessage(m));
    box.scrollTop = box.scrollHeight;
}

function appendMessage(m){
    const box = $("messages");
    if(!box) return;
    const isOwn = currentUser && m.user_id === currentUser.id;
    const div = document.createElement("div");
    div.className = "chat-message" + (isOwn ? " own" : "");
    const time = m.created_at
        ? new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        : "";
    div.innerHTML =
        "<b>" + escapeHtml(m.nickname || "Гость") + "</b>" +
        "<div class='msg-text'>" + escapeHtml(m.text || "") + "</div>" +
        "<span class='msg-time'>" + escapeHtml(time) + "</span>";
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function startChatRealtime(){
    if(chatChannel) return;
    chatChannel = supabaseClient
        .channel("public-messages")
        .on("postgres_changes",
            { event: "INSERT", schema: "public", table: "messages" },
            (payload) => appendMessage(payload.new))
        .subscribe();
}

/* =====================================================
   КОНФЕРЕНЦИЯ (MiroTalk P2P)
===================================================== */

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

    const result = await supabaseClient
        .from("conference_rooms")
        .insert({ name, description: description || null })
        .select().single();

    if(result.error){
        errLog("CREATE ROOM", result.error.message);
        setRoomStatus("Ошибка создания: " + result.error.message, "err");
        return;
    }

    $("room-name-input").value = "";
    $("room-desc-input").value = "";
    setRoomStatus("");

    await loadRooms();
    await joinRoom(result.data);
}

async function loadRooms(){
    const box = $("rooms-list");
    if(!box) return;

    const roomsRes = await supabaseClient.from("conference_rooms").select("*").order("id");
    if(roomsRes.error){
        box.innerHTML = "<p style='color:#888'>Ошибка загрузки комнат</p>";
        return;
    }
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

    const sorted = rooms.slice().sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));

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
        btn.className = "main-button";
        btn.type = "button";
        btn.textContent = "Войти";
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
        if(!user){ setRoomStatus("Требуется вход в аккаунт", "err"); return; }

        await supabaseClient.from("conference_users").delete().eq("user_id", user.id);

        const nickname = (currentProfile && currentProfile.nickname) || "Player";
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
        if(!container){ errLog("MIROTALK CONTAINER NOT FOUND"); return; }

        container.innerHTML =
            '<iframe ' +
            'src="' + miroUrl + '" ' +
            'allow="camera; microphone; speaker-selection; display-capture; fullscreen; clipboard-read; clipboard-write; web-share; autoplay; picture-in-picture" ' +
            'allowfullscreen ' +
            'style="width:100%;height:100%;border:0;"></iframe>';

        setText("current-room-title", "🎙 " + (room.name || "Комната"));
        setRoomStatus("Подключено к MiroTalk P2P", "ok");

        log("JOINED", miroRoomId);
    }catch(err){
        errLog("JOIN EXC", err);
        setRoomStatus("Ошибка: " + err.message, "err");
    }finally{
        joiningRoom = false;
    }
}

function closeMiroTalkRoom(){
    const container = $("mirotalk-container");
    if(!container) return;
    container.innerHTML =
        '<div class="mirotalk-placeholder" id="mirotalk-placeholder">' +
        '<div class="mirotalk-placeholder-icon">🎥</div>' +
        '<p>Выберите комнату из списка слева, чтобы начать конференцию</p>' +
        '</div>';
}

async function leaveRoom(){
    const user = await ensureAuth();

    if(currentRoom && user){
        try{
            await supabaseClient
                .from("conference_users")
                .delete()
                .eq("user_id", user.id)
                .eq("room_id", currentRoom.id);
        }catch(e){ errLog("LEAVE DB", e); }
    }

    closeMiroTalkRoom();
    setText("current-room-title", "Комната не выбрана");
    setRoomStatus("");
    currentRoom = null;

    await loadRooms();
    log("LEFT ROOM");
}

/* =====================================================
   BEFORE UNLOAD
===================================================== */

window.addEventListener("beforeunload", () => {
    if(currentRoom && currentUser){
        try{
            supabaseClient
                .from("conference_users")
                .delete()
                .eq("user_id", currentUser.id)
                .eq("room_id", currentRoom.id);
        }catch(e){}
    }
});

/* =====================================================
   END
===================================================== */
