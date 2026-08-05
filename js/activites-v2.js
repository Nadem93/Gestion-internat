// ── ACTIVITÉS ÉDUCATIVES — DESIGN V2 ──────────────────────────────────
// Reproduit la maquette « Activités éducatives (vie quotidienne) » :
// 4 tuiles KPI, chips de catégorie, grille d'activités 2 colonnes + rail
// (planning hebdomadaire / taux de participation), puis bandeau bas
// « Inscrits » + « Bilans annuels ».
// Les données et toutes les actions restent celles de js/activites.js.

let AC2_SEL = null;   // activité sélectionnée pour le bloc « Inscrits »

// Icônes SVG par catégorie (le catalogue métier vit dans ACT_CATEGORIES)
const AC2_IC = {
  sportive:    '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20M2 12h20M5 5l14 14M19 5 5 19"/>',
  creative:    '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.6H16c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z"/>',
  culturelle:  '<path d="M2 20h20"/><path d="M4 20V8l8-5 8 5v12"/><path d="M9 20v-6h6v6"/>',
  scolaire:    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  autonomie:   '<path d="M3 6h18l-1.5 13a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8z"/><path d="M8 6V4a4 4 0 0 1 8 0v2"/>',
  sortie:      '<path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8c0 .4.1.8.2 1.2C2.5 16.3 3 18 3 18h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  citoyennete: '<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  autre:       '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
};
const AC2_IC_KPI = {
  activity: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
  users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  star:     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  bus:      AC2_IC.sortie,
  doc:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
};
const AC2_JOURS_COURTS = { Lundi: 'Lun', Mardi: 'Mar', Mercredi: 'Mer', Jeudi: 'Jeu', Vendredi: 'Ven', Samedi: 'Sam', Dimanche: 'Dim', Ponctuel: 'Ponct.' };

function _ac2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function _ac2Cat(a) { return ACT_CATEGORIES[a.categorie] || ACT_CATEGORIES.autre; }
function _ac2Ico(key) { return AC2_IC[key] || AC2_IC.autre; }
function _ac2CanEdit() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  return Auth.isAdmin() || ['admin', 'moderator', 'superadmin'].includes(s?.role)
    || ((typeof canEditResidents === 'function') ? canEditResidents(s?.userId) : Auth.isAdmin());
}
function _ac2Actives() { return getActivites().filter(a => a.actif !== false); }
function _ac2Horaire(a) {
  if (!a.heureDebut) return '';
  return a.heureDebut + (a.heureFin ? '–' + a.heureFin : '');
}
function _ac2FiltreCat() { return document.getElementById('aFilterCat')?.value || ''; }
function _ac2FiltreJour() { return document.getElementById('aFilterJour')?.value || ''; }

// ── RENDU PRINCIPAL ───────────────────────────────────────────────────
function ac2Render() {
  const all = getActivites();
  const fCat = _ac2FiltreCat();
  const fJour = _ac2FiltreJour();
  let list = all;
  if (fCat) list = list.filter(a => a.categorie === fCat);
  if (fJour) list = list.filter(a => a.jour === fJour);
  list = [...list].sort((a, b) => (b.actif !== false ? 1 : 0) - (a.actif !== false ? 1 : 0)
    || (a.nom || '').localeCompare(b.nom || '', 'fr'));

  // L'activité sélectionnée doit rester visible ; sinon on prend la première.
  if (!list.some(a => String(a.id) === String(AC2_SEL))) AC2_SEL = list[0]?.id || null;

  ac2Stats(all);
  ac2Chips(all, fCat);
  ac2Grille(list);
  ac2Planning(all, fJour);
  ac2Participation(all);
  ac2Inscrits();
  ac2Bilans(all);
  ac2EnsureSeance();   // recharge le pointage si l'activité sélectionnée a changé
}

