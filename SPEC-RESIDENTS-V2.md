# Résidents V2 — structure lue dans « Residents - refonte (bento).dc.html »

Relevé AVANT tout code, pour éviter l'improvisation qui a fait rater l'accueil.

## Ossature
- **Top bar** : sur-titre `INTERNALIS · Annuaire`, titre **Résidents**, avatar utilisateur.
- **Toolbar** : chips de filtre avec compteur + `Trier : Nom A→Z`.
- **Corps** : `grid-template-columns: 1fr 372px` → grille de cartes à gauche, **rail de détail** à droite.

## Filtres (filterDefs, ordre et couleurs de la maquette)
| id | label | pastille |
|---|---|---|
| all | Tous | `#818cf8` |
| permanent | Permanent | `#10b981` |
| temporaire | Temporaire | `#f59e0b` |
| stage | Stage | `#6366f1` |
| urgence | Urgence | `#ef4444` |

## Grille de cartes — `repeat(3, 1fr)`
En-tête : « {N} résidents affichés ». Chaque carte :
- avatar initiales, **nom**
- `{âge} ans · Ch. {chambre}`
- badge **statut** (couleur du filtre correspondant)
- initiales du référent + `Réf. {nom}`
- `Objectifs {x}`
- tags

## Rail de détail (372 px)
- avatar initiales, nom, statut, âge
- bloc de faits en `1fr 1fr` (paires clé / valeur)
- **Objectifs individualisés** : libellé + pourcentage
- **Suivi médical** : liste
- **Dernière transmission** : texte + auteur

## Points d'attention (appris sur les pages précédentes)
1. Rendu en JS ⇒ **rappeler le filtrage par rôle après le rendu** (`admin-only` / `rh-only` / `superadmin-only`), les écouteurs `DOMContentLoaded` ayant déjà tourné.
2. Ne pas forcer de `max-width` inline : laisser `.v2-shell` à 1400 px.
3. Neutraliser le conteneur clair hérité de la page s'il en existe un.
4. Vérifier les noms de champs réels (`prenom`, `nom`, `chambre`, `statut`, `referent`, `coReferent`, `dob`, `objectifs`) avant de coder.

---

## ⚠️ Périmètre révisé — DESIGN SEUL

Décision du 2026-07-20 : on ré-habille la page **sans ajouter de fonctionnalité**.

Concrètement pour Résidents :
- On garde `renderResidents()` et toute la logique existante (recherche, `?q=`, filtres, modales, droits).
- On applique la coque V2 + `css/v2.css`, et on restructure le markup des cartes selon la maquette.
- **On n'implémente pas** le rail de détail ni les blocs « Objectifs individualisés », « Suivi médical »,
  « Dernière transmission » s'ils n'existent pas déjà — ils viendront dans une passe ultérieure.
- Les chips de filtre ne sont reprises que si un filtre équivalent existe déjà côté V1.
