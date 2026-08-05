// ══════════════════════════════════════════════════════════════════════════
// PURGE & RÉTENTION — application des durées de conservation (art. 5.1.e RGPD)
//
// Ce module NE SUPPRIME JAMAIS TOUT SEUL. Il répond à trois questions :
//   1. Qu'est-ce qui a dépassé sa durée de conservation ?
//   2. Combien de données cela représente-t-il, table par table ?
//   3. Après une suppression validée, reste-t-il des lignes orphelines ?
//
// Pourquoi pas d'automatisme : les durées du registre dépendent de décisions
// humaines (fin d'accompagnement, archivage légal, pièces salariales à durées
// différentes). Une purge silencieuse de données de santé détruirait des
// dossiers encore utiles sans que personne ne s'en aperçoive. Le RGPD exige
// que la purge ait lieu, pas qu'elle soit aveugle.
//
// Pourquoi le contrôle d'orphelins : sbDeleteResident() / sbDeleteEmploye()
// ne suppriment QUE la ligne principale et comptent sur les cascades déclarées
// en base (ON DELETE CASCADE). Si une cascade manque, la suppression laisse
// des transmissions, des prises de médicaments ou des fiches de paie derrière
// elle — une purge ratée qui a l'air réussie. Après chaque suppression on
// recompte donc les lignes qui référencent encore l'identifiant, et on le dit.
// ══════════════════════════════════════════════════════════════════════════

// Durées par défaut, en années. Modifiables dans l'écran, stockées dans app_config.
const PRG_DEFAUTS = { resident: 3, employe: 5 };
const PRG_CLES = { resident: 'retention_resident_ans', employe: 'retention_employe_ans' };
// Journal d'audit : en MOIS, pas en années. Décision du responsable de
// traitement (août 2026) = 6 mois. La purge est aussi planifiée côté base
// (migration-audit-retention.sql) ; l'écran sert à la contrôler et à la forcer.
const PRG_AUDIT_DEFAUT = 6;
const PRG_CLE_AUDIT = 'retention_audit_mois';

let PRG = { durees: { ...PRG_DEFAUTS }, auditMois: PRG_AUDIT_DEFAUT, candidats: null, alerte: '' };

const _prg = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
const _prgToday = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);

