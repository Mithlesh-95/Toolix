/**
 * Toolix Image to PDF Logic
 * Processes files client-side using pdf-lib.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Record usage
  if (window.ToolixHistory) {
    window.ToolixHistory.add('pdf-image-to-pdf');
  }

  // State
  let uploadedImages = []; // Array of { id, file, name, size, dataUrl }

  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInputExtra = document.getElementById('file-input-extra');
  const filesContainer = document.getElementById('files-container');
  const filePreviewGrid = document.getElementById('file-preview-grid');
  const filesCountLabel = document.getElementById('files-count-label');
  const addMoreBtn = document.getElementById('add-more-btn');
  const pageSizeSelect = document.getElementById('page-size-select');
  const orientationGroup = document.getElementById('orientation-group');
  const orientationSelect = document.getElementById('orientation-select');
  const marginSelect = document.getElementById('margin-select');
  const convertBtn = document.getElementById('convert-btn');
  const progressWrapper = document.getElementById('progress-wrapper');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const alertBox = document.getElementById('alert-box');

  // --- Display Page Settings Toggle ---
  pageSizeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'auto') {
      orientationGroup.style.display = 'none';
    } else {
      orientationGroup.style.display = 'flex';
    }
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
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });

  addMoreBtn.addEventListener('click', () => {
    fileInputExtra.click();
  });

  fileInputExtra.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });

  // --- Process Uploaded Images ---
  async function handleFiles(files) {
    showAlert(null);
    showProgress(true, 'Loading images...', 20);

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const imageFiles = Array.from(files).filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return validTypes.includes(file.type) || ['png', 'jpg', 'jpeg', 'webp'].includes(extension);
    });

    if (imageFiles.length === 0) {
      showAlert('Please upload valid image files (PNG, JPG, or WebP).', 'error');
      showProgress(false);
      return;
    }

    const loadPromises = imageFiles.map(file => readImageFile(file));

    try {
      const results = await Promise.all(loadPromises);
      uploadedImages = [...uploadedImages, ...results];
      renderImages();
    } catch (err) {
      console.error(err);
      showAlert('Failed to read one or more images.', 'error');
    } finally {
      showProgress(false);
    }
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: 'img-' + Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          size: formatBytes(file.size),
          dataUrl: e.target.result
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // --- Render Image Previews ---
  function renderImages() {
    filePreviewGrid.innerHTML = '';
    
    if (uploadedImages.length === 0) {
      dropZone.style.display = 'flex';
      filesContainer.style.display = 'none';
      convertBtn.disabled = true;
      return;
    }

    dropZone.style.display = 'none';
    filesContainer.style.display = 'block';
    filesCountLabel.textContent = `Uploaded Images (${uploadedImages.length})`;
    convertBtn.disabled = false;

    uploadedImages.forEach((imgObj) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', imgObj.id);

      card.innerHTML = `
        <button class="file-card-remove" title="Remove image" data-id="${imgObj.id}">×</button>
        <div class="file-card-preview">
          <img src="${imgObj.dataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
        </div>
        <div style="width: 100%;">
          <div class="file-card-name" title="${imgObj.name}">${imgObj.name}</div>
          <div class="file-card-meta">${imgObj.size}</div>
        </div>
      `;

      card.querySelector('.file-card-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeImage(imgObj.id);
      });

      setupDragEvents(card);

      filePreviewGrid.appendChild(card);
    });
  }

  function removeImage(id) {
    uploadedImages = uploadedImages.filter(img => img.id !== id);
    renderImages();
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
      
      const reorderedIds = Array.from(filePreviewGrid.querySelectorAll('.file-card'))
        .map(c => c.getAttribute('data-id'));
        
      uploadedImages = reorderedIds.map(id => uploadedImages.find(img => img.id === id));
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

  // --- Image to PDF Generator ---
  convertBtn.addEventListener('click', async () => {
    if (uploadedImages.length === 0) return;

    showAlert(null);
    convertBtn.disabled = true;
    showProgress(true, 'Initializing PDF compilation...', 10);

    const pageSize = pageSizeSelect.value;
    const orientation = orientationSelect.value;
    const marginSelectValue = marginSelect.value;

    let margin = 0;
    if (marginSelectValue === 'small') margin = 20;
    if (marginSelectValue === 'large') margin = 40;

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      for (let i = 0; i < uploadedImages.length; i++) {
        const imgObj = uploadedImages[i];
        const progressVal = 10 + Math.round((i / uploadedImages.length) * 80);
        showProgress(true, `Processing page ${i + 1} of ${uploadedImages.length}...`, progressVal);

        // Load image and draw to offscreen canvas to export clean high-compatibility JPEG bytes
        // This converts PNG, WebP, JPEG and solves any metadata/compatibility error with pdfDoc.embedJpg
        const img = await loadImageElement(imgObj.dataUrl);
        const jpgBytes = await convertToJpgBytes(img);
        
        // Embed JPG
        const embeddedImage = await pdfDoc.embedJpg(jpgBytes);
        const { width: imgWidth, height: imgHeight } = embeddedImage.scale(1);

        // Calculate page layout sizes
        let pageWidth = imgWidth + (margin * 2);
        let pageHeight = imgHeight + (margin * 2);

        if (pageSize === 'a4') {
          pageWidth = 595.27;  // A4 points
          pageHeight = 841.89;
        } else if (pageSize === 'letter') {
          pageWidth = 612;     // US Letter points
          pageHeight = 792;
        }

        // Apply orientation
        if (pageSize !== 'auto' && orientation === 'landscape') {
          const temp = pageWidth;
          pageWidth = pageHeight;
          pageHeight = temp;
        }

        // Create page
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate drawing box dimensions
        const printableWidth = pageWidth - (margin * 2);
        const printableHeight = pageHeight - (margin * 2);

        // Calculate scale ratios
        const widthRatio = printableWidth / imgWidth;
        const heightRatio = printableHeight / imgHeight;
        const scale = Math.min(widthRatio, heightRatio);

        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;

        // Center on the page
        const drawX = margin + ((printableWidth - drawWidth) / 2);
        const drawY = margin + ((printableHeight - drawHeight) / 2);

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight
        });
      }

      showProgress(true, 'Compiling document...', 90);
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false }); // Disable object streams for maximum viewer compatibility
      console.log('Generated PDF Bytes length:', pdfBytes.length);

      showProgress(true, 'Downloading...', 95);
      await toolixDownload(pdfBytes, 'toolix_images.pdf', 'application/pdf');

      showProgress(true, 'Complete!', 100);
      showAlert('PDF created successfully from images.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('An error occurred while compiling the PDF document.', 'error');
    } finally {
      convertBtn.disabled = false;
      setTimeout(() => showProgress(false), 2000);
    }
  });

  // --- Helper Functions ---
  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  function convertToJpgBytes(img) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF'; // Solid background for transparent PNG elements
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(new Uint8Array(reader.result));
        };
        reader.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.85); // 85% compression quality
    });
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
