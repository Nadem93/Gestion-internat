// ══════════════════════════════════════════════════════════════════════════
// ADMINISTRATION V2 — habillage de la coquille sombre d'admin.html
//
// Ce fichier ne fait QUE du rendu. Toute la logique métier (permissions,
// employés, établissements, Ségur, doublons, audit) reste dans js/admin.js
// et dans le script en ligne d'admin.html : on se contente d'appeler les
// fonctions existantes et de peindre le résultat dans la maquette V2.
//
// Dégradation douce : les trois tables ajoutées par migration-admin.sql
// (admin_agrements, admin_sauvegardes, admin_rgpd_registre) peuvent ne pas
// exister. Dans ce cas la lecture renvoie [], un console.warn nomme le
// fichier SQL, le panneau affiche un état vide explicite et la page reste
// pleinement utilisable ; seules les écritures sont refusées, avec un toast.
//
// Sécurité : cette page administre comptes, rôles et permissions. Aucun
// contrôle d'accès n'est desserré ici. js/app.js masque les .admin-only au
// seul DOMContentLoaded : comme on injecte du DOM après coup, admGuards()
// réapplique le masquage après chaque rendu. C'est un resserrement — jamais
// l'inverse : rien n'est jamais ré-affiché.
// ══════════════════════════════════════════════════════════════════════════

const ADM_SQL = 'migration-admin.sql';

const _ad = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
const _adAttr = s => (typeof escAttr === 'function') ? escAttr(s) : _ad(s);

// ─── Icônes (traits seuls, la couleur vient de currentColor) ──────────────
const ADM_IC = {
  stats: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  etablissement: '<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>',
  fonctions: '<path d="M9 11H3v10h6V11z"/><path d="M21 3h-6v18h6V3z"/>',
  employes: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  permissions: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  segur: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  compte: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  donnees: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><circle cx="7" cy="12" r="2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'
};

const _adSvg = (d, sz) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
  + 'stroke-linecap="round" stroke-linejoin="round"' + (sz ? ' style="width:' + sz + 'px;height:' + sz + 'px"' : '') + '>' + d + '</svg>';

// ─── Navigation latérale : groupes de la maquette ─────────────────────────
const ADM_NAV = [
  { grp: 'Pilotage',       items: [['stats', 'Statistiques'], ['segur', 'Ségur / Conformité']] },
  { grp: 'Configuration',  items: [['etablissement', 'Établissement'], ['fonctions', 'Catégories & objectifs']] },
  { grp: 'Comptes',        items: [['employes', 'Utilisateurs'], ['permissions', 'Permissions']] },
  { grp: 'Système',        items: [['donnees', 'Données'], ['compte', 'Mon compte']] }
];

// ══════════════════════════════════════════════════════════════════════════
// SÉCURITÉ — resserrement après rendu
// ══════════════════════════════════════════════════════════════════════════
// js/app.js masque les .admin-only / .superadmin-only une seule fois, au
// DOMContentLoaded. Tout DOM injecté ensuite échapperait à ce masquage : on
// le réapplique donc après chaque rendu. Uniquement du masquage : aucune
// branche ne remet un élément en display visible.
function admGuards() {
  try {
    if (typeof Auth === 'undefined') return;
    if (!Auth.isAdmin || !Auth.isAdmin()) {
      document.querySelectorAll('.admin-only').forEach(el => { el.style.display = 'none'; });
    }
    if (!Auth.isSuperAdmin || !Auth.isSuperAdmin()) {
      document.querySelectorAll('.superadmin-only').forEach(el => { el.style.display = 'none'; });
    }
  } catch (e) { console.warn('[admin-v2] garde-fous', e); }
}
window.admGuards = admGuards;

// ══════════════════════════════════════════════════════════════════════════
// LECTURES SUPABASE TOLÉRANTES (tables de migration-admin.sql)
// ══════════════════════════════════════════════════════════════════════════
const ADM_X = { agrements: [], sauvegardes: [], rgpd: [], missing: {} };

function _admTableAbsente(e) {
  const code = (e && e.code) || '';
  const msg = String((e && (e.message || e.details)) || '').toLowerCase();
  return code === '42P01' || code === 'PGRST205' ||
    msg.indexOf('does not exist') >= 0 || msg.indexOf('schema cache') >= 0;
}

async function _admLire(table, order) {
  if (typeof supabaseClient === 'undefined') {
    ADM_X.missing[table] = true;
    console.warn('[admin-v2] Supabase non chargé — « ' + table +' » lue vide.');
    return [];
  }
  try {
    let q = supabaseClient.from(table).select('*');
    if (order) q = q.order(order.col, { ascending: !!order.asc });
    const { data, error } = await q;
    if (error) {
      ADM_X.missing[table] = _admTableAbsente(error);
      console.warn('[admin-v2] lecture « ' + table + ' » impossible ('
        + (error.message || error.code) + ') — exécutez ' + ADM_SQL + '. Panneau vide.');
      return [];
    }
    ADM_X.missing[table] = false;
    return data || [];
  } catch (e) {
    ADM_X.missing[table] = true;
    console.warn('[admin-v2] lecture « ' + table + ' » impossible — exécutez ' + ADM_SQL, e);
    return [];
  }
}

