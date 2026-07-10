/* ══════════════════════════════════════════════════════════════════════════
   portal-dock.js — Dock flottant « par catégories » partagé par les 5 portails
   (RH, Pilotage, Vie quotidienne, Dossiers, Administration).

   Remplace l'ancienne barre à plat (15 modules tronqués) par :
   - une barre épurée = 1 pastille colorée par GROUPE + le bouton central « Tous les modules »
   - un popover vitré par groupe listant ses modules, LIBELLÉS COMPLETS (zéro troncature)
   - survol intelligent (desktop), navigation clavier complète (menu ARIA), groupe « Autres »
     automatique pour tout module hors catégories, teinte du groupe actif (« où suis-je »).

   Piloté par les données de chaque portail — un seul composant, aucune duplication :
     PortalDock.init({
       dock,           // l'élément <nav> conteneur
       nav,            // tableau des modules [{ g, page|tab, label, c1, icon, perm?, adminOnly? }]
       key,            // 'page' (portails iframe) ou 'tab' (admin)
       groups,         // ordre des groupes ['Groupe A', 'Groupe B', ...]
       groupMeta,      // { 'Groupe A': { short, icon, color? }, ... }  (short/icon requis, color déduite sinon)
       allowed,        // e => bool  (filtre de permissions)
       onNavigate,     // entry => void  (loadPage / activateTab)
       gridId,         // id du bouton central (le portail garde sa propre ouverture du lanceur)
       launcherLabel,  // libellé/title du bouton central
       current         // clé initiale active (facultatif)
     });
     PortalDock.setActive(key);   // met à jour la teinte du groupe + le module actif
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var cfg = null;
  var styleInjected = false;
  var wired = false;
  var hoverTimer = null, closeTimer = null;
  var hoverCapable = false;
  try { hoverCapable = global.matchMedia && global.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}

  var GRID_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  var DEFAULT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function keyOf(e) { return e[cfg.key]; }
  function allowedList() { return cfg.nav.filter(function (e) { return !cfg.allowed || cfg.allowed(e); }); }

  // Regroupe les modules autorisés par catégorie, dans l'ordre demandé ; tout module
  // dont le groupe n'est pas connu tombe automatiquement dans « Autres ».
  function groupsData() {
    var known = cfg.groups || [];
    var map = {};
    allowedList().forEach(function (e) {
      var g = known.indexOf(e.g) >= 0 ? e.g : 'Autres';
      (map[g] = map[g] || []).push(e);
    });
    var out = [];
    known.forEach(function (g) { if (map[g] && map[g].length) out.push({ g: g, items: map[g] }); });
    if (map['Autres'] && map['Autres'].length) out.push({ g: 'Autres', items: map['Autres'] });
    return out;
  }
  function meta(g) {
    var m = (cfg.groupMeta && cfg.groupMeta[g]) || {};
    return { short: m.short || g, icon: m.icon || DEFAULT_ICON, color: m.color || null };
  }
  function groupColor(grp) {
    var m = meta(grp.g);
    return m.color || (grp.items[0] && grp.items[0].c1) || '#6366f1';
  }

  function injectCSS() {
    if (styleInjected) return;
    styleInjected = true;
    var css = [
      // La barre n'a plus besoin de défiler (≈6 cibles) : overflow visible pour laisser
      // les popovers déborder vers le haut sans être découpés.
      '.rh-dock{overflow:visible!important}',
      '.pdk-grp{position:relative;display:inline-flex;flex-direction:column;align-items:center;flex-shrink:0}',
      '.pdk-grp-btn{width:66px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px 4px;border-radius:13px;border:none;background:none;color:inherit;cursor:pointer;font-family:inherit;position:relative;transition:background .15s}',
      '.pdk-grp-btn:hover{background:rgba(15,23,42,.05)}',
      '.pdk-grp.on-active .pdk-grp-btn{background:#eef2ff;background:color-mix(in srgb, var(--gc) 12%, transparent)}',
      '.pdk-grp-ic{position:relative;width:34px;height:34px;border-radius:11px;background:var(--gc);color:#fff;display:flex;align-items:center;justify-content:center}',
      '.pdk-grp-ic svg{width:18px;height:18px;display:block}',
      '.pdk-grp.on-active .pdk-grp-ic{box-shadow:0 0 0 3px rgba(79,70,229,.18);box-shadow:0 0 0 3px color-mix(in srgb, var(--gc) 30%, transparent)}',
      '.pdk-grp-lbl{font-size:.62rem;font-weight:600;color:#475569;white-space:nowrap;line-height:1;max-width:74px;overflow:hidden;text-overflow:ellipsis}',
      '.pdk-grp.on-active .pdk-grp-lbl{color:var(--gc)}',
      '.pdk-grp-cnt{position:absolute;top:1px;right:8px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#fff;border:.5px solid #e2e8f0;color:#475569;font-size:.6rem;font-weight:600;display:flex;align-items:center;justify-content:center}',
      '.pdk-grp-dot{width:5px;height:5px;border-radius:50%;background:var(--gc);opacity:0;transition:opacity .15s;margin-top:1px}',
      '.pdk-grp.on-active .pdk-grp-dot{opacity:1}',
      '.pdk-pop{position:absolute;bottom:calc(100% + 11px);left:50%;width:252px;max-width:78vw;',
      'background:rgba(255,255,255,.88);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);',
      'border:1px solid rgba(255,255,255,.95);border-radius:16px;box-shadow:0 22px 50px rgba(40,50,110,.26);',
      'padding:10px;z-index:70;opacity:0;visibility:hidden;pointer-events:none;',
      'transform:translateX(calc(-50% + var(--shift,0px))) translateY(6px);transition:opacity .16s ease,transform .16s ease}',
      '.pdk-grp.open .pdk-pop{opacity:1;visibility:visible;pointer-events:auto;transform:translateX(calc(-50% + var(--shift,0px))) translateY(0)}',
      '.pdk-pop::before{content:"";position:absolute;left:0;right:0;bottom:-13px;height:13px}',
      '.pdk-pop::after{content:"";position:absolute;bottom:-7px;left:calc(50% - var(--shift,0px));transform:translateX(-50%) rotate(45deg);width:13px;height:13px;background:rgba(255,255,255,.88);border-right:1px solid rgba(255,255,255,.95);border-bottom:1px solid rgba(255,255,255,.95)}',
      '.pdk-pop-h{display:flex;align-items:center;gap:9px;padding:2px 4px 9px;margin-bottom:4px;border-bottom:1px solid #eef1f5}',
      '.pdk-pop-hsq{width:26px;height:26px;border-radius:8px;background:var(--gc);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.pdk-pop-hsq svg{width:15px;height:15px}',
      '.pdk-pop-htitle{font-size:.82rem;font-weight:700;color:#0f2b4a;line-height:1.15}',
      '.pdk-pop-hsub{font-size:.66rem;color:#94a3b8}',
      '.pdk-mod{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;border:none;background:none;cursor:pointer;font-family:inherit;text-align:left;transition:background .12s}',
      '.pdk-mod:hover{background:#f4f6fb}',
      '.pdk-mod.on{background:#eef2ff}',
      '.pdk-mod-ic{position:relative;width:29px;height:29px;border-radius:9px;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.pdk-mod-ic svg{width:16px;height:16px;display:block}',
      '.pdk-mod-lbl{font-size:.8rem;color:#334155;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.pdk-mod.on .pdk-mod-lbl{color:#4f46e5;font-weight:600}',
      '.pdk-mod-tag{font-size:.62rem;color:#94a3b8;flex-shrink:0}',
      '.pdk-mod.on .pdk-mod-tag{color:#4f46e5;display:inline-flex;align-items:center;gap:3px}',
      '.pdk-grp-btn:focus-visible,.pdk-mod:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(79,70,229,.4)}',
      '.pdk-foot{display:flex;gap:9px;flex-wrap:wrap;padding:8px 6px 2px;margin-top:3px;border-top:1px solid #eef1f5;font-size:.62rem;color:#94a3b8}',
      '.pdk-key{border:.5px solid #d7dde7;border-radius:4px;padding:0 4px;background:#fff;color:#64748b}',
      '@media (prefers-reduced-motion: reduce){.pdk-pop{transition:none}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'portal-dock-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function render() {
    injectCSS();
    var gd = groupsData();
    var html = gd.map(function (grp, gi) {
      var col = groupColor(grp), m = meta(grp.g);
      var rows = grp.items.map(function (e) {
        var dm = e.module ? ' data-module="' + esc(e.module) + '"' : '';
        return '<button type="button" class="pdk-mod" role="menuitem" data-key="' + esc(keyOf(e)) + '" style="--mc:' + esc(e.c1 || col) + '" title="' + esc(e.label) + '">' +
          '<span class="pdk-mod-ic"' + dm + ' style="background:' + esc(e.c1 || col) + '">' + (e.icon || DEFAULT_ICON) + '</span>' +
          '<span class="pdk-mod-lbl">' + esc(e.label) + '</span>' +
          '<span class="pdk-mod-tag" data-tag></span></button>';
      }).join('');
      // Badge éventuel (ex. messages non lus) reporté sur l'icône du groupe (barre fermée)
      var badgeMod = '';
      for (var bi = 0; bi < grp.items.length; bi++) { if (grp.items[bi].module) { badgeMod = ' data-module="' + esc(grp.items[bi].module) + '"'; break; } }
      return '<div class="pdk-grp" data-grp="' + gi + '" style="--gc:' + esc(col) + '">' +
        '<button type="button" class="pdk-grp-btn" aria-haspopup="true" aria-expanded="false" title="' + esc(grp.g) + '">' +
          '<span class="pdk-grp-cnt">' + grp.items.length + '</span>' +
          '<span class="pdk-grp-ic"' + badgeMod + '>' + m.icon + '</span>' +
          '<span class="pdk-grp-lbl">' + esc(m.short) + '</span>' +
          '<span class="pdk-grp-dot"></span>' +
        '</button>' +
        '<div class="pdk-pop" role="menu" aria-label="' + esc(grp.g) + '">' +
          '<div class="pdk-pop-h"><span class="pdk-pop-hsq">' + m.icon + '</span>' +
            '<div><div class="pdk-pop-htitle">' + esc(grp.g) + '</div>' +
            '<div class="pdk-pop-hsub">' + grp.items.length + (grp.items.length > 1 ? ' modules' : ' module') + '</div></div></div>' +
          rows +
          '<div class="pdk-foot"><span><span class="pdk-key">&uarr;</span> <span class="pdk-key">&darr;</span> naviguer</span><span><span class="pdk-key">&crarr;</span> ouvrir</span><span><span class="pdk-key">Échap</span> fermer</span></div>' +
        '</div></div>';
    }).join('');
    var sep = '<span class="rh-dock-sep"></span>';
    // Bouton central « Tous les modules » : rendu UNIQUEMENT si un gridId est fourni.
    var gridBtn = cfg.gridId ? sep + '<button class="rh-dock-grid" id="' + esc(cfg.gridId) + '" title="' + esc(cfg.launcherLabel || 'Tous les modules') + '" aria-label="' + esc(cfg.launcherLabel || 'Tous les modules') + '" aria-haspopup="dialog">' + GRID_SVG + '</button>' : '';
    // cfg.leading : HTML brut optionnel rendu avant les groupes (ex. bouton accueil du portail)
    cfg.dock.innerHTML = (cfg.leading ? cfg.leading + sep : '') + html + gridBtn;
    wire();
    if (cfg.current) setActive(cfg.current);
  }

  function groups() { return Array.prototype.slice.call(cfg.dock.querySelectorAll('.pdk-grp')); }
  function closeAll(except) {
    groups().forEach(function (g) {
      if (g === except) return;
      g.classList.remove('open');
      var b = g.querySelector('.pdk-grp-btn'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  function place(grp) {
    // Recale le popover s'il déborde de l'écran (groupes de bord), et repositionne la flèche.
    var pop = grp.querySelector('.pdk-pop');
    if (!pop) return;
    pop.style.setProperty('--shift', '0px');
    var r = pop.getBoundingClientRect(), pad = 8, shift = 0;
    if (r.left < pad) shift = pad - r.left;
    else if (r.right > global.innerWidth - pad) shift = (global.innerWidth - pad) - r.right;
    if (shift) pop.style.setProperty('--shift', Math.round(shift) + 'px');
  }
  function openGroup(grp, focusFirst) {
    if (!grp) return;
    closeAll(grp);
    grp.classList.add('open');
    var b = grp.querySelector('.pdk-grp-btn'); if (b) b.setAttribute('aria-expanded', 'true');
    place(grp);
    if (focusFirst) { var m = grp.querySelector('.pdk-mod'); if (m) m.focus(); }
  }
  function toggle(grp) {
    if (grp.classList.contains('open')) { closeAll(); }
    else openGroup(grp, false);
  }

  function modsOf(grp) { return Array.prototype.slice.call(grp.querySelectorAll('.pdk-mod')); }

  // Liaison UNIQUE : tous les écouteurs sont délégués sur le dock / document / window,
  // donc ils survivent à un éventuel ré-rendu (innerHTML remplacé) sans être ré-empilés.
  function wire() {
    if (wired) return;
    wired = true;
    var dock = cfg.dock;

    // Clic : pastille de groupe = bascule ; module = navigation
    dock.addEventListener('click', function (ev) {
      var mod = ev.target.closest('.pdk-mod');
      if (mod) {
        var e = cfg.nav.find(function (x) { return String(keyOf(x)) === String(mod.dataset.key); });
        closeAll();
        if (e && cfg.onNavigate) cfg.onNavigate(e);
        return;
      }
      var gbtn = ev.target.closest('.pdk-grp-btn');
      if (gbtn) { ev.preventDefault(); toggle(gbtn.closest('.pdk-grp')); }
    });

    // Clic hors du dock = referme
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('.pdk-grp')) closeAll();
    });

    // Survol intelligent (desktop uniquement), délégué via mouseover/mouseleave
    if (hoverCapable) {
      dock.addEventListener('mouseover', function (ev) {
        var btn = ev.target.closest('.pdk-grp-btn');
        if (!btn || btn.contains(ev.relatedTarget)) return;   // uniquement à l'entrée dans la pastille
        clearTimeout(closeTimer); clearTimeout(hoverTimer);
        var grp = btn.closest('.pdk-grp');
        hoverTimer = setTimeout(function () { openGroup(grp, false); }, 90);
      });
      dock.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimer);
        closeTimer = setTimeout(function () { closeAll(); }, 220);
      });
      dock.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    }

    // Clavier : ouverture depuis la pastille + navigation dans le popover (pattern menu)
    dock.addEventListener('keydown', function (ev) {
      var gbtn = ev.target.closest('.pdk-grp-btn');
      if (gbtn) {
        var grp = gbtn.closest('.pdk-grp');
        if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault(); openGroup(grp, true);
        }
        return;
      }
      var mod = ev.target.closest('.pdk-mod');
      if (!mod) return;
      var grp2 = mod.closest('.pdk-grp'), mods = modsOf(grp2), i = mods.indexOf(mod);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); mods[(i + 1) % mods.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); mods[(i - 1 + mods.length) % mods.length].focus(); }
      else if (ev.key === 'Home') { ev.preventDefault(); mods[0].focus(); }
      else if (ev.key === 'End') { ev.preventDefault(); mods[mods.length - 1].focus(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); closeAll(); grp2.querySelector('.pdk-grp-btn').focus(); }
      else if (ev.key.length === 1 && /\S/.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        // saisie au vol : saute au module suivant dont le libellé commence par la lettre tapée
        var ch = ev.key.toLowerCase();
        var start = i + 1;
        for (var k = 0; k < mods.length; k++) {
          var m2 = mods[(start + k) % mods.length];
          var lbl = (m2.querySelector('.pdk-mod-lbl').textContent || '').trim().toLowerCase();
          if (lbl.charAt(0) === ch) { m2.focus(); break; }
        }
      }
    });

    global.addEventListener('resize', function () {
      var open = cfg.dock.querySelector('.pdk-grp.open'); if (open) place(open);
    });
  }

  // Met en évidence le groupe qui contient la page/onglet actif + le module actif
  function setActive(k) {
    if (!cfg) return;
    var key = String(k);
    groups().forEach(function (grp) {
      var found = false;
      modsOf(grp).forEach(function (mod) {
        var on = String(mod.dataset.key) === key;
        mod.classList.toggle('on', on);
        var tag = mod.querySelector('[data-tag]');
        if (tag) tag.innerHTML = on ? '<span style="width:6px;height:6px;border-radius:50%;background:#4f46e5;display:inline-block"></span> Actif' : '';
        if (on) found = true;
      });
      grp.classList.toggle('on-active', found);
    });
  }

  global.PortalDock = {
    init: function (config) { cfg = config; render(); },
    setActive: setActive,
    closeAll: closeAll,
    render: render
  };
})(window);
