$(function () {
  Auth.requireLogin();

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    go("promos.html");
    return;
  }

  function stamp(seconds) {
    const ms = Math.round((seconds % 1) * 1000);
    const s = Math.floor(seconds) % 60;
    const m = Math.floor(seconds / 60) % 60;
    const h = Math.floor(seconds / 3600);
    const pad = (n, size = 2) => String(n).padStart(size, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
  }

  function captionLines(text) {
    let parts = text.split(/\n+/).map((t) => t.trim()).filter(Boolean);
    if (parts.length < 2) {
      parts = (text.match(/[^.!?]+[.!?]*/g) || [text]).map((t) => t.trim()).filter(Boolean);
    }
    const lines = [];
    parts.forEach((part) => {
      const words = part.split(/\s+/);
      for (let i = 0; i < words.length; i += 10) lines.push(words.slice(i, i + 10).join(" "));
    });
    return lines;
  }

  function parseTimed(text) {
    const rows = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const matches = rows.map((r) => r.match(/^(\d+):(\d{2})\s+(.+)$/));
    if (!rows.length || !matches.every(Boolean)) return null;
    return matches.map((m) => ({ start: Number(m[1]) * 60 + Number(m[2]), text: m[3] }));
  }

  function addCaptions(player, text) {
    if (!isFinite(player.duration)) return;

    let cues;
    const timed = parseTimed(text);
    if (timed) {
      cues = timed.map((c, i) => {
        const end = i + 1 < timed.length ? timed[i + 1].start : player.duration;
        return `${stamp(c.start)} --> ${stamp(end)}\n${c.text}`;
      });
    } else {
      const lines = captionLines(text);
      if (!lines.length) return;
      const slot = player.duration / lines.length;
      cues = lines.map((line, i) => `${stamp(i * slot)} --> ${stamp((i + 1) * slot)}\n${line}`);
    }

    const file = new Blob(["WEBVTT\n\n" + cues.join("\n\n")], { type: "text/vtt" });
    const track = document.createElement("track");
    track.kind = "captions";
    track.label = "English";
    track.srclang = "en";
    track.src = URL.createObjectURL(file);
    track.default = true;
    player.appendChild(track);
    player.textTracks[player.textTracks.length - 1].mode = "showing";
  }
  api("/api/promos/" + id)
    .done((res) => {
      const p = res.data;
      const video = mediaUrl(p.video_url);
      const transcript = p.caption_text
        ? `<section class="mt-6">
             <h2 class="text-sm font-semibold text-slate-900 mb-2">Transcript</h2>
                <p class="text-slate-700 whitespace-pre-line">${esc(p.caption_text.replace(/^\d+:\d{2}\s+/gm, ""))}</p>
           </section>`
        : "";

      $("#view").html(`
        <article class="bg-white rounded-xl shadow p-6">
          <video id="player" controls preload="metadata" crossorigin="anonymous" class="w-full rounded-lg bg-black" aria-label="${esc(p.title)}">
            <source src="${esc(video)}">
            Your browser can't play this video. <a href="${esc(video)}" class="underline">Download it</a> instead.
          </video>
          <h1 class="text-2xl font-bold text-slate-900 mt-5">${esc(p.title)}</h1>
          <p class="text-slate-700 mt-2 whitespace-pre-line">${esc(p.description)}</p>
          ${transcript}
        </article>`);
      document.title = p.title + " | CivicEvents";

      const player = document.getElementById("player");
      player.addEventListener("error", () => toast("This video could not be loaded.", "error"));
      if (p.caption_text) {
        player.addEventListener("loadedmetadata", () => addCaptions(player, p.caption_text), { once: true });
      }
    })
    .fail((xhr) => {
      $("#view").html(`
        <div class="bg-white rounded-xl shadow p-8 text-center">
          <p class="text-red-700 mb-3">${esc(errorMessage(xhr))}</p>
          <a href="promos.html" class="text-teal-700 underline">Back to promos</a>
        </div>`);
    });
});