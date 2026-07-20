// ── JOURNÉE / MA TOURNÉE — DESIGN V2 ──
// Reproduit la maquette « Ma tournée (vie quotidienne).dc.html » : un fil
// chronologique découpé en quatre moments (Matin / Midi / Après-midi / Soir),
// une rangée de puces de filtre par nature, et un rail de droite avec l'anneau
// de progression, la prochaine tâche, la répartition et le bouton de clôture.
//
// Les données et les actions restent celles de js/journee.js : _jrTaches,
// _jrCoches, jrTachesDuJour(), jrEtat(), jrFait(), jrAnnule(), jrOpenReport(),
// jrMotif(), jrOpenStrip(), jrSoutien(), jrToggleMode(), openTacheModal()…
// La couche Supabase des tâches (js/taches-supabase.js) n'est pas touchée.
//
// SEULE DONNÉE NOUVELLE : la « nature du moment » (soin, repas, activité,
// transmission, accompagnement, RDV extérieur), qui n'existe pas dans
// public.taches_ppa. Elle vit dans la table satellite public.taches_type,
// créée par migration-journee.sql. DÉGRADATION DOUCE : tant que ce fichier
// n'a pas été exécuté, la lecture renvoie {} avec un console.warn, la page
// reste entièrement utilisable, et l'écriture affiche un toast nommant le SQL.

const JN2_SQL_FILE = 'migration-journee.sql';

// Natures : libellé, couleur de puce/texte, couleur de fond d'icône, icône.
const JN2_TYPES = {
  soin:           { l: 'Soin',           c: '#f87171', bg: '#dc2626', ic: 'pill' },
  repas:          { l: 'Repas',          c: '#fb923c', bg: '#ea580c', ic: 'meal' },
  activite:       { l: 'Activité',       c: '#a5b4fc', bg: '#6366f1', ic: 'activity' },
  transmission:   { l: 'Transmission',   c: '#7dd3fc', bg: '#3b82f6', ic: 'chat' },
  accompagnement: { l: 'Accompagnement', c: '#5eead4', bg: '#0d9488', ic: 'money' },
  rdv:            { l: 'RDV ext.',       c: '#67e8f9', bg: '#0891b2', ic: 'car' }
};

// Les quatre moments du fil, dans l'ordre de la maquette.
const JN2_SLOTS = [
  { id: 'matin', label: 'Matin',       c: '#fbbf24' },
  { id: 'midi',  label: 'Midi',        c: '#fb923c' },
  { id: 'aprem', label: 'Après-midi',  c: '#818cf8' },
  { id: 'soir',  label: 'Soir',        c: '#38bdf8' }
];

// Puces de filtre — exactement celles de la maquette.
const JN2_CHIPS = [
  { id: 'all',          label: 'Tout',          dot: '#94a3b8' },
  { id: 'soin',         label: 'Soins',         dot: '#dc2626' },
  { id: 'repas',        label: 'Repas',         dot: '#ea580c' },
  { id: 'activite',     label: 'Activités',     dot: '#6366f1' },
  { id: 'transmission', label: 'Transmissions', dot: '#3b82f6' }
];

const JN2_IC = {
  chat:     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  check:    '<polyline points="20 6 9 17 4 12"/>',
  meal:     '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>',
  pill:     '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/>',
  car:      '<path d="M5 17H3v-5l2-5h11l3 5h1a1 1 0 0 1 1 1v4h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
  activity: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
  money:    '<circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2 2 0 0 1 0 4H9"/>',
  dot:      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/>',
  skip:     '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
  book:     '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  hand:     '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.6 0-4.4-.9-5.9-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  pencil:   '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  reset:    '<path d="M3 2v6h6"/><path d="M3.5 8a9 9 0 1 0 2.3-3.4L3 8"/>',
  target:   '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};
function jn2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

let _jn2Types = {};      // tacheId → nature
let _jn2TypesOk = true;  // false = table absente / illisible
let _jn2Filter = 'all';

// ── Nature du moment (table satellite) ───────────────────────────────

// Table absente : 42P01 côté Postgres, PGRST205 quand PostgREST ne la trouve
// pas dans son cache de schéma.
function jn2MissingTable(e) {
  const code = (e && e.code) || '';
  const msg = (e && e.message) || '';
  return code === '42P01' || code === 'PGRST205'
    || (/taches_type/i.test(msg) && /does not exist|schema cache/i.test(msg));
}

async function jn2AuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || '';
  } catch (e) { return ''; }
}

