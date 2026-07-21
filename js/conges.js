let _cgCache = [];
let _cgEmployesCache = [];

async function initConges() {
  const _s = Auth.requireAuth();
  if (!_s) return;
  if (!requireModule('access_conges')) return;
  try {
    [_cgCache, _cgEmployesCache] = await Promise.all([sbGetConges(), sbGetEmployes()]);
  } catch (e) {
    console.error('[initConges]', e);
    toast('Erreur de chargement', 'error');
  }
  // Le module V2 lit les caches sur window (un `let` de premier niveau ne crée
  // pas de propriété globale).
  window._cgCache = _cgCache;
  window._cgEmployesCache = _cgEmployesCache;

  // Tables optionnelles (soldes + règles) : dégradation douce assurée par CGV.
  if (window.CGV) {
    try { await Promise.all([CGV.loadSoldes(), CGV.loadRegles()]); }
    catch (e) { console.warn('[initConges] chargements optionnels', e); }
  }

  const opts = _cgEmployesCache
    .map(e => `<option value="${e.id}">${escHtml(e.prenom + ' ' + e.nom)}</option>`).join('');
  const sel = document.getElementById('cgFiltreEmploye');
  if (sel) sel.innerHTML = '<option value="">Tous les salariés</option>' + opts;
  const selMod = document.getElementById('cgEmploye');
  if (selMod) selMod.innerHTML = opts;

  renderConges();
}

function getConges() { return _cgCache; }

// Renvoie une copie de la demande avec le nom du salarié résolu depuis le cache
// (nom de famille déjà en MAJUSCULES via le mapper employés).
function cgWithNom(d) {
  const e = _cgEmployesCache.find(x => String(x.id) === String(d.employeId));
  return e ? { ...d, employeNom: `${e.prenom || ''} ${e.nom || ''}`.trim() } : d;
}

// La modale est désormais statique dans conges.html (gabarit V2 .v2-ov/.v2-md).
// On ne fait plus que la remplir puis l'ouvrir.
function openDemandeConge(data) {
  window._cgEditId = data ? data.id : '';

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('cgEmploye', data ? data.employeId : (document.getElementById('cgEmploye')?.options[0]?.value || ''));
  set('cgType', data && data.type ? data.type : 'cp');
  set('cgDebut', data ? data.debut || '' : '');
  set('cgFin', data ? data.fin || '' : '');
  set('cgMotif', data ? data.motif || '' : '');

  const titre = document.getElementById('cgModalTitre');
  if (titre) titre.textContent = data ? 'Modifier la demande' : 'Nouvelle demande de congé';
  const lbl = document.getElementById('cgSaveLbl');
  if (lbl) lbl.textContent = data ? 'Enregistrer' : 'Envoyer la demande';

  // Contrôle d'accès inchangé : un non-admin ne peut déclarer que pour lui-même.
  const sel = document.getElementById('cgEmploye');
  if (sel) {
    sel.disabled = false;
    if (!Auth.isAdmin()) {
      const own = _cgEmployesCache.find(e => String(e.profileId) === String(Auth.getSession()?.userId));
      if (own) { sel.value = own.id; sel.disabled = true; }
    }
  }

  if (window.CGV) { CGV.syncSeg(); CGV.syncDuree(); }
  cgModalSync();
  openModal('modalConge');
}

// En-tête interactif du modal congés : recolore selon le type + sous-titre « Type · Employé »
function cgModalSync() {
  const modalEl = document.querySelector('#modalConge .v2-md');
  const sub = document.querySelector('#modalConge .v2-md-s');
  if (!modalEl || !sub) return;
  const type = document.getElementById('cgType')?.value || 'cp';
  const meta = (typeof CONGE_TYPE_META !== 'undefined' && CONGE_TYPE_META[type]) ? CONGE_TYPE_META[type] : { label: type, color: '#0891b2' };
  modalEl.style.setProperty('--mc', meta.color);
  const empSel = document.getElementById('cgEmploye');
  const empNom = (empSel && empSel.value && empSel.selectedIndex >= 0) ? empSel.options[empSel.selectedIndex].text : '';
  sub.textContent = empNom ? `${meta.label} · ${empNom}` : meta.label;
}

