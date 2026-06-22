const ENTRETIEN_TYPE_LABELS = { annuel: 'Entretien annuel', professionnel: 'Entretien professionnel', suivi: 'Entretien de suivi' };
const ENTRETIEN_STATUT_STYLES = { planifie: { bg: '#d9770618', c: '#d97706', l: 'Planifié' }, realise: { bg: '#16a34a18', c: '#16a34a', l: 'Réalisé' } };

// ── Grille de compétences ──
const ET_GRILLE = [
  { id:'qualite',     dim:'Savoir-faire', label:'Qualité du travail' },
  { id:'autonomie',   dim:'Savoir-faire', label:'Autonomie' },
  { id:'organisation',dim:'Savoir-faire', label:'Organisation' },
  { id:'equipe',      dim:'Savoir-être',  label:"Travail d'équipe" },
  { id:'communication',dim:'Savoir-être', label:'Communication' },
  { id:'assiduite',   dim:'Savoir-être',  label:'Ponctualité / assiduité' },
  { id:'objectifs_att',dim:'Résultats',   label:'Atteinte des objectifs précédents' },
  { id:'initiative',  dim:'Résultats',    label:'Initiative' }
];
const ET_NOTES = [
  { v:1, l:'À améliorer', c:'#dc2626' },
  { v:2, l:'Satisfaisant', c:'#d97706' },
  { v:3, l:'Bon', c:'#16a34a' },
  { v:4, l:'Excellent', c:'#0891b2' }
];

function etRenderGrille(grille) {
  const container = document.getElementById('etGrilleBody');
  if (!container) return;
  const dims = [...new Set(ET_GRILLE.map(g => g.dim))];
  container.innerHTML = dims.map(dim => `
    <div style="margin-bottom:.6rem">
      <div style="font-size:.74rem;font-weight:700;color:#9333ea;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.3rem">${dim}</div>
      ${ET_GRILLE.filter(g => g.dim === dim).map(g => {
        const val = grille?.[g.id] || '';
        return `<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem;padding:.3rem .5rem;background:#f8fafc;border-radius:6px">
          <label style="flex:1;font-size:.8rem">${g.label}</label>
          <select name="etg_${g.id}" style="font-size:.78rem;padding:.2rem .35rem;border:1px solid var(--border);border-radius:6px">
            <option value="">—</option>
            ${ET_NOTES.map(n => `<option value="${n.v}"${Number(val)===n.v?' selected':''}>${n.v} — ${n.l}</option>`).join('')}
          </select>
        </div>`;
      }).join('')}
    </div>`).join('');
  container.addEventListener('change', etUpdateLiveScore);
  etUpdateLiveScore();
}

function etUpdateLiveScore() {
  let total = 0, n = 0;
  document.querySelectorAll('#etGrilleBody [name^="etg_"]').forEach(el => {
    const v = Number(el.value);
    if (v > 0) { total += v; n++; }
  });
  const el = document.getElementById('etGrilleLive');
  if (!el) return;
  if (!n) { el.innerHTML = '<span style="color:var(--muted)">Notez chaque item ci-dessous…</span>'; return; }
  const avg = total / n;
  const note = ET_NOTES.find(x => avg >= x.v - 0.5 && avg < x.v + 0.5) || ET_NOTES[Math.round(avg)-1] || ET_NOTES[0];
  el.innerHTML = `<span style="font-size:1.3rem;font-weight:800;color:${note.c}">${avg.toFixed(1)}</span><span style="color:var(--muted)"> / 4</span> — <span style="color:${note.c};font-weight:600">${note.l}</span>`;
}

function etCollectGrille() {
  const grille = {};
  document.querySelectorAll('#etGrilleBody [name^="etg_"]').forEach(el => {
    const id = el.name.replace('etg_','');
    if (el.value) grille[id] = Number(el.value);
  });
  return grille;
}

function getEntretiens() { return DB.get(DB.keys.entretiens) || []; }
function setEntretiens(d) { DB.set(DB.keys.entretiens, d); }

function entretienCurrentUser() {
  const session = Auth.getSession();
  if (!session) return { employeId: 'anon', employeNom: 'Inconnu' };
  const users = DB.get(DB.keys.users) || [];
  const user = users.find(u => String(u.id) === String(session.userId));
  const prenom = user?.prenom || session.prenom || '';
  const nom = user?.nom || session.nom || '';
  const employes = DB.get(DB.keys.employes) || [];
  const emp = employes.find(e => prenom && nom && e.prenom === prenom && e.nom === nom);
  return {
    employeId: emp ? emp.id : 'u' + session.userId,
    employeNom: [prenom, nom].filter(Boolean).join(' ') || session.username
  };
}

function initEntretiens() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_entretiens')) return;
  if (Auth.isAdmin()) {
    const empSel = document.getElementById('etFiltreEmploye');
    if (empSel) empSel.style.display = '';
  }
  renderEntretiens();
}

