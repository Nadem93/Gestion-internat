// ── COUCHE SUPABASE — CONFIG PARTAGÉE (table app_config, clé/valeur JSON) ──
// Permet de partager entre postes/appareils : permissions par fonction + taux de
// majoration paie. Le localStorage reste le cache de lecture synchrone ; Supabase
// est la source de vérité (hydratée au login et sur les pages concernées).
// sbGetEtablissementId() défini dans js/residents-supabase.js

async function sbGetAppConfig() {
  const { data, error } = await supabaseClient.from('app_config').select('cle, valeur');
  if (error) { console.error('[sbGetAppConfig]', error); return {}; }
  const out = {};
  (data || []).forEach(r => { out[r.cle] = r.valeur; });
  return out;
}

async function sbSaveAppConfig(cle, valeur) {
  const etablissementId = await sbGetEtablissementId();
  const { error } = await supabaseClient.from('app_config')
    .upsert({ etablissement_id: etablissementId, cle, valeur, updated_at: new Date().toISOString() },
            { onConflict: 'etablissement_id,cle' });
  if (error) throw error;
}

// Écrit une valeur dans le localStorage pour TOUS les établissements locaux (clé suffixée __<id>
// lue par DB.get) + la clé brute en repli. Corrige le décalage de suffixe du multi-établissement.
function _hydrateLocalAllEtabs(baseKey, value) {
  const json = JSON.stringify(value);
  try { localStorage.setItem(baseKey, json); } catch (_) {}
  try { (typeof getEtabs === 'function' ? getEtabs() : []).forEach(e => localStorage.setItem(`${baseKey}__${e.id}`, json)); } catch (_) {}
}

// Hydrate le localStorage depuis Supabase (à appeler au login et sur les pages concernées)
async function hydrateConfigFromCloud() {
  try {
    const cfg = await sbGetAppConfig();
    if (cfg.fonction_colors) localStorage.setItem('ftr_fonction_colors', JSON.stringify(cfg.fonction_colors));
    if (cfg.paie_majoration) localStorage.setItem('ftr_paie_majoration', JSON.stringify(cfg.paie_majoration));
    if (cfg.settings)   _hydrateLocalAllEtabs(DB.keys.settings,   cfg.settings);
    if (cfg.categories) _hydrateLocalAllEtabs(DB.keys.categories, cfg.categories);
    // Amorçage : si le cloud ne connaît pas encore settings/categories, on y pousse la valeur locale.
    // Uniquement là où l'écriture est possible (sbGetEtablissementId chargé, ex. page admin).
    if (typeof sbGetEtablissementId === 'function') {
      try {
        if (!cfg.settings)   { const s = DB.get(DB.keys.settings);   if (s) await sbSaveAppConfig('settings', s); }
        if (!cfg.categories) { const c = DB.get(DB.keys.categories); if (Array.isArray(c) && c.length) await sbSaveAppConfig('categories', c); }
      } catch (e) { console.error('[hydrateConfigFromCloud] amorçage', e); }
    }
    return cfg;
  } catch (e) { console.error('[hydrateConfigFromCloud]', e); return {}; }
}

// Write-through : enregistre en local (synchrone, lu immédiatement par DB.get) puis pousse vers app_config.
function persistSettings(obj) {
  DB.set(DB.keys.settings, obj);
  if (typeof sbSaveAppConfig === 'function')
    Promise.resolve(sbSaveAppConfig('settings', obj)).catch(e => console.error('[persistSettings]', e));
}
function persistCategories(arr) {
  DB.set(DB.keys.categories, arr);
  if (typeof sbSaveAppConfig === 'function')
    Promise.resolve(sbSaveAppConfig('categories', arr)).catch(e => console.error('[persistCategories]', e));
}
