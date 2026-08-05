// ── MESSAGES — DESIGN V2 ──────────────────────────────────────────────
// Reproduit la maquette « Messages - refonte (bento) » : colonne de
// conversations (avatar rond, aperçu, pastille de non-lus, épingle, filtres
// Tous / Non lues / Épinglées) et fil de discussion (bulles asymétriques,
// accusés de lecture, séparateur de date en pilule, barre de saisie ronde).
//
// Les données et les actions restent celles de js/messages.js et
// js/messages-supabase.js : ce module ne fait que remplacer le RENDU
// (renderConvs / renderChat) et la présentation de la modale de composition.
//
// UNE DONNÉE DE LA MAQUETTE N'EXISTAIT PAS EN BASE : les conversations
// ÉPINGLÉES. Elle est créée par migration-messages.sql (table
// public.messages_epingles). Tant que ce fichier n'a pas été exécuté, la page
// reste PLEINEMENT utilisable : aucune conversation n'apparaît épinglée, le
// filtre « Épinglées » reste vide et toute tentative d'épinglage affiche un
// toast nommant le fichier SQL.
//
// Ce que la maquette montre et que l'application ne sait PAS produire n'est
// pas affiché : présence « en ligne », « en train d'écrire… » et pièces
// jointes n'ont aucune source — rien n'est inventé.

const MS2_SQL = 'migration-messages.sql';

let MS2_FILTRE = 'all';          // 'all' | 'unread' | 'pinned'
let MS2_PINS = new Set();        // conv_id épinglés par le compte connecté
let MS2_PINS_OK = true;          // false = table absente (migration non exécutée)

// Palette de la maquette, assignée de façon déterministe par identifiant :
// deux rendus successifs donnent la même couleur à la même personne.
const MS2_COULEURS = ['#818cf8', '#22d3ee', '#f59e0b', '#10b981', '#ec4899', '#a78bfa', '#38bdf8', '#64748b'];
const MS2_GROUPE_C = '#f59e0b';

function ms2Couleur(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return MS2_COULEURS[h % MS2_COULEURS.length];
}

function ms2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
const MS2_IC = {
  pin:   '<path d="M12 17v5M9 10.76V6a3 3 0 0 1 6 0v4.76a2 2 0 0 0 .59 1.42l1.12 1.12A2 2 0 0 1 17 16H7a2 2 0 0 1-1.71-2.7l1.12-1.12A2 2 0 0 0 9 10.76z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  lu:    '<polyline points="20 6 9 17 4 12"/><polyline points="23 6 12.5 17"/>',
  envoye:'<polyline points="20 6 9 17 4 12"/>',
  mail:  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
};

// ── Identité affichée d'un compte ─────────────────────────────────────
function ms2Nom(u) {
  if (!u) return 'Inconnu';
  return `${u.prenom || ''} ${u.nom || ''}`.trim() || u.username || 'Inconnu';
}
function ms2Ini(u) {
  if (!u) return '?';
  const i = ((u.prenom || '')[0] || '') + ((u.nom || '')[0] || '');
  return (i || (u.username || '?')[0] || '?').toUpperCase();
}
function ms2User(id) {
  return getUsers().find(x => String(x.id) === String(id));
}

// ── Épinglage (table créée par migration-messages.sql) ────────────────
async function ms2Uid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return data && data.user ? data.user.id : null;
  } catch (e) { return null; }
}

async function ms2LoadPins() {
  MS2_PINS = new Set();
  try {
    const { data, error } = await supabaseClient.from('messages_epingles').select('conv_id');
    if (error) throw error;
    MS2_PINS_OK = true;
    (data || []).forEach(r => MS2_PINS.add(r.conv_id));
  } catch (e) {
    MS2_PINS_OK = false;
    console.warn('[messages-v2] table messages_epingles absente — exécutez ' + MS2_SQL, e && (e.message || e));
  }
}

async function ms2TogglePin(cid) {
  if (!cid) return;
  if (!MS2_PINS_OK) {
    toast('Épinglage indisponible : le fichier ' + MS2_SQL + ' n\'a pas encore été exécuté.', 'error');
    return;
  }
  const uid = await ms2Uid();
  if (!uid) { toast('Session Supabase introuvable : épinglage impossible.', 'error'); return; }
  const etait = MS2_PINS.has(cid);
  try {
    if (etait) {
      const { error } = await supabaseClient.from('messages_epingles')
        .delete().eq('conv_id', cid).eq('profile_id', uid);
      if (error) throw error;
      MS2_PINS.delete(cid);
    } else {
      const etablissementId = await sbGetEtablissementId();
      const { error } = await supabaseClient.from('messages_epingles')
        .insert({ etablissement_id: etablissementId, profile_id: uid, conv_id: cid });
      if (error) throw error;
      MS2_PINS.add(cid);
    }
  } catch (e) {
    console.error('[messages-v2] épinglage', e);
    toast('Épinglage refusé : vérifiez que ' + MS2_SQL + ' a bien été exécuté.', 'error');
    return;
  }
  toast(etait ? 'Conversation désépinglée' : 'Conversation épinglée', 'info');
  renderConvs();
  ms2MajBoutonPin();
}

