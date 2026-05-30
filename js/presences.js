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
              ${r.photo?`<img src="${r.photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`:`<div class="avatar sm" style="width:36px;height:36px;font-size:.75rem;background:${r.color||'var(--blue)'}">${initials(r.prenom,r.nom)}</div>`}
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
            <div style="display:flex;gap:.35rem;align-items:center">
              <button onclick="setPresence('${r.id}','present')" style="width:28px;height:28px;border-radius:50%;border:2px solid #047857;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;transition:all .15s;background:${s==='present'?'#047857':'transparent'};color:${s==='present'?'#fff':'#047857'}">${s==='present'?'✓':'P'}</button>
              <button onclick="setPresence('${r.id}','absent')" style="width:28px;height:28px;border-radius:50%;border:2px solid #b91c1c;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;transition:all .15s;background:${s==='absent'?'#b91c1c':'transparent'};color:${s==='absent'?'#fff':'#b91c1c'}">${s==='absent'?'✓':'A'}</button>
              <button onclick="setPresence('${r.id}','sortie')" style="width:28px;height:28px;border-radius:50%;border:2px solid #92400e;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;transition:all .15s;background:${s==='sortie'?'#92400e':'transparent'};color:${s==='sortie'?'#fff':'#92400e'}">${s==='sortie'?'✓':'S'}</button>
              <button onclick="setPresence('${r.id}','unknown')" style="width:20px;height:20px;border-radius:50%;border:1px solid var(--g300);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.5rem;color:var(--g300);background:transparent;transition:all .15s">✕</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function updateDateLabel() {
  const d = new Date(getDateStr() + 'T00:00:00');
  document.getElementById('presenceDateLabel').textContent = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function openExportModal() {
  const end = today();
  const start = new Date(); start.setDate(start.getDate()-30);
  document.getElementById('exportStart').value = start.toISOString().slice(0,10);
  document.getElementById('exportEnd').value = end;
  openModal('modalExportAbs');
}

function exportPresencesPDF() {
  try {
    const start = document.getElementById('exportStart').value;
    const end = document.getElementById('exportEnd').value;
    if (!start || !end) { toast('Sélectionnez une période', 'error'); return; }
    const mode = document.getElementById('exportType').value;
    const allPresences = DB.get(DB.keys.presences) || {};
    const residents = (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti');
    const residentMap = {};
    residents.forEach(r => { residentMap[r.id] = r; });
    const rows = [];
    const startD = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate()+1)) {
      const ds = d.toISOString().slice(0,10);
      const day = allPresences[ds];
      if (!day) continue;
      for (const [rid, status] of Object.entries(day)) {
        if (mode === 'absent' && status !== 'absent') continue;
        const r = residentMap[rid];
        rows.push({ date: ds, resident: r ? `${r.prenom} ${r.nom}` : rid, status });
      }
    }
    if (!rows.length) { toast('Aucune donnée pour cette période', 'info'); return; }
    const etab = DB.get(DB.keys.settings)?.etablissement || 'FTR';
    const now = new Date().toLocaleDateString('fr-FR');
    const s = { present:'Présent', absent:'Absent', sortie:'Sorti', permission:'Permission', malade:'Malade', '':'-' };
    const c = { present:'#16a34a', absent:'#dc2626', sortie:'#ca8a04', permission:'#2563eb', malade:'#9333ea' };
    const rowsHtml = rows.map(r => `<tr><td>${r.date}</td><td>${r.resident}</td><td><span style="background:${c[r.status]||'#94a3b8'};color:#fff;padding:1px 8px;border-radius:10px;font-size:9px;font-weight:600">${s[r.status]||r.status}</span></td></tr>`).join('');
    const printEl = document.createElement('div');
    printEl.id = 'printExport';
    printEl.innerHTML = `<style nonce>#printExport{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#fff;padding:40px;font-family:Inter,system-ui,sans-serif;font-size:11px;color:#1e293b;overflow:auto}#printExport h1{font-size:20px;margin:0 0 4px}#printExport .sub{font-size:12px;color:#64748b;margin-bottom:20px}#printExport table{width:100%;border-collapse:collapse}#printExport th{background:#1e293b;color:#fff;padding:7px 10px;text-align:left;font-size:10px}#printExport td{padding:6px 10px;border-bottom:1px solid #e2e8f0}@media print{body>*:not(#printExport){display:none!important}#printExport{position:static!important;padding:0!important}}</style><h1>${etab}</h1><div class="sub">Export présences du ${start} au ${end} &mdash; ${rows.length} entr&eacute;e(s) &mdash; ${now}</div><table><thead><tr><th>Date</th><th>R&eacute;sident</th><th>Statut</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
    document.body.appendChild(printEl);
    closeModal('modalExportAbs');
    setTimeout(() => { window.focus(); window.print(); setTimeout(() => printEl.remove(), 300); }, 200);
    toast('Export en cours...');
  } catch(e) { toast('Erreur: '+e.message, 'error'); console.error(e); }
}

function initPresences() {
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
}
document.addEventListener('DOMContentLoaded', initPresences);
if (typeof registerPageInit === 'function') registerPageInit('presences', initPresences);
