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
  adminCommentFilter: '',

  // ── Multi-admin ──────────────────────────────────────────
  // Sesión del admin autenticado (se llena desde auth.js/cuentas_admin.js)
  adminSession: null,  // { uid, email, nombre, cargo, initials, isSuperAdmin }

  // Cuando se usa "Ver matrices de otro admin" en la página de cuentas,
  // se guarda aquí su UID para filtrar temporalmente la vista de matrices.
  // null = mostrar solo las propias del admin autenticado.
  // El superadmin siempre ve TODAS sin filtro.
  filtroAdminVer: null
};

export let currentView = 'grid';

export function setCurrentView(val) {
  currentView = val;
}
