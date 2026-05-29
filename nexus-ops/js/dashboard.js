// ============================================================
// NEXUS OPS — dashboard.js
// Lógica y gráficas del Dashboard
// ============================================================

import { AppState } from './state.js';
import { estadoBadge } from './helpers.js';
import { openMatriz } from './matrices.js';

export function updateDashboard() {
  const listContainer = document.getElementById('dashMatricesList');
  if (!listContainer) return;

  if (!AppState.matrices.length) {
    listContainer.innerHTML = `<p style="font-size:13px;color:var(--text-m)">No hay matrices aún.</p>`;
  } else {
    listContainer.innerHTML = AppState.matrices.slice(0, 3).map(m => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;
        background:var(--gold-10);border-radius:var(--radius-s);cursor:pointer;margin-bottom:6px"
        onclick="openMatriz('${m.id}')">
        <div style="display:flex;align-items:center;gap:8px">
          <span>${m.icono || '◈'}</span>
          <span style="font-size:13px;font-weight:500;color:var(--deep)">${m.nombre}</span>
        </div>
        ${estadoBadge(m.estado)}
      </div>`).join('');
  }
  renderDashboardCharts();
}

function renderDashboardCharts() {
  // ── Gráfica de matrices (línea) ──────────────────────────
  const ctxMat = document.getElementById('chartMatrices');
  if (ctxMat) {
    if (ctxMat._chartInstance) ctxMat._chartInstance.destroy();
    const labels       = AppState.matrices.map(m => m.nombre);
    const dataProgress = AppState.matrices.map(m => {
      const objM = AppState.objetivos.filter(o => String(o.matrizId) === String(m.id));
      return objM.length
        ? Math.round(objM.reduce((s, o) => s + (o.avance || 0), 0) / objM.length)
        : 0;
    });
    ctxMat._chartInstance = new Chart(ctxMat, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Progreso %',
          data: dataProgress,
          borderColor: '#D3AB80',
          backgroundColor: 'rgba(211,171,128,0.1)',
          borderWidth: 2, tension: 0.3, fill: true
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { color: '#96786F', font: { family: 'DM Mono', size: 10 } } },
          x: { ticks: { color: '#96786F', font: { family: 'DM Mono', size: 10 } } }
        }
      }
    });
  }

  // ── Gráfica de tareas (donut) ────────────────────────────
  const ctxTar = document.getElementById('chartTareas');
  if (ctxTar) {
    if (ctxTar._chartInstance) ctxTar._chartInstance.destroy();
    const comp = AppState.tareas.filter(t => t.estado === 'Completado' || t.estado === 'Al día').length;
    const prog = AppState.tareas.filter(t => t.estado === 'En progreso').length;
    const crit = AppState.tareas.filter(t => t.estado === 'Crítico').length;
    ctxTar._chartInstance = new Chart(ctxTar, {
      type: 'doughnut',
      data: {
        labels: ['Completadas', 'En Progreso', 'Críticas'],
        datasets: [{
          data: [comp, prog, crit],
          backgroundColor: ['#5F7466', '#D3AB80', '#BC6C25'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
}
