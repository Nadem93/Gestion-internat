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
  note:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  dots:  '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  tickAll: '<polyline points="9 11 12.5 14.5 20 6"/><polyline points="2 13 5 16 12 8"/>'
};
function _med2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// Icône dimensionnée (16px par défaut) pour les chips/KPI « Console Data ».
function _med2Ico(d, px) {
  const s = px || 16;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
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
// Statuts secondaires : sortis de la ligne, ils vivent dans le menu « ⋯ ».
const MED2_AUTRES = ['confie', 'refuse', 'absent', 'report'];
// Prises visibles et non enregistrées, par résident — cible de « Tout donné ».
// Réécrit à chaque rendu des cartes, donc toujours aligné sur les filtres actifs.
let _med2Restants = {};

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
  el.value = isoJour(d);
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
  const carte = (c, ic, lbl, n, sub) => `<div class="dc-kpi" style="--dc-c:${c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${lbl}</span><span class="dc-kpi-ico" style="color:${c}">${_med2Ico(ic)}</span></div>
    <div class="dc-kpi-val">${n}</div>
    <div class="dc-kpi-sub">${sub}</div>
  </div>`;
  el.innerHTML =
    carte('#818cf8', MED2_IC.pill, 'Prévues', enriched.length, 'Prises prévues') +
    carte('#10b981', MED2_IC.tick, 'Données', donne + confie, 'Données ou confiées') +
    carte('#ef4444', MED2_IC.x, 'Incidents', incident, 'Refus · absences · reports') +
    carte('#f59e0b', MED2_IC.clock, 'En attente', attente, 'Prises non enregistrées');
}

// ── PANNEAUX : stock & renouvellements + prochaines prises ───────────
function med2Panels(date, enriched) {
  const el = document.getElementById('medPanels');
  if (!el) return;
  const ajout = medCanEdit
    ? `<button type="button" class="v2-med-pan-add" onclick="stockMedOpen('')" title="Ajouter un stock">+ Stock</button>`
    : '';
  el.innerHTML =
    `<div class="dc-card">
      <div class="dc-head">
        <div class="dc-head-l">
          <span class="dc-chip" style="background:#f59e0b22;color:#f59e0b">${_med2Ico(MED2_IC.box)}</span>
          <div style="min-width:0"><div class="dc-eyebrow">Pharmacie</div><div class="dc-title">Stock &amp; renouvellements</div></div>
        </div>
        ${ajout}
      </div>
      <div class="dc-body">
        <div class="med-scroll">${med2Stock()}</div>
        <div class="dc-eyebrow" style="margin:16px 0 10px">Fins de traitement</div>
        ${med2Renouvellements(date)}
      </div>
    </div>
    <div class="dc-card">
      <div class="dc-head">
        <div class="dc-head-l">
          <span class="dc-chip" style="background:#22d3ee22;color:#22d3ee">${_med2Ico(MED2_IC.clock)}</span>
          <div style="min-width:0"><div class="dc-eyebrow">À venir</div><div class="dc-title">Prochaines prises</div></div>
        </div>
      </div>
      <div class="dc-body"><div class="med-scroll">${med2Prochaines(date, enriched)}</div></div>
    </div>`;
}

// ── STOCK DE MÉDICAMENTS ─────────────────────────────────────────────
// Source : table stock_medicaments (js/stock-med-supabase.js). Tant que la
// migration n'est pas exécutée, le cache reste vide et le bloc affiche un
// état vide — la page reste utilisable.
let _stockMedCache = [];
function stockMedList() { return _stockMedCache; }
async function loadStockMedCache() {
  _stockMedCache = (typeof sbGetStockMed === 'function') ? await sbGetStockMed() : [];
}

// Niveau déduit de seuil_alerte, même convention que inventaire.seuil_alerte
// (cf. _dv2Stocks dans js/dashboard-v2.js) : moitié du seuil = critique.
function stockMedNiveau(s) {
  const seuil = s.seuilAlerte;
  if (seuil == null) return null;
  const q = s.quantite ?? 0;
  if (q <= seuil / 2) return { label: 'Critique', c: '#ef4444' };
  if (q <= seuil) return { label: 'Bas', c: '#f59e0b' };
  return { label: 'OK', c: '#10b981' };
}

