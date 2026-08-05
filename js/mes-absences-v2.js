// ── MES ABSENCES — DESIGN V2 ──────────────────────────────────────────────
// Transpose la maquette « Absences & AT (RH) » à l'espace personnel du salarié :
// 4 tuiles KPI, chips de motif, tableau des absences, registre des accidents du
// travail, rail d'analyse (jours par mois / par motif / retours prévus) puis
// suivi de la déclaration AT, visites médicales et facteur Bradford.
//
// Les données (_maCache) et TOUTES les actions (openMesAbsModal, deleteMesAbs,
// openJustificatif, saveMesAbs) restent celles du script de mes-absences.html.
// Ce module ne fait que du rendu + le filtre de motif.

let MA2_FILTRE = 'all';

const MA2_IC = {
  med:    '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  injury: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  factory:'<path d="M2 20h20"/><path d="M4 20V9l5 3V9l5 3V9l5 3v8"/>',
  baby:   '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  heart:  '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  cross:  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  clip:   '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  eye:    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  alert:  '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  up:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  act:    '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  lock:   '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
};

// Palette et libellés courts, calés sur la maquette (fond sombre)
const MA2_TY = {
  maladie:        { l: 'Arrêt maladie',   court: 'Maladie',        c: '#f59e0b', ic: MA2_IC.med },
  at:             { l: 'Accident du travail', court: 'Acc. travail', c: '#ef4444', ic: MA2_IC.injury },
  maladie_pro:    { l: 'Maladie professionnelle', court: 'Mal. pro', c: '#a855f7', ic: MA2_IC.factory },
  maternite:      { l: 'Maternité / paternité', court: 'Maternité', c: '#ec4899', ic: MA2_IC.baby },
  longue_maladie: { l: 'Longue maladie',  court: 'Longue mal.',    c: '#fb7185', ic: MA2_IC.heart },
  autre:          { l: 'Autre absence',   court: 'Autre',          c: '#64748b', ic: MA2_IC.file }
};
const MA2_ORDER = ['maladie', 'at', 'maladie_pro', 'maternite', 'longue_maladie', 'autre'];
// Types donnant lieu à une visite médicale de reprise (art. R.4624-31 CT)
const MA2_VISITE_TYPES = ['at', 'maladie_pro', 'maternite', 'longue_maladie'];

function _ma2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// Icône dimensionnée en ligne (les classes dc- ne fixent pas la taille des <svg>)
function _ma2Ico(d, px, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round" style="width:${px}px;height:${px}px">${d}</svg>`;
}
function _ma2Ty(t) { return MA2_TY[t] || MA2_TY.autre; }
function _ma2Esc(s) { return (typeof escHtml === 'function') ? escHtml(s == null ? '' : String(s)) : String(s == null ? '' : s); }
function _ma2Today() { return today(); }
function _ma2Cache() { return (typeof _maCache !== 'undefined' && Array.isArray(_maCache)) ? _maCache : []; }

// Nombre de jours couverts (inclusif). Arrêt sans date de fin : compté jusqu'à aujourd'hui.
function _ma2Jours(a) {
  if (!a || !a.debut) return 0;
  const fin = a.fin || _ma2Today();
  const n = Math.round((new Date(fin) - new Date(a.debut)) / 86400000) + 1;
  return n > 0 ? n : 0;
}
function _ma2EnCours(a) {
  if (!a || !a.debut) return false;
  const t = _ma2Today();
  if (a.debut > t) return false;            // à venir : pas encore « en cours »
  return !a.fin || a.fin >= t;
}
function _ma2AVenir(a) { return !!(a && a.debut && a.debut > _ma2Today()); }

const MA2_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function _ma2Jour(d) {           // « 15 juil. »
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  if (isNaN(dt)) return d;
  return dt.getDate() + ' ' + MA2_MOIS[dt.getMonth()];
}
function _ma2Periode(a) {
  if (!a.debut) return '—';
  if (!a.fin) return _ma2Jour(a.debut) + ' →';
  if (a.fin === a.debut) return _ma2Jour(a.debut);
  const d1 = new Date(a.debut + 'T12:00:00'), d2 = new Date(a.fin + 'T12:00:00');
  if (!isNaN(d1) && !isNaN(d2) && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear())
    return d1.getDate() + '–' + d2.getDate() + ' ' + MA2_MOIS[d2.getMonth()];
  return _ma2Jour(a.debut) + ' – ' + _ma2Jour(a.fin);
}
function _ma2Plus1(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  if (isNaN(dt)) return '';
  dt.setDate(dt.getDate() + 1);
  return isoJour(dt);
}

