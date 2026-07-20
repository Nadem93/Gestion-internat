// ══════════════════════════════════════════════════════════════════════════
// ACCUEIL V2 — reproduction de la maquette « Accueil - refonte (bento) »
// Ordre, couleurs et structure repris du fichier de design.
// Les tuiles conservent data-perm / data-module / admin-only / rh-only :
// le filtrage des droits existant s'applique sans modification.
// ══════════════════════════════════════════════════════════════════════════

const AV2 = { data: {} };
const _av2 = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
const _av2Today = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);

// Icônes de la maquette (traits, 24x24)
const IC = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.6 2.5-5.6 5.5-5.6s5.5 2 5.5 5.6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.6 0 4.5 1.8 4.5 5"/>',
  chat: '<path d="M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  journal: '<path d="M12 6.5 5 5v14l7 1.5 7-1.5V5z"/><path d="M12 6.5v14"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5.5 10v10h13V10"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.6" y2="16.6"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4a4 4 0 0 0-2-2z"/>',
  dollar: '<path d="M12 3v18"/><path d="M16 7.5c0-1.7-1.8-2.5-4-2.5s-4 .8-4 2.5 1.8 2.3 4 2.9 4 1.2 4 3.1-1.8 2.5-4 2.5-4-.8-4-2.5"/>',
  alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4"/><path d="M2 16h20"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.1-2.5 3.6"/><path d="M12 17.5h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 13.5"/>'
};
const _svg = (d, c, sz) => `<svg width="${sz || 21}" height="${sz || 21}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// Ordre, libellés et couleurs repris tels quels de la maquette.
// href / perm / module proviennent de la page V1 (droits inchangés).
const AV2_MODULES = [
  { label: 'Tableau de bord', c: '#6366f1', ic: 'grid', href: 'dashboard.html', perm: 'view_dashboard' },
  { label: 'Résidents', c: '#0891b2', ic: 'users', href: 'residents.html', perm: 'view_residents', module: 'residents', badge: true },
  { label: 'Transmissions', c: '#3b82f6', ic: 'chat', href: 'transmissions.html', perm: 'access_journal', badge: true, badgeCls: 'tr-badge' },
  { label: 'Alertes', c: '#ef4444', ic: 'bell', href: 'alertes.html', badge: true, badgeCls: 'al-badge' },
  { label: 'Journal de bord', c: '#059669', ic: 'journal', href: 'journal.html', perm: 'access_journal', module: 'journal', badge: true },
  { label: 'Agenda', c: '#d97706', ic: 'cal', href: 'planning.html', perm: 'access_presences', module: 'planning', badge: true },
  { label: 'Vie quotidienne', c: '#0d9488', ic: 'home', href: 'vie-quotidienne.html', perm: 'access_presences,view_residents,access_journal,access_activites,access_medicaments' },
  { label: 'Vie sociale (CVS)', c: '#16a34a', ic: 'users', href: 'cvs.html', perm: 'access_cvs', module: 'ppe' },
  { label: 'Dossiers & suivi', c: '#b45309', ic: 'folder', href: 'dossiers.html', perm: 'access_ppe,view_residents,access_documents,access_repertoire,view_incidents,access_cvs,access_admissions', module: 'ppe', badge: true },
  { label: 'Portail', c: '#818cf8', ic: 'gear', href: 'pilotage.html', perm: 'access_planning_equipe,access_conges,access_notes,access_messages,access_documentation,access_budget,access_paie,access_entretiens,access_annuaire,access_facturation,access_formations', module: 'portail', badge: true },
  { label: 'Interventions', c: '#14b8a6', ic: 'wrench', href: 'interventions.html', perm: 'access_interventions' },
  { label: 'RH', c: '#a855f7', ic: 'users', href: 'rh.html', perm: 'access_paie,access_employes,manage_users,access_entretiens' },
  { label: 'Finance', c: '#22c55e', ic: 'dollar', href: 'finance.html', only: 'admin-only' },
  { label: 'Administration', c: '#94a3b8', ic: 'gear', href: 'admin.html', only: 'admin-only' },
  // Absente de la maquette mais indispensable : bascule d'établissement (admin)
  { label: 'Établissement', c: '#6f86ab', ic: 'home', href: 'javascript:showEtabSelection()', only: 'admin-only' }
];

const AV2_ACTIONS = [
  { title: 'Signaler un incident', sub: 'Déclaration immédiate', c: '#e11d48', ic: 'alert', onclick: "openModal('modalIncident')" },
  { title: 'Demander une intervention', sub: 'Technique / maintenance', c: '#0d9488', ic: 'wrench', onclick: "openModal('modalIntervention')" },
  { title: 'Réserver un véhicule', sub: 'Flotte du foyer', c: '#6366f1', ic: 'car', href: 'vehicules.html' },
  { title: 'Aide', sub: 'Guide & support', c: '#14b8a6', ic: 'help', href: 'aide.html' }
];

function _av2Rel(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const j = Math.floor(s / 86400);
  return j === 1 ? 'hier' : `il y a ${j} j`;
}

// ─── Rendu ────────────────────────────────────────────────────────────────
async function initAccueilV2() {
  const host = document.getElementById('accV2');
  if (!host) return;
  const call = async (fn, ...a) => { try { return (typeof window[fn] === 'function') ? await window[fn](...a) : null; } catch (e) { console.warn('[accV2]', fn, e); return null; } };
  const t = _av2Today();

  host.innerHTML = _av2Hero() + _av2Kpis(true) + _av2Grid() + `<div id="accV2Bas" style="margin-top:16px"></div>`;
  if (typeof applyPermissions === 'function') { try { applyPermissions(); } catch (e) { console.warn(e); } }

  const [presDay, incidents, planning, shifts, transmissions, journal, conges] = await Promise.all([
    call('sbGetPresencesForDate', t), call('sbGetIncidents'), call('sbGetPlanningEvents'),
    call('sbGetPeShifts'), call('sbGetTransmissions'), call('sbGetJournalEntries'), call('sbGetConges')
  ]);
  AV2.data = { presDay: presDay || {}, incidents: incidents || [], planning: planning || [], shifts: shifts || [],
    transmissions: transmissions || [], journal: journal || [], conges: conges || [] };

  const k = document.getElementById('accV2Kpis'); if (k) k.outerHTML = _av2Kpis(false);
  const b = document.getElementById('accV2Bas');
  if (b) b.innerHTML = `<div class="v2-g v2-g2">${_av2Jour()}${_av2Activite()}</div>
    <div class="v2-sep" style="margin-top:22px"><span class="v2-sep-txt">Actions rapides</span><span class="v2-sep-line"></span></div>
    ${_av2Actions()}`;
}

function _av2Hero() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  let etab = ''; try { const e = (typeof getCurrentEtab === 'function') ? getCurrentEtab() : null; etab = e?.nom || ''; } catch (_) {}
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `<div style="margin-bottom:22px">
    <div class="v2-hero-eyebrow">${_av2(d)}${etab ? ' · ' + _av2(etab) : ''}</div>
    <h1 class="v2-hero-h1">Bonjour, ${_av2(s?.prenom || s?.username || '')}</h1></div>`;
}

function _av2Kpis(vide) {
  const D = AV2.data, t = _av2Today();
  const v = x => vide ? '—' : x;
  const K = [
    { n: v(Object.values(D.presDay || {}).filter(p => (p.statut || '') === 'present').length), l: 'Résidents présents', c: '#22d3ee', ic: 'users' },
    { n: v((D.incidents || []).filter(i => i.statut && i.statut !== 'resolu' && i.statut !== 'clos').length), l: 'Incidents ouverts', c: '#ef4444', ic: 'alert' },
    { n: v((D.planning || []).filter(p => p.date === t).length), l: 'Événements du jour', c: '#818cf8', ic: 'cal' },
    { n: v((D.shifts || []).filter(s => s.date === t).length), l: 'En poste', c: '#10b981', ic: 'users' }
  ];
  return `<div class="v2-kgrid" id="accV2Kpis">${K.map(k => `<div class="v2-k">
    <span class="v2-k-ico" style="background:${k.c}22">${_svg(IC[k.ic], k.c, 22)}</span>
    <span><span class="v2-k-n">${k.n}</span><span class="v2-k-l">${k.l}</span></span></div>`).join('')}</div>`;
}

function _av2Grid() {
  return `<div class="v2-sep" style="margin:26px 0 14px"><span class="v2-sep-txt">Modules</span><span class="v2-sep-line"></span></div>
  <div class="v2-mods">${AV2_MODULES.map(m => `<a href="${m.href}" class="v2-mod${m.only ? ' ' + m.only : ''}"
      ${m.perm ? `data-perm="${m.perm}"` : ''} ${m.module ? `data-module="${m.module}"` : ''} style="--mc:${m.c}">
      <span class="v2-mod-ico" style="background:${m.c}22">${_svg(IC[m.ic], m.c, 23)}</span>
      <span class="v2-mod-lbl">${_av2(m.label)}</span>
      ${m.badge ? `<span class="notif-badge${m.badgeCls ? ' ' + m.badgeCls : ''} hidden">0</span>` : ''}
    </a>`).join('')}</div>`;
}

function _av2Jour() {
  const t = _av2Today();
  const C = ['#ef4444', '#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ec4899'];
  const evs = (AV2.data.planning || []).filter(p => p.date === t)
    .sort((a, b) => (a.heure || '').localeCompare(b.heure || '')).slice(0, 6);
  const body = evs.length ? evs.map((e, i) => `<div class="v2-ev">
      <div class="v2-ev-h">${_av2(e.heure || '—')}</div>
      <div class="v2-ev-bar" style="background:${C[i % C.length]}"></div>
      <div style="min-width:0"><div class="v2-row-title">${_av2(e.titre || e.type || 'Événement')}</div>
        <div class="v2-row-meta">${_av2(e.residentName || e.lieu || '')}</div></div></div>`).join('')
    : `<div style="font-size:12px;color:var(--v2-t7);padding:6px 0">Aucun événement prévu aujourd'hui.</div>`;
  return `<div class="v2-card"><div class="v2-card-head">
      <span class="v2-ico" style="background:#22d3ee22">${_svg(IC.cal, '#22d3ee', 17)}</span>
      <span class="v2-card-title">Aujourd'hui</span>
      <span class="v2-card-meta">${evs.length} événement${evs.length > 1 ? 's' : ''}</span></div>${body}</div>`;
}

