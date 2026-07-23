// Types d'entretien. « bilan6 » et « retour » sont les deux rendez-vous
// réglementaires ajoutés avec le design V2 (état récapitulatif à 6 ans,
// entretien de retour après absence longue — art. L.6315-1).
const ENTRETIEN_TYPE_LABELS = {
  annuel: 'Entretien annuel',
  professionnel: 'Entretien professionnel',
  suivi: 'Entretien de suivi',
  bilan6: 'Bilan à 6 ans',
  retour: 'Entretien de retour'
};
window.ENTRETIEN_TYPE_LABELS = ENTRETIEN_TYPE_LABELS;
const ENTRETIEN_STATUT_STYLES = { planifie: { bg: '#d9770618', c: '#d97706', l: 'Planifié' }, realise: { bg: '#16a34a18', c: '#16a34a', l: 'Réalisé' } };

// ── Grille de compétences ──
const ET_GRILLE = [
  { id:'qualite',     dim:'Savoir-faire', label:'Qualité du travail' },
  { id:'autonomie',   dim:'Savoir-faire', label:'Autonomie' },
  { id:'organisation',dim:'Savoir-faire', label:'Organisation' },
  { id:'equipe',      dim:'Savoir-être',  label:"Travail d'équipe" },
  { id:'communication',dim:'Savoir-être', label:'Communication' },
  { id:'assiduite',   dim:'Savoir-être',  label:'Ponctualité / assiduité' },
  { id:'objectifs_att',dim:'Résultats',   label:'Atteinte des objectifs précédents' },
  { id:'initiative',  dim:'Résultats',    label:'Initiative' }
];
// ── Positionnement QUALITATIF (aucune note chiffrée, aucune moyenne, aucun classement) ──
// L'entretien annuel s'appuie sur le référentiel de compétences du métier du salarié (ET_REFERENTIELS,
// dans js/entretiens-referentiels.js), non sur une notation — pratique conforme au droit du travail.
const ET_POS = [
  { v:'acquis',     l:'Acquis',                  c:'#16a34a' },
  { v:'encours',    l:"En cours d'acquisition",  c:'#d97706' },
  { v:'developper', l:'À développer',            c:'#dc2626' },
  { v:'na',         l:'Non abordé',              c:'#94a3b8' }
];
// Ordre d'affichage + couleurs des pastilles (rendu « cartes à pastilles »).
// Mêmes valeurs que ET_POS ; tc = couleur de texte lisible à l'état non sélectionné.
const ET_POS_UI = [
  { v:'na',         l:'Non abordé',             c:'#94a3b8', tc:'#64748b' },
  { v:'developper', l:'À développer',           c:'#dc2626', tc:'#b91c1c' },
  { v:'encours',    l:"En cours d'acquisition", c:'#d97706', tc:'#b45309' },
  { v:'acquis',     l:'Acquis',                 c:'#16a34a', tc:'#15803d' }
];
function etPos(v) { return ET_POS.find(p => p.v === v) || null; }
function _etEscAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }

// Référentiel générique si le métier du salarié n'a pas de référentiel dédié
const ET_REF_DEFAUT = [
  { titre: 'Compétences liées au poste', competences: ['Maîtrise des activités et tâches confiées', 'Qualité et fiabilité du travail réalisé', 'Respect des procédures, protocoles et consignes', 'Organisation et gestion des priorités'] },
  { titre: 'Posture professionnelle et relationnel', competences: ['Communication et travail en équipe', 'Adaptation et prise d\'initiative', 'Respect du cadre institutionnel, du secret professionnel et de la bientraitance'] },
  { titre: 'Développement professionnel', competences: ['Actualisation des connaissances et montée en compétences', 'Analyse de sa pratique et axes de progrès'] }
];

