// ── INVENTAIRE & MATÉRIEL (pilotage) — DESIGN V2 ───────────────────────
// Reproduit la maquette « Inventaire (pilotage) » :
//   4 tuiles de statistiques, filtres en chips, tableau des articles avec
//   niveau de stock, bloc de réapprovisionnement, rail (répartition par
//   catégorie, valeur du parc, maintenance à prévoir), puis derniers
//   mouvements de stock, taux de rotation, inventaire annuel, fournisseurs
//   et garanties & contrats.
//
// Ce module ne réécrit AUCUNE couche de données : il redéfinit les fonctions
// de rendu de js/inventaire.js (chargé avant lui) et réutilise getInv(),
// sbSaveInventaire(), sbDeleteInventaire(), loadInvCache().
//
// Plusieurs blocs de la maquette n'ont aucune source dans le schéma actuel :
//   • seuil d'alerte, valeur unitaire, maintenance à venir, garantie
//        → colonnes ajoutées à public.inventaire
//   • mouvements de stock / taux de rotation → public.inventaire_mouvements
//   • comptage physique annuel               → public.inventaire_comptages
//   • fournisseurs                           → public.inventaire_fournisseurs
// Tout cela est créé par migration-inventaire.sql. Tant que ce script n'est
// pas exécuté, la lecture renvoie [] avec un console.warn et l'écriture est
// refusée par un toast nommant le fichier : la page reste utilisable.

// ══ ICÔNES ════════════════════════════════════════════════════════════
const IV2_IC = {
  box:    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  warn:   '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  euro:   '<path d="M17.2 7a6 7 0 1 0 0 10"/><path d="M13 10h-8m0 4h8"/>',
  tool:   '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  bed:    '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  health: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  cpu:    '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>',
  plug:   '<path d="M9 2v6"/><path d="M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
  drop:   '<path d="M12 2.7s6 5.7 6 10.3a6 6 0 0 1-12 0c0-4.6 6-10.3 6-10.3z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  truck:  '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  cart:   '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  swap:   '<path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/>',
  down:   '<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>',
  up:     '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
  check:  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x:      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  info:   '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
};
function iv2Svg(d, w) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2)
    + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
}

// Thème visuel par catégorie (les couleurs de js/inventaire.js sont conçues
// pour un fond clair : trop sombres ici).
const IV2_THEME = {
  mobilier:       { c: '#f59e0b', icon: IV2_IC.bed },
  medical:        { c: '#ec4899', icon: IV2_IC.health },
  informatique:   { c: '#22d3ee', icon: IV2_IC.cpu },
  electromenager: { c: '#818cf8', icon: IV2_IC.plug },
  linge:          { c: '#14b8a6', icon: IV2_IC.bed },
  hygiene:        { c: '#10b981', icon: IV2_IC.drop },
  securite:       { c: '#a855f7', icon: IV2_IC.shield },
  vehicule:       { c: '#0ea5e9', icon: IV2_IC.truck },
  autre:          { c: '#94a3b8', icon: IV2_IC.box }
};
const IV2_ETAT_C = { bon: '#10b981', usage: '#f59e0b', defaillant: '#ef4444', hors_usage: '#94a3b8' };
const IV2_MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

// ══ ÉTAT LOCAL ════════════════════════════════════════════════════════
const IV2_F = { cat: '', etat: '', q: '' };
let IV2_EXT   = {};    // id article -> { seuilAlerte, valeurUnitaire, maintProchaine, garantieType, garantieFin }
let IV2_MV    = [];    // mouvements de stock
let IV2_CNT   = [];    // lignes de comptage de l'exercice courant
let IV2_FOURN = [];    // fournisseurs
let IV2_COLS  = null;  // true / false / null (inconnu) : colonnes étendues présentes ?
const IV2_MISSING = {};
let IV2_MV_SENS = 'in';
let IV2_FOURN_EDIT = '';
let IV2_EDIT = '';

// ══ ACCÈS SUPABASE (dégradation douce) ════════════════════════════════
function iv2Sb() { return (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : null; }

async function iv2Read(table, tune) {
  const sb = iv2Sb();
  if (!sb) { IV2_MISSING[table] = true; return []; }
  try {
    let q = sb.from(table).select('*');
    if (tune) q = tune(q);
    const { data, error } = await q;
    if (error) throw error;
    IV2_MISSING[table] = false;
    return data || [];
  } catch (e) {
    IV2_MISSING[table] = true;
    console.warn('[inventaire-v2] table public.' + table + ' indisponible — exécutez migration-inventaire.sql',
      e && e.message ? e.message : e);
    return [];
  }
}
function iv2Refuse(what) {
  toast('« ' + what + ' » indisponible : exécutez migration-inventaire.sql', 'error');
}
async function iv2Etab() {
  try { return typeof sbGetEtablissementId === 'function' ? await sbGetEtablissementId() : ''; }
  catch { return ''; }
}
function iv2Auteur() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  if (!s) return '';
  return [s.prenom, typeof nomMaj === 'function' ? nomMaj(s.nom) : s.nom].filter(Boolean).join(' ') || s.username || '';
}
function iv2IsAdmin() { return typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin(); }

// Colonnes étendues de public.inventaire : lues à part, car
// js/inventaire-supabase.js (intouchable) ne les mappe pas.
async function iv2LoadExt() {
  const sb = iv2Sb();
  IV2_EXT = {};
  if (!sb) { IV2_COLS = null; return; }
  try {
    const { data, error } = await sb.from('inventaire').select('*');
    if (error) throw error;
    const rows = data || [];
    IV2_COLS = rows.length ? Object.prototype.hasOwnProperty.call(rows[0], 'seuil_alerte') : null;
    rows.forEach(r => {
      IV2_EXT[r.id] = {
        seuilAlerte:    r.seuil_alerte == null ? null : Number(r.seuil_alerte),
        valeurUnitaire: r.valeur_unitaire == null ? null : Number(r.valeur_unitaire),
        maintProchaine: r.maintenance_prochaine || '',
        garantieType:   r.garantie_type || '',
        garantieFin:    r.garantie_fin || ''
      };
    });
    if (IV2_COLS === false) {
      console.warn('[inventaire-v2] colonnes seuil_alerte / valeur_unitaire / garantie absentes de public.inventaire — exécutez migration-inventaire.sql');
    }
  } catch (e) {
    IV2_COLS = null;
    console.warn('[inventaire-v2] lecture étendue de public.inventaire impossible', e && e.message ? e.message : e);
  }
}

