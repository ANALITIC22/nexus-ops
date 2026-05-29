// ============================================================
// NEXUS OPS — sync.js
// Sincronización en tiempo real con Firebase (onSnapshot)
// ============================================================

import {
  db, collection, doc,
  onSnapshot, query, orderBy
} from './firebase.js';
import { AppState } from './state.js';
import { showToast } from './helpers.js';

// Renders (importados bajo demanda para evitar ciclos)
import { renderMatricesGrid, renderDetailInfo, renderDetailIndicators } from './matrices.js';
import { updateDashboard } from './dashboard.js';
import { renderProfileApps, applyPerfilToDOM, applyConfigToDOM } from './perfil.js';
import { renderGlobalObjetivos, renderObjetivosTab, renderEstadoTab } from './objetivos.js';
import { renderGlobalTareas, renderTareasTab } from './tareas.js';
import { renderPeticiones, updatePeticionesBadge } from './peticiones.js';
import { renderGlobalDiagramas, renderDiagramasTab } from './diagramas.js';
import { renderReportes } from './reportes.js';
import { renderGestionGlobal, renderGestionRegistros } from './gestion.js';
import { renderActividad, renderHistorialTab } from './actividad.js';
import { renderAdminComments, updateAdminCommentsBadge } from './comentarios.js';

export function initFirebaseSync() {

  // ── Matrices ──────────────────────────────────────────────
  onSnapshot(collection(db, 'matrices'), snap => {
    AppState.matrices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMatricesGrid();
    updateDashboard();
    renderProfileApps();

    // Actualizar selector de gestión global
    const matSel = document.getElementById('gestion-matriz-select');
    if (matSel) {
      const prev = matSel.value;
      matSel.innerHTML = '<option value="">General</option>' +
        AppState.matrices.map(m => `<option value="${m.id}">${m.icono || ''} ${m.nombre}</option>`).join('');
      if (prev) matSel.value = prev;
    }

    if (AppState.currentMatrizId) {
      const current = AppState.matrices.find(x => String(x.id) === String(AppState.currentMatrizId));
      if (current) { renderDetailInfo(current); renderDetailIndicators(current); }
    }
  }, err => { console.error('Matrices error:', err); showToast('Error de conexión Firebase', 'error'); });

  // ── Objetivos ─────────────────────────────────────────────
  onSnapshot(collection(db, 'objetivos'), snap => {
    AppState.objetivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (document.getElementById('page-objetivos')?.classList.contains('active')) renderGlobalObjetivos();
    if (AppState.currentMatrizId) {
      renderObjetivosTab();
      renderEstadoTab();
      renderDetailIndicators(AppState.matrices.find(x => String(x.id) === String(AppState.currentMatrizId)) || {});
    }
    updateDashboard();
  }, err => console.error('Objetivos error:', err));

  // ── Tareas ────────────────────────────────────────────────
  onSnapshot(collection(db, 'tareas'), snap => {
    AppState.tareas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (document.getElementById('page-tareas')?.classList.contains('active'))     renderGlobalTareas();
    if (document.getElementById('page-peticiones')?.classList.contains('active')) renderPeticiones();
    if (AppState.currentMatrizId) { renderTareasTab(); renderEstadoTab(); }
    updateDashboard();
    updatePeticionesBadge();
  }, err => console.error('Tareas error:', err));

  // ── Diagramas ─────────────────────────────────────────────
  onSnapshot(collection(db, 'diagramas'), snap => {
    AppState.diagramas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (document.getElementById('page-diagramas')?.classList.contains('active')) renderGlobalDiagramas();
    if (AppState.currentMatrizId) renderDiagramasTab();
  }, err => console.error('Diagramas error:', err));

  // ── Reportes ──────────────────────────────────────────────
  onSnapshot(collection(db, 'reportes'), snap => {
    AppState.reportes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (document.getElementById('page-reportes')?.classList.contains('active')) renderReportes();
  }, err => console.error('Reportes error:', err));

  // ── Gestión / Bitácora ────────────────────────────────────
  onSnapshot(collection(db, 'gestion'), snap => {
    AppState.gestionGlobal = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    if (document.getElementById('page-gestion')?.classList.contains('active'))   renderGestionGlobal();
    if (document.getElementById('page-actividad')?.classList.contains('active')) renderActividad();
    if (AppState.currentMatrizId) { renderGestionRegistros(); renderHistorialTab(); }
  }, err => console.error('Gestión error:', err));

  // ── Perfil ────────────────────────────────────────────────
  onSnapshot(doc(db, 'config', 'perfil'), snap => {
    if (snap.exists()) {
      AppState.perfil = snap.data();
      applyPerfilToDOM(AppState.perfil);
      renderProfileApps();
    }
  }, err => console.error('Perfil error:', err));

  // ── Configuración ─────────────────────────────────────────
  onSnapshot(doc(db, 'config', 'settings'), snap => {
    if (snap.exists()) {
      AppState.config = snap.data();
      applyConfigToDOM(AppState.config);
      if (AppState.config.tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else if (AppState.config.tema === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
    }
  }, err => console.error('Config error:', err));

  // ── Comentarios privados (Panel Ejecutivo) ────────────────
  onSnapshot(query(collection(db, 'comments'), orderBy('createdAt', 'desc')), snap => {
    AppState.comments = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.soloAdmin === true);
    if (document.getElementById('tab-comentarios-admin')?.classList.contains('active')) {
      renderAdminComments();
    }
    updateAdminCommentsBadge();
  }, err => console.error('Comments error:', err));
}
