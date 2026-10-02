/* ============================================================
   GGP — Game Guild Platform
   Vanilla JS + Supabase SPA — Phase 2A
   ============================================================ */

/* ---------- SUPABASE INIT ---------- */
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
  guildApplications: [],
  guildBans: [],
  guildHistory: [],
  guildTab: 'members',
  notifications: [],
  unreadCount: 0,
  isPlatformAdmin: false,
  notifPanelOpen: false,
};

/* ---------- DOM HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const viewEl = $('#view');
const btnLogin = $('#btn-login');
const userChip = $('#user-chip');
const userName = $('#user-name');
const userAvatar = $('#user-avatar');
const btnLogout = $('#btn-logout');
const btnNotifications = $('#btn-notifications');
const notifCountEl = $('#notif-count');
const notifPanel = $('#notif-panel');
const notifList = $('#notif-list');
const toastsEl = $('#toasts');
const footerYear = $('#footer-year');
const navAdmin = $('#nav-admin');

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
    await loadNotifications();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      state.user = session.user;
      await loadProfile(session.user.id);
      updateAuthUI();
      await loadNotifications();
      closeModal('modal-auth');
      toast('Вы вошли в аккаунт', 'success');
      navigate(window.location.hash || '#/home');
    }
    if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      state.isPlatformAdmin = false;
      state.notifications = [];
      state.unreadCount = 0;
      updateAuthUI();
      renderNotificationsPanel();
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
    state.isPlatformAdmin = !!data.is_platform_admin;
  } else {
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
    if (createError) console.error('create profile error:', createError);
    else state.profile = created;
  }
}

function updateAuthUI() {
  if (state.user) {
    btnLogin.classList.add('hidden');
    userChip.classList.remove('hidden');
    btnNotifications.classList.remove('hidden');
    userName.textContent =
      state.profile?.display_name || state.profile?.username || 'Игрок';
    userAvatar.src =
      state.profile?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        state.profile?.username || 'GGP'
      )}&background=7c3aed&color=fff`;

    if (state.isPlatformAdmin) navAdmin.classList.remove('hidden');
    else navAdmin.classList.add('hidden');
  } else {
    btnLogin.classList.remove('hidden');
    userChip.classList.add('hidden');
    btnNotifications.classList.add('hidden');
    navAdmin.classList.add('hidden');
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
    setStatus(statusEl, 'Пароль минимум 6 символов', 'error');
    return;
  }

  setLoading(submitBtn, true, isRegister ? 'Регистрация...' : 'Вход...');

  try {
    if (isRegister) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      });
      if (error) throw error;
      if (data.user) {
        await sb.from('profiles').upsert({
          id: data.user.id,
          username: nickname,
          display_name: nickname,
          avatar: '',
        });
        setStatus(statusEl, 'Регистрация успешна!', 'success');
        toast('Регистрация успешна!', 'success');
      }
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) setStatus(statusEl, 'Вход выполнен!', 'success');
    }
  } catch (err) {
    console.error('auth error:', err);
    let msg = err.message || 'Ошибка авторизации';
    if (msg.includes('Invalid login credentials')) msg = 'Неверный email или пароль';
    if (msg.includes('already registered')) msg = 'Этот email уже зарегистрирован';
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
    const [logoUrl, bannerUrl, bgUrl] = await Promise.all([
      $('#game-logo').files[0] ? uploadFile($('#game-logo').files[0], 'game-logos') : null,
      $('#game-banner').files[0] ? uploadFile($('#game-banner').files[0], 'game-banners') : null,
      $('#game-background').files[0] ? uploadFile($('#game-background').files[0], 'game-banners', 'backgrounds/') : null,
    ]);

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
    .from('games').select('*').eq('id', id).maybeSingle();
  if (error || !game) {
    console.error('loadGame error:', error);
    return null;
  }

  const { data: guilds } = await sb
    .from('guilds').select('*').eq('game_id', game.id)
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
    .from('guilds').select('*, games(name)')
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
  const joinMode = $('#guild-join-mode').value || 'open';
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
    const [logoUrl, bannerUrl, bgUrl, flagUrl] = await Promise.all([
      $('#guild-logo').files[0] ? uploadFile($('#guild-logo').files[0], 'guild-logos') : null,
      $('#guild-banner').files[0] ? uploadFile($('#guild-banner').files[0], 'guild-banners') : null,
      $('#guild-background').files[0] ? uploadFile($('#guild-background').files[0], 'guild-banners', 'backgrounds/') : null,
      $('#guild-faction-flag').files[0] ? uploadFile($('#guild-faction-flag').files[0], 'guild-logos', 'flags/') : null,
    ]);

    const { data, error } = await sb
      .from('guilds')
      .insert({
        game_id: gameId,
        name, tag, description,
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
        join_mode: joinMode,
      })
      .select()
      .single();

    if (error) throw error;

    await sb.from('guild_members').insert({
      guild_id: data.id,
      user_id: state.user.id,
      game_id: gameId,
      nickname: state.profile?.display_name || state.profile?.username || 'Лидер',
      role: 'leader',
    });

    await sb.rpc('log_guild_action', {
      gid: data.id,
      act: 'created',
      target: state.user.id,
      meta: null,
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
    .from('guild_members').select('*').eq('guild_id', guild.id)
    .order('joined_at', { ascending: true });

  state.currentGuild = guild;
  state.guildMembers = members || [];
  return guild;
}

async function loadGuildApplications(guildId) {
  const { data, error } = await sb
    .from('guild_applications')
    .select('*')
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('loadGuildApplications error:', error);
    state.guildApplications = [];
    return [];
  }
  state.guildApplications = data || [];
  return state.guildApplications;
}

async function loadGuildBans(guildId) {
  const { data, error } = await sb
    .from('guild_bans').select('*').eq('guild_id', guildId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('loadGuildBans error:', error);
    state.guildBans = [];
    return [];
  }
  state.guildBans = data || [];
  return state.guildBans;
}

async function loadGuildHistory(guildId) {
  const { data, error } = await sb
    .from('guild_history').select('*').eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('loadGuildHistory error:', error);
    state.guildHistory = [];
    return [];
  }
  state.guildHistory = data || [];
  return state.guildHistory;
}

/* ---------- GUILD ACTIONS ---------- */
async function joinGuildDirect(guildId) {
  if (!state.user) {
    toast('Войдите, чтобы вступить', 'error');
    openModal('modal-auth');
    return;
  }

  const { data, error } = await sb.rpc('join_guild_direct', { gid: guildId });
  if (error) {
    console.error('joinGuildDirect error:', error);
    toast('Ошибка вступления', 'error');
    return;
  }
  if (data?.error) {
    const msgs = {
      not_authenticated: 'Требуется вход',
      guild_not_found: 'Гильдия не найдена',
      not_open: 'Вступление только по заявке',
      banned: 'Вы заблокированы в этой гильдии',
      already_member: 'Вы уже в гильдии',
    };
    toast(msgs[data.error] || 'Ошибка вступления', 'error');
    return;
  }

  toast('Вы вступили в гильдию!', 'success');
  await loadGuild(guildId);
  renderGuildPage(guildId);
}

async function submitApplication(guildId, message) {
  const { data, error } = await sb.rpc('apply_to_guild', {
    gid: guildId,
    msg: message || null,
  });
  if (error) throw error;
  if (data?.error) {
    const msgs = {
      not_authenticated: 'Требуется вход',
      guild_not_found: 'Гильдия не найдена',
      closed: 'Гильдия закрыта для вступления',
      banned: 'Вы заблокированы в этой гильдии',
      already_member: 'Вы уже в гильдии',
      already_applied: 'Заявка уже отправлена',
    };
    throw new Error(msgs[data.error] || 'Ошибка заявки');
  }
  return data;
}

async function resolveApplication(appId, approve) {
  const { data, error } = await sb.rpc('resolve_application', {
    app_id: appId,
    approve,
  });
  if (error) {
    console.error('resolveApplication error:', error);
    toast('Ошибка обработки заявки', 'error');
    return;
  }
  if (data?.error) {
    const msgs = {
      not_authenticated: 'Требуется вход',
      application_not_found: 'Заявка не найдена',
      forbidden: 'Нет прав',
      already_resolved: 'Заявка уже обработана',
      already_member: 'Пользователь уже в гильдии',
    };
    toast(msgs[data.error] || 'Ошибка', 'error');
    return;
  }
  toast(approve ? 'Заявка принята' : 'Заявка отклонена', 'success');
  await loadGuildApplications(state.currentGuild.id);
  await loadGuild(state.currentGuild.id);
  renderGuildPage(state.currentGuild.id);
}

async function leaveGuild(guildId) {
  if (!state.user) return;
  const myMember = state.guildMembers.find((m) => m.user_id === state.user.id);
  if (!myMember) {
    toast('Вы не в этой гильдии', 'info');
    return;
  }

  if (myMember.role === 'leader') {
    const others = state.guildMembers.filter((m) => m.user_id !== state.user.id);
    if (others.length === 0) {
      const ok = confirm(
        'Вы последний участник. После выхода гильдия останется без участников, но её сможет восстановить создатель. Продолжить?'
      );
      if (!ok) return;
    } else {
      const ok = confirm(
        'Вы глава гильдии. При выходе лидерство автоматически перейдёт следующему офицеру или старейшему участнику. Продолжить?'
      );
      if (!ok) return;
    }
  }

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

  try {
    await sb.rpc('log_guild_action', {
      gid: guildId, act: 'leave', target: state.user.id, meta: null,
    });
  } catch (_) {}

  toast('Вы покинули гильдию', 'info');
  await loadGuild(guildId);
  renderGuildPage(guildId);
}

async function changeMemberRole(memberId, newRole) {
  const { data, error } = await sb.rpc('change_member_role', {
    member_id: memberId,
    new_role: newRole,
  });
  if (error) {
    console.error('changeMemberRole error:', error);
    toast('Ошибка изменения роли', 'error');
    return;
  }
  if (data?.error) {
    toast('Не удалось изменить роль', 'error');
    return;
  }
  toast('Роль обновлена', 'success');
  await loadGuild(state.currentGuild.id);
  await loadGuildHistory(state.currentGuild.id);
  renderGuildPage(state.currentGuild.id);
}

