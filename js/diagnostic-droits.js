// ── DIAGNOSTIC DES DROITS — couche de page ────────────────────────────────
// Le script de la page vivait en ligne dans diagnostic-droits.html. Il est
// sorti ici lors de la migration V2, et son point d'entrée `run()` délègue
// désormais au module de rendu js/diagnostic-droits-v2.js.
//
// Ce que faisait la version V1 : un inspecteur de résolution des droits qui
// lisait `ftr_etablissements`, `ftr_users__<etab>` et `ftr_fonction_colors__…`
// dans localStorage. Ces clés sont MORTES depuis la migration Supabase (les
// comptes vivent dans `profiles`), l'écran affichait donc systématiquement
// « Aucun établissement défini ». La maquette V2 réoriente la page vers le
// diagnostic des droits & OBLIGATIONS de l'employeur, alimenté par Supabase.
//
// Les lecteurs de localStorage ci-dessous sont conservés (aucune écriture) :
// ils restent utiles à un diagnostic manuel depuis la console tant que des
// installations n'ont pas purgé leur ancien stockage.

function ddRead(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function ddNorm(s) { return (s || '').toLowerCase().trim(); }

// Union des comptes connus dans l'ancien stockage local (lecture seule).
function ddLegacyUsers() {
  const etabs = ddRead('ftr_etablissements') || [];
  const map = {};
  etabs.forEach(e => (ddRead(`ftr_users__${e.id}`) || []).forEach(u => { if (u.username) map[u.username] = u; }));
  (ddRead('ftr_users') || []).forEach(u => { if (u.username && !map[u.username]) map[u.username] = u; });
  return Object.values(map);
}

// Résolution fonction → rôle → droits, telle que la calculait la V1.
// Renvoie un rapport exploitable en console : ddLegacyDiagnostic('jdupont').
function ddLegacyDiagnostic(username) {
  const etabs = ddRead('ftr_etablissements') || [];
  const gu = ddLegacyUsers().find(u => u.username === username) || null;
  const lignes = etabs.map(e => {
    const users = ddRead(`ftr_users__${e.id}`) || [];
    const roles = ddRead(`ftr_fonction_colors__${e.id}`) || [];
    const u = gu ? users.find(x => String(x.id) === String(gu.id)) : users.find(x => x.username === username);
    const fonction = (u && u.fonction) || (gu && gu.fonction) || '';
    let match = null;
    if (fonction) {
      match = roles.find(r => ddNorm(r.fonction) === ddNorm(fonction))
           || roles.find(r => { const rn = ddNorm(r.fonction); return rn && (ddNorm(fonction).includes(rn) || rn.includes(ddNorm(fonction))); });
    }
    return {
      etablissement: e.nom || e.id,
      present: !!u,
      fonction: fonction || null,
      role: match ? match.fonction : null,
      droits: match ? (match.permissions || []).length : 0
    };
  });
  return { compte: gu, etablissements: lignes };
}

// Point d'entrée historique de la page : délègue au module V2.
function run() {
  if (typeof dd2Render === 'function') dd2Render();
}

Auth.requireAuth();

window.ddRead = ddRead;
window.ddNorm = ddNorm;
window.ddLegacyUsers = ddLegacyUsers;
window.ddLegacyDiagnostic = ddLegacyDiagnostic;
window.run = run;
