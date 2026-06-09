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
  if (res) events = events.filter(e => e.residentId === res || !e.residentId);
  return events;
}

function renderWeek() {
  const monday = getMondayOf(currentDate);
  const days = Array.from({length:7}, (_,i) => { const d=new Date(monday); d.setDate(d.getDate()+i); return d; });
  const todayD = new Date();
  document.getElementById('calTitle').textContent = `${monday.getDate()} ${MONTHS[monday.getMonth()]} — ${days[6].getDate()} ${MONTHS[days[6].getMonth()]} ${days[6].getFullYear()}`;
  const events = getFilteredEvents();
  const hours = Array.from({length:14}, (_,i) => i+7); // 7h-20h

  let html = `<div class="card" style="overflow:hidden">
    <div style="display:grid;grid-template-columns:60px repeat(7,1fr);background:var(--g50);border-bottom:2px solid var(--border)">
      <div style="padding:.75rem;border-right:1px solid var(--border)"></div>
      ${days.map(d => {
        const isTod = sameDay(d, todayD);
        return `<div style="padding:.75rem .5rem;text-align:center;border-left:1px solid var(--border)">
          <div style="font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase">${DAYS[d.getDay()===0?6:d.getDay()-1].slice(0,3)}</div>
          <div style="font-size:1.2rem;font-weight:800;${isTod?'background:var(--blue);color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:4px auto 0':'color:var(--text);margin-top:4px'}">${d.getDate()}</div>
        </div>`;
      }).join('')}
    </div>
    ${hours.map(h => `
      <div style="display:grid;grid-template-columns:60px repeat(7,1fr);min-height:52px">
        <div style="padding:.35rem .5rem;text-align:right;font-size:.7rem;color:var(--g400);font-weight:500;border-right:1px solid var(--border);border-top:1px solid var(--g100)">${h}:00</div>
        ${days.map(d => {
          const dayEvents = events.filter(e => eventOnDay(e, dateStr(d)) && (e.heure||e.time) && parseInt(e.heure||e.time) === h);
          return `<div style="border-left:1px solid var(--border);border-top:1px solid var(--g100);padding:2px;position:relative;cursor:pointer" onclick="quickAddEvent('${dateStr(d)}','${h}:00')">
            ${dayEvents.map(ev => `<div class="cal-event" style="background:${escHtml(ev.color)||TYPE_COLORS[ev.type]||'#3b82f6'}" onclick="event.stopPropagation();editEvent('${ev.id}')" title="${ev.residentName?escHtml(ev.residentName)+' — ':''}${escHtml(ev.titre)}${ev.vehicule?' — 🚗 '+escHtml(ev.vehicule):''}">${ev.vehicule?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;vertical-align:middle;margin-right:2px"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M19 17a2 2 0 1 0-4 0"/></svg>':''}<span style="opacity:.85;font-weight:400;margin-right:3px">${(ev.heure||ev.time||'').slice(0,5)}</span>${ev.residentName?'<span style="font-weight:400;opacity:.85">'+escHtml(ev.residentName)+'</span> ':''}${escHtml(ev.titre)}</div>`).join('')}
          </div>`;
        }).join('')}
      </div>`).join('')}
  </div>`;
  document.getElementById('calContainer').innerHTML = html;
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
