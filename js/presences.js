function getDateStr() { return document.getElementById('presenceDate').value || today(); }

function getPresencesForDate(date) {
  const all = DB.get(DB.keys.presences) || {};
  return all[date] || {};
}

function setPresence(residentId, status) {
  const date = getDateStr();
  const all = DB.get(DB.keys.presences) || {};
  if (!all[date]) all[date] = {};
  all[date][residentId] = status;
  DB.set(DB.keys.presences, all);
  renderStats();
  renderPresenceTable();
}

function markAllPresent() {
  const residents = (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti');
  const date = getDateStr();
  const all = DB.get(DB.keys.presences) || {};
  if (!all[date]) all[date] = {};
  residents.forEach(r => { all[date][r.id] = 'present'; });
  DB.set(DB.keys.presences, all);
  renderStats();
  renderPresenceTable();
  toast('Tous les résidents marqués présents');
}

function cycleStatus(residentId) {
  const date = getDateStr();
  const presences = getPresencesForDate(date);
  const current = presences[residentId] || 'unknown';
  const next = { unknown:'present', present:'absent', absent:'sortie', sortie:'unknown' };
  setPresence(residentId, next[current] || 'present');
}

function renderStats() {
  const residents = (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti');
  const presences = getPresencesForDate(getDateStr());
  let present=0, absent=0, sortie=0, unknown=0;
  residents.forEach(r => {
    const s = presences[r.id] || 'unknown';
    if (s==='present') present++;
    else if (s==='absent') absent++;
    else if (s==='sortie') sortie++;
    else unknown++;
  });
  document.getElementById('countPresent').textContent = present;
  document.getElementById('countAbsent').textContent = absent;
  document.getElementById('countSortie').textContent = sortie;
  document.getElementById('countUnknown').textContent = unknown;
}

function renderPresenceTable() {
  const residents = (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti');
  const presences = getPresencesForDate(getDateStr());
  const el = document.getElementById('presenceTable');

  if (!residents.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><h3>Aucun résident actif</h3><p><a href="residents.html">Ajouter des résidents</a></p></div>`;
    return;
  }

  const statusStyle = {
    present: 'background:#ecfdf5;color:#047857;font-weight:700',
    absent: 'background:#fef2f2;color:#b91c1c;font-weight:700',
    sortie: 'background:#fffbeb;color:#92400e;font-weight:700',
    unknown: 'color:var(--g300)'
  };
  const statusLabel = { present:'✓ Présent', absent:'✕ Absent', sortie:'↗ Sortie', unknown:'— ' };

  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.875rem">
    <thead style="background:var(--g50)">
      <tr>
        <th style="padding:.75rem 1.25rem;text-align:left;font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid var(--border)">Résident</th>
        <th style="padding:.75rem 1rem;text-align:left;font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid var(--border)">Chambre</th>
        <th style="padding:.75rem 1rem;text-align:center;font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid var(--border)">Statut</th>
        <th style="padding:.75rem 1rem;text-align:left;font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid var(--border)">Modifier</th>
      </tr>
    </thead>
    <tbody>
      ${residents.map(r => {
        const s = presences[r.id] || 'unknown';
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:.85rem 1.25rem">
            <div style="display:flex;align-items:center;gap:.75rem">
              <div class="avatar sm" style="background:${r.color||'var(--blue)'}">${initials(r.prenom,r.nom)}</div>
              <div>
                <div style="font-weight:600">${escHtml(r.prenom||'')} ${escHtml(r.nom||'')}</div>
                <div style="font-size:.72rem;color:var(--muted)">${r.dob ? age(r.dob) : ''}</div>
              </div>
            </div>
          </td>
          <td style="padding:.85rem 1rem">${escHtml(r.chambre) || '—'}</td>
          <td style="padding:.85rem 1rem;text-align:center">
            <span style="display:inline-block;padding:.3rem .75rem;border-radius:var(--r-full);font-size:.8rem;${statusStyle[s]}">${statusLabel[s]}</span>
          </td>
          <td style="padding:.85rem 1rem">
            <div style="display:flex;gap:.4rem">
              <button class="btn btn-sm" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0" onclick="setPresence('${r.id}','present')">Présent</button>
              <button class="btn btn-sm" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca" onclick="setPresence('${r.id}','absent')">Absent</button>
              <button class="btn btn-sm" style="background:#fffbeb;color:#92400e;border:1px solid #fde68a" onclick="setPresence('${r.id}','sortie')">Sortie</button>
              <button class="btn btn-ghost btn-sm" onclick="setPresence('${r.id}','unknown')">—</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function updateDateLabel() {
  const d = new Date(getDateStr() + 'T00:00:00');
  document.getElementById('presenceDateLabel').textContent = d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('presenceDate').value = today();
  updateDateLabel();
  renderStats();
  renderPresenceTable();

  document.getElementById('presenceDate').addEventListener('change', () => { updateDateLabel(); renderStats(); renderPresenceTable(); });
  document.getElementById('prevDay').addEventListener('click', () => {
    const d = new Date(getDateStr()); d.setDate(d.getDate()-1);
    document.getElementById('presenceDate').value = d.toISOString().slice(0,10);
    updateDateLabel(); renderStats(); renderPresenceTable();
  });
  document.getElementById('nextDay').addEventListener('click', () => {
    const d = new Date(getDateStr()); d.setDate(d.getDate()+1);
    document.getElementById('presenceDate').value = d.toISOString().slice(0,10);
    updateDateLabel(); renderStats(); renderPresenceTable();
  });
  document.getElementById('todayBtn').addEventListener('click', () => {
    document.getElementById('presenceDate').value = today();
    updateDateLabel(); renderStats(); renderPresenceTable();
  });
});
