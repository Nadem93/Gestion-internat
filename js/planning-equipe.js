let peWeekStart = peGetMonday(new Date());
let _peCtx = null;

function initPlanningEquipe() {
  const _s = Auth.requireAuth();
  if (!_s) return;
  if (!requireModule('access_planning_equipe')) return;
  peWeekStart = peGetMonday(new Date());
  renderPlanningEquipe();
}

// ── HELPERS DATE ──
function peGetMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function peISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function peFormatShort(d) {
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0');
}

function peFormatLong(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function peDuration(debut, fin) {
  const [h1,m1] = debut.split(':').map(Number);
  const [h2,m2] = fin.split(':').map(Number);
  let mins = (h2*60+m2) - (h1*60+m1);
  if (mins <= 0) mins += 24*60;
  return mins;
}

function peFormatDuration(mins) {
  const h = Math.floor(mins/60), m = Math.round(mins%60);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`;
}

function peFormatSigned(mins) {
  const sign = mins < 0 ? '-' : (mins > 0 ? '+' : '');
  return sign + peFormatDuration(Math.abs(mins));
}

// ── NAVIGATION SEMAINE ──
function pePrevWeek() { peWeekStart.setDate(peWeekStart.getDate()-7); renderPlanningEquipe(); }
function peNextWeek() { peWeekStart.setDate(peWeekStart.getDate()+7); renderPlanningEquipe(); }
function peToday() { peWeekStart = peGetMonday(new Date()); renderPlanningEquipe(); }

// ── DONNÉES ──
function getPeShifts() {
  return DB.get(DB.keys.planningEquipe) || [];
}

function setPeShifts(shifts) {
  DB.set(DB.keys.planningEquipe, shifts);
}

function peCanEditPlanning() {
  const _s = Auth.getSession();
  return !!(_s && (Auth.isAdmin() || hasPermission(_s.userId, 'edit_planning_equipe')));
}

// ── IMPORT CSV ──
function openImportPlanning() {
  const html = `<div class="modal-overlay" id="modalImportPe" style="display:flex" onclick="closeModal('modalImportPe')">
    <div class="modal" style="max-width:480px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">📥 Importer le planning</span><button class="modal-close" onclick="closeModal('modalImportPe')">&times;</button></div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:.85rem">
        <div style="font-size:.78rem;color:var(--muted);line-height:1.5">
          Le fichier CSV doit contenir les colonnes : <strong>employé, date, début, fin</strong> (séparateur virgule ou point-virgule).
          Une ligne d'en-tête est ignorée. Les créneaux importés sont ajoutés au planning existant.<br/>
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
    const imported = [];
    const employes = DB.get(DB.keys.employes) || [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[;,]/).map(c => c.trim().replace(/['"]/g,''));
      const nom = cols[empIdx];
      const date = cols[dateIdx];
      const debut = cols[debutIdx];
      const fin = cols[finIdx];
      if (!nom || !date || !debut || !fin) continue;
      const emp = employes.find(e => (e.prenom+' '+e.nom).toLowerCase() === nom.toLowerCase() || e.nom.toLowerCase() === nom.toLowerCase());
      imported.push({
        id: 'pe-' + genId(),
        employeId: emp ? emp.id : null,
        employeNom: emp ? emp.prenom+' '+emp.nom : nom,
        date, debut, fin
      });
    }
    if (!imported.length) { toast('Aucune ligne valide trouvée', 'error'); return; }
    const shifts = getPeShifts().concat(imported);
    setPeShifts(shifts);
    if (typeof auditLog === 'function') auditLog('import', 'Planning équipe — ' + imported.length + ' lignes depuis ' + file.name);
    closeModal('modalImportPe');
    toast('Planning importé : ' + imported.length + ' lignes ✓', 'success');
    renderPlanningEquipe();
  };
  reader.readAsText(file);
}

// ── MODALE CRÉNEAU ──
function openPeShiftModal(employeId, date, shiftId) {
  if (!peCanEditPlanning()) return;
  const shifts = getPeShifts();
  const employes = DB.get(DB.keys.employes) || [];
  const shift = shiftId ? shifts.find(s => s.id === shiftId) : null;
  let finalEmployeId, finalDate, empNom;
  if (shift) {
    finalEmployeId = shift.employeId;
    finalDate = shift.date;
    const emp = employes.find(e => e.id === shift.employeId);
    empNom = emp ? (emp.prenom+' '+emp.nom) : (shift.employeNom || 'Non assigné');
  } else {
    finalEmployeId = employeId;
    finalDate = date;
    const emp = employes.find(e => e.id === employeId);
    empNom = emp ? (emp.prenom+' '+emp.nom) : 'Non assigné';
  }
  _peCtx = { employeId: finalEmployeId, date: finalDate, shiftId: shift ? shift.id : null, employeNom: empNom };
  document.getElementById('psTitle').textContent = shift ? 'Modifier le créneau' : 'Nouveau créneau';
  document.getElementById('psEmploye').textContent = empNom;
  document.getElementById('psDate').textContent = peFormatLong(new Date(finalDate + 'T00:00:00'));
  document.getElementById('psDebut').value = shift ? shift.debut : '08:00';
  document.getElementById('psFin').value = shift ? shift.fin : '16:00';
  document.getElementById('psDeleteBtn').style.display = shift ? '' : 'none';
  openModal('modalPeShift');
}

function savePeShift() {
  const debut = document.getElementById('psDebut').value;
  const fin = document.getElementById('psFin').value;
  if (!debut || !fin) { toast('Veuillez renseigner les heures de début et de fin', 'error'); return; }
  const shifts = getPeShifts();
  if (_peCtx.shiftId) {
    const s = shifts.find(x => x.id === _peCtx.shiftId);
    if (s) { s.debut = debut; s.fin = fin; }
  } else {
    shifts.push({ id: 'pe-'+genId(), employeId: _peCtx.employeId, employeNom: _peCtx.employeNom, date: _peCtx.date, debut, fin });
  }
  setPeShifts(shifts);
  auditLog('modification', `Planning équipe — créneau ${_peCtx.employeNom} le ${_peCtx.date} (${debut}-${fin})`);
  closeModal('modalPeShift');
  toast('Créneau enregistré ✓');
  renderPlanningEquipe();
}

function deletePeShift() {
  if (!_peCtx || !_peCtx.shiftId) return;
  if (!confirm('Supprimer ce créneau ?')) return;
  const shifts = getPeShifts().filter(s => s.id !== _peCtx.shiftId);
  setPeShifts(shifts);
  auditLog('suppression', `Planning équipe — créneau ${_peCtx.employeNom} le ${_peCtx.date} supprimé`);
  closeModal('modalPeShift');
  toast('Créneau supprimé', 'success');
  renderPlanningEquipe();
}

// ── RENDU GRILLE ──
function renderPlanningEquipe() {
  const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(peWeekStart);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }
  const weekDayStrs = weekDays.map(peISO);
  const todayStr = today();
  const canEdit = peCanEditPlanning();

  document.getElementById('peWeekLabel').textContent =
    `Semaine du ${peFormatShort(weekDays[0])} au ${peFormatShort(weekDays[6])}/${weekDays[6].getFullYear()}`;
  document.getElementById('peHint').textContent = canEdit ? 'Cliquez sur une case pour ajouter ou modifier un créneau' : '';

  const employes = (DB.get(DB.keys.employes) || []).filter(e => e.statut !== 'inactif');
  const shifts = getPeShifts();
  const shiftsWeek = shifts.filter(s => weekDayStrs.includes(s.date));

  const byEmp = {};
  shiftsWeek.forEach(s => {
    const key = s.employeId || 'NA';
    (byEmp[key] = byEmp[key] || []).push(s);
  });

  const el = document.getElementById('peGrid');
  const body = el.querySelector('.card-body');

  if (!employes.length) {
    body.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucun employé enregistré. Ajoutez des employés pour gérer le planning.</p></div>';
    return;
  }

  const dayHeader = weekDays.map((d,i) => {
    const isToday = weekDayStrs[i] === todayStr;
    const numStyle = isToday
      ? 'display:inline-block;width:22px;height:22px;line-height:22px;border-radius:50%;background:var(--primary);color:#fff;font-weight:700;margin-top:2px'
      : 'display:inline-block;margin-top:2px;font-weight:400';
    return `<th style="padding:.6rem .35rem;text-align:center;font-size:.67rem;font-weight:700;color:var(--muted);text-transform:uppercase;min-width:90px">${DAYS[i]}<br/><span style="${numStyle}">${d.getDate()}</span></th>`;
  }).join('');

  const naShifts = byEmp['NA'] || [];
  const naRow = `<tr style="border-top:1px solid var(--border);background:var(--g50)">
    <td style="padding:.5rem .75rem;white-space:nowrap">
      <div style="display:flex;align-items:center;gap:.5rem">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--g200);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.65rem;color:var(--muted);flex-shrink:0">NA</div>
        <div style="font-weight:600;font-size:.8rem;color:var(--muted)">Non assignés</div>
      </div>
    </td>
    ${weekDays.map(d => {
      const dateStr = peISO(d);
      const dayShifts = naShifts.filter(s => s.date === dateStr);
      const content = dayShifts.map(s => `<div onclick="openPeShiftModal(null,'${dateStr}','${s.id}')" style="cursor:pointer;background:var(--g100);border:1px solid var(--border);border-radius:6px;padding:.3rem .4rem;margin-bottom:2px;font-size:.68rem;font-weight:600;color:var(--muted)">${escHtml(s.employeNom||'?')}<br/>${s.debut} - ${s.fin}</div>`).join('');
      return `<td style="padding:.35rem;vertical-align:top">${content || '<span style="color:var(--g300)">—</span>'}</td>`;
    }).join('')}
    <td></td>
  </tr>`;

  const empRows = employes.map(emp => {
    const empShifts = byEmp[emp.id] || [];
    const color = emp.color || 'var(--primary)';
    const totalMins = empShifts.reduce((sum,s) => sum + peDuration(s.debut, s.fin), 0);
    const contractH = emp.heuresContrat ?? 35;
    const deltaMins = totalMins - contractH * 60;
    const deltaColor = deltaMins >= 0 ? 'var(--green)' : 'var(--red)';

    const cells = weekDays.map(d => {
      const dateStr = peISO(d);
      const dayShifts = empShifts.filter(s => s.date === dateStr);
      const blocks = dayShifts.map(s => `<div onclick="event.stopPropagation();openPeShiftModal('${emp.id}','${dateStr}','${s.id}')" style="cursor:pointer;background:${color}20;border:1px solid ${color}55;border-radius:6px;padding:.3rem .4rem;margin-bottom:2px">
          <div style="font-size:.7rem;font-weight:700;color:${color}">${s.debut} - ${s.fin}</div>
          <div style="font-size:.62rem;font-weight:500;color:${color};opacity:.85">${peFormatDuration(peDuration(s.debut,s.fin))}</div>
        </div>`).join('');
      const addBtn = (canEdit && !dayShifts.length) ? '<div style="text-align:center;color:var(--g300);font-size:.9rem;line-height:1.4">+</div>' : '';
      return `<td style="padding:.35rem;vertical-align:top"${canEdit ? ` onclick="openPeShiftModal('${emp.id}','${dateStr}')" style="cursor:pointer"` : ''}>${blocks}${addBtn}</td>`;
    }).join('');

    return `<tr style="border-top:1px solid var(--border)">
      <td style="padding:.5rem .75rem;white-space:nowrap">
        <div style="display:flex;align-items:center;gap:.5rem">
          ${residentPhoto(emp, 32)}
          <div>
            <div style="font-weight:600;font-size:.8rem">${escHtml((emp.prenom||'')+' '+(emp.nom||''))}</div>
            <div style="font-size:.68rem;color:var(--muted)">${contractH}h/sem</div>
          </div>
        </div>
      </td>
      ${cells}
      <td style="padding:.5rem .75rem;text-align:center;white-space:nowrap">
        <div style="font-weight:700;font-size:.78rem">${peFormatDuration(totalMins)}</div>
        <div style="font-size:.68rem;font-weight:600;color:${deltaColor}">${peFormatSigned(deltaMins)}</div>
      </td>
    </tr>`;
  }).join('');

  let grandTotal = 0;
  const footerCells = weekDays.map(d => {
    const dateStr = peISO(d);
    const dayTotal = shiftsWeek.filter(s => s.date === dateStr).reduce((sum,s) => sum + peDuration(s.debut,s.fin), 0);
    grandTotal += dayTotal;
    return `<td style="padding:.5rem .35rem;text-align:center;font-weight:700;font-size:.78rem">${peFormatDuration(dayTotal)}</td>`;
  }).join('');

  body.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.82rem">
    <thead style="background:var(--g50)">
      <tr>
        <th style="padding:.6rem .75rem;text-align:left;font-size:.67rem;font-weight:700;color:var(--muted);text-transform:uppercase">Employé</th>
        ${dayHeader}
        <th style="padding:.6rem .75rem;text-align:center;font-size:.67rem;font-weight:700;color:var(--muted);text-transform:uppercase">Total</th>
      </tr>
    </thead>
    <tbody>
      ${naRow}
      ${empRows}
      <tr style="border-top:2px solid var(--border);background:var(--g50)">
        <td style="padding:.5rem .75rem;font-weight:700;font-size:.78rem">Heures travaillées</td>
        ${footerCells}
        <td style="padding:.5rem .75rem;text-align:center;font-weight:800;font-size:.8rem">${peFormatDuration(grandTotal)}</td>
      </tr>
    </tbody>
  </table>`;
}

document.addEventListener('DOMContentLoaded', initPlanningEquipe);
if (typeof registerPageInit === 'function') registerPageInit('planning-equipe', initPlanningEquipe);
