"use strict";


/*
====================================================
GAME PLATFORM
HOME HUB
VERSION 1.4.0
====================================================

Главная страница:

- компактная навигация слева;
- центральная заставка;
- профиль;
- онлайн;
- новости;
- YouTube;
- Twitch.

Сейчас данные профиля и онлайн локальные.

Позже онлайн будет подключён к Supabase Realtime,
а профиль — к Supabase Auth/Profiles.

====================================================
*/


const APP_VERSION = "1.4.0";


const DEFAULT_PROFILE = {

    nickname:
        "Player",

    status:
        "Добро пожаловать на Game Platform"

};


let profile =
    loadProfile();


/*
====================================================
INITIALIZATION
====================================================
*/


document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderProfile();

        renderOnline();

        updatePageVersion();

    }
);


/*
====================================================
PROFILE
====================================================
*/


function loadProfile() {

    try {

        const raw =
            localStorage.getItem(
                "game_platform_profile"
            );


        if (!raw) {

            return {
                ...DEFAULT_PROFILE
            };

        }


        const parsed =
            JSON.parse(raw);


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
            "Не удалось загрузить профиль:",
            error
        );


        return {
            ...DEFAULT_PROFILE
        };

    }

}


function saveProfileToStorage() {

    localStorage.setItem(

        "game_platform_profile",

        JSON.stringify(profile)

    );

}


function renderProfile() {

    const nickname =
        profile.nickname ||
        "Player";


    const status =
        profile.status ||
        DEFAULT_PROFILE.status;


    const firstLetter =
        nickname
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "P";


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
            firstLetter;

    }


    if (headerNickname) {

        headerNickname.textContent =
            nickname;

    }


    if (headerAvatar) {

        headerAvatar.textContent =
            firstLetter;

    }

}


/*
====================================================
PROFILE WINDOW
====================================================
*/


function openProfile() {

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


    modal.hidden =
        false;

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

        modal.hidden =
            true;

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


    profile = {

        nickname:
            nickname ||
            "Player",

        status:
            status ||
            DEFAULT_PROFILE.status

    };


    saveProfileToStorage();

    renderProfile();

    closeProfileModal();

}


/*
====================================================
ONLINE
====================================================

Пока настоящая межпользовательская синхронизация
не подключена, список содержит текущий локальный
профиль.

После подключения Supabase Realtime здесь будет
единый список всех пользователей онлайн.

====================================================
*/


function getOnlinePlayers() {

    return [

        {

            nickname:
                profile.nickname ||
                "Player",

            status:
                "Сейчас на платформе"

        }

    ];

}


function renderOnline() {

    const players =
        getOnlinePlayers();


    const count =
        players.length;


    const headerCount =
        document.getElementById(
            "online-header-count"
        );


    const sideCount =
        document.getElementById(
            "online-side-count"
        );


    const heroCount =
        document.getElementById(
            "hero-online-count"
        );


    const modalCount =
        document.getElementById(
            "online-modal-count"
        );


    if (headerCount) {

        headerCount.textContent =
            count;

    }


    if (sideCount) {

        sideCount.textContent =
            count;

    }


    if (heroCount) {

        heroCount.textContent =
            count;

    }


    if (modalCount) {

        modalCount.textContent =
            count === 1
                ? "1 игрок"
                : `${count} игроков`;

    }

}


/*
====================================================
ONLINE PLAYERS WINDOW
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


    if (!modal || !list) {
        return;
    }


    const players =
        getOnlinePlayers();


    list.innerHTML =
        "";


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
                player.nickname
                    .trim()
                    .charAt(0)
                    .toUpperCase() ||
                "P";


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


            const indicator =
                document.createElement(
                    "span"
                );


            indicator.className =
                "player-online-indicator";


            details.appendChild(
                nickname
            );


            details.appendChild(
                status
            );


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


    modal.hidden =
        false;

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

        modal.hidden =
            true;

    }

}


/*
====================================================
NAVIGATION
====================================================
*/


function openPage(page) {

    document.body.animate(

        [

            {
                opacity:
                    1,

                transform:
                    "scale(1)"

            },

            {

                opacity:
                    0,

                transform:
                    "scale(1.015)"

            }

        ],

        {

            duration:
                260,

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
*/


function openSocial(type) {

    let url =
        "";


    if (
        type === "youtube"
    ) {

        url =
            "https://www.youtube.com/";

    }


    if (
        type === "twitch"
    ) {

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
VERSION
====================================================
*/


function updatePageVersion() {

    const versionElement =
        document.querySelector(
            ".site-version"
        );


    if (versionElement) {

        versionElement.textContent =
            "v" +
            APP_VERSION;

    }

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
