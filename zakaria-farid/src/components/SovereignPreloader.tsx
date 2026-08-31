'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SovereignPreloaderProps {
  onComplete: () => void;
  isDarkMode?: boolean;
}

export const SovereignPreloader: React.FC<SovereignPreloaderProps> = ({ onComplete, isDarkMode = true }) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Smooth, calibrated progress simulation
    const startTime = Date.now();
    const duration = 2100; // ~2.1 seconds for maximum cinematic elegance without sluggish delay

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      // Ease-out cubic calculation for smooth progress acceleration
      const easedProgress = Math.round((1 - Math.pow(1 - rawProgress, 2.5)) * 100);
      setProgress(easedProgress);

      if (rawProgress >= 1) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFinished(true);
          setTimeout(onComplete, 750); // allow exit animation to complete
        }, 250);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          className="sovereign-preloader-root"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            transition: { duration: 0.65, ease: [0.76, 0, 0.24, 1] }
          }}
          onClick={() => {
            setIsFinished(true);
            setTimeout(onComplete, 300);
          }}
        >
          {/* Ambient Background Glow Halo */}
          <div className="preloader-ambient-glow" />

          {/* Centerpiece Crest & Monogram */}
          <div className="preloader-content-wrap">
            <motion.div
              className="crest-monogram-container"
              initial={{ scale: 0.88, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Sovereign Gold Crest SVG */}
              <svg
                className="sovereign-crest-svg"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Linear & Radial Gold Gradients */}
                  <linearGradient id="goldLinear" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF2D6" />
                    <stop offset="35%" stopColor="#DDA752" />
                    <stop offset="70%" stopColor="#B37D28" />
                    <stop offset="100%" stopColor="#F5D79A" />
                  </linearGradient>
                  <linearGradient id="goldStroke" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFF6DF" />
                    <stop offset="50%" stopColor="#DDA752" />
                    <stop offset="100%" stopColor="#96651E" />
                  </linearGradient>
                  <radialGradient id="crestGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#DDA752" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#DDA752" stopOpacity="0" />
                  </radialGradient>
                  <filter id="goldShine" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Ambient Center Aura */}
                <circle cx="100" cy="100" r="70" fill="url(#crestGlow)" />

                {/* Outer Architectural Octagonal Crest Frame */}
                <motion.polygon
                  points="100,16 164,42 188,100 164,158 100,184 36,158 12,100 36,42"
                  stroke="url(#goldStroke)"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Inner Concentric Diamond Shield */}
                <motion.polygon
                  points="100,28 152,100 100,172 48,100"
                  stroke="url(#goldLinear)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  fill="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                />

                {/* Royal Sovereign Diadem / Crown on Top */}
                <motion.path
                  d="M80,50 L86,40 L100,48 L114,40 L120,50 Z"
                  stroke="url(#goldStroke)"
                  strokeWidth="1.5"
                  fill="url(#goldLinear)"
                  fillOpacity="0.15"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.9, delay: 0.4 }}
                />
                <circle cx="86" cy="38" r="1.5" fill="#FFF2D6" />
                <circle cx="100" cy="46" r="2" fill="#FFF2D6" />
                <circle cx="114" cy="38" r="1.5" fill="#FFF2D6" />

                {/* Monogram: Intertwined 'A' and 'Z' (AL ZAKARIA) */}
                {/* Letter 'A' Spires */}
                <motion.path
                  d="M100,60 L68,135 M100,60 L132,135"
                  stroke="url(#goldStroke)"
                  strokeWidth="3.25"
                  strokeLinecap="round"
                  filter="url(#goldShine)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* Letter 'A' Crossbar */}
                <motion.path
                  d="M78,108 L122,108"
                  stroke="url(#goldLinear)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.0, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Letter 'Z' Intertwined */}
                <motion.path
                  d="M68,76 L132,76 L68,126 L132,126"
                  stroke="url(#goldLinear)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.3, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Four Cardinal Jewel Nodes */}
                <circle cx="100" cy="16" r="2.5" fill="#FFF4DC" />
                <circle cx="188" cy="100" r="2.5" fill="#FFF4DC" />
                <circle cx="100" cy="184" r="2.5" fill="#FFF4DC" />
                <circle cx="12" cy="100" r="2.5" fill="#FFF4DC" />
              </svg>
            </motion.div>

            {/* Sovereign Brand Typography */}
            <motion.div
              className="preloader-typography"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <h1 className="preloader-brand-title">AL ZAKARIA</h1>
              <p className="preloader-brand-subtitle">SOVEREIGN REAL ESTATE & ADVISORY</p>
            </motion.div>

            {/* Precision Loading Gauge */}
            <div className="preloader-progress-wrap">
              <div className="preloader-track">
                <motion.div
                  className="preloader-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="preloader-progress-meta">
                <span className="preloader-status-label">LOADING PROPERTIES</span>
                <span className="preloader-counter">{String(progress).padStart(2, '0')}%</span>
              </div>
            </div>
          </div>

          {/* Quick Skip Hint */}
          <div className="preloader-skip-hint">
            <span>Tap anywhere to enter immediately</span>
          </div>

          <style>{`
            .sovereign-preloader-root {
              position: fixed;
              inset: 0;
              z-index: 100000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              user-select: none;
              cursor: pointer;
              transition: background 0.4s ease;
            }

            [data-theme="dark"] .sovereign-preloader-root {
              background: #05070B;
              color: #FFFFFF;
            }

            [data-theme="light"] .sovereign-preloader-root {
              background: #FAF8F5;
              color: #0F172A;
            }

            .preloader-ambient-glow {
              position: absolute;
              width: 520px;
              height: 520px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(221, 167, 82, 0.16) 0%, rgba(221, 167, 82, 0.04) 50%, transparent 75%);
              filter: blur(50px);
              pointer-events: none;
              animation: preloaderHaloPulse 4s infinite ease-in-out;
            }

            @keyframes preloaderHaloPulse {
              0%, 100% {
                transform: scale(0.95);
                opacity: 0.7;
              }
              50% {
                transform: scale(1.15);
                opacity: 1;
              }
            }

            .preloader-content-wrap {
              position: relative;
              z-index: 2;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              max-width: 90vw;
              width: 440px;
            }

            .crest-monogram-container {
              width: 140px;
              height: 140px;
              margin-bottom: 1.75rem;
              position: relative;
              filter: drop-shadow(0 12px 28px rgba(221, 167, 82, 0.25));
            }

            .sovereign-crest-svg {
              width: 100%;
              height: 100%;
              overflow: visible;
            }

            .preloader-brand-title {
              font-family: Georgia, 'Cinzel', 'Playfair Display', serif;
              font-size: 1.5rem;
              font-weight: 700;
              letter-spacing: 0.22em;
              margin: 0 0 0.4rem 0;
              background: linear-gradient(135deg, #FFFDF5 0%, #FEE8A0 25%, #E5B869 60%, #B8934A 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              text-transform: uppercase;
            }

            [data-theme="light"] .preloader-brand-title {
              background: linear-gradient(135deg, #A87A28 0%, #8C6826 60%, #684812 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }

            .preloader-brand-subtitle {
              font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
              font-size: 0.625rem;
              font-weight: 700;
              letter-spacing: 0.32em;
              color: #E5B869;
              text-transform: uppercase;
              margin: 0 0 2.25rem 0;
              opacity: 0.9;
            }

            .preloader-progress-wrap {
              width: 100%;
              max-width: 280px;
              display: flex;
              flex-direction: column;
              gap: 0.6rem;
            }

            .preloader-track {
              width: 100%;
              height: 2px;
              border-radius: 9999px;
              overflow: hidden;
              position: relative;
            }

            [data-theme="dark"] .preloader-track {
              background: rgba(255, 255, 255, 0.10);
            }

            [data-theme="light"] .preloader-track {
              background: rgba(0, 0, 0, 0.08);
            }

            .preloader-fill {
              height: 100%;
              background: linear-gradient(90deg, #DDA752 0%, #FFF2D6 50%, #DDA752 100%);
              box-shadow: 0 0 12px rgba(221, 167, 82, 0.8);
              border-radius: 9999px;
              transition: width 0.06s linear;
            }

            .preloader-progress-meta {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
              font-size: 0.6875rem;
              font-weight: 700;
              letter-spacing: 0.12em;
            }

            .preloader-status-label {
              color: var(--text-muted, #7E8B9B);
              text-transform: uppercase;
            }

            .preloader-counter {
              color: var(--gold-primary, #DDA752);
              font-variant-numeric: tabular-nums;
            }

            [data-theme="light"] .preloader-counter {
              color: #B8860B;
            }

            .preloader-skip-hint {
              position: absolute;
              bottom: 2rem;
              font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
              font-size: 0.6875rem;
              letter-spacing: 0.1em;
              color: var(--text-muted, #7E8B9B);
              opacity: 0.45;
              text-transform: uppercase;
              transition: opacity 0.2s ease;
            }

            .sovereign-preloader-root:hover .preloader-skip-hint {
              opacity: 0.85;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
