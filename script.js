// ============================================================
// NEXUS OPS — SCRIPT COMPLETO v2.0
// Panel Administrador — CRUD COMPLETO con edición real
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc,
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyC_R7AzEivuPnI_DOQqp26vMCoGiXwMMSc",
  authDomain:        "analitic-195e4.firebaseapp.com",
  projectId:         "analitic-195e4",
  storageBucket:     "analitic-195e4.firebasestorage.app",
  messagingSenderId: "372700730136",
  appId:             "1:372700730136:web:0367a21ba66d824f39446d",
  measurementId:     "G-LTHQRY5QTC"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Expose globals (ES modules) ───────────────────────────────
window.navigate              = navigate;
window.openModal             = openModal;
window.closeModal            = closeModal;
window.toggleNotif           = toggleNotif;
window.toggleView            = toggleView;
window.showToast             = showToast;
window.switchTab             = switchTab;

// Matrices
window.saveMatriz            = saveMatriz;
window.saveEditMatriz        = saveEditMatriz;
window.editCurrentMatrix     = editCurrentMatrix;
window.deleteCurrentMatrix   = deleteCurrentMatrix;
window.openMatriz            = openMatriz;
window.filterMatrices        = filterMatrices;
window.filterMatricesByType  = filterMatricesByType;

// Objetivos
window.saveObjetivo          = saveObjetivo;
window.editObjetivo          = editObjetivo;
window.saveEditObjetivo      = saveEditObjetivo;
window.deleteObjetivo        = deleteObjetivo;
window.updateObjetivoProgress = updateObjetivoProgress;

// Tareas
window.saveTarea             = saveTarea;
window.editTarea             = editTarea;
window.saveEditTarea         = saveEditTarea;
window.deleteTarea           = deleteTarea;
window.deleteTareaGlobal     = deleteTareaGlobal;
window.filterTareasGlobal    = filterTareasGlobal;
window.updateTareaProgress   = updateTareaProgress;

// Gestión
window.saveGestion           = saveGestion;
window.saveGestionGlobal     = saveGestionGlobal;
window.formatText            = formatText;
window.formatTextG           = formatTextG;
window.insertTemplate        = insertTemplate;
window.insertTemplateG       = insertTemplateG;

// Diagramas
window.saveDiagrama          = saveDiagrama;
window.deleteDiagrama        = deleteDiagrama;
window.showFileName          = showFileName;
window.handleDrop            = handleDrop;

// Reportes
window.saveReporte           = saveReporte;
window.deleteReporte         = deleteReporte;

// Config / Perfil
window.saveConfig            = saveConfig;
window.savePerfil            = savePerfil;

// ── AppState ──────────────────────────────────────────────────
const AppState = {
  matrices:      [],
  objetivos:     [],
  tareas:        [],
  diagramas:     [],
  reportes:      [],
  gestionGlobal: [],
  comments:      [],   // comentarios con soloAdmin:true del panel ejecutivo
  currentMatrizId: null,
  perfil:        null,
  config:        null,
  editingId:     null,  // ID del registro que se está editando
  adminCommentFilter: ''
};

let currentView = 'grid';

// ============================================================
// NAVEGACIÓN
// ============================================================
function navigate(page, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  if (navEl) navEl.classList.add('active');
  else {
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.getAttribute('onclick')?.includes(`'${page}'`)) n.classList.add('active');
    });
  }

  const titles = {
    dashboard: 'Dashboard', matrices: 'Matrices Operativas',
    objetivos: 'Objetivos', tareas: 'Tareas',
    gestion: 'Gestión Operativa', diagramas: 'Diagramas',
    actividad: 'Actividad', reportes: 'Reportes',
    perfil: 'Perfil Profesional', config: 'Configuración',
    'detalle-matriz': 'Detalle de Matriz'
  };
  const ht = document.getElementById('headerTitle');
  if (ht) ht.textContent = titles[page] || page;

  if (page === 'matrices')       renderMatricesGrid();
  if (page === 'objetivos')      renderGlobalObjetivos();
  if (page === 'tareas')         renderGlobalTareas();
  if (page === 'diagramas')      renderGlobalDiagramas();
  if (page === 'actividad')      renderActividad();
  if (page === 'reportes')       renderReportes();
  if (page === 'gestion')        renderGestionGlobal();
  if (page === 'perfil')         renderProfileApps();
  if (page === 'dashboard')      updateDashboard();
}

function updateDashboard() {
  const listContainer = document.getElementById('dashMatricesList');
  if (!listContainer) return;

  if (!AppState.matrices.length) {
    listContainer.innerHTML = `<p style="font-size:13px;color:var(--text-m)">No hay matrices aún.</p>`;
  } else {
    listContainer.innerHTML = AppState.matrices.slice(0, 3).map(m => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;
        background:var(--gold-10);border-radius:var(--radius-s);cursor:pointer;margin-bottom:6px"
        onclick="openMatriz('${m.id}')">
        <div style="display:flex;align-items:center;gap:8px">
          <span>${m.icono || '◈'}</span>
          <span style="font-size:13px;font-weight:500;color:var(--deep)">${m.nombre}</span>
        </div>
        ${estadoBadge(m.estado)}
      </div>`).join('');
  }
  renderDashboardCharts();
}

function renderDashboardCharts() {
  const ctxMat = document.getElementById('chartMatrices');
  if (ctxMat) {
    if (ctxMat._chartInstance) ctxMat._chartInstance.destroy();
    const labels = AppState.matrices.map(m => m.nombre);
    const dataProgress = AppState.matrices.map(m => {
      const objM = AppState.objetivos.filter(o => String(o.matrizId) === String(m.id));
      return objM.length ? Math.round(objM.reduce((s,o) => s + (o.avance||0), 0) / objM.length) : 0;
    });
    ctxMat._chartInstance = new Chart(ctxMat, {
      type: 'line',
      data: {
        labels, datasets: [{
          label: 'Progreso %', data: dataProgress,
          borderColor: '#D3AB80', backgroundColor: 'rgba(211,171,128,0.1)',
          borderWidth: 2, tension: 0.3, fill: true
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min:0, max:100, ticks:{ color:'#96786F', font:{family:'DM Mono',size:10} } },
          x: { ticks:{ color:'#96786F', font:{family:'DM Mono',size:10} } }
        }
      }
    });
  }

  const ctxTar = document.getElementById('chartTareas');
  if (ctxTar) {
    if (ctxTar._chartInstance) ctxTar._chartInstance.destroy();
    const comp  = AppState.tareas.filter(t => t.estado==='Completado'||t.estado==='Al día').length;
    const prog  = AppState.tareas.filter(t => t.estado==='En progreso').length;
    const crit  = AppState.tareas.filter(t => t.estado==='Crítico').length;
    ctxTar._chartInstance = new Chart(ctxTar, {
      type: 'doughnut',
      data: {
        labels: ['Completadas','En Progreso','Críticas'],
        datasets: [{ data:[comp,prog,crit], backgroundColor:['#5F7466','#D3AB80','#BC6C25'], borderWidth:0 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} } }
    });
  }
}

function updateClock() {
  const now = new Date();
  const c = document.getElementById('liveClock');
  const d = document.getElementById('liveDate');
  if (c) c.textContent = now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if (d) d.textContent = now.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

// ============================================================
// MODALES, TOASTS Y HELPERS
// ============================================================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    if (id === 'modal-nueva-tarea')    populateTareaMatrizSelect();
    if (id === 'modal-nuevo-reporte')  populateReporteMatrizSelect();
    if (id === 'modal-editar-perfil')  prefillPerfilModal();
    if (id === 'modal-nueva-matriz')   clearMatrizModal();
  }
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  AppState.editingId = null;
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) { o.classList.remove('open'); AppState.editingId = null; } });
});

function populateTareaMatrizSelect() {
  const sel = document.getElementById('tMatriz');
  if (!sel) return;
  sel.innerHTML = '<option value="">General</option>';
  AppState.matrices.forEach(m => { sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`; });
  if (AppState.currentMatrizId) sel.value = AppState.currentMatrizId;
}

