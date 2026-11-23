$(function () {
  // Role guard: this page is admin-only, and the endpoint is admin-only on the backend too.
  Auth.requireAdmin();

  function label(key) {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function isNumber(value) {
    return value !== null && value !== "" && !isNaN(Number(value)) && typeof value !== "object";
  }

  function card(name, value) {
    return `
      <div class="bg-white rounded-xl shadow p-5">
        <p class="text-sm text-slate-600">${esc(name)}</p>
        <p class="text-3xl font-bold text-slate-900 mt-1">${Number(value).toLocaleString()}</p>
      </div>`;
  }

  function groupCard(title, rows) {
    const tiles = rows
      .map(
        (r) => `
        <div>
          <p class="text-xs text-slate-600">${esc(r.label)}</p>
          <p class="text-2xl font-bold text-slate-900">${r.value.toLocaleString()}</p>
        </div>`
      )
      .join("");
    return `
      <section class="bg-white rounded-xl shadow p-5">
        <h2 class="font-semibold text-slate-900 mb-3">${esc(title)}</h2>
        <div class="grid grid-cols-2 gap-4">${tiles}</div>
      </section>`;
  }

  function barChart(title, rows) {
    const max = Math.max(...rows.map((r) => r.value), 1);
    const items = rows
      .map(
        (r) => `
        <li>
          <div class="flex justify-between text-sm">
            <span class="text-slate-700">${esc(r.label)}</span>
            <span class="font-medium text-slate-900">${r.value}</span>
          </div>
          <div class="h-2.5 bg-slate-100 rounded-full mt-1" role="img" aria-label="${esc(r.label)}: ${r.value}">
            <div class="h-2.5 bg-teal-600 rounded-full" style="width:${(r.value / max) * 100}%"></div>
          </div>
        </li>`
      )
      .join("");
    return `
      <section class="bg-white rounded-xl shadow p-5">
        <h2 class="font-semibold text-slate-900">${esc(title)}</h2>
        <ul class="mt-4 space-y-3">${items}</ul>
      </section>`;
  }

  function rowsFromObject(obj) {
    return Object.entries(obj)
      .filter(([, v]) => isNumber(v))
      .map(([k, v]) => ({ label: label(k), value: Number(v) }));
  }

  function rowsFromArray(list) {
    return list
      .map((item) => {
        const entries = Object.entries(item);
        const text = entries.find(([, v]) => typeof v === "string");
        const num = entries.find(([, v]) => isNumber(v));
        return text && num ? { label: String(text[1]), value: Number(num[1]) } : null;
      })
      .filter(Boolean);
  }

  function render(data) {
    const groups = [];
    const charts = [];

    Object.entries(data || {}).forEach(([key, value]) => {
      if (isNumber(value)) {
        groups.push(card(label(key), value));
      } else if (Array.isArray(value)) {
        const rows = rowsFromArray(value);
        if (rows.length) charts.push(barChart(label(key), rows));
      } else if (value && typeof value === "object") {
        const rows = rowsFromObject(value);
        if (rows.length) groups.push(groupCard(label(key), rows));
      }
    });

    $("#stats").html(groups.join("") || `<p class="text-slate-600">No statistics available yet.</p>`);
    $("#charts").html(charts.join(""));
    $("#updated").text("Last updated " + new Date().toLocaleTimeString());
  }

  function skeletons() {
    const box = `<div class="animate-pulse bg-white rounded-xl shadow p-5"><div class="h-3 bg-slate-200 rounded w-1/2 mb-3"></div><div class="h-8 bg-slate-200 rounded w-1/3"></div></div>`;
    $("#stats").html(box.repeat(6));
    $("#charts").empty();
  }

  function load() {
    skeletons();
    api("/api/dashboard/admin")
      .done((res) => render(res.data))
      .fail((xhr) => {
        $("#stats").html(`
          <div class="col-span-full text-center py-10">
            <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
            <button id="retry" class="bg-teal-700 text-white px-4 py-2 rounded-lg">Try again</button>
          </div>`);
      });
  }

  $("#refresh").on("click", load);
  $("#stats").on("click", "#retry", load);
  setInterval(load, 60000);

  load();
});