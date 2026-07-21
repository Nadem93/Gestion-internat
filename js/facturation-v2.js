// ── FACTURATION & TARIFICATION — DESIGN V2 ────────────────────────────
// Reprend le langage visuel de la maquette « Finance (pilotage).dc.html » :
//   bandeau de 5 tuiles chiffrées, jauge de consommation + récapitulatif,
//   tendance sur 12 périodes, barres par enveloppe, classement, puis tableau
//   des dernières opérations.
//
// Ce module ne réécrit AUCUNE couche de données : il redéfinit uniquement les
// fonctions de rendu de js/facturation.js (chargé avant lui) et réutilise
// getTarifs(), getFactures(), setTarifs(), sbSaveFacture(), etc.
//
// Toutes les valeurs affichées proviennent des tables existantes
// (public.factures, public.facturation_tarifs, public.residents,
// public.presences) : aucune donnée n'est inventée, aucune table nouvelle
// n'est requise — il n'y a donc pas de migration SQL associée à cette page.

// ── Icônes ────────────────────────────────────────────────────────────
const FC2_IC = {
  euro:   '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  send:   '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  chart:  '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  tag:    '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  down:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x:      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
};
function fc2Svg(d, w) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2)
    + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
}

const FC2_ST = {
  brouillon: { l: 'Brouillon', c: '#8095b4' },
  envoyee:   { l: 'Envoyée',   c: '#22d3ee' },
  payee:     { l: 'Payée',     c: '#10b981' }
};
const FC2_ORG_C = ['#818cf8', '#22d3ee', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#ea580c'];
const FC2_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// ── Helpers ───────────────────────────────────────────────────────────
function fc2Eur(n) {
  return (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fc2EurC(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' €'; }
function fc2Esc(s) { return (typeof escHtml === 'function') ? escHtml(s == null ? '' : String(s)) : String(s == null ? '' : s); }
function fc2Hash(s) {
  let h = 0; const t = String(s || '');
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return h;
}
function fc2OrgC(o) { return FC2_ORG_C[fc2Hash(o) % FC2_ORG_C.length]; }
function fc2Init(nom) {
  return String(nom || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}
// « 2026-07 » → « juil. 2026 »
function fc2PeriodeLabel(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(p || ''));
  if (!m) return String(p || '—');
  return FC2_MOIS[Number(m[2]) - 1] + ' ' + m[1];
}
function fc2PeriodeCourt(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(p || ''));
  if (!m) return String(p || '');
  return FC2_MOIS[Number(m[2]) - 1].replace('.', '') + ' ' + m[1].slice(2);
}
function fc2Val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function fc2Set(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function fc2Txt(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

// ── TARIFS (catégories de prise en charge) ────────────────────────────
function openTarifModal(id) {
  const md = document.getElementById('modalTarif');
  if (md) md.dataset.id = id || '';
  fc2Txt('tarifModalTitle', id ? 'Modifier la catégorie' : 'Nouvelle catégorie de tarif');
  const cat = id ? (getTarifs().categories || []).find(c => c.id === id) : null;
  if (id && !cat) return;
  const l = document.getElementById('tarifFormLabel');
  const p = document.getElementById('tarifFormPrix');
  if (l) l.value = cat ? cat.label : '';
  if (p) p.value = cat ? cat.prixJour : '';
  openModal('modalTarif');
}

function renderTarifs() {
  const isAdmin = Auth.isAdmin();
  const t = getTarifs();
  const cats = t.categories || [];
  if (!cats.length) {
    fc2Set('tarifsList', '<div class="v2-blk-vide">Aucune catégorie de tarif définie.</div>');
    return;
  }
  fc2Set('tarifsList', cats.map((c, i) => {
    const col = FC2_ORG_C[i % FC2_ORG_C.length];
    return '<div class="fc2-tarif" style="--pc:' + col + '">'
      + '<span class="fc2-tarif-d"></span>'
      + '<span class="fc2-tarif-n">' + fc2Esc(c.label) + '</span>'
      + '<span class="fc2-tarif-p">' + fc2Eur(c.prixJour) + ' <em>/ jour</em></span>'
      + (isAdmin
        ? '<span class="fc2-acts">'
          + '<button type="button" class="fc2-mini fc2-mini-ico" title="Modifier" onclick="openTarifModal(\'' + fc2Esc(c.id) + '\')">' + fc2Svg(FC2_IC.pen) + '</button>'
          + '<button type="button" class="fc2-mini fc2-mini-ico fc2-mini-danger" title="Supprimer" onclick="supprimerTarif(\'' + fc2Esc(c.id) + '\')">' + fc2Svg(FC2_IC.trash) + '</button>'
          + '</span>'
        : '')
      + '</div>';
  }).join(''));
}

// ── AFFECTATION DES RÉSIDENTS ─────────────────────────────────────────
function renderAffectations() {
  const isAdmin = Auth.isAdmin();
  const t = getTarifs();
  const residents = (typeof sbResidents === 'function' ? sbResidents() : []).filter(r => r.statut !== 'sorti');
  const el = document.getElementById('affectationsList');
  if (!el) return;
  fc2Txt('fc2AffCount', residents.length ? residents.length + ' résident' + (residents.length > 1 ? 's' : '') + ' actif' + (residents.length > 1 ? 's' : '') : '');
  if (!residents.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun résident actif.</div>';
    return;
  }
  el.innerHTML = residents.map(r => {
    const aff = (t.affectations || {})[r.id] || { categorieId: '', organisme: '' };
    const nom = ((r.prenom || '') + ' ' + (r.nom || '')).trim();
    const col = fc2OrgC(nom);
    const catOptions = '<option value="">— Non affecté —</option>' + (t.categories || []).map(c =>
      '<option value="' + fc2Esc(c.id) + '"' + (aff.categorieId === c.id ? ' selected' : '') + '>' + fc2Esc(c.label) + '</option>').join('');
    const orgOptions = '<option value="">— Organisme payeur —</option>' + FACT_ORGANISMES.map(o =>
      '<option value="' + fc2Esc(o) + '"' + (aff.organisme === o ? ' selected' : '') + '>' + fc2Esc(o) + '</option>').join('');
    return '<div class="fc2-aff">'
      + '<span class="fc2-aff-av" style="background:linear-gradient(135deg,' + col + ',' + col + 'aa)">' + fc2Esc(fc2Init(nom)) + '</span>'
      + '<span class="fc2-aff-n">' + fc2Esc(nom) + '</span>'
      + '<select class="v2-fld fc2-f" style="width:210px"' + (isAdmin ? '' : ' disabled') + ' onchange="setAffectation(\'' + fc2Esc(r.id) + '\',\'categorieId\',this.value)">' + catOptions + '</select>'
      + '<select class="v2-fld fc2-f" style="width:190px"' + (isAdmin ? '' : ' disabled') + ' onchange="setAffectation(\'' + fc2Esc(r.id) + '\',\'organisme\',this.value)">' + orgOptions + '</select>'
      + '</div>';
  }).join('');
}

// ── FILTRES ───────────────────────────────────────────────────────────
function fc2SyncFiltres(list) {
  const pSel = document.getElementById('factFiltrePeriode');
  if (pSel) {
    const periodes = [...new Set(list.map(f => f.periode))].filter(Boolean).sort().reverse();
    const cur = pSel.value;
    pSel.innerHTML = '<option value="">Toutes les périodes</option>'
      + periodes.map(p => '<option value="' + fc2Esc(p) + '"' + (cur === p ? ' selected' : '') + '>' + fc2Esc(fc2PeriodeLabel(p)) + '</option>').join('');
  }
  const oSel = document.getElementById('factFiltreOrganisme');
  if (oSel) {
    const orgs = [...new Set(list.map(f => f.organisme))].filter(Boolean).sort();
    const cur = oSel.value;
    oSel.innerHTML = '<option value="">Tous les organismes</option>'
      + orgs.map(o => '<option value="' + fc2Esc(o) + '"' + (cur === o ? ' selected' : '') + '>' + fc2Esc(o) + '</option>').join('');
  }
}

function fc2Filtrer(list) {
  const periode = fc2Val('factFiltrePeriode');
  const statut = fc2Val('factFiltreStatut');
  const organisme = fc2Val('factFiltreOrganisme');
  let out = list;
  if (periode) out = out.filter(f => f.periode === periode);
  if (statut) out = out.filter(f => f.statut === statut);
  if (organisme) out = out.filter(f => f.organisme === organisme);
  return out;
}

// ── BANDEAU DE STATISTIQUES ───────────────────────────────────────────
function fc2RenderStats(filtered) {
  const somme = s => filtered.filter(f => f.statut === s).reduce((a, f) => a + (Number(f.montant) || 0), 0);
  fc2Txt('factStatTotal', fc2EurC(filtered.reduce((a, f) => a + (Number(f.montant) || 0), 0)));
  fc2Txt('factStatBrouillon', String(filtered.filter(f => f.statut === 'brouillon').length));
  fc2Txt('factStatEnvoyee', String(filtered.filter(f => f.statut === 'envoyee').length));
  fc2Txt('factStatPayee', String(filtered.filter(f => f.statut === 'payee').length));
  fc2Txt('fc2StatEncaisse', fc2EurC(somme('payee')));
}

// ── JAUGE DE RECOUVREMENT + RÉCAPITULATIF ─────────────────────────────
function fc2RenderGauge(filtered) {
  const total = filtered.reduce((a, f) => a + (Number(f.montant) || 0), 0);
  const paye = filtered.filter(f => f.statut === 'payee').reduce((a, f) => a + (Number(f.montant) || 0), 0);
  const pct = total > 0 ? Math.round(paye / total * 100) : 0;
  const g = document.getElementById('fc2Gauge');
  if (g) g.style.setProperty('--gp', (total > 0 ? (paye / total) : 0).toFixed(4) + 'turn');
  fc2Txt('fc2GaugeN', pct + '%');
  fc2Set('fc2GaugeX', total > 0
    ? fc2EurC(paye) + ' encaissés sur ' + fc2EurC(total) + '.<br>Reste ' + fc2EurC(total - paye)
      + ' à recouvrer sur ' + filtered.filter(f => f.statut !== 'payee').length + ' facture(s).'
    : 'Aucune facture pour ces critères : le taux de recouvrement n’est pas calculable.');

  const recap = ['brouillon', 'envoyee', 'payee'].map(s => {
    const items = filtered.filter(f => f.statut === s);
    const m = items.reduce((a, f) => a + (Number(f.montant) || 0), 0);
    return '<div class="fc2-recap-i" style="--pc:' + FC2_ST[s].c + '">'
      + '<span class="fc2-recap-d"></span>'
      + '<span class="fc2-recap-l">' + FC2_ST[s].l + '</span>'
      + '<span class="fc2-recap-v">' + fc2EurC(m) + '</span>'
      + '<span class="fc2-recap-n">' + items.length + ' fact.</span>'
      + '</div>';
  }).join('');
  const jours = filtered.reduce((a, f) => a + (Number(f.nbJours) || 0), 0);
  const moy = filtered.length ? filtered.reduce((a, f) => a + (Number(f.montant) || 0), 0) / filtered.length : 0;
  fc2Set('fc2Recap', recap
    + '<div class="fc2-recap-i" style="--pc:#a5b4fc"><span class="fc2-recap-d"></span>'
    + '<span class="fc2-recap-l">Journées facturées</span>'
    + '<span class="fc2-recap-v">' + jours.toLocaleString('fr-FR') + ' j</span>'
    + '<span class="fc2-recap-n">' + fc2EurC(moy) + ' moy.</span></div>');
}

// ── TENDANCE (12 dernières périodes) ──────────────────────────────────
function fc2RenderTrend(list) {
  const byP = {};
  list.forEach(f => {
    if (!f.periode) return;
    if (!byP[f.periode]) byP[f.periode] = { t: 0, e: 0 };
    byP[f.periode].t += Number(f.montant) || 0;
    if (f.statut === 'payee') byP[f.periode].e += Number(f.montant) || 0;
  });
  const periodes = Object.keys(byP).sort().slice(-12);
  if (!periodes.length) {
    fc2Set('fc2Trend', '<div class="v2-blk-vide">Aucune facture : la tendance s’affichera dès la première période générée.</div>');
    return;
  }
  const max = Math.max(...periodes.map(p => byP[p].t), 1);
  fc2Set('fc2Trend', '<div class="fc2-trend">' + periodes.map(p => {
    const d = byP[p];
    const hT = Math.max(2, Math.round(d.t / max * 100));
    const hE = Math.max(2, Math.round(d.e / max * 100));
    return '<div class="fc2-trend-c" title="' + fc2Esc(fc2PeriodeLabel(p)) + ' — facturé ' + fc2Esc(fc2EurC(d.t)) + ', encaissé ' + fc2Esc(fc2EurC(d.e)) + '">'
      + '<span class="fc2-trend-b"><i class="f" style="height:' + hT + '%"></i><i class="e" style="height:' + hE + '%"></i></span>'
      + '<span class="fc2-trend-l">' + fc2Esc(fc2PeriodeCourt(p)) + '</span></div>';
  }).join('') + '</div>');
}

// ── RÉPARTITION PAR ORGANISME ─────────────────────────────────────────
function fc2RenderOrganismes(filtered) {
  const by = {};
  filtered.forEach(f => {
    const o = f.organisme || 'Non renseigné';
    by[o] = (by[o] || 0) + (Number(f.montant) || 0);
  });
  const rows = Object.keys(by).sort((a, b) => by[b] - by[a]);
  if (!rows.length) { fc2Set('fc2Organismes', '<div class="v2-blk-vide">Aucune facture pour ces critères.</div>'); return; }
  const total = rows.reduce((a, o) => a + by[o], 0);
  fc2Set('fc2Organismes', rows.map(o => {
    const pct = total > 0 ? Math.round(by[o] / total * 100) : 0;
    const c = fc2OrgC(o);
    return '<div><div class="fc2-org-h"><span class="fc2-org-l">' + fc2Esc(o) + '</span>'
      + '<span class="fc2-org-v">' + fc2EurC(by[o]) + ' · ' + pct + ' %</span></div>'
      + '<div class="v2-prog"><span style="width:' + pct + '%;background:' + c + '"></span></div></div>';
  }).join(''));
}

// ── CLASSEMENT DES RÉSIDENTS ──────────────────────────────────────────
function fc2RenderTop(filtered) {
  const by = {};
  filtered.forEach(f => {
    const n = f.residentNom || '—';
    if (!by[n]) by[n] = { m: 0, j: 0 };
    by[n].m += Number(f.montant) || 0;
    by[n].j += Number(f.nbJours) || 0;
  });
  const rows = Object.keys(by).sort((a, b) => by[b].m - by[a].m).slice(0, 6);
  if (!rows.length) { fc2Set('fc2Top', '<div class="v2-blk-vide">Aucune facture pour ces critères.</div>'); return; }
  fc2Set('fc2Top', rows.map((n, i) =>
    '<div class="fc2-top-i"><span class="fc2-top-r">' + (i + 1) + '</span>'
    + '<span class="fc2-top-l">' + fc2Esc(n) + '<span class="fc2-top-n"> · ' + by[n].j + ' j</span></span>'
    + '<span class="fc2-top-m">' + fc2EurC(by[n].m) + '</span></div>').join(''));
}

// ── TABLEAU DES FACTURES ──────────────────────────────────────────────
function fc2RenderTable(filtered, isAdmin) {
  const el = document.getElementById('factList');
  if (!el) return;
  if (!filtered.length) {
    el.innerHTML = '<div class="v2-blk-vide" style="padding:26px 0;text-align:center">Aucune facture pour ces critères.</div>';
    return;
  }
  const rows = filtered.slice().sort((a, b) =>
    String(b.periode).localeCompare(String(a.periode)) || String(a.residentNom).localeCompare(String(b.residentNom)));
  el.innerHTML = '<div class="fc2-tablewrap"><table class="v2-table"><thead><tr>'
    + '<th>Période</th><th>Résident</th><th>Organisme</th><th>Jours</th>'
    + '<th style="text-align:right">Montant</th><th>Statut</th>'
    + (isAdmin ? '<th style="text-align:right">Actions</th>' : '')
    + '</tr></thead><tbody>'
    + rows.map(f => {
      const st = FC2_ST[f.statut] || { l: f.statut, c: '#8095b4' };
      const meta = [];
      if (f.dateEnvoi) meta.push('Envoyée le ' + formatDate(f.dateEnvoi));
      if (f.datePaiement) meta.push('Payée le ' + formatDate(f.datePaiement));
      return '<tr>'
        + '<td style="white-space:nowrap">' + fc2Esc(fc2PeriodeLabel(f.periode)) + '</td>'
        + '<td><div class="fc2-t-res">' + fc2Esc(f.residentNom) + '</div>'
          + '<div class="fc2-t-sub">' + fc2Esc(f.categorieLabel || '—') + (meta.length ? ' · ' + fc2Esc(meta.join(' · ')) : '') + '</div></td>'
        + '<td><span class="fc2-tag" style="--pc:' + fc2OrgC(f.organisme || 'Non renseigné') + '">' + fc2Esc(f.organisme || 'Non renseigné') + '</span></td>'
        + '<td style="white-space:nowrap">' + (Number(f.nbJours) || 0) + ' j × ' + fc2Esc(fc2Eur(f.prixJour)) + '</td>'
        + '<td class="fc2-t-num">' + fc2Esc(fc2Eur(f.montant)) + '</td>'
        + '<td><span class="fc2-tag" style="--pc:' + st.c + '">' + fc2Esc(st.l) + '</span></td>'
        + (isAdmin
          ? '<td><div class="fc2-acts">'
            + (f.statut === 'brouillon'
              ? '<button type="button" class="fc2-mini" onclick="changerStatutFacture(\'' + fc2Esc(f.id) + '\',\'envoyee\')">' + fc2Svg(FC2_IC.send) + 'Envoyée</button>' : '')
            + (f.statut === 'envoyee'
              ? '<button type="button" class="fc2-mini" onclick="changerStatutFacture(\'' + fc2Esc(f.id) + '\',\'payee\')">' + fc2Svg(FC2_IC.check) + 'Payée</button>' : '')
            + '<button type="button" class="fc2-mini fc2-mini-ico fc2-mini-danger" title="Supprimer" onclick="supprimerFacture(\'' + fc2Esc(f.id) + '\')">' + fc2Svg(FC2_IC.trash) + '</button>'
            + '</div></td>'
          : '')
        + '</tr>';
    }).join('') + '</tbody></table></div>';
}

// ── EXPORT CSV (des factures affichées) ───────────────────────────────
function fc2ExportCsv() {
  const filtered = fc2Filtrer(getFactures() || []);
  if (!filtered.length) { toast('Aucune facture à exporter', 'error'); return; }
  const head = ['Periode', 'Resident', 'Organisme', 'Categorie', 'Jours', 'Prix jour', 'Montant', 'Statut', 'Date envoi', 'Date paiement'];
  const cell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [head.map(cell).join(';')].concat(filtered.map(f => [
    f.periode, f.residentNom, f.organisme, f.categorieLabel,
    f.nbJours, f.prixJour, f.montant, (FC2_ST[f.statut] || {}).l || f.statut,
    f.dateEnvoi || '', f.datePaiement || ''
  ].map(cell).join(';')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'factures-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(filtered.length + ' facture(s) exportée(s)');
}

// ── RENDU GLOBAL ──────────────────────────────────────────────────────
function renderFactures() {
  const isAdmin = Auth.isAdmin();
  const list = getFactures() || [];
  fc2SyncFiltres(list);
  const filtered = fc2Filtrer(list);
  fc2RenderStats(filtered);
  fc2RenderGauge(filtered);
  fc2RenderTrend(list);
  fc2RenderOrganismes(filtered);
  fc2RenderTop(filtered);
  fc2RenderTable(filtered, isAdmin);
  fc2Txt('fc2TableCount', filtered.length + ' / ' + list.length + ' facture(s)');
}

function renderFacturation() {
  renderTarifs();
  renderAffectations();
  renderFactures();
}

// Les onclick/onchange en ligne et la navigation en iframe lisent window :
// une déclaration de premier niveau y suffit pour les fonctions, mais on
// publie explicitement celles que la coquille appelle.
window.openTarifModal = openTarifModal;
window.renderFactures = renderFactures;
window.renderFacturation = renderFacturation;
window.fc2ExportCsv = fc2ExportCsv;

// js/facturation.js a posé son écouteur DOMContentLoaded ; il appelle
// renderFacturation() par son nom global, donc la version V2. On ajoute
// seulement l'initialisation propre à la coquille V2.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth === 'undefined' || !Auth.getSession()) return;
  if (typeof requireModule === 'function' && !requireModule('access_facturation')) return;
  fc2Txt('fc2Exercice', 'Exercice ' + new Date().getFullYear());
});

if (typeof registerPageInit === 'function') registerPageInit('facturation', renderFacturation);
