// ── DATA ──
function getMessages() { return DB.get(DB.keys.messages) || []; }
function setMessages(m) { DB.set(DB.keys.messages, m); }
function getUsers() { return DB.get(DB.keys.users) || []; }

let currentConvId = null;
let composeSelected = [];
let composeTargetConv = null;

// ── HELPERS ──
function convId(userIds) {
  return [...userIds].sort().join('_');
}

function getOrCreateConv(userIds) {
  const id = convId(userIds);
  let convs = DB.get('ftr_conversations') || {};
  if (!convs[id]) {
    convs[id] = { id, userIds: [...new Set(userIds)], createdAt: new Date().toISOString() };
    DB.set('ftr_conversations', convs);
  }
  return id;
}

function getConvParticipants(convId) {
  const convs = DB.get('ftr_conversations') || {};
  return convs[convId]?.userIds || [];
}

function getConvMessages(convId) {
  return (getMessages().filter(m => m.convId === convId) || []).sort((a,b) => new Date(a.date) - new Date(b.date));
}

// ── RENDER CONVERSATION LIST ──
function renderConvs() {
  const session = Auth.getSession();
  if (!session) return;
  const allMsgs = getMessages();
  const convs = DB.get('ftr_conversations') || {};
  const q = (document.getElementById('convSearch')?.value || '').trim().toLowerCase();
  const users = getUsers();
  const myUserId = String(session.userId);

  const userConvMap = {};
  const groupConvs = [];

  Object.values(convs).forEach(c => {
    const ids = c.userIds.map(String);
    if (!ids.includes(myUserId)) return;
    if (ids.length === 2) {
      const otherId = ids.find(id => id !== myUserId);
      if (otherId) userConvMap[otherId] = c;
    } else {
      groupConvs.push(c);
    }
  });

  function convToHtml(conv) {
    const msgs = allMsgs.filter(m => m.convId === conv.id).sort((a,b) => new Date(b.date) - new Date(a.date));
    const lastMsg = msgs[0];
    const unread = msgs.some(m => m.from !== session.userId && !m.readBy?.includes(session.userId));
    const unreadCount = msgs.filter(m => m.from !== session.userId && !m.readBy?.includes(session.userId)).length;
    const otherIds = conv.userIds.filter(id => String(id) !== String(session.userId));

    let name, avatar, color;
    if (otherIds.length === 0) {
      name = 'Moi seul';
      avatar = '#';
      color = '#8e8e93';
    } else if (otherIds.length === 1) {
      const u = users.find(x => String(x.id) === String(otherIds[0]));
      name = u ? `${u.prenom||''} ${u.nom||''}`.trim() || u.username : 'Inconnu';
      avatar = ((u?.prenom||'')[0]||'') + ((u?.nom||'')[0]||'') || '?';
      color = '#007aff';
    } else {
      const names = otherIds.map(id => {
        const u = users.find(x => String(x.id) === String(id));
        return u ? `${u.prenom||''} ${u.nom||''}`.trim() || u.username : 'Inconnu';
      });
      name = names.length > 2 ? `Groupe (${names.length})` : names.join(', ');
      avatar = '#';
      color = '#f59e0b';
    }

    if (q && !name.toLowerCase().includes(q)) return '';

    const time = lastMsg ? formatConvTime(new Date(lastMsg.date)) : '';
    const preview = lastMsg ? (lastMsg.body||'') : '';

    return `<div class="chat-conv ${currentConvId===conv.id?'active':''}" onclick="selectConv('${conv.id}')">
      <div class="chat-conv-avatar" style="background:${color}">${avatar}</div>
      <div class="chat-conv-info">
        <div class="chat-conv-name">${escHtml(name)}${unread ? '<span style="width:8px;height:8px;border-radius:50%;background:#007aff;flex-shrink:0"></span>' : ''}</div>
        <div class="chat-conv-preview">${escHtml(preview)}</div>
      </div>
      <div class="chat-conv-right">
        <div class="chat-conv-time">${time}</div>
        ${unreadCount > 0 ? `<div class="chat-conv-badge">${unreadCount}</div>` : ''}
      </div>
      <button class="chat-conv-del" onclick="event.stopPropagation();deleteConv('${conv.id}')" title="Supprimer la conversation"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
    </div>`;
  }

  let html = '';

  groupConvs.map(convToHtml).filter(Boolean).forEach(h => html += h);

  users.forEach(u => {
    const uid = String(u.id);
    if (uid === myUserId) return;
    const prenom = u.prenom || '';
    const nom = u.nom || '';
    const name = `${prenom} ${nom}`.trim() || u.username;
    if (q && !name.toLowerCase().includes(q)) return;
    const initials = (prenom[0]||'') + (nom[0]||'') || '?';

    const conv = userConvMap[uid];
    if (conv) {
      html += convToHtml(conv);
    } else {
      html += `<div class="chat-conv" onclick="openUserChat('${uid}')">
        <div class="chat-conv-avatar" style="background:#007aff">${initials}</div>
        <div class="chat-conv-info">
          <div class="chat-conv-name">${escHtml(name)}</div>
          <div class="chat-conv-preview" style="color:var(--muted);font-style:italic">Cliquez pour discuter</div>
        </div>
        <div class="chat-conv-right"></div>
      </div>`;
    }
  });

  if (!html) {
    html = `<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.85rem">
      <p style="margin:0">${q ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}</p>
    </div>`;
  }
  document.getElementById('chatConvs').innerHTML = html;
}

