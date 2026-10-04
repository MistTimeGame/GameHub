/* ============================================================
   ШАБЛОНЫ
============================================================ */

function initTemplates(){
    const toggle = $("toggle-add-template");
    const cancel = $("cancel-template-btn");
    const save = $("save-template-btn");
    const copyBtn = $("copy-ai-prompt");
    const closeViewer = $("tpl-viewer-close");

    if(toggle) toggle.onclick = () => {
        const panel = $("add-template-panel"); if(!panel) return;
        panel.classList.toggle("hidden");
        if(!panel.classList.contains("hidden")) $("tpl-title")?.focus();
    };
    if(cancel) cancel.onclick = () => {
        const panel = $("add-template-panel");
        if(panel) panel.classList.add("hidden");
        setTplStatus("");
    };
    if(save) save.onclick = saveTemplate;
    if(copyBtn) copyBtn.onclick = copyAiPrompt;
    if(closeViewer) closeViewer.onclick = closeTemplateViewer;

    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
            const tv = $("template-viewer");
            if(tv && !tv.classList.contains("hidden")) closeTemplateViewer();
        }
    });
}

function setTplStatus(t, cls){
    const el = $("tpl-status"); if(!el) return;
    el.textContent = t || ""; el.className = "profile-status" + (cls ? " " + cls : "");
}

function copyAiPrompt(){
    const box = $("ai-prompt-box");
    if(!box) return;
    const text = box.textContent;
    const done = () => {
        const btn = $("copy-ai-prompt");
        if(!btn) return;
        const old = btn.textContent;
        btn.textContent = "✓ Скопировано";
        setTimeout(() => btn.textContent = old, 1500);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done).catch(() => {
            fallbackCopy(text, done);
        });
    } else {
        fallbackCopy(text, done);
    }
}
function fallbackCopy(text, cb){
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand("copy"); cb && cb(); }catch(e){ errLog("COPY FAIL", e); }
    ta.remove();
}

async function loadTemplates(){
    const box = $("templates-list"); if(!box) return;

    const { data, error } = await supabaseClient
        .from("templates").select("*")
        .order("created_at", { ascending: false });

    if(error){
        templatesAvailable = false;
        box.innerHTML =
            "<div class='dash-recent-empty'>Раздел «Шаблоны» требует таблицы <code>templates</code> в Supabase.<br>" +
            "SQL — в начале файла <code>app.js</code>.</div>";
        return;
    }
    templatesAvailable = true;
    templatesCache = data || [];

    if(templatesCache.length === 0){
        box.innerHTML =
            "<div class='dash-recent-empty'>Шаблонов пока нет. Загрузите первый или сгенерируйте через ИИ!</div>";
        return;
    }

    box.innerHTML = "";
    templatesCache.forEach(t => box.appendChild(buildTemplateCard(t)));
}

function buildTemplateCard(t){
    const card = document.createElement("div");
    card.className = "tpl-card";

    const cat = t.category || "general";
    const catLabel = {
        wosb: "🎮 WOSB",
        general: "📄 Общее",
        guild: "⚔ Гильдии",
        other: "📁 Другое"
    }[cat] || "📄";

    const date = t.created_at
        ? new Date(t.created_at).toLocaleDateString("ru-RU", { day:"2-digit", month:"short", year:"numeric" })
        : "";

    const preview = (t.content || "").slice(0, 120).replace(/\s+/g, " ");
    const isOwner = t.uploaded_by === currentUser.id;
    const canDelete = isOwner || isAdmin();

    card.innerHTML =
        "<div class='tpl-card-header'>" +
            "<div class='tpl-card-icon'>📄</div>" +
            "<div class='tpl-card-info'>" +
                "<div class='tpl-card-title'>" + escapeHtml(t.title || "Без названия") + "</div>" +
                "<span class='tpl-card-cat " + cat + "'>" + catLabel + "</span>" +
            "</div>" +
        "</div>" +
        "<div class='tpl-card-desc'>" + escapeHtml(t.description || preview || "Без описания") + "</div>" +
        "<div class='tpl-card-meta'>" +
            "<span>📅 " + escapeHtml(date) + "</span>" +
            "<span>🔒 только просмотр</span>" +
        "</div>" +
        "<div class='tpl-card-actions'></div>";

    const actions = card.querySelector(".tpl-card-actions");
    const openBtn = document.createElement("button");
    openBtn.className = "main-button";
    openBtn.type = "button";
    openBtn.textContent = "👁 Открыть";
    openBtn.onclick = () => openTemplateViewer(t);
    actions.appendChild(openBtn);

    if(canDelete){
        const del = document.createElement("button");
        del.className = "tpl-delete";
        del.type = "button";
        del.title = "Удалить";
        del.textContent = "×";
        del.onclick = (e) => {
            e.stopPropagation();
            deleteTemplate(t);
        };
        card.appendChild(del);
    }

    return card;
}

