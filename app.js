/* =====================================================
   GAME PLATFORM — app.js
   VERSION: AUTH FIX + ROOM JOIN FIX
===================================================== */

const SUPABASE_URL = "https://uvzaoobtysostmfwyfxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";

/* =====================================================
   СОСТОЯНИЕ
===================================================== */

let currentUser = null;
let chatChannel = null;

let currentRoom = null;
let localStream = null;
let screenStream = null;
let microphoneEnabled = false;
let peers = {};
let videoSenders = {};
let pendingCandidates = {};
let nicknames = {};
let signalChannel = null;
let signalReady = false;
let usersPollTimer = null;
let roomsPollTimer = null;
let roomUsersChannel = null;
let dummyVideoTrack = null;
let joiningRoom = false;

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

function setImage(id, url){
    const el = $(id);
    if(!el) return;
    const clean = (url || "").trim();
    el.onerror = () => { el.onerror = null; el.src = DEFAULT_AVATAR; };
    el.src = clean || DEFAULT_AVATAR;
}

/* =====================================================
   ГАРАНТИЯ АВТОРИЗАЦИИ
   Всегда возвращает актуального пользователя.
   Если currentUser потерян — перезапрашивает у Supabase.
===================================================== */

async function ensureAuth(){
    if(currentUser && currentUser.id){
        return currentUser;
    }
    try{
        const { data, error } = await supabaseClient.auth.getUser();
        if(error){
            errLog("ensureAuth getUser error", error.message);
        }
        if(data && data.user){
            currentUser = data.user;
            return currentUser;
        }
        const session = await supabaseClient.auth.getSession();
        if(session.data && session.data.session && session.data.session.user){
            currentUser = session.data.session.user;
            return currentUser;
        }
    }catch(e){
        errLog("ensureAuth exception", e);
    }
    return null;
}

/* =====================================================
   DUMMY VIDEO TRACK
===================================================== */

