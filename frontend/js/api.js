function api(path, { method = "GET", data, formData, onProgress } = {}) {
  const options = {
    url: CONFIG.API_URL + path,
    method,
    headers: {},
  };

  const token = Auth.token();
  if (token) options.headers.Authorization = "Bearer " + token;

  if (formData) {
    options.data = formData;
    options.processData = false;
    options.contentType = false;
  } else if (data) {
    options.data = JSON.stringify(data);
    options.contentType = "application/json";
  }

  if (onProgress) {
    options.xhr = function () {
      const xhr = $.ajaxSettings.xhr();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      return xhr;
    };
  }

  return $.ajax(options).fail((xhr) => {
    if (xhr.status === 401 && token) {
      Auth.clear();
      sessionStorage.setItem("ce_flash", "Your session expired. Please log in again.");
      go("login.html");
    }
  });
}

function errorMessage(xhr) {
  if (xhr.status === 0) return "Can't reach the server. Check your connection and try again.";
  if (xhr.status === 403) return "You don't have permission to do that. If you think this is a mistake, contact an admin at s.uwamahoro1@alustudent.com.";
  const body = xhr.responseJSON;
  return (body && (body.message || body.error)) || "Something went wrong. Please try again.";
}