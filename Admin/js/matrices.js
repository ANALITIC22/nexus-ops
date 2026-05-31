// ============================================================
// NEXUS OPS — matrices.js
// CRUD completo de Matrices Operativas
// ============================================================

import { db, collection, doc, addDoc, updateDoc, deleteDoc } from './firebase.js';
import { AppState } from './state.js';
import { estadoBadge, criticidadBar, fmtDate, showToast } from './helpers.js';
import { navigate, closeModal, openModal } from './ui.js';
import { updateAdminCommentsBadge } from './comentarios.js';

// ── Render ───────────────────────────────────────────────────
export function renderMatricesGrid(filter = '', typeFilter = '') {
  const grid = document.getElementById('matrices-grid');
  if (!grid) return;

  let mats = AppState.matrices;

  // ── Filtro multi-admin ──────────────────────────────────────
  // SuperAdmin: ve TODAS las matrices sin restriccion.
  // Admin normal: solo ve las suyas (o las de otro si hay filtroAdminVer).
  if (AppState.adminSession?.isSuperAdmin) {
    // Acceso total — sin filtro
  } else if (AppState.filtroAdminVer) {
    mats = mats.filter(m => m.creadoPor === AppState.filtroAdminVer);
  } else if (AppState.adminSession?.uid) {
    mats = mats.filter(m => m.creadoPor === AppState.adminSession.uid);
  }

  if (filter)     mats = mats.filter(m => m.nombre.toLowerCase().includes(filter.toLowerCase()) || (m.descripcion || '').toLowerCase().includes(filter.toLowerCase()));
  if (typeFilter) mats = mats.filter(m => m.tipo === typeFilter);

  // ── Banner de "viendo matrices de otro admin" ───────────────
  let bannerHtml = '';
  if (AppState.filtroAdminVer) {
    const adminData = window._adminsCache?.find?.(a => a.uid === AppState.filtroAdminVer);
    const nombre = adminData?.nombre || 'otro administrador';
    bannerHtml = `<div style="grid-column:1/-1;padding:10px 16px;background:var(--gold-10);border:1px solid var(--border-g);border-radius:var(--radius-s);display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-b)">
      <span>👁 Visualizando matrices de: <strong>${nombre}</strong></span>
      <button onclick="limpiarFiltroAdmin()" style="background:none;border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer;color:var(--text-b)">✕ Volver a mis matrices</button>
    </div>`;
  }

  if (!mats.length) {
    grid.innerHTML = bannerHtml + `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">◈</div>
      <div class="empty-title">No hay matrices</div>
      <div class="empty-text">${AppState.filtroAdminVer ? 'Este admin no tiene matrices asignadas' : 'Cree su primera matriz operativa'}</div>
    </div>`;
    return;
  }

  grid.innerHTML = bannerHtml + mats.map(m => {
    const tareasM = AppState.tareas.filter(t => String(t.matrizId) === String(m.id));
    const objM    = AppState.objetivos.filter(o => String(o.matrizId) === String(m.id));
    const avgP    = objM.length ? Math.round(objM.reduce((s, o) => s + (o.avance || 0), 0) / objM.length) : 0;
    return `
    <div class="matrix-card" onclick="openMatriz('${m.id}')">
      <div class="matrix-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="matrix-icon">${m.icono || '◈'}</div>
          <div>
            <div class="matrix-name">${m.nombre}</div>
            <div class="matrix-type">${m.tipo} · ${m.area}</div>
          </div>
        </div>
        ${estadoBadge(m.estado)}
      </div>
      <div class="matrix-desc">${m.descripcion || ''}</div>
      <div style="margin:10px 0 4px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-m);margin-bottom:4px">
          <span>Progreso objetivos</span><span>${avgP}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${avgP >= 70 ? 'green' : avgP >= 40 ? '' : 'red'}" style="width:${avgP}%"></div>
        </div>
      </div>
      <div class="matrix-stats">
        <div class="matrix-stat-item"><div class="matrix-stat-val">${objM.length}</div><div class="matrix-stat-lbl">Objetivos</div></div>
        <div class="matrix-stat-item"><div class="matrix-stat-val">${tareasM.length}</div><div class="matrix-stat-lbl">Tareas</div></div>
        <div class="matrix-stat-item"><div class="matrix-stat-val">${AppState.diagramas.filter(d => String(d.matrizId) === String(m.id)).length}</div><div class="matrix-stat-lbl">Diagramas</div></div>
      </div>
      <div class="matrix-footer">
        <div class="matrix-responsible">👤 ${m.responsable}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-size:10px;color:var(--text-l)">Criticidad</div>
          ${criticidadBar(m.criticidad)}
        </div>
      </div>
    </div>`;
  }).join('');
}

