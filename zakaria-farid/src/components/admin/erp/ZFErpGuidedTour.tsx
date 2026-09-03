'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  Command, 
  Play, 
  HelpCircle,
  TrendingUp,
  Layers,
  Calendar,
  Clock,
  Plus
} from 'lucide-react';

export interface TourStep {
  targetSelector: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  icon: React.ElementType;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface ZFErpGuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  isAr?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="command-bar"]',
    titleAr: '1. شريط الأوامر والمراقبة المركزية (⌘K)',
    titleEn: '1. Command Bar & Telemetry (⌘K)',
    contentAr: 'شريط الأوامر يتيح لك البحث الفوري (⌘K) في العقود والشيكات والقيود، متابعة حالة الاتصال الحي بقاعدة البيانات، والاطلاع على التنبيهات المالية العاجلة عبر جرس الإشعارات.',
    contentEn: 'The global Command Bar powers instant search (⌘K) across contracts, cheques, and ledger entries, tracks live telemetry and period locks, and signals urgent alerts via the bell.',
    icon: Command,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="nav-dock"]',
    titleAr: '2. القائمة الجانبية ووحدات العمل (Navigation Dock)',
    titleEn: '2. Navigation Dock & ERP Modules',
    contentAr: 'تنظيم هرمي متطور يضم 9 وحدات متخصصة مقسمة بدقة: القيادة والتحليل المالي، المبيعات والعمليات التعاقدية، والمحاسبة والرقابة المالية.',
    contentEn: 'Structured domain navigation grouping 9 specialized modules: Command & Analytics, Sales & Deals Pipeline, and Accounting & Governance.',
    icon: Layers,
    position: 'right'
  },
  {
    targetSelector: '[data-tour="capital-mindmap"]',
    titleAr: '3. خريطة التدفقات المالية وتوزيعات رأس المال',
    titleEn: '3. Capital Flow Mindmap & Treasury Topology',
    contentAr: 'مخطط شجري تفاعلي حي يربط مصادر الأموال الداخلة (Inflows) وانصبابها في الخزينة المركزية، ثم توجيهات الصرف على مشروعات التطوير الأربعة والضرائب السيادية مع مسارات ضوئية متحركة.',
    contentEn: 'Directed interactive tree connecting capital inflows directly into the central treasury, routing expenditures across the 4 capitalized WIP project accounts.',
    icon: TrendingUp,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="financial-calendar"]',
    titleAr: '4. التقويم المالي وجدول استحقاق الشيكات الشهري',
    titleEn: '4. Monthly Financial & Cheque Maturity Calendar',
    contentAr: 'تقويم شامل يعرض أيام الشهر مدمجاً بها مواعيد صرف شيكات الخزينة وأقساط العقود والضرائب. يمكنك النقر على أي يوم لفتح درج الأجندة التفصيلية.',
    contentEn: 'Full interactive monthly calendar mapping PDC maturities and contract dues day-by-day. Click any date to open the Day Agenda Inspector Drawer.',
    icon: Calendar,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="action-ledger"]',
    titleAr: '5. أجندة واستحقاقات اليوم والتحذيرات الرقابية',
    titleEn: '5. Today\'s Financial Action Ledger',
    contentAr: 'كشف فوري للشيكات المستحقة بالخزينة اليوم، والأقساط المتأخرة، وطلبات الاعتماد الثنائي المعلقة، مزوداً بأزرار سريعة للتحصيل المباشر ومعاينة العقود.',
    contentEn: 'Real-time briefing of cheques in safe maturing today, overdue arrears, and pending Maker-Checker dual approvals with instant collection triggers.',
    icon: Clock,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="quick-actions"]',
    titleAr: '6. أزرار الإجراءات السريعة الفورية',
    titleEn: '6. Global Quick Action Triggers',
    contentAr: 'سجل قيداً أو مصروف موقع مباشر، استلم شيكاً بالخزينة مع معاينة واقعية وتفقيط عربي ذكي، أو أبرم عقد بيع جديد بضغطة زر واحدة من أي مكان.',
    contentEn: 'Record quick site expenses, vault client cheques with realistic live preview and Arabic Tafqeet, or book a new contract with one click.',
    icon: Plus,
    position: 'bottom'
  }
];

