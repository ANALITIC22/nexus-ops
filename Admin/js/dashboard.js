// ============================================================
// NEXUS OPS — dashboard.js  (v3 — stats exactas por usuario)
// ============================================================

import { AppState } from './state.js';
import { estadoBadge } from './helpers.js';
import { openMatriz } from './matrices.js';

// ── Helper: matrices visibles para el usuario actual ─────────
function _misMatrices() {
  const s = AppState.adminSession;
  if (!s) return AppState.matrices;
  if (s.isSuperAdmin) return AppState.matrices;
  return AppState.matrices.filter(m => m.creadoPor === s.uid);
}

export function updateDashboard() {
  const listContainer = document.getElementById('dashMatricesList');
  if (!listContainer) return;

  const misMatrices = _misMatrices();
  const misIds      = new Set(misMatrices.map(m => String(m.id)));

  // Filtrar tareas y objetivos del usuario
  const misTareas   = AppState.tareas.filter(t =>
    misIds.has(String(t.matrizId)) && (!t.esPeticion || t.peticionEstado === 'aceptada'));
  const misObjetivos = AppState.objetivos.filter(o => misIds.has(String(o.matrizId)));
  const misPeticiones = AppState.tareas.filter(t =>
    misIds.has(String(t.matrizId)) && t.esPeticion === true &&
    (t.peticionEstado || 'pendiente') === 'pendiente');

  // ── Stat cards ──────────────────────────────────────────────
  _set('dashStatMatrices', misMatrices.length);
  _set('dashStatMatricesDelta', `↑ ${misMatrices.filter(m => _esteMe(m.createdAt)).length} este mes`);

  const tareasPend  = misTareas.filter(t => t.estado !== 'Completado' && t.estado !== 'Al día').length;
  const tareasCrit  = misTareas.filter(t => t.estado === 'Crítico').length;
  _set('dashStatTareas', tareasPend);
  const deltaEl = document.getElementById('dashStatTareasDelta');
  if (deltaEl) {
    deltaEl.textContent = tareasCrit > 0 ? `⚠ ${tareasCrit} críticas` : 'Sin tareas críticas';
    deltaEl.style.color = tareasCrit > 0 ? 'var(--yellow)' : '';
  }

  const objProg  = misObjetivos.filter(o => o.estado === 'En progreso' || (!o.estado)).length;
  const avanceProm = misObjetivos.length
    ? Math.round(misObjetivos.reduce((s, o) => s + (o.avance || 0), 0) / misObjetivos.length)
    : 0;
  _set('dashStatObjetivos', objProg);
  _set('dashStatObjetivosDelta', `↑ ${avanceProm}% avance prom.`);

  _set('dashPeticionesPendientes', misPeticiones.length);
  _set('dashPeticionesDelta', misPeticiones.length
    ? `${misPeticiones.length} requieren atención`
    : 'Sin peticiones nuevas');

  // ── Subtítulo con cargo ──────────────────────────────────────
  const sub = document.getElementById('dashSubtitle');
  if (sub) sub.textContent = `Resumen operativo · ${AppState.adminSession?.cargo || 'Administrador'}`;

  // ── Badge de mes ─────────────────────────────────────────────
  const mesBadge = document.getElementById('dashChartMes');
  if (mesBadge) {
    const ahora = new Date();
    mesBadge.textContent = ahora.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  // ── Matrices recientes ───────────────────────────────────────
  if (!misMatrices.length) {
    listContainer.innerHTML = `<p style="font-size:13px;color:var(--text-m)">No tienes matrices asignadas aún.</p>`;
  } else {
    listContainer.innerHTML = misMatrices.slice(0, 3).map(m => `
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

  // ── Actividad reciente (gestion filtrada) ────────────────────
  _renderTimeline(misIds);

  // ── Gráficas ─────────────────────────────────────────────────
  renderDashboardCharts(misMatrices, misTareas);
}

function _renderTimeline(misIds) {
  const el = document.getElementById('dashTimeline');
  if (!el) return;

  const registros = AppState.gestionGlobal
    .filter(g => !g.matrizId || misIds.has(String(g.matrizId)))
    .slice(0, 8);

  if (!registros.length) {
    el.innerHTML = `<div style="font-size:13px;color:var(--text-m);padding:12px 0">Sin actividad reciente.</div>`;
    return;
  }

  // Agrupar por día
  const grupos = {};
  registros.forEach(g => {
    const d = g.fecha ? new Date(g.fecha) : new Date();
    const key = d.toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' });
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(g);
  });

  el.innerHTML = Object.entries(grupos).map(([dia, items]) => `
    <div class="timeline-group">
      <div class="timeline-date">${dia}</div>
      ${items.map(g => `
        <div class="timeline-item">
          <div class="timeline-item-icon">${_iconGestion(g.tipo)}</div>
          <div class="timeline-item-content">
            <div class="timeline-item-title">${g.descripcion || g.accion || 'Registro'}</div>
            <div class="timeline-item-meta">
              ${g.fecha ? new Date(g.fecha).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}) : ''}
              ${g.categoria ? ' · ' + g.categoria : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function _iconGestion(tipo) {
  const map = { completado:'✓', error:'⚠', nuevo:'▦', alerta:'⊙' };
  return map[tipo] || '⊙';
}

function renderDashboardCharts(misMatrices, misTareas) {
  // ── Progreso por Matriz (línea) ──────────────────────────
  const ctxMat = document.getElementById('chartMatrices');
  if (ctxMat) {
    if (ctxMat._chartInstance) ctxMat._chartInstance.destroy();
    const labels       = misMatrices.map(m => m.nombre);
    const dataProgress = misMatrices.map(m => {
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

  // ── Estado de Tareas (donut + barras dinámicas) ──────────
  const ctxTar = document.getElementById('chartTareas');
  const total   = misTareas.length || 1;
  const comp    = misTareas.filter(t => t.estado === 'Completado' || t.estado === 'Al día').length;
  const prog    = misTareas.filter(t => t.estado === 'En progreso').length;
  const crit    = misTareas.filter(t => t.estado === 'Crítico').length;

  const pComp = Math.round(comp / total * 100);
  const pProg = Math.round(prog / total * 100);
  const pCrit = Math.round(crit / total * 100);

  // Actualizar barras
  _pct('dashPctComp', 'dashBarComp', pComp);
  _pct('dashPctProg', 'dashBarProg', pProg);
  _pct('dashPctCrit', 'dashBarCrit', pCrit);

  if (ctxTar) {
    if (ctxTar._chartInstance) ctxTar._chartInstance.destroy();
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

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _pct(pctId, barId, val) {
  const pEl = document.getElementById(pctId);
  const bEl = document.getElementById(barId);
  if (pEl) pEl.textContent = val + '%';
  if (bEl) bEl.style.width = val + '%';
}

function _esteMe(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}
