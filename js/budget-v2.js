// ── BUDGET & DÉPENSES (pilotage) — DESIGN V2 ──────────────────────────
// Reproduit la maquette « Budget & dépenses (pilotage) » :
//   5 tuiles de statistiques, enveloppes budgétaires en grille, tableau des
//   demandes récentes filtré par chips, rail (budget annuel, dépenses/mois,
//   à traiter) puis répartition par poste, partage foyer/résident,
//   réalisé vs prévisionnel, justificatifs et top fournisseurs.
//
// Ce module ne réécrit AUCUNE couche de données : il redéfinit uniquement les
// fonctions de rendu de js/budget.js (chargé avant lui) et réutilise
// getBudgetDemandes(), getBudgetEnveloppes(), sbSaveBudgetDemande(), etc.
//
// Deux blocs de la maquette n'ont pas de source dans le schéma existant :
//   • le prévisionnel trimestriel  → table public.budget_previsionnel
//   • le top fournisseurs          → table public.budget_fournisseurs
// Les deux sont créées par migration-budget.sql. Tant que ce script n'est pas
// exécuté, la lecture renvoie [] avec un console.warn et l'écriture est
// refusée par un toast nommant le fichier : la page reste utilisable.

// ── Icônes ────────────────────────────────────────────────────────────
const BG2_IC = {
  activity: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>',
  food:     '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>',
  tool:     '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  health:   '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  box:      '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/>',
  star:     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ok:       '<polyline points="20 6 9 17 4 12"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  warn:     '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>',
  clip:     '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  x:        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  pen:      '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:    '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  save:     '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  folder:   '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  doc:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  truck:    '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  chart:    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
};
function bg2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

const BG2_ENV_THEMES = [
  { c: '#818cf8', icon: BG2_IC.activity },
  { c: '#ea580c', icon: BG2_IC.food },
  { c: '#f59e0b', icon: BG2_IC.tool },
  { c: '#ec4899', icon: BG2_IC.health },
  { c: '#22d3ee', icon: BG2_IC.box },
  { c: '#a855f7', icon: BG2_IC.star }
];
const BG2_ST = {
  en_attente: { l: 'En attente',     c: '#f59e0b' },
  accepte:    { l: 'Justif. attendu', c: '#22d3ee' },
  justifie:   { l: 'Justifiée',      c: '#10b981' },
  refuse:     { l: 'Refusée',        c: '#ef4444' }
};
const BG2_AV_C = ['#818cf8', '#22d3ee', '#ec4899', '#f59e0b', '#10b981', '#a855f7'];
const BG2_MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ── Helpers ───────────────────────────────────────────────────────────
function bg2Eur(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' €'; }
function bg2Init(nom) {
  return String(nom || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}
function bg2Hash(s) {
  let h = 0; const t = String(s || '');
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return h;
}
function bg2AvC(nom) { return BG2_AV_C[bg2Hash(nom) % BG2_AV_C.length]; }
function bg2BarC(pct) { return pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#4ade80'; }
function bg2Dem() { return (typeof getBudgetDemandes === 'function' ? getBudgetDemandes() : []) || []; }
function bg2Env() { return (typeof getBudgetEnveloppes === 'function' ? getBudgetEnveloppes() : []) || []; }
function bg2Engage(d) { return d.statut === 'accepte' || d.statut === 'justifie'; }
function bg2ShortDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x)) return '—';
  return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0');
}
// Périmètre de lecture : un admin voit tout, un salarié ne voit que ses demandes
function bg2Scope() {
  const list = bg2Dem();
  if (typeof Auth !== 'undefined' && Auth.isAdmin()) return list;
  const cu = budgetCurrentUser();
  return list.filter(d => String(d.employeId) === String(cu.employeId));
}

// ══ DONNÉES COMPLÉMENTAIRES (migration-budget.sql) ═══════════════════
let BG2_PREV = [];       // [{id, annee, trimestre, montant}]
let BG2_FOURN = [];      // [{id, nom, montant, annee}]
const BG2_MISSING = {};  // table -> true si absente

async function bg2Read(table) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) { BG2_MISSING[table] = true; return []; }
  try {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) throw error;
    BG2_MISSING[table] = false;
    return data || [];
  } catch (e) {
    BG2_MISSING[table] = true;
    console.warn(`[budget-v2] table public.${table} indisponible — exécutez migration-budget.sql`, e && e.message ? e.message : e);
    return [];
  }
}
function bg2WriteRefused(table) {
  BG2_MISSING[table] = true;
  toast('Table « ' + table + ' » absente : exécutez migration-budget.sql', 'error');
}
async function bg2Etab() {
  try { return typeof sbGetEtablissementId === 'function' ? await sbGetEtablissementId() : ''; }
  catch { return ''; }
}
async function bg2LoadExtras() {
  const [prev, fourn] = await Promise.all([bg2Read('budget_previsionnel'), bg2Read('budget_fournisseurs')]);
  BG2_PREV = prev.map(r => ({ id: r.id, annee: Number(r.annee), trimestre: Number(r.trimestre), montant: Number(r.montant) || 0 }));
  BG2_FOURN = fourn.map(r => ({ id: r.id, nom: r.nom || '', montant: Number(r.montant) || 0, annee: r.annee }))
    .sort((a, b) => b.montant - a.montant);
}

// ══ INITIALISATION ════════════════════════════════════════════════════
async function initBudget() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_budget')) return;
  const annee = document.getElementById('bg2Annee');
  if (annee) annee.textContent = new Date().getFullYear();
  if (Auth.isAdmin()) {
    const empSel = document.getElementById('bgFiltreEmploye');
    if (empSel) empSel.style.display = '';
  }
  await loadBudgetData();
  renderBudget();
  await bg2LoadExtras();
  renderBudget();
}

