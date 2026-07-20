// ══════════════════════════════════════════════════════════════════════════
// PLANNING ÉQUIPE — DESIGN V2
// Reproduit la maquette « Planning équipe - refonte (bento) » :
//   tuiles de statistiques · grille salariés × jours · légende + récapitulatif
//   des heures · panneau « Conformité — Code du travail » · alertes réglementaires.
//
// Ce fichier ne s'occupe QUE du rendu et des contrôles automatiques.
// Les données et les actions (créneaux, import, export, copie de semaine)
// restent celles de js/planning-equipe.js et js/planning-equipe-supabase.js.
// ══════════════════════════════════════════════════════════════════════════

// ── Palette des types de créneau (calibrée pour le thème sombre) ─────────
const PE2_TYPES = {
  matin:     { l: 'Matin',      c: '#10b981' },
  apresmidi: { l: 'Après-midi', c: '#f59e0b' },
  journee:   { l: 'Journée',    c: '#22d3ee' },
  nuit:      { l: 'Nuit',       c: '#818cf8' }
};

// Statut de pointage → couleur de la bordure gauche du créneau
const PE2_PT = { valide: '#16a34a', ecart: '#9333ea', attente: '#d97706', absence: '#dc2626' };

const PE2_AV = ['#22d3ee', '#818cf8', '#f59e0b', '#a855f7', '#ec4899', '#10b981', '#64748b', '#f472b6'];

const PE2_ICO = {
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  warn:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  info:  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
};

function pe2Svg(path, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// ══ SEUILS RÉGLEMENTAIRES ════════════════════════════════════════════════
// Valeurs légales par défaut. La table planning_regles_travail (facultative,
// cf. migration-planning-equipe.sql) permet de les ajuster par établissement.
const PE2_REGLES_DEF = [
  { code: 'repos_quotidien', label: 'Repos quotidien',        unite: 'h', seuil: 11, detail: s => `${s} h consécutives mini entre 2 postes` },
  { code: 'repos_hebdo',     label: 'Repos hebdomadaire',     unite: 'h', seuil: 35, detail: s => `${s} h consécutives (24 h + 11 h)` },
  { code: 'duree_jour',      label: 'Durée max / jour',       unite: 'h', seuil: 10, detail: s => `${s} h de travail effectif` },
  { code: 'duree_semaine',   label: 'Durée max / semaine',    unite: 'h', seuil: 48, detail: s => `${s} h (44 h en moy. sur 12 sem.)` },
  { code: 'pause',           label: 'Pause obligatoire',      unite: 'h', seuil: 6,  detail: s => `20 min dès ${s} h de travail` },
  { code: 'nuit',            label: 'Travail de nuit',        unite: 'h', seuil: 8,  detail: s => `21 h–6 h · ${s} h max · ${pe2Seuil('nuits_consec')} nuits d'affilée maxi` },
  // Contrôlé sous « Travail de nuit » : seuil réglable, pas de carte dédiée
  { code: 'nuits_consec',    label: 'Nuits consécutives',     unite: '',  seuil: 4,  carte: false, detail: s => `${s} nuits d'affilée → repos compensateur` },
  { code: 'repos_dominical', label: 'Repos dominical',        unite: '',  seuil: 2,  detail: s => `1 dimanche / ${s} en moyenne` }
];

let _pe2Seuils = {};   // code → valeur effective
let _pe2SeuilsOk = false;

function pe2Seuil(code) {
  if (Object.prototype.hasOwnProperty.call(_pe2Seuils, code)) return _pe2Seuils[code];
  const d = PE2_REGLES_DEF.find(r => r.code === code);
  return d ? d.seuil : 0;
}

// Lecture tolérante : table absente / couche Supabase non chargée →
// seuils légaux par défaut + console.warn, la page reste utilisable.
async function pe2LoadSeuils() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    console.warn('[planning équipe] Supabase indisponible — seuils légaux par défaut');
    return;
  }
  try {
    const { data, error } = await supabaseClient
      .from('planning_regles_travail').select('code,seuil,actif');
    if (error) throw error;
    _pe2SeuilsOk = true;
    (data || []).forEach(r => { if (r.actif !== false) _pe2Seuils[r.code] = Number(r.seuil); });
  } catch (e) {
    console.warn('[planning équipe] table planning_regles_travail absente — seuils légaux par défaut ' +
      '(exécuter migration-planning-equipe.sql pour les personnaliser)', e?.message || e);
  }
}

