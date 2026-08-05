// ══════════════════════════════════════════════════════════════════════════
// RESSOURCES HUMAINES V2 — reproduction de la maquette
// « RH - refonte (bento) » : navigation latérale groupée, bandeau de KPI,
// tuiles « Modules RH », bento « À traiter / Effectif / Masse salariale /
// Anniversaires de contrat ».
//
// La liste des modules (RH_NAV), leurs droits (rhAllowed) et la navigation
// interne (loadPage / showHome) restent définis dans rh.html : ce fichier ne
// fait que le rendu. Aucune couche Supabase n'est réécrite, on appelle les
// fonctions sb* existantes.
//
// Données sensibles : la masse salariale et le module « Fiches de paie » ne
// sont chargés que si le compte a le droit access_paie (ou est admin) —
// exactement le même filtre que la navigation.
// ══════════════════════════════════════════════════════════════════════════

const RH2 = { data: null, loading: false, tuto: null };

const _rh = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
const _rhToday = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);

// Appel tolérant : table absente / fonction non chargée → [] + console.warn,
// la page reste utilisable.
const _rhCall = async (fn, ...a) => {
  try {
    if (typeof window[fn] !== 'function') { console.warn('[rh2] fonction absente :', fn); return null; }
    return await window[fn](...a);
  } catch (e) { console.warn('[rh2]', fn, e); return null; }
};

// #rrggbb → rgba(...) pour les ombres colorées
function _rhRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return `rgba(99,102,241,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const _rhSvg = (d, c, sz) => `<svg width="${sz || 20}" height="${sz || 20}" viewBox="0 0 24 24" fill="none" `
  + `stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// En-tête « Console Data » réutilisable : chip coloré + eyebrow mono + titre + pill facultatif
function _rhDcHead(c, iconD, eyebrow, title, pill) {
  return `<div class="dc-head"><div class="dc-head-l">
    <span class="dc-chip" style="background:${_rhRgba(c, .14)};color:${c}">${_rhSvg(iconD, c, 16)}</span>
    <div style="min-width:0"><div class="dc-eyebrow">${_rh(eyebrow)}</div><div class="dc-title">${_rh(title)}</div></div>
  </div>${pill || ''}</div>`;
}

// Icônes de la maquette
const RH_IC = {
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  etp: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  euro: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
};

// Palette des barres « Effectif par métier » (ordre de la maquette)
const RH_BAR_C = ['#6366f1', '#0891b2', '#7c3aed', '#ec4899', '#f59e0b', '#16a34a', '#ea580c', '#22d3ee'];
// Palette des pastilles « Anniversaires de contrat »
const RH_AV_C = ['#ec4899', '#22d3ee', '#818cf8', '#f59e0b', '#5eead4', '#a5b4fc'];

const RH_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const RH_MOIS_CT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const RH_CT_TYPE = { cdi: 'CDI', cdd: 'CDD', stage: 'Stage', apprentissage: 'Apprentissage', interim: 'Intérim' };

// ─── Utilitaires de date ──────────────────────────────────────────────────
function _rhJours(iso) {                      // jours entre aujourd'hui et iso (>0 = à venir)
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  const t = new Date(_rhToday() + 'T00:00:00');
  return Math.round((d - t) / 86400000);
}
function _rhDateCourte(iso) {                 // 2026-08-05 → « 05 août »
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '';
  return String(d.getDate()).padStart(2, '0') + ' ' + RH_MOIS[d.getMonth()];
}
function _rhEuro(n) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' €';
}
function _rhInitiales(prenom, nom) {
  if (typeof initials === 'function') return initials(prenom, nom);
  return ((prenom || '').charAt(0) + (nom || '').charAt(0)).toUpperCase() || '??';
}
const _rhNomCourt = e => `${(e.prenom || '').charAt(0)}${e.prenom ? '.' : ''} ${e.nom || ''}`.trim() || 'Salarié';