function _admRefus(table, e) {
  const msg = ADM_X.missing[table]
    ? 'Table « ' + table + ' » absente — exécutez ' + ADM_SQL
    : 'Écriture refusée sur « ' + table + ' » — vérifiez ' + ADM_SQL;
  console.warn('[admin-v2] ' + msg, e || '');
  if (typeof toast === 'function') toast(msg, 'error');
}

// État vide, avec mention du SQL si la table manque
function _admVide(txt, table) {
  const suffixe = (table && ADM_X.missing[table])
    ? ' <span class="adm-note-sql">— exécutez <code>' + ADM_SQL + '</code></span>'
    : '';
  return '<div class="v2-blk-vide">' + _ad(txt) + suffixe + '</div>';
}

// Identifiant d'établissement courant (texte), pour les écritures
function _admEtabId() {
  try {
    if (typeof DB !== 'undefined' && DB._id) return String(DB._id());
    const e = (typeof getCurrentEtab === 'function') ? getCurrentEtab() : null;
    return e ? String(e.id) : '';
  } catch (_) { return ''; }
}

// ══════════════════════════════════════════════════════════════════════════
// COQUILLE — barre latérale, bandeau
// ══════════════════════════════════════════════════════════════════════════
function admRenderSideNav() {
  const el = document.getElementById('admSideNav');
  if (!el) return;
  el.innerHTML = ADM_NAV.map((g, i) => {
    const items = g.items.map(([tab, label]) =>
      '<button type="button" class="adm-nav" data-tab="' + tab + '" onclick="activateTab(\'' + tab + '\')">'
      + '<span class="adm-nav-ico">' + _adSvg(ADM_IC[tab] || ADM_IC.stats) + '</span>'
      + '<span class="adm-nav-l">' + _ad(label) + '</span>'
      + '</button>').join('');
    // Le premier groupe réutilise l'intitulé déjà présent dans le HTML
    const titre = i === 0 ? '' : '<div class="adm-side-grp">' + _ad(g.grp) + '</div>';
    return titre + items;
  }).join('');
  // Le libellé du premier groupe est celui du gabarit : on l'aligne
  const grp0 = document.querySelector('.adm-side-grp');
  if (grp0) grp0.textContent = ADM_NAV[0].grp;
  admGuards();
}

function admRenderSideUser() {
  const el = document.getElementById('admSideUser');
  if (!el) return;
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  if (!s) { el.innerHTML = ''; return; }
  const nom = [s.prenom, s.nom].filter(Boolean).join(' ') || s.username || 'Utilisateur';
  const ini = ((s.prenom || '')[0] || '') + ((s.nom || '')[0] || '') || (s.username || '?')[0];
  const roles = { admin: 'Administrateur', superadmin: 'Super-administrateur', rh: 'Ressources humaines' };
  el.innerHTML = '<span class="adm-side-av">' + _ad(ini.toUpperCase()) + '</span>'
    + '<span style="min-width:0;line-height:1.2">'
    + '<span class="adm-side-un" style="display:block">' + _ad(nom) + '</span>'
    + '<span class="adm-side-ur" style="display:block">' + _ad(roles[s.role] || s.role || '—') + '</span>'
    + '</span>';
}

// Appelé par activateTab() : habille la latérale et le bandeau
function adminV2OnTab(name) {
  document.querySelectorAll('#admSideNav .adm-nav').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === name);
    b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false');
  });
  const ico = document.getElementById('admTopIco');
  if (ico) ico.innerHTML = _adSvg(ADM_IC[name] || ADM_IC.stats);

  if (name === 'employes') admRenderUsers();

  // Badge contextuel du bandeau
  const badge = document.getElementById('atbBadge');
  if (badge) {
    let txt = '';
    if (name === 'employes') {
      const n = (typeof getEmployes === 'function' ? getEmployes() : []).length;
      txt = n ? n + ' fiche' + (n > 1 ? 's' : '') : '';
    } else if (name === 'permissions') {
      const n = (typeof getFonctions === 'function' ? getFonctions() : []).length;
      txt = n ? n + ' rôle' + (n > 1 ? 's' : '') : '';
    }
    if (txt) { badge.hidden = false; badge.className = 'v2-badge v2-b-info'; badge.textContent = txt; }
    else { badge.hidden = true; badge.textContent = ''; }
  }

  // Le bouton « Enregistrer » n'a de sens que sur les onglets à formulaire
  const save = document.getElementById('admSaveBtn');
  if (save) save.style.display = (name === 'etablissement' || name === 'compte') ? '' : 'none';

  admGuards();
}
window.adminV2OnTab = adminV2OnTab;