async function kickMember(memberId) {
  if (!confirm('Исключить участника?')) return;
  const target = state.guildMembers.find((m) => m.id === memberId);
  if (!target) return;

  const { error } = await sb
    .from('guild_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('kickMember error:', error);
    toast('Ошибка исключения', 'error');
    return;
  }

  try {
    await sb.rpc('log_guild_action', {
      gid: state.currentGuild.id,
      act: 'kick',
      target: target.user_id,
      meta: null,
    });
    await sb.rpc('notify_user', {
      uid: target.user_id,
      ntype: 'kicked',
      ntitle: 'Вас исключили из гильдии',
      nbody: 'Гильдия "' + state.currentGuild.name + '" исключила вас.',
      nlink: '#/guilds',
    });
  } catch (_) {}

  toast('Участник исключён', 'info');
  await loadGuild(state.currentGuild.id);
  await loadGuildHistory(state.currentGuild.id);
  renderGuildPage(state.currentGuild.id);
}

async function banUser(guildId, userId, reason) {
  const { data, error } = await sb.rpc('ban_user_from_guild', {
    gid: guildId,
    uid: userId,
    reason: reason || null,
  });
  if (error) {
    console.error('banUser error:', error);
    toast('Ошибка блокировки', 'error');
    return;
  }
  if (data?.error) {
    const msgs = {
      forbidden: 'Нет прав',
      cannot_ban_creator: 'Нельзя заблокировать создателя гильдии',
    };
    toast(msgs[data.error] || 'Ошибка', 'error');
    return;
  }
  toast('Игрок заблокирован', 'success');
  await loadGuild(guildId);
  await loadGuildBans(guildId);
  await loadGuildHistory(guildId);
  renderGuildPage(guildId);
}

async function unbanUser(guildId, userId) {
  const { data, error } = await sb.rpc('unban_user_from_guild', {
    gid: guildId,
    uid: userId,
  });
  if (error) {
    console.error('unbanUser error:', error);
    toast('Ошибка разблокировки', 'error');
    return;
  }
  if (data?.error) {
    toast('Не удалось разблокировать', 'error');
    return;
  }
  toast('Игрок разблокирован', 'success');
  await loadGuildBans(guildId);
  await loadGuildHistory(guildId);
  renderGuildPage(guildId);
}

async function transferLeadership(guildId, newLeaderUid) {
  const { data, error } = await sb.rpc('transfer_leadership', {
    gid: guildId,
    new_leader_uid: newLeaderUid,
  });
  if (error) {
    console.error('transferLeadership error:', error);
    toast('Ошибка передачи главы', 'error');
    return;
  }
  if (data?.error) {
    const msgs = {
      forbidden: 'Нет прав',
      not_member: 'Пользователь не в гильдии',
    };
    toast(msgs[data.error] || 'Ошибка', 'error');
    return;
  }
  toast('Глава передан', 'success');
  await loadGuild(guildId);
  await loadGuildHistory(guildId);
  renderGuildPage(guildId);
}

async function dissolveGuild(guildId) {
  if (!confirm('Распустить гильдию? Это действие необратимо.')) return;
  const ok = confirm('Точно распустить? Все участники и данные будут удалены.');
  if (!ok) return;

  const { data, error } = await sb.rpc('dissolve_guild', { gid: guildId });
  if (error) {
    console.error('dissolveGuild error:', error);
    toast('Ошибка роспуска', 'error');
    return;
  }
  if (data?.error) {
    toast('Не удалось распустить', 'error');
    return;
  }
  toast('Гильдия распущена', 'info');
  navigate('#/guilds');
}

/* ---------- REPORTS ---------- */
async function submitReport(type, id, reason) {
  const { data, error } = await sb.rpc('create_report', {
    ttype: type,
    tid: id,
    reason_text: reason,
  });
  if (error) throw error;
  if (data?.error) throw new Error('Не удалось отправить жалобу');
  return data;
}

/* ---------- NOTIFICATIONS ---------- */
async function loadNotifications() {
  if (!state.user) {
    state.notifications = [];
    state.unreadCount = 0;
    renderNotificationsPanel();
    return;
  }
  const { data, error } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) {
    console.error('loadNotifications error:', error);
    return;
  }
  state.notifications = data || [];
  state.unreadCount = state.notifications.filter((n) => !n.is_read).length;
  renderNotificationsPanel();
}

function renderNotificationsPanel() {
  if (!notifCountEl || !notifList) return;

  if (state.unreadCount > 0) {
    notifCountEl.textContent = state.unreadCount > 9 ? '9+' : state.unreadCount;
    notifCountEl.classList.remove('hidden');
  } else {
    notifCountEl.classList.add('hidden');
  }

  if (!state.notifications.length) {
    notifList.innerHTML = `<div class="notif-empty">Уведомлений нет</div>`;
    return;
  }

  notifList.innerHTML = state.notifications
    .map(
      (n) => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}" data-link="${n.link || ''}">
        <div class="notif-item-title">${escapeHtml(n.title || '')}</div>
        <div class="notif-item-body">${escapeHtml(n.body || '')}</div>
        <div class="notif-item-date">${formatDate(n.created_at)}</div>
      </div>
    `
    )
    .join('');
}

async function markNotificationRead(id) {
  const { error } = await sb
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) {
    console.error('markNotificationRead error:', error);
    return;
  }
  const n = state.notifications.find((x) => x.id === id);
  if (n) n.is_read = true;
  state.unreadCount = state.notifications.filter((x) => !x.is_read).length;
  renderNotificationsPanel();
}

async function markAllRead() {
  if (!state.user) return;
  const { error } = await sb
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', state.user.id)
    .eq('is_read', false);
  if (error) {
    console.error('markAllRead error:', error);
    toast('Ошибка', 'error');
    return;
  }
  state.notifications.forEach((n) => (n.is_read = true));
  state.unreadCount = 0;
  renderNotificationsPanel();
  toast('Все прочитаны', 'success');
}

/* ---------- HELPERS ---------- */
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
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  );
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function roleLabel(role) {
  return (
    { leader: 'Глава', officer: 'Офицер', member: 'Участник' }[role] || 'Участник'
  );
}

function roleBadge(role) {
  return `<span class="role-badge role-${role || 'member'}">${roleLabel(role)}</span>`;
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
        ${game.banner_url ? `<img src="${game.banner_url}" alt="" loading="lazy" />` : ''}
        ${game.logo_url ? `<img class="card-logo" src="${game.logo_url}" alt="" />` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(game.name)}</div>
        <div class="card-desc">${escapeHtml(game.description || 'Без описания')}</div>
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
        ${guild.banner_url ? `<img src="${guild.banner_url}" alt="" loading="lazy" />` : ''}
        ${guild.logo_url ? `<img class="card-logo" src="${guild.logo_url}" alt="" />` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(guild.name)} ${guild.tag ? `<span class="text-dim">[${escapeHtml(guild.tag)}]</span>` : ''}</div>
        <div class="card-desc">${escapeHtml(guild.description || 'Без описания')}</div>
        <div class="card-meta">
          <span class="badge">👥 ${guild.members_count || 0}</span>
          ${guild.faction_name ? `<span class="badge-gold badge">${escapeHtml(guild.faction_name)}</span>` : ''}
          ${guild.games?.name ? `<span class="badge-blue badge">${escapeHtml(guild.games.name)}</span>` : ''}
        </div>
      </div>
    </article>
  `;
}

