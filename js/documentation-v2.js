// ── DOCUMENTATION DE L'ÉTABLISSEMENT — DESIGN V2 ──
// Applique le langage visuel de la maquette « Portail - refonte (bento) » :
//   barre du haut (logo + eyebrow + titre + recherche + action)
//   · tuiles chiffrées · puces de filtre avec compteurs
//   · blocs bento listant les documents · rail « Ajoutés récemment » +
//   « Répartition par catégorie » (barres de progression)
//   · modale au gabarit v2-ov / v2-md.
//
// Les données et les actions restent celles de js/documentation.js
// (getDocumentation, openDocumentationModal, saveDocumentation,
//  voirDocumentation, supprimerDocumentation). Aucune couche Supabase
// n'est réécrite ici, et aucune valeur n'est inventée : tout ce qui est
// affiché provient de la table `documentation`.

const DC2_IC = {
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  db:     '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  dl:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  chart:  '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  bank:   '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/>',
  pin:    '<line x1="12" y1="17" x2="12" y2="22"/><path d="M9 2h6l-1 6 3 4v3H7v-3l3-4z"/>',
  scroll: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  compass:'<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  pen:    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>'
};
function dc2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// Icône dimensionnée (les chips/kpi « Console Data » ne fixent pas la taille du SVG).
function dc2Ico(d, px) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:${px || 16}px;height:${px || 16}px">${d}</svg>`;
}

// Une couleur + une icône par catégorie réellement gérée par l'app
// (mêmes clés que DOCU_CATEGORIE_ICONS de js/documentation.js).
const DC2_CAT = {
  "Projet d'établissement":    { c: '#818cf8', i: DC2_IC.bank },
  'Notes de service':          { c: '#f59e0b', i: DC2_IC.pin },
  'Règlement intérieur':       { c: '#ec4899', i: DC2_IC.scroll },
  'Procédures':                { c: '#22d3ee', i: DC2_IC.compass },
  'Comptes-rendus de réunion': { c: '#10b981', i: DC2_IC.pen },
  'Autre':                     { c: '#8095b4', i: DC2_IC.file }
};
function dc2Cat(k) {
  return DC2_CAT[k] || { c: '#8095b4', i: DC2_IC.file };
}
function dc2Cats() {
  return Object.keys(typeof DOCU_CATEGORIE_ICONS === 'object' ? DOCU_CATEGORIE_ICONS : DC2_CAT);
}

// Type de fichier (« PDF · 1,2 Mo ») : déduit du MIME, sinon de l'extension.
// Jamais inventé : « — » quand rien n'est connu.
function dc2Type(d) {
  const m = String(d.fichierMime || '').toLowerCase();
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('wordprocessingml') || m.includes('msword')) return 'DOCX';
  if (m.includes('png')) return 'PNG';
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPG';
  const ext = String(d.fichierNom || '').split('.').pop();
  return ext && ext.length <= 5 && /^[a-z0-9]+$/i.test(ext) ? ext.toUpperCase() : '—';
}
function dc2Taille(o) {
  o = Number(o) || 0;
  if (!o) return '—';
  if (o < 1024) return o + ' o';
  if (o < 1024 * 1024) return Math.round(o / 1024) + ' Ko';
  if (o < 1024 * 1024 * 1024) return (o / 1024 / 1024).toFixed(1).replace('.', ',') + ' Mo';
  return (o / 1024 / 1024 / 1024).toFixed(1).replace('.', ',') + ' Go';
}
function dc2Date(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('fr-FR');
}
function dc2Depuis(iso) {
  if (!iso) return '';
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!isFinite(j) || j < 0) return '';
  if (j === 0) return "auj.";
  if (j === 1) return 'hier';
  if (j < 30) return 'il y a ' + j + ' j';
  const m = Math.floor(j / 30);
  return m < 12 ? 'il y a ' + m + ' mois' : 'il y a ' + Math.floor(m / 12) + ' an' + (m >= 24 ? 's' : '');
}

