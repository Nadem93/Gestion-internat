// ── FICHE RÉSIDENT — DESIGN V2 (dossier usager) ──
// Reproduit « Fiche résident - refonte (bento) » : bandeau d'identité, onglets,
// corps en deux colonnes (principale + rail droit).
// Les modules historiques de la fiche restent rendus par resident.html ; ils sont
// répartis dans les onglets par renderViewMode().

// Catalogues chargés au démarrage de la page (voir resident.html).
let _residentChambres = [];
let _residentEmployes = [];

let RV2_TAB = 'apercu';
const RV2_TABS = [
  { k: 'apercu',     l: "Vue d'ensemble" },
  { k: 'projet',     l: 'Projet personnalisé' },
  { k: 'medical',    l: 'Médical' },
  { k: 'quotidien',  l: 'Vie quotidienne' },
  { k: 'historique', l: 'Historique' },
  { k: 'admin',      l: 'Administratif' },
  { k: 'documents',  l: 'Documents' }
];

const RV2_OK = '#10b981', RV2_WARN = '#f59e0b', RV2_DANGER = '#ef4444', RV2_MUTED = '#64748b';

// Constantes recopiées ici pour que ce fichier soit autonome : OBJ_STATUTS n'est
// déclaré que dans le script inline de resident.html et dans js/objectifs.js,
// REGIME_TYPES/TEXTURES seulement dans js/repas.js — aucun n'est chargé par
// l'annuaire. Les noms sont préfixés pour ne jamais entrer en collision.
// Source de référence : js/objectifs.js et js/repas.js.
const RV2_OBJ_STATUTS = {
  non_commence: { label: 'Non commencé', color: '#64748b' },
  en_cours:     { label: 'En cours',     color: '#d97706' },
  atteint:      { label: 'Atteint',      color: '#16a34a' },
  abandonne:    { label: 'Abandonné',    color: '#dc2626' }
};
const RV2_REGIMES = {
  normal:        { label: 'Normal',        color: '#64748b' },
  vegetarien:    { label: 'Végétarien',    color: '#16a34a' },
  sansporc:      { label: 'Sans porc',     color: '#0891b2' },
  halal:         { label: 'Halal',         color: '#0d9488' },
  casher:        { label: 'Casher',        color: '#7c3aed' },
  diabetique:    { label: 'Diabétique',    color: '#d97706' },
  hyposode:      { label: 'Hyposodé',      color: '#0369a1' },
  hypocalorique: { label: 'Hypocalorique', color: '#be185d' },
  autre:         { label: 'Autre',         color: '#dc2626' }
};
const RV2_TEXTURES = { normale: 'Normale', hachee: 'Hachée', mixee: 'Mixée' };
const RV2_MOIS = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const RV2_JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

// ── helpers ──────────────────────────────────────────────────────────

function rv2Blk(titre, corps, opts) {
  const o = opts || {};
  const head = `<div class="v2-blk-h"><div class="v2-blk-t">${escHtml(titre)}</div>${o.pills || ''}${o.lien || ''}</div>`;
  return `<div class="v2-blk${o.rail ? ' v2-rail-blk' : ''}"${o.id ? ` id="${o.id}"` : ''}>${head}${corps}</div>`;
}

function rv2Vide(msg) { return `<div class="v2-blk-vide">${escHtml(msg)}</div>`; }
function rv2Pill(txt, color) { return `<span class="v2-pill" style="--pc:${color}">${escHtml(txt)}</span>`; }
function rv2Chip(txt, color) { return `<span class="v2-chip" style="--pc:${color}">${escHtml(txt)}</span>`; }
function rv2Prog(pct, color) { return `<div class="v2-prog"><span style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></span></div>`; }

// « Camille Morel » → « C. Morel » (format des faits de la maquette).
function rv2Abbrev(nom) {
  const p = (nom || '').trim().split(/\s+/).filter(Boolean);
  return p.length < 2 ? (nom || '') : p[0][0].toUpperCase() + '. ' + p.slice(1).join(' ');
}

