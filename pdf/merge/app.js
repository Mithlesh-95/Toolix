/**
 * Toolix Merge PDF Logic
 * Processes files client-side using pdf-lib and PDF.js.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Record tool usage to history
  if (window.ToolixHistory) {
    window.ToolixHistory.add('pdf-merge');
  }

  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // State
  let uploadedFiles = []; // Array of { id, file, name, size, pageCount, thumbnailUrl }

  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInputExtra = document.getElementById('file-input-extra');
  const filesContainer = document.getElementById('files-container');
  const filePreviewGrid = document.getElementById('file-preview-grid');
  const filesCountLabel = document.getElementById('files-count-label');
  const addMoreBtn = document.getElementById('add-more-btn');
  const mergeBtn = document.getElementById('merge-btn');
  const progressWrapper = document.getElementById('progress-wrapper');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const alertBox = document.getElementById('alert-box');

  // --- Drag and Drop Zone Event Listeners ---
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
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });

  // Add more files button handler
  addMoreBtn.addEventListener('click', () => {
    fileInputExtra.click();
  });

  fileInputExtra.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });

  // --- File Processing Logic ---
  async function handleFiles(files) {
    showAlert(null); // Clear previous alerts
    
    // Show loading state/progress
    showProgress(true, 'Reading files...', 10);
    
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      showAlert('Please upload valid PDF files.', 'error');
      showProgress(false);
      return;
    }

    const loadPromises = pdfFiles.map(file => processPdfFile(file));
    
    try {
      const results = await Promise.all(loadPromises);
      uploadedFiles = [...uploadedFiles, ...results];
      renderFiles();
    } catch (err) {
      console.error(err);
      showAlert('Failed to process one or more PDF files. Make sure they are not password protected.', 'error');
    } finally {
      showProgress(false);
    }
  }

  // Read page count and render first-page thumbnail using PDF.js
  async function processPdfFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          
          // Load document in PDF.js for preview (slice copy to prevent detaching)
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
          const pdf = await loadingTask.promise;
          const pageCount = pdf.numPages;
          
          let thumbnailUrl = '';
          
          // Render page 1
          if (pageCount > 0) {
            const page = await pdf.getPage(1);
            
            // Render at a small scale for thumbnail preview
            const scale = 0.3;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            
            await page.render(renderContext).promise;
            thumbnailUrl = canvas.toDataURL();
          }

          resolve({
            id: 'file-' + Math.random().toString(36).substr(2, 9),
            file: file,
            arrayBuffer: arrayBuffer,
            name: file.name,
            size: formatBytes(file.size),
            pageCount: pageCount,
            thumbnailUrl: thumbnailUrl,
            pageRange: 'all'
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  // --- Rendering UI File Cards ---
  function renderFiles() {
    filePreviewGrid.innerHTML = '';
    
    if (uploadedFiles.length === 0) {
      dropZone.style.display = 'flex';
      filesContainer.style.display = 'none';
      mergeBtn.disabled = true;
      return;
    }

    dropZone.style.display = 'none';
    filesContainer.style.display = 'block';
    filesCountLabel.textContent = `Uploaded Files (${uploadedFiles.length})`;
    
    // Enable merge button only if we have at least 2 files
    mergeBtn.disabled = uploadedFiles.length < 2;

    uploadedFiles.forEach((fileObj, index) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', fileObj.id);

      card.innerHTML = `
        <button class="file-card-remove" title="Remove file" data-id="${fileObj.id}">×</button>
        <div class="file-card-preview">
          ${fileObj.thumbnailUrl ? `<img src="${fileObj.thumbnailUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : `<span>PDF</span>`}
        </div>
        <div style="width: 100%;">
          <div class="file-card-name" title="${fileObj.name}">${fileObj.name}</div>
          <div class="file-card-meta">${fileObj.pageCount} ${fileObj.pageCount === 1 ? 'page' : 'pages'} | ${fileObj.size}</div>
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 4px; font-size: 11px;">
            <span style="color: var(--text-muted); white-space: nowrap;">Pages:</span>
            <input type="text" class="input page-range-input" data-id="${fileObj.id}" value="${fileObj.pageRange || 'all'}" style="padding: 2px 6px; font-size: 11px; flex-grow: 1; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" placeholder="e.g. 1-3, 5">
          </div>
        </div>
      `;

      // Remove handler
      card.querySelector('.file-card-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeFile(fileObj.id);
      });

      // Range input handler
      card.querySelector('.page-range-input').addEventListener('input', (e) => {
        fileObj.pageRange = e.target.value;
      });

      // Add HTML5 drag-and-drop events for reordering
      setupDragEvents(card);

      filePreviewGrid.appendChild(card);
    });
  }

  function removeFile(id) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== id);
    renderFiles();
  }

  // --- Drag and Drop Reordering Handlers ---
  let dragSrcEl = null;

  function setupDragEvents(card) {
    card.addEventListener('dragstart', (e) => {
      dragSrcEl = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      
      // Extract final DOM order and rebuild internal array
      const reorderedIds = Array.from(filePreviewGrid.querySelectorAll('.file-card'))
        .map(c => c.getAttribute('data-id'));
        
      const sortedFiles = reorderedIds.map(id => uploadedFiles.find(f => f.id === id));
      uploadedFiles = sortedFiles;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const draggingCard = filePreviewGrid.querySelector('.dragging');
      if (draggingCard && draggingCard !== card) {
        const bounding = card.getBoundingClientRect();
        const offset = e.clientY - bounding.top;
        if (offset > bounding.height / 2) {
          card.after(draggingCard);
        } else {
          card.before(draggingCard);
        }
      }
    });
  }

  // --- PDF Merging Logic ---
  mergeBtn.addEventListener('click', async () => {
    if (uploadedFiles.length < 2) return;
    
    showAlert(null);
    showProgress(true, 'Merging PDF files...', 20);
    mergeBtn.disabled = true;

    try {
      // Retrieve blank page padding config
      const padBlankPage = document.getElementById('blank-page-padding')?.checked || false;

      // Create new PDFLib document
      const mergedPdf = await PDFLib.PDFDocument.create();
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        const fileObj = uploadedFiles[i];
        const progressVal = Math.round(20 + ((i / uploadedFiles.length) * 60));
        showProgress(true, `Reading ${fileObj.name}...`, progressVal);
        
        // Load target document bytes
        const srcPdf = await PDFLib.PDFDocument.load(fileObj.arrayBuffer);
        const totalPages = srcPdf.getPageCount();
        
        // Parse range
        const targetIndices = parseRangeString(fileObj.pageRange || 'all', totalPages);
        if (targetIndices.length === 0) continue;
        
        // Copy pages
        const copiedPages = await mergedPdf.copyPages(srcPdf, targetIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        
        // Apply blank page padding if odd
        if (padBlankPage && copiedPages.length % 2 !== 0) {
          const lastPage = copiedPages[copiedPages.length - 1];
          const { width, height } = lastPage.getSize();
          mergedPdf.addPage([width, height]);
        }
      }

      showProgress(true, 'Compressing resulting PDF...', 85);
      const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: false });
      console.log('Merged PDF Bytes length:', mergedPdfBytes.length);
      
      showProgress(true, 'Preparing download...', 95);
      
      // Trigger browser download — uses File System Access API in Chrome,
      // blob URL fallback in Edge / Firefox / Safari.
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      console.log('Blob size:', blob.size);
      await toolixDownload(mergedPdfBytes, 'toolix_merged.pdf', 'application/pdf');
      
      showProgress(true, 'Completed!', 100);
      showAlert('PDF files merged successfully. Downloading now.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Error during merge process. One of the documents might be corrupted or encrypted.', 'error');
    } finally {
      mergeBtn.disabled = false;
      setTimeout(() => showProgress(false), 2000);
    }
  });

  // --- Utility Functions ---
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

  // --- Helper Range String Parser ---
  function parseRangeString(rangeStr, totalPages) {
    const pages = [];
    const cleanStr = rangeStr.trim().toLowerCase();
    
    if (!cleanStr || cleanStr === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    
    const parts = cleanStr.split(',');
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      
      if (part.includes('-')) {
        const bounds = part.split('-');
        let start = parseInt(bounds[0].trim(), 10);
        let end = parseInt(bounds[1].trim(), 10);
        
        if (isNaN(start)) start = 1;
        if (isNaN(end)) end = totalPages;
        
        // Clamp bounds
        start = Math.max(1, Math.min(start, totalPages));
        end = Math.max(1, Math.min(end, totalPages));
        
        if (start <= end) {
          for (let p = start; p <= end; p++) {
            pages.push(p - 1);
          }
        } else {
          for (let p = start; p >= end; p--) {
            pages.push(p - 1);
          }
        }
      } else {
        const page = parseInt(part, 10);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          pages.push(page - 1);
        }
      }
    }
    
    return pages;
  }
});
