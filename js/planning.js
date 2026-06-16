let currentView = 'week';
let currentDate = new Date();

const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const TYPE_COLORS = { activite:'#3b82f6', rdv:'#ef4444', sortie:'#10b981', reunion:'#8b5cf6', avenant:'#f59e0b', projet:'#06b6d4', evaluation:'#9333ea', autre:'#f59e0b', vehicule:'#6366f1' };
const TYPE_LABELS = { activite:'Activité', rdv:'Rendez-vous', sortie:'Sortie', reunion:'Réunion', avenant:'Avenant', projet:'Projet personnalisé', evaluation:'Évaluation', autre:'Autre', vehicule:'Véhicule' };

function eventOnDay(event, dayStr) {
  if (!event.date) return false;
  if (event.date === dayStr) return true;
  if (event.dateEnd && event.dateEnd >= dayStr && event.date < dayStr) return true;
  return false;
}

function getMondayOf(d) {
  const date = new Date(d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function dateStr(d) { return d.toISOString().slice(0,10); }

function getFilteredEvents() {
  const res = document.getElementById('filterEventResident')?.value || '';
  let events = DB.get(DB.keys.planning) || [];
  // Les réservations de véhicule (gérées dans le module Véhicules) ne s'affichent pas dans l'agenda
  events = events.filter(e => e.type !== 'vehicule');
  if (res) events = events.filter(e => e.residentId === res || !e.residentId);
  return events;
}

const PL_DAY_START = 7;   // 7h
const PL_DAY_END = 21;    // 21h
const PL_HOUR_H = 52;     // px par heure
const PL_EV_MAX_H = 104;  // hauteur max d'un bloc (~2h) pour éviter qu'un événement long n'occupe toute la colonne

function evStartMin(ev) {
  const t = (ev.heure || ev.time || '09:00');
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function evDurMin(ev) {
  if (ev.duree === 'journee') return (PL_DAY_END - PL_DAY_START) * 60;
  const d = parseInt(ev.duree);
  return isNaN(d) ? 60 : d;
}

// Répartit les événements d'une journée en colonnes pour gérer les chevauchements
function layoutDayEvents(evs) {
  const items = evs.map(ev => {
    const start = evStartMin(ev);
    return { ev, start, end: start + evDurMin(ev) };
  }).sort((a, b) => a.start - b.start || a.end - b.end);
  // Regroupe en grappes d'événements qui se chevauchent
  let clusters = [], cur = [], curEnd = -1;
  items.forEach(it => {
    if (cur.length && it.start >= curEnd) { clusters.push(cur); cur = []; curEnd = -1; }
    cur.push(it); curEnd = Math.max(curEnd, it.end);
  });
  if (cur.length) clusters.push(cur);
  clusters.forEach(cluster => {
    const colEnds = [];
    cluster.forEach(it => {
      let placed = false;
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i] <= it.start) { it.col = i; colEnds[i] = it.end; placed = true; break; }
      }
      if (!placed) { it.col = colEnds.length; colEnds.push(it.end); }
    });
    cluster.forEach(it => it.ncols = colEnds.length);
  });
  return items;
}

