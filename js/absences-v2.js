/* ══════════════════════════════════════════════════════════════════════════
   ABSENCES & ACCIDENTS DU TRAVAIL — rendu Design V2 « cockpit RH »
   Reproduit la maquette « Absences & AT (RH) ».

   Ce module ne réécrit AUCUNE couche Supabase existante : il consomme
   _abCache / _abEmployesCache remplis par js/absences.js et appelle les
   actions déjà en place (openAbsenceModal, quickDeleteAbsence, abMarkJustifie,
   abOpenJustificatif, sbSaveAbsence).

   Trois panneaux de la maquette n'ont pas de source en base ; ils lisent des
   tables créées par migration-absences.sql :
     · absences_at_etapes  → « Déclaration AT »
     · absences_impact     → « Impact planning »
     · absences_couts      → « Coût des absences »
   Dégradation douce : table absente → lecture [] + console.warn, écriture
   refusée avec un toast citant migration-absences.sql, page utilisable.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const ABV = {};
  window.ABV = ABV;

  /* ── Palettes ───────────────────────────────────────────────────────── */
  const TYPE = {
    maladie:        { l: 'Maladie',            c: '#f59e0b' },
    at:             { l: 'Accident travail',   c: '#ef4444' },
    maladie_pro:    { l: 'Maladie pro',        c: '#a855f7' },
    maternite:      { l: 'Maternité',          c: '#ec4899' },
    longue_maladie: { l: 'Longue maladie',     c: '#fb7185' },
    autre:          { l: 'Autre absence',      c: '#818cf8' }
  };
  const TYPE_ORDER = ['maladie', 'at', 'maladie_pro', 'maternite', 'longue_maladie', 'autre'];
  const CLR = ['#22d3ee', '#818cf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9', '#fb7185'];
  const MOIS_C = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  /* ── Icônes ─────────────────────────────────────────────────────────── */
  const IC = {
    clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    injury: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    alert:  '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    med:    '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    baby:   '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    home:   '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    factory:'<path d="M2 20h20V9l-6 4V9l-6 4V4H4z"/>',
    check:  '<polyline points="20 6 9 17 4 12"/>',
    cross:  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>',
    send:   '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    swap:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    eye:    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
  };
  const TYPE_ICO = {
    maladie: IC.med, at: IC.injury, maladie_pro: IC.factory,
    maternite: IC.baby, longue_maladie: IC.med, autre: IC.home
  };
  const svg = (p, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
    (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';

  /* ── Utilitaires ────────────────────────────────────────────────────── */
  /* escHtml() renvoie '' pour toute valeur falsy : on force la chaîne d'abord,
     sinon les compteurs à 0 s'affichent vides. */
  const esc = s => {
    const v = String(s == null ? '' : s);
    return typeof escHtml === 'function' ? escHtml(v)
      : v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  const fdate = d => (d && typeof formatDate === 'function' ? formatDate(d) : (d || '—'));
  const tdy = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const el = id => document.getElementById(id);
  const t = a => TYPE[a && a.type] || TYPE.maladie;
  const ini = (p, n) => (((p || '').trim().charAt(0)) + ((n || '').trim().charAt(0))).toUpperCase() || '?';

  function empOf(a) {
    const list = (typeof abEmployes === 'function' ? abEmployes() : []) || [];
    return list.find(e => String(e.id) === String(a.employeId)) || null;
  }
  function nomOf(a) {
    const e = empOf(a);
    if (e) return `${e.prenom || ''} ${e.nom || ''}`.trim();
    return a.employeNom || (typeof abEmployeNom === 'function' ? abEmployeNom(a.employeId) : 'Inconnu');
  }
  function iniOf(a) {
    const e = empOf(a);
    if (e) return ini(e.prenom, e.nom);
    const parts = (a.employeNom || '').split(/\s+/);
    return ini(parts[0], parts[1]);
  }
  function colorOf(a) {
    const e = empOf(a);
    if (e && e.color) return e.color;
    const key = String(a.employeId || a.employeNom || '');
    let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return CLR[h % CLR.length];
  }
  const jours = a => (typeof abDureeJours === 'function' ? abDureeJours(a) : 1);
  const enCours = a => (typeof abEnCours === 'function' ? abEnCours(a) : (!a.fin || a.fin >= tdy()));
  const canEdit = () => (typeof abIsCanEdit === 'function' ? abIsCanEdit() : false);
  const data = () => (typeof getAbsences === 'function' ? (getAbsences() || []) : []);

  /* Période compacte, comme la maquette : « 15–22 juil. », « 03 juil. → ». */
  const M_ABBR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function jm(d) { const p = d.split('-'); return p[2] + ' ' + M_ABBR[Number(p[1]) - 1]; }
  function periode(a) {
    if (!a.debut) return '—';
    if (!a.fin) return jm(a.debut) + ' →';
    if (a.debut === a.fin) return jm(a.debut);
    const p0 = a.debut.split('-'), p1 = a.fin.split('-');
    if (p0[0] === p1[0] && p0[1] === p1[1]) return p0[2] + '–' + jm(a.fin);
    return jm(a.debut) + ' – ' + jm(a.fin) + (p0[0] !== p1[0] ? ' ' + p1[0] : '');
  }
  const eur = n => (Math.round(n)).toLocaleString('fr-FR') + ' €';

  /* ══ Tables complémentaires (migration-absences.sql) ══════════════════
     Toute lecture échoue en douceur : [] + console.warn.                */
  const SQL_FILE = 'migration-absences.sql';
  const EXTRA = { etapes: [], impact: [], couts: [], missing: {} };

  function isMissingTable(e) {
    const code = e && (e.code || '');
    const msg = ((e && (e.message || e.details)) || '').toLowerCase();
    return code === '42P01' || code === 'PGRST205' || code === 'PGRST205'.toLowerCase() ||
      msg.indexOf('does not exist') >= 0 || msg.indexOf('schema cache') >= 0;
  }

  async function readTable(table) {
    if (typeof supabaseClient === 'undefined') return [];
    try {
      const { data: rows, error } = await supabaseClient.from(table).select('*');
      if (error) {
        EXTRA.missing[table] = isMissingTable(error);
        console.warn('[absences-v2] lecture « ' + table + ' » impossible (' +
          (error.message || error.code) + ') — exécutez ' + SQL_FILE + '. Panneau vide.');
        return [];
      }
      EXTRA.missing[table] = false;
      return rows || [];
    } catch (e) {
      EXTRA.missing[table] = true;
      console.warn('[absences-v2] lecture « ' + table + ' » impossible — exécutez ' + SQL_FILE, e);
      return [];
    }
  }

  ABV.loadExtra = async function () {
    const [etapes, impact, couts] = await Promise.all([
      readTable('absences_at_etapes'), readTable('absences_impact'), readTable('absences_couts')
    ]);
    EXTRA.etapes = etapes; EXTRA.impact = impact; EXTRA.couts = couts;
  };

  function refuse(table) {
    const msg = EXTRA.missing[table]
      ? 'Table « ' + table + ' » absente — exécutez ' + SQL_FILE
      : 'Écriture refusée sur « ' + table + ' » — vérifiez ' + SQL_FILE;
    if (typeof toast === 'function') toast(msg, 'error'); else console.warn(msg);
  }

  /* ══ FILTRES ═══════════════════════════════════════════════════════════ */
  ABV.setType = function (v) {
    const sel = el('abFilterType');
    if (sel) sel.value = v;
    ABV.render();
  };

  function renderChips(all) {
    const box = el('abChips'); if (!box) return;
    const cur = (el('abFilterType') || {}).value || '';
    const n = {}; all.forEach(a => { n[a.type] = (n[a.type] || 0) + 1; });
    const defs = [{ id: '', l: 'Toutes', c: '#818cf8', n: all.length }]
      .concat(TYPE_ORDER.map(k => ({ id: k, l: TYPE[k].l, c: TYPE[k].c, n: n[k] || 0 })));
    box.innerHTML = defs.map(f => `
      <button type="button" class="v2-chip-f${cur === f.id ? ' on' : ''}" onclick="ABV.setType('${f.id}')">
        <span class="dot" style="background:${f.c}"></span>${esc(f.l)}<span class="n">${f.n}</span>
      </button>`).join('');
  }

  /* ══ KPI ═══════════════════════════════════════════════════════════════ */
  function tauxMois(all, ym) {
    const emps = (typeof abEmployes === 'function' ? abEmployes() : []) || [];
    const effectif = emps.filter(e => (e.statut || 'actif') === 'actif').length;
    if (!effectif) return null;
    const [y, m] = ym.split('-').map(Number);
    const nbJours = new Date(y, m, 0).getDate();
    const d0 = new Date(y, m - 1, 1), d1 = new Date(y, m, 0);
    let jrs = 0;
    all.forEach(a => {
      if (!a.debut) return;
      const s = new Date(a.debut + 'T00:00:00');
      const e = new Date((a.fin || tdy()) + 'T00:00:00');
      const from = s > d0 ? s : d0, to = e < d1 ? e : d1;
      if (to < from) return;
      jrs += Math.round((to - from) / 86400000) + 1;
    });
    return (jrs / (effectif * nbJours)) * 100;
  }

  function renderStats(all) {
    const box = el('abStats'); if (!box) return;
    const ouverts = all.filter(enCours);
    const ats = all.filter(a => a.type === 'at' && enCours(a));
    const sansJustif = all.filter(a => !a.justifie && !a.justificatifPath);
    const tx = tauxMois(all, tdy().slice(0, 7));
    const cards = [
      { n: ouverts.length, l: 'Absences en cours',  c: '#f59e0b', i: IC.clock },
      { n: ats.length,     l: 'AT ouverts',         c: '#ef4444', i: IC.injury },
      { n: tx == null ? '—' : tx.toFixed(1).replace('.', ',') + ' %', l: 'Taux absentéisme (mois)', c: '#fb7185', i: IC.alert },
      { n: sansJustif.length, l: 'Justificatif manquant', c: '#8095b4', i: IC.file }
    ];
    box.innerHTML = cards.map(k => `
      <div class="v2-k">
        <span class="v2-k-ico" style="background:${k.c}22;color:${k.c}">${svg(k.i)}</span>
        <div><span class="v2-k-n" style="color:${k.c}">${esc(k.n)}</span><span class="v2-k-l">${esc(k.l)}</span></div>
      </div>`).join('');
  }

  /* ══ ALERTES ═══════════════════════════════════════════════════════════ */
  function visitesAFaire(all) {
    return all.filter(a => !enCours(a) && !a.visiteFaite &&
      (a.visiteDate || jours(a) >= 30 || a.type === 'maladie_pro'));
  }

  function renderAlerts(all) {
    const box = el('abAlerts'); if (!box) return;
    const out = [];
    all.filter(a => a.type === 'at' && !a.declareeCpam).forEach(a => {
      const heures = Math.floor((Date.now() - new Date(a.debut + 'T00:00:00')) / 3600000);
      const reste = 48 - heures;
      out.push({ id: a.id, c: '#ef4444', i: IC.injury, txt: reste > 0
        ? `Déclaration CPAM sous 48 h pour l'AT de ${nomOf(a)} — reste ${reste} h`
        : `Déclaration CPAM en retard pour l'AT de ${nomOf(a)}` });
    });
    visitesAFaire(all).forEach(a => out.push({
      id: a.id, c: '#a855f7', i: IC.med,
      txt: `Visite de reprise à planifier pour ${nomOf(a)}${a.fin ? ' (retour le ' + fdate(a.fin) + ')' : ''}`
    }));
    box.innerHTML = out.map(o => `
      <button type="button" class="abv-alert" style="--ac:${o.c}" onclick="openAbsenceModal('${o.id}')">
        ${svg(o.i)}<span>${esc(o.txt)}</span>
      </button>`).join('');
  }

  /* ══ TABLEAU ═══════════════════════════════════════════════════════════ */
  function renderTable(list) {
    const box = el('abList'); if (!box) return;
    const ed = canEdit();
    const cols = ['Salarié', 'Motif', 'Période', 'Durée', 'Justificatif', 'Statut'];

    if (!list.length) {
      box.innerHTML = `<div class="abv-tblwrap"><div class="abv-vide">Aucune absence pour ce filtre.</div></div>`;
      return;
    }

    const rows = list.map(a => {
      const ty = t(a), oc = enCours(a);
      const st = oc ? { l: 'En cours', c: '#f59e0b' } : { l: 'Terminée', c: '#10b981' };
      const jok = !!a.justifie;
      const justTxt = a.justificatifPath ? (jok ? 'Reçu' : 'Pièce jointe') : (jok ? 'Justifié' : 'Manquant');
      const justC = jok ? '#34d399' : (a.justificatifPath ? '#fbbf24' : '#fca5a5');
      const justIco = jok ? IC.check : (a.justificatifPath ? IC.file : IC.cross);
      const justCell = ed
        ? `<button type="button" class="abv-just" role="button" style="color:${justC}" title="${jok ? 'Justifié — cliquer pour annuler' : 'Marquer comme justifié'}" onclick="abMarkJustifie('${a.id}',${jok ? 'false' : 'true'})">${svg(justIco, 2.4)}${justTxt}</button>`
        : `<span class="abv-just" style="color:${justC}">${svg(justIco, 2.4)}${justTxt}</span>`;
      const acts = [];
      if (a.justificatifPath) acts.push(`<button type="button" class="abv-ico-btn" title="Voir le justificatif" onclick="abOpenJustificatif('${a.id}')">${svg(IC.eye)}</button>`);
      if (ed) {
        acts.push(`<button type="button" class="abv-ico-btn" title="Modifier" onclick="openAbsenceModal('${a.id}')">${svg(IC.pencil)}</button>`);
        acts.push(`<button type="button" class="abv-ico-btn del" title="Supprimer" onclick="quickDeleteAbsence('${a.id}')">${svg(IC.trash)}</button>`);
      }
      const tags = [];
      if (a.prolongation) tags.push('Prolongation');
      if (a.type === 'at' && !a.declareeCpam) tags.push('DAT à transmettre');
      if (a.visiteDate) tags.push('Visite de reprise ' + fdate(a.visiteDate) + (a.visiteFaite ? ' — effectuée' : ' — à faire'));
      const sub = tags.length || a.notes
        ? `<tr class="abv-notes-row"><td colspan="7">${tags.map(x => esc(x)).join(' · ')}${tags.length && a.notes ? ' · ' : ''}${esc(a.notes || '')}</td></tr>`
        : '';

      return `<tr>
        <td><div class="abv-who"><span class="abv-av" style="background:${colorOf(a)}">${esc(iniOf(a))}</span><span class="abv-who-n">${esc(nomOf(a))}</span></div></td>
        <td><span class="abv-type" style="--tc:${ty.c}">${svg(TYPE_ICO[a.type] || IC.med, 2.2)}${esc(ty.l)}</span></td>
        <td class="abv-per">${esc(periode(a))}</td>
        <td class="abv-dur">${oc && !a.fin ? 'en cours' : jours(a) + ' j'}</td>
        <td>${justCell}</td>
        <td><span class="abv-st" style="--sc:${st.c}">${st.l}</span></td>
        <td><div class="abv-acts">${acts.join('')}</div></td>
      </tr>${sub}`;
    }).join('');

    box.innerHTML = `<div class="abv-tblwrap"><div class="abv-scroll"><table class="abv-tbl">
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  /* ══ REGISTRE DES AT ═══════════════════════════════════════════════════ */
  function renderRegistre(all) {
    const box = el('abRegistre'); if (!box) return;
    const ats = all.filter(a => a.type === 'at' || a.type === 'maladie_pro')
      .sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
    const body = ats.length ? ats.map(a => {
      const clos = !enCours(a);
      const st = clos ? { l: 'Clôturé', c: '#10b981' } : { l: 'En cours', c: '#f59e0b' };
      const det = [];
      det.push(a.declareeCpam ? 'DAT transmise · CPAM' : 'DAT à transmettre');
      if (a.fin) det.push('reprise le ' + fdate(a.fin));
      return `<div class="abv-line">
        <span class="abv-av abv-av-sm" style="background:${colorOf(a)}">${esc(iniOf(a))}</span>
        <div class="abv-line-b">
          <div class="abv-line-t">${esc(nomOf(a))} — ${esc(t(a).l)}</div>
          <div class="abv-line-s">${esc(fdate(a.debut))} · ${esc(det.join(' · '))}</div>
        </div>
        <span class="abv-line-tag" style="--sc:${st.c}">${st.l}</span>
      </div>`;
    }).join('') : `<div class="v2-blk-vide">Aucun accident du travail enregistré.</div>`;

    box.innerHTML = `<div class="abv-tint-red">
      <div class="abv-h"><span style="color:#fca5a5">${svg(IC.injury)}</span>
        <span class="abv-h-t red">Accidents du travail — registre</span>
        <span class="abv-h-x">${ats.length}</span></div>
      ${body}</div>`;
  }

  /* ══ RAIL ══════════════════════════════════════════════════════════════ */
  function renderTaux(all) {
    const box = el('abTaux'); if (!box) return;
    const now = new Date(), mois = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      mois.push({ ym: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), l: MOIS_C[d.getMonth()] });
    }
    const vals = mois.map(m => ({ l: m.l, v: tauxMois(all, m.ym) }));
    const max = Math.max(1, ...vals.map(v => v.v || 0));
    const cur = vals[vals.length - 1].v;
    box.innerHTML = `<div class="v2-blk v2-rail-blk">
      <div class="abv-h" style="margin-bottom:14px">
        <span class="abv-h-t">Taux d'absentéisme</span>
        <span class="abv-rail-val">${cur == null ? '—' : cur.toFixed(1).replace('.', ',') + ' %'}</span>
      </div>
      <div class="abv-chart">${vals.map(v => `
        <div class="abv-chart-c">
          <div class="abv-chart-b" style="height:${Math.round(((v.v || 0) / max) * 100)}%" title="${v.v == null ? '—' : v.v.toFixed(1) + ' %'}"></div>
          <div class="abv-chart-l">${v.l}</div>
        </div>`).join('')}</div>
      <div class="abv-hint" style="margin:10px 0 0">Jours d'absence rapportés à l'effectif actif.</div>
    </div>`;
  }

  function renderMotifs(all) {
    const box = el('abMotifs'); if (!box) return;
    const par = {};
    all.forEach(a => { par[a.type] = (par[a.type] || 0) + jours(a); });
    const rows = TYPE_ORDER.filter(k => par[k]).map(k => ({ k, n: par[k] }));
    const max = Math.max(1, ...rows.map(r => r.n));
    box.innerHTML = `<div class="v2-blk v2-rail-blk">
      <div class="v2-blk-t" style="margin-bottom:16px">Par motif (jours)</div>
      ${rows.length ? rows.map(r => `
        <div class="abv-motif">
          <div class="abv-motif-h"><span class="abv-motif-l">${esc(TYPE[r.k].l)}</span><span class="abv-motif-n">${r.n} j</span></div>
          <div class="v2-prog"><span style="width:${Math.round((r.n / max) * 100)}%;background:${TYPE[r.k].c}"></span></div>
        </div>`).join('') : '<div class="v2-blk-vide">Aucune absence enregistrée.</div>'}
    </div>`;
  }

  function renderRetours(all) {
    const box = el('abRetours'); if (!box) return;
    const ouverts = all.filter(enCours);
    const avecFin = ouverts.filter(a => a.fin).sort((a, b) => a.fin.localeCompare(b.fin));
    const sansFin = ouverts.filter(a => !a.fin);
    const list = avecFin.concat(sansFin).slice(0, 6);
    box.innerHTML = `<div class="abv-tint-amber">
      <div class="abv-h" style="margin-bottom:12px"><span style="color:#fbbf24">${svg(IC.cal)}</span>
        <span class="abv-h-t amber">Retours prévus</span></div>
      ${list.length ? list.map(a => `
        <div class="abv-line" style="padding:8px 0">
          <span class="abv-av abv-av-xs" style="background:${colorOf(a)}">${esc(iniOf(a))}</span>
          <span class="abv-line-b" style="font-size:11.5px;color:var(--v2-t3)">${esc(nomOf(a))}</span>
          <span class="abv-line-plain" style="--sc:#fbbf24;font-size:11px">${a.fin ? esc(fdate(a.fin)) : 'à définir'}</span>
        </div>`).join('') : '<div class="v2-blk-vide">Aucun retour attendu.</div>'}
    </div>`;
  }

  /* ══ DÉCLARATION AT (absences_at_etapes) ═══════════════════════════════ */
  const ETAPES = [
    { code: 'constat',    l: 'Constat & mise en sécurité' },
    { code: 'certificat', l: 'Certificat médical initial' },
    { code: 'cerfa',      l: 'Formulaire CERFA (DAT)' },
    { code: 'feuille',    l: 'Feuille d’accident (IJSS)' }
  ];
  const ET_ST = {
    fait:     { l: 'Fait',     c: '#34d399', i: IC.check },
    en_cours: { l: 'En cours', c: '#f59e0b', i: IC.clock },
    a_faire:  { l: 'À faire',  c: '#8095b4', i: IC.file }
  };

  function atCourant(all) {
    const ats = all.filter(a => a.type === 'at' && enCours(a))
      .sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
    return ats[0] || null;
  }

  function etatEtape(absence, code) {
    if (code === 'cerfa' && absence.declareeCpam) return 'fait';
    const r = EXTRA.etapes.find(x => String(x.absence_id) === String(absence.id) && x.code === code);
    return (r && ET_ST[r.statut]) ? r.statut : 'a_faire';
  }

  function renderDeclAT(all) {
    const box = el('abDeclAT'); if (!box) return;
    const a = atCourant(all);
    if (!a) {
      box.innerHTML = `<div class="abv-tint-red">
        <div class="abv-h"><span style="color:#fca5a5">${svg(IC.file)}</span>
          <span class="abv-h-t red">Déclaration AT</span></div>
        <div class="v2-blk-vide">Aucun accident du travail en cours.</div></div>`;
      return;
    }
    const heures = Math.floor((Date.now() - new Date(a.debut + 'T00:00:00')) / 3600000);
    const delai = a.declareeCpam ? 'DAT transmise' : (heures < 48 ? 'Délai 48 h — reste ' + (48 - heures) + ' h' : 'Délai 48 h dépassé');
    const ed = canEdit();
    const steps = ETAPES.map(s => {
      const k = etatEtape(a, s.code), st = ET_ST[k];
      const clic = ed && s.code !== 'cerfa'
        ? ` role="button" tabindex="0" style="cursor:pointer" onclick="ABV.cycleEtape('${a.id}','${s.code}')" title="Changer l'état"`
        : '';
      return `<div class="abv-line" style="padding:9px 0"${clic}>
        <span class="abv-step-ico" style="--sc:${st.c}">${svg(st.i, 2.4)}</span>
        <span class="abv-line-b" style="font-size:12px;color:var(--v2-t3)">${esc(s.l)}</span>
        <span class="abv-line-plain" style="--sc:${st.c}">${st.l}</span>
      </div>`;
    }).join('');

    box.innerHTML = `<div class="abv-tint-red">
      <div class="abv-h"><span style="color:#fca5a5">${svg(IC.file)}</span>
        <span class="abv-h-t red">Déclaration AT — ${esc(nomOf(a))}</span>
        <span class="abv-h-x">${esc(delai)}</span></div>
      ${steps}
      ${ed ? `<button type="button" class="abv-cta" onclick="ABV.transmettreDAT('${a.id}')" ${a.declareeCpam ? 'disabled style="opacity:.55;cursor:default"' : ''}>
        ${svg(IC.send, 2.2)}${a.declareeCpam ? 'DAT déjà transmise à la CPAM' : 'Transmettre la DAT à la CPAM'}</button>` : ''}
    </div>`;
  }

  ABV.cycleEtape = async function (absenceId, code) {
    if (!canEdit()) return;
    const a = data().find(x => String(x.id) === String(absenceId)); if (!a) return;
    const order = ['a_faire', 'en_cours', 'fait'];
    const next = order[(order.indexOf(etatEtape(a, code)) + 1) % order.length];
    try {
      const etab = await sbGetEtablissementId();
      const row = {
        etablissement_id: etab, absence_id: absenceId, code,
        statut: next, fait_le: next === 'fait' ? tdy() : null,
        updated_at: new Date().toISOString()
      };
      const { data: saved, error } = await supabaseClient
        .from('absences_at_etapes').upsert(row, { onConflict: 'absence_id,code' }).select();
      if (error) throw error;
      const i = EXTRA.etapes.findIndex(x => String(x.absence_id) === String(absenceId) && x.code === code);
      if (i >= 0) EXTRA.etapes[i] = saved[0]; else EXTRA.etapes.push(saved[0]);
      ABV.render();
    } catch (e) {
      console.warn('[absences-v2] écriture absences_at_etapes refusée', e);
      EXTRA.missing['absences_at_etapes'] = isMissingTable(e);
      refuse('absences_at_etapes');
    }
  };

  ABV.transmettreDAT = async function (absenceId) {
    if (!canEdit()) return;
    const a = data().find(x => String(x.id) === String(absenceId));
    if (!a || a.declareeCpam) return;
    try {
      const saved = await sbSaveAbsence({ ...a, declareeCpam: true });
      const list = data();
      const i = list.findIndex(x => x.id === absenceId);
      if (i >= 0) list[i] = saved;
      if (typeof auditLog === 'function') auditLog('absence_dat_cpam', 'DAT transmise — ' + nomOf(a));
      if (typeof toast === 'function') toast('DAT marquée comme transmise à la CPAM', 'success');
      ABV.render();
    } catch (e) {
      console.error('[transmettreDAT]', e);
      if (typeof toast === 'function') toast('Erreur : ' + (e && (e.message || e)), 'error');
    }
  };

  /* ══ VISITES MÉDICALES ═════════════════════════════════════════════════ */
  function renderVisites(all) {
    const box = el('abVisites'); if (!box) return;
    const list = visitesAFaire(all).concat(all.filter(a => enCours(a) && a.visiteDate && !a.visiteFaite));
    const seen = {}, uniq = list.filter(a => (seen[a.id] ? false : (seen[a.id] = true)));
    box.innerHTML = `<div class="v2-blk">
      <div class="abv-h"><span style="color:#22d3ee">${svg(IC.med)}</span>
        <span class="abv-h-t">Visites médicales à planifier</span>
        <span class="abv-h-x">${uniq.length}</span></div>
      ${uniq.length ? uniq.map(a => {
        let tag, c;
        if (!a.visiteDate) { tag = 'À prévoir'; c = '#22d3ee'; }
        else if (a.visiteDate < tdy()) { tag = 'Échue'; c = '#ef4444'; }
        else { tag = fdate(a.visiteDate); c = '#f59e0b'; }
        const motif = a.type === 'at' ? 'Reprise après AT'
          : a.type === 'maternite' ? 'Reprise après maternité'
          : a.type === 'maladie_pro' ? 'Reprise après maladie professionnelle'
          : jours(a) >= 30 ? 'Arrêt de ' + jours(a) + ' jours' : 'Visite de reprise';
        return `<div class="abv-line">
          <span class="abv-av abv-av-sm" style="background:${colorOf(a)}">${esc(iniOf(a))}</span>
          <div class="abv-line-b"><div class="abv-line-t">${esc(nomOf(a))}</div>
            <div class="abv-line-s">${esc(motif)}</div></div>
          <span class="abv-line-tag" style="--sc:${c}">${esc(tag)}</span>
        </div>`;
      }).join('') : '<div class="v2-blk-vide">Aucune visite de reprise à planifier.</div>'}
    </div>`;
  }

  /* ══ IMPACT PLANNING (absences_impact) ═════════════════════════════════ */
  const COUV = {
    non_couvert: { l: 'Non couvert', c: '#ef4444' },
    vacataire:   { l: 'Vacataire',   c: '#f59e0b' },
    cdd:         { l: 'CDD en place', c: '#10b981' },
    interne:     { l: 'Couvert en interne', c: '#22d3ee' }
  };

  function renderImpact(all) {
    const box = el('abImpact'); if (!box) return;
    const byId = {}; all.forEach(a => { byId[String(a.id)] = a; });
    const rows = EXTRA.impact
      .filter(r => byId[String(r.absence_id)])
      .map(r => ({ r, a: byId[String(r.absence_id)] }))
      .filter(x => enCours(x.a));
    const manque = EXTRA.missing['absences_impact'];
    box.innerHTML = `<div class="v2-blk">
      <div class="abv-h"><span style="color:#f59e0b">${svg(IC.cal)}</span>
        <span class="abv-h-t">Impact planning</span></div>
      ${rows.length ? rows.map(x => {
        const cv = COUV[x.r.couverture] || COUV.non_couvert;
        return `<div class="abv-line" style="padding:9px 0">
          <span class="abv-dot" style="--sc:${cv.c}"></span>
          <div class="abv-line-b"><div class="abv-line-t">${esc(x.r.poste || '—')}</div>
            <div class="abv-line-s">${esc(periode(x.a))} (${esc(nomOf(x.a))})${x.r.detail ? ' · ' + esc(x.r.detail) : ''}</div></div>
          <span class="abv-line-plain" style="--sc:${cv.c}">${cv.l}</span>
        </div>`;
      }).join('') : `<div class="v2-blk-vide">${manque
        ? 'Postes impactés non disponibles — exécutez ' + SQL_FILE + '.'
        : 'Aucun poste impacté renseigné.'}</div>`}
      <a class="abv-cta abv-cta-rose" href="planning-equipe.html">${svg(IC.swap, 2.2)}Chercher un remplaçant</a>
    </div>`;
  }

  /* ══ COÛT DES ABSENCES (absences_couts) ════════════════════════════════ */
  const POSTES = [
    { code: 'maintien_salaire', l: 'Maintien de salaire', c: '#fdba74' },
    { code: 'remplacement',     l: 'Coût remplacements',  c: '#fca5a5' },
    { code: 'ijss',             l: 'IJSS récupérées',     c: '#34d399' }
  ];

  function renderCout() {
    const box = el('abCout'); if (!box) return;
    const annee = new Date().getFullYear();
    const rows = EXTRA.couts.filter(r => Number(r.annee) === annee);
    const sum = {}; rows.forEach(r => { sum[r.poste] = (sum[r.poste] || 0) + Number(r.montant || 0); });
    const total = POSTES.reduce((s, p) => s + (sum[p.code] || 0), 0);
    const vide = !rows.length;
    const manque = EXTRA.missing['absences_couts'];
    box.innerHTML = `<div class="abv-tint-orange">
      <div class="v2-blk-t abv-h-t orange" style="margin-bottom:6px">Coût des absences</div>
      <div class="abv-cout-n">${vide ? '—' : eur(total)}</div>
      <div class="abv-cout-s">cumul ${annee}</div>
      ${POSTES.map(p => `
        <div class="abv-cout-r"><span class="abv-cout-l">${p.l}</span>
          <span class="abv-cout-v" style="--sc:${p.c}">${sum[p.code] == null ? '—' : eur(sum[p.code])}</span></div>`).join('')}
      ${vide ? `<div class="abv-hint" style="margin:14px 0 0">${manque
        ? 'Montants non disponibles — exécutez ' + SQL_FILE + '.'
        : 'Aucun montant saisi pour ' + annee + '.'}</div>` : ''}
    </div>`;
  }

  /* ══ FACTEUR BRADFORD ══════════════════════════════════════════════════ */
  function renderBradford(all) {
    const box = el('abBradford'); if (!box) return;
    const limite = new Date(); limite.setFullYear(limite.getFullYear() - 1);
    const lim = limite.toISOString().slice(0, 10);
    const par = {};
    all.filter(a => a.debut >= lim).forEach(a => {
      const k = String(a.employeId || a.employeNom);
      if (!par[k]) par[k] = { a, s: 0, d: 0 };
      par[k].s += 1; par[k].d += jours(a);
    });
    const list = Object.values(par)
      .map(x => ({ ...x, score: x.s * x.s * x.d }))
      .sort((x, y) => y.score - x.score).slice(0, 4);
    box.innerHTML = `<div class="v2-blk">
      <div class="abv-h" style="margin-bottom:6px"><span style="color:#fb7185">${svg(IC.med)}</span>
        <span class="abv-h-t">Facteur Bradford</span></div>
      <div class="abv-hint">Absences courtes &amp; répétées · 12 derniers mois (S² × D)</div>
      ${list.length ? list.map(x => {
        const c = x.score >= 200 ? '#ef4444' : x.score >= 50 ? '#f59e0b' : '#34d399';
        return `<div class="abv-line" style="padding:9px 0">
          <span class="abv-av abv-av-xs" style="background:${colorOf(x.a)};width:28px;height:28px">${esc(iniOf(x.a))}</span>
          <div class="abv-line-b"><div class="abv-line-t">${esc(nomOf(x.a))}</div>
            <div class="abv-line-s">${x.s} absence${x.s > 1 ? 's' : ''} · ${x.d} jour${x.d > 1 ? 's' : ''}</div></div>
          <span class="abv-score" style="--sc:${c}">${x.score}</span>
        </div>`;
      }).join('') : '<div class="v2-blk-vide">Aucune absence sur 12 mois.</div>'}
    </div>`;
  }

  /* ══ RENDU GLOBAL ══════════════════════════════════════════════════════ */
  ABV.render = function () {
    const all = data();
    const fEmp = (el('abFilterEmploye') || {}).value || '';
    const fType = (el('abFilterType') || {}).value || '';
    let list = all;
    if (fEmp) list = list.filter(a => String(a.employeId) === fEmp);
    if (fType) list = list.filter(a => a.type === fType);
    list = [...list].sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));

    renderStats(all);
    renderAlerts(all);
    renderChips(all);
    renderTable(list);
    renderRegistre(all);
    renderTaux(all);
    renderMotifs(all);
    renderRetours(all);
    renderDeclAT(all);
    renderVisites(all);
    renderImpact(all);
    renderCout();
    renderBradford(all);
  };

  /* L'ancienne fonction de rendu délègue au module V2. */
  window.renderAbsences = ABV.render;

  /* ══ MODALE ════════════════════════════════════════════════════════════ */
  ABV.pickType = function (v) {
    const sel = el('abType');
    if (sel) sel.value = v;
    ABV.syncSeg();
    if (typeof _abToggleDeclareeWrap === 'function') _abToggleDeclareeWrap();
    if (typeof abModalSync === 'function') abModalSync();
  };
  ABV.syncSeg = function () {
    const v = (el('abType') || {}).value || 'maladie';
    document.querySelectorAll('#abSeg .v2-seg-o').forEach(b => b.classList.toggle('on', b.dataset.t === v));
  };
  ABV.syncDuree = function () {
    const box = el('abDuree'); if (!box) return;
    const d = (el('abDebut') || {}).value, f = (el('abFin') || {}).value;
    if (!d) { box.className = 'v2-note v2-note-warn'; box.innerHTML = svg(IC.clock) + '<span>Choisissez une date de début.</span>'; return; }
    if (!f) { box.className = 'v2-note v2-note-warn'; box.innerHTML = svg(IC.clock) + '<span>Arrêt sans date de fin — compté comme en cours.</span>'; return; }
    if (d > f) { box.className = 'v2-note v2-note-err'; box.innerHTML = svg(IC.cross) + '<span>La date de fin doit être après la date de début.</span>'; return; }
    const j = Math.ceil((new Date(f) - new Date(d)) / 86400000) + 1;
    box.className = 'v2-note v2-note-ok';
    box.innerHTML = svg(IC.check) + '<span>' + j + ' jour' + (j > 1 ? 's' : '') + ' d’absence.</span>';
  };
  ABV.syncFile = function () {
    const inp = el('abFichier'), lbl = el('abFileName');
    if (!lbl) return;
    const f = inp && inp.files && inp.files[0];
    lbl.textContent = f ? f.name : 'Joindre l’arrêt de travail ou le certificat (PDF, JPG)';
  };

  /* Habillage de la modale à l'ouverture (le corps reste géré par absences.js) */
  const _open = window.openAbsenceModal;
  if (typeof _open === 'function') {
    window.openAbsenceModal = function (id) {
      _open(id);
      ABV.syncSeg(); ABV.syncDuree(); ABV.syncFile();
    };
  }

  /* ══ INIT ══════════════════════════════════════════════════════════════ */
  function wire() {
    ['abDebut', 'abFin'].forEach(i => el(i) && el(i).addEventListener('change', ABV.syncDuree));
    el('abFichier') && el('abFichier').addEventListener('change', ABV.syncFile);
    el('abFilterEmploye') && el('abFilterEmploye').addEventListener('change', ABV.render);
    ABV.syncSeg(); ABV.syncDuree(); ABV.syncFile();
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    /* initAbsences() (js/absences.js) tourne en parallèle : on charge les
       tables complémentaires puis on redessine. */
    ABV.loadExtra().then(ABV.render).catch(e => { console.warn('[absences-v2]', e); ABV.render(); });
  });
})();
