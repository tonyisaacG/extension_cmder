const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VAULT_FILE = path.join(__dirname, '..', 'vault.json');

function loadVault() {
  if (fs.existsSync(VAULT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(VAULT_FILE, 'utf-8'));
    } catch (_) {}
  }
  return [];
}

const action = process.argv[2] || 'list';
const targetKey = process.argv[3];
const vault = loadVault();

if (action === 'keys') {
  vault.forEach(item => {
    if (item.key) console.log(item.key);
  });
  process.exit(0);
}

if (action === 'list') {
  console.log('====================================================================');
  console.log('  [Cmder Container] Secrets & Notes Vault (pass_c / val_c)');
  console.log('====================================================================');
  console.log('Usage:');
  console.log('  pass_c <key>         -> Copies password/note directly to clipboard');
  console.log('  pass_c show <key>    -> Displays password/note value in terminal');
  console.log('  Alt + V (in App)     -> Opens fast Quick-Palette with 1-click paste');
  console.log('');
  console.log('Saved Credentials & Notes:');

  if (vault.length === 0) {
    console.log('  (No items in vault yet. Press Alt+V in the app to add one!)');
  } else {
    vault.forEach(item => {
      const typeTag = `[${item.type || 'Secret'}]`.padEnd(12);
      const keyCol = `${item.key}`.padEnd(20);
      console.log(`  * ${typeTag} ${keyCol} : ${item.title || '(No description)'}`);
    });
  }
  console.log('====================================================================');
  process.exit(0);
}

if (action === 'get' || action === 'copy') {
  if (!targetKey) {
    console.log('[Vault] Missing key. Usage: pass_c <key>');
    process.exit(1);
  }

  const found = vault.find(i => 
    (i.key && i.key.toLowerCase() === targetKey.toLowerCase()) ||
    (i.id && i.id.toLowerCase() === targetKey.toLowerCase())
  );

  if (!found) {
    console.log(`[Vault] Key '${targetKey}' not found in vault.`);
    console.log('Available keys: ' + vault.map(i => i.key).join(', '));
    process.exit(1);
  }

  // Copy to clipboard via clip.exe
  const val = String(found.value || '');
  const child = spawnSync('clip.exe', { input: val, encoding: 'utf-8' });

  if (child.error) {
    console.log(`[Vault] Could not access clip.exe: ${child.error.message}`);
  } else {
    console.log(`[Vault] ✓ Successfully copied '${found.key}' to clipboard! (Press Ctrl+V to paste)`);
  }
  process.exit(0);
}

if (action === 'show') {
  if (!targetKey) {
    console.log('[Vault] Missing key. Usage: pass_c show <key>');
    process.exit(1);
  }

  const found = vault.find(i => 
    (i.key && i.key.toLowerCase() === targetKey.toLowerCase()) ||
    (i.id && i.id.toLowerCase() === targetKey.toLowerCase())
  );

  if (!found) {
    console.log(`[Vault] Key '${targetKey}' not found.`);
    process.exit(1);
  }

  console.log(`[Vault] ${found.key} (${found.title || ''}):`);
  console.log(found.value);
  process.exit(0);
}