// Bouton « Enregistrer » du bandeau : délègue au formulaire de l'onglet actif
function admSaveCurrent() {
  const actif = document.querySelector('.adm-panel.active');
  const name = actif ? actif.id.replace('tab-', '') : 'stats';
  if (name === 'etablissement' && typeof saveSettings === 'function') { saveSettings(); return; }
  if (name === 'compte' && typeof saveUser === 'function') { saveUser(); return; }
  if (typeof toast === 'function') toast('Rien à enregistrer sur cet onglet', 'info');
}
window.admSaveCurrent = admSaveCurrent;

// ══════════════════════════════════════════════════════════════════════════
// ONGLET STATISTIQUES — appelé par refreshAllStats() via adminV2AfterStats
// ══════════════════════════════════════════════════════════════════════════
const ADM_MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const ADM_JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function _admNum(n) { return (n == null || isNaN(n)) ? '—' : String(n); }

function adminV2AfterStats(d) {
  d = d || {};
  try {
    admHero(d);
    admConnexions();
    admRepartition();
    admKpis(d);
    admActivite(d);
    admModules(d);
    admRenderAuditRecent();
    admSysteme(d);
  } catch (e) { console.warn('[admin-v2] rendu des statistiques', e); }
  admGuards();
}
window.adminV2AfterStats = adminV2AfterStats;

function admHero(d) {
  const residents = d.residents || [];
  const actifs = residents.filter(r => !r.dateSortie && (r.statut || 'present') !== 'sorti');
  const etab = (typeof getCurrentEtab === 'function') ? getCurrentEtab() : null;
  let capacite = Number(etab && etab.capacite) || 0;
  if (!capacite) {
    const s = (typeof getSettings === 'function') ? getSettings() : null;
    capacite = Number(s && s.capacite) || 0;
  }
  const occup = actifs.length;
  const pct = capacite > 0 ? Math.min(100, Math.round((occup / capacite) * 100)) : 0;

  const donut = document.getElementById('admHeroDonut');
  if (donut) donut.style.setProperty('--p', (pct / 100) + 'turn');
  const p = document.getElementById('admHeroPct');
  if (p) p.textContent = capacite > 0 ? pct + '%' : '—';
  const o = document.getElementById('admHeroOccup');
  if (o) o.innerHTML = capacite > 0
    ? _ad(occup) + '<small> / ' + _ad(capacite) + '</small>'
    : _ad(occup);

  const emps = (typeof getEmployes === 'function') ? getEmployes() : [];
  const perso = document.getElementById('admHeroPersonnel');
  if (perso) perso.textContent = _admNum(emps.filter(e => (e.statut || 'actif') === 'actif').length);

  // Entrées du mois courant
  const mois = new Date().toISOString().slice(0, 7);
  const entrees = residents.filter(r => String(r.dateEntree || '').slice(0, 7) === mois).length;
  const en = document.getElementById('admHeroEntrees');
  if (en) en.textContent = '+' + entrees;
}

// Connexions des 7 derniers jours (journal local ftr_login_history)
function admConnexions() {
  const el = document.getElementById('admConnexions');
  if (!el) return;
  let log = [];
  try { log = (typeof DB !== 'undefined' ? DB.get(DB.keys.loginHistory) : null) || []; } catch (_) { log = []; }
  const jours = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const n = log.filter(e => e.action === 'login' && String(e.date || '').slice(0, 10) === iso).length;
    jours.push({ l: ADM_JOURS[d.getDay()], n });
  }
  const max = Math.max(1, ...jours.map(j => j.n));
  el.innerHTML = jours.map(j => {
    const h = Math.max(4, Math.round((j.n / max) * 100));
    const c = j.n ? '#34d399' : 'rgba(255,255,255,.12)';
    return '<div class="adm-spark-c" title="' + _adAttr(j.n + ' connexion(s)') + '">'
      + '<span class="adm-spark-b" style="height:' + h + '%;background:' + c + '"></span>'
      + '<span class="adm-spark-l">' + _ad(j.l) + '</span></div>';
  }).join('');
}

// Répartition du personnel par fonction
function admRepartition() {
  const el = document.getElementById('admRepartition');
  if (!el) return;
  const emps = (typeof getEmployes === 'function') ? getEmployes() : [];
  if (!emps.length) { el.innerHTML = _admVide('Aucun salarié enregistré'); return; }
  const counts = {};
  emps.forEach(e => { const k = e.poste || e.fonction || 'Non renseigné'; counts[k] = (counts[k] || 0) + 1; });
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  el.innerHTML = rows.map(([nom, n]) => {
    const c = (typeof getPosteColor === 'function') ? getPosteColor(nom) : '#818cf8';
    return '<div class="adm-leg">'
      + '<span class="adm-leg-sq" style="background:' + _adAttr(c) + '"></span>'
      + '<span class="adm-leg-l">' + _ad(nom) + '</span>'
      + '<span class="adm-leg-n">' + n + '</span></div>';
  }).join('');
}

