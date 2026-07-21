const EV_KEY = DB.keys.evaluations;

// ─── Design V2 (sombre) ───────────────────────────────────────────────────────
// La feuille et le module de rendu sont injectés ici pour que toute page
// chargeant js/evaluations.js (objectifs.html, fiche-liaison.html) hérite du
// thème sombre sans que le HTML ait à être modifié.
(function () {
  const base = (document.currentScript && document.currentScript.src || '')
    .replace(/js\/evaluations\.js.*$/, '');
  if (!document.querySelector('link[href$="css/v2-evaluations.css"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + 'css/v2-evaluations.css';
    document.head.appendChild(l);
  }
  if (!document.querySelector('script[src$="js/evaluations-v2.js"]')) {
    const s = document.createElement('script');
    s.src = base + 'js/evaluations-v2.js';
    s.async = false; // exécution ordonnée, après ce fichier
    document.head.appendChild(s);
  }
})();

// ─── Grilles disponibles ──────────────────────────────────────────────────────
const EV_GRILLES = {
  mif: {
    label: 'MIF — Mesure de l\'Indépendance Fonctionnelle',
    short: 'MIF',
    icon: '🧠',
    color: '#6366f1',
    scoreMin: 18, scoreMax: 126,
    niveaux: [
      { min:18,  max:36,  label:'Dépendance totale',    color:'#dc2626' },
      { min:37,  max:72,  label:'Dépendance sévère',    color:'#ea580c' },
      { min:73,  max:108, label:'Dépendance modérée',   color:'#d97706' },
      { min:109, max:126, label:'Indépendance totale',  color:'#16a34a' }
    ],
    dimensions: [
      {
        id:'soins_perso', label:'Soins personnels', items:[
          { id:'alimentation',  label:'Alimentation' },
          { id:'toilette',      label:'Soins du visage/cheveux' },
          { id:'bain',          label:'Bain / douche' },
          { id:'habillage_haut',label:'Habillage — haut du corps' },
          { id:'habillage_bas', label:'Habillage — bas du corps' },
          { id:'soins_perinee', label:'Soins périnéaux' }
        ]
      },
      {
        id:'continence', label:'Contrôle des sphincters', items:[
          { id:'vesicale',  label:'Contrôle vésical' },
          { id:'anale',     label:'Contrôle anal' }
        ]
      },
      {
        id:'transferts', label:'Mobilité — transferts', items:[
          { id:'lit_chaise',  label:'Lit / chaise / fauteuil roulant' },
          { id:'toilettes',   label:'Toilettes' },
          { id:'bain_douche', label:'Baignoire / douche' }
        ]
      },
      {
        id:'locomotion', label:'Locomotion', items:[
          { id:'marche_fauteuil', label:'Marche / Fauteuil roulant' },
          { id:'escaliers',       label:'Escaliers' }
        ]
      },
      {
        id:'communication', label:'Communication', items:[
          { id:'comprehension', label:'Compréhension' },
          { id:'expression',    label:'Expression' }
        ]
      },
      {
        id:'social', label:'Conscience du monde extérieur', items:[
          { id:'interaction',   label:'Interactions sociales' },
          { id:'resolution',    label:'Résolution de problèmes' },
          { id:'memoire',       label:'Mémoire' }
        ]
      }
    ],
    scaleItems: [
      { val:7, label:'Indépendance complète' },
      { val:6, label:'Indépendance modifiée (aide technique)' },
      { val:5, label:'Supervision' },
      { val:4, label:'Aide minimale (≥75% effort)' },
      { val:3, label:'Aide modérée (50–74%)' },
      { val:2, label:'Aide maximale (25–49%)' },
      { val:1, label:'Aide totale (<25%)' }
    ]
  },
  barthel: {
    label: 'Indice de Barthel',
    short: 'Barthel',
    icon: '🚶',
    color: '#0891b2',
    scoreMin: 0, scoreMax: 100,
    niveaux: [
      { min:0,  max:20,  label:'Dépendance totale',  color:'#dc2626' },
      { min:21, max:60,  label:'Dépendance sévère',  color:'#ea580c' },
      { min:61, max:90,  label:'Dépendance légère',  color:'#d97706' },
      { min:91, max:100, label:'Indépendance',        color:'#16a34a' }
    ],
    dimensions: [
      {
        id:'barthel_items', label:'Activités de la vie quotidienne', items:[
          { id:'alimentation',   label:'Alimentation',             opts:[{v:0,l:'Dépendant'},{v:5,l:'Aide partielle'},{v:10,l:'Indépendant'}] },
          { id:'bain',           label:'Bain / toilette',          opts:[{v:0,l:'Dépendant'},{v:5,l:'Indépendant'}] },
          { id:'toilette',       label:'Entretien personnel',      opts:[{v:0,l:'Dépendant'},{v:5,l:'Indépendant'}] },
          { id:'habillage',      label:'Habillage',                opts:[{v:0,l:'Dépendant'},{v:5,l:'Aide partielle'},{v:10,l:'Indépendant'}] },
          { id:'intestin',       label:'Contrôle intestinal',      opts:[{v:0,l:'Incontinent'},{v:5,l:'Accident occasionnel'},{v:10,l:'Continent'}] },
          { id:'vesical',        label:'Contrôle vésical',         opts:[{v:0,l:'Incontinent'},{v:5,l:'Accident occasionnel'},{v:10,l:'Continent'}] },
          { id:'toilettes',      label:'Utilisation des toilettes', opts:[{v:0,l:'Dépendant'},{v:5,l:'Aide partielle'},{v:10,l:'Indépendant'}] },
          { id:'transfert',      label:'Transfert lit–chaise',     opts:[{v:0,l:'Incapable'},{v:5,l:'Grande aide'},{v:10,l:'Aide minime'},{v:15,l:'Indépendant'}] },
          { id:'marche',         label:'Déambulation',             opts:[{v:0,l:'Incapable'},{v:5,l:'Fauteuil roulant'},{v:10,l:'Aide 1 personne'},{v:15,l:'Indépendant'}] },
          { id:'escaliers',      label:'Escaliers',                opts:[{v:0,l:'Incapable'},{v:5,l:'Aide'},{v:10,l:'Indépendant'}] }
        ]
      }
    ]
  },
  serafin: {
    label: 'SERAFIN-PH — Niveaux de besoin (nomenclature nationale)',
    short: 'SERAFIN-PH',
    icon: '🧩',
    color: '#7c3aed',
    scoreMin: 0, scoreMax: 44,
    // Le total exprime l'INTENSITÉ GLOBALE DES BESOINS (plus il est haut, plus
    // l'accompagnement requis est important) — lecture inverse de la MIF.
    // Bornes calées sur la moyenne des 11 niveaux : ≤1 faible, ≤2 modéré, ≤3 important
    niveaux: [
      { min:0,  max:11, label:'Besoins faibles',         color:'#16a34a' },
      { min:12, max:24, label:'Besoins modérés',         color:'#d97706' },
      { min:25, max:36, label:'Besoins importants',      color:'#ea580c' },
      { min:37, max:44, label:'Besoins très importants', color:'#dc2626' }
    ],
    // Dimensions dérivées de la nomenclature des besoins SERAFIN-PH
    // (SP_BESOINS, js/serafin-codage.js — chargé avant ce fichier).
    dimensions: (typeof SP_BESOINS !== 'undefined' ? [
      { id: 'sante',         label: '1.1 — Santé somatique ou psychique',
        items: SP_BESOINS.filter(b => b.code.indexOf('1.1') === 0).map(b => ({ id: b.code, label: `${b.code} · ${b.label}` })) },
      { id: 'autonomie',     label: '1.2 — Autonomie',
        items: SP_BESOINS.filter(b => b.code.indexOf('1.2') === 0).map(b => ({ id: b.code, label: `${b.code} · ${b.label}` })) },
      { id: 'participation', label: '1.3 — Participation sociale',
        items: SP_BESOINS.filter(b => b.code.indexOf('1.3') === 0).map(b => ({ id: b.code, label: `${b.code} · ${b.label}` })) }
    ] : []),
    scaleItems: [
      { val: 0, label: 'Aucun besoin' },
      { val: 1, label: 'Besoin faible' },
      { val: 2, label: 'Besoin modéré' },
      { val: 3, label: 'Besoin important' },
      { val: 4, label: 'Besoin très important' }
    ]
  }
};

// Source = Supabase. Cache mémoire chargé au démarrage.
let _evCache = [];
function getEv()       { return _evCache; }
async function loadEvCache() { _evCache = (typeof sbGetEvaluations === 'function') ? await sbGetEvaluations() : []; }

let _evResidentId = '';
let _evGrille     = 'mif';
let _evEditId     = '';

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initEvaluations() {
  const s = Auth.requireAuth();
  if (!s) return;
  // Les deux caches sont indépendants : une seule vague réseau au lieu
  // de deux. Enchaînés, le second partait hors de la fenêtre où
  // supabase-client.js mutualise les lectures identiques.
  await Promise.all([sbLoadResidentsCache(), loadEvCache()]);
  const params = new URLSearchParams(window.location.search);
  _evResidentId = params.get('residentId') || params.get('id') || '';

  _populateEvResidents();
  document.getElementById('evResident')?.addEventListener('change', e => {
    _evResidentId = e.target.value;
    renderEvList();
  });
  document.getElementById('evGrille')?.addEventListener('change', e => {
    _evGrille = e.target.value;
    renderEvList();
  });

  if (_evResidentId) {
    const sel = document.getElementById('evResident');
    if (sel) sel.value = _evResidentId;
  }
  const canEdit = ['admin', 'moderator', 'superadmin'].includes(s.role)
    || ((typeof canEditResidents === 'function') ? canEditResidents(s.userId) : Auth.isAdmin());
  if (!canEdit) { const b = document.getElementById('btnAddEv'); if (b) b.style.display = 'none'; }
  renderEvList();
}

function _populateEvResidents() {
  const residents = sbResidents();
  const el = document.getElementById('evResident');
  if (!el) return;
  el.innerHTML = '<option value="">Tous les résidents</option>' +
    residents.map(r => `<option value="${r.id}">${escHtml((r.prenom||'')+' '+(r.nom||''))}</option>`).join('');
  if (_evResidentId) el.value = _evResidentId;
}

// ─── Liste des évaluations ────────────────────────────────────────────────────
function renderEvList() {
  const container = document.getElementById('evList');
  if (!container) return;

  // Repli sombre : sur objectifs.html c'est ob2RenderEv (js/objectifs-v2.js)
  // qui prend la main. Ce rendu sert aux pages sans ce module.
  const grilleFilter = document.getElementById('evGrille')?.value || '';
  const residents    = sbResidents();
  const all          = getEv();
  let list = all;
  if (_evResidentId) list = list.filter(e => e.residentId === _evResidentId);
  if (grilleFilter)  list = list.filter(e => e.grille === grilleFilter);
  list = list.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const stats = document.getElementById('evStats');
  if (stats) {
    const monthPrefix = today().slice(0, 7);
    const ceMois = all.filter(e => (e.date || '').slice(0, 7) === monthPrefix).length;
    const nbRes  = new Set(all.map(e => e.residentId).filter(Boolean)).size;
    const kpi = (n, l, c) => `<div class="v2-kpi" style="--c:${c}"><div style="min-width:0">
      <div class="v2-kpi-n">${n}</div><div class="v2-kpi-l">${l}</div></div></div>`;
    stats.innerHTML = kpi(all.length, 'Évaluations', '#a5b4fc')
      + kpi(nbRes, 'Résidents évalués', '#818cf8')
      + kpi(ceMois, 'Ce mois', '#10b981');
  }

  if (!list.length) {
    container.innerHTML = `<div class="v2-blk"><div class="v2-blk-t">Évaluations</div>
      <div class="v2-blk-vide">${_evResidentId || grilleFilter
        ? 'Aucune évaluation ne correspond à ce filtre.'
        : 'Aucune évaluation enregistrée. Créez une évaluation MIF, Barthel ou SERAFIN-PH pour suivre l\'autonomie des résidents.'}</div></div>`;
    return;
  }

  container.innerHTML = '<div class="ev2-list">'
    + list.map(e => _evCard(e, residents)).join('') + '</div>';
}

function _evScore(e) {
  const g = EV_GRILLES[e.grille];
  if (!g) return 0;
  let total = 0;
  if (e.grille === 'mif' || e.grille === 'serafin') {
    g.dimensions.forEach(dim => dim.items.forEach(it => { total += Number(e.scores?.[it.id] || 0); }));
  } else if (e.grille === 'barthel') {
    g.dimensions[0].items.forEach(it => { total += Number(e.scores?.[it.id] || 0); });
  }
  return total;
}

function _evNiveau(grille, score) {
  const g = EV_GRILLES[grille];
  if (!g) return null;
  return g.niveaux.find(n => score >= n.min && score <= n.max) || g.niveaux[0];
}

// Libellé court d'un niveau pour l'échelle du design (ex. « Besoins modérés » → « Modérés »)
function _evShort(label) {
  if (/^Indépendance/i.test(label || '')) return 'Autonome';
  let s = (label || '').replace(/^Besoins\s+/i, '').replace(/^Dépendance\s+/i, '');
  s = s.replace(/très importants?/i, 'Très imp.');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Échelle de niveau segmentée : une case par bande de la grille, remplies jusqu'à
// la bande courante (avec la couleur de chaque bande), les suivantes en gris.
function _evScale(g, niveau) {
  const nivs = (g && g.niveaux) || [];
  if (!nivs.length) return '';
  const cur = nivs.indexOf(niveau);
  const segs = nivs.map((n, i) => `<span style="flex:1;height:8px;border-radius:3px;background:${i <= cur ? n.color : 'rgba(255,255,255,.08)'}"></span>`).join('');
  const lbls = nivs.map((n, i) => `<span style="flex:1;text-align:center;line-height:1.2;${i === cur ? `color:${n.color};font-weight:700` : ''}">${escHtml(_evShort(n.label))}</span>`).join('');
  return `<div style="margin-top:.55rem">
    <div style="display:flex;gap:3px">${segs}</div>
    <div style="display:flex;justify-content:space-between;font-size:.6rem;color:var(--muted);margin-top:.3rem">${lbls}</div>
  </div>`;
}

function _evCard(e, residents) {
  const g   = EV_GRILLES[e.grille];
  const r   = (residents || []).find(x => String(x.id) === String(e.residentId));
  const nom = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : 'Résident inconnu';
  const col = safeColor(r?.color, '#818cf8');
  const gc  = g?.color || '#818cf8';
  const score = _evScore(e), max = g?.scoreMax || 100;
  const pct = max ? Math.round(score / max * 100) : 0;
  const niveau = _evNiveau(e.grille, score);
  const dateStr = e.date
    ? new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  return `<div class="ev2-row-ev" role="button" tabindex="0" onclick="openEvDetail('${e.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEvDetail('${e.id}')}"
      aria-label="Évaluation ${escHtml(g?.short || e.grille)} de ${escHtml(nom)}">
    <span style="width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#0a1728;background:${col}">${initials(r?.prenom, r?.nom)}</span>
    <div style="width:150px;flex-shrink:0;min-width:0">
      <div class="nom">${escHtml(nom)}</div><div class="date">${dateStr}</div>
    </div>
    <span class="v2-badge" style="color:${gc};background:${gc}1c">${escHtml(g?.short || e.grille)}</span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:baseline;margin-bottom:5px">
        <span style="font-size:11px;color:var(--v2-t6,#8095b4)">Score</span>
        <span style="margin-left:auto;font-size:12px;font-weight:800;color:${gc};font-family:var(--v2-display,'Space Grotesk',sans-serif)">${score} / ${max}</span>
      </div>
      <div class="v2-prog"><span style="width:${pct}%;background:${gc}"></span></div>
    </div>
    ${niveau ? `<span class="v2-badge" style="color:${niveau.color};background:${niveau.color}1c">${escHtml(niveau.label)}</span>` : ''}
  </div>`;
}

// ─── Modal saisie ─────────────────────────────────────────────────────────────
function openEvModal(id, presetRid) {
  _evEditId = id || '';
  const list = getEv();
  const ev   = id ? list.find(x => x.id === id) : null;
  const grille = ev?.grille || _evGrille || 'mif';
  _evGrille = grille;

  document.getElementById('evModalTitle').textContent = ev ? 'Modifier l\'évaluation' : 'Nouvelle évaluation';
  document.getElementById('evModalResidentSel').value = ev?.residentId || presetRid || _evResidentId || '';

  const grilleEl = document.getElementById('evModalGrille');
  if (grilleEl) { grilleEl.value = grille; grilleEl.addEventListener('change', () => _renderEvForm()); }

  document.getElementById('evModalDate').value  = ev?.date || new Date().toISOString().slice(0,10);
  document.getElementById('evModalNote').value  = ev?.note || '';

  _renderEvForm(ev?.scores);
  _populateEvModalResidents(ev?.residentId || presetRid || _evResidentId);
  openModal('modalEv');
}

function _populateEvModalResidents(selected) {
  const residents = sbResidents();
  const el = document.getElementById('evModalResidentSel');
  if (!el) return;
  el.innerHTML = '<option value="">— Choisir —</option>' +
    residents.map(r => `<option value="${r.id}"${r.id===selected?' selected':''}>${escHtml((r.prenom||'')+' '+(r.nom||''))}</option>`).join('');
}

function _renderEvForm(scores) {
  const grille = document.getElementById('evModalGrille')?.value || _evGrille || 'mif';
  const g = EV_GRILLES[grille];
  if (!g) return;
  const container = document.getElementById('evFormBody');
  if (!container) return;

  if (grille === 'mif') {
    const scaleHtml = `<div style="margin-bottom:1rem;padding:.6rem .8rem;background:#f8fafc;border-radius:8px;border:1px solid var(--border)">
      <div style="font-size:.72rem;font-weight:700;color:var(--muted);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.05em">Échelle de cotation</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:.2rem">${g.scaleItems.map(s=>`<div style="text-align:center;padding:.3rem .2rem;background:#fff;border-radius:4px;border:0.5px solid var(--border)"><div style="font-size:.85rem;font-weight:800;color:${g.color}">${s.val}</div><div style="font-size:.58rem;color:var(--muted);line-height:1.2">${s.label}</div></div>`).join('')}</div>
    </div>`;
    container.innerHTML = scaleHtml + g.dimensions.map(dim =>
      `<div style="margin-bottom:.85rem">
        <div style="font-size:.78rem;font-weight:700;color:${g.color};margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.04em">${dim.label}</div>
        ${dim.items.map(it => {
          const val = scores?.[it.id] || '';
          return `<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;padding:.35rem .5rem;background:#f8fafc;border-radius:6px">
            <label style="flex:1;font-size:.8rem;color:var(--text)">${it.label}</label>
            <select name="score_${it.id}" style="font-size:.8rem;padding:.2rem .4rem;border:1px solid var(--border);border-radius:6px;width:60px">
              <option value="">—</option>
              ${[7,6,5,4,3,2,1].map(v=>`<option value="${v}"${Number(val)===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>`;
        }).join('')}
      </div>`
    ).join('');
  } else if (grille === 'barthel') {
    container.innerHTML = g.dimensions[0].items.map(it => {
      const val = scores?.[it.id] ?? '';
      return `<div style="margin-bottom:.55rem;padding:.5rem .65rem;background:#f8fafc;border-radius:8px;border:0.5px solid var(--border)">
        <div style="font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:.35rem">${it.label}</div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
          ${it.opts.map(o=>`<label style="display:flex;align-items:center;gap:.3rem;font-size:.76rem;cursor:pointer;padding:.2rem .5rem;border-radius:6px;border:1px solid var(--border);background:#fff"><input type="radio" name="score_${it.id}" value="${o.v}"${Number(val)===o.v?' checked':''}> ${o.l} <b>(${o.v})</b></label>`).join('')}
        </div>
      </div>`;
    }).join('');
  } else if (grille === 'serafin') {
    if (!g.dimensions.length) {
      container.innerHTML = '<div class="empty" style="padding:1.5rem;text-align:center"><p>Nomenclature SERAFIN-PH non chargée sur cette page.</p></div>';
      return;
    }
    const scaleHtml = `<div style="margin-bottom:1rem;padding:.6rem .8rem;background:#faf5ff;border-radius:8px;border:1px solid #ede9fe">
      <div style="font-size:.72rem;font-weight:700;color:#7c3aed;margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.05em">Niveau de besoin (0 → 4)</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.2rem">${g.scaleItems.map(s=>`<div style="text-align:center;padding:.3rem .2rem;background:#fff;border-radius:4px;border:0.5px solid #ede9fe"><div style="font-size:.85rem;font-weight:800;color:#7c3aed">${s.val}</div><div style="font-size:.58rem;color:var(--muted);line-height:1.2">${s.label}</div></div>`).join('')}</div>
      <div style="font-size:.66rem;color:var(--muted);margin-top:.4rem">Positionnement du résident sur la nomenclature nationale des besoins SERAFIN-PH — support d'échange en équipe pluridisciplinaire.</div>
    </div>`;
    container.innerHTML = scaleHtml + g.dimensions.map(dim =>
      `<div style="margin-bottom:.85rem">
        <div style="font-size:.78rem;font-weight:700;color:${g.color};margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.04em">${dim.label}</div>
        ${dim.items.map(it => {
          const val = scores?.[it.id] ?? '';
          return `<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;padding:.35rem .5rem;background:#faf5ff;border-radius:6px">
            <label style="flex:1;font-size:.8rem;color:var(--text)">${it.label}</label>
            <select name="score_${it.id}" style="font-size:.76rem;padding:.2rem .35rem;border:1px solid var(--border);border-radius:6px;width:190px;flex-shrink:0">
              <option value="">—</option>
              ${g.scaleItems.map(s=>`<option value="${s.val}"${val !== '' && Number(val)===s.val?' selected':''}>${s.val} — ${s.label}</option>`).join('')}
            </select>
          </div>`;
        }).join('')}
      </div>`
    ).join('');
  }

  // Score live
  container.addEventListener('change', _updateEvLiveScore);
  _updateEvLiveScore();
}

function _updateEvLiveScore() {
  const grille = document.getElementById('evModalGrille')?.value || 'mif';
  const g = EV_GRILLES[grille];
  if (!g) return;
  let total = 0;
  document.querySelectorAll('#evFormBody [name^="score_"]').forEach(el => {
    if ((el.type === 'radio' && el.checked) || el.tagName === 'SELECT') {
      const v = Number(el.value);
      if (!isNaN(v) && v > 0) total += v;
    }
  });
  const niveau = _evNiveau(grille, total);
  const scoreEl = document.getElementById('evLiveScore');
  if (scoreEl) {
    scoreEl.innerHTML = `<span style="font-size:1.4rem;font-weight:800;color:${niveau?.color||g.color}">${total}</span><span style="color:var(--muted)"> / ${g.scoreMax}</span> — <span style="color:${niveau?.color||g.color};font-weight:600">${niveau?.label||''}</span>`;
  }
}

async function saveEvaluation() {
  const rid   = document.getElementById('evModalResidentSel').value;
  const grille = document.getElementById('evModalGrille').value;
  const date  = document.getElementById('evModalDate').value;
  const note  = document.getElementById('evModalNote').value.trim();
  if (!date) { toast('La date est obligatoire','error'); return; }

  const scores = {};
  document.querySelectorAll('#evFormBody [name^="score_"]').forEach(el => {
    if ((el.type === 'radio' && el.checked) || el.tagName === 'SELECT') {
      const itemId = el.name.replace('score_','');
      const v = Number(el.value);
      if (!isNaN(v) && el.value !== '') scores[itemId] = v;
    }
  });

  const data = { residentId: rid||null, grille, date, note, scores };

  try {
    if (_evEditId) {
      const old = _evCache.find(x => x.id === _evEditId) || {};
      const saved = await sbSaveEvaluation({ ...old, ...data, id: _evEditId });
      _evCache = _evCache.map(x => x.id === _evEditId ? saved : x);
      toast('Évaluation modifiée');
    } else {
      const saved = await sbSaveEvaluation(data);
      _evCache.unshift(saved);
      toast('Évaluation enregistrée', 'success');
    }
  } catch (e) { console.error('[saveEvaluation]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  closeModal('modalEv');
  renderEvList();
}

// ─── Détail ───────────────────────────────────────────────────────────────────
function openEvDetail(id) {
  const ev = getEv().find(x => x.id === id);
  if (!ev) return;
  const g = EV_GRILLES[ev.grille];
  if (!g) return;
  const score  = _evScore(ev);
  const niveau = _evNiveau(ev.grille, score);
  const residents = sbResidents();
  const r = residents.find(x => x.id === ev.residentId);
  const nom = r ? `${r.prenom||''} ${r.nom||''}`.trim() : 'Résident inconnu';
  const dateStr = new Date(ev.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  let detailHtml = '';
  if (ev.grille === 'mif') {
    detailHtml = g.dimensions.map(dim => {
      const dimItems = dim.items.filter(it => ev.scores?.[it.id]);
      if (!dimItems.length) return '';
      return `<div style="margin-bottom:.75rem">
        <div style="font-size:.75rem;font-weight:700;color:${g.color};text-transform:uppercase;margin-bottom:.3rem">${dim.label}</div>
        ${dimItems.map(it => {
          const v = ev.scores[it.id];
          const sc = g.scaleItems.find(s=>s.val===v);
          return `<div style="display:flex;justify-content:space-between;padding:.25rem .5rem;border-radius:4px;background:#f8fafc;margin-bottom:.2rem">
            <span style="font-size:.78rem">${it.label}</span>
            <span style="font-size:.78rem;font-weight:700;color:${v>=5?'#16a34a':v>=3?'#d97706':'#dc2626'}">${v} — ${sc?.label||''}</span>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  } else if (ev.grille === 'barthel') {
    detailHtml = g.dimensions[0].items.filter(it => ev.scores?.[it.id] !== undefined).map(it => {
      const v = ev.scores[it.id];
      const opt = it.opts.find(o=>o.v===v);
      return `<div style="display:flex;justify-content:space-between;padding:.3rem .5rem;border-radius:4px;background:#f8fafc;margin-bottom:.25rem">
        <span style="font-size:.78rem">${it.label}</span>
        <span style="font-size:.78rem;font-weight:700;color:${v>=10?'#16a34a':v>=5?'#d97706':'#dc2626'}">${v} — ${opt?.l||''}</span>
      </div>`;
    }).join('');
  } else if (ev.grille === 'serafin') {
    // Lecture inverse de la MIF : plus le niveau de besoin est HAUT, plus la couleur alerte
    detailHtml = g.dimensions.map(dim => {
      const dimItems = dim.items.filter(it => ev.scores?.[it.id] !== undefined);
      if (!dimItems.length) return '';
      return `<div style="margin-bottom:.75rem">
        <div style="font-size:.75rem;font-weight:700;color:${g.color};text-transform:uppercase;margin-bottom:.3rem">${dim.label}</div>
        ${dimItems.map(it => {
          const v = ev.scores[it.id];
          const sc = g.scaleItems.find(s=>s.val===v);
          return `<div style="display:flex;justify-content:space-between;gap:.6rem;padding:.25rem .5rem;border-radius:4px;background:#faf5ff;margin-bottom:.2rem">
            <span style="font-size:.78rem">${it.label}</span>
            <span style="font-size:.78rem;font-weight:700;white-space:nowrap;color:${v>=3?'#dc2626':v===2?'#d97706':'#16a34a'}">${v} — ${sc?.label||''}</span>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  const pct = Math.round(score / g.scoreMax * 100);
  document.getElementById('evDetailBody').innerHTML = `
    <div style="text-align:center;margin-bottom:1rem">
      <div style="font-size:.8rem;color:var(--muted)">${dateStr}</div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin:.2rem 0">${nom} — ${g.label}</div>
      <div style="font-size:2.2rem;font-weight:800;color:${niveau?.color||g.color}">${score}<span style="font-size:1rem;font-weight:400;color:var(--muted)"> / ${g.scoreMax}</span></div>
      <div style="font-size:.85rem;font-weight:700;color:${niveau?.color||g.color};margin:.2rem 0">${niveau?.label||''}</div>
      <div style="height:8px;background:#f1f5f9;border-radius:999px;margin:.75rem auto;max-width:280px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${niveau?.color||g.color};border-radius:999px"></div></div>
    </div>
    ${detailHtml}
    ${ev.note ? `<div style="margin-top:.75rem;padding:.6rem .75rem;background:#f8fafc;border-radius:8px;border-left:3px solid ${g.color};font-size:.8rem;color:var(--muted);font-style:italic">${escHtml(ev.note)}</div>` : ''}`;
  openModal('modalEvDetail');
}

// ─── Delete ───────────────────────────────────────────────────────────────────
function deleteEv(id) {
  if (!confirm('Supprimer cette évaluation ?')) return;
  (async () => {
    try { await sbDeleteEvaluation(id); _evCache = _evCache.filter(x => x.id !== id); }
    catch (e) { console.error('[deleteEv]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    renderEvList();
    toast('Évaluation supprimée');
  })();
}

document.addEventListener('DOMContentLoaded', initEvaluations);
