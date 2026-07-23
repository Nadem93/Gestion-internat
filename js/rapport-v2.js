// ── RAPPORT D'ACTIVITÉ — DESIGN V2 ────────────────────────────────────
// Reproduit la maquette « Rapport d'activité (pilotage) » :
//   4 tuiles KPI, sections du rapport, courbe d'occupation 12 mois,
//   mouvements, comparaison N-1, comptes rendus obligatoires, diffusion,
//   prochaine échéance, contributions de l'équipe, indicateurs SERAFIN-PH
//   et historique des rapports générés.
//
// Toutes les valeurs sont calculées à partir des données déjà présentes
// (résidents, présences, journal, incidents, PPE, satisfaction, SERAFIN-PH,
// contributions). Trois blocs de la maquette n'avaient aucune source en base
// — comptes rendus obligatoires, diffusion, prochaine échéance et historique
// des rapports : ils s'appuient sur les tables créées par
// migration-rapport.sql. Tant que ce script n'a pas été exécuté, la lecture
// renvoie [] avec un console.warn et seule l'écriture est refusée (toast
// citant le fichier). Aucune valeur n'est inventée.
//
// La couche Supabase existante (js/rapport-supabase.js) n'est pas modifiée :
// les contributions passent toujours par sbGetRapportContributions() etc.

// ── Icônes (chemins SVG, viewBox 24) ──────────────────────────────────
const RAP2_IC = {
  building: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/>',
  swap:     '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/>',
  alert:    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  star:     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  chat:     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  file:     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  check:    '<polyline points="20 6 9 17 4 12"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  report:   '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>',
  send:     '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  up:       '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  down:     '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
  flat:     '<line x1="3" y1="12" x2="21" y2="12"/>',
  arrivee:  '<path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/>',
  depart:   '<path d="M7 17l7-7"/><path d="M8 7h6v6"/>',
  plus:     '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  shield:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
};
function _rap2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
const RAP2_MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const RAP2_SQL = 'migration-rapport.sql';

// ══ ACCÈS AUX NOUVELLES TABLES — dégradation douce ═══════════════════
function _rap2TableAbsente(err) {
  const s = ((err && (err.code || '')) + ' ' + (err && (err.message || ''))).toLowerCase();
  return s.includes('42p01') || s.includes('pgrst205') || s.includes('does not exist')
      || s.includes("could not find the table") || s.includes('schema cache');
}
async function _rap2Select(table) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) {
      if (_rap2TableAbsente(error)) { console.warn(`[rapport-v2] Table « ${table} » absente — exécutez ${RAP2_SQL}. Bloc affiché vide.`); return []; }
      console.error('[rapport-v2]', table, error);
      return [];
    }
    return data || [];
  } catch (e) { console.warn('[rapport-v2]', table, e); return []; }
}
async function _rap2Write(table, op, payload, idCol, idVal) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) { toast('Supabase indisponible', 'error'); return false; }
  try {
    let q = supabaseClient.from(table);
    if (op === 'insert') q = q.insert(payload).select();
    else if (op === 'update') q = q.update(payload).eq(idCol, idVal).select();
    else q = q.delete().eq(idCol, idVal).select();
    const { error } = await q;
    if (error) {
      if (_rap2TableAbsente(error)) { toast(`Table « ${table} » absente — exécutez ${RAP2_SQL}`, 'error'); return false; }
      toast('Erreur : ' + (error.message || error), 'error'); return false;
    }
    return true;
  } catch (e) { toast('Erreur : ' + (e?.message || e), 'error'); return false; }
}

