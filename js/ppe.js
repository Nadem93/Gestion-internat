const PPE_KEY = DB.keys.ppe;
const DOMAINE_SERAFIN_MAP = {
  autonomie: ['2.2.1'],
  sante:     ['2.1.1','2.1.2'],
  viePro:    ['2.3.3'],
  logement:  ['2.3.2'],
  vieSociale:['2.3.4'],
  vieAffective:['2.3.3','2.3.4'],
  budget:    ['2.3.5'],
  transport: ['3.2.4'],
  orientation:['2.4.1']
};

// Couleur d'accent de chaque domaine (en-têtes clairs du design « dossier aéré »)
const DOM_COLORS = {
  autonomie: '#ea580c', sante: '#dc2626', viePro: '#0284c7', logement: '#b45309',
  vieSociale: '#16a34a', vieAffective: '#db2777', budget: '#d97706',
  transport: '#0d9488', orientation: '#6366f1'
};

const DOMAINES = [
  { id:'autonomie', label:'Autonomie', icon:'🧍' },
  { id:'sante', label:'Santé et bien-être', icon:'❤️' },
  { id:'viePro', label:'Vie professionnelle et Formation', icon:'💼' },
  { id:'logement', label:'Logement et Temps libre', icon:'🏠' },
  { id:'vieSociale', label:'Vie sociale et loisirs', icon:'👥' },
  { id:'vieAffective', label:'Vie affective et familiale', icon:'💞' },
  { id:'budget', label:'Gestion du budget', icon:'💰' },
  { id:'transport', label:'Transport et déplacements', icon:'🚗' },
  { id:'orientation', label:'Orientation', icon:'🧭' }
];

// Source = Supabase. Cache mémoire chargé au démarrage.
let _ppeCache = [];
function getPpe() { return _ppeCache; }
async function loadPpeCache() { _ppeCache = await sbGetPpe(); }
// Persiste un avenant précis (remonte une erreur via toast)
// Écritures sérialisées : chaque sbSavePpe réécrit la ligne entière, deux
// requêtes qui se doublent (corriger un bilan puis signer 2 s après) peuvent
// sinon se terminer dans le désordre et perdre la plus récente (lost update).
// Retourne une promesse (true = sauvegardé) que les appels critiques attendent.
let _ppeSaveChain = Promise.resolve();
function persistPpe(p) {
  if (!p || !p.id) return Promise.resolve(false);
  const job = _ppeSaveChain.then(() => sbSavePpe(p)).then(
    () => true,
    e => { console.error('[ppe]', e); toast('Erreur sauvegarde avenant', 'error'); return false; }
  );
  _ppeSaveChain = job;
  return job;
}

// ── Résidents : source = Supabase (lecture via sbGetResidents, écriture via sbSaveResident) ──
let _residentsCache = [];
function residentsList() { return _residentsCache; }
async function loadResidentsCache() { _residentsCache = await sbGetResidents(); }
async function persistResident(r) {
  const saved = await sbSaveResident(r);
  const i = _residentsCache.findIndex(x => String(x.id) === String(saved.id));
  if (i >= 0) _residentsCache[i] = saved; else _residentsCache.push(saved);
  return saved;
}

function emptySection() {
  return { bilan:'', objectifs:[{ objectif:'', moyens:'', echeance:'', evaluation:'' }], expression:'' };
}

async function initPpe() {
  const session = Auth.requireAuth();
  if (!session) return;
  if (!requireModule('access_ppe')) return;
  await loadResidentsCache();
  await loadPpeCache();
  populateAvenantSelects();
  renderAvenant();
  const params = new URLSearchParams(window.location.search);
  const rid = params.get('residentId');
  if (rid) {
    const sel = document.getElementById('filterResidentAvenant');
    if (sel) { sel.value = rid; sel.dispatchEvent(new Event('change')); }
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function populateAvenantSelects() {
  const residents = residentsList();
  const opts = r => r.map(x => `<option value="${x.id}">${escHtml(x.prenom||'')} ${escHtml(x.nom||'')}</option>`).join('');
  ['fAvResident','filterResidentAvenant'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const all = id === 'filterResidentAvenant' ? '<option value="">Tous les résidents</option>' : '<option value="">— Choisir —</option>';
      el.innerHTML = all + opts(residents);
    }
  });
}

async function saveAvenant() {
  const editId = document.getElementById('avenantEditId').value;
  const residentId = document.getElementById('fAvResident').value;
  if (!residentId) { toast('Veuillez choisir un résident', 'error'); return; }
  const residents = residentsList();
  const r = residents.find(x => x.id === residentId);
  const list = getPpe();
  const data = {
    residentId,
    residentName: r ? `${r.prenom||''} ${r.nom||''}`.trim() : '?',
    dateRedaction: document.getElementById('fAvDateRedac').value,
    dateRevision: document.getElementById('fAvRevision').value,
    referent: document.getElementById('fAvReferent').value.trim(),
    protection: document.getElementById('fAvProtection').value.trim(),
    employeur: document.getElementById('fAvEmployeur').value.trim(),
    atelier: document.getElementById('fAvAtelier').value.trim(),
    entreeEsat: document.getElementById('fAvEntreeEsat').value
  };

  try {
    if (editId) {
      const idx = list.findIndex(p => p.id === editId);
      if (idx >= 0) {
        Object.assign(list[idx], data);
        list[idx] = await sbSavePpe(list[idx]);
        ppeSyncEcheances(list[idx]);              // la date de révision pilote l'échéance de réévaluation
        const full = document.getElementById('avenantFullView');
        if (full) renderAvenantFull(list[idx]);
      }
      toast('Avenant mis à jour');
    } else {
      const sections = {};
      DOMAINES.forEach(d => { sections[d.id] = emptySection(); });
      const saved = await sbSavePpe({
        ...data,
        statut: 'brouillon',
        sections,
        conclusion: '',
        signatures: { resident:null, referent:null, direction:null, date:null },
        createdBy: (() => { const s = Auth.getSession(); return s ? `${s.prenom||''} ${s.nom||''}`.trim() || s.username : '?'; })()
      });
      list.unshift(saved);
      toast('Avenant créé');
    }
  } catch (e) { console.error('[saveAvenant]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  closeModal('modalAvenant');
  renderAvenant();
}

function openAvenant(id) {
  const list = getPpe();
  const p = list.find(x => x.id === id);
  if (!p) return;
  const old = document.getElementById('avenantFullView');
  if (old) old.remove();
  document.getElementById('avenantList').style.display = 'none';
  renderAvenantFull(p);
}

function backToList() {
  // Une proposition IA non enregistrée ne doit pas survivre à la navigation
  // (sinon elle estamperait à tort un futur bilan saisi à la main).
  if (typeof iaOublierBilanPending === 'function') iaOublierBilanPending();
  const el = document.getElementById('avenantFullView');
  if (el) el.remove();
  document.getElementById('avenantList').style.display = '';
}

function renderAvenantFull(p) {
  const existing = document.getElementById('avenantFullView');
  if (existing) existing.remove();
  const container = document.getElementById('avenantList');
  container.style.display = 'none';
  const div = document.createElement('div');
  div.id = 'avenantFullView';
  div.innerHTML = `<div style="max-width:800px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <button class="btn btn-outline btn-sm" onclick="backToList()">← Retour à la liste</button>
      <button class="btn btn-accent btn-sm" onclick="regenerateAvenantFromJournal('${p.id}')" style="gap:.35rem"><span>🤖</span> Générer depuis le journal</button>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-outline btn-sm" onclick="openCompareAvenant('${p.id}')">⇄ Comparer</button>
        <button class="btn btn-outline btn-sm" onclick="editAvenant('${p.id}')">Modifier infos</button>
        <button class="btn btn-outline btn-sm" onclick="changeAvenantStatut('${p.id}')">${p.statut==='brouillon'?'Activer':p.statut==='actif'?'Terminer':'—'}</button>
        <button class="btn btn-accent btn-sm" onclick="printAvenant('${p.id}')">Télécharger PDF</button>
      </div>
    </div>
    ${(() => {
      const r = residentsList().find(x => String(x.id) === String(p.residentId));
      const col = safeColor(r?.color, '#0f2b4a');
      const avatar = r?.photo
        ? `<img src="${r.photo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="${escHtml(p.residentName)}"/>`
        : `<span style="width:52px;height:52px;border-radius:50%;background:${col}22;border:2px solid ${col}55;color:${col};font-size:1rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${_avInitials(p.residentName)}</span>`;
      const pill = (ic, txt, style) => txt ? `<span style="font-size:.68rem;font-weight:600;border-radius:999px;padding:3px 10px;white-space:nowrap;${style || 'color:#475569;background:#f8fafc;border:0.5px solid #e2e8f0'}">${ic} ${escHtml(String(txt))}</span>` : '';
      return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 4px 14px rgba(15,43,74,.05);padding:1rem 1.15rem;margin-bottom:1rem;display:flex;align-items:center;gap:.9rem;flex-wrap:wrap">
        ${avatar}
        <div style="flex:1;min-width:220px">
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
            <span style="font-size:1.05rem;font-weight:800;color:#0f2b4a">${escHtml(p.residentName||'—')}</span>
            <span class="badge-ppe ${p.statut}" style="margin:0">${STATUT_PPE_LABEL[p.statut]||p.statut}</span>
          </div>
          <div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem">
            ${pill('📅', p.dateRedaction ? 'Rédigé le ' + formatDate(p.dateRedaction) : '')}
            ${pill('🔄', p.dateRevision ? 'Révision le ' + formatDate(p.dateRevision) : '', 'color:#b45309;background:#fffbeb;border:0.5px solid #fde68a')}
            ${pill('🧑‍🏫', p.referent)}
            ${pill('🏭', [p.atelier, p.employeur].filter(Boolean).join(' · '))}
            ${pill('🛡', p.protection)}
            ${pill('🚪', p.entreeEsat ? 'Entrée ESAT ' + formatDate(p.entreeEsat) : '')}
            ${pill('👤', p.createdBy)}
          </div>
        </div>
      </div>`;
    })()}
    ${renderCycleCard(p)}
    ${DOMAINES.map(d => renderSectionCard(p, d)).join('')}
    <div class="section-card">
      <div class="section-header" style="cursor:default"><span class="sec-ic">✍</span><strong>Conclusion</strong></div>
      <div class="section-body">
        <textarea class="input" style="min-height:80px;width:100%" onchange="updateConclusion('${p.id}',this.value)">${escHtml(p.conclusion||'')}</textarea>
      </div>
    </div>
    <div class="section-card">
      <div class="section-header" style="cursor:default"><span class="sec-ic">🖋</span><strong>Signatures</strong>
        <span class="muted-count" style="margin-left:auto;font-size:.68rem;font-weight:500">électroniques · horodatées · scellées</span></div>
      <div class="section-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.75rem;font-size:.85rem;text-align:center">
          ${SIG_ROLES.filter(rd => !rd.si || rd.si(p) || sigPads(p)[rd.key]).map(rd => sigBlockHtml(p, rd)).join('')}
        </div>
        <div style="margin-top:1rem;font-size:.85rem"><strong>Date de signature :</strong> <input type="date" class="input" style="width:auto;font-size:.8rem" value="${escAttr(p.signatures.date||'')}" onchange="updateSignature('${p.id}','date',this.value)"/></div>
        <div style="font-size:.68rem;color:#94a3b8;margin-top:.5rem">✍ Signature électronique simple : tracé recueilli sur place (tablette, souris), horodaté et rattaché au compte connecté, avec empreinte de contrôle du document — une modification de l'avenant après signature est détectée et signalée.</div>
      </div>
    </div>
  </div>`;
  document.querySelector('.content').appendChild(div);
  ppeVerifSignatures(p);
}

function renderSectionCard(p, domaine) {
  const s = p.sections[domaine.id] || emptySection();
  const domCol = DOM_COLORS[domaine.id] || '#7c3aed';
  return `<div class="section-card" style="--dc:${domCol}">
    <div class="section-header" onclick="toggleSection('${p.id}','${domaine.id}')">
      <span class="sec-ic">${domaine.icon}</span>
      <span>${domaine.label}</span>
      <span style="margin-left:auto;display:flex;align-items:center;gap:.3rem">
        ${(DOMAINE_SERAFIN_MAP[domaine.id]||[]).map(c=>`<span style="font-size:.6rem;background:#f0fdfa;border:0.5px solid #99e5dc;color:#0f766e;padding:1px 6px;border-radius:999px;font-weight:700">${c}</span>`).join('')}
        <span class="muted-count" style="font-size:.7rem;margin-left:.25rem">${s.objectifs.length} obj.</span>
      </span>
    </div>
    <div class="section-body" id="sectionBody_${p.id}_${domaine.id}">
      <div style="display:flex;gap:.5rem;align-items:flex-start">
        <div style="flex:1">
          <label style="font-size:.7rem;color:var(--muted);font-weight:600">Bilan</label>
          <textarea class="input" style="min-height:160px;width:100%;resize:vertical" onchange="updateSectionField('${p.id}','${domaine.id}','bilan',this.value)" placeholder="Bilan du domaine…">${escHtml(s.bilan||'')}</textarea>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:1.2rem" onclick="addSectionObj('${p.id}','${domaine.id}')">+ Objectif</button>
      </div>
      <div style="margin-top:.25rem">
        <div style="display:grid;grid-template-columns:1fr 1fr 120px 1fr;gap:.5rem;font-size:.7rem;color:var(--muted);font-weight:600;padding:0 .5rem">
          <div>Objectif</div><div>Moyens / Actions</div><div>Échéance</div><div>Évaluation</div>
        </div>
        <div id="objGrid_${p.id}_${domaine.id}">
          ${s.objectifs.map((o, oi) => objRowHtml(p.id, domaine.id, oi, o)).join('')}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" style="align-self:flex-start" onclick="addSectionObj('${p.id}','${domaine.id}')">+ Ajouter une ligne</button>
      <div style="margin-top:.25rem">
        <label style="font-size:.7rem;color:var(--muted);font-weight:600">Expression et souhaits du résident</label>
        <textarea class="input" style="min-height:50px;width:100%" onchange="updateSectionField('${p.id}','${domaine.id}','expression',this.value)" placeholder="Expression et souhaits…">${escHtml(s.expression||'')}</textarea>
      </div>
    </div>
  </div>`;
}

function toggleSection(ppeId, domId) {
  const el = document.getElementById('sectionBody_'+ppeId+'_'+domId);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? '' : 'none';
}

function updateSectionField(ppeId, domId, field, value) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  if (!p.sections[domId]) p.sections[domId] = emptySection();
  p.sections[domId][field] = value;
  persistPpe(p);
}


function objRowHtml(ppeId, domId, oi, o) {
  return `<div class="obj-row">
    <div><input class="input" value="${escHtml(o.objectif)}" onchange="updateSectionObjField('${ppeId}','${domId}',${oi},'objectif',this.value)"/></div>
    <div><input class="input" value="${escHtml(o.moyens||'')}" onchange="updateSectionObjField('${ppeId}','${domId}',${oi},'moyens',this.value)"/></div>
    <div><input class="input" type="date" value="${o.echeance||''}" onchange="updateSectionObjField('${ppeId}','${domId}',${oi},'echeance',this.value)"/></div>
    <div style="display:flex;gap:.3rem;align-items:center">
      <input class="input" value="${escHtml(o.evaluation||'')}" onchange="updateSectionObjField('${ppeId}','${domId}',${oi},'evaluation',this.value)"/>
      <button class="btn btn-ghost btn-sm" style="flex-shrink:0;color:#dc2626;font-size:.7rem;padding:2px 6px" onclick="removeSectionObj('${ppeId}','${domId}',${oi})">✕</button>
    </div>
  </div>${objSerafinHtml(ppeId, domId, oi, o)}${objOutcomesHtml(ppeId, domId, oi, o)}`;
}

// ── Codification SERAFIN-PH de l'objectif : codes validés (pleins) + suggestions (pointillés) ──
// Rien n'est enregistré sans clic de validation. Suggestions = analyse du texte + domaine.
function objSerafinHtml(ppeId, domId, oi, o) {
  if (typeof spSuggerer !== 'function') return '';
  // Liste blanche : un code hors nomenclature (jsonb forgé) n'est ni rendu ni injecté en onclick
  const valides = (Array.isArray(o.serafin) ? o.serafin : []).filter(spCodeValide);
  let chips = valides.map(c => spChip(c, true, `onclick="toggleObjSerafin('${ppeId}','${domId}',${oi},'${c}')"`)).join('');
  if ((o.objectif || '').trim()) {
    const sug = spSuggerer(o.objectif, domId);
    const restants = [...sug.besoins, ...sug.prestations].filter(c => !valides.includes(c));
    chips += restants.map(c => spChip(c, false, `onclick="toggleObjSerafin('${ppeId}','${domId}',${oi},'${c}')"`)).join('');
  }
  if (!chips) return '';
  return `<div style="display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin:-.15rem 0 .55rem;padding-left:.1rem">
    <span style="font-size:.58rem;font-weight:800;letter-spacing:.08em;color:#94a3b8;text-transform:uppercase;flex-shrink:0" title="Codification SERAFIN-PH — violet : besoins (1.x) · vert : prestations (2.x/3.x)">Serafin</span>
    ${chips}
  </div>`;
}

// Valide / retire un code SERAFIN sur un objectif, puis re-rend l'avenant (section rouverte).
// Circuit automatique : la codification de l'avenant et la fiche résident suivent sans autre action.
function toggleObjSerafin(ppeId, domId, oi, code) {
  const p = getPpe().find(x => x.id === ppeId);
  if (!p || !p.sections[domId] || !p.sections[domId].objectifs[oi]) return;
  const o = p.sections[domId].objectifs[oi];
  if (!Array.isArray(o.serafin)) o.serafin = [];
  const i = o.serafin.indexOf(code);
  if (i >= 0) o.serafin.splice(i, 1); else o.serafin.push(code);
  serafinDeriveAvenant(p);
  persistPpe(p);
  serafinSyncResident(p);
  renderAvenantFull(p);
  const bodyEl = document.getElementById('sectionBody_' + ppeId + '_' + domId);
  if (bodyEl) bodyEl.style.display = '';
}

function addSectionObj(ppeId, domId) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  if (!p.sections[domId]) p.sections[domId] = emptySection();
  if (!p.sections[domId].objectifs) p.sections[domId].objectifs = [];
  p.sections[domId].objectifs.push({ objectif:'', moyens:'', echeance:'', evaluation:'' });
  persistPpe(p);
  renderAvenantFull(p);
  const bodyEl = document.getElementById('sectionBody_'+ppeId+'_'+domId);
  if (bodyEl) bodyEl.style.display = '';
}