function admKpis(d) {
  const el = document.getElementById('admKpis');
  if (!el) return;
  const residents = (d.residents || []).filter(r => !r.dateSortie && (r.statut || 'present') !== 'sorti');
  const emps = (typeof getEmployes === 'function') ? getEmployes() : [];
  const incidents = (d.incidents || []).filter(i => (i.statut || '') !== 'clos' && (i.statut || '') !== 'traite');
  const semaine = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const journal = (d.journal || []).filter(e => String(e.date || '').slice(0, 10) >= semaine);

  const k = [
    { ic: ADM_IC.bed,   c: '#818cf8', n: residents.length, l: 'Résidents accueillis' },
    { ic: ADM_IC.users, c: '#22d3ee', n: emps.length,      l: 'Fiches salariés' },
    { ic: ADM_IC.book,  c: '#34d399', n: journal.length,   l: 'Entrées de journal (7 j)' },
    { ic: ADM_IC.alert, c: '#f59e0b', n: incidents.length, l: 'Incidents à traiter' }
  ];
  el.innerHTML = k.map(x =>
    '<div class="adm-k">'
    + '<span class="adm-k-ico" style="color:' + x.c + ';background:' + x.c + '1f">' + _adSvg(x.ic) + '</span>'
    + '<div class="adm-k-n">' + _admNum(x.n) + '</div>'
    + '<div class="adm-k-l">' + _ad(x.l) + '</div></div>').join('');
}

// Activité de la plateforme sur 6 mois (journal + incidents)
function admActivite(d) {
  const el = document.getElementById('admActivite');
  if (!el) return;
  const src = [].concat(d.journal || [], d.incidents || []);
  const mois = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - i);
    const key = dt.toISOString().slice(0, 7);
    mois.push({ key, l: ADM_MOIS[dt.getMonth()], n: src.filter(e => String(e.date || '').slice(0, 7) === key).length });
  }
  const max = Math.max(1, ...mois.map(m => m.n));
  el.innerHTML = mois.map(m => {
    const h = Math.max(3, Math.round((m.n / max) * 100));
    return '<div class="adm-chart-c">'
      + '<span class="adm-chart-v">' + m.n + '</span>'
      + '<span class="adm-chart-b" style="height:' + h + '%;background:linear-gradient(180deg,#818cf8,#4f46e5)"></span>'
      + '<span class="adm-chart-l">' + _ad(m.l) + '</span></div>';
  }).join('');
  const meta = document.getElementById('admActiviteMeta');
  if (meta) meta.textContent = src.length + ' évènement' + (src.length > 1 ? 's' : '');
}

// Modules les plus utilisés — volumétrie réelle des données chargées
function admModules(d) {
  const el = document.getElementById('admModules');
  if (!el) return;
  const mods = [
    { l: 'Journal de bord',  n: (d.journal || []).length,      c: '#818cf8' },
    { l: 'Incidents',        n: (d.incidents || []).length,    c: '#f59e0b' },
    { l: 'Projets (PPE)',    n: (d.ppe || []).length,          c: '#34d399' },
    { l: 'Documents',        n: (d.docs || []).length,         c: '#22d3ee' },
    { l: 'Messages',         n: (d.messages || []).length,     c: '#a78bfa' },
    { l: 'Satisfaction',     n: (d.satisfaction || []).length, c: '#ec4899' }
  ].sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...mods.map(m => m.n));
  el.innerHTML = mods.map(m =>
    '<div><div class="adm-use-h">'
    + '<span class="adm-use-l">' + _ad(m.l) + '</span>'
    + '<span class="adm-use-n">' + m.n + '</span></div>'
    + '<div style="height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden">'
    + '<div style="height:100%;border-radius:99px;width:' + Math.round((m.n / max) * 100) + '%;background:' + m.c + '"></div>'
    + '</div></div>').join('');
}

// Journal d'audit — 6 dernières actions, dans la maquette V2
function admRenderAuditRecent() {
  const el = document.getElementById('admAudit');
  if (!el) return;
  let log = [];
  try { log = JSON.parse(localStorage.getItem('ftr_audit_log') || '[]'); } catch (_) { log = []; }
  if (!log.length) { el.innerHTML = _admVide('Aucune action enregistrée'); return; }
  el.innerHTML = log.slice(0, 6).map(e => {
    const d = new Date(e.date);
    const quand = isNaN(d) ? '—'
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const label = (typeof ACTION_LABELS !== 'undefined' && ACTION_LABELS[e.action]) || e.action || '—';
    const color = (typeof ACTION_COLORS !== 'undefined' && ACTION_COLORS[e.action]) || '#818cf8';
    const ini = String(e.user || '?').trim().slice(0, 1).toUpperCase();
    return '<div class="adm-li">'
      + '<span class="adm-li-av" style="background:' + color + '26;color:' + color + '">' + _ad(ini) + '</span>'
      + '<span class="adm-li-b"><span class="adm-li-t" style="display:block">' + _ad(label) + '</span>'
      + '<span class="adm-li-s" style="display:block">' + _ad(e.user || '—') + ' · ' + _ad(e.details || '—') + '</span></span>'
      + '<span class="adm-li-w">' + _ad(quand) + '</span></div>';
  }).join('');
  admGuards();
}
window.admRenderAuditRecent = admRenderAuditRecent;

