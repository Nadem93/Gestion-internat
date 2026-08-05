// ── JOURNAL DE BORD — DESIGN V2 ──
// Reproduit « Journal - refonte (bento) » : filtres par catégorie, fil
// chronologique groupé par jour, rail (activité par catégorie + résidents les
// plus suivis) et bandeau de synthèse.
// La lecture, les filtres et les actions restent celles de js/journal.js.

let JR2_CAT = '';   // catégorie sélectionnée dans les chips
let JR2_GROUP = 'jour';   // 'jour' (chronologique) ou 'objectif' (synthèse PPE)
try { const g = localStorage.getItem('jr_group'); if (g === 'objectif') JR2_GROUP = 'objectif'; } catch (_) {}
function jr2SetGroup(mode) {
  JR2_GROUP = mode;
  try { localStorage.setItem('jr_group', mode); } catch (_) {}
  jr2Render();
}

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
// Variante « Console Data » : icône SVG explicitement dimensionnée (16px) pour
// les chips/kpi-ico qui n'ont pas de règle CSS de taille.
function _jr2SvgS(d) { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; }

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

// « Vu par N » : lecteurs de l'entrée (readBy). Les noms sont résolus depuis la
// liste des comptes quand c'est possible (affichés en infobulle) ; sinon on
// retombe sur un simple compteur. Rien à afficher si personne ne l'a encore lue.
function _jr2VuPar(e) {
  const ids = (e.readBy || []).map(String).filter(Boolean);
  if (!ids.length) return '';
  let comptes = [];
  try { comptes = (typeof DB !== 'undefined' && DB.get) ? (DB.get(DB.keys.users) || []) : []; } catch (_) {}
  const noms = ids.map(id => {
    const u = comptes.find(x => String(x.id) === id);
    return u ? ([u.prenom, u.nom].filter(Boolean).join(' ').trim() || u.username || '') : '';
  }).filter(Boolean);
  const titre = noms.length ? 'Vu par : ' + noms.join(', ') : (ids.length + ' lecteur' + (ids.length > 1 ? 's' : ''));
  const oeil = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  return '<span class="v2-jr-vu" title="' + escAttr(titre) + '">' + oeil + 'Vu par ' + ids.length + '</span>';
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
  jr2SyncGroupBtn();
}

