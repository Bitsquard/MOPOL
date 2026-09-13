const { execSync } = require('child_process');
try {
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "feat: complete MOPOL core platform with auth and portal"', { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('SUCCESS');
} catch (e) {
  console.error(e);
  process.exit(1);
}
