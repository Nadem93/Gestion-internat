// ── TRAÇABILITÉ DE LA DISTRIBUTION DES MÉDICAMENTS ──
let medCanEdit = false;
let medNoteCtx = null;

const MED_MOMENTS = {
  matin: { label: 'Matin', icon: '🌅' },
  midi: { label: 'Midi', icon: '☀️' },
  soir: { label: 'Soir', icon: '🌆' },
  coucher: { label: 'Coucher', icon: '🌙' }
};
const MED_STATUTS = {
  donne: { label: 'Donné', icon: '✅', color: '#16a34a' },
  refuse: { label: 'Refusé', icon: '🚫', color: '#dc2626' },
  absent: { label: 'Absent', icon: '➖', color: '#6b7280' },
  report: { label: 'Reporté', icon: '⏭️', color: '#d97706' }
};

function getMedDistrib() { return DB.get(DB.keys.medicaments) || []; }
function saveMedDistrib(list) { DB.set(DB.keys.medicaments, list); }

function medResidents() {
  return (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti')
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'));
}

// Traitements avec moments de prise, actifs pour une date donnée
function medPrevues(date) {
  const out = [];
  medResidents().forEach(r => {
    const traitements = (r.sante?.traitements || []).filter(t =>
      (t.moments || []).length && (!t.debut || t.debut <= date) && (!t.fin || t.fin >= date));
    traitements.forEach(t => (t.moments || []).forEach(moment => {
      out.push({
        residentId: r.id, residentName: `${r.prenom || ''} ${r.nom || ''}`.trim(),
        traitementId: t.id, medicament: t.nom, posologie: t.posologie, moment
      });
    }));
  });
  return out;
}

function medRecord(date, residentId, traitementId, moment) {
  return getMedDistrib().find(x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment);
}

// ── RENDU PRINCIPAL ──
function renderMedicaments() {
  const date = document.getElementById('medDate').value || today();
  const prevues = medPrevues(date);
  const records = getMedDistrib();
  const enriched = prevues.map(p => ({ ...p, record: records.find(x => x.date === date && String(x.residentId) === String(p.residentId) && x.traitementId === p.traitementId && x.moment === p.moment) }));

  const donnees = enriched.filter(e => e.record?.statut === 'donne').length;
  const incidents = enriched.filter(e => e.record && ['refuse', 'absent', 'report'].includes(e.record.statut)).length;
  const attente = enriched.length - donnees - incidents;

  document.getElementById('medStats').innerHTML = `
    <div class="stat-card" style="border-left:3px solid #0369a1"><div class="stat-card-top"><span class="stat-label">Prises prévues</span></div><div class="stat-num">${enriched.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #16a34a"><div class="stat-card-top"><span class="stat-label">Données</span></div><div class="stat-num">${donnees}</div></div>
    <div class="stat-card" style="border-left:3px solid ${incidents ? '#dc2626' : '#16a34a'}"><div class="stat-card-top"><span class="stat-label">Refus / absences / reports</span></div><div class="stat-num">${incidents}</div></div>
    <div class="stat-card" style="border-left:3px solid ${attente ? '#d97706' : '#16a34a'}"><div class="stat-card-top"><span class="stat-label">En attente</span></div><div class="stat-num">${attente}</div></div>`;

  const el = document.getElementById('medList');
  if (!enriched.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.5 20.5 21 10a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/></svg></div><h3>Aucun traitement à distribuer</h3><p>Renseignez les moments de prise depuis l'onglet « Médical / traitements » de chaque résident pour qu'il apparaisse ici.</p></div>`;
    return;
  }
  const byResident = {};
  enriched.forEach(e => { (byResident[e.residentId] = byResident[e.residentId] || { residentName: e.residentName, items: [] }).items.push(e); });
  const momentOrder = Object.keys(MED_MOMENTS);
  el.innerHTML = Object.entries(byResident).map(([residentId, g]) => {
    g.items.sort((a, b) => momentOrder.indexOf(a.moment) - momentOrder.indexOf(b.moment));
    return `<div class="card" style="margin-bottom:.85rem">
      <div class="card-header"><a href="resident.html?id=${residentId}" style="font-weight:700;font-size:.9rem;color:var(--text);text-decoration:none">👤 ${escHtml(g.residentName)}</a></div>
      <div class="card-body" style="padding:0">${g.items.map(e => medRow(date, e)).join('')}</div>
    </div>`;
  }).join('');
}

function medRow(date, e) {
  const mom = MED_MOMENTS[e.moment] || {};
  const r = e.record;
  const st = r?.statut ? MED_STATUTS[r.statut] : null;
  return `<div style="display:flex;align-items:center;gap:.7rem;padding:.6rem .85rem;border-bottom:1px solid var(--border);flex-wrap:wrap">
    <span style="font-size:1.1rem;width:28px;text-align:center" title="${escHtml(mom.label || e.moment)}">${mom.icon || ''}</span>
    <div style="flex:1;min-width:160px">
      <div style="font-weight:600;font-size:.83rem">${escHtml(e.medicament || '')}</div>
      <div style="font-size:.72rem;color:var(--muted)">${escHtml(mom.label || e.moment)}${e.posologie ? ' · ' + escHtml(e.posologie) : ''}${r?.heure ? ' · ' + r.heure.slice(0,5) : ''}${r?.auteur ? ' · ' + escHtml(r.auteur) : ''}</div>
      ${r?.observation ? `<div style="font-size:.72rem;color:var(--muted);margin-top:1px">📝 ${escHtml(r.observation)}</div>` : ''}
    </div>
    ${medCanEdit ? `<div class="no-print" style="display:flex;gap:.25rem;flex-wrap:wrap">
      ${Object.entries(MED_STATUTS).map(([k, v]) => `<button class="btn btn-sm ${r?.statut === k ? 'btn-primary' : 'btn-ghost'}" style="${r?.statut === k ? `background:${v.color};border-color:${v.color}` : ''}" title="${v.label}" onclick="setMedStatut('${date}','${e.residentId}','${e.traitementId}','${e.moment}','${k}')">${v.icon}</button>`).join('')}
      <button class="btn btn-ghost btn-sm" title="Observation" onclick="openMedNote('${date}','${e.residentId}','${e.traitementId}','${e.moment}')">📝</button>
    </div>` : st ? `<span class="badge" style="background:${st.color}1a;color:${st.color}">${st.icon} ${st.label}</span>` : '<span class="badge badge-gray">En attente</span>'}
  </div>`;
}

function setMedStatut(date, residentId, traitementId, moment, statut) {
  const list = getMedDistrib();
  const session = Auth.getSession();
  const auteur = [session?.prenom, session?.nom].filter(Boolean).join(' ') || session?.username || '';
  const i = list.findIndex(x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment);
  const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
  if (i >= 0) {
    if (list[i].statut === statut) {
      list.splice(i, 1); // re-clic sur le même statut → réinitialise
    } else {
      list[i] = { ...list[i], statut, heure: new Date().toISOString(), auteur };
    }
  } else if (prevue) {
    list.push({ id: genId(), date, residentId, residentName: prevue.residentName, traitementId, medicament: prevue.medicament, posologie: prevue.posologie, moment, statut, heure: new Date().toISOString(), auteur, observation: '' });
  }
  saveMedDistrib(list);
  if (typeof auditLog === 'function' && prevue) auditLog('med_distrib', `${prevue.medicament} (${MED_MOMENTS[moment]?.label || moment}) — ${prevue.residentName} → ${MED_STATUTS[statut]?.label || statut}`);
  renderMedicaments();
}

function openMedNote(date, residentId, traitementId, moment) {
  medNoteCtx = { date, residentId, traitementId, moment };
  const r = medRecord(date, residentId, traitementId, moment);
  document.getElementById('mnTexte').value = r?.observation || '';
  openModal('modalMedNote');
}

function saveMedNote() {
  const { date, residentId, traitementId, moment } = medNoteCtx;
  const observation = document.getElementById('mnTexte').value.trim();
  const list = getMedDistrib();
  const i = list.findIndex(x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment);
  if (i >= 0) {
    list[i] = { ...list[i], observation };
  } else {
    const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
    if (!prevue) return;
    const session = Auth.getSession();
    const auteur = [session?.prenom, session?.nom].filter(Boolean).join(' ') || session?.username || '';
    list.push({ id: genId(), date, residentId, residentName: prevue.residentName, traitementId, medicament: prevue.medicament, posologie: prevue.posologie, moment, statut: '', heure: '', auteur, observation });
  }
  saveMedDistrib(list);
  closeModal('modalMedNote');
  renderMedicaments();
}

// ── IMPRESSION ──
function printMedSheet() {
  const date = document.getElementById('medDate').value || today();
  const prevues = medPrevues(date);
  if (!prevues.length) { toast('Aucun traitement à distribuer pour cette date', 'error'); return; }
  const records = getMedDistrib();
  const settings = DB.get(DB.keys.settings) || {};
  const w = window.open('', '_blank');
  if (!w) { toast('Autorisez les fenêtres pop-up pour imprimer', 'error'); return; }
  const momentOrder = Object.keys(MED_MOMENTS);
  const sorted = [...prevues].sort((a, b) => a.residentName.localeCompare(b.residentName, 'fr') || momentOrder.indexOf(a.moment) - momentOrder.indexOf(b.moment));
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Feuille de distribution — ${formatDate(date)}</title>
    <style>
      body{font-family:'Inter','Segoe UI',sans-serif;max-width:1000px;margin:1.5rem auto;padding:0 1.5rem;color:#1e293b;font-size:9pt;line-height:1.5}
      h1{font-size:15pt;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding-bottom:.3rem}
      .meta{color:#64748b;font-size:9pt;margin-bottom:1.2rem}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;font-size:7.5pt;text-transform:uppercase;letter-spacing:.04em;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding:.3rem .4rem}
      td{padding:.4rem;border-bottom:1px solid #e2e8f0;font-size:8.5pt;vertical-align:top}
      @page{margin:1.5cm;size:landscape}
    </style></head><body>
    <h1>Feuille de distribution des médicaments</h1>
    <div class="meta">${escHtml(settings.etablissement || 'Établissement')} · ${formatDate(date)} · ${sorted.length} prise(s) prévue(s)</div>
    <table><thead><tr><th>Résident</th><th>Moment</th><th>Médicament</th><th>Posologie</th><th>Statut</th><th>Heure</th><th>Observation</th><th>Signature</th></tr></thead>
    <tbody>${sorted.map(p => {
      const r = records.find(x => x.date === date && String(x.residentId) === String(p.residentId) && x.traitementId === p.traitementId && x.moment === p.moment);
      const st = r?.statut ? MED_STATUTS[r.statut] : null;
      return `<tr>
        <td>${escHtml(p.residentName)}</td>
        <td>${MED_MOMENTS[p.moment]?.icon || ''} ${MED_MOMENTS[p.moment]?.label || p.moment}</td>
        <td>${escHtml(p.medicament || '')}</td>
        <td>${escHtml(p.posologie || '')}</td>
        <td>${st ? st.label : '—'}</td>
        <td>${r?.heure ? r.heure.slice(11,16) : ''}</td>
        <td>${escHtml(r?.observation || '')}</td>
        <td></td>
      </tr>`;
    }).join('')}</tbody></table>
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── INIT ──
function initMedicaments() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_medicaments')) return;
  medCanEdit = ((typeof canEditResidents === 'function') ? canEditResidents(s.userId) : false) || Auth.isAdmin();
  const dateInput = document.getElementById('medDate');
  dateInput.value = today();
  dateInput.addEventListener('change', renderMedicaments);
  renderMedicaments();
}
document.addEventListener('DOMContentLoaded', initMedicaments);
