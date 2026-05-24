// ── STORAGE HELPERS ──
const DB = {
  get: k => JSON.parse(localStorage.getItem(k) || 'null'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: k => localStorage.removeItem(k),
  keys: {
    residents:'ftr_residents', categories:'ftr_categories', objectives:'ftr_objectives',
    journal:'ftr_journal', presences:'ftr_presences', planning:'ftr_planning',
    settings:'ftr_settings', user:'ftr_user', branding:'ftr_branding',
    users:'ftr_users', session:'ftr_session', vehicules:'ftr_vehicules',
    documents:'ftr_documents', onboarded:'ftr_onboarded', messages:'ftr_messages',
    repertoire:'ftr_repertoire', incidents:'ftr_incidents', ppe:'ftr_ppe',
    loginHistory:'ftr_login_history', fonctionColors:'ftr_fonction_colors',
    aiKey:'ftr_ai_key', aiPrompts:'ftr_ai_prompts'
  }
};

const API_URL = 'http://localhost:3001';

// ── DEFAULT DATA ──
const DEFAULTS = {
  categories: [
    { id:1, name:'Accompagnement', color:'#3b82f6' },
    { id:2, name:'Médical', color:'#ef4444' },
    { id:3, name:'Éducatif', color:'#10b981' },
    { id:4, name:'Administratif', color:'#f59e0b' },
    { id:5, name:'Familial', color:'#8b5cf6' },
    { id:6, name:'Loisirs', color:'#06b6d4' }
  ],
  objectives: [
    { id:1, name:'Autonomie', description:"Développement de l'autonomie au quotidien" },
    { id:2, name:'Insertion sociale', description:'Intégration dans la vie sociale et collective' },
    { id:3, name:'Santé', description:'Suivi et maintien de la santé physique et psychique' },
    { id:4, name:'Scolarité / Formation', description:'Accompagnement scolaire et professionnel' },
    { id:5, name:'Lien familial', description:'Maintien et soutien du lien familial' },
    { id:6, name:'Logement', description:'Préparation à un logement autonome' }
  ],
  settings: { etablissement:'Foyer d\'Hébergement Les Trois Rivières', ville:'', tel:'', email:'', capacite:'', typeStructure:'mixte' },
  branding: { primaryColor:'#0f2b4a', accentColor:'#e85d04', logo:'' },
  users: [{ id:1, prenom:'Admin', nom:'', username:'admin', password:'admin123', role:'admin' }],
  vehicules: ['Renault Kangoo', 'Citroën Berlingo', 'Peugeot Partner', 'Volkswagen Caddy'],
  fonctionColors: [
    { id: 1, fonction: 'Éducateur', color: '#3b82f6', permissions: [] },
    { id: 2, fonction: 'Psychologue', color: '#8b5cf6', permissions: [] },
    { id: 3, fonction: 'Infirmier', color: '#ef4444', permissions: [] },
    { id: 4, fonction: 'Social', color: '#10b981', permissions: [] },
    { id: 5, fonction: 'Chef de service', color: '#f59e0b', permissions: ['edit_residents', 'view_all_incidents', 'validate_incidents'] },
    { id: 6, fonction: 'Veilleur de nuit', color: '#6366f1', permissions: [] },
    { id: 7, fonction: 'Sportif', color: '#06b6d4', permissions: [] },
    { id: 8, fonction: 'Secrétaire', color: '#ec4899', permissions: [] },
    { id: 9, fonction: 'Admin', color: '#dc2626', permissions: ['edit_residents', 'view_all_incidents', 'validate_incidents', 'access_admin', 'manage_users'] }
  ],
  aiPrompts: {
    ppe: {
      redaction: { system: 'Tu es un rédacteur de bilans socio-éducatifs pour ESMS. Rédige en français un texte professionnel et institutionnel.' },
      correction: { system: 'Tu es un correcteur professionnel. Corrige les fautes d\'orthographe, de grammaire et de syntaxe sans changer le style.' },
      reformulation: { system: 'Tu es un rédacteur institutionnel. Reformule ce texte en langage professionnel et institutionnel.' }
    },
    journal: {
      redaction: { system: 'Tu es un éducateur spécialisé rédigeant une observation pour le journal de bord d\'un établissement médico-social. Écris en français, de manière professionnelle et factuelle.' },
      correction: { system: 'Tu es un correcteur professionnel. Corrige les fautes d\'orthographe, de grammaire et de syntaxe sans changer le style.' },
      reformulation: { system: 'Tu es un rédacteur institutionnel. Reformule ce texte de manière professionnelle.' }
    },
    messages: {
      redaction: { system: 'Tu es un professionnel en ESMS qui rédige un message interne court et professionnel. Réponds en français.' },
      correction: { system: 'Tu es un correcteur professionnel. Corrige les fautes sans changer le style.' },
      reformulation: { system: 'Tu es un rédacteur institutionnel. Reformule ce message de manière professionnelle.' }
    }
  }
};

function initDefaults() {
  if (!DB.get(DB.keys.categories)) DB.set(DB.keys.categories, DEFAULTS.categories);
  if (!DB.get(DB.keys.objectives)) DB.set(DB.keys.objectives, DEFAULTS.objectives);
  if (!DB.get(DB.keys.residents)) DB.set(DB.keys.residents, []);
  if (!DB.get(DB.keys.journal)) DB.set(DB.keys.journal, []);
  if (!DB.get(DB.keys.presences)) DB.set(DB.keys.presences, {});
  if (!DB.get(DB.keys.planning)) DB.set(DB.keys.planning, []);
  if (!DB.get(DB.keys.settings)) DB.set(DB.keys.settings, DEFAULTS.settings);
  if (!DB.get(DB.keys.user)) DB.set(DB.keys.user, { nom:'Administrateur', prenom:'', role:'Administrateur' });
  if (!DB.get(DB.keys.branding)) DB.set(DB.keys.branding, DEFAULTS.branding);
  if (!DB.get(DB.keys.users)) DB.set(DB.keys.users, DEFAULTS.users);
  if (!DB.get(DB.keys.vehicules)) DB.set(DB.keys.vehicules, DEFAULTS.vehicules);
  if (!DB.get(DB.keys.documents)) DB.set(DB.keys.documents, {});
  if (!DB.get(DB.keys.incidents)) DB.set(DB.keys.incidents, []);
  if (!DB.get(DB.keys.ppe)) DB.set(DB.keys.ppe, []);
  if (!DB.get(DB.keys.fonctionColors)) DB.set(DB.keys.fonctionColors, DEFAULTS.fonctionColors);
  if (!DB.get(DB.keys.aiPrompts)) DB.set(DB.keys.aiPrompts, DEFAULTS.aiPrompts);
  setAiKey('rY3EsdZ5eAuxJWlqpAP5G8AyFVB5X9SB');
}

// ── LOGIN HISTORY ──
function logConnexion(action, user) {
  const log = DB.get(DB.keys.loginHistory) || [];
  log.unshift({
    id: genId(),
    action: action,
    username: user.username || '?',
    prenom: user.prenom || '',
    nom: user.nom || '',
    role: user.role || '',
    date: new Date().toISOString()
  });
  if (log.length > 500) log.length = 500;
  DB.set(DB.keys.loginHistory, log);
}

// ── AUTH ──
const Auth = {
  getSession() { return DB.get(DB.keys.session); },
  login(username, password) {
    const users = DB.get(DB.keys.users) || DEFAULTS.users;
    const user = users.find(u => u.username === username.trim() && u.password === password);
    if (!user) return false;
    DB.set(DB.keys.session, { userId: user.id, username: user.username, role: user.role, prenom: user.prenom || '', nom: user.nom || '' });
    logConnexion('login', user);
    return true;
  },
  logout() {
    const s = DB.get(DB.keys.session);
    if (s) logConnexion('logout', s);
    DB.remove(DB.keys.session);
    window.location.href = 'index.html';
  },
  requireAuth() {
    const s = this.getSession();
    if (!s) { window.location.href = 'index.html'; return null; }
    return s;
  },
  requireAdmin() {
    const s = this.requireAuth();
    if (!s) return null;
    if (s.role !== 'admin' && !canAccessAdmin(s.userId)) { window.location.href = 'dashboard.html'; return null; }
    return s;
  },
  isAdmin() {
    const s = this.getSession();
    if (!s) return false;
    return s.role === 'admin' || canAccessAdmin(s.userId);
  }
};

// ── STRUCTURE TYPE ──
function getStructureType() {
  return (DB.get(DB.keys.settings) || {}).typeStructure || 'mixte';
}
function isAdult() { const t = getStructureType(); return t === 'adultes' || t === 'mixte'; }
function isChild() { const t = getStructureType(); return t === 'enfants' || t === 'mixte'; }

// ── PHOTO HELPERS ──
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function residentPhoto(r, size = 48) {
  if (r && r.photo) {
    return `<img src="${escHtml(r.photo)}" alt="${escHtml(r.prenom||'')} ${escHtml(r.nom||'')}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid var(--border)"/>`;
  }
  const bg = r?.color || 'var(--blue)';
  const fs = size < 36 ? '.65rem' : size < 48 ? '.75rem' : size < 64 ? '1rem' : '1.4rem';
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fs};color:#fff;flex-shrink:0">${initials(r?.prenom||'', r?.nom||'')}</div>`;
}