// ══ HELPERS ══════════════════════════════════════════════════════════════
function pe2Ini(emp) {
  return ((emp.prenom || '')[0] || '') + ((emp.nom || '')[0] || '') || '?';
}
function pe2Color(emp, i) {
  return emp && emp.color ? emp.color : PE2_AV[i % PE2_AV.length];
}
function pe2Avatar(emp, i, cls) {
  const col = pe2Color(emp, i);
  if (emp && emp.photo) {
    return `<span class="${cls}" style="background:${col}"><img src="${escHtml(emp.photo)}" alt=""/></span>`;
  }
  return `<span class="${cls}" style="background:${col}">${escHtml(pe2Ini(emp))}</span>`;
}
function pe2Nom(emp) { return ((emp.prenom || '') + ' ' + (emp.nom || '')).trim(); }

// Minutes absolues (depuis l'époque) d'un créneau, nuit gérée
function pe2Abs(s) {
  const base = new Date(s.date + 'T00:00:00').getTime() / 60000;
  const [h1, m1] = s.debut.split(':').map(Number);
  const [h2, m2] = s.fin.split(':').map(Number);
  let st = base + h1 * 60 + m1, en = base + h2 * 60 + m2;
  if (en <= st) en += 1440;
  return [st, en];
}
function pe2WeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return peISO(d);
}
function pe2Shift(iso, delta) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return peISO(d);
}
function pe2H(mins) { return Math.round(mins / 6) / 10; }   // minutes → heures à 0,1 près

