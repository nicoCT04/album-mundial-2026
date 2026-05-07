// =============================================
// APP.JS — Firebase + UI principal
// =============================================

const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
const { getFirestore, doc, getDoc, setDoc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

const App = (() => {

  // ── Firebase ─────────────────────────────────
  let db, albumRef, namesRef;

  // ── Estado UI ────────────────────────────────
  let currentView        = 'album';
  let albumFilter        = 'todos';
  let currentTeam        = null;
  let selectedSticker    = null;
  let selectedAction     = null;
  let unlocked           = false;
  let recentChanges      = [];

  // ── Init ─────────────────────────────────────
  async function init() {
    const app = initializeApp(CONFIG.firebase);
    db        = getFirestore(app);
    albumRef  = doc(db, 'album', 'estado');
    namesRef  = doc(db, 'album', 'nombres');

    try {
      const [snapAlbum, snapNames] = await Promise.all([
        getDoc(albumRef), getDoc(namesRef)
      ]);

      const data  = snapAlbum.exists()  ? snapAlbum.data()  : _initAlbum();
      const names = snapNames.exists()  ? snapNames.data()  : {};

      Album.init(data, names);
      _updateUI();
    } catch(e) {
      console.error(e);
      showToast('Error al conectar con Firebase', 'error');
    }

    // Listeners en tiempo real
    onSnapshot(albumRef, snap => {
      if (snap.exists()) { Album.setData(snap.data());  _updateUI(); }
    });
    onSnapshot(namesRef, snap => {
      if (snap.exists()) { Album.setNames(snap.data()); _updateUI(); }
    });
  }

  async function _initAlbum() {
    const data = {};
    STICKERS.forEach(s => data[s.id] = 'falta');
    await setDoc(albumRef, data);
    return data;
  }

  // ── Navegación ───────────────────────────────
  function switchView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('view-' + name)?.classList.add('active');
    document.querySelector(`[data-view="${name}"]`)?.classList.add('active');
    // Si volvemos de un equipo, limpiar
    if (name !== 'paises') currentTeam = null;
    _renderCurrentView();
  }

  function openTeam(teamName) {
    currentTeam = teamName;
    document.getElementById('team-title').textContent =
      (TEAMS.find(t => t.name === teamName)?.flag || '') + ' ' + teamName;
    document.getElementById('view-paises').style.display  = 'none';
    document.getElementById('view-equipo').style.display  = 'block';
    _renderTeamView();
  }

  function backToTeams() {
    currentTeam = null;
    document.getElementById('view-paises').style.display = 'block';
    document.getElementById('view-equipo').style.display = 'none';
  }

  // ── Render central ───────────────────────────
  function _updateUI() {
    const stats = Album.getStats();
    document.getElementById('statTengo')?.textContent    !== undefined &&
      (document.getElementById('statTengo').textContent    = stats.tengo);
    document.getElementById('statFalta')?.textContent    !== undefined &&
      (document.getElementById('statFalta').textContent    = stats.falta);
    document.getElementById('statRepetida')?.textContent !== undefined &&
      (document.getElementById('statRepetida').textContent = stats.repetida);
    document.getElementById('progressText')?.textContent !== undefined &&
      (document.getElementById('progressText').textContent = stats.pct + '%');
    document.getElementById('progressFill') &&
      (document.getElementById('progressFill').style.width = stats.pct + '%');
    document.getElementById('headerProgress') &&
      (document.getElementById('headerProgress').textContent = `${stats.tengo} / ${stats.total}`);
    document.getElementById('countFalta') &&
      (document.getElementById('countFalta').textContent = stats.falta);
    document.getElementById('countRepetida') &&
      (document.getElementById('countRepetida').textContent = stats.repetida);

    _renderCurrentView();
  }

  function _renderCurrentView() {
    switch(currentView) {
      case 'album':    _renderAlbum();    break;
      case 'faltantes':_renderFaltantes();break;
      case 'repetidas':_renderRepetidas();break;
      case 'paises':   _renderPaises();   break;
    }
    if (currentTeam) _renderTeamView();
  }

  function _renderAlbum() {
    const q        = document.getElementById('albumSearch')?.value || '';
    const filtered = Album.filtrar(STICKERS, q, albumFilter);
    const el       = document.getElementById('albumList');
    if (!el) return;
    el.innerHTML = filtered.length
      ? filtered.map(Album.renderItem).join('')
      : _empty('🔍', 'No se encontraron estampas');
  }

  function _renderFaltantes() {
    const q   = document.getElementById('faltaSearch')?.value || '';
    const list = Album.filtrar(Album.getFaltantes(), q, null);
    const el  = document.getElementById('faltaList');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map(Album.renderItem).join('')
      : _empty('🎉', '¡No te falta ninguna!');
  }

  function _renderRepetidas() {
    const q   = document.getElementById('repetidaSearch')?.value || '';
    const list = Album.filtrar(Album.getRepetidas(), q, null);
    const el  = document.getElementById('repetidaList');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map(Album.renderItem).join('')
      : _empty('📦', 'No tenés repetidas');
  }

  function _renderPaises() {
    const el = document.getElementById('paisesList');
    if (!el) return;
    el.innerHTML = TEAMS.map(Album.renderTeamCard).join('');
  }

  function _renderTeamView() {
    if (!currentTeam) return;
    const stickers = Album.getByTeam(currentTeam);
    const stats    = Album.getTeamStats(currentTeam);
    const el       = document.getElementById('equipoList');
    if (!el) return;

    document.getElementById('teamProgress') &&
      (document.getElementById('teamProgress').textContent = `${stats.tengo}/${stats.total} (${stats.pct}%)`);
    document.getElementById('teamProgressFill') &&
      (document.getElementById('teamProgressFill').style.width = stats.pct + '%');

    el.innerHTML = stickers.map(Album.renderItem).join('');
  }

  function _empty(icon, msg) {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${msg}</div></div>`;
  }

  // ── Filtros álbum ────────────────────────────
  function setAlbumFilter(f, el) {
    albumFilter = f;
    document.querySelectorAll('#albumChips .chip').forEach(c => c.classList.remove('active-chip'));
    el?.classList.add('active-chip');
    _renderAlbum();
  }

  // ── PIN ──────────────────────────────────────
  function checkPin() {
    const val  = document.getElementById('pinInput')?.value || '';
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((d, i) => d.classList.toggle('filled', i < val.length));

    if (val.length >= CONFIG.pin.length) {
      if (val === CONFIG.pin) {
        unlocked = true;
        document.getElementById('lockScreen').style.display  = 'none';
        document.getElementById('marcarPanel').style.display = 'block';
        document.getElementById('pinInput').value = '';
        dots.forEach(d => d.classList.remove('filled'));
      } else {
        document.getElementById('pinError').style.display = 'block';
        document.getElementById('pinInput').value = '';
        dots.forEach(d => d.classList.remove('filled'));
        setTimeout(() => document.getElementById('pinError').style.display = 'none', 2000);
      }
    }
  }

  function lockMarcar() {
    unlocked = false;
    document.getElementById('lockScreen').style.display  = 'block';
    document.getElementById('marcarPanel').style.display = 'none';
    _clearSelected();
  }

  // ── Marcar — búsqueda ────────────────────────
  function searchMarcar() {
    const q   = document.getElementById('marcarSearch')?.value.toLowerCase().trim() || '';
    const drop = document.getElementById('searchDrop');
    if (!drop) return;
    if (!q) { drop.classList.remove('open'); return; }

    const results = STICKERS.filter(s =>
      s.id.toLowerCase().includes(q) ||
      Album.getNombre(s).toLowerCase().includes(q) ||
      s.team.toLowerCase().includes(q)
    ).slice(0, 8);

    if (!results.length) { drop.classList.remove('open'); return; }

    drop.innerHTML = results.map(s => `
      <div class="drop-item" onclick="App.selectSticker('${s.id}')">
        <div class="drop-code">${s.id}</div>
        <div>
          <div class="drop-name">${Album.getNombre(s)}</div>
          <div class="drop-team">${s.flag || ''} ${s.team}</div>
        </div>
      </div>`).join('');
    drop.classList.add('open');
  }

  function selectSticker(id) {
    const s = STICKERS.find(x => x.id === id);
    if (!s) return;
    selectedSticker = s;
    selectedAction  = null;

    document.getElementById('searchDrop')?.classList.remove('open');
    document.getElementById('marcarSearch').value = `${s.id} — ${Album.getNombre(s)}`;
    document.getElementById('selCode').textContent = s.id;
    document.getElementById('selName').textContent = Album.getNombre(s);
    document.getElementById('selTeam').textContent = `${s.flag || ''} ${s.team}`;
    document.getElementById('editNameInput').value  = '';

    // Resaltar estado actual
    const estado = Album.getEstado(s.id);
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
    const btnMap = { tengo: '.btn-tengo', falta: '.btn-falta', repetida: '.btn-repetida' };
    document.querySelector(btnMap[estado])?.classList.add('selected');
    selectedAction = estado;

    document.getElementById('selectedCard')?.classList.add('show');
    document.getElementById('saveBtn')?.classList.add('show');
  }

  function selectAction(action) {
    selectedAction = action;
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
    const btnMap = { tengo: '.btn-tengo', falta: '.btn-falta', repetida: '.btn-repetida', quitar: '.btn-quitar' };
    document.querySelector(btnMap[action])?.classList.add('selected');
    document.getElementById('saveBtn')?.classList.add('show');
  }

  // ── Guardar estampa (con validación) ─────────
  async function saveSticker() {
    if (!selectedSticker || !selectedAction) return;

    // Validación: ya la tenés?
    const validacion = Album.validarCambio(selectedSticker, selectedAction);
    if (validacion.warn) {
      _showConfirmDialog(validacion.msg, validacion.suggestion);
      return;
    }
    await _commitSave(selectedAction);
  }

  async function _commitSave(action) {
    const s         = selectedSticker;
    const nuevoData = Album.aplicarCambio(s.id, action);
    try {
      await setDoc(albumRef, nuevoData);
      const labelMap = { tengo:'✅ Tengo', falta:'❌ Falta', repetida:'🔁 Repetida', quitar:'⬜ Quitada' };
      showToast(`${s.id} → ${labelMap[action]}`, 'success');

      recentChanges.unshift(`${s.id} ${Album.getNombre(s)} → ${labelMap[action]}`);
      if (recentChanges.length > 5) recentChanges.pop();
      const rc = document.getElementById('recentChanges');
      if (rc) rc.innerHTML = recentChanges.map(c =>
        `<div class="recent-item">${c}</div>`).join('');

      _clearSelected();
    } catch(e) {
      showToast('Error al guardar', 'error');
    }
  }

  // ── Dialog de confirmación ───────────────────
  function _showConfirmDialog(msg, suggestion) {
    const dialog = document.getElementById('confirmDialog');
    if (!dialog) return;
    document.getElementById('dialogMsg').innerHTML = msg;
    dialog.classList.add('show');

    document.getElementById('dialogRepetida').onclick = async () => {
      dialog.classList.remove('show');
      await _commitSave('repetida');
    };
    document.getElementById('dialogDescartar').onclick = () => {
      dialog.classList.remove('show');
      _clearSelected();
    };
  }

  // ── Guardar nombre ────────────────────────────
  async function saveName() {
    if (!selectedSticker) return;
    const nuevoNombre = document.getElementById('editNameInput')?.value.trim();
    if (!nuevoNombre) return;

    const nuevoNames = Album.aplicarNombre(selectedSticker.id, nuevoNombre);
    if (!nuevoNames) return;
    try {
      await setDoc(namesRef, nuevoNames);
      document.getElementById('selName').textContent = nuevoNombre;
      showToast('✏️ Nombre actualizado', 'success');
    } catch(e) {
      showToast('Error al guardar nombre', 'error');
    }
  }

  // ── Helpers ──────────────────────────────────
  function _clearSelected() {
    selectedSticker = null;
    selectedAction  = null;
    document.getElementById('marcarSearch') &&
      (document.getElementById('marcarSearch').value = '');
    document.getElementById('selectedCard')?.classList.remove('show');
    document.getElementById('saveBtn')?.classList.remove('show');
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
  }

  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ── Public ───────────────────────────────────
  return {
    init, switchView, openTeam, backToTeams,
    setAlbumFilter, checkPin, lockMarcar,
    searchMarcar, selectSticker, selectAction,
    saveSticker, saveName, showToast,
    filterAlbum:    () => { const el = document.getElementById('albumList');    if(el) _renderAlbum(); },
    filterFalta:    () => { const el = document.getElementById('faltaList');    if(el) _renderFaltantes(); },
    filterRepetida: () => { const el = document.getElementById('repetidaList');if(el) _renderRepetidas(); },
  };

})();

// Iniciar
App.init();

// Cerrar dropdown al tocar fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.marcar-search-wrap')) {
    document.getElementById('searchDrop')?.classList.remove('open');
  }
});

window.App = App;