// ══ RENDU ════════════════════════════════════════════════════════════════
function ma2Render() {
  const list = _ma2Cache();
  ma2RenderKpis(list);
  ma2RenderChips(list);
  ma2RenderTable(list);
  ma2RenderRegistre(list);
  ma2RenderChart(list);
  ma2RenderMotifs(list);
  ma2RenderRetours(list);
  ma2RenderSuiviAt(list);
  ma2RenderVisites(list);
  ma2RenderBradford(list);
}

// ── KPI ──────────────────────────────────────────────────────────────────
function ma2RenderKpis(list) {
  const el = document.getElementById('maStats');
  if (!el) return;
  const enCours = list.filter(_ma2EnCours).length;
  const atOuverts = list.filter(a => (a.type === 'at' || a.type === 'maladie_pro') && (_ma2EnCours(a) || !a.declareeCpam)).length;
  const t = _ma2Today();
  const il12 = isoJour(new Date(Date.now() - 365 * 86400000));
  const jours12 = list.filter(a => (a.fin || a.debut) >= il12 && a.debut <= t).reduce((s, a) => s + _ma2Jours(a), 0);
  const sansJust = list.filter(a => !a.justificatifPath).length;

  const k = [
    { n: enCours,    lab: 'EN COURS', sub: 'Absence' + (enCours > 1 ? 's' : '') + ' en cours', c: '#f59e0b', ic: MA2_IC.clock },
    { n: atOuverts,  lab: 'AT / MP',  sub: 'AT / maladie pro à suivre',  c: '#ef4444', ic: MA2_IC.injury },
    { n: jours12,    lab: '12 MOIS',  sub: 'Jours cumulés',              c: '#fb7185', ic: MA2_IC.cal },
    { n: sansJust,   lab: 'JUSTIFS',  sub: 'Justificatif manquant',      c: '#64748b', ic: MA2_IC.file }
  ];
  el.innerHTML = k.map(x => `<div class="dc-kpi" style="--dc-c:${x.c}">
      <div class="dc-kpi-top"><span class="dc-kpi-label">${x.lab}</span><span class="dc-kpi-ico" style="color:${x.c}">${_ma2Ico(x.ic, 16)}</span></div>
      <div class="dc-kpi-val">${x.n}</div>
      <div class="dc-kpi-sub">${x.sub}</div>
    </div>`).join('');
}

