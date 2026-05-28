// ============================================================
// NEXUS OPS — diagramas.js
// CRUD de Diagramas + Drag & Drop
// ============================================================

import { db, collection, doc, addDoc, deleteDoc } from './firebase.js';
import { AppState } from './state.js';
import { showToast } from './helpers.js';
import { closeModal } from './ui.js';

export function renderGlobalDiagramas() {
  const container = document.getElementById('global-diagramas-grid');
  if (!container) return;

  if (!AppState.diagramas.length) {
    container.innerHTML = `<p style="font-size:13px;color:var(--text-m);text-align:center;padding:20px">Sin diagramas.</p>`;
    return;
  }

  container.innerHTML = AppState.diagramas.map(d => {
    const m = AppState.matrices.find(x => String(x.id) === String(d.matrizId));
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--ivory);border:1px solid var(--gold-20);border-radius:var(--radius-s);margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">${d.emoji || '🖼'}</span>
        <div>
          <div style="font-weight:500;font-size:13px;color:var(--deep)">${d.nombre} (${d.version})</div>
          <div style="font-size:11px;color:var(--text-m)">${d.categoria} · ${m ? m.nombre : '–'}</div>
        </div>
      </div>
      <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteDiagrama('${d.id}')">✕</button>
    </div>`;
  }).join('');
}

export function renderDiagramasTab() {
  const container = document.getElementById('diagramas-grid');
  if (!container) return;

  const list = AppState.diagramas.filter(d => String(d.matrizId) === String(AppState.currentMatrizId));
  if (!list.length) {
    container.innerHTML = '<p style="font-size:12.5px;color:var(--text-m);grid-column:1/-1">Sin diagramas.</p>';
    return;
  }

  container.innerHTML = list.map(d => `
    <div style="padding:12px;background:var(--ivory);border:1px solid var(--gold-20);border-radius:var(--radius-s);position:relative">
      <div style="font-size:22px;margin-bottom:4px">${d.emoji || '📋'}</div>
      <div style="font-size:13px;font-weight:500;color:var(--deep)">${d.nombre}</div>
      <div style="font-size:11px;color:var(--text-m)">${d.categoria} · ${d.version}</div>
      <p style="font-size:11.5px;color:var(--text-b);margin-top:6px">${d.desc || ''}</p>
      <button class="btn btn-sm" style="position:absolute;top:10px;right:10px;color:var(--red);background:transparent" onclick="deleteDiagrama('${d.id}')">✕</button>
    </div>`).join('');
}

export async function saveDiagrama() {
  const nombre = document.getElementById('dNombre').value.trim();
  if (!nombre) { showToast('Nombre del diagrama requerido', 'error'); return; }

  const data = {
    matrizId:  AppState.currentMatrizId || "",
    nombre,
    categoria: document.getElementById('dCategoria').value,
    version:   document.getElementById('dVersion').value || 'v1.0',
    fecha:     new Date().toISOString().split('T')[0],
    desc:      document.getElementById('dDesc').value,
    emoji:     document.getElementById('dEmoji')?.value || '📋'
  };

  try {
    await addDoc(collection(db, 'diagramas'), data);
    closeModal('modal-nuevo-diagrama');
    document.getElementById('dNombre').value = '';
    showToast('Diagrama guardado ✓', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export async function deleteDiagrama(id) {
  if (confirm('¿Eliminar este diagrama?')) {
    try {
      await deleteDoc(doc(db, 'diagramas', String(id)));
      showToast('Diagrama eliminado', 'warning');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }
}

// ── Helpers de archivo ────────────────────────────────────────
export function showFileName(input) {
  const d = document.getElementById('dFileName');
  if (d && input.files.length) d.textContent = input.files[0].name;
}

export function handleDrop(e) {
  const f = e.dataTransfer?.files;
  if (f?.length) {
    const d = document.getElementById('dFileName');
    if (d) d.textContent = f[0].name;
  }
}

// ── Drag & Drop init ─────────────────────────────────────────
export function initDragAndDrop() {
  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  ['dragenter', 'dragover'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('highlight'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('highlight'); })
  );
  dz.addEventListener('drop', handleDrop);
}
