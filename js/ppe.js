const PPE_KEY = DB.keys.ppe;
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

function getPpe() { return DB.get(DB.keys.ppe) || []; }
function savePpe(list) { DB.set(DB.keys.ppe, list); }

function emptySection() {
  return { bilan:'', objectifs:[{ objectif:'', moyens:'', echeance:'', evaluation:'' }], expression:'' };
}

function initPpe() {
  const session = Auth.requireAuth();
  if (!session) return;
  if (!requireModule('access_ppe')) return;
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
  const residents = DB.get(DB.keys.residents) || [];
  const opts = r => r.map(x => `<option value="${x.id}">${escHtml(x.prenom||'')} ${escHtml(x.nom||'')}</option>`).join('');
  ['fAvResident','filterResidentAvenant'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const all = id === 'filterResidentAvenant' ? '<option value="">Tous les résidents</option>' : '<option value="">— Choisir —</option>';
      el.innerHTML = all + opts(residents);
    }
  });
}

function saveAvenant() {
  const editId = document.getElementById('avenantEditId').value;
  const residentId = document.getElementById('fAvResident').value;
  if (!residentId) { toast('Veuillez choisir un résident', 'error'); return; }
  const residents = DB.get(DB.keys.residents) || [];
  const r = residents.find(x => x.id === residentId);
  const list = getPpe();
  const now = new Date().toISOString();
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

  if (editId) {
    const idx = list.findIndex(p => p.id === editId);
    if (idx >= 0) { Object.assign(list[idx], data); }
    savePpe(list);
    closeModal('modalAvenant');
    toast('Avenant mis à jour');
  } else {
    const sections = {};
    DOMAINES.forEach(d => { sections[d.id] = emptySection(); });
    const avenant = {
      id: genId(), ...data,
      statut: 'brouillon',
      sections,
      conclusion: '',
      signatures: { resident:null, referent:null, direction:null, date:null },
      createdBy: (() => { const s = Auth.getSession(); return s ? `${s.prenom||''} ${s.nom||''}`.trim() || s.username : '?'; })(),
      createdAt: now
    };
    list.unshift(avenant);
    savePpe(list);
    closeModal('modalAvenant');
    toast('Avenant créé');
  }
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
    <div class="section-card">
      <div class="section-header" style="cursor:default"><strong>Informations générales</strong></div>
      <div class="section-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem">
          <div><strong>Résident :</strong> ${escHtml(p.residentName)}</div>
          <div><strong>Date de rédaction :</strong> ${p.dateRedaction||'—'}</div>
          <div><strong>Prochaine révision :</strong> ${p.dateRevision||'—'}</div>
          <div><strong>Référent éducatif :</strong> ${escHtml(p.referent||'—')}</div>
          <div><strong>Mesure de protection :</strong> ${escHtml(p.protection||'—')}</div>
          <div><strong>Établissement employeur :</strong> ${escHtml(p.employeur||'—')}</div>
          <div><strong>Atelier :</strong> ${escHtml(p.atelier||'—')}</div>
          <div><strong>Date d\'entrée ESAT :</strong> ${p.entreeEsat||'—'}</div>
        </div>
        <span class="badge-ppe ${p.statut}">${STATUT_PPE_LABEL[p.statut]||p.statut}</span>
      </div>
    </div>
    ${DOMAINES.map(d => renderSectionCard(p, d)).join('')}
    <div class="section-card">
      <div class="section-header" style="cursor:default"><strong>Conclusion</strong></div>
      <div class="section-body">
        <textarea class="input" style="min-height:80px;width:100%" onchange="updateConclusion('${p.id}',this.value)">${escHtml(p.conclusion||'')}</textarea>
      </div>
    </div>
    <div class="section-card">
      <div class="section-header" style="cursor:default"><strong>Signatures</strong></div>
      <div class="section-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;font-size:.85rem;text-align:center">
          <div><strong>Le résident</strong><div style="margin-top:.5rem"><input class="input" style="text-align:center;font-size:.8rem" value="${escHtml(p.signatures.resident||'')}" onchange="updateSignature('${p.id}','resident',this.value)" placeholder="Nom/prénom"/></div></div>
          <div><strong>L'éducateur référent</strong><div style="margin-top:.5rem"><input class="input" style="text-align:center;font-size:.8rem" value="${escHtml(p.signatures.referent||'')}" onchange="updateSignature('${p.id}','referent',this.value)" placeholder="Nom/prénom"/></div></div>
          <div><strong>La direction</strong><div style="margin-top:.5rem"><input class="input" style="text-align:center;font-size:.8rem" value="${escHtml(p.signatures.direction||'')}" onchange="updateSignature('${p.id}','direction',this.value)" placeholder="Nom/prénom"/></div></div>
        </div>
        <div style="margin-top:1rem;font-size:.85rem"><strong>Date de signature :</strong> <input type="date" class="input" style="width:auto;font-size:.8rem" value="${p.signatures.date||''}" onchange="updateSignature('${p.id}','date',this.value)"/></div>
      </div>
    </div>
  </div>`;
  document.querySelector('.content').appendChild(div);
}

function renderSectionCard(p, domaine) {
  const s = p.sections[domaine.id] || emptySection();
  return `<div class="section-card">
    <div class="section-header" onclick="toggleSection('${p.id}','${domaine.id}')">
      <span>${domaine.icon}</span>
      <span>${domaine.label}</span>
      <span style="margin-left:auto;font-size:.7rem;color:var(--muted)">${s.objectifs.length} obj.</span>
    </div>
    <div class="section-body" id="sectionBody_${p.id}_${domaine.id}">
      <div style="display:flex;gap:.5rem;align-items:flex-start">
        <div style="flex:1">
          <label style="font-size:.7rem;color:var(--muted);font-weight:600">Bilan</label>
          <div style="display:flex;gap:.3rem;margin-bottom:.25rem">
            <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:1px 6px" onclick="aiAssist('${p.id}','${domaine.id}','bilan','redaction')" title="Rédiger un bilan">✍ Rédiger</button>
            <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:1px 6px" onclick="aiAssist('${p.id}','${domaine.id}','bilan','correction')" title="Corriger le texte">✓ Corriger</button>
            <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:1px 6px" onclick="aiAssist('${p.id}','${domaine.id}','bilan','reformulation')" title="Reformulation institutionnelle">🏛 Reformuler</button>
          </div>
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
        <div style="display:flex;gap:.3rem;margin-bottom:.25rem">
          <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:1px 6px" onclick="aiAssist('${p.id}','${domaine.id}','expression','redaction')" title="Rédiger">✍ Rédiger</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:1px 6px" onclick="aiAssist('${p.id}','${domaine.id}','expression','correction')" title="Corriger">✓ Corriger</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:1px 6px" onclick="aiAssist('${p.id}','${domaine.id}','expression','reformulation')" title="Reformulation">🏛 Reformuler</button>
        </div>
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
  savePpe(list);
}

