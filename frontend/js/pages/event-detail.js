$(function () {
    Auth.requireLogin();

    const eventId = new URLSearchParams(location.search).get("id");
    if (!eventId) {
        go("events.html");
        return;
    }

    const admin = Auth.isAdmin();
    let ev = null;
    let registered = false;
    let myFeedback = null;

    function ended() {
        return ev.ends_at && new Date(ev.ends_at) < new Date();
    }

    function renderEvent() {
        const img = mediaUrl(ev.metadata && ev.metadata.image_url);
        const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.location);
        const picture = img
            ? `<img src="${esc(img)}" alt="${esc(ev.title)}" class="w-full h-64 sm:h-80 object-cover">`
            : "";
        const editLink = admin
            ? `<a href="event-form.html?id=${ev.id}" class="text-sm text-slate-700 underline">Edit event</a>`
            : "";

        $("#event-view").html(`
      <article class="bg-white rounded-xl shadow overflow-hidden">
        ${picture}
        <div class="p-6 space-y-4">
          <div class="flex items-start justify-between gap-4">
            <h1 class="text-2xl font-bold text-slate-900">${esc(ev.title)}</h1>
            ${editLink}
          </div>
          <dl class="grid gap-3 sm:grid-cols-3 text-sm">
            <div><dt class="font-medium text-slate-500">Starts</dt><dd class="text-slate-900">${esc(formatDate(ev.starts_at))}</dd></div>
            <div><dt class="font-medium text-slate-500">Ends</dt><dd class="text-slate-900">${esc(formatDate(ev.ends_at))}</dd></div>
            <div>
              <dt class="font-medium text-slate-500">Location</dt>
              <dd class="text-slate-900">${esc(ev.location)}
                <a href="${mapUrl}" target="_blank" rel="noopener" class="text-teal-700 underline ml-1">Map</a>
              </dd>
            </div>
          </dl>
          <p class="text-slate-700 whitespace-pre-line">${esc(ev.description)}</p>
          <div id="reg-box"></div>
        </div>
      </article>`);
        document.title = ev.title + " | CivicEvents";
        renderRegistration();
    }

    function renderRegistration() {
        if (admin) {
            $("#reg-box").empty();
            return;
        }
        if (ended()) {
            $("#reg-box").html(`<p class="text-sm text-slate-600">This event has ended.</p>`);
            return;
        }
        const label = registered ? "Cancel registration" : "Register for this event";
        const style = registered
            ? "border border-red-700 text-red-700 hover:bg-red-50"
            : "bg-teal-700 hover:bg-teal-800 text-white";
        const status = registered ? `<p class="text-sm text-green-700 mb-2">You're registered for this event.</p>` : "";
        $("#reg-box").html(`${status}<button id="reg-btn" class="${style} font-medium px-5 py-2 rounded-lg disabled:opacity-60">${label}</button>`);
    }

    function renderFeedbackForm() {
        $("#feedback-box").removeClass("hidden");
        if (myFeedback) {
            $("#feedback-title").text("Your feedback");
            $("#feedback-btn").text("Update feedback");
            $(`input[name=rating][value=${myFeedback.rating}]`).prop("checked", true);
            $("#comment").val(myFeedback.comment || "");
        } else {
            $("#feedback-title").text("Leave feedback");
            $("#feedback-btn").text("Submit feedback");
        }
    }

    function loadMyFeedback() {
        return api("/api/event-feedback/my-feedback").done((res) => {
            myFeedback = (res.data || []).find((f) => f.event_id === eventId) || null;
            renderFeedbackForm();
        });
    }

    function loadAttendees() {
        // Role guard: attendee list is requested and shown only for admins.
        if (!admin) return;
        api("/api/event-registrations/event/" + eventId + "/attendees")
            .done((res) => {
                const list = res.data || [];
                $("#attendees-box").removeClass("hidden");
                $("#attendees").html(
                    list.length
                        ? list.map((a) => `<li class="py-2 text-sm"><span class="font-medium text-slate-900">${esc(a.full_name)}</span> <span class="text-slate-600">${esc(a.email)}</span></li>`).join("")
                        : `<li class="py-2 text-sm text-slate-600">Nobody has registered yet.</li>`
                );
            })
            .fail((xhr) => toast(errorMessage(xhr), "error"));
    }
    function loadReviews() {
        // Role guard: the backend only lets admins read all feedback for an event.
        if (!admin) return;
        api("/api/event-feedback/event/" + eventId)
            .done((res) => {
                const list = res.data || [];
                $("#reviews-box").removeClass("hidden");

                if (!list.length) {
                    $("#average").text("No ratings yet");
                    $("#reviews").html(`<li class="py-3 text-sm text-slate-600">Nobody has left feedback yet.</li>`);
                    return;
                }

                const average = list.reduce((sum, f) => sum + Number(f.rating), 0) / list.length;
                $("#average").text(`Average ${average.toFixed(1)} / 5 from ${list.length} ${list.length === 1 ? "rating" : "ratings"}`);

                $("#reviews").html(
                    list.map((f) => {
                        const name = f.full_name || (f.user && f.user.full_name) || "Attendee";
                        return `
              <li class="py-3">
                <p class="text-sm font-medium text-slate-900">${esc(name)}
                  <span class="text-amber-600 ml-2" aria-label="${f.rating} out of 5">${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}</span>
                </p>
                <p class="text-sm text-slate-700 mt-1">${esc(f.comment)}</p>
              </li>`;
                    }).join("")
                );
            })
            .fail((xhr) => toast(errorMessage(xhr), "error"));
    }

    function loadMyRegistration() {
        return api("/api/event-registrations/my-registrations").done((res) => {
            registered = (res.data || []).some(
                (r) => (r.event_id || (r.event && r.event.id)) === eventId && r.status !== "cancelled"
            );
            renderRegistration();
        });
    }

    $("#event-view").on("click", "#reg-btn", function () {
        if (registered && !confirm("Cancel your registration for this event?")) return;
        const button = $(this).prop("disabled", true);
        const path = registered ? "/api/event-registrations/cancel" : "/api/event-registrations/register";

        api(path, { method: "POST", data: { event_id: eventId } })
            .done(() => {
                registered = !registered;
                renderRegistration();
                toast(registered ? "You're registered." : "Registration cancelled.");
            })
            .fail((xhr) => {
                toast(errorMessage(xhr), "error");
                button.prop("disabled", false);
            });
    });

    $("#feedback-form").on("submit", function (e) {
        e.preventDefault();
        $("#rating-error, #comment-error").addClass("hidden");

        const rating = Number($("input[name=rating]:checked").val());
        const comment = $("#comment").val().trim();
        let valid = true;

        if (!rating) {
            $("#rating-error").text("Choose a rating from 1 to 5.").removeClass("hidden");
            valid = false;
        }
        if (!comment) {
            $("#comment-error").text("Add a short comment.").removeClass("hidden");
            valid = false;
        }
        if (!valid) return;

        const button = $("#feedback-btn").prop("disabled", true);
        const request = myFeedback
            ? api("/api/event-feedback/" + myFeedback.id, { method: "PUT", data: { rating, comment } })
            : api("/api/event-feedback", { method: "POST", data: { event_id: eventId, rating, comment } });

        request
            .done(() => {
                toast(myFeedback ? "Feedback updated." : "Thanks for your feedback.");
                loadMyFeedback();
            })
            .fail((xhr) => toast(errorMessage(xhr), "error"))
            .always(() => button.prop("disabled", false));
    });

    api("/api/events/" + eventId)
        .done((res) => {
            ev = res.data;
            renderEvent();
            loadAttendees();
            loadReviews();
            if (!admin) {
                loadMyRegistration();
                loadMyFeedback();
            }
        })
        .fail((xhr) => {
            $("#event-view").html(`
        <div class="bg-white rounded-xl shadow p-8 text-center">
          <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
          <a href="events.html" class="text-teal-700 underline">Back to events</a>
        </div>`);
        });
});