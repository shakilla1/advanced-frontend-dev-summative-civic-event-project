$(function () {
  Auth.requireLogin();

  let current = null;

  function fill(u) {
    current = u;
    $("#full_name").val(u.full_name);
    $("#email").val(u.email);
    $("#role").text(u.role);
    $("#status").text(u.is_active === false ? "Disabled" : "Active");
  }

  api("/api/users/profile/me")
    .done((res) => fill(res.data))
    .fail((xhr) => toast(errorMessage(xhr), "error"));

  $("#profile-form").on("submit", function (e) {
    e.preventDefault();
    $(".field-error").addClass("hidden");

    const full_name = $("#full_name").val().trim();
    const email = $("#email").val().trim();
    let valid = true;

    if (full_name.length < 2) {
      $("#full_name-error").text("Enter your full name.").removeClass("hidden");
      valid = false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      $("#email-error").text("Enter a valid email address.").removeClass("hidden");
      valid = false;
    }
    if (!valid) return;

    if (current && email !== current.email && !confirm("Change your login email to " + email + "?")) return;

    const button = $("#save-btn").prop("disabled", true).text("Saving...");

    // Only name and email are sent; role and account status can't be changed from the UI.
    api("/api/users/profile/me", { method: "PATCH", data: { full_name, email } })
      .done(() => {
        api("/api/users/profile/me").done((res) => {
          Auth.updateUser({ ...Auth.user(), full_name: res.data.full_name, email: res.data.email });
          sessionStorage.setItem("ce_notice", "Profile updated.");
          location.reload();
        });
      })
      .fail((xhr) => {
        if (xhr.status === 409) {
          $("#email-error").text("That email is already used by another account.").removeClass("hidden");
        } else {
          toast(errorMessage(xhr), "error");
        }
        button.prop("disabled", false).text("Save changes");
      });
  });
});