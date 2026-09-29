'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface ZFWidgetCardProps {
  id?: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  defaultExpanded?: boolean;
  isAr?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ZFWidgetCard
 * Reusable companion widget card supporting expand/collapse accordion toggles,
 * localized aria-labels, and smooth CSS transitions.
 */
export const ZFWidgetCard: React.FC<ZFWidgetCardProps> = ({
  id,
  title,
  icon,
  badge,
  headerAction,
  defaultExpanded = true,
  isAr,
  children,
  className,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isArabic = isAr ?? (typeof document !== 'undefined' ? document.documentElement.dir === 'rtl' : true);

  const bodyId = id ? `${id}-body` : undefined;

  const handleToggle = () => {
    setIsExpanded(prev => !prev);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 260);
      });
    }
  };

  return (
    <div 
      id={id}
      className={`zfWidgetCard sideWidgetCard ${className || ''} ${!isExpanded ? 'zfWidgetCardCollapsed widgetCardCollapsed' : ''}`}
      style={style}
      data-widget-card="true"
      data-card-enhanced="true"
      data-collapsed={!isExpanded}
    >
      <div className="zfWidgetCardHeader widgetCardHeader">
        <div className="zfWidgetCardTitleWrap widgetCardTitleWrap">
          {icon && (
            <div className="zfWidgetCardIconSquircle widgetCardIconSquircle">
              {icon}
            </div>
          )}
          <h4 className="zfWidgetCardTitle widgetCardTitle">{title}</h4>
        </div>

        <div className="zfWidgetCardHeaderTrailing widgetCardHeaderTrailing">
          {badge}
          {headerAction}
          <button
            type="button"
            className="zfCardToggleBtn cardToggleBtn"
            onClick={handleToggle}
            aria-label={isExpanded ? (isArabic ? 'طي البطاقة' : 'Collapse card') : (isArabic ? 'توسيع البطاقة' : 'Expand card')}
            title={isExpanded ? (isArabic ? 'طي البطاقة' : 'Collapse card') : (isArabic ? 'توسيع البطاقة' : 'Expand card')}
            aria-expanded={isExpanded}
            aria-controls={bodyId}
          >
            <ChevronDown 
              size={14} 
              className={`zfCardToggleChevron cardToggleChevron ${!isExpanded ? 'zfCardToggleChevronCollapsed cardToggleChevronCollapsed' : ''}`} 
            />
          </button>
        </div>
      </div>

      <div 
        id={bodyId}
        className={`zfWidgetCardBody widgetCardBody ${!isExpanded ? 'zfWidgetCardBodyCollapsed widgetCardBodyCollapsed' : 'zfWidgetCardBodyExpanded widgetCardBodyExpanded'}`}
      >
        {children}
      </div>
    </div>
  );
};

export interface ZFWorkstationSideWidgetsProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  badge?: string;
  icon?: React.ReactNode;
  standalone?: boolean;
}

/**
 * enhanceCardsInSlot
 * Automatically attaches accessible expand/shrink toggle controls and smooth CSS
 * accordion transitions to all companion cards rendered into the side widgets slot.
 */