async function saveConge(id) {
  const employeId = document.getElementById('cgEmploye').value;
  const type = document.getElementById('cgType').value;
  const debut = document.getElementById('cgDebut').value;
  const fin = document.getElementById('cgFin').value;
  const motif = document.getElementById('cgMotif').value.trim();
  if (!employeId || !debut || !fin) { toast('Champs obligatoires manquants', 'error'); return; }
  if (debut > fin) { toast('La date de fin doit être après la date de début', 'error'); return; }
  const emp = _cgEmployesCache.find(e => String(e.id) === String(employeId));
  try {
    if (id) {
      const existing = _cgCache.find(d => d.id === id) || {};
      const saved = await sbSaveConge({ ...existing, id, employeId, employeNom: emp ? emp.prenom+' '+emp.nom : existing.employeNom, type, debut, fin, motif });
      const idx = _cgCache.findIndex(d => d.id === id);
      if (idx !== -1) _cgCache[idx] = saved;
      toast('Demande mise à jour', 'success');
    } else {
      const saved = await sbSaveConge({ employeId, employeNom: emp ? emp.prenom+' '+emp.nom : '', type, debut, fin, motif, statut: 'en_attente' });
      _cgCache.unshift(saved);
      if (typeof auditLog === 'function') auditLog('conge', 'Nouvelle demande — '+(emp?.prenom||'')+' '+(emp?.nom||''));
      toast('Demande de congés envoyée ✓', 'success');
    }
    closeModal('modalConge');
    renderConges();
  } catch (e) {
    const msg = e?.message || e?.details || JSON.stringify(e) || 'Erreur inconnue';
    toast('Erreur : ' + msg, 'error');
    console.error('[saveConge]', e);
  }
}

async function repondreConge(id, statut) {
  const item = _cgCache.find(d => d.id === id);
  if (!item) return;
  let reponseMotif = '';
  if (statut === 'refuse') {
    const motif = prompt('Motif du refus :');
    if (motif === null) return;
    reponseMotif = motif.trim() || '';
  }
  const s = Auth.getSession();
  try {
    const saved = await sbUpdateConge(id, {
      statut,
      reponse_motif: reponseMotif,
      approuve_par: s ? [s.prenom,s.nom].filter(Boolean).join(' ') || s.username : '',
      approuve_par_id: s ? String(s.userId) : null,
      approuve_at: new Date().toISOString()
    });
    const idx = _cgCache.findIndex(d => d.id === id);
    if (idx !== -1) _cgCache[idx] = saved;
    toast('Demande ' + (statut === 'accepte' ? 'acceptée' : 'refusée'), 'success');
    if (typeof auditLog === 'function') auditLog('conge_' + statut, item.employeNom + ' — ' + item.type);
    renderConges();
  } catch (e) {
    toast('Erreur : ' + (e?.message || e), 'error');
    console.error('[repondreConge]', e);
  }
}

function supprimerConge(id) {
  confirmDialog('Supprimer cette demande ?', async () => {
    try {
      await sbDeleteConge(id);
      _cgCache = _cgCache.filter(d => d.id !== id);
      toast('Demande supprimée', 'info');
      renderConges();
    } catch (e) {
      toast('Erreur : ' + (e?.message || e), 'error');
      console.error('[supprimerConge]', e);
    }
  });
}

// Le rendu est délégué au module V2 (js/conges-v2.js).
function renderConges() {
  window._cgCache = _cgCache;
  window._cgEmployesCache = _cgEmployesCache;
  if (window.CGV) { CGV.render(); return; }
  console.warn('[conges] module V2 absent — rendu ignoré.');
}

document.addEventListener('DOMContentLoaded', initConges);
if (typeof registerPageInit === 'function') registerPageInit('conges', initConges);
