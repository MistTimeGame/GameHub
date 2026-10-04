# /*

# GAMEHUB CONFERENCE MODULE

Отдельный модуль конференции.

Не зависит от app.js основного GameHub.

Использует:

* Supabase Auth
* profiles
* conference_rooms
* conference_room_members
* chat_messages

Если названия колонок в существующих таблицах отличаются,
их можно будет скорректировать одним местом ниже.
=================================================

*/

/* =====================================================
SUPABASE
===================================================== */

/*
ВАЖНО:

Здесь нужно вставить те же значения,
которые используются в основном GameHub.

Если в основном проекте у тебя уже есть:

const SUPABASE_URL = "...";
const SUPABASE_ANON_KEY = "...";

просто скопируй значения сюда.
*/

const SUPABASE_URL = "https://tpdpciooxfulythevhgw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";

const supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

/* =====================================================
STATE
===================================================== */

const state = {

```
user: null,

profile: null,

rooms: [],

currentRoom: null,

messages: [],

members: [],

realtimeChannel: null,

messagesChannel: null,

games: [],

loading: false
```

};

/* =====================================================
DOM
===================================================== */

const $ = (id) => document.getElementById(id);

/* =====================================================
INIT
===================================================== */

document.addEventListener("DOMContentLoaded", init);

async function init() {

```
bindEvents();

try {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    if (!data.session) {

        redirectToMain();

        return;
    }

    state.user = data.session.user;

    await loadProfile();

    await loadRooms();

    await loadGames();

    renderUser();

} catch (error) {

    console.error(
        "Ошибка инициализации конференции:",
        error
    );

    showNotification(
        "Не удалось загрузить конференцию"
    );
}
```

}

/* =====================================================
EVENTS
===================================================== */

function bindEvents() {

```
$("backButton")
    .addEventListener(
        "click",
        redirectToMain
    );


$("logoutButton")
    .addEventListener(
        "click",
        logout
    );


$("refreshButton")
    .addEventListener(
        "click",
        refreshCurrentRoom
    );


$("membersButton")
    .addEventListener(
        "click",
        openMembers
    );


$("closeMembersButton")
    .addEventListener(
        "click",
        closeMembers
    );


$("createRoomButton")
    .addEventListener(
        "click",
        openCreateRoom
    );


$("closeCreateRoom")
    .addEventListener(
        "click",
        closeCreateRoom
    );


$("cancelCreateRoom")
    .addEventListener(
        "click",
        closeCreateRoom
    );


$("createRoomForm")
    .addEventListener(
        "submit",
        createRoom
    );


$("messageForm")
    .addEventListener(
        "submit",
        sendMessage
    );


$("messageInput")
    .addEventListener(
        "keydown",
        handleMessageKeydown
    );


$("attachButton")
    .addEventListener(
        "click",
        () => {

            showNotification(
                "Вложения добавим следующим этапом"
            );

        }
    );
```

}

/* =====================================================
PROFILE
===================================================== */

async function loadProfile() {

```
if (!state.user) {
    return;
}


const {
    data,
    error
} = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();


if (error) {

    console.error(
        "Ошибка загрузки профиля:",
        error
    );

    return;
}


state.profile = data;
```

}

function renderUser() {

```
const profile = state.profile;

const metadata =
    state.user?.user_metadata || {};


const username =
    profile?.username ||
    profile?.display_name ||
    profile?.nickname ||
    metadata.username ||
    metadata.name ||
    state.user?.email?.split("@")[0] ||
    "Пользователь";


const avatar =
    profile?.avatar_url ||
    profile?.photo_url ||
    metadata.avatar_url ||
    createDefaultAvatar(username);


$("sidebarUsername").textContent =
    username;


$("sidebarAvatar").src =
    avatar;


let vipText = "Пользователь";


if (profile?.vip_level) {

    vipText =
        "VIP " +
        romanNumber(
            Number(profile.vip_level)
        );
}


$("sidebarVip").textContent =
    vipText;
```

}

/* =====================================================
ROOMS
===================================================== */

