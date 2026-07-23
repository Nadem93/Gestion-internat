// ── REMPLAÇANTS & VACATAIRES — DESIGN V2 ──────────────────────────────
// Reproduit la maquette « Contacts extérieurs (RH) » : le carnet d'adresses
// des intervenants extérieurs devient un VIVIER de remplacement, avec les
// besoins à couvrir, les missions, les disponibilités de la semaine, la
// conformité des pièces administratives, le coût des remplacements et les
// évaluations post-mission.
//
// Les données d'identité et les actions d'écriture de base restent celles de
// js/contacts-externes.js et js/contacts-externes-supabase.js : cette couche
// ne réécrit PAS l'accès Supabase existant, elle l'étend.
//
// CE QUE LA MAQUETTE MONTRE ET QUI N'EXISTAIT PAS EN BASE :
//   · métier, statut, taux horaire, disponibilité   → colonnes ajoutées sur
//     public.contacts_externes
//   · besoins de remplacement                       → public.ce_besoins
//   · missions et leur coût                         → public.ce_missions
//   · disponibilités jour par jour                  → public.ce_dispos
//   · pièces administratives                        → public.ce_pieces
//   · évaluations post-mission                      → public.ce_evaluations
//   · diffusion d'un besoin et réponses             → public.ce_diffusions
// Le tout est créé par migration-contacts-externes.sql. Tant que ce fichier
// n'a pas été exécuté, la page reste PLEINEMENT utilisable : les blocs
// concernés s'affichent vides en citant le fichier, et toute écriture est
// refusée avec un toast nommant ce même fichier. Aucune valeur n'est inventée.
//
// DONNÉES RH SENSIBLES : taux horaire, coût des remplacements, pièces
// administratives, contrat de vacation et évaluations ne sont affichés qu'aux
// profils RH (voir ce2CanRH). Le contrôle d'accès du module (access_annuaire)
// posé par la page n'est pas modifié.

const CE2_SQL = 'migration-contacts-externes.sql';

// ── Référentiels (identiques à la maquette) ───────────────────────────
const CE2_METIERS = {
  educ:     { l: 'Éducateur',  c: '#818cf8' },
  aes:      { l: 'AES / AMP',  c: '#22d3ee' },
  veilleur: { l: 'Veilleur',   c: '#7c3aed' },
  ide:      { l: 'Infirmier',  c: '#ec4899' },
  surv:     { l: 'Surveillant', c: '#f59e0b' }
};
const CE2_STATUTS = {
  dispo:   { l: 'Disponible',   c: '#10b981' },
  mission: { l: 'En mission',   c: '#f59e0b' },
  indispo: { l: 'Indisponible', c: '#64748b' }
};
const CE2_ST_NR = { l: 'Non renseigné', c: '#8095b4' };
const CE2_URGENCES = {
  urgent:     { l: 'Urgent',      c: '#ef4444' },
  a_pourvoir: { l: 'À pourvoir',  c: '#f59e0b' },
  couvert:    { l: 'Couvert',     c: '#10b981' }
};
const CE2_MISSION_ST = {
  prevue:   { l: 'Prévue',   c: '#818cf8' },
  en_cours: { l: 'En cours', c: '#f59e0b' },
  terminee: { l: 'Terminée', c: '#10b981' },
  annulee:  { l: 'Annulée',  c: '#64748b' }
};
const CE2_PIECES_DEF = [
  { k: 'cv',      l: 'CV' },
  { k: 'diplome', l: 'Diplôme' },
  { k: 'casier',  l: 'Casier' },
  { k: 'vitale',  l: 'C. Vitale' },
  { k: 'rib',     l: 'RIB' }
];
const CE2_PIECE_ETATS = {
  ok:           { c: '#34d399' },
  a_renouveler: { c: '#f59e0b' },
  manquante:    { c: '#ef4444' }
};
const CE2_FID = {
  prioritaire: { l: 'Prioritaire', c: '#34d399' },
  a_revoir:    { l: 'À revoir',    c: '#f59e0b' },
  ecarter:     { l: 'À écarter',   c: '#ef4444' }
};
const CE2_AV = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185', '#34d399'];

const CE2_IC = {
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  swap:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  cross:  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  warn:   '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  phone:  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail:   '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  send:   '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  chat:   '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  moon:   '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun:    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/>',
  book:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  spark:  '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/>',
  star:   '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit:   '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  chev:   '<polyline points="9 18 15 12 9 6"/>',
  dot:    '<circle cx="12" cy="12" r="9"/>',
  cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
};

