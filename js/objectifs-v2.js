// ── OBJECTIFS & GRILLES D'ÉVALUATION — DESIGN V2 ──
// Reproduit la maquette « Grilles d'évaluation (dossiers) » :
//   4 tuiles de statistiques (Évaluations / Résidents évalués / En progression /
//   En baisse), une rangée de puces de grille, une liste de lignes
//   (avatar · résident+date · grille · score & barre · tendance · niveau),
//   puis deux blocs : « détail par domaine » et « Progression (n évaluations) ».
//
// L'onglet « Objectifs & axes » de la même page reprend le vocabulaire de la
// maquette (mêmes tuiles, mêmes puces, mêmes barres).
//
// Les données et les actions restent celles de js/objectifs.js et
// js/evaluations.js (getEv, _evScore, _evNiveau, sbResidents, persistSuivi,
// openEvModal, openEvDetail, deleteEv, openAxeModal, saveAxe…).
// Aucune couche Supabase n'est réécrite ici.
//
// Toutes les valeurs affichées proviennent de la base : la tendance, la
// progression et le détail par domaine sont calculés sur les évaluations
// réellement enregistrées — rien n'est inventé, et faute de données le bloc
// affiche un message plutôt qu'un chiffre.

/* ══ Utilitaires ═════════════════════════════════════════════════════ */

const OB2_IC = {
  grid:  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  up:    '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  down:  '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
  eq:    '<line x1="5" y1="12" x2="19" y2="12"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M6 4h12v5a6 6 0 0 1-12 0z"/><line x1="12" y1="15" x2="12" y2="19"/><line x1="8" y1="21" x2="16" y2="21"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  chev:  '<polyline points="6 9 12 15 18 9"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit:  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  eye:   '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  info:  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
};

function ob2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// Palette de repli quand le résident n'a pas de couleur enregistrée
const OB2_PAL = ['#22d3ee', '#818cf8', '#ec4899', '#10b981', '#f59e0b', '#a78bfa', '#38bdf8', '#f87171'];
function ob2Color(r) {
  const c = typeof safeColor === 'function' ? safeColor(r && r.color, '') : (r && r.color) || '';
  if (c) return c;
  const s = String((r && r.id) || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return OB2_PAL[h % OB2_PAL.length];
}
function ob2Ini(r) {
  return (typeof initials === 'function' ? initials(r?.prenom, r?.nom) : '?') || '?';
}
// Accent de progression, version sombre (le bleu/vert clair de la V1 est illisible ici)
function ob2Pct(p) { return p >= 100 ? '#10b981' : '#38bdf8'; }
function ob2Clamp(v) { return Math.max(0, Math.min(100, +v || 0)); }
function ob2Esc(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s); }

function ob2Kpi(n, label, color, icon) {
  return `<div class="ob2-kpi" style="--c:${color}">
    <span class="ob2-kpi-ico">${ob2Svg(icon)}</span>
    <div style="min-width:0"><div class="ob2-kpi-n">${n}</div><div class="ob2-kpi-l">${ob2Esc(label)}</div></div>
  </div>`;
}

/* ══ ONGLET GRILLES D'ÉVALUATION ═════════════════════════════════════ */

function ob2Evs() { return (typeof getEv === 'function' ? getEv() : []) || []; }
function ob2Residents() { return (typeof sbResidents === 'function' ? sbResidents() : []) || []; }
function ob2Grille(id) { return (typeof EV_GRILLES !== 'undefined' && EV_GRILLES[id]) || null; }
function ob2Score(e) { return typeof _evScore === 'function' ? _evScore(e) : 0; }
function ob2Niveau(e) { return typeof _evNiveau === 'function' ? _evNiveau(e.grille, ob2Score(e)) : null; }

// Évaluation précédente comparable (même résident, même grille, date antérieure)
function ob2Prec(e, all) {
  return all
    .filter(x => x.id !== e.id && x.grille === e.grille && String(x.residentId) === String(e.residentId)
      && String(x.date || '') < String(e.date || ''))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
}

// Tendance : delta de score. Sur SERAFIN-PH la lecture est inversée
// (un score qui monte = des besoins qui augmentent).
function ob2Trend(e, all) {
  const p = ob2Prec(e, all);
  if (!p) return null;
  const d = ob2Score(e) - ob2Score(p);
  const mieux = e.grille === 'serafin' ? d < 0 : d > 0;
  return {
    d, mieux,
    txt: d === 0 ? '=' : (d > 0 ? '+' : '') + d,
    c: d === 0 ? '#94a3b8' : (mieux ? '#34d399' : '#fca5a5'),
    ic: d === 0 ? OB2_IC.eq : (d > 0 ? OB2_IC.up : OB2_IC.down)
  };
}

function ob2RenderEvStats(all) {
  const el = document.getElementById('evStats');
  if (!el) return;
  let up = 0, down = 0;
  all.forEach(e => { const t = ob2Trend(e, all); if (!t || t.d === 0) return; t.mieux ? up++ : down++; });
  const nbRes = new Set(all.map(e => e.residentId).filter(Boolean)).size;
  el.innerHTML =
    ob2Kpi(all.length, 'Évaluations', '#a5b4fc', OB2_IC.grid) +
    ob2Kpi(nbRes, 'Résidents évalués', '#818cf8', OB2_IC.users) +
    ob2Kpi(up, 'En progression', '#10b981', OB2_IC.up) +
    ob2Kpi(down, 'En baisse', '#ef4444', OB2_IC.down);
}

function ob2RenderEvChips(all) {
  const el = document.getElementById('ev2Chips');
  if (!el) return;
  const cur = document.getElementById('evGrille')?.value || '';
  const defs = [{ id: '', label: 'Toutes', c: '#818cf8' }].concat(
    Object.entries(typeof EV_GRILLES !== 'undefined' ? EV_GRILLES : {})
      .map(([id, g]) => ({ id, label: g.short, c: g.color })));
  el.innerHTML = defs.map(f => {
    const n = f.id ? all.filter(e => e.grille === f.id).length : all.length;
    return `<button type="button" class="v2-chip-f${cur === f.id ? ' on' : ''}" onclick="ob2SetGrille('${f.id}')" aria-pressed="${cur === f.id}">
      <span class="dot" style="background:${f.c}"></span>${ob2Esc(f.label)}<span class="n">${n}</span></button>`;
  }).join('');
}