export function filterMatrices(val)       { renderMatricesGrid(val); }
export function filterMatricesByType(val) { renderMatricesGrid('', val); }

// ── Modal helpers ────────────────────────────────────────────
export function clearMatrizModal() {
  ['mNombre', 'mArea', 'mDesc', 'mIcono'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Auto-llenar responsable con el admin autenticado
  const respEl = document.getElementById('mResponsable');
  if (respEl) {
    respEl.value = AppState.adminSession?.nombre || '';
    respEl.placeholder = AppState.adminSession?.nombre
      ? 'Se asigna automáticamente al creador'
      : 'Nombre del responsable';
  }

  const selTipo = document.getElementById('mTipo');
  if (selTipo) selTipo.value = 'Aplicativo';
  const selCrit = document.getElementById('mCriticidad');
  if (selCrit) selCrit.value = 'Media';
  const selEst = document.getElementById('mEstado');
  if (selEst) selEst.value = 'Al día';

  const title = document.querySelector('#modal-nueva-matriz .modal-title');
  if (title) title.textContent = 'Nueva Matriz Operativa';
  const btn = document.querySelector('#modal-nueva-matriz .btn-primary');
  if (btn) { btn.textContent = 'Guardar Matriz'; btn.setAttribute('onclick', 'saveMatriz()'); }

  AppState.editingId = null;
}

// ── CRUD ─────────────────────────────────────────────────────
export async function saveMatriz() {
  const nombre = document.getElementById('mNombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

  // ── Auto-asignar responsable y creadoPor ────────────────────
  const session     = AppState.adminSession;
  const responsableInput = document.getElementById('mResponsable');
  // Si el campo responsable está vacío, auto-llenar con el admin actual
  const responsable = (responsableInput?.value?.trim()) ||
                      (session?.nombre || 'Administrador');
  // Auto-completar el campo en el modal para que el usuario lo vea
  if (responsableInput && !responsableInput.value.trim() && session?.nombre) {
    responsableInput.value = session.nombre;
  }

  const data = {
    nombre,
    tipo:        document.getElementById('mTipo').value,
    area:        document.getElementById('mArea').value,
    responsable,
    criticidad:  document.getElementById('mCriticidad').value,
    estado:      document.getElementById('mEstado').value,
    icono:       document.getElementById('mIcono').value || '◈',
    descripcion: document.getElementById('mDesc').value,
    fechaCreacion:       new Date().toISOString().split('T')[0],
    ultimaActualizacion: new Date().toISOString().split('T')[0],
    // ── Multi-admin: quién creó esta matriz ──────────────────
    creadoPor:       session?.uid   || null,
    creadoPorNombre: session?.nombre || responsable
  };

  try {
    await addDoc(collection(db, 'matrices'), data);
    showToast('Matriz guardada ✓', 'success');
    closeModal('modal-nueva-matriz');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export function editCurrentMatrix() {
  const m = AppState.matrices.find(x => String(x.id) === String(AppState.currentMatrizId));
  if (!m) { showToast('No se encontró la matriz', 'error'); return; }

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('mNombre',      m.nombre);
  setVal('mTipo',        m.tipo);
  setVal('mArea',        m.area);
  setVal('mResponsable', m.responsable);
  setVal('mCriticidad',  m.criticidad);
  setVal('mEstado',      m.estado);
  setVal('mIcono',       m.icono);
  setVal('mDesc',        m.descripcion);

  const title = document.querySelector('#modal-nueva-matriz .modal-title');
  if (title) title.textContent = `Editar — ${m.nombre}`;
  const btn = document.querySelector('#modal-nueva-matriz .btn-primary');
  if (btn) { btn.textContent = '💾 Guardar Cambios'; btn.setAttribute('onclick', 'saveEditMatriz()'); }

  AppState.editingId = m.id;
  openModal('modal-nueva-matriz');
}

export async function saveEditMatriz() {
  if (!AppState.editingId) { showToast('Error: no hay ID de edición', 'error'); return; }
  const nombre = document.getElementById('mNombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

  const data = {
    nombre,
    tipo:        document.getElementById('mTipo').value,
    area:        document.getElementById('mArea').value,
    responsable: document.getElementById('mResponsable').value,
    criticidad:  document.getElementById('mCriticidad').value,
    estado:      document.getElementById('mEstado').value,
    icono:       document.getElementById('mIcono').value || '◈',
    descripcion: document.getElementById('mDesc').value,
    ultimaActualizacion: new Date().toISOString().split('T')[0]
  };

  try {
    await updateDoc(doc(db, 'matrices', String(AppState.editingId)), data);
    showToast('Matriz actualizada ✓', 'success');
    closeModal('modal-nueva-matriz');

    const updated = AppState.matrices.find(x => String(x.id) === String(AppState.editingId));
    if (updated) {
      Object.assign(updated, data);
      document.getElementById('detailTitle').textContent    = data.nombre;
      document.getElementById('detailSubtitle').textContent = `${data.tipo} · ${data.area}`;
      document.getElementById('detailIcon').textContent     = data.icono;
      renderDetailInfo(updated);
      renderDetailIndicators(updated);
    }
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export async function deleteCurrentMatrix() {
  if (!AppState.currentMatrizId) return;
  if (confirm('¿Eliminar esta matriz y todos sus datos?')) {
    try {
      await deleteDoc(doc(db, 'matrices', String(AppState.currentMatrizId)));
      showToast('Matriz eliminada', 'warning');
      navigate('matrices', null);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }
}

export async function updateMatrizEstado(id, estado) {
  try {
    await updateDoc(doc(db, 'matrices', String(id)), {
      estado,
      ultimaActualizacion: new Date().toISOString().split('T')[0]
    });
    const m = AppState.matrices.find(x => String(x.id) === String(id));
    if (m) {
      m.estado = estado;
      renderDetailInfo(m);
      renderDetailIndicators(m);
    }
    showToast(`Estado actualizado a "${estado}" ✓`, 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Detalle ──────────────────────────────────────────────────
export function openMatriz(id) {
  AppState.currentMatrizId  = id;
  AppState.adminCommentFilter = '';
  const m = AppState.matrices.find(x => String(x.id) === String(id));
  if (!m) return;

  document.getElementById('detailIcon').textContent     = m.icono || '◈';
  document.getElementById('detailTitle').textContent    = m.nombre;
  document.getElementById('detailSubtitle').textContent = `${m.tipo} · ${m.area}`;

  renderDetailInfo(m);
  renderDetailIndicators(m);

  document.querySelectorAll('#page-detalle-matriz .tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('#page-detalle-matriz .tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));
  document.querySelectorAll('.admin-comment-filter-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.includes('Todos'))
  );

  updateAdminCommentsBadge();
  navigate('detalle-matriz', null);
}

export function renderDetailInfo(m) {
  document.getElementById('detailInfo').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><div class="card-label">Nombre</div><div style="margin-top:4px;font-size:13.5px;color:var(--deep);font-weight:500">${m.nombre}</div></div>
      <div><div class="card-label">Tipo</div><div style="margin-top:4px;font-size:13.5px">${m.tipo}</div></div>
      <div><div class="card-label">Área</div><div style="margin-top:4px;font-size:13.5px">${m.area || '–'}</div></div>
      <div><div class="card-label">Responsable</div><div style="margin-top:4px;font-size:13.5px">👤 ${m.responsable || '–'}</div></div>
      <div><div class="card-label">Creado por</div><div style="margin-top:4px;font-size:13px;display:flex;align-items:center;gap:6px"><span style="font-size:11px;background:var(--gold-10);border:1px solid var(--border-g);padding:2px 8px;border-radius:20px;color:var(--text-b)">🛡 ${m.creadoPorNombre || m.responsable || '–'}</span></div></div>
      <div><div class="card-label">Estado</div><div style="margin-top:4px">${estadoBadge(m.estado)}</div></div>
      <div><div class="card-label">Criticidad</div><div style="margin-top:4px;display:flex;align-items:center;gap:8px">${criticidadBar(m.criticidad)}<span style="font-size:12px;color:var(--text-m)">${m.criticidad}</span></div></div>
      <div style="grid-column:1/-1"><div class="card-label">Descripción</div>
        <div style="margin-top:4px;font-size:13px;color:var(--text-b);line-height:1.6">${m.descripcion || '–'}</div></div>
      <div><div class="card-label">Fecha Creación</div><div style="margin-top:4px;font-size:12.5px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(m.fechaCreacion)}</div></div>
      <div><div class="card-label">Última Actualización</div><div style="margin-top:4px;font-size:12.5px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(m.ultimaActualizacion)}</div></div>
    </div>`;
}

export function renderDetailIndicators(m) {
  const tareasM = AppState.tareas.filter(t => String(t.matrizId) === String(m.id));
  const objM    = AppState.objetivos.filter(o => String(o.matrizId) === String(m.id));
  const avgP    = objM.length ? Math.round(objM.reduce((s, o) => s + (o.avance || 0), 0) / objM.length) : 0;

  document.getElementById('detailIndicators').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="text-align:center;padding:20px;
        background:${m.estado === 'Al día' ? 'var(--green-bg)' : m.estado === 'Crítico' ? 'var(--red-bg)' : 'var(--yellow-bg)'};
        border-radius:var(--radius-m)">
        <div style="font-size:32px;margin-bottom:8px">${m.estado === 'Al día' ? '🟢' : m.estado === 'Crítico' ? '🔴' : '🟡'}</div>
        <div style="font-size:18px;font-weight:600;color:var(--deep)">${m.estado}</div>
        <div style="font-size:11px;color:var(--text-m);margin-top:2px">Estado Operativo</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center">
        ${[['Objetivos', objM.length], ['Tareas', tareasM.length], ['Progreso', avgP + '%']].map(([l, v]) => `
          <div style="padding:12px;background:var(--gold-10);border-radius:var(--radius-s)">
            <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--deep)">${v}</div>
            <div style="font-size:10px;color:var(--text-m)">${l}</div>
          </div>`).join('')}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-m);margin-bottom:6px">
          <span>Avance global de objetivos</span>
          <span style="font-family:'DM Mono',monospace">${avgP}%</span>
        </div>
        <div class="progress-bar" style="height:8px">
          <div class="progress-fill ${avgP >= 70 ? 'green' : avgP >= 40 ? '' : 'red'}" style="width:${avgP}%"></div>
        </div>
      </div>
    </div>`;
}

// ── Limpiar filtro de admin externo ──────────────────────────
export function limpiarFiltroAdmin() {
  AppState.filtroAdminVer = null;
  renderMatricesGrid();
}