async function jn2LoadTypes() {
  _jn2Types = {};
  if (typeof supabaseClient === 'undefined' || !supabaseClient) { _jn2TypesOk = false; return; }
  try {
    const { data, error } = await supabaseClient.from('taches_type').select('tache_id,type');
    if (error) throw error;
    (data || []).forEach(r => { if (r && r.tache_id) _jn2Types[String(r.tache_id)] = r.type || ''; });
    _jn2TypesOk = true;
  } catch (e) {
    _jn2TypesOk = false;
    console.warn(`[journee] nature des moments indisponible — exécutez ${JN2_SQL_FILE} dans Supabase.`, e);
  }
}

// Écriture : ne lève jamais (la tâche, elle, est déjà enregistrée).
async function jn2SaveType(tacheId, type) {
  const key = String(tacheId || '');
  if (!key) return;
  const avant = _jn2Types[key] || '';
  if ((type || '') === avant) return;
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  try {
    if (!type) {
      const { error } = await supabaseClient.from('taches_type').delete().eq('tache_id', key);
      if (error) throw error;
      delete _jn2Types[key];
    } else {
      const etablissementId = await sbGetEtablissementId();
      const { error } = await supabaseClient.from('taches_type').upsert({
        etablissement_id: etablissementId,
        tache_id: key,
        type,
        created_by: await jn2AuthUid(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'tache_id' });
      if (error) throw error;
      _jn2Types[key] = type;
    }
    _jn2TypesOk = true;
  } catch (e) {
    console.error('[journee] nature du moment', e);
    if (jn2MissingTable(e)) {
      _jn2TypesOk = false;
      toast(`Nature du moment non enregistrée : exécutez ${JN2_SQL_FILE} dans Supabase`, 'error');
    } else {
      toast('Nature du moment non enregistrée : ' + ((e && e.message) || e), 'error');
    }
  }
}

function jn2TypeOf(tacheId) { return _jn2Types[String(tacheId)] || ''; }
function jn2TypeDef(id) { return JN2_TYPES[id] || null; }

// Segment « Nature du moment » de la modale.
function jn2SetType(v) {
  const inp = document.getElementById('tcType');
  if (inp) inp.value = v || '';
  document.querySelectorAll('#tcTypeSeg .v2-seg-o').forEach(b => {
    b.classList.toggle('on', (b.dataset.val || '') === (v || ''));
  });
  const warn = document.getElementById('tcTypeWarn');
  if (warn) warn.style.display = _jn2TypesOk ? 'none' : 'flex';
}

// ── Découpage du fil en moments ──────────────────────────────────────
// Le quart de l'application (matin 7 h-14 h, aprem 14 h-22 h, soir 22 h-7 h)
// reste la source : on ne fait qu'affiner avec l'heure indicative quand elle
// existe, pour retrouver les quatre bandeaux de la maquette.
function jn2Mins(hm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function jn2Slot(t) {
  const mn = jn2Mins(t.heure);
  if (t.moment === 'soir') return 'soir';
  if (t.moment === 'aprem') return (mn !== null && mn >= 18 * 60) ? 'soir' : 'aprem';
  if (mn !== null && mn >= 12 * 60 && mn < 14 * 60) return 'midi';
  return 'matin';
}
function jn2Order(a, b) {
  const ma = jn2Mins(a.heure), mb = jn2Mins(b.heure);
  if (ma !== null && mb !== null && ma !== mb) return ma - mb;
  if (ma !== null && mb === null) return -1;
  if (ma === null && mb !== null) return 1;
  return String(a.residentName || '').localeCompare(String(b.residentName || ''), 'fr');
}

// « En retard » : heure indicative dépassée et rien de coché. Neutralisé entre
// minuit et 7 h, où la journée de service est celle de la veille (la
// comparaison à l'horloge n'aurait plus de sens).
function jn2Late(t, etat) {
  if (etat) return false;
  const mn = jn2Mins(t.heure);
  if (mn === null) return false;
  const d = new Date();
  if (d.getHours() < 7) return false;
  return mn < d.getHours() * 60 + d.getMinutes();
}

function jn2InFilter(t) {
  if (_jn2Filter === 'all') return true;
  return jn2TypeOf(t.id) === _jn2Filter;
}

function jn2SetFilter(f) { _jn2Filter = f; jn2Render(); }
// « Réinitialiser » de la maquette : remet l'affichage à plat. Les coches, elles,
// sont des faits d'accompagnement — elles ne sont jamais effacées en masse.
function jn2Reset() { _jn2Filter = 'all'; jn2Render(); }

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────

function jn2Render() {
  const jour = jrTachesDuJour().slice().sort(jn2Order);
  jn2Charge();
  jn2Chips();
  jn2Timeline(jour);
  jn2Side(jour);
}

// Bandeau du haut : « · Matin 7 h – 14 h » à la suite de la date de service.
function jn2Charge() {
  const el = document.getElementById('jrCharge');
  if (!el) return;
  const m = (typeof JR_MOMENTS !== 'undefined')
    ? JR_MOMENTS.find(x => x.id === _jrQuart) : null;
  el.textContent = m ? ` · poste ${m.label.toLowerCase()} ${m.sub}` : '';
}

function jn2Chips() {
  const box = document.getElementById('jn2Chips');
  if (!box) return;
  box.innerHTML = JN2_CHIPS.map(c =>
    `<button type="button" class="v2-chip-f${_jn2Filter === c.id ? ' on' : ''}" onclick="jn2SetFilter('${c.id}')">
       <span class="dot" style="background:${c.dot}"></span>${escHtml(c.label)}
     </button>`).join('')
    + `<button type="button" class="v2-chip-f jn2-reset" onclick="jn2Reset()" title="Réafficher toutes les natures">
         ${jn2Svg(JN2_IC.reset, 2.2)}Réinitialiser
       </button>`;
}

function jn2Timeline(jour) {
  const el = document.getElementById('jrList');
  if (!el) return;

  if (!jour.length) {
    el.innerHTML = `<div class="jn2-vide">Aucun moment d'accompagnement prévu aujourd'hui.${
      _jrCanEdit ? `<div style="margin-top:14px"><button type="button" class="jn2-new" onclick="openTacheModal()">${jn2Svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 2.4)}Créer une tâche depuis un projet</button></div>` : ''
    }</div>`;
    return;
  }

  const shown = jour.filter(jn2InFilter);
  if (!shown.length) {
    el.innerHTML = `<div class="jn2-vide">Aucun moment de cette nature aujourd'hui.</div>`;
    return;
  }

  el.innerHTML = JN2_SLOTS.map(s => {
    const tous = jour.filter(t => jn2Slot(t) === s.id);
    const vus = tous.filter(jn2InFilter);
    if (!vus.length) return '';
    const faits = tous.filter(t => jrEtat(t) === 'fait').length;
    return `<section class="jn2-slot" style="--sc:${s.c}">
      <div class="jn2-slot-h">
        <span class="jn2-slot-l">${escHtml(s.label)}</span>
        <span class="jn2-slot-line"></span>
        <span class="jn2-slot-n">${faits}/${tous.length}</span>
      </div>
      <div class="jn2-tasks">${vus.map(jn2Task).join('')}</div>
    </section>`;
  }).join('');
}

// ── Carte d'un moment ────────────────────────────────────────────────

function jn2Task(t) {
  const c = _jrCoches[t.id];
  const etat = c ? c.statut : '';
  const def = jn2TypeDef(jn2TypeOf(t.id));
  const late = jn2Late(t, etat);

  const iconBg = etat === 'fait' ? 'rgba(255,255,255,.12)'
    : etat === 'reporte' ? 'rgba(245,158,11,.22)'
      : def ? def.bg : 'rgba(255,255,255,.1)';
  const iconD = etat === 'fait' ? JN2_IC.check
    : etat === 'reporte' ? JN2_IC.skip
      : def ? JN2_IC[def.ic] : JN2_IC.dot;

  // Sous-titre : la personne, l'objectif du projet, puis la trace de la coche.
  const bits = [];
  if (t.residentName) bits.push(`<b>${escHtml(t.residentName)}</b>`);
  if (t.objectif) bits.push(`<span class="jn2-obj">${jn2Svg(JN2_IC.target, 2)} ${escHtml(t.objectif)}</span>`);
  if (etat === 'fait') {
    const h = c.doneAt ? new Date(c.doneAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const s = c.soutien && JR_SOUTIEN[c.soutien] ? ' · ' + JR_SOUTIEN[c.soutien].l : '';
    bits.push(`Fait${h ? ' à ' + h : ''}${c.par ? ' · ' + escHtml(c.par) : ''}${escHtml(s)}`);
  } else if (etat === 'reporte') {
    bits.push(`Reporté${c.motif ? ' — ' + escHtml(c.motif) : ''}${c.par ? ' · ' + escHtml(c.par) : ''}`);
  }

  // Actions secondaires — elles ne doivent pas déclencher la bascule de la ligne.
  const acts = [];
  if (t.consigne || (t.soutienAttendu && JR_SOUTIEN[t.soutienAttendu])) {
    acts.push(`<button type="button" class="jn2-act${_jrOpenMode.has(t.id) ? ' on' : ''}" title="Mode d'emploi"
      aria-label="Mode d'emploi" onclick="event.stopPropagation();jrToggleMode('${t.id}')">${jn2Svg(JN2_IC.book)}</button>`);
  }
  if (!etat) {
    acts.push(`<button type="button" class="jn2-act${_jrOpenStrip.has('rep_' + t.id) ? ' on' : ''}" title="Reporter"
      aria-label="Reporter" onclick="event.stopPropagation();jrOpenReport('${t.id}')">${jn2Svg(JN2_IC.skip)}</button>`);
  }
  if (etat === 'fait' && !c.soutien) {
    acts.push(`<button type="button" class="jn2-act${_jrOpenStrip.has(t.id) ? ' on' : ''}" title="Préciser le soutien apporté"
      aria-label="Préciser le soutien apporté" onclick="event.stopPropagation();jrOpenStrip('${t.id}')">${jn2Svg(JN2_IC.hand)}</button>`);
  }
  if (_jrCanEdit) {
    acts.push(`<button type="button" class="jn2-act" title="Modifier la tâche"
      aria-label="Modifier la tâche" onclick="event.stopPropagation();openTacheModal('${t.id}')">${jn2Svg(JN2_IC.pencil)}</button>`);
  }

  // Dépliants : mode d'emploi, soutien apporté, motif de report.
  const more = [];
  if (_jrOpenMode.has(t.id)) {
    const att = t.soutienAttendu && JR_SOUTIEN[t.soutienAttendu];
    more.push(`<div class="jn2-mode">${jn2Svg(JN2_IC.book)}<span>${escHtml(t.consigne || 'Pas de consigne particulière.')}${
      att ? ` — <strong>soutien attendu : ${escHtml(att.l)}</strong>` : ''}</span></div>`);
  }
  if (etat === 'fait' && _jrOpenStrip.has(t.id)) {
    more.push(`<div class="jn2-strip"><span class="jn2-strip-l">Soutien apporté :</span>`
      + Object.entries(JR_SOUTIEN).map(([k, v]) => {
        const cls = c.soutien === k ? 'jn2-pill on' : (t.soutienAttendu === k ? 'jn2-pill attendu' : 'jn2-pill');
        return `<button type="button" class="${cls}" onclick="event.stopPropagation();jrSoutien('${t.id}','${k}')">${escHtml(v.l)}</button>`;
      }).join('')
      + `<button type="button" class="jn2-pill" onclick="event.stopPropagation();jrCloseStrip('${t.id}')">plus tard</button></div>`);
  }
  if (!etat && _jrOpenStrip.has('rep_' + t.id)) {
    more.push(`<div class="jn2-strip"><span class="jn2-strip-l">Motif :</span>`
      + JR_MOTIFS.map(m => `<button type="button" class="jn2-pill" onclick="event.stopPropagation();jrMotif('${t.id}',this.textContent)">${escHtml(m)}</button>`).join('')
      + `</div>`);
  }

  const cls = etat === 'fait' ? ' fait' : etat === 'reporte' ? ' reporte' : '';
  const label = `${etat === 'fait' ? 'Fait — ' : etat === 'reporte' ? 'Reporté — ' : ''}${t.libelle || ''}`;

  return `<article class="jn2-task${cls}" style="--tc:${def ? def.bg : '#64748b'}">
    <div class="jn2-row" role="button" tabindex="0" aria-label="${escHtml(label)}"
         onclick="jn2Toggle('${t.id}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();jn2Toggle('${t.id}')}">
      <span class="jn2-time">${escHtml(t.heure || '—')}</span>
      <span class="jn2-ico" style="background:${iconBg}">${jn2Svg(iconD)}</span>
      <div class="jn2-tx">
        <div class="jn2-t">${escHtml(t.libelle || '')}</div>
        ${bits.length ? `<div class="jn2-s">${bits.join(' · ')}</div>` : ''}
      </div>
      ${late ? '<span class="jn2-late"><i></i>En retard</span>' : ''}
      ${def ? `<span class="jn2-tag" style="--tgc:${def.c};--tgb:${def.bg}">${escHtml(def.l)}</span>` : ''}
      ${acts.length ? `<span class="jn2-acts">${acts.join('')}</span>` : ''}
      <span class="jn2-check">${jn2Svg(etat === 'reporte' ? JN2_IC.skip : JN2_IC.check, etat === 'reporte' ? 2.4 : 3.5)}</span>
    </div>
    ${more.length ? `<div class="jn2-more">${more.join('')}</div>` : ''}
  </article>`;
}

function jn2Toggle(id) {
  const t = _jrTaches.find(x => x.id === id);
  if (!t) return;
  if (jrEtat(t)) jrAnnule(id); else jrFait(id);
}

// ── Rail de droite ───────────────────────────────────────────────────

function jn2Side(jour) {
  const total = jour.length;
  const faits = jour.filter(t => jrEtat(t) === 'fait').length;
  const reportes = jour.filter(t => jrEtat(t) === 'reporte').length;
  const pct = total ? Math.round(faits / total * 100) : 0;

  const circ = 2 * Math.PI * 58;
  const arc = document.getElementById('jn2RingArc');
  if (arc) {
    arc.setAttribute('stroke-dasharray', circ.toFixed(1));
    arc.setAttribute('stroke-dashoffset', (circ * (1 - pct / 100)).toFixed(1));
  }
  const pctEl = document.getElementById('jn2Pct');
  if (pctEl) pctEl.textContent = pct + '%';
  const cntEl = document.getElementById('jn2Count');
  if (cntEl) {
    cntEl.innerHTML = total
      ? `<b>${faits}</b> tâche${faits > 1 ? 's' : ''} sur <b>${total}</b> réalisée${faits > 1 ? 's' : ''}`
      : 'Aucun moment prévu aujourd’hui';
  }
  const repEl = document.getElementById('jn2Reports');
  if (repEl) {
    repEl.textContent = reportes
      ? `${reportes} reporté${reportes > 1 ? 's' : ''} — l'équipe ajustera avec la personne`
      : '';
  }

  // Prochaine tâche : la première non cochée du fil.
  const nextEl = document.getElementById('jn2Next');
  if (nextEl) {
    const next = jour.find(t => !jrEtat(t));
    if (next) {
      const def = jn2TypeDef(jn2TypeOf(next.id));
      const sub = [next.heure || 'sans heure', next.residentName || ''].filter(Boolean).join(' · ');
      nextEl.innerHTML = `<div class="jn2-next">
        <span class="jn2-next-i" style="background:${def ? def.bg : 'rgba(255,255,255,.1)'}">${jn2Svg(def ? JN2_IC[def.ic] : JN2_IC.dot)}</span>
        <div style="min-width:0">
          <div class="jn2-next-t">${escHtml(next.libelle || '')}</div>
          <div class="jn2-next-s">${escHtml(sub)}</div>
        </div>
      </div>`;
    } else if (total) {
      nextEl.innerHTML = `<div class="jn2-done-all">Tournée terminée. Bonne fin de poste !</div>`;
    } else {
      nextEl.innerHTML = `<div class="v2-blk-vide">Rien de prévu.</div>`;
    }
  }

  // Répartition : les quatre lignes de la maquette, plus celles qui portent
  // réellement des moments (accompagnement, RDV, natures non renseignées).
  const brkEl = document.getElementById('jn2Break');
  if (brkEl) {
    const n = k => jour.filter(t => jn2TypeOf(t.id) === k).length;
    const sans = jour.filter(t => !jn2TypeDef(jn2TypeOf(t.id))).length;
    const rows = [
      { label: 'Soins & médicaments', c: '#dc2626', n: n('soin') },
      { label: 'Repas', c: '#ea580c', n: n('repas') },
      { label: 'Activités & sorties', c: '#6366f1', n: n('activite') },
      { label: 'Transmissions', c: '#3b82f6', n: n('transmission') }
    ];
    if (n('accompagnement')) rows.push({ label: 'Accompagnement', c: '#0d9488', n: n('accompagnement') });
    if (n('rdv')) rows.push({ label: 'RDV extérieurs', c: '#0891b2', n: n('rdv') });
    if (sans) rows.push({ label: 'Nature non renseignée', c: '#64748b', n: sans });
    brkEl.innerHTML = rows.map(r => `<div class="jn2-break-i">
      <span class="jn2-break-d" style="background:${r.c}"></span>
      <span class="jn2-break-l">${escHtml(r.label)}</span>
      <span class="jn2-break-n">${r.n}</span>
    </div>`).join('');
  }
}
