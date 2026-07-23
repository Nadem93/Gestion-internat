// ── DOCUMENTS (GED) — DESIGN V2 ──
// Reproduit la maquette « Documents GED (dossiers) » :
//   4 tuiles de statistiques · puces de filtre par catégorie (avec compteurs)
//   grille de fiches document 5 colonnes · bloc « Ajoutés récemment »
//   · bloc « Modèles réutilisables » · modales au gabarit v2-ov/v2-md.
//
// Les données et les actions restent celles de js/documents.js
// (getAllDocuments, openDocModal, saveDocument, downloadDoc, deleteDocument,
// toggleDocPartageFamille, sbGetFamilleLiensResident…).
// Aucune couche Supabase n'est réécrite ici.

const DG2_IC = {
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  alert:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  db:     '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  dl:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  fam:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chev:   '<polyline points="9 18 15 12 9 6"/>'
};
function dg2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// Palette de la maquette, étendue aux catégories réellement stockées par l'app.
const DG2_CAT = {
  administratif: { l: 'Administratif', c: '#818cf8' },
  medical:       { l: 'Médical',       c: '#ec4899' },
  judiciaire:    { l: 'Judiciaire',    c: '#f59e0b' },
  contrat:       { l: 'Contrat',       c: '#22d3ee' },
  scolaire:      { l: 'Scolaire',      c: '#10b981' },
  ressource:     { l: 'Ressource',     c: '#a78bfa' },
  autre:         { l: 'Autre',         c: '#8095b4' }
};
function dg2Cat(k) {
  const key = String(k || '').toLowerCase().trim();
  return DG2_CAT[key] || { l: k ? String(k) : 'Sans catégorie', c: '#8095b4' };
}

// Type de fichier affiché (« PDF · 03/2024 ») : déduit du MIME, sinon de
// l'extension du fichier stocké. Jamais inventé : « — » si rien n'est connu.
function dg2Type(d) {
  const m = (d.mimeType || '').toLowerCase();
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('wordprocessingml') || m.includes('msword')) return 'DOCX';
  if (m.includes('png')) return 'PNG';
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPG';
  if (m.includes('gif')) return 'GIF';
  if (m.includes('webp')) return 'WEBP';
  const ext = (d.fileName || d.name || '').split('.').pop();
  return ext && ext.length <= 5 && /^[a-z0-9]+$/i.test(ext) ? ext.toUpperCase() : '—';
}
function dg2MoisAnnee(iso) {
  if (!iso) return '—';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? `${p[1]}/${p[0]}` : String(iso);
}
function dg2JourMois(iso) {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : String(iso);
}
function dg2Depuis(iso) {
  if (!iso) return '';
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!isFinite(j) || j < 0) return '';
  if (j === 0) return 'auj.';
  if (j === 1) return 'hier';
  if (j < 30) return 'il y a ' + j + ' j';
  const m = Math.floor(j / 30);
  return m < 12 ? 'il y a ' + m + ' mois' : 'il y a ' + Math.floor(m / 12) + ' an' + (m >= 24 ? 's' : '');
}
function dg2Taille(o) {
  if (!o) return '0 o';
  if (o < 1024) return o + ' o';
  if (o < 1024 * 1024) return Math.round(o / 1024) + ' Ko';
  if (o < 1024 * 1024 * 1024) return (o / 1024 / 1024).toFixed(1).replace('.', ',') + ' Mo';
  return (o / 1024 / 1024 / 1024).toFixed(1).replace('.', ',') + ' Go';
}
function dg2Overdue(d) { return !!(d.dueDate && d.dueDate < today() && !d.done); }

// ── Filtres ────────────────────────────────────────────────────────────
// Les puces pilotent le <select id="docFilterCategory"> conservé du V1 :
// le contrat entre le rendu et les gestionnaires existants reste intact.
function dg2SetCat(v) {
  const sel = document.getElementById('docFilterCategory');
  if (sel) sel.value = v;
  renderDocuments();
}