// ══ FILTRE PAR CHIPS ══════════════════════════════════════════════════
function bg2SetStatut(v) {
  const sel = document.getElementById('bgFiltreStatut');
  if (sel) sel.value = v;
  document.querySelectorAll('#bg2Filtres .v2-chip-f').forEach(b => b.classList.toggle('on', (b.dataset.st || '') === v));
  renderBudget();
}

// ══ ENVELOPPES ════════════════════════════════════════════════════════
function renderEnveloppes() {
  const el = document.getElementById('bgEnveloppesList');
  if (!el) return;
  const list = bg2Env();
  if (!list.length) {
    el.innerHTML = '<div class="v2-blk"><div class="v2-blk-vide">Aucune enveloppe budgétaire définie.</div></div>';
    return;
  }
  const demandes = bg2Dem();
  const isAdmin = typeof Auth !== 'undefined' && Auth.isAdmin();
  el.innerHTML = list.map((env, i) => {
    const utilise = budgetEnveloppeUtilise(env.id);
    const total = Number(env.montant) || 0;
    const pct = total > 0 ? Math.min(100, Math.round(utilise / total * 100)) : 0;
    const th = BG2_ENV_THEMES[i % BG2_ENV_THEMES.length];
    const bc = utilise > total ? '#ef4444' : bg2BarC(pct);
    const liees = demandes.filter(d => d.enveloppeId === env.id && (d.statut === 'accepte' || d.statut === 'en_attente'));
    return `<div class="bg2-env" style="--ec:${th.c}">
      <div class="bg2-env-h">
        <span class="bg2-env-ico">${bg2Svg(th.icon)}</span>
        <span class="bg2-env-n" title="${escAttr(env.nom)}">${escHtml(env.nom)}</span>
        <span class="bg2-env-p" style="color:${bc}">${pct}%</span>
        ${isAdmin ? `<button type="button" class="bg2-mini" style="width:28px;padding:0" title="Modifier l’enveloppe" onclick="openEnveloppeModal('${escAttr(env.id)}')">${bg2Svg(BG2_IC.pen)}</button>` : ''}
      </div>
      <div class="v2-prog"><span style="width:${pct}%;background:${bc}"></span></div>
      <div class="bg2-env-f"><span>Engagé <b>${bg2Eur(utilise)}</b></span><span class="r">Alloué ${bg2Eur(total)}</span></div>
      ${env.description ? `<div class="bg2-env-d">${escHtml(env.description)}</div>` : ''}
      ${liees.length
        ? `<div class="bg2-env-a"><span class="l">${liees.length} demande${liees.length > 1 ? 's' : ''} en attente de ticket ou de remboursement</span>
             <button type="button" class="bg2-mini" onclick="voirDemandesEnveloppe('${escAttr(env.id)}')">Voir</button></div>`
        : `<div class="bg2-env-d">Aucune demande en attente de ticket ou de remboursement.</div>`}
    </div>`;
  }).join('');
}

// ══ DEMANDE — CARTE (listes d'alerte) ═════════════════════════════════
function budgetItemHtml(d, isAdmin) {
  const st = BG2_ST[d.statut] || BG2_ST.en_attente;
  const cu = budgetCurrentUser();
  const isOwner = String(d.employeId) === String(cu.employeId);
  const canRepondre = isAdmin && d.statut === 'en_attente';
  const canAddJustif = d.statut === 'accepte' && (isOwner || isAdmin);
  return `<div class="bg2-item">
    <div class="bg2-item-h">
      <span class="bg2-av" style="background:${bg2AvC(d.employeNom)}">${escHtml(bg2Init(d.employeNom))}</span>
      <div class="bg2-item-txt">
        <div class="bg2-motif">${escHtml(d.motif || 'Demande de budget')}</div>
        <div class="bg2-sub">${escHtml(d.employeNom || '')}${d.enveloppeNom ? ' · ' + escHtml(d.enveloppeNom) : ''}</div>
      </div>
      <span class="bg2-mt">${bg2Eur(d.montant)}</span>
      <span class="bg2-st" style="--sc:${st.c}">${st.l}</span>
    </div>
    ${bg2DetailHtml(d, isAdmin)}
    <div class="bg2-acts" style="margin-top:10px;justify-content:flex-start">
      ${canRepondre ? `<button type="button" class="bg2-mini bg2-mini-ok" onclick="repondreBudgetDemande('${escAttr(d.id)}','accepte')">${bg2Svg(BG2_IC.ok, 2.4)} Accepter</button>
        <button type="button" class="bg2-mini bg2-mini-danger" onclick="repondreBudgetDemande('${escAttr(d.id)}','refuse')">${bg2Svg(BG2_IC.x, 2.4)} Refuser</button>` : ''}
      ${canAddJustif ? `<button type="button" class="bg2-mini bg2-mini-pri" onclick="ajouterJustificatifDemande('${escAttr(d.id)}')">${bg2Svg(BG2_IC.clip)} Ajouter le ticket</button>` : ''}
    </div>
  </div>`;
}

