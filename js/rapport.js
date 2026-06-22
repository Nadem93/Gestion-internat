let _rapportAnnee = new Date().getFullYear();

function initRapport() {
  Auth.requireAuth();
  document.getElementById('rapAnnee').value = _rapportAnnee;
  document.getElementById('rapAnnee').addEventListener('change', e => {
    _rapportAnnee = Number(e.target.value);
    renderRapport();
  });
  renderRapport();
}

function renderRapport() {
  const an  = _rapportAnnee;
  const deb = `${an}-01-01`;
  const fin = `${an}-12-31`;
  const inRange = d => d >= deb && d <= fin;
  const residents = DB.get(DB.keys.residents) || [];

  // ── Résidents présents pendant l'année ──────────────────────────────────────
  const residentsActifs = residents.filter(r => {
    const entree  = r.dateEntree  || r.createdAt?.slice(0,10) || deb;
    const sortie  = r.dateSortie  || fin;
    return entree <= fin && sortie >= deb;
  });

  // ── Taux d'occupation ───────────────────────────────────────────────────────
  const capacite   = Number(document.getElementById('rapCapacite')?.value) || 20;
  const joursAn    = (an % 4 === 0 && (an % 100 !== 0 || an % 400 === 0)) ? 366 : 365;
  let totalJours   = 0;
  residents.forEach(r => {
    const entree = r.dateEntree || r.createdAt?.slice(0,10) || deb;
    const sortie = r.dateSortie || fin;
    const debut  = entree < deb ? deb : entree;
    const endfin = sortie > fin ? fin : sortie;
    if (debut <= endfin) {
      totalJours += (new Date(endfin) - new Date(debut)) / 86400000 + 1;
    }
  });
  const txOccupation = Math.min(100, Math.round(totalJours / (capacite * joursAn) * 100));

  // ── Admissions & sorties ────────────────────────────────────────────────────
  const admissions = (DB.get(DB.keys.admissions) || []).filter(a => a.dateEntree && inRange(a.dateEntree));
  const sorties    = residents.filter(r => r.dateSortie && inRange(r.dateSortie));
  const mouvements = residents.filter(r => {
    const e = r.dateEntree || ''; const s = r.dateSortie || '';
    return inRange(e) || inRange(s);
  });

  // ── EIG ────────────────────────────────────────────────────────────────────
  const eigs  = (DB.get(DB.keys.incidents) || []).filter(e => {
    const d = (e.date||e.createdAt||'').slice(0,10);
    return inRange(d);
  });
  const eigCats = {};
  eigs.forEach(e => { eigCats[e.type||'autre'] = (eigCats[e.type||'autre']||0) + 1; });

  // ── Transmissions ────────────────────────────────────────────────────────────
  const transmissions = (DB.get(DB.keys.transmissions) || []).filter(t => inRange(t.date||''));
  const trByMonth = Array(12).fill(0);
  transmissions.forEach(t => {
    if (t.date) { const m = Number(t.date.slice(5,7)) - 1; if (m >= 0 && m < 12) trByMonth[m]++; }
  });

  // ── Présences ────────────────────────────────────────────────────────────────
  const presences = (DB.get(DB.keys.presences) || []).filter(p => inRange(p.date||''));

  // ── Avenants ─────────────────────────────────────────────────────────────────
  const ppe = (DB.get(DB.keys.ppe) || []).filter(p => inRange((p.createdAt||'').slice(0,10)));

  // ── Médicaments ──────────────────────────────────────────────────────────────
  const medData = DB.get(DB.keys.medicaments) || {};
  const totalMeds = Object.values(medData).reduce((s,v) => s+(v||[]).length, 0);

  // ── Évaluations ───────────────────────────────────────────────────────────────
  const evals = (DB.get(DB.keys.evaluations) || []).filter(e => inRange(e.date||''));

  // ── Satisfaction ──────────────────────────────────────────────────────────────
  const satData = (DB.get(DB.keys.satisfaction) || []).filter(s => inRange(s.date||''));
  const SAT_CATS_RAP = {
    'Accueil & intégration': ['accueil'],
    'Hébergement': ['chambre','parties_com'],
    'Restauration': ['repas_qualite','repas_quantite'],
    'Activités': ['activites'],
    'Équipe & accompagnement': ['respect','disponibilite','soins'],
    'Sécurité': ['securite'],
    'Communication': ['communication'],
    'Satisfaction globale': ['global']
  };
  const satAvgQ = {};
  Object.values(SAT_CATS_RAP).flat().forEach(qid => {
    const vals = satData.map(s => s.reponses?.[qid]).filter(v => v != null);
    satAvgQ[qid] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  });
  const satGlobalVals = Object.values(satAvgQ).filter(v => v !== null);
  const satScore = satGlobalVals.length ? satGlobalVals.reduce((a,b)=>a+b,0)/satGlobalVals.length : null;
  const satScorePct = satScore !== null ? Math.round(satScore * 25) : null;
  const satColor = satScore === null ? '#94a3b8' : satScore >= 3.5 ? '#0d9488' : satScore >= 2.5 ? '#16a34a' : satScore >= 1.5 ? '#d97706' : '#dc2626';

  // ────────────────────────────────────────────────────────────────────────────
  const MOIS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  const maxTr = Math.max(...trByMonth, 1);

  const eigTypeLabel = { chute:'Chute', agression:'Agression', fugue:'Fugue', violence:'Violence', medical:'Médical', materiel:'Dégât matériel', accident:'Accident', autre:'Autre' };

  const _card = (content, mb='1.25rem') => `<div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:${mb}">${content}</div>`;
  const _head = (txt, badge='') => `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem"><div style="font-size:1.05rem;font-weight:700;color:var(--text)">${txt}</div>${badge}</div>`;
  const _methode = (txt) => `<div style="background:#f0f5fa;border-left:3px solid #0369a1;border-radius:0 8px 8px 0;padding:.6rem 1rem;margin-bottom:1rem;font-size:.85rem;color:#2d4a62;line-height:1.55"><strong>📌 Méthode d'évaluation :</strong> ${txt}</div>`;

  document.getElementById('rapContent').innerHTML = `

    <!-- ── Résumé exécutif ── -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.85rem;margin-bottom:1.5rem">
      ${_rapStat('👥','Résidents accueillis', residentsActifs.length,'présents sur l\'année','#0891b2')}
      ${_rapStat('📈','Taux d\'occupation', txOccupation+'%', totalJours+' journées réalisées', txOccupation>=80?'#16a34a':txOccupation>=60?'#d97706':'#dc2626')}
      ${_rapStat('🚪','Admissions', admissions.length,'nouveaux résidents','#6366f1')}
      ${_rapStat('⚡','EIG déclarés', eigs.length,'événements indésirables','#dc2626')}
      ${_rapStat('💬','Transmissions', transmissions.length,'messages d\'équipe','#3b82f6')}
      ${_rapStat('📋','Avenants PPE', ppe.length,'révisés ou créés','#f97316')}
      ${_rapStat('📊','Évaluations', evals.length,'grilles remplies','#8b5cf6')}
      ${_rapStat('⭐','Satisfaction', satScorePct !== null ? satScorePct+'%' : '—', satData.length+' questionnaire'+(satData.length!==1?'s':''), satColor)}
    </div>

    <!-- ── Transmissions par mois ── -->
    ${_card(`
      ${_head('💬 Transmissions par mois — '+an)}
      ${_methode('Chaque transmission correspond à un message d\'équipe enregistré dans le module de communication. Le graphique comptabilise le nombre de transmissions créées chaque mois de l\'année, indépendamment de leur catégorie ou de leur auteur.')}
      <div style="display:flex;align-items:flex-end;gap:6px;height:160px;padding-top:.5rem">
        ${trByMonth.map((v,i) => {
          const h = maxTr > 0 ? Math.max(Math.round(v/maxTr*140), v>0?6:0) : 0;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="font-size:.82rem;font-weight:600;color:var(--text);min-height:1.2rem;text-align:center">${v||''}</div>
            <div style="width:100%;height:${h}px;background:${v>0?'#3b82f6':'#e2e8f0'};border-radius:5px 5px 0 0;min-height:4px;transition:height .3s"></div>
            <div style="font-size:.78rem;color:var(--muted);font-weight:500">${MOIS[i]}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border)">
        <span style="font-size:.85rem;color:var(--muted)">Total : <strong style="color:var(--text)">${transmissions.length} transmissions</strong></span>
        <span style="font-size:.85rem;color:var(--muted)">Moyenne : <strong style="color:var(--text)">${Math.round(transmissions.length/12)}/mois</strong></span>
      </div>
    `)}

    <!-- ── EIG + Occupation ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem">

      ${_card(`
        ${_head('⚡ Événements indésirables graves (EIG)', `<span style="font-size:.85rem;font-weight:700;color:#dc2626;background:#fef2f2;padding:2px 12px;border-radius:999px">${eigs.length} total</span>`)}
        ${_methode('Les EIG sont les incidents déclarés obligatoirement selon la procédure établie : chutes, agressions, fugues, accidents, incidents médicaux, dégâts matériels. Chaque événement est catégorisé et horodaté au moment de la déclaration.')}
        ${eigs.length ? Object.entries(eigCats).map(([t,n]) => {
          const pct = Math.round(n/eigs.length*100);
          return `<div style="margin-bottom:.6rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem">
              <span style="font-size:.9rem;color:var(--text);font-weight:500">${eigTypeLabel[t]||t}</span>
              <span style="font-size:.9rem;font-weight:700;color:#dc2626">${n} (${pct}%)</span>
            </div>
            <div style="height:10px;background:#fef2f2;border-radius:999px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:#dc2626;border-radius:999px"></div>
            </div>
          </div>`;
        }).join('') : '<div style="font-size:.9rem;color:#16a34a;font-weight:600;padding:.75rem 0">✅ Aucun EIG déclaré sur la période</div>'}
      `, '0')}

      ${_card(`
        ${_head('📈 Taux d\'occupation', `<span style="font-size:1.5rem;font-weight:800;color:${txOccupation>=80?'#16a34a':txOccupation>=60?'#d97706':'#dc2626'}">${txOccupation}%</span>`)}
        ${_methode('Le taux d\'occupation est calculé en rapportant le nombre de journées réalisées (somme des jours de présence de chaque résident) au nombre de journées théoriques (capacité × jours de l\'année). Capacité paramétrée : '+capacite+' places.')}
        <div style="height:20px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:.6rem">
          <div style="height:100%;width:${txOccupation}%;background:${txOccupation>=80?'#16a34a':txOccupation>=60?'#d97706':'#dc2626'};border-radius:999px;transition:width .4s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.82rem;color:var(--muted);margin-bottom:1rem">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
        ${_rapInfoRow('📅','Journées réalisées', Math.round(totalJours))}
        ${_rapInfoRow('🏠','Journées théoriques', capacite*joursAn)}
        ${_rapInfoRow('🎯','Taux calculé', txOccupation+'%')}
      `, '0')}
    </div>

    <!-- ── Mouvements + Profil ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem">

      ${_card(`
        ${_head('🚪 Mouvements des résidents')}
        ${_methode('Comptabilise les entrées et sorties enregistrées dans le dossier résident sur la période. La date d\'entrée est celle du contrat de séjour signé, la date de sortie celle effective du départ.')}
        ${_rapInfoRow('🏠','Au 1er janvier '+an, residents.filter(r=>(r.dateEntree||deb)<=deb&&(!r.dateSortie||r.dateSortie>=deb)).length+' résidents')}
        ${_rapInfoRow('➕','Entrées dans l\'année', admissions.length+' admissions')}
        ${_rapInfoRow('➖','Sorties dans l\'année', sorties.length+' départs')}
        ${_rapInfoRow('🏠','Au 31 décembre '+an, residents.filter(r=>(r.dateEntree||deb)<=fin&&(!r.dateSortie||r.dateSortie>=fin)).length+' résidents')}
      `, '0')}

      ${_card(`
        ${_head('👥 Profil des résidents accueillis')}
        ${_methode('Données issues des dossiers résidents présents sur l\'année. L\'âge est calculé à la date du jour à partir de la date de naissance renseignée dans le dossier.')}
        ${(() => {
          const ages = residentsActifs.filter(r=>r.dateNaissance).map(r => Math.floor((Date.now()-new Date(r.dateNaissance))/31557600000));
          const moy  = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0)/ages.length) : '—';
          const hommes = residentsActifs.filter(r=>r.sexe==='M'||r.genre==='masculin').length;
          const femmes = residentsActifs.filter(r=>r.sexe==='F'||r.genre==='feminin').length;
          return _rapInfoRow('📅','Âge moyen', ages.length ? moy+' ans' : '—')
               + _rapInfoRow('♂','Hommes', hommes)
               + _rapInfoRow('♀','Femmes', femmes)
               + _rapInfoRow('📋','Avec avenant PPE', (DB.get(DB.keys.ppe)||[]).filter(p=>p.residentId).length+' résidents')
               + _rapInfoRow('📊','Avec évaluation', new Set(evals.map(e=>e.residentId)).size+' résidents')
               + _rapInfoRow('🩺','Avec plan de soins', new Set((DB.get(DB.keys.planSoins)||[]).map(s=>s.residentId)).size+' résidents');
        })()}
      `, '0')}
    </div>

    <!-- ── Satisfaction résidents ── -->
    ${_card(`
      ${_head('⭐ Satisfaction résidents — '+an, satData.length ? `<span style="font-size:.9rem;font-weight:700;color:${satColor};background:${satColor}15;padding:3px 14px;border-radius:999px">${satScorePct}% · ${satData.length} questionnaire${satData.length!==1?'s':''}</span>` : '')}
      ${_methode('La satisfaction est mesurée via des questionnaires remplis par les résidents et/ou leurs familles. Chaque question est notée de 0 à 4 (0 = Très insatisfait, 1 = Insatisfait, 2 = Neutre, 3 = Satisfait, 4 = Très satisfait). La note est ensuite convertie en pourcentage (×25). Les résultats sont regroupés en 8 catégories thématiques couvrant l\'ensemble de la vie en établissement.')}
      ${satData.length ? `
        <!-- Score global -->
        <div style="display:flex;align-items:center;gap:1.5rem;padding:1rem 1.25rem;background:${satColor}10;border:2px solid ${satColor}30;border-radius:12px;margin-bottom:1.5rem">
          <div style="text-align:center;min-width:100px">
            <div style="font-size:3rem;font-weight:800;color:${satColor};line-height:1">${satScore!==null?satScore.toFixed(1):'—'}</div>
            <div style="font-size:.85rem;color:var(--muted);margin-top:2px">sur 4 · Score global</div>
            <div style="font-size:1.1rem;font-weight:700;color:${satColor};margin-top:4px">${satScorePct}%</div>
          </div>
          <div style="flex:1">
            <div style="height:22px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:.5rem">
              <div style="height:100%;width:${satScorePct||0}%;background:${satColor};border-radius:999px;transition:width .4s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.82rem;color:var(--muted)">
              <span>0% — Très insatisfait</span><span>50% — Neutre</span><span>100% — Très satisfait</span>
            </div>
          </div>
          <div style="text-align:center;min-width:80px">
            <div style="font-size:2rem;font-weight:800;color:var(--text)">${satData.length}</div>
            <div style="font-size:.85rem;color:var(--muted)">questionnaire${satData.length!==1?'s':''}<br>rempli${satData.length!==1?'s':''}</div>
          </div>
        </div>

        <!-- Barres par catégorie -->
        <div style="font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.85rem">Résultats par catégorie</div>
        <div style="display:flex;flex-direction:column;gap:.7rem">
          ${Object.entries(SAT_CATS_RAP).map(([cat, qids]) => {
            const catVals = qids.map(id => satAvgQ[id]).filter(v => v !== null);
            const catAvg = catVals.length ? catVals.reduce((a,b)=>a+b,0)/catVals.length : null;
            const catPct = catAvg !== null ? Math.round(catAvg/4*100) : 0;
            const col = catAvg === null ? '#94a3b8' : catAvg >= 3.5 ? '#0d9488' : catAvg >= 2.5 ? '#16a34a' : catAvg >= 1.5 ? '#d97706' : '#dc2626';
            const niv = catAvg === null ? '—' : catAvg >= 3.5 ? 'Très satisfaisant' : catAvg >= 2.5 ? 'Satisfaisant' : catAvg >= 1.5 ? 'À améliorer' : 'Insuffisant';
            return `<div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">
                <span style="font-size:.95rem;font-weight:600;color:var(--text)">${cat}</span>
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="font-size:.85rem;color:var(--muted)">${niv}</span>
                  <span style="font-size:1rem;font-weight:800;color:${col};min-width:48px;text-align:right">${catAvg!==null?catAvg.toFixed(1)+'/4':'—'}</span>
                  <span style="font-size:.9rem;font-weight:700;color:${col};min-width:42px;text-align:right">${catAvg!==null?catPct+'%':''}</span>
                </div>
              </div>
              <div style="height:22px;background:#e2e8f0;border-radius:6px;overflow:hidden">
                <div style="height:100%;width:${catPct}%;background:${col};border-radius:6px;min-width:${catPct>0?6:0}px;transition:width .4s"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:1rem;padding:.65rem 1rem;background:#f8fafc;border-radius:8px;font-size:.83rem;color:var(--muted)">
          🟢 ≥ 87% Très satisfaisant &nbsp;·&nbsp; 🟡 62–86% Satisfaisant &nbsp;·&nbsp; 🟠 37–61% À améliorer &nbsp;·&nbsp; 🔴 &lt; 37% Insuffisant
        </div>
      ` : `<div style="padding:1.5rem;text-align:center;font-size:.95rem;color:var(--muted);font-style:italic">Aucun questionnaire de satisfaction enregistré pour ${an}.</div>`}
    `)}

    <!-- Note de bas de rapport -->
    <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:1rem 1.25rem;font-size:.88rem;color:var(--muted);text-align:center">
      Rapport généré automatiquement le ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
      · Données issues du système · Capacité paramétrée : <strong>${capacite} places</strong>
    </div>`;
}

function _rapStat(icon, label, value, sub, color) {
  return `<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:1rem 1.1rem">
    <div style="font-size:1.5rem;margin-bottom:.4rem">${icon}</div>
    <div style="font-size:2rem;font-weight:800;color:${color};line-height:1">${value}</div>
    <div style="font-size:.9rem;font-weight:600;color:var(--text);margin:.35rem 0 .15rem">${label}</div>
    <div style="font-size:.82rem;color:var(--muted)">${sub}</div>
  </div>`;
}

function _rapInfoRow(icon, label, value) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.45rem 0;border-bottom:.5px solid var(--border)">
    <span style="font-size:.92rem;color:var(--text)">${icon} ${label}</span>
    <span style="font-size:.95rem;font-weight:700;color:var(--primary)">${value}</span>
  </div>`;
}

function printRapport() {
  const zone = document.getElementById('rapContent');
  if (!zone) return;
  const an = _rapportAnnee;
  const w  = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Rapport d'activité ${an}</title>
    <style>body{font-family:'Inter',sans-serif;margin:0;padding:1.5rem;font-size:13px;color:#1e293b}*{box-sizing:border-box}@media print{body{padding:.5cm}}</style>
    </head><body>
    <h1 style="font-size:1.3rem;margin-bottom:1.5rem">Rapport d'activité ${an}</h1>
    ${zone.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

document.addEventListener('DOMContentLoaded', initRapport);
