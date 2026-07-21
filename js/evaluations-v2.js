/* ══════════════════════════════════════════════════════════════════════
   INTERNALIS — Grilles d'évaluation · rendu design V2 (sombre)

   js/objectifs-v2.js couvre déjà la LISTE de l'onglet « Grilles
   d'évaluation » (stats, puces, lignes, détail par domaine, progression).
   Ce module reprend ce qu'il ne touche pas : le CORPS DES MODALES rendu
   par js/evaluations.js (formulaire de saisie, score en direct, détail),
   qui était resté en surfaces claires.

   Aucune couche Supabase réécrite : on réutilise EV_GRILLES, getEv(),
   _evScore(), _evNiveau(), sbResidents(), saveEvaluation(), deleteEv().
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (typeof EV_GRILLES === 'undefined') {
    console.warn('[evaluations-v2] EV_GRILLES introuvable — js/evaluations.js doit être chargé avant.');
    return;
  }

  var esc = function (s) {
    return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var grilleOf = function (id) { return EV_GRILLES[id] || null; };
  var scoreOf  = function (e) { return typeof _evScore === 'function' ? _evScore(e) : 0; };
  var nivOf    = function (g, s) { return typeof _evNiveau === 'function' ? _evNiveau(g, s) : null; };

  /* Palette lisible sur fond nuit (les verts/oranges V1 y sont illisibles). */
  var C_OK = '#34d399', C_MID = '#fbbf24', C_KO = '#fca5a5';

  /* Couleur d'un item : la MIF/Barthel se lisent « plus haut = mieux »,
     SERAFIN-PH l'inverse (plus haut = besoin plus important). */
  function itemColor(grille, val, max) {
    var ratio = max ? val / max : 0;
    var bon = grille === 'serafin' ? 1 - ratio : ratio;
    return bon >= .78 ? C_OK : (bon >= .45 ? C_MID : C_KO);
  }

  /* ── Bandeau « échelle de cotation » ─────────────────────────────── */
  function scaleBloc(g, titre, note) {
    var items = g.scaleItems || [];
    if (!items.length) return '';
    return '<div class="ev2-scale ev2" style="--c:' + g.color + '">'
      + '<div class="ev2-scale-t">' + esc(titre) + '</div>'
      + '<div class="ev2-scale-g" style="grid-template-columns:repeat(' + items.length + ',1fr)">'
      + items.map(function (s) {
        return '<div class="ev2-scale-c"><div class="ev2-scale-v">' + s.val + '</div>'
          + '<div class="ev2-scale-l">' + esc(s.label) + '</div></div>';
      }).join('')
      + '</div>'
      + (note ? '<div class="ev2-scale-n">' + esc(note) + '</div>' : '')
      + '</div>';
  }

  /* ── Formulaire de saisie (#evFormBody) ──────────────────────────── */
  function ev2RenderForm(scores) {
    var grille = (document.getElementById('evModalGrille') || {}).value
      || (typeof _evGrille !== 'undefined' ? _evGrille : 'mif') || 'mif';
    var g = grilleOf(grille);
    if (!g) return;
    var container = document.getElementById('evFormBody');
    if (!container) return;
    container.className = 'ev2';

    var html = '';

    if (grille === 'mif') {
      html = scaleBloc(g, 'Échelle de cotation (1 → 7)', '')
        + g.dimensions.map(function (dim) {
          return '<div class="ev2-dim" style="--c:' + g.color + '">'
            + '<div class="ev2-dim-t">' + esc(dim.label) + '</div>'
            + dim.items.map(function (it) {
              var val = (scores || {})[it.id];
              return '<div class="ev2-row">'
                + '<label class="ev2-row-l" for="ev2_' + esc(it.id) + '">' + esc(it.label) + '</label>'
                + '<select class="ev2-sel ev2-sel-w" id="ev2_' + esc(it.id) + '" name="score_' + esc(it.id) + '" aria-label="' + esc(it.label) + '">'
                + '<option value="">—</option>'
                + [7, 6, 5, 4, 3, 2, 1].map(function (v) {
                  return '<option value="' + v + '"' + (Number(val) === v ? ' selected' : '') + '>' + v + '</option>';
                }).join('')
                + '</select></div>';
            }).join('')
            + '</div>';
        }).join('');

    } else if (grille === 'barthel') {
      html = (g.dimensions[0].items || []).map(function (it) {
        var val = (scores || {})[it.id];
        var mx = Math.max.apply(null, (it.opts || []).map(function (o) { return o.v; }).concat([1]));
        return '<div class="ev2-item" style="--c:' + g.color + '">'
          + '<div class="ev2-item-t">' + esc(it.label) + '</div>'
          + '<div class="ev2-opts" role="group" aria-label="' + esc(it.label) + '">'
          + (it.opts || []).map(function (o) {
            return '<label class="ev2-opt" style="--c:' + itemColor(grille, o.v, mx) + '">'
              + '<input type="radio" name="score_' + esc(it.id) + '" value="' + o.v + '"'
              + (Number(val) === o.v ? ' checked' : '') + '/>' + esc(o.l) + ' <b>' + o.v + '</b></label>';
          }).join('')
          + '</div></div>';
      }).join('');

    } else if (grille === 'serafin') {
      if (!g.dimensions.length) {
        container.innerHTML = '<div class="ev2-vide">Nomenclature SERAFIN-PH non chargée sur cette page '
          + '(js/serafin-codage.js).</div>';
        bindLive(container);
        ev2UpdateLiveScore();
        return;
      }
      html = scaleBloc(g, 'Niveau de besoin (0 → 4)',
          'Positionnement du résident sur la nomenclature nationale des besoins SERAFIN-PH — '
        + "support d'échange en équipe pluridisciplinaire.")
        + g.dimensions.map(function (dim) {
          return '<div class="ev2-dim" style="--c:' + g.color + '">'
            + '<div class="ev2-dim-t">' + esc(dim.label) + '</div>'
            + dim.items.map(function (it) {
              var val = (scores || {})[it.id];
              return '<div class="ev2-row">'
                + '<label class="ev2-row-l" for="ev2_' + esc(it.id) + '">' + esc(it.label) + '</label>'
                + '<select class="ev2-sel ev2-sel-l" id="ev2_' + esc(it.id) + '" name="score_' + esc(it.id) + '" aria-label="' + esc(it.label) + '">'
                + '<option value="">—</option>'
                + (g.scaleItems || []).map(function (s) {
                  return '<option value="' + s.val + '"'
                    + (val !== undefined && val !== '' && Number(val) === s.val ? ' selected' : '') + '>'
                    + s.val + ' — ' + esc(s.label) + '</option>';
                }).join('')
                + '</select></div>';
            }).join('')
            + '</div>';
        }).join('');
    }

    container.innerHTML = html;
    bindLive(container);
    ev2UpdateLiveScore();
  }

  /* Un seul écouteur, même si la modale est rouverte dix fois. */
  function bindLive(container) {
    if (container.dataset.ev2Bound === '1') return;
    container.dataset.ev2Bound = '1';
    container.addEventListener('change', ev2UpdateLiveScore);
  }

  /* ── Score en direct (#evLiveScore) ──────────────────────────────── */
  function ev2UpdateLiveScore() {
    var grille = (document.getElementById('evModalGrille') || {}).value || 'mif';
    var g = grilleOf(grille);
    if (!g) return;
    var total = 0, remplis = 0;
    document.querySelectorAll('#evFormBody [name^="score_"]').forEach(function (el) {
      if ((el.type === 'radio' && el.checked) || el.tagName === 'SELECT') {
        if (el.value === '') return;
        var v = Number(el.value);
        if (isNaN(v)) return;
        remplis++;
        if (v > 0) total += v;
      }
    });
    var niveau = nivOf(grille, total);
    var col = (niveau && niveau.color) || g.color;
    var el = document.getElementById('evLiveScore');
    if (!el) return;
    el.style.setProperty('--c', col);
    if (!remplis) { el.textContent = 'Remplissez les items ci-dessous…'; return; }
    el.innerHTML = '<span class="ev2-live-v">' + total + '</span>'
      + '<span class="ev2-live-m">/ ' + g.scoreMax + '</span>'
      + '<span class="ev2-live-n">' + esc((niveau && niveau.label) || '') + '</span>';
  }

  /* ── Modale de détail (#evDetailBody) ────────────────────────────── */
  function ev2OpenEvDetail(id) {
    var body = document.getElementById('evDetailBody');
    var ev = (typeof getEv === 'function' ? getEv() : []).find(function (x) { return x.id === id; });
    if (!ev || !body) return;
    var g = grilleOf(ev.grille);
    if (!g) return;

    var score = scoreOf(ev);
    var niveau = nivOf(ev.grille, score);
    var col = (niveau && niveau.color) || g.color;
    var residents = typeof sbResidents === 'function' ? sbResidents() : [];
    var r = residents.find(function (x) { return String(x.id) === String(ev.residentId); });
    var nom = r ? ((r.prenom || '') + ' ' + (r.nom || '')).trim() : 'Résident inconnu';
    var dateStr = ev.date
      ? new Date(ev.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';

    var ligne = function (label, val, txt, max) {
      return '<div class="ev2-d-item" style="--vc:' + itemColor(ev.grille, val, max) + '">'
        + '<span class="ev2-d-item-l">' + esc(label) + '</span>'
        + '<span class="ev2-d-item-v">' + val + (txt ? ' — ' + esc(txt) : '') + '</span></div>';
    };

    var detail = '';
    if (ev.grille === 'mif' || ev.grille === 'serafin') {
      var mx = Math.max.apply(null, (g.scaleItems || []).map(function (s) { return s.val; }).concat([1]));
      detail = g.dimensions.map(function (dim) {
        var items = dim.items.filter(function (it) { return (ev.scores || {})[it.id] !== undefined; });
        if (!items.length) return '';
        return '<div class="ev2-d-dim" style="--c:' + g.color + '">'
          + '<div class="ev2-d-dim-t">' + esc(dim.label) + '</div>'
          + items.map(function (it) {
            var v = Number(ev.scores[it.id]);
            var sc = (g.scaleItems || []).find(function (s) { return s.val === v; });
            return ligne(it.label, v, sc && sc.label, mx);
          }).join('')
          + '</div>';
      }).join('');
    } else if (ev.grille === 'barthel') {
      detail = (g.dimensions[0].items || [])
        .filter(function (it) { return (ev.scores || {})[it.id] !== undefined; })
        .map(function (it) {
          var v = Number(ev.scores[it.id]);
          var opt = (it.opts || []).find(function (o) { return o.v === v; });
          var m = Math.max.apply(null, (it.opts || []).map(function (o) { return o.v; }).concat([1]));
          return ligne(it.label, v, opt && opt.l, m);
        }).join('');
    }
    if (!detail) detail = '<div class="ev2-vide">Aucun item renseigné sur cette évaluation.</div>';

    var pct = g.scoreMax ? Math.round(score / g.scoreMax * 100) : 0;
    body.className = 'v2-md-b ev2-d';
    body.style.setProperty('--c', col);
    body.innerHTML =
      '<div class="ev2-d-head">'
      + '<div class="ev2-d-date">' + esc(dateStr) + '</div>'
      + '<div class="ev2-d-sub">' + esc(nom) + ' — ' + esc(g.label) + '</div>'
      + '<div class="ev2-d-score">' + score + '<span> / ' + g.scoreMax + '</span></div>'
      + (niveau ? '<div class="ev2-d-niv">' + esc(niveau.label) + '</div>' : '')
      + '<div class="ev2-d-bar"><i style="width:' + pct + '%"></i></div>'
      + '</div>'
      + detail
      + (ev.note ? '<div class="ev2-d-note">' + esc(ev.note) + '</div>' : '');

    if (typeof openModal === 'function') openModal('modalEvDetail');
  }

  /* ── Publication : ces fonctions sont appelées par onclick inline et
        par js/evaluations.js — il faut les poser sur window. ───────── */
  window._renderEvForm       = ev2RenderForm;
  window._updateEvLiveScore  = ev2UpdateLiveScore;
  window.openEvDetail        = ev2OpenEvDetail;
  window.ev2RenderForm       = ev2RenderForm;
  window.ev2OpenEvDetail     = ev2OpenEvDetail;

  /* Si la modale de saisie est déjà ouverte au moment du chargement
     (script injecté), on repeint son corps. */
  if (document.getElementById('evFormBody') && document.getElementById('evFormBody').innerHTML.trim()) {
    try { ev2RenderForm(); } catch (e) { console.warn('[evaluations-v2] repeint impossible', e); }
  }
})();