// Trouve le référentiel du métier à partir du libellé de poste (correspondance souple)
function etRefKey(poste) {
  if (typeof ET_REFERENTIELS === 'undefined') return null;
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const p = norm(poste);
  if (!p) return null;
  const keys = Object.keys(ET_REFERENTIELS);
  let k = keys.find(x => norm(x) === p);
  // correspondance partielle, en exigeant une longueur suffisante pour éviter les faux positifs
  // (ex. « AS » ne doit pas matcher « ...assistant... »)
  if (!k) k = keys.find(x => { const nx = norm(x); return (nx.length >= 4 && p.includes(nx)) || (p.length >= 4 && nx.includes(p)); });
  return k || null;
}
function etEmpPoste(employeId) {
  const emp = _etEmployesCache.find(e => String(e.id) === String(employeId));
  return emp ? emp.poste : '';
}

// Positionnement sur le référentiel du métier — UNIQUEMENT pour l'entretien annuel.
// Aucune note chiffrée, aucune moyenne, aucun classement.
function etRenderGrille(grilleData) {
  const container = document.getElementById('etGrilleBody');
  const section = document.getElementById('etGrilleSection');
  if (!container) return;
  const type = document.getElementById('etFormType')?.value;
  if (type !== 'annuel') { if (section) section.style.display = 'none'; container.innerHTML = ''; return; }
  if (section) section.style.display = '';

  const poste = etEmpPoste(document.getElementById('etFormEmploye')?.value);
  const refKey = etRefKey(poste);
  const domaines = (refKey && typeof ET_REFERENTIELS !== 'undefined') ? ET_REFERENTIELS[refKey].domaines : ET_REF_DEFAUT;
  const metierEl = document.getElementById('etGrilleMetier');
  if (metierEl) metierEl.textContent = refKey ? `Référentiel : ${refKey}` : (poste ? `Poste « ${poste} » — pas de référentiel dédié, trame générique` : 'Sélectionnez un employé pour charger son référentiel métier');

  const prev = Array.isArray(grilleData) ? grilleData : [];
  const posOf = (dom, comp) => (prev.find(x => x.domaine === dom && x.competence === comp) || {}).pos || '';
  container.innerHTML = domaines.map((d, di) => {
    const comps = d.competences.map((c, ci) => {
      const cur = posOf(d.titre, c);
      const lid = `etg-l-${di}-${ci}`;
      const pills = ET_POS_UI.map(p => {
        const on = cur === p.v;
        return `<button type="button" class="etg-pill${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-val="${p.v}" tabindex="-1" style="--pc:${p.c};--ptc:${p.tc}"><span class="etg-dot"></span>${escHtml(p.l)}</button>`;
      }).join('');
      return `<div class="etg-comp">
        <label class="etg-lbl" id="${lid}">${escHtml(c)}</label>
        <input type="hidden" class="etg-sel" data-dom="${_etEscAttr(d.titre)}" data-comp="${_etEscAttr(c)}" value="${cur}">
        <div class="etg-pills" role="radiogroup" aria-labelledby="${lid}">${pills}</div>
      </div>`;
    }).join('');
    const total = d.competences.length;
    const done = d.competences.filter(c => posOf(d.titre, c)).length;
    const allDone = done === total && total > 0;
    return `<div class="etg-dom">
      <div class="etg-domhead">
        <span class="etg-domtitle">${escHtml(d.titre)}</span>
        <span class="etg-count${allDone ? ' done' : ''}">${done}/${total} positionnées</span>
      </div>
      <div>${comps}</div>
    </div>`;
  }).join('');
  etGrilleSetRoving();
  etBindGrille();
}

// Un seul point d'entrée pour tabuler dans chaque groupe de pastilles (pattern radiogroup)
function etGrilleSetRoving() {
  document.querySelectorAll('#etGrilleBody .etg-pills').forEach(g => {
    const pills = [...g.querySelectorAll('.etg-pill')];
    if (!pills.length) return;
    (pills.find(p => p.classList.contains('on')) || pills[0]).tabIndex = 0;
  });
}

