# Mesures techniques et organisationnelles de sécurité

**Article 32 du RGPD** — sécurité du traitement.
Document destiné à être **communiqué aux responsables de traitement** (annexe du contrat de sous-traitance) et à servir de base au dossier HDS.

| | |
|---|---|
| **Éditeur / sous-traitant** | *[Nom]* — INTERNALIS |
| **Version** | 1.0 — *[date]* |
| **Portée** | Application INTERNALIS et son hébergement |

> **Convention de lecture**
> ✅ **En place** — vérifié dans le code
> ⏳ **À mettre en place** — écart identifié, plan d'action associé
> 🔗 Référence au fichier source

---

## 1. Contrôle d'accès

### 1.1 Authentification ✅

- Authentification par **e-mail + mot de passe** individuel et nominatif (aucun compte générique).
- **Politique de mot de passe** appliquée à la création et au changement : **8 caractères minimum, au moins une majuscule, un chiffre et un caractère spécial**. 🔗 `index.html`
- **Changement de mot de passe imposé à la première connexion** (indicateur `mustChangePassword`). 🔗 `js/app.js`
- Alerte « Verrouillage majuscules activé » pour réduire les échecs de saisie.
- Création de comptes réalisée par une **fonction serveur dédiée** (`create-user`) : appelant obligatoirement administrateur, établissement imposé par le profil de l'appelant, et **liste blanche de rôles** (`educateur`, `rh`, `moderator`, `admin`, `famille`) — le rôle `superadmin` ne peut pas être attribué par ce canal.

> **Correction (août 2026).** Cette liste blanche était annoncée ici alors qu'elle n'existait pas : `create-user` reprenait le rôle tel quel du corps de la requête (`role: role || 'educateur'`), si bien qu'un administrateur pouvait se créer un compte `superadmin` — la seule frontière qui lui restait au-dessus. Liste blanche ajoutée ; **la fonction doit être redéployée** pour que le correctif prenne effet.

### 1.2 Gestion des habilitations ✅

- **Rôles** : éducateur, RH, administrateur, super-administrateur.
- **Permissions fines par fonction métier** (~32 permissions : accès résidents, santé, médicaments, RH, paie, administration…), administrables dans l'interface **Administration → Permissions**.
- **Contrôle d'accès aux modules** côté application (`requireModule`) : une page non autorisée affiche un refus d'accès.
- **Actions sensibles réservées** : la suppression/modification des échéances est réservée à la direction ; la suppression des relevés d'observation clinique est réservée aux administrateurs.
- **Principe du moindre privilège** : les rôles par défaut sont restreints (ex. le rôle *Stagiaire* n'a accès ni au dossier médical, ni aux médicaments, ni à la RH).

### 1.3 Cloisonnement des données ✅ — mesure structurante

- **Row Level Security (RLS) activée au niveau de la base de données**, sur le motif :
  `etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())`
- Conséquence : **un utilisateur ne peut techniquement pas lire les données d'un autre établissement**, même en contournant l'interface. Le cloisonnement est appliqué par le serveur, pas par le client.
- Vérifié par audit : lectures anonymes → 0 ligne ; écritures anonymes → refus (`42501`).

### 1.4 Verrouillage automatique ✅

- **Fermeture automatique de la session après 15 minutes d'inactivité**, avec message explicite à la reconnexion. 🔗 `js/app.js` (`IDLE_LIMIT_MS`)
- Mesure adaptée aux **postes partagés** (bureaux communs, salle de veille).
- Déconnexion manuelle accessible depuis toutes les pages (menu utilisateur).

---

## 2. Traçabilité ✅

- **Journal d'audit centralisé** en base (`audit_log`), alimenté par **97 points de traçage** répartis dans l'application. 🔗 `js/app.js` (`auditLog`), `js/audit-supabase.js`
- Chaque entrée enregistre : **date, utilisateur, rôle, action, détail, et le cas échéant l'identifiant du résident concerné**.
- Sont tracés notamment : **la consultation d'un dossier résident** (`acces_dossier`), les créations/modifications/suppressions, les exports et les anonymisations.

⏳ **Écart — connexions et déconnexions.** Contrairement à ce qu'affirmait une version antérieure de ce document, elles ne passent **pas** par `audit_log` : `logConnexion()` (🔗 `js/app.js`) écrit uniquement la clé `ftr_login_history` dans le `localStorage` du poste, plafonnée à 500 entrées. C'est le même défaut que celui corrigé pour le journal d'audit, resté ouvert à l'identique : l'historique de connexion est donc **local à chaque navigateur**, perdu au vidage du cache, et invisible pour l'administration. À basculer sur `audit_log`.
- **Consultation du journal** réservée à l'administration.

✅ **Source unique en base** — toute écriture et **toute lecture** passent par `public.audit_log`. 🔗 `js/audit-supabase.js`

> **Correction d'une affirmation erronée (août 2026).** Une version antérieure de ce document déclarait la copie `localStorage` supprimée. Elle ne l'était pas : `js/app.js` continuait d'écrire la clé `ftr_audit_log` sur chaque poste, plafonnée à 1000 entrées et sans aucune expiration — et, plus grave, les écrans *Administration* et *fiche salarié* lisaient **cette copie locale et non la table**. L'administrateur ne voyait donc que l'activité de son propre navigateur, et l'export CSV du registre était établi sur cette même base partielle. Corrigé : écriture localStorage retirée, clé existante effacée au chargement sur les postes qui en avaient une, écrans rebranchés sur la table, export paginé (PostgREST tronque à 1000 lignes en silence).

⏳ **Écart restant — lecture du journal.** La RLS de `audit_log` restreint à l'établissement : un salarié connecté peut donc, **via l'API**, lire l'activité de ses collègues, c'est-à-dire quels dossiers de résidents ils ont consultés. L'application le bloque désormais (la section *Journal d'activité* de la fiche salarié est réservée aux RH et à la personne concernée), **mais une garde côté client n'est pas une mesure de sécurité**. La politique RLS à poser est rédigée et commentée dans `migration-audit-retention.sql` (§4) ; elle n'est pas appliquée telle quelle car elle supprimerait l'historique affiché sur la fiche résident pour les non-administrateurs — arbitrage à rendre.

