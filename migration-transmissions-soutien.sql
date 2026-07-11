-- ═══ P4 « Documentation à deux couches » — transmissions ═══
-- Trace non seulement ce que le résident a fait (observation), mais AUSSI
-- ce que le professionnel a fait pour l'y aider (accompagnement apporté +
-- niveau de soutien). Rend le travail éducatif visible.
-- À exécuter dans Supabase (SQL Editor) AVANT d'utiliser les nouveaux champs :
-- tant que ces colonnes n'existent pas, l'app continue de fonctionner
-- (écriture défensive), les champs saisis ne sont simplement pas conservés.

alter table transmissions add column if not exists soutien text not null default '';
alter table transmissions add column if not exists soutien_niveau text not null default '';