export function enhanceCardsInSlot(slot: HTMLElement, doc?: Document) {
  const activeDoc = doc || (typeof document !== 'undefined' ? document : null);
  if (!slot || !activeDoc) return;
  const isAr = activeDoc.documentElement ? activeDoc.documentElement.dir === 'rtl' : true;

  const cardElements: HTMLElement[] = [];
  const wrappers = slot.querySelectorAll(
    '[class*="sideWidgetsWrap"], [class*="secondaryColumn"], [class*="sideWidgetsContent"]'
  );
  const searchContainers = wrappers.length > 0 ? Array.from(wrappers) : [slot];

  searchContainers.forEach((container) => {
    Array.from(container.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.nodeType === 1) {
        // Exclude nested wrapper containers from being treated as individual cards
        const isWrapper = Boolean(
          el.classList?.contains('sideWidgetsWrap') || 
          el.classList?.contains('sideWidgetsContent') ||
          el.classList?.contains('secondaryColumn')
        );
        if (!isWrapper && el.children.length >= 2) {
          cardElements.push(el);
        }
      }
    });
  });

  cardElements.forEach((card) => {
    const headerEl = (card.querySelector('[class*="header" i]') || card.children[0]) as HTMLElement;
    if (!headerEl) return;

    if (
      headerEl.querySelector('.zfCardToggleBtn') || 
      headerEl.querySelector('.cardToggleBtn') || 
      headerEl.querySelector('[data-card-toggle="true"]')
    ) {
      card.setAttribute('data-card-enhanced', 'true');
      return;
    }

    card.setAttribute('data-card-enhanced', 'true');

    // Check if the card was previously collapsed
    const isInitiallyCollapsed = typeof card.getAttribute === 'function' && card.getAttribute('data-collapsed') === 'true';
    let isExpanded = !isInitiallyCollapsed;

    const bodyElements: HTMLElement[] = [];
    for (let i = 0; i < card.children.length; i++) {
      const ch = card.children[i] as HTMLElement;
      if (ch !== headerEl && (typeof ch.contains === 'function' ? !ch.contains(headerEl) : true)) {
        bodyElements.push(ch);
        ch.classList.add('zfWidgetCardBody');
        ch.classList.add('widgetCardBody');
        if (isExpanded) {
          ch.classList.add('zfWidgetCardBodyExpanded');
          ch.classList.add('widgetCardBodyExpanded');
          ch.classList.remove('zfWidgetCardBodyCollapsed');
          ch.classList.remove('widgetCardBodyCollapsed');
        } else {
          ch.classList.add('zfWidgetCardBodyCollapsed');
          ch.classList.add('widgetCardBodyCollapsed');
          ch.classList.remove('zfWidgetCardBodyExpanded');
          ch.classList.remove('widgetCardBodyExpanded');
        }
      }
    }

    const toggleBtn = activeDoc.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'zfCardToggleBtn cardToggleBtn';
    toggleBtn.setAttribute('data-card-toggle', 'true');
    toggleBtn.setAttribute('aria-expanded', String(isExpanded));
    const defaultLabel = isExpanded
      ? (isAr ? 'طي البطاقة' : 'Collapse card')
      : (isAr ? 'توسيع البطاقة' : 'Expand card');
    toggleBtn.setAttribute('aria-label', defaultLabel);
    toggleBtn.title = defaultLabel;

    // Connect toggle button to first body element via aria-controls for WAI-ARIA compliance
    const primaryBodyEl = bodyElements[0];
    if (primaryBodyEl) {
      if (!primaryBodyEl.id) {
        primaryBodyEl.id = `zf-widget-body-${Math.random().toString(36).substring(2, 9)}`;
      }
      toggleBtn.setAttribute('aria-controls', primaryBodyEl.id);
    }

    toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="zfCardToggleChevron cardToggleChevron ${!isExpanded ? 'zfCardToggleChevronCollapsed cardToggleChevronCollapsed' : ''}">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isExpanded = !isExpanded;

      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      const currentIsAr = activeDoc.documentElement ? activeDoc.documentElement.dir === 'rtl' : true;
      const newLabel = isExpanded
        ? (currentIsAr ? 'طي البطاقة' : 'Collapse card')
        : (currentIsAr ? 'توسيع البطاقة' : 'Expand card');
      toggleBtn.setAttribute('aria-label', newLabel);
      toggleBtn.title = newLabel;

      const svgEl = toggleBtn.querySelector('svg');
      if (svgEl) {
        if (isExpanded) {
          svgEl.classList.remove('zfCardToggleChevronCollapsed');
          svgEl.classList.remove('cardToggleChevronCollapsed');
        } else {
          svgEl.classList.add('zfCardToggleChevronCollapsed');
          svgEl.classList.add('cardToggleChevronCollapsed');
        }
      }

      card.setAttribute('data-collapsed', String(!isExpanded));
      bodyElements.forEach((bodyEl) => {
        if (isExpanded) {
          bodyEl.classList.remove('zfWidgetCardBodyCollapsed');
          bodyEl.classList.remove('widgetCardBodyCollapsed');
          bodyEl.classList.add('zfWidgetCardBodyExpanded');
          bodyEl.classList.add('widgetCardBodyExpanded');
        } else {
          bodyEl.classList.remove('zfWidgetCardBodyExpanded');
          bodyEl.classList.remove('widgetCardBodyExpanded');
          bodyEl.classList.add('zfWidgetCardBodyCollapsed');
          bodyEl.classList.add('widgetCardBodyCollapsed');
        }
      });

      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 260);
        });
      }
    });

    // Ensure title/leading container pushes trailing controls to the edge
    const titleWrap = (headerEl.querySelector('[class*="title" i], [class*="heading" i], h1, h2, h3, h4, h5, h6') || headerEl.children[0]) as HTMLElement | null;
    if (titleWrap && titleWrap !== headerEl) {
      titleWrap.style.marginInlineEnd = 'auto';
    }

    let trailingTarget: HTMLElement = headerEl;
    const candidateTrailing = headerEl.querySelector(
      '[class*="trailing" i], [class*="action" i], [class*="right" i]'
    ) as HTMLElement | null;

    if (
      candidateTrailing && 
      candidateTrailing !== titleWrap && 
      (typeof candidateTrailing.contains === 'function' ? !candidateTrailing.contains(titleWrap) : true) && 
      (!candidateTrailing.querySelector || !candidateTrailing.querySelector('h1, h2, h3, h4, h5, h6'))
    ) {
      trailingTarget = candidateTrailing;
    } else {
      const lastChild = headerEl.children[headerEl.children.length - 1] as HTMLElement | null;
      if (
        lastChild &&
        lastChild !== titleWrap &&
        (typeof lastChild.contains === 'function' ? !lastChild.contains(titleWrap) : true) &&
        lastChild.tagName !== 'BUTTON' &&
        lastChild.tagName !== 'SPAN' &&
        (!lastChild.querySelector || !lastChild.querySelector('h1, h2, h3, h4, h5, h6')) &&
        (lastChild.children && lastChild.children.length > 0 || (typeof lastChild.getAttribute === 'function' && (lastChild.getAttribute('style') || '').includes('flex')))
      ) {
        trailingTarget = lastChild;
      }
    }

    trailingTarget.appendChild(toggleBtn);
  });
}

