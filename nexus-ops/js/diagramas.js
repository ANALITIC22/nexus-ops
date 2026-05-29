// ============================================================
<<<<<<< HEAD
// NEXUS OPS — diagramas.js  (v3 — Drive Link)
// Sin Firebase Storage: usa link de Google Drive como botón
// ============================================================

import {
  db, collection, doc, addDoc, deleteDoc
} from './firebase.js';
=======
// NEXUS OPS — diagramas.js
// CRUD de Diagramas + Drag & Drop
// ============================================================

import { db, collection, doc, addDoc, deleteDoc } from './firebase.js';
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
import { AppState } from './state.js';
import { showToast } from './helpers.js';
import { closeModal } from './ui.js';

<<<<<<< HEAD
// ── Convierte cualquier link de Drive en un link de vista directa ──
function toDriveViewUrl(raw) {
  if (!raw) return null;
  raw = raw.trim();

  // Ya es un link de vista directa o preview → dejarlo
  if (raw.includes('/preview') || raw.includes('export=view')) return raw;

  // Extraer FILE_ID de los formatos más comunes de Drive
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?\s]+)/,
    /drive\.google\.com\/open\?id=([^&\s]+)/,
    /id=([^&\s]+)/,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) return `https://drive.google.com/file/d/${m[1]}/view?usp=sharing`;
  }

  // Si no coincide, devolver el link tal cual (puede ser URL externa válida)
  return raw;
}

// ── Validación visual del campo de link ─────────────────────
export function validateDriveLink(input) {
  const val   = input.value.trim();
  const box   = document.getElementById('drive-link-box');
  const status = document.getElementById('dDriveLinkStatus');

  if (!val) {
    if (box) box.style.borderColor = '';
    if (status) { status.textContent = 'Pega el enlace de Google Drive del diagrama'; status.style.color = 'var(--text-m)'; }
    return;
  }

  const isValid = val.includes('drive.google.com') || val.startsWith('http');
  if (box)    box.style.borderColor = isValid ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)';
  if (status) {
    status.textContent  = isValid ? '✓ Link válido' : '✗ Formato no reconocido';
    status.style.color  = isValid ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)';
  }
}

// ── Render galería global (página Diagramas) ─────────────────
=======
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
export function renderGlobalDiagramas() {
  const container = document.getElementById('global-diagramas-grid');
  if (!container) return;

  if (!AppState.diagramas.length) {
<<<<<<< HEAD
    container.innerHTML = `
      <div class="diag-empty">
        <div class="diag-empty-icon">🗂️</div>
        <div class="diag-empty-title">Sin diagramas aún</div>
        <div class="diag-empty-sub">Agrega tu primer diagrama usando el botón + Agregar Diagrama</div>
      </div>`;
    return;
  }

  container.innerHTML = AppState.diagramas.map(d => _buildCard(d)).join('');
}

// ── Render tab dentro de detalle de matriz ───────────────────
=======
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

>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
export function renderDiagramasTab() {
  const container = document.getElementById('diagramas-grid');
  if (!container) return;

<<<<<<< HEAD
  const list = AppState.diagramas.filter(
    d => String(d.matrizId) === String(AppState.currentMatrizId)
  );

  if (!list.length) {
    container.innerHTML = `
      <div class="diag-empty" style="grid-column:1/-1">
        <div class="diag-empty-icon">📋</div>
        <div class="diag-empty-title">Sin diagramas para esta matriz</div>
        <div class="diag-empty-sub">Usa el botón + Agregar Diagrama</div>
      </div>`;
    return;
  }

  container.innerHTML = list.map(d => _buildCard(d)).join('');
}

