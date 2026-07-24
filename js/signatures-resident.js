// ── SIGNATURES ÉLECTRONIQUES — carte fiche + flux de signature ──
// Réutilise le composant global SignaturePad (js/signature-pad.js) + sigHashHex.
// Données via js/signatures-supabase.js.

let _sigPending = null;   // { documentType, documentLabel, signataireNom, signataireRole }

function _sigDateFr(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { return iso; }
}

function signaturesCard(r) {
  const list = (typeof signaturesByResident === 'function') ? signaturesByResident(currentResidentId) : [];
  const canEdit = (typeof canEditResident === 'function') ? canEditResident() : false;
  const addBtn = (canEdit && typeof SignaturePad !== 'undefined')
    ? `<button class="btn btn-ghost btn-sm no-print" style="margin-left:auto;color:var(--accent)" onclick="openSignerDoc()">✍️ Signer un document</button>`
    : '';

  let body;
  if (!list.length) {
    body = `<div style="padding:.85rem;font-size:.8rem;color:var(--g400)">Aucun document signé.${canEdit ? ' Cliquez sur « Signer un document » pour recueillir une signature.' : ''}</div>`;
  } else {
    const sorted = [...list].sort((a, b) => (b.signeLe || '').localeCompare(a.signeLe || ''));
    body = sorted.map((s, i) => `<div style="display:flex;align-items:center;gap:.85rem;padding:.7rem .85rem;${i ? 'border-top:1px solid var(--border)' : ''}">
        <img src="${escHtml(s.image)}" alt="signature" style="width:74px;height:40px;object-fit:contain;background:#fff;border:1px solid var(--border);border-radius:6px;flex-shrink:0;cursor:pointer" onclick="viewSignature('${s.id}')"/>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.84rem">${escHtml(s.documentLabel || sigDocLabel(s.documentType))}</div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:1px">Signé par <b>${escHtml(s.signataireNom)}</b> (${escHtml(sigRoleLabel(s.signataireRole))}) · le ${_sigDateFr(s.signeLe)}</div>
          ${s.empreinte ? `<div style="font-size:.67rem;color:var(--g400);margin-top:1px" title="Empreinte SHA-256">🔒 ${escHtml(s.empreinte.slice(0, 16))}…</div>` : ''}
        </div>
        <div class="no-print" style="display:flex;gap:.2rem;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" title="Voir" onclick="viewSignature('${s.id}')">👁</button>
          ${canEdit ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteSignature('${s.id}')">✕</button>` : ''}
        </div>
      </div>`).join('');
    body = `<div style="border:1px solid var(--border);border-radius:var(--r-sm)">${body}</div>`;
  }

  return `<div class="card" style="overflow:hidden"><div class="card-header" style="background:color-mix(in srgb, #0d9488 12%, #fff)">
      <span class="card-title" style="color:#0d9488">✍️ Documents & signatures</span>${addBtn}
    </div><div class="card-body">${body}</div></div>`;
}

// ── Recueil d'une signature ──────────────────────────────────────────────
function openSignerDoc() {
  const r = (typeof getResident === 'function') ? getResident() : null;
  const nomResident = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : '';
  const docOpts = Object.keys(SIG_DOCS).map(k => `<option value="${k}">${escHtml(SIG_DOCS[k])}</option>`).join('');
  const roleOpts = Object.keys(SIG_ROLES).map(k => `<option value="${k}"${k === 'resident' ? ' selected' : ''}>${escHtml(SIG_ROLES[k])}</option>`).join('');
  document.getElementById('signerDocModalBody').innerHTML = `
    <div class="form-group"><label>Document</label><select id="sigDocType" class="form-input">${docOpts}</select></div>
    <div class="grid grid-2" style="gap:.75rem">
      <div class="form-group"><label>Nom du signataire</label><input type="text" id="sigNom" class="form-input" value="${escHtml(nomResident)}"/></div>
      <div class="form-group"><label>Qualité</label><select id="sigRole" class="form-input">${roleOpts}</select></div>
    </div>
    <div style="font-size:.74rem;color:var(--muted);margin-top:.3rem">Le nom se pré-remplit avec le résident ; modifiez-le pour un représentant légal ou un mandataire. Le pavé de signature s'ouvrira ensuite.</div>`;
  openModal('signerDocModal');
}

function sigLaunchPad() {
  const type = (document.getElementById('sigDocType') || {}).value || 'autre';
  const nom = ((document.getElementById('sigNom') || {}).value || '').trim();
  const role = (document.getElementById('sigRole') || {}).value || 'resident';
  if (!nom) { toast('Indiquez le nom du signataire', 'error'); return; }
  _sigPending = { documentType: type, documentLabel: sigDocLabel(type), signataireNom: nom, signataireRole: role };
  if (typeof SignaturePad === 'undefined' || !SignaturePad.open) { toast('Pavé de signature indisponible', 'error'); return; }
  SignaturePad.open({ titre: sigDocLabel(type), nom: nom, onSave: sigOnPadSave });
}

async function sigOnPadSave(imageDataURL, nom) {
  if (!_sigPending) return;
  const p = _sigPending;
  let empreinte = '';
  try {
    if (typeof sigHashHex === 'function') {
      empreinte = await sigHashHex([currentResidentId, p.documentType, p.signataireNom, p.signataireRole, imageDataURL].join('|'));
    }
  } catch (e) { /* scellement facultatif */ }
  try {
    await sbSaveSignature({
      residentId:     currentResidentId,
      documentType:   p.documentType,
      documentLabel:  p.documentLabel,
      signataireNom:  nom || p.signataireNom,
      signataireRole: p.signataireRole,
      image:          imageDataURL,
      empreinte:      empreinte,
      signeLe:        new Date().toISOString()
    });
    await loadSignaturesCache();
    _sigPending = null;
    closeModal('signerDocModal');
    toast('Document signé', 'success');
    if (typeof auditLog === 'function') auditLog('modif_dossier', 'Signature — ' + p.documentLabel, currentResidentId);
    const rr = (typeof getResident === 'function') ? getResident() : null;
    if (rr && typeof renderViewMode === 'function') renderViewMode(rr);
  } catch (e) { console.error(e); toast('Erreur : ' + ((e && e.message) || e), 'error'); }
}

function viewSignature(id) {
  const list = (typeof signaturesByResident === 'function') ? signaturesByResident(currentResidentId) : [];
  const s = list.find(x => String(x.id) === String(id));
  if (!s) return;
  document.getElementById('sigViewTitle').textContent = s.documentLabel || sigDocLabel(s.documentType);
  document.getElementById('sigViewBody').innerHTML = `
    <div style="text-align:center"><img src="${escHtml(s.image)}" alt="signature" style="max-width:100%;background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px"/></div>
    <div style="margin-top:.85rem;font-size:.85rem;line-height:1.7">
      <div><b>Signataire :</b> ${escHtml(s.signataireNom)} (${escHtml(sigRoleLabel(s.signataireRole))})</div>
      <div><b>Signé le :</b> ${_sigDateFr(s.signeLe)}</div>
      ${s.auteur ? `<div><b>Recueilli par :</b> ${escHtml(s.auteur)}</div>` : ''}
      ${s.empreinte ? `<div style="font-size:.72rem;color:var(--muted);margin-top:.3rem;word-break:break-all"><b>🔒 Empreinte SHA-256 :</b> ${escHtml(s.empreinte)}</div>` : ''}
    </div>
    <div style="margin-top:.85rem;text-align:center"><a class="btn btn-ghost btn-sm" href="${escHtml(s.image)}" download="signature-${escHtml((s.documentType || 'doc'))}.png">⬇ Télécharger l'image</a></div>`;
  openModal('sigViewModal');
}

async function deleteSignature(id) {
  if (!confirm('Supprimer cette signature ? (le registre est en ajout seul : cette action est tracée)')) return;
  try {
    await sbDeleteSignature(id);
    await loadSignaturesCache();
    toast('Signature supprimée', 'success');
    if (typeof auditLog === 'function') auditLog('modif_dossier', 'Suppression signature', currentResidentId);
    const rr = (typeof getResident === 'function') ? getResident() : null;
    if (rr && typeof renderViewMode === 'function') renderViewMode(rr);
  } catch (e) { console.error(e); toast('Erreur : ' + ((e && e.message) || e), 'error'); }
}