// ══ PÉRIODE ══════════════════════════════════════════════════════════
function rap2Periode() {
  const tEl = document.getElementById('rapportType');
  const type = tEl ? tEl.value : 'annee';
  const now = new Date();
  if (type === 'mois') {
    const m = (document.getElementById('rapportMois') || {}).value || now.toISOString().slice(0, 7);
    const [yy, mm] = m.split('-').map(Number);
    const end = `${m}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}`;
    return {
      type, start: `${m}-01`, end,
      label: new Date(yy, mm - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      prevStart: `${yy - 1}-${String(mm).padStart(2, '0')}-01`,
      prevEnd: `${yy - 1}-${String(mm).padStart(2, '0')}-${String(new Date(yy - 1, mm, 0).getDate()).padStart(2, '0')}`,
      annee: yy
    };
  }
  const y = parseInt((document.getElementById('rapportAnnee') || {}).value, 10) || now.getFullYear();
  return {
    type: 'annee', start: `${y}-01-01`, end: `${y}-12-31`, label: `Année ${y}`,
    prevStart: `${y - 1}-01-01`, prevEnd: `${y - 1}-12-31`, annee: y
  };
}

// ══ CALCULS ══════════════════════════════════════════════════════════
const _rap2In = (d, s, e) => { if (!d) return false; const x = String(d).slice(0, 10); return x >= s && x <= e; };

function _rap2Occup(pres, capacite, s, e) {
  if (!capacite) return null;
  let real = 0, jours = 0;
  Object.entries(pres || {}).forEach(([d, day]) => {
    if (d < s || d > e) return;
    real += Object.values(day || {}).filter(x => x === 'present' || x === 'absent').length;
    jours++;
  });
  return jours ? Math.round(real / (capacite * jours) * 100) : null;
}
function _rap2SatPct(list, s, e) {
  const p = (list || []).filter(x => _rap2In(x.date, s, e));
  const vals = p.flatMap(x => Object.values(x.reponses || {}).filter(v => v !== null && v !== undefined));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 25) : null;
}
function _rap2Eig(incidents, s, e) {
  return (incidents || []).filter(i => _rap2In(i.date, s, e) && (i.eig || i.gravite === 'grave')).length;
}

// État global de la page (rechargé à chaque changement de période)
let _rap2 = { chargement: true };

async function rap2Load() {
  const per = rap2Periode();
  const SBF = async (name, ...args) => {
    try { return (typeof window[name] === 'function') ? await window[name](...args) : null; }
    catch (e) { console.error('[rapport-v2]', name, e); return null; }
  };
  // 12 mois glissants se terminant à la fin de période
  const d12 = new Date(per.end + 'T00:00:00'); d12.setDate(1); d12.setMonth(d12.getMonth() - 11);
  const start12 = d12.toISOString().slice(0, 10);
  const minStart = [start12, per.prevStart].sort()[0];

  const R = await Promise.all([
    SBF('sbGetAppConfig'), SBF('sbGetJournalEntries'), SBF('sbGetIncidents'), SBF('sbGetPpe'),
    SBF('sbGetPresencesRange', minStart, per.end), SBF('sbGetSatisfaction'),
    _rap2Select('rapport_suivi'), _rap2Select('rapports_generes')
  ]);
  const cfg = R[0] || {};
  const settings = cfg.settings || {};
  const residents = (typeof sbResidents === 'function' ? sbResidents() : []) || [];

  _rap2 = {
    chargement: false, per, settings,
    capacite: parseInt(settings.capacite, 10) || 0,
    residents,
    journal: R[1] || [], incidents: R[2] || [], ppe: R[3] || [],
    presences: R[4] || {}, satisfaction: R[5] || [],
    suivi: R[6] || [], historique: R[7] || [],
    start12
  };
  return _rap2;
}

// ══ RENDUS ═══════════════════════════════════════════════════════════
function rap2RenderKpis() {
  const d = _rap2; if (d.chargement) return;
  const { per } = d;
  const occ = _rap2Occup(d.presences, d.capacite, per.start, per.end);
  const entrees = d.residents.filter(r => _rap2In(r.entree, per.start, per.end)).length;
  const sorties = d.residents.filter(r => _rap2In(r.dateSortie, per.start, per.end)).length;
  const eig = _rap2Eig(d.incidents, per.start, per.end);
  const sat = _rap2SatPct(d.satisfaction, per.start, per.end);
  const N = v => (v === null || v === undefined) ? '—' : v;

  const cell = (pc, ico, n, l) => `<div class="rap2-k" style="--pc:${pc}">
      <span class="rap2-k-ico">${_rap2Svg(ico)}</span>
      <div><div class="rap2-k-n">${escHtml(String(n))}</div><div class="rap2-k-l">${escHtml(l)}</div></div>
    </div>`;
  const el = document.getElementById('rap2Kpis');
  if (!el) return;
  el.innerHTML =
    cell('#4ade80', RAP2_IC.building, occ === null ? '—' : occ + ' %', "Taux d'occupation") +
    cell('#22d3ee', RAP2_IC.swap, entrees + sorties,
      `Mouvements (${entrees} entrée${entrees > 1 ? 's' : ''} · ${sorties} sortie${sorties > 1 ? 's' : ''})`) +
    cell('#ef4444', RAP2_IC.alert, N(eig), 'EIG / incidents graves') +
    cell('#f59e0b', RAP2_IC.star, sat === null ? '—' : sat + ' %', 'Satisfaction');
}

