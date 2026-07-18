/* ══════════════════════════════════════════════════════════════════════════
   portal-tuto-data.js — Contenu du tutoriel d'accueil des portails.
   window.PORTAL_TUTO[page] = { role, mode:[…], sync, ex }.
   Consommé par js/portal-tuto.js (composant de rendu partagé).
   ══════════════════════════════════════════════════════════════════════════ */
window.PORTAL_TUTO = {
  "journee.html": {
    "role": "Le fil de la journée, quart par quart : chaque geste d'accompagnement prévu au projet personnalisé (🎯) se coche d'un tap, horodaté, avec le niveau de soutien apporté.",
    "mode": [
      "Choisissez le quart en haut : « ☀️ Matin », « 🌤 Après-midi » ou « 🌙 Soir & nuit ».",
      "Repérez un résident dans le bandeau de pastilles (badge « n à faire ») ou faites défiler la liste.",
      "Touchez le grand cercle « ✓ » à gauche d'un moment pour le marquer fait ; re-touchez pour annuler.",
      "Après la coche, précisez le soutien apporté (Autonomie, Supervision, Aide partielle…).",
      "Si le moment n'a pas lieu, touchez « ⏭ Reporter » et choisissez un motif."
    ],
    "sync": "Projet personnalisé (objectifs) · Tableau de bord éducateur (carte « Journée des référés » et répartition des niveaux de soutien).",
    "ex": "Ce matin, vous cochez « Préparer son petit-déjeuner » en « aide partielle » : la tâche passe en vert et le niveau remonte au tableau de bord."
  },
  "transmissions.html": {
    "role": "Raconter l'essentiel d'un moment — ce qui a été observé, dit, fait — en une note courte reliée au résident, au fil de la journée.",
    "mode": [
      "Parcourez le tableau du jour, réparti en colonnes « Matin », « Après-midi » et « Nuit ».",
      "Cliquez une carte floutée « Cliquer pour lire » pour l'afficher et la marquer comme lue.",
      "Pour écrire : « Nouvelle transmission », choisissez catégorie, résident et priorité, rédigez l'observation, puis « Enregistrer ».",
      "Sur une carte lue, répondez avec « 💬 » ou classez-la en « Journal » ou « Incident ».",
      "Ouvrez une journée passée via « 🗂 Jours précédents »."
    ],
    "sync": "Fil de vie du tableau de bord · Fiche du résident · Niveau de soutien indiqué (répartition du tableau de bord).",
    "ex": "« Sieste agitée, s'est apaisé en musique » : la transmission apparaît aussitôt dans le fil de vie de ses référents."
  },
  "presences.html": {
    "role": "Pointer qui est présent, absent ou sorti, jour par jour — la photographie de qui est là.",
    "mode": [
      "Vérifiez la date en haut ; changez de jour avec « ← » « → », le champ date ou « Aujourd'hui ».",
      "Touchez la tuile d'un résident pour faire défiler son état : présent → absent → sortie → non pointé.",
      "Pour un motif, faites un appui long sur la tuile (ou « ✎ »), choisissez le statut, puis « Enregistrer ».",
      "Cliquez « ✓ Tous présents » pour pointer d'un coup ceux encore non pointés.",
      "« 📥 Export » : renseignez la période puis « 📥 Exporter PDF »."
    ],
    "sync": "Planning / Semaine type : les absences récurrentes saisies s'y répercutent automatiquement.",
    "ex": "Vous notez M. B. « absent — hôpital » : l'absence apparaît sur son planning de la semaine."
  },
  "nuit.html": {
    "role": "Le relais du veilleur : levers, observations et incidents de la nuit, consignés pour l'équipe de jour.",
    "mode": [
      "Choisissez la nuit puis cliquez « 🌙 Ouvrir le cahier de cette nuit ».",
      "Ajustez l'« Effectif » présent et l'« Ambiance » (calme, agitée, très agitée).",
      "Pour chaque ronde : saisissez l'heure, cochez « RAS » ou ajoutez une observation, puis « + Ronde ».",
      "Signalez un incident avec « + Événement » ; notez un appel avec « + Appel astreinte ».",
      "Rédigez « Transmission pour l'équipe du matin » : elle s'enregistre toute seule."
    ],
    "sync": "Relais nuit → équipe de jour · Fiche du résident.",
    "ex": "« Réveil à 3 h, a demandé un verre d'eau, s'est rendormi » : l'équipe du matin lit la nuit en un coup d'œil."
  },
  "repas.html": {
    "role": "Le régime, la texture et les précautions alimentaires de chaque résident — la référence à table et en cuisine.",
    "mode": [
      "Choisissez le jour (champ date, flèches ou frise) ; « Aujourd'hui » revient au jour même.",
      "Dans « 🍽 Menus du jour », saisissez « Menu 1 » et « Menu 2 » du midi et du soir.",
      "Tous sont inscrits par défaut : cliquez la case d'un repas pour retirer (ou réinscrire) un absent.",
      "Réglez le régime d'un présent via « 🍽 » puis « 💾 Enregistrer ».",
      "« 🖨 Feuille cuisine » imprime le récapitulatif pour la cuisine."
    ],
    "sync": "Fiche du résident (données de santé) · Service des repas.",
    "ex": "M. R. : « texture mixée, sans porc » — l'information suit le résident à chaque service."
  },
  "activites.html": {
    "role": "Les activités proposées et réalisées, reliées aux objectifs du projet — la vie sociale et les apprentissages.",
    "mode": [
      "« Nouvelle activité » : renseignez nom, catégorie, jour, horaires, lieu et « Places maximum », puis « 💾 Enregistrer ».",
      "Filtrez avec « Toutes catégories » et « Tous les jours ».",
      "« 👥 Participants » : choisissez un résident puis « + Inscrire » (ou « ↩ Désinscrire »).",
      "« 📝 » : choisissez l'année, rédigez le bilan puis « 💾 Enregistrer le bilan ».",
      "Gérez la carte : « ⏸ Suspendre » / « ▶ Réactiver », « ✎ » modifier, « ✕ » supprimer."
    ],
    "sync": "Projet personnalisé (objectifs) · Suivi du résident.",
    "ex": "Atelier cuisine du jeudi : vous notez la participation de Mme L., reliée à son objectif « gagner en autonomie »."
  },
  "medicaments.html": {
    "role": "Le circuit du médicament : tracer chaque distribution — qui, quoi, quand — pour sécuriser la prise.",
    "mode": [
      "La date du jour s'affiche en haut à droite par défaut.",
      "Choisissez le moment : « Matin », « Midi », « Soir » ou « Coucher ».",
      "Tapez la tuile d'un résident pour marquer « Donné » ; re-tapez pour annuler.",
      "Autre cas : « ✎ » (ou appui long) → « Confié », « Refusé », « Absent » ou « Reporté » + observation.",
      "Filtrez « Présents seulement » ou imprimez « 🖨 Feuille du jour »."
    ],
    "sync": "Prescriptions · Fiche de santé · Traçabilité horodatée de la distribution.",
    "ex": "Distribution de 12 h validée pour M. T. : l'heure et l'intervenant sont enregistrés, la case ne peut plus être oubliée."
  },
  "plan-soins.html": {
    "role": "Les soins récurrents planifiés (pansement, surveillance, hygiène) — le fil conducteur soignant.",
    "mode": [
      "« Nouveau soin » (en haut à droite) ouvre la fiche.",
      "Choisissez le « Résident concerné », la « Catégorie » et la « Fréquence ».",
      "Saisissez le « Libellé du soin » (obligatoire), puis détail, intervenant et note.",
      "« Enregistrer » : le soin apparaît dans la frise du résident.",
      "Filtrez par résident/catégorie ; sur chaque soin : « ✎ » modifier, « ⏸ » suspendre, « ✕ » supprimer."
    ],
    "sync": "Fiche de santé du résident · Équipe soignante.",
    "ex": "Réfection de pansement programmée tous les 2 jours : le plan rappelle l'échéance à l'équipe."
  },
  "mes-absences.html": {
    "role": "Espace personnel où le salarié déclare et suit ses propres arrêts et absences (maladie, accident du travail, congé maternité, etc.).",
    "mode": [
      "Cliquer sur « Déclarer une absence » en haut à droite.",
      "Choisir le « Type » d'absence, puis remplir la « Date début » (obligatoire) et la « Date fin (si connue) ».",
      "Ajouter éventuellement un « Motif / précisions » et joindre un « Justificatif » (PDF ou image, max 5 Mo).",
      "Cliquer sur « 💾 Enregistrer » : l'absence apparaît alors dans la liste, avec le nombre de jours et un badge « En cours » si elle n'est pas terminée.",
      "Sur une ligne de la liste, utiliser ✎ pour modifier ou ajouter un justificatif, « 📎 Voir le justificatif » pour l'ouvrir, ou ✕ pour supprimer."
    ],
    "sync": "L'espace s'appuie sur la fiche salarié de l'utilisateur connecté : chaque absence déclarée y reste rattachée, et si le compte n'est encore relié à aucune fiche, un message invite à contacter l'administrateur.",
    "ex": "Un éducateur déclare un arrêt maladie du 20 au 24 juillet, y joint la photo de son arrêt de travail, puis le retrouve marqué « En cours » dans sa liste."
  },
  "mes-conges.html": {
    "role": "Permet à chaque salarié de suivre le récapitulatif de ses congés et de déposer ses demandes d'absence.",
    "mode": [
      "Cliquer sur « Nouvelle demande » en haut de la page.",
      "Choisir le « Type » (Congés payés, RTT, Enfant malade, Formation, Autre) puis renseigner « Date début » et « Date fin ».",
      "Ajouter au besoin un « Motif », puis cliquer sur « Envoyer la demande ».",
      "Suivre l'état de chaque demande grâce aux étiquettes « En attente », « Accepté » ou « Refusé ».",
      "Pour retirer une demande encore en attente, cliquer sur « ✕ Annuler la demande »."
    ],
    "sync": "La page s'appuie sur votre fiche salarié : sans rattachement à une fiche, aucune demande n'est possible. Les demandes envoyées sont ensuite traitées par un responsable, et la réponse (accepté ou refusé, avec le nom du valideur et le motif de refus) s'affiche ici.",
    "ex": "Un éducateur pose une semaine de congés payés du 10 au 16 août ; la demande apparaît « En attente » jusqu'à la réponse de son responsable."
  },
  "mes-formations.html": {
    "role": "« Mes formations » est l'espace personnel où le salarié consulte les formations qui le concernent et gère lui-même ses inscriptions.",
    "mode": [
      "Choisir la vue dans le menu déroulant : « Formations à venir », « Mes inscriptions », « Passées / suivies » ou « Toutes ».",
      "Repérer la formation voulue grâce à son titre, son domaine, ses dates, son organisme, sa durée et sa jauge de places.",
      "Cliquer sur « S'inscrire » pour rejoindre une session planifiée encore ouverte (le bouton affiche le nombre de places, ou « Complet » si elle est pleine).",
      "Cliquer sur « ✓ Inscrit · Se désinscrire » pour retirer votre participation à une formation à venir.",
      "Retrouver dans « Passées / suivies » les sessions déjà déroulées, marquées « Suivie » ou « Terminée »."
    ],
    "sync": "Le module s'appuie sur votre fiche salarié reliée à votre compte — sans ce lien, l'inscription est impossible et un message invite à contacter l'administrateur — et chaque inscription ou désinscription met à jour la liste des inscrits partagée sur la formation, tandis que le bouton « Portail » ramène à l'accueil.",
    "ex": "Par exemple, un éducateur sélectionne « Formations à venir », repère une session « Prévention et gestion de l'agressivité » affichant 6/8 places et clique sur « S'inscrire » pour y participer."
  },
  "mes-fiches-paie.html": {
    "role": "Espace personnel où chaque salarié retrouve et télécharge ses propres bulletins de paie, avec un net estimé pour chaque période.",
    "mode": [
      "Ouvrir la page « Mes fiches de paie ».",
      "Affiner la liste avec le menu déroulant « Toutes les années ».",
      "Repérer le bon mois sur sa vignette (période + « Net estimé »).",
      "Cliquer « ⬇ Télécharger » pour ouvrir le bulletin.",
      "Revenir à l'accueil avec le bouton « Portail »."
    ],
    "sync": "Chaque bulletin est déposé par l'employeur et rattaché à la fiche du salarié connecté ; si le compte n'est relié à aucune fiche salarié, un message invite à contacter l'administrateur.",
    "ex": "En juin, une aide-soignante ouvre la page, choisit « 2026 » dans le menu et télécharge son bulletin de « Mai 2026 »."
  },
  "planning-equipe.html": {
    "role": "Construire et suivre le planning des créneaux de travail de l'équipe, semaine par semaine ou mois par mois, avec le total d'heures et l'écart par rapport au contrat.",
    "mode": [
      "Choisir la période avec les flèches, le bouton « Aujourd'hui » ou la bascule « Semaine » / « Mois ».",
      "Au besoin, restreindre l'affichage avec le menu déroulant « Tous les métiers ».",
      "Cliquer sur une case (jour × employé) pour ouvrir le créneau, saisir « Début » et « Fin », puis « 💾 Enregistrer ».",
      "Réutiliser une trame avec « 📋 Copier semaine -1 » ; retirer un créneau avec « 🗑 Supprimer ».",
      "Sortir le planning via « 📊 Exporter CSV » ou « 🖨 Imprimer », ou charger un fichier avec « 📥 Importer »."
    ],
    "sync": "Le planning s'appuie sur les fiches employés (nom, métier, heures de contrat, photo) et recoupe les congés acceptés, les absences/arrêts et les pointages : la bordure colorée de chaque créneau signale si le pointage est validé, en écart, en attente ou absent.",
    "ex": "Positionner Sophie Dubois de 13h00 à 21h00 le mardi, vérifier la couverture de la journée, puis dupliquer toute la semaine sur la suivante."
  },
  "messages.html": {
    "role": "Échanger des messages internes entre membres de l'équipe, en tête-à-tête ou en groupe, pour se coordonner au quotidien.",
    "mode": [
      "Dans la colonne de gauche, sous « Récents », cliquez sur un collègue pour ouvrir la conversation, ou sur « Nouveau » pour en démarrer une.",
      "Pour un échange à plusieurs, cochez plusieurs personnes dans la liste « Rechercher un utilisateur… », puis validez avec « Démarrer ».",
      "Rédigez votre texte dans le champ « Écrire un message… » et envoyez-le avec la touche Entrée ou le bouton d'envoi rond.",
      "Dans une conversation ouverte, utilisez le bouton « + » (Ajouter un participant) de l'en-tête pour agrandir le groupe.",
      "Retrouvez un fil grâce au champ « Search messages » ; pour l'effacer, survolez-le et cliquez la corbeille rouge, puis confirmez."
    ],
    "sync": "Les personnes joignables sont les collègues disposant d'un compte de connexion, créés depuis l'administration des employés ; un collègue sans compte n'apparaît pas, et le module ne renvoie ni vers les fiches résident ni vers le tableau de bord.",
    "ex": "Une éducatrice ouvre la conversation avec l'infirmière, écrit « Peux-tu passer voir M. Diallo avant 18 h ? » et l'envoie avec la touche Entrée."
  },
  "notes.html": {
    "role": "Prendre des notes personnelles rapides, privées à votre compte et enregistrées automatiquement au fil de la frappe.",
    "mode": [
      "Cliquez sur « Nouvelle note » pour créer une note vierge.",
      "Saisissez un intitulé dans « Titre de la note », puis rédigez votre texte dans « Écrivez votre note ici… ».",
      "Laissez faire l'enregistrement automatique : l'indication « ✓ Enregistré » confirme la sauvegarde.",
      "Retrouvez une note existante grâce au champ « Rechercher… », puis cliquez dessus dans la liste de gauche.",
      "Pour effacer la note ouverte, cliquez sur l'icône corbeille « Supprimer » et confirmez « Supprimer cette note ? »."
    ],
    "sync": "Ces notes restent strictement personnelles à votre compte : elles ne sont pas partagées avec l'équipe et ne sont rattachées à aucune fiche résident, fiche salarié ni au tableau de bord.",
    "ex": "Par exemple, noter « Rappeler le médecin traitant de M. Durand jeudi » pour ne pas l'oublier avant la prochaine réunion."
  },
  "documentation.html": {
    "role": "Centraliser les documents de référence et procédures internes de l'établissement (projet d'établissement, notes de service, règlement, comptes-rendus…) pour que chacun les retrouve et les télécharge au même endroit.",
    "mode": [
      "Cliquez sur « Ajouter un document » (bouton réservé aux encadrants).",
      "Dans la fenêtre, saisissez le « Titre », choisissez la « Catégorie » et joignez le « Fichier » (PDF, Word ou image, 3 Mo maximum).",
      "Validez avec « 💾 Enregistrer ».",
      "Pour retrouver un document, tapez dans « Rechercher un document… » ou utilisez le menu déroulant « Toutes les catégories ».",
      "Ouvrez un document avec « ⬇ Télécharger » ; supprimez-le avec la croix « ✕ » (visible seulement pour les administrateurs)."
    ],
    "sync": "La page fonctionne de manière autonome : les documents sont partagés à toute l'équipe de l'établissement et rangés par catégorie, l'ajout et la suppression restant réservés aux comptes administrateurs.",
    "ex": "Un cadre dépose le nouveau règlement intérieur dans la catégorie « Règlement intérieur » ; chaque salarié le retrouve et le télécharge depuis cette page."
  },
  "budget.html": {
    "role": "Suivre le budget de l'établissement en gérant des enveloppes budgétaires et en traitant les demandes de dépense ou de remboursement des équipes, depuis leur envoi jusqu'à la fourniture du justificatif.",
    "mode": [
      "Créez une catégorie de dépense avec « 📁 Nouvelle enveloppe » : saisissez son « Nom », son « Montant alloué (€) » puis « 💾 Enregistrer ».",
      "Ouvrez « Demande de budget », choisissez l'« Enveloppe », renseignez le « Montant (€) », la « Date de la dépense » et le « Motif », puis « Envoyer la demande ».",
      "Au besoin, cochez « 🏠 Activité éducative / séjour — partage 50% foyer / 50% résident(s) » et sélectionnez les résidents concernés pour répartir la part à rembourser.",
      "Côté encadrement, traitez chaque demande en attente avec « ✅ Accepter » ou « ❌ Refuser ».",
      "Une fois la demande acceptée, ajoutez le reçu avec « 📎 Ajouter le ticket » pour clôturer la dépense."
    ],
    "sync": "Lorsqu'une dépense est partagée 50/50, confirmer le remboursement d'un résident enregistre l'opération correspondante dans le budget de sa fiche résident ; chaque demande reste par ailleurs rattachée à l'employé qui l'a envoyée, ce qui permet de la filtrer par « Tous les employés ».",
    "ex": "Par exemple, un éducateur demande 80 € sur l'enveloppe « Activités éducatives » pour un atelier cuisine, puis joint le ticket de caisse une fois la demande acceptée."
  },
  "facturation.html": {
    "role": "Établir les tarifs de prise en charge et générer automatiquement, chaque mois, une facture par résident selon ses jours de présence et son organisme payeur.",
    "mode": [
      "Définissez vos tarifs : bouton « + Nouvelle catégorie », saisissez un « Libellé » et un « Prix par jour », puis « Enregistrer ».",
      "Dans « Affectation des résidents », reliez chaque résident à une catégorie et à un organisme payeur via les deux menus déroulants.",
      "Choisissez le mois dans le champ « Période », puis cliquez « Générer les factures » : une facture brouillon est créée par résident affecté.",
      "Suivez l'avancement avec « Marquer envoyée » puis « Marquer payée » sur chaque facture.",
      "Affinez la liste avec les filtres période, statut et organisme, et lisez les totaux affichés en haut de page."
    ],
    "sync": "La génération s'appuie sur les résidents actifs et sur leurs jours de présence enregistrés dans la feuille de présence ; les compteurs en haut de page résument les factures correspondant aux filtres choisis.",
    "ex": "Pour juin 2026, un résident en « Internat complet (7j/7) » présent 28 jours donne une facture brouillon de 28 × 120 € = 3 360 €, adressée au Conseil départemental."
  },
  "satisfaction.html": {
    "role": "Recueillir et suivre la satisfaction des résidents et de leurs familles à l'aide de questionnaires notés par thème.",
    "mode": [
      "Cliquez sur « Nouveau questionnaire » en haut à droite.",
      "Choisissez le « Résident concerné », puis renseignez le « Répondant » et le « Lien avec le résident ».",
      "Pour chaque question, touchez la case d'appréciation voulue, de « Très insatisfait » à « Très satisfait ».",
      "Ajoutez un « Commentaire libre » et cliquez sur « Enregistrer ».",
      "Consultez les moyennes par thème dans l'onglet « 📊 Résultats » ou le détail des réponses dans « 📋 Questionnaires »."
    ],
    "sync": "Chaque questionnaire peut être rattaché à un résident via le champ « Résident concerné », et lorsqu'une note globale est très faible, le module propose de basculer vers la création d'un signalement (EIG) ; l'onglet « Questions », réservé aux administrateurs, permet d'ajouter des questions personnalisées.",
    "ex": "Une famille remplit le questionnaire d'un résident en notant les repas « Satisfait » et les activités « Neutre » : la moyenne alimente aussitôt le « Score de satisfaction » et les barres par thème de l'onglet Résultats."
  },
  "inventaire.html": {
    "role": "Recenser tout le matériel et les équipements du foyer, avec leur état, leur quantité et leur emplacement, pour en suivre l'usure et la maintenance.",
    "mode": [
      "Cliquer sur « Ajouter » pour créer une fiche d'équipement.",
      "Renseigner la « Catégorie », le « Nom / désignation », l'« État », la « Localisation » et la « Quantité », puis cliquer sur « Enregistrer ».",
      "Retrouver un article via le champ « Rechercher un équipement… » ou les menus « Toutes les catégories » et « Tous les états ».",
      "Sur une carte d'article, cliquer sur ✎ pour corriger l'état, ou sur ✕ pour supprimer.",
      "Surveiller en haut les compteurs « Défaillants » et « Hors d'usage », et le repère « ⚠ Maintenance » qui s'affiche quand la dernière maintenance date de plus d'un an."
    ],
    "sync": "Le module est autonome : la « Localisation » se saisit en texte libre (par exemple une chambre ou une salle) sans lien automatique avec une fiche résident ; l'inventaire se consulte uniquement depuis cette page.",
    "ex": "Enregistrer un lit médicalisé de la chambre 12, le marquer « Défaillant » et noter la dernière maintenance pour déclencher une réparation."
  },
  "admissions.html": {
    "role": "Suivre les demandes d'admission de l'établissement, de la réception du dossier jusqu'à l'entrée effective du candidat comme résident.",
    "mode": [
      "Cliquer « Nouvelle demande » pour ouvrir le formulaire de dossier.",
      "Renseigner « Prénom », « Nom », les dates, « Orientation par » et le « Numéro de dossier MDPH », puis choisir un « Statut ».",
      "Valider avec « 💾 Enregistrer » ; le dossier apparaît alors sous forme de carte avec sa frise d'avancement.",
      "Suivre chaque dossier sur la frise (Demande → En étude → Admis → Entrée) et retrouver un candidat via « Rechercher un candidat… » ou le filtre « Tous les statuts ».",
      "Quand le dossier aboutit, cliquer « ✓ Admettre » sur la carte pour transformer le candidat en résident."
    ],
    "sync": "Le bouton « ✓ Admettre » crée automatiquement une fiche résident reprenant nom, prénom, date de naissance, date d'entrée, contact, notes et orientation ; les compteurs en haut de page (En attente, En étude, Admis, Total) se recalculent selon les statuts saisis.",
    "ex": "Un dossier orienté par la MDPH est enregistré « En attente », passe « En étude », puis, une fois la décision prise, le clic sur « ✓ Admettre » crée sa fiche résident à la date d'entrée prévue."
  },
  "ppe.html": {
    "role": "Rédiger, faire vivre et faire signer les avenants au projet personnalisé de chaque résident, domaine par domaine, tout au long de leur cycle de révision.",
    "mode": [
      "Cliquer « Nouvel avenant », choisir le résident, renseigner date de rédaction et prochaine révision, puis « Enregistrer » (ou « Générer depuis le journal »).",
      "Ouvrir l'avenant et compléter chaque domaine (Autonomie, Santé, Vie professionnelle...) : bilan, objectifs via « + Objectif », moyens, échéance, évaluation et souhaits du résident.",
      "Faire avancer le « Cycle du PPA » : « Marquer fait » les premières étapes, « Réaliser le bilan » à 6 mois, « Marquer réalisée » la réévaluation annuelle.",
      "Recueillir les signatures avec « Signer » pour la personne, le représentant légal, l'éducateur référent et la direction.",
      "Faire évoluer le statut avec « Activer » puis « Terminer », et éditer le document via « Télécharger PDF » ou « Comparer »."
    ],
    "sync": "Chaque avenant est rattaché à un résident (choisi dans la liste, informations reprises de sa fiche) ; il peut être pré-rempli à partir du journal de bord, ses codes de nomenclature validés remontent vers la fiche du résident, et les étapes du cycle inscrivent automatiquement le bilan à 6 mois et la réévaluation annuelle dans l'échéancier.",
    "ex": "À l'approche de la révision annuelle d'un résident, l'équipe rédige l'avenant, positionne la « Distance à l'objectif » selon la personne et selon l'équipe, réalise le bilan à 6 mois, fait signer les quatre parties, puis télécharge le PDF pour le dossier."
  },
  "echeances.html": {
    "role": "Suivre et anticiper les renouvellements administratifs des résidents (notifications MDPH, jugements, pièces d'identité, mutuelle, contrat de séjour, visites médicales…) grâce à des alertes déclenchées à l'approche de chaque date.",
    "mode": [
      "Cliquer sur « Nouvelle échéance » pour ouvrir le formulaire.",
      "Choisir le « Type », renseigner la « Date d'échéance », ajouter un « Libellé », rattacher un « Résident concerné » si besoin, puis « 💾 Enregistrer ».",
      "Se repérer avec les compteurs « En retard », « Sous 30 jours », « Sous 90 jours », « À venir » et filtrer la liste par résident ou par type via les menus déroulants.",
      "À réception du document renouvelé, cliquer sur « 📎 », joindre le nouveau justificatif, saisir la « Nouvelle date d'échéance » puis « ✔ Renouveler ».",
      "Cliquer sur « ✓ » pour marquer une échéance traitée, ou cocher « Afficher les échéances traitées » pour les revoir."
    ],
    "sync": "Chaque échéance peut être rattachée à un résident, avec un lien direct vers sa fiche ; lors d'un renouvellement, le document joint est classé automatiquement dans les documents de cette fiche.",
    "ex": "Enregistrer une notification MDPH qui expire dans deux mois pour un résident, la voir passer en alerte « Sous 90 jours », puis, à réception du nouvel arrêté, le joindre et reporter la date via « Renouveler »."
  },
  "documents.html": {
    "role": "Centraliser et classer les documents rattachés à chaque résident (administratif, médical, scolaire, contrat…), avec date d'échéance, téléchargement et partage éventuel avec la famille.",
    "mode": [
      "Filtrez la liste avec le champ « Résident, document, catégorie… » ou le menu « Toutes catégories ».",
      "Cliquez sur « + Ajouter » pour ouvrir la fenêtre « Ajouter un document ».",
      "Gardez le type « Résident », choisissez le résident, puis renseignez le nom, la « Date du document », la « Date d'échéance » et la catégorie.",
      "Dans la zone « Cliquez pour sélectionner », joignez le fichier (PDF, Word ou image, 3 Mo maximum), puis « Enregistrer ».",
      "Récupérez un document via l'icône de téléchargement, ou rendez-le visible à la famille avec le bouton « 👪 »."
    ],
    "sync": "Chaque document est relié à une fiche résident (nom affiché dans la liste, retrouvé aussi dans « Documents joints » de la fiche) ; les échéances dépassées ressortent en rouge, et quand un résident est filtré un encadré « Comptes famille liés » permet de créer ou lier un compte famille qui verra les documents partagés.",
    "ex": "Joindre le contrat de séjour signé d'un résident, catégorie « Contrat », avec une date d'échéance, puis le partager avec sa famille via le bouton « 👪 »."
  },
  "objectifs.html": {
    "role": "Suivre la progression de chaque résident vers ses objectifs d'accompagnement, en les découpant en étapes concrètes, et consigner les grilles d'évaluation cliniques standardisées (MIF, Barthel, SERAFIN-PH).",
    "mode": [
      "Choisir un résident dans la liste « Tous les résidents — vue d'ensemble », ou cliquer sur sa carte dans la vue d'ensemble.",
      "Cliquer « ⚙ Gérer les objectifs » pour créer et assigner un objectif (champ « Objectif * », suggestions proposées).",
      "Cliquer « + Ajouter un axe » pour découper l'objectif en étapes mesurables (champ « Axe de travail * », échéance et responsable facultatifs).",
      "Pointer l'avancement en cliquant l'un des 5 paliers de chaque axe (de « Non acquis » à « Autonome ») ; l'hexagone et la courbe se mettent à jour, puis « 🎉 marquer atteint » quand tout est à 100 %.",
      "Pour une mesure normée, ouvrir l'onglet « 📊 Grilles d'évaluation » et cliquer « Nouvelle évaluation » (MIF, Barthel ou SERAFIN-PH)."
    ],
    "sync": "L'avancement est rattaché à la fiche du résident ; les modèles d'objectifs se créent dans Administration → Objectifs, et les objectifs du projet personnalisé (avenant) s'affichent en tête, en lecture seule, avec un lien « Ouvrir l'avenant ».",
    "ex": "Pour un résident, on assigne l'objectif « Autonomie », on le découpe en axe « Préparer un repas simple en autonomie », puis on pointe « Avec supervision » (75 %) après l'atelier cuisine de la semaine."
  },
  "fiche-liaison.html": {
    "role": "Rassembler automatiquement, à partir du dossier d'un résident, toutes les informations utiles à une hospitalisation dans une fiche unique, imprimable et remise au personnel soignant.",
    "mode": [
      "Choisir la personne dans le menu déroulant « Résident : ».",
      "Cliquer sur « Actualiser » pour générer la fiche à partir de son dossier.",
      "Vérifier les sections remplies automatiquement : identité, informations médicales, traitements, plan de soins, contacts, régime.",
      "Cliquer sur « Imprimer » pour éditer le document.",
      "Faire signer les cases « Signature de l'infirmier(e) / rédacteur » et « Signature médecin / responsable »."
    ],
    "sync": "Rien ne se saisit ici : la fiche reprend automatiquement les informations déjà présentes dans le dossier du résident (identité, santé et traitements, allergies, plan de soins actif, dernière évaluation d'autonomie, contacts à prévenir, régime) et affiche l'agent connecté comme rédacteur.",
    "ex": "Un résident doit partir aux urgences : l'équipe le sélectionne, imprime sa fiche de liaison et la remet à l'hôpital avec ses traitements, ses allergies et les contacts à prévenir."
  },
  "cvs.html": {
    "role": "Animer le Conseil de la Vie Sociale : tenir la composition des membres, enregistrer les séances et leurs comptes-rendus, suivre les résolutions décidées et les thématiques rattachées à la satisfaction des résidents.",
    "mode": [
      "Composez le conseil avec « + Membre » : choisissez le « Collège » (résidents, familles, personnel, direction...), la « Qualité » (titulaire ou suppléant), au besoin le résident concerné, puis « 💾 Enregistrer ».",
      "Créez une réunion avec « Nouvelle séance » : renseignez la « Date », les « Présents », l'« Ordre du jour » et le « Compte-rendu des échanges », puis « 💾 Enregistrer ».",
      "Sur une séance, cliquez « 📋 Résolutions », saisissez le « Texte de la résolution », le « Responsable » et l'« Échéance », puis « + Ajouter » ; faites évoluer le statut (À faire / En cours / Réalisé) via le menu déroulant.",
      "Ouvrez « + Thématique » pour cadrer un sujet : donnez un « Titre », cochez les « Catégories satisfaction liées » et fixez la « Priorité » et le « Statut ».",
      "Cliquez « 🖨 Compte-rendu » pour éditer et imprimer le procès-verbal d'une séance."
    ],
    "sync": "Le module s'appuie sur les fiches résidents (photo et nom des membres du collège résidents) et sur les questionnaires de satisfaction, dont il calcule les scores par catégorie et renvoie vers la page satisfaction ; renseigner une fin de mandat crée automatiquement un rappel dans les échéances.",
    "ex": "Après la séance du trimestre, on note une résolution « Améliorer la qualité des repas », responsable la cuisine, échéance dans deux mois, puis on ouvre une thématique « Restauration » reliée au score de satisfaction correspondant pour la suivre jusqu'à sa résolution."
  },
  "eig.html": {
    "role": "Tenir le registre des événements indésirables graves (EIG) déclarables à l'ARS, en suivant chaque événement de sa déclaration jusqu'à sa clôture.",
    "mode": [
      "Depuis le module Incidents, marquez l'incident concerné avec « Marquer comme EIG » : il apparaît alors ici.",
      "Repérez l'événement dans les groupes « À déclarer », « Déclarés — suivi en cours » ou « Clôturés », et surveillez les mentions « en retard » / « Délai dépassé ».",
      "Cliquez sur « Gérer » : notez les « Mesures immédiates prises », cochez « Déclaré sur le portail des signalements (ARS) », saisissez la date et le « N° de signalement », puis cochez les « Destinataires informés ».",
      "Pour terminer, renseignez les « Mesures correctives », cochez « Dossier clôturé » avec sa date, ajoutez les « Suites données », puis cliquez « 💾 Enregistrer ».",
      "Éditez un document avec l'icône « 🖨 » d'une ligne (fiche de signalement) ou « 🖨 Registre annuel » pour l'ensemble."
    ],
    "sync": "Le registre n'affiche que les incidents cochés comme EIG dans le module Incidents ; le titre, la date, le résident concerné et les faits sont repris de la fiche incident d'origine.",
    "ex": "Une chute avec fracture d'un résident, déclarée sur le portail ARS avec son numéro de signalement, puis clôturée une fois les mesures correctives mises en place."
  },
  "repertoire.html": {
    "role": "Centraliser dans un carnet d'adresses les coordonnées des organismes et partenaires extérieurs du foyer (santé, social, prestataires…).",
    "mode": [
      "Cliquer sur « Nouveau contact » en haut à droite.",
      "Renseigner « Organisme / Partenaire » et « Nom du contact » (obligatoires), puis téléphone, email, « Fonction / Service », adresse et notes.",
      "Cliquer sur « Enregistrer ».",
      "Retrouver un contact en tapant dans le champ « Rechercher un organisme, un nom, une fonction… ».",
      "Cliquer sur une fiche pour la modifier, ou utiliser « Supprimer » pour la retirer."
    ],
    "sync": "Le répertoire est autonome : il ne se relie à aucune fiche résident ou salarié. Les coordonnées se consultent et se mettent à jour directement sur cette page, et sont visibles selon les droits d'accès de l'utilisateur.",
    "ex": "Enregistrer l'assistante sociale du secteur : organisme « Conseil départemental », nom « Mme Durand », fonction « Assistante sociale », avec son téléphone et son email."
  },
  "rh-dashboard.html": {
    "role": "Offrir à l'encadrement une vue de synthèse des ressources humaines, réunissant en un coup d'œil les compteurs clés de l'équipe et les points à surveiller (contrats, absences, congés, entretiens, formations, recrutement).",
    "mode": [
      "Consultez la rangée de compteurs en haut : « Effectif », « Absences en cours », « CDD ≤30j » et « Congés en attente ».",
      "Parcourez les cartes de suivi (« Contrats — échéances », « Absences en cours », « Congés en attente », « Entretiens à planifier », « Formations à venir », « Pipeline recrutement ») pour repérer les salariés concernés.",
      "Cliquez sur une ligne de salarié dans une carte pour ouvrir la rubrique détaillée correspondante.",
      "Utilisez le bouton « Voir tout » d'une carte pour accéder à la liste complète de la rubrique.",
      "Cliquez sur « Portail » en haut à droite pour revenir à l'accueil de pilotage."
    ],
    "sync": "La page ne fait que rassembler et afficher, sans les modifier, des informations gérées ailleurs : chaque compteur et chaque carte renvoie vers la rubrique dédiée (contrats, absences, congés, entretiens, formations, recrutement) où le détail par salarié est tenu à jour.",
    "ex": "Par exemple, le compteur « CDD ≤30j » affiche 2 et la carte « Contrats — échéances » liste un salarié dont le CDD se termine dans quelques jours (mention « J-6 »), signalant qu'un renouvellement est à préparer."
  },
  "admin.html": {
    "role": "Gérer l'annuaire du personnel et les accès à l'application : créer, modifier ou supprimer la fiche d'un salarié, et lui ouvrir (ou réinitialiser) un compte de connexion.",
    "mode": [
      "Cliquer « + Ajouter » pour ouvrir la fiche « Nouvel employé ».",
      "Remplir l'« Identité » (photo, prénom, nom, poste), les « Coordonnées » et le bloc « Contrat & rémunération ».",
      "Pour donner un accès à l'appli, choisir le « Rôle du compte » puis cliquer « Créer un compte » ; noter l'email et le mot de passe affichés.",
      "Cliquer « Enregistrer » : la personne apparaît sous forme de carte dans la liste.",
      "Filtrer avec le champ « Rechercher… », rouvrir une carte via « Modifier » (ou « Réinit. mot de passe »), et cliquer « Exporter » pour télécharger la liste en CSV."
    ],
    "sync": "Chaque carte ouvre la fiche détaillée de l'employé ; la liste des postes proposée reprend les fonctions définies dans « Catégories & objectifs », renseigner un type de contrat crée le contrat correspondant sur la page Contrats, et le « Rôle du compte » choisi détermine les droits gérés dans la rubrique Permissions.",
    "ex": "Ajouter une nouvelle éducatrice, remplir son contrat, lui « Créer un compte » de connexion, puis « Exporter » l'ensemble du personnel en CSV pour la direction."
  },
  "contacts-externes.html": {
    "role": "Tenir un répertoire des intervenants extérieurs ponctuels (vacataires, intervenants, bénévoles, prestataires) avec leurs coordonnées, sans leur créer de fiche complète.",
    "mode": [
      "Clique « Nouveau contact » pour ouvrir la fiche de saisie.",
      "Renseigne le Prénom et le Nom (obligatoires), choisis le Type (Vacataire, Intervenant, Bénévole, Prestataire, Autre) et complète Fonction, Téléphone, Email et Notes.",
      "Clique « Enregistrer » : le contact apparaît sous forme de carte colorée.",
      "Retrouve quelqu'un en tapant dans le champ « Rechercher un contact, une fonction… ».",
      "Sur une carte, clique l'icône enveloppe ou téléphone pour le joindre, « Modifier » pour corriger, ou l'icône corbeille pour supprimer."
    ],
    "sync": "Répertoire autonome, distinct des fiches salariés et résidents : ces contacts ponctuels se consultent uniquement ici, sur cette page, et l'accès est réservé aux utilisateurs disposant du droit à l'annuaire.",
    "ex": "Enregistrer Karim Benali, psychologue intervenant sur rendez-vous, puis le joindre d'un clic sur l'icône téléphone de sa carte."
  },
  "contrats.html": {
    "role": "Centraliser les contrats de travail des salariés et suivre leurs échéances (fin de CDD, période d'essai, avenants, document signé).",
    "mode": [
      "Filtrer la liste avec les menus « Tous les employés », « Tous les types » et « Tous statuts » ; les cartes affichent le type, la barre de période et le statut « Actif »/« Terminé ».",
      "Cliquer « Nouveau contrat » pour ouvrir la fiche de saisie.",
      "Choisir l'« Employé », le « Type de contrat » et le « Poste », puis renseigner « Date de début », « Date de fin », le temps de travail et les « Heures / semaine ».",
      "Indiquer la « Fin de période d'essai », joindre le contrat signé (PDF ou image) et ajouter au besoin un « + Avenant ».",
      "Valider avec « 💾 Enregistrer » ; rouvrir une carte via « 📑 Détail » pour consulter, « ✎ Modifier » ou « Supprimer »."
    ],
    "sync": "Chaque contrat est rattaché à un salarié via un menu alimenté par les fiches du personnel, et la liste des postes reprend les fonctions définies dans l'administration ; les échéances proches (CDD ≤ 30 jours, essai ≤ 15 jours) remontent en compteurs et en alertes en haut de la page.",
    "ex": "Créer un CDD de six mois pour un aide-soignant, y noter la fin de période d'essai et joindre le contrat signé : une alerte préviendra 30 jours avant l'échéance."
  },
  "absences.html": {
    "role": "Côté RH, cette page permet de déclarer et de suivre les arrêts maladie et accidents du travail des salariés, avec justificatif, rappel du délai de déclaration à la CPAM et suivi de la visite médicale de reprise.",
    "mode": [
      "Cliquer « Déclarer une absence », puis choisir l'« Employé » et le « Type » (arrêt maladie, accident du travail, maladie professionnelle…).",
      "Renseigner la « Date début » et, si elle est connue, la « Date fin » ; cocher « Prolongation d'un arrêt précédent » le cas échéant.",
      "Pour un accident du travail, cocher « Accident déclaré à la CPAM » (obligation sous 48 h) ; joindre le « Justificatif (arrêt de travail…) » puis cliquer « 💾 Enregistrer ».",
      "Sur la carte de l'absence, cliquer « Justifier » une fois la pièce reçue, et renseigner la « Visite médicale de reprise » puis cocher « Effectuée » au retour du salarié.",
      "Modifier ou supprimer une déclaration avec les boutons « ✎ » et « ✕ » de la carte."
    ],
    "sync": "Chaque absence est rattachée à un salarié de la liste du personnel et son justificatif est rangé dans le dossier de ce salarié ; les arrêts en cours, les accidents à déclarer à la CPAM et les visites de reprise à faire sont récapitulés en compteurs et en alertes en haut de la page.",
    "ex": "Par exemple, déclarer l'accident du travail d'un éducateur survenu le 15 juillet, cocher sa déclaration à la CPAM et joindre le certificat médical initial."
  },
  "conges.html": {
    "role": "Centraliser, côté RH, la saisie et la validation des demandes d'absence des salariés (congés payés, RTT, arrêts maladie, enfant malade, formation).",
    "mode": [
      "Cliquer « Nouvelle demande » pour ouvrir le formulaire.",
      "Choisir l'« Employé » et le « Type » (Congés payés, RTT, Arrêt maladie…), remplir « Date début » et « Date fin », ajouter un motif, puis « Envoyer la demande ».",
      "Dans la carte « Demandes en attente de validation », cliquer « ✅ Accepter » ou « ❌ Refuser » (un motif de refus est alors demandé).",
      "Filtrer la liste avec les menus déroulants « Tous » (statut) et « Tous les employés ».",
      "Suivre en haut de page les compteurs « En attente », « Acceptés » et « Refusés »."
    ],
    "sync": "Chaque demande est rattachée à un salarié pris dans la liste des employés ; la même demande est consultable côté salarié dans son propre espace, où il peut l'annuler tant qu'elle reste en attente.",
    "ex": "Marie pose 5 jours de congés payés du 10 au 14 août ; l'encadrant la voit apparaître dans « Demandes en attente de validation » et clique « ✅ Accepter »."
  },
  "pointage.html": {
    "role": "Suivre le temps de travail réel des salariés, semaine par semaine, en saisissant leurs heures d'arrivée et de départ et en les comparant aux créneaux prévus.",
    "mode": [
      "Choisir la semaine à traiter avec les flèches ‹ / › ou le bouton « Cette semaine ».",
      "Repérer un salarié via le champ « Rechercher un employé… » ou le menu « Tous les métiers ».",
      "Sur la case d'un jour, cliquer le badge « 📋 » pour recopier le créneau prévu, ou renseigner les champs « Arrivée » et « Départ ».",
      "Vérifier le total d'heures calculé puis cliquer « Valider » pour confirmer la journée.",
      "Contrôler les colonnes « Total », « Prévu » et « Écart » en bout de ligne, et surveiller les cases rouges signalant un créneau non pointé."
    ],
    "sync": "Les créneaux « prévus » proviennent du planning équipe, les heures de contrat et les jours d'absence sont repris de la fiche de chaque salarié, et la colonne « Écart » compare simplement le réel au prévu.",
    "ex": "Lundi, Claire était planifiée de 9h à 17h : l'encadrant clique le badge « 📋 9:00–17:00 » pour recopier le créneau, ajuste le départ à 17h30, puis clique « Valider »."
  },
  "astreintes.html": {
    "role": "Le module planifie et affiche, semaine par semaine, qui est de garde chaque jour selon le type d'astreinte (médecin, infirmier, cadre, technique, direction) avec son numéro à joindre.",
    "mode": [
      "Se placer sur la bonne semaine avec les flèches « ‹ » et « › », ou revenir à la semaine en cours via « Auj. ».",
      "Cliquer sur « Nouvelle astreinte » en haut, ou sur le « + » d'une case de la grille, pour ouvrir le formulaire.",
      "Choisir le « Type d'astreinte » et la « Date », puis désigner la personne via « Personnel de la liste » (ou saisir « Nom et prénom »), et compléter « Numéro de téléphone » et « Note / consigne ».",
      "Valider avec « Enregistrer » : l'astreinte apparaît dans la grille et, si elle est datée du jour, dans l'encart « Astreintes aujourd'hui ».",
      "Pour corriger, cliquer sur une astreinte déjà posée dans la grille, puis « Enregistrer » ou « Supprimer »."
    ],
    "sync": "La liste déroulante « Personnel de la liste » reprend les membres du personnel enregistrés (fiches employés) pour pré-remplir le nom ; sinon le module est autonome et son accès est réservé aux administrateurs.",
    "ex": "Désigner l'infirmière de nuit comme « Infirmier(e) d'astreinte » pour le samedi, avec son portable et la consigne « appeler avant 22h »."
  },
  "entretiens.html": {
    "role": "Préparer et conserver la trace des entretiens professionnels des salariés (annuel, professionnel, de suivi) et positionner chaque salarié de façon qualitative sur le référentiel de compétences de son métier, sans aucune note ni classement.",
    "mode": [
      "Cliquer « Nouvel entretien », puis choisir « Employé », « Date », « Type » et « Statut » et, si besoin, saisir l'« Évaluateur ».",
      "Pour un « Entretien annuel », dans « Positionnement — référentiel métier », poser sur chaque compétence une pastille « Acquis », « En cours d'acquisition », « À développer » ou « Non abordé ».",
      "Compléter le « Compte rendu » : « Bilan », « Objectifs fixés » et « Besoins en formation ».",
      "Cliquer « Enregistrer l'entretien », puis basculer le statut sur « Réalisé » une fois l'entretien tenu.",
      "Utiliser « Export PDF » pour éditer un support propre à relire et partager avec le salarié."
    ],
    "sync": "Le module reprend la liste des salariés (leur poste sert à charger automatiquement le référentiel du métier) et les entretiens marqués « Réalisé » se reflètent sur le tableau de bord du salarié concerné.",
    "ex": "Pour l'entretien annuel d'un éducateur spécialisé, on positionne « Instaurer et maintenir une relation éducative de qualité » sur « Acquis » et on inscrit dans « Besoins en formation » une formation sur la gestion des situations de crise."
  },
  "formations.html": {
    "role": "Recenser et suivre le plan de formation collectif de l'équipe : actions planifiées, réalisées ou annulées, avec leur coût et leurs participants.",
    "mode": [
      "Clique « Nouvelle formation » pour ouvrir la fiche.",
      "Renseigne l'« Intitulé », le « Domaine », la « Date de début » et le « Coût ».",
      "Sous « Participants », coche les employés concernés.",
      "Clique « 💾 Enregistrer ».",
      "Sur la carte, bascule le statut « Planifiée » / « Réalisée » / « Annulée », ou trie via les listes « Toutes les années », « Tous les domaines » et « Tous les statuts »."
    ],
    "sync": "La liste des participants reprend les employés actifs (chacun peut aussi s'inscrire lui-même via « S'inscrire ») ; les compteurs du haut — Planifiées, Réalisées, Participations, Budget engagé — se recalculent selon les filtres.",
    "ex": "Planifier un PSC1 le 12 septembre chez la Croix-Rouge, cocher 6 éducateurs, puis passer la formation en « Réalisée » une fois faite."
  },
  "paie.html": {
    "role": "Côté RH, déposer et consulter les bulletins de salaire des employés, avec pré-remplissage du brut, des primes et estimation du net.",
    "mode": [
      "Cliquer sur « Ajouter une fiche de paie ».",
      "Choisir le salarié dans « Employé » et le mois dans « Période » : le brut et les primes se pré-remplissent, un encadré affiche les heures validées et la récupération.",
      "Joindre le document via « Bulletin de paie (PDF ou image) » ; si c'est un PDF, le brut et le net sont lus automatiquement (à vérifier).",
      "Ajuster si besoin les champs « Salaire brut », « Primes », « Heures sup payées », « Retenues ».",
      "Cliquer sur « 💾 Enregistrer » ; le bouton « ⚙️ Taux majoration » sert au préalable à saisir les valeurs CCN 66."
    ],
    "sync": "Le pré-remplissage s'appuie sur la fiche de l'employé (salaire de base, heures contractuelles) et sur les pointages validés du mois ; le bulletin déposé est rangé dans le dossier du salarié pour qu'il puisse le consulter, chaque salarié ne voyant que ses propres fiches.",
    "ex": "Pour la paie de juillet, la RH sélectionne « Camille Durand », choisit le mois, joint le PDF du bulletin dont le brut est lu automatiquement, vérifie le net estimé puis enregistre."
  },
  "recrutement.html": {
    "role": "Suivre les candidatures à un poste sous forme de tableau, de la réception du dossier jusqu'à l'embauche et la création du compte du nouveau salarié.",
    "mode": [
      "Cliquer sur « Nouveau candidat », renseigner « Prénom », « Nom » et « Poste visé » (téléphone, email, dates et notes d'entretien facultatifs), puis « 💾 Enregistrer ».",
      "Retrouver la carte du candidat dans la colonne « Reçu » du tableau ; les compteurs du haut (reçues, entretiens planifiés, acceptés, refusés) se mettent à jour.",
      "Faire avancer la carte avec le bouton vert « → Entretien planifié / Entretien réalisé / Accepté », ou la sortir avec « ✕ Refuser ».",
      "Cliquer « ✎ » sur une carte pour corriger la fiche, ou « Supprimer » dans la fenêtre du candidat.",
      "Une fois le candidat en colonne « Accepté », cliquer « 🔑 Créer son compte utilisateur », choisir le rôle, puis « 🔑 Créer le compte » : le mot de passe temporaire s'affiche, à noter avant de fermer."
    ],
    "sync": "Quand on crée le compte d'un candidat accepté, le module génère automatiquement sa fiche salarié reliée à son identifiant de connexion ; la liste des postes proposés reprend les fonctions définies dans l'Administration.",
    "ex": "Une encadrante reçoit trois candidatures pour un poste d'aide-soignant : elle les ajoute en « Reçu », planifie les entretiens, refuse deux profils, fait passer la personne retenue en « Accepté » et crée directement son compte de connexion."
  },
  "viatrajectoire.html": {
    "role": "Suivre les demandes d'orientation adressées à la MDPH pour les résidents et l'avancement des décisions.",
    "mode": [
      "Cliquer « Nouvelle demande » pour ouvrir le formulaire.",
      "Choisir le « Résident », le « Type de demande » (orientation, renouvellement, réorientation) et la « MDPH ».",
      "Renseigner la « Date d'envoi » et le « Statut » (de « Brouillon » à « Accepté » ou « Refusé »), puis ajouter un « Commentaire / observations ».",
      "Valider avec « Créer la demande ».",
      "Plus tard, rouvrir une demande avec ✎ pour mettre à jour son statut, ou la retirer avec ✕."
    ],
    "sync": "Chaque demande est rattachée à un résident choisi dans la liste des résidents, et les compteurs « En cours », « Acceptées » et « Refusées » en haut de page se recalculent selon le statut ; l'accès est réservé aux comptes administrateurs.",
    "ex": "Créer une demande de renouvellement d'orientation pour un résident, la marquer « Envoyé à la MDPH », puis la passer à « Accepté » dès réception de la décision."
  },
  "rapport.html": {
    "role": "Il produit automatiquement un rapport d'activité de l'établissement pour la période choisie (taux d'occupation, mouvements, journal, transmissions, incidents, avenants, satisfaction, SERAFIN-PH, ressources humaines et contributions de l'équipe), ouvert dans un nouvel onglet et prêt à imprimer ou enregistrer en PDF.",
    "mode": [
      "Choisissez la « Période » (Mensuel ou Annuel), puis renseignez le « Mois » ou l'« Année ».",
      "Cliquez sur « 🔄 Actualiser l'aperçu » pour visualiser le rendu complet à l'écran.",
      "Complétez le récit de l'année dans « ✍️ Contributions de l'équipe » : choisissez une « Catégorie », le mois concerné, saisissez la « Description » puis « ➕ Ajouter ma contribution ».",
      "Cliquez sur « 📄 Générer le rapport PDF » pour ouvrir le document imprimable dans un nouvel onglet."
    ],
    "sync": "Il ne fait que reprendre les données déjà saisies dans les autres rubriques (présences, journal de bord, transmissions, incidents, avenants, satisfaction, évaluations SERAFIN-PH, personnel) ainsi que les contributions écrites par l'équipe, et propose le même rendu que la carte « Rapport d'activité » de la page des statistiques.",
    "ex": "En fin de mois, générer le rapport de juin pour le présenter au conseil de la vie sociale ou l'annexer au rapport annuel remis aux financeurs."
  }
};
