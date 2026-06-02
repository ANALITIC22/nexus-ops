// ============================================================
// NEXUS OPS — peticiones.js
// Render, filtrado y respuesta (aceptar/denegar) de peticiones
// del Panel Ejecutivo en el Panel Administrador
// ============================================================

import { db, doc, updateDoc } from './firebase.js';
import { AppState }           from './state.js';
import { prioridadBadge, showToast } from './helpers.js';

// Filtro activo: 'pendiente' por defecto
let _filtroActivo = 'pendiente';

// ── Render principal ─────────────────────────────────────────

function _misIds() {
  const s = (typeof AppState !== 'undefined') && AppState.adminSession;
  if (!s) return new Set(AppState.matrices.map(m => m.id));
  if (s.isSuperAdmin) return new Set(AppState.matrices.map(m => m.id));
  return new Set(AppState.matrices.filter(m => m.creadoPor === s.uid).map(m => m.id));
}
export function renderPeticiones(filtro) {
  if (filtro !== undefined) _filtroActivo = filtro;

  const _ids  = _misIds();
  const todas = AppState.tareas.filter(t => t.esPeticion === true && _ids.has(String(t.matrizId)));

  // ── Contadores en las tarjetas stat ──────────────────────
  const cnt = { todas: todas.length, pendiente: 0, aceptada: 0, denegada: 0 };
  todas.forEach(p => {
    const est = (p.peticionEstado || 'pendiente').toLowerCase();
    if (cnt[est] !== undefined) cnt[est]++;
  });
  const ids = {
    todas:     'pet-count-todas',
    pendiente: 'pet-count-pendiente',
    aceptada:  'pet-count-aceptada',
    denegada:  'pet-count-denegada'
  };
  Object.entries(ids).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = cnt[k];
  });

  // ── Badge rojo del sidebar ────────────────────────────────
  updatePeticionesBadge(cnt.pendiente);

  // ── Lista filtrada ────────────────────────────────────────
  const lista = _filtroActivo === 'todas'
    ? todas
    : todas.filter(p => (p.peticionEstado || 'pendiente').toLowerCase() === _filtroActivo);

  const container = document.getElementById('peticiones-list');
  if (!container) return;

  if (!lista.length) {
    const vacíos = {
      todas:     { icon: '📋', txt: 'No hay peticiones registradas.' },
      pendiente: { icon: '🕐', txt: 'No hay peticiones pendientes.' },
      aceptada:  { icon: '✅', txt: 'No hay peticiones aceptadas.' },
      denegada:  { icon: '❌', txt: 'No hay peticiones denegadas.' }
    };
    const v = vacíos[_filtroActivo] || vacíos.todas;
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-m)">
        <div style="font-size:36px;margin-bottom:12px;opacity:0.4">${v.icon}</div>
        <div style="font-size:14px;font-weight:500;color:var(--deep)">${v.txt}</div>
      </div>`;
    return;
  }

  container.innerHTML = lista.map(p => {
    const est    = (p.peticionEstado || 'pendiente').toLowerCase();
    const esPend = est === 'pendiente';

    const estilos = {
      pendiente: { bg: 'rgba(246,194,62,0.12)',  color: 'var(--yellow)', border: 'var(--yellow)', icon: '🕐', label: 'Pendiente'  },
      aceptada:  { bg: 'rgba(76,217,100,0.10)',  color: 'var(--green)',  border: 'var(--green)',  icon: '✅', label: 'Aceptada'   },
      denegada:  { bg: 'rgba(255,59,48,0.10)',   color: 'var(--red)',    border: 'var(--red)',    icon: '❌', label: 'Denegada'   }
    };
    const e = estilos[est] || estilos.pendiente;

    const matrizNombre = AppState.matrices.find(m => String(m.id) === String(p.matrizId))?.nombre || '–';

    return `
    <div style="
      background:var(--surface);
      border:1px solid var(--border);
      border-left:3px solid ${e.border};
      border-radius:var(--radius-m);
      padding:18px 20px;
      margin-bottom:12px
    ">
      <!-- Cabecera -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:600;font-size:14px;color:var(--deep)">${p.titulo || '(Sin título)'}</span>
            <span class="peticion-tag-admin">📋 Petición</span>
            <span style="
              display:inline-flex;align-items:center;gap:4px;
              background:${e.bg};color:${e.color};
              border:1px solid ${e.border};
              padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700
            ">${e.icon} ${e.label}</span>
          </div>
          ${p.descripcion ? `<div style="font-size:12.5px;color:var(--text-m);line-height:1.5;margin-top:4px">${p.descripcion}</div>` : ''}
        </div>

        <!-- Botones solo si está pendiente -->
        ${esPend ? `
        <div style="display:flex;gap:8px;flex-shrink:0;align-items:flex-start">
          <button
            onclick="responderPeticion('${p.id}','aceptada')"
            style="
              display:inline-flex;align-items:center;gap:5px;
              background:rgba(76,217,100,0.12);color:var(--green);
              border:1px solid var(--green);border-radius:var(--radius-s);
              padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;
              font-family:'DM Sans',sans-serif;transition:background 0.15s
            "
            onmouseover="this.style.background='rgba(76,217,100,0.25)'"
            onmouseout="this.style.background='rgba(76,217,100,0.12)'"
          >✅ Aceptar</button>
          <button
            onclick="responderPeticion('${p.id}','denegada')"
            style="
              display:inline-flex;align-items:center;gap:5px;
              background:rgba(255,59,48,0.10);color:var(--red);
              border:1px solid var(--red);border-radius:var(--radius-s);
              padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;
              font-family:'DM Sans',sans-serif;transition:background 0.15s
            "
            onmouseover="this.style.background='rgba(255,59,48,0.22)'"
            onmouseout="this.style.background='rgba(255,59,48,0.10)'"
          >❌ Denegar</button>
        </div>` : ''}
      </div>

      <!-- Metadatos -->
      <div style="display:flex;gap:20px;margin-top:12px;flex-wrap:wrap">
        <div style="font-size:11px;color:var(--text-m)">
          <span style="color:var(--text-b);font-weight:500">👤 Solicitante:</span>
          ${p.solicitante || p.responsable || '–'}
        </div>
        ${p.fecha ? `<div style="font-size:11px;color:var(--text-m)">
          <span style="color:var(--text-b);font-weight:500">📅 Fecha:</span> ${p.fecha}
        </div>` : ''}
        ${p.prioridad ? `<div style="font-size:11px">${prioridadBadge(p.prioridad)}</div>` : ''}
        <div style="font-size:11px;color:var(--text-m)">
          <span style="color:var(--text-b);font-weight:500">◈ Matriz:</span> ${matrizNombre}
        </div>
      </div>

      <!-- Motivo de denegación (visible solo si fue denegada y tiene motivo) -->
      ${est === 'denegada' && p.motivoDenegacion ? `
      <div style="
        margin-top:10px;padding:8px 12px;
        background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.2);
        border-radius:var(--radius-s);font-size:11.5px;color:var(--red)
      ">💬 <strong>Motivo:</strong> ${p.motivoDenegacion}</div>` : ''}

      <!-- Nota de aceptación -->
      ${est === 'aceptada' ? `
      <div style="
        margin-top:10px;padding:8px 12px;
        background:rgba(76,217,100,0.08);border:1px solid rgba(76,217,100,0.2);
        border-radius:var(--radius-s);font-size:11.5px;color:var(--green)
      ">✅ Petición aceptada — en curso como tarea activa</div>` : ''}
    </div>`;
  }).join('');
}

// ── Filtro por botones ────────────────────────────────────────
export function filterPeticiones(filtro, btnEl) {
  _filtroActivo = filtro;
  document.querySelectorAll('.pet-filter-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderPeticiones();
}

// ── Aceptar / Denegar ────────────────────────────────────────
export async function responderPeticion(id, decision) {
  const pet = AppState.tareas.find(x => String(x.id) === String(id));
  if (!pet) return;

  const updateData = {
    peticionEstado: decision,                        // campo que lee el Panel Ejecutivo
    estado: decision === 'aceptada' ? 'En progreso' : 'Pendiente'
  };

  // Si se acepta, convertir en tarea normal (quitar marca de petición)
  if (decision === 'aceptada') {
    updateData.esPeticion = false;
  }

  // Si se deniega, registrar motivo para que lo vea el ejecutivo
  if (decision === 'denegada') {
    updateData.motivoDenegacion = 'Denegado por el administrador.';
  }

  try {
    await updateDoc(doc(db, 'tareas', String(id)), updateData);

    // Actualizar AppState local para feedback inmediato
    const local = AppState.tareas.find(x => String(x.id) === String(id));
    if (local) {
      local.peticionEstado = decision;
      local.estado = updateData.estado;
      if (decision === 'aceptada') local.esPeticion = false;
      if (decision === 'denegada') local.motivoDenegacion = updateData.motivoDenegacion;
    }

    renderPeticiones();
    showToast(
      decision === 'aceptada' ? '✅ Petición aceptada' : '❌ Petición denegada',
      decision === 'aceptada' ? 'success' : 'warning'
    );
  } catch (err) {
    console.error('Error al responder petición:', err);
    showToast('Error al guardar la respuesta', 'error');
  }
}

// ── Badge sidebar ────────────────────────────────────────────
export function updatePeticionesBadge(pendientes) {
  // Si no se pasa el número, calcularlo desde AppState
  if (pendientes === undefined) {
    pendientes = AppState.tareas.filter(
      t => t.esPeticion === true && (t.peticionEstado || 'pendiente') === 'pendiente'
    ).length;
  }
  const badge = document.getElementById('navPeticionesBadge');
  if (badge) {
    badge.textContent  = pendientes;
    badge.style.display = pendientes > 0 ? '' : 'none';
  }
}

// ── Peticiones originadas desde correo (Outlook) ─────────────
// correos.js dispara este evento al convertir un email en petición
document.addEventListener('nexus:nuevaPeticionDesdeCorreo', async (e) => {
  const peticion = e.detail;

  // Construir objeto compatible con el sistema de tareas/peticiones
  const nuevaTarea = {
    id:             'pet_correo_' + Date.now(),
    titulo:         peticion.titulo,
    descripcion:    peticion.descripcion || '',
    matrizId:       peticion.matrizId,
    prioridad:      peticion.prioridad   || 'Media',
    estado:         'Pendiente',
    esPeticion:     true,
    peticionEstado: 'pendiente',
    solicitante:    peticion.correoOrigen?.remitente || 'Cliente vía correo',
    fecha:          new Date().toLocaleDateString('es-CO'),
    fechaLimite:    peticion.fechaLimite || null,
    origen:         'correo',           // trazabilidad: vino de email
    correoOrigen:   peticion.correoOrigen || {},
    creadoPor:      peticion.creadoPor  || '',
    timestamp:      peticion.timestamp  || new Date().toISOString()
  };

  // 1. Guardar en Firebase (mismo flujo que las tareas normales)
  try {
    const { db, collection, addDoc } = await import('./firebase.js');
    const docRef = await addDoc(collection(db, 'tareas'), nuevaTarea);
    nuevaTarea.id = docRef.id;
    showToast('📬 Petición desde correo guardada en Firebase', 'success');
  } catch (fbErr) {
    console.warn('[Correos] Firebase no disponible, guardando solo en AppState:', fbErr);
  }

  // 2. Actualizar AppState local para feedback inmediato
  if (Array.isArray(AppState.tareas)) {
    AppState.tareas.unshift(nuevaTarea);
  }

  // 3. Re-renderizar peticiones y actualizar badge
  renderPeticiones();
  updatePeticionesBadge();
});
