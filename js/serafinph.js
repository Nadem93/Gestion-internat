// ── Résidents : source = Supabase (lecture via sbGetResidents, écriture via sbSaveResident) ──
let _residentsCache = [];
function residentsList() { return _residentsCache; }
async function loadResidentsCache() { _residentsCache = await sbGetResidents(); }

// ⚠️ CAS PARTICULIER — données de démonstration.
// Cette fonction générait des profils SERAFIN-PH ALÉATOIRES puis les écrivait dans
// DB.set(DB.keys.residents). Contrainte projet : aucune donnée fictive ne doit être
// écrite dans les tables prod. On ne persiste donc plus rien : le seeding reste
// uniquement en mémoire (cache) pour conserver l'aperçu de démonstration locale.
// Les vraies évaluations SERAFIN-PH arrivent via ppe.js → serafinSyncResident()
// (circuit automatique : pastilles validées sur les objectifs de l'avenant).
function seedSpExemples() {
  const residents = residentsList();
  residents.forEach(r => {
    if (r.serafinph && Array.isArray(r.serafinph.selected) && r.serafinph.selected.length > 0) return;
    const codes = SP_NOMENCLATURE.map(p => p.code);
    for (let i = codes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [codes[i], codes[j]] = [codes[j], codes[i]];
    }
    const selected = codes.slice(0, 5 + Math.floor(Math.random() * 6));
    const prestations = {};
    selected.forEach(c => { prestations[c] = { niveau: 1 + Math.floor(Math.random() * 4) }; });
    r.serafinph = {
      selected,
      prestations,
      dateEvaluation: new Date(Date.now() - Math.random() * 180 * 86400000).toISOString().slice(0,10),
      notes: Math.random() < 0.3 ? 'Profil établi en équipe pluridisciplinaire.' : ''
    };
  });
  // Volontairement AUCUNE persistance ici (ni DB.set, ni sbSaveResident) : données fictives.
}

function getSpJournalStats() {
  const journal = DB.get(DB.keys.journal) || [];
  const direct = journal.filter(e => e.serafinphType === 'direct').length;
  const indirect = journal.filter(e => e.serafinphType === 'indirect').length;
  return { direct, indirect, total: direct + indirect };
}

async function initSerafinph() {
  const _s = Auth.requireAuth();
  if (!_s) return;
  if (!requireModule('access_serafinph')) return;
  await loadResidentsCache();
  if (typeof sbGetJournalEntries === 'function') {
    try { DB.set(DB.keys.journal, await sbGetJournalEntries()); } catch (e) { console.error(e); }
  }
  seedSpExemples();
  renderSerafinph();
}

// Rendu : délégué au module V2 (js/serafinph-v2.js), qui produit le thème
// sombre. La couche de données reste ici et dans js/app.js.
function renderSerafinph() {
  if (typeof sp2Render === 'function') { sp2Render(); return; }
  console.warn('SERAFIN-PH : js/serafinph-v2.js absent, aucun rendu.');
}

function printSerafinph() {
  const settings = DB.get(DB.keys.settings) || {};
  const phEtab = document.getElementById('phEtab');
  const phTitle = document.getElementById('phTitle');
  const phMeta = document.getElementById('phMeta');
  if (phEtab) phEtab.textContent = settings.etablissement || 'Foyer d\'Hébergement';
  if (phTitle) phTitle.textContent = 'Rapport SERAFIN-PH';
  if (phMeta) phMeta.textContent = `Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;

  const body = document.getElementById('spResidentsBody');
  const wasHidden = body && body.style.display === 'none';
  if (wasHidden) body.style.display = '';

  document.title = 'Rapport SERAFIN-PH';
  window.print();
  document.title = 'SERAFIN-PH — FTR';
  if (wasHidden) body.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initSerafinph);
if (typeof registerPageInit === 'function') registerPageInit('serafinph', initSerafinph);