async function iv2LoadExtras() {
  const annee = new Date().getFullYear();
  const [mv, cnt, fo] = await Promise.all([
    iv2Read('inventaire_mouvements', q => q.order('created_at', { ascending: false }).limit(400)),
    iv2Read('inventaire_comptages', q => q.eq('annee', annee)),
    iv2Read('inventaire_fournisseurs', q => q.order('nom'))
  ]);
  IV2_MV = mv.map(r => ({
    id: r.id, articleId: r.article_id, nom: r.article_nom || '', cat: r.cat || '',
    delta: Number(r.delta) || 0, motif: r.motif || '', auteur: r.auteur || '', date: r.created_at
  }));
  IV2_CNT = cnt.map(r => ({
    id: r.id, articleId: r.article_id,
    theorique: Number(r.quantite_theorique) || 0, comptee: Number(r.quantite_comptee) || 0,
    par: r.compte_par || '', le: r.compte_le
  }));
  IV2_FOURN = fo.map(r => ({
    id: r.id, nom: r.nom || '', specialite: r.specialite || '', delai: r.delai || '', contact: r.contact || ''
  }));
}

// ══ HELPERS ═══════════════════════════════════════════════════════════
function iv2Theme(cat) { return IV2_THEME[cat] || IV2_THEME.autre; }
function iv2CatLabel(cat) {
  const c = (typeof INV_CATS !== 'undefined' ? INV_CATS : []).find(x => x.id === cat);
  return c ? c.label : 'Autre';
}
function iv2EtatLabel(e) {
  const x = (typeof INV_ETATS !== 'undefined' ? INV_ETATS : {})[e];
  return x ? x.label : 'Bon état';
}
function iv2Ext(id) { return IV2_EXT[id] || {}; }
function iv2Qte(i) { return Number(i.quantite) || 0; }
function iv2Eur(n) {
  return (Math.round(Number(n) || 0)).toLocaleString('fr-FR') + ' €';
}
function iv2Days(d) {
  if (!d) return null;
  const x = new Date(d);
  if (isNaN(x)) return null;
  return Math.round((x - new Date(new Date().toDateString())) / 86400000);
}
function iv2MoisLbl(d) {
  const x = new Date(d);
  if (isNaN(x)) return '—';
  const m = IV2_MOIS[x.getMonth()];
  return x.getFullYear() === new Date().getFullYear() ? m : m + ' ' + String(x.getFullYear()).slice(2);
}
function iv2Relatif(d) {
  const x = new Date(d);
  if (isNaN(x)) return '—';
  const j = Math.round((new Date(new Date().toDateString()) - new Date(x.toDateString())) / 86400000);
  const h = String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
  if (j <= 0) return 'auj. ' + h;
  if (j === 1) return 'hier';
  if (j < 7) return j + ' j';
  return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0');
}
// Maintenance : le contrôle est réputé annuel (règle déjà appliquée en V1).
function iv2MaintDepassee(i) {
  if (!i.dateMaintenance) return false;
  const d = new Date(i.dateMaintenance);
  return !isNaN(d) && d < new Date(Date.now() - 365 * 86400000);
}
function iv2MaintDue(i) {
  if (iv2MaintDepassee(i)) return true;
  const j = iv2Days(iv2Ext(i.id).maintProchaine);
  return j !== null && j <= 30;
}
// Niveau de stock : r = quantité / seuil. La barre atteint 50 % au seuil.
function iv2Niveau(i) {
  const s = iv2Ext(i.id).seuilAlerte;
  if (s == null || !(s > 0)) return null;
  const r = iv2Qte(i) / s;
  const pct = Math.max(3, Math.min(100, Math.round(r * 50)));
  if (r <= 0.5) return { r: r, pct: pct, label: 'Critique', c: '#ef4444', seuil: s };
  if (r <= 1)   return { r: r, pct: pct, label: 'Bas',      c: '#f59e0b', seuil: s };
  return { r: r, pct: pct, label: 'OK', c: '#10b981', seuil: s };
}
function iv2SousSeuil(i) { const n = iv2Niveau(i); return !!n && n.r <= 1; }

function iv2All() { return (typeof getInv === 'function' ? getInv() : []) || []; }
function iv2Filtres() {
  let list = iv2All();
  if (IV2_F.cat)  list = list.filter(i => i.cat === IV2_F.cat);
  if (IV2_F.etat) list = list.filter(i => i.etat === IV2_F.etat);
  if (IV2_F.q) {
    const q = IV2_F.q;
    list = list.filter(i => ((i.nom || '') + ' ' + (i.ref || '') + ' ' + (i.lieu || '') + ' ' + (i.notes || '')).toLowerCase().includes(q));
  }
  return list;
}
function iv2Set(el, html) { const n = document.getElementById(el); if (n) n.innerHTML = html; }
function iv2Txt(el, txt) { const n = document.getElementById(el); if (n) n.textContent = txt; }
function iv2Vide(msg) { return '<div class="v2-blk-vide">' + msg + '</div>'; }

// ══ RENDU PRINCIPAL (remplace celui de js/inventaire.js) ══════════════
function renderInventaire() {
  if (!document.getElementById('invList')) return;
  iv2RenderStats();
  iv2RenderFiltres();
  iv2RenderTable();
  iv2RenderReappro();
  iv2RenderParCat();
  iv2RenderValeur();
  iv2RenderMaintenance();
  iv2RenderMouvements();
  iv2RenderRotation();
  iv2RenderComptage();
  iv2RenderFournisseurs();
  iv2RenderGaranties();
}