✅ **Durée de conservation : 6 mois** — décidée par le responsable de traitement (août 2026) et **appliquée techniquement** :
- purge quotidienne planifiée en base (`pg_cron`, fonction `public.purger_audit_log()`) — 🔗 `migration-audit-retention.sql` ;
- durée modifiable et purge déclenchable dans *Administration → Données → Dossiers arrivés à échéance*, qui affiche en permanence le volume arrivé à échéance ;
- la purge est **elle-même tracée** dans le journal, avec le nombre d'entrées supprimées.

---

## 3. Protection contre les attaques applicatives ✅

- **Échappement systématique** des données affichées (`escHtml` / `escAttr`), y compris en contexte d'attribut (guillemets simples et doubles échappés) — protection contre le XSS stocké.
- **Assainissement des URL** (`sanitizeUrl`) pour toute source d'image ou lien issu des données (neutralise `javascript:`).
- **Aucune donnée utilisateur interpolée dans un gestionnaire d'événement inline** sans échappement (revue effectuée en août 2026).
- **Requêtes paramétrées** via le client de base de données : pas de concaténation SQL côté application.
- Revue de sécurité complète du code réalisée (audit multi-dimensions), écarts corrigés.

✅ **En-têtes de sécurité HTTP en place** — fichier `_headers` (Netlify) : `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control`.

⏳ **Écart restant**
- La **CSP est encore en `Content-Security-Policy-Report-Only`** : elle rapporte les violations sans les bloquer. À passer en mode bloquant après relecture des rapports remontés depuis la mise en ligne.

---

## 4. Chiffrement

| | État |
|---|---|
| **En transit** | ✅ **HTTPS/TLS** de bout en bout (application et API). |
| **Au repos** | ⏳ **À confirmer contractuellement avec l'hébergeur HDS** (chiffrement des volumes et des sauvegardes). |
| **Documents déposés** | ✅ Stockage dans un **bucket privé** (non public), accès contrôlé. |

---

## 5. Stockage des pièces jointes ✅

- Bucket privé `justificatifs`.
- **Règle de nommage imposée** : le premier dossier du chemin est l'**identifiant de l'utilisateur qui dépose** (`auth.uid()`), ce qui permet à la politique de sécurité du stockage de contrôler les dépôts.
- Conformité de cette règle vérifiée et corrigée sur l'ensemble des points de dépôt (échéances, fiches de paie, documentation, absences, contrats).

---

## 6. Disponibilité et continuité

