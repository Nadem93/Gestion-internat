// ── ASSISTANT IA — client SSE + panneau de relecture ──
// Étape 1 : synthèse de période d'un résident.
// PRINCIPE AFFICHÉ PARTOUT : l'IA propose, l'humain relit, modifie et valide.
// Rien n'est enregistré tant que l'utilisateur ne clique pas « Insérer ».
// La clé API vit dans les secrets Supabase, côté serveur — jamais ici.

// ── Client SSE (réutilisable pour les 3 actions de la spec) ──
// supabaseClient.functions.invoke() ne convient pas au streaming (il attend le
// corps complet) → fetch direct sur l'URL de la function, avec le JWT de session.
async function iaDemander({ action, residentId, periode, params = {}, onMeta, onDelta, onDone, onError }) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { onError({ code: 'non_authentifie', message: 'Session expirée — reconnectez-vous' }); return null; }

  const ctrl = new AbortController();
  let resp;
  try {
    resp = await fetch(`${SUPABASE_URL}/functions/v1/ia-assistant`, {
      method: 'POST', signal: ctrl.signal,
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, residentId, periode, params }),
    });
  } catch (e) {
    if (e && e.name !== 'AbortError') onError({ code: 'reseau', message: String(e && e.message || e) });
    return null;
  }

  if (!resp.ok || !(resp.headers.get('content-type') || '').includes('text/event-stream')) {
    const err = await resp.json().catch(() => ({}));          // erreurs pré-flux (401/403/404/429/400)
    onError({ code: err.code || 'http_' + resp.status, message: err.error || 'Erreur serveur' });
    return null;
  }

  // Lecture du flux SSE : découpage sur les doubles sauts de ligne, "event:" + "data:"
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev  = (frame.match(/^event: (.+)$/m) || [])[1];
          const raw = (frame.match(/^data: (.+)$/m) || [])[1];
          if (!ev || !raw) continue;
          let data;
          try { data = JSON.parse(raw); } catch { continue; }
          if (ev === 'meta'  && onMeta)  onMeta(data);
          if (ev === 'delta' && onDelta) onDelta(data.text);
          if (ev === 'done'  && onDone)  onDone(data);
          if (ev === 'error' && onError) onError(data);
        }
      }
    } catch (e) {
      if (e && e.name !== 'AbortError') onError({ code: 'reseau', message: 'Flux interrompu' });
    }
  })();
  return { abort: () => ctrl.abort() };
}

// ── Badge « assisté par IA » (contenus marqués _ia dans les jsonb) ──
function iaBadge(obj) {
  const ia = obj && obj._ia;
  if (!ia || ia.origine !== 'ia') return '';
  const relu = ia.relu_par ? ` — relu par ${escHtml(ia.relu_par)}` : '';
  const quand = ia.valide_le || ia.genere_le;
  return `<span title="Contenu proposé par l'assistant IA puis validé par un professionnel" style="display:inline-flex;align-items:center;gap:.2rem;font-size:.6rem;font-weight:700;padding:.1rem .4rem;border-radius:999px;background:#faf5ff;border:0.5px solid #e9d5ff;color:#7e22ce">✨ assisté par IA${relu}${quand ? ' le ' + formatDate(quand) : ''}</span>`;
}

// ── Panneau « Synthèse de période » ──
let _iaAbort = null, _iaEnCours = false, _iaResident = null, _iaInsere = false;

