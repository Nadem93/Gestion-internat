# Procédure de gestion des violations de données

**Article 33.2 du RGPD** — obligation du sous-traitant de notifier le responsable de traitement.

> **À écrire avant d'en avoir besoin.** Le jour d'un incident, on n'improvise pas.
> Version 1.0 — *[date]* — Responsable de la procédure : *[nom]*

---

## 1. Qu'est-ce qu'une violation ?

Toute violation de la sécurité entraînant, de manière accidentelle ou illicite :

| Type | Exemple concret dans INTERNALIS |
|---|---|
| **Perte de confidentialité** | Un compte compromis ; un utilisateur voit les données d'un autre établissement ; envoi d'un document au mauvais destinataire |
| **Perte d'intégrité** | Modification ou suppression non autorisée de dossiers, de traçabilité médicamenteuse |
| **Perte de disponibilité** | Perte de données sans sauvegarde exploitable ; indisponibilité prolongée ; rançongiciel |

⚠️ **Une violation n'est pas forcément une attaque** : une erreur de manipulation, un bug, ou la perte d'un ordinateur non verrouillé en sont aussi.

**Rappel : le Prestataire notifie TOUTE violation au Client — sans filtrer selon la gravité.**
C'est le **responsable de traitement** (le Client) qui décide de saisir la CNIL et d'informer les personnes.

---

## 2. Rôles

| Rôle | Qui | Mission |
|---|---|---|
| **Point de contact** | *[nom + téléphone + e-mail]* | Reçoit l'alerte, déclenche la procédure |
| **Responsable technique** | *[nom]* | Qualifie, contient, corrige |
| **DPO** | *[nom / DPO externe]* | Conseille, aide à la qualification |
| **Client (RT)** | Direction de l'établissement + son DPO | **Décide** de la notification CNIL et de l'information des personnes |

---

## 3. Déroulé — les 6 étapes

### ⏱️ Étape 1 — Détecter et consigner *(immédiat)*

Sources : alerte de l'hébergeur, signalement d'un client, anomalie dans le **journal d'audit**, alerte de supervision, signalement externe.

**Ouvrir immédiatement une fiche d'incident** (modèle §5) et **horodater** — l'heure de prise de connaissance déclenche les délais.

### ⏱️ Étape 2 — Contenir *(dans l'heure)*

Réflexes selon le cas :
- Compte compromis → **révoquer la session et réinitialiser le mot de passe**
- Faille applicative → **désactiver la fonction** concernée / déployer un correctif
- Suspicion d'exfiltration → **préserver les preuves** (ne pas écraser les journaux), extraire le journal d'audit
- Perte de données → **vérifier la dernière sauvegarde saine** avant toute restauration

⚠️ **Ne pas détruire de traces** : elles servent à la qualification et à la CNIL.

### ⏱️ Étape 3 — Qualifier *(dans les 12 h)*

| Question | À documenter |
|---|---|
| Nature de la violation ? | Confidentialité / intégrité / disponibilité |
| Quelles données ? | **Des données de santé ? des NIR/INS ? des mesures de protection ?** |
| Combien de personnes ? | Nombre approximatif de personnes concernées |
| Quels établissements ? | Un seul client, ou plusieurs ? |
| Conséquences probables ? | Pour des **personnes vulnérables**, le risque est présumé élevé |
| Origine ? | Erreur humaine, défaut technique, acte malveillant |

### ⏱️ Étape 4 — Notifier le Client *(au plus tard 24 h)* 🔴

**Obligation contractuelle du Prestataire.** Utiliser le modèle du §5, par **e-mail au contact désigné + appel téléphonique** pour les cas graves.

Si toutes les informations ne sont pas disponibles : **notifier quand même dans le délai**, puis compléter par phases (art. 33.4).

> **Le Client dispose de 72 h** à compter de sa prise de connaissance pour notifier la CNIL. **Chaque heure de retard de votre part consomme son délai.**

### ⏱️ Étape 5 — Corriger

Correction de la cause racine, vérification de l'efficacité, contrôle qu'aucun autre client n'est affecté.

### ⏱️ Étape 6 — Capitaliser *(sous 30 jours)*

Analyse post-incident, mesures préventives, mise à jour de la présente procédure, **inscription au registre des violations** (§6).

---

## 4. Cas particulier : violation touchant plusieurs clients

Notifier **chaque** responsable de traitement concerné, **sans divulguer l'identité des autres clients**.

---

## 5. Modèle de notification au Client

```
Objet : [INTERNALIS] Notification de violation de données — [référence]

Madame, Monsieur,

Conformément à l'article 33.2 du RGPD et à l'article 3.7 de notre contrat de
sous-traitance, nous vous notifions la violation de données suivante.

1. IDENTIFICATION
   Référence ...................... [INC-AAAA-NN]
   Date et heure de l'incident .... [ou période estimée]
   Date et heure de découverte .... [horodatage]

2. NATURE DE LA VIOLATION
   [Confidentialité / Intégrité / Disponibilité]
   Description factuelle : [que s'est-il passé, sans spéculation]

3. DONNÉES CONCERNÉES
   Catégories ..................... [dont données de santé : oui/non]
   Personnes concernées ........... [catégories et nombre approximatif]
   Volume ......................... [nombre d'enregistrements]

4. CONSÉQUENCES PROBABLES
   [Analyse des risques pour les personnes concernées]

5. MESURES PRISES
   Confinement .................... [ce qui a été fait, quand]
   Correction ..................... [état d'avancement]
   Mesures préventives ............ [à venir]

6. CONTACT
   [Nom, fonction, téléphone, e-mail] — disponible immédiatement

Nous restons à votre disposition pour vous assister dans votre analyse et,
le cas échéant, dans votre notification à la CNIL (délai de 72 heures à
compter de votre prise de connaissance).

[Signature]
```

---

## 6. Registre interne des violations

**À tenir même si aucune notification à la CNIL n'a lieu** (art. 33.5).

| Réf. | Date incident | Date découverte | Nature | Données | Personnes | Clients notifiés | Date notif. | Mesures | Clôture |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

---

## 7. Contacts utiles

| Organisme | Usage |
|---|---|
| **CNIL** — cnil.fr | Notification par le responsable de traitement (72 h) |
| **cybermalveillance.gouv.fr** | Assistance en cas d'attaque |
| **ANSSI** | Incidents majeurs |
| *[Hébergeur HDS]* | Support sécurité 24/7 — *[à compléter au contrat]* |
| *[Assureur RC Pro]* | Déclaration de sinistre |

---

## 8. Journal des révisions

| Version | Date | Modification |
|---|---|---|
| 1.0 | *[date]* | Création |
