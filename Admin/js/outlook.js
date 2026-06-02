// ============================================================
// NEXUS OPS — outlook.js
// Integración con Microsoft Graph API (Outlook / Microsoft 365)
// Fase 1: Lectura manual de bandeja por administrador
//
// CADA ADMINISTRADOR conecta su PROPIA cuenta de Microsoft.
// El token OAuth se guarda en sessionStorage (solo dura la sesión)
// y en Firestore (campo msToken del doc admins/{uid}) para
// persistencia entre recargas. Nunca se comparte entre admins.
//
// ──────────────────────────────────────────────────────────────
// CONFIGURACIÓN REQUERIDA (completar cuando tengas el App Registration):
//
//   MS_CLIENT_ID  → Application (client) ID en Azure AD
//   MS_TENANT_ID  → 'common' para cuentas personales/organizacionales
//                   o tu Tenant ID específico para solo tu org
//
// Pasos en Azure Portal:
//   1. portal.azure.com → Azure Active Directory → App registrations
//   2. New registration → nombre: "Nexus Ops"
//   3. Redirect URI: tipo "Single-page application (SPA)"
//      URL: (la URL donde está desplegado tu proyecto, ej: https://tudominio.com/Admin/)
//   4. API permissions → Microsoft Graph → Delegated:
//      - Mail.Read
//      - Mail.Send  (opcional, para responder al cliente)
//      - User.Read  (para obtener nombre del admin)
//   5. Grant admin consent
//   6. Copiar el Application ID aquí abajo
// ============================================================

// ── ⚙️  CONFIGURACIÓN — COMPLETAR ANTES DE USAR ─────────────
const MS_CLIENT_ID = 'TU_CLIENT_ID_AQUI';        // ← Reemplazar
const MS_TENANT_ID = 'common';                    // ← 'common' o tu tenant ID
const MS_REDIRECT  = window.location.origin + window.location.pathname;

// Scopes de permisos que se solicitan al usuario
const MS_SCOPES = [
  'openid',
  'profile',
  'User.Read',
  'Mail.Read',
  'Mail.Send'          // eliminar si no quieres enviar respuestas
].join(' ');

// Endpoints de Microsoft Graph
const GRAPH_BASE    = 'https://graph.microsoft.com/v1.0';
const AUTH_ENDPOINT = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize`;
const TOKEN_ENDPOINT= `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;

// ── Estado interno del módulo ────────────────────────────────
let _msAccessToken  = null;   // token activo en memoria
let _msTokenExpires = 0;      // timestamp de expiración
let _msUserInfo     = null;   // { displayName, mail }

// ── Helpers de storage (por admin) ──────────────────────────
// La clave incluye el UID del admin para que NO se mezclen sesiones
function _tokenKey(uid) { return `nexus_ms_token_${uid}`; }
function _expiryKey(uid){ return `nexus_ms_expiry_${uid}`; }

// ── Verificar si está configurado ───────────────────────────
export function outlookConfigurado() {
  return MS_CLIENT_ID !== 'TU_CLIENT_ID_AQUI' && MS_CLIENT_ID.length > 10;
}

// ── Verificar si hay token válido para este admin ────────────
export function outlookConectado(adminUid) {
  const tok = sessionStorage.getItem(_tokenKey(adminUid));
  const exp = parseInt(sessionStorage.getItem(_expiryKey(adminUid)) || '0');
  if (tok && Date.now() < exp) {
    _msAccessToken  = tok;
    _msTokenExpires = exp;
    return true;
  }
  return false;
}

// ── OAuth manual — REEMPLAZADO POR MSAL.js ───────────────────
// Estas funciones ya no se usan. MSAL (msal-config.js) maneja todo.
// Se mantienen como stubs para no romper imports existentes.
export function iniciarLoginMicrosoft() {
  // Delegado a window.msalSignIn (msal-config.js)
  window.msalSignIn?.();
}

export function procesarCallbackMicrosoft() {
  // MSAL maneja esto en handleRedirectPromise (msal-config.js)
  return false;
}

export function desconectarMicrosoft() {
  // Delegado a window.msalSignOut (msal-config.js)
  window.msalSignOut?.();
}

// ── Obtener info del usuario conectado ───────────────────────
export async function getMsUserInfo(adminUid) {
  if (_msUserInfo) return _msUserInfo;
  try {
    const data = await _graphGet('/me?$select=displayName,mail,userPrincipalName');
    _msUserInfo = {
      nombre: data.displayName || 'Sin nombre',
      email:  data.mail || data.userPrincipalName || 'Sin correo'
    };
    return _msUserInfo;
  } catch (e) {
    console.error('[Outlook] Error al obtener perfil:', e);
    return null;
  }
}

