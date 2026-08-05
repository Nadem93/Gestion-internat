// ── SATISFACTION RÉSIDENTS — DESIGN V2 ────────────────────────────────
// Reproduit la maquette « Satisfaction résidents (dossiers) » :
//   4 tuiles statistiques, score par catégorie, évolution du score global,
//   jauge circulaire et verbatims récents.
// Toutes les données proviennent de js/satisfaction-supabase.js (table
// `satisfaction`) : catégories, évolution mensuelle, écart trimestriel et
// verbatims sont calculés à partir des questionnaires enregistrés.
// Aucune valeur n'est inventée : sans donnée, le bloc affiche « — ».

const SA2_IC = {
  doc:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  up:    '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  chat:  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  star:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  pen:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
};

// Échelle de réponse rhabillée pour le thème sombre (SAT_COLORS est clair)
const SA2_OPT_C = ['#ef4444', '#f97316', '#f59e0b', '#34d399', '#10b981'];
const SA2_OPT_L = ['Très insat.', 'Insatisfait', 'Neutre', 'Satisfait', 'Très satisf.'];
const SA2_MOIS  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function _sa2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// Couleur d'un pourcentage de satisfaction
function _sa2Col(pct) {
  if (pct === null || pct === undefined) return '#8095b4';
  if (pct >= 90) return '#10b981';
  if (pct >= 80) return '#22d3ee';
  if (pct >= 70) return '#f59e0b';
  if (pct >= 50) return '#fb923c';
  return '#ef4444';
}
// Moyenne (0–4) des réponses d'un questionnaire
function _sa2Avg(s, allQ) {
  const v = allQ.map(q => s.reponses?.[q.id]).filter(x => x !== undefined && x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function _sa2Pct(avg) { return avg === null ? null : Math.round(avg * 25); }
function _sa2Mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function _sa2Iso(d) { return isoJour(d); }

// ── AGRÉGATION ────────────────────────────────────────────────────────
function sat2Data() {
  const list = (typeof getSat === 'function' ? getSat() : []) || [];
  const allQ = (typeof getAllQuestions === 'function' ? getAllQuestions() : []) || [];

  // Moyenne par question, puis score global
  const avgQ = {};
  allQ.forEach(q => {
    const v = list.map(s => s.reponses?.[q.id]).filter(x => x !== undefined && x !== null);
    avgQ[q.id] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  });
  const scoreGlobal = _sa2Mean(Object.values(avgQ).filter(v => v !== null));

  // Score par catégorie de questions
  const cats = [...new Set(allQ.map(q => q.cat))].map(cat => {
    const qs = allQ.filter(q => q.cat === cat);
    const vals = qs.map(q => avgQ[q.id]).filter(v => v !== null);
    const nRep = qs.reduce((n, q) => n + list.filter(s => s.reponses?.[q.id] !== undefined && s.reponses?.[q.id] !== null).length, 0);
    return { label: cat, pct: _sa2Pct(_sa2Mean(vals)), n: nRep };
  }).filter(c => c.pct !== null).sort((a, b) => b.pct - a.pct);

  // Évolution : 6 derniers mois glissants
  const now = new Date();
  const evolution = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const mois = list.filter(s => (s.date || '').slice(0, 7) === key);
    const pcts = mois.map(s => _sa2Avg(s, allQ)).filter(v => v !== null).map(_sa2Pct);
    const val = pcts.length ? Math.round(_sa2Mean(pcts)) : null;
    evolution.push({ label: SA2_MOIS[d.getMonth()], val, n: mois.length });
  }

  // Écart vs trimestre précédent (90 j glissants contre les 90 j d'avant)
  const j90 = _sa2Iso(new Date(Date.now() - 90 * 86400000));
  const j180 = _sa2Iso(new Date(Date.now() - 180 * 86400000));
  const pctOf = arr => {
    const v = arr.map(s => _sa2Avg(s, allQ)).filter(x => x !== null).map(_sa2Pct);
    return v.length ? _sa2Mean(v) : null;
  };
  const pCur = pctOf(list.filter(s => (s.date || '') >= j90));
  const pPrev = pctOf(list.filter(s => (s.date || '') >= j180 && (s.date || '') < j90));
  const delta = (pCur !== null && pPrev !== null) ? Math.round(pCur - pPrev) : null;

  // Verbatims : 3 commentaires les plus récents
  const verbatims = list.filter(s => (s.commentaire || '').trim())
    .slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 3)
    .map(s => ({ text: s.commentaire.trim(), by: _sa2By(s), pct: _sa2Pct(_sa2Avg(s, allQ)) }));

  const j30 = _sa2Iso(new Date(Date.now() - 30 * 86400000));
  const mois = list.filter(s => (s.date || '') >= j30).length;

  return { list, allQ, avgQ, scoreGlobal, cats, evolution, delta, verbatims, mois };
}