function getDummyVideoTrack(){
    if(dummyVideoTrack && dummyVideoTrack.readyState === "live"){
        return dummyVideoTrack;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext("2d");

    const draw = () => {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#8ba1c2";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Нет трансляции", canvas.width / 2, canvas.height / 2);
    };

    draw();
    const stream = canvas.captureStream(5);
    dummyVideoTrack = stream.getVideoTracks()[0];
    setInterval(draw, 1000);
    return dummyVideoTrack;
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

    // Слушаем изменения auth-состояния — критично для стабильности
    supabaseClient.auth.onAuthStateChange((event, session) => {
        log("AUTH EVENT:", event);
        if(event === "SIGNED_OUT"){
            currentUser = null;
        } else if(session && session.user){
            currentUser = session.user;
        }
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
                    errLog("LOGIN ERROR", result.error.message);
                    setAuthMessage(result.error.message);
                    return;
                }
                currentUser = result.data.user;
                log("LOGIN OK", currentUser.id);
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
                    errLog("REGISTER ERROR", result.error.message);
                    setAuthMessage(result.error.message);
                    return;
                }

                const user = result.data.user;
                if(!user){
                    setAuthMessage("Проверьте email для подтверждения.", true);
                    return;
                }

                try{
                    const ins = await supabaseClient.from("profiles").insert({
                        id: user.id, nickname, avatar_url: DEFAULT_AVATAR, vip_level: 0
                    });
                    if(ins.error) errLog("PROFILE CREATE ERROR", ins.error.message);
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
                await leaveRoom();
                await supabaseClient.auth.signOut();
                location.reload();
            }catch(e){
                errLog("LOGOUT ERROR", e);
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
            log("SESSION FOUND", currentUser.id);
            openApp();
        } else {
            log("NO SESSION — auth screen");
        }
    }catch(e){ errLog("SESSION ERROR", e); }
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

    // Автоочистка stale-записей пользователя из конференций
    if(currentUser){
        try{
            await supabaseClient
                .from("conference_users")
                .delete()
                .eq("user_id", currentUser.id);
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
    if(!user){ log("NO USER — PROFILE SKIPPED"); return; }

    let result = await supabaseClient
        .from("profiles").select("*").eq("id", user.id).maybeSingle();

    if(result.error){ errLog("PROFILE SELECT ERROR", result.error.message); return; }

    if(!result.data){
        const fallbackNick = user.email ? user.email.split("@")[0] : "Player";
        const create = await supabaseClient.from("profiles").insert({
            id: user.id, nickname: fallbackNick,
            avatar_url: DEFAULT_AVATAR, vip_level: 0
        });
        if(create.error){ errLog("PROFILE INSERT ERROR", create.error.message); return; }
        return loadProfile();
    }

    const profile = result.data;
    setText("top-name", profile.nickname || "Player");
    setText("profile-name", profile.nickname || "Player");
    setText("side-name", profile.nickname || "Player");
    setText("vip-level", "VIP " + (profile.vip_level || 0));
    setText("side-vip", "VIP " + (profile.vip_level || 0));
    setImage("top-avatar", profile.avatar_url);
    setImage("profile-avatar", profile.avatar_url);
    setImage("side-avatar", profile.avatar_url);

    if($("avatar-url")) $("avatar-url").value = profile.avatar_url || "";
    if($("profile-city")) $("profile-city").value = profile.city || "";
    if($("profile-age")) $("profile-age").value = profile.age || "";
}

const saveProfile = $("save-profile");
if(saveProfile){
    saveProfile.onclick = async () => {
        const user = await ensureAuth();
        if(!user){ alert("Нет авторизации"); return; }
        const status = $("profile-status");
        if(status){ status.classList.remove("err"); status.textContent = "Сохранение…"; }

        const payload = {
            avatar_url: $("avatar-url").value.trim() || null,
            city: $("profile-city").value.trim() || null,
            age: $("profile-age").value ? parseInt($("profile-age").value, 10) : null
        };

        const update = await supabaseClient
            .from("profiles").update(payload).eq("id", user.id).select().single();

        if(update.error){
            errLog("PROFILE SAVE ERROR", update.error.message);
            if(status){ status.classList.add("err"); status.textContent = "Ошибка: " + update.error.message; }
            return;
        }

        const p = update.data;
        setText("top-name", p.nickname || "Player");
        setText("profile-name", p.nickname || "Player");
        setText("side-name", p.nickname || "Player");
        setImage("top-avatar", p.avatar_url);
        setImage("profile-avatar", p.avatar_url);
        setImage("side-avatar", p.avatar_url);

        if(status) status.textContent = "Сохранено";
        setTimeout(() => { if(status) status.textContent = ""; }, 2000);
    };
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

    const profile = await supabaseClient
        .from("profiles").select("nickname").eq("id", user.id).maybeSingle();

    const nickname = (profile.data && profile.data.nickname) || "Player";

    const result = await supabaseClient.from("messages").insert({
        user_id: user.id, nickname, text
    });

    if(result.error){
        errLog("MESSAGE INSERT ERROR", result.error.message);
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
   КОНФЕРЕНЦИЯ — ИНИЦИАЛИЗАЦИЯ
===================================================== */

function initConference(){
    const mic = $("mic-button");
    if(mic) mic.onclick = toggleMicrophone;
    const screen = $("screen-button");
    if(screen) screen.onclick = toggleScreenShare;
    const leave = $("leave-room");
    if(leave) leave.onclick = leaveRoom;

    const createBtn = $("create-room-btn");
    if(createBtn) createBtn.onclick = createRoom;
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
        errLog("CREATE ROOM ERROR", result.error.message);
        setRoomStatus("Ошибка создания: " + result.error.message, "err");
        return;
    }

    $("room-name-input").value = "";
    $("room-desc-input").value = "";
    await loadRooms();
    await joinRoom(result.data);
}

/* =====================================================
   СПИСОК КОМНАТ
===================================================== */

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

    const visibleRooms = rooms.filter(r => (counts[r.id] || 0) > 0);

    if(visibleRooms.length === 0){
        box.innerHTML = "<p style='color:#888'>Нет активных комнат. Создайте свою!</p>";
        return;
    }

    box.innerHTML = "";
    visibleRooms.forEach(room => {
        const card = document.createElement("div");
        card.className = "room-card";
        card.innerHTML =
            "<h3>🎙 " + escapeHtml(room.name || "Комната") + "</h3>" +
            "<p>" + escapeHtml(room.description || "") + "</p>" +
            "<p>👥 " + (counts[room.id] || 0) + " участников</p>";

        const btn = document.createElement("button");
        btn.className = "main-button";
        btn.type = "button";
        btn.textContent = "Войти";
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            joinRoom(room);
        };
        card.appendChild(btn);

        box.appendChild(card);
    });
}

/* =====================================================
   ВХОД В КОМНАТУ
===================================================== */

async function joinRoom(room){
    if(joiningRoom){
        log("ALREADY JOINING…");
        return;
    }
    joiningRoom = true;

    try{
        // 1. Проверка авторизации
        const user = await ensureAuth();
        if(!user){
            setRoomStatus("Требуется вход в аккаунт", "err");
            joiningRoom = false;
            return;
        }

        // 2. Если уже в комнате — выходим
        if(currentRoom){
            await leaveRoom();
        }

        setRoomStatus("Вход в комнату…");

        // 3. Ник
        const profile = await supabaseClient
            .from("profiles").select("nickname").eq("id", user.id).maybeSingle();
        const nickname = (profile.data && profile.data.nickname) || "Player";
        nicknames[user.id] = nickname;

        // 4. Удаляем ВСЕ свои прежние записи (страховка от stale)
        await supabaseClient.from("conference_users").delete().eq("user_id", user.id);

        // 5. Микрофон
        setRoomStatus("Запрос микрофона…");
        await startLocalAudio();
        if(!localStream){
            setRoomStatus("Нет доступа к микрофону (можно без него)", "err");
        }

        currentRoom = room;
        setText("current-room-title", "🎙 " + (room.name || "Комната"));

        // 6. Подписка на сигналинг ДО регистрации в БД
        setRoomStatus("Подключение к сигнальному каналу…");
        await subscribeSignaling(room.id);
        setRoomStatus("Сигнальный канал готов", "ok");

        // 7. Регистрация в комнате (теперь нас увидят)
        setRoomStatus("Регистрация в комнате…");
        const insert = await supabaseClient.from("conference_users").insert({
            room_id: room.id,
            user_id: user.id,
            nickname: nickname
        });

        if(insert.error){
            errLog("JOIN ROOM DB ERROR", insert.error.message);
            setRoomStatus("Ошибка: " + insert.error.message, "err");
            // Откат
            currentRoom = null;
            joiningRoom = false;
            return;
        }

        // 8. Realtime на conference_users (мгновенное обновление)
        subscribeRoomUsersRealtime(room.id);

        // 9. Polling
        startUsersPolling(room.id);
        await pollRoomUsers(room.id);

        updateMicButton();
        setScreenButton(false);
        resetVideoPlaceholder();
        setRoomStatus("В комнате: " + (room.name || "") + " — ожидание участников", "ok");

        log("JOINED ROOM", room.id);
    }catch(err){
        errLog("JOIN ROOM EXCEPTION", err);
        setRoomStatus("Ошибка: " + err.message, "err");
    }finally{
        joiningRoom = false;
    }
}

/* =====================================================
   МИКРОФОН
===================================================== */

async function startLocalAudio(){
    if(localStream) return;
    try{
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });
        microphoneEnabled = true;
        log("MIC OK");
    }catch(e){
        errLog("MIC ERROR", e);
        localStream = null;
        microphoneEnabled = false;
    }
}