function rap2Sections() {
  const d = _rap2, { per } = d;
  const occ = _rap2Occup(d.presences, d.capacite, per.start, per.end);
  const mouv = d.residents.filter(r => _rap2In(r.entree, per.start, per.end)).length
             + d.residents.filter(r => _rap2In(r.dateSortie, per.start, per.end)).length;
  const jn = d.journal.filter(e => _rap2In(e.date, per.start, per.end)).length;
  const inc = d.incidents.filter(i => _rap2In(i.date, per.start, per.end)).length;
  const av = d.ppe.filter(p => _rap2In(p.dateRedaction, per.start, per.end)).length;
  const contribs = (typeof getRapportContributions === 'function' ? getRapportContributions() : [])
    .filter(c => _rap2In((c.mois || '') + '-01', per.start, per.end)).length;
  return [
    { label: "Taux d'occupation", detail: occ === null ? "Capacité d'accueil non renseignée" : occ + ' % sur la période', ok: occ !== null, c: '#4ade80', ico: RAP2_IC.building },
    { label: 'Mouvements (entrées/sorties)', detail: mouv + ' mouvement' + (mouv > 1 ? 's' : ''), ok: mouv > 0, c: '#22d3ee', ico: RAP2_IC.swap },
    { label: 'Journal & transmissions', detail: jn + ' entrée' + (jn > 1 ? 's' : ''), ok: jn > 0, c: '#818cf8', ico: RAP2_IC.chat },
    { label: 'Incidents & EIG', detail: inc + ' déclaration' + (inc > 1 ? 's' : ''), ok: inc > 0, c: '#ef4444', ico: RAP2_IC.alert },
    { label: 'PPE / avenants', detail: av + ' avenant' + (av > 1 ? 's' : '') + ' rédigé' + (av > 1 ? 's' : ''), ok: av > 0, c: '#ec4899', ico: RAP2_IC.file },
    { label: 'Contributions équipe', detail: contribs ? contribs + ' contribution' + (contribs > 1 ? 's' : '') : 'Aucune contribution', ok: contribs > 0, c: '#f59e0b', ico: RAP2_IC.users }
  ];
}

function rap2RenderSections() {
  const el = document.getElementById('rap2Sections');
  if (!el || _rap2.chargement) return;
  el.innerHTML = rap2Sections().map(s => `<div class="rap2-sec" style="--pc:${s.c}">
      <span class="rap2-sec-ico">${_rap2Svg(s.ico)}</span>
      <div style="flex:1;min-width:0">
        <div class="rap2-sec-t">${escHtml(s.label)}</div>
        <div class="rap2-sec-d">${escHtml(s.detail)}</div>
      </div>
      <span class="rap2-sec-ok" style="color:${s.ok ? '#34d399' : '#f59e0b'}">${_rap2Svg(s.ok ? RAP2_IC.check : RAP2_IC.clock, 2.4)}</span>
    </div>`).join('');
}

function rap2RenderChart() {
  const el = document.getElementById('rap2Chart');
  const mt = document.getElementById('rap2ChartVal');
  if (!el || _rap2.chargement) return;
  const d = _rap2;
  if (!d.capacite) {
    el.innerHTML = `<p class="v2-blk-vide" style="margin:0">Renseignez la « Capacité d'accueil » dans Administration → Établissement pour calculer le taux d'occupation.</p>`;
    if (mt) mt.textContent = '—';
    return;
  }
  const pts = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(d.per.end + 'T00:00:00'); dt.setDate(1); dt.setMonth(dt.getMonth() - i);
    const y = dt.getFullYear(), m = dt.getMonth();
    const s = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const e = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    pts.push({ label: RAP2_MOIS[m][0], full: RAP2_MOIS[m] + ' ' + y, v: _rap2Occup(d.presences, d.capacite, s, e) });
  }
  const vals = pts.filter(p => p.v !== null).map(p => p.v);
  if (!vals.length) {
    el.innerHTML = '<p class="v2-blk-vide" style="margin:0">Aucune présence enregistrée sur les 12 derniers mois.</p>';
    if (mt) mt.textContent = '—';
    return;
  }
  // Échelle absolue 0–100 % : la hauteur d'une barre est le taux lui-même.
  el.innerHTML = `<div class="rap2-chart">${pts.map(p => {
    const h = p.v === null ? 3 : Math.max(4, Math.min(100, p.v));
    return `<div class="rap2-chart-c" title="${escHtml(p.full)} : ${p.v === null ? 'aucune donnée' : p.v + ' %'}">
        <div class="rap2-chart-b${p.v === null ? ' vide' : ''}" style="height:${h}%"></div>
        <div class="rap2-chart-l">${escHtml(p.label)}</div>
      </div>`;
  }).join('')}</div>`;
  const cur = _rap2Occup(d.presences, d.capacite, d.per.start, d.per.end);
  if (mt) mt.textContent = cur === null ? '—' : cur + ' %';
}

