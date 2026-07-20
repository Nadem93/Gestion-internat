// ══════════════════════════════════════════════════════════════════════════
// ACCUEIL V2 — page d'entrée du collaborateur (design V2 sombre)
// Rendu dans #accV2. Les tuiles conservent data-perm / data-module / les
// classes admin-only & rh-only : le filtrage de droits existant continue
// de s'appliquer sans modification.
// ══════════════════════════════════════════════════════════════════════════

const AV2 = { data: {} };

function _av2Today() { return (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10); }
function _av2Esc(s) { return (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s); }
function _av2Card(o) {
  const { title, icon, color = '#818cf8', meta = '', body = '' } = o;
  return `<div class="v2-card">
    <div class="v2-card-head">
      ${icon ? `<span class="v2-ico" style="background:${color}22;color:${color}">${icon}</span>` : ''}
      <span class="v2-card-title">${_av2Esc(title)}</span>
      ${meta ? `<span class="v2-card-meta">${meta}</span>` : ''}
    </div>${body}</div>`;
}
function _av2Empty(t) { return `<div style="font-size:12px;color:var(--v2-t7);padding:6px 0">${_av2Esc(t)}</div>`; }

// Écart relatif lisible (« il y a 2 h »)
function _av2Rel(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const j = Math.floor(s / 86400);
  return j === 1 ? 'hier' : `il y a ${j} j`;
}

// Tuiles de modules — reprises à l'identique de la V1 (droits inclus)
const AV2_MODULES = [
  { href: 'dashboard.html', label: 'Tableau de bord', color: '#4f46e5', icon: '▦', perm: 'view_dashboard' },
  { href: 'residents.html', label: 'Résidents', color: '#0891b2', icon: '👥', perm: 'view_residents', module: 'residents', badge: true },
  { href: 'transmissions.html', label: 'Transmissions', color: '#3b82f6', icon: '💬', perm: 'access_journal', badge: true, badgeCls: 'tr-badge' },
  { href: 'alertes.html', label: 'Alertes', color: '#ef4444', icon: '🔔', badge: true, badgeCls: 'al-badge' },
  { href: 'journal.html', label: 'Journal de bord', color: '#059669', icon: '📓', perm: 'access_journal', module: 'journal', badge: true },
  { href: 'planning.html', label: 'Agenda', color: '#d97706', icon: '📅', perm: 'access_presences', module: 'planning', badge: true },
  { href: 'vie-quotidienne.html', label: 'Vie quotidienne', color: '#0d9488', icon: '🏠', perm: 'access_presences,view_residents,access_journal,access_activites,access_medicaments' },
  { href: 'cvs.html', label: 'Vie sociale (CVS)', color: '#16a34a', icon: '🤝', perm: 'access_cvs', module: 'ppe' },
  { href: 'dossiers.html', label: 'Dossiers & suivi', color: '#b45309', icon: '🗂', perm: 'access_ppe,view_residents,access_documents,access_repertoire,view_incidents,access_cvs,access_admissions', module: 'ppe', badge: true },
  { href: 'pilotage.html', label: 'Portail', color: '#6366f1', icon: '🧭', perm: 'access_planning_equipe,access_conges,access_notes,access_messages,access_documentation,access_budget,access_paie,access_entretiens,access_annuaire,access_facturation,access_formations', module: 'portail', badge: true },
  { href: 'interventions.html', label: 'Interventions', color: '#0d9488', icon: '🔧' },
  { href: 'rh.html', label: 'RH', color: '#818cf8', icon: '💼', only: 'rh-only' },
  { href: 'finance.html', label: 'Finance', color: '#16a34a', icon: '💶', only: 'admin-only' },
  { href: 'admin.html', label: 'Administration', color: '#94a3b8', icon: '⚙', only: 'admin-only' },
  { href: 'javascript:showEtabSelection()', label: 'Établissement', color: '#6f86ab', icon: '🏢', only: 'admin-only' }
];

