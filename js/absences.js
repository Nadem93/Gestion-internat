// ── SUIVI DES ABSENCES & ACCIDENTS DU TRAVAIL ──
const AB_TYPES = {
  maladie:        { label: 'Arrêt maladie',            icon: '🤒', color: '#d97706' },
  at:             { label: 'Accident du travail',      icon: '⚠️', color: '#dc2626' },
  maladie_pro:    { label: 'Maladie professionnelle',  icon: '🏭', color: '#9333ea' },
  maternite:      { label: 'Congé maternité/paternité', icon: '👶', color: '#8b5cf6' },
  longue_maladie: { label: 'Longue maladie',           icon: '🩺', color: '#b91c1c' },
  autre:          { label: 'Autre absence',            icon: '📋', color: '#64748b' }
};

let abEditId = null;
let _abCache = [];
let _abEmployesCache = [];

function getAbsences()      { return _abCache; }
function abEmployes()       { return _abEmployesCache; }
function abEmployeNom(id)   { const e = abEmployes().find(x => String(x.id) === String(id)); return e ? `${e.prenom||''} ${e.nom||''}`.trim() : 'Inconnu'; }
function abIsCanEdit()      { return Auth.isAdmin() || (typeof canEditResidents === 'function' && canEditResidents(Auth.getSession()?.userId)); }

function abDureeJours(a) {
  const fin = a.fin || today();
  return Math.ceil((new Date(fin + 'T00:00:00') - new Date(a.debut + 'T00:00:00')) / 86400000) + 1;
}

function abEnCours(a) { return !a.fin || a.fin >= today(); }

// ── RENDU PRINCIPAL ──
// Le rendu est assuré par js/absences-v2.js (design V2). Cette fonction ne
// fait plus que déléguer ; elle reste exposée pour les appels historiques.
function renderAbsences() {
  if (window.ABV && typeof window.ABV.render === 'function') { window.ABV.render(); return; }
  console.warn('[absences] module de rendu V2 absent (js/absences-v2.js)');
}

// ── MODAL ──
function openAbsenceModal(id) {
  abEditId = id || null;
  const a = id ? getAbsences().find(x => x.id === id) : null;

  document.getElementById('abModalTitle').textContent = a ? "Modifier l'absence" : 'Déclarer une absence';
  document.getElementById('abEmploye').value = a?.employeId || '';
  document.getElementById('abType').value    = a?.type || 'maladie';
  document.getElementById('abDebut').value   = a?.debut || today();
  document.getElementById('abFin').value     = a?.fin || '';
  document.getElementById('abProlongation').checked = !!a?.prolongation;
  document.getElementById('abVisiteDate').value  = a?.visiteDate || '';
  document.getElementById('abVisiteFaite').checked = !!a?.visiteFaite;
  const dc = document.getElementById('abDeclareeCpam'); if (dc) dc.checked = !!a?.declareeCpam;
  document.getElementById('abNotes').value   = a?.notes || '';
  const af = document.getElementById('abFichier'); if (af) af.value = '';
  const aj = document.getElementById('abJustifInfo');
  if (aj) aj.innerHTML = a?.justificatifPath ? `📎 Justificatif joint — <a href="#" onclick="abOpenJustificatif('${a.id}');return false">voir</a>` : '';
  document.getElementById('abDeleteBtn').style.display = a ? '' : 'none';
  _abToggleVisiteWrap();
  _abToggleDeclareeWrap();
  abModalSync();
  openModal('modalAbsence');
}

function _abToggleVisiteWrap() {
  const fin = document.getElementById('abFin').value;
  document.getElementById('abVisiteWrap').style.display = fin ? '' : 'none';
}

// La déclaration CPAM ne concerne que les accidents du travail
function _abToggleDeclareeWrap() {
  const wrap = document.getElementById('abDeclareeWrap');
  if (!wrap) return;
  wrap.style.display = document.getElementById('abType').value === 'at' ? '' : 'none';
}

// En-tête interactif : recolore selon le type d'arrêt + sous-titre « Type · Employé »
function abModalSync() {
  const modalEl = document.querySelector('#modalAbsence .v2-md');
  const sub = document.getElementById('abModalSub');
  if (!modalEl || !sub) return;
  const t = AB_TYPES[document.getElementById('abType')?.value] || AB_TYPES.maladie;
  modalEl.style.setProperty('--mc', t.color);
  const empSel = document.getElementById('abEmploye');
  const empNom = (empSel && empSel.value && empSel.selectedIndex >= 0) ? empSel.options[empSel.selectedIndex].text : '';
  sub.textContent = empNom ? `${t.label} · ${empNom}` : t.label;
}