function ms2TogglePinCurrent() { ms2TogglePin(currentConvId); }

function ms2MajBoutonPin() {
  const b = document.getElementById('pinConvBtn');
  if (!b) return;
  const on = !!currentConvId && MS2_PINS.has(currentConvId);
  b.classList.toggle('on', on);
  b.title = on ? 'Désépingler la conversation' : 'Épingler la conversation';
}

// ── Description d'une conversation (nom, initiales, couleur) ──────────
function ms2Conv(conv, myUserId) {
  const autres = (conv.userIds || []).filter(id => String(id) !== String(myUserId));
  if (!autres.length) return { nom: 'Moi seul', ini: '#', couleur: '#64748b', groupe: false, statut: 'Notes personnelles' };
  if (autres.length === 1) {
    const u = ms2User(autres[0]);
    return {
      nom: ms2Nom(u), ini: ms2Ini(u), couleur: ms2Couleur(autres[0]), groupe: false,
      statut: (u && u.fonction) || (u && u.role === 'admin' ? 'Administrateur' : '')
    };
  }
  const noms = autres.map(id => ms2Nom(ms2User(id)));
  return {
    nom: noms.length > 2 ? `Groupe (${noms.length})` : noms.join(', '),
    ini: 'GR', couleur: MS2_GROUPE_C, groupe: true,
    statut: `${autres.length} participants`
  };
}

// ── Chips de filtre ───────────────────────────────────────────────────
function ms2RenderChips(nbNonLues, nbEpinglees) {
  const el = document.getElementById('msChips');
  if (!el) return;
  const defs = [
    { id: 'all', l: 'Toutes', n: null },
    { id: 'unread', l: 'Non lues', n: nbNonLues },
    { id: 'pinned', l: 'Épinglées', n: nbEpinglees }
  ];
  el.innerHTML = defs.map(d => `<button type="button" class="v2-chip-f${MS2_FILTRE === d.id ? ' on' : ''}" onclick="ms2SetFiltre('${d.id}')">${d.l}${d.n === null ? '' : `<span class="n">${d.n}</span>`}</button>`).join('');
}

function ms2SetFiltre(f) {
  MS2_FILTRE = f;
  renderConvs();
}

