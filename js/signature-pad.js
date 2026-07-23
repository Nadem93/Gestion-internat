// ── PAD DE SIGNATURE — signature électronique simple ──
// Composant réutilisable : SignaturePad.open({ titre, nom, onSave })
// - tracé au doigt, stylet ou souris (pointer events) ; un seul pointeur actif
//   à la fois (rejet de paume), le stylet prend la main sur le doigt
// - onSave(imageDataURL, nom) appelé à la validation
// Utilitaires de scellement (empreinte de contrôle) :
// - sigStableStringify(obj) : JSON canonique à clés triées — indispensable car
//   Postgres jsonb réordonne les clés, un JSON.stringify naïf donnerait une
//   empreinte différente avant/après aller-retour en base
// - sigHashHex(str) : SHA-256 hexadécimal via crypto.subtle (contexte sécurisé
//   requis : https ou localhost), null si indisponible

function sigStableStringify(v) {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(x => sigStableStringify(x === undefined ? null : x)).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort()
    .map(k => JSON.stringify(k) + ':' + sigStableStringify(v[k])).join(',') + '}';
}

async function sigHashHex(str) {
  try {
    if (!crypto || !crypto.subtle) return null;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

// Une image de signature stockée en base doit être un PNG en data URL de
// taille plausible — on ne réinjecte jamais dans un src une valeur forgée
// (un tracé réel pèse quelques dizaines de Ko ; une chaîne de plusieurs Mo
// inlinée dans le DOM gèlerait la page de tous les lecteurs).
function sigImageValide(img) {
  return typeof img === 'string' && img.length <= 300000
    && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(img);
}

// ── Contresignature SERVEUR (edge function signature-sceau) ──
// Best-effort : si la function n'est pas déployée / réseau KO, on renvoie null
// et l'appelant retombe sur l'empreinte locale. Ne bloque jamais la signature.
async function _sigSceauFetch(action, ppeId, role, nom) {
  if (typeof supabaseClient === 'undefined' || typeof SUPABASE_URL === 'undefined') return null;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return null;
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/signature-sceau`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ppeId: String(ppeId), role, nom: nom || '' }),
    });
    if (!resp.ok) return null;
    const d = await resp.json().catch(() => null);
    return (d && d.ok) ? d : null;
  } catch (e) { return null; }
}
function sigScellerServeur(ppeId, role, nom) { return _sigSceauFetch('sceller', ppeId, role, nom); }
function sigVerifierServeur(ppeId, role)     { return _sigSceauFetch('verifier', ppeId, role, ''); }

const SignaturePad = (() => {
  let _overlay = null, _dialog = null, _canvas = null, _ctx = null, _onSave = null;
  let _drawing = false, _hasDrawn = false, _last = null;
  let _pointerId = null, _pointerType = null;
  let _openedAt = 0, _downOnBackdrop = false;

  function build() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'sigPadOverlay';
    // overflow:auto + margin:auto sur le dialogue : si le dialogue dépasse le
    // viewport (téléphone en paysage, clavier virtuel), tout reste atteignable.
    _overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,43,74,.45);z-index:10000;display:none;overflow:auto;padding:1rem';
    _overlay.innerHTML = `
      <div id="sigPadDialog" role="dialog" aria-modal="true" aria-labelledby="sigPadTitle" style="background:#fff;border-radius:16px;max-width:560px;width:100%;margin:auto;padding:1.1rem;box-shadow:0 20px 60px rgba(15,43,74,.35)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">
          <strong id="sigPadTitle" style="font-size:.95rem;color:#0f2b4a"></strong>
          <button type="button" id="sigPadClose" aria-label="Fermer" style="border:none;background:none;font-size:1.4rem;cursor:pointer;color:#64748b;line-height:1">&times;</button>
        </div>
        <div class="form-group" style="margin-bottom:.6rem">
          <label style="font-size:.72rem;color:#64748b">Nom et prénom du signataire</label>
          <input type="text" id="sigPadNom" maxlength="80" placeholder="Nom Prénom" style="width:100%"/>
        </div>
        <canvas id="sigPadCanvas" style="width:100%;height:180px;border:2px dashed #cbd5e1;border-radius:12px;background:#fff;touch-action:none;cursor:crosshair;display:block"></canvas>
        <div style="font-size:.68rem;color:#94a3b8;margin-top:.35rem">Signez dans le cadre (doigt, stylet ou souris) — le tracé sera horodaté et rattaché au compte connecté.</div>
        <div style="display:flex;gap:.5rem;margin-top:.8rem;justify-content:flex-end">
          <button type="button" class="btn btn-ghost btn-sm" id="sigPadClear">Effacer</button>
          <button type="button" class="btn btn-ghost btn-sm" id="sigPadCancel">Annuler</button>
          <button type="button" class="btn btn-primary btn-sm" id="sigPadOk">✓ Valider la signature</button>
        </div>
      </div>`;
    document.body.appendChild(_overlay);
    _dialog = _overlay.querySelector('#sigPadDialog');
    _canvas = _overlay.querySelector('#sigPadCanvas');
    _ctx = _canvas.getContext('2d');
    // Fermeture au clic sur le fond : uniquement si l'appui a COMMENCÉ sur le
    // fond et que le pad est ouvert depuis un moment — le second clic d'un
    // double-clic sur « ✍ Signer » ne doit pas refermer le pad aussitôt.
    _overlay.addEventListener('pointerdown', e => { _downOnBackdrop = (e.target === _overlay); });
    _overlay.addEventListener('click', e => {
      if (e.target === _overlay && _downOnBackdrop && (performance.now() - _openedAt) > 400) close();
    });
    _overlay.addEventListener('keydown', trapTab);
    _overlay.querySelector('#sigPadClose').addEventListener('click', close);
    _overlay.querySelector('#sigPadCancel').addEventListener('click', close);
    _overlay.querySelector('#sigPadClear').addEventListener('click', clear);
    _overlay.querySelector('#sigPadOk').addEventListener('click', validate);
    _canvas.addEventListener('pointerdown', down);
    _canvas.addEventListener('pointermove', move);
    _canvas.addEventListener('pointerup', up);
    _canvas.addEventListener('pointercancel', up);
    window.addEventListener('resize', onResize);
  }

  // Échap doit fonctionner même si le focus est retombé sur la page
  function onDocKeydown(e) { if (e.key === 'Escape') close(); }

  // Piège à focus minimal : Tab reste dans le dialogue (aria-modal)
  function trapTab(e) {
    if (e.key !== 'Tab') return;
    const focusables = _dialog.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const premier = focusables[0], dernier = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
  }

  function sizeCanvas() {
    // Dimensionné à l'ouverture (le modal doit être affiché pour mesurer),
    // en x2 pour un tracé net sur écrans haute densité.
    const w = Math.max(280, _canvas.clientWidth || 500);
    _canvas.width = w * 2;
    _canvas.height = 360;
    _ctx.lineWidth = 4;
    _ctx.lineCap = 'round';
    _ctx.lineJoin = 'round';
    _ctx.strokeStyle = '#0f2b4a';
    clear();
  }

  // Rotation ou redimensionnement pad ouvert : sans resynchronisation, le PNG
  // exporté serait déformé (échelle X figée à l'ouverture, Y fixe). On
  // redimensionne le canvas en re-projetant le tracé déjà fait.
  function onResize() {
    if (!_overlay || _overlay.style.display === 'none') return;
    const memo = _hasDrawn ? (() => { const t = document.createElement('canvas'); t.width = _canvas.width; t.height = _canvas.height; t.getContext('2d').drawImage(_canvas, 0, 0); return t; })() : null;
    sizeCanvas();
    if (memo) { _ctx.drawImage(memo, 0, 0, _canvas.width, _canvas.height); _hasDrawn = true; }
  }

  function clear() {
    _ctx.fillStyle = '#ffffff';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    _hasDrawn = false;
  }

  function pos(e) {
    const r = _canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (_canvas.width / r.width), y: (e.clientY - r.top) * (_canvas.height / r.height) };
  }

  // Un seul pointeur trace à la fois : la paume posée sur le cadre pendant
  // qu'on signe est ignorée, et le stylet prend la main sur un doigt/paume
  // déjà en contact (sans relier les deux positions par un trait parasite).
  function down(e) {
    e.preventDefault();
    if (_drawing && e.pointerId !== _pointerId) {
      if (e.pointerType === 'pen' && _pointerType !== 'pen') {
        _pointerId = e.pointerId; _pointerType = e.pointerType; _last = pos(e);
      }
      return;
    }
    if (_canvas.setPointerCapture) { try { _canvas.setPointerCapture(e.pointerId); } catch (err) {} }
    _drawing = true;
    _pointerId = e.pointerId;
    _pointerType = e.pointerType;
    _last = pos(e);
    // Un point seul (initiales tapotées) compte aussi comme tracé
    _ctx.beginPath();
    _ctx.arc(_last.x, _last.y, 2, 0, Math.PI * 2);
    _ctx.fillStyle = '#0f2b4a';
    _ctx.fill();
    _hasDrawn = true;
  }
  function move(e) {
    if (!_drawing || e.pointerId !== _pointerId) return;
    e.preventDefault();
    const p = pos(e);
    _ctx.beginPath();
    _ctx.moveTo(_last.x, _last.y);
    _ctx.lineTo(p.x, p.y);
    _ctx.stroke();
    _last = p;
  }
  function up(e) {
    if (e && e.pointerId !== _pointerId) return; // la paume qui se soulève n'interrompt pas le trait
    _drawing = false;
    _pointerId = null;
    _pointerType = null;
  }

  function validate() {
    const nom = (_overlay.querySelector('#sigPadNom').value || '').trim();
    if (!nom) { toast('Indiquez le nom du signataire', 'error'); return; }
    if (!_hasDrawn) { toast('Le cadre de signature est vide', 'error'); return; }
    const image = _canvas.toDataURL('image/png');
    const cb = _onSave;
    close();
    if (cb) cb(image, nom);
  }

  function close() {
    _drawing = false;
    _pointerId = null;
    _onSave = null;
    document.removeEventListener('keydown', onDocKeydown);
    if (_overlay) _overlay.style.display = 'none';
  }

  function open(opts) {
    build();
    _onSave = (opts && opts.onSave) || null;
    _overlay.querySelector('#sigPadTitle').textContent = (opts && opts.titre) || 'Signature';
    _overlay.querySelector('#sigPadNom').value = (opts && opts.nom) || '';
    _overlay.style.display = 'flex';
    _openedAt = performance.now();
    _downOnBackdrop = false;
    document.addEventListener('keydown', onDocKeydown);
    sizeCanvas();
    const inp = _overlay.querySelector('#sigPadNom');
    setTimeout(() => { if (inp.focus) inp.focus(); }, 50);
  }

  return { open, close };
})();
