const SP_PRESTATIONS = [
  { key:'pd_soins', label:'Soins', cat:'Directe', icon:'🏥' },
  { key:'pd_accomp_educatif', label:'Accompagnement éducatif', cat:'Directe', icon:'📚' },
  { key:'pd_accomp_social', label:'Accompagnement social', cat:'Directe', icon:'🤝' },
  { key:'pd_orientation', label:'Orientation', cat:'Directe', icon:'🧭' },
  { key:'pd_education', label:'Éducation', cat:'Directe', icon:'✏️' },
  { key:'pd_scolarite', label:'Scolarité', cat:'Directe', icon:'🎒' },
  { key:'pi_coordination', label:'Coordination', cat:'Indirecte', icon:'🔄' },
  { key:'pi_communication', label:'Communication', cat:'Indirecte', icon:'📢' },
  { key:'pi_gestion', label:'Gestion', cat:'Indirecte', icon:'📊' },
  { key:'pi_logistique', label:'Logistique', cat:'Indirecte', icon:'📦' },
  { key:'pi_administration', label:'Administration', cat:'Indirecte', icon:'📋' },
  { key:'pi_services_generaux', label:'Services généraux', cat:'Indirecte', icon:'🏗️' }
];

function seedSpExemples() {
  const residents = DB.get(DB.keys.residents) || [];
  let changed = false;
  residents.forEach(r => {
    if (r.serafinph && Object.values(r.serafinph.prestations||{}).some(p => p.niveau > 0)) return;
    const prestations = {};
    const spKeys = ['pd_soins','pd_accomp_educatif','pd_accomp_social','pd_orientation','pd_education','pd_scolarite','pi_coordination','pi_communication','pi_gestion','pi_logistique','pi_administration','pi_services_generaux'];
    spKeys.forEach(k => { prestations[k] = { niveau: Math.floor(Math.random() * 5) }; });
    r.serafinph = {
      prestations,
      dateEvaluation: new Date(Date.now() - Math.random() * 180 * 86400000).toISOString().slice(0,10),
      notes: Math.random() < 0.3 ? 'Profil établi en équipe pluridisciplinaire.' : ''
    };
    changed = true;
  });
  if (changed) { DB.set(DB.keys.residents, residents); }
}

function getSpJournalStats() {
  const journal = DB.get(DB.keys.journal) || [];
  const direct = journal.filter(e => e.serafinphType === 'direct').length;
  const indirect = journal.filter(e => e.serafinphType === 'indirect').length;
  return { direct, indirect, total: direct + indirect };
}

function initSerafinph() {
  const _s = Auth.requireAuth();
  if (!_s) return;
  if (!requireModule('access_serafinph')) return;
  seedSpExemples();
  renderSerafinph();
}

function getSpData(r) {
  const sp = r.serafinph || {};
  const prestations = {};
  SP_PRESTATIONS.forEach(p => {
    prestations[p.key] = { niveau: (sp.prestations && sp.prestations[p.key] && sp.prestations[p.key].niveau) || 0 };
  });
  return { prestations, dateEvaluation: sp.dateEvaluation || '', notes: sp.notes || '' };
}