async function saveAbsence() {
  const employeId = document.getElementById('abEmploye').value;
  const debut = document.getElementById('abDebut').value;
  if (!employeId || !debut) { toast('Employé et date de début obligatoires', 'error'); return; }

  const type = document.getElementById('abType').value;
  const existing = abEditId ? _abCache.find(x => x.id === abEditId) : null;
  const file = document.getElementById('abFichier')?.files[0];
  if (file && file.size > 5 * 1024 * 1024) { toast('Fichier trop lourd (max 5 Mo)', 'error'); return; }

  const data = {
    id: abEditId || undefined,
    employeId,
    employeNom: abEmployeNom(employeId),
    type,
    debut,
    fin: document.getElementById('abFin').value,
    prolongation: document.getElementById('abProlongation').checked,
    visiteDate: document.getElementById('abVisiteDate').value,
    visiteFaite: document.getElementById('abVisiteFaite').checked,
    declareeCpam: type === 'at' ? document.getElementById('abDeclareeCpam')?.checked || false : false,
    justifie: existing?.justifie || false,
    justificatifPath: existing?.justificatifPath || '',
    notes: document.getElementById('abNotes').value.trim()
  };

  try {
    if (file) {
      // RLS du bucket « justificatifs » : le 1er segment du chemin DOIT être
      // auth.uid() (l'uploadeur), jamais le profil de l'employé ni l'id legacy
      // de la session localStorage.
      const uid = await sbAuthUid();
      if (!uid) { toast('Session Supabase expirée — reconnectez-vous', 'error'); return; }
      data.justificatifPath = await sbUploadJustificatif(file, uid);
    }
    const saved = await sbSaveAbsence(data);
    if (abEditId) {
      const idx = _abCache.findIndex(x => x.id === abEditId);
      if (idx >= 0) _abCache[idx] = saved;
      toast('Absence mise à jour');
    } else {
      _abCache.unshift(saved);
      toast('Absence enregistrée', 'success');
    }
    if (typeof auditLog === 'function') auditLog('absence_save', `Absence — ${abEmployeNom(employeId)}`);
    closeModal('modalAbsence');
    renderAbsences();
  } catch (e) {
    const msg = e?.message || e?.details || JSON.stringify(e) || 'Erreur inconnue';
    toast('Erreur : ' + msg, 'error');
    console.error('[saveAbsence]', e);
  }
}

async function _abRemove(id) {
  try {
    await sbDeleteAbsence(id);
    _abCache = _abCache.filter(x => x.id !== id);
    renderAbsences();
    toast('Absence supprimée', 'info');
  } catch (e) {
    toast('Erreur : ' + (e?.message || e), 'error');
    console.error('[deleteAbsence]', e);
  }
}

function deleteAbsence() {
  if (!abEditId) return;
  const id = abEditId;
  confirmDialog('Supprimer cette absence ?', async () => { closeModal('modalAbsence'); await _abRemove(id); });
}

function quickDeleteAbsence(id) {
  confirmDialog('Supprimer cette absence ?', () => _abRemove(id));
}

async function abOpenJustificatif(id) {
  const a = _abCache.find(x => x.id === id);
  if (!a || !a.justificatifPath) return;
  const url = await sbJustificatifUrl(a.justificatifPath);
  if (url) window.open(url, '_blank'); else toast('Justificatif introuvable', 'error');
}

// Marquer une absence comme justifiée (ou la repasser à « à justifier »)
async function abMarkJustifie(id, value = true) {
  const a = _abCache.find(x => x.id === id);
  if (!a) return;
  try {
    const saved = await sbSaveAbsence({ ...a, justifie: value });
    const i = _abCache.findIndex(x => x.id === id);
    if (i >= 0) _abCache[i] = saved;
    renderAbsences();
    toast(value ? 'Absence justifiée ✓' : 'Repassée à « à justifier »');
  } catch (e) {
    toast('Erreur : ' + (e?.message || e), 'error');
    console.error('[abMarkJustifie]', e);
  }
}

// ── INIT ──
async function initAbsences() {
  const s = Auth.requireAuth();
  if (!s) return;
  try {
    [_abCache, _abEmployesCache] = await Promise.all([sbGetAbsences(), sbGetEmployes()]);
  } catch (e) {
    console.error('[initAbsences]', e);
    toast('Erreur de chargement', 'error');
  }
  const employes = abEmployes();
  const opts = employes.map(e => `<option value="${e.id}">${escHtml((e.prenom||'')+' '+(e.nom||''))}</option>`).join('');
  document.getElementById('abFilterEmploye').innerHTML = '<option value="">Tous les employés</option>' + opts;
  document.getElementById('abEmploye').innerHTML = '<option value="">— Choisir —</option>' + opts;

  if (!abIsCanEdit()) { const b = document.getElementById('btnAddAbsence'); if (b) b.style.display = 'none'; }
  document.getElementById('abFin')?.addEventListener('change', _abToggleVisiteWrap);
  document.getElementById('abType')?.addEventListener('change', _abToggleDeclareeWrap);
  ['abType','abEmploye'].forEach(id => document.getElementById(id)?.addEventListener('change', abModalSync));
  ['abFilterEmploye','abFilterType'].forEach(id => document.getElementById(id)?.addEventListener('change', renderAbsences));
  renderAbsences();
}
document.addEventListener('DOMContentLoaded', initAbsences);