// Pourcentage restant = quantite / quantite_initiale. Sans quantité initiale
// exploitable, il n'y a pas de pourcentage : on n'affiche pas de barre.
function stockMedPct(s) {
  const init = s.quantiteInitiale ?? 0;
  if (!init || init <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((s.quantite ?? 0) / init * 100)));
}

function med2Stock() {
  const list = stockMedList();
  if (!list.length) {
    return `<div class="v2-blk-vide">Aucun stock enregistré.${medCanEdit ? ' Utilisez « + Stock » pour en ajouter un.' : ''}</div>`;
  }
  const resMap = {};
  (typeof sbResidents === 'function' ? sbResidents() : []).forEach(r => { resMap[String(r.id)] = r; });

  const rang = s => { const n = stockMedNiveau(s); return n ? ['Critique', 'Bas', 'OK'].indexOf(n.label) : 3; };
  const tri = [...list].sort((a, b) => rang(a) - rang(b)
    || (stockMedPct(a) ?? 101) - (stockMedPct(b) ?? 101)
    || (a.libelle || '').localeCompare(b.libelle || '', 'fr'));

  return tri.map(s => {
    const niv = stockMedNiveau(s);
    const pct = stockMedPct(s);
    const c = niv ? niv.c : '#818cf8';
    const r = s.residentId ? resMap[String(s.residentId)] : null;
    const qui = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : (s.residentId ? '' : 'Stock collectif');

    const sub = [
      qui,
      `${s.quantite ?? 0}${s.unite ? ' ' + s.unite : ''} restant(s)`,
      s.datePeremption ? 'péremption ' + formatDate(s.datePeremption) : ''
    ].filter(Boolean).join(' · ');

    const barre = pct == null ? ''
      : `<div class="al-prog-bar" style="flex:0 0 64px" title="${pct}% restant"><span style="width:${pct}%;background:${c}"></span></div>`;
    const label = niv ? niv.label + (pct == null ? '' : ' · ' + pct + '%') : (pct == null ? '' : pct + '%');
    const tag = label
      ? `<span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${label}</span>`
      : '';
    const edit = medCanEdit
      ? `<button type="button" class="v2-med-li-edit" onclick="stockMedOpen('${escAttr(s.id)}')" title="Modifier ce stock" aria-label="Modifier le stock ${escAttr(s.libelle)}">${_med2Svg(MED2_IC.edit, 2.4)}</button>`
      : '';

    return `<div class="dc-line" style="display:flex;align-items:center;gap:11px;padding:9px 12px;margin-bottom:8px;border-left:3px solid ${c};border-radius:8px;background:var(--v2-s-sub)">
      <div style="flex:1;min-width:0">
        <div class="dc-title" style="font-size:13px">${escHtml(s.libelle || '—')}</div>
        <div style="font-size:11.5px;color:var(--v2-t5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(sub)}</div>
      </div>
      ${barre}${tag}${edit}
    </div>`;
  }).join('');
}

// ── MODALE STOCK (gabarit .v2-md) ────────────────────────────────────
let _stkEditId = '';

function stockMedOpen(id) {
  if (!medCanEdit) return;
  _stkEditId = id || '';
  const s = _stockMedCache.find(x => String(x.id) === String(id)) || {};
  const set = (el, v) => { const n = document.getElementById(el); if (n) n.value = v; };

  // Liste des résidents pour un stock nominatif (vide = stock collectif)
  // Barre de recherche résident (datalist) ; l'id sélectionné vit dans le champ caché #stkResident.
  const res = (typeof medResidents === 'function' ? medResidents() : []);
  const dl = document.getElementById('stkResidents');
  if (dl) dl.innerHTML = res.map(r => `<option value="${escAttr(stkResDisplay(r))}"></option>`).join('');
  const hid = document.getElementById('stkResident');
  if (hid) hid.value = s.residentId || '';
  const search = document.getElementById('stkResSearch');
  if (search) { const cur = res.find(r => String(r.id) === String(s.residentId || '')); search.value = cur ? stkResDisplay(cur) : ''; }
  stkFillTraitements(s.traitementId || '');
  set('stkLibelle', s.libelle || '');
  set('stkQuantite', s.quantite ?? '');
  set('stkInitiale', s.quantiteInitiale ?? '');
  set('stkSeuil', s.seuilAlerte ?? '');
  set('stkUnite', s.unite || '');
  set('stkPeremption', s.datePeremption || '');

  const t = document.getElementById('stkTitle');
  if (t) t.textContent = id ? 'Modifier le stock' : 'Ajouter un stock';
  const del = document.getElementById('stkDelete');
  // La suppression est réservée aux administrateurs (politique RLS).
  if (del) del.style.display = (id && Auth.isAdmin()) ? '' : 'none';

  openModal('modalStockMed');
}