function updateSectionObjField(ppeId, domId, idx, field, value) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p || !p.sections[domId]) return;
  if (!p.sections[domId].objectifs[idx]) p.sections[domId].objectifs[idx] = { objectif:'', moyens:'', echeance:'', evaluation:'' };
  p.sections[domId].objectifs[idx][field] = value;
  persistPpe(p);
  // Le texte de l'objectif nourrit les suggestions SERAFIN : re-rendre pour
  // les afficher. DIFFÉRÉ : le change part au blur, donc un re-render immédiat
  // détruit le bouton que l'utilisateur est en train de cliquer (mousedown →
  // blur → change → DOM remplacé → le click ne part jamais, « ✍ Signer » ou
  // « Télécharger PDF » semblent morts au premier clic).
  if (field === 'objectif' && typeof spSuggerer === 'function') {
    setTimeout(() => {
      if (!document.getElementById('avenantFullView')) return; // vue refermée entre-temps
      renderAvenantFull(p);
      const bodyEl = document.getElementById('sectionBody_' + ppeId + '_' + domId);
      if (bodyEl) bodyEl.style.display = '';
    }, 350);
  }
}

function removeSectionObj(ppeId, domId, idx) {
  if (!confirm('Supprimer cette ligne ?')) return;
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p || !p.sections[domId]) return;
  p.sections[domId].objectifs.splice(idx, 1);
  persistPpe(p);
  renderAvenantFull(p);
}

function updateConclusion(ppeId, value) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  p.conclusion = value;
  persistPpe(p);
}

function updateSignature(ppeId, field, value) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  if (!p.signatures) p.signatures = { resident:'', referent:'', direction:'', date:'' };
  p.signatures[field] = value;
  persistPpe(p);
  // La date de signature pilote l'étape « Rédaction & signatures » et la cible du bilan à 6 mois
  if (field === 'date') { ppeSyncEcheances(p); renderAvenantFull(p); }
}

// ── SIGNATURES ÉLECTRONIQUES (tracés) ──
// Stockées dans p.signatures.pads (jsonb existant, aucune migration) :
// pads[role] = { image (PNG data URL), nom, signeLe, par, parNom, hash }.
// hash = SHA-256 du contenu signé ; s'il diffère du contenu actuel, la
// signature est signalée caduque (document modifié après signature).
const SIG_ROLES = [
  { key: 'resident',     label: 'La personne' },
  { key: 'representant', label: 'Le représentant légal', si: p => !!(p.protection || '').trim() },
  { key: 'referent',     label: "L'éducateur référent" },
  { key: 'direction',    label: 'La direction' }
];

function sigPads(p) { return (p.signatures && p.signatures.pads) || {}; }

// Contenu scellé par la signature : le fond de l'avenant uniquement.
// Sont EXCLUS : les signatures elles-mêmes (signer invaliderait les voisines),
// le cycle PPA (sections._cycle : le bilan à 6 mois et la réévaluation ont
// lieu APRÈS la signature par construction), les positionnements outcomes et
// les pastilles SERAFIN des objectifs (mêmes flux post-signature) — sinon le
// déroulement normal du cycle rendrait toutes les signatures caduques.
function sigContenuAvenant(p) {
  const sections = {};
  Object.entries(p.sections || {}).forEach(([k, s]) => {
    if (k === '_cycle' || !s || typeof s !== 'object') return;
    sections[k] = {
      ...s,
      objectifs: (Array.isArray(s.objectifs) ? s.objectifs : []).map(o => {
        const { outcomes, serafin, ...fond } = (o || {});
        return fond;
      })
    };
  });
  return sigStableStringify({
    residentId: p.residentId || '', residentName: p.residentName || '',
    sections, conclusion: p.conclusion || ''
  });
}

function sigNomParDefaut(p, role) {
  if (role === 'resident') return p.residentName || '';
  if (role === 'referent') return p.referent || '';
  if (role === 'direction') {
    const s = Auth.getSession();
    return s ? `${s.prenom || ''} ${s.nom || ''}`.trim() : '';
  }
  if (role === 'representant') {
    const r = residentsList().find(x => String(x.id) === String(p.residentId));
    return (r && r.protectionNom) || '';
  }
  return '';
}

function ppeSigner(ppeId, role) {
  const p = getPpe().find(x => x.id === ppeId);
  const roleDef = SIG_ROLES.find(x => x.key === role);
  if (!p || !roleDef) return;
  const pad = sigPads(p)[role];
  SignaturePad.open({
    titre: `Signature — ${roleDef.label}`,
    nom: (pad && pad.nom) || sigNomParDefaut(p, role),
    onSave: async (image, nom) => {
      const hash = await sigHashHex(sigContenuAvenant(p));
      if (!p.signatures) p.signatures = { resident: '', referent: '', direction: '', date: '' };
      if (!p.signatures.pads) p.signatures.pads = {};
      const s = Auth.getSession();
      p.signatures.pads[role] = {
        image, nom,
        signeLe: new Date().toISOString(),
        par: s ? s.userId : null,
        parNom: s ? `${s.prenom || ''} ${s.nom || ''}`.trim() : '',
        hash: hash || 'indisponible'
      };
      // Compat : les affichages existants lisent les noms tapés
      if (!(p.signatures[role] || '').trim()) p.signatures[role] = nom;
      if (!p.signatures.date) { p.signatures.date = today(); ppeSyncEcheances(p); }
      renderAvenantFull(p);
      // Une signature recueillie physiquement est difficile à re-solliciter :
      // on ne confirme le succès qu'une fois la sauvegarde réellement aboutie.
      const ok = await persistPpe(p);
      if (ok) toast(`Signature de ${escHtml(nom)} enregistrée ✓`);
      // Contresignature serveur (best-effort) : fige l'empreinte dans le
      // registre append-only, hors de portée d'une réécriture cliente.
      if (typeof sigScellerServeur === 'function') {
        const sceau = await sigScellerServeur(ppeId, role, nom);
        if (sceau && p.signatures.pads[role]) {
          p.signatures.pads[role].sceau = { id: sceau.id, empreinte: sceau.empreinte, scelleLe: sceau.scelle_le };
          await persistPpe(p);
          renderAvenantFull(p);
        }
      }
    }
  });
}

