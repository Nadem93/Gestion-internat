// ── ENTRETIENS PROFESSIONNELS (RH) — DESIGN V2 ────────────────────────────
// Reproduit la maquette « Entretien pro (RH) » : tuiles statistiques, chips de
// type, tableau des entretiens, bloc « échéances légales », rail (taux de
// réalisation, souhaits d'évolution, actions de formation) puis les blocs bas
// de page (trame d'entretien, objectifs N-1, état récapitulatif 6 ans, compte
// rendu & signature, campagne annuelle).
//
// ⚠ RÈGLE MÉTIER : l'entretien n'attribue JAMAIS de note chiffrée à un salarié.
// Là où la maquette affichait un pourcentage d'atteinte par objectif, ce module
// affiche un positionnement QUALITATIF (Atteint / Partiellement atteint /
// Non atteint / En cours). Aucune note, aucune moyenne, aucun classement.
//
// Les données et les actions des entretiens restent celles de js/entretiens.js
// et js/entretiens-supabase.js (aucun de ces deux fichiers n'est réécrit).
// Les blocs de la maquette sans source en base s'appuient sur les tables créées
// par migration-entretiens.sql — tant qu'il n'est pas exécuté, la lecture
// renvoie [] avec un console.warn et l'écriture est refusée par un toast
// nommant le fichier. Aucune valeur n'est inventée.

const ET2_SQL = 'migration-entretiens.sql';

const ET2_T_SOUH = 'entretien_souhaits';
const ET2_T_ACT  = 'entretien_actions';
const ET2_T_OBJ  = 'entretien_objectifs';
const ET2_T_SIG  = 'entretien_signatures';
const ET2_T_R6   = 'entretien_recap6';

const ET2_IC = {
  chat:   '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  alert:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  book:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  bell:   '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  x:      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  print:  '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  back:   '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  save:   '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  mail:   '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>'
};

// Types d'entretien : ceux déjà en base + les deux types réglementaires
// dessinés dans la maquette (bilan à 6 ans, retour d'absence).
const ET2_TYPE = {
  annuel:        { l: 'Annuel',             c: '#db2777' },
  professionnel: { l: 'Professionnel',      c: '#f472b6' },
  suivi:         { l: 'Suivi',              c: '#22d3ee' },
  bilan6:        { l: 'Bilan 6 ans',        c: '#a855f7' },
  retour:        { l: "Retour d'absence",   c: '#0ea5e9' }
};
// Types qui satisfont l'obligation légale d'entretien professionnel (2 ans)
const ET2_TYPE_LEGAL = ['annuel', 'professionnel', 'bilan6'];

const ET2_ST = {
  realise:  { l: 'Réalisé',   c: '#10b981' },
  planifie: { l: 'Planifié',  c: '#22d3ee' },
  retard:   { l: 'En retard', c: '#ef4444' }
};

// Atteinte des objectifs — QUALITATIVE, jamais chiffrée.
const ET2_ATT = {
  atteint: { l: 'Atteint',                c: '#10b981' },
  partiel: { l: 'Partiellement atteint',  c: '#f59e0b' },
  encours: { l: 'En cours',               c: '#22d3ee' },
  non:     { l: 'Non atteint',            c: '#fb7185' }
};
const ET2_ATT_ORDRE = ['encours', 'partiel', 'atteint', 'non'];

const ET2_CLR = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];

let ET2_SOUH = [], ET2_ACT = [], ET2_OBJ = [], ET2_SIG = [], ET2_R6 = [];
const ET2_MISS = new Set();
let ET2_SEL = null;          // id de l'entretien mis en avant dans le bas de page
let ET2_MD_MODE = null;      // formulaire ouvert dans la modale de la page