function rap2RenderMouvements() {
  const el = document.getElementById('rap2Mouv');
  if (!el || _rap2.chargement) return;
  const d = _rap2, { per } = d;
  const entrees = d.residents.filter(r => _rap2In(r.entree, per.start, per.end)).length;
  const sorties = d.residents.filter(r => _rap2In(r.dateSortie, per.start, per.end)).length;
  const fileActive = d.residents.filter(r => (r.entree || '0000') <= per.end && (!r.dateSortie || r.dateSortie >= per.start)).length;
  const dur = d.residents
    .filter(r => r.entree && (r.entree || '0000') <= per.end && (!r.dateSortie || r.dateSortie >= per.start))
    .map(r => {
      const fin = (r.dateSortie && r.dateSortie < per.end) ? new Date(r.dateSortie + 'T00:00:00') : new Date(per.end + 'T00:00:00');
      return (fin - new Date(r.entree + 'T00:00:00')) / (86400000 * 30.44);
    }).filter(x => x >= 0);
  const dm = dur.length ? Math.round(dur.reduce((a, b) => a + b, 0) / dur.length) : null;

  const rows = [
    { l: 'Admissions', n: entrees, c: '#10b981', ico: RAP2_IC.arrivee },
    { l: 'Sorties', n: sorties, c: '#f59e0b', ico: RAP2_IC.depart },
    { l: 'File active', n: fileActive, c: '#22d3ee', ico: RAP2_IC.users },
    { l: 'Durée moy. de séjour', n: dm === null ? '—' : dm + ' mois', c: '#818cf8', ico: RAP2_IC.clock }
  ];
  el.innerHTML = rows.map(r => `<div class="rap2-row" style="--pc:${r.c}">
      <span class="rap2-row-ico">${_rap2Svg(r.ico)}</span>
      <span class="rap2-row-l">${escHtml(r.l)}</span>
      <span class="rap2-row-n">${escHtml(String(r.n))}</span>
    </div>`).join('');
}

function rap2RenderComparaison() {
  const el = document.getElementById('rap2Comp');
  if (!el || _rap2.chargement) return;
  const d = _rap2, { per } = d;
  const lignes = [];
  const push = (label, cur, prev, unite, bonSiHausse) => {
    if (cur === null || cur === undefined) return;
    const val = unite === 'pts' ? cur + ' %' : String(cur);
    if (prev === null || prev === undefined) { lignes.push({ label, val, delta: 'N-1 indisponible', c: '#8095b4', ico: RAP2_IC.flat }); return; }
    const diff = Math.round((cur - prev) * 10) / 10;
    const txt = (diff > 0 ? '+' : diff < 0 ? '−' : '') + Math.abs(diff) + (unite === 'pts' ? ' pt' + (Math.abs(diff) > 1 ? 's' : '') : '');
    const bon = diff === 0 ? null : (diff > 0) === bonSiHausse;
    lignes.push({ label, val, delta: txt, c: bon === null ? '#8095b4' : bon ? '#34d399' : '#fca5a5', ico: diff > 0 ? RAP2_IC.up : diff < 0 ? RAP2_IC.down : RAP2_IC.flat });
  };
  push("Taux d'occupation",
    _rap2Occup(d.presences, d.capacite, per.start, per.end),
    _rap2Occup(d.presences, d.capacite, per.prevStart, per.prevEnd), 'pts', true);
  push('Satisfaction',
    _rap2SatPct(d.satisfaction, per.start, per.end),
    _rap2SatPct(d.satisfaction, per.prevStart, per.prevEnd), 'pts', true);
  const incC = d.incidents.filter(i => _rap2In(i.date, per.start, per.end)).length;
  const incP = d.incidents.filter(i => _rap2In(i.date, per.prevStart, per.prevEnd)).length;
  push('Incidents déclarés', incC, incP, '', false);
  const jC = d.journal.filter(e => _rap2In(e.date, per.start, per.end)).length;
  const jP = d.journal.filter(e => _rap2In(e.date, per.prevStart, per.prevEnd)).length;
  push('Entrées au journal', jC, jP, '', true);

  if (!lignes.length) { el.innerHTML = '<p class="v2-blk-vide" style="margin:0">Aucun indicateur comparable sur la période.</p>'; return; }
  el.innerHTML = lignes.map(l => `<div class="rap2-cmp" style="--pc:${l.c}">
      <span class="rap2-cmp-l">${escHtml(l.label)}</span>
      <span class="rap2-cmp-v">${escHtml(l.val)}</span>
      <span class="rap2-cmp-d">${_rap2Svg(l.ico, 2.4)}${escHtml(l.delta)}</span>
    </div>`).join('');
}

