// ── REPAS & RÉGIMES — DESIGN V2 ──────────────────────────────────────────
// Reproduit la maquette « Repas & régimes (vie quotidienne) » :
//   bandeau de KPI, frise de dates « commander à l'avance », carte teintée
//   « Menus du jour », puis la liste « Inscriptions aux repas » (une ligne par
//   résident : identité, régime/texture/allergie, boutons de service).
// Les données, la persistance et les actions restent celles de js/repas.js
// (toggleRepas, setMenuChoice, setMenuTexte, openRegimeModal, rpCopyWeek…).

const RP2_MEALS = [
  { key: 'matin', label: 'Matin', c: '#22d3ee', hasMenu: false },
  { key: 'midi',  label: 'Midi',  c: '#fb923c', hasMenu: true  },
  { key: 'soir',  label: 'Soir',  c: '#818cf8', hasMenu: true  }
];

// Palette d'affichage sombre : les couleurs de REGIME_TYPES sont calibrées
// pour un fond clair et deviennent illisibles ici.
const RP2_REGC = {
  normal: '#94a3b8', vegetarien: '#4ade80', sansporc: '#a5b4fc', halal: '#5eead4',
  casher: '#c4b5fd', diabetique: '#f472b6', hyposode: '#fbbf24',
  hypocalorique: '#fb7185', autre: '#f87171'
};
const RP2_MENUC = { '1': '#5eead4', '2': '#a5b4fc' };

const RP2_IC = {
  tick:  '<polyline points="20 6 9 17 4 12"/>',
  cross: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  warn:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};
const RP2_DOW  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const RP2_MOIS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function rp2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function rp2SvgN(d, n, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round" width="${n}" height="${n}">${d}</svg>`;
}
// Icônes pour les tuiles KPI (Console Data).
const RP2_KPIIC = {
  utens:  '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>',
  leaf:   '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'
};
function rp2CanEdit() {
  return Auth.isAdmin() || ((typeof canEditResidents === 'function') && canEditResidents(Auth.getSession()?.userId));
}
function rp2RegColor(type) { return RP2_REGC[type] || RP2_REGC.autre; }
function rp2Allerg(r) { return ((rgOf(r).allergiesAlim || r.allergies || '') + '').trim(); }
function rp2Nom(r) { return `${r.prenom || ''} ${r.nom || ''}`.trim(); }

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────────

function rp2Render() {
  if (!repasDate) return;
  const residents = repasResidents();
  const day = getRepas()[repasDate] || {};
  const canEdit = rp2CanEdit();

  const dEl = document.getElementById('rpDate');
  if (dEl && dEl.value !== repasDate) dEl.value = repasDate;

  rp2DateStrip();
  rp2Stats(residents, day);
  rp2Menus(residents, day);
  rp2Cuisine(residents, day);
  rp2Views();
  rp2List(residents, day, canEdit);   // pose aussi le libellé de date
}

function rp2Views() {
  ['cartes', 'tableau', 'semaine'].forEach(v => {
    const id = 'rpBtn' + v[0].toUpperCase() + v.slice(1);
    document.getElementById(id)?.classList.toggle('on', rpView === v);
  });
}

function rp2Label(txt) {
  const el = document.getElementById('rpDateLabel');
  if (el) el.textContent = txt;
}

// ── FRISE DE DATES (5 semaines à l'avance) ───────────────────────────────

function rp2DateStrip() {
  const el = document.getElementById('rpDateStrip');
  if (!el) return;
  const todayS = today();
  const all = getRepas();
  let html = '';
  for (let i = 0; i < 35; i++) {
    const d = new Date(todayS + 'T12:00');
    d.setDate(d.getDate() + i);
    const ds = isoJour(d);
    const dd = all[ds];
    const hasMenu = !!(dd && dd.menus && Object.values(dd.menus).some(m => m && (m['1'] || m['2'])));
    const cls = 'rp2-day' + (ds === todayS ? ' today' : '') + (ds === repasDate ? ' on' : '');
    html += `<button type="button" class="${cls}" onclick="rpJumpTo('${ds}')" title="${escAttr(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}">
      ${hasMenu ? '<span class="dot"></span>' : ''}
      <span class="dow">${RP2_DOW[d.getDay()]}</span>
      <span class="num">${d.getDate()}</span>
      <span class="mon">${RP2_MOIS[d.getMonth()]}</span>
    </button>`;
  }
  el.innerHTML = html;
  // Centrage horizontal seulement (scrollIntoView ferait remonter la page).
  // Position absolue et bornée : le calcul reste juste quel que soit le
  // défilement courant de la frise.
  const sel = el.querySelector('.rp2-day.on');
  if (sel) {
    const delta = sel.getBoundingClientRect().left - el.getBoundingClientRect().left;
    const cible = el.scrollLeft + delta - (el.clientWidth - sel.offsetWidth) / 2;
    el.scrollLeft = Math.min(Math.max(0, el.scrollWidth - el.clientWidth), Math.max(0, cible));
  }
}

