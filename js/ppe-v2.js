// ── AVENANTS AU PROJET PERSONNALISÉ — DESIGN V2 ──
// Reproduit la maquette « Avenants PPE (dossiers) » :
//   4 tuiles de statistiques (Avenants / Actifs / Brouillons / Révision en retard),
//   une rangée de puces de statut avec compteurs,
//   une grille de cartes 3 colonnes (en-tête teinté + 4 lignes libellé/valeur + pied
//   « Ouvrir » / « Comparer »).
//
// Les données et les actions restent celles de js/ppe.js (getPpe, residentsList,
// openAvenant, openCompareAvenant, editAvenant, deleteAvenant, openAvenantBilan…).
// Aucune couche Supabase n'est réécrite ici.

const PP2_STATUTS = {
  brouillon: { l: 'Brouillon', c: '#f59e0b', t: 'amber' },
  actif:     { l: 'Actif',     c: '#10b981', t: 'green' },
  termine:   { l: 'Terminé',   c: '#94a3b8', t: 'gray' }
};

// Palette de repli quand le résident n'a pas de couleur enregistrée
const PP2_PAL = ['#22d3ee', '#818cf8', '#ec4899', '#10b981', '#f59e0b', '#a78bfa', '#38bdf8', '#f87171'];

const PP2_IC = {
  file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  edit:  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>'
};

function pp2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// Variante 16px pour les chips / icônes de tuiles KPI du langage « Console Data »
function pp2Svg16(d) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

function pp2Ini(nom) {
  return String(nom || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0] || '').join('').toUpperCase() || '?';
}

