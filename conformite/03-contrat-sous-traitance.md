# Contrat de sous-traitance des données à caractère personnel (DPA)

**Annexe au contrat d'abonnement INTERNALIS**
Conclu en application de l'**article 28 du RGPD**.

> ⚠️ **MODÈLE — à faire valider par un avocat avant toute signature.**
> Ce document est une trame de travail complète, pas un contrat prêt à signer.
> Les mentions *[entre crochets]* sont à renseigner.

---

## Entre les parties

**Le Responsable de traitement**
*[Dénomination de l'établissement / association gestionnaire]*
*[Adresse — SIRET — représentant légal]*
Ci-après « **le Client** ».

**Le Sous-traitant**
*[Votre dénomination]* — éditeur de la solution INTERNALIS
*[Adresse — SIRET — représentant]*
Ci-après « **le Prestataire** ».

---

## Article 1 — Objet

Le présent contrat définit les conditions dans lesquelles le Prestataire traite, **pour le compte et sur instruction du Client**, des données à caractère personnel dans le cadre de la fourniture de la solution INTERNALIS (hébergement, exploitation, maintenance et support).

Le Client est **responsable de traitement**. Le Prestataire est **sous-traitant** au sens de l'article 4.8 du RGPD.

---

## Article 2 — Description du traitement *(art. 28.3)*

| Élément | Contenu |
|---|---|
| **Nature des opérations** | Collecte, enregistrement, organisation, structuration, conservation, consultation, utilisation, mise à disposition, effacement |
| **Finalité** | Suivi individualisé des personnes accompagnées, continuité de l'accompagnement, sécurité médicamenteuse, obligations réglementaires, gestion RH de l'établissement |
| **Durée** | Durée du contrat d'abonnement, augmentée de la période de réversibilité (art. 11) |
| **Catégories de données** | Voir **Annexe 1** — comprend des **données de santé** (art. 9) et des données relatives aux **mesures de protection juridique** |
| **Catégories de personnes** | Personnes accompagnées, représentants légaux et familles, salariés, candidats, intervenants extérieurs |

---

## Article 3 — Obligations du Prestataire

### 3.1 Instructions documentées *(art. 28.3.a)*
Le Prestataire traite les données **uniquement sur instruction documentée** du Client, y compris pour les transferts hors UE. Il informe immédiatement le Client si une instruction lui paraît constituer une violation du RGPD.

Le Prestataire **s'interdit** : toute finalité propre, toute réutilisation, toute cession ou revente, tout profilage commercial, et **tout entraînement de modèle d'intelligence artificielle** sur les données du Client.

### 3.2 Confidentialité *(art. 28.3.b)*
Toute personne autorisée à traiter les données est soumise à une **obligation de confidentialité écrite**. Le Prestataire est en outre tenu au **secret professionnel** applicable au secteur.

### 3.3 Sécurité *(art. 28.3.c → art. 32)*
Le Prestataire met en œuvre les mesures décrites en **Annexe 2** (document `02-mesures-securite.md`), notamment : cloisonnement des données par établissement au niveau de la base (RLS), gestion des habilitations, journalisation des accès, verrouillage automatique des sessions, chiffrement en transit, hébergement **certifié HDS**.

### 3.4 Sous-traitance ultérieure *(art. 28.2 et 28.4)*
Le Client donne une **autorisation générale** aux sous-traitants ultérieurs listés en **Annexe 3**.
Le Prestataire informe le Client de **tout ajout ou remplacement au moins 30 jours à l'avance**, le Client disposant d'un droit d'opposition motivé ; en cas d'opposition non résolue, le Client peut résilier sans pénalité.
Le Prestataire impose contractuellement à ses sous-traitants ultérieurs les mêmes obligations.

### 3.5 Assistance aux droits des personnes *(art. 28.3.e)*
Le Prestataire assiste le Client pour répondre aux demandes d'exercice des droits (accès, rectification, effacement, limitation, portabilité, opposition), au moyen des fonctions de l'application (consultation, export, anonymisation) et, si nécessaire, d'une intervention technique. **Délai de réponse au Client : *[5]* jours ouvrés.**

### 3.6 Assistance à la conformité *(art. 28.3.f)*
Le Prestataire assiste le Client pour la sécurité, la notification des violations, les analyses d'impact (AIPD) et la consultation préalable, compte tenu des informations à sa disposition.

### 3.7 Violation de données *(art. 33.2)*
Le Prestataire notifie au Client **toute violation de données dans les meilleurs délais et au plus tard *[24]* heures** après en avoir pris connaissance, selon la procédure du document `04-violation-donnees.md`.

### 3.8 Sort des données en fin de contrat *(art. 28.3.g)*
Au choix du Client : **restitution** intégrale dans un format structuré et lisible par machine, **puis suppression** de toutes les copies. Modalités : document `05-reversibilite.md`.

### 3.9 Documentation et audit *(art. 28.3.h)*
Le Prestataire met à disposition du Client toute information nécessaire pour démontrer sa conformité, notamment : registre des traitements du sous-traitant, mesures de sécurité, **certificat HDS de l'hébergeur**, liste des sous-traitants ultérieurs.
Le Client peut réaliser un **audit**, par lui-même ou par un tiers indépendant, *[une fois par an]*, avec un préavis de *[30]* jours, aux frais du Client, sans porter atteinte à la sécurité des autres clients.

### 3.10 Registre
Le Prestataire tient le registre des activités de traitement effectuées pour le compte du Client (art. 30.2).

---

## Article 4 — Obligations du Client

1. Fournir au Prestataire des **instructions licites et documentées**.
2. **Déterminer la base légale** de ses traitements et **informer les personnes concernées** (résidents, représentants légaux, salariés).
3. **Gérer les habilitations** de ses utilisateurs dans l'application et les revoir régulièrement.
4. Veiller au **respect des règles d'usage** (confidentialité des identifiants, verrouillage des postes).
5. **Définir les durées de conservation** applicables à ses données.
6. Réaliser, le cas échéant, l'**analyse d'impact (AIPD)** — recommandée compte tenu du traitement de données de santé de personnes vulnérables.

---

## Article 5 — Localisation et transferts

Les données sont hébergées et traitées **exclusivement au sein de l'Union européenne**, chez un hébergeur **certifié HDS** (art. L.1111-8 du Code de la santé publique).
**Aucun transfert hors UE** n'est effectué sans autorisation écrite préalable du Client et sans garanties appropriées (art. 44 et suivants).

---

## Article 6 — Hébergement de données de santé

Le Prestataire garantit que l'hébergement des données de santé à caractère personnel est assuré par un hébergeur **certifié HDS** pour les activités concernées.
Le **certificat en cours de validité** est communiqué au Client sur demande et joint en **Annexe 3**.

---

## Article 7 — Responsabilité, assurance, durée

- Chaque partie répond des dommages causés par son manquement, conformément à l'art. 82 du RGPD.
- Le Prestataire justifie d'une **assurance responsabilité civile professionnelle** couvrant l'activité numérique et le traitement de données de santé. *[Assureur / n° de police / montant]*
- Le présent contrat entre en vigueur à la signature et demeure applicable **pendant toute la durée de l'abonnement**, augmentée de la période de réversibilité.
- Droit applicable : **droit français**. Juridiction compétente : *[à compléter]*.

---

## Annexes

### Annexe 1 — Catégories de données et de personnes
→ Reprendre les §2 et §3 du document `01-registre-traitements.md`.

### Annexe 2 — Mesures techniques et organisationnelles
→ Document `02-mesures-securite.md`.

### Annexe 3 — Sous-traitants ultérieurs autorisés

| Prestataire | Rôle | Localisation | Certification |
|---|---|---|---|
| *[Hébergeur HDS]* | Hébergement, base de données, stockage | France | **HDS** — certificat n° *[…]*, valable jusqu'au *[…]* |
| *[Autres]* | *[…]* | UE | *[…]* |

---

## Signatures

| Le Client (responsable de traitement) | Le Prestataire (sous-traitant) |
|---|---|
| Nom : | Nom : |
| Qualité : | Qualité : |
| Date : | Date : |
| Signature : | Signature : |
