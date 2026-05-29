// ============================================================
// NEXUS OPS — state.js
// Estado global centralizado de la aplicación
// ============================================================

export const AppState = {
  matrices:        [],
  objetivos:       [],
  tareas:          [],
  diagramas:       [],
  reportes:        [],
  gestionGlobal:   [],
  comments:        [],   // comentarios con soloAdmin:true del panel ejecutivo
  currentMatrizId: null,
  perfil:          null,
  config:          null,
  editingId:       null, // ID del registro que se está editando
  adminCommentFilter: ''
};

export let currentView = 'grid';

export function setCurrentView(val) {
  currentView = val;
}
