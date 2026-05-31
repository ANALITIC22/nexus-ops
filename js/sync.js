/* ============================================================
   sync.js — Sincronización Firebase en tiempo real + Init
   Se importa desde: js/app.js (entry point)
   Inicializa onSnapshot para todas las colecciones y arranca
   el panel una vez que los primeros datos estén disponibles.
============================================================ */
import { S, db, collection, onSnapshot, doc, addDoc, serverTimestamp, EXEC } from './firebase.js';
import { renderOverview } from './overview.js';
import {
  renderMatricesExec, renderObjetivosExec, renderTareasExec,
  renderReportesExec, renderGestionExec, renderActividadExec,
  renderPerfilExec
} from './pages.js';
import { renderGMMatrices, renderGMDetalle } from './gerente.js';

// ── Firebase Sync (tiempo real) ───────────────────────────────
export function initSync() {
  const showApp = () => {
    const ov = document.getElementById('loadingOverlay');
    if (ov) ov.style.display = 'none';
    const pg = document.getElementById('page-overview');
    if (pg) pg.classList.add('active');
  };

  let initialLoad = 0;
  const checkReady = () => { initialLoad++; if (initialLoad >= 3) showApp(); };

  // Helper para obtener la página activa
  const activePage = () =>
    document.querySelector('.exec-page.active')?.id?.replace('page-', '');

  onSnapshot(collection(db, 'matrices'), snap => {
    S.matrices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    checkReady();
    const ap = activePage();
    if (ap === 'overview')     renderOverview();
    if (ap === 'matrices')     renderMatricesExec();
    if (ap === 'tareas')       renderTareasExec();
    if (ap === 'objetivos')    renderObjetivosExec();
    if (ap === 'perfil')       renderPerfilExec();
    if (ap === 'gm-matrices')  renderGMMatrices();
  });

  onSnapshot(collection(db, 'objetivos'), snap => {
    S.objetivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    checkReady();
    const ap = activePage();
    if (ap === 'overview')    renderOverview();
    if (ap === 'objetivos')   renderObjetivosExec();
    if (ap === 'gm-matrices') renderGMMatrices();
    if (ap === 'gm-detalle')  renderGMDetalle(window._gmDetalleMatrizId);
  });

  onSnapshot(collection(db, 'tareas'), snap => {
    S.tareas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    checkReady();
    const ap = activePage();
    if (ap === 'overview')    renderOverview();
    if (ap === 'tareas')      renderTareasExec();
    if (ap === 'gm-matrices') renderGMMatrices();
    if (ap === 'gm-detalle')  renderGMDetalle(window._gmDetalleMatrizId);
  });

  onSnapshot(collection(db, 'diagramas'), snap => {
    S.diagramas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });

  onSnapshot(collection(db, 'reportes'), snap => {
    S.reportes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (activePage() === 'reportes') renderReportesExec();
  });

  onSnapshot(collection(db, 'gestion'), snap => {
    S.gestion = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const ap = activePage();
    if (ap === 'gestion')   renderGestionExec();
    if (ap === 'actividad') renderActividadExec();
  });

  onSnapshot(doc(db, 'config', 'perfil'), snap => {
    if (snap.exists()) S.perfil = snap.data();
    if (activePage() === 'perfil') renderPerfilExec();
  });

  onSnapshot(collection(db, 'comments'), snap => {
    S.comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
}

// ── Modal Petición ────────────────────────────────────────────
let _peticionMatrizId     = null;
let _peticionMatrizNombre = null;

window.abrirModalPeticion = function (matrizId, matrizNombre) {
  _peticionMatrizId     = matrizId;
  _peticionMatrizNombre = matrizNombre;
  document.getElementById('peticionNombre').value     = '';
  document.getElementById('peticionTitulo').value     = '';
  document.getElementById('peticionDesc').value       = '';
  document.getElementById('peticionPrioridad').value  = 'Media';
  document.getElementById('peticionNombreError').style.display = 'none';
  document.getElementById('peticionTituloError').style.display = 'none';
  document.getElementById('peticionNombre').classList.remove('error');
  document.getElementById('peticionTitulo').classList.remove('error');
  document.getElementById('modalPeticion').style.display = 'flex';
  setTimeout(() => document.getElementById('peticionNombre').focus(), 80);
};

window.cerrarModalPeticion = function () {
  document.getElementById('modalPeticion').style.display = 'none';
};

window.enviarPeticion = async function () {
  const nombre    = document.getElementById('peticionNombre').value.trim();
  const titulo    = document.getElementById('peticionTitulo').value.trim();
  const desc      = document.getElementById('peticionDesc').value.trim();
  const prioridad = document.getElementById('peticionPrioridad').value;

  let valid = true;
  if (!nombre) {
    document.getElementById('peticionNombreError').style.display = 'block';
    document.getElementById('peticionNombre').classList.add('error');
    valid = false;
  } else {
    document.getElementById('peticionNombreError').style.display = 'none';
    document.getElementById('peticionNombre').classList.remove('error');
  }
  if (!titulo) {
    document.getElementById('peticionTituloError').style.display = 'block';
    document.getElementById('peticionTitulo').classList.add('error');
    valid = false;
  } else {
    document.getElementById('peticionTituloError').style.display = 'none';
    document.getElementById('peticionTitulo').classList.remove('error');
  }
  if (!valid) return;

  const btn = document.getElementById('btnEnviarPeticion');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
  try {
    await addDoc(collection(db, 'tareas'), {
      titulo,
      descripcion: desc,
      responsable: nombre,
      solicitante: nombre,
      prioridad,
      estado: 'Pendiente',
      avance: 0,
      matrizId: _peticionMatrizId,
      matrizNombre: _peticionMatrizNombre,
      esPeticion: true,
      fecha: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      ts: new Date().toISOString()
    });
    cerrarModalPeticion();
    const m = S.matrices.find(x => String(x.id) === String(_peticionMatrizId));
    if (m) {
      import('./detalle.js').then(({ renderDetailTareas }) => renderDetailTareas(m));
    }
  } catch (e) { console.error('Error creando petición:', e); }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar Petición'; }
  }
};

// ── Inicialización ────────────────────────────────────────────
export function initApp() {
  // Identidad ejecutiva en sidebar
  const _si = document.getElementById('sidebarExecInitials');
  const _sn = document.getElementById('sidebarExecName');
  if (_si) _si.textContent = EXEC.initials;
  if (_sn) _sn.textContent = EXEC.name;

  // Exponer EXEC para login.js
  window._EXEC_REF = EXEC;

  // Cerrar modal petición al hacer clic fuera
  const _mp = document.getElementById('modalPeticion');
  if (_mp) _mp.addEventListener('click', function (e) { if (e.target === this) cerrarModalPeticion(); });

  initSync();
}
