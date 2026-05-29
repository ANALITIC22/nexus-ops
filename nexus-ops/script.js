// ============================================================
// NEXUS OPS — script.js  (Punto de entrada principal)
// Importa todos los módulos y expone funciones al DOM (window)
// ============================================================

// ── Core ─────────────────────────────────────────────────────
import { updateClock }              from './js/helpers.js';
import { initFirebaseSync }         from './js/sync.js';
import { renderMatricesGrid }       from './js/matrices.js';
import { updateDashboard }          from './js/dashboard.js';
import { initThemeConfig }          from './js/perfil.js';
import { initDragAndDrop }          from './js/diagramas.js';

// ── UI / Navegación ──────────────────────────────────────────
import {
  navigate, openModal, closeModal,
  toggleNotif, toggleView, switchTab
} from './js/ui.js';

// ── Matrices ─────────────────────────────────────────────────
import {
  saveMatriz, saveEditMatriz,
  editCurrentMatrix, deleteCurrentMatrix,
  openMatriz, filterMatrices, filterMatricesByType,
  updateMatrizEstado
} from './js/matrices.js';

// ── Objetivos ─────────────────────────────────────────────────
import {
  saveObjetivo, editObjetivo,
  saveEditObjetivo, deleteObjetivo,
  updateObjetivoProgress
} from './js/objetivos.js';

// ── Tareas ───────────────────────────────────────────────────
import {
  saveTarea, editTarea, saveEditTarea,
  deleteTarea, deleteTareaGlobal,
  filterTareasGlobal, updateTareaProgress,
  quickUpdateTarea
} from './js/tareas.js';

// ── Gestión ──────────────────────────────────────────────────
import {
  saveGestion, saveGestionGlobal,
  formatText, formatTextG,
<<<<<<< HEAD
  insertTemplate, insertTemplateG,
  clearGestionEditor, selectTipoAdmin
=======
  insertTemplate, insertTemplateG
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
} from './js/gestion.js';

// ── Diagramas ────────────────────────────────────────────────
import {
  saveDiagrama, deleteDiagrama,
<<<<<<< HEAD
  showFileName, handleDrop,
  abrirDiagrama, cerrarLightbox, descargarDiagrama,
  validateDriveLink
=======
  showFileName, handleDrop
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
} from './js/diagramas.js';

// ── Reportes ─────────────────────────────────────────────────
import { saveReporte, deleteReporte }  from './js/reportes.js';

// ── Perfil / Config ──────────────────────────────────────────
import { saveConfig, savePerfil }       from './js/perfil.js';

// ── Comentarios ──────────────────────────────────────────────
import { filterAdminComments }          from './js/comentarios.js';

<<<<<<< HEAD
// ── Peticiones ───────────────────────────────────────────────
import {
  renderPeticiones,
  filterPeticiones,
  responderPeticion
} from './js/peticiones.js';

=======
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
// ============================================================
// EXPONER AL DOM (requerido por onclick="..." en el HTML)
// ============================================================

// UI
window.navigate              = navigate;
window.openModal             = openModal;
window.closeModal            = closeModal;
window.toggleNotif           = toggleNotif;
window.toggleView            = toggleView;
window.switchTab             = switchTab;

// Matrices
window.saveMatriz            = saveMatriz;
window.saveEditMatriz        = saveEditMatriz;
window.editCurrentMatrix     = editCurrentMatrix;
window.deleteCurrentMatrix   = deleteCurrentMatrix;
window.openMatriz            = openMatriz;
window.filterMatrices        = filterMatrices;
window.filterMatricesByType  = filterMatricesByType;
window.updateMatrizEstado    = updateMatrizEstado;

// Objetivos
window.saveObjetivo          = saveObjetivo;
window.editObjetivo          = editObjetivo;
window.saveEditObjetivo      = saveEditObjetivo;
window.deleteObjetivo        = deleteObjetivo;
window.updateObjetivoProgress = updateObjetivoProgress;

// Tareas
window.saveTarea             = saveTarea;
window.editTarea             = editTarea;
window.saveEditTarea         = saveEditTarea;
window.deleteTarea           = deleteTarea;
window.deleteTareaGlobal     = deleteTareaGlobal;
window.filterTareasGlobal    = filterTareasGlobal;
window.updateTareaProgress   = updateTareaProgress;
window.quickUpdateTarea      = quickUpdateTarea;

// Gestión
window.saveGestion           = saveGestion;
window.saveGestionGlobal     = saveGestionGlobal;
window.formatText            = formatText;
window.formatTextG           = formatTextG;
window.insertTemplate        = insertTemplate;
window.insertTemplateG       = insertTemplateG;
<<<<<<< HEAD
window.clearGestionEditor    = clearGestionEditor;
window.selectTipoAdmin       = selectTipoAdmin;
=======
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45

// Diagramas
window.saveDiagrama          = saveDiagrama;
window.deleteDiagrama        = deleteDiagrama;
window.showFileName          = showFileName;
window.handleDrop            = handleDrop;
<<<<<<< HEAD
window.abrirDiagrama         = abrirDiagrama;
window.cerrarLightbox        = cerrarLightbox;
window.descargarDiagrama     = descargarDiagrama;
window.validateDriveLink     = validateDriveLink;
=======
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45

// Reportes
window.saveReporte           = saveReporte;
window.deleteReporte         = deleteReporte;

// Perfil / Config
window.saveConfig            = saveConfig;
window.savePerfil            = savePerfil;

// Comentarios admin
window.filterAdminComments   = filterAdminComments;

<<<<<<< HEAD
// Peticiones
window.renderPeticiones      = renderPeticiones;
window.filterPeticiones      = filterPeticiones;
window.responderPeticion     = responderPeticion;

=======
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Reloj en tiempo real
  updateClock();
  setInterval(updateClock, 1000);

  // Firebase listeners
  initFirebaseSync();

  // Tema (dark/light)
  initThemeConfig();

  // Drag & Drop en zona de diagramas
  initDragAndDrop();

  // Render inicial
  renderMatricesGrid();
  updateDashboard();

  // Tecla Escape cierra modales y notificaciones
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.getElementById('notifPanel')?.classList.remove('open');
      import('./js/state.js').then(mod => { mod.AppState.editingId = null; });
    }
  });
});
