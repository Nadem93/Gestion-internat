// ── FICHE DE LIAISON HOSPITALIÈRE — données & actions ──
// Ce fichier charge les données (résidents, plan de soins, complément de
// fiche) et pilote le sélecteur. Le RENDU est assuré par le module V2
// (js/fiche-liaison-v2.js, chargé après) : renderFicheLiaison() lui délègue.

let _flResidentId = '';
let _flData = {};

async function initFicheLiaison() {
  Auth.requireAuth();
  await sbLoadResidentsCache();
  if (typeof sbGetPlanSoins === 'function') { try { DB.set(DB.keys.planSoins, await sbGetPlanSoins()); } catch (e) { console.error('[fiche-liaison] planSoins', e); } }
  // Complément de fiche (table fiches_liaison) : absente ⇒ {} + console.warn,
  // la page reste utilisable (voir migration-fiche-liaison.sql).
  if (typeof fl2LoadComplements === 'function') { await fl2LoadComplements(); }

  const params = new URLSearchParams(window.location.search);
  _flResidentId = params.get('residentId') || params.get('id') || '';

  _populateFlResidents();
  document.getElementById('flResident')?.addEventListener('change', e => {
    _flResidentId = e.target.value;
    loadFicheLiaison();
    if (typeof fl2RenderChips === 'function') fl2RenderChips();
  });

  if (typeof fl2RenderChips === 'function') fl2RenderChips();
  loadFicheLiaison();
}

function _populateFlResidents() {
  const residents = sbResidents().filter(r => r.statut !== 'sorti');
  const el = document.getElementById('flResident');
  if (!el) return;
  el.innerHTML = '<option value="">— Choisir un résident —</option>' +
    residents.map(r => `<option value="${escAttr(String(r.id))}">${escHtml((r.prenom||'')+' '+(r.nom||''))}</option>`).join('');
  if (_flResidentId) el.value = _flResidentId;
}

function loadFicheLiaison() {
  if (!_flResidentId) { _flData = {}; renderFicheLiaison(); return; }

  const r = sbResidents().find(x => x.id === _flResidentId);
  if (!r) { _flData = {}; renderFicheLiaison(); return; }

  // Dernière évaluation (MIF / Barthel / SERAFIN-PH) — portée par le résident
  const evals = (r.evaluations || []).slice().sort((a, b) => (b.date||'').localeCompare(a.date||''));
  const lastEval = evals[0] || null;

  // Traitements en cours — source réelle : la fiche santé du résident
  const meds = (r.sante && r.sante.traitements) || [];

  // Plan de soins actif
  const soins = (DB.get(DB.keys.planSoins) || []).filter(s => s.residentId === _flResidentId && s.actif !== false);

  // Rédacteur = utilisateur connecté
  const session = Auth.getSession();
  const redacteur = session ? `${session.prenom||''} ${session.nom||''}`.trim() || session.username : 'Inconnu';

  _flData = { r, lastEval, meds, soins, redacteur };
  renderFicheLiaison();
}

// Délégation au module V2 (chargé après ce fichier).
function renderFicheLiaison() {
  if (typeof fl2Render === 'function') { fl2Render(); return; }
  console.warn('[fiche-liaison] js/fiche-liaison-v2.js non chargé : rien à afficher.');
}

function printFiche() {
  if (!_flResidentId || !_flData.r) { toast('Sélectionnez d\'abord un résident', 'error'); return; }
  const doc = (typeof fl2PrintDoc === 'function') ? fl2PrintDoc() : '';
  if (!doc) return;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { toast('Autorisez les fenêtres pop-up pour imprimer', 'error'); return; }
  w.document.write(doc);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

document.addEventListener('DOMContentLoaded', initFicheLiaison);