// ─── Entrée principale ────────────────────────────────────────────────────
function rh2Render() {
  const el = document.getElementById('rhWelcome');
  if (el) el.innerHTML = rh2Hello() + rh2Kpis() + rh2Cards() + rh2Bento();
  rh2Meta();
  if (!RH2.data && !RH2.loading) rh2Load();
}

function rh2Repaint() {
  const el = document.getElementById('rhWelcome');
  if (el) el.innerHTML = rh2Hello() + rh2Kpis() + rh2Cards() + rh2Bento();
  rh2Meta();
}

// Chargement des données réelles, puis re-rendu des parties chiffrées
async function rh2Load() {
  RH2.loading = true;
  const paieOk = rh2PaieAutorisee();
  const [employes, contrats, conges, absences, entretiens, paies] = await Promise.all([
    _rhCall('sbGetEmployes'),
    _rhCall('sbGetContrats'),
    _rhCall('sbGetConges'),
    _rhCall('sbGetAbsences'),
    _rhCall('sbGetEntretiens'),
    paieOk ? _rhCall('sbGetFichesPaie') : Promise.resolve(null)
  ]);
  RH2.data = {
    employes: employes || [],
    contrats: contrats || [],
    conges: conges || [],
    absences: absences || [],
    entretiens: entretiens || [],
    paies: paies || [],
    paieOk
  };
  RH2.loading = false;
  rh2Repaint();
}

// Le même filtre que la navigation : jamais de chiffre de paie sans le droit.
function rh2PaieAutorisee() {
  const e = (window.RH_NAV || []).find(x => x.page === 'paie.html');
  if (!e) return false;
  return (window.rhAllowed || (() => false))(e);
}

