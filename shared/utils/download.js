/**
 * Toolix Download Utility
 * 
 * Uses the modern File System Access API (showSaveFilePicker) when available —
 * this is the ONLY method that reliably enforces custom filenames in Chrome.
 * Falls back to blob URL anchor download for other browsers (Edge, Firefox, Safari).
 */

/**
 * Download a file with a guaranteed filename across all browsers.
 * 
 * @param {Uint8Array|Blob} data  - The file bytes or Blob to download.
 * @param {string} filename       - The desired download filename (e.g. "merged.pdf").
 * @param {string} mimeType       - MIME type (e.g. "application/pdf", "application/zip").
 */
async function toolixDownload(data, filename, mimeType = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });

  // --- Strategy 1: File System Access API (Chrome 86+, Edge 86+) ---
  // This is the ONLY reliable method that lets JS set the save filename in Chrome.
  if (window.showSaveFilePicker) {
    try {
      const ext = filename.split('.').pop().toLowerCase();
      const mimeMap = {
        pdf:  ['application/pdf', [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]],
        zip:  ['application/zip', [{ description: 'ZIP Archive',  accept: { 'application/zip':  ['.zip']  } }]],
        png:  ['image/png',       [{ description: 'PNG Image',    accept: { 'image/png':         ['.png']  } }]],
        jpg:  ['image/jpeg',      [{ description: 'JPEG Image',   accept: { 'image/jpeg':        ['.jpg']  } }]],
        jpeg: ['image/jpeg',      [{ description: 'JPEG Image',   accept: { 'image/jpeg':        ['.jpeg'] } }]],
      };

      const [, types] = mimeMap[ext] || ['application/octet-stream', []];

      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: types.length ? types : undefined,
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Done — filename is guaranteed.
    } catch (err) {
      // User cancelled the dialog — do not fall through to blob URL.
      if (err.name === 'AbortError') return;
      // Any other error: fall through to blob URL strategy.
      console.warn('showSaveFilePicker failed, falling back to blob URL:', err);
    }
  }

  // --- Strategy 2: Blob URL + anchor click (Edge, Firefox, Safari) ---
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.setAttribute('download', filename);
  a.style.display = 'none';
  document.body.appendChild(a);

  // Use a direct .click() — dispatchEvent(MouseEvent) is less reliable in some
  // browser security contexts than the native click method.
  a.click();

  // Keep the URL alive long enough for the browser's download thread to latch on.
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 10000);
}

// Expose globally so every tool page can call it without re-bundling.
window.toolixDownload = toolixDownload;
