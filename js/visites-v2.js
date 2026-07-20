// ── VISITES & FAMILLE — DESIGN V2 ─────────────────────────────────────
// Reproduit la maquette « Visites & famille (vie quotidienne) » :
// 4 tuiles KPI, chips de type, liste de visites + rail (droits de visite /
// créneaux du jour), puis le registre des visiteurs.
// Les données et toutes les actions restent celles de js/visites.js.

let VIS2_FILTRE = 'all';   // chip de type actif

const VIS2_IC = {
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  usersP: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  home:   '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  phone:  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  clock:  '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/>',
  cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
};

// Palette et libellés courts de la maquette (VIS_TYPES reste la source métier)
const VIS2_TY = {
  libre:       { l: 'Visite libre', c: '#a3e635', ic: VIS2_IC.users },
  mediatisee:  { l: 'Médiatisée',   c: '#f59e0b', ic: VIS2_IC.shield },
  hebergement: { l: 'Hébergement',  c: '#22d3ee', ic: VIS2_IC.home },
  telephone:   { l: 'Appel',        c: '#818cf8', ic: VIS2_IC.phone }
};
const VIS2_ST = {
  prevue:   { l: 'À venir',      c: '#818cf8' },
  realisee: { l: 'Effectuée',    c: '#10b981' },
  annulee:  { l: 'Annulée',      c: '#8095b4' },
  absent:   { l: 'Non présenté', c: '#ef4444' }
};

function _vis2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function _vis2Ty(v) { return VIS2_TY[v.type] || VIS2_TY.libre; }
function _vis2St(v) { return VIS2_ST[v.statut] || VIS2_ST.prevue; }
function _vis2CanEdit() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  return (typeof canEditResidents === 'function') ? canEditResidents(s?.userId) : Auth.isAdmin();
}
// « Sam. 26 » comme dans la maquette, « Auj. » / « Hier » pour les dates proches
function _vis2Jour(d) {
  if (!d) return '—';
  const td = today();
  if (d === td) return 'Auj.';
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d === y) return 'Hier';
  const dt = new Date(d + 'T12:00:00');
  if (isNaN(dt)) return d;
  const j = dt.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
  return `${j.charAt(0).toUpperCase()}${j.slice(1)}. ${dt.getDate()}`;
}

// ── RENDU PRINCIPAL ───────────────────────────────────────────────────
function vis2Render() {
  const all = (typeof getVisites === 'function') ? getVisites() : [];
  const td = today();
  const fRes = document.getElementById('vFilterResident')?.value || '';

  // Le select de type hérité est piloté par les chips : on garde le contrat.
  const selType = document.getElementById('vFilterType');
  if (selType && selType.value !== (VIS2_FILTRE === 'all' ? '' : VIS2_FILTRE)) {
    selType.value = VIS2_FILTRE === 'all' ? '' : VIS2_FILTRE;
  }

  let base = all;
  if (fRes) base = base.filter(v => String(v.residentId) === String(fRes));
  const list = VIS2_FILTRE === 'all' ? base : base.filter(v => v.type === VIS2_FILTRE);

  vis2Stats(base, td);
  vis2Chips(base);
  vis2List(list, td);
  vis2Droits();
  vis2Creneaux(all, td);
  vis2Registre(all, td);
}

// ── KPI ───────────────────────────────────────────────────────────────
function vis2Stats(list, td) {
  const box = document.getElementById('vStats');
  if (!box) return;
  const avenir = list.filter(v => v.statut === 'prevue' && (v.date || '') >= td);
  const auj = list.filter(v => v.date === td && v.statut === 'prevue');
  const med = list.filter(v => v.type === 'mediatisee' && v.statut === 'prevue' && (v.date || '') >= td);
  const heb = list.filter(v => v.type === 'hebergement' && v.statut === 'prevue'
    && (v.date || '') <= td && (v.dateRetour || v.date || '') >= td);
  const cells = [
    { n: avenir.length, l: 'Visites à venir', c: '#a3e635', ic: VIS2_IC.users },
    { n: auj.length,    l: "Aujourd'hui",     c: '#22d3ee', ic: VIS2_IC.usersP },
    { n: med.length,    l: 'Médiatisées',     c: '#f59e0b', ic: VIS2_IC.shield },
    { n: heb.length,    l: 'Hébergements en cours', c: '#818cf8', ic: VIS2_IC.home }
  ];
  box.innerHTML = cells.map(s => `<div class="vs2-kpi" style="--pc:${s.c}">
      <span class="vs2-kpi-ico">${_vis2Svg(s.ic)}</span>
      <div><div class="vs2-kpi-n">${s.n}</div><div class="vs2-kpi-l">${s.l}</div></div>
    </div>`).join('');
}

