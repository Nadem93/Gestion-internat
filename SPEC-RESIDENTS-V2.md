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

## ⚠️ Périmètre — DESIGN + FONCTIONNALITÉS (une par une)

Décision finale du 2026-07-20 : on intègre la maquette **et** ses nouveautés,
en les traitant **une par une** pour valider au fur et à mesure.

La page a été migrée en « design seul » lors d'une parenthèse : la coque V2 est
en place et la logique V1 intacte. **Il reste donc à ajouter les fonctionnalités**
ci-dessous, une par une.

Reste à faire sur Résidents, dans cet ordre suggéré :
1. Cartes au format maquette (avatar, âge · chambre, badge statut, référent, objectifs, tags).
2. Chips de filtre avec compteurs (Tous / Permanent / Temporaire / Stage / Urgence) + tri Nom A→Z.
3. Rail de détail 372 px : identité, faits en 2 colonnes.
4. Bloc « Objectifs individualisés » (libellé + %).
5. Bloc « Suivi médical ».
6. Bloc « Dernière transmission » (texte + auteur).

`renderResidents()` et la logique existante (recherche, `?q=`, filtres, modales, droits)
restent la base : on enrichit, on ne remplace pas.
