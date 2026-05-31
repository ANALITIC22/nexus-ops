// ============================================================
// NEXUS OPS — auth.js
// Autenticación multi-admin con Firebase Auth
// Cada admin tiene su propia sesión y sus matrices filtradas
// ============================================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC_R7AzEivuPnI_DOQqp26vMCoGiXwMMSc",
  authDomain:        "analitic-195e4.firebaseapp.com",
  projectId:         "analitic-195e4",
  storageBucket:     "analitic-195e4.firebasestorage.app",
  messagingSenderId: "372700730136",
  appId:             "1:372700730136:web:0367a21ba66d824f39446d"
};

// Reusar app si ya fue inicializada
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Estado de sesión activa ──────────────────────────────────
export const AdminSession = {
  uid:          null,
  email:        null,
  nombre:       null,
  cargo:        null,
  initials:     null,
  rol:          'admin',
  isSuperAdmin: false,   // true solo si rol === 'superadmin'
  loggedIn:     false
};

// ── Login ────────────────────────────────────────────────────
export async function loginAdmin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await _cargarPerfil(cred.user);
  return AdminSession;
}

// ── Logout ───────────────────────────────────────────────────
export async function logoutAdmin() {
  await signOut(auth);
  Object.assign(AdminSession, {
    uid: null, email: null, nombre: null,
    cargo: null, initials: null, loggedIn: false,
    isSuperAdmin: false, rol: 'admin'
  });
}

// ── Observer de autenticación ────────────────────────────────
export function watchAuth(onLogin, onLogout) {
  return onAuthStateChanged(auth, async user => {
    if (user) {
      await _cargarPerfil(user);
      onLogin(AdminSession);
    } else {
      Object.assign(AdminSession, { uid: null, email: null, nombre: null, loggedIn: false, isSuperAdmin: false, rol: 'admin' });
      onLogout();
    }
  });
}

// ── Cargar perfil del admin desde Firestore ──────────────────
async function _cargarPerfil(user) {
  AdminSession.uid    = user.uid;
  AdminSession.email  = user.email;
  AdminSession.loggedIn = true;

  const snap = await getDoc(doc(db, 'admins', user.uid));
  if (snap.exists()) {
    const d = snap.data();
    AdminSession.nombre       = d.nombre   || user.email;
    AdminSession.cargo        = d.cargo    || 'Administrador';
    AdminSession.initials     = _initials(AdminSession.nombre);
    AdminSession.rol          = d.rol      || 'admin';
    AdminSession.isSuperAdmin = d.rol === 'superadmin' || d.esSuperAdmin === true;
  } else {
    // Crear perfil mínimo si no existe
    const nombre = user.displayName || user.email.split('@')[0];
    AdminSession.nombre   = nombre;
    AdminSession.cargo    = 'Administrador';
    AdminSession.initials = _initials(nombre);
    await setDoc(doc(db, 'admins', user.uid), {
      nombre, email: user.email,
      cargo: 'Administrador', rol: 'admin',
      createdAt: new Date().toISOString(),
      activo: true
    });
  }
}

// ── Crear nuevo admin (solo un superadmin puede hacerlo desde UI) ─
export async function crearAdmin(email, password, nombre, cargo) {
  // Crear auth user
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: nombre });

  // Guardar en colección admins
  await setDoc(doc(db, 'admins', cred.user.uid), {
    nombre,
    email,
    cargo:     cargo || 'Administrador',
    rol:       'admin',
    activo:    true,
    createdAt: new Date().toISOString()
  });

  return cred.user.uid;
}

// ── Obtener todos los admins ─────────────────────────────────
export async function getAdmins() {
  const snap = await getDocs(collection(db, 'admins'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── Actualizar datos del admin ───────────────────────────────
export async function updateAdmin(uid, data) {
  await updateDoc(doc(db, 'admins', uid), {
    ...data,
    updatedAt: new Date().toISOString()
  });
}

// ── Helpers ──────────────────────────────────────────────────
function _initials(nombre) {
  return (nombre || 'AD').split(' ')
    .map(w => w[0] || '').join('')
    .substring(0, 2).toUpperCase();
}

export { auth, db };
