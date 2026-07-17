// ── Entrée brandée par structure (sous-domaine) ──
// Habillage COSMÉTIQUE de la page de connexion selon le sous-domaine
// (ex. tissa.internalis.fr) ou le paramètre ?s=slug (pour prévisualiser sans DNS).
// N'affecte NI l'authentification NI l'isolation des données : après connexion,
// c'est le profil de l'utilisateur (etablissement_id + RLS) qui décide de ce qu'il voit.
// Le slug est libre — il n'a pas besoin de correspondre à l'etablissement_id.

const STRUCTURES = {
  // slug (= sous-domaine)      nom affiché          sous-titre                          logo (image)   couleur d'accent
  tissa: { nom: 'TISSA', sous: 'Accompagnement médico-social', logo: '', couleur: '' },
};

// Slug courant : ?s=... prioritaire (prévisualisation), sinon 1er label du sous-domaine.
function structureSlug() {
  try {
    const p = new URLSearchParams(location.search).get('s');
    if (p) return p.trim().toLowerCase();
    const parts = location.hostname.split('.');
    if (parts.length >= 3) {
      const slug = parts[0].toLowerCase();
      if (slug !== 'www' && slug !== 'internalisfr') return slug;
    }
  } catch (e) { /* noop */ }
  return null;
}

function currentStructure() {
  const s = structureSlug();
  return s ? (STRUCTURES[s] || null) : null;
}

// Applique l'habillage au bloc .lc-brand de la page de connexion (index.html).
function applyStructureBranding() {
  const s = currentStructure();
  if (!s) return;
  const nameEl = document.querySelector('.lc-brand-name');
  const subEl  = document.querySelector('.lc-brand-sub');
  if (nameEl && s.nom) nameEl.textContent = s.nom;
  if (subEl && s.sous) subEl.textContent = s.sous;
  if (s.couleur) document.documentElement.style.setProperty('--primary', s.couleur);
  if (s.nom) document.title = 'Connexion — ' + s.nom;
  if (s.logo) {
    const brand = document.querySelector('.lc-brand');
    if (brand && !brand.querySelector('.lc-brand-logo')) {
      const img = document.createElement('img');
      img.className = 'lc-brand-logo';
      img.src = s.logo;
      img.alt = s.nom || '';
      img.style.cssText = 'max-height:60px;margin:0 auto .7rem;display:block';
      brand.insertBefore(img, brand.firstChild);
    }
  }
}
