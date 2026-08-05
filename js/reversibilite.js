// ══════════════════════════════════════════════════════════════════════════
// RÉVERSIBILITÉ — export intégral des données de l'établissement
//
// Obligation contractuelle (art. 28.3.g RGPD) : restituer TOUTES les données
// dans un format structuré et lisible par machine. Voir conformite/05.
//
// Pourquoi ce module plutôt que l'export de sauvegarde existant :
// celui-ci passe par les fonctions sbGet*, qui ne couvrent que 43 tables sur
// 92 — observations cliniques, mesures de protection, stock de médicaments…
// en étaient absents. Ici la lecture est pilotée par l'INVENTAIRE DES TABLES :
// on interroge chaque table directement, donc rien ne peut être oublié.
//
// Une table ajoutée au produit doit être ajoutée à REV_TABLES ci-dessous ;
// revAudit() signale justement les tables utilisées dans le code mais absentes
// de cette liste, pour que l'oubli se voie.
//
// La RLS de Supabase restreint d'elle-même la lecture à l'établissement de
// l'utilisateur : l'export ne peut pas fuir les données d'un autre client.
// ══════════════════════════════════════════════════════════════════════════

const REV_TABLES = [
  'absences_at', 'absences_at_etapes', 'activite_presences', 'activites', 'admin_agrements',
  'admissions', 'alertes_prises', 'annonces', 'app_config', 'astreintes',
  'attestations_salaire', 'audit_log', 'budget_demandes', 'budget_enveloppes',
  'budget_fournisseurs', 'budget_previsionnel', 'candidats', 'chambres', 'climat_unite',
  'conges', 'conges_regles', 'conges_soldes', 'consignes', 'contacts_externes', 'contrats',
  'conversations', 'creneaux_salon', 'cvs', 'cvs_idees', 'documentation', 'documents_employe',
  'documents_resident', 'dossier_pieces_requises', 'echeances', 'employes', 'entretiens',
  'etablissements', 'etats_lieux', 'evaluations', 'facturation_tarifs', 'factures',
  'famille_residents', 'fiches_liaison', 'fiches_paie', 'finance_recettes',
  'formation_evaluations', 'formations', 'incidents', 'interventions', 'inventaire',
  'inventaire_comptages', 'inventaire_fournisseurs', 'inventaire_mouvements',
  'journal_entries', 'med_distrib', 'messages', 'messages_epingles', 'mesures_protection',
  'nuits', 'observations_cliniques', 'paie_soldes_tout_compte', 'plan_soins',
  'plan_soins_coches', 'planning_equipe', 'planning_events', 'planning_regles_travail',
  'pointage_bornes', 'pointage_verrous_mois', 'pointages', 'ppe', 'presences', 'profiles',
  'protocoles_urgence', 'rapport_contributions', 'rapports_generes', 'repas_jour',
  'repertoire', 'repertoire_appels', 'residents', 'rh_droits_conges', 'satisfaction',
  'satisfaction_questions', 'signatures', 'sommeil_nuit', 'stock_medicaments', 'taches_coches',
  'taches_ppa', 'taches_type', 'transmissions', 'veille_consignes', 'viatrajectoire',
  'visites'
,
  // ── Tables atteintes par une AIDE GÉNÉRIQUE (`.from(table)` avec le nom en
  //    argument) : invisibles à un balayage de `.from('nom')`, elles manquaient
  //    toutes à l'inventaire. Contrats/coûts, astreintes, contacts externes,
  //    entretiens, paie, rapport, registre RGPD.
  'absences_couts', 'absences_impact', 'admin_rgpd_registre',
  'admin_sauvegardes', 'astreintes_bareme', 'astreintes_cascade',
  'astreintes_consignes', 'astreintes_interventions', 'ce_besoins',
  'ce_diffusions', 'ce_dispos', 'ce_evaluations',
  'ce_missions', 'ce_pieces', 'paie_bulletin_statuts',
  'paie_periodes', 'rapport_suivi'
];

