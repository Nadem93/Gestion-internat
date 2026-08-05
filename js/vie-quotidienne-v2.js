// ══════════════════════════════════════════════════════════════════════════
// VIE QUOTIDIENNE V2 — reproduction de la maquette
// « Vie quotidienne - refonte (bento) » : navigation latérale groupée,
// bandeau de KPI, tuiles « Accès rapides », bento « du jour ».
//
// La liste des modules (VQ_NAV), leurs droits (allowed) et la navigation
// interne (loadPage / showHome) restent définis dans vie-quotidienne.html :
// ce fichier ne fait que le rendu. Aucune couche Supabase n'est réécrite,
// on appelle les fonctions sb* existantes.
// ══════════════════════════════════════════════════════════════════════════

const VQ2 = { data: null, loading: false, tuto: null };

const _vq = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
const _vqToday = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
const _vqCall = async (fn, ...a) => {
  try { return (typeof window[fn] === 'function') ? await window[fn](...a) : null; }
  catch (e) { console.warn('[vq2]', fn, e); return null; }
};
// #rrggbb → rgba(...) pour les ombres colorées
function _vqRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return `rgba(99,102,241,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const _vqSvg = (d, c, sz) => `<svg width="${sz || 20}" height="${sz || 20}" viewBox="0 0 24 24" fill="none" `
  + `stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// Icônes de la maquette
const VQ_IC = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  meal: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>',
  activity: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
  pill: '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/>',
  back: '<path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  done: '<polyline points="20 6 9 17 4 12"/>'
};

// Couleurs des catégories d'activité (identiques à js/activites.js, non chargé ici)
const VQ_ACT_C = {
  sportive: '#16a34a', creative: '#db2777', culturelle: '#8b5cf6', scolaire: '#0369a1',
  autonomie: '#d97706', sortie: '#0d9488', citoyennete: '#6366f1', autre: '#64748b'
};
const VQ_MED_MOMENTS = [
  { key: 'matin', label: 'Matin', h: '08:00' },
  { key: 'midi', label: 'Midi', h: '12:00' },
  { key: 'soir', label: 'Soir', h: '19:00' },
  { key: 'coucher', label: 'Coucher', h: '21:30' }
];
const VQ_REPAS = [
  { key: 'matin', h: '08:00', label: 'Petit-déjeuner' },
  { key: 'midi', h: '12:00', label: 'Déjeuner' },
  { key: 'soir', h: '19:00', label: 'Dîner' }
];
const VQ_REGIMES = {
  sans_sel: 'sans sel', sans_sucre: 'sans sucre', sans_porc: 'sans porc',
  vegetarien: 'végétarien', diabetique: 'diabétique', hypocalorique: 'hypocalorique', autre: 'régime'
};
const VQ_TEXTURES = { hachee: 'haché', mixee: 'mixé' };

// ─── Entrée principale ────────────────────────────────────────────────────
function vq2Render() {
  const el = document.getElementById('vqWelcome');
  if (el) el.innerHTML = vq2Hello() + vq2Kpis() + vq2Cards() + vq2Bento();
  vq2Meta();
  if (!VQ2.data && !VQ2.loading) vq2Load();
}

// Chargement des données réelles, puis re-rendu des parties chiffrées
async function vq2Load() {
  VQ2.loading = true;
  const t = _vqToday();
  const [residents, pres, repas, med, actes, soins, trans] = await Promise.all([
    _vqCall('sbGetResidents'),
    _vqCall('sbGetPresencesForDate', t),
    _vqCall('sbGetRepasAll'),
    _vqCall('sbGetMedDistribForDate', t),
    _vqCall('sbGetActivites'),
    _vqCall('sbGetPlanSoins'),
    _vqCall('sbGetTransmissions')
  ]);
  VQ2.data = {
    residents: (residents || []).filter(r => r.statut !== 'sorti'),
    pres: pres || {},
    repasJour: (repas || {})[t] || {},
    med: med || [],
    actes: (actes || []).filter(a => a.actif !== false),
    soins: (soins || []).filter(s => s.actif !== false),
    trans: (trans || []).filter(x => (x.date || '').slice(0, 10) === t)
  };
  VQ2.loading = false;
  const el = document.getElementById('vqWelcome');
  if (el) el.innerHTML = vq2Hello() + vq2Kpis() + vq2Cards() + vq2Bento();
  vq2Meta();
}

