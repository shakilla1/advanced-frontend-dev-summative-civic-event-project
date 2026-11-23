$(function () {
  Auth.requireLogin();

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    go("announcements.html");
    return;
  }

  function clock(seconds) {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, "0");
    return `${m}:${s}`;
  }

  api("/api/announcements/" + id)
    .done((res) => {
      const a = res.data;
      const src = mediaUrl(a.audio_url);
      const transcript = a.transcript
        ? `<section class="mt-6"><h2 class="text-sm font-semibold text-slate-900 mb-2">Transcript</h2><p class="text-slate-700 whitespace-pre-line">${esc(a.transcript)}</p></section>`
        : "";

      $("#view").html(`
        <article class="bg-white rounded-xl shadow p-6">
          <h1 class="text-2xl font-bold text-slate-900">${esc(a.title)}</h1>
          <p class="text-sm text-slate-600 mt-1">${esc(formatDate(a.created_at))}</p>

          <audio id="player" controls preload="metadata" class="w-full mt-5" aria-label="Audio for ${esc(a.title)}">
            <source src="${esc(src)}">
            Your browser can't play this audio. <a href="${esc(src)}" class="underline text-teal-700">Download the file</a> instead.
          </audio>
          <p class="text-sm text-slate-600 mt-2" aria-live="off"><span id="now">0:00</span> / <span id="total">0:00</span></p>
          ${transcript}
        </article>`);
      document.title = a.title + " | CivicEvents";

      const player = document.getElementById("player");
      player.addEventListener("loadedmetadata", () => $("#total").text(clock(player.duration)));
      player.addEventListener("timeupdate", () => $("#now").text(clock(player.currentTime)));
      player.addEventListener("error", () => toast("This audio could not be loaded.", "error"));
    })
    .fail((xhr) => {
      $("#view").html(`
        <div class="bg-white rounded-xl shadow p-8 text-center">
          <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
          <a href="announcements.html" class="text-teal-700 underline">Back to announcements</a>
        </div>`);
    });
});