function openEntretienModal(id) {
  const employes = DB.get(DB.keys.employes) || [];
  const list = getEntretiens();
  const item = id ? list.find(e => e.id === id) : null;
  document.getElementById('etModalTitle').textContent = item ? '✎ Modifier l’entretien' : '🧑‍💼 Nouvel entretien';
  const sel = document.getElementById('etFormEmploye');
  sel.innerHTML = employes.map(e => `<option value="${e.id}">${escHtml(e.prenom + ' ' + e.nom)}</option>`).join('');
  if (item) sel.value = item.employeId;
  document.getElementById('etFormDate').value = item ? item.date : today();
  document.getElementById('etFormType').value = item ? item.type : 'annuel';
  document.getElementById('etFormStatut').value = item ? item.statut : 'planifie';
  document.getElementById('etFormEvaluateur').value = item ? item.evaluateur || '' : '';
  document.getElementById('etFormBilan').value = item ? item.bilan || '' : '';
  document.getElementById('etFormObjectifs').value = item ? item.objectifs || '' : '';
  document.getElementById('etFormFormations').value = item ? item.formations || '' : '';
  document.getElementById('modalEntretien').dataset.editId = item ? item.id : '';
  etRenderGrille(item?.grille);
  const exportBtn = document.getElementById('etExportBtn');
  if (exportBtn) exportBtn.style.display = item ? '' : 'none';
  openModal('modalEntretien');
}

function saveEntretien() {
  const id = document.getElementById('modalEntretien').dataset.editId;
  const employeId = document.getElementById('etFormEmploye').value;
  const employes = DB.get(DB.keys.employes) || [];
  const emp = employes.find(e => e.id === employeId);
  const date = document.getElementById('etFormDate').value;
  const type = document.getElementById('etFormType').value;
  const statut = document.getElementById('etFormStatut').value;
  const evaluateur = document.getElementById('etFormEvaluateur').value.trim();
  const bilan = document.getElementById('etFormBilan').value.trim();
  const objectifs = document.getElementById('etFormObjectifs').value.trim();
  const formations = document.getElementById('etFormFormations').value.trim();
  const grille = etCollectGrille();
  if (!employeId || !emp) { toast('Employé requis', 'error'); return; }
  if (!date) { toast('Date requise', 'error'); return; }
  let list = getEntretiens();
  if (id) {
    list = list.map(e => e.id === id ? { ...e, employeId, employeNom: emp.prenom + ' ' + emp.nom, date, type, statut, evaluateur, bilan, objectifs, formations, grille } : e);
    toast('Entretien mis à jour', 'success');
  } else {
    list.push({
      id: genId(), employeId, employeNom: emp.prenom + ' ' + emp.nom,
      date, type, statut, evaluateur, bilan, objectifs, formations, grille,
      createdAt: new Date().toISOString()
    });
    toast('Entretien enregistré', 'success');
  }
  setEntretiens(list);
  if (typeof auditLog === 'function') auditLog('entretien', emp.prenom + ' ' + emp.nom + ' — ' + ENTRETIEN_TYPE_LABELS[type]);
  closeModal('modalEntretien');
  renderEntretiens();
}

function supprimerEntretien(id) {
  if (!confirm('Supprimer cet entretien ?')) return;
  let list = getEntretiens();
  list = list.filter(e => e.id !== id);
  setEntretiens(list);
  toast('Entretien supprimé', 'info');
  renderEntretiens();
}

function etScoreMoyen(grille) {
  const vals = Object.values(grille || {}).filter(v => v > 0);
  if (!vals.length) return null;
  return vals.reduce((a,b) => a+b, 0) / vals.length;
}