async function saveTemplate(){
    const user = await ensureAuth();
    if(!user){ setTplStatus("Нет авторизации", "err"); return; }
    if(!templatesAvailable){ setTplStatus("Таблица templates не создана", "err"); return; }

    const title = ($("tpl-title").value || "").trim();
    const description = ($("tpl-desc").value || "").trim();
    const category = ($("tpl-category").value || "general").trim();
    const content = ($("tpl-content").value || "").trim();

    if(!title || title.length < 2){
        setTplStatus("Название: минимум 2 символа", "err");
        $("tpl-title").focus();
        return;
    }
    if(!content || content.length < 20){
        setTplStatus("Вставьте HTML-код шаблона", "err");
        $("tpl-content").focus();
        return;
    }
    if(content.length > 500000){
        setTplStatus("Шаблон слишком большой (макс 500 000 символов)", "err");
        return;
    }

    setTplStatus("Сохранение…", "loading");

    const ins = await supabaseClient.from("templates").insert({
        title,
        description: description || null,
        category,
        content,
        uploaded_by: user.id
    }).select().single();

    if(ins.error){
        errLog("SAVE TEMPLATE", ins.error.message);
        setTplStatus("Ошибка: " + ins.error.message, "err");
        return;
    }

    setTplStatus("Шаблон загружен ✓");
    setTimeout(() => setTplStatus(""), 1500);

    $("tpl-title").value = "";
    $("tpl-desc").value = "";
    $("tpl-content").value = "";
    $("tpl-category").value = "general";
    $("add-template-panel").classList.add("hidden");

    await loadTemplates();
}

async function deleteTemplate(t){
    const user = await ensureAuth();
    if(!user) return;

    const isOwner = t.uploaded_by === user.id;
    if(!isOwner && !isAdmin()){
        alert("Удалить шаблон может только автор или администратор.");
        return;
    }
    if(!confirm("Удалить шаблон «" + (t.title || "без названия") + "»?")) return;

    const del = await supabaseClient.from("templates").delete().eq("id", t.id);
    if(del.error){ alert("Ошибка: " + del.error.message); return; }
    await loadTemplates();
}

/* ===== Просмотр шаблона (изолированный) ===== */
function openTemplateViewer(t){
    const wrap = $("template-viewer");
    const titleEl = $("tpl-viewer-title");
    const subEl = $("tpl-viewer-sub");
    const frame = $("tpl-viewer-frame");
    if(!wrap || !frame) return;

    titleEl.textContent = t.title || "Шаблон";

    const cat = t.category || "general";
    const catLabel = {
        wosb: "🎮 World of Sea Battle",
        general: "📄 Общее",
        guild: "⚔ Гильдии",
        other: "📁 Другое"
    }[cat] || "📄";

    const date = t.created_at
        ? new Date(t.created_at).toLocaleDateString("ru-RU", { day:"2-digit", month:"long", year:"numeric" })
        : "";

    subEl.textContent = catLabel + (date ? " · " + date : "");

    // sandbox без allow-scripts — HTML рендерится, но JS не выполняется,
    // ссылки не уводят со страницы, формы не отправляются
    frame.setAttribute("sandbox", "");
    frame.srcdoc = t.content || "<html><body style='font-family:sans-serif;padding:40px;color:#888'>Пустой шаблон</body></html>";

    wrap.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}
function closeTemplateViewer(){
    const wrap = $("template-viewer");
    if(wrap) wrap.classList.add("hidden");
    const frame = $("tpl-viewer-frame");
    if(frame) frame.srcdoc = "";
    document.body.style.overflow = "";
}
