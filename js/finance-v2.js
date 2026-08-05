// ── FINANCE (pilotage) — DESIGN V2 ────────────────────────────────────
// Reproduit la maquette « Finance (pilotage) » : 5 tuiles de synthèse,
// jauge de consommation, comparaison année sur année, courbe 12 mois,
// enveloppes (barres groupées + détail), masse salariale, contrats,
// top dépenses / top dépensiers, recettes de l'exercice, opérations.
//
// Ce module ne réécrit AUCUNE couche de données : il redéfinit les fonctions
// de rendu de js/finance.js (chargé avant lui) et réutilise finEnveloppes(),
// finDemandes(), finFichesPaie(), finContrats(), finEmployes(), finExportCsv().
//
// La maquette affiche deux lignes « année sur année » sans source en base :
//   • Recettes (prix de journée)  → table public.finance_recettes
//   • Coût des remplacements      → dérivé des fiches de paie des salariés
//     sous contrat de type « vacation » (aucune valeur inventée).
// La table est créée par migration-finance.sql. Tant que ce script n'est pas
// exécuté, la lecture renvoie [] avec un console.warn et l'écriture est
// refusée par un toast nommant le fichier : la page reste utilisable.

// ── Icônes ────────────────────────────────────────────────────────────
const FIN2_IC = {
  budget:  '<path d="M17.2 7a6 7 0 1 0 0 10"/><path d="M13 10h-8m0 4h8"/>',
  euro:    '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  wallet:  '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  users:   '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  alert:   '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>',
  up:      '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  down:    '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
  x:       '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  save:    '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  trash:   '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  warn:    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>',
  lock:    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
};
function fin2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function fin2Ico(d, px) {
  const s = px || 16;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// ── Helpers ───────────────────────────────────────────────────────────
function fin2Eur(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' €'; }
function fin2Esc(s) { return typeof escHtml === 'function' ? escHtml(s == null ? '' : s) : String(s == null ? '' : s); }
function fin2Date(d) { return d ? (typeof formatDate === 'function' ? formatDate(d) : d) : '—'; }
function fin2BarC(pct) { return pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#4ade80'; }
function fin2Vide(txt) { return `<div class="fin2-vide">${fin2Esc(txt)}</div>`; }
function fin2IsAdmin() { return typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin(); }

// ── Recettes : lecture tolérante (table éventuellement absente) ───────
let FIN2_RECETTES = [];
const FIN2_MISSING = {};

async function fin2Read(table) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) { FIN2_MISSING[table] = true; return []; }
  try {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) throw error;
    FIN2_MISSING[table] = false;
    return data || [];
  } catch (e) {
    FIN2_MISSING[table] = true;
    console.warn(`[finance-v2] table public.${table} indisponible — exécutez migration-finance.sql`,
      e && e.message ? e.message : e);
    return [];
  }
}
function fin2WriteRefused(table) {
  FIN2_MISSING[table] = true;
  toast('Table « ' + table + ' » absente : exécutez migration-finance.sql', 'error');
}
async function fin2Etab() {
  try { return typeof sbGetEtablissementId === 'function' ? await sbGetEtablissementId() : ''; }
  catch { return ''; }
}
async function fin2LoadRecettes() {
  const rows = await fin2Read('finance_recettes');
  FIN2_RECETTES = rows.map(r => ({
    id: r.id, libelle: r.libelle || '', montant: Number(r.montant) || 0, annee: Number(r.annee) || 0
  })).sort((a, b) => b.montant - a.montant);
  window.FIN2_RECETTES = FIN2_RECETTES;
}
function fin2RecettesAnnee(annee) {
  return FIN2_RECETTES.filter(r => r.annee === Number(annee))
    .reduce((s, r) => s + r.montant, 0);
}

