/**
 * Toolix Rotate PDF Logic
 * Processes files client-side using pdf-lib and PDF.js.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Record usage
  if (window.ToolixHistory) {
    window.ToolixHistory.add('pdf-rotate');
  }

  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // State
  let activeFile = null; // { name, size, arrayBuffer, totalPages }
  let pageRotations = []; // Array of relative rotation offsets (0, 90, 180, 270) for each page index

  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const filesContainer = document.getElementById('files-container');
  const pagePreviewGrid = document.getElementById('page-preview-grid');
  const fileNameLabel = document.getElementById('file-name-label');
  const removeFileBtn = document.getElementById('remove-file-btn');
  const rotateAllCwBtn = document.getElementById('rotate-all-cw');
  const rotateAllCcwBtn = document.getElementById('rotate-all-ccw');
  const saveBtn = document.getElementById('save-btn');
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
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        
        activeFile = {
          name: file.name,
          size: file.size,
          arrayBuffer: arrayBuffer,
          totalPages: totalPages
        };
        
        fileNameLabel.textContent = `${file.name} (${formatBytes(file.size)})`;
        dropZone.style.display = 'none';
        filesContainer.style.display = 'block';
        
        // Reset rotation array to zero for each page
        pageRotations = new Array(totalPages).fill(0);
        
        // Render previews
        await renderPagePreviews(pdf);
        
        // Enable buttons
        rotateAllCwBtn.disabled = false;
        rotateAllCcwBtn.disabled = false;
        saveBtn.disabled = false;
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

  // --- Rendering Previews ---
  async function renderPagePreviews(pdf) {
    pagePreviewGrid.innerHTML = '';
    const total = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      const card = document.createElement('div');
      card.className = 'file-card';
      card.style.cursor = 'default';
      
      card.innerHTML = `
        <div class="file-card-preview" style="height: 100%; width: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative;">
          <canvas id="canvas-page-${pageNum}" style="transform: rotate(0deg); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); max-width: 90%; max-height: 90%; object-fit: contain;"></canvas>
        </div>
        <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--space-xs); margin-top: var(--space-xs);">
          <span class="text-xs" style="font-weight: 600;">Page ${pageNum}</span>
          <button class="btn btn-secondary text-xs rotate-single-btn" data-index="${pageNum - 1}" style="padding: 2px 6px; font-size: 11px; display: inline-flex; align-items: center; gap: 2px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Rotate
          </button>
        </div>
      `;

      pagePreviewGrid.appendChild(card);
      
      // Render canvas thumbnail
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

    // Single card rotation handler
    const rotateBtns = pagePreviewGrid.querySelectorAll('.rotate-single-btn');
    rotateBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        rotateSinglePage(index);
      });
    });
  }

  // --- Rotation Operations ---
  function rotateSinglePage(index) {
    // Increment relative rotation by 90 degrees
    pageRotations[index] = (pageRotations[index] + 90) % 360;
    
    // Visually rotate canvas using transitions
    const canvas = document.getElementById(`canvas-page-${index + 1}`);
    if (canvas) {
      canvas.style.transform = `rotate(${pageRotations[index]}deg)`;
    }
  }

  // Bulk rotate CW
  rotateAllCwBtn.addEventListener('click', () => {
    for (let i = 0; i < pageRotations.length; i++) {
      pageRotations[i] = (pageRotations[i] + 90) % 360;
      const canvas = document.getElementById(`canvas-page-${i + 1}`);
      if (canvas) {
        canvas.style.transform = `rotate(${pageRotations[i]}deg)`;
      }
    }
  });

  // Bulk rotate CCW
  rotateAllCcwBtn.addEventListener('click', () => {
    for (let i = 0; i < pageRotations.length; i++) {
      // Add 270 is equivalent to subtracting 90
      pageRotations[i] = (pageRotations[i] + 270) % 360;
      const canvas = document.getElementById(`canvas-page-${i + 1}`);
      if (canvas) {
        canvas.style.transform = `rotate(${pageRotations[i]}deg)`;
      }
    }
  });

  // --- Save Rotated PDF ---
  saveBtn.addEventListener('click', async () => {
    if (!activeFile) return;

    showAlert(null);
    saveBtn.disabled = true;
    showProgress(true, 'Opening document...', 20);

    try {
      const srcDoc = await PDFLib.PDFDocument.load(activeFile.arrayBuffer);
      const pages = srcDoc.getPages();
      
      showProgress(true, 'Injecting rotation headers...', 50);
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const currentRotObj = page.getRotation();
        const originalAngle = currentRotObj.angle;
        
        // Sum rotation relative offset
        const targetAngle = (originalAngle + pageRotations[i]) % 360;
        
        page.setRotation(PDFLib.degrees(targetAngle));
      }

      showProgress(true, 'Compiling PDF stream...', 80);
      const bytes = await srcDoc.save({ useObjectStreams: false }); // Disable object streams for maximum viewer compatibility
      console.log('Rotated PDF Bytes length:', bytes.length);
      
      showProgress(true, 'Downloading...', 95);
      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
      await toolixDownload(bytes, `${nameWithoutExt}_rotated.pdf`, 'application/pdf');

      showProgress(true, 'Complete!', 100);
      showAlert('PDF pages rotated and downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('An error occurred while saving the rotated PDF.', 'error');
    } finally {
      saveBtn.disabled = false;
      setTimeout(() => showProgress(false), 2000);
    }
  });

  // --- Reset/Clearing State ---
  function resetState() {
    activeFile = null;
    pageRotations = [];
    pagePreviewGrid.innerHTML = '';
    filesContainer.style.display = 'none';
    dropZone.style.display = 'flex';
    fileInput.value = '';
    rotateAllCwBtn.disabled = true;
    rotateAllCcwBtn.disabled = true;
    saveBtn.disabled = true;
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
