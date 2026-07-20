# Fiche résident — migration V2

Maquette de référence : `Fiche résident - refonte (bento).dc.html`
(dossier `Gestion-Internat design V2/Gestion internat designs V2/`).

Règle en vigueur : **design + toutes les nouvelles fonctionnalités, une par une.**

## Structure de la maquette

- **Barre du haut** : retour « ‹ Résidents », eyebrow `INTERNALIS · Dossier usager`,
  titre `Fiche résident`, actions Imprimer + Modifier, avatar du compte connecté.
- **Bandeau hero** (dégradé teinté par la couleur du résident) : avatar 74 px,
  nom 24 px, badge de statut, méta `{âge} ans · né le {dob} · dossier {n°}`,
  puis 4 faits à droite — Chambre, Unité, Entrée, Référent.
- **Onglets** : Vue d'ensemble · Projet personnalisé · Médical · Historique.
  Ils filtrent les blocs de la colonne principale (`show.projet`, `show.medical`,
  `show.timeline`) ; « Vue d'ensemble » affiche tout.
- **Corps** en grille `1fr 360px` :
  - Colonne principale : *Projet personnalisé* (objectifs 2 colonnes, %, note,
    moyenne atteinte, date de révision, référent), *Suivi médical* (traitements
    pastillés + pathologies/risques + régime), *Transmissions récentes* (timeline).
  - Rail droit : *État civil & coordonnées*, *Contacts* (cliquables `tel:`),
    *Dossier administratif* (% complet + barre + liste datée), *Prochains rendez-vous*.

## Avancement

1. ✅ **Coquille V2 + bandeau d'identité** — `css/v2.css` (`.v2-back`, `.v2-hero-res`,
   `.v2-hero-av`, `.v2-facts`, `.v2-fact`), `js/resident-v2.js` (`residentHeroV2`),
   barre du haut V2 dans `resident.html`. L'unité vient de la table `chambres`
   (jointure sur le nom de la chambre) : `sbGetChambres()` est chargé au démarrage.
2. ⬜ Onglets Vue d'ensemble / Projet personnalisé / Médical / Historique.
3. ⬜ Corps en `1fr 360px` + rail droit.
4. ⬜ Rail : *État civil & coordonnées*.
5. ⬜ Rail : *Contacts* (liens `tel:`).
6. ⬜ Rail : *Dossier administratif* avec % de complétude.
7. ⬜ Rail : *Prochains rendez-vous*.
8. ⬜ *Projet personnalisé* au format bento (objectifs + % + note).
9. ⬜ *Suivi médical* au format bento.
10. ⬜ *Transmissions récentes* en timeline.

## Décisions prises

- Les colonnes « Informations personnelles » et « Informations séjour » de l'ancien
  en-tête ont été **supprimées** : le bandeau hero porte désormais les mêmes données
  (naissance, entrée, chambre, référent). La carte « Suivi & Activités » (4 tuiles)
  et le bandeau de vigilance/budget sont **conservés** — absents de la maquette mais
  sans équivalent ailleurs.
- Le menu ⋮ de l'ancien hero est supprimé : « Synthèse IA » est dans la barre du haut,
  « Exporter les données » reste accessible depuis la carte RGPD.
- La règle CSS `#btnDownload, #btnIaSynthese, #btnEdit { display:none }` (qui masquait
  les boutons dupliqués par l'ancien hero) a été retirée.
- Avatar : texte blanc, comme les cartes de `residents.html`. La maquette utilise du
  bleu nuit, mais la couleur du résident est libre — le blanc reste lisible partout.