async function loadRooms() {

```
$("roomsList").innerHTML = `
    <div class="rooms-loading">
        Загрузка...
    </div>
`;


/*
   Основная попытка:

   conference_rooms
   id
   name
   description
   game_id
   created_by
   created_at
*/

const {
    data,
    error
} = await supabaseClient
    .from("conference_rooms")
    .select("*")
    .order(
        "created_at",
        {
            ascending: true
        }
    );


if (error) {

    console.error(
        "Ошибка загрузки конференций:",
        error
    );


    $("roomsList").innerHTML = `
        <div class="rooms-loading">
            Не удалось загрузить конференции
        </div>
    `;

    return;
}


state.rooms =
    data || [];


renderRooms();
```

}

function renderRooms() {

```
const container =
    $("roomsList");


if (!state.rooms.length) {

    container.innerHTML = `
        <div class="rooms-loading">
            Конференций пока нет
        </div>
    `;

    return;
}


container.innerHTML =
    state.rooms
        .map(
            room => {

                const active =
                    state.currentRoom &&
                    state.currentRoom.id === room.id
                        ? "active"
                        : "";


                return `
                    <button
                        class="room-item ${active}"
                        data-room-id="${escapeHtml(
                            String(room.id)
                        )}"
                    >

                        <div class="room-item-icon">
                            #
                        </div>

                        <div class="room-item-info">

                            <span class="room-item-name">
                                ${escapeHtml(
                                    room.name ||
                                    "Без названия"
                                )}
                            </span>

                            <span class="room-item-description">
                                ${escapeHtml(
                                    room.description ||
                                    "Конференция"
                                )}
                            </span>

                        </div>

                    </button>
                `;
            }
        )
        .join("");


container
    .querySelectorAll(".room-item")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const roomId =
                        button.dataset.roomId;

                    selectRoom(roomId);
                }
            );

        }
    );
```

}

/* =====================================================
SELECT ROOM
===================================================== */

async function selectRoom(roomId) {

```
const room =
    state.rooms.find(
        item =>
            String(item.id) ===
            String(roomId)
    );


if (!room) {
    return;
}


state.currentRoom =
    room;


renderRooms();

renderRoomHeader();


$("emptyState")
    .classList.add("hidden");


$("chatContainer")
    .classList.remove("hidden");


await loadMessages();

await loadMembers();

subscribeToRoom();

scrollMessagesToBottom();
```

}

/* =====================================================
ROOM HEADER
===================================================== */

function renderRoomHeader() {

```
const room =
    state.currentRoom;


if (!room) {
    return;
}


$("headerRoomName")
    .textContent =
        room.name ||
        "Конференция";


$("headerRoomDescription")
    .textContent =
        room.description ||
        "Общая конференция";


$("headerRoomIcon")
    .textContent =
        "#";


$("membersCount")
    .textContent =
        String(
            state.members.length
        );
```

}

/* =====================================================
MESSAGES
===================================================== */

async function loadMessages() {

```
if (!state.currentRoom) {
    return;
}


$("messages").innerHTML = `
    <div class="system-message">
        Загрузка сообщений...
    </div>
`;


/*
   В существующем проекте таблица
   сообщений может иметь дополнительные поля.

   Здесь используются:

   id
   room_id
   user_id
   message
   created_at
*/


const {
    data,
    error
} = await supabaseClient
    .from("chat_messages")
    .select("*")
    .eq(
        "room_id",
        state.currentRoom.id
    )
    .order(
        "created_at",
        {
            ascending: true
        }
    )
    .limit(300);


if (error) {

    console.error(
        "Ошибка загрузки сообщений:",
        error
    );


    $("messages").innerHTML = `
        <div class="system-message">
            Не удалось загрузить сообщения
        </div>
    `;

    return;
}


state.messages =
    data || [];


renderMessages();
```

}

