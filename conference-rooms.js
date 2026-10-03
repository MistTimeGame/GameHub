/* =========================================================
   GAME PLATFORM
   CONFERENCE ROOMS
   Version 2.0
   Supabase + Realtime + WebRTC

   ВАЖНО:
   Этот файл НЕ управляет #app-shell и #page-content.
   Конференция работает отдельным модальным окном.
   ========================================================= */

(function () {
    "use strict";

    const SUPABASE_URL = "https://tpdpciooxfulythevhgw.supabase.co";
    const SUPABASE_KEY = "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";

    if (!window.supabase) {
        console.error("[Conference] Supabase CDN не найден.");
        return;
    }

    const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    let currentUser = null;
    let currentRoom = null;
    let roomChannel = null;
    let memberChannel = null;

    let localStream = null;
    let screenStream = null;

    const peers = {};
    const remoteStreams = {};

    let conferenceInitialized = false;

    /* =========================================================
       STYLES
       ========================================================= */

    function injectStyles() {
        if (document.getElementById("conference-v2-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "conference-v2-styles";

        style.textContent = `
        #conference-v2-modal {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 20, 30, 0.55);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }

        #conference-v2-modal.open {
            display: flex;
        }

        .conference-v2-window {
            width: min(1180px, 96vw);
            height: min(760px, 92vh);
            min-height: 520px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #f7f9fc;
            border: 1px solid rgba(0,0,0,.14);
            border-radius: 28px;
            box-shadow:
                0 30px 80px rgba(0,0,0,.25),
                0 0 35px rgba(80,150,255,.10);
        }

        .conference-v2-header {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 22px;
            background: rgba(255,255,255,.92);
            border-bottom: 1px solid rgba(0,0,0,.08);
        }

        .conference-v2-title {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        .conference-v2-logo {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            color: #111;
            background: linear-gradient(145deg,#ffffff,#dfe4ea);
            border: 1px solid rgba(0,0,0,.16);
            box-shadow:
                inset 0 1px 0 #fff,
                0 5px 12px rgba(0,0,0,.08);
        }

        .conference-v2-title-text {
            min-width: 0;
        }

        .conference-v2-title-text strong {
            display: block;
            font-size: 17px;
            line-height: 1.2;
            color: #101216;
        }

        .conference-v2-title-text span {
            display: block;
            margin-top: 3px;
            color: #727985;
            font-size: 12px;
        }

        .conference-v2-close {
            width: 40px;
            height: 40px;
            border: 1px solid rgba(0,0,0,.12);
            border-radius: 13px;
            background: #fff;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            color: #222;
        }

        .conference-v2-close:hover {
            background: #edf1f6;
        }

        .conference-v2-body {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            display: flex;
        }

        .conference-v2-lobby {
            width: 100%;
            height: 100%;
            overflow: auto;
            padding: 24px;
        }

        .conference-v2-lobby-head {
            margin-bottom: 20px;
        }

        .conference-v2-lobby-head h2 {
            margin: 0;
            font-size: 26px;
            color: #111;
        }

        .conference-v2-lobby-head p {
            margin: 7px 0 0;
            color: #727985;
        }

        .conference-v2-rooms {
            display: grid;
            grid-template-columns: repeat(auto-fill,minmax(280px,1fr));
            gap: 16px;
        }

        .conference-v2-room {
            padding: 20px;
            border-radius: 20px;
            background: #fff;
            border: 1px solid rgba(0,0,0,.11);
            box-shadow:
                0 8px 22px rgba(0,0,0,.05),
                inset 0 1px 0 rgba(255,255,255,.9);
        }

        .conference-v2-room-name {
            font-size: 18px;
            font-weight: 800;
            color: #111;
        }

        .conference-v2-room-description {
            margin-top: 8px;
            min-height: 42px;
            color: #747b86;
            font-size: 13px;
            line-height: 1.45;
        }

        .conference-v2-room-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 15px;
            color: #68707c;
            font-size: 12px;
        }

        .conference-v2-online-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #26b36a;
            box-shadow: 0 0 8px rgba(38,179,106,.45);
        }

        .conference-v2-button {
            border: 1px solid rgba(0,0,0,.16);
            border-radius: 14px;
            min-height: 42px;
            padding: 0 16px;
            font-weight: 750;
            cursor: pointer;
            background: linear-gradient(145deg,#fff,#e5e9ee);
            color: #111;
            box-shadow:
                inset 0 1px 0 #fff,
                0 5px 12px rgba(0,0,0,.07);
        }

        .conference-v2-button:hover {
            transform: translateY(-1px);
        }

        .conference-v2-button.primary {
            background: linear-gradient(145deg,#eaf4ff,#cfe4ff);
            border-color: rgba(75,145,225,.4);
        }

        .conference-v2-button.danger {
            background: linear-gradient(145deg,#fff,#f0dddd);
        }

        .conference-v2-empty {
            padding: 40px;
            text-align: center;
            color: #737b87;
        }

        .conference-v2-error {
            margin: 15px 0;
            padding: 12px 14px;
            border-radius: 12px;
            background: #fff0f0;
            border: 1px solid #edb4b4;
            color: #a12626;
            font-size: 13px;
        }

        .conference-v2-room-view {
            width: 100%;
            height: 100%;
            min-height: 0;
            display: flex;
            flex-direction: column;
        }

        .conference-v2-room-toolbar {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            background: #fff;
            border-bottom: 1px solid rgba(0,0,0,.08);
        }

        .conference-v2-room-info strong {
            display: block;
            font-size: 17px;
            color: #111;
        }

        .conference-v2-room-info span {
            display: block;
            margin-top: 3px;
            color: #737b87;
            font-size: 12px;
        }

        .conference-v2-toolbar-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .conference-v2-content {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            overflow: hidden;
        }

        .conference-v2-video-area {
            flex: 1 1 auto;
            min-width: 0;
            min-height: 0;
            padding: 14px;
            display: grid;
            grid-template-columns: repeat(auto-fit,minmax(260px,1fr));
            grid-auto-rows: minmax(180px,1fr);
            gap: 12px;
            overflow: auto;
            background:
                radial-gradient(circle at 50% 0%,rgba(105,160,220,.10),transparent 45%),
                #e9edf2;
        }

        .conference-v2-video-card {
            position: relative;
            min-height: 180px;
            overflow: hidden;
            border-radius: 20px;
            background: #16191e;
            border: 1px solid rgba(0,0,0,.18);
            box-shadow: 0 10px 25px rgba(0,0,0,.13);
        }

        .conference-v2-video-card video {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            background: #111;
        }

        .conference-v2-video-name {
            position: absolute;
            left: 10px;
            bottom: 10px;
            max-width: calc(100% - 20px);
            padding: 7px 10px;
            border-radius: 10px;
            background: rgba(0,0,0,.60);
            color: #fff;
            font-size: 12px;
        }

        .conference-v2-participants {
            flex: 0 0 245px;
            width: 245px;
            padding: 16px;
            overflow: auto;
            background: #fff;
            border-left: 1px solid rgba(0,0,0,.08);
        }

        .conference-v2-participants-title {
            margin-bottom: 12px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .08em;
            color: #777f8a;
        }

        .conference-v2-member {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 8px;
            border-radius: 12px;
        }

        .conference-v2-member:hover {
            background: #f2f5f8;
        }

        .conference-v2-member-avatar {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #e7ebf0;
            border: 1px solid rgba(0,0,0,.1);
        }

        .conference-v2-member-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .conference-v2-member-name {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #222;
            font-size: 13px;
        }

        .conference-v2-member-name small {
            display: block;
            margin-top: 2px;
            color: #8a919b;
            font-size: 10px;
        }

        .conference-v2-local-controls {
            flex: 0 0 auto;
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            background: #fff;
            border-top: 1px solid rgba(0,0,0,.08);
        }

        .conference-v2-status {
            margin-right: auto;
            display: flex;
            align-items: center;
            color: #6f7782;
            font-size: 12px;
        }

        @media (max-width: 850px) {
            #conference-v2-modal {
                padding: 0;
            }

            .conference-v2-window {
                width: 100vw;
                height: 100vh;
                max-width: none;
                max-height: none;
                border-radius: 0;
            }

            .conference-v2-content {
                flex-direction: column;
            }

            .conference-v2-participants {
                width: auto;
                flex: 0 0 170px;
                border-left: 0;
                border-top: 1px solid rgba(0,0,0,.08);
            }

            .conference-v2-video-area {
                grid-template-columns: repeat(auto-fit,minmax(210px,1fr));
            }
        }
        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       HTML
       ========================================================= */

    function createModal() {
        if (document.getElementById("conference-v2-modal")) {
            return;
        }

        const modal = document.createElement("div");

        modal.id = "conference-v2-modal";

        modal.innerHTML = `
            <div class="conference-v2-window">

                <div class="conference-v2-header">

                    <div class="conference-v2-title">

                        <div class="conference-v2-logo">
                            GP
                        </div>

                        <div class="conference-v2-title-text">
                            <strong>GAME PLATFORM</strong>
                            <span>Конференция</span>
                        </div>

                    </div>

                    <button
                        type="button"
                        class="conference-v2-close"
                        id="conference-v2-close"
                    >×</button>

                </div>

                <div class="conference-v2-body">

                    <section
                        id="conference-v2-lobby"
                        class="conference-v2-lobby"
                    >

                        <div class="conference-v2-lobby-head">

                            <h2>Комнаты конференции</h2>

                            <p>
                                Выберите комнату и подключитесь к другим игрокам.
                            </p>

                        </div>

                        <div
                            id="conference-v2-lobby-message"
                        ></div>

                        <div
                            id="conference-v2-rooms"
                            class="conference-v2-rooms"
                        ></div>

                    </section>

                    <section
                        id="conference-v2-room-view"
                        class="conference-v2-room-view"
                        style="display:none"
                    >

                        <div class="conference-v2-room-toolbar">

                            <div class="conference-v2-room-info">
                                <strong id="conference-v2-room-name">
                                    Конференция
                                </strong>

                                <span id="conference-v2-room-status">
                                    Подключение...
                                </span>
                            </div>

                            <div class="conference-v2-toolbar-actions">

                                <button
                                    type="button"
                                    class="conference-v2-button"
                                    id="conference-v2-mic"
                                >
                                    🎤 Микрофон
                                </button>

                                <button
                                    type="button"
                                    class="conference-v2-button"
                                    id="conference-v2-camera"
                                >
                                    📷 Камера
                                </button>

                                <button
                                    type="button"
                                    class="conference-v2-button"
                                    id="conference-v2-screen"
                                >
                                    🖥 Экран
                                </button>

                                <button
                                    type="button"
                                    class="conference-v2-button danger"
                                    id="conference-v2-leave"
                                >
                                    Выйти
                                </button>

                            </div>

                        </div>

                        <div class="conference-v2-content">

                            <div
                                id="conference-v2-videos"
                                class="conference-v2-video-area"
                            ></div>

                            <aside class="conference-v2-participants">

                                <div class="conference-v2-participants-title">
                                    УЧАСТНИКИ
                                </div>

                                <div
                                    id="conference-v2-members"
                                ></div>

                            </aside>

                        </div>

                        <div class="conference-v2-local-controls">

                            <div
                                id="conference-v2-status"
                                class="conference-v2-status"
                            >
                                Подключение...
                            </div>

                        </div>

                    </section>

                </div>

            </div>
        `;

        document.body.appendChild(modal);

        document
            .getElementById("conference-v2-close")
            .addEventListener("click", function () {
                closeConference();
            });

        document
            .getElementById("conference-v2-leave")
            .addEventListener("click", function () {
                leaveRoom();
            });

        document
            .getElementById("conference-v2-mic")
            .addEventListener("click", function () {
                toggleMicrophone();
            });

        document
            .getElementById("conference-v2-camera")
            .addEventListener("click", function () {
                toggleCamera();
            });

        document
            .getElementById("conference-v2-screen")
            .addEventListener("click", function () {
                shareScreen();
            });
    }

    /* =========================================================
       AUTH
       ========================================================= */

    async function getCurrentUser() {
        const result = await db.auth.getUser();

        if (result.error) {
            console.error("[Conference] Auth error:", result.error);
            return null;
        }

        return result.data.user || null;
    }

    /* =========================================================
       OPEN / CLOSE
       ========================================================= */

    async function openConference() {
        try {
            createModal();

            const modal = document.getElementById("conference-v2-modal");

            /*
             * ВАЖНО:
             * Мы НЕ трогаем:
             * #app-shell
             * #page-content
             * body.classList
             * текущую страницу.
             */

            modal.classList.add("open");

            currentUser = await getCurrentUser();

            if (!currentUser) {
                showLobbyMessage(
                    "Не удалось определить пользователя. Сначала войдите в аккаунт."
                );
                return;
            }

            await showLobby();

        } catch (error) {
            console.error("[Conference] open error:", error);

            showLobbyMessage(
                "Ошибка открытия конференции: " +
                (error.message || error)
            );
        }
    }

    function closeConference() {
        /*
         * Если пользователь просто закрыл окно —
         * не удаляем его из комнаты принудительно.
         * Но если он находится внутри комнаты,
         * корректно выходим.
         */

        if (currentRoom) {
            leaveRoom();
        }

        const modal = document.getElementById("conference-v2-modal");

        if (modal) {
            modal.classList.remove("open");
        }
    }

    /* =========================================================
       LOBBY
       ========================================================= */

    async function showLobby() {
        stopMedia();

        currentRoom = null;

        if (roomChannel) {
            try {
                await db.removeChannel(roomChannel);
            } catch (e) {
                console.warn(e);
            }

            roomChannel = null;
        }

        if (memberChannel) {
            try {
                await db.removeChannel(memberChannel);
            } catch (e) {
                console.warn(e);
            }

            memberChannel = null;
        }

        document.getElementById("conference-v2-lobby").style.display = "block";
        document.getElementById("conference-v2-room-view").style.display = "none";

        await loadRooms();
    }

    async function loadRooms() {
        const container = document.getElementById("conference-v2-rooms");

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="conference-v2-empty">
                Загрузка комнат...
            </div>
        `;

        const result = await db
            .from("conference_rooms")
            .select("id,name,description,is_active,created_at")
            .eq("is_active", true)
            .order("created_at", {
                ascending: true
            });

        if (result.error) {
            console.error(
                "[Conference] rooms error:",
                result.error
            );

            container.innerHTML = `
                <div class="conference-v2-error">
                    Не удалось загрузить комнаты.<br><br>
                    ${escapeHtml(result.error.message)}
                </div>
            `;

            return;
        }

        const rooms = result.data || [];

        if (!rooms.length) {
            container.innerHTML = `
                <div class="conference-v2-empty">
                    Пока нет доступных комнат.
                </div>
            `;

            return;
        }

        container.innerHTML = "";

        for (const room of rooms) {
            const card = document.createElement("div");

            card.className = "conference-v2-room";

            card.innerHTML = `
                <div class="conference-v2-room-name">
                    ${escapeHtml(room.name)}
                </div>

                <div class="conference-v2-room-description">
                    ${escapeHtml(
                        room.description ||
                        "Игровая конференция"
                    )}
                </div>

                <div class="conference-v2-room-meta">
                    <span class="conference-v2-online-dot"></span>
                    <span>Комната доступна</span>
                </div>

                <div style="margin-top:16px">
                    <button
                        type="button"
                        class="conference-v2-button primary"
                        data-room-id="${room.id}"
                        style="width:100%"
                    >
                        Войти в комнату
                    </button>
                </div>
            `;

            const button = card.querySelector(
                "[data-room-id]"
            );

            button.addEventListener("click", function () {
                joinRoom(room);
            });

            container.appendChild(card);
        }
    }

    function showLobbyMessage(message) {
        const element = document.getElementById(
            "conference-v2-lobby-message"
        );

        if (!element) {
            return;
        }

        element.innerHTML = `
            <div class="conference-v2-error">
                ${escapeHtml(message)}
            </div>
        `;
    }

    /* =========================================================
       JOIN ROOM
       ========================================================= */

    async function joinRoom(room) {
        try {
            if (!currentUser) {
                currentUser = await getCurrentUser();
            }

            if (!currentUser) {
                throw new Error(
                    "Пользователь не авторизован."
                );
            }

            console.log(
                "[Conference] JOIN ROOM:",
                room.id,
                room.name
            );

            /*
             * Сначала удаляем старое присутствие этого пользователя.
             * Это особенно важно после закрытия вкладки/обновления.
             */

            await db
                .from("conference_room_members")
                .delete()
                .eq("user_id", currentUser.id);

            /*
             * Теперь добавляем пользователя
             * именно в выбранную комнату.
             */

            const insertResult = await db
                .from("conference_room_members")
                .insert({
                    room_id: room.id,
                    user_id: currentUser.id
                });

            if (insertResult.error) {
                throw insertResult.error;
            }

            currentRoom = room;

            document.getElementById(
                "conference-v2-lobby"
            ).style.display = "none";

            document.getElementById(
                "conference-v2-room-view"
            ).style.display = "flex";

            document.getElementById(
                "conference-v2-room-name"
            ).textContent = room.name;

            document.getElementById(
                "conference-v2-room-status"
            ).textContent = "Подключение к комнате...";

            document.getElementById(
                "conference-v2-status"
            ).textContent = "Подключение к комнате...";

            /*
             * Получаем камеру и микрофон.
             */

            await startLocalMedia();

            /*
             * Запускаем realtime именно с UUID комнаты.
             */

            await startRoomChannel();

            /*
             * Загружаем участников.
             */

            await refreshMembers();

            document.getElementById(
                "conference-v2-room-status"
            ).textContent = "Вы подключены";

            document.getElementById(
                "conference-v2-status"
            ).textContent = "Конференция активна";

        } catch (error) {
            console.error(
                "[Conference] join error:",
                error
            );

            await cleanupRoomConnection();

            alert(
                "Не удалось войти в конференцию:\n\n" +
                (error.message || error)
            );

            await showLobby();
        }
    }

    /* =========================================================
       REALTIME ROOM CHANNEL
       ========================================================= */

    async function startRoomChannel() {
        if (!currentRoom || !currentUser) {
            return;
        }

        if (roomChannel) {
            try {
                await db.removeChannel(roomChannel);
            } catch (e) {
                console.warn(e);
            }

            roomChannel = null;
        }

        const topic =
            "game-platform-conference-room-" +
            currentRoom.id;

        console.log(
            "[Conference] realtime topic:",
            topic
        );

        roomChannel = db.channel(topic, {
            config: {
                broadcast: {
                    self: false
                },
                presence: {
                    key: currentUser.id
                }
            }
        });

        roomChannel
            .on(
                "broadcast",
                {
                    event: "webrtc"
                },
                async function (payload) {
                    await handleWebRTCMessage(
                        payload.payload
                    );
                }
            )
            .on(
                "presence",
                {
                    event: "sync"
                },
                async function () {
                    console.log(
                        "[Conference] presence sync"
                    );

                    await refreshMembers();

                    await createConnectionsForPresentUsers();
                }
            )
            .on(
                "presence",
                {
                    event: "join"
                },
                async function (payload) {
                    console.log(
                        "[Conference] participant joined:",
                        payload
                    );

                    await refreshMembers();

                    await createConnectionsForPresentUsers();
                }
            )
            .on(
                "presence",
                {
                    event: "leave"
                },
                async function (payload) {
                    console.log(
                        "[Conference] participant left:",
                        payload
                    );

                    await refreshMembers();

                    const leftId =
                        payload?.key;

                    if (leftId) {
                        closePeer(leftId);
                    }
                }
            );

        const subscribeResult = await new Promise(
            function (resolve, reject) {

                roomChannel.subscribe(
                    async function (status) {

                        console.log(
                            "[Conference] channel status:",
                            status
                        );

                        if (status === "SUBSCRIBED") {

                            try {

                                await roomChannel.track({
                                    user_id:
                                        currentUser.id,
                                    room_id:
                                        currentRoom.id,
                                    online_at:
                                        new Date().toISOString()
                                });

                                resolve();

                            } catch (error) {
                                reject(error);
                            }

                        }

                        if (
                            status === "CHANNEL_ERROR" ||
                            status === "TIMED_OUT" ||
                            status === "CLOSED"
                        ) {
                            reject(
                                new Error(
                                    "Realtime: " + status
                                )
                            );
                        }
                    }
                );

            }
        );

        return subscribeResult;
    }

    /* =========================================================
       MEMBERS
       ========================================================= */

    async function refreshMembers() {
        if (!currentRoom) {
            return;
        }

        const result = await db
            .from("conference_room_members")
            .select("user_id,joined_at")
            .eq("room_id", currentRoom.id)
            .order("joined_at", {
                ascending: true
            });

        if (result.error) {
            console.error(
                "[Conference] members error:",
                result.error
            );

            return;
        }

        const members = result.data || [];

        const ids = members.map(
            function (member) {
                return member.user_id;
            }
        );

        let profiles = [];

        if (ids.length) {

            const profileResult = await db
                .from("profiles")
                .select(
                    "id,nickname,avatar_url,status"
                )
                .in("id", ids);

            if (!profileResult.error) {
                profiles =
                    profileResult.data || [];
            }
        }

        const profileMap = {};

        profiles.forEach(function (profile) {
            profileMap[profile.id] = profile;
        });

        const container =
            document.getElementById(
                "conference-v2-members"
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (!members.length) {
            container.innerHTML = `
                <div class="conference-v2-empty">
                    Пока никого нет.
                </div>
            `;

            return;
        }

        members.forEach(function (member) {

            const profile =
                profileMap[member.user_id] || {};

            const nickname =
                profile.nickname ||
                (
                    member.user_id ===
                    currentUser.id
                        ? "Вы"
                        : "Игрок"
                );

            const row =
                document.createElement("div");

            row.className =
                "conference-v2-member";

            const avatar =
                profile.avatar_url
                    ? `
                        <img
                            src="${escapeAttribute(
                                profile.avatar_url
                            )}"
                            alt=""
                        >
                    `
                    : "🤖";

            row.innerHTML = `
                <div class="conference-v2-member-avatar">
                    ${avatar}
                </div>

                <div class="conference-v2-member-name">
                    ${escapeHtml(nickname)}

                    ${
                        member.user_id ===
                        currentUser.id
                            ? "<small>Вы</small>"
                            : "<small>Участник</small>"
                    }
                </div>
            `;

            container.appendChild(row);
        });
    }

    /* =========================================================
       MEDIA
       ========================================================= */

    async function startLocalMedia() {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            throw new Error(
                "Браузер не поддерживает камеру и микрофон."
            );
        }

        try {

            localStream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

        } catch (error) {

            console.warn(
                "[Conference] Camera/mic denied:",
                error
            );

            /*
             * Если камера недоступна,
             * пробуем хотя бы микрофон.
             */

            try {

                localStream =
                    await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false
                    });

            } catch (audioError) {

                console.warn(
                    "[Conference] Audio denied:",
                    audioError
                );

                /*
                 * Конференция всё равно может быть открыта.
                 */

                localStream = new MediaStream();
            }
        }

        createLocalVideo();
    }

    function createLocalVideo() {
        const container =
            document.getElementById(
                "conference-v2-videos"
            );

        if (!container) {
            return;
        }

        let card =
            document.getElementById(
                "conference-local-video"
            );

        if (!card) {

            card =
                document.createElement("div");

            card.id =
                "conference-local-video";

            card.className =
                "conference-v2-video-card";

            card.innerHTML = `
                <video
                    id="conference-local-video-element"
                    autoplay
                    muted
                    playsinline
                ></video>

                <div class="conference-v2-video-name">
                    Вы
                </div>
            `;

            container.appendChild(card);
        }

        const video =
            document.getElementById(
                "conference-local-video-element"
            );

        if (video) {
            video.srcObject = localStream;
        }
    }

    function toggleMicrophone() {

        if (!localStream) {
            return;
        }

        const tracks =
            localStream.getAudioTracks();

        if (!tracks.length) {
            alert(
                "Микрофон не подключён."
            );

            return;
        }

        const enabled =
            !tracks[0].enabled;

        tracks.forEach(function (track) {
            track.enabled = enabled;
        });

        const button =
            document.getElementById(
                "conference-v2-mic"
            );

        button.textContent =
            enabled
                ? "🎤 Микрофон"
                : "🔇 Микрофон выключен";
    }

    function toggleCamera() {

        if (!localStream) {
            return;
        }

        const tracks =
            localStream.getVideoTracks();

        if (!tracks.length) {
            alert(
                "Камера не подключена."
            );

            return;
        }

        const enabled =
            !tracks[0].enabled;

        tracks.forEach(function (track) {
            track.enabled = enabled;
        });

        const button =
            document.getElementById(
                "conference-v2-camera"
            );

        button.textContent =
            enabled
                ? "📷 Камера"
                : "🚫 Камера выключена";
    }

    async function shareScreen() {

        if (!navigator.mediaDevices.getDisplayMedia) {
            alert(
                "Ваш браузер не поддерживает демонстрацию экрана."
            );

            return;
        }

        try {

            screenStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });

            const screenTrack =
                screenStream.getVideoTracks()[0];

            if (!screenTrack) {
                return;
            }

            screenTrack.onended =
                function () {
                    stopScreenShare();
                };

            for (
                const peerId in peers
            ) {

                const peer =
                    peers[peerId];

                if (!peer) {
                    continue;
                }

                const sender =
                    peer
                        .getSenders()
                        .find(function (item) {
                            return (
                                item.track &&
                                item.track.kind ===
                                "video"
                            );
                        });

                if (sender) {
                    await sender.replaceTrack(
                        screenTrack
                    );
                }
            }

        } catch (error) {

            console.warn(
                "[Conference] Screen share:",
                error
            );
        }
    }

    function stopScreenShare() {

        if (!screenStream) {
            return;
        }

        screenStream
            .getTracks()
            .forEach(function (track) {
                track.stop();
            });

        screenStream = null;

        if (!localStream) {
            return;
        }

        const cameraTrack =
            localStream.getVideoTracks()[0];

        if (!cameraTrack) {
            return;
        }

        for (
            const peerId in peers
        ) {

            const peer =
                peers[peerId];

            if (!peer) {
                continue;
            }

            const sender =
                peer
                    .getSenders()
                    .find(function (item) {
                        return (
                            item.track &&
                            item.track.kind ===
                            "video"
                        );
                    });

            if (sender) {
                sender.replaceTrack(
                    cameraTrack
                );
            }
        }
    }

    function stopMedia() {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(function (track) {
                    track.stop();
                });

            localStream = null;
        }

        if (screenStream) {

            screenStream
                .getTracks()
                .forEach(function (track) {
                    track.stop();
                });

            screenStream = null;
        }

        const localVideo =
            document.getElementById(
                "conference-local-video-element"
            );

        if (localVideo) {
            localVideo.srcObject = null;
        }
    }

    /* =========================================================
       WEBRTC
       ========================================================= */

    function createPeer(remoteUserId) {

        if (
            !currentUser ||
            !remoteUserId ||
            remoteUserId === currentUser.id
        ) {
            return null;
        }

        if (peers[remoteUserId]) {
            return peers[remoteUserId];
        }

        console.log(
            "[Conference] create peer:",
            remoteUserId
        );

        const peer =
            new RTCPeerConnection({
                iceServers: [
                    {
                        urls:
                            "stun:stun.l.google.com:19302"
                    },
                    {
                        urls:
                            "stun:stun1.l.google.com:19302"
                    }
                ]
            });

        peers[remoteUserId] = peer;

        /*
         * Добавляем локальные tracks.
         */

        if (localStream) {

            localStream
                .getTracks()
                .forEach(function (track) {

                    try {

                        peer.addTrack(
                            track,
                            localStream
                        );

                    } catch (error) {

                        console.warn(
                            "[Conference] addTrack:",
                            error
                        );

                    }

                });

        } else {

            peer.addTransceiver(
                "audio",
                {
                    direction: "recvonly"
                }
            );

            peer.addTransceiver(
                "video",
                {
                    direction: "recvonly"
                }
            );
        }

        peer.onicecandidate =
            async function (event) {

                if (
                    !event.candidate ||
                    !roomChannel
                ) {
                    return;
                }

                await sendSignal(
                    remoteUserId,
                    {
                        type: "ice",
                        candidate:
                            event.candidate
                    }
                );
            };

        peer.ontrack =
            function (event) {

                const stream =
                    event.streams &&
                    event.streams[0];

                if (!stream) {
                    return;
                }

                remoteStreams[remoteUserId] =
                    stream;

                createRemoteVideo(
                    remoteUserId,
                    stream
                );
            };

        peer.onconnectionstatechange =
            function () {

                console.log(
                    "[Conference] peer state:",
                    remoteUserId,
                    peer.connectionState
                );

                if (
                    peer.connectionState ===
                    "failed" ||
                    peer.connectionState ===
                    "closed"
                ) {

                    closePeer(
                        remoteUserId
                    );

                }

            };

        return peer;
    }

    async function createOffer(remoteUserId) {

        const peer =
            createPeer(remoteUserId);

        if (!peer) {
            return;
        }

        try {

            const offer =
                await peer.createOffer();

            await peer.setLocalDescription(
                offer
            );

            await sendSignal(
                remoteUserId,
                {
                    type: "offer",
                    description:
                        peer.localDescription
                }
            );

        } catch (error) {

            console.error(
                "[Conference] offer error:",
                error
            );

        }
    }

    async function handleWebRTCMessage(message) {

        if (!message) {
            return;
        }

        const from =
            message.from;

        if (
            !from ||
            !currentUser ||
            from === currentUser.id
        ) {
            return;
        }

        const data =
            message.data;

        if (!data) {
            return;
        }

        /*
         * Чтобы не создавать две параллельные
         * offer-сессии, инициатором становится
         * пользователь с меньшим UUID.
         */

        const peer =
            createPeer(from);

        if (!peer) {
            return;
        }

        try {

            if (
                data.type === "offer"
            ) {

                await peer.setRemoteDescription(
                    new RTCSessionDescription(
                        data.description
                    )
                );

                const answer =
                    await peer.createAnswer();

                await peer.setLocalDescription(
                    answer
                );

                await sendSignal(
                    from,
                    {
                        type: "answer",
                        description:
                            peer.localDescription
                    }
                );

            }

            else if (
                data.type === "answer"
            ) {

                await peer.setRemoteDescription(
                    new RTCSessionDescription(
                        data.description
                    )
                );

            }

            else if (
                data.type === "ice"
            ) {

                if (
                    data.candidate
                ) {

                    try {

                        await peer.addIceCandidate(
                            new RTCIceCandidate(
                                data.candidate
                            )
                        );

                    } catch (iceError) {

                        console.warn(
                            "[Conference] ICE error:",
                            iceError
                        );

                    }

                }

            }

        } catch (error) {

            console.error(
                "[Conference] WebRTC message error:",
                error
            );

        }
    }

    async function sendSignal(
        targetUserId,
        data
    ) {

        if (!roomChannel || !currentUser) {
            return;
        }

        await roomChannel.send({
            type: "broadcast",
            event: "webrtc",
            payload: {
                from:
                    currentUser.id,

                target:
                    targetUserId,

                data:
                    data
            }
        });
    }

    async function createConnectionsForPresentUsers() {

        if (
            !roomChannel ||
            !currentUser
        ) {
            return;
        }

        const presence =
            roomChannel.presenceState();

        const users =
            Object.keys(presence);

        for (
            const userId of users
        ) {

            if (
                userId ===
                currentUser.id
            ) {
                continue;
            }

            /*
             * Только один из двух участников
             * создаёт offer.
             */

            if (
                currentUser.id <
                userId
            ) {

                if (!peers[userId]) {

                    await createOffer(
                        userId
                    );

                }

            }

        }
    }

    function createRemoteVideo(
        userId,
        stream
    ) {

        const container =
            document.getElementById(
                "conference-v2-videos"
            );

        if (!container) {
            return;
        }

        let card =
            document.getElementById(
                "conference-remote-" +
                userId
            );

        if (!card) {

            card =
                document.createElement("div");

            card.id =
                "conference-remote-" +
                userId;

            card.className =
                "conference-v2-video-card";

            card.innerHTML = `
                <video
                    autoplay
                    playsinline
                ></video>

                <div class="conference-v2-video-name">
                    Игрок
                </div>
            `;

            container.appendChild(card);
        }

        const video =
            card.querySelector("video");

        if (video) {
            video.srcObject = stream;
        }

        /*
         * Попробуем получить имя пользователя.
         */

        loadRemoteUserName(
            userId,
            card
        );
    }

    async function loadRemoteUserName(
        userId,
        card
    ) {

        const result =
            await db
                .from("profiles")
                .select(
                    "nickname"
                )
                .eq("id", userId)
                .maybeSingle();

        const nameElement =
            card.querySelector(
                ".conference-v2-video-name"
            );

        if (!nameElement) {
            return;
        }

        if (
            !result.error &&
            result.data
        ) {

            nameElement.textContent =
                result.data.nickname ||
                "Игрок";

        }
    }

    function closePeer(userId) {

        const peer =
            peers[userId];

        if (peer) {

            try {
                peer.close();
            } catch (e) {
                console.warn(e);
            }

            delete peers[userId];
        }

        delete remoteStreams[userId];

        const card =
            document.getElementById(
                "conference-remote-" +
                userId
            );

        if (card) {
            card.remove();
        }
    }

    /* =========================================================
       LEAVE
       ========================================================= */

    async function leaveRoom() {

        const room =
            currentRoom;

        currentRoom = null;

        /*
         * Закрываем WebRTC.
         */

        Object.keys(peers)
            .forEach(function (userId) {
                closePeer(userId);
            });

        /*
         * Останавливаем камеру/микрофон.
         */

        stopMedia();

        /*
         * Останавливаем Realtime.
         */

        if (roomChannel) {

            try {
                await db.removeChannel(
                    roomChannel
                );
            } catch (e) {
                console.warn(e);
            }

            roomChannel = null;
        }

        /*
         * Удаляем пользователя из комнаты.
         */

        if (
            room &&
            currentUser
        ) {

            const result =
                await db
                    .from(
                        "conference_room_members"
                    )
                    .delete()
                    .eq(
                        "room_id",
                        room.id
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            if (result.error) {

                console.warn(
                    "[Conference] member delete:",
                    result.error
                );

            }
        }

        const videos =
            document.getElementById(
                "conference-v2-videos"
            );

        if (videos) {
            videos.innerHTML = "";
        }

        const roomView =
            document.getElementById(
                "conference-v2-room-view"
            );

        if (roomView) {
            roomView.style.display = "none";
        }

        const lobby =
            document.getElementById(
                "conference-v2-lobby"
            );

        if (lobby) {
            lobby.style.display = "block";
        }

        await loadRooms();
    }

    async function cleanupRoomConnection() {

        Object.keys(peers)
            .forEach(function (userId) {
                closePeer(userId);
            });

        stopMedia();

        if (roomChannel) {

            try {
                await db.removeChannel(
                    roomChannel
                );
            } catch (e) {
                console.warn(e);
            }

            roomChannel = null;
        }

        if (
            currentRoom &&
            currentUser
        ) {

            try {

                await db
                    .from(
                        "conference_room_members"
                    )
                    .delete()
                    .eq(
                        "room_id",
                        currentRoom.id
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            } catch (e) {

                console.warn(e);

            }

        }

        currentRoom = null;
    }

    /* =========================================================
       BUTTONS
       ========================================================= */

    function bindConferenceButtons() {

        const selectors = [
            "#header-conference-button",
            "#sidebar-conference-button",
            "#conference-button",
            "[data-open-conference]"
        ];

        selectors.forEach(function (selector) {

            document
                .querySelectorAll(selector)
                .forEach(function (button) {

                    if (
                        button.dataset
                            .conferenceBound ===
                        "true"
                    ) {
                        return;
                    }

                    button.dataset
                        .conferenceBound =
                        "true";

                    button.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();
                            event.stopPropagation();

                            openConference();

                        }
                    );

                });

        });
    }

    /* =========================================================
       PAGE START
       ========================================================= */

    function init() {

        if (conferenceInitialized) {
            return;
        }

        conferenceInitialized = true;

        injectStyles();

        createModal();

        bindConferenceButtons();

        /*
         * Если app.js создаёт кнопки позже,
         * проверяем DOM ещё несколько раз.
         */

        let attempts = 0;

        const timer =
            setInterval(function () {

                bindConferenceButtons();

                attempts++;

                if (attempts >= 20) {
                    clearInterval(timer);
                }

            }, 500);

        /*
         * Авторизация может измениться.
         */

        db.auth.onAuthStateChange(
            function (_event, session) {

                currentUser =
                    session?.user || null;

            }
        );

        /*
         * Если вкладку закрыли —
         * пытаемся удалить membership.
         */

        window.addEventListener(
            "beforeunload",
            function () {

                if (
                    currentRoom &&
                    currentUser
                ) {

                    /*
                     * Здесь нельзя гарантировать
                     * выполнение async-запроса.
                     * Realtime Presence всё равно
                     * автоматически исчезнет.
                     */

                    try {

                        roomChannel?.untrack();

                    } catch (e) {
                        console.warn(e);
                    }

                }

            }
        );

        console.log(
            "[Conference] GAME PLATFORM conference initialized."
        );
    }

    /* =========================================================
       HELPERS
       ========================================================= */

    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

    /*
     * Делаем функцию доступной глобально.
     * Это позволяет открыть конференцию
     * из существующего интерфейса.
     */

    window.GamePlatformConference = {
        open: openConference,
        close: closeConference,
        leave: leaveRoom
    };

})();
