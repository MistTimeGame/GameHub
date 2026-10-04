/* =========================================================
   GAMEHUB CONFERENCE
   rooms.js
   Управление комнатами конференции
   ========================================================= */

(function () {
    "use strict";

    const ConferenceRooms = {

        /* =====================================================
           GET ALL ROOMS
           ===================================================== */

        async getAll(supabaseClient) {

            const { data, error } = await supabaseClient
                .from("conference_rooms")
                .select(`
                    id,
                    name,
                    description,
                    created_by,
                    created_at,
                    is_active,
                    game_id
                `)
                .eq("is_active", true)
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                console.error(
                    "ConferenceRooms.getAll:",
                    error
                );

                throw error;
            }

            return data || [];
        },

        /* =====================================================
           GET ROOM
           ===================================================== */

        async getById(
            supabaseClient,
            roomId
        ) {

            if (!roomId) {
                return null;
            }

            const { data, error } = await supabaseClient
                .from("conference_rooms")
                .select(`
                    id,
                    name,
                    description,
                    created_by,
                    created_at,
                    is_active,
                    game_id
                `)
                .eq("id", roomId)
                .maybeSingle();

            if (error) {
                console.error(
                    "ConferenceRooms.getById:",
                    error
                );

                throw error;
            }

            return data || null;
        },

        /* =====================================================
           CREATE ROOM
           ===================================================== */

        async create(
            supabaseClient,
            {
                name,
                description = null,
                gameId = null,
                userId
            }
        ) {

            if (!userId) {
                throw new Error(
                    "Не указан пользователь"
                );
            }

            if (!name || !name.trim()) {
                throw new Error(
                    "Название конференции обязательно"
                );
            }

            const roomName =
                name.trim();

            const roomDescription =
                description &&
                description.trim()
                    ? description.trim()
                    : null;

            const { data, error } =
                await supabaseClient
                    .from("conference_rooms")
                    .insert({
                        name: roomName,
                        description: roomDescription,
                        created_by: userId,
                        game_id: gameId || null,
                        is_active: true
                    })
                    .select(`
                        id,
                        name,
                        description,
                        created_by,
                        created_at,
                        is_active,
                        game_id
                    `)
                    .single();

            if (error) {
                console.error(
                    "ConferenceRooms.create:",
                    error
                );

                throw error;
            }

            if (!data) {
                throw new Error(
                    "Supabase не вернул созданную комнату"
                );
            }

            /*
             * Создатель автоматически становится
             * участником конференции.
             */

            const {
                error: memberError
            } = await supabaseClient
                .from("conference_room_members")
                .insert({
                    room_id: data.id,
                    user_id: userId
                });

            /*
             * Если пользователь уже оказался
             * участником из-за параллельного запроса,
             * саму комнату всё равно считаем созданной.
             */

            if (
                memberError &&
                !String(
                    memberError.message || ""
                ).toLowerCase()
                    .includes("duplicate")
            ) {
                console.error(
                    "ConferenceRooms.create member:",
                    memberError
                );
            }

            return data;
        },

        /* =====================================================
           UPDATE ROOM
           ===================================================== */

        async update(
            supabaseClient,
            {
                roomId,
                name,
                description,
                gameId,
                userId
            }
        ) {

            if (!roomId) {
                throw new Error(
                    "Не указана комната"
                );
            }

            if (!userId) {
                throw new Error(
                    "Не указан пользователь"
                );
            }

            if (!name || !name.trim()) {
                throw new Error(
                    "Название конференции обязательно"
                );
            }

            /*
             * Сначала проверяем владельца.
             */

            const { data: room, error: roomError } =
                await supabaseClient
                    .from("conference_rooms")
                    .select(`
                        id,
                        created_by
                    `)
                    .eq("id", roomId)
                    .maybeSingle();

            if (roomError) {
                throw roomError;
            }

            if (!room) {
                throw new Error(
                    "Конференция не найдена"
                );
            }

            if (room.created_by !== userId) {
                throw new Error(
                    "Изменять конференцию может только её создатель"
                );
            }

            const { data, error } =
                await supabaseClient
                    .from("conference_rooms")
                    .update({
                        name: name.trim(),
                        description:
                            description &&
                            description.trim()
                                ? description.trim()
                                : null,
                        game_id:
                            gameId || null
                    })
                    .eq("id", roomId)
                    .select(`
                        id,
                        name,
                        description,
                        created_by,
                        created_at,
                        is_active,
                        game_id
                    `)
                    .single();

            if (error) {
                console.error(
                    "ConferenceRooms.update:",
                    error
                );

                throw error;
            }

            return data;
        },

        /* =====================================================
           CLOSE ROOM
           ===================================================== */

        async close(
            supabaseClient,
            {
                roomId,
                userId
            }
        ) {

            if (!roomId) {
                throw new Error(
                    "Не указана комната"
                );
            }

            if (!userId) {
                throw new Error(
                    "Не указан пользователь"
                );
            }

            const { data: room, error: roomError } =
                await supabaseClient
                    .from("conference_rooms")
                    .select(`
                        id,
                        created_by
                    `)
                    .eq("id", roomId)
                    .maybeSingle();

            if (roomError) {
                throw roomError;
            }

            if (!room) {
                throw new Error(
                    "Конференция не найдена"
                );
            }

            if (room.created_by !== userId) {
                throw new Error(
                    "Закрыть конференцию может только её создатель"
                );
            }

            const { data, error } =
                await supabaseClient
                    .from("conference_rooms")
                    .update({
                        is_active: false
                    })
                    .eq("id", roomId)
                    .select(`
                        id,
                        name,
                        description,
                        created_by,
                        created_at,
                        is_active,
                        game_id
                    `)
                    .single();

            if (error) {
                console.error(
                    "ConferenceRooms.close:",
                    error
                );

                throw error;
            }

            return data;
        },

        /* =====================================================
           JOIN ROOM
           ===================================================== */

        async join(
            supabaseClient,
            {
                roomId,
                userId
            }
        ) {

            if (!roomId || !userId) {
                throw new Error(
                    "Не хватает данных для входа в комнату"
                );
            }

            const { data: existing, error: checkError } =
                await supabaseClient
                    .from("conference_room_members")
                    .select(`
                        room_id,
                        user_id
                    `)
                    .eq("room_id", roomId)
                    .eq("user_id", userId)
                    .maybeSingle();

            if (checkError) {
                throw checkError;
            }

            if (existing) {
                return existing;
            }

            const { data, error } =
                await supabaseClient
                    .from("conference_room_members")
                    .insert({
                        room_id: roomId,
                        user_id: userId
                    })
                    .select(`
                        room_id,
                        user_id,
                        joined_at
                    `)
                    .single();

            if (error) {
                console.error(
                    "ConferenceRooms.join:",
                    error
                );

                throw error;
            }

            return data;
        },

        /* =====================================================
           LEAVE ROOM
           ===================================================== */

        async leave(
            supabaseClient,
            {
                roomId,
                userId
            }
        ) {

            if (!roomId || !userId) {
                throw new Error(
                    "Не хватает данных для выхода"
                );
            }

            const { error } =
                await supabaseClient
                    .from("conference_room_members")
                    .delete()
                    .eq("room_id", roomId)
                    .eq("user_id", userId);

            if (error) {
                console.error(
                    "ConferenceRooms.leave:",
                    error
                );

                throw error;
            }

            return true;
        },

        /* =====================================================
           GET MEMBERS
           ===================================================== */

        async getMembers(
            supabaseClient,
            roomId
        ) {

            if (!roomId) {
                return [];
            }

            const { data, error } =
                await supabaseClient
                    .from("conference_room_members")
                    .select(`
                        room_id,
                        user_id,
                        joined_at
                    `)
                    .eq("room_id", roomId)
                    .order("joined_at", {
                        ascending: true
                    });

            if (error) {
                console.error(
                    "ConferenceRooms.getMembers:",
                    error
                );

                throw error;
            }

            return data || [];
        },

        /* =====================================================
           IS MEMBER
           ===================================================== */

        async isMember(
            supabaseClient,
            {
                roomId,
                userId
            }
        ) {

            const { data, error } =
                await supabaseClient
                    .from("conference_room_members")
                    .select(`
                        room_id,
                        user_id
                    `)
                    .eq("room_id", roomId)
                    .eq("user_id", userId)
                    .maybeSingle();

            if (error) {
                throw error;
            }

            return !!data;
        },

        /* =====================================================
           GET OWNER
           ===================================================== */

        async isOwner(
            supabaseClient,
            {
                roomId,
                userId
            }
        ) {

            const { data, error } =
                await supabaseClient
                    .from("conference_rooms")
                    .select(`
                        created_by
                    `)
                    .eq("id", roomId)
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {
                return false;
            }

            return data.created_by === userId;
        }

    };

    window.ConferenceRooms =
        ConferenceRooms;

})();
