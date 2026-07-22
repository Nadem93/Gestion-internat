// ── AGENDA — DESIGN V2 ──
// Complète « Planning - refonte (bento) » : la grille hebdomadaire, la légende
// et les mini-calendriers sont déjà rendus par js/planning.js (même géométrie
// que la maquette : 7h–21h, 52 px/heure) et sont rhabillés par css/v2.css.
// Ce module apporte le bloc « Prochains événements » du rail, absent de la V1.

const PL2_JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

// « aujourd'hui », « demain », « ven. 24 »
function _pl2Jour(iso) {
  const d = new Date(iso + 'T00:00:00');
  const n = Math.round((d - new Date(today() + 'T00:00:00')) / 86400000);
  if (n === 0) return "auj.";
  if (n === 1) return 'demain';
  return PL2_JOURS[d.getDay()] + ' ' + d.getDate();
}

function pl2RenderUpcoming() {
  const el = document.getElementById('plUpcoming');
  if (!el) return;

  const t0 = today();
  const maintenant = new Date();
  const list = (_planningEventsCache || [])
    .filter(e => {
      if (e.statut === 'annule') return false;   // les événements annulés ne sont pas « à venir »
      const d = (e.date || '').slice(0, 10);
      if (!d || d < t0) return false;
      if (d > t0) return true;
      // aujourd'hui : on ne garde que ce qui n'est pas déjà passé
      const h = (e.heure || e.time || '23:59').slice(0, 5);
      return new Date(d + 'T' + h) >= new Date(maintenant.getTime() - 3600000);
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')
                 || (a.heure || a.time || '').localeCompare(b.heure || b.time || ''))
    .slice(0, 8);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px">
      <svg style="width:15px;height:15px" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span class="v2-blk-t">Prochains événements</span>
    </div>
    ${list.length ? `<div style="display:flex;flex-direction:column;gap:11px">${list.map(e => {
      const c = safeColor(e.color, (typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[e.type]) || '#818cf8');
      const h = (e.heure || e.time || '').slice(0, 5);
      const res = e.residentName || (e.residentNames || []).join(', ') || '';
      const sub = [h ? '' : null, e.lieu, res].filter(Boolean).join(' · ');
      return `<div class="v2-pl-up" style="--pc:${c}">
        <div class="v2-pl-up-d">
          <div class="v2-pl-up-j">${escHtml(_pl2Jour((e.date || '').slice(0, 10)))}</div>
          <div class="v2-pl-up-h">${escHtml(h || '—')}</div>
        </div>
        <div class="v2-pl-up-b">
          <div class="v2-pl-up-t">${escHtml(e.titre || e.title || 'Événement')}</div>
          ${sub ? `<div class="v2-pl-up-s">${escHtml(sub)}</div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucun événement à venir.</div>'}`;
}

// Chaque bloc d'événement porte sa couleur en variable, pour que css/v2.css
// puisse teinter fond, bordure et heure sans réécrire le rendu de planning.js.
function pl2TeinterEvenements() {
  document.querySelectorAll('#calContainer .pl-ev').forEach(el => {
    const bande = el.querySelector('.pl-ev-band');
    const c = (bande && bande.style.background)
      || el.style.borderLeftColor || el.style.background || '';
    if (!c) return;
    el.style.setProperty('--ec', c);
    // planning.js pose la couleur pleine en inline : elle bat toute règle de
    // feuille de style. On la remplace ici par la version teintée sombre.
    el.style.background = `color-mix(in srgb, ${c} 17%, #0e1c31)`;
    el.style.borderColor = `color-mix(in srgb, ${c} 34%, transparent)`;
    el.style.borderLeftColor = c;
    const t = el.querySelector('.pl-ev-time');
    if (t) t.style.color = c;
  });
}
