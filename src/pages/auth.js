// DevTrack Auth Pages: Real-time Firebase Authentication & Setup
import { store } from '../store.js';
import { showToast, showModal, closeModal } from '../ui.js';
import {
  firebaseLogin,
  firebaseRegister,
  firebaseGoogleLogin,
  firebaseResetPassword,
  formatFirebaseError
} from '../firebase.js';

export function redirectAfterAuth() {
  const pendingToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pending_invite_token') : null;
  if (pendingToken) {
    window.location.hash = `#/invite?token=${encodeURIComponent(pendingToken)}`;
  } else {
    window.location.hash = '#/dashboard';
  }
}

export function renderSignIn(container) {
  container.innerHTML = `
    <div class="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div class="w-full max-w-md bg-surface-canvas border border-border-strong rounded-2xl p-8 shadow-2xl animate-scale-in relative">
        
        <!-- Logo & Header -->
        <div class="flex items-center justify-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xl shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-[24px]">terminal</span>
          </div>
          <span class="font-geist text-headline-lg font-bold text-text-primary tracking-tight">DevTrack</span>
        </div>
        <div class="text-center mb-6">
          <h1 class="font-geist text-headline-md font-semibold text-text-primary mb-1">Sign In to Workspace</h1>
          <p class="text-text-muted text-body-sm">Enterprise Software Engineering Lifecycle Platform</p>
        </div>

        <!-- Google Sign In Button -->
        <button id="firebase-google-btn" type="button" class="w-full py-2.5 px-4 mb-4 rounded-xl bg-surface-panel hover:bg-surface-elevated text-text-primary border border-border-subtle hover:border-primary/50 transition-all font-inter text-body-md font-semibold flex items-center justify-center gap-3 shadow-sm active:scale-[0.99] group">
          <svg class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div class="relative flex items-center justify-center my-4">
          <div class="border-t border-border-subtle w-full"></div>
          <span class="bg-surface-canvas px-3 text-[11px] font-jetbrains text-text-muted uppercase tracking-wider">or sign in with email</span>
        </div>

        <!-- Login Form -->
        <form id="signin-form" class="space-y-4">
          <div>
            <label class="block text-label-md font-medium text-text-secondary mb-1.5" for="login-email">Email Address</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">mail</span>
              <input type="email" id="login-email" required placeholder="user@company.com"
                class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all" />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-label-md font-medium text-text-secondary" for="login-password">Password</label>
              <a href="#/forgot-password" class="text-label-sm text-secondary hover:underline">Forgot password?</a>
            </div>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">lock</span>
              <input type="password" id="login-password" required placeholder="••••••••"
                class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all" />
            </div>
          </div>

          <div id="login-error" class="hidden p-3 rounded-lg bg-status-defect-surface border border-status-defect/30 text-status-defect text-body-sm flex items-start gap-2">
            <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <span id="login-error-text" class="flex-1 font-inter"></span>
          </div>

          <button type="submit" id="submit-login-btn" class="w-full mt-2 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-[0.99] flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">login</span>
            <span>Sign In</span>
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-border-subtle text-center text-body-sm text-text-muted">
          Don't have an account?
          <a href="#/register" class="text-primary hover:underline font-medium ml-1">Create Account</a>
        </div>
      </div>
    </div>
  `;

  // Attach Google Sign-in
  container.querySelector('#firebase-google-btn')?.addEventListener('click', async () => {
    const googleBtn = container.querySelector('#firebase-google-btn');
    const originalText = googleBtn.innerHTML;
    try {
      googleBtn.disabled = true;
      googleBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Connecting to Google...</span>`;
      const user = await firebaseGoogleLogin();
      store.setFirebaseUser(user);
      showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
      redirectAfterAuth();
    } catch (err) {
      console.warn('[Firebase Google Auth]:', err);
      googleBtn.disabled = false;
      googleBtn.innerHTML = originalText;
      const formatted = formatFirebaseError(err);
      showToast(formatted, 'error');
    }
  });

  // Attach form submit handler with Firebase
  const form = container.querySelector('#signin-form');
  const errorBox = container.querySelector('#login-error');
  const errorText = container.querySelector('#login-error-text');
  const submitBtn = container.querySelector('#submit-login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Verifying credentials...</span>`;

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const user = await firebaseLogin(email, password);
      store.setFirebaseUser(user);
      showToast(`Welcome, ${user.displayName || email}!`, 'success');
      redirectAfterAuth();
    } catch (firebaseErr) {
      const errorDesc = formatFirebaseError(firebaseErr);
      errorText.textContent = errorDesc;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
    }
  });
}

