'use client';

import React from 'react';
import styles from './ZFPageHeader.module.css';

interface ZFPageHeaderProps {
  title: React.ReactNode;
  /** One plain line: what the page is for. No account codes, no bold spans. */
  subtitle?: React.ReactNode;
  /** Trailing-edge controls: at most one btnPrimary, plus secondary/ghost buttons or period tabs. */
  actions?: React.ReactNode;
  className?: string;
}

export function ZFPageHeader({ title, subtitle, actions, className }: ZFPageHeaderProps) {
  return (
    <header className={`${styles.header}${className ? ` ${className}` : ''}`}>
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

interface ZFPanelProps {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Body without padding (tables, lists that run edge to edge). */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
  id?: string;
}

export function ZFPanel({ title, hint, icon, actions, flush, className, bodyClassName, children, id }: ZFPanelProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <section id={id} className={`${styles.panel}${className ? ` ${className}` : ''}`}>
      {hasHeader ? (
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            {icon ? <span className={styles.panelIcon} aria-hidden="true">{icon}</span> : null}
            <div className={styles.panelTitles}>
              {title ? <h2 className={styles.panelTitle}>{title}</h2> : null}
              {hint ? <p className={styles.panelHint}>{hint}</p> : null}
            </div>
          </div>
          {actions ? <div className={styles.panelActions}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={`${flush ? styles.panelBodyFlush : styles.panelBody}${bodyClassName ? ` ${bodyClassName}` : ''}`}>
        {children}
      </div>
    </section>
  );
}

export interface ZFSegmentOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
}

interface ZFSegmentedProps<T extends string> {
  options: ZFSegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function ZFSegmented<T extends string>({ options, value, onChange, ariaLabel, className }: ZFSegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`${styles.segmented}${className ? ` ${className}` : ''}`}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.segment}${active ? ` ${styles.segmentActive}` : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' ? <span className={styles.segmentCount}>{opt.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
