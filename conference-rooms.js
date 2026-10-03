(function () {
  "use strict";

  /*
   * =========================================================
   * GAME PLATFORM
   * CONFERENCE ROOMS
   * =========================================================
   *
   * Возможности:
   *
   * - постоянный список конференций из Supabase
   * - создание комнат
   * - список участников
   * - количество участников
   * - кнопка "Присоединиться"
   * - выход из комнаты
   * - микрофон
   * - камера
   * - демонстрация экрана
   * - WebRTC
   * - Supabase Realtime Presence
   * - Supabase Realtime Broadcast
   *
   * Python не используется.
   */

  const SUPABASE_URL =
    "https://tpdpciooxfulythevhgw.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_yNWxh02tapOVUQN9iJ_2_Q_IPVc60J3";


  /*
   * ---------------------------------------------------------
   * SUPABASE CLIENT
   * ---------------------------------------------------------
   */

  let db = null;

  try {
    if (
      window.GamePlatform &&
      window.GamePlatform.supabase
    ) {
      db = window.GamePlatform.supabase;
    }

    if (
      !db &&
      window.GamePlatform &&
      window.GamePlatform.db
    ) {
      db = window.GamePlatform.db;
    }

    if (
      !db &&
      window.supabaseClient
    ) {
      db = window.supabaseClient;
    }

    if (
      !db &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
    ) {
      db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
    }
  } catch (error) {
    console.error(
      "Conference Supabase initialization error:",
      error
    );
  }


  /*
   * ---------------------------------------------------------
   * STATE
   * ---------------------------------------------------------
   */

  const state = {

    session: null,

    user: null,

    profile: null,

    rooms: [],

    lobbyChannel: null,

    lobbyPresence: {},

    currentRoom: null,

    roomChannel: null,

    peers: new Map(),

    remoteStreams: new Map(),

    localStream: null,

    cameraStream: null,

    screenStream: null,

    isMicEnabled: false,

    isCameraEnabled: false,

    isScreenSharing: false,

    selectedMicId: "",

    selectedCameraId: "",

    selectedSpeakerId: "",

    videoQuality: "720p",

    pollingTimer: null,

    lobbyReady: false,

    initialized: false,

    loadingRooms: false,

    pendingOffers: new Map(),

    ui: {}

  };


  /*
   * ---------------------------------------------------------
   * CONSTANTS
   * ---------------------------------------------------------
   */

  const LOBBY_TOPIC =
    "game-platform-conference-lobby-v3";

  const ROOM_TOPIC_PREFIX =
    "game-platform-conference-room-v3-";

  const ROOM_POLL_INTERVAL =
    5000;


  /*
   * ---------------------------------------------------------
   * STYLES
   * ---------------------------------------------------------
   */

  function injectStyles() {

    if (
      document.getElementById(
        "conference-rooms-runtime-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "conference-rooms-runtime-style";

    style.textContent = `

      .conference-modal {
        width: min(1180px, calc(100vw - 30px));
        max-width: 1180px;
        max-height: calc(100vh - 30px);
        overflow: hidden;
      }

      .conference-root {
        min-height: 560px;
        display: flex;
        flex-direction: column;
      }

      .conference-loading {
        min-height: 400px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667085;
        font-size: 15px;
      }

      .conference-message {
        margin-bottom: 14px;
        padding: 10px 13px;
        border-radius: 12px;
        background: #f1f4f8;
        border: 1px solid #e1e6ed;
        color: #303846;
        font-size: 13px;
      }

      .conference-message.error {
        background: #fff1f1;
        border-color: #ffd2d2;
        color: #a31d1d;
      }

      .conference-message.success {
        background: #eefbf3;
        border-color: #ccefd8;
        color: #176b39;
      }

      .conference-lobby {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 18px;
        min-height: 520px;
      }

      .conference-main-panel,
      .conference-side-panel {
        background: rgba(255,255,255,.92);
        border: 1px solid #e0e5ec;
        border-radius: 18px;
        box-shadow:
          0 10px 30px rgba(40, 55, 75, .08);
      }

      .conference-main-panel {
        padding: 18px;
        overflow: hidden;
      }

      .conference-side-panel {
        padding: 18px;
      }

      .conference-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 15px;
      }

      .conference-toolbar-title {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .conference-toolbar-title strong {
        font-size: 18px;
        color: #111827;
      }

      .conference-toolbar-title span {
        font-size: 12px;
        color: #7b8492;
      }

      .conference-toolbar-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .conference-button {
        border: 1px solid #d7dde6;
        background: linear-gradient(
          180deg,
          #ffffff 0%,
          #eef2f6 100%
        );
        color: #171b22;
        border-radius: 11px;
        padding: 9px 13px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: .18s ease;
      }

      .conference-button:hover {
        transform: translateY(-1px);
        border-color: #b8c3d0;
        box-shadow:
          0 6px 18px rgba(40,55,75,.10);
      }

      .conference-button.primary {
        background: #111827;
        color: #fff;
        border-color: #111827;
      }

      .conference-button.blue {
        background: #eaf4ff;
        border-color: #bddcff;
        color: #145ca8;
      }

      .conference-button.danger {
        background: #fff0f0;
        border-color: #ffcaca;
        color: #b42323;
      }

      .conference-button:disabled {
        opacity: .5;
        cursor: not-allowed;
        transform: none;
      }

      .conference-room-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 455px;
        overflow-y: auto;
        padding-right: 3px;
      }

      .conference-room-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 15px;
        border: 1px solid #e0e5eb;
        border-radius: 15px;
        background: #fff;
        transition: .18s ease;
      }

      .conference-room-card:hover {
        border-color: #bcc7d4;
        box-shadow:
          0 8px 20px rgba(30,45,65,.07);
      }

      .conference-room-card.active {
        border-color: #78aee8;
        background: #f7fbff;
      }

      .conference-room-info {
        min-width: 0;
      }

      .conference-room-name-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 5px;
      }

      .conference-room-name {
        font-size: 15px;
        font-weight: 800;
        color: #151a22;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .conference-live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #31c66b;
        box-shadow: 0 0 0 4px rgba(49,198,107,.10);
        flex: 0 0 auto;
      }

      .conference-room-description {
        font-size: 12px;
        line-height: 1.45;
        color: #737d8b;
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .conference-room-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .conference-meta-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border-radius: 999px;
        background: #f2f5f8;
        color: #596575;
        font-size: 11px;
        font-weight: 700;
      }

      .conference-room-actions {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .conference-empty {
        min-height: 280px;
        border: 1px dashed #cfd6df;
        border-radius: 15px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 30px;
        color: #747e8d;
      }

      .conference-empty-icon {
        font-size: 38px;
        margin-bottom: 10px;
      }

      .conference-empty strong {
        color: #303743;
        margin-bottom: 5px;
      }

      .conference-side-title {
        font-size: 11px;
        letter-spacing: .12em;
        font-weight: 800;
        color: #8a94a2;
        margin-bottom: 12px;
      }

      .conference-current-user {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 13px;
        background: #f5f7fa;
        margin-bottom: 18px;
      }

      .conference-current-user-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        object-fit: cover;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e4e9ef;
        overflow: hidden;
        flex: 0 0 auto;
      }

      .conference-current-user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .conference-current-user-data {
        min-width: 0;
      }

      .conference-current-user-data strong {
        display: block;
        font-size: 13px;
        color: #202630;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .conference-current-user-data span {
        display: block;
        font-size: 11px;
        color: #7a8491;
        margin-top: 2px;
      }

      .conference-create-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .conference-create-form label {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .conference-create-form label span {
        font-size: 11px;
        font-weight: 700;
        color: #687383;
      }

      .conference-create-form input,
      .conference-create-form textarea,
      .conference-select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d8dee7;
        background: #fff;
        border-radius: 10px;
        padding: 10px 11px;
        outline: none;
        color: #1c2430;
        font: inherit;
        font-size: 13px;
      }

      .conference-create-form textarea {
        resize: vertical;
        min-height: 75px;
      }

      .conference-create-form input:focus,
      .conference-create-form textarea:focus,
      .conference-select:focus {
        border-color: #8db7e7;
        box-shadow: 0 0 0 3px rgba(82,146,220,.10);
      }

      .conference-hint {
        font-size: 11px;
        color: #8993a0;
        line-height: 1.45;
        margin-top: 4px;
      }

      .conference-room-view {
        display: flex;
        flex-direction: column;
        min-height: 570px;
      }

      .conference-room-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-bottom: 13px;
      }

      .conference-room-heading {
        min-width: 0;
      }

      .conference-room-heading strong {
        display: block;
        font-size: 20px;
        color: #141922;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .conference-room-heading span {
        display: block;
        font-size: 12px;
        color: #77818f;
        margin-top: 4px;
      }

      .conference-room-top-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .conference-stage {
        flex: 1;
        min-height: 390px;
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(190px, 1fr)
        );
        gap: 12px;
        padding: 12px;
        border-radius: 17px;
        background:
          radial-gradient(
            circle at 50% 0%,
            rgba(115,156,205,.15),
            transparent 40%
          ),
          #111820;
        border: 1px solid #293441;
        overflow-y: auto;
      }

      .conference-video-tile {
        position: relative;
        min-height: 170px;
        border-radius: 14px;
        overflow: hidden;
        background: #202832;
        border: 1px solid rgba(255,255,255,.09);
      }

      .conference-video-tile video {
        width: 100%;
        height: 100%;
        min-height: 170px;
        object-fit: cover;
        display: block;
        background: #161c23;
      }

      .conference-video-tile.audio-only video {
        opacity: .08;
      }

      .conference-avatar-fallback {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        background:
          radial-gradient(
            circle,
            #34404f,
            #161d25 70%
          );
        pointer-events: none;
      }

      .conference-video-label {
        position: absolute;
        left: 8px;
        bottom: 8px;
        right: 8px;
        display: flex;
        justify-content: space-between;
        gap: 7px;
        align-items: center;
        padding: 7px 9px;
        border-radius: 9px;
        background: rgba(0,0,0,.58);
        backdrop-filter: blur(8px);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
      }

      .conference-video-status {
        display: flex;
        gap: 5px;
        align-items: center;
        opacity: .85;
        font-weight: 500;
      }

      .conference-mic-off {
        color: #ff8f8f;
      }

      .conference-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding: 13px 0 0;
      }

      .conference-control {
        width: 46px;
        height: 42px;
        border-radius: 12px;
        border: 1px solid #d3dbe5;
        background: linear-gradient(
          180deg,
          #ffffff,
          #e9eef4
        );
        color: #1b2330;
        cursor: pointer;
        font-size: 17px;
        transition: .18s ease;
      }

      .conference-control:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 15px rgba(0,0,0,.10);
      }

      .conference-control.active {
        background: #e8f5ed;
        border-color: #9bd4ae;
        color: #16743d;
      }

      .conference-control.off {
        background: #fff0f0;
        border-color: #ffc8c8;
        color: #b42020;
      }

      .conference-control.leave {
        width: auto;
        padding: 0 17px;
        background: #111827;
        color: #fff;
        border-color: #111827;
        font-size: 13px;
        font-weight: 800;
      }

      .conference-settings {
        margin-top: 13px;
        display: flex;
        justify-content: center;
      }

      .conference-settings-panel {
        width: min(760px, 100%);
        display: none;
        grid-template-columns: repeat(
          3,
          minmax(0,1fr)
        );
        gap: 10px;
        padding: 13px;
        border-radius: 14px;
        background: #f5f7fa;
        border: 1px solid #e0e5eb;
      }

      .conference-settings-panel.open {
        display: grid;
      }

      .conference-setting {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .conference-setting span {
        font-size: 10px;
        font-weight: 800;
        color: #737d8a;
      }

      .conference-participants-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .conference-participants-title strong {
        font-size: 13px;
        color: #252c37;
      }

      .conference-participants-title span {
        font-size: 11px;
        color: #7b8592;
      }

      .conference-participants-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: 220px;
        overflow-y: auto;
      }

      .conference-participant-row {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px;
        border-radius: 10px;
        background: #f6f8fa;
      }

      .conference-participant-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        background: #dfe5ec;
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 0 0 auto;
      }

      .conference-participant-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .conference-participant-data {
        min-width: 0;
        flex: 1;
      }

      .conference-participant-data strong {
        display: block;
        color: #2a3039;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .conference-participant-data span {
        display: block;
        color: #818b98;
        font-size: 10px;
        margin-top: 2px;
      }

      .conference-empty-participants {
        padding: 15px;
        text-align: center;
        font-size: 11px;
        color: #87919e;
        border: 1px dashed #d2d9e2;
        border-radius: 10px;
      }

      @media (max-width: 900px) {

        .conference-lobby {
          grid-template-columns: 1fr;
        }

        .conference-side-panel {
          order: -1;
        }

        .conference-root {
          min-height: auto;
        }

        .conference-main-panel {
          min-height: 450px;
        }

        .conference-room-list {
          max-height: 420px;
        }

        .conference-settings-panel {
          grid-template-columns: 1fr;
        }

      }

      @media (max-width: 600px) {

        .conference-modal {
          width: calc(100vw - 12px);
          max-height: calc(100vh - 12px);
        }

        .conference-room-card {
          grid-template-columns: 1fr;
        }

        .conference-room-actions {
          justify-content: stretch;
        }

        .conference-room-actions button {
          flex: 1;
        }

        .conference-room-top {
          flex-direction: column;
          align-items: stretch;
        }

        .conference-room-top-actions {
          justify-content: stretch;
        }

        .conference-room-top-actions button {
          flex: 1;
        }

        .conference-stage {
          grid-template-columns: 1fr;
        }

      }

    `;

    document.head.appendChild(style);
  }


  /*
   * ---------------------------------------------------------
   * DOM
   * ---------------------------------------------------------
   */

  function getRoot() {
    return document.getElementById(
      "conference-root"
    );
  }


  function openModal() {

    const modal =
      document.getElementById(
        "conference-modal"
      );

    if (!modal) {
      return;
    }

    modal.classList.add("active");
    modal.style.display = "flex";
    modal.removeAttribute("hidden");

    renderLobby();

    loadRooms();
  }


  function closeModal() {

    const modal =
      document.getElementById(
        "conference-modal"
      );

    if (!modal) {
      return;
    }

    modal.classList.remove("active");
    modal.style.display = "none";
  }


  /*
   * ---------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------
   */

  function escapeHtml(value) {

    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function getAvatarUrl(profile) {

    if (
      profile &&
      profile.avatar_url
    ) {
      return profile.avatar_url;
    }

    return "";
  }


  function getNickname(profile) {

    if (
      profile &&
      profile.nickname
    ) {
      return profile.nickname;
    }

    return "Player";
  }


  function avatarHtml(profile, className) {

    const avatar =
      getAvatarUrl(profile);

    if (avatar) {

      return `
        <div class="${className}">
          <img
            src="${escapeHtml(avatar)}"
            alt=""
            onerror="this.parentElement.innerHTML='🤖';"
          >
        </div>
      `;

    }

    return `
      <div class="${className}">
        🤖
      </div>
    `;
  }


  function showMessage(
    message,
    type
  ) {

    const root = getRoot();

    if (!root) {
      return;
    }

    let element =
      document.getElementById(
        "conference-message"
      );

    if (!element) {

      element =
        document.createElement("div");

      element.id =
        "conference-message";

      element.className =
        "conference-message";

      root.prepend(element);
    }

    element.className =
      "conference-message" +
      (type ? " " + type : "");

    element.textContent =
      message;

    window.setTimeout(() => {

      if (
        element &&
        element.parentNode
      ) {
        element.remove();
      }

    }, 5000);
  }


  /*
   * ---------------------------------------------------------
   * AUTH
   * ---------------------------------------------------------
   */

  async function loadSession() {

    if (!db) {
      return null;
    }

    try {

      const result =
        await db.auth.getSession();

      if (
        result &&
        result.data
      ) {
        state.session =
          result.data.session || null;

        state.user =
          state.session
            ? state.session.user
            : null;
      }

      return state.session;

    } catch (error) {

      console.error(
        "Conference getSession error:",
        error
      );

      return null;
    }
  }


  async function loadProfile() {

    if (
      !db ||
      !state.user
    ) {
      return null;
    }

    try {

      const result =
        await db
          .from("profiles")
          .select("*")
          .eq("id", state.user.id)
          .maybeSingle();

      if (
        result.error
      ) {
        console.warn(
          "Conference profile error:",
          result.error
        );

        return null;
      }

      state.profile =
        result.data || {
          id: state.user.id,
          nickname:
            state.user.email ||
            "Player"
        };

      return state.profile;

    } catch (error) {

      console.error(
        "Conference profile exception:",
        error
      );

      return null;
    }
  }


  /*
   * ---------------------------------------------------------
   * LOBBY PRESENCE
   * ---------------------------------------------------------
   */

  async function startLobbyPresence() {

    if (
      !db ||
      !state.user
    ) {
      return;
    }

    if (
      state.lobbyChannel
    ) {

      try {
        await db.removeChannel(
          state.lobbyChannel
        );
      } catch (error) {
        console.warn(error);
      }

      state.lobbyChannel = null;
    }


    const channel =
      db.channel(
        LOBBY_TOPIC,
        {
          config: {
            presence: {
              key: state.user.id
            }
          }
        }
      );

    state.lobbyChannel =
      channel;


    channel
      .on(
        "presence",
        {
          event: "sync"
        },
        () => {

          state.lobbyPresence =
            channel.presenceState();

          renderLobby();

        }
      )
      .on(
        "presence",
        {
          event: "join"
        },
        () => {

          state.lobbyPresence =
            channel.presenceState();

          renderLobby();

        }
      )
      .on(
        "presence",
        {
          event: "leave"
        },
        () => {

          state.lobbyPresence =
            channel.presenceState();

          renderLobby();

        }
      );


    const status =
      await new Promise((resolve) => {

        let finished = false;

        const finish = (value) => {

          if (finished) {
            return;
          }

          finished = true;
          resolve(value);
        };

        channel.subscribe(
          async (subscriptionStatus) => {

            if (
              subscriptionStatus ===
              "SUBSCRIBED"
            ) {

              state.lobbyReady =
                true;

              await updateLobbyPresence();

              finish(true);

              return;
            }

            if (
              subscriptionStatus ===
              "CHANNEL_ERROR" ||
              subscriptionStatus ===
              "TIMED_OUT"
            ) {

              finish(false);

            }

          }
        );

        window.setTimeout(
          () => finish(false),
          10000
        );

      });


    if (!status) {

      console.warn(
        "Conference lobby realtime is unavailable."
      );

    }

  }


  async function updateLobbyPresence() {

    if (
      !state.lobbyChannel ||
      !state.user
    ) {
      return;
    }

    try {

      await state.lobbyChannel.track({

        userId:
          state.user.id,

        nickname:
          getNickname(state.profile),

        avatarUrl:
          getAvatarUrl(state.profile),

        status:
          state.profile &&
          state.profile.status
            ? state.profile.status
            : "Онлайн",

        roomId:
          state.currentRoom
            ? state.currentRoom.id
            : null,

        roomName:
          state.currentRoom
            ? state.currentRoom.name
            : null,

        updatedAt:
          new Date().toISOString()

      });

    } catch (error) {

      console.warn(
        "Conference presence track error:",
        error
      );

    }
  }


  /*
   * ---------------------------------------------------------
   * PRESENCE NORMALIZATION
   * ---------------------------------------------------------
   */

  function getLobbyUsers() {

    const result = [];

    const source =
      state.lobbyPresence || {};


    Object.keys(source).forEach(
      (presenceKey) => {

        const records =
          source[presenceKey] || [];

        if (!records.length) {
          return;
        }

        /*
         * Если пользователь открыл несколько вкладок,
         * берем последнюю запись.
         */

        const record =
          records[records.length - 1];

        result.push(record);

      }
    );

    return result;
  }


  function getRoomParticipants(
    roomId
  ) {

    return getLobbyUsers()
      .filter(
        user =>
          user.roomId === roomId
      );
  }


  /*
   * ---------------------------------------------------------
   * DATABASE ROOMS
   * ---------------------------------------------------------
   */

  async function loadRooms() {

    if (
      !db ||
      state.loadingRooms
    ) {
      return;
    }

    state.loadingRooms = true;

    try {

      const result =
        await db
          .from("conference_rooms")
          .select(
            "id,name,description,created_by,created_at,is_active"
          )
          .eq("is_active", true)
          .order(
            "created_at",
            {
              ascending: true
            }
          );


      if (result.error) {

        console.error(
          "Conference rooms query error:",
          result.error
        );

        renderRoomError(
          result.error.message
        );

        return;
      }


      state.rooms =
        result.data || [];

      renderLobby();

    } catch (error) {

      console.error(
        "Conference rooms exception:",
        error
      );

      renderRoomError(
        error.message ||
        "Ошибка загрузки комнат"
      );

    } finally {

      state.loadingRooms =
        false;
    }
  }


  async function createRoom(
    name,
    description
  ) {

    if (
      !db ||
      !state.user
    ) {

      showMessage(
        "Необходимо войти в аккаунт.",
        "error"
      );

      return;
    }


    name =
      String(name || "")
        .trim();

    description =
      String(description || "")
        .trim();


    if (
      name.length < 2
    ) {

      showMessage(
        "Название комнаты должно содержать минимум 2 символа.",
        "error"
      );

      return;
    }


    if (
      name.length > 80
    ) {

      showMessage(
        "Название комнаты слишком длинное.",
        "error"
      );

      return;
    }


    try {

      const result =
        await db
          .from("conference_rooms")
          .insert({

            name,

            description:
              description ||
              null,

            created_by:
              state.user.id,

            is_active:
              true

          })
          .select()
          .single();


      if (result.error) {

        console.error(
          result.error
        );

        showMessage(
          result.error.message ||
          "Не удалось создать комнату.",
          "error"
        );

        return;
      }


      if (result.data) {

        state.rooms.push(
          result.data
        );

      }


      renderLobby();

      showMessage(
        "Комната создана.",
        "success"
      );


    } catch (error) {

      console.error(error);

      showMessage(
        "Ошибка создания комнаты.",
        "error"
      );

    }

  }


  function renderRoomError(
    message
  ) {

    const list =
      document.getElementById(
        "conference-room-list"
      );

    if (!list) {
      return;
    }

    list.innerHTML = `

      <div class="conference-empty">

        <div class="conference-empty-icon">
          ⚠️
        </div>

        <strong>
          Не удалось загрузить комнаты
        </strong>

        <span>
          ${escapeHtml(message || "")}
        </span>

      </div>

    `;
  }


  /*
   * ---------------------------------------------------------
   * LOBBY UI
   * ---------------------------------------------------------
   */

  function renderLobby() {

    const root =
      getRoot();

    if (!root) {
      return;
    }


    if (
      !state.user
    ) {

      root.innerHTML = `

        <div class="conference-empty">

          <div class="conference-empty-icon">
            🔐
          </div>

          <strong>
            Войдите в GAME PLATFORM
          </strong>

          <span>
            Для участия в конференциях необходимо авторизоваться.
          </span>

        </div>

      `;

      return;
    }


    const currentNickname =
      getNickname(state.profile);


    const currentAvatar =
      getAvatarUrl(state.profile);


    root.innerHTML = `

      <div class="conference-lobby">

        <section class="conference-main-panel">

          <div class="conference-toolbar">

            <div class="conference-toolbar-title">

              <strong>
                Доступные конференции
              </strong>

              <span>
                Выберите комнату и нажмите «Присоединиться»
              </span>

            </div>

            <div class="conference-toolbar-actions">

              <button
                type="button"
                class="conference-button"
                id="conference-refresh-button"
              >
                ↻ Обновить
              </button>

            </div>

          </div>


          <div
            id="conference-room-list"
            class="conference-room-list"
          >

            ${renderRoomCards()}

          </div>

        </section>


        <aside class="conference-side-panel">

          <div class="conference-side-title">
            ВЫ
          </div>


          <div class="conference-current-user">

            <div class="conference-current-user-avatar">

              ${
                currentAvatar
                  ? `
                    <img
                      src="${escapeHtml(currentAvatar)}"
                      alt=""
                      onerror="this.parentElement.innerHTML='🤖';"
                    >
                  `
                  : "🤖"
              }

            </div>

            <div class="conference-current-user-data">

              <strong>
                ${escapeHtml(currentNickname)}
              </strong>

              <span>
                ${state.currentRoom
                  ? "В конференции"
                  : "Готов к подключению"}
              </span>

            </div>

          </div>


          <div class="conference-side-title">
            СОЗДАТЬ КОМНАТУ
          </div>


          <form
            id="conference-create-form"
            class="conference-create-form"
          >

            <label>

              <span>
                Название
              </span>

              <input
                id="conference-create-name"
                type="text"
                maxlength="80"
                placeholder="Например: Общая конференция"
                required
              >

            </label>


            <label>

              <span>
                Описание
              </span>

              <textarea
                id="conference-create-description"
                maxlength="300"
                placeholder="О чем эта конференция?"
              ></textarea>

            </label>


            <button
              type="submit"
              class="conference-button primary"
            >
              ＋ Создать комнату
            </button>

            <div class="conference-hint">
              Комната сохраняется в базе данных и будет видна другим
              пользователям после создания.
            </div>

          </form>


          <div style="height:20px"></div>


          <div class="conference-side-title">
            УЧАСТНИКИ
          </div>


          <div
            id="conference-lobby-online"
            class="conference-hint"
          >
            ${renderLobbyOnlineText()}
          </div>

        </aside>

      </div>

    `;


    bindLobbyEvents();
  }


  function renderRoomCards() {

    if (
      !state.rooms.length
    ) {

      return `

        <div class="conference-empty">

          <div class="conference-empty-icon">
            🎙
          </div>

          <strong>
            Конференций пока нет
          </strong>

          <span>
            Создайте первую комнату справа.
          </span>

        </div>

      `;

    }


    return state.rooms
      .map(room => {

        const participants =
          getRoomParticipants(
            room.id
          );

        const count =
          participants.length;


        const isCurrent =
          state.currentRoom &&
          state.currentRoom.id ===
            room.id;


        const description =
          room.description ||
          "Общая конференция";


        return `

          <div
            class="conference-room-card ${
              isCurrent ? "active" : ""
            }"
            data-room-id="${escapeHtml(room.id)}"
          >

            <div class="conference-room-info">

              <div class="conference-room-name-row">

                ${
                  count > 0
                    ? `
                      <span class="conference-live-dot"></span>
                    `
                    : ""
                }

                <div class="conference-room-name">
                  ${escapeHtml(room.name)}
                </div>

              </div>


              <div class="conference-room-description">
                ${escapeHtml(description)}
              </div>


              <div class="conference-room-meta">

                <span class="conference-meta-pill">
                  👥 ${count}
                  ${
                    count === 1
                      ? "участник"
                      : "участников"
                  }
                </span>

                <span class="conference-meta-pill">
                  🎙 WebRTC
                </span>

                ${
                  isCurrent
                    ? `
                      <span class="conference-meta-pill">
                        Вы здесь
                      </span>
                    `
                    : ""
                }

              </div>

            </div>


            <div class="conference-room-actions">

              ${
                isCurrent
                  ? `
                    <button
                      type="button"
                      class="conference-button danger"
                      data-leave-room="${escapeHtml(room.id)}"
                    >
                      Выйти
                    </button>
                  `
                  : `
                    <button
                      type="button"
                      class="conference-button blue"
                      data-join-room="${escapeHtml(room.id)}"
                    >
                      Присоединиться
                    </button>
                  `
              }

            </div>

          </div>

        `;

      })
      .join("");
  }


  function renderLobbyOnlineText() {

    const users =
      getLobbyUsers();

    const inRooms =
      users.filter(
        user => !!user.roomId
      ).length;


    return `
      Сейчас в конференциях:
      <strong>${inRooms}</strong>
      ${inRooms === 1 ? "человек" : "человек"}.
      <br>
      Всего пользователей конференционного лобби:
      <strong>${users.length}</strong>.
    `;
  }


  function bindLobbyEvents() {

    const refresh =
      document.getElementById(
        "conference-refresh-button"
      );

    if (refresh) {

      refresh.addEventListener(
        "click",
        async () => {

          refresh.disabled = true;

          await loadRooms();

          refresh.disabled = false;

        }
      );

    }


    const form =
      document.getElementById(
        "conference-create-form"
      );

    if (form) {

      form.addEventListener(
        "submit",
        async (event) => {

          event.preventDefault();

          const name =
            document.getElementById(
              "conference-create-name"
            ).value;

          const description =
            document.getElementById(
              "conference-create-description"
            ).value;

          await createRoom(
            name,
            description
          );

        }
      );

    }


    document
      .querySelectorAll(
        "[data-join-room]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const roomId =
              button.getAttribute(
                "data-join-room"
              );

            await joinRoomById(
              roomId
            );

          }
        );

      });


    document
      .querySelectorAll(
        "[data-leave-room]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            await leaveRoom();
          }
        );

      });

  }


  /*
   * ---------------------------------------------------------
   * JOIN ROOM
   * ---------------------------------------------------------
   */

  async function joinRoomById(
    roomId
  ) {

    const room =
      state.rooms.find(
        item => item.id === roomId
      );

    if (!room) {

      showMessage(
        "Комната не найдена.",
        "error"
      );

      return;
    }

    await joinRoom(room);
  }


  async function joinRoom(
    room
  ) {

    if (
      !state.user
    ) {

      showMessage(
        "Необходимо войти в аккаунт.",
        "error"
      );

      return;
    }


    if (
      state.currentRoom &&
      state.currentRoom.id === room.id
    ) {

      renderConferenceRoom();

      return;
    }


    if (
      state.currentRoom
    ) {

      await leaveRoom(
        false
      );

    }


    state.currentRoom =
      room;


    await updateLobbyPresence();


    renderConferenceRoom();


    try {

      await setupRoomChannel(
        room
      );

    } catch (error) {

      console.error(
        "Room channel error:",
        error
      );

      showMessage(
        "Комната открыта, но WebRTC-соединение не запустилось.",
        "error"
      );

    }


    /*
     * Не заставляем пользователя включать
     * микрофон или камеру автоматически.
     *
     * Он сам нажимает кнопки.
     */

    renderConferenceRoom();
  }


  /*
   * ---------------------------------------------------------
   * ROOM REALTIME
   * ---------------------------------------------------------
   */

  async function setupRoomChannel(
    room
  ) {

    await cleanupRoomChannel();


    const topic =
      ROOM_TOPIC_PREFIX +
      room.id;


    const channel =
      db.channel(
        topic,
        {
          config: {
            presence: {
              key: state.user.id
            },
            broadcast: {
              self: false
            }
          }
        }
      );


    state.roomChannel =
      channel;


    channel
      .on(
        "presence",
        {
          event: "sync"
        },
        async () => {

          renderConferenceRoom();

          await syncPeersFromPresence();

        }
      )
      .on(
        "presence",
        {
          event: "join"
        },
        async payload => {

          renderConferenceRoom();

          await handlePresenceJoin(
            payload
          );

        }
      )
      .on(
        "presence",
        {
          event: "leave"
        },
        async payload => {

          handlePresenceLeave(
            payload
          );

          renderConferenceRoom();

        }
      )
      .on(
        "broadcast",
        {
          event: "webrtc-signal"
        },
        async payload => {

          await handleSignal(
            payload.payload
          );

        }
      );


    await new Promise(
      (resolve, reject) => {

        let done = false;

        const finish = (
          success,
          error
        ) => {

          if (done) {
            return;
          }

          done = true;

          if (success) {
            resolve();
          } else {
            reject(
              error ||
              new Error(
                "Realtime channel error"
              )
            );
          }

        };


        channel.subscribe(
          async status => {

            if (
              status ===
              "SUBSCRIBED"
            ) {

              try {

                await channel.track({

                  userId:
                    state.user.id,

                  nickname:
                    getNickname(
                      state.profile
                    ),

                  avatarUrl:
                    getAvatarUrl(
                      state.profile
                    ),

                  status:
                    state.profile &&
                    state.profile.status
                      ? state.profile.status
                      : "Онлайн",

                  mic:
                    state.isMicEnabled,

                  camera:
                    state.isCameraEnabled,

                  screen:
                    state.isScreenSharing

                });

                finish(true);

              } catch (error) {

                finish(
                  false,
                  error
                );

              }

              return;
            }


            if (
              status ===
                "CHANNEL_ERROR" ||
              status ===
                "TIMED_OUT"
            ) {

              finish(
                false,
                new Error(
                  "Realtime status: " +
                  status
                )
              );

            }

          }
        );


        window.setTimeout(
          () => {

            finish(
              false,
              new Error(
                "Realtime timeout"
              )
            );

          },
          12000
        );

      }
    );

  }


  async function cleanupRoomChannel() {

    for (
      const [
        userId,
        peer
      ]
      of state.peers
    ) {

      try {
        peer.close();
      } catch (error) {
        console.warn(error);
      }

    }


    state.peers.clear();
    state.remoteStreams.clear();


    if (
      state.roomChannel &&
      db
    ) {

      try {

        await state.roomChannel.untrack();

      } catch (error) {
        console.warn(error);
      }


      try {

        await db.removeChannel(
          state.roomChannel
        );

      } catch (error) {
        console.warn(error);
      }

    }


    state.roomChannel =
      null;


    removeRemoteTiles();
  }


  async function leaveRoom(
    showLobby = true
  ) {

    if (
      state.screenStream
    ) {

      stopScreenShare(
        false
      );

    }


    await cleanupRoomChannel();


    stopLocalMedia();


    state.currentRoom =
      null;


    await updateLobbyPresence();


    if (showLobby) {
      renderLobby();
    }

  }


  /*
   * ---------------------------------------------------------
   * PRESENCE
   * ---------------------------------------------------------
   */

  function getRoomPresenceUsers() {

    if (
      !state.roomChannel
    ) {
      return [];
    }


    const presence =
      state.roomChannel.presenceState();


    const users = [];


    Object.keys(presence)
      .forEach(key => {

        const records =
          presence[key] || [];

        if (!records.length) {
          return;
        }

        users.push(
          records[
            records.length - 1
          ]
        );

      });


    return users;
  }


  async function syncPeersFromPresence() {

    if (
      !state.roomChannel ||
      !state.user
    ) {
      return;
    }


    const users =
      getRoomPresenceUsers();


    const remoteIds =
      new Set(
        users
          .map(user => user.userId)
          .filter(
            id =>
              id &&
              id !== state.user.id
          )
      );


    /*
     * Удаляем peer'ы, которых больше нет.
     */

    for (
      const [
        userId,
        peer
      ]
      of state.peers
    ) {

      if (
        !remoteIds.has(userId)
      ) {

        try {
          peer.close();
        } catch (error) {
          console.warn(error);
        }

        state.peers.delete(
          userId
        );

        removeRemoteTile(
          userId
        );

      }

    }


    /*
     * Создаем соединения с текущими участниками.
     */

    for (
      const user of users
    ) {

      if (
        !user.userId ||
        user.userId === state.user.id
      ) {
        continue;
      }


      if (
        !state.peers.has(
          user.userId
        )
      ) {

        await createPeerConnection(
          user.userId,
          user,
          shouldInitiate(
            state.user.id,
            user.userId
          )
        );

      }

    }


    renderConferenceRoom();
  }


  function shouldInitiate(
    localId,
    remoteId
  ) {

    /*
     * Детерминированное правило.
     *
     * Только пользователь с меньшим UUID
     * создает offer.
     *
     * Благодаря этому оба пользователя
     * не создают offer одновременно.
     */

    return String(localId) <
      String(remoteId);
  }


  async function handlePresenceJoin(
    payload
  ) {

    const joined =
      payload &&
      payload.newPresences
        ? payload.newPresences
        : [];


    for (
      const records of joined
    ) {

      const user =
        Array.isArray(records)
          ? records[0]
          : records;


      if (
        !user ||
        !user.userId ||
        user.userId ===
          state.user.id
      ) {
        continue;
      }


      if (
        !state.peers.has(
          user.userId
        )
      ) {

        await createPeerConnection(
          user.userId,
          user,
          shouldInitiate(
            state.user.id,
            user.userId
          )
        );

      }

    }


    renderConferenceRoom();
  }


  function handlePresenceLeave(
    payload
  ) {

    const left =
      payload &&
      payload.leftPresences
        ? payload.leftPresences
        : [];


    for (
      const records of left
    ) {

      const user =
        Array.isArray(records)
          ? records[0]
          : records;


      if (
        !user ||
        !user.userId
      ) {
        continue;
      }


      const peer =
        state.peers.get(
          user.userId
        );


      if (peer) {

        try {
          peer.close();
        } catch (error) {
          console.warn(error);
        }

      }


      state.peers.delete(
        user.userId
      );


      removeRemoteTile(
        user.userId
      );

    }

  }


  /*
   * ---------------------------------------------------------
   * WEBRTC
   * ---------------------------------------------------------
   */

  function createPeerConnection(
    remoteUserId,
    remoteUser,
    initiate
  ) {

    return new Promise(
      async resolve => {

        if (
          state.peers.has(
            remoteUserId
          )
        ) {

          resolve(
            state.peers.get(
              remoteUserId
            )
          );

          return;
        }


        const configuration = {

          iceServers: [

            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302"
              ]
            }

          ]

        };


        const pc =
          new RTCPeerConnection(
            configuration
          );


        state.peers.set(
          remoteUserId,
          pc
        );


        pc.__remoteUser =
          remoteUser;


        pc.onicecandidate =
          async event => {

            if (
              !event.candidate
            ) {
              return;
            }


            await sendSignal({

              type: "ice",

              to:
                remoteUserId,

              from:
                state.user.id,

              candidate:
                event.candidate

            });

          };


        pc.ontrack =
          event => {

            const stream =
              event.streams &&
              event.streams[0]
                ? event.streams[0]
                : null;


            if (!stream) {
              return;
            }


            state.remoteStreams.set(
              remoteUserId,
              stream
            );


            renderRemoteTile(
              remoteUserId,
              remoteUser,
              stream
            );

          };


        pc.onconnectionstatechange =
          () => {

            const status =
              pc.connectionState;


            if (
              status === "failed" ||
              status === "closed" ||
              status === "disconnected"
            ) {

              if (
                status === "failed"
              ) {

                /*
                 * Небольшой retry.
                 */

                setTimeout(
                  async () => {

                    if (
                      state.currentRoom &&
                      !state.peers.has(
                        remoteUserId
                      )
                    ) {

                      await createPeerConnection(
                        remoteUserId,
                        remoteUser,
                        shouldInitiate(
                          state.user.id,
                          remoteUserId
                        )
                      );

                    }

                  },
                  1500
                );

              }

            }

          };


        pc.onnegotiationneeded =
          async () => {

            /*
             * Не делаем автоматический offer
             * здесь. Инициатор контролируется
             * shouldInitiate().
             */

          };


        await addLocalTracksToPeer(
          pc
        );


        if (
          initiate
        ) {

          try {

            const offer =
              await pc.createOffer();

            await pc.setLocalDescription(
              offer
            );


            await sendSignal({

              type: "offer",

              to:
                remoteUserId,

              from:
                state.user.id,

              description:
                pc.localDescription

            });

          } catch (error) {

            console.error(
              "Create offer error:",
              error
            );

          }

        }


        resolve(pc);

      }
    );

  }


  async function addLocalTracksToPeer(
    pc
  ) {

    if (
      !pc
    ) {
      return;
    }


    const stream =
      state.localStream;


    if (
      stream &&
      stream.getTracks().length
    ) {

      const existing =
        pc.getSenders()
          .map(
            sender =>
              sender.track
                ? sender.track.kind
                : null
          )
          .filter(Boolean);


      stream
        .getTracks()
        .forEach(track => {

          if (
            existing.includes(
              track.kind
            )
          ) {
            return;
          }


          try {

            pc.addTrack(
              track,
              stream
            );

          } catch (error) {

            console.warn(
              "addTrack error:",
              error
            );

          }

        });

      return;
    }


    /*
     * Если микрофон/камера пока не включены,
     * добавляем recvonly-трансиверы.
     *
     * Это позволяет подключиться к пользователю,
     * который включит медиа позже.
     */

    const transceivers =
      pc.getTransceivers();


    const hasAudio =
      transceivers.some(
        t =>
          t.receiver &&
          t.receiver.track &&
          t.receiver.track.kind ===
            "audio"
      );


    const hasVideo =
      transceivers.some(
        t =>
          t.receiver &&
          t.receiver.track &&
          t.receiver.track.kind ===
            "video"
      );


    if (!hasAudio) {

      try {

        pc.addTransceiver(
          "audio",
          {
            direction:
              "recvonly"
          }
        );

      } catch (error) {
        console.warn(error);
      }

    }


    if (!hasVideo) {

      try {

        pc.addTransceiver(
          "video",
          {
            direction:
              "recvonly"
          }
        );

      } catch (error) {
        console.warn(error);
      }

    }

  }


  async function sendSignal(
    payload
  ) {

    if (
      !state.roomChannel
    ) {
      return;
    }


    try {

      await state.roomChannel.send({

        type: "broadcast",

        event: "webrtc-signal",

        payload

      });

    } catch (error) {

      console.error(
        "WebRTC signal error:",
        error
      );

    }

  }


  async function handleSignal(
    signal
  ) {

    if (
      !signal ||
      !state.user
    ) {
      return;
    }


    if (
      signal.to !==
      state.user.id
    ) {
      return;
    }


    const remoteId =
      signal.from;


    if (
      !remoteId
    ) {
      return;
    }


    let pc =
      state.peers.get(
        remoteId
      );


    if (
      signal.type === "offer"
    ) {

      if (!pc) {

        pc =
          await createPeerConnection(
            remoteId,
            {
              userId:
                remoteId,

              nickname:
                "Участник",

              avatarUrl:
                ""
            },
            false
          );

      }


      try {

        await pc.setRemoteDescription(
          new RTCSessionDescription(
            signal.description
          )
        );


        const answer =
          await pc.createAnswer();


        await pc.setLocalDescription(
          answer
        );


        await sendSignal({

          type: "answer",

          to:
            remoteId,

          from:
            state.user.id,

          description:
            pc.localDescription

        });

      } catch (error) {

        console.error(
          "Offer handling error:",
          error
        );

      }

      return;
    }


    if (
      signal.type === "answer"
    ) {

      if (!pc) {
        return;
      }


      try {

        await pc.setRemoteDescription(
          new RTCSessionDescription(
            signal.description
          )
        );

      } catch (error) {

        console.error(
          "Answer handling error:",
          error
        );

      }

      return;
    }


    if (
      signal.type === "ice"
    ) {

      if (!pc) {
        return;
      }


      try {

        if (
          pc.remoteDescription
        ) {

          await pc.addIceCandidate(
            new RTCIceCandidate(
              signal.candidate
            )
          );

        } else {

          if (
            !state.pendingOffers.has(
              remoteId
            )
          ) {

            state.pendingOffers.set(
              remoteId,
              []
            );

          }


          state.pendingOffers
            .get(remoteId)
            .push(
              signal.candidate
            );

        }

      } catch (error) {

        console.warn(
          "ICE candidate error:",
          error
        );

      }

    }

  }


  /*
   * ---------------------------------------------------------
   * LOCAL MEDIA
   * ---------------------------------------------------------
   */

  async function ensureLocalStream(
    options
  ) {

    options =
      options || {};


    const wantAudio =
      !!options.audio;


    const wantVideo =
      !!options.video;


    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      throw new Error(
        "Браузер не поддерживает микрофон/камеру."
      );

    }


    const quality =
      state.videoQuality;


    const videoSize =
      quality === "1080p"
        ? {
            width: {
              ideal: 1920
            },
            height: {
              ideal: 1080
            }
          }
        : quality === "360p"
        ? {
            width: {
              ideal: 640
            },
            height: {
              ideal: 360
            }
          }
        : {
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          };


    const constraints = {

      audio:
        wantAudio
          ? (
              state.selectedMicId
                ? {
                    deviceId: {
                      exact:
                        state.selectedMicId
                    },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                  }
                : {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                  }
            )
          : false,

      video:
        wantVideo
          ? (
              state.selectedCameraId
                ? {
                    deviceId: {
                      exact:
                        state.selectedCameraId
                    },
                    ...videoSize
                  }
                : {
                    ...videoSize
                  }
            )
          : false

    };


    const stream =
      await navigator.mediaDevices
        .getUserMedia(
          constraints
        );


    if (
      !state.localStream
    ) {

      state.localStream =
        new MediaStream();

    }


    stream
      .getTracks()
      .forEach(track => {

        state.localStream.addTrack(
          track
        );

      });


    if (
      wantVideo
    ) {

      state.cameraStream =
        stream;

      state.isCameraEnabled =
        true;

    }


    if (
      wantAudio
    ) {

      state.isMicEnabled =
        true;

    }


    await syncLocalTracksToPeers();


    await updateRoomPresence();


    renderConferenceRoom();


    return stream;

  }


  async function syncLocalTracksToPeers() {

    if (
      !state.localStream
    ) {
      return;
    }


    for (
      const [
        remoteId,
        pc
      ]
      of state.peers
    ) {

      const senders =
        pc.getSenders();


      for (
        const track of
        state.localStream.getTracks()
      ) {

        const sender =
          senders.find(
            item =>
              item.track &&
              item.track.kind ===
                track.kind
          );


        if (sender) {

          try {

            await sender.replaceTrack(
              track
            );

          } catch (error) {

            console.warn(
              "replaceTrack error:",
              error
            );

          }

        } else {

          try {

            pc.addTrack(
              track,
              state.localStream
            );

          } catch (error) {

            console.warn(
              "addTrack error:",
              error
            );

          }

        }

      }


      /*
       * После добавления нового track
       * инициатор должен обновить SDP.
       */

      if (
        shouldInitiate(
          state.user.id,
          remoteId
        )
      ) {

        try {

          const offer =
            await pc.createOffer();

          await pc.setLocalDescription(
            offer
          );


          await sendSignal({

            type: "offer",

            to:
              remoteId,

            from:
              state.user.id,

            description:
              pc.localDescription

          });

        } catch (error) {

          console.warn(
            "Renegotiation error:",
            error
          );

        }

      }

    }

  }


  async function toggleMicrophone() {

    try {

      if (
        !state.localStream ||
        !state.localStream
          .getAudioTracks()
          .length
      ) {

        await ensureLocalStream({
          audio: true,
          video: false
        });

      }


      const tracks =
        state.localStream
          ? state.localStream
              .getAudioTracks()
          : [];


      if (!tracks.length) {
        return;
      }


      const next =
        !state.isMicEnabled;


      tracks.forEach(
        track => {
          track.enabled =
            next;
        }
      );


      state.isMicEnabled =
        next;


      await updateRoomPresence();


      renderConferenceRoom();

    } catch (error) {

      console.error(
        error
      );

      showMessage(
        "Не удалось получить доступ к микрофону: " +
        (
          error.message ||
          "доступ запрещен"
        ),
        "error"
      );

    }

  }


  async function toggleCamera() {

    try {

      if (
        !state.localStream ||
        !state.localStream
          .getVideoTracks()
          .length
      ) {

        await ensureLocalStream({
          audio: false,
          video: true
        });

      }


      const tracks =
        state.localStream
          ? state.localStream
              .getVideoTracks()
          : [];


      if (!tracks.length) {
        return;
      }


      const next =
        !state.isCameraEnabled;


      tracks.forEach(
        track => {
          track.enabled =
            next;
        }
      );


      state.isCameraEnabled =
        next;


      await updateRoomPresence();


      renderConferenceRoom();

    } catch (error) {

      console.error(
        error
      );

      showMessage(
        "Не удалось получить доступ к камере: " +
        (
          error.message ||
          "доступ запрещен"
        ),
        "error"
      );

    }

  }


  function stopLocalMedia() {

    if (
      state.localStream
    ) {

      state.localStream
        .getTracks()
        .forEach(
          track => {
            try {
              track.stop();
            } catch (error) {
              console.warn(error);
            }
          }
        );

    }


    state.localStream =
      null;

    state.cameraStream =
      null;

    state.isMicEnabled =
      false;

    state.isCameraEnabled =
      false;

  }


  /*
   * ---------------------------------------------------------
   * SCREEN SHARE
   * ---------------------------------------------------------
   */

  async function toggleScreenShare() {

    if (
      state.isScreenSharing
    ) {

      await stopScreenShare(
        true
      );

      return;
    }


    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices
        .getDisplayMedia
    ) {

      showMessage(
        "Демонстрация экрана не поддерживается этим браузером.",
        "error"
      );

      return;
    }


    try {

      const stream =
        await navigator.mediaDevices
          .getDisplayMedia({

            video: {
              frameRate: {
                ideal: 30
              }
            },

            audio: false

          });


      const track =
        stream.getVideoTracks()[0];


      if (!track) {
        return;
      }


      state.screenStream =
        stream;

      state.isScreenSharing =
        true;


      track.onended =
        async () => {

          await stopScreenShare(
            true
          );

        };


      for (
        const [
          remoteId,
          pc
        ]
        of state.peers
      ) {

        const sender =
          pc.getSenders()
            .find(
              item =>
                item.track &&
                item.track.kind ===
                  "video"
            );


        if (sender) {

          try {

            await sender.replaceTrack(
              track
            );

          } catch (error) {

            console.warn(
              error
            );

          }

        } else {

          try {

            pc.addTrack(
              track,
              stream
            );

          } catch (error) {

            console.warn(
              error
            );

          }

        }


        if (
          shouldInitiate(
            state.user.id,
            remoteId
          )
        ) {

          try {

            const offer =
              await pc.createOffer();

            await pc.setLocalDescription(
              offer
            );


            await sendSignal({

              type: "offer",

              to:
                remoteId,

              from:
                state.user.id,

              description:
                pc.localDescription

            });

          } catch (error) {

            console.warn(
              error
            );

          }

        }

      }


      await updateRoomPresence();


      renderConferenceRoom();

    } catch (error) {

      console.error(
        "Screen share error:",
        error
      );

      showMessage(
        "Демонстрация экрана не запущена.",
        "error"
      );

    }

  }


  async function stopScreenShare(
    rerender
  ) {

    if (
      state.screenStream
    ) {

      state.screenStream
        .getTracks()
        .forEach(
          track => {
            try {
              track.stop();
            } catch (error) {
              console.warn(error);
            }
          }
        );

    }


    state.screenStream =
      null;

    state.isScreenSharing =
      false;


    /*
     * Возвращаем камеру,
     * если она была включена.
     */

    const cameraTrack =
      state.cameraStream &&
      state.cameraStream
        .getVideoTracks
        ? state.cameraStream
            .getVideoTracks()[0]
        : null;


    for (
      const [
        remoteId,
        pc
      ]
      of state.peers
    ) {

      const sender =
        pc.getSenders()
          .find(
            item =>
              item.track &&
              item.track.kind ===
                "video"
          );


      if (
        sender &&
        cameraTrack
      ) {

        try {

          await sender.replaceTrack(
            cameraTrack
          );

        } catch (error) {

          console.warn(
            error
          );

        }

      }


      if (
        shouldInitiate(
          state.user.id,
          remoteId
        )
      ) {

        try {

          const offer =
            await pc.createOffer();

          await pc.setLocalDescription(
            offer
          );


          await sendSignal({

            type: "offer",

            to:
              remoteId,

            from:
              state.user.id,

            description:
              pc.localDescription

          });

        } catch (error) {

          console.warn(
            error
          );

        }

      }

    }


    await updateRoomPresence();


    if (rerender) {
      renderConferenceRoom();
    }

  }


  /*
   * ---------------------------------------------------------
   * ROOM PRESENCE UPDATE
   * ---------------------------------------------------------
   */

  async function updateRoomPresence() {

    if (
      !state.roomChannel ||
      !state.user
    ) {
      return;
    }


    try {

      await state.roomChannel.track({

        userId:
          state.user.id,

        nickname:
          getNickname(
            state.profile
          ),

        avatarUrl:
          getAvatarUrl(
            state.profile
          ),

        status:
          state.profile &&
          state.profile.status
            ? state.profile.status
            : "Онлайн",

        mic:
          state.isMicEnabled,

        camera:
          state.isCameraEnabled,

        screen:
          state.isScreenSharing

      });

    } catch (error) {

      console.warn(
        "Room presence update error:",
        error
      );

    }


    await updateLobbyPresence();
  }


  /*
   * ---------------------------------------------------------
   * ROOM UI
   * ---------------------------------------------------------
   */

  function renderConferenceRoom() {

    const root =
      getRoot();

    if (!root) {
      return;
    }


    if (
      !state.currentRoom
    ) {

      renderLobby();

      return;
    }


    const participants =
      getRoomPresenceUsers();


    const room =
      state.currentRoom;


    root.innerHTML = `

      <div class="conference-room-view">

        <div class="conference-room-top">

          <div class="conference-room-heading">

            <strong>
              ${escapeHtml(room.name)}
            </strong>

            <span>
              ${
                escapeHtml(
                  room.description ||
                  "Конференция"
                )
              }
              ·
              участников:
              ${participants.length}
            </span>

          </div>


          <div class="conference-room-top-actions">

            <button
              type="button"
              class="conference-button"
              id="conference-room-participants-button"
            >
              👥 ${participants.length}
            </button>

            <button
              type="button"
              class="conference-button danger"
              id="conference-leave-button"
            >
              Выйти
            </button>

          </div>

        </div>


        <div
          id="conference-stage"
          class="conference-stage"
        ></div>


        <div class="conference-controls">

          <button
            type="button"
            id="conference-mic-button"
            class="conference-control ${
              state.isMicEnabled
                ? "active"
                : "off"
            }"
            title="Микрофон"
          >
            ${
              state.isMicEnabled
                ? "🎙"
                : "🔇"
            }
          </button>


          <button
            type="button"
            id="conference-camera-button"
            class="conference-control ${
              state.isCameraEnabled
                ? "active"
                : "off"
            }"
            title="Камера"
          >
            ${
              state.isCameraEnabled
                ? "📹"
                : "📷"
            }
          </button>


          <button
            type="button"
            id="conference-screen-button"
            class="conference-control ${
              state.isScreenSharing
                ? "active"
                : ""
            }"
            title="Демонстрация экрана"
          >
            🖥
          </button>


          <button
            type="button"
            id="conference-settings-button"
            class="conference-control"
            title="Настройки устройств"
          >
            ⚙
          </button>


          <button
            type="button"
            id="conference-room-leave-bottom"
            class="conference-control leave"
          >
            Выйти из конференции
          </button>

        </div>


        <div class="conference-settings">

          <div
            id="conference-settings-panel"
            class="conference-settings-panel"
          >

            <label class="conference-setting">

              <span>
                МИКРОФОН
              </span>

              <select
                id="conference-mic-select"
                class="conference-select"
              >
                <option value="">
                  Автоматически
                </option>
              </select>

            </label>


            <label class="conference-setting">

              <span>
                КАМЕРА
              </span>

              <select
                id="conference-camera-select"
                class="conference-select"
              >
                <option value="">
                  Автоматически
                </option>
              </select>

            </label>


            <label class="conference-setting">

              <span>
                КАЧЕСТВО ВИДЕО
              </span>

              <select
                id="conference-quality-select"
                class="conference-select"
              >

                <option value="360p">
                  360p
                </option>

                <option
                  value="720p"
                  selected
                >
                  720p
                </option>

                <option value="1080p">
                  1080p
                </option>

              </select>

            </label>

          </div>

        </div>

      </div>

    `;


    renderParticipantsOnStage(
      participants
    );


    bindConferenceRoomEvents();


    populateDevices();
  }


  function renderParticipantsOnStage(
    participants
  ) {

    const stage =
      document.getElementById(
        "conference-stage"
      );

    if (!stage) {
      return;
    }


    stage.innerHTML = "";


    /*
     * Сначала текущий пользователь.
     */

    const self =
      participants.find(
        user =>
          user.userId ===
          state.user.id
      );


    if (self) {

      createVideoTile(
        self.userId,
        self,
        state.localStream,
        true
      );

    } else {

      createVideoTile(
        state.user.id,
        {
          userId:
            state.user.id,

          nickname:
            getNickname(
              state.profile
            ),

          avatarUrl:
            getAvatarUrl(
              state.profile
            ),

          mic:
            state.isMicEnabled,

          camera:
            state.isCameraEnabled,

          screen:
            state.isScreenSharing

        },
        state.localStream,
        true
      );

    }


    /*
     * Затем остальные.
     */

    participants
      .filter(
        user =>
          user.userId !==
          state.user.id
      )
      .forEach(
        user => {

          const stream =
            state.remoteStreams.get(
              user.userId
            ) || null;


          createVideoTile(
            user.userId,
            user,
            stream,
            false
          );

        }
      );

  }


  function createVideoTile(
    userId,
    user,
    stream,
    local
  ) {

    const stage =
      document.getElementById(
        "conference-stage"
      );

    if (!stage) {
      return;
    }


    const tile =
      document.createElement("div");

    tile.className =
      "conference-video-tile";


    tile.id =
      "conference-tile-" +
      userId;


    if (
      !stream
    ) {

      tile.classList.add(
        "audio-only"
      );

    }


    const video =
      document.createElement("video");


    video.autoplay =
      true;

    video.playsInline =
      true;

    video.muted =
      !!local;


    if (
      stream
    ) {

      video.srcObject =
        stream;

    }


    const fallback =
      document.createElement("div");

    fallback.className =
      "conference-avatar-fallback";


    const avatar =
      user.avatarUrl;


    if (avatar) {

      fallback.innerHTML =
        `<img
          src="${escapeHtml(avatar)}"
          alt=""
          style="
            width:90px;
            height:90px;
            border-radius:50%;
            object-fit:cover;
          "
          onerror="this.outerHTML='🤖';"
        >`;

    } else {

      fallback.textContent =
        "🤖";

    }


    const label =
      document.createElement("div");

    label.className =
      "conference-video-label";


    const nickname =
      user.nickname ||
      "Player";


    const status =
      document.createElement("span");

    status.textContent =
      local
        ? nickname + " · Вы"
        : nickname;


    const icons =
      document.createElement("span");

    icons.className =
      "conference-video-status";


    if (
      user.mic === false
    ) {

      icons.innerHTML +=
        `<span class="conference-mic-off">🔇</span>`;

    } else {

      icons.innerHTML +=
        `<span>🎙</span>`;

    }


    if (
      user.camera
    ) {

      icons.innerHTML +=
        `<span>📹</span>`;

    }


    if (
      user.screen
    ) {

      icons.innerHTML +=
        `<span>🖥</span>`;

    }


    label.appendChild(
      status
    );

    label.appendChild(
      icons
    );


    tile.appendChild(
      video
    );

    tile.appendChild(
      fallback
    );

    tile.appendChild(
      label
    );


    if (
      stream
    ) {

      video
        .play()
        .catch(
          () => {}
        );

      fallback.style.display =
        "none";

    }


    stage.appendChild(
      tile
    );

  }


  function renderRemoteTile(
    userId,
    user,
    stream
  ) {

    if (
      !state.currentRoom
    ) {
      return;
    }


    const existing =
      document.getElementById(
        "conference-tile-" +
        userId
      );


    if (
      existing
    ) {

      const video =
        existing.querySelector(
          "video"
        );


      if (video) {

        video.srcObject =
          stream;

        video
          .play()
          .catch(
            () => {}
          );

      }


      existing.classList.remove(
        "audio-only"
      );


      const fallback =
        existing.querySelector(
          ".conference-avatar-fallback"
        );


      if (fallback) {

        fallback.style.display =
          "none";

      }


      return;
    }


    createVideoTile(
      userId,
      user,
      stream,
      false
    );

  }


  function removeRemoteTile(
    userId
  ) {

    const tile =
      document.getElementById(
        "conference-tile-" +
        userId
      );


    if (
      tile
    ) {

      tile.remove();

    }


    state.remoteStreams.delete(
      userId
    );

  }


  function removeRemoteTiles() {

    const stage =
      document.getElementById(
        "conference-stage"
      );

    if (
      stage
    ) {

      stage.innerHTML =
        "";

    }

    state.remoteStreams.clear();

  }


  function bindConferenceRoomEvents() {

    const leave =
      document.getElementById(
        "conference-leave-button"
      );

    const leaveBottom =
      document.getElementById(
        "conference-room-leave-bottom"
      );


    if (leave) {

      leave.addEventListener(
        "click",
        async () => {

          await leaveRoom();

        }
      );

    }


    if (leaveBottom) {

      leaveBottom.addEventListener(
        "click",
        async () => {

          await leaveRoom();

        }
      );

    }


    const mic =
      document.getElementById(
        "conference-mic-button"
      );


    if (mic) {

      mic.addEventListener(
        "click",
        toggleMicrophone
      );

    }


    const camera =
      document.getElementById(
        "conference-camera-button"
      );


    if (camera) {

      camera.addEventListener(
        "click",
        toggleCamera
      );

    }


    const screen =
      document.getElementById(
        "conference-screen-button"
      );


    if (screen) {

      screen.addEventListener(
        "click",
        toggleScreenShare
      );

    }


    const settings =
      document.getElementById(
        "conference-settings-button"
      );


    if (settings) {

      settings.addEventListener(
        "click",
        () => {

          const panel =
            document.getElementById(
              "conference-settings-panel"
            );

          if (panel) {

            panel.classList.toggle(
              "open"
            );

          }

        }
      );

    }


    const quality =
      document.getElementById(
        "conference-quality-select"
      );


    if (quality) {

      quality.value =
        state.videoQuality;


      quality.addEventListener(
        "change",
        event => {

          state.videoQuality =
            event.target.value;

        }
      );

    }


    const micSelect =
      document.getElementById(
        "conference-mic-select"
      );


    if (micSelect) {

      micSelect.value =
        state.selectedMicId;


      micSelect.addEventListener(
        "change",
        event => {

          state.selectedMicId =
            event.target.value;

        }
      );

    }


    const cameraSelect =
      document.getElementById(
        "conference-camera-select"
      );


    if (cameraSelect) {

      cameraSelect.value =
        state.selectedCameraId;


      cameraSelect.addEventListener(
        "change",
        event => {

          state.selectedCameraId =
            event.target.value;

        }
      );

    }

  }


  /*
   * ---------------------------------------------------------
   * DEVICES
   * ---------------------------------------------------------
   */

  async function populateDevices() {

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      return;
    }


    try {

      const devices =
        await navigator.mediaDevices
          .enumerateDevices();


      const micSelect =
        document.getElementById(
          "conference-mic-select"
        );


      const cameraSelect =
        document.getElementById(
          "conference-camera-select"
        );


      if (
        micSelect
      ) {

        micSelect.innerHTML =
          `
            <option value="">
              Автоматически
            </option>
          `;


        devices
          .filter(
            device =>
              device.kind ===
              "audioinput"
          )
          .forEach(
            device => {

              const option =
                document.createElement(
                  "option"
                );

              option.value =
                device.deviceId;

              option.textContent =
                device.label ||
                "Микрофон";

              micSelect.appendChild(
                option
              );

            }
          );


        micSelect.value =
          state.selectedMicId;

      }


      if (
        cameraSelect
      ) {

        cameraSelect.innerHTML =
          `
            <option value="">
              Автоматически
            </option>
          `;


        devices
          .filter(
            device =>
              device.kind ===
              "videoinput"
          )
          .forEach(
            device => {

              const option =
                document.createElement(
                  "option"
                );

              option.value =
                device.deviceId;

              option.textContent =
                device.label ||
                "Камера";

              cameraSelect.appendChild(
                option
              );

            }
          );


        cameraSelect.value =
          state.selectedCameraId;

      }

    } catch (error) {

      console.warn(
        "Device enumeration error:",
        error
      );

    }

  }


  /*
   * ---------------------------------------------------------
   * INITIALIZATION
   * ---------------------------------------------------------
   */

  async function initialize() {

    if (
      state.initialized
    ) {
      return;
    }


    state.initialized =
      true;


    injectStyles();


    /*
     * Кнопки открытия конференции.
     */

    document
      .querySelectorAll(
        ".conference-open-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            await openModal();

          }
        );

      });


    /*
     * Закрытие модального окна.
     */

    document
      .querySelectorAll(
        '[data-close-modal="conference-modal"]'
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            if (
              state.currentRoom
            ) {

              await leaveRoom(
                false
              );

            }

            closeModal();

          }
        );

      });


    /*
     * Если пользователь кликает по фону.
     */

    const modal =
      document.getElementById(
        "conference-modal"
      );


    if (modal) {

      modal.addEventListener(
        "click",
        async event => {

          if (
            event.target ===
            modal
          ) {

            if (
              state.currentRoom
            ) {

              await leaveRoom(
                false
              );

            }

            closeModal();

          }

        }
      );

    }


    /*
     * Загружаем сессию.
     */

    await loadSession();


    if (
      state.user
    ) {

      await loadProfile();

      await startLobbyPresence();

    }


    /*
     * Отслеживаем вход/выход.
     */

    if (
      db &&
      db.auth
    ) {

      db.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {

          state.session =
            session || null;

          state.user =
            session
              ? session.user
              : null;


          if (
            state.user
          ) {

            await loadProfile();

            await startLobbyPresence();

          } else {

            state.profile =
              null;

            if (
              state.currentRoom
            ) {

              await leaveRoom(
                false
              );

            }


            if (
              state.lobbyChannel
            ) {

              try {

                await db.removeChannel(
                  state.lobbyChannel
                );

              } catch (error) {
                console.warn(error);
              }

            }


            state.lobbyChannel =
              null;

            state.lobbyReady =
              false;

          }


          renderLobby();

        }
      );

    }


    /*
     * Периодически обновляем список комнат.
     *
     * Само присутствие работает через Realtime,
     * поэтому polling нужен только для новых комнат.
     */

    state.pollingTimer =
      window.setInterval(
        async () => {

          if (
            state.user
          ) {

            await loadRooms();

          }

        },
        ROOM_POLL_INTERVAL
      );

  }


  /*
   * ---------------------------------------------------------
   * PAGE UNLOAD
   * ---------------------------------------------------------
   */

  window.addEventListener(
    "beforeunload",
    () => {

      try {

        if (
          state.localStream
        ) {

          state.localStream
            .getTracks()
            .forEach(
              track => track.stop()
            );

        }

      } catch (error) {
        console.warn(error);
      }

    }
  );


  /*
   * ---------------------------------------------------------
   * GLOBAL API
   * ---------------------------------------------------------
   */

  window.GamePlatformConference = {

    open:
      openModal,

    close:
      closeModal,

    joinRoom:
      joinRoom,

    leaveRoom:
      leaveRoom,

    refresh:
      loadRooms,

    getState:
      () => state

  };


  /*
   * ---------------------------------------------------------
   * START
   * ---------------------------------------------------------
   */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );

  } else {

    initialize();

  }

})();