function toggleMicrophone(){
    if(!localStream){ alert("Микрофон не подключён"); return; }
    const audio = localStream.getAudioTracks()[0];
    if(!audio) return;
    audio.enabled = !audio.enabled;
    microphoneEnabled = audio.enabled;
    updateMicButton();
}

function updateMicButton(){
    const btn = $("mic-button");
    if(!btn) return;
    btn.textContent = microphoneEnabled ? "🎤 Микрофон: вкл" : "🔇 Микрофон: выкл";
}

/* =====================================================
   ДЕМОНСТРАЦИЯ ЭКРАНА
===================================================== */

async function toggleScreenShare(){
    if(!currentRoom){ alert("Сначала войдите в комнату"); return; }
    if(screenStream){ stopScreenShare(); return; }

    try{
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30, max: 30 } },
            audio: false
        });

        const track = screenStream.getVideoTracks()[0];
        showLocalScreenPreview(track);

        Object.keys(videoSenders).forEach(peerId => {
            videoSenders[peerId].replaceTrack(track)
                .then(() => log("SCREEN REPLACED for", peerId))
                .catch(e => errLog("replaceTrack screen", e));
        });

        track.onended = () => stopScreenShare();
        setScreenButton(true);
    }catch(e){
        errLog("SCREEN CANCEL", e);
    }
}

function stopScreenShare(){
    if(screenStream){
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }

    const dummy = getDummyVideoTrack();
    Object.keys(videoSenders).forEach(peerId => {
        videoSenders[peerId].replaceTrack(dummy).catch(e => errLog("replaceTrack dummy", e));
    });

    const localPreview = $("vtile-local");
    if(localPreview) localPreview.remove();
    resetVideoPlaceholder();
    setScreenButton(false);
}