// ── Statistiques ──────────────────────────────────────────────────────
function iv2RenderStats() {
  const all = iv2All();
  const sous = all.filter(iv2SousSeuil).length;
  const maint = all.filter(iv2MaintDue).length;
  let valeur = 0, valorises = 0;
  all.forEach(i => {
    const v = iv2Ext(i.id).valeurUnitaire;
    if (v != null) { valeur += v * iv2Qte(i); valorises++; }
  });
  iv2Txt('invStatTotal', String(all.length));
  iv2Txt('invStatSeuil', String(sous));
  iv2Txt('invStatValeur', valorises ? iv2Eur(valeur) : '—');
  iv2Txt('invStatMaint', String(maint));
}

// ── Filtres (chips catégorie + chips état) ────────────────────────────
function iv2RenderFiltres() {
  const all = iv2All();
  const cats = (typeof INV_CATS !== 'undefined' ? INV_CATS : []).filter(c => all.some(i => i.cat === c.id));
  const chip = (on, dot, label, n, act) =>
    '<button type="button" class="v2-chip-f' + (on ? ' on' : '') + '" onclick="' + act + '">'
    + '<span class="dot" style="background:' + dot + '"></span>' + label
    + '<span class="n">' + n + '</span></button>';

  let h = chip(!IV2_F.cat, '#818cf8', 'Tout', all.length, "inv2SetCat('')");
  cats.forEach(c => {
    h += chip(IV2_F.cat === c.id, iv2Theme(c.id).c, escHtml(c.label),
      all.filter(i => i.cat === c.id).length, "inv2SetCat('" + c.id + "')");
  });
  iv2Set('invFiltresCat', h);

  const etats = ['bon', 'usage', 'defaillant', 'hors_usage'];
  let e = '<span class="iv2-fsep"></span>';
  etats.forEach(k => {
    const n = all.filter(i => i.etat === k).length;
    const id = k === 'defaillant' ? ' id="invStatDefaillant"' : (k === 'hors_usage' ? ' id="invStatHorsUsage"' : '');
    e += '<button type="button" class="v2-chip-f' + (IV2_F.etat === k ? ' on' : '') + '" onclick="inv2SetEtat(\'' + k + '\')">'
      + '<span class="dot" style="background:' + IV2_ETAT_C[k] + '"></span>' + escHtml(iv2EtatLabel(k))
      + '<span class="n"' + id + '>' + n + '</span></button>';
  });
  iv2Set('invFiltresEtat', e);
}
function inv2SetCat(c)  { IV2_F.cat = IV2_F.cat === c && c ? '' : c; renderInventaire(); }
function inv2SetEtat(e) { IV2_F.etat = IV2_F.etat === e ? '' : e; renderInventaire(); }

// ── Tableau des articles ──────────────────────────────────────────────
function iv2RenderTable() {
  const list = iv2Filtres();
  const el = document.getElementById('invList');
  if (!el) return;
  const filtre = IV2_F.cat || IV2_F.etat || IV2_F.q;
  if (!list.length) {
    el.innerHTML = '<div style="padding:34px 20px;text-align:center">'
      + '<div class="v2-blk-vide" style="margin-bottom:12px">'
      + (filtre ? 'Aucun article ne correspond à ces filtres.' : 'Aucun article enregistré dans l\'inventaire.') + '</div>'
      + '<button type="button" class="v2-btn v2-btn-sm" onclick="openInvModal()">Ajouter un article</button></div>';
    return;
  }
  const rows = list.slice().sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || (a.nom || '').localeCompare(b.nom || ''));
  el.innerHTML = '<div class="iv2-tablewrap"><table class="iv2-table"><thead><tr>'
    + '<th>Article</th><th>Emplacement</th><th class="iv2-c">Qté</th><th>Niveau</th><th>Statut</th><th></th>'
    + '</tr></thead><tbody>'
    + rows.map(i => {
      const th = iv2Theme(i.cat);
      const n = iv2Niveau(i);
      const etatC = IV2_ETAT_C[i.etat] || IV2_ETAT_C.bon;
      const badges = n
        ? '<span class="v2-pill" style="--pc:' + n.c + '">' + n.label + '</span>'
          + (i.etat && i.etat !== 'bon' ? ' <span class="v2-pill" style="--pc:' + etatC + '">' + escHtml(iv2EtatLabel(i.etat)) + '</span>' : '')
        : '<span class="v2-pill" style="--pc:' + etatC + '">' + escHtml(iv2EtatLabel(i.etat)) + '</span>';
      return '<tr>'
        + '<td><div class="iv2-art" style="--pc:' + th.c + '">'
        +   '<span class="iv2-art-ico">' + iv2Svg(th.icon) + '</span>'
        +   '<div style="min-width:0"><div class="iv2-art-n">' + escHtml(i.nom || '—') + '</div>'
        +   '<div class="iv2-art-c">' + escHtml(iv2CatLabel(i.cat)) + (i.ref ? ' · ' + escHtml(i.ref) : '') + '</div></div>'
        + '</div></td>'
        + '<td><span class="iv2-lieu">' + (i.lieu ? escHtml(i.lieu) : '—') + '</span></td>'
        + '<td class="iv2-c"><span class="iv2-qte">' + iv2Qte(i) + '</span></td>'
        + '<td>' + (n
            ? '<span class="v2-prog iv2-lvl" title="' + escAttr('Seuil d\'alerte : ' + n.seuil) + '" style="height:6px">'
              + '<span style="width:' + n.pct + '%;background:' + n.c + '"></span></span>'
            : '<span class="iv2-lvl-na">Pas de seuil</span>') + '</td>'
        + '<td>' + badges + (iv2MaintDepassee(i) ? ' <span class="v2-pill" style="--pc:#ef4444">Maintenance</span>' : '') + '</td>'
        + '<td class="iv2-r"><div class="iv2-acts">'
        +   '<button type="button" class="iv2-ib" title="Mouvement de stock" onclick="inv2OpenMouvement(\'' + i.id + '\')">' + iv2Svg(IV2_IC.swap) + '</button>'
        +   '<button type="button" class="iv2-ib" title="Modifier" onclick="openInvModal(\'' + i.id + '\')">' + iv2Svg(IV2_IC.pen) + '</button>'
        +   '<button type="button" class="iv2-ib iv2-ib-danger" title="Supprimer" onclick="deleteInv(\'' + i.id + '\')">' + iv2Svg(IV2_IC.trash) + '</button>'
        + '</div></td></tr>';
    }).join('')
    + '</tbody></table></div>';
}

