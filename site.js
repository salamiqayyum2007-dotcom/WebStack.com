// Shared helper functions for WebStack frontend

// clear any stored API base override (was used for debug features)
localStorage.removeItem('API_BASE');
// If the page is opened via file://, use localhost:3000 to reach the dev server.
// Otherwise, use a relative path so it works when hosted on the same origin.
const API_BASE = window.API_BASE || (location.protocol === 'file:' ? 'http://localhost:3000' : '');

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
  const defaultHeaders = { 'Content-Type': 'application/json' };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }
  opts.headers = Object.assign(defaultHeaders, opts.headers || {});

  const baseUrls = [API_BASE];
  // If running from file://, try both localhost and 127.0.0.1 in case one is blocked.
  if (location.protocol === 'file:' && API_BASE.startsWith('http://localhost')) {
    baseUrls.push(API_BASE.replace('localhost', '127.0.0.1'));
  }

  let lastError;
  for (const base of baseUrls) {
    const url = base + path;
    try {
      return await fetch(url, opts);
    } catch (err) {
      lastError = err;
      console.warn('apiRequest failed:', url, err);
    }
  }

  throw lastError || new Error('Unknown network error');
}

// page utilities
function requireLogin() {
  if (!getCurrentUser()) {
    window.location.href = 'index.html';
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
    { href: 'tutorials.html', text: 'Tutorials' },
    { href: 'about.html', text: 'About' },
    { href: 'contact.html', text: 'Contact' },
  ];
  const user = getCurrentUser();
  if (user) {
    links.push({ href: 'dashboard.html', text: 'Dashboard' });
    links.push({ href: '#', text: 'Logout', onClick: logout });
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
  updateThemeToggle();
}

function updateThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', toggleTheme);
  updateThemeToggle();
}

// Simple scroll reveal for elements with the .animate class
function initScrollReveal() {
  const elements = Array.from(document.querySelectorAll('.animate'));
  if (!elements.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  elements.forEach(el => observer.observe(el));
}

// Header animation (logo & nav fade-in)
function initHeaderAnimation() {
  const header = document.querySelector('header');
  if (!header) return;
  requestAnimationFrame(() => {
    header.classList.add('header-animated');
  });
}

// Simple carousel slider for video walkthroughs
function initVideoCarousel() {
  const carousel = document.querySelector('.video-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.carousel-track');
  const prevBtn = carousel.querySelector('.carousel-btn.prev');
  const nextBtn = carousel.querySelector('.carousel-btn.next');
  const slides = Array.from(track.children);
  let index = 0;

  const updateButtons = () => {
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= slides.length - 1;
  };

  const updateSlide = () => {
    const slideWidth = slides[index].getBoundingClientRect().width;
    track.style.transform = `translateX(-${slideWidth * index}px)`;
    updateButtons();
  };

  prevBtn.addEventListener('click', () => {
    index = Math.max(0, index - 1);
    updateSlide();
  });

  nextBtn.addEventListener('click', () => {
    index = Math.min(slides.length - 1, index + 1);
    updateSlide();
  });

  window.addEventListener('resize', updateSlide);
  updateSlide();
}

// when DOM ready run nav, theme toggle, and animations
window.addEventListener('DOMContentLoaded', () => {
  rebuildNav();
  initThemeToggle();
  initHeaderAnimation();
  initScrollReveal();
  initVideoCarousel();
});

// export for debugging
window.siteHelpers = { apiRequest, saveCurrentUser, getCurrentUser, logout, requireLogin };