function openUserChat(userId) {
  const session = Auth.getSession();
  if (!session) return;
  const convId = getOrCreateConv([session.userId, userId]);
  selectConv(convId);
}

// ── SELECT CONVERSATION ──
function selectConv(id) {
  currentConvId = id;
  closeCompose();
  renderConvs();
  renderChat();
}

// ── COMPOSE ──
function openCompose(convId) {
  composeSelected = [];
  composeTargetConv = convId || null;
  const overlay = document.getElementById('composeOverlay');
  const title = document.querySelector('#composeOverlay h3');
  const btn = document.getElementById('composeStartBtn');
  if (convId) {
    title.textContent = 'Ajouter des participants';
    btn.textContent = 'Ajouter';
  } else {
    title.textContent = 'Nouveau message';
    btn.textContent = 'Démarrer';
  }
  overlay.style.display = 'flex';
  document.getElementById('composeBackdrop').style.display = 'block';
  document.getElementById('composeSearch').value = '';
  renderComposeUsers();
  setTimeout(() => document.getElementById('composeSearch')?.focus(), 100);
}

function closeCompose() {
  document.getElementById('composeOverlay').style.display = 'none';
  document.getElementById('composeBackdrop').style.display = 'none';
  composeTargetConv = null;
}

function renderComposeUsers() {
  const session = Auth.getSession();
  let users = getUsers().filter(u => String(u.id) !== String(session.userId));
  // If adding to existing conversation, exclude current participants
  if (composeTargetConv) {
    const existing = getConvParticipants(composeTargetConv).map(String);
    users = users.filter(u => !existing.includes(String(u.id)));
  }
  const q = (document.getElementById('composeSearch')?.value || '').trim().toLowerCase();

  const filtered = q
    ? users.filter(u => {
        const name = `${u.prenom||''} ${u.nom||''}`.toLowerCase();
        return name.includes(q) || (u.username||'').toLowerCase().includes(q) || (u.fonction||'').toLowerCase().includes(q);
      })
    : users;

  const title = document.querySelector('#composeOverlay h3');
  if (!composeTargetConv) {
    title.textContent = composeSelected.length > 1 ? `Nouveau groupe (${composeSelected.length})` : 'Nouveau message';
  }

  let html = filtered.map(u => {
    const sel = composeSelected.includes(String(u.id));
    const initials = ((u.prenom||'')[0]||'') + ((u.nom||'')[0]||'');
    const name = `${u.prenom||''} ${u.nom||''}`.trim() || u.username;
    const role = u.fonction || (u.role==='admin' ? 'Administrateur' : 'Utilisateur');
    return `<div class="chat-overlay-user" onclick="toggleComposeUser('${u.id}')">
      <div class="ck ${sel?'checked':''}"></div>
      <div class="avatar" style="background:${u.role==='admin'?'#5856d6':'#007aff'}">${initials||'?'}</div>
      <div class="chat-overlay-user-info">
        <div class="chat-overlay-user-name">${escHtml(name)}</div>
        <div class="chat-overlay-user-role">${escHtml(role)}</div>
      </div>
    </div>`;
  }).join('');

  if (!html) {
    html = `<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.85rem"><p style="margin:0">${q ? 'Aucun utilisateur trouvé' : 'Aucun autre utilisateur'}</p></div>`;
  }
  document.getElementById('composeList').innerHTML = html;
  document.getElementById('composeStartBtn').disabled = composeSelected.length === 0;
}