// Les puces pilotent le <select> masqué : js/evaluations.js reste la source de vérité
function ob2SetGrille(v) {
  const sel = document.getElementById('evGrille');
  if (!sel) return;
  sel.value = v;
  sel.dispatchEvent(new Event('change'));
}

function ob2EvRow(e, all, residents) {
  const g = ob2Grille(e.grille);
  const r = residents.find(x => String(x.id) === String(e.residentId));
  const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : 'Résident inconnu';
  const col = ob2Color(r);
  const gc = g?.color || '#818cf8';
  const score = ob2Score(e), max = g?.scoreMax || 100;
  const pct = max ? Math.round(score / max * 100) : 0;
  const niv = ob2Niveau(e);
  const tr = ob2Trend(e, all);
  const canEdit = ob2CanEditEv();
  return `<div class="ob2-ev" role="button" tabindex="0" onclick="openEvDetail('${e.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEvDetail('${e.id}')}"
      aria-label="Évaluation ${ob2Esc(g?.short || e.grille)} de ${ob2Esc(nom)}">
    <span class="ob2-ev-av" style="background:${col}">${ob2Ini(r)}</span>
    <div class="ob2-ev-id">
      <div class="ob2-ev-nom" title="${ob2Esc(nom)}">${ob2Esc(nom)}</div>
      <div class="ob2-ev-date">${typeof formatDate === 'function' ? formatDate(e.date) : ob2Esc(e.date)}</div>
    </div>
    <span class="ob2-ev-gr" style="color:${gc};background:${gc}1c">${ob2Esc(g?.short || e.grille)}</span>
    <div class="ob2-ev-score">
      <div class="ob2-ev-score-h"><span class="ob2-ev-score-l">Score</span>
        <span class="ob2-ev-score-v" style="color:${gc}">${score} / ${max}</span></div>
      <div class="v2-prog"><span style="width:${pct}%;background:${gc}"></span></div>
    </div>
    <span class="ob2-ev-tr" style="color:${tr ? tr.c : '#6f86ab'}">${tr ? ob2Svg(tr.ic, 2.4) + tr.txt : '—'}</span>
    ${niv ? `<span class="ob2-ev-niv" style="color:${niv.color};background:${niv.color}1c">${ob2Esc(niv.label)}</span>` : ''}
    ${canEdit ? `<span class="ob2-ev-act">
      <button type="button" class="ob2-ico-btn" title="Modifier l'évaluation" aria-label="Modifier l'évaluation"
        onclick="event.stopPropagation();openEvModal('${e.id}')">${ob2Svg(OB2_IC.edit)}</button>
      <button type="button" class="ob2-ico-btn danger" title="Supprimer l'évaluation" aria-label="Supprimer l'évaluation"
        onclick="event.stopPropagation();deleteEv('${e.id}')">${ob2Svg(OB2_IC.trash)}</button></span>` : ''}
  </div>`;
}

function ob2CanEditEv() {
  const s = typeof Auth !== 'undefined' ? Auth.getSession() : null;
  if (!s) return false;
  if (['admin', 'moderator', 'superadmin'].includes(s.role)) return true;
  return typeof canEditResidents === 'function' ? !!canEditResidents(s.userId) : false;
}

// Détail par domaine de l'évaluation la plus récente affichée
function ob2Domaines(e) {
  const g = ob2Grille(e.grille);
  if (!g) return [];
  const sc = e.scores || {};
  const out = [];
  if (e.grille === 'barthel') {
    (g.dimensions[0]?.items || []).forEach(it => {
      if (sc[it.id] == null) return;
      const mx = Math.max(...(it.opts || []).map(o => o.v), 1);
      out.push({ label: it.label, val: Number(sc[it.id]), max: mx });
    });
  } else {
    const mx = Math.max(...(g.scaleItems || []).map(s => s.val), 1);
    g.dimensions.forEach(dim => {
      const vals = dim.items.filter(it => sc[it.id] != null).map(it => Number(sc[it.id]));
      if (!vals.length) return;
      const moy = vals.reduce((a, b) => a + b, 0) / vals.length;
      out.push({ label: dim.label, val: Math.round(moy * 10) / 10, max: mx });
    });
  }
  return out.map(d => {
    const ratio = d.max ? d.val / d.max : 0;
    const bon = e.grille === 'serafin' ? 1 - ratio : ratio;
    return { ...d, c: bon >= .8 ? '#10b981' : bon >= .5 ? '#f59e0b' : '#ef4444', pct: Math.round(ratio * 100) };
  });
}

function ob2BlocDomaines(e, residents) {
  const g = ob2Grille(e.grille);
  const r = residents.find(x => String(x.id) === String(e.residentId));
  const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : 'Résident inconnu';
  const doms = ob2Domaines(e);
  const score = ob2Score(e), max = g?.scoreMax || 100;
  return `<div class="v2-blk">
    <div class="v2-blk-h">
      <span class="v2-blk-t">${ob2Esc(g?.short || e.grille)} — ${ob2Esc(nom)} · détail par domaine</span>
      <span class="ob2-blk-val">${score} / ${max}</span>
    </div>
    ${doms.length ? `<div class="ob2-dom">${doms.map(d => `<div>
      <div class="ob2-dom-h"><span class="ob2-dom-l">${ob2Esc(d.label)}</span>
        <span class="ob2-dom-v" style="color:${d.c}">${d.val}/${d.max}</span></div>
      <div class="v2-prog v2-bar-sm"><span style="width:${d.pct}%;background:${d.c}"></span></div>
    </div>`).join('')}</div>`
      : '<div class="v2-blk-vide">Aucun item renseigné sur cette évaluation.</div>'}
  </div>`;
}

