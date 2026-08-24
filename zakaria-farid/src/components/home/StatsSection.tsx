'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

export const getStatsItems = (isAr: boolean) => [
  {
    roman: 'I',
    numericValue: 2500,
    suffix: '+',
    formatComma: true,
    title: isAr ? 'عقار فاخر مدرج' : 'Properties Listed',
    desc: isAr ? 'عقارات منتقاة ومحققة معمارياً' : 'Curated architectural estates'
  },
  {
    roman: 'II',
    numericValue: 15,
    suffix: '+',
    formatComma: false,
    title: isAr ? 'موقع استراتيجي' : 'Prime Locations',
    desc: isAr ? 'من الجونة والساحل إلى القاهرة' : 'Cairo, Sahel & Red Sea'
  },
  {
    roman: 'III',
    numericValue: 98,
    suffix: '%',
    formatComma: false,
    title: isAr ? 'نسبة ثقة ورضا العملاء' : 'Client Retention & Trust',
    desc: isAr ? 'استشارات خاصة للمكاتب العائلية' : 'Family office & wealth advisory'
  },
  {
    roman: 'IV',
    numericValue: 10,
    suffix: isAr ? '+ سنوات' : '+ Years',
    formatComma: false,
    title: isAr ? 'سنوات من الخبرة' : 'Years of Excellence',
    desc: isAr ? 'سجل استشاري راسخ منذ ٢٠١٦' : 'Advisory heritage est. 2016'
  }
];

export const STATS_ITEMS = getStatsItems(false);

interface StatsSectionProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  locale?: string;
  className?: string;
  hideHeader?: boolean;
  compact?: boolean;
}

// Rolling Animated Number Component
const RollingNumber: React.FC<{ target: number; suffix?: string; formatComma?: boolean }> = ({
  target,
  suffix = '',
  formatComma = false
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const duration = 2000; // 2.0s luxury easeOutExpo

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.floor(easeProgress * target);
      setCount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isInView, target]);

  const formatted = formatComma ? count.toLocaleString() : count.toString();

  return (
    <span ref={ref} className="stat-rolling-number">
      {formatted}{suffix}
    </span>
  );
};