function toggleComposeUser(id) {
  id = String(id);
  const idx = composeSelected.indexOf(id);
  if (idx >= 0) {
    composeSelected.splice(idx, 1);
  } else {
    composeSelected.push(id);
  }
  renderComposeUsers();
}

function startComposeConv() {
  if (!composeSelected.length) return;
  const session = Auth.getSession();
  if (composeTargetConv) {
    addUsersToConv(composeTargetConv, composeSelected);
    closeCompose();
    renderConvs();
    renderChat();
    return;
  }
  const allIds = [String(session.userId), ...composeSelected];
  currentConvId = getOrCreateConv(allIds);
  closeCompose();
  renderConvs();
  renderChat();
  document.getElementById('chatInput').focus();
}

function addUsersToConv(targetConvId, newUserIds) {
  const convs = DB.get('ftr_conversations') || {};
  const conv = convs[targetConvId];
  if (!conv) return;
  const oldUserIds = conv.userIds.map(String);
  const allIds = [...new Set([...oldUserIds, ...newUserIds.map(String)])];
  const newConvId = convId(allIds);
  if (newConvId === targetConvId) return; // no change
  // Create new conversation entry
  convs[newConvId] = { id: newConvId, userIds: allIds, createdAt: conv.createdAt };
  // Update all messages to new convId
  const msgs = DB.get(DB.keys.messages) || [];
  msgs.forEach(m => { if (m.convId === targetConvId) m.convId = newConvId; });
  DB.set(DB.keys.messages, msgs);
  // Remove old conversation
  delete convs[targetConvId];
  DB.set('ftr_conversations', convs);
  currentConvId = newConvId;
  toast('Participant ajouté');
}