function ob2BlocProgression(e, all) {
  const serie = all
    .filter(x => x.grille === e.grille && String(x.residentId) === String(e.residentId))
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(-5);
  if (serie.length < 2) {
    return `<div class="v2-blk">
      <div class="v2-blk-h"><span class="v2-blk-t">Progression</span></div>
      <div class="v2-blk-vide">Il faut au moins deux évaluations de la même grille pour tracer une progression.</div>
    </div>`;
  }
  const vals = serie.map(ob2Score);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const first = vals[0], last = vals[vals.length - 1];
  const delta = last - first;
  const d1 = new Date(serie[0].date), d2 = new Date(serie[serie.length - 1].date);
  const mois = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  const lbl = d => new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  return `<div class="v2-blk">
    <div class="v2-blk-h"><span class="v2-blk-t">Progression (${serie.length} évaluation${serie.length > 1 ? 's' : ''})</span></div>
    <div class="ob2-chart">
      ${serie.map((s, i) => {
        const h = mx === mn ? 70 : Math.round(28 + (vals[i] - mn) / (mx - mn) * 72);
        return `<div class="ob2-chart-col">
          <div class="ob2-chart-v">${vals[i]}</div>
          <div class="ob2-chart-bar" style="height:${h}%"></div>
          <div class="ob2-chart-l">${ob2Esc(lbl(s.date))}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="ob2-chart-note">Tendance : ${delta > 0 ? '+' : ''}${delta} point${Math.abs(delta) > 1 ? 's' : ''}${mois > 0 ? ` sur ${mois} mois` : ' sur la période'}.</div>
  </div>`;
}

function ob2RenderEv() {
  const container = document.getElementById('evList');
  if (!container) return;
  const all = ob2Evs();
  const residents = ob2Residents();
  ob2RenderEvStats(all);
  ob2RenderEvChips(all);

  const rid = document.getElementById('evResident')?.value || '';
  const gf = document.getElementById('evGrille')?.value || '';
  const list = all
    .filter(e => (!rid || String(e.residentId) === String(rid)) && (!gf || e.grille === gf))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  if (!list.length) {
    container.innerHTML = `<div class="v2-blk"><div class="v2-blk-h"><span class="v2-blk-t">Évaluations</span></div>
      <div class="v2-blk-vide">${rid || gf ? 'Aucune évaluation ne correspond à ce filtre.' : 'Aucune évaluation enregistrée. Créez une évaluation MIF, Barthel ou SERAFIN-PH pour suivre l’autonomie des résidents.'}</div></div>`;
    return;
  }

  container.innerHTML =
    `<div class="ob2-evlist">${list.map(e => ob2EvRow(e, all, residents)).join('')}</div>
     <div class="ob2-bottom">${ob2BlocDomaines(list[0], residents)}${ob2BlocProgression(list[0], all)}</div>`;
}

/* ══ ONGLET OBJECTIFS & AXES ═════════════════════════════════════════ */

function ob2Tpl() { return typeof objTemplates === 'function' ? objTemplates() : []; }
function ob2Suivi(r, id) { return typeof getSuivi === 'function' ? getSuivi(r, id) : {}; }
function ob2Axes(sv) { return typeof axesOf === 'function' ? axesOf(sv) : (Array.isArray(sv.axes) ? sv.axes : []); }
function ob2ObjPct(sv) { return typeof objPct === 'function' ? objPct(sv) : null; }
function ob2Nom(r) { return `${r.prenom || ''} ${r.nom || ''}`.trim(); }
function ob2Edit() { return typeof _obCanEdit !== 'undefined' && _obCanEdit; }

const OB2_STATUT_C = {
  non_commence: '#94a3b8', en_cours: '#f59e0b', atteint: '#10b981', abandonne: '#ef4444'
};

// Anneau de progression (piste sombre — jamais de gris clair sur fond nuit)
function ob2Ring(pct, size) {
  const s = size || 54, r = (s / 2) - 5, circ = 2 * Math.PI * r;
  const known = pct != null;
  const p = known ? ob2Clamp(pct) : 0;
  const col = known ? ob2Pct(p) : 'rgba(255,255,255,.18)';
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="flex-shrink:0" role="img"
      aria-label="Progression ${known ? p + ' %' : 'non mesurée'}">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="6"/>
    ${known ? `<circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${(p / 100 * circ).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"/>` : ''}
    <text x="${s / 2}" y="${s / 2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.round(s / 3.9)}"
      font-weight="800" fill="${known ? col : '#6f86ab'}" font-family="Space Grotesk, Inter, sans-serif">${known ? p + '%' : '—'}</text>
  </svg>`;
}

// Mini-courbe d'évolution d'un axe
function ob2Spark(histo) {
  const h = (Array.isArray(histo) ? histo : []).slice(-20);
  if (h.length < 2) return '';
  const w = 62, ht = 20;
  const y = p => (ht - 3 - ob2Clamp(p) / 100 * (ht - 6)).toFixed(1);
  const pts = h.map((e, i) => `${(i / (h.length - 1) * (w - 4) + 2).toFixed(1)},${y(e.p)}`).join(' ');
  return `<svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}" aria-hidden="true" style="flex-shrink:0">
    <polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${w - 2}" cy="${y(h[h.length - 1].p)}" r="2.2" fill="#22d3ee"/></svg>`;
}

