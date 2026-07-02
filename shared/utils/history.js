/**
 * Toolix Recent Tools History Tracker
 * Manages local storage history of recently used tools.
 */

(function () {
  const HISTORY_KEY = 'toolix-recent-history';
  const MAX_HISTORY = 4;

  // Central Registry of all available tools
  const TOOL_REGISTRY = {
    'pdf-merge': {
      id: 'pdf-merge',
      name: 'Merge PDF',
      path: '/pdf/merge/',
      category: 'PDF Tools',
      description: 'Combine multiple PDFs into a single document.',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-8M5 14l7-7 7 7M19 4H5"/></svg>`
    },
    'pdf-split': {
      id: 'pdf-split',
      name: 'Split PDF',
      path: '/pdf/split/',
      category: 'PDF Tools',
      description: 'Split page ranges or extract all pages into separate files.',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`
    },
    'pdf-compress': {
      id: 'pdf-compress',
      name: 'Compress PDF',
      path: '/pdf/compress/',
      category: 'PDF Tools',
      description: 'Reduce the file size of your PDF client-side.',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>`
    },
    'pdf-image-to-pdf': {
      id: 'pdf-image-to-pdf',
      name: 'Image to PDF',
      path: '/pdf/image-to-pdf/',
      category: 'PDF Tools',
      description: 'Convert PNG, JPG, and WebP images into a PDF document.',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
    },
    'pdf-pdf-to-image': {
      id: 'pdf-pdf-to-image',
      name: 'PDF to Image',
      path: '/pdf/pdf-to-image/',
      category: 'PDF Tools',
      description: 'Convert PDF pages into high-quality PNG or JPEG images.',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
    },
    'pdf-rotate': {
      id: 'pdf-rotate',
      name: 'Rotate PDF',
      path: '/pdf/rotate/',
      category: 'PDF Tools',
      description: 'Rotate individual or all pages inside your PDF.',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`
    }
  };

  function getRecentTools() {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
      return history
        .map(id => TOOL_REGISTRY[id])
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function addRecentTool(toolId) {
    if (!TOOL_REGISTRY[toolId]) return;
    try {
      let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
      // Remove if already exists to push it to the top
      history = history.filter(id => id !== toolId);
      // Insert at the front
      history.unshift(toolId);
      // Cap size
      if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Expose registry and history globally
  window.ToolixHistory = {
    registry: TOOL_REGISTRY,
    getRecent: getRecentTools,
    add: addRecentTool
  };
})();
