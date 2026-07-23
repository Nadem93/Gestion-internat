// ── TRAÇABILITÉ DE LA DISTRIBUTION DES MÉDICAMENTS ──

// Heure d'une distribution : accepte un horodatage ISO complet ou une heure « HH:MM »
function medHeure(h) { return !h ? '' : (String(h).includes('T') ? String(h).slice(11, 16) : String(h).slice(0, 5)); }
let medCanEdit = false;
let medNoteCtx = null;
let medSearch = '';
let medFilterPresent = false;

function medSetSearch(v) { medSearch = v.toLowerCase().trim(); renderMedicaments(); }
function medTogglePresent() { medFilterPresent = !medFilterPresent; renderMedicaments(); }

const MED_MOMENTS = {
  matin: { label: 'Matin', icon: '🌅' },
  midi: { label: 'Midi', icon: '☀️' },
  soir: { label: 'Soir', icon: '🌆' },
  coucher: { label: 'Coucher', icon: '🌙' }
};
// Heure au-delà de laquelle une prise non enregistrée est considérée en retard
// (même seuils que la génération d'alertes dans js/alertes.js)
const MED_HEURE_LIMITE = { matin: 11, midi: 14, soir: 20, coucher: 23 };
const MED_STATUTS = {
  donne:  { label: 'Donné',   icon: '✅', color: '#16a34a' },
  confie: { label: 'Confié',  icon: '🤝', color: '#2563eb' },
  refuse: { label: 'Refusé',  icon: '🚫', color: '#dc2626' },
  absent: { label: 'Absent',  icon: '➖', color: '#6b7280' },
  report: { label: 'Reporté', icon: '⏭️', color: '#d97706' }
};

// ── Pilulier : bandelette d'actions ouverte (une seule à la fois) ──
let _medOpenChip = '';   // clé `${residentId}|${traitementId}|${moment}`
function medToggleChip(key) { _medOpenChip = _medOpenChip === key ? '' : key; renderMedicaments(); }
function medMomentCourant() {
  const h = new Date().getHours();
  return h < 11 ? 'matin' : h < 14 ? 'midi' : h < 20 ? 'soir' : 'coucher';
}

// Source = Supabase. Cache mémoire chargé au démarrage.
let _medCache = [];
function getMedDistrib() { return _medCache; }
async function loadMedCache() { _medCache = await sbGetMedDistrib(); }

function medResidents() {
  return sbResidents().filter(r => r.statut !== 'sorti')
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'));
}

// Traitements avec moments de prise, actifs pour une date donnée
function medPrevues(date) {
  const out = [];
  medResidents().forEach(r => {
    const traitements = (r.sante?.traitements || []).filter(t =>
      (t.moments || []).length && (!t.debut || t.debut <= date) && (!t.fin || t.fin >= date));
    traitements.forEach(t => (t.moments || []).forEach(moment => {
      out.push({
        residentId: r.id, residentName: `${r.prenom || ''} ${r.nom || ''}`.trim(),
        traitementId: t.id, medicament: t.nom, posologie: t.posologie, moment
      });
    }));
  });
  return out;
}

function medRecord(date, residentId, traitementId, moment) {
  return getMedDistrib().find(x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment);
}

// ── File d'écriture unique (calquée sur la page présences) ──
// Les taps sont appliqués de façon optimiste au cache puis écrits en base
// dans l'ordre des gestes. En cas d'échec, on ne recharge la vérité serveur
// qu'une fois la file vidée, pour ne pas effacer les écritures en attente.
let _medWriteChain = Promise.resolve();
let _medPendingWrites = 0, _medWriteFailed = false;
function medQueueWrite(fn) {
  _medPendingWrites++;
  _medWriteChain = _medWriteChain.then(async () => {
    try { await fn(); }
    catch (e) { console.error('[medQueueWrite]', e); _medWriteFailed = true; toast('Erreur lors de l\'enregistrement', 'error'); }
    finally {
      _medPendingWrites--;
      if (!_medPendingWrites && _medWriteFailed) { _medWriteFailed = false; await loadMedCache(); renderMedicaments(); }
    }
  });
  return _medWriteChain;
}

