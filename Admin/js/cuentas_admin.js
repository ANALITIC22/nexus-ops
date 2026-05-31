// ============================================================
// NEXUS OPS — cuentas_admin.js
// Gestión de cuentas de administrador: CRUD, login UI,
// estadísticas por admin, y filtrado de matrices propias
// ============================================================

import {
  loginAdmin, logoutAdmin, watchAuth,
  crearAdmin, getAdmins, updateAdmin,
  AdminSession
} from './auth.js';
import { AppState } from './state.js';
import { showToast } from './helpers.js';
import { closeModal, openModal } from './ui.js';
import { updateNavBadges } from './sync.js';

// ── Estado local ─────────────────────────────────────────────
let _adminsCache = [];
let _editingAdminUid = null;

// ── Inicializar sistema de auth al arrancar ──────────────────
export function initAdminAuth() {
  watchAuth(
    (session) => {
      // Admin autenticado
      _ocultarLogin();
      _aplicarSesionAlDOM(session);
      updateNavBadges();
      if (document.getElementById('page-cuentas-admin')?.classList.contains('active')) {
        renderCuentasAdmin();
      }
    },
    () => {
      // No autenticado → mostrar login
      _mostrarLogin();
    }
  );
}

// ── Mostrar/Ocultar overlay de login ─────────────────────────
function _mostrarLogin() {
  const overlay = document.getElementById('admin-login-overlay');
  if (overlay) overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function _ocultarLogin() {
  const overlay = document.getElementById('admin-login-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Aplicar datos de sesión al DOM ───────────────────────────
function _aplicarSesionAlDOM(session) {
  // Avatar sidebar
  ['user-avatar-sm', 'header-avatar'].forEach(cls => {
    document.querySelectorAll('.' + cls).forEach(el => {
      el.textContent = session.initials || 'AD';
    });
  });
  // Nombre sidebar
  const nameEl = document.querySelector('.user-name-sm');
  if (nameEl) nameEl.textContent = session.nombre || 'Administrador';

  // Role badge
  const roleEl = document.querySelector('.user-role-sm');
  if (roleEl) roleEl.textContent = 'Admin · ' + (session.cargo || 'Activo');

  // Guardar en AppState
  AppState.adminSession = session;
}

// ── Login desde UI ────────────────────────────────────────────
export async function loginAdminUI() {
  const email    = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  const errEl    = document.getElementById('loginError');
  const inputEl  = document.getElementById('loginEmail');
  const btn      = document.getElementById('loginSubmitBtn');

  if (!email || !password) {
    errEl.textContent = 'Completa todos los campos.';
    errEl.classList.add('visible');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>Verificando...</span>';

  try {
    await loginAdmin(email, password);
    errEl.classList.remove('visible');
    document.getElementById('loginEmail').value    = '';
    document.getElementById('loginPassword').value = '';
    showToast(`Bienvenido, ${AdminSession.nombre} ✓`, 'success');
  } catch (e) {
    errEl.textContent = 'Credenciales incorrectas. Intenta nuevamente.';
    errEl.classList.add('visible');
    document.getElementById('loginPassword').classList.add('error');
    document.getElementById('loginPassword').style.animation = 'none';
    document.getElementById('loginPassword').offsetHeight; // reflow
    document.getElementById('loginPassword').style.animation = 'shake 0.4s ease';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Entrar al Panel</span><span>→</span>';
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logoutAdminUI() {
  if (!confirm('¿Cerrar sesión?')) return;
  await logoutAdmin();
  showToast('Sesión cerrada', 'warning');
}

// ── Toggle password visibility ───────────────────────────────
export function toggleLoginEye() {
  const inp = document.getElementById('loginPassword');
  const btn = document.getElementById('loginEyeBtn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else                         { inp.type = 'password'; btn.textContent = '👁'; }
}

export function toggleModalEye() {
  const inp = document.getElementById('caPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── Fuerza de contraseña ─────────────────────────────────────
export function checkPasswordStrength(val) {
  const bar  = document.getElementById('pwStrengthBar');
  const text = document.getElementById('pwStrengthText');
  if (!bar) return;

  if (!val) { bar.className = 'password-strength-fill'; text.textContent = ''; return; }

  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;

  const map = [
    ['', ''],
    ['strength-weak',   '⚠ Débil'],
    ['strength-medium', '◑ Media'],
    ['strength-strong', '✓ Fuerte']
  ];
  bar.className  = 'password-strength-fill ' + (map[score]?.[0] || '');
  text.textContent = map[score]?.[1] || '';
}

// ── Render de cuentas ─────────────────────────────────────────
export async function renderCuentasAdmin() {
  await recargarAdmins();
}

export async function recargarAdmins() {
  try {
    _adminsCache = await getAdmins();
  } catch (e) {
    showToast('Error al cargar admins: ' + e.message, 'error');
    return;
  }

  const grid = document.getElementById('ca-admins-grid');
  if (!grid) return;

  // Estadísticas globales
  const totalMatrices = AppState.matrices.length;
  const myMatrices    = AppState.matrices.filter(m => m.creadoPor === AdminSession.uid).length;

  const el = id => document.getElementById(id);
  if (el('ca-total-admins'))  el('ca-total-admins').textContent  = _adminsCache.length;
  if (el('ca-total-matrices')) el('ca-total-matrices').textContent = totalMatrices;
  if (el('ca-my-matrices'))    el('ca-my-matrices').textContent    = myMatrices;

  if (!_adminsCache.length) {
    grid.innerHTML = `<div class="ca-empty">
      <div class="ca-empty-icon">👥</div>
      <div class="ca-empty-title">No hay administradores registrados</div>
    </div>`;
    return;
  }

  grid.innerHTML = _adminsCache.map(admin => {
    const esYo        = admin.uid === AdminSession.uid;
    const misMatrices = AppState.matrices.filter(m => m.creadoPor === admin.uid);
    const initials    = (admin.nombre || 'AD').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();

    const esSuperAdmin  = admin.rol === 'superadmin' || admin.esSuperAdmin;
    const yoSoySuper    = AdminSession.isSuperAdmin;

    return `
    <div class="ca-card${esYo ? ' is-me' : ''}${esSuperAdmin ? ' is-superadmin' : ''}">
      <div class="ca-card-head">
        <div class="ca-avatar" style="${esSuperAdmin ? 'background:var(--accent,#534AB7);color:#fff' : ''}">${initials}</div>
        <div style="flex:1;min-width:0">
          <div class="ca-name">${admin.nombre || 'Sin nombre'}</div>
          <div class="ca-email">${admin.email || ''}</div>
          <div class="ca-cargo">${esSuperAdmin ? '⭐ Super Admin' : (admin.cargo || 'Administrador')}</div>
        </div>
        ${esYo ? '<div class="ca-badge-me">Tú</div>' : ''}
      </div>

      <div class="ca-stats-mini">
        <div class="ca-mini-stat">
          <span class="ca-mini-val">${misMatrices.length}</span>
          <div class="ca-mini-lbl">Matrices</div>
        </div>
        <div class="ca-mini-stat">
          <span class="ca-mini-val">${AppState.objetivos.filter(o => misMatrices.some(m => m.id === o.matrizId)).length}</span>
          <div class="ca-mini-lbl">Objetivos</div>
        </div>
        <div class="ca-mini-stat">
          <span class="ca-mini-val">${AppState.tareas.filter(t => misMatrices.some(m => m.id === t.matrizId)).length}</span>
          <div class="ca-mini-lbl">Tareas</div>
        </div>
      </div>

      <div style="font-size:11px;color:var(--text-m);margin-bottom:12px">
        <span class="ca-status-dot"></span>Activo
        &nbsp;·&nbsp; Desde ${_fmtDate(admin.createdAt)}
      </div>

      <div class="ca-actions">
        <button class="ca-btn" onclick="verMatricesAdmin('${admin.uid}', '${_esc(admin.nombre)}')">
          ◈ Ver matrices
        </button>
        ${(yoSoySuper || esYo) ? `<button class="ca-btn" onclick="editarAdmin('${admin.uid}')">✎ Editar</button>` : ''}
        ${(!esYo && (yoSoySuper || !esSuperAdmin)) ? `<button class="ca-btn danger" onclick="confirmarEliminarAdmin('${admin.uid}', '${_esc(admin.nombre)}')">✕ Eliminar</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── Guardar/Crear admin ───────────────────────────────────────
export async function guardarAdmin() {
  const nombre   = document.getElementById('caNombre')?.value?.trim();
  const cargo    = document.getElementById('caCargo')?.value?.trim();
  const email    = document.getElementById('caEmail')?.value?.trim();
  const password = document.getElementById('caPassword')?.value;

  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
  if (!email)  { showToast('El correo es obligatorio', 'error'); return; }
  if (!password || password.length < 6) {
    showToast('La contraseña debe tener mínimo 6 caracteres', 'error'); return;
  }

  const btn = document.getElementById('btnGuardarAdmin');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando...'; }

  try {
    await crearAdmin(email, password, nombre, cargo);
    showToast(`Cuenta creada para ${nombre} ✓`, 'success');
    closeModal('modal-crear-admin');
    _limpiarModalAdmin();
    await recargarAdmins();
  } catch (e) {
    const msgs = {
      'auth/email-already-in-use': 'Ese correo ya está registrado.',
      'auth/invalid-email':         'Correo no válido.',
      'auth/weak-password':         'Contraseña muy débil (mínimo 6 caracteres).'
    };
    showToast(msgs[e.code] || 'Error: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Crear Cuenta'; }
  }
}

// ── Ver matrices de un admin específico ──────────────────────
export function verMatricesAdmin(uid, nombre) {
  // Filtro temporal para mostrar solo las matrices de ese admin
  AppState.filtroAdminVer = uid;
  showToast(`Mostrando matrices de ${nombre}`, 'success');
  // Navegar a la página de matrices con filtro aplicado
  window.navigate?.('matrices', null);
}

// ── Confirmar y eliminar admin ───────────────────────────────
export function confirmarEliminarAdmin(uid, nombre) {
  const mats = AppState.matrices.filter(m => m.creadoPor === uid).length;
  const msg = mats > 0
    ? `¿Eliminar la cuenta de "${nombre}"?\nEsta persona tiene ${mats} matrice(s) asignada(s) que quedarán sin responsable.`
    : `¿Eliminar la cuenta de "${nombre}"?`;

  if (!confirm(msg)) return;
  _eliminarAdmin(uid, nombre);
}

async function _eliminarAdmin(uid, nombre) {
  try {
    // Solo marcamos como inactivo en Firestore (no podemos eliminar auth users desde cliente)
    await updateAdmin(uid, { activo: false, deletedAt: new Date().toISOString() });
    showToast(`Cuenta de ${nombre} desactivada`, 'warning');
    await recargarAdmins();
  } catch (e) {
    showToast('Error al eliminar: ' + e.message, 'error');
  }
}

// ── Limpiar modal ─────────────────────────────────────────────
function _limpiarModalAdmin() {
  ['caNombre', 'caCargo', 'caEmail', 'caPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const bar = document.getElementById('pwStrengthBar');
  if (bar) { bar.className = 'password-strength-fill'; }
  const txt = document.getElementById('pwStrengthText');
  if (txt) txt.textContent = '';
  _editingAdminUid = null;
}

// ── Helpers ──────────────────────────────────────────────────
function _fmtDate(iso) {
  if (!iso) return '–';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
  } catch { return '–'; }
}

function _esc(str) {
  return (str || '').replace(/'/g, "\\'");
}

// ── Editar admin (solo superadmin o uno mismo) ────────────────
export function editarAdmin(uid) {
  if (!AdminSession.isSuperAdmin && uid !== AdminSession.uid) {
    showToast('No tienes permiso para editar esta cuenta', 'error');
    return;
  }
  const admin = _adminsCache.find(a => a.uid === uid);
  if (!admin) return;
  _editingAdminUid = uid;

  // Rellenar modal de edición (reutilizamos modal-crear-admin si existe)
  const nombre = document.getElementById('caNombre');
  const cargo  = document.getElementById('caCargo');
  const email  = document.getElementById('caEmail');
  const pass   = document.getElementById('caPassword');
  if (nombre) nombre.value = admin.nombre || '';
  if (cargo)  cargo.value  = admin.cargo  || '';
  if (email)  { email.value = admin.email || ''; email.disabled = true; }
  if (pass)   { pass.value = ''; pass.placeholder = 'Dejar vacío para no cambiar'; }

  const title = document.getElementById('modalAdminTitle');
  if (title) title.textContent = 'Editar Administrador';
  const btn = document.getElementById('btnGuardarAdmin');
  if (btn) btn.textContent = 'Guardar cambios';

  openModal('modal-crear-admin');
}

// ── Guardar edición de admin existente ────────────────────────
export async function guardarEdicionAdmin() {
  if (!_editingAdminUid) return;
  const nombre = document.getElementById('caNombre')?.value?.trim();
  const cargo  = document.getElementById('caCargo')?.value?.trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

  try {
    await updateAdmin(_editingAdminUid, { nombre, cargo });
    showToast('Datos actualizados ✓', 'success');
    closeModal('modal-crear-admin');
    _editingAdminUid = null;
    // Resetear email
    const email = document.getElementById('caEmail');
    if (email) email.disabled = false;
    await recargarAdmins();
  } catch (e) {
    showToast('Error al guardar: ' + e.message, 'error');
  }
}