export const ZFErpGuidedTour: React.FC<ZFErpGuidedTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  isAr = true
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Update target rect & scroll into view
  const updateSpotlight = useCallback(() => {
    if (!isActive || !currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Short delay for smooth scroll to finish
      const t = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 250);
      return () => clearTimeout(t);
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [updateSpotlight]);

  if (!isActive || !currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('zf_fin_os_tour_completed_v1', 'true');
      }
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkipTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zf_fin_os_tour_completed_v1', 'true');
    }
    onSkip();
  };

  const Icon = currentStep.icon;

  // Calculate Tooltip Box Coordinates
  let tooltipTop = 100;
  let tooltipLeft = 100;
  if (targetRect) {
    // Default position below element
    tooltipTop = targetRect.bottom + 16;
    tooltipLeft = Math.max(20, Math.min(window.innerWidth - 420, targetRect.left));

    // If bottom runs off screen, position above
    if (tooltipTop + 240 > window.innerHeight) {
      tooltipTop = Math.max(20, targetRect.top - 250);
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        pointerEvents: 'auto',
        direction: isAr ? 'rtl' : 'ltr',
        transition: 'all 0.3s ease'
      }}
    >
      {/* SEMI-TRANSPARENT BACKDROP WITH SPOTLIGHT HOLE CUTOUT */}
      <svg 
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 7, 18, 0.78)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* GLOWING SPOTLIGHT BORDER AROUND TARGET ELEMENT */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: '14px',
            border: '2px solid rgba(212, 175, 55, 0.85)',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.4), inset 0 0 15px rgba(212, 175, 55, 0.2)',
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 1000000
          }}
        />
      )}

      {/* FLOATING GLASSMORPHIC TOUR TOOLTIP CARD */}
      <div 
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: '390px',
          maxWidth: 'calc(100vw - 40px)',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 13, 22, 0.98) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '18px',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(212, 175, 55, 0.12)',
          backdropFilter: 'blur(20px)',
          color: '#ffffff',
          zIndex: 1000001,
          animation: 'fadeIn 0.25s ease-out'
        }}
      >
        {/* Card Header: Step Counter & Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(212, 175, 55, 0.18)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d4af37'
            }}>
              <Icon size={14} />
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#d4af37',
              fontFamily: 'monospace',
              letterSpacing: '0.05em'
            }}>
              {isAr ? `خطوة ${currentStepIndex + 1} من ${TOUR_STEPS.length}` : `STEP ${currentStepIndex + 1} OF ${TOUR_STEPS.length}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkipTour}
            title={isAr ? 'تخطي الجولة' : 'Skip Tour'}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Card Title */}
        <h3 style={{ margin: '0 0 0.45rem 0', fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>
          {isAr ? currentStep.titleAr : currentStep.titleEn}
        </h3>

        {/* Card Content */}
        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.65 }}>
          {isAr ? currentStep.contentAr : currentStep.contentEn}
        </p>

        {/* Progress Bar Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.1rem' }}>
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                height: '4px',
                flex: 1,
                borderRadius: '999px',
                background: idx <= currentStepIndex ? '#d4af37' : 'rgba(255, 255, 255, 0.1)',
                transition: 'background 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Card Footer: Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleSkipTour}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0.35rem 0.6rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#cbd5e1'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            {isAr ? 'تخطي' : 'Skip'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                <span>{isAr ? 'السابق' : 'Back'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #b38f26 100%)',
                border: 'none',
                color: '#000000',
                borderRadius: '8px',
                padding: '0.45rem 1rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
              }}
            >
              <span>
                {currentStepIndex === TOUR_STEPS.length - 1 
                  ? (isAr ? 'إنهاء الجولة' : 'Finish Tour') 
                  : (isAr ? 'التالي' : 'Next')}
              </span>
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <CheckCircle2 size={14} />
              ) : (
                isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
