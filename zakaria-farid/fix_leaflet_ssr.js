const fs = require('fs');
const path = require('path');

const files = [
  'src/components/property/PropertyDetailView.tsx',
  'src/components/map/MapModal.tsx',
  'src/components/map/MapSection.tsx',
  'src/components/map/MapView.tsx',
  'src/components/contact/ContactView.tsx'
];

for (const rel of files) {
  const full = path.resolve('C:/Users/lyr1csan/Documents/project/Real-Estate-Platform/zakaria-farid', rel);
  if (!fs.existsSync(full)) continue;
  let code = fs.readFileSync(full, 'utf8');

  // Replace import L from 'leaflet' or import type L from 'leaflet' with dynamic require
  code = code.replace(/import\s+(?:type\s+)?L\s+from\s+['"]leaflet['"];?/g, "let L: any = null;\nif (typeof window !== 'undefined') {\n  L = require('leaflet');\n}");

  // Remove any redundant inside require('leaflet')
  code = code.replace(/const L = require\('leaflet'\);/g, "");

  fs.writeFileSync(full, code, 'utf8');
  console.log('Updated Leaflet SSR check in', rel);
}