function renderWeek() {
  const monday = getMondayOf(currentDate);
  const days = Array.from({length:7}, (_,i) => { const d=new Date(monday); d.setDate(d.getDate()+i); return d; });
  const todayD = new Date();
  document.getElementById('calTitle').textContent = `${monday.getDate()} ${MONTHS[monday.getMonth()]} — ${days[6].getDate()} ${MONTHS[days[6].getMonth()]} ${days[6].getFullYear()}`;
  const events = getFilteredEvents();
  const nHours = PL_DAY_END - PL_DAY_START;
  const bodyH = nHours * PL_HOUR_H;
  const gridBg = `repeating-linear-gradient(to bottom, var(--g100) 0 1px, transparent 1px ${PL_HOUR_H}px)`;

  // En-tête : année + jours
  const head = `<div class="pl-week-head">
    <div class="plh-year">${monday.getFullYear()}</div>
    ${days.map(d => {
      const isTod = sameDay(d, todayD);
      return `<div class="plh-day${isTod?' is-today':''}">
        <div class="plh-dow">${DAYS[d.getDay()===0?6:d.getDay()-1].slice(0,3)}</div>
        <div class="plh-num">${d.getDate()}</div>
      </div>`;
    }).join('')}
  </div>`;

  // Colonne des heures
  const timeCol = `<div class="pl-time-col" style="height:${bodyH}px">
    ${Array.from({length:nHours+1}, (_,i) => {
      const h = PL_DAY_START + i;
      return `<div class="plt-label" style="top:${i*PL_HOUR_H}px">${h} h</div>`;
    }).join('')}
  </div>`;

  // Colonnes des jours avec événements positionnés
  const dayCols = days.map(d => {
    const dStr = dateStr(d);
    const dayEvents = events.filter(e => eventOnDay(e, dStr) && (e.heure || e.time));
    const laid = layoutDayEvents(dayEvents);
    const blocks = laid.map(it => {
      const ev = it.ev;
      const top = Math.max(0, (it.start - PL_DAY_START*60) / 60 * PL_HOUR_H);
      const fullH = Math.max(20, (it.end - it.start) / 60 * PL_HOUR_H - 2);
      const contentH = Math.min(fullH, PL_EV_MAX_H);
      const wPct = 100 / it.ncols;
      const leftPct = it.col * wPct;
      const bg = escHtml(ev.color) || TYPE_COLORS[ev.type] || '#3b82f6';
      const veh = ev.vehicule ? '🚗 ' : '';
      return `<div class="pl-ev-wrap" style="top:${top}px;height:${fullH}px;left:calc(${leftPct}% + 2px);width:calc(${wPct}% - 4px)" onclick="event.stopPropagation();editEvent('${ev.id}')" title="${ev.residentName?escHtml(ev.residentName)+' — ':''}${escHtml(ev.titre)}${ev.vehicule?' — 🚗 '+escHtml(ev.vehicule):''}">
        <div class="pl-ev-band" style="background:${bg}"></div>
        <div class="pl-ev" style="height:${contentH}px;background:${bg}">
          <div class="pl-ev-time">${veh}${(ev.heure||ev.time||'').slice(0,5)}</div>
          <div class="pl-ev-title">${ev.residentName?escHtml(ev.residentName)+' — ':''}${escHtml(ev.titre)}</div>
        </div>
      </div>`;
    }).join('');
    return `<div class="pl-day" style="height:${bodyH}px;background:${gridBg}" onclick="quickAddFromClick(event,'${dStr}')">${blocks}</div>`;
  }).join('');

  const html = `<div class="pl-week">
    ${head}
    <div class="pl-week-body">
      ${timeCol}
      <div class="pl-days">${dayCols}</div>
    </div>
  </div>`;
  document.getElementById('calContainer').innerHTML = html;
}

// Clic sur une zone vide d'une journée → pré-remplit l'heure d'après la position verticale
function quickAddFromClick(e, dStr) {
  const rect = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - rect.top;
  let h = PL_DAY_START + Math.floor(y / PL_HOUR_H);
  h = Math.max(PL_DAY_START, Math.min(PL_DAY_END - 1, h));
  quickAddEvent(dStr, String(h).padStart(2,'0') + ':00');
}

// ── Mini-calendriers (barre latérale) ──
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function renderMiniCalendars() {
  const el = document.getElementById('planningSidebar');
  if (!el) return;
  const base = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  let html = '';
  for (let k = 0; k < 3; k++) {
    html += miniMonth(new Date(base.getFullYear(), base.getMonth() + k, 1), k === 0);
  }
  el.innerHTML = html;
}

