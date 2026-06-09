let selectedEntryId = null;
let filterUnread = false;

function toggleUnreadFilter() {
  filterUnread = !filterUnread;
  const btn = document.getElementById('btnUnreadFilter');
  if (btn) btn.style.background = filterUnread ? 'rgba(59,130,246,.12)' : '';
  renderEntries();
}

function updateUnreadBadge() {
  const session = Auth.getSession();
  if (!session) return;
  const entries = DB.get(DB.keys.journal) || [];
  const count = entries.filter(e => !e.readBy || !e.readBy.includes(session.userId)).length;
  const el = document.getElementById('unreadCount');
  const dot = document.getElementById('unreadDot');
  if (el) { el.textContent = count; el.style.display = count > 0 ? '' : 'none'; }
  if (dot) dot.style.display = count > 0 ? '' : 'none';
}

function showJournalList() {
  document.getElementById('journalListView').style.display = '';
  document.getElementById('journalFormView').style.display = 'none';
}

function showNewEntryForm() {
  selectedEntryId = null;
  inlineAttachments = [];
  renderEntryForm();
  document.getElementById('journalListView').style.display = 'none';
  document.getElementById('journalFormView').style.display = '';
}

function populateSelects() {
  const residents = (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti');
  const cats = DB.get(DB.keys.categories) || [];
  const objs = DB.get(DB.keys.objectives) || [];

  const rSel = document.getElementById('eResident');
  const rFilter = document.getElementById('jFilterResident');
  residents.forEach(r => {
    const name = `${r.prenom || ''} ${r.nom || ''}`.trim();
    [rSel, rFilter].forEach(sel => { const o = document.createElement('option'); o.value = r.id; o.textContent = name; sel.appendChild(o); });
  });

  const cSel = document.getElementById('eCategorie');
  const cFilter = document.getElementById('jFilterCat');
  cats.forEach(c => {
    [cSel, cFilter].forEach(sel => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o); });
  });

  const oSel = document.getElementById('eObjectif');
  objs.forEach(o => { const opt = document.createElement('option'); opt.value = o.id; opt.textContent = o.name; oSel.appendChild(opt); });
}

