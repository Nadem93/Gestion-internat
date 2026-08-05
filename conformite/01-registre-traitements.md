# Registre des activités de traitement — **sous-traitant**

**Article 30.2 du RGPD** — registre tenu par le sous-traitant.

| | |
|---|---|
| **Sous-traitant** | *[Nom / raison sociale]* — INTERNALIS |
| **SIRET** | *[à compléter]* |
| **Adresse** | *[à compléter]* |
| **Contact données personnelles** | *[e-mail dédié, ex. rgpd@…]* |
| **DPO** | *[désigné / non désigné — voir §7]* |
| **Représentant UE** | Sans objet (établi en France) |
| **Version** | 1.0 — *[date]* |

> ⚠️ **Document à compléter et à faire valider par un juriste** avant diffusion à un client.
> Les mentions *[entre crochets]* sont à renseigner.

---

## 1. Objet et rôle

INTERNALIS est une application web de **suivi individualisé des personnes accompagnées** en établissement social et médico-social (foyer, MAS, FAM, IME, etc.).

- **Responsable de traitement** : l'**établissement client** (association gestionnaire, collectivité…). C'est lui qui détermine les finalités et les moyens.
- **Sous-traitant** : *[votre structure]*, éditeur et exploitant de l'application, qui traite les données **uniquement sur instruction documentée** du responsable de traitement.

**Base légale côté responsable de traitement** (rappel, à confirmer par le client) : mission d'intérêt public / obligation légale d'accompagnement médico-social ; pour les données de santé, levée de l'interdiction de l'art. 9.2 RGPD (notamment 9.2.h — médecine préventive, prise en charge sociale et médico-sociale).

---

## 2. Catégories de personnes concernées

| Catégorie | Volume indicatif | Vulnérabilité |
|---|---|---|
| **Personnes accompagnées (résidents)** | ~50 par établissement | **Élevée** — personnes en situation de handicap / dépendance |
| **Représentants légaux, familles, proches** | variable | Moyenne |
| **Salariés de l'établissement** | ~40 par établissement | Standard |
| **Candidats au recrutement** | variable | Standard |
| **Intervenants et contacts extérieurs** | variable | Standard |
| **Membres du CVS** | variable | Standard |

---

## 3. Catégories de données traitées

### 3.1 Personnes accompagnées — ⚠️ contient des données sensibles

| Catégorie | Exemples de champs réels | Sensible ? |
|---|---|---|
| **Identité** | `nom`, `prenom`, `dob`, `genre`, `photo` | Non |
| **Identifiants réglementés** | **`nss`** (NIR / n° de sécurité sociale), **`ins`** (Identité Nationale de Santé) | **Oui — encadrement spécifique** |
| **Vie à l'établissement** | `chambre`, `entree`, `dateSortie`, `statut`, `referent`, `coReferent` | Non |
| **Santé** | `allergies`, `sante` (traitements, groupe sanguin), `medecin`, `medecinTel`, `dmp`, `dmpDate` | **Oui (art. 9)** |
| **Santé — suivi quotidien** | `journal_entries`, `observations_cliniques`, `plan_soins`, `plan_soins_coches`, `med_distrib`, `stock_medicaments`, `alertes_prises`, `nuits`, `sommeil_nuit`, `protocoles_urgence`, `incidents` (EIG) | **Oui (art. 9)** |
| **Accompagnement / projet** | `ppe`, `taches_ppa`, `objectifs`, `objectifsSuivi`, `evaluations`, `serafinph` (nomenclature besoins), `fiches_liaison` | **Oui — révèle le handicap** |
| **Protection juridique** | `protection`, `protectionNom`, `protectionTel`, `tuteur`, `mesures_protection` (tribunal, jugement, mandataire) | **Oui — données judiciaires** |
| **Régime alimentaire** | `regime` | **Potentiellement** (peut révéler santé ou convictions religieuses) |
| **Situation sociale / financière** | `ressources`, `situationAdmin`, `situationPro`, `budget`, `dossier`, `organisme` | Sensible au sens large |
| **Scolarité / activité** | `ecole`, `classe`, `activites`, `activite_presences` | Non |
| **Vie privée et liens** | `contacts`, `famille_residents`, `visites`, `droitsVisite`, `sorties`, `trousseau` | Non |
| **Consentement** | `consent`, `consentDate` | Non |
| **Documents** | `documents_resident`, `justificatifs` (bucket) — pièces pouvant contenir tout ce qui précède | **Oui** |

### 3.2 Salariés

`employes` (identité, `email`, `telephone`, `poste`, `dateEmbauche`, `salaireBase`, `heuresContrat`, `photo`), `contrats`, `fiches_paie`, `pointages`, `conges`, `absences_at` (**arrêts de travail = données de santé**), `entretiens`, `formations`, `attestations_salaire`, `paie_soldes_tout_compte`, `documents_employe`.

### 3.3 Comptes et traçabilité

`profiles` (comptes), `audit_log` (traçabilité des accès et actions), `conversations` / `messages` (messagerie interne), `signatures`.

### 3.4 Fonctionnement de l'établissement

`etablissements`, `chambres`, `planning_events`, `planning_equipe`, `repas_jour`, `transmissions`, `consignes`, `cvs`, `satisfaction`, `inventaire`, `interventions`, `budget_*`, `finance_recettes`, `factures`, etc.