// ── Chips de motif ───────────────────────────────────────────────────────
function ma2RenderChips(list) {
  const el = document.getElementById('maChips');
  if (!el) return;
  const counts = {};
  list.forEach(a => { const k = MA2_TY[a.type] ? a.type : 'autre'; counts[k] = (counts[k] || 0) + 1; });
  const defs = [{ id: 'all', label: 'Toutes', dot: '#818cf8', n: list.length }]
    .concat(MA2_ORDER.filter(k => counts[k]).map(k => ({ id: k, label: MA2_TY[k].court, dot: MA2_TY[k].c, n: counts[k] })));
  if (!MA2_TY[MA2_FILTRE] && MA2_FILTRE !== 'all') MA2_FILTRE = 'all';
  el.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${MA2_FILTRE === f.id ? ' on' : ''}" onclick="ma2SetFiltre('${f.id}')">
      <span class="dot" style="background:${f.dot}"></span>${f.label}<span class="n">${f.n}</span></button>`).join('');
}
function ma2SetFiltre(f) {
  MA2_FILTRE = f;
  const list = _ma2Cache();
  ma2RenderChips(list);
  ma2RenderTable(list);
}

// ── Tableau des absences ─────────────────────────────────────────────────
function ma2RenderTable(list) {
  const el = document.getElementById('mesAbsList');
  if (!el) return;
  const sorted = [...list].sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
  const shown = MA2_FILTRE === 'all' ? sorted : sorted.filter(a => (MA2_TY[a.type] ? a.type : 'autre') === MA2_FILTRE);

  const head = `<div class="dc-head nb"><div class="dc-head-l">
      <span class="dc-chip" style="background:#6366f122;color:#818cf8">${_ma2Ico(MA2_IC.cal, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">HISTORIQUE</div><div class="dc-title">Mes absences</div></div>
    </div><span class="dc-pill dim">${shown.length}/${sorted.length}</span></div>`;

  if (!sorted.length) {
    el.innerHTML = `<div class="dc-card">${head}<div class="ma2-empty">
        <div class="ma2-empty-ico">${_ma2Svg(MA2_IC.cal)}</div>
        <div class="ma2-empty-t">Aucune absence déclarée</div>
        <div class="ma2-empty-s">Utilisez « Déclarer une absence » pour enregistrer un arrêt de travail.</div>
      </div></div>`;
    return;
  }
  if (!shown.length) {
    el.innerHTML = `<div class="dc-card">${head}<div class="ma2-empty">
        <div class="ma2-empty-ico">${_ma2Svg(MA2_IC.cal)}</div>
        <div class="ma2-empty-t">Aucune absence pour ce motif</div>
        <div class="ma2-empty-s">Choisissez « Toutes » pour revenir à la liste complète.</div>
      </div></div>`;
    return;
  }

  const rows = shown.map(a => {
    const ty = _ma2Ty(a.type);
    const j = _ma2Jours(a);
    const enCours = _ma2EnCours(a);
    const aVenir = _ma2AVenir(a);
    const st = aVenir ? { l: 'À venir', cls: 'dc-b-cyan' }
             : enCours ? { l: 'En cours', cls: 'dc-b-amber' }
                       : { l: 'Terminée', cls: 'dc-b-green' };
    const just = a.justificatifPath
      ? `<button type="button" class="dc-badge dc-b-green" style="cursor:pointer" onclick="openJustificatif('${_ma2Esc(a.id)}')" title="Ouvrir le justificatif">${_ma2Ico(MA2_IC.check, 12, 2.4)}Reçu</button>`
      : `<span class="dc-badge dc-b-red">${_ma2Ico(MA2_IC.cross, 12, 2.4)}Manquant</span>`;
    return `<tr>
      <td><span class="dc-badge" style="background:${ty.c}1f;color:${ty.c};border:1px solid ${ty.c}55">${_ma2Ico(ty.ic, 12, 2.2)}${_ma2Esc(ty.l)}</span></td>
      <td><span class="ma2-per">${_ma2Esc(_ma2Periode(a))}</span>${a.notes ? `<div class="ma2-l-m" title="${_ma2Esc(a.notes)}">${_ma2Esc(a.notes.length > 48 ? a.notes.slice(0, 48) + '…' : a.notes)}</div>` : ''}</td>
      <td><span class="ma2-dur">${enCours && !a.fin ? j + ' j (en cours)' : j + ' j'}</span></td>
      <td>${just}</td>
      <td><span class="dc-badge ${st.cls}"><span class="d"></span>${st.l}</span></td>
      <td><div class="ma2-acts">
        <button type="button" class="ma2-ib" onclick="openMesAbsModal('${_ma2Esc(a.id)}')" title="Modifier / ajouter un justificatif" aria-label="Modifier">${_ma2Svg(MA2_IC.pencil, 2.2)}</button>
        <button type="button" class="ma2-ib danger" onclick="deleteMesAbs('${_ma2Esc(a.id)}')" title="Supprimer" aria-label="Supprimer">${_ma2Svg(MA2_IC.trash, 2.2)}</button>
      </div></td>
    </tr>`;
  }).join('');

  el.innerHTML = `<div class="dc-card">${head}<div class="ma2-scroll"><table class="ma2-tbl">
      <thead><tr><th>Motif</th><th>Période</th><th>Durée</th><th>Justificatif</th><th>Statut</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
}

// ── Registre des accidents du travail ────────────────────────────────────
function ma2RenderRegistre(list) {
  const el = document.getElementById('maRegistre');
  if (!el) return;
  const ats = list.filter(a => a.type === 'at' || a.type === 'maladie_pro')
                  .sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
  if (!ats.length) {
    el.innerHTML = `<div class="dc-empty">Aucun accident du travail ni maladie professionnelle déclaré.</div>`;
    return;
  }
  el.innerHTML = ats.map(a => {
    const ty = _ma2Ty(a.type);
    const ouvert = _ma2EnCours(a) || !a.declareeCpam;
    const st = ouvert ? { l: 'En cours', cls: 'dc-b-amber' } : { l: 'Clôturé', cls: 'dc-b-green' };
    const det = [
      a.declareeCpam ? 'DAT transmise à la CPAM' : 'DAT non transmise',
      a.justificatifPath ? 'certificat joint' : 'certificat manquant',
      a.visiteFaite ? 'visite de reprise faite' : (a.visiteDate ? 'visite le ' + formatDate(a.visiteDate) : '')
    ].filter(Boolean).join(' · ');
    return `<div class="ma2-l" style="border-left:3px solid ${ty.c};padding-left:14px">
      <div class="ma2-l-b">
        <div class="ma2-l-t">${_ma2Esc(ty.l)} — ${formatDate(a.debut)}</div>
        <div class="ma2-l-m">${_ma2Esc(det)}</div>
      </div>
      <span class="dc-badge ${st.cls}"><span class="d"></span>${st.l}</span>
    </div>`;
  }).join('');
}

// ── Rail : jours d'absence par mois (6 derniers mois) ────────────────────
function ma2RenderChart(list) {
  const el = document.getElementById('maChart');
  const tot = document.getElementById('maChartTotal');
  if (!el) return;
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ y: d.getFullYear(), m: d.getMonth(), n: 0 });
  }
  list.forEach(a => {
    if (!a.debut) return;
    const d1 = new Date(a.debut + 'T12:00:00');
    const d2 = new Date((a.fin || _ma2Today()) + 'T12:00:00');
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return;
    for (const b of buckets) {
      const s = new Date(b.y, b.m, 1, 12), e = new Date(b.y, b.m + 1, 0, 12);
      const from = d1 > s ? d1 : s, to = d2 < e ? d2 : e;
      if (to >= from) b.n += Math.round((to - from) / 86400000) + 1;
    }
  });
  const max = Math.max(1, ...buckets.map(b => b.n));
  if (tot) tot.textContent = buckets.reduce((s, b) => s + b.n, 0) + ' j';
  el.innerHTML = buckets.map(b => `<div class="ma2-col">
      <div class="ma2-col-n">${b.n || ''}</div>
      <div class="ma2-bar${b.n ? '' : ' z'}" style="height:${b.n ? Math.max(6, Math.round(b.n / max * 100)) : 3}%"></div>
      <div class="ma2-col-l">${MA2_MOIS[b.m].replace('.', '')}</div>
    </div>`).join('');
}

