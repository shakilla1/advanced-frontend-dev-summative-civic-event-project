$(function () {
  Auth.requireLogin();

  const user = Auth.user();
  const admin = Auth.isAdmin();
  const SEEN_KEY = "ce_seen_" + user.id;
  let items = [];
  let activeId = null;

  const seen = () => JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  const saveSeen = (ids) => localStorage.setItem(SEEN_KEY, JSON.stringify(ids));

  function updateBell() {
    const unread = items.filter((n) => !seen().includes(n.id)).length;
    $("#bell-count")
      .text(unread > 99 ? "99+" : unread)
      .toggleClass("hidden", unread === 0);
  }

  function linkFor(n) {
    let meta = n.metadata;
    if (typeof meta === "string") {
      try { meta = JSON.parse(meta); } catch (e) { meta = null; }
    }
    if (!meta) return null;
    if (meta.event_id) return { href: "event-detail.html?id=" + encodeURIComponent(meta.event_id), label: "Open event" };
    if (meta.promo_id) return { href: "promo-detail.html?id=" + encodeURIComponent(meta.promo_id), label: "Open promo" };
    if (meta.announcement_id) return { href: "announcement-detail.html?id=" + encodeURIComponent(meta.announcement_id), label: "Open announcement" };
    return null;
  }

  function renderList() {
    if (!items.length) {
      $("#list").html(`<li class="text-slate-600 py-8 text-center">You have no notifications.</li>`);
      return;
    }
    const read = seen();
    $("#list").html(
      items.map((n) => {
        const unread = !read.includes(n.id);
        const active = n.id === activeId ? "border-teal-600 bg-teal-50" : "border-transparent bg-white";
        return `
          <li>
            <button data-open="${n.id}" class="w-full text-left rounded-xl shadow border-2 ${active} p-4 hover:bg-slate-50">
              <span class="flex items-start justify-between gap-2">
                <span class="${unread ? "font-semibold" : ""} text-slate-900">${esc(n.title)}</span>
                ${unread ? `<span class="mt-1.5 w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" aria-label="Unread"></span>` : ""}
              </span>
              <span class="block text-xs text-slate-600 mt-1">${esc(formatDate(n.created_at))}</span>
            </button>
          </li>`;
      }).join("")
    );
  }

  function showDetail(n) {
    const link = linkFor(n);
    const type = n.type ? `<span class="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${esc(n.type)}</span>` : "";
    const open = link
      ? `<a href="${esc(link.href)}" class="inline-block bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-lg">${link.label}</a>`
      : "";
    const remove = admin
      ? `<button data-delete="${n.id}" class="text-sm text-red-700 underline">Delete notification</button>`
      : "";

    $("#detail").html(`
      <div class="flex items-center gap-2 mb-2">${type}<span class="text-xs text-slate-600">${esc(formatDate(n.created_at))}</span></div>
      <h2 class="text-xl font-semibold text-slate-900">${esc(n.title)}</h2>
      <p class="text-slate-700 mt-3 whitespace-pre-line">${esc(n.message)}</p>
      <div class="mt-5 flex items-center gap-4">${open}${remove}</div>`);
  }

  function openNotification(id) {
    const before = seen();
    activeId = id;
    if (!before.includes(id)) saveSeen([...before, id]);
    renderList();
    updateBell();
    $("#detail").html(`<p class="text-slate-600">Loading...</p>`);

    api("/api/notifications/" + id)
      .done((res) => showDetail(res.data))
      .fail((xhr) => {
        saveSeen(before);
        renderList();
        updateBell();
        $("#detail").html(`<p class="text-red-700">${esc(errorMessage(xhr))}</p>`);
      });
  }

  $("#list").on("click", "[data-open]", function () {
    openNotification($(this).data("open"));
  });

  $("#detail").on("click", "[data-delete]", function () {
    // Role-based access guard: only admins get the delete button, and the handler checks again.
    if (!admin || !confirm("Delete this notification for everyone?")) return;
    const id = $(this).data("delete");

    api("/api/notifications/" + id, { method: "DELETE" })
      .done(() => {
        items = items.filter((n) => n.id !== id);
        activeId = null;
        renderList();
        updateBell();
        $("#detail").html(`<p class="text-slate-600">Select a notification to read it.</p>`);
        toast("Notification deleted.");
      })
      .fail((xhr) => toast(errorMessage(xhr), "error"));
  });

  $("#list").html(`<li class="animate-pulse bg-white rounded-xl shadow p-4"><div class="h-4 bg-slate-200 rounded w-2/3"></div></li>`.repeat(3));

  api("/api/notifications")
    .done((res) => {
      items = res.data || [];
      renderList();
      updateBell();
    })
    .fail((xhr) => {
      $("#list").html(`
        <li class="text-center py-8">
          <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
          <button onclick="location.reload()" class="bg-teal-700 text-white px-4 py-2 rounded-lg">Try again</button>
        </li>`);
    });
});