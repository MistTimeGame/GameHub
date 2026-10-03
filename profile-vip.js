/* =========================================================
   GAME PLATFORM — PROFILE + VIP I–XII
   profile-vip.js

   Совместим с:
   - vip_profile.sql
   - profile-vip.css
   - Supabase JS v2

   Возможные способы открытия:

   openVipProfile();
   openVipProfile(userId);
   window.openVipProfile(userId);

   Если userId не указан — открывается профиль текущего
   авторизованного пользователя.
========================================================= */

(function () {
    'use strict';

    /* =====================================================
       НАСТРОЙКИ
    ===================================================== */

    const CONFIG = {
        profilesTable: 'profiles',
        vipLevelsTable: 'vip_levels',
        vipManagersTable: 'vip_managers',

        vipInfoFunction: 'get_my_vip_info',
        setVipFunction: 'set_vip_level',

        avatarBucket: 'avatars',

        maxAvatarSize: 8 * 1024 * 1024,

        allowedAvatarTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ]
    };

    /* =====================================================
       СОСТОЯНИЕ
    ===================================================== */

    const state = {
        initialized: false,
        currentUser: null,
        viewedUserId: null,
        profile: null,
        vipLevels: [],
        isVipManager: false,
        activeTab: 'profile',
        avatarFile: null,
        avatarPreview: null,
        loading: false,
        saving: false,
        vipSaving: false
    };

    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabaseClient() {
        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === 'function'
        ) {
            return window.supabaseClient;
        }

        if (
            window.supabase &&
            typeof window.supabase.from === 'function'
        ) {
            return window.supabase;
        }

        console.error(
            '[PROFILE VIP] Не найден Supabase client. ' +
            'Ожидается window.supabaseClient или window.supabase.'
        );

        return null;
    }

    function getClientOrThrow() {
        const client = getSupabaseClient();

        if (!client) {
            throw new Error(
                'Supabase client не найден. ' +
                'Подключи Supabase до profile-vip.js.'
            );
        }

        return client;
    }

    /* =====================================================
       УТИЛИТЫ
    ===================================================== */

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    function normalizeText(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value).trim();
    }

    function getRomanNumber(number) {
        const roman = [
            '',
            'I',
            'II',
            'III',
            'IV',
            'V',
            'VI',
            'VII',
            'VIII',
            'IX',
            'X',
            'XI',
            'XII'
        ];

        const n = Number(number) || 0;

        return roman[n] || String(n);
    }

    function getVipTitle(level) {
        const n = Number(level) || 0;

        if (n <= 0) {
            return 'Обычный профиль';
        }

        return 'VIP ' + getRomanNumber(n);
    }

    function getCurrentVipLevel() {
        return Number(state.profile?.vip_level || 0);
    }

    function isOwnProfile() {
        return Boolean(
            state.currentUser &&
            state.viewedUserId &&
            state.currentUser.id === state.viewedUserId
        );
    }

    function showBrowserMessage(message, type) {
        const text = normalizeText(message);

        if (!text) {
            return;
        }

        if (typeof window.showToast === 'function') {
            window.showToast(text, type || 'info');
            return;
        }

        if (typeof window.showNotification === 'function') {
            window.showNotification(text, type || 'info');
            return;
        }

        if (typeof window.notify === 'function') {
            window.notify(text, type || 'info');
            return;
        }

        console.log('[PROFILE VIP]', text);
    }

    function formatAge(age) {
        const n = Number(age);

        if (!Number.isFinite(n) || n < 1) {
            return 'Не указан';
        }

        return String(n);
    }

    function formatCity(city) {
        return normalizeText(city) || 'Не указан';
    }

    function formatAbout(about) {
        return normalizeText(about);
    }

    function getDisplayName(profile) {
        if (!profile) {
            return 'Пользователь';
        }

        return (
            normalizeText(profile.display_name) ||
            normalizeText(profile.username) ||
            'Пользователь'
        );
    }

    function getUsername(profile) {
        if (!profile) {
            return '';
        }

        return normalizeText(profile.username);
    }

    function getAvatarUrl(profile) {
        if (!profile) {
            return '';
        }

        return normalizeText(profile.avatar_url);
    }

    /* =====================================================
       ИНИЦИАЛИЗАЦИЯ
    ===================================================== */

    function ensureStylesLoaded() {
        const alreadyLoaded = Array.from(
            document.querySelectorAll('link[rel="stylesheet"]')
        ).some(function (link) {
            return (
                link.href &&
                link.href.indexOf('profile-vip.css') !== -1
            );
        });

        if (alreadyLoaded) {
            return;
        }

        const link = document.createElement('link');

        link.rel = 'stylesheet';
        link.href = 'profile-vip.css';

        document.head.appendChild(link);
    }

    function init() {
        if (state.initialized) {
            return;
        }

        ensureStylesLoaded();
        createOverlay();
        bindGlobalEvents();

        state.initialized = true;
    }

    /* =====================================================
       СОЗДАНИЕ OVERLAY
    ===================================================== */

    function createOverlay() {
        if (document.getElementById('vipProfileOverlay')) {
            return;
        }

        const overlay = document.createElement('div');

        overlay.id = 'vipProfileOverlay';
        overlay.className = 'vip-profile-overlay';
        overlay.hidden = true;

        overlay.innerHTML = `
            <div
                class="vip-profile-window"
                role="dialog"
                aria-modal="true"
                aria-labelledby="vipProfileNickname"
            >
                <button
                    type="button"
                    class="vip-profile-close"
                    id="vipProfileClose"
                    aria-label="Закрыть"
                    title="Закрыть"
                >×</button>

                <div id="vipProfileContent">
                    <div class="vip-loading">
                        Загрузка профиля...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    function getOverlay() {
        return document.getElementById('vipProfileOverlay');
    }

    function getContent() {
        return document.getElementById('vipProfileContent');
    }

    /* =====================================================
       ГЛОБАЛЬНЫЕ СОБЫТИЯ
    ===================================================== */

    function bindGlobalEvents() {
        document.addEventListener('click', function (event) {
            const openButton = event.target.closest(
                '[data-open-vip-profile]'
            );

            if (openButton) {
                const userId =
                    openButton.getAttribute(
                        'data-open-vip-profile'
                    );

                openVipProfile(userId || null);
                return;
            }

            const tabButton = event.target.closest(
                '[data-vip-tab]'
            );

            if (tabButton) {
                const tab = tabButton.getAttribute(
                    'data-vip-tab'
                );

                setActiveTab(tab);
                return;
            }

            const closeButton = event.target.closest(
                '#vipProfileClose'
            );

            if (closeButton) {
                closeVipProfile();
                return;
            }

            const saveButton = event.target.closest(
                '#vipSaveProfile'
            );

            if (saveButton) {
                saveProfile();
                return;
            }

            const uploadButton = event.target.closest(
                '#vipChooseAvatar'
            );

            if (uploadButton) {
                const input = document.getElementById(
                    'vipAvatarInput'
                );

                if (input) {
                    input.click();
                }

                return;
            }

            const removeAvatarButton = event.target.closest(
                '#vipRemoveAvatar'
            );

            if (removeAvatarButton) {
                removeAvatar();
                return;
            }

            const setVipButton = event.target.closest(
                '[data-set-vip-level]'
            );

            if (setVipButton) {
                const level = Number(
                    setVipButton.getAttribute(
                        'data-set-vip-level'
                    )
                );

                const targetUserId =
                    setVipButton.getAttribute(
                        'data-vip-target-user'
                    );

                setVipLevel(
                    targetUserId,
                    level
                );

                return;
            }
        });

        document.addEventListener('change', function (event) {
            if (
                event.target &&
                event.target.id === 'vipAvatarInput'
            ) {
                handleAvatarFile(
                    event.target.files &&
                    event.target.files[0]
                );
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                const overlay = getOverlay();

                if (overlay && !overlay.hidden) {
                    closeVipProfile();
                }
            }
        });

        const overlay = getOverlay();

        if (overlay) {
            overlay.addEventListener('click', function (event) {
                if (event.target === overlay) {
                    closeVipProfile();
                }
            });
        }
    }

    /* =====================================================
       ОТКРЫТИЕ ПРОФИЛЯ
    ===================================================== */

    async function openVipProfile(userId) {
        init();

        const client = getSupabaseClient();

        if (!client) {
            renderError(
                'Supabase не подключён.'
            );
            showOverlay();
            return;
        }

        try {
            const sessionResult =
                await client.auth.getSession();

            if (
                sessionResult.error ||
                !sessionResult.data ||
                !sessionResult.data.session
            ) {
                renderError(
                    'Для просмотра профиля необходимо войти в аккаунт.'
                );

                showOverlay();
                return;
            }

            state.currentUser =
                sessionResult.data.session.user;

            state.viewedUserId =
                userId ||
                state.currentUser.id;

            state.activeTab = 'profile';
            state.avatarFile = null;
            state.avatarPreview = null;
            state.profile = null;
            state.vipLevels = [];
            state.isVipManager = false;

            showOverlay();

            renderLoading();

            await loadProfile(
                state.viewedUserId
            );

            await loadVipLevels();

            await checkVipManager();

            renderProfile();

            document.body.classList.add(
                'vip-profile-open'
            );
        } catch (error) {
            console.error(
                '[PROFILE VIP] Ошибка открытия:',
                error
            );

            renderError(
                getErrorMessage(error)
            );
        }
    }

    /* =====================================================
       ЗАКРЫТИЕ
    ===================================================== */

    function closeVipProfile() {
        const overlay = getOverlay();

        if (!overlay) {
            return;
        }

        overlay.hidden = true;

        document.body.classList.remove(
            'vip-profile-open'
        );

        state.avatarFile = null;
        state.avatarPreview = null;
    }

    function showOverlay() {
        const overlay = getOverlay();

        if (!overlay) {
            return;
        }

        overlay.hidden = false;

        document.body.classList.add(
            'vip-profile-open'
        );
    }

    /* =====================================================
       ЗАГРУЗКА ПРОФИЛЯ
    ===================================================== */

    async function loadProfile(userId) {
        const client = getClientOrThrow();

        const result = await client
            .from(CONFIG.profilesTable)
            .select(`
                id,
                username,
                display_name,
                avatar_url,
                age,
                city,
                about,
                vip_level,
                vip_updated_at,
                vip_updated_by,
                created_at,
                updated_at
            `)
            .eq('id', userId)
            .maybeSingle();

        if (result.error) {
            throw result.error;
        }

        if (!result.data) {
            throw new Error(
                'Профиль пользователя не найден.'
            );
        }

        state.profile = result.data;
    }

    /* =====================================================
       VIP LEVELS
    ===================================================== */

    async function loadVipLevels() {
        const client = getClientOrThrow();

        const result = await client
            .rpc(CONFIG.vipInfoFunction);

        if (result.error) {
            console.warn(
                '[PROFILE VIP] RPC get_my_vip_info:',
                result.error
            );

            const fallback = await client
                .from(CONFIG.vipLevelsTable)
                .select(`
                    level,
                    title,
                    privilege,
                    description
                `)
                .order('level', {
                    ascending: true
                });

            if (fallback.error) {
                throw fallback.error;
            }

            const currentLevel =
                getCurrentVipLevel();

            state.vipLevels =
                (fallback.data || []).map(function (item) {
                    return {
                        level: Number(item.level),
                        title: item.title,
                        privilege: item.privilege,
                        description: item.description,
                        unlocked:
                            Number(item.level) <=
                            currentLevel
                    };
                });

            return;
        }

        state.vipLevels =
            Array.isArray(result.data)
                ? result.data.map(function (item) {
                    return {
                        level: Number(item.level),
                        title: item.title,
                        privilege: item.privilege,
                        description: item.description,
                        unlocked: Boolean(
                            item.unlocked
                        )
                    };
                })
                : [];
    }

    /* =====================================================
       ПРОВЕРКА VIP MANAGER
    ===================================================== */

    async function checkVipManager() {
        state.isVipManager = false;

        if (!state.currentUser) {
            return;
        }

        const client = getClientOrThrow();

        const result = await client
            .from(CONFIG.vipManagersTable)
            .select('user_id')
            .eq(
                'user_id',
                state.currentUser.id
            )
            .maybeSingle();

        if (result.error) {
            console.warn(
                '[PROFILE VIP] Проверка VIP manager:',
                result.error
            );

            return;
        }

        state.isVipManager =
            Boolean(result.data);
    }

    /* =====================================================
       РЕНДЕР ЗАГРУЗКИ
    ===================================================== */

    function renderLoading() {
        const content = getContent();

        if (!content) {
            return;
        }

        content.innerHTML = `
            <div class="vip-loading">
                Загрузка профиля...
            </div>
        `;
    }

    /* =====================================================
       РЕНДЕР ОШИБКИ
    ===================================================== */

    function renderError(message) {
        const content = getContent();

        if (!content) {
            return;
        }

        content.innerHTML = `
            <div class="vip-error">
                ${escapeHtml(
                    message ||
                    'Не удалось загрузить профиль.'
                )}
            </div>
        `;
    }

    /* =====================================================
       ОСНОВНОЙ РЕНДЕР
    ===================================================== */

    function renderProfile() {
        const content = getContent();

        if (!content || !state.profile) {
            return;
        }

        const profile = state.profile;
        const vipLevel =
            getCurrentVipLevel();

        const vipInfo =
            getVipLevelInfo(vipLevel);

        const isOwn =
            isOwnProfile();

        const nickname =
            getDisplayName(profile);

        const username =
            getUsername(profile);

        const avatar =
            getAvatarUrl(profile);

        const goldNickname =
            vipLevel >= 3;

        const levelClass =
            vipLevel === 12
                ? 'vip-level-12'
                : '';

        content.innerHTML = `
            <div class="vip-profile-header">

                <div class="vip-profile-avatar-wrap">
                    ${renderAvatar(
                        profile,
                        avatar
                    )}
                </div>

                <div class="vip-profile-heading">

                    <div class="vip-profile-nickname-row">

                        <div
                            id="vipProfileNickname"
                            class="vip-profile-nickname ${
                                goldNickname
                                    ? 'vip-nickname-gold'
                                    : ''
                            }"
                        >
                            ${escapeHtml(nickname)}
                        </div>

                        ${
                            vipLevel > 0
                                ? `
                                    <div
                                        class="vip-gold-badge ${levelClass}"
                                    >
                                        <span class="vip-gold-star">
                                            ★
                                        </span>

                                        <span>
                                            VIP ${escapeHtml(
                                                getRomanNumber(
                                                    vipLevel
                                                )
                                            )}
                                        </span>

                                        ${
                                            vipLevel === 12
                                                ? `
                                                    <span class="vip-crown">
                                                        ♛
                                                    </span>
                                                `
                                                : ''
                                        }
                                    </div>
                                `
                                : ''
                        }

                    </div>

                    ${
                        username
                            ? `
                                <div class="vip-profile-status">
                                    @${escapeHtml(username)}
                                </div>
                            `
                            : ''
                    }

                    <div class="vip-profile-meta">
                        ${
                            formatAge(profile.age) !== 'Не указан'
                                ? `Возраст: ${escapeHtml(
                                    formatAge(profile.age)
                                )}`
                                : 'Возраст не указан'
                        }

                        &nbsp;•&nbsp;

                        ${
                            formatCity(profile.city) !== 'Не указан'
                                ? escapeHtml(
                                    formatCity(profile.city)
                                )
                                : 'Город не указан'
                        }
                    </div>

                </div>
            </div>

            ${renderTabs(isOwn)}

            <div id="vipProfileTabContent"></div>
        `;

        setActiveTab(
            state.activeTab,
            false
        );
    }

    /* =====================================================
       АВАТАР
    ===================================================== */

    function renderAvatar(profile, avatarUrl) {
        if (state.avatarPreview) {
            return `
                <div class="vip-photo-avatar">
                    <img
                        src="${escapeAttribute(
                            state.avatarPreview
                        )}"
                        alt="Аватар"
                    >
                </div>
            `;
        }

        if (avatarUrl) {
            return `
                <div class="vip-photo-avatar">
                    <img
                        src="${escapeAttribute(
                            avatarUrl
                        )}"
                        alt="Аватар пользователя"
                        onerror="
                            this.closest('.vip-photo-avatar')
                                .replaceWith(
                                    window.__vipCreateDroidAvatar()
                                )
                        "
                    >
                </div>
            `;
        }

        return createDroidAvatarHtml();
    }

    function createDroidAvatarHtml() {
        return `
            <div class="vip-droid-avatar">

                <div class="vip-droid-aura"></div>

                <div class="vip-droid">

                    <div class="vip-droid-antenna"></div>

                    <div class="vip-droid-head">
                        <div class="vip-droid-eye"></div>
                        <div class="vip-droid-eye"></div>
                    </div>

                    <div class="vip-droid-neck"></div>

                    <div class="vip-droid-body">
                        <div class="vip-droid-core"></div>
                    </div>

                    <div
                        class="vip-droid-arm vip-droid-arm-left"
                    ></div>

                    <div
                        class="vip-droid-arm vip-droid-arm-right"
                    ></div>

                    <div
                        class="vip-droid-leg vip-droid-leg-left"
                    ></div>

                    <div
                        class="vip-droid-leg vip-droid-leg-right"
                    ></div>

                </div>
            </div>
        `;
    }

    window.__vipCreateDroidAvatar =
        function () {
            const wrapper =
                document.createElement('div');

            wrapper.innerHTML =
                createDroidAvatarHtml();

            return wrapper.firstElementChild;
        };

    /* =====================================================
       ВКЛАДКИ
    ===================================================== */

    function renderTabs(isOwn) {
        return `
            <div class="vip-profile-tabs">

                <button
                    type="button"
                    class="vip-profile-tab"
                    data-vip-tab="profile"
                >
                    Профиль
                </button>

                <button
                    type="button"
                    class="vip-profile-tab"
                    data-vip-tab="vip"
                >
                    VIP
                </button>

                ${
                    isOwn
                        ? `
                            <button
                                type="button"
                                class="vip-profile-tab"
                                data-vip-tab="edit"
                            >
                                Редактирование
                            </button>
                        `
                        : ''
                }

            </div>
        `;
    }

    function setActiveTab(tab, rerenderHeader) {
        const allowed = [
            'profile',
            'vip',
            'edit'
        ];

        if (!allowed.includes(tab)) {
            tab = 'profile';
        }

        if (
            tab === 'edit' &&
            !isOwnProfile()
        ) {
            tab = 'profile';
        }

        state.activeTab = tab;

        if (rerenderHeader !== false) {
            renderProfile();
            return;
        }

        const buttons =
            document.querySelectorAll(
                '[data-vip-tab]'
            );

        buttons.forEach(function (button) {
            const buttonTab =
                button.getAttribute(
                    'data-vip-tab'
                );

            button.classList.toggle(
                'active',
                buttonTab === tab
            );
        });

        renderActiveTabContent();
    }

    function renderActiveTabContent() {
        const container =
            document.getElementById(
                'vipProfileTabContent'
            );

        if (!container) {
            return;
        }

        if (state.activeTab === 'profile') {
            container.innerHTML =
                renderProfileTab();

            return;
        }

        if (state.activeTab === 'vip') {
            container.innerHTML =
                renderVipTab();

            return;
        }

        if (state.activeTab === 'edit') {
            container.innerHTML =
                renderEditTab();

            return;
        }
    }

    /* =====================================================
       ВКЛАДКА ПРОФИЛЯ
    ===================================================== */

    function renderProfileTab() {
        const profile = state.profile;

        const about =
            formatAbout(profile.about);

        const vipLevel =
            getCurrentVipLevel();

        const vipInfo =
            getVipLevelInfo(vipLevel);

        return `
            <div class="vip-profile-section">

                <div class="vip-profile-about">

                    <div class="vip-about-title">
                        О пользователе
                    </div>

                    <div class="
                        vip-about-text
                        ${
                            about
                                ? ''
                                : 'vip-about-empty'
                        }
                    ">
                        ${
                            about
                                ? escapeHtml(about)
                                : 'Пользователь пока ничего не рассказал о себе.'
                        }
                    </div>

                </div>

                <div class="vip-profile-info-grid">

                    <div class="vip-profile-info-card">

                        <span class="vip-profile-info-label">
                            Имя
                        </span>

                        <strong>
                            ${escapeHtml(
                                getDisplayName(profile)
                            )}
                        </strong>

                    </div>

                    <div class="vip-profile-info-card">

                        <span class="vip-profile-info-label">
                            Никнейм
                        </span>

                        <strong>
                            ${
                                getUsername(profile)
                                    ? '@' +
                                      escapeHtml(
                                          getUsername(profile)
                                      )
                                    : 'Не указан'
                            }
                        </strong>

                    </div>

                    <div class="vip-profile-info-card">

                        <span class="vip-profile-info-label">
                            Возраст
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatAge(
                                    profile.age
                                )
                            )}
                        </strong>

                    </div>

                    <div class="vip-profile-info-card">

                        <span class="vip-profile-info-label">
                            Город
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatCity(
                                    profile.city
                                )
                            )}
                        </strong>

                    </div>

                </div>

                <div class="vip-profile-vip-card">

                    ${
                        vipLevel > 0
                            ? `
                                <div class="vip-current-shine">

                                    <div class="vip-current-label">
                                        Текущий статус
                                    </div>

                                    <div class="vip-current-title">
                                        ${escapeHtml(
                                            vipInfo?.title ||
                                            getVipTitle(
                                                vipLevel
                                            )
                                        )}
                                    </div>

                                    <div class="vip-current-text">
                                        ${escapeHtml(
                                            vipInfo?.privilege ||
                                            'VIP-статус активен.'
                                        )}
                                    </div>

                                </div>
                            `
                            : `
                                <div class="vip-current-normal">

                                    <div class="vip-current-label">
                                        Текущий статус
                                    </div>

                                    <div class="vip-current-title">
                                        Обычный профиль
                                    </div>

                                    <div class="vip-current-text">
                                        VIP-уровень пока не назначен.
                                    </div>

                                </div>
                            `
                    }

                </div>

            </div>
        `;
    }

    /* =====================================================
       ВКЛАДКА VIP
    ===================================================== */

    function renderVipTab() {
        const currentLevel =
            getCurrentVipLevel();

        const currentInfo =
            getVipLevelInfo(
                currentLevel
            );

        let html = `
            <div class="vip-profile-section">

                <div class="vip-profile-vip-card">

                    ${
                        currentLevel > 0
                            ? `
                                <div class="vip-current-shine">

                                    <div class="vip-current-label">
                                        Ваш текущий уровень
                                    </div>

                                    <div class="vip-current-title">
                                        ${escapeHtml(
                                            currentInfo?.title ||
                                            getVipTitle(
                                                currentLevel
                                            )
                                        )}
                                    </div>

                                    <div class="vip-current-text">
                                        ${escapeHtml(
                                            currentInfo?.privilege ||
                                            ''
                                        )}
                                    </div>

                                </div>
                            `
                            : `
                                <div class="vip-current-normal">

                                    <div class="vip-current-label">
                                        Ваш текущий уровень
                                    </div>

                                    <div class="vip-current-title">
                                        VIP отсутствует
                                    </div>

                                    <div class="vip-current-text">
                                        Текущий уровень: обычный профиль.
                                    </div>

                                </div>
                            `
                    }

                </div>

                <div
                    class="vip-levels-list"
                    style="margin-top:12px;"
                >
        `;

        if (!state.vipLevels.length) {
            html += `
                <div class="vip-loading">
                    Список VIP-уровней пока недоступен.
                </div>
            `;
        } else {
            state.vipLevels.forEach(function (item) {
                const level =
                    Number(item.level);

                const unlocked =
                    level <= currentLevel;

                const current =
                    level === currentLevel;

                const classes = [
                    'vip-level-card'
                ];

                if (unlocked) {
                    classes.push('unlocked');
                }

                if (current) {
                    classes.push('current');
                }

                html += `
                    <div
                        class="${classes.join(' ')}"
                    >

                        <div class="vip-level-number">
                            VIP ${escapeHtml(
                                getRomanNumber(level)
                            )}
                        </div>

                        <div class="vip-level-main">

                            <strong>
                                ${escapeHtml(
                                    item.privilege ||
                                    item.title ||
                                    getVipTitle(level)
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    item.description ||
                                    ''
                                )}
                            </span>

                        </div>

                        <div class="vip-level-state">
                            ${
                                current
                                    ? 'ТЕКУЩИЙ'
                                    : unlocked
                                        ? 'ДОСТУПЕН'
                                        : 'ЗАКРЫТ'
                            }
                        </div>

                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        if (
            state.isVipManager &&
            state.viewedUserId
        ) {
            html += renderVipManagerPanel();
        }

        return html;
    }

    /* =====================================================
       VIP MANAGER PANEL
    ===================================================== */

    function renderVipManagerPanel() {
        const currentLevel =
            getCurrentVipLevel();

        return `
            <div
                class="vip-profile-about"
                style="margin-top:16px;"
            >

                <div class="vip-about-title">
                    Управление VIP
                </div>

                <div class="vip-about-text">
                    Вы вошли как VIP-менеджер.
                    Для этого профиля можно назначить
                    уровень от 0 до XII.
                </div>

                <div
                    style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:8px;
                        margin-top:14px;
                    "
                >

                    ${renderVipManagerButton(
                        0,
                        currentLevel
                    )}

                    ${Array.from(
                        { length: 12 },
                        function (_, index) {
                            return renderVipManagerButton(
                                index + 1,
                                currentLevel
                            );
                        }
                    ).join('')}

                </div>

            </div>
        `;
    }

    function renderVipManagerButton(
        level,
        currentLevel
    ) {
        const active =
            Number(level) ===
            Number(currentLevel);

        const title =
            level === 0
                ? '0'
                : 'VIP ' +
                  getRomanNumber(level);

        return `
            <button
                type="button"
                data-set-vip-level="${level}"
                data-vip-target-user="${escapeAttribute(
                    state.viewedUserId
                )}"
                ${
                    active
                        ? 'disabled'
                        : ''
                }
                style="
                    border:1px solid ${
                        active
                            ? 'rgba(245,196,81,.65)'
                            : 'rgba(255,255,255,.10)'
                    };
                    background:${
                        active
                            ? 'rgba(245,196,81,.18)'
                            : 'rgba(255,255,255,.04)'
                    };
                    color:${
                        active
                            ? '#ffe7a1'
                            : '#dce3ef'
                    };
                    border-radius:10px;
                    padding:8px 11px;
                    cursor:${
                        active
                            ? 'default'
                            : 'pointer'
                    };
                    font-weight:800;
                "
            >
                ${escapeHtml(title)}
            </button>
        `;
    }

    /* =====================================================
       ПОИСК VIP INFO
    ===================================================== */

    function getVipLevelInfo(level) {
        const n = Number(level) || 0;

        if (n <= 0) {
            return null;
        }

        return (
            state.vipLevels.find(
                function (item) {
                    return (
                        Number(item.level) === n
                    );
                }
            ) || null
        );
    }

    /* =====================================================
       РЕДАКТИРОВАНИЕ
    ===================================================== */

    function renderEditTab() {
        if (!isOwnProfile()) {
            return `
                <div class="vip-error">
                    Редактирование чужого профиля недоступно.
                </div>
            `;
        }

        const profile =
            state.profile;

        const preview =
            state.avatarPreview ||
            getAvatarUrl(profile);

        return `
            <div class="vip-profile-section">

                <div class="vip-edit-grid">

                    <label>
                        <span>Возраст</span>

                        <input
                            id="vipEditAge"
                            type="number"
                            min="1"
                            max="120"
                            step="1"
                            value="${escapeAttribute(
                                profile.age ?? ''
                            )}"
                            placeholder="Например, 25"
                        >
                    </label>

                    <label>
                        <span>Город</span>

                        <input
                            id="vipEditCity"
                            type="text"
                            maxlength="100"
                            value="${escapeAttribute(
                                profile.city || ''
                            )}"
                            placeholder="Например, Москва"
                        >
                    </label>

                    <label class="vip-edit-wide">
                        <span>О себе</span>

                        <textarea
                            id="vipEditAbout"
                            rows="6"
                            maxlength="2000"
                            placeholder="Расскажите немного о себе..."
                        >${escapeHtml(
                            profile.about || ''
                        )}</textarea>
                    </label>

                </div>

                <div class="vip-photo-editor">

                    <strong>
                        Фотография профиля
                    </strong>

                    <p>
                        Фото необязательно.
                        Если его нет, автоматически
                        используется анимированный аватар дроида.
                    </p>

                    <div
                        class="vip-photo-editor-actions"
                    >

                        <button
                            type="button"
                            id="vipChooseAvatar"
                        >
                            Выбрать фото
                        </button>

                        <button
                            type="button"
                            id="vipRemoveAvatar"
                            class="vip-secondary"
                        >
                            Удалить фото
                        </button>

                    </div>

                    <input
                        id="vipAvatarInput"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        hidden
                    >

                    <div
                        id="vipPhotoName"
                        class="vip-photo-name"
                    >
                        ${
                            preview
                                ? 'Фото профиля установлено.'
                                : 'Фото не выбрано — используется дроид.'
                        }
                    </div>

                </div>

                <div class="vip-edit-actions">

                    <div
                        id="vipEditMessage"
                        class="vip-edit-message"
                    ></div>

                    <button
                        type="button"
                        id="vipSaveProfile"
                        class="vip-primary"
                    >
                        Сохранить профиль
                    </button>

                </div>

            </div>
        `;
    }

    /* =====================================================
       ВЫБОР ФОТО
    ===================================================== */

    function handleAvatarFile(file) {
        if (!file) {
            return;
        }

        if (
            !CONFIG.allowedAvatarTypes.includes(
                file.type
            )
        ) {
            showBrowserMessage(
                'Поддерживаются JPG, PNG, WEBP и GIF.',
                'error'
            );

            return;
        }

        if (
            file.size >
            CONFIG.maxAvatarSize
        ) {
            showBrowserMessage(
                'Размер изображения не должен превышать 8 МБ.',
                'error'
            );

            return;
        }

        state.avatarFile = file;

        const reader =
            new FileReader();

        reader.onload = function () {
            state.avatarPreview =
                reader.result;

            updateAvatarPreview();

            const name =
                document.getElementById(
                    'vipPhotoName'
                );

            if (name) {
                name.textContent =
                    'Выбрано: ' +
                    file.name;
            }
        };

        reader.onerror = function () {
            showBrowserMessage(
                'Не удалось прочитать изображение.',
                'error'
            );
        };

        reader.readAsDataURL(file);
    }

    function updateAvatarPreview() {
        const avatarWrap =
            document.querySelector(
                '.vip-profile-avatar-wrap'
            );

        if (!avatarWrap) {
            return;
        }

        avatarWrap.innerHTML =
            renderAvatar(
                state.profile,
                state.avatarPreview ||
                getAvatarUrl(
                    state.profile
                )
            );
    }

    function removeAvatar() {
        state.avatarFile = null;
        state.avatarPreview = null;

        if (state.profile) {
            state.profile.avatar_url = '';
        }

        updateAvatarPreview();

        const name =
            document.getElementById(
                'vipPhotoName'
            );

        if (name) {
            name.textContent =
                'Фото будет удалено. Будет использоваться дроид.';
        }
    }

    /* =====================================================
       ЗАГРУЗКА ФОТО В SUPABASE STORAGE
    ===================================================== */

    async function uploadAvatar(file, userId) {
        const client =
            getClientOrThrow();

        if (!file) {
            return null;
        }

        const extension =
            getFileExtension(
                file.name,
                file.type
            );

        const filePath =
            userId +
            '/avatar-' +
            Date.now() +
            '-' +
            Math.random()
                .toString(36)
                .slice(2) +
            '.' +
            extension;

        const uploadResult =
            await client
                .storage
                .from(CONFIG.avatarBucket)
                .upload(
                    filePath,
                    file,
                    {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.type
                    }
                );

        if (uploadResult.error) {
            throw new Error(
                'Не удалось загрузить фотографию: ' +
                uploadResult.error.message
            );
        }

        const publicResult =
            client
                .storage
                .from(CONFIG.avatarBucket)
                .getPublicUrl(
                    filePath
                );

        if (
            !publicResult ||
            !publicResult.data ||
            !publicResult.data.publicUrl
        ) {
            throw new Error(
                'Supabase не вернул публичный URL фотографии.'
            );
        }

        return publicResult.data.publicUrl;
    }

    function getFileExtension(
        filename,
        mimeType
    ) {
        const name =
            String(filename || '');

        const match =
            name.match(
                /\.([a-zA-Z0-9]+)$/
            );

        if (match) {
            return match[1].toLowerCase();
        }

        const mimeMap = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        };

        return (
            mimeMap[mimeType] ||
            'jpg'
        );
    }

    /* =====================================================
       СОХРАНЕНИЕ ПРОФИЛЯ
    ===================================================== */

    async function saveProfile() {
        if (!isOwnProfile()) {
            return;
        }

        if (state.saving) {
            return;
        }

        const client =
            getClientOrThrow();

        const ageInput =
            document.getElementById(
                'vipEditAge'
            );

        const cityInput =
            document.getElementById(
                'vipEditCity'
            );

        const aboutInput =
            document.getElementById(
                'vipEditAbout'
            );

        const message =
            document.getElementById(
                'vipEditMessage'
            );

        if (
            !ageInput ||
            !cityInput ||
            !aboutInput
        ) {
            return;
        }

        let ageValue =
            normalizeText(
                ageInput.value
            );

        let age = null;

        if (ageValue !== '') {
            age =
                Number(ageValue);

            if (
                !Number.isInteger(age) ||
                age < 1 ||
                age > 120
            ) {
                if (message) {
                    message.textContent =
                        'Возраст должен быть от 1 до 120.';
                }

                return;
            }
        }

        const city =
            normalizeText(
                cityInput.value
            ).slice(0, 100);

        const about =
            normalizeText(
                aboutInput.value
            ).slice(0, 2000);

        state.saving = true;

        const button =
            document.getElementById(
                'vipSaveProfile'
            );

        if (button) {
            button.disabled = true;
            button.textContent =
                'Сохранение...';
        }

        if (message) {
            message.textContent = '';
        }

        try {
            let avatarUrl =
                getAvatarUrl(
                    state.profile
                );

            if (state.avatarFile) {
                avatarUrl =
                    await uploadAvatar(
                        state.avatarFile,
                        state.currentUser.id
                    );
            } else if (
                !state.avatarPreview &&
                !avatarUrl
            ) {
                avatarUrl = null;
            }

            const payload = {
                age: age,
                city:
                    city || null,
                about:
                    about || null,
                avatar_url:
                    avatarUrl || null
            };

            const result =
                await client
                    .from(
                        CONFIG.profilesTable
                    )
                    .update(payload)
                    .eq(
                        'id',
                        state.currentUser.id
                    )
                    .select(`
                        id,
                        username,
                        display_name,
                        avatar_url,
                        age,
                        city,
                        about,
                        vip_level,
                        vip_updated_at,
                        vip_updated_by,
                        created_at,
                        updated_at
                    `)
                    .single();

            if (result.error) {
                throw result.error;
            }

            state.profile =
                result.data;

            state.avatarFile =
                null;

            state.avatarPreview =
                null;

            if (message) {
                message.textContent =
                    'Профиль успешно сохранён.';
            }

            showBrowserMessage(
                'Профиль сохранён.',
                'success'
            );

            renderProfile();

            setActiveTab(
                'edit',
                false
            );
        } catch (error) {
            console.error(
                '[PROFILE VIP] Ошибка сохранения:',
                error
            );

            if (message) {
                message.textContent =
                    getErrorMessage(
                        error
                    );
            }

            showBrowserMessage(
                getErrorMessage(
                    error
                ),
                'error'
            );
        } finally {
            state.saving = false;

            const currentButton =
                document.getElementById(
                    'vipSaveProfile'
                );

            if (currentButton) {
                currentButton.disabled =
                    false;

                currentButton.textContent =
                    'Сохранить профиль';
            }
        }
    }

    /* =====================================================
       ВЫДАЧА VIP
    ===================================================== */

    async function setVipLevel(
        targetUserId,
        level
    ) {
        if (!state.isVipManager) {
            showBrowserMessage(
                'У вас нет прав VIP-менеджера.',
                'error'
            );

            return;
        }

        if (
            !targetUserId ||
            state.vipSaving
        ) {
            return;
        }

        const newLevel =
            Number(level);

        if (
            !Number.isInteger(
                newLevel
            ) ||
            newLevel < 0 ||
            newLevel > 12
        ) {
            showBrowserMessage(
                'VIP-уровень должен быть от 0 до 12.',
                'error'
            );

            return;
        }

        const title =
            newLevel === 0
                ? 'обычный профиль'
                : 'VIP ' +
                  getRomanNumber(
                      newLevel
                  );

        const confirmed =
            window.confirm(
                'Назначить пользователю ' +
                title +
                '?'
            );

        if (!confirmed) {
            return;
        }

        state.vipSaving = true;

        try {
            const client =
                getClientOrThrow();

            const result =
                await client
                    .rpc(
                        CONFIG.setVipFunction,
                        {
                            target_user_id:
                                targetUserId,

                            new_level:
                                newLevel
                        }
                    );

            if (result.error) {
                throw result.error;
            }

            if (!result.data) {
                throw new Error(
                    'Сервер не вернул обновлённый профиль.'
                );
            }

            state.profile =
                result.data;

            await loadVipLevels();

            renderProfile();

            setActiveTab(
                'vip',
                false
            );

            showBrowserMessage(
                'VIP-уровень изменён: ' +
                title,
                'success'
            );
        } catch (error) {
            console.error(
                '[PROFILE VIP] Ошибка выдачи VIP:',
                error
            );

            showBrowserMessage(
                getVipErrorMessage(
                    error
                ),
                'error'
            );
        } finally {
            state.vipSaving = false;
        }
    }

    /* =====================================================
       ОШИБКИ VIP
    ===================================================== */

    function getVipErrorMessage(error) {
        const raw =
            String(
                error?.message ||
                error?.details ||
                error ||
                ''
            );

        if (
            raw.includes(
                'VIP_MANAGER_REQUIRED'
            )
        ) {
            return 'У вас нет прав выдавать VIP.';
        }

        if (
            raw.includes(
                'AUTH_REQUIRED'
            )
        ) {
            return 'Необходима авторизация.';
        }

        if (
            raw.includes(
                'VIP_LEVEL_MUST_BE_0_TO_12'
            )
        ) {
            return 'VIP-уровень должен быть от 0 до 12.';
        }

        if (
            raw.includes(
                'PROFILE_NOT_FOUND'
            )
        ) {
            return 'Профиль пользователя не найден.';
        }

        return raw ||
            'Не удалось изменить VIP-уровень.';
    }

    /* =====================================================
       ОБЫЧНЫЙ ТЕКСТ ОШИБКИ
    ===================================================== */

    function getErrorMessage(error) {
        if (!error) {
            return 'Произошла неизвестная ошибка.';
        }

        if (
            typeof error === 'string'
        ) {
            return error;
        }

        if (
            error.message
        ) {
            return error.message;
        }

        if (
            error.error_description
        ) {
            return error.error_description;
        }

        return 'Произошла ошибка при работе с профилем.';
    }

    /* =====================================================
       СОБЫТИЕ ЗАКРЫТИЯ ЧЕРЕЗ КЛАВИАТУРУ
    ===================================================== */

    window.addEventListener(
        'beforeunload',
        function () {
            document.body.classList.remove(
                'vip-profile-open'
            );
        }
    );

    /* =====================================================
       ПУБЛИЧНЫЕ ФУНКЦИИ
    ===================================================== */

    window.openVipProfile =
        openVipProfile;

    window.showVipProfile =
        openVipProfile;

    window.closeVipProfile =
        closeVipProfile;

    window.initVipProfile =
        init;

    /* =====================================================
       АВТОИНИЦИАЛИЗАЦИЯ
    ===================================================== */

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            init
        );
    } else {
        init();
    }

})();
