const Auth = {
    save(token, user, remember) {
        const keep = remember ? localStorage : sessionStorage;
        const drop = remember ? sessionStorage : localStorage;
        drop.removeItem(CONFIG.TOKEN_KEY);
        drop.removeItem(CONFIG.USER_KEY);
        keep.setItem(CONFIG.TOKEN_KEY, token);
        keep.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    },

    token() {
        return localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);
    },

    user() {
        const raw = localStorage.getItem(CONFIG.USER_KEY) || sessionStorage.getItem(CONFIG.USER_KEY);
        return raw ? JSON.parse(raw) : null;
    },

    clear() {
        [localStorage, sessionStorage].forEach((s) => {
            s.removeItem(CONFIG.TOKEN_KEY);
            s.removeItem(CONFIG.USER_KEY);
        });
    },
    
    updateUser(user) {
        const store = localStorage.getItem(CONFIG.TOKEN_KEY) ? localStorage : sessionStorage;
        store.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    },

    isLoggedIn() {
        return !!this.token();
    },

    isAdmin() {
        const user = this.user();
        return !!user && user.role === "admin";
    },

    // Role-based access guard: pages that need a login call this first.
    // Anonymous visitors are sent to the login page.
    requireLogin() {
        if (!this.isLoggedIn()) go("login.html");
    },

    // Role-based access guard: admin-only pages call this first.
    // Normal users are sent to the events page. The backend still enforces
    // the real permission; this only keeps the UI honest.
    requireAdmin() {
        this.requireLogin();
        if (!this.isAdmin()) go("events.html");
    },
}