// ─── Chiffres dérivés des données réelles ─────────────────────────────────
function vq2Stats() {
  const D = VQ2.data;
  if (!D) return null;
  const inscrit = (meal, rid) => {
    const v = (D.repasJour[meal] || {})[rid];
    return v === undefined ? true : !!v;
  };
  const presents = Object.values(D.pres).filter(p => (p.statut || '') === 'present').length;
  const couvertsMidi = D.residents.filter(r => inscrit('midi', r.id)).length;
  const couvertsSoir = D.residents.filter(r => inscrit('soir', r.id)).length;
  const jour = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][new Date().getDay()];
  const actJour = D.actes.filter(a => a.jour === jour)
    .sort((a, b) => String(a.heureDebut || '').localeCompare(String(b.heureDebut || '')));
  const med = vq2Med();
  return {
    presents, couvertsMidi, couvertsSoir, couverts: couvertsMidi + couvertsSoir,
    actJour, inscrit,
    medRestants: med.filter(m => !m.fait).length, medTotal: med.length, med,
    soins: D.soins.length, trans: D.trans.length
  };
}

// Prises prévues aujourd'hui (traitements de la fiche résident) confrontées
// à la traçabilité med_distrib du jour.
function vq2Med() {
  const D = VQ2.data;
  if (!D) return [];
  const t = _vqToday();
  const out = [];
  D.residents.forEach(r => {
    const nom = `${(r.prenom || '').charAt(0)}${r.prenom ? '.' : ''} ${r.nom || ''}`.trim() || 'Résident';
    ((r.sante || {}).traitements || [])
      .filter(tr => (tr.moments || []).length && (!tr.debut || tr.debut <= t) && (!tr.fin || tr.fin >= t))
      .forEach(tr => (tr.moments || []).forEach(mo => {
        const meta = VQ_MED_MOMENTS.find(x => x.key === mo);
        const rec = D.med.find(x => String(x.residentId) === String(r.id)
          && String(x.traitementId) === String(tr.id) && x.moment === mo);
        out.push({
          h: meta ? meta.h : '', ordre: VQ_MED_MOMENTS.findIndex(x => x.key === mo),
          res: nom, drug: [tr.nom || 'Traitement', tr.posologie].filter(Boolean).join(' · '),
          fait: !!rec
        });
      }));
  });
  return out.sort((a, b) => (a.fait - b.fait) || (a.ordre - b.ordre));
}

// Bandeau de droite de la barre de titre : date + présents (donnée réelle)
function vq2Meta() {
  const el = document.getElementById('vqTopMeta');
  if (!el) return;
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const st = vq2Stats();
  el.textContent = d.charAt(0).toUpperCase() + d.slice(1)
    + (st ? ` · ${st.presents} résident${st.presents > 1 ? 's' : ''} présent${st.presents > 1 ? 's' : ''}` : '');
}

// ─── Blocs de contenu ─────────────────────────────────────────────────────
function vq2Hello() {
  return `<div class="vq-hello">
    <div class="vq-hello-s">Le quotidien du foyer en un coup d'œil.</div>
  </div>`;
}

