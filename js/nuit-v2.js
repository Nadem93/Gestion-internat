// ── CAHIER DE NUIT & ASTREINTE — DESIGN V2 ──
// Reproduit la maquette « Cahier de nuit (vie quotidienne) » : bandeau de
// statistiques, timeline des événements de la nuit et rail (rondes, appels à
// l'astreinte, transmission du matin, nuits précédentes).
//
// Les données, la persistance et les actions restent celles de js/nuit.js :
// ce module ne fait que le rendu.

const NT2_IC = {
  moon:  '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  eye:   '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  bed:   '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  archive: '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><line x1="10" y1="13" x2="14" y2="13"/>',
  pen:   '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pin:   '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-1.5-4.5V7a5.5 5.5 0 0 0-11 0v5.5z"/>',
  bang:  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  out:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/>'
};
function _nt2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
// Icône SVG dimensionnée (chips « Console Data » : 16px par défaut).
function _nt2Ico(d, px, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round" style="width:${px || 16}px;height:${px || 16}px">${d}</svg>`;
}
// En-tête « Console Data » réutilisable : chip coloré + eyebrow + titre (+ droite).
function _nt2DcHead(color, ico, eyebrow, titre, right) {
  return `<div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:${color}22;color:${color}">${_nt2Ico(ico, 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">${eyebrow}</div><div class="dc-title">${titre}</div></div>
    </div>${right || ''}</div>`;
}

// Couleur + pictogramme par type d'événement (les libellés viennent de
// NUIT_EVT_TYPES, défini dans js/nuit.js : une seule source de vérité).
const NT2_EVT_STYLE = {
  reveil:   { c: '#818cf8', i: NT2_IC.moon },
  angoisse: { c: '#ec4899', i: NT2_IC.heart },
  soin:     { c: '#22d3ee', i: NT2_IC.heart },
  conflit:  { c: '#f59e0b', i: NT2_IC.alert },
  fugue:    { c: '#ef4444', i: NT2_IC.alert },
  retour:   { c: '#0ea5e9', i: NT2_IC.moon },
  autre:    { c: '#8095b4', i: NT2_IC.pin }
};
const NT2_AMB_COLOR = { calme: '#10b981', agitee: '#f59e0b', tres_agitee: '#ef4444' };

// Ordre chronologique d'une NUIT : 21h → 07h. Un tri alphabétique sur « HH:MM »
// remonterait 03:00 avant 22:10 ; on repousse les heures d'après-midi en tête.
function _nt2Ord(h) {
  const m = /^(\d{1,2}):(\d{2})/.exec(h || '');
  if (!m) return 9999;
  const min = (+m[1]) * 60 + (+m[2]);
  return min >= 12 * 60 ? min - 12 * 60 : min + 12 * 60;
}
function _nt2SortH(a, b) { return _nt2Ord(a.heure) - _nt2Ord(b.heure); }

