// ── VIATRAJECTOIRE — DESIGN V2 ────────────────────────────────────────
// Transposition du langage visuel de la maquette « Portail - refonte (bento) »
// à la page réelle : tuiles KPI bento, chips de filtre, liste de demandes en
// lignes (avatar + titre + méta + pastille de statut), rail de compteurs et
// carte teintée « à ne pas oublier ».
//
// La couche de données (js/viatrajectoire-supabase.js) et les actions
// (saveVTDemande / deleteVTDemande / editVTDemande de js/viatrajectoire.js)
// sont réutilisées telles quelles : ce module ne fait que le rendu et la modale.

const VT2_IC = {
  send:   '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check:  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  x:      '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  route:  '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
};

// Couleur d'accent par type de demande
const VT2_TYPES = {
  orientation:    { l: 'Demande d\'orientation', court: 'Orientation',    c: '#22d3ee' },
  renouvellement: { l: 'Renouvellement',         court: 'Renouvellement', c: '#818cf8' },
  reorientation:  { l: 'Réorientation',          court: 'Réorientation',  c: '#f59e0b' }
};

// Les statuts « ouverts » (dossier encore en circulation MDPH)
const VT2_OUVERTS = ['envoye', 'en_cours', 'info_requise'];

const VT2_PALETTE = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];
const VT2_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// État de filtrage local (aucune persistance : purement visuel)
var vt2Filtre = { statut: 'all', q: '' };

function vt2Svg(d, w) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) +
         '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
}

