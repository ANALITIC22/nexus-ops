/* ============================================================
   NEXUS OPS — msal-config.js
   Autenticación Microsoft (MSAL.js v2 — Authorization Code + PKCE)
   Generado con guía de Copilot · Integrado por el equipo Nexus Ops
   
   INSTRUCCIÓN: Reemplaza YOUR_CLIENT_ID por el Application (client) ID
   que obtienes al registrar la app en Azure Portal.
   
   Azure Portal → App registrations → nexus-ops-admin → Overview → Application (client) ID
   ============================================================ */

const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID",   // ← REEMPLAZAR con tu Client ID de Azure
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "https://analitic22.github.io/nexus-ops/Admin/"
  },
  cache: {
    cacheLocation: "localStorage",   // persiste entre pestañas
    storeAuthStateInCookie: false
  }
};

// Scopes solicitados al hacer login
const loginRequest = {
  scopes: ["User.Read", "Mail.Read"]
  // Si necesitas enviar correos añade: "Mail.Send"
};

// Scopes para las llamadas a Graph API en outlook.js
const tokenRequest = {
  scopes: ["Mail.Read"]
};

// Instancia principal de MSAL
const msalInstance = new msal.PublicClientApplication(msalConfig);

// ── Manejar respuesta de redirect (seguro aunque usemos popup) ──
msalInstance.handleRedirectPromise()
  .then((response) => {
    if (response) {
      msalInstance.setActiveAccount(response.account);
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 1) {
        msalInstance.setActiveAccount(accounts[0]);
      } else if (accounts.length > 1) {
        msalInstance.setActiveAccount(accounts[0]);
      }
    }
  })
  .catch(err => {
    console.error("[MSAL] handleRedirectPromise error:", err);
  });

// ── Login con popup ───────────────────────────────────────────
async function signInPopup() {
  try {
    const loginResponse = await msalInstance.loginPopup(loginRequest);
    msalInstance.setActiveAccount(loginResponse.account);
    return loginResponse;
  } catch (err) {
    console.error("[MSAL] loginPopup error:", err);
    // Fallback a redirect si el popup falla (bloqueadores, etc.)
    if (
      err.errorCode === "interaction_required" ||
      (err.errorMessage && err.errorMessage.includes("interaction_required"))
    ) {
      msalInstance.loginRedirect(loginRequest);
    }
    throw err;
  }
}

// ── Logout con popup ──────────────────────────────────────────
async function signOutPopup() {
  const account = msalInstance.getActiveAccount();
  if (!account) return;
  try {
    await msalInstance.logoutPopup({ account });
  } catch (err) {
    console.warn("[MSAL] logoutPopup failed, fallback redirect:", err);
    msalInstance.logoutRedirect({ account });
  }
}

// ── Obtener token: silent → popup interactivo ─────────────────
async function acquireToken() {
  // Si no hay cuenta activa, lanzar login primero
  if (!msalInstance.getActiveAccount()) {
    await signInPopup();
  }

  const silentRequest = {
    ...tokenRequest,
    account: msalInstance.getActiveAccount()
  };

  try {
    const result = await msalInstance.acquireTokenSilent(silentRequest);
    return result.accessToken;
  } catch (silentErr) {
    console.warn("[MSAL] acquireTokenSilent falló, intentando popup:", silentErr);
    try {
      const result = await msalInstance.acquireTokenPopup(tokenRequest);
      if (result?.account) msalInstance.setActiveAccount(result.account);
      return result.accessToken;
    } catch (popupErr) {
      console.error("[MSAL] acquireTokenPopup falló:", popupErr);
      throw popupErr;
    }
  }
}

// ── API pública — usada por outlook.js y correos.js ───────────

// Token de acceso para Graph API
window.getGraphAccessToken = async function () {
  return await acquireToken();
};

// Login manual (desde botón "Conectar con Microsoft" en correos.js)
window.msalSignIn = signInPopup;

// Logout manual (desde botón "Salir" en correos.js)
window.msalSignOut = signOutPopup;

// Info de la cuenta activa (nombre, email)
window.msalGetActiveAccount = function () {
  return msalInstance.getActiveAccount();
};

// ── Verificar si ya hay sesión activa al cargar ───────────────
// correos.js llama a esto para saber si mostrar bandeja o pantalla de login
window.msalHaySessionActiva = function () {
  return msalInstance.getAllAccounts().length > 0;
};
