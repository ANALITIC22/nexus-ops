/* ============================================================
   detalle.js — Render del Detalle de Matriz (todas sus tabs)
   Corresponde a: pages/detalle.html
============================================================ */
import { S, db, collection, addDoc, serverTimestamp } from './firebase.js';
import {
  estadoBadge, prioridadBadge, dotColor,
  progressBar, critBar, fmtDate, matrizName
} from './helpers.js';

// Variable de sesión expuesta por login.js (script global)
// Se accede mediante window.SESSION en login.js

export function renderDetailInfo(m) {
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

export function renderDetailObjetivos(m) {
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

export function renderDetailTareas(m) {
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

export function renderDetailGestion(m) {
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

function _toDriveViewUrl(raw) {
  if(!raw) return null;
  raw = raw.trim();
  if(raw.includes('/preview')||raw.includes('export=view')) return raw;
  const patterns=[
    /drive\.google\.com\/file\/d\/([^/?\\s]+)/,
    /drive\.google\.com\/open\?id=([^&\\s]+)/,
    /id=([^&\\s]+)/,
  ];
  for(const p of patterns){const m=raw.match(p);if(m) return `https://drive.google.com/file/d/${m[1]}/view?usp=sharing`;}
  return raw;
}

export function renderDetailDiagramas(m) {
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

export function renderDetailHistorial(m) {
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

export function renderDetalleComments(m) {
  const el = document.getElementById('detalleCommentSection');
  if(!el) return;
  const SESSION = window.SESSION || { role: 'general' };
  const safeNombre = (m.nombre||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div>
          <div class="card-title">Comentarios sobre esta Matriz</div>
          <div style="font-size:11px;color:var(--text-m);margin-top:2px">Sus comentarios serán enviados directamente al administrador</div>
        </div>
        <span class="badge badge-gold">🔒 Solo Admin</span>
      </div>
      <div style="background:var(--gold-05);border:1px solid var(--border-g);border-radius:var(--radius-s);
        padding:14px 16px;margin-bottom:18px;display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:18px">🔒</span>
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--deep);margin-bottom:3px">Privacidad de comentarios</div>
          <div style="font-size:12px;color:var(--text-m);line-height:1.6">
            Los comentarios que envíe sobre esta matriz son <strong>confidenciales</strong>. Solo el administrador puede visualizarlos.
          </div>
        </div>
      </div>
      <div id="detalleCommentSuccess" style="display:none;background:var(--green-bg);border:1px solid rgba(46,125,82,0.25);
        border-radius:var(--radius-s);padding:12px 16px;margin-bottom:14px;font-size:13px;color:var(--green);align-items:center;gap:8px">
        ✅ <span>Comentario enviado correctamente al administrador.</span>
      </div>
      <label class="modal-label" style="margin-bottom:6px;display:block">Su comentario</label>
      <textarea class="compose-textarea" id="detalleCommentText" placeholder="Escriba su observación sobre ${m.nombre}..."></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;flex-wrap:wrap">
        <select id="detalleCommentType" class="compose-type-select">
          <option value="general">💬 General</option>
          <option value="aprobado">✅ Aprobado</option>
          <option value="observacion">⚠️ Observación</option>
          <option value="urgente">🔴 Urgente</option>
        </select>
        <button class="btn-comment" id="btnDetalleComment" onclick="postDetalleComment('${m.id}','${safeNombre}')">
          Enviar Comentario
        </button>
      </div>
    </div>`;
}

window.postDetalleComment = async function(matrizId, matrizNombre) {
  const txt  = document.getElementById('detalleCommentText')?.value?.trim();
  const tipo = document.getElementById('detalleCommentType')?.value || 'general';
  if(!txt) return;

  const SESSION = window.SESSION || { role: 'general' };
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
};
