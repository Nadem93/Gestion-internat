const AST_TYPES = [
  { id:'medecin',    label:'Médecin de garde',      icon:'👨‍⚕️', color:'#dc2626' },
  { id:'infirmier',  label:'Infirmier(e) d\'astreinte', icon:'🩺', color:'#8b5cf6' },
  { id:'cadre',      label:'Cadre de permanence',   icon:'👤', color:'#0891b2' },
  { id:'technique',  label:'Astreinte technique',   icon:'🔧', color:'#d97706' },
  { id:'direction',  label:'Direction',             icon:'🏛️', color:'#0f2b4a' }
];
// Un `const` de premier niveau ne crée pas de propriété sur window : le module
// de rendu V2 et les onclick en ligne ont besoin d'une référence explicite.
window.AST_TYPES = AST_TYPES;

let _astCache = [];
function getAst()       { return _astCache; }
function _astType(id)   { return AST_TYPES.find(t => t.id === id) || AST_TYPES[0]; }

let _astEditId = '';

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initAstreintes() {
  Auth.requireAuth();
  if (window.__astDenied) return;

  if (typeof sbGetEmployes === 'function') { try { DB.set(DB.keys.employes, await sbGetEmployes()); } catch(e){ console.error(e); } }
  _populateAstEmployes();

  // Navigation de mois (le rendu V2 raisonne en mois, pas en semaine).
  document.getElementById('astPrev')?.addEventListener('click', () => window.ast2PrevMois?.());
  document.getElementById('astNext')?.addEventListener('click', () => window.ast2NextMois?.());
  document.getElementById('astToday')?.addEventListener('click', () => window.ast2MoisCourant?.());

  window.ast2RenderSeg?.();

  const [ast] = await Promise.all([
    sbGetAstreintes(),
    window.AST2 ? window.AST2.loadExtra() : Promise.resolve()
  ]);
  _astCache = ast;
  renderAstreintes();
}

function _populateAstEmployes() {
  const emp = DB.get(DB.keys.employes) || [];
  const sel = document.getElementById('astModalEmploye');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Saisir manuellement —</option>' +
    emp.map(e => `<option value="${escAttr((e.prenom||'')+' '+(e.nom||''))}">${escHtml((e.prenom||'')+' '+(e.nom||''))}</option>`).join('');
  sel.addEventListener('change', e => {
    if (e.target.value) {
      document.getElementById('astModalNom').value = e.target.value.trim();
    }
  });
}

// ─── Rendu principal ──────────────────────────────────────────────────────────
// Toute la mise en page est portée par js/astreintes-v2.js (maquette V2).
function renderAstreintes() {
  if (window.AST2 && typeof window.AST2.render === 'function') { window.AST2.render(); return; }
  console.warn('[astreintes] js/astreintes-v2.js absent — aucun rendu.');
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openAstModal(id, presetType, presetDate) {
  _astEditId = id || '';
  const list = getAst();
  const a    = id ? list.find(x => x.id === id) : null;

  document.getElementById('astModalTitle').textContent = a ? 'Modifier l\'astreinte' : 'Planifier une astreinte';
  document.getElementById('astModalType').value  = a?.type || presetType || 'medecin';
  document.getElementById('astModalDate').value  = a?.date || presetDate || today();
  document.getElementById('astModalNom').value   = a?.nom  || '';
  document.getElementById('astModalTel').value   = a?.tel  || '';
  document.getElementById('astModalNote').value  = a?.note || '';

  const fin = document.getElementById('astModalDateFin');
  if (fin) fin.value = '';
  // La période « du → au » n'a de sens qu'à la création : une ligne existante
  // porte un seul jour.
  const finBox = document.getElementById('astModalFinBox');
  if (finBox) finBox.style.display = a ? 'none' : '';
  const hint = document.getElementById('astModalHint');
  if (hint) hint.style.display = a ? 'none' : '';
  const del = document.getElementById('astDeleteBtn');
  if (del) del.style.display = a ? '' : 'none';

  const sel = document.getElementById('astModalEmploye');
  if (sel) sel.value = '';

  window.ast2RenderSeg?.();
  openModal('modalAst');
}

// Liste des jours d'une période, bornes incluses (30 jours maximum).
function _astJours(debut, fin) {
  if (!fin || fin <= debut) return [debut];
  const out = [];
  const p = debut.split('-');
  let d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  for (let i = 0; i < 31; i++) {
    const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    out.push(s);
    if (s >= fin) break;
    d = new Date(d.getTime() + 86400000);
  }
  return out;
}

async function saveAstreinte() {
  const date = document.getElementById('astModalDate').value;
  const nom  = document.getElementById('astModalNom').value.trim();
  const type = document.getElementById('astModalType').value;
  if (!date || !nom) { toast('Date et nom obligatoires', 'error'); return; }

  const base = {
    type, nom,
    tel:  document.getElementById('astModalTel').value.trim(),
    note: document.getElementById('astModalNote').value.trim()
  };

  try {
    if (_astEditId) {
      const saved = await sbSaveAstreinte({ ...base, date, id: _astEditId });
      const idx = _astCache.findIndex(x => x.id === _astEditId);
      if (idx !== -1) _astCache[idx] = saved;
      toast('Astreinte modifiée');
    } else {
      const fin   = document.getElementById('astModalDateFin')?.value || '';
      const jours = _astJours(date, fin);
      for (const j of jours) {
        const saved = await sbSaveAstreinte({ ...base, date: j });
        _astCache.push(saved);
      }
      toast(jours.length > 1
        ? `Astreinte planifiée sur ${jours.length} jours`
        : 'Astreinte enregistrée', 'success');
    }
  } catch (e) {
    toast('Erreur lors de l\'enregistrement', 'error');
    console.error(e);
    return;
  }
  closeModal('modalAst');
  renderAstreintes();
}

async function deleteAst(id) {
  const delId = id || _astEditId;
  if (!delId) return;
  if (!confirm('Supprimer cette astreinte ?')) return;
  try {
    await sbDeleteAstreinte(delId);
  } catch (e) {
    toast('Erreur lors de la suppression', 'error');
    console.error(e);
    return;
  }
  _astCache = _astCache.filter(x => x.id !== delId);
  closeModal('modalAst');
  renderAstreintes();
  toast('Astreinte supprimée');
}

document.addEventListener('DOMContentLoaded', initAstreintes);
