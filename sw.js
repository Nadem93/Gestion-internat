const CACHE = 'internalis-v81';
const ASSETS = [
  './',
  './accueil.html',
  './dashboard.html',
  './aide.html',
  './notes.html',
  './chambres.html',
  './echeances.html',
  './repas.html',
  './visites.html',
  './nuit.html',
  './activites.html',
  './eig.html',
  './cvs.html',
  './medicaments.html',
  './vie-quotidienne.html',
  './dossiers.html',
  './index.html',
  './css/style.css',
  './css/v2.css',
  './css/v2-clair.css',
  './css/v2-clair-pages.css',
  './css/v2-mobile.css',
  './js/mobile-shell.js',
  './js/app.js',
  './js/theme.js',
  './js/supabase-client.js',
  './js/offline-outbox.js',
  './js/audit-supabase.js',
  './js/search-global.js',
  './js/notif-bell.js',
  './js/mobile-nav.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // On ne gère que les fichiers du site (same-origin) ; Supabase, CDN, etc. passent direct au réseau.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  // Network-first, en CONTOURNANT le cache HTTP du navigateur (cache:'reload').
  // Sans ça, Netlify sert les CSS/JS avec un cache long : le navigateur
  // resservait d'anciens fichiers malgré le network-first, d'où des mises en
  // page cassées tant qu'on ne forçait pas un rechargement. On retombe sur le
  // cache hors-ligne uniquement en cas d'échec réseau.
  e.respondWith(
    fetch(e.request, { cache: 'reload' }).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