function ppeSupprSignature(ppeId, role) {
  confirmDialog('Supprimer cette signature ? Le tracé sera définitivement effacé.', () => {
    const p = getPpe().find(x => x.id === ppeId);
    if (!p || !p.signatures || !p.signatures.pads) return;
    delete p.signatures.pads[role];
    persistPpe(p);
    renderAvenantFull(p);
  });
}

function sigBlockHtml(p, rd) {
  const pad = sigPads(p)[rd.key];
  if (pad && sigImageValide(pad.image)) {
    return `<div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:.6rem">
      <strong style="font-size:.78rem">${rd.label}</strong>
      <img src="${pad.image}" alt="Signature de ${escAttr(pad.nom || '')}" style="display:block;max-height:56px;max-width:100%;margin:.4rem auto 0"/>
      <div style="font-size:.72rem;color:#15803d;font-weight:600">✒️ ${escHtml(pad.nom || '')}</div>
      <div style="font-size:.66rem;color:#64748b">le ${formatDateTime(pad.signeLe)}</div>
      ${pad.parNom ? `<div style="font-size:.62rem;color:#94a3b8">recueillie par ${escHtml(pad.parNom)}</div>` : ''}
      <div id="sigEtat-${rd.key}" style="font-size:.64rem;margin-top:2px;color:#94a3b8">vérification de l'empreinte…</div>
      <div style="display:flex;gap:.3rem;justify-content:center;margin-top:.4rem">
        <button class="btn btn-ghost btn-sm" style="font-size:.66rem" onclick="ppeSigner('${p.id}','${rd.key}')">↺ Refaire</button>
        <button class="btn btn-ghost btn-sm" style="font-size:.66rem;color:#dc2626" onclick="ppeSupprSignature('${p.id}','${rd.key}')" aria-label="Supprimer la signature">✕</button>
      </div>
    </div>`;
  }
  return `<div style="border:1px dashed #cbd5e1;border-radius:10px;padding:.6rem">
    <strong style="font-size:.78rem">${rd.label}</strong>
    <div style="margin-top:.5rem"><input class="input" style="text-align:center;font-size:.8rem" value="${escAttr(p.signatures[rd.key] || '')}" onchange="updateSignature('${p.id}','${rd.key}',this.value)" placeholder="Nom/prénom"/></div>
    <button class="btn btn-accent btn-sm" style="margin-top:.5rem;font-size:.72rem" onclick="ppeSigner('${p.id}','${rd.key}')">✍ Signer</button>
  </div>`;
}

// Vérifie a posteriori (SHA-256 asynchrone) que chaque tracé correspond
// toujours au contenu actuel de l'avenant, et met à jour les badges.
let _sigVerifSeq = 0;   // anti-course : seul le dernier appel a le droit d'écrire le DOM
async function ppeVerifSignatures(p) {
  const pads = sigPads(p);
  const roles = Object.keys(pads);
  if (!roles.length) return;
  const seq = ++_sigVerifSeq;
  const hash = await sigHashHex(sigContenuAvenant(p));

  // Repli LOCAL (rapide, garantie faible) : empreinte cliente stockée dans le
  // jsonb. Clairement étiqueté « (local) » — jamais présenté comme le scellé
  // serveur, qu'un compte interne pourrait contrefaire.
  const poserLocal = (el, pad, suffixe) => {
    const sfx = suffixe || '';
    if (!hash || !pad.hash || pad.hash === 'indisponible') { el.textContent = 'empreinte non vérifiable' + sfx; el.style.color = '#94a3b8'; return; }
    if (pad.hash === hash) { el.textContent = '🔒 conforme au document (local)' + sfx; el.style.color = '#15803d'; el.style.fontWeight = '400'; }
    else { el.textContent = '⚠️ document modifié depuis la signature (local)' + sfx; el.style.color = '#b45309'; el.style.fontWeight = '700'; }
  };

  roles.forEach(role => {
    const el = document.getElementById('sigEtat-' + role);
    if (!el) return;
    poserLocal(el, pads[role]);
    // Vérification SERVEUR pour CHAQUE signature, indépendamment du jsonb : le
    // registre est interrogé par (avenant, rôle), donc effacer pad.sceau côté
    // client ne contourne rien. Le verdict serveur, quand il répond, fait foi.
    if (typeof sigVerifierServeur !== 'function') return;
    sigVerifierServeur(p.id, role).then(r => {
      if (seq !== _sigVerifSeq) return;   // un re-render a eu lieu entre-temps
      const e = document.getElementById('sigEtat-' + role);
      if (!e || !r) return;
      if (!r.scelle) { poserLocal(e, pads[role], ' · non scellé serveur'); return; }
      const quand = r.scelle_le ? ' le ' + formatDateTime(r.scelle_le) : '';
      const nb = r.nb_sceaux > 1 ? ` <span style="font-weight:400;color:#94a3b8">(${r.nb_sceaux} scellés)</span>` : '';
      if (r.altere) {
        e.innerHTML = `⛔ altération : contenu modifié et re-scellé${nb}`;
        e.style.color = '#dc2626'; e.style.fontWeight = '700';
      } else if (r.conforme) {
        e.innerHTML = `🔐 scellé serveur — conforme${escHtml(quand)}${nb}`;
        e.style.color = '#15803d'; e.style.fontWeight = '700';
      } else {
        e.innerHTML = `⚠️ document modifié depuis la signature${escHtml(quand)}${nb}`;
        e.style.color = '#dc2626'; e.style.fontWeight = '700';
      }
    });
  });
}

