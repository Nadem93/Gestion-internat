function renderAnnuaire() {
  const all = (DB.get(DB.keys.employes) || []).filter(e => e.statut !== 'inactif')
    .sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
  const q = (document.getElementById('anSearch')?.value || '').trim().toLowerCase();
  const employes = q
    ? all.filter(e =>
        (e.prenom+' '+e.nom).toLowerCase().includes(q) ||
        (e.poste+'').toLowerCase().includes(q) ||
        (e.telephone+'').includes(q) ||
        (e.email+'').toLowerCase().includes(q)
      )
    : all;

  const countEl = document.getElementById('anCount');
  if (countEl) countEl.textContent = q ? employes.length+'/'+all.length+' personnes' : employes.length+' personne'+(employes.length>1?'s':'');

  const container = document.getElementById('anList');
  if (!employes.length) {
    container.innerHTML = '<div class="empty"><h3>'+(q?'Aucun résultat':'Aucun collègue')+'</h3><p>'+(q?'Aucun membre du personnel ne correspond à votre recherche.':'Aucun membre du personnel enregistré.')+'</p></div>';
    return;
  }

  container.innerHTML = `<div class="grid grid-5" style="gap:.75rem">${employes.map(e => {
    const enConge = e.statut === 'conge';
    return `<div style="background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:1.5rem 1.25rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.5rem">
      ${residentPhoto(e, 56)}
      <div style="font-weight:700;font-size:.92rem">${escHtml(e.prenom)} ${escHtml(e.nom)}</div>
      <div style="font-size:.8rem;color:var(--muted)">${escHtml(e.poste||'')}</div>
      ${enConge ? '<span class="badge" style="background:#fef3c7;color:#92400e">En congé</span>' : ''}
      <div style="font-size:.78rem;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:.25rem">
        ${e.telephone ? `<a href="tel:${escHtml(e.telephone)}" style="color:inherit;text-decoration:none">📞 ${escHtml(e.telephone)}</a>` : ''}
        ${e.email ? `<a href="mailto:${escHtml(e.email)}" style="color:inherit;text-decoration:none">✉️ ${escHtml(e.email)}</a>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;
}

document.addEventListener('DOMContentLoaded', () => { if (requireModule('access_annuaire')) renderAnnuaire(); });
if (typeof registerPageInit === 'function') registerPageInit('annuaire', renderAnnuaire);
