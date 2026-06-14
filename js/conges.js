function initConges() {
  const _s = Auth.requireAuth();
  if (!_s) return;
  if (!requireModule('access_conges')) return;
  const employes = DB.get(DB.keys.employes) || [];
  const sel = document.getElementById('cgFiltreEmploye');
  sel.innerHTML = '<option value="">Tous les employés</option>' + employes.map(e => `<option value="${e.id}">${escHtml(e.prenom+' '+e.nom)}</option>`).join('');
  renderConges();
}

function getConges() { return JSON.parse(localStorage.getItem('ftr_conges') || '[]'); }
function setConges(d) { localStorage.setItem('ftr_conges', JSON.stringify(d)); }

function openDemandeConge(data) {
  const employes = DB.get(DB.keys.employes) || [];
  const eOpts = employes.map(e => `<option value="${e.id}"${data && data.employeId === e.id ? ' selected' : ''}>${escHtml(e.prenom+' '+e.nom)}</option>`).join('');
  const types = [
    { v:'cp', l:'Congés payés' }, { v:'rtt', l:'RTT' }, { v:'maladie', l:'Arrêt maladie' },
    { v:'enfant_malade', l:'Enfant malade' }, { v:'formation', l:'Formation' }, { v:'autre', l:'Autre' }
  ];
  const tOpts = types.map(t => `<option value="${t.v}"${data && data.type === t.v ? ' selected' : ''}>${t.l}</option>`).join('');
  const html = `<div class="modal-overlay" id="modalConge" style="display:flex" onclick="closeModal('modalConge')">
    <div class="modal" style="max-width:480px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">${data ? '✎ Modifier la demande' : '🗓 Nouvelle demande de congés'}</span><button class="modal-close" onclick="closeModal('modalConge')">&times;</button></div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:.75rem">
        <div class="form-group"><label>Employé *</label><select id="cgEmploye" class="form-input">${eOpts}</select></div>
        <div class="form-group"><label>Type *</label><select id="cgType" class="form-input">${tOpts}</select></div>
        <div class="form-row">
          <div class="form-group"><label>Date début *</label><input type="date" id="cgDebut" class="form-input" value="${data ? data.debut : ''}"/></div>
          <div class="form-group"><label>Date fin *</label><input type="date" id="cgFin" class="form-input" value="${data ? data.fin : ''}"/></div>
        </div>
        <div class="form-group"><label>Motif</label><textarea id="cgMotif" class="form-input" rows="2" placeholder="Raison de la demande…">${escHtml(data ? data.motif||'' : '')}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal('modalConge')">Annuler</button>
        <button class="btn btn-primary" onclick="saveConge('${data ? data.id : ''}')">${data ? 'Enregistrer' : 'Envoyer la demande'}</button>
      </div>
    </div>
  </div>`;
  const old = document.getElementById('modalConge');
  if (old) old.remove();
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  requestAnimationFrame(() => document.getElementById('modalConge')?.classList.add('open'));
}

function saveConge(id) {
  const employeId = document.getElementById('cgEmploye').value;
  const type = document.getElementById('cgType').value;
  const debut = document.getElementById('cgDebut').value;
  const fin = document.getElementById('cgFin').value;
  const motif = document.getElementById('cgMotif').value.trim();
  if (!employeId || !debut || !fin) { toast('Champs obligatoires manquants', 'error'); return; }
  if (debut > fin) { toast('La date de fin doit être après la date de début', 'error'); return; }
  const employes = DB.get(DB.keys.employes) || [];
  const emp = employes.find(e => e.id === employeId);
  let list = getConges();
  if (id) {
    const idx = list.findIndex(d => d.id === id);
    if (idx !== -1) list[idx] = { ...list[idx], employeId, type, debut, fin, motif, updatedAt: new Date().toISOString() };
    toast('Demande mise à jour', 'success');
  } else {
    list.push({
      id: genId(), employeId, employeNom: emp ? emp.prenom+' '+emp.nom : '', type, debut, fin, motif,
      statut: 'en_attente', dateDemande: new Date().toISOString()
    });
    toast('Demande de congés envoyée ✓', 'success');
  }
  setConges(list);
  if (!id && typeof auditLog === 'function') auditLog('conge', 'Nouvelle demande — '+emp?.prenom+' '+emp?.nom);
  closeModal('modalConge');
  renderConges();
}

function repondreConge(id, statut) {
  const list = getConges();
  const item = list.find(d => d.id === id);
  if (!item) return;
  if (statut === 'refuse') {
    const motif = prompt('Motif du refus :');
    if (motif === null) return;
    item.reponseMotif = motif.trim() || '';
  } else {
    item.reponseMotif = '';
  }
  item.statut = statut;
  item.traitePar = (() => { const s = Auth.getSession(); return s ? [s.prenom,s.nom].filter(Boolean).join(' ') || s.username : ''; })();
  item.dateTraitement = new Date().toISOString();
  setConges(list);
  toast('Demande ' + (statut === 'accepte' ? 'acceptée' : 'refusée'), 'success');
  if (typeof auditLog === 'function') auditLog('conge_' + statut, item.employeNom + ' — ' + item.type);
  renderConges();
}

