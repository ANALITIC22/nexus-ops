
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, onSnapshot,
  addDoc, doc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase config (misma del panel admin) ──────────────────
const firebaseConfig = {
  apiKey: "AIzaSyC_R7AzEivuPnI_DOQqp26vMCoGiXwMMSc",
  authDomain: "analitic-195e4.firebaseapp.com",
  projectId: "analitic-195e4",
  storageBucket: "analitic-195e4.firebasestorage.app",
  messagingSenderId: "372700730136",
  appId: "1:372700730136:web:0367a21ba66d824f39446d",
  measurementId: "G-LTHQRY5QTC"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── State ─────────────────────────────────────────────────────
const S = {
  matrices: [], objetivos: [], tareas: [],
  diagramas: [], reportes: [], gestion: [],
  comments: [], perfil: null,
  currentMatrizId: null, commentFilter: ''
};

// ── Exec identity (configurable) ─────────────────────────────
const EXEC = { name: 'Jefe Ejecutivo', initials: 'JE', role: 'Director' };

// ── Clock ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const c = document.getElementById('liveClock');
  const d = document.getElementById('liveDate');
  if(c) c.textContent = now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(d) d.textContent = now.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
setInterval(updateClock,1000);
updateClock();

// ── Navigation ────────────────────────────────────────────────
window.navTo = function(page, navEl) {
  const specialPages = ['gm-matrices','gm-detalle'];

  document.querySelectorAll('.exec-page').forEach(p=>{
    p.classList.remove('active');
    if(specialPages.some(sp=>p.id==='page-'+sp)) p.style.display='none';
  });
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));

  const el = document.getElementById('page-'+page);
  if(el){
    el.classList.add('active');
    if(specialPages.includes(page)) el.style.display='block';
  }
  if(navEl) navEl.classList.add('active');
  else {
    document.querySelectorAll('.nav-item').forEach(n=>{
      if(n.getAttribute('onclick')?.includes(`'${page}'`)) n.classList.add('active');
    });
  }

  const titles = {
    overview:'Resumen Ejecutivo', matrices:'Matrices Operativas',
    detalle:'Detalle de Matriz', objetivos:'Objetivos',
    tareas:'Tareas', reportes:'Reportes', gestion:'Gestión Operativa',
    actividad:'Actividad', perfil:'Perfil del Analista',
    'gm-matrices':'Matrices Operativas — Gerente',
    'gm-detalle':'Detalle de Matriz — Gerente'
  };
  const ht = document.getElementById('headerTitle');
  if(ht) ht.textContent = titles[page]||page;

  if(page==='overview')       renderOverview();
  if(page==='matrices')       renderMatricesExec();
  if(page==='objetivos')      renderObjetivosExec();
  if(page==='tareas')         renderTareasExec();
  if(page==='reportes')       renderReportesExec();
  if(page==='gestion')        renderGestionExec();
  if(page==='actividad')      renderActividadExec();
  if(page==='perfil')         renderPerfilExec();
  if(page==='gm-matrices')    renderGMMatrices();
  if(page==='gm-detalle')     renderGMDetalle(window._gmDetalleMatrizId);
}

window.switchDetailTab = function(tabId, btn) {
  document.querySelectorAll('#page-detalle .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#page-detalle .tab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
  const m = S.matrices.find(x=>String(x.id)===String(S.currentMatrizId));
  if(!m) return;
  if(tabId==='tab-info')             renderDetailInfo(m);
  if(tabId==='tab-objetivos')        renderDetailObjetivos(m);
  if(tabId==='tab-tareas')           renderDetailTareas(m);
  if(tabId==='tab-gestion')          renderDetailGestion(m);
  if(tabId==='tab-diagramas')        renderDetailDiagramas(m);
  if(tabId==='tab-historial')        renderDetailHistorial(m);
  if(tabId==='tab-comentarios-det')  renderDetalleComments(m);
}

// ── Helpers ───────────────────────────────────────────────────
function estadoBadge(e) {
  const map = {'Al día':'badge-green','Completado':'badge-green','En progreso':'badge-gold',
    'Pendiente':'badge-yellow','Bloqueado':'badge-gray','Crítico':'badge-red',
    'Aprobado':'badge-green','Borrador':'badge-gray'};
  return `<span class="badge ${map[e]||'badge-gray'}">${e}</span>`;
}
function prioridadBadge(p){
  const m={'Alta':'badge-red','Media':'badge-yellow','Baja':'badge-green'};
  return `<span class="badge ${m[p]||'badge-gray'}">${p}</span>`;
}
function dotColor(e){
  const m={'Al día':'dot-green','Completado':'dot-green','En progreso':'dot-gold',
    'Pendiente':'dot-yellow','Crítico':'dot-red','Bloqueado':'dot-gray'};
  return m[e]||'dot-gray';
}
function progressBar(pct,color='gold'){
  return `<div style="display:flex;align-items:center;gap:8px">
    <div class="progress-bar" style="flex:1;min-width:60px"><div class="progress-fill ${color}" style="width:${pct||0}%"></div></div>
    <span style="font-size:11px;font-family:'DM Mono',monospace;min-width:28px;color:var(--text-m)">${pct||0}%</span>
  </div>`;
}
function critBar(c){
  const levels={'Alta':3,'Media':2,'Baja':1};
  let h='<div class="crit-wrap">';
  for(let i=1;i<=3;i++) h+=`<div class="crit-block ${i<=(levels[c]||0)?'crit-'+(c||'').toLowerCase():''}"></div>`;
  return h+'</div>';
}
function fmtDate(d){
  if(!d) return '–';
  try { return new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}); }
  catch{ return d; }
}
function fmtDateFull(d){
  if(!d) return '–';
  try { return new Date(d).toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
  catch{ return d; }
}
function matrizName(id){ return S.matrices.find(m=>String(m.id)===String(id))?.nombre || '–'; }

// ── RENDER OVERVIEW ───────────────────────────────────────────
function renderOverview(){
  // Stats
  const total   = S.matrices.length;
  const tarTot  = S.tareas.length;
  const tarCrit = S.tareas.filter(t=>t.estado==='Crítico').length;
  const objProg = S.objetivos.filter(o=>o.estado==='En progreso').length;
  const avgProg = S.objetivos.length
    ? Math.round(S.objetivos.reduce((s,o)=>s+(o.avance||0),0)/S.objetivos.length)
    : 0;
  const alDia   = S.matrices.filter(m=>m.estado==='Al día').length;
  const gEstado = tarCrit>0?'🔴 Crítico':alDia===total&&total>0?'🟢 Al día':'🟡 Pendiente';

  document.getElementById('statMatrices').textContent = total;
  document.getElementById('statMatricesDelta').innerHTML = `<span style="color:var(--green)">✓ ${alDia} al día</span>`;
  document.getElementById('statTareas').textContent = tarTot;
  document.getElementById('statTareasDelta').innerHTML = tarCrit>0
    ? `<span style="color:var(--red)">⚠ ${tarCrit} críticas</span>`
    : `<span style="color:var(--green)">Sin tareas críticas</span>`;
  document.getElementById('statObjetivos').textContent = objProg;
  document.getElementById('statObjetivosDelta').textContent = `Promedio: ${avgProg}% avance`;
  document.getElementById('statEstado').textContent = gEstado;
  document.getElementById('statEstadoDelta').textContent = `${total} matrices registradas`;

  const now = new Date();
  document.getElementById('lastSync').textContent =
    `Actualizado · ${now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}`;
  document.getElementById('syncTime').textContent =
    `Sync: ${now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
  const badge = document.getElementById('chartBadge');
  if(badge) badge.textContent = now.toLocaleDateString('es-CO',{month:'long',year:'numeric'});

  renderOverviewCharts();
  renderOverviewMatrices();
  renderOverviewCriticas();
}

function renderOverviewCharts(){
  const ctxM = document.getElementById('chartMatricesExec');
  if(ctxM){
    if(ctxM._ci) ctxM._ci.destroy();
    const labels = S.matrices.map(m=>m.nombre);
    const data   = S.matrices.map(m=>{
      const objs = S.objetivos.filter(o=>String(o.matrizId)===String(m.id));
      return objs.length ? Math.round(objs.reduce((s,o)=>s+(o.avance||0),0)/objs.length) : 0;
    });
    ctxM._ci = new Chart(ctxM,{
      type:'bar',
      data:{ labels, datasets:[{
        label:'Progreso %', data,
        backgroundColor:'rgba(107,158,196,0.4)',
        borderColor:'#42638C', borderWidth:1.5,
        borderRadius:5
      }]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false} },
        scales:{
          y:{ min:0,max:100, ticks:{color:'#7A9BBE',font:{family:'DM Mono',size:9}} },
          x:{ ticks:{color:'#7A9BBE',font:{family:'DM Mono',size:9},maxRotation:30} }
        }
      }
    });
  }

  const ctxT = document.getElementById('chartTareasExec');
  if(ctxT){
    if(ctxT._ci) ctxT._ci.destroy();
    const comp = S.tareas.filter(t=>t.estado==='Completado'||t.estado==='Al día').length;
    const prog = S.tareas.filter(t=>t.estado==='En progreso').length;
    const crit = S.tareas.filter(t=>t.estado==='Crítico').length;
    const pend = S.tareas.filter(t=>t.estado==='Pendiente').length;
    ctxT._ci = new Chart(ctxT,{
      type:'doughnut',
      data:{ labels:['Completadas','En Progreso','Críticas','Pendientes'],
        datasets:[{ data:[comp,prog,crit,pend],
          backgroundColor:['#2E7D52','#42638C','#8B2E2E','#A07800'], borderWidth:0 }]
      },
      options:{ responsive:true,maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });
    document.getElementById('tareasLegend').innerHTML = [
      {l:'Completadas',v:comp,c:'var(--green)'},
      {l:'En Progreso',v:prog,c:'var(--gold)'},
      {l:'Críticas',v:crit,c:'var(--red)'},
      {l:'Pendientes',v:pend,c:'var(--yellow)'}
    ].map(x=>`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:9px;height:9px;border-radius:2px;background:${x.c}"></div>
          <span style="font-size:12px;color:var(--text-b)">${x.l}</span>
        </div>
        <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--text-m)">${x.v}</span>
      </div>`).join('');
  }
}

function renderOverviewMatrices(){
  const el = document.getElementById('overviewMatricesList');
  if(!el) return;
  if(!S.matrices.length){ el.innerHTML=`<div class="empty-state"><div class="empty-icon">◈</div><div class="empty-title">Sin matrices</div></div>`;return; }
  el.innerHTML = S.matrices.slice(0,4).map(m=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:var(--radius-s);
      background:var(--gold-05);margin-bottom:8px;cursor:pointer;transition:background var(--trans)"
      onmouseover="this.style.background='var(--gold-10)'" onmouseout="this.style.background='var(--gold-05)'"
      onclick="openMatrizExec('${m.id}')">
      <div style="font-size:22px">${m.icono||'◈'}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--deep)">${m.nombre}</div>
        <div style="font-size:10px;color:var(--text-m)">${m.tipo||'–'} · ${m.area||'–'}</div>
      </div>
      ${estadoBadge(m.estado)}
    </div>`).join('');
}

