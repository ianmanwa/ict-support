// If already logged in, skip straight to the right page.
(function redirectIfLoggedIn() {
  const user = getStoredUser();
  const token = localStorage.getItem('ict_token');
  if (user && token) {
    routeByRole(user.role);
  }
})();

function routeByRole(role) {
  if (role === 'admin') {
    window.location.href = 'admin.html';
  } else if (role === 'technician') {
    window.location.href = 'technician.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, password }
      });

      localStorage.setItem('ict_token', data.token);
      localStorage.setItem('ict_user', JSON.stringify(data.user));

      routeByRole(data.user.role);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}