function vq2Kpis() {
  const st = vq2Stats();
  const v = x => st ? String(x) : '—';
  const K = [
    { n: v(st && st.presents), l: 'Présents', sub: 'au foyer aujourd’hui', c: '#16a34a', ic: VQ_IC.check },
    { n: v(st && st.couverts), l: 'Repas midi/soir', sub: 'couverts à servir', c: '#ea580c', ic: VQ_IC.meal },
    { n: v(st && st.actJour.length), l: 'Activités', sub: 'séances programmées', c: '#818cf8', ic: VQ_IC.activity },
    { n: v(st && st.medRestants), l: 'Médic. restants', sub: 'prises à distribuer', c: '#dc2626', ic: VQ_IC.pill }
  ];
  return `<div class="vq-kpis dc-kpis">${K.map(k => `<div class="dc-kpi" style="--dc-c:${k.c}">
    <div class="dc-kpi-top"><span class="dc-kpi-label">${k.l}</span>
      <span class="dc-kpi-ico" style="color:${k.c}">${_vqSvg(k.ic, k.c, 16)}</span></div>
    <div class="dc-kpi-val" style="color:${k.c}">${_vq(k.n)}</div>
    <div class="dc-kpi-sub">${k.sub}</div></div>`).join('')}</div>`;
}

// Sous-titre de tuile : chiffre réel du module, sinon rien d'inventé.
// Donnée de la carte au format carte-donnée : { n, u, lb } ou { txt, lb }.
// warn: true → la carte se teinte, il reste quelque chose à faire.
function vq2CardData(page) {
  const st = vq2Stats();
  if (!st) return { txt: '…', lb: 'chargement' };
  const s = (n, sing, plur) => (n > 1 ? (plur || sing + 's') : sing);
  switch (page) {
    case 'journee.html': return { txt: 'Tournée', lb: 'quart par quart' };
    case 'transmissions.html': return { n: st.trans, lb: st.trans ? s(st.trans, 'transmission aujourd’hui', 'transmissions aujourd’hui') : 'rien aujourd’hui' };
    case 'presences.html': return { n: st.presents, lb: s(st.presents, 'résident présent', 'résidents présents') };
    case 'nuit.html': return { txt: 'Nuit', lb: 'relais de nuit' };
    case 'repas.html': return { n: st.couverts, lb: s(st.couverts, 'couvert prévu', 'couverts prévus') };
    case 'activites.html': return { n: st.actJour.length, lb: st.actJour.length ? s(st.actJour.length, 'séance aujourd’hui', 'séances aujourd’hui') : 'aucune séance' };
    case 'medicaments.html': {
      const faits = st.medTotal - st.medRestants;
      return { n: faits, u: '/ ' + st.medTotal, lb: st.medRestants ? s(st.medRestants, 'prise à donner', 'prises à donner') : 'toutes les prises données', warn: st.medRestants > 0 };
    }
    case 'plan-soins.html': return { n: st.soins, lb: s(st.soins, 'soin actif', 'soins actifs') };
    default: return { txt: '', lb: '' };
  }
}

function vq2Cards() {
  const nav = (window.VQ_NAV || []).filter(window.vqAllowed || (() => true));
  return `<div class="vq-sec">Accès rapides</div>
    <div class="vq-cards">${nav.map(e => {
      const d = vq2CardData(e.page);
      return `<div class="vq-card cdn cdn-hasi${d.warn ? ' cdn-warn' : ''}" role="button" tabindex="0"
        data-page="${_vq(e.page)}" data-label="${_vq(e.label)}"
        aria-label="Ouvrir ${_vq(e.label)}" style="--vqc:${_vq(e.c1)};--vqc-sh:${_vqRgba(e.c1, .4)};--cdc:${_vq(e.c1)}">
        <button type="button" class="vq-card-i" data-tuto="${_vq(e.page)}"
          title="Mode d'emploi — ${_vq(e.label)}" aria-label="Mode d'emploi — ${_vq(e.label)}">?</button>
        <div class="cdn-top">
          <span class="vq-card-ic cdn-ic">${e.icon}</span>
          <div class="cdn-t">${_vq(e.label)}</div>
        </div>
        ${_cdnMid(d, _vq)}
      </div>`;
    }).join('')}</div>`;
}

function vq2Bento() {
  return `<div class="vq-bento">${vq2BlkRepas()}${vq2BlkMed()}${vq2BlkAct()}</div>`;
}

