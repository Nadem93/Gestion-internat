// ── INTERVENTIONS TECHNIQUES — DESIGN V2 ──────────────────────────────
// Rendu sombre « bento » repris du langage visuel de la maquette
// « Portail – refonte (bento) » : tuiles statistiques, chips de filtre,
// cartes de liste à puce colorée, compteurs à barre de progression.
//
// Les données et les actions restent celles de la page :
// getInterventionsCache() / sbSaveIntervention() (js/interventions-supabase.js),
// openPhotoModal(), marquerFaitSansPhoto(), validerIntervention().
// Ce module ne fait que le rendu.

const INT2_IC = {
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  checkC: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  cam:   '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  user:  '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  pin:   '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  lock:  '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  down:  '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  right: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  up:    '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  bolt:  '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
};

// Couleur + libellé + icône par niveau d'urgence (clés de la base)
const INT2_URG = {
  basse:    { l: 'Basse',    c: '#64748b', ic: INT2_IC.down },
  normale:  { l: 'Normale',  c: '#3b82f6', ic: INT2_IC.right },
  haute:    { l: 'Haute',    c: '#f59e0b', ic: INT2_IC.up },
  critique: { l: 'Critique', c: '#ef4444', ic: INT2_IC.bolt }
};
const INT2_ORDRE = ['critique', 'haute', 'normale', 'basse'];

// État des filtres de la page (non persisté)
const int2State = { statut: 'ouverte', urgence: 'toutes', q: '' };

function _int2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function _int2Esc(s) {
  return (typeof escHtml === 'function') ? escHtml(s == null ? '' : String(s)) : String(s == null ? '' : s);
}
function _int2Urg(u) { return INT2_URG[u] || INT2_URG.normale; }

