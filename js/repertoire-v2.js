// ── RÉPERTOIRE DES PARTENAIRES — DESIGN V2 ────────────────────────────
// Reproduit la maquette « Répertoire (dossiers) » : chips de catégorie à
// pastille colorée, grille de fiches contact à liseré coloré, puis les deux
// blocs de bas de page « Contacts favoris » et « Derniers appels ».
//
// Les données et les actions (ajout / édition / suppression) restent celles
// de js/repertoire.js et js/repertoire-supabase.js.
//
// DEUX DONNÉES DE LA MAQUETTE N'EXISTAIENT PAS EN BASE :
//   · la catégorie et le statut « favori » d'un contact → colonnes
//     public.repertoire.categorie / .favori ;
//   · le journal des appels                              → table
//     public.repertoire_appels.
// Les deux sont créés par migration-repertoire.sql. Tant que ce fichier n'a
// pas été exécuté, la page reste PLEINEMENT utilisable : les contacts sont
// simplement tous « non classés », aucun favori ni appel n'est affiché, et
// toute tentative d'écriture affiche un toast nommant le fichier SQL.

// ── Catégories (identiques à la maquette) ─────────────────────────────
const REP2_CATS = {
  medical:   { l: 'Médical',   c: '#ec4899' },
  social:    { l: 'Social',    c: '#10b981' },
  juridique: { l: 'Juridique', c: '#f59e0b' },
  education: { l: 'Éducation', c: '#818cf8' },
  technique: { l: 'Technique', c: '#22d3ee' }
};
const REP2_NC = { l: 'Non classé', c: '#8095b4' };

let REP2_FILTRE = 'all';        // chip actif : 'all', une clé de REP2_CATS, ou 'nc'

// Extras (catégorie + favori) : id de contact → { categorie, favori }
let REP2_EXTRAS = {};
let REP2_EXTRAS_OK = true;      // false = colonnes absentes (migration non exécutée)

// Journal des appels
let REP2_APPELS = [];
let REP2_APPELS_OK = true;      // false = table absente

const REP2_SQL = 'migration-repertoire.sql';

const REP2_IC = {
  tel:   '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail:  '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  pin:   '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  star:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  out:   '<path d="M7 17l7-7"/><path d="M8 7h6v6"/>',
  in:    '<path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/>'
};

