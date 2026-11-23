$(function () {
  Auth.requireLogin();

  let items = [];

  function normalise(r) {
    const ev = r.event || r;
    return {
      id: r.event_id || ev.event_id || ev.id,
      title: ev.title,
      starts_at: ev.starts_at,
      location: ev.location,
      image: ev.metadata && ev.metadata.image_url,
      status: r.status,
    };
  }

  function rowHtml(e) {
    const img = e.image
      ? `<img src="${esc(mediaUrl(e.image))}" alt="" loading="lazy" class="w-24 h-24 object-cover rounded-lg shrink-0">`
      : "";
    return `
      <li class="bg-white rounded-xl shadow p-4 flex gap-4 items-center">
        ${img}
        <div class="flex-1">
          <h2 class="font-semibold text-slate-900">${esc(e.title)}</h2>
          <p class="text-sm text-slate-600">${esc(formatDate(e.starts_at))}</p>
          <p class="text-sm text-slate-600">${esc(e.location)}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <a href="event-detail.html?id=${e.id}" class="bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-1.5 rounded-lg">View</a>
          <button data-cancel="${e.id}" class="text-sm text-red-700 underline">Cancel registration</button>
        </div>
      </li>`;
  }

  function render() {
    $("#list").html(
      items.length
        ? items.map(rowHtml).join("")
        : `<li class="text-center text-slate-600 py-12">You haven't registered for any events yet. <a href="events.html" class="text-teal-700 underline">Browse events</a></li>`
    );
  }

  $("#list").html(`<li class="animate-pulse bg-white rounded-xl shadow p-4"><div class="h-5 bg-slate-200 rounded w-1/2"></div></li>`.repeat(2));

  api("/api/event-registrations/my-registrations")
    .done((res) => {
      items = (res.data || []).filter((r) => r.status !== "cancelled").map(normalise);
      render();
    })
    .fail((xhr) => {
      $("#list").html(`
        <li class="text-center py-12">
          <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
          <button onclick="location.reload()" class="bg-teal-700 text-white px-4 py-2 rounded-lg">Try again</button>
        </li>`);
    });

  $("#list").on("click", "[data-cancel]", function () {
    if (!confirm("Cancel your registration for this event?")) return;
    const id = $(this).data("cancel");
    const button = $(this).prop("disabled", true);

    api("/api/event-registrations/cancel", { method: "POST", data: { event_id: id } })
      .done(() => {
        items = items.filter((e) => e.id !== id);
        render();
        toast("Registration cancelled.");
      })
      .fail((xhr) => {
        toast(errorMessage(xhr), "error");
        button.prop("disabled", false);
      });
  });
});