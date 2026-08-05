// ── REGISTRE DES EIG — DESIGN V2 ──────────────────────────────────────
// Reproduit la maquette « Registre EIG (dossiers) » : 4 tuiles statistiques,
// tableau du registre (date, type, résident, gravité, déclaré ARS, statut),
// puis deux panneaux — répartition par type et suivi des déclarations ARS.
// Les données et les actions restent celles de js/eig.js / js/incidents.js.

const EIG2_IC = {
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>',
  lock:  '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  pen:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  send:  '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  bars:  '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>'
};

// Couleur d'accent par gravité (maquette)
const EIG2_GC = { critique: '#ef4444', grave: '#f97316', moyen: '#f59e0b', leger: '#10b981' };
// Couleur + libellé par statut de dossier EIG (clés de eigStatut())
const EIG2_ST = {
  adeclarer: { l: 'À déclarer', c: '#f59e0b' },
  encours:   { l: 'En suivi',   c: '#22d3ee' },
  cloture:   { l: 'Clôturé',    c: '#10b981' }
};
// Couleur d'accent par type d'incident (clés de INCIDENT_TYPES)
const EIG2_TC = {
  chute: '#f97316', agression: '#ef4444', fugue: '#ef4444', violence: '#818cf8',
  medical: '#22d3ee', materiel: '#8095b4', accident: '#f59e0b', autre: '#a78bfa'
};

function _eig2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// SVG dimensionné (px) : les pastilles .dc-chip / .dc-kpi-ico du langage
// « Console Data » ne fixent pas la taille du <svg>.
function _eig2SvgN(d, px, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round" style="width:${px}px;height:${px}px">${d}</svg>`;
}
function _eig2TypeLabel(i) {
  return (typeof INCIDENT_TYPES === 'object' && INCIDENT_TYPES[i.type]) || i.type || 'Autre';
}
// Date courte façon maquette : « 19 juil. »
const EIG2_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function _eig2Court(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  if (isNaN(dt)) return '—';
  return `${String(dt.getDate()).padStart(2, '0')} ${EIG2_MOIS[dt.getMonth()]}`;
}

// ── RENDU PRINCIPAL ───────────────────────────────────────────────────
function eig2Render() {
  const all = (typeof eigList === 'function') ? eigList() : [];
  eig2Stats(all);
  eig2Corps(all);
}

// ── TUILES STATISTIQUES ───────────────────────────────────────────────
function eig2Stats(all) {
  const box = document.getElementById('eStats');
  if (!box) return;
  const td = today();
  // « 12 mois » : fenêtre glissante d'un an sur la date de l'événement
  const limite = isoJour(new Date(new Date(td).getTime() - 365 * 86400000));
  const an = all.filter(i => (i.date || '') >= limite);
  const declares = all.filter(i => i.eig.declareARS);
  const clotures = all.filter(i => eigStatut(i) === 'cloture');
  const enCours = all.filter(i => eigStatut(i) !== 'cloture');
  const enRetard = all.filter(i => eigStatut(i) === 'adeclarer' && i.date && i.date < td);

  const cells = [
    { n: an.length,       l: 'EIG (12 mois)', c: '#ef4444', ic: EIG2_IC.alert },
    { n: declares.length, l: 'Déclarés ARS',  c: '#34d399', ic: EIG2_IC.check },
    { n: enCours.length,  l: 'En cours',      c: '#f59e0b', ic: EIG2_IC.clock, x: enRetard.length ? `${enRetard.length} en retard` : '' },
    { n: clotures.length, l: 'Clôturés',      c: '#10b981', ic: EIG2_IC.lock }
  ];
  box.innerHTML = cells.map(c => `<div class="dc-kpi" style="--dc-c:${c.c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${escHtml(c.l)}</span><span class="dc-kpi-ico" style="color:${c.c}">${_eig2SvgN(c.ic, 16)}</span></div>
    <div class="dc-kpi-val">${c.n}</div>
    ${c.x ? `<div class="dc-kpi-sub">${escHtml(c.x)}</div>` : ''}
  </div>`).join('');
}

