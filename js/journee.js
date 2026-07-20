// ── JOURNÉE / MA TOURNÉE (P5) — le projet personnalisé dans le quotidien ──
// Chaque tâche est reliée à un objectif du projet (🎯) : le professionnel voit
// POURQUOI il fait ce geste. Coche optimiste (1 tap = fait, horodaté), niveau de
// soutien précisable APRÈS coup, report avec motif — le refus de la personne est
// un droit. GARDE-FOU : aucune statistique de complétion par professionnel.

const JR_MOMENTS = [
  { id: 'matin', label: 'Matin',        ico: '☀️', sub: '7 h – 14 h' },
  { id: 'aprem', label: 'Après-midi',   ico: '🌤', sub: '14 h – 22 h' },
  { id: 'soir',  label: 'Soir & nuit',  ico: '🌙', sub: '22 h – 7 h' }
];
const JR_SOUTIEN = {
  autonomie:   { l: 'Autonomie',        c: '#16a34a' },
  supervision: { l: 'Supervision',      c: '#0284c7' },
  verbal:      { l: 'Guidance verbale', c: '#d97706' },
  partiel:     { l: 'Aide partielle',   c: '#ea580c' },
  total:       { l: 'Aide totale',      c: '#dc2626' }
};
// Le premier motif inscrit le droit de refus de la personne dans l'interface
const JR_MOTIFS = ["N'a pas voulu (c'est son droit)", 'Pas le bon moment', 'Absent·e / sorti·e', 'Autre'];
const JR_JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

let _jrTaches = [];
let _jrCoches = {};          // tacheId → coche du jour
let _jrResidents = [];
let _jrPpe = [];
let _jrQuart = 'matin';
let _jrTri = (typeof localStorage !== 'undefined' && localStorage.getItem('jr_tri')) || 'resident';   // tri de la tournée : 'resident' | 'heure'
let _jrCanEdit = false;
const _jrOpenMode = new Set();   // modes d'emploi dépliés
const _jrOpenStrip = new Set();  // bandelettes « soutien apporté » ouvertes après coche