function renderMessages() {

```
const container =
    $("messages");


if (!state.messages.length) {

    container.innerHTML = `
        <div class="system-message">
            Сообщений пока нет. Начните общение.
        </div>
    `;

    return;
}


container.innerHTML =
    state.messages
        .map(
            message =>
                renderMessage(
                    message
                )
        )
        .join("");


scrollMessagesToBottom();
```

}

function renderMessage(message) {

```
const isOwn =
    String(message.user_id) ===
    String(state.user?.id);


const username =
    getMessageUsername(message);


const avatar =
    getMessageAvatar(message);


const text =
    getMessageText(message);


const time =
    formatTime(
        message.created_at
    );


return `
    <div
        class="message ${isOwn ? "own" : ""}"
        data-message-id="${escapeHtml(
            String(message.id)
        )}"
    >

        <img
            class="message-avatar"
            src="${escapeHtml(avatar)}"
            alt=""
        >

        <div class="message-body">

            <div class="message-author">
                ${escapeHtml(username)}
            </div>

            <div class="message-bubble">
                ${formatMessageText(text)}
            </div>

            <div class="message-time">
                ${escapeHtml(time)}
            </div>

        </div>

    </div>
`;
```

}

/* =====================================================
SEND MESSAGE
===================================================== */

async function sendMessage(event) {

```
event.preventDefault();


if (!state.currentRoom) {

    showNotification(
        "Сначала выберите конференцию"
    );

    return;
}


const input =
    $("messageInput");


const text =
    input.value.trim();


if (!text) {
    return;
}


if (!state.user) {
    return;
}


input.disabled = true;


try {

    /*
       Здесь специально используется
       поле message.

       Если в твоей chat_messages
       оно называется content/text,
       поменяем это после проверки SQL.
    */

    const {
        data,
        error
    } = await supabaseClient
        .from("chat_messages")
        .insert({

            room_id:
                state.currentRoom.id,

            user_id:
                state.user.id,

            message:
                text

        })
        .select()
        .single();


    if (error) {
        throw error;
    }


    input.value = "";


    /*
       Если Realtime включён,
       сообщение придёт автоматически.

       Но для надёжности добавляем его
       сразу, если подписка ещё не успела.
    */

    if (
        data &&
        !state.messages.some(
            item =>
                String(item.id) ===
                String(data.id)
        )
    ) {

        state.messages.push(data);

        renderMessages();
    }


} catch (error) {

    console.error(
        "Ошибка отправки сообщения:",
        error
    );


    showNotification(
        "Не удалось отправить сообщение"
    );

} finally {

    input.disabled = false;

    input.focus();
}
```

}

/* =====================================================
REALTIME
===================================================== */

function subscribeToRoom() {

```
unsubscribeFromRoom();


if (!state.currentRoom) {
    return;
}


const roomId =
    state.currentRoom.id;


state.messagesChannel =
    supabaseClient
        .channel(
            "conference-messages-" +
            String(roomId)
        )
        .on(
            "postgres_changes",
            {
                event: "INSERT",

                schema: "public",

                table: "chat_messages",

                filter:
                    "room_id=eq." +
                    roomId
            },

            payload => {

                const message =
                    payload.new;


                if (
                    !state.messages.some(
                        item =>
                            String(item.id) ===
                            String(message.id)
                    )
                ) {

                    state.messages.push(
                        message
                    );

                    renderMessages();
                }
            }
        )
        .subscribe();


state.realtimeChannel =
    supabaseClient
        .channel(
            "conference-rooms"
        )
        .on(
            "postgres_changes",
            {
                event: "*",

                schema: "public",

                table: "conference_rooms"
            },

            () => {

                loadRooms();
            }
        )
        .subscribe();
```

}

function unsubscribeFromRoom() {

```
if (state.messagesChannel) {

    supabaseClient.removeChannel(
        state.messagesChannel
    );

    state.messagesChannel =
        null;
}


if (state.realtimeChannel) {

    supabaseClient.removeChannel(
        state.realtimeChannel
    );

    state.realtimeChannel =
        null;
}
```

}

/* =====================================================
MEMBERS
===================================================== */

