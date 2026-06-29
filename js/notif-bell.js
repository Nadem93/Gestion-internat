// ── CLOCHE DE NOTIFICATIONS PARTAGÉE ──
// S'auto-initialise : injecte une cloche dans le .header-right de la page,
// charge les compteurs depuis Supabase, affiche un menu déroulant.
// Catégories : Messages, Journal, Avenants, Incidents, Interventions, Échéances (dépassées).
// Prérequis (à charger AVANT ce fichier) : supabase-client.js, residents-supabase.js,
// messages-supabase.js, journal-supabase.js, ppe-supabase.js, incidents-supabase.js,
// interventions-supabase.js, echeances-supabase.js, et app.js (Auth/toast).
(function () {
  const CSS = `
  .nb-bell{position:relative;width:42px;height:42px;border-radius:12px;border:1px solid rgba(15,23,42,.12);background:transparent;color:#334155;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
  .nb-bell:hover{background:rgba(255,255,255,.45);color:#0f172a}
  .nb-bell svg{width:21px;height:21px}
  .nb-count{position:absolute;top:-6px;right:-6px;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:#ef4444;color:#fff;font-size:.68rem;font-weight:700;display:flex;align-items:center;justify-content:center}
  .nb-count.hidden{display:none}
  .nb-panel{position:absolute;top:52px;right:0;width:330px;max-width:92vw;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 34px rgba(15,23,42,.16);overflow:hidden;z-index:200;display:none}
  .nb-panel.open{display:block}
  .nb-head{padding:.7rem .9rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}
  .nb-head strong{font-size:.9rem;color:#0f172a}
  .nb-head span{font-size:.75rem;color:#94a3b8}
  .nb-row{display:flex;align-items:center;gap:.7rem;padding:.7rem .9rem;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .12s}
  .nb-row:hover{background:#f8fafc}
  .nb-ic{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .nb-ic svg{width:18px;height:18px}
  .nb-row .l1{font-size:.84rem;font-weight:600;color:#0f172a}
  .nb-row .l2{font-size:.72rem;color:#64748b}
  .nb-empty{padding:1.6rem .9rem;text-align:center;color:#94a3b8;font-size:.82rem}
  .nb-foot{padding:.6rem;text-align:center;border-top:1px solid #f1f5f9}
  .nb-foot button{background:none;border:none;color:#4f46e5;font-size:.78rem;font-weight:600;cursor:pointer;padding:.3rem .6rem;border-radius:7px}
  .nb-foot button:hover{background:#eef2ff}`;

  const DEFS = [
    { key:'messages',      l1:'Messages',        l2:'non lus',    c:'#3b82f6', svg:'<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>', go:'messages.html' },
    { key:'journal',       l1:'Journal de bord', l2:'non lus',    c:'#059669', svg:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', go:'journal.html' },
    { key:'ppe',           l1:'Avenants',        l2:'nouveaux',   c:'#7c3aed', svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', go:'ppe.html' },
    { key:'incidents',     l1:'Incidents',       l2:'à traiter',  c:'#e11d48', svg:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', go:'incidents.html' },
    { key:'interventions', l1:'Interventions',   l2:'à traiter',  c:'#0d9488', svg:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>', go:'interventions.html' },
    { key:'echeances',     l1:'Échéances',       l2:'dépassée(s)',c:'#d97706', svg:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 13.5"/>', go:'echeances.html' },
  ];

  let _counts = { messages:0, journal:0, ppe:0, incidents:0, interventions:0, echeances:0 };

  function injectCss() {
    if (document.getElementById('nb-style')) return;
    const s = document.createElement('style'); s.id = 'nb-style'; s.textContent = CSS; document.head.appendChild(s);
  }

  function bellHtml() {
    return '<button class="nb-bell" id="nbBell" aria-label="Notifications" title="Notifications" onclick="window._nbToggle(event)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      '<span class="nb-count hidden" id="nbCount">0</span></button>' +
      '<div class="nb-panel" id="nbPanel"><div class="nb-head"><strong>Notifications</strong><span id="nbHeadCount"></span></div>' +
      '<div id="nbList"></div><div class="nb-foot" id="nbFoot" style="display:none"><button onclick="window._nbMarkAll()">Tout marquer comme lu</button></div></div>';
  }

  function render() {
    const total = DEFS.reduce((s, d) => s + (_counts[d.key] || 0), 0);
    const cEl = document.getElementById('nbCount'); if (cEl) { cEl.textContent = total > 99 ? '99+' : total; cEl.classList.toggle('hidden', total === 0); }
    const hEl = document.getElementById('nbHeadCount'); if (hEl) hEl.textContent = total > 0 ? (total + ' nouvelle' + (total > 1 ? 's' : '')) : '';
    const lEl = document.getElementById('nbList');
    if (lEl) {
      const active = DEFS.filter(d => (_counts[d.key] || 0) > 0);
      lEl.innerHTML = active.length ? active.map(d =>
        '<div class="nb-row" onclick="window._nbGo(\'' + d.key + '\')">' +
        '<span class="nb-ic" style="background:' + d.c + '1a;color:' + d.c + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d.svg + '</svg></span>' +
        '<div style="flex:1;min-width:0"><div class="l1">' + d.l1 + '</div><div class="l2">' + _counts[d.key] + ' ' + d.l2 + '</div></div>' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>'
      ).join('') : '<div class="nb-empty">Aucune notification</div>';
    }
    const fEl = document.getElementById('nbFoot'); if (fEl) fEl.style.display = total > 0 ? '' : 'none';
  }

  async function loadCounts() {
    const s = Auth.getSession(); if (!s) return;
    const uid = String(s.userId), me = [s.prenom, s.nom].filter(Boolean).join(' ');
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const [msgs, convs, journal, ppe, incidents, interventions, echeances] = await Promise.all([
        sbGetMessages(), sbGetConversations(), sbGetJournalEntries(), sbGetPpe(), sbGetIncidents(), sbGetInterventions(), sbGetEcheances()
      ]);
      const myConvIds = Object.values(convs).filter(c => (c.userIds || []).map(String).includes(uid)).map(c => c.id);
      _counts.messages = msgs.filter(m => myConvIds.includes(m.convId) && !(m.readBy || []).map(String).includes(uid) && String(m.from) !== uid).length;
      _counts.journal = journal.filter(e => Array.isArray(e.readBy) && !e.readBy.map(String).includes(uid)).length;
      const lastPpe = localStorage.getItem('ftr_last_visit_ppe_' + uid);
      _counts.ppe = ppe.filter(e => e.createdBy !== me && (!lastPpe || (e.createdAt && new Date(e.createdAt).getTime() > Number(lastPpe)))).length;
      const lastInc = localStorage.getItem('ftr_last_visit_incidents_' + uid);
      _counts.incidents = lastInc === null ? 0 : incidents.filter(e => e.statut !== 'classe' && new Date(e.createdAt).getTime() > Number(lastInc)).length;
      const lastInt = localStorage.getItem('ftr_last_visit_interventions_' + uid);
      _counts.interventions = lastInt === null ? 0 : interventions.filter(e => e.statut === 'ouverte' && new Date(e.date).getTime() > Number(lastInt)).length;
      _counts.echeances = echeances.filter(e => !e.done && e.date && e.date < todayStr).length;
    } catch (e) { console.error('[notif-bell] loadCounts', e); }
    render();
  }

  window._nbToggle = function (e) { if (e) e.stopPropagation(); document.getElementById('nbPanel')?.classList.toggle('open'); };
  window._nbClose = function () { document.getElementById('nbPanel')?.classList.remove('open'); };
  window._nbGo = function (key) {
    const d = DEFS.find(x => x.key === key); const s = Auth.getSession(); window._nbClose();
    if (key === 'incidents' && s) localStorage.setItem('ftr_last_visit_incidents_' + s.userId, Date.now());
    if (key === 'interventions' && s) localStorage.setItem('ftr_last_visit_interventions_' + s.userId, Date.now());
    if (d) location.href = d.go;
  };
  window._nbMarkAll = async function () {
    const s = Auth.getSession(); if (!s) return;
    const uid = String(s.userId), now = Date.now();
    ['incidents', 'interventions', 'ppe'].forEach(k => localStorage.setItem('ftr_last_visit_' + k + '_' + uid, now));
    try {
      const [msgs, convs] = await Promise.all([sbGetMessages(), sbGetConversations()]);
      const myConvIds = Object.values(convs).filter(c => (c.userIds || []).map(String).includes(uid)).map(c => c.id);
      const unread = msgs.filter(m => myConvIds.includes(m.convId) && !(m.readBy || []).map(String).includes(uid) && String(m.from) !== uid);
      await Promise.all(unread.map(m => sbUpdateMessageReadBy(m.id, [...(m.readBy || []), uid])));
    } catch (e) { console.error('[notif-bell] markAll messages', e); }
    try {
      const jrn = await sbGetJournalEntries();
      const uj = jrn.filter(en => Array.isArray(en.readBy) && !en.readBy.map(String).includes(uid));
      for (const en of uj) { en.readBy = [...(en.readBy || []), uid]; await sbSaveJournalEntry(en); }
    } catch (e) { console.error('[notif-bell] markAll journal', e); }
    window._nbClose(); await loadCounts();
    if (typeof toast === 'function') toast('Notifications marquées comme lues', 'success');
  };

  function init() {
    if (typeof Auth === 'undefined' || !Auth.getSession()) return;
    const host = document.querySelector('.header-right');
    if (!host || document.getElementById('nbBell')) return;
    injectCss();
    host.style.position = 'relative';
    host.insertAdjacentHTML('beforeend', bellHtml());
    document.addEventListener('click', e => {
      const p = document.getElementById('nbPanel'), b = document.getElementById('nbBell');
      if (p && p.classList.contains('open') && !p.contains(e.target) && b && !b.contains(e.target)) p.classList.remove('open');
    });
    loadCounts();
    setInterval(loadCounts, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
