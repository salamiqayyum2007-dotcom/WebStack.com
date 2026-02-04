// Client-side auth helpers
// This file supports:
// - Google & GitHub sign-in using Firebase Auth (client)
// - Sending reset codes via a small backend (if provided) or using Firebase's reset email as fallback

// --- CONFIG ---
// For Firebase: create a Firebase project and enable Google & GitHub providers.
// Then set `window.FIREBASE_CONFIG = { ... }` before this script runs, or modify below.

if (typeof window !== 'undefined') {
  window.RESET_SERVER_URL = window.RESET_SERVER_URL || null; // e.g. 'http://localhost:3000'
}

// Lazy-load Firebase SDK when needed
async function loadFirebase() {
  if (window.firebase && window.firebase.auth) return window.firebase;
  await Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js')
  ]);
  return window.firebase;
}

function loadScript(src){
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function initFirebase() {
  await loadFirebase();
  if (!window.FIREBASE_CONFIG) {
    console.warn('FIREBASE_CONFIG not set. Google/GitHub sign-in will not work until configured.');
    return null;
  }
  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(window.FIREBASE_CONFIG);
  }
  return window.firebase.auth();
}

async function signInWithGoogle(){
  const auth = await initFirebase();
  if (!auth) return alert('Firebase not configured. See README to set up Firebase.');
  const provider = new firebase.auth.GoogleAuthProvider();
  try{
    const res = await auth.signInWithPopup(provider);
    alert(`Signed in as ${res.user.email}`);
    window.location.href = 'dashboard.html';
  }catch(err){
    console.error(err);
    alert('Google sign-in failed: '+err.message);
  }
}

async function signInWithGitHub(){
  const auth = await initFirebase();
  if (!auth) return alert('Firebase not configured. See README to set up Firebase.');
  const provider = new firebase.auth.GithubAuthProvider();
  try{
    const res = await auth.signInWithPopup(provider);
    alert(`Signed in as ${res.user.email}`);
    window.location.href = 'dashboard.html';
  }catch(err){
    console.error(err);
    alert('GitHub sign-in failed: '+err.message);
  }
}

// Send reset code: prefers backend endpoint, otherwise falls back to Firebase sendPasswordResetEmail
async function sendResetCode(){
  const email = document.getElementById('reset-email').value;
  if (!email) return alert('Please enter your email');

  if (window.RESET_SERVER_URL){
    try{
      const res = await fetch(window.RESET_SERVER_URL + '/send-reset-code', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) alert('A reset code has been sent to your email.');
      else alert('Failed to send code: '+(data.message||'unknown'));
    }catch(err){
      console.error(err);
      alert('Could not contact reset server.');
    }
  } else {
    // Fallback to Firebase reset email link
    const auth = await initFirebase();
    if (!auth) return alert('No reset mechanism available. Configure RESET_SERVER_URL or Firebase.');
    try{
      await auth.sendPasswordResetEmail(email);
      alert('A password reset email has been sent (link).');
    }catch(err){
      console.error(err);
      alert('Failed to send reset email: '+err.message);
    }
  }
}

// Verify code via backend and update local demo account password if present
async function verifyResetCode(){
  const email = document.getElementById('reset-email').value;
  const code = document.getElementById('reset-code').value;
  const newPassword = document.getElementById('new-password').value;
  if (!email || !code || !newPassword) return alert('Please fill email, code and new password');

  if (!window.RESET_SERVER_URL) return alert('No reset server configured. Use Firebase reset link or configure a server.');

  try{
    const res = await fetch(window.RESET_SERVER_URL + '/verify-reset-code', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, code, newPassword })
    });
    const data = await res.json();
    if (data.success){
      alert('Password updated. You can now login with the new password.');
      // If site uses localStorage demo accounts, update it here as convenience
      try{
        const stored = localStorage.getItem('userData');
        if (stored){
          const u = JSON.parse(stored);
          if (u.email === email){
            u.password = newPassword;
            localStorage.setItem('userData', JSON.stringify(u));
          }
        }
      }catch(e){/* ignore */}
      document.getElementById('forgot-modal').style.display = 'none';
    } else {
      alert('Verification failed: '+(data.message||'invalid code'));
    }
  }catch(err){
    console.error(err);
    alert('Could not verify code with server.');
  }
}

// Optional small helper to set RESET_SERVER_URL at runtime
function configureResetServer(url){ window.RESET_SERVER_URL = url; }

// Export for console debugging
window.authHelpers = { signInWithGoogle, signInWithGitHub, sendResetCode, verifyResetCode, configureResetServer };
