/**
 * NEXUS OPS — Panel Ejecutivo — loader.js
 * Carga todos los fragmentos HTML e inyecta en el DOM.
 * Al terminar dispara 'nexus:exec:ready' para que app.js arranque.
 *
 * ORDEN DE CARGA (crítico):
 *  1. pages/login.html          → #login-root      (innerHTML)
 *  2. components/sidebar.html   → #sidebar-root    (innerHTML)
 *  3. components/header.html    → #header-root     (innerHTML)
 *  4. pages/overview.html       → #main-root       (append)
 *  5. pages/matrices.html       → #main-root       (append)
 *  6. pages/detalle.html        → #main-root       (append)
 *  7. pages/objetivos.html      → #main-root       (append)
 *  8. pages/tareas.html         → #main-root       (append)
 *  9. pages/reportes.html       → #main-root       (append)
 * 10. pages/gestion.html        → #main-root       (append)
 * 11. pages/actividad.html      → #main-root       (append)
 * 12. pages/perfil.html         → #main-root       (append)
 * 13. pages/gm-matrices.html    → #gerente-pages-root (append)
 * 14. pages/gm-objetivos.html   → #gerente-pages-root (append)
 * 15. pages/gm-tareas.html      → #gerente-pages-root (append)
 * 16. pages/gm-detalle.html     → #gerente-pages-root (append)
 * 17. modals/modals.html        → #modals-root     (innerHTML)
 * 18. components/mobile-nav.html → #mobile-root    (innerHTML)
 */
(function () {
  'use strict';

  const FRAGMENTS = [
    { file: 'pages/login.html',              target: '#login-root',           method: 'innerHTML' },
    { file: 'components/sidebar.html',       target: '#sidebar-root',         method: 'innerHTML' },
    { file: 'components/header.html',        target: '#header-root',          method: 'innerHTML' },
    { file: 'pages/overview.html',           target: '#main-root',            method: 'append' },
    { file: 'pages/matrices.html',           target: '#main-root',            method: 'append' },
    { file: 'pages/detalle.html',            target: '#main-root',            method: 'append' },
    { file: 'pages/objetivos.html',          target: '#main-root',            method: 'append' },
    { file: 'pages/tareas.html',             target: '#main-root',            method: 'append' },
    { file: 'pages/reportes.html',           target: '#main-root',            method: 'append' },
    { file: 'pages/gestion.html',            target: '#main-root',            method: 'append' },
    { file: 'pages/actividad.html',          target: '#main-root',            method: 'append' },
    { file: 'pages/perfil.html',             target: '#main-root',            method: 'append' },
    { file: 'pages/gm-matrices.html',        target: '#gerente-pages-root',   method: 'append' },
    { file: 'pages/gm-objetivos.html',       target: '#gerente-pages-root',   method: 'append' },
    { file: 'pages/gm-tareas.html',          target: '#gerente-pages-root',   method: 'append' },
    { file: 'pages/gm-detalle.html',         target: '#gerente-pages-root',   method: 'append' },
    { file: 'modals/modals.html',            target: '#modals-root',          method: 'innerHTML' },
    { file: 'components/mobile-nav.html',    target: '#mobile-root',          method: 'innerHTML' },
  ];

  async function fetchHTML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[loader] No se pudo cargar: ${url} (${res.status})`);
    return res.text();
  }

  function inject(targetSelector, html, method) {
    const el = document.querySelector(targetSelector);
    if (!el) { console.warn(`[loader] Target no encontrado: ${targetSelector}`); return; }
    if (method === 'innerHTML') {
      el.innerHTML = html;
    } else {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      while (tmp.firstChild) el.appendChild(tmp.firstChild);
    }
  }

  async function loadAll() {
    for (const { file, target, method } of FRAGMENTS) {
      try {
        const html = await fetchHTML(file);
        inject(target, html, method);
      } catch (err) {
        console.error(err.message);
      }
    }
    document.dispatchEvent(new CustomEvent('nexus:exec:ready'));
    console.info('[loader] Panel Ejecutivo — todos los fragmentos cargados ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }
})();