// ── RENDER CHAT ──
function renderChat() {
  const session = Auth.getSession();
  const msgsEl = document.getElementById('chatMsgs');
  const headerEl = document.getElementById('chatMainHeader');
  const headerAvatar = document.getElementById('chatMainAvatar');
  const headerName = document.getElementById('chatMainName');
  const headerStatus = document.getElementById('chatMainStatus');
  const inputBar = document.getElementById('chatInputBar');

  if (!currentConvId) {
    headerEl.style.display = 'none';
    const addBtn = document.getElementById('addParticipantBtn');
    if (addBtn) addBtn.style.display = 'none';
    document.getElementById('chatInput').disabled = true;
    document.getElementById('sendBtn').disabled = true;
    msgsEl.innerHTML = `<div class="chat-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>Messages</p>
    </div>`;
    updateConvCount();
    return;
  }

  headerEl.style.display = 'flex';
  document.getElementById('chatInput').disabled = false;
  document.getElementById('sendBtn').disabled = false;

  const participants = getConvParticipants(currentConvId);
  const otherIds = participants.filter(id => String(id) !== String(session.userId));
  // Show add-participant button
  const addBtn = document.getElementById('addParticipantBtn');
  if (addBtn) addBtn.style.display = '';
  const users = getUsers();

  let name, avatar, color, status;
  if (otherIds.length === 0) {
    name = 'Moi seul';
    avatar = '#';
    color = '#8e8e93';
    status = 'Notes personnelles';
  } else if (otherIds.length === 1) {
    const u = users.find(x => String(x.id) === String(otherIds[0]));
    name = u ? `${u.prenom||''} ${u.nom||''}`.trim() || u.username : 'Inconnu';
    avatar = ((u?.prenom||'')[0]||'') + ((u?.nom||'')[0]||'') || '?';
    color = '#007aff';
    status = u?.fonction || (u?.role==='admin' ? 'Administrateur' : '');
  } else {
    const names = otherIds.map(id => {
      const u = users.find(x => String(x.id) === String(id));
      return u ? `${u.prenom||''} ${u.nom||''}`.trim() || u.username : 'Inconnu';
    });
    name = names.length > 2 ? `Groupe (${names.length})` : names.join(', ');
    avatar = '#';
    color = '#f59e0b';
    status = `${otherIds.length} participants`;
  }

  headerAvatar.style.background = color;
  headerAvatar.textContent = avatar;
  headerName.textContent = name;
  headerStatus.textContent = status;

  const allMsgs = getMessages();
  const msgs = allMsgs.filter(m => m.convId === currentConvId).sort((a,b) => new Date(a.date) - new Date(b.date));
  if (!msgs.length) {
    msgsEl.innerHTML = `<div class="chat-empty"><p style="color:var(--muted)">Aucun message</p></div>`;
    updateConvCount();
    return;
  }

  let currentDate = '';
  let html = '';
  for (const m of msgs) {
    const msgDate = new Date(m.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      html += `<div class="chat-date-sep">${currentDate}</div>`;
    }
    const isOwn = String(m.from) === String(session.userId);
    const author = users.find(u => String(u.id) === String(m.from));
    const authorName = author ? `${author.prenom||''} ${author.nom||''}`.trim() || author.username : 'Inconnu';
    const time = new Date(m.date).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

    // Readers (excluding author)
    const readers = (m.readBy || []).filter(rid => String(rid) !== String(m.from));
    const readerAvatars = readers.length > 0 ? `<div style="display:flex;gap:2px;margin-top:4px;justify-content:${isOwn?'flex-end':'flex-start'}">
      ${readers.map(rid => {
        const ru = users.find(x => String(x.id) === String(rid));
        const rInit = ((ru?.prenom||'')[0]||'') + ((ru?.nom||'')[0]||'') || '?';
        let rColor = '#8e8e93';
        if (ru?.fonction) {
          const fc = DB.get(DB.keys.fonctionColors) || [];
          const f = ru.fonction.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const match = fc.find(x => {
            const key = x.fonction.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return f.includes(key) || key.split(' ').some(kw => kw.length > 3 && f.includes(kw)) || f.split(' ').some(fw => key.includes(fw));
          });
          if (match) rColor = match.color;
        }
        if (rColor === '#8e8e93') {
          const pool = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#6366f1','#dc2626','#14b8a6'];
          rColor = pool[Math.abs(rid) % pool.length];
        }
        return `<div style="width:16px;height:16px;border-radius:50%;background:${rColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.45rem;font-weight:700;border:1.5px solid ${isOwn?'#007aff':'#e5e5ea'}" title="${escHtml(ru?.['prenom']||'') + ' ' + escHtml(ru?.['nom']||'')}">${rInit}</div>`;
      }).join('')}
    </div>` : '';

    const isUnread = !isOwn && !m.readBy?.includes(session.userId);

    html += `<div class="chat-row ${isOwn ? 'own' : 'other'}">
      <div class="chat-bubble" style="${isUnread ? 'background:#faecd0;border:2px solid #f5a623;font-weight:600' : ''}">${isUnread ? '<span style="font-size:.55rem;text-transform:uppercase;color:#f5a623;font-weight:800;letter-spacing:.04em;display:block;margin-bottom:2px">Nouveau</span>' : ''}
        ${!isOwn && otherIds.length > 1 ? `<div class="chat-bubble-author">${escHtml(authorName)}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px">
          <span>${escHtml(m.body)}</span>
          <span class="chat-bubble-time">${time}</span>
        </div>
        ${readerAvatars}
      </div>
    </div>`;

    if (isUnread) {
      if (!m.readBy) m.readBy = [];
      m.readBy.push(session.userId);
    }
  }
  setMessages(allMsgs);
  renderConvs();
  msgsEl.innerHTML = html;
  msgsEl.scrollTop = msgsEl.scrollHeight;
  // Store unread count for accueil
  const sessionId = session?.userId;
  const allM = getMessages();
  const unreadTotal = allM.filter(m => String(m.from) !== String(sessionId) && !(m.readBy || []).map(String).includes(String(sessionId))).length;
  localStorage.setItem('ftr_notif_msg_unread_' + sessionId, unreadTotal);
  updateConvCount();
}

function updateConvCount() {
  const session = Auth.getSession();
  const allMsgs = getMessages();
  const unread = allMsgs.filter(m => m.from !== session.userId && !m.readBy?.includes(session.userId)).length;
  document.getElementById('convCount').textContent = unread ? `${unread} non lu${unread>1?'s':''}` : '';
  localStorage.setItem('ftr_notif_msg_unread_' + session.userId, unread);
}

function sendChatMsg() {
  const session = Auth.getSession();
  if (!currentConvId || !session) return;
  const input = document.getElementById('chatInput');
  const body = input.value.trim();
  if (!body) return;

  const msg = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    convId: currentConvId,
    from: session.userId,
    body,
    date: new Date().toISOString(),
    readBy: [session.userId]
  };
  const msgs = getMessages();
  msgs.push(msg);
  setMessages(msgs);
  input.value = '';
  renderChat();
  renderConvs();
}

function deleteConv(convId) {
  if (!confirm('Supprimer cette conversation et tous ses messages ?')) return;
  let convs = DB.get('ftr_conversations') || {};
  delete convs[convId];
  DB.set('ftr_conversations', convs);
  let msgs = getMessages();
  msgs = msgs.filter(m => m.convId !== convId);
  setMessages(msgs);
  if (currentConvId === convId) {
    currentConvId = null;
    renderChat();
  }
  renderConvs();
  toast('Conversation supprimée', 'info');
}

function formatConvTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  }
  if (diff < 172800000) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
}

// ── AI Assist Message ──
async function aiAssistMessage(action) {
  const input = document.getElementById('chatInput');
  if (!input || input.disabled) return;
  const current = input.value || '';
  const hasKey = !!getAiKey();
  const labels = { redaction: 'Rédaction', correction: 'Correction', reformulation: 'Reformulation' };

  if (hasKey) {
    const customSystem = getAiPrompt('messages', action);
    let system = '';
    let prompt = '';
    if (action === 'redaction') {
      system = customSystem || 'Tu es un professionnel en ESMS qui rédige un message interne court et professionnel. Réponds en français.';
      prompt = 'Rédige un message professionnel court pour communiquer avec un collègue en ESMS.' + (current ? '\n\nComplète ce message :\n' + current : '');
    } else if (action === 'correction') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Tu es un correcteur professionnel. Corrige les fautes sans changer le style.';
      prompt = 'Corrige ce message :\n\n' + current;
    } else if (action === 'reformulation') {
      if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
      system = customSystem || 'Tu es un rédacteur institutionnel. Reformule ce message de manière professionnelle.';
      prompt = 'Reformule ce message de manière professionnelle :\n\n' + current;
    }
    const result = await callMistral(prompt, system);
    if (result) {
      input.value = result;
      autoResizeTextarea(input);
      toast('✓ ' + labels[action] + ' (Mistral AI)', 'success');
      return;
    }
    toast('API Mistral indisponible, mode local', 'warning');
  }

  // Fallback local
  let result = '';
  if (action === 'redaction') {
    const templates = [
      'Bonjour, je vous confirme le rendez-vous de demain après-midi.',
      'Pour information, l\'atelier de jeudi est maintenu.',
      'Suite à notre échange, voici les points à retenir pour la réunion de demain.'
    ];
    result = current ? current + '\n\n' + templates[Math.floor(Math.random() * templates.length)] : templates[Math.floor(Math.random() * templates.length)];
  } else if (action === 'correction') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current.replace(/\bils on\b/g, 'ils ont').replace(/\belle on\b/g, 'elle a').replace(/\bau jour d\'aujourd\'hui\b/g, 'actuellement');
  } else if (action === 'reformulation') {
    if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
    result = current.replace(/\bveut\b/g, 'souhaite').replace(/\bpeut\b/g, 'est en mesure de').replace(/\bva\b/g, 'envisage de');
  }

  if (result) {
    input.value = result;
    autoResizeTextarea(input);
    toast('✓ ' + labels[action] + ' (mode local)', 'success');
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(36, el.scrollHeight) + 'px';
}

// ── INIT ──
function initMessages() {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => autoResizeTextarea(chatInput));
  }
  const session = Auth.getSession();
  let allMsgs = getMessages();
  let changed = false;
  allMsgs.forEach(m => {
    if (!Array.isArray(m.readBy)) {
      m.readBy = [];
      changed = true;
    }
  });
  if (changed) setMessages(allMsgs);
  renderConvs();
  renderChat();
}
document.addEventListener('DOMContentLoaded', initMessages);
if (typeof registerPageInit === 'function') registerPageInit('messages', initMessages);
