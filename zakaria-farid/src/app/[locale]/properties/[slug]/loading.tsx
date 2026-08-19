import React from 'react';

export default function PropertyDetailLoading() {
  return (
    <div className="property-skeleton-view">
      <div className="container">
        
        {/* 1. Header Skeleton */}
        <div className="skeleton-header">
          <div className="skeleton-meta-row">
            <div className="skeleton-pill skeleton-breadcrumbs" />
            <div className="skeleton-badges-group">
              <div className="skeleton-pill skeleton-badge-sm" />
              <div className="skeleton-pill skeleton-badge-md" />
            </div>
          </div>

          <div className="skeleton-hero-row">
            <div className="skeleton-title-col">
              <div className="skeleton-line skeleton-title-line" />
              <div className="skeleton-line skeleton-location-line" />
            </div>
            <div className="skeleton-price-col">
              <div className="skeleton-line skeleton-price-label" />
              <div className="skeleton-line skeleton-price-value" />
              <div className="skeleton-line skeleton-price-note" />
            </div>
          </div>
        </div>

        {/* 2. Key Specs Pills Bar Skeleton */}
        <div className="skeleton-pills-bar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-pill skeleton-spec-pill" style={{ width: `${90 + (i % 3) * 25}px` }} />
          ))}
        </div>

        {/* 3. Hero Media Gallery Skeleton */}
        <div className="skeleton-gallery-frame">
          <div className="skeleton-ambient-glow" />
          <div className="skeleton-gallery-shimmer" />
        </div>

        {/* 4. Content Grid Skeleton */}
        <div className="skeleton-content-grid">
          <div className="skeleton-main-col">
            <div className="skeleton-section-card">
              <div className="skeleton-line skeleton-section-eyebrow" />
              <div className="skeleton-line skeleton-section-title" />
              <div className="skeleton-paragraph">
                <div className="skeleton-line line-full" />
                <div className="skeleton-line line-90" />
                <div className="skeleton-line line-75" />
              </div>
            </div>

            <div className="skeleton-section-card">
              <div className="skeleton-line skeleton-section-eyebrow" />
              <div className="skeleton-line skeleton-section-title" />
              <div className="skeleton-blueprint-grid">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton-blueprint-card" />
                ))}
              </div>
            </div>
          </div>

          <div className="skeleton-sidebar-col">
            <div className="skeleton-broker-card">
              <div className="skeleton-avatar" />
              <div className="skeleton-line skeleton-broker-name" />
              <div className="skeleton-line skeleton-broker-role" />
              <div className="skeleton-btn skeleton-btn-gold" />
              <div className="skeleton-btn skeleton-btn-dark" />
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .property-skeleton-view {
          padding-top: 155px;
          padding-bottom: 6rem;
          background: var(--bg-primary, #0A0C10);
          min-height: 100vh;
        }

        .skeleton-header {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.75rem;
          padding-bottom: 1.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .skeleton-header {
          border-bottom-color: rgba(0, 0, 0, 0.08);
        }

        .skeleton-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .skeleton-badges-group {
          display: flex;
          gap: 8px;
        }

        .skeleton-hero-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 2.5rem;
        }

        .skeleton-title-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .skeleton-price-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        /* Shimmer Animation Base */
        .skeleton-line,
        .skeleton-pill,
        .skeleton-gallery-shimmer,
        .skeleton-blueprint-card,
        .skeleton-avatar,
        .skeleton-btn {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.09) 50%,
            rgba(255, 255, 255, 0.04) 100%
          );
          background-size: 200% 100%;
          animation: luxuryShimmer 2s infinite ease-in-out;
          border-radius: 8px;
        }

        [data-theme="light"] .skeleton-line,
        [data-theme="light"] .skeleton-pill,
        [data-theme="light"] .skeleton-gallery-shimmer,
        [data-theme="light"] .skeleton-blueprint-card,
        [data-theme="light"] .skeleton-avatar,
        [data-theme="light"] .skeleton-btn {
          background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.04) 0%,
            rgba(0, 0, 0, 0.08) 50%,
            rgba(0, 0, 0, 0.04) 100%
          );
          background-size: 200% 100%;
        }

        @keyframes luxuryShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .skeleton-pill {
          border-radius: 9999px;
          height: 32px;
        }

        .skeleton-breadcrumbs { width: 220px; height: 24px; }
        .skeleton-badge-sm { width: 90px; height: 26px; }
        .skeleton-badge-md { width: 180px; height: 26px; }

        .skeleton-title-line { width: 65%; height: 44px; border-radius: 12px; }
        .skeleton-location-line { width: 35%; height: 20px; }

        .skeleton-price-label { width: 120px; height: 14px; }
        .skeleton-price-value { width: 180px; height: 38px; border-radius: 10px; }
        .skeleton-price-note { width: 150px; height: 14px; }

        .skeleton-pills-bar {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }

        .skeleton-spec-pill {
          height: 36px;
        }

        .skeleton-gallery-frame {
          position: relative;
          width: 100%;
          height: 520px;
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        [data-theme="light"] .skeleton-gallery-frame {
          border-color: rgba(0, 0, 0, 0.08);
        }

        .skeleton-ambient-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(221, 167, 82, 0.08) 0%, transparent 70%);
        }

        .skeleton-gallery-shimmer {
          width: 100%;
          height: 100%;
        }

        .skeleton-content-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 2.5rem;
        }

        .skeleton-main-col {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .skeleton-section-card {
          padding: 2rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        [data-theme="light"] .skeleton-section-card {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.06);
        }

        .skeleton-section-eyebrow { width: 140px; height: 14px; }
        .skeleton-section-title { width: 260px; height: 28px; }

        .skeleton-paragraph {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .line-full { width: 100%; height: 18px; }
        .line-90 { width: 90%; height: 18px; }
        .line-75 { width: 75%; height: 18px; }

        .skeleton-blueprint-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .skeleton-blueprint-card {
          height: 160px;
          border-radius: 16px;
        }

        .skeleton-broker-card {
          padding: 2rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        [data-theme="light"] .skeleton-broker-card {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.06);
        }

        .skeleton-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
        }

        .skeleton-broker-name { width: 160px; height: 22px; }
        .skeleton-broker-role { width: 120px; height: 14px; }
        .skeleton-btn { width: 100%; height: 44px; border-radius: 9999px; }

        @media (max-width: 1024px) {
          .skeleton-content-grid {
            grid-template-columns: 1fr;
          }
          .skeleton-gallery-frame {
            height: 380px;
          }
        }

        @media (max-width: 768px) {
          .skeleton-hero-row {
            flex-direction: column;
            gap: 1.25rem;
          }
          .skeleton-price-col {
            align-items: flex-start;
          }
          .skeleton-gallery-frame {
            height: 280px;
          }
        }
      `}</style>
    </div>
  );
}
