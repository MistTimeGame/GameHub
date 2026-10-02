/* ============================================================
   GGP — Game Guild Platform
   Vanilla JS + Supabase SPA
   ============================================================ */

/* ---------- SUPABASE INIT ---------- */
// Клиент уже создан в supabase-config.js как window.supabaseClient.
// Локальная переменная называется sb, чтобы не конфликтовать
// с глобалью window.supabase из UMD-сборки supabase-js@2.
if (!window.supabaseClient) {
  console.error('Supabase client not found. Check supabase-config.js');
}

const sb = window.supabaseClient;

/* ---------- STATE ---------- */
const state = {
  user: null,
  profile: null,
  games: [],
  guilds: [],
  currentGame: null,
  currentGuild: null,
  guildMembers: [],
  isPlatformOwner: false,
  loading: false,
};

/* ---------- DOM HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const viewEl = $('#view');
const mainNav = $('#main-nav');
const btnLogin = $('#btn-login');
const userChip = $('#user-chip');
const userName = $('#user-name');
const userAvatar = $('#user-avatar');
const btnLogout = $('#btn-logout');
const toastsEl = $('#toasts');
const footerYear = $('#footer-year');

/* ---------- TOASTS ---------- */
function toast(message, type = 'info', duration = 3500) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastsEl.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = '0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ---------- STATUS HELPERS ---------- */
function setStatus(el, message, type = 'info') {
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove('hidden');
}

function clearStatus(el) {
  if (!el) return;
  el.textContent = '';
  el.className = 'status hidden';
}

function setLoading(button, isLoading, text = 'Загрузка...') {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

/* ---------- MODAL HELPERS ---------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  document.body.style.overflow = '';
}

/* ---------- AUTH ---------- */
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    state.user = session.user;
    await loadProfile(session.user.id);
    updateAuthUI();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      state.user = session.user;
      await loadProfile(session.user.id);
      updateAuthUI();
      closeModal('modal-auth');
      toast('Вы вошли в аккаунт', 'success');
      navigate(window.location.hash || '#/home');
    }

    if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      state.isPlatformOwner = false;
      updateAuthUI();
      toast('Вы вышли из аккаунта', 'info');
      navigate('#/home');
    }
  });
}

async function loadProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('loadProfile error:', error);
    return;
  }

  if (data) {
    state.profile = data;
    const ownerEmails = (window.PLATFORM_OWNER_EMAILS || [])
      .map((e) => e.toLowerCase().trim());
    state.isPlatformOwner = ownerEmails.includes(
      (state.user.email || '').toLowerCase().trim()
    );
  } else {
    // Профиль ещё не создан — создадим
    const nickname = state.user.email?.split('@')[0] || 'Игрок';
    const { data: created, error: createError } = await sb
      .from('profiles')
      .insert({
        id: userId,
        username: nickname,
        display_name: nickname,
        avatar: '',
      })
      .select()
      .single();

    if (createError) {
      console.error('create profile error:', createError);
    } else {
      state.profile = created;
    }
  }
}

function updateAuthUI() {
  if (state.user) {
    btnLogin.classList.add('hidden');
    userChip.classList.remove('hidden');
    userName.textContent =
      state.profile?.display_name || state.profile?.username || 'Игрок';
    userAvatar.src =
      state.profile?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        state.profile?.username || 'GGP'
      )}&background=7c3aed&color=fff`;
  } else {
    btnLogin.classList.remove('hidden');
    userChip.classList.add('hidden');
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const isRegister = form.dataset.mode === 'register';
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const nickname = $('#auth-nickname').value.trim();
  const statusEl = $('#auth-status');
  const submitBtn = $('#auth-submit');

  clearStatus(statusEl);

  if (!email || !password) {
    setStatus(statusEl, 'Заполните email и пароль', 'error');
    return;
  }

  if (isRegister && !nickname) {
    setStatus(statusEl, 'Введите никнейм', 'error');
    return;
  }

  if (password.length < 6) {
    setStatus(statusEl, 'Пароль должен быть минимум 6 символов', 'error');
    return;
  }

  setLoading(submitBtn, true, isRegister ? 'Регистрация...' : 'Вход...');

  try {
    if (isRegister) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
        },
      });

      if (error) throw error;

      if (data.user) {
        await sb.from('profiles').upsert({
          id: data.user.id,
          username: nickname,
          display_name: nickname,
          avatar: '',
        });

        setStatus(
          statusEl,
          'Регистрация успешна! Проверьте почту или войдите.',
          'success'
        );
        toast('Регистрация успешна!', 'success');
      }
    } else {
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setStatus(statusEl, 'Вход выполнен!', 'success');
      }
    }
  } catch (err) {
    console.error('auth error:', err);
    let msg = err.message || 'Ошибка авторизации';
    if (msg.includes('Invalid login credentials')) {
      msg = 'Неверный email или пароль';
    }
    if (msg.includes('already registered')) {
      msg = 'Этот email уже зарегистрирован';
    }
    setStatus(statusEl, msg, 'error');
    toast(msg, 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

async function handleLogout() {
  await sb.auth.signOut();
}

/* ---------- FILE UPLOAD ---------- */
async function uploadFile(file, bucket, folder = '') {
  if (!file) return null;

  const ext = file.name.split('.').pop();
  const fileName = `${folder}${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from(bucket)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('upload error:', uploadError);
    throw new Error(`Ошибка загрузки: ${uploadError.message}`);
  }

  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(fileName);

  return urlData.publicUrl;
}

