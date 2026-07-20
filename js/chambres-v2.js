// ── PLAN DES CHAMBRES — DESIGN V2 ──
// Reproduit la maquette « Chambres (vie quotidienne) » :
//   4 tuiles de statistiques · puces de filtre (Toutes / Occupées / Libres)
//   grille de chambres 4 colonnes + rail (« Occupation par unité », « États des lieux »)
//   panneau « État des lieux » interactif (postes cliquables Bon → Moyen → Dégradé).
//
// Les données et les actions restent celles de js/chambres.js (getChambres,
// getEdl, chOccupants, openChambreModal, openAssignModal, deleteChambre,
// saveEdlEntry…). Aucune écriture Supabase n'est réécrite ici.

const CH2 = { filter: 'all' };

// Niveaux réellement enregistrés par l'application (EDL_NIVEAUX de chambres.js)
const CH2_NIV = {
  'Bon':        { c: '#10b981' },
  'Moyen':      { c: '#f59e0b' },
  'Dégradé':    { c: '#ef4444' },
  // Uniquement pour relire un ancien relevé où le poste n'existait pas encore.
  'Non évalué': { c: '#8095b4' }
};

// Icône par poste d'état des lieux (clés = EDL_ITEMS de chambres.js)
const CH2_IC = {
  home:  '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  layer: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  box:   '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><line x1="12" y1="22" x2="12" y2="12"/>',
  bed:   '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  drop:  '<path d="M12 2.7l5.3 5.3a7.5 7.5 0 1 1-10.6 0z"/>',
  key:   '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/>',
  in:    '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  out:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pen:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  win:   '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/>',
  bolt:  '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  heat:  '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z"/>'
};
const CH2_ITEM_IC = {
  murs: 'home', sol: 'layer', mobilier: 'box', literie: 'bed', sanitaires: 'drop',
  fenetre: 'win', elec: 'bolt', chauffage: 'heat'
};

function ch2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

function ch2CanEdit() {
  const s = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
  return Auth.isAdmin() || ['admin', 'moderator', 'superadmin'].includes(s?.role)
    || ((typeof canEditResidents === 'function') ? canEditResidents(s?.userId) : Auth.isAdmin());
}

function ch2Cap(c) { return Math.max(parseInt(c.capacite) || 1, 1); }
function ch2IsPmr(c) { return /pmr/i.test(String(c.notes || '')); }