// ─── Chargement ───────────────────────────────────────────────────────────
async function initAccueilV2() {
  const host = document.getElementById('accV2');
  if (!host) return;
  const call = async (fn, ...a) => { try { return (typeof window[fn] === 'function') ? await window[fn](...a) : null; } catch (e) { console.warn('[accV2]', fn, e); return null; } };
  const t = _av2Today();

  // La grille de modules ne dépend d'aucune donnée : on l'affiche tout de suite.
  host.innerHTML = _av2Head() + _av2Kpis(true) + _av2Grid() +
    `<div class="v2-g v2-g3" style="margin-top:14px" id="accV2Bas"></div>`;
  if (typeof applyPermissions === 'function') { try { applyPermissions(); } catch (e) { console.warn(e); } }

  const [presDay, incidents, planning, shifts, transmissions, journal, conges] = await Promise.all([
    call('sbGetPresencesForDate', t), call('sbGetIncidents'), call('sbGetPlanningEvents'),
    call('sbGetPeShifts'), call('sbGetTransmissions'), call('sbGetJournalEntries'), call('sbGetConges')
  ]);
  AV2.data = { presDay: presDay || {}, incidents: incidents || [], planning: planning || [],
    shifts: shifts || [], transmissions: transmissions || [], journal: journal || [], conges: conges || [] };

  // Réinjection avec les chiffres réels
  const kpi = document.getElementById('accV2Kpis');
  if (kpi) kpi.outerHTML = _av2Kpis(false);
  const bas = document.getElementById('accV2Bas');
  if (bas) bas.innerHTML = _av2Aujourdhui() + _av2Activite() + _av2Actions();
}

// ─── Sections ─────────────────────────────────────────────────────────────
function _av2Head() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  let etab = '';
  try { const e = (typeof getCurrentEtab === 'function') ? getCurrentEtab() : null; etab = e?.nom || ''; } catch (_) {}
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `<div><h1 class="v2-h1">Bonjour ${_av2Esc(s?.prenom || s?.username || '')}</h1>
    <div class="v2-sub">${d.charAt(0).toUpperCase() + d.slice(1)}${etab ? ' · ' + _av2Esc(etab) : ''}</div></div>`;
}

function _av2Kpis(vide) {
  const D = AV2.data, t = _av2Today();
  const n = (v) => vide ? '—' : v;
  const presents = vide ? '—' : Object.values(D.presDay).filter(p => (p.statut || '') === 'present').length;
  const inc = vide ? '—' : D.incidents.filter(i => i.statut && i.statut !== 'resolu' && i.statut !== 'clos').length;
  const evts = vide ? '—' : D.planning.filter(p => p.date === t).length;
  const poste = vide ? '—' : D.shifts.filter(s => s.date === t).length;
  const k = (v, l, c) => `<div class="v2-kpi"><div class="v2-kpi-val"${c && v !== '—' && v ? ` style="color:${c}"` : ''}>${n(v)}</div><div class="v2-kpi-lbl">${l}</div></div>`;
  return `<div class="v2-kpis" id="accV2Kpis" style="margin:18px 0 4px">
    ${k(presents, 'Résidents présents')}
    ${k(inc, 'Incidents ouverts', '#fca5a5')}
    ${k(evts, 'Événements du jour')}
    ${k(poste, 'Personnel en poste', '#5eead4')}
  </div>`;
}

function _av2Grid() {
  const tiles = AV2_MODULES.map(m => {
    const attrs = [
      `href="${m.href}"`,
      `class="v2-mod${m.only ? ' ' + m.only : ''}"`,
      m.perm ? `data-perm="${m.perm}"` : '',
      m.module ? `data-module="${m.module}"` : ''
    ].filter(Boolean).join(' ');
    return `<a ${attrs} style="--mc:${m.color}">
      <span class="v2-mod-ico" style="background:${m.color}22;color:${m.color}">${m.icon}</span>
      <span class="v2-mod-lbl">${_av2Esc(m.label)}</span>
      ${m.badge ? `<span class="notif-badge${m.badgeCls ? ' ' + m.badgeCls : ''} hidden">0</span>` : ''}
    </a>`;
  }).join('');
  return `<div class="v2-sep"><span class="v2-sep-txt">Modules</span><span class="v2-sep-line"></span></div>
    <div class="v2-mods">${tiles}</div>`;
}

