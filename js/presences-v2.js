// ── PRÉSENCES — DESIGN V2 ──
// Reproduit la maquette « Présences (vie quotidienne) » : compteurs du jour,
// feuille de présence (légende + filtres + « Tout présent ») et grille de
// cartes résident dont la carte entière est le bouton de pointage.
// Les données et les actions (pointage, motif, bulk, export) restent celles
// de js/presences.js — ce fichier ne s'occupe que du rendu.

// Palette de la maquette (celle de PRES_STATUTS est calibrée pour le thème clair)
const PRV2_ST = {
  present: { l: 'Présent',    c: '#10b981', i: '<polyline points="20 6 9 17 4 12"/>' },
  absent:  { l: 'Absent',     c: '#ef4444', i: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
  sortie:  { l: 'Sortie',     c: '#f59e0b', i: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' },
  unknown: { l: 'Non pointé', c: '#7f93b3', i: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' }
};
const PRV2_ORDRE = ['present', 'absent', 'sortie', 'unknown'];

let _prv2Filtre = 'all';

// ── UNITÉS ───────────────────────────────────────────────────────────────
// Le résident ne porte pas d'unité : c'est la CHAMBRE qui la porte
// (table `chambres`, colonne `unite`). On joint donc r.chambre au nom de
// chambre du catalogue — même règle que rv2Unite() sur la fiche résident.
// Si la chambre n'est pas au catalogue, on n'affiche AUCUNE unité.
let _prv2Chambres = [];
let _prv2Unite = 'all';

function prv2UniteDe(r) {
  const nom = (r.chambre || '').trim().toLowerCase();
  if (!nom || !_prv2Chambres.length) return '';
  const ch = _prv2Chambres.find(c => (c.nom || '').trim().toLowerCase() === nom);
  return (ch && ch.unite) ? String(ch.unite).trim() : '';
}

// Lecture tolérante : table absente / couche non chargée → [] + console.warn,
// la page reste utilisable, le rang de filtres reste simplement masqué.
async function prv2LoadChambres() {
  if (typeof sbGetChambres !== 'function') {
    console.warn('[présences] catalogue des chambres indisponible — filtre par unité désactivé');
    return;
  }
  try {
    _prv2Chambres = (await sbGetChambres()) || [];
  } catch (e) {
    _prv2Chambres = [];
    console.warn('[présences] lecture des chambres impossible — filtre par unité désactivé', e);
  }
  // Le rendu principal a pu avoir lieu avant l'arrivée du catalogue.
  if (_presResidentsCache.length && document.getElementById('presenceTable')) prv2RenderTable();
}

function prv2SetUnite(u) {
  _prv2Unite = u;
  prv2RenderTable();
}

// Chips construits sur les unités RÉELLEMENT présentes parmi les résidents
// affichés ; masqués tant qu'aucune unité n'est connue.
function prv2RenderUnites(lignes) {
  const bar = document.getElementById('presUnitesBar');
  const box = document.getElementById('presUnites');
  if (!bar || !box) return;

  const n = {};
  lignes.forEach(l => { if (l.unite) n[l.unite] = (n[l.unite] || 0) + 1; });
  const unites = Object.keys(n).sort((a, b) => a.localeCompare(b, 'fr'));

  if (!unites.length) {
    bar.hidden = true;
    box.innerHTML = '';
    if (_prv2Unite !== 'all') _prv2Unite = 'all';
    return;
  }
  // Une unité qui disparaît (changement de jour) ne doit pas figer un filtre vide.
  if (_prv2Unite !== 'all' && unites.indexOf(_prv2Unite) === -1) _prv2Unite = 'all';

  bar.hidden = false;
  const defs = [{ id: 'all', l: 'Toutes les unités', n: lignes.length }]
    .concat(unites.map(u => ({ id: u, l: u, n: n[u] })));
  box.innerHTML = defs.map(f => {
    const on = _prv2Unite === f.id;
    return `<button type="button" class="pr2-uchip${on ? ' on' : ''}" aria-pressed="${on}"
      data-u="${escAttr(f.id)}" onclick="prv2SetUnite(this.dataset.u)">${escHtml(f.l)}<span class="n">${f.n}</span></button>`;
  }).join('');
}

function _prv2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2.4}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// Résidents actifs + statut effectif du jour (pointage manuel, sinon absence
// planifiée par la semaine type, sinon « non pointé »).
function prv2Lignes() {
  const dateStr = getDateStr();
  const presences = getPresencesForDate(dateStr);
  return _presResidentsCache.filter(r => r.statut !== 'sorti').map(r => {
    const manual = presences[r.id];
    const plan = !manual ? getPlanningAbsenceJour(r, dateStr) : null;
    const key = manual ? manual.statut : (plan ? 'sortie' : 'unknown');
    return {
      r,
      plan,
      pointe: !!manual && manual.statut !== 'unknown',
      motif: (manual && manual.motif) ? manual.motif : '',
      unite: prv2UniteDe(r),
      key: PRV2_ST[key] ? key : 'unknown'
    };
  });
}

// ── Libellés de date : bandeau du haut (court) + feuille (long) ──────────
function prv2Dates() {
  const d = new Date(getDateStr() + 'T00:00:00');
  const nav = document.getElementById('presDateNav');
  if (nav) {
    nav.textContent = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  const lbl = document.getElementById('presenceDateLabel');
  if (lbl) {
    const t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    lbl.textContent = t.charAt(0).toUpperCase() + t.slice(1);
  }
}

// Le champ date natif est masqué (la maquette n'affiche qu'un libellé) :
// le clic sur le libellé ouvre le sélecteur, avec repli sur un focus.
function prv2PickDate() {
  const inp = document.getElementById('presenceDate');
  if (!inp) return;
  if (typeof inp.showPicker === 'function') { try { inp.showPicker(); return; } catch (e) { /* repli */ } }
  inp.classList.remove('pr2-date-hidden');
  inp.focus();
}

// ── Compteurs ────────────────────────────────────────────────────────────
function prv2Stats() {
  const n = { present: 0, absent: 0, sortie: 0, unknown: 0 };
  prv2Lignes().forEach(l => { n[l.key]++; });
  const ids = { present: 'countPresent', absent: 'countAbsent', sortie: 'countSortie', unknown: 'countUnknown' };
  Object.keys(ids).forEach(k => {
    const el = document.getElementById(ids[k]);
    if (el) el.textContent = n[k];
  });
  return n;
}

// ── Filtres (état de pointage) ───────────────────────────────────────────
function prv2SetFiltre(k) {
  _prv2Filtre = k;
  prv2RenderTable();
}

function prv2RenderFiltres(lignes) {
  const bar = document.getElementById('presFiltres');
  if (!bar) return;
  const n = { present: 0, absent: 0, sortie: 0, unknown: 0 };
  lignes.forEach(l => { n[l.key]++; });
  const defs = [{ id: 'all', l: 'Tous', c: '#818cf8', n: lignes.length }]
    .concat(PRV2_ORDRE.map(k => ({ id: k, l: PRV2_ST[k].l, c: PRV2_ST[k].c, n: n[k] })));
  bar.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${_prv2Filtre === f.id ? ' on' : ''}" onclick="prv2SetFiltre('${f.id}')">
      <span class="dot" style="background:${f.c}"></span>${escHtml(f.l)}<span class="n">${f.n}</span>
    </button>`).join('');
}

// ── Grille de cartes ─────────────────────────────────────────────────────
function prv2RenderTable() {
  const el = document.getElementById('presenceTable');
  if (!el) return;
  const lignes = prv2Lignes();
  prv2RenderUnites(lignes);
  // Les deux filtres se combinent : l'unité restreint d'abord, les compteurs
  // d'état portent donc sur l'unité sélectionnée.
  const dansUnite = _prv2Unite === 'all' ? lignes : lignes.filter(l => l.unite === _prv2Unite);
  prv2RenderFiltres(dansUnite);

  if (!lignes.length) {
    el.innerHTML = `<div class="v2-blk-vide" style="text-align:center;padding:26px 0">
      Aucun résident actif · <a href="residents.html" style="color:var(--v2-indigo-light);font-weight:600">Ajouter des résidents</a></div>`;
    return;
  }

  const vues = _prv2Filtre === 'all' ? dansUnite : dansUnite.filter(l => l.key === _prv2Filtre);
  const isFuture = getDateStr() > today();

  const cartes = vues.map(l => {
    const r = l.r, st = PRV2_ST[l.key];
    const nom = `${r.prenom || ''} ${r.nom || ''}`.trim();
    const col = safeColor(r.color, '#6b7280');
    const av = r.photo
      ? `<span class="pr2-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></span>`
      : `<span class="pr2-av" style="background:${col}">${initials(r.prenom, r.nom)}</span>`;
    // « Ch. 04 · Unité A » — l'unité n'apparaît que si la chambre est au catalogue.
    const meta = `Ch. ${escHtml(r.chambre || '—')}${l.unite ? ' · ' + escHtml(l.unite) : ''}`;
    const plan = l.plan
      ? `<span class="pr2-plan" title="${escAttr(l.plan.label)}">📅 ${escHtml(l.plan.label)}${l.plan.debut ? ' · ' + escHtml(l.plan.debut) : ''}</span>`
      : '';
    const motif = l.motif ? `<div class="pr2-note" title="${escAttr(l.motif)}">${escHtml(l.motif)}</div>` : '';

    return `<div class="pr2-card${l.pointe ? '' : ' off'}${isFuture ? ' lock' : ''}" role="button" tabindex="0"
      data-rid="${escAttr(String(r.id))}" style="--sc:${st.c}"
      aria-label="${escAttr(nom)} — ${st.l}${l.motif ? ', motif : ' + escAttr(l.motif) : ''}. Activer pour changer l'état."
      onpointerdown="presTileDown(event,'${r.id}')" onpointerup="presTileUp()" onpointerleave="presTileUp()" onpointercancel="presTileUp()"
      onclick="presTileClick('${r.id}')"
      onkeydown="if((event.key==='Enter'||event.key===' ')&&event.target===this){event.preventDefault();presTileKey('${r.id}')}"
      oncontextmenu="event.preventDefault();presOpenMotif('${r.id}')">
      <span class="pr2-card-bar"></span>
      <button type="button" class="pr2-edit" title="Motif / pointage détaillé" aria-label="Saisir un motif pour ${escAttr(nom)}"
        onclick="event.stopPropagation();presOpenMotif('${r.id}')" onpointerdown="event.stopPropagation()">${_prv2Svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 2)}</button>
      <div class="pr2-head">
        ${av}
        <span class="pr2-id"><span class="pr2-nom">${escHtml(nom) || '—'}</span><span class="pr2-meta">${meta}</span></span>
      </div>
      <div class="pr2-st">${_prv2Svg(st.i, 2.6)}${st.l}</div>
      ${plan}
      ${motif}
    </div>`;
  }).join('');

  const vide = !vues.length
    ? `<div class="v2-blk-vide" style="text-align:center;padding:22px 0">Aucun résident dans ce filtre.</div>`
    : '';

  // innerHTML détruit l'élément focalisé : on mémorise la carte active
  // (navigation clavier) pour lui rendre le focus après re-rendu.
  const act = document.activeElement;
  const actCard = (act && act.closest) ? act.closest('.pr2-card') : null;
  const actRid = actCard ? actCard.getAttribute('data-rid') : null;
  const actEdit = !!(actRid && act.classList && act.classList.contains('pr2-edit'));

  el.innerHTML = `<div class="pr2-hint">Astuce : touchez une carte pour changer le statut (Présent → Absent → Sortie → Non pointé) · appui long, clic droit ou ✎ pour saisir un motif.</div>
    <div class="pr2-grid">${cartes}</div>${vide}`;

  if (actRid) {
    const card = el.querySelector(`.pr2-card[data-rid="${actRid}"]`);
    const cible = card && actEdit ? card.querySelector('.pr2-edit') : card;
    if (cible && cible.focus) cible.focus();
  }
}

// ── Choix segmenté de la modale motif (gabarit .v2-seg) ─────────────────
function prv2MotifSeg() {
  const seg = document.getElementById('motifSeg');
  if (!seg) return;
  seg.innerHTML = PRV2_ORDRE.map(k => {
    const st = PRV2_ST[k], on = _presMotifSel === k;
    return `<button type="button" class="v2-seg-o${on ? ' on' : ''}" aria-pressed="${on}"
      onclick="presPickMotifStatut('${k}')" style="--mc:${st.c}${on ? ';color:' + st.c : ''}">${st.l}</button>`;
  }).join('');
}

// ── Rendu complet (appelé par les fonctions historiques) ────────────────
function prv2Render() {
  prv2Dates();
  prv2Stats();
  prv2RenderTable();
}

// Le catalogue des chambres est une lecture annexe : elle ne doit ni retarder
// ni bloquer la feuille de présence, d'où ce chargement indépendant.
document.addEventListener('DOMContentLoaded', () => { prv2LoadChambres(); });