// ── Réapprovisionnement ───────────────────────────────────────────────
function iv2RenderReappro() {
  const list = iv2All().filter(iv2SousSeuil)
    .sort((a, b) => iv2Niveau(a).r - iv2Niveau(b).r);
  if (!list.length) {
    iv2Set('invReappro', iv2Vide(IV2_COLS === false
      ? 'Les seuils d\'alerte nécessitent migration-inventaire.sql.'
      : 'Aucun article sous son seuil d\'alerte.'));
    return;
  }
  iv2Set('invReappro', list.map(i => {
    const n = iv2Niveau(i), th = iv2Theme(i.cat);
    return '<div class="iv2-rline" style="--pc:' + n.c + '">'
      + '<span class="iv2-art-ico" style="--pc:' + n.c + '">' + iv2Svg(th.icon) + '</span>'
      + '<div class="iv2-grow"><div class="iv2-art-n">' + escHtml(i.nom || '—') + '</div>'
      + '<div class="iv2-art-c">Stock ' + iv2Qte(i) + ' · seuil ' + n.seuil + '</div></div>'
      + '<button type="button" class="iv2-cmd" onclick="inv2OpenMouvement(\'' + i.id + '\',\'in\',' + Math.max(1, n.seuil * 2 - iv2Qte(i)) + ')">Commander</button>'
      + '</div>';
  }).join(''));
}

// ── Rail : répartition par catégorie ──────────────────────────────────
function iv2RenderParCat() {
  const all = iv2All();
  const cats = (typeof INV_CATS !== 'undefined' ? INV_CATS : [])
    .map(c => ({ id: c.id, label: c.label, n: all.filter(i => i.cat === c.id).length }))
    .filter(c => c.n > 0).sort((a, b) => b.n - a.n);
  if (!cats.length) { iv2Set('invParCat', iv2Vide('Aucun article référencé.')); return; }
  const max = cats[0].n;
  iv2Set('invParCat', cats.map(c =>
    '<div class="iv2-brow"><div class="iv2-brow-h"><span class="iv2-brow-l">' + escHtml(c.label) + '</span>'
    + '<span class="iv2-brow-n">' + c.n + '</span></div>'
    + '<span class="v2-prog" style="height:6px"><span style="width:' + Math.round(c.n / max * 100) + '%;background:'
    + iv2Theme(c.id).c + '"></span></span></div>').join(''));
}

// ── Rail : valeur du parc ─────────────────────────────────────────────
function iv2RenderValeur() {
  const all = iv2All();
  const parCat = {};
  let total = 0, valorises = 0;
  all.forEach(i => {
    const v = iv2Ext(i.id).valeurUnitaire;
    if (v == null) return;
    const m = v * iv2Qte(i);
    total += m; valorises++;
    parCat[i.cat] = (parCat[i.cat] || 0) + m;
  });
  iv2Txt('invValeurTotal', valorises ? iv2Eur(total) : '—');
  iv2Txt('invValeurSub', valorises
    ? valorises + ' article' + (valorises > 1 ? 's' : '') + ' valorisé' + (valorises > 1 ? 's' : '') + ' sur ' + all.length
    : (IV2_COLS === false ? 'Valeur unitaire indisponible' : 'Aucune valeur unitaire renseignée'));

  const lignes = Object.keys(parCat).map(k => ({ k: k, v: parCat[k] })).sort((a, b) => b.v - a.v);
  if (!lignes.length) {
    iv2Set('invPatrimoine', '<div class="iv2-hint">' + (IV2_COLS === false
      ? 'La valeur unitaire des articles nécessite migration-inventaire.sql.'
      : 'Renseignez la valeur unitaire d\'un article pour valoriser le parc.') + '</div>');
    return;
  }
  iv2Set('invPatrimoine', lignes.map(l =>
    '<div class="iv2-pline"><span class="iv2-pline-l">' + escHtml(iv2CatLabel(l.k)) + '</span>'
    + '<span class="iv2-pline-v">' + iv2Eur(l.v) + '</span></div>').join(''));
}

// ── Rail : maintenance à prévoir ──────────────────────────────────────
function iv2RenderMaintenance() {
  const items = [];
  iv2All().forEach(i => {
    const e = iv2Ext(i.id);
    if (e.maintProchaine) {
      const j = iv2Days(e.maintProchaine);
      items.push({
        nom: i.nom, detail: 'Prochain contrôle prévu', tri: j,
        ech: j < 0 ? 'En retard' : iv2MoisLbl(e.maintProchaine),
        c: j < 0 ? '#ef4444' : (j <= 60 ? '#f59e0b' : '#22d3ee')
      });
    } else if (iv2MaintDepassee(i)) {
      items.push({
        nom: i.nom, detail: 'Dernier contrôle le ' + new Date(i.dateMaintenance).toLocaleDateString('fr-FR'),
        tri: -9999, ech: 'Dépassé', c: '#ef4444'
      });
    }
  });
  items.sort((a, b) => a.tri - b.tri);
  if (!items.length) {
    iv2Set('invMaintenance', iv2Vide(IV2_COLS === false
      ? 'La date de prochaine maintenance nécessite migration-inventaire.sql.'
      : 'Aucune maintenance à prévoir.'));
    return;
  }
  iv2Set('invMaintenance', items.slice(0, 6).map(m =>
    '<div class="iv2-mline"><div class="iv2-grow"><div class="iv2-mline-t">' + escHtml(m.nom || '—') + '</div>'
    + '<div class="iv2-mline-d">' + escHtml(m.detail) + '</div></div>'
    + '<span class="iv2-mline-e" style="color:' + m.c + '">' + escHtml(m.ech) + '</span></div>').join(''));
}

