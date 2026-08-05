/* ══════════════════════════════════════════════════════════════════════════
   INTERNALIS — Véhicules, rendu V2 (thème sombre « bento »)

   Ce module ne fait QUE du rendu : la couche Supabase (sbGetPlanningEvents,
   sbSavePlanningEvent, sbDeletePlanningEvent) et les actions
   (reserverVehicule, annulerReservation) restent dans js/vehicules.js.
   `renderReservations()` y est redéfinie pour déléguer ici.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ICO = {
    car: '<rect x="2" y="7" width="20" height="12" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
  };
  function svg(d, w) {
    w = w || 16;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:' + w + 'px;height:' + w + 'px">' + d + '</svg>';
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(id) { return document.getElementById(id); }

  var JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  /* ── Accès aux données ────────────────────────────────────────────── */
  // `_vehiculesPlanningCache` est un `let` de premier niveau de js/vehicules.js :
  // il n'existe PAS sur window, mais il est bien dans la portée lexicale globale
  // partagée par les scripts classiques — on le lit donc par son nom.
  function cache() {
    try {
      if (typeof _vehiculesPlanningCache !== 'undefined' && Array.isArray(_vehiculesPlanningCache)) {
        return _vehiculesPlanningCache;
      }
    } catch (e) { /* TDZ : rendu appelé avant l'init */ }
    return [];
  }
  function reservations() { return cache().filter(function (e) { return e && e.type === 'vehicule'; }); }

  // Parc connu = liste partagée (datalist alimentée par sbGetVehiculesListe)
  // + tout véhicule réellement présent dans les réservations.
  function parc() {
    var noms = [];
    var dl = $('vehiculesList');
    if (dl) Array.prototype.forEach.call(dl.options, function (o) { if (o.value) noms.push(o.value); });
    reservations().forEach(function (e) { if (e.vehicule && noms.indexOf(e.vehicule) === -1) noms.push(e.vehicule); });
    return noms;
  }

  function debut(e) {
    var d = new Date(e.date + 'T' + ((e.time || e.heure || '00:00')).slice(0, 5));
    return isNaN(d) ? null : d;
  }
  function fin(e) {
    var s = debut(e);
    if (!s) return null;
    if (e.dateEnd && e.timeEnd) {
      var d = new Date(e.dateEnd + 'T' + e.timeEnd.slice(0, 5));
      if (!isNaN(d)) return d;
    }
    return new Date(s.getTime() + (parseInt(e.duree, 10) || 60) * 60000);
  }
  function hhmm(d) { return d ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''; }
  function jour(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ── État de filtrage ─────────────────────────────────────────────── */
  var filtre = null; // null = tous

  function setFiltre(v) {
    filtre = (v === '' || v == null || v === filtre) ? null : v;
    render();
  }

  /* ── Rendu ────────────────────────────────────────────────────────── */
  function render() {
    var now = new Date();
    var all = reservations();

    var avenir = all.filter(function (e) { var f = fin(e); return f && f > now; })
      .sort(function (a, b) { return (debut(a) || 0) - (debut(b) || 0); });
    var passe = all.filter(function (e) { var f = fin(e); return !f || f <= now; })
      .sort(function (a, b) { return (debut(b) || 0) - (debut(a) || 0); });

    var noms = parc();
    var vus = filtre ? function (e) { return e.vehicule === filtre; } : function () { return true; };

    renderKpis(now, all, avenir, noms);
    renderChips(avenir, noms);
    renderListe('vReservationsList', avenir.filter(vus), now, true, 'Aucune réservation à venir.');
    renderHistorique(passe.filter(vus), passe.length, now);
    renderParc(noms, avenir, now);
    renderCharge(all, now);

    var c = $('vhCount');
    if (c) {
      var n = avenir.filter(vus).length;
      c.textContent = n + (n > 1 ? ' réservations à venir' : ' réservation à venir') + (filtre ? ' · ' + filtre : '');
    }
  }

  function renderKpis(now, all, avenir, noms) {
    var el = $('vhKpis');
    if (!el) return;
    var jNow = jour(now);
    var occupes = {};
    all.forEach(function (e) {
      var d = debut(e), f = fin(e);
      if (d && f && d <= now && f > now) occupes[e.vehicule] = e;
    });
    var nbOccupes = noms.filter(function (n) { return occupes[n]; }).length;
    var dispo = Math.max(0, noms.length - nbOccupes);
    var auj = all.filter(function (e) { return e.date === jNow; }).length;

    var k = [
      { n: noms.length, l: 'Véhicules', s: noms.length ? 'parc du foyer' : 'aucun véhicule paramétré', c: '#818cf8', g: 'linear-gradient(135deg,#4f46e5,#818cf8)', i: ICO.car },
      { n: dispo, l: 'Disponibles', s: nbOccupes + (nbOccupes > 1 ? ' en sortie' : ' en sortie'), c: '#10b981', g: 'linear-gradient(135deg,#059669,#34d399)', i: ICO.check },
      { n: auj, l: "Sorties aujourd'hui", s: now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), c: '#f59e0b', g: 'linear-gradient(135deg,#f59e0b,#fbbf24)', i: ICO.clock },
      { n: avenir.length, l: 'Réservations à venir', s: avenir.length ? 'prochaine : ' + libelleCourt(avenir[0]) : 'aucune à venir', c: '#22d3ee', g: 'linear-gradient(135deg,#0891b2,#22d3ee)', i: ICO.cal }
    ];
    el.innerHTML = k.map(function (x) {
      return '<div class="dc-kpi" style="--dc-c:' + x.c + '">'
        + '<div class="dc-kpi-top"><span class="dc-kpi-label">' + esc(x.l) + '</span>'
        + '<span class="dc-kpi-ico" style="color:' + x.c + '">' + svg(x.i, 16) + '</span></div>'
        + '<div class="dc-kpi-val">' + x.n + '</div>'
        + '<div class="dc-kpi-sub">' + esc(x.s) + '</div></div>';
    }).join('');
  }

  function libelleCourt(e) {
    var d = debut(e);
    if (!d) return esc(e.vehicule || '');
    return (typeof formatDate === 'function' ? formatDate(e.date) : e.date) + ' ' + hhmm(d);
  }

  function renderChips(avenir, noms) {
    var el = $('vhChips');
    if (!el) return;
    var cnt = {};
    avenir.forEach(function (e) { cnt[e.vehicule] = (cnt[e.vehicule] || 0) + 1; });
    var html = '<button type="button" class="v2-chip-f' + (filtre ? '' : ' on') + '" onclick="vhSetFiltre(\'\')">'
      + 'Tous <span class="n">' + avenir.length + '</span></button>';
    html += noms.map(function (n) {
      return '<button type="button" class="v2-chip-f' + (filtre === n ? ' on' : '') + '" onclick="vhSetFiltre(' + JSON.stringify(n).replace(/"/g, '&quot;') + ')">'
        + esc(n) + ' <span class="n">' + (cnt[n] || 0) + '</span></button>';
    }).join('');
    el.innerHTML = html;
  }

  function ligne(e, now, annulable) {
    var d = debut(e), f = fin(e);
    var tag, tc;
    if (d && f && d <= now && f > now) { tag = 'En cours'; tc = '#f59e0b'; }
    else if (d && d > now) {
      var j = Math.round((new Date(jour(d)) - new Date(jour(now))) / 86400000);
      tag = j <= 0 ? "Aujourd'hui" : (j === 1 ? 'Demain' : 'J-' + j);
      tc = j <= 1 ? '#22d3ee' : '#818cf8';
    } else { tag = 'Terminée'; tc = '#6f86ab'; }

    var meta = [];
    if (d) meta.push((typeof formatDate === 'function' ? formatDate(e.date) : e.date) + ' · ' + hhmm(d) + (f ? ' → ' + hhmm(f) : ''));
    if (e.destination) meta.push('<span class="vh-r-dest">' + svg(ICO.pin, 12) + esc(e.destination) + '</span>');

    return '<div class="vh-r" style="--pc:' + tc + '">'
      + '<span class="vh-r-ico">' + svg(ICO.car, 19) + '</span>'
      + '<div class="vh-r-b">'
      + '<div class="vh-r-t">' + esc(e.vehicule || 'Véhicule') + '</div>'
      + '<div class="vh-r-m">' + meta.join('<span class="sep"></span>') + '</div>'
      + (e.reservedBy ? '<div class="vh-r-who">Réservé par ' + esc(e.reservedBy) + '</div>' : '')
      + '</div>'
      + '<span class="vh-r-tag dc-badge" style="background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44"><span class="d" style="background:' + tc + '"></span>' + tag + '</span>'
      + (annulable
        ? '<button type="button" class="vh-x" title="Annuler la réservation" aria-label="Annuler la réservation" onclick="annulerReservation(' + JSON.stringify(String(e.id)).replace(/"/g, '&quot;') + ')">' + svg(ICO.x, 14) + '</button>'
        : '')
      + '</div>';
  }

  function renderListe(id, list, now, annulable, vide) {
    var el = $(id);
    if (!el) return;
    el.innerHTML = list.length
      ? '<div class="vh-list">' + list.map(function (e) { return ligne(e, now, annulable); }).join('') + '</div>'
      : '<div class="v2-blk-vide">' + vide + '</div>';
  }

  function renderHistorique(passe, total, now) {
    var card = $('pastReservationsCard');
    if (!card) return;
    // Historique réservé aux administrateurs (classe .admin-only d'origine) :
    // on ne le réaffiche jamais pour un autre rôle. Masqué aussi tant qu'aucune
    // réservation passée n'existe, comme dans la version précédente.
    var admin = (typeof Auth !== 'undefined' && Auth.isAdmin) ? Auth.isAdmin() : false;
    if (!admin || !total) { card.style.display = 'none'; return; }
    card.style.display = '';
    renderListe('vPastReservationsList', passe.slice(0, 40), now, true, 'Aucune réservation passée.');
    var n = $('vhPastCount');
    if (n) n.textContent = passe.length + (passe.length > 1 ? ' réservations' : ' réservation');
  }

  function renderParc(noms, avenir, now) {
    var el = $('vhParc');
    if (!el) return;
    if (!noms.length) { el.innerHTML = '<div class="v2-blk-vide">Aucun véhicule paramétré (Administration → Configuration).</div>'; return; }
    var all = reservations();
    el.innerHTML = noms.map(function (n) {
      var courante = null, prochaine = null;
      all.forEach(function (e) {
        if (e.vehicule !== n) return;
        var d = debut(e), f = fin(e);
        if (d && f && d <= now && f > now) courante = e;
      });
      avenir.forEach(function (e) {
        if (e.vehicule !== n || prochaine) return;
        var d = debut(e);
        if (d && d > now) prochaine = e;
      });
      var c = courante ? '#f59e0b' : '#10b981';
      var st = courante ? 'Sorti' : 'Libre';
      var sub = courante
        ? 'Retour ' + hhmm(fin(courante)) + (courante.destination ? ' · ' + esc(courante.destination) : '')
        : (prochaine ? 'Prochaine : ' + libelleCourt(prochaine) : 'Aucune réservation');
      return '<div class="vh-p" style="--pc:' + c + ';border-left:3px solid ' + c + '">'
        + '<span class="vh-p-dot"></span>'
        + '<div style="min-width:0;flex:1"><div class="vh-p-n">' + esc(n) + '</div><div class="vh-p-s">' + sub + '</div></div>'
        + '<span class="vh-p-st dc-badge" style="background:' + c + '22;color:' + c + ';border:1px solid ' + c + '44"><span class="d" style="background:' + c + '"></span>' + st + '</span></div>';
    }).join('');
  }

  function renderCharge(all, now) {
    var el = $('vhCharge');
    if (!el) return;
    var cols = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      var k = jour(d);
      cols.push({ k: k, l: JOURS[d.getDay()], n: all.filter(function (e) { return e.date === k; }).length });
    }
    var max = Math.max(1, Math.max.apply(null, cols.map(function (c) { return c.n; })));
    el.innerHTML = '<div class="vh-chart">' + cols.map(function (c) {
      var h = c.n ? Math.max(8, Math.round(c.n / max * 74)) : 3;
      return '<div class="vh-chart-c"><span class="vh-chart-v">' + (c.n || '') + '</span>'
        + '<div class="vh-chart-b' + (c.n ? '' : ' zero') + '" style="height:' + h + 'px"></div>'
        + '<span class="vh-chart-l">' + c.l + '</span></div>';
    }).join('') + '</div>';
  }

  /* ── Modale de réservation ────────────────────────────────────────── */
  function ouvrir() {
    var d = $('vDateAller');
    if (d && !d.value) {
      var n = new Date();
      var p = function (x) { return String(x).padStart(2, '0'); };
      d.value = n.getFullYear() + '-' + p(n.getMonth() + 1) + '-' + p(n.getDate()) + 'T' + p(n.getHours()) + ':' + p(n.getMinutes());
    }
    if (typeof openModal === 'function') openModal('modalReservation');
  }

  /* ── Publication (les `const`/`let` de module ne créent rien sur window) ── */
  window.vhSetFiltre = setFiltre;
  window.vhRender = render;
  window.openReservationModal = ouvrir;

  // La fonction de rendu d'origine délègue désormais au module V2.
  window.renderReservations = render;

  document.addEventListener('DOMContentLoaded', function () { setTimeout(render, 0); });
})();
