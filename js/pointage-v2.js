// ══════════════════════════════════════════════════════════════════════════
// POINTAGE & TEMPS DE TRAVAIL — DESIGN V2
// Reproduit la maquette « Pointage (RH) » : tuiles live, pointages du jour,
// anomalies à traiter, compteur d'heures, heures/jour, heures supplémentaires,
// bornes de pointage, annualisation, récupération, temps de repos et
// validation mensuelle.
//
// Ce module ne s'occupe QUE du rendu et des contrôles dérivés.
// Les données et les écritures de pointage restent celles de js/pointage.js
// et js/pointages-supabase.js (sbGetPointages / sbUpsertPointage).
//
// Deux données de la maquette n'ont pas de source en base : les BORNES de
// pointage et le VERROUILLAGE mensuel des feuilles de temps. Elles vivent dans
// les tables créées par migration-pointage.sql. Tant que ce script n'est pas
// exécuté, la lecture renvoie [] avec un console.warn et l'écriture est
// refusée par un toast citant le fichier : la page reste utilisable.
// ══════════════════════════════════════════════════════════════════════════

// ── Palettes ─────────────────────────────────────────────────────────────
const PT2_AV = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];

const PT2_ST = {
  present: { l: 'Présent', c: '#34d399' },
  parti:   { l: 'Parti',   c: '#64748b' },
  absent:  { l: 'Absent',  c: '#ef4444' },
  arret:   { l: 'Absence justifiée', c: '#ef4444' },
  repos:   { l: 'Repos',   c: '#5f7a9c' }
};

const PT2_IC = {
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  bell:  '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>',
  qr:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/>',
  badge: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="14" x2="17" y2="14"/>',
  sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/>',
  lock:  '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  down:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
};

