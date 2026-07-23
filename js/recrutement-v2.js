// ── RECRUTEMENT (RH) — DESIGN V2 ──────────────────────────────────────────
// Reproduit la maquette « Recrutement (RH) » : tuiles statistiques, pipeline
// en colonnes, offres publiées, entretiens à venir, indicateurs, check-list
// d'intégration, scorecard, origine des candidatures, CV-thèque et diffusion
// multi-canal.
//
// Les données et les actions des candidats restent celles de js/recrutement.js
// et js/candidats-supabase.js : aucune de ces deux couches n'est réécrite.
// Les blocs de la maquette sans source en base s'appuient sur les tables créées
// par migration-recrutement.sql — tant qu'il n'est pas exécuté, la lecture
// renvoie [] avec un console.warn et l'écriture est refusée par un toast
// nommant le fichier. Aucune valeur n'est inventée : un indicateur sans donnée
// s'affiche « — ».
//
// ⚠ Données RH sensibles (coûts de recrutement, évaluation de candidats) :
// les blocs correspondants sont réservés à l'encadrement RH, en plus du filtre
// RLS côté base. Aucun contrôle d'accès existant n'est desserré.

const RC2_SQL = 'migration-recrutement.sql';

const RC2_T_OFFRES = 'recrutement_offres';
const RC2_T_META   = 'recrutement_candidat_meta';
const RC2_T_SCORE  = 'recrutement_scorecard';
const RC2_T_ONB    = 'recrutement_onboarding';
const RC2_T_DIFF   = 'recrutement_diffusion';

// Colonnes du pipeline : les statuts réels de l'application (js/recrutement.js),
// habillés aux couleurs de la maquette. « Refusé » devient une colonne visible :
// ces candidatures disparaissaient totalement de l'écran en V1.
const RC2_COLS = [
  { id: 'recu',               c: '#818cf8' },
  { id: 'entretien_planifie', c: '#22d3ee' },
  { id: 'entretien_fait',     c: '#f59e0b' },
  { id: 'accepte',            c: '#10b981' },
  { id: 'refuse',             c: '#fb7185' }
];

// Statuts d'offre (maquette : Ouverte / Urgente / Pourvue)
const RC2_OFFRE_ST = {
  ouverte: { l: 'Ouverte',  c: '#10b981' },
  urgente: { l: 'Urgente',  c: '#ef4444' },
  pourvue: { l: 'Pourvue',  c: '#22d3ee' },
  close:   { l: 'Clôturée', c: '#8095b4' }
};
const RC2_OFFRE_OUV = ['ouverte', 'urgente'];

// Étapes d'intégration : référentiel de la check-list (obligations d'embauche
// + accueil). L'état « fait » vient de la base ; par défaut rien n'est coché.
const RC2_ETAPES = [
  'Contrat & DPAE',
  'Visite médicale',
  'Badge & accès',
  'Compte informatique',
  'Parrain / tuteur',
  "Livret d'accueil",
  "Planning d'intégration"
];

// Critères de la scorecard d'entretien
const RC2_CRITERES = [
  { k: 'Compétences métier',    c: '#10b981' },
  { k: 'Expérience du public',  c: '#22d3ee' },
  { k: 'Savoir-être / posture', c: '#818cf8' },
  { k: 'Motivation projet',     c: '#f59e0b' }
];

// Canaux de diffusion proposés (référentiel, pas une donnée)
const RC2_CANAUX_DIFF = ['Site INTERNALIS', 'France Travail', 'Indeed', 'LinkedIn'];
const RC2_DIFF_ST = {
  a_publier: { l: 'À publier', c: '#f59e0b' },
  publiee:   { l: 'Publiée',   c: '#34d399' },
  en_ligne:  { l: 'En ligne',  c: '#34d399' },
  retiree:   { l: 'Retirée',   c: '#8095b4' }
};
const RC2_DIFF_CYCLE = ['a_publier', 'publiee', 'en_ligne', 'retiree'];

const RC2_PALETTE = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];

const RC2_IC = {
  brief:  '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  euro:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  trend:  '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  globe:  '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  x:      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  key:    '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/>',
  arrow:  '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  star:   '<polygon points="12 2 15.1 8.6 22 9.5 17 14.4 18.2 21.3 12 18 5.8 21.3 7 14.4 2 9.5 8.9 8.6 12 2"/>'
};

let RC2_OFFRES = [], RC2_META = [], RC2_SCORE = [], RC2_ONB = [], RC2_DIFF = [];
const RC2_MISS = new Set();
let RC2_SEL = null;        // candidat mis en avant (scorecard)
let RC2_SEL_ONB = null;    // candidat recruté suivi dans la check-list
let RC2_SEL_OFFRE = null;  // offre suivie dans le bloc diffusion
let RC2_MD_MODE = null;