// Date de SERVICE : avant 7 h du matin, on est encore sur la journée de la veille
// (le quart « Soir & nuit » 22h-7h chevauche minuit ; coches et récurrences suivent).
function jrDateService() {
  const d = new Date();
  if (d.getHours() < 7) d.setDate(d.getDate() - 1);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
let _jrDate = '';
let _jrLoadError = false;

function _jrUser() {
  const s = Auth.getSession();
  return s ? { id: s.userId, nom: [s.prenom, s.nom].filter(Boolean).join(' ') || s.username || '' } : { id: '', nom: '' };
}
function _jrInitiales(nom) {
  return (nom || '?').split(/\s+/).map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase();
}
const JR_AV_COLORS = ['#4f46e5', '#7c3aed', '#0f766e', '#0284c7', '#db2777', '#ea580c', '#16a34a'];
function _jrAvColor(rid) {
  let h = 0; const s = String(rid);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return JR_AV_COLORS[h % JR_AV_COLORS.length];
}

async function initJournee() {
  const s = Auth.getSession();
  if (!s) return;
  _jrCanEdit = ['admin', 'moderator', 'superadmin'].includes(s.role)
    || ((typeof canEditResidents === 'function') ? canEditResidents(s.userId) : Auth.isAdmin());
  const addBtn = document.getElementById('jrAddBtn');
  if (addBtn && _jrCanEdit) addBtn.style.display = '';

  // Quart courant selon l'heure — bornes des quarts de l'internat (7 h / 14 h / 22 h)
  const h = new Date().getHours();
  _jrQuart = (h >= 7 && h < 14) ? 'matin' : (h >= 14 && h < 22) ? 'aprem' : 'soir';
  _jrDate = jrDateService();

  const dateEl = document.getElementById('jrDateLabel');
  if (dateEl) dateEl.textContent = new Date(_jrDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  try {
    const jobs = [sbGetResidents(), sbGetTaches(), sbGetCoches(_jrDate)];
    const [residents, taches, coches] = await Promise.all(jobs);
    _jrResidents = residents;
    _jrTaches = taches;
    _jrCoches = {};
    coches.forEach(c => { _jrCoches[c.tacheId] = c; });
  } catch (e) {
    console.error('[journee]', e);
    _jrLoadError = true;
    const errHtml = '<div class="empty" style="padding:2.5rem;text-align:center"><p>Impossible de charger la journée.<br><span style="font-size:.78rem">Si la page vient d\'être installée, exécutez <strong>migration-taches-ppa.sql</strong> dans Supabase.</span></p></div>';
    document.getElementById('jrList').innerHTML = errHtml;
    return;
  }
  // Avenants pour relier les objectifs (facultatif : la page vit sans)
  try { if (typeof sbGetPpe === 'function') _jrPpe = await sbGetPpe(); } catch (e) { _jrPpe = []; }

  // Nature des moments (design V2) — dégradation douce si migration-journee.sql
  // n'a pas été exécuté : la page s'affiche simplement sans nature.
  if (typeof jn2LoadTypes === 'function') await jn2LoadTypes();

  renderJournee();
}

// Tâches actives dont la récurrence tombe aujourd'hui
function jrTachesDuJour() {
  const dow = new Date((_jrDate || jrDateService()) + 'T12:00:00').getDay();
  return _jrTaches.filter(t => {
    if (t.actif === false) return false;
    const r = t.recurrence || {};
    if (r.type === 'jours') return Array.isArray(r.jours) && r.jours.includes(dow);
    return true; // quotidien
  });
}

function jrEtat(t) {
  const c = _jrCoches[t.id];
  return c ? c.statut : '';
}

function renderJournee() {
  if (_jrLoadError) return;   // l'écran d'erreur reste affiché
  // Design V2 : le rendu est délégué à js/journee-v2.js. Tous les appelants
  // existants (jrFait, jrMotif, saveTache…) continuent d'appeler renderJournee().
  if (typeof jn2Render === 'function') { jn2Render(); return; }
  renderTournee();
}

// Rendu V1 de secours — conservé tant que le module V2 n'est pas chargé.
function renderTournee() {
  const jour = jrTachesDuJour();
  const parQuart = q => jour.filter(t => t.moment === q);

  // Segments de quart
  const quartsEl = document.getElementById('jrQuarts');
  if (!quartsEl) return;
  quartsEl.innerHTML = JR_MOMENTS.map(m => {
    const list = parQuart(m.id);
    const faits = list.filter(t => jrEtat(t) === 'fait').length;
    return `<button type="button" class="jr-quart${_jrQuart === m.id ? ' on' : ''}" aria-pressed="${_jrQuart === m.id}" title="${m.label} · ${m.sub}" onclick="jrSetQuart('${m.id}')">${m.ico} ${list.length ? `${faits}/${list.length}` : '—'}</button>`;
  }).join('');

  const list = parQuart(_jrQuart);
  const faits = list.filter(t => jrEtat(t) === 'fait').length;
  const reportes = list.filter(t => jrEtat(t) === 'reporte').length;
  const momLabel = JR_MOMENTS.find(m => m.id === _jrQuart);

  // Phrase de charge humanisée (greffe du design C)
  const chargeEl = document.getElementById('jrCharge');
  if (chargeEl) chargeEl.textContent = list.length
    ? `${list.length} moment${list.length > 1 ? 's' : ''} d'accompagnement prévu${list.length > 1 ? 's' : ''} ${_jrQuart === 'matin' ? 'ce matin' : _jrQuart === 'aprem' ? 'cet après-midi' : 'ce soir'}`
    : 'Aucun moment prévu sur ce quart';

  document.getElementById('jrDone').textContent = faits;
  document.getElementById('jrTotal').textContent = ' / ' + list.length;
  document.getElementById('jrBarLabel').textContent = reportes ? `${reportes} reporté${reportes > 1 ? 's' : ''} — l'équipe ajustera avec la personne` : (list.length ? momLabel.label + ' en cours' : '');
  document.getElementById('jrBarFill').style.width = list.length ? Math.round(faits / list.length * 100) + '%' : '0%';

  // Groupes par résident (l'unité de travail reste la personne)
  const parResident = {};
  list.forEach(t => { (parResident[t.residentId] = parResident[t.residentId] || []).push(t); });
  const rids = Object.keys(parResident).sort((a, b) => (parResident[a][0].residentName || '').localeCompare(parResident[b][0].residentName || ''));

  // Rail de chips (sommaire) — badge « n à faire » / coche verte (greffe du design B)
  const railEl = document.getElementById('jrRail');
  railEl.innerHTML = rids.map(rid => {
    const ts = parResident[rid];
    const nom = ts[0].residentName || 'Résident';
    const todo = ts.filter(t => !jrEtat(t)).length;
    return `<button type="button" class="jr-chip" onclick="document.getElementById('jrg_${escHtml(rid)}')?.scrollIntoView({behavior:'smooth'})">
      <span class="jr-av" style="background:${_jrAvColor(rid)}">${escHtml(_jrInitiales(nom))}</span>${escHtml(nom.split(' ')[0])}
      ${todo ? `<small class="todo">${todo} à faire</small>` : '<small style="color:#16a34a">✓</small>'}
    </button>`;
  }).join('');

  // Commutateur de tri (👥 par résident / 🕐 par heure)
  const triEl = document.getElementById('jrTriBar');
  if (triEl) triEl.innerHTML = list.length ? `<div class="jr-tri" role="group" aria-label="Ordre de la tournée">
    <button type="button" class="jr-tribtn${_jrTri === 'resident' ? ' on' : ''}" aria-pressed="${_jrTri === 'resident'}" onclick="jrSetTri('resident')">👥 Par résident</button>
    <button type="button" class="jr-tribtn${_jrTri === 'heure' ? ' on' : ''}" aria-pressed="${_jrTri === 'heure'}" onclick="jrSetTri('heure')">🕐 Par heure</button>
  </div>` : '';

  // Fil chronologique : rails d'heure, cartes avec avatar du résident
  if (_jrTri === 'heure') {
    if (railEl) railEl.innerHTML = '';
    const el2 = document.getElementById('jrList');
    if (!list.length) {
      el2.innerHTML = `<div class="empty" style="padding:2.5rem;text-align:center"><p>Aucun moment d'accompagnement sur ce quart.${_jrCanEdit ? '<br><button class="btn btn-accent" style="margin-top:.8rem" onclick="openTacheModal()">+ Créer une tâche depuis un projet</button>' : ''}</p></div>`;
      return;
    }
    const avecHeure = list.filter(t => t.heure).sort((a, b) => a.heure.localeCompare(b.heure));
    const sansHeure = list.filter(t => !t.heure).sort((a, b) => (a.residentName || '').localeCompare(b.residentName || ''));
    const parHeure = {};
    avecHeure.forEach(t => { const h = t.heure.slice(0, 2); (parHeure[h] = parHeure[h] || []).push(t); });
    let html = Object.keys(parHeure).sort().map(h =>
      `<div class="jr-hrail"><span>${parseInt(h, 10)} h</span><i></i></div><div class="jr-cards">${parHeure[h].map(t => jrCardHtml(t, true)).join('')}</div>`
    ).join('');
    if (sansHeure.length) {
      html += `<div class="jr-hrail"><span>🕐 Sans heure précise</span><i></i></div><div class="jr-cards">${sansHeure.map(t => jrCardHtml(t, true)).join('')}</div>`;
    }
    el2.innerHTML = html;
    return;
  }

  const el = document.getElementById('jrList');
  if (!rids.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem;text-align:center"><p>Aucun moment d'accompagnement sur ce quart.${_jrCanEdit ? '<br><button class="btn btn-accent" style="margin-top:.8rem" onclick="openTacheModal()">+ Créer une tâche depuis un projet</button>' : ''}</p></div>`;
    return;
  }
  el.innerHTML = rids.map(rid => {
    const ts = parResident[rid].slice().sort((a, b) => (a.heure || '99').localeCompare(b.heure || '99'));
    const nom = ts[0].residentName || 'Résident';
    return `<section class="jr-group" id="jrg_${escHtml(rid)}">
      <div class="jr-ghead">
        <span class="jr-av" style="background:${_jrAvColor(rid)};width:42px;height:42px;font-size:.85rem">${escHtml(_jrInitiales(nom))}</span>
        <div><div class="jr-gname">${escHtml(nom)}</div>
        <div class="jr-gmeta">${ts.length} moment${ts.length > 1 ? 's' : ''} sur ce quart</div></div>
      </div>
      <div class="jr-cards">${ts.map(t => jrCardHtml(t)).join('')}</div>
    </section>`;
  }).join('');
}

function jrSetQuart(q) { _jrQuart = q; renderJournee(); }

function jrSetTri(t) {
  _jrTri = t;
  try { localStorage.setItem('jr_tri', t); } catch (e) {}
  renderJournee();
}

function jrCardHtml(t, avecResident) {
  const c = _jrCoches[t.id];
  const etat = c ? c.statut : '';
  const modeOpen = _jrOpenMode.has(t.id);
  const stripOpen = _jrOpenStrip.has(t.id);
  const attendu = t.soutienAttendu && JR_SOUTIEN[t.soutienAttendu];

  let note = '';
  if (etat === 'fait') {
    const heure = c.doneAt ? new Date(c.doneAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const sout = c.soutien && JR_SOUTIEN[c.soutien] ? ` · 🤝 ${JR_SOUTIEN[c.soutien].l}` : '';
    note = `<div class="jr-note">Fait${heure ? ' à ' + heure : ''}${c.par ? ' · ' + escHtml(c.par) : ''}${sout}</div>`;
  } else if (etat === 'reporte') {
    note = `<div class="jr-note rep">⏭ Reporté${c.motif ? ' — ' + escHtml(c.motif) : ''}${c.par ? ' · ' + escHtml(c.par) : ''}</div>`;
  }

  // Mode d'emploi (remplaçants) : consigne + soutien attendu
  let mode = '';
  if (t.consigne || attendu) {
    mode = `<button type="button" class="jr-btn-sec" style="margin-top:6px" onclick="jrToggleMode('${t.id}')" aria-expanded="${modeOpen}">${modeOpen ? '▾' : '▸'} 📖 Mode d'emploi</button>` +
      (modeOpen ? `<div class="jr-mode">📖 <span>${escHtml(t.consigne || 'Pas de consigne particulière.')}${attendu ? ` — <strong>soutien attendu : ${attendu.l}</strong>` : ''}</span></div>` : '');
  }

  // Bandelette « soutien apporté » après la coche — l'attendu est pré-surligné (greffe C)
  let strip = '';
  if (etat === 'fait' && stripOpen) {
    strip = `<div class="jr-strip"><span class="jr-strip-label">🤝 Soutien apporté :</span>` +
      Object.entries(JR_SOUTIEN).map(([k, v]) => {
        const cls = (c.soutien === k) ? 'jr-pill on' : (t.soutienAttendu === k ? 'jr-pill attendu' : 'jr-pill');
        return `<button type="button" class="${cls}" onclick="jrSoutien('${t.id}','${k}')">${v.l}${t.soutienAttendu === k && c.soutien !== k ? ' ⬅' : ''}</button>`;
      }).join('') +
      `<button type="button" class="jr-btn-sec" style="min-height:32px" onclick="jrCloseStrip('${t.id}')">plus tard</button></div>`;
  }

  // Choix du motif de report
  let motifs = '';
  if (!etat && _jrOpenStrip.has('rep_' + t.id)) {
    motifs = `<div class="jr-strip"><span class="jr-strip-label">Motif :</span>` +
      JR_MOTIFS.map(m => `<button type="button" class="jr-pill" onclick="jrMotif('${t.id}',this.textContent)">${m}</button>`).join('') + `</div>`;
  }

  // Option 3 — checklist tactile : grand cercle de validation à gauche = Fait (bascule)
  const circleInner = etat === 'reporte' ? '⏭' : '✓';
  const circleCls = etat === 'fait' ? 'jr-check done' : etat === 'reporte' ? 'jr-check rep' : 'jr-check';
  const circleTitle = etat === 'fait' ? 'Fait — toucher pour annuler' : etat === 'reporte' ? 'Reporté — toucher pour annuler' : 'Marquer comme fait';
  const check = `<button type="button" class="${circleCls}" onclick="${etat ? `jrAnnule('${t.id}')` : `jrFait('${t.id}')`}" title="${circleTitle}" aria-label="${circleTitle}">${circleInner}</button>`;

  // Actions secondaires (le « Fait » est le cercle ; « Annuler » = re-toucher le cercle)
  const sec = [];
  if (!etat) sec.push(`<button type="button" class="jr-btn-sec" onclick="jrOpenReport('${t.id}')">⏭ Reporter</button>`);
  if (etat === 'fait' && !c.soutien) sec.push(`<button type="button" class="jr-btn-sec" onclick="jrOpenStrip('${t.id}')">🤝 Préciser le soutien</button>`);
  if (_jrCanEdit) sec.push(`<button type="button" class="jr-btn-sec" onclick="openTacheModal('${t.id}')" title="Modifier la tâche">✎ Modifier</button>`);
  const secRow = sec.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${sec.join('')}</div>` : '';

  const resLine = avecResident
    ? `<div class="jr-resline"><span class="jr-av" style="background:${_jrAvColor(t.residentId)}">${escHtml(_jrInitiales(t.residentName))}</span><b>${escHtml((t.residentName || '').split(' ')[0])}</b></div>`
    : '';
  return `<article class="jr-task ${etat}">
    <div style="display:flex;gap:12px;align-items:flex-start">
      ${check}
      <div style="flex:1;min-width:0">
        ${resLine}
        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
          ${t.heure ? `<span style="font-size:.68rem;color:var(--muted);font-weight:700">${escHtml(t.heure)}</span>` : ''}
          <span class="jr-lib">${escHtml(t.libelle)}</span>
        </div>
        ${t.objectif ? `<div class="jr-obj">🎯 ${escHtml(t.objectif)}</div>` : ''}
        ${note}${mode}${strip}${motifs}${secRow}
      </div>
    </div>
  </article>`;
}

// ── Actions terrain (coche optimiste : jamais bloquante) ──

async function jrFait(id) {
  const u = _jrUser();
  const t = _jrTaches.find(x => x.id === id);
  if (!t) return;
  const local = { tacheId: id, date: _jrDate, statut: 'fait', motif: '', soutien: '', par: u.nom, parId: u.id, doneAt: new Date().toISOString() };
  _jrCoches[id] = local;                          // optimiste : l'écran répond tout de suite
  _jrOpenStrip.add(id);                           // le niveau de soutien est un vocabulaire d'équipe
  _jrOpenStrip.delete('rep_' + id);               // referme un éventuel choix de motif en cours
  renderJournee();
  try {
    const saved = await sbSetCoche(local);
    if (_jrCoches[id] === local) { _jrCoches[id] = saved; }   // ignoré si annulé/écrasé entre-temps
  }
  catch (e) {
    if (_jrCoches[id] === local) { delete _jrCoches[id]; _jrOpenStrip.delete(id); renderJournee(); }
    toast('Coche non enregistrée : ' + (e?.message || e), 'error');
  }
}

async function jrSoutien(id, val) {
  const c = _jrCoches[id];
  if (!c) return;
  const avant = c.soutien;
  c.soutien = val;
  _jrOpenStrip.delete(id);
  renderJournee();
  try {
    const saved = await sbSetCoche(c);
    if (_jrCoches[id] === c) _jrCoches[id] = saved;
  }
  catch (e) {
    if (_jrCoches[id] === c) { c.soutien = avant; _jrOpenStrip.add(id); renderJournee(); }
    toast('Soutien non enregistré', 'error');
  }
}

function jrOpenStrip(id) { _jrOpenStrip.add(id); renderJournee(); }
function jrCloseStrip(id) { _jrOpenStrip.delete(id); renderJournee(); }
function jrOpenReport(id) { _jrOpenStrip.add('rep_' + id); renderJournee(); }

async function jrMotif(id, motif) {
  let m = motif;
  if (m === 'Autre') { m = (prompt('Motif du report :') || '').trim(); if (!m) return; }
  const u = _jrUser();
  _jrOpenStrip.delete('rep_' + id);
  const local = { tacheId: id, date: _jrDate, statut: 'reporte', motif: m, soutien: '', par: u.nom, parId: u.id, doneAt: new Date().toISOString() };
  _jrCoches[id] = local;
  renderJournee();
  try {
    const saved = await sbSetCoche(local);
    if (_jrCoches[id] === local) _jrCoches[id] = saved;
  }
  catch (e) {
    if (_jrCoches[id] === local) { delete _jrCoches[id]; renderJournee(); }
    toast('Report non enregistré', 'error');
  }
}

async function jrAnnule(id) {
  const prev = _jrCoches[id];
  delete _jrCoches[id];
  _jrOpenStrip.delete(id);
  renderJournee();
  try { await sbClearCoche(id, _jrDate); }
  catch (e) { _jrCoches[id] = prev; renderJournee(); toast('Annulation impossible', 'error'); }
}

function jrToggleMode(id) {
  if (_jrOpenMode.has(id)) _jrOpenMode.delete(id); else _jrOpenMode.add(id);
  renderJournee();
}

// Refus exprimé par la personne : enregistré avec le motif canonique (cohérent côté tournée)
async function jrRefus(id) {
  const u = _jrUser();
  _jrOpenStrip.delete('rep_' + id);   // referme un choix de motif resté ouvert côté tournée
  const local = { tacheId: id, date: _jrDate, statut: 'reporte', motif: JR_MOTIFS[0], soutien: '', par: u.nom, parId: u.id, doneAt: new Date().toISOString() };
  _jrCoches[id] = local;
  renderJournee();
  try {
    const saved = await sbSetCoche(local);
    if (_jrCoches[id] === local) _jrCoches[id] = saved;
  } catch (e) {
    if (_jrCoches[id] === local) { delete _jrCoches[id]; renderJournee(); }
    toast('Non enregistré : ' + (e?.message || e), 'error');
  }
}

// ── Gestion des tâches (création / édition / retrait) ──

function openTacheModal(id) {
  if (!_jrCanEdit) return;
  const t = id ? _jrTaches.find(x => x.id === id) : null;
  document.getElementById('tacheModalTitle').textContent = t ? 'Modifier la tâche' : 'Nouvelle tâche';
  document.getElementById('tcEditId').value = t ? t.id : '';
  const rSel = document.getElementById('tcResident');
  rSel.innerHTML = '<option value="">— Choisir —</option>' + _jrResidents
    .filter(r => r.statut !== 'sorti')
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'))
    .map(r => `<option value="${r.id}">${escHtml((r.prenom || '') + ' ' + (r.nom || ''))}</option>`).join('');
  if (t && t.residentId && !rSel.querySelector(`option[value="${t.residentId}"]`)) {
    rSel.insertAdjacentHTML('beforeend', `<option value="${t.residentId}">${escHtml(t.residentName || 'Résident sorti')} (sorti)</option>`);
  }
  rSel.value = t ? t.residentId : '';
  document.getElementById('tcLibelle').value = t ? t.libelle : '';
  document.getElementById('tcMoment').value = t ? t.moment : _jrQuart;
  document.getElementById('tcHeure').value = t ? t.heure : '';
  const rec = (t && t.recurrence) || { type: 'quotidien' };
  document.getElementById('tcRecurrence').value = rec.type === 'jours' ? 'jours' : 'quotidien';
  const joursEl = document.getElementById('tcJours');
  joursEl.style.display = rec.type === 'jours' ? 'flex' : 'none';
  joursEl.innerHTML = JR_JOURS.map((j, i) =>
    `<label><input type="checkbox" value="${i}"${rec.jours && rec.jours.includes(i) ? ' checked' : ''}/>${j}</label>`).join('');
  document.getElementById('tcConsigne').value = t ? t.consigne : '';
  document.getElementById('tcSoutien').value = t ? t.soutienAttendu : '';
  document.getElementById('tcArchiveBtn').style.display = t ? '' : 'none';
  // Nature du moment (design V2) — donnée portée par la table taches_type
  if (typeof jn2SetType === 'function') jn2SetType(t ? jn2TypeOf(t.id) : '');
  tcSyncObjectifs(t ? t.objectif : '');
  openModal('modalTache');
}

// Objectifs du dernier avenant du résident sélectionné (+ saisie libre)
let _tcPpeId = null;   // avenant source des objectifs proposés (→ colonne ppe_id)
function tcSyncObjectifs(preset) {
  const rid = document.getElementById('tcResident').value;
  const sel = document.getElementById('tcObjectif');
  const libre = document.getElementById('tcObjectifLibre');
  const objs = [];
  if (rid && _jrPpe.length) {
    const avs = _jrPpe.filter(p => String(p.residentId) === String(rid))
      .sort((a, b) => String(b.dateRedaction || b.createdAt || '').localeCompare(String(a.dateRedaction || a.createdAt || '')));
    const av = avs[0];
    _tcPpeId = av ? av.id : null;
    if (av) Object.values(av.sections || {}).forEach(s => (s.objectifs || []).forEach(o => {
      if ((o.objectif || '').trim()) objs.push(o.objectif.trim());
    }));
  }
  const cur = typeof preset === 'string' ? preset : '';
  sel.innerHTML = '<option value="">— Sans objectif relié —</option>' +
    objs.map(o => `<option value="${escHtml(o)}"${o === cur ? ' selected' : ''}>🎯 ${escHtml(o.slice(0, 80))}</option>`).join('') +
    `<option value="__libre__">✎ Autre (saisie libre)…</option>`;
  if (cur && !objs.includes(cur)) { sel.value = '__libre__'; libre.style.display = ''; libre.value = cur; }
  else { libre.style.display = 'none'; libre.value = ''; }
  sel.onchange = () => { libre.style.display = sel.value === '__libre__' ? '' : 'none'; };
}

async function saveTache() {
  const id = document.getElementById('tcEditId').value;
  const rid = document.getElementById('tcResident').value;
  const libelle = document.getElementById('tcLibelle').value.trim();
  if (!rid) { toast('Choisissez un résident', 'error'); return; }
  if (!libelle) { toast('Le libellé est obligatoire', 'error'); return; }
  const r = _jrResidents.find(x => String(x.id) === String(rid));
  const objSel = document.getElementById('tcObjectif').value;
  const objectif = objSel === '__libre__' ? document.getElementById('tcObjectifLibre').value.trim() : objSel;
  const recType = document.getElementById('tcRecurrence').value;
  const jours = [...document.querySelectorAll('#tcJours input:checked')].map(i => Number(i.value));
  if (recType === 'jours' && !jours.length) { toast('Choisissez au moins un jour', 'error'); return; }
  const existante = id ? _jrTaches.find(x => x.id === id) : null;
  const data = {
    id: id || undefined,
    residentId: rid,
    residentName: r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : (existante ? existante.residentName : ''),
    libelle, objectif,
    ppeId: (objectif && objSel !== '__libre__') ? _tcPpeId : (existante ? existante.ppeId : null),
    moment: document.getElementById('tcMoment').value,
    heure: document.getElementById('tcHeure').value,
    recurrence: recType === 'jours' ? { type: 'jours', jours } : { type: 'quotidien' },
    consigne: document.getElementById('tcConsigne').value.trim(),
    soutienAttendu: document.getElementById('tcSoutien').value,
    createdBy: existante ? existante.createdBy : _jrUser().nom
  };
  let savedId = id;
  try {
    const saved = await sbSaveTache(data);
    savedId = saved.id;
    if (id) { _jrTaches = _jrTaches.map(x => x.id === id ? saved : x); toast('Tâche modifiée'); }
    else { _jrTaches.push(saved); toast('Tâche créée', 'success'); }
  } catch (e) { console.error('[saveTache]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  // La nature du moment vit à part (table taches_type) : elle ne peut pas faire
  // échouer l'enregistrement de la tâche, qui est déjà en base.
  if (typeof jn2SaveType === 'function') {
    await jn2SaveType(savedId, document.getElementById('tcType')?.value || '');
  }
  closeModal('modalTache');
  renderJournee();
}

function archiveTache() {
  const id = document.getElementById('tcEditId').value;
  if (!id) return;
  confirmDialog('Retirer cette tâche de la journée ? (l\'historique des coches est conservé)', async () => {
    try { await sbArchiveTache(id); _jrTaches = _jrTaches.filter(x => x.id !== id); }
    catch (e) { toast('Erreur : ' + (e?.message || e), 'error'); return; }
    closeModal('modalTache');
    renderJournee();
    toast('Tâche retirée', 'info');
  });
}
