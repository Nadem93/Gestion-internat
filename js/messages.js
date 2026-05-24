// ── DATA ──
function getMessages() { return DB.get(DB.keys.messages) || []; }
function setMessages(m) { DB.set(DB.keys.messages, m); }
function getUsers() { return DB.get(DB.keys.users) || []; }

let currentConvId = null;
let composeSelected = [];

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

  const myConvs = Object.values(convs).filter(c => c.userIds.map(String).includes(String(session.userId)));

  function convToHtml(conv) {
    const msgs = allMsgs.filter(m => m.convId === conv.id).sort((a,b) => new Date(b.date) - new Date(a.date));
    const lastMsg = msgs[0];
    const unread = msgs.some(m => m.from !== session.userId && !m.readBy?.includes(session.userId));
    const unreadCount = msgs.filter(m => m.from !== session.userId && !m.readBy?.includes(session.userId)).length;
    const otherIds = conv.userIds.filter(id => String(id) !== String(session.userId));
    const users = getUsers();

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

  let html = myConvs.map(convToHtml).filter(Boolean).join('');
  if (!html) {
    html = `<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.85rem">
      <p style="margin:0">${q ? 'Aucune conversation trouvée' : 'Aucune conversation'}</p>
      <button class="btn btn-outline btn-sm" style="margin-top:.75rem" onclick="openCompose()">Nouveau message</button>
    </div>`;
  }
  document.getElementById('chatConvs').innerHTML = html;
}

// ── SELECT CONVERSATION ──
function selectConv(id) {
  currentConvId = id;
  closeCompose();
  renderConvs();
  renderChat();
}

// ── COMPOSE ──
function openCompose() {
  composeSelected = [];
  document.getElementById('composeOverlay').style.display = 'flex';
  document.getElementById('composeSearch').value = '';
  renderComposeUsers();
  setTimeout(() => document.getElementById('composeSearch')?.focus(), 100);
}

function closeCompose() {
  document.getElementById('composeOverlay').style.display = 'none';
}

function renderComposeUsers() {
  const session = Auth.getSession();
  const users = getUsers().filter(u => String(u.id) !== String(session.userId));
  const q = (document.getElementById('composeSearch')?.value || '').trim().toLowerCase();

  const filtered = q
    ? users.filter(u => {
        const name = `${u.prenom||''} ${u.nom||''}`.toLowerCase();
        return name.includes(q) || (u.username||'').toLowerCase().includes(q) || (u.fonction||'').toLowerCase().includes(q);
      })
    : users;

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
  if (idx === -1) composeSelected.push(id);
  else composeSelected.splice(idx, 1);
  renderComposeUsers();
}

function startComposeConv() {
  if (!composeSelected.length) return;
  const session = Auth.getSession();
  const allIds = [String(session.userId), ...composeSelected];
  currentConvId = getOrCreateConv(allIds);
  closeCompose();
  renderConvs();
  renderChat();
  document.getElementById('chatInput').focus();
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

  const msgs = getConvMessages(currentConvId);
  if (!msgs.length) {
    msgsEl.innerHTML = `<div class="chat-empty"><p style="color:var(--muted)">Aucun message</p></div>`;
    updateConvCount();
    return;
  }

  let currentDate = '';
  let html = '';
  for (const m of msgs) {
    const msgDate = new Date(m.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      html += `<div class="chat-date-sep">${currentDate}</div>`;
    }
    const isOwn = String(m.from) === String(session.userId);
    const author = users.find(u => String(u.id) === String(m.from));
    const authorName = author ? `${author.prenom||''} ${author.nom||''}`.trim() || author.username : 'Inconnu';
    const time = new Date(m.date).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

    html += `<div class="chat-row ${isOwn ? 'own' : 'other'}">
      <div class="chat-bubble">
        ${!isOwn && otherIds.length > 1 ? `<div class="chat-bubble-author">${escHtml(authorName)}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px">
          <span>${escHtml(m.body)}</span>
          <span class="chat-bubble-time">${time}</span>
        </div>
      </div>
    </div>`;

    if (!isOwn && !m.readBy?.includes(session.userId)) {
      if (!m.readBy) m.readBy = [];
      m.readBy.push(session.userId);
    }
  }
  setMessages(getMessages());
  msgsEl.innerHTML = html;
  msgsEl.scrollTop = msgsEl.scrollHeight;
  updateConvCount();
}

function updateConvCount() {
  const session = Auth.getSession();
  const allMsgs = getMessages();
  const unread = allMsgs.filter(m => m.from !== session.userId && !m.readBy?.includes(session.userId)).length;
  document.getElementById('convCount').textContent = unread ? `${unread} non lu${unread>1?'s':''}` : '';
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
  return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}

// ── AI Assist Message ──
async function aiAssistMessage() {
  const input = document.getElementById('chatInput');
  if (!input || input.disabled) return;
  const current = input.value || '';
  if (!current) { toast('Écrivez d\'abord un texte', 'error'); return; }
  const hasKey = !!getAiKey();

  if (hasKey) {
    const customSystem = getAiPrompt('messages', 'reformulation');
    const system = customSystem || 'Tu es un rédacteur institutionnel. Reformule ce message de manière professionnelle.';
    const prompt = 'Reformule ce message de manière professionnelle :\n\n' + current;
    const result = await callMistral(prompt, system);
    if (result) {
      input.value = result;
      autoResizeTextarea(input);
      toast('✓ Reformulation (Mistral AI)', 'success');
      return;
    }
    toast('API Mistral indisponible, mode local', 'warning');
  }

  // Fallback local
  const result = current.replace(/\bveut\b/g, 'souhaite').replace(/\bpeut\b/g, 'est en mesure de').replace(/\bva\b/g, 'envisage de');

  if (result) {
    input.value = result;
    autoResizeTextarea(input);
    toast('✓ Reformulation (mode local)', 'success');
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(36, el.scrollHeight) + 'px';
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => autoResizeTextarea(chatInput));
  }
  renderConvs();
  renderChat();
});
