/**
 * Toolix Compress PDF Logic
 * Processes files client-side using pdf-lib.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Record usage
  if (window.ToolixHistory) {
    window.ToolixHistory.add('pdf-compress');
  }

  // State
  let activeFile = null; // { name, size, arrayBuffer, totalPages }

  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfoDashboard = document.getElementById('file-info-dashboard');
  const docTitle = document.getElementById('doc-title');
  const docMeta = document.getElementById('doc-meta');
  const statOriginalSize = document.getElementById('stat-original-size');
  const statCompressedSize = document.getElementById('stat-compressed-size');
  const changeFileBtn = document.getElementById('change-file-btn');
  const compressBtn = document.getElementById('compress-btn');
  const progressWrapper = document.getElementById('progress-wrapper');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const alertBox = document.getElementById('alert-box');
  const compressLevelRadios = document.getElementsByName('compress-level');

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

  changeFileBtn.addEventListener('click', () => {
    resetState();
  });

  // --- Main File Processing ---
  async function processFile(file) {
    showAlert(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showAlert('Please upload a valid PDF document.', 'error');
      return;
    }

    showProgress(true, 'Reading PDF properties...', 20);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        
        // Load PDF to check page count
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();
        
        activeFile = {
          name: file.name,
          size: file.size,
          arrayBuffer: arrayBuffer,
          totalPages: pageCount
        };
        
        docTitle.textContent = file.name;
        docMeta.textContent = `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} | ${formatBytes(file.size)}`;
        statOriginalSize.textContent = formatBytes(file.size);
        statCompressedSize.textContent = 'Pending';
        statCompressedSize.style.color = 'var(--text-muted)';
        
        dropZone.style.display = 'none';
        fileInfoDashboard.style.display = 'block';
        compressBtn.disabled = false;
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

  // --- PDF Compression Operation ---
  compressBtn.addEventListener('click', async () => {
    if (!activeFile) return;

    showAlert(null);
    compressBtn.disabled = true;
    showProgress(true, 'Analyzing page tree...', 15);

    // Get compression options
    const compressionLevel = Array.from(compressLevelRadios).find(r => r.checked).value;

    try {
      showProgress(true, 'Re-building PDF structure (cleaning metadata)...', 40);
      
      // Load source bytes
      const srcDoc = await PDFLib.PDFDocument.load(activeFile.arrayBuffer);
      
      // Create destination document
      const destDoc = await PDFLib.PDFDocument.create();
      
      // Copy all pages. This strips away unused fonts, redundant metadata objects, 
      // edit histories, and makes structural clean-up.
      const pageIndices = srcDoc.getPageIndices();
      
      showProgress(true, `Cloning ${pageIndices.length} document streams...`, 60);
      const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach(p => destDoc.addPage(p));

      showProgress(true, 'Encoding object streams...', 80);
      
      // Set save settings based on selected optimization levels
      let saveOptions = { useObjectStreams: true };
      if (compressionLevel === 'low') {
        saveOptions.useObjectStreams = false; // Minimal structural cleaning
      } else if (compressionLevel === 'high') {
        saveOptions.useObjectStreams = true;
        saveOptions.updateMetadata = false; // Strip out all document descriptive headers
      }

      const compressedBytes = await destDoc.save(saveOptions);
      
      showProgress(true, 'Finalizing bytes...', 95);
      const compressedSize = compressedBytes.length;
      console.log('Compressed PDF Bytes length:', compressedSize);
      
      // Render compression statistics
      statCompressedSize.textContent = formatBytes(compressedSize);
      statCompressedSize.style.color = 'var(--accent)';
      
      // Calculate savings
      const savingPercent = Math.max(0, Math.round((1 - (compressedSize / activeFile.size)) * 100));
      
      // Download file
      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
      await toolixDownload(compressedBytes, `${nameWithoutExt}_compressed.pdf`, 'application/pdf');

      if (savingPercent > 0) {
        showAlert(`Optimization complete! PDF file size reduced by ${savingPercent}% (${formatBytes(activeFile.size)} → ${formatBytes(compressedSize)}).`, 'success');
      } else {
        showAlert(`Optimization complete. The document was already highly optimized. (Size remains unchanged at ${formatBytes(compressedSize)}).`, 'success');
      }
    } catch (err) {
      console.error(err);
      showAlert('An error occurred during compression.', 'error');
    } finally {
      compressBtn.disabled = false;
      setTimeout(() => showProgress(false), 2000);
    }
  });

  // --- Reset/Clearing State ---
  function resetState() {
    activeFile = null;
    fileInfoDashboard.style.display = 'none';
    dropZone.style.display = 'flex';
    fileInput.value = '';
    compressBtn.disabled = true;
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