- ✅ **Fonctionnement hors-ligne dégradé** : service worker + file d'attente des écritures (`js/offline-outbox.js`) — les saisies faites sans réseau ne sont pas perdues.
- ✅ **Export de sauvegarde** disponible depuis l'administration.
- ⏳ **Sauvegardes** : fréquence, rétention, **et test de restauration** à contractualiser avec l'hébergeur HDS et à documenter.
- ⏳ **PCA/PRA** : objectifs de reprise (RTO/RPO) à définir avec l'hébergeur.

---

## 7. Minimisation et droits des personnes

- ✅ **Fonction d'anonymisation** d'un résident intégrée à l'application (tracée dans le journal d'audit).
- ✅ **Gestion de la visibilité** des écrits professionnels : chaque entrée du journal est marquée *équipe*, *confidentiel* ou *privé*.
- ✅ **Portail famille en lecture seule**, limité aux documents explicitement partagés.
- ✅ **Export des données d'un résident** possible depuis sa fiche.
- ✅ **Purge à l'issue des durées de conservation** — *Administration → Données → Dossiers arrivés à échéance*.
  Durées paramétrables (dossier résident après la sortie, dossier salarié après le départ), stockées en base.
  L'écran liste les dossiers échus avec le volume rattaché ; **la suppression n'est jamais automatique** :
  elle demande une validation dossier par dossier et est tracée dans le journal d'audit.
  Une purge silencieuse de données de santé détruirait des dossiers encore utiles sans que personne ne le voie —
  le RGPD exige que la purge ait lieu, pas qu'elle soit aveugle.
- ✅ **Contrôle d'orphelins après purge** — la suppression s'appuie sur les cascades déclarées en base.
  Si une cascade manque, la ligne principale disparaît mais les données rattachées restent : une purge
  ratée qui a l'air réussie. Après chaque suppression, les lignes référençant encore l'identifiant sont
  recomptées et l'écart est signalé, table par table.
- ⚠️ **Date de départ salarié non stockée** : la table `employes` n'a pas de champ de sortie. La fin du
  dernier contrat sert de référence ; un salarié inactif sans contrat daté est signalé comme non évaluable.

---

## 8. Mesures organisationnelles

⏳ **À formaliser** (documents courts, mais attendus par les acheteurs) :

- Politique de gestion des accès du personnel de l'éditeur (qui peut accéder à la production, comment, avec quelle traçabilité).
- **Engagement de confidentialité** signé (art. 28.3.b RGPD) — y compris pour un entrepreneur individuel.
- Procédure de gestion des violations de données → `04-violation-donnees.md`.
- Politique de mise à jour et de correction des vulnérabilités.
- Sensibilisation des utilisateurs (le **guide de formation** intégré à l'application y contribue).

---

## 9. Synthèse des écarts et plan d'action

| # | Écart | Priorité | Document |
|---|---|---|---|
| 1 | Hébergement non certifié HDS (Supabase) | 🔴 **Bloquant** | `06-plan-migration-hds.md` |
| ~~2~~ | ~~En-têtes de sécurité HTTP absents~~ — fichier `_headers` en place, y compris dans le dossier déployé (voir §3). CSP encore en `Report-Only`. | ✅ Traité | `_headers` |
| ~~3~~ | ~~Aucune politique de rétention/purge appliquée~~ — journal d'audit purgé à 6 mois (août 2026) ; dossiers résident/salarié traités par l'écran de purge | ✅ Traité | `migration-audit-retention.sql` |
| ~~4~~ | ~~Copie du journal d'audit en `localStorage`~~ — écriture retirée et clé effacée sur les postes (août 2026) | ✅ Traité | tâche technique |
| ~~5~~ | ~~Export de réversibilité partiel~~ — inventaire porté à **110 tables sur 110**, contrôlable depuis Administration → « Contrôler l'inventaire » (août 2026) | ✅ Traité | `05-reversibilite.md` |
| 6 | Chiffrement au repos à confirmer | 🟠 Haute | contrat hébergeur |
| 7 | Test de restauration non documenté | 🟡 Moyenne | contrat hébergeur |
| 8 | Engagement de confidentialité non formalisé | 🟡 Moyenne | organisationnel |

---

## 10. Journal des révisions

| Version | Date | Modification |
|---|---|---|
| 1.0 | *[date]* | Création — état des mesures vérifié dans le code |
