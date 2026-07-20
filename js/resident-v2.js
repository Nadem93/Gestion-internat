// ── FICHE RÉSIDENT — DESIGN V2 (dossier usager) ──
// Bandeau d'identité de la maquette « Fiche résident - refonte (bento) ».
// Les modules historiques restent rendus par resident.html ; ce fichier ne
// porte que les blocs repris de la maquette V2.

// Catalogue des chambres (pour résoudre l'unité) — rempli au chargement de la page.
let _residentChambres = [];

// « Camille Morel » → « C. Morel » (format des faits de la maquette).
function _rv2Abbrev(nom) {
  const parts = (nom || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return nom || '';
  return parts[0][0].toUpperCase() + '. ' + parts.slice(1).join(' ');
}

// L'unité n'est pas stockée sur le résident : elle vient de la chambre occupée.
function _rv2Unite(r) {
  const nom = (r.chambre || '').trim().toLowerCase();
  if (!nom || !_residentChambres.length) return '';
  const ch = _residentChambres.find(c => (c.nom || '').trim().toLowerCase() === nom);
  return (ch && ch.unite) || '';
}

function _rv2Fact(k, v) {
  return `<div class="v2-fact"><div class="v2-fact-k">${escHtml(k)}</div><div class="v2-fact-v">${escHtml(v || '—')}</div></div>`;
}

function residentHeroV2(r) {
  const color = safeColor(r.color, '#818cf8');
  const todayPresences = _residentPresencesRange[today()] || {};
  const presenceStatus = todayPresences[currentResidentId] || (r.statut === 'sorti' ? 'sorti' : r.statut);

  const av = r.photo
    ? `<div class="v2-hero-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="v2-hero-av" style="background:${color}">${initials(r.prenom, r.nom)}</div>`;

  // Ligne méta : on ne montre que ce qui est réellement renseigné.
  const meta = [];
  if (r.dob) meta.push(`${age(r.dob)} ans`, `né${r.genre === 'F' ? 'e' : ''} le ${formatDate(r.dob)}`);
  const dossier = r.dossier || r.dossierA;
  if (dossier) meta.push(`dossier ${dossier}`);

  return `<div class="v2-hero-res" style="--rc:${color}">
    ${av}
    <div style="min-width:0">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div class="v2-hero-nom">${escHtml(r.prenom || '')} ${escHtml(r.nom || '')}</div>
        ${statusBadge(presenceStatus)}
      </div>
      ${meta.length ? `<div class="v2-hero-meta">${escHtml(meta.join(' · '))}</div>` : ''}
    </div>
    <div class="v2-facts">
      ${_rv2Fact('Chambre', r.chambre)}
      ${_rv2Fact('Unité', _rv2Unite(r))}
      ${_rv2Fact('Entrée', r.entree ? formatDate(r.entree) : '')}
      ${_rv2Fact('Référent', _rv2Abbrev(r.referent))}
    </div>
  </div>`;
}
