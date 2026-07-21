/* ══════════════════════════════════════════════════════════════════════
   DEMANDES DE CONGÉS (RH) — rendu V2
   Maquette : « Demandes congés (RH).dc.html »

   Ce module ne fait QUE du rendu et de la dérivation. Les lectures/écritures
   Supabase restent dans js/conges-supabase.js et js/employes-supabase.js ;
   les actions (accepter, refuser, supprimer, enregistrer) restent dans
   js/conges.js.

   Sources de données
   ─────────────────
   · conges          → demandes (existant)
   · employes        → identité, poste, date d'embauche (existant)
   · conges_soldes   → soldes & compteurs   (migration-mes-conges.sql)
   · conges_regles   → règles & quotas      (migration-conges.sql)

   Dégradation douce : une table absente ⇒ lecture vide + console.warn, la
   page reste utilisable et le bloc concerné affiche un état vide explicite.
   AUCUNE valeur n'est jamais inventée.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CGV = window.CGV = window.CGV || {};

  /* ── Utilitaires ─────────────────────────────────────────────────── */
  const esc = s => (typeof escHtml === 'function' ? escHtml(s == null ? '' : s) : String(s == null ? '' : s));
  const PALETTE = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];

  function couleur(id) {
    const s = String(id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  function initiales(nom) {
    const p = String(nom || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] || '' : '')).toUpperCase();
  }
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
  const AUJ = ymd(new Date());

  const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_L = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  function jourMois(s) {
    if (!s || s.length < 10) return '—';
    return parseInt(s.slice(8, 10), 10) + ' ' + (MOIS_C[parseInt(s.slice(5, 7), 10) - 1] || '');
  }
  function periode(d) {
    if (!d.debut) return '—';
    if (!d.fin || d.fin === d.debut) return jourMois(d.debut) + ' ' + d.debut.slice(0, 4);
    const memeAnnee = d.debut.slice(0, 4) === d.fin.slice(0, 4);
    return jourMois(d.debut) + (memeAnnee ? '' : ' ' + d.debut.slice(0, 4)) +
      ' – ' + jourMois(d.fin) + ' ' + d.fin.slice(0, 4);
  }
  const dateCourte = s => (s && s.length >= 10) ? s.slice(8, 10) + '/' + s.slice(5, 7) : '—';

  // Jours ouvrés (lundi→vendredi) bornes incluses. Dérivation, pas d'invention.
  function joursOuvres(debut, fin) {
    if (!debut || !fin || fin < debut) return 0;
    let n = 0;
    const cur = new Date(debut + 'T12:00:00');
    const stop = new Date(fin + 'T12:00:00');
    while (cur <= stop) {
      const j = cur.getDay();
      if (j !== 0 && j !== 6) n++;
      cur.setDate(cur.getDate() + 1);
    }
    return n;
  }
  CGV.joursOuvres = joursOuvres;

  const nbFr = v => {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (!isFinite(n)) return null;
    return (Math.round(n * 100) / 100).toString().replace('.', ',');
  };

  const typeLabel = t => (typeof CONGE_TYPE_META !== 'undefined' && CONGE_TYPE_META[t])
    ? CONGE_TYPE_META[t].label : (t || 'Autre');
  const typeColor = t => (typeof CONGE_TYPE_META !== 'undefined' && CONGE_TYPE_META[t])
    ? CONGE_TYPE_META[t].color : '#64748b';
  CGV.typeColor = typeColor;

  const ICO = {
    hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    cross: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/>',
    warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    spark: '<path d="M12 2v4M12 18v4M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/><circle cx="12" cy="12" r="4"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
  };
  const svg = (p, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
    (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';

  const av = (nom, id, cls) => '<span class="cgv-av ' + (cls || '') + '" style="background:' +
    couleur(id) + '">' + esc(initiales(nom)) + '</span>';

  /* ── État ────────────────────────────────────────────────────────── */
  CGV.soldes = [];          // lignes conges_soldes
  CGV.soldesDispo = true;
  CGV.regles = [];          // lignes conges_regles
  CGV.reglesDispo = true;
  CGV.calMois = null;       // {y, m} du calendrier d'équipe
  CGV.wfId = null;          // demande affichée dans le workflow

  /* ══ Chargements optionnels (dégradation douce) ═══════════════════ */
  CGV.loadSoldes = async function () {
    CGV.soldes = [];
    if (typeof supabaseClient === 'undefined') { CGV.soldesDispo = false; return; }
    try {
      const { data, error } = await supabaseClient
        .from('conges_soldes').select('*').order('annee', { ascending: false });
      if (error) throw error;
      CGV.soldesDispo = true;
      // Une seule ligne par salarié : la plus récente.
      const vus = new Set();
      CGV.soldes = (data || []).filter(r => {
        const k = String(r.employe_id);
        if (vus.has(k)) return false;
        vus.add(k); return true;
      });
    } catch (e) {
      CGV.soldesDispo = false;
      CGV.soldes = [];
      console.warn('[conges-v2] Soldes et compteurs indisponibles (table conges_soldes absente ?) ' +
        '— exécutez migration-mes-conges.sql.', e);
    }
  };

  CGV.loadRegles = async function () {
    CGV.regles = [];
    if (typeof supabaseClient === 'undefined') { CGV.reglesDispo = false; return; }
    try {
      const { data, error } = await supabaseClient
        .from('conges_regles').select('*').eq('actif', true).order('ordre', { ascending: true });
      if (error) throw error;
      CGV.reglesDispo = true;
      CGV.regles = data || [];
    } catch (e) {
      CGV.reglesDispo = false;
      CGV.regles = [];
      console.warn('[conges-v2] Règles & quotas indisponibles (table conges_regles absente ?) ' +
        '— exécutez migration-conges.sql.', e);
    }
  };

  const regle = code => CGV.regles.find(r => r.code === code) || null;

  /* ══ Dérivations ══════════════════════════════════════════════════ */

  // Occupation : pour chaque jour, la liste des demandes ACCEPTÉES en cours.
  function absencesParJour(list) {
    const map = new Map();
    list.filter(d => d.statut === 'accepte' && d.debut && d.fin).forEach(d => {
      const cur = new Date(d.debut + 'T12:00:00');
      const stop = new Date(d.fin + 'T12:00:00');
      let garde = 0;
      while (cur <= stop && garde++ < 400) {
        const k = ymd(cur);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(d);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }

  // Jours de sous-effectif d'une demande : seulement si la règle existe.
  function joursConflit(d, parJour, max) {
    if (max == null || !d.debut || !d.fin) return [];
    const out = [];
    const cur = new Date(d.debut + 'T12:00:00');
    const stop = new Date(d.fin + 'T12:00:00');
    let garde = 0;
    while (cur <= stop && garde++ < 400) {
      const k = ymd(cur);
      const deja = (parJour.get(k) || []).filter(x => x.id !== d.id).length;
      if (deja + 1 > max) out.push(k);
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  /* ══ RENDU ════════════════════════════════════════════════════════ */
  CGV.render = function () {
    const list = Array.isArray(window._cgCache) ? window._cgCache : [];
    const employes = Array.isArray(window._cgEmployesCache) ? window._cgEmployesCache : [];
    const isAdmin = (typeof Auth !== 'undefined') && Auth.isAdmin();

    const empById = new Map(employes.map(e => [String(e.id), e]));
    const nomDe = d => {
      const e = empById.get(String(d.employeId));
      return e ? `${e.prenom || ''} ${e.nom || ''}`.trim() : (d.employeNom || 'Salarié');
    };

    const parJour = absencesParJour(list);
    const rMax = regle('max_absents_simultanes');
    const maxAbsents = (rMax && rMax.valeur != null) ? Number(rMax.valeur) : null;

    const enAttente = list.filter(d => d.statut === 'en_attente')
      .sort((a, b) => (a.debut || '').localeCompare(b.debut || ''));
    const conflitsPar = new Map();
    enAttente.forEach(d => conflitsPar.set(d.id, joursConflit(d, parJour, maxAbsents)));

    renderKpis(list, enAttente, parJour, maxAbsents, conflitsPar);
    renderFiltres(list);
    renderPending(enAttente, conflitsPar, nomDe, empById, isAdmin);
    renderTraitees(list, nomDe, isAdmin);
    renderRail(list, employes, nomDe, parJour, isAdmin);
    renderFeatures(list, employes, nomDe, isAdmin);
  };

  /* ── KPI ─────────────────────────────────────────────────────────── */
  function renderKpis(list, enAttente, parJour, maxAbsents, conflitsPar) {
    const acceptes = list.filter(d => d.statut === 'accepte').length;
    const refuses = list.filter(d => d.statut === 'refuse').length;
    const absentsAuj = (parJour.get(AUJ) || []).length;
    const nbConflits = maxAbsents == null
      ? null
      : [...conflitsPar.values()].filter(j => j.length).length;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('cgStatEnAttente', enAttente.length);
    set('cgStatAcceptes', acceptes);
    set('cgStatRefuses', refuses);
    set('cgStatAbsents', absentsAuj);
    set('cgStatConflits', nbConflits == null ? '—' : nbConflits);

    const cf = document.getElementById('cgKpiConflit');
    if (cf) {
      cf.title = maxAbsents == null
        ? "Aucune règle d'effectif enregistrée — exécutez migration-conges.sql pour activer la détection."
        : 'Demandes en attente dépassant le maximum de ' + maxAbsents + ' absent(s) simultané(s).';
    }
  }

  /* ── Filtres (chips statut + select salarié) ─────────────────────── */
  function renderFiltres(list) {
    const box = document.getElementById('cgChips');
    if (!box) return;
    const sel = document.getElementById('cgFiltreStatut');
    const courant = sel ? sel.value : '';
    const n = s => s ? list.filter(d => d.statut === s).length : list.length;
    const defs = [
      { v: '', l: 'Toutes', c: '#818cf8' },
      { v: 'en_attente', l: 'En attente', c: '#f59e0b' },
      { v: 'accepte', l: 'Acceptées', c: '#10b981' },
      { v: 'refuse', l: 'Refusées', c: '#ef4444' }
    ];
    box.innerHTML = defs.map(d =>
      '<button type="button" class="v2-chip-f' + (d.v === courant ? ' on' : '') +
      '" onclick="CGV.setStatut(\'' + d.v + '\')">' +
      '<span class="dot" style="background:' + d.c + '"></span>' + d.l +
      ' <span class="n">' + n(d.v) + '</span></button>'
    ).join('');
  }

  CGV.setStatut = function (v) {
    const sel = document.getElementById('cgFiltreStatut');
    if (sel) sel.value = v;
    if (typeof renderConges === 'function') renderConges();
  };

  /* ── En attente de validation ────────────────────────────────────── */
  function renderPending(enAttente, conflitsPar, nomDe, empById, isAdmin) {
    const carte = document.getElementById('cgPendingCard');
    const cible = document.getElementById('cgPendingList');
    if (!carte || !cible) return;

    // Contrôle d'accès inchangé : seuls les admins voient la file de validation.
    if (!isAdmin || !enAttente.length) {
      carte.style.display = 'none';
      cible.innerHTML = '';
      return;
    }
    carte.style.display = '';

    cible.innerHTML = '<div class="cgv-pend">' + enAttente.map(d => {
      const nom = nomDe(d);
      const e = empById.get(String(d.employeId));
      const conflits = conflitsPar.get(d.id) || [];
      const flag = conflits.length
        ? '<span class="cgv-flag" title="Dépassement du maximum d\'absents simultanés les : ' +
          esc(conflits.map(dateCourte).join(', ')) + '">' + svg(ICO.warn, 2.2) + 'Sous-effectif</span>'
        : '';
      const jo = joursOuvres(d.debut, d.fin);
      return '<div class="cgv-p">' +
        av(nom, d.employeId, 'lg') +
        '<div class="cgv-p-who"><div class="cgv-p-nom">' + esc(nom) + '</div>' +
          '<div class="cgv-p-fn">' + esc(e && e.poste ? e.poste : '—') + '</div></div>' +
        '<div class="cgv-p-per">' +
          '<div class="cgv-p-t">' + esc(typeLabel(d.type)) + ' · ' + jo + ' j ouvrés</div>' +
          '<div class="cgv-p-d">' + esc(periode(d)) + '</div>' +
          (d.motif ? '<div class="cgv-p-motif">« ' + esc(d.motif) + ' »</div>' : '') +
        '</div>' + flag +
        '<div class="cgv-p-acts">' +
          '<button type="button" class="cgv-ab ok" title="Accepter" onclick="repondreConge(\'' + d.id + '\',\'accepte\')">' + svg(ICO.check, 2.5) + '</button>' +
          '<button type="button" class="cgv-ab ko" title="Refuser" onclick="repondreConge(\'' + d.id + '\',\'refuse\')">' + svg(ICO.cross, 2.5) + '</button>' +
          '<button type="button" class="cgv-ab del" title="Voir le circuit de validation" onclick="CGV.voirWorkflow(\'' + d.id + '\')">' + svg(ICO.file, 2) + '</button>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  CGV.voirWorkflow = function (id) {
    CGV.wfId = id;
    if (typeof renderConges === 'function') renderConges();
    document.getElementById('cgWorkflow')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /* ── Demandes traitées ───────────────────────────────────────────── */
  function renderTraitees(list, nomDe, isAdmin) {
    const el = document.getElementById('cgList');
    if (!el) return;
    const fs = document.getElementById('cgFiltreStatut')?.value || '';
    const fe = document.getElementById('cgFiltreEmploye')?.value || '';

    let f = list;
    if (fs) f = f.filter(d => d.statut === fs);
    if (fe) f = f.filter(d => String(d.employeId) === String(fe));
    // Les demandes en attente sont déjà dans la file de validation (admin).
    if (isAdmin && fs !== 'en_attente') f = f.filter(d => d.statut !== 'en_attente');

    f = f.slice().sort((a, b) => (b.dateDemande || '').localeCompare(a.dateDemande || ''));

    const ST = {
      en_attente: { l: 'En attente', c: '#f59e0b', i: ICO.hourglass },
      accepte: { l: 'Validé', c: '#10b981', i: ICO.check },
      refuse: { l: 'Refusé', c: '#ef4444', i: ICO.cross }
    };

    if (!f.length) {
      el.innerHTML = '<div class="v2-blk"><div class="v2-blk-vide">' +
        (isAdmin ? 'Aucune demande traitée — voir « en attente de validation » ci-dessus.'
                 : 'Aucune demande à afficher.') + '</div></div>';
      return;
    }

    el.innerHTML = '<div class="v2-blk" style="padding:0;overflow:hidden"><div class="cgv-scroll">' +
      '<table class="cgv-tbl"><tbody>' + f.map(d => {
        const nom = nomDe(d);
        const st = ST[d.statut] || ST.en_attente;
        const jo = joursOuvres(d.debut, d.fin);
        const traite = d.traitePar ? 'traité par ' + esc(d.traitePar) : '';
        return '<tr>' +
          '<td><div class="cgv-cell">' + av(nom, d.employeId) +
            '<span class="c-nom">' + esc(nom) + '</span></div></td>' +
          '<td class="c-mid">' + esc(typeLabel(d.type)) + '</td>' +
          '<td class="c-dim">' + esc(periode(d)) + '</td>' +
          '<td class="c-dim">' + jo + ' j</td>' +
          '<td><span class="v2-badge" style="color:' + st.c + ';background:' + st.c + '1c" ' +
            (traite ? 'title="' + traite + '"' : '') + '>' + svg(st.i, 2.4) + esc(st.l) + '</span></td>' +
          '<td class="c-act">' + (isAdmin
            ? '<button type="button" class="cgv-ab del" title="Supprimer" onclick="supprimerConge(\'' + d.id + '\')">' + svg(ICO.trash, 2) + '</button>'
            : '') + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ── Rail droit ──────────────────────────────────────────────────── */
  function renderRail(list, employes, nomDe, parJour, isAdmin) {
    const rail = document.getElementById('cgRail');
    if (!rail) return;
    let html = '';

    /* Soldes d'équipe — données de paie : réservées aux admins. */
    if (isAdmin) {
      html += '<div class="v2-blk v2-rail-blk"><div class="v2-blk-h">' +
        '<span class="v2-blk-t">Soldes de congés (équipe)</span></div>';
      if (!CGV.soldesDispo) {
        html += '<div class="v2-blk-vide">Soldes indisponibles — la table <code>conges_soldes</code> ' +
          "n'existe pas encore (migration-mes-conges.sql).</div>";
      } else if (!CGV.soldes.length) {
        html += '<div class="v2-blk-vide">Aucun solde enregistré pour l\'équipe.</div>';
      } else {
        const lignes = CGV.soldes.map(s => {
          const e = employes.find(x => String(x.id) === String(s.employe_id));
          const nom = e ? `${e.prenom || ''} ${e.nom || ''}`.trim() : 'Salarié';
          const acquis = Number(s.cp_acquis || 0) + Number(s.cp_n1 || 0);
          const reste = acquis - Number(s.cp_pris || 0);
          return { nom, id: s.employe_id, reste, acquis };
        }).filter(x => isFinite(x.reste));
        const maxA = Math.max(1, ...lignes.map(l => l.acquis));
        html += '<div style="display:flex;flex-direction:column;gap:13px">' + lignes.map(l => {
          const pct = Math.max(0, Math.min(100, Math.round(l.reste / maxA * 100)));
          return '<div><div class="cgv-solde-h">' + av(l.nom, l.id, 'xs') +
            '<span class="cgv-solde-n">' + esc(l.nom) + '</span>' +
            '<span class="cgv-solde-v">' + nbFr(l.reste) + ' j</span></div>' +
            '<div class="v2-prog"><span style="width:' + pct + '%;background:' + couleur(l.id) + '"></span></div></div>';
        }).join('') + '</div>';
      }
      html += '</div>';
    }

    /* Absents actuellement — dérivé des demandes acceptées. */
    const absents = (parJour.get(AUJ) || []);
    html += '<div class="v2-blk v2-rail-blk cgv-tint-cy"><div class="v2-blk-h">' +
      '<span style="color:#22d3ee;display:flex">' + svg(ICO.cal, 2) + '</span>' +
      '<span class="v2-blk-t">Absents actuellement</span></div>';
    html += absents.length
      ? absents.map(d => '<div class="cgv-li">' + av(nomDe(d), d.employeId, 'md') +
          '<div style="flex:1;min-width:0"><div class="cgv-li-t">' + esc(nomDe(d)) + '</div>' +
          '<div class="cgv-li-s">' + esc(typeLabel(d.type)) + '</div></div>' +
          '<span class="cgv-li-v" style="color:#67e8f9">→ ' + esc(dateCourte(d.fin)) + '</span></div>').join('')
      : '<div class="v2-blk-vide">Aucun salarié absent aujourd\'hui.</div>';
    html += '</div>';

    /* Congés posés par mois (4 mois glissants) — dérivé. */
    const now = new Date();
    const bornes = [];
    for (let k = -1; k <= 2; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
      bornes.push({ y: d.getFullYear(), m: d.getMonth(), n: 0 });
    }
    list.filter(d => d.statut === 'accepte' && d.debut && d.fin).forEach(d => {
      const cur = new Date(d.debut + 'T12:00:00');
      const stop = new Date(d.fin + 'T12:00:00');
      let garde = 0;
      while (cur <= stop && garde++ < 400) {
        const b = bornes.find(x => x.y === cur.getFullYear() && x.m === cur.getMonth());
        if (b) b.n++;
        cur.setDate(cur.getDate() + 1);
      }
    });
    const maxB = Math.max(1, ...bornes.map(b => b.n));
    html += '<div class="v2-blk v2-rail-blk"><div class="v2-blk-h">' +
      '<span class="v2-blk-t">Congés posés — jours par mois</span></div>' +
      '<div class="cgv-bars">' + bornes.map(b =>
        '<div class="cgv-bar-c"><div class="cgv-bar-n">' + b.n + '</div>' +
        '<div class="cgv-bar" style="height:' + Math.round(b.n / maxB * 100) + '%"></div>' +
        '<div class="cgv-bar-l">' + MOIS_C[b.m].replace('.', '') + '</div></div>').join('') +
      '</div></div>';

    rail.innerHTML = html;
  }

  /* ── Bas de page : calendrier, compteurs, quotas, ordre, workflow ── */
  function renderFeatures(list, employes, nomDe, isAdmin) {
    renderCalendrier(list, nomDe);
    renderCompteurs(employes, isAdmin);
    renderQuotas();
    renderOrdre(employes, isAdmin);
    renderWorkflow(list, nomDe);
    renderAcquisition(isAdmin);
  }

  /* Calendrier d'équipe du mois affiché */
  CGV.moisSuivant = function (delta) {
    const c = CGV.calMois || { y: new Date().getFullYear(), m: new Date().getMonth() };
    const d = new Date(c.y, c.m + delta, 1);
    CGV.calMois = { y: d.getFullYear(), m: d.getMonth() };
    if (typeof renderConges === 'function') renderConges();
  };

  function renderCalendrier(list, nomDe) {
    const el = document.getElementById('cgCalendrier');
    if (!el) return;
    if (!CGV.calMois) CGV.calMois = { y: new Date().getFullYear(), m: new Date().getMonth() };
    const { y, m } = CGV.calMois;
    const nbJours = new Date(y, m + 1, 0).getDate();
    const p2 = n => String(n).padStart(2, '0');
    const jourStr = j => y + '-' + p2(m + 1) + '-' + p2(j);

    const dansLeMois = list.filter(d =>
      (d.statut === 'accepte' || d.statut === 'en_attente') && d.debut && d.fin &&
      d.debut <= jourStr(nbJours) && d.fin >= jourStr(1));

    const rMax = regle('max_absents_simultanes');
    const maxAbsents = (rMax && rMax.valeur != null) ? Number(rMax.valeur) : null;

    // Nombre d'absents acceptés par jour, pour marquer les jours de conflit.
    const compte = {};
    dansLeMois.filter(d => d.statut === 'accepte').forEach(d => {
      for (let j = 1; j <= nbJours; j++) {
        const s = jourStr(j);
        if (d.debut <= s && d.fin >= s) compte[j] = (compte[j] || 0) + 1;
      }
    });

    const parEmp = new Map();
    dansLeMois.forEach(d => {
      const k = String(d.employeId);
      if (!parEmp.has(k)) parEmp.set(k, { nom: nomDe(d), id: d.employeId, dem: [] });
      parEmp.get(k).dem.push(d);
    });

    // Légende : uniquement les types réellement présents sur le mois affiché,
    // avec la couleur exacte utilisée dans les cellules.
    const typesPresents = [...new Set(dansLeMois.filter(d => d.statut === 'accepte').map(d => d.type))];
    const legende = typesPresents.map(t =>
      '<span><i style="background:' + typeColor(t) + '"></i>' + esc(typeLabel(t)) + '</span>').join('') +
      '<span><i style="background:#f59e0b"></i>En attente</span>' +
      (maxAbsents != null ? '<span><i style="background:#ef4444"></i>Sous-effectif</span>' : '');

    const entete = '<div class="v2-blk-h">' +
      '<span style="color:#f59e0b;display:flex">' + svg(ICO.cal, 2) + '</span>' +
      '<span class="v2-blk-t">Calendrier d\'équipe — ' + MOIS_L[m] + ' ' + y + '</span>' +
      '<span class="cgv-nav" style="margin-left:12px">' +
        '<button type="button" title="Mois précédent" onclick="CGV.moisSuivant(-1)">' +
          svg('<polyline points="15 18 9 12 15 6"/>', 2.2) + '</button>' +
        '<button type="button" title="Mois suivant" onclick="CGV.moisSuivant(1)">' +
          svg('<polyline points="9 18 15 12 9 6"/>', 2.2) + '</button></span>' +
      '<span class="cgv-legend">' + legende + '</span></div>';

    if (!parEmp.size) {
      el.innerHTML = entete + '<div class="v2-blk-vide">Aucun congé sur ce mois.</div>';
      return;
    }

    const jours = Array.from({ length: nbJours }, (_, i) => i + 1);
    const we = j => { const d = new Date(y, m, j).getDay(); return d === 0 || d === 6; };

    let html = entete + '<div class="cgv-scroll"><div class="cgv-cal" style="min-width:' +
      Math.max(420, 132 + nbJours * 16) + 'px">';
    html += '<div class="cgv-cal-row"><span class="cgv-cal-name"></span><span class="cgv-cal-cells">' +
      jours.map(j => '<span class="cgv-cal-d' + (we(j) ? ' we' : '') + '">' + j + '</span>').join('') +
      '</span></div>';

    [...parEmp.values()].forEach(r => {
      html += '<div class="cgv-cal-row"><span class="cgv-cal-name">' + av(r.nom, r.id, 'xs') +
        '<span>' + esc(r.nom) + '</span></span><span class="cgv-cal-cells">' +
        jours.map(j => {
          const s = jourStr(j);
          const d = r.dem.find(x => x.debut <= s && x.fin >= s);
          if (!d) return '<span class="cgv-cal-c"></span>';
          const conflit = maxAbsents != null && d.statut === 'accepte' && (compte[j] || 0) > maxAbsents;
          const bg = conflit ? '#ef4444' : (d.statut === 'accepte' ? typeColor(d.type) : '#f59e0b');
          const t = esc(r.nom) + ' — ' + esc(typeLabel(d.type)) +
            (d.statut === 'en_attente' ? ' (en attente)' : '') + (conflit ? ' — sous-effectif' : '');
          return '<span class="cgv-cal-c" style="background:' + bg + '" title="' + t + '"></span>';
        }).join('') + '</span></div>';
    });
    el.innerHTML = html + '</div></div>';
  }

  /* Compteurs détaillés — données de paie : admins uniquement */
  function renderCompteurs(employes, isAdmin) {
    const el = document.getElementById('cgCompteurs');
    if (!el) return;
    if (!isAdmin) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = '';

    const head = '<div class="v2-blk-t" style="padding:18px 20px 4px">Compteurs détaillés</div>';
    if (!CGV.soldesDispo) {
      el.innerHTML = head + '<div class="v2-blk-vide" style="padding:0 20px 18px">Compteurs indisponibles — ' +
        "la table <code>conges_soldes</code> n'existe pas encore (migration-mes-conges.sql).</div>";
      return;
    }
    if (!CGV.soldes.length) {
      el.innerHTML = head + '<div class="v2-blk-vide" style="padding:0 20px 18px">Aucun compteur enregistré.</div>';
      return;
    }
    const cols = ['CP N-1', 'CP N', 'RTT', 'Récup', 'CET'];
    const tiret = v => (v == null ? '—' : v);
    el.innerHTML = head + '<div class="cgv-scroll"><table class="cgv-cpt"><thead><tr><th>Salarié</th>' +
      cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
      CGV.soldes.map(s => {
        const e = employes.find(x => String(x.id) === String(s.employe_id));
        const nom = e ? `${e.prenom || ''} ${e.nom || ''}`.trim() : 'Salarié';
        const n1 = nbFr(s.cp_n1);
        return '<tr><td><div class="cgv-cell">' + av(nom, s.employe_id, 'sm') +
          '<span class="c-nom">' + esc(nom) + '</span></div></td>' +
          '<td class="' + (n1 && n1 !== '0' ? 'warn' : '') + '">' + tiret(n1) + '</td>' +
          '<td>' + tiret(nbFr(s.cp_acquis)) + '</td>' +
          '<td>' + tiret(nbFr(s.rtt)) + '</td>' +
          '<td>' + tiret(nbFr(s.recup)) + '</td>' +
          '<td>' + tiret(nbFr(s.cet)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* Règles & quotas */
  function renderQuotas() {
    const el = document.getElementById('cgQuotas');
    if (!el) return;
    const head = '<div class="v2-blk-h"><span style="color:#fca5a5;display:flex">' + svg(ICO.shield, 2) +
      '</span><span class="v2-blk-t">Règles &amp; quotas</span></div>';
    if (!CGV.reglesDispo) {
      el.innerHTML = head + '<div class="v2-blk-vide">Règles indisponibles — la table ' +
        "<code>conges_regles</code> n'existe pas encore (migration-conges.sql).</div>";
      return;
    }
    if (!CGV.regles.length) {
      el.innerHTML = head + '<div class="v2-blk-vide">Aucune règle enregistrée.</div>';
      return;
    }
    el.innerHTML = head + CGV.regles.map(r => {
      const val = r.valeur_texte || (r.valeur != null ? nbFr(r.valeur) : '—');
      return '<div class="cgv-li"><span class="cgv-li-dot" style="background:#f59e0b"></span>' +
        '<div style="flex:1;min-width:0"><div class="cgv-li-t">' + esc(r.libelle || r.code) + '</div>' +
        '<div class="cgv-li-s">' + esc(r.detail || '') + '</div></div>' +
        '<span class="cgv-li-v" style="color:#fbbf24">' + esc(val) + '</span></div>';
    }).join('');
  }

  /* Ordre des départs — ancienneté (date d'embauche) */
  function renderOrdre(employes, isAdmin) {
    const el = document.getElementById('cgOrdre');
    if (!el) return;
    if (!isAdmin) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = '';

    const head = '<div class="v2-blk-h"><span class="v2-blk-t">Ordre des départs</span></div>' +
      '<div class="v2-blk-sub" style="margin-bottom:10px">Par ancienneté</div>';
    const avec = employes.filter(e => e.dateEmbauche)
      .sort((a, b) => a.dateEmbauche.localeCompare(b.dateEmbauche));
    if (!avec.length) {
      el.innerHTML = head + "<div class=\"v2-blk-vide\">Aucune date d'embauche renseignée sur les fiches salariés.</div>";
      return;
    }
    const now = new Date();
    el.innerHTML = head + avec.slice(0, 8).map((e, i) => {
      const nom = `${e.prenom || ''} ${e.nom || ''}`.trim();
      const an = Math.floor((now - new Date(e.dateEmbauche + 'T12:00:00')) / 31557600000);
      const crit = 'Ancienneté ' + an + ' an' + (an > 1 ? 's' : '') + (e.poste ? ' · ' + e.poste : '');
      return '<div class="cgv-li"><span class="cgv-rank' + (i === 0 ? ' top' : '') + '">' + (i + 1) + '</span>' +
        av(nom, e.id, 'sm') +
        '<div style="flex:1;min-width:0"><div class="cgv-li-t">' + esc(nom) + '</div>' +
        '<div class="cgv-li-s">' + esc(crit) + '</div></div></div>';
    }).join('');
  }

  /* Workflow de validation d'une demande */
  function renderWorkflow(list, nomDe) {
    const el = document.getElementById('cgWorkflow');
    if (!el) return;
    let d = CGV.wfId ? list.find(x => x.id === CGV.wfId) : null;
    if (!d) d = list.filter(x => x.statut === 'en_attente')
      .sort((a, b) => (a.debut || '').localeCompare(b.debut || ''))[0];
    if (!d) d = list[0];

    const head = '<div class="v2-blk-h"><span class="v2-blk-t">Workflow de validation</span></div>';
    if (!d) {
      el.innerHTML = head + '<div class="v2-blk-vide">Aucune demande à suivre.</div>';
      return;
    }
    const sub = '<div class="v2-blk-sub" style="margin-bottom:12px">' +
      esc(nomDe(d)) + ' · ' + esc(periode(d)) + '</div>';

    const fmt = iso => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
    const OK = '#10b981', ATT = '#f59e0b', KO = '#ef4444';
    const etapes = [
      { t: 'Demande déposée', s: nomDe(d), w: fmt(d.dateDemande), bg: OK, i: ICO.check }
    ];
    if (d.statut === 'en_attente') {
      etapes.push({ t: 'Validation', s: 'En attente de décision', w: '—', bg: ATT, i: ICO.hourglass });
    } else {
      const ok = d.statut === 'accepte';
      etapes.push({
        t: ok ? 'Demande validée' : 'Demande refusée',
        s: (d.traitePar ? esc(d.traitePar) : 'Décision enregistrée') +
           (d.reponseMotif ? ' — ' + esc(d.reponseMotif) : ''),
        w: fmt(d.dateTraitement), bg: ok ? OK : KO, i: ok ? ICO.check : ICO.cross
      });
    }
    el.innerHTML = head + sub + etapes.map((e, i) =>
      '<div class="cgv-wf"><div class="cgv-wf-col">' +
      '<span class="cgv-wf-dot" style="background:' + e.bg + '">' + svg(e.i, 2.6) + '</span>' +
      (i < etapes.length - 1 ? '<span class="cgv-wf-line"></span>' : '') + '</div>' +
      '<div class="cgv-wf-b"><div class="cgv-wf-t">' + esc(e.t) + '</div>' +
      '<div class="cgv-wf-s">' + e.s + ' · ' + esc(e.w) + '</div></div></div>').join('');
  }

  /* Acquisition & alertes */
  function renderAcquisition(isAdmin) {
    const el = document.getElementById('cgAcquisition');
    if (!el) return;
    if (!isAdmin) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = '';

    const head = '<div class="v2-blk-h"><span style="color:#34d399;display:flex">' + svg(ICO.spark, 2) +
      '</span><span class="v2-blk-t">Acquisition &amp; alertes</span></div>';
    const li = [];

    const rAcq = regle('cp_acquis_mois');
    if (rAcq && rAcq.valeur != null) {
      li.push({ l: 'CP acquis / mois', d: rAcq.detail || 'Par salarié', v: '+' + nbFr(rAcq.valeur) + ' j', c: '#34d399' });
    }
    const rLim = regle('cp_limite_solde');
    if (rLim && (rLim.valeur_texte || rLim.detail)) {
      li.push({ l: 'CP à écouler', d: rLim.detail || '', v: rLim.valeur_texte || '—', c: '#f59e0b' });
    }
    if (CGV.soldesDispo && CGV.soldes.length) {
      const rtt = CGV.soldes.reduce((a, s) => a + Number(s.rtt || 0), 0);
      const n1 = CGV.soldes.filter(s => Number(s.cp_n1 || 0) > 0).length;
      li.push({ l: 'RTT restants (équipe)', d: 'Somme des compteurs', v: nbFr(rtt) + ' j', c: '#f59e0b' });
      li.push({ l: 'CP N-1 à solder', d: n1 + ' salarié' + (n1 > 1 ? 's' : '') + ' concerné' + (n1 > 1 ? 's' : ''), v: n1 + ' pers.', c: '#fb7185' });
    }

    if (!li.length) {
      el.innerHTML = head + '<div class="v2-blk-vide">Aucune donnée d\'acquisition — exécutez ' +
        'migration-conges.sql (règles) et migration-mes-conges.sql (compteurs).</div>';
      return;
    }
    el.innerHTML = head + li.map(x =>
      '<div class="cgv-li"><span class="cgv-li-dot" style="background:' + x.c + '"></span>' +
      '<div style="flex:1;min-width:0"><div class="cgv-li-t">' + esc(x.l) + '</div>' +
      '<div class="cgv-li-s">' + esc(x.d) + '</div></div>' +
      '<span class="cgv-li-v" style="color:' + x.c + '">' + esc(x.v) + '</span></div>').join('');
  }

  /* ══ Modale : segments de type + note de durée ════════════════════ */
  CGV.pickType = function (t) {
    const sel = document.getElementById('cgType');
    if (sel) sel.value = t;
    CGV.syncSeg();
    if (typeof cgModalSync === 'function') cgModalSync();
    CGV.syncDuree();
  };

  CGV.syncSeg = function () {
    const v = document.getElementById('cgType')?.value || 'cp';
    document.querySelectorAll('#cgSeg .v2-seg-o').forEach(b =>
      b.classList.toggle('on', b.dataset.t === v));
  };

  CGV.syncDuree = function () {
    const box = document.getElementById('cgDuree');
    if (!box) return;
    const debut = document.getElementById('cgDebut')?.value || '';
    const fin = document.getElementById('cgFin')?.value || '';
    const txt = box.querySelector('span');
    const set = (cls, msg) => {
      box.className = 'v2-note ' + cls;
      if (txt) txt.textContent = msg;
    };
    if (!debut || !fin) { set('v2-note-warn', 'Choisissez une date de début et de fin.'); return; }
    if (fin < debut) { set('v2-note-err', 'La date de fin doit être après la date de début.'); return; }

    const jo = joursOuvres(debut, fin);
    let msg = jo + ' jour' + (jo > 1 ? 's' : '') + ' ouvré' + (jo > 1 ? 's' : '');

    // Alerte sous-effectif à la saisie, uniquement si la règle existe.
    const rMax = regle('max_absents_simultanes');
    const max = (rMax && rMax.valeur != null) ? Number(rMax.valeur) : null;
    if (max != null) {
      const list = Array.isArray(window._cgCache) ? window._cgCache : [];
      const parJour = absencesParJour(list);
      const conflits = joursConflit({ id: '__new__', debut, fin }, parJour, max);
      if (conflits.length) {
        set('v2-note-err', msg + ' — sous-effectif prévisible (max ' + max + ') les ' +
          conflits.map(dateCourte).join(', '));
        return;
      }
    }
    set('v2-note-ok', msg + ' — aucun conflit d\'effectif détecté.');
  };
})();
