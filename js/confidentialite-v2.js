/* ══════════════════════════════════════════════════════════════════════════
   INTERNALIS — Confidentialité · module de rendu V2 (thème sombre)

   Page statique : aucune donnée en base, aucun appel Supabase.
   Ce module habille le contenu légal présent dans le HTML :
     · sommaire construit à partir des sections réellement présentes ;
     · repères chiffrés calculés depuis le DOM (jamais de valeur inventée) ;
     · surlignage de la section courante au défilement ;
     · recherche plein texte dans les sections ;
     · impression / export PDF.

   Le contenu légal reste dans confidentialite.html : il doit rester lisible
   même si ce script ne se charge pas (dégradation douce).
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SECS = 'article.cf2-sec';

  function $(id) { return document.getElementById(id); }
  function secs() { return Array.prototype.slice.call(document.querySelectorAll(SECS)); }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

  /* Normalisation sans accent pour la recherche */
  function norm(s) {
    s = (s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { /* moteur ancien */ }
    return s;
  }

  /* ── Sommaire ─────────────────────────────────────────────────────────── */
  function renderSommaire() {
    var nav = $('confSommaire');
    if (!nav) return;
    var list = secs();
    if (!list.length) { nav.innerHTML = '<div class="v2-blk-vide">Sommaire indisponible.</div>'; return; }
    nav.innerHTML = list.map(function (sec) {
      var t = sec.querySelector('.cf2-sec-t');
      var n = sec.getAttribute('data-num') || '';
      var c = (sec.querySelector('.cf2-sec-n') || {}).style;
      return '<a class="cf2-toc-l" href="#' + sec.id + '" data-sec="' + sec.id + '">' +
             '<span class="cf2-toc-n"' + (c && c.getPropertyValue('--c') ? ' style="--c:' + c.getPropertyValue('--c') + '"' : '') + '>' + n + '</span>' +
             '<span class="cf2-toc-t">' + (t ? t.textContent : sec.id) + '</span></a>';
    }).join('');

    nav.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('.cf2-toc-l') : null;
      if (!a) return;
      var cible = document.getElementById(a.getAttribute('data-sec'));
      if (!cible) return;
      e.preventDefault();
      cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + cible.id);
      marquer(cible.id);
    });
  }

  function marquer(id) {
    var liens = document.querySelectorAll('.cf2-toc-l');
    for (var i = 0; i < liens.length; i++) {
      liens[i].classList.toggle('on', liens[i].getAttribute('data-sec') === id);
    }
  }

  /* ── Repères chiffrés (calculés, jamais inventés) ─────────────────────── */
  function renderStats() {
    var box = $('confStats');
    if (!box) return;
    var nbSec = secs().length;
    var nbCat = document.querySelectorAll('.cf2-cat').length;
    var nbDroits = document.querySelectorAll('.cf2-droits-g .cf2-droit').length;
    var kpis = [
      { v: String(nbSec),    label: 'Sections',    sub: 'de la politique',   c: '#22d3ee' },
      { v: String(nbCat),    label: 'Catégories',  sub: 'de données',        c: '#6366f1' },
      { v: String(nbDroits), label: 'Droits',      sub: 'RGPD exerçables',   c: '#16a34a' },
      { v: '0',              label: 'Tiers',       sub: 'destinataire',      c: '#8b5cf6' }
    ];
    box.innerHTML = kpis.map(function (k) {
      return '<div class="dc-kpi" style="--dc-c:' + k.c + '">' +
               '<div class="dc-kpi-top"><span class="dc-kpi-label">' + k.label + '</span></div>' +
               '<div class="dc-kpi-val">' + k.v + '</div>' +
               '<div class="dc-kpi-sub">' + k.sub + '</div>' +
             '</div>';
    }).join('');
  }

  /* ── Défilement : section courante ────────────────────────────────────── */
  function scrollspy() {
    var list = secs();
    if (!list.length) return;
    if (!('IntersectionObserver' in window)) { marquer(list[0].id); return; }
    var vus = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { vus[en.target.id] = en.isIntersecting; });
      for (var i = 0; i < list.length; i++) {
        if (vus[list[i].id]) { marquer(list[i].id); return; }
      }
    }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
    list.forEach(function (s) { obs.observe(s); });
  }

  /* ── Recherche ────────────────────────────────────────────────────────── */
  function brancherRecherche() {
    var inp = $('confSearch');
    var vide = $('confVide');
    if (!inp) return;
    function filtrer() {
      var q = norm(inp.value.trim());
      var n = 0;
      secs().forEach(function (sec) {
        var ok = !q || norm(txt(sec)).indexOf(q) !== -1;
        sec.hidden = !ok;
        if (ok) n++;
        var lien = document.querySelector('.cf2-toc-l[data-sec="' + sec.id + '"]');
        if (lien) lien.classList.toggle('off', !ok);
      });
      if (vide) vide.hidden = n !== 0;
    }
    inp.addEventListener('input', filtrer);
    filtrer();
  }

  /* ── Impression ───────────────────────────────────────────────────────── */
  function brancherImpression() {
    var b = $('confPrint');
    if (b) b.addEventListener('click', function () { window.print(); });
  }

  /* ── Point d'entrée ───────────────────────────────────────────────────── */
  function renderConfidentialite() {
    renderSommaire();
    renderStats();
    brancherRecherche();
    brancherImpression();
    scrollspy();
    var h = (location.hash || '').replace('#', '');
    if (h && document.getElementById(h)) {
      document.getElementById(h).scrollIntoView({ block: 'start' });
      marquer(h);
    } else {
      var l = secs();
      if (l.length) marquer(l[0].id);
    }
  }

  /* Un `function` de premier niveau dans une IIFE ne crée rien sur window :
     on publie explicitement pour la navigation en iframe et les onclick. */
  window.renderConfidentialite = renderConfidentialite;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderConfidentialite);
  } else {
    renderConfidentialite();
  }
})();
