// ── MES FORMATIONS — DESIGN V2 ────────────────────────────────────────────
// Reproduit la maquette « Formation (RH) » appliquée à l'espace personnel du
// salarié : barre du haut, 4 tuiles statistiques, chips de filtre à pastille,
// tableau des formations, puis un rail (parcours, heures par domaine,
// prochaines sessions, mes évaluations).
//
// Les données et les actions restent celles du script de mes-formations.html
// (_mfCache, _mfFiche, _mfEmployesMap, mfInscrire, mfDesinscrire).
// Seule nouveauté : l'évaluation d'une formation suivie, stockée dans
// public.formation_evaluations (migration-mes-formations.sql).

const MF2_SQL_FILE = 'migration-mes-formations.sql';

const MF2_IC = {
  book:  '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  grad:  '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/>',
  star:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pen:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
};

// Palette d'accent par domaine (déterministe : même domaine = même couleur)
const MF2_PAL = ['#16a34a', '#22d3ee', '#818cf8', '#f59e0b', '#ec4899', '#a855f7', '#38bdf8', '#4ade80'];
const MF2_MOIS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

// Filtres — mêmes valeurs que le <select id="mfFiltre"> (contrat du script page)
const MF2_FILTRES = [
  { id: 'dispo',   label: 'À venir',            dot: '#22d3ee' },
  { id: 'inscrit', label: 'Mes inscriptions',   dot: '#818cf8' },
  { id: 'passe',   label: 'Passées / suivies',  dot: '#10b981' },
  { id: 'tout',    label: 'Toutes',             dot: '#8095b4' }
];

// État du module « évaluations »
let MF2_EVALS = [];        // évaluations du salarié connecté
let MF2_EVAL_OK = true;    // false = table absente → écriture refusée
let MF2_EVAL_ID = null;    // formation en cours d'évaluation dans la modale
let MF2_EVAL_NOTE = null;

// ── Utilitaires ──────────────────────────────────────────────────────────
function mf2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function mf2Color(s) {
  const k = String(s || '');
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 9973;
  return MF2_PAL[h % MF2_PAL.length];
}
function mf2DateRef(f) { return f.dateFin || f.dateDebut || ''; }
function mf2Passe(f) { const d = mf2DateRef(f); return !!d && d < mfToday(); }
function mf2EnCours(f) {
  const a = f.dateDebut, b = f.dateFin || f.dateDebut, t = mfToday();
  return !!a && a <= t && (!b || b >= t);
}
function mf2Inscrit(f) {
  return !!_mfFiche && (f.participants || []).some(p => String(p) === String(_mfFiche.id));
}
function mf2Statut(f) {
  if (f.statut === 'annulee') return { l: 'Annulée', c: '#8095b4' };
  if (f.statut === 'realisee') return { l: 'Réalisée', c: '#10b981' };
  if (mf2Passe(f)) return { l: 'Terminée', c: '#10b981' };
  if (mf2EnCours(f)) return { l: 'En cours', c: '#f59e0b' };
  return { l: 'Planifiée', c: '#22d3ee' };
}
function mf2Dates(f) {
  if (!f.dateDebut) return '—';
  const a = formatDate(f.dateDebut);
  if (f.dateFin && f.dateFin !== f.dateDebut) return a + ' → ' + formatDate(f.dateFin);
  return a;
}
function mf2Pastille(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return { j: '--', m: '' };
  return { j: String(d.getDate()).padStart(2, '0'), m: MF2_MOIS[d.getMonth()] };
}
// Liste filtrée — reprend exactement la logique du script de la page
function mf2Liste(filtre) {
  if (!_mfFiche) return [];
  let list = [..._mfCache];
  if (filtre === 'inscrit') list = list.filter(mf2Inscrit);
  else if (filtre === 'dispo') list = list.filter(f => f.statut === 'planifiee' && mf2DateRef(f) >= mfToday());
  else if (filtre === 'passe') list = list.filter(f => mf2Inscrit(f) && (f.statut === 'realisee' || mf2Passe(f)));

  if (filtre === 'passe') list.sort((a, b) => mf2DateRef(b).localeCompare(mf2DateRef(a)));
  else list.sort((a, b) => (a.dateDebut || '').localeCompare(b.dateDebut || ''));
  return list;
}

// ── Évaluations (nouveauté de la maquette) ───────────────────────────────
function mf2EvalDe(formationId) {
  return MF2_EVALS.find(e => String(e.formation_id) === String(formationId)) || null;
}

