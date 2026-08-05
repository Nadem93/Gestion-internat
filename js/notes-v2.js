/* ══════════════════════════════════════════════════════════════════════════
   NOTES RAPIDES — RENDU V2
   Langage visuel de la maquette « Portail - refonte (bento) » : bandeau de
   compteurs, chips de filtre, liste en lignes, éditeur en carte.

   Ce module ne touche PAS au stockage : il réutilise les fonctions de la page
   (getNotes / saveNotes / selectNote / newNote / onEdit / deleteCurrentNote)
   et les variables globales `notes` et `currentNoteId`.
   Les notes restent strictement personnelles (localStorage par utilisateur).
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var filtre = 'all'; // all | pin | week

  // ── Utilitaires ────────────────────────────────────────────────────────
  function esc(s) { return (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s); }

  function listeNotes() { return (typeof notes !== 'undefined' && Array.isArray(notes)) ? notes : []; }

  function noteCourante() {
    if (typeof currentNoteId === 'undefined' || currentNoteId == null) return null;
    return listeNotes().find(function (n) { return String(n.id) === String(currentNoteId); }) || null;
  }

  function debutSemaine() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var j = (d.getDay() + 6) % 7; // lundi = 0
    d.setDate(d.getDate() - j);
    return d;
  }

  function estCetteSemaine(n) {
    if (!n.updatedAt) return false;
    var t = new Date(n.updatedAt).getTime();
    return !isNaN(t) && t >= debutSemaine().getTime();
  }

  function nbMots(txt) {
    var t = String(txt || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function ilYA(iso) {
    if (!iso) return '—';
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '—';
    var s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return "à l'instant";
    if (s < 3600) { var m = Math.floor(s / 60); return 'il y a ' + m + ' min'; }
    if (s < 86400) { var h = Math.floor(s / 3600); return 'il y a ' + h + ' h'; }
    var j = Math.floor(s / 86400);
    if (j === 1) return 'hier';
    if (j < 7) return 'il y a ' + j + ' jours';
    return (typeof formatDate === 'function') ? formatDate(String(iso).slice(0, 10)) : String(iso).slice(0, 10);
  }

  function pluriel(n, sing, plur) { return n + ' ' + (n > 1 ? plur : sing); }

  function apercu(n) {
    if (typeof notePreview === 'function') return notePreview(n);
    var txt = String(n.body || '').replace(/\n+/g, ' ').trim();
    return txt ? txt.slice(0, 60) : 'Note vide';
  }

  // ── Sélection / tri ────────────────────────────────────────────────────
  function requete() {
    var el = document.getElementById('notesSearch');
    return (el && el.value ? el.value : '').trim().toLowerCase();
  }

  function filtrees() {
    var q = requete();
    var list = listeNotes().slice();
    if (q) {
      list = list.filter(function (n) {
        return ((n.title || '') + ' ' + (n.body || '')).toLowerCase().indexOf(q) !== -1;
      });
    }
    if (filtre === 'pin') list = list.filter(function (n) { return !!n.pinned; });
    if (filtre === 'week') list = list.filter(estCetteSemaine);
    list.sort(function (a, b) {
      var pa = a.pinned ? 1 : 0, pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
    return list;
  }

  // ── Compteurs ──────────────────────────────────────────────────────────
  function rendreKpis() {
    var all = listeNotes();
    var pin = all.filter(function (n) { return !!n.pinned; }).length;
    var week = all.filter(estCetteSemaine).length;
    var mots = all.reduce(function (s, n) { return s + nbMots(n.body); }, 0);

    var derniere = all.slice().sort(function (a, b) {
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    })[0];

    function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    set('ntKpiTotal', String(all.length));
    set('ntKpiTotalSub', derniere ? 'dernière modification ' + ilYA(derniere.updatedAt) : 'aucune note pour le moment');
    set('ntKpiPin', String(pin));
    set('ntKpiWeek', String(week));
    set('ntKpiWeekSub', week ? 'depuis lundi' : 'aucune modification depuis lundi');
    set('ntKpiWords', mots.toLocaleString('fr-FR'));
  }

  // ── Chips de filtre ────────────────────────────────────────────────────
  function rendreChips() {
    var host = document.getElementById('notesChips');
    if (!host) return;
    var all = listeNotes();
    var defs = [
      { k: 'all', l: 'Toutes', c: '#818cf8', n: all.length },
      { k: 'pin', l: 'Épinglées', c: '#fbbf24', n: all.filter(function (n) { return !!n.pinned; }).length },
      { k: 'week', l: 'Cette semaine', c: '#22d3ee', n: all.filter(estCetteSemaine).length }
    ];
    host.innerHTML = defs.map(function (d) {
      return '<button type="button" class="v2-chip-f' + (filtre === d.k ? ' on' : '') + '" data-f="' + d.k + '">'
        + '<span class="dot" style="background:' + d.c + '"></span>' + esc(d.l)
        + ' <span class="n">' + d.n + '</span></button>';
    }).join('');
  }

  // ── Liste ──────────────────────────────────────────────────────────────
  var ICO_NOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var ICO_STAR = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

  function ligne(n) {
    var actif = (typeof currentNoteId !== 'undefined') && String(n.id) === String(currentNoteId);
    var pin = !!n.pinned;
    var liseré = pin ? ' style="border-left:3px solid #f59e0b;padding-left:9px"' : '';
    return '<div class="nt-item' + (actif ? ' on' : '') + '" data-id="' + esc(String(n.id)) + '" role="button" tabindex="0"' + liseré + '>'
      + '<span class="nt-item-ico">' + ICO_NOTE + '</span>'
      + '<span class="nt-item-b">'
      + '<span class="nt-item-t">' + esc(n.title || 'Sans titre') + '</span>'
      + '<span class="nt-item-p">' + esc(apercu(n)) + '</span>'
      + '<span class="nt-item-d">' + esc(ilYA(n.updatedAt)) + '</span>'
      + '</span>'
      + '<button type="button" class="nt-item-pin' + (pin ? ' on' : '') + '" data-pin="' + esc(String(n.id)) + '"'
      + ' title="' + (pin ? 'Désépingler' : 'Épingler') + '" aria-label="' + (pin ? 'Désépingler la note' : 'Épingler la note') + '"'
      + ' style="fill:' + (pin ? 'currentColor' : 'none') + '">' + ICO_STAR + '</button>'
      + '</div>';
  }

  function rendreListe() {
    var el = document.getElementById('notesList');
    if (!el) return;
    var list = filtrees();
    var cnt = document.getElementById('notesCount');

    if (!list.length) {
      var msg;
      if (requete()) msg = 'Aucune note ne correspond à cette recherche.';
      else if (filtre === 'pin') msg = 'Aucune note épinglée.<br>Cliquez sur l’étoile d’une note pour l’épingler.';
      else if (filtre === 'week') msg = 'Aucune note modifiée depuis lundi.';
      else msg = 'Aucune note.<br>Cliquez sur « Nouvelle note » pour commencer.';
      el.innerHTML = '<div class="nt-list-empty">' + msg + '</div>';
      if (cnt) cnt.textContent = '0 note';
      return;
    }

    var html = '';
    if (filtre === 'all' && !requete()) {
      var epinglees = list.filter(function (n) { return !!n.pinned; });
      var autres = list.filter(function (n) { return !n.pinned; });
      if (epinglees.length) {
        html += '<div class="nt-sect dc-eyebrow">Épinglées</div>' + epinglees.map(ligne).join('');
        if (autres.length) html += '<div class="nt-sect dc-eyebrow">Toutes les notes</div>';
      }
      html += autres.map(ligne).join('');
    } else {
      html = list.map(ligne).join('');
    }
    el.innerHTML = html;
    if (cnt) cnt.textContent = pluriel(list.length, 'note affichée', 'notes affichées');
  }

  // ── Éditeur : bouton épingler + statistiques ───────────────────────────
  function syncEditor() {
    var n = noteCourante();
    var btn = document.getElementById('notePinBtn');
    if (btn) {
      var pin = !!(n && n.pinned);
      btn.classList.toggle('on', pin);
      btn.style.fill = pin ? 'currentColor' : 'none';
      btn.title = pin ? 'Désépingler cette note' : 'Épingler cette note';
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-pressed', pin ? 'true' : 'false');
    }
    var ta = document.getElementById('noteBody');
    var corps = ta ? ta.value : (n ? n.body : '');
    function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    set('noteStatMots', pluriel(nbMots(corps), 'mot', 'mots'));
    set('noteStatCar', pluriel(String(corps || '').length, 'caractère', 'caractères'));
    set('noteStatMaj', n && n.updatedAt ? 'modifiée ' + ilYA(n.updatedAt) : '—');
  }

  // ── Épinglage ──────────────────────────────────────────────────────────
  function togglePin(id) {
    var n = listeNotes().find(function (x) { return String(x.id) === String(id); });
    if (!n) return;
    n.pinned = !n.pinned;
    try { saveNotes(listeNotes()); } catch (e) { console.warn('[notes] enregistrement impossible', e); }
    render();
    syncEditor();
    if (typeof toast === 'function') toast(n.pinned ? 'Note épinglée' : 'Note désépinglée', 'info');
  }

  function togglePinCurrent() {
    if (typeof currentNoteId === 'undefined' || currentNoteId == null) return;
    togglePin(currentNoteId);
  }

  // ── Rendu global ───────────────────────────────────────────────────────
  function render() {
    rendreKpis();
    rendreChips();
    rendreListe();
  }

  // ── Interactions ───────────────────────────────────────────────────────
  function brancher() {
    var chips = document.getElementById('notesChips');
    if (chips) {
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('[data-f]');
        if (!b) return;
        filtre = b.getAttribute('data-f');
        render();
      });
    }
    var liste = document.getElementById('notesList');
    if (liste) {
      liste.addEventListener('click', function (e) {
        var p = e.target.closest('[data-pin]');
        if (p) { e.stopPropagation(); togglePin(p.getAttribute('data-pin')); return; }
        var it = e.target.closest('.nt-item');
        if (it && typeof selectNote === 'function') selectNote(it.getAttribute('data-id'));
      });
      liste.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var it = e.target.closest('.nt-item');
        if (!it) return;
        e.preventDefault();
        if (typeof selectNote === 'function') selectNote(it.getAttribute('data-id'));
      });
    }
  }

  window.NotesV2 = { render: render, syncEditor: syncEditor, togglePin: togglePin, togglePinCurrent: togglePinCurrent };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancher);
  else brancher();
})();
