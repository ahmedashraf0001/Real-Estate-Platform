const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('c:/Users/lyr1csan/Documents/project/Real-Estate-Platform/zakaria-farid/src/components/property/PropertyDetailView.tsx');

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add import
if (!content.includes('ArchitecturalBlueprintInspector')) {
  content = content.replace(
    "import { PropertyCard } from './PropertyCard';",
    "import { PropertyCard } from './PropertyCard';\nimport ArchitecturalBlueprintInspector from './ArchitecturalBlueprintInspector';"
  );
}

// 2. Add icons: Building, Eye, Hammer, TrendingUp
content = content.replace(
  "  RefreshCw, \n  Clock\n} from 'lucide-react';",
  "  RefreshCw, \n  Clock,\n  Building,\n  Eye,\n  Hammer,\n  TrendingUp\n} from 'lucide-react';"
);

// 3. Add floorText, viewText, finishingText, pricePerSqm inside component
const compInitTarget = `  const [activeImageIndex, setActiveImageIndex] = useState(0);`;

const newCalculations = `  // Curated Architectural Specifications & Highlights
  const floorText = useMemo(() => {
    if (rawProperty.floor_number !== null && rawProperty.floor_number !== undefined && String(rawProperty.floor_number).trim() !== '') {
      const fn = Number(rawProperty.floor_number);
      if (fn === 0) return isAr ? 'الطابق الأرضي + حديقة خاصة' : 'Ground Level + Private Garden';
      return isAr ? \`الطابق \${fn}\` : \`Floor Level \${fn}\`;
    }
    if (rawProperty.type === 'villa') return isAr ? 'فيلا مستقلة (أرضي + أول + روف)' : 'Standalone Villa (G + 1 + Roof)';
    if (rawProperty.type === 'townhouse') return isAr ? 'تاون هاوس (أرضي + أول + روف)' : 'Townhouse (G + 1 + Roof)';
    if (rawProperty.type === 'duplex') return isAr ? 'دوبلكس طابقين' : 'Two-Level Duplex Residence';
    if (rawProperty.type === 'chalet') return isAr ? 'شاليه ساحلي مباشر' : 'Direct Coastal Chalet';
    return isAr ? 'طابق سكني فاخر' : 'Luxury Residence Level';
  }, [rawProperty.floor_number, rawProperty.type, isAr]);

  const viewText = rawProperty.view 
    ? rawProperty.view 
    : isAr ? 'إطلالة معمارية مفتوحة على المساحات الخضراء' : 'Open Panoramic Architectural Vista';

  const finishingText = useMemo(() => {
    if (rawProperty.finishing === 'fully_finished' || rawProperty.completion_status === 'ready') {
      return isAr ? 'تشطيب فاخر بالكامل (الترا سوبر لوكس)' : 'Ultra-Luxury Turnkey Ready';
    }
    if (rawProperty.finishing === 'semi_finished') {
      return isAr ? 'نصف تشطيب (محارة وتمديدات)' : 'Semi-Finished (Plaster & Utilities)';
    }
    if (rawProperty.finishing === 'red_brick' || rawProperty.completion_status === 'off_plan') {
      return isAr ? 'طوب أحمر (على الهيكل الخرساني)' : 'Core & Shell (Red Brick Canvas)';
    }
    return isAr ? 'تشطيب فاخر معتمد' : 'Verified Turnkey Finishing';
  }, [rawProperty.finishing, rawProperty.completion_status, isAr]);

  const pricePerSqm = property.sqm && property.sqm > 0 
    ? Math.round(property.price / property.sqm).toLocaleString() 
    : null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);`;

content = content.replace(compInitTarget, newCalculations);

// 4. Add Architectural Highlights Strip right above the detail-layout
const detailLayoutTarget = `        {/* 5. Main Detail Grid: Left Body + Sticky Right Advisory Desk */}
        <div className="detail-layout">`;

