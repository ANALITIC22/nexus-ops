/* ============================================================
   app.js — Entry Point del Panel Ejecutivo (ES Module)
   Importa todos los módulos y dispara el init cuando el
   evento nexus:exec:ready es emitido por loader.js
============================================================ */

// ── Importar todos los módulos (side-effect: registran en window) ─
import './firebase.js';
import './helpers.js';
import './navigation.js';   // registra navTo, switchDetailTab
import './overview.js';
import './detalle.js';
import './pages.js';        // registra openMatrizExec, applyMatricesFilters, etc.
import './gerente.js';      // registra openGMModal, saveGMModal, deleteGMItem, etc.

// ── Init principal ─────────────────────────────────────────────
import { initApp } from './sync.js';

document.addEventListener('nexus:exec:ready', () => {
  initApp();
});
