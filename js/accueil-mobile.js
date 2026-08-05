// ══════════════════════════════════════════════════════════════════════════
// ACCUEIL — vue mobile (maquette « Accueil bento »). Réutilise AV2.data,
// AV2_MODULES et AV2_ACTIONS (aucune requête ni logique dupliquée).
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (!window.MSH) return;
  var svg = MSH.svg, esc = MSH.esc;

  // AV2 / AV2_MODULES / AV2_ACTIONS / Auth sont des `const` : accès par NOM.
  function _data(){ try { return (typeof AV2 !== 'undefined' && AV2.data) ? AV2.data : {}; } catch(e){ return {}; } }
  function _mods(){ try { return (typeof AV2_MODULES !== 'undefined') ? AV2_MODULES : []; } catch(e){ return []; } }
  function _acts(){ try { return (typeof AV2_ACTIONS !== 'undefined') ? AV2_ACTIONS : []; } catch(e){ return []; } }
  function _auth(){ try { return (typeof Auth !== 'undefined') ? Auth : null; } catch(e){ return null; } }

  function td(){ try { return (typeof today === 'function') ? today() : new Date().toISOString().slice(0,10); } catch(e){ return new Date().toISOString().slice(0,10); } }

  function computeKpis(){
    var d = _data(), t = td();
    var pres = 0, pd = d.presDay;
    if (Array.isArray(pd)) pres = pd.filter(function(x){ var s=(x&&(x.statut||x.status))||x; return s==='present'||(x&&x.present===true); }).length;
    else if (pd && typeof pd==='object') pres = Object.keys(pd).filter(function(k){ var v=pd[k]; return v==='present'||v===true||(v&&(v.statut==='present'||v.present)); }).length;
    var inc = (d.incidents||[]).filter(function(i){ var s=String(i.statut||i.status||'').toLowerCase(); return s && s!=='clos' && s!=='cloture' && s!=='clôturé' && s!=='resolu' && s!=='résolu' && s!=='ferme' && s!=='fermé'; }).length;
    var evs = (d.planning||[]).filter(function(p){ return p.date===t; }).length;
    var now = new Date().toTimeString().slice(0,5);
    var poste = (d.shifts||[]).filter(function(s){ if(String(s.date||'').slice(0,10)!==t) return false; var db=(s.debut||'').slice(0,5), f=(s.fin||'').slice(0,5); if(!db||!f) return false; return f<db ? (now>=db||now<f) : (now>=db&&now<f); }).length;
    return [
      { n:pres, l:'Résidents présents', c:'#22d3ee', ic:'users' },
      { n:inc,  l:'Incidents ouverts',  c:'#ef4444', ic:'alert' },
      { n:evs,  l:'Événements',         c:'#818cf8', ic:'cal' },
      { n:poste,l:'En poste',           c:'#10b981', ic:'user' }
    ];
  }

  // Icônes de la grille : mappe les clés d'accueil-v2 vers celles du shell.
  var ICMAP = { grid:'graph', users:'users', chat:'chat', bell:'bell', journal:'journal', cal:'cal', home:'home', folder:'folder', gear:'gear', wrench:'wrench', dollar:'dollar' };

  function isAdmin(){ var a=_auth(); try { return !!(a && a.isAdmin && a.isAdmin()); } catch(e){ return false; } }
  function isRH(){ var a=_auth(); try { return !!(a && a.isRH && a.isRH()); } catch(e){ return false; } }
  // Réutilise le filtrage de droits déjà appliqué au DOM desktop (#accV2).
  function modVisible(m){
    if (m.only==='admin-only') return isAdmin();
    if (m.only==='rh-only') return isRH();
    var a = document.querySelector('#accV2 .v2-mod-wrap a[href="'+ (m.href||'').replace(/"/g,'\\"') +'"]');
    if (a){ var w = a.closest('.v2-mod-wrap'); if (w && w.style.display==='none') return false; }
    return true;
  }

  function modulesGrid(){
    var mods = _mods().filter(modVisible);
    var cells = mods.map(function(m){
      var ic = ICMAP[m.ic] || 'grid';
      return '<a class="m-mod" href="'+esc(m.href)+'">'
        + '<span class="m-mod-ic" style="background:'+m.c+'1e;border:1px solid '+m.c+'33;color:'+m.c+'">'+svg(ic,24)+'</span>'
        + '<span class="m-mod-l">'+esc(m.label)+'</span></a>';
    }).join('');
    return MSH.section('Modules', { label:'Tout voir', action:'MSH.openPlus()' }) + '<div class="m-mods">'+cells+'</div>';
  }

  function todayCard(){
    var d=_data(), t=td();
    var C=['#ef4444','#6366f1','#22d3ee','#f59e0b','#10b981','#ec4899'];
    var evs=(d.planning||[]).filter(function(p){return p.date===t;}).sort(function(a,b){return (a.heure||'').localeCompare(b.heure||'');}).slice(0,6);
    var body = evs.length ? evs.map(function(e,i){
      return '<div class="m-tl-row"><div class="m-tl-time">'+esc(e.heure||'—')+'</div>'
        + '<div class="m-tl-b" style="border-left-color:'+C[i%6]+'"><div class="m-tl-t">'+esc(e.titre||e.type||'Événement')+'</div>'
        + '<div class="m-tl-s">'+esc(e.residentName||e.lieu||'')+'</div></div></div>';
    }).join('') : '<div style="font-size:12px;color:var(--m-muted);padding:6px 0">Aucun événement prévu aujourd\'hui.</div>';
    return '<div class="m-card"><div class="m-card-h"><span style="color:#818cf8">'+svg('cal',15)+'</span>'
      + '<span class="m-card-t">Aujourd\'hui</span><span class="m-card-x">'+evs.length+' événement'+(evs.length>1?'s':'')+'</span></div>'
      + '<a href="planning.html" style="display:block;text-decoration:none">'+body+'</a></div>';
  }

  function teamCard(){
    var d=_data(), t=td(), now=new Date().toTimeString().slice(0,5);
    var jour=(d.shifts||[]).filter(function(s){return String(s.date||'').slice(0,10)===t && s.employeNom;}).sort(function(a,b){return String(a.debut||'').localeCompare(String(b.debut||''));});
    function ini(n){ return (n||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0].toUpperCase();}).join('')||'?'; }
    function actif(s){ var db=(s.debut||'').slice(0,5), f=(s.fin||'').slice(0,5); if(!db||!f)return false; return f<db?(now>=db||now<f):(now>=db&&now<f); }
    var body = jour.length ? jour.slice(0,8).map(function(s){
      var on=actif(s), c=on?'#10b981':'#64748b';
      var h=(s.debut||'').slice(0,5)&&(s.fin||'').slice(0,5)?((s.debut||'').slice(0,5)+' – '+(s.fin||'').slice(0,5)):'';
      return '<div class="m-act"><span class="m-act-ic" style="background:'+c+'22;color:'+c+';font-size:11px;font-weight:800">'+esc(ini(s.employeNom))+'</span>'
        + '<span class="m-act-t" style="flex:1;color:var(--m-body);font-size:12px;white-space:normal">'+esc(s.employeNom)+(on?' <span style="font-size:10px;font-weight:700;color:#10b981;background:#10b98118;padding:1px 6px;border-radius:6px">en poste</span>':'')+'</span>'
        + '<span class="m-act-x">'+esc(h)+'</span></div>';
    }).join('') : '<div style="font-size:12px;color:var(--m-muted);padding:6px 0">Aucun créneau planifié aujourd\'hui.</div>';
    return '<div class="m-card"><div class="m-card-h"><span style="color:#10b981">'+svg('users',15)+'</span>'
      + '<span class="m-card-t">Équipe présente</span><a href="planning-equipe.html" class="m-card-x" style="color:var(--m-accent);font-weight:600;text-decoration:none">Planning</a></div>'+body+'</div>';
  }

  function actionsList(){
    var acts = _acts();
    var rows = acts.map(function(a){
      var tag = a.href ? 'a' : 'button';
      var at = a.href ? ('href="'+esc(a.href)+'"') : ('type="button" onclick="'+esc(a.onclick)+'"');
      return '<'+tag+' class="m-arow" style="background:'+a.c+'14;border:1px solid '+a.c+'33" '+at+'>'
        + '<span class="m-arow-ic" style="background:'+a.c+'">'+svg(MSH.IC[a.ic]?a.ic:'help',19)+'</span>'
        + '<span class="m-arow-b"><span class="m-arow-t">'+esc(a.title)+'</span><span class="m-arow-s">'+esc(a.sub)+'</span></span>'
        + '<span class="m-arow-c">'+svg('chevR',17)+'</span></'+tag+'>';
    }).join('');
    return MSH.section('Actions rapides') + '<div class="m-actions">'+rows+'</div>';
  }

  function greeting(){
    var d=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    return '<div class="m-hello"><div class="m-date">'+esc(d)+'</div></div>';
  }

  function searchBar(){
    return '<a href="residents.html" class="m-search" style="text-decoration:none">'+svg('search',16)+'<span>Rechercher un résident, une note…</span></a>';
  }

  function render(){
    MSH.setScroll(
      MSH.headerHome({})
      + greeting()
      + searchBar()
      + MSH.kpiGrid(computeKpis())
      + modulesGrid()
      + todayCard()
      + teamCard()
      + actionsList()
    );
  }

  MSH.page(render);

  // initAccueilV2() est déjà lancé (inline, avant ce script) et charge les
  // données en async. On re-rend le mobile dès que le DOM desktop #accV2
  // change (grille rendue, puis #accV2Bas peuplé après le fetch).
  var host = document.getElementById('accV2');
  if (host && window.MutationObserver) {
    var deb;
    var obs = new MutationObserver(function(){ clearTimeout(deb); deb = setTimeout(function(){ MSH.rerender(); }, 120); });
    obs.observe(host, { childList:true, subtree:true });
  }
})();