function _ce2Svg(d, w, fill) {
  return `<svg viewBox="0 0 24 24" fill="${fill || 'none'}" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// ── État de la page ───────────────────────────────────────────────────
let CE2_FILTRE = 'all';        // 'all' | clé de CE2_METIERS | 'nm' (non renseigné)
let CE2_BESOIN_SEL = null;     // id du besoin sélectionné (matching + diffusion)

let CE2_EXTRAS = {};           // id contact → { metier, statut, taux_horaire, dispo }
let CE2_BESOINS = [];
let CE2_MISSIONS = [];
let CE2_DISPOS = [];
let CE2_PIECES = [];
let CE2_EVALS = [];
let CE2_DIFFS = [];

const CE2_OK = { extras: true, besoins: true, missions: true, dispos: true, pieces: true, evals: true, diffs: true };

// ── Droits ────────────────────────────────────────────────────────────
// Les blocs paie / contrat / évaluation sont réservés aux profils RH.
// Le contrôle d'accès du module lui-même (access_annuaire) reste celui posé
// par la page : il n'est ni desserré ni contourné ici.
function ce2CanRH() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  if (!s) return false;
  if (['admin', 'superadmin', 'direction', 'rh'].includes(s.role)) return true;
  if (typeof hasPermission !== 'function') return false;
  return hasPermission(s.userId, 'access_employes') || hasPermission(s.userId, 'access_paie');
}

// ── Chargement ────────────────────────────────────────────────────────
async function _ce2Fetch(table, cle, build) {
  try {
    let q = supabaseClient.from(table).select('*');
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) throw error;
    CE2_OK[cle] = true;
    return data || [];
  } catch (e) {
    CE2_OK[cle] = false;
    console.warn(`[contacts-externes-v2] table ${table} indisponible — exécutez ${CE2_SQL}`, e && (e.message || e));
    return [];
  }
}

async function ce2LoadExtras() {
  CE2_EXTRAS = {};
  try {
    const { data, error } = await supabaseClient
      .from('contacts_externes').select('id,metier,statut,taux_horaire,dispo');
    if (error) throw error;
    CE2_OK.extras = true;
    (data || []).forEach(r => {
      CE2_EXTRAS[r.id] = {
        metier: r.metier || null,
        statut: r.statut || null,
        taux_horaire: (r.taux_horaire === null || r.taux_horaire === undefined) ? null : Number(r.taux_horaire),
        dispo: r.dispo || ''
      };
    });
  } catch (e) {
    CE2_OK.extras = false;
    console.warn(`[contacts-externes-v2] colonnes metier/statut/taux_horaire/dispo absentes — exécutez ${CE2_SQL}`, e && (e.message || e));
  }
}

async function ce2Load() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  const [besoins, missions, dispos, pieces, evals, diffs] = await Promise.all([
    ce2LoadExtras().then(() => _ce2Fetch('ce_besoins', 'besoins', q => q.order('date_debut', { ascending: true }))),
    _ce2Fetch('ce_missions', 'missions', q => q.order('date_debut', { ascending: false })),
    _ce2Fetch('ce_dispos', 'dispos'),
    _ce2Fetch('ce_pieces', 'pieces'),
    _ce2Fetch('ce_evaluations', 'evals', q => q.order('evalue_le', { ascending: false })),
    _ce2Fetch('ce_diffusions', 'diffs', q => q.order('diffuse_le', { ascending: false }))
  ]);
  CE2_BESOINS = besoins; CE2_MISSIONS = missions; CE2_DISPOS = dispos;
  CE2_PIECES = pieces; CE2_EVALS = evals; CE2_DIFFS = diffs;
  const ouvert = CE2_BESOINS.find(b => b.urgence !== 'couvert');
  if (!CE2_BESOIN_SEL || !CE2_BESOINS.some(b => b.id === CE2_BESOIN_SEL)) {
    CE2_BESOIN_SEL = ouvert ? ouvert.id : (CE2_BESOINS[0] ? CE2_BESOINS[0].id : null);
  }
}

// ── Écritures (dégradation douce) ─────────────────────────────────────
function _ce2Refus(quoi) {
  toast(`${quoi} : exécutez ${CE2_SQL}`, 'error');
}

async function _ce2Insert(table, cle, row, quoi) {
  if (!CE2_OK[cle]) { _ce2Refus(quoi); return null; }
  try {
    const etab = await sbGetEtablissementId();
    const { data, error } = await supabaseClient.from(table).insert({ ...row, etablissement_id: etab }).select();
    if (error) throw error;
    return (data && data[0]) || null;
  } catch (e) {
    console.warn(`[contacts-externes-v2] écriture ${table} refusée`, e && (e.message || e));
    CE2_OK[cle] = false;
    _ce2Refus(quoi);
    return null;
  }
}

async function _ce2Update(table, cle, id, row, quoi) {
  if (!CE2_OK[cle]) { _ce2Refus(quoi); return null; }
  try {
    const { data, error } = await supabaseClient.from(table)
      .update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select();
    if (error) throw error;
    return (data && data[0]) || null;
  } catch (e) {
    console.warn(`[contacts-externes-v2] mise à jour ${table} refusée`, e && (e.message || e));
    _ce2Refus(quoi);
    return null;
  }
}

async function _ce2Delete(table, cle, id, quoi) {
  if (!CE2_OK[cle]) { _ce2Refus(quoi); return false; }
  try {
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn(`[contacts-externes-v2] suppression ${table} refusée`, e && (e.message || e));
    _ce2Refus(quoi);
    return false;
  }
}

// ── Accès dérivés ─────────────────────────────────────────────────────
function ce2Ex(id) { return CE2_EXTRAS[id] || { metier: null, statut: null, taux_horaire: null, dispo: '' }; }
function ce2MetierDef(id) { const k = ce2Ex(id).metier; return (k && CE2_METIERS[k]) ? CE2_METIERS[k] : null; }
function ce2StatutDef(id) { const k = ce2Ex(id).statut; return (k && CE2_STATUTS[k]) ? CE2_STATUTS[k] : CE2_ST_NR; }
function ce2Nom(c) { return `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Sans nom'; }
function ce2Ini(c) {
  const i = ((c.prenom || '')[0] || '') + ((c.nom || '')[0] || '');
  return (i || '?').toUpperCase();
}
function ce2Couleur(c, i) {
  // Couleur stable : dérivée de l'id, pas de l'ordre d'affichage.
  const s = String(c.id || i || '');
  let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return CE2_AV[h % CE2_AV.length];
}
function ce2Missions(id) { return CE2_MISSIONS.filter(m => m.contact_id === id); }
function ce2NoteMoy(id) {
  const n = CE2_EVALS.filter(e => e.contact_id === id && e.note !== null && e.note !== undefined).map(e => Number(e.note));
  if (!n.length) return null;
  return n.reduce((a, b) => a + b, 0) / n.length;
}
function ce2Fmt1(n) { return n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10).replace('.', ','); }
function ce2Euro(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('fr-FR') + ' €';
}
function ce2Date(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
function ce2Periode(a, b) {
  if (!a && !b) return 'dates non renseignées';
  if (a && b && a !== b) return `${ce2Date(a)} – ${ce2Date(b)}`;
  return ce2Date(a || b);
}
function ce2Contact(id) { return getContactsExternes().find(c => c.id === id) || null; }

// Lundi de la semaine courante.
function ce2Lundi() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function ce2Iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ── Liste filtrée ─────────────────────────────────────────────────────
function ce2Liste() {
  const all = getContactsExternes().slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  const q = (document.getElementById('ceSearch')?.value || '').trim().toLowerCase();
  let list = all;
  if (q) {
    list = list.filter(c => {
      const m = ce2MetierDef(c.id);
      return (ce2Nom(c)).toLowerCase().includes(q)
        || String(c.fonction || '').toLowerCase().includes(q)
        || String(CE_TYPES[c.type] || '').toLowerCase().includes(q)
        || String(m ? m.l : '').toLowerCase().includes(q)
        || String(c.telephone || '').includes(q)
        || String(c.email || '').toLowerCase().includes(q);
    });
  }
  if (CE2_FILTRE !== 'all') {
    list = list.filter(c => {
      const k = ce2Ex(c.id).metier;
      return CE2_FILTRE === 'nm' ? !k : k === CE2_FILTRE;
    });
  }
  return { all, list, q };
}

// ══ RENDU ═════════════════════════════════════════════════════════════
function ce2Render() {
  const rh = ce2CanRH();
  document.querySelectorAll('[data-ce2-rh]').forEach(el => { el.style.display = rh ? '' : 'none'; });
  const { all, list, q } = ce2Liste();

  const cnt = document.getElementById('ceCount');
  if (cnt) cnt.textContent = (q || CE2_FILTRE !== 'all')
    ? `${list.length}/${all.length} contacts`
    : `${all.length} contact${all.length > 1 ? 's' : ''}`;

  ce2RenderStats(all);
  ce2RenderBesoins();
  ce2RenderFiltres(all);
  ce2RenderVivier(list, q);
  ce2RenderMissions();
  ce2RenderDispos(all);
  ce2RenderMatching(all);
  ce2RenderDiffusion();
  if (rh) {
    ce2RenderConformite(all);
    ce2RenderCout();
    ce2RenderEvaluations();
  } else {
    // Les blocs RH sont masqués : on vide aussi leur contenu pour qu'aucune
    // donnée de paie, de conformité ou d'évaluation ne subsiste dans le DOM.
    ['ceConformite', 'ceConfAlerte', 'ceCout', 'ceEvaluations'].forEach(i => {
      const el = document.getElementById(i); if (el) el.innerHTML = '';
    });
  }
}

// ── Statistiques ──────────────────────────────────────────────────────
function ce2RenderStats(all) {
  const el = document.getElementById('ceStats');
  if (!el) return;
  const nb = k => all.filter(c => ce2Ex(c.id).statut === k).length;
  const aCouvrir = CE2_BESOINS.filter(b => b.urgence !== 'couvert').length;
  const stats = [
    { n: all.length, l: 'Vivier total',    c: '#e11d48', i: CE2_IC.users },
    { n: nb('dispo'),   l: 'Disponibles',  c: '#10b981', i: CE2_IC.check },
    { n: nb('mission'), l: 'En mission',   c: '#f59e0b', i: CE2_IC.swap },
    { n: aCouvrir,      l: 'Postes à couvrir', c: '#ef4444', i: CE2_IC.warn }
  ];
  el.innerHTML = stats.map(s => `<div class="ce2-stat" style="--sc:${s.c}">
      <span class="ce2-stat-i">${_ce2Svg(s.i)}</span>
      <div><div class="ce2-stat-n">${s.n}</div><div class="ce2-stat-l">${s.l}</div></div>
    </div>`).join('');
}

// ── Besoins à couvrir ─────────────────────────────────────────────────
function ce2RenderBesoins() {
  const el = document.getElementById('ceBesoins');
  if (!el) return;
  const add = `<button type="button" class="ce2-besoin-add" onclick="ce2OpenBesoin()">${_ce2Svg(CE2_IC.plus, 2.4)} Déclarer un besoin</button>`;
  if (!CE2_OK.besoins) {
    el.innerHTML = `<div class="v2-blk-vide">Besoins de remplacement indisponibles : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  const ouverts = CE2_BESOINS.filter(b => b.urgence !== 'couvert');
  if (!ouverts.length) {
    el.innerHTML = `<div class="ce2-besoins-g"><div class="v2-blk-vide">Aucun besoin de remplacement en cours.</div>${add}</div>`;
    return;
  }
  el.innerHTML = `<div class="ce2-besoins-g">${ouverts.map(b => {
    const u = CE2_URGENCES[b.urgence] || CE2_URGENCES.a_pourvoir;
    const ico = b.metier === 'veilleur' ? CE2_IC.moon : (b.motif || '').toLowerCase().includes('formation') ? CE2_IC.book : CE2_IC.sun;
    const meta = [b.motif || 'motif non renseigné', ce2Periode(b.date_debut, b.date_fin)].filter(Boolean).join(' · ');
    return `<button type="button" class="ce2-besoin${CE2_BESOIN_SEL === b.id ? ' on' : ''}" style="--bc:${u.c}" onclick="ce2SelBesoin('${b.id}')" title="Voir les suggestions pour ce besoin">
        <span class="ce2-besoin-i">${_ce2Svg(ico)}</span>
        <span style="flex:1;min-width:0">
          <span class="ce2-besoin-n" style="display:block">${escHtml(b.poste)}</span>
          <span class="ce2-besoin-m" style="display:block">${escHtml(meta)}</span>
        </span>
        <span class="ce2-besoin-u">${u.l}</span>
      </button>`;
  }).join('')}${add}</div>`;
}

function ce2SelBesoin(id) {
  CE2_BESOIN_SEL = id;
  ce2RenderBesoins();
  ce2RenderMatching(getContactsExternes());
  ce2RenderDiffusion();
}

// ── Filtres par métier ────────────────────────────────────────────────
function ce2RenderFiltres(all) {
  const el = document.getElementById('ceFiltres');
  if (!el) return;
  const counts = {}; let sansMetier = 0;
  all.forEach(c => { const k = ce2Ex(c.id).metier; if (k) counts[k] = (counts[k] || 0) + 1; else sansMetier++; });
  const defs = [{ id: 'all', l: 'Tous', c: '#818cf8', n: all.length }]
    .concat(Object.keys(CE2_METIERS).map(k => ({ id: k, l: CE2_METIERS[k].l, c: CE2_METIERS[k].c, n: counts[k] || 0 })));
  if (sansMetier) defs.push({ id: 'nm', l: 'Métier non renseigné', c: '#8095b4', n: sansMetier });
  el.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${CE2_FILTRE === f.id ? ' on' : ''}" onclick="ce2SetFiltre('${f.id}')">
      <span class="dot" style="background:${f.c}"></span>${escHtml(f.l)}<span class="n">${f.n}</span>
    </button>`).join('');
}

function ce2SetFiltre(id) { CE2_FILTRE = id; ce2Render(); }

// ── Fiches du vivier ──────────────────────────────────────────────────
function ce2RenderVivier(list, q) {
  const el = document.getElementById('ceList');
  if (!el) return;
  const rh = ce2CanRH();
  if (!list.length) {
    el.innerHTML = `<div class="v2-blk"><div class="v2-blk-vide">${
      q || CE2_FILTRE !== 'all'
        ? 'Aucun intervenant ne correspond à cette recherche ou à ce filtre.'
        : 'Aucun intervenant dans le vivier — ajoutez vos remplaçants et vacataires.'
    }</div></div>`;
    return;
  }
  el.innerHTML = `<div class="ce2-grid">${list.map((c, i) => {
    const ex = ce2Ex(c.id);
    const st = ce2StatutDef(c.id);
    const met = ce2MetierDef(c.id);
    const av = ce2Couleur(c, i);
    const nbM = ce2Missions(c.id).length;
    const note = ce2NoteMoy(c.id);
    const dispoLibre = ex.dispo || '—';
    // Proposer une mission est un geste RH : hors RH, la fiche se limite au contact.
    const propose = ex.statut === 'dispo' && rh;
    const cc = propose ? '#6ee7b7' : '#c6d3e6';
    const sousTitre = [met ? met.l : null, c.fonction || null].filter(Boolean).join(' · ')
      || (CE_TYPES[c.type] || 'Métier non renseigné');
    return `<div class="ce2-card" style="--stc:${st.c}">
      <div class="ce2-card-h">
        <span class="ce2-av" style="--ac:${av}">${escHtml(ce2Ini(c))}</span>
        <div style="flex:1;min-width:0">
          <div class="ce2-nom" title="${escHtml(ce2Nom(c))}">${escHtml(ce2Nom(c))}</div>
          <div class="ce2-metier">${escHtml(sousTitre)}</div>
        </div>
        <span class="ce2-st"><span class="dot"></span>${st.l}</span>
      </div>
      <div class="ce2-mini">
        ${rh ? `<div class="ce2-mini-c"><div class="ce2-mini-v">${ex.taux_horaire !== null ? ce2Euro(ex.taux_horaire) : '—'}</div><div class="ce2-mini-l">Taux / h</div></div>` : ''}
        <div class="ce2-mini-c"><div class="ce2-mini-v">${nbM}</div><div class="ce2-mini-l">Missions</div></div>
        ${rh ? `<div class="ce2-mini-c"><div class="ce2-mini-v or">${ce2Fmt1(note)}</div><div class="ce2-mini-l">Appréc. /5</div></div>` : ''}
      </div>
      <div class="ce2-lines">
        <div class="ce2-line">${_ce2Svg(CE2_IC.phone)}<span>${c.telephone ? escHtml(c.telephone) : 'téléphone non renseigné'}</span></div>
        <div class="ce2-line faible">${_ce2Svg(CE2_IC.clock)}<span>Dispo : ${escHtml(dispoLibre)}</span></div>
      </div>
      <button type="button" class="ce2-cta" style="--cc:${cc}" onclick="ce2Proposer('${c.id}')">
        ${_ce2Svg(propose ? CE2_IC.send : CE2_IC.phone, 2.2)}${propose ? 'Proposer une mission' : 'Contacter'}
      </button>
      <div class="ce2-icobar">
        <a class="ce2-ico" title="Envoyer un e-mail" ${c.email ? `href="mailto:${escHtml(c.email)}"` : 'aria-disabled="true"'}>${_ce2Svg(CE2_IC.mail)}</a>
        <a class="ce2-ico" title="Appeler" ${c.telephone ? `href="tel:${escHtml(c.telephone)}"` : 'aria-disabled="true"'}>${_ce2Svg(CE2_IC.phone)}</a>
        ${rh ? `<button type="button" class="ce2-ico" title="Évaluer après mission" onclick="ce2OpenEval('${c.id}')">${_ce2Svg(CE2_IC.star)}</button>` : ''}
        <button type="button" class="ce2-ico" title="Modifier" onclick="openCeModal('${c.id}')">${_ce2Svg(CE2_IC.edit)}</button>
        <button type="button" class="ce2-ico sup" title="Supprimer" onclick="deleteContactExterneCard('${c.id}')">${_ce2Svg(CE2_IC.trash)}</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// « Proposer une mission » / « Contacter »
function ce2Proposer(id) {
  const c = ce2Contact(id);
  if (!c) return;
  if (ce2Ex(id).statut === 'dispo') { ce2OpenMission(id); return; }
  if (c.telephone) { window.location.href = 'tel:' + c.telephone; return; }
  if (c.email) { window.location.href = 'mailto:' + c.email; return; }
  toast('Aucune coordonnée enregistrée pour ce contact', 'info');
}

// ── Missions récentes ─────────────────────────────────────────────────
function ce2RenderMissions() {
  const el = document.getElementById('ceMissions');
  if (!el) return;
  if (!CE2_OK.missions) {
    el.innerHTML = `<div class="v2-blk-vide">Missions indisponibles : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  if (!CE2_MISSIONS.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucune mission enregistrée — proposez une mission depuis une fiche du vivier.</div>';
    return;
  }
  el.innerHTML = CE2_MISSIONS.slice(0, 6).map((m, i) => {
    const c = ce2Contact(m.contact_id);
    const st = CE2_MISSION_ST[m.statut] || CE2_MISSION_ST.prevue;
    const nom = c ? ce2Nom(c) : 'Contact supprimé';
    const ini = c ? ce2Ini(c) : '?';
    const meta = [m.poste || 'poste non renseigné', ce2Periode(m.date_debut, m.date_fin)].filter(Boolean).join(' · ');
    return `<div class="ce2-row">
      <span class="ce2-av ce2-av-xs" style="--ac:${c ? ce2Couleur(c, i) : '#64748b'}">${escHtml(ini)}</span>
      <div style="flex:1;min-width:0">
        <div class="ce2-row-n">${escHtml(nom)}</div>
        <div class="ce2-row-m">${escHtml(meta)}</div>
      </div>
      <span class="ce2-tag" style="--tc:${st.c}">${st.l}</span>
    </div>`;
  }).join('');
}

// ── Disponibilités de la semaine ──────────────────────────────────────
function ce2RenderDispos(all) {
  const el = document.getElementById('ceDispos');
  if (!el) return;
  const jl = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const jn = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const lundi = ce2Lundi();
  const jours = jl.map((_, i) => { const d = new Date(lundi); d.setDate(d.getDate() + i); return ce2Iso(d); });

  if (!all.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun intervenant dans le vivier.</div>'; return; }
  if (!CE2_OK.dispos) {
    el.innerHTML = `<div class="v2-blk-vide">Disponibilités indisponibles : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  const rh = ce2CanRH();
  const idx = {};
  CE2_DISPOS.forEach(d => { idx[d.contact_id + '|' + d.jour] = d; });

  const lignes = all.slice(0, 8).map(c => {
    const cells = jours.map((j, i) => {
      const row = idx[c.id + '|' + j];
      const etat = row ? row.etat : 'nr';
      const cls = etat === 'dispo' ? 'ce2-j-dispo' : etat === 'mission' ? 'ce2-j-mission' : etat === 'indispo' ? 'ce2-j-indispo' : 'ce2-j-nr';
      const lib = etat === 'nr' ? 'non renseigné' : (CE2_STATUTS[etat] ? CE2_STATUTS[etat].l : etat);
      const t = `${jn[i]} — ${lib}`;
      return rh
        ? `<button type="button" class="ce2-j ${cls}" title="${escHtml(t)} (cliquer pour changer)" onclick="ce2CycleDispo('${c.id}','${j}')">${jl[i]}</button>`
        : `<span class="ce2-j ${cls}" title="${escHtml(t)}">${jl[i]}</span>`;
    }).join('');
    const court = ((c.prenom || '')[0] ? (c.prenom[0] + '. ') : '') + (c.nom || '');
    return `<div class="ce2-dispo-r">
      <span class="ce2-dispo-n" title="${escHtml(ce2Nom(c))}">${escHtml(court.trim() || ce2Nom(c))}</span>
      <span class="ce2-dispo-j">${cells}</span>
    </div>`;
  }).join('');

  el.innerHTML = lignes + `<div class="ce2-lg">
      <span><i style="background:#10b981"></i>Dispo</span>
      <span><i style="background:#f59e0b"></i>En mission</span>
      <span><i style="background:rgba(255,255,255,.1)"></i>Indisponible</span>
      <span><i style="border:1px dashed rgba(255,255,255,.3)"></i>Non renseigné</span>
    </div>`;
}

async function ce2CycleDispo(contactId, jour) {
  if (!ce2CanRH()) { toast('Réservé aux profils RH', 'error'); return; }
  const cycle = ['dispo', 'mission', 'indispo'];
  const row = CE2_DISPOS.find(d => d.contact_id === contactId && d.jour === jour);
  if (!row) {
    const cree = await _ce2Insert('ce_dispos', 'dispos', { contact_id: contactId, jour, etat: 'dispo' }, 'Disponibilité non enregistrée');
    if (cree) CE2_DISPOS.push(cree);
  } else {
    const i = cycle.indexOf(row.etat);
    if (i === cycle.length - 1) {
      if (await _ce2Delete('ce_dispos', 'dispos', row.id, 'Disponibilité non effacée')) {
        CE2_DISPOS = CE2_DISPOS.filter(d => d.id !== row.id);
      }
    } else {
      const maj = await _ce2Update('ce_dispos', 'dispos', row.id, { etat: cycle[i + 1] }, 'Disponibilité non enregistrée');
      if (maj) { row.etat = maj.etat; }
    }
  }
  ce2RenderDispos(getContactsExternes());
}

// ── Matching : suggestions pour le besoin sélectionné ─────────────────
// Le score est CALCULÉ à partir des données réelles ; la formule est affichée
// sous la liste pour qu'aucun chiffre ne soit opaque.
function ce2Score(c, besoin) {
  const ex = ce2Ex(c.id);
  let s = 0;
  const raisons = [];
  if (besoin.metier && ex.metier === besoin.metier) { s += 40; raisons.push(CE2_METIERS[ex.metier].l); }
  else if (!besoin.metier && ex.metier) { raisons.push(CE2_METIERS[ex.metier].l); }
  if (ex.statut === 'dispo') { s += 25; raisons.push('disponible'); }
  else if (ex.statut === 'mission') { raisons.push('en mission'); }
  const nbM = ce2Missions(c.id).length;
  s += Math.min(nbM, 10) / 10 * 20;
  if (nbM) raisons.push(nbM + ' mission' + (nbM > 1 ? 's' : ''));
  const note = ce2NoteMoy(c.id);
  if (note !== null) { s += note / 5 * 15; raisons.push('appréciation ' + ce2Fmt1(note)); }
  return { score: Math.round(s), why: raisons.join(' · ') || 'aucune donnée renseignée' };
}

function ce2RenderMatching(all) {
  const el = document.getElementById('ceMatching');
  const titre = document.getElementById('ceMatchTitre');
  if (!el) return;
  const b = CE2_BESOINS.find(x => x.id === CE2_BESOIN_SEL);
  if (titre) titre.textContent = b
    ? `Suggestions pour « ${b.poste} · ${ce2Periode(b.date_debut, b.date_fin)} »`
    : 'Suggestions de remplacement';
  if (!CE2_OK.besoins) {
    el.innerHTML = `<div class="v2-blk-vide">Suggestions indisponibles : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  if (!b) { el.innerHTML = '<div class="v2-blk-vide">Déclarez un besoin de remplacement pour obtenir des suggestions.</div>'; return; }
  const notes = all.map((c, i) => ({ c, i, ...ce2Score(c, b) }))
    .filter(x => x.score > 0)
    .sort((a, z) => z.score - a.score).slice(0, 4);
  if (!notes.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun intervenant ne peut être classé : renseignez le métier, le statut et les missions du vivier.</div>';
    return;
  }
  el.innerHTML = notes.map(x => {
    const col = x.score >= 90 ? '#34d399' : x.score >= 60 ? '#fbbf24' : '#fca5a5';
    return `<div class="ce2-row">
      <span class="ce2-av ce2-av-sm" style="--ac:${ce2Couleur(x.c, x.i)}">${escHtml(ce2Ini(x.c))}</span>
      <div style="flex:1;min-width:0">
        <div class="ce2-row-n">${escHtml(ce2Nom(x.c))}</div>
        <div class="ce2-row-m">${escHtml(x.why)}</div>
      </div>
      <span class="ce2-score" style="--pc:${col}">${x.score}%</span>
      <button type="button" class="ce2-prop" onclick="ce2OpenMission('${x.c.id}','${b.id}')">Proposer</button>
    </div>`;
  }).join('') + `<div class="ce2-form">Score calculé sur 100 : métier correspondant 40 · statut disponible 25 · expérience 20 (10 missions = maximum) · appréciation moyenne 15.</div>`;
}

// ── Diffusion du besoin ───────────────────────────────────────────────
function ce2RenderDiffusion() {
  const el = document.getElementById('ceDiffusion');
  const sst = document.getElementById('ceDiffSousTitre');
  if (!el) return;
  const b = CE2_BESOINS.find(x => x.id === CE2_BESOIN_SEL);
  if (sst) sst.textContent = b ? `Dernière diffusion — ${b.poste} :` : 'Dernière diffusion :';
  if (!CE2_OK.diffs) {
    el.innerHTML = `<div class="v2-blk-vide">Journal de diffusion indisponible : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  const rows = CE2_DIFFS.filter(d => !b || d.besoin_id === b.id).slice(0, 8);
  if (!rows.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune diffusion enregistrée pour ce besoin.</div>'; return; }
  const REP = {
    accepte:    { l: 'Accepté',      c: '#34d399', i: CE2_IC.check },
    refuse:     { l: 'Refusé',       c: '#fca5a5', i: CE2_IC.cross },
    en_attente: { l: 'Sans réponse', c: '#64748b', i: CE2_IC.dot }
  };
  el.innerHTML = rows.map(d => {
    const c = ce2Contact(d.contact_id);
    const r = REP[d.reponse] || REP.en_attente;
    return `<div class="ce2-diff-r" style="--rc:${r.c}">
      <span class="ce2-diff-i">${_ce2Svg(r.i, 2.4)}</span>
      <span class="ce2-diff-n">${escHtml(c ? ce2Nom(c) : 'Contact supprimé')}</span>
      <button type="button" class="ce2-diff-rep" title="Changer la réponse" onclick="ce2CycleReponse('${d.id}')">${r.l}</button>
    </div>`;
  }).join('');
}

// Destinataires pertinents : métier du besoin (ou tout le vivier si non
// renseigné), en excluant les intervenants marqués indisponibles.
function ce2Destinataires(b) {
  return getContactsExternes().filter(c => {
    const ex = ce2Ex(c.id);
    if (ex.statut === 'indispo') return false;
    if (b && b.metier && ex.metier && ex.metier !== b.metier) return false;
    return true;
  });
}

async function ce2Diffuser(canal) {
  if (!ce2CanRH()) { toast('Réservé aux profils RH', 'error'); return; }
  const b = CE2_BESOINS.find(x => x.id === CE2_BESOIN_SEL);
  if (!b) { toast('Sélectionnez d\'abord un besoin à diffuser', 'info'); return; }
  const dest = ce2Destinataires(b);
  const champ = canal === 'email' ? 'email' : 'telephone';
  const avec = dest.filter(c => c[champ]);
  if (!avec.length) { toast('Aucun destinataire avec ' + (canal === 'email' ? 'une adresse e-mail' : 'un téléphone'), 'info'); return; }

  for (const c of avec) {
    if (CE2_DIFFS.some(d => d.besoin_id === b.id && d.contact_id === c.id && d.canal === canal)) continue;
    const cree = await _ce2Insert('ce_diffusions', 'diffs',
      { besoin_id: b.id, contact_id: c.id, canal, reponse: 'en_attente' }, 'Diffusion non journalisée');
    if (!cree) return;
    CE2_DIFFS.unshift(cree);
  }
  // On prépare le message : l'envoi reste à la main de l'utilisateur, dans son
  // propre client de messagerie.
  const objet = `Besoin de remplacement — ${b.poste}`;
  const corps = `${b.poste}${b.motif ? ' (' + b.motif + ')' : ''} — ${ce2Periode(b.date_debut, b.date_fin)}. Êtes-vous disponible ?`;
  const cibles = avec.map(c => c[champ]).join(canal === 'email' ? ',' : ';');
  window.location.href = canal === 'email'
    ? `mailto:?bcc=${encodeURIComponent(cibles)}&subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`
    : `sms:${cibles}?&body=${encodeURIComponent(corps)}`;
  toast(`${avec.length} destinataire${avec.length > 1 ? 's' : ''} — le message s'ouvre dans votre messagerie`, 'info');
  ce2RenderDiffusion();
}

async function ce2CycleReponse(id) {
  if (!ce2CanRH()) { toast('Réservé aux profils RH', 'error'); return; }
  const cycle = ['en_attente', 'accepte', 'refuse'];
  const d = CE2_DIFFS.find(x => x.id === id);
  if (!d) return;
  const next = cycle[(cycle.indexOf(d.reponse) + 1) % cycle.length];
  const maj = await _ce2Update('ce_diffusions', 'diffs', id, { reponse: next }, 'Réponse non enregistrée');
  if (maj) { d.reponse = maj.reponse; ce2RenderDiffusion(); }
}

// ── Conformité des pièces administratives ─────────────────────────────
function ce2RenderConformite(all) {
  const el = document.getElementById('ceConformite');
  const alerte = document.getElementById('ceConfAlerte');
  if (!el) return;
  if (!CE2_OK.pieces) {
    el.innerHTML = `<div class="v2-blk-vide">Pièces administratives indisponibles : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    if (alerte) alerte.innerHTML = '';
    return;
  }
  if (!all.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun intervenant dans le vivier.</div>'; return; }
  const idx = {};
  CE2_PIECES.forEach(p => { idx[p.contact_id + '|' + p.piece] = p; });

  let manquantes = 0, aRenouveler = 0;
  const lignes = all.slice(0, 8).map(c => {
    const tds = CE2_PIECES_DEF.map(pd => {
      const p = idx[c.id + '|' + pd.k];
      const etat = p ? p.etat : 'manquante';
      if (etat === 'manquante') manquantes++;
      if (etat === 'a_renouveler') aRenouveler++;
      const col = (CE2_PIECE_ETATS[etat] || CE2_PIECE_ETATS.manquante).c;
      const ico = etat === 'ok' ? CE2_IC.check : etat === 'a_renouveler' ? CE2_IC.warn : CE2_IC.cross;
      const lib = etat === 'ok' ? 'fournie' : etat === 'a_renouveler' ? 'à renouveler' : 'manquante';
      return `<td><button type="button" class="ce2-piece" style="--pc:${col}" title="${pd.l} — ${lib} (cliquer pour changer)" onclick="ce2CyclePiece('${c.id}','${pd.k}')">${_ce2Svg(ico, 2.4)}</button></td>`;
    }).join('');
    return `<tr><td>${escHtml(ce2Nom(c))}</td>${tds}</tr>`;
  }).join('');

  el.innerHTML = `<div class="ce2-tbl-wrap"><table class="ce2-tbl">
      <thead><tr><th>Vacataire</th>${CE2_PIECES_DEF.map(p => `<th>${p.l}</th>`).join('')}</tr></thead>
      <tbody>${lignes}</tbody>
    </table></div>`;
  if (alerte) {
    alerte.innerHTML = (manquantes || aRenouveler)
      ? `<div class="ce2-alerte">${_ce2Svg(CE2_IC.warn)}<span>${manquantes} pièce${manquantes > 1 ? 's' : ''} manquante${manquantes > 1 ? 's' : ''} · ${aRenouveler} à renouveler</span></div>`
      : '';
  }
}

async function ce2CyclePiece(contactId, piece) {
  if (!ce2CanRH()) { toast('Réservé aux profils RH', 'error'); return; }
  const cycle = ['manquante', 'ok', 'a_renouveler'];
  const p = CE2_PIECES.find(x => x.contact_id === contactId && x.piece === piece);
  if (!p) {
    const cree = await _ce2Insert('ce_pieces', 'pieces', { contact_id: contactId, piece, etat: 'ok' }, 'Pièce non enregistrée');
    if (cree) CE2_PIECES.push(cree);
  } else {
    const next = cycle[(cycle.indexOf(p.etat) + 1) % cycle.length];
    const maj = await _ce2Update('ce_pieces', 'pieces', p.id, { etat: next }, 'Pièce non enregistrée');
    if (maj) p.etat = maj.etat;
  }
  ce2RenderConformite(getContactsExternes());
}

// ── Coût des remplacements ────────────────────────────────────────────
function ce2RenderCout() {
  const el = document.getElementById('ceCout');
  if (!el) return;
  if (!CE2_OK.missions) {
    el.innerHTML = `<div class="ce2-cout-t">Coût des remplacements</div><div class="v2-blk-vide">Indisponible : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  const an = new Date().getFullYear();
  const avecCout = CE2_MISSIONS.filter(m => m.cout !== null && m.cout !== undefined && m.date_debut);
  const anCour = avecCout.filter(m => new Date(m.date_debut + 'T00:00:00').getFullYear() === an);
  const total = anCour.reduce((s, m) => s + Number(m.cout), 0);
  const moyen = anCour.length ? total / anCour.length : null;

  const mois = [];
  const base = new Date(); base.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const somme = avecCout
      .filter(m => { const x = new Date(m.date_debut + 'T00:00:00'); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); })
      .reduce((s, m) => s + Number(m.cout), 0);
    mois.push({ l: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), v: somme });
  }
  const max = Math.max(...mois.map(m => m.v), 1);

  el.innerHTML = `<div class="ce2-cout-t">Coût des remplacements</div>
    <div class="ce2-cout-n">${anCour.length ? ce2Euro(total) : '—'}</div>
    <div class="ce2-cout-s">${anCour.length
      ? `cumul ${an} · coût moyen ${ce2Euro(moyen)}/mission (${anCour.length} mission${anCour.length > 1 ? 's' : ''} chiffrée${anCour.length > 1 ? 's' : ''})`
      : 'aucun coût de mission renseigné'}</div>
    <div class="ce2-bars">${mois.map(m => `<div class="ce2-bar-c" title="${escHtml(m.l)} : ${ce2Euro(m.v)}">
        <div class="ce2-bar" style="height:${Math.round(m.v / max * 100)}%"></div>
        <div class="ce2-bar-l">${escHtml(m.l)}</div>
      </div>`).join('')}</div>`;
}

// ── Contrat de vacation ───────────────────────────────────────────────
function ce2RenderActions() {
  const el = document.getElementById('ceActions');
  if (!el) return;
  const actions = [
    { l: 'Générer un contrat', s: 'CDD d’usage / vacation', c: '#0891b2', i: CE2_IC.file, f: 'ce2ActionContrat()' },
    { l: 'Déclarer la DPAE', s: 'avant embauche', c: '#16a34a', i: CE2_IC.shield, f: 'ce2ActionDpae()' },
    { l: 'Envoyer pour signature', s: 'signature électronique', c: '#6366f1', i: CE2_IC.send, f: 'ce2ActionSignature()' }
  ];
  el.innerHTML = actions.map(a => `<button type="button" class="ce2-act" style="--ac2:${a.c}" onclick="${a.f}">
      <span class="ce2-act-i">${_ce2Svg(a.i)}</span>
      <span style="flex:1;min-width:0">
        <span class="ce2-act-l" style="display:block">${a.l}</span>
        <span class="ce2-act-s" style="display:block">${a.s}</span>
      </span>
      <span class="ce2-act-x">${_ce2Svg(CE2_IC.chev)}</span>
    </button>`).join('');
}

function ce2ActionContrat() { window.location.href = 'contrats.html'; }
function ce2ActionDpae() {
  toast('La télédéclaration DPAE n\'est pas connectée à net-entreprises : la démarche reste à faire sur net-entreprises.fr', 'info');
}
function ce2ActionSignature() {
  toast('La signature électronique n\'est pas encore raccordée à un prestataire : envoyez le contrat par e-mail depuis la fiche', 'info');
}

// ── Évaluations post-mission ──────────────────────────────────────────
function ce2RenderEvaluations() {
  const el = document.getElementById('ceEvaluations');
  if (!el) return;
  if (!CE2_OK.evals) {
    el.innerHTML = `<div class="v2-blk-vide">Évaluations indisponibles : le fichier ${CE2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  if (!CE2_EVALS.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucune évaluation post-mission — utilisez l\'étoile d\'une fiche du vivier.</div>';
    return;
  }
  el.innerHTML = CE2_EVALS.slice(0, 6).map((e, i) => {
    const c = ce2Contact(e.contact_id);
    const f = CE2_FID[e.fidelisation] || null;
    const note = (e.note === null || e.note === undefined) ? null : Number(e.note);
    return `<div class="ce2-ev">
      <span class="ce2-av ce2-av-sm" style="--ac:${c ? ce2Couleur(c, i) : '#64748b'}">${escHtml(c ? ce2Ini(c) : '?')}</span>
      <div style="flex:1;min-width:0">
        <div class="ce2-ev-h">
          <span class="ce2-ev-n">${escHtml(c ? ce2Nom(c) : 'Contact supprimé')}</span>
          ${note !== null ? `<span class="ce2-ev-s">★ ${ce2Fmt1(note)}</span>` : ''}
        </div>
        ${e.commentaire ? `<div class="ce2-ev-c">« ${escHtml(e.commentaire)} »</div>` : ''}
      </div>
      ${f ? `<span class="ce2-ev-f" style="--fc:${f.c}">${f.l}</span>` : ''}
    </div>`;
  }).join('');
}

// ══ MODALES ═══════════════════════════════════════════════════════════

// ── Champs V2 ajoutés à la modale de contact ──────────────────────────
function ce2FillModal(c) {
  const met = document.getElementById('ceMetier');
  if (met) met.value = (c && ce2Ex(c.id).metier) || '';
  ce2RenderSeg();
  const st = document.getElementById('ceStatut');
  if (st) st.value = (c && ce2Ex(c.id).statut) || '';
  const tx = document.getElementById('ceTaux');
  if (tx) { const v = c ? ce2Ex(c.id).taux_horaire : null; tx.value = (v === null || v === undefined) ? '' : v; }
  const dp = document.getElementById('ceDispo');
  if (dp) dp.value = (c && ce2Ex(c.id).dispo) || '';
  const sub = document.getElementById('ceModalSub');
  if (sub) sub.textContent = c ? 'Fiche du vivier' : 'Nouveau remplaçant / vacataire';
  const avert = document.getElementById('ceModalAvert');
  if (avert) avert.style.display = CE2_OK.extras ? 'none' : '';
  document.querySelectorAll('[data-ce2-rh-modal]').forEach(el => { el.style.display = ce2CanRH() ? '' : 'none'; });
}

function ce2RenderSeg() {
  const box = document.getElementById('ceMetierSeg');
  if (!box) return;
  const cur = document.getElementById('ceMetier')?.value || '';
  box.innerHTML = Object.keys(CE2_METIERS).map(k =>
    `<button type="button" class="v2-seg-o${cur === k ? ' on' : ''}" onclick="ce2SetMetier('${k}')">${CE2_METIERS[k].l}</button>`
  ).join('') + `<button type="button" class="v2-seg-o${cur === '' ? ' on' : ''}" onclick="ce2SetMetier('')">Autre</button>`;
}

function ce2SetMetier(k) {
  const el = document.getElementById('ceMetier');
  if (el) el.value = k;
  ce2RenderSeg();
}

// Persiste les champs V2 après l'enregistrement du contact.
async function ce2AfterSave(id) {
  if (!id) return;
  const lire = i => document.getElementById(i);
  const taux = lire('ceTaux')?.value.trim();
  const patch = {
    metier: lire('ceMetier')?.value || null,
    statut: lire('ceStatut')?.value || null,
    taux_horaire: taux ? Number(taux.replace(',', '.')) : null,
    dispo: lire('ceDispo')?.value.trim() || ''
  };
  if (!CE2_OK.extras) { _ce2Refus('Métier, statut, taux et disponibilité non enregistrés'); return; }
  try {
    const { error } = await supabaseClient.from('contacts_externes').update(patch).eq('id', id);
    if (error) throw error;
    CE2_EXTRAS[id] = patch;
  } catch (e) {
    CE2_OK.extras = false;
    console.warn('[contacts-externes-v2] écriture des colonnes V2 refusée', e && (e.message || e));
    _ce2Refus('Métier, statut, taux et disponibilité non enregistrés');
  }
}

// ── Modale « besoin de remplacement » ─────────────────────────────────
function ce2OpenBesoin() {
  if (!ce2CanRH()) { toast('Réservé aux profils RH', 'error'); return; }
  ['ceBesoinPoste', 'ceBesoinMotif', 'ceBesoinDebut', 'ceBesoinFin'].forEach(i => {
    const el = document.getElementById(i); if (el) el.value = '';
  });
  const m = document.getElementById('ceBesoinMetier'); if (m) m.value = '';
  const u = document.getElementById('ceBesoinUrgence'); if (u) u.value = 'a_pourvoir';
  openModal('modalCeBesoin');
}

async function ce2SaveBesoin() {
  const poste = document.getElementById('ceBesoinPoste')?.value.trim();
  if (!poste) { toast('Le poste à couvrir est requis', 'error'); return; }
  const row = {
    poste,
    metier: document.getElementById('ceBesoinMetier')?.value || null,
    motif: document.getElementById('ceBesoinMotif')?.value.trim() || null,
    date_debut: document.getElementById('ceBesoinDebut')?.value || null,
    date_fin: document.getElementById('ceBesoinFin')?.value || null,
    urgence: document.getElementById('ceBesoinUrgence')?.value || 'a_pourvoir'
  };
  const cree = await _ce2Insert('ce_besoins', 'besoins', row, 'Besoin non enregistré');
  if (!cree) return;
  CE2_BESOINS.push(cree);
  CE2_BESOIN_SEL = cree.id;
  if (typeof auditLog === 'function') auditLog('ce_besoin_save', poste);
  closeModal('modalCeBesoin');
  toast('Besoin déclaré ✓', 'success');
  ce2Render();
}

// ── Modale « mission » ────────────────────────────────────────────────
function ce2OpenMission(contactId, besoinId) {
  if (!ce2CanRH()) { toast('Réservé aux profils RH', 'error'); return; }
  const c = ce2Contact(contactId);
  const b = CE2_BESOINS.find(x => x.id === (besoinId || CE2_BESOIN_SEL));
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v; };
  set('ceMissionContact', contactId || '');
  set('ceMissionBesoin', b ? b.id : '');
  set('ceMissionPoste', b ? b.poste : '');
  set('ceMissionDebut', b && b.date_debut ? b.date_debut : '');
  set('ceMissionFin', b && b.date_fin ? b.date_fin : '');
  set('ceMissionHeures', '');
  set('ceMissionCout', '');
  set('ceMissionStatut', 'prevue');
  const t = document.getElementById('ceMissionQui');
  if (t) t.textContent = c ? ce2Nom(c) : 'Intervenant';
  openModal('modalCeMission');
}

async function ce2SaveMission() {
  const contactId = document.getElementById('ceMissionContact')?.value;
  if (!contactId) { toast('Intervenant introuvable', 'error'); return; }
  const heures = document.getElementById('ceMissionHeures')?.value.trim();
  const cout = document.getElementById('ceMissionCout')?.value.trim();
  const row = {
    contact_id: contactId,
    besoin_id: document.getElementById('ceMissionBesoin')?.value || null,
    poste: document.getElementById('ceMissionPoste')?.value.trim() || null,
    date_debut: document.getElementById('ceMissionDebut')?.value || null,
    date_fin: document.getElementById('ceMissionFin')?.value || null,
    heures: heures ? Number(heures.replace(',', '.')) : null,
    cout: cout ? Number(cout.replace(',', '.')) : null,
    statut: document.getElementById('ceMissionStatut')?.value || 'prevue'
  };
  const cree = await _ce2Insert('ce_missions', 'missions', row, 'Mission non enregistrée');
  if (!cree) return;
  CE2_MISSIONS.unshift(cree);
  if (typeof auditLog === 'function') auditLog('ce_mission_save', row.poste || '');
  closeModal('modalCeMission');
  toast('Mission enregistrée ✓', 'success');
  ce2Render();
}

// ── Modale « évaluation post-mission » ────────────────────────────────
let CE2_EVAL_NOTE = 0;

function ce2OpenEval(contactId) {
  if (!ce2CanRH()) { toast('Réservé aux profils RH', 'error'); return; }
  const c = ce2Contact(contactId);
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v; };
  set('ceEvalContact', contactId || '');
  set('ceEvalCommentaire', '');
  set('ceEvalFid', '');
  CE2_EVAL_NOTE = 0;
  ce2RenderStars();
  const missions = ce2Missions(contactId);
  const sel = document.getElementById('ceEvalMission');
  if (sel) {
    sel.innerHTML = '<option value="">— Sans mission rattachée —</option>' + missions.map(m =>
      `<option value="${m.id}">${escHtml((m.poste || 'Mission') + ' · ' + ce2Periode(m.date_debut, m.date_fin))}</option>`).join('');
  }
  const t = document.getElementById('ceEvalQui');
  if (t) t.textContent = c ? ce2Nom(c) : 'Intervenant';
  openModal('modalCeEval');
}

function ce2RenderStars() {
  const box = document.getElementById('ceEvalStars');
  if (!box) return;
  box.innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<button type="button" class="ce2-star${CE2_EVAL_NOTE >= n ? ' on' : ''}" title="${n}/5" aria-label="${n} sur 5" onclick="ce2SetNote(${n})">★</button>`
  ).join('');
}
function ce2SetNote(n) { CE2_EVAL_NOTE = (CE2_EVAL_NOTE === n ? 0 : n); ce2RenderStars(); }

async function ce2SaveEval() {
  const contactId = document.getElementById('ceEvalContact')?.value;
  if (!contactId) { toast('Intervenant introuvable', 'error'); return; }
  const commentaire = document.getElementById('ceEvalCommentaire')?.value.trim() || null;
  if (!CE2_EVAL_NOTE && !commentaire) { toast('Renseignez une appréciation ou un commentaire', 'error'); return; }
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const row = {
    contact_id: contactId,
    mission_id: document.getElementById('ceEvalMission')?.value || null,
    note: CE2_EVAL_NOTE || null,
    commentaire,
    fidelisation: document.getElementById('ceEvalFid')?.value || null,
    evalue_par: s ? [s.prenom, s.nom].filter(Boolean).join(' ') || s.username : null
  };
  const cree = await _ce2Insert('ce_evaluations', 'evals', row, 'Évaluation non enregistrée');
  if (!cree) return;
  CE2_EVALS.unshift(cree);
  if (typeof auditLog === 'function') auditLog('ce_evaluation_save', contactId);
  closeModal('modalCeEval');
  toast('Évaluation enregistrée ✓', 'success');
  ce2Render();
}

// ── Amorçage ──────────────────────────────────────────────────────────
// Les blocs statiques (actions de contrat) sont rendus une seule fois.
document.addEventListener('DOMContentLoaded', () => { ce2RenderActions(); });

// Les déclarations `function`/`let` de premier niveau ne créent pas toutes une
// propriété sur window selon le contexte d'exécution : on publie explicitement
// ce que les gestionnaires inline et js/contacts-externes.js appellent.
window.ce2Render = ce2Render;
window.ce2Load = ce2Load;
window.ce2FillModal = ce2FillModal;
window.ce2AfterSave = ce2AfterSave;
window.ce2SetFiltre = ce2SetFiltre;
window.ce2SelBesoin = ce2SelBesoin;
window.ce2Proposer = ce2Proposer;
window.ce2CycleDispo = ce2CycleDispo;
window.ce2CyclePiece = ce2CyclePiece;
window.ce2CycleReponse = ce2CycleReponse;
window.ce2Diffuser = ce2Diffuser;
window.ce2OpenBesoin = ce2OpenBesoin;
window.ce2SaveBesoin = ce2SaveBesoin;
window.ce2OpenMission = ce2OpenMission;
window.ce2SaveMission = ce2SaveMission;
window.ce2OpenEval = ce2OpenEval;
window.ce2SaveEval = ce2SaveEval;
window.ce2SetNote = ce2SetNote;
window.ce2SetMetier = ce2SetMetier;
window.ce2ActionContrat = ce2ActionContrat;
window.ce2ActionDpae = ce2ActionDpae;
window.ce2ActionSignature = ce2ActionSignature;
window.ce2CanRH = ce2CanRH;
