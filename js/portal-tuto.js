/* ══════════════════════════════════════════════════════════════════════════
   portal-tuto.js — Tutoriel d'accueil partagé par les portails
   (Vie quotidienne, Pilotage, Dossiers & suivi, RH).

   Une carte par module : rôle · 🛠️ mode d'emploi · 🔗 synchronisé avec · exemple.
   Le contenu vit dans window.PORTAL_TUTO (js/portal-tuto-data.js), clé = page.
   Les icônes/couleurs/libellés viennent du tableau NAV du portail → cohérent
   avec le dock, zéro duplication.

     PortalTuto.render({
       mount,          // élément ou id du conteneur d'accueil
       nav,            // tableau des modules [{ page, label, c1, icon, g, perm? }]
       allowed,        // e => bool  (filtre de permissions ; facultatif)
       onOpen,         // (page, label) => void  (ex. loadPage)
       title,          // titre affiché (ex. '🏠 Vie quotidienne')
       greetingName,   // prénom pour « — bonjour X » (facultatif)
       intro           // paragraphe d'intro (facultatif, défaut fourni)
     });
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var cssInjected = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    var css = [
      '.ptu-intro-t{font-size:1.5rem;font-weight:800;color:var(--primary);letter-spacing:-.02em}',
      '.ptu-intro-s{font-size:.9rem;color:var(--muted);margin:.35rem 0 1.4rem;line-height:1.5;max-width:760px}',
      '.ptu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:1rem}',
      '.ptu-card{text-align:left;background:#fff;border:1px solid var(--border);border-radius:16px;padding:1.1rem 1.15rem;cursor:pointer;font-family:inherit;color:inherit;display:flex;flex-direction:column;gap:.6rem;transition:box-shadow .15s,transform .15s,border-color .15s}',
      '.ptu-card:hover,.ptu-card:focus-visible{box-shadow:0 10px 26px rgba(40,50,110,.13);transform:translateY(-2px);border-color:var(--ptc);outline:none}',
      '.ptu-head{display:flex;align-items:center;gap:.7rem}',
      '.ptu-ic{width:38px;height:38px;border-radius:11px;flex-shrink:0;color:#fff;display:flex;align-items:center;justify-content:center}',
      '.ptu-ic svg{width:20px;height:20px}',
      '.ptu-grp{font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ptc)}',
      '.ptu-nm{font-size:1rem;font-weight:800;color:#0f2b4a;line-height:1.15;margin-top:1px}',
      '.ptu-role{font-size:.83rem;color:#334155;line-height:1.5}',
      ".ptu-how{background:#fbfcfe;border:1px dashed color-mix(in srgb,var(--ptc) 35%,var(--border));border-radius:11px;padding:.55rem .7rem .6rem}",
      '.ptu-how-h{font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ptc);margin-bottom:.45rem;display:flex;align-items:center;gap:.35rem}',
      '.ptu-how-list{margin:0;padding-left:1.15rem;display:flex;flex-direction:column;gap:.32rem}',
      '.ptu-how-list li{font-size:.78rem;color:#334155;line-height:1.45}',
      '.ptu-how-list li::marker{color:var(--ptc);font-weight:800}',
      '.ptu-sync{font-size:.74rem;color:#475569;background:#f4f6fb;border-radius:9px;padding:.45rem .6rem;display:flex;gap:.45rem;align-items:flex-start;line-height:1.4}',
      '.ptu-sync b{color:#0f2b4a;font-weight:700}',
      '.ptu-ex{font-size:.78rem;color:#3730a3;background:color-mix(in srgb,var(--ptc) 8%,#fff);border-left:3px solid var(--ptc);border-radius:8px;padding:.5rem .65rem;line-height:1.5}',
      '.ptu-ex b{color:var(--ptc)}',
      '.ptu-open{margin-top:auto;font-size:.75rem;font-weight:700;color:var(--ptc);display:flex;align-items:center;gap:.3rem}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'portal-tuto-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function cardHtml(e, t) {
    var col = e.c1 || '#4f46e5';
    var mode = (t.mode && t.mode.length)
      ? '<div class="ptu-how"><div class="ptu-how-h"><span aria-hidden="true">🛠️</span> Mode d\'emploi</div><ol class="ptu-how-list">'
        + t.mode.map(function (st) { return '<li>' + esc(st) + '</li>'; }).join('') + '</ol></div>'
      : '';
    var sync = t.sync ? '<div class="ptu-sync"><span aria-hidden="true">🔗</span><span><b>Synchronisé avec :</b> ' + esc(t.sync) + '</span></div>' : '';
    var ex   = t.ex   ? '<div class="ptu-ex"><b>Exemple —</b> ' + esc(t.ex) + '</div>' : '';
    return '<div class="ptu-card" role="button" tabindex="0" data-page="' + esc(e.page) + '" data-label="' + esc(e.label) + '" style="--ptc:' + esc(col) + '" aria-label="Ouvrir ' + esc(e.label) + '">'
      + '<div class="ptu-head"><span class="ptu-ic" style="background:' + esc(col) + '">' + (e.icon || '') + '</span>'
      + '<div>' + (e.g ? '<div class="ptu-grp">' + esc(e.g) + '</div>' : '') + '<div class="ptu-nm">' + esc(e.label) + '</div></div></div>'
      + (t.role ? '<div class="ptu-role">' + esc(t.role) + '</div>' : '')
      + mode + sync + ex
      + '<div class="ptu-open">Ouvrir le module <span aria-hidden="true">→</span></div>'
      + '</div>';
  }

  function render(opts) {
    injectCSS();
    var el = (typeof opts.mount === 'string') ? document.getElementById(opts.mount) : opts.mount;
    if (!el) return;
    var data = global.PORTAL_TUTO || {};
    var list = (opts.nav || []).filter(function (e) { return !opts.allowed || opts.allowed(e); });
    // Lookup tolérant aux paramètres d'URL (ex. « admin.html?tab=employes » → « admin.html »)
    var cards = list.map(function (e) {
      var t = data[e.page] || data[String(e.page).split('?')[0]] || {};
      return cardHtml(e, t);
    }).join('');
    var title = opts.title || 'Accueil';
    var greet = opts.greetingName ? ' — bonjour ' + esc(opts.greetingName) : '';
    var intro = opts.intro || "Cette page réunit tous les modules de la rubrique : chacun s'ouvre ici même, sans quitter la page (dock en bas de l'écran). Voici à quoi sert chaque module, comment il fonctionne, ce avec quoi il se synchronise, et un exemple. Cliquez une carte pour l'ouvrir.";
    el.innerHTML = '<div class="ptu-intro-t">' + esc(title) + greet + '</div>'
      + '<div class="ptu-intro-s">' + esc(intro) + '</div>'
      + '<div class="ptu-grid">' + cards + '</div>';

    // Ouvrir le module au clic ou au clavier (Entrée / Espace)
    var open = function (card) { if (card && card.dataset.page && opts.onOpen) opts.onOpen(card.dataset.page, card.dataset.label); };
    el.addEventListener('click', function (ev) { open(ev.target.closest('.ptu-card')); });
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { var c = ev.target.closest('.ptu-card'); if (c) { ev.preventDefault(); open(c); } }
    });
  }

  global.PortalTuto = { render: render, escHtml: esc };
})(window);
