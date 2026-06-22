const AST_KEY = DB.keys.astreintes;

const AST_TYPES = [
  { id:'medecin',    label:'Médecin de garde',      icon:'👨‍⚕️', color:'#dc2626' },
  { id:'infirmier',  label:'Infirmier(e) d\'astreinte', icon:'🩺', color:'#8b5cf6' },
  { id:'cadre',      label:'Cadre de permanence',   icon:'👤', color:'#0891b2' },
  { id:'technique',  label:'Astreinte technique',   icon:'🔧', color:'#d97706' },
  { id:'direction',  label:'Direction',             icon:'🏛️', color:'#0f2b4a' }
];

function getAst()       { return DB.get(AST_KEY) || []; }
function saveAst(list)  { DB.set(AST_KEY, list); }
function _astType(id)   { return AST_TYPES.find(t => t.id === id) || AST_TYPES[0]; }

let _astWeekOffset = 0;
let _astEditId = '';

// ─── Init ─────────────────────────────────────────────────────────────────────
function initAstreintes() {
  Auth.requireAuth();
  _populateAstEmployes();
  document.getElementById('astPrev')?.addEventListener('click', () => { _astWeekOffset--; renderAstreintes(); });
  document.getElementById('astNext')?.addEventListener('click', () => { _astWeekOffset++; renderAstreintes(); });
  document.getElementById('astToday')?.addEventListener('click', () => { _astWeekOffset = 0; renderAstreintes(); });
  renderAstreintes();
}

function _populateAstEmployes() {
  const emp = DB.get(DB.keys.employes) || [];
  const sel = document.getElementById('astModalEmploye');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Saisir manuellement —</option>' +
    emp.map(e => `<option value="${escHtml(e.nom||'')+' '+(e.prenom||'')}">${escHtml((e.prenom||'')+' '+(e.nom||''))}</option>`).join('');
  sel.addEventListener('change', e => {
    if (e.target.value) {
      document.getElementById('astModalNom').value = e.target.value.trim();
    }
  });
}

// ─── Semaine courante ─────────────────────────────────────────────────────────
function _astLocalStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _weekDates() {
  const now = new Date();
  now.setHours(0,0,0,0);
  const dow  = (now.getDay() + 6) % 7; // lundi = 0
  const lun  = new Date(now.getTime() - dow * 86400000 + _astWeekOffset * 7 * 86400000);
  return Array.from({length:7}, (_,i) => {
    const d = new Date(lun.getTime() + i * 86400000);
    return _astLocalStr(d);
  });
}

function _isToday(dateStr) {
  return dateStr === today();
}

