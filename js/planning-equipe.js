function initPlanningEquipe() {
  const _s = Auth.requireAuth();
  if (!_s) return;
  if (!requireModule('access_planning_equipe')) return;
  const now = new Date();
  const y = now.getFullYear();
  const jan1 = new Date(y,0,1);
  const days = Math.floor((now - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  document.getElementById('peSemaine').value = y + '-W' + String(week).padStart(2,'0');
  const employes = DB.get(DB.keys.employes) || [];
  const sel = document.getElementById('peFiltreEmploye');
  sel.innerHTML = '<option value="">Tous les employés</option>' + employes.map(e => `<option value="${e.id}">${escHtml(e.prenom+' '+e.nom)}</option>`).join('');
  renderPlanningEquipe();
}

function getPeData() {
  return JSON.parse(localStorage.getItem('ftr_planning_equipe') || 'null');
}

function setPeData(d) {
  localStorage.setItem('ftr_planning_equipe', JSON.stringify(d));
}

function openImportPlanning() {
  const html = `<div class="modal-overlay" id="modalImportPe" style="display:flex" onclick="closeModal('modalImportPe')">
    <div class="modal" style="max-width:480px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">📥 Importer le planning</span><button class="modal-close" onclick="closeModal('modalImportPe')">&times;</button></div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:.85rem">
        <div style="font-size:.78rem;color:var(--muted);line-height:1.5">
          Le fichier CSV doit contenir les colonnes : <strong>employé, date, début, fin</strong> (séparateur virgule ou point-virgule).
          Une ligne d'en-tête est ignorée.<br/>
          <span style="display:block;margin-top:.5rem;padding:.5rem .75rem;background:#f1f5f9;border-radius:6px;font-family:monospace;font-size:.72rem">
            employé,date,début,fin<br/>
            Jean Martin,2026-06-10,08:00,16:00<br/>
            Sophie Dubois,2026-06-10,13:00,21:00
          </span>
        </div>
        <div class="photo-upload-zone" onclick="document.getElementById('peFileInput').click()" style="padding:1.5rem;text-align:center;cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px;margin:0 auto .5rem;color:var(--muted)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div style="font-size:.82rem;color:var(--muted)">Cliquez pour sélectionner un fichier CSV</div>
        </div>
        <input type="file" id="peFileInput" accept=".csv,.tsv,.txt" style="display:none" onchange="handlePeImport(event)"/>
      </div>
    </div>
  </div>`;
  const old = document.getElementById('modalImportPe');
  if (old) old.remove();
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  requestAnimationFrame(() => document.getElementById('modalImportPe')?.classList.add('open'));
}

function handlePeImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { toast('Fichier vide ou invalide', 'error'); return; }
    const header = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/['"]/g,''));
    const empIdx = header.findIndex(h => h.includes('employ') || h.includes('nom') || h.includes('prenom'));
    const dateIdx = header.findIndex(h => h === 'date');
    const debutIdx = header.findIndex(h => h.includes('début') || h.includes('debut') || h.includes('start'));
    const finIdx = header.findIndex(h => h.includes('fin') || h.includes('end'));
    if (empIdx === -1 || dateIdx === -1 || debutIdx === -1 || finIdx === -1) {
      toast('Format CSV incorrect. Colonnes attendues : employé, date, début, fin', 'error'); return;
    }
    const shifts = [];
    const employes = DB.get(DB.keys.employes) || [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[;,]/).map(c => c.trim().replace(/['"]/g,''));
      const nom = cols[empIdx];
      const date = cols[dateIdx];
      const debut = cols[debutIdx];
      const fin = cols[finIdx];
      if (!nom || !date || !debut || !fin) continue;
      const emp = employes.find(e => (e.prenom+' '+e.nom).toLowerCase() === nom.toLowerCase() || e.nom.toLowerCase() === nom.toLowerCase());
      shifts.push({
        id: 'pe-' + genId(),
        employeId: emp ? emp.id : nom,
        employeNom: emp ? emp.prenom+' '+emp.nom : nom,
        date, debut, fin
      });
    }
    if (!shifts.length) { toast('Aucune ligne valide trouvée', 'error'); return; }
    const data = { shifts, importedAt: new Date().toISOString(), fileName: file.name };
    setPeData(data);
    if (typeof auditLog === 'function') auditLog('import', 'Planning équipe — ' + shifts.length + ' lignes depuis ' + file.name);
    closeModal('modalImportPe');
    toast('Planning importé : ' + shifts.length + ' lignes ✓', 'success');
    renderPlanningEquipe();
  };
  reader.readAsText(file);
}

function renderPlanningEquipe() {
  const data = getPeData();
  const filtreEmp = document.getElementById('peFiltreEmploye').value;
  const semaine = document.getElementById('peSemaine').value;

  // Info fichier
  const info = document.getElementById('peInfo');
  const infoText = document.getElementById('peInfoText');
  if (data) {
    info.style.display = '';
    infoText.textContent = 'Fichier : ' + data.fileName + ' — ' + data.shifts.length + ' lignes — Importé le ' + new Date(data.importedAt).toLocaleDateString('fr-FR');
  } else {
    info.style.display = 'none';
  }

  // Calculer les jours de la semaine
  const weekDays = [];
  if (semaine) {
    const parts = semaine.split('-W');
    const y = parseInt(parts[0]);
    const w = parseInt(parts[1]);
    const jan1 = new Date(y,0,1);
    const daysOffset = (w - 1) * 7;
    const firstDay = new Date(jan1.getTime() + daysOffset * 86400000);
    const dayOfWeek = firstDay.getDay();
    const monday = new Date(firstDay.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 86400000);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      weekDays.push(d.toISOString().slice(0,10));
    }
  }

  const shifts = data ? data.shifts : [];
  const employes = DB.get(DB.keys.employes) || [];

  // Filtrer
  let filtered = shifts;
  if (filtreEmp) filtered = filtered.filter(s => s.employeId === filtreEmp);
  if (semaine) filtered = filtered.filter(s => weekDays.includes(s.date));

  // Grouper par employé
  const byEmp = {};
  filtered.forEach(s => {
    if (!byEmp[s.employeId]) byEmp[s.employeId] = { nom: s.employeNom, shifts: [] };
    byEmp[s.employeId].shifts.push(s);
  });

  const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const el = document.getElementById('peTable');
  const body = el.querySelector('.card-body');

  if (!filtered.length) {
    body.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucun créneau pour cette période.</p></div>';
    return;
  }

  body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.82rem">'
    + '<thead style="background:var(--g50);position:sticky;top:0;z-index:1">'
    + '<tr><th style="padding:.6rem .75rem;text-align:left;font-size:.67rem;font-weight:700;color:var(--muted);text-transform:uppercase">Employé</th>'
    + weekDays.map(d => `<th style="padding:.6rem .5rem;text-align:center;font-size:.67rem;font-weight:700;color:var(--muted);text-transform:uppercase">${DAYS[new Date(d).getDay()]}<br/><span style="font-weight:400;text-transform:none">${d.slice(5)}</span></th>`).join('')
    + '</tr></thead><tbody>'
    + Object.entries(byEmp).map(([id, emp]) => {
      const dayMap = {};
      emp.shifts.forEach(s => { dayMap[s.date] = dayMap[s.date] || []; dayMap[s.date].push(s); });
      return '<tr style="border-top:1px solid var(--border)">'
        + `<td style="padding:.6rem .75rem;font-weight:600;font-size:.78rem;white-space:nowrap">${escHtml(emp.nom)}</td>`
        + weekDays.map(d => {
          const s = dayMap[d];
          return `<td style="padding:.4rem .35rem;text-align:center;vertical-align:middle;font-size:.7rem">${s ? s.map(x => `<span style="display:inline-block;padding:2px 6px;background:#0891b218;color:#0891b2;border-radius:4px;font-weight:600;white-space:nowrap">${x.debut}-${x.fin}</span>`).join(' ') : '<span style="color:var(--g300)">—</span>'}</td>`;
        }).join('')
        + '</tr>';
    }).join('')
    + '</tbody></table>';
}

document.addEventListener('DOMContentLoaded', initPlanningEquipe);
if (typeof registerPageInit === 'function') registerPageInit('planning-equipe', initPlanningEquipe);
