// ============================================================
// NEXUS OPS — gestion.js
// Gestión Operativa / Bitácora
// ============================================================

import { db, collection, addDoc } from './firebase.js';
import { AppState } from './state.js';
import { showToast } from './helpers.js';

export function renderGestionGlobal() {
  const container = document.getElementById('gestion-global-registros');
  if (!container) return;

  if (!AppState.gestionGlobal.length) {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-m);font-size:12.5px">Bitácora vacía.</div>`;
    return;
  }

  container.innerHTML = AppState.gestionGlobal.map(g => `
    <div style="padding:12px;background:var(--ivory);border-left:3px solid var(--gold);
      border-radius:var(--radius-s);margin-bottom:10px;position:relative">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-l);margin-bottom:4px">
        <span>${AppState.matrices.find(m => String(m.id) === String(g.matrizId))?.nombre || g.matrizId || 'General'}</span>
        <span style="font-family:'DM Mono'">${g.fecha}</span>
      </div>
      <div style="font-size:13px;color:var(--deep);white-space:pre-wrap">${g.texto || g.titulo || ''}</div>
    </div>`).join('');
}

export function renderGestionRegistros() {
  const container = document.getElementById('gestion-registros');
  if (!container) return;

  const list = AppState.gestionGlobal.filter(g => String(g.matrizId) === String(AppState.currentMatrizId));
  if (!list.length) {
    container.innerHTML = `<p style="font-size:12px;color:var(--text-m)">No hay entradas en la bitácora.</p>`;
    return;
  }

  container.innerHTML = list.map(g => `
    <div style="padding:10px;background:var(--gold-10);border-radius:var(--radius-s);margin-bottom:8px">
      <div style="font-family:'DM Mono';font-size:10px;color:var(--text-l);margin-bottom:2px">${g.fecha}</div>
      <div style="font-size:12.5px;color:var(--deep);line-height:1.5;white-space:pre-wrap">${g.texto || g.titulo || ''}</div>
    </div>`).join('');
}

export async function saveGestion() {
  const editorEl = document.getElementById('gestionEditor');
  const txt = (editorEl ? editorEl.innerText : '').trim();
  if (!txt) return;

  const data = {
    matrizId: AppState.currentMatrizId || "",
    fecha:    new Date().toLocaleString('es-CO'),
    texto:    txt,
    tipo:     'matriz'
  };

  try {
    await addDoc(collection(db, 'gestion'), data);
    if (editorEl) editorEl.innerText = '';
    showToast('Bitácora guardada ✓', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export async function saveGestionGlobal() {
  const editorEl = document.getElementById('gestionGlobalEditor');
  const txt = (editorEl ? editorEl.innerText : '').trim();
  if (!txt) return;

  const matSel  = document.getElementById('gestion-matriz-select');
  const matrizId = matSel?.value || 'General';
  const data = {
    matrizId,
    fecha: new Date().toLocaleString('es-CO'),
    texto: txt,
    tipo:  'global'
  };

  try {
    await addDoc(collection(db, 'gestion'), data);
    if (editorEl) editorEl.innerText = '';
    showToast('Registro global guardado ✓', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Editor de texto enriquecido ──────────────────────────────
export function formatText(cmd) {
  const e = document.getElementById('gestionEditor');
  if (e) { e.focus(); document.execCommand(cmd, false, null); }
}

export function formatTextG(cmd) {
  const e = document.getElementById('gestionGlobalEditor');
  if (e) { e.focus(); document.execCommand(cmd, false, null); }
}

export function insertTemplate(tipo) {
  const e = document.getElementById('gestionEditor');
  if (!e) return;
  const templates = {
    incidente:  '[INCIDENTE]\n• Impacto: \n• Causa Raíz: \n• Solución: ',
    monitoreo:  '[MONITOREO]\n• Sistema: \n• Estado: \n• Observaciones: ',
    validacion: '[VALIDACIÓN]\n• Proceso: \n• Resultado: \n• Observaciones: '
  };
  e.focus();
  document.execCommand('insertText', false, templates[tipo] || templates.incidente);
}

export function insertTemplateG(tipo) {
  const e = document.getElementById('gestionGlobalEditor');
  if (!e) return;
  const templates = {
    monitoreo:  '[MONITOREO GLOBAL]\n• Sistema: \n• Estado: \n• Observaciones: ',
    validacion: '[VALIDACIÓN GLOBAL]\n• Proceso: \n• Resultado: \n• Observaciones: ',
    incidente:  '[INCIDENTE GLOBAL]\n• Impacto: \n• Causa Raíz: \n• Solución: '
  };
  e.focus();
  document.execCommand('insertText', false, templates[tipo] || templates.monitoreo);
}
