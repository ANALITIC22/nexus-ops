// ============================================================
// NEXUS OPS — comentarios.js
// Comentarios privados del Panel Ejecutivo (soloAdmin)
// ============================================================

import { AppState } from './state.js';

export function renderAdminComments() {
  const el = document.getElementById('admin-comments-list');
  if (!el) return;

  const matrizComments = AppState.comments.filter(c =>
    String(c.sectionRef) === String(AppState.currentMatrizId)
  );

  // Actualizar badges
  const badge    = document.getElementById('adminCommentsCount');
  const tabBadge = document.getElementById('comentariosAdminBadge');
  if (badge)    { badge.textContent    = matrizComments.length; badge.style.display    = matrizComments.length ? 'inline'       : 'none'; }
  if (tabBadge) { tabBadge.textContent = matrizComments.length; tabBadge.style.display = matrizComments.length ? 'inline-block' : 'none'; }

  let filtered = matrizComments;
  if (AppState.adminCommentFilter) filtered = filtered.filter(c => c.type === AppState.adminCommentFilter);

  if (!filtered.length) {
    const empty = AppState.adminCommentFilter
      ? `<div style="text-align:center;padding:32px 20px;color:var(--text-m)">
          <div style="font-size:28px;opacity:0.4;margin-bottom:10px">💬</div>
          <div style="font-size:13px;font-weight:500;color:var(--deep)">Sin comentarios de este tipo</div>
        </div>`
      : `<div style="text-align:center;padding:40px 20px;color:var(--text-m)">
          <div style="font-size:32px;opacity:0.35;margin-bottom:12px">🔒</div>
          <div style="font-size:14px;font-weight:500;color:var(--deep);margin-bottom:6px">Sin comentarios privados aún</div>
          <div style="font-size:12px;color:var(--text-m)">Los comentarios enviados desde el Panel Ejecutivo para esta matriz aparecerán aquí.</div>
        </div>`;
    el.innerHTML = empty;
    return;
  }

  const typeLabel = {
    general:     '💬 General',
    aprobado:    '✅ Aprobado',
    observacion: '⚠️ Observación',
    urgente:     '🔴 Urgente'
  };

  el.innerHTML = filtered.map(c => {
    const dt = c.ts
      ? new Date(c.ts).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '–';
    return `
    <div class="admin-comment-card type-${c.type || 'general'}">
      <div class="admin-comment-lock">🔒 Solo Admin</div>
      <div class="admin-comment-header">
        <div class="admin-comment-avatar">${c.initials || 'JE'}</div>
        <div>
          <div class="admin-comment-author">${c.author || 'Panel Ejecutivo'}</div>
          <div class="admin-comment-role">${c.role || '–'}</div>
        </div>
        <div class="admin-comment-meta">
          <span class="badge badge-gold" style="font-size:10px">${typeLabel[c.type] || '💬 General'}</span>
          <span class="admin-comment-time">${dt}</span>
        </div>
      </div>
      <div class="admin-comment-body">${c.text || ''}</div>
    </div>`;
  }).join('');
}

export function filterAdminComments(type, btn) {
  AppState.adminCommentFilter = type;
  document.querySelectorAll('.admin-comment-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAdminComments();
}

export function updateAdminCommentsBadge() {
  const matrizComments = AppState.comments.filter(c =>
    String(c.sectionRef) === String(AppState.currentMatrizId)
  );
  const tabBadge = document.getElementById('comentariosAdminBadge');
  if (tabBadge) {
    tabBadge.textContent = matrizComments.length;
    tabBadge.style.display = matrizComments.length ? 'inline-block' : 'none';
  }
}