/* ── Rendu principal de l'onglet ─────────────────────────────────────── */
function ob2Render() {
  const selRes = document.getElementById('obResident');
  const el = document.getElementById('obList');
  if (!selRes || !el) return;
  const rid = selRes.value;
  const fStatut = document.getElementById('obFilterStatut')?.value || '';
  const tpl = ob2Tpl();
  const tous = (typeof _obResidents !== 'undefined' ? _obResidents : []) || [];
  const scope = rid ? tous.filter(r => String(r.id) === String(rid))
    : (typeof residentsAvecObjectifs === 'function' ? residentsAvecObjectifs() : []);

  // Statistiques du périmètre affiché
  let tot = 0, atteints = 0, axesTot = 0, pctSum = 0, pctN = 0;
  scope.forEach(r => (r.objectifs || []).forEach(id => {
    if (!tpl.find(t => String(t.id) === String(id))) return;
    const sv = ob2Suivi(r, id);
    tot++;
    if (sv.statut === 'atteint') atteints++;
    axesTot += ob2Axes(sv).length;
    const p = ob2ObjPct(sv);
    if (p != null) { pctSum += p; pctN++; }
  }));
  const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
  set('obStatObjectifs', tot);
  set('obStatProgression', pctN ? Math.round(pctSum / pctN) + '%' : '—');
  set('obStatAxes', axesTot);
  set('obStatAtteints', atteints);

  // Bouton « Nouvel objectif » de la barre du haut : réservé aux éditeurs,
  // et sans objet tant qu'aucun résident n'est sélectionné.
  const btn = document.getElementById('btnGererObj');
  if (btn) btn.style.display = (ob2Edit() && rid) ? '' : 'none';

  if (!rid) { el.innerHTML = ob2Overview(scope, tpl); return; }

  const r = scope[0];
  if (!r) { el.innerHTML = ob2Vide('Résident introuvable.'); return; }

  const resObjs = (r.objectifs || []).map(id => tpl.find(o => String(o.id) === String(id))).filter(Boolean);
  const collapsed = typeof _obCollapsed !== 'undefined' ? _obCollapsed : new Set();
  const allCollapsed = resObjs.length && resObjs.every(o => collapsed.has(String(o.id)));
  const barre = `<div class="ob2-resbar">
    <span class="ob2-resbar-t">${ob2Esc(ob2Nom(r))}</span>
    <span class="ob2-resbar-s">${resObjs.length} objectif${resObjs.length > 1 ? 's' : ''}</span>
    <span class="ob2-resbar-act">
      <button type="button" class="v2-btn v2-btn-sm" onclick="obSelectResident('')">← Vue d'ensemble</button>
      ${resObjs.length ? `<button type="button" class="v2-btn v2-btn-sm" onclick="obToggleAllAxes()">${allCollapsed ? 'Déplier les axes' : 'Réduire les axes'}</button>` : ''}
      ${ob2Edit() ? `<button type="button" class="v2-btn v2-btn-sm" onclick="openCatalogue()">${ob2Svg(OB2_IC.plus, 2.4)}Objectif</button>` : ''}
    </span>
  </div>`;

  if (!resObjs.length) {
    el.innerHTML = barre + ob2Ppa(r) + ob2Vide(
      `Aucun objectif n'est encore assigné à <strong>${ob2Esc(ob2Nom(r))}</strong>.` +
      (ob2Edit() ? '<br>Utilisez « Objectif » ci-dessus pour lui en créer un.'
                 : '<br>Un membre de l\'équipe éducative peut lui en assigner depuis cette page.'));
    return;
  }
  const cards = resObjs
    .filter(o => !fStatut || (ob2Suivi(r, o.id).statut || 'non_commence') === fStatut)
    .map(o => ob2ObjCard(r, o));
  el.innerHTML = barre + ob2Ppa(r) +
    (cards.length ? `<div class="ob2-objs">${cards.join('')}</div>` : ob2Vide('Aucun objectif ne correspond à ce filtre.'));
}

function ob2Vide(html) {
  return `<div class="v2-blk" style="text-align:center;padding:34px 20px">
    <span style="display:inline-flex;color:var(--v2-t8);width:30px;height:30px">${ob2Svg(OB2_IC.target)}</span>
    <div class="v2-blk-vide" style="margin-top:10px">${html}</div></div>`;
}

/* ── Vue d'ensemble ──────────────────────────────────────────────────── */
function ob2Overview(residents, tpl) {
  if (!residents.length) {
    return ob2Vide('Aucun résident n\'a encore d\'objectif assigné.<br>Choisissez un résident dans la liste ci-dessus pour commencer — le guide explique le fonctionnement.');
  }
  const rangOfSafe = p => typeof rangOf === 'function' ? rangOf(p) : '—';
  const cards = residents.map(r => {
    const objs = (r.objectifs || []).map(id => tpl.find(o => String(o.id) === String(id))).filter(Boolean);
    if (!objs.length) return '';
    let pctSum = 0, pctN = 0, atteints = 0, axesActifs = 0, lastMaj = '';
    const badges = objs.map(o => {
      const sv = ob2Suivi(r, o.id);
      const p = ob2ObjPct(sv);
      if (p != null) { pctSum += p; pctN++; }
      ob2Axes(sv).forEach(a => {
        if (ob2Clamp(a.progression) < 100) axesActifs++;
        if (a.dateMaj && a.dateMaj > lastMaj) lastMaj = a.dateMaj;
      });
      if (sv.dateMaj && sv.dateMaj > lastMaj) lastMaj = sv.dateMaj;
      if (sv.statut === 'atteint') {
        atteints++;
        return `<span class="v2-badge v2-b-ok" title="${ob2Esc(o.name)} — atteint">${ob2Esc(o.name)}</span>`;
      }
      if (sv.statut === 'en_cours') {
        return `<span class="v2-badge v2-b-warn" title="${ob2Esc(o.name)} — en cours">${ob2Esc(o.name)}${p != null ? ` · ${p}%` : ''}</span>`;
      }
      return `<span class="v2-badge v2-b-neutral" title="${ob2Esc(o.name)}">${ob2Esc(o.name)}</span>`;
    }).join('');
    const global = pctN ? Math.round(pctSum / pctN) : null;
    let gauge = '';
    if (global != null) {
      const rg = rangOfSafe(global);
      const fill = rg === 'S' ? 4 : Math.round((global % 25) / 25 * 4);
      const col = ob2Pct(global);
      gauge = `<span class="ob2-rgauge"><b>${rg}</b><span class="seg">${[0, 1, 2, 3]
        .map(i => `<i${i < fill ? ` style="background:${col}"` : ''}></i>`).join('')}</span><b>${rg === 'S' ? '★' : rangOfSafe(global + 25)}</b></span>`;
    }
    let majTxt = '';
    if (lastMaj) {
      const j = Math.floor((Date.now() - new Date(lastMaj).getTime()) / 86400000);
      majTxt = j <= 0 ? 'maj aujourd’hui' : j === 1 ? 'maj hier' : `maj il y a ${j} j`;
    }
    return `<button type="button" class="ob2-res" onclick="obSelectResident('${r.id}')" aria-label="Voir les objectifs de ${ob2Esc(ob2Nom(r))}">
      <div class="ob2-res-h">
        ${ob2Ring(global, 54)}
        <div style="min-width:0">
          <div class="ob2-res-eyebrow">Résident · Niveau ${global != null ? rangOfSafe(global) : '—'}</div>
          <div class="ob2-res-nom">${ob2Esc(ob2Nom(r))}</div>
          <div class="ob2-res-meta">${objs.length} objectif${objs.length > 1 ? 's' : ''} · ${atteints} atteint${atteints > 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="ob2-res-bdgs">${badges}</div>
      <div class="ob2-res-foot">${gauge}<span>${axesActifs} axe${axesActifs > 1 ? 's' : ''} actif${axesActifs > 1 ? 's' : ''}</span>${majTxt ? `<span>·</span><span>${majTxt}</span>` : ''}</div>
    </button>`;
  }).join('');
  return `<div class="v2-blk-vide" style="margin-bottom:12px">Cliquez sur un résident pour définir ses axes de travail et suivre sa progression.</div>
    <div class="ob2-resgrid">${cards}</div>`;
}