// Écouteurs délégués (attachés une seule fois : #etGrilleBody survit aux ré-rendus innerHTML)
let _etGrilleBound = false;
function etBindGrille() {
  if (_etGrilleBound) return;
  const body = document.getElementById('etGrilleBody');
  if (!body) return;
  body.addEventListener('click', etGrillePillClick);
  body.addEventListener('keydown', etGrillePillKey);
  _etGrilleBound = true;
}

function etGrillePillClick(e) {
  const btn = e.target.closest('.etg-pill');
  if (!btn) return;
  const group = btn.parentNode;
  const comp = group.closest('.etg-comp');
  const input = comp.querySelector('.etg-sel');
  const wasOn = btn.classList.contains('on');
  group.querySelectorAll('.etg-pill').forEach(p => { p.classList.remove('on'); p.setAttribute('aria-checked', 'false'); p.tabIndex = -1; });
  btn.tabIndex = 0;
  if (wasOn) {
    input.value = '';                       // re-cliquer désélectionne
  } else {
    btn.classList.add('on');
    btn.setAttribute('aria-checked', 'true');
    input.value = btn.dataset.val;
  }
  etUpdateDomCount(comp.closest('.etg-dom'));
}

// Flèches gauche/droite : déplacent le focus entre les pastilles d'une compétence
function etGrillePillKey(e) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const btn = e.target.closest('.etg-pill');
  if (!btn) return;
  e.preventDefault();
  const pills = [...btn.parentNode.querySelectorAll('.etg-pill')];
  let i = pills.indexOf(btn);
  i = e.key === 'ArrowRight' ? (i + 1) % pills.length : (i - 1 + pills.length) % pills.length;
  pills.forEach(p => p.tabIndex = -1);
  pills[i].tabIndex = 0;
  pills[i].focus();
}

function etUpdateDomCount(dom) {
  if (!dom) return;
  const inputs = [...dom.querySelectorAll('.etg-sel')];
  const done = inputs.filter(i => i.value).length;
  const badge = dom.querySelector('.etg-count');
  if (!badge) return;
  badge.textContent = `${done}/${inputs.length} positionnées`;
  badge.classList.toggle('done', done === inputs.length && inputs.length > 0);
}

// Collecte le positionnement (tableau [{domaine, competence, pos}]) — vide hors entretien annuel
function etCollectGrille() {
  if (document.getElementById('etFormType')?.value !== 'annuel') return [];
  const out = [];
  document.querySelectorAll('#etGrilleBody .etg-sel').forEach(el => {
    if (el.value) out.push({ domaine: el.dataset.dom, competence: el.dataset.comp, pos: el.value });
  });
  return out;
}

let _etCache = [];
let _etEmployesCache = [];

function getEntretiens() { return _etCache; }

function entretienCurrentUser() {
  const session = Auth.getSession();
  if (!session) return { employeId: 'anon', employeNom: 'Inconnu' };
  const emp = _etEmployesCache.find(e => String(e.profileId) === String(session.userId));
  return {
    employeId: emp ? emp.id : 'u' + session.userId,
    employeNom: emp ? `${emp.prenom || ''} ${emp.nom || ''}`.trim() : ([session.prenom, session.nom].filter(Boolean).join(' ') || session.username)
  };
}

async function initEntretiens() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_entretiens')) return;
  try {
    [_etCache, _etEmployesCache] = await Promise.all([sbGetEntretiens(), sbGetEmployes()]);
  } catch (e) {
    console.error('[initEntretiens]', e);
    toast('Erreur de chargement', 'error');
  }
  if (Auth.isAdmin()) {
    const empSel = document.getElementById('etFiltreEmploye');
    if (empSel) empSel.style.display = '';
  }
  renderEntretiens();
}