// ── Appui long sur une pastille (500 ms) → menu complet des statuts ──
let _medLpTimer = null, _medLpFired = false;
function medChipDown(ev, key) {
  if (ev && ev.button > 0) return; // clic droit : ignoré
  _medLpFired = false;
  clearTimeout(_medLpTimer);
  _medLpTimer = setTimeout(() => { _medLpFired = true; medToggleChip(key); }, 500);
}
function medChipUp() { clearTimeout(_medLpTimer); }
// Un tap = « Donné » (re-tap sur Donné = annule). Si l'appui long a déjà
// ouvert le menu, on avale ce click de relâchement.
function medChipClick(date, residentId, traitementId, moment) {
  if (!medCanEdit) return;
  if (_medLpFired) { _medLpFired = false; return; }
  setMedStatut(date, residentId, traitementId, moment, 'donne');
}

// ── RENDU PRINCIPAL ──
function renderMedicaments() {
  const date = document.getElementById('medDate').value || today();
  const prevues = medPrevues(date);
  const records = getMedDistrib();
  const enriched = prevues.map(p => ({ ...p, record: records.find(x => x.date === date && String(x.residentId) === String(p.residentId) && x.traitementId === p.traitementId && x.moment === p.moment) }));

  const nbDonne    = enriched.filter(e => e.record?.statut === 'donne').length;
  const nbIncident = enriched.filter(e => e.record?.statut && ['refuse','absent','report'].includes(e.record.statut)).length;
  const nbAttente  = enriched.filter(e => !e.record?.statut).length;

  document.getElementById('medStats').innerHTML = `
    <div class="chx-stat" style="--c:#2563eb"><div class="chx-stat-top"><span class="chx-stat-lbl">Prises prévues</span></div><div class="chx-stat-num">${enriched.length}</div></div>
    <div class="chx-stat" style="--c:#16a34a"><div class="chx-stat-top"><span class="chx-stat-lbl">Données</span></div><div class="chx-stat-num">${nbDonne}</div></div>
    <div class="chx-stat" style="--c:#dc2626"><div class="chx-stat-top"><span class="chx-stat-lbl">Refus / absences / reports</span></div><div class="chx-stat-num">${nbIncident}</div></div>
    <div class="chx-stat" style="--c:#d97706"><div class="chx-stat-top"><span class="chx-stat-lbl">En attente</span></div><div class="chx-stat-num">${nbAttente}</div></div>`;

  const el = document.getElementById('medList');
  if (!enriched.length) {
    el.innerHTML = `<div style="background:rgba(255,255,255,.9);border-radius:18px;padding:2.5rem;text-align:center">
      <div style="font-size:2rem;margin-bottom:.75rem">💊</div>
      <div style="font-weight:700;font-size:1rem;color:#1e293b;margin-bottom:.4rem">Aucun traitement à distribuer</div>
      <div style="font-size:.83rem;color:#64748b">Renseignez les moments de prise depuis la fiche médicale de chaque résident.</div>
    </div>`;
    return;
  }

  const residents = sbResidents();
  const resMap = {};
  residents.forEach(r => { resMap[String(r.id)] = r; });

  const presencesAujourdhui = (DB.get(DB.keys.presences) || {})[date] || {};

  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <div style="flex:1;min-width:180px;display:flex;align-items:center;gap:8px;background:#fff;border-radius:20px;padding:7px 14px;border:1.5px solid #e2e8f0">
      <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="width:15px;height:15px;flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="medSearchInput" type="text" placeholder="Rechercher un résident…" value="${escHtml(medSearch)}" oninput="medSetSearch(this.value)" style="border:none;outline:none;background:none;font-size:13px;color:#1e293b;width:100%;font-family:inherit"/>
    </div>
    <button onclick="medTogglePresent()" style="padding:7px 16px;border-radius:20px;border:1.5px solid ${medFilterPresent?'#16a34a':'#e2e8f0'};background:${medFilterPresent?'#f0fdf4':'#fff'};color:${medFilterPresent?'#16a34a':'#64748b'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:${medFilterPresent?'#16a34a':'#cbd5e1'};display:inline-block"></span>
      Présents seulement
    </button>
  </div>
  ${medCanEdit ? `<div style="font-size:11.5px;color:#64748b;margin:-2px 0 12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span aria-hidden="true">👆</span> Un tap = <b style="color:#16a34a">Donné</b> · appui long = plus d'options (confié, refusé, absent, reporté, note)</div>` : ''}
  <div id="medResidentList"></div>`;

  const listEl = document.getElementById('medResidentList');

  const MOMENT_STYLE = {
    matin:   { bg:'#faeeda', color:'#633806' },
    midi:    { bg:'#e6f1fb', color:'#0c447c' },
    soir:    { bg:'#eeedfe', color:'#3c3489' },
    coucher: { bg:'#f1efe8', color:'#444441' },
  };

  const momentOrder = Object.keys(MED_MOMENTS);
  const byResident = {};
  enriched.forEach(e => {
    if (!byResident[e.residentId]) byResident[e.residentId] = { name: e.residentName, items: [] };
    byResident[e.residentId].items.push(e);
  });

  let entries = Object.entries(byResident);

  if (medSearch) {
    entries = entries.filter(([, g]) => g.name.toLowerCase().includes(medSearch));
  }
  const JOURS_MED = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const dowMed = new Date(date + 'T00:00:00').getDay();
  const jourMed = JOURS_MED[dowMed];

  function isResidentPresent(residentId) {
    const manual = presencesAujourdhui[residentId];
    if (manual) return manual === 'present';
    const r = resMap[residentId];
    if (r?.planningHebdo?.[jourMed]?.actif) return false;
    return true;
  }

  if (medFilterPresent) {
    entries = entries.filter(([residentId]) => isResidentPresent(residentId));
  }

  if (!entries.length) {
    listEl.innerHTML = `<div style="background:rgba(255,255,255,.85);border-radius:16px;padding:2rem;text-align:center;font-size:13px;color:#64748b;font-style:italic">Aucun résident correspondant aux filtres.</div>`;
    return;
  }

  const momentNow = (date === today()) ? medMomentCourant() : null;

  listEl.innerHTML = entries.map(([residentId, g]) => {
    const r = resMap[String(residentId)];
    const color = safeColor(r?.color, '#2563eb');
    const av = r?.photo
      ? `<img src="${sanitizeUrl(r.photo)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid ${color}33" alt=""/>`
      : `<div class="med-avatar" style="background:${color}15;color:${color}">${initials(r?.prenom||'',r?.nom||'')}</div>`;

    // Alertes de sécurité : allergies/CI médicales, allergies alimentaires, texture
    const reg = r?.regime || {};
    const alertes = [];
    if ((r?.allergies || '').trim()) alertes.push(`⚠ ${escHtml(r.allergies)}`);
    if ((reg.allergiesAlim || '').trim()) alertes.push(`🍽 Allergie alim. : ${escHtml(reg.allergiesAlim)}`);
    if (reg.texture && reg.texture !== 'normale') alertes.push(`🥄 Texture ${escHtml(reg.texture)}`);

    const nbDonneR = g.items.filter(e => e.record?.statut === 'donne').length;

    // La bandelette d'actions de la puce ouverte (si elle appartient à ce résident)
    let strip = '';
    const cells = momentOrder.map(m => {
      const items = g.items.filter(e => e.moment === m);
      const mom = MED_MOMENTS[m];
      const mc = MOMENT_STYLE[m] || { bg:'#f1efe8', color:'#444441' };
      const isNow = momentNow === m;
      const chips = items.map(e => {
        const rec = e.record;
        const key = `${residentId}|${e.traitementId}|${e.moment}`;
        const heureLimite = MED_HEURE_LIMITE[e.moment];
        const enRetard = !rec?.statut && heureLimite != null && (date < today() || (date === today() && new Date().getHours() >= heureLimite));
        const st = rec?.statut ? MED_STATUTS[rec.statut] : null;
        let style, inner;
        if (st && ['donne','confie'].includes(rec.statut)) {
          style = `background:${st.color};border:1px solid ${st.color};color:#fff`;
          inner = `${st.icon} ${escHtml(e.medicament||'')}`;
        } else if (st) {
          style = `background:${st.color}14;border:1px solid ${st.color}55;color:${st.color}`;
          inner = `${st.icon} ${escHtml(e.medicament||'')}`;
        } else if (enRetard) {
          style = `background:#fef2f2;border:1.5px solid #dc2626;color:#dc2626`;
          inner = `⚠ ${escHtml(e.medicament||'')}`;
        } else {
          style = `background:#fff;border:1px solid #cbd5e1;color:#334155`;
          inner = escHtml(e.medicament||'');
        }
        const obs = rec?.observation ? ' 📝' : '';
        const sel = _medOpenChip === key ? ';box-shadow:0 0 0 3px rgba(79,70,229,.35)' : '';
        const tip = `${escAttr(e.medicament||'')}${e.posologie ? ' — ' + escAttr(e.posologie) : ''}${rec?.heure ? ' — ' + medHeure(rec.heure) : ''}${rec?.auteur ? ' — ' + escAttr(rec.auteur) : ''}${rec?.observation ? ' — 📝 ' + escAttr(rec.observation) : ''}`;
        if (_medOpenChip === key && medCanEdit) {
          const btn = (k, v) => `<button class="plr-act${rec?.statut === k ? ' on' : ''}" style="${rec?.statut === k ? `background:${v.color};border-color:${v.color};color:#fff` : `color:${v.color}`}" onclick="event.stopPropagation();${k === 'refuse' ? `setMedStatutRefuse('${date}','${residentId}','${e.traitementId}','${e.moment}')` : `setMedStatut('${date}','${residentId}','${e.traitementId}','${e.moment}','${k}')`}">${v.icon} ${v.label}</button>`;
          strip = `<div class="plr-strip">
            <span style="font-size:.72rem;font-weight:700;color:#0f2b4a;flex-shrink:0">${mom.icon} ${escHtml(e.medicament||'')}${e.posologie ? ` <span style="font-weight:500;color:#64748b">· ${escHtml(e.posologie)}</span>` : ''}</span>
            ${Object.entries(MED_STATUTS).map(([k, v]) => btn(k, v)).join('')}
            <button class="plr-act" style="color:#6d28d9" onclick="event.stopPropagation();openMedNote('${date}','${residentId}','${e.traitementId}','${e.moment}')">📝 Note</button>
            <button class="plr-act" style="color:#94a3b8" onclick="event.stopPropagation();medToggleChip('${key}')">Fermer</button>
          </div>`;
        }
        const handlers = medCanEdit
          ? ` onpointerdown="medChipDown(event,'${key}')" onpointerup="medChipUp()" onpointerleave="medChipUp()" onclick="medChipClick('${date}','${residentId}','${e.traitementId}','${e.moment}')"`
          : '';
        return `<button type="button" class="plr-chip" style="${style}${sel}" title="${tip}"${handlers}${medCanEdit ? '' : ' disabled'}>${inner}${obs}</button>`;
      }).join('');
      return `<div class="plr-cell${isNow ? ' now' : ''}">
        <div class="plr-mom" style="${isNow ? 'color:#4f46e5' : `color:${mc.color}`}">${mom.icon} ${mom.label.toUpperCase()}${isNow ? ' ←' : ''}</div>
        ${chips || '<div class="plr-vide">—</div>'}
      </div>`;
    }).join('');

    const planningJourMed = r?.planningHebdo?.[jourMed];
    const planningTag = planningJourMed?.actif
      ? `<span style="font-size:11px;color:#0369a1;background:#e0f2fe;border-radius:5px;padding:2px 7px;font-weight:600">📅 ${escHtml(planningJourMed.label||'Absent')}${planningJourMed.debut?' · '+planningJourMed.debut:''}</span>`
      : '';

    return `<div class="med-patient-section">
      <div class="med-patient-header">
        ${av}
        <div style="flex:1;min-width:0">
          <a href="resident.html?id=${residentId}" style="text-decoration:none"><div class="med-patient-name">${escHtml(g.name)}</div></a>
          ${alertes.length ? `<div style="font-size:11px;font-weight:600;color:#dc2626;margin-top:1px">${alertes.join(' · ')}</div>` : ''}
          ${planningTag}
        </div>
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;flex-shrink:0;${nbDonneR === g.items.length ? 'color:#15803d;background:#f0fdf4;border:1px solid #dcfce7' : 'color:#475569;background:#f8fafc;border:1px solid #e2e8f0'}">${nbDonneR}/${g.items.length} données</span>
      </div>
      <div class="plr-grid">${cells}</div>
      ${strip}
    </div>`;
  }).join('');
}

