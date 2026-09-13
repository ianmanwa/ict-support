// Thin wrapper around fetch() that attaches the JWT and parses JSON.
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem('ict_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

function getStoredUser() {
  const raw = localStorage.getItem('ict_user');
  return raw ? JSON.parse(raw) : null;
}

function requireAuth(allowedRoles) {
  const token = localStorage.getItem('ict_token');
  const user = getStoredUser();

  if (!token || !user) {
    window.location.href = 'index.html';
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.href = 'index.html';
    return null;
  }

  return user;
}

function logout() {
  localStorage.removeItem('ict_token');
  localStorage.removeItem('ict_user');
  window.location.href = 'index.html';
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString();
}

// Disables a button and swaps its label while an async action runs, so a
// slow response (the backend can be on a free tier that sleeps and takes a
// while to wake up) doesn't tempt a second click. Restores the button
// afterwards either way.
async function withLoading(button, workFn, loadingText = 'Please wait...') {
  if (!button) return workFn();

  const originalHtml = button.innerHTML;
  const originalDisabled = button.disabled;

  button.disabled = true;
  button.classList.add('is-loading');
  button.innerHTML = `<span class="spinner"></span>${loadingText}`;

  try {
    return await workFn();
  } finally {
    button.disabled = originalDisabled;
    button.classList.remove('is-loading');
    button.innerHTML = originalHtml;
  }
}

// Downloads a file from an authenticated endpoint (reports, etc.) by
// fetching it as a blob and triggering a browser download — a plain <a
// href> can't carry the Authorization header these routes need.
async function downloadAuthedFile(path, filename) {
  const token = localStorage.getItem('ict_token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.message) message = data.message;
    } catch (e) {
      // response wasn't JSON
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
