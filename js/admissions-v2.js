// ── ADMISSIONS & LISTE D'ATTENTE — DESIGN V2 ──
// Reproduit la maquette « Admissions (dossiers) » :
//   4 tuiles de statistiques (En attente / En étude / Admis / Total demandes)
//   + tableau kanban à 4 colonnes (En attente · En étude · Admis · Refusé / désist.)
//   avec une carte par candidat (avatar coloré selon l'orientation, âge,
//   date de demande, date d'entrée prévue, numéro de dossier).
//
// Les données et les actions restent celles de js/admissions.js
// (getAdmissions, openAdmissionModal, saveAdmission, supprimerAdmission,
// admettreCandidat). Aucune écriture Supabase n'est réécrite ici.

// Couleur d'avatar / de puce par organisme d'orientation (maquette).
const ADM2_ORIG = {
  'MDPH':          '#818cf8',
  'ASE':           '#f59e0b',
  'Famille':       '#10b981',
  'Établissement': '#a78bfa',
  'Autre':         '#64748b'
};
function adm2OrigColor(o) { return ADM2_ORIG[o] || '#64748b'; }

// Colonnes de la maquette. La 4ᵉ regroupe « refusé » et « désistement »,
// exactement comme son libellé « Refusé / désist. ».
const ADM2_COLS = [
  { id: 'en_attente', name: 'En attente',        c: '#f59e0b', st: ['en_attente'] },
  { id: 'etude',      name: 'En étude',          c: '#0ea5e9', st: ['etude'] },
  { id: 'admis',      name: 'Admis',             c: '#10b981', st: ['admis'] },
  { id: 'refuse',     name: 'Refusé / désist.',  c: '#94a3b8', st: ['refuse', 'abandon'] }
];

const ADM2_IC = {
  hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
  file:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  check:     '<polyline points="20 6 9 17 4 12"/>',
  admis:     '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>'
};