// ── CORPS : TABLEAU + PANNEAUX ────────────────────────────────────────
function eig2Corps(all) {
  const el = document.getElementById('eList');
  if (!el) return;

  if (!all.length) {
    el.innerHTML = `<div class="eig2-empty">
      ${_eig2Svg(EIG2_IC.shield)}
      <div class="eig2-empty-t">Aucun EIG enregistré</div>
      <div class="eig2-empty-s">Marquez un incident comme « Événement indésirable grave » depuis le module <a href="incidents.html" style="color:var(--v2-indigo-light)">Incidents</a> pour l'ajouter à ce registre.</div>
    </div>`;
    return;
  }

  el.innerHTML = eig2Table(all) + `<div class="eig2-duo">
    <div class="dc-card">
      <div class="dc-head">
        <div class="dc-head-l">
          <span class="dc-chip" style="background:#8b5cf622;color:#8b5cf6">${_eig2SvgN(EIG2_IC.bars, 16)}</span>
          <div style="min-width:0"><div class="dc-eyebrow">Analyse</div><div class="dc-title">Répartition par type</div></div>
        </div>
      </div>
      <div class="dc-body">${eig2ParType(all)}</div>
    </div>
    <div class="dc-card">
      <div class="dc-head">
        <div class="dc-head-l">
          <span class="dc-chip" style="background:#34d39922;color:#34d399">${_eig2SvgN(EIG2_IC.shield, 16)}</span>
          <div style="min-width:0"><div class="dc-eyebrow">Conformité</div><div class="dc-title">Suivi déclarations ARS</div></div>
        </div>
      </div>
      <div class="dc-body">${eig2ArsSuivi(all)}</div>
    </div>
  </div>`;
}