// ── Derniers mouvements de stock ──────────────────────────────────────
function iv2RenderMouvements() {
  if (!IV2_MV.length) {
    iv2Set('invMouvements', iv2Vide(IV2_MISSING.inventaire_mouvements
      ? 'Historique indisponible : exécutez migration-inventaire.sql.'
      : 'Aucun mouvement de stock enregistré.'));
    return;
  }
  iv2Set('invMouvements', IV2_MV.slice(0, 8).map(m => {
    const pos = m.delta >= 0;
    const c = pos ? '#34d399' : '#f59e0b';
    return '<div class="iv2-mv" style="--pc:' + c + '">'
      + '<span class="iv2-mv-ico">' + iv2Svg(pos ? IV2_IC.down : IV2_IC.up, 2.4) + '</span>'
      + '<div class="iv2-grow"><div class="iv2-mv-n">' + escHtml(m.nom || '—')
      + (m.motif ? ' — ' + escHtml(m.motif) : '') + '</div>'
      + '<div class="iv2-mv-m">' + escHtml(m.auteur || '—') + ' · ' + iv2Relatif(m.date) + '</div></div>'
      + '<span class="iv2-mv-d">' + (pos ? '+' : '−') + Math.abs(m.delta) + '</span></div>';
  }).join(''));
}

// ── Taux de rotation (90 jours) ───────────────────────────────────────
function iv2RenderRotation() {
  const all = iv2All();
  if (!IV2_MV.length) {
    iv2Set('invRotation', iv2Vide(IV2_MISSING.inventaire_mouvements
      ? 'Rotation indisponible : exécutez migration-inventaire.sql.'
      : 'Aucun mouvement sur les 90 derniers jours.'));
    return;
  }
  const limite = Date.now() - 90 * 86400000;
  const byId = {}; all.forEach(i => { byId[i.id] = i; });
  const sorties = {}, stock = {};
  all.forEach(i => { stock[i.cat] = (stock[i.cat] || 0) + iv2Qte(i); });
  IV2_MV.forEach(m => {
    if (m.delta >= 0) return;
    if (new Date(m.date).getTime() < limite) return;
    const cat = m.cat || (byId[m.articleId] ? byId[m.articleId].cat : '') || 'autre';
    sorties[cat] = (sorties[cat] || 0) + Math.abs(m.delta);
  });
  const lignes = Object.keys(stock).filter(c => stock[c] > 0).map(c => {
    const r = (sorties[c] || 0) / stock[c];
    const t = r >= 0.75 ? { l: 'Rapide', c: '#10b981' }
      : r >= 0.3 ? { l: 'Moyen', c: '#22d3ee' }
      : r > 0 ? { l: 'Lent', c: '#f59e0b' }
      : { l: 'Aucune', c: '#64748b' };
    return { cat: c, r: r, tag: t, pct: Math.max(3, Math.min(100, Math.round(r * 100))) };
  }).sort((a, b) => b.r - a.r);
  if (!lignes.length) { iv2Set('invRotation', iv2Vide('Aucun article référencé.')); return; }
  iv2Set('invRotation', lignes.map(l =>
    '<div class="iv2-brow"><div class="iv2-brow-h"><span class="iv2-brow-l">' + escHtml(iv2CatLabel(l.cat)) + '</span>'
    + '<span class="iv2-brow-n" style="color:' + l.tag.c + '">' + l.tag.l + '</span></div>'
    + '<span class="v2-prog" style="height:6px"><span style="width:' + l.pct + '%;background:' + l.tag.c + '"></span></span></div>'
  ).join('') + '<div class="iv2-hint">Sorties des 90 derniers jours rapportées au stock de la catégorie.</div>');
}

// ── Inventaire annuel (comptage physique) ─────────────────────────────
function iv2RenderComptage() {
  const all = iv2All();
  const total = all.length;
  const ids = {}; all.forEach(i => { ids[i.id] = i; });
  const lignes = IV2_CNT.filter(l => ids[l.articleId]);
  const pointes = lignes.length;
  const ecarts = lignes.filter(l => l.comptee !== l.theorique).length;
  const pct = total ? Math.round(pointes / total * 100) : 0;
  const bar = document.getElementById('invComptageBar');
  if (bar) bar.style.width = Math.max(pointes ? 3 : 0, pct) + '%';
  iv2Txt('invComptageMeta', IV2_MISSING.inventaire_comptages
    ? 'Comptage indisponible : exécutez migration-inventaire.sql.'
    : pointes + ' / ' + total + ' articles pointés · ' + ecarts + ' écart' + (ecarts > 1 ? 's' : '') + ' détecté' + (ecarts > 1 ? 's' : ''));
  const btn = document.getElementById('invComptageBtn');
  if (btn) btn.textContent = pointes ? 'Reprendre le comptage' : 'Démarrer le comptage';
}

// ── Fournisseurs ──────────────────────────────────────────────────────
function iv2RenderFournisseurs() {
  const add = document.getElementById('invFournAdd');
  if (add) add.style.display = iv2IsAdmin() ? '' : 'none';
  if (!IV2_FOURN.length) {
    iv2Set('invFournisseurs', iv2Vide(IV2_MISSING.inventaire_fournisseurs
      ? 'Fournisseurs indisponibles : exécutez migration-inventaire.sql.'
      : 'Aucun fournisseur référencé.'));
    return;
  }
  const cols = ['#ea580c', '#ec4899', '#22d3ee', '#818cf8', '#10b981', '#f59e0b'];
  const admin = iv2IsAdmin();
  iv2Set('invFournisseurs', IV2_FOURN.map((f, k) => {
    const mots = String(f.nom || '?').trim().split(/\s+/).filter(Boolean);
    const tag = (mots.length > 1
      ? mots.slice(0, 2).map(w => w[0]).join('')
      : (mots[0] || '?').slice(0, 2)).toUpperCase();
    return '<div class="iv2-fo" style="--pc:' + cols[k % cols.length] + '">'
      + '<span class="iv2-fo-tag">' + escHtml(tag) + '</span>'
      + '<div class="iv2-grow"><div class="iv2-fo-n">' + escHtml(f.nom) + '</div>'
      + '<div class="iv2-fo-d">' + escHtml(f.specialite || '—') + (f.contact ? ' · ' + escHtml(f.contact) : '') + '</div></div>'
      + (f.delai ? '<span class="iv2-fo-delai">' + escHtml(f.delai) + '</span>' : '')
      + (admin ? '<button type="button" class="iv2-ib" title="Modifier" onclick="inv2OpenFourn(\'' + f.id + '\')">' + iv2Svg(IV2_IC.pen) + '</button>'
               + '<button type="button" class="iv2-ib iv2-ib-danger" title="Supprimer" onclick="inv2DeleteFourn(\'' + f.id + '\')">' + iv2Svg(IV2_IC.trash) + '</button>' : '')
      + '</div>';
  }).join(''));
}

