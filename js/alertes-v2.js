// ── ALERTES & NOTIFICATIONS — DESIGN V2 ──
// Reproduit « Alertes - refonte (bento) » : quatre compteurs, filtres par
// gravité, liste d'alertes actionnables, rail (répartition par catégorie +
// échéances imminentes) et bloc « Récemment traitées ».
// La génération des alertes reste celle de js/alertes.js (generateAlertes).

let AL2_SEV = 'all';    // gravité sélectionnée dans les chips
let AL2_TYPE = '';      // catégorie sélectionnée dans le rail
let AL2_GROUP = false;  // regroupement par résident
let _al2SnoozeOpen = null;   // id de l'alerte dont le menu « Reporter » est ouvert
let _al2Prises = {};         // alerteId → { prisPar, prisParNom } (prise en charge partagée)
let _al2PrisesCharge = false;

// ── Reporter (snooze) : local, comme « Ignorer ». Une alerte reportée
//    disparaît puis revient d'elle-même à la date choisie. ──────────────────
const AL2_SNOOZE_KEY = 'ftr_al_snoozed';
let _al2Snoozed = {};
function _al2SnoozeLoad() {
  try { _al2Snoozed = JSON.parse(localStorage.getItem(AL2_SNOOZE_KEY) || '{}'); } catch { _al2Snoozed = {}; }
  // purge des reports expirés
  const now = Date.now(); let change = false;
  Object.keys(_al2Snoozed).forEach(k => { if (_al2Snoozed[k] <= now) { delete _al2Snoozed[k]; change = true; } });
  if (change) _al2SnoozeSave();
}
function _al2SnoozeSave() { try { localStorage.setItem(AL2_SNOOZE_KEY, JSON.stringify(_al2Snoozed)); } catch (_) {} }
function _al2EstReportee(id) { return _al2Snoozed[id] && _al2Snoozed[id] > Date.now(); }

// Palette sombre : celle de AL_PRIOS est calibrée pour le thème clair.
const AL2_SEV_DEFS = [
  { id: 'all',      l: 'Toutes',       c: '#818cf8' },
  { id: 'critique', l: 'Critiques',    c: '#ef4444' },
  { id: 'urgent',   l: 'Urgentes',     c: '#f59e0b' },
  { id: 'info',     l: 'Informations', c: '#0ea5e9' }
];
const AL2_SEV_C = { critique: '#ef4444', urgent: '#f59e0b', info: '#0ea5e9' };
const AL2_SEV_L = { critique: 'Critique', urgent: 'Urgent', info: 'Info' };

const AL2_IC = {
  warn:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  bell:  '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
};
function _al2Svg(d, w) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }
function _al2SvgN(d, px, w) { return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }

// Icônes des actions rapides (file de triage)
const AL2_ACT_IC = {
  traiter:  '<polyline points="20 6 9 17 4 12"/>',
  occupe:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
  reporter: '<circle cx="12" cy="12" r="10"/><polyline points="12 7 12 12 15 14"/>',
  ignorer:  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
};

// Ton de badge Console (dc-b-*) par gravité.
function _al2Tone(prio) { return prio === 'critique' ? 'red' : prio === 'urgent' ? 'amber' : 'cyan'; }

// En-tête « Console Data » pour les cartes du rail.
function _al2Head(svgIcon, color, eyebrow, title, right) {
  return `<div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:${color}22;color:${color}">${svgIcon}</span>
      <div style="min-width:0"><div class="dc-eyebrow">${escHtml(eyebrow)}</div><div class="dc-title">${escHtml(title)}</div></div>
    </div>${right || ''}</div>`;
}

// Sections de la file de triage (ordre = priorité de traitement).
const AL2_TRIAGE = [
  { id: 'critique', l: 'Critiques',    c: '#ef4444', bg: 'rgba(239,68,68,.06)',  sub: 'À traiter en priorité', vide: 'Aucune alerte critique|rien à traiter en urgence.' },
  { id: 'urgent',   l: 'Urgentes',     c: '#f59e0b', bg: 'rgba(245,158,11,.07)', sub: 'À planifier',           vide: 'File dégagée|aucune alerte urgente.' },
  { id: 'info',     l: 'Informations', c: '#0891b2', bg: 'rgba(34,211,238,.08)', sub: 'Pour information',      vide: 'Rien à signaler|aucune information en attente.' }
];

