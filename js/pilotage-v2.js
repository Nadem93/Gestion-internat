// ══════════════════════════════════════════════════════════════════════════
// PORTAIL V2 — reproduction de la maquette « Portail - refonte (bento) »
// Navigation latérale groupée et repliable, tuiles « Mon espace », accès
// rapides, Messages, Mes prochains créneaux, Mes documents, Mes demandes,
// « À ne pas oublier » et Mes compteurs.
//
// La liste des modules (PL_NAV), leurs droits (plAllowed) et la navigation
// interne (loadPage / showHome) restent définis dans pilotage.html : ce
// fichier ne fait que le rendu. Aucune couche Supabase existante n'est
// réécrite, on appelle les fonctions sb* déjà chargées par la page.
//
// Seule exception : les droits annuels de congés (table rh_droits_conges,
// apportés par la maquette — « 18 j sur 25 », « RTT 4 / 10 j ») n'avaient
// aucune source en base ; la couche d'accès est écrite ici, avec dégradation
// douce tant que migration-pilotage.sql n'a pas été exécuté.
// ══════════════════════════════════════════════════════════════════════════

const PL2 = { data: null, loading: false, tuto: null, unread: 0 };
const PILOTAGE_SQL_FILE = 'migration-pilotage.sql';

const _pl = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
const _plToday = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
const _plCall = async (fn, ...a) => {
  try { return (typeof window[fn] === 'function') ? await window[fn](...a) : null; }
  catch (e) { console.warn('[pl2]', fn, e); return null; }
};
// #rrggbb → rgba(...) pour les ombres colorées
function _plRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return `rgba(129,140,248,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const _plSvg = (d, c, sz) => `<svg width="${sz || 20}" height="${sz || 20}" viewBox="0 0 24 24" fill="none" `
  + `stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
// Le tracé des icônes de PL_NAV est un <svg> complet : on n'en garde que l'intérieur
const _plInner = s => String(s || '').replace(/^\s*<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');

const PL_MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
const PL_JOURS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const PL_AV_COLORS = ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#a855f7', '#14b8a6'];
function _plAvColor(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PL_AV_COLORS[h % PL_AV_COLORS.length];
}
function _plAdmin() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  return !!s && ['admin', 'superadmin'].includes(s.role);
}

// Icônes de la maquette
const PL_IC = {
  abs: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  pay: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
};

// ══════════════════════════════════════════════════════════════════════
// DROITS ANNUELS DE CONGÉS — table rh_droits_conges
// Dégradation douce : tant que migration-pilotage.sql n'a pas été exécuté,
// la lecture renvoie [] avec un console.warn (la page reste utilisable, les
// compteurs affichent seulement les jours pris) et l'écriture remonte une
// erreur nommant le fichier SQL.
// ══════════════════════════════════════════════════════════════════════

function _plDroitFromRow(r) {
  return {
    id: r.id,
    employeId: r.employe_id || '',
    annee: Number(r.annee) || 0,
    joursCp: Number(r.jours_cp) || 0,
    joursRtt: Number(r.jours_rtt) || 0
  };
}
function _plIsMissingTable(e) {
  const code = (e && e.code) || '';
  const msg = (e && e.message) || '';
  return code === '42P01' || code === 'PGRST205'
    || (/rh_droits_conges/i.test(msg) && /does not exist|schema cache/i.test(msg));
}

async function sbGetDroitsConges() {
  try {
    const { data, error } = await supabaseClient
      .from('rh_droits_conges').select('*').order('annee', { ascending: false });
    if (error) throw error;
    return (data || []).map(_plDroitFromRow);
  } catch (e) {
    console.warn(`[pl2] droits de congés illisibles (${PILOTAGE_SQL_FILE} exécuté ?)`, e);
    return [];
  }
}