// État du système — vérifications réellement observables depuis le poste
function admSysteme(d) {
  const el = document.getElementById('admSysteme');
  if (!el) return;
  const sb = (typeof supabaseClient !== 'undefined');
  const sw = ('serviceWorker' in navigator);
  const https = (location.protocol === 'https:' || location.hostname === 'localhost');
  const lignes = [
    { t: 'Base de données Supabase', ok: sb,    s: sb ? 'Client connecté' : 'Client non chargé' },
    { t: 'Mode hors-ligne',          ok: sw,    s: sw ? 'Service worker disponible' : 'Non pris en charge' },
    { t: 'Transport chiffré',        ok: https, s: https ? 'HTTPS actif' : 'Connexion locale (HTTP)' },
    { t: 'Données chargées',         ok: true,  s: (d.residents || []).length + ' résidents · ' + (d.journal || []).length + ' entrées' }
  ];
  el.innerHTML = lignes.map(l =>
    '<div class="adm-li">'
    + '<span class="adm-li-dot" style="--pc:' + (l.ok ? '#34d399' : '#f59e0b') + '"></span>'
    + '<span class="adm-li-b"><span class="adm-li-t" style="display:block">' + _ad(l.t) + '</span>'
    + '<span class="adm-li-s" style="display:block">' + _ad(l.s) + '</span></span>'
    + '<span class="adm-li-tag" style="--pc:' + (l.ok ? '#34d399' : '#f59e0b') + '">'
    + (l.ok ? 'OK' : 'À vérifier') + '</span></div>').join('');
}

// ══════════════════════════════════════════════════════════════════════════
// ONGLET UTILISATEURS — statistiques de comptes + filtres par fonction
// ══════════════════════════════════════════════════════════════════════════
// Reprend le haut de la maquette « Utilisateurs (RH) ». Les fiches elles-mêmes
// restent rendues par renderEmployes() (admin.html) : on n'ajoute qu'un
// bandeau d'indicateurs et des pastilles de filtre, qui écrivent dans
// window._admPosteFilter — la liste s'y conforme au prochain rendu.
//
// Rappel de vocabulaire, distinct dans cette base : une « fiche salarié »
// (table employes) n'est pas un « compte » (profil de connexion). Une fiche
// n'ouvre aucun accès tant qu'elle n'est pas reliée à un compte.
window._admPosteFilter = window._admPosteFilter || '';

function admRenderUsers() {
  const emps = (typeof getEmployes === 'function') ? getEmployes() : [];

  // ── Indicateurs ────────────────────────────────────────────────────────
  const kpis = document.getElementById('admUserKpis');
  if (kpis) {
    const actifs = emps.filter(e => (e.statut || 'actif') === 'actif').length;
    const lies = emps.filter(e => e.profile_id).length;
    const sansCompte = emps.length - lies;
    const k = [
      { ic: ADM_IC.users,  c: '#818cf8', n: emps.length,   l: 'Fiches salariés' },
      { ic: ADM_IC.check,  c: '#34d399', n: actifs,        l: 'Salariés actifs' },
      { ic: ADM_IC.compte, c: '#22d3ee', n: lies,          l: 'Reliées à un compte' },
      { ic: ADM_IC.alert,  c: '#f59e0b', n: sansCompte,    l: 'Sans compte de connexion' }
    ];
    kpis.innerHTML = k.map(x =>
      '<div class="adm-k">'
      + '<span class="adm-k-ico" style="color:' + x.c + ';background:' + x.c + '1f">' + _adSvg(x.ic) + '</span>'
      + '<div class="adm-k-n">' + _admNum(x.n) + '</div>'
      + '<div class="adm-k-l">' + _ad(x.l) + '</div></div>').join('');
  }

  // ── Pastilles de filtre par fonction ───────────────────────────────────
  const box = document.getElementById('admRoleFilters');
  if (box) {
    const counts = {};
    emps.forEach(e => { const p = e.poste || ''; if (p) counts[p] = (counts[p] || 0) + 1; });
    const postes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const cur = window._admPosteFilter || '';
    // Un filtre devenu sans objet (fonction disparue) est abandonné
    if (cur && !counts[cur]) { window._admPosteFilter = ''; }
    const chip = (val, label, n, color) =>
      '<button type="button" class="v2-chip-f' + ((window._admPosteFilter || '') === val ? ' on active' : '') + '"'
      + ' aria-pressed="' + (((window._admPosteFilter || '') === val) ? 'true' : 'false') + '"'
      + (color ? ' style="--pc:' + _adAttr(color) + '"' : '')
      + ' onclick="admFilterPoste(' + JSON.stringify(val) + ')">'
      + _ad(label) + (n != null ? ' <b style="opacity:.65">' + n + '</b>' : '') + '</button>';
    box.innerHTML = chip('', 'Tous', emps.length)
      + postes.map(p => chip(p, p, counts[p],
        (typeof getPosteColor === 'function') ? getPosteColor(p) : null)).join('');
  }
  admGuards();
}
window.admRenderUsers = admRenderUsers;

