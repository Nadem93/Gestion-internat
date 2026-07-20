# Fiche résident — migration V2

Maquette : `Fiche résident - refonte (bento).dc.html`
(dossier `Gestion-Internat design V2/Gestion internat designs V2/`).

## Ce qui a été fait

Page reproduite intégralement : barre du haut, bandeau d'identité, onglets,
corps en `1fr 360px` avec les 3 blocs de la colonne principale et les 4 cartes
du rail droit. Les ~20 modules historiques sont répartis dans les onglets.

### Répartition des onglets

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | Projet personnalisé, Suivi médical, Transmissions (blocs maquette) + Suivi & Activités + Radar de vigilance |
| **Projet personnalisé** | Bloc maquette + Objectifs personnalisés + Grilles d'évaluation |
| **Médical** | Bloc maquette + carte Médical (infos/traitements/RDV/vaccins) + Plan de soins |
| **Vie quotidienne** | Planning individuel, Semaine type, Sorties & permissions, Activités éducatives, Trousseau, Budget personnel |
| **Historique** | Transmissions (bloc maquette) + Fil de vie + Évolution de l'autonomie |
| **Administratif** | Séjour, Situation administrative / Enfant, Fichiers joints, Notes, RGPD |

Le **rail droit est permanent**, quel que soit l'onglet.

## Données de la maquette absentes de la base

Vérifié champ par champ. Ces éléments de la maquette n'ont **aucune source réelle** ;
ils ne sont pas affichés plutôt que remplis avec du faux :

- **Lieu de naissance** et **nationalité** — aucune colonne sur `residents`.
- **Téléphone du résident** — seuls existent ceux des tiers (médecin, tuteur, protection).
- **INS « Qualifié »** — `r.ins` contient l'identifiant, pas son état de qualification.
- **Pathologies & risques** — aucun champ. Le bloc affiche à la place
  « Allergies & vigilances » (`r.allergies`, groupe sanguin, état du DMP).
- **Rôle de l'auteur d'une transmission** — la table ne stocke que le nom.
- **% de complétude du dossier** — il n'existe aucune notion de document
  obligatoire. La barre mesure donc la **validité des échéances**
  (« X% à jour »), pas la complétude.

## Adaptations assumées

- **Contacts** : `r.contacts` est un textarea libre, pas une liste. La liste est
  reconstruite depuis les champs structurés (référent, co-référent, médecin,
  tuteur, protection, droits de visite) ; le texte libre est affiché en dessous.
  Le téléphone du référent vient d'une jointure par nom sur `employes`.
- **Unité** : absente du résident, résolue depuis la table `chambres`.
- **% par objectif** : n'existe pas en base. Il est calculé comme la moyenne de
  la progression des axes de travail. Sans axe, le statut est affiché à la place
  du pourcentage (pas de chiffre inventé).
- **Impression** : les onglets ne découpent que l'affichage — `printResident()`
  reconstitue la fiche complète avant d'imprimer, puis restaure l'onglet courant.

## Pièges rencontrés

- Une règle CSS masquait `#btnDownload/#btnIaSynthese/#btnEdit` parce que l'ancien
  hero les dupliquait. Retirée en même temps que ce hero.
- Les en-têtes des cartes héritées sont teintés en inline vers `#fff`
  (`color-mix(..., #fff)`) : une règle de compatibilité les ramène sur fond sombre.
- `r.dmp` est un état (`actif` / `en_attente` / `non_ouvert`), **pas** un booléen.

## Reste à faire

- `serafinphCard()`, `renderStatCards()`, `renderDataCards()` et
  `residentTransmissionsCard()` sont définies mais **jamais appelées** (code mort
  antérieur à cette migration). À rebrancher ou à supprimer.
- Le catalogue des documents attendus à l'admission n'existe pas : le créer
  permettrait d'afficher un vrai « % complet » comme dans la maquette.
