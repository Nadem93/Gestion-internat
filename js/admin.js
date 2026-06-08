// ── TABS ──
function activateTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  ['etablissement','categories','objectifs','fonctions','educateurs','compte','donnees'].forEach(n => {
    const el = document.getElementById('tab-'+n);
    if (el) el.style.display = n === name ? '' : 'none';
  });
}

// ── BRANDING ──
function loadBranding() {
  const b = DB.get(DB.keys.branding) || DEFAULTS.branding;
  document.getElementById('bPrimary').value = b.primaryColor || '#0f2b4a';
  document.getElementById('bAccent').value = b.accentColor || '#e85d04';
  if (b.logo) updateLogoPreview(b.logo);
  loadBgColorInput();
}

// Renseigne le sélecteur de couleur de fond depuis l'établissement courant
function loadBgColorInput() {
  const input = document.getElementById('bBackground');
  if (!input) return;
  const etab = (typeof getCurrentEtab === 'function') ? getCurrentEtab() : null;
  let val = etab && etab.bgColor;
  if (!val) {
    // Aperçu : couleur de base du type d'établissement (1re teinte du dégradé)
    const c = (typeof ETAB_BG !== 'undefined' && etab) ? (ETAB_BG[etab.type] || ETAB_BG['foyer_hebergement']) : null;
    val = c ? c[0] : '#dbeafe';
  }
  input.value = val;
}

function saveBranding() {
  const data = {
    primaryColor: document.getElementById('bPrimary').value,
    accentColor: document.getElementById('bAccent').value,
    logo: DB.get(DB.keys.branding)?.logo || ''
  };
  DB.set(DB.keys.branding, data);
  applyBranding();
  toast('Couleurs appliquées');
}

function resetBranding() {
  const data = { primaryColor:'#0f2b4a', accentColor:'#e85d04', logo:'' };
  DB.set(DB.keys.branding, data);
  document.getElementById('bPrimary').value = data.primaryColor;
  document.getElementById('bAccent').value = data.accentColor;
  applyBranding();
  updateLogoPreview('');
  toast('Couleurs réinitialisées', 'info');
}

// ── LOGO ──
function initLogoUpload() {
  const input = document.getElementById('logoInput');
  if (!input) return;
  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast('Logo trop lourd (max 1 Mo)', 'error'); return; }
    try {
      const base64 = await fileToBase64(file);
      const b = DB.get(DB.keys.branding) || DEFAULTS.branding;
      b.logo = base64;
      DB.set(DB.keys.branding, b);
      updateLogoPreview(base64);
      applyBranding();
      toast('Logo enregistré');
    } catch { toast('Erreur lors du chargement du logo', 'error'); }
  });
}

