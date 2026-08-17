const fs = require('fs');
const path = require('path');

const NEW_UI = path.resolve('C:/Users/lyr1csan/Documents/project/new ui/src');
const NEXT_APP = path.resolve('C:/Users/lyr1csan/Documents/project/Real-Estate-Platform/zakaria-farid/src');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function processContent(content, filename) {
  // Add 'use client'
  if (!content.startsWith("'use client'")) {
    content = "'use client';\n" + content;
  }

  // Replace type imports
  content = content.replace(/from\s+['"]\.\.\/types['"]/g, "from '@/types'");
  content = content.replace(/from\s+['"]\.\/types['"]/g, "from '@/types'");

  // Replace data imports
  content = content.replace(/from\s+['"]\.\.\/data\/properties['"]/g, "from '@/data/properties'");
  content = content.replace(/from\s+['"]\.\/data\/properties['"]/g, "from '@/data/properties'");

  // Replace mapCache imports
  content = content.replace(/from\s+['"]\.\.\/utils\/mapCache['"]/g, "from '@/lib/mapCache'");
  content = content.replace(/from\s+['"]\.\/utils\/mapCache['"]/g, "from '@/lib/mapCache'");

  // Replace component cross-imports based on destination structure
  content = content.replace(/from\s+['"]\.\.\/components\/PropertyCard['"]/g, "from '@/components/property/PropertyCard'");
  content = content.replace(/from\s+['"]\.\/PropertyCard['"]/g, "from '@/components/property/PropertyCard'");
  content = content.replace(/from\s+['"]\.\.\/components\/CompareDrawer['"]/g, "from '@/components/property/CompareDrawer'");
  content = content.replace(/from\s+['"]\.\/CompareDrawer['"]/g, "from '@/components/property/CompareDrawer'");
  content = content.replace(/from\s+['"]\.\.\/components\/MarketChart['"]/g, "from '@/components/MarketChart'");
  content = content.replace(/from\s+['"]\.\/MarketChart['"]/g, "from '@/components/MarketChart'");
  content = content.replace(/from\s+['"]\.\.\/components\/QuickSearchBar['"]/g, "from '@/components/QuickSearchBar'");
  content = content.replace(/from\s+['"]\.\/QuickSearchBar['"]/g, "from '@/components/QuickSearchBar'");
  content = content.replace(/from\s+['"]\.\.\/components\/StatsSection['"]/g, "from '@/components/home/StatsSection'");
  content = content.replace(/from\s+['"]\.\/StatsSection['"]/g, "from '@/components/home/StatsSection'");
  content = content.replace(/from\s+['"]\.\.\/components\/WhyUsSection['"]/g, "from '@/components/home/WhyUsSection'");
  content = content.replace(/from\s+['"]\.\/WhyUsSection['"]/g, "from '@/components/home/WhyUsSection'");
  content = content.replace(/from\s+['"]\.\.\/components\/TestimonialsSection['"]/g, "from '@/components/home/TestimonialsSection'");
  content = content.replace(/from\s+['"]\.\/TestimonialsSection['"]/g, "from '@/components/home/TestimonialsSection'");
  content = content.replace(/from\s+['"]\.\.\/components\/MapSection['"]/g, "from '@/components/map/MapSection'");
  content = content.replace(/from\s+['"]\.\/MapSection['"]/g, "from '@/components/map/MapSection'");
  content = content.replace(/from\s+['"]\.\.\/components\/MapModal['"]/g, "from '@/components/map/MapModal'");
  content = content.replace(/from\s+['"]\.\/MapModal['"]/g, "from '@/components/map/MapModal'");

  return content;
}

const syncMap = [
  // Components
  { src: 'components/QuickSearchBar.tsx', dest: 'components/QuickSearchBar.tsx' },
  { src: 'components/StatsSection.tsx', dest: 'components/home/StatsSection.tsx' },
  { src: 'components/WhyUsSection.tsx', dest: 'components/home/WhyUsSection.tsx' },
  { src: 'components/TestimonialsSection.tsx', dest: 'components/home/TestimonialsSection.tsx' },
  { src: 'components/MapSection.tsx', dest: 'components/map/MapSection.tsx' },
  { src: 'components/MapModal.tsx', dest: 'components/map/MapModal.tsx' },
  { src: 'components/PropertyCard.tsx', dest: 'components/property/PropertyCard.tsx' },
  { src: 'components/CompareDrawer.tsx', dest: 'components/property/CompareDrawer.tsx' },
  { src: 'components/InquiryModal.tsx', dest: 'components/InquiryModal.tsx' },
  { src: 'components/Navbar.tsx', dest: 'components/Navbar.tsx' },
  { src: 'components/Footer.tsx', dest: 'components/Footer.tsx' },
  { src: 'components/LuxuryCursor.tsx', dest: 'components/LuxuryCursor.tsx' },
  { src: 'components/MarketChart.tsx', dest: 'components/MarketChart.tsx' },
  { src: 'components/SovereignPreloader.tsx', dest: 'components/SovereignPreloader.tsx' },

  // Views
  { src: 'views/HomeView.tsx', dest: 'components/home/HomeView.tsx' },
  { src: 'views/CatalogView.tsx', dest: 'components/catalog/CatalogView.tsx' },
  { src: 'views/MapView.tsx', dest: 'components/map/MapView.tsx' },
  { src: 'views/AboutView.tsx', dest: 'components/about/AboutView.tsx' },
  { src: 'views/ContactView.tsx', dest: 'components/contact/ContactView.tsx' },
  { src: 'views/NotFoundView.tsx', dest: 'components/NotFoundView.tsx' },
  { src: 'views/MaintenanceView.tsx', dest: 'components/MaintenanceView.tsx' },
];

for (const item of syncMap) {
  const srcFile = path.join(NEW_UI, item.src);
  const destFile = path.join(NEXT_APP, item.dest);

  if (!fs.existsSync(srcFile)) {
    console.error('Source file not found:', srcFile);
    continue;
  }

  ensureDir(destFile);
  let content = fs.readFileSync(srcFile, 'utf8');
  content = processContent(content, path.basename(srcFile));

  fs.writeFileSync(destFile, content, 'utf8');
  console.log(`Synced ${item.src} -> ${item.dest} (${fs.statSync(destFile).size} bytes)`);
}

console.log('All views and components synced successfully!');
