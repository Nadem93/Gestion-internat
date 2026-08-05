# Réversibilité et suppression des données

**Article 28.3.g du RGPD** — sort des données en fin de contrat.
Exigence **systématiquement examinée** par les acheteurs du secteur médico-social.

> Version 1.0 — *[date]*

---

## 1. Principe

À la fin du contrat, **au choix du Client** :

- **Restitution** de l'intégralité des données dans un format structuré, couramment utilisé et lisible par machine ;
- **puis suppression** définitive de toutes les copies détenues par le Prestataire et ses sous-traitants ultérieurs, **attestée par écrit**.

Le Client reste maître de ses données à tout moment : la réversibilité n'est pas une faveur commerciale, c'est une obligation.

---

## 2. Engagements de service

| Engagement | Valeur proposée |
|---|---|
| **Export à la demande, en autonomie** | Disponible **à tout moment** depuis l'application |
| **Délai de restitution complète sur demande** | *[15]* jours ouvrés |
| **Période de réversibilité après fin de contrat** | *[90]* jours — les données restent accessibles en lecture |
| **Suppression définitive** | Dans les *[30]* jours suivant la fin de la période de réversibilité |
| **Attestation de suppression** | Fournie par écrit, incluant les sauvegardes |
| **Purge des sauvegardes** | Au plus tard *[à aligner sur le cycle de rétention de l'hébergeur]* |
| **Coût** | **Inclus** dans l'abonnement (aucun frais de sortie) |

---

## 3. Format de restitution

| Contenu | Format |
|---|---|
| Données structurées | **JSON** (une collection par entité) + **CSV** pour les tables principales |
| Documents et pièces jointes | Fichiers d'origine, dans une arborescence par résident / par salarié |
| Dictionnaire des données | Document décrivant chaque entité et chaque champ |
| Journal d'audit | Export dédié (traçabilité des accès) |

**Livraison** : archive chiffrée, remise par canal sécurisé, mot de passe transmis séparément.

---

## 4. État actuel — ✅ écart corrigé

L'application dispose de trois mécanismes :

- ✅ **Export de sauvegarde global** depuis l'administration (pratique au quotidien, mais partiel).
- ✅ **Export des données d'un résident** depuis sa fiche (tracé dans le journal d'audit).
- ✅ **Export de réversibilité intégral** — *Administration → Données → Restitution intégrale des données*.

### 4.1 Ce qui a changé

L'export de sauvegarde passait par les fonctions `sbGet*`, qui ne couvraient que **43 tables sur 92** :
observations cliniques, mesures de protection, stock de médicaments, soldes de congés, journal d'audit…
en étaient absents. En l'état, une demande de réversibilité **n'aurait pas été honorée intégralement**.

L'export de réversibilité ne fonctionne pas ainsi : il est **piloté par un inventaire de tables**
(`REV_TABLES` dans `js/reversibilite.js`) et interroge chaque table directement. Rien ne peut donc être
oublié par omission d'un adaptateur.

| | Nombre |
|---|---|
| Tables de l'application | **110** |
| Tables couvertes par l'inventaire | **110** |
| **Tables absentes de l'export** | **0** |

*Contrôle effectué sur les sources. Un premier comptage n'avait relevé que 92 tables : il ne
balayait que les appels `.from('nom')` écrits en toutes lettres, et manquait les 17 tables
atteintes par une aide générique `.from(table)` recevant le nom en argument — astreintes,
contacts externes, coûts d'absence, périodes de paie, suivi de rapport, registre RGPD.
Ces 17 tables ont été ajoutées à l'inventaire.*

### 4.2 Garde-fou contre la dérive

Le risque résiduel est qu'une **table ajoutée plus tard** au produit ne soit pas déclarée dans
l'inventaire. Le bouton **« Contrôler l'inventaire »** du même écran compare l'inventaire aux tables
réellement interrogées par l'application et signale tout écart. À exécuter à chaque livraison.

### 4.3 Formats et périmètre

| | |
|---|---|
| **JSON** | Format de référence. Un manifeste (établissement, date, auteur, décompte par table) + les données. |
| **CSV** | Un fichier unique lisible par Excel, une section par table. Pour relecture humaine. |
| **Pièces jointes** | Le coffre `justificatifs` **n'est pas inclus** — remise séparée (voir §5). |
| **Cloisonnement** | La RLS restreint la lecture à l'établissement de l'utilisateur : un export ne peut pas contenir les données d'un autre client. |
| **Traçabilité** | Chaque export est écrit dans le journal d'audit (`export`, volume restitué). |

---

## 5. Suppression — portée

La suppression doit couvrir :

1. La **base de production** (toutes les tables du Client)
2. Le **stockage de fichiers** (bucket `justificatifs` — documents résidents, justificatifs, fiches de paie)
3. Les **sauvegardes** (selon le cycle de rétention de l'hébergeur — à documenter au contrat)
4. Les **environnements de support** éventuels (aucune copie de production hors production : à garantir)
5. Les **exports intermédiaires** produits pendant la relation

**Exception** : les données que le Prestataire doit conserver au titre d'une obligation légale (facturation) sont conservées séparément, avec la seule finalité comptable.

---

## 6. Modèle d'attestation de suppression

```
ATTESTATION DE SUPPRESSION DE DONNÉES

Je soussigné(e) [Nom, qualité], représentant [Prestataire], atteste que
l'ensemble des données à caractère personnel traitées pour le compte de
[Client] dans le cadre du contrat [référence] a été supprimé de manière
définitive et irréversible :

  - Base de données de production ............ le [date]
  - Stockage de fichiers ..................... le [date]
  - Sauvegardes .............................. le [date]
  - Exports et copies de travail ............. le [date]

Ces opérations ont été réalisées conformément à l'article 28.3.g du RGPD.
Aucune copie n'est conservée, à l'exception des données strictement
nécessaires au respect des obligations légales de facturation.

Fait à [lieu], le [date]                    [Signature]
```

---

## 7. Procédure, étape par étape

| # | Étape | Responsable | Délai |
|---|---|---|---|
| 1 | Demande écrite du Client | Client | — |
| 2 | Accusé de réception + planification | Prestataire | 5 j |
| 3 | Génération de l'export complet | Prestataire | 15 j |
| 4 | Remise sécurisée + dictionnaire des données | Prestataire | — |
| 5 | **Validation par le Client** (contrôle d'exhaustivité) | Client | 30 j |
| 6 | Suppression production + stockage | Prestataire | 30 j après validation |
| 7 | Purge des sauvegardes | Hébergeur | selon cycle |
| 8 | **Attestation de suppression** | Prestataire | à l'issue |

⚠️ **La suppression n'intervient qu'après validation explicite de l'export par le Client** — jamais avant.

---

## 8. Journal des révisions

| Version | Date | Modification |
|---|---|---|
| 1.0 | *[date]* | Création — couverture d'export mesurée sur le code (43/93) |
