/**
 * ============================================================
 * NEXUS OPS — loader.js
 * ============================================================
 * Carga dinámica de todos los fragmentos HTML y los inyecta
 * en el DOM antes de que script.js (módulo) se inicialice.
 *
 * ORDEN DE CARGA (crítico para que script.js encuentre los IDs):
 *  1. components/sidebar.html      → #sidebar-root
 *  2. components/header.html       → #header-root
 *  3. pages/dashboard.html         → #main-root
 *  4. pages/matrices.html          → #main-root
 *  5. pages/detalle-matriz.html    → #main-root
 *  6. pages/*.html (resto)         → #main-root
 *  7. modals/modals.html           → #modals-root
 *  8. components/notifications.html→ #notif-root
 * ============================================================
 */

(function () {
  'use strict';

  /* ── Mapa de fragmentos a inyectar ────────────────────────── */
  const FRAGMENTS = [
    /* Componentes de layout */
    { file: 'components/sidebar.html',      target: '#sidebar-root',  method: 'innerHTML' },
    { file: 'components/header.html',       target: '#header-root',   method: 'innerHTML' },

    /* Páginas — inyectadas como hijos de #main-root ----------- */
    { file: 'pages/dashboard.html',         target: '#main-root',     method: 'append' },
    { file: 'pages/matrices.html',          target: '#main-root',     method: 'append' },
    { file: 'pages/detalle-matriz.html',    target: '#main-root',     method: 'append' },
    {
      file: 'pages/objetivos-tareas-gestion-diagramas-actividad.html',
      target: '#main-root',
      method: 'append'
    },
    {
      file: 'pages/reportes-perfil-config-peticiones.html',
      target: '#main-root',
      method: 'append'
    },

    /* Modales */
    { file: 'modals/modals.html',           target: '#modals-root',   method: 'innerHTML' },

    /* Panel de notificaciones */
    { file: 'components/notifications.html',target: '#notif-root',    method: 'innerHTML' },
  ];

  /* ── Utilidad: fetch + parse HTML ─────────────────────────── */
  async function fetchHTML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[loader] No se pudo cargar: ${url} (${res.status})`);
    return res.text();
  }

  /* ── Inyectar fragmento en el DOM ─────────────────────────── */
  function inject(targetSelector, html, method) {
    const el = document.querySelector(targetSelector);
    if (!el) {
      console.warn(`[loader] Target no encontrado: ${targetSelector}`);
      return;
    }
    if (method === 'innerHTML') {
      el.innerHTML = html;
    } else {
      /* append: insertar como HTML sin borrar contenido previo */
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      while (tmp.firstChild) el.appendChild(tmp.firstChild);
    }
  }

  /* ── Carga secuencial de todos los fragmentos ─────────────── */
  async function loadAll() {
    for (const { file, target, method } of FRAGMENTS) {
      try {
        const html = await fetchHTML(file);
        inject(target, html, method);
      } catch (err) {
        console.error(err.message);
      }
    }

    /* Despacha evento para que script.js sepa que el DOM está listo */
    document.dispatchEvent(new CustomEvent('nexus:ready'));
    console.info('[loader] Todos los fragmentos cargados ✓');
  }

  /* ── Arrancar cuando el DOM base esté disponible ──────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }

})();
