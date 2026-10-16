const fs = require('fs');
const path = require('path');

/**
 * Searches for Cmder installation on standard Windows paths
 * Returns { root, initBat } or null
 */
function findCmder() {
  const candidates = [
    'E:\\Programs\\cmder',
    process.env.CMDER_ROOT,
    'C:\\cmder',
    'C:\\Program Files\\cmder',
    'C:\\tools\\cmder',
    'C:\\Users\\hp\\Documents'
  ].filter(Boolean);

  for (const dir of candidates) {
    const initBat = path.join(dir, 'vendor', 'init.bat');
    if (fs.existsSync(initBat)) {
      return { root: dir, initBat };
    }
    const cmderExe = path.join(dir, 'Cmder.exe');
    if (fs.existsSync(cmderExe) && fs.existsSync(initBat)) {
      return { root: dir, initBat };
    }
  }

  return null;
}

module.exports = { findCmder };