function rv2Ini(nom) {
  return (nom || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('') || '?';
}

// L'unité n'est pas stockée sur le résident : elle vient de la chambre occupée.
function rv2Unite(r) {
  const nom = (r.chambre || '').trim().toLowerCase();
  if (!nom || !_residentChambres.length) return '';
  const ch = _residentChambres.find(c => (c.nom || '').trim().toLowerCase() === nom);
  return (ch && ch.unite) || '';
}

// Le téléphone d'un référent n'est pas sur le résident : jointure par nom sur les employés.
function rv2TelEmploye(nom) {
  const n = (nom || '').trim().toLowerCase();
  if (!n || !_residentEmployes.length) return '';
  const e = _residentEmployes.find(x => `${x.prenom || ''} ${x.nom || ''}`.trim().toLowerCase() === n);
  return (e && (e.telephone || e.tel)) || '';
}

// « aujourd'hui 08:42 », « hier 15:10 », « lun. 14:00 », sinon la date.
function rv2Quand(dateStr, heure) {
  if (!dateStr) return '';
  const d = String(dateStr).slice(0, 10);
  const h = (heure || '').slice(0, 5);
  const suff = h ? ' ' + h : '';
  const now = new Date(today() + 'T00:00:00');
  const then = new Date(d + 'T00:00:00');
  const j = Math.round((now - then) / 86400000);
  if (j === 0) return "aujourd'hui" + suff;
  if (j === 1) return 'hier' + suff;
  if (j > 1 && j < 7) return RV2_JOURS[then.getDay()] + suff;
  return formatDate(d) + suff;
}

// ── BANDEAU D'IDENTITÉ ───────────────────────────────────────────────

function rv2Fact(k, v) {
  return `<div class="v2-fact"><div class="v2-fact-k">${escHtml(k)}</div><div class="v2-fact-v">${escHtml(v || '—')}</div></div>`;
}

function residentHeroV2(r) {
  const color = safeColor(r.color, '#818cf8');
  const todayPresences = _residentPresencesRange[today()] || {};
  const presenceStatus = todayPresences[currentResidentId] || (r.statut === 'sorti' ? 'sorti' : r.statut);

  const av = r.photo
    ? `<div class="v2-hero-av"><img src="${sanitizeUrl(r.photo)}" alt=""/></div>`
    : `<div class="v2-hero-av" style="background:${color}">${initials(r.prenom, r.nom)}</div>`;

  const meta = [];
  if (r.dob) meta.push(`${age(r.dob)}`, `né${r.genre === 'F' ? 'e' : ''} le ${formatDate(r.dob)}`);
  const dossier = r.dossier || r.dossierA;
  if (dossier) meta.push(`dossier ${dossier}`);

  return `<div class="v2-hero-res" style="--rc:${color}">
    ${av}
    <div style="min-width:0">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div class="v2-hero-nom">${escHtml(r.prenom || '')} ${escHtml(r.nom || '')}</div>
        ${statusBadge(presenceStatus)}
      </div>
      ${meta.length ? `<div class="v2-hero-meta">${escHtml(meta.join(' · '))}</div>` : ''}
    </div>
    <div class="v2-facts">
      ${rv2Fact('Chambre', r.chambre)}
      ${rv2Fact('Unité', rv2Unite(r))}
      ${rv2Fact('Entrée', r.entree ? formatDate(r.entree) : '')}
      ${rv2Fact('Référent', rv2Abbrev(r.referent))}
    </div>
  </div>`;
}

// ── ONGLETS ──────────────────────────────────────────────────────────

function rv2TabBar() {
  return `<div class="v2-tabs no-print">${RV2_TABS.map(t =>
    `<button type="button" class="v2-tab${RV2_TAB === t.k ? ' on' : ''}" onclick="rv2SetTab('${t.k}')">${escHtml(t.l)}</button>`
  ).join('')}</div>`;
}

function rv2SetTab(k) {
  RV2_TAB = k;
  // Gardes typeof : ce fichier est aussi chargé par residents.html, où
  // getResident/renderViewMode (définis dans resident.html) n'existent pas.
  if (typeof getResident !== 'function' || typeof renderViewMode !== 'function') return;
  const r = getResident();
  if (r) renderViewMode(r);
  const c = document.getElementById('residentContent');
  if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── COLONNE PRINCIPALE : PROJET PERSONNALISÉ ─────────────────────────

// Un objectif n'a pas de pourcentage en base : il est calculé sur la progression
// de ses axes de travail. Sans axe, on ne dispose que du statut.
function rv2ObjPct(sv) {
  const axes = (sv && sv.axes) || [];
  if (!axes.length) return null;
  return Math.round(axes.reduce((a, x) => a + (Number(x.progression) || 0), 0) / axes.length);
}

function rv2Projet(r) {
  const catalogue = DB.get(DB.keys.objectives) || [];
  const suivi = r.objectifsSuivi || {};
  const ids = r.objectifs || [];

  const objs = ids.map(id => {
    const def = catalogue.find(o => String(o.id) === String(id)) || {};
    const sv = suivi[id] || {};
    const st = RV2_OBJ_STATUTS[sv.statut] || RV2_OBJ_STATUTS.non_commence;
    const pct = rv2ObjPct(sv);
    return { id, label: def.name || 'Objectif', st, sv, pct };
  });

  if (!objs.length) {
    return rv2Blk('Projet personnalisé', rv2Vide('Aucun objectif rattaché à ce résident.'));
  }

  const atteints = objs.filter(o => o.sv.statut === 'atteint').length;
  const ppe = (DB.get(DB.keys.ppe) || []).filter(p => String(p.residentId) === String(currentResidentId) && p.statut !== 'termine');
  const revision = ppe.map(p => p.dateRevision).filter(Boolean).sort()[0];

  const pills = rv2Pill(`${atteints}/${objs.length} atteint${atteints > 1 ? 's' : ''}`, RV2_OK)
    + (revision ? ' ' + rv2Pill('Révision ' + formatDate(revision), RV2_WARN) : '');
  const lien = r.referent ? `<div style="margin-left:auto;font-size:11.5px;color:var(--v2-t6)">Réf. ${escHtml(rv2Abbrev(r.referent))}</div>` : '';

  const corps = `<div class="v2-objs">${objs.map(o => {
    const c = o.st.color;
    // Sans axe de travail, aucun pourcentage n'est mesurable : on affiche le statut.
    const droite = o.pct == null
      ? `<span class="v2-obj-p" style="color:${c}">${escHtml(o.st.label)}</span>`
      : `<span class="v2-obj-p" style="color:${c}">${o.pct}%</span>`;
    const barre = o.pct == null
      ? rv2Prog(o.sv.statut === 'atteint' ? 100 : 0, c)
      : rv2Prog(o.pct, c);
    const note = o.sv.note || (o.pct == null && o.sv.statut ? 'Aucun axe de travail chiffré' : '');
    return `<div>
      <div class="v2-obj-h"><span class="v2-obj-l">${escHtml(o.label)}</span>${droite}</div>
      ${barre}
      ${note ? `<div class="v2-obj-n">${escHtml(note)}</div>` : ''}
    </div>`;
  }).join('')}</div>`;

  return rv2Blk('Projet personnalisé', corps, { pills, lien });
}

// ── COLONNE PRINCIPALE : SUIVI MÉDICAL ───────────────────────────────

function rv2Medical(r) {
  const s = r.sante || {};
  const traitements = s.traitements || [];
  const t0 = today();

  const meds = traitements.length ? `<div style="display:flex;flex-direction:column;gap:8px">${
    traitements.map(t => {
      const encours = !t.fin || t.fin >= t0;
      const c = encours ? RV2_OK : RV2_MUTED;
      const freq = t.frequence || t.posologie || '';
      return `<div class="v2-line">
        <span class="v2-dot" style="background:${c}"></span>
        <span class="v2-line-n">${escHtml(t.nom || '—')}</span>
        <span class="v2-line-m">${escHtml(freq || (encours ? 'en cours' : 'terminé'))}</span>
      </div>`;
    }).join('')}</div>` : rv2Vide('Aucun traitement enregistré.');

  // La maquette affiche « Pathologies & risques » ; ce champ n'existe pas en base.
  // On expose ce qui est réellement saisi : allergies et notes médicales.
  const vig = [];
  if (r.allergies) vig.push(rv2Chip(r.allergies, RV2_DANGER));
  if (s.groupeSanguin) vig.push(rv2Chip('Groupe ' + s.groupeSanguin, '#22d3ee'));
  // r.dmp est un état ('actif' | 'en_attente' | 'non_ouvert'), pas un booléen.
  const DMP = { actif: ['DMP actif', RV2_OK], en_attente: ['DMP en attente', RV2_WARN], non_ouvert: ['DMP non ouvert', RV2_MUTED] };
  if (DMP[r.dmp]) vig.push(rv2Chip(DMP[r.dmp][0], DMP[r.dmp][1]));

  const reg = r.regime || {};
  const dietChips = [];
  if (reg.type) {
    const rt = RV2_REGIMES[reg.type] || { label: reg.type, color: RV2_MUTED };
    dietChips.push(rv2Chip(reg.type === 'autre' && reg.autreLabel ? reg.autreLabel : rt.label, rt.color));
  }
  if (reg.texture && reg.texture !== 'normale') {
    const tx = RV2_TEXTURES[reg.texture] || reg.texture;
    dietChips.push(rv2Chip('Texture ' + tx.toLowerCase(), '#8b5cf6'));
  }
  if (reg.allergiesAlim) dietChips.push(rv2Chip(reg.allergiesAlim, RV2_WARN));

  const corps = `<div class="v2-med2">
    <div>
      <div class="v2-blk-sub">Traitements</div>
      ${meds}
    </div>
    <div>
      <div class="v2-blk-sub">Allergies &amp; vigilances</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px">${
        vig.length ? vig.join('') : rv2Vide('Rien de signalé.')}</div>
      <div class="v2-blk-sub">Régime</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px">${
        dietChips.length ? dietChips.join('') : rv2Vide('Aucun régime particulier.')}</div>
      ${s.notesMedicales ? `<div class="v2-obj-n" style="margin-top:12px;white-space:pre-wrap">${escHtml(s.notesMedicales)}</div>` : ''}
    </div>
  </div>`;

  return rv2Blk('Suivi médical', corps);
}

// ── COLONNE PRINCIPALE : TRANSMISSIONS ───────────────────────────────

const RV2_SHIFTS = { matin: 'Matin', aprem: 'Après-midi', soir: 'Soir', nuit: 'Nuit' };
const RV2_CATS = {
  sante: 'Santé', medicament: 'Médicament', comportement: 'Comportement',
  alimentation: 'Alimentation', hygiene: 'Hygiène', activite: 'Activité',
  famille: 'Famille', sortie: 'Sortie', administratif: 'Administratif',
  maintenance: 'Maintenance', urgent: 'Urgent'
};
const RV2_CAT_COLORS = {
  sante: '#ef4444', medicament: '#ec4899', comportement: '#f97316',
  alimentation: '#f59e0b', hygiene: '#0ea5e9', activite: '#10b981',
  famille: '#6366f1', sortie: '#14b8a6', administratif: '#64748b',
  maintenance: '#a16207', urgent: '#dc2626'
};

function rv2Transmissions(r) {
  const nomComplet = `${r.prenom || ''} ${r.nom || ''}`.trim();
  const list = (_residentTransmissionsAll || [])
    .filter(t => String(t.residentId) === String(currentResidentId) || t.residentName === nomComplet)
    .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))
    .slice(0, 5);

  if (!list.length) {
    return rv2Blk('Transmissions récentes', rv2Vide('Aucune transmission pour ce résident.'),
      { lien: `<a class="v2-blk-lien" href="transmissions.html">Tout voir</a>` });
  }

  const corps = `<div style="display:flex;flex-direction:column;gap:2px">${list.map((t, i) => {
    const c = RV2_CAT_COLORS[t.cat] || '#818cf8';
    const titre = [RV2_SHIFTS[t.shift], RV2_CATS[t.cat]].filter(Boolean).join(' · ') || 'Transmission';
    const heure = (t.createdAt || '').slice(11, 16);
    return `<div class="v2-tl2-row">
      <div class="v2-tl2-rail">
        <span class="v2-tl2-dot" style="--pc:${c};background:${c}"></span>
        ${i < list.length - 1 ? '<span class="v2-tl2-bar"></span>' : ''}
      </div>
      <div class="v2-tl2-b">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          <span class="v2-tl2-t">${escHtml(titre)}</span>
          <span class="v2-tl2-h">${escHtml(rv2Quand(t.date, heure))}</span>
          ${t.priority === 'urgent' ? rv2Pill('Urgent', RV2_DANGER) : ''}
        </div>
        <div class="v2-tl2-x">${escHtml(t.content || '')}</div>
        ${t.authorName ? `<div class="v2-tl2-h" style="margin-top:5px">${escHtml(t.authorName)}</div>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;

  return rv2Blk('Transmissions récentes', corps,
    { lien: `<a class="v2-blk-lien" href="transmissions.html">Tout voir</a>` });
}

// ── RAIL : ÉTAT CIVIL ────────────────────────────────────────────────

function rv2EtatCivil(r) {
  const s = r.sante || {};
  const kv = [];
  const push = (k, v) => { if (v) kv.push({ k, v }); };

  push('Né(e) le', r.dob ? `${formatDate(r.dob)} · ${age(r.dob)}` : '');
  push('Genre', r.genre === 'M' ? 'Masculin' : r.genre === 'F' ? 'Féminin' : '');
  push('N° Sécu', r.nss);
  push('INS', r.ins);
  push('Mesure', r.protection ? (PROTECTION_LABELS[r.protection] || r.protection) : 'Aucune');
  push('Protecteur', r.protectionNom);
  push('Groupe sanguin', s.groupeSanguin);
  push('Entrée', r.entree ? formatDate(r.entree) : '');

  const corps = kv.length
    ? `<div style="display:flex;flex-direction:column;gap:12px">${kv.map(x =>
        `<div class="v2-kv"><span class="v2-kv-k">${escHtml(x.k)}</span><span class="v2-kv-v">${escHtml(x.v)}</span></div>`
      ).join('')}</div>`
    : rv2Vide('Aucune information d\'état civil renseignée.');

  return rv2Blk('État civil', corps, { rail: true });
}

// ── RAIL : CONTACTS ──────────────────────────────────────────────────

// Aucune table de contacts structurés par résident : la liste est reconstruite
// à partir des champs dédiés (référent, médecin, tuteur, protection).
// r.contacts est un texte libre, affiché tel quel en complément.
function rv2Contacts(r) {
  const items = [];
  const add = (nom, role, tel, color) => { if (nom) items.push({ nom, role, tel: tel || '', color }); };

  add(r.referent, 'Référent', rv2TelEmploye(r.referent), '#10b981');
  add(r.coReferent, 'Co-référent', rv2TelEmploye(r.coReferent), '#22d3ee');
  add(r.medecin, 'Médecin traitant', r.medecinTel, '#818cf8');
  add(r.tuteur, 'Tuteur légal', r.tuteurTel, '#f59e0b');
  add(r.protectionNom, r.protection ? (PROTECTION_LABELS[r.protection] || 'Protection') : 'Protection', r.protectionTel, '#8b5cf6');
  (r.droitsVisite || []).forEach(v => add(v.personne, v.lien || 'Proche', '', '#ec4899'));

  if (!items.length && !r.contacts) {
    return rv2Blk('Contacts', rv2Vide('Aucun contact renseigné.'), { rail: true });
  }

  const liste = items.map(c => {
    const inner = `<span class="v2-ct-av" style="background:${c.color}">${escHtml(rv2Ini(c.nom))}</span>
      <div style="min-width:0">
        <div class="v2-ct-n">${escHtml(c.nom)}</div>
        <div class="v2-ct-r">${escHtml([c.role, c.tel].filter(Boolean).join(' · '))}</div>
      </div>`;
    return c.tel
      ? `<a class="v2-ct" href="tel:${escHtml(c.tel.replace(/\s/g, ''))}">${inner}</a>`
      : `<div class="v2-ct">${inner}</div>`;
  }).join('');

  const libre = r.contacts
    ? `<div class="v2-obj-n" style="margin-top:12px;white-space:pre-wrap">${escHtml(r.contacts)}</div>`
    : '';

  return rv2Blk('Contacts', `<div style="display:flex;flex-direction:column;gap:10px">${liste}</div>${libre}`, { rail: true });
}

// ── RAIL : DOSSIER ADMINISTRATIF ─────────────────────────────────────

// La maquette affiche un « % complet ». Aucune notion de document obligatoire
// n'existe en base : on mesure donc la validité des échéances, pas la complétude.
function rv2Documents(r) {
  const docs = docResByResident(currentResidentId) || [];
  if (!docs.length) {
    return rv2Blk('Dossier administratif', rv2Vide('Aucun document déposé.'), {
      rail: true, lien: `<a class="v2-blk-lien" href="documents.html?residentId=${currentResidentId}">Ajouter</a>`
    });
  }

  const avecEcheance = docs.filter(d => d.dueDate);
  const valides = avecEcheance.filter(d => docExpiryStatus(d).dot === '#16a34a').length;
  const pct = avecEcheance.length ? Math.round(valides / avecEcheance.length * 100) : null;

  const entete = pct == null
    ? `<span style="margin-left:auto;font-size:11px;font-weight:700;color:var(--v2-t6)">${docs.length} document${docs.length > 1 ? 's' : ''}</span>`
    : `<span style="margin-left:auto;font-size:11px;font-weight:700;color:${pct === 100 ? RV2_OK : RV2_WARN}">${pct}% à jour</span>`;

  const barre = pct == null ? '' :
    `<div style="margin-bottom:14px">${rv2Prog(pct, pct === 100 ? RV2_OK : RV2_WARN)}</div>`;

  const liste = docs.slice(0, 6).map(d => {
    const st = docExpiryStatus(d);
    const date = d.docDate || d.uploadedAt || d.date;
    return `<div class="v2-doc">
      <svg viewBox="0 0 24 24" fill="none" stroke="${st.dot}" stroke-width="2.2" style="width:15px;height:15px;flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg>
      <span class="v2-doc-l" title="${escHtml(st.label)}">${escHtml(d.name || 'Document')}</span>
      <span class="v2-doc-d">${date ? escHtml(formatDate(String(date).slice(0, 10))) : ''}</span>
    </div>`;
  }).join('');

  const reste = docs.length > 6
    ? `<div class="v2-obj-n" style="margin-top:8px">+ ${docs.length - 6} autre${docs.length - 6 > 1 ? 's' : ''}</div>` : '';

  return rv2Blk('Dossier administratif', barre + `<div style="display:flex;flex-direction:column;gap:8px">${liste}</div>` + reste, {
    rail: true, pills: entete,
    lien: `<a class="v2-blk-lien" href="documents.html?residentId=${currentResidentId}">Tout voir</a>`
  });
}

// ── RAIL : PROCHAINS RENDEZ-VOUS ─────────────────────────────────────

function rv2Rdv(r) {
  const t0 = today();
  const items = [];

  // 1. Événements du planning rattachés au résident
  const nomComplet = `${r.prenom || ''} ${r.nom || ''}`.trim();
  (_residentPlanningCache || []).forEach(e => {
    if (String(e.residentId) !== String(currentResidentId) && e.residentName !== nomComplet) return;
    if (!e.date || e.date < t0) return;
    items.push({
      date: e.date, heure: (e.heure || e.time || '').slice(0, 5),
      titre: e.titre || e.title || 'Rendez-vous',
      sub: e.lieu || '', color: safeColor(e.color, '#818cf8')
    });
  });

  // 2. RDV médicaux non encore effectués
  ((r.sante || {}).rdv || []).forEach(v => {
    if (!v.date || v.date < t0 || v.fait) return;
    if (v.planningId) return; // déjà présent via le planning
    items.push({
      date: v.date, heure: (v.heure || '').slice(0, 5),
      titre: v.type || 'Rendez-vous médical',
      sub: [v.praticien, v.lieu].filter(Boolean).join(' · '), color: '#22d3ee'
    });
  });

  // 3. Révision du projet personnalisé
  (DB.get(DB.keys.ppe) || []).forEach(p => {
    if (String(p.residentId) !== String(currentResidentId) || p.statut === 'termine') return;
    if (!p.dateRevision || p.dateRevision < t0) return;
    items.push({
      date: p.dateRevision, heure: '', titre: 'Révision du projet',
      sub: rv2Abbrev(p.referent || r.referent || ''), color: RV2_WARN
    });
  });

  if (!items.length) {
    return rv2Blk('Prochains rendez-vous', rv2Vide('Aucun rendez-vous à venir.'), { rail: true });
  }

  items.sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));

  const corps = `<div style="display:flex;flex-direction:column;gap:10px">${items.slice(0, 4).map(a => {
    const d = new Date(a.date + 'T00:00:00');
    const sub = [a.heure, a.sub].filter(Boolean).join(' · ');
    return `<div class="v2-appt" style="--pc:${a.color}">
      <div class="v2-appt-d">
        <div class="v2-appt-j">${d.getDate()}</div>
        <div class="v2-appt-m">${RV2_MOIS[d.getMonth()]}</div>
      </div>
      <div style="min-width:0">
        <div class="v2-appt-t">${escHtml(a.titre)}</div>
        ${sub ? `<div class="v2-appt-s">${escHtml(sub)}</div>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;

  return rv2Blk('Prochains rendez-vous', corps, {
    rail: true, lien: `<a class="v2-blk-lien" href="planning.html">Agenda</a>`
  });
}

// ── RAIL COMPLET ─────────────────────────────────────────────────────

function rv2Rail(r) {
  return rv2EtatCivil(r) + rv2Contacts(r) + rv2Documents(r) + rv2Rdv(r);
}
