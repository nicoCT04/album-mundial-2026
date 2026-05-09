// =============================================
// ALBUM.JS — Lógica del álbum
// Faltantes, repetidas, validaciones, nombres
// =============================================

const Album = (() => {

  // ── Estado ──────────────────────────────────
  // Ahora _data soporta:
  // { stickerId: 'tengo'|'falta' }   para estado único
  // { stickerId: { estado: 'repetida', cantidad: 2 } }  para múltiples repetidas
  let _data = {};        
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
    const val = _data[id];
    if (!val) return 'falta';
    if (typeof val === 'object' && val.estado) return val.estado;
    return val;
  }

  function getCantidadRepetidas(id) {
    const val = _data[id];
    if (typeof val === 'object' && val.cantidad) return val.cantidad;
    return 0;
  }

  function getNombre(s) {
    return _names[s.id] || s.name;
  }

  function getTengo() {
    return STICKERS.filter(s => getEstado(s.id) === 'tengo');
  }

  function getFaltantes() {
    return STICKERS.filter(s => {
      const estado = getEstado(s.id);
      return !estado || estado === 'falta';
    });
  }

  function getRepetidas() {
    return STICKERS.filter(s => getEstado(s.id) === 'repetida');
  }

  function getStats() {
    const tengo    = getTengo().length;
    const falta    = getFaltantes().length;
    const repetida = getRepetidas().length;
    const totalRep = Object.values(_data).reduce((sum, v) => {
      if (typeof v === 'object' && v.cantidad) return sum + v.cantidad;
      return sum;
    }, 0);
    const total    = STICKERS.length;
    const pct      = total ? Math.round((tengo / total) * 100) : 0;
    return { tengo, falta, repetida, totalRep, total, pct };
  }

  function getByTeam(teamName) {
    return STICKERS.filter(s => s.team === teamName);
  }

  function getTeamStats(teamName) {
    const stickers = getByTeam(teamName);
    const tengo    = stickers.filter(s => getEstado(s.id) === 'tengo').length;
    const total    = stickers.length;
    return { tengo, total, pct: Math.round((tengo / total) * 100) };
  }

  // ── Validación al marcar ─────────────────────
  function validarCambio(sticker, nuevoEstado) {
    const estadoActual = getEstado(sticker.id);

    // Ya la tenés (tengo → tengo)
    if (nuevoEstado === 'tengo' && estadoActual === 'tengo') {
      return {
        warn: true,
        msg: `¡Ya tenés <strong>${getNombre(sticker)}</strong>! ¿Querés marcarla como repetida?`,
        suggestion: 'repetida'
      };
    }

    // Ya está como repetida y la marcás como tengo — probablemente es otra repetida
    if (nuevoEstado === 'tengo' && estadoActual === 'repetida') {
      const cant = getCantidadRepetidas(sticker.id);
      return {
        warn: true,
        msg: `<strong>${getNombre(sticker)}</strong> ya está como repetida${cant > 1 ? ` (×${cant})` : ''}. ¿Querés sumar una repetida más?`,
        suggestion: 'repetida'
      };
    }

    return { valid: true };
  }

  // ── Aplicar cambio ───────────────────────────
  function aplicarCambio(id, nuevoEstado) {
    if (nuevoEstado === 'quitar') {
      _data[id] = 'falta';
    } else if (nuevoEstado === 'repetida') {
      // Si ya es repetida, sumar cantidad; si no, crear objeto
      const actual = _data[id];
      if (typeof actual === 'object' && actual.estado === 'repetida') {
        _data[id] = { estado: 'repetida', cantidad: (actual.cantidad || 1) + 1 };
      } else {
        _data[id] = { estado: 'repetida', cantidad: 1 };
      }
    } else {
      _data[id] = nuevoEstado;
    }
    return { ..._data };
  }

  // ── Reducir cantidad de repetidas ────────────
  function restarRepetida(id) {
    const actual = _data[id];
    if (typeof actual === 'object' && actual.cantidad > 1) {
      _data[id] = { estado: 'repetida', cantidad: actual.cantidad - 1 };
    } else {
      _data[id] = 'falta';
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
    const cantidad  = getCantidadRepetidas(s.id);
    const nombre    = getNombre(s);
    const foil      = s.type === 'foil' ? ' ✨' : '';
    const editado   = _names[s.id] ? '<span class="edited-badge">✏️</span>' : '';
    const badgeMap  = {
      tengo:    ['badge-tengo',    '✅ Tengo'],
      falta:    ['badge-falta',    '❌ Falta'],
      repetida: ['badge-repetida', `🔁 ${cantidad > 0 ? cantidad : 1}`],
    };
    const [badgeClass, badgeText] = badgeMap[estado] || badgeMap.falta;

    // Si está en repetidas, agregar botones de control
    const repetidaControls = estado === 'repetida' ? `
      <div class="repetida-controls">
        <button class="btn-add-rep" onclick="App.addRepetida('${s.id}')">➕</button>
        <button class="btn-remove-rep" onclick="App.removeRepetida('${s.id}')">➖</button>
      </div>
    ` : '';

    return `
      <div class="sticker-item ${estado}">
        <div class="sticker-code">${s.id}</div>
        <div class="sticker-info">
          <div class="sticker-name">${nombre}${foil}${editado}</div>
          <div class="sticker-team">${s.team}</div>
        </div>
        <div class="sticker-badge ${badgeClass}">${badgeText}</div>
        ${repetidaControls}
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
    getEstado, getCantidadRepetidas, getNombre,
    getTengo, getFaltantes, getRepetidas, getStats, getByTeam, getTeamStats,
    validarCambio, aplicarCambio, restarRepetida, aplicarNombre,
    filtrar, renderItem, renderTeamCard,
  };

})();