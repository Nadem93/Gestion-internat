// ── FICHE DE LIAISON HOSPITALIÈRE — DESIGN V2 ──
// Reproduit la maquette « Fiche de liaison hosp (dossiers) » : puces de
// sélection du résident, carte à en-tête teinté et grille de sections
// (identité, contacts d'urgence, allergies & risques, traitements,
// autonomie, à savoir).
//
// Les données viennent de js/fiche-liaison.js (cache résidents, plan de
// soins, évaluations) : ce module fait le rendu, plus la petite couche
// Supabase du complément de fiche (table fiches_liaison), qui n'existait pas.

const FL_SQL_FILE = 'migration-fiche-liaison.sql';

// ── Pictogrammes (repris de la maquette) ─────────────────────────────
const FL2_IC = {
  id:    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h4M15 12h4M7 16h10"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  pill:  '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/>',
  wheel: '<circle cx="17" cy="18" r="3"/><path d="M11 18H5.5a3.5 3.5 0 1 1 3-5"/><circle cx="8" cy="6" r="2"/>',
  info:  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  care:  '<path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="10"/>',
  grid:  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
};
function _fl2Svg(d) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// Régimes alimentaires : mêmes clés que js/repas.js (non chargé ici).
const FL2_REGIMES = {
  normal: 'Normal', vegetarien: 'Végétarien', sansporc: 'Sans porc', halal: 'Halal',
  casher: 'Casher', diabetique: 'Diabétique', hyposode: 'Hyposodé',
  hypocalorique: 'Hypocalorique', autre: 'Autre'
};
const FL2_TEXTURES = { normale: 'Normale', hachee: 'Hachée', mixee: 'Mixée' };
const FL2_MOMENTS = { matin: 'Matin', midi: 'Midi', soir: 'Soir', coucher: 'Coucher' };
const FL2_PROTECTION = {
  tutelle: 'Tutelle', curatelle: 'Curatelle', curatelle_renforcee: 'Curatelle renforcée',
  sauvegarde: 'Sauvegarde de justice', habilitation: 'Habilitation familiale',
  masp: 'MASP', autre: 'Autre'
};
const FL2_CHUTE = { faible: 'Risque faible', modere: 'Risque modéré', eleve: 'Risque élevé' };
const FL2_AUT = { autonome: 'Autonome', aide_partielle: 'Aide partielle', aide_totale: 'Aide totale' };
const FL2_COM = { bonne: 'Bonne', partielle: 'Partielle', difficile: 'Difficile', non_verbale: 'Non verbale' };

// ── Petits utilitaires ───────────────────────────────────────────────
function _fl2Ini(r) {
  const a = ((r.prenom || '').trim()[0] || '');
  const b = ((r.nom || '').trim()[0] || '');
  return (a + b).toUpperCase() || '?';
}
function _fl2Color(r) { return safeColor(r.color, '#22d3ee'); }
function _fl2Nom(r) { return `${r.prenom || ''} ${r.nom || ''}`.trim() || 'Sans nom'; }
function _fl2DateFr(d) {
  if (!d) return '';
  const dt = new Date(String(d).length <= 10 ? d + 'T12:00' : d);
  return isNaN(dt) ? '' : dt.toLocaleDateString('fr-FR');
}
function _fl2Age(dob) {
  if (!dob) return null;
  const dt = new Date(String(dob).length <= 10 ? dob + 'T12:00' : dob);
  if (isNaN(dt)) return null;
  return Math.floor((Date.now() - dt.getTime()) / 31557600000);
}
function _fl2Today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════
// COUCHE SUPABASE — COMPLÉMENT DE FICHE (table fiches_liaison)
//
// Dégradation douce : tant que migration-fiche-liaison.sql n'a pas été
// exécuté, la lecture renvoie {} avec un console.warn et la page reste
// pleinement utilisable ; l'écriture remonte l'erreur et l'appelant affiche
// un toast qui nomme le fichier SQL.
// ══════════════════════════════════════════════════════════════════════

let _fl2Comps = {};          // residentId → complément
let _fl2CompsOk = false;     // la table répond-elle ?

async function _fl2Uid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.error('[fiche-liaison] uid', e); return null; }
}

function fl2ErrMsg(e) {
  const m = ((e && (e.message || e.msg)) || '') + ' ' + ((e && e.code) || '');
  if (/non connect|jwt|not authenticated/i.test(m)) return 'Session Supabase expirée — reconnectez-vous.';
  if (/does not exist|schema cache|42P01|PGRST205/i.test(m)) {
    return 'Table absente : exécutez ' + FL_SQL_FILE + ' dans Supabase.';
  }
  return 'Erreur d\'enregistrement (' + FL_SQL_FILE + ' bien exécuté ?)';
}