function _int2DateStr(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
       + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Rendu principal ───────────────────────────────────────────────────
function int2Render() {
  const host = document.getElementById('pageContent');
  if (!host) return;

  const sess = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  // Bouton « Marquer comme fait » (clôture sans photo) : réservé au rôle admin,
  // exactement comme dans la version précédente de la page. Aucun élargissement.
  const isAdmin = !!sess && sess.role === 'admin';

  const all = (typeof getInterventionsCache === 'function' ? getInterventionsCache() : []).slice().reverse();
  const ouvertes = all.filter(i => i.statut === 'ouverte');
  const traitees = all.filter(i => i.statut === 'traitee');
  const critiques = ouvertes.filter(i => i.urgence === 'critique');

  host.className = 'int2';
  host.innerHTML = `
    <div class="int2-intro">
      Demandes techniques et de maintenance signalées depuis l'accueil.
      Chaque intervention se clôture en <strong>joignant une photo des travaux</strong>,
      qui reste attachée au dossier comme preuve de réalisation.
    </div>

    <div class="int2-stats">
      ${_int2Stat(INT2_IC.clock,  '#f59e0b', '#fbbf24', ouvertes.length,  'En attente', 'à planifier')}
      ${_int2Stat(INT2_IC.checkC, '#16a34a', '#4ade80', traitees.length,  'Traitées',   'clôturées avec suivi')}
      ${_int2Stat(INT2_IC.alert,  '#ef4444', '#f87171', critiques.length, 'Critiques',  'à traiter en priorité')}
      ${_int2Stat(INT2_IC.wrench, '#0d9488', '#2dd4bf', all.length,       'Total',      'depuis l\'ouverture')}
    </div>

    <div class="int2-bar">
      ${_int2Chip('statut', 'ouverte', 'En attente', '#f59e0b', ouvertes.length)}
      ${_int2Chip('statut', 'traitee', 'Traitées', '#10b981', traitees.length)}
      ${_int2Chip('statut', 'toutes', 'Toutes', '', all.length)}
      <span style="width:1px;height:22px;background:var(--v2-b-ctrl)"></span>
      ${_int2Chip('urgence', 'toutes', 'Toute urgence', '', null)}
      ${INT2_ORDRE.map(u => _int2Chip('urgence', u, INT2_URG[u].l, INT2_URG[u].c, null)).join('')}
      <div class="int2-search">
        ${_int2Svg(INT2_IC.search)}
        <input type="search" id="int2Q" placeholder="Rechercher un lieu, une description…" value="${_int2Esc(int2State.q)}"/>
      </div>
    </div>

    <div class="int2-grid">
      <div><div id="int2List"></div></div>
      <div class="int2-side">
        <div class="v2-blk">
          <div class="v2-blk-h"><span class="v2-blk-t">Répartition par urgence</span></div>
          ${_int2Repartition(ouvertes)}
        </div>
        <div class="v2-blk">
          <div class="v2-blk-h"><span class="v2-blk-t">Lieux les plus signalés</span></div>
          ${_int2Lieux(all)}
        </div>
      </div>
    </div>`;

  const q = document.getElementById('int2Q');
  if (q) {
    q.addEventListener('input', e => {
      int2State.q = e.target.value;
      _int2Liste(isAdmin);
    });
  }
  _int2Liste(isAdmin);
}

function _int2Stat(ic, c, c2, n, label, sub) {
  return `<div class="int2-stat">
    <span class="int2-stat-i" style="--pc:${c};--pc2:${c2}">${_int2Svg(ic, 2)}</span>
    <div class="int2-stat-n">${n}</div>
    <div class="int2-stat-l">${_int2Esc(label)}</div>
    <div class="int2-stat-s">${_int2Esc(sub)}</div>
  </div>`;
}

function _int2Chip(champ, val, label, couleur, n) {
  const on = int2State[champ] === val;
  return `<button type="button" class="v2-chip-f${on ? ' on' : ''}" onclick="int2SetFiltre('${champ}','${val}')">
    ${couleur ? `<span class="dot" style="background:${couleur}"></span>` : ''}
    ${_int2Esc(label)}${n === null || n === undefined ? '' : ` <span class="n">${n}</span>`}
  </button>`;
}

function int2SetFiltre(champ, val) {
  int2State[champ] = val;
  int2Render();
}

// ── Liste filtrée ─────────────────────────────────────────────────────
function _int2Liste(isAdmin) {
  const wrap = document.getElementById('int2List');
  if (!wrap) return;

  const all = (typeof getInterventionsCache === 'function' ? getInterventionsCache() : []).slice().reverse();
  const q = int2State.q.trim().toLowerCase();

  const rows = all.filter(i => {
    if (int2State.statut !== 'toutes' && i.statut !== int2State.statut) return false;
    if (int2State.urgence !== 'toutes' && (i.urgence || 'normale') !== int2State.urgence) return false;
    if (q) {
      const t = [i.lieu, i.desc, i.demandePar, i.traitePar].filter(Boolean).join(' ').toLowerCase();
      if (!t.includes(q)) return false;
    }
    return true;
  });

  // Priorité de lecture : les demandes ouvertes d'abord, les plus urgentes en
  // tête, puis à urgence égale la plus ancienne (celle qui attend depuis le
  // plus longtemps). L'historique reste antéchronologique.
  const rang = i => INT2_ORDRE.indexOf(i.urgence || 'normale');
  const t = i => { const d = new Date(i.date); return isNaN(d) ? 0 : d.getTime(); };
  rows.sort((a, b) => {
    if (a.statut !== b.statut) return a.statut === 'ouverte' ? -1 : 1;
    if (a.statut === 'ouverte') {
      const r = (rang(a) < 0 ? 99 : rang(a)) - (rang(b) < 0 ? 99 : rang(b));
      if (r) return r;
      return t(a) - t(b);
    }
    return t(b) - t(a);
  });

  const titre = int2State.statut === 'traitee' ? 'Historique'
              : int2State.statut === 'toutes'  ? 'Toutes les interventions'
              : 'En attente';
  const ic = int2State.statut === 'traitee' ? INT2_IC.checkC : INT2_IC.wrench;

  wrap.innerHTML = `
    <div class="int2-sec">${_int2Svg(ic)} ${_int2Esc(titre)} <span class="n">${rows.length}</span></div>
    ${rows.length
      ? `<div class="int2-list">${rows.map(i => _int2Card(i, isAdmin)).join('')}</div>`
      : `<div class="int2-vide">${_int2Svg(INT2_IC.checkC)}<div>Aucune intervention ne correspond à ces filtres.</div></div>`}`;
}

function _int2Card(i, isAdmin) {
  const u = _int2Urg(i.urgence);
  const done = i.statut === 'traitee';
  const meta = [];
  if (i.date) meta.push(`${_int2Svg(INT2_IC.cal)} ${_int2Esc(_int2DateStr(i.date))}`);
  if (i.demandePar) meta.push(`${_int2Svg(INT2_IC.user)} ${_int2Esc(i.demandePar)}`);

  return `<div class="int2-card${done ? ' done' : ''}" style="--pc:${u.c}">
    <div class="int2-card-h">
      <span class="int2-card-i">${_int2Svg(u.ic, 2.2)}</span>
      <div style="flex:1;min-width:0">
        <div class="int2-tt">
          <span class="int2-lieu">${_int2Esc(i.lieu || '—')}</span>
          <span class="v2-badge" style="background:${u.c}22;color:${u.c}">${_int2Esc(u.l)}</span>
          ${done
            ? '<span class="v2-badge v2-b-ok">Fait</span>'
            : '<span class="v2-badge v2-b-warn">En attente</span>'}
        </div>
        <div class="int2-desc">${_int2Esc(i.desc || '')}</div>
        ${meta.length ? `<div class="int2-meta">${meta.join('<span class="sep">·</span>')}</div>` : ''}
      </div>
    </div>
    ${i.photoTravaux ? `
      <div class="int2-photo">
        <div class="int2-photo-l">Photo des travaux</div>
        <img src="${_int2Esc(i.photoTravaux)}" alt="Photo des travaux réalisés"/>
        ${i.commentaireTravaux ? `<div class="int2-photo-c">« ${_int2Esc(i.commentaireTravaux)} »</div>` : ''}
        ${i.traitePar ? `<div class="int2-photo-by">${_int2Svg(INT2_IC.check)} Clôturé par ${_int2Esc(i.traitePar)}</div>` : ''}
      </div>` : (done && i.traitePar
        ? `<div class="int2-photo-by">${_int2Svg(INT2_IC.check)} Clôturé par ${_int2Esc(i.traitePar)}${i.commentaireTravaux ? ' — « ' + _int2Esc(i.commentaireTravaux) + ' »' : ''}</div>`
        : '')}
    ${!done ? `
      <div class="int2-act">
        <button type="button" class="v2-btn v2-btn-sm" onclick="openPhotoModal('${_int2Esc(i.id)}')">
          ${_int2Svg(INT2_IC.cam)} Joindre une photo
        </button>
        ${isAdmin ? `<button type="button" class="int2-btn-ok" onclick="marquerFaitSansPhoto('${_int2Esc(i.id)}')">
          ${_int2Svg(INT2_IC.check, 2.4)} Marquer comme fait
        </button>` : ''}
      </div>` : ''}
  </div>`;
}

// ── Panneaux latéraux ─────────────────────────────────────────────────
function _int2Repartition(ouvertes) {
  if (!ouvertes.length) return '<div class="v2-blk-vide">Aucune intervention en attente.</div>';
  const total = ouvertes.length;
  return INT2_ORDRE.map(k => {
    const n = ouvertes.filter(i => (i.urgence || 'normale') === k).length;
    const pct = Math.round(n / total * 100);
    return `<div class="int2-cnt">
      <div class="int2-cnt-h">
        <span class="int2-cnt-l">${INT2_URG[k].l}</span>
        <span class="int2-cnt-v" style="--pc:${INT2_URG[k].c}">${n}</span>
      </div>
      <div class="v2-prog"><span style="width:${pct}%;background:${INT2_URG[k].c}"></span></div>
      <div class="int2-cnt-s">${pct}% des demandes ouvertes</div>
    </div>`;
  }).join('');
}

function _int2Lieux(all) {
  const par = {};
  all.forEach(i => {
    const l = (i.lieu || '').trim();
    if (!l) return;
    if (!par[l]) par[l] = { n: 0, ouvertes: 0 };
    par[l].n++;
    if (i.statut === 'ouverte') par[l].ouvertes++;
  });
  const rows = Object.keys(par).map(l => ({ l, ...par[l] }))
    .sort((a, b) => b.n - a.n || a.l.localeCompare(b.l)).slice(0, 5);
  if (!rows.length) return '<div class="v2-blk-vide">Aucun lieu renseigné.</div>';

  return rows.map(r => `<div class="int2-lieu-r">
    <span class="int2-lieu-i">${_int2Svg(INT2_IC.pin)}</span>
    <div style="flex:1;min-width:0">
      <div class="int2-lieu-n">${_int2Esc(r.l)}</div>
      <div class="int2-lieu-s">${r.ouvertes} en attente</div>
    </div>
    <span class="int2-lieu-c">${r.n} signalement${r.n > 1 ? 's' : ''}</span>
  </div>`).join('');
}

// ── Écran d'accès restreint (habillage V2 du garde existant) ──────────
function int2AccesRefuse() {
  const host = document.getElementById('pageContent');
  if (!host) return;
  host.className = 'int2';
  host.innerHTML = `<div class="int2-lock">
    <div class="int2-lock-i">${_int2Svg(INT2_IC.lock, 2)}</div>
    <h3>Accès restreint</h3>
    <p>Cette page est réservée aux administrateurs et aux techniciens de maintenance.</p>
    <a href="accueil.html" class="v2-btn-pri" style="display:inline-flex;padding:0 20px">Retour à l'accueil</a>
  </div>`;
}

// ── Nouvelle demande d'intervention ───────────────────────────────────
function int2OpenNouvelle() {
  const l = document.getElementById('niLieu'); if (l) l.value = '';
  const d = document.getElementById('niDesc'); if (d) d.value = '';
  int2SetUrgence('normale');
  // Propose les chambres déjà connues comme suggestions de lieu
  const dl = document.getElementById('niLieux');
  if (dl) {
    const lieux = [...new Set((typeof getInterventionsCache === 'function' ? getInterventionsCache() : [])
      .map(i => (i.lieu || '').trim()).filter(Boolean))].sort();
    dl.innerHTML = lieux.map(x => `<option value="${_int2Esc(x)}"></option>`).join('');
  }
  if (typeof openModal === 'function') openModal('modalNouvelleInt');
}

function int2SetUrgence(u) {
  document.querySelectorAll('#niUrgence .v2-seg-o').forEach(b => {
    b.classList.toggle('on', b.dataset.u === u);
  });
  const h = document.getElementById('niUrgenceVal');
  if (h) h.value = u;
}

async function int2SaveNouvelle() {
  const lieu = (document.getElementById('niLieu').value || '').trim();
  const desc = (document.getElementById('niDesc').value || '').trim();
  const urgence = document.getElementById('niUrgenceVal').value || 'normale';
  if (!lieu || !desc) { toast('Renseignez le lieu et la description', 'error'); return; }

  const sess = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const demandePar = sess ? ([sess.prenom, sess.nom].filter(Boolean).join(' ') || sess.username || '') : '';

  const btn = document.getElementById('niSave');
  if (btn) btn.disabled = true;
  try {
    await sbSaveIntervention({ lieu, desc, urgence, statut: 'ouverte', demandePar });
    await loadInterventionsCache();
  } catch (e) {
    console.error('[int2SaveNouvelle]', e);
    toast('Erreur lors de l\'enregistrement de la demande', 'error');
    return;
  } finally {
    if (btn) btn.disabled = false;
  }
  if (typeof closeModal === 'function') closeModal('modalNouvelleInt');
  toast('Demande d\'intervention enregistrée', 'success');
  int2Render();
}

// ── Publication explicite sur window ──────────────────────────────────
// (les onclick en ligne et la navigation en iframe lisent window)
window.int2Render = int2Render;
window.int2SetFiltre = int2SetFiltre;
window.int2AccesRefuse = int2AccesRefuse;
window.int2OpenNouvelle = int2OpenNouvelle;
window.int2SetUrgence = int2SetUrgence;
window.int2SaveNouvelle = int2SaveNouvelle;

// ── DÉLÉGATION : le rendu historique de la page passe par le module V2 ──
if (typeof renderPage === 'function') { window.renderPage = int2Render; }
