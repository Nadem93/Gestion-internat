// ── Edge Function : find-famille-account ──
// Retrouve l'UUID d'un compte famille existant à partir de son email, pour
// permettre à un admin de le lier à un second résident. Utilise le
// service_role (les profils n'exposent pas l'email via l'API publique/RLS).
// N'autorise la recherche que parmi les comptes role='famille' du MÊME
// établissement que l'appelant (jamais de fuite cross-établissement).

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON         = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ ok: false, error: 'Non authentifié' });

    const callerClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(token);
    if (callerErr || !caller) return json({ ok: false, error: 'Session invalide' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: callerProfile } = await admin
      .from('profiles').select('role, etablissement_id').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ ok: false, error: 'Accès réservé aux administrateurs' });
    }

    const { email } = await req.json();
    if (!email) return json({ ok: false, error: 'Email requis' });

    const { data: found, error: findErr } = await admin
      .from('profiles')
      .select('id, prenom, nom')
      .eq('email', email)
      .eq('role', 'famille')
      .eq('etablissement_id', callerProfile.etablissement_id)
      .maybeSingle();
    if (findErr) return json({ ok: false, error: findErr.message });
    if (!found) return json({ ok: false, error: 'Aucun compte famille trouvé avec cet email dans votre établissement' });

    return json({ ok: true, profileId: found.id, prenom: found.prenom, nom: found.nom });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) });
  }
});
