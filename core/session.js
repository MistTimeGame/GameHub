// ============================================================
// GAMEHUB - SESSION
// ============================================================

window.GameHub = window.GameHub || {};

window.GameHub.session = {

    user: null,
    profile: null,

    // --------------------------------------------------------
    // Инициализация
    // --------------------------------------------------------

    async init() {

        const supabase = window.GameHub.supabase;

        if (!supabase) {
            console.error(
                "[GameHub] Supabase client отсутствует."
            );

            return null;
        }

        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) {

            console.error(
                "[GameHub] Ошибка получения сессии:",
                error
            );

            return null;
        }

        this.user = data.session
            ? data.session.user
            : null;

        if (this.user) {
            await this.loadProfile();
        }

        return this.user;
    },


    // --------------------------------------------------------
    // Получение текущего пользователя
    // --------------------------------------------------------

    async getUser() {

        const supabase = window.GameHub.supabase;

        const {
            data,
            error
        } = await supabase.auth.getUser();

        if (error) {

            console.error(
                "[GameHub] Ошибка получения пользователя:",
                error
            );

            this.user = null;

            return null;
        }

        this.user = data.user || null;

        return this.user;
    },


    // --------------------------------------------------------
    // Загрузка профиля
    // --------------------------------------------------------

    async loadProfile() {

        if (!this.user) {
            this.profile = null;
            return null;
        }

        const supabase = window.GameHub.supabase;

        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", this.user.id)
            .maybeSingle();

        if (error) {

            console.error(
                "[GameHub] Ошибка загрузки профиля:",
                error
            );

            this.profile = null;

            return null;
        }

        this.profile = data || null;

        return this.profile;
    },


    // --------------------------------------------------------
    // Проверка авторизации
    // --------------------------------------------------------

    isAuthenticated() {

        return !!this.user;
    },


    // --------------------------------------------------------
    // Выход
    // --------------------------------------------------------

    async logout() {

        const supabase = window.GameHub.supabase;

        const {
            error
        } = await supabase.auth.signOut();

        if (error) {

            console.error(
                "[GameHub] Ошибка выхода:",
                error
            );

            throw error;
        }

        this.user = null;
        this.profile = null;

        window.location.href = "/GameHub/";
    }

};