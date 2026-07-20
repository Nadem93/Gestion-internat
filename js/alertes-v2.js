// ── ALERTES & NOTIFICATIONS — DESIGN V2 ──
// Reproduit « Alertes - refonte (bento) » : quatre compteurs, filtres par
// gravité, liste d'alertes actionnables, rail (répartition par catégorie +
// échéances imminentes) et bloc « Récemment traitées ».
// La génération des alertes reste celle de js/alertes.js (generateAlertes).

let AL2_SEV = 'all';    // gravité sélectionnée dans les chips
let AL2_TYPE = '';      // catégorie sélectionnée dans le rail

// Palette sombre : celle de AL_PRIOS est calibrée pour le thème clair.
const AL2_SEV_DEFS = [
  { id: 'all',      l: 'Toutes',       c: '#818cf8' },
  { id: 'critique', l: 'Critiques',    c: '#ef4444' },
  { id: 'urgent',   l: 'Urgentes',     c: '#f59e0b' },
  { id: 'info',     l: 'Informations', c: '#0ea5e9' }
];
const AL2_SEV_C = { critique: '#ef4444', urgent: '#f59e0b', info: '#0ea5e9' };
const AL2_SEV_L = { critique: 'Critique', urgent: 'Urgent', info: 'Info' };

const AL2_IC = {
  warn:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  bell:  '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
};
function _al2Svg(d, w) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────

function al2Render() {
  _alLoadDismissed();
  const toutes = generateAlertes();
  const actives = toutes.filter(a => !_alDismissed.includes(a.id));

  let liste = actives;
  if (AL2_SEV !== 'all') liste = liste.filter(a => a.prio === AL2_SEV);
  if (AL2_TYPE) liste = liste.filter(a => a.type === AL2_TYPE);

  al2RenderStats(actives);
  al2RenderChips(actives);
  al2RenderListe(liste);
  al2RenderCategories(actives);
  al2RenderEcheances(actives);
  al2RenderTraitees(toutes);

  if (typeof _updateAlBadges === 'function') _updateAlBadges(actives.length);
}

function al2SetSev(s) { AL2_SEV = s; al2Render(); }
function al2SetType(t) { AL2_TYPE = (AL2_TYPE === t) ? '' : t; al2Render(); }

// ── COMPTEURS ────────────────────────────────────────────────────────

function al2RenderStats(actives) {
  const el = document.getElementById('alStats');
  if (!el) return;
  const n = p => actives.filter(a => a.prio === p).length;
  const carte = (ico, c, val, lbl) => `<div class="v2-al-stat" style="--pc:${c}">
    <span class="v2-al-stat-ico">${_al2Svg(ico)}</span>
    <div><div class="v2-al-stat-n">${val}</div><div class="v2-al-stat-l">${lbl}</div></div>
  </div>`;
  el.innerHTML = carte(AL2_IC.warn, '#ef4444', n('critique'), 'Critiques')
    + carte(AL2_IC.clock, '#f59e0b', n('urgent'), 'Urgentes')
    + carte(AL2_IC.bell, '#0ea5e9', n('info'), 'Informations')
    + carte(AL2_IC.check, '#818cf8', actives.length, 'Au total');
}

// ── CHIPS DE GRAVITÉ ─────────────────────────────────────────────────

function al2RenderChips(actives) {
  const el = document.getElementById('alFilters');
  if (!el) return;
  el.innerHTML = AL2_SEV_DEFS.map(f => {
    const n = f.id === 'all' ? actives.length : actives.filter(a => a.prio === f.id).length;
    return `<button type="button" class="v2-chip-f${AL2_SEV === f.id ? ' on' : ''}" onclick="al2SetSev('${f.id}')">
      <span class="dot" style="background:${f.c}"></span>${f.l}<span class="n">${n}</span>
    </button>`;
  }).join('');
}

// ── LISTE ────────────────────────────────────────────────────────────

function al2RenderListe(liste) {
  const el = document.getElementById('alList');
  if (!el) return;
  if (!liste.length) {
    el.innerHTML = `<div class="v2-blk" style="text-align:center;padding:48px 24px">
      <div style="color:var(--v2-ok);margin-bottom:12px">${_al2Svg(AL2_IC.check, 2)}</div>
      <div style="font-size:15px;font-weight:700;color:var(--v2-t2)">Tout est à jour</div>
      <div style="font-size:12.5px;color:var(--v2-t7);margin-top:4px">Aucune alerte ne correspond à ce filtre.</div>
    </div>`;
    return;
  }

  const ordre = { critique: 0, urgent: 1, info: 2 };
  el.innerHTML = [...liste]
    .sort((a, b) => (ordre[a.prio] ?? 3) - (ordre[b.prio] ?? 3) || (a.date || '').localeCompare(b.date || ''))
    .map(a => {
      const t = AL_TYPES[a.type] || AL_TYPES.echeance;
      const sc = AL2_SEV_C[a.prio] || '#64748b';
      return `<article class="v2-al" style="--sc:${sc};--pc:${t.color}">
        <span class="v2-al-ico">${t.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:4px;flex-wrap:wrap">
            <span class="v2-al-t">${escHtml(a.titre)}</span>
            <span class="v2-al-sev">${AL2_SEV_L[a.prio] || a.prio}</span>
          </div>
          <div class="v2-al-d">${escHtml(a.msg || '')}</div>
          <div class="v2-al-meta">
            <span class="v2-al-type">${escHtml(t.label)}</span>
            ${a.date ? `<span class="v2-al-ctx">${escHtml(_alFormatDate(a.date))}</span>` : ''}
            ${a.date ? `<span class="v2-al-ctx" style="margin-left:auto">${escHtml(al2Reste(a.date))}</span>` : ''}
          </div>
        </div>
        <div class="v2-al-act">
          ${a.link ? `<a class="v2-al-cta" href="${sanitizeUrl(a.link)}">Traiter</a>` : ''}
          <button type="button" class="v2-al-ign" onclick="dismissAl('${a.id}')">Ignorer</button>
        </div>
      </article>`;
    }).join('');
}

