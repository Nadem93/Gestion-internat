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

// Rail latéral : plus rendu depuis que la fiche s'ouvre dans la carte
// (l'élément #resDetail a été retiré de residents.html). La fonction reste
// inoffensive — elle sort immédiatement — et resDetailHtml() ci-dessous, lui,
// sert toujours à l'accordéon.
function resRenderDetail() {
  const box = document.getElementById('resDetail');
  if (!box) return;
  const r = (_residentsCache || []).find(x => String(x.id) === String(RES_SEL));
  if (!r) {
    box.innerHTML = `<div class="dc-card"><div class="v2-det-vide">Sélectionnez un résident pour voir son détail.</div></div>`;
    return;
  }
  box.innerHTML = resDetailHtml(r);
}

// Aperçu détaillé d'un résident, réutilisé par le rail (desktop) ET l'accordéon
// inline dans la carte (mobile). compact=true → on masque l'en-tête (avatar, nom,
// âge, statut) car la carte l'affiche déjà : évite le doublon en mode inline.
function resDetailHtml(r, compact) {
  const c = safeColor(r.color, '#818cf8');
  const presences = (DB.get(DB.keys.presences) || {})[today()] || {};
  const statut = presences[r.id] || (r.statut === 'sorti' ? 'sorti' : r.statut);

  const av = r.photo
    ? `<div class="v2-det-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="v2-det-av" style="background:${c}">${initials(r.prenom, r.nom)}</div>`;

  // Fait affiché en micro-label + valeur (langage « Console Data »).
  const factRow = (k, v) => `<div style="min-width:0">
    <div class="dc-eyebrow" style="margin-bottom:4px">${escHtml(k)}</div>
    <div style="font-size:12.5px;font-weight:600;color:var(--v2-t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(v || '—')}</div></div>`;
  // Badge monospace « Console Data » à teinte libre.
  const dcBadge = (l, cc) => `<span class="dc-badge" style="background:${cc}1f;color:${cc};border:1px solid ${cc}44"><span class="d" style="background:${cc}"></span>${escHtml(l)}</span>`;
  // Pastille d'icône colorée (façon .dc-chip) devant un fait.
  const svgIco = (svg, cc) => `<span style="width:30px;height:30px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${cc}22;color:${cc}">${svg}</span>`;

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
    if (t.nom) med.push([t.nom, '#ec4899']);
  });
  if (s.groupeSanguin) med.push(['Groupe ' + s.groupeSanguin, '#22d3ee']);
  if (r.medecin) med.push([r.medecin, '#818cf8']);
  const DMP = { actif: ['DMP actif', '#10b981'], en_attente: ['DMP en attente', '#f59e0b'], non_ouvert: ['DMP non ouvert', '#64748b'] };
  if (DMP[r.dmp]) med.push([DMP[r.dmp][0], DMP[r.dmp][1]]);

  // Échéances ouvertes du résident (MDPH, mesure de protection, contrat…),
  // de la plus proche à la plus lointaine. Rouge = dépassée, ambre = dans les
  // 30 jours, gris = plus loin.
  const echeances = (typeof _residentsEcheances !== 'undefined' ? _residentsEcheances : [])
    .filter(e => String(e.residentId) === String(r.id) && !e.done && e.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const _t0 = today();
  const echHtml = echeances.length ? echeances.slice(0, 6).map(e => {
    const jours = Math.round((new Date(e.date + 'T00:00:00') - new Date(_t0 + 'T00:00:00')) / 86400000);
    const col = jours < 0 ? '#ef4444' : (jours <= 30 ? '#f59e0b' : '#64748b');
    const quand = jours < 0 ? (jours === -1 ? 'hier' : 'il y a ' + (-jours) + ' j')
      : (jours === 0 ? "auj." : jours === 1 ? 'demain' : 'dans ' + jours + ' j');
    const dateFr = new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    return `<div onclick="location.href='echeances.html?resident=${encodeURIComponent(r.id)}'" title="Ouvrir l'échéancier de ce résident" style="display:flex;align-items:center;gap:9px;border-left:3px solid ${col};padding:8px 6px 8px 11px;cursor:pointer;border-radius:7px;transition:background .15s" onmouseover="this.style.background='var(--v2-s-sub)'" onmouseout="this.style.background=''">
      <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--v2-t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(e.libelle || e.type || 'Échéance')}</span>
      <span class="dc-pill dim">${dateFr}</span>
      <span class="dc-badge" style="background:${col}1f;color:${col};border:1px solid ${col}44"><span class="d" style="background:${col}"></span>${jours < 0 ? 'Retard · ' : ''}${escHtml(quand)}</span>
    </div>`;
  }).join('') : `<div class="v2-blk-vide">Aucune échéance.</div>`;

  const tr = resDerniereTransmission(r);
  const trHtml = tr
    ? `<div class="v2-det-note">${escHtml(tr.content || '')}
        <div style="font-size:10.5px;color:var(--v2-t7);margin-top:8px">${escHtml(
          [tr.authorName, rv2Quand(tr.date, (tr.createdAt || '').slice(11, 16))].filter(Boolean).join(' · '))}</div></div>`
    : `<div class="v2-blk-vide">${typeof _residentsTransmissionsOk !== 'undefined' && !_residentsTransmissionsOk
        ? 'Transmissions indisponibles — réessayez.'
        : 'Aucune transmission depuis 60 jours.'}</div>`;

  // Icônes du bandeau d'alertes et de la tuile médicaments. DÉCLARÉES ICI,
  // avant les blocs qui les consomment : plus bas, le `const` les plaçait dans
  // leur zone morte temporelle et resDetailHtml levait un ReferenceError à
  // l'exécution — le rail restait vide, sans que `node --check` n'y voie rien.
  const svgAlerte = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const svgPilule = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/></svg>`;

  // ── Alertes de sécurité ────────────────────────────────────────────────
  // Allergies, contre-indications, texture et régime : elles figuraient en
  // pastilles sur la carte mais étaient noyées dans « Suivi médical » ici.
  // Remontées en bandeau : c'est l'information dont l'absence se paie cher.
  const reg = r.regime || {};
  const alertes = [];
  if ((r.allergies || '').trim()) alertes.push(r.allergies.trim());
  if ((reg.allergiesAlim || '').trim()) alertes.push('Allergie alim. : ' + reg.allergiesAlim.trim());
  if (reg.texture && reg.texture !== 'normale') {
    alertes.push('Texture ' + (RV2_TEXTURES[reg.texture] || reg.texture).toLowerCase());
  }
  // Le régime vit dans regime.TYPE (voir saveRegime, js/repas.js:601), pas dans
  // regime.regime : la condition précédente était toujours fausse, et un résident
  // dont le seul point de vigilance était un régime hyposodé ou diabétique
  // n'avait AUCUN bandeau. On réutilise la table de libellés déjà employée par
  // les pastilles de la carte (resTags, plus haut dans ce fichier).
  if (reg.type && reg.type !== 'normal') {
    const rt = RV2_REGIMES[reg.type] || null;
    alertes.push('Régime ' + (reg.type === 'autre' && reg.autreLabel
      ? reg.autreLabel : (rt ? rt.label.toLowerCase() : reg.type)));
  }
  // (r.sante.contreIndications n'existe pas dans le modèle : ligne supprimée.)
  const alertesHtml = alertes.length
    ? `<div class="rd-alerte">${svgAlerte}<span>${escHtml(alertes.join(' · '))}</span></div>`
    : '';

  // ── Prises de médicaments du jour ──────────────────────────────────────
  // Même dérivation que medPrevues() de js/medicaments.js : un traitement
  // compte autant de prises qu'il a de moments, filtré sur ses dates de début
  // et de fin. On la refait ici pour ne pas charger tout le module.
  const _tj = today();
  const prevues = (s.traitements || []).filter(t =>
      (t.moments || []).length && (!t.debut || t.debut <= _tj) && (!t.fin || t.fin >= _tj))
    .reduce((n, t) => n + (t.moments || []).length, 0);
  const faites = (typeof _residentsMedJour !== 'undefined' ? _residentsMedJour : [])
    .filter(m => String(m.residentId) === String(r.id) && ['donne', 'confie'].includes(m.statut)).length;
  // Classe plutôt que couleur en dur : posée en dur, aucune correction de thème
  // ne pouvait la rattraper, et l'ambre tombait à 2,0 de contraste sur la carte
  // claire — précisément la donnée qu'il ne faut pas rater.
  const medClasse = !prevues ? 'rd-med-neutre' : (faites >= prevues ? 'rd-med-ok' : 'rd-med-att');

  // ── Bloc administratif (repliable) ─────────────────────────────────────
  // Champs présents en base mais qui n'étaient affichés nulle part dans le rail.
  const tel = t => (t || '').replace(/[^0-9+]/g, '');
  const ligneAdmin = (lib, val, telNum) => {
    if (!val) return '';
    const v = telNum
      ? `<a href="tel:${escAttr(tel(telNum))}" onclick="event.stopPropagation()" class="rd-tel">${escHtml(val)}<span>${escHtml(telNum)}</span></a>`
      : `<span class="rd-adm-v">${escHtml(val)}</span>`;
    return `<div class="rd-adm-l"><span class="rd-adm-k">${escHtml(lib)}</span>${v}</div>`;
  };
  const serafin = Array.isArray(r.serafinph?.selected) ? r.serafinph.selected.length : 0;
  const admin = [
    ligneAdmin('Protection', [r.protection, r.protectionNom].filter(Boolean).join(' · '), r.protectionTel),
    ligneAdmin('Représentant légal', r.tuteur, r.tuteurTel),
    ligneAdmin('Médecin traitant', r.medecin, r.medecinTel),
    ligneAdmin('Situation admin.', r.situationAdmin),
    ligneAdmin('Organisme', r.organisme),
    ligneAdmin('Situation pro.', r.situationPro),
    serafin ? ligneAdmin('SERAFIN-PH', serafin + ' besoin' + (serafin > 1 ? 's' : '') + ' identifié' + (serafin > 1 ? 's' : '')) : '',
  ].filter(Boolean).join('');

  const svgEval = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
  const svgAgenda = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  // Icônes 16px pour les liserés de faits (langage « Console Data »).
  const svgBed = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`;
  const svgHome = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const svgCal = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const svgUser = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  return `<div class="dc-card" style="--rc:${c}">
    ${compact ? '' : `<div class="dc-head">
      <div class="dc-head-l">
        ${av}
        <div style="min-width:0;flex:1">
          <div class="dc-eyebrow">Résident</div>
          <div class="dc-title" style="font-size:16px">${escHtml(r.prenom || '')} ${escHtml(r.nom || '')}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
            ${statusBadge(statut)}
            ${r.dob ? `<span style="font-size:11.5px;color:var(--v2-t5)">${age(r.dob)}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`}

    <div class="dc-body">
      ${alertesHtml}

      <div class="rd-jour">
        <div class="rd-tuile">
          <span class="rd-tuile-k">Aujourd'hui</span>
          <span class="rd-tuile-v">${statusBadge(statut)}</span>
        </div>
        <div class="rd-tuile">
          <span class="rd-tuile-k">Médicaments</span>
          <span class="rd-tuile-v ${medClasse}">${svgPilule}${prevues ? faites + ' / ' + prevues : 'aucune prise'}</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px">
        <div style="display:flex;align-items:center;gap:8px">${svgIco(svgBed, c)}${factRow('Chambre', r.chambre, c)}</div>
        <div style="display:flex;align-items:center;gap:8px">${svgIco(svgHome, '#22d3ee')}${factRow('Unité', rv2Unite(r), '#22d3ee')}</div>
        <div style="display:flex;align-items:center;gap:8px">${svgIco(svgCal, '#6366f1')}${factRow('Entrée', r.entree ? formatDate(r.entree) : '', '#6366f1')}</div>
        <div style="display:flex;align-items:center;gap:8px">${svgIco(svgUser, '#10b981')}${factRow('Référent', rv2Abbrev(r.referent), '#10b981')}</div>
      </div>

      <div class="dc-eyebrow" style="margin:22px 0 12px">Objectifs individualisés</div>
      <div style="display:flex;flex-direction:column;gap:14px">${objHtml}</div>

      <div class="dc-eyebrow" style="margin:22px 0 12px">Suivi médical</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px">${
        med.length ? med.map(m => dcBadge(m[0], m[1])).join('') : '<div class="v2-blk-vide">Rien de signalé.</div>'}</div>

      <div class="dc-eyebrow" style="margin:22px 0 12px">Échéances</div>
      <div>${echHtml}</div>

      <div class="dc-eyebrow" style="margin:22px 0 12px">Dernière transmission</div>
      ${trHtml}
    </div>

    ${admin ? `<details class="rd-adm">
      <summary>Administratif</summary>
      <div class="rd-adm-c">${admin}</div>
    </details>` : ''}

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
  // La fiche se déplie DANS la carte (accordéon, toutes tailles) : recliquer la
  // carte ouverte la referme, cliquer une autre bascule la sélection.
  RES_SEL = (String(RES_SEL) === String(id)) ? null : id;
  renderResidents();
}
