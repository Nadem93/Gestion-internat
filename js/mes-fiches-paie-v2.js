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
    warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
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
      { n: nets.length ? mask(eur(dernier)) : '—', l: 'Dernier net', c: '#10b981' },
      { n: nets.length ? mask(eur(moyen)) : '—', l: 'Net moyen', c: '#22d3ee' },
      { n: nets.length ? mask(eur(cumul)) : '—', l: 'Cumul net ' + suffixe, c: '#818cf8' },
      { n: String(list.length), l: 'Bulletins ' + suffixe, c: '#f59e0b' }
    ];
    box.innerHTML = tuiles.map(t => `<div class="mfp-stat" style="--pc:${t.c}">
      <div class="mfp-stat-bar"></div>
      <div class="mfp-stat-n">${t.n}</div>
      <div class="mfp-stat-l">${esc(t.l)}</div>
    </div>`).join('');
  }

  function carte(f) {
    const d = detail(f);
    const minis = [];
    if (f.brut) minis.push({ v: mask(eur(f.brut)), l: 'Brut', c: '' });
    if (f.primes) minis.push({ v: mask(eur(f.primes)), l: 'Primes', c: 'warn' });
    if (f.heuresSup) minis.push({ v: mask(eur(f.heuresSup)), l: 'H. sup.', c: '' });
    if (d.cotis) minis.push({ v: mask('-' + eur(d.cotis)), l: `Cotis. ${d.tx}%`, c: 'neg' });
    if (d.ret) minis.push({ v: mask('-' + eur(d.ret)), l: 'Retenues', c: 'neg' });

    return `<article class="pyx-card mfp-bul">
      <div class="mfp-bul-h">
        <span class="mfp-bul-ico">${svg(IC.doc)}</span>
        <div class="mfp-bul-ht">
          <div class="mfp-bul-per">${esc(fmtPeriode(f.periode))}</div>
          <div class="mfp-bul-file">${f.fichierNom ? esc(f.fichierNom) : 'Sans fichier joint'}</div>
        </div>
      </div>
      ${d.net > 0
        ? `<div class="mfp-net"><div class="mfp-net-l">Net estimé</div><div class="mfp-net-v">${mask(d.net.toFixed(2).replace('.', ',') + ' €', 'lead')}</div></div>`
        : `<div class="mfp-net"><div class="mfp-net-l">Net</div><div class="mfp-net-v" style="font-size:14px;color:var(--v2-t6)">Bulletin déposé</div></div>`}
      ${minis.length ? `<div class="mfp-mini">${minis.map(m =>
        `<div class="mfp-mini-c"><div class="mfp-mini-v ${m.c}">${m.v}</div><div class="mfp-mini-l">${esc(m.l)}</div></div>`).join('')}</div>` : ''}
      ${f.fichierPath
        ? `<button type="button" class="mfp-dl" data-dl="${esc(f.id)}">${svg(IC.dl)}Télécharger</button>`
        : `<div class="mfp-nofile">Aucun fichier joint</div>`}
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

    rail.innerHTML = `
      <div class="v2-blk v2-rail-blk">
        <div class="v2-blk-h"><div class="v2-blk-t">Évolution du net (6 derniers)</div></div>
        ${evo}
      </div>
      <div class="v2-blk v2-rail-blk">
        <div class="v2-blk-h"><div class="v2-blk-t">Cumuls ${esc(annee || 'toutes années')}</div></div>
        ${list.length
          ? cumuls.map(c => `<div class="mfp-cum" style="--pc:${c.c}"><span class="mfp-cum-l">${esc(c.l)}</span><span class="mfp-cum-v">${mask(c.v)}</span></div>`).join('')
          : '<div class="v2-blk-vide">Aucun bulletin sur la période.</div>'}
      </div>
      <button type="button" class="mfp-att" id="mfpBtnAttestation">
        <span class="mfp-att-ico">${svg(IC.card)}</span>
        <span class="mfp-att-txt">
          <span class="mfp-att-t">Attestation employeur</span>
          <span class="mfp-att-s">Demander une attestation de salaire</span>
        </span>
      </button>
      ${dem.length ? `<div class="v2-blk v2-rail-blk">
        <div class="v2-blk-h"><div class="v2-blk-t">Mes demandes</div></div>
        ${dem.map(d => `<div class="mfp-dem">
          <div style="min-width:0">
            <div class="mfp-dem-t">${esc(d.motif || 'Attestation')}</div>
            <div class="mfp-dem-s">${esc((d.created_at || '').slice(0, 10))}${d.periode_debut ? ' · ' + esc(d.periode_debut) + (d.periode_fin ? ' → ' + esc(d.periode_fin) : '') : ''}</div>
          </div>
          <span class="mfp-dem-b v2-badge ${d.statut === 'traitee' ? 'v2-b-ok' : d.statut === 'refusee' ? 'v2-b-danger' : 'v2-b-warn'}">${esc(d.statut || 'demandee')}</span>
        </div>`).join('')}
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
      el.innerHTML = `<div class="mfp-info" style="--pc:${couleur || '#f59e0b'}">
        <span class="mfp-info-ico">${svg(couleur === '#ef4444' ? IC.warn : IC.info)}</span>
        <div><div class="mfp-info-t">${esc(titre)}</div><div class="mfp-info-s">${esc(texte)}</div></div>
      </div>`;
    }
  };
})();