// ─── Lecture d'une table, paginée et tolérante ────────────────────────────
// Tolérante : une table peut ne pas exister sur une installation donnée
// (migration non jouée). On le signale au lieu d'interrompre tout l'export.
async function _revLireTable(table) {
  try {
    if (typeof sbFetchAll === 'function') {
      // ORDRE STABLE obligatoire : sbFetchAll pagine par 1000 lignes, et sans
      // tri PostgreSQL ne garantit aucun ordre entre deux pages — une ligne
      // pouvait être exportée deux fois et une autre jamais, en silence, sur
      // les tables volumineuses (présences, journal, transmissions, pointages).
      const lignes = await sbFetchAll(() => supabaseClient.from(table).select('*').order('id'));
      return { ok: true, lignes: lignes || [] };
    }
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) throw error;
    return { ok: true, lignes: data || [] };
  } catch (e) {
    const msg = (e && (e.message || e.code)) || 'erreur';
    const absente = /does not exist|schema cache|42P01|PGRST205/i.test(String(msg));
    return { ok: false, absente, message: String(msg), lignes: [] };
  }
}

// ─── Export intégral ──────────────────────────────────────────────────────
async function revExporter(format) {
  if (typeof supabaseClient === 'undefined') {
    if (typeof toast === 'function') toast('Connexion aux données indisponible', 'error');
    return;
  }
  const btnZone = document.getElementById('revEtat');
  const majEtat = h => { if (btnZone) btnZone.innerHTML = h; };

  const donnees = {}, rapport = [];
  let total = 0;

  for (let i = 0; i < REV_TABLES.length; i++) {
    const table = REV_TABLES[i];
    majEtat(`<div class="rev-prog-l">${i + 1} / ${REV_TABLES.length} — ${escHtml(table)}</div>
      <div class="rev-prog"><i style="width:${Math.round(((i + 1) / REV_TABLES.length) * 100)}%"></i></div>`);
    const r = await _revLireTable(table);
    if (r.ok) {
      donnees[table] = r.lignes;
      total += r.lignes.length;
      rapport.push({ table, lignes: r.lignes.length, etat: 'ok' });
    } else {
      rapport.push({ table, lignes: 0, etat: r.absente ? 'table absente' : 'erreur : ' + r.message });
    }
  }

  const etab = (typeof getCurrentEtab === 'function' && getCurrentEtab()) || {};
  const manifeste = {
    application: 'INTERNALIS',
    objet: "Export de réversibilité — article 28.3.g du RGPD",
    etablissement: etab.nom || '',
    genereLe: new Date().toISOString(),
    generePar: (() => { const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      return s ? ([s.prenom, s.nom].filter(Boolean).join(' ') || s.username) : ''; })(),
    nbTables: REV_TABLES.length,
    nbTablesExportees: rapport.filter(r => r.etat === 'ok').length,
    nbEnregistrements: total,
    detail: rapport,
    note: "Les pièces jointes (bucket « justificatifs ») ne sont pas incluses dans ce fichier : elles font l'objet d'une remise séparée."
  };

  if (format === 'csv') _revZipCSV(donnees, manifeste);
  else _revTelecharger(JSON.stringify({ _manifeste: manifeste, donnees }, null, 2),
    `internalis-reversibilite-${today()}.json`, 'application/json');

  if (typeof auditLog === 'function') {
    auditLog('export', `Export de réversibilité — ${total} enregistrement(s) sur ${manifeste.nbTablesExportees} table(s)`);
  }

  const manquantes = rapport.filter(r => r.etat !== 'ok');
  majEtat(`
    <div class="rev-bilan">
      <div class="rev-b ok"><b>${manifeste.nbTablesExportees}</b><span>tables exportées</span></div>
      <div class="rev-b"><b>${total.toLocaleString('fr-FR')}</b><span>enregistrements</span></div>
      <div class="rev-b ${manquantes.length ? 'ko' : ''}"><b>${manquantes.length}</b><span>non lues</span></div>
    </div>
    ${manquantes.length ? `<details class="rev-det"><summary>Tables non exportées</summary>
      <ul>${manquantes.map(m => `<li>${escHtml(m.table)} — ${escHtml(m.etat)}</li>`).join('')}</ul>
      <p style="margin:8px 0 0;font-size:11.5px">« Table absente » est normal si la migration correspondante n'a pas été jouée sur cette installation.</p>
    </details>` : ''}`);
  if (typeof toast === 'function') toast(`Export terminé — ${total} enregistrement(s)`, 'success');
}

