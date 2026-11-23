$(function () {
    Auth.requireLogin();

    const MAX_VIDEO = 8 * 1024 * 1024;
    const CACHE_KEY = "ce_promos_cache";
    const CACHE_MS = 2 * 60 * 1000;
    const admin = Auth.isAdmin();
    let items = [];
    let editingId = null;

    // Role-based access guard: the upload/edit form and the per-card admin buttons exist only for admins.
    if (admin) $("#admin-box").removeClass("hidden");

    function readCache() {
        try {
            const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
            if (cached && Date.now() - cached.time < CACHE_MS) return cached.data;
        } catch (e) { }
        return null;
    }

    function writeCache(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
        } catch (e) { }
    }

    function clearCache() {
        sessionStorage.removeItem(CACHE_KEY);
    }

    function skeletons() {
        const card = `
      <div class="animate-pulse bg-white rounded-xl shadow">
        <div class="h-44 bg-slate-200 rounded-t-xl"></div>
        <div class="p-4 space-y-3">
          <div class="h-4 bg-slate-200 rounded w-3/4"></div>
          <div class="h-3 bg-slate-200 rounded w-full"></div>
        </div>
      </div>`;
        $("#grid").html(card.repeat(3));
    }

    function cardHtml(p) {
        const thumb = p.thumbnail_url
            ? `<img src="${esc(mediaUrl(p.thumbnail_url))}" alt="" loading="lazy" class="h-44 w-full object-cover rounded-t-xl">`
            : `<div class="h-44 w-full bg-slate-800 rounded-t-xl flex items-center justify-center" aria-hidden="true">
           <svg class="w-12 h-12 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
         </div>`;
        const draft = admin && !p.published
            ? `<span class="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Draft</span>`
            : "";
        const adminActions = admin
            ? `<button data-edit="${p.id}" class="text-sm text-slate-700 underline">Edit</button>
         <button data-toggle="${p.id}" data-published="${p.published}" class="text-sm text-slate-700 underline">${p.published ? "Unpublish" : "Publish"}</button>
         <button data-delete="${p.id}" class="text-sm text-red-700 underline">Delete</button>`
            : "";

        return `
      <article class="bg-white rounded-xl shadow flex flex-col">
        ${thumb}
        <div class="p-4 flex flex-col gap-2 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h2 class="font-semibold text-slate-900">${esc(p.title)}</h2>${draft}
          </div>
          <p class="text-sm text-slate-700 line-clamp-2">${esc(p.description)}</p>
          <div class="mt-auto pt-3 flex flex-wrap items-center gap-4">
            <a href="promo-detail.html?id=${p.id}" class="bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-1.5 rounded-lg" aria-label="Play ${esc(p.title)}">Play</a>
            ${adminActions}
          </div>
        </div>
      </article>`;
    }

    function render() {
        const visible = items.filter((p) => admin || p.published);
        $("#grid").html(
            visible.length
                ? visible.map(cardHtml).join("")
                : `<p class="col-span-full text-center text-slate-600 py-12">No promos yet.</p>`
        );
    }

    function load(force) {
        const cached = force ? null : readCache();
        if (cached) {
            items = cached;
            render();
            return;
        }
        skeletons();
        api("/api/promos")
            .done((res) => {
                items = res.data || [];
                writeCache(items);
                render();
            })
            .fail((xhr) => {
                $("#grid").html(`
          <div class="col-span-full text-center py-12">
            <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
            <button id="retry" class="bg-teal-700 text-white px-4 py-2 rounded-lg">Try again</button>
          </div>`);
            });
    }

    function resetForm() {
        editingId = null;
        $("#promo-form")[0].reset();
        $("#form-heading").text("New promo");
        $("#save-btn").text("Upload promo");
        $("#cancel-edit, #video-hint").addClass("hidden");
    }

    $("#grid").on("click", "#retry", () => load(true));

    $("#grid").on("click", "[data-edit]", function () {
        if (!admin) return;
        const promo = items.find((p) => p.id === $(this).data("edit"));
        if (!promo) return;
        editingId = promo.id;
        $("#title").val(promo.title);
        $("#description").val(promo.description);
        $("#caption_text").val(promo.caption_text || "");
        $("#video").val("");
        $("#form-heading").text("Edit promo");
        $("#save-btn").text("Save changes");
        $("#cancel-edit, #video-hint").removeClass("hidden");
        $("#admin-box")[0].scrollIntoView({ behavior: "smooth" });
        $("#title").trigger("focus");
    });

    $("#cancel-edit").on("click", resetForm);

    $("#grid").on("click", "[data-toggle]", function () {
        if (!admin) return;
        const id = $(this).data("toggle");
        const published = String($(this).data("published")) === "true";
        const button = $(this).prop("disabled", true);

        api(`/api/promos/${id}/${published ? "unpublish" : "publish"}`, { method: "PATCH" })
            .done(() => {
                clearCache();
                const item = items.find((p) => p.id === id);
                if (item) item.published = !published;
                render();
                toast(published ? "Promo unpublished." : "Promo published.");
            })
            .fail((xhr) => {
                toast(errorMessage(xhr), "error");
                button.prop("disabled", false);
            });
    });

    $("#grid").on("click", "[data-delete]", function () {
        if (!admin || !confirm("Delete this promo? This cannot be undone.")) return;
        const id = $(this).data("delete");

        api("/api/promos/" + id, { method: "DELETE" })
            .done(() => {
                clearCache();
                items = items.filter((p) => p.id !== id);
                render();
                toast("Promo deleted.");
            })
            .fail((xhr) => toast(errorMessage(xhr), "error"));
    });

    $("#video").on("change", function () {
        $("#video-error").addClass("hidden");
        const file = this.files[0];
        if (!file) return;

        const problem = checkFile(file, ["mp4", "mov", "avi", "mkv"], 8);
        if (problem) {
            $("#video-error").text(problem).removeClass("hidden");
            this.value = "";
        }
    });

    $("#promo-form").on("submit", function (e) {
        e.preventDefault();
        if (!admin) return;
        $(".field-error").addClass("hidden");

        const title = $("#title").val().trim();
        const description = $("#description").val().trim();
        const file = $("#video")[0].files[0];
        let valid = true;

        if (!title) { $("#title-error").text("Give the promo a title.").removeClass("hidden"); valid = false; }
        if (!description) { $("#description-error").text("Add a short description.").removeClass("hidden"); valid = false; }
        if (!file && !editingId) { $("#video-error").text("Choose a video file.").removeClass("hidden"); valid = false; }
        if (!valid) return;

        const body = new FormData();
        body.append("title", title);
        body.append("description", description);
        body.append("caption_text", $("#caption_text").val().trim());
        if (file) body.append("video", file);

        const wasEditing = !!editingId;
        const button = $("#save-btn").prop("disabled", true).text("Saving...");
        $("#progress-wrap").removeClass("hidden");

        api(wasEditing ? "/api/promos/" + editingId : "/api/promos", {
            method: wasEditing ? "PUT" : "POST",
            formData: body,
            onProgress: (pct) => {
                $("#progress-bar").css("width", pct + "%");
                $("#progress-text").text(pct < 100 ? `Uploading ${pct}%` : "Finishing up...");
            },
        })
            .done(() => {
                clearCache();
                toast(wasEditing ? "Promo updated." : "Promo created and published.");
                resetForm();
                load(true);
            })
            .fail((xhr) => toast(errorMessage(xhr), "error"))
            .always(() => {
                button.prop("disabled", false).text(editingId ? "Save changes" : "Upload promo");
                $("#progress-wrap").addClass("hidden");
                $("#progress-bar").css("width", "0");
            });
    });

    load();
});