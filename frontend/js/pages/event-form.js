$(function () {
  // Role guard: only admins may open this page; everyone else is sent away.
  Auth.requireAdmin();

  const MAX_IMAGE = 2 * 1024 * 1024;
  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
  const eventId = new URLSearchParams(location.search).get("id");

  function toLocalInput(value) {
    const d = new Date(value);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function showError(field, message) {
    $(`#${field}-error`).text(message).removeClass("hidden");
  }

  if (eventId) {
    $("#form-title").text("Edit event");
    document.title = "Edit event | CivicEvents";
    api("/api/events/" + eventId)
      .done((res) => {
        const ev = res.data;
        $("#title").val(ev.title);
        $("#description").val(ev.description);
        $("#location").val(ev.location);
        $("#starts_at").val(ev.starts_at ? toLocalInput(ev.starts_at) : "");
        $("#ends_at").val(ev.ends_at ? toLocalInput(ev.ends_at) : "");
        const img = ev.metadata && ev.metadata.image_url;
        if (img) $("#preview").attr("src", mediaUrl(img)).removeClass("hidden");
      })
      .fail((xhr) => toast(errorMessage(xhr), "error"));
  }

    $("#image").on("change", function () {
    $("#image-error").addClass("hidden");
    const file = this.files[0];
    if (!file) return;

    const problem = checkFile(file, ["jpg", "jpeg", "png", "gif"], 2);
    if (problem) {
      showError("image", problem);
      this.value = "";
      return;
    }
    $("#preview").attr("src", URL.createObjectURL(file)).removeClass("hidden");
  });

  $("#event-form").on("submit", function (e) {
    e.preventDefault();
    $(".field-error").addClass("hidden");

    const title = $("#title").val().trim();
    const description = $("#description").val().trim();
    const location = $("#location").val().trim();
    const starts = $("#starts_at").val();
    const ends = $("#ends_at").val();
    let valid = true;

    if (!title) { showError("title", "Give the event a title."); valid = false; }
    if (!description) { showError("description", "Add a short description."); valid = false; }
    if (!location) { showError("location", "Where is it happening?"); valid = false; }
    if (!starts) { showError("starts_at", "Choose a start time."); valid = false; }
    if (!ends) { showError("ends_at", "Choose an end time."); valid = false; }
    if (starts && ends && new Date(ends) < new Date(starts)) {
      showError("ends_at", "The end can't be before the start.");
      valid = false;
    }
    if (!valid) return;

    const body = new FormData();
    body.append("title", title);
    body.append("description", description);
    body.append("location", location);
    body.append("starts_at", new Date(starts).toISOString());
    body.append("ends_at", new Date(ends).toISOString());
    const file = $("#image")[0].files[0];
    if (file) body.append("image", file);

    const button = $("#save-btn").prop("disabled", true).text("Saving...");
    $("#progress-wrap").removeClass("hidden");

    api(eventId ? "/api/events/" + eventId : "/api/events", {
      method: eventId ? "PUT" : "POST",
      formData: body,
      onProgress: (pct) => {
        $("#progress-bar").css("width", pct + "%");
        $("#progress-text").text(pct < 100 ? `Uploading ${pct}%` : "Finishing up...");
      },
    })
      .done(() => {
        sessionStorage.setItem("ce_notice", eventId ? "Event updated." : "Event created.");
        go("events.html");
      })
      .fail((xhr) => {
        toast(errorMessage(xhr), "error");
        button.prop("disabled", false).text("Save event");
        $("#progress-wrap").addClass("hidden");
      });
  });
});