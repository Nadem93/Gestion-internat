// ── CONTRATS DE TRAVAIL (RH) — DESIGN V2 ─────────────────────────────────
// Reproduit la maquette « Contrats (RH) » : tuiles statistiques, chips de
// type, tableau des contrats, échéances contractuelles, répartition,
// génération de documents, alertes de renouvellement, périodes d'essai,
// ancienneté de l'équipe, historique par salarié, DPAE & registre, coût
// employeur par contrat, avenants en cours et registre unique du personnel.
//
// Les données et les actions des contrats restent celles de js/contrats.js et
// js/contrats-supabase.js (la couche Supabase n'est pas réécrite).
// Les deux blocs de la maquette sans source en base (coût employeur, DPAE)
// s'appuient sur les tables créées par migration-contrats.sql : tant qu'il
// n'est pas exécuté, la lecture renvoie [] avec un console.warn et l'écriture
// est refusée par un toast nommant le fichier. Aucune valeur n'est inventée.

const CT2_SQL = 'migration-contrats.sql';
const CT2_T_COUT = 'contrat_couts';
const CT2_T_DPAE = 'contrat_dpae';

// Couleurs V2 par type de contrat (le référentiel des libellés reste CT_TYPES).
const CT2_TYPE = {
  cdi:        { l: 'CDI',        c: '#10b981' },
  cdd:        { l: 'CDD',        c: '#f59e0b' },
  vacation:   { l: 'Vacation',   c: '#a855f7' },
  stage:      { l: 'Stage',      c: '#22d3ee' },
  alternance: { l: 'Alternance', c: '#818cf8' }
};
const CT2_ORDRE = ['cdi', 'cdd', 'vacation', 'stage', 'alternance'];
const CT2_CLR = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];

const CT2_IC = {
  file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  infin: '<path d="M18.178 8c-2.518 0-4.178 2.667-6.178 4-2 1.333-3.66 4-6.178 4C3.582 16 2 14.21 2 12s1.582-4 3.822-4c2.518 0 4.178 2.667 6.178 4 2 1.333 3.66 4 6.178 4C20.418 16 22 14.21 22 12s-1.582-4-3.822-4z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  bell:  '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  pen:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  book:  '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  euro:  '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  dl:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  clip:  '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  eye:   '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>'
};

function ct2Svg(path, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// ── Données annexes (tables de migration-contrats.sql) ───────────────────
let CT2_COUTS = [];
let CT2_DPAE = [];
const CT2_MISS = new Set();
let CT2_HISTO_EMP = '';   // employé affiché dans le bloc « Historique »

// ── Droits ───────────────────────────────────────────────────────────────
// Lecture/écriture des données de paie et déclaratives : encadrement (admin,
// superadmin, rh) — identique aux politiques RLS de migration-contrats.sql.
// Le droit d'édition des contrats eux-mêmes reste ctIsCanEdit() (js/contrats.js) :
// rien n'est desserré.
function ct2IsRH() { return typeof Auth !== 'undefined' && Auth.isRH && Auth.isRH(); }
function ct2CanEdit() { return typeof ctIsCanEdit === 'function' ? ctIsCanEdit() : false; }

// ── Accès Supabase (dégradation douce si la table n'existe pas) ──────────
function ct2Absente(e) {
  const msg = String((e && (e.message || e.details || e.hint)) || '');
  return (e && e.code === '42P01') || /does not exist|Could not find the table|schema cache/i.test(msg);
}

async function ct2Select(table) {
  if (typeof supabaseClient === 'undefined') return [];
  try {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) {
      if (ct2Absente(error)) {
        CT2_MISS.add(table);
        console.warn(`[contrats] table « ${table} » absente — exécutez ${CT2_SQL}`);
      } else {
        console.error(`[contrats] lecture ${table}`, error);
      }
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`[contrats] lecture ${table} impossible`, e);
    return [];
  }
}

function ct2RefuseSiAbsente(table) {
  if (!CT2_MISS.has(table)) return false;
  toast(`Table « ${table} » absente — exécutez ${CT2_SQL}`, 'error');
  return true;
}

async function ct2Upsert(table, row, id) {
  if (ct2RefuseSiAbsente(table)) return null;
  if (!ct2IsRH()) { toast('Action réservée à l\'encadrement RH', 'error'); return null; }
  try {
    if (!row.etablissement_id) row.etablissement_id = await sbGetEtablissementId();
    const q = id
      ? supabaseClient.from(table).update(row).eq('id', id).select()
      : supabaseClient.from(table).insert(row).select();
    const { data, error } = await q;
    if (error) throw error;
    return (data && data[0]) || null;
  } catch (e) {
    if (ct2Absente(e)) { CT2_MISS.add(table); toast(`Table « ${table} » absente — exécutez ${CT2_SQL}`, 'error'); return null; }
    console.error(`[contrats] écriture ${table}`, e);
    toast('Erreur : ' + ((e && (e.message || e.details)) || e), 'error');
    return null;
  }
}

async function ct2LoadExtras() {
  if (!ct2IsRH()) { CT2_COUTS = []; CT2_DPAE = []; return; }
  const [couts, dpae] = await Promise.all([ct2Select(CT2_T_COUT), ct2Select(CT2_T_DPAE)]);
  CT2_COUTS = couts;
  CT2_DPAE = dpae;
}

// ── Utilitaires de calcul (tout est dérivé de la table `contrats`) ───────
function ct2All() { return typeof getContrats === 'function' ? (getContrats() || []) : []; }
function ct2Emps() { return typeof ctEmployes === 'function' ? (ctEmployes() || []) : []; }
function ct2Nom(id) { return typeof ctEmployeNom === 'function' ? ctEmployeNom(id) : 'Inconnu'; }
function ct2Emp(id) { return ct2Emps().find(e => String(e.id) === String(id)) || null; }

function ct2Ini(employeId) {
  const e = ct2Emp(employeId);
  if (e && typeof initials === 'function') return initials(e.prenom || '', e.nom || '') || '?';
  const n = ct2Nom(employeId);
  return (n && n !== 'Inconnu') ? n.slice(0, 2).toUpperCase() : '?';
}

