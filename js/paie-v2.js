/* ══════════════════════════════════════════════════════════════════════════
   INTERNALIS — Fiches de paie (RH) · rendu V2
   D'après la maquette « Fiches de paie (RH) ».

   Ce module ne fait QUE le rendu et les écritures propres aux nouveautés de
   la maquette (cycle de paie, statuts de bulletin, solde de tout compte).
   Les fiches de paie elles-mêmes restent gérées par js/paie.js et la couche
   js/fiches-paie-supabase.js.

   Tables ajoutées par migration-paie.sql :
     paie_periodes · paie_bulletin_statuts · paie_soldes_tout_compte
   Si elles n'existent pas encore, la lecture renvoie [] avec un console.warn
   et toute écriture est refusée par un toast nommant le fichier SQL.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SQL_FILE = 'migration-paie.sql';
  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const MOIS_C = ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'];

  // ── État local ────────────────────────────────────────────────────────
  const S = {
    periode: null,           // 'YYYY-MM' affichée
    cycle: null,             // ligne paie_periodes de la période
    statuts: new Map(),      // fiche_paie_id → ligne paie_bulletin_statuts
    stc: [],                 // soldes de tout compte
    tablesOk: { paie_periodes: null, paie_bulletin_statuts: null, paie_soldes_tout_compte: null },
    detail: null             // id du bulletin déplié
  };

  // ── Icônes (traits SVG, cohérents avec la maquette) ───────────────────
  const IC = {
    file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    euro:  '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    calc:  '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/>',
    hour:  '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
    send:  '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    bell:  '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    lock:  '<rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="16" r="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    dl:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    card:  '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/>',
    shield:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    left:  '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>'
  };
  const svg = (d, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const svg16 = (d, w) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  // ── Habillage « Console Data » ────────────────────────────────────────
  // En-tête de carte : chip coloré + micro-label mono + titre (+ pill à droite)
  const dcHead = (color, icoD, eyebrow, title, right) => `<div class="dc-head"><div class="dc-head-l">
      <span class="dc-chip" style="background:${color}22;color:${color}">${svg16(icoD)}</span>
      <div style="min-width:0"><div class="dc-eyebrow">${esc(eyebrow)}</div><div class="dc-title">${esc(title)}</div></div>
    </div>${right || ''}</div>`;
  // Badge monospace teinté sur mesure (préserve la couleur d'origine du statut)
  const dcBadge = (txt, color) => `<span class="dc-badge" style="background:${color}22;color:${color};border:1px solid ${color}55"><span class="d" style="background:${color}"></span>${esc(txt)}</span>`;

  const CLR = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];

  // ── Utilitaires ───────────────────────────────────────────────────────
  const esc = s => (typeof escHtml === 'function' ? escHtml(s == null ? '' : s) : String(s == null ? '' : s));
  const eur = n => (Math.round(Number(n) || 0)).toLocaleString('fr-FR') + ' €';
  const eur2 = n => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const mask = (n, lead) => (typeof moneyMask === 'function' ? moneyMask(eur(n), lead) : eur(n));
  const fmtPeriode = p => { if (!p) return ''; const [y, m] = p.split('-'); return `${MOIS[parseInt(m, 10) - 1] || m} ${y}`; };
  const initiales = (prenom, nom) => ((prenom || '').trim()[0] || '') + ((nom || '').trim()[0] || '');
  const couleur = i => CLR[Math.abs(i) % CLR.length];
  const nowMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const shiftMonth = (p, delta) => {
    const [y, m] = p.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  function tauxCotis() {
    try { return (typeof paieMajoration === 'function' ? paieMajoration().tauxCotisations : 0) || 0; }
    catch { return 0; }
  }
  function brutTotal(f) { return (Number(f.brut) || 0) + (Number(f.primes) || 0) + (Number(f.heuresSup) || 0); }
  function chargesOf(f) { return brutTotal(f) * tauxCotis() / 100; }
  function netOf(f) {
    if (f.details && f.details.netReel != null) return Number(f.details.netReel);
    if (typeof pieNetEstime === 'function') return pieNetEstime(f);
    return Number(f.net) || 0;
  }

  // ── Accès Supabase tolérant (table éventuellement absente) ────────────
  async function selectAll(table, build) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return [];
    try {
      let q = supabaseClient.from(table).select('*');
      if (build) q = build(q);
      const { data, error } = await q;
      if (error) throw error;
      S.tablesOk[table] = true;
      return data || [];
    } catch (e) {
      S.tablesOk[table] = false;
      console.warn(`[paie-v2] table "${table}" indisponible — bloc affiché vide. Exécuter ${SQL_FILE}.`, e && (e.message || e));
      return [];
    }
  }

  function refuse() {
    if (typeof toast === 'function') toast(`Module non installé — exécuter ${SQL_FILE}`, 'error');
    return false;
  }

  async function upsert(table, row, onConflict) {
    if (S.tablesOk[table] === false) return refuse();
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return refuse();
    try {
      row.etablissement_id = await sbGetEtablissementId();
      const { error } = await supabaseClient.from(table).upsert(row, onConflict ? { onConflict } : undefined);
      if (error) throw error;
      S.tablesOk[table] = true;
      return true;
    } catch (e) {
      console.warn(`[paie-v2] écriture "${table}" refusée`, e && (e.message || e));
      return refuse();
    }
  }

  // ── Chargement des données annexes ────────────────────────────────────
  async function charger(periode) {
    const per = await selectAll('paie_periodes', q => q.eq('periode', periode).limit(1));
    S.cycle = per[0] || null;

    const st = await selectAll('paie_bulletin_statuts');
    S.statuts = new Map(st.map(r => [String(r.fiche_paie_id), r]));

    S.stc = await selectAll('paie_soldes_tout_compte', q => q.order('date_fin', { ascending: false }).limit(5));
  }

  // ══ RENDU ═══════════════════════════════════════════════════════════════
  function render() {
    const isAdmin = !!window._pvIsAdmin;
    const all = Array.isArray(window._pvAll) ? window._pvAll : [];
    const filtered = Array.isArray(window._pvFiltered) ? window._pvFiltered : [];

    if (!S.periode) {
      const dispo = [...new Set(filtered.map(f => f.periode).filter(Boolean))].sort();
      S.periode = dispo.length ? dispo[dispo.length - 1] : nowMonth();
    }
    const mois = filtered.filter(f => f.periode === S.periode);

    setText('pvMonthLabel', fmtPeriode(S.periode));

    renderStats(mois, isAdmin);
    renderFlow(isAdmin);
    renderTable(mois, isAdmin);
    renderDsn(isAdmin);
    renderMasse(mois, isAdmin);
    renderVariables(mois, isAdmin);
    renderEcheances(isAdmin);
    renderPas(mois, isAdmin);
    renderEvolution(filtered);
    renderControles(mois, isAdmin);
    renderAcomptes(mois, isAdmin);
    renderCoffre(mois, isAdmin);
    renderStc(isAdmin);

    // Blocs strictement RH : masqués hors admin (le filtrage des données est
    // fait en amont par renderPaie(), ceci évite d'afficher des cadres vides).
    document.querySelectorAll('.pv-admin').forEach(el => { el.hidden = !isAdmin; });
    // Hors admin le rail est entièrement masqué : la colonne principale l'occupe
    document.querySelector('.pv-body')?.classList.toggle('solo', !isAdmin);
    setText('pvScope', isAdmin ? 'Tous les salariés' : 'Vos bulletins uniquement');
  }

  function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
  const vide = m => `<div class="v2-blk-vide">${esc(m)}</div>`;

  // ── Statistiques ──────────────────────────────────────────────────────
  function renderStats(mois, isAdmin) {
    const net = mois.reduce((s, f) => s + netOf(f), 0);
    const valides = mois.filter(f => (S.statuts.get(String(f.id)) || {}).statut === 'valide').length;
    const averif = mois.filter(f => (S.statuts.get(String(f.id)) || {}).statut === 'verifier').length;
    const statutsDispo = S.tablesOk.paie_bulletin_statuts !== false;

    const tiles = [
      { n: String(mois.length), l: 'Bulletins du mois', c: '#ea580c', i: IC.file },
      { n: eur(net), l: isAdmin ? 'Net à payer' : 'Votre net', c: '#10b981', i: IC.euro }
    ];
    if (isAdmin) {
      // Suivi du cycle : dépend de paie_bulletin_statuts (migration-paie.sql)
      tiles.push({ n: statutsDispo ? `${valides} / ${mois.length}` : '—', l: 'Validés', c: '#22d3ee', i: IC.check });
      tiles.push({ n: statutsDispo ? String(averif) : '—', l: 'À vérifier', c: '#f59e0b', i: IC.alert });
    } else {
      // Vue salarié : deux repères annuels calculés sur ses propres bulletins
      const an = S.periode.slice(0, 4);
      const mien = (Array.isArray(window._pvFiltered) ? window._pvFiltered : []).filter(f => (f.periode || '').startsWith(an));
      tiles.push({ n: String(mien.length), l: `Bulletins ${an}`, c: '#22d3ee', i: IC.card });
      tiles.push({ n: eur(mien.reduce((s, f) => s + netOf(f), 0)), l: `Cumul net ${an}`, c: '#818cf8', i: IC.euro });
    }
    setHtml('pvStats', tiles.map(t => `
      <div class="dc-kpi" style="--dc-c:${t.c}">
        <div class="dc-kpi-top"><span class="dc-kpi-label">${esc(t.l)}</span><span class="dc-kpi-ico" style="color:${t.c}">${svg16(t.i)}</span></div>
        <div class="dc-kpi-val">${esc(t.n)}</div>
      </div>`).join(''));
  }

  // ── Fil du cycle de paie ──────────────────────────────────────────────
  const ETAPES = [
    { k: 'collecte', l: 'Collecte variables', i: IC.check },
    { k: 'calcul',   l: 'Calcul des paies',   i: IC.calc },
    { k: 'controle', l: 'Contrôle & validation', i: IC.hour },
    { k: 'virement', l: 'Virement SEPA',      i: IC.euro },
    { k: 'dsn',      l: 'DSN & bulletins',    i: IC.send }
  ];

  function renderFlow(isAdmin) {
    const courant = S.cycle ? ETAPES.findIndex(e => e.k === S.cycle.etape) : -1;
    const html = ETAPES.map((e, i) => {
      let bg = '#334155', tc = 'var(--v2-t6)', tag = 'À faire';
      if (courant >= 0 && i < courant) { bg = '#10b981'; tc = '#6ee7b7'; tag = 'Terminé'; }
      else if (courant >= 0 && i === courant) { bg = '#f59e0b'; tc = '#fcd34d'; tag = 'En cours'; }
      else if (courant < 0) { tag = 'Non renseigné'; }
      const tagEl = `<div class="pv-step-tag" style="--tc:${tc}">${esc(tag)}</div>`;
      const inner = `<span class="pv-step-ico">${svg(e.i, 2.4)}</span>
          <div style="min-width:0"><div class="pv-step-l">${esc(e.l)}</div>${tagEl}</div>`;
      const el = isAdmin
        ? `<button type="button" class="pv-step" style="--sc:${bg}" title="Marquer cette étape comme en cours" onclick="PaieV2.setEtape('${e.k}')">${inner}</button>`
        : `<div class="pv-step" style="--sc:${bg}">${inner}</div>`;
      return el + (i < ETAPES.length - 1 ? '<span class="pv-step-line"></span>' : '');
    }).join('');
    setHtml('pvFlow', html);
  }

  async function setEtape(k) {
    if (!window._pvIsAdmin) { toast('Réservé aux administrateurs', 'error'); return; }
    const ok = await upsert('paie_periodes',
      { periode: S.periode, etape: k, updated_at: new Date().toISOString() }, 'etablissement_id,periode');
    if (!ok) return;
    toast('Étape du cycle mise à jour', 'success');
    await charger(S.periode);
    render();
  }

  // ── Tableau des bulletins ─────────────────────────────────────────────
  const ST_META = {
    valide:   { l: 'Validé',       c: '#10b981' },
    calcule:  { l: 'Calculé',      c: '#22d3ee' },
    verifier: { l: 'À vérifier',   c: '#f59e0b' }
  };
  const ST_CYCLE = ['calcule', 'verifier', 'valide'];

  function empDe(f) {
    const emps = Array.isArray(window._fpEmployesCache) ? window._fpEmployesCache : [];
    return emps.find(e => String(e.id) === String(f.employeId)) || null;
  }

  function renderTable(mois, isAdmin) {
    const head = dcHead('#ea580c', IC.file, 'Paie', `Bulletins — ${fmtPeriode(S.periode)}`,
      `<span class="dc-pill dim">${mois.length} salarié${mois.length > 1 ? 's' : ''}</span>`);
    if (!mois.length) {
      setHtml('pieList', `${head}<div class="dc-empty">Aucun bulletin pour ${esc(fmtPeriode(S.periode))}.</div>`);
      return;
    }
    const rows = mois.slice().sort((a, b) => (a.employeNom || '').localeCompare(b.employeNom || '')).map((f, i) => {
      const emp = empDe(f);
      const nom = emp ? `${emp.prenom || ''} ${emp.nom || ''}`.trim() : (f.employeNom || '—');
      const fonction = emp ? (emp.poste || '') : '';
      const ini = emp ? initiales(emp.prenom, emp.nom) : (nom.slice(0, 2).toUpperCase());
      const st = S.statuts.get(String(f.id));
      const meta = st ? ST_META[st.statut] : null;
      const stHtml = meta
        ? dcBadge(meta.l, meta.c)
        : dcBadge('Non renseigné', '#64748b');
      const stCell = isAdmin
        ? `<button type="button" class="pv-step" style="min-width:0" title="Changer le statut" onclick="PaieV2.cycleStatut('${esc(f.id)}')">${stHtml}</button>`
        : stHtml;

      const det = S.detail === f.id ? `<tr><td colspan="6" style="padding:0 20px 14px">${detailHtml(f)}</td></tr>` : '';
      return `<tr class="pyx-card">
        <td>
          <div class="pv-emp">
            <span class="pv-av" style="--ac:${couleur(i)}">${esc(ini || '—')}</span>
            <div style="min-width:0">
              <div class="pv-emp-n">${esc(nom)}</div>
              <div class="pv-emp-f">${esc(fonction || '—')}</div>
            </div>
          </div>
        </td>
        <td class="r">${mask(brutTotal(f))}</td>
        <td class="r charges">${chargesOf(f) ? mask(chargesOf(f)) : '—'}</td>
        <td class="r net">${mask(netOf(f), 'lead')}</td>
        <td>${stCell}</td>
        <td class="c">
          <button type="button" class="pv-iconbtn" title="Détail du bulletin" onclick="PaieV2.toggleDetail('${esc(f.id)}')">${svg(IC.card)}</button>
          ${f.fichierPath ? `<button type="button" class="pv-iconbtn" title="Télécharger le bulletin" onclick="voirFichePaie('${esc(f.id)}')">${svg(IC.dl)}</button>` : ''}
          ${isAdmin ? `<button type="button" class="pv-iconbtn danger" title="Supprimer" onclick="supprimerFichePaie('${esc(f.id)}')">${svg(IC.x)}</button>` : ''}
        </td>
      </tr>${det}`;
    }).join('');

    setHtml('pieList', `${head}<div class="pv-scroll"><table class="pv-table">
      <thead><tr>
        <th>Salarié</th><th class="r">Brut</th><th class="r">Charges</th>
        <th class="r">Net à payer</th><th>Statut</th><th class="c">Bulletin</th>
      </tr></thead>
      <tbody>${rows}</tbody></table></div>`);
  }

  function detailHtml(f) {
    const parts = [];
    if (typeof paieBreakdown === 'function') parts.push(paieBreakdown(f));
    if (typeof paieDetailsHtml === 'function') parts.push(paieDetailsHtml(f));
    const meta = `<div class="pv-li-s" style="margin-top:8px">${f.fichierNom ? esc(f.fichierNom) + ' · ' : ''}`
      + `Ajouté le ${f.createdAt ? new Date(f.createdAt).toLocaleDateString('fr-FR') : '—'}`
      + `${f.ajoutePar ? ' par ' + esc(f.ajoutePar) : ''}</div>`;
    const corps = parts.filter(Boolean).join('');
    return `<div class="pv-det">${corps || '<div class="v2-blk-vide">Aucun montant saisi sur ce bulletin.</div>'}${meta}</div>`;
  }

  function toggleDetail(id) { S.detail = (S.detail === id) ? null : id; render(); }

  async function cycleStatut(id) {
    if (!window._pvIsAdmin) { toast('Réservé aux administrateurs', 'error'); return; }
    const all = Array.isArray(window._pvFiltered) ? window._pvFiltered : [];
    const f = all.find(x => String(x.id) === String(id));
    if (!f) return;
    const cur = (S.statuts.get(String(id)) || {}).statut;
    const next = ST_CYCLE[(ST_CYCLE.indexOf(cur) + 1) % ST_CYCLE.length];
    const s = Auth.getSession();
    const ok = await upsert('paie_bulletin_statuts', {
      fiche_paie_id: String(id),
      employe_id: String(f.employeId || ''),
      statut: next,
      valide_par: next === 'valide' ? ([s?.prenom, s?.nom].filter(Boolean).join(' ') || s?.username || '') : null,
      valide_le: next === 'valide' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, 'etablissement_id,fiche_paie_id');
    if (!ok) return;
    if (typeof auditLog === 'function') auditLog('paie_statut', `${f.employeNom} — ${fmtPeriode(f.periode)} → ${ST_META[next].l}`);
    await charger(S.periode);
    render();
  }

  // ── DSN ───────────────────────────────────────────────────────────────
  function renderDsn() {
    const c = S.cycle;
    if (!c) { setHtml('pvDsn', vide(`Cycle de paie non renseigné pour ${fmtPeriode(S.periode)}.`)); return; }
    const lignes = [];
    const transmise = c.dsn_statut === 'transmise';
    lignes.push({
      label: `DSN mensuelle — ${fmtPeriode(S.periode)}`,
      detail: c.dsn_date_limite ? `Dépôt net-entreprises avant le ${new Date(c.dsn_date_limite).toLocaleDateString('fr-FR')}` : 'Date limite non renseignée',
      tag: transmise ? 'Transmise' : 'À transmettre',
      c: transmise ? '#34d399' : '#f59e0b',
      i: transmise ? IC.check : IC.hour
    });
    const add = (label, val) => {
      if (val == null || val === '') return;
      lignes.push({ label, detail: `Calculé — ${eur(val)}`, tag: 'Prêt', c: '#34d399', i: IC.check });
    };
    add('Cotisations URSSAF', c.urssaf_montant);
    add('Retraite AGIRC-ARRCO', c.retraite_montant);
    add('Prévoyance / mutuelle', c.prevoyance_montant);

    setHtml('pvDsn', lignes.map(l => `
      <div class="pv-li" style="--pc:${l.c};border-left:3px solid ${l.c};padding-left:11px">
        <span class="pv-li-mark">${svg(l.i, 2.4)}</span>
        <div class="pv-li-b"><div class="pv-li-t">${esc(l.label)}</div><div class="pv-li-s">${esc(l.detail)}</div></div>
        ${dcBadge(l.tag, l.c)}
      </div>`).join(''));
  }

  // ── Masse salariale + ventilation ─────────────────────────────────────
  function renderMasse(mois) {
    const head = dcHead('#ea580c', IC.euro, 'Masse salariale', `Masse salariale — ${fmtPeriode(S.periode)}`);
    if (!mois.length) { setHtml('pvMasse', `${head}<div class="dc-body">${vide('Aucun bulletin sur ce mois.')}</div>`); return; }
    const brut = mois.reduce((s, f) => s + brutTotal(f), 0);
    const net = mois.reduce((s, f) => s + netOf(f), 0);
    const cotis = mois.reduce((s, f) => s + chargesOf(f), 0);
    const reten = mois.reduce((s, f) => s + (Number(f.retenues) || 0), 0);
    const patronales = S.cycle && S.cycle.cotisations_patronales != null ? Number(S.cycle.cotisations_patronales) : null;
    const total = brut + (patronales || 0);

    const lignes = [
      { label: 'Salaires nets', val: net, c: '#fb923c' },
      { label: `Cotisations salariales${tauxCotis() ? ` (${tauxCotis()} %)` : ''}`, val: cotis, c: '#f59e0b' },
      { label: 'Retenues & acomptes', val: reten, c: '#fca5a5' }
    ];
    if (patronales != null) lignes.push({ label: 'Cotisations patronales', val: patronales, c: '#fda4af' });

    const bars = lignes.filter(l => l.val > 0).map(l => `
      <div>
        <div class="pv-vent-h"><span class="pv-vent-l">${esc(l.label)}</span><span class="pv-vent-v">${eur(l.val)}</span></div>
        <div class="pv-vent-bar"><span style="width:${total ? Math.min(100, Math.round(l.val / total * 100)) : 0}%;background:${l.c}"></span></div>
      </div>`).join('');

    setHtml('pvMasse', `${head}<div class="dc-body">
      <div class="pv-mass-v">${eur(total)}</div>
      <div class="pv-mass-s">${patronales != null ? 'chargé' : 'brut salarial'} · net à payer ${eur(net)}${patronales == null ? ' · part patronale non renseignée' : ''}</div>
      <div class="pv-vent">${bars || vide('Aucun montant saisi.')}</div></div>`);
  }

  // ── Variables à intégrer (calculées sur les pointages validés) ────────
  function renderVariables(mois) {
    const pts = Array.isArray(window._fpPointagesCache) ? window._fpPointagesCache : [];
    if (typeof _pieHoursBreakdown !== 'function' || !pts.length) {
      setHtml('pvVariables', vide('Aucun pointage validé sur ce mois.'));
      return;
    }
    const emps = Array.isArray(window._fpEmployesCache) ? window._fpEmployesCache : [];
    const cibles = mois.length ? mois.map(f => empDe(f)).filter(Boolean) : emps;

    let hs = 0, dim = 0, fer = 0, mai1 = 0, indem = 0, mai1Eur = 0;
    const nomsHs = [];
    cibles.forEach(e => {
      const brk = _pieHoursBreakdown(e.id, S.periode);
      if (!brk.total) return;
      const contrat = typeof _pieContractMonthHours === 'function' ? _pieContractMonthHours(e, S.periode) : 0;
      const d = brk.total - contrat;
      if (d > 0) { hs += d; nomsHs.push(`${(e.prenom || '')[0] || ''}. ${e.nom || ''}`.trim()); }
      dim += brk.dimanche; fer += brk.ferie; mai1 += brk.mai1;
      if (typeof _pieIndemnite === 'function') indem += _pieIndemnite(brk);
      if (typeof _pieMai1 === 'function') mai1Eur += _pieMai1(e, brk);
    });

    const lignes = [];
    if (hs > 0) lignes.push({ label: 'Heures au-delà du contrat', detail: nomsHs.slice(0, 3).join(', ') || '—', val: `+${hs.toFixed(1)} h`, c: '#a855f7', i: IC.clock });
    if (dim + fer > 0) lignes.push({
      label: 'Dimanches & jours fériés',
      detail: `${dim.toFixed(1)} h dim. · ${fer.toFixed(1)} h fériés`,
      val: indem > 0 ? eur2(indem) : 'taux CCN 66 à saisir',
      c: '#7c3aed', i: IC.bell
    });
    if (mai1 > 0) lignes.push({ label: '1er mai (payé double)', detail: `${mai1.toFixed(1)} h travaillées`, val: mai1Eur > 0 ? eur2(mai1Eur) : 'salaire de base manquant', c: '#ef4444', i: IC.plus });

    setHtml('pvVariables', lignes.length
      ? lignes.map(l => `<div class="pv-li" style="--pc:${l.c};border-left:3px solid ${l.c};padding-left:11px">
          <span class="pv-li-ico">${svg(l.i)}</span>
          <div class="pv-li-b"><div class="pv-li-t">${esc(l.label)}</div><div class="pv-li-s">${esc(l.detail)}</div></div>
          <span class="pv-li-v">${esc(l.val)}</span>
        </div>`).join('')
      : vide('Aucune variable détectée sur les pointages validés de ce mois.'));
  }

  // ── Échéances déclaratives ────────────────────────────────────────────
  function renderEcheances() {
    const c = S.cycle;
    const items = [];
    if (c && c.dsn_date_limite) items.push({ d: c.dsn_date_limite, label: 'DSN mensuelle', info: 'net-entreprises', c: '#f59e0b' });
    if (c && c.virement_date) items.push({ d: c.virement_date, label: 'Virement des salaires', info: 'SEPA', c: '#10b981' });
    if (!items.length) { setHtml('pvEcheances', vide('Aucune échéance enregistrée pour ce mois.')); return; }
    setHtml('pvEcheances', items.sort((a, b) => a.d.localeCompare(b.d)).map(e => {
      const dt = new Date(e.d);
      return `<div class="pv-li" style="--pc:${e.c};border-left:3px solid ${e.c};padding-left:11px">
        <div class="pv-ech-d"><div class="pv-ech-j">${String(dt.getDate()).padStart(2, '0')}</div><div class="pv-ech-m">${MOIS_C[dt.getMonth()]}</div></div>
        <div class="pv-li-b"><div class="pv-li-t">${esc(e.label)}</div><div class="pv-li-s">${esc(e.info)}</div></div>
      </div>`;
    }).join(''));
  }

  // ── Prélèvement à la source ───────────────────────────────────────────
  function renderPas(mois) {
    const lignes = mois.map((f, i) => {
      const st = S.statuts.get(String(f.id));
      const pdf = f.details && f.details.impot != null ? Number(f.details.impot) : null;
      const montant = st && st.montant_pas != null ? Number(st.montant_pas) : pdf;
      const taux = st && st.taux_pas != null ? Number(st.taux_pas) : null;
      if (montant == null) return null;
      const emp = empDe(f);
      const nom = emp ? `${emp.prenom || ''} ${emp.nom || ''}`.trim() : (f.employeNom || '—');
      return `<div class="pv-li">
        <span class="pv-av pv-av-sm" style="--ac:${couleur(i)}">${esc(emp ? initiales(emp.prenom, emp.nom) : nom.slice(0, 2).toUpperCase())}</span>
        <span class="pv-pas-n">${esc(nom)}</span>
        <span class="pv-pas-t">${taux != null ? esc(taux.toLocaleString('fr-FR')) + ' %' : '—'}</span>
        <span class="pv-pas-m">−${eur(montant)}</span>
      </div>`;
    }).filter(Boolean);
    setHtml('pvPas', lignes.length ? lignes.join('') : vide('Aucun prélèvement à la source enregistré sur ce mois.'));
  }

  // ── Évolution de la masse salariale ───────────────────────────────────
  function renderEvolution(list) {
    const par = new Map();
    list.forEach(f => {
      if (!f.periode) return;
      par.set(f.periode, (par.get(f.periode) || 0) + brutTotal(f));
    });
    const mois = [];
    for (let i = 5; i >= 0; i--) mois.push(shiftMonth(S.periode, -i));
    const vals = mois.map(m => par.get(m) || 0);
    const max = Math.max(...vals, 1);
    const nonNuls = vals.filter(v => v > 0);
    if (nonNuls.length < 1) { setHtml('pvEvo', vide('Pas assez d\'historique pour tracer une évolution.')); setText('pvEvoDelta', '—'); return; }

    setHtml('pvEvo', mois.map((m, i) => {
      const v = vals[i];
      const [, mm] = m.split('-');
      return `<div class="pv-evo-c">
        <div class="pv-evo-v">${v > 0 ? esc(Math.round(v / 1000) + 'k') : ''}</div>
        <div class="pv-evo-b" style="height:${v > 0 ? Math.max(4, Math.round(v / max * 100)) : 0}%"></div>
        <div class="pv-evo-l">${MOIS_C[parseInt(mm, 10) - 1]}</div>
      </div>`;
    }).join(''));

    const dernier = vals[5], avant = vals[4];
    const el = document.getElementById('pvEvoDelta');
    if (el) {
      if (dernier > 0 && avant > 0) {
        const d = (dernier - avant) / avant * 100;
        el.textContent = `${d >= 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')} %`;
        el.style.color = d >= 0 ? '#fb923c' : '#6ee7b7';
      } else { el.textContent = '—'; el.style.color = 'var(--v2-t6)'; }
    }
  }

  // ── Contrôles de cohérence (dérivés des données réelles) ──────────────
  function renderControles(mois) {
    const emps = (Array.isArray(window._fpEmployesCache) ? window._fpEmployesCache : []).filter(e => e.statut === 'actif');
    const all = Array.isArray(window._pvFiltered) ? window._pvFiltered : [];
    const prec = all.filter(f => f.periode === shiftMonth(S.periode, -1));
    const precPar = new Map(prec.map(f => [String(f.employeId), brutTotal(f)]));

    const sansMontant = mois.filter(f => !brutTotal(f));
    const sansFichier = mois.filter(f => !f.fichierPath);
    const ecarts = mois.filter(f => {
      const p = precPar.get(String(f.employeId));
      return p > 0 && Math.abs(brutTotal(f) - p) / p > 0.1;
    });
    const idsAvecBulletin = new Set(mois.map(f => String(f.employeId)));
    const manquants = emps.filter(e => !idsAvecBulletin.has(String(e.id)));

    const ctrl = [
      { l: 'Montants saisis sur tous les bulletins', ko: sansMontant.length, tagKo: `${sansMontant.length} sans montant` },
      { l: 'Fichier du bulletin joint', ko: sansFichier.length, tagKo: `${sansFichier.length} sans fichier` },
      { l: 'Écart > 10 % vs mois précédent', ko: ecarts.length, tagKo: ecarts.slice(0, 2).map(f => f.employeNom).join(', ') },
      { l: 'Bulletin présent pour chaque salarié actif', ko: manquants.length, tagKo: `${manquants.length} manquant${manquants.length > 1 ? 's' : ''}` }
    ];
    setHtml('pvControles', ctrl.map(c => {
      const col = c.ko ? '#f59e0b' : '#34d399';
      return `<div class="pv-li" style="--pc:${col};border-left:3px solid ${col};padding-left:11px">
        <span class="pv-li-mark">${svg(c.ko ? IC.alert : IC.check, 2.4)}</span>
        <span class="pv-pas-n">${esc(c.l)}</span>
        ${dcBadge(c.ko ? c.tagKo : 'OK', col)}
      </div>`;
    }).join(''));
  }

  // ── Acomptes & saisies ────────────────────────────────────────────────
  function renderAcomptes(mois) {
    const lignes = mois.map((f, i) => {
      const st = S.statuts.get(String(f.id));
      if (!st || st.acompte == null || Number(st.acompte) === 0) return null;
      const emp = empDe(f);
      const nom = emp ? `${emp.prenom || ''} ${emp.nom || ''}`.trim() : (f.employeNom || '—');
      return `<div class="pv-li">
        <span class="pv-av pv-av-sm" style="--ac:${couleur(i)}">${esc(emp ? initiales(emp.prenom, emp.nom) : nom.slice(0, 2).toUpperCase())}</span>
        <div class="pv-li-b"><div class="pv-li-t">${esc(nom)}</div><div class="pv-li-s">${esc(st.acompte_motif || 'Acompte sur salaire')}</div></div>
        <span class="pv-li-v" style="color:#f59e0b">−${eur(st.acompte)}</span>
      </div>`;
    }).filter(Boolean);
    setHtml('pvAcomptes', lignes.length ? lignes.join('') : vide('Aucun acompte ni saisie enregistré sur ce mois.'));
  }

  // ── Coffre-fort numérique ─────────────────────────────────────────────
  function renderCoffre(mois) {
    const avec = mois.filter(f => f.fichierPath).length;
    setText('pvCoffreTag', mois.length ? `${avec} / ${mois.length} déposés` : '—');
    const lignes = [];
    if (mois.length) lignes.push({
      label: `Bulletins ${fmtPeriode(S.periode)}`,
      detail: `${mois.length} salarié${mois.length > 1 ? 's' : ''} · fichier joint`,
      tag: avec === mois.length ? 'Complet' : `${mois.length - avec} manquant${mois.length - avec > 1 ? 's' : ''}`,
      c: avec === mois.length ? '#22d3ee' : '#f59e0b'
    });
    S.stc.forEach(s => lignes.push({
      label: 'Solde de tout compte',
      detail: s.employe_nom || '—',
      tag: s.documents_generes_le ? 'Généré' : 'En préparation',
      c: s.documents_generes_le ? '#34d399' : '#f59e0b'
    }));
    setHtml('pvCoffre', lignes.length
      ? lignes.map(l => `<div class="pv-li" style="--pc:${l.c};border-left:3px solid ${l.c};padding-left:11px">
          <span class="pv-li-ico">${svg(IC.file)}</span>
          <div class="pv-li-b"><div class="pv-li-t">${esc(l.label)}</div><div class="pv-li-s">${esc(l.detail)}</div></div>
          ${dcBadge(l.tag, l.c)}
        </div>`).join('')
      : vide('Aucun document à mettre à disposition.'));
  }

  // ── Solde de tout compte ──────────────────────────────────────────────
  function renderStc(isAdmin) {
    const s = S.stc[0];
    if (!s) {
      setText('pvStcSub', 'Aucun solde de tout compte en préparation.');
      setHtml('pvStcLignes', vide(S.tablesOk.paie_soldes_tout_compte === false
        ? `Module non installé — exécuter ${SQL_FILE}.`
        : 'Aucune fin de contrat enregistrée.'));
      const b = document.getElementById('pvStcBtn'); if (b) b.hidden = true;
      return;
    }
    setText('pvStcSub', `${s.employe_nom || '—'}${s.motif ? ' — ' + s.motif : ''}${s.date_fin ? ' · ' + new Date(s.date_fin).toLocaleDateString('fr-FR') : ''}`);
    const l = [];
    const push = (k, v, c) => { if (v != null && v !== '') l.push({ k, v: Number(v), c }); };
    push('Indemnité de précarité', s.indemnite_precarite, '#34d399');
    push('Congés payés non pris', s.conges_payes_solde, '#34d399');
    push('Autres indemnités', s.autres_indemnites, '#34d399');
    push('Solde net à verser', s.net_a_verser, '#ffffff');
    setHtml('pvStcLignes', l.length
      ? l.map(x => `<div class="pv-stc-l" style="--pc:${x.c}"><span class="pv-stc-k">${esc(x.k)}</span><span class="pv-stc-v">${eur(x.v)}</span></div>`).join('')
      : vide('Montants non renseignés.'));
    const b = document.getElementById('pvStcBtn');
    if (b) { b.hidden = !isAdmin; b.dataset.id = s.id; }
  }

  async function genererStc() {
    if (!window._pvIsAdmin) { toast('Réservé aux administrateurs', 'error'); return; }
    const s = S.stc[0];
    if (!s) return;
    if (S.tablesOk.paie_soldes_tout_compte === false) { refuse(); return; }
    try {
      const { error } = await supabaseClient.from('paie_soldes_tout_compte')
        .update({ documents_generes_le: new Date().toISOString(), statut: 'valide', updated_at: new Date().toISOString() })
        .eq('id', s.id);
      if (error) throw error;
      toast('Documents de fin de contrat marqués comme générés', 'success');
      await charger(S.periode);
      render();
    } catch (e) {
      console.warn('[paie-v2] genererStc', e && (e.message || e));
      refuse();
    }
  }

  // ── Navigation de mois ────────────────────────────────────────────────
  async function goMonth(delta) {
    S.periode = shiftMonth(S.periode || nowMonth(), delta);
    S.detail = null;
    // Le filtre historique par année reste la source de vérité de js/paie.js
    const sel = document.getElementById('pieFiltreAnnee');
    if (sel) {
      const y = S.periode.slice(0, 4);
      if ([...sel.options].some(o => o.value === y)) sel.value = y; else sel.value = '';
    }
    await charger(S.periode);
    if (typeof renderPaie === 'function') renderPaie(); else render();
  }

  // ── Amorçage (appelé par initPaie) ────────────────────────────────────
  async function boot() {
    const list = Array.isArray(window._pvAll) ? window._pvAll : [];
    if (!S.periode) {
      const dispo = [...new Set(list.map(f => f.periode).filter(Boolean))].sort();
      S.periode = dispo.length ? dispo[dispo.length - 1] : nowMonth();
    }
    await charger(S.periode);
  }

  window.PaieV2 = {
    render, boot, goMonth, setEtape, cycleStatut, toggleDetail, genererStc,
    get periode() { return S.periode; }
  };
})();
