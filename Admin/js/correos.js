// ============================================================
// NEXUS OPS — correos.js
// Lógica de la bandeja de correos (Fase 1: Lectura manual)
// Cada admin ve SOLO su propia bandeja (ligada a su cuenta MS)
// ============================================================

import {
  getMsUserInfo,
  getCorreosBandeja,
  getCorreoDetalle,
  marcarComoLeido
} from './outlook.js';

// ── Helpers MSAL (provistos por msal-config.js) ───────────────
// Verifica si MSAL está configurado (Client ID ya reemplazado)
function outlookConfigurado() {
  return typeof window.getGraphAccessToken === 'function';
}

// Verifica si hay sesión activa de Microsoft
function outlookConectado() {
  return typeof window.msalHaySessionActiva === 'function'
    ? window.msalHaySessionActiva()
    : false;
}

// Inicia login con MSAL popup
function iniciarLoginMicrosoft() {
  if (typeof window.msalSignIn === 'function') {
    window.msalSignIn().then(() => {
      renderCorreos();
    }).catch(err => {
      console.error('[Correos] Error en login Microsoft:', err);
    });
  }
}

// Desconectar cuenta Microsoft via MSAL
function desconectarMicrosoftMSAL() {
  if (typeof window.msalSignOut === 'function') {
    window.msalSignOut();
  }
}

import { AppState }       from './state.js';
import { showToast }      from './helpers.js';

// ── Estado de la bandeja ─────────────────────────────────────
const BandejaState = {
  correos:       [],
  correoActivo:  null,    // correo actualmente abierto
  filtro:        'todos', // 'todos' | 'noLeidos' | 'importantes'
  busqueda:      '',
  cargando:      false,
  msUserInfo:    null,
  correoParaConvertir: null  // correo que se va a convertir en petición
};

// ── Obtener UID del admin actual ─────────────────────────────
function getAdminUid() {
  return AppState.adminActual?.uid || AppState.currentAdmin?.uid || 'admin_local';
}

// ── Render principal de la página de correos ─────────────────
export async function renderCorreos() {
  const adminUid = getAdminUid();

  // Si no está configurado aún, mostrar pantalla de setup
  if (!outlookConfigurado()) {
    _renderPantallaNoConfigurado();
    return;
  }

  // Si no hay token, mostrar pantalla de conexión
  if (!outlookConectado()) {
    _renderPantallaConectar(adminUid);
    return;
  }

  // Cargar info del usuario MS desde MSAL o Graph API
  if (!BandejaState.msUserInfo) {
    // Intentar desde MSAL primero (sin llamada de red)
    const msalAccount = window.msalGetActiveAccount?.();
    if (msalAccount) {
      BandejaState.msUserInfo = {
        nombre: msalAccount.name || msalAccount.username || 'Administrador',
        email:  msalAccount.username || ''
      };
    } else {
      // Fallback: llamar a Graph API /me
      BandejaState.msUserInfo = await getMsUserInfo(adminUid);
    }
  }

  // Mostrar bandeja
  await _renderBandeja(adminUid);
}