// ── Filtres ────────────────────────────────────────────────────────────
// Les puces pilotent le <select id="docuFiltreCategorie"> conservé du V1 :
// le contrat avec renderDocumentation() reste intact.
function dc2SetCat(v) {
  const sel = document.getElementById('docuFiltreCategorie');
  if (sel) sel.value = v;
  renderDocumentation();
}

function dc2Filtered(list) {
  const q = (document.getElementById('docuSearch')?.value || '').trim().toLowerCase();
  const cat = document.getElementById('docuFiltreCategorie')?.value || '';
  let out = list;
  if (q) out = out.filter(d =>
    String(d.titre || '').toLowerCase().includes(q) ||
    String(d.categorie || '').toLowerCase().includes(q) ||
    String(d.fichierNom || '').toLowerCase().includes(q));
  if (cat) out = out.filter(d => d.categorie === cat);
  return out;
}

// ── Rendu principal ────────────────────────────────────────────────────
function dc2Render() {
  const el = document.getElementById('docuList');
  if (!el) return;
  const all = (typeof getDocumentation === 'function' ? getDocumentation() : []) || [];
  const isAdmin = (typeof Auth !== 'undefined') && Auth.isAdmin();

  dc2RenderStats(all);
  dc2RenderChips(all);
  dc2RenderRecents(all);
  dc2RenderRepartition(all);

  const shown = dc2Filtered(all);
  if (!shown.length) {
    el.innerHTML = `<div class="dc-card"><div class="dc-body" style="text-align:center;padding:34px 22px">
      <div class="v2-blk-vide" style="margin-bottom:${isAdmin ? '12px' : '0'}">${all.length
        ? 'Aucun document ne correspond à cette recherche.'
        : 'Aucun document dans la documentation de l’établissement.'}</div>
      ${isAdmin ? `<button type="button" class="dc2-new" style="margin:0 auto" onclick="openDocumentationModal()">
        ${dc2Svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 2.4)}Ajouter un document
      </button>` : ''}
    </div></div>`;
    return;
  }

  el.innerHTML = dc2Cats().map(cat => {
    const items = shown.filter(d => d.categorie === cat)
      .sort((a, b) => String(b.dateAjout || '').localeCompare(String(a.dateAjout || '')));
    if (!items.length) return '';
    const m = dc2Cat(cat);
    return `<div class="dc-card" style="--pc:${m.c};margin-bottom:16px">
      <div class="dc-head">
        <div class="dc-head-l">
          <span class="dc-chip" style="background:${m.c}22;color:${m.c}">${dc2Ico(m.i, 16)}</span>
          <div style="min-width:0">
            <div class="dc-eyebrow">Catégorie</div>
            <div class="dc-title">${escHtml(cat)}</div>
          </div>
        </div>
        <span class="dc-pill dim">${items.length} doc${items.length > 1 ? 's' : ''}</span>
      </div>
      <div class="dc-body">
        <div class="dc2-docs">${items.map(d => dc2Doc(d, isAdmin)).join('')}</div>
      </div>
    </div>`;
  }).join('');
}

function dc2Doc(d, isAdmin) {
  const m = dc2Cat(d.categorie);
  const typ = dc2Type(d);
  const meta = [dc2Taille(d.fichierTaille), dc2Date(d.dateAjout), d.ajoutePar ? 'par ' + d.ajoutePar : '']
    .filter(Boolean).join(' · ');
  return `<div class="dc2-doc" style="--pc:${m.c};border-left:3px solid ${m.c}">
    <span class="dc2-doc-ico">${dc2Svg(DC2_IC.file)}</span>
    <div style="flex:1;min-width:0">
      <div class="dc2-doc-n" title="${escHtml(d.titre || '')}">${escHtml(d.titre || 'Sans titre')}</div>
      <div class="dc2-doc-m">${typ !== '—' ? `<span class="dc-badge dc-b-gray" style="margin-right:6px;text-transform:none">${escHtml(typ)}</span>` : ''}${escHtml(meta)}</div>
    </div>
    <div class="dc2-acts">
      <button type="button" class="dc2-act dl" title="Télécharger ${escHtml(d.fichierNom || '')}"
        onclick="voirDocumentation('${escHtml(d.id)}')">${dc2Svg(DC2_IC.dl)}</button>
      ${isAdmin ? `<button type="button" class="dc2-act rm" title="Supprimer"
        onclick="supprimerDocumentation('${escHtml(d.id)}')">${dc2Svg(DC2_IC.trash)}</button>` : ''}
    </div>
  </div>`;
}