// ── SERAFIN-PH ────────────────────────────────────────────────────────
function rap2RenderSerafin() {
  const el = document.getElementById('rap2Serafin');
  if (!el || _rap2.chargement) return;
  const actifs = _rap2.residents.filter(r => r.statut !== 'sorti');
  const avec = actifs.filter(r => ((r.serafinph || {}).selected || []).length > 0);
  if (!actifs.length || !avec.length) {
    el.innerHTML = '<p class="v2-blk-vide" style="margin:0">Aucune évaluation SERAFIN-PH enregistrée.</p>';
    return;
  }
  const nomen = (typeof SP_NOMENCLATURE !== 'undefined') ? SP_NOMENCLATURE : [];
  const moyCat = cat => {
    const codes = nomen.filter(p => p.cat === cat).map(p => p.code);
    const niv = [];
    avec.forEach(r => {
      const sp = r.serafinph || {};
      (sp.selected || []).forEach(code => { if (codes.includes(code)) niv.push((sp.prestations?.[code]?.niveau) || 0); });
    });
    return niv.length ? Math.round(niv.reduce((a, b) => a + b, 0) / niv.length / 4 * 100) : null;
  };
  const lignes = [
    { label: 'Résidents évalués', pct: Math.round(avec.length / actifs.length * 100), val: `${avec.length}/${actifs.length}`, c: '#4ade80' },
    { label: 'Prestations directes', pct: moyCat('Directe'), c: '#22d3ee' },
    { label: 'Prestations indirectes', pct: moyCat('Indirecte'), c: '#818cf8' }
  ].filter(l => l.pct !== null);
  el.innerHTML = lignes.map(l => `<div>
      <div style="display:flex;align-items:baseline;margin-bottom:4px;gap:10px">
        <span style="font-size:11.5px;color:var(--v2-t3)">${escHtml(l.label)}</span>
        <span style="margin-left:auto;font-size:11px;font-weight:700;color:#fff">${escHtml(l.val || (l.pct + ' %'))}</span>
      </div>
      <div class="v2-prog" style="height:6px"><span style="width:${l.pct}%;background:${l.c}"></span></div>
    </div>`).join('');
}