let _al2InfoMax = 8;   // nb d'informations montrées avant « voir plus »
function al2VoirPlusInfo() { _al2InfoMax = (_al2InfoMax >= 9999) ? 8 : 9999; al2Render(); }

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────

function al2Render() {
  _alLoadDismissed();
  _al2SnoozeLoad();
  al2ChargerPrises();   // au premier rendu : charge les prises en charge puis re-render
  const toutes = generateAlertes();
  // Ignorées ET reportées (jusqu'à leur échéance) sont retirées du décompte.
  const actives = toutes.filter(a => !_alDismissed.includes(a.id) && !_al2EstReportee(a.id));

  let liste = actives;
  if (AL2_SEV !== 'all') liste = liste.filter(a => a.prio === AL2_SEV);
  if (AL2_TYPE) liste = liste.filter(a => a.type === AL2_TYPE);

  al2RenderStats(actives);
  al2RenderChips(actives);
  al2RenderListe(liste);
  al2RenderCategories(actives);
  al2RenderEcheances(actives);
  al2RenderTraitees(toutes);

  if (typeof _updateAlBadges === 'function') _updateAlBadges(actives.length);
}

function al2SetSev(s) { AL2_SEV = s; al2Render(); }
function al2SetType(t) { AL2_TYPE = (AL2_TYPE === t) ? '' : t; al2Render(); }

// Regroupement par résident (mémorisé).
function al2ToggleGroup() {
  AL2_GROUP = !AL2_GROUP;
  try { localStorage.setItem('al_group', AL2_GROUP ? '1' : '0'); } catch (_) {}
  al2Render();
}

// ── Reporter ──────────────────────────────────────────────────────────────
function al2ToggleSnoozeMenu(id) { _al2SnoozeOpen = (_al2SnoozeOpen === id) ? null : id; al2Render(); }
function al2Snooze(id, jours) {
  _al2Snoozed[id] = Date.now() + jours * 86400000;
  _al2SnoozeSave();
  _al2SnoozeOpen = null;
  if (typeof toast === 'function') toast('Alerte reportée', 'info');
  al2Render();
}

// ── Prise en charge « je m'en occupe » (partagée via Supabase) ──────────────
function al2ChargerPrises() {
  if (_al2PrisesCharge || typeof sbGetAlertesPrises !== 'function') return;
  _al2PrisesCharge = true;
  sbGetAlertesPrises().then(list => {
    _al2Prises = {};
    (list || []).forEach(p => { _al2Prises[p.alerteId] = p; });
    al2Render();
  }).catch(() => {});
}
async function al2Prendre(id) {
  if (typeof sbPrendreAlerte !== 'function') { if (typeof toast === 'function') toast('Prise en charge indisponible (SQL à exécuter)', 'info'); return; }
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : {};
  const nom = [s.prenom, s.nom].filter(Boolean).join(' ') || s.username || 'Moi';
  const r = await sbPrendreAlerte(id, nom);
  if (r) { _al2Prises[id] = r; if (typeof toast === 'function') toast('Vous prenez en charge cette alerte', 'success'); }
  else if (typeof toast === 'function') toast('Enregistrement impossible — exécutez migration-fonctionnalites-v2.sql', 'info');
  al2Render();
}
async function al2Lacher(id) {
  if (typeof sbLacherAlerte !== 'function') return;
  const ok = await sbLacherAlerte(id);
  if (ok) { delete _al2Prises[id]; if (typeof toast === 'function') toast('Prise en charge retirée', 'info'); }
  al2Render();
}

// ── COMPTEURS ────────────────────────────────────────────────────────