/* ---------- GAMES ---------- */
async function loadGames() {
  const { data, error } = await sb
    .from('games')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('loadGames error:', error);
    return [];
  }

  const gamesWithCounts = await Promise.all(
    (data || []).map(async (game) => {
      const { count } = await sb
        .from('guilds')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id);
      return { ...game, guilds_count: count || 0 };
    })
  );

  state.games = gamesWithCounts;
  return gamesWithCounts;
}

async function createGame(e) {
  e.preventDefault();

  if (!state.user) {
    toast('Войдите, чтобы создать игру', 'error');
    openModal('modal-auth');
    return;
  }

  const name = $('#game-name').value.trim();
  const description = $('#game-description').value.trim();
  const website = $('#game-website').value.trim();
  const discord = $('#game-discord').value.trim();
  const themeColor = $('#game-theme-color').value;
  const buttonColor = $('#game-button-color').value;
  const buttonStyle = $('#game-button-style').value;
  const isPublic = $('#game-public').checked;
  const statusEl = $('#game-status');
  const submitBtn = $('#game-submit');

  clearStatus(statusEl);

  if (!name) {
    setStatus(statusEl, 'Введите название игры', 'error');
    return;
  }

  setLoading(submitBtn, true, 'Создание...');

  try {
    const logoFile = $('#game-logo').files[0];
    const bannerFile = $('#game-banner').files[0];
    const bgFile = $('#game-background').files[0];

    const [logoUrl, bannerUrl, bgUrl] = await Promise.all([
      logoFile ? uploadFile(logoFile, 'game-logos') : null,
      bannerFile ? uploadFile(bannerFile, 'game-banners') : null,
      bgFile ? uploadFile(bgFile, 'game-banners', 'backgrounds/') : null,
    ]);

    const gameId = `game_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    const { data, error } = await sb
      .from('games')
      .insert({
        game_id: gameId,
        name,
        description,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        website_url: website || null,
        discord_url: discord || null,
        is_public: isPublic,
        created_by: state.user.id,
        theme_color: themeColor,
        button_color: buttonColor,
        button_style: buttonStyle,
        background_url: bgUrl,
      })
      .select()
      .single();

    if (error) throw error;

    setStatus(statusEl, 'Игра создана!', 'success');
    toast('Игра успешно создана', 'success');
    $('#game-form').reset();
    closeModal('modal-game');
    await loadGames();
    navigate(`#/game/${data.id}`);
  } catch (err) {
    console.error('createGame error:', err);
    setStatus(statusEl, err.message || 'Ошибка создания игры', 'error');
    toast(err.message || 'Ошибка создания игры', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadGame(id) {
  const { data: game, error } = await sb
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !game) {
    console.error('loadGame error:', error);
    return null;
  }

  const { data: guilds } = await sb
    .from('guilds')
    .select('*')
    .eq('game_id', game.id)
    .order('created_at', { ascending: false });

  const guildsWithCounts = await Promise.all(
    (guilds || []).map(async (g) => {
      const { count } = await sb
        .from('guild_members')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', g.id);
      return { ...g, members_count: count || 0 };
    })
  );

  state.currentGame = { ...game, guilds: guildsWithCounts };
  return state.currentGame;
}

/* ---------- GUILDS ---------- */
async function loadGuilds() {
  const { data, error } = await sb
    .from('guilds')
    .select('*, games(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('loadGuilds error:', error);
    return [];
  }

  const guildsWithCounts = await Promise.all(
    (data || []).map(async (g) => {
      const { count } = await sb
        .from('guild_members')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', g.id);
      return { ...g, members_count: count || 0 };
    })
  );

  state.guilds = guildsWithCounts;
  return guildsWithCounts;
}

async function createGuild(e) {
  e.preventDefault();

  if (!state.user) {
    toast('Войдите, чтобы создать гильдию', 'error');
    openModal('modal-auth');
    return;
  }

  const gameId = $('#guild-game-id').value;
  const name = $('#guild-name').value.trim();
  const tag = $('#guild-tag').value.trim();
  const description = $('#guild-description').value.trim();
  const faction = $('#guild-faction').value.trim();
  const website = $('#guild-website').value.trim();
  const discord = $('#guild-discord').value.trim();
  const themeColor = $('#guild-theme-color').value;
  const buttonColor = $('#guild-button-color').value;
  const buttonStyle = $('#guild-button-style').value;
  const isPublic = $('#guild-public').checked;
  const statusEl = $('#guild-status');
  const submitBtn = $('#guild-submit');

  clearStatus(statusEl);

  if (!name) {
    setStatus(statusEl, 'Введите название гильдии', 'error');
    return;
  }

  if (!gameId) {
    setStatus(statusEl, 'Не указана игра', 'error');
    return;
  }

  setLoading(submitBtn, true, 'Создание...');

  try {
    const logoFile = $('#guild-logo').files[0];
    const bannerFile = $('#guild-banner').files[0];
    const bgFile = $('#guild-background').files[0];
    const flagFile = $('#guild-faction-flag').files[0];

    const [logoUrl, bannerUrl, bgUrl, flagUrl] = await Promise.all([
      logoFile ? uploadFile(logoFile, 'guild-logos') : null,
      bannerFile ? uploadFile(bannerFile, 'guild-banners') : null,
      bgFile ? uploadFile(bgFile, 'guild-banners', 'backgrounds/') : null,
      flagFile ? uploadFile(flagFile, 'guild-logos', 'flags/') : null,
    ]);

    const { data, error } = await sb
      .from('guilds')
      .insert({
        game_id: gameId,
        name,
        tag,
        description,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        website_url: website || null,
        discord_url: discord || null,
        is_public: isPublic,
        created_by: state.user.id,
        theme_color: themeColor,
        button_color: buttonColor,
        button_style: buttonStyle,
        background_url: bgUrl,
        faction_name: faction,
        faction_flag_url: flagUrl,
      })
      .select()
      .single();

    if (error) throw error;

    // Создатель становится главой гильдии
    await sb.from('guild_members').insert({
      guild_id: data.id,
      user_id: state.user.id,
      game_id: gameId,
      nickname:
        state.profile?.display_name || state.profile?.username || 'Лидер',
      role: 'leader',
    });

    setStatus(statusEl, 'Гильдия создана!', 'success');
    toast('Гильдия успешно создана', 'success');
    $('#guild-form').reset();
    closeModal('modal-guild');
    await loadGames();
    navigate(`#/guild/${data.id}`);
  } catch (err) {
    console.error('createGuild error:', err);
    setStatus(statusEl, err.message || 'Ошибка создания гильдии', 'error');
    toast(err.message || 'Ошибка создания гильдии', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadGuild(id) {
  const { data: guild, error } = await sb
    .from('guilds')
    .select('*, games(name, id)')
    .eq('id', id)
    .maybeSingle();

  if (error || !guild) {
    console.error('loadGuild error:', error);
    return null;
  }

  const { data: members } = await sb
    .from('guild_members')
    .select('*')
    .eq('guild_id', guild.id)
    .order('joined_at', { ascending: true });

  state.currentGuild = guild;
  state.guildMembers = members || [];
  return guild;
}

async function joinGuild(guildId) {
  if (!state.user) {
    toast('Войдите, чтобы вступить в гильдию', 'error');
    openModal('modal-auth');
    return;
  }

  const { data: existing } = await sb
    .from('guild_members')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', state.user.id)
    .maybeSingle();

  if (existing) {
    toast('Вы уже в этой гильдии', 'info');
    return;
  }

  const { error } = await sb.from('guild_members').insert({
    guild_id: guildId,
    user_id: state.user.id,
    game_id: state.currentGuild?.game_id || null,
    nickname:
      state.profile?.display_name || state.profile?.username || 'Игрок',
    role: 'member',
  });

  if (error) {
    console.error('joinGuild error:', error);
    toast('Ошибка вступления', 'error');
    return;
  }

  toast('Вы вступили в гильдию!', 'success');
  await loadGuild(guildId);
  renderGuildPage(guildId);
}

async function leaveGuild(guildId) {
  if (!state.user) return;

  const { error } = await sb
    .from('guild_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', state.user.id);

  if (error) {
    console.error('leaveGuild error:', error);
    toast('Ошибка выхода', 'error');
    return;
  }

  toast('Вы покинули гильдию', 'info');
  await loadGuild(guildId);
  renderGuildPage(guildId);
}

async function updateMemberRole(memberId, role) {
  const { error } = await sb
    .from('guild_members')
    .update({ role })
    .eq('id', memberId);

  if (error) {
    console.error('updateMemberRole error:', error);
    toast('Ошибка изменения роли', 'error');
    return;
  }

  toast('Роль обновлена', 'success');
  await loadGuild(state.currentGuild.id);
  renderGuildPage(state.currentGuild.id);
}

async function kickMember(memberId) {
  const { error } = await sb
    .from('guild_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('kickMember error:', error);
    toast('Ошибка исключения', 'error');
    return;
  }

  toast('Участник исключён', 'info');
  await loadGuild(state.currentGuild.id);
  renderGuildPage(state.currentGuild.id);
}

/* ---------- GUILD SETTINGS ---------- */
function openGuildSettings() {
  if (!state.currentGuild) return;

  const g = state.currentGuild;

  $('#gs-id').value = g.id;
  $('#gs-name').value = g.name || '';
  $('#gs-tag').value = g.tag || '';
  $('#gs-description').value = g.description || '';
  $('#gs-faction').value = g.faction_name || '';
  $('#gs-website').value = g.website_url || '';
  $('#gs-discord').value = g.discord_url || '';
  $('#gs-theme-color').value = g.theme_color || '#7c3aed';
  $('#gs-button-color').value = g.button_color || '#2563eb';
  $('#gs-button-style').value = g.button_style || 'solid';
  $('#gs-public').checked = g.is_public !== false;

  clearStatus($('#gs-status'));
  openModal('modal-guild-settings');
}

async function saveGuildSettings(e) {
  e.preventDefault();

  const id = $('#gs-id').value;
  const name = $('#gs-name').value.trim();
  const tag = $('#gs-tag').value.trim();
  const description = $('#gs-description').value.trim();
  const faction = $('#gs-faction').value.trim();
  const website = $('#gs-website').value.trim();
  const discord = $('#gs-discord').value.trim();
  const themeColor = $('#gs-theme-color').value;
  const buttonColor = $('#gs-button-color').value;
  const buttonStyle = $('#gs-button-style').value;
  const isPublic = $('#gs-public').checked;
  const statusEl = $('#gs-status');
  const submitBtn = $('#gs-submit');

  clearStatus(statusEl);

  if (!name) {
    setStatus(statusEl, 'Введите название', 'error');
    return;
  }

  setLoading(submitBtn, true, 'Сохранение...');

  try {
    const logoFile = $('#gs-logo').files[0];
    const bannerFile = $('#gs-banner').files[0];
    const bgFile = $('#gs-background').files[0];
    const flagFile = $('#gs-faction-flag').files[0];

    const updates = {
      name,
      tag,
      description,
      faction_name: faction,
      website_url: website || null,
      discord_url: discord || null,
      theme_color: themeColor,
      button_color: buttonColor,
      button_style: buttonStyle,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    };

    if (logoFile) updates.logo_url = await uploadFile(logoFile, 'guild-logos');
    if (bannerFile)
      updates.banner_url = await uploadFile(bannerFile, 'guild-banners');
    if (bgFile)
      updates.background_url = await uploadFile(
        bgFile,
        'guild-banners',
        'backgrounds/'
      );
    if (flagFile)
      updates.faction_flag_url = await uploadFile(
        flagFile,
        'guild-logos',
        'flags/'
      );

    const { error } = await sb.from('guilds').update(updates).eq('id', id);

    if (error) throw error;

    setStatus(statusEl, 'Сохранено!', 'success');
    toast('Настройки гильдии обновлены', 'success');
    closeModal('modal-guild-settings');
    await loadGuild(id);
    renderGuildPage(id);
  } catch (err) {
    console.error('saveGuildSettings error:', err);
    setStatus(statusEl, err.message || 'Ошибка сохранения', 'error');
    toast(err.message || 'Ошибка сохранения', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

/* ---------- RENDER HELPERS ---------- */
function applyTheme(el, themeColor, buttonColor, buttonStyle) {
  if (!el) return;
  if (themeColor) el.style.setProperty('--accent', themeColor);
  if (buttonColor) el.style.setProperty('--accent-2', buttonColor);
  if (buttonStyle) el.dataset.buttonStyle = buttonStyle;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ---------- RENDER: HOME ---------- */
async function renderHome() {
  const games = await loadGames();
  const popular = games.slice(0, 6);

  viewEl.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <h1>Создавай игровые сообщества</h1>
        <p>Платформа для гильдий, кланов и игровых комьюнити. Добавляй игры, создавай гильдии, управляй участниками.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="open-create-game">Создать игру</button>
          <a class="btn btn-ghost" href="#/games">Найти игру</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <div class="section-title">Популярные игры</div>
          <div class="section-sub">Сообщества, которые уже созданы</div>
        </div>
        <a class="btn btn-ghost" href="#/games">Все игры</a>
      </div>

      ${
        popular.length
          ? `<div class="cards">${popular.map(renderGameCard).join('')}</div>`
          : `<div class="empty"><div class="empty-icon">🎮</div><p>Пока нет игр. Создайте первую!</p></div>`
      }
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <div class="section-title">Гильдии</div>
          <div class="section-sub">Активные сообщества</div>
        </div>
        <a class="btn btn-ghost" href="#/guilds">Все гильдии</a>
      </div>
      <div id="home-guilds" class="cards"></div>
    </section>
  `;

  const guilds = await loadGuilds();
  const homeGuilds = $('#home-guilds');
  if (homeGuilds) {
    homeGuilds.innerHTML = guilds.length
      ? guilds.slice(0, 6).map(renderGuildCard).join('')
      : `<div class="empty"><div class="empty-icon">🛡️</div><p>Пока нет гильдий</p></div>`;
  }

  bindCardEvents();
}

function renderGameCard(game) {
  return `
    <article class="card" data-game-id="${game.id}">
      <div class="card-media">
        ${
          game.banner_url
            ? `<img src="${game.banner_url}" alt="${game.name}" loading="lazy" />`
            : ''
        }
        ${
          game.logo_url
            ? `<img class="card-logo" src="${game.logo_url}" alt="${game.name} logo" />`
            : ''
        }
      </div>
      <div class="card-body">
        <div class="card-title">${game.name}</div>
        <div class="card-desc">${game.description || 'Без описания'}</div>
        <div class="card-meta">
          <span class="badge">🛡️ ${game.guilds_count || 0} гильдий</span>
          <span class="badge-blue badge">${formatDate(game.created_at)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderGuildCard(guild) {
  return `
    <article class="card" data-guild-id="${guild.id}">
      <div class="card-media">
        ${
          guild.banner_url
            ? `<img src="${guild.banner_url}" alt="${guild.name}" loading="lazy" />`
            : ''
        }
        ${
          guild.logo_url
            ? `<img class="card-logo" src="${guild.logo_url}" alt="${guild.name} logo" />`
            : ''
        }
      </div>
      <div class="card-body">
        <div class="card-title">${guild.name} ${
    guild.tag ? `<span class="text-dim">[${guild.tag}]</span>` : ''
  }</div>
        <div class="card-desc">${guild.description || 'Без описания'}</div>
        <div class="card-meta">
          <span class="badge">👥 ${guild.members_count || 0}</span>
          ${
            guild.faction_name
              ? `<span class="badge-gold badge">${guild.faction_name}</span>`
              : ''
          }
          ${
            guild.games?.name
              ? `<span class="badge-blue badge">${guild.games.name}</span>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

function bindCardEvents() {
  $$('.card[data-game-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate(`#/game/${card.dataset.gameId}`);
    });
  });

  $$('.card[data-guild-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate(`#/guild/${card.dataset.guildId}`);
    });
  });
}

/* ---------- RENDER: GAMES LIST ---------- */
async function renderGamesList() {
  const games = await loadGames();

  viewEl.innerHTML = `
    <div class="section-head">
      <div>
        <div class="section-title">Игры</div>
        <div class="section-sub">Все игровые миры на платформе</div>
      </div>
      <button class="btn btn-primary" data-action="open-create-game">Создать игру</button>
    </div>
    ${
      games.length
        ? `<div class="cards mt-24">${games.map(renderGameCard).join('')}</div>`
        : `<div class="empty"><div class="empty-icon">🎮</div><p>Игр пока нет</p></div>`
    }
  `;

  bindCardEvents();
}

/* ---------- RENDER: GAME PAGE ---------- */
async function renderGamePage(id) {
  const game = await loadGame(id);

  if (!game) {
    viewEl.innerHTML = `<div class="empty"><div class="empty-icon">🚫</div><p>Игра не найдена</p></div>`;
    return;
  }

  const bgStyle = game.background_url
    ? `background-image: linear-gradient(135deg, rgba(124,58,237,0.25), rgba(5,7,13,0.92)), url('${game.background_url}');`
    : '';

  viewEl.innerHTML = `
    <div class="page-banner" style="${bgStyle}">
      <div class="page-banner-content">
        ${
          game.logo_url
            ? `<img class="page-logo" src="${game.logo_url}" alt="${game.name}" />`
            : ''
        }
        <div class="page-info">
          <h1>${game.name}</h1>
          <div class="tagline">${game.description || 'Игровое сообщество'}</div>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="open-create-guild" data-game-id="${
              game.id
            }">Создать гильдию</button>
            ${
              game.website_url
                ? `<a class="btn btn-ghost" href="${game.website_url}" target="_blank" rel="noopener">Сайт</a>`
                : ''
            }
            ${
              game.discord_url
                ? `<a class="btn btn-ghost" href="${game.discord_url}" target="_blank" rel="noopener">Discord</a>`
                : ''
            }
          </div>
        </div>
      </div>
    </div>

    <section class="section">
      <div class="section-head">
        <div>
          <div class="section-title">Гильдии игры</div>
          <div class="section-sub">${game.guilds.length} сообществ</div>
        </div>
      </div>
      ${
        game.guilds.length
          ? `<div class="cards">${game.guilds.map(renderGuildCard).join('')}</div>`
          : `<div class="empty"><div class="empty-icon">🛡️</div><p>В этой игре пока нет гильдий</p></div>`
      }
    </section>
  `;

  applyTheme(viewEl, game.theme_color, game.button_color, game.button_style);
  bindCardEvents();
}

/* ---------- RENDER: GUILDS LIST ---------- */
async function renderGuildsList() {
  const guilds = await loadGuilds();

  viewEl.innerHTML = `
    <div class="section-head">
      <div>
        <div class="section-title">Гильдии</div>
        <div class="section-sub">Все сообщества платформы</div>
      </div>
    </div>
    ${
      guilds.length
        ? `<div class="cards mt-24">${guilds.map(renderGuildCard).join('')}</div>`
        : `<div class="empty"><div class="empty-icon">🛡️</div><p>Гильдий пока нет</p></div>`
    }
  `;

  bindCardEvents();
}

/* ---------- RENDER: GUILD PAGE ---------- */
async function renderGuildPage(id) {
  const guild = await loadGuild(id);

  if (!guild) {
    viewEl.innerHTML = `<div class="empty"><div class="empty-icon">🚫</div><p>Гильдия не найдена</p></div>`;
    return;
  }

  const members = state.guildMembers;
  const myMember = members.find((m) => m.user_id === state.user?.id);
  const isLeader = myMember?.role === 'leader';
  const isOfficer = myMember?.role === 'officer';
  const canManage = isLeader || isOfficer;
  const isMember = !!myMember;

  const bgStyle = guild.background_url
    ? `background-image: linear-gradient(135deg, rgba(124,58,237,0.25), rgba(5,7,13,0.92)), url('${guild.background_url}');`
    : '';

  viewEl.innerHTML = `
    <div class="page-banner" style="${bgStyle}">
      <div class="page-banner-content">
        ${
          guild.logo_url
            ? `<img class="page-logo" src="${guild.logo_url}" alt="${guild.name}" />`
            : ''
        }
        <div class="page-info">
          <h1>${guild.name} ${
    guild.tag ? `<span class="text-dim">[${guild.tag}]</span>` : ''
  }</h1>
          <div class="tagline">
            ${
              guild.faction_name
                ? `<span class="badge-gold badge">${guild.faction_name}</span> `
                : ''
            }
            ${
              guild.games?.name
                ? `<span class="badge-blue badge">${guild.games.name}</span>`
                : ''
            }
          </div>
          <div class="tagline">${guild.description || 'Описание отсутствует'}</div>
          <div class="page-actions">
            ${
              !isMember
                ? `<button class="btn btn-primary" data-action="join-guild" data-guild-id="${guild.id}">Вступить</button>`
                : `<button class="btn btn-ghost" data-action="leave-guild" data-guild-id="${guild.id}">Покинуть</button>`
            }
            ${
              canManage
                ? `<button class="btn btn-ghost" data-action="open-guild-settings">Настройки</button>`
                : ''
            }
            ${
              guild.website_url
                ? `<a class="btn btn-ghost" href="${guild.website_url}" target="_blank" rel="noopener">Сайт</a>`
                : ''
            }
            ${
              guild.discord_url
                ? `<a class="btn btn-ghost" href="${guild.discord_url}" target="_blank" rel="noopener">Discord</a>`
                : ''
            }
          </div>
        </div>
      </div>
    </div>

    <section class="section">
      <div class="section-head">
        <div>
          <div class="section-title">Участники</div>
          <div class="section-sub">${members.length} человек</div>
        </div>
      </div>
      <div class="members-list">
        ${members.map((m) => renderMemberRow(m, canManage, isLeader)).join('')}
      </div>
    </section>
  `;

  applyTheme(viewEl, guild.theme_color, guild.button_color, guild.button_style);
  bindGuildEvents();
}

function renderMemberRow(member, canManage, isLeader) {
  const roleLabels = {
    leader: 'Глава',
    officer: 'Офицер',
    member: 'Участник',
  };

  const role = member.role || 'member';
  const isSelf = member.user_id === state.user?.id;

  return `
    <div class="member-row">
      <img class="member-avatar" src="https://ui-avatars.com/api/?name=${encodeURIComponent(
        member.nickname || 'U'
      )}&background=1a2332&color=fff" alt="${member.nickname}" />
      <div class="member-info">
        <div class="member-name">${member.nickname || 'Игрок'} ${
    isSelf ? '(вы)' : ''
  }</div>
        <div class="member-role">${roleLabels[role] || role}</div>
      </div>
      ${
        canManage && !isSelf
          ? `<div class="member-actions">
              ${
                isLeader && role !== 'officer'
                  ? `<button class="btn btn-mini" data-action="set-role" data-member-id="${member.id}" data-role="officer">Офицер</button>`
                  : ''
              }
              ${
                isLeader && role !== 'member'
                  ? `<button class="btn btn-mini" data-action="set-role" data-member-id="${member.id}" data-role="member">Участник</button>`
                  : ''
              }
              <button class="btn btn-mini" data-action="kick-member" data-member-id="${member.id}">✕</button>
            </div>`
          : ''
      }
    </div>
  `;
}

function bindGuildEvents() {
  // Обработчики уже навешаны через делегирование в document
}

/* ---------- RENDER: PROFILE ---------- */
async function renderProfile() {
  if (!state.user) {
    viewEl.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔒</div>
        <p>Войдите, чтобы увидеть профиль</p>
        <button class="btn btn-primary mt-16" data-action="open-auth">Войти</button>
      </div>
    `;
    return;
  }

  const profile = state.profile;

  const { data: myGames } = await sb
    .from('games')
    .select('*')
    .eq('created_by', state.user.id)
    .order('created_at', { ascending: false });

  const { data: myMemberships } = await sb
    .from('guild_members')
    .select('guild_id, role')
    .eq('user_id', state.user.id);

  const guildIds = (myMemberships || []).map((m) => m.guild_id);

  let myGuilds = [];
  if (guildIds.length) {
    const { data: guildsData } = await sb
      .from('guilds')
      .select('*')
      .in('id', guildIds);
    myGuilds = (guildsData || []).map((g) => {
      const membership = myMemberships.find((m) => m.guild_id === g.id);
      return { ...g, my_role: membership?.role || 'member' };
    });
  }

  viewEl.innerHTML = `
    <div class="glass" style="padding: 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
      <img class="user-avatar" style="width: 88px; height: 88px;" src="${
        profile?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          profile?.username || 'GGP'
        )}&background=7c3aed&color=fff&size=128`
      }" alt="avatar" />
      <div>
        <h1 style="font-family: var(--font-display); font-size: 32px; font-weight: 700;">${
          profile?.display_name || profile?.username || 'Игрок'
        }</h1>
        <p class="text-dim" style="margin-top: 4px;">@${
          profile?.username || 'user'
        } · ${state.user.email}</p>
        ${
          state.isPlatformOwner
            ? '<span class="badge-gold badge" style="margin-top: 8px;">Владелец платформы</span>'
            : ''
        }
      </div>
    </div>

    <section class="section">
      <div class="section-head">
        <div class="section-title">Мои игры</div>
        <button class="btn btn-primary" data-action="open-create-game">Создать игру</button>
      </div>
      ${
        myGames?.length
          ? `<div class="cards">${myGames.map(renderGameCard).join('')}</div>`
          : `<div class="empty"><div class="empty-icon">🎮</div><p>Вы ещё не создали ни одной игры</p></div>`
      }
    </section>

    <section class="section">
      <div class="section-head">
        <div class="section-title">Мои гильдии</div>
      </div>
      ${
        myGuilds.length
          ? `<div class="cards">${myGuilds.map(renderGuildCard).join('')}</div>`
          : `<div class="empty"><div class="empty-icon">🛡️</div><p>Вы не состоите в гильдиях</p></div>`
      }
    </section>
  `;

  bindCardEvents();
}

/* ---------- ROUTER ---------- */
function navigate(hash) {
  if (!hash) hash = '#/home';
  window.location.hash = hash;
}

async function router() {
  const hash = window.location.hash || '#/home';
  const parts = hash.replace('#/', '').split('/');
  const route = parts[0] || 'home';
  const param = parts[1] || null;

  $$('#main-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === route);
  });

  viewEl.style.removeProperty('--accent');
  viewEl.style.removeProperty('--accent-2');
  viewEl.dataset.buttonStyle = '';

  switch (route) {
    case 'home':
      await renderHome();
      break;
    case 'games':
      await renderGamesList();
      break;
    case 'game':
      if (param) await renderGamePage(param);
      else await renderGamesList();
      break;
    case 'guilds':
      await renderGuildsList();
      break;
    case 'guild':
      if (param) await renderGuildPage(param);
      else await renderGuildsList();
      break;
    case 'profile':
      await renderProfile();
      break;
    default:
      await renderHome();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- GLOBAL EVENT DELEGATION ---------- */
document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    case 'open-auth':
      openModal('modal-auth');
      break;

    case 'close-modal':
      closeModal(target.dataset.modal);
      break;

    case 'logout':
      await handleLogout();
      break;

    case 'open-create-game':
      if (!state.user) {
        toast('Войдите, чтобы создать игру', 'error');
        openModal('modal-auth');
        return;
      }
      $('#game-form').reset();
      clearStatus($('#game-status'));
      openModal('modal-game');
      break;

    case 'open-create-guild':
      if (!state.user) {
        toast('Войдите, чтобы создать гильдию', 'error');
        openModal('modal-auth');
        return;
      }
      $('#guild-form').reset();
      $('#guild-game-id').value = target.dataset.gameId || '';
      clearStatus($('#guild-status'));
      openModal('modal-guild');
      break;

    case 'open-guild-settings':
      openGuildSettings();
      break;

    case 'join-guild':
      await joinGuild(target.dataset.guildId);
      break;

    case 'leave-guild':
      await leaveGuild(target.dataset.guildId);
      break;

    case 'set-role':
      await updateMemberRole(target.dataset.memberId, target.dataset.role);
      break;

    case 'kick-member':
      if (confirm('Исключить участника?')) {
        await kickMember(target.dataset.memberId);
      }
      break;

    default:
      break;
  }
});

/* ---------- AUTH TABS ---------- */
$$('[data-auth-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.authTab;
    const form = $('#auth-form');
    form.dataset.mode = mode;

    $$('[data-auth-tab]').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const nicknameField = $('#field-nickname');
    const submitBtn = $('#auth-submit');
    const title = $('#auth-title');

    if (mode === 'register') {
      nicknameField.classList.remove('hidden');
      submitBtn.textContent = 'Зарегистрироваться';
      title.textContent = 'Регистрация в GGP';
    } else {
      nicknameField.classList.add('hidden');
      submitBtn.textContent = 'Войти';
      title.textContent = 'Вход в GGP';
    }

    clearStatus($('#auth-status'));
  });
});

/* ---------- INIT ---------- */
async function init() {
  footerYear.textContent = new Date().getFullYear();

  $('#auth-form').dataset.mode = 'login';

  $('#auth-form').addEventListener('submit', handleAuthSubmit);
  $('#game-form').addEventListener('submit', createGame);
  $('#guild-form').addEventListener('submit', createGuild);
  $('#guild-settings-form').addEventListener('submit', saveGuildSettings);

  await initAuth();

  window.addEventListener('hashchange', router);
  await router();
}

init().catch((err) => {
  console.error('init error:', err);
  viewEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>Ошибка загрузки. Проверьте консоль.</p></div>`;
});
