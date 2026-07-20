// ── CAHIER DE NUIT & ASTREINTE ──
// Une fiche par nuit (datée du soir) : rondes, événements nocturnes, appels à l'astreinte, transmission du matin
let nuitDate = null;
let nuitEvtEditId = null;

const NUIT_AMBIANCES = {
  calme: { label: 'Nuit calme', color: '#16a34a' },
  agitee: { label: 'Nuit agitée', color: '#d97706' },
  tres_agitee: { label: 'Nuit très agitée', color: '#dc2626' }
};
const NUIT_EVT_TYPES = {
  reveil: { label: 'Réveil / insomnie', icon: '😴' },
  angoisse: { label: 'Angoisse / crise', icon: '😰' },
  soin: { label: 'Soin / santé', icon: '🩺' },
  conflit: { label: 'Conflit / agitation', icon: '⚡' },
  fugue: { label: 'Absence / fugue', icon: '🚨' },
  retour: { label: 'Retour tardif', icon: '🌙' },
  autre: { label: 'Autre', icon: '📌' }
};

// Source = Supabase. Cache mémoire chargé au démarrage.
let _nuitCache = [];
function getNuits() { return _nuitCache; }
async function loadNuitsCache() { _nuitCache = await sbGetNuits(); }
function getNuit(date) { return getNuits().find(n => n.date === date) || null; }
// Persiste une nuit précise (remonte une erreur via toast)
function persistNuit(n) {
  if (!n || !n.id) return;
  sbSaveNuit(n).catch(e => { console.error('[nuit]', e); toast('Erreur sauvegarde cahier de nuit', 'error'); });
}

function nuitLabel(date) {
  const d1 = new Date(date + 'T12:00');
  const d2 = new Date(d1.getTime() + 86400000);
  const fmt = d => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `Nuit du ${fmt(d1)} au ${fmt(d2)}`;
}

function updateNuit(patch) {
  let list = getNuits();
  const idx = list.findIndex(n => n.date === nuitDate);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  persistNuit(list[idx]);
}

// ── OUVERTURE / NAVIGATION ──
async function ouvrirNuit() {
  const s = Auth.getSession();
  if (!getNuit(nuitDate)) {
    // Effectif auto : présents pointés ce jour, sinon résidents actifs
    const pres = (DB.get(DB.keys.presences) || {})[nuitDate] || {};
    const actifs = sbResidents().filter(r => r.statut !== 'sorti');
    const presents = actifs.filter(r => (pres[r.id] || 'present') === 'present').length;
    try {
      const saved = await sbSaveNuit({
        date: nuitDate,
        veilleur: s ? [s.prenom, s.nom].filter(Boolean).join(' ') || s.username : '?',
        veilleurId: s?.userId,
        ambiance: 'calme', effectif: presents,
        rondes: [], evenements: [], astreintes: [],
        transmission: ''
      });
      _nuitCache.push(saved);
    } catch (e) { console.error('[ouvrirNuit]', e); toast('Erreur ouverture cahier : ' + (e?.message || e), 'error'); return; }
    if (typeof auditLog === 'function') auditLog('nuit_open', 'Cahier de nuit ' + nuitDate);
  }
  renderNuit();
}

function nuitShift(days) {
  const d = new Date(nuitDate + 'T12:00');
  d.setDate(d.getDate() + days);
  nuitDate = d.toISOString().slice(0, 10);
  renderNuit();
}

// ── RENDU ──
// Le rendu est assuré par js/nuit-v2.js (design V2). On conserve renderNuit()
// et renderNuitHisto() : tous les appelants existants passent par elles.
function renderNuit() {
  if (typeof nt2Render === 'function') nt2Render();
}
function renderNuitHisto() {
  if (typeof nt2RenderHisto === 'function') nt2RenderHisto();
}

// ── ACTIONS ──
function addRonde() {
  const heure = document.getElementById('rdHeure').value;
  if (!heure) { toast("Indiquez l'heure de la ronde", 'error'); return; }
  const n = getNuit(nuitDate);
  updateNuit({ rondes: [...(n.rondes || []), { id: genId(), heure, ras: document.getElementById('rdRas').checked, note: document.getElementById('rdNote').value.trim() }] });
  renderNuit();
}
function delRonde(id) { const n = getNuit(nuitDate); updateNuit({ rondes: (n.rondes || []).filter(r => r.id !== id) }); renderNuit(); }

