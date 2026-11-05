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

function handleHttpRequest(req, res, { cmderInfo, rootDir, workspacesFile, lastSessionFile, scriptsFile, scriptsDir, vaultFile, snapshotsFile, port }) {
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

  // 5. Scripts Store API (GET, POST, DELETE)
  if (pathname === '/api/scripts') {
    // Ensure scripts dir exists
    if (!fs.existsSync(scriptsDir)) {
      try { fs.mkdirSync(scriptsDir, { recursive: true }); } catch (_) {}
    }

    const loadScripts = () => {
      let list = [];
      if (fs.existsSync(scriptsFile)) {
        try {
          list = JSON.parse(fs.readFileSync(scriptsFile, 'utf-8'));
        } catch (_) {}
      }
      // Also sync any standalone .bat/.cmd in user_scripts directory
      if (fs.existsSync(scriptsDir)) {
        const files = fs.readdirSync(scriptsDir);
        files.forEach(f => {
          if (f.endsWith('.bat') || f.endsWith('.cmd')) {
            const name = f.replace(/\.(bat|cmd)$/i, '');
            if (!list.some(s => s.name === name)) {
              let content = '';
              try { content = fs.readFileSync(path.join(scriptsDir, f), 'utf-8'); } catch (_) {}
              list.push({
                id: name,
                name: name,
                description: `Script from ${f}`,
                category: 'General',
                content: content,
                updatedAt: new Date().toISOString()
              });
            }
          }
        });
      }
      return list;
    };

    if (req.method === 'GET') {
      const list = loadScripts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          let safeName = (payload.name || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
          if (!safeName) safeName = `script_${Date.now()}`;

          const content = payload.content || '@echo off\necho Running script...\n';
          const batFile = path.join(scriptsDir, `${safeName}.bat`);
          fs.writeFileSync(batFile, content, 'utf-8');

          let list = loadScripts();
          const existingIdx = list.findIndex(s => s.name === safeName || s.id === payload.id);
          const item = {
            id: safeName,
            name: safeName,
            description: payload.description || 'Custom user script',
            category: payload.category || 'General',
            content: content,
            updatedAt: new Date().toISOString()
          };

          if (existingIdx >= 0) {
            list[existingIdx] = item;
          } else {
            list.push(item);
          }

          fs.writeFileSync(scriptsFile, JSON.stringify(list, null, 2), 'utf-8');

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, script: item }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      let targetName = parsedUrl.searchParams.get('name');
      const finishDelete = (name) => {
        if (!name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing script name' }));
          return;
        }

        const batFile = path.join(scriptsDir, `${name}.bat`);
        const cmdFile = path.join(scriptsDir, `${name}.cmd`);
        try { if (fs.existsSync(batFile)) fs.unlinkSync(batFile); } catch (_) {}
        try { if (fs.existsSync(cmdFile)) fs.unlinkSync(cmdFile); } catch (_) {}

        let list = loadScripts();
        list = list.filter(s => s.name !== name && s.id !== name);
        fs.writeFileSync(scriptsFile, JSON.stringify(list, null, 2), 'utf-8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      };

      if (!targetName) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            finishDelete(data.name);
          } catch (_) {
            finishDelete(null);
          }
        });
      } else {
        finishDelete(targetName);
      }
      return;
    }
  }

  // 6. Secrets & Notes Vault API (GET, POST, DELETE)
  if (pathname === '/api/vault') {
    const loadVault = () => {
      if (vaultFile && fs.existsSync(vaultFile)) {
        try {
          return JSON.parse(fs.readFileSync(vaultFile, 'utf-8'));
        } catch (_) {}
      }
      return [];
    };

    if (req.method === 'GET') {
      const list = loadVault();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          let key = (payload.key || payload.id || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
          if (!key) key = `vault_${Date.now()}`;

          let list = loadVault();
          const targetId = payload.id || key;
          const existingIdx = list.findIndex(i => i.id === targetId || i.key === key);

          const item = {
            id: targetId,
            key: key,
            title: payload.title || key,
            type: payload.type || 'Password',
            value: payload.value || '',
            isSecret: payload.isSecret !== false,
            updatedAt: new Date().toISOString()
          };

          if (existingIdx >= 0) {
            list[existingIdx] = item;
          } else {
            list.push(item);
          }

          if (vaultFile) {
            fs.writeFileSync(vaultFile, JSON.stringify(list, null, 2), 'utf-8');
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      let targetId = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('key');
      const finishDelete = (id) => {
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing vault id or key' }));
          return;
        }

        let list = loadVault();
        list = list.filter(i => i.id !== id && i.key !== id);
        if (vaultFile) {
          fs.writeFileSync(vaultFile, JSON.stringify(list, null, 2), 'utf-8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      };

      if (!targetId) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            finishDelete(data.id || data.key);
          } catch (_) {
            finishDelete(null);
          }
        });
      } else {
        finishDelete(targetId);
      }
      return;
    }
  }

  // 7. Session Snapshots API (GET, POST, DELETE)
  if (pathname === '/api/snapshots') {
    const loadSnapshots = () => {
      if (snapshotsFile && fs.existsSync(snapshotsFile)) {
        try {
          return JSON.parse(fs.readFileSync(snapshotsFile, 'utf-8'));
        } catch (_) {}
      }
      return [];
    };

    if (req.method === 'GET') {
      const list = loadSnapshots();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const snapId = payload.id || `snap_${Date.now()}`;
          let list = loadSnapshots();
          const existingIdx = list.findIndex(s => s.id === snapId);

          const now = new Date().toISOString();
          const item = {
            id: snapId,
            title: payload.title || (existingIdx >= 0 ? list[existingIdx].title : `Snapshot ${new Date().toLocaleTimeString()}`),
            description: payload.description !== undefined ? payload.description : (existingIdx >= 0 ? list[existingIdx].description : ''),
            createdAt: existingIdx >= 0 && list[existingIdx].createdAt ? list[existingIdx].createdAt : (payload.createdAt || now),
            updatedAt: now,
            tabs: Array.isArray(payload.tabs) ? payload.tabs : (existingIdx >= 0 ? list[existingIdx].tabs : [])
          };

          if (existingIdx >= 0) {
            list[existingIdx] = item;
          } else {
            list.unshift(item); // Newest first
          }

          if (snapshotsFile) {
            fs.writeFileSync(snapshotsFile, JSON.stringify(list, null, 2), 'utf-8');
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, snapshot: item }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      let targetId = parsedUrl.searchParams.get('id');
      const finishDelete = (id) => {
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing snapshot id' }));
          return;
        }

        let list = loadSnapshots();
        list = list.filter(s => s.id !== id);
        if (snapshotsFile) {
          fs.writeFileSync(snapshotsFile, JSON.stringify(list, null, 2), 'utf-8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      };

      if (!targetId) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            finishDelete(data.id);
          } catch (_) {
            finishDelete(null);
          }
        });
      } else {
        finishDelete(targetId);
      }
      return;
    }
  }

  // 8. Vendor xterm libraries
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

  // 7. Static files from public/ or assets/
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
