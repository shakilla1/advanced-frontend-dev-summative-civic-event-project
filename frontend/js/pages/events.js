$(function () {
  Auth.requireLogin();

  const PER_PAGE = 6;
  const admin = Auth.isAdmin();
  let events = [];
  let currentPage = 1;

  $("#f-q").val(new URLSearchParams(location.search).get("q") || "");
  if (admin) $("#new-event").removeClass("hidden");

  function skeletons() {
    const card = `
      <div class="bg-white rounded-xl shadow animate-pulse">
        <div class="h-40 bg-slate-200 rounded-t-xl"></div>
        <div class="p-4 space-y-3">
          <div class="h-4 bg-slate-200 rounded w-3/4"></div>
          <div class="h-3 bg-slate-200 rounded w-1/2"></div>
          <div class="h-3 bg-slate-200 rounded w-full"></div>
        </div>
      </div>`;
    $("#events-grid").html(card.repeat(6));
  }

  function filtered() {
    const q = $("#f-q").val().trim().toLowerCase();
    const date = $("#f-date").val();
    const place = $("#f-location").val();

    return events.filter((ev) => {
      if (!admin && !ev.published) return false;
      if (q && !(ev.title + " " + (ev.description || "")).toLowerCase().includes(q)) return false;
      if (place && ev.location !== place) return false;
      if (date && !(ev.starts_at || "").startsWith(date)) return false;
      return true;
    });
  }

  function cardHtml(ev) {
    const img = mediaUrl(ev.metadata && ev.metadata.image_url);
    const picture = img
      ? `<img src="${esc(img)}" alt="${esc(ev.title)}" loading="lazy" class="h-40 w-full object-cover rounded-t-xl">`
      : `<div class="h-40 w-full bg-teal-100 rounded-t-xl flex items-center justify-center text-teal-700 text-sm">No image</div>`;

    const adminActions = admin
      ? `<a href="event-form.html?id=${ev.id}" class="text-sm text-slate-700 underline">Edit</a>
         <button data-delete="${ev.id}" class="text-sm text-red-700 underline">Delete</button>`
      : "";

    const draft = admin && !ev.published
      ? `<span class="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Draft</span>`
      : "";

    return `
      <article class="bg-white rounded-xl shadow flex flex-col">
        ${picture}
        <div class="p-4 flex flex-col gap-2 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h2 class="font-semibold text-slate-900">${esc(ev.title)}</h2>${draft}
          </div>
          <p class="text-sm text-slate-600">${esc(formatDate(ev.starts_at))}</p>
          <p class="text-sm text-slate-600">${esc(ev.location)}</p>
          <p class="text-sm text-slate-700 line-clamp-2">${esc(ev.description)}</p>
          <div class="mt-auto pt-3 flex items-center gap-4">
            <a href="event-detail.html?id=${ev.id}" class="bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-1.5 rounded-lg">View</a>
            ${adminActions}
          </div>
        </div>
      </article>`;
  }

  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    currentPage = Math.min(currentPage, pages);
    const slice = list.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    if (!slice.length) {
      $("#events-grid").html(`<p class="col-span-full text-center text-slate-600 py-12">No events match your search.</p>`);
    } else {
      $("#events-grid").html(slice.map(cardHtml).join(""));
    }

    $("#pager").html(
      pages > 1
        ? `<button id="prev" class="px-3 py-1.5 rounded border border-slate-300 bg-white disabled:opacity-40" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
           <span class="text-sm text-slate-700">Page ${currentPage} of ${pages}</span>
           <button id="next" class="px-3 py-1.5 rounded border border-slate-300 bg-white disabled:opacity-40" ${currentPage === pages ? "disabled" : ""}>Next</button>`
        : ""
    );
  }

  function fillLocations() {
    const places = [...new Set(events.map((ev) => ev.location).filter(Boolean))].sort();
    places.forEach((p) => $("#f-location").append($("<option>").val(p).text(p)));
  }

  function load() {
    skeletons();
    api("/api/events")
      .done((res) => {
        events = res.data || [];
        fillLocations();
        render();
      })
      .fail((xhr) => {
        $("#events-grid").html(`
          <div class="col-span-full text-center py-12">
            <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
            <button id="retry" class="bg-teal-700 text-white px-4 py-2 rounded-lg">Try again</button>
          </div>`);
      });
  }

  $("#filters").on("input change", () => { currentPage = 1; render(); });
  $("#filters").on("submit", (e) => e.preventDefault());

  $("#pager").on("click", "#prev", () => { currentPage--; render(); });
  $("#pager").on("click", "#next", () => { currentPage++; render(); });
  $("#events-grid").on("click", "#retry", load);

  $("#events-grid").on("click", "[data-delete]", function () {
    if (!admin || !confirm("Delete this event? This cannot be undone.")) return;
    const id = $(this).data("delete");
    api("/api/events/" + id, { method: "DELETE" })
      .done(() => {
        events = events.filter((ev) => ev.id !== id);
        render();
        toast("Event deleted.");
      })
      .fail((xhr) => toast(errorMessage(xhr), "error"));
  });

  load();
});