function dc2RenderStats(all) {
  const el = document.getElementById('docuStats');
  if (!el) return;
  const cats = new Set(all.map(d => d.categorie).filter(Boolean));
  const limite = Date.now() - 30 * 86400000;
  const recents = all.filter(d => d.dateAjout && new Date(d.dateAjout).getTime() >= limite).length;
  const octets = all.reduce((s, d) => s + (Number(d.fichierTaille) || 0), 0);
  const stats = [
    { n: String(all.length),   l: 'Documents',       c: '#a78bfa', i: DC2_IC.folder },
    { n: String(cats.size),    l: 'Catégories',      c: '#818cf8', i: DC2_IC.layers },
    { n: String(recents),      l: 'Ajoutés (30 j)',  c: '#10b981', i: DC2_IC.clock },
    { n: dc2Taille(octets),    l: 'Stockage',        c: '#22d3ee', i: DC2_IC.db }
  ];
  el.innerHTML = stats.map(s => `<div class="dc-kpi" style="--dc-c:${s.c}">
    <div class="dc-kpi-top">
      <span class="dc-kpi-label">${escHtml(s.l)}</span>
      <span class="dc-kpi-ico" style="color:${s.c}">${dc2Ico(s.i, 16)}</span>
    </div>
    <div class="dc-kpi-val">${escHtml(s.n)}</div>
  </div>`).join('');
}

