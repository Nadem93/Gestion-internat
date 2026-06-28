const CACHE = 'internalis-v36';
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
  './js/app.js',
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
  // Network-first : on prend toujours la dernière version en ligne, et on retombe sur le cache hors-ligne.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
