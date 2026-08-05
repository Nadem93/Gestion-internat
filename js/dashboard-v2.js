// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD V2 — vue « cockpit » à l'échelle de l'établissement
//
// S'insère au-dessus des blocs « mes référés » existants, qui sont conservés.
// Rendu dans #dashV2 ; chaque carte est isolée : une source de données absente
// n'affiche qu'un état vide, elle n'interrompt pas le reste du tableau de bord.
// ══════════════════════════════════════════════════════════════════════════

const DV2 = { data: {} };

// Libellés lisibles (les valeurs stockées sont des clés techniques)
const DV2_GRAVITE = { faible: 'Faible', moderee: 'Modérée', elevee: 'Élevée', critique: 'Critique' };
const DV2_STATUT  = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu', clos: 'Clos' };

function _dv2Today() { return (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10); }
function _dv2Esc(s) { return (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s); }
function _dv2Date(d) { return (typeof formatDate === 'function') ? formatDate(d) : (d || ''); }
function _dv2Days(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function _dv2Shift(n) { const d = new Date(_dv2Today()); d.setDate(d.getDate() + n); return isoJour(d); }
function _dv2Nom(r) { return `${r?.prenom || ''} ${r?.nom || ''}`.trim() || 'Résident'; }

// Périmètre référent : mêmes règles de rapprochement que l'ancien _dashScope
// (nom du compte comparé à referent / coReferent, casse et espaces normalisés).
function _dv2MyName() {
  try { const s = Auth.getSession(); return s ? `${s.prenom || ''} ${s.nom || ''}`.trim().toLowerCase().replace(/\s+/g, ' ') : ''; }
  catch (e) { return ''; }
}
function _dv2SeesAll() { try { return !!(Auth.isAdmin && Auth.isAdmin()); } catch (e) { return true; } }
// Renvoie null quand le compte voit tout l'établissement (admin, ou nom de session absent).
function _dv2MesReferes(list) {
  if (_dv2SeesAll()) return null;
  const me = _dv2MyName();
  if (!me) return null;
  const n = x => (x || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return (list || []).filter(r => n(r.referent) === me || n(r.coReferent) === me);
}
function _dv2Ini(r) { return ((r?.prenom || '')[0] || '') + ((r?.nom || '')[0] || ''); }

// Micro-label (eyebrow) « Console Data » par titre de carte — évite d'éditer chaque appelant.
const _DC_EYEBROW = {
  'Agenda du jour': 'Aujourd’hui', 'Satisfaction résidents': 'Ressenti', 'Plan de médication': 'Soins du jour',
  'Régimes & allergies': 'Cuisine', 'Occupation par unité': 'Hébergement', 'Météo du foyer — 7 jours': 'Ambiance',
  'Congés à valider': 'RH', 'Formations à venir': 'RH', 'Échéances': 'Administratif', 'Stocks': 'Logistique',
  'Maintenance': 'Technique', 'Activités & sorties': 'Animation', 'Annonces internes': 'Communication',
  'Flotte véhicules': 'Logistique', 'RDV médicaux — 7 jours': 'Santé', 'Planning de la semaine': 'Équipe',
  'Dépenses du mois': 'Budget', 'Journal de bord — dernières transmissions': 'Terrain'
};

// Enveloppe de carte — direction « Console Data » (chip + eyebrow mono + titre + pill mono).
function _dv2Card(opts) {
  const { title, icon, color = '#818cf8', meta = '', body = '', span = '', flush = false } = opts;
  const eyebrow = opts.eyebrow || _DC_EYEBROW[title] || '';
  const chip = icon ? `<span class="dc-chip" style="background:${color}22;color:${color}">${icon}</span>` : '';
  const head = `<div class="dc-head${flush ? ' nb' : ''}">
      <div class="dc-head-l">${chip}
        <div style="min-width:0">${eyebrow ? `<div class="dc-eyebrow">${_dv2Esc(eyebrow)}</div>` : ''}<div class="dc-title">${_dv2Esc(title)}</div></div>
      </div>${meta ? `<span class="dc-pill dim">${_dv2Esc(meta)}</span>` : ''}</div>`;
  return `<div class="dc-card" style="${span}">${head}<div class="dc-body">${body}</div></div>`;
}

function _dv2Empty(txt) { return `<div style="font-size:12px;color:var(--v2-t7);padding:6px 0">${_dv2Esc(txt)}</div>`; }

// En-tête « Console Data » : chip d'icône + eyebrow (label mono) + titre + zone droite.
function _dcHead(icon, chip, eyebrow, title, right, noborder) {
  return `<div class="dc-head${noborder ? ' nb' : ''}">
      <div class="dc-head-l"><span class="dc-chip ${chip}">${icon}</span>
        <div style="min-width:0"><div class="dc-eyebrow">${_dv2Esc(eyebrow)}</div><div class="dc-title">${_dv2Esc(title)}</div></div>
      </div>${right || ''}</div>`;
}

// ─── Chargement ───────────────────────────────────────────────────────────
async function initDashboardV2() {
  const host = document.getElementById('dashV2');
  if (!host) return;
  host.innerHTML = `<div style="padding:30px;color:var(--v2-t7);font-size:13px">Chargement du tableau de bord…</div>`;

  const call = async (fn, ...a) => { try { return (typeof window[fn] === 'function') ? await window[fn](...a) : null; } catch (e) { console.warn('[dashV2]', fn, e); return null; } };
  const t = _dv2Today(), d7 = _dv2Shift(-6);

  const [residents, presDay, presRange, incidents, conges, echeances, transmissions,
         employes, shifts, formations, activites, inventaire, interventions,
         chambres, satisfaction, annonces, climat, planning] = await Promise.all([
    (typeof sbResidents === 'function' && sbResidents().length) ? sbResidents() : call('sbGetResidents'),
    call('sbGetPresencesForDate', t),
    call('sbGetPresencesRange', d7, t),
    call('sbGetIncidents'), call('sbGetConges'), call('sbGetEcheances'),
    call('sbGetTransmissions'), call('sbGetEmployes'), call('sbGetPeShifts'),
    call('sbGetFormations'), call('sbGetActivites'), call('sbGetInventaire'),
    call('sbGetInterventions'), call('sbGetChambres'), call('sbGetSatisfaction'),
    call('sbGetAnnonces', 6), call('sbGetClimat', d7, t), call('sbGetPlanningEvents')
  ]);
  const [medDistrib, vehicules, enveloppes, depenses] = await Promise.all([
    call('sbGetMedDistribForDate', t), call('sbGetVehiculesListe'),
    call('sbGetBudgetEnveloppes'), call('sbGetBudgetDemandes')
  ]);

  DV2.data = { residents: residents || [], presDay: presDay || {}, presRange: presRange || {},
    incidents: incidents || [], conges: conges || [], echeances: echeances || [],
    transmissions: transmissions || [], employes: employes || [], shifts: shifts || [],
    formations: formations || [], activites: activites || [], inventaire: inventaire || [],
    interventions: interventions || [], chambres: chambres || [], satisfaction: satisfaction || [],
    annonces: annonces || [], climat: climat || [], planning: planning || [],
    medDistrib: medDistrib || {}, vehicules: vehicules || [],
    enveloppes: enveloppes || [], depenses: depenses || [] };

  renderDashboardV2();
}

// ─── Rendu ────────────────────────────────────────────────────────────────
function renderDashboardV2() {
  const host = document.getElementById('dashV2');
  if (!host) return;
  const safe = (fn, label) => { try { return fn(); } catch (e) { console.warn('[dashV2] carte', label, e); return _dv2Card({ title: label, body: _dv2Empty('Indisponible') }); } };

  host.innerHTML = `
    ${safe(_dv2Greeting, 'En-tête')}
    ${safe(_dv2Kpis, 'Indicateurs')}
    <div class="v2-g v2-g-main" style="margin-top:14px">
      <div class="v2-g" style="gap:14px;align-content:start">
        ${safe(_dv2ATraiter, 'À traiter')}
        <div class="v2-g v2-g-15">
          ${safe(_dv2Presences, 'Présences')}
          ${safe(_dv2Incidents, 'Incidents')}
        </div>
        ${safe(_dv2Tiles, 'Tuiles')}
        ${safe(_dv2IncidentsTable, 'Incidents récents')}
      </div>
      <div class="v2-g" style="gap:14px;align-content:start">
        ${safe(_dv2Agenda, 'Agenda')}
        ${safe(_dv2Satisfaction, 'Satisfaction')}
        ${safe(_dv2Actions, 'Accès rapides')}
        ${safe(_dv2Equipe, 'Équipe présente')}
      </div>
    </div>

    <div class="v2-sep"><span class="v2-sep-txt">Résidents</span><span class="v2-sep-line"></span></div>
    ${_dv2CacheApercuResidents() ? '' : safe(_dv2Residents, 'Résidents')}
    <div class="v2-g v2-g2" style="margin-top:14px">
      ${safe(_dv2Occupation, 'Occupation')}
      ${safe(_dv2Echeances, 'Échéances')}
    </div>

    <div class="v2-sep"><span class="v2-sep-txt">Soins &amp; santé</span><span class="v2-sep-line"></span></div>
    <div class="v2-g v2-g3">
      ${safe(_dv2Medication, 'Médication')}
      ${safe(_dv2Regimes, 'Régimes')}
      ${safe(_dv2RdvSemaine, 'RDV médicaux')}
    </div>
    <div style="margin-top:14px">${safe(_dv2Meteo, 'Météo du foyer')}</div>

    <div class="v2-sep"><span class="v2-sep-txt">Équipe &amp; RH</span><span class="v2-sep-line"></span></div>
    ${safe(_dv2PlanningSemaine, 'Planning semaine')}
    <div class="v2-g v2-g2" style="margin-top:14px">
      ${safe(_dv2CongesAValider, 'Congés')}
      ${safe(_dv2Formations, 'Formations')}
    </div>

    <div class="v2-sep"><span class="v2-sep-txt">Ressources &amp; logistique</span><span class="v2-sep-line"></span></div>
    <div class="v2-g v2-g4">
      ${safe(_dv2Vehicules, 'Véhicules')}
      ${safe(_dv2Stocks, 'Stocks')}
      ${safe(_dv2Maintenance, 'Maintenance')}
      ${safe(_dv2Budget, 'Budget')}
    </div>

    <div class="v2-sep"><span class="v2-sep-txt">Vie du foyer</span><span class="v2-sep-line"></span></div>
    <div class="v2-g v2-g2">
      ${safe(_dv2Activites, 'Activités')}
      ${safe(_dv2Annonces, 'Annonces')}
    </div>

    ${safe(_dv2Journal, 'Journal')}
  `;
}

// ─── Cartes ───────────────────────────────────────────────────────────────
function _dv2Greeting() {
  const nb = DV2.data.residents.filter(r => r.statut !== 'sorti').length;
  const dateTxt = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `<div>
    <div class="v2-sub">${dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1)} · ${nb} résident${nb > 1 ? 's' : ''} accompagné${nb > 1 ? 's' : ''}</div></div>`;
}

function _dv2Kpis() {
  const t = _dv2Today();
  const presents = Object.values(DV2.data.presDay).filter(p => (p.statut || '') === 'present').length;
  const incOuverts = DV2.data.incidents.filter(i => i.statut && i.statut !== 'resolu' && i.statut !== 'clos').length;
  const congesAtt = DV2.data.conges.filter(c => c.statut === 'en_attente').length;
  const ech30 = DV2.data.echeances.filter(e => !e.done && e.date && _dv2Days(t, e.date) <= 30).length;
  const k = (c, ico, label, val, sub) => `<div class="dc-kpi" style="--dc-c:${c}">
      <div class="dc-kpi-top"><span class="dc-kpi-label">${label}</span><span class="dc-kpi-ico">${ico}</span></div>
      <div class="dc-kpi-val">${val}</div><div class="dc-kpi-sub">${sub}</div></div>`;
  return `<div class="dc-kpis" style="margin-top:16px">
    ${k('#6366f1', '🏠', 'Résidents présents', presents, 'aujourd’hui')}
    ${k('#ef4444', '⚠', 'Incidents ouverts', incOuverts, 'à suivre')}
    ${k('#f59e0b', '🗓', 'Congés en attente', congesAtt, 'à valider')}
    ${k('#8b5cf6', '⏳', 'Échéances < 30 j', ech30, 'sous 30 jours')}
  </div>`;
}

function _dv2ATraiter() {
  const t = _dv2Today(), items = [];
  // Échéances : les plus proches / en retard d'abord (retard = liseré rouge si > 6 mois, sinon orange).
  DV2.data.echeances.filter(e => !e.done && e.date && _dv2Days(t, e.date) <= 15)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 4).forEach(e => {
      const j = _dv2Days(t, e.date);                 // < 0 = en retard
      const retard = -j;
      const title = `${e.libelle || 'Échéance'}${e.residentName ? ' — ' + e.residentName : ''}`;
      if (j < 0) {
        items.push({ stripe: retard >= 180 ? '#ef4444' : '#f59e0b', tag: 'Urgent', tone: 'danger',
          title, pill: `+${retard} j`, pillTone: 'danger' });
      } else {
        items.push({ stripe: '#f59e0b', tag: 'Échéance', tone: 'warn',
          title, pill: j === 0 ? 'auj.' : `${j} j`, pillTone: j === 0 ? 'muted' : 'warn' });
      }
    });
  const ca = DV2.data.conges.filter(c => c.statut === 'en_attente').length;
  if (ca) items.push({ stripe: '#6366f1', tag: 'RH', tone: 'info',
    title: `${ca} demande${ca > 1 ? 's' : ''} de congés à valider`, pill: 'auj.', pillTone: 'muted' });
  const nonSaisies = DV2.data.residents.filter(r => r.statut !== 'sorti' && !DV2.data.presDay[r.id]).length;
  if (nonSaisies) items.push({ stripe: '#f59e0b', tag: 'Présences', tone: 'warn',
    title: `${nonSaisies} présence${nonSaisies > 1 ? 's' : ''} non saisie${nonSaisies > 1 ? 's' : ''}`, pill: 'auj.', pillTone: 'muted' });

  const rows = items.map(i => `<div class="at-row" style="--at-c:${i.stripe}">
      <span class="at-tag at-tag-${i.tone}">${_dv2Esc(i.tag)}</span>
      <span class="at-row-title">${_dv2Esc(i.title)}</span>
      <span class="at-pill at-pill-${i.pillTone}">${_dv2Esc(i.pill)}</span>
    </div>`).join('');
  const body = items.length
    ? `<div class="at-list">${rows}</div>`
    : '<div class="at-empty">Rien à traiter — tout est à jour.</div>';
  return `<div class="at-card">
    <div class="at-head">
      <span class="at-dot"></span>
      <span class="at-title">À traiter aujourd'hui</span>
      ${items.length ? `<span class="at-count">${items.length} action${items.length > 1 ? 's' : ''}</span>` : ''}
    </div>${body}
  </div>`;
}

function _dv2Presences() {
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(_dv2Shift(-i));
  const R = DV2.data.presRange || {};
  const counts = days.map(d => {
    const day = R[d];
    if (day && typeof day === 'object') return Object.values(day).filter(v => (v?.statut || v) === 'present').length;
    return Object.values(R).filter(v => v && v[d] && ((v[d].statut || v[d]) === 'present')).length;
  });
  const max = Math.max(1, ...counts);
  const moy = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
  const L = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  let peakI = 0; counts.forEach((c, i) => { if (c > counts[peakI]) peakI = i; });
  const bars = days.map((d, i) => {
    const wk = new Date(d).getDay(); const we = (wk === 0 || wk === 6);
    return `<div class="dc-bcol" title="${_dv2Date(d)} — ${counts[i]}">
        <span class="dc-bval">${counts[i]}</span>
        <div class="dc-bar${we ? ' we' : ''}" style="height:${Math.max(4, Math.round(counts[i] / max * 100))}%"></div>
        <span class="dc-blbl">${L[wk]}</span></div>`;
  }).join('');
  return `<div class="dc-card">
      ${_dcHead('▤', 'indigo', 'Effectif présent', 'Présences — 7 jours', `<span class="dc-pill">moy. ${moy.toFixed(1)}</span>`)}
      <div class="dc-bars-wrap">
        <div class="dc-bars">${bars}</div>
        <div class="dc-bars-foot">
          <div class="dc-legend"><span><i class="dc-sw" style="background:#6366f1"></i>Semaine</span><span><i class="dc-sw" style="background:#22d3ee"></i>Week-end</span></div>
          <span class="dc-foot-note">pic ${L[new Date(days[peakI]).getDay()]} · ${counts[peakI]}</span>
        </div>
      </div></div>`;
}

function _dv2Incidents() {
  const m = _dv2Today().slice(0, 7);
  const list = DV2.data.incidents.filter(i => (i.date || '').startsWith(m));
  const ouverts = list.filter(i => !i.statut || i.statut === 'ouvert').length;
  const encours = list.filter(i => i.statut === 'en_cours').length;
  const resolus = list.length - ouverts - encours;
  const tot = list.length || 1;
  const aG = resolus / tot * 360, aA = encours / tot * 360;
  const s1 = aG, s2 = aG + aA;
  const grad = list.length
    ? `conic-gradient(#10b981 0 ${s1}deg, #f59e0b ${s1}deg ${s2}deg, #ef4444 ${s2}deg 360deg)`
    : 'conic-gradient(var(--v2-s-sub) 0 360deg)';
  const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
  const moisLbl = MOIS[parseInt(m.slice(5, 7), 10) - 1] || '';
  const dl = (c, name, n) => `<div class="dc-dl"><span class="dc-dl-dot" style="background:${c}"></span><span class="dc-dl-name">${name}</span><span class="dc-dl-num">${n}</span></div>`;
  const body = `<div class="dc-donut-body">
      <div class="dc-donut" style="background:${grad}"><div class="dc-donut-c"><b>${list.length}</b><small>total</small></div></div>
      <div class="dc-dleg">${dl('#ef4444', 'Ouverts', ouverts)}${dl('#f59e0b', 'En cours', encours)}${dl('#10b981', 'Résolus', resolus)}</div>
    </div>`;
  return `<div class="dc-card">${_dcHead('⚠', 'red', 'Suivi mensuel', 'Incidents du mois', `<span class="dc-pill dim">${moisLbl}</span>`)}${body}</div>`;
}

function _dv2Tiles() {
  const t = _dv2Today();
  const veh = DV2.data.planning.filter(p => p.date === t && p.vehicule).length;
  const midi = Object.values(DV2.data.presDay).filter(p => (p.statut || '') === 'present').length;
  const md = t.slice(5);
  const annivs = DV2.data.residents.filter(r => r.dob && r.dob.slice(5) === md);
  const rdv = DV2.data.residents.reduce((n, r) => n + ((r.sante?.rdv) || []).filter(v => v.date >= t && v.date <= _dv2Shift(7) && !v.fait).length, 0);
  const kpi = (c, ico, label, val, sub) => `<div class="dc-kpi" style="--dc-c:${c}">
      <div class="dc-kpi-top"><span class="dc-kpi-label">${_dv2Esc(label)}</span><span class="dc-kpi-ico">${ico}</span></div>
      <div class="dc-kpi-val">${val}</div><div class="dc-kpi-sub">${_dv2Esc(sub)}</div></div>`;
  return `<div class="dc-kpis">
    ${kpi('#6366f1', '🚐', 'Véhicules', veh, 'sorties du jour')}
    ${kpi('#10b981', '🍽️', 'Repas midi', midi, 'couverts')}
    ${kpi('#8b5cf6', '🎂', 'Anniversaires', annivs.length, annivs.length ? _dv2Nom(annivs[0]) : '—')}
    ${kpi('#22d3ee', '🩺', 'RDV médicaux', rdv, 'sous 7 jours')}
  </div>`;
}

function _dv2IncidentsTable() {
  const list = [...DV2.data.incidents].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  const head = _dcHead('▦', 'red', 'Registre', 'Incidents récents', list.length ? `<span class="dc-pill dim">${list.length} entrée${list.length > 1 ? 's' : ''}</span>` : '');
  if (!list.length) return `<div class="dc-card">${head}<div class="dc-empty">Aucun incident enregistré.</div></div>`;
  // Gravité réelle (faible/moderee/elevee/critique) → liseré + tonalité de badge.
  const GRAV = { critique: { c: '#dc2626', t: 'red' }, elevee: { c: '#ef4444', t: 'red' }, moderee: { c: '#f59e0b', t: 'amber' }, faible: { c: '#10b981', t: 'green' } };
  const STAT = { ouvert: 'indigo', en_cours: 'amber', resolu: 'green', clos: 'gray' };
  let nGrave = 0, nEnCours = 0;
  const rows = list.map(i => {
    const g = GRAV[i.gravite] || { c: 'transparent', t: 'gray' };
    if (i.gravite === 'elevee' || i.gravite === 'critique') nGrave++;
    if (i.statut === 'en_cours') nEnCours++;
    const stTone = STAT[i.statut] || 'indigo';
    const gLabel = DV2_GRAVITE[i.gravite] || i.gravite || '—';
    const sLabel = DV2_STATUT[i.statut] || i.statut || 'Ouvert';
    return `<div class="dc-trow2" style="--dc-c:${g.c}">
        <span class="dc-td-date">${_dv2Date(i.date)}</span>
        <span class="dc-td-res">${_dv2Esc(i.residentName || '—')}</span>
        <span class="dc-td-type">${_dv2Esc(i.type || i.titre || '—')}</span>
        <span><span class="dc-badge dc-b-${g.t}"><span class="d"></span>${_dv2Esc(gLabel)}</span></span>
        <span><span class="dc-badge dc-b-${stTone}">${_dv2Esc(sLabel)}</span></span></div>`;
  }).join('');
  const foot = `<div class="dc-table-foot"><span class="l">${nGrave} grave${nGrave > 1 ? 's' : ''} · ${nEnCours} en cours</span><a class="dc-pill dim" href="eig.html" style="text-decoration:none">Voir tout →</a></div>`;
  return `<div class="dc-card">${head}
      <div class="dc-thead"><span class="dc-th">Date</span><span class="dc-th">Résident</span><span class="dc-th">Type</span><span class="dc-th">Gravité</span><span class="dc-th">Statut</span></div>
      ${rows}${foot}</div>`;
}

function _dv2Agenda() {
  const t = _dv2Today();
  const evs = DV2.data.planning.filter(p => p.date === t)
    .sort((a, b) => (a.heure || '').localeCompare(b.heure || '')).slice(0, 6);
  const body = evs.length ? evs.map(e => `<div class="v2-tl">
      <div class="v2-tl-h">${_dv2Esc(e.heure || '—')}</div>
      <div class="v2-tl-body"><span class="v2-tl-dot" style="background:#818cf8"></span>
        <div class="v2-row-title">${_dv2Esc(e.titre || e.type || 'Événement')}</div>
        <div class="v2-row-meta">${_dv2Esc(e.residentName || e.lieu || '')}</div></div></div>`).join('')
    : _dv2Empty('Aucun événement aujourd\'hui.');
  return _dv2Card({ title: 'Agenda du jour', icon: '🕐', color: '#22d3ee', body });
}

function _dv2Satisfaction() {
  const list = DV2.data.satisfaction || [];
  if (!list.length) return _dv2Card({ title: 'Satisfaction résidents', icon: '★', color: '#10b981', body: _dv2Empty('Aucun questionnaire.') });
  let sum = 0, n = 0;
  list.forEach(q => Object.values(q.reponses || q.answers || {}).forEach(v => { const x = Number(v); if (x >= 1 && x <= 4) { sum += x; n++; } }));
  const avg = n ? sum / n : 0;
  const col = avg >= 3 ? '#10b981' : avg >= 2 ? '#f59e0b' : '#ef4444';
  const body = `<div style="display:flex;align-items:flex-end;gap:12px">
      <span class="v2-gauge-val">${avg.toFixed(1)}</span>
      <span style="color:var(--v2-indigo-pale);font-size:13px;padding-bottom:6px">/ 4</span></div>
    <div class="v2-bar" style="margin-top:12px"><span style="width:${Math.round(avg / 4 * 100)}%;background:${col}"></span></div>
    <div class="v2-row-meta" style="margin-top:8px">${list.length} questionnaire${list.length > 1 ? 's' : ''}</div>`;
  return _dv2Card({ title: 'Satisfaction résidents', icon: '★', color: '#10b981', body });
}

function _dv2Actions() {
  const b = (href, ico, label) => `<a class="dc-qa-btn" href="${href}"><span class="dc-qa-ico">${ico}</span><span class="dc-qa-txt">${_dv2Esc(label)}</span></a>`;
  const body = `<div class="dc-qa">
      ${b('journal.html', '📝', 'Nouvelle entrée')}${b('presences.html', '✓', 'Saisir présences')}
      ${b('planning.html', '📅', 'Ajouter événement')}${b('residents.html', '👤', 'Résidents')}</div>`;
  return `<div class="dc-card">${_dcHead('⚡', 'violet', 'Raccourcis', 'Accès rapides', '', true)}${body}</div>`;
}

const _DC_AV_GRADS = [
  'linear-gradient(145deg,#6366f1,#4f46e5)', 'linear-gradient(145deg,#22d3ee,#0891b2)',
  'linear-gradient(145deg,#8b5cf6,#7c3aed)', 'linear-gradient(145deg,#f59e0b,#d97706)',
  'linear-gradient(145deg,#10b981,#059669)', 'linear-gradient(145deg,#ef4444,#dc2626)'
];
function _dv2Equipe() {
  const t = _dv2Today();
  const list = (DV2.data.shifts || []).filter(s => s.date === t).slice(0, 6);
  const emp = id => DV2.data.employes.find(e => String(e.id) === String(id));
  const head = _dcHead('◍', 'cyan', 'Sur site', 'Équipe présente', list.length ? `<span class="dc-count">${list.length}</span>` : '');
  if (!list.length) return `<div class="dc-card">${head}<div class="dc-empty">Aucun poste planifié aujourd'hui.</div></div>`;
  const rows = list.map((s, idx) => {
    const e = emp(s.employeId || s.employe_id);
    const nom = e ? `${e.prenom || ''} ${e.nom || ''}`.trim() : (s.employeNom || 'Salarié');
    const ini = (((e && e.prenom) || nom || '?')[0] || '?').toUpperCase() + (((e && e.nom) || '')[0] || '').toUpperCase();
    return `<div class="dc-trow"><span class="dc-av" style="background:${_DC_AV_GRADS[idx % _DC_AV_GRADS.length]}">${_dv2Esc(ini || '?')}</span>
        <span class="dc-team-name">${_dv2Esc(nom)}</span><span class="dc-presence"><span class="pd"></span>présent</span></div>`;
  }).join('');
  return `<div class="dc-card">${head}<div class="dc-team">${rows}</div></div>`;
}

function _dv2Medication() {
  const t = _dv2Today();
  let prevus = 0;
  DV2.data.residents.forEach(r => { if (r.statut === 'sorti') return;
    ((r.sante?.traitements) || []).forEach(x => { if (!x.fin || x.fin >= t) prevus += ((x.moments || []).length || 1); }); });
  // Prises effectivement tracées ce jour (table med_distrib) : forme tolérante
  const D = DV2.data.medDistrib || {};
  let faits = 0;
  const compte = v => { if (!v) return; if (Array.isArray(v)) faits += v.filter(Boolean).length;
    else if (typeof v === 'object') Object.values(v).forEach(x => { if (x === true || x === 'donne' || x?.statut === 'donne') faits++; });
    else if (v === true || v === 'donne') faits++; };
  Object.values(D).forEach(compte);
  faits = Math.min(faits, prevus);
  const pct = prevus ? Math.round(faits / prevus * 100) : 0;
  const body = prevus ? `<div class="v2-bar"><span style="width:${pct}%;background:#ec4899"></span></div>
      <div class="v2-row-meta" style="margin-top:8px">${faits}/${prevus} prise${prevus > 1 ? 's' : ''} administrée${faits > 1 ? 's' : ''} aujourd'hui</div>`
    : _dv2Empty('Aucun traitement actif.');
  return _dv2Card({ title: 'Plan de médication', icon: '💊', color: '#ec4899', meta: prevus ? `${faits}/${prevus}` : '', body });
}

// Miroir de RV2_REGIMES (js/resident-v2.js), que cette page ne charge pas.
const DV2_REGIMES = {
  vegetarien: 'Végétarien', sansporc: 'Sans porc', halal: 'Halal', casher: 'Casher',
  diabetique: 'Diabétique', hyposode: 'Hyposodé', hypocalorique: 'Hypocalorique', autre: 'Autre'
};

function _dv2Regimes() {
  const alg = [], reg = {};
  DV2.data.residents.forEach(r => { if (r.statut === 'sorti') return;
    if ((r.allergies || '').trim()) alg.push(_dv2Nom(r));
    // r.regime est un OBJET { type, autreLabel, texture, allergiesAlim, notes }
    // (voir saveRegime, js/repas.js:600). Le traiter comme du texte levait un
    // TypeError dès le premier résident : toute la carte basculait en
    // « Indisponible », ce qui ressemblait à un manque de données.
    const rg = r.regime || {};
    const g = rg.type && rg.type !== 'normal'
      ? (rg.type === 'autre' && rg.autreLabel ? rg.autreLabel : (DV2_REGIMES[rg.type] || rg.type))
      : '';
    if (g) reg[g] = (reg[g] || 0) + 1; });
  const chips = Object.entries(reg).map(([k, v]) => `<span class="v2-badge v2-b-warn">${_dv2Esc(k)} · ${v}</span>`).join(' ');
  const body = (chips || alg.length) ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${chips}
      ${alg.length ? `<span class="v2-badge v2-b-danger">Allergies · ${alg.length}</span>` : ''}</div>
      ${alg.length ? `<div class="v2-row-meta" style="margin-top:8px">${_dv2Esc(alg.slice(0, 3).join(', '))}${alg.length > 3 ? '…' : ''}</div>` : ''}`
    : _dv2Empty('Aucun régime ni allergie signalés.');
  return _dv2Card({ title: 'Régimes & allergies', icon: '🍽', color: '#f59e0b', body });
}

function _dv2Occupation() {
  const ch = DV2.data.chambres || [];
  if (!ch.length) return _dv2Card({ title: 'Occupation par unité', icon: '🏠', color: '#10b981', body: _dv2Empty('Aucune chambre déclarée.') });
  const par = {};
  ch.forEach(c => { const u = c.unite || 'Sans unité';
    par[u] = par[u] || { cap: 0, occ: 0 }; par[u].cap += (c.capacite || 1); });
  DV2.data.residents.filter(r => r.statut !== 'sorti' && r.chambre).forEach(r => {
    const c = ch.find(x => String(x.nom) === String(r.chambre));
    const u = c ? (c.unite || 'Sans unité') : 'Sans unité';
    par[u] = par[u] || { cap: 0, occ: 0 }; par[u].occ++; });
  const body = Object.entries(par).map(([u, v]) => {
    const pct = v.cap ? Math.round(v.occ / v.cap * 100) : 0;
    const col = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span class="v2-row-title">${_dv2Esc(u)}</span>
        <span style="margin-left:auto" class="v2-badge v2-b-neutral">${v.occ}/${v.cap}</span></div>
      <div class="v2-bar v2-bar-sm"><span style="width:${Math.min(100, pct)}%;background:${col}"></span></div></div>`;
  }).join('');
  return _dv2Card({ title: 'Occupation par unité', icon: '🏠', color: '#10b981', body });
}

