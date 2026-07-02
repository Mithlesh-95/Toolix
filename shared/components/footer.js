/**
 * Toolix Global Footer Web Component
 * Usage: <toolix-footer></toolix-footer>
 */

class ToolixFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="footer-bar">
        <div class="container footer-content">
          <div>
            &copy; 2026 <strong>Toolix</strong>. Everything you need to work smarter.
          </div>
          <div class="text-muted" style="font-style: italic; display: flex; align-items: center; gap: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="logo-accent"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Privacy First: All operations are executed client-side. Your files never touch a server.
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('toolix-footer', ToolixFooter);
