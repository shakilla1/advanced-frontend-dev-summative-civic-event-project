function passwordChecks(value) {
    return [
        value.length >= 8,
        /[a-z]/.test(value),
        /[A-Z]/.test(value),
        /\d/.test(value),
        /[^A-Za-z0-9]/.test(value),
    ];
}

$(function () {
    const levels = [
        { label: "Too weak", width: "20%", color: "bg-red-600" },
        { label: "Weak", width: "40%", color: "bg-orange-500" },
        { label: "Fair", width: "60%", color: "bg-yellow-500" },
        { label: "Good", width: "80%", color: "bg-lime-600" },
        { label: "Strong", width: "100%", color: "bg-green-700" },
    ];

    $("#password").on("input", function () {
        const score = passwordChecks($(this).val()).filter(Boolean).length;
        const level = levels[Math.max(score - 1, 0)];
        $("#strength-bar")
            .attr("class", `h-2 rounded-full transition-all ${level.color}`)
            .css("width", $(this).val() ? level.width : "0");
        $("#strength-text").text($(this).val() ? level.label : "Use 8+ characters with upper, lower, a number and a symbol.");
    });

    $("#signup-form").on("submit", function (e) {
        e.preventDefault();
        $(".field-error").addClass("hidden");

        const full_name = $("#full_name").val().trim();
        const email = $("#email").val().trim();
        const password = $("#password").val();
        const confirm = $("#confirm_password").val();
        const fail = (id, msg) => $(`#${id}-error`).text(msg).removeClass("hidden");
        let valid = true;

        if (full_name.length < 2) { fail("full_name", "Enter your full name."); valid = false; }
        if (!/^\S+@\S+\.\S+$/.test(email)) { fail("email", "Enter a valid email address."); valid = false; }
        if (!passwordChecks(password).every(Boolean)) {
            fail("password", "Password needs 8+ characters, upper and lower case, a number and a symbol.");
            valid = false;
        }
        if (password !== confirm) { fail("confirm_password", "Passwords don't match."); valid = false; }
        if (!valid) return;

        const button = $("#signup-btn").prop("disabled", true).text("Creating account...");

        api("/api/auth/signup", { method: "POST", data: { full_name, email, password } })
            .done(() => {
                sessionStorage.setItem("ce_registered", "1");
                go("login.html");
            })
            .fail((xhr) => {
                toast(errorMessage(xhr), "error");
                button.prop("disabled", false).text("Create account");
            });
    });
});