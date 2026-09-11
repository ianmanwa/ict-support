const user = requireAuth(['admin']);
document.getElementById('userNameLabel').textContent = user ? `— ${user.name}` : '';
document.getElementById('logoutBtn').addEventListener('click', logout);

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---------- Users ----------
async function loadUsers() {
  const { users } = await apiRequest('/users');
  const body = document.getElementById('usersTableBody');
  const emptyEl = document.getElementById('usersEmpty');
  body.innerHTML = '';

  if (users.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  users.forEach((u) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>
        <select data-role-select="${u._id}" ${u._id === user.id ? 'disabled' : ''}>
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
          <option value="technician" ${u.role === 'technician' ? 'selected' : ''}>Technician</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>${formatDate(u.createdAt)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-user="${u._id}" data-edit-name="${escapeHtml(u.name)}" data-edit-email="${escapeHtml(u.email)}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-user="${u._id}" ${u._id === user.id ? 'disabled' : ''}>Delete</button>
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-edit-user]').forEach((btn) => {
    btn.addEventListener('click', () => openEditUserModal(btn.dataset.editUser, btn.dataset.editName, btn.dataset.editEmail));
  });

  body.querySelectorAll('[data-role-select]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try {
        await apiRequest(`/users/${sel.dataset.roleSelect}/role`, {
          method: 'PATCH',
          body: { role: sel.value }
        });
        loadUsers();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  body.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this account? This cannot be undone.')) return;
      try {
        await apiRequest(`/users/${btn.dataset.deleteUser}`, { method: 'DELETE' });
        loadUsers();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

// Create user modal
const newUserModalOverlay = document.getElementById('newUserModalOverlay');
document.getElementById('newUserBtn').addEventListener('click', () => {
  document.getElementById('newUserForm').reset();
  document.getElementById('newUserError').textContent = '';
  newUserModalOverlay.classList.remove('hidden');
});
document.getElementById('cancelNewUserBtn').addEventListener('click', () => {
  newUserModalOverlay.classList.add('hidden');
});
document.getElementById('newUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('newUserError');
  errorEl.textContent = '';

  try {
    await apiRequest('/users', {
      method: 'POST',
      body: {
        name: document.getElementById('nuName').value.trim(),
        email: document.getElementById('nuEmail').value.trim(),
        password: document.getElementById('nuPassword').value,
        role: document.getElementById('nuRole').value
      }
    });
    newUserModalOverlay.classList.add('hidden');
    loadUsers();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Edit user modal (admin editing another account's name/email/password)
const editUserModalOverlay = document.getElementById('editUserModalOverlay');
let editUserId = null;

function openEditUserModal(id, name, email) {
  editUserId = id;
  document.getElementById('euName').value = name;
  document.getElementById('euEmail').value = email;
  document.getElementById('euPassword').value = '';
  document.getElementById('editUserError').textContent = '';
  editUserModalOverlay.classList.remove('hidden');
}

document.getElementById('cancelEditUserBtn').addEventListener('click', () => {
  editUserModalOverlay.classList.add('hidden');
});

document.getElementById('editUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('editUserError');
  errorEl.textContent = '';

  const body = {
    name: document.getElementById('euName').value.trim(),
    email: document.getElementById('euEmail').value.trim()
  };
  const newPassword = document.getElementById('euPassword').value;
  if (newPassword) body.password = newPassword;

  try {
    await apiRequest(`/users/${editUserId}`, { method: 'PATCH', body });
    editUserModalOverlay.classList.add('hidden');
    loadUsers();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// My Account modal (admin's own email/password)
const myAccountModalOverlay = document.getElementById('myAccountModalOverlay');

document.getElementById('myAccountLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('maEmail').value = user.email || '';
  document.getElementById('maNewPassword').value = '';
  document.getElementById('maCurrentPassword').value = '';
  document.getElementById('myAccountError').textContent = '';
  document.getElementById('myAccountSuccess').textContent = '';
  myAccountModalOverlay.classList.remove('hidden');
});

document.getElementById('cancelMyAccountBtn').addEventListener('click', () => {
  myAccountModalOverlay.classList.add('hidden');
});

document.getElementById('myAccountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('myAccountError');
  const successEl = document.getElementById('myAccountSuccess');
  errorEl.textContent = '';
  successEl.textContent = '';

  const newEmail = document.getElementById('maEmail').value.trim();
  const newPassword = document.getElementById('maNewPassword').value;
  const currentPassword = document.getElementById('maCurrentPassword').value;

  try {
    const data = await apiRequest('/auth/account', {
      method: 'PATCH',
      body: { currentPassword, newEmail, newPassword: newPassword || undefined }
    });

    user.email = data.user.email;
    localStorage.setItem('ict_user', JSON.stringify(user));
    document.getElementById('maCurrentPassword').value = '';
    document.getElementById('maNewPassword').value = '';
    successEl.textContent = 'Saved. Use your new details next time you log in.';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Tickets ----------
let technicianCache = [];

async function loadTechnicians() {
  const { technicians } = await apiRequest('/users/role/technicians');
  technicianCache = technicians;
}

async function loadTickets() {
  const { tickets } = await apiRequest('/tickets');
  const body = document.getElementById('ticketsTableBody');
  const emptyEl = document.getElementById('ticketsEmpty');
  body.innerHTML = '';

  if (tickets.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  tickets.forEach((t) => {
    const tr = document.createElement('tr');
    const requesterName = t.requester ? t.requester.name : 'Unknown';
    const techName = t.assignedTechnician ? t.assignedTechnician.name : '—';

    let actionButtons = '';
    if (t.status === 'pending') {
      actionButtons += `<button class="btn btn-small btn-primary" data-approve="${t._id}">Approve</button>
                         <button class="btn btn-small btn-secondary" data-deny="${t._id}">Deny</button>`;
    }
    if (t.status === 'approved' || t.status === 'assigned') {
      actionButtons += `<button class="btn btn-small btn-secondary" data-assign="${t._id}">${t.status === 'assigned' ? 'Reassign' : 'Assign'}</button>`;
    }
    if (t.status !== 'closed') {
      actionButtons += `<button class="btn btn-small btn-secondary" data-forceclose="${t._id}">Force Close</button>`;
    }
    actionButtons += `<button class="btn btn-small btn-danger" data-delete="${t._id}">Delete</button>`;

    tr.innerHTML = `
      <td>${escapeHtml(requesterName)}</td>
      <td>${escapeHtml(t.name)}<br><span style="color:var(--mid-grey);font-size:0.78rem;">${escapeHtml(t.location)}</span></td>
      <td><span class="badge ${t.status}">${t.status}</span></td>
      <td>${t.userSolved ? 'Yes' : 'No'}</td>
      <td>${t.technicianSolved ? 'Yes' : 'No'}</td>
      <td>${escapeHtml(techName)}</td>
      <td>${formatDate(t.createdAt)}</td>
      <td><div class="ticket-actions">${actionButtons}</div></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => runTicketAction(`/tickets/${btn.dataset.approve}/approve`, 'PATCH'));
  });
  body.querySelectorAll('[data-deny]').forEach((btn) => {
    btn.addEventListener('click', () => runTicketAction(`/tickets/${btn.dataset.deny}/deny`, 'PATCH'));
  });
  body.querySelectorAll('[data-forceclose]').forEach((btn) => {
    btn.addEventListener('click', () => runTicketAction(`/tickets/${btn.dataset.forceclose}/force-close`, 'PATCH'));
  });
  body.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this ticket permanently?')) return;
      runTicketAction(`/tickets/${btn.dataset.delete}`, 'DELETE');
    });
  });
  body.querySelectorAll('[data-assign]').forEach((btn) => {
    btn.addEventListener('click', () => openAssignModal(btn.dataset.assign));
  });
}

async function runTicketAction(path, method) {
  try {
    await apiRequest(path, { method });
    loadTickets();
  } catch (err) {
    alert(err.message);
  }
}

// Assign modal
const assignModalOverlay = document.getElementById('assignModalOverlay');
let assignTicketId = null;

function openAssignModal(ticketId) {
  assignTicketId = ticketId;
  const select = document.getElementById('assignTechSelect');
  select.innerHTML = '';

  if (technicianCache.length === 0) {
    select.innerHTML = '<option value="">No technicians available</option>';
  } else {
    technicianCache.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t._id;
      opt.textContent = `${t.name} (${t.email})`;
      select.appendChild(opt);
    });
  }

  document.getElementById('assignError').textContent = '';
  assignModalOverlay.classList.remove('hidden');
}

document.getElementById('cancelAssignBtn').addEventListener('click', () => {
  assignModalOverlay.classList.add('hidden');
});

document.getElementById('assignForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('assignError');
  errorEl.textContent = '';
  const technicianId = document.getElementById('assignTechSelect').value;

  if (!technicianId) {
    errorEl.textContent = 'No technician selected';
    return;
  }

  try {
    await apiRequest(`/tickets/${assignTicketId}/assign`, {
      method: 'PATCH',
      body: { technicianId }
    });
    assignModalOverlay.classList.add('hidden');
    loadTickets();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Init ----------
(async function init() {
  try {
    await loadTechnicians();
    await loadTickets();
    await loadUsers();
  } catch (err) {
    console.error(err);
  }
})();
