// ── JOURNAL D'AUDIT CENTRALISÉ (Supabase) ──
// Table public.audit_log (voir migration-fonctionnalites-v2.sql).
// Rend la traçabilité RGPD durable et partagée, là où auditLog() n'écrivait
// qu'en localStorage. Écriture « au mieux » : une panne ou une table absente
// ne doit jamais bloquer l'action de l'utilisateur.
// Prérequis chargés avant : supabase-client.js, residents-supabase.js (etab).
//
// ⚠️ SOURCE UNIQUE. Jusqu'en août 2026 les écrans (Administration, fiche
// salarié) lisaient la copie localStorage `ftr_audit_log` et non cette table :
// l'administrateur ne voyait donc que les gestes faits DEPUIS SON PROPRE
// NAVIGATEUR, et la table centrale n'était lue nulle part. Toute lecture du
// journal passe désormais par ce fichier.

// Durée de conservation du journal d'audit, en mois (art. 5.1.e RGPD).
// Décidée par le responsable de traitement — voir conformite/01-registre-traitements.md.
// La purge côté base est planifiée par migration-audit-retention.sql ; l'écran
// Administration → Données permet de la déclencher à la main et de la contrôler.
const AUDIT_RETENTION_MOIS = 6;

// Ligne de la table → forme historique utilisée par les écrans
// ({ date, user, … }), pour ne pas réécrire les rendus existants.
function _auditFromRow(r) {
  return {
    id:         r.id,
    date:       r.ts,                       // ISO complet, horodatage serveur
    userId:     r.user_id != null ? r.user_id : null,
    user:       r.user_name || '',
    role:       r.role || '',
    action:     r.action || '',
    details:    r.details || '',
    residentId: r.resident_id || null
  };
}

// Date limite de conservation, au format ISO complet (heure locale convertie
// par le moteur) : tout ce qui est antérieur est purgeable.
//
// setMonth() déborde : un 31 août moins 6 mois donne « 31 février », que le
// moteur reporte au 3 mars. La limite reculait donc de 3 jours et la purge
// détruisait des traces encore couvertes par la durée de conservation. On pose
// le jour 1 avant de changer de mois, puis on rétablit le jour en le bornant
// au dernier jour du mois d'arrivée.
function auditDateLimite(mois) {
  const d = new Date();
  const jour = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() - Number(mois || AUDIT_RETENTION_MOIS));
  const dernierJour = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, dernierJour));
  return d.toISOString();
}

// Écrit une entrée. `entry` = { action, details, residentId?, userId?, userName?, role? }.
// Renvoie une promesse qui ne rejette jamais (le journal est secondaire).
async function sbLogAudit(entry) {
  try {
    if (typeof supabaseClient === 'undefined') return null;
    const etab = (typeof sbGetEtablissementId === 'function') ? await sbGetEtablissementId() : null;
    if (!etab) return null;
    const row = {
      etablissement_id: String(etab),
      action:      entry.action || 'action',
      details:     entry.details || '',
      user_id:     entry.userId != null ? String(entry.userId) : null,
      user_name:   entry.userName || '',
      role:        entry.role || '',
      resident_id: entry.residentId || null
      // ts : défaut now() côté base
    };
    // Passe par le client → mutualisation + file d'attente hors-ligne. La trace
    // d'un geste fait sans réseau partira donc au retour de la connexion.
    const { error } = await supabaseClient.from('audit_log').insert(row);
    if (error) { console.warn('[audit] insert', error.message); return null; }
    return true;
  } catch (e) { console.warn('[audit]', e); return null; }
}

// Historique d'un dossier : les accès et écritures liés à un résident, du plus
// récent au plus ancien. RLS restreint déjà à l'établissement.
async function sbGetAuditForResident(residentId, max) {
  try {
    if (typeof supabaseClient === 'undefined' || !residentId) return [];
    const { data, error } = await supabaseClient
      .from('audit_log')
      .select('id,ts,user_name,role,action,details')
      .eq('resident_id', residentId)
      .order('ts', { ascending: false })
      .limit(max || 50);
    if (error) { console.warn('[audit] lecture dossier', error.message); return []; }
    return data || [];
  } catch (e) { console.warn('[audit]', e); return []; }
}

// ─── LECTURE DU JOURNAL ───────────────────────────────────────────────────
// Les trois fonctions ci-dessous LÈVENT en cas d'erreur, volontairement : un
// journal d'audit qui s'affiche vide alors que la lecture a échoué est pire
// que pas de journal du tout — l'écran doit pouvoir dire « indisponible ».

// Les N dernières entrées, de la plus récente à la plus ancienne.
async function sbGetAuditLog(max) {
  if (typeof supabaseClient === 'undefined') throw new Error('Supabase indisponible');
  const { data, error } = await supabaseClient
    .from('audit_log')
    .select('id,ts,user_id,user_name,role,action,details,resident_id')
    .order('ts', { ascending: false })
    .limit(max || 200);
  if (error) throw error;
  return (data || []).map(_auditFromRow);
}

