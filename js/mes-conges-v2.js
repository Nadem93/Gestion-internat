/* ══════════════════════════════════════════════════════════════════════════
   MES CONGÉS — rendu Design V2 « cockpit »
   Reprend le langage visuel de la maquette « Demandes congés (RH) », adapté à
   l'espace PERSONNEL du salarié.
   Ne réécrit aucune couche Supabase : consomme _mcCache / _mcFiche remplis par
   le script de la page et appelle les actions existantes (openMesCongeModal,
   cancelMesConge).
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const MCV = {};
  window.MCV = MCV;

  /* ── Palettes ───────────────────────────────────────────────────────── */
  const TYPE_C = {
    cp: '#22d3ee', rtt: '#a855f7', maladie: '#f59e0b',
    enfant_malade: '#ec4899', formation: '#818cf8', autre: '#8095b4'
  };
  const TYPE_L = {
    cp: 'Congés payés', rtt: 'RTT', maladie: 'Arrêt maladie',
    enfant_malade: 'Enfant malade', formation: 'Formation', autre: 'Autre'
  };
  const ST = {
    en_attente: { l: 'En attente', c: '#f59e0b' },
    accepte:    { l: 'Accepté',    c: '#10b981' },
    refuse:     { l: 'Refusé',     c: '#ef4444' }
  };
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOIS_C = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  MCV.typeColor = t => TYPE_C[t] || TYPE_C.autre;
  MCV.typeLabel = t => TYPE_L[t] || TYPE_L.autre;

  /* ── Icônes ─────────────────────────────────────────────────────────── */
  const IC = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    cross: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>'
  };
  const svg = (p, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
    (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  /* Icône dimensionnée pour les chips Console Data (dc-chip / dc-kpi-ico). */
  const svg16 = (p, w) => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="' +
    (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  /* En-tête de carte Console Data : chip coloré + eyebrow + titre + pill méta. */
  const dcHead = (col, eyebrow, title, icon, right) =>
    `<div class="dc-head"><div class="dc-head-l">` +
    `<span class="dc-chip" style="background:${col}22;color:${col}">${svg16(icon)}</span>` +
    `<div style="min-width:0"><div class="dc-eyebrow">${esc(eyebrow)}</div><div class="dc-title">${esc(title)}</div></div>` +
    `</div>${right || ''}</div>`;

  /* ── Utilitaires ────────────────────────────────────────────────────── */
  const esc = s => (typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const fdate = d => (typeof formatDate === 'function' ? formatDate(d) : (d || '—'));
  const jours = c => {
    if (!c.debut || !c.fin) return 0;
    return Math.ceil((new Date(c.fin) - new Date(c.debut)) / 86400000) + 1;
  };
  const initiales = (p, n) => ((p || '').trim().charAt(0) + (n || '').trim().charAt(0)).toUpperCase() || '?';
  const ymd = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0');

  /* ── Filtre courant ─────────────────────────────────────────────────── */
  MCV.filtre = 'tout';
  MCV.setFiltre = function (f) { MCV.filtre = f; MCV.render(); };

  /* ══ Compteurs de congés (table conges_soldes — optionnelle) ══════════
     Dégradation douce : table absente → [] + console.warn, la page reste
     pleinement utilisable et le bloc affiche un état vide. */
  MCV.soldes = null;
  MCV.soldesDispo = true;

  MCV.loadSoldes = async function (fiche) {
    MCV.soldes = null;
    if (!fiche || typeof supabaseClient === 'undefined') return;
    try {
      const { data, error } = await supabaseClient
        .from('conges_soldes')
        .select('*')
        .eq('employe_id', String(fiche.id))
        .order('annee', { ascending: false })
        .limit(1);
      if (error) throw error;
      MCV.soldesDispo = true;
      MCV.soldes = (data && data[0]) ? data[0] : null;
    } catch (e) {
      MCV.soldesDispo = false;
      MCV.soldes = null;
      console.warn('[mes-conges-v2] Compteurs de congés indisponibles ' +
        '(table conges_soldes absente ?) — exécutez migration-mes-conges.sql.', e);
    }
  };

  /* ══ Rendu ═══════════════════════════════════════════════════════════ */
  MCV.render = function () {
    const cache = Array.isArray(window._mcCache) ? window._mcCache : [];
    const fiche = window._mcFiche || null;
    const year = new Date().getFullYear();

    renderStats(cache, year);
    renderChips(cache);
    renderListe(cache);
    renderRail(cache, fiche, year);
    renderBas(cache, fiche, year);
  };

  /* ── KPI ────────────────────────────────────────────────────────────── */
  function renderStats(cache, year) {
    const el = document.getElementById('mcStats');
    if (!el) return;
    const joursPris = cache
      .filter(c => c.statut === 'accepte' && c.debut && new Date(c.debut).getFullYear() === year)
      .reduce((s, c) => s + jours(c), 0);
    const k = [
      { n: joursPris, l: 'Jours pris', sub: 'Année ' + year, c: '#22d3ee', i: IC.sun },
      { n: cache.filter(c => c.statut === 'en_attente').length, l: 'En attente', sub: 'Demandes à valider', c: '#f59e0b', i: IC.hourglass },
      { n: cache.filter(c => c.statut === 'accepte').length, l: 'Acceptées', sub: 'Demandes validées', c: '#10b981', i: IC.check },
      { n: cache.filter(c => c.statut === 'refuse').length, l: 'Refusées', sub: 'Demandes refusées', c: '#ef4444', i: IC.cross }
    ];
    el.innerHTML = k.map(s => `
      <div class="dc-kpi" style="--dc-c:${s.c}">
        <div class="dc-kpi-top">
          <span class="dc-kpi-label">${esc(s.l)}</span>
          <span class="dc-kpi-ico" style="color:${s.c}">${svg16(s.i)}</span>
        </div>
        <div class="dc-kpi-val" style="color:${s.c}">${s.n}</div>
        <div class="dc-kpi-sub">${esc(s.sub)}</div>
      </div>`).join('');
  }

  /* ── Chips de filtre ────────────────────────────────────────────────── */
  function renderChips(cache) {
    const el = document.getElementById('mcChips');
    if (!el) return;
    const defs = [
      { k: 'tout', l: 'Toutes', c: '#818cf8', n: cache.length },
      { k: 'en_attente', l: 'En attente', c: ST.en_attente.c, n: cache.filter(c => c.statut === 'en_attente').length },
      { k: 'accepte', l: 'Acceptées', c: ST.accepte.c, n: cache.filter(c => c.statut === 'accepte').length },
      { k: 'refuse', l: 'Refusées', c: ST.refuse.c, n: cache.filter(c => c.statut === 'refuse').length }
    ];
    el.innerHTML = defs.map(d => `
      <button type="button" class="v2-chip-f${MCV.filtre === d.k ? ' on' : ''}"
              onclick="MCV.setFiltre('${d.k}')">
        <span class="dot" style="background:${d.c}"></span>${esc(d.l)}<span class="n">${d.n}</span>
      </button>`).join('');
  }

  /* ── Liste principale ───────────────────────────────────────────────── */
  function renderListe(cache) {
    const el = document.getElementById('mcList');
    if (!el) return;

    const f = MCV.filtre;
    const visibles = f === 'tout' ? cache : cache.filter(c => c.statut === f);
    const attente = visibles.filter(c => c.statut === 'en_attente')
      .sort((a, b) => (a.debut || '').localeCompare(b.debut || ''));
    const traitees = visibles.filter(c => c.statut !== 'en_attente')
      .sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));

    let html = '';

    /* En attente */
    html += `<div class="dc-card" style="margin-bottom:16px">`;
    html += dcHead('#f59e0b', 'File d\'attente', 'En attente de validation', IC.clock,
      `<span class="dc-pill dim">${attente.length}</span>`);
    html += `<div class="dc-body">`;
    if (!attente.length) {
      html += `<div class="v2-blk-vide">Aucune demande en attente.</div>`;
    } else {
      html += `<div class="mcv-pend">` + attente.map(c => {
        const col = MCV.typeColor(c.type);
        const j = jours(c);
        return `<div class="mcv-p" style="--tc:${col};border-left:3px solid ${col}">
          <span class="mcv-p-cal">
            <span class="mcv-p-cal-m">${MOIS_C[parseInt((c.debut || '').slice(5, 7), 10) - 1] || '—'}</span>
            <span class="mcv-p-cal-d">${esc((c.debut || '').slice(8, 10) || '—')}</span>
          </span>
          <div class="mcv-p-id">
            <div class="mcv-p-t">${esc(MCV.typeLabel(c.type))}</div>
            <div class="mcv-p-s">${j} jour${j > 1 ? 's' : ''}</div>
          </div>
          <div class="mcv-p-mid">
            <div class="mcv-p-per">${esc(fdate(c.debut))} → ${esc(fdate(c.fin))}</div>
            <div class="mcv-p-s">${c.motif ? esc(c.motif) : 'Demandé le ' + esc(c.dateDemande ? fdate(c.dateDemande) : '—')}</div>
          </div>
          <span class="dc-badge dc-b-amber"><span class="d"></span>En attente</span>
          <button type="button" class="mcv-x" title="Annuler la demande"
                  aria-label="Annuler la demande" onclick="cancelMesConge('${esc(c.id)}')">
            ${svg(IC.cross, 2.5)}
          </button>
        </div>`;
      }).join('') + `</div>`;
    }
    html += `</div></div>`;

    /* Traitées */
    html += `<div class="dc-card">`;
    html += dcHead('#6366f1', 'Historique', 'Demandes traitées', IC.file,
      `<span class="dc-pill dim">${traitees.length}</span>`);
    if (!traitees.length) {
      html += `<div class="dc-body"><div class="v2-blk-vide">Aucune demande traitée pour l'instant.</div></div>`;
    } else {
      html += `<div class="mcv-scroll"><table class="v2-table mcv-tbl">
        <thead><tr>
          <th>Type</th><th>Période</th><th style="text-align:center">Jours</th>
          <th>Statut</th><th>Traité par</th>
        </tr></thead><tbody>` +
        traitees.map(c => {
          const col = MCV.typeColor(c.type);
          const st = ST[c.statut] || ST.en_attente;
          const j = jours(c);
          const bcls = c.statut === 'accepte' ? 'dc-b-green' : (c.statut === 'refuse' ? 'dc-b-red' : 'dc-b-amber');
          return `<tr>
            <td><span class="mcv-td-type"><span class="mcv-dot" style="background:${col}"></span>${esc(MCV.typeLabel(c.type))}</span></td>
            <td class="mcv-td-m">${esc(fdate(c.debut))} → ${esc(fdate(c.fin))}</td>
            <td class="mcv-td-m" style="text-align:center">${j}</td>
            <td><span class="dc-badge ${bcls}"><span class="d"></span>${esc(st.l)}</span></td>
            <td class="mcv-td-m">${esc(c.traitePar || '—')}${c.statut === 'refuse' && c.reponseMotif ? `<div class="mcv-refus">${esc(c.reponseMotif)}</div>` : ''}</td>
          </tr>`;
        }).join('') +
        `</tbody></table></div>`;
    }
    html += `</div>`;

    el.innerHTML = html;
  }

  /* ── Rail ───────────────────────────────────────────────────────────── */
  function renderRail(cache, fiche, year) {
    const el = document.getElementById('mcRail');
    if (!el) return;
    let html = '';

    /* Mes compteurs */
    const s = MCV.soldes;
    html += `<div class="dc-card">`;
    html += dcHead('#22d3ee', 'Soldes', 'Mes compteurs', IC.layers,
      s ? `<span class="dc-pill dim">${esc(s.annee)}</span>` : '');
    html += `<div class="dc-body">`;
    if (s) {
      const lignes = [
        { l: 'CP N-1', v: s.cp_n1, c: '#f59e0b' },
        { l: 'CP acquis', v: s.cp_acquis, c: '#22d3ee' },
        { l: 'CP pris', v: s.cp_pris, c: '#818cf8' },
        { l: 'RTT', v: s.rtt, c: '#a855f7' },
        { l: 'Récupération', v: s.recup, c: '#10b981' },
        { l: 'CET', v: s.cet, c: '#ec4899' }
      ].filter(x => x.v !== null && x.v !== undefined);
      html += lignes.length
        ? `<div class="mcv-cpt">` + lignes.map(x => `
            <div class="mcv-cpt-i" style="border-left:3px solid ${x.c};padding-left:10px"><span class="mcv-cpt-l">${esc(x.l)}</span>
            <span class="mcv-cpt-v" style="color:${x.c}">${esc(String(x.v).replace('.', ','))}</span>
            <span class="mcv-cpt-u">j</span></div>`).join('') + `</div>`
        : `<div class="v2-blk-vide">Aucun compteur saisi.</div>`;
    } else if (!MCV.soldesDispo) {
      html += `<div class="v2-blk-vide">Compteurs indisponibles — la table <code>conges_soldes</code> n'existe pas encore (migration-mes-conges.sql).</div>`;
    } else {
      html += `<div class="v2-blk-vide">Aucun compteur saisi par l'administration.</div>`;
    }
    html += `</div></div>`;

    /* Prochains congés */
    const today = ymd(new Date());
    const avenir = cache.filter(c => c.statut === 'accepte' && c.fin && c.fin >= today)
      .sort((a, b) => (a.debut || '').localeCompare(b.debut || '')).slice(0, 5);
    html += `<div class="dc-card mcv-blk-cyan">`;
    html += dcHead('#22d3ee', 'À venir', 'Prochains congés', IC.cal);
    html += `<div class="dc-body">`;
    html += avenir.length
      ? `<div class="mcv-next">` + avenir.map(c => {
          const col = MCV.typeColor(c.type);
          const j = jours(c);
          return `<div class="mcv-next-i" style="border-left:3px solid ${col};padding-left:10px">
            <span class="mcv-dot" style="background:${col}"></span>
            <div class="mcv-next-b">
              <div class="mcv-next-t">${esc(MCV.typeLabel(c.type))}</div>
              <div class="mcv-next-s">${esc(fdate(c.debut))} → ${esc(fdate(c.fin))}</div>
            </div>
            <span class="mcv-next-j">${j} j</span>
          </div>`;
        }).join('') + `</div>`
      : `<div class="v2-blk-vide">Aucun congé accepté à venir.</div>`;
    html += `</div></div>`;

    /* Jours posés par mois */
    const parMois = new Array(12).fill(0);
    cache.filter(c => c.statut === 'accepte' && c.debut && new Date(c.debut).getFullYear() === year)
      .forEach(c => { parMois[new Date(c.debut).getMonth()] += jours(c); });
    const maxM = Math.max.apply(null, parMois);
    html += `<div class="dc-card">`;
    html += dcHead('#f59e0b', 'Historique', 'Jours posés — ' + year, IC.chart);
    html += `<div class="dc-body">`;
    html += maxM > 0
      ? `<div class="mcv-chart">` + parMois.map((v, i) => `
          <div class="mcv-chart-c" title="${MOIS[i]} : ${v} jour${v > 1 ? 's' : ''}">
            <span class="mcv-chart-n">${v || ''}</span>
            <span class="mcv-chart-b" style="height:${maxM ? Math.max(3, Math.round(v / maxM * 100)) : 3}%"></span>
            <span class="mcv-chart-l">${MOIS_C[i].slice(0, 1)}</span>
          </div>`).join('') + `</div>`
      : `<div class="v2-blk-vide">Aucun congé accepté cette année.</div>`;
    html += `</div></div>`;

    /* Répartition par type */
    const parType = {};
    cache.filter(c => c.statut === 'accepte' && c.debut && new Date(c.debut).getFullYear() === year)
      .forEach(c => { parType[c.type || 'autre'] = (parType[c.type || 'autre'] || 0) + jours(c); });
    const types = Object.keys(parType).sort((a, b) => parType[b] - parType[a]);
    const totT = types.reduce((s2, t) => s2 + parType[t], 0);
    html += `<div class="dc-card">`;
    html += dcHead('#a855f7', 'Ventilation', 'Répartition par type', IC.layers);
    html += `<div class="dc-body">`;
    html += types.length
      ? types.map(t => {
          const col = MCV.typeColor(t);
          const pct = totT ? Math.round(parType[t] / totT * 100) : 0;
          return `<div class="mcv-rep">
            <div class="mcv-rep-h"><span class="mcv-dot" style="background:${col}"></span>
              <span class="mcv-rep-l">${esc(MCV.typeLabel(t))}</span>
              <span class="mcv-rep-v">${parType[t]} j</span></div>
            <div class="al-prog-bar"><span style="width:${pct}%;background:${col}"></span></div>
          </div>`;
        }).join('')
      : `<div class="v2-blk-vide">Aucun congé accepté cette année.</div>`;
    html += `</div></div>`;

    el.innerHTML = html;
  }

  /* ── Bas de page : calendrier + suivi ───────────────────────────────── */
  function renderBas(cache, fiche, year) {
    const el = document.getElementById('mcBottom');
    if (!el) return;

    /* Calendrier du mois courant */
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    const nb = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let d = 1; d <= nb; d++) {
      const key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const hit = cache.find(c => c.debut && c.fin && key >= c.debut && key <= c.fin);
      const dow = new Date(y, m, d).getDay();
      cells.push({
        d, key, we: dow === 0 || dow === 6, hit,
        today: d === now.getDate()
      });
    }
    const typesVus = [];
    cells.forEach(c => { if (c.hit && typesVus.indexOf(c.hit.type) === -1) typesVus.push(c.hit.type); });

    const legHtml = `<span class="mcv-leg">${typesVus.length
      ? typesVus.map(t => `<span class="mcv-leg-i"><span class="mcv-leg-c" style="background:${MCV.typeColor(t)}"></span>${esc(MCV.typeLabel(t))}</span>`).join('')
      : ''}</span>`;
    let html = `<div class="dc-card" style="min-width:0">` +
      dcHead('#f59e0b', 'Planning', 'Mon calendrier — ' + MOIS[m] + ' ' + y, IC.cal, legHtml) +
      `<div class="dc-body"><div class="mcv-scroll"><div class="mcv-cal">` +
      cells.map(c => {
        const col = c.hit ? MCV.typeColor(c.hit.type) : '';
        const att = c.hit && c.hit.statut === 'en_attente';
        const ref = c.hit && c.hit.statut === 'refuse';
        const bg = c.hit && !ref ? (att ? col + '33' : col) : 'rgba(255,255,255,.05)';
        const fg = c.hit && !ref && !att ? '#0a1728'
          : (att ? col : (c.we ? '#5f7a9c' : '#9fb2ce'));
        const t = c.hit ? MCV.typeLabel(c.hit.type) + ' — ' + (ST[c.hit.statut] || ST.en_attente).l : '';
        return `<span class="mcv-cal-d${c.today ? ' now' : ''}${ref ? ' ko' : ''}"
          title="${esc(c.d + ' ' + MOIS[m] + (t ? ' · ' + t : ''))}"
          style="background:${bg};color:${fg}${att ? ';border-color:' + col : ''}">${c.d}</span>`;
      }).join('') +
      `</div></div></div></div>`;

    /* Suivi de la dernière demande */
    const derniere = [...cache].sort((a, b) =>
      String(b.dateDemande || '').localeCompare(String(a.dateDemande || '')))[0];
    html += `<div class="dc-card" style="min-width:0">`;
    html += dcHead('#6366f1', 'Suivi', 'Suivi de ma dernière demande', IC.route);
    html += `<div class="dc-body">`;
    if (!derniere) {
      html += `<div class="v2-blk-vide">Aucune demande déposée.</div>`;
    } else {
      const st = ST[derniere.statut] || ST.en_attente;
      const steps = [
        { t: 'Demande déposée', w: (fiche ? `${fiche.prenom || ''} ${fiche.nom || ''}`.trim() : 'Moi'),
          d: derniere.dateDemande ? fdate(derniere.dateDemande) : '—', c: '#10b981', i: IC.check },
        derniere.statut === 'en_attente'
          ? { t: 'Décision', w: 'En attente', d: '—', c: '#f59e0b', i: IC.hourglass }
          : { t: 'Décision — ' + st.l, w: derniere.traitePar || 'Direction',
              d: derniere.dateTraitement ? fdate(derniere.dateTraitement) : '—',
              c: st.c, i: derniere.statut === 'accepte' ? IC.check : IC.cross }
      ];
      html += `<div class="mcv-wf-sub">${esc(MCV.typeLabel(derniere.type))} · ${esc(fdate(derniere.debut))} → ${esc(fdate(derniere.fin))}</div>`;
      html += steps.map((s, i) => `
        <div class="mcv-wf">
          <div class="mcv-wf-rail">
            <span class="mcv-wf-dot" style="background:${s.c}">${svg(s.i, 2.6)}</span>
            ${i < steps.length - 1 ? '<span class="mcv-wf-bar"></span>' : ''}
          </div>
          <div class="mcv-wf-b">
            <div class="mcv-wf-t">${esc(s.t)}</div>
            <div class="mcv-wf-s">${esc(s.w)} · ${esc(s.d)}</div>
          </div>
        </div>`).join('');
      if (derniere.statut === 'refuse' && derniere.reponseMotif) {
        html += `<div class="v2-note v2-note-err" style="margin-top:6px">${svg(IC.cross)}<span>${esc(derniere.reponseMotif)}</span></div>`;
      }
    }
    html += `</div></div>`;

    el.innerHTML = html;
  }

  /* ── Segmenté « Type » de la modale ─────────────────────────────────── */
  MCV.pickType = function (t) {
    const sel = document.getElementById('mcType');
    if (sel) sel.value = t;
    MCV.syncSeg();
    if (typeof mcModalSync === 'function') mcModalSync();
  };
  MCV.syncSeg = function () {
    const sel = document.getElementById('mcType');
    const v = sel ? sel.value : 'cp';
    document.querySelectorAll('#mcSeg .v2-seg-o').forEach(b => {
      b.classList.toggle('on', b.dataset.t === v);
    });
  };

  /* Récapitulatif « n jours » sous les dates de la modale */
  MCV.syncDuree = function () {
    const box = document.getElementById('mcDuree');
    if (!box) return;
    const d = (document.getElementById('mcDebut') || {}).value;
    const f = (document.getElementById('mcFin') || {}).value;
    if (!d || !f) { box.className = 'v2-note v2-note-warn'; box.innerHTML = svg(IC.clock) + '<span>Choisissez une date de début et de fin.</span>'; return; }
    if (d > f) { box.className = 'v2-note v2-note-err'; box.innerHTML = svg(IC.cross) + '<span>La date de fin doit être après la date de début.</span>'; return; }
    const j = Math.ceil((new Date(f) - new Date(d)) / 86400000) + 1;
    box.className = 'v2-note v2-note-ok';
    box.innerHTML = svg(IC.check) + '<span>' + j + ' jour' + (j > 1 ? 's' : '') + ' calendaire' + (j > 1 ? 's' : '') + ' demandé' + (j > 1 ? 's' : '') + '.</span>';
  };
})();