function updateLogoPreview(src) {
  const preview = document.getElementById('logoPreview');
  const removeBtn = document.getElementById('logoRemoveBtn');
  if (!preview) return;
  if (src) {
    preview.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:10px" alt="Logo"/>`;
    if (removeBtn) removeBtn.style.display = '';
  } else {
    preview.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--g400)" stroke-width="1.5" style="width:24px;height:24px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

function removeLogo() {
  const b = DB.get(DB.keys.branding) || DEFAULTS.branding;
  b.logo = '';
  DB.set(DB.keys.branding, b);
  document.getElementById('logoInput').value = '';
  updateLogoPreview('');
  applyBranding();
  toast('Logo supprimé', 'info');
}

// ── ÉTABLISSEMENT ──
function loadSettings() {
  const s = DB.get(DB.keys.settings) || {};
  document.getElementById('setEtab').value = s.etablissement || '';
  document.getElementById('setVille').value = s.ville || '';
  document.getElementById('setFiness').value = s.finess || '';
  document.getElementById('setTel').value = s.tel || '';
  document.getElementById('setEmail').value = s.email || '';
  document.getElementById('setAdresse').value = s.adresse || '';
  document.getElementById('setCapacite').value = s.capacite || '';
  document.getElementById('setAiKey').value = getAiKey();
  renderAiPrompts();
  updatePreview();
}

function updatePreview() {
  document.getElementById('previewNom').textContent = document.getElementById('setEtab').value || '—';
  document.getElementById('previewVille').textContent = document.getElementById('setVille').value || '';
  document.getElementById('previewFiness').textContent = document.getElementById('setFiness').value || '—';
  document.getElementById('previewTel').textContent = document.getElementById('setTel').value || '—';
  document.getElementById('previewEmail').textContent = document.getElementById('setEmail').value || '—';
  const adr = document.getElementById('previewAdresse');
  if (adr) adr.textContent = document.getElementById('setAdresse').value || '—';
}

function saveSettings() {
  const data = {
    etablissement: document.getElementById('setEtab').value.trim(),
    ville: document.getElementById('setVille').value.trim(),
    finess: document.getElementById('setFiness').value.trim(),
    tel: document.getElementById('setTel').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    adresse: document.getElementById('setAdresse').value.trim(),
    capacite: parseInt(document.getElementById('setCapacite').value) || 0
  };
  DB.set(DB.keys.settings, data);
  const aiKey = document.getElementById('setAiKey').value.trim();
  setAiKey(aiKey);
  saveAiPrompts();
  updatePreview();
  renderUserInfo();
  toast('Paramètres enregistrés');
}

// ── AI PROMPTS ──
function renderAiPrompts() {
  const container = document.getElementById('aiPromptsContainer');
  if (!container) return;
  const modules = [
    { id:'ppe', label:'Avenants (PPE)' },
    { id:'journal', label:'Journal de bord' },
    { id:'messages', label:'Messages' }
  ];
  const actions = [
    { id:'redaction', label:'Rédaction', icon:'✍' },
    { id:'correction', label:'Correction', icon:'✓' },
    { id:'reformulation', label:'Reformulation', icon:'🏛' }
  ];
  const prompts = DB.get(DB.keys.aiPrompts) || {};
  let html = '';
  for (const mod of modules) {
    html += `<details style="margin-bottom:.5rem;border:1px solid var(--border);border-radius:var(--r-sm)">
      <summary style="cursor:pointer;font-weight:600;font-size:.8rem;padding:.5rem .75rem;background:var(--b50)">${mod.label}</summary>
      <div style="padding:.5rem .75rem;display:flex;flex-direction:column;gap:.6rem">`;
    for (const act of actions) {
      const val = prompts[mod.id]?.[act.id]?.system || '';
      html += `<div>
        <label style="font-size:.72rem;font-weight:600;color:var(--muted);margin-bottom:2px;display:block">${act.icon} ${act.label}</label>
        <textarea class="input" style="min-height:40px;font-size:.78rem" data-module="${mod.id}" data-action="${act.id}" placeholder="Instruction système par défaut…">${escHtml(val)}</textarea>
      </div>`;
    }
    html += `</div></details>`;
  }
  container.innerHTML = html;
}

function saveAiPrompts() {
  const textareas = document.querySelectorAll('#aiPromptsContainer textarea[data-module]');
  const prompts = DB.get(DB.keys.aiPrompts) || {};
  textareas.forEach(ta => {
    const mod = ta.dataset.module;
    const act = ta.dataset.action;
    const val = ta.value.trim();
    if (!prompts[mod]) prompts[mod] = {};
    if (!prompts[mod][act]) prompts[mod][act] = {};
    prompts[mod][act].system = val || null; // null = use default
  });
  DB.set(DB.keys.aiPrompts, prompts);
}

// ── CATÉGORIES ──
function renderCats() {
  const cats = DB.get(DB.keys.categories) || [];
  const el = document.getElementById('catList');
  if (!cats.length) {
    el.innerHTML = `<div class="empty" style="padding:2rem"><p>Aucune catégorie</p></div>`;
    return;
  }
  el.innerHTML = cats.map(c => `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.85rem 1.25rem;border-bottom:1px solid var(--border)">
      <span style="width:14px;height:14px;border-radius:4px;background:${c.color};flex-shrink:0"></span>
      <span style="flex:1;font-weight:600;font-size:.875rem">${escHtml(c.name)}</span>
      <span class="badge" style="background:${c.color}22;color:${c.color}">${escHtml(c.name)}</span>
      <button class="btn btn-ghost btn-sm" onclick="editCat(${c.id})">Modifier</button>
    </div>`).join('');
}

function editCat(id) {
  const cats = DB.get(DB.keys.categories) || [];
  const c = cats.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modalCatTitle').textContent = 'Modifier la catégorie';
  document.getElementById('catId').value = id;
  document.getElementById('catName').value = c.name;
  document.getElementById('catColor').value = c.color;
  document.getElementById('btnDeleteCat').style.display = '';
  openModal('modalCat');
}

function saveCat() {
  const name = document.getElementById('catName').value.trim();
  if (!name) { toast('Le nom est requis', 'error'); return; }
  const color = document.getElementById('catColor').value;
  let cats = DB.get(DB.keys.categories) || [];
  const id = document.getElementById('catId').value;
  if (id) {
    cats = cats.map(c => String(c.id) === String(id) ? { ...c, name, color } : c);
    toast('Catégorie mise à jour');
  } else {
    const newId = Math.max(0, ...cats.map(c => c.id)) + 1;
    cats.push({ id: newId, name, color });
    toast('Catégorie ajoutée');
  }
  DB.set(DB.keys.categories, cats);
  closeAllModals();
  resetCatForm();
  renderCats();
}

function deleteCat() {
  const id = document.getElementById('catId').value;
  confirmDialog('Supprimer cette catégorie ?', () => {
    let cats = DB.get(DB.keys.categories) || [];
    cats = cats.filter(c => String(c.id) !== String(id));
    DB.set(DB.keys.categories, cats);
    closeAllModals();
    resetCatForm();
    renderCats();
    toast('Catégorie supprimée', 'info');
  });
}

function resetCatForm() {
  document.getElementById('catId').value = '';
  document.getElementById('catName').value = '';
  document.getElementById('catColor').value = '#3b82f6';
  document.getElementById('modalCatTitle').textContent = 'Nouvelle catégorie';
  document.getElementById('btnDeleteCat').style.display = 'none';
}

// ── OBJECTIFS ──
function renderObjs() {
  const objs = DB.get(DB.keys.objectives) || [];
  const el = document.getElementById('objList');
  if (!objs.length) {
    el.innerHTML = `<div class="empty" style="padding:2rem"><p>Aucun objectif</p></div>`;
    return;
  }
  el.innerHTML = objs.map(o => `
    <div style="padding:.85rem 1.25rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-weight:700;font-size:.875rem">${escHtml(o.name)}</span>
        <button class="btn btn-ghost btn-sm" onclick="editObj(${o.id})">Modifier</button>
      </div>
      ${o.description ? `<div style="font-size:.78rem;color:var(--muted);margin-top:2px">${escHtml(o.description)}</div>` : ''}
    </div>`).join('');
}

function editObj(id) {
  const objs = DB.get(DB.keys.objectives) || [];
  const o = objs.find(x => x.id === id);
  if (!o) return;
  document.getElementById('modalObjTitle').textContent = 'Modifier l\'objectif';
  document.getElementById('objId').value = id;
  document.getElementById('objName').value = o.name;
  document.getElementById('objDesc').value = o.description || '';
  document.getElementById('btnDeleteObj').style.display = '';
  openModal('modalObj');
}

function saveObj() {
  const name = document.getElementById('objName').value.trim();
  if (!name) { toast('Le nom est requis', 'error'); return; }
  const description = document.getElementById('objDesc').value.trim();
  let objs = DB.get(DB.keys.objectives) || [];
  const id = document.getElementById('objId').value;
  if (id) {
    objs = objs.map(o => String(o.id) === String(id) ? { ...o, name, description } : o);
    toast('Objectif mis à jour');
  } else {
    const newId = Math.max(0, ...objs.map(o => o.id)) + 1;
    objs.push({ id: newId, name, description });
    toast('Objectif ajouté');
  }
  DB.set(DB.keys.objectives, objs);
  closeAllModals();
  resetObjForm();
  renderObjs();
}

function deleteObj() {
  const id = document.getElementById('objId').value;
  confirmDialog('Supprimer cet objectif ?', () => {
    let objs = DB.get(DB.keys.objectives) || [];
    objs = objs.filter(o => String(o.id) !== String(id));
    DB.set(DB.keys.objectives, objs);
    closeAllModals();
    resetObjForm();
    renderObjs();
    toast('Objectif supprimé', 'info');
  });
}

function resetObjForm() {
  document.getElementById('objId').value = '';
  document.getElementById('objName').value = '';
  document.getElementById('objDesc').value = '';
  document.getElementById('modalObjTitle').textContent = 'Nouvel objectif';
  document.getElementById('btnDeleteObj').style.display = 'none';
}

// ── FONCTIONS ──
function renderFonctions() {
  const list = DB.get(DB.keys.fonctionColors) || DEFAULTS.fonctionColors;
  const el = document.getElementById('fonctionList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2rem;grid-column:1/-1"><p>Aucune fonction définie</p></div>`;
    return;
  }
  el.innerHTML = list.map(f => {
    const perms = f.permissions || [];
    const chips = perms.length
      ? perms.map(p => `<span class="role-perm">${escHtml(PERMISSION_LABELS[p] || p)}</span>`).join('')
      : '<span class="role-noperm">Aucun droit accordé</span>';
    return `<div class="role-card">
      <div class="role-card-top" style="background:${f.color}">
        <span class="role-name">${escHtml(f.fonction)}</span>
        <button class="role-edit" title="Modifier" onclick="editFonction(${f.id})">✎</button>
      </div>
      <div class="role-card-body">
        <div class="role-count">${perms.length} droit${perms.length > 1 ? 's' : ''} d'accès</div>
        <div class="role-perms">${chips}</div>
      </div>
    </div>`;
  }).join('');
}

const PERM_GROUPS = [
  { label: 'Général', keys: ['view_dashboard'] },
  { label: 'Résidents & projet', keys: ['view_residents', 'edit_residents', 'access_ppe', 'access_sante'] },
  { label: 'Suivi quotidien', keys: ['access_journal', 'access_presences', 'access_repertoire', 'access_documents', 'access_vehicules'] },
  { label: 'Incidents', keys: ['view_incidents', 'validate_incidents'] },
  { label: 'Administration', keys: ['access_interventions', 'access_employes', 'access_admin', 'manage_users'] }
];

function renderFonctionPermissions(selected) {
  const el = document.getElementById('fonctionPermissions');
  if (!el) return;
  selected = selected || [];
  const used = new Set();
  const btn = k => `<button type="button" class="perm-btn ${selected.includes(k) ? 'active' : ''}" data-key="${k}" onclick="this.classList.toggle('active')">${escHtml(PERMISSION_LABELS[k] || k)}</button>`;
  let html = PERM_GROUPS.map(g => {
    const btns = g.keys.filter(k => PERMISSION_LABELS[k]).map(k => { used.add(k); return btn(k); }).join('');
    return btns ? `<div class="perm-group"><div class="perm-group-label">${g.label}</div><div style="display:flex;flex-wrap:wrap;gap:.4rem">${btns}</div></div>` : '';
  }).join('');
  const others = Object.keys(PERMISSION_LABELS).filter(k => !used.has(k));
  if (others.length) html += `<div class="perm-group"><div class="perm-group-label">Autres</div><div style="display:flex;flex-wrap:wrap;gap:.4rem">${others.map(btn).join('')}</div></div>`;
  el.innerHTML = html;
}

function editFonction(id) {
  const list = DB.get(DB.keys.fonctionColors) || DEFAULTS.fonctionColors;
  const f = list.find(x => x.id === id);
  if (!f) return;
  document.getElementById('modalFonctionTitle').textContent = 'Modifier la fonction';
  document.getElementById('fonctionId').value = id;
  document.getElementById('fonctionName').value = f.fonction;
  document.getElementById('fonctionColor').value = f.color;
  renderFonctionPermissions(f.permissions || []);
  document.getElementById('btnDeleteFonction').style.display = '';
  openModal('modalFonction');
}

function saveFonction() {
  const name = document.getElementById('fonctionName').value.trim();
  if (!name) { toast('Le nom est requis', 'error'); return; }
  const color = document.getElementById('fonctionColor').value;
  const permEls = document.querySelectorAll('#fonctionPermissions .perm-btn');
  const permissions = Array.from(permEls).filter(btn => btn.classList.contains('active')).map(btn => btn.dataset.key);
  let list = DB.get(DB.keys.fonctionColors) || DEFAULTS.fonctionColors;
  const id = document.getElementById('fonctionId').value;
  if (id) {
    list = list.map(f => String(f.id) === String(id) ? { ...f, fonction: name, color, permissions } : f);
    toast('Fonction mise à jour');
  } else {
    const newId = Math.max(0, ...list.map(f => f.id)) + 1;
    list.push({ id: newId, fonction: name, color, permissions });
    toast('Fonction ajoutée');
  }
  DB.set(DB.keys.fonctionColors, list);
  closeAllModals();
  resetFonctionForm();
  renderFonctions();
}

function deleteFonction() {
  const id = document.getElementById('fonctionId').value;
  confirmDialog('Supprimer cette fonction ?', () => {
    let list = DB.get(DB.keys.fonctionColors) || DEFAULTS.fonctionColors;
    list = list.filter(f => String(f.id) !== String(id));
    DB.set(DB.keys.fonctionColors, list);
    closeAllModals();
    resetFonctionForm();
    renderFonctions();
    toast('Fonction supprimée', 'info');
  });
}

function resetFonctionForm() {
  document.getElementById('fonctionId').value = '';
  document.getElementById('fonctionName').value = '';
  document.getElementById('fonctionColor').value = '#3b82f6';
  renderFonctionPermissions([]);
  document.getElementById('modalFonctionTitle').textContent = 'Nouvelle fonction';
  document.getElementById('btnDeleteFonction').style.display = 'none';
}

// ── UTILISATEURS ──
function getUserEtabs(userId) {
  return getEtabs().filter(e => {
    const users = JSON.parse(localStorage.getItem(`${DB.keys.users}__${e.id}`) || '[]');
    return users.find(u => String(u.id) === String(userId));
  }).map(e => String(e.id));
}

function renderEtabCheckboxes(userEtabIds = []) {
  const etabs = getEtabs();
  const group = document.getElementById('etabAssignGroup');
  const el = document.getElementById('etabAssignList');
  if (!el || !group) return;
  if (etabs.length <= 1) { group.style.display = 'none'; return; }
  group.style.display = '';
  el.innerHTML = `<select id="etabAssignSelect" class="form-control">
    <option value="">— Sélectionner un établissement —</option>
    ${etabs.map(e => `<option value="${e.id}" ${userEtabIds.includes(String(e.id)) ? 'selected' : ''}>${escHtml(e.nom)}</option>`).join('')}
  </select>`;
}

function renderEducateurs() {
  const users = DB.get(DB.keys.users) || [];
  const educateurs = users.filter(u => u.role === 'educateur');
  const etabs = getEtabs();
  const el = document.getElementById('eduList');
  if (!el) return;
  if (!educateurs.length) {
    el.innerHTML = `<div class="empty" style="padding:2rem"><p>Aucun utilisateur enregistré</p></div>`;
    return;
  }
  el.innerHTML = educateurs.map(u => {
    const userEtabs = etabs.filter(e => {
      const list = JSON.parse(localStorage.getItem(`${DB.keys.users}__${e.id}`) || '[]');
      return list.find(x => String(x.id) === String(u.id));
    });
    return `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.85rem 1.25rem;border-bottom:1px solid var(--border)">
      <div class="avatar sm" style="background:var(--blue)">${initials(u.prenom||'', u.nom||'') || u.username[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.875rem">${escHtml([u.prenom, u.nom].filter(Boolean).join(' ') || u.username)}</div>
        <div style="font-size:.75rem;color:var(--muted)">${u.fonction ? escHtml(u.fonction)+' · ' : ''}@${escHtml(u.username)}</div>
        ${userEtabs.length ? `<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.3rem">${userEtabs.map(e => `<span class="badge" style="background:${e.color||'#0f2b4a'}22;color:${e.color||'#0f2b4a'};font-size:.65rem">${escHtml(e.nom)}</span>`).join('')}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="editEducateur(${u.id})">Modifier</button>
    </div>`;
  }).join('');
}

function editEducateur(id) {
  const users = DB.get(DB.keys.users) || [];
  const u = users.find(x => x.id === id);
  if (!u) return;
  document.getElementById('modalEduTitle').textContent = "Modifier l'utilisateur";
  document.getElementById('eduId').value = id;
  document.getElementById('eduPrenom').value = u.prenom || '';
  document.getElementById('eduNom').value = u.nom || '';
  document.getElementById('eduFonction').value = u.fonction || '';
  document.getElementById('eduUsername').value = u.username;
  document.getElementById('eduPassword').value = '';
  document.getElementById('eduPasswordLabel').textContent = 'Nouveau mot de passe (vide = inchangé)';
  document.getElementById('btnDeleteEdu').style.display = '';
  renderEtabCheckboxes(getUserEtabs(id));
  openModal('modalEdu');
}

async function saveEducateur() {
  const username = document.getElementById('eduUsername').value.trim();
  const password = document.getElementById('eduPassword').value;
  const prenom = document.getElementById('eduPrenom').value.trim();
  const nom = document.getElementById('eduNom').value.trim();
  const fonction = document.getElementById('eduFonction').value.trim();
  const id = document.getElementById('eduId').value;
  if (!username) { toast("L'identifiant est requis", 'error'); return; }
  if (password && password.length < 6) { toast('Mot de passe : 6 caractères minimum', 'error'); return; }
  let users = DB.get(DB.keys.users) || [];
  if (users.find(u => u.username === username && String(u.id) !== String(id))) {
    toast('Cet identifiant est déjà utilisé', 'error'); return;
  }
  const pwdHash = password ? await hashPassword(password) : null;
  if (id) {
    if (!password && !users.find(u => String(u.id) === String(id))?.password) {
      toast('Le mot de passe est requis', 'error'); return;
    }
    users = users.map(u => String(u.id) === String(id)
      ? { ...u, prenom, nom, fonction, username, ...(pwdHash ? { password: pwdHash } : {}) } : u);
    toast('Utilisateur mis à jour');
  } else {
    if (!password) { toast('Le mot de passe est requis', 'error'); return; }
    const newId = Math.max(0, ...users.map(u => u.id)) + 1;
    users.push({ id: newId, prenom, nom, fonction, username, password: pwdHash, role: 'educateur' });
    toast('Utilisateur ajouté');
  }
  DB.set(DB.keys.users, users);
  // Synchroniser avec les établissements sélectionnés
  const sel = document.getElementById('etabAssignSelect');
  const selectedEtabs = sel ? [...sel.selectedOptions].map(o => o.value) : [];
  const allEtabs = getEtabs();
  const savedUser = (DB.get(DB.keys.users) || []).find(u => u.username === username);
  allEtabs.forEach(e => {
    const k = `${DB.keys.users}__${e.id}`;
    let eUsers = JSON.parse(localStorage.getItem(k) || '[]');
    if (selectedEtabs.includes(String(e.id))) {
      const idx = eUsers.findIndex(u => String(u.id) === String(savedUser?.id));
      if (idx >= 0) eUsers[idx] = { ...eUsers[idx], ...savedUser };
      else if (savedUser) eUsers.push(savedUser);
    } else {
      eUsers = eUsers.filter(u => String(u.id) !== String(savedUser?.id));
    }
    localStorage.setItem(k, JSON.stringify(eUsers));
  });
  closeAllModals();
  resetEducateurForm();
  renderEducateurs();
}

function deleteEducateur() {
  const id = document.getElementById('eduId').value;
  confirmDialog('Supprimer cet éducateur ?', () => {
    let users = DB.get(DB.keys.users) || [];
    users = users.filter(u => String(u.id) !== String(id));
    DB.set(DB.keys.users, users);
    closeAllModals();
    resetEducateurForm();
    renderEducateurs();
    toast('Éducateur supprimé', 'info');
  });
}

function resetEducateurForm() {
  document.getElementById('eduId').value = '';
  document.getElementById('eduPrenom').value = '';
  document.getElementById('eduNom').value = '';
  document.getElementById('eduFonction').value = '';
  document.getElementById('eduUsername').value = '';
  document.getElementById('eduPassword').value = '';
  document.getElementById('modalEduTitle').textContent = 'Nouvel utilisateur';
  document.getElementById('eduPasswordLabel').textContent = 'Mot de passe';
  renderEtabCheckboxes([String(DB._id())].filter(Boolean));
  document.getElementById('btnDeleteEdu').style.display = 'none';
}

// ── COMPTE ──
function loadUser() {
  const session = Auth.getSession();
  const users = DB.get(DB.keys.users) || [];
  const adminUser = session ? users.find(u => u.id === session.userId) : null;
  const u = adminUser || DB.get(DB.keys.user) || {};
  document.getElementById('uPrenom').value = u.prenom || '';
  document.getElementById('uNom').value = u.nom || '';
  document.getElementById('uRole').value = (DB.get(DB.keys.user) || {}).role || '';
  const name = [u.prenom, u.nom].filter(Boolean).join(' ') || 'Administrateur';
  document.getElementById('accountName').textContent = name;
  document.getElementById('accountRole').textContent = 'Administrateur';
  document.getElementById('accountAvatar').textContent = initials(u.prenom||'', u.nom||'') || 'A';
  if (adminUser) document.getElementById('uUsername').value = adminUser.username;
}

function saveUser() {
  const prenom = document.getElementById('uPrenom').value.trim();
  const nom = document.getElementById('uNom').value.trim();
  const role = document.getElementById('uRole').value.trim();
  DB.set(DB.keys.user, { prenom, nom, role });
  const session = Auth.getSession();
  if (session) {
    let users = DB.get(DB.keys.users) || [];
    users = users.map(u => u.id === session.userId ? { ...u, prenom, nom } : u);
    DB.set(DB.keys.users, users);
    DB.set(DB.keys.session, { ...session, prenom, nom });
  }
  loadUser();
  renderUserInfo();
  toast('Compte mis à jour');
}

async function saveCredentials() {
  const username = document.getElementById('uUsername').value.trim();
  const password = document.getElementById('uPassword').value;
  const confirm = document.getElementById('uPasswordConfirm').value;
  if (!username) { toast("L'identifiant est requis", 'error'); return; }
  if (password && password.length < 6) { toast('Mot de passe : 6 caractères minimum', 'error'); return; }
  if (password && password !== confirm) { toast('Les mots de passe ne correspondent pas', 'error'); return; }
  const session = Auth.getSession();
  let users = DB.get(DB.keys.users) || [];
  if (users.find(u => u.username === username && u.id !== session.userId)) {
    toast('Cet identifiant est déjà utilisé', 'error'); return;
  }
  const pwdHash = password ? await hashPassword(password) : null;
  users = users.map(u => u.id === session.userId ? { ...u, username, ...(pwdHash ? { password: pwdHash } : {}) } : u);
  DB.set(DB.keys.users, users);
  DB.set(DB.keys.session, { ...session, username });
  document.getElementById('uPassword').value = '';
  document.getElementById('uPasswordConfirm').value = '';
  toast('Identifiants mis à jour');
}

// ── DONNÉES ──
function exportData(type) {
  let data = {};
  const k = DB.keys;
  if (type === 'residents' || type === 'all') data.residents = DB.get(k.residents) || [];
  if (type === 'journal'   || type === 'all') data.journal   = DB.get(k.journal)   || [];
  if (type === 'all') {
    data.categories    = DB.get(k.categories)    || [];
    data.objectives    = DB.get(k.objectives)    || [];
    data.presences     = DB.get(k.presences)     || {};
    data.planning      = DB.get(k.planning)      || [];
    data.incidents     = DB.get(k.incidents)     || [];
    data.ppe           = DB.get(k.ppe)           || [];
    data.repertoire    = DB.get(k.repertoire)    || [];
    data.vehicules     = DB.get(k.vehicules)     || [];
    data.documents     = JSON.parse(localStorage.getItem(k.documents) || '{}');
    data.messages      = DB.get(k.messages)      || [];
    data.conversations = JSON.parse(localStorage.getItem('ftr_conversations') || '{}');
    data.interventions = DB.get(k.interventions) || [];
    data.settings      = DB.get(k.settings)      || {};
    data.branding      = DB.get(k.branding)      || {};
    data.users         = DB.get(k.users)         || [];
    data.fonctionColors= DB.get(k.fonctionColors)|| [];
    data._exportedAt   = new Date().toISOString();
    data._version      = '1.0';
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ftr-backup-${type}-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Export téléchargé ✓');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        confirmDialog(
          `Restaurer la sauvegarde du ${data._exportedAt ? new Date(data._exportedAt).toLocaleString('fr-FR') : 'fichier sélectionné'} ?\n\nLes données actuelles seront écrasées.`,
          () => {
            const k = DB.keys;
            if (data.residents)     DB.set(k.residents,     data.residents);
            if (data.journal)       DB.set(k.journal,       data.journal);
            if (data.categories)    DB.set(k.categories,    data.categories);
            if (data.objectives)    DB.set(k.objectives,    data.objectives);
            if (data.presences)     DB.set(k.presences,     data.presences);
            if (data.planning)      DB.set(k.planning,      data.planning);
            if (data.incidents)     DB.set(k.incidents,     data.incidents);
            if (data.ppe)           DB.set(k.ppe,           data.ppe);
            if (data.repertoire)    DB.set(k.repertoire,    data.repertoire);
            if (data.vehicules)     DB.set(k.vehicules,     data.vehicules);
            if (data.documents)     localStorage.setItem(k.documents, JSON.stringify(data.documents));
            if (data.messages)      DB.set(k.messages,      data.messages);
            if (data.conversations) localStorage.setItem('ftr_conversations', JSON.stringify(data.conversations));
            if (data.interventions) DB.set(k.interventions, data.interventions);
            if (data.settings)      DB.set(k.settings,      data.settings);
            if (data.branding)      DB.set(k.branding,      data.branding);
            if (data.fonctionColors)DB.set(k.fonctionColors,data.fonctionColors);
            toast('Données restaurées avec succès — rechargement…', 'success');
            setTimeout(() => location.reload(), 1500);
          }
        );
      } catch {
        toast('Fichier invalide ou corrompu', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetData(type) {
  const messages = {
    journal: 'Vider tout le journal de bord ? Cette action est irréversible.',
    presences: 'Réinitialiser toutes les présences ? Cette action est irréversible.',
    all: '⚠️ ATTENTION : Supprimer TOUTES les données (résidents, journal, présences) ? Cette action est irréversible.'
  };
  confirmDialog(messages[type], () => {
    if (type === 'journal') DB.set(DB.keys.journal, []);
    else if (type === 'presences') DB.set(DB.keys.presences, {});
    else if (type === 'all') {
      DB.set(DB.keys.residents, []);
      DB.set(DB.keys.journal, []);
      DB.set(DB.keys.presences, {});
      DB.set(DB.keys.planning, []);
    }
    toast('Données réinitialisées', 'info');
  });
}

function renderLoginHistory() {
  const log = DB.get(DB.keys.loginHistory) || [];
  const tbody = document.getElementById('loginHistoryBody');
  if (!log.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted)">Aucune connexion enregistrée</td></tr>';
    return;
  }
  tbody.innerHTML = log.slice(0, 200).map(e => {
    const d = new Date(e.date);
    const dateStr = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const timeStr = d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const actionLabel = e.action === 'login' ? 'Connexion' : e.action === 'logout' ? 'Déconnexion' : e.action;
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:.6rem 1rem;white-space:nowrap">${escHtml(dateStr)} <span style="color:var(--muted)">${escHtml(timeStr)}</span></td>
      <td style="padding:.6rem 1rem">${escHtml(e.prenom||'')} ${escHtml(e.nom||'')} <span style="color:var(--muted);font-size:.75rem">(${escHtml(e.username)})</span></td>
      <td style="padding:.6rem 1rem"><span class="badge ${e.action === 'login' ? 'badge-green' : 'badge-gray'}">${actionLabel}</span></td>
      <td style="padding:.6rem 1rem">${escHtml(e.role||'—')}</td>
    </tr>`;
  }).join('');
}

// ── AUDIT LOG ──
const ACTION_LABELS = {
  resident_create: 'Résident ajouté',   resident_update: 'Résident modifié',  resident_delete: 'Résident supprimé',
  incident_create: 'Incident déclaré',  incident_update: 'Incident traité',
  journal_create:  'Entrée journal',
  ppe_create:      'Avenant créé',      ppe_update:      'Avenant modifié',
  user_create:     'Utilisateur créé',  user_update:     'Utilisateur modifié',
};
const ACTION_COLORS = {
  resident_create:'#10b981', resident_update:'#3b82f6', resident_delete:'#ef4444',
  incident_create:'#f59e0b', incident_update:'#10b981',
  journal_create: '#8b5cf6',
  ppe_create:     '#06b6d4', ppe_update:     '#3b82f6',
  user_create:    '#6366f1', user_update:    '#6366f1',
};

function renderAuditLog() {
  const tbody = document.getElementById('auditLogBody');
  if (!tbody) return;
  const log = JSON.parse(localStorage.getItem('ftr_audit_log') || '[]');
  if (!log.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted)">Aucune action enregistrée</td></tr>';
    return;
  }
  tbody.innerHTML = log.slice(0, 200).map(e => {
    const d = new Date(e.date);
    const dateStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric'});
    const timeStr = d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    const label = ACTION_LABELS[e.action] || e.action;
    const color = ACTION_COLORS[e.action] || '#64748b';
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:.55rem 1rem;white-space:nowrap;font-size:.78rem">${dateStr} <span style="color:var(--muted)">${timeStr}</span></td>
      <td style="padding:.55rem 1rem;font-size:.78rem;font-weight:500">${escHtml(e.user||'—')} <span style="font-size:.68rem;color:var(--muted)">(${escHtml(e.role||'')})</span></td>
      <td style="padding:.55rem 1rem"><span style="display:inline-block;padding:1px 8px;border-radius:100px;font-size:.68rem;font-weight:700;background:${color}18;color:${color}">${label}</span></td>
      <td style="padding:.55rem 1rem;font-size:.75rem;color:var(--g600);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.details||'')}</td>
    </tr>`;
  }).join('');
}

function exportAuditLog() {
  const log = JSON.parse(localStorage.getItem('ftr_audit_log') || '[]');
  if (!log.length) { toast('Aucune action à exporter', 'info'); return; }
  const header = 'Date,Heure,Utilisateur,Rôle,Action,Détails\n';
  const rows = log.map(e => {
    const d = new Date(e.date);
    return [
      d.toLocaleDateString('fr-FR'),
      d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      e.user || '',
      e.role || '',
      ACTION_LABELS[e.action] || e.action,
      (e.details || '').replace(/,/g, ';')
    ].map(v => `"${v}"`).join(',');
  }).join('\n');
  const blob = new Blob(['﻿' + header + rows], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Audit exporté ✓');
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadUser();
  loadBranding();
  renderCats();
  renderObjs();
  renderFonctions();
  resetFonctionForm();
  renderEducateurs();
  initLogoUpload();
  renderLoginHistory();
  renderAuditLog();
  if (typeof applyEtabBackground === 'function') applyEtabBackground();

  ['setEtab','setVille','setFiness','setTel','setEmail'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });

  document.getElementById('modalCat').querySelector('.modal-close').addEventListener('click', resetCatForm);
  document.getElementById('modalObj').querySelector('.modal-close').addEventListener('click', resetObjForm);
  document.getElementById('modalFonction')?.querySelector('.modal-close')?.addEventListener('click', resetFonctionForm);
  document.getElementById('modalEdu').querySelector('.modal-close').addEventListener('click', resetEducateurForm);
});
