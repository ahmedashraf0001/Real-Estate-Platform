'use client';
import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

export const STATS_ITEMS = [
  {
    numericValue: 2500,
    suffix: '+',
    formatComma: true,
    title: 'Curated Architectural Estates',
    desc: 'Hand-audited for structural integrity and timeless design.'
  },
  {
    numericValue: 15,
    suffix: '+',
    formatComma: false,
    title: 'Sovereign Destinations',
    desc: 'From Gouna Red Sea lagoons to Golden Square New Cairo.'
  },
  {
    numericValue: 98,
    suffix: '%',
    formatComma: false,
    title: 'Client Retention & Trust',
    desc: 'Generational advisory for high-net-worth sovereign collectors.'
  },
  {
    numericValue: 10,
    suffix: '+ Years',
    formatComma: false,
    title: 'Ultra-Prime Authority',
    desc: 'Pioneering design-led luxury real estate advisory since 2016.'
  }
];

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

export const StatsSection: React.FC = () => {
  return (
    <section className="stats-section">
      {/* Seamless Pure Atmospheric Radial Glow (No Lines) */}
      <div className="stats-horizon-ambient" aria-hidden="true" />

      {/* Stat Cards Grid */}
      <div className="container stats-container">
        <div className="stats-grid">
          {STATS_ITEMS.map((stat, idx) => (
            <motion.div
              key={idx}
              className="stat-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="stat-value-wrap">
                <RollingNumber
                  target={stat.numericValue}
                  suffix={stat.suffix}
                  formatComma={stat.formatComma}
                />
              </div>

              <h3 className="stat-title">{stat.title}</h3>
              <p className="stat-desc">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .stats-section {
          background: var(--bg-primary);
          padding: 3.5rem 0;
          position: relative;
          z-index: 2;
          overflow: hidden;
          transition: background var(--transition-smooth);
        }

        /* Seamless Ambient Glow */
        .stats-horizon-ambient {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 85%;
          max-width: 1050px;
          height: 320px;
          background: radial-gradient(
            ellipse 65% 55% at 50% 50%,
            rgba(221, 167, 82, 0.09) 0%,
            rgba(221, 167, 82, 0.025) 45%,
            transparent 75%
          );
          pointer-events: none;
          filter: blur(50px);
          z-index: 1;
        }

        /* Container & Cards */
        .stats-container {
          position: relative;
          z-index: 2;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .stat-card {
          position: relative;
          background: var(--bg-glass-card);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border: 1px solid var(--border-glass);
          border-radius: 20px;
          padding: 2.25rem 1.65rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: var(--shadow-glass);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-theme="dark"] .stat-card {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.35),
            inset 0 1.5px 1.5px rgba(255, 255, 255, 0.45),
            inset 0 -1px 1px rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .stat-card {
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.07),
            0 2px 8px rgba(0, 0, 0, 0.03),
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(0, 0, 0, 0.03);
        }

        .stat-card:hover {
          border-color: var(--gold-primary);
          transform: translateY(-4px);
        }

        [data-theme="dark"] .stat-card:hover {
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 
            0 24px 50px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(221, 167, 82, 0.25),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65);
        }

        [data-theme="light"] .stat-card:hover {
          background: rgba(255, 255, 255, 0.94);
          border-color: var(--gold-primary);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.10),
            0 0 20px rgba(184, 133, 48, 0.18),
            inset 0 1.5px 2px #FFFFFF;
        }

        .stat-value-wrap {
          font-family: var(--font-heading);
          font-size: clamp(2.2rem, 3.2vw, 2.85rem);
          font-weight: 800;
          color: var(--gold-primary);
          line-height: 1.1;
          margin-bottom: 0.25rem;
        }

        [data-theme="dark"] .stat-value-wrap {
          text-shadow: 
            0 0 20px rgba(221, 167, 82, 0.4),
            0 2px 4px rgba(0, 0, 0, 0.85);
        }

        .stat-rolling-number {
          display: inline-block;
          font-variant-numeric: tabular-nums;
        }

        .stat-title {
          font-family: var(--font-heading);
          font-size: 1.0625rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        [data-theme="dark"] .stat-title {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        .stat-desc {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.55;
          max-width: 230px;
          margin: 0 auto;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .stats-section {
            padding: 3.5rem 0 4rem;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .stat-card {
            padding: 1.85rem 1.35rem;
          }
        }
      `}</style>
    </section>
  );
};