// ══ CONTRÔLE AUTOMATIQUE — CODE DU TRAVAIL ═══════════════════════════════
// Renvoie { regles:[…], alertes:[…] }. Rien n'est inventé : tout est déduit
// des créneaux enregistrés. Une règle sans anomalie est affichée « OK ».
function pe2Conformite(days, employes, shiftsAll) {
  const d0 = peISO(days[0]), d1 = peISO(days[days.length - 1]);
  const lo = pe2Shift(d0, -2), hi = pe2Shift(d1, 2);
  const dayStrs = days.map(peISO);
  const alertes = [];
  const compte = {};   // code → nb d'anomalies
  const info = {};     // code → détail informatif
  PE2_REGLES_DEF.forEach(r => compte[r.code] = 0);

  const sQuot = pe2Seuil('repos_quotidien'), sHebdo = pe2Seuil('repos_hebdo');
  const sJour = pe2Seuil('duree_jour'), sSem = pe2Seuil('duree_semaine');
  const sPause = pe2Seuil('pause'), sNuit = pe2Seuil('nuit');
  const sNuits = pe2Seuil('nuits_consec'), sDim = pe2Seuil('repos_dominical');

  let pauseDues = 0, semSup = 0;

  const push = (emp, i, code, titre, regle, niveau, couleur) => {
    compte[code]++;
    alertes.push({ emp, i, code, titre, regle, niveau, c: couleur,
      poids: couleur === '#ef4444' ? 0 : 1 });
  };

  employes.forEach((emp, i) => {
    const nom = pe2Nom(emp);
    const list = shiftsAll
      .filter(s => String(s.employeId) === String(emp.id) && s.date >= lo && s.date <= hi && s.debut && s.fin)
      .map(s => ({ s, r: pe2Abs(s) }))
      .sort((a, b) => a.r[0] - b.r[0]);

    // 1) Repos quotidien
    for (let k = 1; k < list.length; k++) {
      const gap = list[k].r[0] - list[k - 1].r[1];
      if (gap < 0) continue;
      if (gap < sQuot * 60 && dayStrs.includes(list[k].s.date)) {
        push(emp, i, 'repos_quotidien',
          `${nom} — repos quotidien ${pe2H(gap)} h`,
          `Enchaînement ${list[k - 1].s.debut}–${list[k - 1].s.fin} → ${list[k].s.debut} le ${list[k].s.date} : minimum ${sQuot} h`,
          'Non conforme', '#ef4444');
        break;   // une alerte par salarié et par règle
      }
    }

    // 2) Durée max / jour + pause obligatoire
    const parJour = {};
    list.forEach(({ s, r }) => {
      if (!dayStrs.includes(s.date)) return;
      parJour[s.date] = (parJour[s.date] || 0) + (r[1] - r[0]);
      if (r[1] - r[0] >= sPause * 60) pauseDues++;
    });
    const jourKo = Object.entries(parJour).find(([, m]) => m > sJour * 60);
    if (jourKo) {
      push(emp, i, 'duree_jour',
        `${nom} — ${pe2H(jourKo[1])} h travaillées le ${jourKo[0]}`,
        `Durée maximale quotidienne : ${sJour} h de travail effectif`,
        'Non conforme', '#ef4444');
    }

    // 3) Durée max / semaine (+ heures supplémentaires)
    const parSem = {};
    list.forEach(({ s, r }) => {
      if (!dayStrs.includes(s.date)) return;
      const k = pe2WeekKey(s.date);
      parSem[k] = (parSem[k] || 0) + (r[1] - r[0]);
    });
    Object.entries(parSem).forEach(([k, m]) => {
      const h = pe2H(m);
      if (h > 35) semSup++;
      if (m > sSem * 60) {
        push(emp, i, 'duree_semaine', `${nom} — ${h} h la semaine du ${k}`,
          `Durée maximale hebdomadaire : ${sSem} h`, 'Non conforme', '#ef4444');
      } else if (m > 44 * 60) {
        push(emp, i, 'duree_semaine', `${nom} — ${h} h la semaine du ${k}`,
          'Contrôler la moyenne de 44 h sur 12 semaines consécutives', 'À surveiller', '#f59e0b');
      }
    });

    // 4) Repos hebdomadaire : plus longue plage libre de chaque semaine couverte
    Object.keys(parSem).forEach(k => {
      const wStart = new Date(k + 'T00:00:00').getTime() / 60000;
      const wEnd = wStart + 7 * 1440;
      const occ = list.filter(({ r }) => r[1] > wStart && r[0] < wEnd)
        .map(({ r }) => [Math.max(r[0], wStart), Math.min(r[1], wEnd)])
        .sort((a, b) => a[0] - b[0]);
      let libre = 0, curseur = wStart;
      occ.forEach(([a, b]) => { if (a - curseur > libre) libre = a - curseur; curseur = Math.max(curseur, b); });
      if (wEnd - curseur > libre) libre = wEnd - curseur;
      if (libre < sHebdo * 60) {
        push(emp, i, 'repos_hebdo', `${nom} — repos hebdomadaire ${pe2H(libre)} h`,
          `Semaine du ${k} : minimum ${sHebdo} h consécutives`, 'À surveiller', '#f59e0b');
      }
    });

    // 5) Travail de nuit : durée max + nuits consécutives
    const nuits = list.filter(({ s }) => dayStrs.includes(s.date) && peShiftType(s.debut, s.fin) === 'nuit');
    const nuitLongue = nuits.find(({ r }) => r[1] - r[0] > sNuit * 60);
    if (nuitLongue) {
      push(emp, i, 'nuit', `${nom} — poste de nuit de ${pe2H(nuitLongue.r[1] - nuitLongue.r[0])} h`,
        `Travail de nuit : ${sNuit} h maximum par poste`, 'À surveiller', '#f59e0b');
    }
    const datesNuit = [...new Set(nuits.map(({ s }) => s.date))].sort();
    let suite = 0, maxSuite = 0;
    datesNuit.forEach((d, k) => {
      suite = (k > 0 && pe2Shift(datesNuit[k - 1], 1) === d) ? suite + 1 : 1;
      if (suite > maxSuite) maxSuite = suite;
    });
    if (maxSuite >= sNuits) {
      push(emp, i, 'nuit', `${nom} — ${maxSuite} nuits consécutives`,
        'Travail de nuit : repos compensateur à programmer', 'Repos dû', '#f59e0b');
    }

    // 6) Repos dominical
    const dims = dayStrs.filter(d => new Date(d + 'T00:00:00').getDay() === 0);
    if (dims.length >= sDim) {
      const trav = dims.filter(d => list.some(({ s }) => s.date === d)).length;
      if (trav * sDim > dims.length) {
        push(emp, i, 'repos_dominical', `${nom} — ${trav} dimanche(s) sur ${dims.length}`,
          `Repos dominical : 1 dimanche sur ${sDim} en moyenne`, 'À surveiller', '#f59e0b');
      }
    }
  });

  info.pause = pauseDues;
  info.heures_sup = semSup;

  const regles = PE2_REGLES_DEF.filter(r => r.carte !== false).map(r => {
    const n = compte[r.code];
    let tag = 'OK', c = '#10b981', ico = PE2_ICO.check, detail = r.detail(pe2Seuil(r.code));
    if (r.code === 'pause') {
      tag = 'Info'; c = '#22d3ee'; ico = PE2_ICO.info;
      detail = `${info.pause} créneau(x) ≥ ${sPause} h sur la période → pause due`;
    } else if (n > 0) {
      const grave = alertes.some(a => a.code === r.code && a.c === '#ef4444');
      tag = grave ? `${n} non conforme${n > 1 ? 's' : ''}` : `${n} à surveiller`;
      c = grave ? '#ef4444' : '#f59e0b';
      ico = PE2_ICO.warn;
    }
    return { label: r.label, detail, tag, c, ico };
  });

  // Majoration des heures supplémentaires : information réglementaire calculée
  regles.push({
    label: 'Majoration heures sup.',
    detail: `+25% (36-43 h) · +50% (44 h+) — ${info.heures_sup} semaine(s) > 35 h`,
    tag: 'Info', c: '#22d3ee', ico: PE2_ICO.info
  });

  alertes.sort((a, b) => a.poids - b.poids);
  return { regles, alertes };
}