// ── Garanties & contrats ──────────────────────────────────────────────
function iv2RenderGaranties() {
  const items = [];
  iv2All().forEach(i => {
    const e = iv2Ext(i.id);
    if (!e.garantieFin && !e.garantieType) return;
    let tag = escHtml(e.garantieType || 'Sous garantie'), c = '#34d399', tri = 99999;
    if (e.garantieFin) {
      const j = iv2Days(e.garantieFin); tri = j;
      const d = new Date(e.garantieFin);
      tag = j < 0 ? 'Expirée'
        : 'Expire ' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2);
      c = j < 0 ? '#ef4444' : (j <= 120 ? '#f59e0b' : '#34d399');
    }
    items.push({ nom: i.nom, detail: e.garantieType || 'Garantie', tag: tag, c: c, tri: tri });
  });
  items.sort((a, b) => a.tri - b.tri);
  if (!items.length) {
    iv2Set('invGaranties', iv2Vide(IV2_COLS === false
      ? 'Les garanties nécessitent migration-inventaire.sql.'
      : 'Aucune garantie ou contrat renseigné.'));
    return;
  }
  iv2Set('invGaranties', items.slice(0, 6).map(g =>
    '<div class="iv2-gline"><div class="iv2-grow"><div class="iv2-gline-t">' + escHtml(g.nom || '—') + '</div>'
    + '<div class="iv2-gline-d">' + escHtml(g.detail) + '</div></div>'
    + '<span class="v2-pill" style="--pc:' + g.c + '">' + escHtml(g.tag) + '</span></div>').join(''));
}

// ══ MODALE ARTICLE ════════════════════════════════════════════════════
function openInvModal(id, presetCat) {
  const item = id ? iv2All().find(x => x.id === id) : null;
  try { _invEditId = item ? item.id : ''; } catch (e) { /* portée V1 indisponible */ }
  IV2_EDIT = item ? item.id : '';
  const v = (el, val) => { const n = document.getElementById(el); if (n) n.value = val; };
  iv2Txt('invModalTitle', item ? 'Modifier l\'article' : 'Nouvel article');
  v('invModalCat', (item && item.cat) || presetCat || 'mobilier');
  v('invModalNom', (item && item.nom) || '');
  v('invModalRef', (item && item.ref) || '');
  v('invModalQte', item ? iv2Qte(item) : 1);
  v('invModalLieu', (item && item.lieu) || '');
  v('invModalAchat', (item && item.dateAchat) || '');
  v('invModalMaintenance', (item && item.dateMaintenance) || '');
  v('invModalNotes', (item && item.notes) || '');
  const e = item ? iv2Ext(item.id) : {};
  v('invModalSeuil', e.seuilAlerte == null ? '' : e.seuilAlerte);
  v('invModalValeur', e.valeurUnitaire == null ? '' : e.valeurUnitaire);
  v('invModalMaintProchaine', e.maintProchaine || '');
  v('invModalGarantieType', e.garantieType || '');
  v('invModalGarantieFin', e.garantieFin || '');
  inv2SetEtatChamp((item && item.etat) || 'bon');
  openModal('modalInv');
}

function inv2SetEtatChamp(val) {
  const n = document.getElementById('invModalEtat');
  if (n) n.value = val;
  document.querySelectorAll('#invModalEtatSeg .v2-seg-o').forEach(b => b.classList.toggle('on', b.dataset.v === val));
}

async function saveInventaire() {
  const val = el => { const n = document.getElementById(el); return n ? n.value : ''; };
  const nom = String(val('invModalNom')).trim();
  if (!nom) { toast('Le nom est obligatoire', 'error'); return; }
  const data = {
    cat:             val('invModalCat'),
    nom:             nom,
    ref:             String(val('invModalRef')).trim(),
    quantite:        Number(val('invModalQte')) || 0,
    etat:            val('invModalEtat') || 'bon',
    lieu:            String(val('invModalLieu')).trim(),
    dateAchat:       val('invModalAchat'),
    dateMaintenance: val('invModalMaintenance'),
    notes:           String(val('invModalNotes')).trim()
  };
  let saved;
  try {
    if (IV2_EDIT) {
      const old = iv2All().find(x => x.id === IV2_EDIT) || {};
      saved = await sbSaveInventaire(Object.assign({}, old, data, { id: IV2_EDIT }));
      _invCache = _invCache.map(x => x.id === IV2_EDIT ? saved : x);
    } else {
      saved = await sbSaveInventaire(data);
      _invCache.push(saved);
    }
  } catch (e) {
    console.error('[inventaire-v2 save]', e);
    toast('Erreur : ' + (e && e.message ? e.message : e), 'error');
    return;
  }

  // Colonnes étendues : écrites à part, car js/inventaire-supabase.js ne les
  // connaît pas. Si migration-inventaire.sql n'a pas été exécuté, l'article
  // est tout de même enregistré et l'utilisateur est prévenu.
  const ext = {
    seuil_alerte:          val('invModalSeuil') === '' ? null : Number(val('invModalSeuil')),
    valeur_unitaire:       val('invModalValeur') === '' ? null : Number(val('invModalValeur')),
    maintenance_prochaine: val('invModalMaintProchaine') || null,
    garantie_type:         String(val('invModalGarantieType')).trim() || null,
    garantie_fin:          val('invModalGarantieFin') || null
  };
  const aDesExt = Object.keys(ext).some(k => ext[k] !== null && ext[k] !== '');
  const avait = IV2_EDIT && Object.keys(iv2Ext(IV2_EDIT)).some(k => {
    const x = iv2Ext(IV2_EDIT)[k]; return x !== null && x !== '';
  });
  if (saved && saved.id && (aDesExt || avait)) {
    try {
      const sb = iv2Sb();
      if (!sb) throw new Error('Supabase indisponible');
      const { error } = await sb.from('inventaire').update(ext).eq('id', saved.id);
      if (error) throw error;
      IV2_EXT[saved.id] = {
        seuilAlerte: ext.seuil_alerte, valeurUnitaire: ext.valeur_unitaire,
        maintProchaine: ext.maintenance_prochaine || '', garantieType: ext.garantie_type || '',
        garantieFin: ext.garantie_fin || ''
      };
      IV2_COLS = true;
    } catch (e) {
      IV2_COLS = false;
      console.warn('[inventaire-v2] colonnes étendues absentes', e && e.message ? e.message : e);
      iv2Refuse('Seuil, valeur et garantie');
    }
  }
  closeModal('modalInv');
  toast(IV2_EDIT ? 'Article modifié' : 'Article ajouté', 'success');
  IV2_EDIT = '';
  renderInventaire();
}

