const user = requireAuth(['technician', 'admin']);
document.getElementById('userNameLabel').textContent = user ? `— ${user.name}` : '';
document.getElementById('logoutBtn').addEventListener('click', logout);

async function loadAssigned() {
  try {
    const { tickets } = await apiRequest('/tickets/assigned');
    const container = document.getElementById('assignedTickets');
    const emptyEl = document.getElementById('assignedEmpty');
    container.innerHTML = '';

    if (tickets.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    tickets.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'ticket-card';

      const requesterName = t.requester ? t.requester.name : 'Unknown';

      card.innerHTML = `
        <span class="badge ${t.status}">${t.status}</span>
        <h3>${escapeHtml(t.name)}</h3>
        <div class="meta">${escapeHtml(t.location)} • ${formatDate(t.createdAt)}</div>
        <div class="details">${t.details ? escapeHtml(t.details) : '<em>No extra details</em>'}</div>
        <div class="meta">Requested by: ${escapeHtml(requesterName)}</div>
        <div class="solve-status">
          <span class="pill ${t.userSolved ? 'done' : ''}">User: ${t.userSolved ? 'Solved' : 'Pending'}</span>
          <span class="pill ${t.technicianSolved ? 'done' : ''}">You: ${t.technicianSolved ? 'Solved' : 'Pending'}</span>
        </div>
        ${
          t.status !== 'closed' && !t.technicianSolved
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
          loadAssigned();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadAssigned();