// ── KPI ──────────────────────────────────────────────────────────────────

function rp2Stats(residents, day) {
  const el = document.getElementById('rpStats');
  if (!el) return;
  const n = key => residents.filter(r => isInscrit(day, key, r.id)).length;
  const regimes = residents.filter(r => { const g = rgOf(r); return g.type && g.type !== 'normal'; }).length;
  const textures = residents.filter(r => { const g = rgOf(r); return g.texture && g.texture !== 'normale'; }).length;
  const allergies = residents.filter(r => rp2Allerg(r)).length;
  const tiles = [
    { n: n('matin'), l: 'Couverts matin', c: '#22d3ee', ico: RP2_KPIIC.utens },
    { n: n('midi'),  l: 'Couverts midi',  c: '#fb923c', ico: RP2_KPIIC.utens },
    { n: n('soir'),  l: 'Couverts soir',  c: '#818cf8', ico: RP2_KPIIC.utens },
    { n: regimes,    l: 'Régimes spéciaux', c: '#ec4899', ico: RP2_KPIIC.leaf },
    { n: textures,   l: 'Textures adaptées', c: '#22d3ee', ico: RP2_KPIIC.layers },
    { n: allergies,  l: 'Allergies', c: '#ef4444', ico: RP2_IC.warn }
  ];
  el.innerHTML = tiles.map(t => `<div class="dc-kpi" style="--dc-c:${t.c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${t.l}</span><span class="dc-kpi-ico" style="color:${t.c}">${rp2SvgN(t.ico, 16, 1.9)}</span></div>
    <div class="dc-kpi-val">${t.n}</div>
  </div>`).join('');
}

// ── MENUS DU JOUR ────────────────────────────────────────────────────────

function rp2Menus(residents, day) {
  const el = document.getElementById('rpMenusDuJour');
  if (!el) return;
  const choix = day['choixMenu'] || {};
  el.innerHTML = RP2_MEALS.filter(m => m.hasMenu).map(m => {
    const inscrits = residents.filter(r => isInscrit(day, m.key, r.id));
    const cnt = c => inscrits.filter(r => (choix[r.id] || {})[m.key] === c).length;
    const ligne = c => `<div class="rp2-mline">
      <span class="rp2-mcat" style="--pc:${RP2_MENUC[c]}">Menu ${c}</span>
      <input type="text" class="rp2-minput" value="${escAttr(getMenuTexte(repasDate, m.key, c))}"
        placeholder="Ex : poulet rôti, haricots verts…"
        onchange="setMenuTexte('${repasDate}','${m.key}','${c}',this.value)"/>
      <span class="rp2-mn" title="Résidents ayant choisi ce menu">${cnt(c)}</span>
    </div>`;
    const sans = inscrits.length - cnt('1') - cnt('2');
    return `<div class="rp2-menu" style="--mc:${m.c};border-left:3px solid ${m.c}">
      <div class="rp2-menu-h">
        <span class="rp2-menu-t">${m.label}</span>
        <span class="dc-pill dim" style="margin-left:auto">${inscrits.length} couvert${inscrits.length > 1 ? 's' : ''}</span>
      </div>
      ${ligne('1')}${ligne('2')}
      ${sans > 0 ? `<div class="rp2-msans">Sans choix · ${sans}</div>` : ''}
    </div>`;
  }).join('');
}

// ── RÉPARTITION DES RÉGIMES (synthèse cuisine) ───────────────────────────

