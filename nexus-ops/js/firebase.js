// ============================================================
// NEXUS OPS — firebase.js
// Configuración e inicialización de Firebase
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc,
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC_R7AzEivuPnI_DOQqp26vMCoGiXwMMSc",
  authDomain:        "analitic-195e4.firebaseapp.com",
  projectId:         "analitic-195e4",
  storageBucket:     "analitic-195e4.firebasestorage.app",
  messagingSenderId: "372700730136",
  appId:             "1:372700730136:web:0367a21ba66d824f39446d",
  measurementId:     "G-LTHQRY5QTC"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export {
  db,
  doc, getDoc, setDoc,
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, serverTimestamp
};
