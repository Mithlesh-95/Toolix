/**
 * Toolix PDF to Image Logic
 * Processes files client-side using PDF.js and JSZip.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Record usage
  if (window.ToolixHistory) {
    window.ToolixHistory.add('pdf-pdf-to-image');
  }

  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // State
  let activeFile = null; // { name, size, arrayBuffer, totalPages }
  let pdfjsInstance = null; // Stored PDF.js document instance

  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const filesContainer = document.getElementById('files-container');
  const pagePreviewGrid = document.getElementById('page-preview-grid');
  const fileNameLabel = document.getElementById('file-name-label');
  const removeFileBtn = document.getElementById('remove-file-btn');
  const formatSelect = document.getElementById('format-select');
  const resolutionSelect = document.getElementById('resolution-select');
  const convertBtn = document.getElementById('convert-btn');
  const progressWrapper = document.getElementById('progress-wrapper');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const alertBox = document.getElementById('alert-box');

  // --- Drag and Drop File Handlers ---
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', () => {
    resetState();
  });

  // --- Main File Processing ---
  function processFile(file) {
    showAlert(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showAlert('Please upload a valid PDF document.', 'error');
      return;
    }

    showProgress(true, 'Reading PDF...', 15);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        
        // Load PDF.js to render page previews (slice copy to prevent detaching)
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        pdfjsInstance = await loadingTask.promise;
        const totalPages = pdfjsInstance.numPages;
        
        activeFile = {
          name: file.name,
          size: file.size,
          arrayBuffer: arrayBuffer,
          totalPages: totalPages
        };
        
        fileNameLabel.textContent = `${file.name} (${formatBytes(file.size)})`;
        dropZone.style.display = 'none';
        filesContainer.style.display = 'block';
        
        // Render previews
        await renderPagePreviews(pdfjsInstance);
        
        convertBtn.disabled = false;
      } catch (err) {
        console.error(err);
        showAlert('Could not read PDF. It may be encrypted or corrupted.', 'error');
        resetState();
      } finally {
        showProgress(false);
      }
    };

    reader.onerror = () => {
      showAlert('FileReader error.', 'error');
      showProgress(false);
    };
    
    reader.readAsArrayBuffer(file);
  }

  // --- Rendering Previews on Main Canvas ---
  async function renderPagePreviews(pdf) {
    pagePreviewGrid.innerHTML = '';
    const total = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      const card = document.createElement('div');
      card.className = 'file-card';
      
      card.innerHTML = `
        <div class="file-card-preview" style="height: 100%;">
          <canvas id="canvas-page-${pageNum}"></canvas>
        </div>
        <div class="file-card-name" style="text-align: center; font-weight: 600;">Page ${pageNum}</div>
      `;

      pagePreviewGrid.appendChild(card);
      
      // Render preview thumbnail
      const scale = 0.25;
      const viewport = page.getViewport({ scale });
      const canvas = document.getElementById(`canvas-page-${pageNum}`);
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      const renderPercent = 15 + Math.round((pageNum / total) * 85);
      showProgress(true, `Loading previews (${pageNum}/${total})...`, renderPercent);
    }
  }

  // --- PDF to Image Conversion ---
  convertBtn.addEventListener('click', async () => {
    if (!activeFile || !pdfjsInstance) return;

    showAlert(null);
    convertBtn.disabled = true;
    showProgress(true, 'Initializing image converter...', 10);

    const imageFormat = formatSelect.value;
    const resScale = parseFloat(resolutionSelect.value);

    const mimeType = imageFormat === 'png' ? 'image/png' : 'image/jpeg';
    const extension = imageFormat === 'png' ? 'png' : 'jpg';
    
    const zip = new JSZip();
    const total = activeFile.totalPages;

    try {
      // Loop pages, render them in high resolution to offscreen canvases and append to zip
      for (let i = 1; i <= total; i++) {
        const progressPercentValue = Math.round(10 + ((i / total) * 75));
        showProgress(true, `Rendering page ${i} of ${total} (${Math.round(i/total*100)}%)...`, progressPercentValue);

        const page = await pdfjsInstance.getPage(i);
        
        // Render at high resolution scale (e.g. 2x = ~150dpi, 3x = ~300dpi)
        const viewport = page.getViewport({ scale: resScale });
        
        const offscreenCanvas = document.createElement('canvas');
        const ctx = offscreenCanvas.getContext('2d');
        offscreenCanvas.height = viewport.height;
        offscreenCanvas.width = viewport.width;

        // Fill background white for JPEGs to prevent black gaps on transparent layers
        if (imageFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        }

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        // Render page
        await page.render(renderContext).promise;
        
        // Convert page to image blob
        const imgBlob = await getCanvasBlob(offscreenCanvas, mimeType);
        
        // Add to ZIP archive
        const pageIndexString = String(i).padStart(3, '0');
        zip.file(`page_${pageIndexString}.${extension}`, imgBlob);
      }

      showProgress(true, 'Packing images into ZIP archive...', 88);
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      showProgress(true, 'Downloading...', 95);
      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
      await toolixDownload(zipBlob, `${nameWithoutExt}_images.zip`, 'application/zip');

      showProgress(true, 'Complete!', 100);
      showAlert('All PDF pages exported and ZIP downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('An error occurred during image export conversion.', 'error');
    } finally {
      convertBtn.disabled = false;
      setTimeout(() => showProgress(false), 2000);
    }
  });

  // --- Helper Canvas Blob Getter ---
  function getCanvasBlob(canvas, mimeType) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, mimeType, 0.92); // 92% quality if JPEG
    });
  }

  // --- Reset/Clearing State ---
  function resetState() {
    activeFile = null;
    pdfjsInstance = null;
    pagePreviewGrid.innerHTML = '';
    filesContainer.style.display = 'none';
    dropZone.style.display = 'flex';
    fileInput.value = '';
    convertBtn.disabled = true;
    showProgress(false);
    showAlert(null);
  }

  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function showProgress(show, message = '', percent = 0) {
    if (show) {
      progressWrapper.style.display = 'block';
      progressStatus.textContent = message;
      progressPercent.textContent = `${percent}%`;
      progressBarFill.style.width = `${percent}%`;
    } else {
      progressWrapper.style.display = 'none';
    }
  }

  function showAlert(message, type = 'success') {
    if (message) {
      alertBox.textContent = message;
      alertBox.className = `alert alert-${type}`;
      alertBox.style.display = 'block';
    } else {
      alertBox.style.display = 'none';
    }
  }
});
