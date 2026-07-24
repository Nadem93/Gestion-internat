// ── MESURES DE PROTECTION JURIDIQUE — carte + formulaire (fiche résident) ──
// Données via js/mesures-protection-supabase.js (mesuresByResident, sbSave…).
// Réutilise les helpers globaux de la page : currentResidentId, getResident,
// canEditResident, escHtml, formatDate, today, openModal/closeModal, toast.

function _mpUrg(dateStr) {
  if (!dateStr) return null;
  const j = Math.round((new Date(dateStr + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
  if (j < 0)  return { c: '#ef4444', t: 'En retard' };
  if (j <= 30) return { c: '#ef4444', t: 'dans ' + j + ' j' };
  if (j <= 90) return { c: '#f59e0b', t: 'dans ' + j + ' j' };
  return { c: 'var(--muted)', t: formatDate(dateStr) };
}

function mesuresProtectionCard(r) {
  const list = (typeof mesuresByResident === 'function') ? mesuresByResident(currentResidentId) : [];
  const canEdit = (typeof canEditResident === 'function') ? canEditResident() : false;
  const addBtn = canEdit
    ? `<button class="btn btn-ghost btn-sm no-print" style="margin-left:auto;color:var(--accent)" onclick="openMesureProtModal()">+ Ajouter</button>`
    : '';

  let body;
  if (!list.length) {
    body = `<div style="padding:.85rem;font-size:.8rem;color:var(--g400)">Aucune mesure de protection enregistrée.${canEdit ? ' Cliquez sur « Ajouter » pour en créer une.' : ''}</div>`;
  } else {
    const sorted = [...list].sort((a, b) => (a.statut === 'terminee' ? 1 : 0) - (b.statut === 'terminee' ? 1 : 0)
      || (a.dateRenouvellement || '9999').localeCompare(b.dateRenouvellement || '9999'));
    body = sorted.map((m, i) => {
      const col = (typeof mpColor === 'function') ? mpColor(m.type) : '#a855f7';
      const lab = (typeof mpLabel === 'function') ? mpLabel(m.type) : m.type;
      const termine = m.statut === 'terminee';
      const mand = [m.mandataireNom, m.mandataireOrganisme].filter(Boolean).map(escHtml).join(' · ');
      const tel = [m.mandataireTel, m.mandataireEmail].filter(Boolean).map(escHtml).join(' · ');
      const ren = _mpUrg(m.dateRenouvellement);
      const aud = m.dateAudience ? _mpUrg(m.dateAudience) : null;
      const line = (label, val) => val ? `<span style="color:var(--muted)">${label} :</span> ${val}` : '';
      const infos = [
        m.tribunal ? line('Tribunal', escHtml(m.tribunal)) : '',
        m.dateJugement ? line('Jugement', formatDate(m.dateJugement)) : '',
        ren ? line('Renouvellement', `<b style="color:${ren.c}">${ren.t}</b>`) : '',
        aud ? line('Audience', `<b style="color:${aud.c}">${aud.t}</b>`) : ''
      ].filter(Boolean).join(' &nbsp;·&nbsp; ');
      return `<div style="display:flex;align-items:flex-start;gap:.75rem;padding:.7rem .85rem;${i ? 'border-top:1px solid var(--border)' : ''};${termine ? 'opacity:.6' : ''}">
        <span style="width:9px;height:9px;border-radius:50%;background:${col};margin-top:.35rem;flex-shrink:0"></span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.85rem;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
            ${escHtml(lab)} ${termine ? '<span class="badge badge-gray">Terminée</span>' : '<span class="badge badge-green">Active</span>'}
          </div>
          ${mand ? `<div style="font-size:.76rem;color:var(--g700);margin-top:2px">${mand}${tel ? ' — ' + tel : ''}</div>` : ''}
          ${infos ? `<div style="font-size:.74rem;margin-top:3px;line-height:1.7">${infos}</div>` : ''}
          ${m.notes ? `<div style="font-size:.74rem;color:var(--muted);margin-top:3px;white-space:pre-wrap">${escHtml(m.notes)}</div>` : ''}
        </div>
        ${canEdit ? `<div class="no-print" style="display:flex;gap:.2rem;flex-shrink:0"><button class="btn btn-ghost btn-sm" onclick="openMesureProtModal('${m.id}')">✎</button><button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteMesureProt('${m.id}')">✕</button></div>` : ''}
      </div>`;
    }).join('');
    body = `<div style="border:1px solid var(--border);border-radius:var(--r-sm)">${body}</div>`;
  }

  return `<div class="card" style="overflow:hidden"><div class="card-header" style="background:color-mix(in srgb, #a855f7 12%, #fff)">
      <span class="card-title" style="color:#a855f7">⚖️ Protection juridique</span>${addBtn}
    </div><div class="card-body">${body}</div></div>`;
}

// ── Formulaire ───────────────────────────────────────────────────────────
function _mpField(id, label, value, type) {
  return `<div class="form-group"><label>${label}</label><input type="${type || 'text'}" id="${id}" value="${escHtml(value || '')}" class="form-input"/></div>`;
}
function _mpSelectType(value) {
  const opts = Object.keys(MP_TYPES).map(k => `<option value="${k}"${value === k ? ' selected' : ''}>${MP_TYPES[k].l}</option>`).join('');
  return `<div class="form-group"><label>Type de mesure</label><select id="mpType" class="form-input">${opts}</select></div>`;
}
function _mpSelectStatut(value) {
  return `<div class="form-group"><label>Statut</label><select id="mpStatut" class="form-input">
    <option value="active"${value !== 'terminee' ? ' selected' : ''}>Active</option>
    <option value="terminee"${value === 'terminee' ? ' selected' : ''}>Terminée</option></select></div>`;
}

function mpFormHtml(m) {
  m = m || {};
  return `<input type="hidden" id="mpId" value="${escHtml(m.id || '')}"/>
    <div class="grid grid-2" style="gap:.75rem">
      ${_mpSelectType(m.type)}
      ${_mpSelectStatut(m.statut)}
      ${_mpField('mpMandNom', 'Mandataire (nom)', m.mandataireNom)}
      ${_mpField('mpMandOrg', 'Organisme (UDAF, assoc…)', m.mandataireOrganisme)}
      ${_mpField('mpMandTel', 'Téléphone mandataire', m.mandataireTel, 'tel')}
      ${_mpField('mpMandMail', 'Email mandataire', m.mandataireEmail, 'email')}
      ${_mpField('mpTribunal', 'Tribunal compétent', m.tribunal)}
      ${_mpField('mpJugement', 'Date du jugement', m.dateJugement, 'date')}
      ${_mpField('mpDebut', "Date d'effet", m.dateDebut, 'date')}
      ${_mpField('mpRenouv', 'Date de renouvellement', m.dateRenouvellement, 'date')}
      ${_mpField('mpAudience', 'Prochaine audience', m.dateAudience, 'date')}
    </div>
    <div class="form-group" style="margin-top:.6rem"><label>Notes</label><textarea id="mpNotes" class="form-input" rows="3" style="resize:vertical">${escHtml(m.notes || '')}</textarea></div>
    <div style="font-size:.72rem;color:var(--muted);margin-top:.4rem">💡 La date de renouvellement crée automatiquement une alerte dans l'échéancier.</div>`;
}

function openMesureProtModal(id) {
  const list = (typeof mesuresByResident === 'function') ? mesuresByResident(currentResidentId) : [];
  const m = id ? list.find(x => String(x.id) === String(id)) : null;
  document.getElementById('mesureProtModalTitle').textContent = m ? 'Modifier la mesure de protection' : 'Nouvelle mesure de protection';
  document.getElementById('mesureProtModalBody').innerHTML = mpFormHtml(m);
  openModal('mesureProtModal');
}

async function saveMesureProt() {
  const v = id => (document.getElementById(id) || {}).value || '';
  const r = (typeof getResident === 'function') ? getResident() : null;
  const nomComplet = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : '';
  const m = {
    id:                  v('mpId') || undefined,
    residentId:          currentResidentId,
    residentName:        nomComplet,
    type:                v('mpType') || 'tutelle',
    statut:              v('mpStatut') || 'active',
    mandataireNom:       v('mpMandNom'),
    mandataireOrganisme: v('mpMandOrg'),
    mandataireTel:       v('mpMandTel'),
    mandataireEmail:     v('mpMandMail'),
    tribunal:            v('mpTribunal'),
    dateJugement:        v('mpJugement') || null,
    dateDebut:           v('mpDebut') || null,
    dateRenouvellement:  v('mpRenouv') || null,
    dateAudience:        v('mpAudience') || null,
    notes:               v('mpNotes')
  };
  try {
    await sbSaveMesureProtection(m);
    await loadMesuresProtectionCache();
    closeModal('mesureProtModal');
    toast('Mesure de protection enregistrée', 'success');
    if (typeof auditLog === 'function') auditLog('modif_dossier', 'Mesure de protection ' + (m.id ? 'modifiée' : 'ajoutée'), currentResidentId);
    const rr = (typeof getResident === 'function') ? getResident() : null;
    if (rr && typeof renderViewMode === 'function') renderViewMode(rr);
  } catch (e) {
    console.error(e);
    toast('Erreur : ' + ((e && e.message) || e), 'error');
  }
}

async function deleteMesureProt(id) {
  if (!confirm('Supprimer cette mesure de protection ?')) return;
  try {
    await sbDeleteMesureProtection(id);
    await loadMesuresProtectionCache();
    toast('Mesure supprimée', 'success');
    const rr = (typeof getResident === 'function') ? getResident() : null;
    if (rr && typeof renderViewMode === 'function') renderViewMode(rr);
  } catch (e) {
    console.error(e);
    toast('Erreur : ' + ((e && e.message) || e), 'error');
  }
}
