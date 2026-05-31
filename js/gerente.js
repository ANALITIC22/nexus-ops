/* ============================================================
   gerente.js — Funcionalidad del Rol Gerente
   Incluye: renderGMMatrices, openGMDetalle, modales CRUD,
            comentarios, renderGMObjetivos, renderGMTareas,
            renderGMComentarios, renderGMDetalle
   Corresponde a: pages/gm-matrices.html · pages/gm-detalle.html
                  pages/gm-objetivos.html · pages/gm-tareas.html
============================================================ */
import { S, db, collection, addDoc, doc, serverTimestamp } from './firebase.js';
import {
  estadoBadge, prioridadBadge, fmtDate, matrizName
} from './helpers.js';

// ── Variables de estado del modal ────────────────────────────
let _gmCurrentType = null;
let _gmCurrentMode = null;
let _gmCurrentId   = null;

// ── RENDER MATRICES (vista gerente) ──────────────────────────
export function renderGMMatrices() {
  const el = document.getElementById('gmMatricesGrid');
  if (!el) return;
  if (!S.matrices.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◈</div><div class="empty-title">Sin matrices</div><div class="empty-text">Crea tu primera matriz operativa</div></div>`;
    return;
  }
  el.innerHTML = S.matrices.map(m => {
    const safeNombre = (m.nombre || '').replace(/'/g, "\\'");
    const objM = S.objetivos.filter(o => String(o.matrizId) === String(m.id));
    const tarM = S.tareas.filter(t => String(t.matrizId) === String(m.id));
    return `
    <div class="matrix-exec-card" style="padding:0;overflow:hidden">
      <div class="matrix-exec-header" style="padding:18px 20px;background:linear-gradient(135deg,var(--deep),#2B5980);cursor:pointer"
        onclick="openGMDetalle('${m.id}')">
        <div style="font-size:28px;margin-bottom:6px">${m.icono || '◈'}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--cream)">${m.nombre}</div>
        <div style="font-size:10px;color:rgba(214,232,245,0.5);margin-top:2px">${m.tipo || '–'} · ${m.area || '–'}</div>
        <div style="margin-top:10px;display:flex;gap:10px">
          <div style="text-align:center;padding:6px 10px;background:rgba(107,158,196,0.07);border-radius:6px">
            <div style="font-size:16px;font-weight:700;color:var(--cream)">${objM.length}</div>
            <div style="font-size:9px;color:rgba(214,232,245,0.5);text-transform:uppercase">Objetivos</div>
          </div>
          <div style="text-align:center;padding:6px 10px;background:rgba(107,158,196,0.07);border-radius:6px">
            <div style="font-size:16px;font-weight:700;color:var(--cream)">${tarM.length}</div>
            <div style="font-size:9px;color:rgba(214,232,245,0.5);text-transform:uppercase">Tareas</div>
          </div>
        </div>
        <div style="margin-top:8px;font-size:10px;color:rgba(107,158,196,0.5)">Clic para gestionar contenido →</div>
      </div>
      <div style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
        <div>${estadoBadge(m.estado)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:5px 10px;font-size:11px"
            onclick="event.stopPropagation();openGMModal('matriz','editar','${m.id}')">✎ Editar</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:5px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="event.stopPropagation();deleteGMItem('matriz','${m.id}','${safeNombre}')">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── GERENTE: ABRIR DETALLE MATRIZ ────────────────────────────
window.openGMDetalle = function (matrizId) {
  if (!window.isGerente()) return;
  window._gmDetalleMatrizId = matrizId;
  const m = S.matrices.find(x => x.id === matrizId);
  if (!m) return;
  document.getElementById('gmDetalleIcon').textContent   = m.icono || '◈';
  document.getElementById('gmDetalleTitulo').textContent = m.nombre || '–';
  document.getElementById('gmDetalleSub').textContent    = (m.tipo || '–') + ' · ' + (m.area || '–') + ' · ' + (m.responsable || '–');
  document.querySelectorAll('#gmDetalleTabs .tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('#page-gm-detalle .tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));
  window.navTo('gm-detalle', null);
};

window.switchGMDetalleTab = function (tabId, btn) {
  document.querySelectorAll('#gmDetalleTabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-gm-detalle .tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
  if (tabId === 'gmd-comentarios') {
    const m = S.matrices.find(x => String(x.id) === String(window._gmDetalleMatrizId));
    if (m) renderGMDetalleComments(m);
  }
};

// ── RENDER DETALLE DE MATRIZ (gerente) ────────────────────────
export function renderGMDetalle(matrizId) {
  if (!matrizId) return;
  renderGMDetalleObjetivos(matrizId);
  renderGMDetalleTareas(matrizId);
}

function renderGMDetalleObjetivos(matrizId) {
  const tb = document.getElementById('gmDetalleObjetivosTable');
  if (!tb) return;
  const objs = S.objetivos.filter(o => String(o.matrizId) === String(matrizId));
  if (!objs.length) {
    tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-m)">Sin objetivos. Presiona '+ Nuevo Objetivo' para agregar uno.</td></tr>`;
    return;
  }
  tb.innerHTML = objs.map(o => `
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${o.titulo || '–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:180px">${(o.descripcion || '').substring(0, 60)}${(o.descripcion || '').length > 60 ? '…' : ''}</td>
      <td>${prioridadBadge(o.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(o.fechaLimite)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:160px">${(o.observaciones || '–').substring(0, 50)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('objetivo','editar','${o.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('objetivo','${o.id}','${(o.titulo || '').replace(/'/g, "\\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderGMDetalleTareas(matrizId) {
  const tb = document.getElementById('gmDetalleTareasTable');
  if (!tb) return;
  const tareas = S.tareas.filter(t => String(t.matrizId) === String(matrizId) && !t.esPeticion);
  if (!tareas.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-m)">Sin tareas. Presiona '+ Nueva Tarea' para agregar una.</td></tr>`;
    return;
  }
  tb.innerHTML = tareas.map(t => `
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${t.titulo || '–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:150px">${(t.descripcion || '').substring(0, 50)}${(t.descripcion || '').length > 50 ? '…' : ''}</td>
      <td style="font-size:12px">${t.responsable || '–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(t.fechaLimite || t.fecha)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:140px">${(t.observaciones || '–').substring(0, 40)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('tarea','editar','${t.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('tarea','${t.id}','${(t.titulo || '').replace(/'/g, "\\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── GERENTE: COMENTARIOS DE DETALLE ──────────────────────────
function renderGMDetalleComments(m) {
  const el = document.getElementById('gmDetalleCommentSection');
  if (!el) return;
  const safeNombre = (m.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div>
          <div class="card-title">Comentarios sobre esta Matriz</div>
          <div style="font-size:11px;color:var(--text-m);margin-top:2px">
            Sus comentarios serán enviados directamente al administrador
          </div>
        </div>
        <span class="badge badge-gold">🔒 Solo Admin</span>
      </div>

      <div style="background:var(--gold-05);border:1px solid var(--border-g);border-radius:var(--radius-s);
        padding:14px 16px;margin-bottom:18px;display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:18px">🔒</span>
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--deep);margin-bottom:3px">Privacidad de comentarios</div>
          <div style="font-size:12px;color:var(--text-m);line-height:1.6">
            Los comentarios que envíe sobre esta matriz son <strong>confidenciales</strong>.
            Solo el administrador puede visualizarlos. No se mostrarán aquí una vez enviados.
          </div>
        </div>
      </div>

      <div id="gmDetalleCommentSuccess" style="display:none;background:var(--green-bg);border:1px solid rgba(46,125,82,0.25);
        border-radius:var(--radius-s);padding:12px 16px;margin-bottom:14px;
        font-size:13px;color:var(--green);align-items:center;gap:8px">
        ✅ <span>Comentario enviado correctamente al administrador.</span>
      </div>

      <label class="modal-label" style="margin-bottom:6px;display:block">Su comentario</label>
      <textarea class="compose-textarea" id="gmDetalleCommentText"
        placeholder="Escriba su observación sobre ${m.nombre}..."></textarea>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;flex-wrap:wrap">
        <select id="gmDetalleCommentType" class="compose-type-select">
          <option value="general">💬 General</option>
          <option value="aprobado">✅ Aprobado</option>
          <option value="observacion">⚠️ Observación</option>
          <option value="urgente">🔴 Urgente</option>
        </select>
        <button class="btn-comment" id="btnGMDetalleComment"
          onclick="postGMDetalleComment('${m.id}','${safeNombre}')">
          Enviar Comentario
        </button>
      </div>
    </div>`;
}

window.postGMDetalleComment = async function (matrizId, matrizNombre) {
  const txt  = document.getElementById('gmDetalleCommentText')?.value?.trim();
  const tipo = document.getElementById('gmDetalleCommentType')?.value || 'general';
  if (!txt) return;
  const btn = document.getElementById('btnGMDetalleComment');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
  try {
    await addDoc(collection(db, 'comments'), {
      author: 'Gerente', initials: 'GR', role: 'Gerente',
      text: txt, type: tipo,
      sectionRef: matrizId, sectionName: matrizNombre,
      soloAdmin: true,
      createdAt: serverTimestamp(), ts: new Date().toISOString()
    });
    const ta = document.getElementById('gmDetalleCommentText');
    if (ta) ta.value = '';
    const success = document.getElementById('gmDetalleCommentSuccess');
    if (success) { success.style.display = 'flex'; setTimeout(() => { success.style.display = 'none'; }, 4000); }
  } catch (e) { console.error(e); }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar Comentario'; }
  }
};

// ── GERENTE: RENDER OBJETIVOS (página global) ─────────────────
export function renderGMObjetivos() {
  const tb = document.getElementById('gmObjetivosTable');
  if (!tb) return;
  if (!S.objetivos.length) {
    tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-m)">Sin objetivos registrados</td></tr>`;
    return;
  }
  tb.innerHTML = S.objetivos.map(o => `
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${o.titulo || '–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:180px">${(o.descripcion || '').substring(0, 60)}${(o.descripcion || '').length > 60 ? '…' : ''}</td>
      <td>${prioridadBadge(o.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(o.fechaLimite)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:160px">${(o.observaciones || '–').substring(0, 50)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('objetivo','editar','${o.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('objetivo','${o.id}','${(o.titulo || '').replace(/'/g, "\\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── GERENTE: RENDER TAREAS (página global) ────────────────────
export function renderGMTareas() {
  const tb = document.getElementById('gmTareasTable');
  if (!tb) return;
  if (!S.tareas.length) {
    tb.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-m)">Sin tareas registradas</td></tr>`;
    return;
  }
  tb.innerHTML = S.tareas.map(t => `
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${t.titulo || '–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:150px">${(t.descripcion || '').substring(0, 50)}${(t.descripcion || '').length > 50 ? '…' : ''}</td>
      <td style="font-size:12px">${t.responsable || '–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(t.fechaLimite || t.fecha)}</td>
      <td style="font-size:12px;color:var(--text-m)">${matrizName(t.matrizId)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:140px">${(t.observaciones || '–').substring(0, 40)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('tarea','editar','${t.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('tarea','${t.id}','${(t.titulo || '').replace(/'/g, "\\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── GERENTE: RENDER COMENTARIOS (página global) ───────────────
export function renderGMComentarios() {
  const el = document.getElementById('gmComentariosWrap');
  if (!el) return;

  const allComments = [];
  S.matrices.forEach(m => {
    if (m.comments && Array.isArray(m.comments)) {
      m.comments.forEach(c => allComments.push({ ...c, matrizNombre: m.nombre }));
    }
  });
  if (S.comments && S.comments.length) {
    S.comments.forEach(c => {
      allComments.push({ ...c, matrizNombre: matrizName(c.matrizId) });
    });
  }

  if (!allComments.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">Sin comentarios aún</div>
      <div class="empty-text">Los comentarios enviados desde las matrices aparecerán aquí</div></div>`;
    return;
  }

  allComments.sort((a, b) => new Date(b.ts || b.fecha || 0) - new Date(a.ts || a.fecha || 0));

  el.innerHTML = allComments.map(c => {
    const typeMap = {
      aprobado: 'type-aprobado', observacion: 'type-observacion',
      urgente: 'type-urgente', general: 'type-general'
    };
    const cls  = typeMap[c.tipo?.toLowerCase()] || 'type-general';
    const init = (c.autor || c.nombre || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return `
    <div class="comment-card ${cls}" style="margin-bottom:14px">
      <div class="comment-header">
        <div class="comment-avatar">${init}</div>
        <div>
          <div class="comment-author">${c.autor || c.nombre || 'Anónimo'}</div>
          <div class="comment-role">${c.cargo || c.rol || 'Usuario'}</div>
        </div>
        <div class="comment-meta">
          <span class="badge badge-gold" style="font-size:9px">${c.matrizNombre || 'General'}</span>
          <span class="comment-time">${fmtDate(c.ts || c.fecha)}</span>
        </div>
      </div>
      <div class="comment-body">${c.texto || c.mensaje || c.contenido || '–'}</div>
      ${c.tipo ? `<div class="comment-section-ref"><span class="comment-ref-badge">${c.tipo}</span></div>` : ''}
    </div>`;
  }).join('');
}

// ── GERENTE: MODAL OPEN ───────────────────────────────────────
window.openGMModal = function (type, mode, id = null) {
  if (!window.isGerente()) return;
  _gmCurrentType = type;
  _gmCurrentMode = mode;
  _gmCurrentId   = id;

  const overlay = document.getElementById('modalGerenteOverlay');
  const titleEl = document.getElementById('gmModalTitle');
  const bodyEl  = document.getElementById('gmModalBody');

  const icons = { matriz: '◈', objetivo: '◎', tarea: '☑' };
  const names = { matriz: 'Matriz', objetivo: 'Objetivo', tarea: 'Tarea' };
  titleEl.innerHTML = `${icons[type] || '+'} ${mode === 'crear' ? 'Nueva' : 'Editar'} ${names[type] || type}`;

  let existing = null;
  if (mode === 'editar' && id) {
    if (type === 'matriz')   existing = S.matrices.find(x => x.id === id);
    if (type === 'objetivo') existing = S.objetivos.find(x => x.id === id);
    if (type === 'tarea')    existing = S.tareas.find(x => x.id === id);
  }
  const v = (field, fallback = '') => existing?.[field] ?? fallback;

  if (type === 'matriz') {
    bodyEl.innerHTML = `
      <div class="gm-info-note">ℹ️ Como Gerente puedes crear y editar matrices. El estado, criticidad y avance se configuran desde el Panel Administrador.</div>
      <div class="gm-field"><label class="gm-label">Nombre <span class="gm-required">*</span></label>
        <input class="gm-input" id="gmf-nombre" placeholder="Nombre de la matriz" value="${v('nombre')}"></div>
      <div class="gm-grid-2">
        <div class="gm-field"><label class="gm-label">Tipo</label>
          <input class="gm-input" id="gmf-tipo" placeholder="Ej: Operativo, Estratégico" value="${v('tipo')}"></div>
        <div class="gm-field"><label class="gm-label">Área</label>
          <input class="gm-input" id="gmf-area" placeholder="Ej: TI, RRHH" value="${v('area')}"></div>
      </div>
      <div class="gm-field"><label class="gm-label">Responsable</label>
        <input class="gm-input" id="gmf-responsable" placeholder="Nombre del responsable" value="${v('responsable')}"></div>
      <div class="gm-field"><label class="gm-label">Descripción</label>
        <textarea class="gm-textarea" id="gmf-descripcion" placeholder="Descripción de la matriz...">${v('descripcion')}</textarea></div>
      <div class="gm-field"><label class="gm-label">Icono (emoji)</label>
        <input class="gm-input" id="gmf-icono" placeholder="◈" value="${v('icono', '◈')}" style="max-width:100px;font-size:20px"></div>`;

  } else if (type === 'objetivo') {
    bodyEl.innerHTML = `
      <div class="gm-info-note">ℹ️ La prioridad, estado y avance serán configurados por el administrador. Aquí defines el contenido del objetivo.</div>
      <div class="gm-field"><label class="gm-label">Título <span class="gm-required">*</span></label>
        <input class="gm-input" id="gmf-titulo" placeholder="Título del objetivo" value="${v('titulo')}"></div>
      <div class="gm-field"><label class="gm-label">Descripción</label>
        <textarea class="gm-textarea" id="gmf-descripcion" placeholder="Descripción detallada del objetivo...">${v('descripcion')}</textarea></div>
      <div class="gm-grid-2">
        <div class="gm-field"><label class="gm-label">Prioridad</label>
          <select class="gm-select" id="gmf-prioridad">
            ${['Alta', 'Media', 'Baja'].map(p => `<option value="${p}" ${v('prioridad') === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></div>
        <div class="gm-field"><label class="gm-label">Fecha Límite</label>
          <input class="gm-input" id="gmf-fechaLimite" type="date" value="${v('fechaLimite')}"></div>
      </div>
      <div class="gm-field"><label class="gm-label">Observaciones</label>
        <textarea class="gm-textarea" id="gmf-observaciones" placeholder="Observaciones o notas adicionales...">${v('observaciones')}</textarea></div>`;

  } else if (type === 'tarea') {
    const matrizOpts = S.matrices.map(m => `<option value="${m.id}" ${v('matrizId') === m.id ? 'selected' : ''}>${m.nombre}</option>`).join('');
    bodyEl.innerHTML = `
      <div class="gm-info-note">ℹ️ El estado y avance serán configurados por el administrador. La tarea se asociará a la matriz seleccionada.</div>
      <div class="gm-field"><label class="gm-label">Título <span class="gm-required">*</span></label>
        <input class="gm-input" id="gmf-titulo" placeholder="Título de la tarea" value="${v('titulo')}"></div>
      <div class="gm-field"><label class="gm-label">Descripción</label>
        <textarea class="gm-textarea" id="gmf-descripcion" placeholder="Descripción de la tarea...">${v('descripcion')}</textarea></div>
      <div class="gm-grid-2">
        <div class="gm-field"><label class="gm-label">Responsable</label>
          <input class="gm-input" id="gmf-responsable" placeholder="Nombre del responsable" value="${v('responsable')}"></div>
        <div class="gm-field"><label class="gm-label">Prioridad</label>
          <select class="gm-select" id="gmf-prioridad">
            ${['Alta', 'Media', 'Baja'].map(p => `<option value="${p}" ${v('prioridad') === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></div>
      </div>
      <div class="gm-grid-2">
        <div class="gm-field"><label class="gm-label">Fecha Límite</label>
          <input class="gm-input" id="gmf-fechaLimite" type="date" value="${v('fechaLimite') || v('fecha')}"></div>
        <div class="gm-field"><label class="gm-label">Matriz <span class="gm-required">*</span></label>
          <select class="gm-select" id="gmf-matrizId">${matrizOpts || '<option value="">Sin matrices</option>'}</select></div>
      </div>
      <div class="gm-field"><label class="gm-label">Observaciones</label>
        <textarea class="gm-textarea" id="gmf-observaciones" placeholder="Observaciones adicionales...">${v('observaciones')}</textarea></div>`;
  }

  overlay.classList.add('open');
};

window.closeGMModal = function () {
  document.getElementById('modalGerenteOverlay').classList.remove('open');
};

// shortcut para abrir modal desde detalle con matriz pre-seleccionada
window.openGMModalDetalle = function (type, mode) {
  if (!window.isGerente()) return;
  openGMModal(type, mode);
  if (window._gmDetalleMatrizId) {
    setTimeout(() => {
      const sel = document.getElementById('gmf-matrizId');
      if (sel) sel.value = window._gmDetalleMatrizId;
      if (type === 'objetivo') window._gmModalPreMatrizId = window._gmDetalleMatrizId;
    }, 60);
  }
};

// ── GERENTE: SAVE ─────────────────────────────────────────────
window.saveGMModal = async function () {
  if (!window.isGerente()) return;
  const btn = document.getElementById('gmSaveBtn');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    const gv = id => document.getElementById('gmf-' + id)?.value?.trim() || '';
    let data = {};
    let collName = '';

    if (_gmCurrentType === 'matriz') {
      const nombre = gv('nombre');
      if (!nombre) { alert('El nombre es obligatorio'); btn.disabled = false; btn.textContent = 'Guardar'; return; }
      collName = 'matrices';
      data = {
        nombre, tipo: gv('tipo'), area: gv('area'),
        responsable: gv('responsable'), descripcion: gv('descripcion'),
        icono: gv('icono') || '◈',
        estado: _gmCurrentMode === 'crear' ? 'Pendiente' : undefined,
        creadoPorGerente: true, ts: new Date().toISOString()
      };

    } else if (_gmCurrentType === 'objetivo') {
      const titulo = gv('titulo');
      if (!titulo) { alert('El título es obligatorio'); btn.disabled = false; btn.textContent = 'Guardar'; return; }
      collName = 'objetivos';
      const objMatrizId     = window._gmModalPreMatrizId || window._gmDetalleMatrizId || '';
      const objMatrizNombre = S.matrices.find(m => m.id === objMatrizId)?.nombre || '';
      data = {
        titulo, descripcion: gv('descripcion'),
        prioridad: gv('prioridad') || 'Media',
        fechaLimite: gv('fechaLimite'),
        observaciones: gv('observaciones'),
        matrizId: objMatrizId, matrizNombre: objMatrizNombre,
        estado: _gmCurrentMode === 'crear' ? 'Pendiente' : undefined,
        avance: _gmCurrentMode === 'crear' ? 0 : undefined,
        creadoPorGerente: true, ts: new Date().toISOString()
      };
      window._gmModalPreMatrizId = null;

    } else if (_gmCurrentType === 'tarea') {
      const titulo   = gv('titulo');
      const matrizId = gv('matrizId');
      if (!titulo) { alert('El título es obligatorio'); btn.disabled = false; btn.textContent = 'Guardar'; return; }
      collName = 'tareas';
      const matrizNombreVal = S.matrices.find(m => m.id === matrizId)?.nombre || '';
      data = {
        titulo, descripcion: gv('descripcion'),
        responsable: gv('responsable'),
        prioridad: gv('prioridad') || 'Media',
        fechaLimite: gv('fechaLimite'),
        fecha: gv('fechaLimite'),
        matrizId, matrizNombre: matrizNombreVal,
        observaciones: gv('observaciones'),
        estado: _gmCurrentMode === 'crear' ? 'Pendiente' : undefined,
        avance: _gmCurrentMode === 'crear' ? 0 : undefined,
        esPeticion: false, creadoPorGerente: true,
        ts: new Date().toISOString()
      };
    }

    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    data.updatedAt = serverTimestamp();

    if (_gmCurrentMode === 'crear') {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, collName), data);
    } else {
      const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      await updateDoc(doc(db, collName, _gmCurrentId), data);
    }

    closeGMModal();
  } catch (e) {
    console.error('Error guardando:', e);
    alert('Error al guardar. Revisa la consola.');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
};

// ── GERENTE: DELETE ───────────────────────────────────────────
window.deleteGMItem = async function (type, id, nombre) {
  if (!window.isGerente()) return;
  if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const collMap = { matriz: 'matrices', objetivo: 'objetivos', tarea: 'tareas' };
  try {
    const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await deleteDoc(doc(db, collMap[type], id));
  } catch (e) {
    console.error('Error eliminando:', e);
    alert('Error al eliminar.');
  }
};
