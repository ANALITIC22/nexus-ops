// ============================================================
// NEXUS OPS — perfil.js
// Perfil Profesional y Configuración
// ============================================================

import { db, doc, setDoc } from './firebase.js';
import { AppState } from './state.js';
import { showToast } from './helpers.js';
import { closeModal } from './ui.js';

// ── Perfil ───────────────────────────────────────────────────
export function renderProfileApps() {
  const container = document.getElementById('profileApps');
  if (!container) return;
  container.innerHTML = AppState.matrices.map(m => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:18px">${m.icono || '◈'}</span>
      <span style="font-size:13px;color:var(--text-b)">${m.nombre} (${m.tipo})</span>
    </div>`).join('');
}

export function applyPerfilToDOM(data) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const initials = (data.nombre || 'AC').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase() || 'AC';

  set('profileName',  data.nombre  || 'Analista Corporativo');
  set('profileRole',  (data.cargo  || 'Analista Senior') + ' · ' + (data.area || ''));
  set('profileArea',  data.area    || '');
  set('profileEmail', data.email   || '');
  set('profilePhone', data.phone   || '');
  set('profileCargo', data.cargo   || '');
  set('profileDesc',  data.desc    || '');

  const skillsEl = document.getElementById('profileSkills');
  if (skillsEl && data.skills) {
    skillsEl.innerHTML = data.skills.split(',').map(s => s.trim()).filter(Boolean)
      .map(s => `<span class="skill-tag">${s}</span>`).join('');
  }

  [
    document.getElementById('profileAvatarBig'),
    document.querySelector('.user-avatar-sm'),
    document.querySelector('.header-avatar')
  ].forEach(el => { if (el) el.textContent = initials; });

  const nameSmEl = document.querySelector('.user-name-sm');
  if (nameSmEl) nameSmEl.textContent = data.nombre || 'Analista Corp.';
}

export function prefillPerfilModal() {
  const p = AppState.perfil || {};
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('pNombre', p.nombre); setVal('pCargo', p.cargo); setVal('pArea', p.area);
  setVal('pEmail',  p.email);  setVal('pPhone', p.phone); setVal('pDesc', p.desc);
  setVal('pSkills', p.skills);
}

export async function savePerfil() {
  const get = id => document.getElementById(id)?.value?.trim() || '';
  const data = {
    nombre:    get('pNombre'), cargo:  get('pCargo'),
    area:      get('pArea'),   email:  get('pEmail'),
    phone:     get('pPhone'),  desc:   get('pDesc'),
    skills:    get('pSkills'), updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'config', 'perfil'), data);
    AppState.perfil = data;
    applyPerfilToDOM(data);
    showToast('Perfil guardado ✓', 'success');
    closeModal('modal-editar-perfil');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Configuración ────────────────────────────────────────────
export async function saveConfig() {
  const get  = id => document.getElementById(id)?.value || '';
  const getC = id => document.getElementById(id)?.checked ?? true;

  const data = {
    sistemaNombre:  get('configSistemaNombre'),
    zonaHoraria:    get('configZonaHoraria'),
    idioma:         get('configIdioma'),
    tema:           document.getElementById('themeToggleConfig')?.checked ? 'dark' : 'light',
    notifTareas:    getC('configNotifTareas'),
    notifObjetivos: getC('configNotifObjetivos'),
    updatedAt:      new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'config', 'settings'), data);
    AppState.config = data;
    _applyTema(data.tema);
    const brandEl = document.querySelector('.brand-name');
    if (brandEl && data.sistemaNombre) brandEl.textContent = data.sistemaNombre.split('—')[0].trim();
    showToast('Configuración guardada ✓', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

export function applyConfigToDOM(data) {
  if (!data) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
  const setChk = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.checked = val; };

  setVal('configSistemaNombre', data.sistemaNombre);
  setVal('configZonaHoraria',   data.zonaHoraria);
  setVal('configIdioma',        data.idioma);
  setChk('themeToggleConfig',   data.tema === 'dark');
  setChk('configNotifTareas',    data.notifTareas !== false);
  setChk('configNotifObjetivos', data.notifObjetivos !== false);

  document.querySelectorAll('#page-config .badge-yellow').forEach(b => {
    if (b.textContent === 'Pendiente') {
      b.textContent = 'Conectado';
      b.classList.replace('badge-yellow', 'badge-green');
    }
  });
}

// ── Tema ─────────────────────────────────────────────────────
function _applyTema(tema) {
  if (tema === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  }
}

export function initThemeConfig() {
  const themeToggle = document.getElementById('themeToggleConfig');
  const savedTheme  = localStorage.getItem('theme');

  const applyTheme = isDark => {
    _applyTema(isDark ? 'dark' : 'light');
    if (themeToggle) themeToggle.checked = isDark;
  };

  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme:dark)').matches)) {
    applyTheme(true);
  }
  themeToggle?.addEventListener('change', e => applyTheme(e.target.checked));
}