// ── TUILES KPI ────────────────────────────────────────────────────────
function ac2Stats(all) {
  const el = document.getElementById('aStats');
  if (!el) return;
  const actives = all.filter(a => a.actif !== false);
  const inscriptions = actResidents().reduce((n, r) => n + (r.activites || []).filter(i => i.statut === 'active').length, 0);
  const cats = new Set(actives.map(a => a.categorie || 'autre'));
  const sorties = actives.filter(a => a.categorie === 'sortie').length;
  const tuiles = [
    { n: actives.length, l: 'Activités au catalogue', c: '#818cf8', ico: AC2_IC_KPI.activity },
    { n: inscriptions, l: 'Inscriptions actives', c: '#16a34a', ico: AC2_IC_KPI.users },
    { n: cats.size, l: 'Catégories', c: '#db2777', ico: AC2_IC_KPI.star },
    { n: sorties, l: 'Sorties programmées', c: '#0d9488', ico: AC2_IC_KPI.bus }
  ];
  el.innerHTML = tuiles.map(t => `
    <div class="dc-kpi" style="--dc-c:${t.c}">
      <div class="dc-kpi-top">
        <span class="dc-kpi-label">${t.l}</span>
        <span class="dc-kpi-ico" style="color:${t.c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">${t.ico}</svg></span>
      </div>
      <div class="dc-kpi-val" style="color:${t.c}">${t.n}</div>
    </div>`).join('');
}

// ── CHIPS DE CATÉGORIE ────────────────────────────────────────────────
function ac2Chips(all, fCat) {
  const el = document.getElementById('aChips');
  if (!el) return;
  const presentes = Object.keys(ACT_CATEGORIES).filter(k => all.some(a => (a.categorie || 'autre') === k));
  const chip = (id, label, c, on) =>
    `<button type="button" class="v2-chip-f${on ? ' on' : ''}" onclick="ac2SetCat('${id}')">
      <span class="dot" style="background:${c}"></span>${escHtml(label)}
    </button>`;
  el.innerHTML = chip('', 'Toutes', '#818cf8', !fCat)
    + presentes.map(k => chip(k, ACT_CATEGORIES[k].label, ACT_CATEGORIES[k].color, fCat === k)).join('');
}
function ac2SetCat(id) {
  const sel = document.getElementById('aFilterCat');
  if (sel) sel.value = (sel.value === id) ? '' : id;
  ac2Render();
}
function ac2SetJour(jour) {
  const sel = document.getElementById('aFilterJour');
  if (sel) sel.value = (sel.value === jour) ? '' : jour;
  ac2Render();
}
function ac2Select(id) { AC2_SEL = id; ac2Render(); }

