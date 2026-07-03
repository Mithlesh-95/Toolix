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

if (require.main === module) {
  build();
}

module.exports = { build };