// ─── Rendu principal ──────────────────────────────────────────────────────────
function renderAstreintes() {
  const days   = _weekDates();
  const list   = getAst();
  const todayStr = today();
  const JOURS  = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  // En-tête semaine
  const lun = new Date(days[0]).toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
  const dim = new Date(days[6]).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  const labEl = document.getElementById('astWeekLabel');
  if (labEl) labEl.textContent = `Semaine du ${lun} au ${dim}`;

  // Garde du jour (côté info)
  const gardesAujourdHui = list.filter(a => a.date === todayStr);
  const guardEl = document.getElementById('astTodayGuard');
  if (guardEl) {
    if (gardesAujourdHui.length) {
      guardEl.innerHTML = gardesAujourdHui.map(a => {
        const t = _astType(a.type);
        return `<div style="display:flex;align-items:center;gap:.5rem;padding:.35rem .6rem;background:${t.color}10;border-radius:7px;border-left:3px solid ${t.color}">
          <span>${t.icon}</span>
          <div>
            <div style="font-size:.78rem;font-weight:700;color:${t.color}">${t.label}</div>
            <div style="font-size:.82rem;font-weight:600;color:var(--text)">${escHtml(a.nom||'—')}</div>
            ${a.tel ? `<div style="font-size:.75rem;color:var(--muted)">📞 ${escHtml(a.tel)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
    } else {
      guardEl.innerHTML = '<span style="font-size:.8rem;color:var(--muted);font-style:italic">Aucune astreinte saisie pour aujourd\'hui</span>';
    }
  }

  // Grille hebdomadaire
  const gridEl = document.getElementById('astGrid');
  if (!gridEl) return;

  gridEl.innerHTML = `
    <div style="display:grid;grid-template-columns:110px repeat(7,1fr);gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:#fff">

      <!-- Header jours -->
      <div style="background:#f8fafc;border-bottom:1px solid var(--border);padding:.5rem .4rem;font-size:.7rem;font-weight:700;color:var(--muted);text-align:center">Type</div>
      ${days.map((d,i) => {
        const isT = _isToday(d);
        const dayNum = new Date(d).toLocaleDateString('fr-FR',{day:'numeric'});
        return `<div style="background:${isT?'#3b82f615':'#f8fafc'};border-bottom:1px solid var(--border);border-left:1px solid var(--border);padding:.5rem .4rem;text-align:center">
          <div style="font-size:.7rem;font-weight:700;color:${isT?'#3b82f6':'var(--muted)'}">${JOURS[i]}</div>
          <div style="font-size:.88rem;font-weight:800;color:${isT?'#3b82f6':'var(--text)'}">${dayNum}</div>
        </div>`;
      }).join('')}

      <!-- Lignes par type -->
      ${AST_TYPES.map(type => `
        <div style="padding:.5rem .6rem;border-top:1px solid var(--border);display:flex;align-items:center;gap:.3rem;background:#fafafa">
          <span style="font-size:.9rem">${type.icon}</span>
          <span style="font-size:.68rem;font-weight:600;color:${type.color};line-height:1.2">${type.label}</span>
        </div>
        ${days.map(d => {
          const gardes = list.filter(a => a.date === d && a.type === type.id);
          const isT    = _isToday(d);
          return `<div style="padding:.35rem .3rem;border-top:1px solid var(--border);border-left:1px solid var(--border);background:${isT?'#3b82f608':'#fff'};min-height:52px;position:relative">
            ${gardes.map(a => `<div style="background:${type.color}18;border:1px solid ${type.color}44;border-radius:5px;padding:.2rem .35rem;margin-bottom:.2rem;cursor:pointer" onclick="openAstModal('${a.id}')">
              <div style="font-size:.68rem;font-weight:700;color:${type.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(a.nom||'—')}</div>
              ${a.tel ? `<div style="font-size:.62rem;color:var(--muted)">📞 ${escHtml(a.tel)}</div>` : ''}
            </div>`).join('')}
            <button onclick="openAstModal('','${type.id}','${d}')" style="position:absolute;bottom:2px;right:2px;background:none;border:none;color:${type.color}88;cursor:pointer;font-size:.9rem;padding:1px 3px;line-height:1;border-radius:4px;opacity:.6" title="Ajouter" onmouseenter="this.style.opacity=1;this.style.background='${type.color}15'" onmouseleave="this.style.opacity=.6;this.style.background='none'">+</button>
          </div>`;
        }).join('')}
      `).join('')}
    </div>`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openAstModal(id, presetType, presetDate) {
  _astEditId = id || '';
  const list = getAst();
  const a    = id ? list.find(x => x.id === id) : null;

  document.getElementById('astModalTitle').textContent = a ? 'Modifier l\'astreinte' : 'Nouvelle astreinte';
  document.getElementById('astModalType').value  = a?.type || presetType || 'medecin';
  document.getElementById('astModalDate').value  = a?.date || presetDate || today();
  document.getElementById('astModalNom').value   = a?.nom  || '';
  document.getElementById('astModalTel').value   = a?.tel  || '';
  document.getElementById('astModalNote').value  = a?.note || '';

  const sel = document.getElementById('astModalEmploye');
  if (sel) sel.value = '';
  openModal('modalAst');
}

function saveAstreinte() {
  const date = document.getElementById('astModalDate').value;
  const nom  = document.getElementById('astModalNom').value.trim();
  const type = document.getElementById('astModalType').value;
  if (!date || !nom) { toast('Date et nom obligatoires', 'error'); return; }

  const list = getAst();
  const now  = new Date().toISOString();
  const data = {
    type, date, nom,
    tel:  document.getElementById('astModalTel').value.trim(),
    note: document.getElementById('astModalNote').value.trim()
  };
  if (_astEditId) {
    const idx = list.findIndex(x => x.id === _astEditId);
    if (idx >= 0) Object.assign(list[idx], data, { updatedAt: now });
    toast('Astreinte modifiée');
  } else {
    list.push({ id: genId(), ...data, createdAt: now });
    toast('Astreinte enregistrée', 'success');
  }
  saveAst(list);
  closeModal('modalAst');
  renderAstreintes();
}

function deleteAst(id) {
  if (!id) {
    const delId = _astEditId;
    if (!delId) return;
    if (!confirm('Supprimer cette astreinte ?')) return;
    saveAst(getAst().filter(x => x.id !== delId));
    closeModal('modalAst');
    renderAstreintes();
    toast('Astreinte supprimée');
    return;
  }
  if (!confirm('Supprimer cette astreinte ?')) return;
  saveAst(getAst().filter(x => x.id !== id));
  renderAstreintes();
  toast('Astreinte supprimée');
}

document.addEventListener('DOMContentLoaded', initAstreintes);