async function loadMembers() {

```
if (!state.currentRoom) {
    return;
}


const {
    data,
    error
} = await supabaseClient
    .from("conference_room_members")
    .select("*")
    .eq(
        "room_id",
        state.currentRoom.id
    );


if (error) {

    console.error(
        "Ошибка участников:",
        error
    );

    state.members = [];

    renderMembers();

    return;
}


state.members =
    data || [];


/*
   Если таблица участников
   хранит только user_id,
   отдельно получаем profiles.
*/

await enrichMembers();


renderMembers();

renderRoomHeader();
```

}

async function enrichMembers() {

```
if (!state.members.length) {
    return;
}


const userIds =
    state.members
        .map(
            member =>
                member.user_id
        )
        .filter(Boolean);


if (!userIds.length) {
    return;
}


const {
    data,
    error
} = await supabaseClient
    .from("profiles")
    .select("*")
    .in(
        "id",
        userIds
    );


if (error) {

    console.error(
        "Ошибка профилей участников:",
        error
    );

    return;
}


const profiles =
    data || [];


state.members =
    state.members.map(
        member => {

            const profile =
                profiles.find(
                    item =>
                        String(item.id) ===
                        String(member.user_id)
                );


            return {
                ...member,
                profile
            };
        }
    );
```

}

function renderMembers() {

```
const container =
    $("membersList");


const count =
    state.members.length;


$("membersCount")
    .textContent =
        String(count);


$("membersPanelCount")
    .textContent =
        String(count);


if (!count) {

    container.innerHTML = `
        <div class="system-message">
            Участников пока нет
        </div>
    `;

    return;
}


container.innerHTML =
    state.members
        .map(
            member => {

                const profile =
                    member.profile || {};


                const name =
                    profile.username ||
                    profile.display_name ||
                    profile.nickname ||
                    "Пользователь";


                const avatar =
                    profile.avatar_url ||
                    profile.photo_url ||
                    createDefaultAvatar(
                        name
                    );


                return `
                    <div class="member-item">

                        <img
                            class="member-avatar"
                            src="${escapeHtml(
                                avatar
                            )}"
                            alt=""
                        >

                        <div class="member-info">

                            <span class="member-name">
                                ${escapeHtml(
                                    name
                                )}
                            </span>

                            <span class="member-role">
                                ${getMemberRole(
                                    member
                                )}
                            </span>

                        </div>

                    </div>
                `;
            }
        )
        .join("");
```

}

function getMemberRole(member) {

```
if (
    String(member.user_id) ===
    String(state.currentRoom?.created_by)
) {

    return "Создатель";
}


if (member.role) {

    return String(
        member.role
    );
}


return "Участник";
```

}

/* =====================================================
CREATE ROOM
===================================================== */

function openCreateRoom() {

```
$("createRoomModal")
    .classList.remove("hidden");

$("createRoomError")
    .classList.add("hidden");

$("roomNameInput")
    .focus();
```

}

function closeCreateRoom() {

```
$("createRoomModal")
    .classList.add("hidden");

$("createRoomForm")
    .reset();
```

}

async function createRoom(event) {

```
event.preventDefault();


const name =
    $("roomNameInput")
        .value
        .trim();


const description =
    $("roomDescriptionInput")
        .value
        .trim();


const gameId =
    $("roomGameInput")
        .value ||
    null;


const errorBox =
    $("createRoomError");


errorBox
    .classList
    .add("hidden");


if (!name) {

    showCreateRoomError(
        "Введите название конференции"
    );

    return;
}


if (!state.user) {

    showCreateRoomError(
        "Пользователь не авторизован"
    );

    return;
}


try {

    const {
        data: room,
        error
    } = await supabaseClient
        .from("conference_rooms")
        .insert({

            name,

            description:
                description || null,

            game_id:
                gameId,

            created_by:
                state.user.id

        })
        .select()
        .single();


    if (error) {
        throw error;
    }


    /*
       Автоматически добавляем создателя
       в участников.
    */

    const {
        error: memberError
    } = await supabaseClient
        .from("conference_room_members")
        .insert({

            room_id:
                room.id,

            user_id:
                state.user.id,

            role:
                "owner"

        });


    if (memberError) {

        console.warn(
            "Комната создана, но участник не добавлен:",
            memberError
        );
    }


    closeCreateRoom();


    await loadRooms();


    if (room) {

        await selectRoom(
            room.id
        );
    }


    showNotification(
        "Конференция создана"
    );


} catch (error) {

    console.error(
        "Ошибка создания конференции:",
        error
    );


    showCreateRoomError(
        getSupabaseErrorMessage(
            error
        )
    );
}
```

}