function setScreenButton(active){
    const btn = $("screen-button");
    if(!btn) return;
    btn.textContent = active ? "🛑 Остановить трансляцию" : "🖥 Демонстрация экрана";
}

function showLocalScreenPreview(track){
    const area = $("video-area");
    if(!area) return;
    const ph = $("video-placeholder");
    if(ph) ph.style.display = "none";

    let tile = $("vtile-local");
    if(!tile){
        tile = document.createElement("div");
        tile.id = "vtile-local";
        tile.className = "video-tile";
        const v = document.createElement("video");
        v.id = "v-local";
        v.autoplay = true;
        v.muted = true;
        v.playsInline = true;
        const lbl = document.createElement("div");
        lbl.className = "video-label";
        lbl.textContent = "🖥 Ваш экран";
        tile.appendChild(v);
        tile.appendChild(lbl);
        area.appendChild(tile);
    }
    const video = $("v-local");
    video.srcObject = new MediaStream([track]);
    video.play().catch(() => {});
}

/* =====================================================
   СИГНАЛИНГ
===================================================== */

function subscribeSignaling(roomId){
    return new Promise((resolve) => {
        if(signalChannel){
            try { supabaseClient.removeChannel(signalChannel); } catch(e){}
            signalChannel = null;
        }
        signalReady = false;

        signalChannel = supabaseClient.channel("room-signals-" + roomId, {
            config: { broadcast: { self: false } }
        });

        signalChannel.on("broadcast", { event: "signal" }, async ({ payload }) => {
            if(!payload || payload.to !== currentUser.id) return;
            try { await handleSignal(payload); }
            catch(e){ errLog("SIGNAL HANDLE ERROR", e); }
        });

        let resolved = false;
        const finish = () => { if(!resolved){ resolved = true; resolve(); } };

        signalChannel.subscribe((status) => {
            log("SIGNAL CH:", status);
            if(status === "SUBSCRIBED"){
                signalReady = true;
                finish();
            }
        });

        setTimeout(finish, 4000);
    });
}

function sendSignal(toUserId, type, data){
    if(!signalChannel || !signalReady){
        errLog("SIGNAL: channel not ready");
        return;
    }
    signalChannel.send({
        type: "broadcast",
        event: "signal",
        payload: { from: currentUser.id, to: toUserId, type, data }
    }).then(() => log("SIG SENT", type, "→", toUserId))
      .catch(e => errLog("SEND SIGNAL ERROR", e));
}

async function handleSignal(payload){
    const fromId = payload.from;
    const type = payload.type;
    const data = payload.data || {};
    log("SIG RECV", type, "←", fromId);

    let pc = peers[fromId];

    if(type === "offer"){
        if(!pc || pc.signalingState === "closed"){
            pc = createPeer(fromId, false);
        }
        try{
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }catch(e){
            errLog("SET REMOTE OFFER", e);
            return;
        }
        await drainCandidates(fromId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(fromId, "answer", { sdp: pc.localDescription });
    }
    else if(type === "answer"){
        if(pc && pc.signalingState === "have-local-offer"){
            try{
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                await drainCandidates(fromId, pc);
            }catch(e){ errLog("SET REMOTE ANSWER", e); }
        }
    }
    else if(type === "candidate"){
        if(pc && pc.remoteDescription && pc.remoteDescription.type){
            try{ await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
            catch(e){ errLog("ADD ICE", e); }
        }else{
            if(!pendingCandidates[fromId]) pendingCandidates[fromId] = [];
            pendingCandidates[fromId].push(data.candidate);
        }
    }
}

async function drainCandidates(peerId, pc){
    const list = pendingCandidates[peerId];
    if(!list) return;
    for(const c of list){
        try{ await pc.addIceCandidate(new RTCIceCandidate(c)); }
        catch(e){ errLog("DRAIN ICE", e); }
    }
    pendingCandidates[peerId] = [];
}

/* =====================================================
   PEER CONNECTIONS
===================================================== */

function createPeer(peerId, initiator){
    if(peers[peerId]) return peers[peerId];

    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" }
        ],
        iceCandidatePoolSize: 10
    });

    peers[peerId] = pc;

    // AUDIO
    if(localStream){
        const at = localStream.getAudioTracks()[0];
        if(at){
            pc.addTransceiver(at, { direction: "sendrecv" });
            log("ADD AUDIO →", peerId);
        }
    } else {
        pc.addTransceiver("audio", { direction: "recvonly" });
    }

    // VIDEO (always)
    const vt = screenStream
        ? screenStream.getVideoTracks()[0]
        : getDummyVideoTrack();
    try{
        const t = pc.addTransceiver(vt, { direction: "sendrecv" });
        videoSenders[peerId] = t.sender;
    }catch(e){ errLog("addTransceiver video", e); }

    pc.onicecandidate = (e) => {
        if(e.candidate) sendSignal(peerId, "candidate", { candidate: e.candidate });
    };

    pc.ontrack = (e) => {
        log("ONTRACK", peerId, e.track.kind);
        handleRemoteTrack(peerId, e.track);
    };

    pc.onconnectionstatechange = () => {
        log("CONN", peerId, pc.connectionState);
        if(pc.connectionState === "connected"){
            setRoomStatus("Соединение с " + (nicknames[peerId] || "участником") + " установлено", "ok");
        }
        if(pc.connectionState === "failed"){
            try{ pc.restartIce(); }catch(e){}
        }
        if(pc.connectionState === "closed") closePeer(peerId);
    };

    pc.oniceconnectionstatechange = () => log("ICE", peerId, pc.iceConnectionState);

    if(initiator){
        (async () => {
            try{
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal(peerId, "offer", { sdp: pc.localDescription });
                log("OFFER SENT →", peerId);
            }catch(e){
                errLog("CREATE OFFER ERROR", e);
            }
        })();
    }

    return pc;
}

