const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Проверяем наличие .next директории и BUILD_ID файла
const nextDir = path.join(process.cwd(), '.next');
const buildIdFile = path.join(nextDir, 'BUILD_ID');

const hasBuild = fs.existsSync(nextDir) && fs.existsSync(buildIdFile);

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  if (!hasBuild) {
    console.log('⚠️  Production build not found. Building application...');
    try {
      await runCommand('npm', ['run', 'build']);
      console.log('✅ Build completed successfully!');
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Production build found. Starting server...');
  }

  // Запускаем production сервер
  try {
    await runCommand('next', ['start']);
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