function _nt2Ini(nom) {
  return (nom || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('') || '?';
}

// Libellé court « Nuit du 19 → 20 juil. » (format de la maquette)
function _nt2LabelCourt(date) {
  const d1 = new Date(date + 'T12:00');
  const d2 = new Date(d1.getTime() + 86400000);
  const j = d => d.toLocaleDateString('fr-FR', { day: 'numeric' });
  const m = d => d.toLocaleDateString('fr-FR', { month: 'short' });
  return `Nuit du ${j(d1)} → ${j(d2)} ${m(d2)}`;
}

// Le sélecteur de date est masqué : on l'ouvre depuis le libellé.
function nt2PickDate() {
  const el = document.getElementById('ntDate');
  if (!el) return;
  if (typeof el.showPicker === 'function') { try { el.showPicker(); return; } catch (e) { /* geste requis */ } }
  el.focus();
}

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────

function nt2Render() {
  const dEl = document.getElementById('ntDate');
  if (dEl && dEl.value !== nuitDate) dEl.value = nuitDate;
  const lbl = document.getElementById('ntLabel');
  if (lbl) { lbl.textContent = _nt2LabelCourt(nuitDate); lbl.title = nuitLabel(nuitDate); }

  const n = getNuit(nuitDate);
  const canWrite = !!Auth.getSession();

  nt2RenderVeilleur(n);

  const btn = document.getElementById('ntBtnEvt');
  if (btn) btn.hidden = !(n && canWrite);

  if (!n) {
    document.getElementById('ntStats').innerHTML = '';
    document.getElementById('ntBody').innerHTML = `<div class="dc-card nt2-vide">
      <div class="nt2-vide-ico">${_nt2Svg(NT2_IC.moon)}</div>
      <div class="nt2-vide-t">Cahier non ouvert pour cette nuit</div>
      <div class="nt2-vide-s">Ouvrez le cahier pour consigner rondes, événements et appels à l'astreinte.</div>
      ${canWrite ? `<button type="button" class="nt2-new" style="margin-top:18px" onclick="ouvrirNuit()">
        ${_nt2Svg(NT2_IC.moon)}Ouvrir le cahier de cette nuit</button>` : ''}
    </div>`;
    // Les consignes de veille et le pointage du sommeil ne dépendent pas de
    // l'ouverture du cahier : le veilleur doit les lire même avant de l'ouvrir.
    document.getElementById('ntRail').innerHTML = nt2VeilleBlocsHtml(canWrite) + `<div class="dc-card" id="ntHistoBlk">
      ${_nt2DcHead('#818cf8', NT2_IC.archive, 'ARCHIVE', 'Nuits précédentes')}
      <div class="dc-body"><div id="ntHisto"></div></div>
    </div>`;
    nt2RenderConsignes();
    nt2RenderSommeil();
    nt2RenderHisto();
    return;
  }

  const rondes = [...(n.rondes || [])].sort(_nt2SortH);
  const evts   = [...(n.evenements || [])].sort(_nt2SortH);
  const astr   = [...(n.astreintes || [])].sort(_nt2SortH);

  nt2RenderStats(n, rondes, evts, astr);
  nt2RenderTimeline(n, evts, canWrite);
  nt2RenderRail(n, rondes, astr, canWrite);
  nt2RenderConsignes();
  nt2RenderSommeil();
  nt2RenderHisto();
}

// ── VEILLEUR (barre du haut) ─────────────────────────────────────────

function nt2RenderVeilleur(n) {
  const box = document.getElementById('ntVeilleur');
  if (!box) return;
  const nom = n && n.veilleur ? n.veilleur : '';
  box.hidden = !nom;
  if (!nom) return;
  document.getElementById('ntVeilleurIni').textContent = _nt2Ini(nom);
  document.getElementById('ntVeilleurNom').textContent = nom;
}

// ── TUILES STATISTIQUES ──────────────────────────────────────────────

function nt2RenderStats(n, rondes, evts, astr) {
  const el = document.getElementById('ntStats');
  if (!el) return;
  const tuile = (c, ico, val, lbl) => `<div class="dc-kpi" style="--dc-c:${c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${lbl}</span><span class="dc-kpi-ico" style="color:${c}">${_nt2Ico(ico, 16)}</span></div>
    <div class="dc-kpi-val">${val}</div>
  </div>`;

  el.innerHTML =
    tuile('#818cf8', NT2_IC.moon, evts.length, evts.length > 1 ? 'Événements' : 'Événement') +
    tuile(astr.length ? '#ef4444' : '#f59e0b', NT2_IC.phone, astr.length, astr.length > 1 ? 'Appels astreinte' : 'Appel astreinte') +
    tuile('#10b981', NT2_IC.eye, rondes.length, rondes.length > 1 ? 'Rondes faites' : 'Ronde faite') +
    `<div class="dc-kpi" style="--dc-c:#22d3ee;--pc:#22d3ee">
       <div class="dc-kpi-top"><span class="dc-kpi-label">Résidents veillés</span><span class="dc-kpi-ico" style="color:#22d3ee">${_nt2Ico(NT2_IC.bed, 16)}</span></div>
       <div class="dc-kpi-val">
         <input type="number" min="0" class="nt2-stat-in" value="${parseInt(n.effectif, 10) || 0}"
                aria-label="Résidents veillés"
                onchange="updateNuit({effectif:parseInt(this.value)||0})"/>
       </div>
     </div>`;
}

// ── TIMELINE DES ÉVÉNEMENTS ──────────────────────────────────────────

function nt2RenderTimeline(n, evts, canWrite) {
  const el = document.getElementById('ntBody');
  if (!el) return;

  const ambOpts = Object.entries(NUIT_AMBIANCES).map(([k, a]) =>
    `<option value="${k}"${n.ambiance === k ? ' selected' : ''}>${escHtml(a.label)}</option>`).join('');

  const lignes = evts.map((e, i) => {
    const t = NUIT_EVT_TYPES[e.type] || NUIT_EVT_TYPES.autre;
    const st = NT2_EVT_STYLE[e.type] || NT2_EVT_STYLE.autre;
    const dernier = i === evts.length - 1;
    const res = e.residentName
      ? (e.residentId
          ? `<a class="nt2-ev-res" href="resident.html?id=${encodeURIComponent(e.residentId)}">· ${escHtml(e.residentName)}</a>`
          : `<span class="nt2-ev-res">· ${escHtml(e.residentName)}</span>`)
      : '';
    return `<div class="nt2-ev" style="--pc:${st.c}">
      <div class="nt2-ev-rail">
        <div class="nt2-ev-h">${escHtml(e.heure || '—')}</div>
        ${dernier ? '' : '<div class="nt2-ev-line"></div>'}
      </div>
      <div class="nt2-ev-b">
        <div class="nt2-ev-card">
          <div class="nt2-ev-top">
            <span class="nt2-ev-ico">${_nt2Svg(st.i)}</span>
            <span class="nt2-ev-t">${escHtml(t.label)}</span>${res}
            ${canWrite ? `<span class="nt2-ev-act">
              <button type="button" class="nt2-ico-btn" title="Modifier" onclick="openNuitEvtModal('${e.id}')">${_nt2Svg(NT2_IC.pen)}</button>
              <button type="button" class="nt2-ico-btn danger" title="Supprimer" onclick="delNuitEvt('${e.id}')">${_nt2Svg(NT2_IC.x, 2.2)}</button>
            </span>` : ''}
          </div>
          <div class="nt2-ev-x">${escHtml(e.description || '')}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  const rightTl = `<div style="display:flex;align-items:center;gap:10px">
      <span class="dc-pill dim">21H → 07H</span>
      <select class="nt2-amb" aria-label="Ambiance de la nuit"
              onchange="updateNuit({ambiance:this.value});renderNuit()">${ambOpts}</select>
    </div>`;

  el.innerHTML = `<div class="dc-card">
    ${_nt2DcHead('#818cf8', NT2_IC.clock, 'CAHIER DE NUIT', 'Événements de la nuit', rightTl)}
    <div class="dc-body">${evts.length ? lignes
      : `<div class="v2-blk-vide">Rien à signaler — nuit sans événement particulier.</div>`}</div>
  </div>`;
}

// ── RAIL : rondes, astreinte, transmission, historique ───────────────

function nt2RenderRail(n, rondes, astr, canWrite) {
  const el = document.getElementById('ntRail');
  if (!el) return;

  // 1) Rondes de la nuit
  const listeRondes = rondes.length ? rondes.map(rd => `
    <div class="nt2-ronde">
      <span class="nt2-ronde-box${rd.ras ? '' : ' todo'}">${rd.ras ? _nt2Svg(NT2_IC.check, 3) : ''}</span>
      <span class="nt2-ronde-h">${escHtml(rd.heure || '—')}</span>
      <span class="nt2-ronde-n" title="${escHtml(rd.note || (rd.ras ? 'RAS' : 'à noter'))}">${escHtml(rd.note || (rd.ras ? 'RAS' : 'à noter'))}</span>
      ${canWrite ? `<button type="button" class="nt2-ico-btn danger" title="Supprimer" onclick="delRonde('${rd.id}')">${_nt2Svg(NT2_IC.x, 2.2)}</button>` : ''}
    </div>`).join('') : '<div class="v2-blk-vide">Aucune ronde consignée</div>';

  const formRonde = canWrite ? `
    <div class="nt2-form">
      <input type="time" id="rdHeure" aria-label="Heure de la ronde"/>
      <label class="nt2-check"><input type="checkbox" id="rdRas" checked/> RAS</label>
      <input type="text" id="rdNote" placeholder="Observation…"/>
      <button type="button" class="nt2-add" onclick="addRonde()">${_nt2Svg(NT2_IC.plus, 2.4)}Ronde</button>
    </div>` : '';

  // 2) Appels à l'astreinte
  const listeAstr = astr.length ? `<div style="display:flex;flex-direction:column;gap:10px">${astr.map(a => `
    <div class="nt2-astr">
      <div class="nt2-astr-top">
        <span class="nt2-astr-h">${escHtml(a.heure || '—')}</span>
        <span class="nt2-astr-c">${escHtml(a.cadre || 'Cadre')}</span>
        ${canWrite ? `<button type="button" class="nt2-ico-btn danger" style="margin-left:auto" title="Supprimer" onclick="delAstreinte('${a.id}')">${_nt2Svg(NT2_IC.x, 2.2)}</button>` : ''}
      </div>
      <div class="nt2-astr-m">Motif : ${escHtml(a.motif || '—')}</div>
      ${a.decision ? `<div class="nt2-astr-d"><strong>Consigne :</strong> ${escHtml(a.decision)}</div>` : ''}
    </div>`).join('')}</div>` : '<div class="v2-blk-vide">Aucun appel cette nuit</div>';

  const formAstr = canWrite ? `
    <div class="nt2-form col">
      <div class="nt2-form-row">
        <input type="time" id="asHeure" aria-label="Heure de l'appel"/>
        <input type="text" id="asCadre" placeholder="Cadre contacté"/>
      </div>
      <input type="text" id="asMotif" placeholder="Motif de l'appel"/>
      <input type="text" id="asDecision" placeholder="Décision / consigne donnée"/>
      <button type="button" class="nt2-add warn" style="align-self:flex-end" onclick="addAstreinte()">${_nt2Svg(NT2_IC.plus, 2.4)}Appel astreinte</button>
    </div>` : '';

  const pillRondes = `<span class="dc-pill dim">${rondes.length}</span>`;
  const pillAstr = astr.length
    ? `<span class="dc-badge dc-b-red"><span class="d"></span>${astr.length}</span>`
    : `<span class="dc-pill dim">0</span>`;

  el.innerHTML = `
    <div class="dc-card">
      ${_nt2DcHead('#22d3ee', NT2_IC.check, 'CONTRÔLES', 'Rondes de la nuit', pillRondes)}
      <div class="dc-body">
        <div style="display:flex;flex-direction:column;gap:9px">${listeRondes}</div>
        ${formRonde}
      </div>
    </div>

    ${nt2VeilleBlocsHtml(canWrite)}

    <div class="dc-card" style="border-color:rgba(245,158,11,.28)">
      ${_nt2DcHead('#f59e0b', NT2_IC.phone, 'ASTREINTE', 'Appels à l\'astreinte', pillAstr)}
      <div class="dc-body">
        ${listeAstr}
        ${formAstr}
      </div>
    </div>

    <div class="dc-card">
      ${_nt2DcHead('#f59e0b', NT2_IC.sun, 'RELÈVE', 'Transmission du matin', '<span class="nt2-saved" id="ntSaved"></span>')}
      <div class="dc-body">
        <textarea id="ntTransmission" class="nt2-trans" rows="4"
          placeholder="Synthèse de la nuit, points de vigilance pour la journée…"
          ${canWrite ? 'oninput="saveTransmission()"' : 'readonly'}>${escHtml(n.transmission || '')}</textarea>
      </div>
    </div>

    <div class="dc-card">
      ${_nt2DcHead('#818cf8', NT2_IC.archive, 'ARCHIVE', 'Nuits précédentes')}
      <div class="dc-body"><div id="ntHisto"></div></div>
    </div>`;
}

// ── HISTORIQUE ───────────────────────────────────────────────────────

function nt2RenderHisto() {
  const el = document.getElementById('ntHisto');
  if (!el) return;
  const liste = getNuits()
    .filter(n => n.date !== nuitDate)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 8);

  if (!liste.length) { el.innerHTML = '<div class="v2-blk-vide">Aucune nuit dans l\'historique</div>'; return; }

  el.innerHTML = liste.map(n => {
    const nb = (n.evenements || []).length;
    const na = (n.astreintes || []).length;
    const c = na ? '#ef4444' : (nb ? '#f59e0b' : '#10b981');
    const tag = na ? (na > 1 ? na + ' astreintes' : '1 astreinte')
              : (nb ? (nb > 1 ? nb + ' événements' : '1 événement') : 'RAS');
    const amb = NUIT_AMBIANCES[n.ambiance] || NUIT_AMBIANCES.calme;
    return `<div class="nt2-histo-r" style="--pc:${c};border-left:3px solid ${c};padding-left:11px" onclick="nt2Aller('${n.date}')">
      <div style="min-width:0">
        <div class="nt2-histo-d">${escHtml(_nt2LabelCourt(n.date))}</div>
        <div class="nt2-histo-b">${escHtml(n.veilleur || '?')} · ${escHtml(amb.label)} · ${(n.rondes || []).length} rondes</div>
      </div>
      <span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${escHtml(tag)}</span>
    </div>`;
  }).join('');
}

function nt2Aller(date) {
  nuitDate = date;
  renderNuit();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════════════
// CONSIGNES DE VEILLE & ÉTAT DU SOMMEIL
// Données : js/veille-supabase.js (tables veille_consignes et sommeil_nuit).
// Tant que migration-veille-sommeil.sql n'est pas exécuté, les lectures
// renvoient [] : les deux blocs s'affichent vides et la page reste utilisable.
// ══════════════════════════════════════════════════════════════════════

let _nt2Consignes = [];            // consignes actives, tous résidents
let _nt2Sommeil = {};              // { 'YYYY-MM-DD': [état, …] }
let _nt2Uid = null;                // auth.uid() courant (droit de retrait)
let _nt2ConsEditRid = null;        // résident présélectionné dans la modale

const NT2_SOMMEIL = {
  calme:  { label: 'Calme',  c: '#10b981', i: NT2_IC.check },
  agite:  { label: 'Agité',  c: '#f59e0b', i: NT2_IC.bang },
  reveil: { label: 'Réveil', c: '#818cf8', i: NT2_IC.moon },
  absent: { label: 'Absent', c: '#64748b', i: NT2_IC.out }
};

// Couleur d'avatar stable par résident (la maquette en fixe une par ligne ;
// ici on la dérive de l'identifiant pour qu'elle ne saute pas d'un rendu à l'autre).
const NT2_AV_COLORS = ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#94a3b8'];
function _nt2AvColor(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return NT2_AV_COLORS[h % NT2_AV_COLORS.length];
}

function _nt2Res(id) {
  return (typeof sbResidents === 'function' ? sbResidents() : []).find(r => String(r.id) === String(id)) || null;
}
function _nt2ResNom(r) { return `${r.prenom || ''} ${r.nom || ''}`.trim(); }
function _nt2ResActifs() {
  return (typeof sbResidents === 'function' ? sbResidents() : [])
    .filter(r => r.statut !== 'sorti')
    .sort((a, b) => _nt2ResNom(a).localeCompare(_nt2ResNom(b), 'fr'));
}
function _nt2Admin() {
  const s = Auth.getSession();
  return !!s && ['admin', 'superadmin'].includes(s.role);
}

// ── CHARGEMENT ───────────────────────────────────────────────────────

async function nt2LoadVeille() {
  _nt2Uid = (typeof _vlAuthUid === 'function') ? await _vlAuthUid() : null;
  _nt2Consignes = await sbGetVeilleConsignes();
}

// Le sommeil est daté : on le charge à la demande pour la nuit affichée, puis
// on ne repeint que son bloc (le rendu principal reste synchrone).
async function nt2LoadSommeil(date) {
  if (_nt2Sommeil[date]) return;
  _nt2Sommeil[date] = await sbGetSommeilNuit(date);
  if (date === nuitDate) nt2RenderSommeil();
}
function _nt2SommeilDe(rid) {
  return (_nt2Sommeil[nuitDate] || []).find(s => String(s.residentId) === String(rid)) || null;
}

// ── COQUES DES DEUX BLOCS (insérées dans le rail) ────────────────────

function nt2VeilleBlocsHtml(canWrite) {
  const addCons = canWrite
    ? `<button type="button" class="nt2-ico-btn" title="Ajouter une consigne"
        onclick="openVeilleConsigneModal()">${_nt2Svg(NT2_IC.plus, 2.4)}</button>`
    : '';
  return `
    <div class="dc-card" style="border-color:rgba(245,158,11,.28)">
      ${_nt2DcHead('#f59e0b', NT2_IC.alert, 'VEILLE', 'Consignes de veille', addCons)}
      <div class="dc-body"><div id="ntConsignes"></div></div>
    </div>

    <div class="dc-card">
      ${_nt2DcHead('#818cf8', NT2_IC.moon, 'SUIVI', 'Sommeil')}
      <div class="dc-body"><div id="ntSommeil"></div></div>
    </div>`;
}

// ── CONSIGNES DE VEILLE ──────────────────────────────────────────────

function nt2RenderConsignes() {
  const el = document.getElementById('ntConsignes');
  if (!el) return;
  const canWrite = !!Auth.getSession();
  const admin = _nt2Admin();

  if (!_nt2Consignes.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucune consigne de veille</div>';
    return;
  }

  el.innerHTML = `<div class="nt2-cons-l">${_nt2Consignes.map(c => {
    const r = _nt2Res(c.residentId);
    const nom = r ? _nt2ResNom(r) : '';
    // Rien n'est inventé : sans fiche résident on n'affiche ni initiales ni chambre.
    const ini = nom ? _nt2Ini(nom) : '?';
    const peutRetirer = canWrite && (admin || (!!_nt2Uid && c.createdBy === _nt2Uid));
    return `<div class="nt2-cons">
      <span class="nt2-cons-av" style="background:${_nt2AvColor(c.residentId)}">${escHtml(ini)}</span>
      <div class="nt2-cons-b">
        ${nom ? `<div class="nt2-cons-n">${escHtml(nom)}</div>` : ''}
        <div class="nt2-cons-x">${escHtml(c.texte)}</div>
        ${r && r.chambre ? `<div class="nt2-cons-ch">Ch. ${escHtml(String(r.chambre))}</div>` : ''}
      </div>
      ${peutRetirer ? `<button type="button" class="nt2-ico-btn danger" title="Retirer la consigne"
        onclick="delVeilleConsigne('${c.id}')">${_nt2Svg(NT2_IC.x, 2.2)}</button>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function openVeilleConsigneModal(residentId) {
  _nt2ConsEditRid = residentId || null;
  const sel = document.getElementById('vcResident');
  sel.innerHTML = _nt2ResActifs().map(r =>
    `<option value="${escHtml(String(r.id))}"${String(r.id) === String(residentId) ? ' selected' : ''}>${escHtml(_nt2ResNom(r))}</option>`).join('');
  document.getElementById('vcTexte').value = '';
  openModal('modalVeilleConsigne');
}

async function saveVeilleConsigne() {
  const residentId = document.getElementById('vcResident').value;
  const texte = document.getElementById('vcTexte').value.trim();
  if (!residentId) { toast('Choisissez un résident', 'error'); return; }
  if (!texte) { toast('Rédigez la consigne', 'error'); return; }
  try {
    const c = await sbSaveVeilleConsigne({ residentId, texte });
    _nt2Consignes = [c, ..._nt2Consignes];
    closeModal('modalVeilleConsigne');
    toast('Consigne de veille ajoutée ✓');
    nt2RenderConsignes();
  } catch (e) {
    console.error('[veille] consigne', e);
    toast(veilleErrMsg(e), 'error');
  }
}

function delVeilleConsigne(id) {
  confirmDialog('Retirer cette consigne de veille ?', async () => {
    try {
      await sbDeleteVeilleConsigne(id);
      _nt2Consignes = _nt2Consignes.filter(c => c.id !== id);
      nt2RenderConsignes();
    } catch (e) {
      console.error('[veille] retrait', e);
      toast(veilleErrMsg(e), 'error');
    }
  });
}

// ── ÉTAT DU SOMMEIL ──────────────────────────────────────────────────

function nt2RenderSommeil() {
  const el = document.getElementById('ntSommeil');
  if (!el) return;
  const canWrite = !!Auth.getSession();
  const residents = _nt2ResActifs();

  if (!residents.length) {
    el.innerHTML = '<div class="v2-blk-vide">Aucun résident accueilli</div>';
    return;
  }
  if (!_nt2Sommeil[nuitDate]) nt2LoadSommeil(nuitDate);

  el.innerHTML = `<div class="nt2-sm-l">${residents.map(r => {
    const s = _nt2SommeilDe(r.id);
    const st = s ? NT2_SOMMEIL[s.etat] : null;
    const chips = Object.entries(NT2_SOMMEIL).map(([k, v]) =>
      `<button type="button" class="nt2-sm-c${s && s.etat === k ? ' on' : ''}" style="--pc:${v.c}"
        title="${escHtml(v.label)}" aria-label="${escHtml(v.label + ' — ' + _nt2ResNom(r))}"
        onclick="setSommeil('${escHtml(String(r.id))}','${k}')">${_nt2Svg(v.i, 2.4)}</button>`).join('');
    return `<div class="nt2-sm">
      <div class="nt2-sm-h">
        <span class="nt2-sm-n">${escHtml(_nt2ResNom(r))}</span>
        ${st ? `<span class="nt2-sm-e" style="--pc:${st.c}">${_nt2Svg(st.i, 2.4)}${escHtml(st.label)}</span>`
             : '<span class="nt2-sm-e vide">Non renseigné</span>'}
        ${canWrite ? `<button type="button" class="nt2-ico-btn" title="Préciser / annoter"
          onclick="openSommeilModal('${escHtml(String(r.id))}')">${_nt2Svg(NT2_IC.pen)}</button>` : ''}
      </div>
      ${s && s.note ? `<div class="nt2-sm-note">${escHtml(s.note)}</div>` : ''}
      ${canWrite ? `<div class="nt2-sm-chips">${chips}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

// Mémorise l'état localement puis persiste. Recliquer l'état actif l'efface.
function _nt2SetSommeilLocal(row) {
  const l = (_nt2Sommeil[row.date] || []).filter(s => String(s.residentId) !== String(row.residentId));
  _nt2Sommeil[row.date] = [...l, row];
}

async function setSommeil(residentId, etat) {
  const prev = _nt2SommeilDe(residentId);
  const date = nuitDate;
  try {
    if (prev && prev.etat === etat) {
      await sbDeleteSommeilNuit(residentId, date);
      _nt2Sommeil[date] = (_nt2Sommeil[date] || []).filter(s => String(s.residentId) !== String(residentId));
    } else {
      const saved = await sbSaveSommeilNuit({ residentId, date, etat, note: prev ? prev.note : '' });
      _nt2SetSommeilLocal(saved);
    }
    nt2RenderSommeil();
  } catch (e) {
    console.error('[veille] sommeil', e);
    toast(veilleErrMsg(e), 'error');
  }
}

function openSommeilModal(residentId) {
  const r = _nt2Res(residentId);
  if (!r) return;
  const s = _nt2SommeilDe(residentId);
  document.getElementById('smResidentId').value = String(residentId);
  document.getElementById('smNom').textContent = _nt2ResNom(r);
  document.getElementById('smEtat').value = s ? s.etat : 'calme';
  document.getElementById('smNote').value = s ? s.note : '';
  openModal('modalSommeil');
}

async function saveSommeil() {
  const residentId = document.getElementById('smResidentId').value;
  const date = nuitDate;
  try {
    const saved = await sbSaveSommeilNuit({
      residentId, date,
      etat: document.getElementById('smEtat').value,
      note: document.getElementById('smNote').value.trim()
    });
    _nt2SetSommeilLocal(saved);
    closeModal('modalSommeil');
    toast('Sommeil consigné ✓');
    nt2RenderSommeil();
  } catch (e) {
    console.error('[veille] sommeil', e);
    toast(veilleErrMsg(e), 'error');
  }
}
