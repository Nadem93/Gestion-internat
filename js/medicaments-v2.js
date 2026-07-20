// ── DISTRIBUTION DES MÉDICAMENTS — DESIGN V2 ──
// Reproduit la maquette « Médicaments (vie quotidienne) » : bandeau de quatre
// compteurs, deux panneaux (renouvellements / prochaines prises) puis une carte
// par résident listant ses prises avec les boutons de statut.
// Les données et les actions (setMedStatut, medOpenDetail, medPrevues…) restent
// celles de js/medicaments.js — ce module ne fait que le rendu.

const MED2_IC = {
  pill:  '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/>',
  tick:  '<polyline points="20 6 9 17 4 12"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  user:  '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  hands: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  box:   '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  edit:  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  note:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
};
function _med2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

// Couleurs sombres + icônes vectorielles des statuts (MED_STATUTS reste la
// source de vérité pour les clés et les libellés).
const MED2_ST = {
  donne:  { c: '#10b981', ic: MED2_IC.tick },
  confie: { c: '#22d3ee', ic: MED2_IC.hands },
  refuse: { c: '#ef4444', ic: MED2_IC.x },
  absent: { c: '#94a3b8', ic: MED2_IC.user },
  report: { c: '#f59e0b', ic: MED2_IC.clock }
};
const MED2_MOM_C = { matin: '#f59e0b', midi: '#fbbf24', soir: '#818cf8', coucher: '#6366f1' };

// Filtre de moment : '' = tous les moments (la maquette liste tout le jour).
let MED2_MOMENT = '';
function med2SetMoment(m) { MED2_MOMENT = (MED2_MOMENT === m) ? '' : m; med2Render(); }

// ── Navigation de date (le contrat avec js/medicaments.js reste #medDate) ──
function med2ShiftDay(n) {
  const el = document.getElementById('medDate');
  if (!el) return;
  const d = new Date((el.value || today()) + 'T00:00:00');
  d.setDate(d.getDate() + n);
  // Formatage local : toISOString() décalerait d'un jour aux fuseaux positifs.
  el.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  med2Render();
}
function med2Today() {
  const el = document.getElementById('medDate');
  if (!el) return;
  el.value = today();
  med2Render();
}
function med2PickDate() {
  const el = document.getElementById('medDate');
  if (el && typeof el.showPicker === 'function') { try { el.showPicker(); return; } catch (e) { /* non supporté */ } }
  if (el) el.focus();
}

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────
function med2Render() {
  const dateEl = document.getElementById('medDate');
  if (!dateEl) return;
  const date = dateEl.value || today();

  const lbl = document.getElementById('medDateLabel');
  if (lbl) lbl.textContent = (date === today() ? "Aujourd'hui · " : '') + formatDate(date);

  const records = getMedDistrib();
  const enriched = medPrevues(date).map(p => ({
    ...p,
    record: records.find(x => x.date === date && String(x.residentId) === String(p.residentId)
      && x.traitementId === p.traitementId && x.moment === p.moment)
  }));

  med2Stats(enriched);
  med2Panels(date, enriched);
  med2Filtres(enriched);
  med2Liste(date, enriched);
}

// ── COMPTEURS ────────────────────────────────────────────────────────
function med2Stats(enriched) {
  const el = document.getElementById('medStats');
  if (!el) return;
  const donne = enriched.filter(e => e.record?.statut === 'donne').length;
  const confie = enriched.filter(e => e.record?.statut === 'confie').length;
  const incident = enriched.filter(e => ['refuse', 'absent', 'report'].includes(e.record?.statut)).length;
  const attente = enriched.filter(e => !e.record?.statut).length;
  const carte = (c, ic, n, l) => `<div class="v2-med-stat" style="--pc:${c}">
    <span class="v2-med-stat-i">${_med2Svg(ic)}</span>
    <div><div class="v2-med-stat-n">${n}</div><div class="v2-med-stat-l">${l}</div></div>
  </div>`;
  el.innerHTML =
    carte('#818cf8', MED2_IC.pill, enriched.length, 'Prises prévues') +
    carte('#10b981', MED2_IC.tick, donne + confie, 'Données ou confiées') +
    carte('#ef4444', MED2_IC.x, incident, 'Refus · absences · reports') +
    carte('#f59e0b', MED2_IC.clock, attente, 'En attente');
}

// ── PANNEAUX : renouvellements + prochaines prises ───────────────────
function med2Panels(date, enriched) {
  const el = document.getElementById('medPanels');
  if (!el) return;
  el.innerHTML =
    `<div class="v2-med-pan v2-med-pan-warn">
      <div class="v2-med-pan-h"><span style="color:var(--v2-warn-icon)">${_med2Svg(MED2_IC.box)}</span><span class="v2-med-pan-t">Renouvellements de traitements</span></div>
      <div class="v2-med-pan-c">${med2Renouvellements(date)}</div>
    </div>
    <div class="v2-med-pan">
      <div class="v2-med-pan-h"><span style="color:var(--v2-cyan)">${_med2Svg(MED2_IC.clock)}</span><span class="v2-med-pan-t">Prochaines prises</span></div>
      <div class="v2-med-pan-c">${med2Prochaines(date, enriched)}</div>
    </div>`;
}

