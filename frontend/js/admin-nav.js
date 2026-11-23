(function () {
  const current = location.pathname.split("/").pop();
  const links = [
    ["dashboard.html", "Dashboard"],
    ["users.html", "Users"],
  ];

  const admin = links
    .map(([file, label]) => {
      const active = current === file;
      const classes = active ? "bg-teal-50 text-teal-700 font-semibold" : "text-slate-700 hover:bg-slate-100";
      return `<a href="${SITE_ROOT}admin/${file}" class="block rounded-lg px-3 py-2 text-sm ${classes}" ${active ? 'aria-current="page"' : ""}>${label}</a>`;
    })
    .join("");

  const content = ["events.html|Events", "announcements.html|Announcements", "promos.html|Promos"]
    .map((item) => {
      const [file, label] = item.split("|");
      return `<a href="${SITE_ROOT}${file}" class="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">${label}</a>`;
    })
    .join("");

  $("#admin-nav").html(`
    <nav aria-label="Admin" class="bg-white rounded-xl shadow p-3 space-y-1">
      <p class="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
      ${admin}
      <p class="px-3 pt-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Content</p>
      ${content}
    </nav>`);
})();