function openEntretienModal(id) {
  const employes = _etEmployesCache;
  const list = getEntretiens();
  const item = id ? list.find(e => e.id === id) : null;
  if (item && item.statut === 'realise') { toast('Entretien réalisé — repassez-le en « Planifié » pour le modifier', 'info'); return; }
  document.getElementById('etFormTitle').textContent = item ? 'Modifier l’entretien' : 'Nouvel entretien';
  const sel = document.getElementById('etFormEmploye');
  sel.innerHTML = employes.map(e => `<option value="${e.id}">${escHtml(e.prenom + ' ' + e.nom)}</option>`).join('');
  if (item) sel.value = item.employeId;
  document.getElementById('etFormDate').value = item ? item.date : today();
  document.getElementById('etFormType').value = item ? item.type : 'annuel';
  document.getElementById('etFormStatut').value = item ? item.statut : 'planifie';
  document.getElementById('etFormEvaluateur').value = item ? item.evaluateur || '' : '';
  document.getElementById('etFormBilan').value = item ? item.bilan || '' : '';
  document.getElementById('etFormObjectifs').value = item ? item.objectifs || '' : '';
  document.getElementById('etFormFormations').value = item ? item.formations || '' : '';
  document.getElementById('etFormView').dataset.editId = item ? item.id : '';
  etRenderGrille(item?.grille);
  _etLastRefKey = etRefSyncKey();               // amorce : etModalSync ne re-rendra pas la grille juste après
  const exportBtn = document.getElementById('etExportBtn');
  if (exportBtn) exportBtn.style.display = item ? '' : 'none';
  etModalSync();
  etShowForm();
}

// Bascule liste → formulaire plein écran
function etShowForm() {
  const lv = document.getElementById('etListView');
  const fv = document.getElementById('etFormView');
  if (lv) lv.style.display = 'none';
  if (fv) fv.style.display = '';
  window.scrollTo(0, 0);
}

// Bascule formulaire → liste
function closeEntretienForm() {
  const lv = document.getElementById('etListView');
  const fv = document.getElementById('etFormView');
  if (fv) fv.style.display = 'none';
  if (lv) lv.style.display = '';
  window.scrollTo(0, 0);
}

// En-tête interactif : sous-titre « Type · Employé » + recoloration selon le statut
function etModalSync() {
  const sub = document.getElementById('etFormSub');
  if (sub) {
    const lbl = ENTRETIEN_TYPE_LABELS[document.getElementById('etFormType')?.value] || 'Entretien';
    const empSel = document.getElementById('etFormEmploye');
    const empNom = (empSel && empSel.value && empSel.selectedIndex >= 0) ? empSel.options[empSel.selectedIndex].text : '';
    sub.textContent = empNom ? `${lbl} · ${empNom}` : lbl;
  }
  const formEl = document.getElementById('etFormView');
  if (formEl) {
    const st = ENTRETIEN_STATUT_STYLES[document.getElementById('etFormStatut')?.value] || ENTRETIEN_STATUT_STYLES.planifie;
    formEl.style.setProperty('--mc', st.c || '#9333ea');
  }
  // Ne recharge la grille que si l'employé (→ son métier) ou le type d'entretien a
  // réellement changé — sinon un simple changement de statut détruirait le DOM des
  // pastilles et ferait perdre le focus/scroll en pleine saisie. Les positionnements
  // déjà saisis sont préservés (etCollectGrille les capture avant le re-rendu).
  const key = etRefSyncKey();
  if (key !== _etLastRefKey) { _etLastRefKey = key; etRenderGrille(etCollectGrille()); }
}
function etRefSyncKey() {
  return (document.getElementById('etFormEmploye')?.value || '') + '|' + (document.getElementById('etFormType')?.value || '');
}
let _etLastRefKey = null;