function bindCardEvents() {
  $$('.card[data-game-id]').forEach((card) => {
    card.addEventListener('click', () => navigate(`#/game/${card.dataset.gameId}`));
  });
  $$('.card[data-guild-id]').forEach((card) => {
    card.addEventListener('click', () => navigate(`#/guild/${card.dataset.guildId}`));
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
        ${game.logo_url ? `<img class="page-logo" src="${game.logo_url}" alt="" />` : ''}
        <div class="page-info">
          <h1>${escapeHtml(game.name)}</h1>
          <div class="tagline">${escapeHtml(game.description || 'Игровое сообщество')}</div>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="open-create-guild" data-game-id="${game.id}">Создать гильдию</button>
            ${game.website_url ? `<a class="btn btn-ghost" href="${game.website_url}" target="_blank" rel="noopener">Сайт</a>` : ''}
            ${game.discord_url ? `<a class="btn btn-ghost" href="${game.discord_url}" target="_blank" rel="noopener">Discord</a>` : ''}
            ${state.user ? `<button class="btn btn-ghost" data-action="report" data-report-type="game" data-report-id="${game.id}" data-report-label="${escapeHtml(game.name)}">Пожаловаться</button>` : ''}
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
  const isCreator = !!state.user && guild.created_by === state.user.id;
  const canManage = isLeader || isOfficer || isCreator;
  const isMember = !!myMember;

  // Проверка блокировки
  let isBanned = false;
  if (state.user) {
    const { data: banRow } = await sb
      .from('guild_bans')
      .select('id')
      .eq('guild_id', guild.id)
      .eq('user_id', state.user.id)
      .maybeSingle();
    isBanned = !!banRow;
  }

  // Проверка активной заявки
  let hasPendingApp = false;
  if (state.user && !isMember) {
    const { data: appRow } = await sb
      .from('guild_applications')
      .select('id')
      .eq('guild_id', guild.id)
      .eq('user_id', state.user.id)
      .eq('status', 'pending')
      .maybeSingle();
    hasPendingApp = !!appRow;
  }

  // Кнопка вступления
  let joinButton = '';
  if (!state.user) {
    joinButton = `<button class="btn btn-primary" data-action="open-auth">Войти</button>`;
  } else if (isMember) {
    joinButton = `<button class="btn btn-ghost" data-action="leave-guild" data-guild-id="${guild.id}">Покинуть</button>`;
  } else if (isBanned) {
    joinButton = `<button class="btn btn-ghost" disabled>Вы заблокированы</button>`;
  } else if (hasPendingApp) {
    joinButton = `<button class="btn btn-ghost" disabled>Заявка отправлена</button>`;
  } else if (guild.join_mode === 'open') {
    joinButton = `<button class="btn btn-primary" data-action="join-direct" data-guild-id="${guild.id}">Вступить</button>`;
  } else if (guild.join_mode === 'application') {
    joinButton = `<button class="btn btn-primary" data-action="open-apply" data-guild-id="${guild.id}" data-guild-name="${escapeHtml(guild.name)}">Подать заявку</button>`;
  } else {
    joinButton = `<button class="btn btn-ghost" disabled>Закрытая гильдия</button>`;
  }

  const joinModeLabels = { open: 'Открытая', application: 'По заявке', closed: 'Закрытая' };
  const joinModeClass = `join-mode-${guild.join_mode || 'open'}`;

  const bgStyle = guild.background_url
    ? `background-image: linear-gradient(135deg, rgba(124,58,237,0.25), rgba(5,7,13,0.92)), url('${guild.background_url}');`
    : '';

  // Вкладки
  const showAppsTab = canManage;
  const showBansTab = canManage;

  viewEl.innerHTML = `
    <div class="page-banner" style="${bgStyle}">
      <div class="page-banner-content">
        ${guild.logo_url ? `<img class="page-logo" src="${guild.logo_url}" alt="" />` : ''}
        <div class="page-info">
          <h1>${escapeHtml(guild.name)} ${guild.tag ? `<span class="text-dim">[${escapeHtml(guild.tag)}]</span>` : ''}</h1>
          <div class="tagline">
            <span class="join-mode-badge ${joinModeClass}">${joinModeLabels[guild.join_mode] || 'Открытая'}</span>
            ${guild.faction_name ? ` <span class="badge-gold badge">${escapeHtml(guild.faction_name)}</span>` : ''}
            ${guild.games?.name ? ` <span class="badge-blue badge">${escapeHtml(guild.games.name)}</span>` : ''}
          </div>
          <div class="tagline">${escapeHtml(guild.description || 'Описание отсутствует')}</div>
          <div class="page-actions">
            ${joinButton}
            ${canManage ? `<button class="btn btn-ghost" data-action="open-guild-settings">Настройки</button>` : ''}
            ${isLeader || isCreator ? `<button class="btn btn-ghost" data-action="transfer-leader">Передать главу</button>` : ''}
            ${isCreator ? `<button class="btn btn-ghost" data-action="dissolve-guild" data-guild-id="${guild.id}">Распустить</button>` : ''}
            ${guild.website_url ? `<a class="btn btn-ghost" href="${guild.website_url}" target="_blank" rel="noopener">Сайт</a>` : ''}
            ${guild.discord_url ? `<a class="btn btn-ghost" href="${guild.discord_url}" target="_blank" rel="noopener">Discord</a>` : ''}
            ${state.user ? `<button class="btn btn-ghost" data-action="report" data-report-type="guild" data-report-id="${guild.id}" data-report-label="${escapeHtml(guild.name)}">Пожаловаться</button>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="page-tabs" id="guild-tabs">
      <button class="page-tab ${state.guildTab === 'members' ? 'active' : ''}" data-guild-tab="members">Участники <span class="badge-count">${members.length}</span></button>
      ${showAppsTab ? `<button class="page-tab ${state.guildTab === 'applications' ? 'active' : ''}" data-guild-tab="applications">Заявки <span class="badge-count" id="app-count">…</span></button>` : ''}
      ${showBansTab ? `<button class="page-tab ${state.guildTab === 'bans' ? 'active' : ''}" data-guild-tab="bans">Заблокированные</button>` : ''}
      <button class="page-tab ${state.guildTab === 'history' ? 'active' : ''}" data-guild-tab="history">История</button>
    </div>

    <section class="section" id="guild-tab-content">
      <div class="loader-block"><div class="spinner"></div></div>
    </section>
  `;

  applyTheme(viewEl, guild.theme_color, guild.button_color, guild.button_style);

  // Загружаем данные для активной вкладки
  await renderGuildTab(state.guildTab);
}

async function renderGuildTab(tab) {
  state.guildTab = tab;
  const guild = state.currentGuild;
  if (!guild) return;

  const contentEl = $('#guild-tab-content');
  if (!contentEl) return;

  const myMember = state.guildMembers.find((m) => m.user_id === state.user?.id);
  const isLeader = myMember?.role === 'leader';
  const isOfficer = myMember?.role === 'officer';
  const isCreator = !!state.user && guild.created_by === state.user.id;
  const canManage = isLeader || isOfficer || isCreator;

  if (tab === 'members') {
    contentEl.innerHTML = `
      <div class="subhead">
        <div class="subhead-title">Участники (${state.guildMembers.length})</div>
      </div>
      <div class="members-list">
        ${state.guildMembers
          .map((m) => renderMemberRow(m, canManage, isLeader, isCreator, guild))
          .join('')}
      </div>
    `;
  } else if (tab === 'applications') {
    contentEl.innerHTML = `<div class="loader-block"><div class="spinner"></div></div>`;
    await loadGuildApplications(guild.id);
    const apps = state.guildApplications;

    const appCountEl = $('#app-count');
    if (appCountEl) appCountEl.textContent = apps.length;

    contentEl.innerHTML = `
      <div class="subhead">
        <div class="subhead-title">Входящие заявки (${apps.length})</div>
      </div>
      ${
        apps.length
          ? `<div class="app-list">${apps.map(renderApplicationRow).join('')}</div>`
          : `<div class="empty"><div class="empty-icon">📭</div><p>Нет новых заявок</p></div>`
      }
    `;
  } else if (tab === 'bans') {
    contentEl.innerHTML = `<div class="loader-block"><div class="spinner"></div></div>`;
    await loadGuildBans(guild.id);
    const bans = state.guildBans;

    contentEl.innerHTML = `
      <div class="subhead">
        <div class="subhead-title">Заблокированные (${bans.length})</div>
      </div>
      ${
        bans.length
          ? `<div class="members-list">${bans.map(renderBanRow).join('')}</div>`
          : `<div class="empty"><div class="empty-icon">🚫</div><p>Никто не заблокирован</p></div>`
      }
    `;
  } else if (tab === 'history') {
    contentEl.innerHTML = `<div class="loader-block"><div class="spinner"></div></div>`;
    await loadGuildHistory(guild.id);
    const hist = state.guildHistory;

    contentEl.innerHTML = `
      <div class="subhead">
        <div class="subhead-title">История (${hist.length})</div>
      </div>
      ${
        hist.length
          ? `<div class="history-list">${hist.map(renderHistoryRow).join('')}</div>`
          : `<div class="empty"><div class="empty-icon">📜</div><p>Пока пусто</p></div>`
      }
    `;
  }
}

function renderMemberRow(member, canManage, isLeader, isCreator, guild) {
  const role = member.role || 'member';
  const isSelf = member.user_id === state.user?.id;
  const isGuildCreator = member.user_id === guild.created_by;

  let actions = '';
  if (canManage && !isSelf) {
    const promoteOfficer =
      isLeader && role === 'member'
        ? `<button class="btn btn-mini" data-action="set-role" data-member-id="${member.id}" data-role="officer">→ Офицер</button>`
        : '';
    const demoteMember =
      isLeader && role === 'officer'
        ? `<button class="btn btn-mini" data-action="set-role" data-member-id="${member.id}" data-role="member">→ Участник</button>`
        : '';
    const kickBtn = !isGuildCreator
      ? `<button class="btn btn-mini" data-action="kick-member" data-member-id="${member.id}">✕</button>`
      : '';
    const banBtn = !isGuildCreator
      ? `<button class="btn btn-mini" data-action="open-ban" data-user-id="${member.user_id}" data-user-nick="${escapeHtml(member.nickname || 'Игрок')}">🚫</button>`
      : '';
    const reportBtn = `<button class="btn btn-mini" data-action="report" data-report-type="user" data-report-id="${member.user_id}" data-report-label="${escapeHtml(member.nickname || 'Игрок')}">!</button>`;

    actions = `<div class="member-actions">${promoteOfficer}${demoteMember}${banBtn}${kickBtn}${reportBtn}</div>`;
  } else if (!canManage && !isSelf && state.user) {
    actions = `<div class="member-actions"><button class="btn btn-mini" data-action="report" data-report-type="user" data-report-id="${member.user_id}" data-report-label="${escapeHtml(member.nickname || 'Игрок')}">!</button></div>`;
  }

  return `
    <div class="member-row">
      <img class="member-avatar" src="https://ui-avatars.com/api/?name=${encodeURIComponent(member.nickname || 'U')}&background=1a2332&color=fff" alt="" />
      <div class="member-info">
        <div class="member-name">${escapeHtml(member.nickname || 'Игрок')} ${isSelf ? '(вы)' : ''} ${isGuildCreator ? '👑' : ''}</div>
        <div class="member-role">${roleBadge(role)} · с ${formatDate(member.joined_at)}</div>
      </div>
      ${actions}
    </div>
  `;
}

function renderApplicationRow(app) {
  return `
    <div class="app-row" data-app-id="${app.id}">
      <img class="member-avatar" src="https://ui-avatars.com/api/?name=${encodeURIComponent(app.user_id?.slice(0, 6) || 'U')}&background=1a2332&color=fff" alt="" />
      <div class="app-body">
        <div class="app-name">Пользователь ${escapeHtml(app.user_id?.slice(0, 8) || '')}</div>
        ${app.message ? `<div class="app-message">${escapeHtml(app.message)}</div>` : ''}
        <div class="app-date">${formatDateTime(app.created_at)}</div>
      </div>
      <div class="app-actions">
        <button class="btn btn-primary btn-mini" data-action="resolve-app" data-app-id="${app.id}" data-approve="1">Принять</button>
        <button class="btn btn-mini" data-action="resolve-app" data-app-id="${app.id}" data-approve="0">Отклонить</button>
      </div>
    </div>
  `;
}

function renderBanRow(ban) {
  return `
    <div class="member-row">
      <img class="member-avatar" src="https://ui-avatars.com/api/?name=${encodeURIComponent(ban.user_id?.slice(0, 6) || 'U')}&background=3a1f1f&color=fff" alt="" />
      <div class="member-info">
        <div class="member-name">Пользователь ${escapeHtml(ban.user_id?.slice(0, 8) || '')}</div>
        <div class="member-role">${ban.reason ? 'Причина: ' + escapeHtml(ban.reason) : 'Без причины'} · ${formatDate(ban.created_at)}</div>
      </div>
      <div class="member-actions">
        <button class="btn btn-mini" data-action="unban" data-user-id="${ban.user_id}">Разблокировать</button>
      </div>
    </div>
  `;
}

function renderHistoryRow(h) {
  const icons = {
    created: '✨',
    join: '➡️',
    leave: '⬅️',
    kick: '🥾',
    ban: '🚫',
    unban: '✅',
    role_changed: '🎖️',
    leadership_transferred: '👑',
    application_accepted: '✅',
    application_rejected: '❌',
    apply: '📨',
  };
  const labels = {
    created: 'создал(а) гильдию',
    join: 'вступил(а) в гильдию',
    leave: 'покинул(а) гильдию',
    kick: 'исключил(а) участника',
    ban: 'заблокировал(а) игрока',
    unban: 'разблокировал(а) игрока',
    role_changed: 'изменил(а) роль',
    leadership_transferred: 'передал(а) главу',
    application_accepted: 'принял(а) заявку',
    application_rejected: 'отклонил(а) заявку',
    apply: 'подал(а) заявку',
  };

  const meta = h.meta || {};
  let extra = '';
  if (h.action === 'role_changed' && meta.from && meta.to) {
    extra = ` (${roleLabel(meta.from)} → ${roleLabel(meta.to)})`;
  } else if (h.action === 'ban' && meta.reason) {
    extra = ` — ${escapeHtml(meta.reason)}`;
  }

  const actor = h.actor_id ? `<span class="text-dim">${h.actor_id.slice(0, 8)}</span>` : '<span class="text-dim">система</span>';
  const target = h.target_user_id ? ` → <span class="text-dim">${h.target_user_id.slice(0, 8)}</span>` : '';

  return `
    <div class="history-row">
      <div class="history-icon">${icons[h.action] || '•'}</div>
      <div class="history-text">
        ${actor} ${labels[h.action] || h.action}${target}${extra}
      </div>
      <div class="history-date">${formatDateTime(h.created_at)}</div>
    </div>
  `;
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
    .from('games').select('*').eq('created_by', state.user.id)
    .order('created_at', { ascending: false });

  const { data: myMemberships } = await sb
    .from('guild_members').select('guild_id, role').eq('user_id', state.user.id);

  const guildIds = (myMemberships || []).map((m) => m.guild_id);
  let myGuilds = [];
  if (guildIds.length) {
    const { data: guildsData } = await sb
      .from('guilds').select('*').in('id', guildIds);
    myGuilds = (guildsData || []).map((g) => {
      const ms = myMemberships.find((m) => m.guild_id === g.id);
      return { ...g, my_role: ms?.role || 'member' };
    });
  }

  viewEl.innerHTML = `
    <div class="glass" style="padding: 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
      <img class="user-avatar" style="width: 88px; height: 88px;" src="${
        profile?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || 'GGP')}&background=7c3aed&color=fff&size=128`
      }" alt="avatar" />
      <div>
        <h1 style="font-family: var(--font-display); font-size: 32px; font-weight: 700;">${escapeHtml(profile?.display_name || profile?.username || 'Игрок')}</h1>
        <p class="text-dim" style="margin-top: 4px;">@${escapeHtml(profile?.username || 'user')} · ${escapeHtml(state.user.email || '')}</p>
        ${state.isPlatformAdmin ? '<span class="badge-gold badge" style="margin-top: 8px;">Админ платформы</span>' : ''}
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
    case 'home': await renderHome(); break;
    case 'games': await renderGamesList(); break;
    case 'game':
      if (param) await renderGamePage(param);
      else await renderGamesList();
      break;
    case 'guilds': await renderGuildsList(); break;
    case 'guild':
      if (param) await renderGuildPage(param);
      else await renderGuildsList();
      break;
    case 'profile': await renderProfile(); break;
    case 'admin':
      // Phase 2B — заглушка
      viewEl.innerHTML = `<div class="empty"><div class="empty-icon">🛠️</div><p>Админ-панель — этап 2B</p></div>`;
      break;
    default: await renderHome();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- GLOBAL EVENT DELEGATION ---------- */
document.addEventListener('click', async (e) => {
  // Клик по уведомлению
  const notifItem = e.target.closest('.notif-item');
  if (notifItem) {
    const id = notifItem.dataset.notifId;
    const link = notifItem.dataset.link;
    if (id) await markNotificationRead(id);
    if (link) {
      state.notifPanelOpen = false;
      notifPanel.classList.add('hidden');
      navigate(link);
    }
    return;
  }

  // Клик вне панели уведомлений — закрыть
  if (
    state.notifPanelOpen &&
    notifPanel &&
    !notifPanel.classList.contains('hidden') &&
    !e.target.closest('#notif-panel') &&
    !e.target.closest('#btn-notifications')
  ) {
    notifPanel.classList.add('hidden');
    state.notifPanelOpen = false;
  }

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
    case 'toggle-notifications': {
      state.notifPanelOpen = !state.notifPanelOpen;
      notifPanel.classList.toggle('hidden', !state.notifPanelOpen);
      if (state.notifPanelOpen) await loadNotifications();
      break;
    }
    case 'mark-all-read':
      await markAllRead();
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

    case 'join-direct':
      await joinGuildDirect(target.dataset.guildId);
      break;

    case 'open-apply':
      $('#apply-form').reset();
      $('#apply-guild-id').value = target.dataset.guildId || '';
      $('#apply-guild-name').textContent = target.dataset.guildName || '';
      clearStatus($('#apply-status'));
      openModal('modal-apply');
      break;

    case 'leave-guild':
      await leaveGuild(target.dataset.guildId);
      break;

    case 'set-role':
      await changeMemberRole(target.dataset.memberId, target.dataset.role);
      break;

    case 'kick-member':
      await kickMember(target.dataset.memberId);
      break;

    case 'open-ban':
      $('#ban-form').reset();
      $('#ban-guild-id').value = state.currentGuild?.id || '';
      $('#ban-user-id').value = target.dataset.userId || '';
      $('#ban-target-label').textContent = `Игрок: ${target.dataset.userNick || ''}`;
      clearStatus($('#ban-status'));
      openModal('modal-ban');
      break;

    case 'unban':
      await unbanUser(state.currentGuild.id, target.dataset.userId);
      break;

    case 'transfer-leader':
      await openTransferDialog();
      break;

    case 'dissolve-guild':
      await dissolveGuild(target.dataset.guildId);
      break;

    case 'resolve-app':
      await resolveApplication(target.dataset.appId, target.dataset.approve === '1');
      break;

    case 'report':
      $('#report-form').reset();
      $('#report-type').value = target.dataset.reportType || '';
      $('#report-id').value = target.dataset.reportId || '';
      $('#report-target-label').textContent = `${target.dataset.reportType}: ${target.dataset.reportLabel || ''}`;
      clearStatus($('#report-status'));
      openModal('modal-report');
      break;

    default:
      break;
  }
});

/* ---------- GUILD SETTINGS MODAL ---------- */
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
  $('#gs-join-mode').value = g.join_mode || 'open';

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
  const joinMode = $('#gs-join-mode').value;
  const statusEl = $('#gs-status');
  const submitBtn = $('#gs-submit');

  clearStatus(statusEl);
  if (!name) {
    setStatus(statusEl, 'Введите название', 'error');
    return;
  }
  setLoading(submitBtn, true, 'Сохранение...');

  try {
    const updates = {
      name, tag, description,
      faction_name: faction,
      website_url: website || null,
      discord_url: discord || null,
      theme_color: themeColor,
      button_color: buttonColor,
      button_style: buttonStyle,
      is_public: isPublic,
      join_mode: joinMode,
      updated_at: new Date().toISOString(),
    };

    if ($('#gs-logo').files[0]) updates.logo_url = await uploadFile($('#gs-logo').files[0], 'guild-logos');
    if ($('#gs-banner').files[0]) updates.banner_url = await uploadFile($('#gs-banner').files[0], 'guild-banners');
    if ($('#gs-background').files[0]) updates.background_url = await uploadFile($('#gs-background').files[0], 'guild-banners', 'backgrounds/');
    if ($('#gs-faction-flag').files[0]) updates.faction_flag_url = await uploadFile($('#gs-faction-flag').files[0], 'guild-logos', 'flags/');

    const { error } = await sb.from('guilds').update(updates).eq('id', id);
    if (error) throw error;

    try {
      await sb.rpc('log_guild_action', {
        gid: id, act: 'settings_updated', target: null, meta: null,
      });
    } catch (_) {}

    setStatus(statusEl, 'Сохранено!', 'success');
    toast('Настройки обновлены', 'success');
    closeModal('modal-guild-settings');
    await loadGuild(id);
    renderGuildPage(id);
  } catch (err) {
    console.error('saveGuildSettings error:', err);
    setStatus(statusEl, err.message || 'Ошибка', 'error');
    toast(err.message || 'Ошибка', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

/* ---------- TRANSFER LEADER DIALOG ---------- */
async function openTransferDialog() {
  if (!state.currentGuild || !state.user) return;
  const eligible = state.guildMembers.filter(
    (m) => m.user_id !== state.user.id && m.role !== 'leader'
  );

  if (!eligible.length) {
    toast('Нет других участников, кому передать главу', 'info');
    return;
  }

  const list = eligible
    .map((m, i) => `${i + 1}. ${m.nickname || 'Игрок'} (${roleLabel(m.role)})`)
    .join('\n');
  const answer = prompt(`Кому передать главу?\n\n${list}\n\nВведите номер:`);
  if (!answer) return;

  const idx = parseInt(answer, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= eligible.length) {
    toast('Неверный номер', 'error');
    return;
  }

  await transferLeadership(state.currentGuild.id, eligible[idx].user_id);
}

/* ---------- FORMS: APPLY / REPORT / BAN ---------- */
async function handleApplySubmit(e) {
  e.preventDefault();
  const guildId = $('#apply-guild-id').value;
  const message = $('#apply-message').value.trim();
  const statusEl = $('#apply-status');
  const submitBtn = $('#apply-submit');

  clearStatus(statusEl);
  setLoading(submitBtn, true, 'Отправка...');

  try {
    await submitApplication(guildId, message);
    setStatus(statusEl, 'Заявка отправлена!', 'success');
    toast('Заявка отправлена', 'success');
    closeModal('modal-apply');
    renderGuildPage(guildId);
  } catch (err) {
    setStatus(statusEl, err.message, 'error');
    toast(err.message, 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

async function handleReportSubmit(e) {
  e.preventDefault();
  const type = $('#report-type').value;
  const id = $('#report-id').value;
  const reason = $('#report-reason').value.trim();
  const statusEl = $('#report-status');
  const submitBtn = $('#report-submit');

  clearStatus(statusEl);
  if (!reason) {
    setStatus(statusEl, 'Введите причину', 'error');
    return;
  }
  setLoading(submitBtn, true, 'Отправка...');

  try {
    await submitReport(type, id, reason);
    setStatus(statusEl, 'Жалоба отправлена', 'success');
    toast('Жалоба отправлена', 'success');
    setTimeout(() => closeModal('modal-report'), 800);
  } catch (err) {
    setStatus(statusEl, err.message || 'Ошибка', 'error');
    toast(err.message || 'Ошибка', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

async function handleBanSubmit(e) {
  e.preventDefault();
  const guildId = $('#ban-guild-id').value;
  const userId = $('#ban-user-id').value;
  const reason = $('#ban-reason').value.trim();
  const statusEl = $('#ban-status');
  const submitBtn = $('#ban-submit');

  clearStatus(statusEl);
  setLoading(submitBtn, true, 'Блокировка...');

  try {
    await banUser(guildId, userId, reason);
    closeModal('modal-ban');
  } catch (err) {
    setStatus(statusEl, err.message || 'Ошибка', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

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

/* ---------- GUILD TABS (event delegation) ---------- */
document.addEventListener('click', async (e) => {
  const tab = e.target.closest('[data-guild-tab]');
  if (!tab) return;
  const tabName = tab.dataset.guildTab;
  $$('[data-guild-tab]').forEach((t) =>
    t.classList.toggle('active', t.dataset.guildTab === tabName)
  );
  await renderGuildTab(tabName);
});

/* ---------- INIT ---------- */
async function init() {
  footerYear.textContent = new Date().getFullYear();

  $('#auth-form').dataset.mode = 'login';

  $('#auth-form').addEventListener('submit', handleAuthSubmit);
  $('#game-form').addEventListener('submit', createGame);
  $('#guild-form').addEventListener('submit', createGuild);
  $('#guild-settings-form').addEventListener('submit', saveGuildSettings);
  $('#apply-form').addEventListener('submit', handleApplySubmit);
  $('#report-form').addEventListener('submit', handleReportSubmit);
  $('#ban-form').addEventListener('submit', handleBanSubmit);

  await initAuth();

  window.addEventListener('hashchange', router);
  await router();
}

init().catch((err) => {
  console.error('init error:', err);
  viewEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>Ошибка загрузки. Проверьте консоль.</p></div>`;
});
/* ============================================================
   v2.4.0 — ОБЩИЙ РЫНОК · ФИТИНГ · ПРИБЫЛЬ · FLASH · КОРАБЛИ
   Добавляется В КОНЕЦ app.js, после закрывающего (async () => {...})();
   ============================================================ */

