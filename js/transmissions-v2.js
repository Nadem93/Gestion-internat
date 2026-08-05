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
let _tv2Uid = null;   // UID d'authentification, pour repérer ses propres consignes

function _tv2Cat(id) { return TV2_CATS[id] || { l: id || '—', c: '#64748b' }; }
function _tv2Svg(d, w) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }
function _tv2SvgN(d, px, w) { return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }

// En-tête « Console Data » (chip + eyebrow mono + titre + zone droite).
function _tv2Head(svgIcon, color, eyebrow, title, right) {
  return `<div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:${color}22;color:${color}">${svgIcon}</span>
      <div style="min-width:0"><div class="dc-eyebrow">${escHtml(eyebrow)}</div><div class="dc-title">${escHtml(title)}</div></div>
    </div>${right || ''}</div>`;
}

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
  if (stats) {
    // Barre segmentée : 3 segments (pastille + libellé + nombre) qui restent
    // toujours sur une ligne, y compris sur mobile (responsive dans le CSS).
    const seg = (c, label, val) => `<div class="tv2-kpiseg" style="--c:${c}">
        <div class="tv2-kpiseg-t"><span class="tv2-kpiseg-dot"></span><span class="tv2-kpiseg-l">${label}</span></div>
        <div class="tv2-kpiseg-v">${val}</div></div>`;
    stats.innerHTML = `<div class="tv2-kpibar">
      ${seg('#ef4444', 'Urgentes', urgent)}
      ${seg('#f59e0b', 'Non lues', nonLu)}
      ${seg('#6366f1', 'Au total', jour.length)}
    </div>`;
  }
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

  const badge = (c, txt, dot) => `<span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44">${dot ? `<span class="d" style="background:${c}"></span>` : ''}${escHtml(txt)}</span>`;

  const av = (r && r.photo)
    ? `<div class="tc-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="tc-av" style="background:${col}">${escHtml(ini)}</div>`;

  return `<article class="tc" style="--tc-c:${accent}" id="tr-${t.id}">
    <div class="tc-head">
      ${av}
      <div style="min-width:0;flex:1">
        <div class="tc-name">${escHtml(nom)}</div>
        <div class="tc-sub">${r && r.chambre ? 'Ch. ' + escHtml(r.chambre) : '—'}</div>
      </div>
      ${!lu ? '<span class="tc-unread"></span>' : ''}
      <span class="tc-time">${escHtml(heure)}</span>
    </div>

    <div class="tc-body">${escHtml(t.content || '')}</div>

    <div class="tc-tags">
      ${badge(cat.c, cat.l, true)}
      ${badge(pri.c, pri.l, false)}
      ${t.soutienNiveau ? badge('#8b5cf6', t.soutienNiveau, false) : ''}
      ${t.aFaire && !t.fait ? `<span class="dc-badge dc-b-amber"><span class="d"></span>⏳ À faire</span>` : ''}
      ${t.aFaire && t.fait ? `<span class="dc-badge dc-b-green"><span class="d"></span>✓ Fait${t.faitPar ? ' — ' + escHtml(t.faitPar) : ''}</span>` : ''}
    </div>

    ${reps.length ? reps.map(rp => `<div class="tc-rep">
      <div style="font-size:11.5px;color:var(--v2-t3);line-height:1.5">${escHtml(rp.text || rp.content || '')}</div>
      <div style="font-size:10px;color:var(--v2-t7);margin-top:4px">${escHtml(rp.author || rp.by || '')}</div>
    </div>`).join('') : ''}

    ${_trOpenReplyId === t.id ? `<div style="margin-bottom:9px">
      <textarea class="v2-fld" id="trReplyInput_${t.id}" rows="2" placeholder="Répondre…" style="font-size:12px;min-height:52px"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="tc-act" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:0 14px;height:32px" onclick="addTrReply('${t.id}')">Envoyer</button>
        <button type="button" class="tc-act" style="border:1px solid var(--v2-b);padding:0 14px;height:32px" onclick="toggleTrReply('${t.id}')">Annuler</button>
      </div>
    </div>` : ''}

    <div class="tc-foot">
      <span class="tc-author">${escHtml(t.authorName || '')}</span>
      <span style="margin-left:auto;display:flex;gap:2px">
        <button type="button" class="tc-act" onclick="toggleTrReply('${t.id}')" title="Répondre">${_tv2SvgN('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>', 15)}${reps.length || ''}</button>
        ${!lu ? `<button type="button" class="tc-act" onclick="markTrRead('${t.id}')" title="Marquer comme lu">${_tv2SvgN('<path d="M20 6L9 17l-5-5"/>', 15, 2.4)}</button>` : ''}
        ${t.aFaire && !t.fait ? `<button type="button" class="tc-act" onclick="tv2MarquerFait('${t.id}')" title="Marquer l'action comme faite" style="color:#10b981">${_tv2SvgN('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', 15, 2.2)}</button>` : ''}
        ${moi ? `<button type="button" class="tc-act" onclick="editTr('${t.id}')" title="Modifier">${_tv2SvgN('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>', 15)}</button>` : ''}
        ${(moi || admin) ? `<button type="button" class="tc-act" onclick="deleteTr('${t.id}')" title="Supprimer" style="color:var(--v2-danger-text)">${_tv2SvgN('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', 15)}</button>` : ''}
        ${urgent && typeof declarerEnIncident === 'function' ? `<button type="button" class="tc-act" onclick="declarerEnIncident('${t.id}')" title="Déclarer en incident" style="color:var(--v2-warn-text)">${_tv2SvgN('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 15)}</button>` : ''}
      </span>
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
    const head = _tv2Head(_tv2SvgN(col.icon, 15), col.c, col.hours, col.name, `<span class="dc-pill dim">${cartes.length}</span>`);
    return `<section class="dc-card tc-col">
      ${head}
      <div class="tc-col-body">
        ${cartes.map(t => tv2Card(t, residents, userId)).join('')}
        <button type="button" class="tc-add" onclick="tv2Nouvelle('${col.id}')">
          ${_tv2SvgN('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 15, 2.2)}Ajouter — ${col.name}
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

  const chart = '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>';
  const right = `<span class="dc-pill dim">${jour.length} transm.</span>`;
  const body = cles.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 22px">${cles.map(k => {
    const c = _tv2Cat(k);
    return `<div>
      <div style="display:flex;align-items:center;margin-bottom:6px">
        <span style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--v2-t3)"><span style="width:8px;height:8px;border-radius:50%;background:${c.c}"></span>${escHtml(c.l)}</span>
        <span class="dc-dl-num" style="margin-left:auto">${n[k]}</span>
      </div>
      <div class="al-prog-bar" style="height:7px"><span style="width:${Math.round(n[k] / max * 100)}%;background:${c.c}"></span></div>
    </div>`;
  }).join('')}</div>` : '<div class="dc-empty" style="padding:4px 0">Aucune transmission ce jour.</div>';
  el.innerHTML = _tv2Head(_tv2SvgN(chart, 15), '#22d3ee', 'Synthèse', 'Par catégorie', right) + `<div class="dc-body">${body}</div>`;
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
  // Tout le personnel peut publier une consigne ; chacun ne retire que la
  // sienne, les administrateurs retirent tout (même règle que le répertoire).
  const admin = typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin();
  const sess = (typeof Auth !== 'undefined' && Auth.getSession && Auth.getSession()) || {};
  const peutEcrire = !!sess.userId && sess.role !== 'famille';
  const shield = '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>';
  const right = peutEcrire ? `<button type="button" class="dc-pill dim" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px" onclick="tv2OuvrirConsigne()">${_tv2SvgN('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 12, 2.4)}Ajouter</button>` : '';
  const body = _tv2Consignes.length ? `<div>${_tv2Consignes.map((c, i) => {
    const col = TV2_CONS_COL[c.categorie] || TV2_CONS_COL.autre;
    return `<div style="display:flex;align-items:flex-start;gap:11px;padding:11px 0${i ? ';border-top:1px solid var(--v2-b-soft)' : ''}">
      <span style="width:30px;height:30px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;background:${col}1f;color:${col}">${_tv2SvgN(TV2_CONS_ICO[c.categorie] || TV2_CONS_ICO.autre, 16, 2.2)}</span>
      <div style="min-width:0;flex:1">
        <div style="font-size:12.5px;color:var(--v2-t3);line-height:1.45">${escHtml(c.texte || '')}</div>
        <div style="font-size:10.5px;color:var(--v2-t7);margin-top:3px">${escHtml(c.auteur || '')}</div>
      </div>
      ${(admin || (peutEcrire && c.createdBy && c.createdBy === _tv2Uid)) ? `<button type="button" class="tc-act" onclick="tv2SupprimerConsigne('${c.id}')" title="Retirer" style="color:var(--v2-danger-text)">${_tv2SvgN('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 15)}</button>` : ''}
    </div>`;
  }).join('')}</div>` : `<div class="dc-empty" style="padding:4px 0">Aucune consigne permanente${peutEcrire ? ' — cliquez sur « Ajouter »' : ''}.</div>`;
  el.innerHTML = _tv2Head(_tv2SvgN(shield, 15), '#f59e0b', 'Permanent', 'Consignes permanentes', right) + `<div class="dc-body">${body}</div>`;
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

  const clock = '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>';
  const body = jours.length ? jours.map(d => {
    const l = parJour[d];
    const m = l.filter(t => t.shift === 'matin').length;
    const a = l.filter(t => t.shift === 'aprem').length;
    const nn = l.filter(t => t.shift === 'nuit').length;
    const urg = l.filter(t => t.priority === 'urgent' || t.cat === 'urgent').length;
    const lbl = new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return `<div class="tc-histo" onclick="tv2AllerAu('${d}')">
      <div class="tc-histo-d">${escHtml(lbl)}</div>
      <div style="display:flex;gap:6px;flex:1;flex-wrap:wrap">
        <span class="tc-histo-p">Matin ${m}</span><span class="tc-histo-p">Après-midi ${a}</span><span class="tc-histo-p">Nuit ${nn}</span>
      </div>
      ${urg ? `<span class="dc-badge dc-b-red"><span class="d"></span>${urg} urgent${urg > 1 ? 'es' : 'e'}</span>` : ''}
      <span class="tc-histo-n">${l.length} tr.</span>
      <svg style="width:16px;height:16px;color:var(--v2-t7)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('') : '<div class="dc-empty" style="padding:4px 0">Aucune transmission dans l\'historique.</div>';
  el.innerHTML = _tv2Head(_tv2SvgN(clock, 15), '#6366f1', 'Historique', 'Jours précédents') + `<div class="dc-body" style="padding:4px 0 6px">${body}</div>`;
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
  try {
    const { data } = await supabaseClient.auth.getUser();
    _tv2Uid = (data && data.user && data.user.id) || null;
  } catch (e) { _tv2Uid = null; }
  _tv2Consignes = await sbGetConsignes();
  tv2RenderConsignes();
}

// ══════════════════════════════════════════════════════════════════════════
// SUIVI « À FAIRE » + PRISE DE POSTE  (fonctionnalités de passation d'équipe)
// ══════════════════════════════════════════════════════════════════════════

// Marque une action « à faire » comme faite (qui + quand).
async function tv2MarquerFait(id) {
  const t = getTr().find(x => String(x.id) === String(id));
  if (!t) return;
  const sess = Auth.getSession() || {};
  const nom = [sess.prenom, sess.nom].filter(Boolean).join(' ') || sess.username || '';
  const now = new Date().toISOString();
  try {
    // Colonnes suivi_* présentes par définition : la carte n'est « à faire »
    // que si la transmission a été enregistrée avec ces colonnes.
    const upd = await sbUpdateTransmissionField(id, { suivi_fait: true, suivi_par: nom, suivi_le: now });
    const i = _trCache.findIndex(x => String(x.id) === String(id));
    if (i !== -1) _trCache[i] = upd; else Object.assign(t, { fait: true, faitPar: nom, faitLe: now });
    if (typeof toast === 'function') toast('Action marquée comme faite ✓', 'success');
  } catch (e) {
    console.error('[transmissions] marquer fait', e);
    if (typeof toast === 'function') toast('Enregistrement impossible', 'error');
    return;
  }
  _renderTransmissions();
}

// « depuis hier », « depuis le 18/07 » pour une action reportée d'un jour passé.
function _tv2Depuis(dateStr) {
  if (!dateStr) return '';
  const t0 = (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
  if (dateStr >= t0) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const veille = new Date(t0 + 'T00:00:00'); veille.setDate(veille.getDate() - 1);
  if (dateStr === isoJour(veille)) return 'depuis hier';
  return 'depuis le ' + dateStr.slice(8, 10) + '/' + dateStr.slice(5, 7);
}

// Bloc « À faire pour la relève » : les actions ouvertes, TOUS jours confondus.
// C'est le report automatique — une action non faite reste visible jour après jour.
function tv2RenderTodos() {
  const el = document.getElementById('trTodo');
  if (!el) return;
  const residents = _trResidentsCache || [];
  const ouvertes = getTr().filter(t => t.aFaire && !t.fait)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));   // plus ancien en tête
  if (!ouvertes.length) { el.innerHTML = ''; return; }

  const clock = '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>';
  const rows = ouvertes.map(t => {
    const r = residents.find(x => String(x.id) === String(t.residentId));
    const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : (t.residentName || 'Collectif');
    const depuis = _tv2Depuis(t.date);
    return `<div class="tc-todo-row">
      <button type="button" class="tc-todo-chk" onclick="tv2MarquerFait('${t.id}')" title="Marquer comme fait" aria-label="Marquer comme fait">${_tv2SvgN('<polyline points="20 6 9 17 4 12"/>', 14, 3)}</button>
      <div style="min-width:0;flex:1">
        <div class="tc-todo-txt">${escHtml(t.content || '')}</div>
        <div class="tc-todo-m">${escHtml(nom)}${depuis ? ' · <span class="old">' + escHtml(depuis) + '</span>' : ''}</div>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="dc-card" style="margin-bottom:16px;border-left:3px solid #f59e0b">
    ${_tv2Head(_tv2SvgN(clock, 15), '#f59e0b', 'Relève', 'À faire pour la relève', `<span class="dc-pill dim">${ouvertes.length}</span>`)}
    <div style="padding:2px 0">${rows}</div>
  </div>`;
}

// Bandeau « prise de poste » : ce que l'agent qui arrive n'a pas encore lu, du
// jour affiché. Un bouton valide la prise de connaissance de toute la passation.
function tv2RenderPrise() {
  const el = document.getElementById('trPrise');
  if (!el) return;
  const userId = (Auth.getSession() || {}).userId;
  const nonLues = getTr().filter(t => t.date === _trCurrentDate && !_trIsRead(t, userId));
  if (!nonLues.length) { el.innerHTML = ''; return; }
  const n = nonLues.length;
  el.innerHTML = `<div class="tc-banner">
    <span class="tc-banner-ic">${_tv2SvgN('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>', 19)}</span>
    <div style="min-width:0">
      <div class="tc-banner-t">${n} transmission${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}</div>
      <div class="tc-banner-s">Prenez connaissance de la passation avant votre service.</div>
    </div>
    <button type="button" class="tc-banner-b" onclick="tv2PriseDePoste()">J'ai pris connaissance</button>
  </div>`;
}

async function tv2PriseDePoste() {
  const sess = Auth.getSession() || {};
  const userId = String(sess.userId || '');
  const nonLues = getTr().filter(t => t.date === _trCurrentDate && !_trIsRead(t, userId));
  if (!nonLues.length) return;
  try {
    await Promise.all(nonLues.map(t => {
      const readBy = [...(t.readBy || []).map(String)];
      if (!readBy.includes(userId)) readBy.push(userId);
      return sbUpdateTransmissionField(t.id, { read_by: readBy }).then(upd => {
        const i = _trCache.findIndex(x => String(x.id) === String(t.id));
        if (i !== -1) _trCache[i] = upd; else t.readBy = readBy;
      });
    }));
    if (typeof auditLog === 'function') auditLog('passation_lue', `Prise de connaissance — ${nonLues.length} transmission(s) du ${_trCurrentDate}`);
    if (typeof toast === 'function') toast('Passation prise en compte ✓', 'success');
  } catch (e) {
    console.error('[transmissions] prise de poste', e);
    if (typeof toast === 'function') toast('Enregistrement impossible', 'error');
  }
  _renderTransmissions();
  if (typeof _updateTrUnreadBadge === 'function') _updateTrUnreadBadge();
}
