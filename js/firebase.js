/* ============================================================
   firebase.js — Inicialización Firebase + State global + Helpers
   Importado por: todos los módulos de render
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, onSnapshot,
  addDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC_R7AzEivuPnI_DOQqp26vMCoGiXwMMSc",
  authDomain: "analitic-195e4.firebaseapp.com",
  projectId: "analitic-195e4",
  storageBucket: "analitic-195e4.firebasestorage.app",
  messagingSenderId: "372700730136",
  appId: "1:372700730136:web:0367a21ba66d824f39446d",
  measurementId: "G-LTHQRY5QTC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, onSnapshot, addDoc, doc, serverTimestamp };

// ── Estado global compartido ──────────────────────────────────
export const S = {
  matrices: [], objetivos: [], tareas: [],
  diagramas: [], reportes: [], gestion: [],
  comments: [], perfil: null,
  currentMatrizId: null, commentFilter: ''
};

// ── Identidad ejecutiva ───────────────────────────────────────
export const EXEC = { name: 'Jefe Ejecutivo', initials: 'JE', role: 'Director' };
