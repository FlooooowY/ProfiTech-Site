const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Проверяем наличие .next директории и BUILD_ID файла
const nextDir = path.join(process.cwd(), '.next');
const buildIdFile = path.join(nextDir, 'BUILD_ID');

const hasBuild = fs.existsSync(nextDir) && fs.existsSync(buildIdFile);

if (!hasBuild) {
  console.log('⚠️  Production build not found. Building application...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
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
  execSync('next start', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}