// Libellé d'un résident dans la barre de recherche (chambre incluse pour lever les homonymies).
function stkResDisplay(r) {
  return `${r.prenom || ''} ${r.nom || ''}`.trim() + (r.chambre ? ' · Ch. ' + r.chambre : '');
}
// Barre de recherche « Rattachement » : résout le texte saisi en id de résident (champ caché
// #stkResident) ; vide ou non trouvé = stock collectif. Ne réinitialise le traitement que si le
// résident change réellement (évite de tout réinitialiser à chaque frappe).
function stkResPick() {
  const q = (document.getElementById('stkResSearch').value || '').trim();
  const r = (typeof medResidents === 'function' ? medResidents() : []).find(x => stkResDisplay(x) === q);
  const id = r ? String(r.id) : '';
  const hid = document.getElementById('stkResident');
  if (!hid || hid.value === id) return;
  hid.value = id;
  stkFillTraitements();
}

// Remplit « Traitement lié » d'après le résident choisi (stock nominatif).
// Un stock collectif (sans résident) ne peut pas être relié à un traitement précis.
function stkFillTraitements(selTid) {
  const resSel = document.getElementById('stkResident');
  const tSel = document.getElementById('stkTraitement');
  const wrap = document.getElementById('stkTraitementWrap');
  if (!tSel) return;
  const rid = resSel ? resSel.value : '';
  const res = (typeof medResidents === 'function' ? medResidents() : []);
  const r = res.find(x => String(x.id) === String(rid));
  const traits = (r && r.sante && Array.isArray(r.sante.traitements)) ? r.sante.traitements : [];
  if (wrap) wrap.style.display = rid ? '' : 'none';
  tSel.innerHTML = `<option value="">Aucun — pas de décompte auto</option>` +
    traits.map(t => `<option value="${escAttr(t.id)}">${escHtml(t.nom || 'Traitement')}${t.posologie ? ' — ' + escHtml(t.posologie) : ''}</option>`).join('');
  tSel.value = (selTid != null) ? selTid : '';
  stkToggleLibelle();
}

// Masque le champ texte « Médicament » quand un traitement est lié (le nom du
// médicament vient alors du traitement) ; le laisse visible pour un stock sans
// traitement (collectif, ou nominatif non relié).
function stkToggleLibelle() {
  const tSel = document.getElementById('stkTraitement');
  const wrap = document.getElementById('stkLibelleWrap');
  if (!wrap) return;
  wrap.style.display = (tSel && tSel.value) ? 'none' : '';
}

async function stockMedSave() {
  const val = id => (document.getElementById(id) || {}).value || '';
  const residentId = val('stkResident');
  const traitementId = residentId ? val('stkTraitement') : '';
  // Libellé : repris du traitement lié s'il y en a un, sinon saisi à la main (stock collectif).
  let libelle = val('stkLibelle').trim();
  if (traitementId) {
    const r = (typeof medResidents === 'function' ? medResidents() : []).find(x => String(x.id) === String(residentId));
    const t = ((r && r.sante && r.sante.traitements) || []).find(x => String(x.id) === String(traitementId));
    if (t && t.nom) libelle = t.nom;
  }
  if (!libelle) { toast('Indiquez le médicament (ou reliez un traitement)', 'error'); return; }
  const initiale = Number(val('stkInitiale'));
  if (!Number.isFinite(initiale) || initiale <= 0) { toast('Indiquez une quantité initiale supérieure à 0', 'error'); return; }
  const quantite = Number(val('stkQuantite'));
  if (!Number.isFinite(quantite) || quantite < 0) { toast('Indiquez une quantité restante valide', 'error'); return; }

  const s = {
    id: _stkEditId || undefined,
    residentId,
    traitementId,
    libelle,
    quantite,
    quantiteInitiale: initiale,
    seuilAlerte: val('stkSeuil') === '' ? null : Number(val('stkSeuil')),
    unite: val('stkUnite').trim(),
    datePeremption: val('stkPeremption')
  };
  try {
    await sbSaveStockMed(s);
    await loadStockMedCache();
    closeModal('modalStockMed');
    med2Render();
    toast('Stock enregistré');
  } catch (e) {
    console.error('[stock-med] enregistrement', e);
    toast(e.message || 'Enregistrement du stock impossible', 'error');
  }
}