// « depuis » de la maquette : source = chambres.date_attribution, la date à
// laquelle l'occupant actuel a reçu la chambre. Tant qu'elle n'est pas saisie
// (ou que la migration n'est pas passée), on n'affiche rien — on ne se rabat
// plus sur la date d'entrée du résident dans l'établissement, qui est autre
// chose.
function ch2Since(c) {
  const d = String((c && c.dateAttribution) || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
  return 'depuis ' + d.slice(5, 7) + '/' + d.slice(2, 4);
}

function ch2SetFilter(f) { CH2.filter = f; ch2Render(); }

// ── Rendu principal ───────────────────────────────────────────────────────
function ch2Render() {
  const rooms = (typeof getChambres === 'function') ? getChambres() : [];
  const canEdit = ch2CanEdit();

  const infos = rooms.map(c => {
    const occ = chOccupants(c);
    const cap = ch2Cap(c);
    return { c, occ, cap, libre: occ.length === 0, complete: occ.length >= cap, sur: occ.length > cap };
  });

  ch2RenderStats(infos);
  ch2RenderFilters(infos);
  ch2RenderGrid(infos, canEdit);
  ch2RenderOccupation(infos);
  ch2RenderEdlHistory();
  ch2RenderPanel(rooms, canEdit);
}

function ch2RenderStats(infos) {
  const el = document.getElementById('chStats');
  if (!el) return;
  const lits = infos.reduce((a, i) => a + i.cap, 0);
  const occ = infos.reduce((a, i) => a + i.occ.length, 0);
  const pmr = infos.filter(i => ch2IsPmr(i.c)).length;
  const tiles = [
    { n: infos.length, l: 'Chambres', c: '#f472b6', ic: CH2_IC.bed },
    { n: occ, l: 'Lits occupés', c: '#10b981', ic: CH2_IC.check },
    { n: Math.max(lits - occ, 0), l: 'Lits libres', c: '#22d3ee', ic: CH2_IC.key },
    { n: pmr, l: 'Chambres PMR', c: '#818cf8', ic: CH2_IC.home }
  ];
  el.innerHTML = tiles.map(t => `
    <div class="ch2-stat" style="--pc:${t.c}">
      <span class="ch2-stat-ico">${ch2Svg(t.ic)}</span>
      <div><div class="ch2-stat-n">${t.n}</div><div class="ch2-stat-l">${t.l}</div></div>
    </div>`).join('');
}

function ch2RenderFilters(infos) {
  const el = document.getElementById('chFilters');
  if (!el) return;
  const defs = [
    { id: 'all',  label: 'Toutes',   dot: '#818cf8', n: infos.length },
    { id: 'occ',  label: 'Occupées', dot: '#f472b6', n: infos.filter(i => !i.libre).length },
    { id: 'free', label: 'Libres',   dot: '#22d3ee', n: infos.filter(i => i.libre).length }
  ];
  el.innerHTML = defs.map(f => `
    <button type="button" class="v2-chip-f${CH2.filter === f.id ? ' on' : ''}" onclick="ch2SetFilter('${f.id}')">
      <span class="dot" style="background:${f.dot}"></span>${f.label}<span class="n">${f.n}</span>
    </button>`).join('');
}

function ch2RoomCard(i, canEdit) {
  const c = i.c;
  const color = i.sur ? '#ef4444' : i.libre ? '#22d3ee' : i.complete ? '#f472b6' : '#f59e0b';
  const statut = i.sur ? 'Sur-occupée'
    : i.libre ? 'Libre'
    : i.complete ? 'Occupée'
    : `${i.cap - i.occ.length} lit(s) libre(s)`;
  const since = ch2Since(c);
  const occRows = i.occ.map(r => {
    const rc = safeColor(r.color, '#22d3ee');
    return `<div class="ch2-occ" onclick="location.href='resident.html?id=${r.id}'" title="Ouvrir la fiche">
      <span class="ch2-occ-av" style="background:${rc}">${initials(r.prenom, r.nom)}</span>
      <div style="min-width:0">
        <div class="ch2-occ-n">${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</div>
        ${since ? `<div class="ch2-occ-d">${since}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  const libreBtn = (i.occ.length < i.cap && canEdit)
    ? `<button type="button" class="ch2-free" onclick="openAssignModal('${c.id}')">${ch2Svg(CH2_IC.plus, 2.4)}Attribuer</button>`
    : (i.occ.length < i.cap ? `<div class="ch2-free" style="cursor:default">Lit disponible</div>` : '');
  const acts = canEdit ? `<div class="ch2-acts">
      <button type="button" class="ch2-act" onclick="openEdlModal('${c.id}')" title="État des lieux">${ch2Svg(CH2_IC.file)}EDL</button>
      <button type="button" class="ch2-act" style="margin-left:auto" onclick="openChambreModal('${c.id}')" title="Modifier">${ch2Svg(CH2_IC.pen)}</button>
      <button type="button" class="ch2-act danger" onclick="deleteChambre('${c.id}')" title="Supprimer">${ch2Svg(CH2_IC.trash)}</button>
    </div>` : '';
  const sel = String(edlChambreId || '') === String(c.id) ? ' sel' : '';
  return `<div class="ch2-room${i.libre ? ' libre' : ''}${sel}" style="--pc:${color}">
    <div class="ch2-room-h">
      <span class="ch2-room-n">${escHtml(c.nom)}</span>
      <span class="ch2-room-u">${escHtml((c.unite || '').trim() || 'Sans unité')}</span>
      <span class="ch2-room-st">${statut}</span>
    </div>
    ${occRows}
    ${libreBtn}
    ${c.notes ? `<div class="ch2-note">${escHtml(c.notes)}</div>` : ''}
    ${acts}
  </div>`;
}

function ch2RenderGrid(infos, canEdit) {
  const el = document.getElementById('chGrid');
  if (!el) return;
  if (!infos.length) {
    el.innerHTML = `<div class="ch2-vide">
      <div class="ch2-vide-t">Aucune chambre</div>
      <div class="ch2-vide-s">Créez vos chambres, ou laissez-les s'importer depuis les fiches résidents.</div>
    </div>`;
    return;
  }
  let shown = infos;
  if (CH2.filter === 'occ') shown = infos.filter(i => !i.libre);
  else if (CH2.filter === 'free') shown = infos.filter(i => i.libre);
  if (!shown.length) {
    el.innerHTML = `<div class="ch2-vide"><div class="ch2-vide-t">Aucune chambre pour ce filtre</div></div>`;
    return;
  }
  const tri = (a, b) => String(a.c.unite || '').localeCompare(String(b.c.unite || ''), 'fr')
    || String(a.c.nom).localeCompare(String(b.c.nom), 'fr', { numeric: true });
  el.innerHTML = shown.slice().sort(tri).map(i => ch2RoomCard(i, canEdit)).join('');
}

function ch2RenderOccupation(infos) {
  const el = document.getElementById('chOccupation');
  if (!el) return;
  const unites = {};
  infos.forEach(i => {
    const u = (i.c.unite || '').trim() || 'Sans unité';
    (unites[u] = unites[u] || []).push(i);
  });
  const noms = Object.keys(unites).sort((a, b) => a.localeCompare(b, 'fr'));
  if (!noms.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune unité</div>'; return; }
  el.innerHTML = noms.map(u => {
    const list = unites[u];
    const cap = list.reduce((a, i) => a + i.cap, 0);
    const occ = list.reduce((a, i) => a + i.occ.length, 0);
    const pct = cap ? Math.round(occ / cap * 100) : 0;
    const c = occ >= cap ? '#f59e0b' : '#10b981';
    return `<div>
      <div class="ch2-occ-h"><span class="ch2-occ-l">${escHtml(u)}</span><span class="ch2-occ-v">${occ} / ${cap}</span></div>
      <div class="ch2-occ-bar"><span style="width:${Math.min(pct, 100)}%;background:${c}"></span></div>
    </div>`;
  }).join('');
}

// Remplace renderEdlHistory() de chambres.js : le rail affiche les derniers
// états des lieux enregistrés, toutes chambres confondues (format maquette).
function ch2RenderEdlHistory() {
  const el = document.getElementById('edlHistory');
  if (!el) return;
  const hist = (typeof getEdl === 'function' ? getEdl() : []).slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 6);
  if (!hist.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun état des lieux enregistré</div>'; return; }
  el.innerHTML = hist.map(e => {
    const entree = e.type === 'entree';
    const c = entree ? '#10b981' : '#f59e0b';
    // Détail des 8 postes. Un relevé antérieur à l'ajout d'un poste n'en
    // porte pas la clé : edlNiveau() renvoie alors « Non évalué ».
    const postes = EDL_ITEMS.map(([k, label]) => {
      const niv = edlNiveau(e, k);
      const nc = (CH2_NIV[niv] || CH2_NIV['Non évalué']).c;
      return `<div class="ch2-edl-p"><span>${escHtml(label)}</span><b style="color:${nc}">${escHtml(niv)}</b></div>`;
    }).join('');
    return `<details class="ch2-edl-d" style="--pc:${c}">
      <summary class="ch2-edl-r">
        <span class="ch2-edl-ico">${ch2Svg(entree ? CH2_IC.in : CH2_IC.out, 2.4)}</span>
        <div style="flex:1;min-width:0">
          <div class="ch2-edl-t">Ch. ${escHtml(e.chambreNom || '—')} · ${entree ? 'Entrée' : 'Sortie'}</div>
          <div class="ch2-edl-m">${escHtml(e.residentName || '—')} · ${e.date ? formatDate(e.date) : '—'}</div>
        </div>
      </summary>
      <div class="ch2-edl-ps">${postes}</div>
      ${e.observations ? `<div class="ch2-edl-obs">${escHtml(e.observations)}</div>` : ''}
    </details>`;
  }).join('');
}
function renderEdlHistory() { ch2RenderEdlHistory(); }

// ── Panneau « État des lieux » interactif ────────────────────────────────
const CH2_EDL = { etats: {}, type: 'entree' };

function ch2SetEdlType(t) { CH2_EDL.type = t; ch2RenderPanel(); }

function ch2CycleItem(k) {
  const cur = CH2_EDL.etats[k] || EDL_NIVEAUX[0];
  const idx = EDL_NIVEAUX.indexOf(cur);
  CH2_EDL.etats[k] = EDL_NIVEAUX[(idx + 1) % EDL_NIVEAUX.length];
  ch2RenderPanel();
}

// openEdlModal() ne s'appuie plus sur une modale : elle sélectionne la chambre
// dans le panneau du bas et l'y amène.
function openEdlModal(id) {
  const c = getChambres().find(x => String(x.id) === String(id));
  if (!c) return;
  edlChambreId = c.id;
  CH2_EDL.etats = {};
  ch2Render();
  document.getElementById('chEdlPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function ch2RenderPanel(roomsArg, canEditArg) {
  const el = document.getElementById('chEdlPanel');
  if (!el) return;
  const rooms = roomsArg || (typeof getChambres === 'function' ? getChambres() : []);
  const canEdit = canEditArg === undefined ? ch2CanEdit() : canEditArg;
  if (!rooms.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';

  let cur = rooms.find(x => String(x.id) === String(edlChambreId));
  if (!cur) { cur = rooms[0]; edlChambreId = cur.id; }

  const items = EDL_ITEMS.map(([k, label]) => {
    const niv = CH2_EDL.etats[k] || EDL_NIVEAUX[0];
    const c = (CH2_NIV[niv] || CH2_NIV['Bon']).c;
    return `<button type="button" class="ch2-item" style="--pc:${c}" onclick="ch2CycleItem('${k}')">
      <span class="ch2-item-ico">${ch2Svg(CH2_IC[CH2_ITEM_IC[k]] || CH2_IC.box)}</span>
      <span style="min-width:0;flex:1">
        <span class="ch2-item-l" style="display:block">${escHtml(label)}</span>
        <span class="ch2-item-s">${niv}</span>
      </span>
    </button>`;
  }).join('');
  // Champs lus par saveEdlEntry() (js/chambres.js) : hors des <button>,
  // un contrôle de formulaire imbriqué dans un bouton n'est pas valide.
  const hidden = EDL_ITEMS.map(([k]) =>
    `<input type="hidden" id="edl_${k}" value="${CH2_EDL.etats[k] || EDL_NIVEAUX[0]}"/>`).join('');

  const nb = n => EDL_ITEMS.filter(([k]) => (CH2_EDL.etats[k] || EDL_NIVEAUX[0]) === n).length;
  const resume = `${nb('Dégradé')} dégradé(s) · ${nb('Moyen')} moyen(s) · ${nb('Bon')} bon(s)`;

  const residents = (typeof residentsList === 'function' ? residentsList() : []).filter(r => r.statut !== 'sorti');
  const dateVal = document.getElementById('edlDate')?.value || (typeof today === 'function' ? today() : '');
  const residentVal = document.getElementById('edlResident')?.value || '';
  const obsVal = document.getElementById('edlObs')?.value || '';

  el.innerHTML = `
    <div class="ch2-panel-h">
      ${ch2Svg(CH2_IC.file)}
      <span class="ch2-panel-t">État des lieux — Chambre ${escHtml(cur.nom)}</span>
      <div class="ch2-seg">
        <button type="button" class="ch2-seg-o${CH2_EDL.type === 'entree' ? ' on' : ''}" onclick="ch2SetEdlType('entree')">Entrée</button>
        <button type="button" class="ch2-seg-o${CH2_EDL.type === 'sortie' ? ' on' : ''}" onclick="ch2SetEdlType('sortie')">Sortie</button>
      </div>
      <select id="edlType" style="display:none">
        <option value="entree"${CH2_EDL.type === 'entree' ? ' selected' : ''}>Entrée</option>
        <option value="sortie"${CH2_EDL.type === 'sortie' ? ' selected' : ''}>Sortie</option>
      </select>
      <span class="ch2-sum">${resume}</span>
      ${canEdit ? `<button type="button" class="ch2-valider" onclick="saveEdlEntry()">${ch2Svg('<polyline points="20 6 9 17 4 12"/>', 2.6)}Valider</button>` : ''}
    </div>
    <div class="ch2-hint">Touchez un poste pour changer son état (${EDL_NIVEAUX.join(' → ')}).</div>
    <div class="ch2-items" id="edlItems">${items}</div>
    <div hidden>${hidden}</div>
    <div class="ch2-panel-form">
      <div>
        <label class="v2-fld-l" for="edlResident">Résident concerné</label>
        <select id="edlResident" class="v2-fld">
          <option value="">— Résident concerné —</option>
          ${residents.map(r => `<option value="${r.id}"${String(r.id) === String(residentVal) ? ' selected' : ''}>${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="v2-fld-l" for="edlDate">Date</label>
        <input type="date" id="edlDate" class="v2-fld" value="${escHtml(dateVal)}"/>
      </div>
      <div style="grid-column:1/-1">
        <label class="v2-fld-l" for="edlObs">Observations</label>
        <textarea id="edlObs" class="v2-fld" rows="2" placeholder="Dégradations constatées, mobilier manquant…">${escHtml(obsVal)}</textarea>
      </div>
    </div>`;
}

// Après enregistrement, chambres.js appelle renderEdlHistory() : on remet
// aussi le panneau à zéro pour la saisie suivante.
const _ch2SaveEdlEntry = saveEdlEntry;
saveEdlEntry = async function () {
  await _ch2SaveEdlEntry();
  CH2_EDL.etats = {};
  ch2Render();
};
