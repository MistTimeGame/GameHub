/* =========================================================
   GAMEHUB CONFERENCE
   conference.js
   Работа с существующей структурой Supabase
   ========================================================= */

const SUPABASE_URL = "ВСТАВЬ_СЮДА_SUPABASE_URL";
const SUPABASE_ANON_KEY = "ВСТАВЬ_СЮДА_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let rooms = [];
let games = [];
let members = [];

let currentRoom = null;
let messageSubscription = null;
let memberSubscription = null;

let isSending = false;

/* =========================================================
   DOM
   ========================================================= */

const roomsList = document.getElementById("roomsList");
const messagesList = document.getElementById("messagesList");

const roomTitle = document.getElementById("roomTitle");
const roomDescription = document.getElementById("roomDescription");
const membersCount = document.getElementById("membersCount");

const emptyState = document.getElementById("emptyState");
const chatArea = document.getElementById("chatArea");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const typingIndicator = document.getElementById("typingIndicator");

const membersList = document.getElementById("membersList");

const currentUserName = document.getElementById("currentUserName");
const currentUserAvatar = document.getElementById("currentUserAvatar");

const createRoomBtn = document.getElementById("createRoomBtn");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

const createRoomModal = document.getElementById("createRoomModal");
const closeCreateRoomBtn = document.getElementById("closeCreateRoomBtn");
const cancelCreateRoomBtn = document.getElementById("cancelCreateRoomBtn");
const createRoomForm = document.getElementById("createRoomForm");

const roomNameInput = document.getElementById("roomName");
const roomDescriptionInput = document.getElementById("roomDescriptionInput");
const roomGameSelect = document.getElementById("roomGame");

const notification = document.getElementById("notification");

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("Ошибка получения сессии:", error);
            showNotification("Не удалось получить сессию", "error");
            return;
        }

        if (!session || !session.user) {
            redirectToLogin();
            return;
        }

        currentUser = session.user;

        await loadCurrentProfile();
        renderCurrentUser();

        await loadGames();
        await loadRooms();

        setupEvents();

        console.log("GAMEHUB CONFERENCE READY");
    } catch (error) {
        console.error("Ошибка запуска конференции:", error);
        showNotification("Ошибка запуска конференции", "error");
    }
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadCurrentProfile() {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error("Ошибка загрузки профиля:", error);
        return;
    }

    currentProfile = data || {};
}

function renderCurrentUser() {
    const name =
        currentProfile?.nickname ||
        currentProfile?.username ||
        currentProfile?.display_name ||
        currentProfile?.full_name ||
        currentUser.email?.split("@")[0] ||
        "Пользователь";

    if (currentUserName) {
        currentUserName.textContent = name;
    }

    if (currentUserAvatar) {
        currentUserAvatar.src = getAvatar(
            currentProfile?.avatar_url,
            name
        );
    }
}

/* =========================================================
   GAMES
   ========================================================= */

async function loadGames() {
    const { data, error } = await supabaseClient
        .from("games")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("Ошибка загрузки игр:", error);
        games = [];
        return;
    }

    games = data || [];

    fillGameSelect();
}

function fillGameSelect() {
    if (!roomGameSelect) {
        return;
    }

    roomGameSelect.innerHTML = "";

    const noGameOption = document.createElement("option");
    noGameOption.value = "";
    noGameOption.textContent = "Без привязки к игре";

    roomGameSelect.appendChild(noGameOption);

    games.forEach(game => {
        const option = document.createElement("option");

        option.value = game.id;

        option.textContent =
            game.name ||
            game.title ||
            game.game_name ||
            "Игра";

        roomGameSelect.appendChild(option);
    });
}

/* =========================================================
   ROOMS
   ========================================================= */