function _fl2FromRow(r) {
  return {
    id: r.id,
    residentId: r.resident_id || '',
    risqueChute: r.risque_chute || '',
    deplacement: r.aut_deplacement || '',
    toilette: r.aut_toilette || '',
    repas: r.aut_repas || '',
    communication: r.aut_communication || '',
    langue: r.langue || '',
    consignes: r.consignes || '',
    updatedAt: r.updated_at
  };
}

async function fl2LoadComplements() {
  try {
    const { data, error } = await supabaseClient.from('fiches_liaison').select('*');
    if (error) throw error;
    _fl2Comps = {};
    (data || []).forEach(row => { const c = _fl2FromRow(row); _fl2Comps[c.residentId] = c; });
    _fl2CompsOk = true;
  } catch (e) {
    _fl2Comps = {};
    _fl2CompsOk = false;
    console.warn('[fiche-liaison] compléments illisibles (' + FL_SQL_FILE + ' exécuté ?)', e);
  }
  return _fl2Comps;
}

function fl2Comp(residentId) { return _fl2Comps[residentId] || {}; }

async function fl2SaveComplement(c) {
  const [etablissementId, uid] = await Promise.all([sbGetEtablissementId(), _fl2Uid()]);
  const row = {
    etablissement_id: etablissementId,
    resident_id: String(c.residentId || ''),
    risque_chute: c.risqueChute || '',
    aut_deplacement: c.deplacement || '',
    aut_toilette: c.toilette || '',
    aut_repas: c.repas || '',
    aut_communication: c.communication || '',
    langue: c.langue || '',
    consignes: c.consignes || '',
    updated_by: uid,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabaseClient
    .from('fiches_liaison').upsert(row, { onConflict: 'resident_id' }).select();
  if (error) throw error;
  const saved = _fl2FromRow((data || [])[0] || row);
  _fl2Comps[saved.residentId] = saved;
  _fl2CompsOk = true;
  return saved;
}

// ══════════════════════════════════════════════════════════════════════
// SÉLECTEUR DE RÉSIDENT (puces de la maquette)
// Le <select id="flResident"> reste la source de vérité : les puces le
// pilotent, pour ne pas casser le contrat avec js/fiche-liaison.js.
// ══════════════════════════════════════════════════════════════════════

function fl2RenderChips() {
  const box = document.getElementById('flChips');
  if (!box) return;
  const residents = (typeof sbResidents === 'function' ? sbResidents() : [])
    .filter(r => r.statut !== 'sorti')
    .sort((a, b) => _fl2Nom(a).localeCompare(_fl2Nom(b), 'fr'));
  const sel = (document.getElementById('flResident') || {}).value || '';
  if (!residents.length) {
    box.innerHTML = '<span class="v2-blk-vide">Aucun résident actif.</span>';
    return;
  }
  box.innerHTML = residents.map(r => {
    const c = _fl2Color(r);
    return `<button type="button" class="fl2-rchip${r.id === sel ? ' on' : ''}"
      style="${r.id === sel ? 'border-color:' + c + '66' : ''}"
      aria-pressed="${r.id === sel}" onclick="fl2SelectResident('${escAttr(String(r.id))}')">
      <span class="fl2-rchip-av" style="background:${c}">${escHtml(_fl2Ini(r))}</span>${escHtml(_fl2Nom(r))}
    </button>`;
  }).join('');
}

function fl2SelectResident(id) {
  const el = document.getElementById('flResident');
  if (!el) return;
  el.value = id;
  el.dispatchEvent(new Event('change'));
  fl2RenderChips();
}

// ══════════════════════════════════════════════════════════════════════
// RENDU DE LA FICHE
// ══════════════════════════════════════════════════════════════════════

// Une ligne = une donnée { k: libellé, v: valeur, cls: mise en avant }.
// On garde la structure (et non du HTML) : le rendu écran et le document
// d'impression en thème clair partagent ainsi exactement les mêmes données.
function _fl2Row(k, v, cls) {
  return { k: k, v: (v === null || v === undefined) ? '' : String(v), cls: cls || '' };
}

function _fl2RowHtml(row) {
  const vide = row.v === '';
  return `<div class="fl2-row"><span class="fl2-k">${escHtml(row.k)}</span>
    <span class="fl2-v ${vide ? 'mute' : row.cls}">${vide ? '—' : escHtml(row.v)}</span></div>`;
}

function _fl2Section(s) {
  return `<div class="fl2-sec" style="--sc:${s.c}">
    <div class="fl2-sec-h">
      <span class="fl2-sec-ico">${_fl2Svg(s.icon)}</span>
      <span class="fl2-sec-t">${escHtml(s.title)}</span>
    </div>
    <div class="fl2-rows">${s.rows.map(_fl2RowHtml).join('')}</div>
  </div>`;
}

// Régime alimentaire lisible, à partir de l'objet r.regime réellement saisi.
function _fl2Regime(r) {
  const rg = r.regime || {};
  const parts = [];
  if (rg.type && rg.type !== 'normal') {
    parts.push(rg.type === 'autre' && rg.autreLabel ? rg.autreLabel : (FL2_REGIMES[rg.type] || rg.type));
  } else if (rg.type === 'normal') parts.push('Normal');
  if (rg.texture && rg.texture !== 'normale') parts.push('texture ' + (FL2_TEXTURES[rg.texture] || rg.texture).toLowerCase());
  if (rg.allergiesAlim) parts.push('allergies : ' + rg.allergiesAlim);
  return parts.join(' · ');
}

// Traitements actifs, regroupés par moment de prise (maquette : Matin/Midi/Soir).
function _fl2Traitements(meds) {
  const t0 = _fl2Today();
  const actifs = (meds || []).filter(t => (!t.debut || t.debut <= t0) && (!t.fin || t.fin >= t0));
  const par = { matin: [], midi: [], soir: [], coucher: [] };
  const siBesoin = [];
  actifs.forEach(t => {
    const lib = (t.nom || '—') + (t.posologie ? ' (' + t.posologie + ')' : '');
    const mom = (t.moments || []).filter(m => par[m]);
    if (!mom.length) siBesoin.push(lib);
    else mom.forEach(m => par[m].push(lib));
  });
  const rows = Object.keys(FL2_MOMENTS)
    .filter(m => m !== 'coucher' || par.coucher.length)
    .map(m => _fl2Row(FL2_MOMENTS[m], par[m].join(', ')));
  if (siBesoin.length) rows.push(_fl2Row('Si besoin', siBesoin.join(', ')));
  return rows;
}

// Dernière évaluation d'autonomie (MIF / Barthel / SERAFIN-PH).
function _fl2EvalRows(lastEval) {
  if (!lastEval || typeof EV_GRILLES === 'undefined' || !EV_GRILLES[lastEval.grille]) {
    return [_fl2Row('Dernière grille', '')];
  }
  const g = EV_GRILLES[lastEval.grille];
  let score = 0;
  if (lastEval.grille === 'mif') g.dimensions.forEach(d => d.items.forEach(it => { score += Number((lastEval.scores || {})[it.id] || 0); }));
  else g.dimensions[0].items.forEach(it => { score += Number((lastEval.scores || {})[it.id] || 0); });
  const niv = (g.niveaux || []).find(n => score >= n.min && score <= n.max);
  return [
    _fl2Row(g.short, `${score}/${g.scoreMax}${niv ? ' — ' + niv.label : ''}`),
    _fl2Row('Évaluée le', _fl2DateFr(lastEval.date)),
    _fl2Row('Note clinique', lastEval.note || '')
  ];
}

// Sections de la fiche — l'ordre et les couleurs sont ceux de la maquette.
// Les deux dernières (plan de soins, évaluation) prolongent la grille avec
// les données du dossier que la maquette ne montrait pas.
function fl2Sections(d) {
  const r = d.r;
  const c = fl2Comp(r.id);
  const med = [r.medecin, r.medecinTel].filter(Boolean).join(' · ');
  const tut = [r.protectionNom, r.protectionTel].filter(Boolean).join(' · ');
  const soins = d.soins || [];

  return [
    { title: 'Identité', c: '#818cf8', icon: FL2_IC.id, rows: [
      _fl2Row('N° Sécu', r.nss),
      _fl2Row('INS', r.ins),
      _fl2Row('Mesure', r.protection ? (FL2_PROTECTION[r.protection] || r.protection) : ''),
      _fl2Row('Entré(e) le', _fl2DateFr(r.entree))
    ] },
    { title: 'Contacts d’urgence', c: '#22d3ee', icon: FL2_IC.phone, rows: [
      _fl2Row('Famille', r.contacts),
      _fl2Row('Médecin', med),
      _fl2Row('Tuteur / curateur', tut)
    ] },
    { title: 'Allergies & risques', c: '#ef4444', icon: FL2_IC.alert, rows: [
      _fl2Row('Allergies', r.allergies, 'danger'),
      _fl2Row('Régime', _fl2Regime(r)),
      _fl2Row('Chutes', FL2_CHUTE[c.risqueChute] || '')
    ] },
    { title: 'Traitements en cours', c: '#ec4899', icon: FL2_IC.pill, rows: _fl2Traitements(d.meds) },
    { title: 'Autonomie', c: '#f59e0b', icon: FL2_IC.wheel, rows: [
      _fl2Row('Déplacement', FL2_AUT[c.deplacement] || ''),
      _fl2Row('Toilette', FL2_AUT[c.toilette] || ''),
      _fl2Row('Repas', FL2_AUT[c.repas] || ''),
      _fl2Row('Communication', FL2_COM[c.communication] || '')
    ] },
    { title: 'À savoir', c: '#10b981', icon: FL2_IC.info, rows: [
      _fl2Row('Langue', c.langue),
      _fl2Row('Consignes', c.consignes),
      _fl2Row('Référent', r.referent)
    ] },
    { title: 'Plan de soins actif', c: '#38bdf8', icon: FL2_IC.care, rows:
      soins.length
        ? soins.slice(0, 6).map(s => _fl2Row(s.freq || 'Soin', s.libelle))
        : [_fl2Row('Soins', '')] },
    { title: 'Niveau d’autonomie évalué', c: '#a78bfa', icon: FL2_IC.grid, rows: _fl2EvalRows(d.lastEval) }
  ];
}

// Rendu principal — remplace renderFicheLiaison() de js/fiche-liaison.js.
function fl2Render() {
  const box = document.getElementById('flContent');
  if (!box) return;
  const d = (typeof _flData === 'object' && _flData) || {};
  const r = d.r;

  if (!r) {
    box.innerHTML = `<div class="v2-blk">
      <div class="v2-blk-t">Fiche de liaison</div>
      <div class="v2-blk-vide">Choisissez un résident ci-dessus : la fiche est générée depuis son dossier.</div>
    </div>`;
    return;
  }

  const c = _fl2Color(r);
  const age = _fl2Age(r.dob);
  const meta = [
    age !== null ? age + ' ans' : '',
    r.dob ? 'né(e) le ' + _fl2DateFr(r.dob) : '',
    r.chambre ? 'Ch. ' + r.chambre : ''
  ].filter(Boolean).join(' · ');
  const sang = ((r.sante || {}).groupeSanguin || '').trim();
  const maj = fl2Comp(r.id).updatedAt;

  box.innerHTML = `<div class="fl2-card" id="flPrintZone" style="--fc:${c}">
    <div class="fl2-head">
      <div class="fl2-head-av">${escHtml(_fl2Ini(r))}</div>
      <div class="fl2-head-id">
        <div class="fl2-head-n">${escHtml(_fl2Nom(r))}</div>
        <div class="fl2-head-m">${escHtml(meta || 'Informations d’état civil incomplètes')}</div>
      </div>
      <div class="fl2-head-r">
        <div class="fl2-head-rl">Groupe sanguin</div>
        <div class="fl2-head-rv">${escHtml(sang || '—')}</div>
      </div>
    </div>
    <div class="fl2-grid">${fl2Sections(d).map(_fl2Section).join('')}</div>
    <div class="fl2-foot">
      <span>Document confidentiel — à remettre aux seuls professionnels de santé habilités.</span>
      <span class="fl2-foot-r">Éditée le ${escHtml(new Date().toLocaleDateString('fr-FR'))} par ${escHtml(d.redacteur || '—')}${
        maj ? ' · complément mis à jour le ' + escHtml(_fl2DateFr(maj)) : ''}</span>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════
// MODALE « COMPLÉTER LA FICHE » (table fiches_liaison)
// ══════════════════════════════════════════════════════════════════════

let _fl2Chute = '';

function fl2SetChute(v) {
  _fl2Chute = v;
  document.querySelectorAll('#flcChute .v2-seg-o').forEach(b => {
    const on = b.dataset.v === v;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function openFlComp() {
  const rid = (document.getElementById('flResident') || {}).value || '';
  if (!rid) { toast('Sélectionnez d\'abord un résident', 'error'); return; }
  const c = fl2Comp(rid);
  fl2SetChute(c.risqueChute || '');
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('flcDeplacement', c.deplacement);
  set('flcToilette', c.toilette);
  set('flcRepas', c.repas);
  set('flcCommunication', c.communication);
  set('flcLangue', c.langue);
  set('flcConsignes', c.consignes);
  const note = document.getElementById('flcNote');
  if (note) note.style.display = _fl2CompsOk ? 'none' : '';
  openModal('modalFlComp');
}

async function saveFlComp() {
  const rid = (document.getElementById('flResident') || {}).value || '';
  if (!rid) { closeModal('modalFlComp'); return; }
  const g = id => (document.getElementById(id) || {}).value || '';
  const btn = document.getElementById('flcSave');
  if (btn) btn.disabled = true;
  try {
    await fl2SaveComplement({
      residentId: rid,
      risqueChute: _fl2Chute,
      deplacement: g('flcDeplacement'),
      toilette: g('flcToilette'),
      repas: g('flcRepas'),
      communication: g('flcCommunication'),
      langue: g('flcLangue'),
      consignes: g('flcConsignes')
    });
    closeModal('modalFlComp');
    toast('Fiche de liaison complétée');
    fl2Render();
  } catch (e) {
    console.error('[fiche-liaison] enregistrement', e);
    toast(fl2ErrMsg(e), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════════
// IMPRESSION — document autonome en thème clair (la fiche à l'écran est
// sombre : l'imprimer telle quelle donnerait une page illisible).
// ══════════════════════════════════════════════════════════════════════

function fl2PrintDoc() {
  const d = (typeof _flData === 'object' && _flData) || {};
  const r = d.r;
  if (!r) return '';
  const age = _fl2Age(r.dob);
  const meta = [
    age !== null ? age + ' ans' : '',
    r.dob ? 'né(e) le ' + _fl2DateFr(r.dob) : '',
    r.chambre ? 'Chambre ' + r.chambre : ''
  ].filter(Boolean).join(' · ');
  const sang = ((r.sante || {}).groupeSanguin || '').trim();
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Les sections sont reconstruites en HTML clair à partir des mêmes données.
  const secs = fl2Sections(d).map(s => {
    const rows = s.rows.map(row =>
      `<tr><td class="k">${escHtml(row.k)}</td><td class="v">${escHtml(row.v || '—')}</td></tr>`).join('');
    return `<div class="sec"><div class="sec-t" style="color:${s.c};border-color:${s.c}">${escHtml(s.title)}</div>
      <table>${rows}</table></div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Fiche de liaison — ${escHtml(_fl2Nom(r))}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Inter,system-ui,sans-serif;margin:0;padding:1.5cm;color:#1e293b;font-size:12px}
    .hd{display:flex;align-items:center;gap:14px;border-bottom:2px solid #dc2626;padding-bottom:10px;margin-bottom:14px}
    .hd h1{font-size:17px;margin:0}
    .hd .m{font-size:11px;color:#475569;margin-top:2px}
    .hd .b{margin-left:auto;text-align:right;font-size:11px;color:#475569}
    .hd .b strong{display:block;font-size:16px;color:#b91c1c}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .sec{border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;break-inside:avoid}
    .sec-t{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid;padding-bottom:4px;margin-bottom:6px}
    table{width:100%;border-collapse:collapse}
    td{padding:2px 0;vertical-align:top}
    td.k{color:#64748b;width:38%;font-size:11px}
    td.v{font-weight:600;font-size:11px;white-space:pre-wrap}
    .sign{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px}
    .sign .l{font-size:11px;font-weight:700;color:#475569}
    .sign .line{height:46px;border-bottom:1px solid #cbd5e1;margin-bottom:3px}
    .sign .n{font-size:10px;color:#94a3b8}
    .foot{text-align:center;margin-top:14px;font-size:10px;color:#94a3b8;font-style:italic}
    @media print{body{padding:1cm}}
  </style></head><body>
  <div class="hd">
    <div><h1>${escHtml(_fl2Nom(r))}</h1><div class="m">${escHtml(meta)}</div></div>
    <div class="b">Fiche de liaison hospitalière<strong>${escHtml(sang || '—')}</strong>Groupe sanguin</div>
  </div>
  <div class="grid">${secs}</div>
  <div class="sign">
    <div><div class="l">Signature de l'infirmier(e) / rédacteur</div><div class="line"></div><div class="n">${escHtml(d.redacteur || '')}</div></div>
    <div><div class="l">Signature médecin / responsable</div><div class="line"></div><div class="n">Nom et qualité :</div></div>
  </div>
  <div class="foot">Document confidentiel — à transmettre uniquement aux professionnels de santé habilités · Généré le ${escHtml(today)}</div>
  </body></html>`;
}

// ── Délégation : les appelants existants continuent de fonctionner ────
if (typeof renderFicheLiaison === 'function') renderFicheLiaison = fl2Render;
