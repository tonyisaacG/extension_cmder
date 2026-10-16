const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function handleHttpRequest(req, res, { cmderInfo, rootDir, workspacesFile, lastSessionFile, port }) {
  const parsedUrl = new URL(req.url, `http://localhost:${port}`);
  let pathname = parsedUrl.pathname;

  // 1. Browse Folder Dialog (PowerShell)
  if (pathname === '/api/browse-folder') {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $f = New-Object System.Windows.Forms.FolderBrowserDialog
      $f.Description = "Select Project Folder for Tab"
      $f.ShowNewFolderButton = $true
      if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $f.SelectedPath
      }
    `;
    exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ';')}"`, (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ folder: stdout.trim() || null }));
    });
    return;
  }

  // 2. Info API
  if (pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      cmderDetected: !!cmderInfo,
      cmderRoot: cmderInfo ? cmderInfo.root : null,
      defaultCwd: process.cwd()
    }));
    return;
  }

  // 3. Last Session Cache API
  if (pathname === '/api/last-session') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          fs.writeFileSync(lastSessionFile, body, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    } else {
      let data = { tabs: [], activeIndex: 0 };
      if (fs.existsSync(lastSessionFile)) {
        try {
          data = JSON.parse(fs.readFileSync(lastSessionFile, 'utf-8'));
        } catch (_) {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
  }

  // 4. Workspaces API
  if (pathname === '/api/workspaces') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          fs.writeFileSync(workspacesFile, body, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    } else {
      let data = {};
      if (fs.existsSync(workspacesFile)) {
        try {
          data = JSON.parse(fs.readFileSync(workspacesFile, 'utf-8'));
        } catch (_) {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
  }

  // 5. Vendor xterm libraries
  if (pathname.startsWith('/xterm/')) {
    const sub = pathname.replace('/xterm/', '');
    let target = path.join(rootDir, 'node_modules', '@xterm', sub);
    if (fs.existsSync(target)) {
      const ext = path.extname(target);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(target).pipe(res);
      return;
    }
  }

  // 6. Static files from public/ or assets/
  if (pathname === '/') pathname = '/index.html';

  let filePath = path.join(rootDir, 'public', pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(rootDir, pathname);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

module.exports = { handleHttpRequest };
