# Dossier de conformité INTERNALIS — RGPD & HDS

Dossier constitué en vue de la **commercialisation** d'INTERNALIS auprès d'établissements sociaux et médico-sociaux.

> ⚠️ **Documents de travail.** Ils sont fondés sur l'analyse du code réel de l'application,
> mais **doivent être complétés** (mentions *[entre crochets]*) et **validés par un avocat
> spécialisé en données de santé** avant toute diffusion à un client ou signature.

---

## Les documents

| # | Document | Objet | Article |
|---|---|---|---|
| 01 | [Registre des traitements](01-registre-traitements.md) | Inventaire des données traitées (110 tables), catégories, finalités, destinataires | RGPD 30.2 |
| 02 | [Mesures de sécurité](02-mesures-securite.md) | Ce qui est en place dans le code, et les écarts | RGPD 32 |
| 03 | [Contrat de sous-traitance (DPA)](03-contrat-sous-traitance.md) | Modèle à annexer au contrat d'abonnement | RGPD 28.3 |
| 04 | [Procédure de violation](04-violation-donnees.md) | Que faire en cas d'incident, modèle de notification | RGPD 33.2 |
| 05 | [Réversibilité](05-reversibilite.md) | Export et suppression en fin de contrat | RGPD 28.3.g |
| 06 | [Plan de migration HDS](06-plan-migration-hds.md) | **Le point bloquant** : sortir de Supabase | CSP L.1111-8 |

---

## Où vous en êtes

### ✅ Points forts déjà en place

Ce ne sont pas des promesses : c'est vérifié dans le code.

- **Cloisonnement des données au niveau de la base** (RLS PostgreSQL par établissement) — un utilisateur ne peut pas techniquement lire les données d'un autre établissement
- **Permissions fines par métier** (~32 permissions) + contrôle d'accès aux modules
- **Journal d'audit centralisé** — ~91 points de traçage, dont la **consultation d'un dossier résident**
- **Verrouillage automatique** des sessions après 15 min
- **Politique de mot de passe** (8 car., majuscule, chiffre, spécial) + changement imposé à la 1ʳᵉ connexion
- **Échappement systématique** des données affichées + assainissement des URL (audit de sécurité réalisé)
- **Anonymisation** d'un résident, **visibilité** graduée des écrits, **portail famille en lecture seule**
- Règle de dépôt des fichiers conforme (`auth.uid()` en premier dossier)

### 🔴 Écarts à traiter

| # | Écart | Gravité | Qui agit |
|---|---|---|---|
| 1 | **Hébergement non certifié HDS** (Supabase) | 🔴 **Bloquant** | Vous — choix hébergeur |
| ~~2~~ | ~~Export de réversibilité incomplet~~ — l'export est piloté par un inventaire de tables, porté à **110 tables sur 110** (août 2026) | ✅ Traité | `05-reversibilite.md` |
| ~~3~~ | ~~Aucune politique de rétention/purge~~ — journal d'audit purgé à **6 mois** (décidé août 2026, `pg_cron`) ; dossiers résident/salarié via l'écran de purge. Autres durées à confirmer par le client. | ✅ Traité | — |
| ~~4~~ | ~~En-têtes de sécurité HTTP absents~~ — `_headers` en place ; CSP encore en `Report-Only` | ✅ Traité | — |
| ~~5~~ | ~~Copie du journal d'audit en `localStorage`~~ — écriture retirée, clé effacée sur les postes, écrans rebranchés sur `public.audit_log` (août 2026) | ✅ Traité | — |
| 6 | Chiffrement au repos / test de restauration | 🟠 Haute | Contrat hébergeur |
| 7 | Engagement de confidentialité non formalisé | 🟡 Moyenne | Organisationnel |
| 8 | Assistant IA : sous-traitant à encadrer ou désactiver | 🟠 Haute | Décision |

---

## Prochaines actions, dans l'ordre

1. **Consulter 3 hébergeurs HDS** en posant la question de l'infogérance (voir `06`, §2) — c'est le chemin critique, à lancer en premier
2. **Faire valider le montage** par un avocat spécialisé
3. **Corriger les écarts techniques** 2 à 5
4. **Compléter les mentions** *[entre crochets]* des documents
5. **Désigner un DPO externe** (recommandé)
6. **Souscrire une RC Pro** couvrant l'activité numérique et les données de santé
7. **Créer le statut** auto-entrepreneur (rapide, peut se faire en parallèle)

---

## Interlocuteurs

| Organisme | Pour quoi |
|---|---|
| **ANS** — esante.gouv.fr | Référentiel HDS, liste officielle des hébergeurs certifiés |
| **CNIL** — cnil.fr | Guides RGPD, référentiels du secteur médico-social |
| Avocat en droit des données de santé | Question de l'infogérance, validation du DPA |
| DPO externe mutualisé | Désignation, registre, conseil |

---

*Dossier généré le [date] — version 1.0*