function _iaEl(id) { return document.getElementById(id); }
function _iaDateMoins(jours) {
  const d = new Date(); d.setDate(d.getDate() - jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function iaBuildPanel() {
  if (_iaEl('iaOverlay')) return;
  const ov = document.createElement('div');
  ov.id = 'iaOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,43,74,.45);z-index:9500;display:none;overflow:auto;padding:1rem';
  ov.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="iaTitre" style="background:#fff;border-radius:16px;max-width:760px;width:100%;margin:auto;box-shadow:0 20px 60px rgba(15,43,74,.35);display:flex;flex-direction:column;max-height:calc(100vh - 2rem)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.15rem .6rem">
        <strong id="iaTitre" style="font-size:.98rem;color:#0f2b4a">✨ Synthèse de période — <span id="iaNomResident"></span></strong>
        <button type="button" onclick="iaFermer()" aria-label="Fermer" style="border:none;background:none;font-size:1.4rem;cursor:pointer;color:#64748b;line-height:1">&times;</button>
      </div>
      <div style="margin:0 1.15rem;padding:.5rem .7rem;background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;font-size:.72rem;color:#7e22ce;font-weight:600">
        ✨ Proposition générée par IA — à relire, modifier et valider. Rien n'est enregistré tant que vous ne validez pas.
      </div>
      <div style="display:flex;align-items:end;gap:.5rem;flex-wrap:wrap;padding:.75rem 1.15rem .25rem;font-size:.78rem">
        <div><label style="font-size:.66rem;color:#64748b;display:block">Du</label><input type="date" id="iaDu" style="font-size:.78rem;padding:.3rem .4rem;border:1px solid var(--border);border-radius:8px"/></div>
        <div><label style="font-size:.66rem;color:#64748b;display:block">Au</label><input type="date" id="iaAu" style="font-size:.78rem;padding:.3rem .4rem;border:1px solid var(--border);border-radius:8px"/></div>
        <div style="display:flex;gap:.25rem">
          <button type="button" class="btn btn-ghost btn-sm" onclick="iaRaccourci(7)">7 j</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="iaRaccourci(30)">30 j</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="iaRaccourci(90)">90 j</button>
        </div>
        <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;color:#64748b;margin-left:auto;cursor:pointer">
          <input type="checkbox" id="iaAnonymiser"/> Anonymiser (initiales)
        </label>
        <button type="button" class="btn btn-accent btn-sm" id="iaGenerer" onclick="iaLancer()">✨ Générer</button>
      </div>
      <div id="iaMeta" style="padding:.15rem 1.15rem;font-size:.7rem;color:#64748b;min-height:1.1rem"></div>
      <div style="padding:.35rem 1.15rem;flex:1;display:flex;min-height:220px">
        <textarea id="iaTexte" placeholder="La proposition apparaîtra ici — vous pourrez la modifier librement avant de l'insérer." style="flex:1;width:100%;min-height:220px;resize:vertical;font-size:.8rem;line-height:1.55;border:1px solid var(--border);border-radius:10px;padding:.7rem;font-family:inherit"></textarea>
      </div>
      <div id="iaStatut" style="padding:0 1.15rem;font-size:.72rem;min-height:1.1rem"></div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;padding: .7rem 1.15rem 1rem">
        <button type="button" class="btn btn-ghost btn-sm" id="iaArreter" onclick="iaArreter()" style="display:none;color:#dc2626">■ Arrêter</button>
        <button type="button" class="btn btn-ghost btn-sm" id="iaCopier" onclick="iaCopier()" disabled>⧉ Copier</button>
        <button type="button" class="btn btn-primary btn-sm" id="iaInserer" onclick="iaInsererJournal()" disabled>📓 Insérer au journal</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="iaFermer()">Fermer</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov && !_iaEnCours) iaFermer(); });
  ov.addEventListener('keydown', e => { if (e.key === 'Escape') iaFermer(); });
}

async function iaOuvrirSynthese(residentId, nom) {
  if (!residentId) { toast('Résident inconnu', 'error'); return; }
  iaBuildPanel();
  _iaResident = { id: residentId, nom: nom || '' };
  _iaInsere = false;
  if (!_iaResident.nom) {
    try {
      const { data } = await supabaseClient.from('residents').select('prenom, nom').eq('id', residentId).single();
      if (data) _iaResident.nom = `${data.prenom || ''} ${data.nom || ''}`.trim();
    } catch (e) { /* le nom est cosmétique */ }
  }
  _iaEl('iaNomResident').textContent = _iaResident.nom || '';
  _iaEl('iaDu').value = _iaDateMoins(30);
  _iaEl('iaAu').value = today();
  _iaEl('iaTexte').value = '';
  _iaEl('iaMeta').textContent = '';
  _iaEl('iaStatut').textContent = '';
  _iaEl('iaCopier').disabled = true;
  _iaEl('iaInserer').disabled = true;
  _iaEl('iaOverlay').style.display = 'flex';
}

