const user = requireAuth(['user', 'admin', 'technician']);

document.getElementById('userNameLabel').textContent = user ? `— ${user.name}` : '';
document.getElementById('logoutBtn').addEventListener('click', logout);

// ---------- Request support modal ----------
const requestModalOverlay = document.getElementById('requestModalOverlay');
const helpBtn = document.getElementById('helpBtn');
const cancelRequestBtn = document.getElementById('cancelRequestBtn');
const requestForm = document.getElementById('requestForm');
const requestError = document.getElementById('requestError');

helpBtn.addEventListener('click', () => {
  // Pre-fill from saved profile defaults if available
  document.getElementById('reqName').value = user.name || '';
  document.getElementById('reqLocation').value = user.defaultLocation || '';
  document.getElementById('reqDetails').value = '';
  requestError.textContent = '';
  requestModalOverlay.classList.remove('hidden');
});

cancelRequestBtn.addEventListener('click', () => {
  requestModalOverlay.classList.add('hidden');
});

requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  requestError.textContent = '';

  const name = document.getElementById('reqName').value.trim();
  const location = document.getElementById('reqLocation').value.trim();
  const details = document.getElementById('reqDetails').value.trim();

  try {
    await apiRequest('/tickets', {
      method: 'POST',
      body: { name, location, details }
    });
    requestModalOverlay.classList.add('hidden');
    loadTickets();
  } catch (err) {
    requestError.textContent = err.message;
  }
});

// ---------- Profile settings modal ----------
const profileModalOverlay = document.getElementById('profileModalOverlay');
const profileLink = document.getElementById('profileLink');
const cancelProfileBtn = document.getElementById('cancelProfileBtn');
const profileForm = document.getElementById('profileForm');
const profileError = document.getElementById('profileError');
const profileSuccess = document.getElementById('profileSuccess');

profileLink.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('profName').value = user.name || '';
  document.getElementById('profLocation').value = user.defaultLocation || '';
  profileError.textContent = '';
  profileSuccess.textContent = '';
  profileModalOverlay.classList.remove('hidden');
});

cancelProfileBtn.addEventListener('click', () => {
  profileModalOverlay.classList.add('hidden');
});

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  profileError.textContent = '';
  profileSuccess.textContent = '';

  const name = document.getElementById('profName').value.trim();
  const defaultLocation = document.getElementById('profLocation').value.trim();

  try {
    const data = await apiRequest('/auth/profile', {
      method: 'PATCH',
      body: { name, defaultLocation }
    });

    user.name = data.user.name;
    user.defaultLocation = data.user.defaultLocation;
    localStorage.setItem('ict_user', JSON.stringify(user));
    document.getElementById('userNameLabel').textContent = `— ${user.name}`;

    profileSuccess.textContent = 'Saved.';
  } catch (err) {
    profileError.textContent = err.message;
  }
});

// ---------- Ticket lists ----------
async function loadTickets() {
  try {
    const { tickets } = await apiRequest('/tickets/mine');

    const open = tickets.filter((t) => t.status !== 'closed');
    const closed = tickets.filter((t) => t.status === 'closed');

    renderTickets('openTickets', 'openEmpty', open, true);
    renderTickets('closedTickets', 'closedEmpty', closed, false);
  } catch (err) {
    console.error(err);
  }
}

function renderTickets(containerId, emptyId, tickets, isOpenList) {
  const container = document.getElementById(containerId);
  const emptyEl = document.getElementById(emptyId);
  container.innerHTML = '';

  if (tickets.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  tickets.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'ticket-card';

    const techName = t.assignedTechnician ? t.assignedTechnician.name : 'Not yet assigned';

    card.innerHTML = `
      <span class="badge ${t.status}">${t.status}</span>
      <h3>${escapeHtml(t.name)}</h3>
      <div class="meta">${escapeHtml(t.location)} • ${formatDate(t.createdAt)}</div>
      <div class="details">${t.details ? escapeHtml(t.details) : '<em>No extra details</em>'}</div>
      <div class="meta">Technician: ${escapeHtml(techName)}</div>
      <div class="solve-status">
        <span class="pill ${t.userSolved ? 'done' : ''}">You: ${t.userSolved ? 'Solved' : 'Pending'}</span>
        <span class="pill ${t.technicianSolved ? 'done' : ''}">Technician: ${t.technicianSolved ? 'Solved' : 'Pending'}</span>
      </div>
      ${
        isOpenList && t.assignedTechnician && !t.userSolved
          ? `<div class="ticket-actions"><button class="btn btn-small btn-primary" data-solve="${t._id}">Mark as Solved</button></div>`
          : ''
      }
    `;

    container.appendChild(card);
  });

  container.querySelectorAll('[data-solve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await apiRequest(`/tickets/${btn.dataset.solve}/solve`, { method: 'PATCH' });
        loadTickets();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadTickets();
