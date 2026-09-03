'use client';

import React, { useState } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Play, 
  TrendingUp, 
  Building2, 
  FileText, 
  Calculator, 
  Landmark, 
  PieChart, 
  ShieldCheck, 
  RotateCcw, 
  Command, 
  Clock, 
  DollarSign, 
  Layers, 
  ExternalLink,
  Info,
  CheckCircle2
} from 'lucide-react';

interface ZFErpAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGuidedTour: () => void;
  onNavigateToModule?: (modId: string) => void;
  isAr?: boolean;
}

type AcademyTrack = 'workflow' | 'modules' | 'sop' | 'rules' | 'shortcuts';

export const ZFErpAcademyModal: React.FC<ZFErpAcademyModalProps> = ({
  isOpen,
  onClose,
  onStartGuidedTour,
  onNavigateToModule,
  isAr = true
}) => {
  const [activeTrack, setActiveTrack] = useState<AcademyTrack>('workflow');
  const [activeArticleId, setActiveArticleId] = useState<string>('wf-overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '1280px',
          height: '90vh',
          maxHeight: '860px',
          background: 'linear-gradient(145deg, #0b0f19 0%, #070a12 100%)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          direction: isAr ? 'rtl' : 'ltr'
        }}
      >
        {/* TOP BAR */}
        <div style={{
          padding: '1.2rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'rgba(15, 23, 42, 0.5)'
        }}>
          {/* Brand & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d4af37'
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff' }}>
                  {isAr ? 'أكاديمية المنظومة ودليل الاستخدام الشامل' : 'FIN-OS Master Academy & System Guide'}
                </h3>
                <span style={{
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  color: '#e2c974',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px'
                }}>
                  FIN-OS v2.4
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                {isAr 
                  ? 'دليل تفاعلي متكامل يشرح دورة العمل العقارية، وظيفة كل شاشة، وروتين التشغيل اليومي والمحاسبي' 
                  : 'Complete interactive walkthrough of real-estate workflows, module specs, and daily operational SOPs'}
              </p>
            </div>
          </div>

          {/* Controls: Search + Live Tour Trigger + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '0.4rem 0.75rem',
              gap: '0.5rem',
              width: '240px'
            }}>
              <Search size={14} color="#94a3b8" />
              <input 
                type="text"
                placeholder={isAr ? 'ابحث في الدليل أو الشاشات...' : 'Search academy or modules...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Launch Guided Tour Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartGuidedTour();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'linear-gradient(135deg, #d4af37 0%, #b38f26 100%)',
                border: 'none',
                color: '#000000',
                borderRadius: '10px',
                padding: '0.55rem 0.95rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Play size={13} fill="#000000" />
              <span>{isAr ? 'ابدأ الجولة التفاعلية المباشرة' : 'Start Live Screen Tour'}</span>
            </button>

            {/* Close Button */}
            <button 
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TRACK TABS BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.6rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(10, 15, 26, 0.8)',
          overflowX: 'auto'
        }}>
          {[
            { id: 'workflow', labelAr: '1. دورة العمل العقارية المتكاملة', labelEn: '1. End-to-End Real Estate ERP SOP', icon: TrendingUp },
            { id: 'modules', labelAr: '2. دليل الشاشات والوحدات التسعة', labelEn: '2. Module-by-Module Guide', icon: Layers },
            { id: 'sop', labelAr: '3. روتين العمل اليومي والأسبوعي', labelEn: '3. Daily & Weekly Routines', icon: Clock },
            { id: 'rules', labelAr: '4. القواعد المحاسبية والرقابة', labelEn: '4. Accounting Rules & Governance', icon: ShieldCheck },
            { id: 'shortcuts', labelAr: '5. الاختصارات والأوامر السريعة', labelEn: '5. Shortcuts & Quick Actions', icon: Command }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTrack === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTrack(t.id as any);
                  if (t.id === 'workflow') setActiveArticleId('wf-overview');
                  else if (t.id === 'modules') setActiveArticleId('mod-cockpit');
                  else if (t.id === 'sop') setActiveArticleId('sop-morning');
                  else if (t.id === 'rules') setActiveArticleId('rule-makerchecker');
                  else if (t.id === 'shortcuts') setActiveArticleId('sc-keys');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: isActive ? 'rgba(212, 175, 55, 0.16)' : 'transparent',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.35)' : '1px solid transparent',
                  color: isActive ? '#e2c974' : '#94a3b8',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} color={isActive ? '#d4af37' : '#64748b'} />
                <span>{isAr ? t.labelAr : t.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN SPLIT CONTAINER: SIDEBAR SUB-INDEX + CONTENT VIEWER */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* LEFT/RIGHT SUB-INDEX NAV */}
          <div style={{
            borderInlineEnd: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(9, 13, 22, 0.6)',
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', padding: '0 0.5rem 0.4rem 0.5rem', letterSpacing: '0.05em' }}>
              {isAr ? 'فهرس الموضوعات' : 'Index of Topics'}
            </div>

            {/* Render Articles by Track */}
            {activeTrack === 'workflow' && (
              <>
                <SubIndexItem id="wf-overview" titleAr="المخطط الشامل لدورة العمل" titleEn="End-to-End Workflow Map" icon={TrendingUp} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} badge={isAr ? 'خريطة شاملة' : 'Blueprint'} />
                <SubIndexItem id="wf-phase1" titleAr="المرحلة 1: تكويد المشروع ومصروفات الإنشاء" titleEn="Phase 1: Project & WIP Cost Routing" icon={Building2} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="wf-phase2" titleAr="المرحلة 2: دراسة الجدوى وهيكلة الأقساط" titleEn="Phase 2: Pricing & Installment Structuring" icon={Calculator} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="wf-phase3" titleAr="المرحلة 3: تحرير وإبرام عقد البيع" titleEn="Phase 3: Sales Contract Booking" icon={FileText} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="wf-phase4" titleAr="المرحلة 4: استلام الشيكات وإيداع الخزينة" titleEn="Phase 4: PDC Vaulting & Tranche Autolink" icon={Landmark} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="wf-phase5" titleAr="المرحلة 5: المتابعة اليومية والتحصيل والمطابقة" titleEn="Phase 5: Daily Dues & Bank Clearing" icon={Clock} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="wf-phase6" titleAr="المرحلة 6: سجل الضرائب والرسوم المضافة" titleEn="Phase 6: Apartment Taxes & Fees Ledger" icon={ShieldCheck} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="wf-phase7" titleAr="المرحلة 7: الفسخ والإقالات والتسويات" titleEn="Phase 7: Rescissions & Forfeitures" icon={RotateCcw} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="wf-phase8" titleAr="المرحلة 8: ميزان المراجعة وإقفال الفترة" titleEn="Phase 8: Trial Balance & Period Closing" icon={PieChart} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
              </>
            )}

            {activeTrack === 'modules' && (
              <>
                <SubIndexItem id="mod-cockpit" titleAr="01. لوحة القيادة والمراقبة (Cockpit)" titleEn="01. Executive Cockpit" icon={TrendingUp} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-properties" titleAr="02. المشاريع والأصول الإنشائية (WIP)" titleEn="02. Projects & WIP Assets" icon={Building2} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-contracts" titleAr="03. سجل عقود البيع والحجوزات" titleEn="03. Sales Contracts Registry" icon={FileText} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-calculator" titleAr="04. حاسبة وهيكلة الأقساط" titleEn="04. Installment Structuring" icon={Calculator} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-pdc" titleAr="05. حافظة وخزينة الشيكات (PDC)" titleEn="05. PDC Cheques Vault" icon={Landmark} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-cost" titleAr="06. تخصيص التكاليف (WIP RSV)" titleEn="06. WIP Cost Allocation (RSV)" icon={PieChart} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-tax" titleAr="07. سجل الضرائب والرسوم المضافة" titleEn="07. Apartment Taxes & Fees Ledger" icon={ShieldCheck} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-rescissions" titleAr="08. فسخ واسترداد العقود والتسويات" titleEn="08. Rescissions & Settlement" icon={RotateCcw} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="mod-ledger" titleAr="09. دفتر الأستاذ والدليل المحاسبي" titleEn="09. General Ledger & COA" icon={BookOpen} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
              </>
            )}

            {activeTrack === 'sop' && (
              <>
                <SubIndexItem id="sop-morning" titleAr="روتين الصباح: فحص الأجندة والمستحقات" titleEn="Daily Morning SOP: Action Ledger & Dues" icon={Clock} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} badge={isAr ? 'يومي' : 'Daily'} />
                <SubIndexItem id="sop-midday" titleAr="عمليات وسط اليوم: الشيكات والمصروفات" titleEn="Midday Operations: Cheques & Entries" icon={DollarSign} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="sop-monthend" titleAr="روتين نهاية الشهر: التحصيل والضرائب والقفل" titleEn="Month-End SOP: Clearing & Period Lock" icon={CheckCircle2} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} badge={isAr ? 'شهري' : 'Monthly'} />
              </>
            )}

            {activeTrack === 'rules' && (
              <>
                <SubIndexItem id="rule-makerchecker" titleAr="نظام الاعتماد الثنائي (Maker-Checker)" titleEn="Maker-Checker Dual Governance" icon={ShieldCheck} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="rule-immutable" titleAr="عدم حذف القيود والقيود العكسية" titleEn="Immutable GL & Reverse Entries" icon={BookOpen} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="rule-eas" titleAr="معايير المحاسبة المصرية (EAS) المطبقة" titleEn="Egyptian Accounting Standards" icon={Landmark} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="rule-wip" titleAr="توجيه الأصول WIP ومشاريع تحت الإنشاء" titleEn="Capitalized WIP vs Operating Expense" icon={Building2} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
              </>
            )}

            {activeTrack === 'shortcuts' && (
              <>
                <SubIndexItem id="sc-keys" titleAr="لوحة الأوامر والاختصارات السريعة" titleEn="Command Bar (⌘K) & Shortcuts" icon={Command} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
                <SubIndexItem id="sc-cheatsheet" titleAr="دليل الرموز والمؤشرات المالية" titleEn="Financial Metric Glossary & Symbols" icon={Info} activeId={activeArticleId} onSelect={setActiveArticleId} isAr={isAr} />
              </>
            )}
          </div>

          {/* RIGHT/LEFT ARTICLE VIEWER */}
          <div style={{
            padding: '2rem 2.5rem',
            overflowY: 'auto',
            background: '#070a12',
            lineHeight: 1.7
          }}>
            <ArticleRenderer 
              articleId={activeArticleId} 
              isAr={isAr} 
              onNavigateToModule={onNavigateToModule}
              onCloseModal={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// SubIndex Item Helper Component
interface SubIndexItemProps {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: React.ElementType;
  activeId: string;
  onSelect: (id: string) => void;
  isAr: boolean;
  badge?: string;
}

const SubIndexItem: React.FC<SubIndexItemProps> = ({
  id,
  titleAr,
  titleEn,
  icon: Icon,
  activeId,
  onSelect,
  isAr,
  badge
}) => {
  const isActive = activeId === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '0.65rem 0.8rem',
        borderRadius: '10px',
        background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
        color: isActive ? '#f8fafc' : '#94a3b8',
        fontSize: '0.78rem',
        fontWeight: isActive ? 800 : 600,
        cursor: 'pointer',
        textAlign: isAr ? 'right' : 'left',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.color = '#ffffff';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#94a3b8';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <Icon size={15} color={isActive ? '#d4af37' : '#64748b'} style={{ flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isAr ? titleAr : titleEn}
        </span>
      </div>
      {badge && (
        <span style={{
          background: isActive ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.08)',
          color: isActive ? '#e2c974' : '#cbd5e1',
          fontSize: '0.62rem',
          padding: '0.1rem 0.45rem',
          borderRadius: '999px',
          fontWeight: 700,
          flexShrink: 0
        }}>
          {badge}
        </span>
      )}
    </button>
  );
};