function iaRaccourci(jours) {
  _iaEl('iaDu').value = _iaDateMoins(jours);
  _iaEl('iaAu').value = today();
}

async function iaLancer() {
  if (_iaEnCours) return;
  const du = _iaEl('iaDu').value, au = _iaEl('iaAu').value;
  if (!du || !au || du > au) { toast('Choisissez une période valide', 'error'); return; }
  _iaEnCours = true;
  _iaInsere = false;
  _iaEl('iaTexte').value = '';
  _iaEl('iaMeta').textContent = 'Analyse en cours…';
  _iaEl('iaStatut').textContent = '';
  _iaEl('iaStatut').style.color = '';
  _iaEl('iaGenerer').disabled = true;
  _iaEl('iaCopier').disabled = true;
  _iaEl('iaInserer').disabled = true;
  _iaEl('iaArreter').style.display = '';

  const finir = () => {
    _iaEnCours = false;
    _iaAbort = null;
    _iaEl('iaGenerer').disabled = false;
    _iaEl('iaArreter').style.display = 'none';
  };

  const handle = await iaDemander({
    action: 'synthese_resident',
    residentId: _iaResident.id,
    periode: { du, au },
    params: { anonymiser: !!_iaEl('iaAnonymiser').checked },
    onMeta: m => {
      const v = m.volumes || {};
      _iaEl('iaMeta').textContent = `Analyse de ${v.transmissions || 0} transmissions · ${v.journal || 0} notes de journal · ${v.coches || 0} pointages de tâches · ${v.incidents || 0} incidents · ${v.nuits || 0} événements de nuit — modèle ${m.modele || ''}`;
    },
    onDelta: txt => {
      const ta = _iaEl('iaTexte');
      ta.value += txt;
      ta.scrollTop = ta.scrollHeight;
    },
    onDone: d => {
      finir();
      _iaEl('iaCopier').disabled = false;
      _iaEl('iaInserer').disabled = false;
      if (d.stop_reason === 'max_tokens') {
        _iaEl('iaStatut').textContent = '⚠️ Proposition tronquée — réduisez la période analysée.';
        _iaEl('iaStatut').style.color = '#b45309';
      } else {
        _iaEl('iaStatut').textContent = `✓ Proposition prête — relisez et modifiez librement avant d'insérer. (${Math.round((d.duree_ms || 0) / 1000)} s)`;
        _iaEl('iaStatut').style.color = '#15803d';
      }
    },
    onError: err => {
      finir();
      const messages = {
        rate_limited: 'Limite atteinte (15 demandes IA par heure) — réessayez plus tard.',
        contexte_vide: 'Aucune donnée sur la période choisie — élargissez les dates.',
        refusal: 'Le modèle a refusé cette demande.',
        non_authentifie: 'Session expirée — reconnectez-vous.',
        forbidden: 'Accès réservé à l’équipe éducative.',
      };
      _iaEl('iaStatut').textContent = '✕ ' + (messages[err.code] || err.message || 'Erreur inattendue');
      _iaEl('iaStatut').style.color = '#dc2626';
      if (_iaEl('iaTexte').value) { _iaEl('iaCopier').disabled = false; }
    },
  });
  if (handle) _iaAbort = handle.abort;
  else finir();
}

function iaArreter() {
  if (_iaAbort) _iaAbort();
  _iaEnCours = false;
  _iaAbort = null;
  _iaEl('iaGenerer').disabled = false;
  _iaEl('iaArreter').style.display = 'none';
  _iaEl('iaStatut').textContent = '■ Génération arrêtée — le texte reçu reste modifiable.';
  _iaEl('iaStatut').style.color = '#64748b';
  if (_iaEl('iaTexte').value) { _iaEl('iaCopier').disabled = false; _iaEl('iaInserer').disabled = false; }
}