function dg2Filtered(list) {
  const search = (document.getElementById('docSearchInput')?.value || '').toLowerCase();
  const fRes = document.getElementById('docFilterResident')?.value || '';
  const fCat = document.getElementById('docFilterCategory')?.value || '';
  const fType = document.getElementById('docFilterType')?.value || '';
  let out = list;
  if (fRes) out = out.filter(d => String(d.residentId) === String(fRes));
  if (fType) out = out.filter(d => (d.type || 'resident') === fType);
  if (fCat) out = out.filter(d => (d.category || '') === fCat);
  if (search) out = out.filter(d =>
    (d.residentName || '').toLowerCase().includes(search) ||
    (d.name || '').toLowerCase().includes(search) ||
    (d.category || '').toLowerCase().includes(search));
  return out;
}

// ── Rendu principal ────────────────────────────────────────────────────
function dg2Render() {
  const grid = document.getElementById('documentList');
  if (!grid) return;
  const all = getAllDocuments();
  const docs = all.filter(d => (d.type || 'resident') !== 'resource');
  const modeles = all.filter(d => (d.type || 'resident') === 'resource');

  renderFamilleLiensPanel(document.getElementById('docFilterResident')?.value || '');
  dg2RenderStats(all, docs);
  dg2RenderFilters(all);

  const shown = dg2Filtered(all);
  grid.innerHTML = shown.length
    ? `<div class="dg2-grid">${shown.map(dg2Card).join('')}</div>`
    : `<div class="v2-blk" style="text-align:center;padding:34px 22px">
         <div class="v2-blk-vide" style="margin-bottom:12px">${all.length
           ? 'Aucun document ne correspond à ce filtre.'
           : 'Aucun document enregistré pour le moment.'}</div>
         <button type="button" class="dg2-new" style="margin:0 auto" onclick="openDocModal()">
           ${dg2Svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 2.4)}Ajouter un document
         </button>
       </div>`;

  dg2RenderRecents(all);
  dg2RenderModeles(modeles);
}

function dg2RenderStats(all, docs) {
  const el = document.getElementById('docStats');
  if (!el) return;
  const residents = new Set(docs.map(d => String(d.residentId)).filter(Boolean));
  const echus = docs.filter(dg2Overdue).length;
  const octets = all.reduce((s, d) => s + (Number(d.size) || 0), 0);
  const stats = [
    { n: String(all.length),   l: 'Documents',    c: '#a78bfa', i: DG2_IC.folder },
    { n: String(residents.size), l: 'Résidents',  c: '#818cf8', i: DG2_IC.users },
    { n: String(echus),        l: 'À renouveler', c: '#ef4444', i: DG2_IC.alert },
    { n: dg2Taille(octets),    l: 'Stockage',     c: '#22d3ee', i: DG2_IC.db }
  ];
  el.innerHTML = stats.map(s => `<div class="dg2-stat" style="--pc:${s.c}">
      <span class="dg2-stat-ico">${dg2Svg(s.i)}</span>
      <div><div class="dg2-stat-n">${escHtml(s.n)}</div><div class="dg2-stat-l">${escHtml(s.l)}</div></div>
    </div>`).join('');
}

