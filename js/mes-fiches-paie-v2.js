// ══════════════════════════════════════════════════════════════════════
// INTERNALIS — « Mes fiches de paie » : rendu V2 (bento sombre)
// Ne touche pas à la couche Supabase : consomme _mfpCache / _mfpFiche
// remplis par le script de la page, et sbGetFichesPaie/sbJustificatifUrl.
// ══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const MOIS_C = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const SQL_FILE = 'migration-mes-fiches-paie.sql';

  const esc = s => (typeof escHtml === 'function' ? escHtml(s) : String(s ?? ''));
  const mask = (v, extra) => (typeof moneyMask === 'function' ? moneyMask(v, extra) : esc(v));
  const eur = n => Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' €';

  const IC = {
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    sum: '<path d="M18 4H6l7 8-7 8h12"/>',
    stack: '<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/>',
    chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>'
  };
  const svg = (p, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${w ? ` style="width:${w}px;height:${w}px"` : ''}>${p}</svg>`;

  // ── Calculs ─────────────────────────────────────────────────────────
  function tauxCotis() {
    try { return JSON.parse(localStorage.getItem('ftr_paie_majoration') || '{}').tauxCotisations ?? 22; }
    catch { return 22; }
  }
  function detail(f) {
    const tx = tauxCotis();
    const assiette = (Number(f.brut) || 0) + (Number(f.primes) || 0) + (Number(f.heuresSup) || 0);
    const cotis = assiette * tx / 100;
    const ret = Number(f.retenues) || 0;
    const net = assiette ? (assiette - cotis - ret) : (Number(f.net) || 0);
    return { tx, assiette, cotis, ret, net };
  }
  function fmtPeriode(p) {
    if (!p) return '';
    const [y, m] = String(p).split('-');
    return `${MOIS[parseInt(m, 10) - 1] || m} ${y}`;
  }
  function annees(cache) {
    return [...new Set(cache.map(f => (f.periode || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  }

  // ── Demandes d'attestation (table optionnelle) ──────────────────────
  let _demandes = [];
  let _tableAbsente = false;

  function estTableAbsente(e) {
    const c = String(e?.code || '');
    const m = String(e?.message || '');
    return c === '42P01' || c === 'PGRST205' || /does not exist|schema cache/i.test(m);
  }

  async function chargerDemandes() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) { _demandes = []; return; }
    try {
      const { data, error } = await supabaseClient
        .from('attestations_salaire').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      _demandes = data || [];
      _tableAbsente = false;
    } catch (e) {
      _demandes = [];
      if (estTableAbsente(e)) {
        _tableAbsente = true;
        console.warn(`[mes-fiches-paie] Table "attestations_salaire" absente — exécuter ${SQL_FILE}. Lecture vide.`);
      } else {
        console.warn('[mes-fiches-paie] Lecture attestations impossible', e);
      }
    }
  }

  async function envoyerDemande(payload) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('offline');
    const etablissementId = await sbGetEtablissementId();
    const { data: u } = await supabaseClient.auth.getUser();
    const row = {
      etablissement_id: etablissementId,
      profile_id: u?.user?.id || null,
      employe_id: String(window._mfpFiche?.id || ''),
      employe_nom: `${window._mfpFiche?.prenom || ''} ${window._mfpFiche?.nom || ''}`.trim(),
      motif: payload.motif,
      periode_debut: payload.debut || null,
      periode_fin: payload.fin || null,
      commentaire: payload.commentaire || '',
      statut: 'demandee'
    };
    const { data, error } = await supabaseClient.from('attestations_salaire').insert(row).select();
    if (error) throw error;
    return (data || [])[0];
  }

  // ── Rendu ───────────────────────────────────────────────────────────
  function scope() {
    const cache = Array.isArray(window._mfpCache) ? window._mfpCache : [];
    const sel = document.getElementById('mfpAnnee');
    const annee = sel ? sel.value : '';
    let list = cache.filter(f => !annee || (f.periode || '').slice(0, 4) === annee);
    list.sort((a, b) => (b.periode || '').localeCompare(a.periode || ''));
    return { cache, annee, list };
  }

  function renderChips(cache, annee) {
    const box = document.getElementById('mfpChips');
    if (!box) return;
    const opts = [{ v: '', l: 'Toutes' }].concat(annees(cache).map(a => ({ v: a, l: a })));
    box.innerHTML = opts.map(o =>
      `<button type="button" class="v2-chip-f${o.v === annee ? ' on' : ''}" data-annee="${esc(o.v)}">${esc(o.l)}</button>`
    ).join('');
  }

  function renderStats(list, annee) {
    const box = document.getElementById('mfpStats');
    if (!box) return;
    const nets = list.map(f => detail(f).net).filter(n => n > 0);
    const cumul = nets.reduce((a, b) => a + b, 0);
    const dernier = list.length ? detail(list[0]).net : 0;
    const moyen = nets.length ? cumul / nets.length : 0;
    const suffixe = annee || 'toutes années';
    const tuiles = [
      { n: nets.length ? mask(eur(dernier)) : '—', lbl: 'Dernier net', sub: nets.length ? 'Bulletin le plus récent' : 'Aucun bulletin', c: '#10b981', ico: IC.wallet },
      { n: nets.length ? mask(eur(moyen)) : '—', lbl: 'Net moyen', sub: nets.length ? `Sur ${nets.length} bulletin${nets.length > 1 ? 's' : ''}` : '—', c: '#22d3ee', ico: IC.trend },
      { n: nets.length ? mask(eur(cumul)) : '—', lbl: 'Cumul net', sub: suffixe, c: '#818cf8', ico: IC.sum },
      { n: String(list.length), lbl: 'Bulletins', sub: suffixe, c: '#f59e0b', ico: IC.stack }
    ];
    box.innerHTML = tuiles.map(t => `<div class="dc-kpi" style="--dc-c:${t.c}">
      <div class="dc-kpi-top"><span class="dc-kpi-label">${esc(t.lbl)}</span><span class="dc-kpi-ico" style="color:${t.c}">${svg(t.ico, 15)}</span></div>
      <div class="dc-kpi-val">${t.n}</div>
      <div class="dc-kpi-sub">${esc(t.sub)}</div>
    </div>`).join('');
  }

  function carte(f) {
    const d = detail(f);
    const minis = [];
    if (f.brut) minis.push({ v: mask(eur(f.brut)), l: 'Brut', c: '#818cf8' });
    if (f.primes) minis.push({ v: mask(eur(f.primes)), l: 'Primes', c: '#f59e0b' });
    if (f.heuresSup) minis.push({ v: mask(eur(f.heuresSup)), l: 'H. sup.', c: '#22d3ee' });
    if (d.cotis) minis.push({ v: mask('-' + eur(d.cotis)), l: `Cotis. ${d.tx}%`, c: '#f87171' });
    if (d.ret) minis.push({ v: mask('-' + eur(d.ret)), l: 'Retenues', c: '#f87171' });

    return `<article class="dc-card mfp-bul">
      <div class="dc-head">
        <div class="dc-head-l">
          <span class="dc-chip" style="background:rgba(129,140,248,.14);color:#818cf8">${svg(IC.doc, 16)}</span>
          <div style="min-width:0">
            <div class="dc-eyebrow">Bulletin</div>
            <div class="dc-title">${esc(fmtPeriode(f.periode))}</div>
          </div>
        </div>
        ${f.fichierNom ? `<span class="dc-pill dim" title="${esc(f.fichierNom)}">${svg(IC.doc, 12)}</span>` : ''}
      </div>
      <div class="dc-body">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">
          <span class="dc-eyebrow" style="margin-bottom:0">${d.net > 0 ? 'Net estimé' : 'Net'}</span>
          ${d.net > 0
            ? `<span class="v2-num" style="font-size:22px;font-weight:700;color:#34d399">${mask(d.net.toFixed(2).replace('.', ',') + ' €', 'lead')}</span>`
            : `<span class="dc-badge dc-b-gray"><span class="d"></span>Bulletin déposé</span>`}
        </div>
        ${minis.length ? `<div style="display:grid;gap:6px;margin-top:12px">${minis.map(m =>
          `<div style="display:flex;align-items:center;justify-content:space-between;border-left:3px solid ${m.c};padding-left:9px">
            <span class="dc-eyebrow" style="margin-bottom:0">${esc(m.l)}</span>
            <span class="v2-num" style="font-size:13px;color:var(--v2-t3)">${m.v}</span>
          </div>`).join('')}</div>` : ''}
        ${f.fichierPath
          ? `<button type="button" class="mfp-dl" data-dl="${esc(f.id)}" style="margin-top:14px">${svg(IC.dl)}Télécharger</button>`
          : `<div class="mfp-nofile" style="margin-top:14px">Aucun fichier joint</div>`}
      </div>
    </article>`;
  }

  function renderListe(list) {
    const el = document.getElementById('mfpList');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="mfp-vide">
        <div class="mfp-vide-ico">${svg(IC.doc)}</div>
        <div class="mfp-vide-t">Aucun bulletin</div>
        <div class="mfp-vide-s">Vos fiches de paie apparaîtront ici une fois déposées par votre employeur.</div>
      </div>`;
      return;
    }
    el.innerHTML = `<div class="mfp-grid">${list.map(carte).join('')}</div>`;
  }

  function renderRail(list, annee) {
    const rail = document.getElementById('mfpRail');
    if (!rail) return;
    const chrono = [...list].sort((a, b) => (a.periode || '').localeCompare(b.periode || '')).slice(-6);
    const vals = chrono.map(f => detail(f).net);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, max);
    const bas = min * 0.94;
    const evo = chrono.length
      ? `<div class="mfp-ev">${chrono.map((f, i) => {
          const h = max > bas ? Math.max(6, Math.round((vals[i] - bas) / (max - bas) * 100)) : 100;
          const m = parseInt((f.periode || '').slice(5, 7), 10);
          return `<div class="mfp-ev-c" title="${esc(fmtPeriode(f.periode))}">
            <div class="mfp-ev-b" style="height:${h}%"></div>
            <div class="mfp-ev-l">${esc(MOIS_C[m - 1] || '')}</div>
          </div>`;
        }).join('')}</div>`
      : `<div class="v2-blk-vide">Aucun bulletin sur la période.</div>`;

    let brut = 0, primes = 0, hs = 0, cot = 0, ret = 0, net = 0;
    list.forEach(f => {
      const d = detail(f);
      brut += Number(f.brut) || 0; primes += Number(f.primes) || 0; hs += Number(f.heuresSup) || 0;
      cot += d.cotis; ret += d.ret; net += d.net;
    });
    const cumuls = [
      { l: 'Net cumulé', v: eur(net), c: '#34d399' },
      { l: 'Brut cumulé', v: eur(brut), c: '#818cf8' },
      { l: 'Primes cumulées', v: eur(primes), c: '#f59e0b' },
      { l: 'Heures sup. cumulées', v: eur(hs), c: '#22d3ee' },
      { l: `Cotisations estimées (${tauxCotis()} %)`, v: '-' + eur(cot), c: '#fca5a5' },
      { l: 'Retenues', v: '-' + eur(ret), c: '#fca5a5' }
    ].filter(c => c.l.startsWith('Net') || c.l.startsWith('Brut') || parseFloat(c.v.replace(/[^\d]/g, '')) > 0);

    const dem = _demandes.slice(0, 4);
    const demTon = st => st === 'traitee' ? 'dc-b-green' : st === 'refusee' ? 'dc-b-red' : 'dc-b-amber';

    rail.innerHTML = `
      <div class="dc-card v2-rail-blk">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:rgba(52,211,153,.14);color:#34d399">${svg(IC.chart, 16)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">6 derniers mois</div><div class="dc-title">Évolution du net</div></div>
          </div>
        </div>
        <div class="dc-body">${evo}</div>
      </div>
      <div class="dc-card v2-rail-blk">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:rgba(129,140,248,.14);color:#818cf8">${svg(IC.sum, 16)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">Cumuls</div><div class="dc-title">${esc(annee || 'Toutes années')}</div></div>
          </div>
        </div>
        <div class="dc-body">
        ${list.length
          ? cumuls.map(c => `<div class="mfp-cum" style="--pc:${c.c};display:flex;align-items:center;justify-content:space-between;border-left:3px solid ${c.c};padding-left:10px"><span class="mfp-cum-l">${esc(c.l)}</span><span class="mfp-cum-v v2-num">${mask(c.v)}</span></div>`).join('')
          : '<div class="v2-blk-vide">Aucun bulletin sur la période.</div>'}
        </div>
      </div>
      <button type="button" class="mfp-att" id="mfpBtnAttestation">
        <span class="mfp-att-ico">${svg(IC.card)}</span>
        <span class="mfp-att-txt">
          <span class="mfp-att-t">Attestation employeur</span>
          <span class="mfp-att-s">Demander une attestation de salaire</span>
        </span>
      </button>
      ${dem.length ? `<div class="dc-card v2-rail-blk">
        <div class="dc-head">
          <div class="dc-head-l">
            <span class="dc-chip" style="background:rgba(34,211,238,.16);color:#22d3ee">${svg(IC.card, 16)}</span>
            <div style="min-width:0"><div class="dc-eyebrow">Suivi</div><div class="dc-title">Mes demandes</div></div>
          </div>
          <span class="dc-pill dim">${dem.length}</span>
        </div>
        <div class="dc-body" style="display:grid;gap:10px">
        ${dem.map(d => `<div class="mfp-dem">
          <div style="min-width:0">
            <div class="mfp-dem-t">${esc(d.motif || 'Attestation')}</div>
            <div class="mfp-dem-s">${esc((d.created_at || '').slice(0, 10))}${d.periode_debut ? ' · ' + esc(d.periode_debut) + (d.periode_fin ? ' → ' + esc(d.periode_fin) : '') : ''}</div>
          </div>
          <span class="mfp-dem-b dc-badge ${demTon(d.statut)}"><span class="d"></span>${esc(d.statut || 'demandee')}</span>
        </div>`).join('')}
        </div>
      </div>` : ''}
    `;
  }

  function render() {
    const { cache, annee, list } = scope();
    renderChips(cache, annee);
    renderStats(list, annee);
    renderListe(list);
    renderRail(list, annee);
  }

  // ── Modale de demande d'attestation ─────────────────────────────────
  let _motif = 'Attestation de salaire';

  function ouvrirAttestation() {
    if (!window._mfpFiche) { toast('Votre compte n\'est pas relié à une fiche salarié', 'error'); return; }
    _motif = 'Attestation de salaire';
    document.querySelectorAll('#mfpAttSeg .v2-seg-o').forEach(b => b.classList.toggle('on', b.dataset.motif === _motif));
    const per = (window._mfpCache || []).map(f => f.periode).filter(Boolean).sort();
    const d = document.getElementById('mfpAttDebut');
    const f = document.getElementById('mfpAttFin');
    if (d) d.value = per[0] || '';
    if (f) f.value = per[per.length - 1] || '';
    const c = document.getElementById('mfpAttCom');
    if (c) c.value = '';
    const note = document.getElementById('mfpAttNote');
    if (note) note.hidden = !_tableAbsente;
    openModal('modalAttestation');
  }

  async function soumettreAttestation() {
    const debut = document.getElementById('mfpAttDebut')?.value || '';
    const fin = document.getElementById('mfpAttFin')?.value || '';
    const commentaire = document.getElementById('mfpAttCom')?.value || '';
    const btn = document.getElementById('mfpAttSubmit');
    if (btn) btn.disabled = true;
    try {
      await envoyerDemande({ motif: _motif, debut, fin, commentaire });
      closeModal('modalAttestation');
      toast('Demande envoyée à l\'administration');
      await chargerDemandes();
      render();
    } catch (e) {
      if (estTableAbsente(e)) {
        _tableAbsente = true;
        console.warn(`[mes-fiches-paie] Écriture impossible : table "attestations_salaire" absente (${SQL_FILE})`, e);
        toast(`Demandes d'attestation indisponibles : exécuter ${SQL_FILE}`, 'error');
      } else {
        console.error('[mes-fiches-paie] envoi attestation', e);
        toast('Envoi impossible : ' + (e?.message || e), 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ── Câblage ─────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const chip = e.target.closest('#mfpChips .v2-chip-f');
    if (chip) {
      const sel = document.getElementById('mfpAnnee');
      if (sel) { sel.value = chip.dataset.annee || ''; }
      if (typeof renderMesFichesPaie === 'function') renderMesFichesPaie(); else render();
      return;
    }
    const dl = e.target.closest('[data-dl]');
    if (dl) { if (typeof mfpDownload === 'function') mfpDownload(dl.dataset.dl); return; }
    if (e.target.closest('#mfpBtnAttestation')) { ouvrirAttestation(); return; }
    const seg = e.target.closest('#mfpAttSeg .v2-seg-o');
    if (seg) {
      _motif = seg.dataset.motif;
      document.querySelectorAll('#mfpAttSeg .v2-seg-o').forEach(b => b.classList.toggle('on', b === seg));
    }
  });

  window.MFPV2 = {
    render,
    chargerDemandes,
    soumettreAttestation,
    ouvrirAttestation,
    infoBloc(titre, texte, couleur) {
      const el = document.getElementById('mfpInfo');
      if (!el) return;
      const c = couleur || '#f59e0b';
      el.innerHTML = `<div class="dc-card mfp-info" style="--pc:${c};border-left:3px solid ${c}">
        <div class="dc-body" style="display:flex;gap:12px;align-items:flex-start">
          <span class="dc-chip" style="background:${c}22;color:${c}">${svg(couleur === '#ef4444' ? IC.warn : IC.info, 16)}</span>
          <div style="min-width:0"><div class="mfp-info-t">${esc(titre)}</div><div class="mfp-info-s">${esc(texte)}</div></div>
        </div>
      </div>`;
    }
  };
})();
