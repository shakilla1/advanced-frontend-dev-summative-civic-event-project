(function () {
    const user = Auth.user();
    const admin = Auth.isAdmin();
    const current = location.pathname.split("/").pop();

    function navLink(href, label) {
        const active = href.split("/").pop() === current;
        const classes = active ? "text-teal-700 font-semibold" : "text-slate-700 hover:text-teal-700";
        return `<a href="${SITE_ROOT}${href}" class="${classes} px-2 py-1" ${active ? 'aria-current="page"' : ""}>${label}</a>`;
    }

    const links = [
        navLink("events.html", "Events"),
        navLink("announcements.html", "Announcements"),
        navLink("promos.html", "Promos"),
        admin ? navLink("admin/dashboard.html", "Dashboard") : "",
    ].join("");

    const accountArea = user
        ? `
      <a href="${SITE_ROOT}notifications.html" class="relative p-2 rounded-full hover:bg-slate-100" aria-label="Notifications">
        <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"/>
        </svg>
        <span id="bell-count" class="hidden absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center"></span>
      </a>
      <div class="relative">
        <button id="profile-btn" class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100" aria-haspopup="true" aria-expanded="false">
          <span class="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">${esc(user.full_name.charAt(0).toUpperCase())}</span>
          <span class="hidden sm:inline text-sm text-slate-800">${esc(user.full_name)}</span>
        </button>
        <div id="profile-menu" class="hidden absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-40">
          <a href="${SITE_ROOT}profile.html" class="block px-4 py-2 text-sm hover:bg-slate-50">My profile</a>
          ${admin ? "" : `<a href="${SITE_ROOT}my-registrations.html" class="block px-4 py-2 text-sm hover:bg-slate-50">My registrations</a>`}
          <button id="logout-btn" class="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-slate-50">Log out</button>
        </div>
      </div>`
        : `<a href="${SITE_ROOT}login.html" class="text-sm font-medium text-teal-700">Log in</a>`;

    $("#app-header").addClass("bg-white border-b border-slate-200 sticky top-0 z-30").html(`
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
      <a href="${SITE_ROOT}events.html" class="text-xl font-bold text-teal-700">CivicEvents</a>
      <form id="global-search" role="search" class="hidden md:block flex-1 max-w-sm">
        <label for="search-input" class="sr-only">Search events</label>
        <input id="search-input" type="search" placeholder="Search events"
          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600">
      </form>
      <nav class="hidden md:flex items-center ml-auto text-sm" aria-label="Main">${links}</nav>
      <div class="flex items-center gap-2 ml-auto md:ml-0">${accountArea}
        <button id="menu-btn" class="md:hidden p-2 rounded hover:bg-slate-100" aria-label="Open menu" aria-expanded="false">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>
    </div>
    <nav id="mobile-nav" class="hidden md:hidden border-t border-slate-200 px-4 py-3 flex flex-col gap-1" aria-label="Mobile">${links}</nav>
  `);

      const footerLinks = [
    ["events.html", "Events"],
    ["announcements.html", "Announcements"],
    ["promos.html", "Promos"],
  ];
  if (admin) {
    footerLinks.push(["admin/dashboard.html", "Dashboard"], ["admin/users.html", "Users"]);
  }

  $("#app-footer").addClass("bg-teal-950 text-teal-100 mt-16").html(`
    <div class="max-w-6xl mx-auto px-4 py-8 grid gap-6 sm:grid-cols-3 text-sm">
      <div>
        <p class="text-white font-semibold mb-2">CivicEvents</p>
        <p>Find events, listen to announcements and watch promos from your city.</p>
      </div>
      <div>
        <p class="text-white font-semibold mb-2">Need help?</p>
        <p>Email <a href="mailto:s.uwamahoro1@alustudent.com" class="underline">s.uwamahoro1@alustudent.com</a></p>
      </div>
      <div>
        <p class="text-white font-semibold mb-2">Pages</p>
        <ul class="space-y-1">
          ${footerLinks.map(([file, text]) => `<li><a href="${SITE_ROOT}${file}" class="underline">${text}</a></li>`).join("")}
        </ul>
      </div>
    </div>
    <p class="text-center text-xs text-teal-300 pb-6">&copy; ${new Date().getFullYear()} CivicEvents</p>
  `);

    $("#menu-btn").on("click", function () {
        const open = $("#mobile-nav").toggleClass("hidden").is(":visible");
        $(this).attr("aria-expanded", open);
    });

    $("#profile-btn").on("click", function (e) {
        e.stopPropagation();
        const open = $("#profile-menu").toggleClass("hidden").is(":visible");
        $(this).attr("aria-expanded", open);
    });
    $(document).on("click", () => $("#profile-menu").addClass("hidden"));

    $("#logout-btn").on("click", () => {
        Auth.clear();
        go("login.html");
    });

    $("#global-search").on("submit", function (e) {
        e.preventDefault();
        const q = encodeURIComponent($("#search-input").val().trim());
        go("events.html" + (q ? "?q=" + q : ""));
    });

    if (user) {
        api("/api/notifications").done((res) => {
            const seen = JSON.parse(localStorage.getItem("ce_seen_" + user.id) || "[]");
            const unread = (res.data || []).filter((n) => !seen.includes(n.id)).length;
            if (unread) $("#bell-count").text(unread > 99 ? "99+" : unread).removeClass("hidden");
        });
    }
    const notice = sessionStorage.getItem("ce_notice");
    if (notice) {
        toast(notice);
        sessionStorage.removeItem("ce_notice");
    }
})();