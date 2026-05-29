// ============================================================
// NEXUS OPS — gestion.js  (v2 — diseño mejorado)
// ============================================================

import { db, collection, addDoc } from './firebase.js';
import { AppState } from './state.js';
import { showToast } from './helpers.js';

// ── Detectar tipo a partir del texto ─────────────────────────
function _detectTipo(txt) {
  const t = (txt || '').toLowerCase();
  if (t.includes('[incidente]') || t.includes('incidente')) return 'incidente';
  if (t.includes('[monitoreo]') || t.includes('monitoreo'))  return 'monitoreo';
  if (t.includes('[validaci'))                                return 'validacion';
  return 'default';
}

const TIPO_META = {
  incidente:  { label: '⚠ Incidente',  color: 'rgba(139,46,46,.12)',   text: '#8B2E2E', accent: '#8B2E2E' },
  monitoreo:  { label: '📋 Monitoreo',  color: 'rgba(74,124,89,.12)',   text: '#4A7C59', accent: '#4A7C59' },
  validacion: { label: '✓ Validación', color: 'rgba(90,123,175,.12)',  text: '#5A7BAF', accent: '#5A7BAF' },
  global:     { label: '🌐 Global',     color: 'rgba(211,171,128,.12)', text: 'var(--gold)', accent: 'var(--gold)' },
  default:    { label: '📝 Registro',   color: 'var(--deep-15)',        text: 'var(--deep)', accent: 'var(--deep)' },
};

function _matrizName(id) {
  return AppState.matrices?.find(m => String(m.id) === String(id))?.nombre || id || 'General';
}

// ── Construir tarjeta de registro ─────────────────────────────
function _buildAdminCard(g, showMatrix = true) {
  const tipo  = g.tipo === 'global' ? 'global' : _detectTipo(g.texto || g.contenido || '');
  const meta  = TIPO_META[tipo] || TIPO_META.default;
  const txt   = (g.texto || g.contenido || '–').replace(/\[.*?\]/g, '').trim();
  const title = (g.texto || '').split('\n')[0].replace(/\[.*?\]/g, '').trim().slice(0, 70) || 'Registro operativo';

  const matrixTag = showMatrix && g.matrizId && g.matrizId !== 'General'
    ? `<span style="font-size:10px;background:var(--deep-15);color:var(--deep);padding:2px 7px;border-radius:20px;font-family:'DM Mono',monospace">${_matrizName(g.matrizId)}</span>` : '';

  return `
  <div style="display:flex;border:1px solid var(--border);border-radius:var(--radius-m);overflow:hidden;margin-bottom:10px;transition:box-shadow .2s,border-color .2s"
       onmouseover="this.style.boxShadow='0 3px 14px rgba(71,40,37,.07)';this.style.borderColor='var(--border-g)'"
       onmouseout="this.style.boxShadow='';this.style.borderColor='var(--border)'">
    <div style="width:4px;flex-shrink:0;background:${meta.accent}"></div>
    <div style="flex:1;padding:12px 14px;background:var(--bg-card)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:20px;font-family:'DM Mono',monospace;background:${meta.color};color:${meta.text}">${meta.label}</span>
        ${matrixTag}
        <span style="margin-left:auto;font-size:10px;font-family:'DM Mono',monospace;color:var(--text-l);white-space:nowrap">${g.fecha || '–'}</span>
      </div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:var(--deep);margin-bottom:5px">${title}</div>
      <div style="font-size:12px;color:var(--text-b);line-height:1.7;white-space:pre-wrap">${txt}</div>
    </div>
  </div>`;
}

