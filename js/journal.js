let selectedEntryId = null;

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

function getEntries() {
  const q = (document.getElementById('jSearch')?.value || '').toLowerCase();
  const res = document.getElementById('jFilterResident')?.value || '';
  const cat = document.getElementById('jFilterCat')?.value || '';
  const date = document.getElementById('jFilterDate')?.value || '';
  let list = (DB.get(DB.keys.journal) || []).slice().reverse();
  if (q) list = list.filter(e => (e.contenu || '').toLowerCase().includes(q) || (e.resident || '').toLowerCase().includes(q));
  if (res) list = list.filter(e => e.residentId === res);
  if (cat) list = list.filter(e => String(e.categorie) === String(cat));
  if (date) list = list.filter(e => e.date && e.date.startsWith(date));
  return list;
}

function renderEntries() {
  const list = getEntries();
  const el = document.getElementById('entriesList');
  const countEl = document.getElementById('journalCount');
  countEl.textContent = `${list.length} entrée${list.length > 1 ? 's' : ''}`;
  const cats = DB.get(DB.keys.categories) || [];
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><h3>Aucune entrée</h3><p>Commencez à documenter les événements.</p></div>`;
    return;
  }
  el.innerHTML = list.map(e => {
    const cat = cats.find(c => String(c.id) === String(e.categorie));
    return `<div class="entry-card ${e.id === selectedEntryId ? 'selected' : ''}" onclick="selectEntry('${e.id}')">
      <div class="entry-header">
        <div class="avatar sm" style="background:${e.residentColor||'var(--blue)'};flex-shrink:0">${(escHtml(e.resident)||'?')[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
            <span style="font-weight:700;font-size:.875rem">${escHtml(e.resident)||'—'}</span>
            ${cat ? `<span class="badge" style="background:${cat.color}22;color:${cat.color}">${escHtml(cat.name)}</span>` : ''}
            ${e.visibilite === 'confidentiel' ? '<span class="badge badge-red">Confidentiel</span>' : ''}
          </div>
          <div class="entry-meta">${formatDateTime(e.date)} · <span style="font-weight:500;background:${getAuthorColor(e)}18;color:${getAuthorColor(e)};padding:1px 8px;border-radius:10px;font-size:.75rem">${escHtml(getJournalAuthor(e))}</span></div>
        </div>
      </div>
      <div class="entry-preview">${escHtml(e.contenu)||''}</div>
      ${(e.replies||[]).length ? `<div style="font-size:.7rem;color:var(--blue);margin-top:.4rem;font-weight:600">💬 ${e.replies.length} réponse${e.replies.length>1?'s':''}</div>` : ''}
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

function selectEntry(id) {
  selectedEntryId = id;
  const entries = DB.get(DB.keys.journal) || [];
  const e = entries.find(x => x.id === id);
  if (!e) return;
  const cats = DB.get(DB.keys.categories) || [];
  const objs = DB.get(DB.keys.objectives) || [];
  const cat = cats.find(c => String(c.id) === String(e.categorie));
  const obj = objs.find(o => String(o.id) === String(e.objectif));
  const vis = { equipe: 'Équipe uniquement', tous: 'Tous', confidentiel: 'Confidentiel' };
  const session = Auth.getSession();
  const userName = session ? [session.prenom, session.nom].filter(Boolean).join(' ') || session.username : 'Utilisateur';

  document.getElementById('entryDetail').innerHTML = `
    <div class="entry-detail fade-in">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem;gap:.5rem">
        <div>
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.3rem">
            <span style="font-weight:800;font-size:1rem">${escHtml(e.resident)||'—'}</span>
            ${cat ? `<span class="badge" style="background:${cat.color}22;color:${cat.color};border:1px solid ${cat.color}44">${escHtml(cat.name)}</span>` : ''}
          </div>
          <div style="font-size:.78rem;color:var(--muted)">${formatDateTime(e.date)} · ${vis[e.visibilite]||''} · <span style="font-weight:500;background:${getAuthorColor(e)}18;color:${getAuthorColor(e)};padding:1px 8px;border-radius:10px;font-size:.72rem">${escHtml(getJournalAuthor(e))}</span></div>
          ${obj ? `<div style="font-size:.78rem;color:var(--purple);margin-top:3px">Objectif : ${escHtml(obj.name)}</div>` : ''}
        </div>
        <div style="display:flex;gap:.4rem;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="editEntry('${e.id}')">Modifier</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteEntryById('${e.id}')">Supprimer</button>
        </div>
      </div>
      <div class="divider"></div>
      <p style="font-size:.9rem;line-height:1.8;white-space:pre-wrap;color:var(--text)">${escHtml(e.contenu)||''}</p>
      ${renderReplies(e)}
      <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
        <div style="display:flex;gap:.6rem">
          <div class="avatar sm" style="background:var(--accent);flex-shrink:0;width:28px;height:28px;font-size:.65rem">${(escHtml(userName)||'?')[0].toUpperCase()}</div>
          <div style="flex:1;display:flex;gap:.5rem">
            <textarea id="replyContent" rows="2" style="flex:1;font-size:.82rem;padding:.5rem .75rem" placeholder="Écrire une réponse…"></textarea>
            <button class="btn btn-primary btn-sm" style="align-self:flex-end" onclick="addReply('${e.id}')">Répondre</button>
          </div>
        </div>
      </div>
    </div>`;
  renderEntries();
}

function addReply(entryId) {
  const content = document.getElementById('replyContent')?.value?.trim();
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
    entries = entries.map(e => e.id === id ? { ...e, ...data } : e);
    toast('Entrée mise à jour');
  } else {
    data.id = genId();
    data.replies = [];
    data.createdAt = new Date().toISOString();
    entries.push(data);
    toast('Entrée ajoutée');
  }
  DB.set(DB.keys.journal, entries);
  closeAllModals();
  resetEntryForm();
  renderEntries();
  if (id) selectEntry(id);
}

function deleteEntry() { deleteEntryById(document.getElementById('entryId').value); }

function deleteEntryById(id) {
  confirmDialog('Supprimer cette entrée ?', () => {
    let entries = DB.get(DB.keys.journal) || [];
    entries = entries.filter(e => e.id !== id);
    DB.set(DB.keys.journal, entries);
    closeAllModals();
    selectedEntryId = null;
    document.getElementById('entryDetail').innerHTML = `<div class="entry-detail" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;color:var(--muted)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin-bottom:1rem;opacity:.3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p style="font-size:.875rem">Sélectionnez une entrée pour la lire</p></div>`;
    resetEntryForm();
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('eDate').value = new Date().toISOString().slice(0,16);
  populateSelects();
  renderEntries();
  ['jSearch','jFilterResident','jFilterCat','jFilterDate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderEntries);
    document.getElementById(id)?.addEventListener('change', renderEntries);
  });
});

// ── AI Assist Journal ──
async function aiAssistJournal() {
  const ta = document.getElementById('eContenu');
  if (!ta) return;
  const current = ta.value || '';
  if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
  const hasKey = !!getAiKey();

  if (hasKey) {
    const customSystem = getAiPrompt('journal', 'reformulation');
    const system = customSystem || 'Tu es un rédacteur institutionnel. Reformule ce texte de manière professionnelle.';
    const prompt = 'Reformule ce texte de manière professionnelle et institutionnelle :\n\n' + current;
    const result = await callMistral(prompt, system);
    if (result) {
      ta.value = result;
      ta.dispatchEvent(new Event('input'));
      toast('✓ Reformulation (Mistral AI)', 'success');
      return;
    }
    toast('API Mistral indisponible, mode local', 'warning');
  }

  // Fallback local
  const result = current
    .replace(/\bgère\b/g, 'assure la gestion de')
    .replace(/\ba besoin de\b/g, 'nécessite')
    .replace(/\bveut\b/g, 'souhaite')
    .replace(/\bpeut\b/g, 'est en mesure de')
    .replace(/\bfait\b/g, 'réalise')
    .replace(/\bva\b/g, 'envisage de');

  if (result) {
    ta.value = result;
    ta.dispatchEvent(new Event('input'));
    toast('✓ Reformulation (mode local)', 'success');
  }
}