// Auteur d'un verbatim : « Répondant · résident » ou « Répondant · mois »
function _sa2By(s) {
  const parts = [];
  parts.push(s.repondant || 'Anonyme');
  if (s.residentId && typeof sbResidents === 'function') {
    const r = sbResidents().find(x => String(x.id) === String(s.residentId));
    if (r) parts.push(((r.nom || '') + ' ' + (r.prenom || '')).trim());
  } else if (s.lienResident) {
    parts.push(s.lienResident);
  }
  if (s.date) {
    const d = new Date(s.date + 'T12:00:00');
    if (!isNaN(d)) parts.push(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  }
  return parts.join(' · ');
}

// ── RENDU PRINCIPAL ───────────────────────────────────────────────────
function sat2Render() {
  const d = sat2Data();
  sat2Stats(d);
  const mode = (typeof _satViewMode !== 'undefined') ? _satViewMode : 'resultats';
  if (mode === 'formulaires') sat2Formulaires(d);
  else if (mode === 'questions') sat2QuestionsView();
  else sat2Resultats(d);
}

// ── TUILES STATISTIQUES ───────────────────────────────────────────────
function sat2Stats(d) {
  const pct = _sa2Pct(d.scoreGlobal);
  const set = (id, txt, col) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = txt;
    const tile = el.closest('.dc-kpi');
    if (tile && col) tile.style.setProperty('--dc-c', col);
  };
  set('satStatTotal', String(d.list.length), '#fcd34d');
  set('satStatMois', String(d.mois), '#818cf8');
  set('satStatScore', pct === null ? '—' : pct + '%', pct === null ? '#8095b4' : '#f59e0b');
  set('satStatDelta',
    d.delta === null ? '—' : (d.delta > 0 ? '+' : '') + d.delta + ' pts',
    d.delta === null ? '#8095b4' : (d.delta < 0 ? '#ef4444' : '#10b981'));
}

// ── VUE RÉSULTATS (maquette) ──────────────────────────────────────────
function sat2Resultats(d) {
  const box = document.getElementById('satContent');
  if (!box) return;

  if (!d.list.length) {
    box.innerHTML = `<div class="sa2-empty">
      ${_sa2Svg(SA2_IC.star)}
      <div class="sa2-empty-t">Aucun questionnaire rempli</div>
      <div class="sa2-empty-s">Saisissez un premier questionnaire pour faire apparaître les scores, l'évolution et les verbatims.</div>
      <button type="button" class="v2-btn v2-btn-primary v2-btn-sm" style="margin-top:14px" onclick="openSatModal()">+ Saisir un questionnaire</button>
    </div>`;
    return;
  }

  const pct = _sa2Pct(d.scoreGlobal);
  const nQ = d.list.length;

  // Score par catégorie
  const cats = d.cats.length
    ? `<div class="sa2-cats">${d.cats.map(c => { const cc = _sa2Col(c.pct); return `<div style="border-left:3px solid ${cc};padding:2px 0 2px 12px">
        <div class="sa2-cat-h"><span class="sa2-cat-l">${escHtml(c.label)}</span><span class="dc-badge" style="background:${cc}1f;color:${cc};border:1px solid ${cc}44"><span class="d" style="background:${cc}"></span>${c.pct}%</span></div>
        <div class="al-prog-bar" style="margin-top:7px"><span style="width:${c.pct}%;background:${cc}"></span></div>
      </div>`; }).join('')}</div>`
    : '<div class="v2-blk-vide">Aucune réponse enregistrée sur les questions du référentiel.</div>';

  // Évolution : hauteur proportionnelle au pourcentage (plancher visuel à 6 %)
  const evo = d.evolution.map(e => {
    const h = e.val === null ? 4 : Math.max(6, Math.min(100, e.val));
    return `<div class="sa2-evo-c">
      <div class="sa2-evo-v${e.val === null ? ' vide' : ''}">${e.val === null ? '—' : e.val + '%'}</div>
      <div class="sa2-evo-b${e.val === null ? ' vide' : ''}" style="height:${h}%"></div>
      <div class="sa2-evo-l">${escHtml(e.label)}</div>
    </div>`;
  }).join('');

  // Verbatims
  const verbs = d.verbatims.length
    ? `<div class="sa2-verbs">${d.verbatims.map(v => `<div class="sa2-verb" style="--pc:${_sa2Col(v.pct)}">
        <div class="sa2-verb-t">« ${escHtml(v.text)} »</div>
        <div class="sa2-verb-b">${escHtml(v.by)}</div>
      </div>`).join('')}</div>`
    : '<div class="v2-blk-vide">Aucun commentaire libre pour le moment.</div>';

  const deltaTxt = d.delta === null
    ? 'Note globale · historique insuffisant pour comparer au trimestre précédent'
    : `Note globale · ${d.delta > 0 ? '+' : ''}${d.delta} pts vs. trimestre précédent`;

  box.innerHTML = `<div class="sa2-body">
    <div class="sa2-col">
      <div class="dc-card">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:#f59e0b22;color:#f59e0b">${_sa2Svg(SA2_IC.smile)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">Référentiel</div><div class="dc-title">Score par catégorie</div></div>
          </div>
          <span class="dc-pill dim">${nQ} questionnaire${nQ > 1 ? 's' : ''}</span>
        </div>
        <div class="dc-body">${cats}</div>
      </div>
      <div class="dc-card">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:#22d3ee22;color:#22d3ee">${_sa2Svg(SA2_IC.up)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">6 mois glissants</div><div class="dc-title">Évolution du score global</div></div>
          </div>
        </div>
        <div class="dc-body"><div class="sa2-evo">${evo}</div></div>
      </div>
    </div>
    <div class="sa2-col">
      <div class="sa2-gauge-card">
        <div class="sa2-gauge" style="--p:${pct === null ? 0 : pct}%" role="img" aria-label="Satisfaction globale ${pct === null ? 'indisponible' : pct + ' %'}">
          <div class="sa2-gauge-in">
            <span class="sa2-gauge-n">${pct === null ? '—' : pct + '%'}</span>
            <span class="sa2-gauge-u">satisfaction</span>
          </div>
        </div>
        <div class="sa2-gauge-s">${escHtml(deltaTxt)}</div>
      </div>
      <div class="dc-card">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:#22d3ee22;color:#22d3ee">${_sa2Svg(SA2_IC.chat)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">Commentaires</div><div class="dc-title">Verbatims récents</div></div>
          </div>
          ${d.verbatims.length ? `<span class="dc-pill dim">${d.verbatims.length}</span>` : ''}
        </div>
        <div class="dc-body">${verbs}</div>
      </div>
    </div>
  </div>`;
}