function iaFermer() {
  if (_iaAbort) _iaAbort();
  _iaEnCours = false;
  _iaAbort = null;
  const ov = _iaEl('iaOverlay');
  if (ov) ov.style.display = 'none';
}

async function iaCopier() {
  const txt = _iaEl('iaTexte').value;
  if (!txt) return;
  try {
    await navigator.clipboard.writeText(txt);
    toast('Synthèse copiée ✓');
  } catch (e) {
    _iaEl('iaTexte').select();
    document.execCommand && document.execCommand('copy');
    toast('Synthèse copiée ✓');
  }
}

// ═══════════════════════════════════════════
//  ÉTAPE 2 — Pré-remplissage du bilan semestriel
//  Remplit le formulaire pcBilan* existant (ppe.js) à partir d'une proposition
//  JSON de l'IA. Rien n'est enregistré : le professionnel relit, modifie, puis
//  clique « Enregistrer le bilan » (qui pose alors le marquage _ia).
// ═══════════════════════════════════════════

const IA_ETATS = {
  atteint: 'Atteint', en_bonne_voie: 'En bonne voie', en_cours: 'En cours',
  en_difficulte: 'En difficulté', non_engage: 'Non engagé',
};

// Propositions en attente de validation, par avenant (consommées à l'enregistrement)
const _iaBilanPending = {};

function _iaBilanStatus(txt, couleur) {
  const el = _iaEl('pcBilanIaStatus');
  if (el) { el.textContent = txt || ''; el.style.color = couleur || '#7e22ce'; }
}

// Compose le texte de synthèse : synthèse globale + détail par objectif
function iaFormatBilanSynthese(data) {
  let out = String(data.synthese || '').trim();
  const pts = Array.isArray(data.points_par_objectif) ? data.points_par_objectif : [];
  if (pts.length) {
    out += (out ? '\n\n' : '') + 'Par objectif :\n' + pts.map(pt => {
      const etat = IA_ETATS[pt.etat] || pt.etat || '';
      return `• [${pt.domaine || ''}] ${pt.objectif || ''}${etat ? ' — ' + etat : ''}${pt.commentaire ? ' : ' + pt.commentaire : ''}`;
    }).join('\n');
  }
  return out;
}

async function iaPreremplirBilan(ppeId) {
  if (typeof getPpe !== 'function') { toast('Indisponible ici', 'error'); return; }
  const p = getPpe().find(x => x.id === ppeId);
  if (!p) { toast('Avenant introuvable', 'error'); return; }
  const synthEl = _iaEl('pcBilanSynthese'), ajustEl = _iaEl('pcBilanAjust');
  if ((synthEl && synthEl.value.trim()) || (ajustEl && ajustEl.value.trim())) {
    if (!confirm('Remplacer le contenu actuel du bilan par une proposition de l’IA ? (vous pourrez encore la modifier avant d’enregistrer)')) return;
  }
  const btn = _iaEl('pcBilanIa');
  if (btn) btn.disabled = true;
  _iaBilanStatus('Analyse du cycle en cours…');
  let buffer = '';
  let modeleUtilise = '';

  const handle = await iaDemander({
    action: 'bilan_semestriel',
    residentId: p.residentId,
    params: { ppeId },
    onMeta: m => {
      modeleUtilise = m.modele || '';
      const v = m.volumes || {};
      const per = m.periode ? ` · période ${formatDate(m.periode.du)} → ${formatDate(m.periode.au)}` : '';
      _iaBilanStatus(`Analyse de ${v.objectifs || 0} objectifs · ${v.transmissions || 0} transmissions · ${v.evaluations || 0} évaluations${per}`);
    },
    onDelta: t => { buffer += t; },
    onError: err => {
      if (btn) btn.disabled = false;
      const messages = {
        rate_limited: 'Limite atteinte (15 demandes IA / heure).',
        contexte_vide: 'Pas assez de données sur le cycle pour un bilan.',
        interne: 'Avenant PPA introuvable ou erreur de collecte.',
        refusal: 'Le modèle a refusé cette demande.',
      };
      _iaBilanStatus('✕ ' + (messages[err.code] || err.message || 'Erreur'), '#dc2626');
    },
    onDone: () => {
      if (btn) btn.disabled = false;
      let data;
      try { data = JSON.parse(buffer); } catch (e) { data = null; }
      if (!data || typeof data !== 'object') {
        _iaBilanStatus('✕ Réponse illisible — réessayez.', '#dc2626');
        return;
      }
      const synthese = iaFormatBilanSynthese(data);
      const ajustements = String(data.ajustements || '').trim();
      if (synthEl) synthEl.value = synthese;
      if (ajustEl) ajustEl.value = ajustements;
      const s = Auth.getSession() || {};
      _iaBilanPending[ppeId] = {
        modele: modeleUtilise,
        genere_le: new Date().toISOString(),
        demande_par: `${s.prenom || ''} ${s.nom || ''}`.trim() || s.username || '',
        synthese, ajustements,
      };
      _iaBilanStatus('✓ Proposition insérée dans les champs — relisez, modifiez, puis enregistrez le bilan.', '#15803d');
    },
  });
  if (!handle && btn) btn.disabled = false;
}

