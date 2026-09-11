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