// ── Rail : répartition par motif ─────────────────────────────────────────
function ma2RenderMotifs(list) {
  const el = document.getElementById('maMotifs');
  if (!el) return;
  const tot = {};
  list.forEach(a => { const k = MA2_TY[a.type] ? a.type : 'autre'; tot[k] = (tot[k] || 0) + _ma2Jours(a); });
  const keys = MA2_ORDER.filter(k => tot[k]);
  if (!keys.length) { el.innerHTML = `<div class="dc-empty">Aucun jour d'absence enregistré.</div>`; return; }
  const max = Math.max(...keys.map(k => tot[k]));
  el.innerHTML = keys.map(k => `<div class="ma2-mot">
      <div class="ma2-mot-h"><span class="ma2-mot-l">${_ma2Esc(MA2_TY[k].l)}</span><span class="ma2-mot-n">${tot[k]} j</span></div>
      <div class="al-prog-bar"><span style="width:${Math.round(tot[k] / max * 100)}%;background:${MA2_TY[k].c}"></span></div>
    </div>`).join('');
}

// ── Rail : retours prévus ────────────────────────────────────────────────
function ma2RenderRetours(list) {
  const el = document.getElementById('maRetours');
  if (!el) return;
  const ouvertes = list.filter(a => _ma2EnCours(a) || _ma2AVenir(a))
                       .sort((a, b) => (a.fin || '9999').localeCompare(b.fin || '9999'));
  if (!ouvertes.length) { el.innerHTML = `<div class="dc-empty">Aucune absence en cours : pas de reprise à prévoir.</div>`; return; }
  el.innerHTML = ouvertes.map(a => {
    const ty = _ma2Ty(a.type);
    const rep = a.fin ? _ma2Plus1(a.fin) : '';
    const tc = rep ? '#f59e0b' : '#64748b';
    const tag = rep ? 'Reprise ' + formatDate(rep) : 'À définir';
    return `<div class="ma2-l" style="border-left:3px solid ${ty.c};padding-left:14px">
      <div class="ma2-l-b"><div class="ma2-l-t">${_ma2Esc(ty.l)}</div><div class="ma2-l-m">${_ma2AVenir(a) ? 'à partir du' : 'depuis le'} ${formatDate(a.debut)}</div></div>
      <span class="dc-badge" style="background:${tc}1f;color:${tc};border:1px solid ${tc}55"><span class="d" style="background:${tc}"></span>${_ma2Esc(tag)}</span>
    </div>`;
  }).join('');
}