// Couleur de l'avenant : celle du résident, sinon dérivée de son identifiant
function pp2Color(p, r) {
  const c = typeof safeColor === 'function' ? safeColor(r && r.color, '') : (r && r.color) || '';
  if (c) return c;
  const s = String(p.residentId || p.id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PP2_PAL[h % PP2_PAL.length];
}

function pp2Statut(s) { return PP2_STATUTS[s] || { l: s || '—', c: '#94a3b8', t: 'gray' }; }

// Révision dépassée : date passée sur un avenant qui n'est pas terminé
function pp2RevEnRetard(p) {
  if (!p.dateRevision || p.statut === 'termine') return false;
  const d = new Date(p.dateRevision);
  if (isNaN(d)) return false;
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  return d < auj;
}

function pp2NbObjectifs(p) {
  return Object.entries(p.sections || {})
    .filter(([k]) => k !== '_cycle')
    .reduce((a, [, s]) => a + ((s && s.objectifs || []).filter(o => o && (o.objectif || '').trim()).length), 0);
}

// Liste filtrée — mêmes contrats que js/ppe.js (recherche + selects masqués)
function pp2Filtre(list) {
  const search = (document.getElementById('searchAvenant')?.value || '').toLowerCase();
  const fRes = document.getElementById('filterResidentAvenant')?.value || '';
  const fSta = document.getElementById('filterStatutAvenant')?.value || '';
  return list.filter(p => {
    if (fRes && String(p.residentId) !== String(fRes)) return false;
    if (fSta && p.statut !== fSta) return false;
    if (search && !String(p.residentName || '').toLowerCase().includes(search)) return false;
    return true;
  });
}

// ── Rendu principal ───────────────────────────────────────────────────
function pp2Render() {
  const container = document.getElementById('avenantList');
  if (!container) return;
  container.style.display = '';

  const all = (typeof getPpe === 'function' ? getPpe() : []) || [];
  pp2RenderStats(all);
  pp2RenderChips(all);

  const list = pp2Filtre(all).slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  if (!list.length) {
    container.innerHTML = `<div class="pp2-vide">
      <span class="pp2-vide-ico">${pp2Svg(PP2_IC.file)}</span>
      <div class="pp2-vide-t">${all.length ? 'Aucun avenant pour ce filtre' : 'Aucun avenant'}</div>
      <div class="pp2-vide-s">${all.length ? 'Modifiez les filtres ou la recherche.' : 'Créez le premier avenant au projet personnalisé.'}</div>
      <button type="button" class="v2-btn v2-btn-primary v2-btn-sm" onclick="pp2NouvelAvenant()">Nouvel avenant</button>
    </div>`;
    return;
  }

  const residents = typeof residentsList === 'function' ? residentsList() : [];
  container.innerHTML = `<div class="pp2-grid">${list.map(p => pp2Card(p, residents)).join('')}</div>`;
}

function pp2RenderStats(all) {
  const el = document.getElementById('ppeStats');
  if (!el) return;
  const stats = [
    { n: all.length, l: 'Avenants', c: '#818cf8', ic: PP2_IC.file, sub: 'Total des dossiers' },
    { n: all.filter(p => p.statut === 'actif').length, l: 'Actifs', c: '#10b981', ic: PP2_IC.check, sub: 'En cours de suivi' },
    { n: all.filter(p => p.statut === 'brouillon').length, l: 'Brouillons', c: '#f59e0b', ic: PP2_IC.edit, sub: 'À finaliser' },
    { n: all.filter(pp2RevEnRetard).length, l: 'Révision en retard', c: '#ef4444', ic: PP2_IC.alert, sub: 'À replanifier' }
  ];
  el.innerHTML = stats.map(s => `<div class="dc-kpi" style="--dc-c:${s.c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${s.l}</span><span class="dc-kpi-ico" style="color:${s.c}">${pp2Svg16(s.ic)}</span></div>
    <div class="dc-kpi-val">${s.n}</div>
    <div class="dc-kpi-sub">${s.sub}</div>
  </div>`).join('');
}

function pp2RenderChips(all) {
  const el = document.getElementById('ppeChips');
  if (!el) return;
  const courant = document.getElementById('filterStatutAvenant')?.value || '';
  const defs = [{ id: '', label: 'Tous', dot: '#818cf8', n: all.length }]
    .concat(Object.keys(PP2_STATUTS).map(k => ({
      id: k, label: PP2_STATUTS[k].l, dot: PP2_STATUTS[k].c,
      n: all.filter(p => p.statut === k).length
    })));
  let html = defs.map(f => `<button type="button" class="v2-chip-f${f.id === courant ? ' on' : ''}"
      aria-pressed="${f.id === courant}" onclick="pp2SetStatut('${f.id}')">
      <span class="dot" style="background:${f.dot}"></span>${f.label}<span class="n">${f.n}</span>
    </button>`).join('');

  // Filtre résident (posé par l'URL ?residentId= ou par un lien de fiche) :
  // sans cette puce, il resterait actif sans aucun moyen visible de le lever.
  const resId = document.getElementById('filterResidentAvenant')?.value || '';
  if (resId) {
    const r = (typeof residentsList === 'function' ? residentsList() : []).find(x => String(x.id) === String(resId));
    const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : (all.find(p => String(p.residentId) === String(resId)) || {}).residentName || 'Résident';
    html += `<button type="button" class="v2-chip-f on pp2-chip-res" onclick="pp2ClearResident()"
      title="Retirer le filtre résident">Résident : ${escHtml(nom)} <span class="n" aria-hidden="true">✕</span></button>`;
  }
  el.innerHTML = html;
}

function pp2ClearResident() {
  const sel = document.getElementById('filterResidentAvenant');
  if (sel) sel.value = '';
  pp2Render();
}

// La puce pilote le <select> masqué : il reste le contrat avec js/ppe.js
function pp2SetStatut(v) {
  const sel = document.getElementById('filterStatutAvenant');
  if (!sel) return;
  sel.value = v;
  pp2Render();
}

function pp2Card(p, residents) {
  const r = residents.find(x => String(x.id) === String(p.residentId));
  const col = pp2Color(p, r);
  const st = pp2Statut(p.statut);
  const late = pp2RevEnRetard(p);
  const nbObj = pp2NbObjectifs(p);
  const fd = d => (typeof formatDate === 'function' ? formatDate(d) : (d || '—'));
  const av = r && r.photo
    ? `<span class="dc-chip" style="padding:0;overflow:hidden;background:${col}22"><img src="${escAttr(r.photo)}" alt="" style="width:100%;height:100%;object-fit:cover"/></span>`
    : `<span class="dc-chip" style="background:${col}22;color:${col};font-weight:700">${pp2Ini(p.residentName)}</span>`;

  // Action contextuelle du cycle du PPA (bilan à 6 mois / réévaluation en retard)
  let ctx = '';
  if (typeof ppeCycleSteps === 'function') {
    const courant = ppeCycleSteps(p).find(s => !s.done);
    if (courant && courant.id === 'bilan6') {
      ctx = `<button type="button" class="pp2-fbtn pp2-fbtn-warn" onclick="event.stopPropagation();openAvenantBilan('${p.id}')">Faire le bilan</button>`;
    } else if (courant && courant.id === 'reeval' && courant.late) {
      ctx = `<button type="button" class="pp2-fbtn pp2-fbtn-danger" onclick="event.stopPropagation();openAvenant('${p.id}')">Réévaluer</button>`;
    }
  }

  return `<div class="pp2-card dc-card" style="--ac:${col};display:flex;flex-direction:column">
    <div class="dc-head">
      <div class="dc-head-l">
        ${av}
        <div style="min-width:0">
          <div class="dc-eyebrow">Avenant PPA</div>
          <div class="dc-title" title="${escAttr(p.residentName || '—')}">${escHtml(p.residentName || '—')}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <span class="dc-badge dc-b-${st.t}"><span class="d"></span>${st.l}</span>
        <button type="button" class="pp2-del" title="Supprimer l'avenant" aria-label="Supprimer l'avenant"
          onclick="event.stopPropagation();deleteAvenant('${p.id}')">${pp2Svg(PP2_IC.trash, 2)}</button>
      </div>
    </div>
    <div class="pp2-rows" style="border-left:3px solid ${col}">
      <div class="pp2-r"><span class="pp2-r-l">Rédaction</span><span class="pp2-r-v">${fd(p.dateRedaction)}</span></div>
      <div class="pp2-r"><span class="pp2-r-l">Révision</span><span class="pp2-r-v${late ? ' late' : ''}">${p.dateRevision ? fd(p.dateRevision) : '—'}${late ? ' · en retard' : ''}</span></div>
      <div class="pp2-r"><span class="pp2-r-l">Référent</span><span class="pp2-r-v">${escHtml(p.referent || '—')}</span></div>
      <div class="pp2-r"><span class="pp2-r-l">Objectifs</span><span class="pp2-r-v">${nbObj} suivi${nbObj > 1 ? 's' : ''}</span></div>
    </div>
    <div class="pp2-foot">
      <button type="button" class="pp2-fbtn pp2-fbtn-pri" onclick="openAvenant('${p.id}')">Ouvrir</button>
      <button type="button" class="pp2-fbtn" onclick="openCompareAvenant('${p.id}')">Comparer</button>
      ${ctx}
      <button type="button" class="pp2-fbtn pp2-fbtn-ico" title="Modifier les informations" aria-label="Modifier les informations"
        onclick="event.stopPropagation();editAvenant('${p.id}')">${pp2Svg(PP2_IC.edit, 2)}</button>
    </div>
  </div>`;
}

// ── Actions de la barre du haut ───────────────────────────────────────
// Le listener 'open' posé par js/ppe.js n'est jamais déclenché : on réinitialise
// explicitement le formulaire avant d'ouvrir la modale (sinon la création
// reprend les valeurs de la dernière modification).
function pp2NouvelAvenant() {
  if (typeof resetAvenantModal === 'function') resetAvenantModal();
  openModal('modalAvenant');
}

// Statistiques, puces et recherche n'ont plus de sens quand la vue détaillée
// d'un avenant occupe la page : on les masque le temps de la consultation.
function pp2ListChrome(visible) {
  ['ppeStats', 'ppeChips'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  });
  const s = document.getElementById('searchAvenant');
  if (s) s.style.display = visible ? '' : 'none';
}

function pp2GenererDepuisJournal() {
  pp2NouvelAvenant();
  if (typeof toast === 'function') toast('Choisissez le résident, puis « Générer depuis le journal »', 'info');
  setTimeout(() => document.getElementById('fAvResident')?.focus(), 120);
}
