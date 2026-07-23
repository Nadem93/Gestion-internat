// ── ÉCHÉANCIER ADMINISTRATIF — DESIGN V2 ──────────────────────────────
// Reproduit la maquette « Échéancier (dossiers) » : 4 tuiles statistiques,
// chips de type à pastille colorée, puis la frise des échéances (pastille
// datée, libellé + type, résident, compte à rebours, actions).
// Les données et toutes les actions restent celles de js/echeances.js.

let EC2_FILTRE = 'all';   // chip de type actif ('all' ou clé de EC_TYPES)

const EC2_IC = {
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  clip:  '<path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  pen:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  undo:  '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>'
};

// Couleur d'accent par type d'échéance (EC_TYPES reste la source métier)
const EC2_TC = {
  mdph: '#818cf8', jugement: '#a78bfa', identite: '#22d3ee', css: '#34d399',
  contrat: '#38bdf8', ppe: '#f59e0b', medical: '#ec4899', cvs_mandat: '#4ade80',
  autre: '#8095b4'
};
// Couleur d'urgence (mêmes clés que ecUrgency())
const EC2_UC = { late: '#ef4444', soon: '#f59e0b', watch: '#22d3ee', ok: '#10b981', done: '#8095b4' };

const EC2_MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function _ec2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function _ec2Tc(e) { return EC2_TC[e.type] || EC2_TC.autre; }
function _ec2Ty(e) { return (typeof EC_TYPES === 'object' && EC_TYPES[e.type]) || { label: 'Autre', icon: '📌' }; }
function _ec2CanEdit() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  if (typeof canEditResidents === 'function') return canEditResidents(s && s.userId);
  return (typeof Auth !== 'undefined' && Auth.isAdmin) ? Auth.isAdmin() : false;
}
// Nombre de jours entre aujourd'hui et l'échéance (négatif = retard)
function _ec2Diff(e) {
  if (!e.date) return null;
  const d = Math.ceil((new Date(e.date) - new Date(today())) / 86400000);
  return isNaN(d) ? null : d;
}
// Compte à rebours façon maquette : « J-2 », « 3 j de retard », « Traité »
function _ec2Left(e) {
  if (e.done) return 'Traité';
  const d = _ec2Diff(e);
  if (d === null) return '—';
  if (d < 0) return `${Math.abs(d)} j de retard`;
  if (d === 0) return "Aujourd'hui";
  return `J-${d}`;
}
// Pastille datée : jour + mois abrégé
function _ec2Pastille(e) {
  if (!e.date) return { j: '—', m: '' };
  const dt = new Date(e.date + 'T12:00:00');
  if (isNaN(dt)) return { j: '—', m: '' };
  return { j: String(dt.getDate()).padStart(2, '0'), m: EC2_MOIS[dt.getMonth()] };
}

// ── RENDU PRINCIPAL ───────────────────────────────────────────────────
function ec2Render() {
  const all = (typeof getEcheances === 'function') ? getEcheances() : [];

  // Le select de type hérité reste le contrat : les chips le pilotent.
  const selType = document.getElementById('ecFilterType');
  const attendu = EC2_FILTRE === 'all' ? '' : EC2_FILTRE;
  if (selType && selType.value !== attendu) selType.value = attendu;

  const showDone = !!document.getElementById('ecShowDone')?.checked;
  const fRes = document.getElementById('ecFilterResident')?.value || '';

  let base = all.filter(e => showDone || !e.done);
  if (fRes) base = base.filter(e => String(e.residentId) === String(fRes));
  const list = EC2_FILTRE === 'all' ? base : base.filter(e => e.type === EC2_FILTRE);

  ec2Stats(all);
  ec2Chips(base);
  ec2List(list);
}

// ── TUILES STATISTIQUES ───────────────────────────────────────────────
function ec2Stats(all) {
  const box = document.getElementById('ecStats');
  if (!box) return;
  const actives = all.filter(e => !e.done);
  const urgentes = actives.filter(e => { const d = _ec2Diff(e); return d !== null && d < 7; });
  const mdph = actives.filter(e => e.type === 'mdph');
  const annee = String(new Date().getFullYear());
  const traitees = all.filter(e => e.done && String(e.doneAt || e.date || '').slice(0, 4) === annee);

  const cells = [
    { n: actives.length,  l: 'Échéances à venir', c: '#38bdf8', ic: EC2_IC.cal },
    { n: urgentes.length, l: 'Urgentes (< 7 j)',  c: '#ef4444', ic: EC2_IC.alert },
    { n: mdph.length,     l: 'MDPH',              c: '#818cf8', ic: EC2_IC.file },
    { n: traitees.length, l: 'Traitées (année)',  c: '#10b981', ic: EC2_IC.check }
  ];
  box.innerHTML = cells.map(c => `<div class="ec2-stat" style="--pc:${c.c}">
    <span class="ec2-stat-ico">${_ec2Svg(c.ic)}</span>
    <div><div class="ec2-stat-n">${c.n}</div><div class="ec2-stat-l">${c.l}</div></div>
  </div>`).join('');
}