function medRow(date, e) {
  const mom = MED_MOMENTS[e.moment] || {};
  const r = e.record;
  const st = r?.statut ? MED_STATUTS[r.statut] : null;
  return `<div style="display:flex;align-items:center;gap:.7rem;padding:.6rem .85rem;border-bottom:1px solid var(--border);flex-wrap:wrap">
    <span style="font-size:1.1rem;width:28px;text-align:center" title="${escHtml(mom.label || e.moment)}">${mom.icon || ''}</span>
    <div style="flex:1;min-width:160px">
      <div style="font-weight:600;font-size:.83rem">${escHtml(e.medicament || '')}</div>
      <div style="font-size:.72rem;color:var(--muted)">${escHtml(mom.label || e.moment)}${e.posologie ? ' · ' + escHtml(e.posologie) : ''}${r?.heure ? ' · ' + medHeure(r.heure) : ''}${r?.auteur ? ' · ' + escHtml(r.auteur) : ''}</div>
      ${r?.observation ? `<div style="font-size:.72rem;color:var(--muted);margin-top:1px">📝 ${escHtml(r.observation)}</div>` : ''}
    </div>
    ${medCanEdit ? `<div class="no-print" style="display:flex;gap:.25rem;flex-wrap:wrap">
      ${Object.entries(MED_STATUTS).map(([k, v]) => `<button class="btn btn-sm ${r?.statut === k ? 'btn-primary' : 'btn-ghost'}" style="${r?.statut === k ? `background:${v.color};border-color:${v.color}` : ''}" title="${v.label}" onclick="setMedStatut('${date}','${e.residentId}','${e.traitementId}','${e.moment}','${k}')">${v.icon}</button>`).join('')}
      <button class="btn btn-ghost btn-sm" title="Observation" onclick="openMedNote('${date}','${e.residentId}','${e.traitementId}','${e.moment}')">📝</button>
    </div>` : st ? `<span class="badge" style="background:${st.color}1a;color:${st.color}">${st.icon} ${st.label}</span>` : '<span class="badge badge-gray">En attente</span>'}
  </div>`;
}