function pt2Svg(p, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

// ── État de la page ──────────────────────────────────────────────────────
let _pt2Date = (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
let _pt2View = 'jour';                  // 'jour' | 'semaine'
let _pt2Bornes = [];    let _pt2BornesOk = false;
let _pt2Verrous = [];   let _pt2VerrousOk = false;
let _pt2BorneEdit = null;
let _pt2Saisie = null;                  // { employeId, date }

// ── Dates ────────────────────────────────────────────────────────────────
function pt2Str(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function pt2AddDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return pt2Str(d);
}
function pt2Week(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;                 // lundi = 0
  const lun = new Date(d.getTime() - dow * 86400000);
  return Array.from({ length: 7 }, (_, i) => pt2Str(new Date(lun.getTime() + i * 86400000)));
}
function pt2Long(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function pt2Court(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
function pt2Mois(dateStr) { return dateStr.slice(0, 7); }
function pt2MoisLabel(mois) {
  return new Date(mois + '-01T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// ── Formats ──────────────────────────────────────────────────────────────
function pt2Min(hhmm) {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}
function pt2FmtH(v) {
  if (!v) return '0h00';
  const s = v < 0 ? '−' : '';
  const a = Math.abs(v);
  const h = Math.floor(a + 1e-9);
  const m = Math.round((a - h) * 60);
  return `${s}${m === 60 ? h + 1 : h}h${String(m === 60 ? 0 : m).padStart(2, '0')}`;
}
function pt2FmtE(v) {
  const r = Math.round(v * 10) / 10;
  return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1).replace('.', ',') + ' h';
}
function pt2Ini(e) { return (((e.prenom || '')[0] || '') + ((e.nom || '')[0] || '')).toUpperCase() || '?'; }
function pt2Nom(e) { return `${e.prenom || ''} ${e.nom || ''}`.trim() || 'Salarié'; }
function pt2Couleur(i) { return PT2_AV[i % PT2_AV.length]; }

// ── Accès aux données (fonctions de js/pointage.js) ──────────────────────
function pt2Emps() {
  const all = ptEmployes();
  const search = (document.getElementById('ptSearch')?.value || '').trim().toLowerCase();
  const poste = document.getElementById('ptFilterPoste')?.value || '';
  return all
    .filter(e => !poste || e.poste === poste)
    .filter(e => !search || pt2Nom(e).toLowerCase().includes(search))
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'));
}
function pt2Entry(e, d) { return ptGetEntry(e.id, d); }
function pt2Shift(e, d) { return ptPlannedShift(ptResolveUserId(e), d); }
function pt2H(en) { return en ? ptCalcHeures(en.arrivee, en.depart, en.pauseMin) : 0; }

// Statut du jour pour un salarié
function pt2Statut(e, d) {
  // Le statut porte déjà l'information : pas de pastille redondante.
  if (ptIsAbsent(e.id, d)) return { k: 'arret', flag: '', fc: '#ef4444' };
  const en = pt2Entry(e, d);
  const sh = pt2Shift(e, d);
  let flag = '', fc = '#64748b';
  if (en && en.arrivee) {
    const a = pt2Min(en.arrivee), dep = pt2Min(en.depart);
    if (a >= 21 * 60 || (dep !== null && dep < a)) { flag = 'Nuit'; fc = '#7c3aed'; }
    if (sh && sh.debut && a > pt2Min(sh.debut) + 5) { flag = 'Retard'; fc = '#f59e0b'; }
  }
  if (en && en.arrivee && en.depart) return { k: 'parti', flag, fc };
  if (en && en.arrivee) return { k: 'present', flag, fc };
  if (sh) return { k: 'absent', flag: 'Non pointé', fc: '#ef4444' };
  return { k: 'repos', flag: '', fc };
}

// ── Verrouillage mensuel ─────────────────────────────────────────────────
function pt2EstVerrouille(mois) {
  return _pt2Verrous.some(v => v.mois === mois && v.verrouille);
}
function pt2CanEdit() { return ptIsCanEdit(); }

// ══ CHARGEMENTS ANNEXES (dégradation douce) ══════════════════════════════
async function pt2LoadBornes() {
  try {
    const { data, error } = await supabaseClient.from('pointage_bornes').select('*').order('nom');
    if (error) throw error;
    _pt2Bornes = data || [];
    _pt2BornesOk = true;
  } catch (e) {
    _pt2Bornes = []; _pt2BornesOk = false;
    console.warn('[pointage] table pointage_bornes indisponible — exécutez migration-pointage.sql :', e?.message || e);
  }
}
async function pt2LoadVerrous() {
  try {
    const { data, error } = await supabaseClient.from('pointage_verrous_mois').select('*').order('mois', { ascending: false });
    if (error) throw error;
    _pt2Verrous = data || [];
    _pt2VerrousOk = true;
  } catch (e) {
    _pt2Verrous = []; _pt2VerrousOk = false;
    console.warn('[pointage] table pointage_verrous_mois indisponible — exécutez migration-pointage.sql :', e?.message || e);
  }
}

// ══ RENDU ════════════════════════════════════════════════════════════════
function pt2Render() {
  if (!document.getElementById('ptStats')) return;
  const emps = (typeof ptEmployes === 'function') ? pt2Emps() : [];
  if (typeof ptPopulatePosteFilter === 'function') ptPopulatePosteFilter(ptEmployes());

  const jours = pt2Week(_pt2Date);
  pt2RenderTop(jours);
  pt2RenderStats(emps, jours);
  pt2RenderTable(emps, jours);
  pt2RenderAnomalies(emps, jours);
  pt2RenderRail(emps, jours);
  pt2RenderFeatures(emps, jours);
}

// ── Barre du haut : libellé de période + horloge ─────────────────────────
function pt2RenderTop(jours) {
  const lbl = document.getElementById('ptWeekLabel');
  if (lbl) {
    lbl.textContent = _pt2View === 'jour'
      ? pt2Long(_pt2Date)
      : `Semaine du ${pt2Court(jours[0])} au ${pt2Court(jours[6])}`;
  }
  document.getElementById('pt2ViewJour')?.classList.toggle('on', _pt2View === 'jour');
  document.getElementById('pt2ViewSem')?.classList.toggle('on', _pt2View === 'semaine');
  pt2Horloge();
}
function pt2Horloge() {
  const el = document.getElementById('pt2Clock');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Tuiles ───────────────────────────────────────────────────────────────
function pt2RenderStats(emps, jours) {
  const d = _pt2Date;
  let presents = 0, heures = 0, retards = 0;
  emps.forEach(e => {
    const st = pt2Statut(e, d);
    if (st.k === 'present') presents++;
    if (st.flag === 'Retard') retards++;
    heures += pt2H(pt2Entry(e, d));
  });
  const anomalies = pt2Anomalies(emps, jours);
  const tiles = [
    { n: `${presents} / ${emps.length}`, l: 'Présents en ce moment', c: '#2dd4bf', i: PT2_IC.users },
    { n: pt2FmtH(heures),                l: 'Heures pointées ce jour', c: '#22d3ee', i: PT2_IC.clock },
    { n: String(retards),                l: 'Retards du jour',        c: '#f59e0b', i: PT2_IC.alert },
    { n: String(anomalies.length),       l: 'Anomalies de la semaine', c: '#fb7185', i: PT2_IC.alert }
  ];
  document.getElementById('ptStats').innerHTML = tiles.map(t => `
    <div class="pt2-stat" style="--pc:${t.c}">
      <span class="pt2-stat-ico">${pt2Svg(t.i)}</span>
      <div><div class="pt2-stat-n">${escHtml(t.n)}</div><div class="pt2-stat-l">${escHtml(t.l)}</div></div>
    </div>`).join('');
}

// ── Tableau principal (vue jour) / grille de saisie (vue semaine) ────────
function pt2RenderTable(emps, jours) {
  const wrap = document.getElementById('ptTableWrap');
  if (!wrap) return;
  if (_pt2View === 'semaine') { wrap.innerHTML = pt2WeekGrid(emps, jours); return; }

  const d = _pt2Date;
  const canEdit = pt2CanEdit();
  const lignes = emps.map((e, i) => {
    const en = pt2Entry(e, d);
    const sh = pt2Shift(e, d);
    const st = pt2Statut(e, d);
    const h = pt2H(en);
    const clic = canEdit ? ` class="clic" onclick="pt2OpenSaisie('${e.id}','${d}')" title="Saisir / régulariser"` : '';
    return `<tr${clic}>
      <td><div class="pt2-who">
        <span class="pt2-av" style="background:${pt2Couleur(i)}">${escHtml(pt2Ini(e))}</span>
        <div style="min-width:0"><div class="pt2-nom">${escHtml(pt2Nom(e))}</div>
        ${e.poste ? `<div class="pt2-poste">${escHtml(e.poste)}</div>` : ''}</div>
      </div></td>
      <td><span class="pt2-hr${en?.arrivee ? '' : ' off'}">${escHtml(en?.arrivee || '—')}</span></td>
      <td><span class="pt2-hr${en?.depart ? '' : ' off'}">${escHtml(en?.depart || '—')}</span></td>
      <td>${h > 0 ? pt2FmtH(h) : '—'}</td>
      <td>${sh ? escHtml(sh.debut + '–' + sh.fin) : '<span style="color:var(--v2-t9)">—</span>'}</td>
      <td><span class="pt2-st" style="--sc:${PT2_ST[st.k].c}"><span class="dot"></span>${PT2_ST[st.k].l}</span></td>
      <td>${st.flag ? `<span class="pt2-flag" style="--fc:${st.fc}">${escHtml(st.flag)}</span>` : ''}
        ${en && en.valide ? `<span class="pt2-flag" style="--fc:#34d399">Validé</span>` : ''}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="pt2-sec-h">
      <span class="pt2-live"></span>
      <span class="pt2-sec-t">Pointages du ${escHtml(pt2Long(d))}</span>
      <span class="pt2-sec-m">${emps.length} salarié${emps.length > 1 ? 's' : ''}${canEdit ? ' · cliquez une ligne pour saisir' : ' · lecture seule'}</span>
    </div>
    <div class="pt2-card"><div class="pt2-scroll">
      ${emps.length ? `<table class="pt2-t">
        <thead><tr><th>Salarié</th><th>Arrivée</th><th>Départ</th><th>Total</th><th>Prévu</th><th>Statut</th><th></th></tr></thead>
        <tbody>${lignes}</tbody></table>`
      : `<div class="pt2-vide">Aucun salarié ne correspond à la recherche.</div>`}
    </div></div>`;
}

function pt2WeekGrid(emps, jours) {
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const todayStr = today();
  const canEdit = pt2CanEdit();
  const verrou = pt2EstVerrouille(pt2Mois(jours[0]));

  const corps = emps.map(e => {
    const contrat = ptContractHeures(e.id);
    let tot = 0, prevu = 0;
    const cells = jours.map(d => {
      if (ptIsAbsent(e.id, d)) return `<td><span class="pt2-abs">Absence justifiée</span></td>`;
      const en = pt2Entry(e, d);
      const sh = pt2Shift(e, d);
      const h = pt2H(en);
      tot += h;
      // « Prévu » s'arrête à aujourd'hui : les jours à venir ne sont pas dus.
      if (sh && d <= todayStr) prevu += ptCalcHeures(sh.debut, sh.fin, 0);
      const valide = !!(en && en.valide);
      const vc = h <= 0 ? '#5f7a9c' : (valide ? '#34d399' : '#f59e0b');
      const manque = sh && !en && d <= todayStr;
      if (!canEdit || verrou) {
        return `<td class="${manque ? 'pt2-manque' : ''}">
          ${sh ? `<div class="pt2-plan" style="cursor:default">${escHtml(sh.debut + '–' + sh.fin)}</div>` : ''}
          <div style="font-weight:700;color:${vc}">${h > 0 ? pt2FmtH(h) : '—'}</div>
          ${h > 0 ? `<div style="font-size:10px;color:${vc}">${valide ? '✓ validé' : 'en attente'}</div>` : ''}</td>`;
      }
      return `<td class="${manque ? 'pt2-manque' : ''}"><div class="pt2-cell">
        ${sh ? `<span class="pt2-plan" onclick="ptCopyFromPlanning('${e.id}','${d}','${ptResolveUserId(e)}')" title="Recopier le créneau prévu">${escHtml(sh.debut + '–' + sh.fin)}</span>` : ''}
        <input type="time" class="pt2-in" value="${escHtml(en?.arrivee || '')}" title="Arrivée" onchange="ptSetField('${e.id}','${d}','arrivee',this.value)"/>
        <input type="time" class="pt2-in" value="${escHtml(en?.depart || '')}" title="Départ" onchange="ptSetField('${e.id}','${d}','depart',this.value)"/>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:11px;font-weight:700;color:${vc}">${h > 0 ? pt2FmtH(h) : '—'}</span>
          ${h > 0 ? `<button type="button" class="pt2-vbadge" style="--vc:${valide ? '#34d399' : '#f59e0b'}" onclick="event.stopPropagation();ptToggleValidation('${e.id}','${d}')">${valide ? '✓ Validé' : 'Valider'}</button>` : ''}
        </div>
      </div></td>`;
    }).join('');
    const ecart = tot - prevu;
    return `<tr>
      <td class="j"><div class="pt2-nom">${escHtml(pt2Nom(e))}</div><div class="pt2-poste">${contrat} h contrat</div></td>
      ${cells}
      <td style="font-weight:700;color:var(--v2-t2)">${pt2FmtH(tot)}</td>
      <td>${prevu ? pt2FmtH(prevu) : '—'}</td>
      <td style="font-weight:700;color:${ecart > 0 ? '#fde68a' : ecart < 0 ? '#fca5a5' : 'var(--v2-t7)'}">${prevu && Math.abs(ecart) >= 0.05 ? pt2FmtE(ecart) : '—'}</td>
    </tr>`;
  }).join('');

  return `
    <div class="pt2-sec-h">
      <span class="pt2-sec-t">Saisie de la semaine</span>
      <span class="pt2-sec-m">${verrou ? 'Mois verrouillé — saisie en lecture seule' : (pt2CanEdit() ? 'Heures réelles · cliquez le créneau prévu pour le recopier' : 'Lecture seule')}</span>
    </div>
    <div class="pt2-card"><div class="pt2-scroll">
      ${emps.length ? `<table class="pt2-wt">
        <thead><tr><th class="j">Salarié</th>
          ${jours.map((d, i) => `<th class="${d === todayStr ? 'today' : ''}">${JOURS[i]}<br/><span style="font-weight:400">${new Date(d + 'T12:00:00').getDate()}</span></th>`).join('')}
          <th>Total</th><th>Prévu</th><th>Écart</th></tr></thead>
        <tbody>${corps}</tbody></table>`
      : `<div class="pt2-vide">Aucun salarié ne correspond à la recherche.</div>`}
    </div></div>`;
}

// ── Anomalies de la semaine ──────────────────────────────────────────────
function pt2Anomalies(emps, jours) {
  const todayStr = today();
  const out = [];
  emps.forEach((e, i) => {
    jours.forEach(d => {
      if (d > todayStr) return;
      if (ptIsAbsent(e.id, d)) return;
      const en = pt2Entry(e, d);
      const sh = pt2Shift(e, d);
      const h = pt2H(en);
      const base = { employeId: e.id, date: d, nom: pt2Nom(e), ini: pt2Ini(e), c: pt2Couleur(i) };
      if (sh && !en) {
        out.push({ ...base, type: 'Créneau non pointé', detail: `Prévu ${sh.debut}–${sh.fin} · ${pt2Court(d)}` });
      } else if (en && en.arrivee && !en.depart && d < todayStr) {
        out.push({ ...base, type: 'Oubli de pointage', detail: `Départ non enregistré · ${pt2Court(d)}` });
      } else if (en && sh && en.arrivee && pt2Min(en.arrivee) > pt2Min(sh.debut) + 5) {
        out.push({ ...base, type: 'Retard', detail: `Arrivée ${en.arrivee} (prévu ${sh.debut}) · ${pt2Court(d)}` });
      } else if (en && sh && h > ptCalcHeures(sh.debut, sh.fin, 0) + 0.5) {
        out.push({ ...base, type: 'Dépassement', detail: `${pt2FmtH(h)} travaillées (${pt2FmtH(ptCalcHeures(sh.debut, sh.fin, 0))} prévues) · ${pt2Court(d)}` });
      }
    });
  });
  return out;
}

function pt2RenderAnomalies(emps, jours) {
  const el = document.getElementById('pt2Anomalies');
  if (!el) return;
  const anos = pt2Anomalies(emps, jours);
  const canEdit = pt2CanEdit();
  const vues = anos.slice(0, 8);
  el.innerHTML = `<div class="pt2-anom">
    <div class="pt2-blk-h" style="color:#fbbf24">${pt2Svg(PT2_IC.alert)}<span class="pt2-anom-t">Anomalies à traiter</span>
      <span class="pt2-blk-m">${anos.length} sur la semaine</span></div>
    ${anos.length ? vues.map(a => `<div class="pt2-row">
      <span class="pt2-av pt2-av-sm" style="background:${a.c}">${escHtml(a.ini)}</span>
      <div class="pt2-row-b">
        <div class="pt2-row-t">${escHtml(a.nom)} — ${escHtml(a.type)}</div>
        <div class="pt2-row-d">${escHtml(a.detail)}</div>
      </div>
      ${canEdit ? `<button type="button" class="pt2-reg" onclick="pt2OpenSaisie('${a.employeId}','${a.date}')">Régulariser</button>` : ''}
    </div>`).join('') + (anos.length > vues.length ? `<div class="pt2-blk-vide">+ ${anos.length - vues.length} autre(s) anomalie(s) sur la semaine.</div>` : '')
    : `<div class="pt2-blk-vide">Aucune anomalie détectée sur la semaine.</div>`}
  </div>`;
}

// ── Rail : compteur, graphique, heures sup ───────────────────────────────
function pt2Compteurs(emps, jours) {
  // Les jours à venir ne sont pas encore dus : le compteur s'arrête à aujourd'hui.
  const todayStr = today();
  const ecoules = jours.filter(d => d <= todayStr);
  return emps.map((e, i) => {
    let reel = 0, prevu = 0;
    ecoules.forEach(d => {
      reel += pt2H(pt2Entry(e, d));
      // Une absence justifiée neutralise le créneau prévu : il n'est pas dû.
      if (ptIsAbsent(e.id, d)) return;
      const sh = pt2Shift(e, d);
      if (sh) prevu += ptCalcHeures(sh.debut, sh.fin, 0);
    });
    return { e, i, reel, prevu, ecart: reel - prevu, contrat: ptContractHeures(e.id) };
  });
}

function pt2RenderRail(emps, jours) {
  const el = document.getElementById('pt2Rail');
  if (!el) return;
  const cpt = pt2Compteurs(emps, jours).filter(c => c.reel > 0 || c.prevu > 0);
  const total = cpt.reduce((s, c) => s + c.ecart, 0);
  const maxAbs = Math.max(1, ...cpt.map(c => Math.abs(c.ecart)));

  const compteurs = cpt.slice(0, 8).map(c => {
    const pos = c.ecart >= 0;
    const mag = Math.min(Math.abs(c.ecart) / maxAbs * 50, 50);
    const vc = pos ? '#2dd4bf' : '#fca5a5';
    return `<div>
      <div class="pt2-ctr-h">
        <span class="pt2-av pt2-av-xxs" style="background:${pt2Couleur(c.i)}">${escHtml(pt2Ini(c.e))}</span>
        <span class="pt2-ctr-n">${escHtml(pt2Nom(c.e))}</span>
        <span class="pt2-ctr-v" style="--vc:${vc}">${pt2FmtE(c.ecart)}</span>
      </div>
      <div class="pt2-bar"><span class="mid"></span><i style="background:${vc};left:${pos ? 50 : 50 - mag}%;width:${mag}%"></i></div>
    </div>`;
  }).join('');

  // Heures par jour de la semaine
  const parJour = jours.map(d => emps.reduce((s, e) => s + pt2H(pt2Entry(e, d)), 0));
  const maxJ = Math.max(1, ...parJour);
  const L = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const chart = parJour.map((v, i) => `<div class="pt2-chart-c" title="${L[i]} : ${pt2FmtH(v)}">
      <div class="pt2-chart-b" style="height:${Math.max(2, Math.round(v / maxJ * 100))}%"></div>
      <div class="pt2-chart-l">${L[i]}</div></div>`).join('');

  // Heures supplémentaires : au-delà du temps contractuel hebdomadaire
  const sup = cpt.map(c => ({ ...c, sup: Math.max(0, c.reel - c.contrat) }))
    .filter(c => c.sup > 0.05).sort((a, b) => b.sup - a.sup).slice(0, 6);

  el.innerHTML = `
    <div class="pt2-blk">
      <div class="pt2-blk-h"><span class="pt2-blk-t">Compteur d'heures</span>
        <span class="pt2-blk-v" style="color:${total >= 0 ? '#2dd4bf' : '#fca5a5'}">${pt2FmtE(total)}</span></div>
      ${cpt.length ? `<div class="pt2-list">${compteurs}</div>
        <div class="pt2-blk-vide" style="margin-top:10px">Écart réalisé / prévu, jours écoulés de la semaine affichée.</div>`
      : `<div class="pt2-blk-vide">Aucune heure pointée ni planifiée cette semaine.</div>`}
    </div>

    <div class="pt2-blk">
      <div class="pt2-blk-h"><span class="pt2-blk-t">Heures / jour (semaine)</span>
        <span class="pt2-blk-m">${pt2FmtH(parJour.reduce((s, v) => s + v, 0))}</span></div>
      <div class="pt2-chart">${chart}</div>
    </div>

    <div class="pt2-blk pt2-tint-v">
      <div class="pt2-blk-h" style="color:#c4b5fd">${pt2Svg(PT2_IC.bell)}<span class="pt2-blk-t">Heures supplémentaires</span></div>
      ${sup.length ? sup.map(c => `<div class="pt2-row">
        <span class="pt2-av pt2-av-xs" style="background:${pt2Couleur(c.i)}">${escHtml(pt2Ini(c.e))}</span>
        <span style="flex:1;min-width:0;font-size:11.5px;color:var(--v2-t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(pt2Nom(c.e))}</span>
        <span class="pt2-val">${pt2FmtE(c.sup)}</span></div>`).join('')
      : `<div class="pt2-blk-vide">Aucune heure au-delà du temps contractuel cette semaine.</div>`}
    </div>`;
}

// ── Bas de page ──────────────────────────────────────────────────────────
function pt2RenderFeatures(emps, jours) {
  const el = document.getElementById('pt2Features');
  if (!el) return;
  el.innerHTML = `
    <div class="pt2-feat">${pt2Bornes()}${pt2Annualisation(emps)}</div>
    <div class="pt2-feat3">${pt2Recup(emps, jours)}${pt2Repos(emps, jours)}${pt2Validation(emps)}</div>`;
}

// Bornes de pointage (table pointage_bornes)
function pt2Bornes() {
  const canEdit = pt2CanEdit();
  const TYPES = {
    qr:     { l: 'QR + badge', ic: PT2_IC.qr,    c: '#2dd4bf' },
    badge:  { l: 'Badge',      ic: PT2_IC.badge, c: '#818cf8' },
    mobile: { l: 'Mobile',     ic: PT2_IC.phone, c: '#22d3ee' }
  };
  let corps;
  if (!_pt2BornesOk) {
    corps = `<div class="pt2-blk-vide">Bornes indisponibles — exécutez <b>migration-pointage.sql</b> pour activer ce module.</div>`;
  } else if (!_pt2Bornes.length) {
    corps = `<div class="pt2-blk-vide">Aucune borne enregistrée.</div>`;
  } else {
    corps = _pt2Bornes.map(b => {
      const t = TYPES[b.type] || TYPES.badge;
      const actif = b.actif !== false;
      return `<div class="pt2-row">
        <span class="pt2-ico" style="--pc:${t.c}">${pt2Svg(t.ic)}</span>
        <div class="pt2-row-b">
          <div class="pt2-row-t">${escHtml(b.nom || 'Borne')}</div>
          <div class="pt2-row-d">${escHtml(t.l)}${b.emplacement ? ' · ' + escHtml(b.emplacement) : ''}</div>
        </div>
        <span class="pt2-tag" style="--sc:${actif ? '#34d399' : '#64748b'}"><span class="dot"></span>${actif ? 'En service' : 'Hors service'}</span>
        ${canEdit ? `<button type="button" class="pt2-reg" onclick="pt2OpenBorne('${b.id}')">Modifier</button>` : ''}
      </div>`;
    }).join('');
  }
  return `<div class="pt2-blk">
    <div class="pt2-blk-h" style="color:#2dd4bf">${pt2Svg(PT2_IC.qr)}<span class="pt2-blk-t">Bornes de pointage</span></div>
    ${corps}
    ${canEdit && _pt2BornesOk ? `<button type="button" class="pt2-add" onclick="pt2OpenBorne('')">${pt2Svg(PT2_IC.plus)} Ajouter une borne</button>` : ''}
  </div>`;
}

// Annualisation : cumul depuis le 1er janvier vs objectif au prorata
function pt2Annualisation(emps) {
  const an = _pt2Date.slice(0, 4);
  const debut = `${an}-01-01`;
  const fin = _pt2Date;
  const semaines = Math.max(1, (new Date(fin + 'T12:00:00') - new Date(debut + 'T12:00:00')) / (7 * 86400000));
  const tous = getPointages();
  const lignes = emps.map((e, i) => {
    const realise = tous
      .filter(p => String(p.employeId) === String(e.id) && p.date >= debut && p.date <= fin)
      .reduce((s, p) => s + ptCalcHeures(p.arrivee, p.depart, p.pauseMin), 0);
    const contrat = ptContractHeures(e.id);
    const cible = Math.round(contrat * semaines);
    return { e, i, realise: Math.round(realise), cible, ecart: Math.round(realise) - cible };
  }).filter(l => l.realise > 0).sort((a, b) => b.realise - a.realise).slice(0, 6);

  return `<div class="pt2-blk">
    <div class="pt2-blk-h"><span class="pt2-blk-t">Annualisation / modulation</span>
      <span class="pt2-blk-m">réf. 1 607 h/an · cumul ${escHtml(an)}</span></div>
    ${lignes.length ? `<div class="pt2-list">${lignes.map(l => `<div>
      <div class="pt2-ann-h">
        <span class="pt2-av pt2-av-xxs" style="background:${pt2Couleur(l.i)}">${escHtml(pt2Ini(l.e))}</span>
        <span class="pt2-ctr-n">${escHtml(pt2Nom(l.e))}</span>
        <span class="pt2-ann-t">${l.realise} / ${l.cible} h</span>
        <span class="pt2-ann-e" style="--ec:${l.ecart >= 0 ? '#2dd4bf' : '#fca5a5'}">${l.ecart >= 0 ? '+' : '−'}${Math.abs(l.ecart)} h</span>
      </div>
      <div class="pt2-bar"><i style="left:0;width:${Math.min(100, l.realise / 1607 * 100).toFixed(1)}%;background:${pt2Couleur(l.i)}"></i></div>
    </div>`).join('')}</div>`
    : `<div class="pt2-blk-vide">Aucune heure pointée depuis le 1<sup>er</sup> janvier ${escHtml(an)}.</div>`}
  </div>`;
}

// Récupération / RTT : heures sup de la semaine + heures de nuit majorées
function pt2Recup(emps, jours) {
  const todayStr = today();
  const ecoules = jours.filter(d => d <= todayStr);
  const lignes = [];
  emps.forEach((e, i) => {
    let reel = 0, nuit = 0;
    ecoules.forEach(d => {
      const en = pt2Entry(e, d);
      const h = pt2H(en);
      reel += h;
      if (en && en.arrivee) {
        const a = pt2Min(en.arrivee), dep = pt2Min(en.depart);
        if (a >= 21 * 60 || (dep !== null && dep < a) || (dep !== null && dep <= 6 * 60)) nuit += h;
      }
    });
    const sup = Math.max(0, reel - ptContractHeures(e.id));
    if (sup > 0.05) lignes.push({ e, i, detail: 'Heures sup → repos compensateur', val: sup });
    else if (nuit > 0.05) lignes.push({ e, i, detail: 'Heures de nuit (21 h–6 h)', val: nuit });
  });
  lignes.sort((a, b) => b.val - a.val);
  return `<div class="pt2-blk pt2-tint-v">
    <div class="pt2-blk-h" style="color:#c4b5fd">${pt2Svg(PT2_IC.sun)}<span class="pt2-blk-t">Récupération / RTT</span></div>
    ${lignes.length ? lignes.slice(0, 5).map(l => `<div class="pt2-row">
      <span class="pt2-av pt2-av-xs" style="background:${pt2Couleur(l.i)}">${escHtml(pt2Ini(l.e))}</span>
      <div class="pt2-row-b"><div class="pt2-row-t">${escHtml(pt2Nom(l.e))}</div>
        <div class="pt2-row-d">${escHtml(l.detail)}</div></div>
      <span class="pt2-val">${pt2FmtE(l.val)}</span></div>`).join('')
    : `<div class="pt2-blk-vide">Aucun droit à récupération généré cette semaine.</div>`}
  </div>`;
}

// Temps de repos : contrôles légaux calculés sur la semaine affichée
function pt2Repos(emps, jours) {
  const okI = PT2_IC.check, warnI = PT2_IC.alert;
  const noms = [];
  // Repos quotidien 11 h entre deux postes
  emps.forEach(e => {
    for (let k = 1; k < jours.length; k++) {
      const p = pt2Entry(e, jours[k - 1]), c = pt2Entry(e, jours[k]);
      if (!p?.depart || !c?.arrivee) continue;
      const gap = (24 * 60 - pt2Min(p.depart)) + pt2Min(c.arrivee);
      if (gap < 11 * 60) { noms.push(pt2Nom(e)); break; }
    }
  });
  // Pause 20 min dès 6 h de travail
  const pauses = [];
  emps.forEach(e => {
    for (const d of jours) {
      const en = pt2Entry(e, d);
      if (en && pt2H(en) >= 6 && Number(en.pauseMin || 0) < 20) { pauses.push(pt2Nom(e)); break; }
    }
  });
  // Repos hebdomadaire 35 h consécutives — ne se juge que sur une semaine close
  const hebdo = [];
  const semaineClose = jours[6] < today();
  if (semaineClose) emps.forEach(e => {
    const bornes = jours.map(d => pt2Entry(e, d)).map((en, k) => ({ k, en }));
    let plusLong = 0, dernier = null;
    bornes.forEach(({ k, en }) => {
      if (!en || !en.arrivee) return;
      if (dernier !== null) {
        const gap = ((k * 24 * 60) + pt2Min(en.arrivee)) - dernier;
        plusLong = Math.max(plusLong, gap);
      }
      dernier = (k * 24 * 60) + (en.depart ? pt2Min(en.depart) : pt2Min(en.arrivee));
    });
    if (dernier !== null && plusLong > 0 && plusLong < 35 * 60) hebdo.push(pt2Nom(e));
  });

  const items = [
    { l: 'Repos quotidien 11 h', ko: noms,   ok: 'Respecté pour tous', ic: warnI },
    { l: 'Pause 20 min / 6 h',   ko: pauses, ok: 'Pauses saisies',     ic: warnI },
    { l: 'Repos hebdo 35 h',     ko: hebdo,  ok: semaineClose ? 'Respecté pour tous' : 'Semaine en cours', ic: warnI, attente: !semaineClose }
  ];
  return `<div class="pt2-blk">
    <div class="pt2-blk-h" style="color:#f59e0b">${pt2Svg(PT2_IC.alert)}<span class="pt2-blk-t">Temps de repos</span></div>
    ${items.map(it => {
      const ko = it.ko.length;
      const c = ko ? (it.l.startsWith('Repos hebdo') ? '#ef4444' : '#f59e0b') : (it.attente ? '#5f7a9c' : '#34d399');
      const tag = ko ? (c === '#ef4444' ? 'Alerte' : 'À vérifier') : (it.attente ? 'En cours' : 'OK');
      return `<div class="pt2-row">
        <span style="color:${c};display:flex">${pt2Svg(ko ? it.ic : okI, 2.2)}</span>
        <div class="pt2-row-b"><div class="pt2-row-t">${escHtml(it.l)}</div>
          <div class="pt2-row-d">${ko ? escHtml(it.ko.slice(0, 2).join(', ')) + (ko > 2 ? ` +${ko - 2}` : '') : escHtml(it.ok)}</div></div>
        <span class="pt2-tag" style="--sc:${c}">${tag}</span>
      </div>`;
    }).join('')}
    <div class="pt2-blk-vide">Contrôles calculés sur la semaine affichée.</div>
  </div>`;
}

// Validation mensuelle + verrouillage + export paie
function pt2Validation(emps) {
  const mois = pt2Mois(_pt2Date);
  const tous = getPointages();
  let validees = 0, attente = 0;
  emps.forEach(e => {
    const lignes = tous.filter(p => String(p.employeId) === String(e.id) && p.date.startsWith(mois));
    if (!lignes.length) return;
    if (lignes.every(p => p.valide)) validees++; else attente++;
  });
  const verrou = pt2EstVerrouille(mois);
  const canEdit = pt2CanEdit();
  return `<div class="pt2-blk pt2-tint-g">
    <div class="pt2-blk-t" style="margin-bottom:6px">Validation mensuelle</div>
    <div style="font-size:10.5px;color:var(--v2-t6);margin-bottom:14px">${escHtml(pt2MoisLabel(mois))} · feuilles de temps${verrou ? ' · verrouillé' : ''}</div>
    <div class="pt2-vnums">
      <div class="pt2-vnum" style="--pc:#34d399"><b>${validees}</b><span>Validées</span></div>
      <div class="pt2-vnum" style="--pc:#f59e0b"><b>${attente}</b><span>En attente</span></div>
    </div>
    ${canEdit ? `<button type="button" class="pt2-vbtn${verrou ? ' locked' : ''}" onclick="pt2ToggleVerrou()">
      ${pt2Svg(PT2_IC.lock, 2.4)}${verrou ? 'Déverrouiller le mois' : 'Verrouiller le mois'}</button>
    <button type="button" class="pt2-vbtn2" onclick="pt2ExportPaie()">${pt2Svg(PT2_IC.down, 2.2)}Export paie (CSV)</button>`
    : `<div class="pt2-blk-vide">Le verrouillage et l'export paie sont réservés aux gestionnaires RH.</div>`}
  </div>`;
}

// ══ ACTIONS ══════════════════════════════════════════════════════════════
function pt2SetView(v) { _pt2View = v; pt2Render(); }
function pt2Prev() { _pt2Date = pt2AddDays(_pt2Date, _pt2View === 'jour' ? -1 : -7); pt2Render(); }
function pt2Next() { _pt2Date = pt2AddDays(_pt2Date, _pt2View === 'jour' ? 1 : 7); pt2Render(); }
function pt2Today() { _pt2Date = today(); pt2Render(); }

// ── Modale de saisie / régularisation ────────────────────────────────────
function pt2OpenSaisie(employeId, date) {
  if (!pt2CanEdit()) { toast('Saisie réservée aux gestionnaires RH', 'error'); return; }
  if (pt2EstVerrouille(pt2Mois(date))) { toast('Mois verrouillé : saisie impossible', 'error'); return; }
  const e = ptEmployes().find(x => String(x.id) === String(employeId));
  if (!e) return;
  const en = ptGetEntry(employeId, date) || {};
  const sh = pt2Shift(e, date);
  _pt2Saisie = { employeId: String(employeId), date };

  document.getElementById('pt2SaisieSub').textContent = pt2Long(date);
  document.getElementById('pt2SaisieWho').innerHTML = `
    <span class="pt2-av" style="background:${pt2Couleur(0)}">${escHtml(pt2Ini(e))}</span>
    <div><div class="pt2-nom">${escHtml(pt2Nom(e))}</div>
      <div class="pt2-poste">${escHtml(e.poste || '—')} · ${ptContractHeures(e.id)} h contrat</div></div>
    ${sh ? `<span class="pt2-flag" style="--fc:#22d3ee;margin-left:auto">Prévu ${escHtml(sh.debut + '–' + sh.fin)}</span>` : ''}`;
  document.getElementById('pt2FldArr').value = en.arrivee || '';
  document.getElementById('pt2FldDep').value = en.depart || '';
  document.getElementById('pt2FldPause').value = Number(en.pauseMin || 0);
  const copie = document.getElementById('pt2CopyPlan');
  if (copie) copie.style.display = sh ? '' : 'none';
  openModal('modalPt2Saisie');
}

function pt2CopierPlanning() {
  if (!_pt2Saisie) return;
  const e = ptEmployes().find(x => String(x.id) === String(_pt2Saisie.employeId));
  const sh = e ? pt2Shift(e, _pt2Saisie.date) : null;
  if (!sh) { toast('Aucun créneau planifié ce jour', 'error'); return; }
  document.getElementById('pt2FldArr').value = sh.debut || '';
  document.getElementById('pt2FldDep').value = sh.fin || '';
}

async function pt2SaveSaisie(valider) {
  if (!_pt2Saisie) return;
  if (!pt2CanEdit()) { toast('Saisie réservée aux gestionnaires RH', 'error'); return; }
  if (pt2EstVerrouille(pt2Mois(_pt2Saisie.date))) { toast('Mois verrouillé : saisie impossible', 'error'); return; }
  const arrivee = document.getElementById('pt2FldArr').value || '';
  const depart  = document.getElementById('pt2FldDep').value || '';
  const pause   = Number(document.getElementById('pt2FldPause').value) || 0;
  if (valider && (!arrivee || !depart)) { toast('Saisissez les horaires avant de valider', 'error'); return; }

  const entry = { employeId: _pt2Saisie.employeId, date: _pt2Saisie.date, arrivee, depart, pauseMin: pause, valide: !!valider };
  const exist = getPointages().find(p => String(p.employeId) === String(entry.employeId) && p.date === entry.date);
  try {
    const saved = await sbUpsertPointage(entry);
    if (exist) Object.assign(exist, saved); else getPointages().push(saved);
    if (typeof auditLog === 'function') auditLog('modification', `Pointage ${entry.date} — ${valider ? 'validé' : 'enregistré'}`);
    closeModal('modalPt2Saisie');
    toast(valider ? 'Pointage validé ✓' : 'Pointage enregistré ✓', 'success');
  } catch (e) {
    console.error('[pt2SaveSaisie]', e);
    toast('Erreur : ' + (e?.message || e), 'error');
  }
  pt2Render();
}

// ── Verrouillage mensuel ─────────────────────────────────────────────────
async function pt2ToggleVerrou() {
  if (!pt2CanEdit()) { toast('Action réservée aux gestionnaires RH', 'error'); return; }
  const mois = pt2Mois(_pt2Date);
  const cible = !pt2EstVerrouille(mois);
  try {
    const etab = await sbGetEtablissementId();
    const s = Auth.getSession();
    const { data, error } = await supabaseClient.from('pointage_verrous_mois').upsert({
      etablissement_id: etab,
      mois,
      verrouille: cible,
      verrouille_par: cible ? `${s?.prenom || ''} ${s?.nom || ''}`.trim() || (s?.username || '') : null,
      verrouille_le: cible ? new Date().toISOString() : null
    }, { onConflict: 'etablissement_id,mois' }).select();
    if (error) throw error;
    const row = (data && data[0]) || { mois, verrouille: cible };
    const i = _pt2Verrous.findIndex(v => v.mois === mois);
    if (i >= 0) _pt2Verrous[i] = row; else _pt2Verrous.push(row);
    if (typeof auditLog === 'function') auditLog('modification', `Feuilles de temps ${mois} — ${cible ? 'verrouillées' : 'déverrouillées'}`);
    toast(cible ? 'Mois verrouillé ✓' : 'Mois déverrouillé', 'success');
  } catch (e) {
    console.error('[pt2ToggleVerrou]', e);
    toast('Verrouillage impossible — exécutez migration-pointage.sql', 'error');
  }
  pt2Render();
}

// ── Export paie du mois affiché ──────────────────────────────────────────
function pt2ExportPaie() {
  if (!pt2CanEdit()) { toast('Export réservé aux gestionnaires RH', 'error'); return; }
  const mois = pt2Mois(_pt2Date);
  const emps = pt2Emps();
  const tous = getPointages();
  const lignes = [['Salarie', 'Poste', 'Mois', 'Heures realisees', 'Heures contrat (hebdo)', 'Jours pointes', 'Jours valides']];
  emps.forEach(e => {
    const rows = tous.filter(p => String(p.employeId) === String(e.id) && p.date.startsWith(mois));
    if (!rows.length) return;
    const h = rows.reduce((s, p) => s + ptCalcHeures(p.arrivee, p.depart, p.pauseMin), 0);
    lignes.push([pt2Nom(e), e.poste || '', mois, h.toFixed(2).replace('.', ','), ptContractHeures(e.id), rows.length, rows.filter(p => p.valide).length]);
  });
  if (lignes.length === 1) { toast('Aucun pointage à exporter sur ce mois', 'error'); return; }
  const csv = '﻿' + lignes.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = `pointage-${mois}.csv`; a.click();
  URL.revokeObjectURL(url);
  if (typeof auditLog === 'function') auditLog('export', `Export paie pointage ${mois}`);
  toast('Export généré ✓', 'success');
}

// ── Bornes de pointage ───────────────────────────────────────────────────
function pt2OpenBorne(id) {
  if (!pt2CanEdit()) { toast('Action réservée aux gestionnaires RH', 'error'); return; }
  if (!_pt2BornesOk) { toast('Bornes indisponibles — exécutez migration-pointage.sql', 'error'); return; }
  const b = _pt2Bornes.find(x => String(x.id) === String(id)) || {};
  _pt2BorneEdit = b.id || null;
  document.getElementById('pt2BorneTitre').textContent = b.id ? 'Modifier la borne' : 'Nouvelle borne';
  document.getElementById('pt2BorneNom').value = b.nom || '';
  document.getElementById('pt2BorneLieu').value = b.emplacement || '';
  document.getElementById('pt2BorneType').value = b.type || 'badge';
  document.getElementById('pt2BorneActif').value = (b.actif === false) ? '0' : '1';
  const del = document.getElementById('pt2BorneDel');
  if (del) del.style.display = b.id ? '' : 'none';
  openModal('modalPt2Borne');
}

async function pt2SaveBorne() {
  if (!pt2CanEdit()) { toast('Action réservée aux gestionnaires RH', 'error'); return; }
  const nom = document.getElementById('pt2BorneNom').value.trim();
  if (!nom) { toast('Le nom de la borne est obligatoire', 'error'); return; }
  const row = {
    nom,
    emplacement: document.getElementById('pt2BorneLieu').value.trim() || null,
    type: document.getElementById('pt2BorneType').value,
    actif: document.getElementById('pt2BorneActif').value === '1'
  };
  try {
    const etab = await sbGetEtablissementId();
    let res;
    if (_pt2BorneEdit) {
      res = await supabaseClient.from('pointage_bornes').update(row).eq('id', _pt2BorneEdit).select();
    } else {
      res = await supabaseClient.from('pointage_bornes').insert({ ...row, etablissement_id: etab }).select();
    }
    if (res.error) throw res.error;
    await pt2LoadBornes();
    closeModal('modalPt2Borne');
    toast('Borne enregistrée ✓', 'success');
  } catch (e) {
    console.error('[pt2SaveBorne]', e);
    toast('Enregistrement impossible — exécutez migration-pointage.sql', 'error');
  }
  pt2Render();
}

async function pt2DeleteBorne() {
  if (!pt2CanEdit() || !_pt2BorneEdit) return;
  if (!confirm('Supprimer cette borne de pointage ?')) return;
  try {
    const { error } = await supabaseClient.from('pointage_bornes').delete().eq('id', _pt2BorneEdit);
    if (error) throw error;
    await pt2LoadBornes();
    closeModal('modalPt2Borne');
    toast('Borne supprimée', 'success');
  } catch (e) {
    console.error('[pt2DeleteBorne]', e);
    toast('Suppression impossible — exécutez migration-pointage.sql', 'error');
  }
  pt2Render();
}

// ══ AMORÇAGE ═════════════════════════════════════════════════════════════
// `renderPointage` (déclaration de fonction dans js/pointage.js) est publiée
// sur window : on la remplace pour que tout le code existant — chargement
// initial, ptSetField, ptToggleValidation, ptCopyFromPlanning — redessine la
// page au format V2.
window.renderPointage = pt2Render;

// Un `const`/`let` de premier niveau ne crée PAS de propriété sur window :
// les gestionnaires onclick inline passent par window, on les y publie.
Object.assign(window, {
  pt2Render, pt2SetView, pt2Prev, pt2Next, pt2Today,
  pt2OpenSaisie, pt2CopierPlanning, pt2SaveSaisie,
  pt2ToggleVerrou, pt2ExportPaie,
  pt2OpenBorne, pt2SaveBorne, pt2DeleteBorne
});

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('ptStats')) return;
  pt2Horloge();
  setInterval(pt2Horloge, 30000);
  Promise.all([pt2LoadBornes(), pt2LoadVerrous()]).then(() => pt2Render());
});