function admFilterPoste(poste) {
  window._admPosteFilter = (window._admPosteFilter === poste) ? '' : poste;
  if (typeof renderEmployes === 'function') renderEmployes();
  admRenderUsers();
}
window.admFilterPoste = admFilterPoste;

// ══════════════════════════════════════════════════════════════════════════
// ONGLET PERMISSIONS — matrice rôles × accès
// ══════════════════════════════════════════════════════════════════════════
// La source de vérité reste getFonctions()/setFonctions() de js/admin.js :
// on réutilise permToggle() en basculant d'abord la sélection courante, ce
// qui garantit une seule logique d'écriture (et donc de contrôle).
function admRenderPermMatrix() {
  const table = document.getElementById('admPermMatrix');
  if (!table) return;
  if (typeof renderPermissionsPage === 'function') renderPermissionsPage(); // garde la vue héritée à jour
  const roles = (typeof getFonctions === 'function') ? getFonctions() : [];
  if (!roles.length) { table.innerHTML = '<tr><td class="adm-perm-c1">Aucun rôle défini</td></tr>'; return; }
  const labels = (typeof PERMISSION_LABELS !== 'undefined') ? PERMISSION_LABELS : {};
  const groupes = (typeof PERM_GROUPS !== 'undefined') ? PERM_GROUPS : [];

  const thead = '<thead><tr><th class="adm-perm-h1">Accès</th>'
    + roles.map(r => '<th title="' + _adAttr(r.fonction) + '">' + _ad(r.fonction) + '</th>').join('')
    + '</tr></thead>';

  const vus = new Set();
  let corps = groupes.map(g => {
    const keys = (g.keys || []).filter(k => labels[k]);
    keys.forEach(k => vus.add(k));
    if (!keys.length) return '';
    const entete = '<tr class="adm-perm-grp"><td colspan="' + (roles.length + 1) + '">' + _ad(g.label) + '</td></tr>';
    return entete + keys.map(k => admPermRow(k, labels[k], roles)).join('');
  }).join('');
  const autres = Object.keys(labels).filter(k => !vus.has(k));
  if (autres.length) {
    corps += '<tr class="adm-perm-grp"><td colspan="' + (roles.length + 1) + '">Autres</td></tr>'
      + autres.map(k => admPermRow(k, labels[k], roles)).join('');
  }
  table.innerHTML = thead + '<tbody>' + corps + '</tbody>';
  admGuards();
}
window.admRenderPermMatrix = admRenderPermMatrix;

function admPermRow(key, label, roles) {
  return '<tr><td class="adm-perm-c1">' + _ad(label || key) + '</td>'
    + roles.map(r => {
      const on = (r.permissions || []).indexOf(key) >= 0;
      const c = (typeof safeColor === 'function') ? safeColor(r.color, '#818cf8') : (r.color || '#818cf8');
      return '<td><button type="button" class="adm-sw' + (on ? ' on' : '') + '" style="--rc:' + _adAttr(c) + '"'
        + ' role="switch" aria-checked="' + (on ? 'true' : 'false') + '"'
        + ' aria-label="' + _adAttr((label || key) + ' — ' + r.fonction) + '"'
        + ' onclick="admPermCell(' + JSON.stringify(String(r.id)) + ',' + JSON.stringify(String(key)) + ')"><i></i></button></td>';
    }).join('') + '</tr>';
}

// Bascule une case de la matrice en passant par la logique existante
function admPermCell(roleId, key) {
  if (typeof permSelect === 'function' && typeof permToggle === 'function') {
    permSelect(roleId);       // aligne la sélection de la vue héritée
    permToggle(key);          // écriture + persistance + trace, inchangées
  }
  admRenderPermMatrix();
}
window.admPermCell = admPermCell;

// ══════════════════════════════════════════════════════════════════════════
// ONGLET ÉTABLISSEMENT — agréments, capacité, aperçu
// ══════════════════════════════════════════════════════════════════════════
async function admRenderEtablissement() {
  admCapacite();
  admApercu();
  ADM_X.agrements = await _admLire('admin_agrements', { col: 'ordre', asc: true });
  admAgrementsList();
  admGuards();
}
window.admRenderEtablissement = admRenderEtablissement;

const ADM_AGR_ETAT = {
  valide:       { l: 'Valide',        c: '#34d399' },
  a_renouveler: { l: 'À renouveler',  c: '#f59e0b' },
  expire:       { l: 'Expiré',        c: '#f87171' }
};