// ── Suivi de la déclaration d'accident du travail ────────────────────────
function ma2RenderSuiviAt(list) {
  const el = document.getElementById('maSuiviAt');
  const head = document.getElementById('maSuiviAtTitre');
  const tag = document.getElementById('maSuiviAtTag');
  if (!el) return;
  const at = list.filter(a => a.type === 'at' || a.type === 'maladie_pro')
                 .sort((a, b) => (b.debut || '').localeCompare(a.debut || ''))[0];
  if (!at) {
    if (head) head.textContent = 'Déclaration AT — aucune en cours';
    if (tag) tag.style.display = 'none';
    el.innerHTML = `<div class="dc-empty">Aucun accident du travail déclaré. En cas d'accident, prévenez votre employeur dans les 24 h et déclarez-le ici.</div>`;
    return;
  }
  const ty = _ma2Ty(at.type);
  if (head) head.textContent = ty.l + ' — ' + formatDate(at.debut);

  // Délai légal : l'employeur dispose de 48 h ouvrées pour transmettre la DAT
  const hDepuis = (Date.now() - new Date(at.debut + 'T12:00:00')) / 3600000;
  if (tag) {
    if (!at.declareeCpam && hDepuis <= 72) { tag.style.display = ''; tag.textContent = 'Délai 48 h'; }
    else if (!at.declareeCpam) { tag.style.display = ''; tag.textContent = 'DAT en attente'; }
    else { tag.style.display = 'none'; }
  }

  const steps = [
    { l: 'Absence déclarée dans INTERNALIS', ok: true, tagOk: 'Fait', tagKo: '' },
    { l: 'Certificat médical initial joint', ok: !!at.justificatifPath, tagOk: 'Reçu', tagKo: 'À joindre' },
    { l: 'Déclaration d\'accident du travail (CPAM)', ok: !!at.declareeCpam, tagOk: 'Transmise', tagKo: 'En attente' },
    { l: 'Visite médicale de reprise', ok: !!at.visiteFaite, tagOk: 'Réalisée', tagKo: at.visiteDate ? 'Le ' + formatDate(at.visiteDate) : 'À planifier' }
  ];
  el.innerHTML = steps.map(s => {
    const c = s.ok ? '#34d399' : (s.tagKo === 'En attente' ? '#f59e0b' : '#64748b');
    return `<div class="ma2-l" style="border-left:3px solid ${c};padding-left:14px">
      <div class="ma2-l-b"><div class="ma2-l-t" style="font-weight:500;color:var(--v2-t3)">${_ma2Esc(s.l)}</div></div>
      <span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}55"><span class="d" style="background:${c}"></span>${_ma2Esc(s.ok ? s.tagOk : s.tagKo)}</span>
    </div>`;
  }).join('');

  const cta = document.getElementById('maSuiviAtCta');
  if (cta) {
    cta.style.display = '';
    if (!at.justificatifPath) {
      cta.innerHTML = _ma2Svg(MA2_IC.up, 2.2) + 'Joindre le certificat médical';
      cta.onclick = () => openMesAbsModal(at.id);
    } else {
      cta.innerHTML = _ma2Svg(MA2_IC.eye, 2.2) + 'Voir le certificat joint';
      cta.onclick = () => openJustificatif(at.id);
    }
  }
}

// ── Visites médicales à planifier ────────────────────────────────────────
function ma2RenderVisites(list) {
  const el = document.getElementById('maVisites');
  if (!el) return;
  const t = _ma2Today();
  const v = list.filter(a => MA2_VISITE_TYPES.includes(a.type) && !a.visiteFaite)
                .sort((a, b) => (a.visiteDate || '9999').localeCompare(b.visiteDate || '9999'));
  if (!v.length) { el.innerHTML = `<div class="dc-empty">Aucune visite de reprise en attente.</div>`; return; }
  el.innerHTML = v.map(a => {
    const ty = _ma2Ty(a.type);
    let tag, tc;
    if (!a.visiteDate) { tag = 'À planifier'; tc = '#22d3ee'; }
    else if (a.visiteDate < t) { tag = 'Échue ' + formatDate(a.visiteDate); tc = '#ef4444'; }
    else { tag = 'Le ' + formatDate(a.visiteDate); tc = '#f59e0b'; }
    return `<div class="ma2-l" style="border-left:3px solid ${ty.c};padding-left:14px">
      <div class="ma2-l-b">
        <div class="ma2-l-t">Reprise après ${_ma2Esc(ty.court.toLowerCase())}</div>
        <div class="ma2-l-m">arrêt du ${formatDate(a.debut)}${a.fin ? ' au ' + formatDate(a.fin) : ' (en cours)'}</div>
      </div>
      <span class="dc-badge" style="background:${tc}1f;color:${tc};border:1px solid ${tc}55"><span class="d" style="background:${tc}"></span>${_ma2Esc(tag)}</span>
    </div>`;
  }).join('');
}