// Détails communs (dates, résidents, partage 50/50, justificatifs, refus)
function bg2DetailHtml(d, isAdmin) {
  const hasJustif = (d.justificatifs || []).length > 0;
  const remb = d.partage50 ? (d.remboursements || []) : [];
  const tousRembourses = remb.length > 0 && remb.every(r => r.paye);
  const blockers = [];
  if (d.partage50 && !tousRembourses) blockers.push('le remboursement complet des résidents');
  if (!hasJustif) blockers.push('le ticket/justificatif');

  const parts = [];
  parts.push(`<div class="bg2-note">Dépense du ${escHtml(formatDate(d.dateDepense))} · demandée le ${escHtml(new Date(d.dateDemande).toLocaleDateString('fr-FR'))}${d.traitePar ? ' · traitée par ' + escHtml(d.traitePar) : ''}</div>`);

  if ((d.residentNoms || []).length && !d.partage50) {
    parts.push(`<div class="bg2-note"><div class="bg2-tags">${d.residentNoms.map(n => `<span class="bg2-tag">${escHtml(n)}</span>`).join('')}</div></div>`);
  }
  if (d.partage50) {
    parts.push(`<div class="bg2-note bg2-note-warn">
      <div class="bg2-kv" style="margin-bottom:8px"><span>Partage 50/50</span><span>Foyer ${bg2Eur(d.partFoyer)} · Résidents ${bg2Eur(d.partResident)}</span></div>
      <div class="bg2-tags">${remb.map(r => `<label class="bg2-remb${r.paye ? ' paye' : ''}" title="${r.paye && r.datePaiement ? 'Remboursé le ' + escAttr(formatDate(r.datePaiement)) : ''}">
        <input type="checkbox" ${r.paye ? 'checked' : ''} ${isAdmin ? '' : 'disabled'} onchange="marquerRemboursementResident('${escAttr(d.id)}','${escAttr(r.residentId)}')"/>
        <span class="lbl">${escHtml(r.residentNom)} — ${bg2Eur(r.montantDu)}</span></label>`).join('') || '<span class="bg2-hint">Aucun résident rattaché au partage.</span>'}</div>
      ${!isAdmin ? '<div class="bg2-hint" style="margin-top:7px">Seul un admin peut confirmer la réception du remboursement.</div>' : ''}
    </div>`);
  }
  if (d.statut === 'accepte' && blockers.length) {
    parts.push(`<div class="bg2-note bg2-note-info">En attente de ${blockers.join(' et de ')} pour clôturer.</div>`);
  }
  if (hasJustif) {
    parts.push(`<div class="bg2-note"><div class="bg2-tags">${(d.justificatifs || []).map((j, i) =>
      `<button type="button" class="bg2-mini" onclick="voirJustificatif('${escAttr(d.id)}',${i})">${bg2Svg(BG2_IC.clip)} ${escHtml(j.name)}</button>`).join('')}</div></div>`);
  }
  if (d.statut === 'refuse' && d.reponseMotif) {
    parts.push(`<div class="bg2-note bg2-note-err">Motif du refus : ${escHtml(d.reponseMotif)}</div>`);
  }
  return `<div style="margin-top:10px">${parts.join('')}</div>`;
}

// ══ DEMANDE — LIGNE DE TABLEAU ════════════════════════════════════════
function bg2RowHtml(d, isAdmin, cu) {
  const st = BG2_ST[d.statut] || BG2_ST.en_attente;
  const isOwner = String(d.employeId) === String(cu.employeId);
  const canRepondre = isAdmin && d.statut === 'en_attente';
  const canAddJustif = d.statut === 'accepte' && (isOwner || isAdmin);
  const open = !!BG2_OPEN[d.id];
  const acts = `${canRepondre ? `<button type="button" class="bg2-mini bg2-mini-ok" title="Accepter" onclick="repondreBudgetDemande('${escAttr(d.id)}','accepte')">${bg2Svg(BG2_IC.ok, 2.4)}</button>
      <button type="button" class="bg2-mini bg2-mini-danger" title="Refuser" onclick="repondreBudgetDemande('${escAttr(d.id)}','refuse')">${bg2Svg(BG2_IC.x, 2.4)}</button>` : ''}
    ${canAddJustif ? `<button type="button" class="bg2-mini bg2-mini-pri" title="Ajouter le ticket" onclick="ajouterJustificatifDemande('${escAttr(d.id)}')">${bg2Svg(BG2_IC.clip)}</button>` : ''}
    <button type="button" class="bg2-mini" title="${open ? 'Masquer' : 'Voir'} le détail" onclick="bg2Toggle('${escAttr(d.id)}')">${open ? 'Moins' : 'Détail'}</button>
    ${isAdmin ? `<button type="button" class="bg2-mini bg2-mini-danger" title="Supprimer" onclick="supprimerBudgetDemande('${escAttr(d.id)}')">${bg2Svg(BG2_IC.trash)}</button>` : ''}`;
  return `<tr>
    <td><div class="who"><span class="bg2-av" style="background:${bg2AvC(d.employeNom)}">${escHtml(bg2Init(d.employeNom))}</span>
      <div style="min-width:0"><div class="bg2-motif">${escHtml(d.motif || 'Demande de budget')}</div>
      <div class="bg2-sub">${escHtml(d.employeNom || '')}${d.enveloppeNom ? ' · ' + escHtml(d.enveloppeNom) : ''}</div></div></div></td>
    <td class="bg2-mt">${bg2Eur(d.montant)}</td>
    <td class="bg2-date">${bg2ShortDate(d.dateDepense)}</td>
    <td><span class="bg2-st" style="--sc:${st.c}">${st.l}</span></td>
    <td><div class="bg2-acts">${acts}</div></td>
  </tr>${open ? `<tr class="bg2-detail"><td colspan="5">${bg2DetailHtml(d, isAdmin)}</td></tr>` : ''}`;
}

const BG2_OPEN = {};
function bg2Toggle(id) { BG2_OPEN[id] = !BG2_OPEN[id]; renderBudget(); }

// ══ RAIL : BUDGET ANNUEL ══════════════════════════════════════════════
function bg2RenderAnnuel() {
  const el = document.getElementById('bg2Annuel');
  if (!el) return;
  const envs = bg2Env();
  const total = envs.reduce((s, e) => s + (Number(e.montant) || 0), 0);
  const engage = envs.reduce((s, e) => s + budgetEnveloppeUtilise(e.id), 0);
  if (!envs.length) {
    el.className = 'v2-blk';
    el.innerHTML = '<div class="v2-blk-h"><span class="v2-blk-t">Budget annuel</span></div><div class="v2-blk-vide">Aucune enveloppe budgétaire définie.</div>';
    return;
  }
  const pct = total > 0 ? Math.min(100, Math.round(engage / total * 100)) : 0;
  const reste = Math.max(0, total - engage);
  el.className = 'bg2-annuel';
  el.innerHTML = `<div class="bg2-annuel-t">Budget annuel</div>
    <div class="bg2-annuel-n">${bg2Eur(total)}</div>
    <div class="bg2-annuel-s">Engagé ${bg2Eur(engage)} · reste ${bg2Eur(reste)}</div>
    <div class="v2-prog" style="height:9px"><span style="width:${pct}%;background:linear-gradient(90deg,#16a34a,#4ade80)"></span></div>
    <div class="bg2-annuel-f">${pct} % consommé sur les enveloppes ouvertes</div>`;
}