// Journal complet pour l'export CSV. Pagination obligatoire : PostgREST
// tronque à 1000 lignes en silence, et un registre tronqué sans le dire est
// un faux document. `.order()` garantit une pagination stable.
async function sbGetAuditLogComplet() {
  if (typeof supabaseClient === 'undefined') throw new Error('Supabase indisponible');
  return (await sbFetchAll(() => supabaseClient
    .from('audit_log')
    .select('id,ts,user_id,user_name,role,action,details,resident_id')
    .order('ts', { ascending: false })
    .order('id', { ascending: false })
  )).map(_auditFromRow);
}

// Activité d'un salarié : ce qu'il a fait (user_name) ou ce qui le concerne
// (son nom cité dans le détail — congé validé, formation inscrite…).
async function sbGetAuditForUser(nom, max) {
  if (typeof supabaseClient === 'undefined') throw new Error('Supabase indisponible');
  const n = String(nom || '').trim();
  if (!n) return [];
  const { data, error } = await supabaseClient
    .from('audit_log')
    .select('id,ts,user_id,user_name,role,action,details,resident_id')
    .or(_auditFiltreUser(n))
    .order('ts', { ascending: false })
    .limit(max || 300);
  if (error) throw error;
  return (data || []).map(_auditFromRow);
}

// ─── CACHE POUR LES RENDUS SYNCHRONES ─────────────────────────────────────
// La fiche salarié se dessine en une passe synchrone (employe.html,
// js/employe-v2.js). On précharge donc l'activité du salarié avant le rendu,
// et les rendus lisent le cache. `ok` distingue « rien à afficher » de
// « la lecture a échoué » — un journal vide par erreur ne doit pas passer
// pour un salarié sans activité.
const AUDIT_LOT_SALARIE = 300;
let _auditCacheSalarie = { nom: null, rows: [], ok: false, total: 0, annee: 0, mois: 0 };

// Filtre commun à la liste et aux comptages, pour qu'ils ne puissent pas diverger.
function _auditFiltreUser(nom) {
  // Virgules, parenthèses et * séparent les termes d'un .or() PostgREST.
  const sr = String(nom).replace(/[(),*]/g, ' ');
  return `user_name.eq.${sr},details.ilike.*${sr}*`;
}

// Comptage exact, sans télécharger les lignes. `depuis` = instant ISO facultatif.
async function sbCompterAuditPourUser(nom, depuis) {
  if (typeof supabaseClient === 'undefined') throw new Error('Supabase indisponible');
  let q = supabaseClient.from('audit_log')
    .select('id', { count: 'exact', head: true })
    .or(_auditFiltreUser(nom));
  if (depuis) q = q.gte('ts', depuis);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function auditPrechargerSalarie(nom) {
  const n = String(nom || '').trim();
  _auditCacheSalarie = { nom: n, rows: [], ok: false, total: 0, annee: 0, mois: 0 };
  if (!n) return;
  try {
    // Les compteurs viennent de COMPTAGES exacts, pas de la longueur du lot :
    // la liste est plafonnée à 300 lignes, et afficher « Entrées totales 300 »
    // pour quelqu'un qui en a 1800 serait un chiffre faux sur une page RH.
    // Ici toISOString() est correct : on convertit une borne locale (1er du
    // mois à minuit, heure de France) en INSTANT, ce que compare `ts`.
    const d = new Date();
    const debutAnnee = new Date(d.getFullYear(), 0, 1).toISOString();
    const debutMois  = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const [rows, total, annee, mois] = await Promise.all([
      sbGetAuditForUser(n, AUDIT_LOT_SALARIE),
      sbCompterAuditPourUser(n),
      sbCompterAuditPourUser(n, debutAnnee),
      sbCompterAuditPourUser(n, debutMois)
    ]);
    _auditCacheSalarie = { nom: n, rows, ok: true, total, annee, mois };
  } catch (e) {
    console.error('[audit] activité salarié', e);
  }
}

// Compteurs exacts (et non la taille du lot affiché).
function auditSalarieCompteurs(nom) {
  const c = _auditCacheSalarie;
  return (c.nom === String(nom || '').trim() && c.ok)
    ? { total: c.total, annee: c.annee, mois: c.mois, tronque: c.total > c.rows.length }
    : { total: 0, annee: 0, mois: 0, tronque: false };
}

function auditSalarie(nom) {
  const n = String(nom || '').trim();
  return (_auditCacheSalarie.nom === n && _auditCacheSalarie.ok) ? _auditCacheSalarie.rows : [];
}

function auditSalarieOk(nom) {
  return _auditCacheSalarie.nom === String(nom || '').trim() && _auditCacheSalarie.ok;
}

// ─── PURGE (conservation limitée) ─────────────────────────────────────────
// Compte ce qui a dépassé la durée de conservation, sans rien supprimer.
async function sbCompterAuditPerime(mois) {
  if (typeof supabaseClient === 'undefined') throw new Error('Supabase indisponible');
  const { count, error } = await supabaseClient
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .lt('ts', auditDateLimite(mois));
  if (error) throw error;
  return count || 0;
}

// Supprime les entrées antérieures à la durée de conservation.
// Renvoie le nombre de lignes effectivement supprimées.
async function sbPurgerAudit(mois) {
  if (typeof supabaseClient === 'undefined') throw new Error('Supabase indisponible');
  const { data, error } = await supabaseClient
    .from('audit_log')
    .delete()
    .lt('ts', auditDateLimite(mois))
    .select('id');
  if (error) throw error;
  return (data || []).length;
}
