// ============================================================
// NEXUS OPS — ui.js
// Navegación, modales, notificaciones, tabs y vistas
// ============================================================

import { AppState, currentView, setCurrentView } from './state.js';
import { showToast } from './helpers.js';
import {
  renderMatricesGrid, openMatriz
} from './matrices.js';
import {
  renderGlobalObjetivos
} from './objetivos.js';
import {
  renderGlobalTareas
} from './tareas.js';
import {
  renderGlobalDiagramas
} from './diagramas.js';
import {
  renderActividad
} from './actividad.js';
import {
  renderReportes
} from './reportes.js';
import {
  renderGestionGlobal
} from './gestion.js';
import {
  renderProfileApps
} from './perfil.js';
import {
  renderObjetivosTab, renderEstadoTab
} from './objetivos.js';
import {
  renderTareasTab
} from './tareas.js';
import {
  renderDiagramasTab
} from './diagramas.js';
import {
  renderHistorialTab
} from './actividad.js';
import {
  renderGestionRegistros
} from './gestion.js';
import {
  renderAdminComments
} from './comentarios.js';
import { updateDashboard } from './dashboard.js';
import { renderPeticiones } from './peticiones.js';

// ── Navegación ───────────────────────────────────────────────
export function navigate(page, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  if (navEl) {
    navEl.classList.add('active');
  } else {
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.getAttribute('onclick')?.includes(`'${page}'`)) n.classList.add('active');
    });
  }

  const titles = {
    dashboard:       'Dashboard',
    matrices:        'Matrices Operativas',
    objetivos:       'Objetivos',
    tareas:          'Tareas',
    peticiones:      'Peticiones del Panel Ejecutivo',
    gestion:         'Gestión Operativa',
    diagramas:       'Diagramas',
    actividad:       'Actividad',
    reportes:        'Reportes',
    perfil:          'Perfil Profesional',
    config:          'Configuración',
    'detalle-matriz':'Detalle de Matriz',
    'cuentas-admin': 'Cuentas de Administrador'
  };
  const ht = document.getElementById('headerTitle');
  if (ht) ht.textContent = titles[page] || page;

  if (page === 'matrices')        renderMatricesGrid();
  if (page === 'objetivos')       renderGlobalObjetivos();
  if (page === 'tareas')          renderGlobalTareas();
  if (page === 'peticiones')      renderPeticiones();
  if (page === 'diagramas')       renderGlobalDiagramas();
  if (page === 'actividad')       renderActividad();
  if (page === 'reportes')        renderReportes();
  if (page === 'gestion')         renderGestionGlobal();
  if (page === 'perfil')          renderProfileApps();
  if (page === 'dashboard')       updateDashboard();
  if (page === 'cuentas-admin')   window.renderCuentasAdmin?.();
}

// ── Modales ──────────────────────────────────────────────────
export function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');

  // Imports diferidos para evitar dependencias circulares
  if (id === 'modal-nueva-tarea')   populateTareaMatrizSelect();
  if (id === 'modal-nuevo-reporte') populateReporteMatrizSelect();
  if (id === 'modal-editar-perfil') {
    import('./perfil.js').then(mod => mod.prefillPerfilModal());
  }
  if (id === 'modal-nueva-matriz' && !AppState.editingId) {
    import('./matrices.js').then(mod => mod.clearMatrizModal());
  }
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  AppState.editingId = null;
}

// Cerrar modales al hacer clic en el overlay
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) {
        o.classList.remove('open');
        AppState.editingId = null;
      }
    });
  });
});

// ── Selectores de matríz para modales ────────────────────────
export function populateTareaMatrizSelect() {
  const sel = document.getElementById('tMatriz');
  if (!sel) return;
  sel.innerHTML = '<option value="">General</option>';
  AppState.matrices.forEach(m => {
    sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });
  if (AppState.currentMatrizId) sel.value = AppState.currentMatrizId;
}

export function populateReporteMatrizSelect() {
  const sel = document.getElementById('rMatriz');
  if (!sel) return;
  sel.innerHTML = '<option value="">General</option>';
  AppState.matrices.forEach(m => {
    sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });
}

// ── Notificaciones ───────────────────────────────────────────
export function toggleNotif() {
  document.getElementById('notifPanel').classList.toggle('open');
}

document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  if (panel?.classList.contains('open') && !panel.contains(e.target) && !e.target.closest('.icon-btn')) {
    panel.classList.remove('open');
  }
});

// ── Vista grid/list ──────────────────────────────────────────
export function toggleView() {
  setCurrentView(currentView === 'grid' ? 'list' : 'grid');
  const grid = document.getElementById('matrices-grid');
  if (grid) {
    grid.style.gridTemplateColumns = currentView === 'list'
      ? '1fr'
      : 'repeat(auto-fill,minmax(280px,1fr))';
  }
  showToast('Vista cambiada', 'success');
}

// ── Tabs ─────────────────────────────────────────────────────
export function switchTab(btn, tabId) {
  const parent = btn.closest('.page');
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');

  if (tabId === 'tab-objetivos')          renderObjetivosTab();
  if (tabId === 'tab-tareas')             renderTareasTab();
  if (tabId === 'tab-estado')             renderEstadoTab();
  if (tabId === 'tab-diagramas')          renderDiagramasTab();
  if (tabId === 'tab-historial')          renderHistorialTab();
  if (tabId === 'tab-gestion')            renderGestionRegistros();
  if (tabId === 'tab-comentarios-admin')  renderAdminComments();
}