// ── Facteur Bradford (absences courtes et répétées, 12 derniers mois) ────
function ma2RenderBradford(list) {
  const el = document.getElementById('maBradford');
  if (!el) return;
  const il12 = isoJour(new Date(Date.now() - 365 * 86400000));
  const rec = list.filter(a => a.debut && (a.fin || a.debut) >= il12 && !_ma2AVenir(a));
  if (!rec.length) { el.innerHTML = `<div class="dc-empty">Aucune absence sur les 12 derniers mois.</div>`; return; }
  const S = rec.length;
  const D = rec.reduce((s, a) => s + _ma2Jours(a), 0);
  const score = S * S * D;
  const c = score >= 500 ? '#ef4444' : score >= 200 ? '#f59e0b' : '#34d399';
  const niveau = score >= 500 ? 'Élevé' : score >= 200 ? 'À surveiller' : 'Faible';
  el.innerHTML = `<div class="ma2-l" style="border-left:3px solid ${c};padding-left:14px">
      <div class="ma2-l-b">
        <div class="ma2-l-t">${niveau}</div>
        <div class="ma2-l-m">${S} absence${S > 1 ? 's' : ''} · ${D} jour${D > 1 ? 's' : ''} sur 12 mois</div>
      </div>
      <span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}55">${score}</span>
    </div>
    <div class="ma2-l" style="border-bottom:none;padding-left:14px">
      <div class="ma2-l-b"><div class="ma2-l-m" style="margin-top:0">Score = (nombre d'absences)² × nombre de jours. Indicateur informatif, il ne constitue pas une évaluation.</div></div>
    </div>`;
}

// ══ MODALE : segment de motif ════════════════════════════════════════════
function ma2RenderSeg() {
  const el = document.getElementById('maSeg');
  const sel = document.getElementById('maType');
  if (!el || !sel) return;
  const cur = sel.value || 'maladie';
  el.innerHTML = MA2_ORDER.map(k => `<button type="button" class="ma2-seg-o${cur === k ? ' on' : ''}" style="--oc:${MA2_TY[k].c}" data-t="${k}" onclick="ma2SetType('${k}')">${_ma2Esc(MA2_TY[k].l)}</button>`).join('');
  const md = document.querySelector('#modalMesAbs .v2-md');
  if (md) md.style.setProperty('--mc', _ma2Ty(cur).c);
}
function ma2SetType(k) {
  const sel = document.getElementById('maType');
  if (sel) sel.value = k;
  ma2RenderSeg();
}
// Reflète dans le segment la valeur posée par openMesAbsModal()
function ma2SyncSeg() { ma2RenderSeg(); }

// Nom du fichier choisi dans la zone d'upload
function ma2FileLabel() {
  const inp = document.getElementById('maFichier');
  const lbl = document.getElementById('maFileName');
  if (!inp || !lbl) return;
  const f = inp.files && inp.files[0];
  lbl.textContent = f ? f.name : 'Joindre le certificat médical (PDF, JPG)';
}

// ── Bandeaux d'information (remplacent les .card claires du V1) ──────────
function ma2Notice(kind, titre, texte) {
  const el = document.getElementById('mesAbsInfo');
  if (!el) return;
  const ic = kind === 'err' ? MA2_IC.alert : MA2_IC.lock;
  el.innerHTML = `<div class="ma2-notice ma2-notice-${kind === 'err' ? 'err' : 'warn'}">
      <span class="ma2-notice-ico">${_ma2Svg(ic, 2)}</span>
      <div><b>${_ma2Esc(titre)}</b>${_ma2Esc(texte)}</div>
    </div>`;
}

// Masque les blocs d'analyse quand aucune fiche salarié n'est reliée au compte
function ma2HideAll() {
  ['maStats', 'maFilters', 'maBodyGrid', 'maFeat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => { ma2RenderSeg(); });
