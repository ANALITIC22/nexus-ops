// ============================================================
// NEXUS OPS — helpers.js
// Funciones utilitarias de UI: badges, barras, fechas
// ============================================================

export function estadoBadge(estado) {
  const map = {
    'Al día':      'badge-green',
    'Completado':  'badge-green',
    'En progreso': 'badge-gold',
    'Pendiente':   'badge-yellow',
    'Bloqueado':   'badge-gray',
    'Crítico':     'badge-red',
    'Aprobado':    'badge-green',
    'Borrador':    'badge-gray'
  };
  return `<span class="badge ${map[estado] || 'badge-gray'}">${estado}</span>`;
}

export function prioridadBadge(p) {
  const m = { Alta: 'badge-red', Media: 'badge-yellow', Baja: 'badge-green' };
  return `<span class="badge ${m[p] || 'badge-gray'}" style="font-size:10px">${p}</span>`;
}

export function criticidadBar(c) {
  const levels = { Alta: 3, Media: 2, Baja: 1 };
  const cls    = { Alta: 'filled-alta', Media: 'filled-media', Baja: 'filled-baja' };
  let bars = '';
  for (let i = 1; i <= 3; i++) {
    bars += `<div class="crit-block ${i <= (levels[c] || 0) ? cls[c] : ''}"></div>`;
  }
  return `<div class="criticality-bar">${bars}</div>`;
}

export function progressBar(pct, color = '') {
  return `<div class="progress-bar" style="width:80px;display:inline-block;vertical-align:middle">
    <div class="progress-fill ${color}" style="width:${pct || 0}%"></div>
  </div> <span style="font-size:11px;font-family:'DM Mono',monospace">${pct || 0}%</span>`;
}

export function fmtDate(d) {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export function showToast(msg, type = 'success') {
  const icons = { success: '✓', warning: '⚠', error: '✕' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  const container = document.getElementById('toastContainer');
  if (container) {
    container.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
}

export function updateClock() {
  const now = new Date();
  const c = document.getElementById('liveClock');
  const d = document.getElementById('liveDate');
  if (c) c.textContent = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (d) d.textContent = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
