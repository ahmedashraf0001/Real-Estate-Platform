const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\lyr1csan\\.gemini\\antigravity-ide\\brain\\7304d537-4404-404c-b5bb-7485685ee287';

const fullScreenshotPath = path.join(artifactDir, 'property_detail_full_page.png');

try {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --window-size=1600,4800 --screenshot="${fullScreenshotPath}" http://localhost:3005/en/properties/ultra-luxury-modern-smart-mansion`;
  console.log('Capturing full page screenshot...');
  execSync(cmd);
  console.log('Saved:', fullScreenshotPath, 'Size:', fs.statSync(fullScreenshotPath).size);
} catch (err) {
  console.error('Error:', err);
}