async function saveEntretien() {
  const id = document.getElementById('etFormView').dataset.editId;
  const employeId = document.getElementById('etFormEmploye').value;
  const emp = _etEmployesCache.find(e => String(e.id) === String(employeId));
  const date = document.getElementById('etFormDate').value;
  const type = document.getElementById('etFormType').value;
  const statut = document.getElementById('etFormStatut').value;
  const evaluateur = document.getElementById('etFormEvaluateur').value.trim();
  const bilan = document.getElementById('etFormBilan').value.trim();
  const objectifs = document.getElementById('etFormObjectifs').value.trim();
  const formations = document.getElementById('etFormFormations').value.trim();
  const grille = etCollectGrille();
  if (!employeId || !emp) { toast('Employé requis', 'error'); return; }
  if (!date) { toast('Date requise', 'error'); return; }
  const data = {
    id: id || undefined,
    employeId, employeNom: `${emp.prenom || ''} ${emp.nom || ''}`.trim(),
    date, type, statut, evaluateur, bilan, objectifs, formations, grille
  };
  try {
    const saved = await sbSaveEntretien(data);
    if (id) {
      const idx = _etCache.findIndex(e => e.id === id);
      if (idx >= 0) _etCache[idx] = saved;
      toast('Entretien mis à jour', 'success');
    } else {
      _etCache.unshift(saved);
      toast('Entretien enregistré', 'success');
    }
    if (typeof auditLog === 'function') auditLog('entretien', `${emp.prenom} ${emp.nom} — ${ENTRETIEN_TYPE_LABELS[type] || type}`);
    closeEntretienForm();
    renderEntretiens();
  } catch (e) {
    const msg = e?.message || e?.details || JSON.stringify(e) || 'Erreur inconnue';
    toast('Erreur : ' + msg, 'error');
    console.error('[saveEntretien]', e);
  }
}

function supprimerEntretien(id) {
  confirmDialog('Supprimer cet entretien ?', async () => {
    try {
      await sbDeleteEntretien(id);
      _etCache = _etCache.filter(e => e.id !== id);
      toast('Entretien supprimé', 'info');
      renderEntretiens();
    } catch (e) {
      toast('Erreur : ' + (e?.message || e), 'error');
      console.error('[supprimerEntretien]', e);
    }
  });
}

// Convertit une grille en lignes { domaine, competence, label, color } pour l'affichage,
// en gérant le NOUVEAU format (tableau qualitatif) et l'ANCIEN (objet noté 1-4 → positionnement).
function etGrilleRows(grille) {
  if (Array.isArray(grille)) {
    return grille.filter(x => x && x.pos).map(x => {
      const p = etPos(x.pos);
      return { domaine: x.domaine || '', competence: x.competence || '', label: p ? p.l : x.pos, color: p ? p.c : '#334155' };
    });
  }
  if (grille && typeof grille === 'object') {
    // Ancien format noté : on affiche un positionnement équivalent, sans note ni moyenne
    const legacy = { 1: 'developper', 2: 'encours', 3: 'acquis', 4: 'acquis' };
    return (typeof ET_GRILLE !== 'undefined' ? ET_GRILLE : []).filter(g => grille[g.id]).map(g => {
      const p = etPos(legacy[Number(grille[g.id])] || 'na');
      return { domaine: g.dim, competence: g.label, label: p ? p.l : '', color: p ? p.c : '#334155' };
    });
  }
  return [];
}

async function etSetStatut(id, statut) {
  if (!Auth.isAdmin()) return;
  const e = _etCache.find(x => x.id === id);
  if (!e || e.statut === statut) return;
  try {
    const saved = await sbSaveEntretien({ ...e, statut });
    const idx = _etCache.findIndex(x => x.id === id);
    if (idx >= 0) _etCache[idx] = saved;
    toast('Statut : ' + (ENTRETIEN_STATUT_STYLES[statut]?.l || statut));
    renderEntretiens();
  } catch (err) { toast('Erreur : ' + (err?.message || err), 'error'); console.error('[etSetStatut]', err); }
}