// ─── Chiffres dérivés des données réelles ─────────────────────────────────
function rh2Stats() {
  const D = RH2.data;
  if (!D) return null;
  const actifs = D.employes.filter(e => (e.statut || 'actif') === 'actif');
  const etp = actifs.reduce((s, e) => s + (Number(e.heuresContrat) || 0), 0) / 35;

  const congesAttente = D.conges.filter(c => c.statut === 'en_attente');

  // Contrats à renouveler : actifs, dont la fin tombe dans les 90 jours (ou est dépassée)
  const contratsFin = D.contrats
    .filter(c => (c.statut || 'actif') === 'actif' && c.fin)
    .map(c => ({ c, j: _rhJours(c.fin) }))
    .filter(x => x.j !== null && x.j <= 90)
    .sort((a, b) => a.j - b.j);

  const t = _rhToday();
  const absencesCours = D.absences.filter(a => a.debut && a.debut <= t && (!a.fin || a.fin >= t));
  const visites = D.absences.filter(a => !a.visiteFaite && a.fin && a.fin < t
    && ['at', 'maladie_pro', 'accident_travail'].concat(['maladie']).includes(a.type)
    && (!a.visiteDate || a.visiteDate <= t));
  const entretiensRetard = D.entretiens.filter(e => e.statut === 'planifie' && e.date && e.date < t);

  // Masse salariale : 6 dernières périodes réellement présentes en base
  let masse = [], masseTotal = 0;
  if (D.paieOk && D.paies.length) {
    const parPeriode = {};
    D.paies.forEach(f => {
      const p = String(f.periode || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(p)) return;
      parPeriode[p] = (parPeriode[p] || 0) + (Number(f.brut) || 0);
    });
    masse = Object.keys(parPeriode).sort().slice(-6).map(p => ({
      p, label: RH_MOIS_CT[Number(p.slice(5, 7)) - 1] || p, v: parPeriode[p]
    }));
    masseTotal = masse.reduce((s, m) => s + m.v, 0);
  }

  // Effectif par métier
  const parPoste = {};
  actifs.forEach(e => {
    const p = (e.poste || '').trim() || 'Non renseigné';
    parPoste[p] = (parPoste[p] || 0) + 1;
  });
  const effectif = Object.entries(parPoste).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxEff = effectif.length ? effectif[0][1] : 1;

  // Anniversaires de contrat : date d'embauche qui « retombe » dans les 90 jours
  const anniv = actifs
    .filter(e => e.dateEmbauche)
    .map(e => {
      const d = new Date(e.dateEmbauche + 'T00:00:00');
      if (isNaN(d)) return null;
      const now = new Date(t + 'T00:00:00');
      let an = now.getFullYear();
      let next = new Date(an, d.getMonth(), d.getDate());
      if (next < now) { an += 1; next = new Date(an, d.getMonth(), d.getDate()); }
      const j = Math.round((next - now) / 86400000);
      const ans = an - d.getFullYear();
      if (j > 90 || ans < 1) return null;
      const iso = `${an}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      return { e, j, ans, iso };
    })
    .filter(Boolean)
    .sort((a, b) => a.j - b.j)
    .slice(0, 5);

  return {
    actifs, etp, congesAttente, contratsFin, absencesCours, visites, entretiensRetard,
    masse, masseTotal, effectif, maxEff, anniv
  };
}

// Badges (nombre à traiter) par module — uniquement des compteurs réels
function rh2Badges() {
  const st = rh2Stats();
  if (!st) return {};
  const b = {};
  if (st.congesAttente.length) b['conges.html'] = st.congesAttente.length;
  if (st.contratsFin.length) b['contrats.html'] = st.contratsFin.length;
  if (st.absencesCours.length) b['absences.html'] = st.absencesCours.length;
  if (st.entretiensRetard.length) b['entretiens.html'] = st.entretiensRetard.length;
  return b;
}

// Bandeau de droite de la barre de titre : effectif + ETP (donnée réelle)
function rh2Meta() {
  const el = document.getElementById('rhTopMeta');
  if (!el) return;
  const st = rh2Stats();
  if (!st) { el.textContent = 'Chargement…'; return; }
  const n = st.actifs.length;
  el.textContent = `${n} salarié${n > 1 ? 's' : ''} · ${st.etp.toFixed(1).replace('.', ',')} ETP`;
}

// ─── Blocs de contenu ─────────────────────────────────────────────────────
function rh2Hello() {
  return `<div class="rh-hello">
    <div class="rh-hello-s">Vue d'ensemble des ressources humaines.</div>
  </div>`;
}

function rh2Kpis() {
  const st = rh2Stats();
  const K = [
    { n: st ? String(st.actifs.length) : '—', l: 'Salariés actifs', c: '#818cf8', ic: RH_IC.users },
    { n: st ? st.etp.toFixed(1).replace('.', ',') : '—', l: 'ETP', c: '#22d3ee', ic: RH_IC.etp },
    { n: st ? String(st.congesAttente.length) : '—', l: 'Congés à valider', c: '#f59e0b', ic: RH_IC.sun },
    { n: st ? String(st.contratsFin.length) : '—', l: 'Contrats à renouveler', c: '#ef4444', ic: RH_IC.file }
  ];
  return `<div class="dc-kpis" style="margin-bottom:24px">${K.map(k => `<div class="dc-kpi" style="--dc-c:${k.c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${_rh(k.l)}</span>
      <span class="dc-kpi-ico" style="color:${k.c}">${_rhSvg(k.ic, k.c, 16)}</span></div>
    <div class="dc-kpi-val" style="color:${k.c}">${_rh(k.n)}</div></div>`).join('')}</div>`;
}

// Sous-titre de tuile : chiffre réel du module, jamais une valeur inventée.
// Donnée de la carte au format carte-donnée : { n, u, lb } ou { txt, lb }.
// warn: true → la carte se teinte, il y a quelque chose à traiter.
function rh2CardData(page) {
  const st = rh2Stats();
  if (!st) return { txt: '…', lb: 'chargement' };
  const s = (n, sing, plur) => (n > 1 ? (plur || sing + 's') : sing);
  switch (page) {
    case 'rh-dashboard.html': return { txt: 'Synthèse', lb: 'tableau de bord RH' };
    case 'admin.html?tab=employes': return { n: st.actifs.length, lb: s(st.actifs.length, 'fiche salarié', 'fiches salariés') };
    case 'contacts-externes.html': return { txt: 'Externes', lb: 'intervenants et partenaires' };
    case 'contrats.html': return st.contratsFin.length
      ? { n: st.contratsFin.length, lb: s(st.contratsFin.length, 'échéance à traiter', 'échéances à traiter'), warn: true }
      : { txt: 'À jour', lb: 'aucune échéance proche' };
    case 'absences.html': return st.absencesCours.length
      ? { n: st.absencesCours.length, lb: s(st.absencesCours.length, 'absence en cours', 'absences en cours') }
      : { n: 0, lb: 'aucune absence en cours' };
    case 'conges.html': return st.congesAttente.length
      ? { n: st.congesAttente.length, lb: s(st.congesAttente.length, 'demande à valider', 'demandes à valider'), warn: true }
      : { n: 0, lb: 'rien à valider' };
    case 'pointage.html': return { txt: 'Temps réel', lb: 'pointages du jour' };
    case 'planning-equipe.html': return { txt: 'Semaine', lb: 'planning de l’équipe' };
    case 'astreintes.html': return { txt: 'Astreintes', lb: 'tour de garde' };
    case 'entretiens.html': return st.entretiensRetard.length
      ? { n: st.entretiensRetard.length, lb: s(st.entretiensRetard.length, 'entretien en retard', 'entretiens en retard'), warn: true }
      : { txt: 'À jour', lb: 'aucun entretien en retard' };
    case 'formations.html': return { txt: 'Formation', lb: 'plan de formation' };
    case 'paie.html': return st.masse.length
      ? { n: st.masse.length, lb: s(st.masse.length, 'période de paie', 'périodes de paie') }
      : { txt: 'Bulletins', lb: 'fiches de paie' };
    case 'recrutement.html': return { txt: 'Recrutement', lb: 'candidatures en cours' };
    case 'diagnostic-droits.html': return { txt: 'Droits', lb: 'accès et permissions' };
    case 'viatrajectoire.html': return { txt: 'Orientations', lb: 'Via Trajectoire' };
    default: return { txt: '', lb: '' };
  }
}

function rh2Cards() {
  const nav = (window.RH_NAV || []).filter(window.rhAllowed || (() => true));
  const badges = rh2Badges();
  const tuto = window.PORTAL_TUTO || {};
  return `<div class="dc-eyebrow" style="margin-bottom:12px">Modules RH</div>
    <div class="rh-cards">${nav.map(e => {
      const n = badges[e.page];
      const k = e.page.split('?')[0];
      const d = rh2CardData(e.page);
      const aide = !!tuto[k];
      return `<div class="rh-card cdn${n ? ' cdn-hasb' : ''}${aide ? ' cdn-hasi' : ''}${d.warn ? ' cdn-warn' : ''}" role="button" tabindex="0"
        data-page="${_rh(e.page)}" data-label="${_rh(e.label)}"
        aria-label="Ouvrir ${_rh(e.label)}" style="--rhc:${_rh(e.c1)};--rhc-sh:${_rhRgba(e.c1, .4)};--cdc:${_rh(e.c1)}">
        ${n ? `<span class="rh-card-b" title="${_rh(n)} à traiter">${_rh(n)}</span>` : ''}
        <div class="cdn-top">
          <span class="rh-card-ic cdn-ic">${e.icon}</span>
          <div class="cdn-t">${_rh(e.label)}</div>
        </div>
        ${_cdnMid(d, _rh)}
        ${aide ? `<button type="button" class="rh-card-i" data-tuto="${_rh(e.page)}"
          title="Mode d'emploi — ${_rh(e.label)}" aria-label="Mode d'emploi — ${_rh(e.label)}">?</button>` : ''}
      </div>`;
    }).join('')}</div>`;
}

function rh2Bento() {
  return `<div class="rh-bento">${rh2BlkTodo()}${rh2BlkEffectif()}</div>`
    + `<div class="rh-bento">${rh2BlkMasse()}${rh2BlkAnniv()}</div>`;
}

// ── À traiter — uniquement des points réels, issus des tables chargées ──
function rh2BlkTodo() {
  const st = rh2Stats();
  let body = `<div class="rh-vide">Chargement…</div>`;
  let items = [];
  if (st) {
    if (st.congesAttente.length) {
      const noms = st.congesAttente.slice(0, 3).map(c => c.employeNom).filter(Boolean).join(', ');
      items.push({
        label: `Valider ${st.congesAttente.length} demande${st.congesAttente.length > 1 ? 's' : ''} de congés`,
        sub: noms || 'Demandes en attente', tag: 'Congés', c: '#f59e0b', ic: RH_IC.sun, page: 'conges.html'
      });
    }
    st.contratsFin.slice(0, 2).forEach(({ c, j }) => {
      items.push({
        label: `Fin de ${RH_CT_TYPE[c.type] || (c.type || 'contrat').toUpperCase()} — ${c.employeNom || 'salarié'}`,
        sub: `échéance ${_rhDateCourte(c.fin)}${j < 0 ? ' (dépassée)' : ` · J-${j}`}`,
        tag: 'Contrat', c: '#ef4444', ic: RH_IC.file, page: 'contrats.html'
      });
    });
    if (st.absencesCours.length) {
      items.push({
        label: `${st.absencesCours.length} absence${st.absencesCours.length > 1 ? 's' : ''} en cours`,
        sub: st.absencesCours.slice(0, 3).map(a => a.employeNom).filter(Boolean).join(', ') || 'Arrêts en cours',
        tag: 'Absence', c: '#ea580c', ic: RH_IC.alert, page: 'absences.html'
      });
    }
    if (st.visites.length) {
      items.push({
        label: `Visite${st.visites.length > 1 ? 's' : ''} médicale${st.visites.length > 1 ? 's' : ''} de reprise`,
        sub: st.visites.slice(0, 3).map(a => a.employeNom).filter(Boolean).join(', ') || 'à planifier',
        tag: 'Santé', c: '#22d3ee', ic: RH_IC.check, page: 'absences.html'
      });
    }
    if (st.entretiensRetard.length) {
      items.push({
        label: `${st.entretiensRetard.length} entretien${st.entretiensRetard.length > 1 ? 's' : ''} à conclure`,
        sub: st.entretiensRetard.slice(0, 3).map(e => e.employeNom).filter(Boolean).join(', ') || 'Date dépassée',
        tag: 'Entretien', c: '#db2777', ic: RH_IC.chat, page: 'entretiens.html'
      });
    }
    body = items.length
      ? items.slice(0, 5).map(t => `<div class="rh-li" role="button" tabindex="0"
          data-page="${_rh(t.page)}" data-label="${_rh(t.tag)}"
          style="border-left:3px solid ${t.c};padding-left:12px">
          <span class="rh-li-ic" style="background:${_rhRgba(t.c, .13)};color:${t.c}">${_rhSvg(t.ic, t.c, 15)}</span>
          <div class="rh-li-b"><div class="rh-li-t">${_rh(t.label)}</div>
            <div class="rh-li-s">${_rh(t.sub)}</div></div>
          <span class="dc-badge" style="flex:none;background:${_rhRgba(t.c, .14)};color:${t.c};border:1px solid ${_rhRgba(t.c, .34)}"><span class="d" style="background:${t.c}"></span>${_rh(t.tag)}</span>
        </div>`).join('')
      : `<div class="rh-vide">Rien à traiter aujourd'hui.</div>`;
  }
  const n = st ? Math.min(items.length, 5) : 0;
  const pill = n ? `<span class="dc-pill dim">${n} en cours</span>` : '';
  return `<div class="dc-card">${_rhDcHead('#f59e0b', RH_IC.warn, 'Priorités', 'À traiter', pill)}
    <div class="dc-body">${body}</div></div>`;
}

function rh2BlkEffectif() {
  const st = rh2Stats();
  let body = `<div class="rh-vide">Chargement…</div>`;
  if (st) {
    body = st.effectif.length
      ? `<div class="rh-bars">${st.effectif.map(([poste, n], i) => {
          const c = RH_BAR_C[i % RH_BAR_C.length];
          const pct = Math.round(n / st.maxEff * 100);
          return `<div><div class="rh-bar-h"><span class="rh-bar-l">${_rh(poste)}</span>
            <span class="rh-bar-n">${n}</span></div>
            <div class="rh-bar-r"><div class="rh-bar-f" style="width:${pct}%;background:${c}"></div></div></div>`;
        }).join('')}</div>`
      : `<div class="rh-vide">Aucun salarié actif enregistré.</div>`;
  }
  const pill = st ? `<span class="dc-pill dim">${st.actifs.length} actif${st.actifs.length > 1 ? 's' : ''}</span>` : '';
  return `<div class="dc-card">${_rhDcHead('#6366f1', RH_IC.users, 'Répartition', 'Effectif par métier', pill)}
    <div class="dc-body">${body}</div></div>`;
}

function rh2BlkMasse() {
  const st = rh2Stats();
  if (st && !st.masse.length && RH2.data && !RH2.data.paieOk) {
    return `<div class="dc-card">${_rhDcHead('#ea580c', RH_IC.euro, 'Paie · brut', 'Masse salariale', '')}
      <div class="dc-body"><div class="rh-vide">Réservé aux comptes autorisés à consulter la paie.</div></div></div>`;
  }
  let body = `<div class="rh-vide">Chargement…</div>`, total = '';
  if (st) {
    if (st.masse.length) {
      const max = Math.max(...st.masse.map(m => m.v)) || 1;
      total = _rhEuro(st.masseTotal);
      body = `<div class="rh-chart">${st.masse.map(m => `<div class="rh-chart-c"
        title="${_rh(m.p)} — ${_rh(_rhEuro(m.v))}">
        <div class="rh-chart-b" style="height:${Math.max(4, Math.round(m.v / max * 100))}%"></div>
        <div class="rh-chart-l">${_rh(m.label)}</div></div>`).join('')}</div>`;
    } else {
      body = `<div class="rh-vide">Aucune fiche de paie enregistrée.</div>`;
    }
  }
  const pill = total ? `<span class="dc-pill">${_rh(total)}</span>` : '';
  return `<div class="dc-card">${_rhDcHead('#ea580c', RH_IC.euro, 'Paie · brut · 6 périodes', 'Masse salariale', pill)}
    <div class="dc-body">${body}</div></div>`;
}

function rh2BlkAnniv() {
  const st = rh2Stats();
  let body = `<div class="rh-vide">Chargement…</div>`;
  if (st) {
    body = st.anniv.length
      ? st.anniv.map((a, i) => {
        const c = a.e.color || RH_AV_C[i % RH_AV_C.length];
        return `<div class="rh-li" style="border-left:3px solid ${_rh(c)};padding-left:12px">
          <span class="rh-li-av" style="background:${_rh(c)}">${_rh(_rhInitiales(a.e.prenom, a.e.nom))}</span>
          <div class="rh-li-b"><div class="rh-li-t">${_rh(_rhNomCourt(a.e))}</div>
            <div class="rh-li-s">${a.ans} an${a.ans > 1 ? 's' : ''} d'ancienneté</div></div>
          <span class="dc-pill dim" style="flex:none">${_rh(_rhDateCourte(a.iso))}</span></div>`;
      }).join('')
      : `<div class="rh-vide">Aucun anniversaire de contrat dans les 90 jours.</div>`;
  }
  const pill = (st && st.anniv.length) ? `<span class="dc-pill dim">${st.anniv.length}</span>` : '';
  return `<div class="dc-card">${_rhDcHead('#22d3ee', RH_IC.cal, '90 jours', 'Anniversaires de contrat', pill)}
    <div class="dc-body">${body}</div></div>`;
}

// ─── Mode d'emploi d'un module (gabarit de modale v2) ─────────────────────
// Textes issus de js/portal-tuto-data.js (déjà utilisés par l'ancien tutoriel).
function rh2OpenTuto(page) {
  const e = (window.RH_NAV || []).find(x => x.page === page);
  const t = (window.PORTAL_TUTO || {})[String(page).split('?')[0]];
  const ov = document.getElementById('rhTutoOv');
  if (!e || !t || !ov) return;
  ov.querySelector('.v2-md').style.setProperty('--mc', e.c1);
  ov.querySelector('#rhTutoIco').innerHTML = e.icon;
  ov.querySelector('#rhTutoT').textContent = e.label;
  ov.querySelector('#rhTutoS').textContent = e.g;
  ov.querySelector('#rhTutoB').innerHTML = `
    <div class="rh-tuto-p">${_rh(t.role || '')}</div>
    ${(t.mode && t.mode.length) ? `<div class="rh-tuto-box">
      <div class="rh-tuto-h"><span aria-hidden="true">🛠️</span> Mode d'emploi</div>
      <ol class="rh-tuto-ol">${t.mode.map(s => `<li>${_rh(s)}</li>`).join('')}</ol></div>` : ''}
    ${t.sync ? `<div class="rh-tuto-box"><div class="rh-tuto-h">🔗 Synchronisé avec</div>
      <div class="rh-tuto-p">${_rh(t.sync)}</div></div>` : ''}
    ${t.ex ? `<div class="rh-tuto-ex"><b>Exemple —</b> ${_rh(t.ex)}</div>` : ''}`;
  RH2.tuto = page;
  ov.classList.add('open');
}
function rh2CloseTuto() {
  const ov = document.getElementById('rhTutoOv');
  if (ov) ov.classList.remove('open');
  RH2.tuto = null;
}
function rh2OuvrirTuto() {
  const p = RH2.tuto;
  rh2CloseTuto();
  const e = (window.RH_NAV || []).find(x => x.page === p);
  if (e && typeof window.loadPage === 'function') window.loadPage(e.page, e.label);
}

// ─── Interactions ─────────────────────────────────────────────────────────
document.addEventListener('click', ev => {
  const info = ev.target.closest && ev.target.closest('.rh-card-i');
  if (info) { ev.stopPropagation(); rh2OpenTuto(info.dataset.tuto); return; }
  const it = ev.target.closest && ev.target.closest('.rh-it, .rh-card, .rh-li[data-page]');
  if (it && it.dataset.page && typeof window.loadPage === 'function') {
    const e = (window.RH_NAV || []).find(x => x.page === it.dataset.page);
    window.loadPage(it.dataset.page, (e && e.label) || it.dataset.label);
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && RH2.tuto) { rh2CloseTuto(); return; }
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const c = ev.target.closest && ev.target.closest('.rh-card, .rh-li[data-page]');
  if (c && c.dataset.page && typeof window.loadPage === 'function') {
    ev.preventDefault();
    const e = (window.RH_NAV || []).find(x => x.page === c.dataset.page);
    window.loadPage(c.dataset.page, (e && e.label) || c.dataset.label);
  }
});

window.rh2Render = rh2Render;
window.rh2CloseTuto = rh2CloseTuto;
window.rh2OuvrirTuto = rh2OuvrirTuto;