async function loadRooms() {
    const { data, error } = await supabaseClient
        .from("conference_rooms")
        .select(`
            id,
            name,
            description,
            created_by,
            created_at,
            is_active,
            game_id
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Ошибка загрузки конференций:", error);
        showNotification(
            "Не удалось загрузить конференции",
            "error"
        );
        return;
    }

    rooms = data || [];

    renderRooms();

    if (!currentRoom && rooms.length > 0) {
        await openRoom(rooms[0].id);
    }

    if (currentRoom) {
        const exists = rooms.find(
            room => room.id === currentRoom.id
        );

        if (!exists) {
            closeRoom();
        }
    }
}

function renderRooms() {
    if (!roomsList) {
        return;
    }

    roomsList.innerHTML = "";

    if (!rooms.length) {
        const empty = document.createElement("div");

        empty.className = "rooms-empty";
        empty.textContent = "Конференций пока нет";

        roomsList.appendChild(empty);

        return;
    }

    rooms.forEach(room => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = "room-item";

        if (currentRoom && currentRoom.id === room.id) {
            item.classList.add("active");
        }

        const game = games.find(
            gameItem => gameItem.id === room.game_id
        );

        const gameName = game
            ? game.name || game.title || game.game_name
            : "";

        item.innerHTML = `
            <div class="room-icon">
                💬
            </div>

            <div class="room-item-content">
                <div class="room-item-name">
                    ${escapeHtml(room.name)}
                </div>

                <div class="room-item-description">
                    ${escapeHtml(
                        room.description ||
                        gameName ||
                        "Конференция GameHub"
                    )}
                </div>
            </div>
        `;

        item.addEventListener("click", () => {
            openRoom(room.id);
        });

        roomsList.appendChild(item);
    });
}

/* =========================================================
   OPEN ROOM
   ========================================================= */

async function openRoom(roomId) {
    const room = rooms.find(item => item.id === roomId);

    if (!room) {
        return;
    }

    currentRoom = room;

    renderRooms();
    renderRoomHeader();

    if (emptyState) {
        emptyState.style.display = "none";
    }

    if (chatArea) {
        chatArea.style.display = "flex";
    }

    await loadMembers();
    await ensureMembership();
    await loadMessages();

    subscribeToMessages();
    subscribeToMembers();
}

function closeRoom() {
    currentRoom = null;

    unsubscribeMessages();
    unsubscribeMembers();

    if (roomTitle) {
        roomTitle.textContent = "Конференция";
    }

    if (roomDescription) {
        roomDescription.textContent = "";
    }

    if (messagesList) {
        messagesList.innerHTML = "";
    }

    if (membersList) {
        membersList.innerHTML = "";
    }

    if (chatArea) {
        chatArea.style.display = "none";
    }

    if (emptyState) {
        emptyState.style.display = "flex";
    }

    renderRooms();
}

/* =========================================================
   ROOM HEADER
   ========================================================= */

function renderRoomHeader() {
    if (!currentRoom) {
        return;
    }

    if (roomTitle) {
        roomTitle.textContent = currentRoom.name;
    }

    if (roomDescription) {
        roomDescription.textContent =
            currentRoom.description || "";
    }

    updateMembersCount();
}

function updateMembersCount() {
    if (!membersCount) {
        return;
    }

    membersCount.textContent =
        `${members.length} ${pluralize(
            members.length,
            "участник",
            "участника",
            "участников"
        )}`;
}

/* =========================================================
   MEMBERSHIP
   ========================================================= */

async function ensureMembership() {
    if (!currentRoom || !currentUser) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("conference_room_members")
        .select("room_id,user_id")
        .eq("room_id", currentRoom.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error(
            "Ошибка проверки участия:",
            error
        );
        return;
    }

    if (data) {
        return;
    }

    const { error: insertError } = await supabaseClient
        .from("conference_room_members")
        .insert({
            room_id: currentRoom.id,
            user_id: currentUser.id
        });

    if (insertError) {
        console.error(
            "Ошибка добавления участника:",
            insertError
        );
    }
}

/* =========================================================
   LOAD MEMBERS
   ========================================================= */

async function loadMembers() {
    if (!currentRoom) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("conference_room_members")
        .select(`
            room_id,
            user_id,
            joined_at
        `)
        .eq("room_id", currentRoom.id)
        .order("joined_at", { ascending: true });

    if (error) {
        console.error(
            "Ошибка загрузки участников:",
            error
        );

        members = [];
        renderMembers();

        return;
    }

    const rawMembers = data || [];

    if (!rawMembers.length) {
        members = [];
        renderMembers();
        return;
    }

    const userIds = rawMembers.map(item => item.user_id);

    const { data: profiles, error: profilesError } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .in("id", userIds);

    if (profilesError) {
        console.error(
            "Ошибка загрузки профилей участников:",
            profilesError
        );
    }

    const profileMap = {};

    (profiles || []).forEach(profile => {
        profileMap[profile.id] = profile;
    });

    members = rawMembers.map(member => ({
        ...member,
        profile: profileMap[member.user_id] || null
    }));

    renderMembers();
}

function renderMembers() {
    if (!membersList) {
        return;
    }

    membersList.innerHTML = "";

    if (!members.length) {
        membersList.innerHTML = `
            <div class="members-empty">
                Пока нет участников
            </div>
        `;

        updateMembersCount();

        return;
    }

    members.forEach(member => {
        const profile = member.profile || {};

        const name = getProfileName(
            profile,
            member.user_id
        );

        const item = document.createElement("div");

        item.className = "member-item";

        item.innerHTML = `
            <img
                class="member-avatar"
                src="${getAvatar(
                    profile.avatar_url,
                    name
                )}"
                alt=""
            >

            <div class="member-info">
                <div class="member-name">
                    ${escapeHtml(name)}
                </div>

                <div class="member-status">
                    участник
                </div>
            </div>
        `;

        membersList.appendChild(item);
    });

    updateMembersCount();
}

/* =========================================================
   MESSAGES
   ========================================================= */

async function loadMessages() {
    if (!currentRoom) {
        return;
    }

    if (messagesList) {
        messagesList.innerHTML = "";
    }

    const { data, error } = await supabaseClient
        .from("chat_messages")
        .select(`
            id,
            room_id,
            user_id,
            body,
            created_at,
            nickname,
            room_type,
            message
        `)
        .eq("room_id", currentRoom.id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(
            "Ошибка загрузки сообщений:",
            error
        );

        showNotification(
            "Не удалось загрузить сообщения",
            "error"
        );

        return;
    }

    const messages = data || [];

    if (!messages.length) {
        renderEmptyMessages();
        return;
    }

    messages.forEach(message => {
        renderMessage(message);
    });

    scrollMessagesToBottom();
}

function renderEmptyMessages() {
    if (!messagesList) {
        return;
    }

    messagesList.innerHTML = `
        <div class="messages-empty">
            <div class="messages-empty-icon">
                💬
            </div>

            <div class="messages-empty-title">
                Пока сообщений нет
            </div>

            <div class="messages-empty-text">
                Будьте первым, кто напишет сообщение.
            </div>
        </div>
    `;
}

function renderMessage(message) {
    if (!messagesList) {
        return;
    }

    const existing = document.querySelector(
        `[data-message-id="${message.id}"]`
    );

    if (existing) {
        existing.remove();
    }

    const isOwn =
        message.user_id === currentUser?.id;

    const nickname =
        message.nickname ||
        getMemberName(message.user_id) ||
        "Пользователь";

    const body =
        message.body ||
        message.message ||
        "";

    const profile =
        getMemberProfile(message.user_id);

    const avatar =
        getAvatar(
            profile?.avatar_url,
            nickname
        );

    const element = document.createElement("div");

    element.className = "message";

    if (isOwn) {
        element.classList.add("own");
    }

    element.dataset.messageId = message.id;

    element.innerHTML = `
        <img
            class="message-avatar"
            src="${avatar}"
            alt=""
        >

        <div class="message-content">

            <div class="message-meta">
                <span class="message-author">
                    ${escapeHtml(nickname)}
                </span>

                <span class="message-time">
                    ${formatMessageTime(
                        message.created_at
                    )}
                </span>
            </div>

            <div class="message-bubble">
                ${formatMessageBody(body)}
            </div>

        </div>
    `;

    messagesList.appendChild(element);
}

function formatMessageBody(text) {
    return escapeHtml(text)
        .replace(/\n/g, "<br>");
}

/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {
    if (!currentRoom || !currentUser) {
        return;
    }

    if (isSending) {
        return;
    }

    const body = messageInput?.value?.trim();

    if (!body) {
        return;
    }

    isSending = true;

    const nickname =
        getProfileName(
            currentProfile,
            currentUser.id
        );

    const payload = {
        room_id: currentRoom.id,
        user_id: currentUser.id,
        body: body,
        nickname: nickname,
        room_type: "conference"
    };

    const { error } = await supabaseClient
        .from("chat_messages")
        .insert(payload);

    if (error) {
        console.error(
            "Ошибка отправки сообщения:",
            error
        );

        showNotification(
            "Не удалось отправить сообщение",
            "error"
        );

        isSending = false;
        return;
    }

    if (messageInput) {
        messageInput.value = "";
        messageInput.focus();
    }

    isSending = false;
}

/* =========================================================
   REALTIME MESSAGES
   ========================================================= */

function subscribeToMessages() {
    unsubscribeMessages();

    if (!currentRoom) {
        return;
    }

    messageSubscription = supabaseClient
        .channel(
            `conference-messages-${currentRoom.id}`
        )
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "chat_messages",
                filter: `room_id=eq.${currentRoom.id}`
            },
            payload => {
                const message = payload.new;

                if (!message) {
                    return;
                }

                const empty =
                    messagesList?.querySelector(
                        ".messages-empty"
                    );

                if (empty) {
                    empty.remove();
                }

                renderMessage(message);
                scrollMessagesToBottom();
            }
        )
        .subscribe(status => {
            console.log(
                "Message realtime:",
                status
            );
        });
}

function unsubscribeMessages() {
    if (messageSubscription) {
        supabaseClient.removeChannel(
            messageSubscription
        );

        messageSubscription = null;
    }
}

/* =========================================================
   REALTIME MEMBERS
   ========================================================= */

function subscribeToMembers() {
    unsubscribeMembers();

    if (!currentRoom) {
        return;
    }

    memberSubscription = supabaseClient
        .channel(
            `conference-members-${currentRoom.id}`
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "conference_room_members",
                filter: `room_id=eq.${currentRoom.id}`
            },
            async () => {
                await loadMembers();
            }
        )
        .subscribe(status => {
            console.log(
                "Member realtime:",
                status
            );
        });
}

function unsubscribeMembers() {
    if (memberSubscription) {
        supabaseClient.removeChannel(
            memberSubscription
        );

        memberSubscription = null;
    }
}

/* =========================================================
   CREATE ROOM
   ========================================================= */

async function createRoom() {
    if (!currentUser) {
        return;
    }

    const name =
        roomNameInput?.value?.trim();

    const description =
        roomDescriptionInput?.value?.trim();

    const gameId =
        roomGameSelect?.value || null;

    if (!name) {
        showNotification(
            "Введите название конференции",
            "error"
        );

        roomNameInput?.focus();

        return;
    }

    const payload = {
        name,
        description: description || null,
        created_by: currentUser.id,
        game_id: gameId,
        is_active: true
    };

    const { data, error } = await supabaseClient
        .from("conference_rooms")
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error(
            "Ошибка создания конференции:",
            error
        );

        showNotification(
            "Не удалось создать конференцию",
            "error"
        );

        return;
    }

    if (data) {
        await supabaseClient
            .from("conference_room_members")
            .insert({
                room_id: data.id,
                user_id: currentUser.id
            });
    }

    closeCreateRoomModal();

    if (createRoomForm) {
        createRoomForm.reset();
    }

    await loadRooms();

    if (data) {
        await openRoom(data.id);
    }

    showNotification(
        "Конференция создана",
        "success"
    );
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {
    if (messageForm) {
        messageForm.addEventListener(
            "submit",
            event => {
                event.preventDefault();
                sendMessage();
            }
        );
    }

    if (createRoomBtn) {
        createRoomBtn.addEventListener(
            "click",
            openCreateRoomModal
        );
    }

    if (closeCreateRoomBtn) {
        closeCreateRoomBtn.addEventListener(
            "click",
            closeCreateRoomModal
        );
    }

    if (cancelCreateRoomBtn) {
        cancelCreateRoomBtn.addEventListener(
            "click",
            closeCreateRoomModal
        );
    }

    if (createRoomForm) {
        createRoomForm.addEventListener(
            "submit",
            event => {
                event.preventDefault();
                createRoom();
            }
        );
    }

    if (refreshBtn) {
        refreshBtn.addEventListener(
            "click",
            async () => {
                await loadGames();
                await loadRooms();

                if (currentRoom) {
                    await loadMembers();
                    await loadMessages();
                }

                showNotification(
                    "Обновлено",
                    "success"
                );
            }
        );
    }

    if (logoutBtn) {
        logoutBtn.addEventListener(
            "click",
            logout
        );
    }

    if (messageInput) {
        messageInput.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {
                    event.preventDefault();

                    if (
                        !event.ctrlKey &&
                        !event.altKey
                    ) {
                        sendMessage();
                    }
                }
            }
        );
    }

    if (createRoomModal) {
        createRoomModal.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    createRoomModal
                ) {
                    closeCreateRoomModal();
                }
            }
        );
    }

    window.addEventListener(
        "beforeunload",
        () => {
            unsubscribeMessages();
            unsubscribeMembers();
        }
    );
}

/* =========================================================
   MODAL
   ========================================================= */

function openCreateRoomModal() {
    if (!createRoomModal) {
        return;
    }

    createRoomModal.classList.add("open");

    setTimeout(() => {
        roomNameInput?.focus();
    }, 50);
}

function closeCreateRoomModal() {
    if (!createRoomModal) {
        return;
    }

    createRoomModal.classList.remove("open");
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        console.error(
            "Ошибка выхода:",
            error
        );

        return;
    }

    redirectToLogin();
}

/* =========================================================
   HELPERS
   ========================================================= */

function getProfileName(profile, fallbackId) {
    if (!profile) {
        return `Пользователь ${String(
            fallbackId || ""
        ).slice(0, 6)}`;
    }

    return (
        profile.nickname ||
        profile.username ||
        profile.display_name ||
        profile.full_name ||
        profile.name ||
        `Пользователь ${String(
            fallbackId || ""
        ).slice(0, 6)}`
    );
}

function getMemberName(userId) {
    const member = members.find(
        item => item.user_id === userId
    );

    if (!member) {
        return null;
    }

    return getProfileName(
        member.profile,
        userId
    );
}

function getMemberProfile(userId) {
    const member = members.find(
        item => item.user_id === userId
    );

    return member?.profile || null;
}

function getAvatar(url, name) {
    if (url) {
        return url;
    }

    const safeName =
        String(name || "G")
            .trim()
            .charAt(0)
            .toUpperCase() || "G";

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="128"
            height="128"
            viewBox="0 0 128 128"
        >
            <defs>
                <linearGradient
                    id="bg"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color="#171717"
                    />
                    <stop
                        offset="100%"
                        stop-color="#303030"
                    />
                </linearGradient>
            </defs>

            <rect
                width="128"
                height="128"
                rx="64"
                fill="url(#bg)"
            />

            <circle
                cx="64"
                cy="48"
                r="23"
                fill="#f4c400"
            />

            <path
                d="
                    M31 106
                    C34 82 47 72 64 72
                    C81 72 94 82 97 106
                    Z
                "
                fill="#f4c400"
            />

            <text
                x="64"
                y="121"
                text-anchor="middle"
                font-family="Arial"
                font-size="10"
                font-weight="700"
                fill="#ffffff"
            >
                ${escapeXml(safeName)}
            </text>
        </svg>
    `;

    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg)
    );
}

function formatMessageTime(dateString) {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    return date.toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function scrollMessagesToBottom() {
    if (!messagesList) {
        return;
    }

    requestAnimationFrame(() => {
        messagesList.scrollTop =
            messagesList.scrollHeight;
    });
}

function pluralize(
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

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function redirectToLogin() {
    window.location.href = "../index.html";
}

function showNotification(
    message,
    type = "info"
) {
    if (!notification) {
        return;
    }

    notification.textContent = message;

    notification.className =
        `notification ${type} show`;

    clearTimeout(
        showNotification.timeout
    );

    showNotification.timeout =
        setTimeout(() => {
            notification.classList.remove(
                "show"
            );
        }, 3000);
}