// « dans 3 j », « aujourd'hui », « en retard de 2 j »
function al2Reste(iso) {
  if (!iso) return '';
  const j = Math.round((new Date(String(iso).slice(0, 10) + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
  if (isNaN(j)) return '';
  if (j === 0) return "aujourd'hui";
  if (j === 1) return 'demain';
  if (j > 1) return `dans ${j} j`;
  return `en retard de ${Math.abs(j)} j`;
}

// ── RAIL : RÉPARTITION PAR CATÉGORIE ─────────────────────────────────

function al2RenderCategories(actives) {
  const el = document.getElementById('alCats');
  if (!el) return;
  const n = {};
  actives.forEach(a => { n[a.type] = (n[a.type] || 0) + 1; });
  const cles = Object.keys(n).sort((a, b) => n[b] - n[a]);
  const max = Math.max(1, ...Object.values(n));

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:18px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
      <span class="v2-blk-t">Par catégorie</span>
      ${AL2_TYPE ? `<button type="button" class="v2-tr-act" style="margin-left:auto" onclick="al2SetType('')">Tout voir</button>` : ''}
    </div>
    ${cles.length ? `<div style="display:flex;flex-direction:column;gap:13px">${cles.map(k => {
      const t = AL_TYPES[k] || { label: k, color: '#64748b' };
      return `<div class="v2-al-cat${AL2_TYPE === k ? ' on' : ''}" onclick="al2SetType('${k}')" title="Filtrer sur cette catégorie">
        <div style="display:flex;align-items:baseline;margin-bottom:5px">
          <span class="v2-al-cat-l" style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--v2-t3)">
            <span style="width:8px;height:8px;border-radius:50%;background:${t.color}"></span>${escHtml(t.label)}</span>
          <span style="margin-left:auto;font-size:11.5px;font-weight:700;color:#fff">${n[k]}</span>
        </div>
        <div class="v2-prog"><span style="width:${Math.round(n[k] / max * 100)}%;background:${t.color}"></span></div>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucune alerte active.</div>'}`;
}

// ── RAIL : ÉCHÉANCES IMMINENTES ──────────────────────────────────────

const AL2_MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function al2RenderEcheances(actives) {
  const el = document.getElementById('alEcheances');
  if (!el) return;
  const t0 = today();
  const proches = actives
    .filter(a => a.date && String(a.date).slice(0, 10) >= t0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 5);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:16px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span class="v2-blk-t" style="color:var(--v2-warn-text)">Échéances imminentes</span>
    </div>
    ${proches.length ? proches.map(a => {
      const d = new Date(String(a.date).slice(0, 10) + 'T00:00:00');
      const c = AL2_SEV_C[a.prio] || '#f59e0b';
      const t = AL_TYPES[a.type] || { label: a.type };
      return `<div class="v2-al-ech" style="--pc:${c}">
        <div class="v2-al-ech-d">
          <span class="v2-al-ech-j">${d.getDate()}</span>
          <span class="v2-al-ech-m">${AL2_MOIS[d.getMonth()]}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--v2-t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(a.titre)}</div>
          <div style="font-size:10.5px;color:var(--v2-t6)">${escHtml(t.label)}</div>
        </div>
        <span style="font-size:10.5px;font-weight:700;color:${c};white-space:nowrap">${escHtml(al2Reste(a.date))}</span>
      </div>`;
    }).join('') : '<div class="v2-blk-vide">Aucune échéance à venir.</div>'}`;
}

// ── RÉCEMMENT TRAITÉES ───────────────────────────────────────────────

// Il n'existe pas de journal des alertes traitées : on affiche celles qui ont
// été ignorées et qui sont toujours générées, c'est-à-dire prises en charge.
function al2RenderTraitees(toutes) {
  const el = document.getElementById('alTraitees');
  if (!el) return;
  const traitees = toutes.filter(a => _alDismissed.includes(a.id)).slice(0, 8);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:16px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span class="v2-blk-t">Récemment traitées</span>
      ${traitees.length ? `<button type="button" class="v2-tr-act" style="margin-left:auto" onclick="resetAlDismissed()">Tout réafficher</button>` : ''}
    </div>
    ${traitees.length ? `<div class="v2-al-res">${traitees.map(a => {
      const t = AL_TYPES[a.type] || { label: a.type };
      return `<div class="v2-al-res-i">
        <span class="v2-al-res-c">${_al2Svg('<polyline points="20 6 9 17 4 12"/>', 2.5)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;color:var(--v2-t4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(a.titre)}</div>
        </div>
        <span style="font-size:11px;color:var(--v2-t7);white-space:nowrap">${escHtml(t.label)}</span>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucune alerte traitée pour le moment.</div>'}`;
}

// ── TOUT MARQUER COMME LU ────────────────────────────────────────────

function al2ToutTraiter() {
  const actives = generateAlertes().filter(a => !_alDismissed.includes(a.id));
  if (!actives.length) { toast('Aucune alerte à traiter', 'info'); return; }
  confirmDialog(`Marquer les ${actives.length} alertes affichées comme traitées ?`, () => {
    actives.forEach(a => { if (!_alDismissed.includes(a.id)) _alDismissed.push(a.id); });
    _alSaveDismissed();
    al2Render();
    toast('Alertes marquées comme traitées', 'success');
  });
}
