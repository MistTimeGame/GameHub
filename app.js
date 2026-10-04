/* =====================================================
   GAME PLATFORM
   app.js — Auth + Chat + Realtime + WebRTC (голос + экран)
===================================================== */

const SUPABASE_URL = "https://uvzaoobtysostmfwyfxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* =====================================================
   СОСТОЯНИЕ
===================================================== */

let currentUser = null;

// чат
let chatChannel = null;

// конференция
let currentRoom = null;
let localStream = null;
let screenStream = null;
let microphoneEnabled = false;
let peers = {};              // userId -> RTCPeerConnection
let videoSenders = {};       // userId -> RTCRtpSender
let pendingCandidates = {};  // userId -> [candidate]
let nicknames = {};          // userId -> nickname
let signalChannel = null;
let usersChannel = null;

/* =====================================================
   ХЕЛПЕРЫ
===================================================== */

function $(id){ return document.getElementById(id); }

function log(...a){ console.log("[GAME PLATFORM]", ...a); }
function errLog(...a){ console.error("[GAME PLATFORM][ОШИБКА]", ...a); }

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

function setImage(id, url){
    const el = $(id);
    if(el && url) el.src = url;
}

/* =====================================================
   СТАРТ
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    log("GAME PLATFORM START");
    initAuth();
    initNavigation();
    initChat();
    initConference();
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

    /* --- ВХОД --- */
    const loginForm = $("login-form");
    if(loginForm){
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            setAuthMessage("Вход…", true);

            const email = $("login-email").value.trim();
            const password = $("login-password").value;

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
        };
    }

    /* --- РЕГИСТРАЦИЯ --- */
    const registerForm = $("register-form");
    if(registerForm){
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            setAuthMessage("Регистрация…", true);

            const nickname = $("register-nickname").value.trim() || "Player";
            const email = $("register-email").value.trim();
            const password = $("register-password").value;

            const result = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { nickname } }
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

            // Профиль
            try{
                await supabaseClient.from("profiles").insert({
                    id: user.id,
                    nickname,
                    avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
                    vip_level: 0
                });
            }catch(e){
                errLog("PROFILE CREATE ERROR", e.message);
            }

            if(!result.data.session){
                setAuthMessage("Регистрация успешна. Подтвердите email.", true);
                if(loginTab) loginTab.click();
                return;
            }

            currentUser = user;
            setAuthMessage("");
            openApp();
        };
    }

    /* --- ВЫХОД --- */
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
        }
    }catch(e){
        errLog("SESSION ERROR", e);
    }
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

    await safeRun(loadProfile);
    await safeRun(loadNews);

    await safeRun(loadMessages);
    startChatRealtime();

    await safeRun(loadRooms);
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

            if(btn.dataset.page === "conference"){
                loadRooms();
            }
            if(btn.dataset.page === "chat"){
                loadMessages();
            }
        };
    });
}

/* =====================================================
   ПРОФИЛЬ
===================================================== */

async function loadProfile(){
    if(!currentUser){
        log("NO USER — PROFILE SKIPPED");
        return;
    }

    let result = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if(result.error){
        errLog("PROFILE SELECT ERROR", result.error);
        return;
    }

    if(!result.data){
        log("PROFILE CREATE…");
        const create = await supabaseClient.from("profiles").insert({
            id: currentUser.id,
            nickname: currentUser.email ? currentUser.email.split("@")[0] : "Player",
            avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
            vip_level: 0
        });

        if(create.error){
            errLog("PROFILE INSERT ERROR", create.error);
            return;
        }
        return loadProfile();
    }

    const profile = result.data;

    setText("top-name", profile.nickname || "Player");
    setText("profile-name", profile.nickname || "Player");
    setText("side-name", profile.nickname || "Player");

    setText("vip-level", "VIP " + (profile.vip_level || 0));
    setText("side-vip", "VIP " + (profile.vip_level || 0));

    if(profile.avatar_url){
        setImage("top-avatar", profile.avatar_url);
        setImage("profile-avatar", profile.avatar_url);
        setImage("side-avatar", profile.avatar_url);
    }

    if($("avatar-url")) $("avatar-url").value = profile.avatar_url || "";
    if($("profile-city")) $("profile-city").value = profile.city || "";
    if($("profile-age")) $("profile-age").value = profile.age || "";
}