// ── LISTE DES CONVERSATIONS ───────────────────────────────────────────
function ms2RenderConvs() {
  const session = Auth.getSession();
  const el = document.getElementById('chatConvs');
  if (!session || !el) return;

  const allMsgs = getMessages();
  const users = getUsers();
  const myUserId = String(session.userId);
  const q = (document.getElementById('convSearch')?.value || '').trim().toLowerCase();

  // Conversations dont je fais partie, indexées par interlocuteur unique.
  const parUser = {};
  const groupes = [];
  Object.values(_convCache).forEach(c => {
    const ids = (c.userIds || []).map(String);
    if (!ids.includes(myUserId)) return;
    if (ids.length === 2) {
      const autre = ids.find(id => id !== myUserId);
      if (autre) parUser[autre] = c;
    } else {
      groupes.push(c);
    }
  });

  // Une entrée par conversation existante.
  const entrees = [];
  const convs = groupes.concat(Object.values(parUser));
  convs.forEach(c => {
    const d = ms2Conv(c, myUserId);
    const msgs = allMsgs.filter(m => m.convId === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const dernier = msgs[0];
    const nonLus = msgs.filter(m => String(m.from) !== myUserId && !(m.readBy || []).map(String).includes(myUserId)).length;
    entrees.push({
      convId: c.id, nom: d.nom, ini: d.ini, couleur: d.couleur,
      quand: dernier ? formatConvTime(new Date(dernier.date)) : '',
      ts: dernier ? new Date(dernier.date).getTime() : 0,
      apercu: dernier ? (dernier.body || '') : 'Aucun message',
      nonLus, epingle: MS2_PINS.has(c.id)
    });
  });

  // Collègues avec qui aucune conversation n'existe encore.
  const contacts = [];
  users.forEach(u => {
    const uid = String(u.id);
    if (uid === myUserId || parUser[uid]) return;
    contacts.push({
      userId: uid, nom: ms2Nom(u), ini: ms2Ini(u), couleur: ms2Couleur(uid),
      quand: '', apercu: u.fonction || 'Démarrer une conversation', nonLus: 0, epingle: false
    });
  });

  const nbNonLues = entrees.filter(e => e.nonLus > 0).length;
  const nbEpinglees = entrees.filter(e => e.epingle).length;
  ms2RenderChips(nbNonLues, nbEpinglees);

  const matche = e => !q || e.nom.toLowerCase().includes(q) || (e.apercu || '').toLowerCase().includes(q);

  let visibles = entrees.filter(matche);
  if (MS2_FILTRE === 'unread') visibles = visibles.filter(e => e.nonLus > 0);
  else if (MS2_FILTRE === 'pinned') visibles = visibles.filter(e => e.epingle);
  visibles.sort((a, b) => (b.epingle - a.epingle) || (b.ts - a.ts) || a.nom.localeCompare(b.nom));

  const visContacts = MS2_FILTRE === 'all' ? contacts.filter(matche).sort((a, b) => a.nom.localeCompare(b.nom)) : [];

  let html = visibles.map(e => ms2LigneConv(e, false)).join('');
  if (visContacts.length) {
    html += `<div class="ms-grp">Autres collègues</div>` + visContacts.map(e => ms2LigneConv(e, true)).join('');
  }

  if (!html) {
    const vide = q ? 'Aucune conversation ni collègue ne correspond à cette recherche.'
      : MS2_FILTRE === 'unread' ? 'Aucun message non lu.'
      : MS2_FILTRE === 'pinned' ? (MS2_PINS_OK
          ? 'Aucune conversation épinglée — utilisez l\'épingle d\'une conversation pour la garder en haut de liste.'
          : `Épinglage indisponible : le fichier ${MS2_SQL} n'a pas encore été exécuté.`)
      : 'Aucun collègue avec un compte de connexion. Créez un accès depuis Administration → Employés.';
    html = `<div class="ms-side-vide">${vide}</div>`;
  }
  el.innerHTML = html;

  const mcEl = document.getElementById('memberCount');
  if (mcEl) mcEl.textContent = `(${users.filter(u => String(u.id) !== myUserId).length})`;
}

function ms2LigneConv(e, estContact) {
  const actif = !estContact && currentConvId === e.convId;
  const clic = estContact ? `openUserChat('${escAttr(e.userId)}')` : `selectConv('${escAttr(e.convId)}')`;
  const actions = estContact ? '' : `<div class="ms-conv-act">
      <button type="button" class="${e.epingle ? 'on' : ''}" title="${e.epingle ? 'Désépingler' : 'Épingler'}" aria-label="${e.epingle ? 'Désépingler' : 'Épingler'}" onclick="event.stopPropagation();ms2TogglePin('${escAttr(e.convId)}')">${ms2Svg(MS2_IC.pin, e.epingle ? 1.6 : 2)}</button>
      <button type="button" class="rm" title="Supprimer" aria-label="Supprimer la conversation" onclick="event.stopPropagation();deleteConv('${escAttr(e.convId)}')">${ms2Svg(MS2_IC.trash)}</button>
    </div>`;
  return `<div class="ms-conv${actif ? ' on' : ''}${e.nonLus ? ' unread' : ''}" style="--cc:${e.couleur}" role="button" tabindex="0" onclick="${clic}">
    <div class="ms-conv-av">${escHtml(e.ini)}</div>
    <div class="ms-conv-b">
      <div class="ms-conv-r1">
        ${e.epingle ? `<span class="ms-conv-pin-i">${ms2Svg(MS2_IC.pin, 1.6)}</span>` : ''}
        <span class="ms-conv-n">${escHtml(e.nom)}</span>
        <span class="ms-conv-t">${escHtml(e.quand)}</span>
      </div>
      <div class="ms-conv-r2">
        <span class="ms-conv-p">${escHtml(e.apercu)}</span>
        ${e.nonLus ? `<span class="ms-conv-u">${e.nonLus}</span>` : ''}
      </div>
    </div>
    ${actions}
  </div>`;
}

// ── FIL DE DISCUSSION ─────────────────────────────────────────────────
function ms2RenderChat() {
  const session = Auth.getSession();
  if (!session) return;
  const layout = document.querySelector('.ms-layout');
  if (layout) layout.classList.toggle('show-chat', !!currentConvId);

  const msgsEl = document.getElementById('chatMsgs');
  const headerEl = document.getElementById('chatMainHeader');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const addBtn = document.getElementById('addParticipantBtn');
  if (!msgsEl || !headerEl) return;

  if (!currentConvId) {
    headerEl.style.display = 'none';
    if (addBtn) addBtn.style.display = 'none';
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    msgsEl.innerHTML = `<div class="ms-vide">${ms2Svg(MS2_IC.mail, 1.4)}
      <p>Sélectionnez une conversation<br>ou démarrez-en une nouvelle.</p></div>`;
    ms2MajBoutonPin();
    updateConvCount();
    updateChips();
    return;
  }

  headerEl.style.display = 'flex';
  if (input) input.disabled = false;
  if (sendBtn) sendBtn.disabled = false;
  if (addBtn) addBtn.style.display = '';

  const participants = getConvParticipants(currentConvId);
  const autres = participants.filter(id => String(id) !== String(session.userId));
  const d = ms2Conv({ userIds: participants }, session.userId);

  const av = document.getElementById('chatMainAvatar');
  av.style.background = d.couleur;
  av.textContent = d.ini;
  document.getElementById('chatMainName').textContent = d.nom;
  document.getElementById('chatMainStatus').textContent = d.statut || '';
  ms2MajBoutonPin();

  const msgs = getMessages().filter(m => m.convId === currentConvId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!msgs.length) {
    msgsEl.innerHTML = `<div class="ms-vide">${ms2Svg(MS2_IC.mail, 1.4)}
      <p>Aucun message pour l'instant.<br>Écrivez le premier ci-dessous.</p></div>`;
    updateConvCount();
    updateChips();
    return;
  }

  const auj = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const moi = ms2User(session.userId);
  const nouveauxLus = [];
  let jour = '';
  let html = '';

  for (const m of msgs) {
    const dj = new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (dj !== jour) {
      jour = dj;
      html += `<div class="ms-date dc-pill dim">${dj === auj ? "Aujourd'hui" : dj}</div>`;
    }
    const perso = String(m.from) === String(session.userId);
    const auteur = perso ? moi : ms2User(m.from);
    const heure = new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const lus = (m.readBy || []).map(String);
    const nonLu = !perso && !lus.includes(String(session.userId));

    // Accusé de lecture : « Lu » quand tous les autres participants figurent
    // dans read_by, « Envoyé » sinon. Aucune notion de distribution n'existe
    // en base : on ne l'invente pas.
    let recu = '';
    if (perso) {
      const tousLus = autres.length > 0 && autres.every(id => lus.includes(String(id)));
      recu = `<span class="dc-badge ${tousLus ? 'dc-b-green' : 'dc-b-gray'} ms-m-rc${tousLus ? ' lu' : ''}">${ms2Svg(tousLus ? MS2_IC.lu : MS2_IC.envoye, 2.4)}${tousLus ? 'Lu' : 'Envoyé'}</span>`;
    }

    html += `<div class="ms-m ${perso ? 'own' : 'other'}" style="--cc:${perso ? '#22d3ee' : ms2Couleur(m.from)}">
      <div class="ms-m-av">${escHtml(perso ? ms2Ini(moi) || 'M' : ms2Ini(auteur))}</div>
      <div class="ms-m-b">
        <div class="ms-m-meta">
          <span class="ms-m-a">${escHtml(perso ? ms2Nom(moi) : ms2Nom(auteur))}</span>
          <span class="ms-m-t">${heure}</span>
          ${recu}
        </div>
        <div class="ms-bubble${nonLu ? ' neuf' : ''}">${nonLu ? '<span class="ms-neuf">Nouveau</span>' : ''}${escHtml(m.body || '')}</div>
      </div>
    </div>`;

    if (nonLu) {
      if (!m.readBy) m.readBy = [];
      m.readBy.push(session.userId);
      nouveauxLus.push(m);
    }
  }

  msgsEl.innerHTML = html;
  msgsEl.scrollTop = msgsEl.scrollHeight;
  nouveauxLus.forEach(m => sbUpdateMessageReadBy(m.id, m.readBy).catch(() => {}));
  renderConvs();
  updateConvCount();
  updateChips();
}

// ── MODALE DE COMPOSITION (gabarit .v2-ov / .v2-md) ───────────────────
function ms2OpenCompose(cid) {
  composeSelected = [];
  composeTargetConv = cid || null;
  const titre = document.querySelector('#composeOverlay h3');
  const lbl = document.getElementById('composeStartLbl');
  if (titre) titre.textContent = cid ? 'Ajouter des participants' : 'Nouveau message';
  if (lbl) lbl.textContent = cid ? 'Ajouter' : 'Démarrer';
  const rech = document.getElementById('composeSearch');
  if (rech) rech.value = '';
  renderComposeUsers();
  openModal('composeOverlay');
  setTimeout(() => rech && rech.focus(), 120);
}

function ms2CloseCompose() {
  closeModal('composeOverlay');
  composeTargetConv = null;
}

// ── Branchement : le rendu V2 remplace celui de js/messages.js ────────
window.renderConvs = ms2RenderConvs;
window.renderChat = ms2RenderChat;
window.openCompose = ms2OpenCompose;
window.closeCompose = ms2CloseCompose;

async function ms2Init() {
  await ms2LoadPins();
  renderConvs();
  renderChat();
}
document.addEventListener('DOMContentLoaded', ms2Init);
if (typeof registerPageInit === 'function') registerPageInit('messages-v2', ms2Init);