function renderOverviewCriticas(){
  const el = document.getElementById('overviewCriticas');
  if(!el) return;
  const criticas = S.tareas.filter(t=>t.estado==='Crítico'||t.prioridad==='Alta');
  if(!criticas.length){ el.innerHTML=`<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-title">Sin tareas críticas</div><div class="empty-text">Todo bajo control</div></div>`;return; }
  el.innerHTML = criticas.slice(0,5).map(t=>`
    <div class="task-row">
      <div class="task-status-dot ${dotColor(t.estado)}"></div>
      <div style="flex:1">
        <div class="task-title">${t.titulo||t.title||'Sin título'}</div>
        <div class="task-meta">${matrizName(t.matrizId)} · ${t.responsable||'–'}</div>
      </div>
      ${prioridadBadge(t.prioridad)}
      ${estadoBadge(t.estado)}
    </div>`).join('');
}

// ── RENDER MATRICES ───────────────────────────────────────────
function renderMatricesExec(){
  const el = document.getElementById('matricesExecGrid');
  if(!el) return;
  if(!S.matrices.length){el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◈</div><div class="empty-title">Sin matrices</div></div>`;return;}
  el.innerHTML = S.matrices.map(m=>{
    const objM = S.objetivos.filter(o=>String(o.matrizId)===String(m.id));
    const tarM = S.tareas.filter(t=>String(t.matrizId)===String(m.id));
    const avgP = objM.length ? Math.round(objM.reduce((s,o)=>s+(o.avance||0),0)/objM.length) : 0;
    return `
    <div class="matrix-exec-card" onclick="openMatrizExec('${m.id}')">
      <div class="matrix-exec-header">
        <div>
          <div class="matrix-exec-icon">${m.icono||'◈'}</div>
          <div class="matrix-exec-name">${m.nombre}</div>
          <div class="matrix-exec-type">${m.tipo||'–'} · ${m.area||'–'}</div>
        </div>
        ${estadoBadge(m.estado)}
      </div>
      <div class="matrix-exec-body">
        <div class="matrix-exec-desc">${m.descripcion||'Sin descripción.'}</div>
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
          <div style="font-size:11px;color:var(--text-m)">👤 ${m.responsable||'–'}</div>
          ${critBar(m.criticidad)}
        </div>
      </div>
    </div>`;
  }).join('');
}

window.openMatrizExec = function(id){
  S.currentMatrizId = id;
  const m = S.matrices.find(x=>String(x.id)===String(id));
  if(!m) return;
  document.getElementById('detailIcon').textContent  = m.icono||'◈';
  document.getElementById('detailTitle').textContent = m.nombre;
  document.getElementById('detailSub').textContent   = `${m.tipo||'–'} · ${m.area||'–'} · ${m.responsable||'–'}`;
  document.getElementById('detailEstadoBadge').innerHTML = estadoBadge(m.estado);
  document.getElementById('detailCritBadge').innerHTML   = critBar(m.criticidad);
  document.querySelectorAll('#page-detalle .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('#page-detalle .tab-content').forEach((c,i)=>c.classList.toggle('active',i===0));
  renderDetailInfo(m);
  navTo('detalle',null);
}

function renderDetailInfo(m){
  const objM = S.objetivos.filter(o=>String(o.matrizId)===String(m.id));
  const tarM = S.tareas.filter(t=>String(t.matrizId)===String(m.id));
  document.getElementById('detailInfoCard').innerHTML = `
    <div class="card-header"><div class="card-title">Información General</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${[['Nombre',m.nombre],['Tipo',m.tipo],['Área',m.area],['Responsable',m.responsable],
         ['Criticidad',m.criticidad||'–'],['Estado',m.estado]].map(([l,v])=>`
        <div>
          <div class="card-label">${l}</div>
          <div style="margin-top:4px;font-size:13px;color:var(--deep);font-weight:500">${v||'–'}</div>
        </div>`).join('')}
      <div style="grid-column:1/-1">
        <div class="card-label">Descripción</div>
        <div style="margin-top:6px;font-size:13px;color:var(--text-b);line-height:1.65;background:var(--gold-05);border-radius:var(--radius-s);padding:12px;border:1px solid var(--border)">${m.descripcion||'–'}</div>
      </div>
      <div>
        <div class="card-label">Fecha Creación</div>
        <div style="margin-top:4px;font-size:12px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(m.fechaCreacion)}</div>
      </div>
      <div>
        <div class="card-label">Última Actualización</div>
        <div style="margin-top:4px;font-size:12px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(m.ultimaActualizacion)}</div>
      </div>
    </div>`;

  const avgP = objM.length ? Math.round(objM.reduce((s,o)=>s+(o.avance||0),0)/objM.length) : 0;
  const stateClass = m.estado==='Al día'?'green':m.estado==='Crítico'?'red':'yellow';
  const stateEmoji = m.estado==='Al día'?'🟢':m.estado==='Crítico'?'🔴':'🟡';
  document.getElementById('detailIndicatorsCard').innerHTML = `
    <div class="card-header"><div class="card-title">Indicadores</div></div>
    <div class="state-banner ${stateClass}">
      <div class="state-emoji">${stateEmoji}</div>
      <div><div class="state-name">${m.estado||'–'}</div><div class="state-sub">Estado Operativo Actual</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center;margin-bottom:16px">
      ${[['Objetivos',objM.length,'◎'],['Tareas',tarM.length,'☑'],
         ['Diagramas',S.diagramas.filter(d=>String(d.matrizId)===String(m.id)).length,'⬡']].map(([l,v,ic])=>`
        <div style="padding:14px;background:var(--gold-05);border-radius:var(--radius-s);border:1px solid var(--border)">
          <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--deep)">${v}</div>
          <div style="font-size:9px;color:var(--text-m);text-transform:uppercase;letter-spacing:0.07em">${l}</div>
        </div>`).join('')}
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-m);margin-bottom:6px">
        <span>Progreso Objetivos</span><span style="font-family:'DM Mono',monospace">${avgP}%</span>
      </div>
      <div class="progress-bar" style="height:10px"><div class="progress-fill ${avgP>=70?'green':avgP>=40?'gold':'red'}" style="width:${avgP}%"></div></div>
    </div>`;
}

function renderDetailObjetivos(m){
  const objs = S.objetivos.filter(o=>String(o.matrizId)===String(m.id));
  const el = document.getElementById('detailObjetivosList');
  if(!objs.length){el.innerHTML=`<div class="card"><div class="empty-state"><div class="empty-icon">◎</div><div class="empty-title">Sin objetivos</div></div></div>`;return;}
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Objetivo</th><th>Prioridad</th><th>Estado</th><th>Avance</th><th>Fecha Límite</th></tr></thead>
    <tbody>${objs.map(o=>`
      <tr>
        <td><div style="font-weight:500;color:var(--deep)">${o.titulo||'–'}</div>
            <div style="font-size:11px;color:var(--text-m);margin-top:2px">${o.descripcion||''}</div></td>
        <td>${prioridadBadge(o.prioridad)}</td>
        <td>${estadoBadge(o.estado)}</td>
        <td>${progressBar(o.avance,o.avance>=70?'green':o.avance>=40?'gold':'red')}</td>
        <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(o.fechaLimite)}</td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
}

