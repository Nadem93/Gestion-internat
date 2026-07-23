/* ══════════════════════════════════════════════════════════════════════════
   INTERNALIS — Page de connexion, couche V2 (habillage uniquement)

   Ce module ne touche à AUCUNE logique d'authentification : il ne lit ni
   n'écrit de session, n'appelle pas Supabase, ne redirige pas et ne modifie
   aucune validation. Il n'ajoute que des aides visuelles :
     · bascule « afficher / masquer » le mot de passe ;
     · avertissement Verr. Maj. ;
     · jauge de robustesse (indicative — la validation reste celle du script
       de la page, inchangée) ;
     · recoloration des règles de mot de passe pour le thème sombre ;
     · année du pied de page.

   Chargé APRÈS le script de la page : les écouteurs `input` posés ici
   s'exécutent donc après ceux de la page, jamais à leur place.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  /* ── Afficher / masquer un mot de passe ─────────────────────────────── */
  function bindEye(btnId, inputId) {
    var btn = $(btnId), input = $(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      input.focus();
    });
  }
  bindEye('pwEye', 'pw');
  bindEye('newPwEye', 'newPw');

  /* ── Verrouillage majuscules ────────────────────────────────────────── */
  (function () {
    var input = $('pw'), note = $('pwCaps');
    if (!input || !note) return;
    var update = function (e) {
      var on = false;
      try { on = e.getModifierState && e.getModifierState('CapsLock'); } catch (err) { on = false; }
      note.classList.toggle('on', !!on);
    };
    input.addEventListener('keydown', update);
    input.addEventListener('keyup', update);
    input.addEventListener('blur', function () { note.classList.remove('on'); });
  })();

  /* ── Règles de mot de passe : couleurs adaptées au thème sombre ─────── */
  /* Le script de la page réécrit `li.style.color` à chaque frappe avec des
     teintes claires ; on repasse derrière lui sans toucher à sa logique. */
  var RULES = { len: 8 };
  function checks(pw) {
    return {
      len: pw.length >= RULES.len,
      upper: /[A-Z]/.test(pw),
      digit: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw)
    };
  }

  (function () {
    var input = $('newPw'), list = $('pwRules');
    var wrap = $('pwStrength'), fill = $('pwStrengthFill'), lbl = $('pwStrengthLbl');
    if (!input || !list) return;

    var PALIERS = [
      { l: 'Très faible', c: '#ef4444' },
      { l: 'Faible',      c: '#f59e0b' },
      { l: 'Moyen',       c: '#fbbf24' },
      { l: 'Bon',         c: '#22d3ee' },
      { l: 'Excellent',   c: '#10b981' }
    ];

    function paint() {
      var c = checks(input.value);
      var n = 0;
      Array.prototype.forEach.call(list.querySelectorAll('li'), function (li) {
        var ok = !!c[li.dataset.rule];
        if (ok) n++;
        li.style.color = ok ? '#5eead4' : '#7f93b3';
      });
      if (!wrap || !fill || !lbl) return;
      if (!input.value) { wrap.hidden = true; return; }
      wrap.hidden = false;
      var p = PALIERS[n] || PALIERS[0];
      fill.style.width = Math.max(8, (n / 4) * 100) + '%';
      fill.style.background = p.c;
      lbl.textContent = 'Robustesse : ' + p.l + ' — ' + n + '/4 règles respectées';
      lbl.style.color = p.c;
    }

    input.addEventListener('input', paint);
    paint();
  })();

  /* ── Année du pied de page ──────────────────────────────────────────── */
  (function () {
    var y = $('lcYear');
    if (y) y.textContent = String(new Date().getFullYear());
  })();
})();
