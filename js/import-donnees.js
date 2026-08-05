// ══════════════════════════════════════════════════════════════════════════
// IMPORT DE DONNÉES — reprise depuis un autre logiciel (CSV / Excel)
//
// Sert la reprise de données lors de l'arrivée d'un nouvel établissement :
// sans elle, il faudrait ressaisir tous les dossiers à la main.
//
// Le parcours se fait en 4 étapes : fichier → correspondance des colonnes →
// aperçu et contrôles → import et rapport.
//
// Pièges du terrain traités ici :
//  · Excel FR exporte en CSV avec « ; » et parfois en Windows-1252 (accents
//    cassés) → séparateur détecté, encodage re-décodé si nécessaire.
//  · BOM UTF-8 en tête de fichier → retiré.
//  · Champs entre guillemets contenant des séparateurs ou des retours à la
//    ligne → analyseur caractère par caractère (pas de split naïf).
//  · Dates au format français JJ/MM/AAAA → converties en AAAA-MM-JJ.
//  · Doublons : on ne réimporte pas une personne déjà présente.
// ══════════════════════════════════════════════════════════════════════════

const IMP = {
  type: 'residents',
  lignes: [],      // lignes du fichier (tableaux de valeurs)
  entetes: [],     // en-têtes détectés
  mapping: {},     // champ métier -> index de colonne
  nomFichier: ''
};