function renderDetailTareas(m){
  const todasTareas = S.tareas.filter(t=>String(t.matrizId)===String(m.id));
  const tareas      = todasTareas.filter(t=>!t.esPeticion);
  const peticiones  = todasTareas.filter(t=> t.esPeticion);
  const el = document.getElementById('detailTareasList');

  const tareasHTML = tareas.length
    ? tareas.map(t=>`
      <div class="task-row">
        <div class="task-status-dot ${dotColor(t.estado)}"></div>
        <div style="flex:1">
          <div class="task-title">${t.titulo||t.title||'–'}</div>
          <div class="task-meta">${t.responsable||'–'} · ${fmtDate(t.fecha)}</div>
        </div>
        ${prioridadBadge(t.prioridad)}
        ${estadoBadge(t.estado)}
        <div style="min-width:100px">${progressBar(t.avance,'gold')}</div>
      </div>`).join('')
    : `<div class="empty-state" style="padding:20px 0"><div class="empty-icon">☑</div><div class="empty-title">Sin tareas asignadas</div></div>`;

  const safeNombre = (m.nombre||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const peticionesHTML = peticiones.length
    ? peticiones.map(t=>{
        const petEst = t.peticionEstado || 'pendiente';
        const ecMap = {
          pendiente: { bg:'rgba(184,134,11,0.1)',  border:'rgba(184,134,11,0.3)', color:'var(--yellow)', icon:'🕐', label:'En revisión' },
          aceptada:  { bg:'rgba(74,124,89,0.1)',   border:'rgba(46,125,82,0.25)', color:'var(--green)',  icon:'✅', label:'Aceptada — Tarea activa' },
          denegada:  { bg:'rgba(139,46,46,0.1)',   border:'rgba(139,46,46,0.25)', color:'var(--red)',    icon:'❌', label:'Denegada' }
        };
        const ec = ecMap[petEst] || ecMap.pendiente;
        return `
      <div class="task-row peticion-row" style="border-left:3px solid ${ec.color};padding-left:12px;flex-direction:column;align-items:flex-start;gap:8px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;gap:10px;flex-wrap:wrap">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:4px">
              <div class="task-title">${t.titulo||'–'}</div>
              <span class="peticion-tag">📋 Petición</span>
              <span style="display:inline-flex;align-items:center;gap:3px;background:${ec.bg};border:1px solid ${ec.border};
                color:${ec.color};font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px">
                ${ec.icon} ${ec.label}
              </span>
            </div>
            <div class="task-meta">👤 ${t.solicitante||'–'} · ${fmtDate(t.fecha)}</div>
            ${t.descripcion?`<div style="font-size:11px;color:var(--text-m);margin-top:3px;line-height:1.4">${t.descripcion}</div>`:''}
          </div>
          ${prioridadBadge(t.prioridad)}
        </div>
        ${petEst==='aceptada'?`
          <div style="width:100%;display:flex;align-items:center;gap:10px">
            <span style="font-size:11px;color:var(--text-m)">Avance:</span>
            <div style="flex:1;max-width:200px;background:rgba(30,58,82,0.12);border-radius:20px;height:5px;overflow:hidden">
              <div style="width:${t.avance||0}%;height:100%;background:linear-gradient(90deg,var(--green),#5F9E72);border-radius:20px"></div>
            </div>
            <span style="font-size:11px;font-family:'DM Mono',monospace;color:var(--green);font-weight:600">${t.avance||0}%</span>
          </div>` : ''}
        ${petEst==='denegada'&&t.motivoDenegacion?`
          <div style="width:100%;padding:8px 12px;background:rgba(139,46,46,0.08);border:1px solid rgba(139,46,46,0.2);
            border-radius:var(--radius-s);font-size:11px;color:var(--red);line-height:1.5">
            <strong>Motivo:</strong> ${t.motivoDenegacion}
          </div>` : ''}
      </div>`}).join('')
    : `<div style="font-size:12px;color:var(--text-m);text-align:center;padding:14px 0">No hay peticiones aún para esta matriz.</div>`;

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Tareas</div>
        <span class="badge badge-gray">${tareas.length}</span>
      </div>
      <div>${tareasHTML}</div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            📋 Peticiones
            <span class="peticion-tag">${peticiones.length}</span>
          </div>
          <div style="font-size:11px;color:var(--text-m);margin-top:2px">Solicitudes enviadas desde el Panel Ejecutivo</div>
        </div>
        <button class="btn-nueva-peticion" onclick="abrirModalPeticion('${m.id}','${safeNombre}')">
          + Nueva Petición
        </button>
      </div>
      <div>${peticionesHTML}</div>
    </div>`;
}

function renderDetailGestion(m){
  const gests = S.gestion.filter(g=>String(g.matrizId)===String(m.id));
  const el = document.getElementById('detailGestionList');
  if(!gests.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">✎</div><div class="empty-title">Sin registros de gestión</div></div>`;return;}
  el.innerHTML = gests.map(g=>`
    <div class="gestion-entry">
      <div class="gestion-entry-header">
        <div class="gestion-entry-title">${g.titulo||'Registro operativo'}</div>
        <span style="font-size:10px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(g.fecha)}</span>
      </div>
      <div class="gestion-entry-body">${g.contenido||g.texto||'–'}</div>
    </div>`).join('');
}

function _toDriveViewUrl(raw){
  if(!raw) return null;
  raw = raw.trim();
  if(raw.includes('/preview')||raw.includes('export=view')) return raw;
  const patterns=[
    /drive\.google\.com\/file\/d\/([^/?\s]+)/,
    /drive\.google\.com\/open\?id=([^&\s]+)/,
    /id=([^&\s]+)/,
  ];
  for(const p of patterns){const m=raw.match(p);if(m) return `https://drive.google.com/file/d/${m[1]}/view?usp=sharing`;}
  return raw;
}