// Comprehensive Article Content Renderer
interface ArticleRendererProps {
  articleId: string;
  isAr: boolean;
  onNavigateToModule?: (modId: string) => void;
  onCloseModal: () => void;
}

const ArticleRenderer: React.FC<ArticleRendererProps> = ({
  articleId,
  isAr,
  onNavigateToModule,
  onCloseModal
}) => {
  const jumpTo = (modId: string) => {
    onCloseModal();
    if (onNavigateToModule) onNavigateToModule(modId);
  };

  switch (articleId) {
    case 'wf-overview':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
              {isAr ? 'المخطط الاستراتيجي' : 'Strategic Blueprint'}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>• FIN-OS Standard Workflow</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', margin: '0 0 1rem 0' }}>
            {isAr ? 'المخطط الشامل لدورة العمل العقارية والمالية' : 'End-to-End Real Estate Financial Lifecycle'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            {isAr 
              ? 'صُممت منظومة FIN-OS لتغطي بدقة متناهية كافة مراحل الاستثمار والتطوير العقاري، بدءاً من شراء الأرض وتوجيه تكاليف الخرسانات والتشطيبات، مروراً بهيكلة الأقساط وإبرام العقود واستلام شيكات الخزينة، وانتهاءً بالتوريدات الضريبية وميزان المراجعة.'
              : 'FIN-OS covers the complete real estate lifecycle: from land acquisition and construction cost allocation (WIP), installment pricing and sales contracts, to cheque vaulting, daily collection agendas, statutory taxes, and general ledger trial balance.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {[
              {
                step: '01',
                titleAr: 'تكويد المشروع وتوجيه مصروفات الإنشاء (WIP Construction)',
                titleEn: 'Project Setup & WIP Construction Routing',
                descAr: 'تسجيل المشروع وحسابات التكلفة الرأسمالية (أراضي 120100، خرسانات 120200، كهروميكانيك 120300، تشطيبات 120400). لا تظهر المشروعات تحت الإنشاء في كتالوج البيع العام إلا عند الجاهزية.',
                descEn: 'Configure projects and capital WIP accounts. WIP projects route direct contractor costs and materials without public catalog pollution.',
                mod: 'cost-allocation'
              },
              {
                step: '02',
                titleAr: 'دراسة الجدوى وهيكلة الأقساط (Installment Structuring)',
                titleEn: 'Installment Structuring & Calculator',
                descAr: 'استخدام الحاسبة الذكية لتصميم خطط السداد (مقدم 10%، أقساط ربع سنوية على 4 سنوات، دفعة استلام 10%). حساب خصومات الكاش وجدول الأقساط التعاقدي.',
                descEn: 'Design payment plans with customized down payments, quarterly tranches, delivery payments, and cash discount simulations.',
                mod: 'calculator'
              },
              {
                step: '03',
                titleAr: 'إبرام وتسجيل عقد البيع (Sales Contract Booking)',
                titleEn: 'Sales Contract Booking',
                descAr: 'تسجيل العقد وربطه بالوحدة والمشتري، وتوثيق الأقساط بجدول استحقاقات رسمي وتحديد نسب الشركاء الاستثماريين وأرباح التطوير.',
                descEn: 'Book formal contract linking buyer, unit, payment tranches, partner equity allocations, and developer commission terms.',
                mod: 'contracts'
              },
              {
                step: '04',
                titleAr: 'استلام الشيكات بالخزينة والتفقيط التلقائي (PDC Vaulting)',
                titleEn: 'PDC Vaulting & Tranche Autolink',
                descAr: 'استلام الشيكات عبر "استوديو الشيكات البنكية المباشر". اختيار العقد يُظهر الأقساط المتبقية تلقائياً، والضغط على أي قسط يملأ القيمة وتاريخ الاستحقاق والتفقيط العربي بدقة.',
                descEn: 'Vault client cheques with realistic live cheque preview. Selecting a contract detects pending tranches and auto-populates amounts and Arabic Tafqeet.',
                mod: 'pdc'
              },
              {
                step: '05',
                titleAr: 'المتابعة اليومية والتحصيل والمطابقة (Daily Action Ledger)',
                titleEn: 'Daily Action Ledger & Bank Clearing',
                descAr: 'لوحة القيادة تبرز يومياً "شيكات مستحقة الصرف اليوم" وأقساط العملاء المتأخرة. عند التحصيل يتم التحويل إلى "تم الصرف" وترحيل القيد للبنك تلقائياً.',
                descEn: 'Executive dashboard surfaces today\'s dues. Marking cheques as cleared generates automatic bank debit journal entries.',
                mod: 'cockpit'
              },
              {
                step: '06',
                titleAr: 'سجل الضرائب والرسوم المضافة (Apartment Taxes & Fees)',
                titleEn: 'Apartment Taxes & Fees Ledger',
                descAr: 'متابعة الضرائب والرسوم المضافة يدوياً لكل شقة، والمحسوبة مباشرة ضمن إجمالي سعر بيع الوحدة، مع تسوية استيفائها بالخزينة الرئيسية.',
                descEn: 'Manual apartment taxes and fees tracking factored directly into gross contract pricing and settled via Main Safe.',
                mod: 'tax'
              },
              {
                step: '07',
                titleAr: 'الفسخ والإقالات والتسويات المحاسبية (Rescissions & Settlements)',
                titleEn: 'Rescissions & Contract Settlements',
                descAr: 'في حال تعثر العميل، يتم تطبيق الإقالة الرقابية عبر نظام الاعتماد الثنائي، مع خصم مصاريف إدارية وقيد رد الشيكات المتبقية دون حذف السجل القديم.',
                descEn: 'Handle defaults and cancellations through Maker-Checker workflow, applying legal forfeitures and safely voiding remaining PDCs.',
                mod: 'rescissions'
              },
              {
                step: '08',
                titleAr: 'ميزان المراجعة وإقفال الفترة (General Ledger & Closing)',
                titleEn: 'General Ledger & Period Closing',
                descAr: 'مراجعة قيود اليومية الآلية واليدوية، والتأكد من توازن الأستاذ العام (المدين = الدائن)، وقفل الفترات لمنع أي تعديل بأثر رجعي.',
                descEn: 'Audit real-time journal entries, verify debit/credit trial balance parity, and lock accounting periods to protect fiscal integrity.',
                mod: 'ledger'
              }
            ].map(item => (
              <div 
                key={item.step}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1.1rem 1.4rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    color: '#e2c974',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                      {isAr ? item.titleAr : item.titleEn}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                      {isAr ? item.descAr : item.descEn}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => jumpTo(item.mod)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                    e.currentTarget.style.color = '#e2c974';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  <span>{isAr ? 'فتح الشاشة' : 'Open Page'}</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );

    case 'wf-phase1':
      return (
        <SingleChapterView
          titleAr="المرحلة 1: تكويد المشروع وتوجيه تكلفة الأعمال الإنشائية (WIP)"
          titleEn="Phase 1: Project Setup & WIP Construction Routing"
          categoryAr="إدارة التكاليف والأصول الإنشائية"
          categoryEn="Cost Management & Construction Assets"
          summaryAr="كيف تبدأ أي مشروع عقاري جديد وتوجه فواتير المقاولين ومشتريات المواد مباشرة إلى الحسابات الرأسمالية دون تلويث مصروفات التشغيل العامة."
          summaryEn="How to initiate a project and route contractor invoices and raw materials directly into capitalized WIP accounts."
          sections={[
            {
              headingAr: '1. الفرق بين أصول المشروعات (WIP) ومصروفات التشغيل',
              headingEn: '1. Capitalized WIP vs Operating Expenses',
              contentAr: 'في التطوير العقاري، لا تُعد تكاليف البناء (الحديد، الخرسانة، التشطيبات، الأراضي) مصروفاً إيرادياً فورياً؛ بل تُرسمل في حساب الأصول "مشروعات تحت التنفيذ (WIP - 120000)". ويتم تحويلها إلى تكلفة مبيعات (COGS) فقط عند تسليم الوحدات وتحقق الإيراد طبقاً لمعيار المحاسبة المصري رقم 48.',
              contentEn: 'Construction expenses are capitalized as Work In Progress (WIP 120000). They transfer to Cost of Goods Sold only upon unit delivery under EAS 48.'
            },
            {
              headingAr: '2. هيكل الحسابات الرأسمالية الأربعة في FIN-OS',
              headingEn: '2. The 4 Capitalized WIP Sub-Accounts',
              contentAr: '• أراضي ومواقع المشروعات (120100): تكلفة الشراء، التسجيل العقاري، ورسوم المرافق الأولية.\n• الإنشاءات والخرسانة المسلحة (120200): أعمال الحفر، المقاول العام، والحديد والأسمنت.\n• الكهروميكانيك والمرافق (120300): شبكات الكهرباء، الصرف، المصاعد، والتكييف المركزي.\n• التشطيبات المعمارية (120400): الواجهات الحجرية، الرخام، والأبواب والأرضيات.',
              contentEn: '• Land Acquisition (120100)\n• Structural & Concrete (120200)\n• MEP Infrastructure (120300)\n• Architectural Finishing (120400)'
            },
            {
              headingAr: '3. كيفية تسجيل مستخلص مقاول أو فاتورة موقع',
              headingEn: '3. Recording Contractor Invoices',
              contentAr: 'اضغط على زر "+ تسجيل قيد / مصروف" في أعلى الشاشة أو عبر شاشة "تخصيص التكاليف (RSV)". اختر نوع التوجيه (أعمال خرسانية، كهروميكانيك...)، حدد المشروع والوحدة المستهدفة، وسيُنشئ النظام قيد اليومية الآلي (مدين: 120200 دائن: الخزينة أو البنك).',
              contentEn: 'Click "+ Add Transaction" in the Command Bar or visit Cost Allocation. Pick the category and project to generate automated journal entries.'
            }
          ]}
          targetModule="cost-allocation"
          jumpTo={jumpTo}
          isAr={isAr}
        />
      );

    case 'wf-phase4':
      return (
        <SingleChapterView
          titleAr="المرحلة 4: استلام الشيكات بالخزينة واستوديو الشيكات الذكي"
          titleEn="Phase 4: PDC Vaulting & Tranche Autolink Studio"
          categoryAr="الخزينة وأوراق القبض"
          categoryEn="Treasury & PDC Receivables"
          summaryAr="شرح استوديو تسجيل الشيكات المباشر، وكيفية ربط الشيك بالقسط التعاقدي تلقائياً والتفقيط باللغة العربية."
          summaryEn="Mastering the realistic digital cheque preview studio, installment tranche autolinking, and Egyptian legal Tafqeet."
          sections={[
            {
              headingAr: '1. استوديو معاينة الشيك البنكي المباشر',
              headingEn: '1. Interactive Physical Cheque Preview',
              contentAr: 'في أعلى نافذة تسجيل الشيك، يُعرض نموذج شيك بنكي واقعي يعكس مباشرة البنك المختار، اسم العميل، رقم الشيك، القيمة المذهبة، والتفقيط القانوني التلقائي (فقط مائتان وخمسون ألف جنيه مصري لا غير) وفقاً لأدق قواعد الصرف البنكي في مصر.',
              contentEn: 'The modal renders a realistic bank cheque updating live with bank logos, gold amounts, drawer names, and legal Arabic Tafqeet.'
            },
            {
              headingAr: '2. الربط الذكي بأقساط العقود (Tranche Autolinking)',
              headingEn: '2. Contract Installment Autolinking',
              contentAr: 'بمجرد اختيار عقد البيع، يقرأ النظام جدول الأقساط ويستخرج الأقساط غير المسددة ويعرضها كأزرار سريعة (مثل: قسط 1: 250,000 ج.م - 15/09/2026). النقر على القسط يملأ القيمة وتاريخ الاستحقاق واسم الساحب ويربط الشيك بالقسط في قاعدة البيانات تلقائياً!',
              contentEn: 'Selecting a contract automatically displays pending installment chips. Clicking any chip auto-fills the amount, due date, drawer name, and links the foreign key schedule_id.'
            },
            {
              headingAr: '3. بنوك مصر المعتمدة وأزرار الاختيار السريع',
              headingEn: '3. Egyptian Bank Presets',
              contentAr: 'بدلاً من كتابة اسم البنك يدوياً، توفر الشاشة أزراراً بضغطة واحدة لأكبر البنوك المصرية: CIB، الأهلي المصري، بنك مصر، QNB، مصرف أبوظبي الإسلامي، بنك الإسكندرية، HSBC، وبنك فيصل الإسلامي.',
              contentEn: 'One-click preset pills for leading Egyptian banks (CIB, NBE, Banque Misr, QNB, ADIB, AlexBank, HSBC, Faisal).'
            }
          ]}
          targetModule="pdc"
          jumpTo={jumpTo}
          isAr={isAr}
        />
      );

    case 'mod-cockpit':
      return (
        <SingleChapterView
          titleAr="01. لوحة القيادة والمراقبة التنفيذية (Executive Cockpit)"
          titleEn="01. Executive Financial Cockpit"
          categoryAr="شاشات المنظومة"
          categoryEn="Core Modules"
          summaryAr="الشاشة الرئيسية اليومية للرئيس التنفيذي والمدير المالي؛ تعرض الخريطة البانورامية للسيولة والتقويم الشهري وأجندة الاستحقاقات الفورية."
          summaryEn="The executive command center showing capital mindmaps, 30-day maturity calendar, and today's urgent dues."
          sections={[
            {
              headingAr: 'المكون 1: خريطة التدفقات المالية وتوزيعات رأس المال (Mindmap)',
              headingEn: 'Component 1: Capital Flow Mindmap',
              contentAr: 'مخطط شجري تفاعلي بألوان زاهية ومسارات ضوئية يربط: مصادر الأموال الداخلة (متحصلات بيع، شيكات الخزينة، رأس مال الشركاء) -> الخزينة المركزية والسيولة المتاحة -> توجيهات الصرف على مشروعات التطوير الأربعة والضرائب السيادية.',
              contentEn: 'Directed interactive tree connecting Inflows -> Central Treasury Liquidity -> Outflows onto capitalized development projects and taxes.'
            },
            {
              headingAr: 'المكون 2: التقويم المالي وجدول استحقاق الأقساط الشهري',
              headingEn: 'Component 2: Monthly Financial Calendar',
              contentAr: 'تقويم كامل يعرض أيام الشهر (من السبت إلى الجمعة)، مدمج به مؤشر سيولة اليوم، ويعرض الأقساط التعاقدية المستحقة للتحصيل نقداً باليد. الضغط على أي يوم يفتح درجاً جانبياً مفصلاً ببنود هذا اليوم مع زر تحصيل فوري.',
              contentEn: 'Interactive monthly matrix showing every day\'s contract installment dues for hand collection. Clicking any day opens the Day Agenda Inspector Drawer with one-click collection.'
            },
            {
              headingAr: 'المكون 3: أجندة واستحقاقات اليوم والتحذيرات الرقابية',
              headingEn: 'Component 3: Today\'s Executive Financial Action Ledger',
              contentAr: 'كشف فوري للأقساط المستحقة بالخزينة اليوم والأقساط المتأخرة وطلبات الاعتماد المعلقة؛ مزودة بأزرار إجراءات سريعة لتحصيل القسط نقداً باليد أو مراجعة العقد فوراً.',
              contentEn: 'Real-time briefing of hand installments maturing today, overdue arrears, and pending dual-approvals with quick collection triggers.'
            }
          ]}
          targetModule="cockpit"
          jumpTo={jumpTo}
          isAr={isAr}
        />
      );

    case 'sop-morning':
      return (
        <SingleChapterView
          titleAr="روتين الصباح: فحص الأجندة والمستحقات والتحصيل"
          titleEn="Daily Morning SOP: Action Ledger & Collections"
          categoryAr="إجراءات العمل القياسية (SOP)"
          categoryEn="Standard Operating Procedures"
          summaryAr="الخطوات الإلزامية التي يبدأ بها المحاسب والمدير المالي يوم العمل لضمان عدم فوات أي موعد استحقاق شيك أو قسط عميل."
          summaryEn="Mandatory morning sequence to verify cheque maturities, overdue arrears, and collection priorities."
          sections={[
            {
              headingAr: 'الخطوة 1: فحص جرس التنبيهات في شريط الأوامر (⌘K)',
              headingEn: 'Step 1: Check Notification Bell in Command Bar',
              contentAr: 'انظر إلى جرس التنبيهات أعلى اليمين. إذا وُجدت شارة حمراء نابضة، فهذا يعني وجود شيكات متأخرة أو فترات محاسبية تحتاج مراجعة أو طلبات اعتماد ثنائي عاجلة.',
              contentEn: 'Check the bell icon. Red pulses signify overdue cheques, unremitted taxes, or pending dual-approvals.'
            },
            {
              headingAr: 'الخطوة 2: مراجعة بطاقة "استحقاقات وأجندة اليوم"',
              headingEn: 'Step 2: Review Today\'s Financial Action Ledger',
              contentAr: 'تصفح قائمة الشيكات بالخزينة المستحقة اليوم. اتصل بالبنك أو جهز حافظة الإيداع المصرفي لإرسال الشيكات للتحصيل.',
              contentEn: 'Inspect cheques maturing today. Prepare deposit slips to dispatch cheques to their respective banks.'
            },
            {
              headingAr: 'الخطوة 3: مطابقة تحصيلات الأمس وإثبات الصرف',
              headingEn: 'Step 3: Clear Matured Cheques from Yesterday',
              contentAr: 'افتح كشف حساب البنك، وفي شاشة "حافظة الشيكات" حول الشيكات المصروفة من حالة "أرسل للتحصيل" إلى "تم الصرف" لتسجيل قيد الترحيل للبنك تلقائياً.',
              contentEn: 'Cross-check bank statement and mark cleared PDCs as Cleared in the Cheque Vault to book the automatic bank debit entry.'
            }
          ]}
          targetModule="cockpit"
          jumpTo={jumpTo}
          isAr={isAr}
        />
      );

    case 'rule-makerchecker':
      return (
        <SingleChapterView
          titleAr="نظام الاعتماد والرقابة الثنائية (Maker-Checker Dual Governance)"
          titleEn="Maker-Checker Dual Governance & Fraud Prevention"
          categoryAr="الحوكمة والرقابة المالية"
          categoryEn="Financial Governance & Internal Controls"
          summaryAr="كيف تمنع منظومة FIN-OS التلاعب المالي والأخطاء الجسيمة عبر إلزامية وجود مُنشئ للطلب ومُعتمد مستقل."
          summaryEn="How FIN-OS prevents fraud through mandatory segregation of duties between creators and approvers."
          sections={[
            {
              headingAr: '1. مبدأ الرقابة الثنائية (Segregation of Duties)',
              headingEn: '1. Segregation of Duties',
              contentAr: 'لا يمكن لمحاسب واحد إتمام عمليات مالية حساسة (مثل فسخ عقد عميل، أو صرف شيك مرتجع، أو إقفال فترة محاسبية) بمفرده. يقوم المحاسب (Maker) بإنشاء الطلب وإرفاق المبررات، بينما يقوم المدير المالي أو المراجع (Checker) بمراجعة الأثر المحاسبي واعتماده أو رفضه.',
              contentEn: 'Sensitive operations (contract rescissions, bounced cheque write-offs, period locks) require two distinct individuals: a Maker who drafts, and a Checker who approves.'
            },
            {
              headingAr: '2. العمليات الخاضعة للاعتماد الإلزامي',
              headingEn: '2. Regulated Workflows',
              contentAr: '• فسخ عقود البيع واسترداد المبالغ المدفوعة.\n• إسقاط أو إعدام شيكات مرتجعة.\n• إقفال أو إعادة فتح الفترات المحاسبية المقفلة.\n• تسوية الحسابات الدائنة والمدينة للشخصيات ذات الصلة.',
              contentEn: '• Contract cancellations and customer refunds\n• Bounced cheque write-offs\n• Locking or reopening accounting periods\n• Related-party partner equity settlements'
            }
          ]}
          targetModule="rescissions"
          jumpTo={jumpTo}
          isAr={isAr}
        />
      );

    case 'sc-keys':
      return (
        <SingleChapterView
          titleAr="لوحة الأوامر الذكية والاختصارات السريعة (⌘K)"
          titleEn="Command Bar (⌘K) & Keyboard Shortcuts"
          categoryAr="أدوات الإنتاجية السريعة"
          categoryEn="Productivity Tools"
          summaryAr="تعلم كيف تتنقل في المنظومة بسرعة البرق دون لمس الفأرة باستخدام لوحة الأوامر العالمية."
          summaryEn="Navigate FIN-OS at lightning speed using global keyboard shortcuts and command palette."
          sections={[
            {
              headingAr: '1. لوحة البحث والأوامر السريعة (⌘K / Ctrl+K)',
              headingEn: '1. Global Omni-Search (⌘K)',
              contentAr: 'في أي شاشة بالمنظومة، اضغط على ⌘K (أو Ctrl+K في ويندوز) لفتح لوحة البحث الفوري. يمكنك كتابة اسم أي عميل، أو رقم أي شيك (مثل CHQ-001)، أو رقم قيد، أو كتابة أمر مثل "استلام شيك" للانتقال فوراً.',
              contentEn: 'Press ⌘K / Ctrl+K anywhere to search across contracts, cheque serials, journal entries, or trigger direct commands.'
            },
            {
              headingAr: '2. قائمة مفاتيح الاختصار الرئيسية',
              headingEn: '2. Key Shortcuts Cheat Sheet',
              contentAr: '• ⌘K أو Ctrl+K: فتح لوحة البحث السريع.\n• ESC: إغلاق النوافذ المنبثقة والرجوع للشاشة السابقة.\n• Enter: تأكيد الحفظ في النماذج السريعة.\n• Tab: الانتقال السلس بين خانات الإدخال.',
              contentEn: '• ⌘K / Ctrl+K: Open Omni-Search\n• ESC: Close modals & drawers\n• Enter: Submit active form\n• Tab: Next input field'
            }
          ]}
          targetModule="cockpit"
          jumpTo={jumpTo}
          isAr={isAr}
        />
      );

    default:
      return (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <BookOpen size={36} color="#d4af37" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#ffffff', fontSize: '1.1rem' }}>
            {isAr ? 'اختر موضوعاً من الفهرس للبدء' : 'Select a topic from the index to begin'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            {isAr 
              ? 'يحتوي الدليل على شرح تفصيلي لدورة العمل العقارية، شاشات المنظومة، الروتين اليومي، والقواعد الرقابية.'
              : 'Browse topics covering end-to-end workflows, module specifications, daily routines, and accounting governance.'}
          </p>
        </div>
      );
  }
};

// Single Chapter Presentation Layout
interface SingleChapterViewProps {
  titleAr: string;
  titleEn: string;
  categoryAr: string;
  categoryEn: string;
  summaryAr: string;
  summaryEn: string;
  sections: Array<{
    headingAr: string;
    headingEn: string;
    contentAr: string;
    contentEn: string;
  }>;
  targetModule: string;
  jumpTo: (modId: string) => void;
  isAr: boolean;
}

const SingleChapterView: React.FC<SingleChapterViewProps> = ({
  titleAr,
  titleEn,
  categoryAr,
  categoryEn,
  summaryAr,
  summaryEn,
  sections,
  targetModule,
  jumpTo,
  isAr
}) => {
  return (
    <div>
      {/* Category Tag & Jump Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={{
          background: 'rgba(212, 175, 55, 0.15)',
          color: '#e2c974',
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '0.2rem 0.6rem',
          borderRadius: '6px'
        }}>
          {isAr ? categoryAr : categoryEn}
        </span>

        <button
          type="button"
          onClick={() => jumpTo(targetModule)}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#cbd5e1',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)';
            e.currentTarget.style.color = '#e2c974';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <span>{isAr ? 'الانتقال إلى الشاشة العملية' : 'Go to Practical Screen'}</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Main Title */}
      <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.75rem 0' }}>
        {isAr ? titleAr : titleEn}
      </h2>

      {/* Summary Box */}
      <div style={{
        background: 'rgba(212, 175, 55, 0.06)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        borderRadius: '12px',
        padding: '0.9rem 1.15rem',
        fontSize: '0.82rem',
        color: '#e2c974',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem'
      }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
        <div>{isAr ? summaryAr : summaryEn}</div>
      </div>

      {/* Itemized Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {sections.map((sec, idx) => (
          <div 
            key={idx}
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '1.1rem 1.35rem'
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
              {isAr ? sec.headingAr : sec.headingEn}
            </h4>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'pre-line', lineHeight: 1.75 }}>
              {isAr ? sec.contentAr : sec.contentEn}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
