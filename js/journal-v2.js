// ── JOURNAL DE BORD — DESIGN V2 ──
// Reproduit « Journal - refonte (bento) » : filtres par catégorie, fil
// chronologique groupé par jour, rail (activité par catégorie + résidents les
// plus suivis) et bandeau de synthèse.
// La lecture, les filtres et les actions restent celles de js/journal.js.

let JR2_CAT = '';   // catégorie sélectionnée dans les chips

const JR2_VIS = {
  equipe:       { l: 'Équipe',       c: '#22d3ee' },
  confidentiel: { l: 'Confidentiel', c: '#ef4444' },
  prive:        { l: 'Privé',        c: '#f59e0b' }
};
const JR2_IC = {
  doc:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
};
function _jr2Svg(d, w) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }

function _jr2Cats() { return DB.get(DB.keys.categories) || []; }
function _jr2Cat(id) {
  return _jr2Cats().find(c => String(c.id) === String(id)) || { name: id, color: '#64748b' };
}
function _jr2Ini(nom) {
  return (nom || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('') || '?';
}
function _jr2Res(e) {
  return (_journalResidentsCache || []).find(r => String(r.id) === String(e.residentId));
}

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────

function jr2Render() {
  // getEntries() applique déjà recherche, résident, dates, non-lus et la
  // règle de confidentialité — on ne filtre ici que sur la catégorie.
  let liste = getEntries();
  if (JR2_CAT) liste = liste.filter(e => (e.categorie || '').split(',').filter(Boolean).includes(JR2_CAT));

  jr2RenderChips(getEntries());
  jr2RenderFil(liste);
  jr2RenderCategories();
  jr2RenderTopResidents();
  jr2RenderSynthese();
}

function jr2SetCat(id) { JR2_CAT = (JR2_CAT === id) ? '' : id; jr2Render(); }

// ── CHIPS DE CATÉGORIE ───────────────────────────────────────────────

function jr2RenderChips(liste) {
  const el = document.getElementById('jrChips');
  if (!el) return;
  const presentes = [...new Set(liste.flatMap(e => (e.categorie || '').split(',').filter(Boolean)))];
  const chip = (id, label, c, actif) =>
    `<button type="button" class="v2-chip-f${actif ? ' on' : ''}" onclick="jr2SetCat('${id}')">
      <span class="dot" style="background:${c}"></span>${escHtml(label)}
    </button>`;
  el.innerHTML = chip('', 'Toutes', '#818cf8', !JR2_CAT)
    + presentes.map(id => { const c = _jr2Cat(id); return chip(id, c.name, c.color, JR2_CAT === id); }).join('');
}

// ── FIL CHRONOLOGIQUE ────────────────────────────────────────────────

function jr2RenderFil(liste) {
  const el = document.getElementById('entriesList');
  if (!el) return;
  el.className = '';
  el.removeAttribute('style');

  if (!liste.length) {
    el.innerHTML = `<div class="v2-blk" style="text-align:center;padding:48px 24px">
      <div style="font-size:15px;font-weight:700;color:var(--v2-t2)">Aucune entrée</div>
      <div style="font-size:12.5px;color:var(--v2-t7);margin-top:4px">Aucune entrée ne correspond à ces filtres.</div>
    </div>`;
    return;
  }

  const parJour = {};
  liste.forEach(e => {
    const d = (e.date || '').slice(0, 10);
    (parJour[d] = parJour[d] || []).push(e);
  });
  const jours = Object.keys(parJour).sort((a, b) => b.localeCompare(a));

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:20px">${jours.map(d => {
    const ents = parJour[d].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return `<div>
      <div class="v2-jr-day">
        <span class="v2-jr-day-l">${escHtml(journalDayLabel(d))}</span>
        <span class="v2-jr-day-n">${ents.length} entrée${ents.length > 1 ? 's' : ''}</span>
        <span class="v2-jr-day-s"></span>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${ents.map((e, i) => jr2Entree(e, i < ents.length - 1)).join('')}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function jr2Entree(e, trait) {
  const r = _jr2Res(e);
  const nom = (r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : e.resident) || 'Collectif';
  const col = safeColor(r && r.color, '#818cf8');
  const vis = JR2_VIS[e.visibilite] || JR2_VIS.equipe;
  const heure = e.date && e.date.length > 10
    ? new Date(e.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const cats = (e.categorie || '').split(',').filter(Boolean);

  const av = (r && r.photo)
    ? `<div class="v2-jr-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="v2-jr-av" style="background:${col}">${escHtml(_jr2Ini(nom))}</div>`;

  return `<div class="v2-jr-row">
    <div class="v2-jr-rail">${av}${trait ? '<div class="v2-jr-line"></div>' : ''}</div>
    <div class="v2-jr-card">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;flex-wrap:wrap">
        <span class="v2-jr-res">${escHtml(nom)}</span>
        ${r && r.chambre ? `<span class="v2-jr-ch">Ch. ${escHtml(r.chambre)}</span>` : ''}
        <span class="v2-jr-vis" style="--pc:${vis.c}">${vis.l}</span>
        ${heure ? `<span style="margin-left:auto;font-size:11px;color:var(--v2-t7)">${heure}</span>` : ''}
      </div>
      ${cats.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${
        cats.map(id => { const c = _jr2Cat(id);
          return `<span class="v2-tr-tag" style="--pc:${c.color}"><span class="dot"></span>${escHtml(c.name)}</span>`;
        }).join('')}</div>` : ''}
      <div class="v2-jr-txt">${escHtml(e.contenu || '')}</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${e.objectif ? `<span class="v2-jr-obj">${_jr2Svg(JR2_IC.target)}${escHtml(e.objectif)}</span>` : ''}
        ${e.niveauSoutien ? `<span class="v2-tr-tag" style="--pc:#8b5cf6">${escHtml(journalNiveauLabel(e.niveauSoutien))}</span>` : ''}
        <span style="margin-left:auto;font-size:10.5px;color:var(--v2-t7)">${escHtml(e.author || '')}</span>
      </div>
    </div>
  </div>`;
}

// ── RAIL : ACTIVITÉ PAR CATÉGORIE (30 JOURS) ─────────────────────────

function _jr230j() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  const depuis = d.toISOString().slice(0, 10);
  return (_journalCache || []).filter(e => (e.date || '').slice(0, 10) >= depuis);
}

function jr2RenderCategories() {
  const el = document.getElementById('jrCats');
  if (!el) return;
  const recentes = _jr230j();
  const n = {};
  recentes.forEach(e => (e.categorie || '').split(',').filter(Boolean).forEach(c => { n[c] = (n[c] || 0) + 1; }));
  const cles = Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 8);
  const max = Math.max(1, ...Object.values(n));

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:18px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span class="v2-blk-t">Activité par catégorie</span>
      <span style="margin-left:auto;font-size:11.5px;color:var(--v2-t7)">30 j</span>
    </div>
    ${cles.length ? `<div style="display:flex;flex-direction:column;gap:12px">${cles.map(id => {
      const c = _jr2Cat(id);
      return `<div>
        <div style="display:flex;align-items:baseline;margin-bottom:5px">
          <span style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--v2-t3)">
            <span style="width:8px;height:8px;border-radius:50%;background:${c.color}"></span>${escHtml(c.name)}</span>
          <span style="margin-left:auto;font-size:11.5px;font-weight:700;color:#fff">${n[id]}</span>
        </div>
        <div class="v2-prog"><span style="width:${Math.round(n[id] / max * 100)}%;background:${c.color}"></span></div>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucune entrée sur 30 jours.</div>'}`;
}

// ── RAIL : RÉSIDENTS LES PLUS SUIVIS ─────────────────────────────────

function jr2RenderTopResidents() {
  const el = document.getElementById('jrTop');
  if (!el) return;
  const n = {};
  _jr230j().forEach(e => { if (e.residentId) n[e.residentId] = (n[e.residentId] || 0) + 1; });
  const cles = Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 5);
  const max = Math.max(1, ...Object.values(n));

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:16px">
      <svg class="v2-blk-ico" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <span class="v2-blk-t">Résidents les plus suivis</span>
    </div>
    ${cles.length ? `<div style="display:flex;flex-direction:column;gap:13px">${cles.map(id => {
      const r = (_journalResidentsCache || []).find(x => String(x.id) === String(id));
      const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : 'Résident';
      const c = safeColor(r && r.color, '#818cf8');
      return `<div class="v2-jr-top">
        <div class="v2-jr-top-av" style="background:${c}">${escHtml(_jr2Ini(nom))}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;color:var(--v2-t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(nom)}</div>
          <div class="v2-prog" style="height:5px;margin-top:5px"><span style="width:${Math.round(n[id] / max * 100)}%;background:${c}"></span></div>
        </div>
        <span style="font-size:11.5px;font-weight:700;color:var(--v2-t4)">${n[id]}</span>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucun suivi sur 30 jours.</div>'}`;
}

// ── BANDEAU DE SYNTHÈSE ──────────────────────────────────────────────

function jr2RenderSynthese() {
  const el = document.getElementById('jrSynthese');
  if (!el) return;
  const toutes = _journalCache || [];
  const mois = today().slice(0, 7);
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const semaine = d7.toISOString().slice(0, 10);

  const ceMois   = toutes.filter(e => (e.date || '').slice(0, 7) === mois).length;
  const cette7   = toutes.filter(e => (e.date || '').slice(0, 10) >= semaine).length;
  const suivis   = new Set(_jr230j().filter(e => e.residentId).map(e => e.residentId)).size;
  const objectifs = _jr230j().filter(e => e.objectif).length;

  const bloc = (ico, c, val, lbl) => `<div class="v2-jr-sum-i" style="--pc:${c}">
    <span class="v2-jr-sum-c">${_jr2Svg(ico)}</span>
    <div><div class="v2-jr-sum-n">${val}</div><div class="v2-jr-sum-l">${lbl}</div></div>
  </div>`;

  el.innerHTML = `<div class="v2-jr-sum">
    ${bloc(JR2_IC.doc, '#22d3ee', ceMois, 'Entrées ce mois')}
    ${bloc(JR2_IC.cal, '#10b981', cette7, 'Sur 7 jours')}
    ${bloc(JR2_IC.users, '#818cf8', suivis, 'Résidents suivis (30 j)')}
    ${bloc(JR2_IC.target, '#f59e0b', objectifs, 'Entrées liées à un objectif')}
  </div>`;
}
