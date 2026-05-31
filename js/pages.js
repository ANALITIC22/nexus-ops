/* ============================================================
   pages.js — Páginas principales del Panel Ejecutivo
   Incluye: matrices, objetivos, tareas, reportes, gestión,
            actividad y perfil
   Corresponde a: pages/*.html (excepto overview y detalle)
============================================================ */
import { S, db, collection, addDoc, serverTimestamp } from './firebase.js';
import {
  estadoBadge, prioridadBadge, dotColor,
  progressBar, critBar, fmtDate, fmtDateFull, matrizName
} from './helpers.js';

// ── RENDER MATRICES ───────────────────────────────────────────
export function renderMatricesExec() {
  const areaSelect = document.getElementById('matFilterArea');
  if (areaSelect) {
    const areas = [...new Set(S.matrices.map(m => m.area).filter(Boolean))].sort();
    const cur = areaSelect.value;
    areaSelect.innerHTML = `<option value="">Todas las áreas</option>`
      + areas.map(a => `<option value="${a}"${a === cur ? ' selected' : ''}>${a}</option>`).join('');
  }
  applyMatricesFilters();
}

window.applyMatricesFilters = function () {
  const el = document.getElementById('matricesExecGrid');
  if (!el) return;

  const txt    = (document.getElementById('matSearch')?.value || '').toLowerCase();
  const tipo   = document.getElementById('matFilterTipo')?.value || '';
  const area   = document.getElementById('matFilterArea')?.value || '';
  const estado = document.getElementById('matFilterEstado')?.value || '';

  let mats = S.matrices;
  if (txt)    mats = mats.filter(m =>
    (m.nombre || '').toLowerCase().includes(txt) ||
    (m.descripcion || '').toLowerCase().includes(txt) ||
    (m.responsable || '').toLowerCase().includes(txt));
  if (tipo)   mats = mats.filter(m => m.tipo === tipo);
  if (area)   mats = mats.filter(m => m.area === area);
  if (estado) mats = mats.filter(m => m.estado === estado);

  const countEl = document.getElementById('matricesCount');
  if (countEl) {
    const t = S.matrices.length;
    countEl.textContent = mats.length === t ? `${t} matrices` : `${mats.length} de ${t}`;
    countEl.style.color = mats.length < t ? 'var(--warm)' : 'var(--text-m)';
  }

  if (!mats.length) {
    const msg = S.matrices.length
      ? `<div class="empty-title">Sin resultados</div><div class="empty-text">Pruebe con otros filtros.</div>`
      : `<div class="empty-title">Sin matrices</div><div class="empty-text">No hay matrices operativas registradas.</div>`;
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◈</div>${msg}</div>`;
    return;
  }

  el.innerHTML = mats.map(m => {
    const objM = S.objetivos.filter(o => String(o.matrizId) === String(m.id));
    const tarM = S.tareas.filter(t => String(t.matrizId) === String(m.id));
    const avgP = objM.length ? Math.round(objM.reduce((s, o) => s + (o.avance || 0), 0) / objM.length) : 0;
    return `
    <div class="matrix-exec-card" onclick="openMatrizExec('${m.id}')">
      <div class="matrix-exec-header">
        <div>
          <div class="matrix-exec-icon">${m.icono || '◈'}</div>
          <div class="matrix-exec-name">${m.nombre}</div>
          <div class="matrix-exec-type">${m.tipo || '–'} · ${m.area || '–'}</div>
        </div>
        ${estadoBadge(m.estado)}
      </div>
      <div class="matrix-exec-body">
        <div class="matrix-exec-desc">${m.descripcion || 'Sin descripción.'}</div>
        <div class="matrix-exec-stats">
          <div class="exec-stat-mini">
            <div class="exec-stat-mini-val">${objM.length}</div>
            <div class="exec-stat-mini-lbl">Objetivos</div>
          </div>
          <div class="exec-stat-mini">
            <div class="exec-stat-mini-val">${tarM.length}</div>
            <div class="exec-stat-mini-lbl">Tareas</div>
          </div>
          <div class="exec-stat-mini">
            <div class="exec-stat-mini-val">${avgP}%</div>
            <div class="exec-stat-mini-lbl">Progreso</div>
          </div>
        </div>
        <div style="margin-top:4px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-m);margin-bottom:4px">
            <span>Progreso global</span><span>${avgP}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill gold" style="width:${avgP}%"></div></div>
        </div>
        <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:11px;color:var(--text-m)">👤 ${m.responsable || '–'} ${m.creadoPorNombre && m.creadoPorNombre !== m.responsable ? `<span style="font-size:10px;background:rgba(211,171,128,0.15);border:1px solid rgba(211,171,128,0.3);padding:1px 6px;border-radius:20px;margin-left:4px">🛡 ${m.creadoPorNombre}</span>` : ''}</div>
          ${critBar(m.criticidad)}
        </div>
      </div>
    </div>`;
  }).join('');
};

window.clearMatricesFilters = function () {
  ['matSearch', 'matFilterTipo', 'matFilterArea', 'matFilterEstado'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  applyMatricesFilters();
};

window.openMatrizExec = function (id) {
  S.currentMatrizId = id;
  const m = S.matrices.find(x => String(x.id) === String(id));
  if (!m) return;
  document.getElementById('detailIcon').textContent  = m.icono || '◈';
  document.getElementById('detailTitle').textContent = m.nombre;
  document.getElementById('detailSub').textContent   = `${m.tipo || '–'} · ${m.area || '–'} · 👤 ${m.responsable || '–'}${m.creadoPorNombre ? ' · 🛡 ' + m.creadoPorNombre : ''}`;
  document.getElementById('detailEstadoBadge').innerHTML = estadoBadge(m.estado);
  document.getElementById('detailCritBadge').innerHTML   = critBar(m.criticidad);
  document.querySelectorAll('#page-detalle .tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('#page-detalle .tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));

  // Import detalle render dynamically to avoid circular dependency
  import('./detalle.js').then(({ renderDetailInfo }) => renderDetailInfo(m));
  window.navTo('detalle', null);
};

// ── RENDER OBJECTIVES ─────────────────────────────────────────
export function renderObjetivosExec() {
  const container = document.getElementById('objetivosByMatrix');
  const filterBar  = document.getElementById('objetivos-filter-bar');
  const summaryEl  = document.getElementById('objetivos-summary-badges');
  if (!container) return;

  if (!S.objetivos.length) {
    container.innerHTML = `<div class="empty-state" style="padding:60px 0"><div class="empty-icon">◎</div><div class="empty-title">Sin objetivos registrados</div><div class="empty-text">El analista aún no ha registrado objetivos</div></div>`;
    if (filterBar) filterBar.innerHTML = '';
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }

  if (!window._objFilter) window._objFilter = 'todos';

  const total    = S.objetivos.length;
  const enProg   = S.objetivos.filter(o => o.estado === 'En progreso').length;
  const complet  = S.objetivos.filter(o => o.estado === 'Completado' || o.estado === 'Al día').length;
  const criticos = S.objetivos.filter(o => o.estado === 'Crítico').length;
  const avgG     = Math.round(S.objetivos.reduce((s, o) => s + (o.avance || 0), 0) / total);

  if (summaryEl) summaryEl.innerHTML = `
    <span class="badge badge-gray">${total} total</span>
    <span class="badge badge-green">${complet} completados</span>
    <span class="badge badge-gold">${enProg} en progreso</span>
    ${criticos ? `<span class="badge badge-red">${criticos} críticos</span>` : ''}
    <span style="font-size:11px;color:var(--text-m);font-family:'DM Mono',monospace">Avance global: <strong style="color:var(--deep)">${avgG}%</strong></span>`;

  const estados = ['todos', 'En progreso', 'Pendiente', 'Completado', 'Al día', 'Crítico', 'Bloqueado'];
  if (filterBar) filterBar.innerHTML = estados.map(e => {
    const count = e === 'todos' ? total : S.objetivos.filter(o => o.estado === e).length;
    if (count === 0 && e !== 'todos') return '';
    const active = window._objFilter === e;
    return `<button onclick="window._objFilter='${e}';renderObjetivosExec()"
      style="padding:5px 14px;border-radius:20px;border:1px solid ${active ? 'var(--gold)' : 'var(--border)'};
      background:${active ? 'var(--gold-10)' : 'var(--bg-card)'};color:${active ? 'var(--deep)' : 'var(--text-m)'};
      font-size:11px;font-weight:${active ? '600' : '400'};cursor:pointer;font-family:'DM Sans',sans-serif;
      transition:all 0.18s">
      ${e === 'todos' ? 'Todos' : e} <span style="opacity:0.6">(${count})</span>
    </button>`;
  }).join('');

  const filtered = window._objFilter === 'todos'
    ? S.objetivos
    : S.objetivos.filter(o => o.estado === window._objFilter);

  const groups = {};
  filtered.forEach(o => {
    const mId = String(o.matrizId || 'sin-matriz');
    if (!groups[mId]) groups[mId] = [];
    groups[mId].push(o);
  });

  const matrizOrder = Object.keys(groups).sort((a, b) => {
    const hasCritA = groups[a].some(o => o.estado === 'Crítico') ? 0 : 1;
    const hasCritB = groups[b].some(o => o.estado === 'Crítico') ? 0 : 1;
    return hasCritA - hasCritB;
  });

  if (!matrizOrder.length) {
    container.innerHTML = `<div class="empty-state" style="padding:40px 0"><div class="empty-icon">◎</div><div class="empty-title">Sin resultados para este filtro</div></div>`;
    return;
  }

  container.innerHTML = matrizOrder.map(mId => {
    const m       = S.matrices.find(x => String(x.id) === mId);
    const mNombre = m?.nombre || 'Sin matriz asignada';
    const mIcono  = m?.icono  || '◈';
    const objs    = groups[mId];
    const avgM    = Math.round(objs.reduce((s, o) => s + (o.avance || 0), 0) / objs.length);
    const hasCrit = objs.some(o => o.estado === 'Crítico');
    const allDone = objs.every(o => o.estado === 'Completado' || o.estado === 'Al día');
    const accentColor = hasCrit ? 'var(--red)' : allDone ? 'var(--green)' : 'var(--gold)';

    const rows = objs.map(o => `
      <tr>
        <td style="padding:13px 16px">
          <div style="font-weight:500;color:var(--deep);margin-bottom:3px">${o.titulo || '–'}</div>
          ${o.descripcion ? `<div style="font-size:11px;color:var(--text-m);line-height:1.4">${o.descripcion.substring(0, 90)}${o.descripcion.length > 90 ? '…' : ''}</div>` : ''}
        </td>
        <td style="padding:13px 16px">${prioridadBadge(o.prioridad)}</td>
        <td style="padding:13px 16px">${estadoBadge(o.estado)}</td>
        <td style="padding:13px 16px;min-width:140px">${progressBar(o.avance, o.avance >= 70 ? 'green' : o.avance >= 40 ? 'gold' : 'red')}</td>
        <td style="padding:13px 16px;font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m);white-space:nowrap">${fmtDate(o.fechaLimite)}</td>
      </tr>`).join('');

    return `
    <div style="margin-bottom:20px;border:1px solid var(--border);border-radius:var(--radius-m);
      overflow:hidden;box-shadow:var(--shadow-s);background:var(--bg-card)">
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:16px 20px;background:linear-gradient(135deg,var(--deep),#1A4A6E);
        border-bottom:3px solid ${accentColor};cursor:pointer;user-select:none"
        onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';
                 this.querySelector('.obj-chevron').style.transform=this.querySelector('.obj-chevron').style.transform==='rotate(180deg)'?'':'rotate(180deg)'">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px">${mIcono}</div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--cream)">${mNombre}</div>
            <div style="font-size:10px;color:rgba(214,232,245,0.55);margin-top:2px;letter-spacing:0.05em">
              ${objs.length} objetivo${objs.length !== 1 ? 's' : ''} · Avance promedio: ${avgM}%
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="text-align:center">
            <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:${accentColor}">${avgM}%</div>
            <div style="width:60px;height:4px;background:rgba(255,255,255,0.1);border-radius:4px;margin-top:4px">
              <div style="width:${avgM}%;height:100%;background:${accentColor};border-radius:4px;transition:width 0.6s ease"></div>
            </div>
          </div>
          <span class="obj-chevron" style="font-size:14px;color:rgba(214,232,245,0.4);transition:transform 0.2s">▼</span>
        </div>
      </div>
      <div>
        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:var(--gold-05)">
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Objetivo</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Prioridad</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Estado</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Avance</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Fecha Límite</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }).join('');
}

