const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const srcBackendDir = path.join(rootDir, 'bizbuddy-backend');
const srcDistDir = path.join(srcBackendDir, 'dist');
const destBackendDir = path.join(rootDir, 'functions', 'bizbuddy-backend');

console.log('🔄 Compiling backend TypeScript source...');
execSync('npm run build --workspace=bizbuddy-backend', { cwd: rootDir, stdio: 'inherit' });

console.log('🔄 Cleaning old deployment folder contents...');
if (fs.existsSync(destBackendDir)) {
  fs.readdirSync(destBackendDir).forEach(file => {
    if (file === 'node_modules' || file === 'package-lock.json') return;
    const p = path.join(destBackendDir, file);
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (err) {
      console.log(`[Warning] Could not clean ${file}:`, err.message);
    }
  });
} else {
  fs.mkdirSync(destBackendDir, { recursive: true });
}

console.log('🔄 Copying compiled JavaScript to deployment directory...');
// Recursive copy helper
function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}
copyFolderSync(srcDistDir, destBackendDir);

console.log('🔄 Syncing catalyst-config.json...');
fs.copyFileSync(
  path.join(srcBackendDir, 'catalyst-config.json'),
  path.join(destBackendDir, 'catalyst-config.json')
);

console.log('🔄 Syncing package.json with entry point correction...');
const pkg = JSON.parse(fs.readFileSync(path.join(srcBackendDir, 'package.json'), 'utf8'));
pkg.main = 'index.js'; // Catalyst entry point points directly to index.js in root of function
fs.writeFileSync(
  path.join(destBackendDir, 'package.json'),
  JSON.stringify(pkg, null, 2),
  'utf8'
);

console.log('✅ BACKEND SYNC COMPLETED SUCCESSFULLY!');
