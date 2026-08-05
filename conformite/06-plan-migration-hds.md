# Plan de migration vers un hébergement certifié HDS

**Le point bloquant n° 1 avant toute commercialisation.**

> Version 1.0 — *[date]*
> ⚠️ Ce document engage des choix techniques et contractuels : faire valider par
> l'hébergeur retenu **et** par un avocat spécialisé.

---

## 1. Pourquoi c'est obligatoire

L'article **L.1111-8 du Code de la santé publique** impose l'hébergement chez un hébergeur **certifié HDS** pour les données de santé recueillies à l'occasion d'activités de prévention, de diagnostic, de soins **« ou de suivi social et médico-social »**.

➡️ Le médico-social est **explicitement visé**. INTERNALIS traite des traitements médicamenteux, des observations cliniques, des plans de soins, des EIG : **l'obligation s'applique**.

**Situation actuelle : l'hébergement repose sur Supabase, qui n'est pas certifié HDS.** C'est le seul écart véritablement bloquant.

---

## 2. La question centrale : qui est « hébergeur » ?

Le référentiel HDS découpe l'hébergement en **6 activités**. Deux blocs à distinguer :

| Bloc | Contenu | Qui le porte ? |
|---|---|---|
| **Infrastructure** | Mise à disposition de locaux, matériel, infrastructure virtuelle | L'**hébergeur** (certifié) |
| **Infogérance** | **Administration et exploitation** du système d'information contenant les données de santé, sauvegarde | ⚠️ **Potentiellement vous** |

**C'est LE piège.** Beaucoup d'éditeurs pensent être couverts parce qu'ils louent une machine chez un hébergeur certifié — alors que **c'est eux qui administrent le système**, ce qui relève d'une activité d'hébergement soumise à certification.

### ➡️ Question à poser par écrit à chaque hébergeur consulté

> « Nous éditons et exploitons un SaaS médico-social contenant des données de santé.
> **Votre certification HDS couvre-t-elle l'activité d'infogérance de notre application**,
> ou devons-nous être nous-mêmes certifiés pour cette part ?
> Merci de préciser les **numéros d'activités** couverts par votre certificat. »

**Exigez la réponse par écrit** — elle détermine tout le montage.

---

## 3. Les 3 montages

| | **A · Hébergeur infogéreur** ⭐ | **B · IaaS HDS + certification propre** | **C · Partenariat** |
|---|---|---|---|
| **Principe** | Le prestataire porte la certification, y compris l'infogérance | Vous louez l'infra et vous vous faites certifier | Vous passez sous la certification d'un éditeur partenaire |
| **Coût** | Surcoût d'hébergement (souvent ×2 à ×5) | **Plusieurs dizaines de k€** + audits annuels | Partage de revenus |
| **Délai** | Quelques semaines | **6 à 18 mois** | Négociation |
| **Autonomie** | Bonne | Totale | Réduite |
| **Recommandé pour vous** | ✅ **Oui, pour démarrer** | Plus tard, avec du volume | Si un partenaire se présente |

**Recommandation : montage A.** Vous obtenez l'attestation HDS de l'hébergeur, vous la présentez aux acheteurs, et vous gardez votre énergie sur le produit.

---

## 4. Hébergeurs certifiés HDS à consulter (France)

**OVHcloud** · **Scaleway** · **Clever Cloud** · **Outscale (Dassault)** · **NumSpot** · **Cloud Temple** · **Claranet**
Grands clouds également certifiés sur certaines régions : **Azure**, **AWS**, **GCP** — mais les acheteurs publics/associatifs du secteur ajoutent souvent des exigences de souveraineté.