function renderSerafinph() {
  const residents = DB.get(DB.keys.residents) || [];
  const withSp = residents.filter(r => r.serafinph && Object.values(r.serafinph.prestations||{}).some(p => p.niveau > 0));
  const total = residents.length;

  // Stats
  const allScores = withSp.map(r => {
    const sp = getSpData(r);
    return { total: Object.values(sp.prestations).reduce((a,p) => a + p.niveau, 0), resident: r, sp };
  });

  const gmps = allScores.length ? (allScores.reduce((a,s) => a + s.total / SP_PRESTATIONS.length, 0) / allScores.length).toFixed(1) : '—';
  const totalScore = allScores.reduce((a,s) => a + s.total, 0);
  const nbEleves = allScores.filter(s => Object.values(s.sp.prestations).filter(p => p.niveau >= 3).length > 0).length;

  document.getElementById('spStatGmps').textContent = gmps;
  document.getElementById('spStatTotal').textContent = totalScore;
  document.getElementById('spStatEvalues').textContent = withSp.length + '/' + total;
  document.getElementById('spStatEleves').textContent = nbEleves;

  // Journal SERAFIN-PH
  const jStats = getSpJournalStats();
  const jEl = document.getElementById('spJournalStats');
  if (jEl) {
    jEl.innerHTML = jStats.total > 0
      ? `<div style="display:flex;gap:1rem;align-items:center;padding:.25rem 0">
          <span style="font-size:.78rem;color:var(--muted)">Entrées au journal :</span>
          <span style="font-weight:700;color:#8b5cf6">${jStats.direct} directe${jStats.direct>1?'s':''}</span>
          <span style="color:var(--g400)">·</span>
          <span style="font-weight:700;color:#f97316">${jStats.indirect} indirecte${jStats.indirect>1?'s':''}</span>
          <span style="color:var(--g400)">· Total : ${jStats.total}</span>
        </div>`
      : '<div style="font-size:.75rem;color:var(--muted);padding:.25rem 0">Aucune entrée de journal associée au SERAFIN-PH. Utilisez le champ « SERAFIN-PH » dans le journal pour taguer vos transmissions.</div>';
  }

  // Vue par prestation
  const prestStats = SP_PRESTATIONS.map(p => {
    const niveaux = allScores.map(s => s.sp.prestations[p.key].niveau);
    const moy = niveaux.length ? (niveaux.reduce((a,n) => a + n, 0) / niveaux.length).toFixed(1) : '0.0';
    const repart = [0,0,0,0,0];
    niveaux.forEach(n => repart[n]++);
    return { ...p, moy, repart, count: niveaux.length };
  });

  document.getElementById('spPrestationsList').innerHTML = prestStats.map(p => {
    const nivLabel = ['0','Faible','Modéré','Important','Très important'];
    const cols = p.repart.map((c, i) => {
      const pct = p.count ? (c / p.count * 100).toFixed(0) : 0;
      return `<div style="display:flex;align-items:center;gap:.25rem;font-size:.68rem">
        <span style="width:14px;text-align:center;font-weight:700;color:${['#94a3b8','#16a34a','#d97706','#f97316','#ef4444'][i]}">${i}</span>
        <div style="flex:1;height:8px;border-radius:99px;background:#e2e8f0;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${['#94a3b8','#16a34a','#d97706','#f97316','#ef4444'][i]};border-radius:99px"></div>
        </div>
        <span style="width:20px;text-align:right;color:var(--g400)">${c}</span>
      </div>`;
    }).join('');
    return `<div style="display:flex;align-items:center;gap:.75rem;padding:.7rem 1.25rem;border-bottom:1px solid var(--border)">
      <span style="font-size:1rem">${p.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.82rem">${p.label}</div>
        <div style="font-size:.7rem;color:var(--muted)">${p.cat}</div>
      </div>
      <div style="width:140px;display:flex;flex-direction:column;gap:2px">${cols}</div>
      <div style="font-weight:700;font-size:.85rem;color:#8b5cf6;width:40px;text-align:right">${p.moy}</div>
    </div>`;
  }).join('') || '<div class="empty" style="padding:2rem"><p>Aucune donnée SERAFIN-PH</p></div>';

  // Detail par resident
  const nivColors = ['#d1d5db','#22c55e','#eab308','#f97316','#ef4444'];
  document.getElementById('spResidentsList').innerHTML = allScores.sort((a,b) => b.total - a.total).map(s => {
    const prestItems = SP_PRESTATIONS.map(p => {
      const n = s.sp.prestations[p.key].niveau;
      return `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 3px;background:#f8fafc;border-radius:6px;padding:4px 8px;border:1px solid #e2e8f0">
        <span style="font-size:.85rem">${p.icon}</span>
        <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:4px;background:${nivColors[n]};color:#fff;font-size:.7rem;font-weight:700;padding:0 4px">${n}</span>
        <span style="color:#334155;font-size:.7rem;font-weight:500">${p.label}</span>
      </span>`;
    }).join('');
    return `<div style="display:flex;align-items:center;gap:.75rem;padding:.65rem 1.25rem;border-bottom:1px solid var(--border)">
      <span style="width:32px;height:32px;border-radius:50%;background:${s.resident.color||'#3b82f6'}20;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.72rem;color:${s.resident.color||'#3b82f6'};flex-shrink:0">${(s.resident.prenom||'')[0]}${(s.resident.nom||'')[0]}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.8rem">${escHtml(s.resident.prenom+' '+s.resident.nom)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:3px">${prestItems}</div>
      </div>
      <div style="font-weight:700;font-size:.85rem;color:#8b5cf6">${s.total}</div>
    </div>`;
  }).join('') || '<div class="empty" style="padding:2rem"><p>Aucun résident évalué</p></div>';
}

document.addEventListener('DOMContentLoaded', initSerafinph);
if (typeof registerPageInit === 'function') registerPageInit('serafinph', initSerafinph);