// Appelé par pcSaveBilan (ppe.js) : renvoie le marquage _ia à poser sur le
// bilan si une proposition IA a servi de base, sinon null. Détecte si le
// relecteur a modifié le texte proposé. Consomme la proposition en attente.
function iaMarquageBilan(ppeId) {
  const pend = _iaBilanPending[ppeId];
  if (!pend) return null;
  delete _iaBilanPending[ppeId];
  const synthEl = _iaEl('pcBilanSynthese'), ajustEl = _iaEl('pcBilanAjust');
  const modifie = (synthEl ? synthEl.value.trim() : '') !== (pend.synthese || '').trim()
    || (ajustEl ? ajustEl.value.trim() : '') !== (pend.ajustements || '').trim();
  const s = Auth.getSession() || {};
  return {
    origine: 'ia',
    modele: pend.modele,
    genere_le: pend.genere_le,
    demande_par: pend.demande_par,
    relu_par: `${s.prenom || ''} ${s.nom || ''}`.trim() || s.username || '',
    valide_le: new Date().toISOString(),
    modifie,
  };
}

// Insertion au journal : c'est LE moment de validation humaine — le texte
// éventuellement modifié part via la couche sb* existante, avec un préfixe
// visible et le nom du relecteur.
async function iaInsererJournal() {
  const txt = (_iaEl('iaTexte').value || '').trim();
  if (!txt) { toast('Rien à insérer', 'error'); return; }
  if (_iaInsere) { toast('Déjà insérée au journal'); return; }
  if (typeof sbSaveJournalEntry !== 'function') { toast('Journal indisponible sur cette page', 'error'); return; }
  const s = Auth.getSession() || {};
  const relecteur = `${s.prenom || ''} ${s.nom || ''}`.trim() || s.username || '';
  const btn = _iaEl('iaInserer');
  btn.disabled = true;
  try {
    await sbSaveJournalEntry({
      residentId: _iaResident.id,
      resident: _iaResident.nom,
      categorie: 'synthese',
      date: today(),
      contenu: `[Synthèse assistée par IA — relue par ${relecteur}]\n\n${txt}`,
      author: relecteur,
      authorId: s.userId || null,
      visibilite: 'equipe',
    });
    _iaInsere = true;
    toast('Synthèse insérée au journal ✓');
    _iaEl('iaStatut').textContent = '✓ Insérée au journal de bord (catégorie « synthese »).';
    _iaEl('iaStatut').style.color = '#15803d';
  } catch (e) {
    console.error('[ia]', e);
    btn.disabled = false;
    toast('Erreur lors de l’insertion au journal', 'error');
  }
}
