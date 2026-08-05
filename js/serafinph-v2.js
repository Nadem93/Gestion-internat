/* ══════════════════════════════════════════════════════════════════════════
   SERAFIN-PH — rendu V2 (thème sombre)
   Ce module ne touche PAS à la couche de données : il réutilise
   residentsList() / getSpData() / SP_NOMENCLATURE / getSpJournalStats()
   déjà fournis par js/app.js et js/serafinph.js.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Couleurs des 5 niveaux SERAFIN-PH (0 = nul … 4 = très important)
  const NIV_C = ['#7f93b3', '#22c55e', '#eab308', '#f97316', '#ef4444'];
  const NIV_L = ['Nul', 'Faible', 'Modéré', 'Important', 'Très important'];

  // État local de l'écran (filtres) — aucune persistance.
  const state = { cat: 'toutes', q: '' };

  const esc = s => (typeof escHtml === 'function' ? escHtml(s == null ? '' : String(s)) : String(s == null ? '' : s));
  const col = (c, f) => (typeof safeColor === 'function' ? safeColor(c, f) : (c || f));

  // ── Calculs ───────────────────────────────────────────────────────────
  function computeScores() {
    const residents = (typeof residentsList === 'function' ? residentsList() : []) || [];
    const scored = residents
      .map(r => {
        const sp = getSpData(r);
        const sum = Object.values(sp.prestations).reduce((a, p) => a + p.niveau, 0);
        return { resident: r, sp, total: sum, gmpsResident: sp.selected.length ? sum / sp.selected.length : 0 };
      })
      .filter(s => s.sp.selected.length > 0);
    return { residents, scored };
  }

  function computePrestations(scored) {
    return SP_NOMENCLATURE.map(p => {
      const niveaux = scored.filter(s => s.sp.selected.includes(p.code)).map(s => s.sp.prestations[p.code].niveau);
      const repart = [0, 0, 0, 0, 0];
      niveaux.forEach(n => { if (n >= 0 && n <= 4) repart[n]++; });
      const moy = niveaux.length ? (niveaux.reduce((a, n) => a + n, 0) / niveaux.length).toFixed(1) : '—';
      return Object.assign({}, p, { moy, repart, count: niveaux.length });
    });
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  function render() {
    const { residents, scored } = computeScores();
    const total = residents.length;

    // KPI
    const gmps = scored.length ? (scored.reduce((a, s) => a + s.gmpsResident, 0) / scored.length).toFixed(1) : '—';
    const totalScore = scored.reduce((a, s) => a + s.total, 0);
    const nbEleves = scored.filter(s => Object.values(s.sp.prestations).some(p => p.niveau >= 3)).length;

    setTxt('spStatGmps', gmps);
    setTxt('spStatTotal', totalScore);
    setTxt('spStatEvalues', scored.length + '/' + total);
    setTxt('spStatEleves', nbEleves);

    const pctEval = total ? Math.round(scored.length / total * 100) : 0;
    setTxt('spStatGmpsSub', scored.length ? 'moyenne sur ' + scored.length + ' profil' + (scored.length > 1 ? 's' : '') : 'aucun profil évalué');
    setTxt('spStatTotalSub', 'cumul des niveaux sélectionnés');
    setTxt('spStatEvaluesSub', pctEval + ' % de l’effectif');
    setTxt('spStatElevesSub', 'au moins une prestation ≥ 3');

    renderJournal();
    renderPrestations(scored);
    renderResidents(scored);
    renderLegend();
  }

  function setTxt(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

  function renderJournal() {
    const el = document.getElementById('spJournalStats');
    if (!el) return;
    let j = { direct: 0, indirect: 0, total: 0 };
    try { if (typeof getSpJournalStats === 'function') j = getSpJournalStats(); }
    catch (e) { console.warn('SERAFIN-PH : statistiques journal indisponibles', e); }

    el.innerHTML = j.total > 0
      ? '<div class="sp2-jrn">'
        + '<span class="dc-badge" style="background:#8b5cf61f;color:#a78bfa;border:1px solid #8b5cf644"><span class="d" style="background:#8b5cf6"></span>' + j.direct + ' directe' + (j.direct > 1 ? 's' : '') + '</span>'
        + '<span class="dc-badge" style="background:#f973161f;color:#fdba74;border:1px solid #f9731644"><span class="d" style="background:#f97316"></span>' + j.indirect + ' indirecte' + (j.indirect > 1 ? 's' : '') + '</span>'
        + '<span class="dc-pill dim">Total : ' + j.total + ' entrée' + (j.total > 1 ? 's' : '') + ' de journal taguée' + (j.total > 1 ? 's' : '') + '</span>'
        + '</div>'
      : '<div class="v2-blk-vide">Aucune entrée de journal associée au SERAFIN-PH. Utilisez le champ « SERAFIN-PH » du journal pour taguer vos transmissions.</div>';
  }

  function renderLegend() {
    const el = document.getElementById('spResidentsLegend');
    if (!el) return;
    el.innerHTML = NIV_C.map((c, i) =>
      '<span class="sp2-leg-i"><span class="sp2-leg-b" style="--lc:' + c + '">' + i + '</span>' + NIV_L[i] + '</span>'
    ).join('');
  }

  function renderPrestations(scored) {
    const el = document.getElementById('spPrestationsList');
    if (!el) return;
    const all = computePrestations(scored);
    const list = state.cat === 'toutes' ? all : all.filter(p => p.cat.toLowerCase() === state.cat);

    // Compteurs des chips
    setTxt('spCatToutesN', all.length);
    setTxt('spCatDirecteN', all.filter(p => p.cat === 'Directe').length);
    setTxt('spCatIndirecteN', all.filter(p => p.cat === 'Indirecte').length);

    if (!list.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune prestation dans ce filtre.</div>'; return; }

    el.innerHTML = list.map(p => {
      const pc = p.cat === 'Directe' ? '#8b5cf6' : '#f97316';
      const rep = p.count
        ? p.repart.map((c, i) =>
            '<div class="sp2-rep" style="--lc:' + NIV_C[i] + '">'
            + '<span class="sp2-rep-n">' + i + '</span>'
            + '<span class="sp2-rep-b"><span style="width:' + (c / p.count * 100).toFixed(0) + '%"></span></span>'
            + '<span class="sp2-rep-c">' + c + '</span>'
            + '</div>'
          ).join('')
        : '<div class="sp2-rep-vide">Aucun résident ne suit cette prestation</div>';
      return '<div class="sp2-prest" style="--pc:' + pc + ';border-left:3px solid ' + pc + ';padding-left:11px" role="button" tabindex="0"'
        + ' data-code="' + esc(p.code) + '" aria-label="Détail de la prestation ' + esc(p.label) + '">'
        + '<span class="sp2-prest-ico">' + esc(p.icon) + '</span>'
        + '<div class="sp2-prest-id">'
          + '<div class="sp2-prest-n">' + esc(p.label) + '<span class="sp2-prest-c">' + esc(p.code) + '</span></div>'
          + '<div class="sp2-prest-m">' + esc(p.cat) + ' · ' + p.count + ' résident' + (p.count > 1 ? 's' : '') + ' suivi' + (p.count > 1 ? 's' : '') + '</div>'
        + '</div>'
        + '<div class="sp2-prest-rep">' + rep + '</div>'
        + '<div class="sp2-prest-moy' + (p.count ? '' : ' off') + '">' + p.moy + '</div>'
        + '</div>';
    }).join('');
  }

  function renderResidents(scored) {
    const el = document.getElementById('spResidentsList');
    if (!el) return;
    const q = state.q.trim().toLowerCase();
    const list = scored
      .slice()
      .sort((a, b) => b.total - a.total)
      .filter(s => !q || ((s.resident.prenom || '') + ' ' + (s.resident.nom || '')).toLowerCase().includes(q));

    setTxt('spResidentsCount', list.length + (scored.length !== list.length ? ' / ' + scored.length : '') + ' résident' + (list.length > 1 ? 's' : ''));

    if (!list.length) {
      el.innerHTML = '<div class="v2-blk-vide">' + (q ? 'Aucun résident ne correspond à cette recherche.' : 'Aucun résident évalué.') + '</div>';
      return;
    }

    el.innerHTML = list.map(s => {
      const c = col(s.resident.color, '#818cf8');
      const ini = ((s.resident.prenom || '')[0] || '') + ((s.resident.nom || '')[0] || '');
      const tags = SP_NOMENCLATURE.filter(p => s.sp.selected.includes(p.code)).map(p => {
        const n = s.sp.prestations[p.code].niveau;
        return '<span class="sp2-tag" style="--lc:' + NIV_C[n] + '" title="' + esc(p.label + ' — ' + NIV_L[n]) + '">'
          + '<span class="sp2-tag-n">' + n + '</span>' + esc(p.icon) + ' ' + esc(p.label) + '</span>';
      }).join('');
      const dt = s.sp.dateEvaluation
        ? 'Évalué le ' + new Date(s.sp.dateEvaluation).toLocaleDateString('fr-FR')
        : 'Date d’évaluation non renseignée';
      return '<div class="sp2-res" style="border-left:3px solid ' + c + ';padding-left:11px">'
        + '<span class="sp2-res-av" style="--rc:' + c + '">' + esc(ini.toUpperCase()) + '</span>'
        + '<div class="sp2-res-b">'
          + '<div class="sp2-res-n">' + esc((s.resident.prenom || '') + ' ' + (s.resident.nom || '')) + '</div>'
          + '<div class="sp2-res-m">' + s.sp.selected.length + ' prestation' + (s.sp.selected.length > 1 ? 's' : '')
            + ' · GMPS ' + s.gmpsResident.toFixed(1) + ' · ' + esc(dt) + '</div>'
          + '<div class="sp2-res-tags">' + tags + '</div>'
        + '</div>'
        + '<div class="sp2-res-tot"><div class="sp2-res-tot-n">' + s.total + '</div><div class="sp2-res-tot-l">Score</div></div>'
        + '</div>';
    }).join('');
  }

  // ── Modale : détail d'une prestation ──────────────────────────────────
  function openPrestation(code) {
    const p = SP_NOMENCLATURE.find(x => x.code === code);
    if (!p) return;
    const { scored } = computeScores();
    const suivis = scored
      .filter(s => s.sp.selected.includes(code))
      .map(s => ({ s: s, n: s.sp.prestations[code].niveau }))
      .sort((a, b) => b.n - a.n);

    const ov = document.getElementById('spPrestOv');
    if (!ov) return;
    const pc = p.cat === 'Directe' ? '#8b5cf6' : '#f97316';
    ov.querySelector('.v2-md').style.setProperty('--mc', pc);
    setTxt('spPrestT', p.label);
    setTxt('spPrestS', p.code + ' · prestation ' + p.cat.toLowerCase());
    const ico = document.getElementById('spPrestIco');
    if (ico) { ico.textContent = p.icon; ico.style.background = 'color-mix(in srgb,' + pc + ' 16%, transparent)'; }

    const body = document.getElementById('spPrestB');
    if (body) {
      const moy = suivis.length ? (suivis.reduce((a, x) => a + x.n, 0) / suivis.length).toFixed(1) : '—';
      body.innerHTML =
        '<div class="dc-eyebrow" style="margin-bottom:12px">Niveau moyen ' + moy + ' · ' + suivis.length + ' résident' + (suivis.length > 1 ? 's' : '') + '</div>'
        + (suivis.length
          ? suivis.map(x => {
              const c = col(x.s.resident.color, '#818cf8');
              const ini = ((x.s.resident.prenom || '')[0] || '') + ((x.s.resident.nom || '')[0] || '');
              return '<div class="sp2-md-row">'
                + '<span class="sp2-res-av" style="--rc:' + c + ';width:32px;height:32px;font-size:11px">' + esc(ini.toUpperCase()) + '</span>'
                + '<span class="sp2-md-n">' + esc((x.s.resident.prenom || '') + ' ' + (x.s.resident.nom || '')) + '</span>'
                + '<span class="dc-badge" style="background:' + NIV_C[x.n] + '1f;color:' + NIV_C[x.n] + ';border:1px solid ' + NIV_C[x.n] + '55"><span class="d" style="background:' + NIV_C[x.n] + '"></span>' + x.n + ' · ' + esc(NIV_L[x.n]) + '</span>'
                + '</div>';
            }).join('')
          : '<div class="v2-blk-vide">Aucun résident ne suit cette prestation.</div>');
    }
    ov.classList.add('open');
  }

  function closePrestation() {
    const ov = document.getElementById('spPrestOv');
    if (ov) ov.classList.remove('open');
  }

  // ── Interactions ──────────────────────────────────────────────────────
  function bind() {
    const list = document.getElementById('spPrestationsList');
    if (list) {
      list.addEventListener('click', e => {
        const row = e.target.closest('.sp2-prest');
        if (row) openPrestation(row.dataset.code);
      });
      list.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const row = e.target.closest('.sp2-prest');
        if (row) { e.preventDefault(); openPrestation(row.dataset.code); }
      });
    }

    document.querySelectorAll('[data-sp-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cat = btn.dataset.spCat;
        document.querySelectorAll('[data-sp-cat]').forEach(b => b.classList.toggle('on', b === btn));
        renderPrestations(computeScores().scored);
      });
    });

    const search = document.getElementById('spResidentsSearch');
    if (search) {
      search.addEventListener('input', () => { state.q = search.value; renderResidents(computeScores().scored); });
      search.addEventListener('click', e => e.stopPropagation());
    }

    const ov = document.getElementById('spPrestOv');
    if (ov) ov.addEventListener('click', e => { if (e.target === ov) closePrestation(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePrestation(); });
  }

  // Repli / dépli de la carte « Détail par résident » (remplace l'ancien
  // toggleSpResidentsCard tout en gardant le même nom global).
  function toggleResidents(force) {
    const body = document.getElementById('spResidentsBody');
    const btn = document.getElementById('spResidentsToggle');
    if (!body) return;
    const open = typeof force === 'boolean' ? force : body.style.display === 'none';
    body.style.display = open ? '' : 'none';
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // Publication explicite : un `const`/`function` de module ne crée pas de
  // propriété sur window, or les onclick inline du HTML les appellent.
  window.sp2Render = render;
  window.sp2OpenPrestation = openPrestation;
  window.sp2ClosePrestation = closePrestation;
  window.toggleSpResidentsCard = toggleResidents;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
