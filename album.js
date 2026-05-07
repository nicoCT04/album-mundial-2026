// =============================================
// ALBUM.JS — Lógica del álbum
// Faltantes, repetidas, validaciones, nombres
// =============================================

const Album = (() => {

  // ── Estado ──────────────────────────────────
  let _data = {};        // { stickerId: 'tengo'|'falta'|'repetida' }
  let _names = {};       // { stickerId: 'nombre corregido' }
  let _onChange = null;  // callback cuando cambia algo

  // ── Init ────────────────────────────────────
  function init(data, names, onChangeCb) {
    _data  = data  || {};
    _names = names || {};
    _onChange = onChangeCb || null;
  }

  function setData(data)  { _data  = data  || {}; }
  function setNames(names){ _names = names || {}; }

  // ── Getters ─────────────────────────────────
  function getEstado(id) {
    return _data[id] || 'falta';
  }

  function getNombre(s) {
    return _names[s.id] || s.name;
  }

  function getTengo() {
    return STICKERS.filter(s => _data[s.id] === 'tengo');
  }

  function getFaltantes() {
    return STICKERS.filter(s => !_data[s.id] || _data[s.id] === 'falta');
  }

  function getRepetidas() {
    return STICKERS.filter(s => _data[s.id] === 'repetida');
  }

  function getStats() {
    const tengo    = getTengo().length;
    const falta    = getFaltantes().length;
    const repetida = getRepetidas().length;
    const total    = STICKERS.length;
    const pct      = total ? Math.round((tengo / total) * 100) : 0;
    return { tengo, falta, repetida, total, pct };
  }

  function getByTeam(teamName) {
    return STICKERS.filter(s => s.team === teamName);
  }

  function getTeamStats(teamName) {
    const stickers = getByTeam(teamName);
    const tengo    = stickers.filter(s => _data[s.id] === 'tengo').length;
    const total    = stickers.length;
    return { tengo, total, pct: Math.round((tengo / total) * 100) };
  }

  // ── Validación al marcar ─────────────────────
  // Retorna: { valid: true } o { warn: true, msg: '...', suggestion: 'repetida' }
  function validarCambio(sticker, nuevoEstado) {
    const estadoActual = getEstado(sticker.id);

    if (nuevoEstado === 'tengo' && estadoActual === 'tengo') {
      return {
        warn: true,
        msg: `¡Ya tenés <strong>${getNombre(sticker)}</strong>!`,
        suggestion: 'repetida'
      };
    }
    return { valid: true };
  }

  // ── Aplicar cambio ───────────────────────────
  function aplicarCambio(id, nuevoEstado) {
    if (nuevoEstado === 'quitar') {
      _data[id] = 'falta';
    } else {
      _data[id] = nuevoEstado;
    }
    return { ..._data };
  }

  // ── Nombres ──────────────────────────────────
  function aplicarNombre(id, nombre) {
    if (!nombre.trim()) return null;
    _names[id] = nombre.trim();
    return { ..._names };
  }

  // ── Filtros ──────────────────────────────────
  function filtrar(stickers, query, filtroEstado) {
    const q = (query || '').toLowerCase().trim();
    return stickers.filter(s => {
      const nombre = getNombre(s).toLowerCase();
      const matchQ = !q ||
        s.id.toLowerCase().includes(q) ||
        nombre.includes(q) ||
        s.team.toLowerCase().includes(q);
      const estado = getEstado(s.id);
      const matchF = !filtroEstado || filtroEstado === 'todos' || estado === filtroEstado;
      return matchQ && matchF;
    });
  }

  // ── Render helpers ───────────────────────────
  function renderItem(s) {
    const estado    = getEstado(s.id);
    const nombre    = getNombre(s);
    const foil      = s.type === 'foil' ? ' ✨' : '';
    const editado   = _names[s.id] ? '<span class="edited-badge">✏️</span>' : '';
    const badgeMap  = {
      tengo:    ['badge-tengo',    '✅ Tengo'],
      falta:    ['badge-falta',    '❌ Falta'],
      repetida: ['badge-repetida', '🔁 Repetida'],
    };
    const [badgeClass, badgeText] = badgeMap[estado] || badgeMap.falta;

    return `
      <div class="sticker-item ${estado}">
        <div class="sticker-code">${s.id}</div>
        <div class="sticker-info">
          <div class="sticker-name">${nombre}${foil}${editado}</div>
          <div class="sticker-team">${s.team}</div>
        </div>
        <div class="sticker-badge ${badgeClass}">${badgeText}</div>
      </div>`;
  }

  function renderTeamCard(team) {
    const stats = getTeamStats(team.name);
    const pctW  = stats.pct;
    const color = pctW === 100 ? 'var(--tengo)' : pctW > 50 ? 'var(--accent)' : 'var(--muted)';
    return `
      <div class="team-card" onclick="App.openTeam('${team.name}')">
        <div class="team-info">
          <div class="team-name">${team.name}</div>
          <div class="team-progress-bar">
            <div class="team-progress-fill" style="width:${pctW}%;background:${color}"></div>
          </div>
        </div>
        <div class="team-count" style="color:${color}">${stats.tengo}/${stats.total}</div>
      </div>`;
  }

  // ── Public API ───────────────────────────────
  return {
    init, setData, setNames,
    getEstado, getNombre,
    getTengo, getFaltantes, getRepetidas, getStats, getByTeam, getTeamStats,
    validarCambio, aplicarCambio, aplicarNombre,
    filtrar, renderItem, renderTeamCard,
  };

})();