/* ============================================================
   helpers.js — Funciones de render compartidas entre páginas
   Usado por: overview, matrices, tareas, objetivos, etc.
============================================================ */
import { S } from './firebase.js';

export function estadoBadge(e) {
  const map = {
    'Al día':'badge-green','Completado':'badge-green','En progreso':'badge-gold',
    'Pendiente':'badge-yellow','Bloqueado':'badge-gray','Crítico':'badge-red',
    'Aprobado':'badge-green','Borrador':'badge-gray'
  };
  return `<span class="badge ${map[e]||'badge-gray'}">${e}</span>`;
}

export function prioridadBadge(p) {
  const m = {'Alta':'badge-red','Media':'badge-yellow','Baja':'badge-green'};
  return `<span class="badge ${m[p]||'badge-gray'}">${p}</span>`;
}

export function dotColor(e) {
  const m = {
    'Al día':'dot-green','Completado':'dot-green','En progreso':'dot-gold',
    'Pendiente':'dot-yellow','Crítico':'dot-red','Bloqueado':'dot-gray'
  };
  return m[e]||'dot-gray';
}

export function progressBar(pct, color='gold') {
  return `<div style="display:flex;align-items:center;gap:8px">
    <div class="progress-bar" style="flex:1;min-width:60px"><div class="progress-fill ${color}" style="width:${pct||0}%"></div></div>
    <span style="font-size:11px;font-family:'DM Mono',monospace;min-width:28px;color:var(--text-m)">${pct||0}%</span>
  </div>`;
}

export function critBar(c) {
  const levels = {'Alta':3,'Media':2,'Baja':1};
  let h = '<div class="crit-wrap">';
  for(let i=1;i<=3;i++) h+=`<div class="crit-block ${i<=(levels[c]||0)?'crit-'+(c||'').toLowerCase():''}"></div>`;
  return h+'</div>';
}

export function fmtDate(d) {
  if(!d) return '–';
  try { return new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}); }
  catch{ return d; }
}

export function fmtDateFull(d) {
  if(!d) return '–';
  try { return new Date(d).toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
  catch{ return d; }
}

export function matrizName(id) {
  return S.matrices.find(m=>String(m.id)===String(id))?.nombre || '–';
}
