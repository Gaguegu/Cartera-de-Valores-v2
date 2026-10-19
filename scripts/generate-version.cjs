const fs = require('fs');
const path = require('path');

let version = '2.9.9';
try {
  const pkgPath = path.resolve(__dirname, '../package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) version = pkg.version;
  }
} catch (e) {
  // fallback
}

const sha = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : '0e15465';

let rawMsg = process.env.COMMIT_MESSAGE || 'Actualización de la aplicación';
if (
  typeof rawMsg !== 'string' ||
  rawMsg.startsWith('{') ||
  rawMsg.startsWith('[') ||
  rawMsg.includes('step_index') ||
  rawMsg.includes('PLANNER_RESPONSE') ||
  rawMsg.includes('MODEL')
) {
  rawMsg = 'Actualización y mejoras en la cartera de valores';
}

// Extract first line
let cleanMsg = rawMsg.split('\n')[0].trim();
if (!cleanMsg || cleanMsg.length < 3) {
  cleanMsg = 'Actualización y mejoras en la cartera de valores';
}

const info = {
  version: version,
  commitSha: process.env.GITHUB_SHA || sha,
  buildTime: new Date().toISOString(),
  message: cleanMsg,
  author: process.env.GITHUB_ACTOR || 'Gaguegu',
  branch: process.env.GITHUB_REF_NAME || 'principal',
  repo: 'Gaguegu/Cartera-de-Valores-v2'
};

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const targetPath = path.join(publicDir, 'version.json');
fs.writeFileSync(targetPath, JSON.stringify(info, null, 2));
console.log('Version generated successfully:', info);
