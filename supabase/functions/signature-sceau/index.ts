// ── Edge Function : signature-sceau ──
// Contresignature SERVEUR des empreintes de signature d'avenant.
// L'empreinte est calculée ICI (pas reçue du client) à partir du contenu réel
// de l'avenant, et consignée dans un registre append-only que les clients ne
// peuvent pas réécrire (RLS). Deux actions :
//   - sceller  : fige l'empreinte du contenu actuel au moment d'une signature.
//   - verifier : recalcule l'empreinte courante et la compare au dernier scellé.
// Aucun secret à configurer : la confiance vient du cloisonnement (seul le
// service_role écrit le registre).

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES_SIGNATURE = ['resident', 'representant', 'referent', 'direction'];

// ── Empreinte : réplique EXACTE de sigContenuAvenant + sigStableStringify du
// client (js/ppe.js, js/signature-pad.js). Toute divergence ferait échouer la
// comparaison « conforme ». On scelle le FOND (résident, sections, conclusion),
// hors _cycle / outcomes / serafin — postérieurs à la signature par construction.
function sigStableStringify(v: unknown): string {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(x => sigStableStringify(x === undefined ? null : x)).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort()
    .map(k => JSON.stringify(k) + ':' + sigStableStringify(o[k])).join(',') + '}';
}

function contenuAvenant(ppe: Record<string, unknown>): string {
  const sectionsSrc = (ppe.sections || {}) as Record<string, unknown>;
  const sections: Record<string, unknown> = {};
  for (const [k, s] of Object.entries(sectionsSrc)) {
    if (k === '_cycle' || !s || typeof s !== 'object') continue;
    const ss = s as Record<string, unknown>;
    const objectifs = (Array.isArray(ss.objectifs) ? ss.objectifs : []).map((o) => {
      const { outcomes, serafin, ...fond } = (o || {}) as Record<string, unknown>;
      return fond;
    });
    sections[k] = { ...ss, objectifs };
  }
  return sigStableStringify({
    residentId: ppe.resident_id || '',
    residentName: ppe.resident_name || '',
    sections,
    conclusion: ppe.conclusion || '',
  });
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

  // 1) Authentifier l'appelant
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return json({ ok: false, code: 'non_authentifie', error: 'Non authentifié' }, 401);
  const callerClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(token);
  if (callerErr || !caller) return json({ ok: false, code: 'non_authentifie', error: 'Session invalide' }, 401);

  // 2) Profil + établissement (rôle famille exclu : lecture seule documents)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: profil } = await admin.from('profiles')
    .select('role, etablissement_id, prenom, nom').eq('id', caller.id).single();
  if (!profil || profil.role === 'famille')
    return json({ ok: false, code: 'forbidden', error: 'Accès refusé' }, 403);
  const etabId = profil.etablissement_id;
  const parNom = [profil.prenom, profil.nom].filter(Boolean).join(' ');

  // 3) Corps
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, code: 'parametres_invalides', error: 'JSON invalide' }, 400); }
  const action = String(body?.action || '');
  const ppeId = body?.ppeId != null ? String(body.ppeId) : '';
  const role = String(body?.role || '');
  const nom = String(body?.nom || '').slice(0, 120);
  if (!['sceller', 'verifier'].includes(action) || !ppeId || !ROLES_SIGNATURE.includes(role))
    return json({ ok: false, code: 'parametres_invalides', error: 'action / ppeId / role requis' }, 400);

  // 4) L'avenant appartient-il à l'établissement de l'appelant ?
  const { data: ppe, error: ppeErr } = await admin.from('ppe')
    .select('id, resident_id, resident_name, sections, conclusion, etablissement_id')
    .eq('id', ppeId).eq('etablissement_id', etabId).maybeSingle();
  if (ppeErr) return json({ ok: false, code: 'interne', error: 'Erreur de lecture de l’avenant' }, 500);
  if (!ppe) return json({ ok: false, code: 'avenant_inconnu', error: 'Avenant introuvable dans votre établissement' }, 404);

  const empreinteCourante = await sha256Hex(contenuAvenant(ppe));

  if (action === 'sceller') {
    // Append-only : on n'écrase jamais, on ajoute une ligne au registre.
    const { data: row, error: insErr } = await admin.from('signature_sceaux').insert({
      etablissement_id: etabId, ppe_id: ppeId, role,
      empreinte: empreinteCourante, nom, par: caller.id, par_nom: parNom,
    }).select('id, scelle_le').single();
    if (insErr) return json({ ok: false, code: 'interne', error: 'Erreur d’enregistrement du scellé' }, 500);
    return json({ ok: true, id: (row as { id: string }).id, empreinte: empreinteCourante, scelle_le: (row as { scelle_le: string }).scelle_le });
  }

  // action === 'verifier' : on interroge TOUT l'historique append-only du rôle.
  // La référence est la signature INITIALE (premier scellé) : un avenant signé
  // ne doit plus changer. Toute empreinte distincte apparue ensuite (contenu
  // modifié PUIS re-scellé pour masquer) est une altération — pas un « conforme ».
  const { data: sceaux, error: selErr } = await admin.from('signature_sceaux')
    .select('empreinte, par_nom, scelle_le')
    .eq('etablissement_id', etabId).eq('ppe_id', ppeId).eq('role', role)
    .order('scelle_le', { ascending: true });
  if (selErr) return json({ ok: false, code: 'interne', error: 'Erreur de lecture du registre' }, 500);
  if (!sceaux || !sceaux.length) return json({ ok: true, scelle: false });   // jamais scellé côté serveur

  const premier = sceaux[0] as { empreinte: string; par_nom: string; scelle_le: string };
  const distinctes = new Set(sceaux.map((s) => (s as { empreinte: string }).empreinte)).size;
  // Conforme = le contenu n'a JAMAIS changé depuis la signature initiale
  // (une seule empreinte dans tout l'historique, et elle est celle du contenu courant).
  const conforme = distinctes === 1 && premier.empreinte === empreinteCourante;

  return json({
    ok: true, scelle: true, conforme,
    altere: distinctes > 1,                 // contenu modifié puis re-scellé
    scelle_le: premier.scelle_le,           // date de la signature initiale
    par_nom: premier.par_nom,
    nb_sceaux: sceaux.length,
    distinctes,
  });
});