function adm2Svg(path, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// Initiales : prénom + nom, comme la maquette (« JM » pour Jules Martin).
function adm2Initiales(a) {
  const i = ((a.prenom || '').trim()[0] || '') + ((a.nom || '').trim()[0] || '');
  return i.toUpperCase() || '?';
}

// « 16 ans » → « 16 » (la maquette suffixe elle-même « ans »).
function adm2Age(dob) {
  if (!dob) return '';
  const n = age(dob);
  return n === '—' ? '' : n;
}

function adm2Card(a, isAdmin, colColor) {
  const nom = `${a.prenom || ''} ${a.nom || ''}`.trim() || '—';
  const oc = adm2OrigColor(a.origine);
  const ageTxt = adm2Age(a.dateNaissance);
  const showAdmettre = isAdmin && !['admis', 'refuse', 'abandon'].includes(a.statut);

  return `<div class="ad2-card" style="--cc:${colColor}" role="button" tabindex="0"
       data-adm="${escHtml(a.id)}" title="${escHtml(nom)}">
    <div class="ad2-card-h">
      <div class="ad2-av" style="--ac:${oc}">${escHtml(adm2Initiales(a))}</div>
      <div class="ad2-card-id">
        <div class="ad2-nom">${escHtml(nom)}</div>
        ${ageTxt ? `<div class="ad2-age">${escHtml(ageTxt)}</div>` : ''}
      </div>
    </div>
    ${a.origine ? `<div class="ad2-tags"><span class="ad2-tag" style="--pc:${oc}">${escHtml(a.origine)}</span></div>` : ''}
    ${a.dateDemande ? `<div class="ad2-l1">Demande : ${formatDate(a.dateDemande)}</div>` : ''}
    ${a.dateEntree ? `<div class="ad2-l2">Entrée prévue : ${formatDate(a.dateEntree)}</div>` : ''}
    ${a.dossier ? `<div class="ad2-l3">Dossier : ${escHtml(a.dossier)}</div>` : ''}
    ${a.contactNom ? `<div class="ad2-l3">Contact : ${escHtml(a.contactNom)}${a.contactTel ? ' — ' + escHtml(a.contactTel) : ''}</div>` : ''}
    ${a.notes ? `<div class="ad2-note">${escHtml(a.notes)}</div>` : ''}
    ${showAdmettre ? `<div class="ad2-act">
      <button type="button" class="ad2-admettre" data-admettre="${escHtml(a.id)}">
        ${adm2Svg(ADM2_IC.check, 2.6)}Admettre
      </button>
    </div>` : ''}
  </div>`;
}

function adm2Render() {
  const isAdmin = Auth.isAdmin();
  const list = getAdmissions() || [];
  const q = (document.getElementById('admSearch')?.value || '').trim().toLowerCase();

  // Statistiques : toujours calculées sur la totalité des demandes.
  const stats = [
    { el: 'admStatEnAttente', n: list.filter(a => a.statut === 'en_attente').length },
    { el: 'admStatEtude',     n: list.filter(a => a.statut === 'etude').length },
    { el: 'admStatAdmis',     n: list.filter(a => a.statut === 'admis').length },
    { el: 'admStatTotal',     n: list.length }
  ];
  stats.forEach(s => { const el = document.getElementById(s.el); if (el) el.textContent = s.n; });

  let filtered = list;
  if (q) filtered = filtered.filter(a => `${a.prenom || ''} ${a.nom || ''}`.toLowerCase().includes(q));
  filtered = filtered.slice().sort((a, b) => (b.dateDemande || '').localeCompare(a.dateDemande || ''));

  const board = document.getElementById('admList');
  if (!board) return;

  board.className = 'ad2-board';
  board.innerHTML = ADM2_COLS.map(col => {
    const cards = filtered.filter(a => col.st.includes(a.statut));
    return `<div class="ad2-col" style="--cc:${col.c}">
      <div class="ad2-col-h">
        <div class="ad2-col-hr">
          <span class="ad2-col-dot"></span>
          <span class="ad2-col-n">${escHtml(col.name)}</span>
          <span class="ad2-col-c">${cards.length}</span>
        </div>
        <div class="ad2-col-bar"></div>
      </div>
      <div class="ad2-col-b">
        ${cards.length
          ? cards.map(a => adm2Card(a, isAdmin, col.c)).join('')
          : `<div class="ad2-col-vide">${q ? 'Aucun résultat' : 'Aucune demande'}</div>`}
      </div>
    </div>`;
  }).join('');
}

// ── Délégation d'événements sur le tableau ────────────────────────────
function adm2Bind() {
  const board = document.getElementById('admList');
  if (!board || board.dataset.bound) return;
  board.dataset.bound = '1';

  board.addEventListener('click', e => {
    const adm = e.target.closest('[data-admettre]');
    if (adm) { e.stopPropagation(); admettreCandidat(adm.dataset.admettre); return; }
    const card = e.target.closest('[data-adm]');
    if (card) openAdmissionModal(card.dataset.adm);
  });
  board.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('[data-adm]');
    if (card) { e.preventDefault(); openAdmissionModal(card.dataset.adm); }
  });
}

// ── Choix segmenté « Étape » de la modale ─────────────────────────────
// Le contrat avec js/admissions.js reste le <select id="admFormStatut">
// (lu par saveAdmission, écrit par openAdmissionModal) : le segmenté ne fait
// que le piloter, et se resynchronise à chaque ouverture de la modale.
function adm2SetStatut(v) {
  const sel = document.getElementById('admFormStatut');
  if (sel) sel.value = v;
  adm2SyncSeg();
}
function adm2SyncSeg() {
  const v = document.getElementById('admFormStatut')?.value || 'en_attente';
  document.querySelectorAll('#admSeg .v2-seg-o').forEach(b => {
    b.classList.toggle('on', b.dataset.statut === v);
    b.setAttribute('aria-pressed', b.dataset.statut === v ? 'true' : 'false');
  });
}

if (typeof openAdmissionModal === 'function') {
  const _adm2OpenModal = openAdmissionModal;
  openAdmissionModal = function (id) {
    const r = _adm2OpenModal(id);
    adm2SyncSeg();
    const t = document.getElementById('admModalTitle');
    if (t) t.textContent = id ? 'Modifier la demande' : 'Nouvelle demande d\'admission';
    return r;
  };
}

// ── L'ancienne fonction de rendu délègue au module V2 ──────────────────
renderAdmissions = function () {
  adm2Bind();
  adm2Render();
};

document.addEventListener('DOMContentLoaded', adm2Bind);