// ══ RENDU ════════════════════════════════════════════════════════════════
function pe2Days() {
  const days = [];
  if (peViewMode === 'mois') {
    const ms = new Date(peMonthCursor);
    const fin = new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= fin; d++) days.push(new Date(ms.getFullYear(), ms.getMonth(), d));
  } else {
    for (let i = 0; i < 7; i++) {
      const d = new Date(peWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
  }
  return days;
}

function pe2Render() {
  const isWeek = peViewMode !== 'mois';
  const days = pe2Days();
  _peLastDays = days;
  const dayStrs = days.map(peISO);
  const todayStr = today();
  const canEdit = peCanEditPlanning();

  // ── Barre du haut ────────────────────────────────────────────────────
  const lbl = document.getElementById('peWeekLabel');
  if (lbl) {
    lbl.textContent = isWeek
      ? `${peFormatShort(days[0])} – ${peFormatShort(days[6])} ${days[6].getFullYear()}`
      : peMonthCursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  const wBtn = document.getElementById('peViewWeekBtn'), mBtn = document.getElementById('peViewMonthBtn');
  if (wBtn) wBtn.classList.toggle('on', isWeek);
  if (mBtn) mBtn.classList.toggle('on', !isWeek);

  const hint = document.getElementById('peHint');
  if (hint) hint.textContent = canEdit ? 'Cliquez sur une case pour ajouter ou modifier un créneau' : 'Lecture seule';
  const copyBtn = document.getElementById('peCopyBtn');
  if (copyBtn) copyBtn.style.display = (canEdit && isWeek) ? '' : 'none';
  const seuilsBtn = document.getElementById('peSeuilsBtn');
  if (seuilsBtn) seuilsBtn.style.display = canEdit ? '' : 'none';

  // ── Données ──────────────────────────────────────────────────────────
  const allEmployes = getPeEmployes();
  const sel = document.getElementById('peMetierFilter');
  if (sel) {
    const metiers = [...new Set(allEmployes.map(e => e.poste).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Tous les métiers</option>' +
      metiers.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');
    sel.value = peMetierFilter;
  }

  const employes = peMetierFilter ? allEmployes.filter(e => e.poste === peMetierFilter) : allEmployes;
  const empIds = new Set(employes.map(e => e.id));
  const shiftsAll = getPeShifts();
  const shiftsPeriode = shiftsAll.filter(s => dayStrs.includes(s.date));
  const shiftsStats = peMetierFilter ? shiftsPeriode.filter(s => empIds.has(s.employeId)) : shiftsPeriode;

  const byEmp = {};
  shiftsPeriode.forEach(s => { const k = s.employeId || 'NA'; (byEmp[k] = byEmp[k] || []).push(s); });

  const congesOk = _peCongesCache.filter(c => c.statut === 'accepte');
  const enConge = (id, d) => congesOk.some(c => String(c.employeId) === String(id) && d >= c.debut && d <= c.fin);

  // ── Statistiques ─────────────────────────────────────────────────────
  const totalMins = shiftsStats.reduce((t, s) => t + peDuration(s.debut, s.fin), 0);
  const joursVides = dayStrs.filter(d => !shiftsStats.some(s => s.date === d)).length;
  let ecarts = 0;
  employes.forEach(emp => {
    const fid = peResolveEmployeFicheId(emp);
    (byEmp[emp.id] || []).forEach(s => {
      const p = _pePointagesCache.find(x => String(x.employeId) === String(fid) && x.date === s.date);
      if (p && p.arrivee && p.depart && (p.arrivee !== s.debut || p.depart !== s.fin)) ecarts++;
    });
  });

  const stats = [
    { n: peFormatDuration(totalMins), l: 'Heures planifiées', c: '#22d3ee', i: PE2_ICO.clock },
    { n: String(employes.length),     l: 'Salariés',          c: '#818cf8', i: PE2_ICO.users },
    { n: String(joursVides),          l: joursVides > 1 ? 'Jours sans créneau' : 'Jour sans créneau', c: joursVides ? '#ef4444' : '#10b981', i: PE2_ICO.warn },
    { n: String(ecarts),              l: ecarts > 1 ? 'Écarts de pointage' : 'Écart de pointage', c: ecarts ? '#9333ea' : '#10b981', i: PE2_ICO.check }
  ];
  const elStats = document.getElementById('pe2Stats');
  if (elStats) elStats.innerHTML = stats.map(s => `
    <div class="pe2-stat" style="--pc:${s.c}">
      <span class="pe2-stat-ico">${pe2Svg(s.i)}</span>
      <div><div class="pe2-stat-n">${escHtml(s.n)}</div><div class="pe2-stat-l">${escHtml(s.l)}</div></div>
    </div>`).join('');

  // ── Grille ───────────────────────────────────────────────────────────
  const grid = document.getElementById('peGrid');
  if (!grid) return;

  if (!employes.length) {
    grid.innerHTML = `<div class="v2-blk-vide" style="padding:40px;text-align:center">${
      peMetierFilter
        ? `Aucun salarié pour le métier « ${escHtml(peMetierFilter)} ».`
        : 'Aucun salarié enregistré. Ajoutez des salariés pour gérer le planning.'
    }</div>`;
    pe2RenderBas(days, [], [], { regles: [], alertes: [] });
    return;
  }

  const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const head = days.map((d, i) => {
    const dow = (d.getDay() + 6) % 7;
    const cls = 'pe2-h-day' + (dayStrs[i] === todayStr ? ' today' : '') + (dow >= 5 ? ' we' : '');
    return `<th class="${cls}"><div class="pe2-h-dow">${DOW[dow]}</div><div class="pe2-h-num">${d.getDate()}</div></th>`;
  }).join('');

  // Ligne « couverture »
  const covRow = `<tr class="pe2-row-meta">
    <td class="pe2-c-emp"><div class="pe2-lbl">Couverture</div></td>
    ${days.map(d => {
      const ds = peISO(d);
      const n = {}; Object.keys(PE2_TYPES).forEach(k => n[k] = 0);
      shiftsStats.filter(s => s.date === ds).forEach(s => n[peShiftType(s.debut, s.fin)]++);
      return `<td class="pe2-cell"><div class="pe2-cov">${Object.entries(PE2_TYPES).map(([k, t]) =>
        `<b style="color:${n[k] ? t.c : 'rgba(255,255,255,.22)'}" title="${escHtml(t.l)}"><i style="background:${n[k] ? t.c : 'rgba(255,255,255,.14)'}"></i>${n[k]}</b>`).join('')}</div></td>`;
    }).join('')}
    <td></td></tr>`;

  // Ligne « non assignés »
  const naShifts = byEmp['NA'] || [];
  const naRow = (peMetierFilter || !naShifts.length) ? '' : `<tr class="pe2-row-meta">
    <td class="pe2-c-emp"><div class="pe2-emp">
      <span class="pe2-av" style="background:rgba(255,255,255,.12);color:var(--v2-t5)">NA</span>
      <div style="min-width:0"><div class="pe2-emp-n" style="color:var(--v2-t5)">Non assignés</div>
      <div class="pe2-emp-r">Créneaux sans salarié</div></div></div></td>
    ${days.map(d => {
      const ds = peISO(d);
      const blocs = naShifts.filter(s => s.date === ds).map(s => {
        const t = PE2_TYPES[peShiftType(s.debut, s.fin)];
        return `<div class="pe2-sh" style="--tc:${t.c}" onclick="openPeShiftModal(null,'${ds}','${s.id}')">
          <div class="pe2-sh-t">${escHtml(s.employeNom || '?')}</div>
          <div class="pe2-sh-s">${s.debut}–${s.fin}</div></div>`;
      }).join('');
      return `<td class="pe2-cell">${blocs}</td>`;
    }).join('')}
    <td></td></tr>`;

  // Lignes salariés
  const rows = employes.map((emp, i) => {
    const empShifts = byEmp[emp.id] || [];
    const mins = empShifts.reduce((t, s) => t + peDuration(s.debut, s.fin), 0);
    const contratH = emp.heuresContrat ?? 35;
    const contratMins = Math.round(contratH * 60 * days.length / 7);
    const delta = mins - contratMins;
    const fid = peResolveEmployeFicheId(emp);

    const cells = days.map(d => {
      const ds = peISO(d);
      const dayShifts = empShifts.filter(s => s.date === ds);
      const conge = enConge(emp.id, ds);
      const absent = peIsAbsent(fid, ds);
      const pStat = pePointageStatus(fid, ds);
      const pt = _pePointagesCache.find(p => String(p.employeId) === String(fid) && p.date === ds);
      const pointe = !!(pt && pt.arrivee && pt.depart);

      const blocs = dayShifts.map((s, k) => {
        const t = PE2_TYPES[peShiftType(s.debut, s.fin)];
        const ecart = pointe && (pt.arrivee !== s.debut || pt.depart !== s.fin);
        let ptc = '';
        if (absent) ptc = PE2_PT.absence;
        else if (ecart) ptc = PE2_PT.ecart;
        else if (pStat === 'valide') ptc = PE2_PT.valide;
        else if (pStat === 'attente') ptc = PE2_PT.attente;
        const chevauche = dayShifts.some((s2, k2) => k !== k2 && peOverlaps(s, s2));
        const conflit = chevauche || conge || absent;
        const tt = [];
        if (chevauche) tt.push('⚠ Chevauchement avec un autre créneau ce jour');
        if (conge) tt.push('🏖 Salarié en congé ce jour');
        if (absent) tt.push('🤒 Salarié absent (arrêt / AT) ce jour');
        if (ecart) tt.push(`⏱ Horaires différents du planning (pointé ${pt.arrivee}–${pt.depart})`);
        if (pStat === 'attente') tt.push('⏳ Pointage en attente de validation');
        if (pStat === 'valide') tt.push('✓ Pointage validé');
        const badge = absent ? ' 🤒' : ecart ? ' ⏱' : pStat === 'valide' ? ' ✓' : pStat === 'attente' ? ' ⏳' : '';
        return `<div class="pe2-sh${conflit ? ' confl' : ''}" style="--tc:${t.c}${ptc ? ';--ptc:' + ptc : ''}"
          ${tt.length ? `title="${escHtml(tt.join(' / '))}"` : ''}
          onclick="event.stopPropagation();openPeShiftModal('${emp.id}','${ds}','${s.id}')">
          <div class="pe2-sh-t">${s.debut}–${s.fin}${conflit ? ' ⚠️' : ''}${badge}</div>
          <div class="pe2-sh-s">${escHtml(t.l)} · ${peFormatDuration(peDuration(s.debut, s.fin))}</div>
          ${ecart ? `<div class="pe2-sh-e">pointé ${pt.arrivee}–${pt.depart}</div>` : ''}
        </div>`;
      }).join('');

      const flag = (absent && !dayShifts.length)
        ? '<div class="pe2-flag pe2-flag-abs" title="Arrêt / accident du travail">🤒 Absent</div>'
        : (conge && !dayShifts.length)
          ? '<div class="pe2-flag pe2-flag-cg" title="Congé accepté">🏖 Congé</div>' : '';
      const plus = (canEdit && !dayShifts.length && !conge && !absent) ? '<div class="pe2-add">+</div>' : '';
      const cls = 'pe2-cell' + (ds === todayStr ? ' today' : '') + (canEdit ? ' clic' : '');
      const clic = canEdit ? ` onclick="openPeShiftModal('${emp.id}','${ds}')"` : '';
      return `<td class="${cls}"${clic}>${blocs}${flag}${plus}</td>`;
    }).join('');

    return `<tr>
      <td class="pe2-c-emp"><div class="pe2-emp">
        ${pe2Avatar(emp, i, 'pe2-av')}
        <div style="min-width:0">
          <div class="pe2-emp-n" title="${escHtml(pe2Nom(emp))}">${escHtml(pe2Nom(emp))}</div>
          <div class="pe2-emp-r">${escHtml(emp.poste || '—')} · ${contratH} h/sem</div>
        </div></div></td>
      ${cells}
      <td class="pe2-tot">
        <div class="pe2-tot-n">${peFormatDuration(mins)}</div>
        <div class="pe2-tot-d" style="color:${delta >= 0 ? '#5eead4' : '#fca5a5'}">${peFormatSigned(delta)}</div>
      </td></tr>`;
  }).join('');

  let grand = 0;
  const foot = days.map(d => {
    const ds = peISO(d);
    const m = shiftsStats.filter(s => s.date === ds).reduce((t, s) => t + peDuration(s.debut, s.fin), 0);
    grand += m;
    return `<td class="pe2-day-sum">${m ? peFormatDuration(m) : '—'}</td>`;
  }).join('');

  grid.innerHTML = `<div class="pe2-scroll"><table class="pe2-table${isWeek ? '' : ' pe2-mois'}">
    <thead><tr>
      <th class="pe2-h-emp">Salarié</th>${head}
      <th class="pe2-h-tot">Total (${isWeek ? 'sem' : 'mois'})</th>
    </tr></thead>
    <tbody>${covRow}${naRow}${rows}
      <tr class="pe2-row-sum">
        <td class="pe2-c-emp"><div class="pe2-lbl">Heures travaillées</div></td>
        ${foot}
        <td class="pe2-day-sum">${peFormatDuration(grand)}</td>
      </tr>
    </tbody></table></div>`;

  pe2RenderBas(days, employes, byEmp, pe2Conformite(days, employes, shiftsAll));
}

// ── Légende · récapitulatif · conformité · alertes ──────────────────────
function pe2RenderBas(days, employes, byEmp, conf) {
  const legPt = [
    { l: 'Validé conforme', c: PE2_PT.valide },
    { l: 'Écart (retard / horaires)', c: PE2_PT.ecart },
    { l: 'À valider', c: PE2_PT.attente },
    { l: 'Absence / arrêt', c: PE2_PT.absence }
  ];
  const elLeg = document.getElementById('pe2Legende');
  if (elLeg) elLeg.innerHTML = `
    <div class="pe2-leg">${legPt.map(l =>
      `<span><i style="background:${l.c}"></i>${escHtml(l.l)}</span>`).join('')}</div>
    <div class="pe2-leg-sep"></div>
    <div class="pe2-leg">${Object.values(PE2_TYPES).map(t =>
      `<span><i class="wide" style="background:color-mix(in srgb, ${t.c} 45%, transparent)"></i>${escHtml(t.l)}</span>`).join('')}
      <span><i class="wide" style="background:rgba(255,255,255,.08)"></i>🏖 Congé accepté</span>
      <span><i class="wide" style="background:rgba(239,68,68,.35)"></i>⚠️ Conflit (chevauchement, congé ou absence)</span>
    </div>`;

  // Récapitulatif des heures
  const elRec = document.getElementById('pe2Recap');
  if (elRec) {
    const lignes = employes.map((emp, i) => {
      const mins = (byEmp[emp.id] || []).reduce((t, s) => t + peDuration(s.debut, s.fin), 0);
      const cible = (emp.heuresContrat ?? 35) * 60 * days.length / 7;
      const pct = cible ? Math.min(100, Math.round(mins / cible * 100)) : 0;
      return { nom: pe2Nom(emp), mins, pct, c: pe2Color(emp, i) };
    }).filter(l => l.mins > 0).sort((a, b) => b.mins - a.mins);
    elRec.innerHTML = lignes.length ? lignes.map(l => `
      <div>
        <div class="pe2-recap-h">
          <span class="pe2-recap-n">${escHtml(l.nom)}</span>
          <span class="pe2-recap-v" style="color:${l.c}">${peFormatDuration(l.mins)} · ${l.pct}%</span>
        </div>
        <div class="v2-prog"><span style="width:${l.pct}%;background:${l.c}"></span></div>
      </div>`).join('')
      : '<div class="v2-blk-vide">Aucune heure planifiée sur la période.</div>';
  }

  // Conformité
  const elReg = document.getElementById('pe2Regles');
  if (elReg) elReg.innerHTML = conf.regles.map(r => `
    <div class="pe2-regle" style="--pc:${r.c}">
      <div class="pe2-regle-h">
        <span class="pe2-regle-ico">${pe2Svg(r.ico, 2.4)}</span>
        <span class="pe2-regle-tag">${escHtml(r.tag)}</span>
      </div>
      <div class="pe2-regle-l">${escHtml(r.label)}</div>
      <div class="pe2-regle-d">${escHtml(r.detail)}</div>
    </div>`).join('');

  // Alertes
  const elAl = document.getElementById('pe2Alertes');
  if (elAl) elAl.innerHTML = conf.alertes.length
    ? conf.alertes.map(a => `
      <div class="pe2-alerte" style="--pc:${a.c}">
        ${pe2Avatar(a.emp, a.i, 'pe2-alerte-av')}
        <div style="flex:1;min-width:0">
          <div class="pe2-alerte-t">${escHtml(a.titre)}</div>
          <div class="pe2-alerte-r">${escHtml(a.regle)}</div>
        </div>
        <span class="pe2-alerte-lv">${escHtml(a.niveau)}</span>
      </div>`).join('')
    : `<div class="v2-note v2-note-ok">${pe2Svg(PE2_ICO.check)}Aucune anomalie détectée sur la période contrôlée.</div>`;
}

// ══ MODALE « SEUILS RÉGLEMENTAIRES » ═════════════════════════════════════
function openPeSeuils() {
  if (!peCanEditPlanning()) return;
  const body = document.getElementById('peSeuilsBody');
  if (!body) return;
  body.innerHTML = `
    ${_pe2SeuilsOk ? '' : `<div class="v2-note v2-note-warn">${pe2Svg(PE2_ICO.warn)}
      <div>Table <b>planning_regles_travail</b> absente : les seuils légaux par défaut sont appliqués.
      Exécutez <b>migration-planning-equipe.sql</b> pour les personnaliser.</div></div>`}
    <div class="pe2-seuils">${PE2_REGLES_DEF.map(r => `
      <div class="pe2-seuil">
        <div class="pe2-seuil-l">
          <div class="pe2-seuil-n">${escHtml(r.label)}</div>
          <div class="pe2-seuil-d">${escHtml(r.detail(pe2Seuil(r.code)))}</div>
        </div>
        <input type="number" class="v2-fld" id="peSeuil_${r.code}" min="0" step="0.5"
          value="${pe2Seuil(r.code)}" aria-label="${escHtml(r.label)}"/>
      </div>`).join('')}</div>`;
  openModal('modalPeSeuils');
}

async function savePeSeuils() {
  if (!peCanEditPlanning()) return;
  const maj = PE2_REGLES_DEF.map(r => {
    const el = document.getElementById('peSeuil_' + r.code);
    return { code: r.code, seuil: el ? Number(el.value) : r.seuil };
  }).filter(x => Number.isFinite(x.seuil) && x.seuil > 0);

  try {
    const etab = await sbGetEtablissementId();
    const rows = maj.map(x => ({ etablissement_id: etab, code: x.code, seuil: x.seuil, actif: true }));
    const { error } = await supabaseClient
      .from('planning_regles_travail')
      .upsert(rows, { onConflict: 'etablissement_id,code' });
    if (error) throw error;
    maj.forEach(x => _pe2Seuils[x.code] = x.seuil);
    _pe2SeuilsOk = true;
    if (typeof auditLog === 'function') auditLog('modification', 'Planning équipe — seuils réglementaires mis à jour');
    closeModal('modalPeSeuils');
    toast('Seuils enregistrés ✓', 'success');
    pe2Render();
  } catch (e) {
    console.error('[savePeSeuils]', e);
    toast('Enregistrement impossible — exécutez migration-planning-equipe.sql', 'error');
  }
}

// ══ AMORÇAGE ═════════════════════════════════════════════════════════════
// Les seuils sont une lecture annexe : ils ne doivent ni retarder ni bloquer
// l'affichage du planning.
document.addEventListener('DOMContentLoaded', () => {
  pe2LoadSeuils().then(() => { if (document.getElementById('peGrid')) pe2Render(); });
});