function al2RenderStats(actives) {
  const el = document.getElementById('alStats');
  if (!el) return;
  el.style.display = 'block';                 // neutralise la grille .v2-al-stats
  const n = p => actives.filter(a => a.prio === p).length;
  const total = actives.length;
  const kpi = (c, ico, label, val) => `<div class="dc-kpi" style="--dc-c:${c}">
      <div class="dc-kpi-top"><span class="dc-kpi-label">${label}</span><span class="dc-kpi-ico" style="color:${c}">${_al2SvgN(ico, 16)}</span></div>
      <div class="dc-kpi-val">${val}</div></div>`;
  const traitees = (typeof _alDismissed !== 'undefined' && Array.isArray(_alDismissed)) ? _alDismissed.length : 0;
  const grand = total + traitees;
  const pct = grand ? Math.round(traitees / grand * 100) : 0;
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="dc-kpis">
      ${kpi('#ef4444', AL2_IC.warn,  'Critiques',    n('critique'))}
      ${kpi('#f59e0b', AL2_IC.clock, 'Urgentes',     n('urgent'))}
      ${kpi('#0891b2', AL2_IC.bell,  'Informations', n('info'))}
      ${kpi('#6366f1', AL2_IC.check, 'Au total',     total)}
    </div>
    <div class="al-prog">
      <span class="al-prog-txt">Progression du triage</span>
      <div class="al-prog-bar"><span style="width:${pct}%"></span></div>
      <span class="al-prog-num">${traitees} / ${grand} traité${traitees > 1 ? 's' : ''}</span>
    </div>
  </div>`;
}

// ── CHIPS DE GRAVITÉ ─────────────────────────────────────────────────

function al2RenderChips(actives) {
  const el = document.getElementById('alFilters');
  if (!el) return;
  el.innerHTML = AL2_SEV_DEFS.map(f => {
    const n = f.id === 'all' ? actives.length : actives.filter(a => a.prio === f.id).length;
    return `<button type="button" class="v2-chip-f${AL2_SEV === f.id ? ' on' : ''}" onclick="al2SetSev('${f.id}')">
      <span class="dot" style="background:${f.c}"></span>${f.l}<span class="n">${n}</span>
    </button>`;
  }).join('')
    // Bascule « Par résident », poussée à droite.
    + `<button type="button" class="v2-chip-f v2-al-grp-btn${AL2_GROUP ? ' on' : ''}" style="margin-left:auto" onclick="al2ToggleGroup()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
        Par résident</button>`;
}

// Reprise du regroupement mémorisé.
try { if (localStorage.getItem('al_group') === '1') AL2_GROUP = true; } catch (_) {}

// ── LISTE ────────────────────────────────────────────────────────────

function al2RenderListe(liste) {
  const el = document.getElementById('alList');
  if (!el) return;
  const ordre = { critique: 0, urgent: 1, info: 2 };
  const triees = [...liste].sort((a, b) =>
    (ordre[a.prio] ?? 3) - (ordre[b.prio] ?? 3) || (a.date || '').localeCompare(b.date || ''));

  // ── Vue « Par résident » (regroupement alternatif) ──
  if (AL2_GROUP) {
    if (!triees.length) { el.innerHTML = _al2Vide(); return; }
    const groupes = {};
    triees.forEach(a => {
      const cle = a.residentId ? String(a.residentId) : '__etab';
      (groupes[cle] = groupes[cle] || { nom: a.resName || (a.residentId ? 'Résident' : 'Établissement'), items: [] }).items.push(a);
    });
    const cles = Object.keys(groupes).sort((x, y) => {
      const gx = groupes[x].items, gy = groupes[y].items;
      const mx = Math.min(...gx.map(a => ordre[a.prio] ?? 3)), my = Math.min(...gy.map(a => ordre[a.prio] ?? 3));
      return mx - my || gy.length - gx.length;
    });
    el.innerHTML = cles.map(k => {
      const g = groupes[k];
      const mx = Math.min(...g.items.map(a => ordre[a.prio] ?? 3));
      const c = mx === 0 ? '#ef4444' : mx === 1 ? '#f59e0b' : '#0891b2';
      return `<div class="al-grp">
        <div class="al-grp-h" style="--al-c:${c};--al-bg:var(--v2-s-sub)">
          <span class="al-grp-dot"></span><span class="al-grp-t">${escHtml(g.nom)}</span>
          <span class="al-grp-n">${g.items.length}</span><span class="al-grp-sub">alerte${g.items.length > 1 ? 's' : ''}</span>
        </div>
        <div class="al-grp-body">${g.items.map(al2Row).join('')}</div>
      </div>`;
    }).join('');
    return;
  }

  // ── Vue TRIAGE : une section par gravité (ordre = priorité de traitement) ──
  el.innerHTML = AL2_TRIAGE
    .filter(g => AL2_SEV === 'all' || AL2_SEV === g.id)
    .map(g => {
      const all = triees.filter(a => a.prio === g.id);
      const total = all.length;
      let items = all, more = '';
      if (g.id === 'info' && total > _al2InfoMax) {
        items = all.slice(0, _al2InfoMax);
        more = `<button type="button" class="al-more" onclick="al2VoirPlusInfo()">Afficher les ${total - _al2InfoMax} restantes ↓</button>`;
      } else if (g.id === 'info' && _al2InfoMax >= 9999 && total > 8) {
        more = `<button type="button" class="al-more" onclick="al2VoirPlusInfo()">Réduire ↑</button>`;
      }
      const sub = total ? (items.length < total ? `${items.length} sur ${total}` : g.sub) : 'File dégagée';
      const body = total
        ? items.map(al2Row).join('') + more
        : `<div class="al-empty"><span class="al-empty-ico">${_al2SvgN('<polyline points="20 6 9 17 4 12"/>', 15, 2.4)}</span><div><b>${g.vide.split('|')[0]}</b> — ${g.vide.split('|')[1]}</div></div>`;
      return `<div class="al-grp">
        <div class="al-grp-h" style="--al-c:${g.c};--al-bg:${g.bg}">
          <span class="al-grp-dot"></span><span class="al-grp-t">${g.l}</span><span class="al-grp-n">${total}</span>
          <span class="al-grp-sub">${escHtml(sub)}</span>
        </div>
        <div class="al-grp-body">${body}</div>
      </div>`;
    }).join('');
}

function _al2Vide() {
  return `<div class="dc-card"><div class="al-empty" style="padding:40px 24px;justify-content:center">
    <span class="al-empty-ico">${_al2SvgN('<polyline points="20 6 9 17 4 12"/>', 15, 2.4)}</span>
    <div><b>Tout est à jour</b> — aucune alerte ne correspond à ce filtre.</div></div></div>`;
}

// Ligne compacte d'une alerte (file de triage) avec actions-icônes.
function al2Row(a) {
  const t = AL_TYPES[a.type] || AL_TYPES.echeance;
  const c = AL2_SEV_C[a.prio] || '#64748b';
  const prise = _al2Prises[a.id];
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? (Auth.getSession() || {}) : {};
  const peutLacher = prise && (String(prise.prisPar) === String(s.userId) || s.role === 'admin');
  const reste = a.date ? al2Reste(a.date) : '';
  const enRetard = reste.indexOf('retard') !== -1;

  const acts = (_al2SnoozeOpen === a.id)
    ? `<span class="al-snz-lbl">Reporter à</span>
       <button type="button" class="al-snz" onclick="al2Snooze('${a.id}',1)">demain</button>
       <button type="button" class="al-snz" onclick="al2Snooze('${a.id}',3)">3 j</button>
       <button type="button" class="al-snz" onclick="al2Snooze('${a.id}',7)">1 sem.</button>
       <button type="button" class="al-act danger" title="Annuler" onclick="al2ToggleSnoozeMenu('${a.id}')">${_al2SvgN(AL2_ACT_IC.ignorer, 16, 2.2)}</button>`
    : `${a.link ? `<a class="al-act primary" href="${sanitizeUrl(a.link)}" title="Traiter">${_al2SvgN(AL2_ACT_IC.traiter, 16, 2.4)}</a>` : ''}
       ${prise
          ? (peutLacher ? `<button type="button" class="al-act occupe on" title="Pris en charge — me retirer" onclick="al2Lacher('${a.id}')">${_al2SvgN(AL2_ACT_IC.occupe, 16)}</button>` : '')
          : `<button type="button" class="al-act occupe" title="Je m'en occupe" onclick="al2Prendre('${a.id}')">${_al2SvgN(AL2_ACT_IC.occupe, 16)}</button>`}
       <button type="button" class="al-act" title="Reporter" onclick="al2ToggleSnoozeMenu('${a.id}')">${_al2SvgN(AL2_ACT_IC.reporter, 16)}</button>
       <button type="button" class="al-act danger" title="Ignorer" onclick="dismissAl('${a.id}')">${_al2SvgN(AL2_ACT_IC.ignorer, 16, 2.2)}</button>`;

  return `<div class="al-row" style="--al-c:${c}">
    <span class="al-row-ico">${t.icon}</span>
    <div class="al-row-main">
      <div class="al-row-top">
        <span class="al-row-title">${escHtml(a.titre)}</span>
        <span class="dc-badge dc-b-${_al2Tone(a.prio)}">${escHtml(AL2_SEV_L[a.prio] || a.prio)}</span>
        <span class="dc-badge dc-b-gray">${escHtml(t.label)}</span>
        ${prise ? `<span class="al-pris" title="Pris en charge par ${escHtml(prise.prisParNom || '')}">✋ ${escHtml(prise.prisParNom || 'pris')}</span>` : ''}
      </div>
      <div class="al-row-meta">
        ${a.msg ? `<span>${escHtml(a.msg)}</span>` : ''}
        ${a.date ? `<span class="al-row-date">${escHtml(_alFormatDate(a.date))}</span>` : ''}
        ${reste ? `<span class="al-row-late"${enRetard ? '' : ' style="color:var(--v2-t5)"'}>${escHtml(reste)}</span>` : ''}
      </div>
    </div>
    <div class="al-acts">${acts}</div>
  </div>`;
}

// « dans 3 j », « aujourd'hui », « en retard de 2 j »
function al2Reste(iso) {
  if (!iso) return '';
  const j = Math.round((new Date(String(iso).slice(0, 10) + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
  if (isNaN(j)) return '';
  if (j === 0) return "aujourd'hui";
  if (j === 1) return 'demain';
  if (j > 1) return `dans ${j} j`;
  return `en retard de ${Math.abs(j)} j`;
}

// ── RAIL : RÉPARTITION PAR CATÉGORIE ─────────────────────────────────

function al2RenderCategories(actives) {
  const el = document.getElementById('alCats');
  if (!el) return;
  const n = {};
  actives.forEach(a => { n[a.type] = (n[a.type] || 0) + 1; });
  const cles = Object.keys(n).sort((a, b) => n[b] - n[a]);
  const max = Math.max(1, ...Object.values(n));
  const right = AL2_TYPE ? `<button type="button" class="dc-pill dim" style="cursor:pointer" onclick="al2SetType('')">Tout voir</button>` : '';
  const body = cles.length ? cles.map(k => {
    const t = AL_TYPES[k] || { label: k, color: '#64748b' };
    return `<div onclick="al2SetType('${k}')" title="Filtrer sur cette catégorie" style="cursor:pointer;margin-bottom:13px;${AL2_TYPE && AL2_TYPE !== k ? 'opacity:.45' : ''}">
      <div style="display:flex;align-items:center;margin-bottom:6px">
        <span style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--v2-t3)"><span style="width:8px;height:8px;border-radius:50%;background:${t.color}"></span>${escHtml(t.label)}</span>
        <span class="dc-dl-num" style="margin-left:auto">${n[k]}</span>
      </div>
      <div class="al-prog-bar" style="height:7px"><span style="width:${Math.round(n[k] / max * 100)}%;background:${t.color}"></span></div>
    </div>`;
  }).join('') : '<div class="dc-empty" style="padding:4px 0">Aucune alerte active.</div>';
  el.innerHTML = _al2Head(_al2SvgN('<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.5 3.7"/>', 15), '#6366f1', 'Répartition', 'Par catégorie', right)
    + `<div class="dc-body">${body}</div>`;
}

// ── RAIL : ÉCHÉANCES IMMINENTES ──────────────────────────────────────

const AL2_MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function al2RenderEcheances(actives) {
  const el = document.getElementById('alEcheances');
  if (!el) return;
  const t0 = today();
  const proches = actives
    .filter(a => a.date && String(a.date).slice(0, 10) >= t0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 5);

  const M = 'var(--v2-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';
  const body = proches.length ? proches.map((a, i) => {
    const d = new Date(String(a.date).slice(0, 10) + 'T00:00:00');
    const c = AL2_SEV_C[a.prio] || '#f59e0b';
    const t = AL_TYPES[a.type] || { label: a.type };
    return `<div style="display:flex;align-items:center;gap:12px;padding:9px 0${i ? ';border-top:1px solid var(--v2-b-soft)' : ''}">
      <div style="text-align:center;flex:none;width:36px">
        <div style="font-family:${M};font-size:16px;font-weight:700;color:var(--v2-t3);line-height:1">${d.getDate()}</div>
        <div style="font-family:${M};font-size:9px;letter-spacing:.08em;color:var(--v2-t7)">${AL2_MOIS[d.getMonth()]}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:600;color:var(--v2-t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(a.titre)}</div>
        <div style="font-size:11px;color:var(--v2-t7)">${escHtml(t.label)}</div>
      </div>
      <span style="font-family:${M};font-size:11px;font-weight:700;color:${c};white-space:nowrap">${escHtml(al2Reste(a.date))}</span>
    </div>`;
  }).join('') : '<div class="dc-empty" style="padding:4px 0">Aucune échéance à venir.</div>';
  el.innerHTML = _al2Head(_al2SvgN('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>', 15), '#f59e0b', 'À venir', 'Échéances imminentes')
    + `<div class="dc-body" style="padding-top:6px;padding-bottom:8px">${body}</div>`;
}

// ── RÉCEMMENT TRAITÉES ───────────────────────────────────────────────

// Il n'existe pas de journal des alertes traitées : on affiche celles qui ont
// été ignorées et qui sont toujours générées, c'est-à-dire prises en charge.
function al2RenderTraitees(toutes) {
  const el = document.getElementById('alTraitees');
  if (!el) return;
  const traitees = toutes.filter(a => _alDismissed.includes(a.id)).slice(0, 8);

  const right = traitees.length ? `<button type="button" class="dc-pill dim" style="cursor:pointer" onclick="resetAlDismissed()">Tout réafficher</button>` : '';
  const body = traitees.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${traitees.map(a => {
    const t = AL_TYPES[a.type] || { label: a.type };
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 11px;background:var(--v2-s-sub);border:1px solid var(--v2-b);border-radius:10px;min-width:0">
      <span style="color:#10b981;flex:none;display:flex">${_al2SvgN('<polyline points="20 6 9 17 4 12"/>', 14, 2.6)}</span>
      <span style="font-size:12.5px;color:var(--v2-t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${escHtml(a.titre)}</span>
      <span class="dc-badge dc-b-gray">${escHtml(t.label)}</span>
    </div>`;
  }).join('')}</div>` : '<div class="dc-empty" style="padding:4px 0">Aucune alerte traitée pour le moment.</div>';
  el.innerHTML = _al2Head(_al2SvgN('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', 15), '#10b981', 'Historique', 'Récemment traitées', right)
    + `<div class="dc-body">${body}</div>`;
}

// ── TOUT MARQUER COMME LU ────────────────────────────────────────────

function al2ToutTraiter() {
  const actives = generateAlertes().filter(a => !_alDismissed.includes(a.id));
  if (!actives.length) { toast('Aucune alerte à traiter', 'info'); return; }
  confirmDialog(`Marquer les ${actives.length} alertes affichées comme traitées ?`, () => {
    actives.forEach(a => { if (!_alDismissed.includes(a.id)) _alDismissed.push(a.id); });
    _alSaveDismissed();
    al2Render();
    toast('Alertes marquées comme traitées', 'success');
  });
}
