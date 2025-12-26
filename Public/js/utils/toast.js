(function () {
  function ensureContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }
    return container;
  }

  function removeToast(toast) {
    if (!toast) return;
    toast.classList.add('toast-hide');
    toast.addEventListener('animationend', () => {
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    });
  }

  function showToast(message, type = 'info', opts = {}) {
    try {
      const container = ensureContainer();
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');

      const text = document.createElement('div');
      text.className = 'toast-text';
      text.textContent = message;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.setAttribute('aria-label', 'Dismiss');
      closeBtn.innerHTML = '\u00D7';
      closeBtn.addEventListener('click', () => removeToast(toast));

      toast.appendChild(text);
      toast.appendChild(closeBtn);
      container.appendChild(toast);

      // Cap total toasts
      const maxToasts = opts.maxToasts || 4;
      while (container.children.length > maxToasts) {
        container.removeChild(container.firstChild);
      }

      // Auto dismiss
      const timeoutMs = opts.timeoutMs || 5000;
      if (timeoutMs > 0) {
        setTimeout(() => removeToast(toast), timeoutMs);
      }
    } catch (_) { /* ignore */ }
  }

  window.showToast = showToast;
})();