function _av2Activite() {
  const f = [];
  (AV2.data.transmissions || []).forEach(x => f.push({ q: x.createdAt || x.date, c: '#3b82f6', ic: 'chat', text: `Nouvelle transmission — ${x.residentName || 'établissement'}` }));
  (AV2.data.incidents || []).forEach(x => f.push({ q: x.declaredAt || x.date, c: '#e11d48', ic: 'alert', text: `Incident déclaré — ${x.type || x.titre || ''}` }));
  (AV2.data.journal || []).forEach(x => f.push({ q: x.createdAt || x.date, c: '#059669', ic: 'journal', text: `Entrée journal — ${x.residentName || x.titre || ''}` }));
  (AV2.data.conges || []).filter(c => c.statut === 'accepte').forEach(x => f.push({ q: x.dateDemande || x.debut, c: '#f59e0b', ic: 'cal', text: `Congé validé — ${x.employeNom || ''}` }));
  f.sort((a, b) => String(b.q || '').localeCompare(String(a.q || '')));
  const body = f.length ? f.slice(0, 6).map(a => `<div class="v2-act">
      <span class="v2-act-ico" style="background:${a.c}22">${_svg(IC[a.ic], a.c, 17)}</span>
      <span class="v2-row-title" style="min-width:0">${_av2(a.text)}</span>
      <span class="v2-act-t">${_av2Rel(a.q)}</span></div>`).join('')
    : `<div style="font-size:12px;color:var(--v2-t7);padding:6px 0">Aucune activité récente.</div>`;
  return `<div class="v2-card"><div class="v2-card-head">
      <span class="v2-ico" style="background:#818cf822">${_svg(IC.clock, '#818cf8', 17)}</span>
      <span class="v2-card-title">Activité récente</span></div>${body}</div>`;
}

function _av2Actions() {
  return `<div class="v2-qgrid">${AV2_ACTIONS.map(a => {
    const tag = a.href ? 'a' : 'button';
    const at = a.href ? `href="${a.href}"` : `type="button" onclick="${a.onclick}"`;
    return `<${tag} class="v2-q" ${at}>
      <span class="v2-q-ico" style="background:${a.c}22">${_svg(IC[a.ic], a.c, 21)}</span>
      <span><span class="v2-q-t">${_av2(a.title)}</span><span class="v2-q-s">${_av2(a.sub)}</span></span></${tag}>`;
  }).join('')}</div>`;
}
