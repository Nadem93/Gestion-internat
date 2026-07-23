// ── INCIDENTS — DESIGN V2 ─────────────────────────────────────────────
// Applique le langage visuel de la maquette « Registre EIG (dossiers) » au
// registre des incidents : 4 tuiles statistiques, tableau du registre
// (date, incident, résident, gravité, EIG, statut, actions), puis deux
// panneaux — répartition par type et suivi des EIG.
// Les données et les actions (Supabase) restent celles de js/incidents.js.

const INC2_IC = {
  alert:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  zap:    '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  clock:  '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  x:      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  lock:   '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  eye:    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  pen:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  print:  '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
};

// Couleur d'accent par gravité (maquette)
const INC2_GC = { leger: '#10b981', moyen: '#f59e0b', grave: '#f97316', critique: '#ef4444' };
// Couleur + libellé par statut d'incident
const INC2_ST = {
  declare: { l: 'Déclaré',  c: '#f59e0b' },
  cours:   { l: 'En cours', c: '#22d3ee' },
  valide:  { l: 'Validé',   c: '#10b981' },
  classe:  { l: 'Classé',   c: '#8095b4' }
};
// Couleur d'accent par type d'incident (clés de INCIDENT_TYPES)
const INC2_TC = {
  chute: '#f97316', agression: '#ef4444', fugue: '#ef4444', violence: '#818cf8',
  medical: '#22d3ee', materiel: '#8095b4', accident: '#f59e0b', autre: '#a78bfa'
};

function _inc2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function _inc2Esc(s) {
  return (typeof escHtml === 'function') ? escHtml(s == null ? '' : String(s)) : String(s == null ? '' : s);
}
function _inc2TypeLabel(t) {
  return (typeof INCIDENT_TYPES === 'object' && INCIDENT_TYPES[t]) || t || 'Autre';
}
function _inc2GravLabel(g) {
  return (typeof GRAVITE_LABELS === 'object' && GRAVITE_LABELS[g]) || g || '—';
}
function _inc2StatLabel(s) {
  return (INC2_ST[s] && INC2_ST[s].l) || ((typeof STATUT_LABELS === 'object' && STATUT_LABELS[s]) || s || '—');
}

// Date courte façon maquette : « 19 juil. »
const INC2_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function _inc2Court(d) {
  if (!d) return '—';
  const dt = new Date(String(d).slice(0, 10) + 'T12:00:00');
  if (isNaN(dt)) return '—';
  return `${String(dt.getDate()).padStart(2, '0')} ${INC2_MOIS[dt.getMonth()]}`;
}
function _inc2Annee(d) {
  if (!d) return '';
  const dt = new Date(String(d).slice(0, 10) + 'T12:00:00');
  return isNaN(dt) ? '' : String(dt.getFullYear());
}

// État EIG d'un incident : null si non déclarable
function _inc2Eig(i) {
  if (!i.eig || !i.eig.declarable) return null;
  if (i.eig.cloture)    return { l: 'Clôturé',     c: '#10b981', ic: INC2_IC.lock };
  if (i.eig.declareARS) return { l: 'Déclaré ARS', c: '#34d399', ic: INC2_IC.check };
  return { l: 'À déclarer', c: '#f59e0b', ic: INC2_IC.clock };
}

// ── RENDU PRINCIPAL ───────────────────────────────────────────────────
// `list`     : incidents filtrés (recherche + filtres) — alimente le tableau
// `visibles` : incidents visibles par l'utilisateur (filtrage par rôle seul)
//              — alimente les tuiles et les panneaux d'analyse
function inc2Render(list, visibles, ctx) {
  const c = ctx || {};
  inc2Stats(visibles || list || []);
  inc2Corps(list || [], visibles || list || [], c);
}

// ── TUILES STATISTIQUES ───────────────────────────────────────────────
function inc2Stats(all) {
  const box = document.getElementById('incStats');
  if (!box) return;

  const auj = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const an       = all.filter(i => (i.date || '') >= limite);
  const serieux  = all.filter(i => i.gravite === 'grave' || i.gravite === 'critique');
  const ouverts  = all.filter(i => i.statut === 'declare' || i.statut === 'cours');
  const traites  = all.filter(i => i.statut === 'valide'  || i.statut === 'classe');
  const eigOuv   = all.filter(i => i.eig && i.eig.declarable && !i.eig.declareARS && !i.eig.cloture);
  const anciens  = ouverts.filter(i => i.date && i.date < new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));

  const cells = [
    { n: an.length,      l: 'Incidents (12 mois)', c: '#ef4444', ic: INC2_IC.alert },
    { n: serieux.length, l: 'Graves ou critiques', c: '#f97316', ic: INC2_IC.zap,
      x: eigOuv.length ? `${eigOuv.length} EIG à déclarer` : '' },
    { n: ouverts.length, l: 'En cours de traitement', c: '#f59e0b', ic: INC2_IC.clock,
      x: anciens.length ? `${anciens.length} ouverts depuis + de 7 j` : '' },
    { n: traites.length, l: 'Traités', c: '#10b981', ic: INC2_IC.lock }
  ];
  void auj;

  box.innerHTML = cells.map(c => `<div class="inc2-stat" style="--pc:${c.c}">
    <span class="inc2-stat-ico">${_inc2Svg(c.ic)}</span>
    <div><div class="inc2-stat-n">${c.n}</div><div class="inc2-stat-l">${_inc2Esc(c.l)}</div>${c.x ? `<div class="inc2-stat-x">${_inc2Esc(c.x)}</div>` : ''}</div>
  </div>`).join('');
}