// ── COURBE 12 MOIS (thème sombre) ─────────────────────────────────────
function fin2SmoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1], [x3, y3] = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${x1 + (x2 - x0) / 6},${y1 + (y2 - y0) / 6} ${x2 - (x3 - x1) / 6},${y2 - (y3 - y1) / 6} ${x2},${y2}`;
  }
  return d;
}

function fin2LineChart(containerId, labels, series) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const W = 980, H = 210, padL = 10, padR = 10, padT = 16, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...series.flatMap(s => s.data));
  const stepX = innerW / Math.max(1, labels.length - 1);
  const yOf = v => padT + innerH - (v / maxVal) * innerH;
  const xOf = i => padL + i * stepX;

  const grid = [0, .25, .5, .75, 1].map(f => {
    const y = padT + innerH * (1 - f);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1" stroke-dasharray="${f === 0 ? '0' : '3,4'}"/>`;
  }).join('');

  const lbls = labels.map((l, i) =>
    `<text x="${xOf(i)}" y="${H - 7}" font-size="10" fill="#6f86ab" text-anchor="middle">${fin2Esc(l)}</text>`).join('');

  const body = series.map((s, si) => {
    const pts = s.data.map((v, i) => [xOf(i), yOf(v)]);
    const line = fin2SmoothPath(pts);
    const area = `${line} L ${xOf(pts.length - 1)},${padT + innerH} L ${xOf(0)},${padT + innerH} Z`;
    const gid = `fin2Grad${si}_${containerId}`;
    const dots = pts.map((p, i) =>
      `<circle class="fin2-dot" cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.color}" stroke="#0c1a2e" stroke-width="1.5"><title>${fin2Esc(labels[i])} — ${fin2Esc(s.name)} : ${fin2Eur(s.data[i])}</title></circle>`).join('');
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${s.color}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${s.color}" stop-opacity="0.02"/></linearGradient></defs>
      <path d="${area}" fill="url(#${gid})" stroke="none"/>
      <path class="fin2-line" d="${line}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1200" stroke-dashoffset="0"/>
      ${dots}`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:560px;height:${H}px">${grid}${body}${lbls}</svg>`;
}

// ── BARRES GROUPÉES (thème sombre) ────────────────────────────────────
function fin2BarChart(containerId, labels, series, H) {
  const el = document.getElementById(containerId);
  if (!el) return;
  H = H || 210;
  const W = 980, padL = 10, padR = 10, padT = 16, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...series.flatMap(s => s.data));
  const groupW = innerW / Math.max(1, labels.length);
  const gap = 4, barW = Math.max(6, (groupW - gap * (series.length + 1)) / series.length);

  const grid = [0, .25, .5, .75, 1].map(f => {
    const y = padT + innerH * (1 - f);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1" stroke-dasharray="${f === 0 ? '0' : '3,4'}"/>`;
  }).join('');

  const bars = labels.map((l, gi) => {
    const gx = padL + gi * groupW;
    const b = series.map((s, si) => {
      const v = s.data[gi] || 0;
      const h = (v / maxVal) * innerH;
      const x = gx + gap + si * (barW + gap);
      return `<rect x="${x}" y="${padT + innerH - h}" width="${barW}" height="${Math.max(h, 1)}" rx="3" fill="${s.color}"><title>${fin2Esc(l)} — ${fin2Esc(s.name)} : ${fin2Eur(v)}</title></rect>`;
    }).join('');
    return b + `<text x="${gx + groupW / 2}" y="${H - 7}" font-size="10" fill="#6f86ab" text-anchor="middle">${fin2Esc(l)}</text>`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:560px;height:${H}px">${grid}${bars}</svg>`;
}

// ══ RENDU PRINCIPAL — remplace celui de js/finance.js ═════════════════
function renderFinance() {
  const selPer = document.getElementById('finPeriode');
  if (!selPer) return;
  const periode = selPer.value || (typeof today === 'function' ? today().slice(0, 7) : new Date().toISOString().slice(0, 7));

  const enveloppes = finEnveloppes();
  const demandes   = finDemandes();
  const fichesPaie = finFichesPaie();
  const contrats   = finContrats();
  const employes   = finEmployes();

  const acceptees = demandes.filter(d => d.statut === 'accepte' || d.statut === 'justifie');
  const depPeriode = acceptees.filter(d => (d.dateDepense || '').slice(0, 7) === periode)
    .reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const depTotal   = acceptees.reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const budgetTotal = enveloppes.reduce((s, e) => s + (Number(e.montant) || 0), 0);
  const solde = budgetTotal - depTotal;

  const paiePeriode = fichesPaie.filter(f => f.periode === periode);
  const masseSalariale = paiePeriode.reduce((s, f) => s + (Number(f.net) || 0), 0);
  const enAttente = demandes.filter(d => d.statut === 'en_attente');

  const annee = new Date().getFullYear();
  const anneeStr = String(annee), precStr = String(annee - 1);
  const anneeEl = document.getElementById('finAnnee');
  if (anneeEl) anneeEl.textContent = anneeStr;

  // ── Tuiles de synthèse ──────────────────────────────────────────────
  const stats = [
    { n: fin2Eur(budgetTotal),     l: 'Budget alloué (total)',      c: '#22d3ee', i: FIN2_IC.budget },
    { n: fin2Eur(depPeriode),      l: 'Dépenses validées (période)', c: '#f87171', i: FIN2_IC.euro },
    { n: fin2Eur(solde),           l: 'Solde budget disponible',     c: solde < 0 ? '#f87171' : '#4ade80', i: FIN2_IC.wallet },
    { n: fin2Eur(masseSalariale),  l: 'Masse salariale (période)',   c: '#818cf8', i: FIN2_IC.users },
    { n: String(enAttente.length), l: 'Demandes à valider',          c: '#f59e0b', i: FIN2_IC.alert }
  ];
  document.getElementById('finStats').innerHTML = stats.map(s => `
    <div class="dc-kpi" style="--dc-c:${s.c}">
      <div class="dc-kpi-top">
        <span class="dc-kpi-label">${fin2Esc(s.l)}</span>
        <span class="dc-kpi-ico" style="color:${s.c}">${fin2Ico(s.i, 15)}</span>
      </div>
      <div class="dc-kpi-val" style="color:${s.c}">${s.n}</div>
    </div>`).join('');

  // ── Demandes en attente ─────────────────────────────────────────────
  const pendingCard = document.getElementById('finPendingCard');
  if (enAttente.length) {
    pendingCard.style.display = '';
    const totalAttente = enAttente.reduce((s, d) => s + (Number(d.montant) || 0), 0);
    document.getElementById('finPendingBody').innerHTML = `
      <div class="fin2-mini">
        <div><div class="fin2-mini-k">En attente</div><div class="fin2-mini-v" style="color:var(--v2-warn-text)">${enAttente.length}</div></div>
        <div><div class="fin2-mini-k">Montant cumulé</div><div class="fin2-mini-v" style="color:var(--v2-warn-text)">${fin2Eur(totalAttente)}</div></div>
      </div>
      ${enAttente.slice(0, 6).map(d => `<div class="fin2-row">
        <span style="flex:1;min-width:0">
          <div class="fin2-row-t">${fin2Esc(d.motif || '—')}</div>
          <div class="fin2-row-m">${fin2Esc(d.employeNom || '')}</div>
        </span>
        <span class="fin2-row-v" style="color:var(--v2-warn-text)">${fin2Eur(d.montant)}</span>
      </div>`).join('')}`;
  } else {
    pendingCard.style.display = 'none';
  }

  // ── Jauge de consommation ───────────────────────────────────────────
  const depAnnee = acceptees.filter(d => (d.dateDepense || '').startsWith(anneeStr))
    .reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const pctBudget = budgetTotal > 0 ? Math.min(100, Math.round(depAnnee / budgetTotal * 100)) : 0;
  const now = new Date();
  const pctAnnee = Math.round((now - new Date(annee, 0, 1)) / (new Date(annee + 1, 0, 1) - new Date(annee, 0, 1)) * 100);
  const ecart = pctBudget - pctAnnee;
  const gc = ecart > 10 ? '#ef4444' : ecart > 0 ? '#f59e0b' : '#22d3ee';
  const verdict = ecart > 10 ? 'Rythme de dépense trop rapide'
    : ecart > 0 ? 'Rythme à surveiller' : 'Rythme maîtrisé';
  const badgeCls = ecart > 10 ? 'dc-b-red' : ecart > 0 ? 'dc-b-amber' : 'dc-b-cyan';
  document.getElementById('finGauge').innerHTML = `
    <div class="fin2-gauge">
      <div class="fin2-ring" style="--gc:${gc};--gp:${(pctBudget / 100).toFixed(3)}turn">
        <div class="fin2-ring-in">
          <span class="fin2-ring-n">${pctBudget}%</span>
          <span class="fin2-ring-l">consommé</span>
        </div>
      </div>
      <div class="fin2-gauge-x">
        <b>${fin2Eur(depAnnee)}</b> engagés sur <b>${fin2Eur(budgetTotal)}</b>.<br>
        Reste <b>${fin2Eur(Math.max(0, budgetTotal - depAnnee))}</b> · année écoulée à <b>${pctAnnee}%</b>.
        <div style="margin-top:10px"><span class="dc-badge ${badgeCls}"><span class="d"></span>${verdict} (${ecart > 0 ? '+' : ''}${ecart} pts)</span></div>
      </div>
    </div>`;

  // ── Comparaison année sur année ─────────────────────────────────────
  const depPrec = acceptees.filter(d => (d.dateDepense || '').startsWith(precStr))
    .reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const salAnnee = fichesPaie.filter(f => (f.periode || '').startsWith(anneeStr))
    .reduce((s, f) => s + (Number(f.net) || 0), 0);
  const salPrec  = fichesPaie.filter(f => (f.periode || '').startsWith(precStr))
    .reduce((s, f) => s + (Number(f.net) || 0), 0);

  // Remplacements = fiches de paie des salariés sous contrat « vacation »
  const idsVacation = new Set(contrats.filter(c => c.type === 'vacation')
    .map(c => String(c.employeId || '')).filter(Boolean));
  const remplAnnee = fichesPaie.filter(f => (f.periode || '').startsWith(anneeStr) && idsVacation.has(String(f.employeId)))
    .reduce((s, f) => s + (Number(f.net) || 0), 0);
  const remplPrec  = fichesPaie.filter(f => (f.periode || '').startsWith(precStr) && idsVacation.has(String(f.employeId)))
    .reduce((s, f) => s + (Number(f.net) || 0), 0);

  const recAnnee = fin2RecettesAnnee(annee);
  const recPrec  = fin2RecettesAnnee(annee - 1);

  const pctChange = (cur, prev) => prev > 0 ? Math.round((cur - prev) / prev * 100) : (cur > 0 ? 100 : 0);
  const yoyRow = (label, cur, prev, hausseEstBonne) => {
    const pct = pctChange(cur, prev);
    const up = pct >= 0;
    const bon = up === !!hausseEstBonne;
    const col = pct === 0 ? 'var(--v2-t6)' : (bon ? '#34d399' : '#fca5a5');
    return `<div class="fin2-yoy-r">
      <span class="fin2-yoy-l">${fin2Esc(label)}<div class="fin2-yoy-p">${precStr} : ${fin2Eur(prev)}</div></span>
      <span class="fin2-yoy-v">${fin2Eur(cur)}</span>
      <span class="fin2-yoy-d" style="color:${col}">${fin2Svg(up ? FIN2_IC.up : FIN2_IC.down, 2.4)}${up ? '+' : '−'}${Math.abs(pct)} %</span>
    </div>`;
  };
  document.getElementById('finYoy').innerHTML = `<div class="fin2-yoy">
    ${yoyRow('Dépenses de fonctionnement · ' + anneeStr, depAnnee, depPrec, false)}
    ${yoyRow('Masse salariale · ' + anneeStr, salAnnee, salPrec, false)}
    ${yoyRow('Coût des remplacements · ' + anneeStr, remplAnnee, remplPrec, false)}
    ${yoyRow('Recettes · ' + anneeStr, recAnnee, recPrec, true)}
    ${FIN2_MISSING.finance_recettes ? `<div class="v2-note v2-note-warn">${fin2Svg(FIN2_IC.warn)}<span>Recettes indisponibles : exécutez migration-finance.sql.</span></div>` : ''}
  </div>`;

  // ── Courbe 12 mois ──────────────────────────────────────────────────
  const months12 = finLast12Months().reverse();
  const trendLabels = months12.map(m => FIN_MOIS[Number(m.split('-')[1]) - 1]);
  const trendDep = months12.map(m => acceptees.filter(d => (d.dateDepense || '').slice(0, 7) === m)
    .reduce((s, d) => s + (Number(d.montant) || 0), 0));
  const trendSal = months12.map(m => fichesPaie.filter(f => f.periode === m)
    .reduce((s, f) => s + (Number(f.net) || 0), 0));
  fin2LineChart('finTrendChart', trendLabels, [
    { name: 'Dépenses validées', color: '#4ade80', data: trendDep },
    { name: 'Masse salariale',   color: '#818cf8', data: trendSal }
  ]);

  // ── Enveloppes : barres groupées ────────────────────────────────────
  const envSpent = enveloppes.map(e => acceptees.filter(d => d.enveloppeId === e.id)
    .reduce((s, d) => s + (Number(d.montant) || 0), 0));
  if (enveloppes.length) {
    fin2BarChart('finBarChart',
      enveloppes.map(e => (e.nom || '').length > 10 ? e.nom.slice(0, 9) + '…' : (e.nom || '—')),
      [{ name: 'Budget alloué', color: '#22d3ee', data: enveloppes.map(e => Number(e.montant) || 0) },
       { name: 'Dépensé',       color: '#f87171', data: envSpent }]);
  } else {
    document.getElementById('finBarChart').innerHTML = fin2Vide('Aucune enveloppe budgétaire définie.');
  }

  // ── Enveloppes : détail ─────────────────────────────────────────────
  const envEl = document.getElementById('finEnveloppes');
  envEl.innerHTML = enveloppes.length ? enveloppes.map((env, i) => {
    const spent = envSpent[i];
    const pct = Number(env.montant) > 0 ? Math.min(100, Math.round(spent / env.montant * 100)) : 0;
    const over = spent > Number(env.montant || 0);
    const envC = over ? '#ef4444' : fin2BarC(pct);
    return `<div class="fin2-env" style="border-left:3px solid ${envC};padding-left:11px">
      <div class="fin2-env-h">
        <span class="fin2-env-l">${fin2Esc(env.nom)}</span>
        <span class="fin2-env-v" style="${over ? 'color:var(--v2-danger-text)' : ''}">${fin2Eur(spent)} / ${fin2Eur(env.montant)}</span>
      </div>
      <div class="v2-prog"><span style="width:${pct}%;background:${over ? '#ef4444' : fin2BarC(pct)}"></span></div>
    </div>`;
  }).join('') : fin2Vide('Aucune enveloppe budgétaire définie.');

  // ── Masse salariale (période) ───────────────────────────────────────
  const msEl = document.getElementById('finMasseSalariale');
  if (!paiePeriode.length) {
    msEl.innerHTML = fin2Vide('Aucune fiche de paie pour cette période.');
  } else {
    const sum = k => paiePeriode.reduce((s, f) => s + (Number(f[k]) || 0), 0);
    const brut = sum('brut'), primes = sum('primes'), hsup = sum('heuresSup'), ret = sum('retenues');
    const vac = paiePeriode.filter(f => idsVacation.has(String(f.employeId)))
      .reduce((s, f) => s + (Number(f.net) || 0), 0);
    const lignes = [
      { l: 'Salaires bruts',            v: brut,   c: '#818cf8' },
      { l: 'Primes',                    v: primes, c: '#ec4899' },
      { l: 'Heures supplémentaires',    v: hsup,   c: '#22d3ee' },
      { l: 'Retenues',                  v: ret,    c: '#f59e0b' },
      { l: 'Vacations / remplacements', v: vac,    c: '#4ade80' },
      { l: 'Net versé',                 v: masseSalariale, c: '#a5b4fc' }
    ];
    msEl.innerHTML = `
      <div class="fin2-mini">
        <div><div class="fin2-mini-k">Total net</div><div class="fin2-mini-v" style="color:var(--v2-indigo-pale)">${fin2Eur(masseSalariale)}</div></div>
        <div><div class="fin2-mini-k">Bulletins</div><div class="fin2-mini-v">${paiePeriode.length}</div></div>
        <div><div class="fin2-mini-k">Moyenne</div><div class="fin2-mini-v">${fin2Eur(masseSalariale / paiePeriode.length)}</div></div>
      </div>
      ${lignes.map(x => `<div class="fin2-row">
        <span class="fin2-dot-c" style="background:${x.c}"></span>
        <span style="flex:1;min-width:0" class="fin2-row-t">${fin2Esc(x.l)}</span>
        <span class="fin2-row-v">${fin2Eur(x.v)}</span>
      </div>`).join('')}`;
  }

  // ── Contrats & effectif ─────────────────────────────────────────────
  const contratsActifs = contrats.filter(c => (c.statut || 'actif') === 'actif');
  const parType = {};
  contratsActifs.forEach(c => { parType[c.type] = (parType[c.type] || 0) + 1; });
  const typeL = { cdi: 'CDI', cdd: 'CDD', vacation: 'Vacation', stage: 'Stage', alternance: 'Alternance' };
  const typeC = { cdi: '#4ade80', cdd: '#f59e0b', vacation: '#818cf8', stage: '#22d3ee', alternance: '#8b5cf6' };
  document.getElementById('finContrats').innerHTML = `
    <div class="fin2-mini">
      <div><div class="fin2-mini-k">Effectif</div><div class="fin2-mini-v">${employes.length}</div></div>
      <div><div class="fin2-mini-k">Contrats actifs</div><div class="fin2-mini-v" style="color:#4ade80">${contratsActifs.length}</div></div>
    </div>
    ${Object.entries(parType).map(([t, n]) => `<div class="fin2-row">
      <span class="fin2-dot-c" style="background:${typeC[t] || '#8095b4'}"></span>
      <span style="flex:1;min-width:0" class="fin2-row-t">${fin2Esc(typeL[t] || t)}</span>
      <span class="fin2-row-v">${n}</span>
    </div>`).join('') || fin2Vide('Aucun contrat actif.')}`;

  // ── Top dépenses ────────────────────────────────────────────────────
  const topDep = [...acceptees].sort((a, b) => (Number(b.montant) || 0) - (Number(a.montant) || 0)).slice(0, 5);
  document.getElementById('finTopDepenses').innerHTML = topDep.length ? topDep.map((d, i) => `
    <div class="fin2-row">
      <span class="fin2-rank${i === 0 ? ' first' : ''}">${i + 1}</span>
      <span style="flex:1;min-width:0">
        <div class="fin2-row-t">${fin2Esc(d.motif || '—')}</div>
        <div class="fin2-row-m">${fin2Esc(d.employeNom || '')} · ${fin2Date(d.dateDepense)}</div>
      </span>
      <span class="fin2-row-v" style="color:var(--v2-danger-text)">${fin2Eur(d.montant)}</span>
    </div>`).join('') : fin2Vide('Aucune dépense validée.');

  // ── Top dépensiers ──────────────────────────────────────────────────
  const parEmploye = {};
  acceptees.forEach(d => { const k = d.employeNom || '—'; parEmploye[k] = (parEmploye[k] || 0) + (Number(d.montant) || 0); });
  const topEmp = Object.entries(parEmploye).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxEmp = Math.max(1, ...topEmp.map(([, v]) => v));
  document.getElementById('finTopEmployes').innerHTML = topEmp.length ? topEmp.map(([nom, montant], i) => `
    <div class="fin2-row">
      <span class="fin2-rank${i === 0 ? ' first' : ''}">${i + 1}</span>
      <span style="flex:1;min-width:0">
        <div class="fin2-row-t">${fin2Esc(nom)}</div>
        <div class="v2-prog v2-bar-sm" style="margin-top:6px"><span style="width:${Math.round(montant / maxEmp * 100)}%;background:#818cf8"></span></div>
      </span>
      <span class="fin2-row-v">${fin2Eur(montant)}</span>
    </div>`).join('') : fin2Vide('Aucune donnée.');

  // ── Recettes de l'exercice ──────────────────────────────────────────
  fin2RenderRecettes(annee);

  // ── Tableau des opérations ──────────────────────────────────────────
  const ops = [];
  demandes.forEach(d => ops.push({
    date: d.dateDepense, type: 'Dépense',
    label: `${d.motif || '—'} (${d.employeNom || ''})`,
    montant: -Number(d.montant || 0), statut: d.statut
  }));
  fichesPaie.forEach(f => ops.push({
    date: f.dateAjout ? f.dateAjout.slice(0, 10) : (f.createdAt ? String(f.createdAt).slice(0, 10) : ''),
    type: 'Paie', label: `Fiche de paie — ${f.employeNom || ''} (${f.periode || ''})`,
    montant: -Number(f.net || 0), statut: 'accepte'
  }));
  FIN2_RECETTES.forEach(r => ops.push({
    date: r.annee ? `${r.annee}-12-31` : '', type: 'Recette',
    label: `${r.libelle} (${r.annee || ''})`, montant: Number(r.montant || 0), statut: 'justifie'
  }));
  ops.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const stTypes = {
    accepte:    { cls: 'dc-b-cyan',   l: 'Justif. attendu' },
    justifie:   { cls: 'dc-b-green',  l: 'Justifié' },
    en_attente: { cls: 'dc-b-amber',  l: 'En attente' },
    refuse:     { cls: 'dc-b-red',    l: 'Refusé' }
  };
  const typeBadge = { 'Dépense': 'dc-b-red', 'Paie': 'dc-b-indigo', 'Recette': 'dc-b-green' };
  document.getElementById('finOpsBody').innerHTML = ops.slice(0, 20).map(o => {
    const st = stTypes[o.statut] || stTypes.accepte;
    return `<tr>
      <td style="color:var(--v2-t6);white-space:nowrap">${o.date ? fin2Date(o.date) : '—'}</td>
      <td><span class="dc-badge ${typeBadge[o.type] || 'dc-b-gray'}"><span class="d"></span>${o.type}</span></td>
      <td style="color:var(--v2-t2)">${fin2Esc(o.label)}</td>
      <td class="num" style="color:${o.montant < 0 ? 'var(--v2-danger-text)' : '#34d399'}">${o.montant < 0 ? '−' : '+'}${fin2Eur(Math.abs(o.montant))}</td>
      <td><span class="dc-badge ${st.cls}"><span class="d"></span>${st.l}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="fin2-vide">Aucune opération enregistrée.</td></tr>`;

  window._finOps = ops;
}

// ══ RECETTES ══════════════════════════════════════════════════════════
function fin2RenderRecettes(annee) {
  const el = document.getElementById('finRecettes');
  if (!el) return;
  const admin = fin2IsAdmin();
  const btn = document.getElementById('finAddRecette');
  if (btn) btn.style.display = admin ? '' : 'none';

  const lignes = FIN2_RECETTES.filter(r => r.annee === Number(annee));
  if (FIN2_MISSING.finance_recettes) {
    el.innerHTML = `<div class="v2-note v2-note-warn">${fin2Svg(FIN2_IC.warn)}<span>Table « finance_recettes » absente : exécutez migration-finance.sql pour saisir les recettes.</span></div>`;
    return;
  }
  if (!lignes.length) { el.innerHTML = fin2Vide('Aucune recette saisie pour ' + annee + '.'); return; }
  const total = lignes.reduce((s, r) => s + r.montant, 0);
  el.innerHTML = lignes.map(r => `<div class="fin2-row">
      <span class="fin2-dot-c" style="background:#34d399"></span>
      <span style="flex:1;min-width:0" class="fin2-row-t">${fin2Esc(r.libelle)}</span>
      <span class="fin2-row-v" style="color:#34d399">${fin2Eur(r.montant)}</span>
      ${admin ? `<button type="button" class="v2-btn v2-btn-sm" title="Supprimer" onclick="fin2DeleteRecette('${r.id}')">${fin2Svg(FIN2_IC.trash)}</button>` : ''}
    </div>`).join('') +
    `<div class="fin2-row"><span style="flex:1" class="fin2-row-t">Total ${annee}</span><span class="fin2-row-v">${fin2Eur(total)}</span></div>`;
}

function fin2Modal(id, opts) {
  document.getElementById(id)?.remove();
  const div = document.createElement('div');
  div.innerHTML = `<div class="v2-ov" id="${id}" onclick="if(event.target===this)fin2CloseModal('${id}')">
    <div class="v2-md" style="--mc:${opts.c || '#22d3ee'}">
      <div class="v2-md-h">
        <span class="v2-md-ico">${fin2Svg(opts.icon || FIN2_IC.euro)}</span>
        <div><div class="v2-md-t">${fin2Esc(opts.title)}</div>${opts.sub ? `<div class="v2-md-s">${fin2Esc(opts.sub)}</div>` : ''}</div>
        <button type="button" class="v2-md-x" onclick="fin2CloseModal('${id}')">${fin2Svg(FIN2_IC.x)}</button>
      </div>
      <div class="v2-md-b">${opts.body}</div>
      <div class="v2-md-f">${opts.footer}</div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
  requestAnimationFrame(() => document.getElementById(id)?.classList.add('open'));
}
function fin2CloseModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => m.remove(), 220);
}

function fin2OpenRecetteModal() {
  if (!fin2IsAdmin()) { toast('Action réservée aux administrateurs', 'error'); return; }
  const annee = new Date().getFullYear();
  fin2Modal('modalFinRecette', {
    title: 'Nouvelle recette',
    sub: 'Produit de l’exercice (prix de journée, dotation…)',
    c: '#34d399',
    icon: FIN2_IC.wallet,
    body: `
      <div><label class="v2-fld-l" for="finRecLib">Libellé</label>
        <input type="text" id="finRecLib" class="v2-fld" placeholder="Prix de journée — juin" maxlength="120"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="finRecMontant">Montant (€)</label>
          <input type="number" id="finRecMontant" class="v2-fld" min="0" step="0.01" placeholder="0,00"/></div>
        <div><label class="v2-fld-l" for="finRecAnnee">Exercice</label>
          <input type="number" id="finRecAnnee" class="v2-fld" min="2000" max="2100" step="1" value="${annee}"/></div>
      </div>
      ${FIN2_MISSING.finance_recettes ? `<div class="v2-note v2-note-warn">${fin2Svg(FIN2_IC.warn)}<span>Table absente : exécutez migration-finance.sql pour pouvoir enregistrer.</span></div>` : ''}`,
    footer: `<button type="button" class="v2-btn-sec" onclick="fin2CloseModal('modalFinRecette')">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="fin2SaveRecette()">${fin2Svg(FIN2_IC.save)} Enregistrer</button>`
  });
}

async function fin2SaveRecette() {
  if (!fin2IsAdmin()) { toast('Action réservée aux administrateurs', 'error'); return; }
  if (FIN2_MISSING.finance_recettes) { fin2WriteRefused('finance_recettes'); return; }
  const libelle = (document.getElementById('finRecLib')?.value || '').trim();
  const montant = parseFloat(document.getElementById('finRecMontant')?.value);
  const annee = parseInt(document.getElementById('finRecAnnee')?.value, 10);
  if (!libelle) { toast('Le libellé est requis', 'error'); return; }
  if (isNaN(montant) || montant < 0) { toast('Montant invalide', 'error'); return; }
  if (isNaN(annee) || annee < 2000 || annee > 2100) { toast('Exercice invalide', 'error'); return; }
  const etab = await fin2Etab();
  try {
    const { error } = await supabaseClient.from('finance_recettes')
      .insert({ etablissement_id: etab, libelle, montant, annee });
    if (error) throw error;
  } catch (e) {
    console.error(e);
    fin2WriteRefused('finance_recettes');
    return;
  }
  await fin2LoadRecettes();
  fin2CloseModal('modalFinRecette');
  toast('Recette enregistrée');
  renderFinance();
}

async function fin2DeleteRecette(id) {
  if (!fin2IsAdmin()) { toast('Action réservée aux administrateurs', 'error'); return; }
  if (FIN2_MISSING.finance_recettes) { fin2WriteRefused('finance_recettes'); return; }
  if (!confirm('Supprimer cette recette ?')) return;
  try {
    const { error } = await supabaseClient.from('finance_recettes').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error(e);
    fin2WriteRefused('finance_recettes');
    return;
  }
  FIN2_RECETTES = FIN2_RECETTES.filter(r => r.id !== id);
  window.FIN2_RECETTES = FIN2_RECETTES;
  toast('Recette supprimée', 'info');
  renderFinance();
}

// ══ ACCÈS & AMORÇAGE ══════════════════════════════════════════════════
// Le contrôle d'accès reste celui de js/finance.js : module réservé aux
// administrateurs. On le rejoue ici pour l'afficher dans la coquille V2.
function fin2Deny() {
  const body = document.querySelector('.v2-body');
  if (body) body.innerHTML = `<div class="fin2-deny">
    <h3>Accès réservé</h3>
    <p>Ce module est réservé aux administrateurs.</p>
    <a href="accueil.html" class="v2-btn v2-btn-primary" style="display:inline-flex">← Retour à l'accueil</a>
  </div>`;
  document.querySelectorAll('.fin2-actions .v2-btn, .fin2-per').forEach(el => el.remove());
}

// js/finance.js a posé son écouteur DOMContentLoaded en capturant SA version
// d'initFinance : la redéfinition ne l'atteindrait pas. On ajoute donc un
// second écouteur — le rendu, lui, passe bien par le renderFinance() V2.
document.addEventListener('DOMContentLoaded', async () => {
  const anneeEl = document.getElementById('finAnnee');
  if (anneeEl) anneeEl.textContent = new Date().getFullYear();
  if (typeof Auth === 'undefined' || !Auth.getSession()) return;
  if (!fin2IsAdmin()) { fin2Deny(); return; }
  await fin2LoadRecettes();
  renderFinance();
});

// Un `const`/`function` de premier niveau ne suffit pas toujours : on publie
// explicitement ce que lisent les onclick inline et la navigation en iframe.
window.renderFinance = renderFinance;
window.fin2OpenRecetteModal = fin2OpenRecetteModal;
window.fin2SaveRecette = fin2SaveRecette;
window.fin2DeleteRecette = fin2DeleteRecette;
window.fin2CloseModal = fin2CloseModal;
window.FIN2_MISSING = FIN2_MISSING;
