/* ══════════════════════════════════════════════════════════════════════════
   GUIDE DE FORMATION — rendu V2 « cockpit » (thème sombre)
   Reprend le langage visuel de la maquette « Portail — refonte (bento) » :
   rail de navigation groupé à icônes dégradées, cartes bento, chips, tableau.

   Page 100 % statique (aucune source Supabase) : le contenu du guide est
   décrit ici sous forme de données et rendu en une passe.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSION_MAJ = '20/06/2026';

  /* ── Icônes SVG (traits, bornées en CSS) ────────────────────────────── */
  var IC = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    house: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    clip: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
    door: '<path d="M13 4v16"/><path d="M4 21h16"/><path d="M17 3H7a1 1 0 0 0-1 1v17h12V4a1 1 0 0 0-1-1z"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    meal: '<path d="M3 2v7a3 3 0 0 0 6 0V2"/><line x1="6" y1="9" x2="6" y2="22"/><path d="M17 2c-1.7 1.2-2.5 3.2-2.5 5.5S15.3 12 17 13v9"/>',
    pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l7-7a5 5 0 0 1 7 7z"/><line x1="8" y1="8" x2="16" y2="16"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5a8.5 8.5 0 0 1 8.5-8.5A8.4 8.4 0 0 1 21 11.5z"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.7 1.1-1a5.5 5.5 0 0 0 0-7.9z"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    hands: '<path d="M20 21v-2a4 4 0 0 0-3-3.9"/><path d="M4 21v-2a4 4 0 0 1 3-3.9"/><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/>',
    family: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    team: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="17" x2="12" y2="22"/>',
    cap: '<path d="M22 9 12 4 2 9l10 5z"/><path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
    euro: '<path d="M17.2 7a6 7 0 1 0 0 10"/><path d="M13 10H5m0 4h8"/>',
    siren: '<path d="M5 21h14"/><path d="M7 21v-7a5 5 0 0 1 10 0v7"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="5" y1="8" x2="3" y2="7"/><line x1="19" y1="8" x2="21" y2="7"/>',
    bed: '<path d="M2 20V9"/><path d="M2 13h20v7"/><path d="M22 13v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
    car: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><line x1="9" y1="17" x2="15" y2="17"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 8 2.6h.1A2 2 0 0 1 10 1h4a2 2 0 0 1 2 2v.1A1.7 1.7 0 0 0 19 4.6"/>',
    heartp: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* Autorise uniquement <strong> dans les textes rédigés du guide. */
  function rich(s) {
    return esc(s).replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
  }
  function svg(d, cls) {
    return '<svg class="' + (cls || 'gf-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  function grad(c) { return 'linear-gradient(135deg,' + c[0] + ',' + c[1] + ')'; }

  /* ── Rôles ──────────────────────────────────────────────────────────── */
  var ROLES = [
    { nom: 'Administrateur', badge: 'Admin', c: '#ef4444', ic: IC.gear, droits: [
      'Accès total à tous les modules',
      'Gestion des utilisateurs et droits',
      "Configuration de l'établissement",
      'Gestion multi-établissements',
      'Accès aux logs et audit'
    ]},
    { nom: 'Éducateur', badge: 'Éducateur', c: '#f59e0b', ic: IC.user, droits: [
      'Modifier les fiches résidents',
      'Saisir présences, repas, médicaments',
      'Créer des événements agenda',
      'Rédiger journal et transmissions',
      'Accès au cahier de nuit'
    ]},
    { nom: 'Stagiaire / Veilleur', badge: 'Stagiaire', c: '#10b981', ic: IC.moon, droits: [
      'Consultation des fiches (lecture)',
      'Saisir les présences',
      'Lire les transmissions',
      'Signaler un incident'
    ]},
    { nom: 'Direction', badge: 'Direction', c: '#8b5cf6', ic: IC.chart, droits: [
      'Tableau de bord & statistiques',
      'Accès aux rapports',
      'Gestion RH (congés, entretiens)',
      'Budget et facturation',
      'Registre EIG'
    ]}
  ];

  /* ── Carte des synchronisations ─────────────────────────────────────── */
  var SYNCS = [
    { src: 'Fiche résident', c: '#22d3ee',
      vers: 'Présences · Repas · Médicaments · Activités · Agenda · Journal · Transmissions · Nuit · Évaluations · Documents',
      quoi: 'Nom, photo, couleur, régime alimentaire, allergies, médicaments, planning récurrent' },
    { src: 'Agenda', c: '#f59e0b', vers: 'Fiche résident (carte Planning) · Alertes',
      quoi: "Événements par résident visibles dans la carte planning. Dates d'échéance → alertes automatiques" },
    { src: 'Activités', c: '#10b981', vers: 'Fiche résident (carte Planning) · Présences',
      quoi: 'Inscriptions par jour de semaine → chips dans le planning résident · badge d’absence récurrente dans présences' },
    { src: 'Repas', c: '#ef4444', vers: 'Fiche résident (régime) · Synthèse cuisine',
      quoi: 'Allergies et régime pré-remplis depuis la fiche santé · choix menu M1/M2 visibles en synthèse' },
    { src: 'Médicaments', c: '#8b5cf6', vers: 'Présences · Fiche résident',
      quoi: 'Traitements depuis la fiche résident · badge planning dans la page médicaments si résident travaille' },
    { src: 'Présences', c: '#0d9488', vers: 'Tableau de bord · Statistiques · Rapport',
      quoi: 'Taux de présence, absences, statistiques mensuelles' },
    { src: 'Admissions', c: '#d97706', vers: 'Résidents · Chambres · ViaTrajectoire',
      quoi: "Dossier d'admission → création automatique de la fiche résident et attribution de chambre" },
    { src: 'Planning équipe', c: '#818cf8', vers: 'Congés · Astreintes',
      quoi: 'Absences validées reflétées dans le planning · astreintes affichées dans le planning équipe' }
  ];

  /* ── Modules, groupés par domaine ───────────────────────────────────── */
  var GROUPES = [
    { id: 'm-residents', titre: 'Résidents', ic: IC.house, c: ['#0891b2', '#22d3ee'], mods: [
      { nom: 'Liste des résidents', page: 'residents.html', ic: IC.house, c: ['#0891b2', '#22d3ee'], accent: '#22d3ee',
        desc: "Page principale listant tous les résidents actifs de l'établissement. Point d'entrée vers les fiches individuelles.",
        feats: ['Recherche et filtre par nom, statut, chambre', 'Vue cartes ou tableau',
          'Accès direct à la fiche depuis chaque carte', "Création d'un nouveau résident",
          'Indicateurs visuels : couleur de la carte = couleur du résident'],
        syncs: ['→ Fiche résident', '→ Agenda', '→ Repas'] },
      { id: 'm-fiche', nom: 'Fiche résident', page: 'resident.html', ic: IC.clip, c: ['#0891b2', '#22d3ee'], accent: '#22d3ee',
        desc: "Dossier complet du résident. Organisé en cartes thématiques, c'est la source de toutes les données personnelles.",
        feats: ["<strong>Séjour</strong> : dates d'entrée/sortie, chambre, statut",
          '<strong>Santé</strong> : allergies, régime, médecin, traitements',
          '<strong>Situation</strong> (adulte) ou <strong>Profil enfant</strong>',
          '<strong>Budget</strong> : argent de poche, caution',
          '<strong>Trousseau</strong> : liste des affaires',
          '<strong>Activités</strong> : inscriptions aux activités récurrentes',
          "<strong>Planning</strong> : vue 7 jours lue depuis l'agenda + activités",
          '<strong>Sorties & permissions</strong> : avec barre de défilement (3 visible)',
          '<strong>Objectifs</strong>, <strong>Évaluations</strong>, <strong>Notes</strong>, <strong>Contacts</strong>',
          'Mode lecture / mode édition selon droits'],
        syncs: ['← Agenda (planning 7j)', '← Activités', '→ Repas (régime)', '→ Médicaments'] },
      { id: 'm-admissions', nom: 'Admissions', page: 'admissions.html', ic: IC.door, c: ['#b45309', '#d97706'], accent: '#fbbf24',
        desc: "Gestion du processus d'admission : du dossier de candidature jusqu'à l'entrée dans l'établissement.",
        feats: ['Suivi des dossiers en attente, en cours, validés', 'Création de dossier de pré-admission',
          'Validation → création automatique de la fiche résident', "Attribution de chambre dès l'admission",
          'Lien avec ViaTrajectoire'],
        syncs: ['→ Résidents', '→ Chambres', '→ ViaTrajectoire'] }
    ]},
    { id: 'm-presences', titre: 'Vie quotidienne', ic: IC.check, c: ['#16a34a', '#4ade80'], mods: [
      { nom: 'Présences', page: 'presences.html', ic: IC.check, c: ['#16a34a', '#4ade80'], accent: '#4ade80',
        desc: 'Pointage quotidien des présences et absences. Vue par date avec filtre de sélection.',
        feats: ['Cocher présent / absent / sortie pour chaque résident',
          "Badge automatique si le résident a un planning d'absence récurrente (ex : travail)",
          'Statistiques mensuelles par résident', 'Filtre « Présents seulement »',
          'Navigation par date (flèches ou sélecteur)'],
        syncs: ['← Résidents (liste)', '← Fiche résident (planning récurrent)', '→ Tableau de bord'] },
      { id: 'm-repas', nom: 'Repas & régimes', page: 'repas.html', ic: IC.meal, c: ['#f59e0b', '#fbbf24'], accent: '#fbbf24',
        desc: 'Gestion des inscriptions aux repas (midi et soir) avec choix de menu. Synthèse pour la cuisine.',
        feats: ['<strong>Vue Cartes</strong> : carte par résident, cases à cocher midi/soir',
          '<strong>Vue Tableau</strong> : vue synthétique en liste',
          '<strong>Vue Semaine</strong> : 7 colonnes, réservation à l’avance',
          'Choix <strong>Menu 1 / Menu 2</strong> sur les repas midi et soir',
          'Copier une semaine vers la semaine suivante',
          'Synthèse cuisine par régime avec compteurs M1/M2',
          'Allergies pré-remplies depuis la fiche santé',
          'Filtre de recherche résident au-dessus des cartes',
          'Feuille cuisine imprimable'],
        syncs: ['← Résidents (régime, allergies)', '→ Synthèse cuisine'] },
      { id: 'm-medicaments', nom: 'Médicaments', page: 'medicaments.html', ic: IC.pill, c: ['#e11d48', '#f87171'], accent: '#fca5a5',
        desc: 'Distribution quotidienne des médicaments par résident et par moment (matin, midi, soir, coucher).',
        feats: ['Traitements issus de la fiche santé du résident',
          'Statut par prise : Donné · Refusé (+ motif) · En attente',
          'Bouton « Refusé » : ouvre automatiquement le modal de saisie du motif',
          'Badge planning si le résident est absent ce jour (travail/autre)',
          'Filtre « Présents seulement »', 'Navigation par date'],
        syncs: ['← Fiche résident (traitements)', '← Présences (absences)'] },
      { id: 'm-activites', nom: 'Activités éducatives', page: 'activites.html', ic: IC.target, c: ['#8b5cf6', '#a78bfa'], accent: '#a78bfa',
        desc: 'Gestion des activités récurrentes hebdomadaires. Les résidents s’y inscrivent et les éducateurs suivent la participation.',
        feats: ['Créer des activités avec jour, heure, catégorie', 'Inscrire des résidents à une activité',
          'Bilans de participation par session',
          'Les activités apparaissent dans la carte Planning de la fiche résident (lecture seule, par jour de semaine)',
          'Catégories configurables (sport, culture, cuisine…)'],
        syncs: ['→ Fiche résident (carte Planning)', '→ Présences (badge absence)'] },
      { id: 'm-planning', nom: 'Agenda', page: 'planning.html', ic: IC.cal, c: ['#d97706', '#fbbf24'], accent: '#fbbf24',
        desc: 'Agenda partagé de l’établissement. Tous les événements ponctuels ou récurrents des résidents et de la structure.',
        feats: ['Vue semaine / mois / liste', 'Créer un événement : titre, type, date, heure, couleur, lieu, notes',
          'Récurrences : quotidienne, hebdomadaire, bimensuelle, mensuelle',
          'Associer à un ou plusieurs résidents', 'Supprimer un événement ou toute la série',
          'Les événements apparaissent dans la carte Planning de la fiche résident',
          "Filtrer par résident ou type d'événement"],
        syncs: ['→ Fiche résident (carte Planning 7j)', '→ Alertes (échéances)'] },
      { id: 'm-journal', nom: 'Journal de bord', page: 'journal.html', ic: IC.book, c: ['#16a34a', '#4ade80'], accent: '#4ade80',
        desc: 'Cahier de bord collectif de l’établissement. Chaque entrée est horodatée et signée par l’auteur.',
        feats: ['Saisie libre avec tag de catégorie (observation, événement, soin…)',
          'Lier une entrée à un résident', 'Recherche par date, auteur, résident ou catégorie',
          'Visible par toute l’équipe'],
        syncs: ['← Résidents', '↔ Transmissions (complémentaires)'] },
      { id: 'm-transmissions', nom: 'Transmissions', page: 'transmissions.html', ic: IC.chat, c: ['#0284c7', '#38bdf8'], accent: '#38bdf8',
        desc: 'Messages de passation entre équipes (relèves). Permet la continuité entre équipes du matin, de l’après-midi et de nuit.',
        feats: ['Rédiger une transmission ciblée (résident ou général)',
          'Niveaux d’urgence : info / attention / urgent',
          'Badge de notification non lue sur la page d’accueil',
          'Marquer comme lu / résolu', 'Historique archivé par date'],
        syncs: ['← Résidents', '→ Notifications accueil'] },
      { id: 'm-nuit', nom: 'Cahier de nuit', page: 'nuit.html', ic: IC.moon, c: ['#4f46e5', '#818cf8'], accent: '#a5b4fc',
        desc: 'Journal dédié aux équipes de nuit. Permet de consigner les événements et observations entre 20h et 8h.',
        feats: ['Saisie horodatée par résident', 'Catégories nuit : repos, levé, incident, soins…',
          'Vue synthétique de la nuit passée', 'Accessible aux veilleurs sans droits complets'],
        syncs: ['← Résidents'] },
      { id: 'm-viequot', nom: 'Vie quotidienne', page: 'vie-quotidienne.html', ic: IC.grid, c: ['#0d9488', '#22d3ee'], accent: '#22d3ee',
        desc: 'Tableau de bord consolidé pour le travail du jour : présences, repas, médicaments et activités en un seul écran.',
        feats: ['Vue rapide de tous les modules du quotidien', 'Idéal pour démarrer la journée',
          'Raccourcis vers chaque module en détail'],
        syncs: ['← Présences', '← Repas', '← Médicaments', '← Activités'] }
    ]},
    { id: 'm-dossiers', titre: 'Dossiers & suivi', ic: IC.house, c: ['#b45309', '#d97706'], mods: [
      { nom: 'Dossiers & suivi', page: 'dossiers.html', ic: IC.house, c: ['#b45309', '#d97706'], accent: '#fbbf24',
        desc: 'Portail centralisé vers tous les modules liés aux dossiers individuels des résidents (PPE, documents, admissions, etc.).',
        feats: ["Accès PPE (Projet Personnalisé d'Établissement)", 'Accès aux documents numérisés',
          'Suivi ViaTrajectoire', 'Répertoire de contacts', 'Registre des incidents EIG', "Dossiers d'admission"],
        syncs: [] },
      { id: 'm-documents', nom: 'Documents', page: 'documents.html', ic: IC.file, c: ['#b45309', '#d97706'], accent: '#fbbf24',
        desc: 'Gestion documentaire par résident : dépôt, classement et consultation des pièces du dossier.',
        feats: ['Dépôt de documents (PDF, images, Word…)',
          'Classement par catégorie (identité, médical, administratif…)',
          'Consultation et téléchargement', 'Historique des documents par résident'],
        syncs: ['← Résidents'] },
      { id: 'm-evaluations', nom: 'Évaluations', page: "objectifs.html (onglet Grilles d'évaluation)", ic: IC.chart, c: ['#9333ea', '#c084fc'], accent: '#c084fc',
        desc: 'Grilles d’évaluation standardisées par résident. Suivi de l’évolution dans le temps.',
        feats: ['Grilles personnalisables par type', 'Historique des évaluations avec comparaison',
          'Export / impression', 'Résumé visible dans la fiche résident'],
        syncs: ['← Résidents', '→ Fiche résident (carte Évaluations)'] },
      { id: 'm-plansoins', nom: 'Plan de soins', page: 'plan-soins.html', ic: IC.heartp, c: ['#0d9488', '#22d3ee'], accent: '#22d3ee',
        desc: 'Rédaction et suivi des plans de soins individualisés. Complémentaire à la fiche santé.',
        feats: ['Rédaction du plan par résident', 'Objectifs et actions de soins',
          "Suivi d'avancement", 'Historique et révisions'],
        syncs: ['← Résidents'] },
      { id: 'm-eig', nom: 'Registre EIG', page: 'eig.html', ic: IC.warn, c: ['#e11d48', '#f87171'], accent: '#fca5a5',
        desc: 'Événements Indésirables Graves : déclaration, suivi et clôture des EIG réglementaires.',
        feats: ['Déclaration avec gravité, type et description',
          'Suivi de l’analyse et des mesures correctives', 'Clôture et archivage',
          'Export pour les autorités de contrôle'],
        syncs: ['← Résidents'] },
      { id: 'm-viatrajectoire', nom: 'ViaTrajectoire', page: 'viatrajectoire.html', ic: IC.refresh, c: ['#0891b2', '#22d3ee'], accent: '#22d3ee',
        desc: 'Interface de suivi des dossiers ViaTrajectoire (orientations médico-sociales) avec statuts mis à jour.',
        feats: ['Liste des dossiers en attente / acceptés / refusés', 'Mise à jour du statut',
          "Lien avec le dossier d'admission"],
        syncs: ['← Admissions'] }
    ]},
    { id: 'm-cvs', titre: 'Vie sociale', ic: IC.hands, c: ['#16a34a', '#4ade80'], mods: [
      { nom: 'Vie Sociale (CVS)', page: 'cvs.html', ic: IC.hands, c: ['#16a34a', '#4ade80'], accent: '#4ade80',
        desc: 'Conseil de la Vie Sociale : gestion des réunions, ordre du jour, comptes rendus et votes.',
        feats: ['Planification des réunions CVS', "Saisie de l'ordre du jour",
          'Rédaction du compte rendu', 'Suivi des décisions et points ouverts'],
        syncs: ['← Résidents', '← Agenda'] },
      { id: 'm-visites', nom: 'Visites & famille', page: 'visites.html', ic: IC.family, c: ['#7c3aed', '#a78bfa'], accent: '#a78bfa',
        desc: 'Registre des visites reçues par les résidents. Suivi des visiteurs et fréquence des visites.',
        feats: ['Enregistrer une visite (visiteur, lien, durée)', 'Historique par résident',
          'Statistiques de fréquence des visites'],
        syncs: ['← Résidents'] },
      { id: 'm-satisfaction', nom: 'Satisfaction résidents', page: 'satisfaction.html', ic: IC.star, c: ['#f59e0b', '#fcd34d'], accent: '#fcd34d',
        desc: 'Enquêtes de satisfaction périodiques auprès des résidents. Résultats et analyse.',
        feats: ['Création de questionnaires personnalisés', 'Collecte des réponses par résident',
          'Visualisation des résultats et moyennes', 'Comparaison entre périodes'],
        syncs: ['← Résidents'] }
    ]},
    { id: 'm-planningequipe', titre: 'RH & Pilotage', ic: IC.team, c: ['#0891b2', '#22d3ee'], mods: [
      { nom: 'Planning équipe', page: 'planning-equipe.html', ic: IC.team, c: ['#0891b2', '#22d3ee'], accent: '#22d3ee',
        desc: 'Planning du personnel de l’établissement. Gestion des rotations, horaires et affectations.',
        feats: ['Vue semaine et mois pour tous les employés', 'Saisie des horaires par personne',
          'Codes de présence personnalisables (matin, soir, nuit…)',
          'Congés validés remontés automatiquement', 'Impression du planning'],
        syncs: ['← Congés (absences validées)', '← Astreintes'] },
      { id: 'm-conges', nom: 'Congés', page: 'conges.html', ic: IC.sun, c: ['#0891b2', '#22d3ee'], accent: '#22d3ee',
        desc: 'Demande et validation des congés du personnel. Suivi du solde.',
        feats: ["Demande de congé par l'employé", 'Validation par le responsable',
          'Solde de congés mis à jour automatiquement', 'Calendrier des absences validées'],
        syncs: ['→ Planning équipe'] },
      { id: 'm-entretiens', nom: 'Entretiens professionnels', page: 'entretiens.html', ic: IC.mic, c: ['#7c3aed', '#a78bfa'], accent: '#a78bfa',
        desc: 'Planification et suivi des entretiens annuels et professionnels des employés.',
        feats: ['Planifier un entretien par employé', 'Grille d’évaluation employé',
          'Objectifs fixés et suivi', 'Historique des entretiens passés'],
        syncs: ['← Employés'] },
      { id: 'm-formations', nom: 'Plan de formation', page: 'formations.html', ic: IC.cap, c: ['#7c3aed', '#a78bfa'], accent: '#a78bfa',
        desc: 'Gestion du plan de formation de l’établissement. Suivi des formations par employé.',
        feats: ['Référencer les formations disponibles', 'Inscrire des employés à des formations',
          'Suivi des coûts et financements', 'Attestations de formation'],
        syncs: [] },
      { id: 'm-budget', nom: 'Budget & dépenses', page: 'budget.html', ic: IC.euro, c: ['#16a34a', '#4ade80'], accent: '#4ade80',
        desc: 'Suivi budgétaire de l’établissement. Enveloppes par poste, demandes de dépenses et soldes.',
        feats: ['Définir des enveloppes budgétaires par catégorie', 'Saisir des demandes de dépenses',
          'Validation des dépenses', 'Suivi du solde en temps réel', 'Budget argent de poche résidents'],
        syncs: [] },
      { id: 'm-incidents', nom: 'Incidents', page: 'incidents.html', ic: IC.siren, c: ['#e11d48', '#f87171'], accent: '#fca5a5',
        desc: 'Registre des incidents déclarés. Accessible depuis le bouton rouge flottant de l’accueil.',
        feats: ["Déclaration rapide depuis l'accueil (bouton d'alerte)",
          'Qualification : type, gravité, personnes impliquées',
          'Suivi de traitement et clôture', "Badge de notification sur l'accueil",
          'Lien avec le registre EIG pour les incidents graves'],
        syncs: ['← Résidents', '→ EIG (si grave)'] }
    ]},
    { id: 'm-chambres', titre: 'Infrastructure', ic: IC.bed, c: ['#4f46e5', '#818cf8'], mods: [
      { nom: 'Chambres', page: 'chambres.html', ic: IC.bed, c: ['#4f46e5', '#818cf8'], accent: '#a5b4fc',
        desc: 'Plan de l’établissement avec occupation des chambres. État des lieux intégrés.',
        feats: ['Vue des chambres avec statut (occupé / libre / en travaux)',
          'Attribution d’un résident à une chambre', 'État des lieux d’entrée et de sortie',
          'Historique d’occupation'],
        syncs: ['← Résidents', '← Admissions'] },
      { id: 'm-vehicules', nom: 'Véhicules', page: 'vehicules.html', ic: IC.car, c: ['#4f46e5', '#818cf8'], accent: '#a5b4fc',
        desc: 'Gestion du parc véhicule de l’établissement. Réservations et carnet d’entretien.',
        feats: ['Liste des véhicules avec immatriculation', 'Réservation par créneau',
          'Kilométrage et entretiens', 'Contrôles techniques et assurances'],
        syncs: [] },
      { id: 'm-inventaire', nom: 'Inventaire', page: 'inventaire.html', ic: IC.box, c: ['#b45309', '#d97706'], accent: '#fbbf24',
        desc: 'Inventaire des biens de l’établissement et trousseau des résidents.',
        feats: ["Inventaire du matériel de l'établissement",
          'Trousseau individuel par résident (depuis la fiche)',
          'Signalement de manque ou de casse'],
        syncs: ['← Résidents (trousseau)'] }
    ]},
    { id: 'm-dashboard', titre: 'Administration & outils', ic: IC.chart, c: ['#4f46e5', '#818cf8'], mods: [
      { nom: 'Tableau de bord', page: 'dashboard.html', ic: IC.chart, c: ['#4f46e5', '#818cf8'], accent: '#a5b4fc',
        desc: 'Vue synthétique des indicateurs clés de l’établissement. Actualisé en temps réel.',
        feats: ["Taux d'occupation des chambres", 'Présences du jour', 'Repas du jour par type',
          'Événements agenda à venir', 'Incidents non clôturés', 'Alertes actives'],
        syncs: ['← Présences', '← Repas', '← Agenda', '← Incidents'] },
      { id: 'm-alertes', nom: 'Alertes', page: 'alertes.html', ic: IC.bell, c: ['#e11d48', '#f87171'], accent: '#fca5a5',
        desc: 'Centre de notifications : alertes automatiques sur les échéances, incidents non traités, transmissions urgentes.',
        feats: ["Alertes d'échéances (renouvellements, bilans…)", 'Transmissions urgentes non lues',
          'Incidents ouverts sans suivi', "Badge rouge sur la page d'accueil", 'Marquer comme lu / traité'],
        syncs: ['← Agenda (dates)', '← Transmissions (urgentes)', '← Incidents'] },
      { id: 'm-messages', nom: 'Messages internes', page: 'messages.html', ic: IC.mail, c: ['#0284c7', '#38bdf8'], accent: '#38bdf8',
        desc: 'Messagerie interne entre membres de l’équipe. Différent des transmissions (ciblé personne à personne).',
        feats: ['Envoyer un message à un ou plusieurs collègues', 'Notifications de nouveaux messages',
          'Historique des conversations'],
        syncs: [] },
      { id: 'm-admin', nom: 'Administration', page: 'admin.html · admin-modules.html', ic: IC.gear, c: ['#64748b', '#94a3b8'], accent: '#cbd5e1',
        desc: 'Configuration complète du logiciel. Réservé aux administrateurs.',
        feats: ['Gestion des utilisateurs (ajout, droits, mot de passe)',
          'Activation / désactivation des modules',
          "Paramètres de l'établissement (nom, logo, couleur)",
          'Gestion multi-établissements', 'Export des données', 'Logs de connexion et audit'],
        syncs: [] }
    ]}
  ];

  /* ── Conseils pratiques ─────────────────────────────────────────────── */
  var CONSEILS = [
    { t: 'Démarrage de journée', ic: IC.sun, c: '#fbbf24', pts: [
      'Commencer par <strong>Vie quotidienne</strong> pour une vue globale',
      'Vérifier les <strong>Alertes</strong> (badge rouge accueil)',
      'Pointer les <strong>Présences</strong> du jour',
      'Vérifier les <strong>Transmissions</strong> de la nuit'] },
    { t: 'Gestion des repas', ic: IC.meal, c: '#f59e0b', pts: [
      'Utiliser la <strong>vue Semaine</strong> pour planifier à l’avance',
      'Copier la semaine pour éviter la re-saisie',
      'Les choix <strong>Menu 1 / Menu 2</strong> sont mémorisés',
      'Imprimer la feuille cuisine avant chaque repas'] },
    { t: 'Agenda & planning résident', ic: IC.cal, c: '#22d3ee', pts: [
      'Les événements créés dans <strong>l’Agenda</strong> apparaissent automatiquement dans la carte Planning de chaque fiche résident',
      'On peut aussi ajouter un événement directement depuis la fiche résident (bouton + Ajouter)',
      'Les activités (par jour de semaine) s’affichent en bleu, les événements agenda en couleur'] },
    { t: 'Médicaments', ic: IC.pill, c: '#fca5a5', pts: [
      'Cliquer « Refusé » ouvre <strong>automatiquement</strong> la fenêtre de saisie du motif',
      'Les traitements viennent de la fiche santé du résident',
      'Un badge apparaît si le résident est censé être absent (planning récurrent)'] },
    { t: 'Recherche rapide', ic: IC.search, c: '#a78bfa', pts: [
      'La <strong>barre de recherche</strong> sur l’accueil cherche dans résidents, agenda et documents',
      'Chaque module a son propre filtre de recherche par nom de résident',
      'Le filtre Repas fonctionne aussi en vue Semaine'] },
    { t: 'Signaler un incident', ic: IC.siren, c: '#f87171', pts: [
      'Le bouton rouge flottant sur l’accueil est accessible à tous les rôles',
      'Les admins accèdent à la liste complète sur <strong>incidents.html</strong>',
      'Les incidents graves peuvent être remontés en <strong>EIG</strong>'] }
  ];

  var FLOW = [
    { l: 'Fiche résident', on: true }, { l: 'Présences' }, { l: 'Repas' },
    { l: 'Médicaments' }, { l: 'Activités' }, { l: 'Agenda' }
  ];

  /* ── Navigation (rail) ──────────────────────────────────────────────── */
  function navGroupes() {
    var g = [{ label: 'Introduction', items: [
      { id: 'intro', label: "Vue d'ensemble", ic: IC.home, c: ['#4f46e5', '#818cf8'] },
      { id: 'roles', label: 'Rôles & droits', ic: IC.user, c: ['#e11d48', '#f87171'] },
      { id: 'synchros', label: 'Synchronisations', ic: IC.link, c: ['#0891b2', '#22d3ee'] }
    ]}];
    GROUPES.forEach(function (grp) {
      g.push({ label: grp.titre, items: grp.mods.map(function (m, i) {
        return { id: m.id || grp.id, label: m.nom, ic: m.ic, c: m.c };
      })});
    });
    g.push({ label: 'Pour aller plus loin', items: [
      { id: 'conseils', label: 'Conseils pratiques', ic: IC.bulb, c: ['#f59e0b', '#fcd34d'] }
    ]});
    return g;
  }

  /* ── Rendu ──────────────────────────────────────────────────────────── */
  function renderNav() {
    var el = document.getElementById('gfNav');
    if (!el) return;
    el.innerHTML = navGroupes().map(function (g) {
      return '<div class="gf-nav-g">' +
        '<div class="gf-nav-lbl">' + esc(g.label) + '</div>' +
        g.items.map(function (it) {
          return '<button type="button" class="gf-nav-l" data-goto="' + esc(it.id) + '">' +
            '<span class="gf-nav-i" style="background:' + grad(it.c) + '">' + svg(it.ic) + '</span>' +
            '<span class="gf-nav-t">' + esc(it.label) + '</span></button>';
        }).join('') + '</div>';
    }).join('');
  }

  function modCard(m, grpId) {
    var id = m.id || grpId;
    return '<article class="gf-mod" id="' + esc(id) + '" style="--c:' + m.accent + '" ' +
      'data-q="' + esc((m.nom + ' ' + m.page + ' ' + m.desc + ' ' + m.feats.join(' ')).toLowerCase()) + '">' +
      '<div class="gf-mod-h">' +
        '<span class="gf-mod-i" style="background:' + grad(m.c) + '">' + svg(m.ic) + '</span>' +
        '<div class="gf-mod-hx"><div class="gf-mod-t">' + esc(m.nom) + '</div>' +
        '<span class="gf-mod-p">' + esc(m.page) + '</span></div>' +
      '</div>' +
      '<p class="gf-mod-d">' + rich(m.desc) + '</p>' +
      '<ul class="gf-feat">' + m.feats.map(function (f) {
        return '<li>' + rich(f) + '</li>';
      }).join('') + '</ul>' +
      (m.syncs.length
        ? '<div class="gf-syncs">' + m.syncs.map(function (s) {
            return '<span class="gf-tag">' + esc(s) + '</span>';
          }).join('') + '</div>'
        : '') +
      '</article>';
  }

  function renderContenu() {
    var el = document.getElementById('gfContenu');
    if (!el) return;
    var h = '';

    /* — Vue d'ensemble — */
    h += '<section id="intro" class="gf-sec">' +
      '<div class="v2-sep"><span class="v2-sep-txt">Organisation générale</span><span class="v2-sep-line"></span></div>' +
      '<div class="v2-blk">' +
        '<div class="v2-blk-h">' + svg(IC.grid, 'v2-blk-ico') +
          '<span class="v2-blk-t">Une source centrale : la fiche résident</span></div>' +
        '<p class="gf-p">INTERNALIS est organisé autour d’une <strong>source centrale</strong> : la fiche résident. ' +
        'Tous les modules s’y connectent pour lire ou écrire des données.</p>' +
        '<div class="gf-flow">' + FLOW.map(function (n, i) {
          return (i ? '<span class="gf-flow-a">↔</span>' : '') +
            '<span class="gf-flow-n' + (n.on ? ' on' : '') + '">' + esc(n.l) + '</span>';
        }).join('') + '</div>' +
        '<div class="gf-note gf-note-info">' +
          '<div class="gf-note-h">' + svg(IC.bulb, 'v2-blk-ico') + 'Principe clé</div>' +
          '<p>Les données saisies dans un module sont <strong>immédiatement disponibles</strong> dans les autres ' +
          'modules concernés. Il n’y a pas d’import/export manuel — tout est synchronisé en temps réel.</p>' +
        '</div>' +
      '</div></section>';

    /* — Rôles — */
    h += '<section id="roles" class="gf-sec">' +
      '<div class="v2-sep"><span class="v2-sep-txt">Rôles & droits d’accès</span><span class="v2-sep-line"></span></div>' +
      '<div class="gf-roles">' + ROLES.map(function (r) {
        return '<div class="v2-blk gf-role" style="--c:' + r.c + '">' +
          '<div class="gf-role-h"><span class="gf-role-i">' + svg(r.ic) + '</span>' +
            '<div><span class="gf-role-b">' + esc(r.badge) + '</span>' +
            '<div class="gf-role-n">' + esc(r.nom) + '</div></div></div>' +
          '<ul class="gf-role-ul">' + r.droits.map(function (d) {
            return '<li>' + esc(d) + '</li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div>' +
      '<div class="gf-note gf-note-warn">' +
        '<div class="gf-note-h">' + svg(IC.warn, 'v2-blk-ico') + 'Important</div>' +
        '<p>Les droits sont configurés par module dans <strong>Administration → Modules</strong>. ' +
        'Un module désactivé disparaît du menu pour tous les utilisateurs concernés.</p>' +
      '</div></section>';

    /* — Synchros — */
    h += '<section id="synchros" class="gf-sec">' +
      '<div class="v2-sep"><span class="v2-sep-txt">Carte des synchronisations</span><span class="v2-sep-line"></span></div>' +
      '<div class="v2-blk">' +
        '<div class="v2-blk-h">' + svg(IC.link, 'v2-blk-ico') +
          '<span class="v2-blk-t">Quoi se synchronise avec quoi ?</span>' +
          '<span class="v2-blk-lien">' + SYNCS.length + ' flux</span></div>' +
        '<div class="gf-tw"><table class="v2-table gf-sync-t"><thead><tr>' +
          '<th>Module source</th><th>Données partagées vers…</th><th>Ce qui est transmis</th>' +
        '</tr></thead><tbody>' + SYNCS.map(function (s) {
          return '<tr><td><span class="gf-src" style="--c:' + s.c + '">' + esc(s.src) + '</span></td>' +
            '<td class="gf-td-m">' + esc(s.vers) + '</td>' +
            '<td class="gf-td-m">' + esc(s.quoi) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
      '</div></section>';

    /* — Modules — */
    GROUPES.forEach(function (g) {
      h += '<section id="' + esc(g.id) + '-sec" class="gf-sec" data-grp="' + esc(g.id) + '">' +
        '<div class="v2-sep"><span class="v2-sep-txt">' + esc(g.titre) + '</span>' +
          '<span class="v2-sep-line"></span>' +
          '<span class="v2-badge v2-b-neutral">' + g.mods.length + ' module' + (g.mods.length > 1 ? 's' : '') + '</span></div>' +
        '<div class="gf-mods">' + g.mods.map(function (m) { return modCard(m, g.id); }).join('') + '</div>' +
        '</section>';
    });

    /* — Conseils — */
    h += '<section id="conseils" class="gf-sec">' +
      '<div class="v2-sep"><span class="v2-sep-txt">Conseils pratiques</span><span class="v2-sep-line"></span></div>' +
      '<div class="gf-tips">' + CONSEILS.map(function (t) {
        return '<div class="v2-blk gf-tip" style="--c:' + t.c + '">' +
          '<div class="v2-blk-h">' + svg(t.ic, 'v2-blk-ico') + '<span class="v2-blk-t">' + esc(t.t) + '</span></div>' +
          '<ul class="gf-tip-ul">' + t.pts.map(function (p) {
            return '<li>' + rich(p) + '</li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div></section>';

    h += '<div id="gfVide" class="v2-blk v2-blk-vide" style="display:none">' +
      'Aucun module ne correspond à cette recherche.</div>';

    el.innerHTML = h;
  }

  function renderKpis() {
    var el = document.getElementById('gfKpis');
    if (!el) return;
    var nbMods = GROUPES.reduce(function (n, g) { return n + g.mods.length; }, 0);
    var k = [
      { n: nbMods, l: 'Modules documentés', ic: IC.grid, c: ['#4f46e5', '#818cf8'] },
      { n: GROUPES.length, l: 'Domaines fonctionnels', ic: IC.house, c: ['#0891b2', '#22d3ee'] },
      { n: SYNCS.length, l: 'Flux de synchronisation', ic: IC.link, c: ['#16a34a', '#4ade80'] },
      { n: ROLES.length, l: 'Rôles & jeux de droits', ic: IC.user, c: ['#f59e0b', '#fbbf24'] }
    ];
    el.innerHTML = k.map(function (x) {
      return '<div class="v2-k"><span class="v2-k-ico" style="background:' + grad(x.c) + '">' +
        svg(x.ic) + '</span><span><span class="v2-k-n">' + x.n + '</span>' +
        '<span class="v2-k-l">' + esc(x.l) + '</span></span></div>';
    }).join('');
  }

  /* ── Recherche ──────────────────────────────────────────────────────── */
  function filtrer() {
    var inp = document.getElementById('gfSearch');
    var q = inp ? inp.value.trim().toLowerCase() : '';
    var vide = document.getElementById('gfVide');
    var nb = 0;
    document.querySelectorAll('#gfContenu .gf-mod').forEach(function (c) {
      var ok = !q || (c.getAttribute('data-q') || '').indexOf(q) !== -1;
      c.style.display = ok ? '' : 'none';
      if (ok) nb++;
    });
    /* Sections de modules : masquées si aucune carte visible. */
    document.querySelectorAll('#gfContenu .gf-sec[data-grp]').forEach(function (s) {
      var visible = Array.prototype.some.call(s.querySelectorAll('.gf-mod'), function (c) {
        return c.style.display !== 'none';
      });
      s.style.display = visible ? '' : 'none';
    });
    /* Sections rédactionnelles : masquées pendant une recherche. */
    ['intro', 'roles', 'synchros', 'conseils'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) s.style.display = q ? 'none' : '';
    });
    if (vide) vide.style.display = (q && nb === 0) ? '' : 'none';
  }

  /* ── Navigation ancre + surlignage actif ────────────────────────────── */
  function goto(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    marquerActif(id);
  }

  function marquerActif(id) {
    var actif = null;
    document.querySelectorAll('.gf-nav-l').forEach(function (b) {
      var on = b.getAttribute('data-goto') === id;
      b.classList.toggle('on', on);
      if (on) actif = b;
    });
    /* Le rail défile seul : on garde l'élément actif dans son cadre. */
    var rail = document.getElementById('gfNav');
    if (actif && rail && rail.scrollHeight > rail.clientHeight) {
      var t = actif.offsetTop - rail.clientHeight / 2 + actif.offsetHeight / 2;
      rail.scrollTop = Math.max(0, t);
    }
  }

  /* Surlignage actif : dernière ancre passée sous la ligne des 140 px.
     Plus fiable qu'un IntersectionObserver quand les sections s'imbriquent. */
  function brancherScrollSpy() {
    var cibles = [];
    document.querySelectorAll('.gf-nav-l').forEach(function (b) {
      var el = document.getElementById(b.getAttribute('data-goto'));
      if (el) cibles.push({ id: b.getAttribute('data-goto'), el: el });
    });
    if (!cibles.length) return;
    var dernier = 0;
    function maj() {
      var courant = cibles[0].id, meilleur = -Infinity;
      for (var i = 0; i < cibles.length; i++) {
        var r = cibles[i].el.getBoundingClientRect();
        if (r.height === 0 && r.width === 0) continue;   /* masqué par la recherche */
        /* `>` strict : sur une rangée de cartes à la même hauteur, la première gagne. */
        if (r.top <= 140 && r.top > meilleur) { meilleur = r.top; courant = cibles[i].id; }
      }
      marquerActif(courant);
    }
    window.addEventListener('scroll', function () {
      var t = Date.now();
      if (t - dernier < 60) return;   /* limitation simple, sans rAF */
      dernier = t;
      maj();
    }, { passive: true });
    maj();
  }

  function init() {
    renderNav();
    renderKpis();
    renderContenu();
    var maj = document.getElementById('gfMaj');
    if (maj) maj.textContent = 'Mis à jour le ' + VERSION_MAJ;
    var nav = document.getElementById('gfNav');
    if (nav) nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]');
      if (b) goto(b.getAttribute('data-goto'));
    });
    var inp = document.getElementById('gfSearch');
    if (inp) inp.addEventListener('input', filtrer);
    var pr = document.getElementById('gfPrint');
    if (pr) pr.addEventListener('click', function () { window.print(); });
    brancherScrollSpy();
  }

  /* Un `const`/`var` de module ne crée pas de propriété sur window :
     on publie explicitement ce que lisent les onclick inline et l'iframe. */
  window.goto = goto;
  window.GuideFormationV2 = { init: init, goto: goto, filtrer: filtrer, GROUPES: GROUPES };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