function _dv2Meteo() {
  const days = []; for (let i = 6; i >= 0; i--) days.push(_dv2Shift(-i));
  const unites = [...new Set((DV2.data.chambres || []).map(c => c.unite).filter(Boolean))];
  if (!unites.length) return _dv2Card({ title: 'Météo du foyer — 7 jours', icon: '🌤', color: '#22d3ee', body: _dv2Empty('Aucune unité déclarée dans les chambres.') });
  const C = { calme: '#10b981', tendu: '#f59e0b', difficile: '#ef4444' };
  const at = (u, d) => (DV2.data.climat || []).find(c => c.unite === u && c.date === d);
  const body = `<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:11.5px">
      <tr><td></td>${days.map(d => `<td style="padding:0 6px 6px;color:var(--v2-t8);text-align:center">${d.slice(8)}</td>`).join('')}</tr>
      ${unites.map(u => `<tr><td style="padding:4px 12px 4px 0;color:var(--v2-t4);white-space:nowrap">${_dv2Esc(u)}</td>
        ${days.map(d => { const c = at(u, d);
          return `<td style="padding:3px"><div title="${_dv2Esc(u + ' — ' + d + (c ? ' : ' + c.niveau : ' : non renseigné'))}" style="width:26px;height:22px;border-radius:6px;background:${c ? C[c.niveau] + '99' : 'rgba(255,255,255,.05)'}"></div></td>`;
        }).join('')}</tr>`).join('')}
    </table></div>
    <div style="display:flex;gap:14px;margin-top:10px;font-size:11px;color:var(--v2-t7)">
      ${Object.entries(C).map(([k, v]) => `<span><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${v};margin-right:5px"></span>${k}</span>`).join('')}
    </div>`;
  return _dv2Card({ title: 'Météo du foyer — 7 jours', icon: '🌤', color: '#22d3ee', body });
}

function _dv2CongesAValider() {
  const list = DV2.data.conges.filter(c => c.statut === 'en_attente').slice(0, 5);
  const body = list.length ? list.map(c => `<div class="v2-row">
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(c.employeNom || 'Salarié')}</div>
        <div class="v2-row-meta">${_dv2Date(c.debut)} → ${_dv2Date(c.fin)}</div></div>
      <span class="v2-badge v2-b-warn">${_dv2Esc(c.type || 'CP')}</span></div>`).join('')
    : _dv2Empty('Aucune demande en attente.');
  return _dv2Card({ title: 'Congés à valider', icon: '🗓', color: '#f59e0b', meta: list.length ? `${list.length}` : '', body });
}

function _dv2Formations() {
  const t = _dv2Today();
  const list = (DV2.data.formations || []).filter(f => (f.date || f.dateDebut || '') >= t)
    .sort((a, b) => ((a.date || a.dateDebut || '')).localeCompare(b.date || b.dateDebut || '')).slice(0, 5);
  const body = list.length ? list.map(f => `<div class="v2-row">
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(f.intitule || f.titre || 'Formation')}</div>
        <div class="v2-row-meta">${_dv2Date(f.date || f.dateDebut)}</div></div>
      ${f.participants ? `<span class="v2-badge v2-b-info">${(f.participants || []).length || f.participants}</span>` : ''}</div>`).join('')
    : _dv2Empty('Aucune formation à venir.');
  return _dv2Card({ title: 'Formations à venir', icon: '🎓', color: '#16a34a', body });
}

function _dv2Echeances() {
  const t = _dv2Today();
  const list = DV2.data.echeances.filter(e => !e.done && e.date)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 5);
  const body = list.length ? list.map(e => { const j = _dv2Days(t, e.date);
    return `<div class="v2-row">
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(e.libelle || 'Échéance')}</div>
        <div class="v2-row-meta">${_dv2Esc(e.residentName || 'Établissement')} · ${_dv2Date(e.date)}</div></div>
      <span class="v2-badge ${j < 0 ? 'v2-b-danger' : j <= 30 ? 'v2-b-warn' : 'v2-b-ok'}">${j < 0 ? Math.abs(j) + ' j retard' : 'dans ' + j + ' j'}</span></div>`;
  }).join('') : _dv2Empty('Aucune échéance en cours.');
  return _dv2Card({ title: 'Échéances', icon: '⏳', color: '#818cf8', body });
}

function _dv2Stocks() {
  const list = (DV2.data.inventaire || []).filter(i => i.seuilAlerte != null || i.seuil_alerte != null);
  const niv = i => { const s = i.seuilAlerte ?? i.seuil_alerte, q = i.quantite ?? 0;
    if (q <= s / 2) return ['Critique', 'v2-b-danger']; if (q <= s) return ['Bas', 'v2-b-warn']; return ['OK', 'v2-b-ok']; };
  const bas = list.filter(i => { const s = i.seuilAlerte ?? i.seuil_alerte; return (i.quantite ?? 0) <= s; }).slice(0, 5);
  const body = bas.length ? bas.map(i => { const [l, c] = niv(i);
    return `<div class="v2-row"><div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(i.nom)}</div>
      <div class="v2-row-meta">${i.quantite ?? 0} en stock</div></div><span class="v2-badge ${c}">${l}</span></div>`; }).join('')
    : _dv2Empty(list.length ? 'Tous les stocks sont au niveau.' : 'Aucun seuil d\'alerte défini.');
  return _dv2Card({ title: 'Stocks', icon: '📦', color: '#f59e0b', meta: bas.length ? `${bas.length} à réappro.` : '', body });
}

function _dv2Maintenance() {
  const list = (DV2.data.interventions || []).filter(i => i.statut !== 'termine' && i.statut !== 'cloture').slice(0, 5);
  const body = list.length ? list.map(i => `<div class="v2-row">
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(i.titre || i.objet || 'Intervention')}</div>
        <div class="v2-row-meta">${_dv2Esc(i.lieu || i.type || '')}</div></div>
      <span class="v2-badge v2-b-warn">${_dv2Esc(i.statut || 'en cours')}</span></div>`).join('')
    : _dv2Empty('Aucune intervention en cours.');
  return _dv2Card({ title: 'Maintenance', icon: '🔧', color: '#8b5cf6', body });
}

function _dv2Activites() {
  const t = _dv2Today(), fin = _dv2Shift(7);
  const list = (DV2.data.activites || []).filter(a => (a.date || '') >= t && (a.date || '') <= fin)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 5);
  const body = list.length ? list.map(a => `<div class="v2-row">
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(a.nom || a.titre || 'Activité')}</div>
        <div class="v2-row-meta">${_dv2Date(a.date)}</div></div></div>`).join('')
    : _dv2Empty('Aucune activité cette semaine.');
  return _dv2Card({ title: 'Activités & sorties', icon: '🎨', color: '#22d3ee', body });
}

function _dv2Annonces() {
  const list = DV2.data.annonces || [];
  const body = list.length ? list.slice(0, 4).map(a => `<div class="v2-row">
      <div style="flex:1;min-width:0"><div class="v2-row-title">${a.epingle ? '📌 ' : ''}${_dv2Esc(a.titre)}</div>
        <div class="v2-row-meta">${_dv2Esc(a.service || a.auteur || '')} · ${_dv2Date(a.date)}</div></div></div>`).join('')
    : _dv2Empty('Aucune annonce publiée.');
  return _dv2Card({ title: 'Annonces internes', icon: '📣', color: '#6366f1', body });
}

// L'aperçu « Résidents » est masqué pour l'encadrement (admin, RH, chef de service) :
// cette carte sert surtout aux référents. Les éducateurs référents gardent « Mes référés ».
function _dv2CacheApercuResidents() {
  try {
    if (typeof Auth === 'undefined') return false;
    if (Auth.isRH && Auth.isRH()) return true;        // couvre admin + rh
    if (Auth.isAdmin && Auth.isAdmin()) return true;
    const s = Auth.getSession ? (Auth.getSession() || {}) : {};
    const f = (s.fonction || '').toLowerCase();
    if (f.includes('chef') && f.includes('service')) return true;   // « Chef de service » (fonction)
    return false;
  } catch (e) { return false; }
}

function _dv2Residents() {
  const actifs = DV2.data.residents.filter(r => r.statut !== 'sorti');
  const mine = _dv2MesReferes(actifs);          // null = compte voyant tout l'établissement
  const list = mine || actifs;
  const titre = mine ? 'Mes référés — aperçu' : 'Résidents — aperçu';
  if (!list.length) return _dv2Card({ title: titre, icon: '👤', color: '#10b981',
    body: _dv2Empty(mine ? "Vous n'êtes référent d'aucun résident." : 'Aucun résident.') });
  const S = { present: ['Présent', 'v2-b-ok'], absent: ['Absent', 'v2-b-danger'], rdv: ['RDV ext.', 'v2-b-info'],
              sortie: ['Sortie', 'v2-b-info'], hopital: ['Hôpital', 'v2-b-warn'] };
  const body = `<div class="v2-g v2-g4" style="gap:10px">${list.map(r => {
    const p = DV2.data.presDay[r.id]; const st = S[p?.statut] || ['Non saisi', 'v2-b-neutral'];
    const col = r.color || '#818cf8';
    return `<a class="v2-sub-card" href="resident.html?id=${encodeURIComponent(r.id)}" style="display:flex;align-items:center;gap:9px;text-decoration:none">
      <span class="v2-av v2-av-sm" style="background:${col}">${_dv2Esc(_dv2Ini(r).toUpperCase())}</span>
      <span style="flex:1;min-width:0"><span class="v2-row-title" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_dv2Esc(_dv2Nom(r))}</span>
        <span class="v2-row-meta">${r.chambre ? 'Ch. ' + _dv2Esc(r.chambre) : '—'}</span></span>
      <span class="v2-badge ${st[1]}">${st[0]}</span></a>`;
  }).join('')}</div>`;
  return _dv2Card({ title: titre, icon: '👤', color: '#10b981',
    meta: mine ? `${list.length} référé${list.length > 1 ? 's' : ''}` : `${list.length}`, body });
}

function _dv2Vehicules() {
  const list = DV2.data.vehicules || [];
  if (!list.length) return _dv2Card({ title: 'Flotte véhicules', icon: '🚐', color: '#6366f1', body: _dv2Empty('Aucun véhicule déclaré.') });
  const t = _dv2Today();
  const sortis = new Set(DV2.data.planning.filter(p => p.date === t && p.vehicule).map(p => String(p.vehicule)));
  const body = list.map(v => {
    const nom = typeof v === 'string' ? v : (v.nom || v.libelle || 'Véhicule');
    const dehors = sortis.has(String(nom)) || sortis.has(String(v.id));
    const km = (typeof v === 'object' && (v.kilometrage ?? v.km)) || null;
    return `<div class="v2-row">
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(nom)}</div>
        <div class="v2-row-meta">${typeof v === 'object' && v.immatriculation ? _dv2Esc(v.immatriculation) + ' · ' : ''}${km ? km + ' km' : 'kilométrage non suivi'}</div></div>
      <span class="v2-badge ${dehors ? 'v2-b-warn' : 'v2-b-ok'}">${dehors ? 'Sorti' : 'Disponible'}</span></div>`;
  }).join('');
  return _dv2Card({ title: 'Flotte véhicules', icon: '🚐', color: '#6366f1', meta: `${list.length}`, body });
}

function _dv2RdvSemaine() {
  const t = _dv2Today(), fin = _dv2Shift(7), out = [];
  DV2.data.residents.forEach(r => ((r.sante?.rdv) || []).forEach(v => {
    if (v.date >= t && v.date <= fin && !v.fait) out.push({ r, v });
  }));
  out.sort((a, b) => (a.v.date || '').localeCompare(b.v.date || ''));
  const body = out.length ? out.slice(0, 6).map(({ r, v }) => `<div class="v2-row">
      <span class="v2-av v2-av-sm" style="background:${r.color || '#ec4899'}">${_dv2Esc(_dv2Ini(r).toUpperCase())}</span>
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_dv2Esc(v.type || 'Rendez-vous')}</div>
        <div class="v2-row-meta">${_dv2Esc(_dv2Nom(r))} · ${_dv2Date(v.date)}${v.heure ? ' à ' + _dv2Esc(v.heure) : ''}</div></div>
      ${v.praticien ? `<span class="v2-badge v2-b-neutral">${_dv2Esc(v.praticien)}</span>` : ''}</div>`).join('')
    : _dv2Empty('Aucun rendez-vous médical sous 7 jours.');
  return _dv2Card({ title: 'RDV médicaux — 7 jours', icon: '🩺', color: '#ec4899', meta: out.length ? `${out.length}` : '', body });
}

function _dv2PlanningSemaine() {
  const days = []; for (let i = 0; i < 7; i++) days.push(_dv2Shift(i));
  const L = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const shifts = DV2.data.shifts || [];
  if (!shifts.length) return _dv2Card({ title: 'Planning de la semaine', icon: '📆', color: '#818cf8', body: _dv2Empty('Aucun poste planifié.') });
  const par = d => shifts.filter(s => s.date === d);
  const body = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">
    ${days.map(d => { const n = par(d).length;
      return `<div style="text-align:center">
        <div style="font-size:10.5px;color:var(--v2-t8);margin-bottom:6px">${L[new Date(d).getDay()]} ${d.slice(8)}</div>
        <div class="v2-sub-card" style="padding:10px 4px;${n ? '' : 'border-color:rgba(239,68,68,.3)'}">
          <div class="v2-num" style="font-size:17px;color:${n ? 'var(--v2-t1)' : '#fca5a5'}">${n}</div>
          <div style="font-size:10px;color:var(--v2-t7);margin-top:2px">${n ? 'poste' + (n > 1 ? 's' : '') : 'découvert'}</div>
        </div></div>`; }).join('')}</div>`;
  return _dv2Card({ title: 'Planning de la semaine', icon: '📆', color: '#818cf8', body });
}