// Le stock de médicaments n'existe pas en base : on affiche la seule donnée
// réelle de renouvellement, la date de fin des traitements (r.sante.traitements[].fin).
function med2Renouvellements(date) {
  const lignes = [];
  medResidents().forEach(r => {
    (r.sante?.traitements || []).forEach(t => {
      if (!t.fin || !(t.moments || []).length) return;
      const j = Math.round((new Date(t.fin + 'T00:00:00') - new Date(date + 'T00:00:00')) / 86400000);
      if (j < 0 || j > 60) return;
      lignes.push({ nom: t.nom || '—', res: `${r.prenom || ''} ${r.nom || ''}`.trim(), j, fin: t.fin });
    });
  });
  if (!lignes.length) return `<div class="v2-blk-vide">Aucune fin de traitement renseignée dans les 60 jours.</div>`;
  lignes.sort((a, b) => a.j - b.j);
  return lignes.slice(0, 5).map(l => {
    const c = l.j <= 3 ? '#ef4444' : l.j <= 10 ? '#f59e0b' : '#10b981';
    const tag = l.j <= 3 ? 'Critique' : l.j <= 10 ? 'Bientôt' : 'OK';
    const pct = Math.max(4, Math.min(100, Math.round(l.j / 60 * 100)));
    return `<div class="v2-med-li" style="--pc:${c}">
      <div style="flex:1;min-width:0">
        <div class="v2-med-li-n">${escHtml(l.nom)}</div>
        <div class="v2-med-li-s">${escHtml(l.res)} · fin le ${formatDate(l.fin)}</div>
      </div>
      <div class="v2-med-li-bar"><div class="v2-prog"><span style="width:${pct}%;background:${c}"></span></div></div>
      <span class="v2-med-li-tag">${tag} · ${l.j} j</span>
    </div>`;
  }).join('');
}

function med2Prochaines(date, enriched) {
  const ordre = Object.keys(MED_MOMENTS);
  const restant = enriched.filter(e => !e.record?.statut);
  if (!restant.length) return `<div class="v2-blk-vide">Toutes les prises du jour sont enregistrées.</div>`;
  const momNow = (date === today()) ? medMomentCourant() : ordre[0];
  const iNow = ordre.indexOf(momNow);
  const tri = [...restant].sort((a, b) => {
    const ra = (ordre.indexOf(a.moment) - iNow + ordre.length) % ordre.length;
    const rb = (ordre.indexOf(b.moment) - iNow + ordre.length) % ordre.length;
    return ra - rb || (a.residentName || '').localeCompare(b.residentName || '', 'fr');
  });
  return tri.slice(0, 5).map(e => {
    const mom = MED_MOMENTS[e.moment] || { label: e.moment, icon: '' };
    const c = MED2_MOM_C[e.moment] || '#818cf8';
    const lim = MED_HEURE_LIMITE[e.moment];
    return `<div class="v2-med-li" style="--pc:${c}">
      <span class="v2-med-li-h">${mom.icon} ${escHtml(mom.label)}</span>
      <div style="flex:1;min-width:0">
        <div class="v2-med-li-n">${escHtml(e.residentName || '—')}</div>
        <div class="v2-med-li-s">${escHtml(e.medicament || '')}${e.posologie ? ' · ' + escHtml(e.posologie) : ''}</div>
      </div>
      <span class="v2-med-li-k">${lim != null ? 'avant ' + lim + 'h' : ''}</span>
    </div>`;
  }).join('');
}