async function setMedStatut(date, residentId, traitementId, moment, statut) {
  if (!medCanEdit) return;
  const list = getMedDistrib();
  const keyMatch = x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment;
  const session = Auth.getSession();
  const auteur = [session?.prenom, session?.nom].filter(Boolean).join(' ') || session?.username || '';
  const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
  const i = list.findIndex(keyMatch);

  // Mise à jour optimiste (synchrone). On mute TOUJOURS le même objet et on
  // capture sa référence pour l'écriture : ainsi des taps rapides (insertion
  // puis suppression) réconcilient le bon id une fois les écritures sérialisées.
  let rec, op;
  if (i >= 0 && list[i].statut === statut) {
    rec = list[i]; op = 'delete';
    list.splice(i, 1); // re-tap sur le même statut → réinitialise
  } else if (i >= 0) {
    rec = list[i]; op = 'save';
    rec.statut = statut; rec.heure = new Date().toISOString(); rec.auteur = auteur;
  } else if (prevue) {
    rec = { date, residentId, residentName: prevue.residentName, traitementId, medicament: prevue.medicament, posologie: prevue.posologie, moment, statut, heure: new Date().toISOString(), auteur, observation: '' };
    op = 'save';
    list.push(rec);
  } else {
    return; // rien de prévu pour cette case
  }
  renderMedicaments();
  if (typeof auditLog === 'function' && prevue) auditLog('med_distrib', `${prevue.medicament} (${MED_MOMENTS[moment]?.label || moment}) — ${prevue.residentName} → ${op === 'delete' ? 'réinitialisé' : (MED_STATUTS[statut]?.label || statut)}`);

  await medQueueWrite(async () => {
    if (op === 'delete') {
      if (rec.id) await sbDeleteMedDistrib(rec.id); // sans id = jamais persisté → rien à supprimer
    } else {
      const saved = await sbSaveMedDistrib(rec); // update si rec.id (posé par une insertion antérieure de la file), sinon insert
      Object.assign(rec, saved);
    }
  });
}