function supprimerConge(id) {
  if (!confirm('Supprimer cette demande ?')) return;
  let list = getConges();
  list = list.filter(d => d.id !== id);
  setConges(list);
  toast('Demande supprimée', 'info');
  renderConges();
}

const CONGE_TYPE_LABELS = { cp:'Congés payés', rtt:'RTT', maladie:'Arrêt maladie', enfant_malade:'Enfant malade', formation:'Formation', autre:'Autre' };
const CONGE_STATUT_STYLES = { en_attente: { bg:'#d9770618', c:'#d97706', l:'En attente' }, accepte: { bg:'#16a34a18', c:'#16a34a', l:'Accepté' }, refuse: { bg:'#ef444418', c:'#ef4444', l:'Refusé' } };

function congeItemHtml(d, isAdmin) {
  const st = CONGE_STATUT_STYLES[d.statut] || CONGE_STATUT_STYLES.en_attente;
  const jours = Math.ceil((new Date(d.fin) - new Date(d.debut)) / 86400000) + 1;
  const canRepondre = isAdmin && d.statut === 'en_attente';
  return `<div style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)">
    <span style="font-size:1.2rem;margin-top:2px;flex-shrink:0">${d.type === 'maladie' ? '🤒' : d.type === 'enfant_malade' ? '👶' : d.type === 'formation' ? '📚' : '🗓'}</span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <span style="font-weight:600;font-size:.85rem">${escHtml(d.employeNom)}</span>
        <span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:${st.bg};color:${st.c}">${st.l}</span>
        <span style="font-size:.7rem;color:var(--g400)">${CONGE_TYPE_LABELS[d.type]||d.type}</span>
      </div>
      <div style="font-size:.76rem;color:var(--muted);margin-top:.2rem">
        ${formatDate(d.debut)} → ${formatDate(d.fin)} · ${jours} jour${jours>1?'s':''}
        · Demandé le ${new Date(d.dateDemande).toLocaleDateString('fr-FR')}
      </div>
      ${d.motif ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.25rem">${escHtml(d.motif)}</div>` : ''}
      ${d.statut === 'refuse' && d.reponseMotif ? `<div style="font-size:.73rem;color:var(--red);margin-top:.15rem">Motif du refus : ${escHtml(d.reponseMotif)}</div>` : ''}
      ${d.traitePar ? `<div style="font-size:.7rem;color:var(--muted);margin-top:.1rem">Traité par ${escHtml(d.traitePar)}</div>` : ''}
    </div>
    <div style="display:flex;gap:.25rem;flex-shrink:0">
      ${canRepondre ? `<button class="btn btn-ghost btn-sm" style="color:#16a34a;font-size:.72rem;padding:2px 10px" onclick="repondreConge('${d.id}','accepte')">✅ Accepter</button>
      <button class="btn btn-ghost btn-sm" style="color:#ef4444;font-size:.72rem;padding:2px 10px" onclick="repondreConge('${d.id}','refuse')">❌ Refuser</button>` : ''}
      ${isAdmin ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="supprimerConge('${d.id}')">✕</button>` : ''}
    </div>
  </div>`;
}

function renderConges() {
  const list = getConges();
  const filtreStatut = document.getElementById('cgFiltreStatut').value;
  const filtreEmploye = document.getElementById('cgFiltreEmploye').value;

  let filtered = list;
  if (filtreStatut) filtered = filtered.filter(d => d.statut === filtreStatut);
  if (filtreEmploye) filtered = filtered.filter(d => d.employeId === filtreEmploye);

  const enAttente = list.filter(d => d.statut === 'en_attente');
  const acceptes = list.filter(d => d.statut === 'accepte').length;
  const refuses = list.filter(d => d.statut === 'refuse').length;

  document.getElementById('cgStatEnAttente').textContent = enAttente.length;
  document.getElementById('cgStatAcceptes').textContent = acceptes;
  document.getElementById('cgStatRefuses').textContent = refuses;

  const isAdmin = Auth.isAdmin();

  const pendingCard = document.getElementById('cgPendingCard');
  if (pendingCard) {
    if (isAdmin && enAttente.length) {
      pendingCard.style.display = '';
      document.getElementById('cgPendingList').innerHTML = enAttente
        .sort((a,b) => (a.dateDemande||'').localeCompare(b.dateDemande||''))
        .map(d => congeItemHtml(d, isAdmin)).join('');
    } else {
      pendingCard.style.display = 'none';
    }
  }

  const el = document.getElementById('cgList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucune demande trouvée.</p></div>';
    return;
  }

  el.innerHTML = filtered.sort((a,b) => (b.dateDemande||'').localeCompare(a.dateDemande||'')).map(d => congeItemHtml(d, isAdmin)).join('');
}

document.addEventListener('DOMContentLoaded', initConges);
if (typeof registerPageInit === 'function') registerPageInit('conges', initConges);
