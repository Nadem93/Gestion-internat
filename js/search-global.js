// ══════════════════════════════════════════════════════════════════════════
// RECHERCHE GLOBALE  (palette ⌘K)
// ──────────────────────────────────────────────────────────────────────────
// Le champ de recherche de l'accueil promettait « Rechercher un résident, une
// note… » mais ne faisait que rediriger vers la liste des résidents. Ce module
// tient la promesse : une vraie recherche transversale — résidents,
// transmissions, journal, documents, échéances — avec résultats groupés.
//
// S'ouvre par ⌘K / Ctrl+K partout, ou par un clic sur le champ de l'accueil.
//
// Interroge Supabase directement en `ilike` CÔTÉ SERVEUR (pas de table entière
// rapatriée) : le RLS limite déjà chaque table à l'établissement de l'agent.
// Ne dépend donc pas des fichiers *-supabase.js de la page, seulement du client.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var esc = (typeof escHtml === 'function') ? escHtml
    : function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // Sources de recherche. `cols` = colonnes interrogées (ilike OR), `lien` =
  // destination, `titre`/`sous` = extraction pour l'affichage.
  var SOURCES = [
    { cle: 'residents', table: 'residents', icone: '👤', label: 'Résidents',
      cols: ['nom', 'prenom'], sel: 'id,nom,prenom,statut',
      titre: function (r) { return ((r.prenom || '') + ' ' + (r.nom || '')).trim(); },
      sous: function (r) { return r.statut === 'sorti' ? 'Sorti·e' : 'Résident·e'; },
      lien: function (r) { return 'resident.html?id=' + r.id; }, perm: 'view_residents' },

    { cle: 'transmissions', table: 'transmissions', icone: '💬', label: 'Transmissions',
      perm: 'access_journal',
      cols: ['content', 'resident_name'], sel: 'id,content,resident_name,date',
      ordre: 'date', titre: function (r) { return r.content || ''; },
      sous: function (r) { return [r.resident_name, _dateFr(r.date)].filter(Boolean).join(' · '); },
      lien: function () { return 'transmissions.html'; } },

    { cle: 'journal', table: 'journal_entries', icone: '📓', label: 'Journal de bord',
      perm: 'access_journal',
      // visibilite et author_id sont indispensables au filtre ci-dessous : sans
      // eux, la palette affichait le contenu des entrées CONFIDENTIELLES à tout
      // le monde, alors que la page Journal les réserve à l'auteur et à l'admin.
      cols: ['contenu', 'objectif'], sel: 'id,contenu,objectif,resident,date,visibilite,author_id',
      visible: function (r) {
        if (r.visibilite !== 'confidentiel') return true;
        var se = _sess();
        return !!se && (se.role === 'admin' || String(r.author_id) === String(se.userId));
      },
      ordre: 'date', titre: function (r) { return r.contenu || r.objectif || ''; },
      sous: function (r) { return [r.resident, _dateFr(r.date)].filter(Boolean).join(' · '); },
      lien: function () { return 'journal.html'; } },

    { cle: 'documents', table: 'documents_resident', icone: '📎', label: 'Documents',
      perm: 'access_documents',
      cols: ['name'], sel: 'id,name,category,resident_id',
      titre: function (r) { return r.name || ''; },
      sous: function (r) { return r.category || 'Document'; },
      lien: function () { return 'documents.html'; } },

    { cle: 'echeances', table: 'echeances', icone: '⏰', label: 'Échéances',
      perm: 'view_residents',
      cols: ['libelle', 'notes'], sel: 'id,libelle,resident_name,date,type',
      ordre: 'date', titre: function (r) { return r.libelle || ''; },
      sous: function (r) { return [r.resident_name, _dateFr(r.date)].filter(Boolean).join(' · '); },
      lien: function () { return 'echeances.html'; } }
  ];

  function _sess() {
    try { return (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null; }
    catch (e) { return null; }
  }
  // Une source n'est interrogée que si l'utilisateur a le droit d'ouvrir le
  // module correspondant. Sans ce garde, ⌘K contournait tout le cloisonnement
  // par rôle : un compte privé d'accès au journal y lisait quand même son contenu.
  function _autorise(src) {
    if (!src.perm) return true;
    var se = _sess();
    if (!se) return false;
    if (se.role === 'admin' || (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin())) return true;
    return (typeof hasPermission === 'function') ? hasPermission(se.userId, src.perm) : false;
  }

  function _dateFr(d) {
    if (!d) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : String(d);
  }

  // ─── Requête : une source ────────────────────────────────────────────────
  function chercherSource(src, q) {
    if (typeof supabaseClient === 'undefined') return Promise.resolve([]);
    var motif = '%' + q.replace(/[%_]/g, function (c) { return '\\' + c; }) + '%';
    var ou = src.cols.map(function (c) { return c + '.ilike.' + motif; }).join(',');
    // On demande 30 lignes pour n'en garder que 6 APRÈS filtrage : avec une
    // limite à 6 en base, six entrées confidentielles auraient masqué tous les
    // résultats légitimes.
    var req = supabaseClient.from(src.table).select(src.sel).or(ou).limit(src.visible ? 30 : 6);
    if (src.ordre) req = req.order(src.ordre, { ascending: false });
    return req.then(function (r) {
      if (r.error) { console.warn('[recherche]', src.table, r.error.message); return []; }
      return (r.data || [])
        .filter(function (row) { return src.visible ? src.visible(row) : true; })
        .slice(0, 6)
        .map(function (row) {
          return { icone: src.icone, groupe: src.label,
            titre: src.titre(row), sous: src.sous(row), lien: src.lien(row) };
        }).filter(function (x) { return x.titre; });
    }, function () { return []; });
  }

  function chercher(q) {
    return Promise.all(SOURCES.filter(_autorise).map(function (s) { return chercherSource(s, q); }))
      .then(function (parSource) {
        var out = [];
        parSource.forEach(function (l) { out = out.concat(l); });
        return out;
      });
  }

  // ─── Interface ───────────────────────────────────────────────────────────
  var ov, champ, liste, _resultats = [], _actif = -1, _seq = 0;

  function styles() {
    if (document.getElementById('sgCss')) return;
    var s = document.createElement('style');
    s.id = 'sgCss';
    s.textContent = [
      '.sg-ov{position:fixed;inset:0;z-index:1000;display:none;justify-content:center;align-items:flex-start;',
      'padding:12vh 20px 20px;background:rgba(4,10,20,.6);backdrop-filter:blur(5px)}',
      '.sg-ov.open{display:flex}',
      'html.clair .sg-ov{background:rgba(15,30,55,.4)}',
      '.sg-box{width:100%;max-width:600px;background:var(--v2-inset,#0c1a2e);border:1px solid var(--v2-b-ctrl,rgba(255,255,255,.08));',
      'border-radius:16px;box-shadow:0 40px 100px -30px rgba(0,0,0,.8);overflow:hidden;display:flex;flex-direction:column;max-height:74vh}',
      'html.clair .sg-box{background:#fff;box-shadow:0 40px 100px -40px rgba(15,38,70,.45)}',
      '.sg-inp{display:flex;align-items:center;gap:11px;padding:15px 18px;border-bottom:1px solid var(--v2-b,rgba(255,255,255,.07))}',
      '.sg-inp svg{width:18px;height:18px;flex-shrink:0;color:var(--v2-t7,#7f93b3)}',
      '.sg-inp input{flex:1;background:none;border:none;outline:none;color:var(--v2-t2,#eef3fb);',
      'font:500 15px/1 system-ui,-apple-system,sans-serif}',
      '.sg-inp input::placeholder{color:var(--v2-t7,#7f93b3)}',
      '.sg-kbd{font-size:11px;font-weight:700;color:var(--v2-t8,#6f86ab);border:1px solid var(--v2-b-ctrl,rgba(255,255,255,.12));',
      'border-radius:6px;padding:3px 7px}',
      '.sg-list{overflow-y:auto;padding:8px}',
      '.sg-grp{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;',
      'color:var(--v2-t8,#6f86ab);padding:10px 12px 5px}',
      '.sg-it{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;text-decoration:none}',
      '.sg-it .em{font-size:1.05rem;width:26px;text-align:center;flex-shrink:0}',
      '.sg-it .tx{min-width:0;flex:1}',
      '.sg-it .t{display:block;color:var(--v2-t2,#eef3fb);font-size:13.5px;font-weight:600;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.sg-it .s{display:block;color:var(--v2-t7,#7f93b3);font-size:11.5px;margin-top:2px;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.sg-it.on,.sg-it:hover{background:var(--v2-s-hover,rgba(255,255,255,.06))}',
      '.sg-vide{padding:34px 20px;text-align:center;color:var(--v2-t7,#7f93b3);font-size:13px}',
      '.sg-foot{border-top:1px solid var(--v2-b,rgba(255,255,255,.07));padding:9px 14px;display:flex;gap:14px;',
      'font-size:11px;color:var(--v2-t8,#6f86ab)}',
      '.sg-foot b{color:var(--v2-t5,#9fb2ce);font-weight:700}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function construire() {
    if (ov) return;
    styles();
    ov = document.createElement('div');
    ov.className = 'sg-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Recherche globale');
    ov.innerHTML =
      '<div class="sg-box">' +
        '<label class="sg-inp">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="search" id="sgInput" placeholder="Rechercher un résident, une transmission, un document…" autocomplete="off" spellcheck="false"/>' +
          '<span class="sg-kbd">Esc</span>' +
        '</label>' +
        '<div class="sg-list" id="sgList"><div class="sg-vide">Tapez au moins deux caractères.</div></div>' +
        '<div class="sg-foot"><span><b>↑↓</b> naviguer</span><span><b>↵</b> ouvrir</span><span><b>Esc</b> fermer</span></div>' +
      '</div>';
    document.body.appendChild(ov);
    champ = ov.querySelector('#sgInput');
    liste = ov.querySelector('#sgList');

    ov.addEventListener('click', function (e) { if (e.target === ov) fermer(); });
    champ.addEventListener('input', debounce(surSaisie, 180));
    champ.addEventListener('keydown', surTouche);
  }

  var _t;
  function debounce(fn, ms) { return function () { var a = arguments, ctx = this; clearTimeout(_t); _t = setTimeout(function () { fn.apply(ctx, a); }, ms); }; }

  function surSaisie() {
    var q = champ.value.trim();
    if (q.length < 2) { _resultats = []; _actif = -1; liste.innerHTML = '<div class="sg-vide">Tapez au moins deux caractères.</div>'; return; }
    var seq = ++_seq;
    liste.innerHTML = '<div class="sg-vide">Recherche…</div>';
    chercher(q).then(function (res) {
      if (seq !== _seq) return;   // une saisie plus récente a pris le relais
      _resultats = res; _actif = res.length ? 0 : -1;
      rendre(q);
    });
  }

  function rendre(q) {
    if (!_resultats.length) {
      liste.innerHTML = '<div class="sg-vide">Aucun résultat pour « ' + esc(q) +' ».</div>';
      return;
    }
    var html = '', groupeCourant = null;
    _resultats.forEach(function (r, i) {
      if (r.groupe !== groupeCourant) { groupeCourant = r.groupe; html += '<div class="sg-grp">' + esc(r.groupe) + '</div>'; }
      html += '<a class="sg-it' + (i === _actif ? ' on' : '') + '" href="' + esc(r.lien) + '" data-i="' + i + '">' +
        '<span class="em">' + r.icone + '</span>' +
        '<span class="tx"><span class="t">' + esc(r.titre) + '</span>' +
        (r.sous ? '<span class="s">' + esc(r.sous) + '</span>' : '') + '</span></a>';
    });
    liste.innerHTML = html;
    liste.querySelectorAll('.sg-it').forEach(function (el) {
      el.addEventListener('mousemove', function () { surligner(+el.dataset.i); });
    });
  }

  function surligner(i) {
    _actif = i;
    var items = liste.querySelectorAll('.sg-it');
    items.forEach(function (el, k) { el.classList.toggle('on', k === i); });
    var actif = items[i];
    if (actif && actif.scrollIntoView) actif.scrollIntoView({ block: 'nearest' });
  }

  function surTouche(e) {
    if (e.key === 'Escape') { fermer(); return; }
    if (!_resultats.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); surligner((_actif + 1) % _resultats.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); surligner((_actif - 1 + _resultats.length) % _resultats.length); }
    else if (e.key === 'Enter') { e.preventDefault(); var r = _resultats[_actif]; if (r) location.href = r.lien; }
  }

  function ouvrir(valeurInitiale) {
    construire();
    ov.classList.add('open');
    if (valeurInitiale) { champ.value = valeurInitiale; surSaisie(); }
    setTimeout(function () { champ.focus(); }, 30);
  }
  function fermer() { if (ov) ov.classList.remove('open'); }

  // ─── Déclencheurs ────────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ouvrir(); }
  });

  // Le champ de l'accueil ouvre la palette au lieu de rediriger.
  function brancherAccueil() {
    var acc = document.getElementById('accSearch');
    if (!acc || acc._sgBound) return;
    acc._sgBound = true;
    acc.readOnly = true;                    // il sert de bouton d'ouverture
    acc.addEventListener('focus', function () { acc.blur(); ouvrir(); });
    acc.addEventListener('click', function () { ouvrir(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancherAccueil);
  else brancherAccueil();

  window.GlobalSearch = { open: ouvrir, close: fermer };
})();