/**
 * ZFWorkstationSideWidgets
 * Renders contextual or general workstation companion widgets into the
 * dedicated Side Widgets Container of the FIN-OS shell.
 */
export const ZFWorkstationSideWidgets: React.FC<ZFWorkstationSideWidgetsProps> = ({ 
  children,
  className,
  title,
  badge,
  icon,
  standalone,
}) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [iconElement, setIconElement] = useState<HTMLElement | null>(null);
  const [minimizedIconElement, setMinimizedIconElement] = useState<HTMLElement | null>(null);
  const [isStandaloneFallback, setIsStandaloneFallback] = useState(false);

  useEffect(() => {
    const findSlot = () => {
      const el = document.getElementById('zf-side-widgets-slot');
      if (el) {
        setTargetElement(el);
        const iEl = document.getElementById('zf-side-widgets-header-icon');
        if (iEl) setIconElement(iEl);
        const mIEl = document.getElementById('zf-side-widgets-minimized-icon');
        if (mIEl) setMinimizedIconElement(mIEl);
        return true;
      }
      return false;
    };

    if (findSlot()) return;

    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(() => {
      attempts++;
      if (findSlot() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!document.getElementById('zf-side-widgets-slot')) {
          setIsStandaloneFallback(true);
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!title) return;
    const tEl = document.getElementById('zf-side-widgets-header-title');
    const mEl = document.getElementById('zf-side-widgets-minimized-title');
    const mWrap = mEl?.parentElement;
    const mIcon = document.getElementById('zf-side-widgets-minimized-icon');
    const prevT = tEl?.textContent;
    const prevM = mEl?.textContent;
    const prevWrapTitle = mWrap?.getAttribute('title');
    const prevIconTitle = mIcon?.getAttribute('title');

    if (tEl) tEl.textContent = title;
    if (mEl) mEl.textContent = title;
    if (mWrap) mWrap.setAttribute('title', title);
    if (mIcon) mIcon.setAttribute('title', title);

    return () => {
      if (tEl && prevT) tEl.textContent = prevT;
      if (mEl && prevM) mEl.textContent = prevM;
      if (mWrap && prevWrapTitle) mWrap.setAttribute('title', prevWrapTitle);
      if (mIcon && prevIconTitle) mIcon.setAttribute('title', prevIconTitle);
    };
  }, [title, targetElement]);

  useEffect(() => {
    const bWrap = document.getElementById('zf-side-widgets-header-badge');
    const bEl = document.getElementById('zf-side-widgets-header-badge-text');
    if (!bWrap || !bEl) return;

    if (!badge || !badge.trim()) {
      bWrap.style.display = 'none';
      return;
    }

    const prevDisplay = bWrap.style.display;
    const prevText = bEl.textContent;

    bWrap.style.display = 'inline-flex';
    bEl.textContent = badge;

    return () => {
      if (prevText) {
        bEl.textContent = prevText;
        bWrap.style.display = prevDisplay;
      } else {
        bWrap.style.display = 'none';
        bEl.textContent = '';
      }
    };
  }, [badge, targetElement]);

  useEffect(() => {
    if (!icon) return;
    const iEl = document.getElementById('zf-side-widgets-header-icon');
    const mEl = document.getElementById('zf-side-widgets-minimized-icon');
    const defaultIcon = document.getElementById('zf-side-widgets-default-icon');
    const defaultMinIcon = document.getElementById('zf-side-widgets-default-minimized-icon');

    iEl?.classList.add('hasCustomIcon');
    mEl?.classList.add('hasCustomIcon');
    if (defaultIcon) defaultIcon.style.display = 'none';
    if (defaultMinIcon) defaultMinIcon.style.display = 'none';

    return () => {
      iEl?.classList.remove('hasCustomIcon');
      mEl?.classList.remove('hasCustomIcon');
      if (defaultIcon) defaultIcon.style.display = '';
      if (defaultMinIcon) defaultMinIcon.style.display = '';
    };
  }, [icon, targetElement]);

  useEffect(() => {
    if (!targetElement) return;

    enhanceCardsInSlot(targetElement);

    const observer = new MutationObserver(() => {
      enhanceCardsInSlot(targetElement);
    });

    observer.observe(targetElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [targetElement]);

  if (targetElement) {
    return (
      <>
        {createPortal(children, targetElement)}
        {icon && iconElement ? createPortal(icon, iconElement) : null}
        {icon && minimizedIconElement ? createPortal(icon, minimizedIconElement) : null}
      </>
    );
  }

  if (standalone || isStandaloneFallback) {
    return (
      <aside className={className} aria-label="Workstation Side Widgets">
        {children}
      </aside>
    );
  }

  return null;
};

export default ZFWorkstationSideWidgets;