// ── Utilitaires ──────────────────────────────────────────────────────────
function et2Esc(s) { return (typeof escHtml === 'function' ? escHtml(String(s ?? '')) : String(s ?? '')); }
function et2EscAttr(s) { return et2Esc(s).replace(/"/g, '&quot;'); }
function et2Svg(path, w) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${w ? ` style="width:${w}px;height:${w}px"` : ''}>${path}</svg>`; }
// Périmètre de pilotage RH. On garde EXACTEMENT le contrôle d'accès de la page
// d'origine (js/entretiens.js s'appuyait sur Auth.isAdmin()) : la migration ne
// doit desserrer aucun droit sur des données de carrière et d'évaluation.
function et2IsRH() { return typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin(); }
function et2Ini(prenom, nom) {
  return ((prenom || '').trim().charAt(0) + (nom || '').trim().charAt(0)).toUpperCase() || '?';
}
function et2Employes() { return (typeof _etEmployesCache !== 'undefined' ? _etEmployesCache : []) || []; }
function et2Emp(id) { return et2Employes().find(e => String(e.id) === String(id)) || null; }
function et2EmpNom(e) { return e ? `${e.prenom || ''} ${e.nom || ''}`.trim() : ''; }
function et2Couleur(id) {
  const emp = et2Emp(id);
  if (emp && emp.color) return emp.color;
  const list = et2Employes();
  const i = Math.max(0, list.findIndex(e => String(e.id) === String(id)));
  return ET2_CLR[i % ET2_CLR.length];
}
function et2Liste() { return (typeof _etCache !== 'undefined' ? _etCache : []) || []; }
function et2TypeInfo(t) { return ET2_TYPE[t] || { l: (typeof ENTRETIEN_TYPE_LABELS !== 'undefined' && ENTRETIEN_TYPE_LABELS[t]) || t || '—', c: '#818cf8' }; }
function et2Aujourdhui() { return (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10)); }
function et2Statut(e) {
  if (e.statut === 'realise') return 'realise';
  if (e.date && e.date < et2Aujourdhui()) return 'retard';
  return 'planifie';
}
function et2Date(d) { return d ? (typeof formatDate === 'function' ? formatDate(d) : d) : '—'; }
function et2Annee(d) { const y = parseInt(String(d || '').slice(0, 4), 10); return Number.isFinite(y) ? y : null; }
function et2MoisEcoules(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  const n = new Date();
  return (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
}
function et2Avatar(empId, nom, cls) {
  const emp = et2Emp(empId);
  const c = et2Couleur(empId);
  const ini = emp ? et2Ini(emp.prenom, emp.nom) : et2Ini(...String(nom || '').split(' '));
  if (emp && emp.photo) return `<span class="et2-av ${cls || ''}"><img src="${et2EscAttr(emp.photo)}" alt=""/></span>`;
  return `<span class="et2-av ${cls || ''}" style="background:${et2EscAttr(c)}">${et2Esc(ini)}</span>`;
}

// ── Accès Supabase (dégradation douce si la table n'existe pas) ──────────
function et2Absente(e) {
  const msg = String((e && (e.message || e.details || e.hint)) || '');
  return (e && e.code === '42P01') || /does not exist|Could not find the table|schema cache/i.test(msg);
}
async function et2Select(table, order) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return [];
  try {
    let q = supabaseClient.from(table).select('*');
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q;
    if (error) {
      if (et2Absente(error)) {
        ET2_MISS.add(table);
        console.warn(`[entretiens] table « ${table} » absente — exécutez ${ET2_SQL}`);
      } else {
        console.error(`[entretiens] lecture ${table}`, error);
      }
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`[entretiens] lecture ${table} impossible`, e);
    return [];
  }
}
function et2RefuseSiAbsente(table) {
  if (!ET2_MISS.has(table)) return false;
  toast(`Table « ${table} » absente — exécutez ${ET2_SQL}`, 'error');
  return true;
}
function et2RefuseSiPasRH() {
  if (et2IsRH()) return false;
  toast('Action réservée à l’encadrement RH', 'error');
  return true;
}
async function et2Upsert(table, row, id) {
  if (et2RefuseSiPasRH() || et2RefuseSiAbsente(table)) return null;
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
    if (et2Absente(e)) { ET2_MISS.add(table); toast(`Table « ${table} » absente — exécutez ${ET2_SQL}`, 'error'); return null; }
    console.error(`[entretiens] écriture ${table}`, e);
    toast('Erreur : ' + (e?.message || e), 'error');
    return null;
  }
}
async function et2Delete(table, id) {
  if (et2RefuseSiPasRH() || et2RefuseSiAbsente(table)) return false;
  try {
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`[entretiens] suppression ${table}`, e);
    toast('Erreur : ' + (e?.message || e), 'error');
    return false;
  }
}

async function et2LoadExtras() {
  const rh = et2IsRH();
  if (!rh) {
    // Un salarié n'accède ni au récapitulatif 6 ans des autres, ni au plan
    // d'actions global : on ne charge que ce qui concerne sa propre trame.
    const [obj, sig] = await Promise.all([et2Select(ET2_T_OBJ, 'created_at'), et2Select(ET2_T_SIG, 'created_at')]);
    const moi = String(et2MonEmployeId());
    ET2_SOUH = []; ET2_ACT = []; ET2_R6 = [];
    ET2_OBJ = obj.filter(o => String(o.employe_id) === moi);
    // Les signatures ne sont affichées que pour l'entretien sélectionné, lequel
    // appartient déjà au périmètre du salarié (et2Perimetre).
    ET2_SIG = sig;
    return;
  }
  const [souh, act, obj, sig, r6] = await Promise.all([
    et2Select(ET2_T_SOUH, 'created_at'),
    et2Select(ET2_T_ACT, 'created_at'),
    et2Select(ET2_T_OBJ, 'created_at'),
    et2Select(ET2_T_SIG, 'created_at'),
    rh ? et2Select(ET2_T_R6, 'created_at') : Promise.resolve([])
  ]);
  ET2_SOUH = souh; ET2_ACT = act; ET2_OBJ = obj; ET2_SIG = sig; ET2_R6 = r6;
}

// ── Périmètre selon le rôle ──────────────────────────────────────────────
// Un salarié ne voit QUE ses propres entretiens (règle héritée de
// js/entretiens.js) ; les blocs de pilotage RH lui sont masqués.
function et2MonEmployeId() {
  if (typeof entretienCurrentUser === 'function') return entretienCurrentUser().employeId;
  return null;
}
function et2Perimetre() {
  const list = et2Liste();
  if (et2IsRH()) return list;
  const moi = et2MonEmployeId();
  return list.filter(e => String(e.employeId) === String(moi));
}
function et2Filtrees() {
  const fe = (document.getElementById('etFiltreEmploye') || {}).value || '';
  const ft = (document.getElementById('etFiltreType') || {}).value || '';
  const fs = (document.getElementById('etFiltreStatut') || {}).value || '';
  return et2Perimetre().filter(e => {
    if (fe && String(e.employeId) !== String(fe)) return false;
    if (ft && e.type !== ft) return false;
    if (fs && e.statut !== fs) return false;
    return true;
  }).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

// ── Rendu : tuiles statistiques ──────────────────────────────────────────
function et2RenderStats() {
  const el = document.getElementById('et2Stats');
  if (!el) return;
  const an = String(new Date().getFullYear());
  const list = et2Perimetre();
  const realises = list.filter(e => e.statut === 'realise' && String(e.date || '').startsWith(an)).length;
  const planifies = list.filter(e => et2Statut(e) === 'planifie').length;
  const retard = list.filter(e => et2Statut(e) === 'retard').length;
  const effectif = et2Effectif();
  const taux = effectif ? Math.round(realises / effectif * 100) : null;

  const tiles = [
    { n: realises, l: `Réalisés (${an})`, c: '#10b981', i: ET2_IC.check, s: 'entretiens menés cette année' },
    { n: planifies, l: 'Planifiés', c: '#22d3ee', i: ET2_IC.cal, s: 'à venir dans l’agenda' },
    { n: retard, l: 'En retard', c: '#ef4444', i: ET2_IC.alert, s: 'date dépassée, à reprogrammer' },
    // Un taux d'établissement n'a pas de sens dans la vue d'un salarié :
    // on lui montre le volume de ses propres entretiens.
    et2IsRH()
      ? { n: taux === null ? '—' : taux + ' %', l: 'Taux de réalisation', c: '#db2777', i: ET2_IC.chat, s: 'sur l’effectif actif' }
      : { n: list.length, l: 'Mes entretiens', c: '#db2777', i: ET2_IC.chat, s: 'total, tous statuts' }
  ];
  el.innerHTML = tiles.map(t => `
    <div class="dc-kpi" style="--dc-c:${t.c}">
      <div class="dc-kpi-top"><span class="dc-kpi-label">${et2Esc(t.l)}</span><span class="dc-kpi-ico" style="color:${t.c}">${et2Svg(t.i, 16)}</span></div>
      <div class="dc-kpi-val">${et2Esc(t.n)}</div>
      <div class="dc-kpi-sub">${et2Esc(t.s)}</div>
    </div>`).join('');
}

// Effectif de référence : salariés actifs (RH) ou 1 (vue salarié)
function et2Effectif() {
  if (!et2IsRH()) return 1;
  const actifs = et2Employes().filter(e => (e.statut || 'actif') === 'actif');
  return actifs.length;
}

// ── Rendu : chips de type ────────────────────────────────────────────────
function et2RenderChips() {
  const el = document.getElementById('et2Chips');
  if (!el) return;
  const list = et2Perimetre();
  const cur = (document.getElementById('etFiltreType') || {}).value || '';
  const defs = [{ id: '', l: 'Tous', c: '#818cf8' }]
    .concat(Object.keys(ET2_TYPE).map(k => ({ id: k, l: ET2_TYPE[k].l, c: ET2_TYPE[k].c })));
  el.innerHTML = defs.map(d => {
    const n = d.id ? list.filter(e => e.type === d.id).length : list.length;
    return `<button type="button" class="v2-chip-f${cur === d.id ? ' on' : ''}" onclick="et2SetType('${d.id}')">
      <span class="dot" style="background:${d.c}"></span>${et2Esc(d.l)}<span class="n">${n}</span></button>`;
  }).join('');
}
function et2SetType(t) {
  const s = document.getElementById('etFiltreType');
  if (s) s.value = t;
  et2Render();
}

// ── Rendu : tableau des entretiens ───────────────────────────────────────
function et2RenderTable() {
  const el = document.getElementById('et2Table');
  if (!el) return;
  const rh = et2IsRH();
  const rows = et2Filtrees();
  if (!rows.length) {
    el.innerHTML = `<div class="v2-blk-vide" style="padding:26px;text-align:center">Aucun entretien pour ce filtre.</div>`;
    return;
  }
  if (!rows.some(r => r.id === ET2_SEL)) ET2_SEL = rows[0].id;

  const corps = rows.map(e => {
    const emp = et2Emp(e.employeId);
    const nom = et2EmpNom(emp) || e.employeNom || '—';
    const ti = et2TypeInfo(e.type);
    const st = ET2_ST[et2Statut(e)];
    const prec = et2Precedent(e);
    return `<tr class="${e.id === ET2_SEL ? 'on' : ''}" onclick="et2Selectionner('${et2EscAttr(e.id)}')">
      <td style="border-left:3px solid ${ti.c}"><div class="et2-emp">${et2Avatar(e.employeId, nom)}
        <div style="min-width:0"><div class="et2-emp-n">${et2Esc(nom)}</div>
        <div class="et2-emp-f">${et2Esc((emp && emp.poste) || '—')}</div></div></div></td>
      <td><span class="dc-badge" style="background:${ti.c}1f;color:${ti.c};border:1px solid ${ti.c}44">${et2Esc(ti.l)}</span></td>
      <td>${et2Esc(et2Date(e.date))}</td>
      <td style="color:var(--v2-t6)">${et2Esc(prec ? et2Date(prec.date) : '—')}</td>
      <td><span class="dc-badge" style="background:${st.c}1f;color:${st.c};border:1px solid ${st.c}44"><span class="d" style="background:${st.c}"></span>${et2Esc(st.l)}</span></td>
      ${rh ? `<td><div class="et2-acts" onclick="event.stopPropagation()">
        <button type="button" class="et2-ib" title="Export PDF" onclick="exportEntretienPdf('${et2EscAttr(e.id)}')">${et2Svg(ET2_IC.print)}</button>
        ${e.statut !== 'realise' ? `<button type="button" class="et2-ib" title="Modifier" onclick="openEntretienModal('${et2EscAttr(e.id)}')">${et2Svg(ET2_IC.pen)}</button>` : ''}
        <button type="button" class="et2-ib del" title="Supprimer" onclick="supprimerEntretien('${et2EscAttr(e.id)}')">${et2Svg(ET2_IC.trash)}</button>
      </div></td>` : ''}
    </tr>`;
  }).join('');

  el.innerHTML = `<div class="dc-card">
    <div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#db277722;color:#db2777">${et2Svg(ET2_IC.chat, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Suivi RH</div><div class="dc-title">Entretiens</div></div>
    </div><span class="dc-pill dim">${rows.length} ligne${rows.length > 1 ? 's' : ''}</span></div>
    <div class="et2-tw" style="border:none;border-radius:0"><div class="et2-tscroll"><table>
    <thead><tr>
      <th>Salarié</th><th>Type</th><th>Date entretien</th><th>Précédent</th><th>Statut</th>${rh ? '<th></th>' : ''}
    </tr></thead>
    <tbody>${corps}</tbody></table></div></div></div>`;
}

// Entretien précédent du même salarié (date antérieure la plus proche)
function et2Precedent(e) {
  return et2Liste()
    .filter(x => String(x.employeId) === String(e.employeId) && x.id !== e.id
      && x.statut === 'realise' && String(x.date || '') < String(e.date || ''))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
}

function et2Selectionner(id) { ET2_SEL = id; et2Render(); }

// ── Rendu : échéances légales (calculées, jamais inventées) ──────────────
// Obligation : un entretien professionnel au moins tous les 2 ans, et un état
// récapitulatif tous les 6 ans (art. L.6315-1 du code du travail).
function et2Echeances() {
  const out = [];
  et2Employes().filter(e => (e.statut || 'actif') === 'actif').forEach(emp => {
    const faits = et2Liste()
      .filter(x => String(x.employeId) === String(emp.id) && x.statut === 'realise'
        && ET2_TYPE_LEGAL.includes(x.type))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const dernier = faits[0] || null;
    const ref = dernier ? dernier.date : (emp.dateEmbauche || '');
    const mois = et2MoisEcoules(ref);
    const planifie = et2Liste().some(x => String(x.employeId) === String(emp.id)
      && x.statut !== 'realise' && ET2_TYPE_LEGAL.includes(x.type));

    if (mois !== null && mois >= 24 && !planifie) {
      out.push({
        emp, rang: 0,
        detail: dernier ? `Entretien professionnel dû (dernier ${et2Date(dernier.date)})`
                        : `Aucun entretien depuis l’embauche (${et2Date(emp.dateEmbauche)})`,
        tag: 'Échu', tc: '#ef4444'
      });
    } else if (mois !== null && mois >= 21 && !planifie) {
      out.push({ emp, rang: 1, detail: `Échéance des 2 ans proche (dernier ${dernier ? et2Date(dernier.date) : et2Date(emp.dateEmbauche)})`, tag: '< 3 mois', tc: '#f59e0b' });
    }

    const anciennete = et2MoisEcoules(emp.dateEmbauche);
    const bilanFait = faits.some(x => x.type === 'bilan6' && et2MoisEcoules(x.date) !== null && et2MoisEcoules(x.date) < 72);
    if (anciennete !== null && anciennete >= 72 && !bilanFait) {
      out.push({ emp, rang: 0, detail: 'Bilan à 6 ans — état récapitulatif à établir', tag: 'Bilan 6 ans', tc: '#a855f7' });
    }
  });
  return out.sort((a, b) => a.rang - b.rang);
}

function et2RenderEcheances() {
  const el = document.getElementById('et2Echeances');
  if (!el) return;
  if (!et2IsRH()) { el.innerHTML = ''; return; }
  const list = et2Echeances();
  el.innerHTML = `<div class="dc-card">
    <div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:rgba(239,68,68,.12);color:#ef4444">${et2Svg(ET2_IC.alert, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Obligation 2 ans / bilan 6 ans</div><div class="dc-title">Échéances légales</div></div>
    </div><span class="dc-pill dim">${list.length} salarié${list.length > 1 ? 's' : ''}</span></div>
    <div class="dc-body">
    ${list.length ? list.slice(0, 8).map(x => `
      <div class="et2-li" style="border-left:3px solid ${x.tc};padding-left:11px">${et2Avatar(x.emp.id, et2EmpNom(x.emp), 'et2-av-sm')}
        <div class="et2-li-b"><div class="et2-li-t">${et2Esc(et2EmpNom(x.emp))}</div>
        <div class="et2-li-s">${et2Esc(x.detail)}</div></div>
        <span class="dc-badge" style="background:${x.tc}1f;color:${x.tc};border:1px solid ${x.tc}44"><span class="d" style="background:${x.tc}"></span>${et2Esc(x.tag)}</span>
      </div>`).join('')
      : `<div class="v2-blk-vide">Aucune échéance dépassée : tous les salariés actifs sont à jour.</div>`}
    </div>
  </div>`;
}

// ── Rendu : rail ─────────────────────────────────────────────────────────
function et2RenderRail() {
  const el = document.getElementById('et2Rail');
  if (!el) return;
  const rh = et2IsRH();
  const an = new Date().getFullYear();
  const realises = et2Perimetre().filter(e => e.statut === 'realise' && String(e.date || '').startsWith(String(an))).length;
  const effectif = et2Effectif();
  const taux = effectif ? Math.min(100, Math.round(realises / effectif * 100)) : 0;

  const souhaits = ET2_SOUH.slice(0, 8);
  const actions = ET2_ACT.slice(0, 8);

  // Vue salarié : ni registre des souhaits, ni plan d'actions global, ni taux
  // d'établissement — seulement le suivi de ses propres entretiens.
  if (!rh) {
    const mesRealises = et2Perimetre().filter(e => e.statut === 'realise').length;
    const mesPlanifies = et2Perimetre().filter(e => et2Statut(e) === 'planifie').length;
    const mesRetard = et2Perimetre().filter(e => et2Statut(e) === 'retard').length;
    const lignes = [
      { l: 'Réalisés', v: mesRealises, c: '#34d399' },
      { l: 'Planifiés', v: mesPlanifies, c: '#22d3ee' },
      { l: 'En retard', v: mesRetard, c: '#fb7185' }
    ];
    el.innerHTML = `<div class="dc-card">
      <div class="dc-head"><div class="dc-head-l">
        <span class="dc-chip" style="background:#db277722;color:#db2777">${et2Svg(ET2_IC.chat, 16)}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Mon suivi</div><div class="dc-title">Mes entretiens</div></div>
      </div></div>
      <div class="dc-body">
      ${lignes.map(x => `<div class="et2-li" style="border-left:3px solid ${x.c};padding-left:11px">
        <span class="et2-li-x">${et2Esc(x.l)}</span>
        <span class="v2-num" style="font-size:12px;font-weight:700;color:${x.c}">${x.v}</span></div>`).join('')}
      <div style="font-size:11px;color:var(--v2-t6);margin-top:12px">Vos comptes rendus d’entretien sont consultables et imprimables ci-dessous.</div>
      </div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="dc-card">
      <div class="dc-head"><div class="dc-head-l">
        <span class="dc-chip" style="background:#db277722;color:#db2777">${et2Svg(ET2_IC.check, 16)}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Campagne ${an}</div><div class="dc-title">Taux de réalisation</div></div>
      </div><span class="dc-pill">${effectif ? taux + ' %' : '—'}</span></div>
      <div class="dc-body">
        <div class="al-prog-bar" style="margin-bottom:10px"><span style="width:${taux}%;background:linear-gradient(90deg,#db2777,#f472b6)"></span></div>
        <div style="font-size:11px;color:var(--v2-t6)">${realises} entretien${realises > 1 ? 's' : ''} réalisé${realises > 1 ? 's' : ''} sur ${effectif} salarié${effectif > 1 ? 's actifs' : ' actif'} en ${an}.</div>
      </div>
    </div>

    <div class="dc-card">
      <div class="dc-head"><div class="dc-head-l">
        <span class="dc-chip" style="background:#818cf822;color:#818cf8">${et2Svg(ET2_IC.users, 16)}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Registre RH</div><div class="dc-title">Souhaits d’évolution exprimés</div></div>
      </div><span class="dc-pill dim">${ET2_SOUH.length}</span></div>
      <div class="dc-body">
      ${souhaits.length ? souhaits.map(s => {
        const emp = et2Emp(s.employe_id);
        return `<div class="et2-li" style="border-left:3px solid #818cf8;padding-left:11px">${et2Avatar(s.employe_id, '', 'et2-av-xs')}
          <div class="et2-li-b"><div class="et2-li-t" style="font-size:12px">${et2Esc(et2EmpNom(emp) || 'Salarié')}</div>
          <div class="et2-li-s">${et2Esc(s.souhait)}${s.horizon ? ' · ' + et2Esc(s.horizon) : ''}</div></div>
          ${rh ? `<button type="button" class="et2-ib del" title="Supprimer" onclick="et2SupprSouhait('${et2EscAttr(s.id)}')">${et2Svg(ET2_IC.x)}</button>` : ''}
        </div>`;
      }).join('') : `<div class="v2-blk-vide">${et2VideMsg(ET2_T_SOUH, 'Aucun souhait enregistré.')}</div>`}
      ${rh ? `<button type="button" class="et2-add" onclick="et2OpenModal('souhait')">${et2Svg(ET2_IC.plus)}Ajouter un souhait</button>` : ''}
      </div>
    </div>

    <div class="dc-card">
      <div class="dc-head"><div class="dc-head-l">
        <span class="dc-chip" style="background:rgba(16,185,129,.14);color:#10b981">${et2Svg(ET2_IC.book, 16)}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Plan de formation</div><div class="dc-title">Actions de formation décidées</div></div>
      </div><span class="dc-pill dim">${ET2_ACT.length}</span></div>
      <div class="dc-body">
      ${actions.length ? actions.map(a => `
        <div class="et2-li" style="border-left:3px solid #4ade80;padding-left:11px">
          <span class="et2-li-x">${et2Esc(a.libelle)}</span>
          <span style="font-size:10.5px;color:var(--v2-t6)">${et2Esc(a.beneficiaire || '—')}</span>
          ${rh ? `<button type="button" class="et2-ib del" title="Supprimer" onclick="et2SupprAction('${et2EscAttr(a.id)}')">${et2Svg(ET2_IC.x)}</button>` : ''}
        </div>`).join('') : `<div class="v2-blk-vide">${et2VideMsg(ET2_T_ACT, 'Aucune action de formation décidée.')}</div>`}
      ${rh ? `<button type="button" class="et2-add" onclick="et2OpenModal('action')">${et2Svg(ET2_IC.plus)}Ajouter une action</button>` : ''}
      </div>
    </div>`;
}

function et2VideMsg(table, def) {
  return ET2_MISS.has(table) ? `Table « ${table} » absente — exécutez ${ET2_SQL}.` : def;
}

// ── Rendu : blocs bas de page ────────────────────────────────────────────
function et2Selection() { return et2Liste().find(e => e.id === ET2_SEL) || null; }

function et2RenderFeatures() {
  const el = document.getElementById('et2Features');
  if (!el) return;
  const e = et2Selection();
  if (!e) { el.innerHTML = ''; return; }
  const emp = et2Emp(e.employeId);
  const nom = et2EmpNom(emp) || e.employeNom || 'Salarié';
  el.innerHTML = `
    <div class="et2-feat1">${et2BlocTrame(e, nom)}${et2BlocObjectifs(e, nom)}</div>
    <div class="et2-feat2"${et2IsRH() ? '' : ' style="grid-template-columns:1fr"'}>${et2BlocRecap6(e, nom)}${et2BlocSignature(e, nom)}${et2BlocCampagne()}</div>`;
}

// Trame : chaque rubrique est « Rempli » ou « À compléter » selon ce qui est
// réellement saisi dans l'entretien — rien n'est supposé.
function et2BlocTrame(e, nom) {
  const grille = (typeof etGrilleRows === 'function') ? etGrilleRows(e.grille) : [];
  const souhait = ET2_SOUH.some(s => String(s.employe_id) === String(e.employeId));
  const items = [
    { l: 'Bilan de la période écoulée', ok: !!(e.bilan || '').trim() },
    { l: 'Positionnement sur le référentiel métier', ok: grille.length > 0, n: grille.length ? `${grille.length} compétence${grille.length > 1 ? 's' : ''}` : '' },
    // Le registre des souhaits est un outil de pilotage RH : il n'est pas
    // chargé côté salarié, donc la rubrique n'est affichée que pour l'encadrement.
    ...(et2IsRH() ? [{ l: 'Souhaits d’évolution / mobilité', ok: souhait }] : []),
    { l: 'Besoins de formation', ok: !!(e.formations || '').trim() },
    { l: 'Objectifs pour l’année', ok: !!(e.objectifs || '').trim() }
  ];
  const done = items.filter(i => i.ok).length;
  const complete = done === items.length;
  const cc = complete ? '#34d399' : '#f59e0b';
  return `<div class="dc-card">
    <div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#22d3ee22;color:#22d3ee">${et2Svg(ET2_IC.file, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Trame d’entretien</div><div class="dc-title">${et2Esc(nom)}</div></div>
    </div><span class="dc-badge" style="background:${cc}1f;color:${cc};border:1px solid ${cc}44"><span class="d" style="background:${cc}"></span>${complete ? 'Complétée' : done + '/' + items.length}</span></div>
    <div class="dc-body">
    ${items.map(i => `<div class="et2-li" style="gap:12px">
      <span class="et2-tr-ico" style="--pc:${i.ok ? '#34d399' : '#f59e0b'}">${et2Svg(i.ok ? ET2_IC.check : ET2_IC.pen)}</span>
      <span class="et2-li-x">${et2Esc(i.l)}${i.n ? ` <span style="color:var(--v2-t7);font-size:11px">· ${et2Esc(i.n)}</span>` : ''}</span>
      <span class="dc-badge" style="background:${i.ok ? '#34d3991f' : '#f59e0b1f'};color:${i.ok ? '#34d399' : '#f59e0b'};border:1px solid ${i.ok ? '#34d39944' : '#f59e0b44'}">${i.ok ? 'Rempli' : 'À compléter'}</span>
    </div>`).join('')}
    ${et2IsRH() && e.statut !== 'realise' ? `<button type="button" class="et2-add" onclick="openEntretienModal('${et2EscAttr(e.id)}')">${et2Svg(ET2_IC.pen)}Ouvrir la trame</button>` : ''}
    </div>
  </div>`;
}

// Objectifs de l'année précédente : atteinte QUALITATIVE, jamais chiffrée.
function et2BlocObjectifs(e, nom) {
  const rh = et2IsRH();
  const objs = ET2_OBJ.filter(o => String(o.employe_id) === String(e.employeId))
    .sort((a, b) => (b.annee || 0) - (a.annee || 0));
  const anRef = objs.length ? objs[0].annee : ((et2Annee(e.date) || new Date().getFullYear()) - 1);
  return `<div class="dc-card">
    <div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#f59e0b22;color:#f59e0b">${et2Svg(ET2_IC.check, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Atteinte qualitative</div><div class="dc-title">Objectifs ${anRef ? 'N-1 (' + anRef + ')' : 'N-1'}</div></div>
    </div>${objs.length ? `<span class="dc-pill dim">${objs.length}</span>` : ''}</div>
    <div class="dc-body">
    <div style="font-size:11px;color:var(--v2-t7);margin:0 0 10px">Positionnement qualitatif partagé avec le salarié — sans note ni classement.</div>
    ${objs.length ? objs.map(o => {
      const a = ET2_ATT[o.atteinte] || ET2_ATT.encours;
      return `<div class="et2-obj" style="border-left:3px solid ${a.c};padding-left:11px">
        <span class="et2-obj-l">${et2Esc(o.libelle)}</span>
        <button type="button" class="et2-obj-b" style="--pc:${a.c}" ${rh ? `onclick="et2CycleObjectif('${et2EscAttr(o.id)}')" title="Changer le positionnement"` : 'disabled'}>${et2Esc(a.l)}</button>
        ${rh ? `<button type="button" class="et2-ib del" title="Supprimer" onclick="et2SupprObjectif('${et2EscAttr(o.id)}')">${et2Svg(ET2_IC.x)}</button>` : ''}
      </div>`;
    }).join('') : `<div class="v2-blk-vide">${et2VideMsg(ET2_T_OBJ, 'Aucun objectif enregistré pour ' + et2Esc(nom) + '.')}</div>`}
    ${rh ? `<button type="button" class="et2-add" onclick="et2OpenModal('objectif')">${et2Svg(ET2_IC.plus)}Ajouter un objectif</button>` : ''}
    </div>
  </div>`;
}

// État récapitulatif 6 ans — 3 obligations de l'art. L.6315-1.
function et2BlocRecap6(e, nom) {
  const rh = et2IsRH();
  // Le récapitulatif à 6 ans s'appuie sur des données RH qui ne sont pas
  // chargées côté salarié : on ne montre pas un bloc de « — ».
  if (!rh) return '';
  const nb = et2Liste().filter(x => String(x.employeId) === String(e.employeId)
    && x.statut === 'realise' && ET2_TYPE_LEGAL.includes(x.type)
    && et2MoisEcoules(x.date) !== null && et2MoisEcoules(x.date) < 72).length;
  const r6 = ET2_R6.find(r => String(r.employe_id) === String(e.employeId)) || null;
  const okEnt = nb >= 3;
  const items = [
    { l: 'Entretiens tous les 2 ans', tag: `${nb} / 3`, c: okEnt ? '#34d399' : '#f59e0b', ok: okEnt, ico: okEnt ? ET2_IC.check : ET2_IC.pen },
    { l: 'A suivi une formation', tag: r6 ? (r6.formation_suivie ? 'Oui' : 'Non') : '—', c: r6 ? (r6.formation_suivie ? '#34d399' : '#fca5a5') : '#8095b4', ok: !!(r6 && r6.formation_suivie), ico: r6 ? (r6.formation_suivie ? ET2_IC.check : ET2_IC.x) : ET2_IC.clock, champ: 'formation_suivie' },
    { l: 'Certification / VAE ou progression', tag: r6 ? (r6.progression ? 'Oui' : 'Non') : '—', c: r6 ? (r6.progression ? '#34d399' : '#fca5a5') : '#8095b4', ok: !!(r6 && r6.progression), ico: r6 ? (r6.progression ? ET2_IC.check : ET2_IC.x) : ET2_IC.clock, champ: 'progression' }
  ];
  const conforme = items.every(i => i.ok);
  const cc = conforme ? '#34d399' : '#f59e0b';
  return `<div class="dc-card">
    <div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:rgba(168,85,247,.14);color:#a855f7">${et2Svg(ET2_IC.shield, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Contrôle des 3 obligations</div><div class="dc-title">État récapitulatif 6 ans</div></div>
    </div><span class="dc-badge" style="background:${cc}1f;color:${cc};border:1px solid ${cc}44"><span class="d" style="background:${cc}"></span>${conforme ? 'Conforme' : 'À vérifier'}</span></div>
    <div class="dc-body">
    <div class="et2-tint-s" style="margin:0 0 12px">${et2Esc(nom)}</div>
    ${items.map(i => `<div class="et2-li" style="border-left:3px solid ${i.c};padding-left:11px">
      <span style="color:${i.c};display:flex">${et2Svg(i.ico, 15)}</span>
      <span class="et2-li-x">${et2Esc(i.l)}</span>
      ${i.champ && rh
        ? `<button type="button" class="et2-obj-b" style="--pc:${i.c}" onclick="et2ToggleRecap6('${et2EscAttr(e.employeId)}','${i.champ}')" title="Basculer">${et2Esc(i.tag)}</button>`
        : `<span class="dc-badge" style="background:${i.c}1f;color:${i.c};border:1px solid ${i.c}44">${et2Esc(i.tag)}</span>`}
    </div>`).join('')}
    ${!r6 && rh ? `<div class="v2-blk-vide" style="margin-top:8px">${et2VideMsg(ET2_T_R6, 'Les deux dernières obligations ne sont pas encore renseignées.')}</div>` : ''}
    ${conforme ? '' : `<div class="et2-note">${et2Svg(ET2_IC.alert)}Risque d’abondement correctif du CPF si l’état récapitulatif n’est pas conforme.</div>`}
    </div>
  </div>`;
}

// Compte rendu & signature
function et2BlocSignature(e, nom) {
  const rh = et2IsRH();
  const sigs = ET2_SIG.filter(s => String(s.entretien_id) === String(e.id));
  const ROLES = { salarie: 'Salarié', manager: 'Manager / évaluateur' };
  return `<div class="dc-card">
    <div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#db277722;color:#db2777">${et2Svg(ET2_IC.pen, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Circuit de signature</div><div class="dc-title">Compte rendu &amp; signature</div></div>
    </div>${sigs.length ? `<span class="dc-pill dim">${sigs.length}</span>` : ''}</div>
    <div class="dc-body">
    ${sigs.length ? sigs.map(s => {
      const signe = s.statut === 'signe';
      const c = signe ? '#34d399' : '#f59e0b';
      return `<div class="et2-li" style="border-left:3px solid ${c};padding-left:11px">
        <span class="et2-av et2-av-xs" style="background:${signe ? '#34d399' : '#f59e0b'}">${et2Esc(et2Ini(...(String(s.nom || '?').split(' '))))}</span>
        <div class="et2-li-b"><div class="et2-li-t" style="font-size:12px">${et2Esc(ROLES[s.role] || s.role)}</div>
          <div class="et2-li-s">${et2Esc(s.nom || '—')}${signe && s.signe_le ? ' · ' + et2Esc(et2Date(String(s.signe_le).slice(0, 10))) : ''}</div></div>
        ${rh ? `<button type="button" class="et2-obj-b" style="--pc:${c}" onclick="et2ToggleSignature('${et2EscAttr(s.id)}')">${signe ? 'Signé' : 'En attente'}</button>`
             : `<span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${signe ? 'Signé' : 'En attente'}</span>`}
      </div>`;
    }).join('') : `<div class="v2-blk-vide">${et2VideMsg(ET2_T_SIG, 'Aucun circuit de signature ouvert pour cet entretien.')}</div>`}
    ${rh ? `<button type="button" class="et2-cta" style="--cc:#db2777" onclick="et2OuvrirSignature('${et2EscAttr(e.id)}')">
      ${et2Svg(ET2_IC.pen)}${sigs.length ? 'Réinitialiser le circuit' : 'Envoyer pour signature'}</button>` : ''}
    <button type="button" class="et2-add" onclick="exportEntretienPdf('${et2EscAttr(e.id)}')">${et2Svg(ET2_IC.print)}Compte rendu (PDF)</button>
    </div>
  </div>`;
}

// Campagne de l'année
function et2BlocCampagne() {
  if (!et2IsRH()) return '';
  const an = new Date().getFullYear();
  const list = et2Perimetre().filter(e => String(e.date || '').startsWith(String(an)));
  const realises = list.filter(e => e.statut === 'realise').length;
  const planifies = list.filter(e => et2Statut(e) === 'planifie').length;
  const retard = et2Perimetre().filter(e => et2Statut(e) === 'retard').length;
  const effectif = et2Effectif();
  const pct = effectif ? Math.min(100, Math.round(realises / effectif * 100)) : 0;
  const lignes = [
    { l: 'Réalisés', v: realises, c: '#34d399' },
    { l: 'Planifiés', v: planifies, c: '#22d3ee' },
    { l: 'Retardataires', v: retard, c: '#fb7185' }
  ];
  return `<div class="dc-card">
    <div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#22d3ee22;color:#22d3ee">${et2Svg(ET2_IC.cal, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Campagne ${an}</div><div class="dc-title">Suivi de campagne</div></div>
    </div><span class="dc-pill">${effectif ? pct + ' %' : '—'}</span></div>
    <div class="dc-body">
    <div class="al-prog-bar" style="margin-bottom:12px"><span style="width:${pct}%;background:linear-gradient(90deg,#22d3ee,#0ea5e9)"></span></div>
    ${lignes.map(l => `<div class="et2-li" style="border-left:3px solid ${l.c};padding-left:11px">
      <span class="et2-li-x">${et2Esc(l.l)}</span>
      <span class="v2-num" style="font-size:12px;font-weight:700;color:${l.c}">${l.v}</span></div>`).join('')}
    <button type="button" class="et2-cta" style="--cc:#22d3ee" onclick="et2OpenModal('relance')">${et2Svg(ET2_IC.bell)}Relancer les retardataires</button>
    </div>
  </div>`;
}

// ── Actions sur les blocs ────────────────────────────────────────────────
async function et2CycleObjectif(id) {
  const o = ET2_OBJ.find(x => String(x.id) === String(id));
  if (!o) return;
  const i = ET2_ATT_ORDRE.indexOf(o.atteinte);
  const next = ET2_ATT_ORDRE[(i + 1 + ET2_ATT_ORDRE.length) % ET2_ATT_ORDRE.length];
  const saved = await et2Upsert(ET2_T_OBJ, { atteinte: next }, id);
  if (!saved) return;
  Object.assign(o, saved);
  toast('Objectif : ' + ET2_ATT[next].l);
  et2Render();
}
async function et2SupprObjectif(id) {
  confirmDialog('Supprimer cet objectif ?', async () => {
    if (!(await et2Delete(ET2_T_OBJ, id))) return;
    ET2_OBJ = ET2_OBJ.filter(x => String(x.id) !== String(id));
    toast('Objectif supprimé', 'info'); et2Render();
  });
}
async function et2SupprSouhait(id) {
  confirmDialog('Supprimer ce souhait ?', async () => {
    if (!(await et2Delete(ET2_T_SOUH, id))) return;
    ET2_SOUH = ET2_SOUH.filter(x => String(x.id) !== String(id));
    toast('Souhait supprimé', 'info'); et2Render();
  });
}
async function et2SupprAction(id) {
  confirmDialog('Supprimer cette action de formation ?', async () => {
    if (!(await et2Delete(ET2_T_ACT, id))) return;
    ET2_ACT = ET2_ACT.filter(x => String(x.id) !== String(id));
    toast('Action supprimée', 'info'); et2Render();
  });
}
async function et2ToggleRecap6(employeId, champ) {
  const cur = ET2_R6.find(r => String(r.employe_id) === String(employeId)) || null;
  const val = cur ? !cur[champ] : true;
  const row = cur ? { [champ]: val } : { employe_id: employeId, [champ]: val };
  const saved = await et2Upsert(ET2_T_R6, row, cur ? cur.id : null);
  if (!saved) return;
  if (cur) Object.assign(cur, saved); else ET2_R6.push(saved);
  et2Render();
}
async function et2ToggleSignature(id) {
  const s = ET2_SIG.find(x => String(x.id) === String(id));
  if (!s) return;
  const signe = s.statut !== 'signe';
  const saved = await et2Upsert(ET2_T_SIG, { statut: signe ? 'signe' : 'attente', signe_le: signe ? new Date().toISOString() : null }, id);
  if (!saved) return;
  Object.assign(s, saved);
  toast(signe ? 'Signature enregistrée' : 'Signature retirée');
  et2Render();
}
async function et2OuvrirSignature(entretienId) {
  const e = et2Liste().find(x => x.id === entretienId);
  if (!e) return;
  if (et2RefuseSiPasRH() || et2RefuseSiAbsente(ET2_T_SIG)) return;
  const emp = et2Emp(e.employeId);
  const sess = (typeof Auth !== 'undefined' && Auth.getSession && Auth.getSession()) || {};
  const manager = (e.evaluateur || '').trim() || [sess.prenom, sess.nom].filter(Boolean).join(' ') || sess.username || '';
  const existants = ET2_SIG.filter(s => String(s.entretien_id) === String(e.id));
  for (const s of existants) { await et2Delete(ET2_T_SIG, s.id); }
  ET2_SIG = ET2_SIG.filter(s => String(s.entretien_id) !== String(e.id));
  const rows = [
    { entretien_id: e.id, role: 'salarie', nom: et2EmpNom(emp) || e.employeNom || '', statut: 'attente' },
    { entretien_id: e.id, role: 'manager', nom: manager, statut: 'attente' }
  ];
  for (const r of rows) {
    const saved = await et2Upsert(ET2_T_SIG, r, null);
    if (saved) ET2_SIG.push(saved);
  }
  if (ET2_SIG.some(s => String(s.entretien_id) === String(e.id))) toast('Circuit de signature ouvert', 'success');
  et2Render();
}

// ── Modale de la page (gabarit .v2-ov / .v2-md) ──────────────────────────
function et2OpenModal(mode) {
  ET2_MD_MODE = mode;
  const ov = document.getElementById('et2Modal');
  if (!ov) return;
  ov.innerHTML = et2ModalHtml(mode);
  ov.classList.add('open');
  ov.onclick = ev => { if (ev.target === ov) et2CloseModal(); };
}
function et2CloseModal() {
  const ov = document.getElementById('et2Modal');
  if (!ov) return;
  ov.classList.remove('open');
  ov.innerHTML = '';
  ET2_MD_MODE = null;
}

function et2OptionsEmployes(selected) {
  return et2Employes().map(e =>
    `<option value="${et2EscAttr(e.id)}"${String(e.id) === String(selected) ? ' selected' : ''}>${et2Esc(et2EmpNom(e))}</option>`).join('');
}

function et2ModalHtml(mode) {
  const e = et2Selection();
  const shell = (mc, ico, titre, sous, corps, pied) => `
    <div class="v2-md" style="--mc:${mc}" role="dialog" aria-modal="true" aria-label="${et2EscAttr(titre)}">
      <div class="v2-md-h">
        <span class="v2-md-ico">${et2Svg(ico)}</span>
        <div style="min-width:0"><div class="v2-md-t">${et2Esc(titre)}</div><div class="v2-md-s">${et2Esc(sous)}</div></div>
        <button type="button" class="v2-md-x" onclick="et2CloseModal()" aria-label="Fermer">${et2Svg(ET2_IC.x)}</button>
      </div>
      <div class="v2-md-b">${corps}</div>
      <div class="v2-md-f">${pied}</div>
    </div>`;

  if (mode === 'souhait') {
    return shell('#22d3ee', ET2_IC.users, 'Souhait d’évolution', 'Exprimé par le salarié en entretien', `
      <div><label class="v2-fld-l" for="et2MdEmp">Salarié</label>
        <select id="et2MdEmp" class="v2-fld">${et2OptionsEmployes(e && e.employeId)}</select></div>
      <div><label class="v2-fld-l" for="et2MdSouhait">Souhait exprimé</label>
        <input id="et2MdSouhait" class="v2-fld" type="text" placeholder="VAE éducateur spécialisé, mobilité interne…"/></div>
      <div><label class="v2-fld-l" for="et2MdHorizon">Horizon (facultatif)</label>
        <input id="et2MdHorizon" class="v2-fld" type="text" placeholder="2027, à moyen terme…"/></div>`,
      `<button type="button" class="v2-btn-sec" onclick="et2CloseModal()">Annuler</button>
       <button type="button" class="v2-btn-pri" onclick="et2SaveSouhait()">${et2Svg(ET2_IC.check)}Enregistrer</button>`);
  }

  if (mode === 'action') {
    return shell('#16a34a', ET2_IC.book, 'Action de formation décidée', 'Suite donnée à l’entretien', `
      <div><label class="v2-fld-l" for="et2MdLib">Intitulé de l’action</label>
        <input id="et2MdLib" class="v2-fld" type="text" placeholder="VAE — accompagnement, SST, SSIAP 2…"/></div>
      <div><label class="v2-fld-l" for="et2MdBenef">Bénéficiaire</label>
        <input id="et2MdBenef" class="v2-fld" type="text" placeholder="C. Morel, Équipe de nuit…"/></div>`,
      `<button type="button" class="v2-btn-sec" onclick="et2CloseModal()">Annuler</button>
       <button type="button" class="v2-btn-pri" onclick="et2SaveAction()">${et2Svg(ET2_IC.check)}Enregistrer</button>`);
  }

  if (mode === 'objectif') {
    const an = (et2Annee(e && e.date) || new Date().getFullYear()) - 1;
    return shell('#f59e0b', ET2_IC.check, 'Objectif de l’année précédente', 'Atteinte qualitative — aucune note', `
      <div><label class="v2-fld-l" for="et2MdEmp">Salarié</label>
        <select id="et2MdEmp" class="v2-fld">${et2OptionsEmployes(e && e.employeId)}</select></div>
      <div><label class="v2-fld-l" for="et2MdObjLib">Objectif</label>
        <input id="et2MdObjLib" class="v2-fld" type="text" placeholder="Référent d’unité, écrits professionnels…"/></div>
      <div><label class="v2-fld-l" for="et2MdAnnee">Année</label>
        <input id="et2MdAnnee" class="v2-fld" type="number" value="${an}" min="2000" max="2100"/></div>
      <div><span class="v2-fld-l">Atteinte</span>
        <div class="v2-seg" id="et2MdSeg">${['atteint', 'partiel', 'encours', 'non'].map((k, i) =>
          `<button type="button" class="v2-seg-o${i === 2 ? ' on' : ''}" data-v="${k}" onclick="et2SegPick(this)">${et2Esc(ET2_ATT[k].l)}</button>`).join('')}</div></div>
      <div class="v2-note v2-note-ok">${et2Svg(ET2_IC.shield)}L’entretien ne produit aucune note chiffrée : seul un positionnement qualitatif est enregistré.</div>`,
      `<button type="button" class="v2-btn-sec" onclick="et2CloseModal()">Annuler</button>
       <button type="button" class="v2-btn-pri" onclick="et2SaveObjectif()">${et2Svg(ET2_IC.check)}Enregistrer</button>`);
  }

  if (mode === 'relance') {
    const retard = et2Perimetre().filter(x => et2Statut(x) === 'retard');
    const ech = et2Echeances();
    const cible = [];
    retard.forEach(x => { const emp = et2Emp(x.employeId); if (emp) cible.push({ emp, motif: `Entretien du ${et2Date(x.date)} non réalisé` }); });
    ech.forEach(x => { if (!cible.some(c => String(c.emp.id) === String(x.emp.id))) cible.push({ emp: x.emp, motif: x.detail }); });
    const mails = cible.map(c => c.emp.email).filter(Boolean);
    const corps = cible.length ? `<div class="et2-md-list">${cible.map(c => `
        <div class="et2-li">${et2Avatar(c.emp.id, et2EmpNom(c.emp), 'et2-av-sm')}
          <div class="et2-li-b"><div class="et2-li-t">${et2Esc(et2EmpNom(c.emp))}</div>
            <div class="et2-li-s">${et2Esc(c.motif)}</div></div>
          ${c.emp.email ? `<a class="et2-ib" title="Écrire" href="mailto:${et2EscAttr(c.emp.email)}?subject=${encodeURIComponent('Entretien professionnel à planifier')}">${et2Svg(ET2_IC.mail)}</a>` : `<span class="et2-tr-tag" style="--pc:#8095b4">Sans e-mail</span>`}
        </div>`).join('')}</div>
      <div class="v2-note v2-note-warn">${et2Svg(ET2_IC.alert)}${mails.length} adresse${mails.length > 1 ? 's' : ''} e-mail disponible${mails.length > 1 ? 's' : ''} sur ${cible.length} salarié${cible.length > 1 ? 's' : ''}.</div>`
      : `<div class="et2-md-vide">Aucun retardataire : la campagne est à jour.</div>`;
    return shell('#22d3ee', ET2_IC.bell, 'Relancer les retardataires', 'Entretiens en retard ou échéance légale dépassée', corps,
      `<button type="button" class="v2-btn-sec" onclick="et2CloseModal()">Fermer</button>
       ${mails.length ? `<a class="v2-btn-pri" href="mailto:?bcc=${et2EscAttr(mails.join(','))}&subject=${encodeURIComponent('Entretien professionnel à planifier')}" onclick="et2CloseModal()">${et2Svg(ET2_IC.mail)}Écrire à tous</a>` : ''}`);
  }
  return '';
}

function et2SegPick(btn) {
  const seg = btn.parentNode;
  seg.querySelectorAll('.v2-seg-o').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}
function et2SegVal(id) {
  const on = document.querySelector('#' + id + ' .v2-seg-o.on');
  return on ? on.dataset.v : '';
}

async function et2SaveSouhait() {
  const emp = (document.getElementById('et2MdEmp') || {}).value || '';
  const souhait = ((document.getElementById('et2MdSouhait') || {}).value || '').trim();
  const horizon = ((document.getElementById('et2MdHorizon') || {}).value || '').trim();
  if (!emp) { toast('Salarié requis', 'error'); return; }
  if (!souhait) { toast('Souhait requis', 'error'); return; }
  const saved = await et2Upsert(ET2_T_SOUH, { employe_id: emp, souhait, horizon }, null);
  if (!saved) return;
  ET2_SOUH.unshift(saved);
  toast('Souhait enregistré', 'success');
  et2CloseModal(); et2Render();
}
async function et2SaveAction() {
  const libelle = ((document.getElementById('et2MdLib') || {}).value || '').trim();
  const beneficiaire = ((document.getElementById('et2MdBenef') || {}).value || '').trim();
  if (!libelle) { toast('Intitulé requis', 'error'); return; }
  const saved = await et2Upsert(ET2_T_ACT, { libelle, beneficiaire, annee: new Date().getFullYear() }, null);
  if (!saved) return;
  ET2_ACT.unshift(saved);
  toast('Action enregistrée', 'success');
  et2CloseModal(); et2Render();
}
async function et2SaveObjectif() {
  const emp = (document.getElementById('et2MdEmp') || {}).value || '';
  const libelle = ((document.getElementById('et2MdObjLib') || {}).value || '').trim();
  const annee = parseInt((document.getElementById('et2MdAnnee') || {}).value, 10);
  const atteinte = et2SegVal('et2MdSeg') || 'encours';
  if (!emp) { toast('Salarié requis', 'error'); return; }
  if (!libelle) { toast('Objectif requis', 'error'); return; }
  const sel = et2Selection();
  const row = { employe_id: emp, libelle, atteinte, annee: Number.isFinite(annee) ? annee : null };
  if (sel && String(sel.employeId) === String(emp)) row.entretien_id = sel.id;
  const saved = await et2Upsert(ET2_T_OBJ, row, null);
  if (!saved) return;
  ET2_OBJ.unshift(saved);
  toast('Objectif enregistré', 'success');
  et2CloseModal(); et2Render();
}

// ── Filtres hérités : le <select> employé reste le contrat de la page ────
function et2SyncFiltreEmploye() {
  const sel = document.getElementById('etFiltreEmploye');
  if (!sel) return;
  const rh = et2IsRH();
  const wrap = document.getElementById('et2FiltreEmpWrap');
  if (wrap) wrap.style.display = rh ? '' : 'none';
  if (!rh) { sel.value = ''; return; }
  const cur = sel.value;
  const vus = new Map();
  et2Liste().forEach(e => { if (e.employeId && !vus.has(String(e.employeId))) vus.set(String(e.employeId), et2EmpNom(et2Emp(e.employeId)) || e.employeNom || 'Salarié'); });
  sel.innerHTML = '<option value="">Tous les employés</option>' +
    Array.from(vus.entries()).map(([id, nom]) => `<option value="${et2EscAttr(id)}">${et2Esc(nom)}</option>`).join('');
  sel.value = cur;
}

// ── Rendu global ─────────────────────────────────────────────────────────
function et2Render() {
  if (!document.getElementById('et2Stats')) return;
  const rh = et2IsRH();
  document.querySelectorAll('.et2-rh-only').forEach(el => { el.style.display = rh ? '' : 'none'; });

  et2SyncFiltreEmploye();
  et2RenderStats();
  et2RenderChips();
  et2RenderTable();
  et2RenderEcheances();
  et2RenderRail();
  et2RenderFeatures();

  // Compteurs hérités conservés (d'autres scripts peuvent les lire)
  const perim = et2Perimetre();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('etStatPlanifies', perim.filter(e => e.statut === 'planifie').length);
  set('etStatRealises', perim.filter(e => e.statut === 'realise').length);
  set('etStatTotal', perim.length);

  // La liste héritée n'est plus affichée mais reste dans le DOM : on la vide.
  const old = document.getElementById('etList');
  if (old) old.innerHTML = '';
}

// ── Branchements ─────────────────────────────────────────────────────────
// L'ancien rendu délègue au module V2 : tous les appelants existants
// (saveEntretien, supprimerEntretien, etSetStatut, changement de filtre…)
// continuent de fonctionner.
window.renderEntretiens = function () { et2Render(); };

async function et2Init() {
  if (!document.getElementById('et2Stats')) return;
  await et2LoadExtras();
  et2Render();
}
document.addEventListener('DOMContentLoaded', et2Init);
if (typeof registerPageInit === 'function') registerPageInit('entretiens-v2', et2Init);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ET2_MD_MODE) et2CloseModal(); });

// Constantes et fonctions exposées explicitement : un `const` de premier niveau
// ne crée pas de propriété sur window (lecture depuis une iframe, onclick inline).
window.ET2_SQL = ET2_SQL;
window.ET2_TYPE = ET2_TYPE;
window.ET2_ATT = ET2_ATT;
window.et2Render = et2Render;
window.et2SetType = et2SetType;
window.et2Selectionner = et2Selectionner;
window.et2OpenModal = et2OpenModal;
window.et2CloseModal = et2CloseModal;
window.et2SegPick = et2SegPick;
window.et2SaveSouhait = et2SaveSouhait;
window.et2SaveAction = et2SaveAction;
window.et2SaveObjectif = et2SaveObjectif;
window.et2SupprSouhait = et2SupprSouhait;
window.et2SupprAction = et2SupprAction;
window.et2SupprObjectif = et2SupprObjectif;
window.et2CycleObjectif = et2CycleObjectif;
window.et2ToggleRecap6 = et2ToggleRecap6;
window.et2ToggleSignature = et2ToggleSignature;
window.et2OuvrirSignature = et2OuvrirSignature;
