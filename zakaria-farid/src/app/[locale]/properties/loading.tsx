import React from 'react';

export default function CatalogLoading() {
  return (
    <div className="catalog-skeleton-view">
      <div className="container">
        
        {/* Top Header */}
        <div className="catalog-skeleton-header">
          <div className="skeleton-line skeleton-eyebrow" />
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-subtitle" />
        </div>

        {/* Filter Bar Skeleton */}
        <div className="catalog-skeleton-filter-bar">
          <div className="skeleton-filter-search" />
          <div className="skeleton-filter-pills">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-filter-pill" />
            ))}
          </div>
        </div>

        {/* Property Grid Skeleton */}
        <div className="catalog-skeleton-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-card-media" />
              <div className="skeleton-card-body">
                <div className="skeleton-line card-tag" />
                <div className="skeleton-line card-title" />
                <div className="skeleton-line card-specs" />
                <div className="skeleton-card-footer">
                  <div className="skeleton-line card-price" />
                  <div className="skeleton-line card-btn" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        .catalog-skeleton-view {
          padding-top: 155px;
          padding-bottom: 6rem;
          background: var(--bg-primary, #0A0C10);
          min-height: 100vh;
        }

        .catalog-skeleton-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          gap: 0.75rem;
          margin-bottom: 3rem;
        }

        .skeleton-line,
        .skeleton-filter-search,
        .skeleton-filter-pill,
        .skeleton-card-media,
        .skeleton-card {
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
        [data-theme="light"] .skeleton-filter-search,
        [data-theme="light"] .skeleton-filter-pill,
        [data-theme="light"] .skeleton-card-media,
        [data-theme="light"] .skeleton-card {
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

        .skeleton-eyebrow { width: 140px; height: 14px; }
        .skeleton-title { width: 380px; height: 48px; border-radius: 12px; }
        .skeleton-subtitle { width: 280px; height: 18px; }

        .catalog-skeleton-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2.5rem;
          padding: 1.25rem;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
        }

        [data-theme="light"] .catalog-skeleton-filter-bar {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.06);
        }

        .skeleton-filter-search { width: 280px; height: 42px; border-radius: 12px; }
        .skeleton-filter-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .skeleton-filter-pill { width: 110px; height: 38px; border-radius: 9999px; }

        .catalog-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .skeleton-card {
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
        }

        [data-theme="light"] .skeleton-card {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.06);
        }

        .skeleton-card-media {
          width: 100%;
          height: 240px;
          border-radius: 0;
        }

        .skeleton-card-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .card-tag { width: 45%; height: 14px; }
        .card-title { width: 85%; height: 24px; border-radius: 6px; }
        .card-specs { width: 70%; height: 16px; }

        .skeleton-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .skeleton-card-footer {
          border-top-color: rgba(0, 0, 0, 0.06);
        }

        .card-price { width: 120px; height: 26px; }
        .card-btn { width: 38px; height: 38px; border-radius: 50%; }

        @media (max-width: 1024px) {
          .catalog-skeleton-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .catalog-skeleton-grid {
            grid-template-columns: 1fr;
          }
          .skeleton-title {
            width: 90%;
          }
        }
      `}</style>
    </div>
  );
}