async function printAvenant(id) {
  // TEMPS RÉEL : un champ encore focalisé n'a pas déclenché son onchange (il ne part
  // qu'au blur — et Safari ne blur pas au clic sur un bouton). On le force pour que
  // le PDF capture exactement ce qui est à l'écran, puis on lit le cache à jour.
  const ae = document.activeElement;
  if (ae && ['TEXTAREA', 'INPUT', 'SELECT'].includes(ae.tagName)) ae.blur();
  const list = getPpe();
  const p = list.find(x => x.id === id);
  if (!p) return;
  // La fenêtre s'ouvre AVANT tout await, sinon les bloqueurs de popups la refusent
  const w = window.open('', '_blank');
  const sigEmpreinte = await sigHashHex(sigContenuAvenant(p));
  // Verdicts SERVEUR (registre append-only) récupérés avant impression : le PDF
  // ne se fie jamais au jsonb (falsifiable en interne) pour affirmer « conforme ».
  const sigVerdicts = {};
  if (typeof sigVerifierServeur === 'function') {
    for (const rd of SIG_ROLES) {
      const pad = sigPads(p)[rd.key];
      if (pad && sigImageValide(pad.image)) sigVerdicts[rd.key] = await sigVerifierServeur(p.id, rd.key);
    }
  }
  const settings = DB.get(DB.keys.settings) || {};
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Avenant — ${escHtml(p.residentName)}</title>
<style>
  @page { margin:1.5cm 1.4cm; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter','Segoe UI',system-ui,sans-serif; font-size:9.5pt; line-height:1.65; color:#334155;
         -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page { max-width:780px; margin:0 auto; }

  /* ── En-tête de marque ── */
  .head-stripe { height:7px; background:linear-gradient(90deg,#0f2b4a,#4f46e5 55%,#7c3aed); border-radius:0 0 5px 5px; }
  .doc-meta { display:flex; justify-content:space-between; font-size:7pt; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; margin:.35cm 0 .5cm; }
  .head-row { display:flex; align-items:flex-start; justify-content:space-between; gap:.5cm; }
  .etab { font-size:9pt; font-weight:600; color:#64748b; letter-spacing:.02em; }
  .doc-title { font-size:19pt; font-weight:800; color:#0f2b4a; letter-spacing:-.02em; line-height:1.15; margin-top:.05cm; }
  .statut-chip { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:4px 12px; border-radius:999px; white-space:nowrap; }
  .statut-chip.actif { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }
  .statut-chip.brouillon { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
  .statut-chip.termine { background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; }

  /* ── Bandeau résident ── */
  .res-band { display:flex; align-items:center; gap:.4cm; background:#f8faff; border:1px solid #e0e7ff; border-radius:12px; padding:.32cm .4cm; margin:.45cm 0 .55cm; }
  .res-avatar { width:1.35cm; height:1.35cm; border-radius:50%; background:#0f2b4a; color:#fff; font-size:12pt; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .res-nom { font-size:13pt; font-weight:800; color:#0f2b4a; }
  .res-pills { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
  .pill { display:inline-block; font-size:7pt; font-weight:600; color:#475569; background:#fff; border:1px solid #e2e8f0; border-radius:999px; padding:2px 8px; }
  .pill.amber { color:#b45309; background:#fffbeb; border-color:#fde68a; }

  /* ── Sections ── */
  h2 { font-size:10.5pt; font-weight:800; color:#0f2b4a; margin:.55cm 0 .22cm; display:flex; align-items:center; gap:6px;
       border-bottom:2px solid var(--dc,#e2e8f0); padding-bottom:3px; }
  h2 .dot { width:9pt; height:9pt; border-radius:3pt; background:var(--dc,#7c3aed); display:inline-block; flex-shrink:0; }
  .section { --dc:#7c3aed; page-break-inside:auto; }

  /* ── Cycle du projet ── */
  table.cycle { width:100%; border-collapse:separate; border-spacing:4px 0; table-layout:fixed; margin:.15cm 0 .1cm; }
  table.cycle td { border:1px solid #e2e8f0; border-radius:8px; padding:5px 4px; text-align:center; vertical-align:top; background:#fff; }
  table.cycle td.fait { background:#f0fdf4; border-color:#bbf7d0; }
  table.cycle td.retard { background:#fef2f2; border-color:#fecaca; }
  .cyc-ico { font-size:9pt; font-weight:800; }
  td.fait .cyc-ico { color:#15803d; } td.retard .cyc-ico { color:#dc2626; } .cyc-ico { color:#94a3b8; }
  .cyc-lbl { font-size:6.8pt; font-weight:700; color:#0f2b4a; line-height:1.25; margin-top:1px; }
  .cyc-sub { font-size:6.2pt; color:#94a3b8; line-height:1.3; }
  td.retard .cyc-sub { color:#dc2626; font-weight:600; }

  /* ── Tableaux d'objectifs ── */
  table.obj { width:100%; border-collapse:collapse; font-size:8.3pt; margin:.15cm 0; }
  table.obj td, table.obj th { border:1px solid #e5eaf1; padding:5px 8px; vertical-align:top; }
  table.obj th { background:color-mix(in srgb, var(--dc,#7c3aed) 7%, #fff); color:#0f2b4a; font-weight:700; text-align:left; font-size:7pt; text-transform:uppercase; letter-spacing:.05em; }
  table.obj tr:nth-child(even) td { background:#fafbfd; }
  .tag { display:inline-block; font-size:6.6pt; font-weight:700; border-radius:999px; padding:1px 7px; margin-top:3px; margin-right:3px; }
  .tag.ser { color:#6d28d9; background:#f5f3ff; border:1px solid #ede9fe; }
  .tag.oc  { color:#1d4ed8; background:#eff6ff; border:1px solid #dbeafe; }

  .card { background:#f8fafc; border:1px solid #e5eaf1; border-left:3px solid var(--dc,#7c3aed); border-radius:8px; padding:7px 11px; margin:.15cm 0; font-size:8.4pt; }
  .card strong { color:#0f2b4a; }
  .card.expr { background:#fff; border-left-color:#e85d04; }
  .card.expr strong { color:#e85d04; }
  .no-obj { font-style:italic; color:#94a3b8; font-size:8.4pt; padding:2px 0; }

  /* ── Signatures ── */
  .sig-section { margin-top:.9cm; page-break-inside:avoid; }
  .sig-row { display:flex; justify-content:space-between; gap:.5cm; margin-top:.25cm; }
  .sig-box { flex:1; border:1px solid #e5eaf1; border-radius:10px; padding:.25cm .3cm .1cm; background:#fafbfd; text-align:center; }
  .sig-role { font-size:6.8pt; font-weight:800; color:#0f2b4a; text-transform:uppercase; letter-spacing:.07em; }
  .sig-line { border-top:1px solid #cbd5e1; margin-top:1.15cm; padding:3px 0 4px; font-size:8pt; color:#475569; min-height:.55cm; }
  .sig-date { text-align:center; margin-top:.3cm; font-size:8.4pt; color:#475569; }
  .sig-date strong { color:#0f2b4a; }

  /* ── Signature INTERNALIS, répétée en bas de CHAQUE page imprimée ──
     Recette robuste : le <tfoot> du tableau-cadre RÉSERVE la place sur chaque
     page (les navigateurs répètent le tfoot à l'impression), et ce bloc fixe
     vient s'y peindre — aucun chevauchement, aucun décalage du contenu. */
  table.frame { width:100%; border-collapse:collapse; }
  table.frame > tbody > tr > td, table.frame > tfoot > tr > td { border:none; padding:0; }
  .footer-space { height:1.3cm; }
  .brand-footer { position:fixed; bottom:0; left:0; right:0; height:1.3cm; background:#fff; text-align:center; padding-top:6px; }
  .brand-footer .rule { width:36%; height:1px; background:#e2e8f0; margin:0 auto 5px; }
  .brand-footer .brand { font-family:Georgia,'Times New Roman',serif; font-size:9pt; font-weight:700; letter-spacing:.28em; color:#1e40af; }
  .brand-footer .tagline { font-size:6.2pt; color:#94a3b8; letter-spacing:.04em; margin-top:1px; }
</style></head><body>

<div class="brand-footer">
  <div class="rule"></div>
  <div class="brand">INTERNALIS</div>
  <div class="tagline">Le projet personnalisé, du papier à la vie quotidienne — document généré le ${new Date().toLocaleDateString('fr-FR')}</div>
</div>

<table class="frame">
<tfoot><tr><td><div class="footer-space"></div></td></tr></tfoot>
<tbody><tr><td>
<div class="page">
<div class="head-stripe"></div>
<div class="doc-meta"><span>Document confidentiel — usage professionnel</span><span>${new Date().toLocaleDateString('fr-FR')}</span></div>

<div class="head-row">
  <div>
    <div class="etab">${escHtml(settings.etablissement||"Foyer d'Hébergement")}</div>
    <div class="doc-title">Projet personnalisé<br>Avenant</div>
  </div>
  <span class="statut-chip ${p.statut}">${STATUT_PPE_LABEL[p.statut]||p.statut}</span>
</div>

<div class="res-band">
  <div class="res-avatar">${_avInitials(p.residentName)}</div>
  <div>
    <div class="res-nom">${escHtml(p.residentName||'—')}</div>
    <div class="res-pills">
      ${p.dateRedaction ? `<span class="pill">📅 Rédigé le ${formatDate(p.dateRedaction)}</span>` : ''}
      ${p.dateRevision ? `<span class="pill amber">🔄 Révision le ${formatDate(p.dateRevision)}</span>` : ''}
      ${p.referent ? `<span class="pill">🧑‍🏫 ${escHtml(p.referent)}</span>` : ''}
      ${p.protection ? `<span class="pill">🛡 ${escHtml(p.protection)}</span>` : ''}
      ${[p.atelier, p.employeur].filter(Boolean).length ? `<span class="pill">🏭 ${escHtml([p.atelier, p.employeur].filter(Boolean).join(' · '))}</span>` : ''}
      ${p.entreeEsat ? `<span class="pill">🚪 Entrée ESAT ${formatDate(p.entreeEsat)}</span>` : ''}
    </div>
  </div>
</div>

${(() => {
  const steps = ppeCycleSteps(p);
  const LBL = { attentes: 'Recueil des attentes', coconstruction: 'Co-construction', signatures: 'Rédaction & signatures', bilan6: 'Bilan intermédiaire', reeval: 'Réévaluation annuelle' };
  const cells = steps.map(s => {
    const cls = s.done ? 'fait' : s.late ? 'retard' : '';
    const ico = s.done ? '✔' : s.late ? '⚠' : '○';
    const sub = s.done ? 'Fait le ' + formatDate(s.date) + (s.par ? '<br>' + escHtml(s.par) : '')
      : s.late ? 'En retard<br>prévu le ' + formatDate(s.cible)
      : (s.cible ? 'Prévu le<br>' + formatDate(s.cible) : 'À venir');
    return `<td class="${cls}"><div class="cyc-ico">${ico}</div><div class="cyc-lbl">${LBL[s.id]}</div><div class="cyc-sub">${sub}</div></td>`;
  }).join('');
  const b = (p.sections && p.sections._cycle && p.sections._cycle.bilan6) || null;
  const bilanHtml = b && b.date ? `<div class="card" style="--dc:#4f46e5"><strong>Bilan intermédiaire du ${formatDate(b.date)}${b.participants ? ' — ' + escHtml(b.participants) : ''} :</strong> ${escHtml(b.synthese || '—')}${b.ajustements ? `<br><strong>Ajustements décidés :</strong> ${escHtml(b.ajustements)}` : ''}</div>` : '';
  return `<div class="section" style="--dc:#4f46e5"><h2><span class="dot"></span>Cycle du projet personnalisé</h2>
    <table class="cycle"><tr>${cells}</tr></table>${bilanHtml}</div>`;
})()}

${DOMAINES.map(d => {
  const s = p.sections[d.id] || emptySection();
  const dc = (typeof DOM_COLORS !== 'undefined' && DOM_COLORS[d.id]) || '#7c3aed';
  const hasContent = (s.bilan || '').trim() || (s.expression || '').trim() || (s.objectifs || []).some(o => (o.objectif || '').trim());
  if (!hasContent) return '';
  return `<div class="section" style="--dc:${dc}"><h2><span class="dot"></span>${d.icon} ${d.label}</h2>
    ${s.bilan ? `<div class="card"><strong>Bilan :</strong> ${escHtml(s.bilan)}</div>` : ''}
    ${s.objectifs.length ? `<table class="obj"><thead><tr><th style="width:30%">Objectif</th><th style="width:31%">Moyens / Actions</th><th style="width:14%">Échéance</th><th style="width:25%">Évaluation</th></tr></thead>
    <tbody>${s.objectifs.filter(o => (o.objectif || '').trim()).map(o => {
      const spc = (o.serafin||[]).filter(c => typeof spCodeValide === 'function' && spCodeValide(c));
      let oc = '';
      if (o.outcomes && typeof _ocNiv === 'function') {
        const g = (m, rt) => { const x = o.outcomes[m] && o.outcomes[m][rt]; return (x && _ocNiv(x.v)) ? x.v : null; };
        const part = (lbl, rt) => { const dd = g('debut', rt), f = g('fin', rt); return (dd !== null || f !== null) ? `${lbl} ${dd ?? '·'}→${f ?? '·'}` : ''; };
        const txt = [part('personne', 'auto'), part('équipe', 'pro')].filter(Boolean).join(' · ');
        if (txt) oc = `<span class="tag oc">Distance : ${txt}</span>`;
      }
      return `<tr><td>${escHtml(o.objectif||'')}${spc.length ? `<br><span class="tag ser">SERAFIN-PH ${spc.join(' · ')}</span>` : ''}${oc ? '<br>' + oc : ''}</td><td>${escHtml(o.moyens||'')}</td><td>${formatDate(o.echeance)||''}</td><td>${escHtml(o.evaluation||'')}</td></tr>`;
    }).join('')}</tbody></table>` : '<div class="no-obj">Aucun objectif défini pour ce domaine.</div>'}
    ${s.expression ? `<div class="card expr"><strong>Expression de la personne :</strong> ${escHtml(s.expression)}</div>` : ''}</div>`;
}).join('')}

${p.conclusion ? `<div class="section" style="--dc:#0f2b4a"><h2><span class="dot"></span>Conclusion</h2>
<div class="card" style="--dc:#0f2b4a">${escHtml(p.conclusion)}</div></div>` : ''}

<div class="sig-section section" style="--dc:#0f2b4a">
<h2><span class="dot"></span>Signatures</h2>
<div class="sig-row">
  ${SIG_ROLES.filter(rd => !rd.si || rd.si(p) || sigPads(p)[rd.key]).map(rd => {
    const pad = sigPads(p)[rd.key];
    if (pad && sigImageValide(pad.image)) {
      // Verdict SERVEUR prioritaire (calculé depuis la base + registre
      // append-only, non falsifiable en interne). Repli sur l'empreinte locale
      // seulement si le serveur n'a pas répondu, et alors CLAIREMENT étiqueté
      // « local » pour ne jamais revendiquer à tort un scellé serveur.
      const v = sigVerdicts[rd.key];
      let etat;
      if (v && v.scelle) {
        etat = v.altere
          ? '<span style="font-size:6.4pt;color:#dc2626;font-weight:700">⛔ altération : contenu modifié et re-scellé</span>'
          : v.conforme
            ? '<span style="font-size:6.4pt;color:#15803d;font-weight:700">🔐 scellé serveur — conforme</span>'
            : '<span style="font-size:6.4pt;color:#dc2626;font-weight:700">⚠️ document modifié depuis la signature</span>';
      } else {
        const refLoc = pad.hash && pad.hash !== 'indisponible' ? pad.hash : null;
        etat = refLoc && sigEmpreinte && refLoc === sigEmpreinte
          ? '<span style="font-size:6.4pt;color:#15803d">🔒 conforme au document (vérification locale)</span>'
          : refLoc
            ? '<span style="font-size:6.4pt;color:#b45309;font-weight:700">⚠️ document modifié depuis la signature (local)</span>'
            : '<span style="font-size:6.4pt;color:#94a3b8">empreinte non vérifiable</span>';
      }
      return `<div class="sig-box"><div class="sig-role">${rd.label}</div>
        <div style="margin-top:.12cm"><img src="${pad.image}" alt="" style="max-height:1.05cm;max-width:100%"/></div>
        <div class="sig-line" style="margin-top:.05cm">${escHtml(pad.nom||'')}<br><span style="font-size:6.6pt;color:#94a3b8">signé électroniquement le ${formatDateTime(pad.signeLe)}${pad.parNom ? ` · recueillie par ${escHtml(pad.parNom)}` : ''}</span><br>${etat}</div>
      </div>`;
    }
    return `<div class="sig-box"><div class="sig-role">${rd.label}</div><div class="sig-line">${escHtml(p.signatures[rd.key]||'')}</div></div>`;
  }).join('')}
</div>
<div class="sig-date"><strong>Date de signature :</strong> ${formatDate(p.signatures.date)||'__________'}</div>
${Object.keys(sigPads(p)).length ? `<div style="text-align:center;font-size:6.6pt;color:#94a3b8;margin-top:.15cm">Signatures électroniques simples recueillies sur INTERNALIS — horodatées et rattachées au compte connecté. Empreinte de contrôle SHA-256 du document imprimé : ${sigEmpreinte ? `${sigEmpreinte.slice(0,12)}…` : 'indisponible'}.</div>` : ''}
</div>

</div>
</td></tr></tbody>
</table>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}

// ── Carte avenant « Cycle du projet » (design C) ──
function _avInitials(name) {
  return (name||'?').split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
}
function _avStatutDot(s) {
  return s==='actif'?'●':s==='brouillon'?'◐':'○';
}
function _hexToRgba(hex, a) {
  const h = (hex||'#0f2b4a').replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}


// Mini-stepper des 5 étapes du cycle (✓ fait, n° en cours, ! en retard)
function _avCycleMini(p) {
  const steps = ppeCycleSteps(p);
  const current = steps.find(s => !s.done);
  const LBL = { attentes: 'Attentes', coconstruction: 'Co-constr.', signatures: 'Signé', bilan6: 'Bilan 6 m', reeval: 'Rééval.' };
  const dots = steps.map((s, i) => {
    const cur = current && current.id === s.id;
    let dot;
    if (s.done) dot = `<span style="width:20px;height:20px;border-radius:50%;background:#16a34a;color:#fff;font-size:10px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">✓</span>`;
    else if (s.late) dot = `<span style="width:20px;height:20px;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">!</span>`;
    else if (cur) dot = `<span style="width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid #4f46e5;color:#4f46e5;font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${s.n}</span>`;
    else dot = `<span style="width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid #cbd5e1;color:#94a3b8;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${s.n}</span>`;
    const link = i < steps.length - 1 ? `<span style="flex:1;height:2px;background:${s.done ? '#16a34a' : '#e2e8f0'}"></span>` : '';
    return dot + link;
  }).join('');
  const labels = steps.map(s => {
    const cur = current && current.id === s.id;
    return `<span style="font-size:8.5px;color:${s.late ? '#dc2626' : cur ? '#4f46e5' : '#94a3b8'};font-weight:${cur || s.late ? '800' : '500'}">${LBL[s.id] || s.id}</span>`;
  }).join('');
  return `<div style="display:flex;align-items:center;gap:3px;margin:.55rem 0 .15rem">${dots}</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">${labels}</div>`;
}

// Pastille outcomes agrégée : moyenne des positionnements début → fin (🧑 personne / 👥 équipe)
function _avOutcomesPill(p) {
  if (typeof _ocGet !== 'function') return '';
  const acc = { auto: { deb: [], fin: [] }, pro: { deb: [], fin: [] } };
  Object.values(p.sections || {}).forEach(s => (s.objectifs || []).forEach(o => {
    if (!o || !o.outcomes) return;
    ['auto', 'pro'].forEach(r => {
      const d = _ocGet(o, 'debut', r), f = _ocGet(o, 'fin', r);
      if (d && _ocNiv(d.v)) acc[r].deb.push(d.v);
      if (f && _ocNiv(f.v)) acc[r].fin.push(f.v);
    });
  }));
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
  const part = (icon, r) => {
    const d = avg(acc[r].deb), f = avg(acc[r].fin);
    if (d === null && f === null) return '';
    return `${icon} ${d ?? '·'}→${f ?? '·'}`;
  };
  const txt = [part('🧑', 'auto'), part('👥', 'pro')].filter(Boolean).join(' · ');
  return txt ? `<span style="font-size:.64rem;font-weight:700;color:#1d4ed8;background:#eff6ff;border-radius:999px;padding:2px 8px;white-space:nowrap">${txt}</span>` : '';
}

// Ouvre l'avenant directement sur le formulaire de bilan intermédiaire
function openAvenantBilan(id) {
  openAvenant(id);
  setTimeout(() => {
    const f = document.getElementById('pcBilanForm');
    if (f) { f.style.display = ''; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }, 60);
}

function renderAvenant() {
  const container = document.getElementById('avenantList');
  if (!container) return;
  container.style.display = '';
  let list = getPpe();
  const search = (document.getElementById('searchAvenant')?.value || '').toLowerCase();
  const filterRes = document.getElementById('filterResidentAvenant')?.value || '';
  const filterStatut = document.getElementById('filterStatutAvenant')?.value || '';

  list = list.filter(p => {
    if (filterRes && p.residentId !== filterRes) return false;
    if (filterStatut && p.statut !== filterStatut) return false;
    if (search && !`${p.residentName||''}`.toLowerCase().includes(search)) return false;
    return true;
  });

  list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  if (!list.length) {
    container.innerHTML = '<div class="empty" style="padding:3rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg></div><p>Aucun avenant</p><button class="btn btn-outline btn-sm" onclick="openModal(\'modalAvenant\')">Créer un avenant</button></div>';
    return;
  }

  const residents = residentsList();
  container.innerHTML = `<div class="av-grid">${list.map(p => {
    const r = residents.find(x => x.id === p.residentId);
    const col = r?.color || '#0f2b4a';
    const totalObj = Object.values(p.sections||{}).reduce((a,s)=>a+(s.objectifs?.filter(o=>o.objectif?.trim()).length||0),0);
    const domainesActifs = Object.values(p.sections||{}).filter(s=>(s.bilan||'').trim()).length;
    // Anneau de complétude du cycle autour de l'avatar
    const steps = ppeCycleSteps(p);
    const faits = steps.filter(s => s.done).length;
    const enRetard = steps.some(s => s.late);
    const courant = steps.find(s => !s.done);
    const C = 2 * Math.PI * 24;
    const ringCol = enRetard ? '#dc2626' : col;
    const inner = r?.photo
      ? `<img src="${r.photo}" style="position:absolute;inset:5px;width:calc(100% - 10px);height:calc(100% - 10px);border-radius:50%;object-fit:cover" alt="${escHtml(p.residentName)}"/>`
      : `<span style="position:absolute;inset:5px;border-radius:50%;background:${_hexToRgba(col,.18)};color:${col};font-size:.85rem;font-weight:800;display:flex;align-items:center;justify-content:center">${_avInitials(p.residentName)}</span>`;
    const avatarHtml = `<div style="position:relative;width:54px;height:54px;flex-shrink:0" title="Cycle du projet : ${faits}/5 étapes">
      <svg viewBox="0 0 54 54" width="54" height="54"><circle cx="27" cy="27" r="24" fill="none" stroke="#eef1f6" stroke-width="4"/>
      <circle cx="27" cy="27" r="24" fill="none" stroke="${ringCol}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - faits / 5)).toFixed(1)}" transform="rotate(-90 27 27)"/></svg>
      ${inner}
    </div>`;
    // Bouton contextuel selon l'étape du cycle
    let ctx;
    if (courant && courant.id === 'bilan6') ctx = `<button class="btn btn-sm" style="flex:1;justify-content:center;background:#faf5ff;border:1px solid #ede9fe;color:#6d28d9" onclick="event.stopPropagation();openAvenantBilan('${p.id}')">📝 Faire le bilan</button>`;
    else if (courant && courant.id === 'reeval' && courant.late) ctx = `<button class="btn btn-sm" style="flex:1;justify-content:center;background:#fef2f2;border:1px solid #fecaca;color:#dc2626" onclick="event.stopPropagation();openAvenant('${p.id}')">⚠ Réévaluer</button>`;
    else ctx = `<button class="btn btn-outline btn-sm" style="flex:1;justify-content:center;border-color:${_hexToRgba(col,.4)};color:${col}" onclick="event.stopPropagation();editAvenant('${p.id}')">Modifier</button>`;
    const ocPill = _avOutcomesPill(p);
    return `<div class="av-card" style="border-color:${_hexToRgba(col,.25)}" onclick="openAvenant('${p.id}')">
      <div style="display:flex;align-items:center;gap:.7rem;padding:.85rem .95rem .35rem">
        ${avatarHtml}
        <div style="flex:1;min-width:0">
          <div style="font-size:.95rem;font-weight:800;color:#0f2b4a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.residentName||'—')}</div>
          <div style="font-size:.7rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.atelier||'—')}${p.referent ? ' · ' + escHtml(p.referent) : ''}</div>
        </div>
        <span class="av-card-statut ${p.statut}" style="flex-shrink:0">${_avStatutDot(p.statut)} ${STATUT_PPE_LABEL[p.statut]||p.statut}</span>
      </div>
      <div style="padding:0 .95rem">
        ${_avCycleMini(p)}
        <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.6rem">
          <span style="font-size:.64rem;font-weight:700;color:#64748b;background:transparent;border:0.5px solid #e2e8f0;border-radius:999px;padding:2px 8px;white-space:nowrap">🎯 ${totalObj} objectif${totalObj>1?'s':''} · ${domainesActifs} domaine${domainesActifs>1?'s':''}</span>
          ${ocPill}
          ${p.protection ? `<span style="font-size:.64rem;font-weight:600;color:#475569;background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:999px;padding:2px 8px;white-space:nowrap">🛡 ${escHtml(p.protection)}</span>` : ''}
        </div>
        <div style="font-size:.66rem;color:#94a3b8;margin-bottom:.55rem">📅 ${formatDate(p.dateRedaction)} → 🔄 ${formatDate(p.dateRevision) || '—'} · ${escHtml(p.createdBy||'—')}</div>
      </div>
      <div class="av-card-footer" style="border-top-color:${_hexToRgba(col,.15)}">
        <button class="btn btn-sm" style="flex:1;justify-content:center;background:${col};color:#fff;border:none" onclick="event.stopPropagation();openAvenant('${p.id}')">Ouvrir</button>
        ${ctx}
        <button class="btn btn-ghost btn-sm" style="color:#dc2626;flex:0" onclick="event.stopPropagation();deleteAvenant('${p.id}')" title="Supprimer">✕</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function editAvenant(id) {
  const list = getPpe();
  const p = list.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modalAvenantTitle').textContent = 'Modifier l\'avenant';
  document.getElementById('avenantEditId').value = id;
  document.getElementById('fAvResident').value = p.residentId || '';
  document.getElementById('fAvDateRedac').value = p.dateRedaction || '';
  document.getElementById('fAvRevision').value = p.dateRevision || '';
  document.getElementById('fAvReferent').value = p.referent || '';
  document.getElementById('fAvProtection').value = p.protection || '';
  document.getElementById('fAvEmployeur').value = p.employeur || '';
  document.getElementById('fAvAtelier').value = p.atelier || '';
  document.getElementById('fAvEntreeEsat').value = p.entreeEsat || '';
  openModal('modalAvenant');
}

function changeAvenantStatut(id) {
  const list = getPpe();
  const p = list.find(x => x.id === id);
  if (!p) return;
  if (p.statut === 'brouillon') p.statut = 'actif';
  else if (p.statut === 'actif') p.statut = 'termine';
  else return;
  persistPpe(p);
  ppeSyncEcheances(p);
  toast(`Avenant ${p.statut === 'actif' ? 'activé' : 'terminé'}`);
  const full = document.getElementById('avenantFullView');
  if (full) renderAvenantFull(p);
  else renderAvenant();
}

function deleteAvenant(id) {
  if (!confirm('Supprimer cet avenant ?')) return;
  (async () => {
    try { await sbDeletePpe(id); _ppeCache = _ppeCache.filter(p => p.id !== id); }
    catch (e) { console.error('[deleteAvenant]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    // Échéances du cycle liées à cet avenant : on ne laisse pas d'orphelines
    if (typeof sbDeleteEcheancesBySource === 'function') {
      try { await sbDeleteEcheancesBySource('ppa6_' + id); await sbDeleteEcheancesBySource('ppa12_' + id); }
      catch (e) { console.warn('[deleteAvenant] échéances du cycle non supprimées', e); }
    }
    toast('Avenant supprimé');
    const full = document.getElementById('avenantFullView');
    if (full) backToList();
    renderAvenant();
  })();
}

function resetAvenantModal() {
  document.getElementById('modalAvenantTitle').textContent = 'Nouvel avenant';
  document.getElementById('avenantEditId').value = '';
  document.getElementById('fAvResident').value = '';
  document.getElementById('fAvDateRedac').value = new Date().toISOString().slice(0,10);
  document.getElementById('fAvRevision').value = '';
  document.getElementById('fAvReferent').value = '';
  document.getElementById('fAvProtection').value = '';
  document.getElementById('fAvEmployeur').value = '';
  document.getElementById('fAvAtelier').value = '';
  document.getElementById('fAvEntreeEsat').value = '';
}

async function genererAvenantFromJournal(existingId) {
  let residentId, resident;
  if (existingId) {
    const list = getPpe();
    const p = list.find(x => x.id === existingId);
    if (!p) { toast('Avenant introuvable', 'error'); return; }
    residentId = p.residentId;
    const residents = residentsList();
    resident = residents.find(r => String(r.id) === String(residentId));
  } else {
    residentId = document.getElementById('fAvResident').value;
    if (!residentId) { toast('Veuillez d\'abord choisir un résident', 'error'); return; }
    const residents = residentsList();
    resident = residents.find(r => String(r.id) === String(residentId));
  }
  if (!resident) { toast('Résident introuvable', 'error'); return; }

  const journal = DB.get(DB.keys.journal) || [];
  const entries = journal.filter(e => e.residentId === residentId);
  if (entries.length === 0) { toast('Aucune entrée de journal pour ce résident', 'error'); return; }

  toast('🤖 Génération depuis le journal…', 'info');

  const result = await aiAvenantFromJournal(resident, entries);

  if (existingId) {
    const list = getPpe();
    const p = list.find(x => x.id === existingId);
    if (!p) return;
    const _cyc = p.sections && p.sections._cycle;   // le cycle du PPA survit à la régénération
    p.sections = result.sections || {};
    if (_cyc) p.sections._cycle = _cyc;
    p.conclusion = result.conclusion || '';
    ensureSectionsComplete(p.sections);
    persistPpe(p);
    toast('✅ Avenant régénéré depuis le journal', 'success');
    renderAvenantFull(p);
  } else {
    const residentInfo = `${resident.prenom || ''} ${resident.nom || ''}`.trim();
    const list = getPpe();
    const now = new Date().toISOString();
    const avenant = {
      residentId, residentName: residentInfo,
      dateRedaction: now.slice(0, 10), dateRevision: '', referent: '',
      protection: '', employeur: '', atelier: '', entreeEsat: '',
      statut: 'brouillon',
      sections: result.sections || {},
      conclusion: result.conclusion || '',
      signatures: { resident: null, referent: null, direction: null, date: null },
      createdBy: (() => { const s = Auth.getSession(); return s ? `${s.prenom||''} ${s.nom||''}`.trim() || s.username : '?'; })()
    };
    ensureSectionsComplete(avenant.sections);
    let saved;
    try { saved = await sbSavePpe(avenant); } catch (e) { console.error(e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
    list.unshift(saved);
    closeModal('modalAvenant');
    toast('✅ Avenant généré depuis le journal', 'success');
    renderAvenant();
    setTimeout(() => openAvenant(saved.id), 400);
  }
}

// ═══════════════════════════════════════════
//  COMPARAISON D'AVENANTS
// ═══════════════════════════════════════════
function openCompareAvenant(id) {
  const list = getPpe();
  const cur = list.find(p => p.id === id);
  if (!cur) return;
  const others = list.filter(p => String(p.residentId) === String(cur.residentId) && p.id !== id)
    .sort((a, b) => (b.dateRedaction || '').localeCompare(a.dateRedaction || ''));
  if (!others.length) { toast('Aucun autre avenant pour ce résident à comparer', 'info'); return; }
  const opts = others.map(o => `<option value="${o.id}">${o.dateRedaction || '?'} — ${STATUT_PPE_LABEL[o.statut] || o.statut}</option>`).join('');
  document.getElementById('compareBody').innerHTML = `
    <div style="margin-bottom:1rem;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;font-size:.88rem">
      <strong>${escHtml(cur.residentName)}</strong>
      <span>— comparer l'avenant du <strong>${cur.dateRedaction || '?'}</strong> avec :</span>
      <select id="compareSel" class="form-control" style="width:auto" onchange="renderCompare('${id}', this.value)">${opts}</select>
    </div>
    <div id="compareTable"></div>`;
  openModal('modalCompare');
  renderCompare(id, others[0].id);
}

function renderCompare(idA, idB) {
  const list = getPpe();
  const A = list.find(p => p.id === idA), B = list.find(p => p.id === idB);
  if (!A || !B) return;
  const td = 'padding:.55rem;border-bottom:1px solid var(--border);vertical-align:top';
  const objCount = s => (s.objectifs || []).filter(o => o.objectif && o.objectif.trim()).length;
  const rows = DOMAINES.map(d => {
    const sa = (A.sections && A.sections[d.id]) || {}, sb = (B.sections && B.sections[d.id]) || {};
    const oa = objCount(sa), ob = objCount(sb);
    const diff = oa - ob;
    const trend = diff > 0 ? `<span style="color:#16a34a;font-weight:700"> (+${diff})</span>` : diff < 0 ? `<span style="color:#dc2626;font-weight:700"> (${diff})</span>` : '';
    return `<tr>
      <td style="${td};font-weight:700;color:var(--primary);white-space:nowrap">${d.icon} ${d.label}</td>
      <td style="${td}">${escHtml(sb.bilan || '—')}<div style="font-size:.7rem;color:var(--muted);margin-top:.3rem">${ob} objectif(s)</div></td>
      <td style="${td}">${escHtml(sa.bilan || '—')}<div style="font-size:.7rem;color:var(--muted);margin-top:.3rem">${oa} objectif(s)${trend}</div></td>
    </tr>`;
  }).join('');
  const thStyle = 'text-align:left;padding:.55rem;border-bottom:2px solid var(--primary);font-size:.78rem;color:var(--primary)';
  document.getElementById('compareTable').innerHTML = `
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">
      <thead><tr>
        <th style="${thStyle}">Domaine</th>
        <th style="${thStyle}">Avenant du ${B.dateRedaction || '?'} <span style="font-weight:400;color:var(--muted)">(plus ancien)</span></th>
        <th style="${thStyle}">Avenant du ${A.dateRedaction || '?'} <span style="font-weight:400;color:var(--muted)">(en cours)</span></th>
      </tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:.74rem;color:var(--muted);margin-top:.75rem">Les variations entre parenthèses indiquent l'évolution du nombre d'objectifs par domaine.</div>`;
}

async function aiAvenantFromJournal(resident, entries) {
  let result = null;

  if (!result) {
    const objTemplates = {
      autonomie: [
        { obj: 'Développer l\'autonomie dans les actes de la vie quotidienne', moyens: 'Ateliers pratiques, mise en situation supervisée', eval: 'Nombre d\'actes réalisés sans aide' },
        { obj: 'Renforcer les capacités d\'auto-prise en charge', moyens: 'Planification hebdomadaire, suivi éducatif individualisé', eval: 'Taux de réalisation des objectifs fixés' }
      ],
      sante: [
        { obj: 'Suivre et stabiliser l\'état de santé global', moyens: 'Consultations médicales régulières, observances des traitements', eval: 'Assiduité aux rendez-vous, stabilité clinique' },
        { obj: 'Adopter une hygiène de vie adaptée', moyens: 'Ateliers nutrition, activité physique encadrée', eval: 'Amélioration des indicateurs de santé' }
      ],
      viePro: [
        { obj: 'Consolider les acquis professionnels', moyens: 'Mise en situation en atelier, tutorat renforcé', eval: 'Atteinte des objectifs du projet professionnel' },
        { obj: 'Développer les compétences transversales', moyens: 'Formations adaptées, stages en milieu ordinaire', eval: 'Évolution des compétences évaluées' }
      ],
      logement: [
        { obj: 'Acquérir ou maintenir les savoir-être liés au logement', moyens: 'Entretien du logement accompagné, gestion du budget logement', eval: 'Autonomie dans l\'entretien et la gestion' },
        { obj: 'Optimiser l\'utilisation de l\'espace de vie', moyens: 'Aménagement personnalisé, rangement organisé', eval: 'Qualité du cadre de vie' }
      ],
      vieSociale: [
        { obj: 'Favoriser l\'intégration sociale et les loisirs', moyens: 'Sorties collectives, inscription à des activités', eval: 'Fréquence de participation aux activités' },
        { obj: 'Développer le réseau relationnel', moyens: 'Encouragement aux initiatives, groupe de parole', eval: 'Nombre de relations sociales stables' }
      ],
      vieAffective: [
        { obj: 'Accompagner la vie affective et relationnelle', moyens: 'Entretiens individuels, médiation familiale si besoin', eval: 'Qualité des échanges et bien-être exprimé' },
        { obj: 'Favoriser l\'expression des émotions', moyens: 'Ateliers d\'expression, temps d\'échange', eval: 'Capacité à verbaliser ses émotions' }
      ],
      budget: [
        { obj: 'Acquérir une gestion budgétaire autonome', moyens: 'Ateliers budget, suivi personnalisé des dépenses', eval: 'Équilibre budgétaire mensuel' },
        { obj: 'Maîtriser les outils de gestion financière', moyens: 'Utilisation d\'un tableau de bord, épargne programmée', eval: 'Capacité à gérer seul son budget' }
      ],
      transport: [
        { obj: 'Développer les compétences de mobilité', moyens: 'Apprentissage des trajets, permis de conduire', eval: 'Autonomie dans les déplacements' },
        { obj: 'Sécuriser les déplacements', moyens: 'Sensibilisation aux règles de sécurité, accompagnement progressif', eval: 'Respect des règles de sécurité' }
      ],
      orientation: [
        { obj: 'Définir un projet d\'orientation personnalisé', moyens: 'Bilans réguliers, rencontres avec les partenaires', eval: 'Clarté et réalisme du projet défini' },
        { obj: 'Accompagner les démarches d\'orientation', moyens: 'Soutien administratif, visites de structures', eval: 'Avancement des démarches engagées' }
      ]
    };
    const sections = {};
    DOMAINES.forEach(d => {
      const relevant = entries.filter(e =>
        (e.contenu || '').toLowerCase().includes(d.id.toLowerCase()) ||
        (e.categorie || '').toLowerCase().includes(d.id.toLowerCase()) ||
        (e.contenu || '').toLowerCase().includes(d.label.toLowerCase().slice(0, 5))
      );
      const bilan = relevant.length > 0
        ? relevant.slice(0, 3).map(e => `Observation du ${e.date || '?'} : ${(e.contenu || '').slice(0, 200)}`).join(' ')
        : `Aucune observation dans ce domaine.`;
      const templates = objTemplates[d.id] || [];
      const numObj = relevant.length > 0 ? Math.min(2, templates.length) : 1;
      const shuffled = [...templates].sort(() => Math.random() - 0.5).slice(0, numObj);
      const objectifs = shuffled.map(t => ({
        objectif: t.obj,
        moyens: t.moyens,
        echeance: futureDate(3, 6),
        evaluation: t.eval
      }));
      const exprPhrases = [
        '"Je souhaite progresser dans ce domaine."',
        '"Je me sens en capacité d\'évoluer sur ce point."',
        '"J\'ai besoin d\'être accompagné(e) pour cela."',
        '"C\'est un domaine où je veux gagner en autonomie."',
        '"Je suis satisfait(e) des progrès réalisés."',
        '"Je souhaite que l\'on travaille davantage ce sujet."'
      ];
      sections[d.id] = {
        bilan,
        objectifs,
        expression: relevant.length > 0
          ? exprPhrases[Math.floor(Math.random() * exprPhrases.length)]
          : 'Le résident n\'a pas encore exprimé d\'avis spécifique sur ce domaine.'
      };
    });
    result = { sections, conclusion: 'Avenant généré automatiquement à partir des observations du journal de bord.' };
  }
  return result;
}

function futureDate(minMonths, maxMonths) {
  const d = new Date();
  d.setMonth(d.getMonth() + minMonths + Math.floor(Math.random() * (maxMonths - minMonths)));
  return d.toISOString().slice(0, 7);
}

function ensureSectionsComplete(sections) {
  DOMAINES.forEach(d => {
    const sec = sections[d.id];
    if (!sec) sections[d.id] = { bilan: '', objectifs: [{ objectif: '', moyens: '', echeance: '', evaluation: '' }], expression: '' };
    else {
      if (!sec.objectifs) sec.objectifs = [];
      if (sec.objectifs.length === 0) sec.objectifs.push({ objectif: '', moyens: '', echeance: '', evaluation: '' });
      if (sec.bilan === undefined) sec.bilan = '';
      if (sec.expression === undefined) sec.expression = '';
      sec.objectifs.forEach(o => {
        if (o.objectif === undefined) o.objectif = '';
        if (o.moyens === undefined) o.moyens = '';
        if (o.echeance === undefined) o.echeance = '';
        if (o.evaluation === undefined) o.evaluation = '';
      });
    }
  });
}

function regenerateAvenantFromJournal(id) {
  // Écrase bilans, objectifs et conclusion sans retour arrière possible :
  // jamais sans confirmation, a fortiori si des signatures ont été recueillies.
  const p = getPpe().find(x => x.id === id);
  const nbSig = p ? Object.keys(sigPads(p)).length : 0;
  confirmDialog(
    `Remplacer le contenu de l'avenant par une génération depuis le journal ? Les bilans et objectifs actuels seront écrasés.${nbSig ? ` Les ${nbSig} signature${nbSig > 1 ? 's' : ''} déjà recueillie${nbSig > 1 ? 's' : ''} deviendron${nbSig > 1 ? 't' : 'a'} caduque${nbSig > 1 ? 's' : ''}.` : ''}`,
    () => genererAvenantFromJournal(id)
  );
}

// ═══════════════════════════════════════════
//  SERAFIN-PH — CIRCUIT AUTOMATIQUE
//  (remplace l'ancien panneau manuel « Synchronisation SERAFIN-PH » : grille + boutons)
//  Pastilles validées sur les objectifs → prestations de l'avenant → fiche résident.
// ═══════════════════════════════════════════

// Dérive p.serafin.prestations des codes prestation validés sur les objectifs
// (miroir exact ; les niveaux déjà définis sont conservés, 2 = Modéré par défaut).
function serafinDeriveAvenant(p) {
  if (typeof spComptesAvenant !== 'function') return;
  const codes = Object.keys(spComptesAvenant(p)).filter(c => !spEstBesoin(c));
  const prev = (p.serafin && p.serafin.prestations) || {};
  const prestations = {};
  codes.forEach(c => { prestations[c] = { active: true, niveau: (prev[c] && prev[c].niveau) || 2 }; });
  p.serafin = { ...(p.serafin || {}), prestations };
}

// Répercute silencieusement le profil dérivé sur la fiche SERAFIN-PH du résident.
// Ne vide JAMAIS un profil existant (si plus aucun code : la fiche résident est laissée telle quelle).
async function serafinSyncResident(p) {
  const spData = (p.serafin && p.serafin.prestations) || {};
  const selected = Object.entries(spData).filter(([, v]) => v.active).map(([k]) => k);
  if (!selected.length) return;
  const r = residentsList().find(x => String(x.id) === String(p.residentId));
  if (!r) return;
  const prestations = {};
  selected.forEach(code => { prestations[code] = { niveau: spData[code].niveau || 2 }; });
  const serafinph = { ...(r.serafinph || {}), selected, prestations, dateEvaluation: new Date().toISOString().slice(0, 10) };
  try { await persistResident({ ...r, serafinph }); }
  catch (e) { console.warn('[serafin] synchronisation fiche résident impossible', e); }
}

// ═══════════════════════════════════════════
//  OUTCOMES — « Où en suis-je de mon objectif ? »
//  Auto-évaluation du RÉSIDENT ⇄ évaluation de l'ÉQUIPE, en début et fin de cycle.
//  Échelle qualitative en 5 niveaux (distance à l'objectif), stockée sur chaque
//  objectif de l'avenant (o.outcomes — jsonb existant, aucune migration).
// ═══════════════════════════════════════════

const OC_NIVEAUX = [
  { v: 1, label: 'Très loin',   c: '#dc2626' },
  { v: 2, label: 'Loin',        c: '#ea580c' },
  { v: 3, label: 'À mi-chemin', c: '#d97706' },
  { v: 4, label: 'Proche',      c: '#65a30d' },
  { v: 5, label: 'Atteint',     c: '#16a34a' }
];
const OC_MOMENTS = [{ id: 'debut', label: 'Début de cycle' }, { id: 'fin', label: 'Fin de cycle / bilan' }];
const OC_RATERS  = [{ id: 'auto', icon: '🧑', label: 'Selon la personne' }, { id: 'pro', icon: '👥', label: "Selon l'équipe" }];
const _ocOpen = new Set();   // panneaux dépliés — survit aux re-renders

function _ocKey(ppeId, domId, oi) { return ppeId + '|' + domId + '|' + oi; }
function _ocGet(o, moment, rater) { return (o.outcomes && o.outcomes[moment] && o.outcomes[moment][rater]) || null; }
function _ocNiv(v) { return OC_NIVEAUX.find(n => n.v === Number(v)) || null; }

// Pastille résumé « 2 → 4 (+2) » pour un évaluateur donné
function _ocChip(icon, title, deb, fin) {
  // Seules les valeurs présentes dans OC_NIVEAUX sont rendues (jsonb forgé → point neutre)
  const nDeb = deb && _ocNiv(deb.v), nFin = fin && _ocNiv(fin.v);
  if (!nDeb && !nFin) return '';
  const f = n => n ? `<b style="color:${n.c}">${n.v}</b>` : '<span style="color:#cbd5e1">·</span>';
  const delta = (nDeb && nFin) ? nFin.v - nDeb.v : null;
  const dTxt = delta === null ? '' : ` <span style="font-weight:700;color:${delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#94a3b8'}">(${delta > 0 ? '+' : ''}${delta})</span>`;
  return `<span title="${title} — début → fin" style="display:inline-flex;align-items:center;gap:.25rem;font-size:.66rem;padding:.14rem .45rem;border-radius:999px;background:#f8fafc;border:0.5px solid #e2e8f0">${icon} ${f(nDeb)} → ${f(nFin)}${dTxt}</span>`;
}

function objOutcomesHtml(ppeId, domId, oi, o) {
  if (!(o.objectif || '').trim()) return '';
  const key = _ocKey(ppeId, domId, oi);
  const open = _ocOpen.has(key);
  const chips = OC_RATERS.map(r => _ocChip(r.icon, r.label, _ocGet(o, 'debut', r.id), _ocGet(o, 'fin', r.id))).join('');
  let panel = '';
  if (open) {
    panel = `<div style="margin-top:.4rem;padding:.6rem .7rem;background:#f0f9ff;border:1px solid #e0f2fe;border-radius:8px">
      <div style="font-size:.66rem;color:#0369a1;margin-bottom:.5rem">Où en est-on de cet objectif ? Positionnement partagé avec la personne — l'écart entre les deux regards nourrit le dialogue.</div>
      <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:.35rem .6rem;align-items:center">
        <span></span>
        ${OC_MOMENTS.map(m => `<span style="font-size:.64rem;font-weight:700;color:#475569;text-align:center">${m.label}</span>`).join('')}
        ${OC_RATERS.map(r => `
          <span style="font-size:.68rem;font-weight:600;color:#334155;white-space:nowrap">${r.icon} ${r.label}</span>
          ${OC_MOMENTS.map(m => {
            const cur = _ocGet(o, m.id, r.id);
            return `<div style="display:flex;gap:.2rem;justify-content:center">${OC_NIVEAUX.map(n => {
              const on = cur && cur.v === n.v;
              return `<button type="button" title="${n.label}" aria-label="${r.label} — ${m.label} : ${n.label}" aria-pressed="${on}"
                onclick="ocSet('${ppeId}','${domId}',${oi},'${m.id}','${r.id}',${n.v})"
                style="width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:.66rem;font-weight:800;line-height:1;border:1.5px solid ${n.c};${on ? `background:${n.c};color:#fff` : `background:#fff;color:${n.c}`}">${n.v}</button>`;
            }).join('')}</div>`;
          }).join('')}`).join('')}
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.45rem;font-size:.6rem;color:#64748b;flex-wrap:wrap">${OC_NIVEAUX.map(n => `<span><b style="color:${n.c}">${n.v}</b> ${n.label}</span>`).join('')}</div>
    </div>`;
  }
  return `<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin:.15rem 0 .45rem;padding-left:.1rem">
    <button type="button" class="btn btn-ghost btn-sm" style="font-size:.62rem;padding:1px 7px;color:#0369a1" onclick="ocToggle('${ppeId}','${domId}',${oi})">${open ? '▾' : '▸'} 🎯 Distance à l'objectif</button>
    ${chips}
  </div>${panel}`;
}

function ocToggle(ppeId, domId, oi) {
  const key = _ocKey(ppeId, domId, oi);
  if (_ocOpen.has(key)) _ocOpen.delete(key); else _ocOpen.add(key);
  const p = getPpe().find(x => x.id === ppeId);
  if (!p) return;
  renderAvenantFull(p);
  const bodyEl = document.getElementById('sectionBody_' + ppeId + '_' + domId);
  if (bodyEl) bodyEl.style.display = '';
}

// Pose / retire un positionnement (re-cliquer le même niveau le retire)
function ocSet(ppeId, domId, oi, moment, rater, v) {
  const p = getPpe().find(x => x.id === ppeId);
  if (!p || !p.sections[domId] || !p.sections[domId].objectifs[oi]) return;
  const o = p.sections[domId].objectifs[oi];
  if (!o.outcomes) o.outcomes = {};
  if (!o.outcomes[moment]) o.outcomes[moment] = {};
  const cur = o.outcomes[moment][rater];
  if (cur && cur.v === v) delete o.outcomes[moment][rater];
  else o.outcomes[moment][rater] = { v, d: today() };
  persistPpe(p);
  renderAvenantFull(p);
  const bodyEl = document.getElementById('sectionBody_' + ppeId + '_' + domId);
  if (bodyEl) bodyEl.style.display = '';
}

// Récapitulatif des positionnements pour le bilan intermédiaire (lecture seule)
function pcOutcomesRecapHtml(p) {
  const rows = [];
  (typeof DOMAINES !== 'undefined' ? DOMAINES : []).forEach(d => {
    const s = (p.sections || {})[d.id];
    (s && s.objectifs || []).forEach(o => {
      if (!(o.objectif || '').trim() || !o.outcomes) return;
      const chips = OC_RATERS.map(r => _ocChip(r.icon, r.label, _ocGet(o, 'debut', r.id), _ocGet(o, 'fin', r.id))).join(' ');
      if (chips.trim()) rows.push(`<div style="display:flex;align-items:center;gap:.5rem;padding:.25rem 0;border-bottom:1px dashed #ede9fe">
        <span style="flex-shrink:0">${d.icon}</span>
        <span style="flex:1;font-size:.72rem;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(o.objectif)}</span>
        <span style="display:inline-flex;gap:.3rem;flex-shrink:0">${chips}</span>
      </div>`);
    });
  });
  if (!rows.length) return '';
  return `<div style="margin-bottom:.6rem"><div style="font-size:.68rem;font-weight:600;color:var(--muted);margin-bottom:.25rem">🎯 Distance aux objectifs (personne / équipe, début → fin)</div>${rows.join('')}</div>`;
}

// ═══════════════════════════════════════════
//  CYCLE DU PPA — parcours guidé
//  Recueil des attentes → Co-construction → Rédaction & signatures →
//  Bilan intermédiaire (6 mois) → Réévaluation annuelle (HAS 1.10.6).
//  Données rangées dans sections._cycle (jsonb existant : aucune migration) ;
//  toutes les lectures de sections passent par (s.objectifs || []) → clé inoffensive.
// ═══════════════════════════════════════════

function ppeCycle(p) {
  if (!p.sections) p.sections = {};
  if (!p.sections._cycle) p.sections._cycle = {};
  return p.sections._cycle;
}
function _pcAddMonths(dateStr, n) {
  // Midi local : évite le décalage d'un jour au passage par toISOString (UTC).
  // Le jour est borné au dernier jour du mois cible (31 août + 6 mois → 28/29 février).
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
function _pcUser() {
  const s = Auth.getSession();
  return s ? ([s.prenom, s.nom].filter(Boolean).join(' ') || s.username || '') : '';
}
function _pcFmt(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : ''; }

// Les 5 étapes, avec leur état calculé (fait / en retard / à venir)
function ppeCycleSteps(p) {
  const c = ppeCycle(p);
  const base = (p.signatures && p.signatures.date) || p.dateRedaction || '';
  const cible6  = base ? _pcAddMonths(base, 6) : '';
  const cible12 = p.dateRevision || (base ? _pcAddMonths(base, 12) : '');
  const td = today();
  const late = (done, cible) => !done && p.statut === 'actif' && cible && cible < td;
  return [
    { id: 'attentes',       n: 1, label: 'Recueil des attentes',          done: !!(c.attentes && c.attentes.date),             date: c.attentes && c.attentes.date,       par: c.attentes && c.attentes.par,             manual: true },
    { id: 'coconstruction', n: 2, label: 'Co-construction',               done: !!(c.coconstruction && c.coconstruction.date), date: c.coconstruction && c.coconstruction.date, par: c.coconstruction && c.coconstruction.par, manual: true },
    { id: 'signatures',     n: 3, label: 'Rédaction & signatures',        done: p.statut !== 'brouillon' && !!(p.signatures && p.signatures.date), date: p.signatures && p.signatures.date },
    { id: 'bilan6',         n: 4, label: 'Bilan intermédiaire (6 mois)',  done: !!(c.bilan6 && c.bilan6.date), date: c.bilan6 && c.bilan6.date, cible: cible6,  late: late(!!(c.bilan6 && c.bilan6.date), cible6) },
    { id: 'reeval',         n: 5, label: 'Réévaluation annuelle',         done: !!(c.reeval && c.reeval.date), date: c.reeval && c.reeval.date, cible: cible12, late: late(!!(c.reeval && c.reeval.date), cible12) }
  ];
}

// Carte « Cycle du PPA » affichée en tête de l'avenant
function renderCycleCard(p) {
  const steps = ppeCycleSteps(p);
  const c = ppeCycle(p);
  const current = steps.find(s => !s.done);
  const stepHtml = steps.map((s, i) => {
    const col = s.done ? '#16a34a' : s.late ? '#dc2626' : (current && current.id === s.id) ? '#4f46e5' : '#94a3b8';
    const bg  = s.done ? '#f0fdf4' : s.late ? '#fef2f2' : (current && current.id === s.id) ? '#eef2ff' : '#f8fafc';
    const pastille = s.done ? '✓' : s.late ? '!' : s.n;
    let sub = '';
    if (s.done) sub = 'Fait le ' + _pcFmt(s.date) + (s.par ? ' · ' + escHtml(s.par) : '');
    else if (s.late) sub = 'En retard — prévu le ' + _pcFmt(s.cible);
    else if (s.cible) sub = 'Prévu le ' + _pcFmt(s.cible);
    else if (s.id === 'signatures') sub = p.statut === 'brouillon' ? 'Avenant à activer + date de signature' : 'Date de signature à renseigner';
    else sub = 'À faire';
    let action = '';
    if (s.manual) {
      action = s.done
        ? `<button class="btn btn-ghost btn-sm" style="font-size:.62rem;padding:1px 6px;color:#94a3b8" onclick="pcUnmark('${p.id}','${s.id}')" title="Annuler">✕</button>`
        : `<button class="btn btn-outline btn-sm" style="font-size:.64rem;padding:2px 8px" onclick="pcMark('${p.id}','${s.id}')">Marquer fait</button>`;
    } else if (s.id === 'bilan6') {
      action = `<button class="btn btn-outline btn-sm" style="font-size:.64rem;padding:2px 8px" onclick="pcToggleBilanForm()">${s.done ? 'Voir / modifier' : '📝 Réaliser le bilan'}</button>`;
    } else if (s.id === 'reeval') {
      action = s.done
        ? `<button class="btn btn-ghost btn-sm" style="font-size:.62rem;padding:1px 6px;color:#94a3b8" onclick="pcUnmark('${p.id}','reeval')" title="Annuler">✕</button>`
        : `<button class="btn btn-outline btn-sm" style="font-size:.64rem;padding:2px 8px" onclick="pcMark('${p.id}','reeval')">Marquer réalisée</button>`;
    }
    return `<div style="flex:1;min-width:128px;display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.6rem .4rem;border-radius:10px;background:${bg};border:1px solid ${col}33;text-align:center">
      <div style="width:26px;height:26px;border-radius:50%;background:${col};color:#fff;font-size:.78rem;font-weight:800;display:flex;align-items:center;justify-content:center">${pastille}</div>
      <div style="font-size:.7rem;font-weight:700;color:#0f2b4a;line-height:1.25">${s.label}</div>
      <div style="font-size:.62rem;color:${s.late ? '#dc2626' : 'var(--muted)'};line-height:1.3">${sub}</div>
      ${action}
    </div>`;
  }).join('<div style="align-self:center;color:#cbd5e1;font-size:.8rem;flex-shrink:0">›</div>');

  const b = c.bilan6 || {};
  const bilanDone = !!b.date;
  return `<div class="section-card">
    <div class="section-header" style="cursor:default;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
      <span class="sec-ic">🧭</span><strong>Cycle du PPA</strong>
      <span style="font-size:.62rem;color:var(--muted)">réévaluation annuelle tracée (HAS 1.10.6) · échéances créées automatiquement</span>
    </div>
    <div class="section-body">
      <div style="display:flex;gap:.35rem;flex-wrap:wrap;align-items:stretch">${stepHtml}</div>
      <div id="pcBilanForm" style="display:none;margin-top:.85rem;padding:.85rem;border:1px solid #ede9fe;border-radius:10px;background:#faf5ff">
        <div style="font-size:.78rem;font-weight:700;color:#0f2b4a;margin-bottom:.6rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">📝 Bilan intermédiaire à 6 mois ${bilanDone ? '— réalisé le ' + _pcFmt(b.date) : ''} ${bilanDone && b._ia && typeof iaBadge === 'function' ? iaBadge(b) : ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.5rem">
          <div><label style="font-size:.68rem;font-weight:600;color:var(--muted)">Date du bilan</label><input type="date" class="input" id="pcBilanDate" value="${escHtml(b.date || today())}"/></div>
          <div><label style="font-size:.68rem;font-weight:600;color:var(--muted)">Participants</label><input class="input" id="pcBilanParticipants" value="${escHtml(b.participants || '')}" placeholder="Résident, référent, chef de service…"/></div>
        </div>
        ${pcOutcomesRecapHtml(p)}
        <div style="margin-bottom:.5rem"><label style="font-size:.68rem;font-weight:600;color:var(--muted)">Synthèse — où en est-on des objectifs ?</label><textarea class="input" id="pcBilanSynthese" style="min-height:70px">${escHtml(b.synthese || '')}</textarea></div>
        <div style="margin-bottom:.6rem"><label style="font-size:.68rem;font-weight:600;color:var(--muted)">Ajustements décidés (objectifs modifiés, moyens, échéances…)</label><textarea class="input" id="pcBilanAjust" style="min-height:56px">${escHtml(b.ajustements || '')}</textarea></div>
        <div id="pcBilanIaStatus" style="font-size:.7rem;color:#7e22ce;min-height:1rem;margin-bottom:.35rem"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="pcToggleBilanForm()">Fermer</button>
          ${typeof iaPreremplirBilan === 'function' ? `<button class="btn btn-sm" id="pcBilanIa" style="background:#faf5ff;border:1px solid #e9d5ff;color:#7e22ce" onclick="iaPreremplirBilan('${p.id}')" title="Proposition générée par IA à relire et valider">✨ Pré-remplir (IA)</button>` : ''}
          <button class="btn btn-accent btn-sm" onclick="pcSaveBilan('${p.id}')">💾 Enregistrer le bilan</button>
        </div>
      </div>
    </div>
  </div>`;
}

function pcMark(ppeId, stepId) {
  const p = getPpe().find(x => x.id === ppeId);
  if (!p) return;
  if (stepId === 'reeval' && !confirm('Marquer la réévaluation annuelle comme réalisée ?')) return;
  ppeCycle(p)[stepId] = { date: today(), par: _pcUser() };
  persistPpe(p);
  ppeSyncEcheances(p);
  renderAvenantFull(p);
}
function pcUnmark(ppeId, stepId) {
  if (!confirm('Annuler cette étape ?')) return;
  const p = getPpe().find(x => x.id === ppeId);
  if (!p) return;
  delete ppeCycle(p)[stepId];
  persistPpe(p);
  ppeSyncEcheances(p);
  renderAvenantFull(p);
}
function pcToggleBilanForm() {
  const el = document.getElementById('pcBilanForm');
  if (!el) return;
  const ouvrir = el.style.display === 'none';
  el.style.display = ouvrir ? '' : 'none';
  // À la fermeture du formulaire, on oublie une proposition IA non enregistrée.
  if (!ouvrir && typeof iaOublierBilanPending === 'function') iaOublierBilanPending();
}
function pcSaveBilan(ppeId) {
  const p = getPpe().find(x => x.id === ppeId);
  if (!p) return;
  const date = document.getElementById('pcBilanDate').value;
  if (!date) { toast('La date du bilan est obligatoire', 'error'); return; }
  ppeCycle(p).bilan6 = {
    date,
    par: _pcUser(),
    participants: document.getElementById('pcBilanParticipants').value.trim(),
    synthese: document.getElementById('pcBilanSynthese').value.trim(),
    ajustements: document.getElementById('pcBilanAjust').value.trim()
  };
  // Traçabilité IA : si une proposition de l'assistant a servi de base, on
  // marque le bilan (qui a demandé, qui a relu, texte modifié ou non).
  if (typeof iaMarquageBilan === 'function') {
    const m = iaMarquageBilan(ppeId);
    if (m) ppeCycle(p).bilan6._ia = m;
  }
  persistPpe(p);
  ppeSyncEcheances(p);
  toast('Bilan intermédiaire enregistré', 'success');
  renderAvenantFull(p);
}

// Échéancier : crée/actualise les 2 échéances du cycle (dédup par sourceId, comme le CVS).
// Les appels sont SÉRIALISÉS (file de promesses) : deux clics rapprochés ne peuvent pas
// lire la liste en parallèle et créer des doublons.
let _pcSyncChain = Promise.resolve();
function ppeSyncEcheances(p) {
  _pcSyncChain = _pcSyncChain.then(() => _ppeSyncEcheancesNow(p)).catch(e => console.warn('[cycle PPA] sync', e));
  return _pcSyncChain;
}
async function _ppeSyncEcheancesNow(p) {
  if (typeof sbGetEcheances !== 'function' || typeof sbSaveEcheance !== 'function') return;
  if (p.statut === 'brouillon') return;
  try {
    const steps = ppeCycleSteps(p);
    const all = await sbGetEcheances();
    const jobs = [
      { sid: 'ppa6_'  + p.id, step: steps.find(s => s.id === 'bilan6'), lib: 'Bilan intermédiaire PPA — ' + (p.residentName || '') },
      { sid: 'ppa12_' + p.id, step: steps.find(s => s.id === 'reeval'), lib: 'Réévaluation annuelle PPA — ' + (p.residentName || '') }
    ];
    for (const j of jobs) {
      if (!j.step || !j.step.cible) continue;
      const existing = all.find(e => e.sourceId === j.sid);
      if (!existing) {
        await sbSaveEcheance({ type: 'ppe', libelle: j.lib, date: j.step.cible, residentId: p.residentId || '', residentName: p.residentName || '', notes: 'Créée automatiquement par le cycle du PPA', done: !!j.step.done, doneAt: j.step.done ? new Date().toISOString() : null, author: _pcUser(), sourceId: j.sid });
      } else if (!!existing.done !== !!j.step.done || existing.date !== j.step.cible) {
        await sbSaveEcheance({ ...existing, date: j.step.cible, done: !!j.step.done, doneAt: j.step.done ? (existing.doneAt || new Date().toISOString()) : null });
      }
    }
  } catch (e) { console.warn('[cycle PPA] échéances non synchronisées', e); }
}

function initPpePage() {
  initPpe();
  const session = Auth.getSession();
  if (session) localStorage.setItem('ftr_last_visit_ppe_' + session.userId, Date.now());
  document.getElementById('modalAvenant')?.addEventListener('open', resetAvenantModal);
  ['searchAvenant','filterResidentAvenant','filterStatutAvenant'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderAvenant);
  });
  const params = new URLSearchParams(window.location.search);
  const avenantId = params.get('id');
  if (avenantId) {
    const ppe = getPpe();
    const target = ppe.find(p => p.id === avenantId);
    if (target) {
      const resFilter = document.getElementById('filterResidentAvenant');
      if (resFilter) resFilter.value = target.residentId || '';
      renderAvenant();
      setTimeout(() => openAvenant(avenantId), 300);
    }
  }
}
document.addEventListener('DOMContentLoaded', initPpePage);
if (typeof registerPageInit === 'function') registerPageInit('ppe', initPpePage);