// ── CONTRIBUTIONS DE L'ÉQUIPE (rail) ─────────────────────────────────
function rap2RenderContributions() {
  const el = document.getElementById('rcList');
  if (!el) return;
  const mEl = document.getElementById('rcMois');
  if (mEl && !mEl.value) mEl.value = new Date().toISOString().slice(0, 7);
  const session = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const isAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function') ? Auth.isAdmin() : false;
  const list = (typeof getRapportContributions === 'function' ? getRapportContributions() : [])
    .slice()
    .sort((a, b) => (b.mois || '').localeCompare(a.mois || '') || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  if (!list.length) {
    el.innerHTML = '<p class="v2-blk-vide" style="margin:0">Aucune contribution pour le moment.</p>';
    return;
  }
  const CATC = { fait_marquant: '#22d3ee', point_fort: '#10b981', difficulte: '#f59e0b', perspective: '#a855f7' };
  const CATE = { fait_marquant: '📌', point_fort: '✅', difficulte: '⚠️', perspective: '🎯' };
  el.innerHTML = list.map(c => {
    const cat = (typeof RC_CATEGORIES !== 'undefined' && RC_CATEGORIES[c.categorie]) ? RC_CATEGORIES[c.categorie] : { label: 'Fait marquant' };
    const col = CATC[c.categorie] || '#818cf8';
    const emo = CATE[c.categorie] || '📌';
    const moisLabel = c.mois ? new Date(c.mois + '-01T12:00').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '';
    const canDelete = isAdmin || String(c.authorId) === String(session?.userId);
    return `<div class="rap2-contrib" style="--pc:${col}">
      <span class="rap2-contrib-e">${emo}</span>
      <div style="flex:1;min-width:0">
        <div class="rap2-contrib-t">${escHtml(c.texte)}</div>
        <div class="rap2-contrib-m">${escHtml(c.auteur || '—')} · ${escHtml(moisLabel)} · ${escHtml(cat.label)}</div>
      </div>
      ${canDelete ? `<button type="button" class="rap2-x" title="Supprimer" onclick="supprimerContributionRapport('${escHtml(String(c.id))}')">✕</button>` : ''}
    </div>`;
  }).join('');
}

// ── SUIVI (comptes rendus obligatoires / diffusion / échéance) ───────
const RAP2_STATUTS = {
  fait:           { label: 'Fait', c: '#34d399' },
  en_cours:       { label: 'En cours', c: '#f59e0b' },
  planifie:       { label: 'Planifié', c: '#8095b4' },
  transmis:       { label: 'Transmis', c: '#34d399' },
  a_transmettre:  { label: 'À transmettre', c: '#f59e0b' },
  presente:       { label: 'Présenté', c: '#22d3ee' },
  non_concerne:   { label: 'Non concerné', c: '#8095b4' }
};
function _rap2SuiviDe(type) {
  return (_rap2.suivi || [])
    .filter(s => s.type === type && (!s.annee || String(s.annee) === String(_rap2.per.annee)))
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || String(a.libelle || '').localeCompare(String(b.libelle || '')));
}
function rap2RenderObligatoires() {
  const el = document.getElementById('rap2Oblig');
  if (!el || _rap2.chargement) return;
  const list = _rap2SuiviDe('obligatoire');
  if (!list.length) { el.innerHTML = `<p class="v2-blk-vide" style="margin:0">Aucun compte rendu suivi. Ajoutez-en un avec « + ».</p>`; return; }
  el.innerHTML = list.map(s => {
    const st = RAP2_STATUTS[s.statut] || { label: s.statut || '—', c: '#8095b4' };
    const fait = s.statut === 'fait';
    return `<div class="rap2-row" style="--pc:${st.c}">
      <span class="rap2-mini">${_rap2Svg(fait ? RAP2_IC.check : RAP2_IC.clock, 2.4)}</span>
      <span class="rap2-row-l">${escHtml(s.libelle || '')}</span>
      <span class="rap2-row-tag">${escHtml(st.label)}</span>
      <button type="button" class="rap2-x" title="Supprimer" onclick="rap2SupprimerSuivi('${escHtml(String(s.id))}')">✕</button>
    </div>`;
  }).join('');
}
function rap2RenderDiffusion() {
  const el = document.getElementById('rap2Diff');
  if (!el || _rap2.chargement) return;
  const list = _rap2SuiviDe('diffusion');
  if (!list.length) { el.innerHTML = `<p class="v2-blk-vide" style="margin:0">Aucun destinataire suivi. Ajoutez-en un avec « + ».</p>`; return; }
  el.innerHTML = list.map(s => {
    const st = RAP2_STATUTS[s.statut] || { label: s.statut || '—', c: '#8095b4' };
    return `<div class="rap2-row" style="--pc:${st.c}">
      <span class="rap2-dot"></span>
      <span class="rap2-row-l">${escHtml(s.libelle || '')}</span>
      <span class="rap2-row-tag">${escHtml(st.label)}</span>
      <button type="button" class="rap2-x" title="Supprimer" onclick="rap2SupprimerSuivi('${escHtml(String(s.id))}')">✕</button>
    </div>`;
  }).join('');
}
function rap2RenderEcheance() {
  const el = document.getElementById('rap2Ech');
  if (!el || _rap2.chargement) return;
  const list = _rap2SuiviDe('echeance').filter(s => s.echeance).sort((a, b) => String(a.echeance).localeCompare(String(b.echeance)));
  const prochaine = list.find(s => String(s.echeance) >= new Date().toISOString().slice(0, 10)) || list[0];
  if (!prochaine) {
    el.innerHTML = `<p class="v2-blk-vide" style="margin:0">Aucune échéance enregistrée. Ajoutez-en une avec « + ».</p>`;
    return;
  }
  const secs = rap2Sections();
  const pct = Math.round(secs.filter(s => s.ok).length / secs.length * 100);
  const dLabel = new Date(prochaine.echeance + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  el.innerHTML = `<div class="rap2-ech-s" style="margin-bottom:12px">${escHtml(prochaine.libelle || '')}</div>
    <div class="rap2-ech-d">${escHtml(dLabel)}</div>
    <div class="v2-prog" style="height:7px;margin-top:14px"><span style="width:${pct}%;background:linear-gradient(90deg,#fbbf24,#f59e0b)"></span></div>
    <div class="rap2-ech-s" style="margin-top:8px">${pct} % des sections du rapport disposent de données</div>
    <button type="button" class="rap2-x" style="margin-top:10px" onclick="rap2SupprimerSuivi('${escHtml(String(prochaine.id))}')">✕ Retirer cette échéance</button>`;
}

// ── HISTORIQUE DES RAPPORTS GÉNÉRÉS ──────────────────────────────────
function rap2RenderHistorique() {
  const el = document.getElementById('rap2Hist');
  if (!el || _rap2.chargement) return;
  const list = (_rap2.historique || []).slice()
    .sort((a, b) => String(b.genere_le || '').localeCompare(String(a.genere_le || '')))
    .slice(0, 6);
  if (!list.length) {
    el.innerHTML = '<p class="v2-blk-vide" style="margin:0">Aucun rapport généré pour le moment.</p>';
    return;
  }
  el.innerHTML = list.map(h => {
    const d = h.genere_le ? new Date(h.genere_le).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '';
    return `<div class="rap2-row" style="--pc:#c4b5fd">
      <span class="rap2-row-ico" style="width:28px;height:28px;border-radius:8px;background:rgba(124,58,237,.16)">${_rap2Svg(RAP2_IC.file)}</span>
      <span class="rap2-row-l">${escHtml(h.libelle || '')}</span>
      <span class="rap2-row-tag" style="--pc:var(--v2-t6);font-weight:600">${escHtml(d)}</span>
    </div>`;
  }).join('');
}

// ══ ÉCRITURES ════════════════════════════════════════════════════════
function rap2OuvrirSuivi(type) {
  const el = document.getElementById('suiviType');
  if (el) el.value = type || 'obligatoire';
  const lib = document.getElementById('suiviLibelle'); if (lib) lib.value = '';
  const dt = document.getElementById('suiviEcheance'); if (dt) dt.value = '';
  rap2SuiviTypeChange();
  openModal('modalSuivi');
}
function rap2SuiviTypeChange() {
  const t = (document.getElementById('suiviType') || {}).value || 'obligatoire';
  const stEl = document.getElementById('suiviStatut');
  const echWrap = document.getElementById('suiviEcheanceWrap');
  const stWrap = document.getElementById('suiviStatutWrap');
  const opts = t === 'diffusion' ? ['transmis', 'a_transmettre', 'presente', 'non_concerne']
             : t === 'echeance' ? [] : ['en_cours', 'fait', 'planifie'];
  if (stEl) stEl.innerHTML = opts.map(o => `<option value="${o}">${RAP2_STATUTS[o].label}</option>`).join('');
  if (stWrap) stWrap.style.display = opts.length ? '' : 'none';
  if (echWrap) echWrap.style.display = t === 'echeance' ? '' : 'none';
}
async function rap2EnregistrerSuivi() {
  const type = (document.getElementById('suiviType') || {}).value || 'obligatoire';
  const libelle = ((document.getElementById('suiviLibelle') || {}).value || '').trim();
  const statut = (document.getElementById('suiviStatut') || {}).value || null;
  const echeance = (document.getElementById('suiviEcheance') || {}).value || null;
  if (!libelle) { toast('Indiquez un libellé', 'error'); return; }
  if (type === 'echeance' && !echeance) { toast('Indiquez une date d’échéance', 'error'); return; }
  let etab = null;
  try { etab = (typeof sbGetEtablissementId === 'function') ? await sbGetEtablissementId() : null; }
  catch (e) { console.error('[rapport-v2]', e); }
  const ok = await _rap2Write('rapport_suivi', 'insert', {
    etablissement_id: etab, type, libelle,
    statut: type === 'echeance' ? null : statut,
    echeance: type === 'echeance' ? echeance : null,
    annee: _rap2.per ? _rap2.per.annee : new Date().getFullYear()
  });
  if (!ok) return;
  closeModal('modalSuivi');
  toast('Enregistré ✓', 'success');
  _rap2.suivi = await _rap2Select('rapport_suivi');
  rap2RenderObligatoires(); rap2RenderDiffusion(); rap2RenderEcheance();
}
async function rap2SupprimerSuivi(id) {
  if (!confirm('Supprimer cette ligne de suivi ?')) return;
  const ok = await _rap2Write('rapport_suivi', 'delete', null, 'id', id);
  if (!ok) return;
  _rap2.suivi = (_rap2.suivi || []).filter(s => String(s.id) !== String(id));
  rap2RenderObligatoires(); rap2RenderDiffusion(); rap2RenderEcheance();
  toast('Supprimé ✓', 'success');
}

async function rap2LogHistorique() {
  const per = rap2Periode();
  const session = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  let etab = null;
  try { etab = (typeof sbGetEtablissementId === 'function') ? await sbGetEtablissementId() : null; }
  catch (e) { console.error('[rapport-v2]', e); }
  // Écriture silencieuse : la génération du PDF ne doit pas échouer si la
  // table n'existe pas encore (le toast serait ici plus gênant qu'utile).
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('rapports_generes').insert({
      etablissement_id: etab,
      libelle: "Rapport d'activité — " + per.label,
      periode_type: per.type, periode_debut: per.start, periode_fin: per.end,
      genere_le: new Date().toISOString(),
      genere_par: session ? ([session.prenom, session.nom].filter(Boolean).join(' ') || session.username) : null
    });
    if (error) {
      if (_rap2TableAbsente(error)) { console.warn(`[rapport-v2] Table « rapports_generes » absente — exécutez ${RAP2_SQL}. Historique non enregistré.`); return; }
      console.error('[rapport-v2] historique', error); return;
    }
    _rap2.historique = await _rap2Select('rapports_generes');
    rap2RenderHistorique();
  } catch (e) { console.warn('[rapport-v2] historique', e); }
}