// ─── Modèles d'import : quels champs, lesquels sont requis, comment les
//     reconnaître automatiquement d'après l'en-tête du fichier. ───────────
const IMP_MODELES = {
  residents: {
    label: 'Résidents',
    icone: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    couleur: '#6366f1',
    sauver: 'sbSaveResident',
    lister: 'sbGetResidents',
    champs: [
      { cle: 'prenom',   label: 'Prénom',            requis: true,  alias: ['prenom', 'prénom', 'first name', 'firstname'] },
      { cle: 'nom',      label: 'Nom',               requis: true,  alias: ['nom', 'nom de famille', 'last name', 'lastname', 'patronyme'] },
      { cle: 'dob',      label: 'Date de naissance', type: 'date',  alias: ['dob', 'naissance', 'date de naissance', 'ne le', 'né le', 'birthdate'] },
      { cle: 'genre',    label: 'Genre (M/F)',                      alias: ['genre', 'sexe', 'civilite', 'civilité'] },
      { cle: 'chambre',  label: 'Chambre',                          alias: ['chambre', 'ch', 'room', 'logement'] },
      { cle: 'entree',   label: "Date d'entrée",     type: 'date',  alias: ['entree', 'entrée', "date d'entree", "date d'entrée", 'admission', 'arrivee', 'arrivée'] },
      { cle: 'statut',   label: 'Statut',                           alias: ['statut', 'status', 'situation'] },
      { cle: 'referent', label: 'Référent',                         alias: ['referent', 'référent', 'educateur referent', 'éducateur référent'] },
      { cle: 'medecin',  label: 'Médecin traitant',                 alias: ['medecin', 'médecin', 'medecin traitant', 'docteur'] },
      { cle: 'allergies',label: 'Allergies',                        alias: ['allergie', 'allergies'] },
      { cle: 'regime',   label: 'Régime alimentaire',               alias: ['regime', 'régime', 'regime alimentaire', 'texture'] },
      { cle: 'nss',      label: 'N° sécurité sociale',              alias: ['nss', 'securite sociale', 'sécurité sociale', 'nir', 'numero secu'] },
      { cle: 'ins',      label: 'INS',                              alias: ['ins', 'identite nationale de sante', 'identité nationale de santé'] },
      { cle: 'notes',    label: 'Notes',                            alias: ['notes', 'note', 'commentaire', 'observations', 'remarques'] }
    ],
    // clé de doublon : même nom + prénom (+ date de naissance si fournie)
    cleDoublon: e => [(e.prenom || '').trim().toLowerCase(), (e.nom || '').trim().toLowerCase(), (e.dob || '')].join('|')
  },

  employes: {
    label: 'Employés',
    icone: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    couleur: '#8b5cf6',
    sauver: 'sbSaveEmploye',
    lister: 'sbGetEmployes',
    champs: [
      { cle: 'prenom',        label: 'Prénom',           requis: true, alias: ['prenom', 'prénom', 'firstname'] },
      { cle: 'nom',           label: 'Nom',              requis: true, alias: ['nom', 'lastname', 'patronyme'] },
      { cle: 'poste',         label: 'Poste / fonction',               alias: ['poste', 'fonction', 'metier', 'métier', 'emploi', 'qualification'] },
      { cle: 'email',         label: 'E-mail',                         alias: ['email', 'e-mail', 'mail', 'courriel'] },
      { cle: 'telephone',     label: 'Téléphone',                      alias: ['telephone', 'téléphone', 'tel', 'tél', 'portable', 'mobile'] },
      { cle: 'dateEmbauche',  label: "Date d'embauche",  type: 'date', alias: ['embauche', "date d'embauche", 'entree', 'entrée', 'anciennete', 'ancienneté'] },
      { cle: 'statut',        label: 'Statut',                         alias: ['statut', 'status', 'actif'] },
      { cle: 'heuresContrat', label: 'Heures / semaine', type: 'nombre', alias: ['heures', 'heures contrat', 'temps de travail', 'quotite', 'quotité'] },
      { cle: 'salaireBase',   label: 'Salaire de base',  type: 'nombre', alias: ['salaire', 'salaire base', 'salaire de base', 'brut'] },
      { cle: 'notes',         label: 'Notes',                          alias: ['notes', 'note', 'commentaire', 'remarques'] }
    ],
    cleDoublon: e => [(e.prenom || '').trim().toLowerCase(), (e.nom || '').trim().toLowerCase()].join('|')
  },

  chambres: {
    label: 'Chambres',
    icone: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    couleur: '#0d9488',
    sauver: 'sbSaveChambre',
    lister: 'sbGetChambres',
    champs: [
      { cle: 'nom',      label: 'N° / nom de chambre', requis: true,   alias: ['nom', 'chambre', 'numero', 'numéro', 'n°', 'room'] },
      { cle: 'unite',    label: 'Unité / aile',                        alias: ['unite', 'unité', 'aile', 'secteur', 'batiment', 'bâtiment', 'etage', 'étage'] },
      { cle: 'type',     label: 'Type',                                alias: ['type', 'categorie', 'catégorie'] },
      { cle: 'capacite', label: 'Capacité',            type: 'nombre', alias: ['capacite', 'capacité', 'places', 'lits'] },
      { cle: 'notes',    label: 'Notes',                               alias: ['notes', 'note', 'commentaire', 'observations'] }
    ],
    cleDoublon: e => (e.nom || '').trim().toLowerCase()
  }
};

// ══════════════════════════════════════════════════════════════════════════
// LECTURE DU FICHIER
// ══════════════════════════════════════════════════════════════════════════

// Excel (FR) enregistre souvent en Windows-1252 : décodé en UTF-8, ça donne
// des « Ã© » à la place des « é ». On teste UTF-8 puis on retombe sur 1252
// si le résultat contient le caractère de remplacement.
function _impDecoder(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (utf8.indexOf('�') === -1) return utf8;
  try { return new TextDecoder('windows-1252').decode(buffer); }
  catch (_) { return utf8; }
}

// Séparateur le plus probable, mesuré sur la première ligne.
function _impSeparateur(texte) {
  const ligne = texte.split(/\r?\n/)[0] || '';
  const compte = s => (ligne.match(new RegExp('\\' + s, 'g')) || []).length;
  const candidats = [[';', compte(';')], [',', compte(',')], ['\t', compte('\t')]];
  candidats.sort((a, b) => b[1] - a[1]);
  return candidats[0][1] > 0 ? candidats[0][0] : ';';
}

