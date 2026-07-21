// ══════════════════════════════════════════════════════════════════════════
// TABLEAU DE BORD RH — V2 « bento »
// Reproduction de la maquette « RH - refonte (bento) » : KPI, grille de
// modules, « À traiter », effectif par métier, masse salariale, anniversaires
// de contrat — puis le détail par module (contrats, absences, congés,
// entretiens, formations, recrutement) déjà présent en V1.
//
// Ce module NE FAIT QUE LE RENDU : les données lui sont passées par
// initRhDashboard() (js/rh-dashboard.js), qui garde la couche Supabase.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const esc = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
  const fdate = s => (typeof formatDate === 'function') ? formatDate(s) : (s || '');
  const todayStr = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);

  // ── Icônes (traits 24×24, reprises de la maquette) ──────────────────────
  const IC = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    etp: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    id: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M13 8h5M13 12h5M6 16h12"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    euro: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    med: '<path d="M12 2v20M2 12h20"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
  };
  const svg = (d, c, sz) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${sz || 21}" height="${sz || 21}" style="width:${sz || 21}px;height:${sz || 21}px;flex-shrink:0">${d}</svg>`;

  // ── Les 15 modules RH — mêmes pages, couleurs et droits que le dock RH ──
  const MODULES = [
    { g: "Vue d'ensemble", page: 'rh-dashboard.html', label: 'Tableau de bord', c: '#6366f1', ic: 'grid', self: true },
    { g: "Vue d'ensemble", page: 'admin.html?tab=employes', label: 'Utilisateurs', c: '#8b5cf6', ic: 'users' },
    { g: "Vue d'ensemble", page: 'contacts-externes.html', label: 'Contacts extérieurs', c: '#e11d48', ic: 'id' },
    { g: 'Contrats & absences', page: 'contrats.html', label: 'Contrats', c: '#0891b2', ic: 'file', badge: 'cdd' },
    { g: 'Contrats & absences', page: 'absences.html', label: 'Absences & AT', c: '#ef4444', ic: 'alert', badge: 'abs' },
    { g: 'Contrats & absences', page: 'conges.html', label: 'Demandes congés', c: '#f59e0b', ic: 'sun', badge: 'conges' },
    { g: 'Temps de travail', page: 'pointage.html', label: 'Pointage', c: '#0d9488', ic: 'clock' },
    { g: 'Temps de travail', page: 'planning-equipe.html', label: 'Planning équipe', c: '#2563eb', ic: 'cal' },
    { g: 'Temps de travail', page: 'astreintes.html', label: 'Astreintes', c: '#7c3aed', ic: 'bell' },
    { g: 'Carrière & paie', page: 'entretiens.html', label: 'Entretien pro', c: '#db2777', ic: 'chat', badge: 'entretiens' },
    { g: 'Carrière & paie', page: 'formations.html', label: 'Formation', c: '#16a34a', ic: 'book' },
    { g: 'Carrière & paie', page: 'paie.html', label: 'Fiches de paie', c: '#ea580c', ic: 'euro', perm: 'access_paie' },
    { g: 'Recrutement & outils', page: 'recrutement.html', label: 'Recrutement', c: '#0284c7', ic: 'brief', badge: 'candidats' },
    { g: 'Recrutement & outils', page: 'diagnostic-droits.html', label: 'Diagnostic droits', c: '#475569', ic: 'check', adminOnly: true },
    { g: 'Recrutement & outils', page: 'viatrajectoire.html', label: 'ViaTrajectoire', c: '#0d9488', ic: 'send', adminOnly: true }
  ];

  // Droits : recopie exacte de la règle du portail RH (rh.html) — jamais desserrée.
  function allowed(m) {
    try {
      const sess = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      const isAdmin = (typeof Auth !== 'undefined' && Auth.isAdmin) ? Auth.isAdmin() : false;
      if (m.adminOnly && !isAdmin) return false;
      if (m.perm) {
        if (isAdmin) return true;
        if (!sess || typeof hasPermission !== 'function') return false;
        return m.perm.split(',').some(p => hasPermission(sess.userId, p));
      }
      return true;
    } catch (e) { console.warn('[rhV2] droits', e); return false; }
  }

  // Dans le portail RH la page vit dans une iframe : on propage ?embed=1 pour
  // que la page cible masque aussi son titre et réserve la place du dock.
  const embedded = () => { try { return document.documentElement.classList.contains('is-embedded'); } catch (_) { return false; } };
  function href(page) {
    if (!embedded()) return page;
    return page + (page.indexOf('?') !== -1 ? '&' : '?') + 'embed=1';
  }

  const PALETTE = ['#6366f1', '#0891b2', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#22d3ee', '#ef4444'];
  const initiales = (p, n) => ((p || '').charAt(0) + (n || '').charAt(0)).toUpperCase() || '?';
  const nomComplet = e => `${e.prenom || ''} ${e.nom || ''}`.trim();
  const plusJours = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  // ── État ────────────────────────────────────────────────────────────────
  const RHV2 = { data: null };

  // ── Rendu principal ─────────────────────────────────────────────────────
  function renderRhDashboardV2(D) {
    const host = document.getElementById('rhV2');
    if (!host) { console.warn('[rhV2] hôte #rhV2 absent'); return; }
    RHV2.data = D = D || {};
    const d = derive(D);

    host.innerHTML =
      hero(d) +
      kpis(d) +
      sep('Modules RH') +
      modules(d) +
      `<div class="v2-g v2-g2 rhv-g" style="margin-top:18px">${aTraiter(d)}${effectif(d)}</div>` +
      `<div class="v2-g v2-g2 rhv-g" style="margin-top:18px">${masse(d)}${anniversaires(d)}</div>` +
      sep('Détail par module') +
      `<div class="v2-g v2-g2 rhv-g">
         ${bloc('rhContrats', 'Contrats — échéances', 'file', '#0891b2', 'contrats.html', listeContrats(d))}
         ${bloc('rhAbsences', 'Absences en cours', 'alert', '#ef4444', 'absences.html', listeAbsences(d))}
       </div>
       <div class="v2-g v2-g2 rhv-g" style="margin-top:18px">
         ${bloc('rhConges', 'Congés en attente', 'sun', '#f59e0b', 'conges.html', listeConges(d))}
         ${bloc('rhEntretiens', 'Entretiens à planifier', 'chat', '#db2777', 'entretiens.html', listeEntretiens(d))}
       </div>
       <div class="v2-g v2-g2 rhv-g" style="margin-top:18px">
         ${bloc('rhFormations', 'Formations à venir', 'book', '#16a34a', 'formations.html', listeFormations(d))}
         ${bloc('rhRecrutement', 'Pipeline recrutement', 'brief', '#0284c7', 'recrutement.html', listeRecrutement(d))}
       </div>`;

    // Méta de la barre du haut (« 18 salariés · 16,4 ETP » dans la maquette)
    const meta = document.getElementById('rhTopMeta');
    if (meta) meta.textContent = `${d.actifs.length} salarié${d.actifs.length > 1 ? 's' : ''} · ${fmtNum(d.etp)} ETP`;

    if (typeof applyPermissions === 'function') { try { applyPermissions(); } catch (e) { console.warn(e); } }
  }

  // ── Dérivations ─────────────────────────────────────────────────────────
  function derive(D) {
    const t = todayStr(), in30 = plusJours(t, 30), in60 = plusJours(t, 60);
    const employes = D.employes || [], contrats = D.contrats || [], absences = D.absences || [];
    const conges = D.conges || [], entretiens = D.entretiens || [], formations = D.formations || [];
    const candidats = D.candidats || [], fichesPaie = D.fichesPaie || [];

    const actifs = employes.filter(e => (e.statut || 'actif') === 'actif');
    const etp = actifs.reduce((s, e) => s + (Number(e.heuresContrat) || 0), 0) / 35;

    const contratsActifs = contrats.filter(c => (c.statut || 'actif') === 'actif');
    const cddEcheance = contratsActifs.filter(c => c.type === 'cdd' && c.fin && c.fin >= t && c.fin <= in30)
      .sort((a, b) => a.fin.localeCompare(b.fin));
    const absencesEnCours = absences.filter(a => !a.fin || a.fin >= t);
    const congesEnAttente = conges.filter(c => c.statut === 'en_attente')
      .sort((a, b) => (a.debut || '').localeCompare(b.debut || ''));
    const entretiensAVenir = entretiens.filter(e => e.statut === 'planifie' && e.date && e.date >= t && e.date <= in30)
      .sort((a, b) => a.date.localeCompare(b.date));
    const formationsAVenir = formations.filter(f => f.statut === 'planifiee' && f.dateDebut && f.dateDebut >= t)
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
    const candidatsActifs = candidats.filter(c => !['accepte', 'refuse'].includes(c.statut));

    return { t, in30, in60, employes, contrats, absences, conges, entretiens, formations, candidats,
      fichesPaie, actifs, etp, cddEcheance, absencesEnCours, congesEnAttente,
      entretiensAVenir, formationsAVenir, candidatsActifs };
  }

  const fmtNum = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nomDe = (d, id, fallback) => {
    const e = d.employes.find(x => String(x.id) === String(id));
    return e ? nomComplet(e) : (fallback || 'Inconnu');
  };

  // ── Blocs ───────────────────────────────────────────────────────────────
  function hero(d) {
    const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
    const prenom = s && (s.prenom || s.username) ? (s.prenom || s.username) : '';
    return `<div class="rhv-hero">
      <h1 class="v2-h1">${prenom ? 'Bonjour, ' + esc(prenom) : 'Ressources humaines'}</h1>
      <div class="v2-sub">Vue d'ensemble des ressources humaines.</div>
    </div>`;
  }

  function kpis(d) {
    const K = [
      { n: d.actifs.length, l: 'Salariés actifs', c: '#818cf8', ic: 'users' },
      { n: fmtNum(d.etp), l: 'ETP', c: '#22d3ee', ic: 'etp' },
      { n: d.congesEnAttente.length, l: 'Congés à valider', c: '#f59e0b', ic: 'sun' },
      { n: d.cddEcheance.length, l: 'CDD à renouveler (≤30 j)', c: '#ef4444', ic: 'file' }
    ];
    return `<div class="v2-kgrid rhv-kpis" id="rhStats">${K.map(k => `<div class="v2-k">
      <span class="v2-k-ico" style="background:${k.c}22">${svg(IC[k.ic], k.c, 22)}</span>
      <span><span class="v2-k-n" style="color:${k.c}">${esc(String(k.n))}</span><span class="v2-k-l">${esc(k.l)}</span></span>
    </div>`).join('')}</div>`;
  }

  function sep(txt) {
    return `<div class="v2-sep"><span class="v2-sep-txt">${esc(txt)}</span><span class="v2-sep-line"></span></div>`;
  }

  function modules(d) {
    const counts = {
      cdd: d.cddEcheance.length, abs: d.absencesEnCours.length, conges: d.congesEnAttente.length,
      entretiens: d.entretiensAVenir.length, candidats: d.candidatsActifs.length
    };
    return `<div class="v2-mods rhv-mods">${MODULES.filter(allowed).map(m => {
      const n = m.badge ? counts[m.badge] : 0;
      return `<a class="v2-mod${m.self ? ' rhv-mod-on' : ''}" href="${m.self ? 'javascript:void(0)' : href(m.page)}"
          style="--mc:${m.c}"${m.self ? ' aria-current="page"' : ''}>
        <span class="v2-mod-ico" style="background:${m.c}22">${svg(IC[m.ic], m.c, 23)}</span>
        <span class="v2-mod-lbl">${esc(m.label)}</span>
        ${n ? `<span class="notif-badge">${n}</span>` : ''}
      </a>`;
    }).join('')}</div>`;
  }

  // « À traiter » — agrégat, chaque ligne mène au module concerné
  function aTraiter(d) {
    const items = [];
    if (d.congesEnAttente.length) items.push({
      label: `Valider ${d.congesEnAttente.length} demande${d.congesEnAttente.length > 1 ? 's' : ''} de congés`,
      sub: d.congesEnAttente.slice(0, 3).map(c => nomDe(d, c.employeId, c.employeNom)).join(', '),
      tag: 'Congés', c: '#f59e0b', ic: 'sun', page: 'conges.html'
    });
    d.cddEcheance.slice(0, 3).forEach(c => items.push({
      label: `Fin de CDD — ${nomDe(d, c.employeId, c.employeNom)}`,
      sub: `échéance ${fdate(c.fin)}`, tag: 'Contrat', c: '#ef4444', ic: 'file', page: 'contrats.html'
    }));
    if (d.entretiensAVenir.length) items.push({
      label: `${d.entretiensAVenir.length} entretien${d.entretiensAVenir.length > 1 ? 's' : ''} à préparer`,
      sub: 'dans les 30 jours', tag: 'Entretien', c: '#db2777', ic: 'chat', page: 'entretiens.html'
    });
    if (d.absencesEnCours.length) items.push({
      label: `${d.absencesEnCours.length} absence${d.absencesEnCours.length > 1 ? 's' : ''} en cours`,
      sub: 'suivi des arrêts et AT', tag: 'Santé', c: '#22d3ee', ic: 'check', page: 'absences.html'
    });
    if (d.candidatsActifs.length) items.push({
      label: `${d.candidatsActifs.length} candidature${d.candidatsActifs.length > 1 ? 's' : ''} en cours`,
      sub: 'pipeline de recrutement', tag: 'Recrutement', c: '#0284c7', ic: 'brief', page: 'recrutement.html'
    });

    const body = items.length ? items.map(i => `<a class="rhv-todo" href="${href(i.page)}">
        <span class="rhv-todo-ic" style="background:${i.c}22;color:${i.c}">${svg(IC[i.ic], i.c, 15)}</span>
        <span class="rhv-todo-x">
          <span class="rhv-todo-t">${esc(i.label)}</span>
          <span class="rhv-todo-s">${esc(i.sub)}</span>
        </span>
        <span class="rhv-todo-tag" style="color:${i.c};background:${i.c}1c">${esc(i.tag)}</span>
      </a>`).join('')
      : `<div class="v2-blk-vide">Rien à traiter : tout est à jour.</div>`;

    return `<div class="v2-blk rhv-warn" id="rhATraiter">
      <div class="v2-blk-h">
        <span class="rhv-blk-ic">${svg(IC.alert, '#fbbf24', 15)}</span>
        <span class="v2-blk-t" style="color:#fde68a">À traiter</span>
        <span class="v2-blk-lien" style="color:#fde68a">${items.length} point${items.length > 1 ? 's' : ''}</span>
      </div>${body}</div>`;
  }

  function effectif(d) {
    const map = new Map();
    d.actifs.forEach(e => {
      const k = (e.poste || '').trim() || 'Non renseigné';
      map.set(k, (map.get(k) || 0) + 1);
    });
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const max = rows.length ? rows[0][1] : 1;
    const body = rows.length ? rows.map((r, i) => `<div class="rhv-eff">
        <div class="rhv-eff-h"><span class="rhv-eff-l">${esc(r[0])}</span><span class="rhv-eff-n">${r[1]}</span></div>
        <div class="v2-prog"><span style="width:${Math.round(r[1] / max * 100)}%;background:${PALETTE[i % PALETTE.length]}"></span></div>
      </div>`).join('')
      : `<div class="v2-blk-vide">Aucun salarié actif enregistré.</div>`;
    return `<div class="v2-blk" id="rhEffectif">
      <div class="v2-blk-h"><span class="v2-blk-t">Effectif par métier</span>
        <span class="v2-blk-lien">${d.actifs.length} salarié${d.actifs.length > 1 ? 's' : ''}</span></div>
      <div class="rhv-effs">${body}</div></div>`;
  }

  // Masse salariale — 6 derniers mois de fiches de paie (brut)
  function masse(d) {
    const paieVisible = (() => {
      try {
        if (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) return true;
        const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
        return !!(s && typeof hasPermission === 'function' && hasPermission(s.userId, 'access_paie'));
      } catch (_) { return false; }
    })();
    if (!paieVisible) {
      return `<div class="v2-blk" id="rhMasse">
        <div class="v2-blk-h"><span class="v2-blk-t">Masse salariale</span></div>
        <div class="v2-blk-vide">Accès réservé aux profils disposant du droit « paie ».</div></div>`;
    }

    const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const now = new Date(d.t + 'T00:00:00');
    const periodes = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periodes.push({ key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`, label: MOIS[dt.getMonth()] });
    }
    const somme = {};
    (d.fichesPaie || []).forEach(f => {
      const p = (f.periode || '').slice(0, 7);
      if (!p) return;
      somme[p] = (somme[p] || 0) + (Number(f.brut) || 0);
    });
    const vals = periodes.map(p => somme[p.key] || 0);
    const total = vals.reduce((a, b) => a + b, 0);
    const max = Math.max(...vals, 1);
    const eur = n => Math.round(n).toLocaleString('fr-FR') + ' €';

    const body = total > 0
      ? `<div class="v2-chart rhv-chart">${periodes.map((p, i) => `<div class="v2-chart-col">
            <div class="rhv-bar-v">${vals[i] ? Math.round(vals[i] / 1000) + ' k' : ''}</div>
            <div class="v2-chart-bar rhv-bar" style="height:${Math.max(vals[i] / max * 100, vals[i] ? 4 : 0)}%"></div>
            <div class="v2-chart-lbl">${esc(p.label)}</div></div>`).join('')}</div>`
      : `<div class="v2-blk-vide">Aucune fiche de paie enregistrée sur les 6 derniers mois.</div>`;

    return `<div class="v2-blk" id="rhMasse">
      <div class="v2-blk-h"><span class="v2-blk-t">Masse salariale — 6 mois</span>
        <span class="rhv-masse-tot">${total > 0 ? eur(total) : '—'}</span></div>${body}</div>`;
  }

  // Anniversaires de contrat — date d'embauche des salariés actifs, 60 jours
  function anniversaires(d) {
    const now = new Date(d.t + 'T00:00:00');
    const MOISC = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const list = [];
    d.actifs.forEach((e, i) => {
      if (!e.dateEmbauche) return;
      const emb = new Date(e.dateEmbauche + 'T00:00:00');
      if (isNaN(emb)) return;
      let prochain = new Date(now.getFullYear(), emb.getMonth(), emb.getDate());
      if (prochain < now) prochain = new Date(now.getFullYear() + 1, emb.getMonth(), emb.getDate());
      const jours = Math.round((prochain - now) / 86400000);
      if (jours > 60) return;
      const ans = prochain.getFullYear() - emb.getFullYear();
      if (ans <= 0) return;
      list.push({ nom: nomComplet(e), ini: initiales(e.prenom, e.nom), ans, jours,
        date: `${emb.getDate()} ${MOISC[emb.getMonth()]}`, c: e.color || PALETTE[i % PALETTE.length] });
    });
    list.sort((a, b) => a.jours - b.jours);

    const body = list.length ? list.slice(0, 6).map(a => `<div class="rhv-anniv">
        <span class="rhv-anniv-av" style="background:${a.c}">${esc(a.ini)}</span>
        <span class="rhv-anniv-x"><span class="rhv-anniv-n">${esc(a.nom)}</span>
          <span class="rhv-anniv-s">${a.ans} an${a.ans > 1 ? 's' : ''} d'ancienneté</span></span>
        <span class="rhv-anniv-d">${esc(a.date)}</span></div>`).join('')
      : `<div class="v2-blk-vide">Aucun anniversaire de contrat dans les 60 jours.</div>`;

    return `<div class="v2-blk rhv-cyan" id="rhAnniv">
      <div class="v2-blk-h"><span class="rhv-blk-ic">${svg(IC.cal, '#22d3ee', 15)}</span>
        <span class="v2-blk-t" style="color:#a5f3fc">Anniversaires de contrat</span></div>${body}</div>`;
  }

  // ── Détail par module ───────────────────────────────────────────────────
  function bloc(id, titre, ic, c, page, contenu) {
    return `<div class="v2-blk">
      <div class="v2-blk-h">
        <span class="rhv-blk-ic" style="background:${c}22">${svg(IC[ic], c, 15)}</span>
        <span class="v2-blk-t">${esc(titre)}</span>
        <a class="v2-blk-lien" href="${href(page)}">Voir tout</a>
      </div>
      <div id="${id}" class="rhv-rows">${contenu}</div></div>`;
  }

  function row(page, c, ic, titre, sous, droite) {
    return `<a class="rhv-row" href="${href(page)}">
      <span class="rhv-row-ic" style="background:${c}22">${svg(IC[ic], c, 15)}</span>
      <span class="rhv-row-x"><span class="rhv-row-t">${esc(titre)}</span>
        <span class="rhv-row-s">${esc(sous)}</span></span>
      ${droite ? `<span class="v2-badge ${droite.cls || 'v2-b-neutral'}">${esc(droite.txt)}</span>` : ''}</a>`;
  }
  const vide = m => `<div class="v2-blk-vide">${esc(m)}</div>`;

  function listeContrats(d) {
    if (!d.cddEcheance.length) return vide('Aucune échéance de CDD dans les 30 jours.');
    return d.cddEcheance.map(c => {
      const j = Math.ceil((new Date(c.fin + 'T00:00:00') - new Date(d.t + 'T00:00:00')) / 86400000);
      return row('contrats.html', '#ef4444', 'file', nomDe(d, c.employeId, c.employeNom),
        `Fin de CDD le ${fdate(c.fin)}`, { txt: 'J-' + j, cls: j <= 7 ? 'v2-b-danger' : 'v2-b-warn' });
    }).join('');
  }

  function listeAbsences(d) {
    if (!d.absencesEnCours.length) return vide('Aucune absence en cours.');
    const lbl = { at: 'Accident du travail', maladie_pro: 'Maladie pro.', maladie: 'Maladie' };
    return d.absencesEnCours.map(a => row('absences.html', '#ef4444', 'alert',
      nomDe(d, a.employeId, a.employeNom), `Depuis le ${fdate(a.debut)}`,
      { txt: lbl[a.type] || (a.type || 'Absence'), cls: a.type === 'at' ? 'v2-b-danger' : 'v2-b-neutral' })).join('');
  }

  function listeConges(d) {
    if (!d.congesEnAttente.length) return vide('Aucune demande en attente.');
    return d.congesEnAttente.map(c => row('conges.html', '#f59e0b', 'sun',
      nomDe(d, c.employeId, c.employeNom), `${fdate(c.debut)} → ${fdate(c.fin)}`,
      { txt: 'En attente', cls: 'v2-b-warn' })).join('');
  }

  function listeEntretiens(d) {
    if (!d.entretiensAVenir.length) return vide('Aucun entretien planifié dans les 30 jours.');
    return d.entretiensAVenir.map(e => row('entretiens.html', '#db2777', 'chat',
      e.employeNom || nomDe(d, e.employeId), `Planifié le ${fdate(e.date)}`,
      { txt: 'Planifié', cls: 'v2-b-info' })).join('');
  }

  function listeFormations(d) {
    if (!d.formationsAVenir.length) return vide('Aucune formation planifiée.');
    return d.formationsAVenir.slice(0, 8).map(f => row('formations.html', '#16a34a', 'book',
      f.titre || 'Formation', `Le ${fdate(f.dateDebut)}`,
      { txt: 'À venir', cls: 'v2-b-ok' })).join('');
  }

  function listeRecrutement(d) {
    if (!d.candidatsActifs.length) return vide('Aucun candidat en cours.');
    const lbl = { recu: 'Reçu', entretien_planifie: 'Entretien planifié', entretien_fait: 'Entretien réalisé' };
    return d.candidatsActifs.map(c => row('recrutement.html', '#0284c7', 'brief',
      `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Candidat', c.poste || '',
      { txt: lbl[c.statut] || c.statut || '—', cls: 'v2-b-info' })).join('');
  }

  // Publication explicite : un `function` de module IIFE ne crée pas de
  // propriété sur window (piège déjà rencontré sur ce projet).
  window.renderRhDashboardV2 = renderRhDashboardV2;
  window.RHV2 = RHV2;
})();