// ── Chips de type ─────────────────────────────────────────────────────
function vis2Chips(base) {
  const box = document.getElementById('vChips');
  if (!box) return;
  const counts = {};
  base.forEach(v => { counts[v.type] = (counts[v.type] || 0) + 1; });
  const defs = [{ id: 'all', label: 'Toutes', dot: '#818cf8', n: base.length }]
    .concat(Object.keys(VIS2_TY).map(k => ({ id: k, label: VIS2_TY[k].l, dot: VIS2_TY[k].c, n: counts[k] || 0 })));
  box.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${VIS2_FILTRE === f.id ? ' on' : ''}" onclick="vis2SetFiltre('${f.id}')">
      <span class="dot" style="background:${f.dot}"></span>${f.label}<span class="n">${f.n}</span>
    </button>`).join('');
}
function vis2SetFiltre(id) {
  VIS2_FILTRE = id;
  const sel = document.getElementById('vFilterType');
  if (sel) sel.value = id === 'all' ? '' : id;
  vis2Render();
}

// ── Liste des visites ─────────────────────────────────────────────────
function vis2List(list, td) {
  const el = document.getElementById('vList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="vs2-vide">
      <div class="vs2-vide-t">Aucune visite</div>
      <div class="vs2-vide-s">Planifiez les visites et hébergements famille des résidents.</div>
    </div>`;
    return;
  }
  const avenir = list.filter(v => v.statut === 'prevue' && (v.date || '') >= td)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.heure || '').localeCompare(b.heure || ''));
  const passees = list.filter(v => !(v.statut === 'prevue' && (v.date || '') >= td))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  el.innerHTML = avenir.concat(passees.slice(0, 40)).map(vis2Card).join('');
}