> **Total : 110 tables.** Chiffre relevé sur l'inventaire de réversibilité (`REV_TABLES`, 🔗 `js/reversibilite.js`), contrôlable depuis *Administration → Données → « Contrôler l'inventaire »*. Un décompte antérieur annonçait 96 : il ne balayait que les appels `.from('nom')` écrits en toutes lettres.

---

## 4. Finalités du traitement (côté responsable de traitement)

1. Suivi individualisé et projet personnalisé des personnes accompagnées
2. Continuité et sécurité de l'accompagnement (transmissions, journal, plan de soins)
3. **Sécurité médicamenteuse** et traçabilité de la distribution
4. Gestion des événements indésirables (EIG) et obligations de signalement
5. Conformité réglementaire (échéances, protection juridique, démarche qualité, Ségur)
6. Vie sociale de l'établissement (CVS, activités, visites, satisfaction)
7. Gestion administrative et RH de l'établissement
8. Pilotage et rapport d'activité (données agrégées)

**Le sous-traitant ne poursuit aucune finalité propre** : pas de réutilisation, pas de revente, pas d'entraînement de modèle sur les données clients, pas de profilage commercial.

---

## 5. Destinataires

| Destinataire | Périmètre |
|---|---|
| Personnels habilités de l'établissement | Selon leur **rôle et permissions** (voir `02-mesures-securite.md`) |
| Représentants légaux / familles | **Portail famille** — accès en lecture seule aux documents partagés |
| Sous-traitant (support technique) | Accès d'exploitation strictement encadré et tracé |
| **Sous-traitants ultérieurs** | Voir §6 |

**Aucun transfert hors UE** n'est prévu. *(À confirmer après le choix de l'hébergeur — voir `06-plan-migration-hds.md`.)*

---

## 6. Sous-traitants ultérieurs

| Prestataire | Rôle | Localisation | HDS | Statut |
|---|---|---|---|---|
| *[Hébergeur à choisir]* | Hébergement, base de données, stockage de fichiers | France / UE | **Certifié HDS requis** | ⏳ **à contracter** |
| *[E-mail transactionnel, si utilisé]* | Notifications | UE | n/a | à documenter |
| *[Service IA, si activé]* | Assistant IA (synthèses) | à déterminer | **à écarter ou encadrer** | ⚠️ voir note |

> ⚠️ **Situation actuelle (à corriger avant commercialisation)** : l'hébergement repose sur **Supabase**, qui **n'est pas certifié HDS**. La migration est un prérequis — voir `06-plan-migration-hds.md`.

> ⚠️ **Assistant IA** : si des données de santé sont envoyées à un service tiers, celui-ci devient sous-traitant ultérieur et doit être contractualisé, localisé UE et compatible HDS. Une option d'**anonymisation** existe déjà dans l'application (`js/ia-assistant.js`) : à rendre **obligatoire** ou à désactiver par défaut.

---

## 7. Désignation d'un DPO

La désignation d'un délégué à la protection des données est obligatoire lorsque les activités de base consistent en un **traitement à grande échelle de données sensibles** (art. 37.1.c RGPD).

**Analyse** : en tant qu'éditeur hébergeant les données de santé de plusieurs établissements, le seuil de « grande échelle » est susceptible d'être atteint dès quelques clients.
**Recommandation** : **désigner un DPO externe mutualisé** — coût modéré, et argument commercial fort auprès des acheteurs.

---

## 8. Durées de conservation

⚠️ **À définir avec chaque responsable de traitement** — c'est lui qui fixe les durées. Ordres de grandeur usuels du secteur (à faire confirmer) :

| Donnée | Durée indicative |
|---|---|
| Dossier de la personne accompagnée | Durée de l'accompagnement + archivage légal |
| Traçabilité médicamenteuse | Selon la réglementation applicable |
| Journal / transmissions | Durée de l'accompagnement |
| Dossier salarié | 5 ans après le départ (variable selon la pièce) |
| Bulletins de paie | 5 ans (employeur) |
| **Journal d'audit** | **6 mois** — décidé (août 2026), appliqué techniquement |
| Candidatures non retenues | 2 ans max |

> **État technique actuel**
> - ✅ **Journal d'audit — 6 mois, purge automatique en place.** Tâche `pg_cron` quotidienne appelant `public.purger_audit_log()`, durée lue dans `app_config` établissement par établissement (🔗 `migration-audit-retention.sql`). Durée modifiable et purge déclenchable dans *Administration → Données*.
> - ✅ **Dossiers résident et salarié** — écran *Administration → Données → Dossiers arrivés à échéance* : liste les dossiers ayant dépassé leur durée, avec le volume rattaché. Suppression **sur validation manuelle**, volontairement : effacer sans regarder un dossier de personne accompagnée n'est pas acceptable.
> - ⏳ **Les autres durées du tableau ci-dessus restent à confirmer** avec chaque responsable de traitement, puis à appliquer.

---

## 9. Mesures de sécurité

Voir le document dédié : **`02-mesures-securite.md`** (art. 32 RGPD).

---

## 10. Journal des révisions

| Version | Date | Modification |
|---|---|---|
| 1.0 | *[date]* | Création — inventaire fondé sur le code réel (96 tables recensées à l'époque, 110 après contrôle exhaustif en août 2026) |