// ── Pantalla: API no configurada ─────────────────────────────
function _renderPantallaNoConfigurado() {
  const cont = document.getElementById('correos-contenido');
  if (!cont) return;

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:80px 20px;text-align:center">
      <div style="font-size:48px;margin-bottom:20px;opacity:0.5">⚙️</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;
        color:var(--deep);margin-bottom:10px">Integración pendiente de configuración</div>
      <div style="font-size:13px;color:var(--text-m);max-width:460px;line-height:1.7;margin-bottom:28px">
        Para activar la bandeja de correos, debes registrar la aplicación en 
        <strong>Azure Portal</strong> y pegar el <strong>Client ID</strong> 
        en el archivo <code style="background:var(--gold-10);padding:2px 6px;border-radius:4px;
        font-family:monospace">js/outlook.js</code>.
      </div>
      <div style="background:var(--gold-10);border:1px solid var(--border-g);border-radius:var(--radius-m);
        padding:20px 28px;text-align:left;max-width:500px;width:100%">
        <div style="font-size:12px;font-weight:600;color:var(--deep);margin-bottom:12px;
          letter-spacing:0.05em">PASOS DE CONFIGURACIÓN</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
            ['1','Ir a portal.azure.com → App registrations'],
            ['2','Crear nueva app: <em>Nexus Ops</em>'],
            ['3','Redirect URI → Single-page application (SPA)'],
            ['4','Permisos: Mail.Read · User.Read · (Mail.Send)'],
            ['5','Copiar el Application (client) ID'],
            ['6','Pegarlo en <code>MS_CLIENT_ID</code> en outlook.js']
          ].map(([n,t]) => `
            <div style="display:flex;gap:12px;align-items:flex-start">
              <span style="min-width:22px;height:22px;background:var(--deep);color:var(--cream);
                border-radius:50%;display:flex;align-items:center;justify-content:center;
                font-size:11px;font-weight:700">${n}</span>
              <span style="font-size:13px;color:var(--text-b);line-height:1.5">${t}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

// ── Pantalla: Conectar cuenta Microsoft ──────────────────────
function _renderPantallaConectar(adminUid) {
  const cont = document.getElementById('correos-contenido');
  if (!cont) return;

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:80px 20px;text-align:center">
      <div style="font-size:52px;margin-bottom:20px">✉️</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;
        color:var(--deep);margin-bottom:10px">Conecta tu cuenta de Microsoft</div>
      <div style="font-size:13px;color:var(--text-m);max-width:420px;line-height:1.7;margin-bottom:32px">
        Cada administrador conecta su <strong>propia cuenta de Outlook</strong>. 
        Solo tú verás tus correos. La conexión dura la sesión activa.
      </div>
      <button onclick="window.iniciarLoginMicrosoft()" 
        style="display:flex;align-items:center;gap:12px;padding:14px 28px;
          background:var(--deep);color:var(--cream);border:none;border-radius:var(--radius-m);
          font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;
          box-shadow:var(--shadow-m);transition:opacity 0.2s"
        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
        <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
          <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
        </svg>
        Conectar con Microsoft
      </button>
      <div style="margin-top:20px;font-size:11px;color:var(--text-l)">
        🔒 Solo se solicitan permisos de lectura de correo (Mail.Read)
      </div>
    </div>`;
}