function showCreateRoomError(message) {

```
const errorBox =
    $("createRoomError");


errorBox.textContent =
    message;


errorBox
    .classList
    .remove("hidden");
```

}

/* =====================================================
GAMES
===================================================== */

async function loadGames() {

```
const select =
    $("roomGameInput");


if (!select) {
    return;
}


try {

    const {
        data,
        error
    } = await supabaseClient
        .from("games")
        .select("*")
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {
        throw error;
    }


    state.games =
        data || [];


    state.games.forEach(
        game => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                game.id;


            option.textContent =
                game.name ||
                game.title ||
                "Игра";


            select.appendChild(
                option
            );
        }
    );

} catch (error) {

    console.warn(
        "Игры не загружены:",
        error
    );
}
```

}

/* =====================================================
MEMBERS PANEL
===================================================== */

function openMembers() {

```
$("membersPanel")
    .classList
    .remove("hidden");

renderMembers();
```

}

function closeMembers() {

```
$("membersPanel")
    .classList
    .add("hidden");
```

}

/* =====================================================
REFRESH
===================================================== */

async function refreshCurrentRoom() {

```
if (!state.currentRoom) {

    await loadRooms();

    return;
}


await Promise.all([
    loadMessages(),
    loadMembers()
]);


showNotification(
    "Конференция обновлена"
);
```

}

/* =====================================================
KEYBOARD
===================================================== */

function handleMessageKeydown(event) {

```
if (
    event.key === "Enter" &&
    !event.shiftKey
) {

    event.preventDefault();

    $("messageForm")
        .requestSubmit();
}
```

}

/* =====================================================
AUTH
===================================================== */

async function logout() {

```
try {

    await supabaseClient.auth.signOut();

    redirectToMain();

} catch (error) {

    console.error(
        "Ошибка выхода:",
        error
    );
}
```

}

/* =====================================================
REDIRECT
===================================================== */

function redirectToMain() {

```
/*
   conference.html находится
   внутри /conference/

   Поэтому ../ возвращает
   в корень GameHub.
*/

window.location.href =
    "../index.html";
```

}

/* =====================================================
SCROLL
===================================================== */

function scrollMessagesToBottom() {

```
const container =
    $("messages");


if (!container) {
    return;
}


requestAnimationFrame(
    () => {

        container.scrollTop =
            container.scrollHeight;
    }
);
```

}

/* =====================================================
MESSAGE HELPERS
===================================================== */

function getMessageUsername(message) {

```
if (
    message.profile &&
    (
        message.profile.username ||
        message.profile.display_name
    )
) {

    return (
        message.profile.username ||
        message.profile.display_name
    );
}


if (
    String(message.user_id) ===
    String(state.user?.id)
) {

    return (
        state.profile?.username ||
        state.profile?.display_name ||
        state.user?.email?.split("@")[0] ||
        "Вы"
    );
}


return "Пользователь";
```

}

function getMessageAvatar(message) {

```
if (message.profile) {

    return (
        message.profile.avatar_url ||
        message.profile.photo_url ||
        createDefaultAvatar(
            getMessageUsername(
                message
            )
        )
    );
}


if (
    String(message.user_id) ===
    String(state.user?.id)
) {

    return (
        state.profile?.avatar_url ||
        state.profile?.photo_url ||
        createDefaultAvatar(
            getMessageUsername(
                message
            )
        )
    );
}


return createDefaultAvatar(
    getMessageUsername(
        message
    )
);
```

}