function miniMonth(monthDate, withNav) {
  const y = monthDate.getFullYear(), m = monthDate.getMonth();
  const todayD = new Date();
  const weekMon = getMondayOf(currentDate);
  const weekDays = Array.from({length:7}, (_,i) => { const d=new Date(weekMon); d.setDate(d.getDate()+i); return dateStr(d); });
  const first = new Date(y, m, 1);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const gridStart = new Date(y, m, 1 - startDay);

  let cells = '';
  const dows = ['Lu','Ma','Me','Je','Ve','Sa','Di'];
  cells += `<div class="mg-cell mg-wh"></div>` + dows.map(d => `<div class="mg-cell mg-wh">${d}</div>`).join('');
  for (let w = 0; w < 6; w++) {
    const rowStart = new Date(gridStart); rowStart.setDate(gridStart.getDate() + w*7);
    if (w > 0 && rowStart.getMonth() !== m && !(w === 0)) { /* keep simple */ }
    cells += `<div class="mg-cell mg-wk">${isoWeek(rowStart)}</div>`;
    for (let i = 0; i < 7; i++) {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + w*7 + i);
      const ds = dateStr(d);
      const out = d.getMonth() !== m;
      const isTod = sameDay(d, todayD);
      const inWeek = weekDays.includes(ds);
      const cls = ['mg-cell','mg-day', out?'mg-out':'', inWeek?'mg-inweek':'', isTod?'mg-today':''].filter(Boolean).join(' ');
      cells += `<div class="${cls}" onclick="goToDate('${ds}')">${d.getDate()}</div>`;
    }
    // arrêter si la semaine suivante déborde entièrement du mois
    const nextRow = new Date(gridStart); nextRow.setDate(gridStart.getDate() + (w+1)*7);
    if (nextRow.getMonth() !== m && nextRow > new Date(y, m+1, 0)) break;
  }

  const nav = withNav
    ? `<button onclick="event.stopPropagation();navigate(-1)" title="Précédent">‹</button>
       <span class="mc-title">${MONTHS[m]} ${y}</span>
       <button onclick="event.stopPropagation();navigate(1)" title="Suivant">›</button>`
    : `<span style="width:20px"></span><span class="mc-title">${MONTHS[m]} ${y}</span><span style="width:20px"></span>`;

  return `<div class="mini-cal">
    <div class="mini-cal-head">${nav}</div>
    <div class="mini-grid">${cells}</div>
  </div>`;
}

function goToDate(ds) {
  currentDate = new Date(ds + 'T12:00:00');
  render();
}