// ── Render completo de la bandeja ─────────────────────────────
async function _renderBandeja(adminUid) {
  const cont = document.getElementById('correos-contenido');
  if (!cont) return;

  // Mostrar skeleton mientras carga
  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:340px 1fr;height:calc(100vh - 140px);
      border:1px solid var(--border);border-radius:var(--radius-m);overflow:hidden;
      background:var(--bg-card)">
      <!-- Lista de correos -->
      <div style="border-right:1px solid var(--border);display:flex;flex-direction:column">
        <!-- Header de la bandeja -->
        <div style="padding:16px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--deep)">
                📧 ${BandejaState.msUserInfo?.email || 'Cargando...'}
              </div>
              <div style="font-size:11px;color:var(--text-m);margin-top:2px">
                ${BandejaState.msUserInfo?.nombre || ''}
              </div>
            </div>
            <button onclick="window.desconectarCuentaMS()" title="Desconectar cuenta"
              style="padding:5px 10px;background:var(--red-bg);color:var(--red);border:1px solid rgba(139,46,46,0.2);
                border-radius:6px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif">
              ⏻ Salir
            </button>
          </div>
          <!-- Búsqueda -->
          <div style="position:relative">
            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
              font-size:13px;color:var(--text-l)">🔍</span>
            <input id="correoBuscador" type="text" placeholder="Buscar correos..."
              value="${BandejaState.busqueda}"
              oninput="window.buscarCorreos(this.value)"
              style="width:100%;padding:8px 12px 8px 32px;background:var(--bg-main);
                border:1px solid var(--border);border-radius:8px;font-size:12px;
                font-family:'DM Sans',sans-serif;color:var(--text-b);outline:none">
          </div>
          <!-- Filtros -->
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
            ${[
              ['todos','Todos'],
              ['noLeidos','No leídos'],
              ['importantes','Importantes']
            ].map(([k,l]) => `
              <button onclick="window.filtrarCorreos('${k}',this)"
                class="correo-filtro-btn ${BandejaState.filtro === k ? 'activo' : ''}"
                style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;
                  font-family:'DM Sans',sans-serif;border:1px solid var(--border);
                  background:${BandejaState.filtro === k ? 'var(--deep)' : 'transparent'};
                  color:${BandejaState.filtro === k ? 'var(--cream)' : 'var(--text-m)'};
                  transition:all 0.15s">${l}</button>
            `).join('')}
          </div>
        </div>
        <!-- Lista scrolleable -->
        <div id="correos-lista" style="flex:1;overflow-y:auto">
          <div style="text-align:center;padding:40px 20px;color:var(--text-m)">
            <div style="font-size:24px;margin-bottom:8px">⏳</div>
            <div style="font-size:12px">Cargando correos...</div>
          </div>
        </div>
        <!-- Footer con recarga -->
        <div style="padding:12px 16px;border-top:1px solid var(--border);
          display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;color:var(--text-l)" id="correos-count">–</span>
          <button onclick="window.recargarCorreos()" 
            style="padding:5px 12px;background:var(--gold-10);border:1px solid var(--border-g);
              border-radius:6px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;
              color:var(--deep)">↻ Actualizar</button>
        </div>
      </div>

      <!-- Panel de detalle del correo -->
      <div id="correo-detalle-panel" style="display:flex;flex-direction:column;overflow:hidden">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
          height:100%;color:var(--text-m)">
          <div style="font-size:40px;margin-bottom:12px;opacity:0.3">✉️</div>
          <div style="font-size:13px;color:var(--text-m)">Selecciona un correo para verlo</div>
        </div>
      </div>
    </div>`;

  // Ahora cargar los correos reales
  await cargarCorreos(adminUid);
}

// ── Cargar correos desde Graph API ───────────────────────────
export async function cargarCorreos(adminUid) {
  if (!adminUid) adminUid = getAdminUid();
  BandejaState.cargando = true;

  try {
    const filtros = {
      soloNoLeidos: BandejaState.filtro === 'noLeidos',
      busqueda:     BandejaState.busqueda,
      top:          40
    };

    const correos = await getCorreosBandeja(adminUid, filtros);

    // Filtro local de importancia
    BandejaState.correos = BandejaState.filtro === 'importantes'
      ? correos.filter(c => c.importancia === 'high')
      : correos;

    _renderListaCorreos();

  } catch (err) {
    console.error('[Correos] Error al cargar:', err);

    // Si el token expiró, mostrar pantalla de reconexión
    if (err.message.includes('expirada') || err.message.includes('válido')) {
      _renderPantallaConectar(adminUid);
      return;
    }

    const lista = document.getElementById('correos-lista');
    if (lista) {
      lista.innerHTML = `
        <div style="text-align:center;padding:40px 20px">
          <div style="font-size:24px;margin-bottom:8px">⚠️</div>
          <div style="font-size:12px;color:var(--red);margin-bottom:12px">${err.message}</div>
          <button onclick="window.recargarCorreos()" 
            style="padding:6px 14px;background:var(--gold-10);border:1px solid var(--border-g);
              border-radius:6px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif">
            Reintentar
          </button>
        </div>`;
    }
  } finally {
    BandejaState.cargando = false;
  }
}

// ── Render de la lista de correos ────────────────────────────
function _renderListaCorreos() {
  const lista = document.getElementById('correos-lista');
  const count = document.getElementById('correos-count');
  if (!lista) return;

  const correos = BandejaState.correos;

  if (count) {
    const noLeidos = correos.filter(c => !c.leido).length;
    count.textContent = `${correos.length} correos${noLeidos > 0 ? ` · ${noLeidos} sin leer` : ''}`;
  }

  if (!correos.length) {
    lista.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:var(--text-m)">
        <div style="font-size:32px;margin-bottom:10px;opacity:0.3">📭</div>
        <div style="font-size:12px">No hay correos en esta categoría</div>
      </div>`;
    return;
  }

  lista.innerHTML = correos.map(c => `
    <div class="correo-item ${!c.leido ? 'no-leido' : ''} ${BandejaState.correoActivo?.id === c.id ? 'activo' : ''}"
      onclick="window.abrirCorreo('${c.id}')"
      style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;
        background:${BandejaState.correoActivo?.id === c.id ? 'var(--gold-10)' : 'transparent'};
        border-left:3px solid ${!c.leido ? 'var(--gold)' : 'transparent'};
        transition:background 0.15s">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">
        <div style="font-size:12px;font-weight:${!c.leido ? '600' : '400'};color:var(--deep);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">
          ${_escapeHtml(c.remitente)}
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          ${c.importancia === 'high' ? '<span style="color:var(--red);font-size:12px" title="Importante">⚑</span>' : ''}
          ${c.adjuntos ? '<span style="font-size:10px;color:var(--text-m)" title="Tiene adjuntos">📎</span>' : ''}
          <span style="font-size:10px;color:var(--text-l);white-space:nowrap">${c.fecha}</span>
        </div>
      </div>
      <div style="font-size:12px;font-weight:${!c.leido ? '600' : '400'};color:var(--text-h);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">
        ${_escapeHtml(c.asunto)}
      </div>
      <div style="font-size:11px;color:var(--text-m);overflow:hidden;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
        ${_escapeHtml(c.preview)}
      </div>
    </div>
  `).join('');
}