function populateReporteMatrizSelect() {
  const sel = document.getElementById('rMatriz');
  if (!sel) return;
  sel.innerHTML = '<option value="">General</option>';
  AppState.matrices.forEach(m => { sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`; });
}

function showToast(msg, type = 'success') {
  const icons = { success:'✓', warning:'⚠', error:'✕' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  const container = document.getElementById('toastContainer');
  if (container) { container.appendChild(t); setTimeout(() => t.remove(), 3500); }
}

function toggleNotif() { document.getElementById('notifPanel').classList.toggle('open'); }

document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  if (panel?.classList.contains('open') && !panel.contains(e.target) && !e.target.closest('.icon-btn'))
    panel.classList.remove('open');
});

function toggleView() {
  currentView = currentView === 'grid' ? 'list' : 'grid';
  const grid = document.getElementById('matrices-grid');
  if (grid) grid.style.gridTemplateColumns = currentView==='list' ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))';
  showToast('Vista cambiada', 'success');
}

function switchTab(btn, tabId) {
  const parent = btn.closest('.page');
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
  if (tabId === 'tab-objetivos')          renderObjetivosTab();
  if (tabId === 'tab-tareas')             renderTareasTab();
  if (tabId === 'tab-estado')             renderEstadoTab();
  if (tabId === 'tab-diagramas')          renderDiagramasTab();
  if (tabId === 'tab-historial')          renderHistorialTab();
  if (tabId === 'tab-gestion')            renderGestionRegistros();
  if (tabId === 'tab-comentarios-admin')  renderAdminComments();
}

// ── Badge helpers ─────────────────────────────────────────────
function estadoBadge(estado) {
  const map = {
    'Al día':'badge-green','Completado':'badge-green','En progreso':'badge-gold',
    'Pendiente':'badge-yellow','Bloqueado':'badge-gray','Crítico':'badge-red',
    'Aprobado':'badge-green','Borrador':'badge-gray'
  };
  return `<span class="badge ${map[estado]||'badge-gray'}">${estado}</span>`;
}

function prioridadBadge(p) {
  const m = { Alta:'badge-red', Media:'badge-yellow', Baja:'badge-green' };
  return `<span class="badge ${m[p]||'badge-gray'}" style="font-size:10px">${p}</span>`;
}

function criticidadBar(c) {
  const levels = { Alta:3, Media:2, Baja:1 };
  const cls    = { Alta:'filled-alta', Media:'filled-media', Baja:'filled-baja' };
  let bars = '';
  for (let i=1;i<=3;i++) bars += `<div class="crit-block ${i<=(levels[c]||0) ? cls[c] : ''}"></div>`;
  return `<div class="criticality-bar">${bars}</div>`;
}

function progressBar(pct, color='') {
  return `<div class="progress-bar" style="width:80px;display:inline-block;vertical-align:middle">
    <div class="progress-fill ${color}" style="width:${pct||0}%"></div>
  </div> <span style="font-size:11px;font-family:'DM Mono',monospace">${pct||0}%</span>`;
}

function fmtDate(d) {
  if (!d) return '–';
  try { return new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return d; }
}

// ============================================================
// ██████  MATRICES — CRUD COMPLETO
// ============================================================
function renderMatricesGrid(filter='', typeFilter='') {
  const grid = document.getElementById('matrices-grid');
  if (!grid) return;
  let mats = AppState.matrices;
  if (filter)     mats = mats.filter(m => m.nombre.toLowerCase().includes(filter.toLowerCase()) || (m.descripcion||'').toLowerCase().includes(filter.toLowerCase()));
  if (typeFilter) mats = mats.filter(m => m.tipo === typeFilter);

  if (!mats.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">◈</div>
      <div class="empty-title">No hay matrices</div>
      <div class="empty-text">Cree su primera matriz operativa</div>
    </div>`;
    return;
  }

  grid.innerHTML = mats.map(m => {
    const tareasM = AppState.tareas.filter(t => String(t.matrizId) === String(m.id));
    const objM    = AppState.objetivos.filter(o => String(o.matrizId) === String(m.id));
    const avgP    = objM.length ? Math.round(objM.reduce((s,o)=>s+(o.avance||0),0)/objM.length) : 0;
    return `
    <div class="matrix-card" onclick="openMatriz('${m.id}')">
      <div class="matrix-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="matrix-icon">${m.icono||'◈'}</div>
          <div>
            <div class="matrix-name">${m.nombre}</div>
            <div class="matrix-type">${m.tipo} · ${m.area}</div>
          </div>
        </div>
        ${estadoBadge(m.estado)}
      </div>
      <div class="matrix-desc">${m.descripcion||''}</div>
      <div style="margin:10px 0 4px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-m);margin-bottom:4px">
          <span>Progreso objetivos</span><span>${avgP}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${avgP>=70?'green':avgP>=40?'':'red'}" style="width:${avgP}%"></div></div>
      </div>
      <div class="matrix-stats">
        <div class="matrix-stat-item"><div class="matrix-stat-val">${objM.length}</div><div class="matrix-stat-lbl">Objetivos</div></div>
        <div class="matrix-stat-item"><div class="matrix-stat-val">${tareasM.length}</div><div class="matrix-stat-lbl">Tareas</div></div>
        <div class="matrix-stat-item"><div class="matrix-stat-val">${AppState.diagramas.filter(d=>String(d.matrizId)===String(m.id)).length}</div><div class="matrix-stat-lbl">Diagramas</div></div>
      </div>
      <div class="matrix-footer">
        <div class="matrix-responsible">👤 ${m.responsable}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-size:10px;color:var(--text-l)">Criticidad</div>
          ${criticidadBar(m.criticidad)}
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterMatrices(val)        { renderMatricesGrid(val); }
function filterMatricesByType(val)  { renderMatricesGrid('', val); }

function clearMatrizModal() {
  ['mNombre','mArea','mResponsable','mDesc','mIcono'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('mTipo') && (document.getElementById('mTipo').value = 'Aplicativo');
  document.getElementById('mCriticidad') && (document.getElementById('mCriticidad').value = 'Media');
  document.getElementById('mEstado') && (document.getElementById('mEstado').value = 'Al día');
  const title = document.querySelector('#modal-nueva-matriz .modal-title');
  if (title) title.textContent = 'Nueva Matriz Operativa';
  const btn = document.querySelector('#modal-nueva-matriz .btn-primary');
  if (btn) { btn.textContent = 'Guardar Matriz'; btn.setAttribute('onclick', 'saveMatriz()'); }
  AppState.editingId = null;
}

async function saveMatriz() {
  const nombre = document.getElementById('mNombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

  const data = {
    nombre,
    tipo:       document.getElementById('mTipo').value,
    area:       document.getElementById('mArea').value,
    responsable:document.getElementById('mResponsable').value,
    criticidad: document.getElementById('mCriticidad').value,
    estado:     document.getElementById('mEstado').value,
    icono:      document.getElementById('mIcono').value || '◈',
    descripcion:document.getElementById('mDesc').value,
    fechaCreacion:       new Date().toISOString().split('T')[0],
    ultimaActualizacion: new Date().toISOString().split('T')[0]
  };

  try {
    await addDoc(collection(db, 'matrices'), data);
    showToast('Matriz guardada ✓', 'success');
    closeModal('modal-nueva-matriz');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ── EDITAR MATRIZ ─────────────────────────────────────────────
function editCurrentMatrix() {
  const m = AppState.matrices.find(x => String(x.id) === String(AppState.currentMatrizId));
  if (!m) { showToast('No se encontró la matriz', 'error'); return; }

  // Llenar campos del modal
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val||''; };
  setVal('mNombre',      m.nombre);
  setVal('mTipo',        m.tipo);
  setVal('mArea',        m.area);
  setVal('mResponsable', m.responsable);
  setVal('mCriticidad',  m.criticidad);
  setVal('mEstado',      m.estado);
  setVal('mIcono',       m.icono);
  setVal('mDesc',        m.descripcion);

  // Cambiar título y botón del modal
  const title = document.querySelector('#modal-nueva-matriz .modal-title');
  if (title) title.textContent = `Editar — ${m.nombre}`;
  const btn = document.querySelector('#modal-nueva-matriz .btn-primary');
  if (btn) { btn.textContent = '💾 Guardar Cambios'; btn.setAttribute('onclick', 'saveEditMatriz()'); }

  AppState.editingId = m.id;
  openModal('modal-nueva-matriz');
}

async function saveEditMatriz() {
  if (!AppState.editingId) { showToast('Error: no hay ID de edición', 'error'); return; }
  const nombre = document.getElementById('mNombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

  const data = {
    nombre,
    tipo:        document.getElementById('mTipo').value,
    area:        document.getElementById('mArea').value,
    responsable: document.getElementById('mResponsable').value,
    criticidad:  document.getElementById('mCriticidad').value,
    estado:      document.getElementById('mEstado').value,
    icono:       document.getElementById('mIcono').value || '◈',
    descripcion: document.getElementById('mDesc').value,
    ultimaActualizacion: new Date().toISOString().split('T')[0]
  };

  try {
    await updateDoc(doc(db, 'matrices', String(AppState.editingId)), data);
    showToast('Matriz actualizada ✓', 'success');
    closeModal('modal-nueva-matriz');
    // Refrescar detalle si estamos viendo esa matriz
    const updated = AppState.matrices.find(x => String(x.id) === String(AppState.editingId));
    if (updated) {
      Object.assign(updated, data);
      document.getElementById('detailTitle').textContent    = data.nombre;
      document.getElementById('detailSubtitle').textContent = `${data.tipo} · ${data.area}`;
      document.getElementById('detailIcon').textContent     = data.icono;
      renderDetailInfo(updated);
      renderDetailIndicators(updated);
    }
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteCurrentMatrix() {
  if (!AppState.currentMatrizId) return;
  if (confirm('¿Eliminar esta matriz y todos sus datos?')) {
    try {
      await deleteDoc(doc(db, 'matrices', String(AppState.currentMatrizId)));
      showToast('Matriz eliminada', 'warning');
      navigate('matrices', null);
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
}

function openMatriz(id) {
  AppState.currentMatrizId = id;
  AppState.adminCommentFilter = '';  // resetear filtro al cambiar de matriz
  const m = AppState.matrices.find(x => String(x.id) === String(id));
  if (!m) return;
  document.getElementById('detailIcon').textContent     = m.icono || '◈';
  document.getElementById('detailTitle').textContent    = m.nombre;
  document.getElementById('detailSubtitle').textContent = `${m.tipo} · ${m.area}`;
  renderDetailInfo(m);
  renderDetailIndicators(m);
  document.querySelectorAll('#page-detalle-matriz .tab-btn').forEach((b,i) => b.classList.toggle('active',i===0));
  document.querySelectorAll('#page-detalle-matriz .tab-content').forEach((c,i) => c.classList.toggle('active',i===0));
  // Resetear filtros de comentarios y actualizar badge
  document.querySelectorAll('.admin-comment-filter-btn').forEach(b => b.classList.toggle('active', b.textContent.includes('Todos')));
  updateAdminCommentsBadge();
  navigate('detalle-matriz', null);
}

function renderDetailInfo(m) {
  document.getElementById('detailInfo').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><div class="card-label">Nombre</div><div style="margin-top:4px;font-size:13.5px;color:var(--deep);font-weight:500">${m.nombre}</div></div>
      <div><div class="card-label">Tipo</div><div style="margin-top:4px;font-size:13.5px">${m.tipo}</div></div>
      <div><div class="card-label">Área</div><div style="margin-top:4px;font-size:13.5px">${m.area||'–'}</div></div>
      <div><div class="card-label">Responsable</div><div style="margin-top:4px;font-size:13.5px">👤 ${m.responsable||'–'}</div></div>
      <div><div class="card-label">Estado</div><div style="margin-top:4px">${estadoBadge(m.estado)}</div></div>
      <div><div class="card-label">Criticidad</div><div style="margin-top:4px;display:flex;align-items:center;gap:8px">${criticidadBar(m.criticidad)}<span style="font-size:12px;color:var(--text-m)">${m.criticidad}</span></div></div>
      <div style="grid-column:1/-1"><div class="card-label">Descripción</div>
        <div style="margin-top:4px;font-size:13px;color:var(--text-b);line-height:1.6">${m.descripcion||'–'}</div></div>
      <div><div class="card-label">Fecha Creación</div><div style="margin-top:4px;font-size:12.5px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(m.fechaCreacion)}</div></div>
      <div><div class="card-label">Última Actualización</div><div style="margin-top:4px;font-size:12.5px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(m.ultimaActualizacion)}</div></div>
    </div>`;
}

function renderDetailIndicators(m) {
  const tareasM = AppState.tareas.filter(t => String(t.matrizId) === String(m.id));
  const objM    = AppState.objetivos.filter(o => String(o.matrizId) === String(m.id));
  const avgP    = objM.length ? Math.round(objM.reduce((s,o)=>s+(o.avance||0),0)/objM.length) : 0;
  document.getElementById('detailIndicators').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="text-align:center;padding:20px;
        background:${m.estado==='Al día'?'var(--green-bg)':m.estado==='Crítico'?'var(--red-bg)':'var(--yellow-bg)'};
        border-radius:var(--radius-m)">
        <div style="font-size:32px;margin-bottom:8px">${m.estado==='Al día'?'🟢':m.estado==='Crítico'?'🔴':'🟡'}</div>
        <div style="font-size:18px;font-weight:600;color:var(--deep)">${m.estado}</div>
        <div style="font-size:11px;color:var(--text-m);margin-top:2px">Estado Operativo</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center">
        ${[['Objetivos',objM.length],['Tareas',tareasM.length],['Progreso',avgP+'%']].map(([l,v])=>`
          <div style="padding:12px;background:var(--gold-10);border-radius:var(--radius-s)">
            <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--deep)">${v}</div>
            <div style="font-size:10px;color:var(--text-m)">${l}</div>
          </div>`).join('')}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-m);margin-bottom:6px">
          <span>Avance global de objetivos</span><span style="font-family:'DM Mono',monospace">${avgP}%</span>
        </div>
        <div class="progress-bar" style="height:8px">
          <div class="progress-fill ${avgP>=70?'green':avgP>=40?'':'red'}" style="width:${avgP}%"></div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// ██████  OBJETIVOS — CRUD COMPLETO CON EDICIÓN INLINE
// ============================================================
function renderGlobalObjetivos() {
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
            <td style="font-size:12px">${m ? m.icono+' '+m.nombre : 'General'}</td>
            <td>${prioridadBadge(o.prioridad)}</td>
            <td>${progressBar(o.avance)}</td>
            <td>${estadoBadge(o.estado)}</td>
            <td style="font-family:'DM Mono';font-size:12px">${o.fechaLimite||o.fecha||'–'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" style="padding:4px 8px;color:var(--warm)" onclick="editObjetivo('${o.id}')">✎</button>
              <button class="btn btn-ghost btn-sm" style="padding:4px 8px;color:var(--red)"  onclick="deleteObjetivo('${o.id}')">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderObjetivosTab() {
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
        border-radius:var(--radius-s);border-left:3px solid ${o.prioridad==='Alta'?'var(--red)':o.prioridad==='Media'?'var(--yellow)':'var(--green)'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13.5px;color:var(--deep);margin-bottom:4px">${o.titulo}</div>
            <div style="font-size:12px;color:var(--text-b);margin-bottom:10px">${o.descripcion||''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            ${prioridadBadge(o.prioridad)} ${estadoBadge(o.estado)}
            <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editObjetivo('${o.id}')">✎ Editar</button>
            <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteObjetivo('${o.id}')">✕</button>
          </div>
        </div>
        <!-- Barra de progreso editable inline -->
        <div style="margin-top:4px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:11px;color:var(--text-m)">Avance</span>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="range" min="0" max="100" value="${o.avance||0}"
                style="width:100px;accent-color:var(--gold);cursor:pointer"
                oninput="this.nextElementSibling.textContent=this.value+'%'"
                onchange="updateObjetivoProgress('${o.id}',this.value)">
              <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--deep);font-weight:600;min-width:36px">${o.avance||0}%</span>
            </div>
          </div>
          <div class="progress-bar" style="height:7px">
            <div class="progress-fill ${(o.avance||0)>=70?'green':(o.avance||0)>=40?'':'red'}"
              style="width:${o.avance||0}%;transition:width 0.4s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-l);margin-top:4px">
            <span>📅 Vence: ${o.fechaLimite||o.fecha||'–'}</span>
            <span>${o.observaciones||''}</span>
          </div>
        </div>
      </div>`).join('')}
  </div>`;
}

async function updateObjetivoProgress(id, value) {
  const pct = parseInt(value);
  // Auto-calcular estado según progreso
  let nuevoEstado = 'En progreso';
  if (pct === 0)   nuevoEstado = 'Pendiente';
  if (pct === 100) nuevoEstado = 'Completado';
  try {
    await updateDoc(doc(db, 'objetivos', String(id)), { avance: pct, estado: nuevoEstado });
    // Actualizar visualmente la barra sin re-render total
    const obj = AppState.objetivos.find(o => String(o.id)===String(id));
    if (obj) { obj.avance = pct; obj.estado = nuevoEstado; }
    // Actualizar estado de la matriz si está en detalle
    const m = AppState.matrices.find(x => String(x.id)===String(AppState.currentMatrizId));
    if (m) renderDetailIndicators(m);
    renderEstadoTab();
  } catch(e) { showToast('Error al actualizar progreso', 'error'); }
}

async function saveObjetivo() {
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
    ['oTitulo','oDesc'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ── EDITAR OBJETIVO ────────────────────────────────────────────
function editObjetivo(id) {
  const o = AppState.objetivos.find(x => String(x.id)===String(id));
  if (!o) return;

  AppState.editingId = id;
  const setVal = (elId, val) => { const el=document.getElementById(elId); if(el) el.value=val||''; };
  setVal('oTitulo',    o.titulo);
  setVal('oPrioridad', o.prioridad);
  setVal('oEstado',    o.estado);
  setVal('oAvance',    o.avance||0);
  setVal('oFecha',     o.fechaLimite||o.fecha||'');
  setVal('oDesc',      o.descripcion||'');

  const title = document.querySelector('#modal-nuevo-objetivo .modal-title');
  if (title) title.textContent = `Editar Objetivo`;
  const btn = document.querySelector('#modal-nuevo-objetivo .btn-primary');
  if (btn) { btn.textContent='💾 Guardar Cambios'; btn.setAttribute('onclick','saveEditObjetivo()'); }

  // Añadir slider de avance en el modal si no existe
  let sliderWrap = document.getElementById('oAvanceSliderWrap');
  if (!sliderWrap) {
    const avanceGroup = document.getElementById('oAvance')?.closest('.form-group');
    if (avanceGroup) {
      const sliderDiv = document.createElement('div');
      sliderDiv.id = 'oAvanceSliderWrap';
      sliderDiv.style = 'margin-top:6px;display:flex;align-items:center;gap:10px';
      sliderDiv.innerHTML = `<input type="range" id="oAvanceSlider" min="0" max="100" value="${o.avance||0}"
        style="flex:1;accent-color:var(--gold)"
        oninput="document.getElementById('oAvance').value=this.value;document.getElementById('oAvanceSliderVal').textContent=this.value+'%'"
        onchange="document.getElementById('oAvance').value=this.value">
        <span id="oAvanceSliderVal" style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;min-width:40px;color:var(--deep)">${o.avance||0}%</span>`;
      avanceGroup.appendChild(sliderDiv);
      document.getElementById('oAvance').addEventListener('input', e => {
        const sl = document.getElementById('oAvanceSlider');
        const sv = document.getElementById('oAvanceSliderVal');
        if (sl) sl.value = e.target.value;
        if (sv) sv.textContent = e.target.value+'%';
      });
    }
  } else {
    const sl = document.getElementById('oAvanceSlider');
    const sv = document.getElementById('oAvanceSliderVal');
    if (sl) sl.value = o.avance||0;
    if (sv) sv.textContent = (o.avance||0)+'%';
  }

  openModal('modal-nuevo-objetivo');
}

async function saveEditObjetivo() {
  if (!AppState.editingId) return;
  const titulo = document.getElementById('oTitulo').value.trim();
  if (!titulo) { showToast('El título es obligatorio', 'error'); return; }

  const avance = parseInt(document.getElementById('oAvance').value) || 0;
  let estado = document.getElementById('oEstado').value;
  // Si el usuario no cambió el estado manualmente, sincronizar con avance
  if (avance === 100) estado = 'Completado';
  if (avance === 0 && estado === 'Completado') estado = 'Pendiente';

  const data = {
    titulo,
    prioridad:    document.getElementById('oPrioridad').value,
    estado,
    avance,
    fechaLimite:  document.getElementById('oFecha').value,
    fecha:        document.getElementById('oFecha').value,
    descripcion:  document.getElementById('oDesc').value,
  };

  try {
    await updateDoc(doc(db, 'objetivos', String(AppState.editingId)), data);
    showToast('Objetivo actualizado ✓', 'success');
    closeModal('modal-nuevo-objetivo');
    // Limpiar modal
    const title = document.querySelector('#modal-nuevo-objetivo .modal-title');
    if (title) title.textContent = 'Nuevo Objetivo';
    const btn = document.querySelector('#modal-nuevo-objetivo .btn-primary');
    if (btn) { btn.textContent='Guardar Objetivo'; btn.setAttribute('onclick','saveObjetivo()'); }
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteObjetivo(id) {
  if (confirm('¿Eliminar este objetivo?')) {
    try {
      await deleteDoc(doc(db, 'objetivos', String(id)));
      showToast('Objetivo eliminado', 'warning');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
}

// ============================================================
// ██████  TAREAS — CRUD COMPLETO CON EDICIÓN INLINE
// ============================================================
function renderGlobalTareas() {
  const tbody = document.getElementById('global-tareas-tbody');
  if (!tbody) return;
  if (!AppState.tareas.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-m)">Sin tareas registradas.</td></tr>`;
    return;
  }
  tbody.innerHTML = AppState.tareas.map(t => {
    const m = AppState.matrices.find(x => String(x.id)===String(t.matrizId));
    return `<tr>
      <td style="font-weight:500;color:var(--deep)">${t.titulo}</td>
      <td style="font-size:12px">${m ? m.icono+' '+m.nombre : 'General'}</td>
      <td style="font-size:12px">${t.responsable||'–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>${estadoBadge(t.estado)}</td>
      <td>${progressBar(t.avance||0)}</td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha||'–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTareaGlobal('${t.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function renderTareasTab() {
  const tbody = document.getElementById('tareas-tbody');
  if (!tbody) return;
  const all      = AppState.tareas.filter(t => String(t.matrizId)===String(AppState.currentMatrizId));
  const tareas   = all.filter(t => !t.esPeticion);
  const peticiones = all.filter(t =>  t.esPeticion);

  if (!all.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-m);font-size:12.5px">Sin tareas ni peticiones. Use el botón + para agregar.</td></tr>`;
    return;
  }

  // Separador visual de tareas normales
  const tareasRows = tareas.map(t => `
    <tr>
      <td>
        <div style="font-weight:500;color:var(--deep)">${t.titulo}</div>
        <div style="font-size:11px;color:var(--text-m)">${t.desc||t.descripcion||''}</div>
      </td>
      <td style="font-size:12px">${t.responsable||'–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>
        <select style="background:transparent;border:1px solid var(--border);border-radius:4px;
          font-size:11px;padding:2px 6px;color:var(--text-b);cursor:pointer;font-family:'DM Sans',sans-serif"
          onchange="quickUpdateTarea('${t.id}','estado',this.value)">
          ${['Pendiente','En progreso','Al día','Completado','Crítico'].map(e =>
            `<option value="${e}" ${t.estado===e?'selected':''}>${e}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;min-width:160px">
          <input type="range" min="0" max="100" value="${t.avance||0}"
            style="width:80px;accent-color:var(--gold);cursor:pointer"
            oninput="this.nextElementSibling.textContent=this.value+'%'"
            onchange="updateTareaProgress('${t.id}',this.value)">
          <span style="font-size:11px;font-family:'DM Mono',monospace;min-width:32px">${t.avance||0}%</span>
        </div>
      </td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha||'–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTarea('${t.id}')">✕</button>
      </td>
    </tr>`).join('');

  // Filas de peticiones con estilo diferenciado
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
        <div style="font-size:11px;color:var(--text-m);margin-top:2px">${t.descripcion||''}</div>
      </td>
      <td style="font-size:12px">
        <div style="font-weight:500;color:var(--deep)">👤 ${t.solicitante||t.responsable||'–'}</div>
        <div style="font-size:10px;color:var(--text-m)">Solicitante</div>
      </td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>
        <select style="background:transparent;border:1px solid var(--border);border-radius:4px;
          font-size:11px;padding:2px 6px;color:var(--text-b);cursor:pointer;font-family:'DM Sans',sans-serif"
          onchange="quickUpdateTarea('${t.id}','estado',this.value)">
          ${['Pendiente','En progreso','Al día','Completado','Crítico'].map(e =>
            `<option value="${e}" ${t.estado===e?'selected':''}>${e}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;min-width:160px">
          <input type="range" min="0" max="100" value="${t.avance||0}"
            style="width:80px;accent-color:var(--gold);cursor:pointer"
            oninput="this.nextElementSibling.textContent=this.value+'%'"
            onchange="updateTareaProgress('${t.id}',this.value)">
          <span style="font-size:11px;font-family:'DM Mono',monospace;min-width:32px">${t.avance||0}%</span>
        </div>
      </td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha||'–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTarea('${t.id}')">✕</button>
      </td>
    </tr>`).join('')}` : '';

  tbody.innerHTML = tareasRows + peticionRows;
}

async function updateTareaProgress(id, value) {
  const pct = parseInt(value);
  let nuevoEstado = 'En progreso';
  if (pct === 0)   nuevoEstado = 'Pendiente';
  if (pct === 100) nuevoEstado = 'Completado';
  if (pct >= 80 && pct < 100) nuevoEstado = 'Al día';
  try {
    await updateDoc(doc(db, 'tareas', String(id)), { avance: pct, estado: nuevoEstado });
    const t = AppState.tareas.find(x => String(x.id)===String(id));
    if (t) { t.avance = pct; t.estado = nuevoEstado; }
    renderEstadoTab();
  } catch(e) { showToast('Error al actualizar progreso', 'error'); }
}

window.quickUpdateTarea = async function(id, field, value) {
  try {
    await updateDoc(doc(db, 'tareas', String(id)), { [field]: value });
    const t = AppState.tareas.find(x => String(x.id)===String(id));
    if (t) t[field] = value;
    renderEstadoTab();
  } catch(e) { showToast('Error al actualizar', 'error'); }
}

async function saveTarea() {
  const titulo = document.getElementById('tTitulo').value.trim();
  if (!titulo) { showToast('El título es obligatorio', 'error'); return; }

  const data = {
    matrizId:    AppState.currentMatrizId || document.getElementById('tMatriz')?.value || "",
    titulo,
    responsable: document.getElementById('tResponsable').value || 'Analista Corp.',
    prioridad:   document.getElementById('tPrioridad').value,
    estado:      document.getElementById('tEstado').value,
    avance:      parseInt(document.getElementById('tAvance')?.value)||0,
    fecha:       document.getElementById('tFecha').value || new Date().toISOString().split('T')[0],
    desc:        '',
    obs:         document.getElementById('tObs')?.value||'',
    fechaCreacion: new Date().toISOString().split('T')[0]
  };

  try {
    await addDoc(collection(db, 'tareas'), data);
    showToast('Tarea guardada ✓', 'success');
    closeModal('modal-nueva-tarea');
    document.getElementById('tTitulo').value = '';
    if (document.getElementById('tObs')) document.getElementById('tObs').value = '';
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ── EDITAR TAREA ──────────────────────────────────────────────
function editTarea(id) {
  const t = AppState.tareas.find(x => String(x.id)===String(id));
  if (!t) return;

  AppState.editingId = id;
  const setVal = (elId, val) => { const el=document.getElementById(elId); if(el) el.value=val||''; };
  setVal('tTitulo',      t.titulo);
  setVal('tResponsable', t.responsable||'');
  setVal('tPrioridad',   t.prioridad||'Media');
  setVal('tEstado',      t.estado||'Pendiente');
  setVal('tFecha',       t.fecha||'');
  setVal('tObs',         t.obs||'');
  setVal('tAvance',      t.avance||0);

  // Selector de matriz
  const matSel = document.getElementById('tMatriz');
  if (matSel) {
    populateTareaMatrizSelect();
    matSel.value = t.matrizId||'';
  }

  // Slider de avance
  let swrap = document.getElementById('tAvanceSliderWrap');
  if (!swrap) {
    const avGrp = document.getElementById('tAvance')?.closest('.form-group');
    if (avGrp) {
      const d = document.createElement('div');
      d.id = 'tAvanceSliderWrap';
      d.style = 'margin-top:6px;display:flex;align-items:center;gap:10px';
      d.innerHTML = `<input type="range" id="tAvanceSlider" min="0" max="100" value="${t.avance||0}"
        style="flex:1;accent-color:var(--gold)"
        oninput="document.getElementById('tAvance').value=this.value;document.getElementById('tAvanceSliderVal').textContent=this.value+'%'">
        <span id="tAvanceSliderVal" style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;min-width:40px;color:var(--deep)">${t.avance||0}%</span>`;
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
    if (sl) sl.value = t.avance||0;
    if (sv) sv.textContent = (t.avance||0)+'%';
  }

  const title = document.querySelector('#modal-nueva-tarea .modal-title');
  if (title) title.textContent = 'Editar Tarea';
  const btn = document.querySelector('#modal-nueva-tarea .btn-primary');
  if (btn) { btn.textContent='💾 Guardar Cambios'; btn.setAttribute('onclick','saveEditTarea()'); }

  openModal('modal-nueva-tarea');
}

async function saveEditTarea() {
  if (!AppState.editingId) return;
  const titulo = document.getElementById('tTitulo').value.trim();
  if (!titulo) { showToast('El título es obligatorio', 'error'); return; }

  const avance = parseInt(document.getElementById('tAvance').value)||0;
  let estado = document.getElementById('tEstado').value;
  if (avance === 100) estado = 'Completado';
  if (avance >= 80 && avance < 100 && estado !== 'Crítico') estado = 'Al día';

  const data = {
    titulo,
    responsable: document.getElementById('tResponsable').value,
    prioridad:   document.getElementById('tPrioridad').value,
    estado,
    avance,
    fecha:       document.getElementById('tFecha').value,
    obs:         document.getElementById('tObs')?.value||'',
    matrizId:    document.getElementById('tMatriz')?.value || AppState.currentMatrizId || ''
  };

  try {
    await updateDoc(doc(db, 'tareas', String(AppState.editingId)), data);
    showToast('Tarea actualizada ✓', 'success');
    closeModal('modal-nueva-tarea');
    const title = document.querySelector('#modal-nueva-tarea .modal-title');
    if (title) title.textContent = 'Nueva Tarea';
    const btn = document.querySelector('#modal-nueva-tarea .btn-primary');
    if (btn) { btn.textContent='Guardar Tarea'; btn.setAttribute('onclick','saveTarea()'); }
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteTarea(id) {
  if (confirm('¿Eliminar esta tarea?')) {
    try {
      await deleteDoc(doc(db, 'tareas', String(id)));
      showToast('Tarea eliminada', 'warning');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
}

async function deleteTareaGlobal(id) { return deleteTarea(id); }

function filterTareasGlobal(val) {
  const filtered = val
    ? AppState.tareas.filter(t => t.titulo.toLowerCase().includes(val.toLowerCase()) || t.estado===val)
    : AppState.tareas;
  const tbody = document.getElementById('global-tareas-tbody');
  if (!tbody) return;
  if (!filtered.length) { tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-m)">Sin resultados.</td></tr>`; return; }
  tbody.innerHTML = filtered.map(t => {
    const m = AppState.matrices.find(x => String(x.id)===String(t.matrizId));
    return `<tr>
      <td style="font-weight:500;color:var(--deep)">${t.titulo}</td>
      <td style="font-size:12px">${m ? m.icono+' '+m.nombre : 'General'}</td>
      <td style="font-size:12px">${t.responsable||'–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>${estadoBadge(t.estado)}</td>
      <td>${progressBar(t.avance||0)}</td>
      <td style="font-family:'DM Mono';font-size:12px">${t.fecha||'–'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--warm)" onclick="editTarea('${t.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--red)"  onclick="deleteTareaGlobal('${t.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ============================================================
// ██████  ESTADO OPERATIVO — Se actualiza automáticamente
// ============================================================
function renderEstadoTab() {
  const container = document.getElementById('estado-cards');
  if (!container) return;
  const m = AppState.matrices.find(x => String(x.id)===String(AppState.currentMatrizId));
  if (!m) return;

  const objM    = AppState.objetivos.filter(o => String(o.matrizId)===String(m.id));
  const tarM    = AppState.tareas.filter(t => String(t.matrizId)===String(m.id));
  const avgAvance = objM.length ? Math.round(objM.reduce((s,o)=>s+(o.avance||0),0)/objM.length) : 0;
  const criticas  = tarM.filter(t => t.estado==='Crítico').length;
  const completadas = tarM.filter(t => t.estado==='Completado'||t.estado==='Al día').length;

  // Calcular estado automáticamente
  let estadoAuto = 'Al día', estadoEmoji = '🟢', estadoClass = 'var(--green-bg)', estadoBorderColor = 'var(--green)';
  if (criticas > 0) { estadoAuto='Crítico'; estadoEmoji='🔴'; estadoClass='var(--red-bg)'; estadoBorderColor='var(--red)'; }
  else if (avgAvance < 30 && objM.length > 0) { estadoAuto='Pendiente'; estadoEmoji='🟡'; estadoClass='var(--yellow-bg)'; estadoBorderColor='var(--yellow)'; }

  container.innerHTML = `
    <!-- Banner Estado -->
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
        <!-- Cambio manual de estado -->
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--text-m)">Estado manual:</span>
          <select style="background:var(--bg-card);border:1px solid var(--border-g);border-radius:var(--radius-s);
            padding:6px 10px;font-size:12px;color:var(--deep);cursor:pointer;font-family:'DM Sans',sans-serif"
            onchange="updateMatrizEstado('${m.id}',this.value)">
            ${['Al día','Pendiente','Crítico'].map(e =>
              `<option value="${e}" ${m.estado===e?'selected':''}>${e==='Al día'?'🟢':e==='Crítico'?'🔴':'🟡'} ${e}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Métricas -->
    <div style="padding:16px;background:var(--gold-10);border-radius:var(--radius-s);text-align:center;border:1px solid var(--border)">
      <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:var(--deep)">${avgAvance}%</div>
      <div style="font-size:11px;color:var(--text-m);margin-top:4px">Avance Promedio Objetivos</div>
      <div class="progress-bar" style="height:6px;margin-top:10px">
        <div class="progress-fill ${avgAvance>=70?'green':avgAvance>=40?'':'red'}" style="width:${avgAvance}%"></div>
      </div>
    </div>
    <div style="padding:16px;background:${criticas>0?'var(--red-bg)':'var(--gold-10)'};border-radius:var(--radius-s);text-align:center;border:1px solid var(--border)">
      <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:${criticas>0?'var(--red)':'var(--green)'}">${criticas}</div>
      <div style="font-size:11px;color:var(--text-m);margin-top:4px">Tareas Críticas</div>
    </div>
    <div style="padding:16px;background:var(--gold-10);border-radius:var(--radius-s);text-align:center;border:1px solid var(--border)">
      <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:var(--green)">${completadas}</div>
      <div style="font-size:11px;color:var(--text-m);margin-top:4px">Tareas Completadas</div>
    </div>

    <!-- Barras de estado de tareas -->
    ${tarM.length ? `
    <div style="grid-column:1/-1;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-s);padding:16px">
      <div style="font-size:12px;font-weight:600;color:var(--deep);margin-bottom:12px">Distribución de Tareas</div>
      ${['Completado','Al día','En progreso','Pendiente','Crítico'].map(estado => {
        const count = tarM.filter(t=>t.estado===estado).length;
        const pct   = tarM.length ? Math.round(count/tarM.length*100) : 0;
        const color = estado==='Completado'||estado==='Al día' ? 'green'
                    : estado==='Crítico' ? 'red'
                    : estado==='Pendiente' ? 'yellow' : '';
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

    <!-- Objetivos resumen -->
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
          <input type="range" min="0" max="100" value="${o.avance||0}"
            style="width:100px;accent-color:var(--gold);cursor:pointer"
            oninput="this.nextElementSibling.textContent=this.value+'%'"
            onchange="updateObjetivoProgress('${o.id}',this.value)">
          <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;min-width:36px;color:var(--deep)">${o.avance||0}%</span>
        </div>
      </div>`).join('')}
    </div>` : ''}`;
}

window.updateMatrizEstado = async function(id, estado) {
  try {
    await updateDoc(doc(db, 'matrices', String(id)), {
      estado, ultimaActualizacion: new Date().toISOString().split('T')[0]
    });
    const m = AppState.matrices.find(x => String(x.id)===String(id));
    if (m) {
      m.estado = estado;
      renderDetailInfo(m);
      renderDetailIndicators(m);
    }
    showToast(`Estado actualizado a "${estado}" ✓`, 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ============================================================
// GESTIÓN OPERATIVA
// ============================================================
function renderGestionGlobal() {
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
        <span>${AppState.matrices.find(m=>String(m.id)===String(g.matrizId))?.nombre||g.matrizId||'General'}</span>
        <span style="font-family:'DM Mono'">${g.fecha}</span>
      </div>
      <div style="font-size:13px;color:var(--deep);white-space:pre-wrap">${g.texto||g.titulo||''}</div>
    </div>`).join('');
}

function renderGestionRegistros() {
  const container = document.getElementById('gestion-registros');
  if (!container) return;
  const list = AppState.gestionGlobal.filter(g => String(g.matrizId)===String(AppState.currentMatrizId));
  if (!list.length) {
    container.innerHTML = `<p style="font-size:12px;color:var(--text-m)">No hay entradas en la bitácora.</p>`;
    return;
  }
  container.innerHTML = list.map(g => `
    <div style="padding:10px;background:var(--gold-10);border-radius:var(--radius-s);margin-bottom:8px">
      <div style="font-family:'DM Mono';font-size:10px;color:var(--text-l);margin-bottom:2px">${g.fecha}</div>
      <div style="font-size:12.5px;color:var(--deep);line-height:1.5;white-space:pre-wrap">${g.texto||g.titulo||''}</div>
    </div>`).join('');
}

async function saveGestion() {
  const editorEl = document.getElementById('gestionEditor');
  const txt = (editorEl ? editorEl.innerText : '').trim();
  if (!txt) return;
  const data = { matrizId:AppState.currentMatrizId||"", fecha:new Date().toLocaleString('es-CO'), texto:txt, tipo:'matriz' };
  try {
    await addDoc(collection(db,'gestion'),data);
    if (editorEl) editorEl.innerText='';
    showToast('Bitácora guardada ✓','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function saveGestionGlobal() {
  const editorEl = document.getElementById('gestionGlobalEditor');
  const txt = (editorEl ? editorEl.innerText : '').trim();
  if (!txt) return;
  const matSel = document.getElementById('gestion-matriz-select');
  const matrizId = matSel?.value || 'General';
  const data = { matrizId, fecha:new Date().toLocaleString('es-CO'), texto:txt, tipo:'global' };
  try {
    await addDoc(collection(db,'gestion'),data);
    if (editorEl) editorEl.innerText='';
    showToast('Registro global guardado ✓','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function formatText(cmd)  { const e=document.getElementById('gestionEditor');       if(e){ e.focus(); document.execCommand(cmd,false,null); } }
function formatTextG(cmd) { const e=document.getElementById('gestionGlobalEditor'); if(e){ e.focus(); document.execCommand(cmd,false,null); } }

function insertTemplate(tipo) {
  const e = document.getElementById('gestionEditor');
  if (!e) return;
  const t = { incidente:'[INCIDENTE]\n• Impacto: \n• Causa Raíz: \n• Solución: ', monitoreo:'[MONITOREO]\n• Sistema: \n• Estado: \n• Observaciones: ', validacion:'[VALIDACIÓN]\n• Proceso: \n• Resultado: \n• Observaciones: ' };
  e.focus(); document.execCommand('insertText',false,t[tipo]||t.incidente);
}
function insertTemplateG(tipo) {
  const e = document.getElementById('gestionGlobalEditor');
  if (!e) return;
  const t = { monitoreo:'[MONITOREO GLOBAL]\n• Sistema: \n• Estado: \n• Observaciones: ', validacion:'[VALIDACIÓN GLOBAL]\n• Proceso: \n• Resultado: \n• Observaciones: ', incidente:'[INCIDENTE GLOBAL]\n• Impacto: \n• Causa Raíz: \n• Solución: ' };
  e.focus(); document.execCommand('insertText',false,t[tipo]||t.monitoreo);
}

// ============================================================
// DIAGRAMAS
// ============================================================
function renderGlobalDiagramas() {
  const container = document.getElementById('global-diagramas-grid');
  if (!container) return;
  if (!AppState.diagramas.length) { container.innerHTML=`<p style="font-size:13px;color:var(--text-m);text-align:center;padding:20px">Sin diagramas.</p>`; return; }
  container.innerHTML = AppState.diagramas.map(d => {
    const m = AppState.matrices.find(x => String(x.id)===String(d.matrizId));
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--ivory);border:1px solid var(--gold-20);border-radius:var(--radius-s);margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">${d.emoji||'🖼'}</span>
        <div>
          <div style="font-weight:500;font-size:13px;color:var(--deep)">${d.nombre} (${d.version})</div>
          <div style="font-size:11px;color:var(--text-m)">${d.categoria} · ${m?m.nombre:'–'}</div>
        </div>
      </div>
      <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteDiagrama('${d.id}')">✕</button>
    </div>`;
  }).join('');
}

function renderDiagramasTab() {
  const container = document.getElementById('diagramas-grid');
  if (!container) return;
  const list = AppState.diagramas.filter(d => String(d.matrizId)===String(AppState.currentMatrizId));
  if (!list.length) { container.innerHTML='<p style="font-size:12.5px;color:var(--text-m);grid-column:1/-1">Sin diagramas.</p>'; return; }
  container.innerHTML = list.map(d => `
    <div style="padding:12px;background:var(--ivory);border:1px solid var(--gold-20);border-radius:var(--radius-s);position:relative">
      <div style="font-size:22px;margin-bottom:4px">${d.emoji||'📋'}</div>
      <div style="font-size:13px;font-weight:500;color:var(--deep)">${d.nombre}</div>
      <div style="font-size:11px;color:var(--text-m)">${d.categoria} · ${d.version}</div>
      <p style="font-size:11.5px;color:var(--text-b);margin-top:6px">${d.desc||''}</p>
      <button class="btn btn-sm" style="position:absolute;top:10px;right:10px;color:var(--red);background:transparent" onclick="deleteDiagrama('${d.id}')">✕</button>
    </div>`).join('');
}

async function saveDiagrama() {
  const nombre = document.getElementById('dNombre').value.trim();
  if (!nombre) { showToast('Nombre del diagrama requerido','error'); return; }
  const data = {
    matrizId:    AppState.currentMatrizId||"",
    nombre,
    categoria:   document.getElementById('dCategoria').value,
    version:     document.getElementById('dVersion').value||'v1.0',
    fecha:       new Date().toISOString().split('T')[0],
    desc:        document.getElementById('dDesc').value,
    emoji:       document.getElementById('dEmoji')?.value||'📋'
  };
  try {
    await addDoc(collection(db,'diagramas'),data);
    closeModal('modal-nuevo-diagrama');
    document.getElementById('dNombre').value='';
    showToast('Diagrama guardado ✓','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteDiagrama(id) {
  if (confirm('¿Eliminar este diagrama?')) {
    try { await deleteDoc(doc(db,'diagramas',String(id))); showToast('Diagrama eliminado','warning'); }
    catch(e) { showToast('Error: '+e.message,'error'); }
  }
}

function showFileName(input) { const d=document.getElementById('dFileName'); if(d&&input.files.length) d.textContent=input.files[0].name; }
function handleDrop(e) { const f=e.dataTransfer?.files; if(f?.length){ const d=document.getElementById('dFileName'); if(d) d.textContent=f[0].name; } }

// ============================================================
// REPORTES
// ============================================================
function renderReportes() {
  const tbody = document.getElementById('reportes-tbody');
  if (!tbody) return;
  if (!AppState.reportes.length) { tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-m)">Sin reportes.</td></tr>`; return; }
  tbody.innerHTML = AppState.reportes.map(r => {
    const m = AppState.matrices.find(x => String(x.id)===String(r.matrizId));
    return `<tr>
      <td style="font-weight:500;color:var(--deep)">${r.titulo}</td>
      <td style="font-size:12px">${m ? m.icono+' '+m.nombre : 'General'}</td>
      <td style="font-size:12px">${r.tipo}</td>
      <td>${estadoBadge(r.estado)}</td>
      <td style="font-family:'DM Mono';font-size:12px">${r.fecha||'–'}</td>
      <td><button class="btn btn-ghost" style="color:var(--red);padding:4px 8px" onclick="deleteReporte('${r.id}')">✕</button></td>
    </tr>`;
  }).join('');
}

async function saveReporte() {
  const titulo = document.getElementById('rTitulo').value.trim();
  if (!titulo) { showToast('Título requerido','error'); return; }
  const data = {
    titulo,
    tipo:      document.getElementById('rTipo').value,
    matrizId:  document.getElementById('rMatriz').value||null,
    estado:    document.getElementById('rEstado').value,
    fecha:     new Date().toISOString().split('T')[0],
    contenido: document.getElementById('rContenido').value
  };
  try {
    await addDoc(collection(db,'reportes'),data);
    closeModal('modal-nuevo-reporte');
    ['rTitulo','rContenido'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    showToast('Reporte guardado ✓','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteReporte(id) {
  if (confirm('¿Eliminar este reporte?')) {
    try { await deleteDoc(doc(db,'reportes',String(id))); showToast('Reporte eliminado','warning'); }
    catch(e) { showToast('Error: '+e.message,'error'); }
  }
}

// ============================================================
// HISTORIAL / ACTIVIDAD
// ============================================================
function renderHistorialTab() {
  const container = document.getElementById('historial-timeline');
  if (!container) return;
  const list = AppState.gestionGlobal.filter(g => String(g.matrizId)===String(AppState.currentMatrizId));
  if (!list.length) { container.innerHTML='<p style="font-size:12px;color:var(--text-m);padding:12px">Sin registros.</p>'; return; }
  container.innerHTML = `<div style="padding-left:10px;border-left:2px solid var(--gold)">
    ${list.map(g=>`
      <div style="margin-bottom:12px">
        <div style="font-family:'DM Mono';font-size:10.5px;color:var(--text-l);margin-bottom:3px">${g.fecha}</div>
        <div style="font-size:12.5px;color:var(--text-b);white-space:pre-wrap">${g.texto||''}</div>
      </div>`).join('')}
  </div>`;
}

function renderActividad() {
  const container = document.getElementById('actividad-timeline');
  if (!container) return;
  const all = [...AppState.gestionGlobal].slice(0,20);
  if (!all.length) { container.innerHTML=`<div style="font-size:12.5px;color:var(--text-b);text-align:center;padding:20px">Sin actividad.</div>`; return; }
  container.innerHTML = all.map(g=>`
    <div style="padding:10px;border-bottom:1px solid var(--gold-20);display:flex;gap:12px">
      <div style="font-size:16px">📝</div>
      <div>
        <div style="font-size:12.5px;color:var(--deep)">${(g.texto||'').substring(0,80)}${(g.texto||'').length>80?'...':''}</div>
        <div style="font-size:10.5px;color:var(--text-l);font-family:'DM Mono';margin-top:2px">${g.fecha}</div>
      </div>
    </div>`).join('');
}

// ============================================================
// PERFIL PROFESIONAL
// ============================================================
function renderProfileApps() {
  const container = document.getElementById('profileApps');
  if (!container) return;
  container.innerHTML = AppState.matrices.map(m=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:18px">${m.icono||'◈'}</span>
      <span style="font-size:13px;color:var(--text-b)">${m.nombre} (${m.tipo})</span>
    </div>`).join('');
}

function applyPerfilToDOM(data) {
  const set = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  const initials = (data.nombre||'AC').split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase()||'AC';
  set('profileName',  data.nombre||'Analista Corporativo');
  set('profileRole',  (data.cargo||'Analista Senior')+' · '+(data.area||''));
  set('profileArea',  data.area||'');
  set('profileEmail', data.email||'');
  set('profilePhone', data.phone||'');
  set('profileCargo', data.cargo||'');
  set('profileDesc',  data.desc||'');
  const skillsEl = document.getElementById('profileSkills');
  if (skillsEl && data.skills) {
    skillsEl.innerHTML = data.skills.split(',').map(s=>s.trim()).filter(Boolean)
      .map(s=>`<span class="skill-tag">${s}</span>`).join('');
  }
  [document.getElementById('profileAvatarBig'),
   document.querySelector('.user-avatar-sm'),
   document.querySelector('.header-avatar')
  ].forEach(el => { if(el) el.textContent=initials; });
  const nameSmEl = document.querySelector('.user-name-sm');
  if (nameSmEl) nameSmEl.textContent = data.nombre||'Analista Corp.';
}

function prefillPerfilModal() {
  const p = AppState.perfil||{};
  const setVal = (id,val) => { const el=document.getElementById(id); if(el) el.value=val||''; };
  setVal('pNombre',p.nombre); setVal('pCargo',p.cargo); setVal('pArea',p.area);
  setVal('pEmail',p.email);   setVal('pPhone',p.phone); setVal('pDesc',p.desc);
  setVal('pSkills',p.skills);
}

async function savePerfil() {
  const get = id => document.getElementById(id)?.value?.trim()||'';
  const data = {
    nombre:    get('pNombre'), cargo:  get('pCargo'),
    area:      get('pArea'),   email:  get('pEmail'),
    phone:     get('pPhone'),  desc:   get('pDesc'),
    skills:    get('pSkills'), updatedAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db,'config','perfil'),data);
    AppState.perfil = data;
    applyPerfilToDOM(data);
    showToast('Perfil guardado ✓','success');
    closeModal('modal-editar-perfil');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

// ============================================================
// CONFIGURACIÓN
// ============================================================
async function saveConfig() {
  const get  = id => document.getElementById(id)?.value||'';
  const getC = id => document.getElementById(id)?.checked ?? true;
  const data = {
    sistemaNombre:  get('configSistemaNombre'),
    zonaHoraria:    get('configZonaHoraria'),
    idioma:         get('configIdioma'),
    tema:           document.getElementById('themeToggleConfig')?.checked ? 'dark' : 'light',
    notifTareas:    getC('configNotifTareas'),
    notifObjetivos: getC('configNotifObjetivos'),
    updatedAt:      new Date().toISOString()
  };
  try {
    await setDoc(doc(db,'config','settings'),data);
    AppState.config = data;
    if (data.tema==='dark') { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','light'); }
    const brandEl = document.querySelector('.brand-name');
    if (brandEl && data.sistemaNombre) brandEl.textContent = data.sistemaNombre.split('—')[0].trim();
    showToast('Configuración guardada ✓','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

function applyConfigToDOM(data) {
  if (!data) return;
  const setVal = (id,val) => { const el=document.getElementById(id); if(el&&val!==undefined) el.value=val; };
  const setChk = (id,val) => { const el=document.getElementById(id); if(el&&val!==undefined) el.checked=val; };
  setVal('configSistemaNombre',data.sistemaNombre); setVal('configZonaHoraria',data.zonaHoraria);
  setVal('configIdioma',data.idioma); setChk('themeToggleConfig',data.tema==='dark');
  setChk('configNotifTareas',data.notifTareas!==false); setChk('configNotifObjetivos',data.notifObjetivos!==false);
  document.querySelectorAll('#page-config .badge-yellow').forEach(b => {
    if (b.textContent==='Pendiente') { b.textContent='Conectado'; b.classList.replace('badge-yellow','badge-green'); }
  });
}

// ============================================================
// ██████  COMENTARIOS ADMIN — Solo visible para el administrador
// ============================================================
function renderAdminComments() {
  const el = document.getElementById('admin-comments-list');
  if (!el) return;

  const matrizComments = AppState.comments.filter(c =>
    String(c.sectionRef) === String(AppState.currentMatrizId)
  );

  // Actualizar badge del tab
  const badge = document.getElementById('adminCommentsCount');
  const tabBadge = document.getElementById('comentariosAdminBadge');
  if (badge) { badge.textContent = matrizComments.length; badge.style.display = matrizComments.length ? 'inline' : 'none'; }
  if (tabBadge) { tabBadge.textContent = matrizComments.length; tabBadge.style.display = matrizComments.length ? 'inline-block' : 'none'; }

  let filtered = matrizComments;
  if (AppState.adminCommentFilter) filtered = filtered.filter(c => c.type === AppState.adminCommentFilter);

  if (!filtered.length) {
    const empty = AppState.adminCommentFilter
      ? `<div style="text-align:center;padding:32px 20px;color:var(--text-m)"><div style="font-size:28px;opacity:0.4;margin-bottom:10px">💬</div><div style="font-size:13px;font-weight:500;color:var(--deep)">Sin comentarios de este tipo</div></div>`
      : `<div style="text-align:center;padding:40px 20px;color:var(--text-m)">
          <div style="font-size:32px;opacity:0.35;margin-bottom:12px">🔒</div>
          <div style="font-size:14px;font-weight:500;color:var(--deep);margin-bottom:6px">Sin comentarios privados aún</div>
          <div style="font-size:12px;color:var(--text-m)">Los comentarios enviados desde el Panel Ejecutivo para esta matriz aparecerán aquí.</div>
        </div>`;
    el.innerHTML = empty;
    return;
  }

  const typeLabel = { general:'💬 General', aprobado:'✅ Aprobado', observacion:'⚠️ Observación', urgente:'🔴 Urgente' };
  el.innerHTML = filtered.map(c => {
    const dt = c.ts
      ? new Date(c.ts).toLocaleString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
      : '–';
    return `
    <div class="admin-comment-card type-${c.type||'general'}">
      <div class="admin-comment-lock">🔒 Solo Admin</div>
      <div class="admin-comment-header">
        <div class="admin-comment-avatar">${c.initials||'JE'}</div>
        <div>
          <div class="admin-comment-author">${c.author||'Panel Ejecutivo'}</div>
          <div class="admin-comment-role">${c.role||'–'}</div>
        </div>
        <div class="admin-comment-meta">
          <span class="badge badge-gold" style="font-size:10px">${typeLabel[c.type]||'💬 General'}</span>
          <span class="admin-comment-time">${dt}</span>
        </div>
      </div>
      <div class="admin-comment-body">${c.text||''}</div>
    </div>`;
  }).join('');
}

window.filterAdminComments = function(type, btn) {
  AppState.adminCommentFilter = type;
  document.querySelectorAll('.admin-comment-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAdminComments();
};

// Actualizar badge del tab cuando cambia la matriz
function updateAdminCommentsBadge() {
  const matrizComments = AppState.comments.filter(c =>
    String(c.sectionRef) === String(AppState.currentMatrizId)
  );
  const tabBadge = document.getElementById('comentariosAdminBadge');
  if (tabBadge) {
    tabBadge.textContent = matrizComments.length;
    tabBadge.style.display = matrizComments.length ? 'inline-block' : 'none';
  }
}

// ============================================================
// FIREBASE — onSnapshot TIEMPO REAL
// ============================================================
function initFirebaseSync() {

  onSnapshot(collection(db,'matrices'), snap => {
    AppState.matrices = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderMatricesGrid();
    updateDashboard();
    renderProfileApps();
    // Poblar selector de matrices en gestión global
    const matSel = document.getElementById('gestion-matriz-select');
    if (matSel) {
      const prev = matSel.value;
      matSel.innerHTML = '<option value="">General</option>' +
        AppState.matrices.map(m=>`<option value="${m.id}">${m.icono||''} ${m.nombre}</option>`).join('');
      if (prev) matSel.value = prev;
    }
    if (AppState.currentMatrizId) {
      const current = AppState.matrices.find(x => String(x.id)===String(AppState.currentMatrizId));
      if (current) { renderDetailInfo(current); renderDetailIndicators(current); }
    }
  }, err => { console.error('Matrices error:',err); showToast('Error de conexión Firebase','error'); });

  onSnapshot(collection(db,'objetivos'), snap => {
    AppState.objetivos = snap.docs.map(d=>({id:d.id,...d.data()}));
    if (document.getElementById('page-objetivos')?.classList.contains('active')) renderGlobalObjetivos();
    if (AppState.currentMatrizId) { renderObjetivosTab(); renderEstadoTab(); renderDetailIndicators(AppState.matrices.find(x=>String(x.id)===String(AppState.currentMatrizId))||{}); }
    updateDashboard();
  }, err => console.error('Objetivos error:',err));

  onSnapshot(collection(db,'tareas'), snap => {
    AppState.tareas = snap.docs.map(d=>({id:d.id,...d.data()}));
    if (document.getElementById('page-tareas')?.classList.contains('active')) renderGlobalTareas();
    if (AppState.currentMatrizId) { renderTareasTab(); renderEstadoTab(); }
    updateDashboard();
  }, err => console.error('Tareas error:',err));

  onSnapshot(collection(db,'diagramas'), snap => {
    AppState.diagramas = snap.docs.map(d=>({id:d.id,...d.data()}));
    if (document.getElementById('page-diagramas')?.classList.contains('active')) renderGlobalDiagramas();
    if (AppState.currentMatrizId) renderDiagramasTab();
  }, err => console.error('Diagramas error:',err));

  onSnapshot(collection(db,'reportes'), snap => {
    AppState.reportes = snap.docs.map(d=>({id:d.id,...d.data()}));
    if (document.getElementById('page-reportes')?.classList.contains('active')) renderReportes();
  }, err => console.error('Reportes error:',err));

  onSnapshot(collection(db,'gestion'), snap => {
    AppState.gestionGlobal = snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    if (document.getElementById('page-gestion')?.classList.contains('active'))   renderGestionGlobal();
    if (document.getElementById('page-actividad')?.classList.contains('active')) renderActividad();
    if (AppState.currentMatrizId) { renderGestionRegistros(); renderHistorialTab(); }
  }, err => console.error('Gestión error:',err));

  onSnapshot(doc(db,'config','perfil'), snap => {
    if (snap.exists()) { AppState.perfil=snap.data(); applyPerfilToDOM(AppState.perfil); renderProfileApps(); }
  }, err => console.error('Perfil error:',err));

  onSnapshot(doc(db,'config','settings'), snap => {
    if (snap.exists()) {
      AppState.config=snap.data(); applyConfigToDOM(AppState.config);
      if (AppState.config.tema==='dark') { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); }
      else if (AppState.config.tema==='light') { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','light'); }
    }
  }, err => console.error('Config error:',err));

  // Comentarios privados del Panel Ejecutivo (soloAdmin: true)
  onSnapshot(query(collection(db,'comments'), orderBy('createdAt','desc')), snap => {
    // Guardamos TODOS los comentarios — filtramos por soloAdmin en el render
    AppState.comments = snap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(c => c.soloAdmin === true);
    // Si el tab de comentarios admin está activo, refrescar
    if (document.getElementById('tab-comentarios-admin')?.classList.contains('active')) {
      renderAdminComments();
    }
    // Siempre actualizar el badge del tab
    updateAdminCommentsBadge();
  }, err => console.error('Comments error:',err));
}

// ============================================================
// TEMA Y DRAG & DROP
// ============================================================
function initThemeConfig() {
  const themeToggle = document.getElementById('themeToggleConfig');
  const savedTheme  = localStorage.getItem('theme');
  const applyTheme  = isDark => {
    if (isDark) { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); if(themeToggle) themeToggle.checked=true; }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','light'); if(themeToggle) themeToggle.checked=false; }
  };
  if (savedTheme==='dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme:dark)').matches)) applyTheme(true);
  themeToggle?.addEventListener('change', e => applyTheme(e.target.checked));
}

function initDragAndDrop() {
  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('highlight'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('highlight'); }));
  dz.addEventListener('drop', handleDrop);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);

  initFirebaseSync();
  initThemeConfig();
  initDragAndDrop();

  renderMatricesGrid();
  updateDashboard();

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.getElementById('notifPanel')?.classList.remove('open');
      AppState.editingId = null;
    }
  });
});
ENDOFSCRIPT
