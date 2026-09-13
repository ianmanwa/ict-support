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

// ---------- My Account (admin's own email/password) ----------
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
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorEl.textContent = '';
  successEl.textContent = '';

  const newEmail = document.getElementById('maEmail').value.trim();
  const newPassword = document.getElementById('maNewPassword').value;
  const currentPassword = document.getElementById('maCurrentPassword').value;

  try {
    const data = await withLoading(submitBtn, () =>
      apiRequest('/auth/account', {
        method: 'PATCH',
        body: { currentPassword, newEmail, newPassword: newPassword || undefined }
      })
    , 'Saving...');

    user.email = data.user.email;
    localStorage.setItem('ict_user', JSON.stringify(user));
    document.getElementById('maCurrentPassword').value = '';
    document.getElementById('maNewPassword').value = '';
    successEl.textContent = 'Saved. Use your new details next time you log in.';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Roles (used by Users tab + Manage Data tab) ----------
let roleCache = [];

async function loadRoleCache() {
  const { roles } = await apiRequest('/users/role/list');
  roleCache = roles;
}

function populateRoleSelect(select, selectedValue) {
  select.innerHTML = '';
  roleCache.forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.name;
    opt.textContent = r.name.charAt(0).toUpperCase() + r.name.slice(1);
    if (r.name === selectedValue) opt.selected = true;
    select.appendChild(opt);
  });
}

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
    const roleSelectId = `role-select-${u._id}`;
    tr.innerHTML = `
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.phone || '-')}</td>
      <td><select id="${roleSelectId}" data-role-select="${u._id}" ${u._id === user.id ? 'disabled' : ''}></select></td>
      <td>${formatDate(u.createdAt)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-edit-user="${u._id}" data-edit-name="${escapeHtml(u.name)}" data-edit-email="${escapeHtml(u.email)}" data-edit-phone="${escapeHtml(u.phone || '')}">Edit</button>
        <button class="btn btn-small btn-danger" data-delete-user="${u._id}" ${u._id === user.id ? 'disabled' : ''}>Delete</button>
      </td>
    `;
    body.appendChild(tr);
    populateRoleSelect(document.getElementById(roleSelectId), u.role);
  });

  body.querySelectorAll('[data-edit-user]').forEach((btn) => {
    btn.addEventListener('click', () =>
      openEditUserModal(btn.dataset.editUser, btn.dataset.editName, btn.dataset.editEmail, btn.dataset.editPhone)
    );
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
        loadUsers();
      }
    });
  });

  body.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this account? This cannot be undone.')) return;
      try {
        await withLoading(btn, () => apiRequest(`/users/${btn.dataset.deleteUser}`, { method: 'DELETE' }), '...');
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
  populateRoleSelect(document.getElementById('nuRole'), 'user');
  newUserModalOverlay.classList.remove('hidden');
});
document.getElementById('cancelNewUserBtn').addEventListener('click', () => {
  newUserModalOverlay.classList.add('hidden');
});
document.getElementById('newUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('newUserError');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorEl.textContent = '';

  try {
    await withLoading(submitBtn, () =>
      apiRequest('/users', {
        method: 'POST',
        body: {
          name: document.getElementById('nuName').value.trim(),
          email: document.getElementById('nuEmail').value.trim(),
          phone: document.getElementById('nuPhone').value.trim(),
          password: document.getElementById('nuPassword').value,
          role: document.getElementById('nuRole').value
        }
      })
    , 'Creating...');
    newUserModalOverlay.classList.add('hidden');
    loadUsers();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Edit user modal
const editUserModalOverlay = document.getElementById('editUserModalOverlay');
let editUserId = null;

function openEditUserModal(id, name, email, phone) {
  editUserId = id;
  document.getElementById('euName').value = name;
  document.getElementById('euEmail').value = email;
  document.getElementById('euPhone').value = phone || '';
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
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorEl.textContent = '';

  const body = {
    name: document.getElementById('euName').value.trim(),
    email: document.getElementById('euEmail').value.trim(),
    phone: document.getElementById('euPhone').value.trim()
  };
  const newPassword = document.getElementById('euPassword').value;
  if (newPassword) body.password = newPassword;

  try {
    await withLoading(submitBtn, () => apiRequest(`/users/${editUserId}`, { method: 'PATCH', body }), 'Saving...');
    editUserModalOverlay.classList.add('hidden');
    loadUsers();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Manage Data: Departments ----------
async function loadDepartments() {
  const { departments } = await apiRequest('/departments');
  const body = document.getElementById('departmentsTableBody');
  const emptyEl = document.getElementById('departmentsEmpty');
  body.innerHTML = '';

  if (departments.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  departments.forEach((d) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="dept-name-cell">${escapeHtml(d.name)}</td>
      <td>
        <button class="btn btn-small btn-secondary" data-rename-dept="${d._id}" data-name="${escapeHtml(d.name)}">Rename</button>
        <button class="btn btn-small btn-danger" data-delete-dept="${d._id}">Delete</button>
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-rename-dept]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newName = prompt('Rename department to:', btn.dataset.name);
      if (!newName || !newName.trim()) return;
      try {
        await apiRequest(`/departments/${btn.dataset.renameDept}`, { method: 'PATCH', body: { name: newName.trim() } });
        loadDepartments();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  body.querySelectorAll('[data-delete-dept]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this department?')) return;
      try {
        await apiRequest(`/departments/${btn.dataset.deleteDept}`, { method: 'DELETE' });
        loadDepartments();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

document.getElementById('newDepartmentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('departmentError');
  const input = document.getElementById('newDepartmentName');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorEl.textContent = '';

  try {
    await withLoading(submitBtn, () => apiRequest('/departments', { method: 'POST', body: { name: input.value.trim() } }), '...');
    input.value = '';
    loadDepartments();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Manage Data: Roles ----------
async function loadRolesTable() {
  await loadRoleCache();
  const body = document.getElementById('rolesTableBody');
  const emptyEl = document.getElementById('rolesEmpty');
  body.innerHTML = '';

  if (roleCache.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  roleCache.forEach((r) => {
    const tr = document.createElement('tr');
    const label = r.name.charAt(0).toUpperCase() + r.name.slice(1);
    tr.innerHTML = `
      <td>${escapeHtml(label)} ${r.isCore ? '<span class="badge">core</span>' : ''}</td>
      <td>
        ${
          r.isCore
            ? '<span style="font-size:0.78rem;color:var(--mid-grey);">Protected</span>'
            : `<button class="btn btn-small btn-secondary" data-rename-role="${r._id}" data-name="${escapeHtml(r.name)}">Rename</button>
               <button class="btn btn-small btn-danger" data-delete-role="${r._id}">Delete</button>`
        }
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-rename-role]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newName = prompt('Rename role to:', btn.dataset.name);
      if (!newName || !newName.trim()) return;
      try {
        await apiRequest(`/roles/${btn.dataset.renameRole}`, { method: 'PATCH', body: { name: newName.trim() } });
        loadRolesTable();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  body.querySelectorAll('[data-delete-role]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this role?')) return;
      try {
        await apiRequest(`/roles/${btn.dataset.deleteRole}`, { method: 'DELETE' });
        loadRolesTable();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

document.getElementById('newRoleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('roleError');
  const input = document.getElementById('newRoleName');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorEl.textContent = '';

  try {
    await withLoading(submitBtn, () => apiRequest('/roles', { method: 'POST', body: { name: input.value.trim() } }), '...');
    input.value = '';
    loadRolesTable();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Reports ----------
function wireReportButton(buttonId, path, filename) {
  const btn = document.getElementById(buttonId);
  btn.addEventListener('click', async () => {
    const errorEl = document.getElementById('reportError');
    errorEl.textContent = '';
    try {
      await withLoading(btn, () => downloadAuthedFile(path, filename), 'Generating...');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}
wireReportButton('downloadDocxBtn', '/reports/tickets.docx', 'ict-tickets-report.docx');
wireReportButton('downloadPdfBtn', '/reports/tickets.pdf', 'ict-tickets-report.pdf');
wireReportButton('downloadXlsxBtn', '/reports/tickets.xlsx', 'ict-tickets-report.xlsx');

// ---------- Tickets ----------
let technicianCache = [];

async function loadTechnicians() {
  const { technicians } = await apiRequest('/users/role/technicians');
  technicianCache = technicians;
}

function renderAdminRemarks(ticket) {
  if (!ticket.remarks || ticket.remarks.length === 0) return '';
  return `<div style="font-size:0.75rem;color:var(--mid-grey);margin-top:4px;">${ticket.remarks.length} remark(s) added</div>`;
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
    const deptName = t.department ? t.department.name : '—';

    let actionButtons = `<button class="btn btn-small btn-secondary" data-assign="${t._id}">${t.status === 'assigned' ? 'Reassign' : 'Assign'}</button>`;
    actionButtons += `<button class="btn btn-small btn-secondary" data-remark="${t._id}">Remark</button>`;
    if (t.status !== 'closed') {
      actionButtons += `<button class="btn btn-small btn-secondary" data-close="${t._id}">Close</button>`;
    }
    actionButtons += `<button class="btn btn-small btn-danger" data-delete="${t._id}">Delete</button>`;

    tr.innerHTML = `
      <td>${escapeHtml(requesterName)}</td>
      <td>${escapeHtml(t.name)}<br><span style="color:var(--mid-grey);font-size:0.78rem;">${escapeHtml(t.location)}</span>${renderAdminRemarks(t)}</td>
      <td>${escapeHtml(t.phone || '-')}</td>
      <td>${escapeHtml(deptName)}</td>
      <td><span class="badge ${t.status}">${t.status}</span></td>
      <td>${t.userSolved ? 'Yes' : 'No'}</td>
      <td>${t.technicianSolved ? 'Yes' : 'No'}</td>
      <td>${escapeHtml(techName)}</td>
      <td>${formatDate(t.createdAt)}</td>
      <td><div class="ticket-actions">${actionButtons}</div></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => runTicketAction(btn, `/tickets/${btn.dataset.close}/close`, 'PATCH'));
  });
  body.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this ticket? It will disappear from every view but stays in the database.')) return;
      runTicketAction(btn, `/tickets/${btn.dataset.delete}`, 'DELETE');
    });
  });
  body.querySelectorAll('[data-assign]').forEach((btn) => {
    btn.addEventListener('click', () => openAssignModal(btn.dataset.assign));
  });
  body.querySelectorAll('[data-remark]').forEach((btn) => {
    btn.addEventListener('click', () => openRemarkModal(btn.dataset.remark));
  });
}

async function runTicketAction(btn, path, method) {
  try {
    await withLoading(btn, () => apiRequest(path, { method }), '...');
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
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorEl.textContent = '';
  const technicianId = document.getElementById('assignTechSelect').value;

  if (!technicianId) {
    errorEl.textContent = 'No technician selected';
    return;
  }

  try {
    await withLoading(submitBtn, () =>
      apiRequest(`/tickets/${assignTicketId}/assign`, { method: 'PATCH', body: { technicianId } })
    , 'Assigning...');
    assignModalOverlay.classList.add('hidden');
    loadTickets();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Remark modal
const remarkModalOverlay = document.getElementById('remarkModalOverlay');
let remarkTicketId = null;

function openRemarkModal(ticketId) {
  remarkTicketId = ticketId;
  document.getElementById('remarkText').value = '';
  document.getElementById('remarkError').textContent = '';
  remarkModalOverlay.classList.remove('hidden');
}

document.getElementById('cancelRemarkBtn').addEventListener('click', () => {
  remarkModalOverlay.classList.add('hidden');
});

document.getElementById('remarkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('remarkError');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errorEl.textContent = '';
  const text = document.getElementById('remarkText').value.trim();

  try {
    await withLoading(submitBtn, () =>
      apiRequest(`/tickets/${remarkTicketId}/remark`, { method: 'PATCH', body: { text } })
    , 'Saving...');
    remarkModalOverlay.classList.add('hidden');
    loadTickets();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Init ----------
(async function init() {
  try {
    await loadRoleCache();
    await loadTechnicians();
    await loadTickets();
    await loadUsers();
    await loadDepartments();
    await loadRolesTable();
  } catch (err) {
    console.error(err);
  }
})();