// expose for inline onclick calls
window.renderObjetivosExec = renderObjetivosExec;

// ── RENDER TASKS ──────────────────────────────────────────────
export function renderTareasExec() {
  const container = document.getElementById('tareasByMatrix');
  const filterBar  = document.getElementById('tareas-filter-bar');
  const summaryEl  = document.getElementById('tareas-summary-badges');
  if (!container) return;

  if (!S.tareas.length) {
    container.innerHTML = `<div class="empty-state" style="padding:60px 0"><div class="empty-icon">☑</div><div class="empty-title">Sin tareas registradas</div><div class="empty-text">El analista aún no ha registrado tareas</div></div>`;
    if (filterBar) filterBar.innerHTML = '';
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }

  if (!window._tarFilter) window._tarFilter = 'todos';

  const normales   = S.tareas.filter(t => !t.esPeticion);
  const peticiones = S.tareas.filter(t => t.esPeticion);
  const criticas   = normales.filter(t => t.estado === 'Crítico').length;
  const complet    = normales.filter(t => t.estado === 'Completado' || t.estado === 'Al día').length;
  const enProg     = normales.filter(t => t.estado === 'En progreso').length;

  if (summaryEl) summaryEl.innerHTML = `
    <span class="badge badge-gray">${normales.length} tareas</span>
    ${peticiones.length ? `<span class="badge badge-gold">📋 ${peticiones.length} peticiones</span>` : ''}
    <span class="badge badge-green">${complet} completadas</span>
    <span class="badge badge-gold">${enProg} en progreso</span>
    ${criticas ? `<span class="badge badge-red">⚠ ${criticas} críticas</span>` : ''}`;

  const filtros = [
    { id: 'todos',       label: 'Todos',        count: S.tareas.length },
    { id: 'tareas',      label: 'Solo tareas',  count: normales.length },
    { id: 'peticiones',  label: 'Peticiones',   count: peticiones.length },
    { id: 'Crítico',     label: 'Críticas',     count: criticas },
    { id: 'En progreso', label: 'En progreso',  count: enProg },
    { id: 'Pendiente',   label: 'Pendientes',   count: S.tareas.filter(t => t.estado === 'Pendiente').length },
  ];

  const prevSearch = document.getElementById('tarSearchInput')?.value || '';

  if (filterBar) filterBar.innerHTML =
    `<div style="position:relative;flex:1;min-width:200px;max-width:320px">
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:12px">🔍</span>
      <input type="text" id="tarSearchInput" class="filter-input"
        style="padding-left:30px;width:100%;box-sizing:border-box;font-size:11px"
        placeholder="Buscar por título o responsable..."
        value="${prevSearch.replace(/"/g, '&quot;')}"
        oninput="window._tarSearch=this.value;renderTareasExec()">
    </div>`
    + filtros.map(f => {
      if (f.count === 0 && f.id !== 'todos') return '';
      const active = window._tarFilter === f.id;
      return `<button onclick="window._tarFilter='${f.id}';renderTareasExec()"
        style="padding:5px 14px;border-radius:20px;border:1px solid ${active ? 'var(--gold)' : 'var(--border)'};
        background:${active ? 'var(--gold-10)' : 'var(--bg-card)'};color:${active ? 'var(--deep)' : 'var(--text-m)'};
        font-size:11px;font-weight:${active ? '600' : '400'};cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.18s">
        ${f.label} <span style="opacity:0.6">(${f.count})</span>
      </button>`;
    }).join('');

  if (prevSearch) {
    const inp = document.getElementById('tarSearchInput');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  let filtered = S.tareas;
  if (window._tarFilter === 'tareas')     filtered = normales;
  if (window._tarFilter === 'peticiones') filtered = peticiones;
  if (['Crítico', 'En progreso', 'Pendiente', 'Completado', 'Al día', 'Bloqueado'].includes(window._tarFilter))
    filtered = S.tareas.filter(t => t.estado === window._tarFilter);

  const txt = (window._tarSearch || '').toLowerCase().trim();
  if (txt) filtered = filtered.filter(t =>
    (t.titulo || t.title || '').toLowerCase().includes(txt) ||
    (t.responsable || t.solicitante || '').toLowerCase().includes(txt) ||
    (t.descripcion || '').toLowerCase().includes(txt));

  const groups = {};
  filtered.forEach(t => {
    const mId = String(t.matrizId || 'sin-matriz');
    if (!groups[mId]) groups[mId] = [];
    groups[mId].push(t);
  });

  const matrizOrder = Object.keys(groups).sort((a, b) => {
    const critA = groups[a].some(t => t.estado === 'Crítico') ? 0 : 1;
    const critB = groups[b].some(t => t.estado === 'Crítico') ? 0 : 1;
    return critA - critB;
  });

  if (!matrizOrder.length) {
    container.innerHTML = `<div class="empty-state" style="padding:40px 0"><div class="empty-icon">☑</div><div class="empty-title">Sin resultados para este filtro</div></div>`;
    return;
  }

  container.innerHTML = matrizOrder.map(mId => {
    const m         = S.matrices.find(x => String(x.id) === mId);
    const mNombre   = m?.nombre || 'Sin matriz asignada';
    const mIcono    = m?.icono  || '◈';
    const tareas    = groups[mId];
    const hasCrit   = tareas.some(t => t.estado === 'Crítico');
    const allDone   = tareas.filter(t => !t.esPeticion).every(t => t.estado === 'Completado' || t.estado === 'Al día');
    const accentColor = hasCrit ? 'var(--red)' : allDone ? 'var(--green)' : 'var(--gold)';
    const nPeticiones = tareas.filter(t => t.esPeticion).length;
    const nTareas     = tareas.filter(t => !t.esPeticion).length;

    const rows = tareas.map(t => {
      if (t.esPeticion) {
        const petEst = t.peticionEstado || 'pendiente';
        const ecMap = {
          pendiente: { color: 'var(--yellow)', icon: '🕐', label: 'En revisión' },
          aceptada:  { color: 'var(--green)',  icon: '✅', label: 'Aceptada' },
          denegada:  { color: 'var(--red)',    icon: '❌', label: 'Denegada' }
        };
        const ec = ecMap[petEst] || ecMap.pendiente;
        return `
        <tr style="background:linear-gradient(90deg,rgba(107,158,196,0.04),transparent)">
          <td style="padding:12px 16px;width:8px">
            <div style="width:3px;height:36px;background:${ec.color};border-radius:2px"></div>
          </td>
          <td style="padding:12px 8px">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
              <span style="font-weight:500;color:var(--deep)">${t.titulo || '–'}</span>
              <span class="peticion-tag">📋 Petición</span>
              <span style="font-size:10px;font-weight:600;color:${ec.color}">${ec.icon} ${ec.label}</span>
            </div>
            ${t.descripcion ? `<div style="font-size:11px;color:var(--text-m)">${t.descripcion.substring(0, 60)}${t.descripcion.length > 60 ? '…' : ''}</div>` : ''}
          </td>
          <td style="padding:12px 16px;font-size:12px;color:var(--text-m)">👤 ${t.solicitante || '–'}</td>
          <td style="padding:12px 16px">${prioridadBadge(t.prioridad)}</td>
          <td style="padding:12px 16px"><span style="font-size:11px;color:var(--text-m)">—</span></td>
          <td style="padding:12px 16px;font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(t.fecha)}</td>
        </tr>`;
      }
      return `
      <tr>
        <td style="padding:12px 16px;width:8px">
          <div class="task-status-dot ${dotColor(t.estado)}"></div>
        </td>
        <td style="padding:12px 8px">
          <div style="font-weight:500;color:var(--deep);margin-bottom:2px">${t.titulo || t.title || '–'}</div>
          ${t.descripcion ? `<div style="font-size:11px;color:var(--text-m)">${t.descripcion.substring(0, 60)}${t.descripcion.length > 60 ? '…' : ''}</div>` : ''}
        </td>
        <td style="padding:12px 16px;font-size:12px;color:var(--text-m)">${t.responsable || '–'}</td>
        <td style="padding:12px 16px">${prioridadBadge(t.prioridad)}</td>
        <td style="padding:12px 16px;min-width:130px">${progressBar(t.avance, 'gold')}</td>
        <td style="padding:12px 16px;font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(t.fecha)}</td>
      </tr>`;
    }).join('');

    return `
    <div style="margin-bottom:20px;border:1px solid var(--border);border-radius:var(--radius-m);
      overflow:hidden;box-shadow:var(--shadow-s);background:var(--bg-card)">
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:16px 20px;background:linear-gradient(135deg,var(--deep),#1A4A6E);
        border-bottom:3px solid ${accentColor};cursor:pointer;user-select:none"
        onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';
                 this.querySelector('.tar-chevron').style.transform=this.querySelector('.tar-chevron').style.transform==='rotate(180deg)'?'':'rotate(180deg)'">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px">${mIcono}</div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--cream)">${mNombre}</div>
            <div style="font-size:10px;color:rgba(214,232,245,0.55);margin-top:2px;display:flex;gap:10px">
              <span>${nTareas} tarea${nTareas !== 1 ? 's' : ''}</span>
              ${nPeticiones ? `<span>· 📋 ${nPeticiones} peticion${nPeticiones !== 1 ? 'es' : ''}</span>` : ''}
              ${hasCrit ? `<span style="color:rgba(180,100,100,0.8)">· ⚠ Tiene críticas</span>` : ''}
            </div>
          </div>
        </div>
        <span class="tar-chevron" style="font-size:14px;color:rgba(214,232,245,0.4);transition:transform 0.2s">▼</span>
      </div>
      <div>
        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:var(--gold-05)">
                <th style="width:8px;border-bottom:1px solid var(--border)"></th>
                <th style="padding:9px 8px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Tarea</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Responsable</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Prioridad</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Avance</th>
                <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-m);border-bottom:1px solid var(--border)">Fecha</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }).join('');
}

window.renderTareasExec = renderTareasExec;

// ── RENDER REPORTS ────────────────────────────────────────────
export function renderReportesExec() {
  const container = document.getElementById('reportesByMatrix');
  const summaryEl = document.getElementById('reportes-summary-badges');
  if (!container) return;

  if (!S.reportes.length) {
    container.innerHTML = `<div class="empty-state" style="padding:60px 0"><div class="empty-icon">▦</div><div class="empty-title">Sin reportes</div><div class="empty-text">El analista aún no ha generado reportes</div></div>`;
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }

  const total     = S.reportes.length;
  const aprobados = S.reportes.filter(r => r.estado === 'Aprobado' || r.estado === 'Al día').length;
  if (summaryEl) summaryEl.innerHTML = `
    <span class="badge badge-gray">${total} reporte${total !== 1 ? 's' : ''}</span>
    ${aprobados ? `<span class="badge badge-green">${aprobados} aprobado${aprobados !== 1 ? 's' : ''}</span>` : ''}`;

  const groups = {};
  S.reportes.forEach(r => {
    const mId = String(r.matrizId || 'sin-matriz');
    if (!groups[mId]) groups[mId] = [];
    groups[mId].push(r);
  });

  container.innerHTML = Object.keys(groups).map(mId => {
    const m       = S.matrices.find(x => String(x.id) === mId);
    const mNombre = m?.nombre || 'Sin matriz asignada';
    const mIcono  = m?.icono  || '◈';
    const reportes = groups[mId];

    const cards = reportes.map(r => `
      <div style="border:1px solid var(--border);border-radius:var(--radius-s);
        background:var(--bg-main);margin-bottom:12px;overflow:hidden">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;
          padding:14px 16px;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;
              color:var(--deep);margin-bottom:4px">${r.titulo || '–'}</div>
            <div style="font-size:11px;color:var(--text-m);display:flex;gap:8px;flex-wrap:wrap">
              ${r.tipo ? `<span>📁 ${r.tipo}</span>` : ''}
              <span>📅 ${fmtDate(r.fecha || r.createdAt)}</span>
            </div>
          </div>
          ${estadoBadge(r.estado)}
        </div>
        <div style="padding:14px 16px;font-size:13px;color:var(--text-b);line-height:1.7;
          background:var(--gold-05)">
          ${r.contenido || 'Sin contenido.'}
        </div>
      </div>`).join('');

    return `
    <div style="margin-bottom:20px;border:1px solid var(--border);border-radius:var(--radius-m);
      overflow:hidden;box-shadow:var(--shadow-s);background:var(--bg-card)">
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:16px 20px;background:linear-gradient(135deg,var(--deep),#1A4A6E);
        border-bottom:3px solid var(--gold);cursor:pointer;user-select:none"
        onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';
                 this.querySelector('.rep-chevron').style.transform=this.querySelector('.rep-chevron').style.transform==='rotate(180deg)'?'':'rotate(180deg)'">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px">${mIcono}</div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--cream)">${mNombre}</div>
            <div style="font-size:10px;color:rgba(214,232,245,0.55);margin-top:2px">
              ${reportes.length} reporte${reportes.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <span class="rep-chevron" style="font-size:14px;color:rgba(214,232,245,0.4);transition:transform 0.2s">▼</span>
      </div>
      <div style="padding:16px 20px">${cards}</div>
    </div>`;
  }).join('');
}

// ── RENDER GESTIÓN ────────────────────────────────────────────
export function renderGestionExec() {
  const matSel = document.getElementById('gestionFilterMatriz');
  if (matSel) {
    const cur = matSel.value;
    matSel.innerHTML = `<option value="">Todas las matrices</option>`
      + S.matrices.map(m => `<option value="${m.id}"${m.id === cur ? ' selected' : ''}>${m.icono || '◈'} ${m.nombre}</option>`).join('');
  }
  applyGestionFilters();
}

window.applyGestionFilters = function () {
  const el = document.getElementById('gestionExecList');
  if (!el) return;

  const txt   = (document.getElementById('gestionSearch')?.value || '').toLowerCase();
  const matId = document.getElementById('gestionFilterMatriz')?.value || '';
  const tipo  = (document.getElementById('gestionFilterTipo')?.value || '').toLowerCase();

  let list = [...S.gestion];
  if (matId) list = list.filter(g => String(g.matrizId) === String(matId));
  if (tipo)  list = list.filter(g => (g.texto || g.contenido || g.titulo || '').toLowerCase().includes('[' + tipo));
  if (txt)   list = list.filter(g => (g.texto || g.contenido || g.titulo || '').toLowerCase().includes(txt));

  if (!list.length) {
    const msg = S.gestion.length
      ? `<div class="empty-title">Sin resultados</div><div class="empty-text">Pruebe con otros filtros.</div>`
      : `<div class="empty-title">Sin registros aún</div><div class="empty-text">Los registros de gestión operativa aparecerán aquí.<br>Use el panel de administración para añadir entradas a la bitácora.</div>`;
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">✎</div>${msg}</div>`;
    return;
  }

  el.innerHTML = list.map(g => `
    <div class="gestion-entry">
      <div class="gestion-entry-header">
        <div>
          <div class="gestion-entry-title">${g.titulo || 'Registro operativo'}</div>
          <div style="font-size:11px;color:var(--text-m);margin-top:2px">${matrizName(g.matrizId)}</div>
        </div>
        <span style="font-size:10px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(g.fecha)}</span>
      </div>
      <div class="gestion-entry-body">${g.contenido || g.texto || '–'}</div>
    </div>`).join('');
};

// ── RENDER ACTIVIDAD ──────────────────────────────────────────
export function renderActividadExec() {
  const matSel = document.getElementById('actividadFilterMatriz');
  if (matSel) {
    const cur = matSel.value;
    matSel.innerHTML = `<option value="">Todas las matrices</option>`
      + S.matrices.map(m => `<option value="${m.id}"${m.id === cur ? ' selected' : ''}>${m.icono || '◈'} ${m.nombre}</option>`).join('');
  }
  applyActividadFilters();
}

window.applyActividadFilters = function () {
  const el = document.getElementById('actividadTimeline');
  if (!el) return;

  const matId   = document.getElementById('actividadFilterMatriz')?.value || '';
  const periodo = parseInt(document.getElementById('actividadFilterPeriodo')?.value || '0');

  let all = [...S.gestion].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (matId) all = all.filter(g => String(g.matrizId) === String(matId));
  if (periodo) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodo);
    all = all.filter(g => new Date(g.fecha) >= cutoff);
  }

  if (!all.length) {
    const msg = S.gestion.length
      ? `<div class="empty-title">Sin resultados</div><div class="empty-text">Pruebe con otros filtros.</div>`
      : `<div class="empty-title">Sin actividad registrada</div><div class="empty-text">El historial aparecerá aquí a medida que se generen registros de gestión.</div>`;
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⊙</div>${msg}</div>`;
    return;
  }

  const tipoMeta = txt => {
    const t = (txt || '').toLowerCase();
    if (t.includes('[incidente'))  return { icon: '⚠️', dot: 'dot-red' };
    if (t.includes('[monitoreo'))  return { icon: '📊', dot: 'dot-gold' };
    if (t.includes('[validaci'))   return { icon: '✅', dot: 'dot-green' };
    return { icon: '📝', dot: 'dot-green' };
  };

  const grouped = {};
  all.forEach(g => {
    const key = fmtDate(g.fecha);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  el.innerHTML = Object.entries(grouped).map(([date, items]) => `
    <div style="margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;color:var(--warm);letter-spacing:0.1em;
        text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:12px;
        padding-bottom:6px;border-bottom:1px solid var(--border)">${date}</div>
      ${items.map(g => {
        const { icon } = tipoMeta(g.texto || g.contenido || '');
        return `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:none;border:none;font-size:14px;margin-top:1px">${icon}</div>
          <div class="timeline-content">
            <div class="timeline-title">${g.titulo || 'Registro operativo'}</div>
            <div class="timeline-desc">${(g.contenido || g.texto || '').substring(0, 180)}${(g.contenido || g.texto || '').length > 180 ? '…' : ''}</div>
            <div style="margin-top:6px;font-size:10px;color:var(--text-l)">${matrizName(g.matrizId)}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
};

// ── RENDER PERFIL ─────────────────────────────────────────────
export function renderPerfilExec() {
  const p = S.perfil;
  const initials = p?.nombre ? p.nombre.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'AC';
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent   = p?.nombre || 'Analista Corporativo';
  document.getElementById('profileRole').textContent   = `${p?.cargo || 'Analista Senior'} · ${p?.area || 'Tecnología e Innovación'}`;

  const tagsEl = document.getElementById('profileTags');
  if (tagsEl) tagsEl.innerHTML = (p?.skills || '').split(',').filter(Boolean).slice(0, 4)
    .map(s => `<span class="profile-exec-tag">${s.trim()}</span>`).join('');

  const infoEl = document.getElementById('profileInfo');
  if (infoEl) infoEl.innerHTML = [
    ['Nombre Completo', p?.nombre || '–'],
    ['Cargo',          p?.cargo   || '–'],
    ['Área',           p?.area    || '–'],
    ['Correo',         p?.email   || '–'],
    ['Teléfono',       p?.phone   || '–'],
  ].map(([l, v]) => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="card-label" style="min-width:110px">${l}</div>
      <div style="font-size:13px;color:var(--deep);font-weight:500">${v}</div>
    </div>`).join('')
    + `<div style="margin-top:12px"><div class="card-label" style="margin-bottom:8px">Descripción</div>
      <div style="font-size:13px;color:var(--text-b);line-height:1.7;background:var(--gold-05);border-radius:var(--radius-s);padding:12px;border:1px solid var(--border)">${p?.descripcion || '–'}</div></div>`;

  const skillsEl = document.getElementById('profileSkills');
  const skills   = (p?.skills || '').split(',').filter(Boolean);
  if (skillsEl && skills.length) {
    skillsEl.innerHTML = skills.map((s, i) => {
      const pct = 95 - i * 8 > 50 ? 95 - i * 8 : 55;
      return `<div class="skill-item">
        <div class="skill-name">${s.trim()}</div>
        <div class="skill-bar-wrap"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
        <div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m);min-width:30px">${pct}%</div>
      </div>`;
    }).join('');
  } else if (skillsEl) {
    skillsEl.innerHTML = `<div class="empty-state"><div class="empty-text">Sin habilidades registradas</div></div>`;
  }

  const matsEl = document.getElementById('profileMatrices');
  if (matsEl) matsEl.innerHTML = S.matrices.map(m => `
    <div style="background:var(--gold-05);border:1px solid var(--border);border-radius:var(--radius-s);
      padding:14px;text-align:center;cursor:pointer;transition:all var(--trans)"
      onmouseover="this.style.background='var(--gold-10)'" onmouseout="this.style.background='var(--gold-05)'"
      onclick="openMatrizExec('${m.id}')">
      <div style="font-size:24px;margin-bottom:6px">${m.icono || '◈'}</div>
      <div style="font-size:12px;font-weight:500;color:var(--deep)">${m.nombre}</div>
      <div style="font-size:10px;color:var(--text-m);margin-top:3px">${m.tipo || '–'}</div>
      ${estadoBadge(m.estado)}
    </div>`).join('');
}
