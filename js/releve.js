// ── RELÈVE / TRANSMISSIONS D'ÉQUIPE ──
// Synthèse automatique depuis la dernière relève + transmission rédigée + accusés de lecture

function getReleves() { return DB.get(DB.keys.releves) || []; }
function saveReleves(list) { DB.set(DB.keys.releves, list); }

const REL_EQUIPES = { matin: '🌅 Matin', apresmidi: '🌇 Après-midi', nuit: '🌙 Nuit' };

function relLast() {
  const list = getReleves();
  return list.length ? list.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
}

// ── Synthèse automatique depuis la dernière relève ──
function relDigest() {
  const last = relLast();
  const since = last ? last.createdAt : new Date(Date.now() - 24 * 3600000).toISOString();
  const sinceTime = new Date(since).getTime();
  const s = Auth.getSession();
  const canConf = e => e.visibilite !== 'confidentiel' || s?.role === 'admin' || String(e.authorId) === String(s?.userId);

  // Journal depuis la dernière relève
  const journal = (DB.get(DB.keys.journal) || []).filter(e =>
    canConf(e) && new Date(e.createdAt || e.date).getTime() > sinceTime
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Incidents non classés depuis
  const incidents = (DB.get(DB.keys.incidents) || []).filter(e =>
    e.statut !== 'classe' && new Date(e.createdAt || e.date).getTime() > sinceTime
  );

  // Sorties en cours / en retard (état actuel, pas borné à la période)
  const residents = DB.get(DB.keys.residents) || [];
  const sortiesActives = [];
  residents.forEach(r => {
    (r.sorties || []).forEach(so => {
      if (so.retourEffectif) return;
      const retard = so.retourPrevuDate && new Date(so.retourPrevuDate + 'T' + (so.retourPrevuHeure || '23:59')) < new Date();
      sortiesActives.push({ r, so, retard });
    });
  });

  // RDV des prochaines 24 h (planning + santé)
  const now = new Date(), in24 = new Date(Date.now() + 24 * 3600000);
  const rdv24 = [];
  (DB.get(DB.keys.planning) || []).forEach(e => {
    const d = new Date((e.date || '') + 'T' + (e.time || '09:00'));
    if (d >= now && d <= in24) rdv24.push({ titre: e.titre || 'Événement', date: e.date, time: e.time, who: e.residentName || '' });
  });

  // Échéances urgentes (si module présent)
  let echUrgentes = [];
  if (DB.keys.echeances) {
    const td = today();
    echUrgentes = (DB.get(DB.keys.echeances) || []).filter(e => {
      if (e.done) return false;
      const diff = Math.ceil((new Date(e.date) - new Date(td)) / 86400000);
      return diff <= 30;
    });
  }

  return { since, last, journal, incidents, sortiesActives, rdv24, echUrgentes };
}

function renderDigest() {
  const d = relDigest();
  const cats = DB.get(DB.keys.categories) || [];
  const box = document.getElementById('relDigest');
  const sec = (title, items, empty) => `
    <div style="margin-bottom:.9rem">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.35rem">${title}</div>
      ${items.length ? `<div style="display:flex;flex-direction:column;gap:.3rem">${items.join('')}</div>` : `<div style="font-size:.78rem;color:var(--g400)">${empty}</div>`}
    </div>`;
  const row = (icon, main, sub, color) => `
    <div style="display:flex;gap:.55rem;align-items:flex-start;padding:.45rem .6rem;background:var(--g50);border:1px solid var(--border);border-radius:var(--r-sm)">
      <span style="flex-shrink:0">${icon}</span>
      <div style="flex:1;min-width:0;font-size:.8rem;line-height:1.45">
        <span style="font-weight:600;${color ? 'color:' + color : ''}">${main}</span>
        ${sub ? `<div style="font-size:.72rem;color:var(--muted)">${sub}</div>` : ''}
      </div>
    </div>`;

  box.innerHTML = `
    <div style="font-size:.78rem;color:var(--muted);margin-bottom:.85rem">
      Depuis ${d.last ? `la relève de <strong>${escHtml(d.last.author)}</strong> (${formatDateTime(d.since)})` : 'les dernières 24 h'} :
    </div>
    ${sec(`📔 Journal (${d.journal.length})`, d.journal.slice(0, 10).map(e => {
      const cat = cats.find(c => String(c.id) === String(e.categorie));
      return row('•', `${escHtml(e.resident || '—')}${cat ? ` <span class="badge" style="background:${cat.color}22;color:${cat.color};font-size:.62rem">${escHtml(cat.name)}</span>` : ''}`, escHtml((e.contenu || '').slice(0, 110)));
    }), 'Aucune observation depuis la dernière relève.')}
    ${sec(`⚠️ Incidents (${d.incidents.length})`, d.incidents.map(e =>
      row('⚠️', `${escHtml(e.titre || e.type || 'Incident')} <span class="badge badge-${['grave','critique'].includes(e.gravite)?'red':'amber'}" style="font-size:.62rem">${escHtml(e.gravite || '')}</span>`, `${escHtml(e.residentName || '')} · ${formatDate(e.date)}`, '#dc2626')
    ), 'Aucun incident.')}
    ${sec(`🚪 Sorties en cours (${d.sortiesActives.length})`, d.sortiesActives.map(x =>
      row('🚪', `${escHtml(`${x.r.prenom || ''} ${x.r.nom || ''}`.trim())} — ${escHtml(x.so.destination || 'sortie')}${x.retard ? ' <span class="badge badge-red" style="font-size:.62rem">EN RETARD</span>' : ''}`,
        x.so.retourPrevuDate ? `Retour prévu : ${formatDate(x.so.retourPrevuDate)}${x.so.retourPrevuHeure ? ' à ' + x.so.retourPrevuHeure : ''}` : '', x.retard ? '#dc2626' : '')
    ), 'Tous les résidents sont rentrés.')}
    ${sec(`📅 Dans les 24 h (${d.rdv24.length})`, d.rdv24.slice(0, 8).map(e =>
      row('📅', escHtml(e.titre), `${formatDate(e.date)}${e.time ? ' à ' + e.time : ''}${e.who ? ' · ' + escHtml(e.who) : ''}`)
    ), 'Rien de planifié.')}
    ${d.echUrgentes.length ? sec(`⏰ Échéances sous 30 j (${d.echUrgentes.length})`, d.echUrgentes.slice(0, 6).map(e =>
      row('⏰', escHtml(e.libelle || e.type), `${formatDate(e.date)}${e.residentName ? ' · ' + escHtml(e.residentName) : ''}`, '#d97706')
    ), '') : ''}`;
}

// ── Transmissions ──
function renderReleves() {
  const list = [...getReleves()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const s = Auth.getSession();
  const el = document.getElementById('relList');
  if (!list.length) {
    el.innerHTML = '<div style="font-size:.82rem;color:var(--g400);padding:1rem">Aucune transmission. Rédigez la première relève ci-dessus.</div>';
    return;
  }
  el.innerHTML = list.slice(0, 25).map(r => {
    const readBy = r.readBy || [];
    const iRead = readBy.some(x => String(x.userId) === String(s?.userId));
    const mine = String(r.authorId) === String(s?.userId);
    return `<div class="card" style="${!iRead && !mine ? 'border-left:3px solid #3b82f6' : ''}">
      <div class="card-body" style="padding:.85rem 1.1rem;display:flex;flex-direction:column;gap:.5rem">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <span style="font-weight:700;font-size:.85rem">${escHtml(r.author || '?')}</span>
          ${r.equipe ? `<span class="badge badge-gray">${REL_EQUIPES[r.equipe] || r.equipe}</span>` : ''}
          <span style="font-size:.72rem;color:var(--muted)">${formatDateTime(r.createdAt)}</span>
          ${!iRead && !mine ? '<span class="badge badge-blue">Non lu</span>' : ''}
        </div>
        <p style="font-size:.85rem;line-height:1.7;white-space:pre-wrap;margin:0">${escHtml(r.contenu)}</p>
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:.5rem">
          <span style="font-size:.7rem;color:var(--muted)">Lu par :</span>
          ${readBy.length ? readBy.map(x => `<span class="badge badge-green" style="font-size:.64rem" title="${formatDateTime(x.at)}">✓ ${escHtml(x.name)}</span>`).join('') : '<span style="font-size:.72rem;color:var(--g400)">personne</span>'}
          ${!iRead && !mine ? `<button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="relMarkRead('${r.id}')">✓ J'ai lu</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function relMarkRead(id) {
  const s = Auth.getSession();
  if (!s) return;
  const name = [s.prenom, s.nom].filter(Boolean).join(' ') || s.username;
  saveReleves(getReleves().map(r => {
    if (r.id !== id) return r;
    const readBy = r.readBy || [];
    if (readBy.some(x => String(x.userId) === String(s.userId))) return r;
    return { ...r, readBy: [...readBy, { userId: s.userId, name, at: new Date().toISOString() }] };
  }));
  renderReleves();
}

function relSave() {
  const contenu = document.getElementById('relContenu').value.trim();
  if (!contenu) { toast('Rédigez votre transmission', 'error'); return; }
  const s = Auth.getSession();
  const list = getReleves();
  list.push({
    id: genId(),
    equipe: document.getElementById('relEquipe').value,
    contenu,
    author: s ? [s.prenom, s.nom].filter(Boolean).join(' ') || s.username : '?',
    authorId: s?.userId,
    readBy: [],
    createdAt: new Date().toISOString()
  });
  saveReleves(list);
  if (typeof auditLog === 'function') auditLog('releve_create', 'Transmission de relève');
  document.getElementById('relContenu').value = '';
  toast('Transmission enregistrée ✓');
  renderReleves();
  renderDigest();
}

// Pré-remplit la transmission à partir de la synthèse
function relPrefill() {
  const d = relDigest();
  const L = [];
  if (d.incidents.length) L.push(`Incidents : ${d.incidents.map(e => `${e.titre || e.type}${e.residentName ? ' (' + e.residentName + ')' : ''}`).join(' ; ')}.`);
  if (d.sortiesActives.length) L.push(`Sorties en cours : ${d.sortiesActives.map(x => `${x.r.prenom || ''} ${x.r.nom || ''}`.trim() + (x.retard ? ' (EN RETARD)' : '')).join(', ')}.`);
  if (d.rdv24.length) L.push(`À venir (24 h) : ${d.rdv24.slice(0, 5).map(e => `${e.titre}${e.who ? ' — ' + e.who : ''}`).join(' ; ')}.`);
  if (d.echUrgentes.length) L.push(`Échéances proches : ${d.echUrgentes.slice(0, 4).map(e => e.libelle || e.type).join(' ; ')}.`);
  const ta = document.getElementById('relContenu');
  ta.value = (ta.value ? ta.value + '\n\n' : '') + (L.length ? L.join('\n') : 'Rien à signaler sur la période.');
  ta.focus();
}

function initReleve() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_journal')) return;
  // Équipe par défaut selon l'heure
  const h = new Date().getHours();
  const eq = document.getElementById('relEquipe');
  if (eq) eq.value = h < 13 ? 'matin' : h < 21 ? 'apresmidi' : 'nuit';
  renderDigest();
  renderReleves();
}
document.addEventListener('DOMContentLoaded', initReleve);
