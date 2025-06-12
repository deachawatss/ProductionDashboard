const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env from root directory
const rootEnvPath = path.join(__dirname, '..', '.env');
let frontendPort = '3001'; // default

if (fs.existsSync(rootEnvPath)) {
  console.log('Loading .env for port configuration...');
  const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (key === 'FRONTEND_PORT') {
          frontendPort = value;
          console.log(`Using frontend port: ${frontendPort}`);
        }
      }
    }
  });
}

// Start Next.js dev server
const nextProcess = spawn('npx', ['next', 'dev', '-p', frontendPort], {
  stdio: 'inherit',
  shell: true
});

nextProcess.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
}); 