/* ── Objectifs du projet personnalisé (avenant PPE), lecture seule ───── */
function ob2Ppa(r) {
  const p = typeof obPpaOf === 'function' ? obPpaOf(r) : null;
  if (!p) return '';
  const rows = [];
  Object.entries(p.sections || {}).forEach(([domId, s]) =>
    (s.objectifs || []).forEach(o => { if ((o.objectif || '').trim()) rows.push({ domId, o }); }));
  if (!rows.length) return '';
  const doms = typeof OB_PPA_DOMAINES !== 'undefined' ? OB_PPA_DOMAINES : {};
  const st = { brouillon: ['Brouillon', 'v2-b-warn'], actif: ['Actif', 'v2-b-ok'], termine: ['Terminé', 'v2-b-neutral'] }[p.statut]
    || [p.statut || '—', 'v2-b-neutral'];
  const dateAv = p.dateRedaction ? (typeof formatDate === 'function' ? formatDate(p.dateRedaction) : p.dateRedaction) : '';
  return `<div class="v2-blk ob2-ppa">
    <div class="v2-blk-h">
      <span class="v2-blk-t">Objectifs du projet personnalisé</span>
      <span class="v2-badge ${st[1]}">${ob2Esc(st[0])}</span>
      <span style="font-size:11.5px;color:var(--v2-t7)">avenant${dateAv ? ' du ' + dateAv : ''} · ${rows.length} objectif${rows.length > 1 ? 's' : ''}</span>
      <a class="v2-blk-lien" href="ppe.html">Ouvrir l'avenant →</a>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${rows.map(({ domId, o }) => {
        const d = doms[domId] || { label: domId };
        return `<div class="ob2-ppa-row">
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span class="ob2-ppa-dom">${ob2Esc(d.label)}</span>
            <span class="ob2-ppa-txt">${ob2Esc(o.objectif)}</span>
            ${o.echeance ? `<span style="font-size:11px;color:var(--v2-t7);white-space:nowrap">${typeof formatDate === 'function' ? formatDate(o.echeance) : ob2Esc(o.echeance)}</span>` : ''}
          </div>
          ${(o.moyens || '').trim() ? `<div class="ob2-ppa-meta">Moyens : ${ob2Esc(o.moyens)}</div>` : ''}
          ${ob2SpChips(o)}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function ob2SpChips(o) {
  const codes = (o.serafin || []).filter(c => typeof spCodeValide === 'function' && spCodeValide(c));
  if (!codes.length) return '';
  return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px">${codes.map(c => {
    const besoin = typeof spEstBesoin === 'function' ? spEstBesoin(c) : String(c).charAt(0) === '1';
    const label = typeof spLabel === 'function' ? spLabel(c) : c;
    return `<span class="v2-badge ${besoin ? 'v2-b-info' : 'v2-b-ok'}" title="${ob2Esc(label)}">${ob2Esc(c)}</span>`;
  }).join('')}</div>`;
}

/* ── Carte d'un objectif ─────────────────────────────────────────────── */
function ob2ObjCard(r, o) {
  const sv = ob2Suivi(r, o.id);
  const statuts = typeof OBJ_STATUTS !== 'undefined' ? OBJ_STATUTS : {};
  const stKey = sv.statut || 'non_commence';
  const stC = OB2_STATUT_C[stKey] || '#94a3b8';
  const axes = ob2Axes(sv);
  const pct = ob2ObjPct(sv);
  const collapsed = (typeof _obCollapsed !== 'undefined' ? _obCollapsed : new Set()).has(String(o.id));
  const col = pct != null ? ob2Pct(pct) : 'rgba(255,255,255,.2)';

  const statutUi = ob2Edit()
    ? `<select class="ob2-statut" onchange="setObjStatut('${o.id}', this.value)"
        aria-label="Statut de l'objectif ${ob2Esc(o.name)}" style="border-color:${stC};color:${stC}">
        ${Object.entries(statuts).map(([k, v]) => `<option value="${k}"${stKey === k ? ' selected' : ''}>${ob2Esc(v.label)}</option>`).join('')}
      </select>`
    : `<span class="v2-badge" style="color:${stC};background:${stC}22">${ob2Esc((statuts[stKey] || {}).label || stKey)}</span>`;

  const echBdg = typeof echBadge === 'function' ? echBadge(sv.echeance, sv.statut) : '';
  const echBdgV2 = echBdg.includes('badge-red') ? '<span class="v2-badge v2-b-danger">En retard</span>'
    : echBdg.includes('badge-amber') ? `<span class="v2-badge v2-b-warn">${(echBdg.match(/J−\d+/) || [''])[0]}</span>` : '';
  const ech = ob2Edit()
    ? `<span style="display:inline-flex;align-items:center;gap:7px">Échéance
        <input type="date" class="ob2-date" value="${sv.echeance || ''}" onchange="setObjEcheance('${o.id}', this.value)"
          aria-label="Échéance de l'objectif ${ob2Esc(o.name)}"/></span>${echBdgV2}`
    : (sv.echeance ? `<span>Échéance : ${typeof formatDate === 'function' ? formatDate(sv.echeance) : sv.echeance}</span>${echBdgV2}` : '');

  const cta = ob2Edit() && pct === 100 && sv.statut !== 'atteint'
    ? `<button type="button" class="v2-btn v2-btn-sm" style="margin-top:10px;color:#0a1728;background:#10b981;border:none"
        onclick="setObjStatut('${o.id}','atteint')">Tous les axes à 100 % — marquer atteint</button>` : '';

  const rangTxt = typeof rangLabel === 'function' ? rangLabel(pct) : '';

  return `<div class="ob2-obj">
    <div class="ob2-obj-h">
      <div class="ob2-obj-gauge">
        <div class="ob2-obj-pct" id="ringtxt-${o.id}" style="color:${col}">${pct != null ? pct + '%' : '—'}</div>
        <div class="ob2-obj-pctl">Progression</div>
        <div class="v2-prog"><span id="ringbar-${o.id}" style="width:${pct || 0}%;background:${col}"></span></div>
      </div>
      <div class="ob2-obj-main">
        <div class="ob2-obj-eyebrow">Objectif personnalisé</div>
        <div class="ob2-obj-t">
          <span class="ob2-obj-nom">${ob2Esc(o.name)}</span>
          ${statutUi}
          <span class="ob2-rang" id="rang-${o.id}">${ob2Esc(rangTxt)}</span>
        </div>
        ${o.description ? `<div class="ob2-obj-desc">${ob2Esc(o.description)}</div>` : ''}
        <div class="ob2-obj-meta">${ech}</div>
        ${sv.note ? `<div class="ob2-obj-desc">${ob2Esc(sv.note)}</div>` : ''}
        ${sv.dateMaj ? `<div style="font-size:11px;color:var(--v2-t8);margin-top:6px">Mis à jour le ${typeof formatDate === 'function' ? formatDate(sv.dateMaj) : sv.dateMaj}</div>` : ''}
        ${cta}
      </div>
    </div>
    <div class="ob2-obj-b">
      <div class="ob2-sec">
        <button type="button" class="ob2-sec-t" onclick="obToggleAxes('${o.id}')" aria-expanded="${collapsed ? 'false' : 'true'}">
          <span id="axchev-${o.id}" style="display:inline-flex;transition:transform .2s;transform:rotate(${collapsed ? '-90deg' : '0deg'})">${ob2Svg(OB2_IC.chev, 2.4)}</span>
          Axes de travail (${axes.length})<span class="ob2-sec-sum" id="axsum-${o.id}">${collapsed && pct != null ? ` · ${pct}%` : ''}</span>
        </button>
        ${ob2Edit() ? `<span class="ob2-sec-act"><button type="button" class="v2-btn v2-btn-sm" onclick="openAxeModal('${o.id}')">${ob2Svg(OB2_IC.plus, 2.4)}Ajouter un axe</button></span>` : ''}
      </div>
      <div class="ob2-axes" id="axlist-${o.id}" style="display:${collapsed ? 'none' : 'flex'}">
        ${axes.length ? axes.map((a, i) => ob2AxeRow(o, a, i)).join('')
          : `<div class="v2-blk-vide">Aucun axe de travail défini.${ob2Edit() ? ' Découpez cet objectif en étapes concrètes et mesurables — des suggestions vous seront proposées.' : ''}</div>`}
      </div>
      ${ob2EvalsSection(o, sv, axes)}
    </div>
  </div>`;
}

function ob2AxeRow(o, a, idx) {
  const p = ob2Clamp(a.progression);
  const col = ob2Pct(p);
  const late = a.echeance && typeof today === 'function' && a.echeance < today() && p < 100;
  const fd = d => typeof formatDate === 'function' ? formatDate(d) : d;
  return `<div class="ob2-axe" style="--ac:${col}">
    <div class="ob2-axe-eyebrow">Module ${String(idx + 1).padStart(2, '0')}${a.echeance ? ` · Échéance ${fd(a.echeance)}` : ''}${a.responsable ? ` · ${ob2Esc(a.responsable)}` : ''}</div>
    <div class="ob2-axe-top">
      <span class="ob2-axe-nom">${ob2Esc(a.nom)}</span>
      ${late ? '<span class="v2-badge v2-b-danger">En retard</span>' : ''}
      ${ob2Spark(a.histo)}
      <span class="ob2-axe-pct" id="axpct-${o.id}-${a.id}" style="color:${col}">${p}%</span>
      ${ob2Edit() ? `<button type="button" class="ob2-ico-btn" title="Modifier l'axe" aria-label="Modifier l'axe"
          onclick="openAxeModal('${o.id}','${a.id}')">${ob2Svg(OB2_IC.edit)}</button>
        <button type="button" class="ob2-ico-btn danger" title="Supprimer l'axe" aria-label="Supprimer l'axe"
          onclick="deleteAxe('${o.id}','${a.id}')">${ob2Svg(OB2_IC.trash)}</button>` : ''}
    </div>
    ${a.note ? `<div class="ob2-axe-note">${ob2Esc(a.note)}</div>` : ''}
    ${ob2Steps(o, a, p)}
    ${a.dateMaj ? `<div class="ob2-axe-maj">Dernier pointage le ${fd(a.dateMaj)}</div>` : ''}
  </div>`;
}

// Paliers d'autonomie : 5 niveaux cliquables (0→4 = 0/25/50/75/100 %)
function ob2Niv(i) {
  const n = typeof NIV_STEP !== 'undefined' ? NIV_STEP : ['Non acquis', 'Aide importante', 'Aide partielle', 'Avec supervision', 'Autonome'];
  return n[i] || '';
}
const OB2_STEP_OFF = 'rgba(255,255,255,.1)';

function ob2Steps(o, a, p) {
  const cur = ob2Clamp(p);
  const clickable = ob2Edit();
  let html = `<div id="steprow-${o.id}-${a.id}" class="ob2-steps"${clickable ? ' role="radiogroup"' : ''} aria-label="Niveau d'autonomie de l'axe ${ob2Esc(a.nom)}">`;
  for (let i = 0; i < 5; i++) {
    const np = i * 25, reached = cur >= np;
    const bg = reached ? ob2Pct(np) : OB2_STEP_OFF;
    const inter = clickable
      ? `role="radio" tabindex="0" aria-checked="${cur === np}" aria-label="${ob2Esc(ob2Niv(i))} (${np} %)"
         onclick="setAxeLevel('${o.id}','${a.id}',${i})"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setAxeLevel('${o.id}','${a.id}',${i})}"`
      : 'aria-hidden="true"';
    html += `<div class="ob2-step-c">
      <button type="button" class="ob2-step" data-lvl="${i}" ${inter} style="background:${bg}">${i}</button>
      <span class="ob2-step-cap${reached ? ' on' : ''}">${ob2Esc(ob2Niv(i))}</span>
    </div>`;
    if (i < 4) {
      const seg = Math.max(0, Math.min(100, (cur - np) / 25 * 100));
      html += `<div class="ob2-conn-t"><div class="ob2-conn" data-after="${np}" style="width:${seg}%;background:${ob2Pct(np + 25)}"></div></div>`;
    }
  }
  html += `</div><span class="ob2-step-lbl" id="steplbl-${o.id}-${a.id}" style="color:${ob2Pct(cur)}">${ob2Esc(ob2Niv(Math.round(cur / 25)))} · ${cur}%</span>`;
  return html;
}