> **Vérifier systématiquement la liste officielle publiée par l'ANS** (esante.gouv.fr) : validité du certificat **et activités couvertes**.
> Le référentiel HDS a évolué récemment (exigences renforcées de localisation et d'immunité aux droits extra-européens) : **confirmer la version en vigueur** avant de contractualiser.

---

## 5. Ce qui dépend de Supabase aujourd'hui — inventaire technique

Mesuré sur le code :

| Brique | Volume | Portabilité |
|---|---|---|
| **Base PostgreSQL + RLS** | 110 tables, RLS par `etablissement_id` | 🟢 **Facile** — PostgreSQL standard, la RLS est une fonctionnalité native |
| **Adaptateurs de données** | **60 fichiers** `js/*-supabase.js` | 🟠 Moyen — isolés, mais nombreux |
| **Authentification** | 5 appels : `signInWithPassword`, `signOut`, `getUser`, `getSession`, `updateUser` | 🟠 Moyen — à remplacer (Keycloak, Authentik, ou auth maison) |
| **Stockage de fichiers** | Bucket `justificatifs`, 3 modules | 🟠 Moyen — remplaçable par S3 compatible |
| **Edge functions** | **6** (relevé sur le projet déployé) : `create-user`, `reset-password`, `find-famille-account`, `get-shared-document-url`, `signature-sceau`, **`ia-assistant`** | 🟠 Moyen — à réécrire en petites fonctions serveur. ⚠️ `ia-assistant` **sort les données de l'établissement** vers un service d'IA tiers : ce n'est pas une brique à porter, c'est une décision à rendre (§ ci-dessous). Déployée, mais inactive tant que le secret `ANTHROPIC_API_KEY` n'est pas posé. |
| **Realtime** | **Aucun usage** | 🟢 Rien à faire |

**Bonne nouvelle** : l'architecture est **déjà bien isolée**. Toute la couche données passe par des adaptateurs dédiés — la migration touche ces 60 fichiers, pas les 90+ pages de l'application.

**Point d'attention** : la RLS s'appuie sur `auth.uid()`, une fonction propre à Supabase. Il faudra la remplacer par l'équivalent du nouveau mécanisme d'authentification (variable de session PostgreSQL).

---

## 6. Deux scénarios techniques

### Scénario 1 — Supabase auto-hébergé sur infra HDS ⭐ *(le moins de réécriture)*

Supabase est open source et peut être auto-hébergé.

- ✅ On conserve : PostgREST, la RLS avec `auth.uid()`, GoTrue (auth), le stockage → **très peu de code à modifier**
- ⚠️ Mais **c'est vous qui administrez** → la question de l'infogérance se pose pleinement
- ➡️ **À combiner avec un hébergeur infogéreur** qui prend en charge l'exploitation

### Scénario 2 — PostgreSQL managé HDS + couche applicative réécrite

- ✅ L'hébergeur porte davantage la responsabilité d'exploitation
- ⚠️ Il faut remplacer PostgREST (API), GoTrue (auth), le stockage et les edge functions
- ⚠️ Chantier nettement plus lourd

**Recommandation : partir du scénario 1**, en exigeant de l'hébergeur une **couverture d'infogérance**.

---

## 7. Étapes de migration

| # | Étape | Sortie attendue |
|---|---|---|
| 1 | Consulter 3 hébergeurs HDS avec la question du §2 | Réponses **écrites** sur les activités couvertes |
| 2 | Choisir le montage et l'hébergeur | Devis + certificat HDS |
| 3 | Monter un environnement de recette | Instance HDS fonctionnelle |
| 4 | Migrer le schéma + les politiques RLS | Base identique, RLS vérifiée |
| 5 | Adapter l'authentification et `auth.uid()` | Connexion opérationnelle |
| 6 | Migrer le stockage (bucket `justificatifs`) | Fichiers accessibles, règle `auth.uid()` préservée |
| 7 | Réécrire les 4 fonctions serveur | Création de compte, réinitialisation, portail famille |
| 8 | **Tests de non-régression** : cloisonnement RLS, permissions, traçabilité | Rapport de tests |
| 9 | Migration des données + bascule | Production sur HDS |
| 10 | Récupérer et archiver le **certificat HDS** | Pièce du dossier commercial |

---

## 8. Ce qu'il faut obtenir contractuellement de l'hébergeur

À exiger et à annexer au dossier de conformité :

- [ ] **Certificat HDS** en cours de validité + **activités couvertes**
- [ ] **Localisation** des données et des sauvegardes (France / UE)
- [ ] **Chiffrement au repos** (volumes et sauvegardes)
- [ ] **Politique de sauvegarde** : fréquence, rétention, **et test de restauration**
- [ ] **Engagements de disponibilité** (SLA), RTO / RPO
- [ ] **Procédure de notification d'incident** (délai contractuel)
- [ ] **Réversibilité** : format et délai de restitution
- [ ] **Contrat de sous-traitance RGPD** (l'hébergeur est votre sous-traitant ultérieur)
- [ ] **Immunité aux droits extra-européens** (point sensible pour les acheteurs publics)

---

## 9. Décisions à prendre

| Décision | Options | Statut |
|---|---|---|
| Montage | A (infogéreur) / B (certification propre) / C (partenariat) | ⏳ |
| Hébergeur | *[à consulter]* | ⏳ |
| Scénario technique | Supabase auto-hébergé / PostgreSQL + réécriture | ⏳ |
| Assistant IA : maintien ? | Désactiver / anonymisation obligatoire / prestataire HDS | ⏳ |
| DPO | Externe mutualisé / non désigné | ⏳ |

---

## 10. Journal des révisions

| Version | Date | Modification |
|---|---|---|
| 1.0 | *[date]* | Création — inventaire des dépendances mesuré sur le code |