// ── Render bitácora global (página admin Gestión) ─────────────
export function renderGestionGlobal() {
  const container = document.getElementById('gestion-global-registros');
  if (!container) return;

  // Stats
  const statsEl = document.getElementById('gestion-admin-stats');
  if (statsEl && AppState.gestionGlobal.length) {
    const tipos = AppState.gestionGlobal.reduce((acc, g) => {
      const t = g.tipo === 'global' ? 'global' : _detectTipo(g.texto || g.contenido);
      acc[t] = (acc[t] || 0) + 1; return acc;
    }, {});
    const mats = new Set(AppState.gestionGlobal.map(g => g.matrizId)).size;
    statsEl.innerHTML = `
      <div style="flex:1;min-width:80px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-m);padding:12px 14px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:var(--deep);font-family:'Cormorant Garamond',serif">${AppState.gestionGlobal.length}</div>
        <div style="font-size:10px;color:var(--text-m);text-transform:uppercase;letter-spacing:.06em">Total</div>
      </div>
      <div style="flex:1;min-width:80px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-m);padding:12px 14px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:var(--deep);font-family:'Cormorant Garamond',serif">${mats}</div>
        <div style="font-size:10px;color:var(--text-m);text-transform:uppercase;letter-spacing:.06em">Matrices</div>
      </div>
      ${tipos.incidente ? `<div style="flex:1;min-width:80px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-m);padding:12px 14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#8B2E2E;font-family:'Cormorant Garamond',serif">${tipos.incidente}</div><div style="font-size:10px;color:var(--text-m);text-transform:uppercase;letter-spacing:.06em">Incidentes</div></div>` : ''}
      ${tipos.monitoreo ? `<div style="flex:1;min-width:80px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-m);padding:12px 14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#4A7C59;font-family:'Cormorant Garamond',serif">${tipos.monitoreo}</div><div style="font-size:10px;color:var(--text-m);text-transform:uppercase;letter-spacing:.06em">Monitoreos</div></div>` : ''}
      ${tipos.validacion ? `<div style="flex:1;min-width:80px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-m);padding:12px 14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#5A7BAF;font-family:'Cormorant Garamond',serif">${tipos.validacion}</div><div style="font-size:10px;color:var(--text-m);text-transform:uppercase;letter-spacing:.06em">Validaciones</div></div>` : ''}`;
  }

  if (!AppState.gestionGlobal.length) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-m);font-size:12.5px">
      <div style="font-size:36px;margin-bottom:8px">📋</div>
      <div>Bitácora vacía. Crea el primer registro.</div>
    </div>`;
    return;
  }

  // Filtro por tipo
  const tipoFiltro = document.getElementById('gestion-filter-tipo')?.value || 'all';
  let list = [...AppState.gestionGlobal].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (tipoFiltro !== 'all') {
    list = list.filter(g => {
      const t = g.tipo === 'global' ? 'global' : _detectTipo(g.texto || g.contenido);
      return t === tipoFiltro;
    });
  }

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-m);font-size:12px">Sin registros de este tipo</div>`;
    return;
  }

  container.innerHTML = `<div style="padding:4px 0">${list.map(g => _buildAdminCard(g, true)).join('')}</div>`;
}