function vis2Card(v) {
  const t = _vis2Ty(v), st = _vis2St(v);
  const retard = v.type === 'hebergement' && v.statut === 'prevue' && v.dateRetour && v.dateRetour < today();
  const canEdit = _vis2CanEdit();
  const meta = [v.lieu ? escHtml(v.lieu) : '', v.notes ? escHtml(v.notes) : ''].filter(Boolean).join(' · ');
  const retour = v.type === 'hebergement' && v.dateRetour
    ? `retour ${formatDate(v.dateRetour)}${v.heureRetour ? ' à ' + v.heureRetour : ''}` : '';
  return `<div class="vs2-card" style="--pc:${t.c};--sc:${st.c}">
    <div class="vs2-card-in">
      <span class="vs2-ico">${_vis2Svg(t.ic)}</span>
      <div class="vs2-main">
        <div class="vs2-head">
          <a class="vs2-nom" href="resident.html?id=${encodeURIComponent(v.residentId)}">${escHtml(v.residentName || '—')}</a>
          <span class="vs2-tag">${t.l}</span>
          ${retard ? '<span class="vs2-tag" style="--tc:#ef4444">Retour dépassé</span>' : ''}
        </div>
        <div class="vs2-vis">${escHtml(v.personne || '?')}${v.lien ? ` <span class="lien">· ${escHtml(v.lien)}</span>` : ''}</div>
        ${meta ? `<div class="vs2-note">${meta}</div>` : ''}
      </div>
      <div class="vs2-right">
        <div class="vs2-date">${_vis2Jour(v.date)}</div>
        <div class="vs2-time">${v.heure || '—'}</div>
        ${retour ? `<div class="vs2-time">${retour}</div>` : ''}
        <div class="vs2-foot">
        <span class="vs2-st">${st.l}</span>
        ${canEdit ? `<div class="vs2-acts no-print">
          ${v.statut === 'prevue' ? `
            <button type="button" class="vs2-act ok" title="Marquer réalisée" onclick="setVisiteStatut('${v.id}','realisee')">✓</button>
            <button type="button" class="vs2-act warn" title="Non présenté" onclick="setVisiteStatut('${v.id}','absent')">∅</button>
            <button type="button" class="vs2-act" title="Annuler" onclick="setVisiteStatut('${v.id}','annulee')">⊘</button>` : ''}
          <button type="button" class="vs2-act" title="Modifier" onclick="openVisiteModal('${v.id}')">✎</button>
          <button type="button" class="vs2-act danger" title="Supprimer" onclick="deleteVisite('${v.id}')">✕</button>
        </div>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

// ── Rail : droits de visite (cadre stocké sur la fiche résident) ──────
function vis2Droits() {
  const box = document.getElementById('vDroits');
  if (!box) return;
  const res = (typeof visResidents === 'function') ? visResidents() : [];
  const rows = [];
  res.forEach(r => (r.droitsVisite || []).forEach(d => rows.push({ r, d })));
  if (!rows.length) {
    box.innerHTML = '<div class="v2-blk-vide">Aucun cadre de visite renseigné. Utilisez « Droits de visite ».</div>';
    return;
  }
  box.innerHTML = rows.slice(0, 8).map(({ r, d }) => {
    const t = VIS2_TY[d.type] || VIS2_TY.libre;
    const nom = `${r.prenom || ''} ${r.nom || ''}`.trim();
    return `<div class="vs2-d" style="--pc:${t.c}">
      <div class="vs2-d-h">
        <span class="vs2-d-av" style="background:${safeColor(r.color, '#818cf8')}">${initials(r.prenom, r.nom)}</span>
        <span class="vs2-d-res">${escHtml(nom || '—')}</span>
        <span class="vs2-d-type">${t.l}</span>
      </div>
      <div class="vs2-d-p">${escHtml(d.personne || '')}${d.lien ? ` · ${escHtml(d.lien)}` : ''}</div>
      ${d.modalites ? `<div class="vs2-d-mod">${escHtml(d.modalites)}</div>` : ''}
      ${d.decision ? `<div class="vs2-d-dec">${escHtml(d.decision)}</div>` : ''}
    </div>`;
  }).join('');
}

// ── Rail : créneaux du jour ───────────────────────────────────────────
function vis2Creneaux(all, td) {
  const box = document.getElementById('vCreneaux');
  if (!box) return;
  const jour = all.filter(v => v.date === td && v.statut !== 'annulee')
    .sort((a, b) => (a.heure || '~').localeCompare(b.heure || '~'));
  if (!jour.length) {
    box.innerHTML = '<div class="v2-blk-vide">Aucune visite planifiée aujourd\'hui.</div>';
    return;
  }
  box.innerHTML = jour.map(v => {
    const t = _vis2Ty(v), st = _vis2St(v);
    return `<div class="vs2-cr">
      <span class="vs2-cr-h">${v.heure || '—'}</span>
      <div class="vs2-cr-b"><div class="vs2-cr-t">${escHtml(v.residentName || '—')} <span style="color:${t.c}">(${t.l})</span></div></div>
      <span class="vs2-cr-tag" style="--pc:${st.c}">${st.l}</span>
    </div>`;
  }).join('');
}

// ── Registre des visiteurs ────────────────────────────────────────────
function vis2Registre(all, td) {
  const box = document.getElementById('vRegistre');
  if (!box) return;
  let rows = all.filter(v => v.date === td);
  if (!rows.length) {
    rows = all.filter(v => (v.date || '') < td)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  }
  if (!rows.length) {
    box.innerHTML = '<div class="vs2-reg-vide">Aucune visite enregistrée.</div>';
    return;
  }
  box.innerHTML = `<div class="vs2-reg-w"><table class="v2-table">
    <thead><tr><th>Visiteur</th><th>Résident</th><th>Arrivée</th><th>Retour</th><th>Statut</th></tr></thead>
    <tbody>${rows.map(v => {
      const st = _vis2St(v);
      const sortie = v.type === 'hebergement'
        ? (v.dateRetour ? `${formatDate(v.dateRetour)}${v.heureRetour ? ' ' + v.heureRetour : ''}` : '—')
        : (v.heureRetour || '—');
      return `<tr>
        <td class="n">${escHtml(v.personne || '—')}${v.lien ? ` <span class="m">(${escHtml(v.lien)})</span>` : ''}</td>
        <td class="m">${escHtml(v.residentName || '—')}</td>
        <td>${escHtml(v.heure || '—')}</td>
        <td>${sortie}</td>
        <td><span class="vs2-reg-b" style="--sc:${st.c}">${st.l}</span></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// ── Modale : choix segmenté de type (le <select> reste le contrat JS) ──
function vis2Seg(selectId, value) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.value = value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  vis2SegSync(selectId);
}
function vis2SegSync(selectId) {
  const sel = document.getElementById(selectId);
  const seg = document.querySelector(`[data-seg="${selectId}"]`);
  if (!sel || !seg) return;
  seg.querySelectorAll('.v2-seg-o').forEach(b => b.classList.toggle('on', b.dataset.val === sel.value));
}

// Cadre des droits affiché dans la modale « Nouvelle visite »
function vis2ShowDroits() {
  const rid = document.getElementById('vmResident')?.value;
  const box = document.getElementById('vmDroitsInfo');
  if (!box) return;
  if (!rid) { box.innerHTML = ''; return; }
  const r = residentsList().find(x => String(x.id) === String(rid));
  const droits = (r && r.droitsVisite) || [];
  if (!droits.length) {
    box.innerHTML = `<div class="v2-note v2-note-warn">
      ${_vis2Svg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>')}
      Aucun droit de visite défini pour ce résident — renseignez le cadre via « Droits de visite ».
    </div>`;
    return;
  }
  box.innerHTML = `<div><div class="v2-fld-l">Cadre défini pour ce résident</div>
    <div style="display:flex;flex-wrap:wrap;gap:7px">${droits.map(d => {
      const t = VIS2_TY[d.type] || VIS2_TY.libre;
      return `<button type="button" class="vs2-tag" style="--tc:${t.c};cursor:pointer;border:1px solid color-mix(in srgb,${t.c} 30%,transparent);font-size:11px;padding:5px 10px" title="${escAttr(d.modalites || '')}" onclick="vmUseDroitById('${d.id}')">${escHtml(d.personne || '')}${d.lien ? ' (' + escHtml(d.lien) + ')' : ''}</button>`;
    }).join('')}</div></div>`;
}

// Liste des autorisations dans la modale « Droits de visite »
function vis2DroitsList() {
  droitsResidentId = document.getElementById('drResident')?.value || null;
  const box = document.getElementById('drList');
  if (!box) return;
  if (!droitsResidentId) {
    box.innerHTML = '<div class="v2-blk-vide">Sélectionnez un résident pour gérer son cadre de visites.</div>';
    return;
  }
  const r = residentsList().find(x => String(x.id) === String(droitsResidentId));
  const droits = (r && r.droitsVisite) || [];
  if (!droits.length) { box.innerHTML = '<div class="v2-blk-vide">Aucun droit défini.</div>'; return; }
  box.innerHTML = droits.map(d => {
    const t = VIS2_TY[d.type] || VIS2_TY.libre;
    return `<div class="vs2-d" style="--pc:${t.c}">
      <div class="vs2-d-h">
        <span class="vs2-d-res">${escHtml(d.personne || '')}${d.lien ? ` · ${escHtml(d.lien)}` : ''}</span>
        <span class="vs2-d-type">${t.l}</span>
        <button type="button" class="vs2-act danger" title="Retirer" onclick="deleteDroit('${d.id}')">✕</button>
      </div>
      ${d.modalites ? `<div class="vs2-d-mod">${escHtml(d.modalites)}</div>` : ''}
      ${d.decision ? `<div class="vs2-d-dec">${escHtml(d.decision)}</div>` : ''}
    </div>`;
  }).join('');
}