function vq2BlkRepas() {
  const st = vq2Stats(), D = VQ2.data;
  let body = `<div class="vq-vide">Chargement…</div>`;
  if (st) {
    body = VQ_REPAS.map(m => {
      const list = D.residents.filter(r => st.inscrit(m.key, r.id));
      const parts = {};
      list.forEach(r => {
        const rg = r.regime || {};
        if (rg.type && rg.type !== 'normal') {
          const l = VQ_REGIMES[rg.type] || (rg.type === 'autre' ? (rg.autreLabel || 'régime') : rg.type);
          parts[l] = (parts[l] || 0) + 1;
        }
        if (rg.texture && rg.texture !== 'normale') {
          const l = VQ_TEXTURES[rg.texture] || rg.texture;
          parts[l] = (parts[l] || 0) + 1;
        }
      });
      const detail = Object.entries(parts).map(([k, n]) => `${k} (${n})`).join(' · ');
      const heureH = parseInt(m.h, 10);
      const servi = new Date().getHours() >= heureH;
      const c = servi ? '#10b981' : '#f59e0b';
      const etat = servi ? 'servi' : 'à préparer';
      return `<div class="vq-li" style="border-left:3px solid ${c};padding-left:12px">
        <span class="vq-li-h" style="color:#fb923c">${m.h}</span>
        <div class="vq-li-b"><div class="vq-li-t">${m.label}</div>
          <div class="vq-li-s">${_vq(etat + (detail ? ' · ' + detail : ''))}</div></div>
        <span class="dc-badge ${servi ? 'dc-b-green' : 'dc-b-gray'}"><span class="d"></span>${list.length}</span></div>`;
    }).join('');
  }
  return `<div class="dc-card"><div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#fb923c22;color:#fb923c">${_vqSvg(VQ_IC.meal, '#fb923c', 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Cadre de vie</div><div class="dc-title">Repas du jour</div></div>
    </div><span class="dc-pill dim">${VQ_REPAS.length} services</span></div>
    <div class="dc-body">${body}</div></div>`;
}

function vq2BlkMed() {
  const st = vq2Stats();
  let body = `<div class="vq-vide">Chargement…</div>`;
  if (st) {
    body = st.med.length
      ? st.med.slice(0, 6).map(m => {
          const c = m.fait ? '#10b981' : '#ef4444';
          return `<div class="vq-li" style="border-left:3px solid ${c};padding-left:12px">
          <span class="vq-li-h">${_vq(m.h)}</span>
          <div class="vq-li-b"><div class="vq-li-t">${_vq(m.res)}</div>
            <div class="vq-li-s">${_vq(m.drug)}</div></div>
          <span class="dc-badge ${m.fait ? 'dc-b-green' : 'dc-b-gray'}"><span class="d"></span>${m.fait ? 'donné' : 'à donner'}</span></div>`;
        }).join('')
      : `<div class="vq-vide">Aucune prise programmée aujourd'hui.</div>`;
  }
  return `<div class="dc-card"><div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#f8717122;color:#f87171">${_vqSvg(VQ_IC.pill, '#f87171', 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Soins</div><div class="dc-title">Médicaments à donner</div></div>
    </div>${st ? `<span class="dc-pill dim">${st.medTotal - st.medRestants}/${st.medTotal} donnés</span>` : ''}</div>
    <div class="dc-body">${body}</div></div>`;
}

