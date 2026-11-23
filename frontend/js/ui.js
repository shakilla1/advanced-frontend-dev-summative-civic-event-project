function toast(message, type = "success") {
    let box = $("#toast-box");
    if (!box.length) {
        box = $('<div id="toast-box" class="fixed top-4 right-4 z-50 space-y-2" role="status" aria-live="polite"></div>');
        $("body").append(box);
    }
    const colors = type === "success" ? "bg-green-700" : "bg-red-700";
    const el = $(`<div class="${colors} text-white px-4 py-3 rounded-lg shadow-lg text-sm"></div>`).text(message);
    box.append(el);
    setTimeout(() => el.fadeOut(300, () => el.remove()), 4000);
}

function showFlash() {
    const message = sessionStorage.getItem("ce_flash");
    if (message) {
        toast(message, "error");
        sessionStorage.removeItem("ce_flash");
    }
}
function esc(value) {
    return $("<div>").text(value ?? "").html();
}

function mediaUrl(path) {
    if (!path) return "";
    return /^https?:\/\//.test(path) ? path : CONFIG.API_URL + path;
}

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function checkFile(file, extensions, maxMB) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!extensions.includes(ext)) {
        return "Allowed formats: " + extensions.join(", ").toUpperCase() + ".";
    }
    if (file.size > maxMB * 1024 * 1024) {
        return "That file is larger than " + maxMB + " MB.";
    }
    return "";
}