function closePeer(peerId){
    const pc = peers[peerId];
    if(pc){
        try{ pc.close(); }catch(e){}
        delete peers[peerId];
    }
    delete videoSenders[peerId];
    delete pendingCandidates[peerId];

    const tile = $("vtile-" + peerId);
    if(tile) tile.remove();
    const audio = $("audio-" + peerId);
    if(audio) audio.remove();

    resetVideoPlaceholder();
}

function resetVideoPlaceholder(){
    const area = $("video-area");
    const ph = $("video-placeholder");
    if(!area || !ph) return;
    const hasTiles = area.querySelector(".video-tile");
    ph.style.display = hasTiles ? "none" : "block";
}

/* =====================================================
   REMOTE TRACKS
===================================================== */

function handleRemoteTrack(peerId, track){
    if(track.kind === "audio"){
        let audio = $("audio-" + peerId);
        if(!audio){
            audio = document.createElement("audio");
            audio.id = "audio-" + peerId;
            audio.autoplay = true;
            audio.playsInline = true;
            $("remote-audio").appendChild(audio);
        }
        audio.srcObject = new MediaStream([track]);
        tryPlayAudio(audio);
        log("REMOTE AUDIO ←", peerId);
    }
    else if(track.kind === "video"){
        const area = $("video-area");
        if(!area) return;

        let tile = $("vtile-" + peerId);
        if(!tile){
            tile = document.createElement("div");
            tile.id = "vtile-" + peerId;
            tile.className = "video-tile";
            const v = document.createElement("video");
            v.id = "v-" + peerId;
            v.autoplay = true;
            v.playsInline = true;
            v.muted = true;
            const lbl = document.createElement("div");
            lbl.className = "video-label";
            lbl.id = "vl-" + peerId;
            lbl.textContent = "🖥 " + (nicknames[peerId] || "Участник");
            tile.appendChild(v);
            tile.appendChild(lbl);
            area.appendChild(tile);
        }
        const video = $("v-" + peerId);
        video.srcObject = new MediaStream([track]);
        video.play().catch(() => {});
        resetVideoPlaceholder();
        log("REMOTE VIDEO ←", peerId);
    }
}

function tryPlayAudio(audio){
    const p = audio.play();
    if(p && p.catch){
        p.catch(err => {
            errLog("AUDIO PLAY FAIL:", err.message);
            const retry = () => {
                audio.play().catch(e => errLog("AUDIO RETRY", e.message));
                document.removeEventListener("click", retry);
                document.removeEventListener("keydown", retry);
                document.removeEventListener("touchstart", retry);
            };
            document.addEventListener("click", retry, { once: true });
            document.addEventListener("keydown", retry, { once: true });
            document.addEventListener("touchstart", retry, { once: true });
        });
    }
}

/* =====================================================
   REALTIME НА conference_users
===================================================== */

