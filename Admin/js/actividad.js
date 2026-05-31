// ============================================================
// NEXUS OPS — actividad.js
// Historial y Feed de Actividad
// ============================================================

import { AppState } from './state.js';

export function renderHistorialTab() {
  const container = document.getElementById('historial-timeline');
  if (!container) return;

  const list = AppState.gestionGlobal.filter(g => String(g.matrizId) === String(AppState.currentMatrizId));
  if (!list.length) {
    container.innerHTML = '<p style="font-size:12px;color:var(--text-m);padding:12px">Sin registros.</p>';
    return;
  }

  container.innerHTML = `<div style="padding-left:10px;border-left:2px solid var(--gold)">
    ${list.map(g => `
      <div style="margin-bottom:12px">
        <div style="font-family:'DM Mono';font-size:10.5px;color:var(--text-l);margin-bottom:3px">${g.fecha}</div>
        <div style="font-size:12.5px;color:var(--text-b);white-space:pre-wrap">${g.texto || ''}</div>
      </div>`).join('')}
  </div>`;
}

export function renderActividad() {
  const container = document.getElementById('actividad-timeline');
  if (!container) return;

  const all = [...AppState.gestionGlobal].slice(0, 20);
  if (!all.length) {
    container.innerHTML = `<div style="font-size:12.5px;color:var(--text-b);text-align:center;padding:20px">Sin actividad.</div>`;
    return;
  }

  container.innerHTML = all.map(g => `
    <div style="padding:10px;border-bottom:1px solid var(--gold-20);display:flex;gap:12px">
      <div style="font-size:16px">📝</div>
      <div>
        <div style="font-size:12.5px;color:var(--deep)">${(g.texto || '').substring(0, 80)}${(g.texto || '').length > 80 ? '...' : ''}</div>
        <div style="font-size:10.5px;color:var(--text-l);font-family:'DM Mono';margin-top:2px">${g.fecha}</div>
      </div>
    </div>`).join('');
}
