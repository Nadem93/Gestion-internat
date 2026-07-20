// ── TRANSMISSIONS — DESIGN V2 (passation d'équipe) ──
// Reproduit « Transmissions - refonte (bento) » : navigation de date, filtres
// par catégorie + statistiques, tableau des trois vacations, synthèse du jour,
// consignes permanentes et historique des jours précédents.
// Les actions (lecture, réponse, édition, suppression, incident, journal)
// restent celles de js/transmissions.js.

// Palette de la maquette (celle de TR_CATS est calibrée pour le thème clair).
const TV2_CATS = {
  sante:         { l: 'Santé',           c: '#22d3ee' },
  medicament:    { l: 'Médicament',      c: '#ec4899' },
  comportement:  { l: 'Comportement',    c: '#818cf8' },
  alimentation:  { l: 'Alimentation',    c: '#ea580c' },
  hygiene:       { l: 'Hygiène',         c: '#0ea5e9' },
  activite:      { l: 'Activité',        c: '#10b981' },
  famille:       { l: 'Famille',         c: '#10b981' },
  sortie:        { l: 'Sortie / Retour', c: '#0ea5e9' },
  administratif: { l: 'Administratif',   c: '#94a3b8' },
  maintenance:   { l: 'Maintenance',     c: '#f59e0b' },
  urgent:        { l: 'Urgent',          c: '#ef4444' }
};
const TV2_PRI = {
  info:   { l: 'Information', c: '#64748b' },
  normal: { l: 'Normal',      c: '#22d3ee' },
  urgent: { l: 'Urgent',      c: '#ef4444' }
};
const TV2_COLS = [
  { id: 'matin', name: 'Matin',      hours: '07h – 15h', c: '#f59e0b',
    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  { id: 'aprem', name: 'Après-midi', hours: '15h – 22h', c: '#0ea5e9',
    icon: '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/><path d="M17 18a5 5 0 0 0-10 0"/>' },
  { id: 'nuit', name: 'Nuit',        hours: '22h – 07h', c: '#818cf8',
    icon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>' }
];

let _tv2Consignes = [];

function _tv2Cat(id) { return TV2_CATS[id] || { l: id || '—', c: '#64748b' }; }
function _tv2Svg(d, w) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }

// ── BARRE DE FILTRES + STATISTIQUES ──────────────────────────────────

function tv2RenderFilters(jour, userId) {
  const bar = document.getElementById('trFilters');
  if (!bar) return;
  const presentes = [...new Set(jour.map(t => t.cat))];
  const defs = [{ id: '', l: 'Toutes', c: '#818cf8' }]
    .concat(presentes.map(k => ({ id: k, l: _tv2Cat(k).l, c: _tv2Cat(k).c })));

  bar.innerHTML = defs.map(f => `<button type="button" class="v2-chip-f${_trFilterCat === f.id ? ' on' : ''}" onclick="tv2SetCat('${f.id}')">
      <span class="dot" style="background:${f.c}"></span>${escHtml(f.l)}
    </button>`).join('');

  const urgent = jour.filter(t => t.priority === 'urgent' || t.cat === 'urgent').length;
  const nonLu  = jour.filter(t => !_trIsRead(t, userId)).length;
  const stats = document.getElementById('trStats');
  if (stats) stats.innerHTML = `
    <span class="v2-stat"><span class="dot" style="background:#ef4444"></span><b>${urgent}</b> urgentes</span>
    <span class="v2-stat"><span class="dot" style="background:#f59e0b"></span><b>${nonLu}</b> non lues</span>
    <span class="v2-stat"><span class="dot" style="background:#10b981"></span><b>${jour.length}</b> au total</span>`;
}

function tv2SetCat(c) { _trFilterCat = c; _renderTransmissions(); }

// ── CARTE ────────────────────────────────────────────────────────────

function tv2Card(t, residents, userId) {
  const r = residents.find(x => String(x.id) === String(t.residentId));
  const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : (t.residentName || 'Collectif');
  const col = safeColor(r && r.color, '#64748b');
  const ini = nom.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FT';
  const cat = _tv2Cat(t.cat);
  const pri = TV2_PRI[t.priority] || TV2_PRI.normal;
  const lu  = _trIsRead(t, userId);
  const urgent = t.priority === 'urgent' || t.cat === 'urgent';
  const heure = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const accent = urgent ? '#ef4444' : (!lu ? '#f59e0b' : 'transparent');
  const reps = t.replies || [];
  const moi = String(t.authorId) === String(userId);
  const admin = (Auth.getSession() || {}).role === 'admin';

  const av = (r && r.photo)
    ? `<div class="v2-tr-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="v2-tr-av" style="background:${col}">${escHtml(ini)}</div>`;

  return `<article class="v2-tr" style="--ac:${accent}" id="tr-${t.id}">
    <div style="display:flex;align-items:flex-start;gap:11px;margin-bottom:11px">
      ${av}
      <div style="min-width:0;flex:1">
        <div class="v2-tr-n">${escHtml(nom)}</div>
        <div class="v2-tr-r">${r && r.chambre ? 'Ch. ' + escHtml(r.chambre) : '—'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        ${!lu ? '<span style="width:8px;height:8px;border-radius:50%;background:#ef4444"></span>' : ''}
        <span class="v2-tr-t">${escHtml(heure)}</span>
      </div>
    </div>

    <div class="v2-tr-b">${escHtml(t.content || '')}</div>

    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <span class="v2-tr-tag" style="--pc:${cat.c}"><span class="dot"></span>${escHtml(cat.l)}</span>
      <span class="v2-tr-tag" style="--pc:${pri.c}">${escHtml(pri.l)}</span>
      ${t.soutienNiveau ? `<span class="v2-tr-tag" style="--pc:#8b5cf6">${escHtml(t.soutienNiveau)}</span>` : ''}
    </div>

    ${reps.length ? `<div class="v2-tr-rep">${reps.map(rp => `
      <div class="v2-tr-rep-i">
        <div style="font-size:11.5px;color:var(--v2-t3);line-height:1.5">${escHtml(rp.text || rp.content || '')}</div>
        <div style="font-size:10px;color:var(--v2-t7);margin-top:4px">${escHtml(rp.author || rp.by || '')}</div>
      </div>`).join('')}</div>` : ''}

    ${_trOpenReplyId === t.id ? `<div style="margin-bottom:10px">
      <textarea class="v2-fld" id="trReplyInput_${t.id}" rows="2" placeholder="Répondre…" style="font-size:12px;min-height:56px"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="v2-btn-pri" style="height:34px;font-size:12.5px;flex:0 0 auto;padding:0 14px" onclick="addTrReply('${t.id}')">Envoyer</button>
        <button type="button" class="v2-btn-sec" style="height:34px;font-size:12.5px;flex:0 0 auto;padding:0 14px" onclick="toggleTrReply('${t.id}')">Annuler</button>
      </div>
    </div>` : ''}

    <div class="v2-tr-f">
      <span class="v2-tr-a">${escHtml(t.authorName || '')}</span>
      <button type="button" class="v2-tr-act" onclick="toggleTrReply('${t.id}')" title="Répondre">
        ${_tv2Svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>')}${reps.length}
      </button>
      ${!lu ? `<button type="button" class="v2-tr-act" onclick="markTrRead('${t.id}')" title="Marquer comme lu">${_tv2Svg('<path d="M20 6L9 17l-5-5"/>', 2.4)}</button>` : ''}
      ${moi ? `<button type="button" class="v2-tr-act" onclick="editTr('${t.id}')" title="Modifier">${_tv2Svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>')}</button>` : ''}
      ${(moi || admin) ? `<button type="button" class="v2-tr-act" onclick="deleteTr('${t.id}')" title="Supprimer" style="color:var(--v2-danger-text)">${_tv2Svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>')}</button>` : ''}
      ${urgent && typeof declarerEnIncident === 'function' ? `<button type="button" class="v2-tr-act" onclick="declarerEnIncident('${t.id}')" title="Déclarer en incident" style="color:var(--v2-warn)">${_tv2Svg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>')}</button>` : ''}
    </div>
  </article>`;
}

// ── TABLEAU DES TROIS VACATIONS ──────────────────────────────────────

function tv2RenderBoard(list, residents, userId) {
  const board = document.getElementById('trList');
  if (!board) return;
  board.className = 'v2-board';
  board.innerHTML = TV2_COLS.map(col => {
    const cartes = list.filter(t => t.shift === col.id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return `<section class="v2-col" style="--cc:${col.c}">
      <div class="v2-col-h">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="v2-col-ico">${_tv2Svg(col.icon)}</span>
          <div style="line-height:1.2">
            <div class="v2-col-n">${col.name}</div>
            <div class="v2-col-hr">${col.hours}</div>
          </div>
          <span class="v2-col-c">${cartes.length}</span>
        </div>
        <div class="v2-col-bar"></div>
      </div>
      <div class="v2-col-b">
        ${cartes.map(t => tv2Card(t, residents, userId)).join('')}
        <button type="button" class="v2-col-add" onclick="tv2Nouvelle('${col.id}')">
          ${_tv2Svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 2.2)}Ajouter — ${col.name}
        </button>
      </div>
    </section>`;
  }).join('');
}

// La vacation est déduite de la colonne cliquée (la maquette ne la redemande pas).
function tv2Nouvelle(shift) {
  resetTrModal();
  const s = document.getElementById('trShift');
  if (s) s.value = shift || _tv2ShiftCourant();
  openModal('modalTr');
}

function _tv2ShiftCourant() {
  const h = new Date().getHours();
  return (h >= 7 && h < 15) ? 'matin' : (h >= 15 && h < 22) ? 'aprem' : 'nuit';
}

// ── SYNTHÈSE DU JOUR ─────────────────────────────────────────────────

function tv2RenderSynthese(jour) {
  const el = document.getElementById('trSynthese');
  if (!el) return;
  const n = {};
  jour.forEach(t => { n[t.cat] = (n[t.cat] || 0) + 1; });
  const cles = Object.keys(n).sort((a, b) => n[b] - n[a]);
  const max = Math.max(1, ...Object.values(n));

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:18px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span class="v2-blk-t">Synthèse du jour — par catégorie</span>
      <span style="margin-left:auto;font-size:12px;color:var(--v2-t7)">${jour.length} transmission${jour.length > 1 ? 's' : ''}</span>
    </div>
    ${cles.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 24px">${cles.map(k => {
      const c = _tv2Cat(k);
      return `<div>
        <div style="display:flex;align-items:baseline;margin-bottom:6px">
          <span style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--v2-t3)">
            <span style="width:8px;height:8px;border-radius:50%;background:${c.c}"></span>${escHtml(c.l)}</span>
          <span style="margin-left:auto;font-size:11.5px;font-weight:700;color:#fff">${n[k]}</span>
        </div>
        <div class="v2-prog"><span style="width:${Math.round(n[k] / max * 100)}%;background:${c.c}"></span></div>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucune transmission ce jour.</div>'}`;
}

