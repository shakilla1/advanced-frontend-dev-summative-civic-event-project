const CONFIG = {
  API_URL: "http://localhost:4000",
  TOKEN_KEY: "ce_token",
  USER_KEY: "ce_user",
};

const SITE_ROOT = document.currentScript.src.replace(/js\/config\.js.*$/, "");

function go(page) {
  window.location.href = SITE_ROOT + page;
}