async function mf2LoadEvals() {
  MF2_EVALS = [];
  try {
    const { data: u } = await supabaseClient.auth.getUser();
    if (!u || !u.user) { MF2_EVAL_OK = false; return; }
    const { data, error } = await supabaseClient
      .from('formation_evaluations').select('*').eq('profile_id', u.user.id);
    if (error) throw error;
    MF2_EVALS = data || [];
    MF2_EVAL_OK = true;
  } catch (e) {
    MF2_EVAL_OK = false;
    console.warn('[mes-formations] table formation_evaluations indisponible — exécuter ' +
      MF2_SQL_FILE + ' pour activer les évaluations.', e && e.message ? e.message : e);
  }
}

function mf2OpenEval(id) {
  const f = _mfCache.find(x => String(x.id) === String(id));
  if (!f) return;
  MF2_EVAL_ID = id;
  const ex = mf2EvalDe(id);
  MF2_EVAL_NOTE = ex ? ex.note : null;
  const t = document.getElementById('mfEvalTitre');
  const s = document.getElementById('mfEvalSous');
  if (t) t.textContent = ex ? 'Modifier mon évaluation' : 'Évaluer cette formation';
  if (s) s.textContent = f.titre || '';
  document.getElementById('mfEvalChaud').value = ex ? (ex.chaud || '') : '';
  document.getElementById('mfEvalFroid').value = ex ? (ex.froid || '') : '';
  mf2SetNote(MF2_EVAL_NOTE);
  const warn = document.getElementById('mfEvalWarn');
  if (warn) warn.style.display = MF2_EVAL_OK ? 'none' : 'flex';
  openModal('modalMfEval');
}

function mf2SetNote(n) {
  MF2_EVAL_NOTE = n;
  document.querySelectorAll('#mfEvalSeg .v2-seg-o').forEach(b => {
    b.classList.toggle('on', String(b.dataset.n) === String(n));
  });
}

