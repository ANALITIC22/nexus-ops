// ============================================================
// NEXUS OPS — objetivos.js
// CRUD completo de Objetivos + Progreso inline
// ============================================================

import { db, collection, doc, addDoc, updateDoc, deleteDoc } from './firebase.js';
import { AppState } from './state.js';
import { estadoBadge, prioridadBadge, progressBar, showToast } from './helpers.js';
import { closeModal, openModal } from './ui.js';
import { renderDetailIndicators } from './matrices.js';

// ── Render global ────────────────────────────────────────────
export function renderGlobalObjetivos() {
  const container = document.getElementById('global-objetivos-list');
  if (!container) return;

  if (!AppState.objetivos.length) {
    container.innerHTML = `<p style="font-size:13px;color:var(--text-m)">No se han definido objetivos.</p>`;
    return;
  }
  container.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Objetivo</th><th>Matriz</th><th>Prioridad</th>
        <th>Progreso</th><th>Estado</th><th>Vencimiento</th><th>Acciones</th>
      </tr></thead>
      <tbody>
        ${AppState.objetivos.map(o => {
          const m = AppState.matrices.find(x => String(x.id) === String(o.matrizId));
          return `<tr>
            <td style="font-weight:500;color:var(--deep)">${o.titulo}</td>
            <td style="font-size:12px">${m ? m.icono + ' ' + m.nombre : 'General'}</td>
            <td>${prioridadBadge(o.prioridad)}</td>
            <td>${progressBar(o.avance)}</td>
            <td>${estadoBadge(o.estado)}</td>
            <td style="font-family:'DM Mono';font-size:12px">${o.fechaLimite || o.fecha || '–'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" style="padding:4px 8px;color:var(--warm)" onclick="editObjetivo('${o.id}')">✎</button>
              <button class="btn btn-ghost btn-sm" style="padding:4px 8px;color:var(--red)"  onclick="deleteObjetivo('${o.id}')">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ── Render tab de detalle de matriz ─────────────────────────
export function renderObjetivosTab() {
  const container = document.getElementById('objetivos-list');
  if (!container) return;
  const list = AppState.objetivos.filter(o => String(o.matrizId) === String(AppState.currentMatrizId));

  if (!list.length) {
    container.innerHTML = '<p style="font-size:12.5px;color:var(--text-m)">Sin objetivos vinculados. Use el botón + para agregar.</p>';
    return;
  }

  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
    ${list.map(o => `
      <div style="padding:16px;background:var(--ivory);border:1px solid var(--border-g);
        border-radius:var(--radius-s);border-left:3px solid ${o.prioridad === 'Alta' ? 'var(--red)' : o.prioridad === 'Media' ? 'var(--yellow)' : 'var(--green)'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13.5px;color:var(--deep);margin-bottom:4px">${o.titulo}</div>
            <div style="font-size:12px;color:var(--text-b);margin-bottom:10px">${o.descripcion || ''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            ${prioridadBadge(o.prioridad)} ${estadoBadge(o.estado)}
            <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editObjetivo('${o.id}')">✎ Editar</button>
            <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteObjetivo('${o.id}')">✕</button>
          </div>
        </div>
        <div style="margin-top:4px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:11px;color:var(--text-m)">Avance</span>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="range" min="0" max="100" value="${o.avance || 0}"
                style="width:100px;accent-color:var(--gold);cursor:pointer"
                oninput="this.nextElementSibling.textContent=this.value+'%'"
                onchange="updateObjetivoProgress('${o.id}',this.value)">
              <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--deep);font-weight:600;min-width:36px">${o.avance || 0}%</span>
            </div>
          </div>
          <div class="progress-bar" style="height:7px">
            <div class="progress-fill ${(o.avance || 0) >= 70 ? 'green' : (o.avance || 0) >= 40 ? '' : 'red'}"
              style="width:${o.avance || 0}%;transition:width 0.4s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-l);margin-top:4px">
            <span>📅 Vence: ${o.fechaLimite || o.fecha || '–'}</span>
            <span>${o.observaciones || ''}</span>
          </div>
        </div>
      </div>`).join('')}
  </div>`;
}

// ── Estado operativo ─────────────────────────────────────────
export function renderEstadoTab() {
  const container = document.getElementById('estado-cards');
  if (!container) return;
  const m = AppState.matrices.find(x => String(x.id) === String(AppState.currentMatrizId));
  if (!m) return;

  const objM      = AppState.objetivos.filter(o => String(o.matrizId) === String(m.id));
  const tarM      = AppState.tareas.filter(t => String(t.matrizId) === String(m.id));
  const avgAvance = objM.length ? Math.round(objM.reduce((s, o) => s + (o.avance || 0), 0) / objM.length) : 0;
  const criticas  = tarM.filter(t => t.estado === 'Crítico').length;
  const completadas = tarM.filter(t => t.estado === 'Completado' || t.estado === 'Al día').length;

  let estadoAuto = 'Al día', estadoEmoji = '🟢', estadoClass = 'var(--green-bg)', estadoBorderColor = 'var(--green)';
  if (criticas > 0) { estadoAuto = 'Crítico'; estadoEmoji = '🔴'; estadoClass = 'var(--red-bg)'; estadoBorderColor = 'var(--red)'; }
  else if (avgAvance < 30 && objM.length > 0) { estadoAuto = 'Pendiente'; estadoEmoji = '🟡'; estadoClass = 'var(--yellow-bg)'; estadoBorderColor = 'var(--yellow)'; }

  container.innerHTML = `
    <div style="grid-column:1/-1;padding:18px;border-radius:var(--radius-m);
      background:${estadoClass};border:1px solid ${estadoBorderColor};margin-bottom:6px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-size:36px">${estadoEmoji}</div>
          <div>
            <div style="font-size:17px;font-weight:600;color:var(--deep)">${estadoAuto}</div>
            <div style="font-size:12px;color:var(--text-m)">Estado calculado automáticamente · Criticidad: <strong>${m.criticidad}</strong></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--text-m)">Estado manual:</span>
          <select style="background:var(--bg-card);border:1px solid var(--border-g);border-radius:var(--radius-s);
            padding:6px 10px;font-size:12px;color:var(--deep);cursor:pointer;font-family:'DM Sans',sans-serif"
            onchange="updateMatrizEstado('${m.id}',this.value)">
            ${['Al día', 'Pendiente', 'Crítico'].map(e =>
              `<option value="${e}" ${m.estado === e ? 'selected' : ''}>${e === 'Al día' ? '🟢' : e === 'Crítico' ? '🔴' : '🟡'} ${e}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    </div>

    <div style="padding:16px;background:var(--gold-10);border-radius:var(--radius-s);text-align:center;border:1px solid var(--border)">
      <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:var(--deep)">${avgAvance}%</div>
      <div style="font-size:11px;color:var(--text-m);margin-top:4px">Avance Promedio Objetivos</div>
      <div class="progress-bar" style="height:6px;margin-top:10px">
        <div class="progress-fill ${avgAvance >= 70 ? 'green' : avgAvance >= 40 ? '' : 'red'}" style="width:${avgAvance}%"></div>
      </div>
    </div>
    <div style="padding:16px;background:${criticas > 0 ? 'var(--red-bg)' : 'var(--gold-10)'};border-radius:var(--radius-s);text-align:center;border:1px solid var(--border)">
      <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:${criticas > 0 ? 'var(--red)' : 'var(--green)'}">${criticas}</div>
      <div style="font-size:11px;color:var(--text-m);margin-top:4px">Tareas Críticas</div>
    </div>
    <div style="padding:16px;background:var(--gold-10);border-radius:var(--radius-s);text-align:center;border:1px solid var(--border)">
      <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:var(--green)">${completadas}</div>
      <div style="font-size:11px;color:var(--text-m);margin-top:4px">Tareas Completadas</div>
    </div>

    ${tarM.length ? `
    <div style="grid-column:1/-1;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-s);padding:16px">
      <div style="font-size:12px;font-weight:600;color:var(--deep);margin-bottom:12px">Distribución de Tareas</div>
      ${['Completado', 'Al día', 'En progreso', 'Pendiente', 'Crítico'].map(estado => {
        const count = tarM.filter(t => t.estado === estado).length;
        const pct   = tarM.length ? Math.round(count / tarM.length * 100) : 0;
        const color = estado === 'Completado' || estado === 'Al día' ? 'green'
                    : estado === 'Crítico' ? 'red'
                    : estado === 'Pendiente' ? 'yellow' : '';
        return count > 0 ? `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-m);margin-bottom:4px">
            <span>${estado}</span><span style="font-family:'DM Mono',monospace">${count} · ${pct}%</span>
          </div>
          <div class="progress-bar" style="height:5px">
            <div class="progress-fill ${color}" style="width:${pct}%"></div>
          </div>
        </div>` : '';
      }).join('')}
    </div>` : ''}

    ${objM.length ? `
    <div style="grid-column:1/-1;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-s);padding:16px">
      <div style="font-size:12px;font-weight:600;color:var(--deep);margin-bottom:12px">Estado de Objetivos — Edición rápida de avance</div>
      ${objM.map(o => `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding:8px;
        background:var(--gold-05);border-radius:var(--radius-s);border:1px solid var(--border)">
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:500;color:var(--deep);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.titulo}</div>
          <div style="display:flex;gap:6px;margin-top:4px">${prioridadBadge(o.prioridad)} ${estadoBadge(o.estado)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;min-width:200px">
          <input type="range" min="0" max="100" value="${o.avance || 0}"
            style="width:100px;accent-color:var(--gold);cursor:pointer"
            oninput="this.nextElementSibling.textContent=this.value+'%'"
            onchange="updateObjetivoProgress('${o.id}',this.value)">
          <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;min-width:36px;color:var(--deep)">${o.avance || 0}%</span>
        </div>
      </div>`).join('')}
    </div>` : ''}`;
}

// ── CRUD ─────────────────────────────────────────────────────
export async function updateObjetivoProgress(id, value) {
  const pct = parseInt(value);
  let nuevoEstado = 'En progreso';
  if (pct === 0)   nuevoEstado = 'Pendiente';
  if (pct === 100) nuevoEstado = 'Completado';
  try {
    await updateDoc(doc(db, 'objetivos', String(id)), { avance: pct, estado: nuevoEstado });
    const obj = AppState.objetivos.find(o => String(o.id) === String(id));
    if (obj) { obj.avance = pct; obj.estado = nuevoEstado; }
    const m = AppState.matrices.find(x => String(x.id) === String(AppState.currentMatrizId));
    if (m) renderDetailIndicators(m);
    renderEstadoTab();
  } catch (e) { showToast('Error al actualizar progreso', 'error'); }
}

export async function saveObjetivo() {
  const titulo = document.getElementById('oTitulo').value.trim();
  if (!titulo) { showToast('El título es obligatorio', 'error'); return; }

  const data = {
    matrizId:    AppState.currentMatrizId || "",
    titulo,
    prioridad:   document.getElementById('oPrioridad').value,
    estado:      document.getElementById('oEstado').value,
    avance:      parseInt(document.getElementById('oAvance').value) || 0,
    fechaLimite: document.getElementById('oFecha').value,
    fecha:       document.getElementById('oFecha').value,
    descripcion: document.getElementById('oDesc').value,
    observaciones: '',
    fechaCreacion: new Date().toISOString().split('T')[0]
  };

  try {
    await addDoc(collection(db, 'objetivos'), data);
    showToast('Objetivo guardado ✓', 'success');
    closeModal('modal-nuevo-objetivo');
    ['oTitulo', 'oDesc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export function editObjetivo(id) {
  const o = AppState.objetivos.find(x => String(x.id) === String(id));
  if (!o) return;

  AppState.editingId = id;
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  setVal('oTitulo',    o.titulo);
  setVal('oPrioridad', o.prioridad);
  setVal('oEstado',    o.estado);
  setVal('oAvance',    o.avance || 0);
  setVal('oFecha',     o.fechaLimite || o.fecha || '');
  setVal('oDesc',      o.descripcion || '');

  const title = document.querySelector('#modal-nuevo-objetivo .modal-title');
  if (title) title.textContent = 'Editar Objetivo';
  const btn = document.querySelector('#modal-nuevo-objetivo .btn-primary');
  if (btn) { btn.textContent = '💾 Guardar Cambios'; btn.setAttribute('onclick', 'saveEditObjetivo()'); }

  // Slider de avance inline en modal
  let sliderWrap = document.getElementById('oAvanceSliderWrap');
  if (!sliderWrap) {
    const avanceGroup = document.getElementById('oAvance')?.closest('.form-group');
    if (avanceGroup) {
      const sliderDiv = document.createElement('div');
      sliderDiv.id    = 'oAvanceSliderWrap';
      sliderDiv.style = 'margin-top:6px;display:flex;align-items:center;gap:10px';
      sliderDiv.innerHTML = `<input type="range" id="oAvanceSlider" min="0" max="100" value="${o.avance || 0}"
        style="flex:1;accent-color:var(--gold)"
        oninput="document.getElementById('oAvance').value=this.value;document.getElementById('oAvanceSliderVal').textContent=this.value+'%'"
        onchange="document.getElementById('oAvance').value=this.value">
        <span id="oAvanceSliderVal" style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;min-width:40px;color:var(--deep)">${o.avance || 0}%</span>`;
      avanceGroup.appendChild(sliderDiv);
      document.getElementById('oAvance').addEventListener('input', e => {
        const sl = document.getElementById('oAvanceSlider');
        const sv = document.getElementById('oAvanceSliderVal');
        if (sl) sl.value = e.target.value;
        if (sv) sv.textContent = e.target.value + '%';
      });
    }
  } else {
    const sl = document.getElementById('oAvanceSlider');
    const sv = document.getElementById('oAvanceSliderVal');
    if (sl) sl.value = o.avance || 0;
    if (sv) sv.textContent = (o.avance || 0) + '%';
  }

  openModal('modal-nuevo-objetivo');
}

export async function saveEditObjetivo() {
  if (!AppState.editingId) return;
  const titulo = document.getElementById('oTitulo').value.trim();
  if (!titulo) { showToast('El título es obligatorio', 'error'); return; }

  const avance = parseInt(document.getElementById('oAvance').value) || 0;
  let estado   = document.getElementById('oEstado').value;
  if (avance === 100) estado = 'Completado';
  if (avance === 0 && estado === 'Completado') estado = 'Pendiente';

  const data = {
    titulo,
    prioridad:   document.getElementById('oPrioridad').value,
    estado,
    avance,
    fechaLimite: document.getElementById('oFecha').value,
    fecha:       document.getElementById('oFecha').value,
    descripcion: document.getElementById('oDesc').value,
  };

  try {
    await updateDoc(doc(db, 'objetivos', String(AppState.editingId)), data);
    showToast('Objetivo actualizado ✓', 'success');
    closeModal('modal-nuevo-objetivo');
    const title = document.querySelector('#modal-nuevo-objetivo .modal-title');
    if (title) title.textContent = 'Nuevo Objetivo';
    const btn = document.querySelector('#modal-nuevo-objetivo .btn-primary');
    if (btn) { btn.textContent = 'Guardar Objetivo'; btn.setAttribute('onclick', 'saveObjetivo()'); }
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export async function deleteObjetivo(id) {
  if (confirm('¿Eliminar este objetivo?')) {
    try {
      await deleteDoc(doc(db, 'objetivos', String(id)));
      showToast('Objetivo eliminado', 'warning');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }
}