// Clic sur un palier : retour visuel immédiat, puis sauvegarde (via js/objectifs.js)
async function ob2SetAxeLevel(objId, axeId, level) {
  if (!ob2Edit()) return;
  const r = typeof currentResident === 'function' ? currentResident() : null;
  if (!r) return;
  const v = level * 25;
  const row = document.getElementById(`steprow-${objId}-${axeId}`);
  if (row) {
    row.querySelectorAll('.ob2-step').forEach(h => {
      const idx = +h.dataset.lvl, np = idx * 25, reached = v >= np;
      h.style.background = reached ? ob2Pct(np) : OB2_STEP_OFF;
      h.setAttribute('aria-checked', String(v === np));
      const cap = h.parentNode.querySelector('.ob2-step-cap');
      if (cap) cap.classList.toggle('on', reached);
      h.style.animation = '';
      if (idx === level) { void h.offsetWidth; h.style.animation = 'ob2StepPulse .45s ease'; }
    });
    row.querySelectorAll('.ob2-conn').forEach(c => {
      const np = +c.dataset.after;
      c.style.width = Math.max(0, Math.min(100, (v - np) / 25 * 100)) + '%';
    });
  }
  const lbl = document.getElementById(`steplbl-${objId}-${axeId}`);
  if (lbl) { lbl.textContent = ob2Niv(level) + ' · ' + v + '%'; lbl.style.color = ob2Pct(v); }
  const pctTop = document.getElementById(`axpct-${objId}-${axeId}`);
  if (pctTop) { pctTop.textContent = v + '%'; pctTop.style.color = ob2Pct(v); }

  const axes = ob2Axes(ob2Suivi(r, objId));
  let sum = 0;
  axes.forEach(a => { sum += String(a.id) === String(axeId) ? v : ob2Clamp(a.progression); });
  ob2UpdateObj(objId, axes.length ? Math.round(sum / axes.length) : v);

  const sv = { ...ob2Suivi(r, objId) };
  sv.axes = axes.map(a => String(a.id) === String(axeId) ? pointageAxe(a, v) : a);
  if (v > 0 && (!sv.statut || sv.statut === 'non_commence')) sv.statut = 'en_cours';
  try {
    await persistSuivi(r, objId, sv);
  } catch (e) {
    console.error('[ob2SetAxeLevel]', e);
    if (typeof toast === 'function') toast('Erreur enregistrement : ' + (e?.message || e), 'error');
  }
  ob2Render();
}