// ── APPLY BRANDING ──
function applyBranding() {
  const b = DB.get(DB.keys.branding) || DEFAULTS.branding;
  const root = document.documentElement;
  if (b.primaryColor) {
    root.style.setProperty('--primary', b.primaryColor);
    root.style.setProperty('--primary-h', adjustColor(b.primaryColor, 15));
  }
  if (b.accentColor) {
    root.style.setProperty('--accent', b.accentColor);
    root.style.setProperty('--accent-h', adjustColor(b.accentColor, 15));
  }
  if (b.logo) {
    document.querySelectorAll('.sidebar-logo-img').forEach(el => {
      el.src = b.logo; el.style.display = '';
    });
    document.querySelectorAll('.logo-icon').forEach(el => el.style.display = 'none');
  }
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (num>>16) + amount);
  const g = Math.min(255, ((num>>8)&0xff) + amount);
  const b = Math.min(255, (num&0xff) + amount);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

// ── ID GENERATOR ──
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

// ── TOAST ──
function toast(msg, type='success') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id='toast-container'; c.className='toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  const icons = { success:'✓', error:'✕', info:'ℹ' };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'•'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(20px)'; t.style.transition='.2s ease'; setTimeout(()=>t.remove(), 200); }, 3000);
}

// ── MODAL ──
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow='hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow=''; }
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => { m.classList.remove('open'); });
  document.body.style.overflow='';
}