// Date d'échéance : date de référence + N années. Renvoie '' si la date de
// référence manque — sans elle, aucune échéance ne peut être calculée.
function _prgEcheance(dateRef, ans) {
  if (!dateRef) return '';
  const d = new Date(String(dateRef).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return '';
  d.setFullYear(d.getFullYear() + Number(ans || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _prgAnnees(depuis) {
  if (!depuis) return null;
  const d = new Date(String(depuis).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return null;
  return (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}

// ─── Durées ───────────────────────────────────────────────────────────────
async function prgChargerDurees() {
  try {
    if (typeof sbGetAppConfig !== 'function') return;
    const cfg = await sbGetAppConfig();
    const n = (v, def) => { const x = parseInt(v, 10); return Number.isFinite(x) && x >= 0 ? x : def; };
    PRG.durees = {
      resident: n(cfg[PRG_CLES.resident], PRG_DEFAUTS.resident),
      employe:  n(cfg[PRG_CLES.employe],  PRG_DEFAUTS.employe)
    };
    PRG.auditMois = n(cfg[PRG_CLE_AUDIT], PRG_AUDIT_DEFAUT);
  } catch (e) { console.warn('[purge] durées', e); }
  const a = document.getElementById('prgAnsResident');
  const b = document.getElementById('prgAnsEmploye');
  const c = document.getElementById('prgMoisAudit');
  if (a) a.value = PRG.durees.resident;
  if (b) b.value = PRG.durees.employe;
  if (c) c.value = PRG.auditMois;
  prgEtatAudit();
}

async function prgSauverDurees() {
  const a = parseInt(document.getElementById('prgAnsResident')?.value, 10);
  const b = parseInt(document.getElementById('prgAnsEmploye')?.value, 10);
  const c = parseInt(document.getElementById('prgMoisAudit')?.value, 10);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
    if (typeof toast === 'function') toast('Durées invalides', 'error');
    return;
  }
  // Un journal d'audit conservé moins d'un mois ne permet plus de reconstituer
  // un incident ; au-delà d'un an on sort de la recommandation usuelle.
  if (!Number.isFinite(c) || c < 1 || c > 24) {
    if (typeof toast === 'function') toast("Durée du journal d'audit : entre 1 et 24 mois", 'error');
    return;
  }
  PRG.durees = { resident: a, employe: b };
  PRG.auditMois = c;
  try {
    if (typeof sbSaveAppConfig === 'function') {
      await sbSaveAppConfig(PRG_CLES.resident, String(a));
      await sbSaveAppConfig(PRG_CLES.employe, String(b));
      await sbSaveAppConfig(PRG_CLE_AUDIT, String(c));
    }
    if (typeof auditLog === 'function') auditLog('config', `Durées de conservation : résident ${a} an(s), salarié ${b} an(s), journal d'audit ${c} mois`);
    if (typeof toast === 'function') toast('Durées enregistrées', 'success');
  } catch (e) { console.error('[purge] sauvegarde', e); if (typeof toast === 'function') toast('Erreur d\'enregistrement', 'error'); }
  PRG.candidats = null;
  prgRendre();
  prgEtatAudit();
}

// ─── Journal d'audit ──────────────────────────────────────────────────────
// Compte ce qui a dépassé la durée, sans rien supprimer.
async function prgEtatAudit() {
  const el = document.getElementById('prgAuditEtat');
  if (!el) return;
  const mois = PRG.auditMois;
  if (typeof sbCompterAuditPerime !== 'function') {
    el.innerHTML = '<span class="prg-attente">Comptage indisponible.</span>';
    return;
  }
  el.innerHTML = '<span class="prg-attente">Comptage…</span>';
  try {
    const n = await sbCompterAuditPerime(mois);
    el.innerHTML = n
      ? `<div class="prg-bandeau">${n} entrée(s) du journal d'audit ont dépassé ${mois} mois et doivent être supprimées.
         <button type="button" class="v2-btn v2-btn-sm" onclick="prgPurgerAudit()">Purger maintenant</button></div>`
      : `<div class="prg-ok">Aucune entrée du journal d'audit ne dépasse ${mois} mois.</div>`;
  } catch (e) {
    console.error('[purge] audit', e);
    el.innerHTML = `<div class="prg-note">Comptage impossible — la lecture du journal a échoué.</div>`;
  }
}

async function prgPurgerAudit() {
  const mois = PRG.auditMois;
  if (!confirm(`Supprimer définitivement les entrées du journal d'audit antérieures à ${mois} mois ?\n\nCette action est irréversible. Exportez le journal avant si vous devez en garder une trace.`)) return;
  try {
    // Sans politique RLS de suppression, PostgREST répond 200 avec un tableau
    // vide : la purge ne supprimerait rien SANS lever d'erreur. On compare donc
    // au nombre attendu plutôt que d'annoncer une réussite sur un silence.
    const attendu = await sbCompterAuditPerime(mois);
    const n = await sbPurgerAudit(mois);
    if (attendu > 0 && n === 0) {
      if (typeof toast === 'function') toast('Aucune ligne supprimée : la base a refusé la suppression (politique RLS). Voir migration-audit-retention.sql §3 bis.', 'error');
      prgEtatAudit();
      return;
    }
    // Tracé APRÈS la suppression : l'entrée est postérieure à la limite, elle
    // survit donc à sa propre purge et laisse la preuve de l'opération.
    if (typeof auditLog === 'function') auditLog('rgpd', `Purge du journal d'audit — ${n} entrée(s) de plus de ${mois} mois supprimées`);
    if (typeof toast === 'function') toast(`${n} entrée(s) supprimée(s)`, 'success');
  } catch (e) {
    console.error('[purge] audit', e);
    if (typeof toast === 'function') toast('Purge impossible : ' + (e?.message || e), 'error');
  }
  prgEtatAudit();
}

// ─── Comptage des données liées ───────────────────────────────────────────
// On sonde chaque table de l'inventaire de réversibilité avec la colonne de
// rattachement. Une table qui n'a pas cette colonne renvoie une erreur : on
// l'ignore. Aucune liste à maintenir, donc rien à oublier quand le schéma bouge.
async function prgVolume(colonne, id) {
  const tables = (typeof REV_TABLES !== 'undefined') ? REV_TABLES : [];
  const detail = [];
  let total = 0;
  await Promise.all(tables.map(async t => {
    try {
      const { count, error } = await supabaseClient
        .from(t).select('id', { count: 'exact', head: true }).eq(colonne, id);
      if (error) return;                       // colonne absente de cette table
      if (count) { detail.push({ table: t, n: count }); total += count; }
    } catch (_) { /* table ou colonne absente : sans objet */ }
  }));
  detail.sort((a, b) => b.n - a.n);
  return { total, detail };
}

// ─── Fichiers du coffre rattachés à un dossier ────────────────────────────
// La cascade en base supprime les LIGNES qui portent le chemin d'un fichier,
// mais pas le FICHIER lui-même : notifications MDPH, comptes rendus, bulletins
// de paie restaient dans le bucket, orphelins et introuvables, alors que
// l'établissement croyait avoir honoré son obligation d'effacement.
// On ne sonde que les tables dont prgVolume() a déjà trouvé des lignes.
const PRG_COLS_FICHIER = ['fichier_path', 'justificatif_path', 'document_path'];

async function prgFichiers(colonne, id, tables) {
  const chemins = new Set();
  await Promise.all((tables || []).map(async t => {
    await Promise.all(PRG_COLS_FICHIER.map(async col => {
      try {
        const { data, error } = await supabaseClient
          .from(t).select(col).eq(colonne, id).not(col, 'is', null);
        if (error) return;                       // colonne absente de cette table
        (data || []).forEach(r => { if (r[col]) chemins.add(r[col]); });
      } catch (_) { /* sans objet */ }
    }));
  }));
  return [...chemins];
}

// ─── Analyse ──────────────────────────────────────────────────────────────
async function prgAnalyser(garderAlerte) {
  if (!garderAlerte) PRG.alerte = '';
  const el = document.getElementById('prgResultat');
  if (el) el.innerHTML = '<div class="prg-attente">Analyse en cours…</div>';
  const t = _prgToday();
  const res = { residents: [], employes: [], sansDate: { residents: 0, employes: 0 } };

  try {
    // ── Résidents sortis ──
    const residents = (typeof sbGetResidents === 'function') ? await sbGetResidents() : [];
    residents.filter(r => r.statut === 'sorti').forEach(r => {
      if (!r.dateSortie) { res.sansDate.residents++; return; }
      const ech = _prgEcheance(r.dateSortie, PRG.durees.resident);
      if (ech && ech <= t) res.residents.push({
        id: r.id, nom: [r.prenom, r.nom].filter(Boolean).join(' ') || '—',
        depuis: r.dateSortie, echeance: ech, ans: _prgAnnees(r.dateSortie)
      });
    });

    // ── Salariés partis ──
    // employes ne stocke PAS de date de départ : on prend la fin du dernier
    // contrat comme date de référence. Un salarié inactif sans contrat daté
    // est comptabilisé à part — il ne peut pas être purgé sans décision.
    const employes = (typeof sbGetEmployes === 'function') ? await sbGetEmployes() : [];
    const contrats = (typeof sbGetContrats === 'function') ? await sbGetContrats() : [];
    const finPar = {};
    (contrats || []).forEach(c => {
      if (!c.fin) return;
      const k = String(c.employeId);
      if (!finPar[k] || c.fin > finPar[k]) finPar[k] = c.fin;
    });
    (employes || []).filter(e => (e.statut || 'actif') !== 'actif').forEach(e => {
      const fin = finPar[String(e.id)];
      if (!fin) { res.sansDate.employes++; return; }
      const ech = _prgEcheance(fin, PRG.durees.employe);
      if (ech && ech <= t) res.employes.push({
        id: e.id, nom: [e.prenom, e.nom].filter(Boolean).join(' ') || '—',
        depuis: fin, echeance: ech, ans: _prgAnnees(fin)
      });
    });
  } catch (e) {
    console.error('[purge] analyse', e);
    if (el) el.innerHTML = '<div class="prg-alerte">Analyse impossible : ' + _prg(e.message || e) + '</div>';
    return;
  }

  // Volume lié, en parallèle pour tous les candidats.
  await Promise.all([
    ...res.residents.map(async c => { Object.assign(c, await prgVolume('resident_id', c.id)); }),
    ...res.employes.map(async c => { Object.assign(c, await prgVolume('employe_id', c.id)); })
  ]);

  PRG.candidats = res;
  if (typeof auditLog === 'function') {
    auditLog('rgpd', `Analyse de rétention : ${res.residents.length} dossier(s) résident et ${res.employes.length} dossier(s) salarié arrivés à échéance`);
  }
  prgRendre();
}

// ─── Suppression d'un dossier, sur validation explicite ───────────────────
// Le nom n'est PAS passé par l'attribut onclick : escHtml() rend &#39; pour
// l'apostrophe, que le parseur HTML redécode avant le parseur JS — « N'Diaye »
// cassait la chaîne et rendait le bouton inerte (cf. js/app.js:1085). On le
// relit dans l'état, qui vient d'être calculé par le rendu.
async function prgSupprimer(type, id) {
  const cle = type === 'resident' ? 'residents' : 'employes';
  const fiche = ((PRG.candidats && PRG.candidats[cle]) || []).find(x => String(x.id) === String(id));
  const nom = (fiche && fiche.nom) || '—';
  const libelle = type === 'resident' ? 'du résident' : 'du salarié';
  const msg = `Supprimer définitivement le dossier ${libelle} ${nom} ?\n\n`
    + `Cette action est IRRÉVERSIBLE et supprime aussi les données rattachées `
    + `(transmissions, journal, documents, plannings…).\n\n`
    + `Assurez-vous d'avoir exporté les données auparavant (Restitution intégrale).`;
  if (!confirm(msg)) return;

  const colonne = type === 'resident' ? 'resident_id' : 'employe_id';
  const avant = await prgVolume(colonne, id);
  // Relevé AVANT la suppression : après, les lignes qui portent les chemins
  // ont disparu avec la cascade et les fichiers seraient introuvables.
  const fichiers = await prgFichiers(colonne, id, avant.detail.map(d => d.table));

  try {
    if (type === 'resident') {
      if (typeof sbDeleteResident !== 'function') throw new Error('suppression indisponible');
      await sbDeleteResident(id);
    } else {
      if (typeof sbDeleteEmploye !== 'function') throw new Error('suppression indisponible');
      await sbDeleteEmploye(id);
    }
  } catch (e) {
    console.error('[purge] suppression', e);
    if (typeof toast === 'function') toast('Suppression impossible : ' + (e.message || e), 'error');
    return;
  }

  // Effacement des pièces du coffre. Chaque échec est retenu : on ne peut pas
  // annoncer un dossier purgé s'il reste des documents de santé dans le bucket.
  const echecs = [];
  for (const chemin of fichiers) {
    try {
      if (typeof sbDeleteJustificatif === 'function') await sbDeleteJustificatif(chemin);
      else echecs.push(chemin);
    } catch (e) { console.error('[purge] fichier', chemin, e); echecs.push(chemin); }
  }

  // Vérification : les cascades ont-elles réellement nettoyé les tables liées ?
  const apres = await prgVolume(colonne, id);
  if (typeof auditLog === 'function') {
    auditLog('rgpd', `Purge ${libelle} ${nom} — ${avant.total} ligne(s) liée(s) avant, ${apres.total} après ; `
      + `${fichiers.length} fichier(s) du coffre, ${echecs.length} non supprimé(s)`);
  }

  if (echecs.length) {
    PRG.alerte = `<div class="prg-alerte"><b>Purge incomplète — ${echecs.length} fichier(s) subsiste(nt) dans le coffre</b><br>
       Dossier ${_prg(libelle)} ${_prg(nom)} : les lignes sont supprimées, mais ces pièces n'ont pas pu être effacées :
       ${echecs.map(c => _prg(c)).join(', ')}.
       <br><span style="font-size:11.5px">Cause probable : la policy de suppression du bucket exige que le premier
       dossier du chemin soit celui du compte connecté — un administrateur ne peut donc pas effacer une pièce
       déposée par un autre. Ces fichiers doivent être supprimés depuis la console Supabase.</span></div>`;
    if (typeof toast === 'function') toast(`${echecs.length} fichier(s) non supprimé(s) du coffre`, 'error');
  } else if (apres.total > 0) {
    PRG.alerte = `<div class="prg-alerte"><b>Purge incomplète — ${apres.total} ligne(s) subsiste(nt)</b><br>
       Dossier ${_prg(libelle)} ${_prg(nom)} : la ligne principale est supprimée, mais des données rattachées sont restées :
       ${apres.detail.map(d => _prg(d.table) + ' (' + d.n + ')').join(', ')}.
       <br><span style="font-size:11.5px">Cause probable : la contrainte <code>ON DELETE CASCADE</code> manque sur ces tables.
       Ces lignes doivent être supprimées en base avant de considérer la purge effectuée.</span></div>`;
    if (typeof toast === 'function') toast(`Purge incomplète : ${apres.total} ligne(s) restante(s)`, 'error');
  } else {
    PRG.alerte = '';
    if (typeof toast === 'function') toast(
      `Dossier supprimé — ${avant.total} ligne(s) et ${fichiers.length} fichier(s) effacé(s)`, 'success');
  }

  PRG.candidats = null;
  await prgAnalyser(true);   // true : ne pas effacer l'alerte qu'on vient de poser
}

// ─── Rendu ────────────────────────────────────────────────────────────────
function _prgLigne(type, c) {
  const retard = c.ans != null ? Math.floor(c.ans) : '?';
  return `<div class="prg-li">
    <div class="prg-li-b">
      <div class="prg-li-t">${_prg(c.nom)}</div>
      <div class="prg-li-s">${type === 'resident' ? 'sorti le' : 'fin de contrat le'} ${_prg(c.depuis)}
        · échéance ${_prg(c.echeance)} · <b>${retard} an(s)</b></div>
    </div>
    <div class="prg-li-n" title="Lignes rattachées à ce dossier dans la base">${(c.total ?? 0).toLocaleString('fr-FR')}<span>ligne(s)</span></div>
    <button type="button" class="v2-btn v2-btn-sm v2-btn-danger"
      onclick="prgSupprimer('${_prg(String(type))}','${_prg(String(c.id))}')">Supprimer</button>
  </div>`;
}

function prgRendre() {
  const el = document.getElementById('prgResultat');
  if (!el) return;
  const r = PRG.candidats;
  if (!r) { el.innerHTML = PRG.alerte + '<div class="prg-attente">Cliquez sur « Analyser » pour lister les dossiers arrivés à échéance.</div>'; return; }

  const total = r.residents.length + r.employes.length;
  const bloc = (titre, type, liste) => liste.length
    ? `<div class="prg-sec">${titre} — ${liste.length}</div>${liste.map(c => _prgLigne(type, c)).join('')}`
    : `<div class="prg-sec">${titre} — aucun</div>`;

  el.innerHTML = PRG.alerte
    + (total
      ? `<div class="prg-bandeau">${total} dossier(s) ont dépassé leur durée de conservation.
         Exportez-les avant suppression si vous devez en garder une trace.</div>`
      : `<div class="prg-ok">Aucun dossier n'a dépassé sa durée de conservation.</div>`)
    + bloc('Résidents sortis', 'resident', r.residents)
    + bloc('Salariés partis', 'employe', r.employes)
    + ((r.sansDate.residents || r.sansDate.employes)
      ? `<div class="prg-note"><b>Non évaluables</b> — ${r.sansDate.residents} résident(s) sorti(s) sans date de sortie
         et ${r.sansDate.employes} salarié(s) inactif(s) sans contrat daté. Sans date de référence, aucune échéance
         ne peut être calculée : ces dossiers demandent une décision manuelle.</div>`
      : '');
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('prgResultat')) { prgChargerDurees(); prgRendre(); }
});

window.prgAnalyser = prgAnalyser;
window.prgEtatAudit = prgEtatAudit;
window.prgPurgerAudit = prgPurgerAudit;
window.prgSauverDurees = prgSauverDurees;
window.prgSupprimer = prgSupprimer;