async function aiAssist(ppeId, domId, field, action) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  if (!p.sections[domId]) p.sections[domId] = emptySection();
  const domaine = DOMAINES.find(d => d.id === domId);
  const label = domaine ? domaine.label : domId;
  const current = p.sections[domId][field] || '';
  const hasKey = !!getAiKey();
  const labels = { redaction: 'Rédaction', correction: 'Correction', reformulation: 'Reformulation' };

  if (hasKey) {
    const customSystem = getAiPrompt('ppe', action);
    let system = '';
    let prompt = '';
    if (action === 'redaction') {
      system = customSystem || 'Tu es un rédacteur de bilans socio-éducatifs pour ESMS. Rédige en français un texte professionnel et institutionnel.';
      prompt = `Rédige un bilan concis pour le domaine "${label}" d'un résident en établissement médico-social.${current ? '\n\nTexte existant à compléter :\n' + current : ''}`;
    } else if (action === 'correction') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Tu es un correcteur professionnel. Corrige les fautes d\'orthographe, de grammaire et de syntaxe sans changer le style.';
      prompt = 'Corrige ce texte :\n\n' + current;
    } else if (action === 'reformulation') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Tu es un rédacteur institutionnel. Reformule ce texte en langage professionnel et institutionnel.';
      prompt = 'Reformule ce texte de manière institutionnelle :\n\n' + current;
    }
    const result = await callMistral(prompt, system);
    if (result) {
      p.sections[domId][field] = result;
      savePpe(list);
      renderAvenantFull(p);
      const bodyEl = document.getElementById('sectionBody_' + ppeId + '_' + domId);
      if (bodyEl) bodyEl.style.display = '';
      toast('✓ ' + labels[action] + ' (Mistral AI)', 'success');
      return;
    }
    toast('API Mistral indisponible, mode local', 'warning');
  }

  // Fallback local
  let result = '';
  if (action === 'redaction') {
    const templates = {
      bilan: [
        `Concernant le domaine "${label}", la situation évolue de manière positive.`,
        `Dans le cadre du suivi personnalisé, il convient de noter que ce domaine nécessite une attention particulière.`,
        `L'évaluation dans le domaine "${label}" fait apparaître des progrès significatifs.`
      ],
      expression: [
        `Le résident exprime une satisfaction quant aux accompagnements proposés.`,
        `Il/elle souhaite être davantage impliqué(e) dans les décisions le/la concernant.`,
        `Il/elle fait part de son désir de gagner en autonomie dans ce domaine.`
      ]
    };
    const pool = templates[field] || templates.bilan;
    result = current ? current + '\n\n' + pool[Math.floor(Math.random() * pool.length)] : pool[Math.floor(Math.random() * pool.length)];
  } else if (action === 'correction') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current
      .replace(/\bils on\b/g, 'ils ont')
      .replace(/\belle on\b/g, 'elle a')
      .replace(/\bje suis allé\b/g, 'je me suis rendu')
      .replace(/\bil a étais\b/g, 'il a été')
      .replace(/\bcomme même\b/g, 'quand même')
      .replace(/\bau jour d'aujourd'hui\b/g, 'actuellement')
      .replace(/\bpar contre\b/g, 'en revanche')
      .replace(/\bpeut être\b/g, 'peut-être')
      .replace(/\bentraine\b/g, 'entraîne')
      .replace(/\bgràce\b/g, 'grâce');
  } else if (action === 'reformulation') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current
      .replace(/\bgère\b/g, 'assure la gestion de')
      .replace(/\ba besoin de\b/g, 'nécessite')
      .replace(/\bveut\b/g, 'souhaite')
      .replace(/\bpeut\b/g, 'est en mesure de')
      .replace(/\bfait\b/g, 'réalise')
      .replace(/\bva\b/g, 'envisage de')
      .replace(/\bdoit\b/g, 'se doit de');
  }

  if (result) {
    p.sections[domId][field] = result;
    savePpe(list);
    renderAvenantFull(p);
    const bodyEl = document.getElementById('sectionBody_' + ppeId + '_' + domId);
    if (bodyEl) bodyEl.style.display = '';
    toast('✓ ' + labels[action] + ' (mode local)', 'success');
  }
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
  </div>`;
}

function addSectionObj(ppeId, domId) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  if (!p.sections[domId]) p.sections[domId] = emptySection();
  if (!p.sections[domId].objectifs) p.sections[domId].objectifs = [];
  p.sections[domId].objectifs.push({ objectif:'', moyens:'', echeance:'', evaluation:'' });
  savePpe(list);
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
  savePpe(list);
}

function removeSectionObj(ppeId, domId, idx) {
  if (!confirm('Supprimer cette ligne ?')) return;
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p || !p.sections[domId]) return;
  p.sections[domId].objectifs.splice(idx, 1);
  savePpe(list);
  renderAvenantFull(p);
}

function updateConclusion(ppeId, value) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  p.conclusion = value;
  savePpe(list);
}

function updateSignature(ppeId, field, value) {
  const list = getPpe();
  const p = list.find(x => x.id === ppeId);
  if (!p) return;
  if (!p.signatures) p.signatures = { resident:'', referent:'', direction:'', date:'' };
  p.signatures[field] = value;
  savePpe(list);
}

function printAvenant(id) {
  const list = getPpe();
  const p = list.find(x => x.id === id);
  if (!p) return;
  const w = window.open('', '_blank');
  const settings = DB.get(DB.keys.settings) || {};
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Avenant - ${escHtml(p.residentName)}</title>
<style>
  @page { margin:1.8cm 1.5cm; }
  body { font-family:'Inter','Segoe UI',system-ui,sans-serif; font-size:9.5pt; line-height:1.7; color:#334155; max-width:780px; margin:0 auto; padding:0; }
  .page { padding:0 .3cm; }
  .top-stripe { height:6px; background:#0f2b4a; border-radius:0 0 4px 4px; margin-bottom:.6cm; }
  .doc-ref { text-align:right; font-size:7.5pt; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.2cm; }
  .header-block { margin-bottom:.6cm; }
  .header-block .etab { font-size:13pt; font-weight:300; color:#0f2b4a; letter-spacing:-.02em; }
  .header-block .etab strong { font-weight:700; }
  .header-block .doc-title { font-size:16pt; font-weight:800; color:#0f2b4a; margin-top:.05cm; letter-spacing:-.02em; }
  .header-block .doc-ref-line { font-size:7.5pt; color:#64748b; margin-top:.15cm; }
  .header-block .doc-ref-line span { display:inline-block; margin-right:.6cm; }
  .header-block .doc-ref-line .label { color:#94a3b8; }
  h2 { font-size:10.5pt; font-weight:600; color:#0f2b4a; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin-top:.55cm; margin-bottom:.25cm; text-transform:uppercase; letter-spacing:.04em; }
  h2 .sep { color:#e85d04; margin-right:.3em; }
  table { width:100%; border-collapse:collapse; font-size:8.5pt; margin:.2cm 0; }
  td, th { border:1px solid #e2e8f0; padding:5px 8px; vertical-align:top; }
  th { background:#f1f5f9; color:#0f2b4a; font-weight:600; text-align:left; font-size:7.5pt; text-transform:uppercase; letter-spacing:.04em; }
  tr:nth-child(even) td { background:#fafbfc; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:2px; margin:.2cm 0; }
  .info-grid .ig-item { display:flex; padding:4px 8px; font-size:8.5pt; }
  .info-grid .ig-item .ig-label { width:130px; font-weight:600; color:#0f2b4a; flex-shrink:0; }
  .info-grid .ig-item:nth-child(even) { background:#fafbfc; }
  .card-bilan { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:7px 10px; margin:.15cm 0; font-size:8.5pt; }
  .card-bilan strong { color:#0f2b4a; }
  .card-expression { background:#fff; border:1px solid #e2e8f0; border-left:3px solid #e85d04; border-radius:6px; padding:7px 10px; margin:.15cm 0; font-size:8.5pt; }
  .card-expression strong { color:#e85d04; }
  .card-conclusion { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin:.2cm 0; font-size:8.5pt; line-height:1.6; }
  .card-conclusion strong { color:#0f2b4a; }
  .no-obj { font-style:italic; color:#94a3b8; font-size:8.5pt; padding:3px 0; }
  .sig-section { margin-top:1.2cm; border-top:2px solid #e2e8f0; padding-top:.4cm; }
  .sig-row { display:flex; justify-content:space-between; gap:.6cm; }
  .sig-box { flex:1; text-align:center; }
  .sig-box .sig-role { font-size:7pt; font-weight:700; color:#0f2b4a; text-transform:uppercase; letter-spacing:.06em; }
  .sig-box .sig-line { border-top:1px solid #94a3b8; margin-top:.7cm; padding-top:3px; font-size:8pt; color:#475569; min-height:1.2cm; }
  .sig-date { text-align:center; margin-top:.5cm; font-size:8.5pt; color:#475569; }
  .sig-date strong { color:#0f2b4a; }
  .page-footer { margin-top:.8cm; padding-top:.3cm; border-top:1px solid #e2e8f0; text-align:center; font-size:7pt; color:#cbd5e1; }
</style></head><body>
<div class="page">
<div class="top-stripe"></div>
<div class="doc-ref">Document confidentiel — ${new Date().toLocaleDateString('fr-FR')}</div>

<div class="header-block">
  <div class="etab"><strong>${escHtml(settings.etablissement||'Foyer d\'Hébergement')}</strong></div>
  <div class="doc-title">Avenant — Projet Personnalisé</div>
  <div class="doc-ref-line">
    <span><span class="label">Rédaction :</span> ${p.dateRedaction||'___'}</span>
    <span><span class="label">Révision :</span> ${p.dateRevision||'___'}</span>
    <span><span class="label">Statut :</span> ${STATUT_PPE_LABEL[p.statut]||p.statut}</span>
  </div>
</div>

<h2><span class="sep">▸</span>Informations générales</h2>
<div class="info-grid">
  <div class="ig-item"><span class="ig-label">Résident</span><span>${escHtml(p.residentName)}</span></div>
  <div class="ig-item"><span class="ig-label">Référent éducatif</span><span>${escHtml(p.referent||'—')}</span></div>
  <div class="ig-item"><span class="ig-label">Mesure de protection</span><span>${escHtml(p.protection||'—')}</span></div>
  <div class="ig-item"><span class="ig-label">Établissement employeur</span><span>${escHtml(p.employeur||'—')}</span></div>
  <div class="ig-item"><span class="ig-label">Atelier</span><span>${escHtml(p.atelier||'—')}</span></div>
  <div class="ig-item"><span class="ig-label">Date d'entrée ESAT</span><span>${p.entreeEsat||'—'}</span></div>
</div>

${DOMAINES.map(d => {
  const s = p.sections[d.id] || emptySection();
  return `<h2><span class="sep">▸</span>${d.label}</h2>
    ${s.bilan ? `<div class="card-bilan"><strong>Bilan :</strong> ${escHtml(s.bilan)}</div>` : ''}
    ${s.objectifs.length ? `<table><thead><tr><th style="width:28%">Objectif</th><th style="width:32%">Moyens / Actions</th><th style="width:15%">Échéance</th><th style="width:25%">Évaluation</th></tr></thead>
    <tbody>${s.objectifs.map(o => `<tr><td>${escHtml(o.objectif||'')}</td><td>${escHtml(o.moyens||'')}</td><td>${o.echeance||''}</td><td>${escHtml(o.evaluation||'')}</td></tr>`).join('')}</tbody></table>` : '<div class="no-obj">Aucun objectif défini pour ce domaine.</div>'}
    ${s.expression ? `<div class="card-expression"><strong>Expression du résident :</strong> ${escHtml(s.expression)}</div>` : ''}`;
}).join('')}

<h2><span class="sep">▸</span>Conclusion</h2>
${p.conclusion ? `<div class="card-conclusion">${escHtml(p.conclusion)}</div>` : '<div class="no-obj">—</div>'}

<div class="sig-section">
<h2 style="margin-top:0"><span class="sep">▸</span>Signatures</h2>
<div class="sig-row">
  <div class="sig-box"><div class="sig-role">Le résident</div><div class="sig-line">${p.signatures.resident||''}</div></div>
  <div class="sig-box"><div class="sig-role">L'éducateur référent</div><div class="sig-line">${p.signatures.referent||''}</div></div>
  <div class="sig-box"><div class="sig-role">La direction</div><div class="sig-line">${p.signatures.direction||''}</div></div>
</div>
<div class="sig-date"><strong>Date de signature :</strong> ${p.signatures.date||'__________'}</div>
</div>

<div class="page-footer">Foyer Trois Rivières — Document généré le ${new Date().toLocaleDateString('fr-FR')}</div>
</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
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

  const residents = DB.get(DB.keys.residents) || [];
  container.innerHTML = `<div class="table-wrap"><table class="table" style="width:100%;border-collapse:separate;border-spacing:0 6px">
    <thead><tr>
      <th style="text-align:left;padding:.6rem .75rem;font-size:.78rem;font-weight:600;color:var(--muted);border-bottom:2px solid var(--border)">Résident</th>
      <th style="text-align:left;padding:.6rem .75rem;font-size:.78rem;font-weight:600;color:var(--muted);border-bottom:2px solid var(--border)">Date</th>
      <th style="text-align:left;padding:.6rem .75rem;font-size:.78rem;font-weight:600;color:var(--muted);border-bottom:2px solid var(--border)">Statut</th>
      <th style="text-align:left;padding:.6rem .75rem;font-size:.78rem;font-weight:600;color:var(--muted);border-bottom:2px solid var(--border)">Référent</th>
      <th style="text-align:left;padding:.6rem .75rem;font-size:.78rem;font-weight:600;color:var(--muted);border-bottom:2px solid var(--border)">Actions</th>
    </tr></thead>
    <tbody>${list.map((p, i) => {
    const r = residents.find(x => x.id === p.residentId);
    const totalObj = Object.values(p.sections||{}).reduce((a, s) => a + (s.objectifs?.length||0), 0);
    return `<tr style="cursor:pointer;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,.04);background:${i%2===0?'#fff':'#f8fafc'};transition:background .15s,box-shadow .15s" onmouseenter="this.style.background='#eef2ff';this.style.boxShadow='0 2px 8px rgba(0,0,0,.08)'" onmouseleave="this.style.background='${i%2===0?'#fff':'#f8fafc'}';this.style.boxShadow='0 2px 6px rgba(0,0,0,.04)'" onclick="openAvenant('${p.id}')">
      <td style="padding:.7rem .75rem;border-radius:12px 0 0 12px"><div style="display:flex;align-items:center;gap:.6rem"><span style="font-weight:600;font-size:.85rem">${escHtml(p.residentName)}</span></div></td>
      <td style="padding:.7rem .75rem;font-size:.82rem;color:var(--g700)">${formatDate(p.dateRedaction)}</td>
      <td style="padding:.7rem .75rem"><span class="badge-ppe ${p.statut}">${STATUT_PPE_LABEL[p.statut]||p.statut}</span></td>
      <td style="padding:.7rem .75rem;font-size:.82rem;color:var(--g700)">${p.referent ? escHtml(p.referent) : '—'}</td>
      <td style="padding:.7rem .75rem;border-radius:0 12px 12px 0"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openAvenant('${p.id}')">Voir</button></td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
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
  savePpe(list);
  toast(`Avenant ${p.statut === 'actif' ? 'activé' : 'terminé'}`);
  const full = document.getElementById('avenantFullView');
  if (full) renderAvenantFull(p);
  else renderAvenant();
}

function deleteAvenant(id) {
  if (!confirm('Supprimer cet avenant ?')) return;
  const list = getPpe();
  savePpe(list.filter(p => p.id !== id));
  toast('Avenant supprimé');
  const full = document.getElementById('avenantFullView');
  if (full) backToList();
  renderAvenant();
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
    const residents = DB.get(DB.keys.residents) || [];
    resident = residents.find(r => String(r.id) === String(residentId));
  } else {
    residentId = document.getElementById('fAvResident').value;
    if (!residentId) { toast('Veuillez d\'abord choisir un résident', 'error'); return; }
    const residents = DB.get(DB.keys.residents) || [];
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
    p.sections = result.sections || {};
    p.conclusion = result.conclusion || '';
    ensureSectionsComplete(p.sections);
    savePpe(list);
    toast('✅ Avenant régénéré depuis le journal', 'success');
    renderAvenantFull(p);
  } else {
    const residentInfo = `${resident.prenom || ''} ${resident.nom || ''}`.trim();
    const list = getPpe();
    const now = new Date().toISOString();
    const avenant = {
      id: genId(), residentId, residentName: residentInfo,
      dateRedaction: now.slice(0, 10), dateRevision: '', referent: '',
      protection: '', employeur: '', atelier: '', entreeEsat: '',
      statut: 'brouillon',
      sections: result.sections || {},
      conclusion: result.conclusion || '',
      signatures: { resident: null, referent: null, direction: null, date: null },
      createdBy: (() => { const s = Auth.getSession(); return s ? `${s.prenom||''} ${s.nom||''}`.trim() || s.username : '?'; })(),
      createdAt: now
    };
    ensureSectionsComplete(avenant.sections);
    list.unshift(avenant);
    savePpe(list);
    closeModal('modalAvenant');
    toast('✅ Avenant généré depuis le journal', 'success');
    renderAvenant();
    setTimeout(() => openAvenant(avenant.id), 400);
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
  const residentInfo = `${resident.prenom || ''} ${resident.nom || ''}`.trim();
  const journalText = entries.slice().reverse().map(e =>
    `[${e.date || '?'} ${e.heure || ''}] (${e.categorie || 'général'}) ${e.contenu || ''}`
  ).join('\n\n');

  const key = getAiKey();
  const baseSystem = getAiPrompt('ppe', 'avenant') || 'Tu es un rédacteur de PPE. Retourne UNIQUEMENT un objet JSON valide.';
  const systemPrompt = baseSystem + `\n\nEXIGENCES DE QUALITÉ :
- Appuie-toi UNIQUEMENT sur les observations du journal de bord fournies (n'utilise aucune autre source).
- Exploite l'INTÉGRALITÉ de ces observations pour produire un avenant RICHE, DÉTAILLÉ et PERSONNALISÉ.
- Pour CHAQUE domaine, rédige un bilan circonstancié (plusieurs phrases) appuyé sur des éléments concrets et l'évolution observée, puis propose des objectifs précis, mesurables, avec des moyens et des modalités d'évaluation adaptés.
- Adopte un style professionnel, institutionnel, bienveillant et nuancé ; reste factuel et n'invente aucun fait.
- CONFIDENTIALITÉ : si le journal évoque des incidents, tu peux indiquer qu'il y a eu des incidents et décrire l'accompagnement mis en place, mais NE DÉTAILLE JAMAIS leur nature, leur type ni les circonstances.`;

  let result = null;
  if (key) {
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Rédige l'avenant de PPE le plus complet et détaillé possible pour ${residentInfo}, en t'appuyant exclusivement sur les ${entries.length} observations du journal de bord ci-dessous. Couvre chaque domaine pertinent avec un bilan développé et des objectifs concrets.\n\n===== JOURNAL DE BORD (${entries.length} entrées) =====\n${journalText}` }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content?.trim() || null;
        if (raw) {
          try { result = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
          catch (_) { result = null; }
        }
      }
    } catch (_) {}
  }

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
  genererAvenantFromJournal(id);
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