// ── Utilitaires ──────────────────────────────────────────────────────────
function rc2Esc(s) { return (typeof escHtml === 'function' ? escHtml(String(s ?? '')) : String(s ?? '')); }
function rc2Attr(s) { return rc2Esc(s).replace(/"/g, '&quot;'); }
function rc2Svg(p, w) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${w ? ` style="width:${w}px;height:${w}px"` : ''}>${p}</svg>`; }
function rc2Color(s) {
  const t = String(s || '');
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return RC2_PALETTE[h % RC2_PALETTE.length];
}
function rc2Ini(p, n) { return ((String(p || '')[0] || '') + (String(n || '')[0] || '')).toUpperCase() || '?'; }
function rc2Jours(iso) {
  if (!iso) return null;
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}
function rc2Quand(iso) {
  const j = rc2Jours(iso);
  if (j === null) return '';
  if (j === 0) return 'auj.';
  if (j === -1) return 'hier';
  if (j === 1) return 'demain';
  if (j < 0) return `il y a ${-j} j`;
  return `dans ${j} j`;
}
function rc2Date(iso) { return iso ? (typeof formatDate === 'function' ? formatDate(iso) : String(iso)) : ''; }
function rc2MoisCourt(iso) {
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return { j: '', m: '' };
  return { j: String(d.getDate()).padStart(2, '0'), m: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') };
}
function rc2Num(n, d = 0) {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// Périmètre RH : les blocs coûts / évaluation ne sont visibles que par
// l'encadrement (même règle que la RLS des tables créées par le SQL).
function rc2IsRH() {
  if (typeof Auth === 'undefined') return false;
  if (typeof Auth.isRH === 'function') return Auth.isRH();
  return typeof Auth.isAdmin === 'function' && Auth.isAdmin();
}
// Droit d'écriture sur les candidats : EXACTEMENT celui de js/recrutement.js.
function rc2CanEdit() { return typeof rcIsCanEdit === 'function' ? rcIsCanEdit() : false; }

function rc2Liste() { return (typeof getCandidats === 'function' ? getCandidats() : []) || []; }
function rc2Cand(id) { return rc2Liste().find(c => String(c.id) === String(id)) || null; }
function rc2MetaDe(id) { return RC2_META.find(m => String(m.candidat_id) === String(id)) || null; }
function rc2Statut(id) { return typeof rcStatutInfo === 'function' ? rcStatutInfo(id) : { id, label: id, color: '#818cf8' }; }

// ── Accès Supabase (dégradation douce si la table n'existe pas) ──────────
function rc2Absente(e) {
  const msg = String((e && (e.message || e.details || e.hint)) || '');
  return (e && e.code === '42P01') || /does not exist|Could not find the table|schema cache/i.test(msg);
}
async function rc2Select(table) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) {
      if (rc2Absente(error)) {
        RC2_MISS.add(table);
        console.warn(`[recrutement] table « ${table} » absente — exécutez ${RC2_SQL}`);
      } else {
        console.error(`[recrutement] lecture ${table}`, error);
      }
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`[recrutement] lecture ${table} impossible`, e);
    return [];
  }
}
function rc2RefuseSiAbsente(table) {
  if (!RC2_MISS.has(table)) return false;
  toast(`Table « ${table} » absente — exécutez ${RC2_SQL}`, 'error');
  return true;
}
function rc2RefuseSiPasRH() {
  if (rc2IsRH()) return false;
  toast('Action réservée à l’encadrement RH', 'error');
  return true;
}
async function rc2Upsert(table, row, id) {
  if (rc2RefuseSiPasRH() || rc2RefuseSiAbsente(table)) return null;
  try {
    const etab = await sbGetEtablissementId();
    const payload = { ...row, etablissement_id: etab, updated_at: new Date().toISOString() };
    const q = id
      ? supabaseClient.from(table).update(payload).eq('id', id).select()
      : supabaseClient.from(table).insert(payload).select();
    const { data, error } = await q;
    if (error) throw error;
    return (data && data[0]) || null;
  } catch (e) {
    if (rc2Absente(e)) { RC2_MISS.add(table); toast(`Table « ${table} » absente — exécutez ${RC2_SQL}`, 'error'); return null; }
    console.error(`[recrutement] écriture ${table}`, e);
    toast('Erreur : ' + (e?.message || e), 'error');
    return null;
  }
}
async function rc2Delete(table, id) {
  if (rc2RefuseSiPasRH() || rc2RefuseSiAbsente(table)) return false;
  try {
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`[recrutement] suppression ${table}`, e);
    toast('Erreur : ' + (e?.message || e), 'error');
    return false;
  }
}

async function rc2LoadExtras() {
  if (!rc2IsRH()) {
    // Hors encadrement RH : ni coûts, ni évaluations, ni check-list. La RLS
    // renverrait [] de toute façon ; on ne tente même pas la lecture.
    RC2_OFFRES = []; RC2_META = []; RC2_SCORE = []; RC2_ONB = []; RC2_DIFF = [];
    return;
  }
  const [off, meta, score, onb, diff] = await Promise.all([
    rc2Select(RC2_T_OFFRES), rc2Select(RC2_T_META), rc2Select(RC2_T_SCORE),
    rc2Select(RC2_T_ONB), rc2Select(RC2_T_DIFF)
  ]);
  RC2_OFFRES = off; RC2_META = meta; RC2_SCORE = score; RC2_ONB = onb; RC2_DIFF = diff;
}

// ── Dérivations ──────────────────────────────────────────────────────────
function rc2NoteMoy(candId) {
  const rows = RC2_SCORE.filter(s => String(s.candidat_id) === String(candId));
  if (!rows.length) return null;
  return rows.reduce((t, r) => t + Number(r.note || 0), 0) / rows.length;
}
function rc2FiltreOffre() {
  const el = document.getElementById('rc2OffreFilter');
  return el ? el.value : '';
}
function rc2Perimetre() {
  const of = rc2FiltreOffre();
  const list = rc2Liste();
  if (!of) return list;
  return list.filter(c => {
    const m = rc2MetaDe(c.id);
    return m && String(m.offre_id) === String(of);
  });
}
function rc2EntretiensAVenir() {
  return rc2Liste()
    .filter(c => c.dateEntretien && rc2Jours(c.dateEntretien) >= 0 && c.statut !== 'refuse')
    .sort((a, b) => String(a.dateEntretien).localeCompare(String(b.dateEntretien)));
}

// ── Rendu : tuiles statistiques ──────────────────────────────────────────
function rc2RenderStats() {
  const el = document.getElementById('rcStats');
  if (!el) return;
  const all = rc2Liste();
  const rh = rc2IsRH();

  // Offres ouvertes — sans la table, la valeur est inconnue (jamais 0 inventé).
  let offresVal = '—';
  if (rh && !RC2_MISS.has(RC2_T_OFFRES)) {
    offresVal = String(RC2_OFFRES.filter(o => RC2_OFFRE_OUV.includes(o.statut)).length);
  }

  const semaine = all.filter(c => {
    const j = rc2Jours(c.dateEntretien);
    return j !== null && j >= 0 && j <= 7 && c.statut !== 'refuse';
  }).length;

  // Délai moyen candidature → décision, calculé sur les candidats tranchés.
  const tranches = all.filter(c => (c.statut === 'accepte' || c.statut === 'refuse') && c.date && c.updatedAt);
  let delai = '—';
  if (tranches.length) {
    const moy = tranches.reduce((t, c) => {
      const d1 = new Date(String(c.date).slice(0, 10) + 'T00:00:00');
      const d2 = new Date(c.updatedAt);
      return t + Math.max(0, (d2 - d1) / 86400000);
    }, 0) / tranches.length;
    delai = rc2Num(moy) + ' j';
  }

  const tuiles = [
    { n: offresVal, l: 'Offres ouvertes', c: '#0284c7', i: RC2_IC.brief },
    { n: String(all.length), l: 'Candidatures', c: '#22d3ee', i: RC2_IC.users },
    { n: String(semaine), l: 'Entretiens sous 7 j', c: '#818cf8', i: RC2_IC.cal },
    { n: delai, l: 'Délai moyen de décision', c: '#10b981', i: RC2_IC.clock }
  ];
  el.innerHTML = tuiles.map(t => `
    <div class="rc2-stat" style="--pc:${t.c}">
      <span class="rc2-stat-ico">${rc2Svg(t.i)}</span>
      <div><div class="rc2-stat-n">${rc2Esc(t.n)}</div><div class="rc2-stat-l">${rc2Esc(t.l)}</div></div>
    </div>`).join('');
}

// ── Rendu : pipeline ─────────────────────────────────────────────────────
function rc2RenderBoard() {
  const board = document.getElementById('rcBoard');
  if (!board) return;
  const items = rc2Perimetre();
  const peut = rc2CanEdit();

  board.innerHTML = RC2_COLS.map(col => {
    const st = rc2Statut(col.id);
    const cards = items
      .filter(c => (c.statut || 'recu') === col.id)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return `<div class="rc2-col">
      <div class="rc2-col-h">
        <span class="rc2-col-dot" style="background:${col.c}"></span>
        <span class="rc2-col-l">${rc2Esc(st.label)}</span>
        <span class="rc2-col-n">${cards.length}</span>
      </div>
      ${cards.map(c => rc2Card(c, col, peut)).join('')
        || '<div class="rc2-col-vide">Aucun candidat</div>'}
    </div>`;
  }).join('');
}

function rc2Card(c, col, peut) {
  const nom = `${c.prenom || ''} ${typeof nomMaj === 'function' ? nomMaj(c.nom) : (c.nom || '')}`.trim();
  const meta = rc2MetaDe(c.id);
  const note = rc2NoteMoy(c.id);
  const av = rc2Color(c.id);
  const idx = RC2_COLS.findIndex(x => x.id === c.statut);
  const suite = (c.statut !== 'refuse' && idx >= 0 && idx < 3) ? RC2_COLS[idx + 1].id : null;
  const sel = String(RC2_SEL) === String(c.id);

  const actions = peut ? `<div class="rc2-card-act">
      ${suite ? `<button type="button" class="rc2-mini" style="--pc:#34d399" title="Passer à « ${rc2Attr(rc2Statut(suite).label)} »" onclick="event.stopPropagation();rcSetStatut('${rc2Attr(c.id)}','${suite}')">${rc2Svg(RC2_IC.arrow, 12)} ${rc2Esc(rc2Statut(suite).label)}</button>` : ''}
      ${(c.statut !== 'refuse' && c.statut !== 'accepte') ? `<button type="button" class="rc2-mini" style="--pc:#fb7185" title="Refuser" onclick="event.stopPropagation();rcSetStatut('${rc2Attr(c.id)}','refuse')">${rc2Svg(RC2_IC.x, 12)} Refuser</button>` : ''}
      <button type="button" class="rc2-mini" style="--pc:#9fb2ce" title="Modifier" onclick="event.stopPropagation();openCandidatModal('${rc2Attr(c.id)}')">${rc2Svg(RC2_IC.pen, 12)}</button>
    </div>` : '';

  let compte = '';
  if (c.statut === 'accepte') {
    if (c._compteCree) {
      compte = `<div class="rc2-card-ok">${rc2Svg(RC2_IC.check, 13)} Compte de connexion créé</div>`;
    } else if (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) {
      compte = `<button type="button" class="rc2-card-cta" onclick="event.stopPropagation();rcCreateCompte('${rc2Attr(c.id)}')">${rc2Svg(RC2_IC.key, 13)} Créer son compte</button>`;
    } else {
      compte = `<div class="rc2-card-ok">${rc2Svg(RC2_IC.check, 13)} Fiche à créer depuis <a href="admin.html">Administration → Utilisateurs</a></div>`;
    }
  }

  return `<div class="rc2-card${sel ? ' on' : ''}" style="--cc:${col.c}" onclick="rc2Selectionner('${rc2Attr(c.id)}')" title="Voir la scorecard de ce candidat">
    <div class="rc2-card-top">
      <span class="rc2-card-av" style="background:${av}">${rc2Esc(rc2Ini(c.prenom, c.nom))}</span>
      <div style="min-width:0">
        <div class="rc2-card-n">${rc2Esc(nom)}</div>
        <div class="rc2-card-s">${rc2Esc(c.poste || '—')}${meta && meta.dispo ? ' · ' + rc2Esc(meta.dispo) : ''}</div>
      </div>
    </div>
    ${c.dateEntretien ? `<div class="rc2-card-rdv">${rc2Svg(RC2_IC.cal, 12)} Entretien ${rc2Esc(rc2Date(c.dateEntretien))}</div>` : ''}
    ${c.notes ? `<div class="rc2-card-nt">${rc2Esc(c.notes.slice(0, 90))}${c.notes.length > 90 ? '…' : ''}</div>` : ''}
    <div class="rc2-card-f">
      ${note !== null ? `<span class="rc2-card-note">${rc2Svg(RC2_IC.star, 11)} ${rc2Esc(rc2Num(note, 1))}</span>` : '<span class="rc2-card-note vide">Non évalué</span>'}
      <span class="rc2-card-w">${rc2Esc(rc2Quand(c.date))}</span>
    </div>
    ${actions}${compte}
  </div>`;
}

// ── Rendu : offres publiées ──────────────────────────────────────────────
function rc2RenderOffres() {
  const el = document.getElementById('rc2Offres');
  const meta = document.getElementById('rc2OffresMeta');
  if (!el) return;
  if (!rc2IsRH()) { el.innerHTML = '<div class="v2-blk-vide">Réservé à l’encadrement RH.</div>'; if (meta) meta.textContent = ''; return; }
  if (RC2_MISS.has(RC2_T_OFFRES)) { el.innerHTML = rc2NoteSql(); if (meta) meta.textContent = ''; return; }
  if (!RC2_OFFRES.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune offre enregistrée.</div>'; if (meta) meta.textContent = ''; return; }

  if (meta) meta.textContent = RC2_OFFRES.length + ' offre' + (RC2_OFFRES.length > 1 ? 's' : '');
  const tri = [...RC2_OFFRES].sort((a, b) => String(b.date_ouverture || '').localeCompare(String(a.date_ouverture || '')));
  el.innerHTML = tri.map(o => {
    const st = RC2_OFFRE_ST[o.statut] || RC2_OFFRE_ST.ouverte;
    const nb = RC2_META.filter(m => String(m.offre_id) === String(o.id)).length;
    const c = rc2Color(o.id);
    return `<div class="rc2-line" onclick="rc2OpenOffre('${rc2Attr(o.id)}')" title="Modifier l’offre">
      <span class="rc2-line-ico" style="--pc:${c}">${rc2Svg(RC2_IC.brief, 15)}</span>
      <div style="flex:1;min-width:0">
        <div class="rc2-line-t">${rc2Esc(o.titre || 'Offre sans titre')}</div>
        <div class="rc2-line-s">${rc2Esc(o.contrat || '—')} · ${nb} cand.${Number(o.cout) > 0 ? ' · ' + rc2Esc(rc2Num(o.cout)) + ' €' : ''}</div>
      </div>
      <span class="rc2-tag" style="--pc:${st.c}">${rc2Esc(st.l)}</span>
    </div>`;
  }).join('');
}

// ── Rendu : entretiens à venir ───────────────────────────────────────────
function rc2RenderEntretiens() {
  const el = document.getElementById('rc2Entretiens');
  if (!el) return;
  const list = rc2EntretiensAVenir();
  if (!list.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun entretien programmé.</div>'; return; }
  el.innerHTML = list.slice(0, 6).map(c => {
    const d = rc2MoisCourt(c.dateEntretien);
    const nom = `${c.prenom || ''} ${typeof nomMaj === 'function' ? nomMaj(c.nom) : (c.nom || '')}`.trim();
    return `<div class="rc2-line" onclick="rc2Selectionner('${rc2Attr(c.id)}')">
      <div class="rc2-line-d"><div class="rc2-line-dj">${rc2Esc(d.j)}</div><div class="rc2-line-dm">${rc2Esc(d.m)}</div></div>
      <div style="flex:1;min-width:0">
        <div class="rc2-line-t">${rc2Esc(nom)}</div>
        <div class="rc2-line-s">${rc2Esc(c.poste || '—')} · ${rc2Esc(rc2Statut(c.statut || 'recu').label)}</div>
      </div>
      <span class="rc2-line-h">${rc2Esc(rc2Quand(c.dateEntretien))}</span>
    </div>`;
  }).join('');
}

// ── Rendu : indicateurs ──────────────────────────────────────────────────
function rc2RenderKpis() {
  const blk = document.getElementById('rc2KpisBlk');
  const el = document.getElementById('rc2Kpis');
  if (!el) return;
  if (!rc2IsRH()) { if (blk) blk.style.display = 'none'; return; }
  if (blk) blk.style.display = '';

  const all = rc2Liste();
  const accept = all.filter(c => c.statut === 'accepte').length;
  const traites = all.filter(c => c.statut !== 'recu').length;

  const transf = all.length ? rc2Num(100 * accept / all.length) + ' %' : '—';
  const reponse = all.length ? rc2Num(100 * traites / all.length) + ' %' : '—';

  let cout = '—';
  if (!RC2_MISS.has(RC2_T_OFFRES) && accept > 0) {
    const total = RC2_OFFRES.reduce((t, o) => t + Number(o.cout || 0), 0);
    if (total > 0) cout = rc2Num(total / accept) + ' €';
  }

  let sourcing = '—';
  if (!RC2_MISS.has(RC2_T_META)) {
    const comptes = {};
    RC2_META.forEach(m => { const k = (m.canal || '').trim(); if (k) comptes[k] = (comptes[k] || 0) + 1; });
    const top = Object.entries(comptes).sort((a, b) => b[1] - a[1])[0];
    if (top) sourcing = `${top[0]} (${top[1]})`;
  }

  const kpis = [
    { l: 'Taux de transformation', v: transf, c: '#0284c7', i: RC2_IC.target },
    { l: 'Coût par recrutement', v: cout, c: '#f59e0b', i: RC2_IC.euro },
    { l: 'Sourcing principal', v: sourcing, c: '#22d3ee', i: RC2_IC.trend },
    { l: 'Candidatures traitées', v: reponse, c: '#10b981', i: RC2_IC.check }
  ];
  el.innerHTML = kpis.map(k => `<div class="rc2-kpi">
      <span class="rc2-kpi-ico" style="--pc:${k.c}">${rc2Svg(k.i, 16)}</span>
      <span class="rc2-kpi-l">${rc2Esc(k.l)}</span>
      <span class="rc2-kpi-v">${rc2Esc(k.v)}</span>
    </div>`).join('');
}

// ── Rendu : intégration ──────────────────────────────────────────────────
function rc2RenderOnboarding() {
  const blk = document.getElementById('rc2OnbBlk');
  const el = document.getElementById('rc2Onboarding');
  const titre = document.getElementById('rc2OnbTitre');
  const cpt = document.getElementById('rc2OnbCompteur');
  if (!el) return;
  if (!rc2IsRH()) { if (blk) blk.style.display = 'none'; return; }
  if (blk) blk.style.display = '';

  const recrutes = rc2Liste().filter(c => c.statut === 'accepte');
  if (!RC2_SEL_ONB || !recrutes.some(c => String(c.id) === String(RC2_SEL_ONB))) {
    RC2_SEL_ONB = recrutes.length ? recrutes[0].id : null;
  }
  const c = RC2_SEL_ONB ? rc2Cand(RC2_SEL_ONB) : null;

  if (!c) {
    if (titre) titre.textContent = 'Intégration';
    if (cpt) cpt.textContent = '';
    el.innerHTML = '<div class="v2-blk-vide">Aucun candidat au statut « Accepté » : la check-list d’intégration s’ouvrira dès le premier recrutement.</div>';
    return;
  }

  const nom = `${c.prenom || ''} ${typeof nomMaj === 'function' ? nomMaj(c.nom) : (c.nom || '')}`.trim();
  const rows = RC2_ONB.filter(o => String(o.candidat_id) === String(c.id));
  const faits = RC2_ETAPES.filter(e => rows.some(r => r.etape === e && r.fait)).length;
  if (titre) titre.textContent = `Intégration — ${nom}`;
  if (cpt) cpt.textContent = `${faits} / ${RC2_ETAPES.length} prêts`;

  const choix = recrutes.length > 1
    ? `<select class="rc2-sel rc2-sel-inline" aria-label="Choisir le candidat recruté" onchange="rc2SetOnb(this.value)">
        ${recrutes.map(r => `<option value="${rc2Attr(r.id)}"${String(r.id) === String(c.id) ? ' selected' : ''}>${rc2Esc(`${r.prenom || ''} ${typeof nomMaj === 'function' ? nomMaj(r.nom) : (r.nom || '')}`.trim())}</option>`).join('')}
      </select>` : '';

  el.innerHTML = `${choix}
    ${RC2_MISS.has(RC2_T_ONB) ? rc2NoteSql() : ''}
    <div class="rc2-onb">
      ${RC2_ETAPES.map(e => {
        const r = rows.find(x => x.etape === e);
        const ok = !!(r && r.fait);
        return `<button type="button" class="rc2-onb-i${ok ? ' on' : ''}" onclick="rc2ToggleOnb('${rc2Attr(c.id)}','${rc2Attr(e)}')">
          <span class="rc2-onb-c">${rc2Svg(ok ? RC2_IC.check : RC2_IC.clock, 15)}</span>
          <span class="rc2-onb-l">${rc2Esc(e)}</span>
          ${ok && r.fait_le ? `<span class="rc2-onb-d">${rc2Esc(rc2Date(r.fait_le))}</span>` : ''}
        </button>`;
      }).join('')}
    </div>`;
}

async function rc2ToggleOnb(candId, etape) {
  if (rc2RefuseSiPasRH() || rc2RefuseSiAbsente(RC2_T_ONB)) return;
  const r = RC2_ONB.find(x => String(x.candidat_id) === String(candId) && x.etape === etape);
  const fait = !(r && r.fait);
  const row = await rc2Upsert(RC2_T_ONB,
    { candidat_id: candId, etape, fait, fait_le: fait ? today() : null },
    r ? r.id : null);
  if (!row) return;
  if (r) Object.assign(r, row); else RC2_ONB.push(row);
  rc2RenderOnboarding();
}
function rc2SetOnb(id) { RC2_SEL_ONB = id; rc2RenderOnboarding(); }

// ── Rendu : scorecard ────────────────────────────────────────────────────
function rc2RenderScorecard() {
  const blk = document.getElementById('rc2ScoreBlk');
  const el = document.getElementById('rc2Scorecard');
  const titre = document.getElementById('rc2ScoreTitre');
  const moyEl = document.getElementById('rc2ScoreMoy');
  if (!el) return;
  if (!rc2IsRH()) { if (blk) blk.style.display = 'none'; return; }
  if (blk) blk.style.display = '';

  const list = rc2Liste();
  if (!RC2_SEL || !list.some(c => String(c.id) === String(RC2_SEL))) {
    const prio = list.find(c => c.statut === 'entretien_fait') || list.find(c => c.statut === 'entretien_planifie') || list[0];
    RC2_SEL = prio ? prio.id : null;
  }
  const c = RC2_SEL ? rc2Cand(RC2_SEL) : null;
  if (!c) {
    if (titre) titre.textContent = 'Scorecard';
    if (moyEl) moyEl.textContent = '';
    el.innerHTML = '<div class="v2-blk-vide">Aucun candidat. Sélectionnez une carte du pipeline pour évaluer.</div>';
    return;
  }

  const nom = `${c.prenom || ''} ${typeof nomMaj === 'function' ? nomMaj(c.nom) : (c.nom || '')}`.trim();
  if (titre) titre.textContent = `Scorecard — ${nom}`;
  const moy = rc2NoteMoy(c.id);
  if (moyEl) moyEl.textContent = moy === null ? 'Non évalué' : `${rc2Num(moy, 1)}/5`;

  const rows = RC2_SCORE.filter(s => String(s.candidat_id) === String(c.id));
  el.innerHTML = `${RC2_MISS.has(RC2_T_SCORE) ? rc2NoteSql() : ''}
    <div class="rc2-score">
      ${RC2_CRITERES.map(cr => {
        const r = rows.find(x => x.critere === cr.k);
        const n = r ? Number(r.note) : null;
        return `<div>
          <div class="rc2-score-h">
            <span class="rc2-score-l">${rc2Esc(cr.k)}</span>
            <span class="rc2-score-n" style="color:${n === null ? '#7f93b3' : cr.c}">${n === null ? '—' : rc2Esc(rc2Num(n, 1))}</span>
          </div>
          <div class="v2-prog"><span style="width:${n === null ? 0 : Math.max(0, Math.min(100, n * 20))}%;background:${cr.c}"></span></div>
        </div>`;
      }).join('')}
    </div>
    <button type="button" class="rc2-blk-cta" onclick="rc2OpenScore()">${rc2Svg(RC2_IC.pen, 14)} Évaluer ce candidat</button>`;
}

// ── Rendu : origine des candidatures ─────────────────────────────────────
function rc2RenderCanaux() {
  const el = document.getElementById('rc2Canaux');
  if (!el) return;
  if (!rc2IsRH()) { el.innerHTML = '<div class="v2-blk-vide">Réservé à l’encadrement RH.</div>'; return; }
  if (RC2_MISS.has(RC2_T_META)) { el.innerHTML = rc2NoteSql(); return; }

  const comptes = {};
  RC2_META.forEach(m => { const k = (m.canal || '').trim(); if (k) comptes[k] = (comptes[k] || 0) + 1; });
  const entries = Object.entries(comptes).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucune origine renseignée. Le champ « Origine de la candidature » se saisit dans la fiche candidat.</div>';
    return;
  }
  const max = entries[0][1];
  el.innerHTML = entries.map(([k, n], i) => {
    const c = RC2_PALETTE[i % RC2_PALETTE.length];
    return `<div class="rc2-canal">
      <div class="rc2-score-h"><span class="rc2-score-l">${rc2Esc(k)}</span><span class="rc2-score-n" style="color:#fff">${n}</span></div>
      <div class="v2-prog"><span style="width:${Math.round(100 * n / max)}%;background:${c}"></span></div>
    </div>`;
  }).join('');
}

// ── Rendu : CV-thèque ────────────────────────────────────────────────────
function rc2RenderVivier() {
  const el = document.getElementById('rc2Vivier');
  const meta = document.getElementById('rc2VivierMeta');
  if (!el) return;
  if (!rc2IsRH()) { el.innerHTML = '<div class="v2-blk-vide">Réservé à l’encadrement RH.</div>'; if (meta) meta.textContent = ''; return; }
  if (RC2_MISS.has(RC2_T_META)) { el.innerHTML = rc2NoteSql(); if (meta) meta.textContent = ''; return; }

  const ids = RC2_META.filter(m => m.vivier).map(m => String(m.candidat_id));
  const list = rc2Liste().filter(c => ids.includes(String(c.id)));
  if (meta) meta.textContent = list.length ? `${list.length} profil${list.length > 1 ? 's' : ''} conservé${list.length > 1 ? 's' : ''} en vivier` : '';
  if (!list.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun profil en vivier. Cochez « Conserver en CV-thèque » dans la fiche candidat.</div>';
    return;
  }
  el.innerHTML = list.slice(0, 8).map(c => {
    const m = rc2MetaDe(c.id);
    const nom = `${c.prenom || ''} ${typeof nomMaj === 'function' ? nomMaj(c.nom) : (c.nom || '')}`.trim();
    return `<div class="rc2-line" onclick="openCandidatModal('${rc2Attr(c.id)}')" title="Ouvrir la fiche candidat">
      <span class="rc2-card-av" style="background:${rc2Color(c.id)}">${rc2Esc(rc2Ini(c.prenom, c.nom))}</span>
      <div style="flex:1;min-width:0">
        <div class="rc2-line-t">${rc2Esc(nom)}</div>
        <div class="rc2-line-s">${rc2Esc(c.poste || '—')}${m && m.dispo ? ' · ' + rc2Esc(m.dispo) : ''}</div>
      </div>
      <span class="rc2-tag" style="--pc:#a5b4fc">Vivier</span>
    </div>`;
  }).join('');
}

// ── Rendu : diffusion multi-canal ────────────────────────────────────────
function rc2RenderDiffusion() {
  const blk = document.getElementById('rc2DiffBlk');
  const el = document.getElementById('rc2Diffusion');
  if (!el) return;
  if (!rc2IsRH()) { if (blk) blk.style.display = 'none'; return; }
  if (blk) blk.style.display = '';
  if (RC2_MISS.has(RC2_T_DIFF) || RC2_MISS.has(RC2_T_OFFRES)) { el.innerHTML = rc2NoteSql(); return; }
  if (!RC2_OFFRES.length) { el.innerHTML = '<div class="v2-blk-vide">Créez une offre pour piloter sa diffusion.</div>'; return; }

  if (!RC2_SEL_OFFRE || !RC2_OFFRES.some(o => String(o.id) === String(RC2_SEL_OFFRE))) RC2_SEL_OFFRE = RC2_OFFRES[0].id;
  const rows = RC2_DIFF.filter(d => String(d.offre_id) === String(RC2_SEL_OFFRE));

  el.innerHTML = `
    <select class="rc2-sel rc2-sel-inline" aria-label="Offre diffusée" onchange="rc2SetOffreDiff(this.value)">
      ${RC2_OFFRES.map(o => `<option value="${rc2Attr(o.id)}"${String(o.id) === String(RC2_SEL_OFFRE) ? ' selected' : ''}>${rc2Esc(o.titre || 'Offre sans titre')}</option>`).join('')}
    </select>
    ${RC2_CANAUX_DIFF.map(canal => {
      const r = rows.find(x => x.canal === canal);
      const st = RC2_DIFF_ST[(r && r.statut) || 'a_publier'];
      return `<button type="button" class="rc2-diff" onclick="rc2CycleDiff('${rc2Attr(canal)}')" title="Changer le statut de diffusion">
        <span class="rc2-diff-ico" style="color:${st.c}">${rc2Svg(st.c === '#34d399' ? RC2_IC.check : RC2_IC.globe, 15)}</span>
        <span class="rc2-diff-l">${rc2Esc(canal)}</span>
        <span class="rc2-tag" style="--pc:${st.c}">${rc2Esc(st.l)}</span>
      </button>`;
    }).join('')}`;
}
function rc2SetOffreDiff(id) { RC2_SEL_OFFRE = id; rc2RenderDiffusion(); }

async function rc2CycleDiff(canal) {
  if (rc2RefuseSiPasRH() || rc2RefuseSiAbsente(RC2_T_DIFF)) return;
  const r = RC2_DIFF.find(x => String(x.offre_id) === String(RC2_SEL_OFFRE) && x.canal === canal);
  const cur = (r && r.statut) || 'a_publier';
  const next = RC2_DIFF_CYCLE[(RC2_DIFF_CYCLE.indexOf(cur) + 1) % RC2_DIFF_CYCLE.length];
  const row = await rc2Upsert(RC2_T_DIFF, { offre_id: RC2_SEL_OFFRE, canal, statut: next }, r ? r.id : null);
  if (!row) return;
  if (r) Object.assign(r, row); else RC2_DIFF.push(row);
  rc2RenderDiffusion();
}

// ── Note « SQL non exécuté » ─────────────────────────────────────────────
function rc2NoteSql() {
  return `<div class="v2-note v2-note-warn rc2-note">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <span>Bloc en attente : exécutez <strong>${RC2_SQL}</strong> dans Supabase.</span>
  </div>`;
}

// ── Sélection d'un candidat ──────────────────────────────────────────────
function rc2Selectionner(id) {
  RC2_SEL = id;
  rc2RenderBoard();
  rc2RenderScorecard();
}

// ── Modales du module (offre, scorecard) ─────────────────────────────────
function rc2CloseModal() {
  RC2_MD_MODE = null;
  const ov = document.getElementById('rc2Modal');
  if (ov) { ov.classList.remove('open'); ov.innerHTML = ''; }
  document.body.style.overflow = '';
}
function rc2ShowModal(html) {
  const ov = document.getElementById('rc2Modal');
  if (!ov) return;
  ov.innerHTML = html;
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function rc2SegPick(btn) {
  const p = btn.parentElement;
  if (!p) return;
  p.querySelectorAll('.v2-seg-o').forEach(b => b.classList.toggle('on', b === btn));
}
function rc2SegVal(id) {
  const p = document.getElementById(id);
  const on = p && p.querySelector('.v2-seg-o.on');
  return on ? on.dataset.v : '';
}

function rc2OpenOffre(id) {
  if (rc2RefuseSiPasRH()) return;
  const o = id ? RC2_OFFRES.find(x => String(x.id) === String(id)) : null;
  RC2_MD_MODE = 'offre:' + (o ? o.id : '');
  rc2ShowModal(`<div class="v2-md" style="--mc:#0284c7">
    <div class="v2-md-h">
      <span class="v2-md-ico">${rc2Svg(RC2_IC.brief)}</span>
      <div><div class="v2-md-t">${o ? 'Modifier l’offre' : 'Nouvelle offre'}</div>
      <div class="v2-md-s">Poste ouvert au recrutement</div></div>
      <button type="button" class="v2-md-x" onclick="rc2CloseModal()" aria-label="Fermer">${rc2Svg(RC2_IC.x, 16)}</button>
    </div>
    <div class="v2-md-b">
      <div><label class="v2-fld-l" for="rc2OfTitre">Intitulé du poste *</label><input class="v2-fld" id="rc2OfTitre" type="text" value="${rc2Attr(o ? o.titre : '')}" placeholder="Éducateur spécialisé"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="rc2OfContrat">Type de contrat</label><input class="v2-fld" id="rc2OfContrat" type="text" value="${rc2Attr(o ? o.contrat : 'CDI')}" placeholder="CDI, CDD, CDI 0,8…"/></div>
        <div><label class="v2-fld-l" for="rc2OfDate">Date d'ouverture</label><input class="v2-fld" id="rc2OfDate" type="date" value="${rc2Attr(o && o.date_ouverture ? String(o.date_ouverture).slice(0, 10) : today())}"/></div>
      </div>
      <div>
        <label class="v2-fld-l">Statut</label>
        <div class="v2-seg" id="rc2OfStatut">
          ${['ouverte', 'urgente', 'pourvue', 'close'].map(s => `<button type="button" class="v2-seg-o${(o ? o.statut : 'ouverte') === s ? ' on' : ''}" data-v="${s}" onclick="rc2SegPick(this)">${rc2Esc(RC2_OFFRE_ST[s].l)}</button>`).join('')}
        </div>
      </div>
      <div><label class="v2-fld-l" for="rc2OfCout">Coût de recrutement engagé (€)</label><input class="v2-fld" id="rc2OfCout" type="number" min="0" step="10" value="${rc2Attr(o ? o.cout : 0)}"/>
        <div class="rc2-hint">Annonces, cabinet, salons… Sert au calcul du coût par recrutement.</div></div>
    </div>
    <div class="v2-md-f">
      ${o ? `<button type="button" class="v2-btn-sec rc2-danger" onclick="rc2SupprOffre('${rc2Attr(o.id)}')">Supprimer</button>` : ''}
      <button type="button" class="v2-btn-sec" onclick="rc2CloseModal()">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="rc2SaveOffre('${rc2Attr(o ? o.id : '')}')">${rc2Svg(RC2_IC.check, 15)} Enregistrer</button>
    </div>
  </div>`);
}

async function rc2SaveOffre(id) {
  const titre = (document.getElementById('rc2OfTitre').value || '').trim();
  if (!titre) { toast('Intitulé du poste obligatoire', 'error'); return; }
  const row = {
    titre,
    contrat: (document.getElementById('rc2OfContrat').value || '').trim(),
    statut: rc2SegVal('rc2OfStatut') || 'ouverte',
    date_ouverture: document.getElementById('rc2OfDate').value || null,
    cout: Number(document.getElementById('rc2OfCout').value || 0)
  };
  const saved = await rc2Upsert(RC2_T_OFFRES, row, id || null);
  if (!saved) return;
  const i = RC2_OFFRES.findIndex(o => String(o.id) === String(saved.id));
  if (i >= 0) RC2_OFFRES[i] = saved; else RC2_OFFRES.push(saved);
  rc2CloseModal();
  toast('Offre enregistrée ✓', 'success');
  rc2Render();
}

async function rc2SupprOffre(id) {
  confirmDialog('Supprimer cette offre ?', async () => {
    if (!await rc2Delete(RC2_T_OFFRES, id)) return;
    RC2_OFFRES = RC2_OFFRES.filter(o => String(o.id) !== String(id));
    RC2_DIFF = RC2_DIFF.filter(d => String(d.offre_id) !== String(id));
    rc2CloseModal();
    toast('Offre supprimée', 'info');
    rc2Render();
  });
}

function rc2OpenScore() {
  if (rc2RefuseSiPasRH()) return;
  const c = RC2_SEL ? rc2Cand(RC2_SEL) : null;
  if (!c) { toast('Sélectionnez d’abord un candidat', 'error'); return; }
  const nom = `${c.prenom || ''} ${typeof nomMaj === 'function' ? nomMaj(c.nom) : (c.nom || '')}`.trim();
  const rows = RC2_SCORE.filter(s => String(s.candidat_id) === String(c.id));
  RC2_MD_MODE = 'score';
  rc2ShowModal(`<div class="v2-md" style="--mc:#818cf8">
    <div class="v2-md-h">
      <span class="v2-md-ico">${rc2Svg(RC2_IC.star)}</span>
      <div><div class="v2-md-t">Scorecard</div><div class="v2-md-s">${rc2Esc(nom)} — évaluation d'entretien</div></div>
      <button type="button" class="v2-md-x" onclick="rc2CloseModal()" aria-label="Fermer">${rc2Svg(RC2_IC.x, 16)}</button>
    </div>
    <div class="v2-md-b">
      ${RC2_CRITERES.map((cr, i) => {
        const r = rows.find(x => x.critere === cr.k);
        return `<div><label class="v2-fld-l" for="rc2Sc${i}">${rc2Esc(cr.k)} — note sur 5</label>
          <input class="v2-fld" id="rc2Sc${i}" type="number" min="0" max="5" step="0.1" value="${r ? rc2Attr(r.note) : ''}" placeholder="—"/></div>`;
      }).join('')}
      <div class="v2-note v2-note-warn rc2-note">
        ${rc2Svg('<path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/>', 16)}
        <span>Évaluation d'un <strong>candidat</strong> en recrutement. Elle ne concerne pas les salariés : aucune note n'est attribuée à un membre de l'équipe.</span>
      </div>
    </div>
    <div class="v2-md-f">
      <button type="button" class="v2-btn-sec" onclick="rc2CloseModal()">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="rc2SaveScore('${rc2Attr(c.id)}')">${rc2Svg(RC2_IC.check, 15)} Enregistrer</button>
    </div>
  </div>`);
}

async function rc2SaveScore(candId) {
  if (rc2RefuseSiPasRH() || rc2RefuseSiAbsente(RC2_T_SCORE)) return;
  for (let i = 0; i < RC2_CRITERES.length; i++) {
    const el = document.getElementById('rc2Sc' + i);
    const raw = el ? String(el.value).trim() : '';
    const critere = RC2_CRITERES[i].k;
    const r = RC2_SCORE.find(x => String(x.candidat_id) === String(candId) && x.critere === critere);
    if (raw === '') {
      if (r && await rc2Delete(RC2_T_SCORE, r.id)) RC2_SCORE = RC2_SCORE.filter(x => x.id !== r.id);
      continue;
    }
    const note = Math.max(0, Math.min(5, Number(raw)));
    const saved = await rc2Upsert(RC2_T_SCORE, { candidat_id: candId, critere, note }, r ? r.id : null);
    if (!saved) return;
    if (r) Object.assign(r, saved); else RC2_SCORE.push(saved);
  }
  rc2CloseModal();
  toast('Scorecard enregistrée ✓', 'success');
  rc2Render();
}

// ── Fiche candidat : champs supplémentaires (offre, canal, dispo, vivier) ─
function rc2RemplirOffreSelects() {
  const opts = RC2_OFFRES.map(o => `<option value="${rc2Attr(o.id)}">${rc2Esc(o.titre || 'Offre sans titre')}</option>`).join('');
  const f = document.getElementById('rc2OffreFilter');
  if (f) { const v = f.value; f.innerHTML = '<option value="">Toutes les offres</option>' + opts; f.value = v; }
  const s = document.getElementById('rc2CandOffre');
  if (s) { const v = s.value; s.innerHTML = '<option value="">— Aucune —</option>' + opts; s.value = v; }
}

function rc2RemplirMetaModal(id) {
  const m = id ? rc2MetaDe(id) : null;
  const sel = document.getElementById('rc2CandOffre');
  if (sel) sel.value = (m && m.offre_id) ? String(m.offre_id) : '';
  const canal = document.getElementById('rc2CandCanal');
  if (canal) canal.value = m ? (m.canal || '') : '';
  const dispo = document.getElementById('rc2CandDispo');
  if (dispo) dispo.value = m ? (m.dispo || '') : '';
  const seg = document.getElementById('rc2CandVivier');
  if (seg) seg.querySelectorAll('.v2-seg-o').forEach(b => b.classList.toggle('on', b.dataset.v === (m && m.vivier ? '1' : '0')));
  // Un compte non-RH ne pilote pas ces métadonnées (RLS + cohérence d'écran).
  const bloc = document.getElementById('rc2CandCanal');
  if (bloc && !rc2IsRH()) {
    ['rc2CandOffre', 'rc2CandCanal', 'rc2CandDispo'].forEach(x => { const e = document.getElementById(x); if (e) e.disabled = true; });
    if (seg) seg.querySelectorAll('button').forEach(b => b.disabled = true);
  }
}

async function rc2SaveMeta(candId) {
  if (!rc2IsRH() || RC2_MISS.has(RC2_T_META)) return;
  const sel = document.getElementById('rc2CandOffre');
  const canal = document.getElementById('rc2CandCanal');
  const dispo = document.getElementById('rc2CandDispo');
  const vivier = rc2SegVal('rc2CandVivier') === '1';
  const row = {
    candidat_id: candId,
    offre_id: sel && sel.value ? sel.value : null,
    canal: canal ? canal.value.trim() : '',
    dispo: dispo ? dispo.value.trim() : '',
    vivier
  };
  const existant = rc2MetaDe(candId);
  const saved = await rc2Upsert(RC2_T_META, row, existant ? existant.id : null);
  if (!saved) return;
  if (existant) Object.assign(existant, saved); else RC2_META.push(saved);
}

// ── Rendu global ─────────────────────────────────────────────────────────
function rc2Render() {
  // Contrôles réservés : bouton « Nouvelle offre » (RH) ; le bouton
  // « Nouveau candidat » garde la règle d'origine (rcIsCanEdit).
  const bo = document.getElementById('btnAddOffre');
  if (bo) bo.style.display = rc2IsRH() ? '' : 'none';
  const bc = document.getElementById('btnAddCandidat');
  if (bc) bc.style.display = rc2CanEdit() ? '' : 'none';

  const pf = document.getElementById('rc2OffreFilter');
  if (pf) pf.style.display = (rc2IsRH() && RC2_OFFRES.length) ? '' : 'none';
  const pt = document.getElementById('rc2PipeTitre');
  if (pt) {
    const of = RC2_OFFRES.find(o => String(o.id) === String(rc2FiltreOffre()));
    pt.textContent = of ? `Pipeline — ${of.titre}${of.contrat ? ' (' + of.contrat + ')' : ''}` : 'Pipeline des candidatures';
  }

  rc2RemplirOffreSelects();
  rc2RenderStats();
  rc2RenderBoard();
  rc2RenderOffres();
  rc2RenderEntretiens();
  rc2RenderKpis();
  rc2RenderOnboarding();
  rc2RenderScorecard();
  rc2RenderCanaux();
  rc2RenderVivier();
  rc2RenderDiffusion();
}

// ── Branchements ─────────────────────────────────────────────────────────
// L'ancien rendu délègue au module V2 : tous les appelants existants
// (saveCandidat, rcSetStatut, deleteCandidat, rcSaveCompte…) continuent de
// fonctionner sans modification.
window.renderRecrutement = function () { rc2Render(); };

// La fiche candidat gagne quatre champs (offre, canal, disponibilité, vivier)
// stockés dans recrutement_candidat_meta : on enveloppe l'ouverture et
// l'enregistrement d'origine sans réécrire leur logique.
const _rc2OpenCandidat = window.openCandidatModal;
window.openCandidatModal = function (id) {
  rc2RemplirOffreSelects();
  _rc2OpenCandidat(id);
  rc2RemplirMetaModal(id);
};

const _rc2SaveCandidat = window.saveCandidat;
window.saveCandidat = async function () {
  const avant = new Set(rc2Liste().map(c => String(c.id)));
  const editId = (typeof rcEditId !== 'undefined' && rcEditId) ? rcEditId : null;
  await _rc2SaveCandidat();
  let id = editId;
  if (!id) { const nouveau = rc2Liste().find(c => !avant.has(String(c.id))); id = nouveau ? nouveau.id : null; }
  if (id) { await rc2SaveMeta(id); rc2Render(); }
};

async function rc2Init() {
  if (!document.getElementById('rcBoard')) return;
  await rc2LoadExtras();
  rc2Render();
}
document.addEventListener('DOMContentLoaded', rc2Init);
if (typeof registerPageInit === 'function') registerPageInit('recrutement-v2', rc2Init);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && RC2_MD_MODE) rc2CloseModal(); });

// Un `const` de premier niveau ne crée PAS de propriété sur window : les
// constantes et fonctions lues par les onclick inline sont publiées ici.
window.RC2_SQL = RC2_SQL;
window.RC2_COLS = RC2_COLS;
window.RC2_ETAPES = RC2_ETAPES;
window.RC2_CRITERES = RC2_CRITERES;
window.rc2Render = rc2Render;
window.rc2Selectionner = rc2Selectionner;
window.rc2SegPick = rc2SegPick;
window.rc2OpenOffre = rc2OpenOffre;
window.rc2SaveOffre = rc2SaveOffre;
window.rc2SupprOffre = rc2SupprOffre;
window.rc2OpenScore = rc2OpenScore;
window.rc2SaveScore = rc2SaveScore;
window.rc2CloseModal = rc2CloseModal;
window.rc2ToggleOnb = rc2ToggleOnb;
window.rc2SetOnb = rc2SetOnb;
window.rc2CycleDiff = rc2CycleDiff;
window.rc2SetOffreDiff = rc2SetOffreDiff;
window.rc2IsRH = rc2IsRH;
