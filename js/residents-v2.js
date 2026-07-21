// ── ANNUAIRE DES RÉSIDENTS — DESIGN V2 ──
// Reproduit « Residents - refonte (bento) » : chips de filtre par statut,
// grille de cartes, et rail de détail du résident sélectionné.
// Les helpers partagés (rv2ObjPct, rv2Abbrev, rv2Ini, rv2Chip…) viennent de
// js/resident-v2.js, chargé avant ce fichier.

let RES_FILTRE = 'all';       // statut sélectionné dans les chips
let RES_SEL = null;           // id du résident affiché dans le rail
let _residentsTransmissions = [];

const RES_FILTRES = [
  { id: 'all',        label: 'Tous',       dot: '#818cf8' },
  { id: 'permanent',  label: 'Permanent',  dot: '#10b981' },
  { id: 'temporaire', label: 'Temporaire', dot: '#f59e0b' },
  { id: 'stage',      label: 'Stage',      dot: '#6366f1' },
  { id: 'urgence',    label: 'Urgence',    dot: '#ef4444' }
];

// ── CHIPS DE FILTRE ──────────────────────────────────────────────────

// Les compteurs portent sur la liste complète, pas sur le résultat filtré :
// sinon toutes les chips sauf l'active afficheraient 0.
function resRenderChips() {
  const bar = document.getElementById('resChips');
  if (!bar) return;
  const tous = _residentsCache || [];
  bar.innerHTML = RES_FILTRES.map(f => {
    const n = f.id === 'all' ? tous.length : tous.filter(r => r.statut === f.id).length;
    return `<button type="button" class="v2-chip-f${RES_FILTRE === f.id ? ' on' : ''}" onclick="resSetFiltre('${f.id}')">
      <span class="dot" style="background:${f.dot}"></span>${escHtml(f.label)}<span class="n">${n}</span>
    </button>`;
  }).join('');
}

function resSetFiltre(id) {
  RES_FILTRE = id;
  renderResidents();
}

// ── TAGS DE CARTE ────────────────────────────────────────────────────

// La maquette montre des étiquettes (régime, vigilance, mesure…). Elles ne sont
// pas stockées telles quelles : on les dérive des champs réellement saisis.
function resTags(r) {
  const t = [];
  const reg = r.regime || {};
  if (reg.type && reg.type !== 'normal') {
    const rt = RV2_REGIMES[reg.type] || null;
    t.push({ l: reg.type === 'autre' && reg.autreLabel ? reg.autreLabel : (rt ? rt.label : reg.type),
             c: rt ? rt.color : '#64748b' });
  }
  if (reg.texture && reg.texture !== 'normale') {
    const tx = RV2_TEXTURES[reg.texture] || reg.texture;
    t.push({ l: tx, c: '#22d3ee' });
  }
  const allerg = reg.allergiesAlim || r.allergies;
  if (allerg) t.push({ l: allerg, c: '#ef4444' });
  if (r.protection) t.push({ l: (PROTECTION_LABELS[r.protection] || r.protection), c: '#94a3b8' });
  return t.slice(0, 3);
}

// ── RAIL DE DÉTAIL ───────────────────────────────────────────────────

function resDerniereTransmission(r) {
  const nom = `${r.prenom || ''} ${r.nom || ''}`.trim();
  return (_residentsTransmissions || [])
    .filter(t => String(t.residentId) === String(r.id) || t.residentName === nom)
    .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))[0] || null;
}