function addAstreinte() {
  const heure = document.getElementById('asHeure').value;
  const motif = document.getElementById('asMotif').value.trim();
  if (!heure || !motif) { toast('Heure et motif requis', 'error'); return; }
  const n = getNuit(nuitDate);
  updateNuit({ astreintes: [...(n.astreintes || []), { id: genId(), heure, cadre: document.getElementById('asCadre').value.trim(), motif, decision: document.getElementById('asDecision').value.trim() }] });
  if (typeof auditLog === 'function') auditLog('astreinte_call', `Appel astreinte ${nuitDate} ${heure}`);
  renderNuit();
}
function delAstreinte(id) { const n = getNuit(nuitDate); updateNuit({ astreintes: (n.astreintes || []).filter(a => a.id !== id) }); renderNuit(); }

let _ntTimer = null;
function saveTransmission() {
  clearTimeout(_ntTimer);
  _ntTimer = setTimeout(() => {
    updateNuit({ transmission: document.getElementById('ntTransmission').value });
    const el = document.getElementById('ntSaved');
    if (el) { el.textContent = '✓ Enregistré'; setTimeout(() => { el.textContent = ''; }, 1500); }
  }, 400);
}

// ── ÉVÉNEMENTS (modal) ──
function openNuitEvtModal(id) {
  nuitEvtEditId = id || null;
  const n = getNuit(nuitDate);
  const e = id ? (n.evenements || []).find(x => x.id === id) || {} : {};
  const residents = sbResidents().filter(r => r.statut !== 'sorti');
  document.getElementById('neResident').innerHTML = '<option value="">— Aucun / collectif —</option>' +
    residents.map(r => `<option value="${r.id}"${String(e.residentId) === String(r.id) ? ' selected' : ''}>${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</option>`).join('');
  document.getElementById('neType').value = e.type || 'reveil';
  document.getElementById('neHeure').value = e.heure || '';
  document.getElementById('neDesc').value = e.description || '';
  openModal('modalNuitEvt');
}

function saveNuitEvt() {
  const desc = document.getElementById('neDesc').value.trim();
  if (!desc) { toast('Décrivez l\'événement', 'error'); return; }
  const rid = document.getElementById('neResident').value;
  const r = sbResidents().find(x => String(x.id) === String(rid));
  const data = {
    type: document.getElementById('neType').value,
    heure: document.getElementById('neHeure').value,
    residentId: rid || null,
    residentName: r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : '',
    description: desc
  };
  const n = getNuit(nuitDate);
  let evts = n.evenements || [];
  if (nuitEvtEditId) evts = evts.map(x => x.id === nuitEvtEditId ? { ...x, ...data } : x);
  else evts = [...evts, { id: genId(), ...data }];
  updateNuit({ evenements: evts });
  closeModal('modalNuitEvt');
  toast('Événement consigné ✓');
  renderNuit();
}
function delNuitEvt(id) {
  confirmDialog('Supprimer cet événement ?', () => {
    const n = getNuit(nuitDate);
    updateNuit({ evenements: (n.evenements || []).filter(e => e.id !== id) });
    renderNuit();
  });
}

// ── INIT ──
async function initNuit() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_journal')) return;
  await sbLoadResidentsCache();
  await loadNuitsCache();
  if (typeof sbGetPresencesRange === 'function') {
    try {
      const d = new Date(); d.setDate(d.getDate() - 3);
      const from = d.toISOString().slice(0, 10);
      DB.set(DB.keys.presences, await sbGetPresencesRange(from, today()));
    } catch (e) { console.error(e); }
  }
  // Avant 12 h, on est encore « sur » la nuit de la veille
  const now = new Date();
  if (now.getHours() < 12) now.setDate(now.getDate() - 1);
  nuitDate = now.toISOString().slice(0, 10);
  document.getElementById('ntDate')?.addEventListener('change', e => { if (e.target.value) { nuitDate = e.target.value; renderNuit(); } });
  renderNuit();
}
document.addEventListener('DOMContentLoaded', initNuit);