// ── Abrir correo en el panel de detalle ──────────────────────
export async function abrirCorreo(correoId) {
  const adminUid = getAdminUid();

  // Marcar como activo en la lista
  BandejaState.correoActivo = BandejaState.correos.find(c => c.id === correoId) || null;
  _renderListaCorreos();

  const panel = document.getElementById('correo-detalle-panel');
  if (!panel) return;

  // Skeleton
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%">
      <div style="text-align:center;color:var(--text-m)">
        <div style="font-size:24px;margin-bottom:8px">⏳</div>
        <div style="font-size:12px">Cargando correo...</div>
      </div>
    </div>`;

  try {
    const correo = await getCorreoDetalle(adminUid, correoId);
    BandejaState.correoActivo = correo;

    // Marcar como leído
    if (!correo.leido) {
      marcarComoLeido(adminUid, correoId);
      const idx = BandejaState.correos.findIndex(c => c.id === correoId);
      if (idx >= 0) BandejaState.correos[idx].leido = true;
      _renderListaCorreos();
    }

    _renderDetalleCorreo(correo, panel);

  } catch (err) {
    panel.innerHTML = `
      <div style="padding:24px;color:var(--red);font-size:13px">
        ⚠️ Error al cargar el correo: ${err.message}
      </div>`;
  }
}

// ── Render del detalle de un correo ──────────────────────────
function _renderDetalleCorreo(correo, panel) {
  const cuerpoHtml = correo.cuerpoTipo === 'html'
    ? `<div style="font-size:13px;line-height:1.7;color:var(--text-b)">${correo.cuerpo}</div>`
    : `<div style="font-size:13px;line-height:1.7;color:var(--text-b);white-space:pre-wrap">${_escapeHtml(correo.cuerpo)}</div>`;

  panel.innerHTML = `
    <!-- Header del correo -->
    <div style="padding:20px 24px;border-bottom:1px solid var(--border);flex-shrink:0">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;
            color:var(--deep);line-height:1.3;margin-bottom:8px">
            ${_escapeHtml(correo.asunto)}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:14px">
            <div>
              <span style="font-size:10px;color:var(--text-l);text-transform:uppercase;
                letter-spacing:0.05em">De</span>
              <div style="font-size:12px;color:var(--text-b);margin-top:1px">
                <strong>${_escapeHtml(correo.remitente)}</strong>
                <span style="color:var(--text-l)"> &lt;${_escapeHtml(correo.emailRemitente)}&gt;</span>
              </div>
            </div>
            <div>
              <span style="font-size:10px;color:var(--text-l);text-transform:uppercase;
                letter-spacing:0.05em">Recibido</span>
              <div style="font-size:12px;color:var(--text-b);margin-top:1px">${correo.fecha}</div>
            </div>
            ${correo.importancia === 'high' ? `
            <div>
              <span style="font-size:10px;color:var(--text-l);text-transform:uppercase;
                letter-spacing:0.05em">Prioridad</span>
              <div style="font-size:12px;color:var(--red);margin-top:1px;font-weight:600">⚑ Alta</div>
            </div>` : ''}
          </div>
        </div>
        <!-- Botón principal: Convertir en Petición -->
        <button onclick="window.abrirModalConvertir('${correo.id}')"
          style="flex-shrink:0;padding:10px 18px;background:linear-gradient(135deg,var(--gold),var(--warm));
            color:var(--deep);border:none;border-radius:var(--radius-s);font-size:13px;
            font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;
            box-shadow:var(--shadow-s);white-space:nowrap;transition:opacity 0.2s"
          onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
          📋 Convertir en Petición
        </button>
      </div>
    </div>

    <!-- Cuerpo del correo -->
    <div style="flex:1;overflow-y:auto;padding:24px">
      <div style="max-width:700px">
        ${cuerpoHtml}
      </div>
    </div>

    <!-- Footer con acciones secundarias -->
    <div style="padding:14px 24px;border-top:1px solid var(--border);
      display:flex;gap:10px;flex-shrink:0;background:var(--bg-main)">
      <button onclick="window.abrirModalConvertir('${correo.id}')"
        style="padding:8px 16px;background:var(--deep);color:var(--cream);border:none;
          border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;
          font-family:'DM Sans',sans-serif">
        📋 Convertir en Petición
      </button>
      <button onclick="window.copiarTextoCorreo('${correo.id}')"
        style="padding:8px 16px;background:transparent;color:var(--text-b);
          border:1px solid var(--border);border-radius:8px;font-size:12px;cursor:pointer;
          font-family:'DM Sans',sans-serif">
        📋 Copiar texto
      </button>
      ${correo.emailRemitente ? `
      <a href="mailto:${correo.emailRemitente}" 
        style="padding:8px 16px;background:transparent;color:var(--text-b);
          border:1px solid var(--border);border-radius:8px;font-size:12px;cursor:pointer;
          font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-flex;align-items:center">
        ↩ Responder
      </a>` : ''}
    </div>`;
}

// ── Filtrar correos ───────────────────────────────────────────
export function filtrarCorreos(tipo, btn) {
  BandejaState.filtro = tipo;

  // Actualizar estilos de botones
  document.querySelectorAll('.correo-filtro-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color      = 'var(--text-m)';
  });
  if (btn) {
    btn.style.background = 'var(--deep)';
    btn.style.color      = 'var(--cream)';
  }

  cargarCorreos(getAdminUid());
}

// ── Buscar correos ────────────────────────────────────────────
let _busquedaTimeout = null;
export function buscarCorreos(query) {
  BandejaState.busqueda = query;
  clearTimeout(_busquedaTimeout);
  _busquedaTimeout = setTimeout(() => {
    cargarCorreos(getAdminUid());
  }, 500);
}

// ── Recargar correos ─────────────────────────────────────────
export function recargarCorreos() {
  cargarCorreos(getAdminUid());
}

// ── Desconectar cuenta MS ────────────────────────────────────
export function desconectarCuentaMS() {
  BandejaState.msUserInfo   = null;
  BandejaState.correos      = [];
  BandejaState.correoActivo = null;
  desconectarMicrosoftMSAL();
  showToast('Cuenta de Microsoft desconectada', 'warning');
}

// ── Copiar texto del correo ───────────────────────────────────
export function copiarTextoCorreo(correoId) {
  const correo = BandejaState.correos.find(c => c.id === correoId)
    || BandejaState.correoActivo;
  if (!correo) return;

  const texto = `De: ${correo.remitente} <${correo.emailRemitente}>\nAsunto: ${correo.asunto}\nFecha: ${correo.fecha}\n\n${correo.preview}`;
  navigator.clipboard.writeText(texto).then(() => {
    showToast('Texto del correo copiado', 'success');
  });
}

// ── Abrir modal de conversión a petición ─────────────────────
export async function abrirModalConvertir(correoId) {
  const adminUid = getAdminUid();

  // Buscar correo en caché o cargarlo
  let correo = BandejaState.correos.find(c => c.id === correoId)
    || BandejaState.correoActivo;

  if (!correo || correo.id !== correoId) {
    try {
      correo = await getCorreoDetalle(adminUid, correoId);
    } catch (e) {
      showToast('Error al cargar el correo', 'error');
      return;
    }
  }

  BandejaState.correoParaConvertir = correo;

  // Pre-llenar campos del modal
  _prefillModalConvertir(correo);

  // Abrir el modal
  const modal = document.getElementById('modal-correo-a-peticion');
  if (modal) modal.classList.add('open');
}

// ── Pre-llenar el modal con datos del correo ─────────────────
function _prefillModalConvertir(correo) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Datos del remitente (solo lectura, informativo)
  setText('conv-remitente',  correo.remitente);
  setText('conv-email',      correo.emailRemitente);
  setText('conv-fecha',      correo.fecha);

  // Campos editables (pre-llenados, el admin puede cambiarlos)
  set('conv-titulo',      correo.asunto);
  set('conv-descripcion', correo.preview || '');

  // Prioridad según importancia del correo
  const prioSelect = document.getElementById('conv-prioridad');
  if (prioSelect) {
    prioSelect.value = correo.importancia === 'high' ? 'Alta'
      : correo.importancia === 'low'  ? 'Baja'
      : 'Media';
  }

  // Limpiar selección de matriz
  const matrizSelect = document.getElementById('conv-matriz');
  if (matrizSelect) {
    matrizSelect.innerHTML = '<option value="">— Seleccionar Matriz —</option>';
    // Poblar con matrices reales de AppState
    const matrices = AppState.matrices || [];
    matrices.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nombre} · ${m.tipo}`;
      matrizSelect.appendChild(opt);
    });
  }

  // Poblar select de tipo de petición
  const tipoSelect = document.getElementById('conv-tipo');
  if (tipoSelect && !tipoSelect.options.length) {
    ['Solicitud', 'Incidente', 'Consulta', 'Cambio', 'Información'].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      tipoSelect.appendChild(opt);
    });
  }
}