function _dv2Budget() {
  const env = DV2.data.enveloppes || [], dem = DV2.data.depenses || [];
  if (!env.length && !dem.length) return _dv2Card({ title: 'Dépenses du mois', icon: '💶', color: '#f59e0b', body: _dv2Empty('Aucun budget renseigné.') });
  const m = _dv2Today().slice(0, 7), parPoste = {};
  dem.filter(d => (d.date || '').startsWith(m)).forEach(d => {
    const c = d.categorie || d.poste || 'Autre';
    parPoste[c] = (parPoste[c] || 0) + (Number(d.montant) || 0);
  });
  const budgetDe = c => { const e = env.find(x => (x.categorie || x.nom) === c); return Number(e?.montant) || 0; };
  const entries = Object.entries(parPoste).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const body = entries.length ? entries.map(([c, v]) => {
    const b = budgetDe(c), pct = b ? Math.round(v / b * 100) : 0;
    const col = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span class="v2-row-title">${_dv2Esc(c)}</span>
        <span style="margin-left:auto" class="v2-row-meta">${v.toLocaleString('fr-FR')} €${b ? ' / ' + b.toLocaleString('fr-FR') + ' €' : ''}</span></div>
      ${b ? `<div class="v2-bar v2-bar-sm"><span style="width:${Math.min(100, pct)}%;background:${col}"></span></div>` : ''}</div>`;
  }).join('') : _dv2Empty('Aucune dépense ce mois-ci.');
  return _dv2Card({ title: 'Dépenses du mois', icon: '💶', color: '#f59e0b', body });
}

function _dv2Journal() {
  const list = [...(DV2.data.transmissions || [])]
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  if (!list.length) return '';
  const body = list.map(x => `<div class="v2-row">
      <span class="v2-av v2-av-sm" style="background:#22d3ee">${_dv2Esc((x.authorName || '?')[0].toUpperCase())}</span>
      <div style="flex:1;min-width:0">
        <div class="v2-row-title">${_dv2Esc(x.residentName || 'Établissement')}
          <span style="font-weight:400;color:var(--v2-t7)"> — ${_dv2Esc((x.content || '').slice(0, 90))}${(x.content || '').length > 90 ? '…' : ''}</span></div>
        <div class="v2-row-meta">${_dv2Esc(x.authorName || '')} · ${_dv2Date(x.date)}${x.shift ? ' · ' + _dv2Esc(x.shift) : ''}</div></div></div>`).join('');
  return `<div style="margin-top:14px">${_dv2Card({ title: 'Journal de bord — dernières transmissions', icon: '📋', color: '#22d3ee', body })}</div>`;
}
