function setMobileActive(id) {
  document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.exec-sidebar');
  const overlay = document.getElementById('mobileSidebarOverlay');
  if (!sidebar || !overlay) return;
  const isOpen = sidebar.classList.contains('mobile-open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.exec-sidebar');
  const overlay = document.getElementById('mobileSidebarOverlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('open');
  if (typeof SESSION !== 'undefined' && SESSION && SESSION.role) document.body.style.overflow = '';
}

// Sync mobile nav with sidebar nav clicks (se enlaza después de que navTo existe)
document.addEventListener('nexus:exec:ready', function() {
  const map = { overview:'mnv-dashboard', dashboard:'mnv-dashboard', matrices:'mnv-matrices', objetivos:'mnv-objetivos', tareas:'mnv-tareas', perfil:'mnv-perfil' };
  const orig = window.navTo;
  if (typeof orig === 'function') {
    window.navTo = function(page, navEl) {
      orig(page, navEl);
      setMobileActive(map[page] || '');
      closeMobileSidebar();
    };
  }
});
