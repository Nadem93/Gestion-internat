// ── CONSEIL DE LA VIE SOCIALE — DESIGN V2 ─────────────────────────────
// Reproduit la maquette « CVS - refonte (bento) » :
//   5 tuiles statistiques, trombinoscope du conseil, tableau de bord deux
//   colonnes (satisfaction / thématiques · séances / résolutions), carte
//   « prochaine séance » avec ordre du jour, histogramme de participation,
//   boîte à idées des résidents et liste des comptes-rendus.
//
// Toutes les données proviennent de la couche existante :
//   · js/cvs-supabase.js       → membres, séances, résolutions, thématiques
//   · js/satisfaction-supabase.js → scores de satisfaction
//   · table public.cvs_idees   → boîte à idées (migration-cvs.sql)
// Les fonctions d'action de js/cvs.js (saveMembre, saveSeance, addResolution,
// saveThematique, printCR…) sont conservées telles quelles.
// Aucune valeur n'est inventée : sans donnée, le bloc affiche son état vide.

const CV2_SQL_FILE = 'migration-cvs.sql';

const CV2_IC = {
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  check:  '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  check2: '<polyline points="20 6 9 17 4 12"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  star:   '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  bulb:   '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  dl:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  up:     '<polyline points="18 15 12 9 6 15"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  list:   '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  print:  '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  pause:  '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  play:   '<polygon points="5 3 19 12 5 21 5 3"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  warn:   '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};

const CV2_MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

// Palette du trombinoscope (la maquette colore l'avatar d'après l'initiale)
const CV2_AV_COLORS = ['#22d3ee', '#0ea5e9', '#10b981', '#818cf8', '#a855f7', '#f59e0b', '#22c55e', '#ec4899'];

// Statuts de la boîte à idées
const CV2_IDEE_STATUTS = {
  nouvelle: { label: 'Nouvelle', color: '#22d3ee' },
  etude:    { label: 'À l’étude', color: '#f59e0b' },
  retenue:  { label: 'Retenue', color: '#10b981' },
  rejetee:  { label: 'Non retenue', color: '#8095b4' }
};