// ══ MOUVEMENT DE STOCK ════════════════════════════════════════════════
function inv2OpenMouvement(articleId, sens, qte) {
  const all = iv2All();
  if (!all.length) { toast('Aucun article à mouvementer', 'error'); return; }
  const sel = document.getElementById('invMvArticle');
  if (sel) {
    sel.innerHTML = all.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
      .map(i => '<option value="' + i.id + '">' + escHtml(i.nom || '—') + ' (' + iv2Qte(i) + ')</option>').join('');
    if (articleId) sel.value = articleId;
  }
  inv2SetSens(sens || 'in');
  const q = document.getElementById('invMvQte'); if (q) q.value = qte || 1;
  const m = document.getElementById('invMvMotif'); if (m) m.value = '';
  openModal('modalInvMouvement');
}
function inv2SetSens(s) {
  IV2_MV_SENS = s === 'out' ? 'out' : 'in';
  document.querySelectorAll('#invMvSens .v2-seg-o').forEach(b => b.classList.toggle('on', b.dataset.v === IV2_MV_SENS));
}
async function inv2SaveMouvement() {
  const sb = iv2Sb();
  const id = (document.getElementById('invMvArticle') || {}).value || '';
  const art = iv2All().find(x => x.id === id);
  if (!art) { toast('Article introuvable', 'error'); return; }
  const n = Math.abs(Number((document.getElementById('invMvQte') || {}).value) || 0);
  if (!n) { toast('Indiquez une quantité', 'error'); return; }
  const delta = IV2_MV_SENS === 'out' ? -n : n;
  const motif = String((document.getElementById('invMvMotif') || {}).value || '').trim();
  if (!sb) { iv2Refuse('Mouvements de stock'); return; }

  const etab = await iv2Etab();
  try {
    const { error } = await sb.from('inventaire_mouvements').insert({
      etablissement_id: etab, article_id: art.id, article_nom: art.nom || '', cat: art.cat || 'autre',
      delta: delta, motif: motif, auteur: iv2Auteur()
    });
    if (error) throw error;
    IV2_MISSING.inventaire_mouvements = false;
  } catch (e) {
    IV2_MISSING.inventaire_mouvements = true;
    console.error('[inventaire-v2 mouvement]', e);
    iv2Refuse('Mouvements de stock');
    return;
  }
  try {
    const saved = await sbSaveInventaire(Object.assign({}, art, { quantite: Math.max(0, iv2Qte(art) + delta) }));
    _invCache = _invCache.map(x => x.id === art.id ? saved : x);
  } catch (e) {
    console.error('[inventaire-v2 maj quantité]', e);
    toast('Mouvement enregistré, mais la quantité n\'a pas pu être mise à jour', 'error');
  }
  await iv2LoadExtras();
  closeModal('modalInvMouvement');
  toast(delta > 0 ? 'Entrée de stock enregistrée' : 'Sortie de stock enregistrée', 'success');
  renderInventaire();
}

// ══ COMPTAGE ANNUEL ═══════════════════════════════════════════════════
function inv2OpenComptage() {
  const all = iv2All().slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  if (!all.length) { toast('Aucun article à compter', 'error'); return; }
  const byId = {}; IV2_CNT.forEach(l => { byId[l.articleId] = l; });
  iv2Set('invComptageList', all.map(i => {
    const l = byId[i.id];
    const ecart = l ? l.comptee - l.theorique : null;
    return '<div class="iv2-cnt"><div class="iv2-grow"><div class="iv2-cnt-n">' + escHtml(i.nom || '—') + '</div>'
      + '<div class="iv2-cnt-m">' + escHtml(iv2CatLabel(i.cat)) + ' · théorique ' + iv2Qte(i) + '</div></div>'
      + '<span class="iv2-cnt-e" style="color:' + (ecart ? (ecart < 0 ? '#ef4444' : '#f59e0b') : '#64748b') + '">'
      + (l ? (ecart > 0 ? '+' + ecart : String(ecart)) : '') + '</span>'
      + '<input type="number" min="0" class="iv2-cnt-i" data-art="' + i.id + '" data-th="' + iv2Qte(i) + '" '
      + 'value="' + (l ? l.comptee : '') + '" placeholder="—"/></div>';
  }).join(''));
  openModal('modalInvComptage');
}
async function inv2SaveComptage() {
  const sb = iv2Sb();
  if (!sb) { iv2Refuse('Comptage annuel'); return; }
  const rows = [];
  const etab = await iv2Etab();
  const annee = new Date().getFullYear();
  const auteur = iv2Auteur();
  document.querySelectorAll('#invComptageList input[data-art]').forEach(inp => {
    if (inp.value === '') return;
    rows.push({
      etablissement_id: etab, annee: annee, article_id: inp.dataset.art,
      quantite_theorique: Number(inp.dataset.th) || 0,
      quantite_comptee: Number(inp.value) || 0,
      compte_par: auteur, compte_le: new Date().toISOString()
    });
  });
  if (!rows.length) { toast('Aucune quantité saisie', 'error'); return; }
  try {
    const { error } = await sb.from('inventaire_comptages')
      .upsert(rows, { onConflict: 'etablissement_id,annee,article_id' });
    if (error) throw error;
    IV2_MISSING.inventaire_comptages = false;
  } catch (e) {
    IV2_MISSING.inventaire_comptages = true;
    console.error('[inventaire-v2 comptage]', e);
    iv2Refuse('Comptage annuel');
    return;
  }
  await iv2LoadExtras();
  closeModal('modalInvComptage');
  toast(rows.length + ' article' + (rows.length > 1 ? 's' : '') + ' pointé' + (rows.length > 1 ? 's' : ''), 'success');
  renderInventaire();
}

