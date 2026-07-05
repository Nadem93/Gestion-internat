// ── Edge Function : create-user ──
// Crée un VRAI compte de connexion (Auth + profil) pour un salarié.
// La clé service_role reste ICI, côté serveur — jamais dans le navigateur.
// L'appel n'est autorisé que si l'appelant est un administrateur.

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    // Variables injectées automatiquement par Supabase
    const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON          = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 1) Identifier l'appelant via son jeton de session
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ ok: false, error: 'Non authentifié' });

    const callerClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(token);
    if (callerErr || !caller) return json({ ok: false, error: 'Session invalide' });

    // 2) Vérifier que l'appelant est admin + récupérer son établissement
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: callerProfile } = await admin
      .from('profiles').select('role, etablissement_id').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ ok: false, error: 'Accès réservé aux administrateurs' });
    }

    // 3) Lire le corps
    const { email, password, prenom, nom, fonction, role } = await req.json();
    if (!email || !password) return json({ ok: false, error: 'Email et mot de passe requis' });
    // Politique alignée sur la validation côté client : 8+ car., majuscule, chiffre, spécial
    const pwOk = (p: string) => String(p).length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
    if (!pwOk(password)) return json({ ok: false, error: 'Mot de passe trop faible : 8 caractères minimum, avec majuscule, chiffre et caractère spécial' });

    // Anti-élévation de privilège : un admin ne peut créer QUE des rôles de son périmètre.
    // 'superadmin' (console multi-établissements) est volontairement exclu ici.
    const ROLES_AUTORISES = ['educateur', 'moderator', 'admin', 'famille'];
    const roleDemande = role || 'educateur';
    if (!ROLES_AUTORISES.includes(roleDemande)) {
      return json({ ok: false, error: 'Rôle non autorisé' });
    }

    // 4) Créer le compte Auth (email déjà confirmé pour permettre la connexion immédiate)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { prenom: prenom || '', nom: nom || '', must_change_password: true },
    });
    if (createErr) return json({ ok: false, error: createErr.message });
    const userId = created.user.id;

    // 5) Créer le profil dans le MÊME établissement que l'admin
    const { error: profErr } = await admin.from('profiles').upsert({
      id: userId,
      prenom: prenom || '',
      nom: nom || '',
      fonction: fonction || '',
      role: roleDemande,
      etablissement_id: callerProfile.etablissement_id,
      email: email || '',
    });
    if (profErr) {
      // Annule le compte Auth si le profil échoue, pour ne pas laisser un compte orphelin
      await admin.auth.admin.deleteUser(userId);
      return json({ ok: false, error: 'Profil : ' + profErr.message });
    }

    return json({ ok: true, userId });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) });
  }
});
