-- ════════════════════════════════════════════════════════════════════
--  SEED DE DÉMONSTRATION — contenu réaliste pour les résidents factices
--  Peuple TOUT le site : transmissions (2 couches), journal, cahier de
--  nuit, présences, repas, traitements/distributions, plan de soins,
--  incidents, avenants PPA complets (Sérafin + outcomes + cycle),
--  tâches « Ma tournée » + coches, objectifs/axes/progressions, profils
--  SERAFIN-PH, évaluations (MIF/Barthel/SERAFIN), échéances, admissions,
--  visites, activités, CVS, satisfaction, répertoire, agenda.
--
--  ⚠️ PRÉREQUIS — exécuter D'ABORD les migrations en attente :
--     1. le bloc consolidé (colonnes residents.regime/droits_visite,
--        RLS famille_residents, transmissions.soutien/soutien_niveau)
--     2. migration-taches-ppa.sql (tables taches_ppa + taches_coches)
--
--  Le script s'adapte AUTOMATIQUEMENT aux résidents présents (aucun id
--  en dur) — il ignore les résidents « sortis ». Marqueur 'seed-demo'
--  dans les colonnes auteur quand elles existent. Les colonnes jsonb
--  des résidents (objectifs, objectifs_suivi, serafinph, regime) sont
--  RÉÉCRITES : base de démonstration uniquement.
--  Exécution : Supabase → SQL Editor → Run (une seule fois).
-- ════════════════════════════════════════════════════════════════════

-- ═══ MODULE VIE QUOTIDIENNE — CONTENU DE DÉMONSTRATION ═══
-- Foyer médico-social (handicap adulte)
-- Tables : transmissions, journal_entries, nuits, presences, repas_jour.
-- À exécuter dans Supabase SQL Editor (rôle postgres, RLS bypassée).
-- Aucun id ni etablissement_id en dur : tout dérive de public.residents (résidents factices).
--
-- Idempotence :
--   • transmissions.author_id = 'seed-demo'      → purgées par le DELETE de section
--   • journal_entries.author_id = 'seed-demo'    → idem
--   • nuits.veilleur_id = 'seed-demo'            → idem (+ on conflict do nothing sur (etablissement_id, date))
--   • presences / repas_jour : pas de colonne auteur → purge de la fenêtre datée
--     (base de démonstration : tous les résidents sont factices) + on conflict do nothing.


-- ═══ MODULE TRANSMISSIONS (2 couches : content + soutien/soutien_niveau) ═══
-- ~12 transmissions par résident étalées sur 8 jours, shifts matin/aprem/nuit variés,
-- catégories variées, 1 à 2 urgentes par résident, la moitié avec la 2e couche « accompagnement ».
-- Marqueur de démo : author_id = 'seed-demo'.

delete from public.transmissions where author_id = 'seed-demo';

