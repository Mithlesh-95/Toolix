/**
 * Toolix Build & Dev Server Utility
 * Runs entirely with Node.js standard libraries.
 * 
 * Functions:
 * 1. Build: Copies 'modules/pdf' to root 'pdf' to allow clean URL matching on GitHub Pages.
 * 2. Dev Server: Serves files on http://localhost:3000 with clean URL resolution.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3000;
const SRC_DIR = path.join(__dirname, 'modules');
const DEST_DIR = path.join(__dirname, 'pdf');

// --- 1. Recursive Copy Function ---
function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  
  const elements = fs.readdirSync(from);
  for (const element of elements) {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    const stat = fs.lstatSync(fromPath);
    
    if (stat.isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

// --- 2. Clean/Build Task ---
function build() {
  console.log('Building Toolix modules...');
  
  // Clean target pdf/ folder if it exists
  if (fs.existsSync(DEST_DIR)) {
    console.log('Cleaning old build files...');
    fs.rmSync(DEST_DIR, { recursive: true, force: true });
  }

  // Copy modules/pdf to root pdf/
  const srcPdf = path.join(SRC_DIR, 'pdf');
  if (fs.existsSync(srcPdf)) {
    copyFolderSync(srcPdf, DEST_DIR);
    console.log('✔ Build completed: modules/pdf/ compiled into root /pdf/ folder.');
  } else {
    console.warn('⚠ Warn: modules/pdf/ folder not found. Nothing compiled.');
  }
}

// --- 3. Local HTTP Server ---
function startServer() {
  const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0]; // strip query strings
    
    // Resolve clean URLs (e.g. /pdf/merge -> /pdf/merge/index.html)
    let filePath = path.join(__dirname, urlPath);
    
    // If request has no extension, assume index.html in a matching folder
    if (path.extname(filePath) === '') {
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if (fs.existsSync(filePath + '/index.html')) {
        filePath = filePath + '/index.html';
      } else {
        // Check inside modules/ if root doesn't have it (fallback)
        const modulesFallback = path.join(SRC_DIR, urlPath);
        if (fs.existsSync(modulesFallback) && fs.lstatSync(modulesFallback).isDirectory()) {
          filePath = path.join(modulesFallback, 'index.html');
        } else if (fs.existsSync(modulesFallback + '/index.html')) {
          filePath = modulesFallback + '/index.html';
        }
      }
    }

    // Default to root index.html
    if (urlPath === '/' || urlPath === '/index.html') {
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // Send 404 page
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404: Not Found (${urlPath})`);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`Toolix Dev Server is running at: http://localhost:${PORT}/`);
    console.log(`\nClean URLs supported:`);
    console.log(`- http://localhost:${PORT}/`);
    console.log(`- http://localhost:${PORT}/pdf`);
    console.log(`- http://localhost:${PORT}/pdf/merge`);
    console.log(`- http://localhost:${PORT}/pdf/split`);
    console.log(`- http://localhost:${PORT}/pdf/compress`);
    console.log(`- http://localhost:${PORT}/pdf/image-to-pdf`);
    console.log(`- http://localhost:${PORT}/pdf/pdf-to-image`);
    console.log(`- http://localhost:${PORT}/pdf/rotate`);
    console.log(`==================================================\n`);
  });
}

// Run Build
build();

// Start Server if arguments include '--serve' or by default
if (process.argv.includes('--serve') || process.argv.length <= 2) {
  startServer();
}
