(function initializeProdIPQAAuth(window, document) {
  'use strict';

  const CONFIG = Object.freeze({
    hosts: ['qa.geoiplocations.com', 'www.qa.geoiplocations.com'],
    password: 'MakePopolGreatAgain',
    storageKey: 'prodipdata.qa.auth',
    ttlMs: 24 * 60 * 60 * 1000
  });

  function now() {
    return Date.now ? Date.now() : new Date().getTime();
  }

  function getHostname() {
    return String(window.location.hostname || '').toLowerCase();
  }

  function isQAHost() {
    return CONFIG.hosts.includes(getHostname());
  }

  function getAssetRoot() {
    return document.body && document.body.dataset ? (document.body.dataset.assetRoot || '') : '';
  }

  function getLoginPath() {
    return `${getAssetRoot()}login.html`;
  }

  function isLoginPage() {
    const pathname = String(window.location.pathname || '').toLowerCase();
    return pathname.endsWith('/login.html') || pathname === '/login.html' || pathname === 'login.html';
  }

  function readSession() {
    try {
      const raw = window.localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeSession() {
    const issuedAt = now();
    const payload = {
      authorized: true,
      issuedAt,
      expiresAt: issuedAt + CONFIG.ttlMs
    };

    try {
      window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
    } catch (error) {
      // If storage is unavailable, the current redirect will still work, but the user may need to re-enter the password.
    }

    return payload;
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(CONFIG.storageKey);
    } catch (error) {
      // Ignore storage failures; this is a client-side QA convenience gate.
    }
  }

  function hasAccess() {
    const session = readSession();
    return Boolean(session && session.authorized === true && Number(session.expiresAt || 0) > now());
  }

  function getSafeReturnUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const requested = params.get('returnUrl');

    if (!requested) {
      return `${getAssetRoot()}index.html`;
    }

    try {
      const target = new URL(requested, window.location.origin);
      if (target.origin !== window.location.origin) {
        return `${getAssetRoot()}index.html`;
      }
      return `${target.pathname}${target.search}${target.hash}` || `${getAssetRoot()}index.html`;
    } catch (error) {
      return `${getAssetRoot()}index.html`;
    }
  }

  function buildLoginUrl() {
    const current = `${window.location.pathname || '/'}${window.location.search || ''}${window.location.hash || ''}`;
    const loginPath = getLoginPath();
    return `${loginPath}?returnUrl=${encodeURIComponent(current)}`;
  }

  function requireAccess() {
    if (!isQAHost() || isLoginPage()) {
      return true;
    }

    if (hasAccess()) {
      return true;
    }

    window.location.replace(buildLoginUrl());
    return false;
  }

  function updateStatus(message, variant) {
    const status = document.querySelector('[data-qa-auth-status]');
    if (!status) {
      return;
    }

    status.textContent = message || '';
    status.dataset.variant = variant || 'neutral';
    status.hidden = !message;
  }

  function initializeLoginPage() {
    if (!isQAHost()) {
      updateStatus('This QA access gate only runs on qa.geoiplocations.com.', 'neutral');
      return;
    }

    const params = new URLSearchParams(window.location.search || '');
    if (params.get('logout') === '1') {
      clearSession();
      updateStatus('You have been signed out of the QA preview.', 'neutral');
    } else if (hasAccess()) {
      window.location.replace(getSafeReturnUrl());
      return;
    }

    const form = document.querySelector('[data-qa-auth-form]');
    const passwordInput = document.querySelector('[data-qa-auth-password]');

    if (!form || !passwordInput) {
      updateStatus('QA login form is not available on this page.', 'error');
      return;
    }

    passwordInput.focus({ preventScroll: true });

    form.addEventListener('submit', function onLoginSubmit(event) {
      event.preventDefault();
      const candidate = String(passwordInput.value || '');

      if (candidate === CONFIG.password) {
        writeSession();
        updateStatus('Access granted. Redirecting...', 'success');
        window.location.replace(getSafeReturnUrl());
        return;
      }

      passwordInput.value = '';
      passwordInput.focus({ preventScroll: true });
      updateStatus('Invalid QA password. Please try again.', 'error');
    });
  }

  window.ProdIPQAAuth = Object.freeze({
    clearSession,
    hasAccess,
    initializeLoginPage,
    isQAHost,
    requireAccess
  });

  function run() {
    if (!isQAHost()) {
      return;
    }

    if (isLoginPage()) {
      initializeLoginPage();
      return;
    }

    requireAccess();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})(window, document);