function rp2Cuisine(residents, day) {
  const el = document.getElementById('rpCuisine');
  if (!el) return;
  const compte = {};
  residents.forEach(r => {
    if (!RP2_MEALS.some(m => isInscrit(day, m.key, r.id))) return;
    const g = rgOf(r);
    const key = (g.type && g.type !== 'normal') ? g.type : 'normal';
    compte[key] = (compte[key] || 0) + 1;
  });
  const entries = Object.entries(compte).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const label = k => (REGIME_TYPES[k] || REGIME_TYPES.autre).label;
  const bar = entries.map(([k, n]) => `<span style="flex:${n};background:${rp2RegColor(k)}" title="${escAttr(label(k) + ' × ' + n)}"></span>`).join('')
    || '<span style="flex:1;background:rgba(255,255,255,.08)"></span>';
  const leg = entries.map(([k, n]) => `<span><i style="background:${rp2RegColor(k)}"></i>${label(k)} <b>${n}</b></span>`).join('')
    || '<span>Aucun inscrit</span>';
  el.innerHTML = `<div class="dc-eyebrow" style="margin-bottom:8px">Répartition des régimes · ${total}</div>
    <div class="rp2-bar">${bar}</div>
    <div class="rp2-leg">${leg}</div>`;
}

// ── ÉTIQUETTES RÉGIME / TEXTURE / ALLERGIE ───────────────────────────────

function rp2Tags(r, canEdit) {
  const g = rgOf(r);
  const type = g.type || 'normal';
  const t = REGIME_TYPES[type] || REGIME_TYPES.normal;
  const c = rp2RegColor(type);
  const lbl = t.label + (type === 'autre' && g.autreLabel ? ' : ' + g.autreLabel : '');
  let out = canEdit
    ? `<button type="button" class="dc-badge" style="background:${c}22;color:${c};border:1px solid ${c}55;cursor:pointer" onclick="openRegimeModal('${r.id}')" title="Modifier le régime alimentaire"><span class="d" style="background:${c}"></span>${escHtml(lbl)}</button>`
    : `<span class="dc-badge" style="background:${c}22;color:${c};border:1px solid ${c}55"><span class="d" style="background:${c}"></span>${escHtml(lbl)}</span>`;
  if (g.texture && g.texture !== 'normale') {
    out += `<span class="dc-badge dc-b-cyan"><span class="d"></span>${TEXTURES[g.texture] || g.texture}</span>`;
  }
  const a = rp2Allerg(r);
  if (a) out += `<span class="dc-badge dc-b-red" title="${escAttr(a)}">${rp2SvgN(RP2_IC.warn, 12, 2.4)}${escHtml(a)}</span>`;
  return out;
}

// ── BOUTONS DE SERVICE ───────────────────────────────────────────────────

function rp2Meal(r, m, day, canEdit, dateStr) {
  const ds = dateStr || repasDate;
  const dayObj = dateStr ? (getRepas()[dateStr] || {}) : day;
  const on = isInscrit(dayObj, m.key, r.id);
  const ttl = `${rp2Nom(r)} — ${m.label} : ${on ? 'inscrit, cliquer pour retirer' : 'retiré, cliquer pour inscrire'}`;
  const btn = `<button type="button" class="rp2-mb${on ? ' on' : ''}" style="--mc:${m.c}"
    ${canEdit ? `onclick="toggleRepas('${r.id}','${m.key}',${!on},'${ds}')"` : 'disabled'}
    title="${escAttr(ttl)}">${rp2Svg(on ? RP2_IC.tick : RP2_IC.cross, 2.6)}${m.label}</button>`;
  let pills = '';
  if (m.hasMenu && on) {
    const ch = getMenuChoice(ds, r.id, m.key);
    pills = `<div class="rp2-pills">` + ['1', '2'].map(nb => {
      const txt = getMenuTexte(ds, m.key, nb);
      return `<button type="button" class="rp2-pill${ch === nb ? ' on' : ''}" style="--pc:${RP2_MENUC[nb]}"
        ${canEdit ? `onclick="setMenuChoice('${ds}','${r.id}','${m.key}','${nb}')"` : 'disabled'}
        title="${escAttr(txt || ('Menu ' + nb))}">M${nb}</button>`;
    }).join('') + `</div>`;
  }
  return `<div class="rp2-mcell">${btn}${pills}</div>`;
}

function rp2Avatar(r) {
  const color = safeColor(r.color, '#6b7280');
  return r.photo
    ? `<div class="rp2-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="rp2-av" style="background:${color}">${initials(r.prenom, r.nom)}</div>`;
}

// ── VUES ─────────────────────────────────────────────────────────────────