// Bascule jour / objectif : le bouton affiche l'ÉTAT COURANT (« Par objectif »
// quand on regroupe déjà par objectif), avec une pastille active.
function jr2ToggleGroupUI() { jr2SetGroup(JR2_GROUP === 'objectif' ? 'jour' : 'objectif'); }
function jr2SyncGroupBtn() {
  const b = document.getElementById('btnGroupObj'), l = document.getElementById('btnGroupObjLbl');
  if (!b) return;
  const actif = JR2_GROUP === 'objectif';
  b.classList.toggle('on', actif);
  if (l) l.textContent = actif ? 'Par objectif' : 'Par objectif';
  b.title = actif ? 'Revenir au fil chronologique' : 'Regrouper par objectif du projet personnalisé';
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

// ─── Séparation de dates « ancre de calendrier » ──────────────────────────
// Bloc calendrier (mois coloré + numéro) puis libellé et compteur. La couleur
// distingue les trois cas : aujourd'hui, hier, et le reste — repère utile quand
// on fait défiler des centaines d'entrées.
function jr2SeparateurJour(dayKey, nb) {
  const d = new Date(dayKey + 'T12:00:00');
  const jour = String(d.getDate()).padStart(2, '0');
  // toLocaleDateString rend « août » / « juil. » : on retire le point abréviatif.
  const mois = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();

  // journalDayLabel() renvoie « Aujourd'hui — lundi 4 août » ou « lundi 4 août ».
  // On sépare le mot-clé du reste pour le mettre en valeur.
  const brut = journalDayLabel(dayKey);
  const coupe = brut.indexOf(' — ');
  const principal  = coupe > 0 ? brut.slice(0, coupe) : brut;
  const secondaire = coupe > 0 ? brut.slice(coupe + 3) : '';

  const t = (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
  // toISOString() renvoie de l'UTC : entre minuit et 2 h en France, « hier »
  // désignait avant-hier et le séparateur perdait sa couleur. Calcul local.
  const dh = new Date(); dh.setHours(0, 0, 0, 0); dh.setDate(dh.getDate() - 1);
  const hier = isoJour(dh);
  const c = dayKey === t ? '#6366f1' : (dayKey === hier ? '#818cf8' : '#94a3b8');

  return `<div class="v2-jr-day" style="--dc:${c}">
    <div class="v2-jr-cal"><div class="v2-jr-cal-m">${escHtml(mois)}</div><div class="v2-jr-cal-j">${escHtml(jour)}</div></div>
    <div class="v2-jr-day-w">
      <div class="v2-jr-day-l">${escHtml(principal)}</div>
      <div class="v2-jr-day-s2">${escHtml(secondaire || 'journée complète')}</div>
    </div>
    <span class="v2-jr-day-b">${nb} entrée${nb > 1 ? 's' : ''}</span>
  </div>`;
}

function jr2RenderFil(liste) {
  const el = document.getElementById('entriesList');
  if (!el) return;
  // Clic (ou Entrée/Espace) sur une carte floutée → révèle + marque lu.
  // Un seul écouteur sur le conteneur, qui survit aux re-rendus.
  if (!el._jr2RevealBound) {
    el._jr2RevealBound = true;
    const _reveal = ev => {
      const card = ev.target.closest && ev.target.closest('.v2-jr-locked');
      if (!card || !el.contains(card)) return;
      if (ev.type === 'keydown') {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
      }
      jr2Reveal(card.dataset.jid);
    };
    el.addEventListener('click', _reveal);
    el.addEventListener('keydown', _reveal);
  }
  el.className = '';
  el.removeAttribute('style');

  if (!liste.length) {
    el.innerHTML = `<div class="v2-blk" style="text-align:center;padding:48px 24px">
      <div style="font-size:15px;font-weight:700;color:var(--v2-t2)">Aucune entrée</div>
      <div style="font-size:12.5px;color:var(--v2-t7);margin-top:4px">Aucune entrée ne correspond à ces filtres.</div>
    </div>`;
    return;
  }

  if (JR2_GROUP === 'objectif') { jr2RenderParObjectif(el, liste); return; }

  const parJour = {};
  liste.forEach(e => {
    const d = (e.date || '').slice(0, 10);
    (parJour[d] = parJour[d] || []).push(e);
  });
  const jours = Object.keys(parJour).sort((a, b) => b.localeCompare(a));

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:20px">${jours.map(d => {
    const ents = parJour[d].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return `<div class="v2-jr-grp">
      ${jr2SeparateurJour(d, ents.length)}
      <div style="display:flex;flex-direction:column;gap:12px">
        ${ents.map((e, i) => jr2Entree(e, i < ents.length - 1)).join('')}
      </div>
    </div>`;
  }).join('')}</div>`;
}

// Synthèse par objectif : regroupe le fil par objectif du projet personnalisé —
// « pour cet objectif, voici ce qui a été observé ». Chaque groupe résume aussi
// le niveau de soutien apporté. Les entrées sans objectif rattaché sont mises à
// part, en fin de liste.
function jr2RenderParObjectif(el, liste) {
  const groupes = {};
  liste.forEach(e => {
    const cle = (e.objectif || '').trim() || '__sans';
    (groupes[cle] = groupes[cle] || []).push(e);
  });
  // objectifs avant « sans objectif », puis par nombre d'entrées décroissant
  const cles = Object.keys(groupes).sort((a, b) => {
    if (a === '__sans') return 1; if (b === '__sans') return -1;
    return groupes[b].length - groupes[a].length || a.localeCompare(b);
  });

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:20px">${cles.map(k => {
    const ents = groupes[k].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const sansObj = k === '__sans';
    // Répartition des niveaux de soutien du groupe.
    const niv = {};
    ents.forEach(e => { if (e.niveauSoutien) niv[e.niveauSoutien] = (niv[e.niveauSoutien] || 0) + 1; });
    const nivChips = Object.keys(niv).sort((a, b) => niv[b] - niv[a])
      .map(n => `<span class="dc-badge" style="background:#8b5cf61f;color:#8b5cf6;border:1px solid #8b5cf644"><span class="d" style="background:#8b5cf6"></span>${escHtml(journalNiveauLabel(n))} · ${niv[n]}</span>`).join('');
    return `<div class="v2-jr-grp">
      <div class="v2-jr-obj-h${sansObj ? ' sans' : ''}">
        ${_jr2Svg(sansObj ? JR2_IC.doc : JR2_IC.target)}
        <span class="v2-jr-obj-t">${sansObj ? 'Sans objectif rattaché' : escHtml(k)}</span>
        <span class="v2-jr-day-n">${ents.length} entrée${ents.length > 1 ? 's' : ''}</span>
      </div>
      ${nivChips ? `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 0 12px 64px">${nivChips}</div>` : ''}
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

  // Non lue par l'utilisateur courant → carte floutée « Cliquer pour lire »
  // (le clic est capté par délégation dans jr2RenderFil → jr2Reveal).
  const _sess = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const nonLu = !!(_sess && (!e.readBy || !e.readBy.includes(_sess.userId)));
  const cardCls = 'v2-jr-card' + (nonLu ? ' v2-jr-locked' : '');
  const lockAttrs = nonLu
    ? ` data-jid="${escAttr(String(e.id))}" role="button" tabindex="0" aria-label="Entrée non lue — cliquer pour l'afficher et la marquer comme lue"`
    : '';

  return `<div class="v2-jr-row">
    <div class="v2-jr-rail">${av}${trait ? '<div class="v2-jr-line"></div>' : ''}</div>
    <div class="${cardCls}"${lockAttrs} style="border-left:3px solid ${col};padding-left:14px">
      <div class="v2-jr-inner">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;flex-wrap:wrap">
        <span class="v2-jr-res">${escHtml(nom)}</span>
        ${r && r.chambre ? `<span class="v2-jr-ch">Ch. ${escHtml(r.chambre)}</span>` : ''}
        <span class="dc-badge" style="background:${vis.c}22;color:${vis.c};border:1px solid ${vis.c}55"><span class="d" style="background:${vis.c}"></span>${vis.l}</span>
        ${heure ? `<span class="dc-pill dim" style="margin-left:auto;padding:3px 8px">${heure}</span>` : ''}
      </div>
      ${cats.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${
        cats.map(id => { const c = _jr2Cat(id);
          return `<span class="dc-badge" style="background:${c.color}1f;color:${c.color};border:1px solid ${c.color}44"><span class="d" style="background:${c.color}"></span>${escHtml(c.name)}</span>`;
        }).join('')}</div>` : ''}
      <div class="v2-jr-txt">${escHtml(e.contenu || '')}</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${e.objectif ? `<span class="v2-jr-obj">${_jr2Svg(JR2_IC.target)}${escHtml(e.objectif)}</span>` : ''}
        ${e.niveauSoutien ? `<span class="dc-badge" style="background:#8b5cf61f;color:#8b5cf6;border:1px solid #8b5cf644"><span class="d" style="background:#8b5cf6"></span>${escHtml(journalNiveauLabel(e.niveauSoutien))}</span>` : ''}
        ${_jr2VuPar(e)}
        <span class="dc-pill dim" style="margin-left:auto;padding:3px 8px">${escHtml(e.author || '')}</span>
      </div>
      </div>
    </div>
  </div>`;
}

// Révèle une entrée non lue (clic sur la carte floutée) et la marque comme lue.
// Révélation optimiste EN PLACE (on ne re-rend pas la liste) : sinon, avec le
// filtre « Non lus » actif, l'entrée disparaîtrait juste après le clic.
async function jr2Reveal(id) {
  const session = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  if (!session || id == null) return;
  const e = (_journalCache || []).find(x => String(x.id) === String(id));
  if (!e) return;
  if (!e.readBy || !e.readBy.includes(session.userId)) {
    e.readBy = (e.readBy || []).concat([session.userId]);   // maj optimiste du cache
  }
  // Dé-floute la carte de cette entrée sans re-rendre la liste.
  const sel = (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/"/g, '\\"');
  document.querySelectorAll('.v2-jr-card[data-jid="' + sel + '"]').forEach(card => {
    card.classList.remove('v2-jr-locked');
    card.removeAttribute('role'); card.removeAttribute('tabindex'); card.removeAttribute('aria-label');
  });
  if (typeof updateUnreadBadge === 'function') updateUnreadBadge();
  try {
    // Écriture ciblée : un simple « lu » ne doit jamais renvoyer tout l'objet,
    // sinon il écrase ce qu'un collègue a corrigé depuis notre dernier chargement.
    if (typeof sbUpdateJournalField === 'function') {
      const updated = await sbUpdateJournalField(id, { read_by: e.readBy || [] });
      const idx = (_journalCache || []).findIndex(x => String(x.id) === String(id));
      if (idx !== -1) _journalCache[idx] = updated;
    }
  } catch (err) { console.error('[journal] marquage lu', err); }
}
window.jr2Reveal = jr2Reveal;

// ── RAIL : ACTIVITÉ PAR CATÉGORIE (30 JOURS) ─────────────────────────

function _jr230j() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  const depuis = isoJour(d);
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
    <div class="dc-head">
      <div class="dc-head-l">
        <span class="dc-chip" style="background:rgba(34,211,238,.16);color:#22d3ee">${_jr2SvgS('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>')}</span>
        <div style="min-width:0"><div class="dc-eyebrow">RÉPARTITION</div><div class="dc-title">Activité par catégorie</div></div>
      </div>
      <span class="dc-pill dim">30 j</span>
    </div>
    <div class="dc-body">
    ${cles.length ? `<div style="display:flex;flex-direction:column;gap:12px">${cles.map(id => {
      const c = _jr2Cat(id);
      return `<div style="border-left:3px solid ${c.color};padding-left:10px">
        <div style="display:flex;align-items:baseline;margin-bottom:5px">
          <span style="font-size:12px;color:var(--v2-t3)">${escHtml(c.name)}</span>
          <span class="dc-pill dim" style="margin-left:auto;padding:2px 8px">${n[id]}</span>
        </div>
        <div class="al-prog-bar"><span style="width:${Math.round(n[id] / max * 100)}%;background:${c.color}"></span></div>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucune entrée sur 30 jours.</div>'}
    </div>`;
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
    <div class="dc-head">
      <div class="dc-head-l">
        <span class="dc-chip" style="background:rgba(129,140,248,.16);color:#818cf8">${_jr2SvgS('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>')}</span>
        <div style="min-width:0"><div class="dc-eyebrow">SUIVI</div><div class="dc-title">Résidents les plus suivis</div></div>
      </div>
      <span class="dc-pill dim">30 j</span>
    </div>
    <div class="dc-body">
    ${cles.length ? `<div style="display:flex;flex-direction:column;gap:13px">${cles.map(id => {
      const r = (_journalResidentsCache || []).find(x => String(x.id) === String(id));
      const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : 'Résident';
      const c = safeColor(r && r.color, '#818cf8');
      return `<div class="v2-jr-top" style="border-left:3px solid ${c};padding-left:10px">
        <div class="v2-jr-top-av" style="background:${c}">${escHtml(_jr2Ini(nom))}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;color:var(--v2-t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(nom)}</div>
          <div class="al-prog-bar" style="height:5px;margin-top:5px"><span style="width:${Math.round(n[id] / max * 100)}%;background:${c}"></span></div>
        </div>
        <span class="dc-pill dim" style="padding:2px 8px">${n[id]}</span>
      </div>`;
    }).join('')}</div>` : '<div class="v2-blk-vide">Aucun suivi sur 30 jours.</div>'}
    </div>`;
}

// ── BANDEAU DE SYNTHÈSE ──────────────────────────────────────────────

function jr2RenderSynthese() {
  const el = document.getElementById('jrSynthese');
  if (!el) return;
  const toutes = _journalCache || [];
  const mois = today().slice(0, 7);
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const semaine = isoJour(d7);

  const ceMois   = toutes.filter(e => (e.date || '').slice(0, 7) === mois).length;
  const cette7   = toutes.filter(e => (e.date || '').slice(0, 10) >= semaine).length;
  const suivis   = new Set(_jr230j().filter(e => e.residentId).map(e => e.residentId)).size;
  const objectifs = _jr230j().filter(e => e.objectif).length;

  const kpi = (ico, c, label, val, sub) => `<div class="dc-kpi" style="--dc-c:${c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${label}</span><span class="dc-kpi-ico" style="color:${c}">${_jr2SvgS(ico)}</span></div>
    <div class="dc-kpi-val">${val}</div>
    <div class="dc-kpi-sub">${sub}</div>
  </div>`;

  el.innerHTML = `<div class="dc-kpis">
    ${kpi(JR2_IC.doc, '#22d3ee', 'CE MOIS', ceMois, 'Entrées ce mois')}
    ${kpi(JR2_IC.cal, '#10b981', '7 JOURS', cette7, 'Sur 7 jours')}
    ${kpi(JR2_IC.users, '#818cf8', 'SUIVIS 30J', suivis, 'Résidents suivis')}
    ${kpi(JR2_IC.target, '#f59e0b', 'OBJECTIFS', objectifs, 'Liées à un objectif')}
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// MODÈLES D'ENTRÉE RAPIDE  (« moins d'écrits » : observations récurrentes)
// ══════════════════════════════════════════════════════════════════════════
const JR2_MODELES = [
  'Rien à signaler (RAS).',
  'A bien mangé.',
  'Sieste calme.',
  'A participé à l\'activité.',
  'Bonne journée dans l\'ensemble.',
  'Moment d\'agitation, apaisé·e.',
  'Refus de soin / d\'activité.',
  'Sortie extérieure.',
  'Visite de la famille.',
  'Bon contact avec l\'équipe.'
];

// Remplit les chips de modèles dans tous les hôtes présents :
//  - #jrModelesNew : formulaire riche de NOUVELLE entrée (textarea #iContenu)
//  - #jrModeles    : modale d'ÉDITION (textarea #eContenu)
function jr2RenderModeles() {
  const html = JR2_MODELES.map(m =>
    `<button type="button" class="jr-modele" onclick="jr2InsererModele('${m.replace(/'/g, "\\'")}')">${escHtml(m)}</button>`
  ).join('');
  ['jrModelesNew', 'jrModeles'].forEach(id => {
    const host = document.getElementById(id);
    if (host) host.innerHTML = html;
  });
}

// Insère (ou complète) le modèle choisi dans le textarea de contenu actif.
// Le formulaire riche (#iContenu) prime sur la modale d'édition (#eContenu).
function jr2InsererModele(txt) {
  const ta = ['iContenu', 'eContenu']
    .map(id => document.getElementById(id))
    .find(el => el && el.offsetParent !== null)
    || document.getElementById('eContenu');
  if (!ta) return;
  const actuel = ta.value.replace(/\s+$/, '');
  ta.value = actuel ? actuel + (/[.!?…]$/.test(actuel) ? ' ' : '. ') + txt : txt;
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', jr2RenderModeles);
else jr2RenderModeles();
