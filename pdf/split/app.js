/**
 * Toolix Split PDF Logic
 * Processes files client-side using pdf-lib, PDF.js, and JSZip.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Record usage
  if (window.ToolixHistory) {
    window.ToolixHistory.add('pdf-split');
  }

  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // State
  let activeFile = null; // { name, size, arrayBuffer, totalPages }
  let selectedPages = new Set(); // Stores 1-based page numbers

  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const filesContainer = document.getElementById('files-container');
  const pagePreviewGrid = document.getElementById('page-preview-grid');
  const fileNameLabel = document.getElementById('file-name-label');
  const removeFileBtn = document.getElementById('remove-file-btn');
  const rangeInputGroup = document.getElementById('range-input-group');
  const rangeInput = document.getElementById('range-input');
  const splitAfterInputGroup = document.getElementById('split-after-input-group');
  const splitAfterInput = document.getElementById('split-after-input');
  const splitBtn = document.getElementById('split-btn');
  const progressWrapper = document.getElementById('progress-wrapper');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const alertBox = document.getElementById('alert-box');
  const splitModeRadios = document.getElementsByName('split-mode');

  // --- Theme change check ---
  window.addEventListener('toolix-theme-change', () => {
    // If thumbnails are drawn in canvas, canvas background is handled by browser rendering,
    // but the border styling adjusts natively via CSS.
  });

  // --- Toggle Modes ---
  Array.from(splitModeRadios).forEach(radio => {
    radio.addEventListener('change', (e) => {
      // Toggle custom ranges input group
      if (e.target.value === 'ranges') {
        rangeInputGroup.style.display = 'block';
        rangeInputGroup.style.opacity = '1';
        rangeInputGroup.style.pointerEvents = 'auto';
        rangeInput.disabled = false;
      } else {
        rangeInputGroup.style.display = 'none';
        rangeInputGroup.style.opacity = '0.5';
        rangeInputGroup.style.pointerEvents = 'none';
        rangeInput.disabled = true;
      }

      // Toggle split-after input group
      if (e.target.value === 'split-after') {
        splitAfterInputGroup.style.display = 'block';
        splitAfterInput.disabled = false;
      } else {
        splitAfterInputGroup.style.display = 'none';
        splitAfterInput.disabled = true;
      }
      
      updatePageCardStyles();
      validateSplitState();
    });
  });

  // Bind input listeners for validation
  splitAfterInput.addEventListener('input', () => {
    validateSplitState();
  });

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
        
        selectedPages.clear();
        rangeInput.value = '';
        
        // Render previews
        await renderPagePreviews(pdf);
        
        validateSplitState();
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

  // --- Rendering Previews with Lazy-ish Rendering ---
  async function renderPagePreviews(pdf) {
    pagePreviewGrid.innerHTML = '';
    const total = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      const card = document.createElement('div');
      card.className = 'file-card';
      card.style.cursor = 'pointer';
      card.setAttribute('data-page', pageNum);
      
      card.innerHTML = `
        <div class="file-card-preview" style="height: 100%;">
          <canvas id="canvas-page-${pageNum}"></canvas>
        </div>
        <div class="file-card-name" style="text-align: center; font-weight: 600;">Page ${pageNum}</div>
      `;

      card.addEventListener('click', () => {
        togglePageSelection(pageNum);
      });

      pagePreviewGrid.appendChild(card);
      
      // Render page canvas background asynchronously
      const scale = 0.25;
      const viewport = page.getViewport({ scale });
      const canvas = document.getElementById(`canvas-page-${pageNum}`);
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      page.render({
        canvasContext: context,
        viewport: viewport
      });
      
      // Update progress slightly as we load thumbnails
      const renderPercent = 15 + Math.round((pageNum / total) * 85);
      showProgress(true, `Loading previews (${pageNum}/${total})...`, renderPercent);
    }
  }

  // --- Page Selection Controls ---
  function togglePageSelection(pageNum) {
    if (selectedPages.has(pageNum)) {
      selectedPages.delete(pageNum);
    } else {
      selectedPages.add(pageNum);
    }
    
    updatePageCardStyles();
    syncSetToRangeInput();
    validateSplitState();
  }

  function updatePageCardStyles() {
    const cards = pagePreviewGrid.querySelectorAll('.file-card');
    const mode = getSelectedMode();
    
    cards.forEach(card => {
      const pageNum = parseInt(card.getAttribute('data-page'), 10);
      let isHighlighted = false;

      if (mode === 'ranges') {
        isHighlighted = selectedPages.has(pageNum);
      } else if (mode === 'odd') {
        isHighlighted = (pageNum % 2 !== 0);
      } else if (mode === 'even') {
        isHighlighted = (pageNum % 2 === 0);
      } else if (mode === 'all' || mode === 'split-after') {
        isHighlighted = true;
      }

      // Adjust cursor style
      card.style.cursor = (mode === 'ranges') ? 'pointer' : 'default';

      if (isHighlighted) {
        card.style.borderColor = 'var(--text-primary)';
        card.style.backgroundColor = 'var(--bg-tertiary)';
        card.style.opacity = '1';
      } else {
        card.style.borderColor = 'var(--border-subtle)';
        card.style.backgroundColor = 'var(--bg-secondary)';
        card.style.opacity = (mode === 'ranges') ? '1' : '0.4';
      }
    });
  }

  // Synchronize the selected set to range string: [1, 2, 3, 5] -> "1-3, 5"
  function syncSetToRangeInput() {
    if (selectedPages.size === 0) {
      rangeInput.value = '';
      return;
    }
    
    const sorted = Array.from(selectedPages).sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0];
    let end = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    
    rangeInput.value = ranges.join(', ');
  }

  // Synchronize range input back to selection Set: "1-3, 5" -> [1, 2, 3, 5]
  rangeInput.addEventListener('input', (e) => {
    if (!activeFile) return;
    
    const val = e.target.value;
    selectedPages.clear();
    
    const ranges = val.split(',');
    ranges.forEach(part => {
      const cleaned = part.trim();
      if (!cleaned) return;
      
      if (cleaned.includes('-')) {
        const bounds = cleaned.split('-');
        const start = parseInt(bounds[0], 10);
        const end = parseInt(bounds[1], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let p = start; p <= end; p++) {
            if (p >= 1 && p <= activeFile.totalPages) {
              selectedPages.add(p);
            }
          }
        }
      } else {
        const page = parseInt(cleaned, 10);
        if (!isNaN(page) && page >= 1 && page <= activeFile.totalPages) {
          selectedPages.add(page);
        }
      }
    });

    updatePageCardStyles();
    validateSplitState();
  });

  // --- UI Validation State ---
  function getSelectedMode() {
    const activeRadio = Array.from(splitModeRadios).find(r => r.checked);
    return activeRadio ? activeRadio.value : 'ranges';
  }

  function validateSplitState() {
    if (!activeFile) {
      splitBtn.disabled = true;
      return;
    }
    
    const mode = getSelectedMode();
    if (mode === 'ranges') {
      splitBtn.disabled = selectedPages.size === 0;
    } else if (mode === 'split-after') {
      const val = splitAfterInput.value.trim();
      if (!val) {
        splitBtn.disabled = true;
        return;
      }
      const parts = val.split(',');
      let hasValidCut = false;
      for (let part of parts) {
        const num = parseInt(part.trim(), 10);
        if (!isNaN(num) && num >= 1 && num < activeFile.totalPages) {
          hasValidCut = true;
        }
      }
      splitBtn.disabled = !hasValidCut;
    } else {
      splitBtn.disabled = false;
    }
  }

  // --- Split PDF Operations ---
  splitBtn.addEventListener('click', async () => {
    if (!activeFile) return;

    const mode = getSelectedMode();
    showAlert(null);
    splitBtn.disabled = true;

    try {
      if (mode === 'ranges') {
        // Extract selected pages into a single PDF
        showProgress(true, 'Slicing pages...', 30);
        
        const srcDoc = await PDFLib.PDFDocument.load(activeFile.arrayBuffer);
        const destDoc = await PDFLib.PDFDocument.create();
        
        // 0-indexed page indexes for pdf-lib copyPages
        const pageIndices = Array.from(selectedPages)
          .sort((a, b) => a - b)
          .map(p => p - 1);
          
        showProgress(true, `Extracting ${pageIndices.length} pages...`, 60);
        
        const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(p => destDoc.addPage(p));
        
        showProgress(true, 'Assembling document...', 85);
        const bytes = await destDoc.save({ useObjectStreams: false });
        console.log('Split PDF Bytes length:', bytes.length);
        
        // Download
        const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
        await toolixDownload(bytes, `${nameWithoutExt}_split.pdf`, 'application/pdf');
        
        showAlert('Pages extracted successfully.', 'success');
      } else if (mode === 'odd' || mode === 'even') {
        // Extract odd/even pages into a single PDF
        showProgress(true, `Extracting ${mode} pages...`, 30);
        
        const srcDoc = await PDFLib.PDFDocument.load(activeFile.arrayBuffer);
        const destDoc = await PDFLib.PDFDocument.create();
        const total = activeFile.totalPages;
        
        const pageIndices = [];
        for (let i = 0; i < total; i++) {
          const isOddPage = (i % 2 === 0);
          if ((mode === 'odd' && isOddPage) || (mode === 'even' && !isOddPage)) {
            pageIndices.push(i);
          }
        }
        
        showProgress(true, `Extracting ${pageIndices.length} pages...`, 60);
        
        const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(p => destDoc.addPage(p));
        
        showProgress(true, 'Assembling document...', 85);
        const bytes = await destDoc.save({ useObjectStreams: false });
        console.log('Split PDF Bytes length:', bytes.length);
        
        // Download
        const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
        await toolixDownload(bytes, `${nameWithoutExt}_${mode}.pdf`, 'application/pdf');
        
        showAlert(`${mode.charAt(0).toUpperCase() + mode.slice(1)} pages extracted successfully.`, 'success');
      } else if (mode === 'split-after') {
        // Split PDF at specific cut locations
        showProgress(true, 'Analyzing split cuts...', 15);
        
        const srcDoc = await PDFLib.PDFDocument.load(activeFile.arrayBuffer);
        const total = activeFile.totalPages;
        
        // Parse unique cuts
        const cuts = splitAfterInput.value.split(',')
          .map(part => parseInt(part.trim(), 10))
          .filter(num => !isNaN(num) && num >= 1 && num < total)
          .sort((a, b) => a - b);
          
        const uniqueCuts = Array.from(new Set(cuts));
        
        // Establish ranges
        const intervals = [];
        let startPage = 1;
        for (let cut of uniqueCuts) {
          intervals.push({ start: startPage, end: cut });
          startPage = cut + 1;
        }
        intervals.push({ start: startPage, end: total });
        
        const zip = new JSZip();
        
        for (let idx = 0; idx < intervals.length; idx++) {
          const interval = intervals[idx];
          const progressPercentValue = Math.round(20 + ((idx / intervals.length) * 60));
          showProgress(true, `Slicing segment ${idx + 1} of ${intervals.length} (pages ${interval.start}-${interval.end})...`, progressPercentValue);
          
          const pageIndices = [];
          for (let p = interval.start; p <= interval.end; p++) {
            pageIndices.push(p - 1);
          }
          
          const singleDoc = await PDFLib.PDFDocument.create();
          const copiedPages = await singleDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach(p => singleDoc.addPage(p));
          
          const bytes = await singleDoc.save({ useObjectStreams: false });
          zip.file(`part_${idx + 1}_pages_${interval.start}-${interval.end}.pdf`, bytes);
        }
        
        showProgress(true, 'Compressing parts into ZIP archive...', 85);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        showProgress(true, 'Downloading ZIP...', 95);
        const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
        await toolixDownload(zipBlob, `${nameWithoutExt}_split_parts.zip`, 'application/zip');
        
        showAlert('PDF split into parts successfully. ZIP downloaded.', 'success');
      } else {
        // Split ALL pages into individual PDFs and zip them
        showProgress(true, 'Preparing to slice all pages...', 10);
        
        const srcDoc = await PDFLib.PDFDocument.load(activeFile.arrayBuffer);
        const zip = new JSZip();
        
        const total = activeFile.totalPages;
        for (let i = 0; i < total; i++) {
          const progressPercentValue = Math.round(10 + ((i / total) * 70));
          showProgress(true, `Slicing page ${i+1} of ${total}...`, progressPercentValue);
          
          const singleDoc = await PDFLib.PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
          singleDoc.addPage(copiedPage);
          
          const bytes = await singleDoc.save({ useObjectStreams: false });
          const pageNumString = String(i + 1).padStart(3, '0');
          zip.file(`page_${pageNumString}.pdf`, bytes);
        }

        showProgress(true, 'Compressing pages into ZIP archive...', 85);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        showProgress(true, 'Downloading...', 95);
        const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
        await toolixDownload(zipBlob, `${nameWithoutExt}_split_pages.zip`, 'application/zip');
        
        showAlert('All pages split successfully. ZIP downloaded.', 'success');
      }
    } catch (err) {
      console.error(err);
      showAlert('An error occurred while splitting the PDF.', 'error');
    } finally {
      splitBtn.disabled = false;
      setTimeout(() => showProgress(false), 2000);
    }
  });

  // --- Reset/Clearing State ---
  function resetState() {
    activeFile = null;
    selectedPages.clear();
    rangeInput.value = '';
    splitAfterInput.value = '';
    pagePreviewGrid.innerHTML = '';
    filesContainer.style.display = 'none';
    dropZone.style.display = 'flex';
    fileInput.value = '';
    splitBtn.disabled = true;
    showProgress(false);
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
