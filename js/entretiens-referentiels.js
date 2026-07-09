// ── Référentiels de compétences par métier (support de l'entretien annuel) ──
// Trame d'appui, à ADAPTER au référentiel officiel du diplôme et à la fiche de poste de votre établissement.
// Positionnement qualitatif uniquement (aucune note chiffrée, aucune moyenne, aucun classement).
const ET_REFERENTIELS = {
  "Éducateur spécialisé": {
    "domaines": [
      {
        "titre": "Relation éducative et accompagnement de la personne",
        "competences": [
          "Instaurer et maintenir une relation éducative de qualité, fondée sur l'écoute active, la juste distance professionnelle et le respect de la personne accueillie",
          "Observer et analyser les besoins, attentes et potentialités du résident dans une approche globale de la situation",
          "Accompagner la personne dans les actes de la vie quotidienne en favorisant son autonomie, ses choix et son pouvoir d'agir",
          "Prévenir, repérer et gérer les situations de tension, de crise ou de rupture dans le respect de la sécurité et de la dignité",
          "Soutenir le maintien et le développement des liens familiaux, sociaux et affectifs de la personne accueillie"
        ]
      },
      {
        "titre": "Conception et conduite du projet éducatif spécialisé",
        "competences": [
          "Élaborer et conduire un projet personnalisé d'accompagnement en cohérence avec le projet d'établissement et le projet de service",
          "Définir des objectifs éducatifs adaptés, mettre en œuvre les actions et médiations correspondantes et en assurer le suivi",
          "Évaluer régulièrement le projet personnalisé et réajuster l'accompagnement au regard de l'évolution de la personne",
          "Concevoir et animer des activités et supports éducatifs favorisant l'apprentissage, la socialisation et l'épanouissement",
          "Associer la personne et, le cas échéant, son représentant légal à la co-construction et à l'évaluation de son projet"
        ]
      },
      {
        "titre": "Travail en équipe pluriprofessionnelle et institution",
        "competences": [
          "Contribuer aux réunions d'équipe et aux temps de synthèse en apportant une analyse éducative argumentée",
          "Inscrire son action dans le cadre du projet institutionnel, des procédures et des références déontologiques du secteur",
          "Transmettre et partager les informations utiles à la continuité de l'accompagnement dans le respect du secret professionnel partagé",
          "Participer à la démarche qualité, à la prévention des risques et à la gestion des événements indésirables",
          "Contribuer à l'accueil, à l'accompagnement et au tutorat des stagiaires et des nouveaux professionnels"
        ]
      },
      {
        "titre": "Partenariat, réseau et médiation sociale",
        "competences": [
          "Identifier et mobiliser les ressources du territoire et les partenaires utiles au parcours de la personne",
          "Développer et entretenir un réseau partenarial (soin, scolarité, formation, insertion, protection juridique, loisirs)",
          "Représenter le service ou l'établissement dans les instances et rencontres partenariales",
          "Accompagner la personne dans ses démarches d'inclusion sociale, citoyenne et d'accès aux droits",
          "Favoriser la coordination des interventions autour de la personne dans une logique de parcours"
        ]
      },
      {
        "titre": "Développement professionnel, éthique et posture réflexive",
        "competences": [
          "Analyser sa pratique professionnelle et s'inscrire dans une démarche réflexive individuelle et collective",
          "Actualiser ses connaissances et développer ses compétences au regard des évolutions du secteur médico-social",
          "Situer son action dans le respect des repères éthiques, du droit des usagers et de la bientraitance",
          "Repérer et signaler les situations de vulnérabilité, de maltraitance ou de danger selon les procédures en vigueur",
          "Rendre compte de son activité par des écrits professionnels clairs, pertinents et adaptés à leurs destinataires"
        ]
      }
    ]
  },
  "Moniteur-éducateur": {
    "domaines": [
      {
        "titre": "Accompagnement éducatif et vie quotidienne",
        "competences": [
          "Accompagner les personnes dans les actes et les temps de la vie quotidienne en veillant à leur bien-être et à leur sécurité",
          "Instaurer une relation éducative de proximité fondée sur la confiance, l'écoute et le respect de la personne",
          "Favoriser l'autonomie, la prise d'initiative et la participation de la personne à la vie collective",
          "Observer les comportements, repérer les évolutions et les difficultés et transmettre ses observations à l'équipe",
          "Veiller au respect des règles de vie collective et accompagner la personne dans la gestion des situations du quotidien"
        ]
      },
      {
        "titre": "Animation et organisation d'activités éducatives",
        "competences": [
          "Concevoir, organiser et animer des activités éducatives, de loisirs et de médiation adaptées aux capacités des personnes",
          "Utiliser des supports et médiations éducatives favorisant l'expression, l'apprentissage et la socialisation",
          "Adapter les activités et les rythmes aux besoins, aux envies et aux potentialités de chaque personne",
          "Évaluer les activités menées et ajuster ses pratiques d'animation en conséquence",
          "Aménager et sécuriser les espaces et les temps d'activité dans le respect des règles d'hygiène et de sécurité"
        ]
      },
      {
        "titre": "Participation à l'élaboration et au suivi du projet personnalisé",
        "competences": [
          "Contribuer à l'élaboration du projet personnalisé à partir de ses observations éducatives du quotidien",
          "Mettre en œuvre les actions éducatives définies dans le projet personnalisé de la personne accompagnée",
          "Participer au suivi et à l'évaluation du projet en rendant compte des évolutions constatées",
          "Associer la personne à la réalisation de son projet et soutenir l'expression de ses choix",
          "Adapter son accompagnement au regard des objectifs fixés et des besoins évolutifs de la personne"
        ]
      },
      {
        "titre": "Travail en équipe et communication professionnelle",
        "competences": [
          "Participer activement aux réunions d'équipe et aux temps de transmission en partageant ses observations",
          "Rédiger des écrits professionnels clairs et fidèles (transmissions, comptes rendus, bilans d'activité)",
          "Inscrire son action dans le respect du cadre institutionnel, des procédures et du secret professionnel partagé",
          "Coopérer avec l'ensemble des professionnels intervenant auprès de la personne dans une logique de complémentarité",
          "Contribuer à la continuité et à la cohérence de l'accompagnement au sein de l'équipe pluriprofessionnelle"
        ]
      },
      {
        "titre": "Cadre déontologique, bientraitance et développement des compétences",
        "competences": [
          "Adopter une posture professionnelle respectueuse de la dignité, des droits et de l'intégrité des personnes accueillies",
          "Repérer et signaler les situations de vulnérabilité, de danger ou de maltraitance selon les procédures en vigueur",
          "Participer à la démarche de bientraitance, de prévention des risques et à la démarche qualité de l'établissement",
          "Analyser sa pratique et s'engager dans une démarche d'actualisation de ses connaissances et de ses compétences",
          "Situer sa fonction et ses limites d'intervention au sein de l'équipe et de l'institution"
        ]
      }
    ]
  },
  "Infirmier": {
    "domaines": [
      {
        "titre": "Soins et démarche clinique infirmière",
        "competences": [
          "Évaluer l'état clinique d'une personne et recueillir les données nécessaires à la démarche de soins",
          "Élaborer, formaliser et actualiser le projet de soins infirmier en cohérence avec le projet personnalisé du résident",
          "Réaliser les soins infirmiers sur rôle propre et sur prescription médicale dans le respect des protocoles",
          "Surveiller l'évolution de l'état de santé, repérer les signes d'alerte et adapter la prise en charge",
          "Assurer la traçabilité des soins et transmettre les informations dans le dossier de soins"
        ]
      },
      {
        "titre": "Circuit du médicament et sécurité des soins",
        "competences": [
          "Gérer le circuit du médicament : préparation, administration, contrôle et suivi des piluliers",
          "Prévenir et repérer le risque iatrogène et les erreurs médicamenteuses",
          "Appliquer et faire appliquer les règles d'hygiène, d'asepsie et de prévention des infections",
          "Contribuer à la gestion des risques et à la déclaration des événements indésirables"
        ]
      },
      {
        "titre": "Coordination et accompagnement du parcours de santé",
        "competences": [
          "Coordonner le parcours de soins du résident avec les intervenants internes et les partenaires extérieurs (médecins, spécialistes, pharmacie, hôpital)",
          "Organiser et assurer le suivi des rendez-vous médicaux et des examens",
          "Éduquer le résident et son entourage à la santé et à la gestion de sa pathologie",
          "Accompagner les situations de fin de vie et de soins palliatifs dans une approche pluridisciplinaire"
        ]
      },
      {
        "titre": "Travail en équipe pluridisciplinaire et communication",
        "competences": [
          "Participer aux réunions de synthèse et à l'élaboration des projets personnalisés",
          "Transmettre son expertise clinique et conseiller l'équipe éducative et soignante",
          "Collaborer avec les familles et les représentants légaux dans le respect du secret professionnel",
          "Contribuer à la continuité et à la coordination des soins au sein de l'établissement"
        ]
      },
      {
        "titre": "Qualité, éthique et développement professionnel",
        "competences": [
          "Inscrire sa pratique dans le respect de la dignité, de l'autonomie et des droits de la personne accueillie",
          "Participer à la démarche qualité, à l'élaboration et à l'évaluation des protocoles",
          "Actualiser ses connaissances et développer ses compétences (formation continue, DPC)",
          "Encadrer et accompagner les stagiaires et les nouveaux professionnels"
        ]
      }
    ]
  },
  "Aide-soignant": {
    "domaines": [
      {
        "titre": "Soins d'hygiène, de confort et accompagnement de la vie quotidienne",
        "competences": [
          "Assurer les soins d'hygiène et de confort dans le respect de la dignité et de l'intimité de la personne",
          "Accompagner la personne dans les actes essentiels de la vie quotidienne en stimulant son autonomie",
          "Aider à la mobilisation, aux transferts et à l'installation en utilisant les techniques de manutention adaptées",
          "Accompagner la prise des repas et surveiller l'hydratation et l'équilibre nutritionnel",
          "Prendre soin de l'environnement de vie du résident et veiller à son bien-être"
        ]
      },
      {
        "titre": "Observation, surveillance et participation aux soins",
        "competences": [
          "Observer l'état général et le comportement de la personne et repérer les changements et signes d'alerte",
          "Mesurer et surveiller les paramètres vitaux dans le cadre de sa compétence",
          "Collaborer aux soins sur rôle prescrit sous la responsabilité de l'infirmier",
          "Alerter et transmettre sans délai toute situation à risque à l'équipe soignante"
        ]
      },
      {
        "titre": "Relation, communication et accompagnement relationnel",
        "competences": [
          "Établir une relation de confiance et une communication adaptée à la personne et à son handicap",
          "Accompagner la personne dans les situations de souffrance, d'angoisse ou de fin de vie",
          "Adapter sa posture face aux troubles du comportement et aux situations difficiles",
          "Associer la famille et l'entourage dans le respect du secret professionnel et de la discrétion"
        ]
      },
      {
        "titre": "Hygiène, prévention et sécurité",
        "competences": [
          "Appliquer les règles d'hygiène, de prévention des infections et les protocoles de l'établissement",
          "Assurer l'entretien, la désinfection et la décontamination du matériel de soins",
          "Contribuer à la prévention des risques (chutes, escarres, dénutrition) et au repérage de la douleur",
          "Respecter les règles de sécurité et les procédures en cas d'urgence"
        ]
      },
      {
        "titre": "Travail en équipe, traçabilité et développement professionnel",
        "competences": [
          "Transmettre les observations à l'oral et à l'écrit et assurer la traçabilité dans le dossier du résident",
          "Participer aux réunions d'équipe et à la mise en œuvre du projet personnalisé",
          "Accueillir et accompagner les stagiaires et les nouveaux agents",
          "Actualiser ses connaissances et s'inscrire dans une démarche de progrès et de formation continue"
        ]
      }
    ]
  },
  "Psychologue": {
    "domaines": [
      {
        "titre": "Évaluation clinique et psychologique",
        "competences": [
          "Conduire des entretiens cliniques et des observations auprès des personnes accueillies",
          "Réaliser des bilans psychologiques et des évaluations à l'aide d'outils et de tests adaptés",
          "Analyser et formuler des hypothèses cliniques sur les problématiques psychiques et le fonctionnement de la personne",
          "Repérer les situations de souffrance psychique, de crise ou de vulnérabilité et évaluer le risque"
        ]
      },
      {
        "titre": "Accompagnement thérapeutique et soutien psychologique",
        "competences": [
          "Assurer un suivi et un accompagnement psychologique individuel adapté aux besoins de la personne",
          "Concevoir et animer des prises en charge groupales et des médiations thérapeutiques",
          "Soutenir la personne dans les moments de transition, de deuil, de rupture ou de fin de vie",
          "Contribuer à la prévention et à la gestion des troubles du comportement et des situations de crise"
        ]
      },
      {
        "titre": "Contribution au projet personnalisé et à la dynamique institutionnelle",
        "competences": [
          "Apporter un éclairage clinique à l'élaboration, la mise en œuvre et l'évaluation des projets personnalisés",
          "Participer aux réunions pluridisciplinaires et de synthèse en garantissant une lecture psychologique des situations",
          "Contribuer à la réflexion éthique et à l'analyse des situations complexes",
          "Participer à l'admission et à l'accueil des personnes ainsi qu'à l'évaluation de leurs besoins"
        ]
      },
      {
        "titre": "Soutien aux équipes et aux familles",
        "competences": [
          "Soutenir et accompagner les équipes dans la compréhension des situations et de leurs pratiques",
          "Animer ou contribuer à des espaces d'analyse de la pratique et de régulation",
          "Accompagner et soutenir les familles et les proches dans leur relation à la personne accueillie",
          "Sensibiliser et transmettre des repères cliniques aux professionnels dans le respect du secret partagé"
        ]
      },
      {
        "titre": "Éthique, déontologie et développement professionnel",
        "competences": [
          "Exercer dans le respect du code de déontologie des psychologues, du secret professionnel et des droits de la personne",
          "Garantir la confidentialité et la juste transmission des informations cliniques",
          "Actualiser ses connaissances et sa pratique (supervision, formation continue, veille scientifique)",
          "Contribuer à des travaux d'étude, de recherche ou à la démarche qualité de l'établissement"
        ]
      }
    ]
  },
  "Maître / Maîtresse de maison": {
    "domaines": [
      {
        "titre": "Gestion du cadre de vie et de l'environnement quotidien",
        "competences": [
          "Assurer l'entretien des espaces de vie collectifs et privatifs dans le respect des protocoles d'hygiène et de sécurité",
          "Organiser et suivre la gestion du linge (collecte, tri, traçabilité, distribution) dans le respect des circuits propre/sale",
          "Contribuer à créer et maintenir un cadre de vie chaleureux, sécurisant et adapté aux besoins des résidents",
          "Appliquer et faire respecter les règles d'hygiène des locaux (bionettoyage, protocoles de désinfection)",
          "Repérer et signaler les dysfonctionnements matériels et besoins de maintenance des locaux"
        ]
      },
      {
        "titre": "Restauration et hygiène alimentaire",
        "competences": [
          "Préparer, réchauffer et dresser les repas dans le respect des régimes et textures adaptés aux résidents",
          "Appliquer les règles d'hygiène alimentaire et la méthode HACCP (traçabilité, chaîne du froid, températures)",
          "Gérer les approvisionnements, les stocks alimentaires et les dates limites de consommation",
          "Veiller à l'équilibre nutritionnel et au respect des préférences et prescriptions individuelles",
          "Accompagner et animer le temps du repas comme moment convivial et de lien social"
        ]
      },
      {
        "titre": "Accompagnement et participation à la vie quotidienne des résidents",
        "competences": [
          "Accompagner les résidents dans les gestes de la vie quotidienne en favorisant leur autonomie",
          "Instaurer une relation de proximité bienveillante dans le respect de la dignité et de l'intimité de la personne",
          "Associer les résidents aux tâches domestiques dans une visée éducative et d'apprentissage de l'autonomie",
          "Observer les comportements et l'état général des résidents et transmettre les informations utiles à l'équipe",
          "Contribuer au bien-être et au confort des personnes accueillies au quotidien"
        ]
      },
      {
        "titre": "Travail en équipe pluridisciplinaire et communication",
        "competences": [
          "Participer aux réunions d'équipe et contribuer à la mise en œuvre du projet personnalisé",
          "Assurer les transmissions orales et écrites relatives à la vie quotidienne des résidents",
          "Coordonner son activité avec les équipes éducatives, soignantes et logistiques",
          "Rendre compte de son activité et alerter en cas de situation préoccupante",
          "Contribuer à la cohérence de l'accompagnement dans le respect du projet d'établissement"
        ]
      },
      {
        "titre": "Sécurité, prévention et respect des règles",
        "competences": [
          "Appliquer les règles de sécurité des biens et des personnes et les consignes en cas d'urgence",
          "Utiliser et stocker les produits d'entretien conformément aux fiches de données de sécurité",
          "Repérer et prévenir les risques domestiques et signaler les situations de danger",
          "Respecter les règles de confidentialité et le secret professionnel partagé",
          "Contribuer à la démarche qualité et à l'amélioration continue des pratiques"
        ]
      }
    ]
  },
  "Veilleur de nuit": {
    "domaines": [
      {
        "titre": "Surveillance et sécurité des personnes et des biens",
        "competences": [
          "Assurer la surveillance active des résidents et des locaux tout au long de la nuit par des rondes régulières",
          "Veiller à la sécurité des biens et des personnes et contrôler les accès et fermetures de l'établissement",
          "Détecter et prévenir les situations à risque (fugue, chute, malaise, incendie, intrusion)",
          "Appliquer les consignes de sécurité incendie et les procédures d'évacuation",
          "Vérifier le bon fonctionnement des dispositifs de sécurité et d'alarme"
        ]
      },
      {
        "titre": "Accompagnement et bien-être nocturne des résidents",
        "competences": [
          "Répondre aux besoins et sollicitations des résidents durant la nuit dans le respect de leur dignité",
          "Instaurer un climat rassurant et apaisant favorisant l'endormissement et la qualité du sommeil",
          "Accompagner les levers, couchers et déplacements nocturnes en veillant au confort et à la sécurité",
          "Repérer les signes de mal-être, d'angoisse ou de douleur et apporter une présence rassurante",
          "Respecter l'intimité, les rythmes et les habitudes de vie de chaque personne accueillie"
        ]
      },
      {
        "titre": "Gestion des situations d'urgence et premiers secours",
        "competences": [
          "Évaluer la gravité d'une situation d'urgence et déclencher la conduite à tenir adaptée",
          "Réaliser les gestes de premiers secours dans l'attente des services compétents",
          "Alerter les services d'urgence et l'astreinte selon les procédures établies",
          "Réagir avec calme et discernement face à un comportement agité ou une situation de crise",
          "Rendre compte précisément des incidents survenus durant la nuit"
        ]
      },
      {
        "titre": "Transmissions, traçabilité et travail en équipe",
        "competences": [
          "Assurer les transmissions écrites et orales avec les équipes de jour lors des relèves",
          "Renseigner les outils de traçabilité (cahier de liaison, registre des rondes, événements indésirables)",
          "Transmettre les observations utiles à la continuité de l'accompagnement des résidents",
          "S'inscrire dans la continuité du projet personnalisé et du projet d'établissement",
          "Respecter le secret professionnel et les règles de confidentialité"
        ]
      },
      {
        "titre": "Entretien, logistique et cadre de vie nocturne",
        "competences": [
          "Réaliser les tâches d'entretien et de remise en ordre des locaux confiées durant la nuit",
          "Préparer les éléments nécessaires au bon déroulement de la journée suivante (petit-déjeuner, linge)",
          "Veiller au maintien d'un environnement propre, calme et sécurisé",
          "Signaler les dysfonctionnements matériels et besoins de maintenance constatés",
          "Appliquer les protocoles d'hygiène dans l'exécution des tâches logistiques"
        ]
      }
    ]
  },
  "Agent hôtelier": {
    "domaines": [
      {
        "titre": "Hygiène des locaux et bio-nettoyage",
        "competences": [
          "Réaliser le bio-nettoyage des chambres, sanitaires et locaux communs selon les protocoles d'hygiène en vigueur",
          "Appliquer les techniques de nettoyage et de désinfection adaptées aux différentes surfaces et zones à risque",
          "Respecter les circuits propre/sale et les règles de prévention des infections associées aux soins",
          "Utiliser et doser les produits d'entretien dans le respect des fiches techniques et des règles de sécurité (FDS)",
          "Tracer les opérations de nettoyage sur les supports prévus et signaler les anomalies constatées"
        ]
      },
      {
        "titre": "Service hôtelier et restauration",
        "competences": [
          "Assurer la mise en place, le dressage et le service des repas dans le respect des régimes et textures prescrits",
          "Appliquer les règles d'hygiène alimentaire et la méthode HACCP (marche en avant, chaîne du froid, traçabilité)",
          "Réaliser la plonge, l'entretien de l'office et le rangement des denrées et de la vaisselle",
          "Veiller à la présentation soignée des plats et à une ambiance de repas conviviale et sécurisante",
          "Gérer les stocks de linge, de produits et de consommables hôteliers et signaler les besoins de réapprovisionnement"
        ]
      },
      {
        "titre": "Confort, cadre de vie et accompagnement du résident",
        "competences": [
          "Contribuer au confort, au bien-être et au respect de l'intimité et de la dignité des résidents",
          "Adapter sa posture et sa communication aux personnes en situation de handicap accueillies",
          "Participer à la création d'un cadre de vie agréable, propre et sécurisé au sein de l'établissement",
          "Observer l'état général et les habitudes de vie du résident et transmettre les informations utiles à l'équipe",
          "Accompagner ponctuellement le résident dans les gestes du quotidien en lien avec l'équipe éducative et soignante"
        ]
      },
      {
        "titre": "Gestion du linge et des équipements",
        "competences": [
          "Assurer le tri, le lavage, le séchage et le repassage du linge dans le respect des circuits d'hygiène",
          "Entretenir et ranger le linge plat et le linge des résidents selon les procédures de l'établissement",
          "Vérifier le bon fonctionnement et l'entretien courant du matériel hôtelier et électroménager",
          "Signaler les dysfonctionnements du matériel et les besoins de maintenance"
        ]
      },
      {
        "titre": "Sécurité, travail en équipe et cadre institutionnel",
        "competences": [
          "Appliquer les règles de sécurité, les gestes et postures et les consignes de prévention des risques professionnels",
          "Connaître et respecter les procédures en cas d'urgence, d'incendie ou d'alerte sanitaire",
          "Inscrire son action dans le projet d'établissement et le respect du secret professionnel et de la discrétion",
          "Coopérer avec les équipes pluridisciplinaires et participer aux temps de transmission et de réunion",
          "Rendre compte de son activité et respecter le règlement de fonctionnement et les protocoles internes"
        ]
      }
    ]
  },
  "Agent d'entretien": {
    "domaines": [
      {
        "titre": "Maintenance des bâtiments et installations",
        "competences": [
          "Réaliser les travaux courants d'entretien et de petites réparations (plomberie, électricité, menuiserie, peinture, serrurerie) dans le respect des habilitations",
          "Diagnostiquer les dysfonctionnements et déterminer les interventions à réaliser ou à sous-traiter",
          "Assurer l'entretien préventif et curatif des équipements techniques et du mobilier",
          "Suivre les contrôles réglementaires et accompagner les interventions des entreprises extérieures",
          "Renseigner les carnets de maintenance et tracer les interventions réalisées"
        ]
      },
      {
        "titre": "Entretien des espaces extérieurs et des abords",
        "competences": [
          "Assurer l'entretien des espaces verts, des allées et des abords de l'établissement",
          "Réaliser les opérations d'entretien saisonnier (tonte, taille, déneigement, salage)",
          "Veiller à la propreté, à l'accessibilité et à la sécurité des cheminements et des espaces extérieurs",
          "Entretenir et ranger le matériel et l'outillage de jardinage et d'entretien"
        ]
      },
      {
        "titre": "Sécurité des personnes et des biens",
        "competences": [
          "Appliquer les règles de sécurité incendie et contribuer au bon fonctionnement des dispositifs de sécurité (alarmes, extincteurs, issues de secours)",
          "Veiller à l'accessibilité des locaux aux personnes en situation de handicap et signaler les points de vigilance",
          "Identifier et signaler les situations à risque pour les résidents, les salariés et les visiteurs",
          "Respecter et faire respecter les consignes de sécurité et les procédures d'urgence de l'établissement",
          "Manipuler et stocker les produits dangereux dans le respect des règles de prévention (FDS, EPI)"
        ]
      },
      {
        "titre": "Gestion technique, stocks et logistique",
        "competences": [
          "Gérer les stocks de matériel, d'outillage et de consommables techniques et anticiper les réapprovisionnements",
          "Suivre les commandes, réceptionner et vérifier la conformité des livraisons",
          "Organiser et prioriser ses interventions à partir des demandes et du planning de maintenance",
          "Assurer la manutention et l'aménagement des locaux (déménagements, installations, préparation de salles)"
        ]
      },
      {
        "titre": "Travail en équipe et cadre institutionnel",
        "competences": [
          "Inscrire son action dans le projet d'établissement et adapter sa posture à la présence des résidents",
          "Coopérer avec les équipes éducatives, soignantes et administratives et transmettre les informations utiles",
          "Respecter le secret professionnel, la discrétion et le règlement de fonctionnement",
          "Rendre compte de son activité et proposer des améliorations du cadre de vie et de sécurité",
          "Appliquer les gestes et postures de prévention des risques professionnels liés à l'activité technique"
        ]
      }
    ]
  },
  "Secrétaire / Assistant administratif": {
    "domaines": [
      {
        "titre": "Accueil, communication et information",
        "competences": [
          "Assurer l'accueil physique et téléphonique des résidents, des familles, des partenaires et des visiteurs",
          "Adapter sa communication et sa posture aux publics accueillis, notamment aux personnes en situation de handicap et à leurs proches",
          "Orienter les demandes vers les interlocuteurs compétents et assurer la transmission des messages",
          "Rédiger, mettre en forme et diffuser des courriers, comptes rendus et documents administratifs",
          "Contribuer à la circulation de l'information au sein de l'établissement dans le respect de la confidentialité"
        ]
      },
      {
        "titre": "Gestion administrative des dossiers",
        "competences": [
          "Constituer, mettre à jour et suivre les dossiers administratifs des résidents (admission, renouvellement, sortie)",
          "Assurer le suivi des notifications MDPH, des orientations et des échéances administratives",
          "Gérer le classement, l'archivage et la traçabilité des documents dans le respect des durées de conservation",
          "Préparer et suivre les dossiers du personnel en lien avec le service des ressources humaines",
          "Veiller à la conformité des dossiers au regard des obligations réglementaires et du RGPD"
        ]
      },
      {
        "titre": "Organisation, planification et logistique administrative",
        "competences": [
          "Organiser les agendas, prendre et gérer les rendez-vous et convoquer les réunions",
          "Préparer, organiser et assurer le suivi logistique des réunions et instances (ordres du jour, comptes rendus)",
          "Gérer les commandes de fournitures administratives et le suivi des prestataires",
          "Planifier et prioriser ses tâches en fonction des échéances et des urgences",
          "Contribuer au suivi des plannings et à la gestion des transports et déplacements"
        ]
      },
      {
        "titre": "Outils bureautiques et numériques",
        "competences": [
          "Maîtriser les logiciels de bureautique (traitement de texte, tableur, messagerie) et les outils collaboratifs",
          "Utiliser le logiciel de dossier usager informatisé et les progiciels métiers de l'établissement",
          "Produire des tableaux de bord, statistiques et indicateurs d'activité",
          "Appliquer les règles de sécurité informatique et de protection des données personnelles"
        ]
      },
      {
        "titre": "Cadre institutionnel et travail en équipe",
        "competences": [
          "Inscrire son activité dans le projet d'établissement et le cadre réglementaire du secteur médico-social",
          "Respecter le secret professionnel, la confidentialité et la discrétion sur les informations traitées",
          "Coopérer avec les équipes pluridisciplinaires, la direction et les partenaires extérieurs",
          "Rendre compte de son activité et alerter sur les dysfonctionnements ou les échéances à risque",
          "Contribuer à l'amélioration continue des procédures administratives"
        ]
      }
    ]
  },
  "Comptable": {
    "domaines": [
      {
        "titre": "Comptabilité générale et tenue des comptes",
        "competences": [
          "Assurer la saisie, l'imputation et le contrôle des écritures comptables dans le respect du plan comptable applicable au secteur (M22 / plan comptable associatif)",
          "Effectuer les rapprochements bancaires et le lettrage des comptes",
          "Réaliser les opérations de clôture et participer à l'élaboration du bilan et du compte de résultat",
          "Justifier et documenter les soldes des comptes et préparer les éléments de révision comptable",
          "Garantir la fiabilité, la traçabilité et l'archivage des pièces comptables"
        ]
      },
      {
        "titre": "Comptabilité fournisseurs, clients et trésorerie",
        "competences": [
          "Traiter les factures fournisseurs, contrôler leur conformité et préparer les règlements dans les délais",
          "Assurer la facturation, le suivi des encaissements et la relance des créances",
          "Suivre la trésorerie, établir les états de rapprochement et anticiper les besoins de financement",
          "Gérer la comptabilité des résidents (facturation des frais de séjour, argent de poche, régie)",
          "Contrôler et suivre les subventions, dotations et financements des autorités de tarification (ARS, Conseil départemental)"
        ]
      },
      {
        "titre": "Gestion budgétaire et analytique",
        "competences": [
          "Participer à l'élaboration et au suivi du budget prévisionnel et de l'EPRD/ERRD",
          "Assurer le suivi budgétaire, analyser les écarts et alerter la direction",
          "Mettre en place et exploiter la comptabilité analytique par section (groupes fonctionnels)",
          "Produire des tableaux de bord, indicateurs de gestion et états financiers pour le pilotage",
          "Contribuer à la préparation des campagnes budgétaires et des rapports aux financeurs"
        ]
      },
      {
        "titre": "Obligations fiscales, sociales et réglementaires",
        "competences": [
          "Établir et transmettre les déclarations fiscales et sociales dans le respect des échéances",
          "Appliquer la réglementation comptable et budgétaire propre aux établissements médico-sociaux",
          "Contribuer à la préparation de la paie et au contrôle des charges sociales en lien avec le service RH",
          "Préparer les éléments nécessaires au commissaire aux comptes et aux contrôles des autorités de tarification",
          "Assurer une veille réglementaire comptable, fiscale et sectorielle"
        ]
      },
      {
        "titre": "Outils, organisation et cadre institutionnel",
        "competences": [
          "Maîtriser le logiciel de comptabilité et les outils bureautiques (tableur avancé, requêtes, tableaux de bord)",
          "Organiser et prioriser son activité en fonction du calendrier comptable et des échéances",
          "Respecter le secret professionnel, la confidentialité et les règles de contrôle interne",
          "Inscrire son action dans le projet d'établissement et coopérer avec la direction, les services et les partenaires",
          "Proposer des améliorations des procédures comptables et contribuer à la sécurisation des processus"
        ]
      }
    ]
  },
  "Chef de service": {
    "domaines": [
      {
        "titre": "Encadrement et animation d'équipe",
        "competences": [
          "Organiser, coordonner et planifier le travail de l'équipe éducative et sociale (plannings, roulements, continuité de service)",
          "Animer et conduire les réunions d'équipe, de synthèse et de coordination clinique",
          "Accompagner la montée en compétences des professionnels (identification des besoins de formation, tutorat, accueil des stagiaires et nouveaux salariés)",
          "Prévenir et réguler les tensions et conflits au sein de l'équipe",
          "Conduire les entretiens professionnels et soutenir la posture professionnelle des salariés",
          "Fédérer l'équipe autour du projet d'établissement et des valeurs associatives"
        ]
      },
      {
        "titre": "Pilotage de l'accompagnement des résidents",
        "competences": [
          "Garantir la mise en œuvre et le suivi des projets personnalisés d'accompagnement (PPA)",
          "Veiller au respect des droits, de la dignité et de la participation des personnes accueillies (loi 2002-2, CVS)",
          "Assurer la qualité et la continuité de l'accompagnement au quotidien dans le cadre du projet de service",
          "Prévenir et traiter les situations de maltraitance et promouvoir la bientraitance",
          "Coordonner le parcours des résidents avec les partenaires et les familles"
        ]
      },
      {
        "titre": "Gestion administrative, budgétaire et logistique du service",
        "competences": [
          "Assurer le suivi administratif du service et la fiabilité des écrits professionnels",
          "Contribuer à l'élaboration et au suivi du budget de fonctionnement du service",
          "Gérer les ressources matérielles et logistiques nécessaires à l'activité",
          "Renseigner et exploiter les indicateurs d'activité et les tableaux de bord",
          "Veiller à la tenue et à la traçabilité des dossiers des usagers dans le respect du RGPD"
        ]
      },
      {
        "titre": "Démarche qualité, sécurité et gestion des risques",
        "competences": [
          "Participer à la démarche d'amélioration continue de la qualité et à l'évaluation (HAS)",
          "Veiller au respect des règles d'hygiène, de sécurité et des conditions de travail",
          "Recueillir, analyser et traiter les événements indésirables et mettre en œuvre les actions correctives",
          "Appliquer et faire appliquer les procédures et protocoles internes",
          "Contribuer à la gestion de crise et à la continuité de service"
        ]
      },
      {
        "titre": "Travail en réseau, partenariats et communication",
        "competences": [
          "Développer et entretenir les partenariats du territoire (secteur médico-social, sanitaire, social)",
          "Représenter le service auprès des partenaires, familles et institutions par délégation de la direction",
          "Assurer la circulation de l'information ascendante et descendante entre l'équipe et la direction",
          "Contribuer à l'inscription du service dans le projet associatif et les politiques publiques",
          "Participer aux instances internes et aux dynamiques inter-établissements"
        ]
      }
    ]
  },
  "Responsable hébergement": {
    "domaines": [
      {
        "titre": "Organisation et gestion de la vie quotidienne en hébergement",
        "competences": [
          "Organiser le cadre de vie et le quotidien des résidents dans le respect de leur rythme et de leur autonomie",
          "Garantir la qualité de l'accueil, de la restauration, de l'entretien et du confort des lieux de vie",
          "Coordonner l'occupation des chambres et la gestion des admissions, transferts et sorties",
          "Veiller au respect du règlement de fonctionnement et des règles de vie collective",
          "Adapter l'environnement d'hébergement aux besoins et au handicap des personnes accueillies"
        ]
      },
      {
        "titre": "Encadrement des équipes d'hébergement",
        "competences": [
          "Encadrer, coordonner et planifier les équipes (surveillants de nuit, maîtres et maîtresses de maison, agents de service, personnel éducatif)",
          "Organiser la continuité de service, y compris la nuit et les week-ends",
          "Animer les réunions d'organisation et transmettre les consignes de service",
          "Accompagner les professionnels dans leur pratique et favoriser la cohésion d'équipe",
          "Participer au recrutement, à l'intégration et à l'évaluation des personnels d'hébergement"
        ]
      },
      {
        "titre": "Sécurité des personnes, des biens et des bâtiments",
        "competences": [
          "Veiller à la sécurité des personnes accueillies et des locaux (ERP, incendie, commissions de sécurité)",
          "Assurer le suivi de la maintenance, des travaux et de l'entretien du patrimoine bâti",
          "Appliquer et faire appliquer les protocoles d'hygiène, notamment en restauration (HACCP)",
          "Gérer les situations d'urgence et mettre en œuvre les procédures d'alerte et d'évacuation",
          "Contrôler la conformité et la traçabilité des vérifications techniques réglementaires"
        ]
      },
      {
        "titre": "Accompagnement et bientraitance des résidents",
        "competences": [
          "Garantir le respect de la dignité, de l'intimité et des droits des personnes hébergées",
          "Contribuer à la mise en œuvre des projets personnalisés dans la dimension vie quotidienne",
          "Favoriser l'autonomie, la participation et l'expression des résidents dans leur lieu de vie",
          "Prévenir et signaler les situations de maltraitance et promouvoir la bientraitance",
          "Soutenir le lien avec les familles et les représentants légaux autour du cadre de vie"
        ]
      },
      {
        "titre": "Gestion logistique, budgétaire et qualité",
        "competences": [
          "Gérer les approvisionnements, les stocks et les prestataires (restauration, lingerie, entretien)",
          "Suivre le budget d'hébergement et optimiser les moyens matériels et logistiques",
          "Participer à la démarche qualité et au suivi des indicateurs relatifs à l'hébergement",
          "Recueillir et traiter les événements indésirables liés au cadre de vie",
          "Rédiger et actualiser les procédures et les écrits professionnels du service hébergement"
        ]
      }
    ]
  },
  "Directeur d'établissement": {
    "domaines": [
      {
        "titre": "Définition et pilotage stratégique du projet d'établissement",
        "competences": [
          "Élaborer, conduire et évaluer le projet d'établissement en cohérence avec le projet associatif et les politiques publiques",
          "Décliner les orientations stratégiques en objectifs opérationnels et plans d'action",
          "Piloter la démarche d'amélioration continue de la qualité et les évaluations (HAS, CPOM)",
          "Anticiper les évolutions du secteur et adapter l'offre de service aux besoins des personnes accueillies",
          "Garantir l'inscription de l'établissement dans les dynamiques territoriales et partenariales"
        ]
      },
      {
        "titre": "Management des ressources humaines",
        "competences": [
          "Définir l'organisation, les délégations et l'encadrement de l'ensemble des équipes",
          "Conduire la politique de recrutement, de formation et de gestion des compétences (GPEC)",
          "Animer le dialogue social et présider ou piloter les instances représentatives du personnel",
          "Veiller à la qualité de vie au travail, à la prévention des risques professionnels et des RPS",
          "Garantir l'application du droit du travail et de la convention collective applicable"
        ]
      },
      {
        "titre": "Gestion administrative, budgétaire et financière",
        "competences": [
          "Élaborer, exécuter et suivre le budget (EPRD/ERRD) et rendre compte de la gestion financière",
          "Négocier et suivre les moyens avec les autorités de tarification et de contrôle (ARS, Conseil départemental)",
          "Garantir la sécurité juridique de l'établissement et la conformité réglementaire des activités",
          "Piloter la gestion du patrimoine, des investissements et de la sécurité des biens et des personnes",
          "Superviser les tableaux de bord d'activité, financiers et de gestion des risques"
        ]
      },
      {
        "titre": "Garantie de la qualité de l'accompagnement et des droits des usagers",
        "competences": [
          "Garantir le respect des droits fondamentaux, de la dignité et de la sécurité des personnes accueillies (loi 2002-2)",
          "Veiller à la mise en œuvre et à la personnalisation des projets d'accompagnement",
          "Promouvoir la bientraitance et prévenir, traiter et signaler les situations de maltraitance",
          "Assurer le fonctionnement des instances de participation des usagers (CVS)",
          "Garantir la continuité, la sécurité et la qualité des parcours et des prises en charge"
        ]
      },
      {
        "titre": "Communication institutionnelle et représentation",
        "competences": [
          "Représenter l'établissement auprès des autorités, partenaires, familles et acteurs du territoire",
          "Rendre compte de l'activité à l'organisme gestionnaire et aux instances de gouvernance",
          "Développer les coopérations, réseaux et partenariats stratégiques",
          "Conduire la communication interne et externe et la gestion de crise",
          "Porter les valeurs associatives et l'éthique institutionnelle auprès de l'ensemble des acteurs"
        ]
      }
    ]
  }
};