// ── TABLEAU DU REGISTRE ───────────────────────────────────────────────
function eig2Table(all) {
  const td = today();
  // Retards d'abord, puis les dossiers ouverts, puis par date décroissante
  const rang = { adeclarer: 0, encours: 1, cloture: 2 };
  const rows = all.slice().sort((a, b) =>
    (rang[eigStatut(a)] - rang[eigStatut(b)]) || (b.date || '').localeCompare(a.date || ''));

  const cols = ['Date', 'Type', 'Résident', 'Gravité', 'Déclaré ARS', 'Statut', ''];

  const corps = rows.map(i => {
    const st = eigStatut(i), stD = EIG2_ST[st] || EIG2_ST.adeclarer;
    const gc = EIG2_GC[i.gravite] || '#8095b4';
    const gl = (typeof GRAVITE_LABELS === 'object' && GRAVITE_LABELS[i.gravite]) || i.gravite || '—';
    const tc = EIG2_TC[i.type] || EIG2_TC.autre;
    const ars = !!i.eig.declareARS;
    const retard = st === 'adeclarer' && i.date && i.date < td;
    return `<tr>
      <td><span class="eig2-date">${escHtml(_eig2Court(i.date))}${i.heure ? ' · ' + escHtml(i.heure.slice(0, 5)) : ''}</span></td>
      <td><div class="eig2-ti">${escHtml(i.titre || '—')}</div><div class="eig2-ty" style="color:${tc}">${escHtml(_eig2TypeLabel(i))}</div></td>
      <td><span class="eig2-res">${escHtml(i.residentName || 'Établissement')}</span></td>
      <td><span class="dc-badge" style="background:${gc}1f;color:${gc};border:1px solid ${gc}44"><span class="d" style="background:${gc}"></span>${escHtml(gl)}</span></td>
      <td>
        ${ars
          ? `<span class="dc-badge dc-b-green"><span class="d"></span>Oui</span>`
          : `<span class="dc-badge dc-b-gray"><span class="d"></span>Non</span>`}
        ${i.eig.numeroSignalement ? `<span class="eig2-ty">n° ${escHtml(i.eig.numeroSignalement)}</span>` : ''}
      </td>
      <td>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
          <span class="dc-badge" style="background:${stD.c}1f;color:${stD.c};border:1px solid ${stD.c}44"><span class="d" style="background:${stD.c}"></span>${stD.l}</span>
          ${retard ? '<span class="dc-badge dc-b-red"><span class="d"></span>Délai dépassé</span>' : ''}
        </div>
      </td>
      <td>
        <div class="eig2-acts">
          <button type="button" class="eig2-act" style="--ac:#8095b4" title="Imprimer la fiche de signalement" onclick="printEigFiche('${escAttr(i.id)}')">${_eig2Svg(EIG2_IC.print)}</button>
          ${eigCanEdit ? `<button type="button" class="eig2-act eig2-act-l" style="--ac:#818cf8" title="Gérer la déclaration" onclick="openEigModal('${escAttr(i.id)}')">Gérer</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<div class="dc-card">
    <div class="dc-head">
      <div class="dc-head-l">
        <span class="dc-chip" style="background:#ef444422;color:#ef4444">${_eig2SvgN(EIG2_IC.alert, 16)}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Registre</div><div class="dc-title">Dossiers EIG</div></div>
      </div>
      <span class="dc-pill dim">${rows.length} dossier${rows.length > 1 ? 's' : ''}</span>
    </div>
    <div class="eig2-scroll"><table class="eig2-t">
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${corps}</tbody>
    </table></div>
  </div>`;
}

// ── RÉPARTITION PAR TYPE ──────────────────────────────────────────────
function eig2ParType(all) {
  const compte = {};
  all.forEach(i => { const k = i.type || 'autre'; compte[k] = (compte[k] || 0) + 1; });
  const lignes = Object.keys(compte).sort((a, b) => compte[b] - compte[a]);
  if (!lignes.length) return '<div class="v2-blk-vide">Aucun événement à répartir.</div>';
  const max = Math.max(...lignes.map(k => compte[k]));
  return `<div style="display:flex;flex-direction:column;gap:14px">${lignes.map(k => {
    const n = compte[k], pct = Math.round(n / max * 100);
    const c = EIG2_TC[k] || EIG2_TC.autre;
    const l = (typeof INCIDENT_TYPES === 'object' && INCIDENT_TYPES[k]) || k;
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px">
        <span class="dc-eyebrow" style="margin-bottom:0;border-left:3px solid ${c};padding-left:9px">${escHtml(l)}</span>
        <span style="font-family:var(--v2-mono,ui-monospace,monospace);font-size:13px;font-weight:700;color:${c}">${n}</span>
      </div>
      <div class="al-prog-bar"><span style="width:${pct}%;background:${c}"></span></div>
    </div>`;
  }).join('')}</div>`;
}

// ── SUIVI DES DÉCLARATIONS ARS ────────────────────────────────────────
function eig2ArsSuivi(all) {
  const td = today();
  // Les dossiers ouverts d'abord : ce panneau sert au pilotage du signalement
  const rang = { adeclarer: 0, encours: 1, cloture: 2 };
  const rows = all.slice()
    .sort((a, b) => (rang[eigStatut(a)] - rang[eigStatut(b)]) || (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6);
  if (!rows.length) return '<div class="v2-blk-vide">Aucune déclaration à suivre.</div>';

  return rows.map(i => {
    const st = eigStatut(i);
    const e = i.eig || {};
    let tag, c, ic;
    if (st === 'cloture') { tag = 'Traité'; c = '#34d399'; ic = EIG2_IC.check; }
    else if (st === 'encours') { tag = 'Déclaré'; c = '#22d3ee'; ic = EIG2_IC.send; }
    else if (i.date && i.date < td) { tag = 'En retard'; c = '#ef4444'; ic = EIG2_IC.alert; }
    else { tag = 'À déclarer'; c = '#f59e0b'; ic = EIG2_IC.clock; }

    const sub = [];
    if (e.dateDeclarationARS) sub.push('Signalé le ' + formatDate(e.dateDeclarationARS));
    else sub.push('Non déclaré à l\'ARS');
    if (e.numeroSignalement) sub.push('n° ' + e.numeroSignalement);
    if (st === 'cloture' && e.dateCloture) sub.push('clôturé le ' + formatDate(e.dateCloture));

    return `<div style="display:flex;align-items:center;gap:11px;padding:11px 12px;margin-bottom:9px;border-left:3px solid ${c};background:var(--v2-s-sub);border-radius:9px">
      <span class="dc-kpi-ico" style="color:${c};flex:none">${_eig2SvgN(ic, 16, 2.2)}</span>
      <div style="flex:1;min-width:0">
        <div class="dc-title" style="font-size:12.5px">${escHtml(i.titre || '—')}${i.residentName ? ' — ' + escHtml(i.residentName) : ''}</div>
        <div style="font-size:11px;color:var(--v2-t7);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(sub.join(' · '))}</div>
      </div>
      <span class="dc-badge" style="flex:none;background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${tag}</span>
    </div>`;
  }).join('');
}

// ── DÉLÉGATION : tous les appelants existants passent par le rendu V2 ──
if (typeof renderEig === 'function') { window.renderEig = eig2Render; }