// ── VUE QUESTIONNAIRES ────────────────────────────────────────────────
function sat2Formulaires(d) {
  const box = document.getElementById('satContent');
  if (!box) return;

  const rows = d.list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!rows.length) {
    box.innerHTML = `<div class="sa2-empty">
      ${_sa2Svg(SA2_IC.doc)}
      <div class="sa2-empty-t">Aucun questionnaire</div>
      <div class="sa2-empty-s">Les questionnaires saisis apparaîtront ici, du plus récent au plus ancien.</div>
    </div>`;
    return;
  }

  box.innerHTML = `<div class="dc-card">
    <div class="dc-head">
      <div class="dc-head-l">
        <span class="dc-chip" style="background:#f59e0b22;color:#f59e0b">${_sa2Svg(SA2_IC.doc)}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Historique</div><div class="dc-title">Questionnaires saisis</div></div>
      </div>
      <span class="dc-pill dim">${rows.length}</span>
    </div>
    <div class="dc-body"><div class="sa2-list">` + rows.map(s => {
    const pct = _sa2Pct(_sa2Avg(s, d.allQ));
    const col = _sa2Col(pct);
    const meta = [];
    if (s.date) {
      const dt = new Date(s.date + 'T12:00:00');
      meta.push(isNaN(dt) ? s.date : dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }));
    }
    if (s.residentId && typeof sbResidents === 'function') {
      const r = sbResidents().find(x => String(x.id) === String(s.residentId));
      if (r) meta.push(((r.nom || '') + ' ' + (r.prenom || '')).trim());
    } else if (s.lienResident) meta.push(s.lienResident);

    return `<div class="sa2-f" style="--pc:${col}">
      <span class="sa2-f-sc">${pct === null ? '—' : pct + '%'}</span>
      <div class="sa2-f-mid">
        <div class="sa2-f-n">${escHtml(s.repondant || 'Anonyme')}</div>
        <div class="sa2-f-m">${escHtml(meta.join(' · '))}</div>
        ${s.commentaire ? `<div class="sa2-f-c">« ${escHtml(s.commentaire)} »</div>` : ''}
      </div>
      <div class="sa2-acts">
        <button type="button" class="sa2-act" style="--ac:#818cf8" title="Modifier" aria-label="Modifier" onclick="openSatModal('${escAttr(s.id)}')">${_sa2Svg(SA2_IC.pen)}</button>
        <button type="button" class="sa2-act" style="--ac:#ef4444" title="Supprimer" aria-label="Supprimer" onclick="deleteSat('${escAttr(s.id)}')">${_sa2Svg(SA2_IC.trash)}</button>
      </div>
    </div>`;
  }).join('') + '</div></div></div>';
}

