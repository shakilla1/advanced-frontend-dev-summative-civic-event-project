$(function () {
    Auth.requireLogin();

    const MAX_AUDIO = 5 * 1024 * 1024;
    const admin = Auth.isAdmin();
    let items = [];

    // Role-based access guard: the upload form and the publish/delete buttons exist only for admins.
    if (admin) $("#admin-box").removeClass("hidden");

    function duration(seconds) {
        if (!seconds) return "";
        const m = Math.floor(seconds / 60);
        const s = String(Math.floor(seconds % 60)).padStart(2, "0");
        return `${m}:${s}`;
    }

    function skeletons() {
        const row = `<li class="animate-pulse bg-white rounded-xl shadow p-5"><div class="h-4 bg-slate-200 rounded w-1/2 mb-3"></div><div class="h-3 bg-slate-200 rounded w-1/4"></div></li>`;
        $("#list").html(row.repeat(3));
    }

    function rowHtml(a) {
        const draft = admin && !a.published
            ? `<span class="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded ml-2">Draft</span>`
            : "";
        const adminActions = admin
            ? `<button data-toggle="${a.id}" data-published="${a.published}" class="text-sm text-slate-700 underline">${a.published ? "Unpublish" : "Publish"}</button>
         <button data-delete="${a.id}" class="text-sm text-red-700 underline">Delete</button>`
            : "";
        const length = duration(a.duration_seconds);

        return `
      <li class="bg-white rounded-xl shadow p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="font-semibold text-slate-900">${esc(a.title)}${draft}</h2>
          <p class="text-sm text-slate-600 mt-1"><span data-length="${a.id}">${length ? esc(length) + " &middot; " : ""}</span>${esc(formatDate(a.created_at))}</p>
        </div>
        <div class="flex items-center gap-4">
          <a href="announcement-detail.html?id=${a.id}" class="bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-lg" aria-label="Play ${esc(a.title)}">Play</a>
          ${adminActions}
        </div>
      </li>`;
    }

    function fillDurations() {
        items.forEach((a) => {
            if (a.duration_seconds || !a.audio_url) return;
            const probe = new Audio();
            probe.preload = "metadata";
            probe.src = mediaUrl(a.audio_url);
            probe.addEventListener("loadedmetadata", () => {
                $(`[data-length="${a.id}"]`).html(duration(probe.duration) + " &middot; ");
            });
        });
    }
    function render() {
        const visible = items.filter((a) => admin || a.published);
        $("#list").html(
            visible.length
                ? visible.map(rowHtml).join("")
                : `<li class="text-center text-slate-600 py-12">No announcements yet.</li>`
        );
    }

    function load() {
        skeletons();
        api("/api/announcements")
            .done((res) => {
                items = res.data || [];
                render();
                fillDurations();
            })
            .fail((xhr) => {
                $("#list").html(`
          <li class="text-center py-12">
            <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
            <button id="retry" class="bg-teal-700 text-white px-4 py-2 rounded-lg">Try again</button>
          </li>`);
            });
    }

    $("#list").on("click", "#retry", load);

    $("#list").on("click", "[data-toggle]", function () {
        if (!admin) return;
        const id = $(this).data("toggle");
        const published = String($(this).data("published")) === "true";
        const button = $(this).prop("disabled", true);

        api(`/api/announcements/${id}/${published ? "unpublish" : "publish"}`, { method: "PATCH" })
            .done(() => {
                const item = items.find((a) => a.id === id);
                if (item) item.published = !published;
                render();
                toast(published ? "Announcement unpublished." : "Announcement published.");
            })
            .fail((xhr) => {
                toast(errorMessage(xhr), "error");
                button.prop("disabled", false);
            });
    });

    $("#list").on("click", "[data-delete]", function () {
        if (!admin || !confirm("Delete this announcement? This cannot be undone.")) return;
        const id = $(this).data("delete");

        api("/api/announcements/" + id, { method: "DELETE" })
            .done(() => {
                items = items.filter((a) => a.id !== id);
                render();
                toast("Announcement deleted.");
            })
            .fail((xhr) => toast(errorMessage(xhr), "error"));
    });

    $("#audio").on("change", function () {
        $("#audio-error").addClass("hidden");
        const file = this.files[0];
        if (!file) return;

        const problem = checkFile(file, ["mp3", "wav", "m4a", "ogg"], 5);
        if (problem) {
            $("#audio-error").text(problem).removeClass("hidden");
            this.value = "";
        }
    });

    $("#announcement-form").on("submit", function (e) {
        e.preventDefault();
        if (!admin) return;
        $(".field-error").addClass("hidden");

        const title = $("#title").val().trim();
        const file = $("#audio")[0].files[0];
        let valid = true;

        if (!title) { $("#title-error").text("Give the announcement a title.").removeClass("hidden"); valid = false; }
        if (!file) { $("#audio-error").text("Choose an audio file.").removeClass("hidden"); valid = false; }
        if (!valid) return;

        const body = new FormData();
        body.append("title", title);
        body.append("audio", file);

        const publish = $("#published").is(":checked");
        body.append("published", publish);

        const button = $("#save-btn").prop("disabled", true).text("Uploading...");
        $("#progress-wrap").removeClass("hidden");

        api("/api/announcements", {
            method: "POST",
            formData: body,
            onProgress: (pct) => {
                $("#progress-bar").css("width", pct + "%");
                $("#progress-text").text(pct < 100 ? `Uploading ${pct}%` : "Finishing up...");
            },
        })
            .done(() => {
                toast(publish ? "Announcement created and published." : "Announcement saved as a draft.");
                this.reset();
                load();
            })
            .fail((xhr) => toast(errorMessage(xhr), "error"))
            .always(() => {
                button.prop("disabled", false).text("Upload announcement");
                $("#progress-wrap").addClass("hidden");
                $("#progress-bar").css("width", "0");
            });
    });

    load();
});