function vq2BlkAct() {
  const st = vq2Stats(), D = VQ2.data;
  let body = `<div class="vq-vide">Chargement…</div>`;
  if (st) {
    body = st.actJour.length
      ? st.actJour.slice(0, 6).map(a => {
        const c = VQ_ACT_C[a.categorie] || VQ_ACT_C.autre;
        const n = D.residents.reduce((k, r) => k + ((r.activites || [])
          .some(i => String(i.activiteId) === String(a.id) && i.statut === 'active') ? 1 : 0), 0);
        const sub = [n ? `${n} résident${n > 1 ? 's' : ''}` : '', a.lieu].filter(Boolean).join(' · ');
        return `<div class="vq-li" style="border-left:3px solid ${c};padding-left:12px">
          <span class="vq-li-h" style="color:${c}">${_vq(a.heureDebut || '—')}</span>
          <div class="vq-li-b"><div class="vq-li-t">${_vq(a.nom)}</div>
            <div class="vq-li-s">${_vq(sub)}</div></div></div>`;
      }).join('')
      : `<div class="vq-vide">Aucune activité programmée aujourd'hui.</div>`;
  }
  return `<div class="dc-card"><div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:#a5b4fc22;color:#a5b4fc">${_vqSvg(VQ_IC.activity, '#a5b4fc', 16)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">Cadre de vie</div><div class="dc-title">Activités du jour</div></div>
    </div>${st ? `<span class="dc-pill dim">${st.actJour.length} séance${st.actJour.length > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="dc-body">${body}</div></div>`;
}

// ─── Mode d'emploi d'un module (gabarit de modale v2) ─────────────────────
// La maquette ne montre pas ces textes, mais ils existaient sur la page V1 :
// on les conserve, accessibles depuis le « ? » de chaque tuile.
function vq2OpenTuto(page) {
  const e = (window.VQ_NAV || []).find(x => x.page === page);
  const t = (window.VQ_TUTO || {})[page];
  const ov = document.getElementById('vqTutoOv');
  if (!e || !t || !ov) return;
  const md = ov.querySelector('.v2-md');
  md.style.setProperty('--mc', e.c1);
  ov.querySelector('#vqTutoIco').innerHTML = e.icon;
  ov.querySelector('#vqTutoT').textContent = e.label;
  ov.querySelector('#vqTutoS').textContent = e.g;
  ov.querySelector('#vqTutoB').innerHTML = `
    <div class="vq-tuto-p">${t.role || ''}</div>
    ${(t.mode && t.mode.length) ? `<div class="vq-tuto-box">
      <div class="vq-tuto-h"><span aria-hidden="true">🛠️</span> Mode d'emploi</div>
      <ol class="vq-tuto-ol">${t.mode.map(s => `<li>${_vq(s)}</li>`).join('')}</ol></div>` : ''}
    ${t.sync ? `<div class="vq-tuto-box"><div class="vq-tuto-h">🔗 Synchronisé avec</div>
      <div class="vq-tuto-p">${t.sync}</div></div>` : ''}
    ${t.ex ? `<div class="vq-tuto-ex"><b>Exemple —</b> ${t.ex}</div>` : ''}`;
  VQ2.tuto = page;
  ov.classList.add('open');
}
function vq2CloseTuto() {
  const ov = document.getElementById('vqTutoOv');
  if (ov) ov.classList.remove('open');
  VQ2.tuto = null;
}
function vq2OuvrirTuto() {
  const p = VQ2.tuto;
  vq2CloseTuto();
  const e = (window.VQ_NAV || []).find(x => x.page === p);
  if (e && typeof window.loadPage === 'function') window.loadPage(e.page, e.label);
}

// ─── Interactions ─────────────────────────────────────────────────────────
document.addEventListener('click', ev => {
  const info = ev.target.closest('.vq-card-i');
  if (info) { ev.stopPropagation(); vq2OpenTuto(info.dataset.tuto); return; }
  const it = ev.target.closest('.vq-it, .vq-card');
  if (it && it.dataset.page && typeof window.loadPage === 'function') {
    window.loadPage(it.dataset.page, it.dataset.label);
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && VQ2.tuto) { vq2CloseTuto(); return; }
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const c = ev.target.closest && ev.target.closest('.vq-card');
  if (c && c.dataset.page && typeof window.loadPage === 'function') {
    ev.preventDefault();
    window.loadPage(c.dataset.page, c.dataset.label);
  }
});