function ob2UpdateObj(objId, avg) {
  const col = ob2Pct(avg);
  const txt = document.getElementById(`ringtxt-${objId}`);
  const bar = document.getElementById(`ringbar-${objId}`);
  const rang = document.getElementById(`rang-${objId}`);
  if (txt) { txt.textContent = avg + '%'; txt.style.color = col; }
  if (bar) { bar.style.width = avg + '%'; bar.style.background = col; }
  if (rang && typeof rangLabel === 'function') rang.textContent = rangLabel(avg);
}

/* ── Évaluations d'un objectif (grille 0-4 sur ses axes) ─────────────── */
function ob2EvalsSection(o, sv, axes) {
  const evals = (typeof getEvalsObj === 'function' ? getEvalsObj(sv) : [])
    .slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  if (!axes.length && !evals.length) return '';
  return `<div class="ob2-sec" style="margin-top:16px">
      <span class="ob2-sec-t" style="cursor:default">${ob2Svg(OB2_IC.chart)}Évaluations (${evals.length})</span>
      ${ob2Edit() && axes.length ? `<span class="ob2-sec-act"><button type="button" class="v2-btn v2-btn-sm" onclick="openEvalObjModal('${o.id}')">${ob2Svg(OB2_IC.plus, 2.4)}Évaluer</button></span>` : ''}
    </div>
    ${evals.length
      ? `<div style="display:flex;flex-direction:column;gap:8px">${evals.slice(0, 6).map((ev, i) => ob2EvalObjRow(o, ev, evals[i + 1], axes)).join('')}</div>`
      : '<div class="v2-blk-vide">Aucune évaluation. « Évaluer » ouvre une grille où chaque axe de travail est noté de 0 (non acquis) à 4 (autonome) — la progression se met à jour automatiquement.</div>'}`;
}