function subscribeRoomUsersRealtime(roomId){
    if(roomUsersChannel){
        try{ supabaseClient.removeChannel(roomUsersChannel); }catch(e){}
        roomUsersChannel = null;
    }

    roomUsersChannel = supabaseClient
        .channel("room-users-" + roomId)
        .on("postgres_changes",
            { event: "*", schema: "public", table: "conference_users",
              filter: "room_id=eq." + roomId },
            (payload) => {
                log("USERS RT", payload.eventType);
                if(currentRoom) pollRoomUsers(currentRoom.id).catch(e => errLog(e));
            })
        .subscribe((status) => log("USERS RT CH:", status));
}

/* =====================================================
   POLLING
===================================================== */

function startUsersPolling(roomId){
    if(usersPollTimer) clearInterval(usersPollTimer);
    usersPollTimer = setInterval(() => {
        pollRoomUsers(roomId).catch(e => errLog("POLL", e));
    }, 2500);
}

async function pollRoomUsers(roomId){
    if(!currentUser) return;

    const { data, error } = await supabaseClient
        .from("conference_users")
        .select("user_id, nickname")
        .eq("room_id", roomId);

    if(error){ errLog("POLL USERS ERROR", error.message); return; }

    const users = data || [];
    const userIds = new Set(users.map(u => u.user_id));
    users.forEach(u => { nicknames[u.user_id] = u.nickname; });

    // Обновляем подписи
    Object.keys(peers).forEach(peerId => {
        const lbl = $("vl-" + peerId);
        if(lbl && nicknames[peerId]) lbl.textContent = "🖥 " + nicknames[peerId];
    });

    // Создаём peer'ы для новых участников
    for(const u of users){
        if(u.user_id === currentUser.id) continue;

        const existing = peers[u.user_id];
        if(existing){
            if(existing.connectionState === "failed" || existing.connectionState === "closed"){
                closePeer(u.user_id);
            } else {
                continue;
            }
        }

        // Инициатор — тот, у кого ID меньше
        if(currentUser.id < u.user_id){
            log("INITIATE PEER →", u.user_id);
            createPeer(u.user_id, true);
        }
    }

    // Закрываем peer'ы ушедших
    for(const peerId of Object.keys(peers)){
        if(!userIds.has(peerId)){
            log("PEER LEFT", peerId);
            closePeer(peerId);
        }
    }

    updateParticipants(users);
}

function updateParticipants(users){
    const box = $("participants-list");
    if(!box) return;

    if(!users || users.length === 0){
        box.innerHTML = "<span style='color:#98a2b5;font-size:13px'>Пока никого</span>";
        return;
    }

    box.innerHTML = "";
    users.forEach(u => {
        const chip = document.createElement("div");
        chip.className = "participant-chip" + (u.user_id === currentUser.id ? " you" : "");
        chip.innerHTML =
            "<span class='dot'></span>" +
            escapeHtml(u.nickname || "Участник") +
            (u.user_id === currentUser.id ? " (вы)" : "");
        box.appendChild(chip);
    });
}

/* =====================================================
   ВЫХОД ИЗ КОМНАТЫ
===================================================== */

async function leaveRoom(){
    if(!currentRoom) return;
    const roomId = currentRoom.id;
    log("LEAVING ROOM", roomId);

    try{
        await supabaseClient
            .from("conference_users")
            .delete()
            .eq("user_id", currentUser.id)
            .eq("room_id", roomId);
    }catch(e){ errLog("LEAVE ROOM DB ERROR", e); }

    Object.keys(peers).forEach(id => closePeer(id));

    if(localStream){
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    if(screenStream){
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }
    microphoneEnabled = false;

    if(signalChannel){
        try{ supabaseClient.removeChannel(signalChannel); }catch(e){}
        signalChannel = null;
    }
    if(roomUsersChannel){
        try{ supabaseClient.removeChannel(roomUsersChannel); }catch(e){}
        roomUsersChannel = null;
    }
    if(usersPollTimer){
        clearInterval(usersPollTimer);
        usersPollTimer = null;
    }

    const area = $("video-area");
    if(area) area.querySelectorAll(".video-tile").forEach(t => t.remove());
    const audioContainer = $("remote-audio");
    if(audioContainer) audioContainer.innerHTML = "";

    resetVideoPlaceholder();
    setText("current-room-title", "Комната не выбрана");
    setRoomStatus("");
    updateParticipants([]);
    setScreenButton(false);
    updateMicButton();

    currentRoom = null;
    signalReady = false;
    await loadRooms();
}

/* =====================================================
   BEFORE UNLOAD — попытка очистки
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