// ── CONSIGNES PERMANENTES (nouveauté de la maquette) ─────────────────

const TV2_CONS_ICO = {
  soin:       '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/>',
  securite:   '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  direction:  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/>',
  autre:      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
};
const TV2_CONS_COL = { soin: '#ec4899', securite: '#f59e0b', direction: '#ef4444', autre: '#818cf8' };

function tv2RenderConsignes() {
  const el = document.getElementById('trConsignes');
  if (!el) return;
  const admin = typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin();
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:16px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
      <span class="v2-blk-t" style="color:var(--v2-warn-text)">Consignes permanentes</span>
      ${admin ? `<button type="button" class="v2-tr-act" style="margin-left:auto;color:var(--v2-warn-text)" onclick="tv2OuvrirConsigne()" title="Ajouter une consigne">
        ${_tv2Svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 2.4)}Ajouter</button>` : ''}
    </div>
    ${_tv2Consignes.length ? `<div style="display:flex;flex-direction:column;gap:12px">${
      _tv2Consignes.map(c => {
        const col = TV2_CONS_COL[c.categorie] || TV2_CONS_COL.autre;
        return `<div class="v2-cons-i">
          <span class="v2-cons-ico" style="--pc:${col}">${_tv2Svg(TV2_CONS_ICO[c.categorie] || TV2_CONS_ICO.autre, 2.2)}</span>
          <div style="min-width:0;flex:1">
            <div style="font-size:12px;color:var(--v2-t2);line-height:1.45">${escHtml(c.texte || '')}</div>
            <div style="font-size:10.5px;color:var(--v2-t6);margin-top:3px">${escHtml(c.auteur || '')}</div>
          </div>
          ${admin ? `<button type="button" class="v2-tr-act" onclick="tv2SupprimerConsigne('${c.id}')" title="Retirer" style="color:var(--v2-danger-text)">${_tv2Svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')}</button>` : ''}
        </div>`;
      }).join('')}</div>`
      : `<div class="v2-blk-vide">Aucune consigne permanente${admin ? ' — cliquez sur « Ajouter »' : ''}.</div>`}`;
}

// ── JOURS PRÉCÉDENTS ─────────────────────────────────────────────────

function tv2RenderHisto() {
  const el = document.getElementById('trHisto');
  if (!el) return;
  const parJour = {};
  getTr().filter(t => t.date && t.date !== _trCurrentDate).forEach(t => {
    (parJour[t.date] = parJour[t.date] || []).push(t);
  });
  const jours = Object.keys(parJour).sort((a, b) => b.localeCompare(a)).slice(0, 8);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:16px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
      <span class="v2-blk-t">Jours précédents</span>
    </div>
    ${jours.length ? jours.map(d => {
      const l = parJour[d];
      const m = l.filter(t => t.shift === 'matin').length;
      const a = l.filter(t => t.shift === 'aprem').length;
      const nn = l.filter(t => t.shift === 'nuit').length;
      const urg = l.filter(t => t.priority === 'urgent' || t.cat === 'urgent').length;
      const lbl = new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      return `<div class="v2-histo-r" onclick="tv2AllerAu('${d}')">
        <div class="v2-histo-d">${escHtml(lbl)}</div>
        <div style="display:flex;gap:8px;flex:1;flex-wrap:wrap">
          <span class="v2-histo-p" style="background:rgba(245,158,11,.14)">Matin ${m}</span>
          <span class="v2-histo-p" style="background:rgba(14,165,233,.14)">A-m. ${a}</span>
          <span class="v2-histo-p" style="background:rgba(129,140,248,.14)">Nuit ${nn}</span>
        </div>
        ${urg ? `<span style="font-size:10.5px;font-weight:700;color:var(--v2-danger-text);background:rgba(239,68,68,.16);padding:3px 9px;border-radius:7px">${urg} urgent${urg > 1 ? 'es' : 'e'}</span>` : ''}
        <span style="font-size:12px;font-weight:700;color:#fff;width:78px;text-align:right">${l.length} transm.</span>
        <svg style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="#6f86ab" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
    }).join('') : '<div class="v2-blk-vide">Aucune transmission dans l\'historique.</div>'}`;
}

function tv2AllerAu(d) {
  _trCurrentDate = d;
  _renderTrDateNav();
  _renderTransmissions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── MODALE « CONSIGNE PERMANENTE » (gabarit .v2-md) ──────────────────

function tv2OuvrirConsigne() {
  document.getElementById('consTexte').value = '';
  tv2SetConsCat('soin');
  openModal('modalConsigne');
}

function tv2SetConsCat(v) {
  const inp = document.getElementById('consCat');
  if (inp) inp.value = v;
  document.querySelectorAll('#consCatSeg .v2-seg-o').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  const md = document.querySelector('#modalConsigne .v2-md');
  if (md) md.style.setProperty('--mc', TV2_CONS_COL[v] || '#f59e0b');
}

async function tv2SaveConsigne() {
  const texte = (document.getElementById('consTexte').value || '').trim();
  if (!texte) { toast('Le texte de la consigne est obligatoire', 'error'); return; }
  const s = Auth.getSession() || {};
  try {
    const c = await sbSaveConsigne({
      texte, categorie: document.getElementById('consCat').value || 'autre',
      auteur: (document.getElementById('consAuteur').value || '').trim(),
      createdBy: s.userId
    });
    _tv2Consignes.unshift(c);
    closeModal('modalConsigne');
    tv2RenderConsignes();
    toast('Consigne ajoutée', 'success');
  } catch (e) {
    console.error('[consignes] enregistrement', e);
    toast('Enregistrement impossible — exécutez migration-consignes.sql', 'error');
  }
}

function tv2SupprimerConsigne(id) {
  confirmDialog('Retirer définitivement cette consigne permanente ?', async () => {
    try {
      await sbDeleteConsigne(id);
      _tv2Consignes = _tv2Consignes.filter(c => String(c.id) !== String(id));
      tv2RenderConsignes();
      toast('Consigne retirée', 'info');
    } catch (e) { console.error(e); toast('Suppression impossible', 'error'); }
  });
}

// Chargement initial, déclenché après initTransmissions().
async function tv2ChargerConsignes() {
  if (typeof sbGetConsignes !== 'function') return;
  _tv2Consignes = await sbGetConsignes();
  tv2RenderConsignes();
}