function dg2RenderFilters(all) {
  const el = document.getElementById('docFilters');
  if (!el) return;
  const actif = document.getElementById('docFilterCategory')?.value || '';
  const counts = {};
  all.forEach(d => { const c = d.category || ''; counts[c] = (counts[c] || 0) + 1; });
  // Une puce par catégorie effectivement présente, dans l'ordre de la maquette.
  const ordre = Object.keys(DG2_CAT).filter(k => counts[k]);
  Object.keys(counts).forEach(k => { if (k && !ordre.includes(k)) ordre.push(k); });
  const defs = [{ id: '', label: 'Tous', dot: '#818cf8', n: all.length }]
    .concat(ordre.map(k => ({ id: k, label: dg2Cat(k).l, dot: dg2Cat(k).c, n: counts[k] })));
  el.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${f.id === actif ? ' on' : ''}"
      onclick="dg2SetCat('${escHtml(f.id)}')">
      <span class="dot" style="background:${f.dot}"></span>${escHtml(f.label)}<span class="n">${f.n}</span>
    </button>`).join('');
}

function dg2Card(d) {
  const cat = dg2Cat(d.category);
  const od = dg2Overdue(d);
  const isRes = (d.type || 'resident') === 'resource';
  const admin = (typeof Auth !== 'undefined') && Auth.isAdmin();
  const acts = [];
  if (d.fichierPath) acts.push(`<button type="button" class="dg2-act dl" title="Télécharger"
      onclick="downloadDoc('${escHtml(d.id)}','${escHtml(d.residentId)}')">${dg2Svg(DG2_IC.dl)}</button>`);
  if (!isRes && admin) acts.push(`<button type="button" class="dg2-act${d.partageFamille ? ' on' : ''}"
      title="${d.partageFamille ? 'Partagé avec la famille — cliquer pour retirer' : 'Partager avec la famille'}"
      onclick="toggleDocPartageFamille('${escHtml(d.id)}')">${dg2Svg(DG2_IC.fam)}</button>`);
  acts.push(`<button type="button" class="dg2-act" title="Modifier"
      onclick="editDocModal('${escHtml(d.id)}','${escHtml(d.residentId)}')">${dg2Svg(DG2_IC.pen)}</button>`);
  if (admin) acts.push(`<button type="button" class="dg2-act" title="Supprimer"
      onclick="deleteDocument('${escHtml(d.id)}','${escHtml(d.residentId)}')">${dg2Svg(DG2_IC.trash)}</button>`);

  return `<div class="dg2-card${od ? ' od' : ''}" style="--pc:${cat.c}">
    <span class="dg2-card-ico">${dg2Svg(DG2_IC.file)}</span>
    <div class="dg2-card-n" title="${escHtml(d.name || '')}">${escHtml(d.name || 'Sans nom')}</div>
    <div class="dg2-card-r">${escHtml(isRes ? 'Ressource partagée' : (d.residentName || ''))}</div>
    ${d.category ? `<span class="dg2-cat">${escHtml(cat.l)}</span>` : ''}
    <div class="dg2-card-m">${escHtml(dg2Type(d))} · ${escHtml(dg2MoisAnnee(d.docDate))}</div>
    ${od ? `<span class="dg2-echu">Échu ${escHtml(dg2JourMois(d.dueDate))}</span>` : ''}
    <div class="dg2-acts">${acts.join('')}</div>
  </div>`;
}

function dg2RenderRecents(all) {
  const el = document.getElementById('docRecents');
  if (!el) return;
  const recents = all.slice()
    .sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')))
    .slice(0, 5);
  if (!recents.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun document enregistré pour le moment.</div>'; return; }
  el.innerHTML = recents.map(d => {
    const c = dg2Cat(d.category).c;
    const meta = [d.residentName, d.uploadedBy].filter(Boolean).join(' · ');
    return `<div class="dg2-rec" style="--pc:${c}">
      <span class="dg2-rec-ico">${dg2Svg(DG2_IC.file)}</span>
      <div style="flex:1;min-width:0">
        <div class="dg2-rec-n">${escHtml(d.name || 'Sans nom')}</div>
        ${meta ? `<div class="dg2-rec-m">${escHtml(meta)}</div>` : ''}
      </div>
      <span class="dg2-rec-w">${escHtml(dg2Depuis(d.uploadedAt))}</span>
    </div>`;
  }).join('');
}

// « Modèles réutilisables » = documents enregistrés en type « Ressource »
// (residentId = _resources), les seuls documents non rattachés à un résident.
function dg2RenderModeles(modeles) {
  const el = document.getElementById('docModeles');
  if (!el) return;
  if (!modeles.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucun modèle. Ajoutez un document de type « Ressource » pour le retrouver ici.</div>`;
    return;
  }
  el.innerHTML = `<div class="dg2-mods">${modeles.map(m => `
    <button type="button" class="dg2-mod" title="Télécharger ${escHtml(m.name || '')}"
      onclick="downloadDoc('${escHtml(m.id)}','${escHtml(m.residentId)}')">
      <span class="dg2-mod-ico">${dg2Svg(DG2_IC.pen)}</span>
      <span class="dg2-mod-n">${escHtml(m.name || 'Sans nom')}</span>
      <span class="dg2-mod-c">${dg2Svg(DG2_IC.chev)}</span>
    </button>`).join('')}</div>`;
}