// ── Constructor de tarjeta (con botón Drive) ──────────────────
function _buildCard(d) {
  const hasLink = !!(d.driveLink || d.archivoUrl);
  const linkUrl = toDriveViewUrl(d.driveLink || d.archivoUrl);

  const thumbHTML = hasLink
    ? `<div class="diag-thumb-placeholder diag-thumb-drive">
         <div class="diag-emoji" style="font-size:36px">📁</div>
         <span style="font-size:11px;margin-top:4px;opacity:.8">Abrir en Drive</span>
       </div>`
    : `<div class="diag-thumb-placeholder">
         <div class="diag-emoji">${d.emoji || '📊'}</div>
         <span>${d.categoria || 'Diagrama'}</span>
       </div>`;

  return `
  <div class="diag-card" onclick="abrirDiagrama('${d.id}')">
    <div class="diag-thumb">
      ${thumbHTML}
      <div class="diag-overlay">
        <button class="diag-overlay-btn">${hasLink ? '🔗 Abrir Drive' : '📊 Ver info'}</button>
      </div>
      ${d.categoria ? `<span class="diag-cat-badge">${d.categoria}</span>` : ''}
    </div>
    <div class="diag-body">
      <div class="diag-title">${d.nombre || '(Sin nombre)'}</div>
      <div class="diag-meta">
        <span>📌 ${d.version || 'v1.0'}</span>
        <span>📅 ${d.fecha || '–'}</span>
      </div>
      ${d.desc ? `<div class="diag-desc">${d.desc}</div>` : ''}
    </div>
    <div class="diag-actions" onclick="event.stopPropagation()">
      ${hasLink
        ? `<button class="diag-btn" onclick="window.open('${linkUrl}','_blank','noopener')">🔗 Abrir</button>`
        : `<button class="diag-btn" style="opacity:0.4;cursor:default">Sin link</button>`
      }
      <button class="diag-btn danger" onclick="deleteDiagrama('${d.id}')">✕ Eliminar</button>
    </div>
  </div>`;
}

// ── Abrir diagrama → redirige al Drive ───────────────────────
export function abrirDiagrama(id) {
  const d = AppState.diagramas.find(x => String(x.id) === String(id));
  if (!d) return;

  const linkUrl = toDriveViewUrl(d.driveLink || d.archivoUrl);
  if (linkUrl) {
    window.open(linkUrl, '_blank', 'noopener,noreferrer');
  } else {
    showToast('Este diagrama no tiene link asignado', 'warning');
  }
}

// ── Cerrar lightbox (compatibilidad, ya no se usa) ───────────
export function cerrarLightbox() {}

// ── Guardar diagrama con link de Drive ───────────────────────
export async function saveDiagrama() {
  const nombre = document.getElementById('dNombre')?.value.trim();
  if (!nombre) { showToast('Nombre del diagrama requerido', 'error'); return; }

  const rawLink = document.getElementById('dDriveLink')?.value.trim() || '';
  if (!rawLink) { showToast('El link de Drive es obligatorio', 'error'); return; }

  const driveLink = toDriveViewUrl(rawLink);

  const data = {
    matrizId:  AppState.currentMatrizId || '',
    nombre,
    categoria: document.getElementById('dCategoria')?.value || 'Proceso',
    version:   document.getElementById('dVersion')?.value  || 'v1.0',
    fecha:     new Date().toISOString().split('T')[0],
    desc:      document.getElementById('dDesc')?.value     || '',
    emoji:     document.getElementById('dEmoji')?.value    || '📋',
    driveLink,          // ← campo nuevo
    archivoUrl: driveLink,   // ← compatibilidad con panel ejecutivo
    archivoTipo: 'drive',
=======
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
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
  };

  try {
    await addDoc(collection(db, 'diagramas'), data);
    closeModal('modal-nuevo-diagrama');
<<<<<<< HEAD
    _resetModal();
    showToast('Diagrama guardado ✓', 'success');
  } catch (e) {
    showToast('Error al guardar: ' + e.message, 'error');
  }
}

// ── Reset modal ───────────────────────────────────────────────
function _resetModal() {
  ['dNombre', 'dVersion', 'dDesc', 'dEmoji', 'dDriveLink'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const box = document.getElementById('drive-link-box');
  if (box) box.style.borderColor = '';
  const status = document.getElementById('dDriveLinkStatus');
  if (status) { status.textContent = 'Pega el enlace de Google Drive del diagrama'; status.style.color = ''; }
}

// ── Eliminar diagrama ─────────────────────────────────────────
export async function deleteDiagrama(id) {
  if (!confirm('¿Eliminar este diagrama?')) return;
  try {
    await deleteDoc(doc(db, 'diagramas', String(id)));
    showToast('Diagrama eliminado', 'warning');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Stubs de compatibilidad (ya no necesarios) ───────────────
export function showFileName() {}
export function handleDrop() {}
export function initDragAndDrop() {}
export function descargarDiagrama(id) {
  abrirDiagrama(id); // redirige al Drive en vez de descargar
=======
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
>>>>>>> beab81a8eca86cdb7743cdd1d3c80348902aaf45
}
