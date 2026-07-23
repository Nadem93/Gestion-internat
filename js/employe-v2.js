// ── FICHE EMPLOYÉ — DESIGN V2 (module RH) ────────────────────────────────
// Reprend le langage visuel de la maquette « Utilisateurs (RH) » (barre du haut,
// tuiles statistiques à carré d'icône, chips de filtre, cartes translucides,
// tableaux sombres, gabarit de modale) et l'applique à la structure réelle de la
// fiche employé.
//
// Le rendu des modules (planning, congés, arrêts, formations, …) reste assuré par
// les fonctions emp*Html() du script en ligne de employe.html : ce fichier ne fait
// que les répartir dans les onglets et poser la coquille V2. Aucune couche Supabase
// n'est réécrite ici.
//
// Contexte partagé : employe.html publie window.EMP_CTX (les `let` de premier
// niveau ne créent pas de propriété sur window).

(function () {
  'use strict';

  const ctx = () => window.EMP_CTX || {};

  // ── onglets ────────────────────────────────────────────────────────────
  let EV2_TAB = 'apercu';

  function ev2Tabs() {
    const t = [
      { k: 'apercu',   l: "Vue d'ensemble" },
      { k: 'temps',    l: 'Temps de travail' },
      { k: 'carriere', l: 'Carrière' },
      { k: 'docs',     l: 'Documents & paie' }
    ];
    if (window.canEditEmploye && window.canEditEmploye()) t.push({ k: 'admin', l: 'Administration' });
    return t;
  }

  // section → onglet qui la contient (pour scrollToSection depuis une tuile)
  const EV2_SECTION_TAB = {
    referents: 'apercu', heures: 'apercu', alertes: 'apercu', journal: 'apercu',
    planning: 'temps', conges: 'temps', arrets: 'temps',
    formations: 'carriere', diplomes: 'carriere', entretiens: 'carriere', historique: 'carriere',
    documents: 'docs', paie: 'docs',
    messages: 'admin', notes: 'admin', sanctions: 'admin', 'notes-admin': 'admin', depart: 'admin'
  };

  // ── helpers ────────────────────────────────────────────────────────────
  const esc = s => (window.escHtml ? window.escHtml(s == null ? '' : String(s)) : String(s == null ? '' : s));

  function ini(prenom, nom) {
    return ((prenom || '')[0] || '') + ((nom || '')[0] || '') || '?';
  }

  function fdate(d) {
    if (!d) return '—';
    if (window.formatDate) return window.formatDate(d);
    return d;
  }

  // Ancienneté en années/mois pleins à partir de la date d'embauche.
  function anciennete(dateEmbauche) {
    if (!dateEmbauche) return null;
    const d = new Date(dateEmbauche + 'T00:00:00');
    if (isNaN(d)) return null;
    const now = new Date();
    let mois = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) mois--;
    if (mois < 0) return null;
    const a = Math.floor(mois / 12), m = mois % 12;
    if (a === 0) return m + ' mois';
    return a + ' an' + (a > 1 ? 's' : '') + (m ? ' ' + m + ' mois' : '');
  }

  // Icônes (traits, jeu de la maquette). Bornées en CSS ET en attributs :
  // un SVG sans dimensions remplit toute sa colonne.
  const IC = {
    home:   '<path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    heart:  '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
    sun:    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    chart:  '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    book:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    euro:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    clip:   '<path d="M21.4 11.05 12.2 20.3a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 1 1 4.7 4.7l-9.2 9.2a1.7 1.7 0 0 1-2.4-2.4l8.5-8.5"/>',
    chat:   '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    cap:    '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
    trend:  '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    bell:   '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    mail:   '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
    phone:  '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    back:   '<polyline points="15 18 9 12 15 6"/>'
  };

  function svg(path, size) {
    const s = size || 21;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  // ── bandeau d'identité ─────────────────────────────────────────────────
  function ev2Hero(e) {
    const c = (window.getPosteColor ? window.getPosteColor(e.poste) : '#818cf8');
    const av = e.photo
      ? `<div class="v2-hero-av" style="background:${c}"><img src="${window.sanitizeUrl ? window.sanitizeUrl(e.photo) : ''}" alt=""/></div>`
      : `<div class="v2-hero-av" style="background:${c}">${esc(ini(e.prenom, e.nom))}</div>`;

    const actif = e.statut !== 'inactif';
    const chips = [
      `<span class="v2-pill" style="--pc:${c}">${esc(e.poste || 'Sans poste')}</span>`,
      `<span class="v2-badge ${actif ? 'v2-b-ok' : 'v2-b-neutral'}">${actif ? 'Actif' : 'Inactif'}</span>`
    ].join('');

    const liens = [];
    if (e.email) liens.push(`<a class="ev2-ico-btn" href="mailto:${esc(e.email)}" title="${esc(e.email)}">${svg(IC.mail, 17)}</a>`);
    if (e.telephone) liens.push(`<a class="ev2-ico-btn" href="tel:${esc(e.telephone)}" title="${esc(e.telephone)}">${svg(IC.phone, 17)}</a>`);
    if (window.canEditEmploye && window.canEditEmploye()) {
      liens.push(`<button class="ev2-ico-btn" type="button" onclick="scrollToSection('messages')" title="Écrire un message">${svg(IC.chat, 17)}</button>`);
    }

    const anc = anciennete(e.dateEmbauche);
    const facts = [
      ['Embauche', e.dateEmbauche ? fdate(e.dateEmbauche) : '—'],
      ['Ancienneté', anc || '—'],
      ['Contrat', (e.heuresContrat != null ? e.heuresContrat : 35) + ' h/sem.']
    ];
    if (window.canEditEmploye && window.canEditEmploye()) {
      facts.push(['Salaire de base', e.salaireBase ? Math.round(e.salaireBase) + ' €' : '—']);
    }

    return `<div class="v2-hero-res" style="--rc:${c}">
      ${av}
      <div style="min-width:0">
        <div class="v2-hero-nom">${esc(e.prenom || '')} ${esc(e.nom || '')}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px">${chips}</div>
        ${(e.email || e.telephone) ? `<div class="v2-hero-meta">${[e.email, e.telephone].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
      </div>
      <div class="v2-facts">
        ${facts.map(f => `<div class="v2-fact"><div class="v2-fact-k">${esc(f[0])}</div><div class="v2-fact-v">${esc(f[1])}</div></div>`).join('')}
      </div>
      ${liens.length ? `<div class="ev2-hero-actions">${liens.join('')}</div>` : ''}
    </div>`;
  }

  // ── tuiles statistiques (langage de la maquette : carré d'icône + nombre) ──
  function ev2Kpis(e) {
    const c = ctx();
    const id = c.id;
    const docs = c.docs || [];
    const conges = c.conges || [];
    const arrets = c.arrets || [];
    const shifts = c.planning || [];
    const paies = c.paie || [];
    const entretiens = c.entretiens || [];
    const formations = c.formationsLocales || [];
    const diplomes = c.diplomes || [];
    const histo = c.historique || [];
    const alertes = c.alertes || [];

    const annee = new Date().getFullYear();
    const joursPris = conges
      .filter(d => d.statut === 'accepte' && new Date(d.debut).getFullYear() === annee)
      .reduce((s, d) => s + (Math.ceil((new Date(d.fin) - new Date(d.debut)) / 86400000) + 1), 0);
    const enAttente = conges.filter(d => d.statut === 'en_attente').length;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const aVenir = shifts.filter(s => s.date && new Date(s.date + 'T00:00:00') >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.debut || '').localeCompare(b.debut || ''));

    const joursArret = arrets.filter(a => (a.debut || '').startsWith(String(annee)))
      .reduce((s, a) => s + (Math.round((new Date(a.fin || a.debut) - new Date(a.debut)) / 86400000) + 1), 0);

    const now = Date.now();
    const formExp = formations.filter(f => f.dateExpiration && new Date(f.dateExpiration).getTime() < now).length;
    const formSoon = formations.filter(f => f.dateExpiration && new Date(f.dateExpiration).getTime() >= now
      && (new Date(f.dateExpiration).getTime() - now) < 30 * 86400000).length;
    const diplExp = diplomes.filter(d => d.dateExpiration && new Date(d.dateExpiration).getTime() < now).length;
    const diplSoon = diplomes.filter(d => d.dateExpiration && new Date(d.dateExpiration).getTime() >= now
      && (new Date(d.dateExpiration).getTime() - now) < 60 * 86400000).length;

    const nom = `${e.prenom || ''} ${e.nom || ''}`.trim();
    // `DB` et `Auth` sont des `const` de js/app.js : ils n'existent PAS sur window.
    const base = (typeof DB !== 'undefined') ? DB : null;
    const refs = ((base && base.get(base.keys.residents)) || [])
      .filter(r => r.referent === nom && r.statut !== 'sorti');
    const journal = ((base && base.get(base.keys.auditLog)) || [])
      .filter(l => l.user === nom || (l.details && l.details.includes(nom)));
    const journalMois = journal.filter(l => {
      const d = new Date(l.date);
      return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
    }).length;
    const alertesActives = alertes.filter(a => !a.done && a.date && (new Date(a.date).getTime() - now) < 30 * 86400000).length;
    const dernierEnt = entretiens.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

    const tuiles = [
      { k: 'referents',  ic: IC.home,  c: '#14b8a6', n: refs.length,
        l: 'Résidents référés', s: refs.length ? refs.slice(0, 2).map(r => `${r.prenom || ''} ${r.nom || ''}`.trim()).join(', ') + (refs.length > 2 ? '…' : '') : 'Aucun résident' },
      { k: 'arrets',     ic: IC.heart, c: '#ef4444', n: arrets.length, l: 'Arrêts', s: joursArret + ' j en ' + annee },
      { k: 'conges',     ic: IC.sun,   c: '#f59e0b', n: joursPris + ' j', l: 'Congés pris', s: enAttente + ' en attente' },
      { k: 'planning',   ic: IC.cal,   c: '#3b82f6', n: shifts.length, l: 'Créneaux', s: aVenir.length ? aVenir.length + ' à venir' : 'Aucun à venir' },
      { k: 'formations', ic: IC.book,  c: formExp ? '#ef4444' : formSoon ? '#f59e0b' : '#10b981', n: formations.length,
        l: 'Formations', s: formExp ? formExp + ' expirée(s)' : formSoon ? formSoon + ' à renouveler' : 'À jour' },
      { k: 'diplomes',   ic: IC.cap,   c: diplExp ? '#ef4444' : diplSoon ? '#f59e0b' : '#8b5cf6', n: diplomes.length,
        l: 'Diplômes', s: diplExp ? diplExp + ' expiré(s)' : diplSoon ? diplSoon + ' à renouveler' : 'À jour' },
      { k: 'entretiens', ic: IC.chat,  c: '#6366f1', n: entretiens.length,
        l: 'Entretiens', s: dernierEnt ? 'Dernier : ' + fdate(dernierEnt.date) : 'Aucun entretien' },
      { k: 'documents',  ic: IC.clip,  c: '#22d3ee', n: docs.length,
        l: 'Documents', s: docs.length ? 'Dernier ajout' : 'Aucun fichier' },
      { k: 'paie',       ic: IC.euro,  c: '#a855f7', n: paies.length,
        l: 'Fiches de paie', s: paies.length ? String(paies[0].periode || '') : 'Aucune fiche' },
      { k: 'historique', ic: IC.trend, c: '#0ea5e9', n: histo.length,
        l: 'Historique', s: histo.length ? 'Évolutions' : 'Aucune évolution' },
      { k: 'alertes',    ic: IC.bell,  c: alertesActives ? '#ef4444' : '#64748b', n: alertesActives || alertes.filter(a => !a.done).length,
        l: alertesActives ? 'Alertes' : 'Rappels', s: alertesActives ? 'Échéance proche' : 'Aucune urgence' },
      { k: 'journal',    ic: IC.clock, c: '#818cf8', n: journal.length, l: 'Journal', s: journalMois + ' ce mois' }
    ];

    return `<div class="ev2-kgrid">${tuiles.map(t => `
      <button type="button" class="ev2-k" onclick="scrollToSection('${t.k}')">
        <span class="ev2-k-ico" style="background:${t.c}22;color:${t.c}">${svg(t.ic, 21)}</span>
        <span class="ev2-k-txt">
          <span class="ev2-k-n" style="color:${t.c}">${esc(String(t.n))}</span>
          <span class="ev2-k-l">${esc(t.l)}</span>
          <span class="ev2-k-s">${esc(t.s)}</span>
        </span>
      </button>`).join('')}</div>`;
  }

  // ── barre d'onglets (chips de la maquette) ─────────────────────────────
  function ev2TabBar() {
    return `<div class="v2-tabs">${ev2Tabs().map(t =>
      `<button type="button" class="v2-tab${t.k === EV2_TAB ? ' on' : ''}" onclick="ev2SetTab('${t.k}')">${esc(t.l)}</button>`
    ).join('')}</div>`;
  }

  // ── rail droit ─────────────────────────────────────────────────────────
  function ev2Rail(e) {
    const c = ctx();
    const shifts = (c.planning || []).slice();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const aVenir = shifts
      .filter(s => s.date && new Date(s.date + 'T00:00:00') >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.debut || '').localeCompare(b.debut || ''))
      .slice(0, 4);

    const kv = (k, v) => `<div class="v2-kv"><div class="v2-kv-k">${esc(k)}</div><div class="v2-kv-v">${esc(v || '—')}</div></div>`;

    const identite = `<div class="v2-blk v2-rail-blk">
      <div class="v2-blk-h"><div class="v2-blk-t">Fiche administrative</div></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${kv('Poste', e.poste)}
        ${kv('Statut', e.statut === 'inactif' ? 'Inactif' : 'Actif')}
        ${kv('Embauche', e.dateEmbauche ? fdate(e.dateEmbauche) : '')}
        ${kv('Ancienneté', anciennete(e.dateEmbauche) || '')}
        ${kv('Heures / sem.', (e.heuresContrat != null ? e.heuresContrat : 35) + ' h')}
        ${kv('E-mail', e.email)}
        ${kv('Téléphone', e.telephone)}
      </div>
    </div>`;

    const MOIS = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
    const creneaux = `<div class="v2-blk v2-rail-blk">
      <div class="v2-blk-h"><div class="v2-blk-t">Prochains créneaux</div>
        <a class="v2-blk-lien" href="planning-equipe.html">Planning</a></div>
      ${aVenir.length ? `<div style="display:flex;flex-direction:column;gap:10px">${aVenir.map(s => {
        const d = new Date(s.date + 'T00:00:00');
        const type = window.peShiftType ? window.peShiftType(s.debut, s.fin) : 'journee';
        const t = ((typeof PE_TYPES !== 'undefined') && PE_TYPES[type]) || { label: '', color: '#818cf8' };
        return `<div class="v2-appt" style="--pc:${t.color}">
          <div class="v2-appt-d"><div class="v2-appt-j">${d.getDate()}</div><div class="v2-appt-m">${MOIS[d.getMonth()]}</div></div>
          <div style="min-width:0">
            <div class="v2-appt-t">${esc(t.label || 'Créneau')}</div>
            <div class="v2-appt-s">${esc((s.debut || '') + ' – ' + (s.fin || ''))}</div>
          </div>
        </div>`;
      }).join('')}</div>` : '<div class="v2-blk-vide">Aucun créneau à venir.</div>'}
    </div>`;

    const journalCard = (window.empJournalCounterHtml ? window.empJournalCounterHtml(e) : '');

    return identite + creneaux + journalCard;
  }

  // ── répartition des modules dans les onglets ───────────────────────────
  function ev2Contenu(e) {
    const c = ctx();
    const docs = c.docs || [];
    const S = (id, html) => `<div id="section-${id}">${html}</div>`;
    const g2 = (a, b) => (a && b)
      ? `<div class="ev2-g2">${a}${b}</div>`
      : (a || b || '');

    const admin = !!(window.canEditEmploye && window.canEditEmploye());

    switch (EV2_TAB) {
      case 'temps':
        return S('planning', window.empPlanningHtml())
          + g2(S('conges', window.empCongesHtml()), S('arrets', window.empArretsHtml()));

      case 'carriere':
        return g2(S('formations', window.empFormationsHtml()), S('diplomes', window.empDiplomesHtml()))
          + g2(S('entretiens', window.empEntretiensHtml()), S('historique', window.empHistoriqueHtml()));

      case 'docs':
        return g2(S('documents', window.docsHtml(docs)), S('paie', window.empFichePaieHtml()));

      case 'admin':
        if (!admin) return '<div class="v2-blk"><div class="v2-blk-vide">Section réservée à l\'administration.</div></div>';
        return g2(S('messages', window.empMessagesHtml(e)),
                  e.notes ? S('notes', `<div class="v2-blk"><div class="v2-blk-h"><div class="v2-blk-t">Notes</div></div>
                    <div style="white-space:pre-wrap;line-height:1.7;font-size:12.5px;color:var(--v2-t4)">${esc(e.notes)}</div></div>`) : '')
          + g2(S('sanctions', window.empSanctionsHtml()), S('notes-admin', window.empNotesAdminHtml()))
          + S('depart', window.empDepartHtml());

      default:
        return g2(S('referents', window.empReferentsHtml(e)), S('heures', window.empHeuresHtml(e)))
          + S('alertes', window.empAlertesHtml())
          + S('journal', window.empJournalHtml(e));
    }
  }

  // ── rendu principal ────────────────────────────────────────────────────
  function ev2RenderViewMode(e) {
    const zone = document.getElementById('employeContent');
    if (!zone) return;
    const tabs = ev2Tabs();
    if (!tabs.some(t => t.k === EV2_TAB)) EV2_TAB = 'apercu';

    zone.innerHTML = `
      ${ev2Hero(e)}
      ${EV2_TAB === 'apercu' ? ev2Kpis(e) : ''}
      ${ev2TabBar()}
      <div class="v2-fiche">
        <div class="v2-fiche-main">${ev2Contenu(e)}</div>
        <div class="v2-fiche-rail">${ev2Rail(e)}</div>
      </div>`;

    if (window.initPageDocUpload) window.initPageDocUpload();
    if (window.initPaieUpload) window.initPaieUpload();
    ev2ApplyRoles();
  }

  // js/app.js masque les `.admin-only` au DOMContentLoaded uniquement : les
  // modules rendus après coup doivent être filtrés à chaque rendu.
  function ev2ApplyRoles() {
    if (typeof Auth === 'undefined') return;
    if (!Auth.isAdmin()) {
      document.querySelectorAll('#employeContent .admin-only').forEach(el => { el.style.display = 'none'; });
    }
    if (!Auth.isSuperAdmin()) {
      document.querySelectorAll('#employeContent .superadmin-only').forEach(el => { el.style.display = 'none'; });
    }
  }

  // ── mode édition (gabarit V2 : champs .v2-fld, boutons .v2-btn-sec/pri) ──
  function ev2RenderEditMode(e) {
    const zone = document.getElementById('employeContent');
    if (!zone) return;
    const c = (window.getPosteColor ? window.getPosteColor(e.poste) : '#818cf8');
    const fld = (id, label, value, type) =>
      `<div><label class="v2-fld-l" for="${id}">${esc(label)}</label>
        <input class="v2-fld" type="${type || 'text'}" id="${id}" value="${esc(value == null ? '' : value)}"/></div>`;
    const sel = (id, label, value, options) =>
      `<div><label class="v2-fld-l" for="${id}">${esc(label)}</label>
        <select class="v2-fld" id="${id}">${options.map(o =>
          `<option value="${esc(o[0])}"${value === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;

    // Le poste courant doit toujours figurer dans la liste : sans cela, un poste
    // absent du référentiel serait effacé en silence à l'enregistrement.
    const postes = (window.getPosteOptions ? window.getPosteOptions().slice() : [['', '—']]);
    if (e.poste && !postes.some(o => o[0] === e.poste)) postes.unshift([e.poste, e.poste]);

    zone.innerHTML = `
      ${ev2Hero(e)}
      <div class="v2-blk ev2-edit" style="--mc:${c};margin-top:18px">
        <div class="v2-blk-h"><div class="v2-blk-t">Modifier la fiche</div>
          <span class="v2-badge v2-b-info" style="margin-left:auto">Édition</span></div>
        <div class="ev2-form">
          ${fld('ePrenom', 'Prénom', e.prenom)}
          ${fld('eNom', 'Nom', e.nom)}
          ${sel('ePoste', 'Poste', e.poste, postes)}
          ${sel('eStatut', 'Statut', e.statut, [['actif', 'Actif'], ['inactif', 'Inactif']])}
          ${fld('eTel', 'Téléphone', e.telephone)}
          ${fld('eEmail', 'E-mail', e.email)}
          ${fld('eDateEmbauche', "Date d'embauche", e.dateEmbauche, 'date')}
          ${fld('eColor', 'Couleur', e.color || '#818cf8', 'color')}
          ${fld('eHeuresContrat', 'Heures contractuelles / semaine', e.heuresContrat == null ? 35 : e.heuresContrat, 'number')}
          ${fld('eSalaireBase', 'Salaire mensuel brut de base (€)', e.salaireBase == null ? 0 : e.salaireBase, 'number')}
        </div>
        <div style="margin-top:16px">
          <label class="v2-fld-l" for="eNotes">Notes</label>
          <textarea class="v2-fld" id="eNotes" rows="4">${esc(e.notes || '')}</textarea>
        </div>
        <div class="ev2-edit-f">
          <button type="button" class="v2-btn-sec" onclick="cancelPageEdit()">Annuler</button>
          <button type="button" class="v2-btn-pri" onclick="savePageEdit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>
            Enregistrer
          </button>
        </div>
      </div>`;
  }

  // ── navigation ─────────────────────────────────────────────────────────
  function ev2SetTab(k) {
    EV2_TAB = k;
    if (window.loadEmploye) window.loadEmploye();
    const zone = document.getElementById('employeContent');
    if (zone) zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Remplace scrollToSection : la section visée peut vivre dans un autre onglet.
  function ev2ScrollToSection(id) {
    const cible = EV2_SECTION_TAB[id];
    if (cible && cible !== EV2_TAB && ev2Tabs().some(t => t.k === cible)) {
      EV2_TAB = cible;
      if (window.loadEmploye) window.loadEmploye();
    }
    requestAnimationFrame(() => {
      const el = document.getElementById('section-' + id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Les `const`/`let` de premier niveau ne créent pas de propriété sur window :
  // on publie explicitement tout ce que lisent les onclick en ligne.
  window.ev2RenderViewMode = ev2RenderViewMode;
  window.ev2RenderEditMode = ev2RenderEditMode;
  window.ev2SetTab = ev2SetTab;
  window.scrollToSection = ev2ScrollToSection;
  window.ev2CurrentTab = () => EV2_TAB;
})();