function renderEntryForm() {
  const residents = (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti');
  const cats = DB.get(DB.keys.categories) || [];
  const currentCat = document.getElementById('iCategorie')?.value || '';
  const currentRes = (document.getElementById('iResident')?.value || '').split(',').filter(Boolean);
  const currentDate = document.getElementById('iDate')?.value || new Date().toISOString().slice(0,16);
  const currentContenu = document.getElementById('iContenu')?.value || '';
  const currentObjectif = document.getElementById('iObjectif')?.value || '';
  const currentVis = document.querySelector('input[name="iVisibilite"]:checked')?.value || 'equipe';

  function pillStyle(isActive, color) {
    return isActive ? `style="--pill-bg:${color || 'var(--accent)'}22;--pill-color:${color || 'var(--accent)'};--pill-border:${color || 'var(--accent)'}"` : '';
  }

  const html = `
    <div class="entry-form-design">
      <input type="hidden" id="iCategorie" value="${currentCat}"/>
      <input type="hidden" id="iResident" value="${currentRes.join(',')}"/>
      <input type="hidden" id="iObjectif" value="${currentObjectif}"/>
      <input type="hidden" id="iPeriode" value=""/>
      <div class="form-step">
        <div class="step-h"><span class="step-n">1</span><span class="step-t">Catégorie</span></div>
        <div class="step-b">
          <div class="pill-group">
            ${cats.length ? cats.map(c => {
              const isActive = currentCat === c.id;
              return `<div class="pill cat-pill${isActive?' active':''}" data-id="${c.id}" ${pillStyle(isActive, c.color)} onclick="selectCatPill('${c.id}')">${escHtml(c.name)}</div>`;
            }).join('') : '<span class="pill-empty">Aucune catégorie — définissez-en dans Admin</span>'}
          </div>
        </div>
      </div>
      <div class="form-step">
        <div class="step-h"><span class="step-n">2</span><span class="step-t">Résident(s) concerné(s)</span></div>
        <div class="step-b">
          <div style="position:relative;margin-bottom:.5rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="residentSearch" placeholder="Rechercher un résident…" oninput="filterResidentPills()" style="width:100%;padding:.45rem .45rem .45rem 32px;border:1.5px solid var(--border);border-radius:var(--r-full);font-size:.78rem;outline:none;background:var(--g50);color:var(--text);transition:border-color var(--t)"/>
          </div>
          <div class="pill-group" style="flex-wrap:wrap;max-height:170px;overflow-y:auto" id="residentPillGroup">
            ${residents.map(r => {
              const name = `${r.prenom || ''} ${r.nom || ''}`.trim();
              const isActive = currentRes.includes(r.id);
              return `<div class="pill resident-pill${isActive?' active':''}" data-id="${r.id}" ${pillStyle(isActive, r.color)} onclick="selectResidentPill('${r.id}')">${escHtml(name)}</div>`;
            }).join('')}
          </div>
          ${currentRes.length > 0 ? `<div style="font-size:.72rem;color:var(--muted);margin-top:.5rem">${currentRes.length} résident${currentRes.length>1?'s':''} sélectionné${currentRes.length>1?'s':''}</div>` : ''}
        </div>
      </div>
      <div class="form-step">
        <div class="step-h"><span class="step-n">3</span><span class="step-t">Contenu</span></div>
        <div class="step-b">
          <input type="datetime-local" id="iDate" class="form-control" value="${currentDate}" style="max-width:280px;margin-bottom:.5rem"/>
          <div class="ai-bar">
            <button class="btn btn-ghost btn-sm" onclick="aiAssistJournalInline('redaction')">✍ Rédiger</button>
            <button class="btn btn-ghost btn-sm" onclick="aiAssistJournalInline('correction')">✓ Corriger</button>
            <button class="btn btn-ghost btn-sm" onclick="aiAssistJournalInline('reformulation')">🏛 Reformuler</button>
          </div>
          <textarea id="iContenu" class="form-control" rows="5" placeholder="Décrivez l'événement, l'observation ou l'intervention…">${escHtml(currentContenu)}</textarea>
        </div>
      </div>
      <div class="form-step">
        <div class="step-h"><span class="step-n">4</span><span class="step-t">Visibilité</span></div>
        <div class="step-b">
          <div class="pill-group">
            <div class="pill vis-pill${currentVis==='equipe'?' active':''}" data-vis="equipe" onclick="selectVisPill('equipe')">Équipe uniquement</div>
            <div class="pill vis-pill${currentVis==='tous'?' active':''}" data-vis="tous" onclick="selectVisPill('tous')">Tous</div>
            <div class="pill vis-pill${currentVis==='confidentiel'?' active':''}" data-vis="confidentiel" onclick="selectVisPill('confidentiel')">Confidentiel</div>
          </div>
          <div class="vis-radios">
            <input type="radio" name="iVisibilite" value="equipe" ${currentVis==='equipe'?'checked':''}/>
            <input type="radio" name="iVisibilite" value="tous" ${currentVis==='tous'?'checked':''}/>
            <input type="radio" name="iVisibilite" value="confidentiel" ${currentVis==='confidentiel'?'checked':''}/>
          </div>
        </div>
      </div>
      <div class="form-step">
        <div class="step-h"><span class="step-n">5</span><span class="step-t">Pièces jointes <span style="font-weight:400;color:var(--muted)">(optionnel)</span></span></div>
        <div class="step-b">
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">📎 Ajouter un fichier
            <input type="file" accept="image/*,application/pdf" style="display:none" onchange="addInlineAttachment(this)"/>
          </label>
          <div id="inlineAttachList" style="display:flex;flex-direction:column;gap:.35rem;margin-top:.5rem"></div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveInlineEntry()" style="margin-top:1rem">Enregistrer l'entrée</button>
    </div>`;
  document.getElementById('entryFormContainer').innerHTML = html;
  renderInlineAttachList();
}

function selectCatPill(id) {
  const hid = document.getElementById('iCategorie');
  hid.value = hid.value === id ? '' : id;
  document.querySelectorAll('.cat-pill').forEach(el => {
    const on = el.dataset.id === hid.value;
    el.classList.toggle('active', on);
    if (on) { const c = (DB.get(DB.keys.categories)||[]).find(x=>String(x.id)===String(hid.value)); if(c){el.style.setProperty('--pill-bg',c.color+'22');el.style.setProperty('--pill-color',c.color);el.style.setProperty('--pill-border',c.color)} }
    else { el.style.removeProperty('--pill-bg');el.style.removeProperty('--pill-color');el.style.removeProperty('--pill-border') }
  });
}

function selectResidentPill(id) {
  const hid = document.getElementById('iResident');
  let ids = hid.value ? hid.value.split(',').filter(Boolean) : [];
  const idx = ids.indexOf(id);
  if (idx >= 0) ids.splice(idx, 1);
  else ids.push(id);
  hid.value = ids.join(',');
  document.querySelectorAll('.resident-pill').forEach(el => {
    const on = ids.includes(el.dataset.id);
    el.classList.toggle('active', on);
    if (on) { const r = (DB.get(DB.keys.residents)||[]).find(x=>x.id===el.dataset.id); if(r){el.style.setProperty('--pill-bg',(r.color||'var(--blue)')+'22');el.style.setProperty('--pill-color',r.color||'var(--blue)');el.style.setProperty('--pill-border',r.color||'var(--blue)')} }
    else { el.style.removeProperty('--pill-bg');el.style.removeProperty('--pill-color');el.style.removeProperty('--pill-border') }
  });
  updateResidentCount(ids.length);
}

function updateResidentCount(count) {
  const step = document.querySelectorAll('.entry-form-design > .form-step')[1];
  if (!step) return;
  const body = step.querySelector('.step-b');
  let el = body.querySelector('.resident-count');
  if (count > 0) {
    if (!el) { el = document.createElement('div'); el.className = 'resident-count'; el.style.cssText = 'font-size:.72rem;color:var(--muted);margin-top:.5rem'; body.appendChild(el); }
    el.textContent = count + ' résident' + (count>1?'s':'') + ' sélectionné' + (count>1?'s':'');
  } else {
    if (el) el.remove();
  }
}

function filterResidentPills() {
  const q = (document.getElementById('residentSearch')?.value || '').toLowerCase();
  document.querySelectorAll('.resident-pill').forEach(el => {
    el.style.display = !q || el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function selectVisPill(vis) {
  const radio = document.querySelector('input[name="iVisibilite"][value="'+vis+'"]');
  if (radio) radio.checked = true;
  document.querySelectorAll('.vis-pill').forEach(el => el.classList.toggle('active', el.dataset.vis === vis));
}

function saveInlineEntry() {
  const session = Auth.getSession();
  const userName = session ? [session.prenom, session.nom].filter(Boolean).join(' ') || session.username : 'Utilisateur';
  const residentIds = document.getElementById('iResident').value ? document.getElementById('iResident').value.split(',').filter(Boolean) : [];
  const contenu = document.getElementById('iContenu').value.trim();
  if (!residentIds.length) { toast('Sélectionnez au moins un résident', 'error'); return; }
  if (!contenu) { toast('Le contenu est requis', 'error'); return; }
  const residents = DB.get(DB.keys.residents) || [];
  const visEl = document.querySelector('input[name="iVisibilite"]:checked');
  const entries = DB.get(DB.keys.journal) || [];
  // Détection de doublon : même résident, < 3h, contenu très similaire
  const candDate = document.getElementById('iDate').value || new Date().toISOString();
  for (const residentId of residentIds) {
    const dup = findJournalDuplicate({ residentId, contenu, date: candDate }, entries);
    if (dup) {
      const e = dup.entry;
      const extrait = (e.contenu || '').slice(0, 140) + ((e.contenu || '').length > 140 ? '…' : '');
      if (!confirm(`⚠️ Doublon possible pour ${e.resident || 'ce résident'} :\n\n« ${extrait} »\n${formatDateTime(e.date)} · ${getJournalAuthor ? getJournalAuthor(e) : (e.author || '')}\n\nEnregistrer quand même cette transmission ?`)) return;
      break;
    }
  }
  for (const residentId of residentIds) {
    const res = residents.find(r => r.id === residentId);
    entries.push({
      id: genId(),
      type: 'observation',
      residentId,
      resident: res ? `${res.prenom||''} ${res.nom||''}`.trim() : '',
      residentColor: res?.color || 'var(--blue)',
      categorie: document.getElementById('iCategorie').value,
      date: document.getElementById('iDate').value || new Date().toISOString(),
      objectif: document.getElementById('iObjectif').value,
      contenu, visibilite: visEl?.value || 'equipe',
      attachments: inlineAttachments.slice(),
      author: userName, authorId: session?.userId,
      replies: [], readBy: [session?.userId],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
  }
  DB.set(DB.keys.journal, entries);
  inlineAttachments = [];
  if (typeof auditLog === 'function') auditLog('journal_create', `${residentIds.length} entrée(s) pour ${entries.slice(-residentIds.length).map(e=>e.resident).join(', ')}`);
  toast(residentIds.length + ' entrée' + (residentIds.length>1?'s':'') + ' ajoutée' + (residentIds.length>1?'s':'') + ' ✓');
  showJournalList();
  renderEntries();
}

async function aiAssistJournalInline(action) {
  const ta = document.getElementById('iContenu');
  if (!ta) return;
  const current = ta.value || '';
  const residentIds = (document.getElementById('iResident')?.value || '').split(',').filter(Boolean);
  const residents = DB.get(DB.keys.residents) || [];
  const firstRes = residents.find(r => r.id === residentIds[0]);
  const residentName = firstRes ? `${firstRes.prenom||''} ${firstRes.nom||''}`.trim() : (residentIds.length > 1 ? 'plusieurs résidents' : '');
  const hasKey = !!getAiKey();
  const labels = { redaction: 'Rédaction', correction: 'Correction', reformulation: 'Reformulation' };
  if (hasKey) {
    const customSystem = getAiPrompt('journal', action);
    let system = '', prompt = '';
    if (action === 'redaction') {
      system = customSystem || 'Tu es un éducateur rédigeant une observation. Écris en français, professionnel et factuel.';
      prompt = `Rédige une courte observation${residentName ? ' pour ' + residentName : ''}.` + (current ? '\n\nTexte à compléter :\n' + current : '');
    } else if (action === 'correction') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Corrige les fautes sans changer le style.';
      prompt = 'Corrige :\n\n' + current;
    } else if (action === 'reformulation') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Reformule de manière professionnelle.';
      prompt = 'Reformule :\n\n' + current;
    }
    const result = await callMistral(prompt, system);
    if (result) { ta.value = result; toast('✓ ' + labels[action], 'success'); return; }
    toast('API indisponible, mode local', 'warning');
  }
  let result = '';
  if (action === 'redaction') {
    const tpl = ['Observation : le résident a participé activement.','Suivi : bonne intégration et interactions positives.','Point d\'étape : autonomie croissante.'];
    result = current ? current + '\n\n' + tpl[Math.floor(Math.random()*tpl.length)] : tpl[Math.floor(Math.random()*tpl.length)];
  } else if (action === 'correction') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current.replace(/\bils on\b/g,'ils ont').replace(/\bil a étais\b/g,'il a été');
  } else if (action === 'reformulation') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current.replace(/\bgère\b/g,'assure la gestion de').replace(/\bveut\b/g,'souhaite');
  }
  if (result) { ta.value = result; toast('✓ ' + labels[action] + ' (local)', 'success'); }
}

function getEntries() {
  const session = Auth.getSession();
  const q = (document.getElementById('jSearch')?.value || '').toLowerCase();
  const res = document.getElementById('jFilterResident')?.value || '';
  const cat = document.getElementById('jFilterCat')?.value || '';
  const dateFrom = document.getElementById('jFilterDate')?.value || '';
  const dateTo = document.getElementById('jFilterDateEnd')?.value || '';
  let list = (DB.get(DB.keys.journal) || []).slice().reverse();
  // Filtrer selon la visibilité : confidentiel → uniquement admin ou auteur
  const isAdmin = session?.role === 'admin';
  list = list.filter(e => {
    if (e.visibilite !== 'confidentiel') return true;
    return isAdmin || String(e.authorId) === String(session?.userId);
  });
  if (q) list = list.filter(e =>
    (e.contenu  || '').toLowerCase().includes(q) ||
    (e.resident || '').toLowerCase().includes(q) ||
    (e.author   || '').toLowerCase().includes(q)
  );
  if (res) list = list.filter(e => e.residentId === res);
  if (cat) list = list.filter(e => String(e.categorie) === String(cat));
  if (dateFrom) list = list.filter(e => e.date && e.date.slice(0,10) >= dateFrom);
  if (dateTo) list = list.filter(e => e.date && e.date.slice(0,10) <= dateTo);
  if (filterUnread && session) list = list.filter(e => !e.readBy || !e.readBy.includes(session.userId));
  return list;
}

function renderEntries() {
  const list = getEntries();
  const el = document.getElementById('entriesList');
  const cats = DB.get(DB.keys.categories) || [];
  const journalResidents = DB.get(DB.keys.residents) || [];
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><h3>Aucune entrée</h3><p>Commencez à documenter les événements.</p></div>`;
    return;
  }
  updateUnreadBadge();
  const session = Auth.getSession();
  el.innerHTML = list.map(e => {
    const cat = cats.find(c => String(c.id) === String(e.categorie));
    const jRes = journalResidents.find(r => r.id === e.residentId);
    const isSelected = e.id === selectedEntryId;
    const isUnread = session && (!e.readBy || !e.readBy.includes(session.userId));
    const expandedSection = isSelected ? `
      <div onclick="event.stopPropagation()" style="margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border)">
        <p style="font-size:.88rem;line-height:1.8;white-space:pre-wrap;color:var(--text);margin-bottom:.5rem">${escHtml(e.contenu)||''}</p>
        ${e.editedAt ? `<div style="font-size:.7rem;color:var(--muted);margin-bottom:.6rem;font-style:italic">✎ Modifié par ${escHtml(e.editedBy||'?')} le ${formatDateTime(e.editedAt)}${(e.editHistory&&e.editHistory.length)?` · <a href="#" onclick="event.preventDefault();event.stopPropagation();showEditHistory('${e.id}')" style="color:var(--accent)">historique (${e.editHistory.length})</a>`:''}</div>` : ''}
        ${renderEntryAttachments(e)}
        ${renderReplies(e)}
        <div style="display:flex;gap:.5rem;align-items:flex-end;margin-top:.75rem">
          <textarea id="replyContent_${e.id}" rows="2" class="form-control" style="flex:1;font-size:.82rem;resize:vertical" placeholder="Écrire une réponse…"></textarea>
          <button class="btn btn-primary btn-sm" style="align-self:flex-end;flex-shrink:0" onclick="addReply('${e.id}')">Envoyer</button>
        </div>
        <div style="display:flex;gap:.4rem;justify-content:flex-end;margin-top:.5rem">
          <button class="btn btn-ghost btn-sm" onclick="editEntry('${e.id}')">Modifier</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteEntryById('${e.id}')">Supprimer</button>
        </div>
      </div>` : '';
    return `<div class="entry-card ${isSelected ? 'selected' : ''}" style="${isUnread && !isSelected ? 'box-shadow:0 0 0 3px #3b82f6;border-color:#3b82f6;background:#eff6ff;' : ''}" onclick="selectEntry('${e.id}')">
      <div class="entry-header">
        ${jRes?.photo?`<img src="${jRes.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`:`<div class="avatar sm" style="background:${e.residentColor||'var(--blue)'};flex-shrink:0">${(escHtml(e.resident)||'?')[0].toUpperCase()}</div>`}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
            ${isUnread ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--blue);flex-shrink:0;display:inline-block"></span>' : ''}
            <span style="font-weight:${isUnread ? '800' : '700'};font-size:.875rem">${escHtml(e.resident)||'—'}</span>
            ${cat ? `<span class="badge" style="background:${cat.color}22;color:${cat.color}">${escHtml(cat.name)}</span>` : ''}
            ${e.visibilite === 'confidentiel' ? '<span class="badge badge-red">Confidentiel</span>' : ''}
          </div>
          <div class="entry-meta">${formatDateTime(e.date)} · <span style="font-weight:500;background:${getAuthorColor(e)}18;color:${getAuthorColor(e)};padding:1px 8px;border-radius:10px;font-size:.75rem">${escHtml(getJournalAuthor(e))}</span></div>
        </div>
      </div>
      ${!isSelected && !isUnread ? `<div class="entry-preview">${escHtml(e.contenu)||''}</div>` : ''}
      ${!isSelected && isUnread ? `<div style="font-size:.78rem;color:var(--muted);margin-top:.5rem;font-style:italic">Cliquez pour lire</div>` : ''}
      ${!isSelected && !isUnread && (e.replies||[]).length ? `<div style="font-size:.7rem;color:var(--blue);margin-top:.4rem;font-weight:600">💬 ${e.replies.length} réponse${e.replies.length>1?'s':''}</div>` : ''}
      ${expandedSection}
    </div>`;
  }).join('');
}

function renderReplies(e) {
  const replies = e.replies || [];
  if (!replies.length) return '';
  return `<div style="margin-top:1.25rem;border-top:1px solid var(--border);padding-top:1rem">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.75rem">Réponses (${replies.length})</div>
    ${replies.map(r => `
      <div style="display:flex;gap:.6rem;padding:.6rem .75rem;background:var(--g50);border-radius:var(--r-sm);margin-bottom:.5rem;border:1px solid var(--border)">
        <div class="avatar sm" style="background:var(--accent);flex-shrink:0;width:24px;height:24px;font-size:.55rem">${(escHtml(r.author)||'?')[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
            <span style="font-weight:700;font-size:.78rem">${escHtml(r.author)}</span>
            <span style="font-size:.65rem;color:var(--muted)">${formatDateTime(r.createdAt)}</span>
          </div>
          <p style="font-size:.82rem;line-height:1.6;margin-top:3px;white-space:pre-wrap">${escHtml(r.content)}</p>
        </div>
      </div>`).join('')}
  </div>`;
}

// ── Historique des modifications ──
function showEditHistory(id) {
  const e = (DB.get(DB.keys.journal) || []).find(x => x.id === id);
  if (!e || !e.editHistory) return;
  const lines = e.editHistory.slice().reverse().map(h =>
    `• ${formatDateTime(h.at)} — ${h.by || '?'}\n   Ancien contenu : « ${(h.contenu || '').slice(0, 200)}${(h.contenu || '').length > 200 ? '…' : ''} »`
  ).join('\n\n');
  alert(`Historique des modifications\n\n${lines}`);
}

// ── Pièces jointes ──
let inlineAttachments = [];

function renderInlineAttachList() {
  const box = document.getElementById('inlineAttachList');
  if (!box) return;
  box.innerHTML = inlineAttachments.length ? inlineAttachments.map(a => `
    <div style="display:flex;align-items:center;gap:.5rem;padding:.35rem .5rem;background:var(--g50);border:1px solid var(--border);border-radius:var(--r-sm);font-size:.78rem">
      <span>${a.type && a.type.includes('image') ? '🖼️' : '📎'}</span>
      <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(a.name)}</span>
      <button class="btn btn-ghost btn-sm" style="color:var(--red);padding:0 .4rem" onclick="removeInlineAttachment('${a.id}')">✕</button>
    </div>`).join('') : '';
}

async function addInlineAttachment(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { toast('Fichier trop lourd (max 3 Mo)', 'error'); input.value = ''; return; }
  try {
    const data = await fileToBase64(file);
    inlineAttachments.push({ id: genId(), name: file.name, type: file.type, size: file.size, data });
    renderInlineAttachList();
  } catch (e) { toast('Erreur de chargement', 'error'); }
  input.value = '';
}

function removeInlineAttachment(id) {
  inlineAttachments = inlineAttachments.filter(a => a.id !== id);
  renderInlineAttachList();
}

function renderEntryAttachments(e) {
  const atts = e.attachments || [];
  if (!atts.length) return '';
  return `<div style="margin-bottom:.75rem">
    <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:.4rem">📎 Pièces jointes (${atts.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:.5rem">
      ${atts.map(a => a.type && a.type.includes('image')
        ? `<a href="${a.data}" download="${escHtml(a.name)}" title="${escHtml(a.name)}"><img src="${a.data}" style="width:64px;height:64px;object-fit:cover;border-radius:var(--r-sm);border:1px solid var(--border)"/></a>`
        : `<a href="${a.data}" download="${escHtml(a.name)}" style="display:flex;align-items:center;gap:.4rem;padding:.4rem .6rem;background:var(--g50);border:1px solid var(--border);border-radius:var(--r-sm);font-size:.78rem;text-decoration:none;color:var(--g700)">📎 ${escHtml(a.name)}</a>`
      ).join('')}
    </div>
  </div>`;
}

function selectEntry(id) {
  // Toggle: cliquer à nouveau ferme la carte
  if (selectedEntryId === id) { selectedEntryId = null; renderEntries(); return; }
  selectedEntryId = id;

  // Mark as read
  const session = Auth.getSession();
  let entries = DB.get(DB.keys.journal) || [];
  const eIdx = entries.findIndex(x => x.id === id);
  if (eIdx === -1) return;
  const e = entries[eIdx];
  if (session && (!e.readBy || !e.readBy.includes(session.userId))) {
    if (!e.readBy) e.readBy = [];
    e.readBy.push(session.userId);
    entries[eIdx] = e;
    DB.set(DB.keys.journal, entries);
  }

  renderEntries();
  setTimeout(() => {
    const el = document.querySelector('.entry-card.selected');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

function addReply(entryId) {
  const content = document.getElementById('replyContent_'+entryId)?.value?.trim();
  if (!content) { toast('Écrivez une réponse', 'error'); return; }
  const session = Auth.getSession();
  const userName = session ? [session.prenom, session.nom].filter(Boolean).join(' ') || session.username : 'Utilisateur';
  let entries = DB.get(DB.keys.journal) || [];
  entries = entries.map(e => {
    if (e.id !== entryId) return e;
    const replies = e.replies || [];
    replies.push({
      id: genId(),
      content,
      author: userName,
      authorId: session?.userId,
      createdAt: new Date().toISOString()
    });
    return { ...e, replies };
  });
  DB.set(DB.keys.journal, entries);
  toast('Réponse ajoutée');
  selectEntry(entryId);
}

function editEntry(id) {
  const entries = DB.get(DB.keys.journal) || [];
  const e = entries.find(x => x.id === id);
  if (!e) return;
  document.getElementById('modalEntryTitle').textContent = 'Modifier l\'entrée';
  document.getElementById('entryId').value = id;
  document.getElementById('eResident').value = e.residentId || '';
  document.getElementById('eCategorie').value = e.categorie || '';
  document.getElementById('eDate').value = e.date ? e.date.slice(0,16) : '';
  document.getElementById('eObjectif').value = e.objectif || '';
  document.getElementById('eContenu').value = e.contenu || '';
  const vis = document.querySelector(`input[name="eVisibilite"][value="${e.visibilite||'equipe'}"]`);
  if (vis) vis.checked = true;
  document.getElementById('btnDeleteEntry').style.display = '';
  openModal('modalEntry');
}

function saveEntry() {
  const session = Auth.getSession();
  const userName = session ? [session.prenom, session.nom].filter(Boolean).join(' ') || session.username : 'Utilisateur';
  const residentId = document.getElementById('eResident').value;
  const contenu = document.getElementById('eContenu').value.trim();
  if (!residentId) { toast('Sélectionnez un résident', 'error'); return; }
  if (!contenu) { toast('Le contenu est requis', 'error'); return; }

  const residents = DB.get(DB.keys.residents) || [];
  const res = residents.find(r => r.id === residentId);
  const visEl = document.querySelector('input[name="eVisibilite"]:checked');

  const data = {
    residentId,
    resident: res ? `${res.prenom||''} ${res.nom||''}`.trim() : '',
    residentColor: res?.color || 'var(--blue)',
    categorie: document.getElementById('eCategorie').value,
    date: document.getElementById('eDate').value || new Date().toISOString(),
    objectif: document.getElementById('eObjectif').value,
    contenu,
    visibilite: visEl?.value || 'equipe',
    author: userName,
    authorId: session?.userId,
    updatedAt: new Date().toISOString()
  };

  let entries = DB.get(DB.keys.journal) || [];
  const id = document.getElementById('entryId').value;
  if (id) {
    entries = entries.map(e => {
      if (e.id !== id) return e;
      // Conserver l'auteur d'origine ; tracer la modification + historiser le contenu
      const { author, authorId, ...editData } = data;
      const history = (e.editHistory || []).concat([{ at: new Date().toISOString(), by: userName, byId: session?.userId, contenu: e.contenu }]);
      return { ...e, ...editData, editHistory: history, editedBy: userName, editedById: session?.userId, editedAt: new Date().toISOString() };
    });
    if (typeof auditLog === 'function') auditLog('journal_edit', `Entrée modifiée — ${data.resident}`);
    toast('Entrée mise à jour');
  } else {
    const dup = findJournalDuplicate({ residentId, contenu, date: data.date }, entries);
    if (dup) {
      const e = dup.entry;
      const extrait = (e.contenu || '').slice(0, 140) + ((e.contenu || '').length > 140 ? '…' : '');
      if (!confirm(`⚠️ Doublon possible pour ${e.resident || 'ce résident'} :\n\n« ${extrait} »\n${formatDateTime(e.date)} · ${getJournalAuthor ? getJournalAuthor(e) : (e.author || '')}\n\nEnregistrer quand même cette transmission ?`)) return;
    }
    data.id = genId();
    data.replies = [];
    data.readBy = [session?.userId];
    data.createdAt = new Date().toISOString();
    entries.push(data);
    toast('Entrée ajoutée');
  }
  DB.set(DB.keys.journal, entries);
  closeAllModals();
  resetEntryForm();
  showJournalList();
  if (id) { selectedEntryId = id; }
  renderEntries();
}

function deleteEntry() { deleteEntryById(document.getElementById('entryId').value); }

function deleteEntryById(id) {
  confirmDialog('Supprimer cette entrée ?', () => {
    let entries = DB.get(DB.keys.journal) || [];
    const removed = entries.find(e => e.id === id);
    entries = entries.filter(e => e.id !== id);
    DB.set(DB.keys.journal, entries);
    if (typeof auditLog === 'function') auditLog('journal_delete', `Entrée supprimée — ${removed?.resident || ''} (${formatDateTime(removed?.date)})`);
    closeAllModals();
    selectedEntryId = null;
    showJournalList();
    renderEntries();
    toast('Entrée supprimée', 'info');
  });
}

function resetEntryForm() {
  document.getElementById('entryId').value = '';
  document.getElementById('modalEntryTitle').textContent = 'Nouvelle entrée';
  document.getElementById('eResident').value = '';
  document.getElementById('eCategorie').value = '';
  document.getElementById('eDate').value = new Date().toISOString().slice(0,16);
  document.getElementById('eObjectif').value = '';
  document.getElementById('eContenu').value = '';
  document.querySelector('input[name="eVisibilite"][value="equipe"]').checked = true;
  document.getElementById('btnDeleteEntry').style.display = 'none';
}

function initJournal() {
  if (!requireModule('access_journal')) return;
  document.getElementById('eDate').value = new Date().toISOString().slice(0,16);
  populateSelects();
  renderEntries();
  ['jSearch','jFilterResident','jFilterCat','jFilterDate','jFilterDateEnd'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderEntries);
    document.getElementById(id)?.addEventListener('change', renderEntries);
  });
}
document.addEventListener('DOMContentLoaded', initJournal);
if (typeof registerPageInit === 'function') registerPageInit('journal', initJournal);

// ── AI Assist Journal ──
async function aiAssistJournal(action) {
  const ta = document.getElementById('eContenu');
  if (!ta) return;
  const current = ta.value || '';
  const residentId = document.getElementById('eResident')?.value || '';
  const residents = DB.get(DB.keys.residents) || [];
  const resident = residents.find(r => r.id === residentId);
  const residentName = resident ? `${resident.prenom||''} ${resident.nom||''}`.trim() : '';
  const hasKey = !!getAiKey();
  const labels = { redaction: 'Rédaction', correction: 'Correction', reformulation: 'Reformulation' };

  if (hasKey) {
    const customSystem = getAiPrompt('journal', action);
    let system = '';
    let prompt = '';
    if (action === 'redaction') {
      system = customSystem || 'Tu es un éducateur spécialisé rédigeant une observation pour le journal de bord d\'un établissement médico-social. Écris en français, de manière professionnelle et factuelle.';
      prompt = `Rédige une courte observation de journal de bord${residentName ? ' pour le résident ' + residentName : ''}. Décris une journée type, une intervention éducative ou un fait notable.` + (current ? '\n\nTexte existant à compléter :\n' + current : '');
    } else if (action === 'correction') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Tu es un correcteur professionnel. Corrige les fautes d\'orthographe, de grammaire et de syntaxe sans changer le style.';
      prompt = 'Corrige ce texte de journal de bord :\n\n' + current;
    } else if (action === 'reformulation') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Tu es un rédacteur institutionnel. Reformule ce texte de manière professionnelle.';
      prompt = 'Reformule ce texte de manière professionnelle et institutionnelle :\n\n' + current;
    }
    const result = await callMistral(prompt, system);
    if (result) {
      ta.value = result;
      ta.dispatchEvent(new Event('input'));
      toast('✓ ' + labels[action] + ' (Mistral AI)', 'success');
      return;
    }
    toast('API Mistral indisponible, mode local', 'warning');
  }

  // Fallback local
  let result = '';
  if (action === 'redaction') {
    const templates = [
      `Observation éducative du jour : le résident a participé aux activités proposées avec un intérêt marqué pour les ateliers créatifs.`,
      `Suivi quotidien : bonne intégration au sein du groupe, interactions sociales positives avec les pairs.`,
      `Point d'étape : le résident fait preuve d'autonomie dans les gestes du quotidien, à encourager dans la continuité.`
    ];
    result = current ? current + '\n\n' + templates[Math.floor(Math.random() * templates.length)] : templates[Math.floor(Math.random() * templates.length)];
  } else if (action === 'correction') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current
      .replace(/\bils on\b/g, 'ils ont')
      .replace(/\belle on\b/g, 'elle a')
      .replace(/\bje suis allé\b/g, 'je me suis rendu')
      .replace(/\bil a étais\b/g, 'il a été')
      .replace(/\bau jour d'aujourd'hui\b/g, 'actuellement');
  } else if (action === 'reformulation') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current
      .replace(/\bgère\b/g, 'assure la gestion de')
      .replace(/\ba besoin de\b/g, 'nécessite')
      .replace(/\bveut\b/g, 'souhaite')
      .replace(/\bpeut\b/g, 'est en mesure de')
      .replace(/\bfait\b/g, 'réalise')
      .replace(/\bva\b/g, 'envisage de');
  }

  if (result) {
    ta.value = result;
    ta.dispatchEvent(new Event('input'));
    toast('✓ ' + labels[action] + ' (mode local)', 'success');
  }
}

// ── EXPORT PDF ──
function exportJournalPDF() {
  const list = getEntries();
  if (!list.length) { toast('Aucune entrée à exporter', 'error'); return; }

  const settings = DB.get(DB.keys.settings) || {};
  const cats = DB.get(DB.keys.categories) || [];
  const session = Auth.getSession();

  const dateFilter = document.getElementById('jFilterDate')?.value || '';
  const dateFilterEnd = document.getElementById('jFilterDateEnd')?.value || '';
  const resFilter  = document.getElementById('jFilterResident')?.value || '';
  const catFilter  = document.getElementById('jFilterCat')?.value || '';

  let periodLabel;
  if (dateFilter && dateFilterEnd) periodLabel = `du ${new Date(dateFilter).toLocaleDateString('fr-FR')} au ${new Date(dateFilterEnd).toLocaleDateString('fr-FR')}`;
  else if (dateFilter) periodLabel = `depuis le ${new Date(dateFilter).toLocaleDateString('fr-FR')}`;
  else if (dateFilterEnd) periodLabel = `jusqu'au ${new Date(dateFilterEnd).toLocaleDateString('fr-FR')}`;
  else periodLabel = `au ${new Date().toLocaleDateString('fr-FR')}`;

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Journal de bord — ${escHtml(settings.etablissement||'FTR')}</title>
<style>
  @page{margin:1.8cm 1.5cm}
  body{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:9.5pt;line-height:1.6;color:#334155;max-width:800px;margin:0 auto}
  .top-stripe{height:6px;background:#0f2b4a;border-radius:0 0 4px 4px;margin-bottom:.5cm}
  .doc-header{margin-bottom:.7cm}
  .doc-header .etab{font-size:11pt;font-weight:300;color:#0f2b4a}
  .doc-header .etab strong{font-weight:700}
  .doc-header .doc-title{font-size:15pt;font-weight:800;color:#0f2b4a;margin-top:.05cm}
  .doc-header .doc-meta{font-size:7.5pt;color:#64748b;margin-top:.1cm}
  .day-group{margin-bottom:.5cm}
  .day-label{font-size:8pt;font-weight:700;color:#0f2b4a;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #0f2b4a;padding-bottom:2px;margin-bottom:.25cm}
  .entry{border:1px solid #e2e8f0;border-radius:7px;padding:.4cm .5cm;margin-bottom:.25cm;page-break-inside:avoid}
  .entry-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.3cm;margin-bottom:.2cm}
  .entry-resident{font-weight:700;font-size:9.5pt;color:#0f2b4a}
  .entry-meta{font-size:7pt;color:#64748b;margin-top:1px}
  .entry-cat{display:inline-block;padding:1px 7px;border-radius:100px;font-size:7pt;font-weight:600}
  .entry-body{font-size:8.5pt;color:#334155;line-height:1.6;white-space:pre-wrap}
  .entry-replies{margin-top:.2cm;padding-top:.2cm;border-top:1px solid #f1f5f9}
  .reply{font-size:7.5pt;color:#64748b;padding:.15cm .3cm;background:#f8fafc;border-radius:5px;margin-bottom:.1cm}
  .reply strong{color:#475569}
  .badge-conf{display:inline-block;padding:1px 7px;border-radius:100px;font-size:7pt;font-weight:600;background:#fef2f2;color:#dc2626}
  .footer{margin-top:.8cm;padding-top:.3cm;border-top:1px solid #e2e8f0;text-align:center;font-size:7pt;color:#94a3b8}
  .actions{text-align:center;margin:.4cm 0}
  .actions button{padding:.35rem 1.1rem;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:9pt;margin:.2rem}
  @media print{.actions{display:none}}
</style></head><body>
<div class="top-stripe"></div>
<div class="doc-header">
  <div class="etab"><strong>${escHtml(settings.etablissement||'Foyer d\'Hébergement')}</strong></div>
  <div class="doc-title">Journal de bord</div>
  <div class="doc-meta">
    Export ${periodLabel} · ${list.length} entrée${list.length>1?'s':''} · Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
    ${session ? ` · par ${escHtml([session.prenom,session.nom].filter(Boolean).join(' ')||session.username)}` : ''}
  </div>
</div>
<div class="actions">
  <button onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button>
  <button onclick="window.close()">Fermer</button>
</div>
${(() => {
  // Grouper par date
  const groups = {};
  list.forEach(e => {
    const d = e.date ? e.date.slice(0,10) : 'Sans date';
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });
  return Object.entries(groups).map(([date, entries]) => {
    const label = date === 'Sans date' ? 'Sans date' :
      new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    return `<div class="day-group">
      <div class="day-label">${escHtml(label)}</div>
      ${entries.map(e => {
        const cat = cats.find(c => String(c.id) === String(e.categorie));
        const timeStr = e.date && e.date.length > 10 ? new Date(e.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '';
        return `<div class="entry">
          <div class="entry-top">
            <div>
              <div class="entry-resident">${escHtml(e.resident||'—')}</div>
              <div class="entry-meta">${timeStr ? timeStr+' · ' : ''}${escHtml(e.author||'')}${cat?'':''}</div>
            </div>
            <div style="display:flex;gap:.2cm;flex-shrink:0;align-items:center">
              ${cat ? `<span class="entry-cat" style="background:${cat.color}22;color:${cat.color}">${escHtml(cat.name)}</span>` : ''}
              ${e.visibilite==='confidentiel' ? '<span class="badge-conf">Confidentiel</span>' : ''}
            </div>
          </div>
          <div class="entry-body">${escHtml(e.contenu||'')}</div>
          ${(e.replies||[]).length ? `<div class="entry-replies">${e.replies.map(r=>`<div class="reply"><strong>${escHtml(r.author)}</strong> · ${new Date(r.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} — ${escHtml(r.content)}</div>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
})()}
<div class="footer">${escHtml(settings.etablissement||'Foyer d\'Hébergement')} — Journal de bord — ${new Date().toLocaleDateString('fr-FR')}</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}