// ══ RAIL : DÉPENSES PAR MOIS ══════════════════════════════════════════
function bg2RenderMois() {
  const el = document.getElementById('bg2Mois');
  if (!el) return;
  const list = bg2Scope().filter(bg2Engage);
  const now = new Date();
  const cols = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const val = list.filter(x => String(x.dateDepense || '').slice(0, 7) === key)
      .reduce((s, x) => s + (Number(x.montant) || 0), 0);
    cols.push({ label: BG2_MOIS[d.getMonth()], val });
  }
  const max = Math.max(...cols.map(c => c.val));
  if (max <= 0) { el.innerHTML = '<div class="v2-blk-vide">Aucune dépense engagée sur les six derniers mois.</div>'; return; }
  el.innerHTML = `<div class="bg2-chart">${cols.map(c =>
    `<div class="bg2-chart-c" title="${escAttr(c.label + ' : ' + bg2Eur(c.val))}">
      <div class="bg2-chart-b" style="height:${Math.max(3, Math.round(c.val / max * 100))}%"></div>
      <div class="bg2-chart-l">${c.label}</div></div>`).join('')}</div>`;
}

// ══ RAIL : À TRAITER ══════════════════════════════════════════════════
function bg2RenderATraiter() {
  const el = document.getElementById('bg2ATraiter');
  if (!el) return;
  const scope = bg2Scope();
  const items = [
    { label: 'Demandes à valider', n: scope.filter(d => d.statut === 'en_attente').length, c: '#f59e0b' },
    { label: 'Justificatifs manquants', n: scope.filter(d => d.statut === 'accepte' && !(d.justificatifs || []).length).length, c: '#22d3ee' },
    { label: 'Enveloppes > 90 %', n: bg2Env().filter(e => (Number(e.montant) || 0) > 0 && budgetEnveloppeUtilise(e.id) / Number(e.montant) >= 0.9).length, c: '#ef4444' }
  ];
  el.className = 'bg2-todo';
  el.innerHTML = `<div class="bg2-todo-h">${bg2Svg(BG2_IC.warn)}<span class="bg2-todo-t">À traiter</span></div>
    ${items.map(i => `<div class="bg2-todo-i"><span class="bg2-todo-d" style="background:${i.c}"></span>
      <span class="bg2-todo-l">${i.label}</span><span class="bg2-todo-n" style="color:${i.c}">${i.n}</span></div>`).join('')}`;
}