with actifs as (
  select r.id::text as rid,
         r.etablissement_id,
         trim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as resident_name,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
contenus as (
  select * from (values
    -- grp 'n' = quotidien (priority info/normal), grp 'u' = urgences (priority urgent)
    ('n',  1, 'sante',         'normal', $t$Rendez-vous avec le médecin traitant ce matin : tension et poids stables, renouvellement de l'ordonnance. Prochain contrôle dans trois mois.$t$),
    ('n',  2, 'medicament',    'info',   $t$Traitement du matin pris sans difficulté, en présence de l'équipe. Rien à signaler.$t$),
    ('n',  3, 'comportement',  'normal', $t$Journée sereine dans l'ensemble. Un moment de contrariété après le déjeuner, vite apaisé par un temps d'échange individuel.$t$),
    ('n',  4, 'alimentation',  'info',   $t$Bon appétit ce midi, a apprécié le menu et repris du plat. Hydratation correcte tout au long de la journée.$t$),
    ('n',  5, 'hygiene',       'normal', $t$Douche prise ce matin avec plaisir. A choisi ses vêtements et pris soin de son apparence avant l'atelier.$t$),
    ('n',  6, 'activite',      'info',   $t$A participé à l'atelier cuisine avec enthousiasme : préparation d'une salade de fruits partagée au goûter.$t$),
    ('n',  7, 'famille',       'normal', $t$Appel téléphonique de sa sœur en fin d'après-midi. Échange chaleureux, moment visiblement apprécié.$t$),
    ('n',  8, 'sortie',        'info',   $t$Sortie au marché avec le groupe ce matin. A fait quelques achats personnels et géré sa monnaie avec un accompagnement léger.$t$),
    ('n',  9, 'administratif', 'info',   $t$Dossier de renouvellement MDPH complété avec la personne, à transmettre au secrétariat pour envoi cette semaine.$t$),
    ('n', 10, 'sante',         'info',   $t$Rendez-vous podologue effectué : nouvelles semelles à porter au quotidien. Aucune douleur signalée.$t$),
    ('n', 11, 'comportement',  'normal', $t$A besoin d'être rassuré au moment du coucher en ce moment. Rituel mis en place avec l'équipe du soir : tisane et lecture.$t$),
    ('n', 12, 'activite',      'normal', $t$Séance de sport adapté cet après-midi : bonne participation, fierté exprimée d'avoir terminé le parcours.$t$),
    ('n', 13, 'famille',       'info',   $t$Visite des parents prévue samedi après-midi, confirmée par téléphone. La personne en parle avec joie.$t$),
    ('n', 14, 'alimentation',  'normal', $t$A goûté un légume nouveau ce soir et l'a apprécié. Poursuivre la découverte alimentaire en douceur.$t$),
    ('n', 15, 'hygiene',       'info',   $t$Rendez-vous coiffeur effectué cet après-midi. Très satisfait du résultat, le fait remarquer avec le sourire.$t$),
    ('n', 16, 'sortie',        'normal', $t$Retour de week-end en famille : séjour décrit comme agréable. Retour au foyer serein, affaires rangées avec l'équipe.$t$),
    ('n', 17, 'medicament',    'normal', $t$Passage de l'infirmière pour la préparation du pilulier de la semaine. Traitement inchangé, prochaine visite lundi.$t$),
    ('n', 18, 'administratif', 'normal', $t$Point budget hebdomadaire réalisé avec la personne : retrait pour les courses de la semaine noté dans le classeur.$t$),
    ('n', 19, 'sante',         'normal', $t$Légère toux ce matin, surveillée dans la journée. Pas de fièvre, à réévaluer demain matin.$t$),
    ('n', 20, 'activite',      'info',   $t$Temps libre au jardin en fin de journée : a arrosé les plantations de l'atelier jardinage, moment calme et apprécié.$t$),
    ('n', 21, 'comportement',  'info',   $t$Belle entraide observée ce midi : a spontanément aidé un autre résident à débarrasser. À valoriser.$t$),
    ('n', 22, 'famille',       'normal', $t$Courrier reçu de son frère, lu ensemble à sa demande. Souhaite préparer une réponse cette semaine avec l'équipe.$t$),
    ('n', 23, 'maintenance',   'info',   $t$Ampoule de la salle de bains signalée et remplacée dans la journée par les services techniques.$t$),
    ('n', 24, 'alimentation',  'info',   $t$Petit-déjeuner pris tardivement mais complet. Préférence renouvelée pour le pain complet, transmis à la cuisine.$t$),
    ('u',  1, 'urgent',        'urgent', $t$Chute dans le couloir en début d'après-midi, sans blessure apparente. Médecin traitant prévenu, surveillance rapprochée mise en place jusqu'à demain.$t$),
    ('u',  2, 'sante',         'urgent', $t$Fièvre à 38,9°C ce soir, accompagnée de frissons. Avis médical demandé, traitement donné selon protocole ; à surveiller cette nuit.$t$),
    ('u',  3, 'comportement',  'urgent', $t$Moment de crise important en fin de journée avec forte angoisse. Retour au calme après un accompagnement individuel ; équipe de nuit informée, rester attentif.$t$),
    ('u',  4, 'urgent',        'urgent', $t$Départ du foyer non signalé en fin d'après-midi, retour accompagné une heure plus tard. Personne calme et en sécurité ; situation à reprendre en réunion d'équipe.$t$)
  ) as c(grp, i, cat, priority, contenu)
),
params as (
  select
    array['Karim Benali', 'Sophie Lemaire', 'Léa Fontaine', 'Ibrahima Diallo', 'Claire Morel', 'Marc Aubert', 'Nadia Cherif', 'Julien Roche']::text[] as auteurs,
    array[
      $t$A tout réalisé en autonomie ; l'équipe est simplement restée disponible à proximité.$t$,
      $t$Présence discrète de l'équipe pendant toute la durée, sans nécessité d'intervenir.$t$,
      $t$Guidance verbale étape par étape, avec encouragements et reformulations.$t$,
      $t$Aide physique partielle au démarrage, a poursuivi et terminé de façon autonome.$t$,
      $t$Accompagnement complet du geste, en verbalisant chaque étape et en respectant le rythme de la personne.$t$,
      $t$Supervision bienveillante à distance ; valorisation des réussites en fin d'action.$t$
    ]::text[] as s_txt,
    array['autonomie', 'supervision', 'verbal', 'partiel', 'total', 'supervision']::text[] as s_niv,
    array[
      $t$Bien noté, je prends le relais sur ce point cet après-midi.$t$,
      $t$Merci pour la transmission, l'équipe du soir est informée.$t$,
      $t$Vu ensemble ce matin, la situation a bien évolué.$t$,
      $t$Je confirme, même observation de mon côté hier.$t$,
      $t$C'est noté, on en reparle à la réunion d'équipe.$t$
    ]::text[] as reponses
)
insert into public.transmissions
  (etablissement_id, date, shift, cat, priority, content,
   resident_id, resident_name, author_id, author_name,
   read_by, replies, soutien, soutien_niveau, created_at)
select
  a.etablissement_id,
  to_char(current_date - v.day_off, 'YYYY-MM-DD'),
  (array['matin', 'aprem', 'nuit'])[v.sidx],
  c.cat,
  c.priority,
  c.contenu,
  a.rid,
  a.resident_name,
  'seed-demo',
  p.auteurs[1 + mod(a.rn + k, 8)],
  '[]'::jsonb,
  case when k = 2 then jsonb_build_array(jsonb_build_object(
    'id',        'sdrep-' || a.rn::text || '-' || k::text,
    'author',    p.auteurs[1 + mod(a.rn + k + 3, 8)],
    'authorId',  'seed-demo',
    'content',   p.reponses[1 + mod(a.rn, 5)],
    'createdAt', to_char(w.created_ts + interval '2 hours 5 minutes', 'YYYY-MM-DD"T"HH24:MI:SS.000"Z"')
  )) else '[]'::jsonb end,
  case when v.s_i > 0 then p.s_txt[v.s_i] else '' end,
  case when v.s_i > 0 then p.s_niv[v.s_i] else '' end,
  w.created_ts
from actifs a
cross join generate_series(0, 11) as k
cross join params p
cross join lateral (
  select mod(k * 5 + a.rn, 8) as day_off,
         1 + mod(k + a.rn, 3) as sidx,
         -- 2e couche « accompagnement » sur 6 des 12 transmissions (k = 0,2,4,6,8,9)
         case when k < 10 and (mod(k, 2) = 0 or k = 9)
              then 1 + mod(a.rn + (case when k = 9 then 5 else k / 2 end), 6)
              else 0 end as s_i
) v
cross join lateral (
  select (current_date - v.day_off)::timestamp
         + case v.sidx when 1 then interval '7 hours 40 minutes'
                       when 2 then interval '15 hours 10 minutes'
                       else        interval '22 hours 30 minutes' end
         + make_interval(mins => mod(a.rn * 3 + k * 7, 45)) as created_ts
) w
join contenus c
  on c.grp = case when k = 10 or (k = 11 and mod(a.rn, 2) = 0) then 'u' else 'n' end
 and c.i   = case when k = 10 then 1 + mod(a.rn, 4)
                  when k = 11 and mod(a.rn, 2) = 0 then 1 + mod(a.rn + 2, 4)
                  else 1 + mod(a.rn * 7 + k * 5, 24) end;


-- ═══ MODULE JOURNAL DE BORD (journal_entries) ═══
-- ~8 entrées par résident étalées sur ~3 semaines.
-- categorie laissée '' : les catégories sont définies par l'utilisateur dans Admin
-- (ids inconnus en base de démo) ; l'app gère très bien l'absence de catégorie.
-- Marqueur de démo : author_id = 'seed-demo'.

delete from public.journal_entries where author_id = 'seed-demo';

with actifs as (
  select r.id::text as rid,
         r.etablissement_id,
         trim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as resident_name,
         coalesce(r.color, '') as color,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
params as (
  select
    array['Karim Benali', 'Sophie Lemaire', 'Léa Fontaine', 'Ibrahima Diallo', 'Claire Morel', 'Marc Aubert', 'Nadia Cherif', 'Julien Roche']::text[] as auteurs,
    array[
      $t$Matinée consacrée aux gestes du quotidien : rangement de la chambre réalisé avec un accompagnement léger. Progrès notables dans l'organisation, la personne se repère de mieux en mieux dans ses affaires.$t$,
      $t$Temps d'échange individuel en fin d'après-midi. A exprimé son envie de participer davantage aux ateliers du soir. Proposition transmise à l'équipe pour intégrer l'atelier musique du jeudi.$t$,
      $t$A préparé sa tenue pour le lendemain de manière autonome, en tenant compte de la météo. Belle prise d'initiative à souligner et à encourager.$t$,
      $t$Participation active à la réunion des résidents : a pris la parole pour proposer une sortie au bowling. Idée retenue par le groupe, à organiser ce mois-ci.$t$,
      $t$Accompagnement aux courses hebdomadaires : a suivi sa liste, comparé deux prix et respecté son budget. Objectif de gestion du budget en bonne voie.$t$,
      $t$Moment de fatigue en fin de journée, a préféré se reposer dans sa chambre plutôt que de participer au temps collectif. Choix respecté, passage régulier de l'équipe pour prendre des nouvelles.$t$,
      $t$Atelier expression ce matin : a réalisé un collage sur le thème des saisons et l'a présenté au groupe avec fierté. Aisance croissante à l'oral devant les autres.$t$,
      $t$Appel avec la mandataire judiciaire au sujet du renouvellement des papiers d'identité : rendez-vous fixé, la personne a été associée à l'échange et a noté la date sur son calendrier.$t$,
      $t$Soirée calme : jeu de société avec deux autres résidents, bonne humeur partagée. Les liens dans le groupe se renforcent.$t$,
      $t$Séance de balnéothérapie très appréciée : détente visible, verbalise se sentir « bien et léger » en sortant. À reconduire régulièrement.$t$
    ]::text[] as contenus_j,
    array[
      $t$Développer l'autonomie dans les gestes du quotidien$t$,
      $t$Renforcer la participation à la vie sociale du foyer$t$,
      $t$Consolider la gestion du budget personnel$t$,
      $t$Favoriser l'expression et la communication$t$,
      $t$Soutenir le bien-être et la gestion des émotions$t$,
      $t$Encourager l'autonomie dans les déplacements$t$
    ]::text[] as objectifs,
    array[
      $t$Merci pour ce retour détaillé, très utile pour la suite de l'accompagnement.$t$,
      $t$Belle évolution en effet, on continue dans ce sens.$t$,
      $t$Je complète : même dynamique observée ce week-end.$t$,
      $t$Noté, on met ce point à l'ordre du jour de la prochaine réunion de projet.$t$
    ]::text[] as reponses_j
)
insert into public.journal_entries
  (etablissement_id, resident_id, resident, resident_color, categorie, date,
   objectif, contenu, visibilite, serafinph_type, attachments,
   author, author_id, replies, read_by, edit_history, created_at, updated_at)
select
  a.etablissement_id,
  a.rid,
  a.resident_name,
  a.color,
  '',
  to_char(t.ts, 'YYYY-MM-DD"T"HH24:MI'),
  case when mod(a.rn + k, 3) = 0 then p.objectifs[1 + mod(a.rn + k, 6)] else '' end,
  p.contenus_j[1 + mod(a.rn * 3 + k * 7, 10)],
  case when k = 6 and mod(a.rn, 3) = 0 then 'confidentiel' else 'equipe' end,
  case mod(a.rn + k, 4) when 1 then 'direct' when 3 then 'indirect' else '' end,
  '[]'::jsonb,
  p.auteurs[1 + mod(a.rn * 2 + k, 8)],
  'seed-demo',
  case when k = 1 then jsonb_build_array(jsonb_build_object(
    'id',        'sdjrep-' || a.rn::text,
    'author',    p.auteurs[1 + mod(a.rn * 2 + k + 4, 8)],
    'authorId',  'seed-demo',
    'content',   p.reponses_j[1 + mod(a.rn, 4)],
    'createdAt', to_char(t.ts + interval '1 hour 40 minutes', 'YYYY-MM-DD"T"HH24:MI:SS.000"Z"')
  )) else '[]'::jsonb end,
  '[]'::jsonb,
  '[]'::jsonb,
  t.ts,
  t.ts
from actifs a
cross join generate_series(0, 7) as k
cross join params p
cross join lateral (
  select (current_date - mod(k * 5 + a.rn * 3, 21))::timestamp
         + make_interval(hours => 9 + mod(a.rn * 2 + k * 3, 11),
                         mins  => mod(a.rn * 7 + k * 13, 60)) as ts
) t;


-- ═══ MODULE CAHIER DE NUIT (nuits) ═══
-- 5 nuits (J-1 à J-5) par établissement, 1 ligne par nuit (unique etablissement_id + date).
-- Rondes, événements nocturnes rattachés à des résidents, 1 appel à l'astreinte
-- sur la nuit très agitée. Marqueur de démo : veilleur_id = 'seed-demo'.

delete from public.nuits where veilleur_id = 'seed-demo';

with actifs as (
  select r.id::text as rid,
         r.etablissement_id,
         trim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as resident_name,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
etabs as (
  select etablissement_id, count(*)::int as nb
  from actifs
  group by etablissement_id
),
nights as (
  select generate_series(1, 5) as n
),
params as (
  select
    array['Ibrahima Diallo', 'Nadia Cherif', 'Marc Aubert', 'Ibrahima Diallo', 'Sophie Lemaire']::text[] as veilleurs,
    array['calme', 'calme', 'agitee', 'tres_agitee', 'calme']::text[] as ambiances,
    array[
      $t$Nuit calme dans l'ensemble. Toutes les rondes effectuées sans particularité. Réveils habituels au petit matin, rien à signaler pour l'équipe du jour.$t$,
      $t$Nuit paisible. Un réveil ponctuel vite apaisé. Le linge de la buanderie a été plié pendant la veille. Bonne journée à l'équipe du matin.$t$,
      $t$Nuit un peu agitée : plusieurs réveils et un moment d'angoisse géré par une présence rassurante. Fatigue possible ce matin pour certains, prévoir des temps calmes.$t$,
      $t$Nuit très agitée : tension entre deux résidents dans la nuit, appel à l'astreinte et consignes appliquées. Retour au calme vers 4h. Point à faire en réunion d'équipe, surveiller la fatigue ce matin.$t$,
      $t$Nuit sereine. Petit encas donné vers 23h à un résident qui n'arrivait pas à s'endormir. Rondes sans particularité, tout le monde dormait à 6h30.$t$
    ]::text[] as trans_nuit,
    array['reveil', 'angoisse', 'soin', 'reveil', 'autre', 'angoisse']::text[] as evt_types,
    array['23:40', '01:15', '02:30', '03:20', '00:50', '04:05']::text[] as evt_heures,
    array[
      $t$Réveil dans la nuit, a demandé un verre d'eau ; s'est rendormi rapidement après un court temps d'échange.$t$,
      $t$Moment d'angoisse au coucher, apaisé par une présence rassurante et la veilleuse laissée allumée.$t$,
      $t$Plainte de maux de tête, paracétamol donné selon le protocole ; soulagement constaté à la ronde suivante.$t$,
      $t$Insomnie prolongée, temps calme au salon avec le veilleur avant de regagner la chambre sereinement.$t$,
      $t$Lumière restée allumée dans la chambre : dormait profondément, extinction faite sans réveil.$t$,
      $t$Cauchemar avec réveil en sursaut ; temps d'écoute et retour au calme progressif.$t$
    ]::text[] as evt_descs
),
evts as (
  select a.etablissement_id, n.n,
         jsonb_agg(jsonb_build_object(
           'id',           'sdev' || n.n::text || '-' || a.rn::text,
           'type',         p.evt_types[1 + mod(a.rn + n.n, 6)],
           'heure',        p.evt_heures[1 + mod(a.rn + n.n, 6)],
           'residentId',   a.rid,
           'residentName', a.resident_name,
           'description',  p.evt_descs[1 + mod(a.rn + n.n, 6)]
         ) order by a.rn) as evenements
  from actifs a
  cross join nights n
  cross join params p
  where mod(a.rn + n.n * 3, 5) = 0
  group by a.etablissement_id, n.n
)
insert into public.nuits
  (etablissement_id, date, veilleur, veilleur_id, ambiance, effectif,
   rondes, evenements, astreintes, transmission)
select
  e.etablissement_id,
  current_date - n.n,
  p.veilleurs[n.n],
  'seed-demo',
  p.ambiances[n.n],
  greatest(e.nb - mod(n.n, 2), 0),
  jsonb_build_array(
    jsonb_build_object('id', 'sdrd' || n.n::text || '-1', 'heure', '22:30', 'ras', true, 'note', ''),
    jsonb_build_object('id', 'sdrd' || n.n::text || '-2', 'heure', '00:15', 'ras', n.n <> 3,
      'note', case when n.n = 3 then $t$Deux résidents réveillés, discussion dans le couloir ; retour en chambre accompagné.$t$ else '' end),
    jsonb_build_object('id', 'sdrd' || n.n::text || '-3', 'heure', '02:00', 'ras', n.n <> 4,
      'note', case when n.n = 4 then $t$Tension perceptible à l'étage, présence renforcée jusqu'au retour au calme.$t$ else '' end),
    jsonb_build_object('id', 'sdrd' || n.n::text || '-4', 'heure', '04:10', 'ras', true, 'note', ''),
    jsonb_build_object('id', 'sdrd' || n.n::text || '-5', 'heure', '06:20', 'ras', true,
      'note', case when n.n = 5 then $t$Tout le monde dort, préparation des tables du petit-déjeuner.$t$ else '' end)
  ),
  coalesce(ev.evenements, '[]'::jsonb),
  case when n.n = 4 then jsonb_build_array(jsonb_build_object(
    'id',       'sdas' || n.n::text || '-1',
    'heure',    '02:45',
    'cadre',    'Claire Morel',
    'motif',    $t$Tension entre deux résidents au retour d'une insomnie, difficulté à faire redescendre la pression malgré la médiation du veilleur.$t$,
    'decision', $t$Consigne de séparer les espaces pour le reste de la nuit et de repasser toutes les 30 minutes ; point à faire en réunion d'équipe au matin.$t$
  )) else '[]'::jsonb end,
  p.trans_nuit[n.n]
from etabs e
cross join nights n
cross join params p
left join evts ev on ev.etablissement_id = e.etablissement_id and ev.n = n.n
on conflict (etablissement_id, date) do nothing;


-- ═══ MODULE PRÉSENCES (presences) ═══
-- 7 jours (J-6 à J) : très majoritairement présent, une sortie et/ou une absence
-- ponctuelles, et parfois un jour non renseigné (pas de ligne = N/R dans l'app).
-- Pas de colonne auteur sur cette table : purge de la fenêtre datée pour les
-- résidents de la base (base de démonstration), puis on conflict do nothing.

delete from public.presences
 where date between current_date - 6 and current_date
   and resident_id in (select id::text from public.residents);

with actifs as (
  select r.id::text as rid,
         r.etablissement_id,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
)
insert into public.presences (etablissement_id, resident_id, date, statut)
select
  a.etablissement_id,
  a.rid,
  current_date - d,
  case mod(a.rn * 3 + d * 5, 11)
    when 0 then 'sortie'
    when 1 then 'absent'
    else 'present'
  end
from actifs a
cross join generate_series(0, 6) as d
where mod(a.rn * 3 + d * 5, 11) <> 7          -- jour non renseigné (N/R) pour certains
on conflict (resident_id, date) do nothing;


-- ═══ MODULE REPAS (repas_jour) ═══
-- 5 jours (J-4 à J), UNE ligne par jour et par établissement (unique etablissement_id + date),
-- tous résidents confondus dans le jsonb data (format js/repas.js) :
--   matin/midi/soir : { residentId: false } = désinscrit (absent de l'objet = inscrit)
--   choixMenu       : { residentId: { midi|soir: '1'|'2' } }
--   menus           : { midi|soir: { '1': texte, '2': texte } }
-- Pas de colonne auteur : purge de la fenêtre datée pour les établissements
-- des résidents de la base, puis on conflict do nothing.

delete from public.repas_jour
 where date between current_date - 4 and current_date
   and etablissement_id in (select distinct etablissement_id from public.residents);

with actifs as (
  select r.id::text as rid,
         r.etablissement_id,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
jours as (
  select generate_series(0, 4) as off
),
menus as (
  select * from (values
    (0, $t$Filet de colin sauce citron, riz pilaf et julienne de légumes$t$,
        $t$Sauté de dinde aux herbes, purée de pommes de terre$t$,
        $t$Gratin de courgettes au fromage, salade verte$t$,
        $t$Soupe de légumes, tarte aux poireaux$t$),
    (1, $t$Bœuf bourguignon, tagliatelles fraîches$t$,
        $t$Pavé de saumon, écrasé de pommes de terre à l'huile d'olive$t$,
        $t$Omelette aux fines herbes, poêlée de ratatouille$t$,
        $t$Croque-monsieur maison, salade de tomates$t$),
    (2, $t$Couscous de légumes et poulet, semoule fine$t$,
        $t$Quiche aux légumes, salade verte et vinaigrette maison$t$,
        $t$Velouté de potiron, riz aux petits légumes$t$,
        $t$Pâtes à la bolognaise, emmental râpé$t$),
    (3, $t$Filet de lieu vapeur, lentilles mijotées aux carottes$t$,
        $t$Escalope de volaille à la crème, haricots verts persillés$t$,
        $t$Salade composée œuf, maïs et thon, pain de campagne$t$,
        $t$Galettes de pommes de terre, fromage blanc aux herbes$t$),
    (4, $t$Poulet rôti, pommes grenailles au four$t$,
        $t$Lasagnes de légumes du soleil$t$,
        $t$Soupe à l'oignon, salade d'endives aux noix$t$,
        $t$Riz au thon et petits légumes, yaourt nature$t$)
  ) as m(off, midi1, midi2, soir1, soir2)
),
pr as (
  select a.etablissement_id, a.rid, a.rn, j.off,
         mod(a.rn + j.off, 6) = 1     as abs_matin,
         mod(a.rn * 2 + j.off, 7) = 2 as abs_midi,
         mod(a.rn + j.off * 2, 8) = 3 as abs_soir
  from actifs a
  cross join jours j
),
prc as (
  select pr.*,
         case when mod(pr.rn + pr.off, 3) <> 0 then jsonb_strip_nulls(jsonb_build_object(
           'midi', case when not pr.abs_midi then (case when mod(pr.rn + pr.off, 2) = 0 then '1' else '2' end) end,
           'soir', case when not pr.abs_soir then (case when mod(pr.rn + pr.off + 1, 2) = 0 then '1' else '2' end) end
         )) end as choix
  from pr
)
insert into public.repas_jour (etablissement_id, date, data)
select
  agg.etablissement_id,
  current_date - agg.off,
  agg.base || jsonb_build_object('menus', jsonb_build_object(
    'midi', jsonb_build_object('1', m.midi1, '2', m.midi2),
    'soir', jsonb_build_object('1', m.soir1, '2', m.soir2)
  ))
from (
  select prc.etablissement_id, prc.off,
         jsonb_build_object(
           'matin', coalesce(jsonb_object_agg(prc.rid, to_jsonb(false)) filter (where prc.abs_matin), '{}'::jsonb),
           'midi',  coalesce(jsonb_object_agg(prc.rid, to_jsonb(false)) filter (where prc.abs_midi), '{}'::jsonb),
           'soir',  coalesce(jsonb_object_agg(prc.rid, to_jsonb(false)) filter (where prc.abs_soir), '{}'::jsonb),
           'choixMenu', coalesce(jsonb_object_agg(prc.rid, prc.choix)
                                 filter (where prc.choix is not null and prc.choix <> '{}'::jsonb), '{}'::jsonb)
         ) as base
  from prc
  group by prc.etablissement_id, prc.off
) agg
join menus m on m.off = agg.off
on conflict (etablissement_id, date) do nothing;


-- ═══ MODULE SOINS — MÉDICAMENTS (traitements + distributions) · PLAN DE SOINS · INCIDENTS ═══
-- Contenu de démonstration pour un foyer médico-social (handicap adulte).
-- À exécuter dans le SQL Editor de Supabase (rôle postgres, RLS bypassée).
-- Aucun id ni etablissement_id en dur : tout dérive de public.residents (résidents actifs, statut <> 'sorti').
--
-- IDEMPOTENCE (marqueurs de démo) :
--   · traitements : items de residents.sante.traitements avec id 'seed-t%' — remplacés à chaque exécution,
--     les traitements ajoutés à la main et les autres clés de sante (rdv, vaccins…) sont PRÉSERVÉS ;
--   · med_distrib : delete where traitement_id like 'seed-t%' ;
--   · plan_soins  : delete where note like '%[démo]%' (pas de colonne author/created_by sur cette table) ;
--   · incidents   : declared_by_id = 'seed-demo' (colonne non affichée) + '[démo]' dans notes.
--
-- Formats respectés (js/medicaments.js, js/medicaments-supabase.js, js/plan-soins.js, js/incidents-supabase.js) :
--   · sante.traitements[] = { id, nom, posologie, frequence, debut 'YYYY-MM-DD', fin '', moments: [matin|midi|soir|coucher] }
--   · med_distrib.statut ∈ donne|confie|refuse|absent|report ; heure = ISO complet (l'app affiche heure.slice(11,16))
--   · plan_soins.cat ∈ hygiene|medication|mobilite|alimentation|soins_infirm|psy|social|autre ;
--     freq ∈ quotidien|matin|midi|soir|nuit|semaine|mensuel|si_besoin
--   · incidents.type ∈ chute|agression|fugue|violence|medical|materiel|accident|autre ; gravite ∈ leger|moyen|grave|critique ;
--     statut ∈ declare|cours|valide|classe ; date texte 'YYYY-MM-DD' ; heure texte 'HH:MM' ; eig = null (aucun EIG).


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) TRAITEMENTS — injectés dans residents.sante.traitements (pas de table dédiée)
--    2 traitements par résident (3 pour un résident sur deux), associations plausibles,
--    débuts étalés dans le passé (~3 à 11 mois), fin vide = traitement en cours.
-- ─────────────────────────────────────────────────────────────────────────────
with meds(idx, nom, posologie, frequence, moments) as (
  values
    (1,  $t$Valproate de sodium LP 500 mg$t$, $t$500 mg$t$,   $t$1 comprimé matin et soir$t$,                     $j$["matin","soir"]$j$::jsonb),
    (2,  $t$Rispéridone 1 mg$t$,              $t$1 mg$t$,     $t$1 comprimé le soir$t$,                           $j$["soir"]$j$::jsonb),
    (3,  $t$Sertraline 50 mg$t$,              $t$50 mg$t$,    $t$1 comprimé le matin$t$,                          $j$["matin"]$j$::jsonb),
    (4,  $t$Lévétiracétam 500 mg$t$,          $t$500 mg$t$,   $t$1 comprimé matin et soir$t$,                     $j$["matin","soir"]$j$::jsonb),
    (5,  $t$Mélatonine LP 2 mg$t$,            $t$2 mg$t$,     $t$1 comprimé au coucher$t$,                        $j$["coucher"]$j$::jsonb),
    (6,  $t$Aripiprazole 10 mg$t$,            $t$10 mg$t$,    $t$1 comprimé le matin$t$,                          $j$["matin"]$j$::jsonb),
    (7,  $t$Ésoméprazole 20 mg$t$,            $t$20 mg$t$,    $t$1 comprimé le matin à jeun$t$,                   $j$["matin"]$j$::jsonb),
    (8,  $t$Macrogol 4000 sachet$t$,          $t$1 sachet$t$, $t$le matin, dilué dans un grand verre d'eau$t$,    $j$["matin"]$j$::jsonb),
    (9,  $t$Lévothyroxine 75 µg$t$,           $t$75 µg$t$,    $t$1 comprimé le matin à jeun$t$,                   $j$["matin"]$j$::jsonb),
    (10, $t$Cyamémazine 25 mg$t$,             $t$25 mg$t$,    $t$1 comprimé le soir$t$,                           $j$["soir"]$j$::jsonb)
),
actifs as (
  select r.id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
seed_traitements as (
  select a.id as rid,
         jsonb_agg(
           jsonb_build_object(
             'id',        'seed-t' || p.k,
             'nom',       m.nom,
             'posologie', m.posologie,
             'frequence', m.frequence,
             'moments',   m.moments,
             'debut',     to_char(current_date - (90 + mod(a.rn * 13 + p.k * 31, 240)), 'YYYY-MM-DD'),
             'fin',       ''
           ) order by p.k
         ) as arr
  from actifs a
  cross join lateral (values (1), (2), (3)) p(k)
  join meds m on m.idx = 1 + mod(a.rn + case p.k when 1 then 0 when 2 then 3 else 6 end, 10)
  where p.k <= 2 or mod(a.rn, 2) = 0
  group by a.id
)
update public.residents res
set sante = coalesce(res.sante, $j${}$j$::jsonb) || jsonb_build_object(
      'traitements',
      coalesce((select jsonb_agg(t.val)
                  from jsonb_array_elements(coalesce(res.sante -> 'traitements', $j$[]$j$::jsonb)) t(val)
                 where coalesce(t.val ->> 'id', '') not like 'seed-t%'), $j$[]$j$::jsonb)
      || s.arr),
    updated_at = now()
from seed_traitements s
where res.id = s.rid;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) MED_DISTRIB — traçabilité des prises sur les 7 derniers jours
--    Relit les traitements 'seed-t%' posés à l'étape 1 (cohérence garantie fiche ↔ distribution).
--    Aujourd'hui : seule la prise du matin est tracée, le reste apparaît « en attente » dans l'app.
--    Statuts majoritairement 'donne', avec quelques refus / absences / reports / prises confiées.
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.med_distrib where traitement_id like 'seed-t%';

insert into public.med_distrib
  (etablissement_id, date, resident_id, resident_name, traitement_id, medicament,
   posologie, moment, statut, heure, auteur, observation, created_at, updated_at)
select
  r.etablissement_id,
  current_date - d.d,
  r.id::text,
  trim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')),
  t.val ->> 'id',
  t.val ->> 'nom',
  t.val ->> 'posologie',
  m.moment,
  case h.k when 4 then 'refuse' when 9 then 'absent' when 14 then 'report' when 7 then 'confie' else 'donne' end,
  to_char((current_date - d.d) + x.tb + make_interval(mins => mod(r.rn + d.d * 3, 9)), 'YYYY-MM-DD"T"HH24:MI:SS".000Z"'),
  (array[$t$Karim B.$t$, $t$Sophie L.$t$, $t$Léa M.$t$, $t$Ibrahima D.$t$, $t$Claire P.$t$, $t$Marc T.$t$, $t$Nadia R.$t$])[1 + mod(r.rn * 2 + d.d + x.mi, 7)],
  case h.k
    when 4 then (array[
      $t$Refus exprimé calmement, gobelet repoussé. Refus respecté, reproposé vingt minutes plus tard : refus maintenu. IDE informée.$t$,
      $t$Ne souhaitait pas prendre son comprimé. Après un temps d'échange, le refus est resté ferme ; l'IDE en a informé le médecin traitant.$t$,
      $t$Refus verbal, sans opposition. À reproposer au prochain passage, transmission faite à l'équipe.$t$,
      $t$A dit ne pas vouloir aujourd'hui. Refus respecté, tracé et transmis à l'IDE.$t$,
      $t$Refus dans un contexte de fatigue. Reproposé après le repas : refus maintenu, surveillance habituelle poursuivie.$t$
    ])[1 + mod(r.rn + d.d, 5)]
    when 9 then (array[
      $t$Absent(e) au moment de la distribution (sortie accompagnée). Prise gérée au retour, sur avis de l'IDE.$t$,
      $t$En week-end en famille : le pilulier de sortie a été remis au départ.$t$,
      $t$À l'ESAT à ce moment de la journée, la prise est organisée sur place.$t$
    ])[1 + mod(r.rn + d.d, 3)]
    when 14 then (array[
      $t$Prise décalée après le retour d'activité, avec l'accord de l'IDE.$t$,
      $t$Reportée d'une heure : la personne se reposait, prise donnée à son réveil.$t$,
      $t$Report à plus tard dans la soirée, validé par l'IDE.$t$
    ])[1 + mod(r.rn + d.d, 3)]
    when 7 then (array[
      $t$Comprimé confié pour une prise en autonomie supervisée, dans le cadre de son projet personnalisé.$t$,
      $t$Traitement confié, prise vérifiée discrètement ensuite : effectuée sans difficulté.$t$
    ])[1 + mod(r.rn + d.d, 2)]
    when 2 then (array[
      $t$Prise sans difficulté.$t$,
      $t$RAS, pris avec un grand verre d'eau.$t$,
      $t$Prise en autonomie, simple supervision de l'équipe.$t$
    ])[1 + mod(r.rn + d.d, 3)]
    else ''
  end,
  ((current_date - d.d) + x.tb)::timestamptz,
  now()
from (select rr.*, (row_number() over (order by rr.id))::int as rn
        from public.residents rr
       where coalesce(rr.statut, '') <> 'sorti') r
cross join lateral jsonb_array_elements(coalesce(r.sante -> 'traitements', $j$[]$j$::jsonb)) t(val)
cross join lateral jsonb_array_elements_text(t.val -> 'moments') m(moment)
cross join generate_series(0, 6) d(d)
cross join lateral (select case m.moment when 'matin' then 0 when 'midi' then 1 when 'soir' then 2 else 3 end as mi,
                           case m.moment when 'matin' then time '08:02' when 'midi' then time '12:32'
                                         when 'soir' then time '19:08' else time '21:38' end as tb) x
cross join lateral (select mod(r.rn * 3 + d.d * 5 + x.mi * 7, 23) as k) h
where t.val ->> 'id' like 'seed-t%'
  and (d.d > 0 or m.moment = 'matin');


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) PLAN_SOINS — 4 soins par résident, répartis sur les catégories du module,
--    contenus variés par résident (rotation sur 12 modèles), 1 soin suspendu
--    pour un résident sur cinq (bouton « Réactiver » visible dans l'app).
--    Marqueur de démo : '[démo]' dans note (visible uniquement dans le modal d'édition).
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.plan_soins where note like '%[démo]%';

with soins(idx, cat, freq, libelle, detail, intervenant) as (
  values
    (1,  'hygiene',      'quotidien', $t$Accompagnement à la douche$t$,
         $t$Guidance verbale étape par étape, encourager les gestes réalisés seul(e). Vérifier la température de l'eau avant d'entrer.$t$,
         $t$Karim (AES)$t$),
    (2,  'hygiene',      'semaine',   $t$Soin des ongles et coiffure$t$,
         $t$Proposer le mardi après la douche. Respecter un éventuel refus et reproposer plus tard dans la semaine.$t$,
         $t$Nadia (AES)$t$),
    (3,  'medication',   'semaine',   $t$Préparation du pilulier hebdomadaire$t$,
         $t$Pilulier préparé le dimanche soir, double vérification avec l'ordonnance en cours de validité.$t$,
         $t$Sophie (IDE)$t$),
    (4,  'medication',   'quotidien', $t$Aide à la prise des traitements$t$,
         $t$Présenter les comprimés un par un avec un grand verre d'eau, tracer chaque prise sur la feuille de distribution.$t$,
         $t$Sophie (IDE)$t$),
    (5,  'mobilite',     'quotidien', $t$Marche dans le parc$t$,
         $t$20 à 30 minutes après le déjeuner, adapter le rythme au jour le jour, prévoir des chaussures fermées.$t$,
         $t$Marc (éducateur sportif)$t$),
    (6,  'mobilite',     'semaine',   $t$Séance de kinésithérapie$t$,
         $t$Le jeudi matin au cabinet. Prévoir le transport et l'accompagnement par un membre de l'équipe.$t$,
         $t$Cabinet de kinésithérapie$t$),
    (7,  'alimentation', 'midi',      $t$Accompagnement au repas du midi$t$,
         $t$Installer au calme, inciter à manger lentement et proposer de l'eau régulièrement pendant le repas.$t$,
         $t$Léa (monitrice-éducatrice)$t$),
    (8,  'alimentation', 'quotidien', $t$Surveillance de l'hydratation$t$,
         $t$Proposer à boire à chaque collation, et plus fréquemment en période de forte chaleur.$t$,
         $t$Équipe$t$),
    (9,  'soins_infirm', 'mensuel',   $t$Surveillance du poids et des constantes$t$,
         $t$Pesée le premier lundi du mois, tension et pouls ; reporter les valeurs dans le dossier de soins.$t$,
         $t$Sophie (IDE)$t$),
    (10, 'psy',          'semaine',   $t$Entretien de soutien psychologique$t$,
         $t$Le mercredi après-midi. Respecter les jours où la personne ne souhaite pas parler, le signaler simplement.$t$,
         $t$Psychologue$t$),
    (11, 'social',       'semaine',   $t$Accompagnement aux courses personnelles$t$,
         $t$Le samedi matin. Travailler la gestion de l'argent de poche : liste, comparaison des prix, rendu de monnaie.$t$,
         $t$Ibrahima (éducateur)$t$),
    (12, 'autre',        'si_besoin', $t$Temps calme en salle sensorielle$t$,
         $t$Proposer un temps au calme en cas de signes de fatigue ou d'anxiété, sans jamais l'imposer.$t$,
         $t$Équipe$t$)
),
actifs as (
  select r.id, r.etablissement_id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
)
insert into public.plan_soins
  (etablissement_id, resident_id, cat, freq, libelle, detail, intervenant, note, actif, created_at, updated_at)
select
  a.etablissement_id,
  a.id::text,
  s.cat, s.freq, s.libelle, s.detail, s.intervenant,
  (array[
    $t$Mis en place avec l'accord de la personne, à réévaluer au prochain point projet. [démo]$t$,
    $t$Validé en réunion d'équipe pluridisciplinaire. [démo]$t$,
    $t$Repère important pour la personne : garder le même déroulé autant que possible. [démo]$t$,
    $t$À ajuster selon la fatigue du moment, en accord avec la personne. [démo]$t$
  ])[1 + mod(a.rn + p.k, 4)],
  case when p.k = 3 and mod(a.rn, 5) = 2 then false else true end,
  (current_date - (15 + mod(a.rn * 5 + p.k * 3, 30)))::timestamptz,
  now()
from actifs a
cross join lateral (values (0), (1), (2), (3)) p(k)
join soins s on s.idx = 1 + mod(a.rn + (array[0, 4, 7, 9])[p.k + 1], 12);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) INCIDENTS — 3 incidents variés, non dramatiques, sur les 3 premiers résidents actifs
--    (chute sans gravité validée, désaccord verbal apaisé classé, oubli de prise rattrapé en cours d'analyse).
--    eig = null partout (aucun EIG). Marqueurs : declared_by_id = 'seed-demo' + '[démo]' dans notes.
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.incidents where declared_by_id = 'seed-demo' or notes like '%[démo]%';

with actifs as (
  select r.id, r.etablissement_id, r.prenom, r.nom, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
inc(pick, titre, type, gravite, jours, heure, lieu, description, statut, declared_by, validated_by, notes) as (
  values
    (1, $t$Chute sans gravité dans le couloir$t$, 'chute', 'leger', 9, '16:40',
        $t$Couloir du rez-de-chaussée$t$,
        $t$En regagnant sa chambre après le goûter, {prenom} a glissé dans le couloir du rez-de-chaussée. Pas de choc à la tête, pas de douleur exprimée. Aide au relever en deux personnes, installation au fauteuil, passage de l'infirmière dans le quart d'heure : constantes normales. Surveillance renforcée pendant 48 h et famille informée par téléphone dans la soirée.$t$,
        'valide', $t$Karim B. (AES)$t$, $t$Claire P. (cheffe de service)$t$,
        $t$Surveillance de 48 h réalisée, aucune suite. Le sol venait d'être lavé : la signalétique « sol mouillé » a été repositionnée avec l'équipe d'entretien. [démo]$t$),
    (2, $t$Désaccord verbal au dîner, apaisé$t$, 'autre', 'leger', 4, '18:15',
        $t$Salle à manger$t$,
        $t$Au moment du dîner, un désaccord sur le choix de la table a donné lieu à un échange verbal vif entre {prenom} et un autre résident. Aucun geste, aucune menace. Les deux personnes ont été accompagnées séparément pour un temps d'apaisement, puis le repas a repris normalement. Un temps de médiation a été proposé pour le lendemain et accepté par les deux.$t$,
        'classe', $t$Léa M. (monitrice-éducatrice)$t$, $t$Claire P. (cheffe de service)$t$,
        $t$Médiation réalisée le lendemain avec la psychologue : situation apaisée, les deux résidents partagent à nouveau les repas sans difficulté. [démo]$t$),
    (3, $t$Oubli d'une prise du matin, rattrapé sur avis médical$t$, 'medical', 'leger', 1, '13:05',
        $t$Infirmerie$t$,
        $t$Lors du contrôle du pilulier de la mi-journée, l'infirmière a constaté que la prise du matin de {prenom} n'avait pas été donnée. Le médecin traitant, joint par téléphone, a validé une prise décalée à 13 h, sans doublement de dose. Aucun signe inhabituel observé dans la journée. L'équipe du matin a été informée.$t$,
        'cours', $t$Ibrahima D. (IDE)$t$, null,
        $t$Analyse en cours : le circuit du médicament sera repris à la prochaine réunion d'équipe pour fiabiliser la traçabilité. [démo]$t$)
)
insert into public.incidents
  (etablissement_id, titre, type, gravite, date, heure, resident_id, resident_name,
   lieu, description, statut, declared_by, declared_by_id, declared_at,
   validated_by, validated_by_id, validated_at, notes, eig, created_at, updated_at)
select
  a.etablissement_id, i.titre, i.type, i.gravite,
  to_char(current_date - i.jours, 'YYYY-MM-DD'),
  i.heure,
  a.id::text,
  trim(coalesce(a.prenom, '') || ' ' || coalesce(a.nom, '')),
  i.lieu,
  replace(i.description, '{prenom}', coalesce(nullif(trim(a.prenom), ''), $t$la personne$t$)),
  i.statut,
  i.declared_by,
  'seed-demo',
  ((current_date - i.jours) + i.heure::time + interval '35 minutes')::timestamptz,
  case when i.statut in ('valide', 'classe') then i.validated_by end,
  null,
  case when i.statut in ('valide', 'classe') then ((current_date - i.jours + 1) + time '10:30')::timestamptz end,
  i.notes,
  null,
  ((current_date - i.jours) + i.heure::time + interval '35 minutes')::timestamptz,
  now()
from inc i
join actifs a on a.rn = i.pick;

-- ═══ FIN DU MODULE SOINS ═══


-- ═══ MODULE PROJET PERSONNALISÉ — ppe (avenants) + taches_ppa / taches_coches ═══
-- Contenu de démonstration pour un foyer d'hébergement médico-social (handicap adulte).
-- À exécuter dans le SQL Editor Supabase (rôle postgres, RLS bypassée), APRÈS le seed des résidents.
-- Aucun id ni etablissement_id en dur : tout est dérivé de public.residents (résidents non sortis).
-- Idempotence : les données de démo sont marquées created_by = 'seed-demo' (ppe, taches_ppa)
--               et par_id = 'seed-demo' (taches_coches) ; elles sont purgées puis recréées.
-- Par résident : 1 avenant ACTIF complet — 3 domaines remplis (bilan, expression, 2 objectifs
--   chacun avec moyens/échéance/évaluation), codes SERAFIN-PH validés sur chaque objectif,
--   outcomes début (auto + pro) et fin partiels, cycle PPA avancé (attentes + co-construction
--   faites), p.serafin.prestations dérivé des codes validés, signatures remplies,
--   rédaction il y a ~5 mois, révision à +12 mois.
-- + 4 tâches du quotidien reliées aux objectifs de SON avenant (moments variés, 1 hebdomadaire)
-- + coches du jour pour environ la moitié des tâches (faites avec soutien, 1-2 reportées
--   avec motif, dont « N'a pas voulu (c'est son droit) »).

-- ── Purge des données de démo précédentes ──
delete from public.taches_coches where par_id     = 'seed-demo';
delete from public.taches_ppa   where created_by = 'seed-demo';
delete from public.ppe          where created_by = 'seed-demo';

-- ── Création en cascade : avenants → tâches → coches du jour ──
with res as (
  select r.id,
         r.id::text as rid,
         r.etablissement_id,
         coalesce(nullif(trim(r.prenom), ''), 'La personne') as pnom,
         coalesce(nullif(trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')), ''), 'Résident') as resident_name,
         coalesce(nullif(trim(coalesce(r.protection, '')), ''), '') as protection_res,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),

-- Bibliothèque de contenus (6 variantes par tableau, indexées par résident)
lib as (
  select
    array['Karim Benali','Sophie Marchand','Léa Tissier','Ibrahima Diallo','Claire Perrin','Marc Vasseur'] as team,
    array['Nathalie Fabre','Olivier Lenoir'] as dirs,
    array['ESAT Les Ateliers du Parc','ESAT Horizon','ESAT de la Vallée'] as employeurs,
    array['Espaces verts','Conditionnement','Blanchisserie','Restauration collective','Menuiserie','Sous-traitance industrielle'] as ateliers,
    array[$t$Curatelle renforcée (UDAF)$t$, $t$Tutelle familiale$t$, $t$Curatelle simple$t$, $t$Habilitation familiale$t$] as protections,

    -- Domaine AUTONOMIE : bilans (suite du prénom) et expressions
    array[
      $t$ gagne en assurance dans les gestes du quotidien. La toilette et l'habillage sont mieux investis qu'en début de cycle ; la régularité reste à consolider sans sollicitation de l'équipe.$t$,
      $t$ s'approprie bien les repères mis en place (trame imagée, rituels du matin). Les réussites sont de plus en plus fréquentes et la fierté est visible.$t$,
      $t$ a de réelles capacités dans les actes du quotidien ; le besoin porte surtout sur la confiance pour se lancer sans appui de l'équipe.$t$,
      $t$ a progressé sur l'organisation du matin : le lever et la préparation se font désormais dans les temps la plupart des jours de semaine.$t$,
      $t$ apprécie les temps d'accompagnement individuels. Le travail engagé sur le soin de soi porte ses fruits, avec des acquis à stabiliser le week-end.$t$,
      $t$ montre un vrai plaisir à faire seul. L'équipe ajuste le niveau de soutien pour ne pas faire à la place et laisser venir la réussite.$t$
    ] as ba,
    array[
      $t$« Je veux me préparer sans aide le matin, comme à l'ESAT. »$t$,
      $t$« J'aime bien qu'on me laisse faire, mais je veux que quelqu'un reste pas loin. »$t$,
      $t$« Quand j'y arrive sans aide, ça me fait vraiment plaisir. »$t$,
      $t$« Je veux choisir mes habits moi-même. »$t$,
      $t$« Des fois c'est dur le matin, mais ça va mieux. »$t$,
      $t$« Je veux qu'on me fasse confiance. »$t$
    ] as xa,

    -- AUTONOMIE — objectif 1 (matin) + tâche quotidienne associée
    array[
      $t$Réaliser sa toilette du matin en suivant la trame imagée, avec une guidance qui s'estompe$t$,
      $t$Choisir sa tenue et s'habiller seul en tenant compte de la météo du jour$t$,
      $t$Prendre soin de son linge : trier le propre du sale et déposer son linge à la lingerie$t$,
      $t$Se raser et se coiffer de façon autonome avant le départ à l'ESAT$t$,
      $t$Gérer son réveil et être prêt dans les temps pour le départ du matin$t$,
      $t$Se brosser les dents matin et soir avec un simple rappel discret$t$
    ] as a1o,
    array[
      $t$Trame imagée affichée dans la salle de bain, guidance verbale uniquement si besoin, valorisation systématique des réussites$t$,
      $t$Météo affichée au tableau du foyer, garde-robe réorganisée par type de vêtements, accompagnement au choix la veille si besoin$t$,
      $t$Panière à deux bacs dans la chambre, passage à la lingerie intégré au rituel du matin, soutien de la maîtresse de maison$t$,
      $t$Matériel adapté (rasoir électrique), miroir à hauteur, apprentissage étape par étape avec le référent$t$,
      $t$Réveil personnel choisi ensemble, routine du matin affichée, marge de temps prévue pour éviter la pression$t$,
      $t$Minuteur ludique dans la salle de bain, rappel discret sans insistance, suivi annuel avec le dentiste$t$
    ] as a1m,
    array[
      $t$Grille d'observation hebdomadaire relue avec le référent$t$,
      $t$Nombre de matins où la tenue est choisie sans aide, point mensuel$t$,
      $t$Auto-évaluation avec le référent toutes les deux semaines$t$,
      $t$Retour de l'atelier : présentation soignée à l'arrivée à l'ESAT$t$,
      $t$Nombre de départs sereins et à l'heure sur la semaine$t$,
      $t$Bilan lors du rendez-vous dentaire annuel et observation quotidienne$t$
    ] as a1e,
    array[
      $t$Toilette du matin avec la trame imagée$t$,
      $t$Choix de la tenue du jour$t$,
      $t$Dépôt du linge sale à la lingerie$t$,
      $t$Rasage et coiffure avant le départ$t$,
      $t$Lever et préparation du matin$t$,
      $t$Brossage des dents après le petit-déjeuner$t$
    ] as t1l,
    array[
      $t$Laisser sortir les affaires de toilette sans intervenir. Guidance verbale seulement si une étape bloque, en suivant la trame affichée. Verbaliser chaque réussite.$t$,
      $t$Regarder ensemble la météo au tableau, puis laisser choisir la tenue. Ne reprendre le choix que s'il met la santé en jeu (grand froid, canicule).$t$,
      $t$Rappeler le passage à la lingerie au moment du petit-déjeuner si besoin. Le tri propre/sale se fait dans la chambre, avec la panière à deux bacs.$t$,
      $t$Proposer le rasoir électrique après le petit-déjeuner. Rester à proximité sans faire à la place ; souligner le résultat devant le miroir.$t$,
      $t$Frapper une seule fois si le réveil a déjà sonné. Laisser dérouler la routine affichée ; n'intervenir que si le retard met en jeu le départ.$t$,
      $t$Un seul rappel discret après le petit-déjeuner. Le minuteur est dans la salle de bain ; laisser gérer le temps de brossage.$t$
    ] as t1c,
    array['verbal','supervision','autonomie','partiel','supervision','verbal'] as t1s,
    array['07:30','07:20','08:00','07:45','07:10','08:15'] as t1h,

    -- AUTONOMIE — objectif 2 (soir) + tâche quotidienne associée
    array[
      $t$Préparer ses affaires pour le lendemain la veille au soir$t$,
      $t$Ranger sa chambre en s'appuyant sur les repères photos mis en place$t$,
      $t$Respecter le cadre convenu pour les écrans le soir afin de préserver le sommeil$t$,
      $t$Préparer sa boisson chaude du soir en toute sécurité$t$,
      $t$Suivre son rituel du coucher pour un endormissement apaisé$t$,
      $t$Vérifier ses affaires et fermer sa chambre avant la nuit$t$
    ] as a2o,
    array[
      $t$Check-list imagée sur la porte du placard, temps dédié après le dîner, soutien verbal de l'équipe du soir$t$,
      $t$Photos des rangements collées sur les meubles, passages courts et réguliers plutôt que grand rangement, encouragements$t$,
      $t$Cadre co-construit et affiché (extinction à 22 h 30), alternative proposée (musique douce, lecture), rappel bienveillant$t$,
      $t$Bouilloire à arrêt automatique, gestes appris avec l'équipe, présence à proximité au début puis retrait progressif$t$,
      $t$Rituel co-construit (douche, musique calme, lumière tamisée), passage rassurant de l'équipe de nuit$t$,
      $t$Petite routine de vérification (fenêtre, lumière, affaires du lendemain), soutien verbal dégressif$t$
    ] as a2m,
    array[
      $t$Nombre de matins sans oubli constaté sur la semaine$t$,
      $t$Regard croisé résident/référent lors du point hebdomadaire$t$,
      $t$Qualité du lever le lendemain, échanges au point hebdomadaire$t$,
      $t$Réalisation en sécurité observée sur un mois$t$,
      $t$Nombre de nuits d'endormissement serein, échanges avec le veilleur$t$,
      $t$Auto-évaluation le matin avec l'équipe$t$
    ] as a2e,
    array[
      $t$Préparation du sac pour demain$t$,
      $t$Rangement du soir avec les repères photos$t$,
      $t$Point écrans avant la nuit$t$,
      $t$Tisane du soir en autonomie$t$,
      $t$Rituel du coucher$t$,
      $t$Vérification du soir de la chambre$t$
    ] as t3l,
    array[
      $t$Après le dîner, proposer le temps de préparation avec la check-list de la porte du placard. Vérifier ensemble uniquement si la personne le demande.$t$,
      $t$Proposer un rangement court (10 minutes) en suivant les photos collées sur les meubles. S'arrêter quand c'est fait, même imparfait.$t$,
      $t$Rappeler l'heure convenue sans négocier ni confisquer : le cadre a été décidé ensemble. Proposer l'alternative choisie (musique, lecture).$t$,
      $t$Rester dans la pièce sans intervenir. Les gestes ont été appris : ne reprendre la main qu'en cas de danger immédiat.$t$,
      $t$Accompagner le début du rituel puis se retirer. Le passage du veilleur se fait porte entrouverte, comme convenu ensemble.$t$,
      $t$Poser la question ouverte « tout est prêt pour demain ? » et laisser dérouler la vérification. Ne compléter que ce qui est oublié, en le nommant.$t$
    ] as t3c,
    array['autonomie','verbal','supervision','autonomie','verbal','supervision'] as t3s,
    array['20:30','20:00','21:30','20:45','21:00','21:15'] as t3h,

    -- Domaine SANTÉ : bilans (suite du prénom) et expressions
    array[
      $t$ suit son traitement avec régularité et commence à préparer son pilulier avec l'infirmière. Les rendez-vous médicaux de l'année sont honorés.$t$,
      $t$ est en meilleure forme depuis la reprise d'une activité physique douce. Le sommeil s'est amélioré ; la vigilance reste de mise sur l'hydratation.$t$,
      $t$ parvient de mieux en mieux à dire quand quelque chose ne va pas, ce qui permet à l'équipe d'ajuster l'accompagnement sans attendre.$t$,
      $t$ a bien investi l'atelier équilibre alimentaire ; les repères sur la composition des repas commencent à être réutilisés spontanément.$t$,
      $t$ bénéficie d'un suivi médical stable. Le travail porte cette année sur l'appropriation de son parcours de soins, à son rythme.$t$,
      $t$ traverse des périodes d'anxiété qui s'apaisent plus vite qu'avant grâce aux outils co-construits (temps calme, boîte à apaisement).$t$
    ] as bs,
    array[
      $t$« Je connais mes médicaments, je veux apprendre à faire mon pilulier. »$t$,
      $t$« La marche, ça me fait du bien. »$t$,
      $t$« Quand ça va pas, maintenant je le dis. »$t$,
      $t$« Je veux manger équilibré, mais j'aime toujours autant les frites. »$t$,
      $t$« Le docteur est gentil, je n'ai plus peur d'y aller. »$t$,
      $t$« Le temps calme au retour de l'atelier, ça m'aide beaucoup. »$t$
    ] as xs,

    -- SANTÉ — objectif 1 (somatique) + tâche associée (moment variable)
    array[
      $t$S'approprier son traitement : préparer le pilulier de la semaine avec l'infirmière$t$,
      $t$Marcher trente minutes par jour pour entretenir sa forme$t$,
      $t$Penser à boire régulièrement dans la journée, surtout par temps chaud$t$,
      $t$Exprimer une douleur ou un mal-être à une personne de confiance de l'équipe$t$,
      $t$Composer une assiette équilibrée en s'appuyant sur les repères de l'atelier nutrition$t$,
      $t$Refaire chaque soir les exercices donnés par le kinésithérapeute$t$
    ] as s1o,
    array[
      $t$Préparation hebdomadaire accompagnée, photos des médicaments, explication simple du rôle de chacun$t$,
      $t$Parcours repéré autour du foyer, podomètre simple, marche accompagnée puis en binôme avec un pair$t$,
      $t$Gourde personnalisée, repères visuels aux moments clés (repas, retour d'atelier), sensibilisation en période estivale$t$,
      $t$Échelle simple de la douleur affichée dans la chambre, temps d'écoute individuel régulier, lien avec l'infirmière$t$,
      $t$Atelier nutrition mensuel, set de table repère (moitié légumes), implication dans le choix des menus au CVS$t$,
      $t$Fiche d'exercices illustrée, séance courte après le dîner, accompagnement physique léger au début$t$
    ] as s1m,
    array[
      $t$Participation active à la préparation, questions posées, bilan mensuel avec l'infirmière$t$,
      $t$Régularité sur le mois, ressenti exprimé, retour du médecin traitant$t$,
      $t$Observation quotidienne discrète, point dédié lors des fortes chaleurs$t$,
      $t$Situations où l'expression a permis d'agir tôt, notées en réunion d'équipe$t$,
      $t$Choix observés aux repas du foyer, bilan avec la diététicienne$t$,
      $t$Retour du kinésithérapeute à chaque séance hebdomadaire$t$
    ] as s1e,
    array[
      $t$Prise du traitement du matin$t$,
      $t$Marche quotidienne$t$,
      $t$Point hydratation au retour d'atelier$t$,
      $t$Temps d'échange bien-être$t$,
      $t$Composition de l'assiette du dîner$t$,
      $t$Exercices de kiné du soir$t$
    ] as t2l,
    array[
      $t$Présenter le pilulier et laisser identifier la case du jour. Vérifier la prise effective, sans commentaire si tout va bien : un sourire suffit.$t$,
      $t$Proposer la marche sur le parcours habituel. En cas de refus, proposer un créneau plus tard dans la journée sans insister.$t$,
      $t$Proposer de remplir la gourde au retour de l'ESAT. Repère simple : la gourde vidée au moins deux fois dans la journée.$t$,
      $t$Prendre cinq minutes au calme. Question ouverte : « comment tu te sens aujourd'hui ? ». Utiliser l'échelle affichée si les mots manquent.$t$,
      $t$Rappeler le repère du set de table (moitié légumes) au moment du service. Souligner les bons choix, ne jamais critiquer l'assiette.$t$,
      $t$Installer le tapis dans le coin calme. Guider avec la fiche illustrée ; l'aide physique se limite aux mouvements notés en rouge.$t$
    ] as t2c,
    array['supervision','autonomie','verbal','supervision','verbal','partiel'] as t2s,
    array['matin','matin','aprem','aprem','soir','soir'] as t2mom,
    array['08:05','07:50','17:15','16:45','19:00','20:15'] as t2h,

    -- SANTÉ — objectif 2 (bien-être psychique)
    array[
      $t$Identifier et nommer ses émotions à l'aide de la météo intérieure$t$,
      $t$Utiliser sa boîte à apaisement dans les moments de tension$t$,
      $t$Participer régulièrement au groupe d'expression du foyer$t$,
      $t$S'accorder un temps calme au retour de l'ESAT avant les temps collectifs$t$,
      $t$Solliciter un entretien avec la psychologue quand le besoin s'en fait sentir$t$,
      $t$Tenir son cahier de ressentis avec l'aide de son référent$t$
    ] as s2o,
    array[
      $t$Support météo intérieure au mur de la chambre, temps d'échange court le soir, vocabulaire des émotions travaillé en atelier$t$,
      $t$Boîte co-construite (balle, musique, photos), accessible en libre accès, équipe attentive à la proposer sans l'imposer$t$,
      $t$Rappel du créneau, place gardée dans le groupe, possibilité d'assister sans prendre la parole$t$,
      $t$Coin calme aménagé, durée choisie par la personne, respect de ce temps par tous$t$,
      $t$Modalités de demande simplifiées (carte à déposer), créneaux réguliers, relais par le référent si besoin$t$,
      $t$Cahier personnalisé, temps d'écriture ou de dessin hebdomadaire, relecture uniquement si la personne le souhaite$t$
    ] as s2m,
    array[
      $t$Utilisation spontanée du support, apaisement plus rapide$t$,
      $t$Situations apaisées sans montée en tension, retour de la personne$t$,
      $t$Présence au groupe et prises de parole, plaisir exprimé$t$,
      $t$Soirées plus sereines, fatigue mieux gérée$t$,
      $t$Demandes exprimées et suivies d'effet$t$,
      $t$Régularité du rituel et bien-être exprimé$t$
    ] as s2e,

    -- Conclusions (avec %s = prénom)
    array[
      $t$L'année écoulée confirme une belle dynamique. Les objectifs retenus sont réalistes, choisis avec %s, et seront réajustés lors du bilan intermédiaire.$t$,
      $t$Le projet s'appuie sur les souhaits exprimés lors du recueil des attentes. L'équipe reste attentive au rythme de %s : avancer sans mettre en difficulté.$t$,
      $t$Les progrès constatés encouragent %s et l'équipe à poursuivre dans la même direction, en gardant le principe du soutien juste nécessaire.$t$,
      $t$Cet avenant resserre les priorités autour d'objectifs concrets du quotidien, co-construits avec %s et réévalués ensemble tout au long du cycle.$t$,
      $t$L'ensemble des parties partage la même lecture : des acquis qui se consolident, une confiance qui grandit, des objectifs à la hauteur de ce que souhaite %s.$t$,
      $t$Le travail engagé sera suivi lors du bilan à six mois ; %s sait qu'un point d'étape est possible à tout moment, à sa demande.$t$
    ] as concl,

    -- Coches du jour : soutien réellement apporté, motifs de report (JR_MOTIFS)
    array['verbal','supervision','autonomie','verbal','partiel','supervision'] as c1s,
    array['supervision','verbal','autonomie','supervision','total','verbal'] as c2s,
    array[$t$N'a pas voulu (c'est son droit)$t$, $t$Pas le bon moment$t$, $t$Absent·e / sorti·e$t$] as motifs,

    -- Section vide au format exact de emptySection() (js/ppe.js)
    $j${"bilan":"","objectifs":[{"objectif":"","moyens":"","echeance":"","evaluation":""}],"expression":""}$j$::jsonb as empty_sec
),

-- Choix des variantes + dates relatives par résident
calc as (
  select c.*, l.*,
    1 + mod(c.rn, 6)     as i1,   -- autonomie obj 1 / bilan
    1 + mod(c.rn + 2, 6) as i2,   -- autonomie obj 2 / expression / atelier
    1 + mod(c.rn + 4, 6) as i3,   -- santé obj 1 / bilan santé
    1 + mod(c.rn + 3, 6) as i4,   -- santé obj 2 / expression santé
    mod(c.rn, 5)         as i5,   -- 3e domaine rempli (rotation)
    (current_date - (150 + mod(c.rn * 3, 21)))::date as d_redac,          -- rédaction ~5 mois avant
    (current_date - (145 + mod(c.rn * 3, 21)))::date as d_sig,            -- signatures quelques jours après
    (current_date - (150 + mod(c.rn * 3, 21) + 18 + mod(c.rn, 6)))::date as d_att,   -- recueil des attentes (avant rédaction)
    (current_date - (150 + mod(c.rn * 3, 21) + 5 + mod(c.rn, 3)))::date  as d_coco,  -- co-construction (entre attentes et rédaction)
    (current_date - (550 + mod(c.rn, 8) * 170))::date as d_esat,          -- entrée ESAT
    to_char(current_date - (150 + mod(c.rn * 3, 21)), 'YYYY-MM-DD') as d0,     -- outcomes début
    to_char(current_date - (5 + mod(c.rn, 9)), 'YYYY-MM-DD')        as dfin,   -- outcomes fin (récents)
    to_char(current_date + (30 + mod(c.rn * 7, 60)), 'YYYY-MM-DD')  as e_a1,
    to_char(current_date + (45 + mod(c.rn * 5, 75)), 'YYYY-MM-DD')  as e_a2,
    to_char(current_date + (60 + mod(c.rn * 3, 60)), 'YYYY-MM-DD')  as e_s1,
    to_char(current_date + (75 + mod(c.rn * 11, 45)), 'YYYY-MM-DD') as e_s2,
    to_char(current_date + (90 + mod(c.rn * 9, 60)), 'YYYY-MM-DD')  as e_d31,
    to_char(current_date + (100 + mod(c.rn * 13, 50)), 'YYYY-MM-DD') as e_d32,
    l.team[1 + mod(c.rn, 6)]     as referent_name,
    l.team[1 + mod(c.rn + 2, 6)] as coco_par,
    l.team[1 + mod(c.rn + 4, 6)] as c1_par,
    l.team[1 + mod(c.rn + 5, 6)] as c2_par,
    l.team[1 + mod(c.rn + 1, 6)] as c3_par,
    l.dirs[1 + mod(c.rn, 2)]     as dir_name,
    l.employeurs[1 + mod(c.rn, 3)] as employeur_txt,
    l.ateliers[1 + mod(c.rn + 2, 6)] as atelier_txt,
    coalesce(nullif(c.protection_res, ''), l.protections[1 + mod(c.rn, 4)]) as protection_txt,
    format(l.concl[1 + mod(c.rn, 6)], c.pnom) as conclusion_txt
  from res c cross join lib l
),

-- 3e domaine rempli : contenu spécifique par domaine (rotation sur i5)
d3 as (
  select c.*,
         v.d3key, v.d3presta, v.d3bilan, v.d3expr,
         v.d3o1, v.d3m1, v.d3ev1, v.d3ser1,
         v.d3o2, v.d3m2, v.d3ev2, v.d3ser2,
         v.t4lib, v.t4cons, v.t4rec, v.t4h, v.t4mom, v.t4sout
  from calc c
  join (values
    (0, 'vieSociale', '2.3.4',
     $t$ participe volontiers aux temps collectifs du foyer et commence à créer des liens à l'extérieur (sport adapté, médiathèque). Le week-end reste un temps plus isolé, sur lequel porte le travail de cette année.$t$,
     $t$« J'aime bien les soirées jeux, et j'aimerais voir mon copain de l'ESAT le samedi. »$t$,
     $t$Participer chaque semaine à une activité collective de son choix$t$,
     $t$Planning des activités présenté en début de semaine, essais sans engagement, binôme avec un pair du foyer$t$,
     $t$Régularité de la participation et plaisir exprimé$t$,
     $j$["1.3.4","2.3.4"]$j$::jsonb,
     $t$Inviter ou rejoindre un ami en dehors du foyer une fois par mois$t$,
     $t$Aide à la prise de contact, organisation du déplacement, temps d'échange léger au retour$t$,
     $t$Nombre de rencontres réalisées et envie de recommencer$t$,
     $j$["1.2.2","2.3.4"]$j$::jsonb,
     $t$Atelier jeux de société du jeudi$t$,
     $t$Proposer de choisir le jeu et d'installer la table avec un pair. Le rôle de l'équipe : veiller à ce que chacun trouve sa place, sans arbitrer à la place du groupe.$t$,
     $j${"type":"jours","jours":[4]}$j$::jsonb, '17:00', 'aprem', 'supervision'),
    (1, 'budget', '2.3.5',
     $t$ gère son argent personnel avec l'aide de l'équipe et de son mandataire. Les achats plaisir sont mieux anticipés qu'avant ; le travail porte sur la compréhension des priorités (téléphone, produits d'hygiène).$t$,
     $t$« C'est mon argent. Je veux savoir combien il me reste pour le week-end. »$t$,
     $t$Préparer et suivre son budget de la semaine avec un support visuel$t$,
     $t$Porte-monnaie compartimenté, tableau simple recettes/dépenses, point hebdomadaire avec le référent$t$,
     $t$Semaines équilibrées, sans avance exceptionnelle$t$,
     $j$["1.3.5","2.3.5"]$j$::jsonb,
     $t$Réaliser un achat courant seul, de la liste au passage en caisse$t$,
     $t$Liste imagée, repérage en magasin accompagné puis à distance, monnaie préparée à l'avance$t$,
     $t$Achats réussis et satisfaction exprimée$t$,
     $j$["1.3.5","2.3.5"]$j$::jsonb,
     $t$Point budget de la semaine$t$,
     $t$S'installer au calme avec le tableau recettes/dépenses. C'est la personne qui tient le stylo ; l'équipe reformule et sécurise, sans décider à sa place.$t$,
     $j${"type":"jours","jours":[3]}$j$::jsonb, '17:30', 'aprem', 'verbal'),
    (2, 'logement', '2.3.2',
     $t$ investit sa chambre comme un vrai chez-soi (photos, plantes). L'entretien courant progresse avec les repères mis en place ; la perspective d'un studio avec le service d'accompagnement se prépare doucement.$t$,
     $t$« Ma chambre, c'est chez moi. Plus tard je voudrais un studio, avec de l'aide au début. »$t$,
     $t$Entretenir sa chambre chaque semaine (poussières, sol, lit) avec un soutien dégressif$t$,
     $t$Matériel dédié dans le placard, créneau fixe du samedi, présence au début puis passage en fin de tâche$t$,
     $t$État de la chambre constaté ensemble, fierté exprimée$t$,
     $j$["1.3.2","2.3.2"]$j$::jsonb,
     $t$Participer à la préparation d'un repas simple en cuisine pédagogique$t$,
     $t$Recettes illustrées, atelier cuisine du samedi, gestes de sécurité appris progressivement$t$,
     $t$Recettes maîtrisées au fil des ateliers$t$,
     $j$["1.3.2","2.3.2"]$j$::jsonb,
     $t$Entretien de la chambre du samedi$t$,
     $t$Lancer le créneau du samedi matin : matériel sorti ensemble, puis laisser faire. Repasser en fin de tâche pour le regard croisé, sans refaire derrière.$t$,
     $j${"type":"jours","jours":[6]}$j$::jsonb, '10:30', 'matin', 'partiel'),
    (3, 'viePro', '2.3.3',
     $t$ reçoit de très bons retours de l'ESAT : implication régulière, entraide avec les collègues d'atelier. La fatigue de fin de semaine reste à surveiller ; un aménagement du rythme a été évoqué avec le moniteur.$t$,
     $t$« Le travail ça me plaît, surtout quand on me confie le rangement du stock. »$t$,
     $t$Préparer sereinement sa semaine de travail (affaires, rythme, sommeil)$t$,
     $t$Préparation des affaires d'atelier le dimanche, coucher avancé la veille des grosses journées, lien régulier avec le moniteur$t$,
     $t$Semaines sans retard ni épuisement, retours de l'atelier$t$,
     $j$["1.3.3","2.3.3"]$j$::jsonb,
     $t$Savoir parler de son travail et de ses envies d'évolution lors des bilans ESAT$t$,
     $t$Préparation des bilans avec le référent, support en FALC, présence soutenante en réunion$t$,
     $t$Expression directe en bilan, souhaits pris en compte$t$,
     $j$["1.3.3","2.3.3"]$j$::jsonb,
     $t$Préparation des affaires d'atelier pour la semaine$t$,
     $t$Le dimanche en fin d'après-midi, sortir ensemble la tenue de travail et vérifier le sac. Laisser cocher la check-list seul si possible.$t$,
     $j${"type":"jours","jours":[0]}$j$::jsonb, '17:30', 'aprem', 'autonomie'),
    (4, 'transport', '3.2.4',
     $t$ se déplace en confiance sur les trajets connus (foyer–ESAT). L'apprentissage d'un nouveau trajet vers le centre-ville est en cours, avec un accompagnement qui s'espace progressivement.$t$,
     $t$« Le chemin de l'ESAT, je le connais par cœur. Le bus du centre-ville, j'y arrive presque. »$t$,
     $t$Réaliser le trajet en bus vers le centre-ville avec un accompagnement dégressif$t$,
     $t$Fiche trajet imagée, carte de transport en poche, accompagnement complet puis suivi à distance, point de repli convenu$t$,
     $t$Trajets réussis et sentiment de sécurité exprimé$t$,
     $j$["1.2.3","3.2.4"]$j$::jsonb,
     $t$Savoir réagir en cas d'imprévu sur un trajet (bus manqué, détour)$t$,
     $t$Scénarios travaillés en jeu de rôle, carte avec les numéros utiles, personne relais joignable$t$,
     $t$Mises en situation réussies, sérénité exprimée$t$,
     $j$["1.2.4","3.2.4"]$j$::jsonb,
     $t$Trajet accompagné vers le centre-ville$t$,
     $t$Se placer en retrait dans le bus : c'est la personne qui gère la carte, l'arrêt et la sonnette. N'intervenir qu'à sa demande ou en cas de risque.$t$,
     $j${"type":"jours","jours":[6]}$j$::jsonb, '14:30', 'aprem', 'supervision')
  ) as v(vi, d3key, d3presta, d3bilan, d3expr,
         d3o1, d3m1, d3ev1, d3ser1,
         d3o2, d3m2, d3ev2, d3ser2,
         t4lib, t4cons, t4rec, t4h, t4mom, t4sout)
    on v.vi = c.i5
),

-- Objectifs au format exact de js/ppe.js : objectif/moyens/echeance/evaluation
-- + serafin (codes validés) + outcomes {debut|fin:{auto|pro:{v,d}}}
objs as (
  select d.*,
    jsonb_build_object(
      'objectif', d.a1o[d.i1], 'moyens', d.a1m[d.i1], 'echeance', d.e_a1, 'evaluation', d.a1e[d.i1],
      'serafin', $j$["1.2.1","2.2.1"]$j$::jsonb,
      'outcomes',
        jsonb_build_object('debut', jsonb_build_object(
          'auto', jsonb_build_object('v', 2 + mod(d.rn, 2), 'd', d.d0),
          'pro',  jsonb_build_object('v', 2, 'd', d.d0)))
        || case when mod(d.rn, 2) = 0 then
             jsonb_build_object('fin',
               jsonb_build_object('auto', jsonb_build_object('v', 4, 'd', d.dfin))
               || case when mod(d.rn, 4) = 0
                    then jsonb_build_object('pro', jsonb_build_object('v', 3, 'd', d.dfin))
                    else '{}'::jsonb end)
           else '{}'::jsonb end
    ) as obj_a1,
    jsonb_build_object(
      'objectif', d.a2o[d.i2], 'moyens', d.a2m[d.i2], 'echeance', d.e_a2, 'evaluation', d.a2e[d.i2],
      'serafin', $j$["1.2.4","2.2.1"]$j$::jsonb,
      'outcomes', jsonb_build_object('debut', jsonb_build_object(
        'auto', jsonb_build_object('v', 1 + mod(d.rn + 1, 3), 'd', d.d0),
        'pro',  jsonb_build_object('v', 2, 'd', d.d0)))
    ) as obj_a2,
    jsonb_build_object(
      'objectif', d.s1o[d.i3], 'moyens', d.s1m[d.i3], 'echeance', d.e_s1, 'evaluation', d.s1e[d.i3],
      'serafin', $j$["1.1.1","2.1.1"]$j$::jsonb,
      'outcomes', jsonb_build_object('debut', jsonb_build_object(
        'auto', jsonb_build_object('v', 3, 'd', d.d0),
        'pro',  jsonb_build_object('v', 2 + mod(d.rn, 2), 'd', d.d0)))
    ) as obj_s1,
    jsonb_build_object(
      'objectif', d.s2o[d.i4], 'moyens', d.s2m[d.i4], 'echeance', d.e_s2, 'evaluation', d.s2e[d.i4],
      'serafin', $j$["1.1.2","2.1.1"]$j$::jsonb,
      'outcomes', jsonb_build_object('debut', jsonb_build_object(
        'auto', jsonb_build_object('v', 2, 'd', d.d0),
        'pro',  jsonb_build_object('v', 1 + mod(d.rn + 1, 2), 'd', d.d0)))
    ) as obj_s2,
    jsonb_build_object(
      'objectif', d.d3o1, 'moyens', d.d3m1, 'echeance', d.e_d31, 'evaluation', d.d3ev1,
      'serafin', d.d3ser1,
      'outcomes', jsonb_build_object('debut', jsonb_build_object(
        'auto', jsonb_build_object('v', 1 + mod(d.rn, 3), 'd', d.d0),
        'pro',  jsonb_build_object('v', 2, 'd', d.d0)))
    ) as obj_d31,
    jsonb_build_object(
      'objectif', d.d3o2, 'moyens', d.d3m2, 'echeance', d.e_d32, 'evaluation', d.d3ev2,
      'serafin', d.d3ser2,
      'outcomes', jsonb_build_object('debut', jsonb_build_object(
        'auto', jsonb_build_object('v', 2 + mod(d.rn + 1, 2), 'd', d.d0),
        'pro',  jsonb_build_object('v', 2, 'd', d.d0)))
    ) as obj_d32
  from d3 d
),

-- Assemblage final : sections (9 domaines dont 3 remplis + _cycle), signatures, serafin dérivé
built as (
  select o.*,
    -- Les 9 domaines au format emptySection(), puis remplissage de 3 domaines + _cycle
    jsonb_build_object(
      'autonomie', o.empty_sec, 'sante', o.empty_sec, 'viePro', o.empty_sec,
      'logement', o.empty_sec, 'vieSociale', o.empty_sec, 'vieAffective', o.empty_sec,
      'budget', o.empty_sec, 'transport', o.empty_sec, 'orientation', o.empty_sec)
    || jsonb_build_object('autonomie', jsonb_build_object(
         'bilan', o.pnom || o.ba[o.i1],
         'objectifs', jsonb_build_array(o.obj_a1, o.obj_a2),
         'expression', o.xa[o.i2]))
    || jsonb_build_object('sante', jsonb_build_object(
         'bilan', o.pnom || o.bs[o.i3],
         'objectifs', jsonb_build_array(o.obj_s1, o.obj_s2),
         'expression', o.xs[o.i4]))
    || jsonb_build_object(o.d3key, jsonb_build_object(
         'bilan', o.pnom || o.d3bilan,
         'objectifs', jsonb_build_array(o.obj_d31, o.obj_d32),
         'expression', o.d3expr))
    || jsonb_build_object('_cycle', jsonb_build_object(
         'attentes',       jsonb_build_object('date', to_char(o.d_att, 'YYYY-MM-DD'),  'par', o.referent_name),
         'coconstruction', jsonb_build_object('date', to_char(o.d_coco, 'YYYY-MM-DD'), 'par', o.coco_par)))
    as sections_j,
    jsonb_build_object(
      'resident', o.resident_name, 'referent', o.referent_name,
      'direction', o.dir_name, 'date', to_char(o.d_sig, 'YYYY-MM-DD')) as signatures_j,
    -- Prestations dérivées des codes validés sur les objectifs (serafinDeriveAvenant)
    jsonb_build_object('prestations',
      jsonb_build_object(
        '2.2.1', jsonb_build_object('active', true, 'niveau', 2),
        '2.1.1', jsonb_build_object('active', true, 'niveau', 2 + mod(o.rn, 2)))
      || jsonb_build_object(o.d3presta, jsonb_build_object('active', true, 'niveau', 2))
    ) as serafin_j
  from objs o
),

-- 1 avenant ACTIF par résident
ins_ppe as (
  insert into public.ppe (etablissement_id, resident_id, resident_name, date_redaction, date_revision,
                          referent, protection, employeur, atelier, entree_esat, statut,
                          sections, conclusion, signatures, serafin, created_by)
  select b.etablissement_id, b.rid, b.resident_name, b.d_redac, (b.d_redac + interval '12 months')::date,
         b.referent_name, b.protection_txt, b.employeur_txt, b.atelier_txt, b.d_esat, 'actif',
         b.sections_j, b.conclusion_txt, b.signatures_j, b.serafin_j, 'seed-demo'
  from built b
  returning id, resident_id
),

-- Tâche 1 (matin, quotidienne) — reliée à l'objectif autonomie 1
ins_t1 as (
  insert into public.taches_ppa (etablissement_id, resident_id, resident_name, libelle, objectif, ppe_id,
                                 moment, heure, recurrence, consigne, soutien_attendu, actif, created_by)
  select b.etablissement_id, b.rid, b.resident_name, b.t1l[b.i1], b.a1o[b.i1], p.id,
         'matin', b.t1h[b.i1], $j${"type":"quotidien"}$j$::jsonb, b.t1c[b.i1], b.t1s[b.i1], true, 'seed-demo'
  from built b join ins_ppe p on p.resident_id = b.rid
  returning id, resident_id
),

-- Tâche 2 (moment variable, quotidienne) — reliée à l'objectif santé 1
ins_t2 as (
  insert into public.taches_ppa (etablissement_id, resident_id, resident_name, libelle, objectif, ppe_id,
                                 moment, heure, recurrence, consigne, soutien_attendu, actif, created_by)
  select b.etablissement_id, b.rid, b.resident_name, b.t2l[b.i3], b.s1o[b.i3], p.id,
         b.t2mom[b.i3], b.t2h[b.i3], $j${"type":"quotidien"}$j$::jsonb, b.t2c[b.i3], b.t2s[b.i3], true, 'seed-demo'
  from built b join ins_ppe p on p.resident_id = b.rid
  returning id, resident_id
),

-- Tâche 3 (soir, quotidienne) — reliée à l'objectif autonomie 2
ins_t3 as (
  insert into public.taches_ppa (etablissement_id, resident_id, resident_name, libelle, objectif, ppe_id,
                                 moment, heure, recurrence, consigne, soutien_attendu, actif, created_by)
  select b.etablissement_id, b.rid, b.resident_name, b.t3l[b.i2], b.a2o[b.i2], p.id,
         'soir', b.t3h[b.i2], $j${"type":"quotidien"}$j$::jsonb, b.t3c[b.i2], b.t3s[b.i2], true, 'seed-demo'
  from built b join ins_ppe p on p.resident_id = b.rid
  returning id, resident_id
),

-- Tâche 4 (HEBDOMADAIRE) — reliée au 1er objectif du 3e domaine
ins_t4 as (
  insert into public.taches_ppa (etablissement_id, resident_id, resident_name, libelle, objectif, ppe_id,
                                 moment, heure, recurrence, consigne, soutien_attendu, actif, created_by)
  select b.etablissement_id, b.rid, b.resident_name, b.t4lib, b.d3o1, p.id,
         b.t4mom, b.t4h, b.t4rec, b.t4cons, b.t4sout, true, 'seed-demo'
  from built b join ins_ppe p on p.resident_id = b.rid
  returning id, resident_id
),

-- Coches du jour — tâche 1 faite pour tous, avec le soutien réellement apporté
ins_c1 as (
  insert into public.taches_coches (etablissement_id, tache_id, date, statut, motif, soutien, par, par_id, done_at)
  select b.etablissement_id, t.id, current_date, 'fait', '', b.c1s[b.i1], b.c1_par, 'seed-demo',
         (current_date + time '08:10') + (mod(b.rn, 25) * interval '1 minute')
  from ins_t1 t join built b on b.rid = t.resident_id
  on conflict (tache_id, date) do nothing
  returning id
),

-- Tâche 2 faite pour un résident sur deux
ins_c2 as (
  insert into public.taches_coches (etablissement_id, tache_id, date, statut, motif, soutien, par, par_id, done_at)
  select b.etablissement_id, t.id, current_date, 'fait', '', b.c2s[b.i3], b.c2_par, 'seed-demo',
         (current_date + time '13:35') + (mod(b.rn, 40) * interval '1 minute')
  from ins_t2 t join built b on b.rid = t.resident_id
  where mod(b.rn, 2) = 0
  on conflict (tache_id, date) do nothing
  returning id
),

-- Tâche 3 REPORTÉE pour un résident sur trois — le refus de la personne est un droit
ins_c3 as (
  insert into public.taches_coches (etablissement_id, tache_id, date, statut, motif, soutien, par, par_id, done_at)
  select b.etablissement_id, t.id, current_date, 'reporte',
         b.motifs[1 + mod((b.rn / 3) - 1, 3)], '', b.c3_par, 'seed-demo',
         (current_date + time '20:40') + (mod(b.rn, 15) * interval '1 minute')
  from ins_t3 t join built b on b.rid = t.resident_id
  where mod(b.rn, 3) = 0
  on conflict (tache_id, date) do nothing
  returning id
)

select (select count(*) from ins_ppe) as avenants_crees,
       (select count(*) from ins_t1) + (select count(*) from ins_t2)
     + (select count(*) from ins_t3) + (select count(*) from ins_t4) as taches_creees,
       (select count(*) from ins_c1) + (select count(*) from ins_c2)
     + (select count(*) from ins_c3) as coches_du_jour;


-- ═══ MODULE OBJECTIFS PERSONNALISÉS, SERAFIN-PH, RÉGIMES & ÉVALUATIONS — contenu de démonstration ═══
--
-- À exécuter dans le Supabase SQL Editor (rôle postgres, RLS bypassée).
-- Aucune donnée en dur : tout est dérivé de public.residents (résidents factices actifs).
--
-- Ce bloc :
--   1. purge les évaluations de démo précédentes (note contenant « [démo] ») ;
--   2. met à jour residents.objectifs + residents.objectifs_suivi (2 objectifs / résident,
--      2-3 axes de travail chacun, progression 25-75 %, historique de pointage croissant) ;
--   3. met à jour residents.serafinph (4-5 prestations 2.x/3.x de SP_NOMENCLATURE, niveaux 1-4) ;
--   4. met à jour residents.regime (2 profils spécifiques allergie / texture + 1 sans porc) ;
--   5. insère 2 évaluations par résident : une MIF ancienne (~3 mois) puis une SERAFIN-PH
--      ou un Barthel récent, avec des scores complets et cohérents entre grilles.
--
-- Idempotence : les UPDATE sur residents écrasent leurs propres valeurs (rejouable) ;
-- les INSERT dans evaluations sont précédés du DELETE ciblé « [démo] ».
-- Ids d'objectifs : modèles statiques DEFAULTS.objectives de js/app.js (1 Autonomie,
-- 2 Insertion sociale, 3 Santé, 4 Scolarité/Formation, 5 Lien familial, 6 Logement).
-- Codes SERAFIN : profil résident = prestations SP_NOMENCLATURE (2.x/3.x, seule liste
-- affichée par serafinph.html) ; grille d'évaluation « serafin » = besoins 1.x (SP_BESOINS).

-- ── 1) Nettoyage des évaluations de démo précédentes ─────────────────────────
delete from public.evaluations where note like '%[démo]%';

-- ── 2) residents.objectifs + residents.objectifs_suivi ───────────────────────
with actifs as (
  select r.id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
pairs as (
  select a.id, a.rn,
    (array[1, 1, 2, 1, 3, 2])[1 + mod(a.rn, 6)] as o1,
    (array[2, 3, 5, 6, 4, 6])[1 + mod(a.rn, 6)] as o2,
    (array['Sophie', 'Karim', 'Léa', 'Ibrahima', 'Claire', 'Marc'])[1 + mod(a.rn, 6)]     as resp1,
    (array['Marc', 'Claire', 'Ibrahima', 'Sophie', 'Karim', 'Léa'])[1 + mod(a.rn + 2, 6)] as resp2,
    25 * (1 + mod(a.rn, 3))     as pa,   -- progression axe 1 de l'objectif 1
    25 * (1 + mod(a.rn + 1, 3)) as pb,   -- progression axe 2 de l'objectif 1
    25 * (1 + mod(a.rn + 2, 3)) as pc,   -- progression axe 3 (résidents pairs)
    case when mod(a.rn, 5) = 4 then 75 else 25 * (1 + mod(a.rn + 1, 3)) end as qa,  -- obj 2, axe 1
    case when mod(a.rn, 5) = 4 then 75 else 25 * (1 + mod(a.rn + 2, 3)) end as qb,  -- obj 2, axe 2
    case when mod(a.rn, 5) = 4 then 'atteint' else 'en_cours' end           as statut2,
    mod(a.rn, 3) as dj                   -- petit décalage de dates propre à chaque résident
  from actifs a
),
axes_map (obj_id, ax1, ax2, ax3) as (
  values
    (1, $t$Préparer un repas simple en autonomie$t$,
        $t$Entretenir son linge$t$,
        $t$Se déplacer seul en ville$t$),
    (2, $t$Participer à une activité collective chaque semaine$t$,
        $t$Prendre la parole dans le groupe$t$,
        $t$S'inscrire à une activité à l'extérieur du foyer$t$),
    (3, $t$Prendre son traitement sans rappel$t$,
        $t$Honorer ses rendez-vous médicaux$t$,
        $t$Pratiquer une activité physique régulière$t$),
    (4, $t$Être assidu à l'atelier ou à la formation$t$,
        $t$Terminer le module en cours$t$,
        $t$Préparer un stage en milieu ordinaire$t$),
    (5, $t$Maintenir un contact régulier avec sa famille$t$,
        $t$Préparer sereinement les visites$t$,
        $t$Exprimer son vécu après les rencontres$t$),
    (6, $t$Entretenir sa chambre au quotidien$t$,
        $t$Gérer un petit budget logement$t$,
        $t$Découvrir les démarches d'accès au logement$t$)
)
update public.residents r
set objectifs = jsonb_build_array(p.o1, p.o2),
    objectifs_suivi = jsonb_build_object(
      p.o1::text, jsonb_build_object(
        'statut', 'en_cours',
        'note', (array[
          $t$Objectif co-construit avec la personne lors de la réunion de projet ; avancées régulières. [démo]$t$,
          $t$Point d'étape réalisé : la personne se dit fière du chemin parcouru. [démo]$t$,
          $t$Rythme adapté aux souhaits de la personne ; l'équipe veille à ne rien précipiter. [démo]$t$,
          $t$Les moyens ont été réajustés avec le référent après le dernier bilan. [démo]$t$,
          $t$Belle dynamique ces dernières semaines, à consolider dans la durée. [démo]$t$,
          $t$Les proches ont été associés au point d'étape et soutiennent la démarche. [démo]$t$
        ])[1 + mod(p.rn, 6)],
        'echeance', to_char(current_date + (45 + mod(p.rn, 4) * 15), 'YYYY-MM-DD'),
        'dateMaj', to_char(now() - make_interval(days => 2 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
        'axes',
        case when mod(p.rn, 2) = 0 then
          jsonb_build_array(
            jsonb_build_object(
              'id', 'demo-' || p.o1 || '-a', 'nom', m1.ax1, 'progression', p.pa,
              'echeance', to_char(current_date + (30 + p.dj * 10), 'YYYY-MM-DD'),
              'responsable', p.resp1,
              'note', (array[
                $t$Encouragements verbaux, la personne gagne en assurance.$t$,
                $t$S'approprie peu à peu les gestes ; chaque réussite est valorisée.$t$,
                $t$A besoin d'un cadre rassurant pour se lancer, puis fait seul.$t$,
                $t$Supervision discrète, on intervient uniquement si besoin.$t$,
                $t$Étape franchie avec plaisir, envie d'aller plus loin.$t$,
                $t$Progression stable ; on maintient le rythme actuel.$t$
              ])[1 + mod(p.rn, 6)],
              'dateMaj', to_char(now() - make_interval(days => 2 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
              'histo', case p.pa
                when 25 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (16 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (9 + p.dj),  'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (3 + p.dj),  'YYYY-MM-DD'), 'p', 25))
                when 50 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (19 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (13 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (7 + p.dj),  'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 50))
                else jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (20 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (14 + p.dj), 'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (8 + p.dj),  'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 75))
              end
            ),
            jsonb_build_object(
              'id', 'demo-' || p.o1 || '-b', 'nom', m1.ax2, 'progression', p.pb,
              'echeance', to_char(current_date + (45 + p.dj * 10), 'YYYY-MM-DD'),
              'responsable', p.resp2,
              'note', (array[
                $t$Encouragements verbaux, la personne gagne en assurance.$t$,
                $t$S'approprie peu à peu les gestes ; chaque réussite est valorisée.$t$,
                $t$A besoin d'un cadre rassurant pour se lancer, puis fait seul.$t$,
                $t$Supervision discrète, on intervient uniquement si besoin.$t$,
                $t$Étape franchie avec plaisir, envie d'aller plus loin.$t$,
                $t$Progression stable ; on maintient le rythme actuel.$t$
              ])[1 + mod(p.rn + 1, 6)],
              'dateMaj', to_char(now() - make_interval(days => 3 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
              'histo', case p.pb
                when 25 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (17 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (10 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (4 + p.dj),  'YYYY-MM-DD'), 'p', 25))
                when 50 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (20 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (12 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (6 + p.dj),  'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (3 + p.dj),  'YYYY-MM-DD'), 'p', 50))
                else jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (21 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (15 + p.dj), 'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (9 + p.dj),  'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (3 + p.dj),  'YYYY-MM-DD'), 'p', 75))
              end
            ),
            jsonb_build_object(
              'id', 'demo-' || p.o1 || '-c', 'nom', m1.ax3, 'progression', p.pc,
              'echeance', to_char(current_date + (60 + p.dj * 10), 'YYYY-MM-DD'),
              'responsable', p.resp1,
              'note', (array[
                $t$Encouragements verbaux, la personne gagne en assurance.$t$,
                $t$S'approprie peu à peu les gestes ; chaque réussite est valorisée.$t$,
                $t$A besoin d'un cadre rassurant pour se lancer, puis fait seul.$t$,
                $t$Supervision discrète, on intervient uniquement si besoin.$t$,
                $t$Étape franchie avec plaisir, envie d'aller plus loin.$t$,
                $t$Progression stable ; on maintient le rythme actuel.$t$
              ])[1 + mod(p.rn + 2, 6)],
              'dateMaj', to_char(now() - make_interval(days => 4 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
              'histo', case p.pc
                when 25 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (15 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (8 + p.dj),  'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (4 + p.dj),  'YYYY-MM-DD'), 'p', 25))
                when 50 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (18 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (11 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (5 + p.dj),  'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 50))
                else jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (19 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (12 + p.dj), 'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (6 + p.dj),  'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 75))
              end
            )
          )
        else
          jsonb_build_array(
            jsonb_build_object(
              'id', 'demo-' || p.o1 || '-a', 'nom', m1.ax1, 'progression', p.pa,
              'echeance', to_char(current_date + (30 + p.dj * 10), 'YYYY-MM-DD'),
              'responsable', p.resp1,
              'note', (array[
                $t$Encouragements verbaux, la personne gagne en assurance.$t$,
                $t$S'approprie peu à peu les gestes ; chaque réussite est valorisée.$t$,
                $t$A besoin d'un cadre rassurant pour se lancer, puis fait seul.$t$,
                $t$Supervision discrète, on intervient uniquement si besoin.$t$,
                $t$Étape franchie avec plaisir, envie d'aller plus loin.$t$,
                $t$Progression stable ; on maintient le rythme actuel.$t$
              ])[1 + mod(p.rn, 6)],
              'dateMaj', to_char(now() - make_interval(days => 2 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
              'histo', case p.pa
                when 25 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (16 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (9 + p.dj),  'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (3 + p.dj),  'YYYY-MM-DD'), 'p', 25))
                when 50 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (19 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (13 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (7 + p.dj),  'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 50))
                else jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (20 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (14 + p.dj), 'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (8 + p.dj),  'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 75))
              end
            ),
            jsonb_build_object(
              'id', 'demo-' || p.o1 || '-b', 'nom', m1.ax2, 'progression', p.pb,
              'echeance', to_char(current_date + (45 + p.dj * 10), 'YYYY-MM-DD'),
              'responsable', p.resp2,
              'note', (array[
                $t$Encouragements verbaux, la personne gagne en assurance.$t$,
                $t$S'approprie peu à peu les gestes ; chaque réussite est valorisée.$t$,
                $t$A besoin d'un cadre rassurant pour se lancer, puis fait seul.$t$,
                $t$Supervision discrète, on intervient uniquement si besoin.$t$,
                $t$Étape franchie avec plaisir, envie d'aller plus loin.$t$,
                $t$Progression stable ; on maintient le rythme actuel.$t$
              ])[1 + mod(p.rn + 1, 6)],
              'dateMaj', to_char(now() - make_interval(days => 3 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
              'histo', case p.pb
                when 25 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (17 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (10 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (4 + p.dj),  'YYYY-MM-DD'), 'p', 25))
                when 50 then jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (20 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                  jsonb_build_object('d', to_char(current_date - (12 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (6 + p.dj),  'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (3 + p.dj),  'YYYY-MM-DD'), 'p', 50))
                else jsonb_build_array(
                  jsonb_build_object('d', to_char(current_date - (21 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                  jsonb_build_object('d', to_char(current_date - (15 + p.dj), 'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (9 + p.dj),  'YYYY-MM-DD'), 'p', 50),
                  jsonb_build_object('d', to_char(current_date - (3 + p.dj),  'YYYY-MM-DD'), 'p', 75))
              end
            )
          )
        end
      ),
      p.o2::text, jsonb_build_object(
        'statut', p.statut2,
        'note', (array[
          $t$Objectif co-construit avec la personne lors de la réunion de projet ; avancées régulières. [démo]$t$,
          $t$Point d'étape réalisé : la personne se dit fière du chemin parcouru. [démo]$t$,
          $t$Rythme adapté aux souhaits de la personne ; l'équipe veille à ne rien précipiter. [démo]$t$,
          $t$Les moyens ont été réajustés avec le référent après le dernier bilan. [démo]$t$,
          $t$Belle dynamique ces dernières semaines, à consolider dans la durée. [démo]$t$,
          $t$Les proches ont été associés au point d'étape et soutiennent la démarche. [démo]$t$
        ])[1 + mod(p.rn + 3, 6)],
        'echeance', to_char(current_date + (75 + mod(p.rn, 3) * 15), 'YYYY-MM-DD'),
        'dateMaj', to_char(now() - make_interval(days => 1 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
        'axes', jsonb_build_array(
          jsonb_build_object(
            'id', 'demo-' || p.o2 || '-a', 'nom', m2.ax1, 'progression', p.qa,
            'echeance', to_char(current_date + (40 + p.dj * 10), 'YYYY-MM-DD'),
            'responsable', p.resp2,
            'note', (array[
              $t$Encouragements verbaux, la personne gagne en assurance.$t$,
              $t$S'approprie peu à peu les gestes ; chaque réussite est valorisée.$t$,
              $t$A besoin d'un cadre rassurant pour se lancer, puis fait seul.$t$,
              $t$Supervision discrète, on intervient uniquement si besoin.$t$,
              $t$Étape franchie avec plaisir, envie d'aller plus loin.$t$,
              $t$Progression stable ; on maintient le rythme actuel.$t$
            ])[1 + mod(p.rn + 3, 6)],
            'dateMaj', to_char(now() - make_interval(days => 1 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
            'histo', case p.qa
              when 25 then jsonb_build_array(
                jsonb_build_object('d', to_char(current_date - (14 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                jsonb_build_object('d', to_char(current_date - (7 + p.dj),  'YYYY-MM-DD'), 'p', 0),
                jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 25))
              when 50 then jsonb_build_array(
                jsonb_build_object('d', to_char(current_date - (18 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                jsonb_build_object('d', to_char(current_date - (10 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                jsonb_build_object('d', to_char(current_date - (5 + p.dj),  'YYYY-MM-DD'), 'p', 25),
                jsonb_build_object('d', to_char(current_date - (1 + p.dj),  'YYYY-MM-DD'), 'p', 50))
              else jsonb_build_array(
                jsonb_build_object('d', to_char(current_date - (20 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                jsonb_build_object('d', to_char(current_date - (13 + p.dj), 'YYYY-MM-DD'), 'p', 50),
                jsonb_build_object('d', to_char(current_date - (7 + p.dj),  'YYYY-MM-DD'), 'p', 50),
                jsonb_build_object('d', to_char(current_date - (1 + p.dj),  'YYYY-MM-DD'), 'p', 75))
            end
          ),
          jsonb_build_object(
            'id', 'demo-' || p.o2 || '-b', 'nom', m2.ax2, 'progression', p.qb,
            'echeance', to_char(current_date + (55 + p.dj * 10), 'YYYY-MM-DD'),
            'responsable', p.resp1,
            'note', (array[
              $t$Encouragements verbaux, la personne gagne en assurance.$t$,
              $t$S'approprie peu à peu les gestes ; chaque réussite est valorisée.$t$,
              $t$A besoin d'un cadre rassurant pour se lancer, puis fait seul.$t$,
              $t$Supervision discrète, on intervient uniquement si besoin.$t$,
              $t$Étape franchie avec plaisir, envie d'aller plus loin.$t$,
              $t$Progression stable ; on maintient le rythme actuel.$t$
            ])[1 + mod(p.rn + 4, 6)],
            'dateMaj', to_char(now() - make_interval(days => 2 + p.dj), 'YYYY-MM-DD"T"HH24:MI:SS'),
            'histo', case p.qb
              when 25 then jsonb_build_array(
                jsonb_build_object('d', to_char(current_date - (15 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                jsonb_build_object('d', to_char(current_date - (8 + p.dj),  'YYYY-MM-DD'), 'p', 0),
                jsonb_build_object('d', to_char(current_date - (3 + p.dj),  'YYYY-MM-DD'), 'p', 25))
              when 50 then jsonb_build_array(
                jsonb_build_object('d', to_char(current_date - (19 + p.dj), 'YYYY-MM-DD'), 'p', 0),
                jsonb_build_object('d', to_char(current_date - (11 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                jsonb_build_object('d', to_char(current_date - (6 + p.dj),  'YYYY-MM-DD'), 'p', 25),
                jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 50))
              else jsonb_build_array(
                jsonb_build_object('d', to_char(current_date - (21 + p.dj), 'YYYY-MM-DD'), 'p', 25),
                jsonb_build_object('d', to_char(current_date - (14 + p.dj), 'YYYY-MM-DD'), 'p', 50),
                jsonb_build_object('d', to_char(current_date - (8 + p.dj),  'YYYY-MM-DD'), 'p', 50),
                jsonb_build_object('d', to_char(current_date - (2 + p.dj),  'YYYY-MM-DD'), 'p', 75))
            end
          )
        )
      )
    ),
    updated_at = now()
from pairs p
join axes_map m1 on m1.obj_id = p.o1
join axes_map m2 on m2.obj_id = p.o2
where r.id = p.id;

-- ── 3) residents.serafinph — profil prestations (codes SP_NOMENCLATURE 2.x/3.x) ──
with actifs as (
  select r.id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
)
update public.residents r
set serafinph = jsonb_build_object(
      'selected', sel.codes,
      'prestations', sel.prest,
      'dateEvaluation', to_char(current_date - (10 + mod(a.rn, 12)), 'YYYY-MM-DD'),
      'notes', (array[
        $t$Profil établi en équipe pluridisciplinaire. [démo]$t$,
        $t$Cotation revue lors de la dernière réunion de projet. [démo]$t$,
        $t$Niveaux ajustés après échange avec la personne et son référent. [démo]$t$,
        $t$Profil mis à jour au retour du bilan de santé annuel. [démo]$t$,
        $t$Cotation transmise pour information à la mandataire judiciaire. [démo]$t$
      ])[1 + mod(a.rn, 5)]
    ),
    updated_at = now()
from actifs a
cross join lateral (
  select
    case mod(a.rn, 5)
      when 0 then $j$["2.1.1","2.2.1","2.3.4","3.2.2"]$j$::jsonb
      when 1 then $j$["2.1.1","2.3.2","2.3.5","2.4.1","3.2.4"]$j$::jsonb
      when 2 then $j$["2.2.1","2.3.3","2.3.4","3.2.3"]$j$::jsonb
      when 3 then $j$["2.1.2","2.2.1","2.3.1","2.3.4","3.2.2"]$j$::jsonb
      else        $j$["2.1.1","2.2.1","2.3.2","2.3.3","2.3.5"]$j$::jsonb
    end as codes,
    case mod(a.rn, 5)
      when 0 then $j${"2.1.1":{"niveau":2},"2.2.1":{"niveau":3},"2.3.4":{"niveau":2},"3.2.2":{"niveau":1}}$j$::jsonb
      when 1 then $j${"2.1.1":{"niveau":3},"2.3.2":{"niveau":2},"2.3.5":{"niveau":3},"2.4.1":{"niveau":2},"3.2.4":{"niveau":1}}$j$::jsonb
      when 2 then $j${"2.2.1":{"niveau":2},"2.3.3":{"niveau":2},"2.3.4":{"niveau":1},"3.2.3":{"niveau":1}}$j$::jsonb
      when 3 then $j${"2.1.2":{"niveau":3},"2.2.1":{"niveau":4},"2.3.1":{"niveau":2},"2.3.4":{"niveau":2},"3.2.2":{"niveau":2}}$j$::jsonb
      else        $j${"2.1.1":{"niveau":2},"2.2.1":{"niveau":3},"2.3.2":{"niveau":3},"2.3.3":{"niveau":2},"2.3.5":{"niveau":3}}$j$::jsonb
    end as prest
) sel
where r.id = a.id;

-- ── 4) residents.regime — 2 profils spécifiques (allergie / texture) + 1 sans porc ──
with actifs as (
  select r.id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
)
update public.residents r
set regime = case
      when a.rn = 1 then
        $j${"type":"normal","autreLabel":"","texture":"normale","allergiesAlim":"Arachide et fruits à coque","notes":"PAI affiché en cuisine — vigilance sur les desserts industriels et les biscuits apéritifs. [démo]"}$j$::jsonb
      when a.rn = 2 then
        $j${"type":"diabetique","autreLabel":"","texture":"hachee","allergiesAlim":"","notes":"Texture hachée suite au bilan de déglutition ; réévaluation prévue avec l'orthophoniste le mois prochain. [démo]"}$j$::jsonb
      when a.rn = 3 then
        $j${"type":"sansporc","autreLabel":"","texture":"normale","allergiesAlim":"","notes":""}$j$::jsonb
      else
        $j${"type":"normal","autreLabel":"","texture":"normale","allergiesAlim":"","notes":""}$j$::jsonb
    end,
    updated_at = now()
from actifs a
where r.id = a.id;

-- ── 5a) Évaluations MIF anciennes (~3 mois, scores complets sur les 18 items, échelle 1-7) ──
with actifs as (
  select r.id, r.etablissement_id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
)
insert into public.evaluations (etablissement_id, resident_id, grille, date, note, scores)
select
  a.etablissement_id,
  a.id::text,
  'mif',
  current_date - (95 + mod(a.rn, 15)),
  (array[
    $t$Évaluation initiale posée sur une semaine d'observation partagée. [démo]$t$,
    $t$Passation réalisée en binôme éducateur / infirmière. [démo]$t$,
    $t$La personne a participé activement à la passation. [démo]$t$,
    $t$Évaluation servant de référence pour le projet personnalisé. [démo]$t$,
    $t$Résultats restitués à la personne lors d'un temps dédié. [démo]$t$
  ])[1 + mod(a.rn, 5)],
  jsonb_build_object(
    'alimentation',    least(7, v.b + 2),
    'toilette',        least(7, v.b + 1),
    'bain',            v.b,
    'habillage_haut',  least(7, v.b + 1),
    'habillage_bas',   v.b,
    'soins_perinee',   greatest(1, v.b - 1),
    'vesicale',        least(7, v.b + 2),
    'anale',           least(7, v.b + 2),
    'lit_chaise',      least(7, v.b + 1),
    'toilettes',       least(7, v.b + 1),
    'bain_douche',     v.b,
    'marche_fauteuil', least(7, v.b + 2),
    'escaliers',       v.b,
    'comprehension',   least(7, v.b + 1),
    'expression',      v.b,
    'interaction',     v.b,
    'resolution',      greatest(1, v.b - 1),
    'memoire',         greatest(1, v.b - 1)
  )
from actifs a
cross join lateral (select 3 + mod(a.rn, 3) as b) v;

-- ── 5b) Évaluations SERAFIN-PH récentes (besoins 1.x, échelle 0-4) — 2 résidents sur 3 ──
-- Cohérence : n = 3 - mod(rn,3) est l'inverse du niveau MIF b = 3 + mod(rn,3)
-- (plus la personne est autonome à la MIF, plus ses besoins cotés sont faibles).
with actifs as (
  select r.id, r.etablissement_id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
)
insert into public.evaluations (etablissement_id, resident_id, grille, date, note, scores)
select
  a.etablissement_id,
  a.id::text,
  'serafin',
  current_date - (3 + mod(a.rn, 10)),
  (array[
    $t$Cotation des besoins réalisée en équipe, avec la participation de la personne. [démo]$t$,
    $t$Réévaluation trimestrielle : évolution favorable sur la vie quotidienne. [démo]$t$,
    $t$Besoins réajustés après le dernier point projet. [démo]$t$,
    $t$Cotation partagée en réunion pluridisciplinaire. [démo]$t$,
    $t$Support préparé pour le prochain dialogue de gestion. [démo]$t$
  ])[1 + mod(a.rn, 5)],
  jsonb_build_object(
    '1.1.1', greatest(0, v.n - 1),
    '1.1.2', v.n,
    '1.2.1', v.n,
    '1.2.2', least(4, v.n + 1),
    '1.2.3', greatest(0, v.n - 2),
    '1.2.4', least(4, v.n + 1),
    '1.3.1', least(4, v.n + 1),
    '1.3.2', v.n,
    '1.3.3', v.n,
    '1.3.4', least(4, v.n + 1),
    '1.3.5', least(4, v.n + 1)
  )
from actifs a
cross join lateral (select 3 - mod(a.rn, 3) as n) v
where mod(a.rn, 3) in (0, 1);

-- ── 5c) Indice de Barthel récent — 1 résident sur 3 (profil le plus autonome de la MIF) ──
-- Valeurs strictement conformes aux options de la grille (0/5/10/15 selon l'item).
with actifs as (
  select r.id, r.etablissement_id, (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
)
insert into public.evaluations (etablissement_id, resident_id, grille, date, note, scores)
select
  a.etablissement_id,
  a.id::text,
  'barthel',
  current_date - (4 + mod(a.rn, 10)),
  (array[
    $t$Suivi semestriel : la personne gagne en aisance dans les gestes du quotidien. [démo]$t$,
    $t$Passation réalisée avec l'aide-soignante référente. [démo]$t$,
    $t$Résultats stables, encourageants pour le projet de semi-autonomie. [démo]$t$
  ])[1 + mod(a.rn, 3)],
  jsonb_build_object(
    'alimentation', 10,
    'bain',         5,
    'toilette',     5,
    'habillage',    case when mod(a.rn, 2) = 0 then 5 else 10 end,
    'intestin',     10,
    'vesical',      5,
    'toilettes',    10,
    'transfert',    15,
    'marche',       15,
    'escaliers',    case when mod(a.rn, 2) = 0 then 5 else 10 end
  )
from actifs a
where mod(a.rn, 3) = 2;


-- ═══ MODULE PARCOURS — échéances, admissions, visites, activités ═══
-- Démo foyer médico-social (handicap adulte). À exécuter dans le SQL Editor Supabase (rôle postgres).
-- Aucune donnée en dur : tout est dérivé de public.residents (résidents actifs, statut <> 'sorti').
-- Idempotence : les données de démo sont marquées
--   · echeances.author = 'seed-demo'          · visites.created_by = 'seed-demo'
--   · admissions.notes like '%[démo]%'        · activites.description like '%[démo]%'
-- et supprimées en tête de chaque section avant réinsertion.

-- ───────────────────────────────────────────────────────────────────
-- 1. ÉCHÉANCES ADMINISTRATIVES (3 par résident : MDPH à +2..7 mois,
--    visite médicale, CNI — dont exactement 1 en retard léger de 2 à 11 j)
--    Types = EC_TYPES de js/echeances.js : mdph / medical / identite
-- ───────────────────────────────────────────────────────────────────
delete from public.echeances where author = 'seed-demo';

-- 1a. Renouvellement de notification MDPH — toujours à venir (+2 à +7 mois)
with res as (
  select r.etablissement_id as eid, r.id::text as rid,
         trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')) as rname,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
)
insert into public.echeances (etablissement_id, type, libelle, date, resident_id, resident_name, notes, done, author)
select
  eid,
  'mdph',
  $t$Renouvellement de la notification MDPH$t$,
  (current_date + make_interval(months => 2 + mod(rn, 6)))::date,
  rid, rname,
  (array[
    $t$Prévoir la réunion de préparation avec la personne et sa mandataire. Dossier à envoyer 4 mois avant l'échéance.$t$,
    $t$Le GEVA est à actualiser avec l'équipe ; joindre le dernier bilan du projet personnalisé.$t$,
    $t$Renouvellement à anticiper : demander le certificat médical au médecin traitant.$t$,
    $t$La famille souhaite être associée à la constitution du dossier, la contacter en amont.$t$,
    $t$Premier renouvellement depuis l'entrée au foyer : prévoir un point complet avec la coordinatrice.$t$
  ])[1 + mod(rn, 5)],
  false,
  'seed-demo'
from res;

-- 1b. Visite médicale annuelle — en retard léger pour les rn pairs, sinon à venir (+10 à +79 j)
with res as (
  select r.etablissement_id as eid, r.id::text as rid,
         trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')) as rname,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
)
insert into public.echeances (etablissement_id, type, libelle, date, resident_id, resident_name, notes, done, author)
select
  eid,
  'medical',
  $t$Visite médicale annuelle$t$,
  case when mod(rn, 2) = 0
       then current_date - (2 + mod(rn, 6))          -- retard léger : 2 à 7 jours
       else current_date + (10 + mod(rn * 7, 70))
  end,
  rid, rname,
  case when mod(rn, 2) = 0
       then $t$Rendez-vous à reprogrammer rapidement : le cabinet avait annulé le créneau. Relance faite ce matin par Sophie.$t$
       else (array[
         $t$Rendez-vous à confirmer auprès du cabinet du Dr Lefèvre.$t$,
         $t$Bilan sanguin à réaliser la semaine précédente (ordonnance dans le classeur santé).$t$,
         $t$Prévoir un accompagnement en véhicule : le cabinet est en centre-ville.$t$,
         $t$Visite annuelle chez le Dr Morel. La personne préfère les rendez-vous du matin.$t$,
         $t$Penser à apporter le carnet de vaccination pour mise à jour.$t$
       ])[1 + mod(rn, 5)]
  end,
  false,
  'seed-demo'
from res;

-- 1c. Carte nationale d'identité — en retard léger pour les rn impairs, sinon à venir (+40 j à +10 mois)
with res as (
  select r.etablissement_id as eid, r.id::text as rid,
         trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')) as rname,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
)
insert into public.echeances (etablissement_id, type, libelle, date, resident_id, resident_name, notes, done, author)
select
  eid,
  'identite',
  $t$Renouvellement de la carte nationale d'identité$t$,
  case when mod(rn, 2) = 1
       then current_date - (3 + mod(rn, 9))          -- retard léger : 3 à 11 jours
       else current_date + (40 + mod(rn * 9, 260))
  end,
  rid, rname,
  case when mod(rn, 2) = 1
       then $t$Créneau biométrique en mairie à reprogrammer sans tarder, le précédent rendez-vous a dû être annulé.$t$
       else (array[
         $t$Prendre rendez-vous en mairie ; prévoir une photo d'identité récente.$t$,
         $t$La mandataire judiciaire s'occupe du dossier ; transmettre une copie au secrétariat à réception.$t$,
         $t$Pré-demande à faire en ligne avec la personne lors de l'atelier démarches administratives, avec Ibrahima.$t$,
         $t$Prévoir un accompagnement pour le rendez-vous en mairie, la personne le souhaite.$t$,
         $t$Vérifier le justificatif de domicile à demander au secrétariat.$t$
       ])[1 + mod(rn, 5)]
  end,
  false,
  'seed-demo'
from res;

-- ───────────────────────────────────────────────────────────────────
-- 2. ADMISSIONS — 2 dossiers en cours par établissement, à des étapes
--    différentes (en_attente / etude — enum ADM_STATUT_LABELS de js/admissions.js)
-- ───────────────────────────────────────────────────────────────────
delete from public.admissions where notes like '%[démo]%';

with etab as (
  select distinct r.etablissement_id as eid
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
)
insert into public.admissions
  (etablissement_id, prenom, nom, date_naissance, date_demande, date_entree,
   dossier, origine, statut, contact_nom, contact_tel, notes)
select e.eid, v.prenom, v.nom, v.date_naissance, v.date_demande, v.date_entree,
       v.dossier, v.origine, v.statut, v.contact_nom, v.contact_tel, v.notes
from etab e
cross join (values
  (
    $t$Julien$t$, $t$Perrin$t$,
    (current_date - interval '29 years' - interval '142 days')::date,
    (current_date - 9)::date,
    null::date,
    $t$Notification MDPH reçue — orientation foyer de vie$t$,
    'MDPH', 'en_attente',
    $t$Mme Perrin (mère)$t$, '06 45 12 78 30',
    $t$Dossier complet reçu. Premier contact téléphonique très positif avec la famille ; une visite de l'établissement est à programmer. [démo]$t$
  ),
  (
    $t$Awa$t$, $t$Diallo$t$,
    (current_date - interval '35 years' - interval '58 days')::date,
    (current_date - 26)::date,
    (current_date + 45)::date,
    $t$Réorientation depuis le foyer d'hébergement Les Tilleuls$t$,
    $t$Établissement$t$, 'etude',
    $t$M. Diallo (frère, tuteur familial)$t$, '07 82 14 56 09',
    $t$Visite de pré-admission réalisée : très bonne impression réciproque. Un stage d'observation de deux semaines est envisagé avant la commission d'admission. [démo]$t$
  )
) as v(prenom, nom, date_naissance, date_demande, date_entree,
       dossier, origine, statut, contact_nom, contact_tel, notes);

-- ───────────────────────────────────────────────────────────────────
-- 3. VISITES & LIENS FAMILIAUX — 3 à 4 par résident (passées / à venir),
--    familles fictives cohérentes avec le nom du résident.
--    Enums js/visites.js : type libre|mediatisee|hebergement|telephone,
--    statut prevue|realisee|annulee|absent, lien parmi VIS_LIENS.
-- ───────────────────────────────────────────────────────────────────
delete from public.visites where created_by = 'seed-demo';

-- 3a. Visite passée réalisée (il y a 3 à 14 jours) — libre ou appel téléphonique
with res as (
  select r.etablissement_id as eid, r.id::text as rid,
         trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')) as rname,
         coalesce(nullif(r.nom,''), 'Famille') as rnom,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
), p as (
  select res.*, 1 + mod(rn, 6) as li, 3 + mod(rn * 5, 12) as dj from res
)
insert into public.visites
  (etablissement_id, resident_id, resident_name, type, personne, lien,
   date, heure, lieu, notes, statut, statut_at, created_by)
select
  eid, rid, rname,
  case when mod(rn, 3) = 0 then 'telephone' else 'libre' end,
  case li
    when 1 then 'Mme ' || rnom
    when 2 then 'M. ' || rnom
    when 3 then (array[$t$Camille$t$, $t$Julie$t$, $t$Sarah$t$, $t$Manon$t$, $t$Élodie$t$, $t$Laura$t$])[1 + mod(rn, 6)] || ' ' || rnom
    when 4 then (array[$t$Thomas$t$, $t$Nicolas$t$, $t$Mehdi$t$, $t$Hugo$t$, $t$Antoine$t$, $t$Lucas$t$])[1 + mod(rn, 6)] || ' ' || rnom
    when 5 then 'Mme ' || (array[$t$Roussel$t$, $t$Lemoine$t$, $t$Garnier$t$, $t$N'Diaye$t$, $t$Fontaine$t$])[1 + mod(rn, 5)]
    else        'M. '  || (array[$t$Roussel$t$, $t$Lemoine$t$, $t$Garnier$t$, $t$N'Diaye$t$, $t$Fontaine$t$])[1 + mod(rn, 5)]
  end,
  (array[$t$Mère$t$, $t$Père$t$, $t$Sœur$t$, $t$Frère$t$, $t$Tante$t$, $t$Oncle$t$])[li],
  current_date - dj,
  (array['14:00','14:30','15:00','16:00','10:30','11:00'])[1 + mod(rn, 6)],
  case when mod(rn, 3) = 0 then ''
       else (array[$t$Salon des familles$t$, $t$Parc de l'établissement$t$, $t$Cafétéria du foyer$t$, $t$Salle d'accueil$t$])[1 + mod(rn, 4)]
  end,
  case when mod(rn, 3) = 0
       then $t$Appel joyeux, on a surtout parlé des vacances d'été à venir. La personne a raccroché le sourire aux lèvres.$t$
       else (array[
         $t$Très bon moment partagé autour d'un café au salon des familles.$t$,
         $t$Visite chaleureuse, la famille a apporté des photos du dernier repas de famille.$t$,
         $t$Échange détendu, promenade ensemble dans le parc du foyer.$t$,
         $t$La personne était ravie de montrer sa chambre et ses dernières créations d'atelier.$t$,
         $t$Bel après-midi en famille, retour au calme sans difficulté.$t$
       ])[1 + mod(rn, 5)]
  end,
  'realisee',
  now() - make_interval(days => dj),
  'seed-demo'
from p;

-- 3b. Visite passée plus ancienne (il y a 12 à 20 jours) — issues variées (réalisée / non présenté / annulée)
with res as (
  select r.etablissement_id as eid, r.id::text as rid,
         trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')) as rname,
         coalesce(nullif(r.nom,''), 'Famille') as rnom,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
), p as (
  select res.*, 1 + mod(rn + 4, 6) as li, 12 + mod(rn * 3, 9) as dj,
         case mod(rn, 5) when 2 then 'absent' when 4 then 'annulee' else 'realisee' end as st
  from res
)
insert into public.visites
  (etablissement_id, resident_id, resident_name, type, personne, lien,
   date, heure, lieu, notes, statut, statut_at, created_by)
select
  eid, rid, rname,
  'libre',
  case li
    when 1 then 'Mme ' || rnom
    when 2 then 'M. ' || rnom
    when 3 then (array[$t$Camille$t$, $t$Julie$t$, $t$Sarah$t$, $t$Manon$t$, $t$Élodie$t$, $t$Laura$t$])[1 + mod(rn + 2, 6)] || ' ' || rnom
    when 4 then (array[$t$Thomas$t$, $t$Nicolas$t$, $t$Mehdi$t$, $t$Hugo$t$, $t$Antoine$t$, $t$Lucas$t$])[1 + mod(rn + 2, 6)] || ' ' || rnom
    when 5 then 'Mme ' || (array[$t$Roussel$t$, $t$Lemoine$t$, $t$Garnier$t$, $t$N'Diaye$t$, $t$Fontaine$t$])[1 + mod(rn + 1, 5)]
    else        'M. '  || (array[$t$Roussel$t$, $t$Lemoine$t$, $t$Garnier$t$, $t$N'Diaye$t$, $t$Fontaine$t$])[1 + mod(rn + 1, 5)]
  end,
  (array[$t$Mère$t$, $t$Père$t$, $t$Sœur$t$, $t$Frère$t$, $t$Tante$t$, $t$Oncle$t$])[li],
  current_date - dj,
  (array['10:00','14:30','15:30','16:30'])[1 + mod(rn, 4)],
  (array[$t$Salon des familles$t$, $t$Cafétéria du foyer$t$, $t$Salle d'accueil$t$])[1 + mod(rn, 3)],
  case st
    when 'absent'  then $t$La famille n'a pas pu se déplacer (souci de transport). Un appel téléphonique a été proposé en remplacement, bien accueilli.$t$
    when 'annulee' then $t$Visite annulée à la demande de la famille, reprogrammée d'un commun accord.$t$
    else (array[
      $t$Visite paisible, jeux de société partagés à la cafétéria.$t$,
      $t$La famille a rencontré le référent en fin de visite pour faire le point, échange constructif.$t$,
      $t$Goûter partagé dans la bonne humeur, la personne a présenté ses camarades de l'atelier.$t$,
      $t$Moment simple et chaleureux ; la famille repart rassurée.$t$
    ])[1 + mod(rn, 4)]
  end,
  st,
  now() - make_interval(days => dj),
  'seed-demo'
from p;

-- 3c. Visite à venir (dans 2 à 14 jours) — libre / médiatisée / appel selon les résidents
with res as (
  select r.etablissement_id as eid, r.id::text as rid,
         trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')) as rname,
         coalesce(nullif(r.nom,''), 'Famille') as rnom,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
), p as (
  select res.*, 1 + mod(rn + 2, 6) as li, 2 + mod(rn * 7, 13) as dj,
         case mod(rn, 4) when 1 then 'mediatisee' when 3 then 'telephone' else 'libre' end as ty
  from res
)
insert into public.visites
  (etablissement_id, resident_id, resident_name, type, personne, lien,
   date, heure, lieu, notes, statut, created_by)
select
  eid, rid, rname,
  ty,
  case li
    when 1 then 'Mme ' || rnom
    when 2 then 'M. ' || rnom
    when 3 then (array[$t$Camille$t$, $t$Julie$t$, $t$Sarah$t$, $t$Manon$t$, $t$Élodie$t$, $t$Laura$t$])[1 + mod(rn + 3, 6)] || ' ' || rnom
    when 4 then (array[$t$Thomas$t$, $t$Nicolas$t$, $t$Mehdi$t$, $t$Hugo$t$, $t$Antoine$t$, $t$Lucas$t$])[1 + mod(rn + 3, 6)] || ' ' || rnom
    when 5 then 'Mme ' || (array[$t$Roussel$t$, $t$Lemoine$t$, $t$Garnier$t$, $t$N'Diaye$t$, $t$Fontaine$t$])[1 + mod(rn + 2, 5)]
    else        'M. '  || (array[$t$Roussel$t$, $t$Lemoine$t$, $t$Garnier$t$, $t$N'Diaye$t$, $t$Fontaine$t$])[1 + mod(rn + 2, 5)]
  end,
  (array[$t$Mère$t$, $t$Père$t$, $t$Sœur$t$, $t$Frère$t$, $t$Tante$t$, $t$Oncle$t$])[li],
  current_date + dj,
  case ty when 'telephone' then '18:30' else (array['14:00','14:30','15:00','16:00'])[1 + mod(rn, 4)] end,
  case ty
    when 'telephone'  then ''
    when 'mediatisee' then $t$Salle d'accueil$t$
    else (array[$t$Salon des familles$t$, $t$Parc de l'établissement$t$, $t$Cafétéria du foyer$t$])[1 + mod(rn, 3)]
  end,
  case ty
    when 'mediatisee' then $t$Visite en présence d'un membre de l'équipe, conformément au cadre défini. Léa se rend disponible.$t$
    when 'telephone'  then $t$Appel prévu en début de soirée, après le retour d'activité. Prévoir le téléphone du salon.$t$
    else (array[
      $t$La personne attend cette visite avec impatience, l'évoquer au petit-déjeuner.$t$,
      $t$Prévoir le salon des familles ; un gâteau sera préparé la veille à l'atelier cuisine.$t$,
      $t$La famille souhaite rencontrer le référent en fin de visite pour un point sur le projet.$t$,
      $t$Visite habituelle du week-end, la famille apporte les affaires de saison.$t$
    ])[1 + mod(rn, 4)]
  end,
  'prevue',
  'seed-demo'
from p;

-- 3d. Hébergement famille à venir (week-end, 1 résident sur 2)
with res as (
  select r.etablissement_id as eid, r.id::text as rid,
         trim(coalesce(r.prenom,'') || ' ' || coalesce(r.nom,'')) as rname,
         coalesce(nullif(r.nom,''), 'Famille') as rnom,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
), p as (
  select res.*, 5 + mod(rn * 3, 10) as dj from res where mod(rn, 2) = 0
)
insert into public.visites
  (etablissement_id, resident_id, resident_name, type, personne, lien,
   date, heure, date_retour, heure_retour, lieu, notes, statut, created_by)
select
  eid, rid, rname,
  'hebergement',
  'M. et Mme ' || rnom,
  $t$Parents$t$,
  current_date + dj,
  '10:00',
  current_date + dj + 2,
  '18:00',
  $t$Domicile familial$t$,
  (array[
    $t$Week-end en famille : préparer le pilulier et la fiche de liaison. Retour dimanche en fin d'après-midi.$t$,
    $t$Séjour à la maison très attendu ; penser aux affaires de rechange et au traitement du soir.$t$,
    $t$Hébergement habituel du mois. La famille rappellera si besoin, coordonnées dans le classeur.$t$
  ])[1 + mod(rn, 3)],
  'prevue',
  'seed-demo'
from p;

-- ───────────────────────────────────────────────────────────────────
-- 4. ACTIVITÉS — catalogue hebdomadaire de l'établissement (11 activités,
--    catégories/jours = ACT_CATEGORIES et ACT_JOURS de js/activites.js).
--    Les inscriptions vivent sur residents.activites (non touché ici).
-- ───────────────────────────────────────────────────────────────────
delete from public.activites where description like '%[démo]%';

with etab as (
  select distinct r.etablissement_id as eid
  from public.residents r
  where coalesce(r.statut,'') <> 'sorti'
)
insert into public.activites
  (etablissement_id, nom, categorie, jour, heure_debut, heure_fin, lieu, animateur, places_max, description, actif)
select e.eid, v.nom, v.categorie, v.jour, v.hd, v.hf, v.lieu, v.animateur, v.places, v.description, true
from etab e
cross join (values
  ($t$Gym douce$t$, 'sportive', 'Lundi', '10:30', '11:15', $t$Salle polyvalente$t$, $t$Karim$t$, 10,
   $t$Réveil corporel en douceur : étirements, équilibre et jeux de ballon adaptés au rythme de chacun. [démo]$t$),
  ($t$Atelier cuisine$t$, 'autonomie', 'Mardi', '10:00', '11:30', $t$Cuisine pédagogique$t$, $t$Sophie$t$, 6,
   $t$Préparation d'une recette simple choisie ensemble, du marché à la dégustation. [démo]$t$),
  ($t$Chorale du foyer$t$, 'creative', 'Mardi', '17:00', '18:00', $t$Salle polyvalente$t$, $t$Claire$t$, 15,
   $t$Répertoire choisi par les participants ; on prépare le concert de la fête d'été. [démo]$t$),
  ($t$Piscine$t$, 'sportive', 'Mercredi', '09:30', '11:00', $t$Piscine intercommunale$t$, $t$Karim$t$, 5,
   $t$Séance en petit groupe, ligne d'eau réservée. Préparer le sac de piscine la veille. [démo]$t$),
  ($t$Atelier peinture$t$, 'creative', 'Mercredi', '14:00', '16:00', $t$Salle d'activités$t$, $t$Léa$t$, 8,
   $t$Expression libre autour de la couleur ; les œuvres décorent le hall de l'établissement. [démo]$t$),
  ($t$Médiathèque$t$, 'culturelle', 'Jeudi', '14:30', '16:00', $t$Médiathèque municipale$t$, $t$Ibrahima$t$, 5,
   $t$Emprunt de livres, de musique et de films, puis temps calme de lecture sur place. [démo]$t$),
  ($t$Groupe d'expression$t$, 'citoyennete', 'Jeudi', '17:00', '18:00', $t$Salle de réunion$t$, $t$Marc$t$, 12,
   $t$Temps de parole sur la vie du foyer : propositions, météo du groupe, préparation du CVS. [démo]$t$),
  ($t$Marché du vendredi$t$, 'sortie', 'Vendredi', '09:30', '11:30', $t$Marché du centre-ville$t$, $t$Sophie$t$, 6,
   $t$Courses pour l'atelier cuisine et plaisir de flâner ; chacun tient son porte-monnaie. [démo]$t$),
  ($t$Jardin partagé$t$, 'autonomie', 'Samedi', '10:00', '11:30', $t$Jardin du foyer$t$, $t$Nadia$t$, 8,
   $t$Semis, arrosage et récoltes de saison ; les herbes aromatiques rejoignent la cuisine. [démo]$t$),
  ($t$Jeux de société$t$, 'autre', 'Dimanche', '15:00', '17:00', $t$Salon commun$t$, $t$Équipe du week-end$t$, 0,
   $t$Après-midi jeux ouvert à tous, dans la bonne humeur ; chocolat chaud en hiver. [démo]$t$),
  ($t$Sortie bowling$t$, 'sortie', 'Ponctuel', '18:00', '20:30', $t$Bowling de la zone commerciale$t$, $t$Marc$t$, 7,
   $t$Soirée conviviale du mois, suivie d'une collation sur place. Inscription auprès de Marc. [démo]$t$)
) as v(nom, categorie, jour, hd, hf, lieu, animateur, places, description);


-- ═══ MODULE VIE SOCIALE — SATISFACTION · CVS · RÉPERTOIRE ═══
-- Contenu de démonstration pour un foyer médico-social (handicap adulte).
-- À exécuter dans le Supabase SQL Editor (rôle postgres, RLS bypassée).
--
-- Principes :
--   • Aucun id ni etablissement_id en dur : tout part de public.residents
--     (résidents actifs = coalesce(statut,'') <> 'sorti').
--   • Marqueurs d'idempotence :
--       - satisfaction : lien_resident contient '[démo]' (jamais affiché quand
--         resident_id est renseigné → invisible dans l'UI) ;
--       - repertoire   : notes se terminent par '[démo]' (visible seulement dans
--         le modal d'édition) ;
--       - cvs          : upsert sur la PK etablissement_id → la ligne est
--         entièrement REMPLACÉE (ids internes préfixés 'seedcvs-').
--   • Dates relatives à current_date, étalées sur ~3 semaines.
--
-- Ordre du bloc : satisfaction d'abord (le module CVS lit les questionnaires
-- pour ses scores), puis cvs, puis repertoire.


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) SATISFACTION — une enquête, un questionnaire par résident actif
--    reponses = { questionId: note 0-4 } (ids de SAT_QUESTIONS, js/satisfaction.js)
--    La question 'communication' (famille) n'est renseignée que lorsque le
--    répondant est un proche. La restauration est volontairement un peu plus
--    basse (~56 %) pour alimenter la thématique CVS « restauration ».
-- ─────────────────────────────────────────────────────────────────────────────

delete from public.satisfaction where lien_resident like '%[démo]%';

with actifs as (
  select r.*,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
prep as (
  select a.*,
         (array['Résident','Résident','Mère','Résident','Frère','Résident'])[1 + mod(a.rn, 6)] as lien
  from actifs a
)
insert into public.satisfaction
  (etablissement_id, repondant, lien_resident, resident_id, date, commentaire, reponses)
select
  p.etablissement_id,
  case p.lien
    when 'Mère'  then trim($t$Mme $t$ || coalesce(p.nom, ''))
    when 'Frère' then trim($t$M. $t$  || coalesce(p.nom, ''))
    else trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, ''))
  end,
  p.lien || ' [démo]',
  p.id::text,
  current_date - (3 + mod(p.rn * 2, 15)),
  (array[
    $t$Je me sens bien ici, l'équipe m'écoute quand quelque chose ne va pas. J'aimerais plus de choix au dîner.$t$,
    $t$Les sorties du samedi me plaisent beaucoup, surtout la piscine et le marché.$t$,
    $t$Nous remercions l'équipe pour son accueil chaleureux. Un point d'amélioration : des nouvelles un peu plus régulières entre deux rendez-vous.$t$,
    $t$$t$,
    $t$Mon frère est bien entouré et participe davantage aux activités qu'avant. Merci à toute l'équipe pour son travail.$t$,
    $t$Je fais partie du CVS et je trouve qu'on tient vraiment compte de notre avis.$t$
  ])[1 + mod(p.rn, 6)],
  (
    jsonb_build_object(
      'accueil',        3 + mod(p.rn, 2),
      'chambre',        2 + mod(p.rn + 1, 3),
      'parties_com',    2 + mod(p.rn, 3),
      'repas_qualite',  1 + mod(p.rn, 3),
      'repas_quantite', 2 + mod(p.rn + 2, 2),
      'activites',      2 + mod(p.rn + 1, 3),
      'respect',        3 + mod(p.rn + 1, 2),
      'disponibilite',  2 + mod(p.rn, 3),
      'soins',          3 + mod(p.rn, 2),
      'securite',       3 + mod(p.rn + 1, 2),
      'global',         3 + mod(p.rn, 2)
    )
    || case when p.lien <> 'Résident'
            then jsonb_build_object('communication', 2 + mod(p.rn, 2))
            else '{}'::jsonb
       end
  )
from prep p;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) CVS — une ligne jsonb par établissement (PK etablissement_id)
--    data = { membres, seances, thematiques } (formats de js/cvs.js :
--    saveMembre / saveSeance / addResolution / saveThematique).
--    3 résidents élus (2 titulaires + 1 suppléant) + familles, personnel,
--    direction, personne qualifiée. 2 séances : une passée (compte-rendu +
--    3 résolutions), une planifiée. 2 thématiques reliées aux scores de
--    satisfaction (catIds de CVS_SAT_CATS).
--    ⚠ L'upsert REMPLACE le contenu CVS existant de l'établissement.
-- ─────────────────────────────────────────────────────────────────────────────

with actifs as (
  select r.*,
         (row_number() over (partition by r.etablissement_id order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
elus as (
  select * from actifs where rn <= 3
),
agg as (
  select
    e.etablissement_id,
    jsonb_agg(
      jsonb_build_object(
        'id',          'seedcvs-mres-' || e.rn,
        'nom',         trim(coalesce(e.nom, '') || ' ' || coalesce(e.prenom, '')),
        'college',     'residents',
        'residentId',  e.id::text,
        'role',        case when e.rn = 3 then 'suppleant' else 'titulaire' end,
        'contact',     '',
        'mandatDebut', to_char(current_date - interval '8 months', 'YYYY-MM-DD'),
        'mandatFin',   to_char(current_date + interval '28 months', 'YYYY-MM-DD'),
        'statut',      'actif',
        'createdAt',   to_char((now() - interval '8 months') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) order by e.rn
    ) as membres_res,
    string_agg(trim(coalesce(e.nom, '') || ' ' || coalesce(e.prenom, '')), ', ' order by e.rn) as noms_elus,
    max(trim(coalesce(e.nom, '') || ' ' || coalesce(e.prenom, ''))) filter (where e.rn = 1) as elu1
  from elus e
  group by e.etablissement_id
)
insert into public.cvs (etablissement_id, data, updated_at)
select
  a.etablissement_id,
  jsonb_build_object(

    'membres',
    a.membres_res || jsonb_build_array(
      jsonb_build_object(
        'id', 'seedcvs-mfam1', 'nom', $t$Mme Josiane Ferrand$t$, 'college', 'familles',
        'residentId', '', 'role', 'titulaire', 'contact', '06 52 18 47 93',
        'mandatDebut', to_char(current_date - interval '8 months', 'YYYY-MM-DD'),
        'mandatFin',   to_char(current_date + interval '28 months', 'YYYY-MM-DD'),
        'statut', 'actif',
        'createdAt', to_char((now() - interval '8 months') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      jsonb_build_object(
        'id', 'seedcvs-mfam2', 'nom', $t$M. Bernard Chauvel$t$, 'college', 'familles',
        'residentId', '', 'role', 'suppleant', 'contact', '06 81 34 09 27',
        'mandatDebut', to_char(current_date - interval '8 months', 'YYYY-MM-DD'),
        'mandatFin',   to_char(current_date + interval '28 months', 'YYYY-MM-DD'),
        'statut', 'actif',
        'createdAt', to_char((now() - interval '8 months') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      jsonb_build_object(
        'id', 'seedcvs-mper1', 'nom', $t$Sophie Marchal$t$, 'college', 'personnel',
        'residentId', '', 'role', 'titulaire', 'contact', '',
        'mandatDebut', to_char(current_date - interval '8 months', 'YYYY-MM-DD'),
        'mandatFin',   to_char(current_date + interval '28 months', 'YYYY-MM-DD'),
        'statut', 'actif',
        'createdAt', to_char((now() - interval '8 months') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      jsonb_build_object(
        'id', 'seedcvs-mper2', 'nom', $t$Ibrahima Diallo$t$, 'college', 'personnel',
        'residentId', '', 'role', 'suppleant', 'contact', '',
        'mandatDebut', to_char(current_date - interval '8 months', 'YYYY-MM-DD'),
        'mandatFin',   to_char(current_date + interval '28 months', 'YYYY-MM-DD'),
        'statut', 'actif',
        'createdAt', to_char((now() - interval '8 months') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      jsonb_build_object(
        'id', 'seedcvs-mdir1', 'nom', $t$Karim Bensaïd$t$, 'college', 'direction',
        'residentId', '', 'role', 'titulaire', 'contact', '',
        'mandatDebut', '', 'mandatFin', '', 'statut', 'actif',
        'createdAt', to_char((now() - interval '8 months') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      jsonb_build_object(
        'id', 'seedcvs-mext1', 'nom', $t$Claire Vasseur$t$, 'college', 'exterieur',
        'residentId', '', 'role', 'titulaire', 'contact', '',
        'mandatDebut', '', 'mandatFin', '', 'statut', 'actif',
        'createdAt', to_char((now() - interval '8 months') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    ),

    'seances',
    jsonb_build_array(
      -- Séance passée (J-15) : compte-rendu complet + 3 résolutions
      jsonb_build_object(
        'id',    'seedcvs-s1',
        'date',  to_char(current_date - interval '15 days', 'YYYY-MM-DD'),
        'heure', '14:30',
        'lieu',  $t$Salle d'activités du rez-de-chaussée$t$,
        'ordreDuJour',
          $t$1. Approbation du compte-rendu de la séance précédente$t$ || chr(10) ||
          $t$2. Résultats de l'enquête de satisfaction$t$ || chr(10) ||
          $t$3. Restauration : variété des menus$t$ || chr(10) ||
          $t$4. Programme des sorties de l'été$t$ || chr(10) ||
          $t$5. Questions diverses$t$,
        'presents',
          $t$Résidents élus : $t$ || a.noms_elus || chr(10) ||
          $t$Familles : Mme Josiane Ferrand (titulaire)$t$ || chr(10) ||
          $t$Personnel : Sophie Marchal, éducatrice spécialisée$t$ || chr(10) ||
          $t$Direction : Karim Bensaïd, directeur$t$ || chr(10) ||
          $t$Invitée : Claire Vasseur, personne qualifiée$t$,
        'excuses',
          $t$M. Bernard Chauvel (collège familles) — Ibrahima Diallo (collège personnel)$t$,
        'compteRendu',
          $t$La séance est ouverte à 14h35. La présidence de séance est assurée par $t$ || coalesce(a.elu1, $t$un résident élu$t$) ||
          $t$ (collège des résidents). Le compte-rendu de la séance précédente est approuvé à l'unanimité des membres présents.$t$ || chr(10) || chr(10) ||
          $t$1. Enquête de satisfaction — Sophie Marchal présente les résultats du questionnaire renseigné par les résidents et plusieurs familles. Les points forts sont le respect et l'écoute de l'équipe ainsi que le sentiment de sécurité. La restauration ressort en revanche comme le principal point de vigilance.$t$ || chr(10) || chr(10) ||
          $t$2. Restauration — Les élus résidents confirment le souhait de menus plus variés le soir et proposent le retour des repas à thème. Après échanges, le conseil décide de créer une commission des menus associant le cuisinier et les résidents volontaires ; elle se réunira une fois par mois.$t$ || chr(10) || chr(10) ||
          $t$3. Sorties de l'été — Le programme des sorties est présenté et accueilli favorablement. Les membres demandent qu'il soit affiché chaque lundi dans le hall afin que chacun puisse s'inscrire à temps.$t$ || chr(10) || chr(10) ||
          $t$4. Questions diverses — Un banc supplémentaire est souhaité dans le jardin, côté ombragé ; la direction étudiera la faisabilité. La date de la prochaine séance est fixée au $t$ ||
          to_char(current_date + interval '12 days', 'DD/MM/YYYY') ||
          $t$. La séance est levée à 16h10.$t$,
        'resolutions',
        jsonb_build_array(
          jsonb_build_object(
            'id', 'seedcvs-r1',
            'texte', $t$Mettre en place une commission des menus avec le cuisinier, ouverte aux résidents volontaires (une réunion par mois)$t$,
            'responsable', $t$Sophie Marchal$t$,
            'echeance', to_char(current_date + interval '20 days', 'YYYY-MM-DD'),
            'statut', 'en_cours'
          ),
          jsonb_build_object(
            'id', 'seedcvs-r2',
            'texte', $t$Afficher le programme des sorties du week-end dans le hall chaque lundi$t$,
            'responsable', $t$Léa Toussaint$t$,
            'echeance', to_char(current_date - interval '5 days', 'YYYY-MM-DD'),
            'statut', 'fait'
          ),
          jsonb_build_object(
            'id', 'seedcvs-r3',
            'texte', $t$Étudier l'installation d'un banc supplémentaire dans le jardin, côté ombragé$t$,
            'responsable', $t$Karim Bensaïd$t$,
            'echeance', to_char(current_date + interval '35 days', 'YYYY-MM-DD'),
            'statut', 'a_faire'
          )
        ),
        'createdAt', to_char((now() - interval '20 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),

      -- Séance planifiée (J+12) : ordre du jour seulement
      jsonb_build_object(
        'id',    'seedcvs-s2',
        'date',  to_char(current_date + interval '12 days', 'YYYY-MM-DD'),
        'heure', '14:30',
        'lieu',  $t$Salle d'activités du rez-de-chaussée$t$,
        'ordreDuJour',
          $t$1. Suivi des résolutions de la dernière séance$t$ || chr(10) ||
          $t$2. Premier retour de la commission des menus$t$ || chr(10) ||
          $t$3. Préparation de la fête de l'établissement$t$ || chr(10) ||
          $t$4. Aménagement du jardin : point d'étape$t$ || chr(10) ||
          $t$5. Questions diverses$t$,
        'presents', '',
        'excuses', '',
        'compteRendu', '',
        'resolutions', jsonb_build_array(),
        'createdAt', to_char((now() - interval '3 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    ),

    'thematiques',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'seedcvs-t1',
        'titre', $t$Qualité et variété des repas$t$,
        'description', $t$Point de vigilance identifié par l'enquête de satisfaction. Suivi engagé avec la commission des menus et le cuisinier : menus du soir plus variés, retour des repas à thème.$t$,
        'catIds', jsonb_build_array('restauration'),
        'priorite', 'haute',
        'statut', 'en_cours',
        'seanceId', 'seedcvs-s1',
        'createdAt', to_char((now() - interval '15 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      jsonb_build_object(
        'id', 'seedcvs-t2',
        'titre', $t$Affichage des sorties du week-end$t$,
        'description', $t$Demande portée par les élus résidents : le programme des sorties est désormais affiché chaque lundi dans le hall, avec les modalités d'inscription.$t$,
        'catIds', jsonb_build_array('activites'),
        'priorite', 'normale',
        'statut', 'resolu',
        'seanceId', 'seedcvs-s1',
        'createdAt', to_char((now() - interval '15 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    )
  ),
  now()
from agg a
on conflict (etablissement_id)
do update set data = excluded.data, updated_at = now();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) RÉPERTOIRE — 8 contacts partenaires par établissement
--    (tutelles/curatelles, médecin traitant, kiné, MDPH, pharmacie, CMP,
--    transport adapté). Coordonnées entièrement fictives.
-- ─────────────────────────────────────────────────────────────────────────────

delete from public.repertoire where notes like '%[démo]%';

insert into public.repertoire
  (etablissement_id, organisme, nom, tel, email, fonction, adresse, notes)
select e.etablissement_id, c.organisme, c.nom, c.tel, c.email, c.fonction, c.adresse, c.notes
from (
  select distinct r.etablissement_id
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
) e
cross join (
  values
    ($t$UDAF — Service des tutelles$t$, $t$Mme Isabelle Rocher$t$, $t$01 48 30 12 45$t$,
     $t$i.rocher@udaf-tutelles.example$t$, $t$Déléguée mandataire judiciaire$t$,
     $t$12 rue des Coquetiers$t$,
     $t$Curatrice de plusieurs résidents — joindre le secrétariat de préférence le matin. [démo]$t$),

    ($t$ATVAL Protection juridique$t$, $t$M. Pascal Berthier$t$, $t$01 41 60 27 38$t$,
     $t$p.berthier@atval-protection.example$t$, $t$Mandataire judiciaire à la protection des majeurs$t$,
     $t$4 avenue de la République$t$,
     $t$Tuteur — préférer le contact par mail, permanence téléphonique le jeudi après-midi. [démo]$t$),

    ($t$Cabinet médical des Tilleuls$t$, $t$Dr Anne Salager$t$, $t$01 48 47 65 20$t$,
     $t$secretariat@cabinet-tilleuls.example$t$, $t$Médecin traitant$t$,
     $t$28 allée des Tilleuls$t$,
     $t$Médecin traitant de la majorité des résidents — visites sur site possibles le mardi après-midi. [démo]$t$),

    ($t$Cabinet de kinésithérapie Vergnaud$t$, $t$M. Julien Vergnaud$t$, $t$06 74 21 58 09$t$,
     $t$j.vergnaud.kine@cabinet-vergnaud.example$t$, $t$Masseur-kinésithérapeute$t$,
     $t$3 place du Marché$t$,
     $t$Séances au foyer le lundi et le jeudi en fin de matinée. [démo]$t$),

    ($t$MDPH$t$, $t$Mme Nadia Belkacem$t$, $t$01 43 93 86 00$t$,
     $t$n.belkacem@mdph.example$t$, $t$Référente parcours$t$,
     $t$2 boulevard du Colonel Fabien$t$,
     $t$Suivi des renouvellements d'orientation et des dossiers PCH — prévoir 4 mois de délai. [démo]$t$),

    ($t$Pharmacie du Parc$t$, $t$M. Éric Fontaine$t$, $t$01 48 32 74 51$t$,
     $t$contact@pharmacieduparc.example$t$, $t$Pharmacien$t$,
     $t$45 rue du Parc$t$,
     $t$Prépare les piluliers hebdomadaires — livraison au foyer le vendredi matin. [démo]$t$),

    ($t$CMP Adultes$t$, $t$Dr Paul Weiss$t$, $t$01 48 96 33 12$t$,
     $t$cmp.adultes@ghu.example$t$, $t$Psychiatre référent$t$,
     $t$17 rue Pasteur$t$,
     $t$Consultations mensuelles — coordination avec l'infirmière du foyer avant chaque rendez-vous. [démo]$t$),

    ($t$Mobilité Plus — transport adapté$t$, $t$Mme Carole Dumont$t$, $t$01 70 22 48 66$t$,
     $t$reservation@mobiliteplus.example$t$, $t$Chargée de réservation$t$,
     $t$8 rue des Frères Lumière$t$,
     $t$Réserver les trajets 48 h à l'avance — véhicules TPMR. [démo]$t$)
) as c(organisme, nom, tel, email, fonction, adresse, notes);

-- ═══ FIN MODULE VIE SOCIALE ═══


-- ═══ MODULE PLANNING / AGENDA — contenu de démonstration ═══
-- Table touchée : public.planning_events (UNIQUEMENT).
--
-- ▸ Exécution : Supabase SQL Editor (rôle postgres, RLS bypassée). Aucun id ni
--   etablissement_id en dur : tout est dérivé de public.residents (résidents actifs,
--   coalesce(statut,'') <> 'sorti').
--
-- ▸ Marqueur de démo / idempotence : la table planning_events n'a ni colonne author ni
--   created_by → le marqueur est porté par recur_id (préfixe 'seed-demo'). Le DELETE
--   ci-dessous rend le script rejouable sans doublons.
--   Effet de bord mineur assumé : sur un événement ponctuel de démo, la fiche affiche un
--   bouton « ↻ Série (1) » (planning.js montre ce bouton dès que recurId existe) ;
--   supprimer « la série » revient à supprimer ce seul événement — sans conséquence.
--
-- ▸ sante_rdv_id volontairement NULL : la synchronisation d'un RDV vers la fiche du
--   résident (residents.sante.rdv) est faite par l'application à la saisie
--   (syncEventToResidentRdv) ; les RDV de démo vivent uniquement dans l'agenda,
--   la fiche santé n'est pas modifiée par ce script.
--
-- ▸ documents_resident : volontairement NON peuplée. Cette table référence des fichiers
--   réels du bucket Storage ; y insérer de faux chemins créerait des liens de
--   téléchargement morts dans l'UI. Aucune donnée de démo documentaire ici.
--
-- ▸ Formats vérifiés dans js/planning.js + js/planning-supabase.js + planning.html :
--   type  ∈ activite|rdv|sortie|reunion|avenant|projet|evaluation|autre|vehicule
--   duree ∈ '30'|'60'|'90'|'120'|'180'|'journee'   heure 'HH:MM'   date texte 'YYYY-MM-DD'
--   recur_freq ∈ daily|weekly|biweekly|monthly     color '' → couleur par défaut du type
--   resident_ids / resident_names : jsonb '[]' (événements mono-résident)

begin;

-- ── 0) Nettoyage des données de démo précédentes ─────────────────────────────
delete from public.planning_events
where recur_id like 'seed-demo%';

-- ── 1) RENDEZ-VOUS MÉDICAUX — 2 par résident (1 passé, 1 à venir) ────────────
with base as (
  select r.id, r.etablissement_id,
         btrim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as full_name,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
v as (
  select
    array[
      $t$Consultation médecin traitant$t$,
      $t$Rendez-vous dentaire$t$,
      $t$Séance de kinésithérapie$t$,
      $t$Consultation au CMP$t$,
      $t$Rendez-vous ophtalmologique$t$,
      $t$Bilan podologique$t$
    ] as titres,
    array[
      $t$Cabinet du Dr Fabre, 8 rue de la République$t$,
      $t$Cabinet dentaire des Tilleuls$t$,
      $t$Cabinet de kinésithérapie, 12 rue des Lilas$t$,
      $t$CMP de secteur$t$,
      $t$Centre ophtalmologique du centre-ville$t$,
      $t$Cabinet de podologie, place du Marché$t$
    ] as lieux,
    array[
      $t$Suivi médical habituel. Accompagnement par Karim ; prévoir la carte vitale et la carte de mutuelle.$t$,
      $t$Contrôle annuel. Sophie accompagne et reste présente pendant le soin si la personne le souhaite.$t$,
      $t$Séance de rééducation dans le cadre du suivi kiné. Prévoir une tenue souple. Accompagnement par Ibrahima.$t$,
      $t$Rendez-vous de suivi avec l'équipe du CMP. Léa accompagne ; un temps calme est prévu au retour.$t$,
      $t$Contrôle de la vue et renouvellement éventuel des lunettes. Accompagnement par Claire.$t$,
      $t$Soin des pieds et conseils de chaussage. Accompagnement par Marc.$t$
    ] as descs,
    array['09:00','10:15','11:00','14:00','15:30','16:15'] as heures,
    array['30','60','30','60','60','30'] as durees
)
insert into public.planning_events
  (etablissement_id, titre, resident_id, resident_name, type, date, heure, duree,
   color, description, lieu, recur_id, recur_freq, recur_until, resident_ids, resident_names)
select
  b.etablissement_id,
  (v.titres)[1 + mod(b.rn * 5 + k.k, array_length(v.titres, 1))],
  b.id::text,
  b.full_name,
  'rdv',
  to_char(case when k.k = 1
               then current_date - (3 + mod(b.rn, 9))          -- RDV passé (J-3 à J-11)
               else current_date + (2 + mod(b.rn * 2, 12)) end -- RDV à venir (J+2 à J+13)
          , 'YYYY-MM-DD'),
  (v.heures)[1 + mod(b.rn * 5 + k.k * 2, array_length(v.heures, 1))],
  (v.durees)[1 + mod(b.rn + k.k, array_length(v.durees, 1))],
  '',
  (v.descs)[1 + mod(b.rn * 5 + k.k, array_length(v.descs, 1))],
  (v.lieux)[1 + mod(b.rn * 5 + k.k, array_length(v.lieux, 1))],
  'seed-demo-rdv-' || b.id::text || '-' || k.k,
  null, null,
  '[]'::jsonb, '[]'::jsonb
from base b
cross join v
cross join generate_series(1, 2) as k(k);

-- ── 2) ACTIVITÉS HEBDOMADAIRES — 1 série de 3 occurrences par résident ───────
-- Vraie série récurrente au sens de l'app : recur_id partagé + recur_freq 'weekly'
-- (le bouton « ↻ Série (3) » de la fiche événement fonctionne alors normalement).
with base as (
  select r.id, r.etablissement_id,
         btrim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as full_name,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
v as (
  select
    array[
      $t$Atelier cuisine$t$,
      $t$Piscine$t$,
      $t$Médiation animale$t$,
      $t$Atelier arts plastiques$t$,
      $t$Groupe chant et musique$t$,
      $t$Marche douce$t$
    ] as titres,
    array[
      $t$Cuisine pédagogique du foyer$t$,
      $t$Piscine municipale$t$,
      $t$Ferme pédagogique des Prés Verts$t$,
      $t$Salle d'activités du rez-de-chaussée$t$,
      $t$Salle polyvalente$t$,
      $t$Parc de la Roseraie$t$
    ] as lieux,
    array[
      $t$Préparation du repas du soir avec le groupe, animée par Sophie. Chacun participe selon ses envies et ses possibilités.$t$,
      $t$Séance encadrée par Karim et Léa. Objectif détente et plaisir de l'eau ; maillot et serviette préparés la veille.$t$,
      $t$Temps auprès des animaux de la ferme, accompagné par Ibrahima. Un moment apaisant très attendu.$t$,
      $t$Atelier peinture et collage animé par Claire. Les productions seront exposées dans le hall du foyer.$t$,
      $t$Chorale du foyer animée par Marc. Répertoire choisi avec les résidents lors du dernier atelier.$t$,
      $t$Marche tranquille dans le parc, au rythme de chacun, avec Léa. Repli en salle en cas de pluie.$t$
    ] as descs,
    array['10:00','14:30','10:30','15:00','16:30','10:00'] as heures,
    array['90','120','90','90','60','60'] as durees
)
insert into public.planning_events
  (etablissement_id, titre, resident_id, resident_name, type, date, heure, duree,
   color, description, lieu, recur_id, recur_freq, recur_until, resident_ids, resident_names)
select
  b.etablissement_id,
  (v.titres)[1 + mod(b.rn, array_length(v.titres, 1))],
  b.id::text,
  b.full_name,
  'activite',
  to_char(current_date - 7 + mod(b.rn, 5) + o.s * 7, 'YYYY-MM-DD'),  -- semaine passée, courante, suivante
  (v.heures)[1 + mod(b.rn, array_length(v.heures, 1))],
  (v.durees)[1 + mod(b.rn, array_length(v.durees, 1))],
  '',
  (v.descs)[1 + mod(b.rn, array_length(v.descs, 1))],
  (v.lieux)[1 + mod(b.rn, array_length(v.lieux, 1))],
  'seed-demo-act-' || b.id::text,
  'weekly',
  to_char(current_date - 7 + mod(b.rn, 5) + 14, 'YYYY-MM-DD'),
  '[]'::jsonb, '[]'::jsonb
from base b
cross join v
cross join generate_series(0, 2) as o(s);

-- ── 3) SYNTHÈSES & PROJET PERSONNALISÉ — 1 par résident (à venir) ────────────
with base as (
  select r.id, r.etablissement_id,
         btrim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as full_name,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
v as (
  select
    array[
      $t$Temps de synthèse avec l'équipe pluridisciplinaire. Les souhaits de la personne, recueillis en amont, seront le fil conducteur de la réunion.$t$,
      $t$Point d'étape sur les objectifs du projet personnalisé. La personne participe à la réunion et donne son avis sur chaque axe.$t$,
      $t$Préparation du renouvellement du projet : bilan des réussites de l'année et recueil des nouvelles envies.$t$,
      $t$Échange avec le référent autour du projet ; la famille et le mandataire seront invités à la restitution.$t$,
      $t$Synthèse annuelle : parcours, santé, vie sociale et projets à venir. Le compte rendu sera partagé avec la personne.$t$
    ] as descs,
    array[$t$Salle de réunion$t$, $t$Bureau des référents$t$] as lieux,
    array['10:00','14:00','15:30'] as heures
)
insert into public.planning_events
  (etablissement_id, titre, resident_id, resident_name, type, date, heure, duree,
   color, description, lieu, recur_id, recur_freq, recur_until, resident_ids, resident_names)
select
  b.etablissement_id,
  case when mod(b.rn, 2) = 0 then $t$Réunion de synthèse$t$
       else $t$Point d'étape du projet personnalisé$t$ end,
  b.id::text,
  b.full_name,
  case when mod(b.rn, 2) = 0 then 'reunion' else 'projet' end,
  to_char(current_date + (3 + mod(b.rn * 2, 15)), 'YYYY-MM-DD'),   -- J+3 à J+17
  (v.heures)[1 + mod(b.rn, array_length(v.heures, 1))],
  '90',
  '',
  (v.descs)[1 + mod(b.rn, array_length(v.descs, 1))],
  (v.lieux)[1 + mod(b.rn, array_length(v.lieux, 1))],
  'seed-demo-syn-' || b.id::text,
  null, null,
  '[]'::jsonb, '[]'::jsonb
from base b
cross join v;

-- ── 4) SORTIES — 1 par résident (à venir) ────────────────────────────────────
with base as (
  select r.id, r.etablissement_id,
         btrim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as full_name,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
v as (
  select
    array[
      $t$Sortie au marché$t$,
      $t$Cinéma en ville$t$,
      $t$Après-midi médiathèque$t$,
      $t$Bowling$t$,
      $t$Café en terrasse$t$,
      $t$Visite de l'aquarium$t$
    ] as titres,
    array[
      $t$Marché du centre-ville$t$,
      $t$Cinéma Le Family$t$,
      $t$Médiathèque municipale$t$,
      $t$Bowling des Trois Ponts$t$,
      $t$Place de la mairie$t$,
      $t$Aquarium régional$t$
    ] as lieux,
    array[
      $t$Achats pour l'atelier cuisine et plaisir de flâner sur les étals. Petit groupe accompagné par Sophie.$t$,
      $t$Séance choisie ensemble lors du dernier conseil des résidents. Accompagnement par Karim.$t$,
      $t$Emprunt de livres et de CD, puis temps de lecture sur place. Accompagnement par Claire.$t$,
      $t$Partie de bowling entre résidents, dans la bonne humeur. Accompagnement par Ibrahima et Léa.$t$,
      $t$Pause gourmande en ville, l'occasion de s'exercer à l'usage de la monnaie en situation réelle.$t$,
      $t$Sortie très attendue à l'aquarium. Prévoir le pique-nique et l'appareil photo. Accompagnement par Marc.$t$
    ] as descs,
    array['09:30','13:30','14:00','15:00','10:00','09:00'] as heures,
    array['120','180','120','120','90','journee'] as durees
)
insert into public.planning_events
  (etablissement_id, titre, resident_id, resident_name, type, date, heure, duree,
   color, description, lieu, recur_id, recur_freq, recur_until, resident_ids, resident_names)
select
  b.etablissement_id,
  (v.titres)[1 + mod(b.rn * 5, array_length(v.titres, 1))],
  b.id::text,
  b.full_name,
  'sortie',
  to_char(current_date + (1 + mod(b.rn * 3, 14)), 'YYYY-MM-DD'),   -- J+1 à J+14
  (v.heures)[1 + mod(b.rn * 5, array_length(v.heures, 1))],
  (v.durees)[1 + mod(b.rn * 5, array_length(v.durees, 1))],
  '',
  (v.descs)[1 + mod(b.rn * 5, array_length(v.descs, 1))],
  (v.lieux)[1 + mod(b.rn * 5, array_length(v.lieux, 1))],
  'seed-demo-sortie-' || b.id::text,
  null, null,
  '[]'::jsonb, '[]'::jsonb
from base b
cross join v;

-- ── 5) ÉVALUATIONS PLANIFIÉES — 1 résident sur 3 (à venir) ───────────────────
with base as (
  select r.id, r.etablissement_id,
         btrim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')) as full_name,
         (row_number() over (order by r.id))::int as rn
  from public.residents r
  where coalesce(r.statut, '') <> 'sorti'
),
v as (
  select
    array[
      $t$Évaluation de l'autonomie (grille MIF)$t$,
      $t$Actualisation SERAFIN-PH$t$,
      $t$Bilan d'autonomie (grille de Barthel)$t$
    ] as titres,
    array[
      $t$Passation dans un cadre calme et rassurant, avec l'accord de la personne. Les résultats alimenteront le projet personnalisé.$t$,
      $t$Actualisation des besoins et des prestations avec la personne et son référent, en amont de la synthèse.$t$,
      $t$Bilan réalisé conjointement par le référent et l'infirmière, en présence de la personne.$t$
    ] as descs
)
insert into public.planning_events
  (etablissement_id, titre, resident_id, resident_name, type, date, heure, duree,
   color, description, lieu, recur_id, recur_freq, recur_until, resident_ids, resident_names)
select
  b.etablissement_id,
  (v.titres)[1 + mod((b.rn - 1) / 3, array_length(v.titres, 1))],  -- rn ≡ 1 (mod 3) → indexer sur (rn-1)/3
  b.id::text,
  b.full_name,
  'evaluation',
  to_char(current_date + (5 + mod(b.rn, 10)), 'YYYY-MM-DD'),       -- J+5 à J+14
  '10:30',
  '60',
  '',
  (v.descs)[1 + mod((b.rn - 1) / 3, array_length(v.descs, 1))],
  $t$Bureau des référents$t$,
  'seed-demo-eval-' || b.id::text,
  null, null,
  '[]'::jsonb, '[]'::jsonb
from base b
cross join v
where mod(b.rn, 3) = 1;

commit;


-- ═══ FIN DU SEED — vérification rapide ═══
select 'transmissions' as t, count(*) from transmissions
union all select 'journal_entries', count(*) from journal_entries
union all select 'taches_ppa', count(*) from taches_ppa
union all select 'ppe', count(*) from ppe
union all select 'evaluations', count(*) from evaluations
union all select 'echeances', count(*) from echeances;