// ── Confirmar conversión de correo a petición ────────────────
export function confirmarConvertirPeticion() {
  const correo = BandejaState.correoParaConvertir;
  if (!correo) return;

  const titulo     = document.getElementById('conv-titulo')?.value?.trim();
  const descripcion= document.getElementById('conv-descripcion')?.value?.trim();
  const matriz     = document.getElementById('conv-matriz')?.value;
  const prioridad  = document.getElementById('conv-prioridad')?.value;
  const tipo       = document.getElementById('conv-tipo')?.value;
  const fechaLimit = document.getElementById('conv-fecha-limite')?.value;

  // Validaciones
  if (!titulo) {
    showToast('El título es obligatorio', 'error');
    document.getElementById('conv-titulo')?.focus();
    return;
  }
  if (!matriz) {
    showToast('Debes seleccionar una matriz', 'error');
    document.getElementById('conv-matriz')?.focus();
    return;
  }

  // Construir objeto de petición (compatible con el sistema actual)
  const nuevaPeticion = {
    titulo,
    descripcion:  descripcion || correo.preview,
    matrizId:     matriz,
    prioridad:    prioridad || 'Media',
    tipo:         tipo || 'Solicitud',
    estado:       'pendiente',
    fechaLimite:  fechaLimit || null,
    origen:       'correo',           // campo extra para saber que vino de un email
    correoOrigen: {
      id:           correo.id,
      asunto:       correo.asunto,
      remitente:    correo.remitente,
      email:        correo.emailRemitente,
      fecha:        correo.fechaRaw
    },
    creadoPor:    getAdminUid(),
    timestamp:    new Date().toISOString()
  };

  // Disparar evento para que peticiones.js lo procese
  // (igual que si viniera del panel ejecutivo)
  const evento = new CustomEvent('nexus:nuevaPeticionDesdeCorreo', {
    detail: nuevaPeticion
  });
  document.dispatchEvent(evento);

  // Cerrar modal y limpiar
  const modal = document.getElementById('modal-correo-a-peticion');
  if (modal) modal.classList.remove('open');
  BandejaState.correoParaConvertir = null;

  showToast(`✅ Petición creada desde correo de ${correo.remitente}`, 'success');
}

// ── Cancelar modal de conversión ─────────────────────────────
export function cancelarConvertir() {
  const modal = document.getElementById('modal-correo-a-peticion');
  if (modal) modal.classList.remove('open');
  BandejaState.correoParaConvertir = null;
}

// ── Utilidad: escapar HTML ────────────────────────────────────
function _escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
