// ============================================================
// NEXUS OPS — reportes.js
// CRUD de Reportes
// ============================================================

import { db, collection, doc, addDoc, deleteDoc } from './firebase.js';
import { AppState } from './state.js';
import { estadoBadge, showToast } from './helpers.js';
import { closeModal } from './ui.js';


// ── Helper: matrices visibles para el usuario actual ─────────
// superadmin → todas | admin normal → solo las suyas
function _misMatrices() {
  const session = AppState.adminSession;
  if (!session) return AppState.matrices;
  if (session.isSuperAdmin) return AppState.matrices;
  return AppState.matrices.filter(m => m.creadoPor === session.uid);
}
function _misIds() {
  return new Set(_misMatrices().map(m => m.id));
}
export function renderReportes() {
  const tbody = document.getElementById('reportes-tbody');
  if (!tbody) return;

  if (!AppState.reportes.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-m)">Sin reportes.</td></tr>`;
    return;
  }

  const _ids = _misIds();
  tbody.innerHTML = AppState.reportes.filter(r => _ids.has(String(r.matrizId))).map(r => {
    const m = AppState.matrices.find(x => String(x.id) === String(r.matrizId));
    return `<tr>
      <td style="font-weight:500;color:var(--deep)">${r.titulo}</td>
      <td style="font-size:12px">${m ? m.icono + ' ' + m.nombre : 'General'}</td>
      <td style="font-size:12px">${r.tipo}</td>
      <td>${estadoBadge(r.estado)}</td>
      <td style="font-family:'DM Mono';font-size:12px">${r.fecha || '–'}</td>
      <td>
        <button class="btn btn-ghost" style="color:var(--red);padding:4px 8px" onclick="deleteReporte('${r.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

export async function saveReporte() {
  const titulo = document.getElementById('rTitulo').value.trim();
  if (!titulo) { showToast('Título requerido', 'error'); return; }

  const data = {
    titulo,
    tipo:      document.getElementById('rTipo').value,
    matrizId:  document.getElementById('rMatriz').value || null,
    estado:    document.getElementById('rEstado').value,
    fecha:     new Date().toISOString().split('T')[0],
    contenido: document.getElementById('rContenido').value
  };

  try {
    await addDoc(collection(db, 'reportes'), data);
    closeModal('modal-nuevo-reporte');
    ['rTitulo', 'rContenido'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    showToast('Reporte guardado ✓', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export async function deleteReporte(id) {
  if (confirm('¿Eliminar este reporte?')) {
    try {
      await deleteDoc(doc(db, 'reportes', String(id)));
      showToast('Reporte eliminado', 'warning');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }
}