// ── FILTRES (recherche, moment, présents) ────────────────────────────
function med2Filtres(enriched) {
  const el = document.getElementById('medFilters');
  if (!el) return;
  // Le champ de recherche est reconstruit à chaque frappe : on rend la main
  // au curseur là où il était, sinon la saisie est interrompue.
  const ancien = document.getElementById('medSearchInput');
  const avaitFocus = ancien && document.activeElement === ancien;
  const caret = avaitFocus ? ancien.selectionStart : null;
  const chip = (id, lbl, n, c) => `<button type="button" class="v2-chip-f${MED2_MOMENT === id ? ' on' : ''}" onclick="med2SetMoment('${id}')" aria-pressed="${MED2_MOMENT === id}">
    ${c ? `<span class="dot" style="background:${c}"></span>` : ''}${lbl}<span class="n">${n}</span></button>`;
  const moments = Object.entries(MED_MOMENTS).map(([k, v]) =>
    chip(k, `${v.icon} ${escHtml(v.label)}`, enriched.filter(e => e.moment === k).length, MED2_MOM_C[k])).join('');
  el.innerHTML = `
    <div class="v2-med-search">${_med2Svg(MED2_IC.search)}
      <input id="medSearchInput" type="text" placeholder="Rechercher un résident…" value="${escAttr(medSearch)}" oninput="medSetSearch(this.value)"/>
    </div>
    <button type="button" class="v2-chip-f${MED2_MOMENT === '' ? ' on' : ''}" onclick="med2SetMoment('')" aria-pressed="${MED2_MOMENT === ''}">Tous les moments<span class="n">${enriched.length}</span></button>
    ${moments}
    <button type="button" class="v2-chip-f${medFilterPresent ? ' on' : ''}" onclick="medTogglePresent()" aria-pressed="${medFilterPresent}">
      <span class="dot" style="background:${medFilterPresent ? '#10b981' : '#5f7a9c'}"></span>Présents seulement</button>`;
  if (avaitFocus) {
    const neuf = document.getElementById('medSearchInput');
    if (neuf) { neuf.focus(); try { neuf.setSelectionRange(caret, caret); } catch (e) { /* ignore */ } }
  }
}