// ══ RÉPARTITION PAR POSTE ═════════════════════════════════════════════
function bg2RenderRepartition() {
  const el = document.getElementById('bg2Repartition');
  if (!el) return;
  const rows = bg2Env().map((e, i) => ({
    label: e.nom, val: budgetEnveloppeUtilise(e.id), c: BG2_ENV_THEMES[i % BG2_ENV_THEMES.length].c
  })).filter(r => r.val > 0).sort((a, b) => b.val - a.val);
  if (!rows.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune dépense engagée.</div>'; return; }
  const max = rows[0].val;
  el.innerHTML = `<div class="bg2-rep">${rows.map(r => `<div>
    <div class="bg2-rep-h"><span class="bg2-rep-l">${escHtml(r.label)}</span><span class="bg2-rep-v">${bg2Eur(r.val)}</span></div>
    <div class="v2-prog" style="height:6px"><span style="width:${Math.round(r.val / max * 100)}%;background:${r.c}"></span></div>
  </div>`).join('')}</div>`;
}

// ══ PARTAGE FOYER / RÉSIDENT ══════════════════════════════════════════
function bg2RenderPartage() {
  const el = document.getElementById('bg2Partage');
  if (!el) return;
  const rows = bg2Scope().filter(d => d.partage50)
    .sort((a, b) => String(b.dateDepense || '').localeCompare(String(a.dateDepense || '')))
    .slice(0, 6);
  if (!rows.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune dépense en partage 50/50.</div>'; return; }
  el.innerHTML = rows.map(d => {
    const nb = (d.remboursements || []).length || (d.residentIds || []).length;
    const perso = nb > 0 ? (Number(d.partResident) || 0) / nb : null;
    const paye = (d.remboursements || []).filter(r => r.paye).length;
    return `<div class="bg2-part">
      <div style="flex:1;min-width:0">
        <div class="bg2-part-l">${escHtml(d.motif || 'Dépense partagée')}</div>
        <div class="bg2-part-d">${bg2Eur(d.montant)} · ${nb} résident${nb > 1 ? 's' : ''}${nb > 0 ? ` · ${paye}/${nb} remboursé${paye > 1 ? 's' : ''}` : ''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="bg2-part-v">${perso === null ? '—' : bg2Eur(perso)}</div>
        <div class="bg2-part-u">/pers.</div>
      </div>
    </div>`;
  }).join('');
}

// ══ RÉALISÉ VS PRÉVISIONNEL ═══════════════════════════════════════════
function bg2RenderPrevisionnel() {
  const el = document.getElementById('bg2Previsionnel');
  if (!el) return;
  const annee = new Date().getFullYear();
  const engage = bg2Scope().filter(bg2Engage);
  const cols = [1, 2, 3, 4].map(t => {
    const real = engage.filter(d => {
      const s = String(d.dateDepense || '');
      if (s.slice(0, 4) !== String(annee)) return false;
      const m = Number(s.slice(5, 7));
      return m >= (t - 1) * 3 + 1 && m <= t * 3;
    }).reduce((s, d) => s + (Number(d.montant) || 0), 0);
    const p = BG2_PREV.find(x => x.annee === annee && x.trimestre === t);
    return { label: 'T' + t, real, prev: p ? p.montant : null };
  });
  const max = Math.max(...cols.map(c => Math.max(c.real, c.prev || 0)));
  if (max <= 0) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun réalisé ni prévisionnel sur ' + annee + '.'
      + (BG2_MISSING.budget_previsionnel ? ' Le prévisionnel nécessite migration-budget.sql.' : '') + '</div>';
    return;
  }
  const h = v => Math.max(3, Math.round((v || 0) / max * 100));
  el.innerHTML = `<div class="bg2-prev">${cols.map(c => `<div class="bg2-prev-c">
      <div class="bg2-prev-bars">
        ${c.prev === null ? '' : `<span class="bg2-prev-p" style="height:${h(c.prev)}%" title="${escAttr('Prévu ' + bg2Eur(c.prev))}"></span>`}
        <span class="bg2-prev-r" style="height:${h(c.real)}%" title="${escAttr('Réalisé ' + bg2Eur(c.real))}"></span>
      </div>
      <div class="bg2-prev-l">${c.label}</div></div>`).join('')}</div>
    <div class="bg2-leg"><span><i style="background:#334155"></i>Prévu</span><span><i style="background:#16a34a"></i>Réalisé</span></div>
    ${BG2_PREV.some(p => p.annee === annee) ? '' : `<div class="bg2-hint" style="margin-top:8px">${BG2_MISSING.budget_previsionnel ? 'Prévisionnel indisponible : exécutez migration-budget.sql.' : 'Aucun prévisionnel défini pour ' + annee + '.'}</div>`}`;
}

// ══ JUSTIFICATIFS ═════════════════════════════════════════════════════
function bg2RenderJustifs() {
  const el = document.getElementById('bg2Justifs');
  if (!el) return;
  const scope = bg2Scope();
  const recus = scope.filter(d => (d.justificatifs || []).length > 0).length;
  const attente = scope.filter(d => d.statut === 'accepte' && !(d.justificatifs || []).length).length;
  const rows = [];
  if (recus) rows.push({ l: `${recus} justificatif${recus > 1 ? 's' : ''} reçu${recus > 1 ? 's' : ''}`, tag: 'OK', c: '#34d399', ic: BG2_IC.ok });
  if (attente) rows.push({ l: `${attente} en attente`, tag: 'À relancer', c: '#f59e0b', ic: BG2_IC.clock });
  if (!rows.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun justificatif attendu ni reçu.</div>'; return; }
  el.innerHTML = rows.map(r => `<div class="bg2-jl"><span style="color:${r.c}">${bg2Svg(r.ic, 2.4)}</span>
    <span class="bg2-jl-l">${escHtml(r.l)}</span><span class="bg2-jl-t" style="color:${r.c}">${r.tag}</span></div>`).join('');
}

// ══ TOP FOURNISSEURS ══════════════════════════════════════════════════
function bg2RenderFournisseurs() {
  const el = document.getElementById('bg2Fournisseurs');
  if (!el) return;
  if (BG2_MISSING.budget_fournisseurs) {
    el.innerHTML = '<div class="v2-blk-vide">Suivi des fournisseurs indisponible : exécutez migration-budget.sql.</div>';
    return;
  }
  if (!BG2_FOURN.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun fournisseur enregistré.</div>'; return; }
  const isAdmin = typeof Auth !== 'undefined' && Auth.isAdmin();
  el.innerHTML = BG2_FOURN.slice(0, 6).map(f => `<div class="bg2-fo">
    <span class="bg2-fo-av" style="background:${bg2AvC(f.nom)}">${escHtml(bg2Init(f.nom))}</span>
    <span class="bg2-fo-n" title="${escAttr(f.nom)}">${escHtml(f.nom)}</span>
    <span class="bg2-fo-m">${bg2Eur(f.montant)}</span>
    ${isAdmin ? `<button type="button" class="bg2-mini bg2-mini-danger" style="width:26px;padding:0" title="Supprimer" onclick="bg2DeleteFournisseur('${escAttr(f.id)}')">${bg2Svg(BG2_IC.trash)}</button>` : ''}
  </div>`).join('');
}

// ══ RENDU PRINCIPAL ═══════════════════════════════════════════════════
function renderBudget() {
  const isAdmin = typeof Auth !== 'undefined' && Auth.isAdmin();
  const cu = budgetCurrentUser();
  const list = bg2Dem();
  const enveloppes = bg2Env();

  const envSel = document.getElementById('bgFiltreEnveloppe');
  if (envSel) {
    const current = envSel.value;
    envSel.innerHTML = '<option value="">Toutes les enveloppes</option>' +
      enveloppes.map(e => `<option value="${escAttr(e.id)}">${escHtml(e.nom)}</option>`).join('');
    envSel.value = current;
  }
  if (isAdmin) {
    const empSel = document.getElementById('bgFiltreEmploye');
    if (empSel) {
      const current = empSel.value;
      const m = new Map();
      list.forEach(d => { if (d.employeId && !m.has(d.employeId)) m.set(d.employeId, d.employeNom); });
      empSel.innerHTML = '<option value="">Tous les employés</option>' +
        Array.from(m.entries()).map(([id, nom]) => `<option value="${escAttr(id)}">${escHtml(nom)}</option>`).join('');
      empSel.value = current;
    }
  }

  const fSt = document.getElementById('bgFiltreStatut')?.value || '';
  const fEnv = document.getElementById('bgFiltreEnveloppe')?.value || '';
  const fEmp = document.getElementById('bgFiltreEmploye')?.value || '';
  document.querySelectorAll('#bg2Filtres .v2-chip-f').forEach(b => b.classList.toggle('on', (b.dataset.st || '') === fSt));

  let filtered = list;
  if (!isAdmin) filtered = filtered.filter(d => String(d.employeId) === String(cu.employeId));
  if (fSt) filtered = filtered.filter(d => d.statut === fSt);
  if (fEnv) filtered = filtered.filter(d => d.enveloppeId === fEnv);
  if (isAdmin && fEmp) filtered = filtered.filter(d => d.employeId === fEmp);

  const statsSource = isAdmin ? list : list.filter(d => String(d.employeId) === String(cu.employeId));
  const acceptes = statsSource.filter(d => d.statut === 'accepte');
  const justifiees = statsSource.filter(d => d.statut === 'justifie');
  const totalEngage = [...acceptes, ...justifiees].reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('bgStatEnAttente', statsSource.filter(d => d.statut === 'en_attente').length);
  set('bgStatAcceptes', acceptes.length);
  set('bgStatJustifiees', justifiees.length);
  set('bgStatRefuses', statsSource.filter(d => d.statut === 'refuse').length);
  set('bgStatTotal', budgetFmtMontant(totalEngage));

  // Cartes d'alerte
  const pendingCard = document.getElementById('bgPendingCard');
  if (pendingCard) {
    const allEnAttente = list.filter(d => d.statut === 'en_attente');
    if (isAdmin && allEnAttente.length) {
      pendingCard.style.display = '';
      document.getElementById('bgPendingList').innerHTML = allEnAttente
        .sort((a, b) => String(a.dateDemande || '').localeCompare(String(b.dateDemande || '')))
        .map(d => budgetItemHtml(d, isAdmin)).join('');
    } else { pendingCard.style.display = 'none'; }
  }
  const justifCard = document.getElementById('bgJustifCard');
  if (justifCard) {
    const mes = list.filter(d => d.statut === 'accepte' && String(d.employeId) === String(cu.employeId));
    if (!isAdmin && mes.length) {
      justifCard.style.display = '';
      document.getElementById('bgJustifList').innerHTML = mes
        .sort((a, b) => String(a.dateTraitement || '').localeCompare(String(b.dateTraitement || '')))
        .map(d => budgetItemHtml(d, isAdmin)).join('');
    } else { justifCard.style.display = 'none'; }
  }

  renderEnveloppes();

  // Tableau des demandes
  const el = document.getElementById('bgList');
  if (el) {
    if (!filtered.length) {
      el.innerHTML = '<div class="v2-blk"><div class="v2-blk-vide">Aucune demande de budget trouvée.</div></div>';
    } else {
      const rows = filtered.slice()
        .sort((a, b) => String(b.dateDemande || '').localeCompare(String(a.dateDemande || '')))
        .map(d => bg2RowHtml(d, isAdmin, cu)).join('');
      el.innerHTML = `<div class="bg2-tblwrap"><div class="bg2-tblscroll"><table class="bg2-tbl"><tbody>${rows}</tbody></table></div></div>`;
    }
  }

  bg2RenderAnnuel();
  bg2RenderMois();
  bg2RenderATraiter();
  bg2RenderRepartition();
  bg2RenderPartage();
  bg2RenderPrevisionnel();
  bg2RenderJustifs();
  bg2RenderFournisseurs();
}

// ══ MODALE GÉNÉRIQUE (gabarit .v2-ov / .v2-md) ════════════════════════
function bg2Modal(id, opts) {
  document.getElementById(id)?.remove();
  const div = document.createElement('div');
  div.innerHTML = `<div class="v2-ov" id="${id}" onclick="if(event.target===this)bg2CloseModal('${id}')">
    <div class="v2-md" style="--mc:${opts.c || '#818cf8'}">
      <div class="v2-md-h">
        <span class="v2-md-ico">${bg2Svg(opts.icon || BG2_IC.folder)}</span>
        <div><div class="v2-md-t">${escHtml(opts.title)}</div>${opts.sub ? `<div class="v2-md-s">${escHtml(opts.sub)}</div>` : ''}</div>
        <button type="button" class="v2-md-x" onclick="bg2CloseModal('${id}')">${bg2Svg(BG2_IC.x)}</button>
      </div>
      <div class="v2-md-b">${opts.body}</div>
      <div class="v2-md-f">${opts.footer}</div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
  requestAnimationFrame(() => document.getElementById(id)?.classList.add('open'));
}
function bg2CloseModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => m.remove(), 220);
}

// ══ ENVELOPPES — MODALE ═══════════════════════════════════════════════
function openEnveloppeModal(id) {
  const env = id ? bg2Env().find(e => e.id === id) : null;
  bg2Modal('modalBudgetEnv', {
    c: '#4ade80', icon: BG2_IC.folder,
    title: env ? 'Modifier l’enveloppe' : 'Nouvelle enveloppe budgétaire',
    sub: 'Montant alloué pour l’exercice',
    body: `<div>
        <label class="v2-fld-l" for="benvNom">Nom *</label>
        <input type="text" id="benvNom" class="v2-fld" value="${env ? escAttr(env.nom) : ''}" placeholder="Ex : Activités éducatives"/>
      </div>
      <div>
        <label class="v2-fld-l" for="benvMontant">Montant alloué (€) *</label>
        <input type="number" id="benvMontant" class="v2-fld" min="0" step="0.01" value="${env ? escAttr(env.montant) : ''}"/>
      </div>
      <div>
        <label class="v2-fld-l" for="benvDescription">Description</label>
        <textarea id="benvDescription" class="v2-fld" rows="2">${env ? escHtml(env.description || '') : ''}</textarea>
      </div>`,
    footer: `${env ? `<button type="button" class="v2-btn-sec" style="color:var(--v2-danger-text);flex:.8" onclick="deleteEnveloppe('${escAttr(env.id)}')">${bg2Svg(BG2_IC.trash)} Supprimer</button>` : ''}
      <button type="button" class="v2-btn-sec" onclick="bg2CloseModal('modalBudgetEnv')">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="saveEnveloppe('${env ? escAttr(env.id) : ''}')">${bg2Svg(BG2_IC.save)} Enregistrer</button>`
  });
}

// ══ NOUVELLE DEMANDE — remplissage de la modale statique ══════════════
function openNouvelleDemandeBudget() {
  const g = id => document.getElementById(id);
  g('bgFormMontant').value = '';
  g('bgFormDate').value = today();
  g('bgFormMotif').value = '';
  g('bgMotifCount').textContent = '0';
  g('bgFormPartage50').checked = false;
  g('bgFormProjetInput').value = '';
  window._pendingProjetFiles = [];
  renderBudgetProjetFiles();
  g('bgFormEnveloppe').innerHTML = '<option value="">Sélectionner une enveloppe</option>' +
    bg2Env().map(e => `<option value="${escAttr(e.id)}">${escHtml(e.nom)}</option>`).join('');
  const residents = (typeof _budgetResidentsCache !== 'undefined' ? _budgetResidentsCache : [])
    .filter(r => r.statut !== 'sorti')
    .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
  const box = g('bgFormResidents');
  if (box) box.innerHTML = residents.map(r => `<label class="bg2-reschip">
      <input type="checkbox" class="bg-res-check" value="${escAttr(r.id)}" style="display:none" onchange="updateBgResidentChipStyle(this);updateBgPrixParPersonne()"/>
      ${escHtml(((r.prenom || '') + ' ' + (r.nom || '')).trim())}
    </label>`).join('') || '<span class="bg2-hint">Aucun résident actif.</span>';
  updateBgPrixParPersonne();
  openModal('modalBudgetDemande');
}

function updateBgResidentChipStyle(checkbox) {
  const chip = checkbox.closest('.bg2-reschip');
  if (chip) chip.classList.toggle('on', checkbox.checked);
}

function renderBudgetProjetFiles() {
  const box = document.getElementById('bgFormProjetFiles');
  if (!box) return;
  box.innerHTML = (window._pendingProjetFiles || []).map(f => `<div class="bg2-file">
    <span style="color:var(--v2-t6)">${bg2Svg(BG2_IC.doc)}</span>
    <span class="n">${escHtml(f.nom)}</span>
    <button type="button" class="bg2-mini" style="width:26px;padding:0" onclick="removeBudgetProjetFile('${escAttr(f.id)}')">${bg2Svg(BG2_IC.x)}</button>
  </div>`).join('');
}

function updateBgPrixParPersonne() {
  const el = document.getElementById('bgPrixParPersonne');
  const montant = parseFloat(document.getElementById('bgFormMontant')?.value) || 0;
  const nb = document.querySelectorAll('#bgFormResidents .bg-res-check:checked').length;
  if (el) {
    if (nb > 0 && montant > 0) {
      el.style.display = '';
      el.querySelector('strong').textContent = budgetFmtMontant(montant / nb) + ` (${nb} résident${nb > 1 ? 's' : ''})`;
    } else { el.style.display = 'none'; }
  }
  const pd = document.getElementById('bgPartageDetail');
  const p50 = document.getElementById('bgFormPartage50')?.checked;
  if (!pd) return;
  if (p50 && montant > 0) {
    const part = montant * 0.5;
    pd.style.display = '';
    pd.className = 'bg2-note bg2-note-warn';
    pd.innerHTML = `<div class="bg2-kv"><span>Part foyer (50 %)</span><span>${budgetFmtMontant(part)}</span></div>
      <div class="bg2-kv" style="margin-top:5px"><span>Part résident(s) (50 %)</span><span>${budgetFmtMontant(part)}</span></div>
      <div class="bg2-hint" style="margin-top:6px">${nb > 0
        ? `Soit ${budgetFmtMontant(part / nb)} à rembourser par résident (${nb}).`
        : 'Sélectionnez au moins un résident pour répartir sa part.'}</div>`;
  } else { pd.style.display = 'none'; }
}

// ══ JUSTIFICATIF — visionneuse ════════════════════════════════════════
function voirJustificatif(demandeId, idx) {
  const d = bg2Dem().find(x => x.id === demandeId);
  const j = d?.justificatifs?.[idx];
  if (!j) return;
  const t = document.getElementById('bgJustifTitle');
  if (t) t.textContent = j.name;
  const body = document.getElementById('bgJustifBody');
  if (!body) return;
  if ((j.mimeType || '').startsWith('image/')) {
    body.innerHTML = `<img src="${j.data}" alt="${escAttr(j.name)}" style="max-width:100%;border-radius:14px"/>`;
  } else {
    body.innerHTML = `<div style="padding:14px 0;text-align:center">
      <div style="color:var(--v2-t6);display:flex;justify-content:center;margin-bottom:10px"><span style="width:34px;height:34px;display:block">${bg2Svg(BG2_IC.doc)}</span></div>
      <div style="font-size:13px;color:var(--v2-t3);margin-bottom:14px">${escHtml(j.name)}</div>
      <a href="${j.data}" download="${escAttr(j.name)}" class="v2-btn-pri" style="display:inline-flex;padding:0 18px">Télécharger</a></div>`;
  }
  openModal('modalBudgetJustif');
}

// ══ PRÉVISIONNEL — modale & écriture ══════════════════════════════════
function bg2OpenPrevModal() {
  const annee = new Date().getFullYear();
  const val = t => { const p = BG2_PREV.find(x => x.annee === annee && x.trimestre === t); return p ? p.montant : ''; };
  bg2Modal('modalBudgetPrev', {
    c: '#4ade80', icon: BG2_IC.chart,
    title: 'Prévisionnel ' + annee,
    sub: 'Montant prévu par trimestre',
    body: `<div class="v2-grid2">
        ${[1, 2, 3, 4].map(t => `<div>
          <label class="v2-fld-l" for="bgPrevT${t}">T${t} (€)</label>
          <input type="number" id="bgPrevT${t}" class="v2-fld" min="0" step="0.01" value="${escAttr(val(t))}" placeholder="0,00"/>
        </div>`).join('')}
      </div>
      ${BG2_MISSING.budget_previsionnel ? '<div class="v2-note v2-note-warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + BG2_IC.warn + '</svg><span>Table absente : exécutez migration-budget.sql pour pouvoir enregistrer.</span></div>' : ''}`,
    footer: `<button type="button" class="v2-btn-sec" onclick="bg2CloseModal('modalBudgetPrev')">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="bg2SavePrev()">${bg2Svg(BG2_IC.save)} Enregistrer</button>`
  });
}

async function bg2SavePrev() {
  if (BG2_MISSING.budget_previsionnel) { bg2WriteRefused('budget_previsionnel'); return; }
  const annee = new Date().getFullYear();
  const etab = await bg2Etab();
  const rows = [];
  for (let t = 1; t <= 4; t++) {
    const raw = document.getElementById('bgPrevT' + t)?.value;
    if (raw === '' || raw === undefined || raw === null) continue;
    const m = parseFloat(raw);
    if (isNaN(m) || m < 0) { toast('Montant invalide pour T' + t, 'error'); return; }
    rows.push({ etablissement_id: etab, annee, trimestre: t, montant: m, updated_at: new Date().toISOString() });
  }
  if (!rows.length) { toast('Aucun montant saisi', 'error'); return; }
  try {
    const { error } = await supabaseClient.from('budget_previsionnel')
      .upsert(rows, { onConflict: 'etablissement_id,annee,trimestre' });
    if (error) throw error;
  } catch (e) {
    console.error(e);
    bg2WriteRefused('budget_previsionnel');
    return;
  }
  await bg2LoadExtras();
  bg2CloseModal('modalBudgetPrev');
  toast('Prévisionnel enregistré');
  renderBudget();
}

// ══ FOURNISSEURS — modale & écriture ══════════════════════════════════
function bg2OpenFournisseurModal() {
  bg2Modal('modalBudgetFourn', {
    c: '#f59e0b', icon: BG2_IC.truck,
    title: 'Ajouter un fournisseur',
    sub: 'Montant engagé sur l’exercice',
    body: `<div>
        <label class="v2-fld-l" for="bgFournNom">Fournisseur *</label>
        <input type="text" id="bgFournNom" class="v2-fld" placeholder="Ex : Metro Distribution"/>
      </div>
      <div>
        <label class="v2-fld-l" for="bgFournMontant">Montant engagé (€) *</label>
        <input type="number" id="bgFournMontant" class="v2-fld" min="0" step="0.01" placeholder="0,00"/>
      </div>
      ${BG2_MISSING.budget_fournisseurs ? '<div class="v2-note v2-note-warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + BG2_IC.warn + '</svg><span>Table absente : exécutez migration-budget.sql pour pouvoir enregistrer.</span></div>' : ''}`,
    footer: `<button type="button" class="v2-btn-sec" onclick="bg2CloseModal('modalBudgetFourn')">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="bg2SaveFournisseur()">${bg2Svg(BG2_IC.save)} Enregistrer</button>`
  });
}

async function bg2SaveFournisseur() {
  if (BG2_MISSING.budget_fournisseurs) { bg2WriteRefused('budget_fournisseurs'); return; }
  const nom = (document.getElementById('bgFournNom')?.value || '').trim();
  const montant = parseFloat(document.getElementById('bgFournMontant')?.value);
  if (!nom) { toast('Le nom du fournisseur est requis', 'error'); return; }
  if (isNaN(montant) || montant < 0) { toast('Montant invalide', 'error'); return; }
  const etab = await bg2Etab();
  try {
    const { error } = await supabaseClient.from('budget_fournisseurs')
      .insert({ etablissement_id: etab, nom, montant, annee: new Date().getFullYear() });
    if (error) throw error;
  } catch (e) {
    console.error(e);
    bg2WriteRefused('budget_fournisseurs');
    return;
  }
  await bg2LoadExtras();
  bg2CloseModal('modalBudgetFourn');
  toast('Fournisseur enregistré');
  renderBudget();
}

async function bg2DeleteFournisseur(id) {
  if (BG2_MISSING.budget_fournisseurs) { bg2WriteRefused('budget_fournisseurs'); return; }
  if (!confirm('Supprimer ce fournisseur ?')) return;
  try {
    const { error } = await supabaseClient.from('budget_fournisseurs').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error(e);
    bg2WriteRefused('budget_fournisseurs');
    return;
  }
  BG2_FOURN = BG2_FOURN.filter(f => f.id !== id);
  toast('Fournisseur supprimé', 'info');
  renderBudget();
}

// js/budget.js a posé son écouteur DOMContentLoaded en capturant SA version
// d'initBudget : la redéfinition ci-dessus ne l'atteint pas. On ajoute donc un
// second écouteur, qui ne fait que charger les données complémentaires puis
// redessiner (le rendu, lui, passe bien par le renderBudget() V2).
document.addEventListener('DOMContentLoaded', async () => {
  const annee = document.getElementById('bg2Annee');
  if (annee) annee.textContent = new Date().getFullYear();
  if (typeof Auth === 'undefined' || !Auth.getSession()) return;
  if (typeof requireModule === 'function' && !requireModule('access_budget')) return;
  await bg2LoadExtras();
  renderBudget();
});

if (typeof registerPageInit === 'function') registerPageInit('budget', initBudget);
