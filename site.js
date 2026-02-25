// Shared helper functions for WebStack frontend

const API_BASE = window.API_BASE || 'http://localhost:3000'; // change if needed

// -- authentication helpers --
function saveCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
  catch(e){ return null; }
}
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

// generic fetch helper
async function apiRequest(path, opts = {}) {
  const url = API_BASE + path;
  const defaultHeaders = { 'Content-Type': 'application/json' };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }
  opts.headers = Object.assign(defaultHeaders, opts.headers || {});
  const res = await fetch(url, opts);
  return res;
}

// page utilities
function requireLogin() {
  if (!getCurrentUser()) {
    window.location.href = 'login.html';
  }
}

// build nav bar dynamically
function rebuildNav() {
  const navMenu = document.getElementById('nav-menu');
  if (!navMenu) return;
  const currentFile = window.location.pathname.split('/').pop();
  navMenu.innerHTML = '';
  const links = [
    { href: 'index.html', text: 'Home' },
    { href: 'courses.html', text: 'Courses' },
    { href: 'tutorials.html', text: 'Tutorials' }
  ];
  const user = getCurrentUser();
  if (user) {
    links.push({ href: 'leaderboard.html', text: '🏆 Leaderboard' });
    links.push({ href: 'profile.html', text: '👤 My Profile' });
    links.push({ href: '#', text: 'Logout', onClick: logout });
  } else {
    links.push({ href: 'login.html', text: 'Login' });
    links.push({ href: 'register.html', text: 'Sign Up' });
  }

  links.forEach(l => {
    const a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.text;
    if (l.onClick) {
      a.addEventListener('click', e => { e.preventDefault(); l.onClick(); });
    }
    if (l.href === currentFile) {
      a.classList.add('active');
    }
    navMenu.appendChild(a);
  });

  // attach mobile menu handlers
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.onclick = () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    };
  }
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (hamburger) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  });
}

// theme toggle helper
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
function initThemeToggle() {
  const header = document.querySelector('.header-container');
  if (!header) return;
  let btn = document.getElementById('theme-toggle-btn');
  if (btn) return;
  btn = document.createElement('button');
  btn.id = 'theme-toggle-btn';
  btn.title = 'Toggle theme';
  btn.style.cssText = 'position:absolute;top:1rem;right:1rem;width:40px;height:24px;background:#ddd;border-radius:12px;border:none;cursor:pointer;padding:0;';
  btn.innerHTML = '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#fff;position:relative;left:2px;top:2px;transition:left 0.3s"></span>';
  btn.addEventListener('click', () => {
    toggleTheme();
    const span = btn.querySelector('span');
    const theme = document.documentElement.getAttribute('data-theme');
    span.style.left = theme === 'dark' ? '20px' : '2px';
  });
  header.appendChild(btn);
  // set initial position
  const theme = document.documentElement.getAttribute('data-theme');
  btn.querySelector('span').style.left = theme === 'dark' ? '20px' : '2px';
}

// when DOM ready run nav and other helpers
window.addEventListener('DOMContentLoaded', () => {
  rebuildNav();
  initThemeToggle();
});

// export for debugging
window.siteHelpers = { apiRequest, saveCurrentUser, getCurrentUser, logout, requireLogin };
