# NEXUS OPS — Admin Panel · Estructura Segmentada

## Árbol de archivos

```
nexus-ops/
│
├── index.html                          ← Punto de entrada único (orquestador)
│
├── style.css                           ← Todos los estilos CSS (tu archivo original)
├── script.js                           ← Toda la lógica JS (tu archivo original, type="module")
│
├── assets/
│   └── loader.js                       ← Carga dinámica de fragmentos HTML
│
├── components/                         ← Componentes reutilizables de layout
│   ├── sidebar.html                    → inyectado en <aside id="sidebar-root">
│   ├── header.html                     → inyectado en <header id="header-root">
│   └── notifications.html             → inyectado en <div id="notif-root">
│
├── pages/                              ← Una sección <section class="page"> por archivo
│   ├── dashboard.html                  → id="page-dashboard"
│   ├── matrices.html                   → id="page-matrices"
│   ├── detalle-matriz.html             → id="page-detalle-matriz"
│   ├── objetivos-tareas-gestion-       → ids: page-objetivos, page-tareas,
│   │   diagramas-actividad.html            page-gestion, page-diagramas, page-actividad
│   └── reportes-perfil-config-         → ids: page-reportes, page-perfil,
│       peticiones.html                     page-config, page-peticiones
│
└── modals/
    └── modals.html                     ← Todos los modales en un solo archivo
                                           inyectado en <div id="modals-root">
```

---

## Cómo funciona la conexión

```
index.html
  │
  ├── <script src="assets/loader.js">          ← se ejecuta primero (sin defer/module)
  │     │
  │     │  fetch() en orden secuencial:
  │     ├── components/sidebar.html      → innerHTML de #sidebar-root
  │     ├── components/header.html       → innerHTML de #header-root
  │     ├── pages/dashboard.html         → append a #main-root
  │     ├── pages/matrices.html          → append a #main-root
  │     ├── pages/detalle-matriz.html    → append a #main-root
  │     ├── pages/obj-tar-ges-dia-act.html → append a #main-root
  │     ├── pages/rep-per-cfg-pet.html   → append a #main-root
  │     ├── modals/modals.html           → innerHTML de #modals-root
  │     └── components/notifications.html → innerHTML de #notif-root
  │           │
  │           └── dispara evento: document → 'nexus:ready'
  │
  └── <script type="module" src="script.js">   ← lógica principal
        │
        └── escucha 'nexus:ready' (o DOMContentLoaded)
            para inicializar funciones que necesitan el DOM completo
```

---

## Ajuste necesario en script.js

Para que `script.js` espere a que el loader termine antes de
inicializar, envuelve tu inicialización así:

```js
// Al inicio de script.js — reemplaza el listener existente:

function init() {
  // Todo lo que tenías en DOMContentLoaded o al inicio del módulo
  initClock();
  renderMatrices();
  renderDashboard();
  // ... etc.
}

// Escucha el evento del loader
document.addEventListener('nexus:ready', init);

// Fallback: si el loader ya terminó antes de que este módulo cargue
if (document.querySelector('#page-dashboard')) {
  init();
}
```

---

## Lenguajes y responsabilidades

| Archivo           | Lenguaje | Responsabilidad                          |
|-------------------|----------|------------------------------------------|
| `index.html`      | HTML     | Orquestador — solo raíces de montaje     |
| `components/*.html`| HTML    | Sidebar, Header, Notificaciones          |
| `pages/*.html`    | HTML     | Secciones de contenido por ruta          |
| `modals/*.html`   | HTML     | Diálogos modales                         |
| `style.css`       | CSS      | Todo el diseño visual                    |
| `script.js`       | JS       | Lógica, datos, navegación, charts        |
| `assets/loader.js`| JS       | Ensamblado dinámico del DOM              |

---

## Cómo agregar una nueva página

1. Crear `pages/mi-pagina.html` con `<section class="page" id="page-mi-pagina">`
2. Agregar al array `FRAGMENTS` en `assets/loader.js`:
   ```js
   { file: 'pages/mi-pagina.html', target: '#main-root', method: 'append' },
   ```
3. Agregar el `<a class="nav-item">` en `components/sidebar.html`
4. Agregar la lógica de navegación en `script.js`

---

## Servidor local recomendado

Los `fetch()` del loader requieren HTTP (no `file://`).
Cualquiera de estas opciones sirve:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# VS Code
Live Server extension → clic derecho en index.html → "Open with Live Server"
```