// Couleur d'avatar stable pour un salarié donné (pas d'aléatoire au rendu).
function ct2Couleur(key) {
  const s = String(key || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CT2_CLR[h % CT2_CLR.length];
}

function ct2T(type) { return CT2_TYPE[type] || { l: type || '—', c: '#818cf8' }; }

// « de CDD », « de stage », « d'alternance » — les sigles restent en capitales.
function ct2De(type) {
  const l = ct2T(type).l;
  const mot = /^[A-Z]{2,}$/.test(l) ? l : l.toLowerCase();
  return /^[aeiouyéè]/i.test(mot) ? `d'${mot}` : `de ${mot}`;
}
function ct2Actif(c) { return (c.statut || 'actif') === 'actif'; }
function ct2Jours(d) { return typeof ctJoursRestants === 'function' ? ctJoursRestants(d) : null; }
function ct2Date(d) { return d ? formatDate(d) : '—'; }

// ETP dérivé des heures hebdomadaires saisies (base 35 h). Rien n'est déduit
// quand l'information est absente.
function ct2Etp(c) {
  const h = Number(c.heures || 0);
  if (!h) return null;
  return Math.round((h / 35) * 100) / 100;
}
function ct2EtpTxt(c) {
  const e = ct2Etp(c);
  return e === null ? '—' : e.toFixed(1).replace('.', ',');
}

function ct2Euro(n) {
  const v = Number(n || 0);
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function ct2Statut(c) {
  if (!ct2Actif(c)) return { l: 'Terminé', c: '#8095b4' };
  const j = c.fin ? ct2Jours(c.fin) : null;
  if (j !== null && j < 0) return { l: 'Échu', c: '#ef4444' };
  if (j !== null && j <= 60) return { l: 'Échéance', c: '#f59e0b' };
  return { l: 'Actif', c: '#10b981' };
}

// Contrats filtrés par les contrôles de la barre de filtres.
function ct2Filtres() {
  return {
    emp: (document.getElementById('ctFilterEmploye') || {}).value || '',
    type: (document.getElementById('ctFilterType') || {}).value || '',
    statut: (document.getElementById('ctFilterStatut') || {}).value || ''
  };
}
function ct2Liste() {
  const f = ct2Filtres();
  let l = ct2All();
  if (f.emp) l = l.filter(c => String(c.employeId) === f.emp);
  if (f.type) l = l.filter(c => c.type === f.type);
  if (f.statut) l = l.filter(c => (c.statut || 'actif') === f.statut);
  return [...l].sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
}

// ── 1. Tuiles statistiques ───────────────────────────────────────────────
function ct2RenderStats() {
  const el = document.getElementById('ct2Stats');
  if (!el) return;
  const all = ct2All();
  const actifs = all.filter(ct2Actif);
  const ech60 = actifs.filter(c => { const j = c.fin ? ct2Jours(c.fin) : null; return j !== null && j >= 0 && j <= 60; });
  const tuiles = [
    { n: actifs.length, l: 'Contrats actifs', c: '#22d3ee', i: CT2_IC.file },
    { n: actifs.filter(c => c.type === 'cdi').length, l: 'CDI', c: '#10b981', i: CT2_IC.infin },
    { n: actifs.filter(c => c.type === 'cdd').length, l: 'CDD', c: '#f59e0b', i: CT2_IC.clock },
    { n: ech60.length, l: 'Échéances < 60j', c: '#ef4444', i: CT2_IC.alert }
  ];
  el.innerHTML = tuiles.map(t => `
    <div class="ct2-stat" style="--pc:${t.c}">
      <span class="ct2-stat-ico">${ct2Svg(t.i)}</span>
      <div><div class="ct2-stat-n">${t.n}</div><div class="ct2-stat-l">${escHtml(t.l)}</div></div>
    </div>`).join('');
}

// ── 2. Chips de type ─────────────────────────────────────────────────────
function ct2RenderChips() {
  const el = document.getElementById('ct2Chips');
  if (!el) return;
  const all = ct2All();
  const cour = ct2Filtres().type;
  const defs = [{ id: '', l: 'Tous', c: '#818cf8', n: all.length }]
    .concat(CT2_ORDRE.map(k => ({ id: k, l: ct2T(k).l, c: ct2T(k).c, n: all.filter(c => c.type === k).length })));
  el.innerHTML = defs.map(d => `
    <button type="button" class="v2-chip-f${cour === d.id ? ' on' : ''}" onclick="ct2SetType('${d.id}')">
      <span class="dot" style="background:${d.c}"></span>${escHtml(d.l)}<span class="n">${d.n}</span>
    </button>`).join('');
}

function ct2SetType(t) {
  const sel = document.getElementById('ctFilterType');
  if (sel) sel.value = t;
  ct2Render();
}

// ── 3. Tableau des contrats ──────────────────────────────────────────────
function ct2RenderTable() {
  const el = document.getElementById('ct2Table');
  if (!el) return;
  const list = ct2Liste();
  const cols = ['Salarié', 'Type', 'Début', 'Fin', 'ETP', 'Statut', ''];

  if (!list.length) {
    const vide = ct2All().length === 0;
    el.innerHTML = `<div class="ct2-empty">${vide
      ? 'Aucun contrat enregistré. Créez le premier contrat d\'un salarié.'
      : 'Aucun contrat ne correspond aux filtres sélectionnés.'}</div>`;
    return;
  }

  const rows = list.map(c => {
    const t = ct2T(c.type), st = ct2Statut(c), col = ct2Couleur(c.employeId || c.id);
    const emp = ct2Emp(c.employeId);
    const fonction = c.poste || (emp && emp.fonction) || '';
    const edit = ct2CanEdit();
    return `<tr${edit ? ` class="ct2-tr" onclick="openContratDetail('${c.id}')"` : ''}>
      <td>
        <div class="ct2-who">
          <span class="v2-av v2-av-sm" style="background:${col}">${escHtml(ct2Ini(c.employeId))}</span>
          <div style="min-width:0">
            <div class="ct2-who-n">${escHtml(ct2Nom(c.employeId))}</div>
            ${fonction ? `<div class="ct2-who-f">${escHtml(fonction)}</div>` : ''}
          </div>
        </div>
      </td>
      <td><span class="ct2-type" style="--pc:${t.c}">${escHtml(t.l)}</span></td>
      <td>${ct2Date(c.debut)}</td>
      <td>${c.fin ? ct2Date(c.fin) : '—'}</td>
      <td>${ct2EtpTxt(c)}</td>
      <td><span class="ct2-st" style="--pc:${st.c}"><span class="dot"></span>${st.l}</span></td>
      <td>
        ${edit ? `<div class="ct2-actions" onclick="event.stopPropagation()">
          ${c.fichierPath ? `<button type="button" class="ct2-ico-btn" title="${escAttr(c.fichierNom || 'Document joint')}" onclick="ctOpenFichier('${c.id}')">${ct2Svg(CT2_IC.clip)}</button>` : ''}
          <button type="button" class="ct2-ico-btn" title="Détail du contrat" onclick="openContratDetail('${c.id}')">${ct2Svg(CT2_IC.eye)}</button>
          <button type="button" class="ct2-ico-btn" title="Modifier" onclick="openContratModal('${c.id}')">${ct2Svg(CT2_IC.pen)}</button>
        </div>` : ''}
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = `<div class="ct2-tablewrap"><table class="v2-table">
    <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

// ── 4. Échéances contractuelles ──────────────────────────────────────────
function ct2Echeances() {
  return ct2All()
    .filter(c => ct2Actif(c) && c.fin)
    .map(c => ({ c, j: ct2Jours(c.fin) }))
    .filter(x => x.j !== null && x.j >= 0)
    .sort((a, b) => a.j - b.j);
}

function ct2RenderEcheances() {
  const el = document.getElementById('ct2Echeances');
  if (!el) return;
  const list = ct2Echeances().slice(0, 6);
  el.style.setProperty('--ta', 'rgba(239,68,68,.13)');
  el.style.setProperty('--tb', 'rgba(245,158,11,.05)');
  el.style.setProperty('--tc', 'rgba(239,68,68,.22)');
  el.innerHTML = `
    <div class="ct2-tint-h" style="color:#fca5a5">${ct2Svg(CT2_IC.alert)}<span class="ct2-tint-t" style="color:#fecaca">Échéances contractuelles</span></div>
    ${list.length ? list.map(x => {
      const col = x.j <= 30 ? '#ef4444' : '#f59e0b';
      const d = new Date(x.c.fin + 'T00:00:00');
      const court = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return `<div class="ct2-li" style="--pc:${col}">
        <span class="v2-av v2-av-sm" style="background:${ct2Couleur(x.c.employeId || x.c.id)}">${escHtml(ct2Ini(x.c.employeId))}</span>
        <div class="ct2-li-b">
          <div class="ct2-li-n">${escHtml(ct2Nom(x.c.employeId))}</div>
          <div class="ct2-li-s">Fin ${ct2De(x.c.type)} · J-${x.j}</div>
        </div>
        <span class="ct2-li-v">${court}</span>
      </div>`;
    }).join('') : '<div class="v2-blk-vide">Aucune échéance à venir sur les contrats actifs.</div>'}`;
}

// ── 5. Répartition des contrats ──────────────────────────────────────────
function ct2RenderRepartition() {
  const el = document.getElementById('ct2Repartition');
  if (!el) return;
  const actifs = ct2All().filter(ct2Actif);
  const n = CT2_ORDRE.map(k => ({ k, l: ct2T(k).l, c: ct2T(k).c, n: actifs.filter(x => x.type === k).length }))
    .filter(x => x.n > 0);
  const max = n.reduce((m, x) => Math.max(m, x.n), 0) || 1;
  el.innerHTML = `
    <div class="v2-blk-h"><span class="v2-blk-t">Répartition des contrats</span></div>
    ${n.length ? `<div class="ct2-bars">${n.map(x => `
      <div>
        <div class="ct2-bar-h"><span class="ct2-bar-l">${escHtml(x.l)}</span><span class="ct2-bar-n">${x.n}</span></div>
        <div class="v2-prog"><span style="width:${Math.round((x.n / max) * 100)}%;background:${x.c}"></span></div>
      </div>`).join('')}</div>` : '<div class="v2-blk-vide">Aucun contrat actif.</div>'}`;
}

// ── 6. Génération de documents ───────────────────────────────────────────
const CT2_DOCS = [
  { id: 'cdi',      l: 'CDI',                titre: 'Contrat à durée indéterminée', c: '#10b981', i: CT2_IC.infin },
  { id: 'cdd',      l: 'CDD',                titre: 'Contrat à durée déterminée',   c: '#f59e0b', i: CT2_IC.clock },
  { id: 'avenant',  l: 'Avenant',            titre: 'Avenant au contrat de travail', c: '#818cf8', i: CT2_IC.file },
  { id: 'attest',   l: 'Attestation',        titre: 'Attestation d\'employeur',      c: '#22d3ee', i: CT2_IC.shield },
  { id: 'certif',   l: 'Certificat travail', titre: 'Certificat de travail',         c: '#ec4899', i: CT2_IC.file }
];

function ct2RenderGen() {
  const el = document.getElementById('ct2Gen');
  if (!el) return;
  el.innerHTML = `
    <div class="v2-blk-h"><span class="v2-blk-t">Génération de documents</span></div>
    <div class="ct2-gen">${CT2_DOCS.map(d => `
      <button type="button" class="ct2-gen-t" style="--pc:${d.c}" onclick="ct2OpenGen('${d.id}')">
        <span class="ct2-gen-ico">${ct2Svg(d.i)}</span>
        <div class="ct2-gen-l">${escHtml(d.l)}</div>
        <div class="ct2-gen-s">Générer · imprimable</div>
      </button>`).join('')}</div>`;
}

// ── 7. Alertes de renouvellement ─────────────────────────────────────────
function ct2RenderAlertes() {
  const el = document.getElementById('ct2Alertes');
  if (!el) return;
  el.style.setProperty('--ta', 'rgba(245,158,11,.13)');
  el.style.setProperty('--tb', 'rgba(239,68,68,.05)');
  el.style.setProperty('--tc', 'rgba(245,158,11,.22)');

  const list = ct2Echeances().filter(x => x.c.type !== 'cdi' && x.j <= 90).slice(0, 5);
  el.innerHTML = `
    <div class="ct2-tint-h" style="color:#fbbf24">${ct2Svg(CT2_IC.bell)}<span class="ct2-tint-t" style="color:#fde68a">Alertes de renouvellement</span></div>
    ${list.length ? list.map(x => {
      const col = x.j <= 15 ? '#ef4444' : (x.j <= 45 ? '#f59e0b' : '#22d3ee');
      const act = x.j <= 15 ? 'Traiter' : (x.j <= 45 ? 'Renouveler' : 'Planifier');
      return `<div class="ct2-li" style="--pc:${col}">
        <span class="v2-av v2-av-sm" style="background:${ct2Couleur(x.c.employeId || x.c.id)}">${escHtml(ct2Ini(x.c.employeId))}</span>
        <div class="ct2-li-b">
          <div class="ct2-li-n">${escHtml(ct2Nom(x.c.employeId))}</div>
          <div class="ct2-li-s">${escHtml(ct2T(x.c.type).l)} — fin ${ct2Date(x.c.fin)} (dans ${x.j} j)</div>
        </div>
        ${ct2CanEdit()
          ? `<button type="button" class="ct2-li-act" onclick="openContratModal('${x.c.id}')">${act}</button>`
          : `<span class="ct2-li-v">J-${x.j}</span>`}
      </div>`;
    }).join('') : '<div class="v2-blk-vide">Aucun contrat à renouveler dans les 90 jours.</div>'}`;
}

// ── 8. Périodes d'essai en cours ─────────────────────────────────────────
function ct2RenderEssais() {
  const el = document.getElementById('ct2Essais');
  if (!el) return;
  const list = ct2All().filter(c => ct2Actif(c) && c.essai)
    .sort((a, b) => (a.essai || '').localeCompare(b.essai || ''));

  el.innerHTML = `
    <div class="v2-blk-h">${`<span style="color:#22d3ee;display:flex">${ct2Svg(CT2_IC.clock)}</span>`}<span class="v2-blk-t">Périodes d'essai en cours</span></div>
    ${list.length ? `<div class="ct2-bars">${list.map(c => {
      const j = ct2Jours(c.essai);
      const debut = new Date((c.debut || c.essai) + 'T00:00:00').getTime();
      const fin = new Date(c.essai + 'T00:00:00').getTime();
      let pct = fin > debut ? Math.round(((Date.now() - debut) / (fin - debut)) * 100) : 100;
      pct = Math.max(0, Math.min(100, pct));
      const finie = j === null || j < 0;
      const col = finie ? '#10b981' : (j <= 15 ? '#f59e0b' : '#22d3ee');
      return `<div>
        <div class="ct2-bar-h"><span class="ct2-bar-l">${escHtml(ct2Nom(c.employeId))}</span><span class="ct2-bar-m">fin ${ct2Date(c.essai)}</span></div>
        <div class="v2-prog"><span style="width:${finie ? 100 : pct}%;background:${col}"></span></div>
        <div class="ct2-bar-s">${finie ? 'Échue' : `Reste ${j} jour${j > 1 ? 's' : ''}`}</div>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucune période d\'essai renseignée sur les contrats actifs.</div>'}`;
}

// ── 9. Ancienneté de l'équipe ────────────────────────────────────────────
// Ancienneté = date du plus ancien contrat du salarié (toutes durées confondues).
function ct2Anciennetes() {
  const par = new Map();
  ct2All().forEach(c => {
    if (!c.employeId || !c.debut) return;
    const k = String(c.employeId);
    if (!par.has(k) || c.debut < par.get(k)) par.set(k, c.debut);
  });
  const now = Date.now();
  return [...par.entries()].map(([id, debut]) => ({
    id, debut, ans: (now - new Date(debut + 'T00:00:00').getTime()) / (365.25 * 86400000)
  })).filter(x => x.ans >= 0);
}

function ct2RenderAnciennete() {
  const el = document.getElementById('ct2Anciennete');
  if (!el) return;
  const anc = ct2Anciennetes();
  const moy = anc.length ? anc.reduce((s, x) => s + x.ans, 0) / anc.length : null;
  const buckets = [
    { l: '< 1 an', c: '#22d3ee', f: x => x.ans < 1 },
    { l: '1 à 3 ans', c: '#818cf8', f: x => x.ans >= 1 && x.ans < 3 },
    { l: '3 à 5 ans', c: '#a855f7', f: x => x.ans >= 3 && x.ans < 5 },
    { l: '> 5 ans', c: '#10b981', f: x => x.ans >= 5 }
  ].map(b => ({ ...b, n: anc.filter(b.f).length }));
  const max = buckets.reduce((m, b) => Math.max(m, b.n), 0) || 1;

  el.innerHTML = `
    <div class="v2-blk-h">
      <span class="v2-blk-t">Ancienneté de l'équipe</span>
      <span style="margin-left:auto;font-size:12px;font-weight:800;color:#818cf8;font-family:var(--v2-display)">${
        moy === null ? '—' : moy.toFixed(1).replace('.', ',') + ' ans'}</span>
    </div>
    ${anc.length ? `<div class="ct2-bars">${buckets.map(b => `
      <div>
        <div class="ct2-bar-h"><span class="ct2-bar-l">${escHtml(b.l)}</span><span class="ct2-bar-n">${b.n}</span></div>
        <div class="v2-prog"><span style="width:${Math.round((b.n / max) * 100)}%;background:${b.c}"></span></div>
      </div>`).join('')}</div>` : '<div class="v2-blk-vide">Aucun contrat daté.</div>'}`;
}

// ── 10. Historique d'un salarié ──────────────────────────────────────────
function ct2EmpsAvecContrat() {
  const vus = new Set();
  const out = [];
  ct2All().forEach(c => {
    const k = String(c.employeId || '');
    if (!k || vus.has(k)) return;
    vus.add(k);
    out.push({ id: k, nom: ct2Nom(c.employeId) });
  });
  return out.sort((a, b) => a.nom.localeCompare(b.nom));
}

function ct2RenderHisto() {
  const el = document.getElementById('ct2Histo');
  if (!el) return;
  const emps = ct2EmpsAvecContrat();
  if (!emps.length) {
    el.innerHTML = '<div class="v2-blk-h"><span class="v2-blk-t">Historique</span></div><div class="v2-blk-vide">Aucun contrat enregistré.</div>';
    return;
  }
  if (!CT2_HISTO_EMP || !emps.some(e => e.id === CT2_HISTO_EMP)) CT2_HISTO_EMP = emps[0].id;

  const cs = ct2All().filter(c => String(c.employeId) === CT2_HISTO_EMP);
  const ev = [];
  cs.forEach(c => {
    const t = ct2T(c.type);
    if (c.debut) ev.push({ d: c.debut, l: `Début ${ct2De(c.type)}`, s: [c.poste, ct2Etp(c) !== null ? ct2EtpTxt(c) + ' ETP' : ''].filter(Boolean).join(' · '), c: t.c });
    if (c.essai) ev.push({ d: c.essai, l: 'Fin de période d\'essai', s: t.l, c: '#22d3ee' });
    (c.avenants || []).forEach(a => ev.push({ d: a.date, l: 'Avenant', s: a.texte || '', c: '#818cf8' }));
    if (c.fin) ev.push({ d: c.fin, l: `Fin ${ct2De(c.type)}`, s: ct2Actif(c) ? 'échéance' : 'contrat terminé', c: ct2Actif(c) ? '#f59e0b' : '#8095b4' });
  });
  ev.sort((a, b) => (b.d || '').localeCompare(a.d || ''));

  el.innerHTML = `
    <div class="v2-blk-h">
      <span class="v2-blk-t">Historique</span>
      <select class="ct2-sel" style="margin-left:auto;max-width:170px" aria-label="Salarié" onchange="ct2SetHisto(this.value)">
        ${emps.map(e => `<option value="${escAttr(e.id)}"${e.id === CT2_HISTO_EMP ? ' selected' : ''}>${escHtml(e.nom)}</option>`).join('')}
      </select>
    </div>
    ${ev.length ? ev.map((e, i) => `
      <div class="ct2-histo-row" style="--pc:${e.c}">
        <div class="ct2-histo-rail">
          <span class="ct2-histo-dot"></span>
          ${i < ev.length - 1 ? '<span class="ct2-histo-bar"></span>' : ''}
        </div>
        <div class="ct2-histo-b">
          <div class="ct2-histo-t">${escHtml(e.l)}</div>
          <div class="ct2-histo-d">${ct2Date(e.d)}${e.s ? ' · ' + escHtml(e.s) : ''}</div>
        </div>
      </div>`).join('') : '<div class="v2-blk-vide">Aucun événement daté pour ce salarié.</div>'}`;
}

function ct2SetHisto(id) { CT2_HISTO_EMP = String(id || ''); ct2RenderHisto(); }

// ── 11. DPAE & registre ──────────────────────────────────────────────────
function ct2DpaeDe(contratId) { return CT2_DPAE.find(d => String(d.contrat_id) === String(contratId)) || null; }

function ct2RenderDpae() {
  const el = document.getElementById('ct2Dpae');
  if (!el) return;
  if (!ct2IsRH()) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = '';

  const actifs = ct2All().filter(ct2Actif).sort((a, b) => (b.debut || '').localeCompare(a.debut || '')).slice(0, 8);
  const absente = CT2_MISS.has(CT2_T_DPAE);

  el.innerHTML = `
    <div class="v2-blk-h"><span style="color:#34d399;display:flex">${ct2Svg(CT2_IC.shield)}</span><span class="v2-blk-t" style="color:#6ee7b7">DPAE &amp; registre</span></div>
    ${absente ? `<div class="v2-blk-vide">Suivi indisponible : exécutez ${CT2_SQL}.</div>` : ''}
    ${actifs.length ? actifs.map(c => {
      const d = ct2DpaeDe(c.id);
      const ok = !!(d && d.statut === 'declaree');
      const col = ok ? '#34d399' : (d ? '#f59e0b' : '#8095b4');
      const tag = ok ? 'Déclarée' : (d ? 'À déclarer' : 'Non renseignée');
      const clic = !absente && ct2IsRH();
      return `<div class="ct2-dpae" style="--pc:${col}${clic ? ';cursor:pointer' : ''}"${clic ? ` role="button" tabindex="0" onclick="ct2OpenDpae('${c.id}')"` : ''}>
        <span class="ct2-dpae-i">${ct2Svg(ok ? CT2_IC.check : CT2_IC.minus, 2.4)}</span>
        <span class="ct2-dpae-n">${escHtml(ct2Nom(c.employeId))} <span style="color:var(--v2-t7)">· ${escHtml(ct2T(c.type).l)}</span></span>
        <span class="ct2-dpae-t">${tag}</span>
      </div>`;
    }).join('') : '<div class="v2-blk-vide">Aucun contrat actif.</div>'}`;
}

// ── 12. Coût employeur par contrat ───────────────────────────────────────
function ct2CoutDe(contratId) { return CT2_COUTS.find(x => String(x.contrat_id) === String(contratId)) || null; }

function ct2RenderCout() {
  const el = document.getElementById('ct2Cout');
  if (!el) return;
  if (!ct2IsRH()) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = '';

  const actifs = ct2All().filter(ct2Actif);
  const lignes = actifs.map(c => ({ c, k: ct2CoutDe(c.id) }));
  const total = lignes.reduce((s, x) => s + (x.k ? Number(x.k.brut || 0) + Number(x.k.charges || 0) : 0), 0);
  const absente = CT2_MISS.has(CT2_T_COUT);
  const renseignes = lignes.filter(x => x.k).length;

  el.innerHTML = `
    <div class="ct2-cout-h">
      ${ct2Svg(CT2_IC.euro)}
      <span class="v2-blk-t">Coût employeur par contrat</span>
      <span class="ct2-cout-tot">${absente
        ? `Exécutez ${escHtml(CT2_SQL)}`
        : `Total chargé/mois : <b>${renseignes ? ct2Euro(total) : '—'}</b>`}</span>
    </div>
    ${lignes.length ? `<div class="ct2-tablewrap"><table class="v2-table">
      <thead><tr><th>Salarié</th><th class="num">Brut</th><th class="num">Charges</th><th class="num">Coût chargé</th><th class="num">ETP</th></tr></thead>
      <tbody>${lignes.map(x => {
        const k = x.k;
        const charge = k ? Number(k.brut || 0) + Number(k.charges || 0) : null;
        return `<tr${absente ? '' : ` class="ct2-tr" onclick="ct2OpenCout('${x.c.id}')"`}>
          <td>
            <div class="ct2-who">
              <span class="v2-av v2-av-sm" style="background:${ct2Couleur(x.c.employeId || x.c.id)}">${escHtml(ct2Ini(x.c.employeId))}</span>
              <span class="ct2-who-n">${escHtml(ct2Nom(x.c.employeId))}</span>
            </div>
          </td>
          <td class="num ct2-brut">${k ? ct2Euro(k.brut) : '—'}</td>
          <td class="num ct2-charges">${k ? ct2Euro(k.charges) : '—'}</td>
          <td class="num"><span class="ct2-charge">${charge === null ? '—' : ct2Euro(charge)}</span></td>
          <td class="num"><span class="ct2-etp">${ct2EtpTxt(x.c)} ETP</span></td>
        </tr>`;
      }).join('')}</tbody></table></div>` : '<div class="ct2-empty">Aucun contrat actif.</div>'}`;
}

// ── 13. Avenants en cours ────────────────────────────────────────────────
function ct2RenderAvenants() {
  const el = document.getElementById('ct2Avenants');
  if (!el) return;
  const list = [];
  ct2All().forEach(c => (c.avenants || []).forEach(a => list.push({ c, a })));
  list.sort((x, y) => String(y.a.date || '').localeCompare(String(x.a.date || '')));

  el.innerHTML = `
    <div class="v2-blk-h"><span style="color:#818cf8;display:flex">${ct2Svg(CT2_IC.pen)}</span><span class="v2-blk-t">Avenants en cours</span></div>
    ${list.length ? list.slice(0, 8).map(x => `
      <div class="ct2-av">
        <span class="v2-av v2-av-sm" style="background:${ct2Couleur(x.c.employeId || x.c.id)}">${escHtml(ct2Ini(x.c.employeId))}</span>
        <div class="ct2-av-b">
          <div class="ct2-av-n">${escHtml(ct2Nom(x.c.employeId))}</div>
          <div class="ct2-av-t">${escHtml(x.a.texte || '')}</div>
        </div>
        <span class="ct2-type" style="--pc:#818cf8">${ct2Date(x.a.date)}</span>
      </div>`).join('') : '<div class="v2-blk-vide">Aucun avenant enregistré.</div>'}`;
}

// ── 14. Registre unique du personnel ─────────────────────────────────────
function ct2RegistreData() {
  const an = new Date().getFullYear();
  const all = ct2All();
  const entrees = new Set(), sorties = new Set(), inscrits = new Set();
  all.forEach(c => {
    if (!c.employeId) return;
    if (c.debut && Number(c.debut.slice(0, 4)) === an) entrees.add(String(c.employeId));
    if (c.fin && Number(c.fin.slice(0, 4)) === an) {
      const j = ct2Jours(c.fin);
      if (!ct2Actif(c) || (j !== null && j < 0)) sorties.add(String(c.employeId));
    }
    if (ct2Actif(c)) inscrits.add(String(c.employeId));
  });
  return { an, entrees: entrees.size, sorties: sorties.size, inscrits: inscrits.size };
}

function ct2RenderRegistre() {
  const el = document.getElementById('ct2Registre');
  if (!el) return;
  const r = ct2RegistreData();
  el.innerHTML = `
    <div class="ct2-tint-h" style="color:#22d3ee">${ct2Svg(CT2_IC.book)}<span class="ct2-tint-t" style="color:#a5f3fc">Registre unique du personnel</span></div>
    <div class="ct2-reg-sub">Entrées / sorties · obligation Art. L1221-13</div>
    <div class="ct2-reg-nums">
      <div class="ct2-reg-n" style="--pc:#34d399"><div class="ct2-reg-v">+${r.entrees}</div><div class="ct2-reg-l">Entrées ${r.an}</div></div>
      <div class="ct2-reg-n" style="--pc:#fca5a5"><div class="ct2-reg-v">−${r.sorties}</div><div class="ct2-reg-l">Sorties ${r.an}</div></div>
      <div class="ct2-reg-n" style="--pc:#fff"><div class="ct2-reg-v">${r.inscrits}</div><div class="ct2-reg-l">Inscrits</div></div>
    </div>
    <button type="button" class="ct2-reg-btn" onclick="ct2ExportRegistre()">${ct2Svg(CT2_IC.dl, 2.2)}Exporter le registre</button>`;
}

// ── Rendu global ─────────────────────────────────────────────────────────
function ct2Render() {
  if (!document.getElementById('ct2Stats')) return;
  ct2RenderStats();
  ct2RenderChips();
  ct2RenderTable();
  ct2RenderEcheances();
  ct2RenderRepartition();
  ct2RenderGen();
  ct2RenderAlertes();
  ct2RenderEssais();
  ct2RenderAnciennete();
  ct2RenderHisto();
  ct2RenderDpae();
  ct2RenderCout();
  ct2RenderAvenants();
  ct2RenderRegistre();
}

// ══ MODALE GÉNÉRIQUE (#ct2Modal) ═══════════════════════════════════════
function ct2Modal(html) {
  const ov = document.getElementById('ct2Modal');
  if (!ov) return;
  ov.innerHTML = html;
  openModal('ct2Modal');
}
function ct2CloseModal() { closeModal('ct2Modal'); }

function ct2Coque(opts) {
  return `<div class="v2-md" style="--mc:${opts.c || '#818cf8'}" role="dialog" aria-modal="true" aria-label="${escAttr(opts.t)}">
    <div class="v2-md-h">
      <span class="v2-md-ico">${ct2Svg(opts.i || CT2_IC.file)}</span>
      <div style="min-width:0"><div class="v2-md-t">${escHtml(opts.t)}</div><div class="v2-md-s">${escHtml(opts.s || '')}</div></div>
      <button type="button" class="v2-md-x" onclick="ct2CloseModal()" aria-label="Fermer">${ct2Svg(CT2_IC.x, 2.4)}</button>
    </div>
    <div class="v2-md-b">${opts.b}</div>
    <div class="v2-md-f">${opts.f}</div>
  </div>`;
}

// ── Génération de documents ──────────────────────────────────────────────
function ct2OpenGen(kind) {
  const d = CT2_DOCS.find(x => x.id === kind);
  if (!d) return;
  const cands = ct2All().filter(c => {
    if (kind === 'cdi') return c.type === 'cdi';
    if (kind === 'cdd') return c.type === 'cdd';
    if (kind === 'certif') return !ct2Actif(c) || (c.fin && ct2Jours(c.fin) !== null && ct2Jours(c.fin) < 0);
    return true;
  }).sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));

  const body = cands.length ? `
    <div>
      <label class="v2-fld-l" for="ct2GenSel">Contrat concerné</label>
      <select id="ct2GenSel" class="v2-fld">
        ${cands.map(c => `<option value="${escAttr(c.id)}">${escHtml(ct2Nom(c.employeId))} — ${escHtml(ct2T(c.type).l)} · ${ct2Date(c.debut)}</option>`).join('')}
      </select>
    </div>
    <div class="v2-note v2-note-warn">${ct2Svg(CT2_IC.alert)}<span>Le document reprend uniquement les informations enregistrées dans le contrat. Relisez-le et complétez-le avant signature.</span></div>`
    : `<div class="v2-blk-vide">Aucun contrat ne correspond à ce type de document.</div>`;

  ct2Modal(ct2Coque({
    t: d.titre, s: 'Génération d\'un document', c: d.c, i: d.i, b: body,
    f: `<button type="button" class="v2-btn-sec" onclick="ct2CloseModal()">Annuler</button>
        ${cands.length ? `<button type="button" class="v2-btn-pri" onclick="ct2GenererDoc('${d.id}')">${ct2Svg(CT2_IC.file)}Générer</button>` : ''}`
  }));
}

function ct2GenererDoc(kind) {
  const d = CT2_DOCS.find(x => x.id === kind);
  const id = (document.getElementById('ct2GenSel') || {}).value;
  const c = ct2All().find(x => String(x.id) === String(id));
  if (!d || !c) { toast('Contrat introuvable', 'error'); return; }

  const emp = ct2Emp(c.employeId);
  const lignes = [
    ['Salarié', ct2Nom(c.employeId)],
    ['Poste', c.poste || (emp && emp.fonction) || ''],
    ['Type de contrat', ct2T(c.type).l],
    ['Date de début', c.debut ? ct2Date(c.debut) : ''],
    ['Date de fin', c.fin ? ct2Date(c.fin) : ''],
    ['Temps de travail', c.temps === 'partiel' ? 'Temps partiel' : (c.heures ? 'Temps plein' : '')],
    ['Heures hebdomadaires', c.heures ? c.heures + ' h' : ''],
    ['Équivalent temps plein', ct2Etp(c) === null ? '' : ct2EtpTxt(c) + ' ETP'],
    ['Fin de période d\'essai', c.essai ? ct2Date(c.essai) : '']
  ].filter(l => l[1]);

  const avenants = (c.avenants || []).filter(a => a && a.texte);
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>${escHtml(d.titre)} — ${escHtml(ct2Nom(c.employeId))}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:40px;line-height:1.6}
  h1{font-size:20px;margin:0 0 4px;letter-spacing:.01em}
  .sub{font-size:12px;color:#555;margin-bottom:26px}
  table{border-collapse:collapse;width:100%;margin-bottom:22px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;font-size:13px}
  th{width:230px;color:#444;font-weight:600}
  ul{font-size:13px;padding-left:20px}
  .note{font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:12px;margin-top:30px}
  .sign{margin-top:46px;display:flex;gap:60px;font-size:12px;color:#444}
  @media print{body{margin:18mm}}
</style></head><body>
<h1>${escHtml(d.titre)}</h1>
<div class="sub">Document généré depuis INTERNALIS le ${ct2Date(today())}</div>
<table>${lignes.map(l => `<tr><th>${escHtml(l[0])}</th><td>${escHtml(String(l[1]))}</td></tr>`).join('')}</table>
${avenants.length ? `<h2 style="font-size:15px">Avenants</h2><ul>${avenants.map(a => `<li>${escHtml(ct2Date(a.date))} — ${escHtml(a.texte)}</li>`).join('')}</ul>` : ''}
${c.notes ? `<h2 style="font-size:15px">Notes</h2><p style="font-size:13px">${escHtml(c.notes)}</p>` : ''}
<div class="sign"><div>L'employeur<br/><br/><br/>_____________________</div><div>Le salarié<br/><br/><br/>_____________________</div></div>
<div class="note">Ce document ne reprend que les informations enregistrées dans le contrat. Il doit être relu, complété des mentions légales applicables et signé avant tout usage.</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Autorisez les fenêtres surgissantes pour générer le document', 'error'); return; }
  w.document.open(); w.document.write(html); w.document.close();
  if (typeof auditLog === 'function') auditLog('contrat_document', `${d.titre} — ${ct2Nom(c.employeId)}`);
  ct2CloseModal();
}

// ── Export du registre unique du personnel ───────────────────────────────
function ct2ExportRegistre() {
  const r = ct2RegistreData();
  const list = [...ct2All()].sort((a, b) => (a.debut || '').localeCompare(b.debut || ''));
  if (!list.length) { toast('Aucun contrat à exporter', 'info'); return; }

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Registre unique du personnel ${r.an}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:34px;line-height:1.5}
  h1{font-size:19px;margin:0 0 4px}
  .sub{font-size:12px;color:#555;margin-bottom:20px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left}
  th{background:#f2f2f2;font-weight:600}
  .note{font-size:11px;color:#666;margin-top:22px}
  @media print{body{margin:14mm}}
</style></head><body>
<h1>Registre unique du personnel</h1>
<div class="sub">Édité le ${ct2Date(today())} · ${r.inscrits} salarié(s) sous contrat actif · ${r.entrees} entrée(s) et ${r.sorties} sortie(s) en ${r.an}</div>
<table><thead><tr><th>Salarié</th><th>Emploi</th><th>Type de contrat</th><th>Entrée</th><th>Sortie</th><th>Heures/sem.</th><th>Statut</th></tr></thead>
<tbody>${list.map(c => `<tr>
  <td>${escHtml(ct2Nom(c.employeId))}</td>
  <td>${escHtml(c.poste || '')}</td>
  <td>${escHtml(ct2T(c.type).l)}</td>
  <td>${c.debut ? ct2Date(c.debut) : ''}</td>
  <td>${c.fin ? ct2Date(c.fin) : ''}</td>
  <td>${c.heures ? c.heures + ' h' : ''}</td>
  <td>${escHtml(ct2Statut(c).l)}</td>
</tr>`).join('')}</tbody></table>
<div class="note">Registre établi à partir des contrats enregistrés dans INTERNALIS (obligation de l'article L1221-13 du code du travail). Les mentions manquantes doivent être complétées avant archivage.</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Autorisez les fenêtres surgissantes pour exporter le registre', 'error'); return; }
  w.document.open(); w.document.write(html); w.document.close();
  if (typeof auditLog === 'function') auditLog('registre_export', `Registre unique du personnel ${r.an}`);
}

// ── Coût employeur : saisie ──────────────────────────────────────────────
function ct2OpenCout(contratId) {
  if (!ct2IsRH()) { toast('Action réservée à l\'encadrement RH', 'error'); return; }
  if (ct2RefuseSiAbsente(CT2_T_COUT)) return;
  const c = ct2All().find(x => String(x.id) === String(contratId));
  if (!c) return;
  const k = ct2CoutDe(contratId);

  ct2Modal(ct2Coque({
    t: 'Coût employeur', s: ct2Nom(c.employeId) + ' — ' + ct2T(c.type).l, c: '#ea580c', i: CT2_IC.euro,
    b: `<div class="v2-grid2">
          <div>
            <label class="v2-fld-l" for="ct2CoutBrut">Salaire brut mensuel (€)</label>
            <input type="number" id="ct2CoutBrut" class="v2-fld" min="0" step="0.01" value="${k ? escAttr(String(k.brut)) : ''}" placeholder="0"/>
          </div>
          <div>
            <label class="v2-fld-l" for="ct2CoutCharges">Charges patronales (€)</label>
            <input type="number" id="ct2CoutCharges" class="v2-fld" min="0" step="0.01" value="${k ? escAttr(String(k.charges)) : ''}" placeholder="0"/>
          </div>
        </div>
        <div class="v2-note v2-note-ok">${ct2Svg(CT2_IC.euro)}<span>Le coût chargé affiché dans le tableau est la somme des deux montants.</span></div>`,
    f: `<button type="button" class="v2-btn-sec" onclick="ct2CloseModal()">Annuler</button>
        <button type="button" class="v2-btn-pri" onclick="ct2SaveCout('${c.id}')">${ct2Svg(CT2_IC.check, 2.4)}Enregistrer</button>`
  }));
}

async function ct2SaveCout(contratId) {
  const c = ct2All().find(x => String(x.id) === String(contratId));
  if (!c) return;
  const brut = Number((document.getElementById('ct2CoutBrut') || {}).value || 0);
  const charges = Number((document.getElementById('ct2CoutCharges') || {}).value || 0);
  if (brut < 0 || charges < 0) { toast('Les montants doivent être positifs', 'error'); return; }
  const k = ct2CoutDe(contratId);
  const row = { contrat_id: c.id, employe_id: c.employeId || null, brut, charges };
  const saved = await ct2Upsert(CT2_T_COUT, row, k ? k.id : null);
  if (!saved) return;
  if (k) { const i = CT2_COUTS.indexOf(k); CT2_COUTS[i] = saved; } else CT2_COUTS.push(saved);
  if (typeof auditLog === 'function') auditLog('contrat_cout', `Coût employeur — ${ct2Nom(c.employeId)}`);
  toast('Coût employeur enregistré', 'success');
  ct2CloseModal();
  ct2RenderCout();
}

// ── DPAE : saisie ────────────────────────────────────────────────────────
function ct2OpenDpae(contratId) {
  if (!ct2IsRH()) { toast('Action réservée à l\'encadrement RH', 'error'); return; }
  if (ct2RefuseSiAbsente(CT2_T_DPAE)) return;
  const c = ct2All().find(x => String(x.id) === String(contratId));
  if (!c) return;
  const d = ct2DpaeDe(contratId);
  const declaree = !!(d && d.statut === 'declaree');

  ct2Modal(ct2Coque({
    t: 'DPAE & registre', s: ct2Nom(c.employeId) + ' — ' + ct2T(c.type).l, c: '#34d399', i: CT2_IC.shield,
    b: `<div>
          <label class="v2-fld-l">Déclaration préalable à l'embauche</label>
          <div class="v2-seg" id="ct2DpaeSeg">
            <button type="button" class="v2-seg-o${declaree ? '' : ' on'}" data-v="a_declarer" onclick="ct2SegPick(this)">À déclarer</button>
            <button type="button" class="v2-seg-o${declaree ? ' on' : ''}" data-v="declaree" onclick="ct2SegPick(this)">Déclarée</button>
          </div>
        </div>
        <div class="v2-grid2">
          <div>
            <label class="v2-fld-l" for="ct2DpaeDate">Date de déclaration</label>
            <input type="date" id="ct2DpaeDate" class="v2-fld" value="${d && d.declaree_le ? escAttr(d.declaree_le) : ''}"/>
          </div>
          <div>
            <label class="v2-fld-l" for="ct2DpaeRef">Référence URSSAF</label>
            <input type="text" id="ct2DpaeRef" class="v2-fld" value="${d ? escAttr(d.reference || '') : ''}" placeholder="N° d'accusé de réception"/>
          </div>
        </div>
        <div>
          <label class="v2-fld-l">Registre unique du personnel</label>
          <div class="v2-seg" id="ct2RegSeg">
            <button type="button" class="v2-seg-o${d && d.registre ? '' : ' on'}" data-v="0" onclick="ct2SegPick(this)">Non inscrit</button>
            <button type="button" class="v2-seg-o${d && d.registre ? ' on' : ''}" data-v="1" onclick="ct2SegPick(this)">Inscrit</button>
          </div>
        </div>`,
    f: `<button type="button" class="v2-btn-sec" onclick="ct2CloseModal()">Annuler</button>
        <button type="button" class="v2-btn-pri" onclick="ct2SaveDpae('${c.id}')">${ct2Svg(CT2_IC.check, 2.4)}Enregistrer</button>`
  }));
}

// Sélection dans un groupe .v2-seg (gabarit V2)
function ct2SegPick(btn) {
  const g = btn.closest('.v2-seg');
  if (!g) return;
  g.querySelectorAll('.v2-seg-o').forEach(b => b.classList.toggle('on', b === btn));
}
function ct2SegVal(id) {
  const on = document.querySelector('#' + id + ' .v2-seg-o.on');
  return on ? on.getAttribute('data-v') : null;
}

async function ct2SaveDpae(contratId) {
  const c = ct2All().find(x => String(x.id) === String(contratId));
  if (!c) return;
  const statut = ct2SegVal('ct2DpaeSeg') || 'a_declarer';
  const date = (document.getElementById('ct2DpaeDate') || {}).value || null;
  const ref = ((document.getElementById('ct2DpaeRef') || {}).value || '').trim();
  if (statut === 'declaree' && !date) { toast('Renseignez la date de déclaration', 'error'); return; }
  const d = ct2DpaeDe(contratId);
  const row = {
    contrat_id: c.id, employe_id: c.employeId || null,
    statut, declaree_le: statut === 'declaree' ? date : (date || null),
    reference: ref, registre: ct2SegVal('ct2RegSeg') === '1'
  };
  const saved = await ct2Upsert(CT2_T_DPAE, row, d ? d.id : null);
  if (!saved) return;
  if (d) { const i = CT2_DPAE.indexOf(d); CT2_DPAE[i] = saved; } else CT2_DPAE.push(saved);
  if (typeof auditLog === 'function') auditLog('contrat_dpae', `DPAE — ${ct2Nom(c.employeId)}`);
  toast('DPAE enregistrée', 'success');
  ct2CloseModal();
  ct2RenderDpae();
}

// ══ MODALE « CONTRAT » — pièces V2 ═════════════════════════════════════
// Segment de type : écrit dans le <select id="ctType"> lu par js/contrats.js.
function ct2RenderTypeSeg() {
  const seg = document.getElementById('ctTypeSeg');
  const sel = document.getElementById('ctType');
  if (!seg || !sel) return;
  const cour = sel.value || 'cdi';
  seg.innerHTML = CT2_ORDRE.map(k => `
    <button type="button" class="v2-seg-o${k === cour ? ' on' : ''}" onclick="ct2PickType('${k}')">${escHtml(ct2T(k).l)}</button>`).join('');
}
function ct2PickType(k) {
  const sel = document.getElementById('ctType');
  if (!sel) return;
  sel.value = k;
  ct2RenderTypeSeg();
  cmxSyncType();
}

// ── Branchements sur js/contrats.js ─────────────────────────────────────
// L'ancien rendu délègue au module V2 : tous les appelants existants
// (saveContrat, deleteContrat, changement de filtre, initContrats…) marchent.
window.renderContrats = function () { ct2Render(); };

// En-tête interactif de la modale « contrat », version gabarit V2.
window.cmxSyncType = function () {
  const md = document.querySelector('#modalContrat .v2-md');
  if (!md) return;
  const type = (document.getElementById('ctType') || {}).value || 'cdi';
  const t = ct2T(type);
  md.style.setProperty('--mc', t.c);
  ct2RenderTypeSeg();

  // Champ « date de fin » : sans objet sur un CDI.
  const finWrap = document.getElementById('ctFinWrap');
  if (finWrap) finWrap.style.display = type === 'cdi' ? 'none' : '';

  const sub = document.getElementById('cmxSub');
  if (sub) {
    const empSel = document.getElementById('ctEmploye');
    const nom = (empSel && empSel.value && empSel.selectedIndex >= 0) ? empSel.options[empSel.selectedIndex].text : '';
    const h = (document.getElementById('ctHeures') || {}).value;
    const bits = [t.l];
    if (nom) bits.push(nom.trim());
    if (h) bits.push(h + ' h/sem.');
    sub.textContent = bits.join(' · ');
  }
};

// Liste des avenants dans la modale, au style V2.
window.renderAvenantsList = function () {
  const box = document.getElementById('ctAvenantsList');
  if (!box) return;
  const list = (typeof ctAvenants !== 'undefined' && ctAvenants) ? ctAvenants : [];
  box.innerHTML = list.length ? list.map((a, i) => `
    <div class="ct2-av-row">
      <span class="d">${ct2Date(a.date)}</span>
      <span class="x">${escHtml(a.texte || '')}</span>
      <button type="button" class="ct2-av-del" title="Retirer" onclick="removeAvenant(${i})">${ct2Svg(CT2_IC.x, 2.4)}</button>
    </div>`).join('') : '<div class="v2-blk-vide">Aucun avenant.</div>';
};

// Détail du contrat, version sombre (mêmes id que la version héritée).
window.openContratDetail = function (id) {
  // Réservé aux comptes autorisés à éditer, comme la version héritée (le pied
  // de carte « Détail » n'était rendu que sous ctIsCanEdit()).
  if (!ct2CanEdit()) return;
  const c = ct2All().find(x => String(x.id) === String(id));
  if (!c) return;
  const body = document.getElementById('ctDocBody');
  const md = document.querySelector('#modalContratDoc .v2-md');
  if (!body) return;
  const t = ct2T(c.type), st = ct2Statut(c);
  const emp = ct2Emp(c.employeId);
  if (md) md.style.setProperty('--mc', t.c);

  const j = c.fin ? ct2Jours(c.fin) : null;
  const ej = c.essai ? ct2Jours(c.essai) : null;

  const facts = [
    ['Début', ct2Date(c.debut)],
    ['Fin', c.fin ? ct2Date(c.fin) : 'Indéterminée'],
    ['ETP', ct2EtpTxt(c)],
    ['Heures/sem.', c.heures ? c.heures + ' h' : '—'],
    ['Temps de travail', c.temps === 'partiel' ? 'Temps partiel' : 'Temps plein'],
    ['Poste', c.poste || (emp && emp.fonction) || '—']
  ];

  body.innerHTML = `
    <div class="ct2-det-hero" style="--pc:${t.c}">
      <span class="ct2-det-av">${escHtml(ct2Ini(c.employeId))}</span>
      <div style="min-width:0">
        <div class="ct2-det-n">${escHtml(ct2Nom(c.employeId))}</div>
        <div class="ct2-det-m">${escHtml(t.l)} · <span style="color:${st.c}">${st.l}</span></div>
      </div>
    </div>
    <div class="ct2-det-facts">${facts.map(f => `
      <div class="ct2-det-f"><div class="ct2-det-fk">${escHtml(f[0])}</div><div class="ct2-det-fv">${escHtml(String(f[1]))}</div></div>`).join('')}</div>
    ${(j !== null && j >= 0 && j <= 60 && ct2Actif(c))
      ? `<div class="v2-note v2-note-warn">${ct2Svg(CT2_IC.alert)}<span>Ce contrat se termine le ${ct2Date(c.fin)} — J-${j}.</span></div>` : ''}
    ${c.essai ? `<div class="v2-note ${ej !== null && ej >= 0 ? 'v2-note-warn' : 'v2-note-ok'}">${ct2Svg(CT2_IC.clock)}<span>Période d'essai jusqu'au ${ct2Date(c.essai)}${ej !== null && ej >= 0 ? ` — J-${ej}` : ' — échue'}.</span></div>` : ''}
    ${(c.avenants || []).length ? `<div>
      <div class="v2-blk-sub">Avenants</div>
      ${c.avenants.map(a => `<div class="ct2-av-row"><span class="d">${ct2Date(a.date)}</span><span class="x">${escHtml(a.texte || '')}</span></div>`).join('')}
    </div>` : ''}
    ${c.notes ? `<div><div class="v2-blk-sub">Notes</div><div class="ct2-det-note">${escHtml(c.notes)}</div></div>` : ''}
    ${c.fichierPath ? `<div><div class="v2-blk-sub">Document joint</div>
      <button type="button" class="v2-btn-sec" style="width:auto;padding:0 14px" onclick="ctOpenFichier('${c.id}')">${ct2Svg(CT2_IC.clip)}${escHtml(c.fichierNom || 'Ouvrir le document')}</button></div>` : ''}`;

  const btn = document.getElementById('ctDocEditBtn');
  if (btn) {
    btn.style.display = ct2CanEdit() ? '' : 'none';
    btn.onclick = () => { closeModal('modalContratDoc'); openContratModal(c.id); };
  }
  openModal('modalContratDoc');
};

// ── Init ─────────────────────────────────────────────────────────────────
async function ct2Init() {
  if (!document.getElementById('ct2Stats')) return;
  ct2RenderTypeSeg();
  // Le rendu initial de js/contrats.js a pu passer avant le chargement des
  // tables annexes : on recharge puis on redessine.
  await ct2LoadExtras();
  ct2Render();
}
document.addEventListener('DOMContentLoaded', () => { setTimeout(ct2Init, 0); });
if (typeof registerPageInit === 'function') registerPageInit('contrats-v2', ct2Init);

// Constantes exposées explicitement : un `const` de premier niveau ne crée pas
// de propriété sur window (lecture depuis une iframe ou un onclick inline).
window.CT2_TYPE = CT2_TYPE;
window.CT2_SQL = CT2_SQL;
window.CT2_DOCS = CT2_DOCS;
window.ct2Render = ct2Render;
window.ct2SetType = ct2SetType;
window.ct2SetHisto = ct2SetHisto;
window.ct2OpenGen = ct2OpenGen;
window.ct2GenererDoc = ct2GenererDoc;
window.ct2ExportRegistre = ct2ExportRegistre;
window.ct2OpenCout = ct2OpenCout;
window.ct2SaveCout = ct2SaveCout;
window.ct2OpenDpae = ct2OpenDpae;
window.ct2SaveDpae = ct2SaveDpae;
window.ct2SegPick = ct2SegPick;
window.ct2PickType = ct2PickType;
window.ct2CloseModal = ct2CloseModal;
window.ct2LoadExtras = ct2LoadExtras;