async function stockMedDelete() {
  if (!_stkEditId) return;
  if (!confirm('Supprimer cette ligne de stock ?')) return;
  try {
    await sbDeleteStockMed(_stkEditId);
    await loadStockMedCache();
    closeModal('modalStockMed');
    med2Render();
    toast('Stock supprimé');
  } catch (e) {
    console.error('[stock-med] suppression', e);
    toast(e.message || 'Suppression du stock impossible', 'error');
  }
}

// Fins de traitement : donnée réelle issue de r.sante.traitements[].fin.
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
    return `<div class="dc-line" style="display:flex;align-items:center;gap:11px;padding:9px 12px;margin-bottom:8px;border-left:3px solid ${c};border-radius:8px;background:var(--v2-s-sub)">
      <div style="flex:1;min-width:0">
        <div class="dc-title" style="font-size:13px">${escHtml(l.nom)}</div>
        <div style="font-size:11.5px;color:var(--v2-t5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(l.res)} · fin le ${formatDate(l.fin)}</div>
      </div>
      <div class="al-prog-bar" style="flex:0 0 64px"><span style="width:${pct}%;background:${c}"></span></div>
      <span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${tag} · ${l.j} j</span>
    </div>`;
  }).join('');
}

// Initiales + couleur d'avatar (stables par nom) pour la grille « Prochaines prises ».
const MED2_AVPAL = ['#6366f1', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#0ea5e9', '#16a34a'];
function _med2Initiales(nom) {
  const p = (nom || '').trim().split(/\s+/).filter(Boolean);
  const a = (p[0] || '')[0] || '';
  const b = (p[1] || '')[0] || '';
  return (a + b).toUpperCase() || '·';
}
function _med2Avatar(nom) {
  let h = 0; const s = nom || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return MED2_AVPAL[h % MED2_AVPAL.length];
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
  return `<div class="med-pp-grid">` + tri.map(e => {
    const mom = MED_MOMENTS[e.moment] || { label: e.moment, icon: '' };
    const c = MED2_MOM_C[e.moment] || '#818cf8';
    const nom = e.residentName || '—';
    return `<div class="med-pp-tile" title="${escHtml(nom)} · ${escHtml(e.medicament || '')}">
      <div class="med-pp-av" style="background:${_med2Avatar(nom)}">${escHtml(_med2Initiales(nom))}</div>
      <div class="med-pp-info">
        <div class="med-pp-res">${escHtml(nom)}</div>
        <div class="med-pp-med">${escHtml(e.medicament || '')}${e.posologie ? ' · ' + escHtml(e.posologie) : ''}</div>
        <span class="med-pp-mom" style="background:${c}1f;color:${c}">${mom.icon} ${escHtml(mom.label)}</span>
      </div>
    </div>`;
  }).join('') + `</div>`;
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
  // Légende des statuts affichés sur les cartes (utile avec les icônes du Design B).
  const legende = `<div class="v2-med-legend"><span class="lg-t">Statuts</span>` +
    Object.entries(MED_STATUTS).map(([k, v]) => {
      const c = MED2_ST[k]?.c || v.color;
      return `<span class="v2-med-lg"><span class="v2-med-lg-i" style="color:${c}">${_med2Svg(MED2_ST[k]?.ic || MED2_IC.tick, 2.4)}</span>${escHtml(v.label)}</span>`;
    }).join('') + `</div>`;
  el.innerHTML = `
    <div class="v2-med-search">${_med2Svg(MED2_IC.search)}
      <input id="medSearchInput" type="text" placeholder="Rechercher un résident…" value="${escAttr(medSearch)}" oninput="medSetSearch(this.value)"/>
    </div>
    <button type="button" class="v2-chip-f${MED2_MOMENT === '' ? ' on' : ''}" onclick="med2SetMoment('')" aria-pressed="${MED2_MOMENT === ''}">Tous les moments<span class="n">${enriched.length}</span></button>
    ${moments}
    <button type="button" class="v2-chip-f${medFilterPresent ? ' on' : ''}" onclick="medTogglePresent()" aria-pressed="${medFilterPresent}">
      <span class="dot" style="background:${medFilterPresent ? '#10b981' : '#5f7a9c'}"></span>Présents seulement</button>
    ${legende}`;
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
    ? `<div class="v2-med-hint">${_med2Svg(MED2_IC.edit)} <b>Donné</b> enregistre la prise (re-clic = annule) · <b>⋯</b> pour refus, absence, report ou note · <b>Tout donné</b> passe toutes les prises du résident sur Donné</div>`
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

  // Ce que « Tout donné » va basculer : les prises VISIBLES (filtres moment /
  // recherche / présents compris) qui ne sont pas déjà « Donné ». Recalculer
  // depuis medPrevues() enregistrerait des prises que l'utilisateur ne voit pas ;
  // inclure celles déjà « Donné » les annulerait (setMedStatut est une bascule).
  _med2Restants = {};
  groupes.forEach(g => {
    _med2Restants[g.id] = g.items
      .filter(e => e.record?.statut !== 'donne')
      .map(e => ({ residentId: e.residentId, residentName: e.residentName, traitementId: e.traitementId, moment: e.moment, medicament: e.medicament }));
  });

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
    // En 4 colonnes, l'alerte ne tient plus dans l'en-tête à côté du compteur :
    // elle prend sa propre ligne pleine largeur sous le nom du résident.
    const badgeAl = alertes.length
      ? `<div class="v2-med-alrt" title="${escAttr(alertes.join(' · '))}">${_med2Svg(MED2_IC.alert, 2.4)}<span>${escHtml(alertes.join(' · '))}</span></div>`
      : '';

    const faits = g.items.filter(e => e.record?.statut).length;
    const complet = faits === g.items.length;
    // « Tout donné » : passe TOUTES les prises du résident sur « Donné », y
    // compris celles déjà marquées refusées/absentes (chaque bascule reste
    // tracée dans le journal d'audit). Rien à faire si tout est déjà donné.
    const restants = g.items.filter(e => e.record?.statut !== 'donne').length;
    // Prises portant DÉJÀ un autre statut (refusé, absent, confié, reporté) :
    // les écraser est demandé, mais ça remplace une observation clinique — le
    // bouton doit le dire, et demander confirmation dans ce cas précis.
    const ecrases = g.items.filter(e => e.record?.statut && e.record.statut !== 'donne')
      .map(e => `${MED_MOMENTS[e.moment]?.label || e.moment} · ${e.medicament || '—'} (${MED_STATUTS[e.record.statut]?.label || e.record.statut})`);
    const titre = ecrases.length
      ? `Passer les ${restants} prise${restants > 1 ? 's' : ''} restante${restants > 1 ? 's' : ''} sur « Donné » — dont ${ecrases.length} déjà renseignée${ecrases.length > 1 ? 's' : ''} qui ${ecrases.length > 1 ? 'seront remplacées' : 'sera remplacée'}`
      : `Enregistrer « Donné » sur les ${restants} prise${restants > 1 ? 's' : ''} non renseignée${restants > 1 ? 's' : ''}`;
    const btnTout = (medCanEdit && restants)
      ? `<button type="button" class="v2-med-all${ecrases.length ? ' av' : ''}" onclick="med2ToutDonne('${escAttr(String(g.id))}')"
          title="${escAttr(titre)}">
          ${_med2Svg(MED2_IC.tickAll, 2.4)}Tout donné</button>`
      : '';

    return `<div class="dc-card v2-med-card">
      <div class="dc-head">
        <div class="dc-head-l">
          ${av}
          <div style="min-width:0">
            <div class="dc-eyebrow">${r.chambre ? 'Chambre ' + escHtml(r.chambre) : 'Chambre non renseignée'}</div>
            <div class="dc-title">${escHtml(g.nom || '—')}</div>
          </div>
        </div>
        <div class="v2-med-hd-r">
          ${btnTout}
          <span class="dc-badge ${complet ? 'dc-b-green' : 'dc-b-indigo'}"><span class="d"></span>${faits}/${g.items.length}</span>
        </div>
      </div>
      ${badgeAl}
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

  // « Donné » (≈ 90 % des enregistrements) garde son libellé ; les 4 autres
  // statuts passent derrière « ⋯ » pour que la ligne tienne sur 4 colonnes.
  const donneOn = statut === 'donne';
  const primary = `<button type="button" class="v2-med-primary${donneOn ? ' on' : ''}" aria-pressed="${donneOn}"
    ${medCanEdit ? `onclick="med2Set(${args},'donne')"` : 'disabled'} title="Donné">
    ${_med2Svg(MED2_ST.donne.ic, 2.6)}${escHtml(MED_STATUTS.donne.label)}</button>`;
  // Un statut secondaire déjà posé remonte SUR le bouton « ⋯ » (icône + couleur) :
  // sinon « Refusé » serait indiscernable d'une prise non enregistrée.
  const autre = MED2_AUTRES.includes(statut) ? statut : '';
  const aC = autre ? (MED2_ST[autre]?.c || MED_STATUTS[autre].color) : '';
  const aLab = autre ? MED_STATUTS[autre].label : 'Autre statut';
  const more = `<button type="button" class="v2-med-more${autre ? ' on' : ''}"${autre ? ` style="--oc:${aC}"` : ''}
    ${medCanEdit ? `onclick="med2Menu(this,${args})"` : 'disabled'} aria-haspopup="menu" aria-expanded="false"
    title="${escAttr(aLab)}" aria-label="${escAttr(aLab)}">${autre ? _med2Svg(MED2_ST[autre].ic, 2.4) : _med2Svg(MED2_IC.dots, 2.4)}</button>`;
  const opts = `${primary}${more}`;

  const meta = [
    e.posologie || '',
    rec?.heure ? medHeure(rec.heure) : '',
    rec?.auteur || '',
    enRetard ? 'en retard' : ''
  ].filter(Boolean).join(' · ');

  const momC = MED2_MOM_C[e.moment] || '#818cf8';
  // Le moment n'a plus sa colonne de 78 px : il devient l'emoji devant le nom
  // (le libellé « Matin » reste en infobulle et dans le liseré de gauche).
  const momT = escAttr(mom.label) + (lim != null ? ' — avant ' + lim + 'h' : '');
  return `<div class="v2-med-row${enRetard ? ' late' : ''}" style="border-left:3px solid ${enRetard ? '#ef4444' : momC};padding-left:10px"
      oncontextmenu="event.preventDefault();${medCanEdit ? `med2Detail(${args})` : ''}">
    <div class="v2-med-txt">
      <div class="v2-med-nm"><span class="v2-med-mom" title="${momT}" aria-label="${momT}">${mom.icon}</span>${escHtml(e.medicament || '—')}</div>
      <div class="v2-med-dose">${escHtml(meta) || '—'}</div>
    </div>
    <div class="v2-med-opts">${opts}</div>
    ${rec?.observation ? `<div class="v2-med-note">${_med2Svg(MED2_IC.note, 2)} ${escHtml(rec.observation)}</div>` : ''}
  </div>`;
}

// ── « Tout donné » : passe d'un geste toutes les prises du résident sur Donné ──
// Sans confirmation : le geste est immédiat, comme un clic sur « Donné ».
// On écarte les prises DÉJÀ « Donné » — setMedStatut est une bascule, les
// rejouer les annulerait. Les autres statuts (refus, absence…) sont bien
// remplacés, et chaque bascule reste tracée dans le journal d'audit.
// Les écritures passent par setMedStatut, donc par la file medQueueWrite —
// elles partent en base dans l'ordre, comme des clics successifs.
async function med2ToutDonne(residentId) {
  if (!medCanEdit) return;
  const date = document.getElementById('medDate')?.value || today();
  const restants = (_med2Restants[String(residentId)] || [])
    .filter(p => medRecord(date, p.residentId, p.traitementId, p.moment)?.statut !== 'donne');
  if (!restants.length) return;

  // Confirmation UNIQUEMENT si des statuts cliniques vont être remplacés. Sans
  // écrasement, le geste reste immédiat, comme demandé.
  const aEcraser = restants.filter(p => {
    const st = medRecord(date, p.residentId, p.traitementId, p.moment)?.statut;
    return st && st !== 'donne';
  });
  if (aEcraser.length) {
    const msg = `${aEcraser.length} prise${aEcraser.length > 1 ? 's' : ''} déjà renseignée${aEcraser.length > 1 ? 's' : ''} ${aEcraser.length > 1 ? 'seront remplacées' : 'sera remplacée'} par « Donné » :\n\n`
      + aEcraser.map(p => {
          const st = medRecord(date, p.residentId, p.traitementId, p.moment)?.statut;
          return `• ${MED_MOMENTS[p.moment]?.label || p.moment} — ${p.medicament} (actuellement « ${MED_STATUTS[st]?.label || st} »)`;
        }).join('\n')
      + `\n\nL'observation éventuellement associée reste attachée à la prise. Continuer ?`;
    if (!confirm(msg)) return;
  }

  const n = restants.length;
  for (const p of restants) {
    await setMedStatut(date, p.residentId, p.traitementId, p.moment, 'donne');
  }
  if (typeof toast === 'function') toast(`${n} prise${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''}`, 'success');
}