async function mf2SaveEval() {
  if (!MF2_EVAL_ID || !_mfFiche) return;
  if (!MF2_EVAL_NOTE) { toast('Choisissez une note de 1 à 5', 'error'); return; }
  if (!MF2_EVAL_OK) {
    toast('Évaluations indisponibles : exécutez ' + MF2_SQL_FILE + ' dans Supabase.', 'error');
    return;
  }
  try {
    const { data: u } = await supabaseClient.auth.getUser();
    if (!u || !u.user) throw new Error('Non connecté');
    const row = {
      etablissement_id: await sbGetEtablissementId(),
      formation_id: MF2_EVAL_ID,
      employe_id: _mfFiche.id,
      profile_id: u.user.id,
      note: MF2_EVAL_NOTE,
      chaud: document.getElementById('mfEvalChaud').value.trim(),
      froid: document.getElementById('mfEvalFroid').value.trim(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
      .from('formation_evaluations')
      .upsert(row, { onConflict: 'formation_id,profile_id' }).select();
    if (error) throw error;
    const saved = (data && data[0]) || row;
    const i = MF2_EVALS.findIndex(e => String(e.formation_id) === String(MF2_EVAL_ID));
    if (i >= 0) MF2_EVALS[i] = saved; else MF2_EVALS.push(saved);
    closeModal('modalMfEval');
    toast('Évaluation enregistrée ✓', 'success');
    mf2Render();
  } catch (e) {
    console.error('[mf2SaveEval]', e);
    MF2_EVAL_OK = false;
    toast('Enregistrement impossible — exécutez ' + MF2_SQL_FILE + ' dans Supabase.', 'error');
  }
}

// ── Rendu ────────────────────────────────────────────────────────────────
function mf2Render() {
  if (!_mfFiche) return;
  const layout = document.getElementById('mfLayout');
  if (layout) layout.style.display = '';
  const sel = document.getElementById('mfFiltre');
  const filtre = (sel && sel.value) || 'dispo';

  mf2RenderStats();
  mf2RenderChips(filtre);
  mf2RenderTable(filtre);
  mf2RenderRail();
}

function mf2Mine() { return _mfCache.filter(mf2Inscrit); }

function mf2RenderStats() {
  const el = document.getElementById('mfStats');
  if (!el) return;
  const mine = mf2Mine();
  const suivies = mine.filter(f => f.statut === 'realisee' || mf2Passe(f));
  const aVenir = mine.filter(f => f.statut === 'planifiee' && !mf2Passe(f));
  const heures = suivies.reduce((s, f) => s + (Number(f.dureeHeures) || 0), 0);
  const ouvertes = _mfCache.filter(f => {
    if (f.statut !== 'planifiee' || mf2Passe(f) || mf2Inscrit(f)) return false;
    const p = (f.participants || []).length;
    return !f.maxParticipants || p < f.maxParticipants;
  });

  const tiles = [
    { n: suivies.length, l: 'Formations suivies', c: '#4ade80', ic: MF2_IC.grad },
    { n: heures ? heures + ' h' : '0 h', l: 'Heures cumulées', c: '#22d3ee', ic: MF2_IC.clock },
    { n: aVenir.length, l: 'Inscriptions à venir', c: '#818cf8', ic: MF2_IC.cal },
    { n: ouvertes.length, l: 'Places ouvertes', c: '#f59e0b', ic: MF2_IC.book }
  ];
  el.innerHTML = tiles.map(t => `<div class="mf2-stat">
    <span class="mf2-stat-ico" style="--pc:${t.c}">${mf2Svg(t.ic)}</span>
    <div class="mf2-stat-txt">
      <div class="mf2-stat-n" style="color:${t.c}">${escHtml(String(t.n))}</div>
      <div class="mf2-stat-l">${escHtml(t.l)}</div>
    </div>
  </div>`).join('');
}

function mf2RenderChips(actif) {
  const el = document.getElementById('mfChips');
  if (!el) return;
  el.innerHTML = MF2_FILTRES.map(f => `<button type="button" class="v2-chip-f${f.id === actif ? ' on' : ''}"
      onclick="mf2SetFiltre('${f.id}')" aria-pressed="${f.id === actif}">
      <span class="dot" style="background:${f.dot}"></span>${escHtml(f.label)}
      <span class="n">${mf2Liste(f.id).length}</span>
    </button>`).join('');
}

function mf2SetFiltre(id) {
  const sel = document.getElementById('mfFiltre');
  if (sel) sel.value = id;
  mf2Render();
}

function mf2RenderTable(filtre) {
  const el = document.getElementById('mfList');
  if (!el) return;
  const list = mf2Liste(filtre);

  if (!list.length) {
    const msg = filtre === 'inscrit' ? "Vous n'êtes inscrit à aucune formation."
      : filtre === 'passe' ? 'Aucune formation passée pour le moment.'
      : 'Aucune formation à venir pour le moment.';
    el.innerHTML = `<div class="mf2-vide">
      <span class="mf2-vide-ico">${mf2Svg(MF2_IC.grad, 1.6)}</span>
      <div class="mf2-vide-t">Aucune formation</div>
      <div class="v2-blk-vide">${escHtml(msg)}</div>
    </div>`;
    return;
  }

  const rows = list.map(f => {
    const c = mf2Color(f.domaine || f.organisme || f.titre);
    const st = mf2Statut(f);
    const parts = f.participants || [];
    const inscrit = mf2Inscrit(f);
    const passe = mf2Passe(f);
    const complet = !!f.maxParticipants && parts.length >= f.maxParticipants && !inscrit;
    const noms = parts.map(id => _mfEmployesMap.get(id) || _mfEmployesMap.get(String(id))).filter(Boolean);
    const ev = mf2EvalDe(f.id);

    // Places : barre de remplissage si un plafond est défini
    let places;
    if (f.maxParticipants) {
      const pct = Math.min(100, Math.round(parts.length / f.maxParticipants * 100));
      places = `<div class="mf2-cap">
        <div class="mf2-cap-n">${parts.length}/${f.maxParticipants}</div>
        <div class="v2-prog mf2-cap-bar"><span style="width:${pct}%;background:${complet ? '#ef4444' : c}"></span></div>
      </div>`;
    } else {
      places = `<span class="mf2-cap-n">${parts.length} inscrit${parts.length > 1 ? 's' : ''}</span>`;
    }

    // Action : inscription / désinscription / évaluation
    let act = '';
    if (f.statut === 'planifiee' && !passe) {
      if (inscrit) act = `<button type="button" class="mf2-act ok" onclick="mfDesinscrire('${escAttr(f.id)}')">${mf2Svg(MF2_IC.check, 2.6)}Inscrit · se désinscrire</button>`;
      else if (complet) act = `<span class="mf2-act muted">Complet</span>`;
      else act = `<button type="button" class="mf2-act pri" onclick="mfInscrire('${escAttr(f.id)}')">${mf2Svg(MF2_IC.plus, 2.6)}S'inscrire</button>`;
    } else if (inscrit && (passe || f.statut === 'realisee')) {
      act = `<button type="button" class="mf2-act ${ev ? 'ev' : ''}" onclick="mf2OpenEval('${escAttr(f.id)}')">${mf2Svg(ev ? MF2_IC.pen : MF2_IC.star, 2)}${ev ? 'Noté ' + ev.note + '/5' : 'Évaluer'}</button>`;
    } else if (passe) {
      act = `<span class="mf2-act muted">Terminée</span>`;
    }

    const sousTitre = [f.organisme, f.dureeHeures ? f.dureeHeures + ' h' : ''].filter(Boolean).join(' · ');
    const titreMobile = [mf2Dates(f), f.domaine].filter(Boolean).join(' · ');

    return `<tr class="mf2-tr${f.statut === 'annulee' ? ' off' : ''}">
      <td class="mf2-td-f">
        <div class="mf2-f">
          <span class="mf2-f-ico" style="--pc:${c}">${mf2Svg(MF2_IC.grad)}</span>
          <div class="mf2-f-txt">
            <div class="mf2-f-t">${escHtml(f.titre || 'Formation')}</div>
            <div class="mf2-f-s">${escHtml(sousTitre || '—')}</div>
            <div class="mf2-f-m">${escHtml(titreMobile)}</div>
          </div>
        </div>
      </td>
      <td class="mf2-col-dom">${f.domaine ? `<span class="mf2-pill" style="--pc:${c}">${escHtml(f.domaine)}</span>` : '<span class="mf2-dash">—</span>'}</td>
      <td class="mf2-col-date">${escHtml(mf2Dates(f))}</td>
      <td class="mf2-col-places" title="${escAttr(noms.join(', '))}">${places}</td>
      <td class="mf2-col-st"><span class="mf2-st" style="color:${st.c}"><span class="mf2-st-d" style="background:${st.c}"></span>${escHtml(st.l)}</span></td>
      <td class="mf2-col-act">${act}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `<div class="mf2-tw"><table class="v2-table mf2-table">
    <thead><tr>
      <th>Formation</th>
      <th class="mf2-col-dom">Domaine</th>
      <th class="mf2-col-date">Dates</th>
      <th class="mf2-col-places">Places</th>
      <th class="mf2-col-st">Statut</th>
      <th class="mf2-col-act"></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function mf2RenderRail() {
  const mine = mf2Mine();
  const suivies = mine.filter(f => f.statut === 'realisee' || mf2Passe(f));
  const aVenir = mine.filter(f => f.statut === 'planifiee' && !mf2Passe(f));

  // 1) Mon parcours — heures suivies rapportées aux heures engagées
  const hSuivies = suivies.reduce((s, f) => s + (Number(f.dureeHeures) || 0), 0);
  const hVenir = aVenir.reduce((s, f) => s + (Number(f.dureeHeures) || 0), 0);
  const hTotal = hSuivies + hVenir;
  const pct = hTotal ? Math.round(hSuivies / hTotal * 100) : 0;
  const parc = document.getElementById('mfParcours');
  if (parc) {
    parc.innerHTML = `
      <div class="mf2-rail-t vert">Mon parcours de formation</div>
      <div class="mf2-big">${hSuivies} h</div>
      <div class="mf2-rail-s">${hTotal ? `suivies sur ${hTotal} h engagées` : 'aucune heure engagée pour le moment'}</div>
      <div class="v2-prog mf2-gauge"><span style="width:${pct}%;background:linear-gradient(90deg,#16a34a,#4ade80)"></span></div>
      <div class="mf2-rail-f">${hVenir ? `${hVenir} h encore à suivre` : 'Aucune session programmée'}</div>`;
  }

  // 2) Par domaine (heures) — uniquement mes formations
  const dom = document.getElementById('mfDomaines');
  if (dom) {
    const map = new Map();
    mine.forEach(f => {
      const k = f.domaine || 'Non renseigné';
      map.set(k, (map.get(k) || 0) + (Number(f.dureeHeures) || 0));
    });
    const arr = [...map.entries()].filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = arr.length ? arr[0][1] : 0;
    dom.innerHTML = `<div class="v2-blk-h">
        <span class="mf2-blk-ico" style="--pc:#818cf8">${mf2Svg(MF2_IC.chart)}</span>
        <span class="v2-blk-t">Par domaine (heures)</span>
      </div>` + (arr.length
      ? `<div class="mf2-doms">` + arr.map(([k, h]) => {
          const c = mf2Color(k);
          return `<div class="mf2-dom">
            <div class="mf2-dom-h"><span class="mf2-dom-l">${escHtml(k)}</span><span class="mf2-dom-n">${h} h</span></div>
            <div class="v2-prog v2-prog-sm"><span style="width:${max ? Math.round(h / max * 100) : 0}%;background:${c}"></span></div>
          </div>`;
        }).join('') + `</div>`
      : `<div class="v2-blk-vide">Aucune heure enregistrée sur vos formations.</div>`);
  }

  // 3) Prochaines sessions — mes inscriptions à venir
  const ses = document.getElementById('mfSessions');
  if (ses) {
    const next = aVenir.slice().sort((a, b) => (a.dateDebut || '').localeCompare(b.dateDebut || '')).slice(0, 4);
    ses.innerHTML = `<div class="v2-blk-h">
        <span class="mf2-blk-ico" style="--pc:#22d3ee">${mf2Svg(MF2_IC.cal)}</span>
        <span class="v2-blk-t">Prochaines sessions</span>
      </div>` + (next.length
      ? next.map(f => {
          const p = mf2Pastille(f.dateDebut);
          const info = [f.organisme, (f.participants || []).length + ' inscrit' + ((f.participants || []).length > 1 ? 's' : '')].filter(Boolean).join(' · ');
          return `<div class="mf2-ses">
            <div class="mf2-ses-d"><div class="mf2-ses-j">${escHtml(p.j)}</div><div class="mf2-ses-m">${escHtml(p.m)}</div></div>
            <div class="mf2-ses-x">
              <div class="mf2-ses-t">${escHtml(f.titre || '')}</div>
              <div class="mf2-ses-i">${escHtml(info)}</div>
            </div>
          </div>`;
        }).join('')
      : `<div class="v2-blk-vide">Aucune session programmée. Inscrivez-vous depuis la liste « À venir ».</div>`);
  }

  // 4) Mes évaluations — retour d'expérience sur les formations suivies
  const ev = document.getElementById('mfEvaluations');
  if (ev) {
    let corps;
    if (!suivies.length) {
      corps = `<div class="v2-blk-vide">Vos évaluations apparaîtront ici une fois une formation suivie.</div>`;
    } else {
      corps = suivies.slice(0, 5).map(f => {
        const e = mf2EvalDe(f.id);
        return `<button type="button" class="mf2-ev" onclick="mf2OpenEval('${escAttr(f.id)}')">
          <span class="mf2-ev-x">
            <span class="mf2-ev-t">${escHtml(f.titre || '')}</span>
            <span class="mf2-ev-s">${e ? escHtml([e.chaud ? 'à chaud renseigné' : '', e.froid ? 'à froid renseigné' : ''].filter(Boolean).join(' · ') || 'noté') : 'Non évaluée'}</span>
          </span>
          <span class="mf2-ev-n${e ? '' : ' vide'}">${e ? e.note + '/5' : 'Évaluer'}</span>
        </button>`;
      }).join('');
      if (!MF2_EVAL_OK) {
        corps += `<div class="mf2-warn">Enregistrement indisponible : la table <code>formation_evaluations</code> n'existe pas encore (voir ${escHtml(MF2_SQL_FILE)}).</div>`;
      }
    }
    ev.innerHTML = `<div class="v2-blk-h">
        <span class="mf2-blk-ico" style="--pc:#fbbf24">${mf2Svg(MF2_IC.star)}</span>
        <span class="v2-blk-t">Mes évaluations</span>
      </div>${corps}`;
  }
}

// ── Branchements ─────────────────────────────────────────────────────────
// L'ancien rendu délègue au module V2 : tous les appelants existants
// (mfInscrire, mfDesinscrire, changement de filtre) continuent de marcher.
window.renderMesFormations = function () { mf2Render(); };

// L'init de la page charge les données ; on y ajoute les évaluations.
const _mf2InitBase = window.initMesFormations;
window.initMesFormations = async function () {
  await _mf2InitBase();
  if (!_mfFiche) return;
  await mf2LoadEvals();
  mf2Render();
};