function _cv2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// SVG dimensionné (16px) pour les chips / icônes « Console Data » : les
// classes dc-chip / dc-kpi-ico ne fixent pas la taille du <svg>.
function _cv2SvgDc(d, px) {
  return `<svg viewBox="0 0 24 24" width="${px || 16}" height="${px || 16}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// Badge monospace « Console Data » teinté d'une couleur libre.
function _cv2Badge(label, c) {
  return `<span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${_cv2Esc(label)}</span>`;
}
function _cv2Esc(s) { return typeof escHtml === 'function' ? escHtml(s == null ? '' : s) : String(s == null ? '' : s); }
function _cv2Attr(s) { return typeof escAttr === 'function' ? escAttr(s == null ? '' : s) : _cv2Esc(s); }

// Couleur d'avatar déterministe (mêmes initiales → même couleur)
function _cv2AvColor(txt) {
  const s = String(txt || '?');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return CV2_AV_COLORS[h % CV2_AV_COLORS.length];
}
// Étiquette de collège abrégée pour la pastille du trombinoscope
// (« Familles / représentants légaux » → « Familles »). Le libellé complet
// reste dans l'attribut title, aucun libellé n'est inventé.
function _cv2CollegeCourt(label) {
  return String(label || '').split(' / ')[0].trim();
}
function _cv2Initiales(nom) {
  const parts = String(nom || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
// Découpe « JJ » / « MOIS » d'une date ISO
function _cv2Jour(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return { j: '—', m: '' };
  return { j: String(d.getDate()).padStart(2, '0'), m: CV2_MOIS[d.getMonth()] };
}
function _cv2AnneeCourte(iso) {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? '' : String(d.getFullYear()).slice(2);
}
// Nombre de participants listés dans le champ libre « Présents »
function _cv2NbPresents(txt) {
  if (!txt) return 0;
  return String(txt).split(/[\n;,]+/).map(x => x.trim()).filter(Boolean).length;
}
// Ordre du jour saisi en texte libre → points numérotés
function _cv2OdjPoints(txt) {
  if (!txt) return [];
  return String(txt)
    .split(/\r?\n|(?:\s[·•]\s)/)
    .map(x => x.replace(/^\s*(?:\d+[.)]|[-–—*])\s*/, '').trim())
    .filter(Boolean);
}
function _cv2Jours(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

// ══ BOÎTE À IDÉES — table public.cvs_idees (migration-cvs.sql) ════════
// Dégradation douce : tant que le script SQL n'a pas été exécuté, la lecture
// renvoie [] avec un console.warn et l'écriture est refusée par un toast.
let CV2_IDEES = [];
let CV2_IDEES_MISSING = false;

async function cv2LoadIdees() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) { CV2_IDEES_MISSING = true; CV2_IDEES = []; return; }
  try {
    const { data, error } = await supabaseClient
      .from('cvs_idees').select('*').order('votes', { ascending: false });
    if (error) throw error;
    CV2_IDEES_MISSING = false;
    CV2_IDEES = (data || []).map(r => ({
      id: r.id,
      texte: r.texte || '',
      auteur: r.auteur || '',
      votes: Number(r.votes) || 0,
      statut: CV2_IDEE_STATUTS[r.statut] ? r.statut : 'nouvelle',
      createdAt: r.created_at || ''
    }));
  } catch (e) {
    CV2_IDEES_MISSING = true;
    CV2_IDEES = [];
    console.warn(`[cvs-v2] table public.cvs_idees indisponible — exécutez ${CV2_SQL_FILE}`, (e && e.message) || e);
  }
}
function cv2IdeeRefus() {
  toast('Table « cvs_idees » absente : exécutez ' + CV2_SQL_FILE, 'error');
}

async function cv2SaveIdee() {
  if (CV2_IDEES_MISSING) { cv2IdeeRefus(); return; }
  const texte = (document.getElementById('ciTexte').value || '').trim();
  if (!texte) { toast('Le texte de la proposition est requis', 'error'); return; }
  const payload = {
    texte,
    auteur: (document.getElementById('ciAuteur').value || '').trim(),
    statut: document.getElementById('ciStatut').value || 'nouvelle'
  };
  try {
    const id = document.getElementById('ciId').value;
    if (id) {
      const { error } = await supabaseClient.from('cvs_idees')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast('Proposition mise à jour');
    } else {
      const etablissementId = typeof sbGetEtablissementId === 'function' ? await sbGetEtablissementId() : null;
      const { error } = await supabaseClient.from('cvs_idees')
        .insert({ ...payload, votes: 0, etablissement_id: etablissementId });
      if (error) throw error;
      toast('Proposition enregistrée ✓');
    }
    closeModal('modalCvsIdee');
    await cv2LoadIdees();
    cv2RenderIdees();
  } catch (e) {
    console.warn('[cvs-v2] écriture cvs_idees', e);
    cv2IdeeRefus();
  }
}

async function cv2VoteIdee(id) {
  if (CV2_IDEES_MISSING) { cv2IdeeRefus(); return; }
  const it = CV2_IDEES.find(x => String(x.id) === String(id));
  if (!it) return;
  try {
    const { error } = await supabaseClient.from('cvs_idees')
      .update({ votes: it.votes + 1, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    it.votes += 1;
    CV2_IDEES.sort((a, b) => b.votes - a.votes);
    cv2RenderIdees();
  } catch (e) {
    console.warn('[cvs-v2] vote cvs_idees', e);
    cv2IdeeRefus();
  }
}

function cv2DeleteIdee(id) {
  if (CV2_IDEES_MISSING) { cv2IdeeRefus(); return; }
  confirmDialog('Supprimer cette proposition ?', async () => {
    try {
      const { error } = await supabaseClient.from('cvs_idees').delete().eq('id', id);
      if (error) throw error;
      await cv2LoadIdees();
      cv2RenderIdees();
      toast('Proposition supprimée', 'info');
    } catch (e) {
      console.warn('[cvs-v2] suppression cvs_idees', e);
      cv2IdeeRefus();
    }
  });
}

function cv2OpenIdeeModal(id) {
  const it = id ? CV2_IDEES.find(x => String(x.id) === String(id)) : null;
  document.getElementById('ciId').value = it ? it.id : '';
  document.getElementById('ciTexte').value = it ? it.texte : '';
  document.getElementById('ciAuteur').value = it ? it.auteur : '';
  document.getElementById('ciStatut').value = it ? it.statut : 'nouvelle';
  document.getElementById('ciTitle').textContent = it ? 'Modifier la proposition' : 'Nouvelle proposition';
  const note = document.getElementById('ciNote');
  if (note) note.style.display = CV2_IDEES_MISSING ? '' : 'none';
  openModal('modalCvsIdee');
}

// ══ RENDU PRINCIPAL ══════════════════════════════════════════════════
function cv2Render() {
  cv2RenderStats();
  cv2RenderMembres();
  cv2RenderSatisfaction();
  cv2RenderThematiques();
  cv2RenderSeances();
  cv2RenderResolutions();
  cv2RenderProchaine();
  cv2RenderParticipation();
  cv2RenderIdees();
  cv2RenderDocs();
}

// Score global de satisfaction (identique au calcul de js/cvs.js)
function cv2SatGlobal() {
  const all = _cvsSatCache || [];
  if (!all.length) return null;
  let t = 0, c = 0;
  all.forEach(s => Object.values(s.reponses || {}).forEach(v => { if (v != null) { t += Number(v); c++; } }));
  return c ? Math.round(t / c * 25) : null;
}
// Couleur reprise de la maquette (paliers du thème sombre)
function cv2Col(pct) {
  if (pct === null || pct === undefined) return '#8095b4';
  return pct >= 85 ? '#22c55e' : pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
}

// ── 1. Statistiques ───────────────────────────────────────────────────
function cv2RenderStats() {
  const el = document.getElementById('cvsStats');
  if (!el) return;
  const membresActifs = cvsMembres().filter(m => m.statut !== 'ancien');
  const enCours = cvsAllResolutions().filter(r => r.statut !== 'fait');
  const ans = today().slice(0, 4);
  const seancesAnnee = cvsSeances().filter(s => (s.date || '').slice(0, 4) === ans);
  const thems = getCvs().thematiques || [];
  const themOuverts = thems.filter(t => t.statut === 'ouvert' || t.statut === 'en_cours').length;
  const sat = cv2SatGlobal();

  const tiles = [
    { c: '#22d3ee', ic: CV2_IC.users,  n: membresActifs.length, l: 'Membres' },
    { c: '#10b981', ic: CV2_IC.cal,    n: seancesAnnee.length,  l: 'Séances en ' + ans },
    { c: '#22c55e', ic: CV2_IC.check2, n: enCours.length,       l: 'Résolutions en cours' },
    { c: '#818cf8', ic: CV2_IC.target, n: themOuverts,          l: 'Thématiques ouvertes' },
    { c: '#fbbf24', ic: CV2_IC.star,   n: sat === null ? '—' : sat + '%', l: 'Satisfaction' }
  ];
  el.innerHTML = tiles.map(t => `<div class="dc-kpi" style="--dc-c:${t.c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${_cv2Esc(t.l)}</span><span class="dc-kpi-ico" style="color:${t.c}">${_cv2SvgDc(t.ic)}</span></div>
    <div class="dc-kpi-val">${t.n}</div>
  </div>`).join('');
}

// ── 2. Membres du conseil ─────────────────────────────────────────────
function cv2RenderMembres() {
  const el = document.getElementById('cvsMembresGallery');
  if (!el) return;
  const membres = cvsMembres().filter(m => m.statut !== 'ancien');
  const allRes = (typeof sbResidents === 'function' ? sbResidents() : []) || [];

  // Mandat : bornes réellement saisies sur les membres actifs
  const debuts = membres.map(m => m.mandatDebut).filter(Boolean).sort();
  const fins = membres.map(m => m.mandatFin).filter(Boolean).sort();
  let mandat = '';
  if (debuts.length || fins.length) {
    const a = debuts.length ? debuts[0].slice(0, 4) : '—';
    const b = fins.length ? fins[fins.length - 1].slice(0, 4) : 'en cours';
    mandat = `Mandat ${a}–${b}`;
  }

  const count = document.getElementById('cvsMembresCount');
  if (count) count.textContent = membres.length + ' membre' + (membres.length !== 1 ? 's' : '') + ' actif' + (membres.length !== 1 ? 's' : '');

  const metaTxt = mandat ? mandat : (membres.length ? membres.length + ' membre' + (membres.length > 1 ? 's' : '') : '');
  const head = `<div class="dc-head">
    <div class="dc-head-l">
      <span class="dc-chip" style="background:#22d3ee22;color:#22d3ee">${_cv2SvgDc(CV2_IC.users)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Conseil</div><div class="dc-title">Membres du conseil</div></div>
    </div>
    ${metaTxt ? `<span class="dc-pill dim">${_cv2Esc(metaTxt)}</span>` : ''}
  </div>`;

  if (!membres.length) {
    el.innerHTML = `<div class="dc-card">${head}
      <div class="dc-body"><div class="v2-blk-vide">Aucun membre enregistré. Composez le conseil : résidents, familles, personnel et direction.</div></div>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="dc-card">${head}
    <div class="dc-body"><div class="cv2-membres">${membres.map(m => {
      const col = CVS_COLLEGES[m.college] || CVS_COLLEGES.exterieur;
      let r = m.residentId ? allRes.find(x => String(x.id) === String(m.residentId)) : null;
      if (!r && m.college === 'residents' && m.nom) {
        const low = m.nom.trim().toLowerCase();
        r = allRes.find(x => {
          const a = ((x.nom || '') + ' ' + (x.prenom || '')).trim().toLowerCase();
          const b = ((x.prenom || '') + ' ' + (x.nom || '')).trim().toLowerCase();
          return a === low || b === low;
        });
      }
      const ini = _cv2Initiales(m.nom);
      const av = (m.college === 'residents' && r && r.photo)
        ? `<img src="${typeof sanitizeUrl === 'function' ? sanitizeUrl(r.photo) : ''}" alt="${_cv2Attr(m.nom || '')}"/>`
        : _cv2Esc(ini);
      const acts = cvsCanEdit ? `<div class="cv2-m-acts">
        <button type="button" class="cv2-act" style="--ac:#818cf8" title="Modifier" onclick="openMembreModal('${_cv2Attr(m.id)}')">${_cv2Svg(CV2_IC.pen, 2.2)}</button>
        <button type="button" class="cv2-act" style="--ac:#f59e0b" title="Marquer comme ancien membre" onclick="toggleMembreStatut('${_cv2Attr(m.id)}')">${_cv2Svg(CV2_IC.pause, 2.2)}</button>
        <button type="button" class="cv2-act" style="--ac:#ef4444" title="Supprimer" onclick="deleteMembre('${_cv2Attr(m.id)}')">${_cv2Svg(CV2_IC.trash, 2.2)}</button>
      </div>` : '';
      return `<div class="cv2-m" style="--cc:${col.color}">
        ${acts}
        <div class="cv2-m-av" style="--ac:${_cv2AvColor(ini + (m.nom || ''))}">${av}</div>
        <div class="cv2-m-txt">
          <div class="cv2-m-n" title="${_cv2Attr(m.nom || '')}">${_cv2Esc(m.nom || '')}</div>
          <div class="cv2-m-r">${_cv2Esc(CVS_ROLES[m.role] || m.role || '')}</div>
        </div>
        <span class="cv2-m-c" title="${_cv2Attr(col.label)}">${_cv2Esc(_cv2CollegeCourt(col.label))}</span>
      </div>`;
    }).join('')}</div></div>
  </div>`;
}

// ── 3. Satisfaction résidents ─────────────────────────────────────────
function cv2RenderSatisfaction() {
  const el = document.getElementById('cvsSatAnalysis');
  if (!el) return;
  const all = _cvsSatCache || [];
  if (!all.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucun questionnaire de satisfaction enregistré. <a href="satisfaction.html" style="color:var(--v2-indigo-light);font-weight:600">En saisir un →</a></div>`;
    return;
  }
  const global = cv2SatGlobal();
  const cats = CVS_SAT_CATS.map(cat => {
    let t = 0, c = 0;
    all.forEach(s => cat.qIds.forEach(q => { const v = s.reponses && s.reponses[q]; if (v != null) { t += Number(v); c++; } }));
    const pct = c ? Math.round(t / c * 25) : null;
    return { id: cat.id, label: cat.label, pct, col: cv2Col(pct) };
  }).filter(c => c.pct !== null);

  const liees = new Set((getCvs().thematiques || [])
    .filter(t => t.statut !== 'clos' && t.statut !== 'resolu')
    .flatMap(t => t.catIds || []));

  el.innerHTML = `
    <div class="cv2-sat-top">
      <div class="cv2-sat-n">${global === null ? '—' : global}<span>${global === null ? '' : '%'}</span></div>
      <div class="cv2-sat-side">
        <div class="cv2-sat-lbl">Note globale · ${all.length} questionnaire${all.length > 1 ? 's' : ''}</div>
        <div class="v2-prog" style="height:9px"><span style="width:${global === null ? 0 : global}%;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></span></div>
      </div>
    </div>
    <div class="cv2-sat-list">${cats.map(c => {
      const faible = c.pct < 62;
      const btn = (cvsCanEdit && faible && !liees.has(c.id))
        ? `<button type="button" class="cv2-sat-them" onclick="openThematiqueModal(null,'${_cv2Attr(c.id)}')">+ Thématique</button>`
        : (faible && liees.has(c.id) ? `<span class="cv2-sat-ok">✓ Suivi</span>` : '');
      return `<div>
        <div class="cv2-sat-h">
          <span class="l">${_cv2Esc(c.label)}</span>
          ${btn}
          <span class="p" style="color:${c.col}">${c.pct}%</span>
        </div>
        <div class="v2-prog v2-bar-sm" style="height:6px"><span style="width:${c.pct}%;background:${c.col}"></span></div>
      </div>`;
    }).join('')}</div>`;
}