function rp2List(residents, day, canEdit) {
  const el = document.getElementById('rpList');
  if (!el) return;

  const q = (document.getElementById('rpSearch')?.value || '').toLowerCase();
  let list = residents;
  if (q) list = list.filter(r => `${r.prenom || ''} ${r.nom || ''} ${r.chambre || ''}`.toLowerCase().includes(q));

  const cnt = document.getElementById('rpCounts');
  if (cnt) {
    const n = k => residents.filter(r => isInscrit(day, k, r.id)).length;
    cnt.textContent = `${n('matin')} matin · ${n('midi')} midi · ${n('soir')} soir`;
  }

  if (rpView === 'semaine') { el.innerHTML = rp2Semaine(list, canEdit); return; }

  const d = new Date(repasDate + 'T12:00');
  rp2Label(`${RP2_DOW[d.getDay()]}. ${d.getDate()} ${RP2_MOIS[d.getMonth()]}.`);

  if (!list.length) { el.innerHTML = '<div class="rp2-vide">Aucun résident trouvé.</div>'; return; }

  if (rpView === 'cartes') {
    el.innerHTML = `<div class="rp2-cards">${list.map(r => `<div class="rp2-card" style="border-left:3px solid ${rp2RegColor(rgOf(r).type || 'normal')}">
      <div class="rp2-card-h">${rp2Avatar(r)}<div class="rp2-id">
        <div class="rp2-nom">${escHtml(rp2Nom(r))}</div>
        <div class="rp2-ch">Ch. ${escHtml(r.chambre || '—')}</div></div></div>
      <div class="rp2-tags">${rp2Tags(r, canEdit)}</div>
      <div class="rp2-acts">${RP2_MEALS.map(m => rp2Meal(r, m, day, canEdit)).join('')}</div>
    </div>`).join('')}</div>`;
    return;
  }

  el.innerHTML = list.map(r => `<div class="rp2-row" style="border-left:3px solid ${rp2RegColor(rgOf(r).type || 'normal')}">
    ${rp2Avatar(r)}
    <div class="rp2-id">
      <div class="rp2-nom">${escHtml(rp2Nom(r))}</div>
      <div class="rp2-ch">Ch. ${escHtml(r.chambre || '—')}</div>
    </div>
    <div class="rp2-tags">${rp2Tags(r, canEdit)}</div>
    <div class="rp2-acts">${RP2_MEALS.map(m => rp2Meal(r, m, day, canEdit)).join('')}</div>
  </div>`).join('');
}

function rp2Semaine(list, canEdit) {
  const days = rpWeekDays(repasDate);
  const all = getRepas();
  const todayS = today();
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const s = new Date(days[0] + 'T12:00'), e = new Date(days[6] + 'T12:00');
  rp2Label(`Semaine du ${s.getDate()} ${RP2_MOIS[s.getMonth()]} au ${e.getDate()} ${RP2_MOIS[e.getMonth()]}`);

  if (!list.length) return '<div class="rp2-vide">Aucun résident trouvé.</div>';

  const totals = days.map(ds => {
    const day = all[ds] || {};
    return RP2_MEALS.map(m => list.filter(r => isInscrit(day, m.key, r.id)).length);
  });
  const head = days.map((ds, i) => {
    const dt = new Date(ds + 'T12:00');
    return `<th class="${ds === todayS ? 'today' : ''}${ds < todayS ? ' past' : ''}">
      <div class="rp2-wk-d">${JOURS[i]} ${dt.getDate()}</div>
      <div class="rp2-wk-n">${totals[i].join(' · ')}</div></th>`;
  }).join('');

  const rows = list.map(r => `<tr>
    <td class="rp2-wk-name">${rp2Avatar(r)}<div class="rp2-id">
      <div class="rp2-nom">${escHtml(rp2Nom(r))}</div>
      <div class="rp2-ch">Ch. ${escHtml(r.chambre || '—')}</div></div></td>
    ${days.map(ds => `<td class="${ds === todayS ? 'today' : ''}${ds < todayS ? ' past' : ''}">
      <div class="rp2-acts rp2-acts-wk">${RP2_MEALS.map(m => rp2Meal(r, m, null, canEdit, ds)).join('')}</div>
    </td>`).join('')}
  </tr>`).join('');

  const next = (() => { const d = new Date(days[0] + 'T12:00'); d.setDate(d.getDate() + 7); return isoJour(d); })();
  const copy = canEdit
    ? `<button type="button" class="v2-btn v2-btn-sm rp2-copy" onclick="rpCopyWeek('${days[0]}','${next}')">Copier vers la semaine suivante</button>`
    : '';

  return `<div class="rp2-week"><table class="v2-table rp2-wk">
    <thead><tr><th class="rp2-wk-h">Résident</th>${head}</tr></thead>
    <tbody>${rows}</tbody></table>${copy}</div>`;
}
