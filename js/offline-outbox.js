// ══════════════════════════════════════════════════════════════════════════
// FILE D'ATTENTE HORS-LIGNE  (« outbox »)
// ──────────────────────────────────────────────────────────────────────────
// À charger JUSTE APRÈS js/supabase-client.js. Le client route toutes ses
// écritures (POST/PATCH/DELETE vers /rest/v1/) vers OfflineOutbox.write().
//
// Principe : quand le réseau manque, l'écriture n'est PAS perdue. Elle est
// rangée dans IndexedDB, l'application reçoit une réponse de succès synthétique
// (elle affiche donc la saisie normalement), et la file est rejouée toute
// seule au retour du réseau — dans l'ordre.
//
// Pourquoi c'est sûr :
//  · GARDE-FOU N°1 — quand on est EN LIGNE et que le réseau répond, on ne fait
//    RIEN de spécial : l'écriture part telle quelle. Le hors-ligne ne s'active
//    que si `navigator.onLine === false` ou si le fetch échoue réseau. Le
//    chemin en ligne est donc identique à avant, à l'octet près.
//  · IDEMPOTENCE — toutes les tables ont un `id uuid primary key`. On injecte
//    un UUID côté client dans chaque insert hors-ligne : rejouer deux fois la
//    même insertion provoque un conflit de clé (409) qu'on traite comme « déjà
//    synchronisé ». Aucun doublon possible.
//  · ORDRE — la file est FIFO : un enfant inséré après son parent (référence
//    par UUID choisi côté client) se resynchronise après lui.
//  · JETON FRAIS — on ne rejoue jamais l'ancien en-tête d'authentification (le
//    JWT aurait pu expirer) : au rejeu, on rattache le jeton courant.
//
// Limite assumée : à froid (page jamais ouverte en ligne), l'identifiant
// d'établissement et la session ne sont pas en mémoire — la saisie hors-ligne
// suppose que l'app a été ouverte en ligne au moins une fois dans la session.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var DB_NOM = 'internalis-offline';
  var STORE = 'outbox';
  var _db = null;
  var _count = 0;

  // ─── UUID ────────────────────────────────────────────────────────────────
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // Repli (navigateurs anciens) : v4 à partir de getRandomValues.
    var b = new Uint8Array(16);
    (crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.floor(Math.random() * 256); });
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = [];
    for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
    return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('')
      + '-' + h.slice(8, 10).join('') + '-' + h.slice(10, 16).join('');
  }

  // ─── IndexedDB ───────────────────────────────────────────────────────────
  function ouvrir() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NOM, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: 'qid' });
          os.createIndex('ts', 'ts', { unique: false });
        }
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(mode) { return ouvrir().then(function (db) { return db.transaction(STORE, mode).objectStore(STORE); }); }

  function ajouter(entree) {
    return tx('readwrite').then(function (os) {
      return new Promise(function (resolve, reject) {
        var r = os.add(entree);
        r.onsuccess = resolve; r.onerror = function () { reject(r.error); };
      });
    });
  }

  function supprimer(qid) {
    return tx('readwrite').then(function (os) {
      return new Promise(function (resolve) { var r = os.delete(qid); r.onsuccess = resolve; r.onerror = resolve; });
    });
  }

  function toutParOrdre() {
    return tx('readonly').then(function (os) {
      return new Promise(function (resolve, reject) {
        var out = [], cur = os.index('ts').openCursor();
        cur.onsuccess = function () { var c = cur.result; if (c) { out.push(c.value); c.continue(); } else resolve(out); };
        cur.onerror = function () { reject(cur.error); };
      });
    });
  }

  function compter() {
    return tx('readonly').then(function (os) {
      return new Promise(function (resolve) { var r = os.count(); r.onsuccess = function () { resolve(r.result); }; r.onerror = function () { resolve(0); }; });
    });
  }

  // ─── En-têtes : normalisation en dictionnaire minuscule ──────────────────
  function entetesEnDict(h) {
    var d = {};
    if (!h) return d;
    if (typeof h.forEach === 'function' && !Array.isArray(h)) { h.forEach(function (v, k) { d[String(k).toLowerCase()] = v; }); return d; }
    if (Array.isArray(h)) { h.forEach(function (p) { d[String(p[0]).toLowerCase()] = p[1]; }); return d; }
    Object.keys(h).forEach(function (k) { d[k.toLowerCase()] = h[k]; });
    return d;
  }

  // ─── Réponse synthétique qui imite PostgREST ─────────────────────────────
  // L'application ne doit pas voir la différence avec un vrai succès : on
  // respecte l'en-tête Accept (objet unique vs tableau via .single()) et
  // Prefer (return=representation vs minimal).
  function reponseSynthetique(methode, entetes, lignes) {
    var repr = /return=representation/i.test(entetes['prefer'] || '');
    var single = /pgrst\.object/i.test(entetes['accept'] || '');
    var statut = methode === 'POST' ? 201 : (methode === 'DELETE' && !repr ? 204 : 200);
    var corps = '';
    if (repr && statut !== 204) corps = JSON.stringify(single ? (lignes[0] || null) : lignes);
    return new Response(corps, {
      status: statut,
      headers: { 'Content-Type': 'application/json', 'X-Internalis-Offline': '1' }
    });
  }

  // ─── Écriture : le cœur ──────────────────────────────────────────────────
  function write(input, init, doFetch) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var methode = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var corps = init && init.body;

    // On ne prend en charge que les écritures REST à corps JSON. L'auth, le
    // stockage de fichiers et tout corps exotique passent par le fetch normal.
    var eligible = url.indexOf('/rest/v1/') !== -1 && typeof corps === 'string'
      && (methode === 'POST' || methode === 'PATCH' || methode === 'DELETE');
    var deleteSansCorps = url.indexOf('/rest/v1/') !== -1 && methode === 'DELETE' && corps == null;

    if (!eligible && !deleteSansCorps) return doFetch(input, init);

    // EN LIGNE : on tente le vrai réseau. Succès → rien de spécial (on vide la
    // file au passage si besoin). Échec RÉSEAU → on bascule en file d'attente.
    if (navigator.onLine !== false) {
      return doFetch(input, init).then(function (rep) {
        if (_count > 0) drain();          // le réseau répond : bon moment pour rejouer
        return rep;
      }, function (err) {
        // Panne réseau (TypeError) → on met en file. Toute autre erreur remonte.
        if (err && (err.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(err.message || err)))) {
          return mettreEnFile(url, methode, init, corps);
        }
        throw err;
      });
    }

    // HORS LIGNE : directement en file.
    return mettreEnFile(url, methode, init, corps);
  }

  function mettreEnFile(url, methode, init, corps) {
    var entetes = entetesEnDict(init && init.headers);
    // On NE stocke PAS l'authentification : le jeton sera rafraîchi au rejeu.
    var entetesPropres = {};
    Object.keys(entetes).forEach(function (k) {
      if (k !== 'authorization' && k !== 'apikey') entetesPropres[k] = entetes[k];
    });

    var lignes = [];
    if (methode === 'POST' && corps != null) {
      var parsed;
      try { parsed = JSON.parse(corps); } catch (e) { parsed = null; }
      var arr = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      // Injection de l'UUID client : c'est ce qui rend le rejeu idempotent.
      arr = arr.map(function (r) { if (r && typeof r === 'object' && !r.id) r.id = uuid(); return r; });
      corps = JSON.stringify(arr.length === 1 && !Array.isArray(parsed) ? arr[0] : arr);
      lignes = arr;
    } else if (methode === 'PATCH' && corps != null) {
      var patch;
      try { patch = JSON.parse(corps); } catch (e) { patch = {}; }
      // L'id de la ligne modifiée vit dans la query (?id=eq.<uuid>) : on le
      // récupère pour que la réponse synthétique porte une ligne complète.
      var m = /[?&]id=eq\.([^&]+)/.exec(url);
      if (m && patch && typeof patch === 'object' && !patch.id) patch.id = decodeURIComponent(m[1]);
      lignes = [patch];
    }

    var entree = {
      qid: uuid(), ts: Date.now(),
      url: url, method: methode, headers: entetesPropres, body: corps
    };

    return ajouter(entree)
      .then(function () { return rafraichirBadge(); })
      .then(function () {
        if (typeof toast === 'function') toast('Enregistré — en attente de synchronisation', 'info');
        var entetesRep = entetesEnDict(init && init.headers);
        return reponseSynthetique(methode, entetesRep, lignes);
      });
  }

  // ─── Rejeu de la file ────────────────────────────────────────────────────
  var _drainEnCours = false;
  function drain() {
    if (_drainEnCours || navigator.onLine === false) return Promise.resolve();
    _drainEnCours = true;
    return jetonFrais().then(function (auth) {
      return toutParOrdre().then(function (liste) {
        return liste.reduce(function (chaine, e) {
          return chaine.then(function (stop) {
            if (stop) return true;
            var h = Object.assign({}, e.headers, auth);
            return fetch(e.url, { method: e.method, headers: h, body: e.body })
              .then(function (rep) {
                // 2xx = OK. 409 = conflit de clé = déjà inséré lors d'un rejeu
                // précédent → on considère la ligne comme synchronisée.
                if ((rep.status >= 200 && rep.status < 300) || rep.status === 409) {
                  return supprimer(e.qid).then(function () { return false; });
                }
                // Erreur « métier » (RLS, validation) : on s'arrête pour ne pas
                // marteler, et on garde la ligne pour la signaler.
                console.warn('[outbox] rejeu refusé', rep.status, e.url);
                return true;
              }, function () { return true; });   // panne réseau : on réessaiera
          });
        }, Promise.resolve(false));
      });
    }).then(function () {
      return rafraichirBadge();
    }).then(function () {
      _drainEnCours = false;
      if (_count > 0 && navigator.onLine !== false) return; // reste des erreurs métier : on n'insiste pas
    }, function (e) {
      _drainEnCours = false; console.warn('[outbox] drain', e);
    });
  }

  function jetonFrais() {
    // Jeton utilisateur courant + clé anon. supabaseClient vient de
    // supabase-client.js (chargé avant ce fichier).
    var anon = (typeof SUPABASE_PUBLISHABLE_KEY !== 'undefined') ? SUPABASE_PUBLISHABLE_KEY : '';
    if (typeof supabaseClient === 'undefined' || !supabaseClient.auth) {
      return Promise.resolve({ apikey: anon });
    }
    return supabaseClient.auth.getSession().then(function (r) {
      var tok = r && r.data && r.data.session && r.data.session.access_token;
      var h = { apikey: anon };
      if (tok) h['authorization'] = 'Bearer ' + tok;
      return h;
    }, function () { return { apikey: anon }; });
  }

  // ─── Badge « N en attente » ──────────────────────────────────────────────
  function rafraichirBadge() {
    return compter().then(function (n) {
      _count = n;
      window.dispatchEvent(new CustomEvent('outbox:changed', { detail: { count: n } }));
      majBadge(n);
      return n;
    });
  }

  function injecterStyles() {
    if (document.getElementById('obxCss')) return;
    var s = document.createElement('style');
    s.id = 'obxCss';
    s.textContent = [
      '#obxBadge{position:fixed;left:18px;bottom:18px;z-index:900;display:none;align-items:center;gap:8px;',
      'height:38px;padding:0 14px;border-radius:11px;font:600 12.5px/1 system-ui,-apple-system,sans-serif;',
      'cursor:default;background:#7c3aed;color:#fff;border:1px solid rgba(255,255,255,.22);',
      'box-shadow:0 10px 26px -10px rgba(76,29,149,.8)}',
      '#obxBadge.show{display:inline-flex}',
      '#obxBadge.on{background:#0891b2}',           // en cours de synchro
      '#obxBadge .obx-dot{width:8px;height:8px;border-radius:50%;background:#fff;opacity:.9}',
      '#obxBadge.on .obx-dot{animation:obxPulse 1s ease-in-out infinite}',
      '@keyframes obxPulse{0%,100%{opacity:.3}50%{opacity:1}}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function majBadge(n) {
    injecterStyles();
    var b = document.getElementById('obxBadge');
    if (!b) {
      b = document.createElement('div');
      b.id = 'obxBadge';
      b.setAttribute('role', 'status');
      b.setAttribute('aria-live', 'polite');
      (document.body || document.documentElement).appendChild(b);
    }
    var horsLigne = navigator.onLine === false;
    b.classList.toggle('on', !horsLigne && n > 0);
    b.classList.toggle('show', n > 0);
    var mot = n > 1 ? 'saisies' : 'saisie';
    b.innerHTML = '<span class="obx-dot"></span>' + n + ' ' + mot + (horsLigne ? ' — hors ligne' : ' — synchronisation…');
    b.title = horsLigne
      ? n + ' ' + mot + ' en attente : elles partiront au retour du réseau.'
      : 'Synchronisation en cours de ' + n + ' ' + mot + '.';
  }

  // ─── Cycle de vie ────────────────────────────────────────────────────────
  window.addEventListener('online', function () { majBadge(_count); drain(); });
  window.addEventListener('offline', function () { majBadge(_count); });

  function init() {
    rafraichirBadge().then(function (n) { if (n > 0 && navigator.onLine !== false) drain(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // API publique
  window.OfflineOutbox = {
    write: write,
    drain: drain,
    count: function () { return _count; },
    _uuid: uuid
  };
})();
