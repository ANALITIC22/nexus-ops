/* ============================================================
   overview.js — Render del Resumen Ejecutivo
   Corresponde a: pages/overview.html
============================================================ */
import { S } from './firebase.js';
import { estadoBadge, prioridadBadge, dotColor, matrizName } from './helpers.js';

export function renderOverview() {
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

function renderOverviewCharts() {
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
        borderColor:'#42638C', borderWidth:1.5, borderRadius:5
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

function renderOverviewMatrices() {
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

function renderOverviewCriticas() {
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
