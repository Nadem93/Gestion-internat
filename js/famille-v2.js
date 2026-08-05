/* ══════════════════════════════════════════════════════════════════════════
   INTERNALIS — Portail famille : rendu V2 (thème sombre « bento »)

   LECTURE SEULE. Ce module ne fait QUE du rendu : il réutilise la couche
   Supabase existante (js/famille-supabase.js) sans la modifier et n'ouvre
   aucune écriture. Le filtrage des documents reste intégralement côté base
   (RPC get_mes_documents_famille + edge function get-shared-document-url) :
   les chips ci-dessous ne filtrent que l'affichage de ce que la base a
   déjà autorisé.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CAT = {
    admin:    { l: 'Administratif', c: '#818cf8' },
    medical:  { l: 'Médical',       c: '#ef4444' },
    scolaire: { l: 'Scolaire',      c: '#22d3ee' },
    autre:    { l: 'Autre',         c: '#8b5cf6' }
  };
  var AV = [
    ['#818cf8', '#a5b4fc'], ['#22d3ee', '#a5f3fc'], ['#10b981', '#5eead4'],
    ['#f59e0b', '#fcd34d'], ['#ec4899', '#f9a8d4'], ['#8b5cf6', '#c4b5fd']
  ];

  var IC = {
    doc:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    fold: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    open: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  };

  function svg(path, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  function esc(s) {
    return (typeof escHtml === 'function') ? escHtml(s == null ? '' : String(s))
      : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
  }
  function fdate(d) {
    if (!d) return '';
    if (typeof formatDate === 'function') { try { return formatDate(d); } catch (e) {} }
    return String(d);
  }
  function cat(k) { return CAT[k] || { l: k || 'Document', c: '#818cf8' }; }
  function ini(nom) {
    return String(nom || '?').trim().split(/\s+/).slice(0, 2)
      .map(function (m) { return m.charAt(0); }).join('').toUpperCase() || '?';
  }
  // Le rang évite que deux noms proches (une fratrie) tombent sur la même teinte.
  function pal(nom, rang) {
    var h = 0, s = String(nom || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AV[(h + (rang || 0)) % AV.length];
  }

  var state = { docs: [], filtre: 'tous', chargee: false };

  /* ── Rendu : accueil ──────────────────────────────────────────────── */
  function renderWelcome() {
    var el = document.getElementById('famWelcome');
    if (!el) return;
    var prenom = '';
    try { prenom = ((Auth.getSession() || {}).prenom || '').trim(); } catch (e) {}
    el.innerHTML =
      '<h1 class="fam-hero-t">Bonjour' + (prenom ? ' ' + esc(prenom) : '') + ' <span aria-hidden="true">👋</span></h1>' +
      '<div class="fam-hero-s">Voici les documents mis à votre disposition par l\'établissement.</div>';
  }

  /* ── Rendu : tuiles bento ─────────────────────────────────────────── */
  function renderKpis(docs) {
    var el = document.getElementById('famKpis');
    if (!el) return;
    if (!docs.length) { el.innerHTML = ''; return; }

    var residents = {}, cats = {}, dates = [];
    docs.forEach(function (d) {
      if (d.residentNom) residents[d.residentNom] = 1;
      if (d.category) cats[d.category] = (cats[d.category] || 0) + 1;
      if (d.docDate) dates.push(d.docDate);
    });
    dates.sort();
    var dernier = dates.length ? fdate(dates[dates.length - 1]) : null;
    var nbRes = Object.keys(residents).length;
    var nbCat = Object.keys(cats).length;

    var tiles = [
      { n: String(docs.length), l: 'Document' + (docs.length > 1 ? 's' : '') + ' partagé' + (docs.length > 1 ? 's' : ''),
        s: 'mis à disposition', i: IC.fold, c: '#4f46e5', c2: '#818cf8' },
      { n: String(nbRes), l: nbRes > 1 ? 'Personnes suivies' : 'Personne suivie',
        s: 'dossier' + (nbRes > 1 ? 's' : '') + ' concerné' + (nbRes > 1 ? 's' : ''), i: IC.user, c: '#0891b2', c2: '#22d3ee' },
      { n: String(nbCat), l: nbCat > 1 ? 'Catégories' : 'Catégorie',
        s: Object.keys(cats).map(function (k) { return cat(k).l; }).join(' · ') || '—', i: IC.doc, c: '#8b5cf6', c2: '#a78bfa' },
      { n: dernier || '—', l: 'Document le plus récent',
        s: dernier ? 'date du document' : 'aucune date renseignée', i: IC.clock, c: '#16a34a', c2: '#4ade80' }
    ];

    el.innerHTML = tiles.map(function (t) {
      var petit = t.n.length > 5 ? ' style="font-size:16px"' : '';
      return '<div class="dc-kpi" style="--dc-c:' + t.c2 + '">' +
        '<div class="dc-kpi-top">' +
          '<span class="dc-kpi-label">' + esc(t.l) + '</span>' +
          '<span class="dc-kpi-ico" style="color:' + t.c2 + '">' + svg(t.i) + '</span>' +
        '</div>' +
        '<div class="dc-kpi-val"' + petit + '>' + esc(t.n) + '</div>' +
        '<div class="dc-kpi-sub">' + esc(t.s) + '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Rendu : chips de filtre (affichage seulement) ────────────────── */
  function renderChips(docs) {
    var el = document.getElementById('famChips');
    if (!el) return;
    var cats = {};
    docs.forEach(function (d) { var k = d.category || 'autre'; cats[k] = (cats[k] || 0) + 1; });
    var keys = Object.keys(cats);
    if (!docs.length || keys.length < 2) { el.innerHTML = ''; return; }

    var items = [{ k: 'tous', l: 'Tous', n: docs.length, c: '#818cf8' }].concat(
      keys.map(function (k) { return { k: k, l: cat(k).l, n: cats[k], c: cat(k).c }; })
    );
    el.innerHTML = items.map(function (it) {
      var on = state.filtre === it.k;
      return '<button type="button" class="v2-chip-f fam-chip' + (on ? ' on' : '') + '"' +
        ' data-cat="' + esc(it.k) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="dot" style="background:' + it.c + '"></span>' +
        esc(it.l) + ' <span class="n">' + it.n + '</span></button>';
    }).join('');

    Array.prototype.forEach.call(el.querySelectorAll('.fam-chip'), function (b) {
      b.addEventListener('click', function () {
        state.filtre = b.getAttribute('data-cat');
        renderChips(state.docs);
        renderBlocs(state.docs);
      });
    });
  }

  /* ── Rendu : blocs résident + lignes documents ────────────────────── */
  function vide(titre, texte) {
    return '<div class="dc-card"><div class="dc-body"><div class="fam-vide">' +
      '<div class="fam-vide-ico">' + svg(IC.fold) + '</div>' +
      '<div class="fam-vide-t">' + esc(titre) + '</div>' +
      '<div class="fam-vide-s">' + esc(texte) + '</div>' +
    '</div></div></div>';
  }

  function renderBlocs(docs) {
    var el = document.getElementById('famResidents');
    if (!el) return;

    if (!docs.length) {
      el.innerHTML = vide(
        "Aucun document n'a encore été partagé avec vous.",
        "C'est normal si l'équipe n'a rien à transmettre pour le moment. Vous serez prévenu(e) dès qu'un nouveau document sera disponible."
      );
      return;
    }

    var liste = state.filtre === 'tous' ? docs : docs.filter(function (d) {
      return (d.category || 'autre') === state.filtre;
    });
    if (!liste.length) {
      el.innerHTML = vide('Aucun document dans cette catégorie.',
        'Choisissez « Tous » pour retrouver l\'ensemble des documents partagés avec vous.');
      return;
    }

    var par = {}, ordre = [];
    liste.forEach(function (d) {
      var k = d.residentNom || 'Dossier';
      if (!par[k]) { par[k] = []; ordre.push(k); }
      par[k].push(d);
    });

    el.innerHTML = '<div class="fam-blocs">' + ordre.map(function (nom, idx) {
      var p = pal(nom, idx), list = par[nom];
      return '<section class="dc-card" aria-labelledby="fam-res-' + idx + '">' +
        '<div class="dc-head"><div class="dc-head-l">' +
          '<span class="dc-chip fam-res-av" style="background:' + p[0] + '22;color:' + p[0] + '" aria-hidden="true">' + esc(ini(nom)) + '</span>' +
          '<div style="min-width:0">' +
            '<div class="dc-eyebrow">Dossier</div>' +
            '<h2 class="dc-title fam-res-n" id="fam-res-' + idx + '">' + esc(nom) + '</h2>' +
          '</div>' +
        '</div>' +
        '<span class="dc-pill dim">' + list.length + ' doc' + (list.length > 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="dc-body"><div class="fam-docs">' + list.map(function (d) {
          var c = cat(d.category);
          var nomDoc = d.documentName || 'Document';
          var date = d.docDate ? fdate(d.docDate) : '';
          return '<div class="fam-doc" style="--dc:' + c.c + ';border-left:3px solid ' + c.c + '">' +
            '<span class="fam-doc-ico" aria-hidden="true">' + svg(IC.doc) + '</span>' +
            '<div class="fam-doc-b">' +
              '<div class="fam-doc-n" title="' + esc(nomDoc) + '">' + esc(nomDoc) + '</div>' +
              '<div class="fam-doc-m">' +
                '<span class="dc-badge fam-doc-cat" style="background:' + c.c + '1f;color:' + c.c + ';border:1px solid ' + c.c + '44"><span class="d" style="background:' + c.c + '"></span>' + esc(c.l) + '</span>' +
                (date ? '<span>' + esc(date) + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<button type="button" class="v2-btn v2-btn-sm fam-btn-ouvrir"' +
              ' onclick="famOpenDocument(\'' + esc(d.documentId) + '\')"' +
              ' aria-label="Ouvrir le document ' + esc(nomDoc) + ' de ' + esc(nom) + ' (nouvel onglet)">' +
              svg(IC.open) + 'Ouvrir</button>' +
          '</div>';
        }).join('') + '</div></div>' +
      '</section>';
    }).join('') + '</div>' +
    '<div class="fam-note">' + svg(IC.info) +
      '<div>Cet espace est en <strong>lecture seule</strong> : vous ne pouvez ni ajouter, ni modifier, ni supprimer de document. ' +
      'Seuls les documents explicitement partagés par l\'établissement y apparaissent.</div>' +
    '</div>';
  }

  /* ── Point d'entrée ───────────────────────────────────────────────── */
  async function render() {
    renderWelcome();
    var el = document.getElementById('famResidents');
    if (el && !state.chargee) {
      el.innerHTML = '<div class="dc-card"><div class="dc-body"><div class="v2-blk-vide">Chargement de vos documents…</div></div></div>';
    }
    var docs = [];
    try {
      docs = (typeof sbGetMesDocumentsFamille === 'function') ? (await sbGetMesDocumentsFamille()) || [] : [];
    } catch (e) {
      console.warn('[famille-v2] lecture des documents impossible', e);
      docs = [];
    }
    state.docs = docs;
    state.chargee = true;
    renderKpis(docs);
    renderChips(docs);
    renderBlocs(docs);
  }

  // Un `const`/`function` de module ne crée pas de propriété window : on publie.
  window.FamilleV2 = { render: render, state: state };
  window.renderFamilleV2 = render;
  window.renderFamille = render;   // l'ancienne fonction de rendu délègue au module V2
})();