// Analyseur CSV caractère par caractère : gère les champs entre guillemets
// contenant séparateurs, retours à la ligne et guillemets doublés ("").
function impParseCSV(texte, sep) {
  if (texte.charCodeAt(0) === 0xFEFF) texte = texte.slice(1);   // BOM
  const lignes = [];
  let champ = '', ligne = [], dansGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') { champ += '"'; i++; }
        else dansGuillemets = false;
      } else champ += c;
    } else {
      if (c === '"') dansGuillemets = true;
      else if (c === sep) { ligne.push(champ); champ = ''; }
      else if (c === '\n') { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; }
      else if (c === '\r') { /* ignoré */ }
      else champ += c;
    }
  }
  if (champ.length || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter(l => l.some(v => String(v).trim() !== ''));   // pas de lignes vides
}

// ══════════════════════════════════════════════════════════════════════════
// CONVERSIONS
// ══════════════════════════════════════════════════════════════════════════

// Accepte JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ ; renvoie AAAA-MM-JJ ou ''.
function impDate(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let a = m[3];
    if (a.length === 2) a = (Number(a) > 40 ? '19' : '20') + a;   // 62 → 1962, 05 → 2005
    return `${a}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  return '';
}

// « 35,5 » (virgule décimale française) → 35.5
function impNombre(v) {
  const s = String(v || '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Normalise un en-tête pour la reconnaissance : minuscules, sans accents,
// sans ponctuation.
function _impNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Correspondance automatique en-tête de fichier → champ métier.
function impAutoMapping(entetes, modele) {
  const map = {};
  const normalises = entetes.map(_impNorm);
  modele.champs.forEach(champ => {
    const alias = champ.alias.map(_impNorm);
    // 1) correspondance exacte, 2) à défaut l'en-tête qui contient l'alias
    let idx = normalises.findIndex(h => h && alias.includes(h));
    if (idx === -1) idx = normalises.findIndex(h => h && alias.some(a => a.length > 3 && h.includes(a)));
    if (idx !== -1 && !Object.values(map).includes(idx)) map[champ.cle] = idx;
  });
  return map;
}

// ══════════════════════════════════════════════════════════════════════════
// CONSTRUCTION ET CONTRÔLE DES ENREGISTREMENTS
// ══════════════════════════════════════════════════════════════════════════

function impConstruire() {
  const modele = IMP_MODELES[IMP.type];
  return IMP.lignes.map((ligne, i) => {
    const obj = {}, erreurs = [], avertissements = [];
    modele.champs.forEach(champ => {
      const idx = IMP.mapping[champ.cle];
      if (idx === undefined || idx === null || idx === '') return;
      let v = (ligne[idx] !== undefined ? String(ligne[idx]) : '').trim();
      if (!v) return;
      // Une valeur illisible dans un champ FACULTATIF ne doit pas faire perdre
      // toute la ligne : on l'ignore et on le signale. Seuls les champs requis
      // rejettent l'enregistrement.
      if (champ.type === 'date') {
        const d = impDate(v);
        if (!d) {
          (champ.requis ? erreurs : avertissements).push(`${champ.label} ignoré : date illisible (« ${v} »)`);
          return;
        }
        v = d;
      } else if (champ.type === 'nombre') {
        const n = impNombre(v);
        if (n === null) {
          (champ.requis ? erreurs : avertissements).push(`${champ.label} ignoré : nombre illisible (« ${v} »)`);
          return;
        }
        obj[champ.cle] = n; return;
      }
      obj[champ.cle] = v;
    });
    modele.champs.filter(c => c.requis).forEach(c => {
      if (!obj[c.cle]) erreurs.push(`${c.label} manquant`);
    });
    return { ligneNum: i + 2, donnees: obj, erreurs, avertissements, doublon: false };
  });
}

// Marque les enregistrements déjà présents en base, et les doublons internes
// au fichier lui-même.
async function impMarquerDoublons(enregs) {
  const modele = IMP_MODELES[IMP.type];
  const existantes = new Set();
  try {
    const fn = window[modele.lister];
    if (typeof fn === 'function') {
      const liste = await fn();
      (liste || []).forEach(e => existantes.add(modele.cleDoublon(e)));
    }
  } catch (e) { console.warn('[import] lecture de l’existant', e); }
  const vues = new Set();
  enregs.forEach(r => {
    if (r.erreurs.length) return;
    const cle = modele.cleDoublon(r.donnees);
    if (existantes.has(cle)) { r.doublon = true; r.motifDoublon = 'déjà présent dans l’application'; }
    else if (vues.has(cle)) { r.doublon = true; r.motifDoublon = 'en double dans le fichier'; }
    vues.add(cle);
  });
  return enregs;
}

// ══════════════════════════════════════════════════════════════════════════
// INTERFACE — 4 étapes
// ══════════════════════════════════════════════════════════════════════════

function impOuvrir(type) {
  IMP.type = type || 'residents';
  IMP.lignes = []; IMP.entetes = []; IMP.mapping = {}; IMP.nomFichier = '';
  impEtape1();
  if (typeof openModal === 'function') openModal('modalImport');
}

function _impCorps(html) {
  const el = document.getElementById('impCorps');
  if (el) el.innerHTML = html;
}
function _impPied(html) {
  const el = document.getElementById('impPied');
  if (el) el.innerHTML = html;
}
function _impTitre(t, s) {
  const a = document.getElementById('impTitre'), b = document.getElementById('impSousTitre');
  if (a) a.textContent = t;
  if (b) b.textContent = s;
}

// ─── Étape 1 : type de données + fichier ───────────────────────────────────
function impEtape1() {
  _impTitre('Importer des données', 'Étape 1 sur 4 — choix du fichier');
  const tuiles = Object.keys(IMP_MODELES).map(k => {
    const m = IMP_MODELES[k], on = IMP.type === k;
    return `<button type="button" class="imp-type${on ? ' on' : ''}" style="--tc:${m.couleur}" onclick="impSetType('${k}')">
      <span class="imp-type-i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m.icone}</svg></span>
      <span>${m.label}</span></button>`;
  }).join('');
  _impCorps(`
    <div class="v2-fld-l" style="margin-bottom:8px">Que voulez-vous importer ?</div>
    <div class="imp-types">${tuiles}</div>
    <div class="v2-fld-l" style="margin:20px 0 8px">Fichier (CSV)</div>
    <label class="imp-drop" for="impFichier">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <b>Choisir un fichier CSV</b>
      <span>Depuis Excel : « Enregistrer sous » → CSV. Les séparateurs « ; » et « , » sont reconnus.</span>
    </label>
    <input type="file" id="impFichier" accept=".csv,text/csv,text/plain" style="display:none" onchange="impLireFichier(this)"/>
    <div id="impFichierInfo"></div>`);
  _impPied(`<button type="button" class="v2-btn-sec" onclick="closeModal('modalImport')">Annuler</button>`);
}

function impSetType(t) { IMP.type = t; impEtape1(); }

function impLireFichier(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  IMP.nomFichier = f.name;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const texte = _impDecoder(e.target.result);
      const sep = _impSeparateur(texte);
      const lignes = impParseCSV(texte, sep);
      if (lignes.length < 2) {
        if (typeof toast === 'function') toast('Fichier vide ou sans données', 'error');
        return;
      }
      IMP.entetes = lignes[0].map(h => String(h).trim());
      IMP.lignes = lignes.slice(1);
      IMP.mapping = impAutoMapping(IMP.entetes, IMP_MODELES[IMP.type]);
      impEtape2();
    } catch (err) {
      console.error('[import]', err);
      if (typeof toast === 'function') toast('Fichier illisible', 'error');
    }
  };
  reader.readAsArrayBuffer(f);
}

// ─── Étape 2 : correspondance des colonnes ────────────────────────────────
function impEtape2() {
  const modele = IMP_MODELES[IMP.type];
  _impTitre('Correspondance des colonnes', `Étape 2 sur 4 — ${IMP.lignes.length} ligne(s) lue(s)`);
  const options = i => IMP.entetes.map((h, k) =>
    `<option value="${k}"${String(i) === String(k) ? ' selected' : ''}>${escHtml(h || 'Colonne ' + (k + 1))}</option>`).join('');
  const rangs = modele.champs.map(c => {
    const i = IMP.mapping[c.cle];
    const trouve = i !== undefined;
    return `<div class="imp-map">
      <span class="imp-map-l">${escHtml(c.label)}${c.requis ? ' <b style="color:#ef4444">*</b>' : ''}</span>
      <select class="v2-fld imp-map-s" onchange="impSetMap('${c.cle}', this.value)">
        <option value="">— ignorer —</option>${options(i)}
      </select>
      <span class="imp-map-b ${trouve ? 'ok' : ''}">${trouve ? 'détecté' : '—'}</span>
    </div>`;
  }).join('');
  _impCorps(`
    <div class="imp-note">Vérifiez la correspondance détectée automatiquement. Les champs marqués <b style="color:#ef4444">*</b> sont obligatoires.</div>
    <div class="imp-maps">${rangs}</div>`);
  _impPied(`
    <button type="button" class="v2-btn-sec" onclick="impEtape1()">← Retour</button>
    <button type="button" class="v2-btn-pri" onclick="impEtape3()">Continuer →</button>`);
}

function impSetMap(cle, val) {
  if (val === '') delete IMP.mapping[cle];
  else IMP.mapping[cle] = Number(val);
}

// ─── Étape 3 : aperçu et contrôles ────────────────────────────────────────
async function impEtape3() {
  const modele = IMP_MODELES[IMP.type];
  const manquants = modele.champs.filter(c => c.requis && IMP.mapping[c.cle] === undefined);
  if (manquants.length) {
    if (typeof toast === 'function') toast('Champ obligatoire non associé : ' + manquants.map(c => c.label).join(', '), 'error');
    return;
  }
  _impTitre('Vérification', 'Étape 3 sur 4 — contrôle avant import');
  _impCorps('<div class="imp-note">Analyse en cours…</div>');
  _impPied('');

  let enregs = impConstruire();
  enregs = await impMarquerDoublons(enregs);
  IMP._enregs = enregs;

  const ok = enregs.filter(r => !r.erreurs.length && !r.doublon);
  const dbl = enregs.filter(r => !r.erreurs.length && r.doublon);
  const ko = enregs.filter(r => r.erreurs.length);
  const avert = ok.filter(r => r.avertissements && r.avertissements.length);

  const colonnes = modele.champs.filter(c => IMP.mapping[c.cle] !== undefined).slice(0, 5);
  const apercu = ok.slice(0, 6).map(r => `<tr>${colonnes.map(c =>
    `<td>${escHtml(String(r.donnees[c.cle] ?? '—'))}</td>`).join('')}</tr>`).join('');

  _impCorps(`
    <div class="imp-bilan">
      <div class="imp-b ok"><b>${ok.length}</b><span>à importer</span></div>
      <div class="imp-b dbl"><b>${dbl.length}</b><span>doublons ignorés</span></div>
      <div class="imp-b ko"><b>${ko.length}</b><span>en erreur</span></div>
    </div>
    ${ok.length ? `<div class="v2-fld-l" style="margin:18px 0 8px">Aperçu des 6 premières lignes</div>
      <div class="imp-tblw"><table class="imp-tbl"><thead><tr>${colonnes.map(c => `<th>${escHtml(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${apercu}</tbody></table></div>` : ''}
    ${dbl.length ? `<details class="imp-det"><summary>${dbl.length} doublon(s) — ne seront pas importés</summary>
      <ul>${dbl.slice(0, 30).map(r => `<li>Ligne ${r.ligneNum} — ${escHtml((r.donnees.prenom || '') + ' ' + (r.donnees.nom || r.donnees.nom || ''))} <i>(${escHtml(r.motifDoublon)})</i></li>`).join('')}</ul></details>` : ''}
    ${avert.length ? `<details class="imp-det warn"><summary>${avert.length} ligne(s) importée(s) avec une valeur ignorée</summary>
      <ul>${avert.slice(0, 30).map(r => `<li>Ligne ${r.ligneNum} — ${escHtml(r.avertissements.join(' ; '))}</li>`).join('')}</ul></details>` : ''}
    ${ko.length ? `<details class="imp-det err" open><summary>${ko.length} ligne(s) en erreur — ne seront pas importées</summary>
      <ul>${ko.slice(0, 30).map(r => `<li>Ligne ${r.ligneNum} — ${escHtml(r.erreurs.join(' ; '))}</li>`).join('')}</ul></details>` : ''}`);
  _impPied(`
    <button type="button" class="v2-btn-sec" onclick="impEtape2()">← Corriger</button>
    <button type="button" class="v2-btn-pri" onclick="impLancer()"${ok.length ? '' : ' disabled'}>Importer ${ok.length} ${modele.label.toLowerCase()}</button>`);
}

// ─── Étape 4 : import et rapport ──────────────────────────────────────────
async function impLancer() {
  const modele = IMP_MODELES[IMP.type];
  const sauver = window[modele.sauver];
  if (typeof sauver !== 'function') {
    if (typeof toast === 'function') toast('Fonction d’enregistrement indisponible', 'error');
    return;
  }
  const aFaire = (IMP._enregs || []).filter(r => !r.erreurs.length && !r.doublon);
  _impTitre('Import en cours', 'Étape 4 sur 4 — ne fermez pas cette fenêtre');
  _impPied('');

  let faits = 0; const echecs = [];
  for (const r of aFaire) {
    try { await sauver(r.donnees); faits++; }
    catch (e) { echecs.push({ ligne: r.ligneNum, msg: (e && e.message) || 'erreur' }); }
    const pct = Math.round(((faits + echecs.length) / aFaire.length) * 100);
    _impCorps(`<div class="imp-prog-l">${faits + echecs.length} / ${aFaire.length}</div>
      <div class="imp-prog"><i style="width:${pct}%"></i></div>`);
  }

  if (typeof auditLog === 'function') {
    auditLog('import', `Import ${modele.label} — ${faits} enregistrement(s) depuis « ${IMP.nomFichier} »`);
  }

  _impTitre('Import terminé', `${faits} ${modele.label.toLowerCase()} importé(s)`);
  _impCorps(`
    <div class="imp-bilan">
      <div class="imp-b ok"><b>${faits}</b><span>importés</span></div>
      <div class="imp-b ko"><b>${echecs.length}</b><span>échecs</span></div>
    </div>
    ${echecs.length ? `<details class="imp-det err" open><summary>Détail des échecs</summary>
      <ul>${echecs.slice(0, 30).map(e => `<li>Ligne ${e.ligne} — ${escHtml(e.msg)}</li>`).join('')}</ul></details>` : ''}
    <div class="imp-note" style="margin-top:16px">Vérifiez les données importées avant de poursuivre. Les doublons et les lignes en erreur n’ont pas été enregistrés.</div>`);
  _impPied(`<button type="button" class="v2-btn-pri" onclick="closeModal('modalImport');location.reload()">Terminer</button>`);
  if (typeof toast === 'function') toast(`${faits} ${modele.label.toLowerCase()} importé(s)`, 'success');
}

// ─── Modèle de fichier téléchargeable ─────────────────────────────────────
function impModeleCSV(type) {
  const modele = IMP_MODELES[type];
  if (!modele) return;
  const entetes = modele.champs.map(c => c.label);
  const exemple = modele.champs.map(c => {
    if (c.type === 'date') return '01/01/2020';
    if (c.type === 'nombre') return '35';
    return c.requis ? 'À compléter' : '';
  });
  const csv = '﻿' + [entetes.join(';'), exemple.join(';')].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `modele-import-${type}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

window.impOuvrir = impOuvrir;
window.impSetType = impSetType;
window.impLireFichier = impLireFichier;
window.impSetMap = impSetMap;
window.impEtape1 = impEtape1;
window.impEtape2 = impEtape2;
window.impEtape3 = impEtape3;
window.impLancer = impLancer;
window.impModeleCSV = impModeleCSV;