// ── CHIPS DE TYPE ─────────────────────────────────────────────────────
function ec2Chips(base) {
  const box = document.getElementById('ecChips');
  if (!box) return;
  const types = (typeof EC_TYPES === 'object') ? Object.keys(EC_TYPES) : [];
  const defs = [{ id: 'all', l: 'Toutes', c: '#818cf8', n: base.length }].concat(
    types.map(k => ({ id: k, l: EC_TYPES[k].label, c: EC2_TC[k] || EC2_TC.autre, n: base.filter(e => e.type === k).length }))
  );
  box.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${EC2_FILTRE === f.id ? ' on' : ''}" onclick="ec2SetFiltre('${f.id}')">
    <span class="dot" style="background:${f.c}"></span>${escHtml(f.l)}<span class="n">${f.n}</span>
  </button>`).join('');
}

// ── CHAMP FICHIER (modale de renouvellement) ──────────────────────────
// Le contrôle natif est masqué : on affiche le nom du fichier choisi.
function ec2FileName() {
  const box = document.getElementById('renFileName');
  if (!box) return;
  const f = document.getElementById('renFile')?.files?.[0];
  box.textContent = f ? f.name : 'Aucun fichier sélectionné';
  box.style.color = f ? 'var(--v2-t2)' : '';
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('renFile')?.addEventListener('change', ec2FileName);
});

function ec2SetFiltre(id) {
  EC2_FILTRE = id;
  const sel = document.getElementById('ecFilterType');
  if (sel) sel.value = id === 'all' ? '' : id;
  ec2Render();
}

// ── FRISE DES ÉCHÉANCES ───────────────────────────────────────────────
function ec2List(list) {
  const el = document.getElementById('ecList');
  if (!el) return;
  const canEdit = _ec2CanEdit();

  if (!list.length) {
    el.innerHTML = `<div class="ec2-empty">
      ${_ec2Svg(EC2_IC.cal)}
      <div class="ec2-empty-t">Aucune échéance</div>
      <div class="ec2-empty-s">Ajoutez les renouvellements à suivre (MDPH, jugements, CNI…).</div>
      ${canEdit ? '<button type="button" class="v2-btn v2-btn-primary v2-btn-sm" style="margin-top:14px" onclick="openEcheanceModal()">+ Nouvelle échéance</button>' : ''}
    </div>`;
    return;
  }

  // Tri : retard d'abord, puis par date croissante ; traitées à la fin
  const order = { late: 0, soon: 1, watch: 2, ok: 3, done: 4 };
  const rows = list.slice().sort((a, b) =>
    (order[ecUrgency(a)] - order[ecUrgency(b)]) || (a.date || '').localeCompare(b.date || ''));

  el.innerHTML = rows.map(e => {
    const u = ecUrgency(e), uc = EC2_UC[u] || EC2_UC.ok, tc = _ec2Tc(e), t = _ec2Ty(e);
    const p = _ec2Pastille(e);
    const meta = [];
    if (e.residentName) meta.push(`<a href="resident.html?id=${escAttr(e.residentId)}">${escHtml(e.residentName)}</a>`);
    else meta.push('Établissement');
    if (e.date) meta.push(escHtml(formatDate(e.date)));
    if (e.notes) meta.push(escHtml(e.notes));
    if (e.documentPath) meta.push(`<a onclick="openEcheanceDoc('${escAttr(e.id)}');return false" title="Ouvrir le dernier document joint">document joint</a>`);

    const acts = canEdit ? `<div class="ec2-acts">
      <button type="button" class="ec2-act" style="--ac:${e.done ? '#8095b4' : '#34d399'}" title="${e.done ? 'Réactiver' : 'Marquer comme traité'}" onclick="toggleEcheanceDone('${escAttr(e.id)}')">${_ec2Svg(e.done ? EC2_IC.undo : EC2_IC.check, 2.6)}</button>
      <button type="button" class="ec2-act" style="--ac:#38bdf8" title="Renouveler : joindre le nouveau document et reporter la date" onclick="openRenouvelerModal('${escAttr(e.id)}')">${_ec2Svg(EC2_IC.clip)}</button>
      <button type="button" class="ec2-act" style="--ac:#818cf8" title="Modifier" onclick="openEcheanceModal('${escAttr(e.id)}')">${_ec2Svg(EC2_IC.pen)}</button>
      <button type="button" class="ec2-act" style="--ac:#ef4444" title="Supprimer" onclick="deleteEcheance('${escAttr(e.id)}')">${_ec2Svg(EC2_IC.trash)}</button>
    </div>` : '';

    return `<div class="ec2-row${e.done ? ' done' : ''}" style="--uc:${uc};--tc:${tc}">
      <div class="ec2-d"><span class="ec2-d-j">${p.j}</span><span class="ec2-d-m">${p.m}</span></div>
      <div class="ec2-mid">
        <div class="ec2-h">
          <span class="ec2-t">${escHtml(e.libelle || t.label)}</span>
          <span class="ec2-ty">${escHtml(t.label)}</span>
        </div>
        <div class="ec2-sub">${meta.join(' · ')}</div>
      </div>
      <span class="ec2-left">${escHtml(_ec2Left(e))}</span>
      ${acts}
    </div>`;
  }).join('');
}