// ── LISTE PAR RÉSIDENT ───────────────────────────────────────────────
function med2Liste(date, enriched) {
  const el = document.getElementById('medList');
  if (!el) return;

  if (!enriched.length) {
    el.innerHTML = `<div class="v2-blk" style="text-align:center;padding:38px 22px">
      <div class="v2-med-vide-i">${_med2Svg(MED2_IC.pill)}</div>
      <div style="font-size:14px;font-weight:700;color:var(--v2-t2);margin-bottom:5px">Aucun traitement à distribuer</div>
      <div class="v2-blk-vide">Renseignez les moments de prise depuis la fiche médicale de chaque résident.</div>
    </div>`;
    return;
  }

  const resMap = {};
  sbResidents().forEach(r => { resMap[String(r.id)] = r; });
  const presences = (DB.get(DB.keys.presences) || {})[date] || {};
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jour = JOURS[new Date(date + 'T00:00:00').getDay()];
  const present = id => {
    const manuel = presences[id];
    if (manuel) return manuel === 'present';
    const r = resMap[String(id)];
    return !((typeof phDayAbsences === 'function' ? phDayAbsences(r?.planningHebdo?.[jour]) : []).length);
  };

  let visibles = enriched;
  if (medSearch) visibles = visibles.filter(e => (e.residentName || '').toLowerCase().includes(medSearch));
  if (MED2_MOMENT) visibles = visibles.filter(e => e.moment === MED2_MOMENT);
  if (medFilterPresent) visibles = visibles.filter(e => present(e.residentId));

  const aide = medCanEdit
    ? `<div class="v2-med-hint">${_med2Svg(MED2_IC.edit)} Un clic sur un statut l'enregistre · re-clic = annule · <b>✎</b> ou clic droit = note et statut détaillé</div>`
    : '';

  if (!visibles.length) {
    el.innerHTML = aide + `<div class="v2-blk"><div class="v2-blk-vide" style="text-align:center;padding:16px 0">Aucune prise correspondant aux filtres.</div></div>`;
    return;
  }

  // Regroupement par résident, dans l'ordre alphabétique
  const ordreMoments = Object.keys(MED_MOMENTS);
  const groupes = [];
  const idx = {};
  visibles.forEach(e => {
    const k = String(e.residentId);
    if (idx[k] == null) { idx[k] = groupes.length; groupes.push({ id: k, nom: e.residentName, items: [] }); }
    groupes[idx[k]].items.push(e);
  });
  groupes.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
  groupes.forEach(g => g.items.sort((a, b) =>
    ordreMoments.indexOf(a.moment) - ordreMoments.indexOf(b.moment) ||
    (a.medicament || '').localeCompare(b.medicament || '', 'fr')));

  const nowH = new Date().getHours();
  el.innerHTML = aide + `<div class="v2-med-cards">${groupes.map(g => {
    const r = resMap[g.id] || {};
    const c = safeColor(r.color, '#818cf8');
    const av = r.photo
      ? `<span class="v2-med-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></span>`
      : `<span class="v2-med-av" style="background:${c}">${initials(r.prenom || '', r.nom || '')}</span>`;

    const alertes = [];
    const reg = r.regime || {};
    if ((r.allergies || '').trim()) alertes.push(`Allergie / CI : ${r.allergies}`);
    if ((reg.allergiesAlim || '').trim()) alertes.push(`Allergie alim. : ${reg.allergiesAlim}`);
    if (reg.texture && reg.texture !== 'normale') alertes.push(`Texture ${reg.texture}`);
    const badgeAl = alertes.length
      ? `<span class="v2-med-alrt" title="${escAttr(alertes.join(' · '))}">${_med2Svg(MED2_IC.alert, 2.6)}${escHtml(alertes.join(' · '))}</span>`
      : '';

    const faits = g.items.filter(e => e.record?.statut).length;

    return `<div class="v2-med-card">
      <div class="v2-med-card-h">
        ${av}
        <div style="flex:1;min-width:0">
          <div class="v2-med-nom">${escHtml(g.nom || '—')}</div>
          <div class="v2-med-ch">${r.chambre ? 'Ch. ' + escHtml(r.chambre) : 'Chambre non renseignée'}</div>
        </div>
        ${badgeAl}
        <span class="v2-med-tag" style="--pc:${faits === g.items.length ? '#10b981' : '#818cf8'}">${faits}/${g.items.length} enregistrée(s)</span>
      </div>
      <div class="v2-med-rows">${g.items.map(e => med2Row(date, e, nowH)).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}

function med2Row(date, e, nowH) {
  const mom = MED_MOMENTS[e.moment] || { label: e.moment, icon: '' };
  const rec = e.record;
  const statut = rec?.statut || '';
  const lim = MED_HEURE_LIMITE[e.moment];
  const enRetard = !statut && lim != null && (date < today() || (date === today() && nowH >= lim));
  const args = `'${e.residentId}','${e.traitementId}','${e.moment}'`;

  const opts = Object.entries(MED_STATUTS).map(([k, v]) => {
    const on = statut === k;
    const c = MED2_ST[k]?.c || v.color;
    return `<button type="button" class="v2-med-opt${on ? ' on' : ''}" style="--oc:${c}" aria-pressed="${on}"
      ${medCanEdit ? `onclick="med2Set(${args},'${k}')"` : 'disabled'} title="${escAttr(v.label)}">
      ${_med2Svg(MED2_ST[k]?.ic || MED2_IC.tick, 2.6)}${escHtml(v.label)}</button>`;
  }).join('');

  const detail = medCanEdit
    ? `<button type="button" class="v2-med-opt" onclick="med2Detail(${args})" title="Statut détaillé / observation" aria-label="Options pour ${escAttr(e.medicament || '')}">${_med2Svg(MED2_IC.edit, 2.4)}</button>`
    : '';

  const meta = [
    e.posologie || '',
    rec?.heure ? medHeure(rec.heure) : '',
    rec?.auteur || '',
    enRetard ? 'en retard' : ''
  ].filter(Boolean).join(' · ');

  return `<div class="v2-med-row${enRetard ? ' late' : ''}"
      oncontextmenu="event.preventDefault();${medCanEdit ? `med2Detail(${args})` : ''}">
    <span class="v2-med-mom" title="${escAttr(mom.label)}${lim != null ? ' — avant ' + lim + 'h' : ''}">${mom.icon} ${escHtml(mom.label)}</span>
    <div style="flex:1;min-width:120px">
      <div class="v2-med-nm">${escHtml(e.medicament || '—')}</div>
      <div class="v2-med-dose">${escHtml(meta) || '—'}</div>
    </div>
    <div class="v2-med-opts">${opts}${detail}</div>
    ${rec?.observation ? `<div class="v2-med-note">${_med2Svg(MED2_IC.note, 2)} ${escHtml(rec.observation)}</div>` : ''}
  </div>`;
}

// Passerelles vers les actions existantes (la date vient toujours de #medDate)
function med2Set(residentId, traitementId, moment, statut) {
  const date = document.getElementById('medDate').value || today();
  setMedStatut(date, residentId, traitementId, moment, statut);
}
function med2Detail(residentId, traitementId, moment) {
  const date = document.getElementById('medDate').value || today();
  medOpenDetail(date, residentId, traitementId, moment);
}

// ── SURCHARGES ───────────────────────────────────────────────────────
// La modale détail est désormais dans le HTML (gabarit .v2-ov/.v2-md) et le
// CSS des tuiles V1 n'est plus utilisé : plus rien à injecter.
function ensureMedUI() { /* la modale #modalMedDetail est dans medicaments.html */ }

// Segment de statut de la modale, au gabarit .v2-seg
function medRenderDetailSeg() {
  const el = document.getElementById('mdSeg');
  if (!el) return;
  el.innerHTML = Object.entries(MED_STATUTS).map(([k, v]) => {
    const on = _mdSel === k;
    const c = MED2_ST[k]?.c || v.color;
    return `<button type="button" class="v2-seg-o${on ? ' on' : ''}" style="--mc:${c}" aria-pressed="${on}" onclick="medPickDetail('${k}')">
      ${_med2Svg(MED2_ST[k]?.ic || MED2_IC.tick, 2.4)}<span>${escHtml(v.label)}</span></button>`;
  }).join('');
}