async function setMedStatutRefuse(date, residentId, traitementId, moment) {
  const list = getMedDistrib();
  const rec = list.find(x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment);
  if (rec?.statut === 'refuse') {
    // re-clic → réinitialise sans ouvrir le modal
    await setMedStatut(date, residentId, traitementId, moment, 'refuse');
    return;
  }
  await setMedStatut(date, residentId, traitementId, moment, 'refuse');
  openMedNote(date, residentId, traitementId, moment);
}

function openMedNote(date, residentId, traitementId, moment) {
  medNoteCtx = { date, residentId, traitementId, moment };
  const r = medRecord(date, residentId, traitementId, moment);
  document.getElementById('mnTexte').value = r?.observation || '';
  openModal('modalMedNote');
}

async function saveMedNote() {
  const { date, residentId, traitementId, moment } = medNoteCtx;
  const observation = document.getElementById('mnTexte').value.trim();
  const list = getMedDistrib();
  const keyMatch = x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment;
  let rec = list.find(keyMatch);
  if (rec) {
    rec.observation = observation; // mutation en place (récupère l'id d'une insertion antérieure de la file)
  } else {
    const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
    if (!prevue) { closeModal('modalMedNote'); return; }
    const session = Auth.getSession();
    const auteur = [session?.prenom, session?.nom].filter(Boolean).join(' ') || session?.username || '';
    rec = { date, residentId, residentName: prevue.residentName, traitementId, medicament: prevue.medicament, posologie: prevue.posologie, moment, statut: '', heure: '', auteur, observation };
    list.push(rec);
  }
  closeModal('modalMedNote');
  renderMedicaments();
  await medQueueWrite(async () => {
    const saved = await sbSaveMedDistrib(rec);
    Object.assign(rec, saved);
  });
}

