// ═══════════════════════════════════════════════════════════════════
// AUTH-UI — Login/Signup Modal & User Menu
// ═══════════════════════════════════════════════════════════════════

import { signUp, signIn, signInWithGoogle, signOut, ensureProfile } from './auth.js';
import { pullFromCloud, cancelPendingSync } from './sync.js';

// ─── DOM SETUP ───────────────────────────────────────────────────────

let _onLoginCallback = null;

/** Initialize the auth UI. Returns control object. */
export function initAuthUI(onLogin) {
  _onLoginCallback = onLogin;
  _setupAuthModal();
  _setupUserMenu();
  return { showAuthModal };
}

/** Show the auth modal (login/signup). */
export function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('hidden');
}

// ─── AUTH MODAL ─────────────────────────────────────────────────────

function _setupAuthModal() {
  const modal = document.getElementById('authModal');
  const closeBtn = document.getElementById('authCloseBtn');
  const toggleLink = document.getElementById('authToggleLink');
  const form = document.getElementById('authForm');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const submitBtn = document.getElementById('authSubmitBtn');
  const googleBtn = document.getElementById('authGoogleBtn');
  const errorEl = document.getElementById('authError');
  const titleEl = document.getElementById('authModalTitle');

  if (!modal) return;

  let mode = 'login'; // 'login' | 'signup'

  function setMode(newMode) {
    mode = newMode;
    titleEl.textContent = mode === 'login' ? 'Welcome Back' : 'Create Account';
    submitBtn.textContent = mode === 'login' ? 'Log In' : 'Sign Up';
    toggleLink.textContent = mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in';
    errorEl.textContent = '';
    errorEl.className = 'auth-error';
  }

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    setMode(mode === 'login' ? 'signup' : 'login');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      _showError('Please fill in both fields.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait…';
    errorEl.textContent = '';

    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      _showError(result.error);
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? 'Log In' : 'Sign Up';
      return;
    }

    await _onLoginSuccess();
  });

  googleBtn.addEventListener('click', async () => {
    googleBtn.disabled = true;
    googleBtn.textContent = 'Redirecting…';
    const result = await signInWithGoogle();
    if (result.error) {
      _showError(result.error);
      googleBtn.disabled = false;
      googleBtn.textContent = 'Continue with Google';
    }
  });
}

function _showError(msg) {
  const el = document.getElementById('authError');
  if (el) {
    el.textContent = msg;
    el.className = 'auth-error visible';
  }
}

async function _onLoginSuccess() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');

  // Clear form
  const form = document.getElementById('authForm');
  if (form) form.reset();

  // Ensure profile exists
  await ensureProfile();

  // Pull cloud data
  await pullFromCloud();

  // Notify app
  if (_onLoginCallback) await _onLoginCallback();
}

// ─── USER MENU (TOP BAR) ────────────────────────────────────────────

function _setupUserMenu() {
  const loginBtn = document.getElementById('topBarLogin');
  const userMenu = document.getElementById('topBarUserMenu');
  const userEmail = document.getElementById('topBarUserEmail');
  const logoutBtn = document.getElementById('topBarLogoutBtn');

  if (!loginBtn || !userMenu) return;

  loginBtn.addEventListener('click', () => showAuthModal());

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      cancelPendingSync();
      await signOut();
      _updateUserUI(null);
    });
  }
}

/** Update the top bar to show logged-in user or login button. */
export function updateUserUI(user) {
  const loginBtn = document.getElementById('topBarLogin');
  const userMenu = document.getElementById('topBarUserMenu');
  const userEmail = document.getElementById('topBarUserEmail');

  if (!loginBtn || !userMenu) return;

  if (user) {
    loginBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    if (userEmail) userEmail.textContent = user.email || 'User';
  } else {
    loginBtn.style.display = '';
    userMenu.style.display = 'none';
  }
}