// ── SIDEBAR ACTIVE ──
function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === path);
  });
}

// ── AVATAR INITIALS ──
function initials(prenom='', nom='') {
  return ((prenom[0]||'') + (nom[0]||'')).toUpperCase() || '?';
}

function shortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length-1][0] + '.';
}

// ── DATE HELPERS ──
function today() { return new Date().toISOString().slice(0,10); }
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function age(dob) {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000) + ' ans';
}

// ── CATEGORY BADGE ──
function categoryBadge(catId) {
  const cats = DB.get(DB.keys.categories) || [];
  const cat = cats.find(c => c.id == catId);
  if (!cat) return '<span class="badge badge-gray">—</span>';
  return `<span class="badge" style="background:${cat.color}22;color:${cat.color};border:1px solid ${cat.color}44">${escHtml(cat.name)}</span>`;
}

// ── CONFIRM DIALOG ──
function confirmDialog(msg, cb) {
  if (confirm(msg)) cb();
}

// ── MOBILE SIDEBAR TOGGLE ──
function initSidebar() {
  const btn = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  if (btn && sidebar) {
    btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !btn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// ── CLOSE MODAL ON OVERLAY CLICK ──
function initModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeAllModals(); });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });
}

// ── RENDER USER INFO IN SIDEBAR ──
function renderUserInfo() {
  const session = Auth.getSession();
  const settings = DB.get(DB.keys.settings) || {};
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avEl = document.getElementById('sidebarAvatar');
  const etabEl = document.getElementById('sidebarEtab');
  const name = session ? [session.prenom, session.nom].filter(Boolean).join(' ') || session.username : 'Utilisateur';
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = session?.role === 'admin' ? 'Administrateur' : 'Éducateur';
  if (avEl) avEl.textContent = session ? (initials(session.prenom || '', session.nom || '') || session.username?.[0]?.toUpperCase() || '?') : '?';
  if (etabEl) etabEl.textContent = settings.etablissement || 'Mon Établissement';
}

// ── STATS FOR DASHBOARD ──
function getStats() {
  const residents = DB.get(DB.keys.residents) || [];
  const journal = DB.get(DB.keys.journal) || [];
  const planning = DB.get(DB.keys.planning) || [];
  const todayStr = today();
  const presences = DB.get(DB.keys.presences) || {};
  const todayPresences = presences[todayStr] || {};
  const presentCount = Object.values(todayPresences).filter(v => v === 'present').length;
  const vehiculeResa = planning.filter(e => e.type === 'vehicule' && e.date >= todayStr).length;
  return {
    totalResidents: residents.filter(r => r.statut !== 'sorti').length,
    totalEntries: journal.length,
    todayEntries: journal.filter(e => e.date && e.date.startsWith(todayStr)).length,
    presentsToday: presentCount,
    totalEvents: planning.filter(e => e.type !== 'vehicule').length,
    vehiculeResa
  };
}

function escHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

