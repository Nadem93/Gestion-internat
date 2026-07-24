// ── PROTOCOLES D'URGENCE — carte fiche + formulaire + vue rapide mobile ──
// Données via js/protocoles-urgence-supabase.js.
// Helpers globaux de page : currentResidentId, getResident, canEditResident,
// escHtml, openModal/closeModal, toast, auditLog.

function _puGravBadge(g) {
  const gr = PU_GRAVITE[g] || PU_GRAVITE.important;
  return `<span class="badge" style="background:color-mix(in srgb, ${gr.c} 16%, transparent);color:${gr.c};border:1px solid color-mix(in srgb, ${gr.c} 32%, transparent)">${gr.l}</span>`;
}

function protocolesUrgenceCard(r) {
  const list = (typeof protocolesByResident === 'function') ? protocolesByResident(currentResidentId) : [];
  const canEdit = (typeof canEditResident === 'function') ? canEditResident() : false;
  const addBtn = canEdit
    ? `<button class="btn btn-ghost btn-sm no-print" style="margin-left:auto;color:var(--accent)" onclick="openProtocoleModal()">+ Ajouter</button>`
    : '';

  let body;
  if (!list.length) {
    body = `<div style="padding:.85rem;font-size:.8rem;color:var(--g400)">Aucun protocole d'urgence enregistré.${canEdit ? ' Cliquez sur « Ajouter » pour en créer un.' : ''}</div>`;
  } else {
    const ordre = { critique: 0, important: 1, info: 2 };
    const sorted = [...list].sort((a, b) => (a.actif ? 0 : 1) - (b.actif ? 0 : 1)
      || (ordre[a.gravite] ?? 1) - (ordre[b.gravite] ?? 1));
    body = sorted.map((p, i) => {
      const col = (typeof puColor === 'function') ? puColor(p.type) : '#ef4444';
      const seg = (label, val) => val ? `<div style="margin-top:5px"><span style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)">${label}</span><div style="font-size:.8rem;line-height:1.5;white-space:pre-wrap">${escHtml(val)}</div></div>` : '';
      return `<div style="display:flex;gap:.75rem;padding:.8rem .85rem;${i ? 'border-top:1px solid var(--border)' : ''};${p.actif ? '' : 'opacity:.55'}">
        <span style="width:4px;border-radius:3px;background:${col};flex-shrink:0"></span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap">
            <span style="font-size:1rem">${(typeof puIcon === 'function') ? puIcon(p.type) : '🚨'}</span>
            <span style="font-weight:700;font-size:.86rem">${escHtml(p.titre || puLabel(p.type))}</span>
            ${_puGravBadge(p.gravite)}
            ${p.actif ? '' : '<span class="badge badge-gray">Inactif</span>'}
          </div>
          ${seg('Signes d\'alerte', p.signes)}
          ${seg('Conduite à tenir', p.conduite)}
          ${seg('Traitement d\'urgence', p.traitement)}
          ${seg('Qui appeler', p.contacts)}
          ${seg('Notes', p.notes)}
        </div>
        ${canEdit ? `<div class="no-print" style="display:flex;flex-direction:column;gap:.2rem;flex-shrink:0"><button class="btn btn-ghost btn-sm" onclick="openProtocoleModal('${p.id}')">✎</button><button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteProtocole('${p.id}')">✕</button></div>` : ''}
      </div>`;
    }).join('');
    body = `<div style="border:1px solid var(--border);border-radius:var(--r-sm)">${body}</div>`;
  }

  const quickBtn = list.some(p => p.actif)
    ? `<button class="btn btn-sm no-print" style="margin-left:.5rem;background:#ef4444;color:#fff" onclick="showProtocolesUrgence('${currentResidentId}', '${escHtml((getResident() ? (getResident().prenom + ' ' + getResident().nom) : '')).replace(/'/g, '')}')">🚨 Vue rapide</button>`
    : '';

  return `<div class="card" style="overflow:hidden"><div class="card-header" style="background:color-mix(in srgb, #ef4444 12%, #fff)">
      <span class="card-title" style="color:#ef4444">🚨 Protocoles d'urgence</span>${quickBtn}${addBtn}
    </div><div class="card-body">${body}</div></div>`;
}

// ── Formulaire ───────────────────────────────────────────────────────────
function _puField(id, label, value, type) {
  return `<div class="form-group"><label>${label}</label><input type="${type || 'text'}" id="${id}" value="${escHtml(value || '')}" class="form-input"/></div>`;
}
function _puArea(id, label, value, rows, ph) {
  return `<div class="form-group"><label>${label}</label><textarea id="${id}" class="form-input" rows="${rows || 3}" style="resize:vertical"${ph ? ` placeholder="${escHtml(ph)}"` : ''}>${escHtml(value || '')}</textarea></div>`;
}

function puFormHtml(p) {
  p = p || {};
  const typeOpts = Object.keys(PU_TYPES).map(k => `<option value="${k}"${p.type === k ? ' selected' : ''}>${PU_TYPES[k].ic} ${PU_TYPES[k].l}</option>`).join('');
  const gravOpts = Object.keys(PU_GRAVITE).map(k => `<option value="${k}"${(p.gravite || 'important') === k ? ' selected' : ''}>${PU_GRAVITE[k].l}</option>`).join('');
  return `<input type="hidden" id="puId" value="${escHtml(p.id || '')}"/>
    <div class="grid grid-2" style="gap:.75rem">
      <div class="form-group"><label>Type de situation</label><select id="puType" class="form-input">${typeOpts}</select></div>
      <div class="form-group"><label>Gravité</label><select id="puGravite" class="form-input">${gravOpts}</select></div>
    </div>
    ${_puField('puTitre', 'Titre du protocole', p.titre)}
    ${_puArea('puSignes', "Signes d'alerte à reconnaître", p.signes, 2, 'Ex : perte de contact, mouvements convulsifs…')}
    ${_puArea('puConduite', 'Conduite à tenir (étapes)', p.conduite, 4, "1. Protéger la personne… 2. …")}
    ${_puArea('puTraitement', "Traitement / médicament d'urgence prescrit", p.traitement, 2, 'Ex : Buccolam 10 mg en intrabuccal si crise > 5 min')}
    ${_puField('puContacts', 'Qui appeler (médecin, SAMU 15, référent…)', p.contacts)}
    ${_puArea('puNotes', 'Notes complémentaires', p.notes, 2)}
    <label style="display:flex;align-items:center;gap:.5rem;font-size:.85rem;margin-top:.5rem;cursor:pointer">
      <input type="checkbox" id="puActif" ${p.actif === false ? '' : 'checked'}/> Protocole actif</label>`;
}

function openProtocoleModal(id) {
  const list = (typeof protocolesByResident === 'function') ? protocolesByResident(currentResidentId) : [];
  const p = id ? list.find(x => String(x.id) === String(id)) : null;
  document.getElementById('protocoleModalTitle').textContent = p ? "Modifier le protocole d'urgence" : "Nouveau protocole d'urgence";
  document.getElementById('protocoleModalBody').innerHTML = puFormHtml(p);
  openModal('protocoleModal');
}

async function saveProtocole() {
  const v = id => (document.getElementById(id) || {}).value || '';
  const p = {
    id:         v('puId') || undefined,
    residentId: currentResidentId,
    type:       v('puType') || 'autre',
    gravite:    v('puGravite') || 'important',
    titre:      v('puTitre'),
    signes:     v('puSignes'),
    conduite:   v('puConduite'),
    traitement: v('puTraitement'),
    contacts:   v('puContacts'),
    notes:      v('puNotes'),
    actif:      !!(document.getElementById('puActif') || {}).checked
  };
  try {
    await sbSaveProtocoleUrgence(p);
    await loadProtocolesUrgenceCache();
    closeModal('protocoleModal');
    toast("Protocole d'urgence enregistré", 'success');
    if (typeof auditLog === 'function') auditLog('modif_dossier', "Protocole d'urgence " + (p.id ? 'modifié' : 'ajouté'), currentResidentId);
    const rr = (typeof getResident === 'function') ? getResident() : null;
    if (rr && typeof renderViewMode === 'function') renderViewMode(rr);
  } catch (e) { console.error(e); toast('Erreur : ' + ((e && e.message) || e), 'error'); }
}

async function deleteProtocole(id) {
  if (!confirm("Supprimer ce protocole d'urgence ?")) return;
  try {
    await sbDeleteProtocoleUrgence(id);
    await loadProtocolesUrgenceCache();
    toast('Protocole supprimé', 'success');
    const rr = (typeof getResident === 'function') ? getResident() : null;
    if (rr && typeof renderViewMode === 'function') renderViewMode(rr);
  } catch (e) { console.error(e); toast('Erreur : ' + ((e && e.message) || e), 'error'); }
}

// ── VUE RAPIDE (lecture seule, plein écran) — accès 1 clic mobile ─────────
// Utilisable depuis n'importe quelle page où le cache est chargé
// (fiche résident, tournée, plan de soins).
function showProtocolesUrgence(rid, nom) {
  const list = (typeof protocolesActifsByResident === 'function') ? protocolesActifsByResident(rid) : [];
  const esc = (typeof escHtml === 'function') ? escHtml : (s => String(s == null ? '' : s));
  const seg = (label, val) => val ? `<div style="margin-top:9px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8">${label}</div><div style="font-size:14.5px;line-height:1.55;color:#0f172a;white-space:pre-wrap">${esc(val)}</div></div>` : '';

  const cards = list.length ? list.map(p => {
    const col = (typeof puColor === 'function') ? puColor(p.type) : '#ef4444';
    const ic  = (typeof puIcon === 'function') ? puIcon(p.type) : '🚨';
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-left:5px solid ${col};border-radius:14px;padding:15px 16px;margin-bottom:12px;box-shadow:0 4px 14px rgba(15,23,42,.06)">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:20px">${ic}</span>
        <span style="font-size:16px;font-weight:800;color:#0f172a">${esc(p.titre || puLabel(p.type))}</span>
      </div>
      ${seg("Signes d'alerte", p.signes)}
      ${p.conduite ? `<div style="margin-top:11px;background:color-mix(in srgb, ${col} 8%, #fff);border:1px solid color-mix(in srgb, ${col} 22%, transparent);border-radius:11px;padding:11px 13px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${col}">Conduite à tenir</div><div style="font-size:15px;line-height:1.6;color:#0f172a;white-space:pre-wrap;font-weight:500">${esc(p.conduite)}</div></div>` : ''}
      ${seg("Traitement d'urgence", p.traitement)}
      ${seg('Qui appeler', p.contacts)}
    </div>`;
  }).join('') : `<div style="text-align:center;color:#64748b;padding:50px 20px;font-size:15px">Aucun protocole d'urgence actif pour ce résident.</div>`;

  const ov = document.createElement('div');
  ov.id = 'puQuickOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(8,15,30,.55);display:flex;align-items:flex-end;justify-content:center;padding:0';
  ov.innerHTML = `<div style="background:#f1f5f9;width:100%;max-width:560px;max-height:92vh;border-radius:22px 22px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -20px 60px rgba(0,0,0,.4)">
      <div style="background:#ef4444;color:#fff;padding:16px 18px;display:flex;align-items:center;gap:10px;flex-shrink:0">
        <span style="font-size:20px">🚨</span>
        <div style="line-height:1.2;min-width:0;flex:1"><div style="font-size:16px;font-weight:800">Protocoles d'urgence</div><div style="font-size:12.5px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nom || '')}</div></div>
        <button onclick="document.getElementById('puQuickOverlay').remove()" style="width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.2);color:#fff;font-size:18px;cursor:pointer;flex-shrink:0">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px))">${cards}</div>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}