function renderMonth() {
  const y = currentDate.getFullYear(), m = currentDate.getMonth();
  document.getElementById('calTitle').textContent = `${MONTHS[m]} ${y}`;
  const first = new Date(y, m, 1);
  const last = new Date(y, m+1, 0);
  const startDay = first.getDay() === 0 ? 6 : first.getDay()-1;
  const events = getFilteredEvents();
  const todayD = new Date();

  let cells = [];
  for (let i=0; i<startDay; i++) cells.push(null);
  for (let d=1; d<=last.getDate(); d++) cells.push(new Date(y,m,d));

  let html = `<div class="card" style="overflow:hidden">
    <div style="display:grid;grid-template-columns:repeat(7,1fr);background:var(--g50);border-bottom:2px solid var(--border)">
      ${DAYS.map(d=>`<div style="padding:.5rem;text-align:center;font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;border-left:1px solid var(--border)">${d.slice(0,3)}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr)">
      ${cells.map(d => {
        if (!d) return `<div style="min-height:90px;background:var(--g50);border:1px solid var(--border)"></div>`;
        const isTod = sameDay(d, todayD);
        const dayEvs = events.filter(e => eventOnDay(e, dateStr(d)));
        return `<div style="min-height:90px;padding:.4rem;border:1px solid var(--border);${isTod?'background:#eff6ff':''}" onclick="quickAddEvent('${dateStr(d)}','')">
          <div style="font-size:.8rem;font-weight:700;${isTod?'background:var(--blue);color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:3px':'color:var(--text);margin-bottom:3px'}">${d.getDate()}</div>
          ${dayEvs.slice(0,3).map(ev=>`<div style="background:${escHtml(ev.color)||TYPE_COLORS[ev.type]||'#3b82f6'};color:#fff;border-radius:3px;padding:1px 5px;font-size:.68rem;font-weight:600;cursor:pointer;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" onclick="event.stopPropagation();editEvent('${ev.id}')">${ev.vehicule?'🚗 ':''}${(ev.heure||ev.time)?'<span style="opacity:.85;font-weight:400">'+((ev.heure||ev.time).slice(0,5))+'</span> ':''}${ev.residentName?escHtml(ev.residentName)+' ':' '}${escHtml(ev.titre)}</div>`).join('')}
          ${dayEvs.length>3?`<div style="font-size:.68rem;color:var(--muted)">+${dayEvs.length-3} autres</div>`:''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
  document.getElementById('calContainer').innerHTML = html;
}

function renderListView() {
  const events = (getFilteredEvents()).sort((a,b) => ((a.date||'')+(a.heure||a.time||'')) > ((b.date||'')+(b.heure||b.time||'')) ? 1 : -1);
  document.getElementById('calTitle').textContent = 'Tous les événements';
  document.getElementById('calContainer').style.display = 'none';
  const listEl = document.getElementById('listContainer');
  listEl.style.display = '';
  const tbody = document.getElementById('eventTableBody');
  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Aucun événement planifié</td></tr>`;
    return;
  }
  tbody.innerHTML = events.map(ev => `<tr>
    <td><span style="display:inline-flex;align-items:center;gap:.4rem"><span style="width:10px;height:10px;border-radius:50%;background:${escHtml(ev.color)||TYPE_COLORS[ev.type]||'#3b82f6'};flex-shrink:0"></span><strong>${ev.vehicule?'🚗 ':''}${ev.residentName?escHtml(ev.residentName)+' — ':''}${escHtml(ev.titre)}</strong></span></td>
    <td>${escHtml(ev.residentName)||'Tous'}</td>
    <td>${ev.date ? formatDate(ev.date) : '—'}</td>
    <td>${ev.heure||ev.time||'—'}</td>
    <td><span class="badge badge-gray">${TYPE_LABELS[ev.type]||ev.type||'—'}</span></td>
    <td><div class="table-actions"><button class="btn btn-ghost btn-sm" onclick="editEvent('${ev.id}')">Modifier</button></div></td>
  </tr>`).join('');
}

function render() {
  document.getElementById('calContainer').style.display = '';
  document.getElementById('listContainer').style.display = 'none';
  const sidebar = document.getElementById('planningSidebar');
  if (sidebar) {
    if (currentView === 'list') { sidebar.style.display = 'none'; }
    else { sidebar.style.display = ''; renderMiniCalendars(); }
  }
  if (currentView === 'week') renderWeek();
  else if (currentView === 'month') renderMonth();
  else renderListView();
}

function navigate(dir) {
  if (currentView === 'week') currentDate.setDate(currentDate.getDate() + dir*7);
  else if (currentView === 'month') currentDate.setMonth(currentDate.getMonth() + dir);
  render();
}

function quickAddEvent(date, heure) {
  document.getElementById('evDate').value = date;
  document.getElementById('evHeure').value = heure || '09:00';
  document.getElementById('btnDeleteEvent').style.display = 'none';
  document.getElementById('modalEventTitle').textContent = 'Nouvel événement';
  document.getElementById('eventId').value = '';
  resetVehiculeFields();
  openModal('modalEvent');
}

function resetVehiculeFields() {
  const cb = document.getElementById('evVehiculeCheck');
  if (cb) { cb.checked = false; document.getElementById('evVehiculeFields').style.display = 'none'; }
  const veh = document.getElementById('evVehicule'); if (veh) veh.value = '';
  const dest = document.getElementById('evDestination'); if (dest) dest.value = '';
  const mot = document.getElementById('evMotif'); if (mot) mot.value = '';
}

function editEvent(id) {
  const events = DB.get(DB.keys.planning) || [];
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  document.getElementById('modalEventTitle').textContent = 'Modifier l\'événement';
  document.getElementById('eventId').value = id;
  document.getElementById('evTitre').value = ev.titre || '';
  document.getElementById('evResident').value = ev.residentId || '';
  document.getElementById('evType').value = ev.type || 'activite';
  document.getElementById('evDate').value = ev.date || '';
  document.getElementById('evHeure').value = ev.heure || ev.time || '09:00';
  document.getElementById('evDuree').value = ev.duree || '60';
  document.getElementById('evColor').value = ev.color || '#3b82f6';
  document.getElementById('evDesc').value = ev.desc || '';
  document.getElementById('btnDeleteEvent').style.display = '';
  const cb = document.getElementById('evVehiculeCheck');
  const hasVeh = ev.vehicule;
  if (cb) cb.checked = !!hasVeh;
  const vf = document.getElementById('evVehiculeFields');
  if (vf) vf.style.display = hasVeh ? 'flex' : 'none';
  const veh = document.getElementById('evVehicule'); if (veh) veh.value = ev.vehicule || '';
  const dest = document.getElementById('evDestination'); if (dest) dest.value = ev.destination || '';
  const mot = document.getElementById('evMotif'); if (mot) mot.value = ev.motif || '';
  openModal('modalEvent');
}

function saveEvent() {
  const titre = document.getElementById('evTitre').value.trim();
  if (!titre) { toast('Le titre est requis', 'error'); return; }
  const residentId = document.getElementById('evResident').value;
  const residents = DB.get(DB.keys.residents) || [];
  const res = residents.find(r => r.id === residentId);
  const data = {
    titre,
    residentId,
    residentName: res ? `${res.prenom||''} ${res.nom||''}`.trim() : '',
    type: document.getElementById('evType').value,
    date: document.getElementById('evDate').value,
    time: document.getElementById('evHeure').value,
    heure: document.getElementById('evHeure').value,
    duree: document.getElementById('evDuree').value,
    color: document.getElementById('evColor').value,
    desc: document.getElementById('evDesc').value.trim()
  };
  const vehCb = document.getElementById('evVehiculeCheck');
  if (vehCb && vehCb.checked) {
    const vehicule = document.getElementById('evVehicule').value.trim();
    const destination = document.getElementById('evDestination').value.trim();
    if (!vehicule || !destination) {
      toast('Veuillez remplir le véhicule et la destination', 'error');
      return;
    }
    data.vehicule = vehicule;
    data.destination = destination;
    data.motif = document.getElementById('evMotif').value.trim();
  } else {
    delete data.vehicule;
    delete data.destination;
    delete data.motif;
  }
  let events = DB.get(DB.keys.planning) || [];
  const id = document.getElementById('eventId').value;
  let finalEvent;
  if (id) { events = events.map(e => { if (e.id === id) { finalEvent = {...e,...data}; return finalEvent; } return e; }); toast('Événement mis à jour'); }
  else { data.id = genId(); finalEvent = data; events.push(data); toast('Événement ajouté'); }
  DB.set(DB.keys.planning, events);
  syncEventToResidentRdv(finalEvent);
  closeAllModals();
  render();
}

// Synchronise un événement planning de type "rdv" vers la fiche du résident (sante.rdv)
function syncEventToResidentRdv(event) {
  if (!event) return;
  const residents = DB.get(DB.keys.residents) || [];
  const setEventLink = (santeRdvId) => {
    const evs = (DB.get(DB.keys.planning) || []).map(e => {
      if (e.id !== event.id) return e;
      const c = { ...e };
      if (santeRdvId) c.santeRdvId = santeRdvId; else delete c.santeRdvId;
      return c;
    });
    DB.set(DB.keys.planning, evs);
  };

  // Pas (ou plus) un RDV → retirer le lien éventuel
  if (event.type !== 'rdv' || !event.residentId) {
    if (event.santeRdvId && event.residentId) {
      const r = residents.find(x => String(x.id) === String(event.residentId));
      if (r && r.sante && Array.isArray(r.sante.rdv)) {
        r.sante.rdv = r.sante.rdv.filter(x => x.id !== event.santeRdvId);
        DB.set(DB.keys.residents, residents);
      }
    }
    if (event.santeRdvId) setEventLink(null);
    return;
  }

  const r = residents.find(x => String(x.id) === String(event.residentId));
  if (!r) return;
  if (!r.sante) r.sante = {};
  if (!Array.isArray(r.sante.rdv)) r.sante.rdv = [];

  const rdvData = {
    date: event.date,
    heure: event.time || event.heure || '',
    type: event.titre || 'Rendez-vous',
    lieu: event.destination || '',
    notes: event.desc || '',
    planningId: event.id
  };

  let santeRdvId = event.santeRdvId;
  let idx = santeRdvId ? r.sante.rdv.findIndex(x => x.id === santeRdvId) : -1;
  if (idx < 0) { idx = r.sante.rdv.findIndex(x => x.planningId === event.id); if (idx >= 0) santeRdvId = r.sante.rdv[idx].id; }
  if (idx >= 0) {
    r.sante.rdv[idx] = { ...r.sante.rdv[idx], ...rdvData };
  } else {
    santeRdvId = genId();
    r.sante.rdv.push({ id: santeRdvId, fait: false, ...rdvData });
  }
  DB.set(DB.keys.residents, residents);
  if (event.santeRdvId !== santeRdvId) setEventLink(santeRdvId);
}

function deleteEvent() {
  const id = document.getElementById('eventId').value;
  confirmDialog('Supprimer cet événement ?', () => {
    let events = DB.get(DB.keys.planning) || [];
    const ev = events.find(e => e.id === id);
    events = events.filter(e => e.id !== id);
    DB.set(DB.keys.planning, events);
    // Retirer le RDV lié dans la fiche résident
    if (ev && ev.santeRdvId && ev.residentId) {
      const residents = DB.get(DB.keys.residents) || [];
      const r = residents.find(x => String(x.id) === String(ev.residentId));
      if (r && r.sante && Array.isArray(r.sante.rdv)) {
        r.sante.rdv = r.sante.rdv.filter(x => x.id !== ev.santeRdvId);
        DB.set(DB.keys.residents, residents);
      }
    }
    closeAllModals();
    render();
    toast('Événement supprimé', 'info');
  });
}

function populateResidentSelect() {
  const residents = (DB.get(DB.keys.residents)||[]).filter(r=>r.statut!=='sorti');
  [document.getElementById('evResident'), document.getElementById('filterEventResident')].forEach(sel => {
    if (!sel) return;
    residents.forEach(r => { const o=document.createElement('option'); o.value=r.id; o.textContent=`${r.prenom||''} ${r.nom||''}`.trim(); sel.appendChild(o); });
  });
}

function populateVehiculeList() {
  const list = document.getElementById('evVehiculeList');
  if (!list) return;
  const vehicules = DB.get(DB.keys.vehicules) || [];
  list.innerHTML = vehicules.map(v => `<option value="${escHtml(v)}"/>`).join('');
}

function initPlanning() {
  if (!requireModule('access_presences')) return;
  document.getElementById('evDate').value = today();
  populateResidentSelect();
  populateVehiculeList();
  render();
  document.getElementById('prevBtn').onclick = () => navigate(-1);
  document.getElementById('nextBtn').onclick = () => navigate(1);
  document.getElementById('todayBtn').onclick = () => { currentDate = new Date(); render(); };
  document.getElementById('filterEventResident').onchange = render;
  document.getElementById('viewWeek').onclick = () => { currentView='week'; setViewBtn('viewWeek'); document.getElementById('listContainer').style.display='none'; render(); };
  document.getElementById('viewMonth').onclick = () => { currentView='month'; setViewBtn('viewMonth'); document.getElementById('listContainer').style.display='none'; render(); };
  document.getElementById('viewList').onclick = () => { currentView='list'; setViewBtn('viewList'); render(); };
}
document.addEventListener('DOMContentLoaded', initPlanning);
if (typeof registerPageInit === 'function') registerPageInit('planning', initPlanning);

function setViewBtn(active) {
  ['viewWeek','viewMonth','viewList'].forEach(id => {
    const btn = document.getElementById(id);
    if (id === active) { btn.style.background='#fff'; btn.style.boxShadow='var(--shadow-sm)'; btn.classList.remove('btn-ghost'); }
    else { btn.style.background=''; btn.style.boxShadow=''; btn.classList.add('btn-ghost'); }
  });
}