const saveProfile = $("save-profile");
if(saveProfile){
    saveProfile.onclick = async () => {
        if(!currentUser) return;

        const update = await supabaseClient
            .from("profiles")
            .update({
                avatar_url: $("avatar-url").value.trim() || null,
                city: $("profile-city").value.trim() || null,
                age: $("profile-age").value ? parseInt($("profile-age").value, 10) : null
            })
            .eq("id", currentUser.id);

        if(update.error){
            errLog("PROFILE SAVE ERROR", update.error);
            alert("Ошибка сохранения профиля");
            return;
        }

        await loadProfile();
        alert("Профиль сохранён");
    };
}

/* =====================================================
   НОВОСТИ
===================================================== */

async function loadNews(){
    const box = $("news-list");
    if(!box) return;

    const result = await supabaseClient
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });

    if(result.error){
        // таблицы news может не быть — не критично
        errLog("NEWS ERROR", result.error.message);
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
    if(!button){
        log("SEND BUTTON NOT FOUND");
        return;
    }
    button.onclick = sendMessage;

    const input = $("message-text");
    if(input){
        input.addEventListener("keydown", (e) => {
            if(e.key === "Enter" && !e.shiftKey){
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

async function sendMessage(){
    if(!currentUser){
        alert("Нет авторизации");
        return;
    }

    const input = $("message-text");
    if(!input) return;

    const text = input.value.trim();
    if(!text) return;

    // получаем ник
    const profile = await supabaseClient
        .from("profiles")
        .select("nickname")
        .eq("id", currentUser.id)
        .maybeSingle();

    const nickname = (profile.data && profile.data.nickname) || "Player";

    const result = await supabaseClient
        .from("messages")
        .insert({
            user_id: currentUser.id,
            nickname: nickname,
            text: text
        });

    if(result.error){
        errLog("MESSAGE INSERT ERROR", result.error.message);
        alert("Ошибка отправки сообщения: " + result.error.message);
        return;
    }

    input.value = "";
}

async function loadMessages(){
    const box = $("messages");
    if(!box) return;

    const result = await supabaseClient
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(300);

    if(result.error){
        errLog("MESSAGES LOAD ERROR", result.error.message);
        box.innerHTML = "<div class='chat-message'>Ошибка загрузки: " + escapeHtml(result.error.message) + "</div>";
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
        .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "messages" },
            (payload) => {
                log("NEW MESSAGE", payload.new);
                appendMessage(payload.new);
            }
        )
        .subscribe((status) => {
            log("CHAT REALTIME:", status);
        });
}

/* =====================================================
   КОНФЕРЕНЦИЯ — БАЗОВЫЕ ОБРАБОТЧИКИ
===================================================== */

function initConference(){
    const mic = $("mic-button");
    if(mic) mic.onclick = toggleMicrophone;

    const screen = $("screen-button");
    if(screen) screen.onclick = toggleScreenShare;

    const leave = $("leave-room");
    if(leave) leave.onclick = leaveRoom;
}

/* =====================================================
   СПИСОК КОМНАТ
   (показываем только те, где есть люди)
===================================================== */

async function loadRooms(){
    const box = $("rooms-list");
    if(!box) return;

    const roomsRes = await supabaseClient
        .from("conference_rooms")
        .select("*")
        .order("id");

    if(roomsRes.error){
        errLog("ROOM LOAD ERROR", roomsRes.error.message);
        box.innerHTML = "<p style='color:#888'>Ошибка загрузки комнат</p>";
        return;
    }

    const rooms = roomsRes.data || [];
    box.innerHTML = "";

    let shown = 0;

    for(const room of rooms){
        const usersRes = await supabaseClient
            .from("conference_users")
            .select("user_id, nickname")
            .eq("room_id", room.id);

        const users = usersRes.data || [];
        if(users.length === 0) continue; // только комнаты с людьми

        shown++;

        const card = document.createElement("div");
        card.className = "room-card";
        card.innerHTML =
            "<h3>🎙 " + escapeHtml(room.name || "Комната") + "</h3>" +
            "<p>" + escapeHtml(room.description || "") + "</p>" +
            "<p>👥 " + users.length + " участников</p>" +
            "<button class='main-button' data-room-id='" + escapeHtml(String(room.id)) + "'>Войти</button>";

        card.querySelector("button").onclick = () => joinRoom(room);
        box.appendChild(card);
    }

    if(shown === 0){
        box.innerHTML = "<p style='color:#888'>Нет активных комнат</p>";
    }
}

/* =====================================================
   ВХОД В КОМНАТУ
===================================================== */

async function joinRoom(room){
    if(!currentUser){
        alert("Нет авторизации");
        return;
    }

    if(currentRoom){
        await leaveRoom();
    }

    // Ник
    const profile = await supabaseClient
        .from("profiles")
        .select("nickname")
        .eq("id", currentUser.id)
        .maybeSingle();

    const nickname = (profile.data && profile.data.nickname) || "Player";

    // Регистрация в комнате
    const insert = await supabaseClient
        .from("conference_users")
        .insert({
            room_id: room.id,
            user_id: currentUser.id,
            nickname: nickname
        });

    if(insert.error){
        errLog("JOIN ROOM ERROR", insert.error.message);
        alert("Не удалось войти в комнату: " + insert.error.message);
        return;
    }

    currentRoom = room;
    setText("current-room-title", "🎙 " + (room.name || "Комната"));

    // Микрофон
    await startLocalAudio();

    // Realtime: пользователи в комнате
    subscribeRoomUsers(room.id);

    // Realtime: сигналинг
    subscribeSignaling(room.id);

    // Синхронизация с уже присутствующими
    await syncExistingPeers(room.id);

    updateMicButton();
    updateParticipants([]);
}

/* =====================================================
   ЛОКАЛЬНЫЙ МИКРОФОН
===================================================== */

async function startLocalAudio(){
    try{
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        microphoneEnabled = true;
        log("MIC START");
    }catch(e){
        errLog("MIC ERROR", e);
        alert("Нет доступа к микрофону");
    }
}

function toggleMicrophone(){
    if(!localStream){
        alert("Микрофон не подключён");
        return;
    }

    const audio = localStream.getAudioTracks()[0];
    if(!audio) return;

    audio.enabled = !audio.enabled;
    microphoneEnabled = audio.enabled;
    updateMicButton();
}

function updateMicButton(){
    const btn = $("mic-button");
    if(!btn) return;
    btn.textContent = microphoneEnabled
        ? "🎤 Микрофон: вкл"
        : "🔇 Микрофон: выкл";
}

/* =====================================================
   ДЕМОНСТРАЦИЯ ЭКРАНА
===================================================== */

async function toggleScreenShare(){
    if(!currentRoom){
        alert("Сначала войдите в комнату");
        return;
    }

    // Если уже идёт — остановить
    if(screenStream){
        stopScreenShare();
        return;
    }

    try{
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
        });

        const track = screenStream.getVideoTracks()[0];

        // Показать локальное превью
        showLocalScreenPreview(track);

        // Прикрепить к каждому peer connection
        Object.keys(videoSenders).forEach(peerId => {
            videoSenders[peerId].replaceTrack(track).catch(e => errLog("replaceTrack", e));
        });

        // Пользователь остановил через системный UI
        track.onended = () => stopScreenShare();

        setScreenButton(true);
        log("SCREEN START");
    }catch(e){
        errLog("SCREEN CANCEL", e);
    }
}

function stopScreenShare(){
    if(screenStream){
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }

    // Убрать видео у всех peer connection
    Object.keys(videoSenders).forEach(peerId => {
        videoSenders[peerId].replaceTrack(null).catch(e => errLog("replaceTrack null", e));
    });

    // Удалить локальное превью
    const localPreview = $("vtile-local");
    if(localPreview) localPreview.remove();
    resetVideoPlaceholder();

    setScreenButton(false);
    log("SCREEN STOP");
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
   WEBSIGNALING (Broadcast)
===================================================== */

function subscribeSignaling(roomId){
    if(signalChannel) {
        try { supabaseClient.removeChannel(signalChannel); } catch(e){}
        signalChannel = null;
    }

    signalChannel = supabaseClient.channel("room-signals-" + roomId, {
        config: { broadcast: { self: false } }
    });

    signalChannel.on("broadcast", { event: "signal" }, async ({ payload }) => {
        if(!payload || payload.to !== currentUser.id) return;
        try{
            await handleSignal(payload);
        }catch(e){
            errLog("SIGNAL HANDLE ERROR", e);
        }
    });

    signalChannel.subscribe((status) => {
        log("SIGNAL CHANNEL:", status);
    });
}

function sendSignal(toUserId, type, data){
    if(!signalChannel) return;
    signalChannel.send({
        type: "broadcast",
        event: "signal",
        payload: {
            from: currentUser.id,
            to: toUserId,
            type: type,
            data: data
        }
    }).catch(e => errLog("SEND SIGNAL ERROR", e));
}

async function handleSignal(payload){
    const fromId = payload.from;
    const type = payload.type;
    const data = payload.data || {};

    let pc = peers[fromId];

    if(type === "offer"){
        if(!pc) pc = createPeer(fromId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await drainCandidates(fromId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(fromId, "answer", { sdp: pc.localDescription });
    }
    else if(type === "answer"){
        if(pc){
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            await drainCandidates(fromId, pc);
        }
    }
    else if(type === "candidate"){
        if(pc && pc.remoteDescription && pc.remoteDescription.type){
            try{
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }catch(e){ errLog("ADD ICE", e); }
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
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    });

    peers[peerId] = pc;

    // Аудио (микрофон)
    if(localStream){
        localStream.getAudioTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }

    // Видео-трансивер для демонстрации экрана
    const vt = pc.addTransceiver("video", { direction: "sendrecv" });
    videoSenders[peerId] = vt.sender;

    // Если экран уже шарится — сразу подключаем
    if(screenStream){
        const st = screenStream.getVideoTracks()[0];
        if(st) vt.sender.replaceTrack(st).catch(e => errLog("replaceTrack initial", e));
    }

    pc.onicecandidate = (e) => {
        if(e.candidate){
            sendSignal(peerId, "candidate", { candidate: e.candidate });
        }
    };

    pc.ontrack = (e) => {
        log("ONTRACK", peerId, e.track.kind);
        handleRemoteTrack(peerId, e.track);
    };

    pc.onconnectionstatechange = () => {
        log("PEER", peerId, pc.connectionState);
        if(pc.connectionState === "failed" || pc.connectionState === "closed"){
            closePeer(peerId);
        }
    };

    if(initiator){
        (async () => {
            try{
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal(peerId, "offer", { sdp: pc.localDescription });
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
    if(!area) return;

    const hasTiles = area.querySelector(".video-tile");
    if(ph){
        ph.style.display = hasTiles ? "none" : "block";
    }
}

/* =====================================================
   ПРИЁМ УДАЛЁННЫХ ДОРОЖЕК
===================================================== */

function handleRemoteTrack(peerId, track){
    if(track.kind === "audio"){
        let audio = $("audio-" + peerId);
        if(!audio){
            audio = document.createElement("audio");
            audio.id = "audio-" + peerId;
            audio.autoplay = true;
            $("remote-audio").appendChild(audio);
        }
        audio.srcObject = new MediaStream([track]);
        audio.play().catch(() => {});
    }
    else if(track.kind === "video"){
        const area = $("video-area");
        if(!area) return;

        let tile = $("vtile-" + peerId);
        if(!tile){
            tile = document.createElement("div");
            tile.id = "vtile-" + peerId;
            tile.className = "video-tile";
            tile.style.display = "none";

            const v = document.createElement("video");
            v.id = "v-" + peerId;
            v.autoplay = true;
            v.playsInline = true;

            const lbl = document.createElement("div");
            lbl.className = "video-label";
            lbl.textContent = "🖥 " + (nicknames[peerId] || "Участник");

            tile.appendChild(v);
            tile.appendChild(lbl);
            area.appendChild(tile);
        }

        const video = $("v-" + peerId);
        video.srcObject = new MediaStream([track]);
        video.play().catch(() => {});

        // Показать/скрыть в зависимости от активности
        const refresh = () => {
            tile.style.display = (track.muted || track.readyState === "ended") ? "none" : "block";
            resetVideoPlaceholder();
        };
        track.onunmute = refresh;
        track.onmute = refresh;
        track.onended = () => {
            tile.remove();
            resetVideoPlaceholder();
        };
        refresh();
    }
}

/* =====================================================
   REALTIME ПОЛЬЗОВАТЕЛЕЙ В КОМНАТЕ
===================================================== */

function subscribeRoomUsers(roomId){
    if(usersChannel){
        try{ supabaseClient.removeChannel(usersChannel); }catch(e){}
        usersChannel = null;
    }

    usersChannel = supabaseClient
        .channel("room-users-" + roomId)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "conference_users",
                filter: "room_id=eq." + roomId
            },
            (payload) => {
                log("ROOM USERS CHANGE", payload.eventType);
                if(payload.eventType === "INSERT"){
                    onUserJoined(payload.new);
                }else if(payload.eventType === "DELETE"){
                    onUserLeft(payload.old);
                }
                refreshParticipants(roomId);
            }
        )
        .subscribe((status) => {
            log("USERS CHANNEL:", status);
        });
}

async function onUserJoined(userRow){
    if(!currentUser || !userRow) return;
    if(userRow.user_id === currentUser.id) return;

    nicknames[userRow.user_id] = userRow.nickname;

    // Детерминированный выбор инициатора — кто меньше по id, тот делает offer
    if(currentUser.id < userRow.user_id){
        if(!peers[userRow.user_id]){
            createPeer(userRow.user_id, true);
        }
    }
}

function onUserLeft(userRow){
    if(!userRow) return;
    closePeer(userRow.user_id);
    delete nicknames[userRow.user_id];
}

async function syncExistingPeers(roomId){
    const { data, error } = await supabaseClient
        .from("conference_users")
        .select("user_id, nickname")
        .eq("room_id", roomId);

    if(error){
        errLog("SYNC PEERS ERROR", error.message);
        return;
    }

    const users = data || [];

    users.forEach(u => {
        nicknames[u.user_id] = u.nickname;
    });

    users.forEach(u => {
        if(u.user_id === currentUser.id) return;
        if(currentUser.id < u.user_id){
            if(!peers[u.user_id]){
                createPeer(u.user_id, true);
            }
        }
    });

    updateParticipants(users);
}

/* =====================================================
   СПИСОК УЧАСТНИКОВ
===================================================== */

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

async function refreshParticipants(roomId){
    const { data } = await supabaseClient
        .from("conference_users")
        .select("user_id, nickname")
        .eq("room_id", roomId);

    updateParticipants(data || []);
}

/* =====================================================
   ВЫХОД ИЗ КОМНАТЫ
===================================================== */

async function leaveRoom(){
    if(!currentRoom) return;

    const roomId = currentRoom.id;

    try{
        await supabaseClient
            .from("conference_users")
            .delete()
            .eq("user_id", currentUser.id)
            .eq("room_id", roomId);
    }catch(e){
        errLog("LEAVE ROOM DB ERROR", e);
    }

    // Закрыть peer connections
    Object.keys(peers).forEach(id => closePeer(id));

    // Остановить медиа
    if(localStream){
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    if(screenStream){
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }

    microphoneEnabled = false;

    // Отписки
    if(signalChannel){
        try{ supabaseClient.removeChannel(signalChannel); }catch(e){}
        signalChannel = null;
    }
    if(usersChannel){
        try{ supabaseClient.removeChannel(usersChannel); }catch(e){}
        usersChannel = null;
    }

    // Очистить UI
    const area = $("video-area");
    if(area){
        area.querySelectorAll(".video-tile").forEach(t => t.remove());
    }
    const audioContainer = $("remote-audio");
    if(audioContainer) audioContainer.innerHTML = "";

    resetVideoPlaceholder();
    setText("current-room-title", "Комната не выбрана");
    updateParticipants([]);
    setScreenButton(false);
    updateMicButton();

    currentRoom = null;

    await loadRooms();
    log("LEFT ROOM");
}

/* =====================================================
   END
===================================================== */