function dc2RenderChips(all) {
  const el = document.getElementById('docuChips');
  if (!el) return;
  const actif = document.getElementById('docuFiltreCategorie')?.value || '';
  const counts = {};
  all.forEach(d => { const c = d.categorie || 'Autre'; counts[c] = (counts[c] || 0) + 1; });
  const defs = [{ id: '', label: 'Tous', dot: '#818cf8', n: all.length }]
    .concat(dc2Cats().filter(c => counts[c]).map(c => ({ id: c, label: c, dot: dc2Cat(c).c, n: counts[c] })));
  el.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${f.id === actif ? ' on' : ''}"
      onclick="dc2SetCat(${JSON.stringify(f.id).replace(/"/g, '&quot;')})">
      <span class="dot" style="background:${f.dot}"></span>${escHtml(f.label)}<span class="n">${f.n}</span>
    </button>`).join('');
}

function dc2RenderRecents(all) {
  const el = document.getElementById('docuRecents');
  if (!el) return;
  const recents = all.slice()
    .sort((a, b) => String(b.dateAjout || '').localeCompare(String(a.dateAjout || '')))
    .slice(0, 5);
  if (!recents.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun document pour le moment.</div>'; return; }
  el.innerHTML = recents.map(d => {
    const m = dc2Cat(d.categorie);
    const sous = [d.categorie, d.ajoutePar].filter(Boolean).join(' · ');
    return `<button type="button" class="dc2-rec" style="--pc:${m.c};border-left:3px solid ${m.c};padding-left:11px"
      title="Télécharger ${escHtml(d.fichierNom || '')}" onclick="voirDocumentation('${escHtml(d.id)}')">
      <span class="dc2-rec-ico">${dc2Svg(m.i)}</span>
      <span style="flex:1;min-width:0;text-align:left">
        <span class="dc2-rec-n">${escHtml(d.titre || 'Sans titre')}</span>
        ${sous ? `<span class="dc2-rec-m">${escHtml(sous)}</span>` : ''}
      </span>
      <span class="dc-pill dim">${escHtml(dc2Depuis(d.dateAjout))}</span>
    </button>`;
  }).join('');
}

function dc2RenderRepartition(all) {
  const el = document.getElementById('docuRepartition');
  if (!el) return;
  if (!all.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun document pour le moment.</div>'; return; }
  const counts = {};
  all.forEach(d => { const c = d.categorie || 'Autre'; counts[c] = (counts[c] || 0) + 1; });
  const max = Math.max.apply(null, Object.values(counts));
  el.innerHTML = dc2Cats().filter(c => counts[c]).map(c => {
    const col = dc2Cat(c).c;
    const pct = Math.round(counts[c] / max * 100);
    return `<div class="dc2-rep">
      <div class="dc2-rep-h">
        <span class="dc2-rep-l">${escHtml(c)}</span>
        <span class="dc2-rep-v" style="color:${col}">${counts[c]}</span>
      </div>
      <div class="al-prog-bar"><span style="width:${pct}%;background:${col}"></span></div>
    </div>`;
  }).join('');
}

// ── Modale : puces de catégorie pilotant le <select> conservé ───────────
function dc2RenderCatChips() {
  const el = document.getElementById('docuCatChips');
  if (!el) return;
  const v = document.getElementById('docuFormCategorie')?.value || '';
  el.innerHTML = dc2Cats().map(c => `<button type="button" class="dc2-cat-o${c === v ? ' on' : ''}"
    onclick="dc2PickCat(${JSON.stringify(c).replace(/"/g, '&quot;')})">${escHtml(c)}</button>`).join('');
}
function dc2PickCat(c) {
  const sel = document.getElementById('docuFormCategorie');
  if (!sel) return;
  sel.value = c;
  dc2RenderCatChips();
}

// ── Zone de dépôt du fichier (l'<input type=file> d'origine est conservé) ──
function dc2FileLabel() {
  const inp = document.getElementById('docuFormFile');
  const box = document.getElementById('docuFilePending');
  if (!inp || !box) return;
  const f = inp.files && inp.files[0];
  if (!f) { box.style.display = 'none'; return; }
  box.style.display = 'flex';
  const n = document.getElementById('docuFilePendingName');
  const s = document.getElementById('docuFilePendingSize');
  if (n) n.textContent = f.name;
  if (s) s.textContent = dc2Taille(f.size);
}
function dc2ClearFile() {
  const inp = document.getElementById('docuFormFile');
  if (inp) inp.value = '';
  dc2FileLabel();
}
function dc2InitDrop() {
  const z = document.getElementById('docuDropZone');
  if (!z || z._dc2) return;
  z._dc2 = true;
  ['dragenter', 'dragover'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.remove('over'); }));
  z.addEventListener('drop', e => {
    const f = e.dataTransfer?.files?.[0];
    const inp = document.getElementById('docuFormFile');
    if (!f || !inp) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(f);
      inp.files = dt.files;
    } catch (err) { console.warn('[documentation-v2] dépôt de fichier non pris en charge', err); }
    dc2FileLabel();
  });
  const inp = document.getElementById('docuFormFile');
  if (inp && !inp._dc2) { inp._dc2 = true; inp.addEventListener('change', dc2FileLabel); }
}

// ── Délégation : tous les appelants existants passent par le rendu V2 ──
renderDocumentation = dc2Render;

const _dc2OpenModal = openDocumentationModal;
openDocumentationModal = function () {
  _dc2OpenModal();
  dc2RenderCatChips();
  dc2InitDrop();
  dc2FileLabel();
};

document.addEventListener('DOMContentLoaded', () => { dc2RenderCatChips(); dc2InitDrop(); });
