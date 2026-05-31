/* ============================================================
   navigation.js — Clock, navTo(), switchDetailTab()
   Corresponde a: index.html (exec-layout) · components/header.html
============================================================ */
import { S } from './firebase.js';
import {
  renderOverview
} from './overview.js';
import {
  renderMatricesExec, renderObjetivosExec, renderTareasExec,
  renderReportesExec, renderGestionExec, renderActividadExec,
  renderPerfilExec
} from './pages.js';
import {
  renderGMMatrices, renderGMDetalle
} from './gerente.js';
import {
  renderDetailInfo, renderDetailObjetivos, renderDetailTareas,
  renderDetailGestion, renderDetailDiagramas, renderDetailHistorial,
  renderDetalleComments
} from './detalle.js';

// ── Reloj en vivo ─────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const c = document.getElementById('liveClock');
  const d = document.getElementById('liveDate');
  if(c) c.textContent = now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(d) d.textContent = now.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
setInterval(updateClock, 1000);
updateClock();

// ── Navegación principal ──────────────────────────────────────
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
};

// ── Tabs del detalle ──────────────────────────────────────────
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
};
