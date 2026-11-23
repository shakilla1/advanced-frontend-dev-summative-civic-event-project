$(function () {
    $(window).on("pageshow", (e) => {
        if (e.originalEvent.persisted) location.reload();
    });
    if (Auth.isLoggedIn()) {
        go(Auth.isAdmin() ? "admin/dashboard.html" : "events.html");
        return;
    }

    showFlash();
    if (sessionStorage.getItem("ce_registered")) {
        toast("Account created. You can log in now.");
        sessionStorage.removeItem("ce_registered");
    }

    $("#login-form").on("submit", function (e) {
        e.preventDefault();
        $(".text-red-700").addClass("hidden");

        const email = $("#email").val().trim();
        const password = $("#password").val();
        let valid = true;

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            $("#email-error").text("Enter a valid email address.").removeClass("hidden");
            valid = false;
        }
        if (!password) {
            $("#password-error").text("Enter your password.").removeClass("hidden");
            valid = false;
        }
        if (!valid) return;

        const button = $("#login-btn").prop("disabled", true).text("Logging in...");

        api("/api/auth/login", { method: "POST", data: { email, password } })
            .done((res) => {
                const payload = res.data || res;
                Auth.save(payload.token, payload.user, $("#remember").is(":checked"));
                go(payload.user.role === "admin" ? "admin/dashboard.html" : "events.html");
            })
            .fail((xhr) => {
                toast(errorMessage(xhr), "error");
                button.prop("disabled", false).text("Log in");
            });
    });
});