'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ShieldCheck,
  Award,
  Compass,
  Scale,
  ChevronRight,
  ChevronLeft,
  Building2,
} from 'lucide-react';
import type { AboutPageContent, BilingualText } from '@/lib/siteContent/defaults';
import { miniMarkdown } from '@/lib/markdown/miniMarkdown';

interface AboutViewProps {
  locale: string;
  content: AboutPageContent;
  preview?: boolean;
  previewChapter?: number;
  block?: 'hero' | 'stats' | 'story' | 'charter' | 'founder' | 'portal';
  onNavigateToCatalog?: () => void;
  onOpenInquiry?: (subject?: string) => void;
}

export function AboutView({ locale, content: about, block, preview = false, previewChapter = 0, onNavigateToCatalog, onOpenInquiry }: AboutViewProps) {
  const isAr = locale === 'ar';
  const text = (value: BilingualText) => value[isAr ? 'ar' : 'en'];
  const [activeFolio, setActiveFolio] = useState<number>(0);
  const folios = about.chapters;
  const visible = (name: AboutViewProps['block'], enabled: boolean) => (!block || block === name) && enabled;

  return (
    <div className="atelier-about-page" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── 1. Parisian Architectural Masthead Hero ─── */}
      {visible('hero', about.showHero) && (
        <section className="atelier-hero-section">
          <div className="atelier-hero-bg">
            <img 
              src="/assets/hero-bg.webp" 
              alt={text(about.imageAlt)}
              className="atelier-hero-img"
            />
            <div className="atelier-hero-overlay" />
            <div className="atelier-hero-grid" />
          </div>

          <div className="container atelier-hero-container">
            <div className="atelier-hero-content">
              {/* Minimalist Parisian Coordinates Bar */}
              <motion.div
                className="atelier-coordinates-bar"
                initial={preview ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="coord-text">
                  {text(about.coordinates)}
                </span>
                <span className="coord-sep">•</span>
                <span className="coord-charter">
                  {isAr ? about.badgeAr : about.badgeEn}
                </span>
              </motion.div>

              {/* Monumental Headline */}
              <motion.h1 
                className="atelier-hero-title"
                initial={preview ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="title-lead-line">
                  {isAr ? about.heroTitle1Ar : about.heroTitle1En}
                </span>
                <span className="title-gold-serif">
                  {isAr ? about.heroTitle2Ar : about.heroTitle2En}
                </span>
              </motion.h1>

              {/* Editorial Manifesto */}
              <motion.div 
                className="atelier-manifesto-wrap"
                initial={preview ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="manifesto-hairline-rule" />
                <div className="manifesto-lead-text mini-markdown">{miniMarkdown(isAr ? about.manifestoAr : about.manifestoEn)}</div>
              </motion.div>

              {/* Haute Actions */}
              <motion.div 
                className="atelier-hero-actions"
                initial={preview ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <a
                  href={`/${locale}/properties`} onClick={onNavigateToCatalog ? event => { event.preventDefault(); onNavigateToCatalog(); } : undefined}
                  className="atelier-btn-primary"
                >
                  <span>{isAr ? about.heroCta1TextAr : about.heroCta1TextEn}</span>
                  <ArrowUpRight size={15} />
                </a>

                <a
                  href={`/${locale}/contact`} onClick={onOpenInquiry ? event => { event.preventDefault(); onOpenInquiry(isAr ? about.heroCta2TextAr : about.heroCta2TextEn); } : undefined}
                  className="atelier-btn-ghost"
                >
                  <Compass size={14} className="ghost-icon-bronze" />
                  <span>{isAr ? about.heroCta2TextAr : about.heroCta2TextEn}</span>
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 2. Integrated Metrology Ribbon (Authority & Scale) ─── */}
      {visible('stats', about.showMetrology) && (
        <section className="atelier-metrology-section">
          <div className="container">
            <div className="metrology-grid">
              {about.stats.filter(stat => text(stat.value).trim()).map((stat, index) => <div className="metrology-cell" key={index}>
                <span className="metrology-roman">{['I', 'II', 'III', 'IV'][index] || index + 1}</span>
                <span className="metrology-num">{text(stat.value)}</span>
                <span className="metrology-lbl">{text(stat.label)}</span>
              </div>)}
            </div>
          </div>
        </section>
      )}

      {/* ─── 3. The "Paravent" Foldable Architectural Folio (2016 → 2026) ─── */}
      {visible('story', about.showParavent) && (
        <section className="atelier-paravent-section">
          <div className="container">
            <div className="atelier-section-header">
              <span className="atelier-eyebrow">{isAr ? about.paraventEyebrowAr : about.paraventEyebrowEn}</span>
              <h2 className="atelier-title">{isAr ? about.paraventTitleAr : about.paraventTitleEn}</h2>
              <div className="atelier-subtext mini-markdown">{miniMarkdown(isAr ? about.paraventDescAr : about.paraventDescEn)}</div>
            </div>

            {/* Interactive 4-Panel Paravent Accordion */}
            <div className="paravent-deck-container">
              {folios.map((folio, idx) => {
                const isOpen = (preview ? previewChapter : activeFolio) === idx;
                return (
                  <div
                    key={idx}
                    className={`paravent-panel ${isOpen ? 'expanded' : 'collapsed'}`}
                    role="button" tabIndex={0} aria-expanded={isOpen}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveFolio(idx); } }}
                    onClick={() => setActiveFolio(idx)}
                  >
                    {/* Collapsed Spine Header */}
                    <div className="paravent-spine">
                      <div className="spine-top">
                        <span className="spine-roman">{['I', 'II', 'III', 'IV'][idx] || idx + 1}</span>
                        <span className="spine-year">{text(folio.year)}</span>
                      </div>
                      <span className="spine-tag">{text(folio.tag)}</span>
                      <div className="spine-indicator">
                        {isOpen ? <ChevronRight size={14} className="spine-arr active" /> : <ChevronLeft size={14} className="spine-arr" />}
                      </div>
                    </div>

                    {/* Expanded Content Body */}
                    {isOpen && (
                      <motion.div 
                        className="paravent-body"
                        initial={preview ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="paravent-content-inner">
                          <div className="paravent-body-top">
                            <div className="panel-chapter-stamp">
                              <span>{isAr ? `المحطة ${['I', 'II', 'III', 'IV'][idx] || idx + 1}` : `CHAPTER ${['I', 'II', 'III', 'IV'][idx] || idx + 1}`}</span>
                              <span>•</span>
                              <span>{text(folio.year)}</span>
                            </div>
                            <span className="panel-tag-badge">{text(folio.tag)}</span>
                          </div>

                          <h3 className="panel-headline">
                            {text(folio.title)}
                          </h3>

                          <div className="panel-subtitle mini-markdown">{miniMarkdown(text(folio.subtitle))}</div>

                          <div className="panel-narrative mini-markdown">{miniMarkdown(text(folio.narrative))}</div>

                          {/* Metrics Bar */}
                          <div className="panel-metrics-strip">
                            {folio.metrics.filter(metric => text(metric.value).trim()).map((m, i) => (
                              <div key={i} className="panel-metric-box">
                                <span className="metric-box-val">{text(m.value)}</span>
                                <span className="metric-box-lbl">{text(m.label)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {visible('charter', about.showCuration) && (
        <section className="atelier-curation-section">
          <div className="container">
            <div className="atelier-section-header">
              <span className="atelier-eyebrow">{isAr ? about.curationEyebrowAr : about.curationEyebrowEn}</span>
              <h2 className="atelier-title">{isAr ? about.curationTitleAr : about.curationTitleEn}</h2>
              <div className="atelier-subtext mini-markdown">{miniMarkdown(isAr ? about.curationDescAr : about.curationDescEn)}</div>
            </div>
            <div className="charter-stages">
              {about.stages.map((stage, index) => <div className="charter-stage" data-charter-stage={index} key={index}>
                <span className="charter-numeral" aria-hidden="true">{['I', 'II', 'III'][index] || index + 1}</span>
                <div className="charter-heading">
                  <h3>{text(stage.title)}</h3>
                  <div className="mini-markdown">{miniMarkdown(text(stage.description))}</div>
                </div>
                <div className="charter-column" data-charter-accept={index}>
                  <h4>{text(about.acceptLabel)}</h4>
                  <ul>{stage.accept.map((line, i) => <li key={i}><span aria-hidden="true">✓</span>{text(line)}</li>)}</ul>
                </div>
                <div className="charter-column" data-charter-reject={index}>
                  <h4>{text(about.rejectLabel)}</h4>
                  <ul>{stage.reject.map((line, i) => <li key={i}><span aria-hidden="true">×</span>{text(line)}</li>)}</ul>
                </div>
              </div>)}
            </div>
            <div className="charter-footer">
              <p>{text(about.reportPrompt)}</p>
              <a className="charter-report-link" href={`/${locale}/contact`}>{text(about.reportLink)}<ArrowUpRight size={16} /></a>
            </div>
          </div>
        </section>
      )}

      {/* ─── 5. Founder’s "Lettre d'Intention" (Eng. Farid Zakaria) ─── */}
      {visible('founder', about.showFounder) && (
        <section className="atelier-founder-section">
          <div className="container">
            <div className="founder-letter-card">
              <div className="founder-letter-watermark">“</div>

              <div className="founder-letter-content">
                <div className="founder-letter-top">
                  <span className="letter-eyebrow">
                    {isAr ? about.founderEyebrowAr : about.founderEyebrowEn}
                  </span>
                  <span className="letter-est">{text(about.founderEst)}</span>
                </div>

                <blockquote className="founder-quote-serif mini-markdown">{miniMarkdown(isAr ? about.founderQuoteAr : about.founderQuoteEn)}</blockquote>

                <div className="founder-letter-signoff">
                  <div className="signoff-meta">
                    <h4 className="signoff-name">
                      {isAr ? about.founderNameAr : about.founderNameEn}
                    </h4>
                    <p className="signoff-role">
                      {isAr ? about.founderTitleAr : about.founderTitleEn}
                    </p>
                  </div>

                  <div className="signoff-stamp">
                    <Award size={16} className="stamp-icon" />
                    <span>{isAr ? about.founderStampAr : about.founderStampEn}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 6. Confidential Acquisitions Office (Private Portal CTA) ─── */}
      {visible('portal', about.showPortal) && (
        <section className="atelier-portal-section">
          <div className="container">
            <div className="atelier-portal-card">
              <div className="portal-watermark-scale">
                <Scale size={260} strokeWidth={0.8} />
              </div>

              <div className="portal-inner-wrap">
                <div className="portal-tag-row">
                  <ShieldCheck size={15} className="portal-tag-icon" />
                  <span>{isAr ? about.portalEyebrowAr : about.portalEyebrowEn}</span>
                </div>

                <h2 className="portal-heading-text">
                  {isAr ? about.portalHeadingAr : about.portalHeadingEn}
                </h2>
                
                <div className="portal-paragraph-text mini-markdown">{miniMarkdown(isAr ? about.portalParagraphAr : about.portalParagraphEn)}</div>

                <div className="portal-actions-group">
                  <a
                    className="portal-btn-gold"
                    href={`/${locale}/contact`} onClick={onOpenInquiry ? event => { event.preventDefault(); onOpenInquiry(isAr ? about.portalCtaBtnAr : about.portalCtaBtnEn); } : undefined}
                  >
                    <span>{isAr ? about.portalCtaBtnAr : about.portalCtaBtnEn}</span>
                    <ArrowUpRight size={15} />
                  </a>

                  <a
                    className="portal-btn-outline"
                    href={`/${locale}/properties`} onClick={onNavigateToCatalog ? event => { event.preventDefault(); onNavigateToCatalog(); } : undefined}
                  >
                    <Building2 size={15} />
                    <span>{text(about.portalCatalog)}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <style>{`
        .atelier-about-page {
          background: var(--bg-primary, #F7F4EE);
          color: var(--text-primary, #141210);
          min-height: 100vh;
          overflow-x: hidden;
          transition: background var(--transition-smooth);
        }
        .atelier-about-page .mini-markdown { text-align: inherit; }
        .atelier-about-page .mini-markdown p { color: inherit; margin: 0; }
        .atelier-about-page .mini-markdown p + p { margin-top: 1em; }
        .atelier-about-page .mini-markdown :is(h2, h3, h4) { color: inherit; }

        /* ─── 1. Parisian Architectural Hero ─── */
        .atelier-hero-section {
          position: relative;
          min-height: 700px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 145px;
          padding-bottom: 5rem;
          overflow: hidden;
          background: #0B0C10;
        }

        [data-theme="light"] .atelier-hero-section {
          background: #F7F4EE;
        }

        .atelier-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .atelier-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.18;
          filter: grayscale(100%) contrast(120%);
        }

        [data-theme="light"] .atelier-hero-img {
          opacity: 0.08;
          filter: grayscale(80%) contrast(110%);
        }

        .atelier-hero-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(20, 18, 16, 0.4) 0%, rgba(11, 12, 16, 0.95) 75%);
        }

        [data-theme="light"] .atelier-hero-overlay {
          background: radial-gradient(circle at 50% 20%, rgba(247, 244, 238, 0.4) 0%, rgba(244, 241, 234, 0.92) 80%);
        }

        .atelier-hero-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(184, 147, 74, 0.06) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(184, 147, 74, 0.06) 1px, transparent 1px);
          background-size: 60px 60px;
          opacity: 0.7;
          pointer-events: none;
        }

        [data-theme="light"] .atelier-hero-grid {
          background-image: linear-gradient(rgba(140, 104, 38, 0.08) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(140, 104, 38, 0.08) 1px, transparent 1px);
          opacity: 0.45;
        }

        .atelier-hero-container {
          position: relative;
          z-index: 1;
        }

        .atelier-hero-content {
          max-width: 920px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .atelier-coordinates-bar {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 7px 18px;
          border-radius: 999px;
          background: var(--glass-strong);
          border: var(--glass-border);
          font-family: monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          color: #E5B869;
          margin-bottom: 2rem;
          backdrop-filter: var(--glass-blur);
          box-shadow: var(--shadow-glass);
          text-shadow: var(--glass-text-shadow);
        }

        [data-theme="light"] .atelier-coordinates-bar {
          background: var(--glass-strong);
          border: var(--glass-border);
          box-shadow: var(--shadow-glass);
          color: #8C6826;
        }

        .coord-sep {
          opacity: 0.4;
        }

        .coord-charter {
          font-weight: 700;
          color: #FFF0C2;
        }

        [data-theme="light"] .coord-charter {
          color: #141210;
        }

        .atelier-hero-title {
          font-family: var(--font-heading);
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.02em;
          margin: 0 0 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .title-lead-line {
          color: #FFFFFF;
        }

        [data-theme="light"] .title-lead-line {
          color: #141210;
        }

        .title-gold-serif {
          font-family: Georgia, var(--font-heading), serif;
          font-weight: 400;
          font-style: italic;
          background: linear-gradient(135deg, #FFF0C2 0%, #E5B869 50%, #B8934A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        [data-theme="light"] .title-gold-serif {
          background: linear-gradient(135deg, #8C6826 0%, #B8934A 50%, #684A12 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .atelier-manifesto-wrap {
          max-width: 760px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2.25rem;
        }

        .manifesto-hairline-rule {
          width: 50px;
          height: 1.5px;
          background: #B8934A;
          margin-bottom: 1.25rem;
        }

        .manifesto-lead-text {
          font-size: 1.05rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
          font-weight: 400;
        }

        [data-theme="light"] .manifesto-lead-text {
          color: #334155;
          font-weight: 500;
        }

        .atelier-hero-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .atelier-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: linear-gradient(135deg, #E5B869 0%, #B8934A 100%);
          color: #0B0C10;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 20px rgba(184, 147, 74, 0.35);
        }

        .atelier-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(184, 147, 74, 0.5);
        }

        .atelier-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 24px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: var(--bg-glass-card);
          color: #FFFFFF;
          border: var(--glass-border);
          cursor: pointer;
          backdrop-filter: var(--glass-blur-nav);
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-glass);
          text-shadow: var(--glass-text-shadow);
        }

        [data-theme="light"] .atelier-btn-ghost {
          background: var(--bg-glass-card);
          color: #141210;
          border: var(--glass-border);
          box-shadow: var(--shadow-glass);
        }

        .atelier-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #B8934A;
          color: #E5B869;
        }

        [data-theme="light"] .atelier-btn-ghost:hover {
          background: #FCFAF7;
          border-color: #B8934A;
          color: #8C6826;
        }

        .ghost-icon-bronze {
          color: #B8934A;
        }

        /* ─── 2. Metrology Ribbon ─── */
        .atelier-metrology-section {
          background: #0E1017;
          border-top: 1px solid rgba(184, 147, 74, 0.25);
          border-bottom: 1px solid rgba(184, 147, 74, 0.25);
          padding: 2.5rem 0;
        }

        [data-theme="light"] .atelier-metrology-section {
          background: #FFFFFF;
          border-top: 1px solid rgba(184, 147, 74, 0.3);
          border-bottom: 1px solid rgba(184, 147, 74, 0.3);
          box-shadow: 0 4px 20px rgba(30, 24, 16, 0.04);
        }

        .metrology-grid {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .metrology-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 160px;
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
          font-size: 2.25rem;
          font-weight: 800;
          color: #E5B869;
          line-height: 1;
        }

        [data-theme="light"] .metrology-num {
          color: #8C6826;
        }

        .metrology-lbl {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-secondary, #64748B);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        [data-theme="light"] .metrology-lbl {
          color: #475569;
        }

        .metrology-sep {
          width: 1px;
          height: 48px;
          background: rgba(184, 147, 74, 0.25);
        }

        @media (max-width: 768px) {
          .atelier-hero-section {
            padding-top: 96px;
            min-height: 0;
          }
          .atelier-hero-title {
            font-size: 2.25rem;
          }
          .metrology-sep {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .atelier-coordinates-bar {
            max-width: 100%;
            padding: 6px 14px;
            font-size: 0.72rem;
            justify-content: center;
            text-align: center;
            margin-bottom: 1.25rem;
          }
          .coord-text, .coord-sep {
            display: none;
          }
          .coord-charter {
            font-size: 0.75rem;
            white-space: normal;
            text-align: center;
          }
          .atelier-hero-title {
            font-size: 1.85rem;
            line-height: 1.25;
          }
          .manifesto-lead-text {
            font-size: 0.92rem;
            line-height: 1.65;
          }
          .atelier-btn-primary, .atelier-btn-ghost {
            width: 100%;
            justify-content: center;
          }
          .metrology-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem 1rem;
          }
          .metrology-cell {
            min-width: 0;
            align-items: center;
            text-align: center;
          }
          .metrology-num {
            font-size: 1.65rem;
          }
          .metrology-lbl {
            font-size: 0.72rem;
            text-align: center;
          }
        }

        /* ─── 3. Paravent Foldable Accordion Section ─── */
        .atelier-paravent-section {
          padding: 6rem 0;
          background: var(--bg-primary, #F7F4EE);
        }

        .atelier-section-header {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 3.5rem auto;
        }

        .atelier-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #B8934A;
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.5rem;
        }

        [data-theme="light"] .atelier-eyebrow {
          color: #8C6826;
        }

        .atelier-title {
          font-family: var(--font-heading);
          font-size: 2.35rem;
          font-weight: 800;
          color: var(--text-primary, #141210);
          margin: 0 0 0.85rem 0;
        }

        .atelier-subtext {
          font-size: 0.95rem;
          line-height: 1.65;
          color: var(--text-secondary, #475569);
          margin: 0;
        }

        /* Paravent Deck Layout */
        .paravent-deck-container {
          display: flex;
          gap: 1.25rem;
          height: 480px;
          min-height: 480px;
          max-height: 480px;
          max-width: 1080px;
          width: 100%;
          margin: 0 auto;
          overflow: hidden;
        }

        .paravent-panel {
          height: 100%;
          border-radius: 18px;
          cursor: pointer;
          overflow: hidden;
          position: relative;
          display: flex;
          min-width: 0;
          transition: flex 0.65s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
        }

        .paravent-panel.collapsed {
          flex: 0 0 88px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(184, 147, 74, 0.2);
        }

        [data-theme="light"] .paravent-panel.collapsed {
          background: #FFFFFF;
          border: 1px solid rgba(30, 24, 16, 0.1);
        }

        .paravent-panel.collapsed:hover {
          border-color: rgba(184, 147, 74, 0.5);
          background: rgba(184, 147, 74, 0.04);
        }

        .paravent-panel.expanded {
          flex: 1 1 0%;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(184, 147, 74, 0.45);
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.35);
          cursor: default;
        }

        [data-theme="light"] .paravent-panel.expanded {
          background: #FFFFFF;
          border: 1.5px solid rgba(140, 104, 38, 0.35);
          box-shadow: 0 16px 44px rgba(30, 24, 16, 0.08);
        }

        /* Spine Vertical Header */
        .paravent-spine {
          width: 88px;
          height: 100%;
          padding: 1.75rem 0.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
          box-sizing: border-box;
        }

        [dir="rtl"] .paravent-spine {
          border-right: none;
          border-left: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .paravent-spine {
          border-color: rgba(30, 24, 16, 0.08);
        }

        .spine-top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .spine-roman {
          font-family: Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #B8934A;
        }

        [data-theme="light"] .spine-roman {
          color: #8C6826;
        }

        .spine-year {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--text-muted, #94A3B8);
          font-weight: 600;
        }

        .spine-tag {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #B8934A;
          text-transform: uppercase;
        }

        [data-theme="light"] .spine-tag {
          color: #8C6826;
        }

        .spine-indicator {
          color: #B8934A;
        }

        /* Expanded Body */
        .paravent-body {
          flex: 1;
          min-width: 0;
          height: 100%;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-sizing: border-box;
        }

        .paravent-content-inner {
          min-width: 520px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .paravent-body-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .panel-chapter-stamp {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: Georgia, serif;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #B8934A;
          letter-spacing: 0.1em;
        }

        [data-theme="light"] .panel-chapter-stamp {
          color: #8C6826;
        }

        .panel-tag-badge {
          font-size: 0.6875rem;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 6px;
          background: rgba(184, 147, 74, 0.12);
          color: #E5B869;
          border: 1px solid rgba(184, 147, 74, 0.3);
          letter-spacing: 0.05em;
        }

        [data-theme="light"] .panel-tag-badge {
          background: rgba(140, 104, 38, 0.08);
          color: #8C6826;
          border-color: rgba(140, 104, 38, 0.25);
        }

        .panel-headline {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          line-height: 1.25;
          color: var(--text-primary, #141210);
          margin: 0 0 0.5rem 0;
        }

        .panel-subtitle {
          font-size: 0.9375rem;
          color: #B8934A;
          font-weight: 600;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        [data-theme="light"] .panel-subtitle {
          color: #8C6826;
        }

        .panel-narrative {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary, #64748B);
          margin: 0 0 1.5rem 0;
        }

        [data-theme="light"] .panel-narrative {
          color: #475569;
        }

        .panel-metrics-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(184, 147, 74, 0.2);
        }

        .panel-metric-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .metric-box-val {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: #E5B869;
        }

        [data-theme="light"] .metric-box-val {
          color: #8C6826;
        }

        .metric-box-lbl {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-muted, #94A3B8);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        [data-theme="light"] .metric-box-lbl {
          color: #64748B;
        }

        @media (max-width: 900px) {
          .atelier-paravent-section {
            padding: 4rem 0;
          }

          .paravent-deck-container {
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
            height: auto;
            min-height: auto;
            max-height: none;
            overflow: visible;
          }

          .paravent-panel {
            display: flex !important;
            flex-direction: column !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            width: 100% !important;
            border-radius: 16px;
            overflow: hidden;
            transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          }

          .paravent-panel.collapsed {
            flex: none !important;
            height: 54px !important;
            min-height: 54px !important;
            cursor: pointer;
          }

          .paravent-panel.expanded {
            flex: none !important;
            height: auto !important;
            min-height: auto !important;
          }

          .paravent-spine {
            width: 100% !important;
            height: 54px !important;
            min-height: 54px !important;
            flex-direction: row !important;
            padding: 0 1.25rem !important;
            border-right: none !important;
            border-left: none !important;
            border-bottom: 1px solid rgba(184, 147, 74, 0.2);
            align-items: center;
            justify-content: space-between !important;
            gap: 12px;
            flex-shrink: 0;
            cursor: pointer;
            box-sizing: border-box;
          }

          .paravent-panel.collapsed .paravent-spine {
            border-bottom: none !important;
          }

          .spine-top {
            flex-direction: row;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .spine-roman {
            font-size: 1.15rem;
          }

          .spine-year {
            font-size: 0.72rem;
            display: inline-block;
          }

          .spine-tag {
            writing-mode: horizontal-tb !important;
            transform: none !important;
            font-size: 0.72rem;
            font-weight: 700;
            flex: 1;
            text-align: start;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .spine-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .paravent-body {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            padding: 1.5rem 1.25rem !important;
            display: block !important;
            overflow: visible !important;
            box-sizing: border-box;
          }

          .paravent-content-inner {
            min-width: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            gap: 0.85rem;
          }

          .paravent-body-top {
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .panel-headline {
            font-size: 1.35rem;
            line-height: 1.3;
            margin: 0 0 0.35rem 0;
          }

          .panel-subtitle {
            font-size: 0.85rem;
            line-height: 1.5;
            margin: 0 0 0.75rem 0;
          }

          .panel-narrative {
            font-size: 0.85rem;
            line-height: 1.65;
            margin: 0 0 1.25rem 0;
          }

          .panel-metrics-strip {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            padding-top: 1rem;
            border-top: 1px solid rgba(184, 147, 74, 0.2);
          }

          .metric-box-val {
            font-size: 1.15rem;
          }

          .metric-box-lbl {
            font-size: 0.625rem;
          }
        }

        /* ─── 4. Architectural Lightbox & Due Diligence ─── */
        .atelier-curation-section {
          padding: 6rem 0;
          background: #0E1017;
          border-top: 1px solid rgba(184, 147, 74, 0.2);
          border-bottom: 1px solid rgba(184, 147, 74, 0.2);
        }

        [data-theme="light"] .atelier-curation-section {
          background: #FFFFFF;
          border-color: rgba(140, 104, 38, 0.2);
        }

        .atelier-curation-section { container-type: inline-size; }
        .charter-stage { display: grid; grid-template-columns: 44px 1.2fr 1fr 1fr; gap: 2rem; padding: 2.5rem 0; border-top: 1px solid color-mix(in srgb, var(--gold-primary) 35%, transparent); }
        .charter-numeral { font-family: Georgia, serif; font-size: 2.25rem; color: var(--gold-primary); }
        .charter-heading h3 { font-size: 1.2rem; font-family: var(--font-heading); margin: 0 0 .7rem; }
        .charter-heading .mini-markdown { color: var(--text-secondary); font-size: .95rem; line-height: 1.75; }
        .charter-column h4 { font-size: .9rem; color: var(--gold-primary); margin: 0 0 1rem; }
        .charter-column ul { margin: 0; padding: 0; list-style: none; display: grid; gap: .75rem; }
        .charter-column li { display: flex; align-items: baseline; gap: .65rem; color: var(--text-primary); font-size: .9rem; line-height: 1.65; }
        .charter-column li span { color: var(--gold-primary); }
        .charter-footer { display: flex; gap: 1.5rem; align-items: center; justify-content: space-between; padding-top: 2rem; border-top: 1px solid color-mix(in srgb, var(--gold-primary) 35%, transparent); }
        .charter-report-link { display: inline-flex; align-items: center; justify-content: center; gap: .65rem; background: var(--gold-primary); color: var(--bg-primary); border-radius: 999px; padding: .85rem 1.5rem; text-decoration: none; }
        .charter-report-link:focus-visible, .paravent-panel:focus-visible { outline: 2px solid var(--gold-primary); outline-offset: 4px; }
        @container (max-width: 800px) {
          .charter-stage { grid-template-columns: 36px 1fr; gap: 1rem; }
          .charter-column { grid-column: 2; }
          .charter-footer { align-items: start; flex-direction: column; }
        }

        /* ─── 5. Founder’s Lettre d'Intention ─── */
        .atelier-founder-section {
          padding: 6rem 0;
          background: var(--bg-primary, #F7F4EE);
        }

        .founder-letter-card {
          max-width: 840px;
          margin: 0 auto;
          background: #FFFFFF;
          border: 1.5px solid rgba(184, 147, 74, 0.35);
          border-radius: 20px;
          padding: 3.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(30, 24, 16, 0.08);
        }

        [data-theme="dark"] .founder-letter-card {
          background: #0E1017;
          border-color: rgba(184, 147, 74, 0.35);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }

        .founder-letter-watermark {
          position: absolute;
          top: -20px;
          right: 25px;
          font-family: Georgia, serif;
          font-size: 16rem;
          color: rgba(184, 147, 74, 0.06);
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }

        .founder-letter-content {
          position: relative;
          z-index: 1;
        }

        .founder-letter-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(184, 147, 74, 0.2);
          padding-bottom: 1rem;
        }

        .letter-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #8C6826;
          text-transform: uppercase;
        }

        [data-theme="dark"] .letter-eyebrow {
          color: #E5B869;
        }

        .letter-est {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--text-muted, #94A3B8);
          font-weight: 600;
        }

        .founder-quote-serif {
          font-family: Georgia, serif;
          font-size: 1.45rem;
          line-height: 1.7;
          color: #141210;
          font-style: italic;
          margin: 0 0 2.5rem 0;
        }

        [data-theme="dark"] .founder-quote-serif {
          color: #FFFFFF;
        }

        .founder-letter-signoff {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
        }

        .signoff-name {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: #141210;
          margin: 0 0 4px 0;
        }

        [data-theme="dark"] .signoff-name {
          color: #FFFFFF;
        }

        .signoff-role {
          font-size: 0.8125rem;
          color: #8C6826;
          font-weight: 600;
          margin: 0;
        }

        [data-theme="dark"] .signoff-role {
          color: #E5B869;
        }

        .signoff-stamp {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(184, 147, 74, 0.1);
          border: 1px solid rgba(184, 147, 74, 0.35);
          font-size: 0.75rem;
          font-weight: 700;
          color: #8C6826;
        }

        [data-theme="dark"] .signoff-stamp {
          color: #E5B869;
        }

        .stamp-icon {
          color: #B8934A;
        }

        /* ─── 6. Confidential Acquisitions Office (CTA Portal) ─── */
        .atelier-portal-section {
          padding: 6rem 0 7.5rem 0;
          background: var(--bg-primary, #F7F4EE);
        }

        .atelier-portal-card {
          position: relative;
          border-radius: 24px;
          background: #0B0C10;
          border: 1.5px solid rgba(184, 147, 74, 0.4);
          padding: 4.5rem 3.5rem;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          text-align: center;
        }

        [data-theme="light"] .atelier-portal-card {
          background: linear-gradient(
            135deg,
            #1A1208 0%,
            #2C1E0A 50%,
            #1A1208 100%
          );
          border: 1.5px solid rgba(184, 147, 74, 0.55);
          box-shadow: 0 24px 60px rgba(30, 24, 16, 0.22), inset 0 1px 1.5px rgba(229, 184, 105, 0.15);
        }

        .portal-watermark-scale {
          position: absolute;
          right: -40px;
          bottom: -40px;
          color: rgba(184, 147, 74, 0.05);
          pointer-events: none;
          user-select: none;
        }

        .portal-inner-wrap {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .portal-tag-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(184, 147, 74, 0.12);
          border: 1px solid rgba(184, 147, 74, 0.3);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #E5B869;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }

        .portal-tag-icon {
          color: #B8934A;
        }

        .portal-heading-text {
          font-family: var(--font-heading);
          font-size: 2.4rem;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.25;
          margin: 0 0 1.25rem 0;
        }

        .portal-paragraph-text {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 2.25rem 0;
        }

        .portal-actions-group {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .portal-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 30px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: linear-gradient(135deg, #E5B869 0%, #B8934A 100%);
          color: #0B0C10;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 20px rgba(184, 147, 74, 0.35);
        }

        .portal-btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(184, 147, 74, 0.5);
        }

        .portal-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 26px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: var(--bg-glass-card);
          color: #FFFFFF;
          border: var(--glass-border);
          cursor: pointer;
          backdrop-filter: var(--glass-blur-nav);
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-glass);
          text-shadow: var(--glass-text-shadow);
        }

        .portal-btn-outline:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #B8934A;
          color: #E5B869;
        }

        @media (max-width: 640px) {
          .founder-letter-card {
            padding: 1.75rem 1.25rem;
          }
          .founder-letter-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.35rem;
            margin-bottom: 1.25rem;
          }
          .founder-letter-watermark {
            font-size: 8rem;
            top: -10px;
            right: 10px;
          }
          .atelier-paravent-section,
          .atelier-curation-section,
          .atelier-founder-section,
          .atelier-portal-section {
            padding: 3.5rem 0;
          }
          .atelier-title {
            font-size: 1.75rem;
          }
          .founder-quote-serif {
            font-size: 1.15rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          .atelier-portal-card {
            padding: 2.5rem 1.25rem;
            border-radius: 20px;
          }
          .portal-heading-text {
            font-size: 1.65rem;
          }
          .portal-btn-gold,
          .portal-btn-outline {
            width: 100%;
            justify-content: center;
          }
        }

        /* ── RTL & Arabic Typography Safety Overrides ── */
        [dir="rtl"] .atelier-hero-title,
        [dir="rtl"] .title-gold-serif,
        [dir="rtl"] .founder-quote-serif,
        [dir="rtl"] .portal-heading-text,
        [dir="rtl"] .atelier-title {
          font-style: normal !important;
          letter-spacing: normal !important;
          line-height: 1.4 !important;
          padding-bottom: 4px;
        }

        [dir="rtl"] .atelier-coordinates-bar {
          letter-spacing: normal !important;
          font-family: inherit !important;
          max-width: 95%;
          margin-left: auto;
          margin-right: auto;
        }

        [dir="rtl"] .founder-quote-serif {
          font-family: var(--font-heading), 'Tajawal', sans-serif !important;
        }
      `}</style>
    </div>
  );
}
