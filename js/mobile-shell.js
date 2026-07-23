// ══════════════════════════════════════════════════════════════════════════
// INTERNALIS — SHELL MOBILE (≤640px) — cadre commun des maquettes « bento ».
// Monte #mob-root (zone défilante + barre du bas), fournit les icônes,
// des aides de rendu et le hub « Plus » (plan du site complet).
// Les pages ajoutent js/<page>-mobile.js qui appelle MSH.page(renderFn).
// N'a AUCUN effet > 640px. Réutilise 100% des données/actions existantes.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (window.MSH) return;

  var MQ = window.matchMedia('(max-width:640px)');

  // ── Icônes (traits, viewBox 24) ─────────────────────────────────────────
  var IC = {
    home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    chat:'<path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a2 2 0 0 1-2-2v-1"/><path d="M15 4H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2v4l4-4"/>',
    cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    journal:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    dollar:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    car:'<path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.5a1 1 0 0 0-.8.4L2 11v5h2"/><circle cx="6.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>',
    help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 13.5"/>',
    plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    chevR:'<polyline points="9 18 15 12 9 6"/>',
    chevL:'<polyline points="15 18 9 12 15 6"/>',
    search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    pen:'<path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    pill:'<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    checklist:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    doc:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    utensils:'<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 2v20M16 2v20c3-1 5-4 5-8 0-6-3-10-5-12z"/>',
    activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    door:'<path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h20M6 20V6a2 2 0 0 1 2-2h4v16"/>',
    bed:'<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20"/><circle cx="7" cy="11" r="2"/>',
    star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    graph:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    award:'<circle cx="12" cy="8" r="6"/><path d="M15.5 12.5 17 22l-5-3-5 3 1.5-9.5"/>',
    clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    presence:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    note:'<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    map:'<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>'
  };

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function svg(key, size, extra){ size = size || 20; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'+(extra||'')+'>'+(IC[key]||'')+'</svg>'; }
  function initials(a, b){ a=(a||'').trim(); b=(b||'').trim(); var r=(a[0]||'')+(b[0]||''); return r.toUpperCase()||'?'; }

  // ── Onglets du bas ──────────────────────────────────────────────────────
  var TABS = [
    { key:'accueil',  label:'Accueil',   ic:'home',  href:'accueil.html',        m:['accueil.html'] },
    { key:'res',      label:'Résidents', ic:'users', href:'residents.html',      m:['residents.html','resident.html'] },
    { key:'tr',       label:'Transmis.', ic:'chat',  href:'transmissions.html',  m:['transmissions.html'] },
    { key:'agenda',   label:'Agenda',    ic:'cal',   href:'planning.html',       m:['planning.html'] },
    { key:'plus',     label:'Plus',      ic:'grid',  href:'#plus',               m:[] }
  ];
  function currentPage(){ return (location.pathname.split('/').pop() || 'accueil.html').toLowerCase(); }
  function activeTab(){ var p=currentPage(); for (var i=0;i<TABS.length;i++){ if (TABS[i].m.indexOf(p)!==-1) return TABS[i].key; } return 'plus'; }

  function navHtml(active){
    active = active || activeTab();
    return TABS.map(function(t){
      var on = t.key===active;
      var href = t.key==='plus' ? 'javascript:void 0' : t.href;
      var oc = t.key==='plus' ? ' data-msh="plus"' : '';
      return '<a href="'+href+'"'+(on?' class="on"':'')+oc+'>'+svg(t.ic,23)+'<span>'+t.label+'</span></a>';
    }).join('');
  }

  // ── Plan du site (hub « Plus ») — accès à TOUTES les pages ───────────────
  var SITEMAP = [
    { g:'Pilotage & activité', items:[
      { l:'Tableau de bord', h:'pilotage.html', ic:'graph', c:'#818cf8' },
      { l:'Rapport d\'activité', h:'rapport.html', ic:'clipboard', c:'#6366f1' }
    ]},
    { g:'Accompagnement', items:[
      { l:'Vie quotidienne', h:'vie-quotidienne.html', ic:'home', c:'#0d9488' },
      { l:'Journal de bord', h:'journal.html', ic:'journal', c:'#059669' },
      { l:'Transmissions', h:'transmissions.html', ic:'chat', c:'#3b82f6' },
      { l:'Présences', h:'presences.html', ic:'presence', c:'#10b981' },
      { l:'Activités', h:'activites.html', ic:'activity', c:'#8b5cf6' },
      { l:'Repas', h:'repas.html', ic:'utensils', c:'#ea580c' },
      { l:'Médicaments', h:'medicaments.html', ic:'pill', c:'#ef4444' },
      { l:'Plan de soins', h:'plan-soins.html', ic:'heart', c:'#e11d48' },
      { l:'Cahier de nuit', h:'nuit.html', ic:'moon', c:'#6366f1' },
      { l:'Visites', h:'visites.html', ic:'door', c:'#0891b2' },
      { l:'Incidents', h:'incidents.html', ic:'alert', c:'#e11d48' },
      { l:'Alertes', h:'alertes.html', ic:'bell', c:'#ef4444' }
    ]},
    { g:'Dossiers & suivi', items:[
      { l:'Dossiers & suivi', h:'dossiers.html', ic:'folder', c:'#b45309' },
      { l:'Admissions', h:'admissions.html', ic:'door', c:'#0891b2' },
      { l:'Échéances', h:'echeances.html', ic:'clock', c:'#f59e0b' },
      { l:'Documents', h:'documents.html', ic:'doc', c:'#3b82f6' },
      { l:'Évaluations', h:'evaluations.html', ic:'checklist', c:'#8b5cf6' },
      { l:'Objectifs / PPE', h:'objectifs.html', ic:'star', c:'#d97706' },
      { l:'Fiche de liaison', h:'fiche-liaison.html', ic:'doc', c:'#0d9488' },
      { l:'Conseil Vie Sociale', h:'cvs.html', ic:'users', c:'#16a34a' },
      { l:'Satisfaction', h:'satisfaction.html', ic:'star', c:'#22c55e' },
      { l:'Registre EIG', h:'eig.html', ic:'shield', c:'#ef4444' },
      { l:'Répertoire', h:'repertoire.html', ic:'book', c:'#6366f1' },
      { l:'Via Trajectoire', h:'viatrajectoire.html', ic:'map', c:'#0891b2' }
    ]},
    { g:'Équipe & communication', items:[
      { l:'Messages', h:'messages.html', ic:'mail', c:'#3b82f6' },
      { l:'Notes', h:'notes.html', ic:'note', c:'#d97706' },
      { l:'Planning équipe', h:'planning-equipe.html', ic:'cal', c:'#8b5cf6' },
      { l:'Contacts externes', h:'contacts-externes.html', ic:'user', c:'#0891b2' }
    ]},
    { g:'Ressources humaines', items:[
      { l:'RH', h:'rh.html', ic:'users', c:'#a855f7' },
      { l:'Contrats', h:'contrats.html', ic:'doc', c:'#8b5cf6' },
      { l:'Paie', h:'paie.html', ic:'dollar', c:'#22c55e' },
      { l:'Formations', h:'formations.html', ic:'award', c:'#0d9488' },
      { l:'Entretiens pro', h:'entretiens.html', ic:'chat', c:'#3b82f6' },
      { l:'Recrutement', h:'recrutement.html', ic:'briefcase', c:'#6366f1' },
      { l:'Pointage', h:'pointage.html', ic:'clock', c:'#f59e0b' },
      { l:'Astreintes', h:'astreintes.html', ic:'bell', c:'#ef4444' }
    ]},
    { g:'Mon espace', items:[
      { l:'Mon espace', h:'portail.html', ic:'user', c:'#818cf8' },
      { l:'Mes congés', h:'mes-conges.html', ic:'cal', c:'#d97706' },
      { l:'Mes absences', h:'mes-absences.html', ic:'clock', c:'#f59e0b' },
      { l:'Mes fiches de paie', h:'mes-fiches-paie.html', ic:'dollar', c:'#22c55e' },
      { l:'Mes formations', h:'mes-formations.html', ic:'award', c:'#0d9488' }
    ]},
    { g:'Finance & moyens', items:[
      { l:'Finance', h:'finance.html', ic:'dollar', c:'#22c55e' },
      { l:'Budget', h:'budget.html', ic:'graph', c:'#16a34a' },
      { l:'Facturation', h:'facturation.html', ic:'doc', c:'#0891b2' },
      { l:'Véhicules', h:'vehicules.html', ic:'car', c:'#6366f1' },
      { l:'Inventaire', h:'inventaire.html', ic:'clipboard', c:'#b45309' },
      { l:'Chambres', h:'chambres.html', ic:'bed', c:'#0d9488' }
    ]},
    { g:'Aide & informations', items:[
      { l:'Centre d\'aide', h:'aide.html', ic:'help', c:'#818cf8' },
      { l:'Documentation', h:'documentation.html', ic:'doc', c:'#3b82f6' },
      { l:'Guide de prise en main', h:'guide-formation.html', ic:'book', c:'#0d9488' },
      { l:'Confidentialité', h:'confidentialite.html', ic:'shield', c:'#64748b' }
    ]}
  ];

  function plusHubHtml(){
    var rows = SITEMAP.map(function(grp){
      var items = grp.items.map(function(it){
        return '<a href="'+it.h+'" class="m-lc" style="padding:12px 13px;margin:0">'
          + '<div class="m-lc-top" style="gap:12px">'
          +   '<span style="width:38px;height:38px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:'+it.c+'1e;border:1px solid '+it.c+'33;color:'+it.c+'">'+svg(it.ic,18)+'</span>'
          +   '<div class="m-lc-b"><div class="m-lc-n" style="font-size:13.5px">'+esc(it.l)+'</div></div>'
          +   '<span class="m-arow-c">'+svg('chevR',17)+'</span>'
          + '</div></a>';
      }).join('');
      return '<div class="m-eyebrow" style="margin-top:18px">'+esc(grp.g)+'</div><div class="m-list">'+items+'</div>';
    }).join('');
    return ''
      + '<div class="mh-sub">'
      +   '<div class="mh-back" data-msh="plus-close">'+svg('chevL',18)+'</div>'
      +   '<div class="mh-ttl"><div class="mh-eye">INTERNALIS</div><div class="mh-h">Plus</div></div>'
      + '</div>'
      + rows
      + '<div style="text-align:center;color:var(--m-off);font-size:11px;margin:22px 0 4px">INTERNALIS · v2.6</div>';
  }

  // ── Montage du shell ────────────────────────────────────────────────────
  var scrollEl = null, root = null;
  function injectFonts(){
    if (document.getElementById('mshFonts')) return;
    var l = document.createElement('link'); l.id='mshFonts'; l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap';
    document.head.appendChild(l);
  }
  function mount(){
    if (root) return;
    injectFonts();
    root = document.createElement('div'); root.id='mob-root';
    scrollEl = document.createElement('div'); scrollEl.className='msh-scroll';
    var nav = document.createElement('nav'); nav.className='msh-nav'; nav.setAttribute('aria-label','Navigation');
    nav.innerHTML = navHtml();
    root.appendChild(scrollEl); root.appendChild(nav);
    document.body.appendChild(root);
    document.body.classList.add('has-mob');
    // Délégation de clic pour les contrôles du shell (Plus, etc.)
    root.addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('[data-msh]') : null;
      if (!t) return;
      var a = t.getAttribute('data-msh');
      if (a==='plus'){ e.preventDefault(); openPlus(); }
      else if (a==='plus-close'){ e.preventDefault(); closePlus(); }
      else if (a==='bell'){ e.preventDefault(); location.href='alertes.html'; }
      else if (a==='me'){ e.preventDefault(); location.href='portail.html'; }
    });
  }

  var _prevScroll = null;
  function openPlus(){
    _prevScroll = scrollEl.innerHTML;
    scrollEl.innerHTML = plusHubHtml();
    scrollEl.scrollTop = 0;
    var nav = root.querySelector('.msh-nav'); if (nav) nav.innerHTML = navHtml('plus');
  }
  function closePlus(){
    if (_prevScroll != null){ scrollEl.innerHTML = _prevScroll; _prevScroll = null; }
    var nav = root.querySelector('.msh-nav'); if (nav) nav.innerHTML = navHtml();
  }

  function setScroll(html){
    if (!scrollEl) return;
    var top = scrollEl.scrollTop;
    scrollEl.innerHTML = html;
    scrollEl.scrollTop = top; // conserve la position au re-render
  }

  // ── En-têtes prêts à l'emploi ───────────────────────────────────────────
  function sessionInfo(){
    // Auth / AV2 sont des `const` : accessibles par NOM, pas via window.
    var s = {}; try { if (typeof Auth !== 'undefined' && Auth.getSession) s = Auth.getSession() || {}; } catch(e){}
    var etab=''; try { var e = (typeof getCurrentEtab === 'function') ? getCurrentEtab() : null; etab = (e && e.nom) || s.etablissementNom || ''; } catch(e){}
    return { prenom:s.prenom||s.username||s.firstName||'', nom:s.nom||s.lastName||'', etab:etab };
  }
  function headerHome(opts){
    opts = opts || {}; var si = sessionInfo();
    var etab = opts.etab != null ? opts.etab : (si.etab || 'INTERNALIS');
    var ini = opts.avatar || initials(si.prenom, si.nom) || 'IN';
    var badge = opts.notif ? '<span class="m-badge" style="position:absolute;top:-4px;right:-4px">'+esc(opts.notif)+'</span>' : '';
    return '<div class="mh">'
      + '<div class="mh-logo">I</div>'
      + '<div class="mh-id"><div class="mh-name">INTERNALIS</div><div class="mh-etab">'+esc(etab)+'</div></div>'
      + '<div class="mh-actions">'
      +   '<div class="mh-btn" data-msh="bell">'+svg('bell',19)+badge+'</div>'
      +   '<div class="mh-av" data-msh="me">'+esc(ini)+'</div>'
      + '</div></div>';
  }
  function headerSub(opts){
    opts = opts || {};
    var back = opts.back || 'accueil.html';
    var right = '';
    if (opts.fab) right = '<div class="mh-fab" '+(opts.fabAction?('onclick="'+opts.fabAction+'"'):'data-msh="fab"')+'>'+svg(opts.fabIcon||'plus',20)+'</div>';
    else if (opts.edit) right = '<div class="mh-fab" style="background:var(--m-ctrl);color:var(--m-body2);box-shadow:none;border:1px solid var(--m-brd)" '+(opts.editAction?('onclick="'+opts.editAction+'"'):'')+'>'+svg('pen',18)+'</div>';
    return '<div class="mh-sub">'
      + '<a class="mh-back" href="'+esc(back)+'">'+svg('chevL',18)+'</a>'
      + '<div class="mh-ttl"><div class="mh-eye">'+esc(opts.eye||'')+'</div><div class="mh-h">'+esc(opts.title||'')+'</div></div>'
      + right
      + '</div>';
  }

  // ── Petits constructeurs ────────────────────────────────────────────────
  function kpiGrid(items){
    return '<div class="m-kpis">'+items.map(function(k){
      return '<div class="m-kpi"><span class="m-kpi-ic" style="background:'+k.c+'22;color:'+k.c+'">'+svg(k.ic,19)+'</span>'
        + '<div class="m-kpi-b"><div class="m-kpi-n"'+(k.nc?(' style="color:'+k.nc+'"'):'')+'>'+esc(k.n)+'</div><div class="m-kpi-l">'+esc(k.l)+'</div></div></div>';
    }).join('')+'</div>';
  }
  function section(label, link){ return '<div class="m-sech"><span class="m-eye">'+esc(label)+'</span>'+(link?'<span class="m-link" '+(link.action?('onclick="'+link.action+'"'):'')+'>'+esc(link.label)+'</span>':'')+'</div>'; }

  window.MSH = {
    IC:IC, svg:svg, esc:esc, initials:initials,
    isMobile:function(){ return MQ.matches; },
    mount:mount, setScroll:setScroll, root:function(){ return root; }, scroll:function(){ return scrollEl; },
    navHtml:navHtml, openPlus:openPlus, closePlus:closePlus,
    headerHome:headerHome, headerSub:headerSub, kpiGrid:kpiGrid, section:section,
    // Enregistre le rendu d'une page ; (re)rend quand on est sur mobile.
    page:function(renderFn){
      MSH._render = renderFn;
      function go(){ if (MQ.matches){ mount(); try { renderFn(); } catch(e){ console.error('[MSH] render', e); } } }
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', go); else go();
      MQ.addEventListener ? MQ.addEventListener('change', go) : MQ.addListener(go);
    },
    // Re-render la page courante (à appeler après un changement de données).
    rerender:function(){ if (MQ.matches && MSH._render){ try { MSH._render(); } catch(e){ console.error(e); } } }
  };
})();