const STATUT_PPE_LABEL = { brouillon:'Brouillon', actif:'Actif', termine:'Terminé' };

const DEMO_AUTHORS = [
  'Sarah Martin', 'Lucas Dubois', 'Emma Bernard', 'Hugo Leroy',
  'Chloé Moreau', 'Nathan Petit', 'Léa Robert', 'Mathis Richard',
  'Manon Simon', 'Enzo Durand', 'Camille Lambert', 'Raphaël Girard'
];

function getAuthorColor(e) {
  if (e.authorId) {
    const users = DB.get(DB.keys.users) || [];
    const u = users.find(x => x.id === e.authorId);
    if (u && u.fonction) {
      const f = u.fonction.toLowerCase();
      const list = DB.get(DB.keys.fonctionColors) || DEFAULTS.fonctionColors;
      for (const item of list) {
        if (f.includes(item.fonction.toLowerCase())) return item.color;
      }
    }
  }
  return 'var(--accent)';
}

function getJournalAuthor(e) {
  if (e.author) return e.author;
  if (e.authorId) {
    const users = DB.get(DB.keys.users) || [];
    const u = users.find(x => x.id === e.authorId);
    if (u) return [u.prenom, u.nom].filter(Boolean).join(' ') || u.username;
  }
  const idx = (e.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % DEMO_AUTHORS.length;
  return DEMO_AUTHORS[idx];
}

const PERMISSION_LABELS = {
  edit_residents: 'Modifier les résidents',
  view_all_incidents: 'Voir tous les incidents',
  validate_incidents: 'Valider les incidents',
  access_admin: 'Accéder à l\'administration',
  manage_users: 'Gérer les utilisateurs'
};

function hasPermission(userId, perm) {
  const users = DB.get(DB.keys.users) || [];
  const u = users.find(x => x.id === userId);
  if (!u || !u.fonction) return false;
  const f = u.fonction.toLowerCase();
  const list = DB.get(DB.keys.fonctionColors) || DEFAULTS.fonctionColors;
  for (const item of list) {
    if (f.includes(item.fonction.toLowerCase())) {
      return (item.permissions || []).includes(perm);
    }
  }
  return false;
}

function canEditResidents(userId) {
  return hasPermission(userId, 'edit_residents');
}

function canViewAllIncidents(userId) {
  if (hasPermission(userId, 'view_all_incidents')) return true;
  const users = DB.get(DB.keys.users) || [];
  const u = users.find(x => x.id === userId);
  return u && (u.role === 'admin' || u.role === 'moderator');
}

function canValidateIncidents(userId) {
  if (hasPermission(userId, 'validate_incidents')) return true;
  const users = DB.get(DB.keys.users) || [];
  const u = users.find(x => x.id === userId);
  return u && (u.role === 'admin' || u.role === 'moderator');
}

function canAccessAdmin(userId) {
  return hasPermission(userId, 'access_admin');
}

function canManageUsers(userId) {
  return hasPermission(userId, 'manage_users');
}

// ── AI ──
function getAiKey() { return DB.get(DB.keys.aiKey) || ''; }
function setAiKey(key) { DB.set(DB.keys.aiKey, key); }

function getAiPrompt(module, action) {
  const prompts = DB.get(DB.keys.aiPrompts) || {};
  return prompts[module]?.[action]?.system || DEFAULTS.aiPrompts[module]?.[action]?.system || '';
}

function setAiPrompt(module, action, system) {
  const prompts = DB.get(DB.keys.aiPrompts) || {};
  if (!prompts[module]) prompts[module] = {};
  if (!prompts[module][action]) prompts[module][action] = {};
  prompts[module][action].system = system;
  DB.set(DB.keys.aiPrompts, prompts);
}

async function callMistral(prompt, system) {
  const key = getAiKey();
  if (!key) return null;
  system = system || 'Tu es un rédacteur de bilans socio-éducatifs en ESMS. Réponds en français, de manière professionnelle et institutionnelle.';

  // Essai 1 : appel direct à l'API Mistral (fonctionne si CORS accepté)
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch (_) { /* direct call failed, try proxy */ }

  // Essai 2 : proxy local (backend requis sur http://localhost:3001)
  try {
    const base = API_URL || 'http://localhost:3001';
    const res = await fetch(base + '/api/ai/mistral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system, apiKey: key })
    });
    if (res.ok) {
      const data = await res.json();
      return data.result || null;
    }
  } catch (_) { /* proxy failed */ }

  return null;
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initDefaults();
  applyBranding();
  setActiveNav();
  initSidebar();
  initModals();
  renderUserInfo();
  if (!Auth.isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
});
