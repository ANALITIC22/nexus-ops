
// ── CONFIGURACIÓN ─────────────────────────────────────────────
// Contraseña del gerente (cámbiala aquí)
const GERENTE_PASSWORD = 'MANUEL2026';

// ── Estado de sesión ─────────────────────────────────────────
let SESSION = { role: null }; // 'general' | 'gerente'
let _selectedRole = null;
let _gmCurrentType = null; // 'matriz'|'objetivo'|'tarea'
let _gmCurrentMode = null; // 'crear'|'editar'
let _gmCurrentId   = null;

// ── Login UI ──────────────────────────────────────────────────
function selectRole(role) {
  _selectedRole = role;
  document.getElementById('roleGeneral').classList.toggle('selected', role === 'general');
  document.getElementById('roleGerente').classList.toggle('selected', role === 'gerente');

  const passSection = document.getElementById('passwordSection');
  const btn         = document.getElementById('loginBtn');
  const btnText     = document.getElementById('loginBtnText');
  const btnIcon     = document.getElementById('loginBtnIcon');
  const errMsg      = document.getElementById('loginErrorMsg');

  errMsg.classList.remove('visible');
  document.getElementById('loginPasswordInput').classList.remove('error');

  if (role === 'general') {
    passSection.classList.remove('visible');
    btn.disabled = false;
    btnText.textContent = 'Entrar como General';
    btnIcon.textContent = '→';
  } else {
    passSection.classList.add('visible');
    btn.disabled = false;
    btnText.textContent = 'Iniciar como Gerente';
    btnIcon.textContent = '🏛';
    setTimeout(() => document.getElementById('loginPasswordInput').focus(), 100);
  }
}

function toggleEye() {
  const inp = document.getElementById('loginPasswordInput');
  const btn = document.getElementById('eyeBtn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

function doLogin() {
  if (!_selectedRole) return;

  if (_selectedRole === 'general') {
    enterPanel('general');
    return;
  }

  // Gerente — validate password
  const pwd = document.getElementById('loginPasswordInput').value;
  const errMsg = document.getElementById('loginErrorMsg');
  const inp    = document.getElementById('loginPasswordInput');

  if (pwd !== GERENTE_PASSWORD) {
    inp.classList.add('error');
    errMsg.classList.add('visible');
    inp.select();
    // Shake animation
    inp.style.animation = 'none';
    inp.offsetHeight;
    inp.style.animation = 'shake 0.4s ease';
    return;
  }

  errMsg.classList.remove('visible');
  inp.classList.remove('error');
  enterPanel('gerente');
}

// ── Shake keyframe (inject once) ─────────────────────────────
const _shakeStyle = document.createElement('style');
_shakeStyle.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}';
document.head.appendChild(_shakeStyle);

// ── Enter panel after login ───────────────────────────────────
function enterPanel(role) {
  SESSION.role = role;

  // Hide login + unlock body scroll
  document.getElementById('loginScreen').classList.add('hidden');
  document.body.style.overflow = '';

  // Configure sidebar & header for role
  if (role === 'gerente') {
    document.getElementById('sidebarExecName').textContent     = 'Gerente';
    document.getElementById('sidebarExecRoleMini').textContent = 'Acceso completo';
    document.getElementById('sidebarExecInitials').textContent = 'GR';
    document.getElementById('gerenteNav').style.display        = 'block';
    document.getElementById('generalNav').style.display        = 'none';
    document.getElementById('sessionBadgeWrap').style.display  = 'block';
    document.getElementById('sessionRoleLabel').textContent    = '🏛 Gerente — Sesión activa';

    if (window._EXEC_REF) {
      window._EXEC_REF.name     = 'Gerente';
      window._EXEC_REF.initials = 'GR';
      window._EXEC_REF.role     = 'Gerente';
    }
  } else {
    document.getElementById('sidebarExecName').textContent     = 'Acceso General';
    document.getElementById('sidebarExecRoleMini').textContent = 'Solo lectura y participación';
    document.getElementById('sidebarExecInitials').textContent = 'GN';
    document.getElementById('gerenteNav').style.display        = 'none';
    document.getElementById('generalNav').style.display        = 'block';
    document.getElementById('sessionBadgeWrap').style.display  = 'block';
    document.getElementById('sessionRoleLabel').textContent    = '👥 General — Acceso activo';
  }

  // Show header badge
  const hbadge = document.querySelector('.header-badge');
  if (hbadge) hbadge.textContent = role === 'gerente' ? 'GERENTE' : 'GENERAL';
}

function doLogout() {
  SESSION.role     = null;
  _selectedRole    = null;
  _gmCurrentType   = null;
  _gmCurrentMode   = null;
  _gmCurrentId     = null;

  // Reset login UI
  document.getElementById('roleGeneral').classList.remove('selected');
  document.getElementById('roleGerente').classList.remove('selected');
  document.getElementById('passwordSection').classList.remove('visible');
  document.getElementById('loginPasswordInput').value = '';
  document.getElementById('loginErrorMsg').classList.remove('visible');
  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtnText').textContent = 'Seleccione un tipo de acceso';
  document.getElementById('loginBtnIcon').textContent = '→';
  document.getElementById('gerenteNav').style.display = 'none';
  document.getElementById('generalNav').style.display = 'none';
  document.getElementById('sessionBadgeWrap').style.display = 'none';

  // Show login screen + lock body scroll
  document.getElementById('loginScreen').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ── Gerente helper: expose role check ────────────────────────
window.isGerente = () => SESSION.role === 'gerente';
window.isGeneral = () => SESSION.role === 'general';
