// ============================================================
// NEXUS OPS — tareas.js
// CRUD completo de Tareas + Progreso inline
// ============================================================

import { db, collection, doc, addDoc, updateDoc, deleteDoc } from './firebase.js';
import { AppState } from './state.js';
import { estadoBadge, prioridadBadge, progressBar, showToast } from './helpers.js';
import { closeModal, openModal, populateTareaMatrizSelect } from './ui.js';
import { renderEstadoTab } from './objetivos.js';

// ── Render global ────────────────────────────────────────────
export function renderGlobalTareas() {
  const tbody = document.getElementById('global-tareas-tbody');
  if (!tbody) return;

  if (!AppState.tareas.length) { // early length check
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-m)">Sin tareas registradas.</td></tr>`;
    return;
  }

  const tareasValidas = AppState.tareas.filter(t => !t.esPeticion || t.peticionEstado === 'aceptada');

  tbody.innerHTML = tareasValidas.map(t => {
    const m = AppState.matrices.find(x => String(x.id) === String(t.matrizId));
    return `<tr>
      <td style="font-weight:500;color:var(--deep)">${t.titulo}</td>
      <td style="font-size:12px">${m ? m.icono + ' ' + m.nombre : 'General'}</td>
      <td style="font-size:12px">${t.responsable || '–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>${estadoBadge(t.estado)}</td>
      <td>${progressBar(t.avance || 0)}</td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha || '–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTareaGlobal('${t.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Render tab ───────────────────────────────────────────────
export function renderTareasTab() {
  const tbody = document.getElementById('tareas-tbody');
  if (!tbody) return;

  const all       = AppState.tareas.filter(t => String(t.matrizId) === String(AppState.currentMatrizId));
  // Las peticiones aceptadas ya son tareas normales; solo se muestran como petición las pendientes/denegadas
  const tareas    = all.filter(t => !t.esPeticion || t.peticionEstado === 'aceptada');
  const peticiones = all.filter(t => t.esPeticion && t.peticionEstado !== 'aceptada');

  if (!all.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-m);font-size:12.5px">Sin tareas ni peticiones. Use el botón + para agregar.</td></tr>`;
    return;
  }

  const tareasRows = tareas.map(t => `
    <tr>
      <td>
        <div style="font-weight:500;color:var(--deep)">${t.titulo}</div>
        <div style="font-size:11px;color:var(--text-m)">${t.desc || t.descripcion || ''}</div>
      </td>
      <td style="font-size:12px">${t.responsable || '–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>
        <select style="background:transparent;border:1px solid var(--border);border-radius:4px;
          font-size:11px;padding:2px 6px;color:var(--text-b);cursor:pointer;font-family:'DM Sans',sans-serif"
          onchange="quickUpdateTarea('${t.id}','estado',this.value)">
          ${['Pendiente', 'En progreso', 'Al día', 'Completado', 'Crítico'].map(e =>
            `<option value="${e}" ${t.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;min-width:160px">
          <input type="range" min="0" max="100" value="${t.avance || 0}"
            style="width:80px;accent-color:var(--gold);cursor:pointer"
            oninput="this.nextElementSibling.textContent=this.value+'%'"
            onchange="updateTareaProgress('${t.id}',this.value)">
          <span style="font-size:11px;font-family:'DM Mono',monospace;min-width:32px">${t.avance || 0}%</span>
        </div>
      </td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha || '–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTarea('${t.id}')">✕</button>
      </td>
    </tr>`).join('');

  const peticionRows = peticiones.length ? `
    <tr>
      <td colspan="7" style="background:rgba(211,171,128,0.08);padding:8px 14px;border-top:2px dashed var(--gold)">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-weight:700;color:var(--warm);letter-spacing:0.08em;text-transform:uppercase">📋 Peticiones del Panel Ejecutivo</span>
          <span style="background:var(--gold);color:var(--deep);font-size:9px;font-weight:700;padding:1px 7px;border-radius:10px">${peticiones.length}</span>
        </div>
      </td>
    </tr>
    ${peticiones.map(t => `
    <tr style="background:rgba(211,171,128,0.04)">
      <td>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
          <span style="font-weight:500;color:var(--deep)">${t.titulo}</span>
          <span class="peticion-tag-admin">📋 Petición</span>
        </div>
        <div style="font-size:11px;color:var(--text-m);margin-top:2px">${t.descripcion || ''}</div>
      </td>
      <td style="font-size:12px">
        <div style="font-weight:500;color:var(--deep)">👤 ${t.solicitante || t.responsable || '–'}</div>
        <div style="font-size:10px;color:var(--text-m)">Solicitante</div>
      </td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>
        <select style="background:transparent;border:1px solid var(--border);border-radius:4px;
          font-size:11px;padding:2px 6px;color:var(--text-b);cursor:pointer;font-family:'DM Sans',sans-serif"
          onchange="quickUpdateTarea('${t.id}','estado',this.value)">
          ${['Pendiente', 'En progreso', 'Al día', 'Completado', 'Crítico'].map(e =>
            `<option value="${e}" ${t.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;min-width:160px">
          <input type="range" min="0" max="100" value="${t.avance || 0}"
            style="width:80px;accent-color:var(--gold);cursor:pointer"
            oninput="this.nextElementSibling.textContent=this.value+'%'"
            onchange="updateTareaProgress('${t.id}',this.value)">
          <span style="font-size:11px;font-family:'DM Mono',monospace;min-width:32px">${t.avance || 0}%</span>
        </div>
      </td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha || '–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTarea('${t.id}')">✕</button>
      </td>
    </tr>`).join('')}` : '';

  tbody.innerHTML = tareasRows + peticionRows;
}

// ── CRUD ─────────────────────────────────────────────────────
export async function updateTareaProgress(id, value) {
  const pct = parseInt(value);
  let nuevoEstado = 'En progreso';
  if (pct === 0)               nuevoEstado = 'Pendiente';
  if (pct === 100)             nuevoEstado = 'Completado';
  if (pct >= 80 && pct < 100) nuevoEstado = 'Al día';
  try {
    await updateDoc(doc(db, 'tareas', String(id)), { avance: pct, estado: nuevoEstado });
    const t = AppState.tareas.find(x => String(x.id) === String(id));
    if (t) { t.avance = pct; t.estado = nuevoEstado; }
    renderEstadoTab();
  } catch (e) { showToast('Error al actualizar progreso', 'error'); }
}

export async function quickUpdateTarea(id, field, value) {
  try {
    await updateDoc(doc(db, 'tareas', String(id)), { [field]: value });
    const t = AppState.tareas.find(x => String(x.id) === String(id));
    if (t) t[field] = value;
    renderEstadoTab();
  } catch (e) { showToast('Error al actualizar', 'error'); }
}

export async function saveTarea() {
  const titulo = document.getElementById('tTitulo').value.trim();
  if (!titulo) { showToast('El título es obligatorio', 'error'); return; }

  const data = {
    matrizId:    AppState.currentMatrizId || document.getElementById('tMatriz')?.value || "",
    titulo,
    responsable: document.getElementById('tResponsable').value || 'Analista Corp.',
    prioridad:   document.getElementById('tPrioridad').value,
    estado:      document.getElementById('tEstado').value,
    avance:      parseInt(document.getElementById('tAvance')?.value) || 0,
    fecha:       document.getElementById('tFecha').value || new Date().toISOString().split('T')[0],
    desc:        '',
    obs:         document.getElementById('tObs')?.value || '',
    fechaCreacion: new Date().toISOString().split('T')[0]
  };

  try {
    await addDoc(collection(db, 'tareas'), data);
    showToast('Tarea guardada ✓', 'success');
    closeModal('modal-nueva-tarea');
    document.getElementById('tTitulo').value = '';
    const obsEl = document.getElementById('tObs');
    if (obsEl) obsEl.value = '';
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export function editTarea(id) {
  const t = AppState.tareas.find(x => String(x.id) === String(id));
  if (!t) return;

  AppState.editingId = id;
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  setVal('tTitulo',      t.titulo);
  setVal('tResponsable', t.responsable || '');
  setVal('tPrioridad',   t.prioridad || 'Media');
  setVal('tEstado',      t.estado || 'Pendiente');
  setVal('tFecha',       t.fecha || '');
  setVal('tObs',         t.obs || '');
  setVal('tAvance',      t.avance || 0);

  const matSel = document.getElementById('tMatriz');
  if (matSel) { populateTareaMatrizSelect(); matSel.value = t.matrizId || ''; }

  // Slider de avance inline en modal
  let swrap = document.getElementById('tAvanceSliderWrap');
  if (!swrap) {
    const avGrp = document.getElementById('tAvance')?.closest('.form-group');
    if (avGrp) {
      const d  = document.createElement('div');
      d.id     = 'tAvanceSliderWrap';
      d.style  = 'margin-top:6px;display:flex;align-items:center;gap:10px';
      d.innerHTML = `<input type="range" id="tAvanceSlider" min="0" max="100" value="${t.avance || 0}"
        style="flex:1;accent-color:var(--gold)"
        oninput="document.getElementById('tAvance').value=this.value;document.getElementById('tAvanceSliderVal').textContent=this.value+'%'">
        <span id="tAvanceSliderVal" style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;min-width:40px;color:var(--deep)">${t.avance || 0}%</span>`;
      avGrp.appendChild(d);
      document.getElementById('tAvance').addEventListener('input', e => {
        const sl = document.getElementById('tAvanceSlider');
        const sv = document.getElementById('tAvanceSliderVal');
        if (sl) sl.value = e.target.value;
        if (sv) sv.textContent = e.target.value + '%';
      });
    }
  } else {
    const sl = document.getElementById('tAvanceSlider');
    const sv = document.getElementById('tAvanceSliderVal');
    if (sl) sl.value = t.avance || 0;
    if (sv) sv.textContent = (t.avance || 0) + '%';
  }

  const title = document.querySelector('#modal-nueva-tarea .modal-title');
  if (title) title.textContent = 'Editar Tarea';
  const btn = document.querySelector('#modal-nueva-tarea .btn-primary');
  if (btn) { btn.textContent = '💾 Guardar Cambios'; btn.setAttribute('onclick', 'saveEditTarea()'); }

  openModal('modal-nueva-tarea');
}

export async function saveEditTarea() {
  if (!AppState.editingId) return;
  const titulo = document.getElementById('tTitulo').value.trim();
  if (!titulo) { showToast('El título es obligatorio', 'error'); return; }

  const avance = parseInt(document.getElementById('tAvance').value) || 0;
  let estado   = document.getElementById('tEstado').value;
  if (avance === 100) estado = 'Completado';
  if (avance >= 80 && avance < 100 && estado !== 'Crítico') estado = 'Al día';

  const data = {
    titulo,
    responsable: document.getElementById('tResponsable').value,
    prioridad:   document.getElementById('tPrioridad').value,
    estado,
    avance,
    fecha:       document.getElementById('tFecha').value,
    obs:         document.getElementById('tObs')?.value || '',
    matrizId:    document.getElementById('tMatriz')?.value || AppState.currentMatrizId || ''
  };

  try {
    await updateDoc(doc(db, 'tareas', String(AppState.editingId)), data);
    showToast('Tarea actualizada ✓', 'success');
    closeModal('modal-nueva-tarea');
    const title = document.querySelector('#modal-nueva-tarea .modal-title');
    if (title) title.textContent = 'Nueva Tarea';
    const btn = document.querySelector('#modal-nueva-tarea .btn-primary');
    if (btn) { btn.textContent = 'Guardar Tarea'; btn.setAttribute('onclick', 'saveTarea()'); }
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export async function deleteTarea(id) {
  if (confirm('¿Eliminar esta tarea?')) {
    try {
      await deleteDoc(doc(db, 'tareas', String(id)));
      showToast('Tarea eliminada', 'warning');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }
}

export async function deleteTareaGlobal(id) {
  return deleteTarea(id);
}

export function filterTareasGlobal(val) {
  const soloTareas = AppState.tareas.filter(t => !t.esPeticion || t.peticionEstado === 'aceptada');
  const filtered = val
    ? soloTareas.filter(t => t.titulo.toLowerCase().includes(val.toLowerCase()) || t.estado === val)
    : soloTareas;
  const tbody = document.getElementById('global-tareas-tbody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-m)">Sin resultados.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(t => {
    const m = AppState.matrices.find(x => String(x.id) === String(t.matrizId));
    return `<tr>
      <td style="font-weight:500;color:var(--deep)">${t.titulo}</td>
      <td style="font-size:12px">${m ? m.icono + ' ' + m.nombre : 'General'}</td>
      <td style="font-size:12px">${t.responsable || '–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>${estadoBadge(t.estado)}</td>
      <td>${progressBar(t.avance || 0)}</td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha || '–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTareaGlobal('${t.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}
