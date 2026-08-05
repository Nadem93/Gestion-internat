// ══════════════════════════════════════════════════════════════════════════
// ASTREINTES — DESIGN V2
// Reproduit la maquette « Astreintes (RH) » :
//   bandeau « d'astreinte maintenant » · 4 tuiles · roulement du mois ·
//   interventions récentes · équité / indemnités / prochaines astreintes ·
//   registre des interventions · barème CCN 66 · cascade de contacts ·
//   lignes de garde · repos compensateur · consignes.
//
// Les astreintes elles-mêmes restent lues et écrites par js/astreintes.js et
// js/astreintes-supabase.js : ce fichier ne fait que du rendu et du calcul.
//
// Quatre tables complémentaires (cf. migration-astreintes.sql) alimentent le
// registre, le barème, la cascade et les consignes. Dégradation douce : table
// absente ⇒ lecture [], console.warn, panneau vide nommant le fichier SQL ;
// l'écriture est refusée par un toast. Aucune valeur n'est inventée.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const AST2 = {};
  const SQL_FILE = 'migration-astreintes.sql';

  const T_INTERV = 'astreintes_interventions';
  const T_BAREME = 'astreintes_bareme';
  const T_CASC   = 'astreintes_cascade';
  const T_CONS   = 'astreintes_consignes';

  const PAL = ['#a78bfa', '#22d3ee', '#ec4899', '#f59e0b', '#10b981', '#818cf8'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOIS_A = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.',
    'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  const ICO = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    bolt:  '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    money: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    down:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
  };

  function svg(path, w) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  // Icône 16px pour une pastille .dc-chip (langage « Console Data »).
  function svg16(path) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  // En-tête de carte Console Data : pastille + micro-label + titre (+ droite).
  function dcHead(color, ico, eyebrow, title, right) {
    return '<div class="dc-head"><div class="dc-head-l">' +
      '<span class="dc-chip" style="background:' + color + '22;color:' + color + '">' + svg16(ico) + '</span>' +
      '<div style="min-width:0"><div class="dc-eyebrow">' + esc(eyebrow) + '</div>' +
      '<div class="dc-title">' + esc(title) + '</div></div></div>' + (right || '') + '</div>';
  }

  // Badge monospace teinté (couleur hex #rrggbb).
  function dcBadge(text, color) {
    return '<span class="dc-badge" style="background:' + color + '1f;color:' + color +
      ';border:1px solid ' + color + '44"><span class="d" style="background:' + color + '"></span>' +
      esc(text) + '</span>';
  }

  const el = id => document.getElementById(id);
  const esc = s => (typeof escHtml === 'function' ? escHtml(s == null ? '' : String(s))
    : String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  function tdy() { return typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10); }

  // ── Divers utilitaires ────────────────────────────────────────────────
  function initiales(nom) {
    const p = String(nom || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }

  function couleur(cle) {
    const s = String(cle || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PAL[h % PAL.length];
  }

  function jm(iso) {
    if (!iso) return '—';
    const p = String(iso).split('-');
    if (p.length < 3) return esc(iso);
    return Number(p[2]) + ' ' + (MOIS_A[Number(p[1]) - 1] || '');
  }

  function jmCourt(iso) {
    const p = String(iso || '').split('-');
    return p.length < 3 ? '—' : p[2] + '/' + p[1];
  }

  function eur(n) {
    if (n == null || !isFinite(n)) return '—';
    return Math.round(n).toLocaleString('fr-FR') + ' €';
  }

  function hm(min) {
    if (min == null || !isFinite(min) || min < 0) return '—';
    return Math.floor(min / 60) + 'h' + String(Math.round(min % 60)).padStart(2, '0');
  }

  // Durée d'une intervention, trajet compris. Passage de minuit géré.
  function dureeMin(i) {
    if (!i.heure_appel || !i.heure_fin) return null;
    const a = String(i.heure_appel).split(':'), f = String(i.heure_fin).split(':');
    const m0 = Number(a[0]) * 60 + Number(a[1] || 0);
    let m1 = Number(f[0]) * 60 + Number(f[1] || 0);
    if (!isFinite(m0) || !isFinite(m1)) return null;
    if (m1 < m0) m1 += 1440;
    return (m1 - m0) + (Number(i.trajet_min) || 0);
  }

  // Jours fériés français d'une année (calcul déterministe, aucune saisie).
  function feries(an) {
    const a = an % 19, b = Math.floor(an / 100), c = an % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mois = Math.floor((h + l - 7 * m + 114) / 31);
    const jour = ((h + l - 7 * m + 114) % 31) + 1;
    const paques = new Date(an, mois - 1, jour);
    const dec = n => { const x = new Date(paques.getTime() + n * 86400000); return iso(x); };
    return new Set([
      an + '-01-01', an + '-05-01', an + '-05-08', an + '-07-14',
      an + '-08-15', an + '-11-01', an + '-11-11', an + '-12-25',
      dec(1), dec(39), dec(50)
    ]);
  }

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }

  function jourSemaine(isoStr) {
    const p = String(isoStr).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay();
  }

  // Catégorie tarifaire d'un jour d'astreinte : férié > week-end > semaine.
  function categorie(isoStr, setFeries) {
    if (setFeries.has(isoStr)) return 'ferie';
    const d = jourSemaine(isoStr);
    return (d === 0 || d === 6) ? 'weekend' : 'semaine';
  }

  // ── Données complémentaires (dégradation douce) ───────────────────────
  const EXTRA = { interventions: [], bareme: [], cascade: [], consignes: [], missing: {} };
  AST2.extra = EXTRA;

  function tableAbsente(e) {
    const code = (e && e.code) || '';
    const msg = String((e && (e.message || e.details)) || '').toLowerCase();
    return code === '42P01' || code === 'PGRST205' ||
      msg.indexOf('does not exist') >= 0 || msg.indexOf('schema cache') >= 0;
  }

  async function lire(table, order) {
    if (typeof supabaseClient === 'undefined') { EXTRA.missing[table] = true; return []; }
    try {
      let q = supabaseClient.from(table).select('*');
      if (order) q = q.order(order.col, { ascending: !!order.asc });
      const { data, error } = await q;
      if (error) {
        EXTRA.missing[table] = tableAbsente(error);
        console.warn('[astreintes-v2] lecture « ' + table + ' » impossible (' +
          (error.message || error.code) + ') — exécutez ' + SQL_FILE + '. Panneau vide.');
        return [];
      }
      EXTRA.missing[table] = false;
      return data || [];
    } catch (e) {
      EXTRA.missing[table] = true;
      console.warn('[astreintes-v2] lecture « ' + table + ' » impossible — exécutez ' + SQL_FILE, e);
      return [];
    }
  }

  AST2.loadExtra = async function () {
    const [interv, bareme, casc, cons] = await Promise.all([
      lire(T_INTERV, { col: 'date', asc: false }),
      lire(T_BAREME, { col: 'ordre', asc: true }),
      lire(T_CASC, { col: 'rang', asc: true }),
      lire(T_CONS, { col: 'ordre', asc: true })
    ]);
    EXTRA.interventions = interv;
    EXTRA.bareme = bareme;
    EXTRA.cascade = casc;
    EXTRA.consignes = cons;
  };

  function refuser(table) {
    const msg = EXTRA.missing[table]
      ? 'Table « ' + table + ' » absente — exécutez ' + SQL_FILE
      : 'Écriture refusée sur « ' + table + ' » — vérifiez ' + SQL_FILE;
    if (typeof toast === 'function') toast(msg, 'error'); else console.warn(msg);
  }
  AST2.refuser = refuser;

  function vide(txt, table) {
    const suffixe = table && EXTRA.missing[table]
      ? ' — exécutez ' + SQL_FILE
      : '';
    return '<div class="as2-vide">' + esc(txt) + esc(suffixe) + '</div>';
  }

  // ── Navigation de mois ────────────────────────────────────────────────
  let offset = 0;   // en mois, relatif au mois courant
  AST2.moisOffset = () => offset;
  AST2.prevMois = function () { offset--; AST2.render(); };
  AST2.nextMois = function () { offset++; AST2.render(); };
  AST2.moisCourant = function () { offset = 0; AST2.render(); };

  function bornesMois() {
    const n = new Date();
    const d = new Date(n.getFullYear(), n.getMonth() + offset, 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { debut: iso(d), fin: iso(fin), an: d.getFullYear(), mois: d.getMonth() };
  }

  // ── Regroupement en périodes d'astreinte ──────────────────────────────
  // Des jours consécutifs pour le même agent et la même ligne forment
  // une seule période (une « semaine d'astreinte » dans la maquette).
  function periodes(list) {
    const tri = list.slice().sort((a, b) =>
      (a.date || '').localeCompare(b.date || '') ||
      String(a.nom || '').localeCompare(String(b.nom || '')));
    const out = [];
    tri.forEach(a => {
      const prec = out.find(p =>
        p.nom === a.nom && p.type === a.type && veille(a.date) === p.fin);
      if (prec) { prec.fin = a.date; prec.ids.push(a.id); prec.jours++; return; }
      out.push({
        debut: a.date, fin: a.date, nom: a.nom || '', type: a.type,
        tel: a.tel || '', note: a.note || '', ids: [a.id], jours: 1
      });
    });
    return out.sort((a, b) => (a.debut || '').localeCompare(b.debut || ''));
  }

  function veille(isoStr) {
    const p = String(isoStr || '').split('-');
    if (p.length < 3) return '';
    const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) - 1);
    return iso(d);
  }

  function libellePeriode(p) {
    if (p.debut === p.fin) return jm(p.debut);
    const d0 = p.debut.split('-'), d1 = p.fin.split('-');
    if (d0[1] === d1[1]) return Number(d0[2]) + ' – ' + jm(p.fin);
    return jm(p.debut) + ' – ' + jm(p.fin);
  }

  function typeLabel(id) {
    const t = (typeof AST_TYPES !== 'undefined' ? AST_TYPES : []).find(x => x.id === id);
    return t ? t.label : (id || '—');
  }
  function typeIcon(id) {
    const t = (typeof AST_TYPES !== 'undefined' ? AST_TYPES : []).find(x => x.id === id);
    return t ? t.icon : '🔔';
  }
  function typeColor(id) {
    const map = {
      medecin: '#ec4899', infirmier: '#a78bfa', cadre: '#22d3ee',
      technique: '#f59e0b', direction: '#818cf8'
    };
    return map[id] || '#818cf8';
  }

  function statutPeriode(p, aujourdhui) {
    if (p.fin < aujourdhui) return { l: 'Terminée', c: '#10b981' };
    if (p.debut > aujourdhui) return { l: 'À venir', c: '#22d3ee' };
    return { l: 'En cours', c: '#a78bfa' };
  }

  function avatar(nom, cls) {
    const c = couleur(nom);
    return '<span class="as2-av ' + cls + '" style="background:' + c + '">' +
      esc(initiales(nom)) + '</span>';
  }

  // ══ RENDU ═══════════════════════════════════════════════════════════════
  AST2.render = function () {
    if (window.__astDenied) return;
    const list = (typeof getAst === 'function' ? getAst() : []) || [];
    const auj = tdy();
    const b = bornesMois();
    const setF = feries(b.an);

    const lab = el('astWeekLabel');
    if (lab) lab.textContent = MOIS[b.mois] + ' ' + b.an;

    const duMois = list.filter(a => a.date >= b.debut && a.date <= b.fin);
    const intervMois = EXTRA.interventions.filter(i => i.date >= b.debut && i.date <= b.fin);

    renderNow(list, auj);
    renderStats(duMois, intervMois, list, auj, setF);
    renderRoulement(duMois, auj, b);
    renderInterventions();
    renderEquite(list);
    renderIndemnites(duMois, intervMois, setF);
    renderProchaines(list, auj);
    renderRegistre();
    renderBareme(duMois, intervMois, setF);
    renderCascade();
    renderLignes(list, auj);
    renderRepos(intervMois);
    renderConsignes();
  };

  // ── Bandeau « d'astreinte maintenant » ────────────────────────────────
  function renderNow(list, auj) {
    const box = el('astTodayGuard'); if (!box) return;
    const duJour = list.filter(a => a.date === auj);
    if (!duJour.length) {
      box.innerHTML = '<div class="as2-now">' +
        '<div class="as2-now-lbl"><span class="as2-now-dot"></span>D\'ASTREINTE MAINTENANT</div>' +
        '<div class="as2-now-vide">Aucune astreinte saisie pour aujourd\'hui.</div>' +
        '</div>';
      return;
    }
    const a = duJour[0];
    // Fin de la période courante : dernier jour consécutif du même agent.
    const p = periodes(list).find(x => x.nom === a.nom && x.type === a.type &&
      x.debut <= auj && x.fin >= auj);
    const fin = p ? p.fin : auj;
    const autres = duJour.length - 1;

    box.innerHTML = '<div class="as2-now">' +
      '<div class="as2-now-lbl"><span class="as2-now-dot"></span>D\'ASTREINTE MAINTENANT</div>' +
      '<span class="as2-now-av" style="background:' + couleur(a.nom) + '">' + esc(initiales(a.nom)) + '</span>' +
      '<div style="min-width:0">' +
        '<div class="as2-now-n">' + esc(a.nom || '—') + '</div>' +
        '<div class="as2-now-r">' + esc(typeLabel(a.type)) +
          (autres > 0 ? ' · +' + autres + ' autre' + (autres > 1 ? 's' : '') + ' ligne' + (autres > 1 ? 's' : '') + ' de garde' : '') +
        '</div>' +
      '</div>' +
      '<div class="as2-now-sp">' +
        (a.tel
          ? '<a class="as2-now-box" href="tel:' + esc(String(a.tel).replace(/\s/g, '')) + '">' +
              svg(ICO.phone) + '<span class="as2-now-tel">' + esc(a.tel) + '</span></a>'
          : '<div class="as2-now-box"><span class="as2-now-k">Aucun numéro d\'astreinte renseigné</span></div>') +
        '<div class="as2-now-box" style="flex-direction:column;align-items:center;gap:0">' +
          '<div class="as2-now-k">Jusqu\'au</div>' +
          '<div class="as2-now-v">' + jm(fin) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Tuiles ────────────────────────────────────────────────────────────
  function renderStats(duMois, intervMois, list, auj, setF) {
    const box = el('astStats'); if (!box) return;
    const cadres = new Set(duMois.map(a => a.nom).filter(Boolean));
    const aVenir = periodes(list.filter(a => a.date > auj)).length;
    const totalInd = totalIndemnites(duMois, intervMois, setF);

    const defs = [
      { n: String(cadres.size), l: 'Cadres d\'astreinte', c: '#a78bfa', i: ICO.users },
      { n: EXTRA.missing[T_INTERV] ? '—' : String(intervMois.length), l: 'Interventions (mois)', c: '#ec4899', i: ICO.bolt },
      { n: totalInd == null ? '—' : eur(totalInd), l: 'Indemnités', c: '#10b981', i: ICO.money },
      { n: String(aVenir), l: 'Astreintes à venir', c: '#22d3ee', i: ICO.clock }
    ];
    box.innerHTML = defs.map(d =>
      '<div class="dc-kpi" style="--dc-c:' + d.c + '">' +
        '<div class="dc-kpi-top"><span class="dc-kpi-label">' + esc(d.l) + '</span>' +
          '<span class="dc-kpi-ico" style="color:' + d.c + '">' + svg16(d.i) + '</span></div>' +
        '<div class="dc-kpi-val">' + esc(d.n) + '</div>' +
      '</div>').join('');
  }

  // ── Roulement du mois ─────────────────────────────────────────────────
  function renderRoulement(duMois, auj, b) {
    const box = el('astGrid'); if (!box) return;
    const per = periodes(duMois);
    const nbInterv = p => EXTRA.interventions.filter(i =>
      i.date >= p.debut && i.date <= p.fin &&
      (!i.cadre || String(i.cadre).trim() === String(p.nom).trim())).length;

    const corps = per.length
      ? per.map(p => {
          const st = statutPeriode(p, auj);
          const n = EXTRA.missing[T_INTERV] ? null : nbInterv(p);
          return '<tr class="as2-tbl-row" onclick="ast2OuvrirPeriode(\'' + esc(p.ids[0]) + '\')">' +
            '<td style="white-space:nowrap;border-left:3px solid ' + typeColor(p.type) + '">' + esc(libellePeriode(p)) + '</td>' +
            '<td><div class="as2-cell-n">' + avatar(p.nom, 'as2-av-32') +
              '<span class="as2-cell-nom">' + esc(p.nom || '—') + '</span></div></td>' +
            '<td>' + esc(typeLabel(p.type)) + '</td>' +
            '<td>' + (n == null ? '—' : (n ? n + ' intervention' + (n > 1 ? 's' : '') : '—')) + '</td>' +
            '<td>' + dcBadge(st.l, st.c) + '</td>' +
          '</tr>';
        }).join('')
      : '';

    const pill = per.length
      ? '<span class="dc-pill dim">' + per.length + ' période' + (per.length > 1 ? 's' : '') + '</span>'
      : '';
    box.innerHTML =
      dcHead('#a78bfa', ICO.users, 'ROULEMENT DES ASTREINTES', MOIS[b.mois] + ' ' + b.an, pill) +
      '<div class="as2-scroll"><table class="as2-tbl">' +
        '<thead><tr><th>Période</th><th>Cadre d\'astreinte</th><th>Ligne de garde</th>' +
        '<th>Interventions</th><th>Statut</th></tr></thead>' +
        '<tbody>' + corps + '</tbody></table></div>' +
      (per.length ? '' : vide('Aucune astreinte planifiée sur ce mois.'));
  }

  // ── Interventions récentes ────────────────────────────────────────────
  function renderInterventions() {
    const box = el('astInterv'); if (!box) return;
    const rec = EXTRA.interventions.slice(0, 4);
    box.innerHTML =
      dcHead('#ef4444', ICO.bolt, 'JOURNAL', 'Interventions récentes') +
      '<div class="dc-body">' +
      (rec.length
        ? rec.map(i => {
            const d = dureeMin(i);
            return '<div class="as2-i-row">' + avatar(i.cadre, 'as2-av-30') +
              '<div style="flex:1;min-width:0">' +
                '<div class="as2-i-m">' + esc(i.motif) + '</div>' +
                '<div class="as2-i-s">' + esc(i.cadre || '—') + ' · ' + jmCourt(i.date) +
                  (i.heure_appel ? ' · ' + esc(String(i.heure_appel).slice(0, 5)) : '') + '</div>' +
              '</div>' +
              '<span class="as2-i-d">' + (d == null ? '—' : hm(d)) + '</span>' +
            '</div>';
          }).join('')
        : vide('Aucune intervention enregistrée', T_INTERV)) +
      '</div>';
  }

  // ── Répartition (équité) ──────────────────────────────────────────────
  function renderEquite(list) {
    const box = el('astEquite'); if (!box) return;
    const n = {};
    list.forEach(a => { if (a.nom) n[a.nom] = (n[a.nom] || 0) + 1; });
    const arr = Object.keys(n).map(k => ({ nom: k, j: n[k] }))
      .sort((a, b) => b.j - a.j).slice(0, 8);
    const max = arr.length ? arr[0].j : 1;

    box.innerHTML = dcHead('#a78bfa', ICO.users, 'RÉPARTITION', 'Équité des astreintes') +
      '<div class="dc-body">' +
      (arr.length
        ? '<div style="display:flex;flex-direction:column;gap:13px">' + arr.map(e => {
            const c = couleur(e.nom);
            const pct = Math.round(e.j / max * 100);
            return '<div style="border-left:3px solid ' + c + ';padding-left:11px"><div class="as2-eq-h">' +
              '<span class="as2-av as2-av-22" style="background:' + c + '">' + esc(initiales(e.nom)) + '</span>' +
              '<span class="as2-eq-n">' + esc(e.nom) + '</span>' +
              '<span class="as2-eq-v">' + e.j + ' j</span></div>' +
              '<div class="al-prog-bar"><span style="width:' + pct + '%;background:' + c + '"></span></div></div>';
          }).join('') + '</div>'
        : '<div class="v2-blk-vide">Aucune astreinte enregistrée.</div>') +
      '</div>';
  }

  // ── Calcul des indemnités du mois ─────────────────────────────────────
  // Chaque ligne du barème porte un code (semaine · weekend · ferie ·
  // intervention) et un taux. Le nombre d'unités est COMPTÉ dans les données.
  function comptes(duMois, intervMois, setF) {
    const c = { semaine: 0, weekend: 0, ferie: 0, intervention: intervMois.length };
    duMois.forEach(a => { c[categorie(a.date, setF)]++; });
    return c;
  }

  function lignesBareme(duMois, intervMois, setF) {
    if (!EXTRA.bareme.length) return [];
    const c = comptes(duMois, intervMois, setF);
    return EXTRA.bareme.map(b => {
      const nb = c[b.code] != null ? c[b.code] : 0;
      const taux = Number(b.taux) || 0;
      return { label: b.label, code: b.code, taux, unite: b.unite || 'jour', nb, total: taux * nb };
    });
  }

  function totalIndemnites(duMois, intervMois, setF) {
    const l = lignesBareme(duMois, intervMois, setF);
    if (!l.length) return null;
    return l.reduce((s, x) => s + x.total, 0);
  }

  function renderIndemnites(duMois, intervMois, setF) {
    const box = el('astIndem'); if (!box) return;
    const l = lignesBareme(duMois, intervMois, setF).filter(x => x.total > 0);
    const tot = totalIndemnites(duMois, intervMois, setF);
    box.innerHTML =
      dcHead('#10b981', ICO.money, 'PAIE', 'Indemnités du mois') +
      '<div class="dc-body">' +
        '<div class="dc-kpi-val">' + (tot == null ? '—' : eur(tot)) + '</div>' +
        '<div class="dc-kpi-sub">' + (tot == null
          ? 'Barème non configuré — exécutez ' + SQL_FILE
          : 'à intégrer en paie') + '</div>' +
        (l.length
          ? '<div style="margin-top:12px">' + l.map(x => '<div class="as2-ind-r"><span class="as2-ind-l">' + esc(x.label) +
              '</span><span class="as2-ind-v">' + eur(x.total) + '</span></div>').join('') + '</div>'
          : '') +
      '</div>';
  }

  // ── Prochaines astreintes ─────────────────────────────────────────────
  function renderProchaines(list, auj) {
    const box = el('astProchaines'); if (!box) return;
    const per = periodes(list.filter(a => a.date > auj)).slice(0, 4);
    box.innerHTML =
      dcHead('#22d3ee', ICO.clock, 'À VENIR', 'Prochaines astreintes') +
      '<div class="dc-body">' +
      (per.length
        ? per.map(p => '<div class="as2-next" style="border-left:3px solid ' + typeColor(p.type) + ';padding-left:11px">' + avatar(p.nom, 'as2-av-26') +
            '<div style="flex:1;min-width:0"><div class="as2-next-n">' + esc(p.nom || '—') + '</div>' +
            '<div class="as2-next-p">' + esc(libellePeriode(p)) + ' · ' + esc(typeLabel(p.type)) + '</div></div>' +
          '</div>').join('')
        : '<div class="v2-blk-vide">Aucune astreinte planifiée à venir.</div>') +
      '</div>';
  }

  // ── Registre des interventions ────────────────────────────────────────
  function renderRegistre() {
    const box = el('astRegistre'); if (!box) return;
    const rows = EXTRA.interventions;
    const addBtn = '<button type="button" class="as2-add" onclick="openAstIntervModal()">' +
      svg(ICO.plus, 2.4) + 'Déclarer une intervention</button>';
    box.innerHTML =
      '<div class="dc-card">' +
        dcHead('#a78bfa', ICO.file, 'REGISTRE', 'Interventions déclarées', addBtn) +
        '<div class="as2-scroll"><table class="as2-tbl">' +
          '<thead><tr><th>Date</th><th>Motif</th><th>Cadre</th>' +
          '<th class="c">Appel → Fin</th><th class="c">Trajet</th><th class="r">Durée</th></tr></thead>' +
          '<tbody>' + rows.map(i => {
            const d = dureeMin(i);
            const h = x => x ? String(x).slice(0, 5) : '—';
            return '<tr class="as2-tbl-row" onclick="openAstIntervModal(\'' + esc(i.id) + '\')">' +
              '<td style="white-space:nowrap">' + jmCourt(i.date) + '</td>' +
              '<td style="font-size:12.5px;font-weight:600;color:var(--v2-t2)">' + esc(i.motif) + '</td>' +
              '<td>' + esc(i.cadre || '—') + '</td>' +
              '<td class="c">' + h(i.heure_appel) + ' → ' + h(i.heure_fin) + '</td>' +
              '<td class="c" style="color:var(--v2-indigo-pale)">' + (Number(i.trajet_min) || 0) + ' min</td>' +
              '<td class="r" style="font-weight:700;color:var(--v2-t1)">' + (d == null ? '—' : hm(d)) + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>' +
        (rows.length ? '' : vide('Aucune intervention enregistrée', T_INTERV)) +
      '</div>';
  }

  // ── Barème CCN 66 ─────────────────────────────────────────────────────
  function renderBareme(duMois, intervMois, setF) {
    const box = el('astBareme'); if (!box) return;
    const l = lignesBareme(duMois, intervMois, setF);
    const unite = u => u === 'intervention' ? '/ interv.' : '/ jour';
    box.innerHTML =
      dcHead('#10b981', ICO.money, 'CCN 66', 'Barème d\'indemnités') +
      '<div class="dc-body">' +
      (l.length
        ? '<table class="as2-bt"><thead><tr><th>Type d\'astreinte</th>' +
            '<th class="r">Taux</th><th class="r">Nb</th><th class="r">Total</th></tr></thead><tbody>' +
            l.map(x => '<tr><td>' + esc(x.label) + '</td>' +
              '<td class="r m">' + eur(x.taux) + ' ' + unite(x.unite) + '</td>' +
              '<td class="r m">' + x.nb + '</td>' +
              '<td class="r tot">' + eur(x.total) + '</td></tr>').join('') +
          '</tbody></table>' +
          '<button type="button" class="as2-export" onclick="ast2ExportPaie()">' +
            svg(ICO.down, 2.2) + 'Exporter pour la paie</button>'
        : vide('Barème non configuré', T_BAREME)) +
      '</div>';
  }

  // ── Cascade de contacts ───────────────────────────────────────────────
  function renderCascade() {
    const box = el('astCascade'); if (!box) return;
    const c = EXTRA.cascade;
    box.innerHTML =
      dcHead('#f59e0b', ICO.phone, 'ESCALADE', 'Cascade de contacts') +
      '<div class="dc-body">' +
      (c.length
        ? c.map((x, k) => '<div class="as2-casc">' +
            '<div class="as2-casc-rail">' +
              '<span class="as2-casc-r" style="background:' + PAL[k % PAL.length] + '">' +
                esc(x.rang != null ? x.rang : (k + 1)) + '</span>' +
              '<span class="as2-casc-bar"></span></div>' +
            '<div class="as2-casc-b">' +
              '<div class="as2-casc-n">' + esc(x.fonction) + '</div>' +
              '<div class="as2-casc-m">' + esc(x.nom || '—') +
                (x.tel ? ' · <a href="tel:' + esc(String(x.tel).replace(/\s/g, '')) + '">' + esc(x.tel) + '</a>' : '') +
              '</div></div></div>').join('')
        : '<div class="v2-blk-vide">Cascade non configurée' +
          (EXTRA.missing[T_CASC] ? ' — exécutez ' + SQL_FILE : '') + '.</div>') +
      '</div>';
  }

  // ── Lignes de garde ───────────────────────────────────────────────────
  function renderLignes(list, auj) {
    const box = el('astLignes'); if (!box) return;
    const types = (typeof AST_TYPES !== 'undefined' ? AST_TYPES : []);
    const utilisés = types.filter(t => list.some(a => a.type === t.id));
    box.innerHTML = dcHead('#22d3ee', ICO.shield, 'GARDE', 'Lignes de garde') +
      '<div class="dc-body">' +
      (utilisés.length
        ? '<div style="display:flex;flex-direction:column;gap:11px">' + utilisés.map(t => {
            const jour = list.find(a => a.type === t.id && a.date === auj);
            const suiv = jour || list.filter(a => a.type === t.id && a.date > auj)
              .sort((a, b) => a.date.localeCompare(b.date))[0];
            const c = typeColor(t.id);
            return '<div class="as2-ligne" style="--pc:' + c + '">' +
              '<div class="as2-ligne-h"><span class="as2-ligne-ico">' + t.icon + '</span>' +
                '<span class="as2-ligne-l">' + esc(t.label) + '</span></div>' +
              (suiv
                ? '<div class="as2-ligne-b">' +
                    '<span class="as2-av as2-av-26" style="background:' + couleur(suiv.nom) + '">' +
                      esc(initiales(suiv.nom)) + '</span>' +
                    '<span class="as2-ligne-n">' + esc(suiv.nom || '—') +
                      (jour ? '' : ' · à partir du ' + jm(suiv.date)) + '</span>' +
                    (suiv.tel ? '<span class="as2-ligne-t">' + esc(suiv.tel) + '</span>' : '') +
                  '</div>'
                : '<div class="as2-ligne-b"><span class="as2-ligne-n">Non pourvue</span></div>') +
            '</div>';
          }).join('') + '</div>'
        : '<div class="v2-blk-vide">Aucune ligne de garde alimentée.</div>') +
      '</div>';
  }

  // ── Repos compensateur (calculé sur les interventions du mois) ────────
  function renderRepos(intervMois) {
    const box = el('astRepos'); if (!box) return;
    const par = {};
    intervMois.forEach(i => {
      const d = dureeMin(i);
      if (d == null || !i.cadre) return;
      par[i.cadre] = (par[i.cadre] || 0) + d;
    });
    const arr = Object.keys(par).map(k => ({ nom: k, min: par[k] }))
      .sort((a, b) => b.min - a.min);
    box.innerHTML =
      dcHead('#8b5cf6', ICO.sun, 'RÉCUPÉRATION', 'Repos compensateur') +
      '<div class="dc-body">' +
      (arr.length
        ? arr.map(r => '<div class="as2-rp">' + avatar(r.nom, 'as2-av-28') +
            '<div style="flex:1;min-width:0"><div class="as2-rp-n">' + esc(r.nom) + '</div>' +
            '<div class="as2-rp-d">' + hm(r.min) + ' d\'intervention ce mois-ci</div></div>' +
            '<span class="as2-rp-v">+' + (r.min / 60).toFixed(1).replace('.', ',') + ' h</span>' +
          '</div>').join('')
        : vide('Aucune intervention à compenser ce mois-ci', T_INTERV)) +
      '</div>';
  }

  // ── Consignes ─────────────────────────────────────────────────────────
  function renderConsignes() {
    const box = el('astConsignes'); if (!box) return;
    const c = EXTRA.consignes;
    box.innerHTML =
      dcHead('#22d3ee', ICO.shield, 'FICHES RÉFLEXES', 'Consignes d\'astreinte') +
      '<div class="dc-body">' +
      (c.length
        ? '<div class="as2-cons">' + c.map(x =>
            '<button type="button" class="as2-cons-i" style="--pc:' + esc(x.couleur || '#818cf8') + '" ' +
              'onclick="ast2VoirConsigne(\'' + esc(x.id) + '\')">' +
              '<span class="as2-cons-ico">' + svg(ICO.alert) + '</span>' +
              '<span class="as2-cons-l">' + esc(x.titre) + '</span></button>').join('') + '</div>'
        : '<div class="v2-blk-vide">Aucune consigne enregistrée' +
          (EXTRA.missing[T_CONS] ? ' — exécutez ' + SQL_FILE : '') + '.</div>') +
      '</div>';
  }

  // ══ ACTIONS ═════════════════════════════════════════════════════════════
  AST2.voirConsigne = function (id) {
    const c = EXTRA.consignes.find(x => String(x.id) === String(id));
    if (!c) return;
    const t = el('astConsTitle'); if (t) t.textContent = c.titre || 'Consigne d\'astreinte';
    const b = el('astConsBody');
    if (b) b.textContent = c.contenu || 'Aucun contenu enregistré pour cette consigne.';
    if (typeof openModal === 'function') openModal('modalAstConsigne');
  };

  AST2.ouvrirPeriode = function (id) {
    if (typeof openAstModal === 'function') openAstModal(id);
  };

  // Export CSV du récapitulatif de paie du mois affiché.
  AST2.exportPaie = function () {
    const list = (typeof getAst === 'function' ? getAst() : []) || [];
    const b = bornesMois();
    const setF = feries(b.an);
    const duMois = list.filter(a => a.date >= b.debut && a.date <= b.fin);
    const intervMois = EXTRA.interventions.filter(i => i.date >= b.debut && i.date <= b.fin);
    const l = lignesBareme(duMois, intervMois, setF);
    if (!l.length) { refuser(T_BAREME); return; }

    const sep = ';';
    const lignes = [['Periode', 'Libelle', 'Taux', 'Unite', 'Nombre', 'Total'].join(sep)];
    const per = MOIS[b.mois] + ' ' + b.an;
    l.forEach(x => lignes.push([per, x.label, x.taux, x.unite, x.nb,
      x.total.toFixed(2)].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(sep)));
    lignes.push(['"' + per + '"', '"TOTAL"', '""', '""', '""',
      '"' + l.reduce((s, x) => s + x.total, 0).toFixed(2) + '"'].join(sep));

    const blob = new Blob(['﻿' + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'astreintes-paie-' + b.debut.slice(0, 7) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (typeof toast === 'function') toast('Export de paie généré', 'success');
  };

  // ── Segmented control « ligne de garde » de la modale ─────────────────
  AST2.renderSeg = function () {
    const box = el('astTypeSeg'); if (!box) return;
    const cur = (el('astModalType') || {}).value || '';
    const types = (typeof AST_TYPES !== 'undefined' ? AST_TYPES : []);
    box.className = 'v2-seg';
    box.innerHTML = types.map(t =>
      '<button type="button" class="v2-seg-o' + (t.id === cur ? ' on' : '') +
        '" onclick="ast2SetType(\'' + t.id + '\')">' +
        '<span aria-hidden="true">' + t.icon + '</span>' +
        '<span>' + esc(t.label) + '</span></button>').join('');
  };

  AST2.setType = function (id) {
    const f = el('astModalType'); if (f) f.value = id;
    AST2.renderSeg();
  };

  // ══ INTERVENTIONS — CRUD ════════════════════════════════════════════════
  let editInterv = '';

  AST2.openInterv = function (id) {
    editInterv = id || '';
    const i = id ? EXTRA.interventions.find(x => String(x.id) === String(id)) : null;
    const set = (k, v) => { const n = el(k); if (n) n.value = v; };
    const t = el('astIntervTitle');
    if (t) t.textContent = i ? 'Modifier l\'intervention' : 'Déclarer une intervention';
    set('astIntervMotif', i ? (i.motif || '') : '');
    set('astIntervDate', i ? (i.date || '') : tdy());
    set('astIntervCadre', i ? (i.cadre || '') : '');
    set('astIntervAppel', i && i.heure_appel ? String(i.heure_appel).slice(0, 5) : '');
    set('astIntervFin', i && i.heure_fin ? String(i.heure_fin).slice(0, 5) : '');
    set('astIntervTrajet', i ? (i.trajet_min != null ? i.trajet_min : '') : '');
    set('astIntervNote', i ? (i.note || '') : '');
    const del = el('astIntervDelBtn'); if (del) del.style.display = i ? '' : 'none';
    if (typeof openModal === 'function') openModal('modalAstInterv');
  };

  AST2.saveInterv = async function () {
    const val = k => { const n = el(k); return n ? String(n.value || '').trim() : ''; };
    const motif = val('astIntervMotif'), date = val('astIntervDate');
    if (!motif || !date) {
      if (typeof toast === 'function') toast('Motif et date obligatoires', 'error');
      return;
    }
    if (EXTRA.missing[T_INTERV] || typeof supabaseClient === 'undefined') { refuser(T_INTERV); return; }

    let etab = null;
    try { etab = typeof sbGetEtablissementId === 'function' ? await sbGetEtablissementId() : null; }
    catch (e) { console.warn('[astreintes-v2] établissement introuvable', e); }
    if (!etab) { refuser(T_INTERV); return; }

    const row = {
      etablissement_id: etab, date, motif,
      cadre: val('astIntervCadre') || null,
      heure_appel: val('astIntervAppel') || null,
      heure_fin: val('astIntervFin') || null,
      trajet_min: Number(val('astIntervTrajet')) || 0,
      note: val('astIntervNote') || null
    };

    try {
      if (editInterv) {
        const { data, error } = await supabaseClient.from(T_INTERV)
          .update(row).eq('id', editInterv).select();
        if (error) throw error;
        if (!data || !data.length) throw new Error('Aucune ligne mise à jour — id=' + editInterv);
        const k = EXTRA.interventions.findIndex(x => String(x.id) === String(editInterv));
        if (k !== -1) EXTRA.interventions[k] = data[0];
      } else {
        const { data, error } = await supabaseClient.from(T_INTERV).insert(row).select();
        if (error) throw error;
        EXTRA.interventions.unshift(data[0]);
      }
      EXTRA.interventions.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      if (typeof closeModal === 'function') closeModal('modalAstInterv');
      AST2.render();
      if (typeof toast === 'function') toast('Intervention enregistrée', 'success');
    } catch (e) {
      console.error(e);
      EXTRA.missing[T_INTERV] = tableAbsente(e);
      refuser(T_INTERV);
    }
  };

  AST2.deleteInterv = async function () {
    if (!editInterv) return;
    if (!confirm('Supprimer cette intervention du registre ?')) return;
    if (typeof supabaseClient === 'undefined') { refuser(T_INTERV); return; }
    try {
      const { data, error } = await supabaseClient.from(T_INTERV)
        .delete().eq('id', editInterv).select();
      if (error) throw error;
      if (!data || !data.length) throw new Error('Aucune ligne supprimée — id=' + editInterv);
      EXTRA.interventions = EXTRA.interventions.filter(x => String(x.id) !== String(editInterv));
      if (typeof closeModal === 'function') closeModal('modalAstInterv');
      AST2.render();
      if (typeof toast === 'function') toast('Intervention supprimée');
    } catch (e) {
      console.error(e);
      EXTRA.missing[T_INTERV] = tableAbsente(e);
      refuser(T_INTERV);
    }
  };

  // ══ Publication sur window ══════════════════════════════════════════════
  // Un `const` de premier niveau ne crée pas de propriété sur window : les
  // onclick en ligne ont besoin de références explicites.
  window.AST2 = AST2;
  window.ast2Render = AST2.render;
  window.ast2VoirConsigne = AST2.voirConsigne;
  window.ast2OuvrirPeriode = AST2.ouvrirPeriode;
  window.ast2ExportPaie = AST2.exportPaie;
  window.ast2SetType = AST2.setType;
  window.ast2RenderSeg = AST2.renderSeg;
  window.openAstIntervModal = AST2.openInterv;
  window.saveAstInterv = AST2.saveInterv;
  window.deleteAstInterv = AST2.deleteInterv;
  window.ast2PrevMois = AST2.prevMois;
  window.ast2NextMois = AST2.nextMois;
  window.ast2MoisCourant = AST2.moisCourant;
})();