function ob2EvalObjRow(o, ev, prec, axes) {
  const niveaux = typeof EVAL_OBJ_NIVEAUX !== 'undefined' ? EVAL_OBJ_NIVEAUX : [];
  const delta = prec && prec.score != null && ev.score != null ? ev.score - prec.score : null;
  const col = ob2Pct(ev.score);
  const detail = Object.entries(ev.notes || {}).map(([axeId, note]) => {
    const axe = axes.find(a => String(a.id) === String(axeId));
    const niv = niveaux.find(n => n.v === +note) || niveaux[0] || { v: note, label: '', color: '#94a3b8' };
    return `<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
      <span style="flex:1;min-width:140px">${axe ? ob2Esc(axe.nom) : '<em>(axe supprimé)</em>'}</span>
      <span class="v2-badge" style="color:${niv.color};background:${niv.color}22">${niv.v} · ${ob2Esc(niv.label)}</span>
    </div>`;
  }).join('');
  return `<details class="ob2-histo">
    <summary>
      <span style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0" aria-hidden="true"></span>
      <span style="font-weight:700;color:var(--v2-t2)">${typeof formatDate === 'function' ? formatDate(ev.date) : ob2Esc(ev.date)}</span>
      <span class="v2-badge" style="color:${col};background:${col}22">${ev.score}%</span>
      ${delta ? `<span style="font-size:11px;font-weight:700;color:${delta > 0 ? '#34d399' : '#fca5a5'}">${delta > 0 ? '+' : ''}${delta}</span>` : ''}
      ${ev.auteur ? `<span style="font-size:11px;color:var(--v2-t8)">par ${ob2Esc(ev.auteur)}</span>` : ''}
      <span style="margin-left:auto;font-size:11px;color:var(--v2-t8)">détail</span>
      ${ob2Edit() ? `<button type="button" class="ob2-ico-btn danger" title="Supprimer cette évaluation" aria-label="Supprimer cette évaluation"
        onclick="event.preventDefault();event.stopPropagation();deleteEvalObj('${o.id}','${ev.id}')">${ob2Svg(OB2_IC.trash)}</button>` : ''}
    </summary>
    <div class="ob2-histo-b">
      ${detail}
      ${ev.commentaire ? `<div style="color:var(--v2-t4)">${ob2Esc(ev.commentaire)}</div>` : ''}
    </div>
  </details>`;
}

/* ── Modale « axe de travail » : sélecteur de niveau en thème sombre ─── */
function ob2AxRenderSteps(pct) {
  const cur = ob2Clamp(pct);
  const hidden = document.getElementById('axProgression');
  if (hidden) hidden.value = cur;
  const out = document.getElementById('axProgVal');
  if (out) { out.textContent = ob2Niv(Math.round(cur / 25)) + ' · ' + cur + '%'; out.style.color = ob2Pct(cur); }
  const wrap = document.getElementById('axSteps');
  if (!wrap) return;
  let html = '';
  for (let i = 0; i < 5; i++) {
    const np = i * 25, reached = cur >= np;
    html += `<div class="ob2-step-c">
      <button type="button" class="ob2-step" data-lvl="${i}" role="radio" tabindex="0" aria-checked="${cur === np}"
        aria-label="${ob2Esc(ob2Niv(i))} (${np} %)" onclick="axStepPick(${i})"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();axStepPick(${i})}"
        style="background:${reached ? ob2Pct(np) : OB2_STEP_OFF}">${i}</button>
      <span class="ob2-step-cap${reached ? ' on' : ''}">${ob2Esc(ob2Niv(i))}</span>
    </div>`;
    if (i < 4) {
      const seg = Math.max(0, Math.min(100, (cur - np) / 25 * 100));
      html += `<div class="ob2-conn-t"><div class="ob2-conn" style="width:${seg}%;background:${ob2Pct(np + 25)}"></div></div>`;
    }
  }
  wrap.innerHTML = html;
}

function ob2AxStepPick(level) {
  ob2AxRenderSteps(level * 25);
  const el = document.getElementById('axSteps')?.querySelectorAll('.ob2-step')[level];
  if (el) { el.style.animation = ''; void el.offsetWidth; el.style.animation = 'ob2StepPulse .45s ease'; }
}

/* ══ ONGLETS ═════════════════════════════════════════════════════════ */
const OB2_TAB_TITRES = { objectifs: 'Objectifs & axes', evaluations: 'Grilles d\'évaluation' };

function ob2SwitchTab(tab) {
  const isEv = tab === 'evaluations';
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('obTabObjectifs', !isEv);
  show('obTabEvals', isEv);
  show('ob2ActObj', !isEv);
  show('ob2ActEv', isEv);
  document.getElementById('obTabBtnObjectifs')?.classList.toggle('on', !isEv);
  document.getElementById('obTabBtnEvals')?.classList.toggle('on', isEv);
  document.getElementById('obTabBtnObjectifs')?.setAttribute('aria-selected', String(!isEv));
  document.getElementById('obTabBtnEvals')?.setAttribute('aria-selected', String(isEv));
  const t = document.getElementById('ob2Title');
  if (t) t.textContent = OB2_TAB_TITRES[isEv ? 'evaluations' : 'objectifs'];
  try { sessionStorage.setItem('ob_tab', isEv ? 'evaluations' : 'objectifs'); } catch (e) { /* session indisponible */ }
}

/* ══ Bascule : les appelants existants passent par le rendu V2 ═══════ */
renderObjectifs = ob2Render;
renderEvList = ob2RenderEv;
obSwitchTab = ob2SwitchTab;
setAxeLevel = ob2SetAxeLevel;
axRenderSteps = ob2AxRenderSteps;
axStepPick = ob2AxStepPick;
renderOverview = ob2Overview;
objectifCard = ob2ObjCard;
ppaBlockHtml = ob2Ppa;