// ── Comptes famille liés (fonctionnalité V1 conservée, rhabillée) ───────
async function dg2RenderFamille(residentId) {
  const el = document.getElementById('famLiensPanel');
  if (!el) return;
  if (!residentId || typeof Auth === 'undefined' || !Auth.isAdmin()) { el.innerHTML = ''; return; }
  let liens = [];
  try { liens = await sbGetFamilleLiensResident(residentId) || []; }
  catch (e) { console.warn('[documents-v2] comptes famille indisponibles', e); }
  el.innerHTML = `<div class="v2-blk dg2-fam">
    <div class="dg2-blk-h">
      ${dg2Svg(DG2_IC.fam).replace('<svg', '<svg style="color:#22d3ee"')}
      <span class="v2-blk-t">Comptes famille liés</span>
      <button type="button" class="dg2-fam-add" onclick="openFamModal('${escHtml(residentId)}')">+ Compte famille</button>
    </div>
    ${liens.length ? liens.map(l => `<div class="dg2-fam-r">
      <span class="dg2-fam-n">${escHtml((`${l.prenom || ''} ${l.nom || ''}`).trim() || 'Compte famille')}</span>
      <button type="button" class="dg2-fam-x" onclick="delierCompteFamille('${escHtml(l.lienId)}','${escHtml(residentId)}')">Délier</button>
    </div>`).join('') : '<div class="v2-blk-vide">Aucun compte famille lié à ce résident.</div>'}
  </div>`;
}

// ── Modale : puces de catégorie pilotant le <select> conservé ───────────
const DG2_CAT_MODAL = ['administratif', 'medical', 'scolaire', 'judiciaire', 'contrat', 'autre'];
function dg2RenderCatChips() {
  const el = document.getElementById('docCatChips');
  if (!el) return;
  const v = document.getElementById('docFormCategory')?.value || '';
  el.innerHTML = DG2_CAT_MODAL.map(k => `<button type="button" class="dg2-cat-o${k === v ? ' on' : ''}"
    onclick="dg2PickCat('${k}')">${escHtml(DG2_CAT[k].l)}</button>`).join('');
}
function dg2PickCat(k) {
  const sel = document.getElementById('docFormCategory');
  if (!sel) return;
  sel.value = sel.value === k ? '' : k;   // re-cliquer désélectionne
  dg2RenderCatChips();
}

// ── Glisser-déposer sur la zone de fichier ─────────────────────────────
function dg2InitDrop() {
  const z = document.getElementById('docDropZone');
  if (!z || z._dg2) return;
  z._dg2 = true;
  ['dragenter', 'dragover'].forEach(ev => z.addEventListener(ev, e => {
    e.preventDefault(); z.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(ev => z.addEventListener(ev, e => {
    e.preventDefault(); z.classList.remove('over');
  }));
  z.addEventListener('drop', e => {
    const f = e.dataTransfer?.files?.[0];
    if (f) handleDocFileSelect({ target: { files: [f] } });
  });
}

// ── Délégation : tous les appelants existants passent par le rendu V2 ──
renderDocuments = dg2Render;
renderFamilleLiensPanel = dg2RenderFamille;

const _dg2OpenDocModal = openDocModal;
openDocModal = function (residentId) {
  _dg2OpenDocModal(residentId);
  // resetDocForm() ne remet pas le type à zéro : on le fait ici.
  const r = document.querySelector('[name="docType"][value="resident"]');
  if (r) r.checked = true;
  toggleDocType('resident');
  dg2RenderCatChips();
  dg2InitDrop();
};

const _dg2EditDocModal = editDocModal;
editDocModal = function (docId, resId) {
  // Le select des résidents n'était rempli que par openDocModal() : sans cela,
  // ouvrir une fiche en modification depuis la liste laissait le champ vide.
  const sel = document.getElementById('docFormResident');
  if (sel && sel.options.length <= 1) {
    sel.innerHTML = '<option value="">— Sélectionner —</option>' + sbResidents().map(r =>
      `<option value="${r.id}">${escHtml(r.prenom || '')} ${escHtml(r.nom || '')}</option>`).join('');
  }
  _dg2EditDocModal(docId, resId);
  dg2RenderCatChips();
  dg2InitDrop();
};

document.addEventListener('DOMContentLoaded', () => { dg2RenderCatChips(); dg2InitDrop(); });