/* ---------- STATE ---------- */
window._mkTrades     = [];
window._mkFilterType = 'all';
window._fitDraft     = { ship: '', name: '', modules: [] };
window._flashApps    = [];

/* ---------- ХЕЛПЕРЫ ---------- */
const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const _fmt = (n) => Number(n || 0).toLocaleString('ru-RU');

const _$$ = (sel) => document.querySelectorAll(sel);

/* ============================================================
   1. ОБЩИЙ РЫНОК
   ============================================================ */
async function loadCommonMarket() {
    const c1 = document.getElementById('mk-listings');
    const c2 = document.getElementById('mk-listings2');
    if (!c1 && !c2) return;

    if (c1) c1.innerHTML = '<div class="empty">Загрузка…</div>';
    if (c2) c2.innerHTML = '<div class="empty">Загрузка…</div>';

    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(300);

    if (error) {
        const html = `<div class="empty">Ошибка: ${_esc(error.message)}</div>`;
        if (c1) c1.innerHTML = html;
        if (c2) c2.innerHTML = html;
        return;
    }
    window._mkTrades = data || [];
    renderCommonMarket();
}

function renderCommonMarket() {
    const q     = (document.getElementById('mk-search')?.value || '').trim().toLowerCase();
    const sort  = (document.getElementById('mk-sort')?.value   || 'new');
    const q2    = (document.getElementById('mk-search2')?.value || '').trim().toLowerCase();
    const sort2 = (document.getElementById('mk-sort2')?.value   || 'new');

    const build = (query, sortBy) => {
        let list = window._mkTrades.slice();
        if (window._mkFilterType !== 'all') list = list.filter(t => t.type === window._mkFilterType);
        if (query) list = list.filter(t =>
            (t.name || '').toLowerCase().includes(query) ||
            (t.nickname || '').toLowerCase().includes(query) ||
            (t.port || '').toLowerCase().includes(query)
        );
        switch (sortBy) {
            case 'price-asc':  list.sort((a,b) => Number(a.price) - Number(b.price)); break;
            case 'price-desc': list.sort((a,b) => Number(b.price) - Number(a.price)); break;
            case 'qty-desc':   list.sort((a,b) => Number(b.qty) - Number(a.qty));     break;
            default:           list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return list;
    };

    const renderInto = (container, list) => {
        if (!container) return;
        if (!list.length) { container.innerHTML = '<div class="empty">Заявок пока нет</div>'; return; }
        container.innerHTML = '';
        list.forEach(t => {
            const total    = Number(t.price) * Number(t.qty);
            const clanName = (window.clansCache?.[t.clan]?.name) || t.clan || '';
            const el = document.createElement('div');
            el.className = 'mk-listing ' + t.type + (t.is_global ? ' global' : '');
            el.innerHTML = `
                <h4>${t.type === 'buy' ? '🛒' : '💰'} ${_esc(t.name)}</h4>
                <div class="mk-meta">
                    ${clanName ? `<span>🏰 ${_esc(clanName)}</span>` : ''}
                    ${t.port ? `<span>⚓ ${_esc(t.port)}</span>` : ''}
                    ${t.is_global ? '<span>🌐 Общий</span>' : ''}
                </div>
                <div class="mk-price">${_fmt(t.price)} <small>🪙 / шт</small></div>
                <div class="mk-total">× ${_fmt(t.qty)} = ${_fmt(total)} 🪙</div>
                ${t.note ? `<div style="font-size:12px;color:var(--muted);font-style:italic;">«${_esc(t.note)}»</div>` : ''}
                <div class="mk-author">👤 ${_esc(t.nickname || '—')}</div>`;
            const author = el.querySelector('.mk-author');
            if (author) author.addEventListener('click', () => {
                if (typeof openProfile === 'function') openProfile(t.nickname);
            });
            container.appendChild(el);
        });
    };

    renderInto(document.getElementById('mk-listings'),  build(q,  sort));
    renderInto(document.getElementById('mk-listings2'), build(q2, sort2));
}

async function publishToCommonMarket() {
    const btn    = document.getElementById('mk-pub-btn');
    const status = document.getElementById('mk-pub-status');
    if (!btn || !status) return;

    const type  = document.getElementById('mk-pub-type').value;
    const name  = document.getElementById('mk-pub-name').value.trim();
    const price = parseInt(document.getElementById('mk-pub-price').value);
    const qty   = parseInt(document.getElementById('mk-pub-qty').value);
    const port  = document.getElementById('mk-pub-port').value.trim();
    const note  = document.getElementById('mk-pub-note').value.trim();

    if (!name)                { status.textContent = 'Введите название'; status.style.color = '#ff7a7a'; return; }
    if (!price || price <= 0) { status.textContent = 'Укажите цену';     status.style.color = '#ff7a7a'; return; }
    if (!qty || qty <= 0)     { status.textContent = 'Укажите кол-во';   status.style.color = '#ff7a7a'; return; }

    const nick   = (typeof getViewerNick === 'function' ? getViewerNick() : '') || 'Игрок';
    const clanId = window.currentClan || null;

    btn.disabled = true;
    const { error } = await supabase.from('trades').insert({
        clan: clanId, type, category: 'other', name, price, qty,
        port: port || null, nickname: nick, note: note || null,
        status: 'active', is_global: true
    });
    btn.disabled = false;

    if (error) { status.textContent = 'Ошибка: ' + error.message; status.style.color = '#ff7a7a'; return; }
    status.textContent = '✔ Опубликовано'; status.style.color = '#6ee7a7';
    ['mk-pub-name','mk-pub-price','mk-pub-port','mk-pub-note'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('mk-pub-qty').value = 1;
    loadCommonMarket();
    setTimeout(() => { status.textContent = ''; }, 2500);
}

/* ============================================================
   2. ФИТИНГ КОРАБЛЯ
   ============================================================ */
function fillFitShipSelect() {
    const sel = document.getElementById('fit-ship'); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— Выберите корабль —</option>';
    (window.shipsCache || []).slice().sort((a,b) => (a.name||'').localeCompare(b.name||''))
        .forEach(s => {
            const o = document.createElement('option');
            o.value = s.name;
            o.textContent = `${(window.ROMAN?.[s.level]) || s.level} · ${s.name}`;
            o.dataset.image = s.image_url || '';
            sel.appendChild(o);
        });
    if (cur) sel.value = cur;
}

function fillFitModuleList() {
    const dl = document.getElementById('fit-module-list'); if (!dl) return;
    const type  = document.getElementById('fit-module-type')?.value || '';
    const items = (window.buildItemsCache || []).filter(x => x.type === type && x.is_active !== false);
    dl.innerHTML = items.map(x => `<option value="${_esc(x.name)}">`).join('');
}

function addFitModule() {
    const type   = document.getElementById('fit-module-type').value;
    const name   = document.getElementById('fit-module-name').value.trim();
    const qty    = Math.max(1, parseInt(document.getElementById('fit-module-qty').value) || 1);
    const status = document.getElementById('fit-status');

    if (!name) { status.textContent = 'Введите название модуля'; status.style.color = '#ff7a7a'; return; }

    const item  = (window.buildItemsCache || []).find(x =>
        x.name.toLowerCase() === name.toLowerCase() && x.type === type
    );
    const price = item && item.price != null ? Number(item.price) : 0;

    window._fitDraft.modules.push({ kind: type, name, qty, price, image: item?.image_url || '' });
    document.getElementById('fit-module-name').value = '';
    document.getElementById('fit-module-qty').value  = 1;
    status.textContent = ''; status.style.color = '';
    renderFitTable();
}

function renderFitTable() {
    const tbody = document.getElementById('fit-tbody'); if (!tbody) return;
    const modules = window._fitDraft.modules;

    const typeLabels = {
        weapon_small: '🟢 Малое', weapon_medium: '🟡 Среднее', weapon_large: '🔴 Большое',
        module: '⚙️ Модуль', ammo: '💣 Боеприпас', consumable: '🧪 Расходник',
        cargo: '📦 Трюм', upgrade: '🔧 Апгрейд'
    };

    let total = 0;
    tbody.innerHTML = '';

    if (!modules.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted);font-style:italic;">Нет модулей. Добавь первый.</td></tr>`;
        const tEl = document.getElementById('fit-total-value');
        if (tEl) tEl.textContent = '0 🪙';
        return;
    }

    modules.forEach((m, idx) => {
        const sum = (Number(m.price) || 0) * (Number(m.qty) || 1);
        total += sum;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.image ? `<img src="${_esc(m.image)}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;margin-right:8px;" onerror="this.style.display='none'">` : ''}${_esc(m.name)}</td>
            <td>${typeLabels[m.kind] || m.kind}</td>
            <td>${_fmt(m.qty)}</td>
            <td>${_fmt(m.price)} 🪙</td>
            <td class="fit-sum">${_fmt(sum)} 🪙</td>
            <td><button class="fit-del" data-idx="${idx}">✕</button></td>`;
        tr.querySelector('.fit-del').addEventListener('click', () => {
            window._fitDraft.modules.splice(idx, 1);
            renderFitTable();
        });
        tbody.appendChild(tr);
    });

    const tEl = document.getElementById('fit-total-value');
    if (tEl) tEl.textContent = _fmt(total) + ' 🪙';
}

async function saveFit() {
    const ship   = document.getElementById('fit-ship').value;
    const name   = document.getElementById('fit-name').value.trim();
    const status = document.getElementById('fit-status');

    if (!ship) { status.textContent = 'Выберите корабль';            status.style.color = '#ff7a7a'; return; }
    if (!name) { status.textContent = 'Укажите название фита';        status.style.color = '#ff7a7a'; return; }
    if (!window._fitDraft.modules.length) { status.textContent = 'Добавьте модули'; status.style.color = '#ff7a7a'; return; }

    const total = window._fitDraft.modules.reduce(
        (s, m) => s + (Number(m.price)||0) * (Number(m.qty)||1), 0
    );

    const { error } = await supabase.from('ship_fittings').insert({
        clan_id: window.currentClan || null,
        ship_name: ship,
        name,
        modules: window._fitDraft.modules,
        total_price: total,
        is_public: true
    });
    if (error) { status.textContent = 'Ошибка: ' + error.message; status.style.color = '#ff7a7a'; return; }

    status.textContent = '✔ Фит сохранён'; status.style.color = '#6ee7a7';
    window._fitDraft = { ship: '', name: '', modules: [] };
    document.getElementById('fit-name').value = '';
    renderFitTable();
    loadFittings();
    setTimeout(() => { status.textContent = ''; }, 2500);
}

async function loadFittings() {
    const container = document.getElementById('fit-list'); if (!container) return;
    container.innerHTML = '<div class="empty">Загрузка…</div>';

    const clanId = window.currentClan;
    const { data, error } = await supabase
        .from('ship_fittings')
        .select('*')
        .or(`clan_id.eq.${clanId},is_public.eq.true`)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) { container.innerHTML = `<div class="empty">Ошибка: ${_esc(error.message)}</div>`; return; }
    if (!data?.length) { container.innerHTML = '<div class="empty">Сохранённых фитов пока нет</div>'; return; }

    container.innerHTML = '';
    data.forEach(f => {
        const el = document.createElement('div');
        el.className = 'fit-saved';
        const canDel = f.clan_id === clanId;

        el.innerHTML = `
            <div class="fit-ship-ico">🚢</div>
            <div class="fit-info">
                <b>${_esc(f.name)}</b>
                <small>${_esc(f.ship_name)} · ${f.modules?.length || 0} модулей · ${_fmt(f.total_price)} 🪙</small>
            </div>
            <div class="fit-actions">
                <button data-act="load" title="Загрузить в редактор">✏️</button>
                ${canDel ? '<button data-act="del" title="Удалить">🗑</button>' : ''}
            </div>`;

        el.querySelector('[data-act="load"]').addEventListener('click', () => {
            window._fitDraft = { ship: f.ship_name, name: f.name, modules: f.modules || [] };
            document.getElementById('fit-ship').value = f.ship_name;
            document.getElementById('fit-name').value = f.name;
            renderFitTable();
        });

        const delBtn = el.querySelector('[data-act="del"]');
        if (delBtn) delBtn.addEventListener('click', async () => {
            if (!confirm(`Удалить фит «${f.name}»?`)) return;
            await supabase.from('ship_fittings').delete().eq('id', f.id);
            loadFittings();
        });

        container.appendChild(el);
    });
}

/* ============================================================
   3. РАСЧЁТ ПРИБЫЛИ
   ============================================================ */
function calcProfitBuy() {
    const buy  = parseFloat(document.getElementById('pf-buy').value)  || 0;
    const sell = parseFloat(document.getElementById('pf-sell').value) || 0;
    const qty  = Math.max(1, parseInt(document.getElementById('pf-qty').value) || 1);
    const tax  = Math.max(0, Math.min(100, parseFloat(document.getElementById('pf-tax').value) || 0));

    const grossIncome = sell * qty;
    const taxAmount   = grossIncome * tax / 100;
    const netIncome   = grossIncome - taxAmount;
    const cost        = buy * qty;
    const profit      = netIncome - cost;
    const margin      = cost > 0 ? (profit / cost) * 100 : 0;
    const perUnit     = qty > 0 ? profit / qty : 0;
    const cls         = profit >= 0 ? 'ok' : 'bad';

    const el = document.getElementById('pf-result-buy'); if (!el) return;
    el.innerHTML = `
        <div class="row"><span>Затраты:</span><b>${_fmt(cost)} 🪙</b></div>
        <div class="row"><span>Доход:</span><b>${_fmt(grossIncome)} 🪙</b></div>
        <div class="row"><span>Налог (${tax}%):</span><b>−${_fmt(taxAmount)} 🪙</b></div>
        <div class="row"><span>Чистый доход:</span><b>${_fmt(netIncome)} 🪙</b></div>
        <div class="row"><span>Прибыль за ед.:</span><b class="${cls}">${_fmt(perUnit)} 🪙</b></div>
        <div class="row"><span>Итоговая прибыль:</span><b class="${cls}" style="font-size:16px;">${profit >= 0 ? '+' : ''}${_fmt(profit)} 🪙</b></div>
        <div class="row"><span>Маржа:</span><b class="${cls}">${margin.toFixed(1)}%</b></div>
        <div class="row"><span>ROI:</span><b class="${cls}">${cost > 0 ? ((profit/cost)*100).toFixed(1) : '0'}%</b></div>`;
}

function calcProfitCraft() {
    const ship = document.getElementById('pf-craft-ship').value;
    const sell = parseFloat(document.getElementById('pf-craft-sell').value) || 0;
    const tax  = Math.max(0, Math.min(100, parseFloat(document.getElementById('pf-craft-tax').value) || 0));
    const el   = document.getElementById('pf-result-craft'); if (!el) return;

    if (!ship) { el.innerHTML = '<div style="color:var(--red)">Выберите корабль</div>'; return; }

    const recipe = (window.recipesCache || []).filter(r => r.ship_id === ship);
    if (!recipe.length) { el.innerHTML = '<div style="color:var(--red)">Рецепт не задан</div>'; return; }

    let cost = 0;
    const rows = [];
    recipe.forEach(r => {
        const res   = (window.resourcesCache || []).find(x => x.id === r.resource_id);
        const price = res ? Number(res.price) || 0 : 0;
        const qty   = Number(r.quantity) || 0;
        const sum   = price * qty;
        cost += sum;
        rows.push(`<div class="row"><span>${_esc(res?.name || r.resource_id)} × ${_fmt(qty)}:</span><b>${_fmt(sum)} 🪙</b></div>`);
    });

    const taxAmount = sell * tax / 100;
    const netIncome = sell - taxAmount;
    const profit    = netIncome - cost;
    const cls       = profit >= 0 ? 'ok' : 'bad';
    const margin    = cost > 0 ? (profit / cost) * 100 : 0;

    el.innerHTML = `
        <div style="font-weight:700;color:var(--gold);margin-bottom:6px;">🚢 ${_esc(ship)}</div>
        ${rows.join('')}
        <div class="row" style="border-top:1px dashed var(--border);margin-top:6px;padding-top:6px;"><span><b>Себестоимость:</b></span><b>${_fmt(cost)} 🪙</b></div>
        <div class="row"><span>Цена продажи:</span><b>${_fmt(sell)} 🪙</b></div>
        <div class="row"><span>Налог (${tax}%):</span><b>−${_fmt(taxAmount)} 🪙</b></div>
        <div class="row"><span>Прибыль:</span><b class="${cls}" style="font-size:16px;">${profit >= 0 ? '+' : ''}${_fmt(profit)} 🪙</b></div>
        <div class="row"><span>Маржа:</span><b class="${cls}">${margin.toFixed(1)}%</b></div>`;
}

async function renderProfitMarketAvg() {
    const container = document.getElementById('pf-market-avg'); if (!container) return;
    container.innerHTML = '<div class="empty">Загрузка…</div>';

    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('status', 'active');

    if (error) { container.innerHTML = `<div class="empty">Ошибка: ${_esc(error.message)}</div>`; return; }
    if (!data?.length) { container.innerHTML = '<div class="empty">Нет активных заявок</div>'; return; }

    const sums = {};
    data.forEach(t => {
        const key = (t.name || '').trim().toLowerCase();
        if (!key) return;
        if (!sums[key]) sums[key] = { name: t.name, gold: 0, qty: 0, sells: 0, buys: 0 };
        const price = Number(t.price) || 0;
        const qty   = Number(t.qty)   || 0;
        sums[key].gold  += price * qty;
        sums[key].qty   += qty;
        if (t.type === 'sell') sums[key].sells++;
        else                   sums[key].buys++;
    });

    const list = Object.values(sums).filter(s => s.qty > 0);
    list.sort((a, b) => (b.gold / b.qty) - (a.gold / a.qty));

    container.innerHTML = list.slice(0, 30).map(s => {
        const avg = s.gold / s.qty;
        return `<div class="pf-avg-card">
            <div class="name">${_esc(s.name)}</div>
            <div class="price">${_fmt(Math.round(avg))} 🪙</div>
            <div class="meta">${s.sells} продаж · ${s.buys} покупок · объём ${_fmt(s.qty)}</div>
        </div>`;
    }).join('');
}

/* ============================================================
   4. АДМИН: ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ КОРАБЛЯ
   ============================================================ */
function resetShipForm() {
    ['ship-edit-id','ship-name','ship-image','ship-durability','ship-speed',
     'ship-maneuverability','ship-armor','ship-guns','ship-cargo','ship-crew']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const lvl  = document.getElementById('ship-level'); if (lvl) lvl.value = 1;
    const type = document.getElementById('ship-type');  if (type) type.value = 'Боевые';
    const msg  = document.getElementById('ship-admin-msg'); if (msg) msg.textContent = '';
}

function fillShipEditForm(ship) {
    if (!ship) return;
    document.getElementById('ship-edit-id').value         = ship.id || '';
    document.getElementById('ship-name').value            = ship.name || '';
    document.getElementById('ship-level').value           = ship.level || 1;
    document.getElementById('ship-type').value            = ship.type || 'Боевые';
    document.getElementById('ship-image').value           = ship.image_url || '';
    document.getElementById('ship-durability').value      = ship.durability ?? '';
    document.getElementById('ship-speed').value           = ship.speed ?? '';
    document.getElementById('ship-maneuverability').value = ship.maneuverability ?? '';
    document.getElementById('ship-armor').value           = ship.armor ?? '';
    document.getElementById('ship-guns').value            = ship.guns ?? '';
    document.getElementById('ship-cargo').value           = ship.cargo_hold ?? '';
    document.getElementById('ship-crew').value            = ship.crew ?? '';
    const msg = document.getElementById('ship-admin-msg'); if (msg) msg.textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveShip() {
    const id  = document.getElementById('ship-edit-id').value;
    const msg = document.getElementById('ship-admin-msg');

    const payload = {
        name:            document.getElementById('ship-name').value.trim(),
        level:           parseInt(document.getElementById('ship-level').value) || 1,
        type:            document.getElementById('ship-type').value,
        image_url:       document.getElementById('ship-image').value.trim() || null,
        durability:      parseInt(document.getElementById('ship-durability').value) || null,
        speed:           parseInt(document.getElementById('ship-speed').value) || null,
        maneuverability: parseInt(document.getElementById('ship-maneuverability').value) || null,
        armor:           parseInt(document.getElementById('ship-armor').value) || null,
        guns:            parseInt(document.getElementById('ship-guns').value) || null,
        cargo_hold:      parseInt(document.getElementById('ship-cargo').value) || null,
        crew:            parseInt(document.getElementById('ship-crew').value) || null
    };

    if (!payload.name) { msg.textContent = 'Введите название'; msg.style.color = '#ff7a7a'; return; }

    let error;
    if (id) ({ error } = await supabase.from('ships').update(payload).eq('id', id));
    else    ({ error } = await supabase.from('ships').insert(payload));

    if (error) { msg.textContent = 'Ошибка: ' + error.message; msg.style.color = '#ff7a7a'; return; }

    msg.textContent = '✔ Сохранено'; msg.style.color = '#6ee7a7';
    resetShipForm();
    if (typeof loadShips === 'function') await loadShips();
    setTimeout(() => { msg.textContent = ''; }, 2000);
}

/* ============================================================
   5. FLASH-ИГРЫ
   ============================================================ */
async function loadFlashApps() {
    const { data, error } = await supabase
        .from('flash_apps')
        .select('*')
        .eq('is_public', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) { console.warn('flash_apps load:', error.message); window._flashApps = []; }
    else window._flashApps = data || [];

    renderFlashAppsGrid(document.getElementById('flashArchiveGrid'));
    renderFlashAppsGrid(document.getElementById('flashGuildGrid'));
    renderFlashAdminList();
}

function renderFlashAppsGrid(container) {
    if (!container) return;
    if (!window._flashApps.length) {
        container.innerHTML = '<div class="flash-empty">Flash-игр пока нет</div>';
        return;
    }
    container.innerHTML = '';
    window._flashApps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'flash-card';
        card.innerHTML = `
            <div class="flash-ico">${_esc(app.icon || '🎮')}</div>
            <div class="flash-title">${_esc(app.title)}</div>
            ${app.description ? `<div class="flash-desc">${_esc(app.description)}</div>` : ''}
            <div class="flash-meta">
                <span>📐 ${app.width}×${app.height}</span>
                <span>${_esc(app.category || 'other')}</span>
            </div>
            <div class="flash-play">▶ Играть</div>`;
        card.addEventListener('click', () => openFlashApp(app));
        container.appendChild(card);
    });
}

function renderFlashAdminList() {
    const container = document.getElementById('flashAdminList'); if (!container) return;
    if (!window._flashApps.length) { container.innerHTML = '<div class="empty">Flash-игр пока нет</div>'; return; }
    container.innerHTML = '';
    window._flashApps.forEach(a => {
        const el = document.createElement('div');
        el.className = 'partners-admin-item';
        el.innerHTML = `
            <div class="logo-mini"><span>${_esc(a.icon || '🎮')}</span></div>
            <div class="txt">
                <b>${_esc(a.title)}</b>
                <span>${_esc(a.swf_url || '').slice(0, 60)} · ${a.width}×${a.height}</span>
            </div>
            <div class="actions">
                <button class="edit" title="Редактировать">✏️</button>
                <button class="delete" title="Удалить">🗑</button>
            </div>`;
        el.querySelector('.edit').addEventListener('click', () => fillFlashEditForm(a));
        el.querySelector('.delete').addEventListener('click', () => deleteFlashApp(a.id, a.title));
        container.appendChild(el);
    });
}

function openFlashApp(app) {
    const modal = document.getElementById('flashPlayerModal'); if (!modal) return;
    const stage = document.getElementById('flashPlayerStage');
    const title = document.getElementById('flashPlayerTitle');
    const meta  = document.getElementById('flashPlayerMeta');

    if (title) title.textContent = `${app.icon || '🎮'} ${app.title}`;
    if (meta)  meta.textContent  = `${app.width}×${app.height} · ${app.category || 'other'}`;

    const stageWidth  = Math.min(app.width || 800, window.innerWidth - 60);
    const stageHeight = Math.min(app.height || 600, window.innerHeight - 140);

    const hasRuffle = typeof window.RufflePlayer !== 'undefined';

    if (hasRuffle && app.swf_url) {
        stage.innerHTML = '';
        // Ruffle сам "подхватит" тег <embed> и создаст плеер
        const embed = document.createElement('embed');
        embed.setAttribute('src', app.swf_url);
        embed.setAttribute('type', 'application/x-shockwave-flash');
        embed.setAttribute('width', stageWidth);
        embed.setAttribute('height', stageHeight);
        embed.setAttribute('quality', 'high');
        embed.setAttribute('allowScriptAccess', 'always');
        embed.setAttribute('allowFullScreen', 'true');
        stage.appendChild(embed);
    } else {
        stage.innerHTML = `
            <div class="flash-fallback">
                <p><b>Не удалось запустить Flash-игру.</b></p>
                <p>Убедитесь, что Ruffle загружен и у игры указан корректный SWF-URL.</p>
                <p>Игра: <b>${_esc(app.title)}</b><br>Файл: <a href="${_esc(app.swf_url)}" target="_blank" rel="noopener">${_esc(app.swf_url)}</a></p>
                <p><a href="${_esc(app.swf_url)}" download>⬇ Скачать SWF и открыть локально</a></p>
            </div>`;
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeFlashApp() {
    const modal = document.getElementById('flashPlayerModal'); if (!modal) return;
    const stage = document.getElementById('flashPlayerStage'); if (stage) stage.innerHTML = '';
    modal.hidden = true;
    document.body.style.overflow = '';
}

function resetFlashForm() {
    ['flash-edit-id','flash-title','flash-description','flash-url']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const icon   = document.getElementById('flash-icon');     if (icon)   icon.value   = '🎮';
    const cat    = document.getElementById('flash-category'); if (cat)    cat.value    = 'action';
    const w      = document.getElementById('flash-width');    if (w)      w.value      = 800;
    const h      = document.getElementById('flash-height');   if (h)      h.value      = 600;
    const pub    = document.getElementById('flash-public');   if (pub)    pub.checked  = true;
    const name   = document.getElementById('flash-file-name'); if (name)  name.textContent = '';
    const file   = document.getElementById('flash-file');     if (file)   file.value   = '';
    const msg    = document.getElementById('flash-admin-msg'); if (msg)   msg.textContent = '';
    window._flashFileData = null;
}

function fillFlashEditForm(app) {
    document.getElementById('flash-edit-id').value      = app.id || '';
    document.getElementById('flash-title').value        = app.title || '';
    document.getElementById('flash-icon').value         = app.icon || '🎮';
    document.getElementById('flash-category').value     = app.category || 'action';
    document.getElementById('flash-description').value  = app.description || '';
    document.getElementById('flash-url').value          = app.swf_url || '';
    document.getElementById('flash-width').value        = app.width || 800;
    document.getElementById('flash-height').value       = app.height || 600;
    document.getElementById('flash-public').checked     = app.is_public !== false;
    const msg = document.getElementById('flash-admin-msg'); if (msg) msg.textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function uploadFlashFile(file) {
    if (!file) return null;
    const ext = 'swf';
    const fileName = `flash/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('flash-apps')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error('Ошибка загрузки: ' + uploadError.message);

    const { data: urlData } = supabase.storage.from('flash-apps').getPublicUrl(fileName);
    return urlData.publicUrl;
}

async function saveFlashApp() {
    const id  = document.getElementById('flash-edit-id').value;
    const msg = document.getElementById('flash-admin-msg');
    const btn = document.getElementById('flash-save');

    const title     = document.getElementById('flash-title').value.trim();
    const icon      = document.getElementById('flash-icon').value.trim() || '🎮';
    const category  = document.getElementById('flash-category').value || 'action';
    const descript  = document.getElementById('flash-description').value.trim() || null;
    const urlInput  = document.getElementById('flash-url').value.trim();
    const width     = Math.max(320, parseInt(document.getElementById('flash-width').value)  || 800);
    const height    = Math.max(240, parseInt(document.getElementById('flash-height').value) || 600);
    const isPublic  = document.getElementById('flash-public').checked;

    if (!title) { msg.textContent = 'Введите название'; msg.style.color = '#ff7a7a'; return; }

    btn.disabled = true; btn.textContent = '⏳ Сохранение…';

    try {
        let swfUrl = urlInput || null;

        // Если загружен файл — грузим в Storage
        const fileInput = document.getElementById('flash-file');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            swfUrl = await uploadFlashFile(fileInput.files[0]);
        }

        if (!swfUrl) { msg.textContent = 'Укажите SWF-файл или ссылку'; msg.style.color = '#ff7a7a'; return; }

        const payload = {
            title, icon, category,
            description: descript,
            swf_url: swfUrl,
            width, height,
            is_public: isPublic
        };

        let error;
        if (id) ({ error } = await supabase.from('flash_apps').update(payload).eq('id', id));
        else    ({ error } = await supabase.from('flash_apps').insert(payload));

        if (error) throw error;

        msg.textContent = '✔ Сохранено'; msg.style.color = '#6ee7a7';
        resetFlashForm();
        await loadFlashApps();
        setTimeout(() => { msg.textContent = ''; }, 2000);
    } catch (err) {
        msg.textContent = 'Ошибка: ' + err.message; msg.style.color = '#ff7a7a';
    } finally {
        btn.disabled = false; btn.textContent = '💾 Сохранить';
    }
}

async function deleteFlashApp(id, title) {
    if (!confirm(`Удалить Flash-игру «${title}»?`)) return;
    const { error } = await supabase.from('flash_apps').delete().eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); return; }
    await loadFlashApps();
}