const newHighlightsAndLayout = `        {/* 4. Architectural Highlights Key Metric Strip */}
        <div className="architectural-highlights-strip">
          <div className="highlight-glass-card">
            <div className="highlight-icon-slot">
              <Building size={16} className="highlight-icon" />
            </div>
            <div className="highlight-meta">
              <span className="highlight-label">{isAr ? 'التكوين والرقي' : 'LEVEL & VERTICALITY'}</span>
              <span className="highlight-value">{floorText}</span>
            </div>
          </div>

          <div className="highlight-glass-card">
            <div className="highlight-icon-slot">
              <Eye size={16} className="highlight-icon" />
            </div>
            <div className="highlight-meta">
              <span className="highlight-label">{isAr ? 'الإطلالة والواجهة' : 'EXPOSURE & VISTA'}</span>
              <span className="highlight-value">{viewText}</span>
            </div>
          </div>

          <div className="highlight-glass-card">
            <div className="highlight-icon-slot">
              <Hammer size={16} className="highlight-icon" />
            </div>
            <div className="highlight-meta">
              <span className="highlight-label">{isAr ? 'مستوى التشطيب' : 'FINISHING STANDARD'}</span>
              <span className="highlight-value">{finishingText}</span>
            </div>
          </div>

          {pricePerSqm && (
            <div className="highlight-glass-card">
              <div className="highlight-icon-slot">
                <TrendingUp size={16} className="highlight-icon" />
              </div>
              <div className="highlight-meta">
                <span className="highlight-label">{isAr ? 'معدل التقييم / م²' : 'RATE PER SQM'}</span>
                <span className="highlight-value gold-val">{pricePerSqm} {property.currency} / m²</span>
              </div>
            </div>
          )}
        </div>

        {/* 5. Main Detail Grid: Left Body + Sticky Right Advisory Desk */}
        <div className="detail-layout">`;

content = content.replace(detailLayoutTarget, newHighlightsAndLayout);

// 5. Add ArchitecturalBlueprintInspector after spec-matrix-grid
const specMatrixTarget = `              <div className="spec-matrix-grid">
                {specCategories.map((cat: any, idx: number) => (
                  <div key={idx} className="spec-matrix-card">
                    <h4 className="spec-matrix-header">{cat.category}</h4>
                    <ul className="spec-matrix-list">
                      {cat.items.map((item: string, i: number) => (
                        <li key={i} className="spec-matrix-item">
                          <CheckCircle size={14} className="spec-check-gold" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>`;

const newSpecAndBlueprint = `              <div className="spec-matrix-grid">
                {specCategories.map((cat: any, idx: number) => (
                  <div key={idx} className="spec-matrix-card">
                    <h4 className="spec-matrix-header">{cat.category}</h4>
                    <ul className="spec-matrix-list">
                      {cat.items.map((item: string, i: number) => (
                        <li key={i} className="spec-matrix-item">
                          <CheckCircle size={14} className="spec-check-gold" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* C. Bespoke Architectural Blueprint & Zone Engineering Inspector */}
            <ArchitecturalBlueprintInspector 
              zones={rawProperty.spec_layers || []} 
              propertyTitle={property.title} 
              locale={locale} 
              propertyType={rawProperty.type} 
              propertyImages={property.images} 
            />`;

content = content.replace(specMatrixTarget, newSpecAndBlueprint);

// 6. Add CSS for architectural-highlights-strip
const cssTarget = `        /* 5. Main Content Detail Layout */`;

const newCss = `        /* 4. Architectural Highlights Key Metric Strip */
        .architectural-highlights-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }

        .highlight-glass-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          background: rgba(22, 28, 42, 0.45);
          border: 1px solid var(--border-subtle);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .highlight-glass-card {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: var(--shadow-sm);
        }

        .highlight-glass-card:hover {
          border-color: var(--gold-border);
          transform: translateY(-2px);
        }

        .highlight-icon-slot {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .highlight-icon {
          color: var(--gold-primary);
        }

        .highlight-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .highlight-label {
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .highlight-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .highlight-value.gold-val {
          color: var(--gold-primary);
        }

        /* 5. Main Content Detail Layout */`;

content = content.replace(cssTarget, newCss);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully integrated ArchitecturalBlueprintInspector into PropertyDetailView.tsx');
