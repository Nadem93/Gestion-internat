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
              ${r.photo?`<img src="${sanitizeUrl(r.photo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`:`<div class="avatar sm" style="width:36px;height:36px;font-size:.75rem;background:${r.color||'var(--blue)'}">${initials(r.prenom,r.nom)}</div>`}
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
  const start = today();
  const end = new Date(); end.setDate(end.getDate()+1);
  document.getElementById('exportStart').value = start;
  document.getElementById('exportEnd').value = end.toISOString().slice(0,10);
  openModal('modalExportAbs');
}

function exportPresencesPDF() {
  try {
    const start = document.getElementById('exportStart').value;
    const end   = document.getElementById('exportEnd').value;
    if (!start || !end) { toast('Sélectionnez une période', 'error'); return; }

    const allPresences = DB.get(DB.keys.presences) || {};
    const residents    = (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti');
    const settings     = DB.get(DB.keys.settings)  || {};
    const brand        = DB.get(DB.keys.branding)  || {};
    const pc = brand.primaryColor || '#0f2b4a';
    const ac = brand.accentColor  || '#e85d04';
    const etab = settings.etablissement || 'FTR';

    // Build list of dates in range
    const dates = [];
    for (let d = new Date(start+'T00:00:00'); d <= new Date(end+'T00:00:00'); d.setDate(d.getDate()+1)) {
      dates.push(d.toISOString().slice(0,10));
    }
    if (!dates.length) { toast('Période invalide', 'error'); return; }

    const statusLetter = { present:'P', absent:'A', sortie:'S', permission:'Pe', malade:'M', unknown:'' };
    const statusColor  = { present:'#16a34a', absent:'#dc2626', sortie:'#ca8a04', permission:'#2563eb', malade:'#9333ea' };
    const statusLabel  = { present:'Présent', absent:'Absent', sortie:'Sorti', permission:'Permission', malade:'Malade' };

    // Summary per resident
    const summaryRows = residents.map(r => {
      const name = `${r.prenom||''} ${r.nom||''}`.trim();
      let present=0, absent=0, sortie=0, autre=0;
      dates.forEach(ds => {
        const s = (allPresences[ds]||{})[r.id] || 'unknown';
        if (s==='present') present++;
        else if (s==='absent') absent++;
        else if (s==='sortie') sortie++;
        else if (s && s!=='unknown') autre++;
      });
      const cells = dates.map(ds => {
        const s = (allPresences[ds]||{})[r.id] || '';
        const letter = statusLetter[s] || '';
        const color  = statusColor[s]  || '#94a3b8';
        return `<td style="text-align:center;padding:3px 4px;font-size:9px;font-weight:700;color:${letter?color:'#cbd5e1'}">${letter||'·'}</td>`;
      }).join('');
      const pct = dates.length ? Math.round(present/dates.length*100) : 0;
      return { name, cells, present, absent, sortie, autre, pct };
    });

    const now = new Date().toLocaleDateString('fr-FR');
    const dateHeaders = dates.map(ds => {
      const d = new Date(ds+'T12:00:00');
      return `<th style="text-align:center;padding:4px 2px;font-size:8px;font-weight:700;min-width:22px;writing-mode:vertical-rl;transform:rotate(180deg);height:50px">${d.getDate()}/${d.getMonth()+1}</th>`;
    }).join('');

    const tableRows = summaryRows.map((r, i) => `
      <tr style="background:${i%2===0?'#f8fafc':'#fff'}">
        <td style="padding:5px 10px;font-weight:600;white-space:nowrap;border-right:1px solid #e2e8f0">${escHtml(r.name)}</td>
        ${r.cells}
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#16a34a;border-left:1px solid #e2e8f0">${r.present}</td>
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#dc2626">${r.absent}</td>
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#ca8a04">${r.sortie}</td>
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#0f2b4a">${r.pct}%</td>
      </tr>`).join('');

    const legendHtml = Object.entries(statusLabel).map(([k,v]) =>
      `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:10px"><span style="font-weight:800;color:${statusColor[k]}">${statusLetter[k]}</span> = ${v}</span>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Présences — ${etab}</title>
<style>
  @page{margin:1cm 1.2cm;size:A4 landscape}
  body{margin:0;font-family:Inter,system-ui,sans-serif;font-size:10px;color:#1e293b}
  .top-stripe{height:5px;background:linear-gradient(90deg,${pc},${ac})}
  .doc-header{display:flex;align-items:flex-start;justify-content:space-between;padding:12px 20px 10px;border-bottom:2px solid #e2e8f0}
  .doc-header h1{margin:0;font-size:16px;font-weight:800;color:${pc}}
  .doc-header .sub{font-size:10px;color:#64748b;margin-top:2px}
  .doc-meta{font-size:9px;color:#64748b;text-align:right}
  .wrap{padding:12px 20px}
  table{width:100%;border-collapse:collapse;font-size:9px}
  thead th{background:${pc};color:#fff;padding:5px 4px;text-align:left;font-size:9px;font-weight:700}
  thead th:first-child{text-align:left;min-width:120px}
  td{border:1px solid #e8ecf0}
  .legend{margin-top:10px;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0}
  .actions{margin-bottom:12px}
  .actions button{padding:6px 16px;border:none;border-radius:6px;background:${pc};color:#fff;font-weight:600;cursor:pointer;font-size:10px;margin-right:6px}
  @media print{.actions{display:none}}
</style></head><body>
<div class="top-stripe"></div>
<div class="doc-header">
  <div><h1>${escHtml(etab)}</h1><div class="sub">Registre des présences</div></div>
  <div class="doc-meta">Période : ${start} → ${end}<br>${dates.length} jour${dates.length>1?'s':''} · ${residents.length} résident${residents.length>1?'s':''}<br>Généré le ${now}</div>
</div>
<div class="wrap">
  <div class="actions"><button onclick="window.print()">🖨 Imprimer / Enregistrer PDF</button><button onclick="window.close()">Fermer</button></div>
  <table>
    <thead>
      <tr>
        <th style="min-width:130px;vertical-align:bottom;padding:6px 10px">Résident</th>
        ${dateHeaders}
        <th style="text-align:center;padding:4px 6px;min-width:25px;background:#1e3a5f">P</th>
        <th style="text-align:center;padding:4px 6px;min-width:25px;background:#7f1d1d">A</th>
        <th style="text-align:center;padding:4px 6px;min-width:25px;background:#78350f">S</th>
        <th style="text-align:center;padding:4px 6px;min-width:30px;background:#1e3a5f">%</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="legend">${legendHtml}</div>
</div>
</body></html>`;

    closeModal('modalExportAbs');
    const w = window.open('', '_blank', 'width=1100,height=750');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 600); }
    else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type:'text/html' }));
      a.download = `presences-${start}-${end}.html`;
      a.click();
    }
    toast('Export généré ✓');
  } catch(e) { toast('Erreur : '+e.message, 'error'); console.error(e); }
}

function initPresences() {
  if (!requireModule('access_presences')) return;
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