// ── IMPRESSION ──
function printMedSheet() {
  const date = document.getElementById('medDate').value || today();
  const prevues = medPrevues(date);
  if (!prevues.length) { toast('Aucun traitement à distribuer pour cette date', 'error'); return; }
  const records = getMedDistrib();
  const settings = DB.get(DB.keys.settings) || {};
  const w = window.open('', '_blank');
  if (!w) { toast('Autorisez les fenêtres pop-up pour imprimer', 'error'); return; }
  const momentOrder = Object.keys(MED_MOMENTS);
  const sorted = [...prevues].sort((a, b) => a.residentName.localeCompare(b.residentName, 'fr') || momentOrder.indexOf(a.moment) - momentOrder.indexOf(b.moment));
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Feuille de distribution — ${formatDate(date)}</title>
    <style>
      body{font-family:'Inter','Segoe UI',sans-serif;max-width:1000px;margin:1.5rem auto;padding:0 1.5rem;color:#1e293b;font-size:9pt;line-height:1.5}
      h1{font-size:15pt;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding-bottom:.3rem}
      .meta{color:#64748b;font-size:9pt;margin-bottom:1.2rem}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;font-size:7.5pt;text-transform:uppercase;letter-spacing:.04em;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding:.3rem .4rem}
      td{padding:.4rem;border-bottom:1px solid #e2e8f0;font-size:8.5pt;vertical-align:top}
      @page{margin:1.5cm;size:landscape}
    </style></head><body>
    <h1>Feuille de distribution des médicaments</h1>
    <div class="meta">${escHtml(settings.etablissement || 'Établissement')} · ${formatDate(date)} · ${sorted.length} prise(s) prévue(s)</div>
    <table><thead><tr><th>Résident</th><th>Moment</th><th>Médicament</th><th>Posologie</th><th>Statut</th><th>Heure</th><th>Observation</th><th>Signature</th></tr></thead>
    <tbody>${sorted.map(p => {
      const r = records.find(x => x.date === date && String(x.residentId) === String(p.residentId) && x.traitementId === p.traitementId && x.moment === p.moment);
      const st = r?.statut ? MED_STATUTS[r.statut] : null;
      return `<tr>
        <td>${escHtml(p.residentName)}</td>
        <td>${MED_MOMENTS[p.moment]?.icon || ''} ${MED_MOMENTS[p.moment]?.label || p.moment}</td>
        <td>${escHtml(p.medicament || '')}</td>
        <td>${escHtml(p.posologie || '')}</td>
        <td>${st ? st.label : '—'}</td>
        <td>${r?.heure ? medHeure(r.heure) : ''}</td>
        <td>${escHtml(r?.observation || '')}</td>
        <td></td>
      </tr>`;
    }).join('')}</tbody></table>
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── INIT ──
async function initMedicaments() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_medicaments')) return;
  await sbLoadResidentsCache();
  await loadMedCache();
  medCanEdit = ((typeof canEditResidents === 'function') ? canEditResidents(s.userId) : false) || Auth.isAdmin();
  const dateInput = document.getElementById('medDate');
  dateInput.value = today();
  dateInput.addEventListener('change', renderMedicaments);
  renderMedicaments();
}
document.addEventListener('DOMContentLoaded', initMedicaments);