function admAgrementsList() {
  const el = document.getElementById('admAgrements');
  if (!el) return;
  const list = ADM_X.agrements || [];
  if (!list.length) {
    el.innerHTML = _admVide('Aucun agrément enregistré', 'admin_agrements');
    return;
  }
  el.innerHTML = list.map(a => {
    const et = ADM_AGR_ETAT[a.etat] || ADM_AGR_ETAT.valide;
    const ech = a.echeance ? new Date(a.echeance).toLocaleDateString('fr-FR') : '';
    const sous = [a.detail, ech && ('échéance ' + ech)].filter(Boolean).join(' · ');
    return '<div class="adm-li">'
      + '<span class="adm-li-ico" style="color:' + et.c + ';background:' + et.c + '1f">' + _adSvg(ADM_IC.shield) + '</span>'
      + '<span class="adm-li-b"><span class="adm-li-t" style="display:block">' + _ad(a.libelle) + '</span>'
      + (sous ? '<span class="adm-li-s" style="display:block">' + _ad(sous) + '</span>' : '') + '</span>'
      + '<span class="adm-li-pill" style="background:' + et.c + '1f;color:' + et.c + '">'
      + _ad(a.tag || et.l) + '</span>'
      + '<span class="adm-li-act"><button type="button" class="v2-btn v2-btn-sm" aria-label="Modifier"'
      + ' onclick="admOpenAgrement(' + JSON.stringify(String(a.id)) + ')">' + _adSvg(ADM_IC.edit, 14) + '</button></span>'
      + '</div>';
  }).join('');
}

function admCapacite() {
  const el = document.getElementById('admCapacite');
  if (!el) return;
  const etab = (typeof getCurrentEtab === 'function') ? getCurrentEtab() : null;
  let cap = Number(etab && etab.capacite) || 0;
  if (!cap) {
    const s = (typeof getSettings === 'function') ? getSettings() : null;
    cap = Number(s && s.capacite) || 0;
  }
  const residents = ((typeof _statsData !== 'undefined' && _statsData.residents) || [])
    .filter(r => !r.dateSortie && (r.statut || 'present') !== 'sorti');
  const occ = residents.length;
  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
  el.innerHTML = '<span class="v2-gauge-val" style="font-size:30px">' + (cap > 0 ? occ + ' / ' + cap : '—') + '</span>'
    + '<span style="font-size:12px;color:var(--v2-t6)">'
    + (cap > 0 ? 'places occupées · ' + pct + '%' : 'capacité non renseignée') + '</span>';
}

function admApercu() {
  const g = id => document.getElementById(id);
  const val = id => { const e = g(id); return e ? (e.value || '').trim() : ''; };
  const put = (id, v) => { const e = g(id); if (e) e.textContent = v || '—'; };
  put('previewNom', val('setEtab'));
  put('previewVille', val('setVille'));
  put('previewFiness', val('setFiness'));
  put('previewTel', val('setTel'));
  put('previewEmail', val('setEmail'));
  put('previewAdresse', val('setAdresse'));
}
window.admApercu = admApercu;

// ─── Agréments : création / édition / suppression ─────────────────────────
function admOpenAgrement(id) {
  const a = (ADM_X.agrements || []).find(x => String(x.id) === String(id)) || null;
  const set = (el, v) => { const e = document.getElementById(el); if (e) e.value = v == null ? '' : v; };
  set('agrId', a ? a.id : '');
  set('agrLibelle', a ? a.libelle : '');
  set('agrDetail', a ? a.detail : '');
  set('agrTag', a ? a.tag : '');
  set('agrEcheance', a ? a.echeance : '');
  admAgrEtat(a ? (a.etat || 'valide') : 'valide');
  const t = document.getElementById('modalAgrementTitle');
  if (t) t.textContent = a ? 'Modifier l\'agrément' : 'Nouvel agrément';
  const del = document.getElementById('btnDeleteAgr');
  if (del) del.style.display = a ? '' : 'none';
  if (typeof openModal === 'function') openModal('modalAgrement');
}
window.admOpenAgrement = admOpenAgrement;

function admAgrEtat(v) {
  const hid = document.getElementById('agrEtat');
  if (hid) hid.value = v;
  document.querySelectorAll('#agrEtatSeg .v2-seg-o').forEach(b => {
    b.classList.toggle('on', b.dataset.val === v);
  });
}
window.admAgrEtat = admAgrEtat;

async function admSaveAgrement() {
  const v = id => { const e = document.getElementById(id); return e ? (e.value || '').trim() : ''; };
  const libelle = v('agrLibelle');
  if (!libelle) { if (typeof toast === 'function') toast('Le libellé est obligatoire', 'error'); return; }
  const id = v('agrId');
  const row = {
    etablissement_id: _admEtabId(),
    libelle,
    detail: v('agrDetail') || null,
    tag: v('agrTag') || null,
    echeance: v('agrEcheance') || null,
    etat: v('agrEtat') || 'valide'
  };
  if (typeof supabaseClient === 'undefined') { _admRefus('admin_agrements'); return; }
  try {
    const q = id
      ? supabaseClient.from('admin_agrements').update(row).eq('id', id)
      : supabaseClient.from('admin_agrements').insert(row);
    const { error } = await q;
    if (error) throw error;
    if (typeof closeModal === 'function') closeModal('modalAgrement');
    if (typeof toast === 'function') toast(id ? 'Agrément mis à jour' : 'Agrément ajouté', 'success');
    if (typeof auditLog === 'function') auditLog('config', 'Agrément : ' + libelle);
    ADM_X.agrements = await _admLire('admin_agrements', { col: 'ordre', asc: true });
    admAgrementsList();
  } catch (e) { _admRefus('admin_agrements', e); }
}
window.admSaveAgrement = admSaveAgrement;

