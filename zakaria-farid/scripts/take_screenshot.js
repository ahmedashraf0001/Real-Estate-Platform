const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\lyr1csan\\.gemini\\antigravity-ide\\brain\\7304d537-4404-404c-b5bb-7485685ee287';

const screenshotPath = path.join(artifactDir, 'property_detail_full.png');

try {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --window-size=1600,2400 --screenshot="${screenshotPath}" http://localhost:3005/en/properties/ultra-luxury-modern-smart-mansion`;
  console.log('Running:', cmd);
  execSync(cmd);
  console.log('Screenshot saved to:', screenshotPath, 'Size:', fs.statSync(screenshotPath).size);
} catch (err) {
  console.error('Error taking screenshot:', err);
}
