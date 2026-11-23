$(function () {
  // Role-based access guard: only admins reach this page; the backend also restricts these endpoints to admins.
  Auth.requireAdmin();

  const me = Auth.user();
  let users = [];

  function active(u) {
    return u.is_active !== false;
  }

  function filtered() {
    const q = $("#q").val().trim().toLowerCase();
    return users.filter((u) => !q || (u.full_name + " " + u.email).toLowerCase().includes(q));
  }

  function rowHtml(u) {
    const badge = active(u)
      ? `<span class="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Active</span>`
      : `<span class="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Disabled</span>`;

    // Admins can't disable themselves or other admins from the UI, and roles are never editable here.
    const canToggle = u.id !== me.id && u.role !== "admin";
    const toggle = canToggle
      ? `<button data-toggle="${u.id}" class="text-sm underline ${active(u) ? "text-red-700" : "text-green-700"}">${active(u) ? "Disable" : "Enable"}</button>`
      : "";

    return `
      <tr>
        <td class="px-4 py-3 font-medium text-slate-900">${esc(u.full_name)}</td>
        <td class="px-4 py-3 text-slate-700">${esc(u.email)}</td>
        <td class="px-4 py-3 capitalize">${esc(u.role)}</td>
        <td class="px-4 py-3">${badge}</td>
        <td class="px-4 py-3 text-right space-x-3 whitespace-nowrap">
          <button data-view="${u.id}" class="text-sm text-teal-700 underline">View</button>
          ${toggle}
        </td>
      </tr>`;
  }

  function render() {
    const list = filtered();
    $("#rows").html(
      list.length
        ? list.map(rowHtml).join("")
        : `<tr><td colspan="5" class="px-4 py-10 text-center text-slate-600">No users found.</td></tr>`
    );
  }

  function skeletons() {
    const row = `<tr class="animate-pulse"><td colspan="5" class="px-4 py-4"><div class="h-4 bg-slate-200 rounded w-1/2"></div></td></tr>`;
    $("#rows").html(row.repeat(4));
  }

  function load() {
    skeletons();
    api("/api/users")
      .done((res) => {
        users = res.data || [];
        render();
      })
      .fail((xhr) => {
        $("#rows").html(`
          <tr><td colspan="5" class="px-4 py-10 text-center">
            <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
            <button id="retry" class="bg-teal-700 text-white px-4 py-2 rounded-lg">Try again</button>
          </td></tr>`);
      });
  }

  $("#q").on("input", render);
  $("#rows").on("click", "#retry", load);

  $("#rows").on("click", "[data-toggle]", function () {
    const id = $(this).data("toggle");
    const user = users.find((u) => u.id === id);
    if (!user) return;

    const enabling = !active(user);
    if (!enabling && !confirm("Disable " + user.full_name + "? They won't be able to log in.")) return;

    user.is_active = enabling;
    render();

    api(`/api/users/${id}/${enabling ? "enable" : "disable"}`, { method: "PATCH" })
      .done(() => toast(enabling ? "User enabled." : "User disabled."))
      .fail((xhr) => {
        user.is_active = !enabling;
        render();
        toast(errorMessage(xhr), "error");
      });
  });

  $("#rows").on("click", "[data-view]", function () {
    const id = $(this).data("view");
    $("#user-detail").html(`<p class="text-slate-600">Loading...</p>`);
    $("#user-dialog")[0].showModal();

    api("/api/users/" + id)
      .done((res) => {
        const u = res.data;
        $("#user-detail").html(`
          <h2 class="text-lg font-semibold text-slate-900">${esc(u.full_name)}</h2>
          <dl class="mt-4 space-y-3 text-sm">
            <div><dt class="text-slate-500">Email</dt><dd class="text-slate-900">${esc(u.email)}</dd></div>
            <div><dt class="text-slate-500">Role</dt><dd class="text-slate-900 capitalize">${esc(u.role)}</dd></div>
            <div><dt class="text-slate-500">Status</dt><dd class="text-slate-900">${active(u) ? "Active" : "Disabled"}</dd></div>
            <div><dt class="text-slate-500">Joined</dt><dd class="text-slate-900">${esc(formatDate(u.created_at))}</dd></div>
          </dl>`);
      })
      .fail((xhr) => $("#user-detail").html(`<p class="text-red-700">${esc(errorMessage(xhr))}</p>`));
  });

  load();
});