function entretienItemHtml(e, isAdmin) {
  const st = ENTRETIEN_STATUT_STYLES[e.statut] || ENTRETIEN_STATUT_STYLES.planifie;
  const ac = st.c;
  const _emp = _etEmployesCache.find(x => String(x.id) === String(e.employeId));
  const nomAff = _emp ? `${_emp.prenom || ''} ${_emp.nom || ''}`.trim() : (e.employeNom || '');
  const nbPos = etGrilleRows(e.grille).length;

  const statutCtrl = `<span class="frx-stbtns" onclick="event.stopPropagation()">${
    Object.keys(ENTRETIEN_STATUT_STYLES).map(s => {
      const active = e.statut === s;
      const stt = ENTRETIEN_STATUT_STYLES[s];
      return `<button class="frx-stbtn${active ? ' on' : ''}" onclick="event.stopPropagation();etSetStatut('${e.id}','${s}')" title="Marquer comme ${stt.l}"${active ? ` style="background:${stt.c};border-color:${stt.c};color:#fff"` : ''}>${stt.l}</button>`;
    }).join('')
  }</span>`;

  const fields = [];
  if (e.bilan) fields.push(`<div class="etx-field"><b>Bilan :</b> ${escHtml(e.bilan)}</div>`);
  if (e.objectifs) fields.push(`<div class="etx-field"><b>Objectifs :</b> ${escHtml(e.objectifs)}</div>`);
  if (e.formations) fields.push(`<div class="etx-field"><b>Formations :</b> ${escHtml(e.formations)}</div>`);

  return `<article class="frx-card" style="--ac:${ac}">
    <div class="frx-head">
      <div class="frx-ico">🧑‍💼</div>
      <div class="frx-h-txt">
        <div class="frx-title">${isAdmin ? escHtml(nomAff) : (ENTRETIEN_TYPE_LABELS[e.type] || e.type)}</div>
        ${isAdmin ? `<div class="frx-chips" style="margin-top:.25rem"><span class="frx-chip">${ENTRETIEN_TYPE_LABELS[e.type] || e.type}</span></div>` : ''}
      </div>
      ${!isAdmin ? `<span class="frx-status">${st.l}</span>` : ''}
    </div>
    ${nbPos ? `<div class="frx-chips" style="margin-top:.4rem"><span class="frx-chip" style="background:#f5f3ff;color:#7c3aed">🧭 ${nbPos} compétence${nbPos > 1 ? 's' : ''} positionnée${nbPos > 1 ? 's' : ''}</span></div>` : ''}
    <div class="frx-meta"><span>📅 ${formatDate(e.date)}</span>${e.evaluateur ? `<span>👤 ${escHtml(e.evaluateur)}</span>` : ''}</div>
    ${fields.join('')}
    ${isAdmin ? `<div class="frx-foot">
      <span class="frx-foot-lbl">Statut</span>${statutCtrl}
      <span class="frx-sp"></span>
      <button class="frx-ibtn" onclick="exportEntretienPdf('${e.id}')" title="Export PDF">🖨</button>
      ${e.statut !== 'realise' ? `<button class="frx-ibtn" onclick="openEntretienModal('${e.id}')" title="Modifier">✎</button>` : ''}
      <button class="frx-ibtn del" onclick="supprimerEntretien('${e.id}')" title="Supprimer">✕</button>
    </div>` : ''}
  </article>`;
}