function admDeleteAgrement() {
  const e = document.getElementById('agrId');
  const id = e ? e.value : '';
  if (!id) return;
  const go = async () => {
    if (typeof supabaseClient === 'undefined') { _admRefus('admin_agrements'); return; }
    try {
      const { error } = await supabaseClient.from('admin_agrements').delete().eq('id', id);
      if (error) throw error;
      if (typeof closeModal === 'function') closeModal('modalAgrement');
      if (typeof toast === 'function') toast('Agrément supprimé', 'info');
      ADM_X.agrements = await _admLire('admin_agrements', { col: 'ordre', asc: true });
      admAgrementsList();
    } catch (err) { _admRefus('admin_agrements', err); }
  };
  if (typeof confirmDialog === 'function') confirmDialog('Supprimer cet agrément ?', go); else go();
}
window.admDeleteAgrement = admDeleteAgrement;

// Formulaire « Nouvel établissement »
function admToggleNewEtab(show) {
  const f = document.getElementById('newEtabForm');
  if (!f) return;
  const visible = f.style.display !== 'none';
  const next = (show === undefined) ? !visible : !!show;
  f.style.display = next ? '' : 'none';
  if (next) { const n = document.getElementById('newEtabNom'); if (n) n.focus(); }
}
window.admToggleNewEtab = admToggleNewEtab;

// ══════════════════════════════════════════════════════════════════════════
// ONGLET DONNÉES — sauvegardes & registre RGPD
// ══════════════════════════════════════════════════════════════════════════
async function admRenderDonnees() {
  const [sav, rgpd] = await Promise.all([
    _admLire('admin_sauvegardes', { col: 'date', asc: false }),
    _admLire('admin_rgpd_registre', { col: 'ordre', asc: true })
  ]);
  ADM_X.sauvegardes = sav;
  ADM_X.rgpd = rgpd;

  const b = document.getElementById('admBackups');
  if (b) {
    b.innerHTML = sav.length ? sav.slice(0, 8).map(s => {
      const st = { ok: ['#34d399', 'OK'], partielle: ['#f59e0b', 'Partielle'], echec: ['#f87171', 'Échec'] }[s.statut] || ['#34d399', 'OK'];
      const d = s.date ? new Date(s.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
      return '<div class="adm-li">'
        + '<span class="adm-li-ico" style="color:' + st[0] + ';background:' + st[0] + '1f">' + _adSvg(ADM_IC.save) + '</span>'
        + '<span class="adm-li-b"><span class="adm-li-t" style="display:block">' + _ad(s.libelle || 'Sauvegarde') + '</span>'
        + '<span class="adm-li-s" style="display:block">' + _ad(d) + (s.taille ? ' · ' + _ad(s.taille) : '') + '</span></span>'
        + '<span class="adm-li-pill" style="background:' + st[0] + '1f;color:' + st[0] + '">' + st[1] + '</span></div>';
    }).join('') : _admVide('Aucune sauvegarde enregistrée', 'admin_sauvegardes');
  }

  const r = document.getElementById('admRgpd');
  if (r) {
    r.innerHTML = rgpd.length ? rgpd.map(x =>
      '<div class="adm-li">'
      + '<span class="adm-li-ico" style="color:#94a3b8;background:rgba(148,163,184,.14)">' + _adSvg(ADM_IC.file) + '</span>'
      + '<span class="adm-li-b"><span class="adm-li-t" style="display:block">' + _ad(x.traitement || '—') + '</span>'
      + '<span class="adm-li-s" style="display:block">' + _ad(x.base_legale || '') + '</span></span>'
      + '<span class="adm-li-w">' + _ad(x.duree_conservation || '—') + '</span></div>'
    ).join('') : _admVide('Registre RGPD vide', 'admin_rgpd_registre');
  }
  admGuards();
}
window.admRenderDonnees = admRenderDonnees;

// ══════════════════════════════════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════════════════════════════════
function adminV2Init() {
  admRenderSideNav();
  admRenderSideUser();

  // L'onglet actif au chargement a été posé par activateTab() avant que ce
  // fichier ne soit chargé : on rejoue l'habillage.
  const actif = document.querySelector('.adm-panel.active');
  adminV2OnTab(actif ? actif.id.replace('tab-', '') : 'stats');

  // L'aperçu de la fiche établissement suit la saisie
  ['setEtab', 'setVille', 'setFiness', 'setTel', 'setEmail', 'setAdresse'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.addEventListener('input', admApercu);
  });

  admGuards();
}
window.adminV2Init = adminV2Init;

// Filet : si le DOM n'était pas prêt au moment du chargement du script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { try { adminV2Init(); } catch (e) { console.warn('[admin-v2]', e); } });
}