async function sbSaveDroitsConges(d) {
  let etablissementId = null;
  try {
    etablissementId = (typeof sbGetEtablissementId === 'function')
      ? await sbGetEtablissementId() : null;
  } catch (e) {
    const w = new Error((e && e.message) || 'Session Supabase absente');
    w.plNoSession = true;
    throw w;
  }
  const row = {
    etablissement_id: etablissementId,
    employe_id: String(d.employeId),
    annee: Number(d.annee),
    jours_cp: Number(d.joursCp) || 0,
    jours_rtt: Number(d.joursRtt) || 0,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabaseClient
    .from('rh_droits_conges').upsert(row, { onConflict: 'employe_id,annee' }).select();
  if (error) { const w = new Error(error.message); w.plMissingTable = _plIsMissingTable(error); throw w; }
  return _plDroitFromRow(data[0]);
}

function _plDroitErr(e) {
  if (e && e.plMissingTable) {
    toast(`Droits annuels indisponibles : exécutez ${PILOTAGE_SQL_FILE} dans Supabase`, 'error');
  } else if (e && e.plNoSession) {
    toast('Session expirée : reconnectez-vous pour enregistrer', 'error');
  } else {
    toast('Enregistrement impossible', 'error');
  }
  console.error('[pl2] droits', e);
}

// ─── Entrée principale ────────────────────────────────────────────────────
function pl2Render() {
  const el = document.getElementById('plWelcome');
  if (el) el.innerHTML = pl2Body();
  if (!PL2.data && !PL2.loading) pl2Load();
}

function pl2Body() {
  return pl2Hello() + pl2Stats() + pl2Cards()
    + `<div class="pl-bento">${pl2BlkMessages()}${pl2BlkShifts()}</div>`
    + pl2BlkDocs()
    + `<div class="pl-bento">${pl2BlkDemandes()}${pl2BlkEcheances()}</div>`
    + pl2BlkCompteurs();
}

// Chargement des données réelles, puis re-rendu
async function pl2Load() {
  PL2.loading = true;
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const [employes, profiles, absences, conges, formations, paies,
    shifts, entretiens, messages, convs, droits] = await Promise.all([
    _plCall('sbGetEmployes'),
    _plCall('sbGetProfiles'),
    _plCall('sbGetAbsences'),
    _plCall('sbGetConges'),
    _plCall('sbGetFormations'),
    _plCall('sbGetFichesPaie'),
    _plCall('sbGetPeShifts'),
    _plCall('sbGetEntretiens'),
    _plCall('sbGetMessages'),
    _plCall('sbGetConversations'),
    sbGetDroitsConges()
  ]);
  const fiche = (employes || []).find(e => s && String(e.profileId) === String(s.userId)) || null;
  const docs = fiche ? (await _plCall('sbGetDocsEmploye', fiche.id)) : [];

  PL2.data = {
    fiche,
    employes: employes || [],
    profiles: profiles || [],
    absences: absences || [],
    conges: conges || [],
    formations: formations || [],
    paies: paies || [],
    shifts: shifts || [],
    entretiens: entretiens || [],
    messages: messages || [],
    convs: convs || {},
    docs: docs || [],
    droits: droits || []
  };
  PL2.loading = false;
  PL2.unread = _plUnread();
  const el = document.getElementById('plWelcome');
  if (el) el.innerHTML = pl2Body();
}

// ─── Chiffres dérivés des données réelles ─────────────────────────────────
function _plJours(dateStr) {
  const t = new Date(_plToday() + 'T00:00:00');
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  return Math.round((d - t) / 86400000);
}
function _plNbJours(debut, fin) {
  if (!debut || !fin) return 0;
  const a = new Date(String(debut).slice(0, 10) + 'T00:00:00');
  const b = new Date(String(fin).slice(0, 10) + 'T00:00:00');
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
function _plFrDate(d) {
  if (!d) return '';
  const x = new Date(String(d).slice(0, 10) + 'T00:00:00');
  return isNaN(x) ? '' : x.toLocaleDateString('fr-FR');
}
// Période d'un bulletin : « 2026-06 » → « juin 2026 »
function _plPeriode(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(p || ''));
  if (!m) return String(p || '');
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return isNaN(d) ? String(p) : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
function _plEchColor(j) {
  if (j <= 7) return '#ef4444';
  if (j <= 15) return '#f59e0b';
  if (j <= 30) return '#818cf8';
  return '#22d3ee';
}
// Vacation déduite de l'heure de début du créneau (donnée réelle du planning)
function _plVacation(debut) {
  const h = parseInt(String(debut || '').slice(0, 2), 10);
  if (isNaN(h)) return { l: 'Créneau', t: 'Service', c: '#818cf8' };
  if (h >= 21 || h < 6) return { l: 'Équipe de nuit', t: 'Nuit', c: '#6366f1' };
  if (h >= 14) return { l: 'Équipe du soir', t: 'Soir', c: '#0ea5e9' };
  return { l: 'Équipe de jour', t: 'Jour', c: '#f59e0b' };
}

// Mes objets : tout ce qui est rattaché à ma fiche salarié
function _plMine() {
  const D = PL2.data;
  if (!D || !D.fiche) return null;
  const id = String(D.fiche.id);
  const t = _plToday();
  const annee = new Date().getFullYear();
  const mois = t.slice(0, 7);

  const conges = D.conges.filter(c => String(c.employeId) === id);
  const absences = D.absences.filter(a => String(a.employeId) === id);
  const formations = D.formations.filter(f => (f.participants || []).map(String).includes(id));
  const paies = D.paies.filter(p => String(p.employeId) === id);
  const shifts = D.shifts.filter(x => String(x.employeId) === id && x.date >= t)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const entretiens = D.entretiens.filter(e => String(e.employeId) === id);
  const droit = D.droits.find(x => String(x.employeId) === id && x.annee === annee) || null;

  const prisType = ty => conges
    .filter(c => c.type === ty && c.statut === 'accepte' && String(c.debut).slice(0, 4) === String(annee))
    .reduce((n, c) => n + _plNbJours(c.debut, c.fin), 0);

  return {
    id, annee, mois, conges, absences, formations, paies, shifts, entretiens, droit,
    absMois: absences.filter(a => String(a.debut || '').slice(0, 7) === mois).length,
    formationsAVenir: formations
      .filter(f => (f.dateDebut || '') >= t && f.statut !== 'annulee')
      .sort((a, b) => String(a.dateDebut).localeCompare(String(b.dateDebut))),
    prisCp: prisType('cp'),
    prisRtt: prisType('rtt'),
    recupMins: (typeof peRecupMinutesForEmploye === 'function')
      ? peRecupMinutesForEmploye(D.shifts, D.fiche.id, D.fiche.heuresContrat)
      : null
  };
}

// ─── Messages : conversations qui me concernent ───────────────────────────
function _plMyConvs() {
  const D = PL2.data;
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  if (!D || !s) return [];
  const uid = String(s.userId);
  const nomDe = pid => {
    const p = (D.profiles || []).find(x => String(x.id) === String(pid));
    if (!p) return 'Utilisateur';
    return `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Utilisateur';
  };
  return Object.values(D.convs)
    .filter(c => (c.userIds || []).map(String).includes(uid))
    .map(c => {
      const msgs = D.messages.filter(m => m.convId === c.id)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const last = msgs[msgs.length - 1] || null;
      const autres = (c.userIds || []).map(String).filter(x => x !== uid);
      const unread = msgs.filter(m => String(m.from) !== uid
        && !(m.readBy || []).map(String).includes(uid)).length;
      return {
        id: c.id,
        titre: autres.length ? autres.map(nomDe).join(', ') : 'Note personnelle',
        avatarId: autres[0] || c.id,
        ini: (typeof initials === 'function' && autres.length)
          ? (() => {
            const p = (D.profiles || []).find(x => String(x.id) === String(autres[0]));
            return p ? initials(p.prenom || '', p.nom || '') : '?';
          })()
          : '·',
        preview: last ? String(last.body || '').replace(/\s+/g, ' ').trim() : '',
        date: last ? last.date : '',
        unread
      };
    })
    .filter(c => c.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function _plUnread() {
  return _plMyConvs().reduce((n, c) => n + c.unread, 0);
}

// ─── Blocs de contenu ─────────────────────────────────────────────────────
function pl2Hello() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const p = (s && (s.prenom || s.username) || '').trim();
  return `<div class="pl-hello">
    <h1>Bonjour${p ? ', ' + _pl(p) : ''}</h1>
    <div class="pl-hello-s">Retrouvez ici vos accès personnels et vos documents.</div>
  </div>`;
}

// Message affiché à la place des chiffres personnels quand le compte n'est
// relié à aucune fiche salarié (même règle que mes-conges.html).
function _plSansFiche() {
  return `Votre compte n'est pas encore relié à une fiche salarié. `
    + `Contactez votre administrateur (Admin → Employés → « Lier à cette fiche »).`;
}

function pl2Stats() {
  const D = PL2.data;
  const M = _plMine();
  const chargement = !D;
  const v = x => chargement ? '…' : (x == null ? '—' : String(x));

  let cpN = '—', cpS = 'Droits annuels non renseignés';
  if (M) {
    if (M.droit && M.droit.joursCp > 0) {
      cpN = `${Math.max(0, M.droit.joursCp - M.prisCp)} j`;
      cpS = `sur ${M.droit.joursCp} · année ${M.annee}`;
    } else {
      cpN = `${M.prisCp} j`;
      cpS = `pris en ${M.annee} · droits non renseignés`;
    }
  }

  const f0 = M && M.formationsAVenir[0];
  const paie0 = M && M.paies[0];

  const K = [
    { n: chargement ? '…' : (M ? cpN : '—'), l: 'Congés restants',
      s: M ? cpS : (chargement ? '' : 'Fiche salarié non reliée'),
      c: '#f59e0b', ic: PL_IC.cal, page: 'mes-conges.html', label: 'Mes congés' },
    { n: v(M && M.absMois), l: 'Absences', s: 'ce mois-ci',
      c: '#ef4444', ic: PL_IC.abs, page: 'mes-absences.html', label: 'Mes absences' },
    { n: v(M && M.formationsAVenir.length), l: 'Formations à venir',
      s: f0 ? `${_plFrDate(f0.dateDebut)} · ${f0.titre}` : (M ? 'aucune programmée' : ''),
      c: '#16a34a', ic: PL_IC.book, page: 'mes-formations.html', label: 'Mes formations' },
    { n: v(M && M.paies.length), l: 'Fiches de paie',
      s: paie0 ? `dernière : ${_plPeriode(paie0.periode)}` : (M ? 'aucune déposée' : ''),
      c: '#3b82f6', ic: PL_IC.pay, page: 'mes-fiches-paie.html', label: 'Mes fiches de paie' }
  ];
  return `<div class="pl-sec">Mon espace</div>
    <div class="pl-stats">${K.map(k => `<button type="button" class="pl-stat"
      data-page="${_pl(k.page)}" data-label="${_pl(k.label)}" aria-label="Ouvrir ${_pl(k.label)}"
      style="--plc:${k.c};--plc-sh:${_plRgba(k.c, .4)}">
      <span class="pl-stat-ic">${_plSvg(k.ic, 'currentColor', 21)}</span>
      <div class="pl-stat-n">${_pl(k.n)}</div>
      <div class="pl-stat-l">${_pl(k.l)}</div>
      <div class="pl-stat-s">${_pl(k.s)}</div>
    </button>`).join('')}</div>`;
}

// Sous-titre de tuile : chiffre réel du module, jamais une valeur inventée.
function pl2CardSub(page) {
  const D = PL2.data;
  const M = _plMine();
  if (!D) return '…';
  const p = (n, s, pl) => `${n} ${n > 1 ? (pl || (s + 's')) : s}`;
  switch (page) {
    case 'mes-absences.html': return M ? `${M.absMois} ce mois-ci` : 'Fiche non reliée';
    case 'mes-conges.html': return M ? p(M.conges.filter(c => c.statut === 'en_attente').length, 'demande en attente', 'demandes en attente') : 'Fiche non reliée';
    case 'mes-formations.html': return M ? p(M.formationsAVenir.length, 'à venir', 'à venir') : 'Fiche non reliée';
    case 'mes-fiches-paie.html': return M ? p(M.paies.length, 'bulletin') : 'Fiche non reliée';
    case 'planning-equipe.html': return M ? p(M.shifts.length, 'créneau à venir', 'créneaux à venir') : 'Planning de l’équipe';
    case 'messages.html': return PL2.unread ? `${PL2.unread} non lu${PL2.unread > 1 ? 's' : ''}` : 'Aucun message non lu';
    case 'notes.html': return 'Notes de service';
    case 'documentation.html': return 'Procédures & protocoles';
    case 'budget.html': return 'Enveloppes & dépenses';
    case 'facturation.html': return 'Factures & règlements';
    case 'rapport.html': return "Rapport d'activité annuel";
    case 'satisfaction.html': return 'Enquêtes résidents';
    case 'inventaire.html': return 'Matériel & équipements';
    default: return '';
  }
}

function pl2Cards() {
  const nav = (window.PL_NAV || []).filter(window.plAllowed || (() => true));
  const tuto = window.PORTAL_TUTO || {};
  return `<div class="pl-sec">Accès rapides</div>
    <div class="pl-cards">${nav.map(e => `
      <div class="pl-card" role="button" tabindex="0" data-page="${_pl(e.page)}" data-label="${_pl(e.label)}"
        aria-label="Ouvrir ${_pl(e.label)}" style="--plc:${_pl(e.c1)};--plc-sh:${_plRgba(e.c1, .4)}">
        ${tuto[e.page] ? `<button type="button" class="pl-card-i" data-tuto="${_pl(e.page)}"
          title="Mode d'emploi — ${_pl(e.label)}" aria-label="Mode d'emploi — ${_pl(e.label)}">?</button>` : ''}
        <span class="pl-card-ic">${_plSvg(_plInner(e.icon), 'currentColor', 22)}</span>
        <div class="pl-card-l">${_pl(e.label)}</div>
        <div class="pl-card-s">${_pl(pl2CardSub(e.page))}</div>
      </div>`).join('')}</div>`;
}

function _plBlkOpen(page, label) {
  const e = (window.PL_NAV || []).find(x => x.page === page);
  if (!e || !(window.plAllowed || (() => true))(e)) return '';
  return `<button type="button" class="pl-blk-a" data-open="${_pl(page)}" data-label="${_pl(label)}">${_pl(label)}</button>`;
}

function pl2BlkMessages() {
  const D = PL2.data;
  let body = `<div class="pl-vide">Chargement…</div>`;
  let compteur = '';
  if (D) {
    const convs = _plMyConvs();
    compteur = PL2.unread
      ? `<span class="pl-blk-c" style="--pc:#38bdf8">${PL2.unread} non lu${PL2.unread > 1 ? 's' : ''}</span>` : '';
    body = convs.length
      ? convs.slice(0, 3).map(c => `<div class="pl-msg" data-page="messages.html" data-label="Messages">
          <span class="pl-msg-av" style="background:${_plAvColor(c.avatarId)}">${_pl(c.ini)}</span>
          <div class="pl-msg-b"><div class="pl-msg-n">${_pl(c.titre)}</div>
            <div class="pl-msg-p">${_pl(c.preview)}</div></div>
          ${c.unread ? '<span class="pl-msg-dot"></span>' : ''}</div>`).join('')
      : `<div class="pl-vide">Aucune conversation.</div>`;
  }
  return `<div class="pl-blk"><div class="pl-blk-h">${_plSvg(PL_IC.mail, '#38bdf8', 15)}
    <span class="pl-blk-t">Messages</span>${compteur}${_plBlkOpen('messages.html', 'Messages')}
    </div>${body}</div>`;
}

function pl2BlkShifts() {
  const D = PL2.data;
  const M = _plMine();
  let body = `<div class="pl-vide">Chargement…</div>`;
  if (D) {
    if (!M) body = `<div class="pl-vide">${_plSansFiche()}</div>`;
    else if (!M.shifts.length) body = `<div class="pl-vide">Aucun créneau planifié à venir.</div>`;
    else body = M.shifts.slice(0, 4).map(s => {
      const d = new Date(String(s.date).slice(0, 10) + 'T00:00:00');
      const v = _plVacation(s.debut);
      const dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
      return `<div class="pl-sh" style="--pc:${v.c}">
        <div class="pl-sh-d"><div class="pl-sh-j">${PL_JOURS[d.getDay()]}</div>
          <div class="pl-sh-dt">${dd}</div></div>
        <div class="pl-sh-b"><div class="pl-sh-t">${_pl(v.l)}</div>
          <div class="pl-sh-h">${_pl(s.debut)} – ${_pl(s.fin)}</div></div>
        <span class="pl-sh-tag">${_pl(v.t)}</span></div>`;
    }).join('');
  }
  return `<div class="pl-blk"><div class="pl-blk-h">${_plSvg(PL_IC.cal, '#22d3ee', 15)}
    <span class="pl-blk-t">Mes prochains créneaux</span>${_plBlkOpen('planning-equipe.html', 'Planning équipe')}
    </div>${body}</div>`;
}

// Mes documents : documents transmis par les RH + bulletins de paie déposés
const PL_DOC_CAT = { contrat: 'Contrat', fiche: 'Fiche de poste', administratif: 'Administratif',
  formation: 'Formation', sanction: 'Sanction', autre: 'Autre' };
const PL_DOC_COL = { contrat: '#0891b2', fiche: '#8b5cf6', administratif: '#818cf8',
  formation: '#16a34a', sanction: '#ef4444', autre: '#7f93b3', paie: '#3b82f6' };
function _plSize(b) {
  if (!b) return '';
  if (b < 1024) return b + ' o';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' Ko';
  return (b / 1024 / 1024).toFixed(1) + ' Mo';
}
function pl2MesDocs() {
  const D = PL2.data;
  const M = _plMine();
  if (!D || !M) return [];
  const docs = D.docs.map(d => ({
    id: 'doc:' + d.id, path: d.fichierPath, name: d.name || d.fileName || 'Document',
    meta: [PL_DOC_CAT[d.category] || d.category || '—', _plFrDate(d.docDate), _plSize(d.size)]
      .filter(Boolean).join(' · '),
    c: PL_DOC_COL[d.category] || '#818cf8'
  }));
  const paies = M.paies.filter(p => p.fichierPath).map(p => ({
    id: 'paie:' + p.id, path: p.fichierPath,
    name: p.fichierNom || `Fiche de paie — ${_plPeriode(p.periode)}`,
    meta: `Paie · ${_plPeriode(p.periode)}`, c: PL_DOC_COL.paie
  }));
  return docs.concat(paies);
}
function pl2BlkDocs() {
  const D = PL2.data;
  const M = _plMine();
  let body = `<div class="pl-vide">Chargement…</div>`;
  if (D) {
    const list = pl2MesDocs();
    if (!M) body = `<div class="pl-vide">${_plSansFiche()}</div>`;
    else if (!list.length) body = `<div class="pl-vide">Aucun document transmis pour l'instant.</div>`;
    else body = `<div class="pl-docs">${list.slice(0, 8).map(d => `
      <div class="pl-doc" style="--pc:${d.c}">
        <span class="pl-doc-ic">${_plSvg(PL_IC.doc, 'currentColor', 15)}</span>
        <div class="pl-doc-b"><div class="pl-doc-n" title="${_pl(d.name)}">${_pl(d.name)}</div>
          <div class="pl-doc-m">${_pl(d.meta)}</div></div>
        <button type="button" class="pl-doc-dl" data-doc="${_pl(d.id)}"
          title="Télécharger ${_pl(d.name)}" aria-label="Télécharger ${_pl(d.name)}">
          ${_plSvg(PL_IC.dl, 'currentColor', 15)}</button>
      </div>`).join('')}</div>`;
  }
  return `<div class="pl-blk pl-blk-wide"><div class="pl-blk-h">${_plSvg(PL_IC.doc, '#a78bfa', 15)}
    <span class="pl-blk-t">Mes documents</span>${_plBlkOpen('mes-fiches-paie.html', 'Mes fiches de paie')}
    </div>${body}</div>`;
}

const PL_CG_TYPE = { cp: 'Congés payés', rtt: 'RTT', maladie: 'Arrêt maladie',
  enfant_malade: 'Enfant malade', formation: 'Formation', autre: 'Autre' };
const PL_CG_STATUT = { en_attente: { l: 'En attente', c: '#f59e0b' },
  accepte: { l: 'Validée', c: '#10b981' }, refuse: { l: 'Refusée', c: '#ef4444' } };
const PL_AB_TYPE = { maladie: 'Arrêt maladie', at: 'Accident du travail',
  enfant_malade: 'Enfant malade', maternite: 'Maternité', autre: 'Autre' };

function pl2Demandes() {
  const M = _plMine();
  if (!M) return [];
  const out = [];
  M.conges.forEach(c => {
    const st = PL_CG_STATUT[c.statut] || PL_CG_STATUT.en_attente;
    out.push({
      d: c.dateDemande || c.debut || '',
      label: `${PL_CG_TYPE[c.type] || c.type} — ${_plFrDate(c.debut)} au ${_plFrDate(c.fin)}`,
      sub: c.dateDemande ? `Déposée le ${_plFrDate(c.dateDemande)}` : `${_plNbJours(c.debut, c.fin)} jour(s)`,
      status: st.l, sc: st.c, c: c.type === 'rtt' ? '#818cf8' : '#f59e0b', ic: PL_IC.cal
    });
  });
  M.absences.forEach(a => out.push({
    d: a.debut || '',
    label: `Absence — ${PL_AB_TYPE[a.type] || a.type}`,
    sub: `${_plFrDate(a.debut)} · ${_plNbJours(a.debut, a.fin || a.debut)} jour(s)`,
    status: a.justifie ? 'Justifiée' : 'À justifier',
    sc: a.justifie ? '#10b981' : '#f59e0b', c: '#22d3ee', ic: PL_IC.abs
  }));
  M.formations.filter(f => f.statut !== 'realisee').forEach(f => out.push({
    d: f.dateDebut || '',
    label: `Formation — ${f.titre}`,
    sub: f.organisme ? `Organisme : ${f.organisme}` : 'Inscription enregistrée',
    status: f.statut === 'annulee' ? 'Annulée' : 'Inscrit',
    sc: f.statut === 'annulee' ? '#ef4444' : '#16a34a', c: '#16a34a', ic: PL_IC.book
  }));
  return out.sort((a, b) => String(b.d).localeCompare(String(a.d)));
}

function pl2BlkDemandes() {
  const D = PL2.data;
  const M = _plMine();
  let body = `<div class="pl-vide">Chargement…</div>`;
  if (D) {
    const list = pl2Demandes();
    if (!M) body = `<div class="pl-vide">${_plSansFiche()}</div>`;
    else if (!list.length) body = `<div class="pl-vide">Aucune demande enregistrée.</div>`;
    else body = list.slice(0, 4).map(r => `<div class="pl-rq" style="--pc:${r.c};--sc:${r.sc}">
      <span class="pl-rq-ic">${_plSvg(r.ic, 'currentColor', 15)}</span>
      <div class="pl-rq-b"><div class="pl-rq-l">${_pl(r.label)}</div>
        <div class="pl-rq-s">${_pl(r.sub)}</div></div>
      <span class="pl-rq-st">${_pl(r.status)}</span></div>`).join('');
  }
  return `<div class="pl-blk"><div class="pl-blk-h">${_plSvg(PL_IC.check, '#22d3ee', 15)}
    <span class="pl-blk-t">Mes demandes</span>
    <button type="button" class="pl-blk-a" data-open="mes-conges.html" data-label="Mes congés">
      ${_plSvg(PL_IC.plus, 'currentColor', 13)} Nouvelle</button>
    </div>${body}</div>`;
}

// « À ne pas oublier » : formations à venir, visite médicale du travail,
// entretien professionnel planifié — tous issus des tables existantes.
function pl2Echeances() {
  const M = _plMine();
  if (!M) return [];
  const t = _plToday();
  const out = [];
  M.formationsAVenir.forEach(f => out.push({
    date: f.dateDebut, title: f.titre || 'Formation',
    sub: [f.organisme, f.domaine].filter(Boolean).join(' · ') || 'Formation'
  }));
  M.absences.filter(a => a.visiteDate && !a.visiteFaite && a.visiteDate >= t).forEach(a => out.push({
    date: a.visiteDate, title: 'Visite médicale du travail',
    sub: `Suite à : ${PL_AB_TYPE[a.type] || a.type}`
  }));
  M.entretiens.filter(e => e.date && e.date >= t && e.statut !== 'realise').forEach(e => out.push({
    date: e.date, title: `Entretien ${e.type === 'annuel' ? 'annuel' : e.type}`,
    sub: e.evaluateur ? `avec ${e.evaluateur}` : 'Entretien professionnel'
  }));
  return out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function pl2BlkEcheances() {
  const D = PL2.data;
  const M = _plMine();
  let body = `<div class="pl-vide">Chargement…</div>`;
  if (D) {
    const list = pl2Echeances();
    if (!M) body = `<div class="pl-vide">${_plSansFiche()}</div>`;
    else if (!list.length) body = `<div class="pl-vide">Rien à signaler dans les semaines à venir.</div>`;
    else body = list.slice(0, 4).map(e => {
      const j = _plJours(e.date);
      const c = _plEchColor(j);
      const d = new Date(String(e.date).slice(0, 10) + 'T00:00:00');
      return `<div class="pl-ech" style="--pc:${c}">
        <div class="pl-ech-d"><span class="pl-ech-j">${d.getDate()}</span>
          <span class="pl-ech-m">${PL_MOIS[d.getMonth()]}</span></div>
        <div class="pl-ech-b"><div class="pl-ech-t">${_pl(e.title)}</div>
          <div class="pl-ech-s">${_pl(e.sub)}</div></div>
        <span class="pl-ech-l">${j === 0 ? "Aujourd'hui" : 'J-' + j}</span></div>`;
    }).join('');
  }
  return `<div class="pl-blk pl-blk-ech"><div class="pl-blk-h">${_plSvg(PL_IC.clock, '#fbbf24', 15)}
    <span class="pl-blk-t">À ne pas oublier</span></div>${body}</div>`;
}

// Mes compteurs — la jauge n'apparaît que si le droit annuel est connu :
// sans référentiel, on affiche les jours pris, jamais un solde inventé.
function pl2Compteurs() {
  const M = _plMine();
  if (!M) return [];
  const D = M.droit;
  const cpt = [
    { label: 'Congés payés', c: '#f59e0b',
      val: D && D.joursCp > 0 ? `${M.prisCp} / ${D.joursCp} j` : `${M.prisCp} j pris`,
      pct: D && D.joursCp > 0 ? Math.min(100, Math.round((M.prisCp / D.joursCp) * 100)) : null,
      sub: D && D.joursCp > 0
        ? `${Math.max(0, D.joursCp - M.prisCp)} jour(s) restant(s) en ${M.annee}`
        : `Droit annuel non renseigné (${PILOTAGE_SQL_FILE})` },
    { label: 'RTT', c: '#22d3ee',
      val: D && D.joursRtt > 0 ? `${M.prisRtt} / ${D.joursRtt} j` : `${M.prisRtt} j pris`,
      pct: D && D.joursRtt > 0 ? Math.min(100, Math.round((M.prisRtt / D.joursRtt) * 100)) : null,
      sub: D && D.joursRtt > 0
        ? `${Math.max(0, D.joursRtt - M.prisRtt)} jour(s) restant(s) en ${M.annee}`
        : `Droit annuel non renseigné (${PILOTAGE_SQL_FILE})` }
  ];
  if (M.recupMins != null && PL2.data.fiche) {
    const contratMins = (PL2.data.fiche.heuresContrat ?? 35) * 60;
    cpt.push({
      label: 'Heures de récup.', c: '#a855f7',
      val: (typeof peFormatRecup === 'function') ? peFormatRecup(M.recupMins)
        : `${Math.round(M.recupMins / 60)} h`,
      pct: contratMins ? Math.min(100, Math.round(Math.abs(M.recupMins) / contratMins * 100)) : null,
      sub: `Écart cumulé au planning · semaine contractuelle ${PL2.data.fiche.heuresContrat ?? 35} h`
    });
  }
  return cpt;
}

function pl2BlkCompteurs() {
  const D = PL2.data;
  const M = _plMine();
  let body = `<div class="pl-vide">Chargement…</div>`;
  if (D) {
    const list = pl2Compteurs();
    if (!M) body = `<div class="pl-vide">${_plSansFiche()}</div>`;
    else body = `<div class="pl-cpts">${list.map(c => `<div style="--pc:${c.c}">
      <div class="pl-cpt-h"><span class="pl-cpt-l">${_pl(c.label)}</span>
        <span class="pl-cpt-v">${_pl(c.val)}</span></div>
      ${c.pct == null ? '' : `<div class="v2-prog"><span style="width:${c.pct}%;background:${c.c}"></span></div>`}
      <div class="pl-cpt-s">${_pl(c.sub)}</div></div>`).join('')}</div>`;
  }
  return `<div class="pl-blk"><div class="pl-blk-h">${_plSvg(PL_IC.clock, '#a855f7', 15)}
    <span class="pl-blk-t">Mes compteurs</span>
    ${_plAdmin() ? `<button type="button" class="pl-blk-a" id="plDroitsBtn" onclick="pl2OpenDroits()">
      ${_plSvg(PL_IC.gear, 'currentColor', 13)} Droits annuels</button>` : ''}
    </div>${body}</div>`;
}

// ─── Téléchargement d'un document ─────────────────────────────────────────
async function plDocDownload(key) {
  const d = pl2MesDocs().find(x => x.id === key);
  if (!d || !d.path) { toast('Aucun fichier joint', 'error'); return; }
  const url = (typeof sbJustificatifUrl === 'function') ? await sbJustificatifUrl(d.path) : null;
  if (url) window.open(url, '_blank'); else toast('Document introuvable', 'error');
}

// ─── Droits annuels de congés (modale, gabarit v2) ────────────────────────
function pl2OpenDroits() {
  const D = PL2.data;
  const sel = document.getElementById('plDrEmp');
  if (sel) {
    const actifs = ((D && D.employes) || []).filter(e => e.statut !== 'inactif');
    sel.innerHTML = actifs.map(e =>
      `<option value="${_pl(e.id)}">${_pl(`${e.prenom || ''} ${e.nom || ''}`.trim())}</option>`).join('')
      || `<option value="">— Aucun salarié —</option>`;
    if (D && D.fiche) sel.value = String(D.fiche.id);
  }
  const an = document.getElementById('plDrAnnee');
  if (an) an.value = String(new Date().getFullYear());
  pl2SyncDroits();
  pl2RenderDroits();
  openModal('plDroitsOv');
}
function pl2CloseDroits() { closeModal('plDroitsOv'); }

// Pré-remplit CP/RTT avec la ligne existante du salarié et de l'année choisis
function pl2SyncDroits() {
  const D = PL2.data;
  const emp = (document.getElementById('plDrEmp') || {}).value || '';
  const an = Number((document.getElementById('plDrAnnee') || {}).value || 0);
  const row = ((D && D.droits) || []).find(x => String(x.employeId) === String(emp) && x.annee === an);
  const cp = document.getElementById('plDrCp');
  const rtt = document.getElementById('plDrRtt');
  if (cp) cp.value = row ? String(row.joursCp) : '';
  if (rtt) rtt.value = row ? String(row.joursRtt) : '';
}

function pl2RenderDroits() {
  const host = document.getElementById('plDroitsList');
  if (!host) return;
  const D = PL2.data;
  const rows = (D && D.droits) || [];
  const nom = id => {
    const e = ((D && D.employes) || []).find(x => String(x.id) === String(id));
    return e ? `${e.prenom || ''} ${e.nom || ''}`.trim() : 'Salarié';
  };
  host.innerHTML = rows.length ? rows.map(r => `<div class="pl-dr">
    <div class="pl-dr-b"><div class="pl-dr-t">${_pl(nom(r.employeId))} — ${r.annee}</div>
      <div class="pl-dr-s">${r.joursCp} j de congés payés · ${r.joursRtt} j de RTT</div></div>
  </div>`).join('')
    : `<div class="pl-vide">Aucun droit annuel enregistré. Renseignez-en un ci-dessous.</div>`;
}

async function pl2SaveDroits() {
  const emp = (document.getElementById('plDrEmp') || {}).value || '';
  const an = Number((document.getElementById('plDrAnnee') || {}).value || 0);
  const cp = Number((document.getElementById('plDrCp') || {}).value || 0);
  const rtt = Number((document.getElementById('plDrRtt') || {}).value || 0);
  if (!emp) { toast('Choisissez un salarié', 'error'); return; }
  if (!an || an < 2000 || an > 2100) { toast('Année invalide', 'error'); return; }
  const btn = document.getElementById('plDrSave');
  if (btn) btn.disabled = true;
  try {
    const saved = await sbSaveDroitsConges({ employeId: emp, annee: an, joursCp: cp, joursRtt: rtt });
    if (PL2.data) {
      PL2.data.droits = PL2.data.droits
        .filter(x => !(String(x.employeId) === String(emp) && x.annee === an))
        .concat([saved])
        .sort((a, b) => b.annee - a.annee);
    }
    pl2RenderDroits();
    toast('Droits annuels enregistrés');
    const el = document.getElementById('plWelcome');
    if (el) el.innerHTML = pl2Body();
  } catch (e) { _plDroitErr(e); }
  if (btn) btn.disabled = false;
}

// ─── Mode d'emploi d'un module (gabarit de modale v2) ─────────────────────
// La maquette ne montre pas ces textes, mais ils existaient sur la page V1
// (composant PortalTuto) : on les conserve, accessibles depuis le « ? ».
function pl2OpenTuto(page) {
  const e = (window.PL_NAV || []).find(x => x.page === page);
  const t = (window.PORTAL_TUTO || {})[page];
  const ov = document.getElementById('plTutoOv');
  if (!e || !t || !ov) return;
  const md = ov.querySelector('.v2-md');
  md.style.setProperty('--mc', e.c1);
  ov.querySelector('#plTutoIco').innerHTML = _plSvg(_plInner(e.icon), 'currentColor', 22);
  ov.querySelector('#plTutoT').textContent = e.label;
  ov.querySelector('#plTutoS').textContent = e.g;
  ov.querySelector('#plTutoB').innerHTML = `
    <div class="pl-tuto-p">${_pl(t.role || '')}</div>
    ${(t.mode && t.mode.length) ? `<div class="pl-tuto-box">
      <div class="pl-tuto-h"><span aria-hidden="true">🛠️</span> Mode d'emploi</div>
      <ol class="pl-tuto-ol">${t.mode.map(x => `<li>${_pl(x)}</li>`).join('')}</ol></div>` : ''}
    ${t.sync ? `<div class="pl-tuto-box"><div class="pl-tuto-h">🔗 Synchronisé avec</div>
      <div class="pl-tuto-p">${_pl(t.sync)}</div></div>` : ''}
    ${t.ex ? `<div class="pl-tuto-ex"><b>Exemple —</b> ${_pl(t.ex)}</div>` : ''}`;
  PL2.tuto = page;
  openModal('plTutoOv');
}
function pl2CloseTuto() { closeModal('plTutoOv'); PL2.tuto = null; }
function pl2OuvrirTuto() {
  const p = PL2.tuto;
  pl2CloseTuto();
  const e = (window.PL_NAV || []).find(x => x.page === p);
  if (e && typeof window.loadPage === 'function') window.loadPage(e.page, e.label);
}

// ─── Rafraîchissement du compteur de messages non lus ─────────────────────
async function pl2RefreshUnread() {
  if (!PL2.data) return;
  const [messages, convs] = await Promise.all([_plCall('sbGetMessages'), _plCall('sbGetConversations')]);
  if (messages) PL2.data.messages = messages;
  if (convs) PL2.data.convs = convs;
  const n = _plUnread();
  if (n === PL2.unread) return;
  PL2.unread = n;
  if (!window.plCurrentPage) {
    const el = document.getElementById('plWelcome');
    if (el) el.innerHTML = pl2Body();
  }
}

// ─── Interactions ─────────────────────────────────────────────────────────
document.addEventListener('click', ev => {
  const fold = ev.target.closest('#plSideFold');
  const info = ev.target.closest('.pl-card-i');
  if (info) { ev.stopPropagation(); pl2OpenTuto(info.dataset.tuto); return; }
  const dl = ev.target.closest('.pl-doc-dl');
  if (dl) { plDocDownload(dl.dataset.doc); return; }
  const lien = ev.target.closest('.pl-blk-a[data-open]');
  if (lien && typeof window.loadPage === 'function') {
    window.loadPage(lien.dataset.open, lien.dataset.label);
    return;
  }
  const it = ev.target.closest('.pl-it, .pl-card, .pl-stat, .pl-msg');
  if (it && it.dataset.page && typeof window.loadPage === 'function') {
    window.loadPage(it.dataset.page, it.dataset.label);
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    if (PL2.tuto) { pl2CloseTuto(); return; }
    const dv = document.getElementById('plDroitsOv');
    if (dv && dv.classList.contains('open')) { pl2CloseDroits(); return; }
  }
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const c = ev.target.closest && ev.target.closest('.pl-card');
  if (c && c.dataset.page && typeof window.loadPage === 'function') {
    ev.preventDefault();
    window.loadPage(c.dataset.page, c.dataset.label);
  }
});

window.addEventListener('focus', pl2RefreshUnread);
setInterval(pl2RefreshUnread, 30000);