// ══ APERÇU (habillage sombre autour du document imprimable) ══════════
async function rap2RenderApercu() {
  const cont = document.getElementById('rapportApercu');
  if (!cont || !document.getElementById('rapportType')) return;
  const type = document.getElementById('rapportType').value;
  const per = type === 'mois'
    ? (document.getElementById('rapportMois') || {}).value
    : (document.getElementById('rapportAnnee') || {}).value;
  if (!per) { cont.innerHTML = '<p class="v2-blk-vide" style="margin:0;text-align:center;padding:1.5rem">Choisissez une période pour afficher l’aperçu.</p>'; return; }
  cont.innerHTML = '<p class="v2-blk-vide" style="margin:0;text-align:center;padding:2.5rem">⏳ Chargement de l’aperçu…</p>';
  const ifr = document.createElement('iframe');
  ifr.title = "Aperçu du rapport d'activité";
  cont.innerHTML = '';
  cont.appendChild(ifr);
  try {
    await _rap2GenererOriginal(ifr);
    const doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
    // Le document imprimable reste sur fond papier, mais la couleur est posée
    // À L'INTÉRIEUR de l'iframe : l'élément <iframe> lui-même reste transparent,
    // aucune surface claire n'apparaît donc dans la page V2.
    try {
      const st = doc.createElement('style');
      st.textContent = 'html,body{background:#fff;color:#334155}body{padding:18px 22px}';
      doc.head.appendChild(st);
    } catch (e) { /* document non accessible : on laisse tel quel */ }
    const resize = () => { try { ifr.style.height = (doc.documentElement.scrollHeight + 24) + 'px'; } catch (e) {} };
    resize(); setTimeout(resize, 200); setTimeout(resize, 700);
  } catch (e) {
    console.error(e);
    cont.innerHTML = '<p class="v2-blk-vide" style="margin:0;text-align:center;padding:1.5rem;color:var(--v2-danger-text)">Erreur lors du chargement de l’aperçu.</p>';
  }
}