// ── Leer correos de la bandeja de entrada ────────────────────
// Devuelve array de objetos con la info normalizada
// filtros: { soloNoLeidos: bool, busqueda: string, carpeta: string }
export async function getCorreosBandeja(adminUid, filtros = {}) {
  const {
    soloNoLeidos = false,
    busqueda     = '',
    carpeta      = 'inbox',
    top          = 30
  } = filtros;

  let url = `/${carpeta}/messages?$top=${top}&$orderby=receivedDateTime desc`;
  url += `&$select=id,subject,from,receivedDateTime,isRead,bodyPreview,importance,hasAttachments,body`;

  // Filtros de OData
  const filtrosOdata = [];
  if (soloNoLeidos) filtrosOdata.push('isRead eq false');
  if (busqueda) {
    // búsqueda libre en asunto o remitente
    url += `&$search="${busqueda.replace(/"/g, '\\"')}"`;
  } else if (filtrosOdata.length) {
    url += `&$filter=${filtrosOdata.join(' and ')}`;
  }

  try {
    const data = await _graphGet(`/me/mailFolders${url}`);
    return (data.value || []).map(_normalizarCorreo);
  } catch (e) {
    console.error('[Outlook] Error al leer bandeja:', e);
    throw e;
  }
}

// ── Obtener un correo completo por ID ─────────────────────────
export async function getCorreoDetalle(adminUid, correoId) {
  try {
    const data = await _graphGet(`/me/messages/${correoId}?$select=id,subject,from,toRecipients,receivedDateTime,isRead,body,hasAttachments,importance`);
    return _normalizarCorreo(data);
  } catch (e) {
    console.error('[Outlook] Error al obtener detalle:', e);
    throw e;
  }
}

// ── Marcar correo como leído ──────────────────────────────────
export async function marcarComoLeido(adminUid, correoId) {
  try {
    await _graphPatch(`/me/messages/${correoId}`, { isRead: true });
    return true;
  } catch (e) {
    console.error('[Outlook] Error al marcar leído:', e);
    return false;
  }
}

// ── Enviar respuesta al remitente (opcional) ─────────────────
export async function responderCorreo(adminUid, correoId, cuerpoRespuesta) {
  try {
    await _graphPost(`/me/messages/${correoId}/reply`, {
      message: {
        body: {
          contentType: 'HTML',
          content: cuerpoRespuesta
        }
      },
      comment: ''
    });
    return true;
  } catch (e) {
    console.error('[Outlook] Error al responder correo:', e);
    throw e;
  }
}

// ── Obtener carpetas del buzón ────────────────────────────────
export async function getCarpetas(adminUid) {
  try {
    const data = await _graphGet('/me/mailFolders?$top=20');
    return (data.value || []).map(c => ({
      id:     c.id,
      nombre: c.displayName,
      total:  c.totalItemCount,
      noLeidos: c.unreadItemCount
    }));
  } catch (e) {
    console.error('[Outlook] Error al obtener carpetas:', e);
    return [];
  }
}

// ── Normalizar correo de Graph API → objeto interno ──────────
function _normalizarCorreo(raw) {
  return {
    id:            raw.id,
    asunto:        raw.subject || '(Sin asunto)',
    remitente:     raw.from?.emailAddress?.name  || raw.from?.emailAddress?.address || 'Desconocido',
    emailRemitente:raw.from?.emailAddress?.address || '',
    fecha:         raw.receivedDateTime ? _formatFecha(raw.receivedDateTime) : '–',
    fechaRaw:      raw.receivedDateTime || '',
    leido:         raw.isRead === true,
    preview:       raw.bodyPreview || '',
    cuerpo:        raw.body?.content || raw.bodyPreview || '',
    cuerpoTipo:    raw.body?.contentType || 'text',
    adjuntos:      raw.hasAttachments === true,
    importancia:   raw.importance || 'normal',   // low | normal | high
    destinatarios: (raw.toRecipients || []).map(r => r.emailAddress?.address).filter(Boolean)
  };
}

// ── Formatear fecha ───────────────────────────────────────────
function _formatFecha(iso) {
  const d = new Date(iso);
  const hoy    = new Date();
  const ayer   = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const esHoy  = d.toDateString() === hoy.toDateString();
  const esAyer = d.toDateString() === ayer.toDateString();

  if (esHoy)  return `Hoy ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
  if (esAyer) return `Ayer ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── HTTP helpers (Graph API) ─────────────────────────────────
// Token provisto por MSAL.js (msal-config.js) via window.getGraphAccessToken
// Esto reemplaza el flujo OAuth manual — MSAL maneja renovación automática

async function _getToken() {
  if (typeof window.getGraphAccessToken !== 'function') {
    throw new Error('MSAL no está cargado. Verifica que msal-config.js se carga antes que script.js.');
  }
  return await window.getGraphAccessToken();
}

async function _graphGet(path) {
  const token = await _getToken();

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (res.status === 401) {
    throw new Error('Sesión de Microsoft expirada. MSAL intentará renovar automáticamente.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error Graph API: ${res.status}`);
  }
  return res.json();
}

async function _graphPatch(path, body) {
  const token = await _getToken();

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error Graph API: ${res.status}`);
  }
  return true;
}

async function _graphPost(path, body) {
  const token = await _getToken();

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error Graph API: ${res.status}`);
  }
  return true;
}

// ── Inicialización del módulo ─────────────────────────────────
// MSAL.js maneja todo el flujo OAuth automáticamente via msal-config.js
// initOutlook solo verifica que MSAL esté disponible y redirige si hay sesión
export function initOutlook() {
  // Esperar a que msal-config.js haya procesado handleRedirectPromise
  setTimeout(() => {
    const haySesion = window.msalHaySessionActiva?.();
    if (haySesion) {
      // Si ya hay sesión activa, ir directo a la bandeja al navegar a correos
      console.log('[Outlook] Sesión Microsoft activa detectada');
    }
  }, 500);
}