function renderDetailDiagramas(m){
  const diags = S.diagramas.filter(d=>String(d.matrizId)===String(m.id));
  const el = document.getElementById('detailDiagramasList');
  if(!diags.length){
    el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⬡</div><div class="empty-title">Sin diagramas</div><div class="empty-text">El administrador aún no ha asignado diagramas para esta matriz</div></div>`;
    return;
  }
  el.innerHTML = diags.map(d=>{
    const linkUrl = _toDriveViewUrl(d.driveLink||d.archivoUrl||d.imageUrl);
    const hasLink = !!linkUrl;
    const clickAttr = hasLink
      ? `onclick="window.open('${linkUrl}','_blank','noopener,noreferrer')" style="cursor:pointer"`
      : '';
    const previewHtml = `
      <div class="diagram-preview" ${clickAttr}
        style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;${hasLink?'cursor:pointer;':''}"
        onmouseover="${hasLink?"this.style.background='var(--gold-10,rgba(212,175,55,.08))'":''}"
        onmouseout="${hasLink?"this.style.background=''":""}">
        <div style="font-size:40px">${hasLink?'📁':(d.emoji||'📊')}</div>
        <div style="font-size:10px;color:var(--text-m);font-family:'DM Mono',monospace;text-align:center">
          ${hasLink?'Clic para abrir en Drive':'Sin link asignado'}
        </div>
        ${hasLink?`<div style="font-size:9px;background:var(--gold-10,rgba(212,175,55,.12));color:var(--gold,#d4af37);border:1px solid var(--border-g,rgba(212,175,55,.2));border-radius:4px;padding:2px 8px;margin-top:2px">🔗 Drive</div>`:''}
      </div>`;
    return `
    <div class="diagram-card">
      ${previewHtml}
      <div class="diagram-info">
        <div class="diagram-name">${d.nombre||'–'}</div>
        <div class="diagram-meta">${d.categoria||'–'} · ${d.version||'–'}</div>
        <div style="margin-top:6px;font-size:11px;color:var(--text-m)">${d.descripcion||d.desc||''}</div>
        <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:10px;color:var(--text-l);font-family:'DM Mono',monospace">${fmtDate(d.fecha)}</div>
          ${hasLink?`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer"
            style="font-size:10px;color:var(--gold);font-weight:600;text-decoration:none;border:1px solid var(--border-g);padding:2px 8px;border-radius:4px;transition:all var(--trans)"
            onmouseover="this.style.background='var(--gold-10)'"
            onmouseout="this.style.background='transparent'">Abrir ↗</a>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderDetailHistorial(m){
  const items = S.gestion.filter(g=>String(g.matrizId)===String(m.id));
  const el = document.getElementById('detailHistorialList');
  if(!items.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">⊙</div><div class="empty-title">Sin historial</div></div>`;return;}
  el.innerHTML = items.map(g=>`
    <div class="timeline-item">
      <div class="timeline-dot green-dot"></div>
      <div class="timeline-date">${fmtDate(g.fecha)}</div>
      <div class="timeline-content">
        <div class="timeline-title">${g.titulo||'Registro operativo'}</div>
        <div class="timeline-desc">${(g.contenido||g.texto||'').substring(0,200)}${(g.contenido||g.texto||'').length>200?'…':''}</div>
      </div>
    </div>`).join('');
}

// ── RENDER OBJECTIVES (global) ────────────────────────────────
function renderObjetivosExec(){
  const tb = document.getElementById('objetivosTable');
  if(!tb) return;
  if(!S.objetivos.length){tb.innerHTML=`<tr><td colspan="6" class="empty-state">Sin objetivos registrados</td></tr>`;return;}
  tb.innerHTML = S.objetivos.map(o=>`
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${o.titulo||'–'}</div>
          <div style="font-size:11px;color:var(--text-m)">${(o.descripcion||'').substring(0,80)}</div></td>
      <td style="font-size:12px;color:var(--text-m)">${matrizName(o.matrizId)}</td>
      <td>${prioridadBadge(o.prioridad)}</td>
      <td>${estadoBadge(o.estado)}</td>
      <td>${progressBar(o.avance,o.avance>=70?'green':o.avance>=40?'gold':'red')}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(o.fechaLimite)}</td>
    </tr>`).join('');
}

// ── RENDER TASKS (global) ─────────────────────────────────────
function renderTareasExec(){
  const tb = document.getElementById('tareasTable');
  if(!tb) return;
  if(!S.tareas.length){tb.innerHTML=`<tr><td colspan="7" class="empty-state">Sin tareas registradas</td></tr>`;return;}
  tb.innerHTML = S.tareas.map(t=>`
    <tr style="${t.esPeticion?'background:linear-gradient(90deg,rgba(211,171,128,0.06),transparent)':''}">
      <td><div class="task-status-dot ${dotColor(t.estado)}" style="margin:0 auto"></div></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-weight:500;color:var(--deep)">${t.titulo||t.title||'–'}</span>
          ${t.esPeticion?`<span class="peticion-tag">📋 Petición</span>`:''}
        </div>
        <div style="font-size:11px;color:var(--text-m)">${(t.descripcion||'').substring(0,60)}</div>
      </td>
      <td style="font-size:12px">${t.esPeticion?`<span title="Solicitante">👤 ${t.solicitante||'–'}</span>`:t.responsable||'–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td>${t.esPeticion?`<span style="font-size:11px;color:var(--text-m)">—</span>`:progressBar(t.avance,'gold')}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(t.fecha)}</td>
      <td style="font-size:11px;color:var(--text-m)">${matrizName(t.matrizId)}</td>
    </tr>`).join('');
}

// ── RENDER REPORTS ────────────────────────────────────────────
function renderReportesExec(){
  const el = document.getElementById('reportesExecList');
  if(!el) return;
  if(!S.reportes.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">▦</div><div class="empty-title">Sin reportes</div></div>`;return;}
  el.innerHTML = S.reportes.map(r=>`
    <div class="report-card">
      <div class="report-header">
        <div>
          <div class="report-title">${r.titulo||'–'}</div>
          <div class="report-meta">${r.tipo||'–'} · ${matrizName(r.matrizId)} · ${fmtDate(r.fecha||r.createdAt)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">${estadoBadge(r.estado)}</div>
      </div>
      <div class="report-body">${r.contenido||'Sin contenido.'}</div>
    </div>`).join('');
}

// ── RENDER GESTIÓN ────────────────────────────────────────────
function renderGestionExec(){
  const el = document.getElementById('gestionExecList');
  if(!el) return;
  if(!S.gestion.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">✎</div><div class="empty-title">Sin registros</div></div>`;return;}
  el.innerHTML = S.gestion.map(g=>`
    <div class="gestion-entry">
      <div class="gestion-entry-header">
        <div>
          <div class="gestion-entry-title">${g.titulo||'Registro operativo'}</div>
          <div style="font-size:11px;color:var(--text-m);margin-top:2px">${matrizName(g.matrizId)}</div>
        </div>
        <span style="font-size:10px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(g.fecha)}</span>
      </div>
      <div class="gestion-entry-body">${g.contenido||g.texto||'–'}</div>
    </div>`).join('');
}

// ── RENDER ACTIVIDAD ──────────────────────────────────────────
function renderActividadExec(){
  const el = document.getElementById('actividadTimeline');
  if(!el) return;
  const all = [...S.gestion].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  if(!all.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">⊙</div><div class="empty-title">Sin actividad</div></div>`;return;}

  // Group by date
  const grouped = {};
  all.forEach(g=>{
    const key = fmtDate(g.fecha);
    if(!grouped[key]) grouped[key]=[];
    grouped[key].push(g);
  });

  el.innerHTML = Object.entries(grouped).map(([date,items])=>`
    <div style="margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;color:var(--warm);letter-spacing:0.1em;
        text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:12px;
        padding-bottom:6px;border-bottom:1px solid var(--border)">${date}</div>
      ${items.map(g=>`
        <div class="timeline-item">
          <div class="timeline-dot green-dot"></div>
          <div class="timeline-content">
            <div class="timeline-title">${g.titulo||'Registro operativo'}</div>
            <div class="timeline-desc">${(g.contenido||g.texto||'').substring(0,180)}${(g.contenido||g.texto||'').length>180?'…':''}</div>
            <div style="margin-top:6px;font-size:10px;color:var(--text-l)">${matrizName(g.matrizId)}</div>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

// ── RENDER PERFIL ─────────────────────────────────────────────
function renderPerfilExec(){
  const p = S.perfil;
  const initials = p?.nombre ? p.nombre.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() : 'AC';
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent   = p?.nombre||'Analista Corporativo';
  document.getElementById('profileRole').textContent   = `${p?.cargo||'Analista Senior'} · ${p?.area||'Tecnología e Innovación'}`;

  const tagsEl = document.getElementById('profileTags');
  if(tagsEl) tagsEl.innerHTML = (p?.skills||'').split(',').filter(Boolean).slice(0,4)
    .map(s=>`<span class="profile-exec-tag">${s.trim()}</span>`).join('');

  const infoEl = document.getElementById('profileInfo');
  if(infoEl) infoEl.innerHTML = [
    ['Nombre Completo', p?.nombre||'–'],
    ['Cargo',          p?.cargo||'–'],
    ['Área',           p?.area||'–'],
    ['Correo',         p?.email||'–'],
    ['Teléfono',       p?.phone||'–'],
  ].map(([l,v])=>`
    <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="card-label" style="min-width:110px">${l}</div>
      <div style="font-size:13px;color:var(--deep);font-weight:500">${v}</div>
    </div>`).join('')
    +`<div style="margin-top:12px"><div class="card-label" style="margin-bottom:8px">Descripción</div>
      <div style="font-size:13px;color:var(--text-b);line-height:1.7;background:var(--gold-05);border-radius:var(--radius-s);padding:12px;border:1px solid var(--border)">${p?.descripcion||'–'}</div></div>`;

  const skillsEl = document.getElementById('profileSkills');
  const skills   = (p?.skills||'').split(',').filter(Boolean);
  if(skillsEl && skills.length){
    skillsEl.innerHTML = skills.map((s,i)=>{
      const pct = 95-i*8 > 50 ? 95-i*8 : 55;
      return `<div class="skill-item">
        <div class="skill-name">${s.trim()}</div>
        <div class="skill-bar-wrap"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
        <div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m);min-width:30px">${pct}%</div>
      </div>`;
    }).join('');
  } else if(skillsEl){ skillsEl.innerHTML=`<div class="empty-state"><div class="empty-text">Sin habilidades registradas</div></div>`; }

  const matsEl = document.getElementById('profileMatrices');
  if(matsEl) matsEl.innerHTML = S.matrices.map(m=>`
    <div style="background:var(--gold-05);border:1px solid var(--border);border-radius:var(--radius-s);
      padding:14px;text-align:center;cursor:pointer;transition:all var(--trans)"
      onmouseover="this.style.background='var(--gold-10)'" onmouseout="this.style.background='var(--gold-05)'"
      onclick="openMatrizExec('${m.id}')">
      <div style="font-size:24px;margin-bottom:6px">${m.icono||'◈'}</div>
      <div style="font-size:12px;font-weight:500;color:var(--deep)">${m.nombre}</div>
      <div style="font-size:10px;color:var(--text-m);margin-top:3px">${m.tipo||'–'}</div>
      ${estadoBadge(m.estado)}
    </div>`).join('');
}

// ── FIREBASE SYNC (tiempo real) ───────────────────────────────
function initSync(){
  const showApp = () => {
    const ov = document.getElementById('loadingOverlay');
    if(ov){ ov.style.display='none'; }
    const pg = document.getElementById('page-overview');
    if(pg) pg.classList.add('active');
  };

  let initialLoad = 0;
  const checkReady = () => { initialLoad++; if(initialLoad>=3) showApp(); };

  onSnapshot(collection(db,'matrices'),(snap)=>{
    S.matrices = snap.docs.map(d=>({id:d.id,...d.data()}));
    checkReady();
    const activePage = document.querySelector('.exec-page.active')?.id?.replace('page-','');
    if(activePage==='overview')    renderOverview();
    if(activePage==='matrices')    renderMatricesExec();
    if(activePage==='tareas')      renderTareasExec();
    if(activePage==='objetivos')   renderObjetivosExec();
    if(activePage==='perfil')      renderPerfilExec();
    if(activePage==='gm-matrices') renderGMMatrices();
  });

  onSnapshot(collection(db,'objetivos'),(snap)=>{
    S.objetivos = snap.docs.map(d=>({id:d.id,...d.data()}));
    checkReady();
    const activePage = document.querySelector('.exec-page.active')?.id?.replace('page-','');
    if(activePage==='overview')    renderOverview();
    if(activePage==='objetivos')   renderObjetivosExec();
    if(activePage==='gm-matrices') renderGMMatrices();
    if(activePage==='gm-detalle')  renderGMDetalle(window._gmDetalleMatrizId);
  });

  onSnapshot(collection(db,'tareas'),(snap)=>{
    S.tareas = snap.docs.map(d=>({id:d.id,...d.data()}));
    checkReady();
    const activePage = document.querySelector('.exec-page.active')?.id?.replace('page-','');
    if(activePage==='overview')    renderOverview();
    if(activePage==='tareas')      renderTareasExec();
    if(activePage==='gm-matrices') renderGMMatrices();
    if(activePage==='gm-detalle')  renderGMDetalle(window._gmDetalleMatrizId);
  });

  onSnapshot(collection(db,'diagramas'),(snap)=>{
    S.diagramas = snap.docs.map(d=>({id:d.id,...d.data()}));
  });

  onSnapshot(collection(db,'reportes'),(snap)=>{
    S.reportes = snap.docs.map(d=>({id:d.id,...d.data()}));
    const activePage = document.querySelector('.exec-page.active')?.id?.replace('page-','');
    if(activePage==='reportes') renderReportesExec();
  });

  onSnapshot(collection(db,'gestion'),(snap)=>{
    S.gestion = snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
    const activePage = document.querySelector('.exec-page.active')?.id?.replace('page-','');
    if(activePage==='gestion')   renderGestionExec();
    if(activePage==='actividad') renderActividadExec();
  });

  onSnapshot(doc(db,'config','perfil'),(snap)=>{
    if(snap.exists()){ S.perfil=snap.data(); }
    const activePage = document.querySelector('.exec-page.active')?.id?.replace('page-','');
    if(activePage==='perfil') renderPerfilExec();
  });

  // ── COMMENTS (solo admin puede ver, aquí solo se envían) ─────
  onSnapshot(collection(db,'comments'),(snap)=>{
    S.comments = snap.docs.map(d=>({id:d.id,...d.data()}));
  });

  // ── LIVE RE-RENDER for Gerente detalle ───────────────────────
  // When data changes, refresh the gerente detalle if it's open
}

// ── MODAL PETICIÓN ────────────────────────────────────────────
let _peticionMatrizId   = null;
let _peticionMatrizNombre = null;

window.abrirModalPeticion = function(matrizId, matrizNombre){
  _peticionMatrizId     = matrizId;
  _peticionMatrizNombre = matrizNombre;
  document.getElementById('peticionNombre').value  = '';
  document.getElementById('peticionTitulo').value  = '';
  document.getElementById('peticionDesc').value    = '';
  document.getElementById('peticionPrioridad').value = 'Media';
  document.getElementById('peticionNombreError').style.display = 'none';
  document.getElementById('peticionTituloError').style.display = 'none';
  document.getElementById('peticionNombre').classList.remove('error');
  document.getElementById('peticionTitulo').classList.remove('error');
  document.getElementById('modalPeticion').style.display = 'flex';
  setTimeout(()=>document.getElementById('peticionNombre').focus(),80);
}

window.cerrarModalPeticion = function(){
  document.getElementById('modalPeticion').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
document.addEventListener('nexus:exec:ready',()=>{
  const _mp = document.getElementById('modalPeticion');
  if(_mp) _mp.addEventListener('click',function(e){ if(e.target===this) cerrarModalPeticion(); });
});

window.enviarPeticion = async function(){
  const nombre    = document.getElementById('peticionNombre').value.trim();
  const titulo    = document.getElementById('peticionTitulo').value.trim();
  const desc      = document.getElementById('peticionDesc').value.trim();
  const prioridad = document.getElementById('peticionPrioridad').value;

  let valid = true;
  if(!nombre){
    document.getElementById('peticionNombreError').style.display='block';
    document.getElementById('peticionNombre').classList.add('error');
    valid=false;
  } else {
    document.getElementById('peticionNombreError').style.display='none';
    document.getElementById('peticionNombre').classList.remove('error');
  }
  if(!titulo){
    document.getElementById('peticionTituloError').style.display='block';
    document.getElementById('peticionTitulo').classList.add('error');
    valid=false;
  } else {
    document.getElementById('peticionTituloError').style.display='none';
    document.getElementById('peticionTitulo').classList.remove('error');
  }
  if(!valid) return;

  const btn = document.getElementById('btnEnviarPeticion');
  if(btn){ btn.disabled=true; btn.textContent='Enviando...'; }
  try {
    await addDoc(collection(db,'tareas'),{
      titulo,
      descripcion: desc,
      responsable: nombre,    // para que sea visible en la tabla de admin
      solicitante: nombre,    // campo exclusivo de peticiones
      prioridad,
      estado: 'Pendiente',
      avance: 0,
      matrizId: _peticionMatrizId,
      matrizNombre: _peticionMatrizNombre,
      esPeticion: true,       // distingue petición de tarea normal
      fecha: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      ts: new Date().toISOString()
    });
    cerrarModalPeticion();
    // Refrescar vista de tareas de la matriz si está abierta
    const m = S.matrices.find(x=>String(x.id)===String(_peticionMatrizId));
    if(m) renderDetailTareas(m);
  } catch(e){ console.error('Error creando petición:',e); }
  finally {
    if(btn){ btn.disabled=false; btn.textContent='Enviar Petición'; }
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('nexus:exec:ready',()=>{
  // Set exec identity (elementos ya inyectados por loader.js)
  const _si = document.getElementById('sidebarExecInitials');
  const _sn = document.getElementById('sidebarExecName');
  if(_si) _si.textContent = EXEC.initials;
  if(_sn) _sn.textContent = EXEC.name;
  // Exponer EXEC para login.js
  window._EXEC_REF = EXEC;
  initSync();
});

// ── GERENTE: RENDER MATRICES ─────────────────────────────────
function renderGMMatrices(){
  const el = document.getElementById('gmMatricesGrid');
  if(!el) return;
  if(!S.matrices.length){
    el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◈</div><div class="empty-title">Sin matrices</div><div class="empty-text">Crea tu primera matriz operativa</div></div>`;
    return;
  }
  el.innerHTML = S.matrices.map(m=>{
    const safeNombre = (m.nombre||'').replace(/'/g,"\\'");
    const objM = S.objetivos.filter(o=>String(o.matrizId)===String(m.id));
    const tarM = S.tareas.filter(t=>String(t.matrizId)===String(m.id));
    return `
    <div class="matrix-exec-card" style="padding:0;overflow:hidden">
      <div class="matrix-exec-header" style="padding:18px 20px;background:linear-gradient(135deg,var(--deep),#2B5980);cursor:pointer"
        onclick="openGMDetalle('${m.id}')">
        <div style="font-size:28px;margin-bottom:6px">${m.icono||'◈'}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--cream)">${m.nombre}</div>
        <div style="font-size:10px;color:rgba(214,232,245,0.5);margin-top:2px">${m.tipo||'–'} · ${m.area||'–'}</div>
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
window.openGMDetalle = function(matrizId){
  if(!window.isGerente()) return;
  window._gmDetalleMatrizId = matrizId;
  const m = S.matrices.find(x=>x.id===matrizId);
  if(!m) return;
  document.getElementById('gmDetalleIcon').textContent   = m.icono||'◈';
  document.getElementById('gmDetalleTitulo').textContent = m.nombre||'–';
  document.getElementById('gmDetalleSub').textContent    = (m.tipo||'–')+' · '+(m.area||'–')+' · '+(m.responsable||'–');
  document.querySelectorAll('#gmDetalleTabs .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('#page-gm-detalle .tab-content').forEach((c,i)=>c.classList.toggle('active',i===0));
  navTo('gm-detalle', null);
}

window.switchGMDetalleTab = function(tabId, btn){
  document.querySelectorAll('#gmDetalleTabs .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#page-gm-detalle .tab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
  if(tabId==='gmd-comentarios'){
    const m = S.matrices.find(x=>String(x.id)===String(window._gmDetalleMatrizId));
    if(m) renderGMDetalleComments(m);
  }
}

function renderGMDetalleComments(m){
  const el = document.getElementById('gmDetalleCommentSection');
  if(!el) return;
  const safeNombre = (m.nombre||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
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

window.postGMDetalleComment = async function(matrizId, matrizNombre){
  const txt  = document.getElementById('gmDetalleCommentText')?.value?.trim();
  const tipo = document.getElementById('gmDetalleCommentType')?.value || 'general';
  if(!txt) return;
  const btn = document.getElementById('btnGMDetalleComment');
  if(btn){ btn.disabled=true; btn.textContent='Enviando...'; }
  try {
    await addDoc(collection(db,'comments'),{
      author: 'Gerente', initials: 'GR', role: 'Gerente',
      text: txt, type: tipo,
      sectionRef: matrizId, sectionName: matrizNombre,
      soloAdmin: true,
      createdAt: serverTimestamp(), ts: new Date().toISOString()
    });
    const ta = document.getElementById('gmDetalleCommentText');
    if(ta) ta.value='';
    const success = document.getElementById('gmDetalleCommentSuccess');
    if(success){ success.style.display='flex'; setTimeout(()=>{ success.style.display='none'; },4000); }
  } catch(e){ console.error(e); }
  finally {
    if(btn){ btn.disabled=false; btn.textContent='Enviar Comentario'; }
  }
}

function renderGMDetalle(matrizId){
  if(!matrizId) return;
  renderGMDetalleObjetivos(matrizId);
  renderGMDetalleTareas(matrizId);
}

function renderGMDetalleObjetivos(matrizId){
  const tb = document.getElementById('gmDetalleObjetivosTable');
  if(!tb) return;
  const objs = S.objetivos.filter(o=>String(o.matrizId)===String(matrizId));
  if(!objs.length){
    tb.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-m)">Sin objetivos. Presiona '+ Nuevo Objetivo' para agregar uno.</td></tr>`;
    return;
  }
  tb.innerHTML = objs.map(o=>`
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${o.titulo||'–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:180px">${(o.descripcion||'').substring(0,60)}${(o.descripcion||'').length>60?'…':''}</td>
      <td>${prioridadBadge(o.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(o.fechaLimite)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:160px">${(o.observaciones||'–').substring(0,50)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('objetivo','editar','${o.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('objetivo','${o.id}','${(o.titulo||'').replace(/'/g,"\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderGMDetalleTareas(matrizId){
  const tb = document.getElementById('gmDetalleTareasTable');
  if(!tb) return;
  const tareas = S.tareas.filter(t=>String(t.matrizId)===String(matrizId) && !t.esPeticion);
  if(!tareas.length){
    tb.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-m)">Sin tareas. Presiona '+ Nueva Tarea' para agregar una.</td></tr>`;
    return;
  }
  tb.innerHTML = tareas.map(t=>`
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${t.titulo||'–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:150px">${(t.descripcion||'').substring(0,50)}${(t.descripcion||'').length>50?'…':''}</td>
      <td style="font-size:12px">${t.responsable||'–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(t.fechaLimite||t.fecha)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:140px">${(t.observaciones||'–').substring(0,40)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('tarea','editar','${t.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('tarea','${t.id}','${(t.titulo||'').replace(/'/g,"\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

// openGMModalDetalle: abre modal pre-seteando la matriz actual
window.openGMModalDetalle = function(type, mode){
  if(!window.isGerente()) return;
  openGMModal(type, mode);
  if(window._gmDetalleMatrizId){
    setTimeout(()=>{
      const sel = document.getElementById('gmf-matrizId');
      if(sel) sel.value = window._gmDetalleMatrizId;
      if(type==='objetivo') window._gmModalPreMatrizId = window._gmDetalleMatrizId;
    }, 60);
  }
}
// ── GERENTE: RENDER OBJETIVOS ─────────────────────────────────
function renderGMObjetivos(){
  const tb = document.getElementById('gmObjetivosTable');
  if(!tb) return;
  if(!S.objetivos.length){
    tb.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-m)">Sin objetivos registrados</td></tr>`;
    return;
  }
  tb.innerHTML = S.objetivos.map(o=>`
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${o.titulo||'–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:180px">${(o.descripcion||'').substring(0,60)}${(o.descripcion||'').length>60?'…':''}</td>
      <td>${prioridadBadge(o.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(o.fechaLimite)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:160px">${(o.observaciones||'–').substring(0,50)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('objetivo','editar','${o.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('objetivo','${o.id}','${(o.titulo||'').replace(/'/g,"\\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── GERENTE: RENDER TAREAS ────────────────────────────────────
function renderGMTareas(){
  const tb = document.getElementById('gmTareasTable');
  if(!tb) return;
  if(!S.tareas.length){
    tb.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-m)">Sin tareas registradas</td></tr>`;
    return;
  }
  tb.innerHTML = S.tareas.map(t=>`
    <tr>
      <td><div style="font-weight:500;color:var(--deep)">${t.titulo||'–'}</div></td>
      <td style="font-size:12px;color:var(--text-m);max-width:150px">${(t.descripcion||'').substring(0,50)}${(t.descripcion||'').length>50?'…':''}</td>
      <td style="font-size:12px">${t.responsable||'–'}</td>
      <td>${prioridadBadge(t.prioridad)}</td>
      <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-m)">${fmtDate(t.fechaLimite||t.fecha)}</td>
      <td style="font-size:12px;color:var(--text-m)">${matrizName(t.matrizId)}</td>
      <td style="font-size:12px;color:var(--text-m);max-width:140px">${(t.observaciones||'–').substring(0,40)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-gerente-outline" style="padding:4px 10px;font-size:11px"
            onclick="openGMModal('tarea','editar','${t.id}')">✎</button>
          <button style="background:var(--red-bg);border:1px solid rgba(139,46,46,0.25);color:var(--red);
            border-radius:var(--radius-s);padding:4px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif"
            onclick="deleteGMItem('tarea','${t.id}','${(t.titulo||'').replace(/'/g,"\\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── GERENTE: RENDER COMENTARIOS ───────────────────────────────
function renderGMComentarios(){
  const el = document.getElementById('gmComentariosWrap');
  if(!el) return;

  // Collect all comments from all matrices
  const allComments = [];
  S.matrices.forEach(m=>{
    if(m.comments && Array.isArray(m.comments)){
      m.comments.forEach(c=>allComments.push({...c, matrizNombre: m.nombre}));
    }
  });

  // Also check S.comments if available
  if(S.comments && S.comments.length){
    S.comments.forEach(c=>{
      allComments.push({...c, matrizNombre: matrizName(c.matrizId)});
    });
  }

  if(!allComments.length){
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">Sin comentarios aún</div>
      <div class="empty-text">Los comentarios enviados desde las matrices aparecerán aquí</div></div>`;
    return;
  }

  // Sort by date desc
  allComments.sort((a,b)=>new Date(b.ts||b.fecha||0)-new Date(a.ts||a.fecha||0));

  el.innerHTML = allComments.map(c=>{
    const typeMap = {
      aprobado:'type-aprobado', observacion:'type-observacion',
      urgente:'type-urgente', general:'type-general'
    };
    const cls = typeMap[c.tipo?.toLowerCase()] || 'type-general';
    const init = (c.autor||c.nombre||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    return `
    <div class="comment-card ${cls}" style="margin-bottom:14px">
      <div class="comment-header">
        <div class="comment-avatar">${init}</div>
        <div>
          <div class="comment-author">${c.autor||c.nombre||'Anónimo'}</div>
          <div class="comment-role">${c.cargo||c.rol||'Usuario'}</div>
        </div>
        <div class="comment-meta">
          <span class="badge badge-gold" style="font-size:9px">${c.matrizNombre||'General'}</span>
          <span class="comment-time">${fmtDate(c.ts||c.fecha)}</span>
        </div>
      </div>
      <div class="comment-body">${c.texto||c.mensaje||c.contenido||'–'}</div>
      ${c.tipo?`<div class="comment-section-ref"><span class="comment-ref-badge">${c.tipo}</span></div>`:''}
    </div>`;
  }).join('');
}

// ── GERENTE: MODAL OPEN ───────────────────────────────────────
window.openGMModal = function(type, mode, id=null) {
  if(!window.isGerente()) return;
  _gmCurrentType = type;
  _gmCurrentMode = mode;
  _gmCurrentId   = id;

  const overlay  = document.getElementById('modalGerenteOverlay');
  const titleEl  = document.getElementById('gmModalTitle');
  const bodyEl   = document.getElementById('gmModalBody');

  const icons = {matriz:'◈', objetivo:'◎', tarea:'☑'};
  const names = {matriz:'Matriz', objetivo:'Objetivo', tarea:'Tarea'};
  titleEl.innerHTML = `${icons[type]||'+'} ${mode==='crear'?'Nueva':'Editar'} ${names[type]||type}`;

  // Get existing data if editing
  let existing = null;
  if(mode==='editar' && id){
    if(type==='matriz')   existing = S.matrices.find(x=>x.id===id);
    if(type==='objetivo') existing = S.objetivos.find(x=>x.id===id);
    if(type==='tarea')    existing = S.tareas.find(x=>x.id===id);
  }

  const v = (field, fallback='') => existing?.[field]??fallback;

  if(type==='matriz'){
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
        <input class="gm-input" id="gmf-icono" placeholder="◈" value="${v('icono','◈')}" style="max-width:100px;font-size:20px"></div>`;

  } else if(type==='objetivo'){
    const matrizOpts = S.matrices.map(m=>`<option value="${m.id}" ${v('matrizId')===m.id?'selected':''}>${m.nombre}</option>`).join('');
    bodyEl.innerHTML = `
      <div class="gm-info-note">ℹ️ La prioridad, estado y avance serán configurados por el administrador. Aquí defines el contenido del objetivo.</div>
      <div class="gm-field"><label class="gm-label">Título <span class="gm-required">*</span></label>
        <input class="gm-input" id="gmf-titulo" placeholder="Título del objetivo" value="${v('titulo')}"></div>
      <div class="gm-field"><label class="gm-label">Descripción</label>
        <textarea class="gm-textarea" id="gmf-descripcion" placeholder="Descripción detallada del objetivo...">${v('descripcion')}</textarea></div>
      <div class="gm-grid-2">
        <div class="gm-field"><label class="gm-label">Prioridad</label>
          <select class="gm-select" id="gmf-prioridad">
            ${['Alta','Media','Baja'].map(p=>`<option value="${p}" ${v('prioridad')===p?'selected':''}>${p}</option>`).join('')}
          </select></div>
        <div class="gm-field"><label class="gm-label">Fecha Límite</label>
          <input class="gm-input" id="gmf-fechaLimite" type="date" value="${v('fechaLimite')}"></div>
      </div>
      <div class="gm-field"><label class="gm-label">Observaciones</label>
        <textarea class="gm-textarea" id="gmf-observaciones" placeholder="Observaciones o notas adicionales...">${v('observaciones')}</textarea></div>`;

  } else if(type==='tarea'){
    const matrizOpts = S.matrices.map(m=>`<option value="${m.id}" ${v('matrizId')===m.id?'selected':''}>${m.nombre}</option>`).join('');
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
            ${['Alta','Media','Baja'].map(p=>`<option value="${p}" ${v('prioridad')===p?'selected':''}>${p}</option>`).join('')}
          </select></div>
      </div>
      <div class="gm-grid-2">
        <div class="gm-field"><label class="gm-label">Fecha Límite</label>
          <input class="gm-input" id="gmf-fechaLimite" type="date" value="${v('fechaLimite')||v('fecha')}"></div>
        <div class="gm-field"><label class="gm-label">Matriz <span class="gm-required">*</span></label>
          <select class="gm-select" id="gmf-matrizId">${matrizOpts||'<option value="">Sin matrices</option>'}</select></div>
      </div>
      <div class="gm-field"><label class="gm-label">Observaciones</label>
        <textarea class="gm-textarea" id="gmf-observaciones" placeholder="Observaciones adicionales...">${v('observaciones')}</textarea></div>`;
  }

  overlay.classList.add('open');
}

window.closeGMModal = function(){
  document.getElementById('modalGerenteOverlay').classList.remove('open');
}

// ── GERENTE: SAVE ─────────────────────────────────────────────
window.saveGMModal = async function(){
  if(!window.isGerente()) return;
  const btn = document.getElementById('gmSaveBtn');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    const gv = id => document.getElementById('gmf-'+id)?.value?.trim() || '';

    let data = {};
    let collName = '';

    if(_gmCurrentType === 'matriz'){
      const nombre = gv('nombre');
      if(!nombre){ alert('El nombre es obligatorio'); btn.disabled=false; btn.textContent='Guardar'; return; }
      collName = 'matrices';
      data = {
        nombre, tipo: gv('tipo'), area: gv('area'),
        responsable: gv('responsable'), descripcion: gv('descripcion'),
        icono: gv('icono')||'◈',
        estado: _gmCurrentMode==='crear' ? 'Pendiente' : undefined,
        creadoPorGerente: true,
        ts: new Date().toISOString()
      };

    } else if(_gmCurrentType === 'objetivo'){
      const titulo = gv('titulo');
      if(!titulo){ alert('El título es obligatorio'); btn.disabled=false; btn.textContent='Guardar'; return; }
      collName = 'objetivos';
      // Use pre-set matrizId from detalle context if available
      const objMatrizId = window._gmModalPreMatrizId || window._gmDetalleMatrizId || '';
      const objMatrizNombre = S.matrices.find(m=>m.id===objMatrizId)?.nombre || '';
      data = {
        titulo, descripcion: gv('descripcion'),
        prioridad: gv('prioridad')||'Media',
        fechaLimite: gv('fechaLimite'),
        observaciones: gv('observaciones'),
        matrizId: objMatrizId,
        matrizNombre: objMatrizNombre,
        estado: _gmCurrentMode==='crear' ? 'Pendiente' : undefined,
        avance: _gmCurrentMode==='crear' ? 0 : undefined,
        creadoPorGerente: true,
        ts: new Date().toISOString()
      };
      window._gmModalPreMatrizId = null;

    } else if(_gmCurrentType === 'tarea'){
      const titulo  = gv('titulo');
      const matrizId = gv('matrizId');
      if(!titulo){ alert('El título es obligatorio'); btn.disabled=false; btn.textContent='Guardar'; return; }
      collName = 'tareas';
      const matrizNombreVal = S.matrices.find(m=>m.id===matrizId)?.nombre || '';
      data = {
        titulo, descripcion: gv('descripcion'),
        responsable: gv('responsable'),
        prioridad: gv('prioridad')||'Media',
        fechaLimite: gv('fechaLimite'),
        fecha: gv('fechaLimite'),
        matrizId, matrizNombre: matrizNombreVal,
        observaciones: gv('observaciones'),
        estado: _gmCurrentMode==='crear' ? 'Pendiente' : undefined,
        avance: _gmCurrentMode==='crear' ? 0 : undefined,
        esPeticion: false,
        creadoPorGerente: true,
        ts: new Date().toISOString()
      };
    }

    // Remove undefined fields
    Object.keys(data).forEach(k => data[k]===undefined && delete data[k]);
    data.updatedAt = serverTimestamp();

    if(_gmCurrentMode === 'crear'){
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, collName), data);
    } else {
      const { updateDoc, doc: docRef } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await updateDoc(doc(db, collName, _gmCurrentId), data);
    }

    closeGMModal();
  } catch(e){
    console.error('Error guardando:', e);
    alert('Error al guardar. Revisa la consola.');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

// ── GERENTE: DELETE ───────────────────────────────────────────
window.deleteGMItem = async function(type, id, nombre){
  if(!window.isGerente()) return;
  if(!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;

  const collMap = {matriz:'matrices', objetivo:'objetivos', tarea:'tareas'};
  try {
    const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(doc(db, collMap[type], id));
  } catch(e){
    console.error('Error eliminando:', e);
    alert('Error al eliminar.');
  }
}

// ── COMENTARIOS EN MATRIZ (solo admin puede ver) ──────────────
function renderDetalleComments(m){
  const el = document.getElementById('detalleCommentSection');
  if(!el) return;
  const role = SESSION.role === 'gerente' ? 'Gerente' : 'General';
  const initials = SESSION.role === 'gerente' ? 'GR' : 'GN';
  const authorName = SESSION.role === 'gerente' ? 'Gerente' : 'Acceso General';
  const safeNombre = (m.nombre||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');

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

      <div id="detalleCommentSuccess" style="display:none;background:var(--green-bg);border:1px solid rgba(46,125,82,0.25);
        border-radius:var(--radius-s);padding:12px 16px;margin-bottom:14px;
        font-size:13px;color:var(--green);align-items:center;gap:8px">
        ✅ <span>Comentario enviado correctamente al administrador.</span>
      </div>

      <label class="modal-label" style="margin-bottom:6px;display:block">Su comentario</label>
      <textarea class="compose-textarea" id="detalleCommentText"
        placeholder="Escriba su observación sobre ${m.nombre}..."></textarea>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;flex-wrap:wrap">
        <select id="detalleCommentType" class="compose-type-select">
          <option value="general">💬 General</option>
          <option value="aprobado">✅ Aprobado</option>
          <option value="observacion">⚠️ Observación</option>
          <option value="urgente">🔴 Urgente</option>
        </select>
        <button class="btn-comment" id="btnDetalleComment"
          onclick="postDetalleComment('${m.id}','${safeNombre}')">
          Enviar Comentario
        </button>
      </div>
    </div>`;
}

window.postDetalleComment = async function(matrizId, matrizNombre){
  const txt  = document.getElementById('detalleCommentText')?.value?.trim();
  const tipo = document.getElementById('detalleCommentType')?.value || 'general';
  if(!txt) return;

  const role     = SESSION.role === 'gerente' ? 'Gerente' : 'General';
  const initials = SESSION.role === 'gerente' ? 'GR' : 'GN';
  const author   = SESSION.role === 'gerente' ? 'Gerente' : 'Acceso General';

  const btn = document.getElementById('btnDetalleComment');
  if(btn){ btn.disabled=true; btn.textContent='Enviando...'; }
  try {
    await addDoc(collection(db,'comments'),{
      author, initials, role,
      text: txt, type: tipo,
      sectionRef: matrizId, sectionName: matrizNombre,
      soloAdmin: true,
      createdAt: serverTimestamp(), ts: new Date().toISOString()
    });
    const ta = document.getElementById('detalleCommentText');
    if(ta) ta.value='';
    const success = document.getElementById('detalleCommentSuccess');
    if(success){ success.style.display='flex'; setTimeout(()=>{ success.style.display='none'; },4000); }
  } catch(e){ console.error(e); }
  finally {
    if(btn){ btn.disabled=false; btn.textContent='Enviar Comentario'; }
  }
}

// Note: comments sync is handled inside initSync() above
