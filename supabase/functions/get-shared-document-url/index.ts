// ── Edge Function : get-shared-document-url ──
// Génère une URL signée (2 min) vers un document résident déjà marqué
// "partage_famille" et rattaché au compte famille appelant, via la table
// de liaison famille_residents. La clé service_role reste ICI, côté
// serveur — jamais dans le navigateur.
// Ne touche pas aux policies du bucket "justificatifs" (privé) : le
// contrôle d'accès est refait intégralement ici avant de signer l'URL.

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

    // 1) Identifier l'appelant via son jeton de session
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ ok: false, error: 'Non authentifié' });

    const callerClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(token);
    if (callerErr || !caller) return json({ ok: false, error: 'Session invalide' });

    // 2) Vérifier que l'appelant est bien un compte famille
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: callerProfile } = await admin
      .from('profiles').select('role').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.role !== 'famille') {
      return json({ ok: false, error: 'Accès réservé aux comptes famille' });
    }

    // 3) Lire le document demandé + vérifier qu'il est bien partagé
    const { documentId } = await req.json();
    if (!documentId) return json({ ok: false, error: 'documentId requis' });

    const { data: doc, error: docErr } = await admin
      .from('documents_resident')
      .select('resident_id, fichier_path, partage_famille')
      .eq('id', documentId).single();
    if (docErr || !doc) return json({ ok: false, error: 'Document introuvable' });
    if (!doc.partage_famille) return json({ ok: false, error: 'Ce document n\'est pas partagé' });
    if (!doc.fichier_path) return json({ ok: false, error: 'Aucun fichier associé à ce document' });

    // 4) Vérifier que l'appelant est bien lié à ce résident
    const { data: lien } = await admin
      .from('famille_residents')
      .select('id').eq('profile_id', caller.id).eq('resident_id', doc.resident_id).limit(1);
    if (!lien || !lien.length) return json({ ok: false, error: 'Accès refusé à ce résident' });

    // 5) Signer l'URL (bucket privé "justificatifs")
    const { data: signed, error: signErr } = await admin.storage
      .from('justificatifs').createSignedUrl(doc.fichier_path, 120);
    if (signErr) return json({ ok: false, error: signErr.message });

    return json({ ok: true, url: signed?.signedUrl || null });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) });
  }
});
