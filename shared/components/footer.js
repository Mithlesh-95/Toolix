/**
 * Toolix Global Footer Web Component
 * Usage: <toolix-footer></toolix-footer>
 */

class ToolixFooter extends HTMLElement {
  connectedCallback() {
    const basePath = this.getBasePath();

    this.innerHTML = `
      <footer class="footer-bar">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-col footer-brand">
              <div class="footer-logo">
                <svg width="24" height="24" viewBox="0 0 100 100" class="logo-svg" aria-hidden="true" style="border-radius: 5px;">
                  <defs>
                    <linearGradient id="footer-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#6366f1" />
                      <stop offset="100%" stop-color="#4f46e5" />
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" rx="24" fill="url(#footer-logo-g)" />
                  <path d="M30 32 h40 v10 H55 v26 H45 V42 H30 Z" fill="#ffffff" />
                  <circle cx="50" cy="74" r="4" fill="#06b6d4" />
                </svg>
                <span>Toolix</span>
              </div>
              <p class="text-xs text-muted" style="line-height: 1.6; margin-bottom: var(--space-xs); max-width: 280px; font-weight: 500;">
                Private by design. Browser-native by default.
              </p>
              <div class="text-xs text-muted" style="display: flex; align-items: center; gap: 6px; font-weight: 500;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(--primary-500);"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Files stay on your device
              </div>
            </div>
            
            <div class="footer-col">
              <span class="label" style="font-size: 10px; margin-bottom: 6px;">Product</span>
              <ul class="footer-links">
                <li><a href="${basePath}/index.html" class="footer-link">Home</a></li>
                <li><a href="${basePath}/pdf/index.html" class="footer-link">PDF Tools</a></li>
              </ul>
            </div>
            
            <div class="footer-col">
              <span class="label" style="font-size: 10px; margin-bottom: 6px;">Legal</span>
              <ul class="footer-links">
                <li><a href="#" class="footer-link">Privacy Policy</a></li>
                <li><a href="#" class="footer-link">Terms of Service</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <span class="label" style="font-size: 10px; margin-bottom: 6px;">Developer</span>
              <ul class="footer-links">
                <li><a href="https://github.com/Mithlesh-95/Toolix" target="_blank" rel="noopener" class="footer-link">GitHub</a></li>
                <li><a href="mailto:contact@toolix.com" class="footer-link">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div class="footer-bottom">
            <div>
              &copy; 2026 Toolix. All rights reserved.
            </div>
            <div>
              Made with ❤️ by <a href="https://github.com/Mithlesh-95" target="_blank" rel="noopener" style="font-weight: 600; color: var(--text-primary);">Mithlesh</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  }

  getBasePath() {
    const path = window.location.pathname;
    if (path.startsWith('/toolix/')) {
      return '/toolix';
    }
    return '';
  }
}

customElements.define('toolix-footer', ToolixFooter);