function vt2Couleur(cle) {
  let h = 0;
  const s = String(cle || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return VT2_PALETTE[h % VT2_PALETTE.length];
}

function vt2Initiales(nom) {
  return String(nom || '?').trim().split(/\s+/).slice(0, 2).map(m => m[0] || '').join('').toUpperCase() || '?';
}

function vt2Statut(cle) {
  return (typeof VT_STATUTS === 'object' && VT_STATUTS[cle]) || { label: 'Brouillon', color: '#94a3b8' };
}

function vt2NomResident(d) {
  const r = (typeof sbResidents === 'function' ? sbResidents() : []).find(x => x.id === d.residentId);
  return r ? (r.prenom + ' ' + r.nom).trim() : '';
}

function vt2LibelleMdph(m) {
  if (m === 'mape') return 'MDPH';
  if (m === 'cdaph') return 'CDAPH';
  if (m === 'autre') return 'Autre instance';
  return m || '—';
}

// Nombre de jours écoulés depuis une date ISO (null si date absente/invalide)
function vt2Jours(iso) {
  if (!iso) return null;
  const dt = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  if (isNaN(dt)) return null;
  return Math.floor((Date.now() - dt.getTime()) / 86400000);
}

function vt2JourMois(iso) {
  const dt = new Date(String(iso || '').slice(0, 10) + 'T12:00:00');
  if (isNaN(dt)) return { j: '—', m: '' };
  return { j: String(dt.getDate()), m: VT2_MOIS[dt.getMonth()].replace('.', '') };
}

// ══ RENDU PRINCIPAL ═══════════════════════════════════════════════════
function vt2Render() {
  if (window.__vtDenied) return;
  const all = (typeof getVT === 'function' ? getVT() : []) || [];
  vt2Kpis(all);
  vt2Chips(all);
  vt2Liste(all);
  vt2Rail(all);
}

// ── Tuiles KPI ────────────────────────────────────────────────────────
function vt2Kpis(all) {
  const enCours   = all.filter(d => VT2_OUVERTS.indexOf(d.statut) !== -1).length;
  const acceptees = all.filter(d => d.statut === 'accepte').length;
  const refusees  = all.filter(d => d.statut === 'refuse').length;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('vtStatTotal', all.length);
  set('vtStatEnCours', enCours);
  set('vtStatAcceptees', acceptees);
  set('vtStatRefusees', refusees);

  // Sous-titres : uniquement des valeurs calculées à partir des données réelles
  const brouillons = all.filter(d => d.statut === 'brouillon').length;
  const info = all.filter(d => d.statut === 'info_requise').length;
  const clos = acceptees + refusees;
  set('vtSubTotal', brouillons ? brouillons + ' brouillon' + (brouillons > 1 ? 's' : '') : 'toutes demandes');
  set('vtSubEnCours', info ? info + ' en attente d\'info' : 'auprès de la MDPH');
  set('vtSubAcceptees', clos ? Math.round(acceptees / clos * 100) + ' % des dossiers clos' : 'aucun dossier clos');
  set('vtSubRefusees', clos ? Math.round(refusees / clos * 100) + ' % des dossiers clos' : 'aucun dossier clos');
}

// ── Chips de filtre par statut ────────────────────────────────────────
function vt2Chips(all) {
  const box = document.getElementById('vtChips');
  if (!box) return;
  const cles = Object.keys((typeof VT_STATUTS === 'object' && VT_STATUTS) || {});
  const items = [{ k: 'all', l: 'Toutes', c: '#818cf8', n: all.length }].concat(
    cles.map(k => ({ k: k, l: vt2Statut(k).label, c: vt2Statut(k).color, n: all.filter(d => d.statut === k).length }))
        .filter(i => i.n > 0)
  );
  box.innerHTML = items.map(i =>
    '<button type="button" class="v2-chip-f' + (vt2Filtre.statut === i.k ? ' on' : '') +
    '" onclick="vt2SetStatut(\'' + i.k + '\')">' +
    '<span class="dot" style="background:' + i.c + '"></span>' + escHtml(i.l) +
    ' <span class="n">' + i.n + '</span></button>'
  ).join('');
}

function vt2SetStatut(k) {
  vt2Filtre.statut = k;
  vt2Render();
}

function vt2SetRecherche(v) {
  vt2Filtre.q = String(v || '').trim().toLowerCase();
  const all = (typeof getVT === 'function' ? getVT() : []) || [];
  vt2Liste(all);
}

// ── Liste des demandes ────────────────────────────────────────────────
function vt2Filtrer(all) {
  return all.filter(d => {
    if (vt2Filtre.statut !== 'all' && d.statut !== vt2Filtre.statut) return false;
    if (!vt2Filtre.q) return true;
    const t = [vt2NomResident(d), (VT2_TYPES[d.type] || {}).l, vt2LibelleMdph(d.mdph), d.commentaire]
      .join(' ').toLowerCase();
    return t.indexOf(vt2Filtre.q) !== -1;
  });
}

function vt2Liste(all) {
  const el = document.getElementById('vtList');
  if (!el) return;

  const rows = vt2Filtrer(all).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const cpt = document.getElementById('vtCount');
  if (cpt) cpt.textContent = rows.length + (rows.length > 1 ? ' demandes' : ' demande');

  if (!rows.length) {
    el.innerHTML = '<div class="vt2-empty">' + vt2Svg(VT2_IC.route, 1.6) +
      '<div class="vt2-empty-t">' + (all.length ? 'Aucune demande pour ce filtre' : 'Aucune demande ViaTrajectoire') + '</div>' +
      '<div class="vt2-empty-s">' + (all.length
        ? 'Modifiez le statut sélectionné ou la recherche pour élargir la liste.'
        : 'Créez une demande d\'orientation, de renouvellement ou de réorientation pour suivre les échanges avec la MDPH.') +
      '</div></div>';
    return;
  }

  el.innerHTML = rows.map(d => {
    const st = vt2Statut(d.statut);
    const ty = VT2_TYPES[d.type] || VT2_TYPES.orientation;
    const nom = vt2NomResident(d);
    const c = nom ? vt2Couleur(d.residentId) : '#6f86ab';
    const jours = vt2Jours(d.date);
    const anciennete = (VT2_OUVERTS.indexOf(d.statut) !== -1 && jours !== null && jours >= 0)
      ? ' · déposée il y a ' + jours + ' j' : '';

    return '<div class="vt2-row" style="--pc:' + st.color + '">' +
      '<span class="vt2-av" style="background:' + c + '">' + escHtml(vt2Initiales(nom || '—')) + '</span>' +
      '<div class="vt2-row-b">' +
        '<div class="vt2-row-h">' +
          '<span class="vt2-row-n">' + escHtml(nom || 'Résident non renseigné') + '</span>' +
          '<span class="vt2-tag" style="--tc:' + ty.c + '">' + escHtml(ty.court) + '</span>' +
        '</div>' +
        '<div class="vt2-row-m">' + escHtml(vt2LibelleMdph(d.mdph)) + ' · ' +
          (d.date ? escHtml(formatDate(d.date)) : 'date inconnue') + escHtml(anciennete) + '</div>' +
        (d.commentaire ? '<div class="vt2-row-c">' + escHtml(d.commentaire) + '</div>' : '') +
      '</div>' +
      '<span class="dc-badge vt2-pill" style="background:' + st.color + '1f;color:' + st.color + ';border:1px solid ' + st.color + '44">' +
        '<span class="d" style="background:' + st.color + '"></span>' + escHtml(st.label) + '</span>' +
      '<div class="vt2-acts">' +
        '<button type="button" class="vt2-act" title="Modifier" aria-label="Modifier la demande" onclick="editVTDemande(\'' + d.id + '\')">' + vt2Svg(VT2_IC.pen, 2.2) + '</button>' +
        '<button type="button" class="vt2-act vt2-act-x" title="Supprimer" aria-label="Supprimer la demande" onclick="deleteVTDemande(\'' + d.id + '\')">' + vt2Svg(VT2_IC.trash, 2.2) + '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── Rail : compteurs + suivi ──────────────────────────────────────────
function vt2Rail(all) {
  vt2ParStatut(all);
  vt2ParType(all);
  vt2Suivi(all);
}

function vt2Barres(box, lignes, total) {
  if (!box) return;
  if (!lignes.length) { box.innerHTML = '<div class="v2-blk-vide">Aucune donnée à répartir.</div>'; return; }
  box.innerHTML = lignes.map(l => {
    const pct = total ? Math.round(l.n / total * 100) : 0;
    return '<div class="vt2-cmp">' +
      '<div class="vt2-cmp-h"><span class="vt2-cmp-l">' + escHtml(l.l) + '</span>' +
        '<span class="vt2-cmp-v" style="color:' + l.c + '">' + l.n + '</span></div>' +
      '<div class="v2-prog"><span style="width:' + pct + '%;background:' + l.c + '"></span></div>' +
      '<div class="vt2-cmp-s">' + pct + ' % des demandes</div>' +
    '</div>';
  }).join('');
}

function vt2ParStatut(all) {
  const cles = Object.keys((typeof VT_STATUTS === 'object' && VT_STATUTS) || {});
  const lignes = cles.map(k => ({ l: vt2Statut(k).label, c: vt2Statut(k).color, n: all.filter(d => d.statut === k).length }))
                     .filter(l => l.n > 0)
                     .sort((a, b) => b.n - a.n);
  vt2Barres(document.getElementById('vtParStatut'), lignes, all.length);
}

function vt2ParType(all) {
  const lignes = Object.keys(VT2_TYPES)
    .map(k => ({ l: VT2_TYPES[k].l, c: VT2_TYPES[k].c, n: all.filter(d => d.type === k).length }))
    .filter(l => l.n > 0);
  vt2Barres(document.getElementById('vtParType'), lignes, all.length);
}

// Carte teintée : dossiers encore ouverts, du plus ancien au plus récent
function vt2Suivi(all) {
  const box = document.getElementById('vtSuivi');
  if (!box) return;
  const rows = all.filter(d => VT2_OUVERTS.indexOf(d.statut) !== -1)
                  .slice()
                  .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
                  .slice(0, 5);
  if (!rows.length) {
    box.innerHTML = '<div class="v2-blk-vide">Aucun dossier en instruction.</div>';
    return;
  }
  box.innerHTML = rows.map(d => {
    const st = vt2Statut(d.statut);
    const dm = vt2JourMois(d.date);
    const j = vt2Jours(d.date);
    const nom = vt2NomResident(d);
    return '<div class="v2-al-ech" style="--pc:' + st.color + '">' +
      '<div class="v2-al-ech-d"><span class="v2-al-ech-j">' + escHtml(dm.j) + '</span>' +
        '<span class="v2-al-ech-m">' + escHtml(dm.m) + '</span></div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="vt2-row-n">' + escHtml(nom || 'Résident non renseigné') + '</div>' +
        '<div class="vt2-row-m">' + escHtml(st.label) + '</div>' +
      '</div>' +
      '<span class="vt2-jours">' + (j !== null && j >= 0 ? 'J+' + j : '—') + '</span>' +
    '</div>';
  }).join('');
}

// ══ MODALE (gabarit .v2-ov / .v2-md) ══════════════════════════════════
function vt2Open(data) {
  const ov = document.getElementById('modalVTDemande');
  if (!ov) { console.warn('[viatrajectoire-v2] modale absente'); return; }

  // Résidents
  const residents = (typeof sbResidents === 'function' ? sbResidents() : []);
  const sel = document.getElementById('vtResident');
  sel.innerHTML = residents.length
    ? residents.map(r => '<option value="' + escHtml(r.id) + '">' + escHtml((r.prenom + ' ' + r.nom).trim()) + '</option>').join('')
    : '<option value="">Aucun résident enregistré</option>';
  if (data && data.residentId) sel.value = data.residentId;

  // Statuts
  const selSt = document.getElementById('vtStatut');
  selSt.innerHTML = Object.keys((typeof VT_STATUTS === 'object' && VT_STATUTS) || {})
    .map(k => '<option value="' + k + '">' + escHtml(vt2Statut(k).label) + '</option>').join('');
  selSt.value = (data && data.statut) || 'brouillon';

  document.getElementById('vtMdph').value = (data && data.mdph) || 'mape';
  document.getElementById('vtDate').value = (data && data.date) ? String(data.date).split('T')[0] : today();
  document.getElementById('vtCommentaire').value = (data && data.commentaire) || '';
  vt2SetType((data && data.type) || 'orientation');

  document.getElementById('vtModalTitre').textContent = data ? 'Modifier la demande' : 'Nouvelle demande';
  document.getElementById('vtModalSousTitre').textContent = data
    ? 'Mettez à jour l\'avancement du dossier auprès de la MDPH.'
    : 'Orientation, renouvellement ou réorientation adressée à la MDPH.';
  const btn = document.getElementById('vtModalSave');
  btn.textContent = data ? 'Enregistrer' : 'Créer la demande';
  btn.onclick = function () { saveVTDemande(data ? data.id : ''); };

  const av = document.getElementById('vtModalAvert');
  if (av) av.style.display = residents.length ? 'none' : 'flex';

  openModal('modalVTDemande');
}

function vt2SetType(v) {
  const champ = document.getElementById('vtType');
  if (champ) champ.value = v;
  document.querySelectorAll('#modalVTDemande .v2-seg-o[data-type]').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-type') === v);
  });
}

// ══ PUBLICATION EXPLICITE (onclick inline + navigation en iframe) ═════
window.vt2Render = vt2Render;
window.vt2SetStatut = vt2SetStatut;
window.vt2SetRecherche = vt2SetRecherche;
window.vt2SetType = vt2SetType;
window.vt2Open = vt2Open;

// Délégation : tous les appelants existants passent par le rendu / la modale V2
if (typeof renderVT === 'function') window.renderVT = vt2Render;
if (typeof openVTDemande === 'function') window.openVTDemande = vt2Open;

// Le script de page a pu terminer son init avant le chargement de ce module.
if (document.readyState !== 'loading') vt2Render();
else document.addEventListener('DOMContentLoaded', vt2Render);