// ── VUE QUESTIONS (admin) ─────────────────────────────────────────────
function sat2QuestionsView() {
  const box = document.getElementById('satContent');
  if (!box) return;

  const base = (typeof SAT_QUESTIONS !== 'undefined') ? SAT_QUESTIONS : [];
  const custom = (typeof getCustomQuestions === 'function' ? getCustomQuestions() : []) || [];
  const allCats = [...new Set(base.map(q => q.cat)), 'Autre'];

  const bloc = (qs, editable) => {
    const cats = [...new Set(qs.map(q => q.cat))];
    if (!qs.length) return `<div class="v2-blk-vide">Aucune question personnalisée pour l'instant.</div>`;
    const lc = editable ? '#f59e0b' : '#8095b4';
    return cats.map(cat => `
      <div style="margin-bottom:10px">
        <div class="dc-eyebrow" style="margin-bottom:7px">${escHtml(cat)}</div>
        ${qs.filter(q => q.cat === cat).map(q => `<div class="sa2-qi" style="border-left:3px solid ${lc};padding-left:11px">
          <span class="sa2-qi-l">${escHtml(q.label)}</span>
          ${editable
            ? `<button type="button" class="sa2-act" style="--ac:#ef4444" title="Supprimer" aria-label="Supprimer la question" onclick="deleteCustomQuestion('${escAttr(q.id)}')">${_sa2Svg(SA2_IC.trash)}</button>`
            : '<span class="sa2-qi-tag">défaut</span>'}
        </div>`).join('')}
      </div>`).join('');
  };

  box.innerHTML = `<div class="sa2-body" style="grid-template-columns:1fr 1fr">
    <div class="sa2-col">
      <div class="dc-card">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:#6366f122;color:#6366f1">${_sa2Svg(SA2_IC.plus)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">Référentiel</div><div class="dc-title">Ajouter une question</div></div>
          </div>
        </div>
        <div class="dc-body">
          <div class="sa2-qadd">
            <input type="text" id="satNewQLabel" class="v2-fld" placeholder="Libellé de la question…"/>
            <button type="button" class="v2-btn-pri" style="padding:0 18px" onclick="addCustomQuestion()">${_sa2Svg(SA2_IC.plus, 2.4)} Ajouter</button>
          </div>
          <div class="sa2-qgrid">
            <div>
              <label class="v2-fld-l" for="satNewQCatSelect">Catégorie existante</label>
              <select id="satNewQCatSelect" class="v2-fld" onchange="document.getElementById('satNewQCatWrap').style.display=this.value==='__new'?'':'none'">
                ${allCats.map(c => `<option value="${escAttr(c)}">${escHtml(c)}</option>`).join('')}
                <option value="__new">+ Nouvelle catégorie…</option>
              </select>
            </div>
            <div id="satNewQCatWrap" style="display:none">
              <label class="v2-fld-l" for="satNewQCatCustom">Ou nouvelle catégorie</label>
              <input type="text" id="satNewQCatCustom" class="v2-fld" placeholder="Nom de la catégorie"/>
            </div>
          </div>
        </div>
      </div>
      <div class="dc-card">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:#8095b422;color:#8095b4">${_sa2Svg(SA2_IC.doc)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">Non modifiables</div><div class="dc-title">Questions par défaut</div></div>
          </div>
          <span class="dc-pill dim">${base.length}</span>
        </div>
        <div class="dc-body">${bloc(base, false)}</div>
      </div>
    </div>
    <div class="sa2-col">
      <div class="dc-card">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:#f59e0b22;color:#f59e0b">${_sa2Svg(SA2_IC.pen)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">Sur mesure</div><div class="dc-title">Questions personnalisées</div></div>
          </div>
          <span class="dc-pill dim">${custom.length}</span>
        </div>
        <div class="dc-body">${bloc(custom, true)}</div>
      </div>
    </div>
  </div>`;
}

// ── MODALE : bloc des questions notées ────────────────────────────────
// Contrat conservé : un radio par valeur, nommé `sat_<idQuestion>`.
function sat2ModalQ(allQ, s) {
  const cats = [...new Set(allQ.map(q => q.cat))];
  return cats.map(cat => `<div class="sa2-qblock">
    <div class="dc-eyebrow" style="margin-bottom:9px">${escHtml(cat)}</div>
    ${allQ.filter(q => q.cat === cat).map(q => {
      const val = s?.reponses?.[q.id];
      return `<div class="sa2-q">
        <div class="sa2-q-l">${escHtml(q.label)}</div>
        <div class="sa2-scale">
          ${[0, 1, 2, 3, 4].map(v => `<label class="sa2-o" style="--oc:${SA2_OPT_C[v]}" title="${escAttr(SAT_LABELS[v])}">
            <input type="radio" name="sat_${escAttr(q.id)}" value="${v}"${Number(val) === v ? ' checked' : ''}/>
            <span class="sa2-o-d"></span>
            <span class="sa2-o-t">${escHtml(SA2_OPT_L[v])}</span>
          </label>`).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`).join('');
}