function getMessageText(message) {

```
return (
    message.message ??
    message.content ??
    message.text ??
    ""
);
```

}

/* =====================================================
DEFAULT AVATAR
===================================================== */

function createDefaultAvatar(name) {

```
const first =
    String(name || "G")
        .trim()
        .charAt(0)
        .toUpperCase();


const svg = `
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100"
        height="100"
        viewBox="0 0 100 100"
    >

        <rect
            width="100"
            height="100"
            rx="50"
            fill="#ffd400"
        />

        <circle
            cx="50"
            cy="42"
            r="18"
            fill="#222"
        />

        <path
            d="M24 82
               C27 63 38 55 50 55
               C62 55 73 63 76 82"
            fill="#222"
        />

        <text
            x="50"
            y="95"
            text-anchor="middle"
            font-family="Arial"
            font-size="9"
            font-weight="bold"
            fill="#111"
        >
            ${escapeHtml(first)}
        </text>

    </svg>
`;


return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(svg)
);
```

}

/* =====================================================
ROMAN NUMBERS
===================================================== */

function romanNumber(number) {

```
const values = [
    [10, "X"],
    [9, "IX"],
    [8, "VIII"],
    [7, "VII"],
    [6, "VI"],
    [5, "V"],
    [4, "IV"],
    [3, "III"],
    [2, "II"],
    [1, "I"]
];


let result = "";
let value = Number(number) || 0;


for (
    const [
        numeric,
        roman
    ] of values
) {

    while (
        value >= numeric
    ) {

        result += roman;

        value -= numeric;
    }
}


return result || "0";
```

}

/* =====================================================
DATE
===================================================== */

function formatTime(date) {

```
if (!date) {
    return "";
}


const parsed =
    new Date(date);


if (
    Number.isNaN(
        parsed.getTime()
    )
) {

    return "";
}


return parsed.toLocaleTimeString(
    "ru-RU",
    {
        hour: "2-digit",
        minute: "2-digit"
    }
);
```

}

/* =====================================================
FORMAT MESSAGE
===================================================== */

function formatMessageText(text) {

```
let safe =
    escapeHtml(
        String(text || "")
    );


safe =
    safe.replace(
        /\n/g,
        "<br>"
    );


return safe;
```

}

/* =====================================================
ESCAPE
===================================================== */

function escapeHtml(value) {

```
return String(value ?? "")
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
```

}

/* =====================================================
NOTIFICATION
===================================================== */

let notificationTimer = null;

function showNotification(message) {

```
const notification =
    $("notification");


$("notificationText")
    .textContent =
        message;


notification
    .classList
    .remove("hidden");


clearTimeout(
    notificationTimer
);


notificationTimer =
    setTimeout(
        () => {

            notification
                .classList
                .add("hidden");

        },
        3000
    );
```

}

/* =====================================================
SUPABASE ERROR
===================================================== */

function getSupabaseErrorMessage(error) {

```
if (!error) {
    return "Неизвестная ошибка";
}


if (
    error.code ===
    "42501"
) {

    return (
        "Недостаточно прав. " +
        "Проверьте RLS-политики Supabase."
    );
}


if (
    error.code ===
    "23505"
) {

    return (
        "Такая запись уже существует."
    );
}


if (
    error.code ===
    "23503"
) {

    return (
        "Связанная запись не найдена."
    );
}


return (
    error.message ||
    "Произошла ошибка"
);
```

}

/* =====================================================
AUTH LISTENER
===================================================== */

supabaseClient.auth.onAuthStateChange(
(
event,
session
) => {

```
    if (
        event ===
        "SIGNED_OUT"
    ) {

        redirectToMain();

        return;
    }


    if (
        session &&
        !state.user
    ) {

        state.user =
            session.user;

    }
}
```

);

/* =====================================================
PAGE UNLOAD
===================================================== */

window.addEventListener(
"beforeunload",
() => {

```
    unsubscribeFromRoom();

}
```

);