export const StatsSection: React.FC<StatsSectionProps> = ({
  eyebrow,
  title,
  subtitle,
  locale = 'en',
  className = '',
  hideHeader = false,
  compact = false
}) => {
  const isAr = locale === 'ar';

  const defaultEyebrow = isAr ? 'سجل الأداء المعماري' : 'VERIFIED METROLOGY';
  const defaultTitle = isAr ? 'سجل استشاري راسخ وموثوق' : 'Proven Track Record & Advisory Scale';
  const defaultSubtitle = isAr
    ? 'أرقام تعكس ريادتنا في سوق العقارات الفاخرة وتجسد ثقة عملائنا في مصر والشرق الأوسط.'
    : 'Setting the benchmark in Egyptian luxury real estate with audited quality, exclusive representation, and high client retention.';

  const displayEyebrow = eyebrow !== undefined ? eyebrow : defaultEyebrow;
  const displayTitle = title !== undefined ? title : defaultTitle;
  const displaySubtitle = subtitle !== undefined ? subtitle : defaultSubtitle;

  const items = getStatsItems(isAr);

  return (
    <section className={`stats-metrology-section ${compact || hideHeader ? 'compact' : ''} ${className}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="container">
        {!hideHeader && !compact && (displayEyebrow || displayTitle || displaySubtitle) && (
          <motion.div 
            className="stats-header-wrap"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {displayEyebrow && <span className="stats-eyebrow">{displayEyebrow}</span>}
            {displayTitle && <h2 className="stats-main-title">{displayTitle}</h2>}
            {displaySubtitle && <p className="stats-subtext">{displaySubtitle}</p>}
          </motion.div>
        )}

        {/* Haute Parisian Metrology Ribbon */}
        <div className="metrology-ribbon-grid">
          {items.map((stat, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <div className="metrology-sep" />}
              <motion.div
                className="metrology-cell"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="metrology-roman">{stat.roman}</span>
                <div className="metrology-num">
                  <RollingNumber
                    target={stat.numericValue}
                    suffix={stat.suffix}
                    formatComma={stat.formatComma}
                  />
                </div>
                <h3 className="metrology-lbl">{stat.title}</h3>
                <p className="metrology-desc">{stat.desc}</p>
              </motion.div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <style>{`
        .stats-metrology-section {
          background: #0E1017;
          border-top: 1px solid rgba(184, 147, 74, 0.25);
          border-bottom: 1px solid rgba(184, 147, 74, 0.25);
          padding: 2.75rem 0;
          position: relative;
          z-index: 2;
          transition: background var(--transition-smooth);
        }

        [data-theme="light"] .stats-metrology-section {
          background: #F7F4EE;
          border-top: 1px solid rgba(184, 147, 74, 0.25);
          border-bottom: 1px solid rgba(184, 147, 74, 0.25);
          box-shadow: none;
        }

        .stats-metrology-section.compact {
          padding: 2.25rem 0;
        }

        .stats-header-wrap {
          text-align: center;
          margin-bottom: 2.5rem;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
        }

        .stats-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 999px;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #E5B869;
          background: rgba(229, 184, 105, 0.08);
          border: 1px solid rgba(229, 184, 105, 0.25);
          text-transform: uppercase;
          margin-bottom: 0.85rem;
        }

        [data-theme="light"] .stats-eyebrow {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.08);
          border-color: rgba(140, 104, 38, 0.22);
        }

        .stats-main-title {
          font-family: var(--font-heading);
          font-size: clamp(1.85rem, 3vw, 2.35rem);
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 0 0 0.65rem 0;
        }

        .stats-subtext {
          font-size: 0.95rem;
          color: var(--text-secondary, #94A3B8);
          line-height: 1.6;
          margin: 0;
        }

        [data-theme="light"] .stats-subtext {
          color: #475569;
        }

        /* Ribbon Flex Grid */
        .metrology-ribbon-grid {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
        }

        .metrology-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 140px;
        }

        .metrology-roman {
          font-family: Georgia, serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: #B8934A;
          letter-spacing: 0.15em;
        }

        [data-theme="light"] .metrology-roman {
          color: #8C6826;
        }

        .metrology-num {
          font-family: var(--font-heading);
          font-size: clamp(1.85rem, 2.8vw, 2.5rem);
          font-weight: 800;
          color: #E5B869;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        [data-theme="light"] .metrology-num {
          color: #8C6826;
        }

        .stat-rolling-number {
          display: inline-block;
          font-variant-numeric: tabular-nums;
        }

        .metrology-lbl {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: 0.02em;
          margin: 4px 0 2px 0;
        }

        [data-theme="light"] .metrology-lbl {
          color: #141210;
        }

        .metrology-desc {
          font-size: 0.75rem;
          color: var(--text-secondary, #94A3B8);
          line-height: 1.45;
          margin: 0;
        }

        [data-theme="light"] .metrology-desc {
          color: #64748B;
        }

        .metrology-sep {
          width: 1px;
          height: 52px;
          background: rgba(184, 147, 74, 0.25);
          flex-shrink: 0;
        }

        [data-theme="light"] .metrology-sep {
          background: rgba(140, 104, 38, 0.2);
        }

        @media (max-width: 900px) {
          .metrology-ribbon-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
          }
          .metrology-sep {
            display: none;
          }
        }

        @media (max-width: 500px) {
          .stats-metrology-section {
            padding: 2.5rem 0;
          }
          .stats-header-wrap {
            margin-bottom: 1.75rem;
          }
          .stats-main-title {
            font-size: 1.65rem;
          }
          .stats-subtext {
            font-size: 0.875rem;
          }
          .metrology-ribbon-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
          .metrology-cell {
            min-width: 0;
            padding: 1rem 0.85rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(221, 167, 82, 0.15);
            border-radius: 14px;
          }
          [data-theme="light"] .metrology-cell {
            background: rgba(255, 255, 255, 0.7);
            border-color: rgba(140, 104, 38, 0.15);
          }
          .metrology-num {
            font-size: 1.75rem;
          }
          .metrology-lbl {
            font-size: 0.75rem;
          }
          .metrology-desc {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </section>
  );
};