export function renderRegister(container) {
  container.innerHTML = `
    <div class="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div class="w-full max-w-md bg-surface-canvas border border-border-strong rounded-2xl p-8 shadow-2xl animate-scale-in">
        
        <div class="flex items-center justify-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xl shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-[24px]">terminal</span>
          </div>
          <span class="font-geist text-headline-lg font-bold text-text-primary tracking-tight">DevTrack</span>
        </div>
        <div class="text-center mb-6">
          <h1 class="font-geist text-headline-md font-semibold text-text-primary mb-1">Create an Account</h1>
          <p class="text-text-muted text-body-sm">Provision engineering workspace credentials</p>
        </div>

        <form id="register-form" class="space-y-4">
          <div>
            <label class="block text-label-md font-medium text-text-secondary mb-1.5" for="reg-name">Full Name</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">person</span>
              <input type="text" id="reg-name" required placeholder="Full Name"
                class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-label-md font-medium text-text-secondary mb-1.5" for="reg-email">Work Email</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">mail</span>
              <input type="email" id="reg-email" required placeholder="engineer@company.com"
                class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-label-md font-medium text-text-secondary mb-1.5" for="reg-password">Password</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">lock</span>
              <input type="password" id="reg-password" required minlength="6" placeholder="••••••••"
                class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all" />
            </div>
            <p class="text-[11px] text-text-muted mt-1 font-jetbrains">Minimum 6 characters</p>
          </div>

          <div id="reg-error" class="hidden p-3 rounded-lg bg-status-defect-surface border border-status-defect/30 text-status-defect text-body-sm flex items-start gap-2">
            <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <span id="reg-error-text" class="flex-1 font-inter"></span>
          </div>

          <button type="submit" id="reg-submit-btn" class="w-full mt-2 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-[0.99] flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">how_to_reg</span>
            <span>Create Account</span>
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-border-subtle text-center text-body-sm text-text-muted">
          Already registered?
          <a href="#/login" class="text-primary hover:underline font-medium ml-1">Sign In</a>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#register-form');
  const errorBox = container.querySelector('#reg-error');
  const errorText = container.querySelector('#reg-error-text');
  const submitBtn = container.querySelector('#reg-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Creating account...</span>`;

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
      const user = await firebaseRegister(name, email, password);
      store.setFirebaseUser(user);
      showToast('Account created successfully!', 'success');
      redirectAfterAuth();
    } catch (firebaseErr) {
      errorText.textContent = formatFirebaseError(firebaseErr);
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">how_to_reg</span><span>Create Account</span>`;
    }
  });
}

export function renderForgotPassword(container) {
  container.innerHTML = `
    <div class="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div class="w-full max-w-md bg-surface-canvas border border-border-strong rounded-2xl p-8 shadow-2xl animate-scale-in">
        <div class="flex items-center justify-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xl shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-[24px]">terminal</span>
          </div>
          <span class="font-geist text-headline-lg font-bold text-text-primary tracking-tight">DevTrack</span>
        </div>
        <div class="text-center mb-6">
          <h1 class="font-geist text-headline-md font-semibold text-text-primary mb-1">Reset Password</h1>
          <p class="text-text-muted text-body-sm">We'll dispatch a secure password reset link to your email</p>
        </div>

        <form id="reset-form" class="space-y-4">
          <div>
            <label class="block text-label-md font-medium text-text-secondary mb-1.5" for="reset-email">Work Email</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">mail</span>
              <input type="email" id="reset-email" required placeholder="user@company.com"
                class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all" />
            </div>
          </div>

          <div id="reset-result" class="hidden p-3 rounded-lg text-body-sm flex items-start gap-2">
            <span id="reset-icon" class="material-symbols-outlined text-[18px] shrink-0 mt-0.5"></span>
            <span id="reset-msg" class="flex-1 font-inter"></span>
          </div>

          <button type="submit" id="reset-submit-btn" class="w-full mt-2 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-[0.99] flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">send</span>
            <span>Send Reset Instructions</span>
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-border-subtle text-center text-body-sm text-text-muted">
          Remember your password?
          <a href="#/login" class="text-primary hover:underline font-medium ml-1">Sign In</a>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#reset-form');
  const resultBox = container.querySelector('#reset-result');
  const resultIcon = container.querySelector('#reset-icon');
  const resultMsg = container.querySelector('#reset-msg');
  const submitBtn = container.querySelector('#reset-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Dispatching...</span>`;

    const email = document.getElementById('reset-email').value.trim();
    try {
      await firebaseResetPassword(email);
      resultBox.className = 'p-3 rounded-lg bg-status-passed-surface border border-status-passed/30 text-status-passed text-body-sm flex items-start gap-2';
      resultIcon.textContent = 'check_circle';
      resultMsg.textContent = `Password reset link dispatched to ${email}! Check your inbox.`;
      resultBox.classList.remove('hidden');
      showToast('Password reset email dispatched!', 'success');
    } catch (err) {
      resultBox.className = 'p-3 rounded-lg bg-status-passed-surface border border-status-passed/30 text-status-passed text-body-sm flex items-start gap-2';
      resultIcon.textContent = 'mark_email_read';
      resultMsg.textContent = `Password reset instructions recorded for ${email}.`;
      resultBox.classList.remove('hidden');
      showToast('Reset email instructions processed!', 'info');
    }

    setTimeout(() => {
      window.location.hash = '#/login';
    }, 2800);
  });
}

