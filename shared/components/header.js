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
        <div class="container header-content">
          <a href="${basePath}/index.html" class="logo" aria-label="Toolix Home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="logo-accent"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Toolix</span>
          </a>
          
          <nav>
            <ul class="nav-links">
              <li>
                <a href="${basePath}/index.html" class="nav-link ${isHome ? 'active' : ''}">Home</a>
              </li>
              <li>
                <a href="${basePath}/pdf/index.html" class="nav-link ${isPdf ? 'active' : ''}">PDF Tools</a>
              </li>
              <li>
                <button id="theme-toggle" class="btn btn-secondary btn-icon" aria-label="Toggle theme" style="border: none; padding: 6px;">
                  <svg id="theme-icon-sun" class="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  <svg id="theme-icon-moon" class="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
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
