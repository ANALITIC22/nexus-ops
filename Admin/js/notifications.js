// ============================================================
// NEXUS OPS — notifications.js
// Notificaciones en tiempo real: peticiones + comentarios
// ============================================================

import { AppState } from './state.js';
import {
  db, collection, doc, onSnapshot,
  query, orderBy, setDoc, getDoc
} from './firebase.js';

// Cache local de notificaciones ya mostradas
let _notifCache    = [];   // { id, tipo, texto, tiempo, leida }
let _unreadCount   = 0;
let _unsubPet      = null;
let _unsubComments = null;

// ── Arrancar listeners en tiempo real ────────────────────────
export function initNotifications() {
  // Esperar a que haya sesión
  const waitSession = setInterval(() => {
    if (AppState.adminSession?.uid) {
      clearInterval(waitSession);
      _startListeners();
    }
  }, 500);
}

function _startListeners() {
  // ── 1. Peticiones nuevas dirigidas a mis matrices ──────────
  _unsubPet = onSnapshot(
    query(collection(db, 'tareas'), orderBy('createdAt', 'desc')),
    snap => {
      const uid    = AppState.adminSession?.uid;
      const isSuper = AppState.adminSession?.isSuperAdmin;
      const misIds  = new Set(
        AppState.matrices
          .filter(m => isSuper || m.creadoPor === uid)
          .map(m => String(m.id))
      );

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const t  = { id: change.doc.id, ...change.doc.data() };

        // Solo peticiones nuevas para mis matrices, no creadas por mí
        if (!t.esPeticion) return;
        if (!misIds.has(String(t.matrizId))) return;
        if (t.solicitadoPorUid === uid) return;           // yo mismo la creé

        const yaExiste = _notifCache.find(n => n.id === 'pet_' + t.id);
        if (yaExiste) return;

        const matNombre = AppState.matrices.find(m => String(m.id) === String(t.matrizId))?.nombre || 'una matriz';
        _agregarNotif({
          id:    'pet_' + t.id,
          tipo:  'peticion',
          icono: '📋',
          texto: `Nueva petición en "${matNombre}": ${t.nombre || t.titulo || 'Sin título'}`,
          tiempo: t.createdAt || new Date().toISOString(),
          leida: false,
          accion: () => window.navigate?.('peticiones', null)
        });
      });
    },
    err => console.error('Notif peticiones error:', err)
  );

  // ── 2. Comentarios nuevos en mis matrices ──────────────────
  _unsubComments = onSnapshot(
    query(collection(db, 'comments'), orderBy('createdAt', 'desc')),
    snap => {
      const uid    = AppState.adminSession?.uid;
      const isSuper = AppState.adminSession?.isSuperAdmin;
      const misIds  = new Set(
        AppState.matrices
          .filter(m => isSuper || m.creadoPor === uid)
          .map(m => String(m.id))
      );

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const c = { id: change.doc.id, ...change.doc.data() };

        if (!misIds.has(String(c.sectionRef))) return;
        if (c.autorUid === uid) return;           // comentario propio

        const yaExiste = _notifCache.find(n => n.id === 'com_' + c.id);
        if (yaExiste) return;

        const matNombre = AppState.matrices.find(m => String(m.id) === String(c.sectionRef))?.nombre || 'una matriz';
        _agregarNotif({
          id:    'com_' + c.id,
          tipo:  'comentario',
          icono: '💬',
          texto: `Nuevo comentario en "${matNombre}" de ${c.author || 'Panel Ejecutivo'}`,
          tiempo: c.createdAt || new Date().toISOString(),
          leida: false,
          accion: null
        });
      });
    },
    err => console.error('Notif comentarios error:', err)
  );
}

// ── Agregar notificación al cache y re-renderizar ─────────────
function _agregarNotif(notif) {
  _notifCache.unshift(notif);
  if (_notifCache.length > 30) _notifCache.pop();
  _recalcUnread();
  _renderNotifPanel();
  _updateBell();
  // Toast suave
  _toastNotif(notif);
}

// ── Render del panel ──────────────────────────────────────────
function _renderNotifPanel() {
  const list = document.getElementById('notifList');
  if (!list) return;

  if (!_notifCache.length) {
    list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--text-m);font-size:13px">
      Sin notificaciones nuevas
    </div>`;
    return;
  }

  list.innerHTML = _notifCache.map(n => `
    <div class="notif-item${n.leida ? ' notif-leida' : ''}"
         onclick="notifClick('${n.id}')"
         style="cursor:pointer">
      <div style="font-size:18px;margin-right:10px;flex-shrink:0">${n.icono}</div>
      <div style="flex:1;min-width:0">
        <div class="notif-text" style="${n.leida ? 'opacity:0.55' : ''}">${n.texto}</div>
        <div class="notif-time">${_relTime(n.tiempo)}</div>
      </div>
      ${!n.leida ? '<div class="notif-dot-indicator" style="flex-shrink:0"></div>' : ''}
    </div>`).join('');
}

// ── Click en una notificación → marcar leída + navegar ────────
window.notifClick = function(id) {
  const n = _notifCache.find(x => x.id === id);
  if (!n) return;
  n.leida = true;
  _recalcUnread();
  _updateBell();
  _renderNotifPanel();
  if (n.accion) n.accion();
};

// ── Marcar todas como leídas ──────────────────────────────────
window.marcarTodasLeidas = function() {
  _notifCache.forEach(n => n.leida = true);
  _unreadCount = 0;
  _updateBell();
  _renderNotifPanel();
};

// ── Actualizar campana e ícono ────────────────────────────────
function _recalcUnread() {
  _unreadCount = _notifCache.filter(n => !n.leida).length;
}

function _updateBell() {
  const dot   = document.querySelector('.notif-dot');
  const badge = document.getElementById('notifBadge');

  if (dot) dot.style.display = _unreadCount > 0 ? '' : 'none';
  if (badge) {
    badge.textContent   = _unreadCount > 9 ? '9+' : _unreadCount;
    badge.style.display = _unreadCount > 0 ? '' : 'none';
  }
}

// ── Toast suave (mini banner) ─────────────────────────────────
function _toastNotif(n) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:var(--deep,#2C1A0E);color:#fff;
    padding:12px 16px;border-radius:10px;font-size:13px;
    display:flex;align-items:center;gap:10px;max-width:320px;
    box-shadow:0 4px 20px rgba(0,0,0,0.25);
    animation:slideInRight 0.3s ease;
  `;
  el.innerHTML = `<span style="font-size:16px">${n.icono}</span>
    <span style="flex:1;line-height:1.4">${n.texto}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ── Tiempo relativo ───────────────────────────────────────────
function _relTime(iso) {
  if (!iso) return 'Ahora';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ahora mismo';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h/24)} días`;
}

// ── Exponer para que ui.js pueda llamar al renderizar ─────────
export function refreshNotifPanel() {
  _renderNotifPanel();
}