// ══ FOURNISSEURS ══════════════════════════════════════════════════════
function inv2OpenFourn(id) {
  if (!iv2IsAdmin()) { toast('Réservé aux administrateurs', 'error'); return; }
  const f = id ? IV2_FOURN.find(x => x.id === id) : null;
  IV2_FOURN_EDIT = f ? f.id : '';
  const v = (el, val) => { const n = document.getElementById(el); if (n) n.value = val; };
  iv2Txt('invFournTitle', f ? 'Modifier le fournisseur' : 'Nouveau fournisseur');
  v('invFournNom', (f && f.nom) || '');
  v('invFournSpecialite', (f && f.specialite) || '');
  v('invFournDelai', (f && f.delai) || '');
  v('invFournContact', (f && f.contact) || '');
  openModal('modalInvFourn');
}
async function inv2SaveFourn() {
  if (!iv2IsAdmin()) { toast('Réservé aux administrateurs', 'error'); return; }
  const sb = iv2Sb();
  if (!sb) { iv2Refuse('Fournisseurs'); return; }
  const val = el => { const n = document.getElementById(el); return n ? String(n.value).trim() : ''; };
  const nom = val('invFournNom');
  if (!nom) { toast('Le nom est obligatoire', 'error'); return; }
  const row = {
    nom: nom, specialite: val('invFournSpecialite'),
    delai: val('invFournDelai'), contact: val('invFournContact')
  };
  try {
    if (IV2_FOURN_EDIT) {
      const { error } = await sb.from('inventaire_fournisseurs').update(row).eq('id', IV2_FOURN_EDIT);
      if (error) throw error;
    } else {
      row.etablissement_id = await iv2Etab();
      const { error } = await sb.from('inventaire_fournisseurs').insert(row);
      if (error) throw error;
    }
    IV2_MISSING.inventaire_fournisseurs = false;
  } catch (e) {
    IV2_MISSING.inventaire_fournisseurs = true;
    console.error('[inventaire-v2 fournisseur]', e);
    iv2Refuse('Fournisseurs');
    return;
  }
  await iv2LoadExtras();
  closeModal('modalInvFourn');
  toast('Fournisseur enregistré', 'success');
  IV2_FOURN_EDIT = '';
  renderInventaire();
}
async function inv2DeleteFourn(id) {
  if (!iv2IsAdmin()) { toast('Réservé aux administrateurs', 'error'); return; }
  const sb = iv2Sb();
  if (!sb) { iv2Refuse('Fournisseurs'); return; }
  if (!confirm('Supprimer ce fournisseur ?')) return;
  try {
    const { error } = await sb.from('inventaire_fournisseurs').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error('[inventaire-v2 suppression fournisseur]', e);
    iv2Refuse('Fournisseurs');
    return;
  }
  IV2_FOURN = IV2_FOURN.filter(f => f.id !== id);
  toast('Fournisseur supprimé', 'info');
  renderInventaire();
}

// ══ INITIALISATION ════════════════════════════════════════════════════
function inv2Bind() {
  const s = document.getElementById('invSearch');
  if (s && !s.dataset.iv2) {
    s.dataset.iv2 = '1';
    s.addEventListener('input', e => { IV2_F.q = e.target.value.toLowerCase(); renderInventaire(); });
  }
}

// js/inventaire.js a posé son écouteur DOMContentLoaded en capturant SA
// version d'initInventaire : la redéfinition n'atteint pas cet écouteur. On
// ajoute donc le nôtre, qui charge les données complémentaires puis redessine.
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Auth === 'undefined' || !Auth.getSession()) return;
  inv2Bind();
  renderInventaire();
  try { if (typeof loadInvCache === 'function') await loadInvCache(); } catch (e) { console.warn('[inventaire-v2]', e); }
  await iv2LoadExt();
  await iv2LoadExtras();
  renderInventaire();
});

// Un `const`/`let` de premier niveau ne crée pas de propriété sur window :
// on publie explicitement ce que lisent les onclick inline et la navigation.
window.renderInventaire   = renderInventaire;
window.openInvModal       = openInvModal;
window.saveInventaire     = saveInventaire;
window.inv2SetCat         = inv2SetCat;
window.inv2SetEtat        = inv2SetEtat;
window.inv2SetEtatChamp   = inv2SetEtatChamp;
window.inv2OpenMouvement  = inv2OpenMouvement;
window.inv2SetSens        = inv2SetSens;
window.inv2SaveMouvement  = inv2SaveMouvement;
window.inv2OpenComptage   = inv2OpenComptage;
window.inv2SaveComptage   = inv2SaveComptage;
window.inv2OpenFourn      = inv2OpenFourn;
window.inv2SaveFourn      = inv2SaveFourn;
window.inv2DeleteFourn    = inv2DeleteFourn;