function _rep2Svg(d, opt) {
  const o = opt || {};
  return `<svg viewBox="0 0 24 24" fill="${o.fill || 'none'}" stroke="currentColor" stroke-width="${o.w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// ── Accès aux extras ──────────────────────────────────────────────────
function rep2Cat(id) {
  const k = (REP2_EXTRAS[id] || {}).categorie;
  return (k && REP2_CATS[k]) ? k : 'nc';
}
function rep2CatDef(id) { const k = rep2Cat(id); return k === 'nc' ? REP2_NC : REP2_CATS[k]; }
function rep2Fav(id) { return !!(REP2_EXTRAS[id] || {}).favori; }

// Initiales : deux lettres, tirées du nom du contact à défaut de l'organisme.
function rep2Ini(c) {
  const src = (c.nom || c.organisme || '?').trim();
  const mots = src.split(/[\s.'-]+/).filter(Boolean);
  const ini = mots.slice(0, 2).map(m => m[0]).join('');
  return (ini || src[0] || '?').toUpperCase();
}

// ── Chargement des données propres à la V2 ────────────────────────────
async function rep2LoadExtras() {
  REP2_EXTRAS = {};
  try {
    const { data, error } = await supabaseClient.from('repertoire').select('id,categorie,favori');
    if (error) throw error;
    REP2_EXTRAS_OK = true;
    (data || []).forEach(r => { REP2_EXTRAS[r.id] = { categorie: r.categorie || null, favori: !!r.favori }; });
  } catch (e) {
    REP2_EXTRAS_OK = false;
    console.warn('[repertoire-v2] colonnes categorie/favori absentes — exécutez ' + REP2_SQL, e && (e.message || e));
  }
}

async function rep2LoadAppels() {
  REP2_APPELS = [];
  try {
    const { data, error } = await supabaseClient
      .from('repertoire_appels').select('*')
      .order('appele_le', { ascending: false }).limit(12);
    if (error) throw error;
    REP2_APPELS_OK = true;
    REP2_APPELS = data || [];
  } catch (e) {
    REP2_APPELS_OK = false;
    console.warn('[repertoire-v2] table repertoire_appels absente — exécutez ' + REP2_SQL, e && (e.message || e));
  }
}

async function rep2Load() {
  await Promise.all([rep2LoadExtras(), rep2LoadAppels()]);
}

// ── Écritures ─────────────────────────────────────────────────────────
// Enregistre catégorie + favori après un sbSaveRepertoire() réussi.
async function rep2PersistExtras(id, ex) {
  if (!id) return;
  if (!REP2_EXTRAS_OK) {
    toast('Catégorie et favori non enregistrés : exécutez ' + REP2_SQL, 'error');
    return;
  }
  try {
    const { error } = await supabaseClient.from('repertoire')
      .update({ categorie: ex.categorie || null, favori: !!ex.favori }).eq('id', id);
    if (error) throw error;
    REP2_EXTRAS[id] = { categorie: ex.categorie || null, favori: !!ex.favori };
  } catch (e) {
    REP2_EXTRAS_OK = false;
    console.warn('[repertoire-v2] écriture categorie/favori refusée', e && (e.message || e));
    toast('Catégorie et favori non enregistrés : exécutez ' + REP2_SQL, 'error');
  }
}

// Étoile de la fiche : bascule le favori sans ouvrir la modale.
async function rep2ToggleFavori(id) {
  if (!REP2_EXTRAS_OK) { toast('Favoris indisponibles : exécutez ' + REP2_SQL, 'error'); return; }
  const cur = REP2_EXTRAS[id] || { categorie: null, favori: false };
  await rep2PersistExtras(id, { categorie: cur.categorie, favori: !cur.favori });
  rep2Render();
}

// Journalise un appel sortant au moment où l'on compose le numéro.
async function rep2LogAppel(id, sens) {
  if (!REP2_APPELS_OK) { toast('Journal des appels indisponible : exécutez ' + REP2_SQL, 'error'); return; }
  try {
    const etab = await sbGetEtablissementId();
    const row = {
      etablissement_id: etab,
      contact_id: id,
      sens: sens || 'sortant',
      appele_le: new Date().toISOString(),
      created_by: (Auth.getSession() || {}).userId ?? null
    };
    const { error } = await supabaseClient.from('repertoire_appels').insert(row);
    if (error) throw error;
    await rep2LoadAppels();
    rep2Render();
  } catch (e) {
    REP2_APPELS_OK = false;
    console.warn('[repertoire-v2] journalisation d\'appel refusée', e && (e.message || e));
    toast('Appel non journalisé : exécutez ' + REP2_SQL, 'error');
  }
}

// ── Filtres ───────────────────────────────────────────────────────────
function rep2SetFiltre(k) { REP2_FILTRE = k; rep2Render(); }

// ── Modale : segments de catégorie + case favori ──────────────────────
function rep2RenderSeg(actif, disabled) {
  const seg = document.getElementById('cCatSeg');
  if (!seg) return;
  const keys = Object.keys(REP2_CATS);
  seg.innerHTML = keys.map(k => `<button type="button" class="v2-seg-o${k === actif ? ' on' : ''}" data-cat="${k}"${disabled ? ' disabled' : ''} onclick="rep2PickCat('${k}')" style="--mc:${REP2_CATS[k].c}">${escHtml(REP2_CATS[k].l)}</button>`).join('');
}
function rep2PickCat(k) {
  const hid = document.getElementById('cCategorie');
  if (!hid) return;
  hid.value = (hid.value === k) ? '' : k;   // re-cliquer désélectionne
  rep2RenderSeg(hid.value, false);
}
// Appelée par openAddContact() / openEditContact() de js/repertoire.js.
function rep2SyncModal(c, readonly) {
  const hid = document.getElementById('cCategorie');
  const fav = document.getElementById('cFavori');
  const cat = c ? ((REP2_EXTRAS[c.id] || {}).categorie || '') : '';
  if (hid) hid.value = cat;
  if (fav) { fav.checked = c ? rep2Fav(c.id) : false; fav.disabled = !!readonly; }
  rep2RenderSeg(cat, !!readonly);
}
// Lue par saveContact() de js/repertoire.js.
function rep2ModalExtras() {
  return {
    categorie: (document.getElementById('cCategorie') || {}).value || null,
    favori: !!(document.getElementById('cFavori') || {}).checked
  };
}

// ── Rendu principal ───────────────────────────────────────────────────
function rep2Render() {
  const container = document.getElementById('contactList');
  if (!container) return;

  const all = (typeof getContacts === 'function' ? getContacts() : [])
    .slice().sort((a, b) => (a.organisme || '').localeCompare(b.organisme || ''));

  const q = (document.getElementById('searchRepertoire')?.value || '').trim().toLowerCase();
  const matchQ = c => !q || [c.organisme, c.nom, c.fonction, c.email, c.adresse, c.notes]
      .some(v => (v || '').toLowerCase().includes(q)) || (c.tel || '').includes(q);

  const cherches = all.filter(matchQ);

  // ── Chips : compte réel par catégorie, sur le résultat de la recherche
  const counts = {};
  cherches.forEach(c => { const k = rep2Cat(c.id); counts[k] = (counts[k] || 0) + 1; });
  const defs = [{ id: 'all', l: 'Tous', c: '#818cf8', n: cherches.length }]
    .concat(Object.keys(REP2_CATS).map(k => ({ id: k, l: REP2_CATS[k].l, c: REP2_CATS[k].c, n: counts[k] || 0 })));
  if (counts.nc) defs.push({ id: 'nc', l: REP2_NC.l, c: REP2_NC.c, n: counts.nc });
  if (REP2_FILTRE !== 'all' && !defs.some(d => d.id === REP2_FILTRE)) REP2_FILTRE = 'all';

  const chips = document.getElementById('repChips');
  if (chips) {
    chips.innerHTML = defs.map(d => `<button type="button" class="v2-chip-f${REP2_FILTRE === d.id ? ' on' : ''}" onclick="rep2SetFiltre('${d.id}')"><span class="dot" style="background:${d.c}"></span>${escHtml(d.l)}<span class="n">${d.n}</span></button>`).join('');
  }

  const contacts = REP2_FILTRE === 'all' ? cherches : cherches.filter(c => rep2Cat(c.id) === REP2_FILTRE);

  const countEl = document.getElementById('contactCount');
  if (countEl) {
    countEl.textContent = (contacts.length === all.length)
      ? all.length + ' contact' + (all.length > 1 ? 's' : '')
      : contacts.length + '/' + all.length + ' contacts';
  }

  // ── Grille des fiches
  if (!contacts.length) {
    container.innerHTML = `<div class="v2-blk"><div class="v2-blk-t">${q || REP2_FILTRE !== 'all' ? 'Aucun résultat' : 'Aucun contact'}</div>
      <div class="v2-blk-vide" style="margin-top:6px">${q || REP2_FILTRE !== 'all' ? 'Aucun contact ne correspond à cette recherche ou à ce filtre.' : 'Ajoutez votre premier contact partenaire avec le bouton « Nouveau contact ».'}</div></div>`;
  } else {
    container.innerHTML = `<div class="rp-grid">${contacts.map(c => {
      const cd = rep2CatDef(c.id), fav = rep2Fav(c.id), id = escAttr(c.id);
      const tel = c.tel ? `<a class="rp-line" href="tel:${escAttr((c.tel || '').replace(/\s/g, ''))}" title="Appeler et journaliser l'appel" onclick="event.stopPropagation();rep2LogAppel('${id}','sortant')">${_rep2Svg(REP2_IC.tel)}<span>${escHtml(c.tel)}</span></a>` : '';
      const mail = c.email ? `<a class="rp-line" href="mailto:${escAttr(c.email)}" onclick="event.stopPropagation()">${_rep2Svg(REP2_IC.mail)}<span>${escHtml(c.email)}</span></a>` : '';
      const adr = c.adresse ? `<div class="rp-line">${_rep2Svg(REP2_IC.pin)}<span>${escHtml(c.adresse)}</span></div>` : '';
      return `<div class="rp-card" style="--cc:${cd.c}" onclick="openEditContact('${id}')" role="button" tabindex="0">
        <div class="rp-head">
          <div class="rp-av">${escHtml(rep2Ini(c))}</div>
          <div class="rp-id">
            <div class="rp-nom">${escHtml(c.nom || c.organisme)}</div>
            <div class="rp-fn">${escHtml(c.fonction || '—')}</div>
          </div>
          <span class="rp-cat">${escHtml(cd.l)}</span>
          <button type="button" class="rp-star${fav ? ' on' : ''}" title="${fav ? 'Retirer des favoris' : 'Mettre en favori'}" aria-label="${fav ? 'Retirer des favoris' : 'Mettre en favori'}" onclick="event.stopPropagation();rep2ToggleFavori('${id}')">${_rep2Svg(REP2_IC.star, { fill: fav ? 'currentColor' : 'none', w: 1.8 })}</button>
        </div>
        ${c.nom ? `<div class="rp-org">${escHtml(c.organisme || '—')}</div>` : ''}
        <div class="rp-lines">${tel}${mail}${adr || (tel || mail ? '' : '<div class="v2-blk-vide">Aucune coordonnée renseignée</div>')}</div>
      </div>`;
    }).join('')}</div>`;
  }

  rep2RenderFavoris(all);
  rep2RenderAppels(all);
}

function rep2RenderFavoris(all) {
  const el = document.getElementById('repFavoris');
  if (!el) return;
  if (!REP2_EXTRAS_OK) {
    el.innerHTML = `<div class="v2-blk-vide">Favoris indisponibles : le fichier ${REP2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  const favs = all.filter(c => rep2Fav(c.id));
  if (!favs.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun contact favori — utilisez l\'étoile d\'une fiche pour l\'épingler ici.</div>';
    return;
  }
  el.innerHTML = `<div class="rp-fav-grid">${favs.map(c => {
    const cd = rep2CatDef(c.id);
    return `<div class="rp-fav" style="--cc:${cd.c}" onclick="openEditContact('${escAttr(c.id)}')" role="button" tabindex="0">
      <span class="rp-fav-av">${escHtml(rep2Ini(c))}</span>
      <div style="min-width:0">
        <div class="rp-fav-n">${escHtml(c.nom || c.organisme)}</div>
        <div class="rp-fav-t">${escHtml(c.tel || c.organisme || '')}</div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// « auj. 09:40 », « hier », « il y a 3 j », sinon la date.
function rep2Quand(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const j0 = new Date(); j0.setHours(0, 0, 0, 0);
  const dj = Math.floor((j0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if (dj <= 0) return 'auj. ' + hm;
  if (dj === 1) return 'hier';
  if (dj < 7) return 'il y a ' + dj + ' j';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function rep2RenderAppels(all) {
  const el = document.getElementById('repAppels');
  if (!el) return;
  if (!REP2_APPELS_OK) {
    el.innerHTML = `<div class="v2-blk-vide">Journal des appels indisponible : le fichier ${REP2_SQL} n'a pas encore été exécuté.</div>`;
    return;
  }
  if (!REP2_APPELS.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun appel journalisé — composez un numéro depuis une fiche pour l\'enregistrer ici.</div>';
    return;
  }
  const byId = {}; all.forEach(c => { byId[c.id] = c; });
  el.innerHTML = REP2_APPELS.map(a => {
    const c = byId[a.contact_id];
    if (!c) return '';
    const sortant = a.sens !== 'entrant';
    const meta = [sortant ? 'Sortant' : 'Entrant'].concat(c.organisme ? [c.organisme] : []).join(' · ');
    return `<div class="rp-appel" style="--ac:${sortant ? '#34d399' : '#22d3ee'}">
      <span class="rp-appel-i">${_rep2Svg(sortant ? REP2_IC.out : REP2_IC.in, { w: 2.2 })}</span>
      <div class="rp-appel-b">
        <div class="rp-appel-n">${escHtml(c.nom || c.organisme)}</div>
        <div class="rp-appel-d">${escHtml(meta)}</div>
      </div>
      <span class="rp-appel-w">${escHtml(rep2Quand(a.appele_le || a.created_at))}</span>
    </div>`;
  }).join('') || '<div class="v2-blk-vide">Aucun appel récent sur les contacts affichés.</div>';
}