// ── GRILLE DES ACTIVITÉS ──────────────────────────────────────────────
function ac2Grille(list) {
  const el = document.getElementById('aGrid');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="ac2-vide">
      <div class="v2-blk-t" style="margin-bottom:6px">Aucune activité</div>
      <div class="v2-blk-vide">Créez le catalogue des activités éducatives proposées aux résidents.</div>
    </div>`;
    return;
  }
  el.innerHTML = list.map(ac2Carte).join('');
}

function ac2Carte(a) {
  const c = _ac2Cat(a);
  const inscrits = actInscriptions(a.id).length;
  const max = a.placesMax > 0 ? a.placesMax : 0;
  const plein = max > 0 && inscrits >= max;
  const pct = max > 0 ? Math.min(100, Math.round(inscrits / max * 100)) : 0;
  const meta = [_ac2Horaire(a), a.lieu, a.animateur].filter(Boolean);
  const canEdit = _ac2CanEdit();
  const bilanFait = !!(a.bilansAnnuels || {})[new Date().getFullYear()];
  const stop = 'event.stopPropagation();';
  return `<article class="ac2-card${String(a.id) === String(AC2_SEL) ? ' on' : ''}${a.actif === false ? ' off' : ''}"
      style="--pc:${c.color}" onclick="ac2Select('${a.id}')" tabindex="0">
    <div class="ac2-card-h">
      <span class="ac2-card-ico">${_ac2Svg(_ac2Ico(a.categorie))}</span>
      <div style="flex:1;min-width:0">
        <div class="ac2-card-n">${escHtml(a.nom || 'Activité')}</div>
        <div class="ac2-card-c">${escHtml(c.label)}${a.actif === false ? ' · suspendue' : ''}</div>
      </div>
      ${a.jour ? `<span class="dc-badge dc-b-indigo">${escHtml(AC2_JOURS_COURTS[a.jour] || a.jour)}</span>` : ''}
    </div>
    ${meta.length ? `<div class="ac2-card-m">${meta.map(m => `<span>${escHtml(m)}</span>`).join('<span class="ac2-sep">·</span>')}</div>` : ''}
    <div>
      <div class="ac2-card-pl">
        <span>Participants</span>
        <span class="v">${inscrits}${max ? ' / ' + max : ''}${plein ? ' · complet' : ''}</span>
      </div>
      <div class="v2-prog" style="height:6px">
        <span style="width:${max ? pct : (inscrits ? 100 : 0)}%;background:${plein ? '#ef4444' : c.color}"></span>
      </div>
    </div>
    <div class="ac2-acts">
      <button type="button" class="ac2-act" onclick="${stop}openParticipantsModal('${a.id}')">
        ${_ac2Svg(AC2_IC_KPI.users)}Participants
      </button>
      <button type="button" class="ac2-act${bilanFait ? ' ok' : ''}" onclick="${stop}openBilanAnnuelModal('${a.id}')" title="Bilan annuel">
        ${_ac2Svg(AC2_IC_KPI.doc)}Bilan${bilanFait ? ' ✓' : ''}
      </button>
      ${canEdit ? `
      <button type="button" class="ac2-act" style="margin-left:auto" onclick="${stop}toggleActiviteActif('${a.id}')">
        ${a.actif === false ? 'Réactiver' : 'Suspendre'}
      </button>
      <button type="button" class="ac2-act ico" title="Modifier" onclick="${stop}openActiviteModal('${a.id}')">
        ${_ac2Svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>')}
      </button>
      <button type="button" class="ac2-act ico danger" title="Supprimer" onclick="${stop}deleteActivite('${a.id}')">
        ${_ac2Svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>')}
      </button>` : ''}
    </div>
  </article>`;
}

// ── RAIL — PLANNING HEBDOMADAIRE ──────────────────────────────────────
function ac2Planning(all, fJour) {
  const el = document.getElementById('aPlanning');
  if (!el) return;
  const actives = all.filter(a => a.actif !== false);
  const jours = ACT_JOURS.filter(j => j !== 'Ponctuel');
  const ponct = actives.filter(a => a.jour === 'Ponctuel' || !a.jour);
  const lignes = jours.map(j => ({ jour: j, list: actives.filter(a => a.jour === j) }));
  if (ponct.length) lignes.push({ jour: 'Ponctuel', list: ponct });
  el.innerHTML = lignes.map(l => `
    <button type="button" class="ac2-pl${fJour === l.jour ? ' on' : ''}" onclick="ac2SetJour('${l.jour}')">
      <span class="ac2-pl-j">${AC2_JOURS_COURTS[l.jour] || l.jour}</span>
      <span class="ac2-pl-d">${l.list.map(a => `<span class="dot" style="background:${_ac2Cat(a).color}"></span>`).join('')}</span>
      <span class="ac2-pl-n">${l.list.length ? l.list.length + ' act.' : '—'}</span>
    </button>`).join('');
}

// ── RAIL — TAUX DE PARTICIPATION (inscrits / places, par catégorie) ───
function ac2Participation(all) {
  const el = document.getElementById('aPartic');
  if (!el) return;
  const actives = all.filter(a => a.actif !== false);
  const cats = Object.keys(ACT_CATEGORIES).filter(k => actives.some(a => (a.categorie || 'autre') === k));
  if (!cats.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune activité au catalogue.</div>'; return; }
  el.innerHTML = cats.map(k => {
    const list = actives.filter(a => (a.categorie || 'autre') === k);
    const inscrits = list.reduce((n, a) => n + actInscriptions(a.id).length, 0);
    const places = list.reduce((n, a) => n + (a.placesMax > 0 ? a.placesMax : 0), 0);
    const pct = places > 0 ? Math.min(100, Math.round(inscrits / places * 100)) : null;
    const c = ACT_CATEGORIES[k].color;
    return `<div>
      <div class="ac2-pt-h">
        <span class="ac2-pt-l"><span class="dot" style="background:${c}"></span>${escHtml(ACT_CATEGORIES[k].label)}</span>
        <span class="ac2-pt-v">${pct === null ? inscrits + ' inscrits' : pct + '%'}</span>
      </div>
      <div class="v2-prog" style="height:6px"><span style="width:${pct === null ? 0 : pct}%;background:${c}"></span></div>
    </div>`;
  }).join('');
}

// ── BAS DE PAGE — INSCRITS DE L'ACTIVITÉ SÉLECTIONNÉE ─────────────────
function ac2Inscrits() {
  const head = document.getElementById('aInscritsTitre');
  const meta = document.getElementById('aInscritsMeta');
  const el = document.getElementById('aInscrits');
  if (!el) return;
  const a = getActivites().find(x => String(x.id) === String(AC2_SEL));
  if (!a) {
    if (head) head.textContent = 'Inscrits';
    if (meta) meta.textContent = '';
    el.innerHTML = '<div class="v2-blk-vide">Sélectionnez une activité pour voir ses inscrits.</div>';
    return;
  }
  const inscrits = actInscriptions(a.id);
  const horaire = [AC2_JOURS_COURTS[a.jour] || a.jour, _ac2Horaire(a)].filter(Boolean).join(' ');
  if (head) head.textContent = `Inscrits — ${a.nom || 'Activité'}${horaire ? ' (' + horaire + ')' : ''}`;
  if (meta) meta.textContent = inscrits.length + (a.placesMax > 0 ? ' / ' + a.placesMax : '');
  ac2PointageBar(inscrits);
  if (!inscrits.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun résident inscrit pour le moment.</div>';
    return;
  }
  el.innerHTML = inscrits.map(({ resident: r, inscription: i }) => {
    const color = safeColor(r.color, '#6366f1');
    const nom = `${r.prenom || ''} ${r.nom || ''}`.trim();
    const nb = (i.bilans || []).length;
    const p = _apCache[r.id];
    const st = AP_STATUTS[p && p.statut] || AP_STATUTS.unknown;
    const note = (p && p.note) ? p.note : '';
    const rid = escAttr(String(r.id));
    return `<div class="ac2-ins${p ? '' : ' nopt'}" style="--sc:${st.color}">
      <a class="ac2-ins-lien" href="resident.html?id=${encodeURIComponent(r.id)}">
        <span class="ac2-ins-av" style="background:${color}">${initials(r.prenom, r.nom)}</span>
        <span class="ac2-ins-n">${escHtml(nom)}</span>
      </a>
      <span class="dc-badge ${nb ? 'dc-b-green' : 'dc-b-gray'}"><span class="d"></span>${nb ? nb + ' bilan' + (nb > 1 ? 's' : '') : 'Sans bilan'}</span>
      <button type="button" class="ac2-ins-p" onclick="ac2CyclePresence('${rid}')"
        title="Cliquer pour changer le statut de présence"
        aria-label="${escAttr(nom)} — ${st.label}. Cliquer pour changer.">
        <span class="ic">${st.icon}</span>${st.label}
      </button>
      <button type="button" class="ac2-ins-e" onclick="ac2OpenPointage('${rid}')"
        title="Statut détaillé et note" aria-label="Note de pointage pour ${escAttr(nom)}">✎</button>
      ${note ? `<div class="ac2-ins-note" title="${escAttr(note)}">${escHtml(note)}</div>` : ''}
    </div>`;
  }).join('');
}

// ── POINTAGE DE SÉANCE (table activite_presences) ─────────────────────
// L'inscription (residents.activites) dit qui est attendu ; ces statuts
// disent qui était réellement là, séance par séance.
const AP_STATUTS = {
  present: { label: 'Présent',    icon: '✓', color: '#10b981' },
  excuse:  { label: 'Excusé',     icon: '~', color: '#f59e0b' },
  absent:  { label: 'Absent',     icon: '✕', color: '#ef4444' },
  unknown: { label: 'Non pointé', icon: '·', color: '#8095b4' }
};
const AP_CYCLE = { unknown: 'present', present: 'excuse', excuse: 'absent', absent: 'unknown' };

let _apCache = {};        // { residentId: { statut, note } }
let _apLoadedKey = null;  // 'activiteId|date' déjà chargé
let _apLoadSeq = 0;

function ac2SeanceDate() {
  const el = document.getElementById('aSeanceDate');
  return (el && el.value) || today();
}
function _apKey() { return String(AC2_SEL) + '|' + ac2SeanceDate(); }

// Charge la séance si (activité, date) a changé. La lecture ne jette jamais :
// tant que migration-presences-activite.sql n'est pas exécutée, elle renvoie
// [] et la page affiche simplement « Non pointé » partout.
async function ac2EnsureSeance(force) {
  if (!AC2_SEL) { _apCache = {}; _apLoadedKey = null; return; }
  const key = _apKey();
  if (!force && key === _apLoadedKey) return;
  const seq = ++_apLoadSeq;
  const rows = await sbGetPresencesActivite(AC2_SEL, ac2SeanceDate());
  if (seq !== _apLoadSeq) return;
  const map = {};
  rows.forEach(p => { map[p.residentId] = { statut: p.statut, note: p.note || '' }; });
  _apCache = map;
  _apLoadedKey = key;
  ac2Inscrits();
}

function ac2SeanceDateChange() { _apLoadedKey = null; ac2EnsureSeance(true); }

// Bandeau de comptage au-dessus de la liste des inscrits.
function ac2PointageBar(inscrits) {
  const el = document.getElementById('aPointageBar');
  if (!el) return;
  if (!inscrits.length) { el.innerHTML = ''; return; }
  const n = { present: 0, excuse: 0, absent: 0, unknown: 0 };
  inscrits.forEach(({ resident: r }) => {
    const p = _apCache[r.id];
    n[(p && AP_STATUTS[p.statut]) ? p.statut : 'unknown']++;
  });
  el.innerHTML = ['present', 'excuse', 'absent', 'unknown'].map(k =>
    `<span class="ac2-pt-c" style="--sc:${AP_STATUTS[k].color}">
      <span class="ic">${AP_STATUTS[k].icon}</span>${n[k]} ${escHtml(AP_STATUTS[k].label.toLowerCase())}
    </span>`).join('')
    + `<button type="button" class="ac2-act" style="margin-left:auto" onclick="ac2MarquerTousPresents()">Tous présents</button>`;
}

// Écriture optimiste : on peint le nouveau statut tout de suite, et on
// revient à l'état précédent si la base refuse (table absente, RLS…).
async function ac2SetPresence(residentId, statut, note) {
  const activiteId = AC2_SEL;
  const date = ac2SeanceDate();
  const prev = _apCache[residentId];
  if (statut === 'unknown') delete _apCache[residentId];
  else _apCache[residentId] = { statut, note: note !== undefined ? note : (prev ? prev.note : '') };
  ac2Inscrits();
  try {
    if (statut === 'unknown') await sbDeletePresenceActivite(activiteId, residentId, date);
    else await sbSetPresenceActivite(activiteId, residentId, date, statut, note);
  } catch (e) {
    console.error('[activite_presences] écriture', e);
    if (prev) _apCache[residentId] = prev; else delete _apCache[residentId];
    ac2Inscrits();
    toast(`Pointage non enregistré : exécutez ${AP_SQL_FILE}`, 'error');
    return;
  }
  if (typeof auditLog === 'function') {
    const a = getActivites().find(x => String(x.id) === String(activiteId));
    auditLog('activite_presence', `Pointage ${statut} — ${(a && a.nom) || ''} (${date})`);
  }
}

function ac2CyclePresence(residentId) {
  const cur = _apCache[residentId];
  const next = AP_CYCLE[cur ? cur.statut : 'unknown'] || 'present';
  ac2SetPresence(residentId, next);
}

async function ac2MarquerTousPresents() {
  const a = getActivites().find(x => String(x.id) === String(AC2_SEL));
  if (!a) return;
  const aPointer = actInscriptions(a.id).filter(({ resident: r }) => !_apCache[r.id]);
  if (!aPointer.length) { toast('Tous les inscrits sont déjà pointés'); return; }
  for (const { resident: r } of aPointer) await ac2SetPresence(r.id, 'present');
}

// ── MODALE POINTAGE (statut détaillé + note) ──────────────────────────
let _apModalRid = null, _apModalStatut = 'present';

function ac2OpenPointage(residentId) {
  const r = residentsList().find(x => String(x.id) === String(residentId));
  const a = getActivites().find(x => String(x.id) === String(AC2_SEL));
  if (!r || !a) return;
  _apModalRid = String(residentId);
  const cur = _apCache[_apModalRid];
  _apModalStatut = cur ? cur.statut : 'present';
  document.getElementById('apTitle').textContent = `${r.prenom || ''} ${r.nom || ''}`.trim() || 'Pointage';
  document.getElementById('apSubtitle').textContent =
    `${a.nom || 'Activité'} — séance du ${formatDate(ac2SeanceDate())}`;
  document.getElementById('apNote').value = cur ? (cur.note || '') : '';
  ac2RenderPointageSeg();
  openModal('modalPointageSeance');
}

function ac2RenderPointageSeg() {
  const el = document.getElementById('apSeg');
  if (!el) return;
  el.innerHTML = ['present', 'excuse', 'absent'].map(k => {
    const st = AP_STATUTS[k];
    const on = _apModalStatut === k;
    return `<button type="button" class="ac2-seg-b${on ? ' on' : ''}" style="--sc:${st.color}"
      aria-pressed="${on}" onclick="ac2PickStatut('${k}')">
      <span class="ic">${st.icon}</span>${st.label}
    </button>`;
  }).join('');
}
function ac2PickStatut(k) { _apModalStatut = k; ac2RenderPointageSeg(); }

async function ac2SavePointage() {
  if (!_apModalRid) return;
  const note = document.getElementById('apNote').value.trim();
  closeModal('modalPointageSeance');
  await ac2SetPresence(_apModalRid, _apModalStatut, note);
}

async function ac2ClearPointage() {
  if (!_apModalRid) return;
  closeModal('modalPointageSeance');
  await ac2SetPresence(_apModalRid, 'unknown');
}

// Initialisation du sélecteur de date : appelée après le premier rendu.
function ac2InitSeance() {
  const el = document.getElementById('aSeanceDate');
  if (!el || el.dataset.apInit) return;
  el.dataset.apInit = '1';
  if (!el.value) el.value = today();
  el.addEventListener('change', ac2SeanceDateChange);
  ac2EnsureSeance(true);
}
document.addEventListener('DOMContentLoaded', () => setTimeout(ac2InitSeance, 0));

// ── BAS DE PAGE — BILANS ANNUELS ──────────────────────────────────────
function ac2Bilans(all) {
  const el = document.getElementById('aBilans');
  if (!el) return;
  const annee = new Date().getFullYear();
  const actives = all.filter(a => a.actif !== false);
  if (!actives.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune activité au catalogue.</div>'; return; }
  el.innerHTML = actives.map(a => {
    const b = (a.bilansAnnuels || {})[annee];
    const st = b ? { l: 'Rédigé', c: '#10b981' } : { l: 'À faire', c: '#ef4444' };
    return `<button type="button" class="ac2-bi" onclick="openBilanAnnuelModal('${a.id}')">
      <span class="dot" style="background:${_ac2Cat(a).color}"></span>
      <span style="flex:1;min-width:0;text-align:left">
        <span class="ac2-bi-n">${escHtml(a.nom || 'Activité')}</span>
        <span class="ac2-bi-s">${annee}${b && b.auteur ? ' · ' + escHtml(b.auteur) : ''}</span>
      </span>
      <span class="dc-badge ${b ? 'dc-b-green' : 'dc-b-red'}"><span class="d"></span>${st.l}</span>
    </button>`;
  }).join('');
}

// ── MODALE PARTICIPANTS — rendu sombre (remplace la version claire) ────
function ac2ParticipantsList(inscrits, activite) {
  const box = document.getElementById('pmList');
  const stats = document.getElementById('pmStats');
  const totalBilans = inscrits.reduce((n, { inscription: i }) => n + (i.bilans || []).length, 0);
  const places = activite?.placesMax || 0;
  const plein = places > 0 && inscrits.length >= places;

  if (stats) stats.innerHTML = `
    <div class="ac2-pm-stats">
      <div class="ac2-pm-stat" style="--pc:#818cf8"><div class="n">${inscrits.length}</div><div class="l">Inscrits</div></div>
      <div class="ac2-pm-stat" style="--pc:#10b981"><div class="n">${totalBilans}</div><div class="l">Bilans</div></div>
      <div class="ac2-pm-stat" style="--pc:${plein ? '#ef4444' : '#22d3ee'}"><div class="n">${places > 0 ? inscrits.length + '/' + places : '∞'}</div><div class="l">Places</div></div>
    </div>`;

  if (!box) return;
  if (!inscrits.length) {
    box.innerHTML = '<div class="v2-blk-vide" style="text-align:center;padding:14px 0">Aucun résident inscrit pour le moment.</div>';
    return;
  }
  box.innerHTML = `<div class="ac2-pm-list">${inscrits.map(({ resident: r, inscription: i }) => {
    const bilans = (i.bilans || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''));
    const last = bilans[0];
    const nb = bilans.length;
    const color = safeColor(r.color, '#6366f1');
    const nom = `${r.prenom || ''} ${r.nom || ''}`.trim();
    const av = r.photo
      ? `<img class="ac2-pm-av" src="${sanitizeUrl(r.photo)}" alt=""/>`
      : `<span class="ac2-pm-av" style="background:${color}">${initials(r.prenom, r.nom)}</span>`;
    return `<div class="ac2-pm-i" style="--pc:${color}">
      <div class="ac2-pm-top">
        ${av}
        <a class="ac2-pm-n" href="resident.html?id=${r.id}">${escHtml(nom)}</a>
        <button type="button" class="ac2-act ico danger" title="Désinscrire" onclick="desinscrireResident('${r.id}','${i.id}')">
          ${_ac2Svg('<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>')}
        </button>
      </div>
      <div class="ac2-pm-m">Depuis ${formatDate(i.dateInscription)}${nb ? ` · ${nb} bilan${nb > 1 ? 's' : ''}` : ''}</div>
      ${last
        ? `<div class="ac2-pm-b"><b>${formatDate(last.date)}</b> — ${escHtml((last.texte || '').slice(0, 90))}${(last.texte || '').length > 90 ? '…' : ''}</div>`
        : '<div class="ac2-pm-b vide">Aucun bilan rédigé</div>'}
    </div>`;
  }).join('')}</div>`;
}