// ── 4. Thématiques ────────────────────────────────────────────────────
const CV2_PRIO_C = { haute: '#ef4444', normale: '#818cf8', basse: '#10b981' };
const CV2_THEM_C = { ouvert: '#f59e0b', en_cours: '#22d3ee', resolu: '#10b981', clos: '#8095b4' };

function cv2RenderThematiques() {
  const el = document.getElementById('cvsThematiquesList');
  if (!el) return;
  const order = { ouvert: 0, en_cours: 1, resolu: 2, clos: 3 };
  const list = (getCvs().thematiques || []).slice()
    .sort((a, b) => (order[a.statut] || 0) - (order[b.statut] || 0));

  if (!list.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucune thématique. Créez-en pour structurer les sujets du conseil et suivre les scores de satisfaction associés.</div>`;
    return;
  }
  el.innerHTML = `<div class="cv2-them-list">${list.map(t => {
    const st = CVS_THEM_STATUTS[t.statut] || CVS_THEM_STATUTS.ouvert;
    const stc = CV2_THEM_C[t.statut] || '#818cf8';
    const cats = (t.catIds || []).map(cid => (CVS_SAT_CATS.find(c => c.id === cid) || {}).label).filter(Boolean);
    const score = _cvsThemSatScore(t.catIds || []);
    const seance = t.seanceId ? cvsSeances().find(s => s.id === t.seanceId) : null;
    const meta = [];
    if (cats.length) meta.push(cats.join(' · '));
    if (seance) meta.push('Séance du ' + formatDate(seance.date));
    if (t.description) meta.push(t.description);
    const acts = cvsCanEdit ? `<div class="cv2-acts">
      <select class="cv2-sel" title="Statut de la thématique" style="color:${stc};border-color:color-mix(in srgb, ${stc} 34%, transparent);background-color:color-mix(in srgb, ${stc} 9%, transparent)" onchange="setThematiqueStatut('${_cv2Attr(t.id)}',this.value)">
        ${Object.entries(CVS_THEM_STATUTS).map(([k, v]) => `<option value="${k}"${t.statut === k ? ' selected' : ''}>${_cv2Esc(v.label)}</option>`).join('')}
      </select>
      <button type="button" class="cv2-act" style="--ac:#818cf8" title="Modifier" onclick="openThematiqueModal('${_cv2Attr(t.id)}')">${_cv2Svg(CV2_IC.pen, 2.2)}</button>
      <button type="button" class="cv2-act" style="--ac:#ef4444" title="Supprimer" onclick="deleteThematique('${_cv2Attr(t.id)}')">${_cv2Svg(CV2_IC.trash, 2.2)}</button>
    </div>` : '';
    return `<div class="cv2-them" style="--prio:${CV2_PRIO_C[t.priorite] || CV2_PRIO_C.normale}">
      <div class="cv2-them-b">
        <div class="cv2-them-t">${_cv2Esc(t.titre || '')}</div>
        ${meta.length ? `<div class="cv2-them-c">${_cv2Esc(meta.join(' — '))}</div>` : ''}
      </div>
      ${score !== null ? `<span class="cv2-them-s" style="color:${cv2Col(score)}">${score}%</span>` : ''}
      ${cvsCanEdit ? '' : _cv2Badge(st.label, stc)}
      ${acts}
    </div>`;
  }).join('')}</div>`;
}

// ── 5. Séances & comptes-rendus ───────────────────────────────────────
function cv2RenderSeances() {
  const el = document.getElementById('cvsSeancesList');
  if (!el) return;
  const list = cvsSeances();
  if (!list.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucune séance enregistrée. Consignez les séances du conseil et leurs comptes-rendus.</div>`;
    return;
  }
  const td = today();
  el.innerHTML = list.map(s => {
    const p = _cv2Jour(s.date);
    const futur = (s.date || '') >= td;
    const cr = !!(s.compteRendu && s.compteRendu.trim());
    const st = futur ? { l: 'À venir', c: '#818cf8' }
      : cr ? { l: 'CR rédigé', c: '#10b981' }
        : { l: 'CR à rédiger', c: '#f59e0b' };
    const sub = [];
    const nb = _cv2NbPresents(s.presents);
    if (nb) sub.push(nb + ' présent' + (nb > 1 ? 's' : ''));
    if (s.heure) sub.push(s.heure.slice(0, 5));
    if (s.lieu) sub.push(s.lieu);
    const res = (s.resolutions || []).length;
    if (res) sub.push(res + ' résolution' + (res > 1 ? 's' : ''));
    if (!sub.length) sub.push(futur ? 'Ordre du jour en préparation' : 'Aucun détail saisi');
    return `<div class="cv2-seance">
      <div class="cv2-date" style="--pc:${st.c}"><span class="cv2-date-j">${p.j}</span><span class="cv2-date-m">${p.m}</span></div>
      <div class="cv2-seance-b">
        <div class="cv2-seance-t">Séance du ${_cv2Esc(formatDate(s.date))}</div>
        <div class="cv2-seance-s">${_cv2Esc(sub.join(' · '))}</div>
      </div>
      ${_cv2Badge(st.l, st.c)}
      <div class="cv2-acts">
        <button type="button" class="cv2-act" style="--ac:#22d3ee" title="Résolutions de la séance" onclick="openResolutionsModal('${_cv2Attr(s.id)}')">${_cv2Svg(CV2_IC.list, 2.2)}</button>
        <button type="button" class="cv2-act" style="--ac:#a5b4fc" title="Imprimer le compte-rendu" onclick="printCR('${_cv2Attr(s.id)}')">${_cv2Svg(CV2_IC.print, 2.2)}</button>
        ${cvsCanEdit ? `<button type="button" class="cv2-act" style="--ac:#818cf8" title="Modifier" onclick="openSeanceModal('${_cv2Attr(s.id)}')">${_cv2Svg(CV2_IC.pen, 2.2)}</button>
        <button type="button" class="cv2-act" style="--ac:#ef4444" title="Supprimer" onclick="deleteSeance('${_cv2Attr(s.id)}')">${_cv2Svg(CV2_IC.trash, 2.2)}</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── 6. Résolutions en cours ───────────────────────────────────────────
function cv2RenderResolutions() {
  const el = document.getElementById('cvsResolutionsList');
  const btn = document.getElementById('cvsResAllBtn');
  if (!el) return;
  const td = today();
  const all = cvsAllResolutions();
  const actives = all.filter(r => r.statut !== 'fait');
  const shown = (typeof _cvsShowAllRes !== 'undefined' && _cvsShowAllRes) ? all : actives;

  if (btn) {
    const done = all.filter(r => r.statut === 'fait').length;
    btn.style.display = done ? '' : 'none';
    btn.textContent = (typeof _cvsShowAllRes !== 'undefined' && _cvsShowAllRes)
      ? '← Actives seulement' : `Voir tout (${done} réalisée${done > 1 ? 's' : ''})`;
  }

  if (!all.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucune résolution. Elles se saisissent depuis la fiche d'une séance.</div>`;
    return;
  }
  if (!shown.length) {
    el.innerHTML = `<div class="v2-blk-vide" style="color:var(--v2-ok-light);font-weight:600">Toutes les résolutions sont réalisées.</div>`;
    return;
  }
  el.innerHTML = `<div class="cv2-res-list">${shown.map(r => {
    const st = CVS_RESOLUTION_STATUTS[r.statut] || CVS_RESOLUTION_STATUTS.a_faire;
    const retard = r.statut !== 'fait' && r.echeance && r.echeance < td;
    const c = r.statut === 'fait' ? '#22c55e' : retard ? '#ef4444' : r.statut === 'en_cours' ? '#22d3ee' : '#f59e0b';
    const resp = [];
    if (r.responsable) resp.push(r.responsable);
    resp.push('Séance du ' + formatDate(r.seanceDate));
    const ech = r.statut === 'fait' ? 'Réalisé'
      : r.echeance ? (retard ? 'En retard · ' : 'Éch. ') + formatDate(r.echeance)
        : st.label;
    return `<div class="cv2-res">
      <div class="cv2-res-h">
        <span class="cv2-res-ico" style="--pc:${c}">${_cv2Svg(CV2_IC.check2, 2.5)}</span>
        <div class="cv2-res-t">${_cv2Esc(r.texte || '')}</div>
      </div>
      <div class="cv2-res-f">
        <span class="cv2-res-r">${_cv2Esc(resp.join(' · '))}</span>
        <span class="cv2-res-d" style="--pc:${c}">${_cv2Esc(ech)}</span>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ── 7. Prochaine séance ───────────────────────────────────────────────
function cv2RenderProchaine() {
  const el = document.getElementById('cvsProchaine');
  if (!el) return;
  const s = cvsProchaineSeance();
  const nextHead = (right) => `<div class="dc-head">
      <div class="dc-head-l">
        <span class="dc-chip" style="background:#a5b4fc22;color:#a5b4fc">${_cv2SvgDc(CV2_IC.cal)}</span>
        <div style="min-width:0"><div class="dc-eyebrow">À venir</div><div class="dc-title">Prochaine séance</div></div>
      </div>
      ${right || ''}
    </div>`;

  if (!s) {
    el.innerHTML = `<div class="dc-card">
      ${nextHead('')}
      <div class="dc-body"><div class="v2-blk-vide">Aucune séance programmée.${cvsCanEdit ? ' Utilisez « Nouvelle séance » pour en planifier une.' : ''}</div></div>
    </div>`;
    return;
  }
  const p = _cv2Jour(s.date);
  const j = _cv2Jours(s.date);
  const meta = [];
  if (s.heure) meta.push(s.heure.slice(0, 5));
  if (s.lieu) meta.push(s.lieu);
  const points = _cv2OdjPoints(s.ordreDuJour);
  const countdown = j === null ? '' : (j === 0 ? "aujourd'hui" : j === 1 ? 'demain' : `dans ${j} jours`);

  el.innerHTML = `<div class="dc-card">
    ${nextHead(countdown ? `<span class="dc-pill dim">${_cv2Esc(countdown)}</span>` : '')}
    <div class="dc-body"><div class="cv2-next">
      <div class="cv2-next-h">
        <div class="cv2-next-d"><span class="cv2-next-j">${p.j}</span><span class="cv2-next-m">${p.m}</span></div>
        <div style="min-width:0">
          <div class="cv2-next-t">Séance du ${_cv2Esc(formatDate(s.date))}</div>
          <div class="cv2-next-s">${_cv2Esc(meta.join(' · '))}</div>
        </div>
      </div>
      <div class="v2-blk-sub">Ordre du jour prévisionnel</div>
      ${points.length
        ? `<div class="cv2-odj">${points.map((t, i) => `<div class="cv2-odj-i"><span class="cv2-odj-n">${i + 1}</span><span class="cv2-odj-t">${_cv2Esc(t)}</span></div>`).join('')}</div>`
        : `<div class="v2-blk-vide">Ordre du jour non renseigné.${cvsCanEdit ? ` <button type="button" class="cv2-add" style="margin:0;color:var(--v2-indigo-light)" onclick="openSeanceModal('${_cv2Attr(s.id)}')">Le saisir →</button>` : ''}</div>`}
    </div></div>
  </div>`;
}

// ── 8. Participation aux séances ──────────────────────────────────────
// Taux = nombre de présents listés dans le compte-rendu / membres actifs.
// Une séance sans liste de présents n'entre pas dans le graphique.
function cv2RenderParticipation() {
  const el = document.getElementById('cvsParticipation');
  if (!el) return;
  const membres = cvsMembres().filter(m => m.statut !== 'ancien').length;
  const td = today();
  const data = cvsSeances()
    .filter(s => (s.date || '') <= td && _cv2NbPresents(s.presents) > 0)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(-6)
    .map(s => {
      const n = _cv2NbPresents(s.presents);
      const p = _cv2Jour(s.date);
      return {
        n,
        rate: membres ? Math.min(100, Math.round(n / membres * 100)) : null,
        label: p.m.toLowerCase() + ' ' + _cv2AnneeCourte(s.date)
      };
    });

  if (!data.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucune séance passée avec liste des présents. Renseignez le champ « Présents » d'un compte-rendu pour alimenter ce suivi.</div>`;
    return;
  }
  const max = Math.max(...data.map(d => d.rate === null ? d.n : d.rate), 1);
  el.innerHTML = `<div class="cv2-chart">${data.map(d => {
    const v = d.rate === null ? d.n : d.rate;
    const c = d.rate === null ? '#818cf8' : cv2Col(d.rate);
    return `<div class="cv2-chart-c">
      <span class="cv2-chart-v">${d.rate === null ? d.n : d.rate + '%'}</span>
      <div class="cv2-chart-b" style="--pc:${c};height:${Math.max(4, Math.round(v / max * 100))}%"></div>
      <span class="cv2-chart-l">${_cv2Esc(d.label)}</span>
    </div>`;
  }).join('')}</div>
  ${membres ? '' : '<div class="v2-blk-vide" style="margin-top:10px">Aucun membre actif : le graphique affiche le nombre de présents, pas un taux.</div>'}`;
}

// ── 9. Boîte à idées des résidents ────────────────────────────────────
function cv2RenderIdees() {
  const el = document.getElementById('cvsIdeesList');
  if (!el) return;
  const count = document.getElementById('cvsIdeesCount');
  if (count) count.textContent = CV2_IDEES.length
    ? CV2_IDEES.length + ' proposition' + (CV2_IDEES.length > 1 ? 's' : '') : '';

  if (CV2_IDEES_MISSING) {
    el.innerHTML = `<div class="v2-note v2-note-warn">${_cv2Svg(CV2_IC.warn)}<span>Boîte à idées indisponible : exécutez <b>${CV2_SQL_FILE}</b> dans l'éditeur SQL Supabase.</span></div>`;
    return;
  }
  if (!CV2_IDEES.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucune proposition déposée. Recueillez les idées des résidents et des familles entre deux séances.</div>`;
    return;
  }
  el.innerHTML = `<div class="cv2-idee-list">${CV2_IDEES.map(i => {
    const st = CV2_IDEE_STATUTS[i.statut] || CV2_IDEE_STATUTS.nouvelle;
    return `<div class="cv2-idee">
      <button type="button" class="cv2-vote" title="Soutenir cette proposition" onclick="cv2VoteIdee('${_cv2Attr(i.id)}')">
        ${_cv2Svg(CV2_IC.up, 2.4)}<span class="cv2-vote-n">${i.votes}</span>
      </button>
      <div class="cv2-idee-b">
        <div class="cv2-idee-t">${_cv2Esc(i.texte)}</div>
        ${i.auteur ? `<div class="cv2-idee-a">Proposé par ${_cv2Esc(i.auteur)}</div>` : ''}
      </div>
      ${_cv2Badge(st.label, st.color)}
      ${cvsCanEdit ? `<div class="cv2-acts">
        <button type="button" class="cv2-act" style="--ac:#818cf8" title="Modifier" onclick="cv2OpenIdeeModal('${_cv2Attr(i.id)}')">${_cv2Svg(CV2_IC.pen, 2.2)}</button>
        <button type="button" class="cv2-act" style="--ac:#ef4444" title="Supprimer" onclick="cv2DeleteIdee('${_cv2Attr(i.id)}')">${_cv2Svg(CV2_IC.trash, 2.2)}</button>
      </div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

// ── 10. Comptes-rendus ────────────────────────────────────────────────
function cv2RenderDocs() {
  const el = document.getElementById('cvsDocsList');
  if (!el) return;
  const list = cvsSeances().filter(s => s.compteRendu && s.compteRendu.trim());
  if (!list.length) {
    el.innerHTML = `<div class="v2-blk-vide">Aucun compte-rendu rédigé. Le compte-rendu se saisit dans la fiche de la séance, puis s'imprime en PDF.</div>`;
    return;
  }
  el.innerHTML = list.map(s => {
    const meta = [];
    const nb = _cv2NbPresents(s.presents);
    if (nb) meta.push(nb + ' présent' + (nb > 1 ? 's' : ''));
    const res = (s.resolutions || []).length;
    if (res) meta.push(res + ' résolution' + (res > 1 ? 's' : ''));
    if (s.lieu) meta.push(s.lieu);
    return `<button type="button" class="cv2-doc" title="Ouvrir le compte-rendu imprimable" onclick="printCR('${_cv2Attr(s.id)}')">
      <span class="cv2-doc-ico">${_cv2Svg(CV2_IC.file)}</span>
      <span class="cv2-doc-b">
        <span class="cv2-doc-n">CR — Séance du ${_cv2Esc(formatDate(s.date))}</span>
        <span class="cv2-doc-m">${_cv2Esc(meta.join(' · ') || 'Compte-rendu rédigé')}</span>
      </span>
      ${_cv2Svg(CV2_IC.dl).replace('<svg ', '<svg class="cv2-doc-dl" ')}
    </button>`;
  }).join('');
}

// ── Modale « Résolutions » d'une séance, au gabarit V2 ────────────────
function cv2RenderResolutionsList(s) {
  const box = document.getElementById('rmList');
  if (!box || !s) return;
  const list = s.resolutions || [];
  if (!list.length) {
    box.innerHTML = `<div class="v2-blk-vide">Aucune résolution pour cette séance.</div>`;
    return;
  }
  box.innerHTML = `<div class="cv2-md-list">${list.map(r => {
    const st = CVS_RESOLUTION_STATUTS[r.statut] || CVS_RESOLUTION_STATUTS.a_faire;
    const c = r.statut === 'fait' ? '#22c55e' : r.statut === 'en_cours' ? '#22d3ee' : '#f59e0b';
    const meta = [];
    if (r.responsable) meta.push(r.responsable);
    if (r.echeance) meta.push('Éch. ' + formatDate(r.echeance));
    return `<div class="cv2-md-res">
      <div class="cv2-md-res-t">${_cv2Esc(r.texte || '')}</div>
      <div class="cv2-md-res-f">
        <span class="cv2-md-res-m">${_cv2Esc(meta.join(' · '))}</span>
        <span class="cv2-md-res-a">
          ${cvsCanEdit
            ? `<select class="cv2-sel" onchange="setResolutionStatut('${_cv2Attr(s.id)}','${_cv2Attr(r.id)}',this.value)">
                 ${Object.entries(CVS_RESOLUTION_STATUTS).map(([k, v]) => `<option value="${k}"${r.statut === k ? ' selected' : ''}>${_cv2Esc(v.label)}</option>`).join('')}
               </select>
               <button type="button" class="cv2-act" style="--ac:#ef4444" title="Supprimer" onclick="deleteResolution('${_cv2Attr(s.id)}','${_cv2Attr(r.id)}')">${_cv2Svg(CV2_IC.trash, 2.2)}</button>`
            : _cv2Badge(st.label, c)}
        </span>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ── Les anciennes fonctions de rendu délèguent au module V2 ───────────
// (renderCvs est appelée par saveMembre/saveSeance/saveThematique/…)
window.renderCvs = cv2Render;
window.renderCvsMembresGallery = cv2RenderMembres;
window.renderCvsMembres = function () {};          // la vue « liste » n'existe plus en V2
window.renderCvsSeances = cv2RenderSeances;
window.renderCvsResolutionsDash = cv2RenderResolutions;
window.renderCvsResolutions = cv2RenderResolutions;
window.renderCvsSatAnalysis = cv2RenderSatisfaction;
window.renderCvsThematiques = cv2RenderThematiques;
window.renderResolutionsList = cv2RenderResolutionsList;

// ── Init : charger la boîte à idées après l'init de js/cvs.js ─────────
document.addEventListener('DOMContentLoaded', () => {
  // initCvs() (js/cvs.js) est asynchrone : on charge les idées en parallèle
  // et on redessine le bloc dès qu'elles sont disponibles.
  cv2LoadIdees().then(() => cv2RenderIdees());
});