// ─── Sortie CSV (une feuille par table, dans un fichier texte unique) ──────
// Sans bibliothèque externe : on produit un seul fichier lisible par Excel,
// chaque table précédée de son nom. Le JSON reste le format de référence.
function _revZipCSV(donnees, manifeste) {
  const morceaux = ['﻿'];   // BOM : Excel ouvre l'UTF-8 correctement
  morceaux.push(`# ${manifeste.objet}\r\n# ${manifeste.etablissement} — ${manifeste.genereLe}\r\n\r\n`);
  Object.keys(donnees).forEach(table => {
    const lignes = donnees[table];
    morceaux.push(`\r\n### ${table} (${lignes.length})\r\n`);
    if (!lignes.length) return;
    const colonnes = [...new Set(lignes.flatMap(l => Object.keys(l)))];
    const ech = v => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    morceaux.push(colonnes.join(';') + '\r\n');
    lignes.forEach(l => morceaux.push(colonnes.map(c => ech(l[c])).join(';') + '\r\n'));
  });
  _revTelecharger(morceaux.join(''), `internalis-reversibilite-${today()}.csv`, 'text/csv;charset=utf-8');
}

function _revTelecharger(contenu, nom, type) {
  const blob = new Blob([contenu], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ─── Contrôle d'exhaustivité ──────────────────────────────────────────────
// Compare l'inventaire REV_TABLES aux tables réellement interrogées par le
// code de l'application. Sert de garde-fou : si une nouvelle table est
// ajoutée au produit sans être déclarée ici, l'écart devient visible.
function revAudit() {
  const el = document.getElementById('revEtat');
  const utilisees = new Set();
  // On ne peut pas relire les sources depuis le navigateur : on s'appuie sur
  // les adaptateurs chargés, qui exposent leurs tables via leur code source.
  Object.keys(window).forEach(k => {
    if (typeof window[k] !== 'function' || !/^sb(Get|Save|Delete)/.test(k)) return;
    const src = String(window[k]);
    (src.match(/\.from\('([a-z_]+)'\)/g) || []).forEach(m => {
      const t = m.replace(/\.from\('|'\)/g, '');
      if (t !== 'justificatifs') utilisees.add(t);
    });
  });
  const declarees = new Set(REV_TABLES);
  const oubliees = [...utilisees].filter(t => !declarees.has(t)).sort();
  if (el) {
    el.innerHTML = oubliees.length
      ? `<div class="rev-alerte"><b>${oubliees.length} table(s) non déclarée(s)</b> dans l'inventaire de réversibilité :
         <br>${oubliees.map(escHtml).join(', ')}
         <br><span style="font-size:11.5px">Ajoutez-les à REV_TABLES (js/reversibilite.js), sinon elles ne seront pas restituées.</span></div>`
      : `<div class="rev-ok">Aucun écart détecté sur les ${declarees.size} tables déclarées.
         <br><span style="font-size:11.5px">Ce contrôle ne voit que les tables dont le nom est écrit en toutes
         lettres dans les adaptateurs chargés. Celles atteintes par une aide générique
         (<code>.from(table)</code>) lui échappent : il ne peut produire que des faux négatifs.
         Le contrôle exhaustif se fait sur les sources, avant livraison.</span></div>`;
  }
  return oubliees;
}

// Le nombre de tables affiché dans l'écran vient de l'inventaire lui-même :
// il ne peut pas se désynchroniser si on ajoute une table à REV_TABLES.
document.addEventListener('DOMContentLoaded', () => {
  const n = document.getElementById('revNb');
  if (n) n.textContent = String(REV_TABLES.length);
});

window.revExporter = revExporter;
window.revAudit = revAudit;
window.REV_TABLES = REV_TABLES;
