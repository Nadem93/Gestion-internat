// ══════════════════════════════════════════════════════════════════════════
// AIDE & GUIDE V2 — rendu du guide d'utilisation dans le langage visuel V2
// (maquette « Portail - refonte (bento) » : barre du haut, cartes voilées,
// chips, rail latéral, Space Grotesk).
//
// La page est entièrement statique : aucune donnée en base, donc aucune
// couche Supabase n'est écrite ni réécrite ici. Le contenu pédagogique
// (sections, aperçus d'écran, légendes, conseils) est repris à l'identique
// de la version V1 ; seule sa présentation change.
//
// Le filtrage par rôle reste porté par aide.html (window.aideAppliquerDroits),
// que ce module rappelle après chaque rendu.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const svg = (d, sz) => '<svg width="' + (sz || 18) + '" height="' + (sz || 18) + '" viewBox="0 0 24 24"'
    + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + d + '</svg>';

  const IC = {
    aide: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    dossier: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="14" r="2"/><path d="M9 19a3 3 0 0 1 6 0"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    case: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    back: '<path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>'
  };

  // Pastille numérotée + bulle explicative (visible au survol et au clavier)
  const pin = (n, pos, txt) =>
    '<button type="button" class="ai-pin" style="' + pos + '" aria-label="Repère ' + n + ' : ' + txt.replace(/"/g, '&quot;') + '">'
    + n + '<span class="bub">' + txt + '</span></button>';

  // ── Contenu du guide (repris de la version V1, à l'identique) ─────────
  const SECTIONS = [
    {
      id: 's-login', nav: 'Connexion', c: '#818cf8', ic: IC.lock,
      titre: 'Connexion & choix de l\'établissement',
      lead: 'Au lancement, identifiez-vous puis sélectionnez votre établissement (si vous en gérez plusieurs).',
      ecran: 'connexion',
      corps: '<div style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;min-height:140px">'
        + '<div class="ai-card" style="width:238px;text-align:center">'
        + '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:800;color:#fff;letter-spacing:.14em">INTERNALIS</div>'
        + '<div class="ai-line m" style="margin:12px auto"></div><div class="ai-line m" style="margin:12px auto"></div>'
        + '<div class="ai-btn" style="margin-top:8px;width:100%">Se connecter</div></div></div>'
        + pin(1, 'top:52px;left:calc(50% + 128px)', 'Saisissez votre identifiant et mot de passe. Après 15 min d\'inactivité, la session se verrouille automatiquement.')
        + pin(2, 'bottom:28px;left:calc(50% + 128px)', 'Bouton de connexion. Vos accès dépendent de votre fonction (éducateur, admin…).'),
      legende: [
        ['Identifiants', 'Saisissez votre identifiant et votre mot de passe (chiffré). Après 15 minutes d\'inactivité, la session se verrouille automatiquement pour protéger les données.'],
        ['Bouton de connexion', 'Valide l\'accès. L\'interface et les menus affichés s\'adaptent ensuite à votre fonction (éducateur, chef de service, administrateur…).']
      ],
      tips: [['💡', 'Si plusieurs établissements existent, un écran de sélection s\'affiche juste après la connexion.']]
    },
    {
      id: 's-accueil', nav: 'Accueil', c: '#22d3ee', ic: IC.home,
      titre: 'Accueil',
      lead: 'Le menu principal : chaque carte ouvre un module. Les boutons flottants permettent des actions rapides.',
      ecran: 'accueil',
      corps: '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">📊</span>Tableau de bord</div>'
        + '<div class="ai-tile"><span class="ic">👥</span>Résidents</div>'
        + '<div class="ai-tile"><span class="ic">📔</span>Journal</div>'
        + '<div class="ai-tile"><span class="ic">📄</span>Avenants</div></div>'
        + '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">📅</span>Planning</div>'
        + '<div class="ai-tile"><span class="ic">🔍</span>Recherche</div>'
        + '<div class="ai-tile"><span class="ic">🗒️</span>Notes</div>'
        + '<div class="ai-tile"><span class="ic">❓</span>Aide</div></div>'
        + pin(1, 'top:26px;left:20px', 'Cartes des modules : un clic ouvre la section correspondante.')
        + pin(2, 'bottom:-12px;left:calc(50% - 12px)', 'Recherche globale (aussi accessible par Ctrl/⌘ + K) et bloc-notes personnel.')
        + pin(3, 'bottom:14px;right:14px', 'Boutons flottants : demander une intervention, signaler un incident, réserver un véhicule.'),
      legende: [
        ['Cartes des modules', 'Chaque carte mène à une section (résidents, journal, planning…). Seules les cartes correspondant à vos droits sont affichées ; les pastilles rouges signalent des nouveautés non lues.'],
        ['Recherche & notes', 'La recherche globale retrouve instantanément un résident, une note ou un document. Le bloc-notes garde vos pense-bêtes personnels.'],
        ['Boutons flottants', 'En bas à droite : demander une intervention technique, signaler un incident, ou réserver un véhicule — sans changer de page.']
      ],
      tips: []
    },
    {
      id: 's-dashboard', nav: 'Tableau de bord', c: '#38bdf8', ic: IC.chart,
      titre: 'Tableau de bord',
      lead: 'Vue d\'ensemble en un coup d\'œil : présence du jour, événements, indicateurs et suivi.',
      ecran: 'tableau de bord',
      corps: '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">🟢</span>Présents</div>'
        + '<div class="ai-tile"><span class="ic">📅</span>À venir</div>'
        + '<div class="ai-tile"><span class="ic">🎂</span>Anniversaires</div>'
        + '<div class="ai-tile"><span class="ic">🚗</span>Véhicules</div></div>'
        + '<div class="ai-card"><div class="ai-line m"></div><div class="ai-line s"></div><div class="ai-line"></div></div>'
        + pin(1, 'top:26px;left:24px', 'Indicateurs clés du jour : présents, événements, anniversaires, véhicules réservés.')
        + pin(2, 'bottom:28px;left:30px', 'Courbe de présence et suivi des résidents (RDV, soldes, vaccins…).'),
      legende: [
        ['Indicateurs du jour', 'Nombre de résidents présents, événements à venir, anniversaires du jour et véhicules réservés. Mise à jour automatique.'],
        ['Graphiques & suivi', 'Courbe de présence et suivi transversal de tous les résidents : prochains RDV, soldes budgétaires, rappels de vaccins…']
      ],
      tips: []
    },
    {
      id: 's-residents', nav: 'Résidents', c: '#f472b6', ic: IC.users,
      titre: 'Liste des résidents',
      lead: 'Recherchez, filtrez et ouvrez la fiche d\'un résident. Basculez entre vue grille et liste.',
      ecran: 'résidents',
      corps: '<div class="ai-head">🔍 Rechercher… <span class="ai-badge" style="margin-left:auto">Trier</span></div>'
        + '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">👤</span>Dupont</div>'
        + '<div class="ai-tile"><span class="ic">👤</span>Martin</div>'
        + '<div class="ai-tile"><span class="ic">👤</span>Bernard</div></div>'
        + pin(1, 'top:40px;left:24px', 'Barre de recherche + filtres (objectif) + tri (nom, chambre, âge…).')
        + pin(2, 'top:96px;left:60px', 'Une carte par résident : photo, âge, chambre, statut. Un clic ouvre la fiche.')
        + pin(3, 'top:40px;right:18px', 'Basculer entre l\'affichage en grille et en liste. Le bouton « + » (admin) ajoute un résident.'),
      legende: [
        ['Recherche, filtres & tri', 'Tapez un nom pour filtrer la liste, filtrez par objectif, ou triez par nom, prénom, chambre, date d\'entrée ou âge.'],
        ['Cartes résidents', 'Une carte par résident avec photo, âge, chambre et statut de présence. Un clic ouvre la fiche complète.'],
        ['Affichage & ajout', 'Basculez entre la vue grille et la vue liste. Le bouton « + Ajouter un résident » (réservé aux administrateurs) crée un nouveau dossier.']
      ],
      tips: []
    },
    {
      id: 's-chambres', nav: 'Chambres & repas', c: '#f59e0b', ic: IC.bed,
      titre: 'Chambres & repas',
      lead: 'Le quotidien de l\'internat : plan d\'occupation des chambres, attribution des lits, états des lieux, et gestion des repas avec régimes alimentaires.',
      ecran: 'chambres',
      corps: '<div class="ai-head">🏢 Unité A <span class="ai-badge" style="margin-left:auto">12 chambres</span></div>'
        + '<div class="ai-row">'
        + '<div class="ai-card" style="border-left:3px solid #10b981">Ch. 101<div class="ai-badge ok" style="margin-top:5px">Libre</div></div>'
        + '<div class="ai-card" style="border-left:3px solid #f59e0b">Ch. 102<div class="ai-badge warn" style="margin-top:5px">1/1</div></div>'
        + '<div class="ai-card" style="border-left:3px solid #f59e0b">Ch. 103<div class="ai-badge" style="margin-top:5px">📋 EDL</div></div></div>'
        + pin(1, 'top:80px;left:30px', 'Une carte par chambre : état coloré (libre, complète, sur-occupée), occupants cliquables.')
        + pin(2, 'top:80px;right:60px', 'États des lieux d\'entrée et de sortie avec historique par chambre.'),
      legende: [
        ['Plan d\'occupation', 'Vue par unité/étage. Attribuer un lit met à jour automatiquement la fiche du résident ; les chambres existantes sont importées automatiquement à la première ouverture.'],
        ['États des lieux', 'Grille murs / sol / mobilier / literie / sanitaires (Bon, Moyen, Dégradé) avec observations, à l\'entrée comme à la sortie. Tout l\'historique reste consultable.']
      ],
      tips: [['🍽️', 'Le module <strong>Repas</strong> fonctionne par jour : tous les résidents actifs sont inscrits midi et soir par défaut, on décoche les absents. La synthèse « Effectifs cuisine par régime » et la feuille imprimable donnent à la cuisine exactement ce dont elle a besoin. Les allergies remontent de la fiche santé.']]
    },
    {
      id: 's-quotidien', nav: 'Vie quotidienne', c: '#34d399', ic: IC.sun,
      titre: 'Vie quotidienne',
      lead: 'Le hub du quotidien : présences, chambres & repas, visites, cahier de nuit, activités éducatives et distribution des médicaments.',
      ecran: 'vie quotidienne',
      corps: '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">✅</span>Présences</div>'
        + '<div class="ai-tile"><span class="ic">🛏️</span>Chambres</div>'
        + '<div class="ai-tile"><span class="ic">🍽️</span>Repas</div>'
        + '<div class="ai-tile"><span class="ic">👪</span>Visites</div></div>'
        + '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">🌙</span>Cahier de nuit</div>'
        + '<div class="ai-tile"><span class="ic">🎨</span>Activités</div>'
        + '<div class="ai-tile"><span class="ic">💊</span>Médicaments</div></div>'
        + pin(1, 'top:26px;left:20px', 'Chaque carte ouvre un module du quotidien. Seules celles correspondant à vos droits s\'affichent.')
        + pin(2, 'bottom:-12px;left:calc(50% - 12px)', 'Le pointage des présences alimente directement la facturation et les statistiques d\'occupation.'),
      legende: [
        ['Présences', 'Pointez chaque résident jour par jour (présent / absent / sorti). Ces données servent ensuite à générer les factures (prix de journée) et les statistiques d\'occupation.'],
        ['Visites, cahier de nuit, activités & médicaments', 'Suivi des visites de la famille, observations du veilleur de nuit, programmation des activités éducatives (ateliers, sorties) et suivi de la distribution des médicaments.']
      ],
      tips: [['💡', 'Les modules « Chambres & repas » ont leur propre section détaillée ci-dessus.']]
    },
    {
      id: 's-echeances', nav: 'Échéancier', c: '#ef4444', ic: IC.clock,
      titre: 'Échéancier administratif',
      lead: 'Les renouvellements à ne jamais manquer : MDPH, jugements, pièces d\'identité, CSS, contrats de séjour…',
      ecran: 'échéancier',
      corps: '<div class="ai-row">'
        + '<div class="ai-card" style="border-left:3px solid #ef4444;text-align:center">En retard<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:800;font-size:17px;color:#fca5a5;margin-top:3px">2</div></div>'
        + '<div class="ai-card" style="border-left:3px solid #f59e0b;text-align:center">Sous 30 j<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:800;font-size:17px;color:#fde68a;margin-top:3px">5</div></div>'
        + '<div class="ai-card" style="border-left:3px solid #22d3ee;text-align:center">Sous 90 j<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:800;font-size:17px;color:#a5f3fc;margin-top:3px">8</div></div></div>'
        + '<div class="ai-card" style="border-left:3px solid #ef4444">🧾 Renouvellement MDPH — <span style="color:#fca5a5;font-weight:700">12 j de retard</span></div>'
        + pin(1, 'top:-12px;left:30px', 'Tri automatique par urgence : retard (rouge), sous 30 jours (orange), sous 90 jours (cyan).')
        + pin(2, 'bottom:-12px;left:30px', 'Chaque échéance est liée au résident, avec compte des jours restants et bouton « traité ✓ ».'),
      legende: [
        ['Alertes par urgence', 'Le tableau de bord affiche aussi une carte « Échéances urgentes » dès qu\'une échéance approche ou est dépassée — impossible de manquer un renouvellement.'],
        ['Suivi par résident', 'Types métier : notification MDPH, jugement/mesure, pièce d\'identité, CSS/mutuelle, contrat de séjour, révision PPE, visite médicale. Filtrable par résident et par type.']
      ],
      tips: []
    },
    {
      id: 's-fiche', nav: 'Fiche résident', c: '#a855f7', ic: IC.dossier,
      titre: 'Fiche résident',
      lead: 'Le dossier complet : santé, sorties, budget, objectifs, évaluations, radar de vigilance, fil de vie et bilan IA.',
      ecran: 'fiche résident',
      corps: '<div class="ai-head">👤 Résident <span class="ai-badge ok" style="margin-left:auto">Présent</span></div>'
        + '<div class="ai-card" style="border-left:3px solid #ef4444;margin-bottom:10px">📡 Radar de vigilance — <span class="ai-badge dang">2 signaux</span></div>'
        + '<div class="ai-row"><div class="ai-card">🏥 Médical</div><div class="ai-card">💰 Budget</div></div>'
        + '<div class="ai-card" style="display:flex;align-items:center;gap:10px">🧬 Fil de vie <span class="ai-btn" style="margin-left:auto">🤖 Bilan</span></div>'
        + pin(1, 'top:58px;left:24px', 'Radar de vigilance : signaux faibles détectés automatiquement (absences, incidents, budget négatif, RDV manqués…).')
        + pin(2, 'top:108px;left:40px', 'Cartes thématiques : santé (traitements, RDV, vaccins), sorties, budget, objectifs, évaluations.')
        + pin(3, 'bottom:22px;left:30px', 'Fil de vie : tout l\'historique du résident, filtrable par type.')
        + pin(4, 'bottom:22px;right:20px', 'Bilan de synthèse généré par IA à partir du quotidien (à relire et valider).'),
      legende: [
        ['Radar de vigilance', 'Détecte automatiquement les signaux faibles : absences répétées, incidents fréquents, budget négatif, RDV non honorés, journal silencieux… avec un niveau de vigilance global.'],
        ['Cartes thématiques', 'Santé (traitements, RDV, vaccins), sorties & permissions, budget personnel, objectifs et grilles d\'évaluation. Chaque carte est modifiable selon vos droits.'],
        ['Fil de vie', 'Tout l\'historique du résident réuni sur une frise unique (journal, incidents, RDV, sorties, budget, avenants…), filtrable par type d\'événement.'],
        ['Bilan IA', 'Génère un bilan de synthèse à partir du quotidien du résident, prêt pour la réunion de projet. À relire et valider avant tout usage officiel.']
      ],
      tips: [['💡', 'Le bouton « ✎ Modifier » (en haut de la fiche) n\'apparaît qu\'aux personnes autorisées à éditer.']]
    },
    {
      id: 's-journal', nav: 'Journal', c: '#0ea5e9', ic: IC.book,
      titre: 'Journal de bord',
      lead: 'Consignez les observations quotidiennes, classées par catégorie, avec un niveau de confidentialité.',
      ecran: 'journal',
      corps: '<div class="ai-row">'
        + '<div class="ai-card" style="flex:2"><span class="ai-badge">Autonomie</span> <span style="color:#7f93b3">12 mars</span>'
        + '<div class="ai-line m"></div><div class="ai-line s"></div></div>'
        + '<div class="ai-card" style="flex:1;text-align:center"><div class="ai-btn">+ Note</div></div></div>'
        + pin(1, 'top:-12px;left:26px', 'Chaque entrée : catégorie, date, auteur et contenu de l\'observation.')
        + pin(2, 'top:-12px;right:30px', 'Rédiger une nouvelle observation, la rattacher à un résident et choisir sa visibilité (normale ou confidentielle).'),
      legende: [
        ['Liste des observations', 'Chaque entrée affiche sa catégorie, sa date, son auteur et son contenu. Les collègues peuvent réagir / accuser réception.'],
        ['Nouvelle observation', 'Rédigez une note, rattachez-la à un résident, choisissez une catégorie et un niveau de visibilité (normale ou confidentielle).']
      ],
      tips: [['🔒', 'Une note « confidentielle » n\'est visible que par son auteur et les administrateurs.']]
    },
    {
      id: 's-avenant', nav: 'Avenants (PPE)', c: '#14b8a6', ic: IC.file,
      titre: 'Avenants (Projet personnalisé)',
      lead: 'Rédigez les avenants au projet par domaine. L\'IA peut pré-rédiger l\'avenant à partir du journal de bord.',
      ecran: 'avenant',
      corps: '<div class="ai-head">Avenant — Résident <span class="ai-btn" style="margin-left:auto">🤖 Générer depuis le journal</span></div>'
        + '<div class="ai-card">🧍 Autonomie<div class="ai-line m"></div><div class="ai-line"></div></div>'
        + pin(1, 'top:-12px;right:26px', 'Génère automatiquement le contenu de l\'avenant à partir de TOUTES les observations du journal du résident.')
        + pin(2, 'bottom:30px;left:34px', 'Un bilan + des objectifs par domaine (autonomie, santé, vie sociale…). Modifiable manuellement.'),
      legende: [
        ['Génération par IA', 'Pré-rédige l\'avenant à partir de l\'ensemble des observations du journal du résident. Gagnez du temps, puis ajustez le texte.'],
        ['Bilan & objectifs par domaine', 'Pour chaque domaine (autonomie, santé, vie sociale…) : un bilan et des objectifs avec moyens et évaluation. Tout est éditable, puis exportable en PDF.']
      ],
      tips: []
    },
    {
      id: 's-dossiers', nav: 'Dossiers & suivi', c: '#8b5cf6', ic: IC.folder,
      titre: 'Dossiers & suivi',
      lead: 'Le hub des dossiers transversaux : admissions, avenants, documents, échéancier, ViaTrajectoire, répertoire, registre EIG et vie sociale (CVS).',
      ecran: 'dossiers & suivi',
      corps: '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">🧑‍🤝‍🧑</span>Admissions</div>'
        + '<div class="ai-tile"><span class="ic">📄</span>Avenants</div>'
        + '<div class="ai-tile"><span class="ic">📎</span>Documents</div>'
        + '<div class="ai-tile"><span class="ic">⏰</span>Échéancier</div></div>'
        + '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">🧭</span>ViaTrajectoire</div>'
        + '<div class="ai-tile"><span class="ic">📇</span>Répertoire</div>'
        + '<div class="ai-tile"><span class="ic">🚨</span>Registre EIG</div>'
        + '<div class="ai-tile"><span class="ic">🤝</span>CVS</div></div>'
        + pin(1, 'top:26px;left:20px', 'Chaque carte ouvre un module de suivi. Seules celles correspondant à vos droits s\'affichent.')
        + pin(2, 'bottom:-12px;left:calc(50% - 12px)', 'Admissions : gérez la liste d\'attente des candidats avant leur entrée à l\'internat.'),
      legende: [
        ['Admissions / liste d\'attente', 'Enregistrez les candidats en attente d\'admission (coordonnées, situation, organisme orienteur). Suivez leur statut (en attente, admis, refusé) ; un candidat admis peut être transformé directement en fiche résident.'],
        ['ViaTrajectoire, répertoire, EIG & CVS', 'ViaTrajectoire pour le suivi des orientations, le répertoire des contacts utiles, le registre des événements indésirables graves (EIG), et le suivi du Conseil de la Vie Sociale (CVS).']
      ],
      tips: [['💡', 'Les avenants (PPE) et l\'échéancier ont leur propre section détaillée ci-dessus.']]
    },
    {
      id: 's-planning', nav: 'Planning & présences', c: '#06b6d4', ic: IC.cal,
      titre: 'Planning & présences',
      lead: 'Gérez rendez-vous, activités et réservations de véhicules. Pointez les présences au quotidien.',
      ecran: 'planning',
      corps: '<div class="ai-row">'
        + '<div class="ai-card" style="text-align:center">Lun</div>'
        + '<div class="ai-card" style="text-align:center;border-color:rgba(20,184,166,.5)">Mar<div class="ai-badge" style="margin-top:5px">RDV</div></div>'
        + '<div class="ai-card" style="text-align:center">Mer</div></div>'
        + pin(1, 'top:-12px;left:calc(50% - 12px)', 'Cliquez un jour pour ajouter un événement (RDV, activité, véhicule). Les RDV médicaux se synchronisent avec la fiche du résident.'),
      legende: [
        ['Ajout & synchronisation', 'Cliquez un jour pour ajouter un RDV, une activité ou une réservation de véhicule. Un RDV médical saisi ici apparaît automatiquement dans la fiche du résident concerné (et inversement).']
      ],
      tips: [['✅', 'Le module Présences permet de pointer chaque résident (présent / absent / sorti) jour par jour.']]
    },
    {
      id: 's-portail', nav: 'Portail employé', c: '#6366f1', ic: IC.case,
      titre: 'Portail employé',
      lead: 'Votre espace personnel : planning d\'équipe, congés, notes, messages, documentation, budget, paie, entretiens, annuaire, facturation et plan de formation.',
      ecran: 'portail employé',
      corps: '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">📆</span>Planning équipe</div>'
        + '<div class="ai-tile"><span class="ic">🏖️</span>Congés</div>'
        + '<div class="ai-tile"><span class="ic">🗒️</span>Notes</div>'
        + '<div class="ai-tile"><span class="ic">💬</span>Messages</div></div>'
        + '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">📚</span>Documentation</div>'
        + '<div class="ai-tile"><span class="ic">💰</span>Budget</div>'
        + '<div class="ai-tile"><span class="ic">🧾</span>Paie</div>'
        + '<div class="ai-tile"><span class="ic">🧑‍💼</span>Entretiens</div></div>'
        + '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">📇</span>Annuaire</div>'
        + '<div class="ai-tile"><span class="ic">💳</span>Facturation</div>'
        + '<div class="ai-tile"><span class="ic">🎓</span>Formations</div></div>'
        + pin(1, 'top:26px;left:20px', 'Chaque carte ouvre un module du portail. Seules celles correspondant à vos droits s\'affichent.')
        + pin(2, 'bottom:14px;right:18px', 'Congés : déposez une demande, votre responsable la valide ou la refuse.'),
      legende: [
        ['Planning équipe & congés', 'Consultez le planning de toute l\'équipe et déposez vos demandes de congés. Chaque demande suit un circuit de validation par la hiérarchie.'],
        ['Notes, messages & documentation', 'Bloc-notes partagé, messagerie interne entre collègues, et documentation de l\'établissement (protocoles, procédures, fichiers utiles).'],
        ['Budget, paie, entretiens & annuaire', 'Suivi du budget et des dépenses, consultation des fiches de paie, comptes-rendus d\'entretiens professionnels périodiques et annuaire de tout le personnel.'],
        ['Facturation & plan de formation', 'Facturation : définissez les tarifs (prix de journée) par catégorie, rattachez chaque résident à un organisme payeur, et générez chaque mois les factures à partir des présences. Plan de formation : recensez et suivez les formations du personnel (organisme, domaine, dates, coût, statut et participants).']
      ],
      tips: [['🔒', 'Les fiches de paie ne sont visibles que par leur titulaire et les administrateurs.']]
    },
    {
      id: 's-interventions', nav: 'Interventions', c: '#fb923c', ic: IC.tool,
      titre: 'Interventions',
      lead: 'Signalez un problème technique (maintenance, réparation) et suivez son traitement jusqu\'à sa résolution.',
      ecran: 'interventions',
      corps: '<div class="ai-card" style="border-left:3px solid #ef4444">🚨 Chambre 104 — <span class="ai-badge dang">critique</span> <span class="ai-badge warn" style="margin-left:6px">En attente</span></div>'
        + '<div class="ai-card" style="border-left:3px solid #6f86ab;opacity:.75">⬇ Couloir étage — <span class="ai-badge">basse</span> <span class="ai-badge ok" style="margin-left:6px">✔ Fait</span></div>'
        + pin(1, 'top:-12px;left:26px', 'Niveau d\'urgence : basse, normale, haute ou critique — code couleur et icône associés.')
        + pin(2, 'bottom:26px;left:24px', 'Le technicien joint une photo des travaux réalisés pour clôturer ; un administrateur peut aussi marquer « Fait » sans photo.'),
      legende: [
        ['Signalement', 'Chaque demande indique le lieu, une description du problème, le niveau d\'urgence, la date et la personne qui a signalé. Accessible aux administrateurs et aux techniciens de maintenance.'],
        ['Traitement & clôture', 'Une intervention « en attente » passe à « fait » lorsqu\'une photo des travaux (avec commentaire) est jointe, ou directement par un administrateur.']
      ],
      tips: [['💡', 'N\'importe qui peut signaler une intervention via le bouton flottant de la page d\'accueil (voir section « Accueil »).']]
    },
    {
      id: 's-recherche', nav: 'Recherche & notes', c: '#22d3ee', ic: IC.search,
      titre: 'Recherche globale & notes',
      lead: 'Retrouvez instantanément n\'importe quel élément, et gardez vos pense-bêtes personnels.',
      ecran: 'recherche',
      corps: '<div class="ai-head">🔍 Tapez votre recherche…</div>'
        + '<div class="ai-card">👤 Résidents · 📔 Journal · 📎 Documents · 📅 Planning · 📇 Répertoire</div>'
        + pin(1, 'top:-12px;left:30px', 'Recherche transversale. Raccourci clavier : Ctrl/⌘ + K depuis l\'accueil.'),
      legende: [
        ['Recherche transversale', 'Cherche en même temps dans les résidents, le journal, les documents, le planning et le répertoire. Chaque résultat est cliquable. Raccourci : Ctrl/⌘ + K depuis l\'accueil.']
      ],
      tips: [['🗒️', 'La carte « Notes rapides » ouvre un bloc-notes personnel, enregistré automatiquement.']]
    },
    {
      id: 's-admin', nav: 'Administration', c: '#ef4444', ic: IC.gear, admin: true,
      titre: 'Administration',
      lead: 'Réservé aux administrateurs : configuration de l\'établissement, des fonctions, des utilisateurs, des permissions et des statistiques.',
      ecran: 'administration',
      corps: '<div class="ai-row">'
        + '<div class="ai-tile"><span class="ic">📈</span>Statistiques</div>'
        + '<div class="ai-tile"><span class="ic">🏠</span>Établissement</div>'
        + '<div class="ai-tile"><span class="ic">🧑‍🤝‍🧑</span>Utilisateurs</div>'
        + '<div class="ai-tile"><span class="ic">🔐</span>Permissions</div></div>'
        + pin(1, 'top:26px;left:24px', 'Statistiques & rapport d\'activité (taux d\'occupation, file active, indicateurs réglementaires).')
        + pin(2, 'top:26px;left:calc(25% + 30px)', 'Identité de l\'établissement, couleurs, fond d\'écran, logo, capacité, clé IA.')
        + pin(3, 'top:26px;right:90px', 'Création des comptes, fonctions et rôles des membres de l\'équipe.')
        + pin(4, 'top:26px;right:20px', 'Définition fine des permissions par fonction (qui voit / modifie quoi).'),
      legende: [
        ['Statistiques & rapport', 'Tableaux et graphiques d\'activité : taux d\'occupation, file active, mouvements, profil du public, taux de PPE — exportables pour le rapport d\'activité.'],
        ['Établissement', 'Identité (nom, FINESS, coordonnées), couleurs, couleur de fond, logo, capacité d\'accueil et clé API de l\'assistant IA.'],
        ['Utilisateurs & fonctions', 'Créez et gérez les comptes des membres de l\'équipe, leurs fonctions (éducateur, AMP, chef de service…) et leurs accès.'],
        ['Permissions', 'Définissez finement, par fonction, qui peut voir et modifier quoi (résidents, incidents, santé, documents…).']
      ],
      tips: [['👑', 'La <strong>Console groupe</strong> (super administrateur) permet de gérer plusieurs établissements, une vue consolidée, les rôles globaux et l\'audit.', 'superadmin-only violet']]
    }
  ];

  // ── Rendu ─────────────────────────────────────────────────────────────
  function sectionHtml(s, i) {
    const leg = s.legende.map((l, n) =>
      '<li class="ai-lg"><span class="ai-lg-n">' + (n + 1) + '</span>'
      + '<div><div class="ai-lg-t">' + l[0] + '</div><div class="ai-lg-d">' + l[1] + '</div></div></li>').join('');
    const tips = (s.tips || []).map(t =>
      '<div class="ai-tip ' + (t[2] || '') + '"><span class="ai-tip-e">' + t[0] + '</span><div>' + t[1] + '</div></div>').join('');
    return '<section class="v2-blk ai-sec' + (s.admin ? ' admin-only' : '') + '" id="' + s.id + '" style="--sc:' + s.c + '">'
      + '<div class="ai-sec-h">'
      + '<span class="ai-sec-ico">' + svg(s.ic) + '</span>'
      + '<div><div class="ai-sec-t">' + s.titre + '</div></div>'
      + (s.admin ? '<span class="ai-tag">Administrateur uniquement</span>' : '')
      + '<span class="ai-sec-n">' + String(i + 1).padStart(2, '0') + '</span>'
      + '</div>'
      + '<p class="ai-lead">' + s.lead + '</p>'
      + '<div class="ai-screen"><div class="ai-bar"><i class="r"></i><i class="y"></i><i class="g"></i><span>' + s.ecran + '</span></div>'
      + '<div class="ai-scr-b">' + s.corps + '</div></div>'
      + '<div class="v2-blk-sub">Légende détaillée</div>'
      + '<ul class="ai-legend">' + leg + '</ul>'
      + tips
      + '</section>';
  }

  function render() {
    const main = document.getElementById('aideMain');
    const toc = document.getElementById('aideToc');
    const nb = document.getElementById('aideNbSec');
    if (!main || !toc) return;

    main.innerHTML = SECTIONS.map(sectionHtml).join('')
      + '<div class="ai-vide hidden" id="aideVide">Aucune section ne correspond à votre recherche.</div>';
    toc.innerHTML = SECTIONS.map(s =>
      '<a href="#' + s.id + '" data-sec="' + s.id + '" class="' + (s.admin ? 'admin-only' : '') + '" style="--tc:' + s.c + '">'
      + '<span class="ai-toc-d"></span>' + s.nav + '</a>').join('');

    if (typeof window.aideAppliquerDroits === 'function') window.aideAppliquerDroits();
    // Nombre de sections réellement accessibles au profil connecté
    if (nb) nb.textContent = String(document.querySelectorAll('.ai-sec:not(.hidden)').length);
    observer();
  }

  // Surlignage du sommaire pendant le défilement
  function observer() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        document.querySelectorAll('#aideToc a').forEach(a =>
          a.classList.toggle('on', a.getAttribute('data-sec') === e.target.id));
      });
    }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 });
    document.querySelectorAll('.ai-sec').forEach(s => io.observe(s));
  }

  // Filtre plein texte sur les sections
  function filtrer(q) {
    const t = String(q || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    let visibles = 0;
    document.querySelectorAll('.ai-sec').forEach(sec => {
      const admin = sec.classList.contains('admin-only') && !window.aideDroitAdmin;
      const txt = (sec.textContent || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const ok = !admin && (!t || txt.indexOf(t) !== -1);
      sec.classList.toggle('hidden', !ok);
      if (ok) visibles++;
      const lien = document.querySelector('#aideToc a[data-sec="' + sec.id + '"]');
      if (lien) lien.classList.toggle('hidden', !ok);
    });
    const vide = document.getElementById('aideVide');
    if (vide) vide.classList.toggle('hidden', visibles > 0);
  }

  window.aide2Render = render;
  window.aide2Filtrer = filtrer;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