// ══ ORCHESTRATION ════════════════════════════════════════════════════
async function rap2Refresh() {
  const titre = document.getElementById('rap2Titre');
  await rap2Load();
  if (titre) titre.textContent = "Rapport d'activité — " + _rap2.per.label;
  rap2RenderKpis();
  rap2RenderSections();
  rap2RenderChart();
  rap2RenderMouvements();
  rap2RenderComparaison();
  rap2RenderSerafin();
  rap2RenderObligatoires();
  rap2RenderDiffusion();
  rap2RenderEcheance();
  rap2RenderHistorique();
}

// Changement de période : on garde le comportement hérité (bascule des
// champs + aperçu) et on rafraîchit le tableau de bord V2.
function rap2PeriodeChange() {
  if (typeof toggleRapportPeriode === 'function') toggleRapportPeriode();
  rap2Refresh();
}

// ── Délégation des fonctions héritées vers le rendu V2 ────────────────
const _rap2GenererOriginal = window.genererRapportPDF;
window.renderContributionsRapport = rap2RenderContributions;
window.renderApercu = rap2RenderApercu;
window.genererRapportPDF = async function (previewIframe) {
  const r = await _rap2GenererOriginal.call(this, previewIframe);
  if (!previewIframe) { rap2LogHistorique(); }
  return r;
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('rap2Kpis')) return;
  rap2SuiviTypeChange();
  if (typeof initRapportDefaults === 'function') initRapportDefaults();
  try { if (typeof sbLoadResidentsCache === 'function') await sbLoadResidentsCache(); } catch (e) { console.error('[rapport-v2]', e); }
  try { if (typeof loadRapportCache === 'function') await loadRapportCache(); } catch (e) { console.error('[rapport-v2]', e); }
  rap2RenderContributions();
  await rap2Refresh();
});