/* ============================================================
   6. ХУКИ И ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function initV24() {
    // --- Общий рынок (главная) ---
    const mkSearch = document.getElementById('mk-search');
    if (mkSearch) mkSearch.addEventListener('input', renderCommonMarket);
    const mkSort = document.getElementById('mk-sort');
    if (mkSort) mkSort.addEventListener('change', renderCommonMarket);

    const mkFilters = document.getElementById('mk-type-filters');
    if (mkFilters) mkFilters.addEventListener('click', (e) => {
        const chip = e.target.closest('.mk-chip'); if (!chip) return;
        _$$('#mk-type-filters .mk-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        window._mkFilterType = chip.dataset.type;
        renderCommonMarket();
    });

    // --- Общий рынок (в гильдии) ---
    const mkSearch2 = document.getElementById('mk-search2');
    if (mkSearch2) mkSearch2.addEventListener('input', renderCommonMarket);
    const mkSort2 = document.getElementById('mk-sort2');
    if (mkSort2) mkSort2.addEventListener('change', renderCommonMarket);

    const mkFilters2 = document.getElementById('mk-type-filters2');
    if (mkFilters2) mkFilters2.addEventListener('click', (e) => {
        const chip = e.target.closest('.mk-chip'); if (!chip) return;
        _$$('#mk-type-filters2 .mk-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        window._mkFilterType = chip.dataset.type;
        renderCommonMarket();
    });

    const mkPubBtn = document.getElementById('mk-pub-btn');
    if (mkPubBtn) mkPubBtn.addEventListener('click', publishToCommonMarket);

    // --- Фитинг ---
    const fitShip = document.getElementById('fit-ship');
    if (fitShip) fitShip.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        const img = document.getElementById('fit-ship-img');
        if (img) {
            if (opt?.dataset.image) { img.src = opt.dataset.image; img.hidden = false; }
            else img.hidden = true;
        }
        window._fitDraft.ship = e.target.value;
    });

    const fitModuleType = document.getElementById('fit-module-type');
    if (fitModuleType) fitModuleType.addEventListener('change', fillFitModuleList);

    const fitAddBtn = document.getElementById('fit-add-btn');
    if (fitAddBtn) fitAddBtn.addEventListener('click', addFitModule);

    const fitClear = document.getElementById('fit-clear');
    if (fitClear) fitClear.addEventListener('click', () => {
        if (!confirm('Очистить фит?')) return;
        window._fitDraft = { ship: '', name: '', modules: [] };
        document.getElementById('fit-name').value = '';
        renderFitTable();
    });

    const fitSave = document.getElementById('fit-save');
    if (fitSave) fitSave.addEventListener('click', saveFit);

    // --- Прибыль ---
    const pfBuy = document.getElementById('pf-calc-buy');
    if (pfBuy) pfBuy.addEventListener('click', calcProfitBuy);

    const pfCraft = document.getElementById('pf-calc-craft');
    if (pfCraft) pfCraft.addEventListener('click', calcProfitCraft);

    // --- Корабли (админка) ---
    const shipSave = document.getElementById('ship-save');
    if (shipSave) shipSave.addEventListener('click', saveShip);

    const shipReset = document.getElementById('ship-reset');
    if (shipReset) shipReset.addEventListener('click', resetShipForm);

    // --- Flash (админка) ---
    const flashSave = document.getElementById('flash-save');
    if (flashSave) flashSave.addEventListener('click', saveFlashApp);

    const flashReset = document.getElementById('flash-reset');
    if (flashReset) flashReset.addEventListener('click', resetFlashForm);

    const flashPick = document.getElementById('flash-file-pick');
    if (flashPick) flashPick.addEventListener('click', () => {
        const f = document.getElementById('flash-file'); if (f) { f.value = ''; f.click(); }
    });

    const flashFile = document.getElementById('flash-file');
    if (flashFile) flashFile.addEventListener('change', () => {
        const name = document.getElementById('flash-file-name');
        const f = flashFile.files?.[0];
        if (name && f) name.textContent = f.name;
    });

    const flashClose = document.getElementById('flashPlayerClose');
    if (flashClose) flashClose.addEventListener('click', closeFlashApp);

    const flashModal = document.getElementById('flashPlayerModal');
    if (flashModal) flashModal.addEventListener('click', (e) => {
        if (e.target.id === 'flashPlayerModal') closeFlashApp();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = document.getElementById('flashPlayerModal');
            if (m && !m.hidden) closeFlashApp();
        }
    });

    // --- Заполнить селект кораблей для крафт-калькулятора ---
    const craftSel = document.getElementById('pf-craft-ship');
    if (craftSel) {
        craftSel.innerHTML = '<option value="">— Выберите —</option>' +
            (window.shipsCache || []).slice()
                .sort((a,b) => (a.name||'').localeCompare(b.name||''))
                .map(s => `<option value="${_esc(s.name)}">${_esc(s.name)}</option>`).join('');
    }

    // --- Первичные рендеры ---
    fillFitShipSelect();
    fillFitModuleList();
    renderFitTable();

    // --- Автозагрузка данных ---
    loadCommonMarket();
    loadFittings();
    loadFlashApps();

    // --- Перехват кликов по сайдбару и админ-навигации ---
    document.addEventListener('click', (e) => {
        const sideItem = e.target.closest('.side-item[data-section]');
        if (sideItem) {
            const section = sideItem.dataset.section;
            if (section === 'market')  loadCommonMarket();
            if (section === 'fitting') { fillFitShipSelect(); loadFittings(); }
            if (section === 'profit')  renderProfitMarketAvg();
            if (section === 'flash')   loadFlashApps();
        }

        const adminNav = e.target.closest('.admin-nav-item[data-apanel]');
        if (adminNav) {
            const panel = adminNav.dataset.apanel;
            if (panel === 'flashapps') loadFlashApps();
            if (panel === 'ships') {
                // Уже грузится в оригинальном коде через renderAdminShips
            }
        }

        // Клик по карточке корабля в админке → заполнить форму
        const shipAdminItem = e.target.closest('#adminShipsList .partners-admin-item, #adminShipsList .ship-admin-item');
        if (shipAdminItem) {
            const name = shipAdminItem.querySelector('b, .txt b')?.textContent || '';
            const nameClean = name.replace(/^[IVX]+\s*·\s*/, '').trim();
            const ship = (window.shipsCache || []).find(s => s.name === nameClean);
            if (ship) fillShipEditForm(ship);
        }
    });
}

// Точка входа v2.4 — запускаем после главной инициализации
setTimeout(() => {
    try { initV24(); } catch (e) { console.warn('initV24:', e); }
}, 1500);