function resRenderDetail() {
  const box = document.getElementById('resDetail');
  if (!box) return;

  const r = (_residentsCache || []).find(x => String(x.id) === String(RES_SEL));
  if (!r) {
    box.innerHTML = `<div class="v2-det"><div class="v2-det-vide">Sélectionnez un résident pour voir son détail.</div></div>`;
    return;
  }

  const c = safeColor(r.color, '#818cf8');
  const presences = (DB.get(DB.keys.presences) || {})[today()] || {};
  const statut = presences[r.id] || (r.statut === 'sorti' ? 'sorti' : r.statut);

  const av = r.photo
    ? `<div class="v2-det-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="v2-det-av" style="background:${c}">${initials(r.prenom, r.nom)}</div>`;

  const fait = (k, v) => `<div class="v2-det-f">
    <div class="v2-fact-k">${escHtml(k)}</div>
    <div style="font-size:12.5px;font-weight:600;color:var(--v2-t2)">${escHtml(v || '—')}</div></div>`;

  // Objectifs : le pourcentage vient de la progression des axes de travail.
  const catalogue = DB.get(DB.keys.objectives) || [];
  const suivi = r.objectifsSuivi || {};
  const objs = (r.objectifs || []).map(id => {
    const def = catalogue.find(o => String(o.id) === String(id)) || {};
    const sv = suivi[id] || {};
    const st = RV2_OBJ_STATUTS[sv.statut] || RV2_OBJ_STATUTS.non_commence;
    return { label: def.name || 'Objectif', st, statut: sv.statut, pct: rv2ObjPct(sv) };
  });

  const objHtml = objs.length ? objs.map(o => {
    const droite = o.pct == null ? o.st.label : o.pct + '%';
    const largeur = o.pct == null ? (o.statut === 'atteint' ? 100 : 0) : o.pct;
    return `<div>
      <div style="display:flex;align-items:baseline;margin-bottom:6px">
        <span style="font-size:12px;color:var(--v2-t3)">${escHtml(o.label)}</span>
        <span style="margin-left:auto;font-size:11px;font-weight:700;color:${o.st.color}">${escHtml(droite)}</span>
      </div>
      ${rv2Prog(largeur, o.st.color)}
    </div>`;
  }).join('') : `<div class="v2-blk-vide">Aucun objectif rattaché.</div>`;

  // Suivi médical : mêmes sources que la fiche (pas de champ « pathologies »).
  const s = r.sante || {};
  const med = [];
  (s.traitements || []).slice(0, 3).forEach(t => {
    if (t.nom) med.push(rv2Chip(t.nom, '#ec4899'));
  });
  if (s.groupeSanguin) med.push(rv2Chip('Groupe ' + s.groupeSanguin, '#22d3ee'));
  if (r.medecin) med.push(rv2Chip(r.medecin, '#818cf8'));
  const DMP = { actif: ['DMP actif', '#10b981'], en_attente: ['DMP en attente', '#f59e0b'], non_ouvert: ['DMP non ouvert', '#64748b'] };
  if (DMP[r.dmp]) med.push(rv2Chip(DMP[r.dmp][0], DMP[r.dmp][1]));

  const tr = resDerniereTransmission(r);
  const trHtml = tr
    ? `<div class="v2-det-note">${escHtml(tr.content || '')}
        <div style="font-size:10.5px;color:var(--v2-t7);margin-top:8px">${escHtml(
          [tr.authorName, rv2Quand(tr.date, (tr.createdAt || '').slice(11, 16))].filter(Boolean).join(' · '))}</div></div>`
    : `<div class="v2-blk-vide">Aucune transmission.</div>`;

  const svgEval = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
  const svgAgenda = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  box.innerHTML = `<div class="v2-det" style="--rc:${c}">
    <div class="v2-det-h">
      <div style="display:flex;align-items:center;gap:14px">
        ${av}
        <div style="min-width:0;flex:1">
          <div class="v2-det-nom">${escHtml(r.prenom || '')} ${escHtml(r.nom || '')}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:5px;flex-wrap:wrap">
            ${statusBadge(statut)}
            ${r.dob ? `<span style="font-size:11.5px;color:var(--v2-t5)">${age(r.dob)}</span>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="v2-det-b">
      <div class="v2-det-facts">
        ${fait('Chambre', r.chambre)}
        ${fait('Unité', rv2Unite(r))}
        ${fait('Entrée', r.entree ? formatDate(r.entree) : '')}
        ${fait('Référent', rv2Abbrev(r.referent))}
      </div>

      <div class="v2-blk-sub">Objectifs individualisés</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:22px">${objHtml}</div>

      <div class="v2-blk-sub">Suivi médical</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:22px">${
        med.length ? med.join('') : '<div class="v2-blk-vide">Rien de signalé.</div>'}</div>

      <div class="v2-blk-sub">Dernière transmission</div>
      ${trHtml}
    </div>

    <div class="v2-det-f-foot">
      <a class="v2-det-open" href="resident.html?id=${r.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Ouvrir la fiche
      </a>
      <a class="v2-det-ico" href="objectifs.html?tab=evaluations&residentId=${r.id}" title="Grille d'évaluation">${svgEval}</a>
      <a class="v2-det-ico" href="planning.html" title="Agenda">${svgAgenda}</a>
    </div>
  </div>`;
}

function resSelect(id) {
  RES_SEL = id;
  renderResidents();
}
