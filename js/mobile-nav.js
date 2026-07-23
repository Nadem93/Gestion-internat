// ══════════════════════════════════════════════════════════════════════
// BARRE DE NAVIGATION MOBILE (bento) + ossature responsive partagée.
// Incluse sur toutes les pages de l'app pour un shell mobile cohérent.
// N'a AUCUN effet au-dessus de 640px (desktop intact). Thème clair ET sombre.
// ══════════════════════════════════════════════════════════════════════
(function () {
  if (window.__mobNavInit) return;
  window.__mobNavInit = true;

  var page = (location.pathname.split('/').pop() || 'accueil.html').toLowerCase();

  var IC = {
    home:  '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chat:  '<path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a2 2 0 0 1-2-2v-1"/><path d="M15 4H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2v4l4-4"/>',
    cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    grid:  '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };

  // Onglets : les 4 principaux + « Plus » (catch-all pour toutes les autres pages).
  var TABS = [
    { label: 'Accueil',    href: 'accueil.html',         ic: IC.home,  m: ['accueil.html'] },
    { label: 'Résidents',  href: 'residents.html',       ic: IC.users, m: ['residents.html', 'resident.html'] },
    { label: 'Transmis.',  href: 'transmissions.html',   ic: IC.chat,  m: ['transmissions.html'] },
    { label: 'Agenda',     href: 'planning.html',        ic: IC.cal,   m: ['planning.html'] },
    { label: 'Plus',       href: 'vie-quotidienne.html', ic: IC.grid,  m: [] }
  ];
  var active = -1;
  for (var i = 0; i < TABS.length; i++) { if (TABS[i].m.indexOf(page) !== -1) { active = i; break; } }
  if (active === -1) active = TABS.length - 1; // « Plus » pour les pages hors des 4 principales

  var CSS = [
    '.mob-nav{display:none}',
    '@media (max-width:640px){',
    '.mob-nav{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:60;',
    'padding:9px 8px calc(9px + env(safe-area-inset-bottom,0px));',
    'background:rgba(10,23,40,.92);border-top:1px solid rgba(255,255,255,.08);',
    '-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}',
    'html.clair .mob-nav{background:rgba(255,255,255,.94);border-top-color:rgba(15,38,70,.10)}',
    '.mob-nav-i{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;',
    'text-decoration:none;color:var(--v2-t7,#5f7a9c);font-size:10px;font-weight:600}',
    '.mob-nav-i svg{width:23px;height:23px}',
    '.mob-nav-i.on{color:var(--v2-indigo-light,#818cf8)}',
    // Dégager la barre : de la place en bas pour ne pas masquer le contenu.
    'body.v2{padding-bottom:calc(86px + env(safe-area-inset-bottom,0px))}',
    // Grille de modules (pages « hub ») en icônes 4 colonnes, style bento.
    '.v2-mods{grid-template-columns:repeat(4,1fr)!important;gap:16px 8px}',
    '.v2-mod-wrap{background:none!important;border:none!important;min-height:0}',
    '.v2-mod-wrap:hover{transform:none;background:none!important;border-color:transparent!important}',
    '.v2-mod{padding:0;gap:7px}',
    '.v2-mod::after{display:none}',
    '.v2-mod-ico{width:54px;height:54px;border-radius:17px;border:1px solid color-mix(in srgb,var(--mc,#818cf8) 30%,transparent)}',
    '.v2-mod-ico svg{width:23px;height:23px}',
    '.v2-mod-txt{width:100%;align-items:center}',
    '.v2-mod-lbl{width:100%;padding:0 4px;font-size:9.5px;text-align:center;line-height:1.2;white-space:normal;overflow:visible;overflow-wrap:anywhere}',
    '.v2-mod-sub{display:none}',
    '.v2-mod-racc{display:none}',
    '.v2-mod .notif-badge{top:-3px;right:calc(50% - 33px)}',
    '}'
  ].join('');

  function inject() {
    if (!document.getElementById('mobNavCss')) {
      var st = document.createElement('style');
      st.id = 'mobNavCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (!document.querySelector('.mob-nav')) {
      var nav = document.createElement('nav');
      nav.className = 'mob-nav';
      nav.setAttribute('aria-label', 'Navigation');
      nav.innerHTML = TABS.map(function (t, idx) {
        return '<a class="mob-nav-i' + (idx === active ? ' on' : '') + '" href="' + t.href + '"' +
          (idx === active ? ' aria-current="page"' : '') + '>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + t.ic + '</svg>' +
          '<span>' + t.label + '</span></a>';
      }).join('');
      document.body.appendChild(nav);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
