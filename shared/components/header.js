/**
 * Toolix Global Header Web Component
 * Usage: <toolix-header></toolix-header>
 */

class ToolixHeader extends HTMLElement {
  connectedCallback() {
    const basePath = this.getBasePath();
    const currentPath = window.location.pathname;

    // Determine active links
    const isHome = currentPath === basePath + '/' || currentPath === basePath + '/index.html';
    const isPdf = currentPath.includes('/pdf/');

    this.innerHTML = `
      <header class="header-bar">
        <style>
          /* Header micro-interactions and transitions */
          .theme-toggle-btn {
            background: transparent;
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            cursor: pointer;
            width: 34px;
            height: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            transition: border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);
            position: relative;
            padding: 0;
          }
          .theme-toggle-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-hover);
            background-color: var(--bg-tertiary);
            transform: translateY(-1px) scale(1.05);
          }
          .theme-toggle-btn:active {
            transform: scale(0.95);
          }
          .theme-icon {
            transition: transform var(--transition-normal), opacity var(--transition-normal);
            position: absolute;
            stroke-width: 2px;
          }
          /* Sun and moon specific rotation effects */
          #theme-icon-sun {
            transform: rotate(0deg);
          }
          #theme-icon-moon {
            transform: rotate(0deg);
          }
          .theme-toggle-btn:hover #theme-icon-sun {
            transform: rotate(30deg);
          }
          .theme-toggle-btn:hover #theme-icon-moon {
            transform: rotate(-15deg);
          }
        </style>
        <div class="container header-content">
          <a href="${basePath}/index.html" class="logo" aria-label="Toolix Home">
            <svg width="28" height="28" viewBox="0 0 100 100" class="logo-svg" aria-hidden="true">
              <defs>
                <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1" />
                  <stop offset="100%" stop-color="#4f46e5" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="24" fill="url(#logo-g)" />
              <path d="M30 32 h40 v10 H55 v26 H45 V42 H30 Z" fill="#ffffff" />
              <circle cx="50" cy="74" r="4" fill="#06b6d4" />
            </svg>
            <span>Toolix</span>
          </a>
          
          <nav aria-label="Main Navigation">
            <ul class="nav-links">
              <li>
                <a href="${basePath}/index.html" class="nav-link ${isHome ? 'active' : ''}">Home</a>
              </li>
              <li>
                <a href="${basePath}/pdf/index.html" class="nav-link ${isPdf ? 'active' : ''}">PDF Tools</a>
              </li>
              <li>
                <button id="theme-toggle" class="theme-toggle-btn" aria-label="Toggle theme">
                  <svg id="theme-icon-sun" class="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  <svg id="theme-icon-moon" class="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>
    `;

    this.setupThemeToggle();
  }

  getBasePath() {
    const path = window.location.pathname;
    if (path.startsWith('/toolix/')) {
      return '/toolix';
    }
    return '';
  }

  setupThemeToggle() {
    const toggleBtn = this.querySelector('#theme-toggle');
    const sunIcon = this.querySelector('#theme-icon-sun');
    const moonIcon = this.querySelector('#theme-icon-moon');

    const updateIcons = (theme) => {
      if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    };

    // Set initial icon states
    updateIcons(window.ToolixTheme.get());

    toggleBtn.addEventListener('click', () => {
      window.ToolixTheme.toggle();
    });

    // Listen for theme changes from other components
    window.addEventListener('toolix-theme-change', (e) => {
      updateIcons(e.detail.theme);
    });
  }
}

customElements.define('toolix-header', ToolixHeader);