function _av2Aujourdhui() {
  const t = _av2Today();
  const evs = (AV2.data.planning || []).filter(p => p.date === t)
    .sort((a, b) => (a.heure || '').localeCompare(b.heure || '')).slice(0, 6);
  const body = evs.length ? evs.map(e => `<div class="v2-tl">
      <div class="v2-tl-h">${_av2Esc(e.heure || '—')}</div>
      <div class="v2-tl-body"><span class="v2-tl-dot" style="background:#818cf8"></span>
        <div class="v2-row-title">${_av2Esc(e.titre || e.type || 'Événement')}</div>
        <div class="v2-row-meta">${_av2Esc(e.residentName || e.lieu || '')}</div></div></div>`).join('')
    : _av2Empty("Aucun événement prévu aujourd'hui.");
  return _av2Card({ title: "Aujourd'hui", icon: '🕐', color: '#22d3ee', meta: evs.length ? `${evs.length}` : '', body });
}

function _av2Activite() {
  const flux = [];
  (AV2.data.transmissions || []).forEach(x => flux.push({ q: x.createdAt || x.date, ico: '💬', c: '#3b82f6',
    txt: `Transmission — ${x.residentName || 'établissement'}`, who: x.authorName || '' }));
  (AV2.data.incidents || []).forEach(x => flux.push({ q: x.declaredAt || x.date, ico: '⚠', c: '#ef4444',
    txt: `Incident — ${x.type || x.titre || ''}`, who: x.declaredBy || '' }));
  (AV2.data.journal || []).forEach(x => flux.push({ q: x.createdAt || x.date, ico: '📓', c: '#10b981',
    txt: `Journal — ${x.residentName || x.titre || ''}`, who: x.authorName || x.auteur || '' }));
  (AV2.data.conges || []).filter(c => c.statut === 'accepte').forEach(x => flux.push({ q: x.dateDemande || x.debut, ico: '🗓', c: '#f59e0b',
    txt: `Congé validé — ${x.employeNom || ''}`, who: '' }));
  flux.sort((a, b) => String(b.q || '').localeCompare(String(a.q || '')));
  const body = flux.length ? flux.slice(0, 6).map(f => `<div class="v2-row">
      <span class="v2-ico" style="width:26px;height:26px;font-size:12px;background:${f.c}22;color:${f.c}">${f.ico}</span>
      <div style="flex:1;min-width:0"><div class="v2-row-title">${_av2Esc(f.txt)}</div>
        <div class="v2-row-meta">${_av2Esc(f.who)}${f.who && f.q ? ' · ' : ''}${_av2Rel(f.q)}</div></div></div>`).join('')
    : _av2Empty('Aucune activité récente.');
  return _av2Card({ title: 'Activité récente', icon: '📈', color: '#818cf8', body });
}

function _av2Actions() {
  const a = (onclick, href, label, ico, col) =>
    `<${href ? 'a' : 'button'} class="v2-qa" ${href ? `href="${href}"` : `onclick="${onclick}"`}>
      <span style="color:${col}">${ico}</span> ${label}</${href ? 'a' : 'button'}>`;
  const body = `<div class="v2-g v2-g2" style="gap:10px">
    ${a("openModal('modalIncident')", '', 'Signaler un incident', '⚠', '#fca5a5')}
    ${a("openModal('modalIntervention')", '', 'Demander une intervention', '🔧', '#5eead4')}
    ${a('', 'vehicules.html', 'Réserver un véhicule', '🚐', '#a5b4fc')}
    ${a('', 'aide.html', 'Aide', '❓', '#a5f3fc')}
  </div>`;
  return _av2Card({ title: 'Actions rapides', icon: '⚡', color: '#6366f1', body });
}