// ── Menu « ⋯ » : les 4 statuts secondaires + l'accès au détail ────────────
// Un seul élément partagé, rattaché à <body> en position:fixed — comme le menu
// utilisateur de la barre V2, pour échapper au overflow:hidden de .v2-shell.
let _med2MenuCtx = null;
function _med2MenuEl() {
  let el = document.getElementById('med2Menu');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'med2Menu';
  el.className = 'v2-med-menu';
  el.setAttribute('role', 'menu');
  document.body.appendChild(el);
  // Fermeture : clic ailleurs, Échap, défilement ou redimensionnement (le menu
  // est en position:fixe, il ne suivrait pas son bouton).
  document.addEventListener('click', e => {
    if (!_med2MenuCtx) return;
    if (e.target.closest('#med2Menu') || e.target.closest('.v2-med-more')) return;
    med2MenuClose();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') med2MenuClose(); });
  window.addEventListener('resize', med2MenuClose);
  window.addEventListener('scroll', med2MenuClose, true);
  return el;
}
function med2MenuClose() {
  const el = document.getElementById('med2Menu');
  if (el) el.classList.remove('open');
  document.querySelectorAll('.v2-med-more[aria-expanded="true"]')
    .forEach(b => b.setAttribute('aria-expanded', 'false'));
  _med2MenuCtx = null;
}
function med2Menu(btn, residentId, traitementId, moment) {
  const ouvert = _med2MenuCtx
    && _med2MenuCtx.residentId === residentId
    && _med2MenuCtx.traitementId === traitementId
    && _med2MenuCtx.moment === moment;
  med2MenuClose();
  if (ouvert) return; // re-clic sur le même bouton = referme

  const date = document.getElementById('medDate')?.value || today();
  const rec = typeof medRecord === 'function' ? medRecord(date, residentId, traitementId, moment) : null;
  const statut = rec?.statut || '';
  const el = _med2MenuEl();
  el.innerHTML = MED2_AUTRES.map(k => {
    const v = MED_STATUTS[k];
    const c = MED2_ST[k]?.c || v.color;
    const on = statut === k;
    return `<button type="button" class="v2-med-menu-o${on ? ' on' : ''}" style="--oc:${c}" role="menuitem" aria-checked="${on}"
      onclick="med2MenuPick('${k}')">${_med2Svg(MED2_ST[k]?.ic || MED2_IC.tick, 2.4)}<span>${escHtml(v.label)}</span></button>`;
  }).join('') +
    `<div class="v2-med-menu-sep"></div>
     <button type="button" class="v2-med-menu-o" role="menuitem" onclick="med2MenuPick('__detail')">
       ${_med2Svg(MED2_IC.note, 2.2)}<span>Note et détail…</span></button>`;

  _med2MenuCtx = { residentId, traitementId, moment };
  el.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');

  // Placement sous le bouton, replié au-dessus / recalé si ça déborde.
  const r = btn.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = r.right - w;
  if (left < 8) left = 8;
  if (left + w > window.innerWidth - 8) left = window.innerWidth - 8 - w;
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - 6 - h);
  el.style.left = left + 'px';
  el.style.top = top + 'px';
}
function med2MenuPick(k) {
  const ctx = _med2MenuCtx;
  med2MenuClose();
  if (!ctx) return;
  if (k === '__detail') med2Detail(ctx.residentId, ctx.traitementId, ctx.moment);
  else med2Set(ctx.residentId, ctx.traitementId, ctx.moment, k);
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
