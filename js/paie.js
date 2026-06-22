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
  document.getElementById('pieFormPeriode').value = today().slice(0, 7);
  document.getElementById('pieFormFile').value = '';
  ['pieBrut','piePrimes','pieHeuresSup','pieRetenues'].forEach(id => document.getElementById(id).value = '');
  pieUpdateNet();
  openModal('modalFichePaie');
}

function pieUpdateNet() {
  const brut   = Number(document.getElementById('pieBrut').value) || 0;
  const primes = Number(document.getElementById('piePrimes').value) || 0;
  const hs     = Number(document.getElementById('pieHeuresSup').value) || 0;
  const ret    = Number(document.getElementById('pieRetenues').value) || 0;
  const el = document.getElementById('pieNetLive');
  if (!brut && !primes && !hs && !ret) { el.innerHTML = '<span style="color:var(--muted);font-size:.82rem">Net = Brut + Primes + Heures sup − Retenues</span>'; return; }
  const net = brut + primes + hs - ret;
  el.innerHTML = `<span style="font-size:1.3rem;font-weight:800;color:#16a34a">${net.toFixed(2)} €</span><span style="color:var(--muted);font-size:.78rem"> net</span>`;
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
  if (file && file.size > 3 * 1024 * 1024) { toast('Fichier trop lourd (max 3 Mo)', 'error'); return; }

  const brut   = Number(document.getElementById('pieBrut').value) || 0;
  const primes = Number(document.getElementById('piePrimes').value) || 0;
  const heuresSup = Number(document.getElementById('pieHeuresSup').value) || 0;
  const retenues  = Number(document.getElementById('pieRetenues').value) || 0;
  const net = (brut || primes || heuresSup || retenues) ? (brut + primes + heuresSup - retenues) : 0;

  const data = file ? await fileToBase64(file) : null;
  const list = getFichesPaie();
  const session = Auth.getSession();
  list.push({
    id: genId(), employeId: emp.id, employeNom: emp.prenom + ' ' + emp.nom,
    periode,
    brut, primes, heuresSup, retenues, net,
    fichier: file ? { name: file.name, mimeType: file.type, size: file.size, data } : null,
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
  if (!f || !f.fichier) return;
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
        ${f.net ? `<span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:#16a34a18;color:#16a34a">${f.net.toFixed(2)} € net</span>` : ''}
      </div>
      <div style="font-size:.74rem;color:var(--muted);margin-top:.2rem">
        ${f.fichier ? escHtml(f.fichier.name) + ' · ' + paieFmtSize(f.fichier.size) + ' · ' : ''}Ajouté le ${new Date(f.dateAjout).toLocaleDateString('fr-FR')}${f.ajoutePar ? ' par ' + escHtml(f.ajoutePar) : ''}
      </div>
    </div>
    <div style="display:flex;gap:.25rem;flex-shrink:0">
      ${f.fichier ? `<button class="btn btn-outline btn-sm" onclick="voirFichePaie('${f.id}')">⬇ Télécharger</button>` : ''}
      ${isAdmin ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="supprimerFichePaie('${f.id}')">✕</button>` : ''}
    </div>
  </div>`;
}

function renderRecapAnnuel(list, isAdmin) {
  const card = document.getElementById('pieRecapCard');
  if (!card) return;
  if (!isAdmin) { card.style.display = 'none'; return; }
  const withSalaire = list.filter(f => f.net > 0);
  if (!withSalaire.length) { card.style.display = 'none'; return; }
  card.style.display = '';

  const byEmp = {};
  withSalaire.forEach(f => {
    const k = f.employeId;
    if (!byEmp[k]) byEmp[k] = { nom: f.employeNom, brut:0, net:0, primes:0, heuresSup:0, count:0 };
    byEmp[k].brut += f.brut||0; byEmp[k].net += f.net||0; byEmp[k].primes += f.primes||0; byEmp[k].heuresSup += f.heuresSup||0; byEmp[k].count++;
  });

  document.getElementById('pieRecapBody').innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem">
    <thead><tr style="border-bottom:2px solid var(--border)">
      <th style="text-align:left;padding:.4rem .5rem">Employé</th>
      <th style="text-align:right;padding:.4rem .5rem">Bulletins</th>
      <th style="text-align:right;padding:.4rem .5rem">Total brut</th>
      <th style="text-align:right;padding:.4rem .5rem">Primes</th>
      <th style="text-align:right;padding:.4rem .5rem">Heures sup</th>
      <th style="text-align:right;padding:.4rem .5rem">Total net</th>
    </tr></thead>
    <tbody>${Object.values(byEmp).map(e => `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:.4rem .5rem;font-weight:600">${escHtml(e.nom)}</td>
      <td style="text-align:right;padding:.4rem .5rem">${e.count}</td>
      <td style="text-align:right;padding:.4rem .5rem">${e.brut.toFixed(2)} €</td>
      <td style="text-align:right;padding:.4rem .5rem">${e.primes.toFixed(2)} €</td>
      <td style="text-align:right;padding:.4rem .5rem">${e.heuresSup.toFixed(2)} €</td>
      <td style="text-align:right;padding:.4rem .5rem;font-weight:700;color:#16a34a">${e.net.toFixed(2)} €</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
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

  const session = Auth.getSession();
  let filtered = list;
  if (!isAdmin) filtered = filtered.filter(f =>
    f.employeId === cu.employeId || f.employeId === String(session?.userId)
  );
  if (filtreEmploye) filtered = filtered.filter(f => f.employeId === filtreEmploye);
  if (filtreAnnee) filtered = filtered.filter(f => (f.periode || '').slice(0, 4) === filtreAnnee);

  renderRecapAnnuel(filtered, isAdmin);

  const el = document.getElementById('pieList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucune fiche de paie trouvée.</p></div>';
    return;
  }
  el.innerHTML = filtered.sort((a, b) => (b.periode || '').localeCompare(a.periode || '')).map(f => paieItemHtml(f, isAdmin)).join('');
}

document.addEventListener('DOMContentLoaded', initPaie);
if (typeof registerPageInit === 'function') registerPageInit('paie', initPaie);
