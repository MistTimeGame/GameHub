/*
====================================================
GAME PLATFORM
MAIN HOME HUB
VERSION 1.3.0
====================================================

Сейчас это frontend-шаблон.

Главная страница содержит:

- профиль;
- онлайн;
- игры;
- новости;
- YouTube;
- Twitch.

Глобальный онлайн всех пользователей будет подключён
после появления Auth + Realtime/Presence.

====================================================
*/


"use strict";


const APP_VERSION = "1.3.0";


/*
====================================================
LOCAL PROFILE
====================================================
*/


const DEFAULT_PROFILE = {
    nickname: "Player",
    status: "Добро пожаловать на Game Platform"
};


let profile = loadProfile();


/*
====================================================
 INITIALIZATION
====================================================
*/


document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderProfile();

        renderOnlineCounter();

    }
);


/*
====================================================
 PROFILE STORAGE
====================================================
*/


function loadProfile() {

    try {

        const saved =
            localStorage.getItem(
                "game_platform_profile"
            );


        if (!saved) {

            return {
                ...DEFAULT_PROFILE
            };
        }


        const parsed =
            JSON.parse(saved);


        return {
            nickname:
                parsed.nickname ||
                DEFAULT_PROFILE.nickname,

            status:
                parsed.status ||
                DEFAULT_PROFILE.status
        };

    } catch (error) {

        console.error(
            "Ошибка загрузки профиля:",
            error
        );


        return {
            ...DEFAULT_PROFILE
        };
    }
}


function saveProfileData() {

    localStorage.setItem(
        "game_platform_profile",
        JSON.stringify(profile)
    );
}


/*
====================================================
 PROFILE RENDER
====================================================
*/


function renderProfile() {

    const nickname =
        profile.nickname || "Player";


    const status =
        profile.status ||
        DEFAULT_PROFILE.status;


    const avatarLetter =
        nickname
            .trim()
            .charAt(0)
            .toUpperCase() || "P";


    const profileName =
        document.getElementById(
            "profile-name"
        );


    const profileStatus =
        document.getElementById(
            "profile-status"
        );


    const profileAvatar =
        document.getElementById(
            "profile-avatar"
        );


    const headerNickname =
        document.getElementById(
            "header-nickname"
        );


    const headerAvatar =
        document.getElementById(
            "header-avatar"
        );


    if (profileName) {

        profileName.textContent =
            nickname;
    }


    if (profileStatus) {

        profileStatus.textContent =
            status;
    }


    if (profileAvatar) {

        profileAvatar.textContent =
            avatarLetter;
    }


    if (headerNickname) {

        headerNickname.textContent =
            nickname;
    }


    if (headerAvatar) {

        headerAvatar.textContent =
            avatarLetter;
    }
}


/*
====================================================
 PROFILE MODAL
====================================================
*/


function openProfile() {

    openProfileEditor();

}


function openProfileEditor() {

    const modal =
        document.getElementById(
            "profile-modal"
        );


    const nicknameInput =
        document.getElementById(
            "nickname-input"
        );


    const statusInput =
        document.getElementById(
            "status-input"
        );


    if (!modal) {
        return;
    }


    if (nicknameInput) {

        nicknameInput.value =
            profile.nickname;
    }


    if (statusInput) {

        statusInput.value =
            profile.status;
    }


    modal.hidden = false;

}


function closeProfileModal(event) {

    if (
        event &&
        event.target !== event.currentTarget
    ) {

        return;
    }


    const modal =
        document.getElementById(
            "profile-modal"
        );


    if (modal) {

        modal.hidden = true;
    }
}


function saveProfile() {

    const nicknameInput =
        document.getElementById(
            "nickname-input"
        );


    const statusInput =
        document.getElementById(
            "status-input"
        );


    const nickname =
        nicknameInput
            ? nicknameInput.value.trim()
            : "";


    const status =
        statusInput
            ? statusInput.value.trim()
            : "";


    profile.nickname =
        nickname || "Player";


    profile.status =
        status ||
        DEFAULT_PROFILE.status;


    saveProfileData();

    renderProfile();

    closeProfileModal();

}


/*
====================================================
 ONLINE SYSTEM — FRONTEND PROTOTYPE
====================================================

Пока backend отсутствует, глобальный список игроков
невозможно честно получить со всех устройств.

Поэтому интерфейс работает с текущим локальным
пользователем.

После подключения Auth + Realtime список будет
заменён реальными пользователями платформы.
====================================================
*/


function getOnlinePlayers() {

    const nickname =
        profile.nickname ||
        "Player";


    return [

        {
            nickname: nickname,
            status: "Сейчас на платформе"
        }

    ];

}


function renderOnlineCounter() {

    const players =
        getOnlinePlayers();


    const count =
        document.getElementById(
            "online-count"
        );


    if (count) {

        count.textContent =
            players.length;
    }

}


/*
====================================================
 ONLINE MODAL
====================================================
*/


function openOnlinePlayers() {

    const modal =
        document.getElementById(
            "online-modal"
        );


    const list =
        document.getElementById(
            "players-list"
        );


    const modalCount =
        document.getElementById(
            "online-modal-count"
        );


    if (!modal || !list) {
        return;
    }


    const players =
        getOnlinePlayers();


    list.innerHTML = "";


    players.forEach(
        player => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "player-row";


            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "player-avatar";


            avatar.textContent =
                (
                    player.nickname
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                ) || "P";


            const details =
                document.createElement(
                    "div"
                );


            details.className =
                "player-details";


            const nickname =
                document.createElement(
                    "div"
                );


            nickname.className =
                "player-nickname";


            nickname.textContent =
                player.nickname;


            const status =
                document.createElement(
                    "div"
                );


            status.className =
                "player-status";


            status.textContent =
                player.status;


            details.appendChild(
                nickname
            );


            details.appendChild(
                status
            );


            const indicator =
                document.createElement(
                    "span"
                );


            indicator.className =
                "player-online-indicator";


            row.appendChild(
                avatar
            );


            row.appendChild(
                details
            );


            row.appendChild(
                indicator
            );


            list.appendChild(
                row
            );

        }
    );


    if (modalCount) {

        modalCount.textContent =
            players.length === 1
                ? "1 игрок"
                : `${players.length} игроков`;
    }


    modal.hidden = false;

}


function closeOnlinePlayers(event) {

    if (
        event &&
        event.target !== event.currentTarget
    ) {

        return;
    }


    const modal =
        document.getElementById(
            "online-modal"
        );


    if (modal) {

        modal.hidden = true;
    }

}


/*
====================================================
 PAGE NAVIGATION
====================================================
*/


function openPage(page) {

    document.body.animate(

        [
            {
                opacity: 1,
                transform:
                    "scale(1)"
            },

            {
                opacity: 0,
                transform:
                    "scale(1.02)"
            }

        ],

        {
            duration: 260,
            easing:
                "cubic-bezier(.4,0,.2,1)",
            fill:
                "forwards"
        }

    );


    setTimeout(
        () => {

            window.location.href =
                page;

        },
        240
    );

}


/*
====================================================
 SOCIAL LINKS
====================================================

Здесь пока стоят общие страницы сервисов.
Позже заменим на официальные ссылки платформы/
канала Game Platform.
====================================================
*/


function openSocial(type) {

    let url = "";


    if (type === "youtube") {

        url =
            "https://www.youtube.com/";

    }


    if (type === "twitch") {

        url =
            "https://www.twitch.tv/";

    }


    if (!url) {
        return;
    }


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}


/*
====================================================
 ESCAPE
====================================================
*/


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeOnlinePlayers();
            closeProfileModal();

        }

    }
);
