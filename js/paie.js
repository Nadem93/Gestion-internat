function getFichesPaie() { return DB.get(DB.keys.fichesPaie) || []; }
function setFichesPaie(d) { DB.set(DB.keys.fichesPaie, d); }

function paieFmtSize(b) {
  if (!b) return '';
  if (b < 1024) return b + ' o';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' Ko';
  return (b / (1024 * 1024)).toFixed(1) + ' Mo';
}

function paieCurrentUser() {
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

function paieFmtPeriode(p) {
  if (!p) return '';
  const [y, m] = p.split('-');
  const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${mois[parseInt(m, 10) - 1] || m} ${y}`;
}

function initPaie() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_paie')) return;
  if (Auth.isAdmin()) {
    const empSel = document.getElementById('pieFiltreEmploye');
    if (empSel) empSel.style.display = '';
  }
  renderPaie();
}

function openFichePaieModal() {
  const employes = DB.get(DB.keys.employes) || [];
  const sel = document.getElementById('pieFormEmploye');
  sel.innerHTML = employes.map(e => `<option value="${e.id}">${escHtml(e.prenom + ' ' + e.nom)}</option>`).join('');
  document.getElementById('pieFormPeriode').value = new Date().toISOString().slice(0, 7);
  document.getElementById('pieFormFile').value = '';
  openModal('modalFichePaie');
}

async function saveFichePaie() {
  const employeId = document.getElementById('pieFormEmploye').value;
  const employes = DB.get(DB.keys.employes) || [];
  const emp = employes.find(e => e.id === employeId);
  const periode = document.getElementById('pieFormPeriode').value;
  const fileInput = document.getElementById('pieFormFile');
  const file = fileInput.files[0];
  if (!employeId || !emp) { toast('Employé requis', 'error'); return; }
  if (!periode) { toast('Période requise', 'error'); return; }
  if (!file) { toast('Fichier requis', 'error'); return; }
  if (file.size > 3 * 1024 * 1024) { toast('Fichier trop lourd (max 3 Mo)', 'error'); return; }
  const data = await fileToBase64(file);
  const list = getFichesPaie();
  const session = Auth.getSession();
  list.push({
    id: genId(), employeId: emp.id, employeNom: emp.prenom + ' ' + emp.nom,
    periode, fichier: { name: file.name, mimeType: file.type, size: file.size, data },
    dateAjout: new Date().toISOString(),
    ajoutePar: session ? [session.prenom, session.nom].filter(Boolean).join(' ') || session.username : ''
  });
  setFichesPaie(list);
  if (typeof auditLog === 'function') auditLog('fiche_paie', emp.prenom + ' ' + emp.nom + ' — ' + paieFmtPeriode(periode));
  toast('Fiche de paie ajoutée', 'success');
  closeModal('modalFichePaie');
  renderPaie();
}

function supprimerFichePaie(id) {
  if (!confirm('Supprimer cette fiche de paie ?')) return;
  let list = getFichesPaie();
  list = list.filter(f => f.id !== id);
  setFichesPaie(list);
  toast('Fiche de paie supprimée', 'info');
  renderPaie();
}

function voirFichePaie(id) {
  const f = getFichesPaie().find(x => x.id === id);
  if (!f) return;
  const a = document.createElement('a');
  a.href = f.fichier.data;
  a.download = f.fichier.name;
  if ((f.fichier.mimeType || '').startsWith('image/') || f.fichier.mimeType === 'application/pdf') {
    window.open(f.fichier.data, '_blank');
  } else {
    a.click();
  }
}

function paieItemHtml(f, isAdmin) {
  return `<div style="display:flex;align-items:center;gap:.75rem;padding:.85rem 1rem;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)">
    <span style="font-size:1.2rem;flex-shrink:0">🧾</span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <span style="font-weight:600;font-size:.85rem">${paieFmtPeriode(f.periode)}</span>
        ${isAdmin ? `<span style="font-size:.7rem;color:var(--g400)">${escHtml(f.employeNom)}</span>` : ''}
      </div>
      <div style="font-size:.74rem;color:var(--muted);margin-top:.2rem">
        ${escHtml(f.fichier.name)} · ${paieFmtSize(f.fichier.size)} · Ajouté le ${new Date(f.dateAjout).toLocaleDateString('fr-FR')}${f.ajoutePar ? ' par ' + escHtml(f.ajoutePar) : ''}
      </div>
    </div>
    <div style="display:flex;gap:.25rem;flex-shrink:0">
      <button class="btn btn-outline btn-sm" onclick="voirFichePaie('${f.id}')">⬇ Télécharger</button>
      ${isAdmin ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="supprimerFichePaie('${f.id}')">✕</button>` : ''}
    </div>
  </div>`;
}

function renderPaie() {
  const isAdmin = Auth.isAdmin();
  const cu = paieCurrentUser();
  const list = getFichesPaie();

  if (isAdmin) {
    const empSel = document.getElementById('pieFiltreEmploye');
    if (empSel) {
      const current = empSel.value;
      const employesMap = new Map();
      list.forEach(f => { if (f.employeId && !employesMap.has(f.employeId)) employesMap.set(f.employeId, f.employeNom); });
      empSel.innerHTML = '<option value="">Tous les employés</option>' + Array.from(employesMap.entries()).map(([id, nom]) => `<option value="${id}">${escHtml(nom)}</option>`).join('');
      empSel.value = current;
    }
  }

  const anneeSel = document.getElementById('pieFiltreAnnee');
  if (anneeSel) {
    const current = anneeSel.value;
    const annees = [...new Set(list.map(f => (f.periode || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    anneeSel.innerHTML = '<option value="">Toutes les années</option>' + annees.map(a => `<option value="${a}">${a}</option>`).join('');
    anneeSel.value = current;
  }

  const filtreEmploye = isAdmin ? (document.getElementById('pieFiltreEmploye')?.value || '') : '';
  const filtreAnnee = document.getElementById('pieFiltreAnnee')?.value || '';

  let filtered = list;
  if (!isAdmin) filtered = filtered.filter(f => f.employeId === cu.employeId);
  if (filtreEmploye) filtered = filtered.filter(f => f.employeId === filtreEmploye);
  if (filtreAnnee) filtered = filtered.filter(f => (f.periode || '').slice(0, 4) === filtreAnnee);

  const el = document.getElementById('pieList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucune fiche de paie trouvée.</p></div>';
    return;
  }
  el.innerHTML = filtered.sort((a, b) => (b.periode || '').localeCompare(a.periode || '')).map(f => paieItemHtml(f, isAdmin)).join('');
}

document.addEventListener('DOMContentLoaded', initPaie);
if (typeof registerPageInit === 'function') registerPageInit('paie', initPaie);
