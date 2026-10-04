/* ============================================================
   GAME PLATFORM
   CONFERENCE ROOMS
   Version 3.0

   Supabase Realtime + WebRTC
   - комнаты
   - список участников
   - микрофон
   - камера
   - удалённый звук
   - удалённое видео
   - демонстрация экрана
   - автоматическое соединение участников

   Файл подключается ОБЫЧНЫМ script:
   <script src="conference-rooms.js"></script>

   НЕ type="module"
   ============================================================ */

(function () {
    "use strict";

    /* ============================================================
       SUPABASE
       ============================================================ */

    const SUPABASE_URL =
        "https://tpdpciooxfulythevhgw.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";

    if (!window.supabase) {
        console.error(
            "[Conference] Supabase CDN не загружен."
        );

        return;
    }

    const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    /* ============================================================
       GLOBAL STATE
       ============================================================ */

    let currentUser = null;
    let currentRoom = null;

    let roomChannel = null;

    let localStream = null;
    let screenStream = null;

    let microphoneEnabled = true;
    let cameraEnabled = true;
    let sharingScreen = false;

    let initialized = false;

    /*
     * peers[userId] = {
     *   pc: RTCPeerConnection,
     *   pendingCandidates: [],
     *   makingOffer: false,
     *   ignoreOffer: false
     * }
     */

    const peers = {};

    /* ============================================================
       ICE CONFIGURATION
       ============================================================ */

    const RTC_CONFIG = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            },
            {
                urls: "stun:stun1.l.google.com:19302"
            },
            {
                urls: "stun:stun2.l.google.com:19302"
            }
        ]
    };

    /* ============================================================
       CSS
       ============================================================ */

    function injectStyles() {
        if (
            document.getElementById(
                "game-platform-conference-styles"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id =
            "game-platform-conference-styles";

        style.textContent = `
        #gp-conference-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(9, 15, 25, 0.62);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
        }

        #gp-conference-overlay.open {
            display: flex;
        }

        .gp-conf-window {
            width: min(1320px, 97vw);
            height: min(840px, 94vh);
            min-height: 560px;

            display: flex;
            flex-direction: column;

            overflow: hidden;

            background:
                linear-gradient(
                    145deg,
                    #ffffff,
                    #edf1f6
                );

            border:
                1px solid rgba(0,0,0,.16);

            border-radius: 26px;

            box-shadow:
                0 30px 90px rgba(0,0,0,.32),
                0 0 50px rgba(59,132,246,.10);
        }

        .gp-conf-header {
            flex: 0 0 auto;

            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 16px;

            padding: 16px 20px;

            background: rgba(255,255,255,.95);

            border-bottom:
                1px solid rgba(0,0,0,.08);
        }

        .gp-conf-brand {
            display: flex;
            align-items: center;
            gap: 12px;

            min-width: 0;
        }

        .gp-conf-logo {
            width: 42px;
            height: 42px;

            display: flex;
            align-items: center;
            justify-content: center;

            flex: 0 0 42px;

            border-radius: 14px;

            background:
                linear-gradient(
                    145deg,
                    #fff,
                    #dde4ec
                );

            border:
                1px solid rgba(0,0,0,.14);

            box-shadow:
                inset 0 1px 0 #fff,
                0 5px 15px rgba(0,0,0,.09);

            color: #111827;

            font-size: 14px;
            font-weight: 900;
        }

        .gp-conf-brand-text {
            min-width: 0;
        }

        .gp-conf-brand-text strong {
            display: block;

            font-size: 16px;
            color: #111827;
        }

        .gp-conf-brand-text span {
            display: block;

            margin-top: 2px;

            color: #7b8491;
            font-size: 11px;
        }

        .gp-conf-close {
            width: 40px;
            height: 40px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 13px;

            border:
                1px solid rgba(0,0,0,.13);

            background: #fff;

            color: #20252d;

            font-size: 24px;

            cursor: pointer;
        }

        .gp-conf-close:hover {
            background: #edf1f5;
        }

        .gp-conf-body {
            flex: 1 1 auto;

            min-height: 0;

            display: flex;

            overflow: hidden;
        }

        /* =======================
           LOBBY
           ======================= */

        .gp-conf-lobby {
            width: 100%;
            height: 100%;

            padding: 24px;

            overflow-y: auto;
        }

        .gp-conf-lobby h2 {
            margin: 0;

            color: #111827;
            font-size: 26px;
        }

        .gp-conf-lobby-description {
            margin-top: 6px;
            margin-bottom: 22px;

            color: #757e8b;

            font-size: 13px;
        }

        .gp-conf-room-list {
            display: grid;

            grid-template-columns:
                repeat(
                    auto-fill,
                    minmax(270px, 1fr)
                );

            gap: 16px;
        }

        .gp-conf-room-card {
            padding: 18px;

            border-radius: 20px;

            background: #fff;

            border:
                1px solid rgba(0,0,0,.11);

            box-shadow:
                0 8px 20px rgba(0,0,0,.05);
        }

        .gp-conf-room-card h3 {
            margin: 0;

            color: #111827;

            font-size: 18px;
        }

        .gp-conf-room-card p {
            min-height: 40px;

            margin: 8px 0 14px;

            color: #747d89;

            font-size: 13px;

            line-height: 1.45;
        }

        .gp-conf-room-status {
            display: flex;
            align-items: center;
            gap: 7px;

            margin-bottom: 14px;

            color: #65707e;

            font-size: 11px;
        }

        .gp-conf-online-dot {
            width: 8px;
            height: 8px;

            border-radius: 50%;

            background: #25b86d;

            box-shadow:
                0 0 8px rgba(37,184,109,.5);
        }

        /* =======================
           BUTTONS
           ======================= */

        .gp-conf-button {
            min-height: 40px;

            padding: 0 14px;

            border-radius: 13px;

            border:
                1px solid rgba(0,0,0,.16);

            background:
                linear-gradient(
                    145deg,
                    #fff,
                    #e3e8ee
                );

            box-shadow:
                inset 0 1px 0 #fff,
                0 4px 10px rgba(0,0,0,.06);

            color: #111827;

            font-size: 12px;
            font-weight: 750;

            cursor: pointer;
        }

        .gp-conf-button:hover {
            transform: translateY(-1px);
        }

        .gp-conf-button.active {
            background:
                linear-gradient(
                    145deg,
                    #e3f0ff,
                    #c6dcfb
                );

            border-color:
                rgba(59,130,246,.44);
        }

        .gp-conf-button.disabled {
            opacity: .55;
        }

        .gp-conf-button.danger {
            background:
                linear-gradient(
                    145deg,
                    #fff,
                    #eedede
                );
        }

        .gp-conf-button.join {
            width: 100%;

            background:
                linear-gradient(
                    145deg,
                    #eff7ff,
                    #cfE4ff
                );

            border-color:
                rgba(59,130,246,.35);
        }

        /* =======================
           ROOM
           ======================= */

        .gp-conf-room-view {
            width: 100%;
            height: 100%;

            min-height: 0;

            display: none;
            flex-direction: column;
        }

        .gp-conf-toolbar {
            flex: 0 0 auto;

            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 14px;

            padding: 13px 16px;

            background: #fff;

            border-bottom:
                1px solid rgba(0,0,0,.08);
        }

        .gp-conf-room-title {
            min-width: 0;
        }

        .gp-conf-room-title strong {
            display: block;

            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            color: #111827;

            font-size: 16px;
        }

        .gp-conf-room-title span {
            display: block;

            margin-top: 3px;

            color: #737c88;

            font-size: 11px;
        }

        .gp-conf-toolbar-buttons {
            display: flex;
            align-items: center;
            justify-content: flex-end;

            flex-wrap: wrap;

            gap: 8px;
        }

        .gp-conf-room-main {
            flex: 1 1 auto;

            min-height: 0;

            display: flex;

            overflow: hidden;
        }

        /* =======================
           VIDEO GRID
           ======================= */

        .gp-conf-video-grid {
            flex: 1 1 auto;

            min-width: 0;
            min-height: 0;

            padding: 12px;

            display: grid;

            grid-template-columns:
                repeat(
                    auto-fit,
                    minmax(280px, 1fr)
                );

            grid-auto-rows:
                minmax(210px, 1fr);

            gap: 12px;

            overflow: auto;

            background:
                radial-gradient(
                    circle at 50% 0%,
                    rgba(64,143,239,.13),
                    transparent 45%
                ),
                #e5eaf0;
        }

        .gp-conf-video-card {
            position: relative;

            min-height: 210px;

            overflow: hidden;

            border-radius: 20px;

            background: #101318;

            border:
                1px solid rgba(0,0,0,.18);

            box-shadow:
                0 10px 26px rgba(0,0,0,.18);
        }

        .gp-conf-video-card video {
            width: 100%;
            height: 100%;

            display: block;

            object-fit: cover;

            background: #0c0e11;
        }

        .gp-conf-video-card.screen video {
            object-fit: contain;
        }

        .gp-conf-video-placeholder {
            position: absolute;

            inset: 0;

            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            gap: 10px;

            color: #e5e7eb;
        }

        .gp-conf-video-placeholder-avatar {
            width: 70px;
            height: 70px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 50%;

            background:
                linear-gradient(
                    145deg,
                    #2f3742,
                    #1a1f26
                );

            font-size: 32px;
        }

        .gp-conf-video-label {
            position: absolute;

            left: 10px;
            bottom: 10px;

            z-index: 4;

            max-width:
                calc(100% - 20px);

            padding: 7px 10px;

            border-radius: 10px;

            background:
                rgba(0,0,0,.66);

            color: #fff;

            font-size: 11px;

            backdrop-filter: blur(6px);
        }

        .gp-conf-video-state {
            position: absolute;

            right: 10px;
            top: 10px;

            z-index: 4;

            padding: 6px 8px;

            border-radius: 9px;

            background:
                rgba(0,0,0,.60);

            color: #fff;

            font-size: 10px;
        }

        /* =======================
           PARTICIPANTS
           ======================= */

        .gp-conf-participants {
            flex: 0 0 250px;

            width: 250px;

            padding: 14px;

            overflow-y: auto;

            background: #fff;

            border-left:
                1px solid rgba(0,0,0,.08);
        }

        .gp-conf-side-title {
            margin-bottom: 12px;

            color: #737c88;

            font-size: 11px;
            font-weight: 900;

            letter-spacing: .08em;
        }

        .gp-conf-member {
            display: flex;
            align-items: center;

            gap: 9px;

            padding: 8px;

            border-radius: 12px;
        }

        .gp-conf-member:hover {
            background: #f0f3f7;
        }

        .gp-conf-member-avatar {
            width: 34px;
            height: 34px;

            flex: 0 0 34px;

            display: flex;
            align-items: center;
            justify-content: center;

            overflow: hidden;

            border-radius: 50%;

            background: #e5e9ef;

            border:
                1px solid rgba(0,0,0,.08);
        }

        .gp-conf-member-avatar img {
            width: 100%;
            height: 100%;

            object-fit: cover;
        }

        .gp-conf-member-name {
            min-width: 0;

            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            color: #202733;

            font-size: 12px;
        }

        .gp-conf-member-name small {
            display: block;

            margin-top: 2px;

            color: #9198a2;

            font-size: 9px;
        }

        /* =======================
           BOTTOM STATUS
           ======================= */

        .gp-conf-bottom {
            flex: 0 0 auto;

            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 12px;

            padding: 10px 16px;

            background: #fff;

            border-top:
                1px solid rgba(0,0,0,.08);

            color: #697381;

            font-size: 11px;
        }

        .gp-conf-connection {
            display: flex;
            align-items: center;

            gap: 7px;
        }

        .gp-conf-message {
            margin-bottom: 14px;

            padding: 12px 14px;

            border-radius: 12px;

            background: #fff0f0;

            border:
                1px solid #edb8b8;

            color: #a23131;

            font-size: 12px;
        }

        .gp-conf-empty {
            padding: 35px;

            text-align: center;

            color: #7b8491;
        }

        @media (max-width: 850px) {
            #gp-conference-overlay {
                padding: 0;
            }

            .gp-conf-window {
                width: 100vw;
                height: 100vh;

                border-radius: 0;
            }

            .gp-conf-room-main {
                flex-direction: column;
            }

            .gp-conf-participants {
                width: auto;

                flex: 0 0 160px;

                border-left: 0;

                border-top:
                    1px solid rgba(0,0,0,.08);
            }

            .gp-conf-toolbar {
                align-items: flex-start;
                flex-direction: column;
            }

            .gp-conf-toolbar-buttons {
                width: 100%;

                justify-content: flex-start;
            }

            .gp-conf-video-grid {
                grid-template-columns:
                    repeat(
                        auto-fit,
                        minmax(220px, 1fr)
                    );
            }
        }
        `;

        document.head.appendChild(style);
    }

    /* ============================================================
       CREATE UI
       ============================================================ */

    function createConferenceUI() {
        if (
            document.getElementById(
                "gp-conference-overlay"
            )
        ) {
            return;
        }

        const overlay =
            document.createElement("div");

        overlay.id =
            "gp-conference-overlay";

        overlay.innerHTML = `
            <div class="gp-conf-window">

                <header class="gp-conf-header">

                    <div class="gp-conf-brand">

                        <div class="gp-conf-logo">
                            GP
                        </div>

                        <div class="gp-conf-brand-text">
                            <strong>GAME PLATFORM</strong>
                            <span>VOICE & VIDEO CONFERENCE</span>
                        </div>

                    </div>

                    <button
                        type="button"
                        id="gp-conf-close"
                        class="gp-conf-close"
                    >
                        ×
                    </button>

                </header>

                <div class="gp-conf-body">

                    <section
                        id="gp-conf-lobby"
                        class="gp-conf-lobby"
                    >

                        <h2>
                            Конференции
                        </h2>

                        <div class="gp-conf-lobby-description">
                            Выберите общую комнату.
                        </div>

                        <div
                            id="gp-conf-lobby-message"
                        ></div>

                        <div
                            id="gp-conf-room-list"
                            class="gp-conf-room-list"
                        ></div>

                    </section>

                    <section
                        id="gp-conf-room-view"
                        class="gp-conf-room-view"
                    >

                        <div class="gp-conf-toolbar">

                            <div class="gp-conf-room-title">

                                <strong
                                    id="gp-conf-current-room"
                                >
                                    Конференция
                                </strong>

                                <span
                                    id="gp-conf-room-subtitle"
                                >
                                    Подключение...
                                </span>

                            </div>

                            <div
                                class="gp-conf-toolbar-buttons"
                            >

                                <button
                                    type="button"
                                    id="gp-conf-mic"
                                    class="gp-conf-button active"
                                >
                                    🎤 Микрофон
                                </button>

                                <button
                                    type="button"
                                    id="gp-conf-camera"
                                    class="gp-conf-button active"
                                >
                                    📹 Камера
                                </button>

                                <button
                                    type="button"
                                    id="gp-conf-screen"
                                    class="gp-conf-button"
                                >
                                    🖥 Экран
                                </button>

                                <button
                                    type="button"
                                    id="gp-conf-leave"
                                    class="gp-conf-button danger"
                                >
                                    Выйти
                                </button>

                            </div>

                        </div>

                        <div class="gp-conf-room-main">

                            <div
                                id="gp-conf-videos"
                                class="gp-conf-video-grid"
                            ></div>

                            <aside
                                class="gp-conf-participants"
                            >

                                <div class="gp-conf-side-title">
                                    УЧАСТНИКИ
                                </div>

                                <div
                                    id="gp-conf-member-list"
                                ></div>

                            </aside>

                        </div>

                        <div class="gp-conf-bottom">

                            <div
                                class="gp-conf-connection"
                            >
                                <span
                                    class="gp-conf-online-dot"
                                ></span>

                                <span
                                    id="gp-conf-connection-text"
                                >
                                    Подключение...
                                </span>
                            </div>

                            <div
                                id="gp-conf-debug-status"
                            >
                                WebRTC
                            </div>

                        </div>

                    </section>

                </div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

        document
            .getElementById(
                "gp-conf-close"
            )
            .addEventListener(
                "click",
                closeConference
            );

        document
            .getElementById(
                "gp-conf-leave"
            )
            .addEventListener(
                "click",
                leaveRoom
            );

        document
            .getElementById(
                "gp-conf-mic"
            )
            .addEventListener(
                "click",
                toggleMicrophone
            );

        document
            .getElementById(
                "gp-conf-camera"
            )
            .addEventListener(
                "click",
                toggleCamera
            );

        document
            .getElementById(
                "gp-conf-screen"
            )
            .addEventListener(
                "click",
                toggleScreenShare
            );
    }

    /* ============================================================
       OPEN CONFERENCE
       ============================================================ */

    async function openConference() {
        createConferenceUI();

        const overlay =
            document.getElementById(
                "gp-conference-overlay"
            );

        overlay.classList.add("open");

        currentUser =
            await getCurrentUser();

        if (!currentUser) {
            showLobbyError(
                "Не удалось определить пользователя. Сначала войдите в аккаунт."
            );

            return;
        }

        await loadRooms();
    }

    async function closeConference() {
        if (currentRoom) {
            await leaveRoom();
        }

        const overlay =
            document.getElementById(
                "gp-conference-overlay"
            );

        if (overlay) {
            overlay.classList.remove(
                "open"
            );
        }
    }

    /* ============================================================
       AUTH
       ============================================================ */

    async function getCurrentUser() {
        const {
            data,
            error
        } =
            await db.auth.getUser();

        if (error) {
            console.error(
                "[Conference Auth]",
                error
            );

            return null;
        }

        return data.user || null;
    }

    /* ============================================================
       LOBBY
       ============================================================ */

    async function loadRooms() {
        const container =
            document.getElementById(
                "gp-conf-room-list"
            );

        const message =
            document.getElementById(
                "gp-conf-lobby-message"
            );

        if (message) {
            message.innerHTML = "";
        }

        container.innerHTML = `
            <div class="gp-conf-empty">
                Загрузка комнат...
            </div>
        `;

        const {
            data,
            error
        } =
            await db
                .from("conference_rooms")
                .select(
                    "id,name,description,is_active,created_at"
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (error) {
            console.error(
                "[Conference Rooms]",
                error
            );

            container.innerHTML = `
                <div class="gp-conf-message">
                    ${escapeHtml(
                        error.message
                    )}
                </div>
            `;

            return;
        }

        const rooms = data || [];

        if (!rooms.length) {
            container.innerHTML = `
                <div class="gp-conf-empty">
                    Нет доступных комнат.
                </div>
            `;

            return;
        }

        container.innerHTML = "";

        for (
            const room of rooms
        ) {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "gp-conf-room-card";

            card.innerHTML = `
                <h3>
                    ${escapeHtml(
                        room.name
                    )}
                </h3>

                <p>
                    ${escapeHtml(
                        room.description ||
                        "Игровая конференция"
                    )}
                </p>

                <div
                    class="gp-conf-room-status"
                >
                    <span
                        class="gp-conf-online-dot"
                    ></span>

                    Доступна
                </div>

                <button
                    type="button"
                    class="gp-conf-button join"
                >
                    Войти в комнату
                </button>
            `;

            card
                .querySelector("button")
                .addEventListener(
                    "click",
                    function () {
                        joinRoom(room);
                    }
                );

            container.appendChild(
                card
            );
        }
    }

    function showLobbyError(text) {
        const message =
            document.getElementById(
                "gp-conf-lobby-message"
            );

        if (!message) {
            return;
        }

        message.innerHTML = `
            <div class="gp-conf-message">
                ${escapeHtml(text)}
            </div>
        `;
    }

    /* ============================================================
       JOIN ROOM
       ============================================================ */

    async function joinRoom(room) {
        try {
            if (!currentUser) {
                currentUser =
                    await getCurrentUser();
            }

            if (!currentUser) {
                throw new Error(
                    "Пользователь не авторизован."
                );
            }

            setConnectionText(
                "Подготовка камеры и микрофона..."
            );

            /*
             * Удаляем старое членство пользователя
             * во всех конференциях.
             */

            await db
                .from(
                    "conference_room_members"
                )
                .delete()
                .eq(
                    "user_id",
                    currentUser.id
                );

            /*
             * Добавляем пользователя
             * в конкретную комнату.
             */

            const {
                error: memberError
            } =
                await db
                    .from(
                        "conference_room_members"
                    )
                    .insert({
                        room_id: room.id,
                        user_id:
                            currentUser.id
                    });

            if (memberError) {
                throw memberError;
            }

            currentRoom = room;

            /*
             * UI
             */

            document.getElementById(
                "gp-conf-lobby"
            ).style.display =
                "none";

            document.getElementById(
                "gp-conf-room-view"
            ).style.display =
                "flex";

            document.getElementById(
                "gp-conf-current-room"
            ).textContent =
                room.name;

            document.getElementById(
                "gp-conf-room-subtitle"
            ).textContent =
                "Подключение устройств...";

            /*
             * Сначала media.
             */

            await acquireLocalMedia();

            /*
             * Потом Realtime.
             */

            await connectRealtimeRoom();

            /*
             * Участники.
             */

            await refreshMemberList();

            setConnectionText(
                "Комната подключена"
            );

            document.getElementById(
                "gp-conf-room-subtitle"
            ).textContent =
                "Голосовая и видеосвязь активна";

        } catch (error) {
            console.error(
                "[Conference Join]",
                error
            );

            await cleanupConference();

            alert(
                "Ошибка подключения к конференции:\n\n" +
                (
                    error.message ||
                    String(error)
                )
            );

            document.getElementById(
                "gp-conf-lobby"
            ).style.display =
                "block";

            document.getElementById(
                "gp-conf-room-view"
            ).style.display =
                "none";

            await loadRooms();
        }
    }

    /* ============================================================
       LOCAL MEDIA
       ============================================================ */

    async function acquireLocalMedia() {
        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices
                .getUserMedia
        ) {
            throw new Error(
                "Браузер не поддерживает камеру и микрофон."
            );
        }

        stopLocalMedia();

        try {
            localStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: {
                            echoCancellation:
                                true,
                            noiseSuppression:
                                true,
                            autoGainControl:
                                true
                        },

                        video: {
                            width: {
                                ideal: 1280
                            },

                            height: {
                                ideal: 720
                            },

                            frameRate: {
                                ideal: 30
                            }
                        }
                    });

            microphoneEnabled = true;
            cameraEnabled = true;

        } catch (
            cameraAndMicError
        ) {
            console.warn(
                "[Conference Media] camera + mic error",
                cameraAndMicError
            );

            /*
             * Если камера запрещена,
             * пробуем только микрофон.
             */

            try {
                localStream =
                    await navigator
                        .mediaDevices
                        .getUserMedia({
                            audio: {
                                echoCancellation:
                                    true,
                                noiseSuppression:
                                    true,
                                autoGainControl:
                                    true
                            },

                            video: false
                        });

                microphoneEnabled = true;
                cameraEnabled = false;

            } catch (
                microphoneError
            ) {
                console.warn(
                    "[Conference Media] mic error",
                    microphoneError
                );

                /*
                 * Если пользователь запретил всё,
                 * всё равно заходим в комнату,
                 * чтобы он мог хотя бы видеть других.
                 */

                localStream =
                    new MediaStream();

                microphoneEnabled =
                    false;

                cameraEnabled =
                    false;

                alert(
                    "Камера и микрофон не были разрешены.\n\n" +
                    "Конференция откроется, но ваши звук и видео передаваться не будут.\n\n" +
                    "Разрешите камеру и микрофон в настройках браузера."
                );
            }
        }

        createLocalVideoCard();

        updateMediaButtons();
    }

    function createLocalVideoCard() {
        const grid =
            document.getElementById(
                "gp-conf-videos"
            );

        if (!grid) {
            return;
        }

        let card =
            document.getElementById(
                "gp-conf-local-card"
            );

        if (!card) {
            card =
                document.createElement(
                    "div"
                );

            card.id =
                "gp-conf-local-card";

            card.className =
                "gp-conf-video-card";

            card.innerHTML = `
                <video
                    id="gp-conf-local-video"
                    autoplay
                    muted
                    playsinline
                ></video>

                <div
                    id="gp-conf-local-placeholder"
                    class="gp-conf-video-placeholder"
                    style="display:none"
                >
                    <div
                        class="gp-conf-video-placeholder-avatar"
                    >
                        🤖
                    </div>

                    <span>
                        Камера выключена
                    </span>
                </div>

                <div
                    class="gp-conf-video-label"
                >
                    Вы
                </div>

                <div
                    id="gp-conf-local-state"
                    class="gp-conf-video-state"
                >
                    Локально
                </div>
            `;

            grid.appendChild(card);
        }

        const video =
            document.getElementById(
                "gp-conf-local-video"
            );

        video.srcObject =
            localStream;

        video.play().catch(
            function (error) {
                console.warn(
                    "[Conference Local Play]",
                    error
                );
            }
        );

        updateLocalVideoVisibility();
    }

    function updateLocalVideoVisibility() {
        const video =
            document.getElementById(
                "gp-conf-local-video"
            );

        const placeholder =
            document.getElementById(
                "gp-conf-local-placeholder"
            );

        if (
            !video ||
            !placeholder
        ) {
            return;
        }

        const hasVideo =
            localStream &&
            localStream
                .getVideoTracks()
                .some(
                    function (track) {
                        return (
                            track.enabled &&
                            track.readyState ===
                                "live"
                        );
                    }
                );

        if (
            hasVideo ||
            sharingScreen
        ) {
            video.style.display =
                "block";

            placeholder.style.display =
                "none";
        } else {
            video.style.display =
                "none";

            placeholder.style.display =
                "flex";
        }
    }

    /* ============================================================
       REALTIME
       ============================================================ */

    async function connectRealtimeRoom() {
        if (
            !currentRoom ||
            !currentUser
        ) {
            throw new Error(
                "Нет комнаты или пользователя."
            );
        }

        if (roomChannel) {
            try {
                await db.removeChannel(
                    roomChannel
                );
            } catch (
                removeError
            ) {
                console.warn(
                    removeError
                );
            }

            roomChannel = null;
        }

        const channelName =
            "gp-conference-" +
            currentRoom.id;

        console.log(
            "[Conference] Channel:",
            channelName
        );

        roomChannel =
            db.channel(
                channelName,
                {
                    config: {
                        presence: {
                            key:
                                currentUser.id
                        },

                        broadcast: {
                            self: false
                        }
                    }
                }
            );

        roomChannel.on(
            "broadcast",
            {
                event:
                    "conference-signal"
            },
            async function (
                message
            ) {
                await handleSignal(
                    message.payload
                );
            }
        );

        roomChannel.on(
            "broadcast",
            {
                event:
                    "conference-hello"
            },
            async function (
                message
            ) {
                await handleHello(
                    message.payload
                );
            }
        );

        roomChannel.on(
            "presence",
            {
                event: "sync"
            },
            async function () {
                await refreshMemberList();

                await connectToPresenceUsers();
            }
        );

        roomChannel.on(
            "presence",
            {
                event: "join"
            },
            async function (
                payload
            ) {
                console.log(
                    "[Conference Presence Join]",
                    payload
                );

                await refreshMemberList();

                await connectToPresenceUsers();
            }
        );

        roomChannel.on(
            "presence",
            {
                event: "leave"
            },
            async function (
                payload
            ) {
                console.log(
                    "[Conference Presence Leave]",
                    payload
                );

                if (
                    payload &&
                    payload.key
                ) {
                    removePeer(
                        payload.key
                    );
                }

                await refreshMemberList();
            }
        );

        await new Promise(
            function (
                resolve,
                reject
            ) {
                let resolved = false;

                roomChannel.subscribe(
                    async function (
                        status
                    ) {
                        console.log(
                            "[Conference Subscribe]",
                            status
                        );

                        if (
                            status ===
                            "SUBSCRIBED" &&
                            !resolved
                        ) {
                            resolved =
                                true;

                            try {
                                await roomChannel
                                    .track({
                                        user_id:
                                            currentUser.id,

                                        room_id:
                                            currentRoom.id,

                                        joined_at:
                                            new Date()
                                                .toISOString()
                                    });

                                /*
                                 * Сообщаем другим,
                                 * что мы появились.
                                 */

                                await roomChannel
                                    .send({
                                        type:
                                            "broadcast",

                                        event:
                                            "conference-hello",

                                        payload: {
                                            userId:
                                                currentUser.id
                                        }
                                    });

                                resolve();

                            } catch (
                                trackError
                            ) {
                                reject(
                                    trackError
                                );
                            }
                        }

                        if (
                            (
                                status ===
                                    "CHANNEL_ERROR" ||
                                status ===
                                    "TIMED_OUT"
                            ) &&
                            !resolved
                        ) {
                            reject(
                                new Error(
                                    "Realtime: " +
                                    status
                                )
                            );
                        }
                    }
                );
            }
        );
    }

    /* ============================================================
       HELLO HANDSHAKE
       ============================================================ */

    async function handleHello(
        payload
    ) {
        if (
            !payload ||
            !payload.userId ||
            !currentUser
        ) {
            return;
        }

        const remoteUserId =
            payload.userId;

        if (
            remoteUserId ===
            currentUser.id
        ) {
            return;
        }

        /*
         * Создаём peer.
         */

        getOrCreatePeer(
            remoteUserId
        );

        /*
         * Только один из пользователей
         * создаёт offer.
         *
         * UUID сравниваем строкой.
         */

        if (
            currentUser.id <
            remoteUserId
        ) {
            await createOffer(
                remoteUserId
            );
        }
    }

    async function connectToPresenceUsers() {
        if (
            !roomChannel ||
            !currentUser
        ) {
            return;
        }

        const state =
            roomChannel
                .presenceState();

        const userIds =
            Object.keys(state);

        for (
            const remoteUserId
            of userIds
        ) {
            if (
                remoteUserId ===
                currentUser.id
            ) {
                continue;
            }

            getOrCreatePeer(
                remoteUserId
            );

            if (
                currentUser.id <
                    remoteUserId
            ) {
                const peerInfo =
                    peers[
                        remoteUserId
                    ];

                if (
                    peerInfo &&
                    peerInfo.pc &&
                    peerInfo.pc
                        .signalingState ===
                        "stable" &&
                    !peerInfo
                        .makingOffer
                ) {
                    await createOffer(
                        remoteUserId
                    );
                }
            }
        }
    }

    /* ============================================================
       CREATE PEER
       ============================================================ */

    function getOrCreatePeer(
        remoteUserId
    ) {
        if (
            !remoteUserId ||
            !currentUser ||
            remoteUserId ===
                currentUser.id
        ) {
            return null;
        }

        if (
            peers[
                remoteUserId
            ]
        ) {
            return peers[
                remoteUserId
            ];
        }

        console.log(
            "[Conference Peer Create]",
            remoteUserId
        );

        const pc =
            new RTCPeerConnection(
                RTC_CONFIG
            );

        const peerInfo = {
            pc:
                pc,

            makingOffer:
                false,

            ignoreOffer:
                false,

            pendingCandidates:
                []
        };

        peers[
            remoteUserId
        ] =
            peerInfo;

        /* ========================================================
           SEND LOCAL TRACKS
           ======================================================== */

        if (
            localStream
        ) {
            const tracks =
                localStream
                    .getTracks();

            for (
                const track
                of tracks
            ) {
                try {
                    pc.addTrack(
                        track,
                        localStream
                    );
                } catch (
                    error
                ) {
                    console.warn(
                        "[Conference addTrack]",
                        error
                    );
                }
            }
        }

        /*
         * Если камеры нет —
         * всё равно хотим получать video.
         */

        if (
            !localStream ||
            localStream
                .getVideoTracks()
                .length === 0
        ) {
            pc.addTransceiver(
                "video",
                {
                    direction:
                        "recvonly"
                }
            );
        }

        /*
         * Если микрофона нет —
         * всё равно хотим получать audio.
         */

        if (
            !localStream ||
            localStream
                .getAudioTracks()
                .length === 0
        ) {
            pc.addTransceiver(
                "audio",
                {
                    direction:
                        "recvonly"
                }
            );
        }

        /* ========================================================
           REMOTE TRACKS
           ======================================================== */

        pc.ontrack =
            function (event) {
                console.log(
                    "[Conference Remote Track]",
                    remoteUserId,
                    event.track.kind
                );

                let stream = null;

                if (
                    event.streams &&
                    event.streams.length
                ) {
                    stream =
                        event.streams[0];
                } else {
                    stream =
                        new MediaStream([
                            event.track
                        ]);
                }

                attachRemoteStream(
                    remoteUserId,
                    stream
                );
            };

        /* ========================================================
           ICE
           ======================================================== */

        pc.onicecandidate =
            async function (
                event
            ) {
                if (
                    !event.candidate
                ) {
                    return;
                }

                await sendSignal(
                    remoteUserId,
                    {
                        type:
                            "candidate",

                        candidate:
                            event.candidate
                                .toJSON
                                ? event.candidate
                                    .toJSON()
                                : event.candidate
                    }
                );
            };

        pc.oniceconnectionstatechange =
            function () {
                console.log(
                    "[Conference ICE]",
                    remoteUserId,
                    pc.iceConnectionState
                );

                updateDebugStatus();
            };

        pc.onconnectionstatechange =
            function () {
                console.log(
                    "[Conference Connection]",
                    remoteUserId,
                    pc.connectionState
                );

                updateDebugStatus();

                if (
                    pc.connectionState ===
                        "failed"
                ) {
                    /*
                     * Пытаемся ICE restart.
                     */

                    if (
                        currentUser.id <
                        remoteUserId
                    ) {
                        createOffer(
                            remoteUserId,
                            true
                        );
                    }
                }

                if (
                    pc.connectionState ===
                        "closed"
                ) {
                    removePeer(
                        remoteUserId
                    );
                }
            };

        return peerInfo;
    }

    /* ============================================================
       CREATE OFFER
       ============================================================ */

    async function createOffer(
        remoteUserId,
        iceRestart
    ) {
        const peerInfo =
            getOrCreatePeer(
                remoteUserId
            );

        if (
            !peerInfo ||
            peerInfo.makingOffer
        ) {
            return;
        }

        const pc =
            peerInfo.pc;

        try {
            peerInfo.makingOffer =
                true;

            const offer =
                await pc.createOffer({
                    iceRestart:
                        Boolean(
                            iceRestart
                        )
                });

            if (
                pc.signalingState !==
                "stable"
            ) {
                return;
            }

            await pc
                .setLocalDescription(
                    offer
                );

            await sendSignal(
                remoteUserId,
                {
                    type:
                        "description",

                    description:
                        pc.localDescription
                }
            );

        } catch (
            error
        ) {
            console.error(
                "[Conference Offer]",
                error
            );

        } finally {
            peerInfo.makingOffer =
                false;
        }
    }

    /* ============================================================
       SEND SIGNAL
       ============================================================ */

    async function sendSignal(
        targetUserId,
        data
    ) {
        if (
            !roomChannel ||
            !currentUser ||
            !currentRoom
        ) {
            return;
        }

        await roomChannel.send({
            type:
                "broadcast",

            event:
                "conference-signal",

            payload: {
                roomId:
                    currentRoom.id,

                from:
                    currentUser.id,

                target:
                    targetUserId,

                data:
                    data
            }
        });
    }

    /* ============================================================
       HANDLE SIGNAL
       ============================================================ */

    async function handleSignal(
        payload
    ) {
        if (
            !payload ||
            !currentUser ||
            !currentRoom
        ) {
            return;
        }

        /*
         * КРИТИЧНО:
         * Игнорируем сообщения,
         * предназначенные другому участнику.
         */

        if (
            payload.target !==
            currentUser.id
        ) {
            return;
        }

        /*
         * Игнорируем сообщения
         * другой комнаты.
         */

        if (
            payload.roomId !==
            currentRoom.id
        ) {
            return;
        }

        const remoteUserId =
            payload.from;

        if (
            !remoteUserId ||
            remoteUserId ===
            currentUser.id
        ) {
            return;
        }

        const data =
            payload.data;

        if (!data) {
            return;
        }

        const peerInfo =
            getOrCreatePeer(
                remoteUserId
            );

        if (!peerInfo) {
            return;
        }

        const pc =
            peerInfo.pc;

        try {
            /* ====================================================
               DESCRIPTION
               ==================================================== */

            if (
                data.type ===
                "description"
            ) {
                const description =
                    data.description;

                if (!description) {
                    return;
                }

                const isOffer =
                    description.type ===
                    "offer";

                const offerCollision =
                    isOffer &&
                    (
                        peerInfo.makingOffer ||
                        pc.signalingState !==
                            "stable"
                    );

                /*
                 * Пользователь с большим UUID
                 * является "polite peer".
                 */

                const polite =
                    currentUser.id >
                    remoteUserId;

                peerInfo.ignoreOffer =
                    !polite &&
                    offerCollision;

                if (
                    peerInfo.ignoreOffer
                ) {
                    console.log(
                        "[Conference] Ignore offer collision"
                    );

                    return;
                }

                if (
                    offerCollision &&
                    polite
                ) {
                    try {
                        await pc
                            .setLocalDescription({
                                type:
                                    "rollback"
                            });
                    } catch (
                        rollbackError
                    ) {
                        console.warn(
                            rollbackError
                        );
                    }
                }

                await pc
                    .setRemoteDescription(
                        description
                    );

                /*
                 * ICE-кандидаты могли прийти раньше
                 * remoteDescription.
                 */

                await flushPendingCandidates(
                    peerInfo
                );

                if (isOffer) {
                    const answer =
                        await pc
                            .createAnswer();

                    await pc
                        .setLocalDescription(
                            answer
                        );

                    await sendSignal(
                        remoteUserId,
                        {
                            type:
                                "description",

                            description:
                                pc.localDescription
                        }
                    );
                }
            }

            /* ====================================================
               ICE CANDIDATE
               ==================================================== */

            else if (
                data.type ===
                "candidate"
            ) {
                if (
                    peerInfo.ignoreOffer
                ) {
                    return;
                }

                if (
                    !data.candidate
                ) {
                    return;
                }

                const candidate =
                    new RTCIceCandidate(
                        data.candidate
                    );

                if (
                    pc.remoteDescription &&
                    pc.remoteDescription
                        .type
                ) {
                    await pc
                        .addIceCandidate(
                            candidate
                        );
                } else {
                    peerInfo
                        .pendingCandidates
                        .push(
                            candidate
                        );
                }
            }

        } catch (
            error
        ) {
            console.error(
                "[Conference Signal]",
                remoteUserId,
                error
            );
        }
    }

    async function flushPendingCandidates(
        peerInfo
    ) {
        if (
            !peerInfo ||
            !peerInfo.pc
        ) {
            return;
        }

        const pc =
            peerInfo.pc;

        while (
            peerInfo
                .pendingCandidates
                .length
        ) {
            const candidate =
                peerInfo
                    .pendingCandidates
                    .shift();

            try {
                await pc
                    .addIceCandidate(
                        candidate
                    );
            } catch (
                error
            ) {
                console.warn(
                    "[Conference pending ICE]",
                    error
                );
            }
        }
    }

    /* ============================================================
       REMOTE VIDEO / AUDIO
       ============================================================ */

    function attachRemoteStream(
        remoteUserId,
        stream
    ) {
        const grid =
            document.getElementById(
                "gp-conf-videos"
            );

        if (!grid) {
            return;
        }

        let card =
            document.getElementById(
                "gp-conf-remote-" +
                remoteUserId
            );

        if (!card) {
            card =
                document.createElement(
                    "div"
                );

            card.id =
                "gp-conf-remote-" +
                remoteUserId;

            card.className =
                "gp-conf-video-card";

            card.innerHTML = `
                <video
                    autoplay
                    playsinline
                ></video>

                <div
                    class="gp-conf-video-placeholder"
                >
                    <div
                        class="gp-conf-video-placeholder-avatar"
                    >
                        🤖
                    </div>

                    <span>
                        Ожидание видео...
                    </span>
                </div>

                <div
                    class="gp-conf-video-label"
                >
                    Игрок
                </div>

                <div
                    class="gp-conf-video-state"
                >
                    Подключено
                </div>
            `;

            grid.appendChild(
                card
            );

            loadRemoteNickname(
                remoteUserId,
                card
            );
        }

        const video =
            card.querySelector(
                "video"
            );

        const placeholder =
            card.querySelector(
                ".gp-conf-video-placeholder"
            );

        /*
         * Если video уже содержит stream,
         * добавляем отсутствующие tracks.
         */

        if (
            video.srcObject
        ) {
            const existingStream =
                video.srcObject;

            for (
                const track
                of stream.getTracks()
            ) {
                const exists =
                    existingStream
                        .getTracks()
                        .some(
                            function (
                                existingTrack
                            ) {
                                return (
                                    existingTrack.id ===
                                    track.id
                                );
                            }
                        );

                if (!exists) {
                    existingStream
                        .addTrack(
                            track
                        );
                }
            }
        } else {
            video.srcObject =
                stream;
        }

        /*
         * КРИТИЧНО:
         * Удалённое видео НЕ muted.
         * Иначе звука не будет.
         */

        video.muted = false;
        video.volume = 1;

        video.play()
            .then(
                function () {
                    console.log(
                        "[Conference Remote Play OK]",
                        remoteUserId
                    );
                }
            )
            .catch(
                function (error) {
                    console.warn(
                        "[Conference Remote Autoplay]",
                        error
                    );

                    /*
                     * Некоторые браузеры блокируют
                     * автоматическое воспроизведение звука.
                     * После клика по странице пробуем ещё раз.
                     */

                    const resumeAudio =
                        function () {
                            video.play()
                                .catch(
                                    function () {}
                                );

                            document
                                .removeEventListener(
                                    "click",
                                    resumeAudio
                                );
                        };

                    document.addEventListener(
                        "click",
                        resumeAudio
                    );
                }
            );

        const streamHasVideo =
            video.srcObject &&
            video.srcObject
                .getVideoTracks()
                .length > 0;

        if (streamHasVideo) {
            video.style.display =
                "block";

            placeholder.style.display =
                "none";
        } else {
            video.style.display =
                "none";

            placeholder.style.display =
                "flex";

            placeholder
                .querySelector("span")
                .textContent =
                "Подключён только звук";
        }
    }

    async function loadRemoteNickname(
        userId,
        card
    ) {
        try {
            const {
                data,
                error
            } =
                await db
                    .from("profiles")
                    .select(
                        "nickname"
                    )
                    .eq(
                        "id",
                        userId
                    )
                    .maybeSingle();

            if (error) {
                return;
            }

            const label =
                card.querySelector(
                    ".gp-conf-video-label"
                );

            if (
                label &&
                data
            ) {
                label.textContent =
                    data.nickname ||
                    "Игрок";
            }

        } catch (
            error
        ) {
            console.warn(
                error
            );
        }
    }

    /* ============================================================
       MEMBER LIST
       ============================================================ */

    async function refreshMemberList() {
        if (!currentRoom) {
            return;
        }

        const container =
            document.getElementById(
                "gp-conf-member-list"
            );

        if (!container) {
            return;
        }

        const {
            data: members,
            error
        } =
            await db
                .from(
                    "conference_room_members"
                )
                .select(
                    "user_id,joined_at"
                )
                .eq(
                    "room_id",
                    currentRoom.id
                )
                .order(
                    "joined_at",
                    {
                        ascending: true
                    }
                );

        if (error) {
            console.error(
                "[Conference Members]",
                error
            );

            return;
        }

        const rows =
            members || [];

        const userIds =
            rows.map(
                function (item) {
                    return item.user_id;
                }
            );

        let profiles = [];

        if (
            userIds.length
        ) {
            const result =
                await db
                    .from("profiles")
                    .select(
                        "id,nickname,avatar_url"
                    )
                    .in(
                        "id",
                        userIds
                    );

            if (
                !result.error
            ) {
                profiles =
                    result.data || [];
            }
        }

        const profileMap =
            {};

        for (
            const profile
            of profiles
        ) {
            profileMap[
                profile.id
            ] =
                profile;
        }

        container.innerHTML =
            "";

        for (
            const member
            of rows
        ) {
            const profile =
                profileMap[
                    member.user_id
                ] || {};

            const own =
                currentUser &&
                member.user_id ===
                    currentUser.id;

            const nickname =
                profile.nickname ||
                (
                    own
                        ? "Вы"
                        : "Игрок"
                );

            const avatar =
                profile.avatar_url
                    ? `
                        <img
                            src="${escapeHtml(
                                profile.avatar_url
                            )}"
                            alt=""
                        >
                    `
                    : "🤖";

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "gp-conf-member";

            row.innerHTML = `
                <div
                    class="gp-conf-member-avatar"
                >
                    ${avatar}
                </div>

                <div
                    class="gp-conf-member-name"
                >
                    ${escapeHtml(
                        nickname
                    )}

                    <small>
                        ${
                            own
                                ? "Вы"
                                : "Участник"
                        }
                    </small>
                </div>
            `;

            container.appendChild(
                row
            );
        }
    }

    /* ============================================================
       MICROPHONE
       ============================================================ */

    function toggleMicrophone() {
        if (!localStream) {
            return;
        }

        const tracks =
            localStream
                .getAudioTracks();

        if (!tracks.length) {
            alert(
                "Микрофон не доступен.\n\n" +
                "Проверьте разрешение микрофона в браузере."
            );

            return;
        }

        microphoneEnabled =
            !microphoneEnabled;

        for (
            const track
            of tracks
        ) {
            track.enabled =
                microphoneEnabled;
        }

        updateMediaButtons();
    }

    /* ============================================================
       CAMERA
       ============================================================ */

    function toggleCamera() {
        if (!localStream) {
            return;
        }

        const tracks =
            localStream
                .getVideoTracks();

        if (!tracks.length) {
            alert(
                "Камера не доступна.\n\n" +
                "Проверьте разрешение камеры в браузере."
            );

            return;
        }

        cameraEnabled =
            !cameraEnabled;

        for (
            const track
            of tracks
        ) {
            track.enabled =
                cameraEnabled;
        }

        updateMediaButtons();

        updateLocalVideoVisibility();
    }

    /* ============================================================
       SCREEN SHARE
       ============================================================ */

    async function toggleScreenShare() {
        if (sharingScreen) {
            await stopScreenShare();

            return;
        }

        await startScreenShare();
    }

    async function startScreenShare() {
        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices
                .getDisplayMedia
        ) {
            alert(
                "Демонстрация экрана не поддерживается этим браузером."
            );

            return;
        }

        try {
            screenStream =
                await navigator
                    .mediaDevices
                    .getDisplayMedia({
                        video: {
                            frameRate: {
                                ideal: 30,
                                max: 60
                            }
                        },

                        audio: false
                    });

            const screenTrack =
                screenStream
                    .getVideoTracks()[0];

            if (!screenTrack) {
                return;
            }

            sharingScreen = true;

            /*
             * Заменяем исходящий video track
             * у ВСЕХ peer connections.
             */

            for (
                const remoteUserId
                of Object.keys(peers)
            ) {
                const peerInfo =
                    peers[
                        remoteUserId
                    ];

                if (!peerInfo) {
                    continue;
                }

                const pc =
                    peerInfo.pc;

                let sender =
                    pc.getSenders()
                        .find(
                            function (
                                senderItem
                            ) {
                                return (
                                    senderItem.track &&
                                    senderItem.track
                                        .kind ===
                                        "video"
                                );
                            }
                        );

                /*
                 * Если sender video пока нет,
                 * добавляем screen track.
                 */

                if (!sender) {
                    sender =
                        pc.addTrack(
                            screenTrack,
                            screenStream
                        );
                } else {
                    await sender
                        .replaceTrack(
                            screenTrack
                        );
                }
            }

            /*
             * Локальное превью.
             */

            const localVideo =
                document.getElementById(
                    "gp-conf-local-video"
                );

            const localCard =
                document.getElementById(
                    "gp-conf-local-card"
                );

            if (localVideo) {
                localVideo.srcObject =
                    screenStream;

                localVideo.play()
                    .catch(
                        function () {}
                    );
            }

            if (localCard) {
                localCard.classList.add(
                    "screen"
                );
            }

            const localState =
                document.getElementById(
                    "gp-conf-local-state"
                );

            if (localState) {
                localState.textContent =
                    "Демонстрация экрана";
            }

            screenTrack.onended =
                function () {
                    stopScreenShare();
                };

            updateMediaButtons();

            updateLocalVideoVisibility();

        } catch (
            error
        ) {
            console.warn(
                "[Conference Screen]",
                error
            );
        }
    }

    async function stopScreenShare() {
        if (!sharingScreen) {
            return;
        }

        sharingScreen =
            false;

        const cameraTrack =
            localStream
                ? localStream
                    .getVideoTracks()[0]
                : null;

        /*
         * Возвращаем камеру.
         */

        for (
            const remoteUserId
            of Object.keys(peers)
        ) {
            const peerInfo =
                peers[
                    remoteUserId
                ];

            if (!peerInfo) {
                continue;
            }

            const sender =
                peerInfo.pc
                    .getSenders()
                    .find(
                        function (
                            senderItem
                        ) {
                            return (
                                senderItem.track &&
                                senderItem.track
                                    .kind ===
                                    "video"
                            );
                        }
                    );

            if (sender) {
                try {
                    await sender
                        .replaceTrack(
                            cameraTrack ||
                            null
                        );
                } catch (
                    error
                ) {
                    console.warn(
                        "[Conference restore camera]",
                        error
                    );
                }
            }
        }

        if (screenStream) {
            screenStream
                .getTracks()
                .forEach(
                    function (track) {
                        track.onended =
                            null;

                        track.stop();
                    }
                );

            screenStream =
                null;
        }

        /*
         * Возвращаем локальную камеру.
         */

        const localVideo =
            document.getElementById(
                "gp-conf-local-video"
            );

        const localCard =
            document.getElementById(
                "gp-conf-local-card"
            );

        if (localVideo) {
            localVideo.srcObject =
                localStream;

            localVideo.play()
                .catch(
                    function () {}
                );
        }

        if (localCard) {
            localCard.classList.remove(
                "screen"
            );
        }

        const localState =
            document.getElementById(
                "gp-conf-local-state"
            );

        if (localState) {
            localState.textContent =
                "Локально";
        }

        updateMediaButtons();

        updateLocalVideoVisibility();
    }

    /* ============================================================
       BUTTON STATES
       ============================================================ */

    function updateMediaButtons() {
        const micButton =
            document.getElementById(
                "gp-conf-mic"
            );

        const cameraButton =
            document.getElementById(
                "gp-conf-camera"
            );

        const screenButton =
            document.getElementById(
                "gp-conf-screen"
            );

        if (micButton) {
            micButton.textContent =
                microphoneEnabled
                    ? "🎤 Микрофон"
                    : "🔇 Микрофон";

            micButton.classList.toggle(
                "active",
                microphoneEnabled
            );
        }

        if (cameraButton) {
            cameraButton.textContent =
                cameraEnabled
                    ? "📹 Камера"
                    : "🚫 Камера";

            cameraButton.classList.toggle(
                "active",
                cameraEnabled
            );
        }

        if (screenButton) {
            screenButton.textContent =
                sharingScreen
                    ? "🖥 Остановить экран"
                    : "🖥 Экран";

            screenButton.classList.toggle(
                "active",
                sharingScreen
            );
        }
    }

    /* ============================================================
       REMOVE PEER
       ============================================================ */

    function removePeer(
        remoteUserId
    ) {
        const peerInfo =
            peers[
                remoteUserId
            ];

        if (
            peerInfo &&
            peerInfo.pc
        ) {
            try {
                peerInfo.pc.close();
            } catch (
                error
            ) {
                console.warn(
                    error
                );
            }
        }

        delete peers[
            remoteUserId
        ];

        const card =
            document.getElementById(
                "gp-conf-remote-" +
                remoteUserId
            );

        if (card) {
            const video =
                card.querySelector(
                    "video"
                );

            if (
                video &&
                video.srcObject
            ) {
                video.srcObject =
                    null;
            }

            card.remove();
        }

        updateDebugStatus();
    }

    function removeAllPeers() {
        const userIds =
            Object.keys(peers);

        for (
            const userId
            of userIds
        ) {
            removePeer(
                userId
            );
        }
    }

    /* ============================================================
       LEAVE ROOM
       ============================================================ */

    async function leaveRoom() {
        const leavingRoom =
            currentRoom;

        /*
         * Останавливаем screen share.
         */

        if (sharingScreen) {
            await stopScreenShare();
        }

        /*
         * Отключаем peers.
         */

        removeAllPeers();

        /*
         * Останавливаем media.
         */

        stopLocalMedia();

        /*
         * Уходим из Presence.
         */

        if (roomChannel) {
            try {
                await roomChannel
                    .untrack();
            } catch (
                error
            ) {
                console.warn(
                    error
                );
            }

            try {
                await db.removeChannel(
                    roomChannel
                );
            } catch (
                error
            ) {
                console.warn(
                    error
                );
            }

            roomChannel = null;
        }

        /*
         * Удаляем запись участника.
         */

        if (
            leavingRoom &&
            currentUser
        ) {
            const {
                error
            } =
                await db
                    .from(
                        "conference_room_members"
                    )
                    .delete()
                    .eq(
                        "room_id",
                        leavingRoom.id
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            if (error) {
                console.warn(
                    "[Conference leave DB]",
                    error
                );
            }
        }

        currentRoom = null;

        const videoGrid =
            document.getElementById(
                "gp-conf-videos"
            );

        if (videoGrid) {
            videoGrid.innerHTML =
                "";
        }

        document.getElementById(
            "gp-conf-room-view"
        ).style.display =
            "none";

        document.getElementById(
            "gp-conf-lobby"
        ).style.display =
            "block";

        await loadRooms();
    }

    /* ============================================================
       CLEANUP
       ============================================================ */

    async function cleanupConference() {
        if (sharingScreen) {
            await stopScreenShare();
        }

        removeAllPeers();

        stopLocalMedia();

        if (roomChannel) {
            try {
                await db.removeChannel(
                    roomChannel
                );
            } catch (
                error
            ) {}

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

            } catch (
                error
            ) {}
        }

        currentRoom = null;
    }

    function stopLocalMedia() {
        if (localStream) {
            localStream
                .getTracks()
                .forEach(
                    function (track) {
                        track.stop();
                    }
                );

            localStream = null;
        }

        if (screenStream) {
            screenStream
                .getTracks()
                .forEach(
                    function (track) {
                        track.onended =
                            null;

                        track.stop();
                    }
                );

            screenStream = null;
        }

        sharingScreen = false;
    }

    /* ============================================================
       DEBUG STATUS
       ============================================================ */

    function updateDebugStatus() {
        const element =
            document.getElementById(
                "gp-conf-debug-status"
            );

        if (!element) {
            return;
        }

        const peerIds =
            Object.keys(peers);

        if (!peerIds.length) {
            element.textContent =
                "Ожидание участников";

            return;
        }

        let connected = 0;
        let connecting = 0;

        for (
            const id
            of peerIds
        ) {
            const state =
                peers[id]
                    .pc
                    .connectionState;

            if (
                state ===
                "connected"
            ) {
                connected++;
            } else {
                connecting++;
            }
        }

        element.textContent =
            "WebRTC: " +
            connected +
            " подключено / " +
            connecting +
            " соединяется";
    }

    function setConnectionText(
        text
    ) {
        const element =
            document.getElementById(
                "gp-conf-connection-text"
            );

        if (element) {
            element.textContent =
                text;
        }
    }

    /* ============================================================
       BUTTON BINDING
       ============================================================ */

    function bindConferenceButtons() {
        const selectors = [
            "#header-conference-button",
            "#sidebar-conference-button",
            "#conference-button",
            "[data-open-conference]"
        ];

        for (
            const selector
            of selectors
        ) {
            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    function (
                        button
                    ) {
                        if (
                            button.dataset
                                .gpConferenceBound ===
                            "1"
                        ) {
                            return;
                        }

                        button.dataset
                            .gpConferenceBound =
                            "1";

                        button.addEventListener(
                            "click",
                            function (
                                event
                            ) {
                                event
                                    .preventDefault();

                                event
                                    .stopPropagation();

                                openConference();
                            }
                        );
                    }
                );
        }
    }

    /* ============================================================
       PAGE UNLOAD
       ============================================================ */

    function setupUnloadHandler() {
        window.addEventListener(
            "beforeunload",
            function () {
                try {
                    if (
                        roomChannel
                    ) {
                        roomChannel
                            .untrack();
                    }
                } catch (
                    error
                ) {}
            }
        );
    }

    /* ============================================================
       HELPERS
       ============================================================ */

    function escapeHtml(
        value
    ) {
        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }

    /* ============================================================
       INIT
       ============================================================ */

    function init() {
        if (initialized) {
            return;
        }

        initialized = true;

        injectStyles();

        createConferenceUI();

        bindConferenceButtons();

        setupUnloadHandler();

        /*
         * app.js может создать кнопку
         * чуть позже.
         */

        let attempts = 0;

        const timer =
            setInterval(
                function () {
                    bindConferenceButtons();

                    attempts++;

                    if (
                        attempts >= 30
                    ) {
                        clearInterval(
                            timer
                        );
                    }
                },
                500
            );

        db.auth
            .onAuthStateChange(
                function (
                    event,
                    session
                ) {
                    currentUser =
                        session &&
                        session.user
                            ? session.user
                            : null;
                }
            );

        console.log(
            "[Conference] v3.0 loaded"
        );
    }

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

    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.GamePlatformConference = {
        open:
            openConference,

        close:
            closeConference,

        leave:
            leaveRoom
    };

})();