function exportEntretienPdf(id) {
  const e = getEntretiens().find(x => x.id === id);
  if (!e) return;
  // Positionnement qualitatif groupé par domaine (aucune note, aucune moyenne)
  const rows = etGrilleRows(e.grille);
  const byDom = {};
  rows.forEach(r => { (byDom[r.domaine] = byDom[r.domaine] || []).push(r); });
  const grilleHtml = Object.keys(byDom).map(dom => `
    <tr><td colspan="2" style="padding:.5rem .5rem .2rem;font-weight:700;color:#7c3aed;border-bottom:1px solid #e2e8f0">${escHtml(dom)}</td></tr>
    ${byDom[dom].map(r => `<tr><td style="padding:.3rem .5rem;border-bottom:1px solid #e2e8f0">${escHtml(r.competence)}</td><td style="padding:.3rem .5rem;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:${r.color}">${escHtml(r.label)}</td></tr>`).join('')}
  `).join('');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Entretien — ${escHtml(e.employeNom)}</title>
    <style>body{font-family:Georgia,serif;max-width:760px;margin:2rem auto;padding:0 1.5rem;line-height:1.6;color:#1e293b}
    h1{font-size:1.4rem;border-bottom:2px solid #0f2b4a;padding-bottom:.4rem}
    h4{color:#0f2b4a;margin:1.1rem 0 .3rem}
    table{width:100%;border-collapse:collapse;margin-top:.3rem}
    .meta{color:#64748b;font-size:.85rem;margin-bottom:1.5rem}</style></head><body>
    <h1>${ENTRETIEN_TYPE_LABELS[e.type]||e.type} — ${escHtml(e.employeNom)}</h1>
    <div class="meta">${formatDate(e.date)}${e.evaluateur?' · Évaluateur : '+escHtml(e.evaluateur):''}</div>
    ${grilleHtml ? `<h4>Positionnement sur le référentiel métier</h4><p style="font-size:.8rem;color:#64748b;margin:0 0 .3rem">Positionnement qualitatif partagé avec le salarié — sans note ni classement.</p><table>${grilleHtml}</table>` : ''}
    ${e.bilan ? `<h4>Bilan</h4><p>${escHtml(e.bilan).replace(/\n/g,'<br/>')}</p>` : ''}
    ${e.objectifs ? `<h4>Objectifs fixés</h4><p>${escHtml(e.objectifs).replace(/\n/g,'<br/>')}</p>` : ''}
    ${e.formations ? `<h4>Besoins en formation</h4><p>${escHtml(e.formations).replace(/\n/g,'<br/>')}</p>` : ''}
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

function renderEntretiens() {
  const isAdmin = Auth.isAdmin();
  const cu = entretienCurrentUser();
  const list = getEntretiens();

  if (isAdmin) {
    const empSel = document.getElementById('etFiltreEmploye');
    if (empSel) {
      const current = empSel.value;
      const employesMap = new Map();
      list.forEach(e => { if (e.employeId && !employesMap.has(e.employeId)) employesMap.set(e.employeId, e.employeNom); });
      empSel.innerHTML = '<option value="">Tous les employés</option>' + Array.from(employesMap.entries()).map(([id, nom]) => `<option value="${id}">${escHtml(nom)}</option>`).join('');
      empSel.value = current;
    }
  }

  const filtreEmploye = isAdmin ? (document.getElementById('etFiltreEmploye')?.value || '') : '';
  const filtreType = document.getElementById('etFiltreType')?.value || '';
  const filtreStatut = document.getElementById('etFiltreStatut')?.value || '';

  let filtered = list;
  if (!isAdmin) filtered = filtered.filter(e => e.employeId === cu.employeId);
  if (filtreEmploye) filtered = filtered.filter(e => e.employeId === filtreEmploye);
  if (filtreType) filtered = filtered.filter(e => e.type === filtreType);
  if (filtreStatut) filtered = filtered.filter(e => e.statut === filtreStatut);

  const statsSource = isAdmin ? list : list.filter(e => e.employeId === cu.employeId);
  document.getElementById('etStatPlanifies').textContent = statsSource.filter(e => e.statut === 'planifie').length;
  document.getElementById('etStatRealises').textContent = statsSource.filter(e => e.statut === 'realise').length;
  document.getElementById('etStatTotal').textContent = statsSource.length;

  const el = document.getElementById('etList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucun entretien trouvé.</p></div>';
    return;
  }
  el.innerHTML = `<div class="frx-grid">` + filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => entretienItemHtml(e, isAdmin)).join('') + `</div>`;
}

document.addEventListener('DOMContentLoaded', initEntretiens);
if (typeof registerPageInit === 'function') registerPageInit('entretiens', initEntretiens);