// ── CORPS : TABLEAU + PANNEAUX ────────────────────────────────────────
function inc2Corps(list, visibles, ctx) {
  const el = document.getElementById('incidentsList');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="inc2-empty">
      ${_inc2Svg(INC2_IC.alert)}
      <div class="inc2-empty-t">Aucun incident à afficher</div>
      <div class="inc2-empty-s">${visibles.length
        ? 'Aucun incident ne correspond à la recherche ou aux filtres actifs.'
        : 'Déclarez un incident avec le bouton « Déclarer un incident » en haut de la page.'}</div>
    </div>`;
    return;
  }

  el.innerHTML = inc2Table(list, ctx) + `<div class="inc2-duo">
    <div class="v2-blk">
      <div class="v2-blk-h"><span class="v2-blk-t">Répartition par type</span></div>
      ${inc2ParType(visibles)}
    </div>
    <div class="inc2-ars-blk">
      <div class="inc2-ars-h">${_inc2Svg(INC2_IC.shield)}<span class="inc2-ars-t">Suivi des EIG</span><a class="inc2-ars-lien" href="eig.html">Registre →</a></div>
      ${inc2EigSuivi(visibles)}
    </div>
  </div>`;
}

// ── TABLEAU DU REGISTRE ───────────────────────────────────────────────
function inc2Table(list, ctx) {
  const cols = ['Date', 'Incident', 'Résident', 'Gravité', 'EIG', 'Statut', ''];

  const corps = list.map(i => {
    const gc = INC2_GC[i.gravite] || '#8095b4';
    const tc = INC2_TC[i.type] || INC2_TC.autre;
    const st = INC2_ST[i.statut] || { l: _inc2StatLabel(i.statut), c: '#8095b4' };
    const eg = _inc2Eig(i);
    const heure = i.heure ? String(i.heure).slice(0, 5) : '';
    const canValidate = !!ctx.canValidate && (i.statut === 'declare' || i.statut === 'cours');

    return `<tr>
      <td><div class="inc2-date">${_inc2Esc(_inc2Court(i.date))}<span>${_inc2Esc(heure || _inc2Annee(i.date))}</span></div></td>
      <td>
        <div class="inc2-ti">${_inc2Esc(i.titre)}</div>
        <div class="inc2-ty" style="--tc:${tc}"><span class="inc2-dot"></span>${_inc2Esc(_inc2TypeLabel(i.type))}</div>
      </td>
      <td><div class="inc2-res">${_inc2Esc(i.residentName || '—')}${i.lieu ? `<span>${_inc2Esc(i.lieu)}</span>` : ''}</div></td>
      <td><span class="inc2-pill" style="--pc:${gc}">${_inc2Esc(_inc2GravLabel(i.gravite))}</span></td>
      <td>${eg
        ? `<span class="inc2-eig" style="--pc:${eg.c}">${_inc2Svg(eg.ic, 2.4)}${_inc2Esc(eg.l)}</span>`
        : `<span class="inc2-eig" style="--pc:#8095b4">${_inc2Svg(INC2_IC.x, 2.4)}Non</span>`}</td>
      <td><span class="inc2-pill" style="--pc:${st.c}">${_inc2Esc(st.l)}</span></td>
      <td>
        <div class="inc2-acts">
          <button type="button" class="inc2-act" style="--ac:#818cf8" title="Détails" aria-label="Détails" onclick="viewIncident('${i.id}')">${_inc2Svg(INC2_IC.eye)}</button>
          ${canValidate ? `<button type="button" class="inc2-act inc2-act-l" style="--ac:#f59e0b" onclick="openValidation('${i.id}')">${_inc2Svg(INC2_IC.pen)}Traiter</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<div class="inc2-tw"><div class="inc2-scroll"><table class="inc2-t">
    <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${corps}</tbody>
  </table></div></div>`;
}

// ── PANNEAU : RÉPARTITION PAR TYPE ────────────────────────────────────
function inc2ParType(all) {
  const cpt = {};
  all.forEach(i => { const k = i.type || 'autre'; cpt[k] = (cpt[k] || 0) + 1; });
  const entries = Object.keys(cpt).map(k => ({ k, n: cpt[k] })).sort((a, b) => b.n - a.n);
  if (!entries.length) return '<div class="v2-blk-vide">Aucun incident enregistré.</div>';
  const max = entries[0].n || 1;

  return `<div class="inc2-bars">${entries.map(e => `<div>
    <div class="inc2-bar-h"><span class="inc2-bar-l">${_inc2Esc(_inc2TypeLabel(e.k))}</span><span class="inc2-bar-n">${e.n}</span></div>
    <div class="inc2-prog"><span style="width:${Math.round(e.n / max * 100)}%;background:${INC2_TC[e.k] || INC2_TC.autre}"></span></div>
  </div>`).join('')}</div>`;
}

// ── PANNEAU : SUIVI DES EIG ───────────────────────────────────────────
function inc2EigSuivi(all) {
  const eigs = all.filter(i => i.eig && i.eig.declarable)
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .slice(0, 6);
  if (!eigs.length) {
    return '<div class="inc2-ars-vide">Aucun incident qualifié d\'événement indésirable grave. Ouvrez une fiche d\'incident pour le marquer comme EIG.</div>';
  }
  return eigs.map(i => {
    const eg = _inc2Eig(i);
    const num = i.eig && i.eig.numeroSignalement ? ` · n° ${i.eig.numeroSignalement}` : '';
    const sub = `${_inc2TypeLabel(i.type)} · ${_inc2Court(i.date)}${num}`;
    return `<div class="inc2-ars-r" style="--pc:${eg.c}">
      <span class="inc2-ars-i">${_inc2Svg(eg.ic, 2.4)}</span>
      <div style="flex:1;min-width:0">
        <div class="inc2-ars-n">${_inc2Esc(i.titre)}</div>
        <div class="inc2-ars-s">${_inc2Esc(sub)}</div>
      </div>
      <span class="inc2-ars-tag">${_inc2Esc(eg.l)}</span>
    </div>`;
  }).join('');
}

// ── FORMULAIRE : GRAVITÉ SEGMENTÉE ────────────────────────────────────
function incSetGravite(v) {
  const h = document.getElementById('fGravite');
  if (h) h.value = v;
  document.querySelectorAll('#fGraviteSeg .v2-seg-o').forEach(b => {
    b.classList.toggle('on', b.dataset.v === v);
  });
}
function inc2SyncForm() {
  const h = document.getElementById('fGravite');
  incSetGravite((h && h.value) || 'leger');
}

// ── MODALE DÉTAIL (remplace celle de js/incidents.js) ─────────────────
function viewIncident(id) {
  const liste = (typeof getIncidents === 'function') ? getIncidents() : [];
  const i = liste.find(x => x.id === id);
  if (!i) return;
  _currentIncidentId = id;

  const btnPrint = document.getElementById('btnPrintIncident');
  if (btnPrint) btnPrint.style.display = '';

  const session = Auth.getSession();
  const isAdmin = !!(session && (session.role === 'admin' || session.role === 'moderator'
    || (typeof canViewAllIncidents === 'function' && canViewAllIncidents(session.userId))));
  const peutTraiter = !!(session && (session.role === 'admin' || session.role === 'moderator'
    || (typeof canValidateIncidents === 'function' && canValidateIncidents(session.userId))));
  const canValidate = peutTraiter && (i.statut === 'declare' || i.statut === 'cours');

  const gc = INC2_GC[i.gravite] || '#8095b4';
  const st = INC2_ST[i.statut] || { l: _inc2StatLabel(i.statut), c: '#8095b4' };
  const eg = _inc2Eig(i);

  const fait = (k, v) => `<div class="inc2-fact"><div class="inc2-fact-k">${k}</div><div class="inc2-fact-v">${v}</div></div>`;
  const fdate = (d) => (typeof formatDate === 'function' && d) ? formatDate(d) : (d || '—');
  const fdt   = (d) => (typeof formatDateTime === 'function' && d) ? formatDateTime(d) : (d || '—');

  document.getElementById('detailTitle').textContent = i.titre || 'Détail de l\'incident';
  document.getElementById('detailBody').innerHTML = `
    <div class="inc2-badges">
      <span class="inc2-pill" style="--pc:${gc}">${_inc2Esc(_inc2GravLabel(i.gravite))}</span>
      <span class="inc2-pill" style="--pc:${st.c}">${_inc2Esc(st.l)}</span>
      <span class="inc2-pill" style="--pc:${INC2_TC[i.type] || INC2_TC.autre}">${_inc2Esc(_inc2TypeLabel(i.type))}</span>
    </div>

    <div class="inc2-facts">
      ${fait('Date', _inc2Esc(fdate(i.date)))}
      ${fait('Heure', _inc2Esc(i.heure ? String(i.heure).slice(0, 5) : '—'))}
      ${fait('Résident', _inc2Esc(i.residentName || '—'))}
      ${fait('Lieu', _inc2Esc(i.lieu || '—'))}
      ${fait('Déclaré par', _inc2Esc(i.declaredBy || '—'))}
      ${fait('Déclaré le', _inc2Esc(i.declaredAt ? fdt(i.declaredAt) : '—'))}
      ${i.etabNom ? fait('Établissement', _inc2Esc(i.etabNom)) : ''}
      ${i.validatedBy ? fait('Traité par', _inc2Esc(i.validatedBy) + (i.validatedAt ? ' · ' + _inc2Esc(fdt(i.validatedAt)) : '')) : ''}
    </div>

    <div class="inc2-sep"></div>
    <div class="inc2-lbl">Description</div>
    <div class="inc2-txt">${_inc2Esc(i.description || '—')}</div>

    ${i.notes ? `<div class="inc2-lbl">Notes de traitement</div><div class="inc2-txt">${_inc2Esc(i.notes)}</div>` : ''}

    <div class="inc2-eig-blk">
      ${_inc2Svg(INC2_IC.alert)}
      <span class="inc2-eig-t">Événement indésirable grave (ARS)</span>
      <span class="inc2-pill" style="--pc:${eg ? eg.c : '#8095b4'}">${eg ? _inc2Esc(eg.l) : 'Non déclarable'}</span>
      ${peutTraiter || isAdmin ? `
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="inc2-mini" onclick="toggleEigDeclarable('${i.id}')">${eg ? 'Retirer du registre EIG' : 'Marquer comme EIG'}</button>
          ${eg ? `<a class="inc2-mini" href="eig.html">Gérer la déclaration →</a>` : ''}
        </div>` : ''}
    </div>
  `;

  document.getElementById('detailFooter').innerHTML = `
    <button type="button" class="inc2-mini inc2-md-f-l" id="btnPrintIncident" onclick="printSingleIncident()">
      ${_inc2Svg(INC2_IC.print)}Imprimer
    </button>
    <button type="button" class="v2-btn-sec" onclick="closeModal('modalDetail')">Fermer</button>
    ${canValidate ? `<button type="button" class="v2-btn-pri" onclick="closeModal('modalDetail');openValidation('${i.id}')">${_inc2Svg(INC2_IC.pen)}Traiter</button>` : ''}
  `;
  openModal('modalDetail');
}

// ── MODALE TRAITEMENT (remplace celle de js/incidents.js) ─────────────
function openValidation(id) {
  const liste = (typeof getIncidents === 'function') ? getIncidents() : [];
  const i = liste.find(x => x.id === id);
  if (!i) return;
  closeModal('modalDetail');

  document.getElementById('detailTitle').textContent = `Traiter : ${i.titre || ''}`;
  document.getElementById('detailBody').innerHTML = `
    <div class="inc2-txt">Faites évoluer le statut de cet incident et consignez les suites données.</div>
    <div>
      <label class="v2-fld-l" for="vStatut">Nouveau statut</label>
      <select id="vStatut" class="v2-fld">
        <option value="cours"  ${i.statut === 'cours'  ? 'selected' : ''}>En cours</option>
        <option value="valide" ${i.statut === 'valide' ? 'selected' : ''}>Validé</option>
        <option value="classe" ${i.statut === 'classe' ? 'selected' : ''}>Classé</option>
      </select>
    </div>
    <div>
      <label class="v2-fld-l" for="vNotes">Notes de traitement</label>
      <textarea id="vNotes" class="v2-fld" rows="3" placeholder="Mesures prises, personnes informées, suites…">${_inc2Esc(i.notes || '')}</textarea>
    </div>
    <div class="v2-note v2-note-ok">
      ${_inc2Svg(INC2_IC.check)}
      Votre nom et la date du traitement sont enregistrés automatiquement.
    </div>
  `;
  document.getElementById('detailFooter').innerHTML = `
    <button type="button" class="v2-btn-sec" onclick="viewIncident('${id}')">Annuler</button>
    <button type="button" class="v2-btn-pri" onclick="validateIncident('${id}')">
      ${_inc2Svg(INC2_IC.check)}Enregistrer
    </button>
  `;
  openModal('modalDetail');
}

// ── Publication explicite (un `const`/`function` de script ne suffit pas
//    pour la navigation en iframe ni pour certains onclick tardifs) ────
window.IncidentsV2   = { render: inc2Render, syncForm: inc2SyncForm };
window.incSetGravite = incSetGravite;
window.viewIncident  = viewIncident;
window.openValidation = openValidation;

document.addEventListener('DOMContentLoaded', inc2SyncForm);
