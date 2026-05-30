// ── SPA ROUTER ──
const ROUTES = {
  'accueil':     { view:'accueil',     title:'Accueil',          sub:'', js:'' },
  'resident':    { view:'resident',    title:'Fiche résident',   sub:'', js:'js/residents.js' },
  'dashboard':   { view:'dashboard',   title:'Tableau de bord',  sub:'', js:'' },
  'journal':     { view:'journal',     title:'Journal',          sub:'', js:'js/journal.js' },
  'planning':    { view:'planning',    title:'Planning',         sub:'', js:'js/planning.js' },
  'presences':   { view:'presences',   title:'Présences',        sub:'', js:'js/presences.js' },
  'ppe':         { view:'ppe',         title:'PPE',              sub:'', js:'js/ppe.js' },
  'incidents':   { view:'incidents',   title:'Incidents',        sub:'', js:'js/incidents.js' },
  'messages':    { view:'messages',    title:'Messages',         sub:'', js:'js/messages.js' },
  'documents':   { view:'documents',   title:'Documents',        sub:'', js:'js/documents.js' },
  'repertoire':  { view:'repertoire',  title:'Répertoire',       sub:'', js:'js/repertoire.js' },
  'vehicules':   { view:'vehicules',   title:'Véhicules',        sub:'', js:'js/vehicules.js' },
  'employe':     { view:'employe',     title:'Fiche employé',    sub:'', js:'' },
  'admin':       { view:'admin',       title:'Administration',   sub:'', js:'js/admin.js' }
};

const FILE_TO_ROUTE = {};
Object.entries(ROUTES).forEach(([key, r]) => { FILE_TO_ROUTE[r.view + '.html'] = key; });

const PAGE_INITS = {};

function registerPageInit(name, fn) {
  PAGE_INITS[name] = fn;
}

let currentRoute = null;

function loadScript(src) {
  if (Array.isArray(src)) {
    return Promise.all(src.map(s => loadScriptSingle(s)));
  }
  return loadScriptSingle(src);
}
function loadScriptSingle(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve();
    const old = document.querySelector(`script[data-route-src="${src}"]`);
    if (old) old.remove();
    const script = document.createElement('script');
    script.setAttribute('data-route-src', src);
    script.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(script);
  });
}

function navigateTo(path, pushState = true) {
  const cleanPath = path.replace(/^\//, '').split('?')[0].split('#')[0];
  const routeKey = FILE_TO_ROUTE[cleanPath] || cleanPath.replace('.html','');
  const route = ROUTES[routeKey];
  if (!route) { console.warn('Route not found:', path); return; }
  if (pushState) history.pushState({ route: routeKey }, '', path);
  loadView(routeKey, route, path);
}

async function loadView(routeKey, route, path) {
  const viewEl = document.getElementById('app-view');
  const modalsEl = document.getElementById('app-modals');
  const titleEl = document.getElementById('pageTitle');
  if (!viewEl) return;

  viewEl.classList.add('loading');

  try {
    const res = await fetch('views/' + route.view + '.html');
    if (!res.ok) throw new Error('View not found');
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract modals
    const modals = doc.querySelectorAll('.modal-overlay');
    if (modalsEl) {
      modalsEl.innerHTML = '';
      modals.forEach(m => modalsEl.appendChild(document.importNode(m, true)));
    }

    // Extract toast
    const toast = doc.querySelector('.toast-container');
    const existingToast = document.querySelector('.toast-container');
    if (toast && existingToast) existingToast.innerHTML = toast.innerHTML;

    // Extract header-right buttons
    const headerRight = doc.querySelector('.header-right');
    const existingHR = document.querySelector('.header-right');
    if (headerRight && existingHR) {
      existingHR.innerHTML = headerRight.innerHTML;
    } else if (existingHR) {
      existingHR.innerHTML = '';
    }

    // Update title
    if (titleEl) titleEl.textContent = route.title;

    // Extract content and separate scripts from HTML
    const contentEl = doc.querySelector('main') || doc.body;
    const frag = document.createDocumentFragment();
    while (contentEl.firstChild) {
      frag.appendChild(contentEl.firstChild);
    }
    viewEl.innerHTML = '';
    viewEl.appendChild(frag);

    currentRoute = routeKey;

    // Execute all inline scripts from the view (including those outside <main>)
    const allScripts = doc.querySelectorAll('script');
    allScripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      if (oldScript.src) {
        // External script — load via loadScript (async)
        loadScript(oldScript.src);
      } else {
        // Inline script — execute synchronously via eval-like approach
        try {
          new Function(oldScript.textContent)();
        } catch (e) {
          console.error('Inline script error:', e);
        }
      }
    });

    // Load page-specific JS file
    await loadScript(route.js);

    // Call page init
    if (typeof PAGE_INITS[routeKey] === 'function') {
      PAGE_INITS[routeKey]();
    }

  } catch (err) {
    console.error('Router error:', err);
    viewEl.innerHTML = '<div class="empty" style="padding:4rem"><h3>Erreur</h3><p>Impossible de charger la page.</p></div>';
  } finally {
    viewEl.classList.remove('loading');
  }
}

// Intercept internal navigation
document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href) return;
  if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  const cleanHref = href.split('?')[0].split('#')[0];
  if (FILE_TO_ROUTE[cleanHref] || ROUTES[cleanHref.replace('.html','')]) {
    e.preventDefault();
    navigateTo(href);
  }
});

// Handle back/forward
window.addEventListener('popstate', e => {
  const routeKey = e.state?.route;
  if (routeKey && ROUTES[routeKey]) {
    loadView(routeKey, ROUTES[routeKey], routeKey + '.html');
  } else {
    const path = location.pathname.split('/').pop() || 'accueil.html';
    navigateTo(path, false);
  }
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  let path = location.pathname.split('/').pop() || '';
  if (!path || path === 'app.html') path = 'accueil.html';
  navigateTo(path, false);
});
