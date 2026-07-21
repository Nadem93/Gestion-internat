// ══════════════════════════════════════════════════════════════════════════
// THÈME SOMBRE / CLAIR
// ──────────────────────────────────────────────────────────────────────────
// À charger dans le <head>, en script BLOQUANT, avant tout rendu :
//   <link rel="stylesheet" href="css/v2-clair.css"/>
//   <script src="js/theme.js"></script>
//
// La classe `clair` est posée sur <html> et non sur <body> : quand ce script
// s'exécute le <body> n'existe pas encore. Sur <html> on applique donc la
// préférence AVANT le premier rendu — sans ça la page s'affiche en sombre
// pendant une frame puis vire au clair, ce qui « flashe » à chaque navigation.
//
// Le bouton s'injecte tout seul dans la barre supérieure `.v2-top`, ce qui
// évite d'aller le coller à la main dans les 73 pages.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var CLE = 'ftr_theme';          // 'clair' | 'sombre'
  var DEFAUT = 'sombre';

  function lire() {
    try { return localStorage.getItem(CLE) || DEFAUT; } catch (e) { return DEFAUT; }
  }
  function ecrire(v) {
    try { localStorage.setItem(CLE, v); } catch (e) { /* mode privé : on ignore */ }
  }

  // ─── Application immédiate (avant le premier rendu) ─────────────────────
  var actuel = lire();
  if (actuel === 'clair') document.documentElement.classList.add('clair');

  // ─── Bascule ────────────────────────────────────────────────────────────
  function appliquer(theme, animer) {
    var clair = theme === 'clair';
    var html = document.documentElement;

    // La transition n'est active que pendant la bascule : la laisser en
    // permanence ralentirait les survols et les rendus dynamiques.
    if (animer) {
      html.classList.add('thm-anim');
      setTimeout(function () { html.classList.remove('thm-anim'); }, 320);
    }

    html.classList.toggle('clair', clair);
    ecrire(theme);
    majBouton(clair);

    // Les pages qui dessinent en canvas ou lisent une couleur au rendu
    // peuvent se rebrancher là-dessus.
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }

  function basculer() {
    appliquer(document.documentElement.classList.contains('clair') ? 'sombre' : 'clair', true);
  }

  // ─── Bouton ─────────────────────────────────────────────────────────────
  var SOLEIL = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>';
  var LUNE = '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>';

  function majBouton(clair) {
    var b = document.getElementById('thmBtn');
    if (!b) return;
    // On montre la CIBLE de la bascule, pas l'état courant : en sombre on
    // affiche un soleil, qui se lit « passer en clair ».
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
      + 'stroke-linecap="round" stroke-linejoin="round">' + (clair ? LUNE : SOLEIL) + '</svg>';
    var t = clair ? 'Passer en thème sombre' : 'Passer en thème clair';
    b.setAttribute('title', t);
    b.setAttribute('aria-label', t);
  }

  function injecterStyles() {
    if (document.getElementById('thmCss')) return;
    var s = document.createElement('style');
    s.id = 'thmCss';
    s.textContent = [
      '#thmBtn{width:42px;height:42px;flex-shrink:0;border-radius:12px;cursor:pointer;',
      'display:inline-flex;align-items:center;justify-content:center;',
      'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#c6d3e6;',
      'transition:background .15s,color .15s,border-color .15s}',
      '#thmBtn:hover{background:rgba(255,255,255,.1);color:#fff}',
      '#thmBtn svg{width:19px;height:19px;display:block}',
      // En clair, le bouton doit suivre le reste de l'interface.
      'html.clair #thmBtn{background:#fff;border-color:rgba(15,38,70,.13);color:#33506f;',
      'box-shadow:0 1px 2px rgba(15,38,70,.06)}',
      'html.clair #thmBtn:hover{background:#f2f6fc;color:#0a1a2f}',
      // Repli quand la page n'a pas de barre `.v2-top`.
      '#thmBtn.thm-flottant{position:fixed;bottom:18px;right:18px;z-index:900;',
      'box-shadow:0 8px 24px -8px rgba(0,0,0,.5)}',
      // Transition de bascule, active ~0,3 s seulement (voir appliquer()).
      'html.thm-anim,html.thm-anim body,html.thm-anim body *{',
      'transition:background-color .25s ease,border-color .25s ease,color .25s ease,box-shadow .25s ease !important}'
    ].join('');
    document.head.appendChild(s);
  }

  function injecterBouton() {
    if (document.getElementById('thmBtn')) return;

    // Page ouverte DANS un portail (iframe, `?embed=1`) : pas de bouton. Le
    // thème est déjà appliqué — même origine, donc même localStorage — et un
    // second bouton à l'intérieur du panneau doublerait celui du portail.
    if (/[?&]embed=1\b/.test(location.search)) return;

    injecterStyles();

    var b = document.createElement('button');
    b.id = 'thmBtn';
    b.type = 'button';
    b.addEventListener('click', basculer);

    // Barre supérieure V2 : on se place juste avant le bloc utilisateur quand
    // il existe, sinon en fin de barre.
    // Les portails (vie quotidienne, dossiers, pilotage) n'ont pas de `.v2-top`
    // mais leur propre barre : sans elles, le bouton tomberait en flottant.
    var top = document.querySelector('.v2-top, .vq-topbar, .ds-topbar, .pl-topbar');
    if (top) {
      var dernier = top.lastElementChild;
      // Le bloc de droite est un conteneur flex (margin-left:auto) : on entre
      // dedans pour rester aligné avec la recherche et l'avatar.
      // Mais JAMAIS dans un élément interactif : sur plusieurs pages ce dernier
      // bloc est le lien vers la fiche employé, et un bouton posé à l'intérieur
      // déclencherait la navigation à chaque changement de thème.
      var interactif = dernier && /^(A|BUTTON|LABEL|SELECT)$/.test(dernier.tagName);
      if (dernier && !interactif && dernier.children.length
          && getComputedStyle(dernier).display === 'flex') {
        dernier.appendChild(b);
      } else {
        top.appendChild(b);
      }
    } else {
      b.className = 'thm-flottant';
      document.body.appendChild(b);
    }

    majBouton(document.documentElement.classList.contains('clair'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injecterBouton);
  } else {
    injecterBouton();
  }

  // API publique
  window.Theme = { get: lire, set: function (t) { appliquer(t, true); }, toggle: basculer };
})();