function entretienItemHtml(e, isAdmin) {
  const st = ENTRETIEN_STATUT_STYLES[e.statut] || ENTRETIEN_STATUT_STYLES.planifie;
  const score = etScoreMoyen(e.grille);
  const scoreNote = score !== null ? (ET_NOTES.find(n => score >= n.v - 0.5 && score < n.v + 0.5) || ET_NOTES[0]) : null;
  return `<div style="padding:.85rem 1rem;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)">
    <div style="display:flex;align-items:flex-start;gap:.75rem">
      <span style="font-size:1.2rem;margin-top:2px;flex-shrink:0">🧑‍💼</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          ${isAdmin ? `<span style="font-weight:600;font-size:.85rem">${escHtml(e.employeNom)}</span>` : ''}
          <span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:${st.bg};color:${st.c}">${st.l}</span>
          <span style="font-size:.7rem;color:var(--g400)">${ENTRETIEN_TYPE_LABELS[e.type] || e.type}</span>
          ${scoreNote ? `<span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:${scoreNote.c}18;color:${scoreNote.c}">${score.toFixed(1)}/4 — ${scoreNote.l}</span>` : ''}
        </div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:.2rem">
          ${formatDate(e.date)}${e.evaluateur ? ' · Évaluateur : ' + escHtml(e.evaluateur) : ''}
        </div>
        ${e.bilan ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.4rem"><strong>Bilan :</strong> ${escHtml(e.bilan)}</div>` : ''}
        ${e.objectifs ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.25rem"><strong>Objectifs :</strong> ${escHtml(e.objectifs)}</div>` : ''}
        ${e.formations ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.25rem"><strong>Formations :</strong> ${escHtml(e.formations)}</div>` : ''}
      </div>
      ${isAdmin ? `<div style="display:flex;gap:.25rem;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="exportEntretienPdf('${e.id}')" title="Export PDF">🖨</button>
        <button class="btn btn-ghost btn-sm" onclick="openEntretienModal('${e.id}')" title="Modifier">✎</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="supprimerEntretien('${e.id}')">✕</button>
      </div>` : ''}
    </div>
  </div>`;
}

function exportEntretienPdf(id) {
  const e = getEntretiens().find(x => x.id === id);
  if (!e) return;
  const score = etScoreMoyen(e.grille);
  const scoreNote = score !== null ? (ET_NOTES.find(n => score >= n.v - 0.5 && score < n.v + 0.5) || ET_NOTES[0]) : null;
  const grilleRows = ET_GRILLE.filter(g => e.grille?.[g.id]).map(g => {
    const v = e.grille[g.id];
    const n = ET_NOTES.find(x => x.v === v);
    return `<tr><td style="padding:.3rem .5rem;border-bottom:1px solid #e2e8f0">${g.dim} — ${g.label}</td><td style="padding:.3rem .5rem;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:${n?.c||'#000'}">${v} — ${n?.l||''}</td></tr>`;
  }).join('');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Entretien — ${escHtml(e.employeNom)}</title>
    <style>body{font-family:Georgia,serif;max-width:760px;margin:2rem auto;padding:0 1.5rem;line-height:1.6;color:#1e293b}
    h1{font-size:1.4rem;border-bottom:2px solid #0f2b4a;padding-bottom:.4rem}
    h4{color:#0f2b4a;margin:1.1rem 0 .3rem}
    table{width:100%;border-collapse:collapse;margin-top:.3rem}
    .meta{color:#64748b;font-size:.85rem;margin-bottom:1.5rem}</style></head><body>
    <h1>${ENTRETIEN_TYPE_LABELS[e.type]||e.type} — ${escHtml(e.employeNom)}</h1>
    <div class="meta">${formatDate(e.date)}${e.evaluateur?' · Évaluateur : '+escHtml(e.evaluateur):''}</div>
    ${scoreNote ? `<h4>Score global</h4><p><strong style="font-size:1.3rem;color:${scoreNote.c}">${score.toFixed(1)} / 4</strong> — ${scoreNote.l}</p>` : ''}
    ${grilleRows ? `<h4>Grille de compétences</h4><table>${grilleRows}</table>` : ''}
    ${e.bilan ? `<h4>Bilan</h4><p>${escHtml(e.bilan).replace(/\n/g,'<br/>')}</p>` : ''}
    ${e.objectifs ? `<h4>Objectifs fixés</h4><p>${escHtml(e.objectifs).replace(/\n/g,'<br/>')}</p>` : ''}
    ${e.formations ? `<h4>Besoins en formation</h4><p>${escHtml(e.formations).replace(/\n/g,'<br/>')}</p>` : ''}
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

function renderEntretiens() {
  const isAdmin = Auth.isAdmin();
  const cu = entretienCurrentUser();
  const list = getEntretiens();

  if (isAdmin) {
    const empSel = document.getElementById('etFiltreEmploye');
    if (empSel) {
      const current = empSel.value;
      const employesMap = new Map();
      list.forEach(e => { if (e.employeId && !employesMap.has(e.employeId)) employesMap.set(e.employeId, e.employeNom); });
      empSel.innerHTML = '<option value="">Tous les employés</option>' + Array.from(employesMap.entries()).map(([id, nom]) => `<option value="${id}">${escHtml(nom)}</option>`).join('');
      empSel.value = current;
    }
  }

  const filtreEmploye = isAdmin ? (document.getElementById('etFiltreEmploye')?.value || '') : '';
  const filtreType = document.getElementById('etFiltreType')?.value || '';
  const filtreStatut = document.getElementById('etFiltreStatut')?.value || '';

  let filtered = list;
  if (!isAdmin) filtered = filtered.filter(e => e.employeId === cu.employeId);
  if (filtreEmploye) filtered = filtered.filter(e => e.employeId === filtreEmploye);
  if (filtreType) filtered = filtered.filter(e => e.type === filtreType);
  if (filtreStatut) filtered = filtered.filter(e => e.statut === filtreStatut);

  const statsSource = isAdmin ? list : list.filter(e => e.employeId === cu.employeId);
  document.getElementById('etStatPlanifies').textContent = statsSource.filter(e => e.statut === 'planifie').length;
  document.getElementById('etStatRealises').textContent = statsSource.filter(e => e.statut === 'realise').length;
  document.getElementById('etStatTotal').textContent = statsSource.length;

  const el = document.getElementById('etList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucun entretien trouvé.</p></div>';
    return;
  }
  el.innerHTML = filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => entretienItemHtml(e, isAdmin)).join('');
}

document.addEventListener('DOMContentLoaded', initEntretiens);
if (typeof registerPageInit === 'function') registerPageInit('entretiens', initEntretiens);