// ── Render bitácora en tab de detalle-matriz ──────────────────
export function renderGestionRegistros() {
  const container = document.getElementById('gestion-registros');
  if (!container) return;

  const list = AppState.gestionGlobal.filter(
    g => String(g.matrizId) === String(AppState.currentMatrizId)
  );

  // Contador
  const countEl = document.getElementById('gestion-registros-count');
  if (countEl) countEl.textContent = list.length ? `${list.length} registro${list.length !== 1 ? 's' : ''}` : '';

  if (!list.length) {
    container.innerHTML = `<p style="font-size:12px;color:var(--text-m);text-align:center;padding:20px">No hay entradas en la bitácora.</p>`;
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  container.innerHTML = sorted.map(g => _buildAdminCard(g, false)).join('');
}

// ── Guardar registro (desde tab detalle-matriz) ───────────────
export async function saveGestion() {
  const editorEl = document.getElementById('gestionEditor');
  const txt = (editorEl ? editorEl.innerText : '').trim();
  if (!txt) { showToast('Escribe algo antes de guardar', 'warning'); return; }

  // Tipo seleccionado por chips
  const tipoBtn = document.querySelector('#tab-gestion .gest-admin-tipo-btn.active');
  const tipoSel = tipoBtn?.dataset.tipo || 'general';

  // Prefijar si no tiene ya un tipo en el texto
  const tipoMap = { monitoreo: '[MONITOREO]', validacion: '[VALIDACIÓN]', incidente: '[INCIDENTE]' };
  const prefix = tipoMap[tipoSel] || '';
  const textoFinal = (prefix && !txt.includes('[')) ? `${prefix}\n${txt}` : txt;

  const data = {
    matrizId: AppState.currentMatrizId || '',
    fecha:    new Date().toLocaleString('es-CO'),
    texto:    textoFinal,
    tipo:     tipoSel === 'general' ? 'matriz' : tipoSel,
  };

  try {
    await addDoc(collection(db, 'gestion'), data);
    if (editorEl) editorEl.innerText = '';
    // Reset chips
    document.querySelectorAll('#tab-gestion .gest-admin-tipo-btn').forEach(b => b.classList.remove('active'));
    const defBtn = document.querySelector('#tab-gestion .gest-admin-tipo-btn[data-tipo="general"]');
    if (defBtn) defBtn.classList.add('active');
    showToast('Bitácora guardada ✓', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Guardar registro global ───────────────────────────────────
export async function saveGestionGlobal() {
  const editorEl = document.getElementById('gestionGlobalEditor');
  const txt = (editorEl ? editorEl.innerText : '').trim();
  if (!txt) { showToast('Escribe algo antes de guardar', 'warning'); return; }

  const matSel   = document.getElementById('gestion-matriz-select');
  const matrizId = matSel?.value || 'General';

  const tipoBtn = document.querySelector('#page-gestion .gest-admin-tipo-btn.active');
  const tipoSel = tipoBtn?.dataset.tipo || 'general';
  const tipoMap = { monitoreo: '[MONITOREO]', validacion: '[VALIDACIÓN]', incidente: '[INCIDENTE]' };
  const prefix  = tipoMap[tipoSel] || '';
  const textoFinal = (prefix && !txt.includes('[')) ? `${prefix}\n${txt}` : txt;

  const data = {
    matrizId,
    fecha:  new Date().toLocaleString('es-CO'),
    texto:  textoFinal,
    tipo:   tipoSel === 'general' ? 'global' : tipoSel,
  };

  try {
    await addDoc(collection(db, 'gestion'), data);
    if (editorEl) editorEl.innerText = '';
    document.querySelectorAll('#page-gestion .gest-admin-tipo-btn').forEach(b => b.classList.remove('active'));
    const defBtn = document.querySelector('#page-gestion .gest-admin-tipo-btn[data-tipo="general"]');
    if (defBtn) defBtn.classList.add('active');
    showToast('Registro global guardado ✓', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Limpiar editor global ─────────────────────────────────────
export function clearGestionEditor() {
  const e = document.getElementById('gestionGlobalEditor');
  if (e) e.innerText = '';
}

// ── Selección de tipo por chips ───────────────────────────────
export function selectTipoAdmin(btn, editorId) {
  const parent = btn.closest('div');
  parent.querySelectorAll('.gest-admin-tipo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Auto-insertar plantilla según tipo si el editor está vacío
  const targetEditor = editorId || btn.dataset.editorId;
  const ed = targetEditor ? document.getElementById(targetEditor) : null;
  if (ed && !ed.innerText.trim()) {
    const tipo = btn.dataset.tipo;
    const templates = {
      monitoreo:  '[MONITOREO]\n• Sistema: \n• Estado: \n• Observaciones: ',
      validacion: '[VALIDACIÓN]\n• Proceso: \n• Resultado: \n• Observaciones: ',
      incidente:  '[INCIDENTE]\n• Impacto: \n• Causa Raíz: \n• Solución: ',
    };
    if (templates[tipo]) { ed.focus(); document.execCommand('insertText', false, templates[tipo]); }
  }
}

// ── Editor de texto enriquecido ───────────────────────────────
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
    validacion: '[VALIDACIÓN]\n• Proceso: \n• Resultado: \n• Observaciones: ',
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
    incidente:  '[INCIDENTE GLOBAL]\n• Impacto: \n• Causa Raíz: \n• Solución: ',
  };
  e.focus();
  document.execCommand('insertText', false, templates[tipo] || templates.monitoreo);
}
