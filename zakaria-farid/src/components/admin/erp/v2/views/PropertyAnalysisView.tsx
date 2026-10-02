'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Building2, 
  Coins, 
  TrendingUp, 
  FileCheck, 
  Search, 
  RotateCcw, 
  Layers, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Clock, 
  Calendar, 
  MapPin, 
  SlidersHorizontal, 
  Sparkles, 
  FileText, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Check,
  Percent,
  Table as TableIcon,
  ArrowDownLeft,
  ArrowRight,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem, ERPCostAllocation, ERPJournalEntry, ERPInstallmentSchedule } from '@/lib/erp/types';
import { Decimal } from '@/lib/erp/math';
import { 
  calculateSinglePropertyAnalysis, 
  calculatePortfolioMacroAnalysis,
  formatCompactEGP,
  SinglePropertyAnalysis
} from '@/lib/erp/propertyAnalysisEngine';
import { exportFeasibilityExcel, exportComprehensivePropertyAnalysisExcel } from '@/lib/erp/excelExporter';
import { ERPPalettePreset } from '@/lib/erp/erpPalettePresets';

import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { ERPApexChart } from '../charts/ERPApexChart';
import { ZFWorkstationSideWidgets } from '../common/ZFWorkstationSideWidgets';
import { ZFModalShell } from '../common/ZFModalShell';
import { getPropertyTypeLabel } from './PropertiesPortfolioView';
import { PropertyAnalysisSideWidgets } from './analysis/PropertyAnalysisSideWidgets';
import { PropertyAnalysisDossier } from './analysis/PropertyAnalysisDossier';
import { PropertyKpiBlueprintCards } from './analysis/PropertyKpiBlueprintCards';

import shellStyles from '../ZFWorkstationShell.module.css';
import vStyles from './PropertyAnalysisView.module.css';

/* --------------------------------------------------------------------------
   DETAILED EXECUTIVE DOSSIER FOR PRINT & PDF EXPORT
   -------------------------------------------------------------------------- */
const PrintableDossierContent: React.FC<{
  property: Property;
  analysis: SinglePropertyAnalysis;
  propertyCosts?: ERPPropertyCostItem[];
  contracts?: ERPContract[];
  schedules?: ERPInstallmentSchedule[];
  isAr: boolean;
}> = ({ property, analysis, contracts = [], schedules = [], isAr }) => {
  const currentDateStr = useMemo(() => {
    return new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [isAr]);

  const propertyContracts = useMemo(() => {
    return analysis.associatedContracts || contracts.filter(c => c.property_id === property.id);
  }, [analysis, contracts, property.id]);

  const totalContractedSum = useMemo(() => {
    return propertyContracts.reduce((acc, c) => acc + parseFloat(c.gross_contract_value || '0'), 0);
  }, [propertyContracts]);

  const totalCollectedSum = useMemo(() => {
    return propertyContracts.reduce((acc, c) => acc + parseFloat(c.total_cash_collected || '0'), 0);
  }, [propertyContracts]);

  const totalRemainingSum = Math.max(0, totalContractedSum - totalCollectedSum);
  const remainingRsv = analysis.expectedTotalSales.minus(analysis.contractedSales);

  const costBreakdownRows = useMemo(() => {
    const totalCap = analysis.breakdown.totalInvestedCapital.toNumber();
    return [
      {
        name: isAr ? '1. حصة الأرض والتخصيص الرأسمالي' : '1. Land Allocation & Acquisition',
        type: isAr ? 'أصل عقاري ثابت' : 'Fixed Asset',
        amount: analysis.breakdown.landCost.toNumber(),
      },
      {
        name: isAr ? '2. الهيكل الخرساني والحديد وأعمال البناء' : '2. Structural Concrete & Civil Works',
        type: isAr ? 'تشييد وبناء مباشر' : 'Direct Construction',
        amount: analysis.breakdown.structureWip.toNumber(),
      },
      {
        name: isAr ? '3. شبكات الكهروميكانيك والمرافق والتأسيس' : '3. MEP Networks & Infrastructure',
        type: isAr ? 'أعمال كهروميكانيكية' : 'MEP Infrastructure',
        amount: analysis.breakdown.mepWip.toNumber(),
      },
      {
        name: isAr ? '4. التشطيبات المعمارية والواجهات والمداخل' : '4. Architectural Finishing & Facades',
        type: isAr ? 'تشطيبات وديكور' : 'Finishing Works',
        amount: analysis.breakdown.finishingWip.toNumber(),
      },
      {
        name: isAr ? '5. التراخيص الهندسية والرسوم والضرائب' : '5. Permits, Engineering & Taxes',
        type: isAr ? 'رسوم واستشارات قانونية' : 'Regulatory & Permits',
        amount: analysis.breakdown.permitsFees.toNumber(),
      }
    ].map(item => ({
      ...item,
      sqmRate: analysis.areaSqm > 0 ? Math.round(item.amount / analysis.areaSqm) : 0,
      sharePct: totalCap > 0 ? ((item.amount / totalCap) * 100).toFixed(1) : '0.0'
    }));
  }, [analysis, isAr]);

  const milestones = useMemo(() => {
    const totalCap = analysis.breakdown.totalInvestedCapital.toNumber();
    const isCompleted = property.completion_status === 'ready' || analysis.status === 'Completed';
    return [
      {
        id: 1,
        title: isAr ? 'شراء الأرض والملكية والتخصيص' : 'Land Acquisition & Title Deed',
        stage: isAr ? 'المرحلة التأسيسية' : 'Initiation',
        status: isAr ? 'مكتمل ومعتمد' : 'Completed',
        cost: analysis.breakdown.landCost.toNumber(),
        sharePct: totalCap > 0 ? ((analysis.breakdown.landCost.toNumber() / totalCap) * 100).toFixed(1) : '0.0',
        notes: isAr ? 'تم سداد ثمن الأرض وتوثيق عقود الملكية الرسمية' : 'Land deed fully registered'
      },
      {
        id: 2,
        title: isAr ? 'التراخيص الهندسية والتصميم المعماري' : 'Permits & Architectural Engineering',
        stage: isAr ? 'المرحلة الفنية' : 'Engineering',
        status: isAr ? 'مكتمل ومعتمد' : 'Completed',
        cost: analysis.breakdown.permitsFees.toNumber(),
        sharePct: totalCap > 0 ? ((analysis.breakdown.permitsFees.toNumber() / totalCap) * 100).toFixed(1) : '0.0',
        notes: isAr ? 'رخصة البناء معتمدة والرسومات التنفيذية مسجلة' : 'Building permits approved'
      },
      {
        id: 3,
        title: isAr ? 'أعمال الهيكل الخرساني والحديد والمباني' : 'Structural Skeleton & Civil WIP',
        stage: isAr ? 'التنفيذ الإنشائي' : 'Civil Works',
        status: analysis.breakdown.structureWip.gt(0) 
          ? (isCompleted ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'قيد التنفيذ' : 'In Progress'))
          : (isAr ? 'مجدول' : 'Scheduled'),
        cost: analysis.breakdown.structureWip.toNumber(),
        sharePct: totalCap > 0 ? ((analysis.breakdown.structureWip.toNumber() / totalCap) * 100).toFixed(1) : '0.0',
        notes: isAr ? 'صب الأساسات والأعمدة والأسقف والمباني' : 'Foundations & structural slabs'
      },
      {
        id: 4,
        title: isAr ? 'الكهروميكانيك والمرافق والتأسيسات' : 'MEP Infrastructure & Rough-ins',
        stage: isAr ? 'التجهيزات الفنية' : 'MEP Installation',
        status: analysis.breakdown.mepWip.gt(0) 
          ? (isCompleted ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'قيد التنفيذ' : 'In Progress'))
          : (isAr ? 'مجدول' : 'Scheduled'),
        cost: analysis.breakdown.mepWip.toNumber(),
        sharePct: totalCap > 0 ? ((analysis.breakdown.mepWip.toNumber() / totalCap) * 100).toFixed(1) : '0.0',
        notes: isAr ? 'تمديدات السباكة والكهرباء وتأسيس المصاعد' : 'Plumbing, electrical & conduits'
      },
      {
        id: 5,
        title: isAr ? 'التشطيبات المعمارية والواجهات' : 'Finishing, Facades & Landscaping',
        stage: isAr ? 'اللمسات النهائية' : 'Finishing',
        status: analysis.breakdown.finishingWip.gt(0) 
          ? (isCompleted ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'قيد التنفيذ' : 'In Progress'))
          : (isAr ? 'مجدول' : 'Scheduled'),
        cost: analysis.breakdown.finishingWip.toNumber(),
        sharePct: totalCap > 0 ? ((analysis.breakdown.finishingWip.toNumber() / totalCap) * 100).toFixed(1) : '0.0',
        notes: isAr ? 'محارة، دهانات، رخام المداخل وتشطيب الواجهات' : 'Plaster, paints & facade stone'
      },
      {
        id: 6,
        title: isAr ? 'التسليم النهائي وإشغال الوحدات' : 'Handover & Final Occupancy',
        stage: isAr ? 'التسليم والإشغال' : 'Delivery',
        status: isCompleted
          ? (isAr ? 'مُسلَّم بالكامل' : 'Delivered') 
          : (isAr ? 'مجدول للتسليم' : 'Scheduled'),
        cost: 0,
        sharePct: '—',
        notes: isAr ? 'محاضر استلام العملاء وتفعيل خدمات المرافق' : 'Customer handover & utility operations'
      }
    ];
  }, [analysis, property, isAr]);

  return (
    <div className={vStyles.printDocPaper} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Header */}
      <div className={vStyles.printDocHeader}>
        <div className={vStyles.printBrandLeading}>
          <div className={vStyles.printBrandIconSquircle}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 className={vStyles.printBrandName}>
              {isAr ? 'مؤسسة زكريا فريد للتطوير العقاري والمقاولات' : 'Zakaria Farid Real Estate Development'}
            </h2>
            <p className={vStyles.printBrandSub}>
              {isAr ? 'نظام FIN-OS ERP: ملف دراسة الجدوى والتحليل المالي والهندسي المعتمد' : 'FIN-OS ERP: Executive Feasibility & Engineering Dossier'}
            </p>
          </div>
        </div>
        <div className={vStyles.printHeaderMeta}>
          <span className={vStyles.printMetaItem}>
            <strong>{isAr ? 'تاريخ التقرير:' : 'Report Date:'}</strong> {currentDateStr}
          </span>
          <span className={vStyles.printMetaItem}>
            <strong>{isAr ? 'مرجع الملف:' : 'Dossier Ref:'}</strong> FIN-DOS-{property.id.slice(0, 8).toUpperCase()}
          </span>
          <span className={vStyles.printMetaItem}>
            <strong>{isAr ? 'التصنيف:' : 'Classification:'}</strong> {isAr ? 'تقرير استثماري وهندسي رسمي' : 'Official Investment Audit'}
          </span>
        </div>
      </div>

      {/* 2. Banner */}
      <div className={vStyles.printDocBanner}>
        <div>
          <h3 className={vStyles.printDocTitle}>
            {property.title_ar || property.title_en || analysis.titleAr}
          </h3>
          <p className={vStyles.printDocSubtitle}>
            {isAr 
              ? `الموقع: ${property.location || 'غير محدد'} | كود المشروع: ${property.id.slice(0, 8)} | نوع العقار: ${getPropertyTypeLabel(property.type, isAr)} | الأدوار: ${analysis.floorsCount || property.floor_number || 4} طوابق`
              : `Location: ${property.location || 'N/A'} | Code: ${property.id.slice(0, 8)} | Type: ${getPropertyTypeLabel(property.type, isAr)} | Floors: ${analysis.floorsCount || property.floor_number || 4}`}
          </p>
        </div>
        <div className={vStyles.printDocStatusPill}>
          <Check size={13} color="var(--erp-accent, #2563eb)" />
          <span>
            {analysis.statusLabelAr || (property.completion_status === 'ready' 
              ? (isAr ? 'مكتمل البناء' : 'Completed') 
              : (isAr ? 'قيد التنفيذ والتطوير' : 'In Progress'))}
          </span>
        </div>
      </div>

      {/* 3. Section 1: Executive Financial KPIs */}
      <div className={vStyles.printSection}>
        <div className={vStyles.printSectionTitleWrap}>
          <TrendingUp size={15} color="var(--erp-accent, #2563eb)" />
          <h4 className={vStyles.printSectionTitle}>
            {isAr ? '1. المؤشرات المالية والاستثمارية الاستراتيجية (Executive Financial KPIs)' : '1. Strategic Financial KPIs'}
          </h4>
        </div>
        <div className={vStyles.printKpiRow}>
          <div className={vStyles.printKpiBox}>
            <span className={vStyles.printKpiLabel}>{isAr ? 'إجمالي التكلفة الاستثمارية' : 'Total Capital Invested'}</span>
            <span className={vStyles.printKpiVal}>{formatCompactEGP(analysis.breakdown.totalInvestedCapital, isAr)}</span>
            <span className={vStyles.printKpiSub}>
              {analysis.breakdown.totalInvestedCapital.toNumber().toLocaleString()} ج.م
              <br />
              {isAr ? `تكلفة المتر: ${analysis.costPerSqm.toNumber().toLocaleString()} ج.م/م²` : `Rate: ${analysis.costPerSqm.toNumber().toLocaleString()} EGP/m²`}
            </span>
          </div>

          <div className={vStyles.printKpiBox}>
            <span className={vStyles.printKpiLabel}>{isAr ? 'القيمة التقديرية الإجمالية (RSV)' : 'Target Gross RSV'}</span>
            <span className={vStyles.printKpiVal} style={{ color: 'var(--erp-accent, #2563eb)' }}>
              {formatCompactEGP(analysis.expectedTotalSales, isAr)}
            </span>
            <span className={vStyles.printKpiSub}>
              {analysis.expectedTotalSales.toNumber().toLocaleString()} ج.م
              <br />
              {isAr ? `المبيعات المبرمة: ${formatCompactEGP(analysis.contractedSales, isAr)}` : `Contracted: ${formatCompactEGP(analysis.contractedSales, isAr)}`}
            </span>
          </div>

          <div className={vStyles.printKpiBox}>
            <span className={vStyles.printKpiLabel}>{isAr ? 'صافي الأرباح المتوقعة' : 'Net Expected Profit'}</span>
            <span className={vStyles.printKpiVal} style={{ color: '#16a34a' }}>
              {formatCompactEGP(analysis.netExpectedProfit, isAr)}
            </span>
            <span className={vStyles.printKpiSub}>
              {analysis.netExpectedProfit.toNumber().toLocaleString()} ج.م
              <br />
              {isAr ? `هامش الربح: ${analysis.grossMarginPct.toNumber().toFixed(1)}%` : `Margin: ${analysis.grossMarginPct.toNumber().toFixed(1)}%`}
            </span>
          </div>

          <div className={vStyles.printKpiBox}>
            <span className={vStyles.printKpiLabel}>{isAr ? 'العائد على الاستثمار (ROI)' : 'Return on Investment'}</span>
            <span className={vStyles.printKpiVal} style={{ color: 'var(--erp-accent, #2563eb)' }}>
              {analysis.roiPct.toNumber().toFixed(1)}%
            </span>
            <span className={vStyles.printKpiSub}>
              {isAr ? `معدل استيعاب المبيعات: ${analysis.absorptionRatePct.toNumber().toFixed(1)}%` : `Absorption Rate: ${analysis.absorptionRatePct.toNumber().toFixed(1)}%`}
              <br />
              {isAr ? `المتبقي للبيع: ${formatCompactEGP(remainingRsv, isAr)}` : `Remaining RSV: ${formatCompactEGP(remainingRsv, isAr)}`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Section 2: Architectural & Engineering Specs Table */}
      <div className={vStyles.printSection}>
        <div className={vStyles.printSectionTitleWrap}>
          <Layers size={15} color="var(--erp-accent, #2563eb)" />
          <h4 className={vStyles.printSectionTitle}>
            {isAr ? '2. بطاقة البيانات المعمارية والهندسية للعقار (Architectural Specs)' : '2. Architectural & Engineering Specs'}
          </h4>
        </div>
        <table className={vStyles.printTable}>
          <thead>
            <tr>
              <th>{isAr ? 'إجمالي المساحة البنائية' : 'Built-up Area'}</th>
              <th>{isAr ? 'عدد الأدوار والطوابق' : 'Floors'}</th>
              <th>{isAr ? 'إجمالي عدد الوحدات' : 'Total Units'}</th>
              <th>{isAr ? 'الوحدات المتعاقد عليها' : 'Sold Units'}</th>
              <th>{isAr ? 'الوحدات المتبقية الشاغرة' : 'Available Units'}</th>
              <th>{isAr ? 'معدل استيعاب المبيعات' : 'Absorption Rate'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700 }}>{analysis.areaSqm} م²</td>
              <td>{analysis.floorsCount || property.floor_number || 4} {isAr ? 'طوابق' : 'floors'}</td>
              <td>{analysis.totalUnits} {isAr ? 'وحدة' : 'units'}</td>
              <td style={{ color: '#16a34a', fontWeight: 700 }}>{analysis.soldUnits} {isAr ? 'وحدة' : 'units'}</td>
              <td style={{ color: '#d97706', fontWeight: 700 }}>{analysis.remainingUnits} {isAr ? 'وحدة' : 'units'}</td>
              <td style={{ fontWeight: 800, color: 'var(--erp-accent, #2563eb)' }}>{analysis.absorptionRatePct.toNumber().toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Section 3: Project Lifecycle Milestones Pipeline Table */}
      <div className={vStyles.printSection}>
        <div className={vStyles.printSectionTitleWrap}>
          <Clock size={15} color="var(--erp-accent, #2563eb)" />
          <h4 className={vStyles.printSectionTitle}>
            {isAr ? '3. محطات دورة حياة المشروع والجدول الزمني (Project Lifecycle Milestones)' : '3. Project Lifecycle Milestones'}
          </h4>
        </div>
        <table className={vStyles.printTable}>
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>#</th>
              <th style={{ width: '25%' }}>{isAr ? 'محطة دورة الحياة' : 'Milestone Stage'}</th>
              <th style={{ width: '15%' }}>{isAr ? 'المرحلة الهندسية' : 'Phase'}</th>
              <th style={{ width: '15%' }}>{isAr ? 'الحالة الإنشائية' : 'Status'}</th>
              <th style={{ width: '18%' }}>{isAr ? 'التكلفة المحملة (ج.م)' : 'Cost (EGP)'}</th>
              <th style={{ width: '22%' }}>{isAr ? 'ملاحظات التدقيق والاعتماد' : 'Audit Notes'}</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id}>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.id}</td>
                <td style={{ fontWeight: 700 }}>{m.title}</td>
                <td>{m.stage}</td>
                <td>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.7rem', 
                    fontWeight: 700,
                    background: m.status.includes('مكتمل') || m.status.includes('Completed') || m.status.includes('Delivered') ? '#ecfdf5' : '#f8fafc',
                    color: m.status.includes('مكتمل') || m.status.includes('Completed') || m.status.includes('Delivered') ? '#047857' : '#334155',
                    border: '1px solid #cbd5e1'
                  }}>
                    {m.status}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>
                  {m.cost > 0 ? `${m.cost.toLocaleString()} ج.م` : '—'}
                </td>
                <td style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6. Section 4: Itemized Construction Costs Breakdown Table */}
      <div className={vStyles.printSection}>
        <div className={vStyles.printSectionTitleWrap}>
          <Coins size={15} color="var(--erp-accent, #2563eb)" />
          <h4 className={vStyles.printSectionTitle}>
            {isAr ? '4. سجل بنود وتكاليف الإنشاءات المعتمدة ورأس المال (Itemized Cost Breakdown)' : '4. Itemized Capital & Construction Costs'}
          </h4>
        </div>
        <table className={vStyles.printTable}>
          <thead>
            <tr>
              <th style={{ width: '32%' }}>{isAr ? 'بند التكلفة المعتمد' : 'Cost Category'}</th>
              <th style={{ width: '18%' }}>{isAr ? 'التصنيف المحاسبي' : 'Classification'}</th>
              <th style={{ width: '18%' }}>{isAr ? 'التكلفة الإجمالية (ج.م)' : 'Total Cost (EGP)'}</th>
              <th style={{ width: '18%' }}>{isAr ? 'تكلفة المتر البنائي (ج.م/م²)' : 'Rate / Sqm'}</th>
              <th style={{ width: '14%' }}>{isAr ? 'النسبة من الاستثمار' : 'Share %'}</th>
            </tr>
          </thead>
          <tbody>
            {costBreakdownRows.map((cat, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 700 }}>{cat.name}</td>
                <td>{cat.type}</td>
                <td style={{ fontWeight: 700 }}>{cat.amount.toLocaleString()} ج.م</td>
                <td>{cat.sqmRate.toLocaleString()} ج.م/م²</td>
                <td style={{ fontWeight: 700, color: 'var(--erp-accent, #2563eb)' }}>{cat.sharePct}%</td>
              </tr>
            ))}
            <tr className={vStyles.printTableTotalRow}>
              <td style={{ fontWeight: 800 }}>{isAr ? 'إجمالي الاستثمار الرأسمالي المنفذ (Total Capital)' : 'Total Capital Invested'}</td>
              <td>{isAr ? 'الأصول الإجمالية المعتمدة' : 'Consolidated Assets'}</td>
              <td style={{ fontWeight: 800 }}>{analysis.breakdown.totalInvestedCapital.toNumber().toLocaleString()} ج.م</td>
              <td style={{ fontWeight: 800 }}>{analysis.costPerSqm.toNumber().toLocaleString()} ج.م/م²</td>
              <td style={{ fontWeight: 800 }}>100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 7. Section 5: Sales Contracts & Receivables Table */}
      <div className={vStyles.printSection}>
        <div className={vStyles.printSectionTitleWrap}>
          <FileCheck size={15} color="var(--erp-accent, #2563eb)" />
          <h4 className={vStyles.printSectionTitle}>
            {isAr ? '5. عقود المبيعات المبرمة ومستحقات الأقساط (Sales Contracts & Receivables A/R)' : '5. Sales Contracts & Receivables A/R'}
          </h4>
        </div>
        {propertyContracts.length > 0 ? (
          <table className={vStyles.printTable}>
            <thead>
              <tr>
                <th style={{ width: '11%' }}>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                <th style={{ width: '19%' }}>{isAr ? 'اسم العميل' : 'Buyer'}</th>
                <th style={{ width: '10%' }}>{isAr ? 'الوحدة' : 'Unit'}</th>
                <th style={{ width: '11%' }}>{isAr ? 'تاريخ العقد' : 'Date'}</th>
                <th style={{ width: '13%' }}>{isAr ? 'إجمالي العقد' : 'Total Amount'}</th>
                <th style={{ width: '11%' }}>{isAr ? 'المقدم المدفوع' : 'Down Payment'}</th>
                <th style={{ width: '12%' }}>{isAr ? 'المحصل نقداً' : 'Collected'}</th>
                <th style={{ width: '13%' }}>{isAr ? 'المتبقي (أقساط)' : 'Remaining A/R'}</th>
              </tr>
            </thead>
            <tbody>
              {propertyContracts.slice(0, 15).map((c) => {
                const total = parseFloat(c.gross_contract_value || '0');
                const downVal = (c as any).down_payment 
                  ? parseFloat((c as any).down_payment)
                  : (schedules?.find(s => s.contract_id === (c.contract_id || (c as any).id) && s.tranche_number === 0)
                      ? parseFloat(schedules.find(s => s.contract_id === (c.contract_id || (c as any).id) && s.tranche_number === 0)!.nominal_value)
                      : 0);
                const paid = parseFloat(c.total_cash_collected || '0');
                const rem = Math.max(0, total - paid);
                const unitLabel = c.building_unit_number || c.unit_id || (isAr ? 'غير محدد' : 'N/A');
                return (
                  <tr key={c.contract_id}>
                    <td style={{ fontWeight: 700 }}>{c.contract_number || c.contract_id.slice(0, 8)}</td>
                    <td style={{ fontWeight: 600 }}>{c.buyer_name}</td>
                    <td>{unitLabel}</td>
                    <td style={{ fontSize: '0.72rem' }}>
                      {c.contract_date ? new Date(c.contract_date).toISOString().slice(0, 10) : '—'}
                    </td>
                    <td style={{ fontWeight: 700 }}>{total.toLocaleString()} ج.م</td>
                    <td style={{ fontWeight: 600 }}>{downVal > 0 ? `${downVal.toLocaleString()} ج.م` : '—'}</td>
                    <td style={{ color: '#16a34a', fontWeight: 700 }}>{paid.toLocaleString()} ج.م</td>
                    <td style={{ color: '#d97706', fontWeight: 700 }}>{rem.toLocaleString()} ج.م</td>
                  </tr>
                );
              })}
              <tr className={vStyles.printTableTotalRow}>
                <td colSpan={4} style={{ fontWeight: 800 }}>
                  {isAr 
                    ? `إجمالي مبيعات العقار (${propertyContracts.length} عقود مبرمة)`
                    : `Total Property Sales (${propertyContracts.length} Contracts)`}
                </td>
                <td style={{ fontWeight: 800 }}>{totalContractedSum.toLocaleString()} ج.م</td>
                <td style={{ fontWeight: 800 }}>
                  {propertyContracts.reduce((acc, c) => {
                    const dv = (c as any).down_payment ? parseFloat((c as any).down_payment) : (schedules?.find(s => s.contract_id === (c.contract_id || (c as any).id) && s.tranche_number === 0) ? parseFloat(schedules.find(s => s.contract_id === (c.contract_id || (c as any).id) && s.tranche_number === 0)!.nominal_value) : 0);
                    return acc + dv;
                  }, 0).toLocaleString()} ج.م
                </td>
                <td style={{ fontWeight: 800, color: '#16a34a' }}>{totalCollectedSum.toLocaleString()} ج.م</td>
                <td style={{ fontWeight: 800, color: '#d97706' }}>{totalRemainingSum.toLocaleString()} ج.م</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className={vStyles.printAuditStatement}>
            {isAr 
              ? `لا توجد عقود مبيعات مبرمة مسجلة لهذا العقار حتى تاريخه. إجمالي الوحدات المتاحة للبيع: ${analysis.remainingUnits} وحدة بقيمة تقديرية مستهدفة (RSV): ${remainingRsv.toNumber().toLocaleString()} ج.م.`
              : `No sales contracts registered for this property yet. All ${analysis.remainingUnits} units remain available with target RSV: ${remainingRsv.toNumber().toLocaleString()} EGP.`}
          </div>
        )}
      </div>

      {/* 8. Section 6: Auditing Statement & Signatures */}
      <div className={vStyles.printSection}>
        <div className={vStyles.printAuditStatement}>
          <strong>{isAr ? 'إقرار ومصادقة التدقيق المالي:' : 'Auditing Statement:'}</strong>{' '}
          {isAr 
            ? 'نقر نحن الموقعين أدناه بأن كافة البيانات المالية، وقيم التكاليف المنفذة (WIP)، وحسابات الأرباح ونسب الاستيعاب الواردة في هذا الملف مستخرجة ومطابقة تماماً لقيود اليومية وسجلات المقاولين المعتمدة بنظام FIN-OS ERP حتى تاريخه، وقد تم إعدادها وفقاً للأصول المحاسبية والمعايير الإنشائية المعتمدة للشركة.'
            : 'We hereby certify that all financial metrics, logged WIP construction costs, margins, and absorption rates presented in this dossier are directly extracted from and strictly reconciled with verified general ledger entries and contractor sub-ledgers in FIN-OS ERP.'}
        </div>
        <div className={vStyles.printSignatureRow}>
          <div className={vStyles.printSignatureBox}>
            <span className={vStyles.printSignatureTitle}>{isAr ? 'المراجع المالي والحسابات' : 'Financial Auditor'}</span>
            <div className={vStyles.printSignatureLine} />
            <span className={vStyles.printSignatureSub}>{isAr ? 'الاسم والتوقيع والتاريخ' : 'Name, Signature & Date'}</span>
          </div>
          <div className={vStyles.printSignatureBox}>
            <span className={vStyles.printSignatureTitle}>{isAr ? 'مدير المشروعات والهندسة' : 'Project Director'}</span>
            <div className={vStyles.printSignatureLine} />
            <span className={vStyles.printSignatureSub}>{isAr ? 'اعتماد نسب التنفيذ والموقع' : 'Site Progress Verification'}</span>
          </div>
          <div className={vStyles.printSignatureBox}>
            <span className={vStyles.printSignatureTitle}>{isAr ? 'المدير العام / الشريك الإداري' : 'Managing Partner'}</span>
            <div className={vStyles.printSignatureLine} />
            <span className={vStyles.printSignatureSub}>{isAr ? 'المصادقة والاعتماد النهائي' : 'Executive Approval'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Formats a property project name for ApexCharts horizontal bar charts.
 * If the name is long, splits it into an array of two lines (e.g. at separator ' – ', ' - ', ' — ', or word boundary).
 * For selected property, prefixes with ⭐ and suffixes with (المختار) or (Selected) cleanly across lines.
 */
function formatProjectChartLabel(rawName: string, isSelected: boolean, isAr: boolean): string | string[] {
  const name = (rawName || '').trim();
  const selectedTag = isSelected ? (isAr ? '(المختار)' : '(Selected)') : '';
  const prefix = isSelected ? '⭐ ' : '';

  // Check for dash separators
  const separator = [' - ', String.fromCharCode(32, 8211, 32), String.fromCharCode(32, 8212, 32)].find(sep => name.includes(sep));
  if (separator) {
    const parts = name.split(separator);
    const line1 = `${prefix}${parts[0].trim()}`;
    const line2 = isSelected 
      ? `${parts.slice(1).join(separator).trim()} ${selectedTag}`.trim()
      : parts.slice(1).join(separator).trim();
    return [line1, line2];
  }

  // If selected and longer than 20 chars, split into 2 lines
  if (isSelected) {
    if (name.length > 20) {
      const words = name.split(' ');
      const mid = Math.ceil(words.length / 2);
      const line1 = `${prefix}${words.slice(0, mid).join(' ')}`;
      const line2 = `${words.slice(mid).join(' ')} ${selectedTag}`.trim();
      return [line1, line2];
    }
    return [`${prefix}${name}`, selectedTag];
  }

  // Non-selected but long (> 24 chars)
  if (name.length > 24) {
    const words = name.split(' ');
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  return name;
}

export function getCostCategoryLabel(cat: string, isAr: boolean): string {
  switch (cat) {
    case 'land_allocation':
      return isAr ? 'حصة الأرض والتخصيص' : 'Land Allocation';
    case 'civil_structure':
      return isAr ? 'الهيكل الخرساني والحديد' : 'Civil & Structure';
    case 'labor_subcontractor':
      return isAr ? 'مصنعيات ومقاولات باطن' : 'Labor & Subcontractor';
    case 'mep_infrastructure':
      return isAr ? 'شبكات الكهروميكانيك' : 'MEP Infrastructure';
    case 'finishing_interior':
      return isAr ? 'تشطيبات وديكور داخلي' : 'Interior Finishes';
    case 'site_facade':
      return isAr ? 'واجهات ومداخل الموقع' : 'Facades & Site';
    case 'permits_engineering':
      return isAr ? 'تراخيص واستشارات هندسية' : 'Permits & Engineering';
    case 'taxes_fees':
      return isAr ? 'ضرائب ورسوم حكومية' : 'Taxes & Fees';
    default:
      return isAr ? 'مصروفات موقع عامة' : 'Site Overheads';
  }
}

export function getCostPhaseLabel(phase: string, isAr: boolean): string {
  switch (phase) {
    case 'land_acquisition':
      return isAr ? 'شراء الأرض' : 'Acquisition';
    case 'planning_permits':
      return isAr ? 'التراخيص' : 'Permits';
    case 'structural_skeleton':
      return isAr ? 'الهيكل الإنشائي' : 'Structure';
    case 'finishing_interiors':
      return isAr ? 'التشطيبات' : 'Finishes';
    case 'handover_snagging':
      return isAr ? 'التسليم' : 'Handover';
    default:
      return isAr ? 'الموقع' : 'Site';
  }
}

export interface PropertyAnalysisViewProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  contracts?: ERPContract[];
  costAllocations?: ERPCostAllocation[];
  journalEntries?: ERPJournalEntry[];
  schedules?: ERPInstallmentSchedule[];
  initialPropertyId?: string;
  initialViewMode?: 'portfolio' | 'property';
  isAr?: boolean;
  isMutating?: boolean;
  activePreset?: ERPPalettePreset;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenContractForProperty?: (property: Property, unit?: BuildingUnitItem) => void;
  onInspectContract?: (contract: ERPContract) => void;
  onNavigateTab?: (tab: string, query?: Record<string, string>) => void;
  onOpenQuickExpense?: (propertyId?: string) => void;
}

export const PropertyAnalysisView: React.FC<PropertyAnalysisViewProps> = ({
  properties = [],
  propertyCosts = [],
  contracts = [],
  costAllocations = [],
  journalEntries = [],
  schedules = [],
  initialPropertyId,
  initialViewMode,
  isAr = true,
  isMutating = false,
  activePreset,
  onUpdateSellingPrice,
  onOpenAuditForProperty,
  onOpenContractForProperty,
  onInspectContract,
  onNavigateTab,
  onOpenQuickExpense
}) => {
  const currentAccent = activePreset?.accent || '#2563eb';

  // --------------------------------------------------------------------------
  // 1. PRIMARY VIEW MODE (Portfolio Macro Studio vs. Single Property Lifecycle Dossier)
  // --------------------------------------------------------------------------
  const [viewMode, setViewMode] = useState<'portfolio' | 'property'>(() => {
    if (initialViewMode) return initialViewMode;
    return initialPropertyId ? 'property' : 'portfolio';
  });

  // Automatically switch to property mode if an initialPropertyId is provided or changes
  useEffect(() => {
    if (initialPropertyId) {
      setViewMode('property');
    }
  }, [initialPropertyId]);

  // --------------------------------------------------------------------------
  // 2. FILTER & SEARCH STATE
  // --------------------------------------------------------------------------
  const [matrixSearchQuery, setMatrixSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');

  // Selected Property for Deep Dossier
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    if (initialPropertyId) {
      const match = properties.find(p => p.id === initialPropertyId || p.slug === initialPropertyId);
      if (match) return match.id;
    }
    return properties[0]?.id || '';
  });

  // Keep selectedPropertyId in sync with initialPropertyId if search param changes
  useEffect(() => {
    if (initialPropertyId) {
      const match = properties.find(p => p.id === initialPropertyId || p.slug === initialPropertyId);
      if (match) setSelectedPropertyId(match.id);
    }
  }, [initialPropertyId, properties]);

  // Macro Studio Tabs: 2 unified dimensions (Cohesive Analytical Charts Studio & Comprehensive Matrix)
  const [activeMacroTab, setActiveMacroTab] = useState<'charts' | 'matrix'>('charts');

  // Dossier Tabs: 3 streamlined tabs (Lifecycle, Feasibility, Costs Register)
  const [activeDossierTab, setActiveDossierTab] = useState<'lifecycle' | 'feasibility' | 'costs'>('lifecycle');

  // Quick Projects Directory search
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');

  // Costs Register filters & pagination
  const [costSearchQuery, setCostSearchQuery] = useState('');
  const [costCategoryFilter, setCostCategoryFilter] = useState('ALL');
  const [costStatusFilter, setCostStatusFilter] = useState('ALL');
  const [costCurrentPage, setCostCurrentPage] = useState(1);
  const [costPageSize, setCostPageSize] = useState(8);

  // Notes state for selected property (live edit during session)
  const [propertyNotes, setPropertyNotes] = useState<Record<string, string>>({});



  // --------------------------------------------------------------------------
  // 2. FILTERING & MACRO ANALYSIS DERIVATION
  // --------------------------------------------------------------------------
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    properties.forEach(p => {
      if (p.location) set.add(p.location.trim());
    });
    return Array.from(set);
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // 1. Status
      if (statusFilter !== 'ALL') {
        const st = p.listing_status || 'active';
        if (st !== statusFilter) return false;
      }
      // 2. Region
      if (regionFilter !== 'ALL' && p.location !== regionFilter) {
        return false;
      }
      // 3. Type
      if (typeFilter !== 'ALL' && p.type !== typeFilter) {
        return false;
      }
      // 4. Period (filters by created_at)
      if (periodFilter !== 'ALL' && p.created_at) {
        const propDate = new Date(p.created_at);
        const now = new Date();
        if (periodFilter === 'current_year') {
          if (propDate.getFullYear() !== now.getFullYear()) return false;
        } else if (periodFilter === 'last_quarter') {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (propDate < ninetyDaysAgo) return false;
        }
      }
      return true;
    });
  }, [properties, statusFilter, regionFilter, typeFilter, periodFilter]);

  // Ensure selectedPropertyId points to a valid property from the properties catalog
  // Critical: Never hijack or reset selectedPropertyId when macro portfolio comparison filters change!
  useEffect(() => {
    if (properties.length > 0 && (!selectedPropertyId || !properties.some(p => p.id === selectedPropertyId))) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Compute Portfolio Macro Metrics across all filtered properties
  const macroAnalysis = useMemo(() => {
    return calculatePortfolioMacroAnalysis({
      properties: filteredProperties,
      propertyCosts,
      contracts,
      costAllocations,
      journalEntries
    });
  }, [filteredProperties, propertyCosts, contracts, costAllocations, journalEntries]);

  // Selected Property Deep Analysis
  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId) || properties[0] || null;
  }, [properties, selectedPropertyId]);

  const selectedPropertyAnalysis: SinglePropertyAnalysis | null = useMemo(() => {
    if (!selectedProperty) return null;
    return calculateSinglePropertyAnalysis({
      property: selectedProperty,
      propertyCosts,
      contracts,
      costAllocations
    });
  }, [selectedProperty, propertyCosts, contracts, costAllocations]);

  // Dedicated search filtering for the Comprehensive Matrix Table (Tab 2)
  const displayedMatrixProperties = useMemo(() => {
    if (!matrixSearchQuery.trim()) return macroAnalysis.propertiesList;
    const q = matrixSearchQuery.toLowerCase().trim();
    return macroAnalysis.propertiesList.filter(item => {
      const matchTitleAr = (item.titleAr || '').toLowerCase().includes(q);
      const matchTitleEn = (item.titleEn || '').toLowerCase().includes(q);
      const matchLoc = (item.location || '').toLowerCase().includes(q);
      const matchId = (item.propertyId || '').toLowerCase().includes(q);
      return matchTitleAr || matchTitleEn || matchLoc || matchId;
    });
  }, [macroAnalysis.propertiesList, matrixSearchQuery]);

  const resetFilters = useCallback(() => {
    setStatusFilter('ALL');
    setRegionFilter('ALL');
    setTypeFilter('ALL');
    setPeriodFilter('ALL');
  }, []);

  const hasActiveFilters = 
    statusFilter !== 'ALL' || 
    regionFilter !== 'ALL' || 
    typeFilter !== 'ALL' || 
    periodFilter !== 'ALL';

  // Map of all single property analyses for quick directory lookup
  const propertiesAnalysisMap = useMemo(() => {
    const map = new Map<string, SinglePropertyAnalysis>();
    (macroAnalysis.propertiesList || []).forEach(item => {
      map.set(item.propertyId, item);
    });
    return map;
  }, [macroAnalysis.propertiesList]);

  // Filtered properties for Quick Projects Directory
  const directoryFilteredProperties = useMemo(() => {
    if (!directorySearchQuery.trim()) return properties;
    const q = directorySearchQuery.toLowerCase().trim();
    return properties.filter(p => {
      const titleAr = (p.title_ar || '').toLowerCase();
      const titleEn = (p.title_en || '').toLowerCase();
      const loc = (p.location || '').toLowerCase();
      const code = (p.id || '').toLowerCase();
      return titleAr.includes(q) || titleEn.includes(q) || loc.includes(q) || code.includes(q);
    });
  }, [properties, directorySearchQuery]);

  // Selected property's cost items for Tab 3 Costs Register
  const selectedPropertyCostList = useMemo(() => {
    if (!selectedPropertyId) return [];
    return (propertyCosts || []).filter(c => c.property_id === selectedPropertyId);
  }, [propertyCosts, selectedPropertyId]);

  const filteredCostItems = useMemo(() => {
    return selectedPropertyCostList.filter(item => {
      if (costCategoryFilter !== 'ALL' && item.category !== costCategoryFilter) return false;
      if (costStatusFilter !== 'ALL' && item.status !== costStatusFilter) return false;
      if (costSearchQuery.trim()) {
        const q = costSearchQuery.toLowerCase().trim();
        const nameAr = (item.item_name_ar || '').toLowerCase();
        const nameEn = (item.item_name_en || '').toLowerCase();
        const contractor = (item.supplier_contractor || '').toLowerCase();
        const inv = (item.invoice_ref || '').toLowerCase();
        if (!nameAr.includes(q) && !nameEn.includes(q) && !contractor.includes(q) && !inv.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [selectedPropertyCostList, costCategoryFilter, costStatusFilter, costSearchQuery]);

  const paginatedCostItems = useMemo(() => {
    const start = (costCurrentPage - 1) * costPageSize;
    return filteredCostItems.slice(start, start + costPageSize);
  }, [filteredCostItems, costCurrentPage, costPageSize]);

  const totalCostPages = Math.ceil(filteredCostItems.length / costPageSize) || 1;

  // Feasibility comparison bar chart for Tab 2
  const feasibilityComparisonSeries = useMemo(() => {
    if (!selectedPropertyAnalysis) return [];
    return [
      {
        name: isAr ? 'القيمة (ج.م)' : 'Amount (EGP)',
        data: [
          selectedPropertyAnalysis.expectedTotalSales.toNumber(),
          selectedPropertyAnalysis.contractedSales.toNumber(),
          selectedPropertyAnalysis.breakdown.totalInvestedCapital.toNumber(),
          Math.max(0, selectedPropertyAnalysis.netExpectedProfit.toNumber()),
          selectedPropertyAnalysis.collectedCash.toNumber(),
          selectedPropertyAnalysis.pendingReceivables.toNumber(),
        ]
      }
    ];
  }, [selectedPropertyAnalysis, isAr]);

  const feasibilityComparisonOptions: ApexCharts.ApexOptions = useMemo(() => {
    return {
      chart: {
        type: 'bar',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '45%',
          borderRadius: 4
        }
      },
      dataLabels: { enabled: false },
      colors: [currentAccent],
      xaxis: {
        categories: [
          isAr ? 'القيمة البيعية (RSV)' : 'Total RSV',
          isAr ? 'المبيعات الفعلية' : 'Contracted Sales',
          isAr ? 'رأس المال المستثمر' : 'Invested Capital',
          isAr ? 'صافي الربح المتوقع' : 'Expected Profit',
          isAr ? 'النقدية المحصلة' : 'Collected Cash',
          isAr ? 'الأقساط المستحقة A/R' : 'Pending A/R',
        ],
        labels: {
          style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit' }
        }
      },
      yaxis: {
        labels: {
          style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit' },
          formatter: (val: number) => formatCompactEGP(val, isAr)
        }
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 2,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } }
      },
      tooltip: {
        y: { formatter: (val: number) => `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}` }
      }
    };
  }, [currentAccent, isAr]);

  // --------------------------------------------------------------------------
  // 3. APEXCHARTS CONFIGURATIONS (Full CAD Blueprint Cartesian Grids)
  // --------------------------------------------------------------------------
  const cartesianGridBlueprint = useMemo(() => ({
    borderColor: '#e2e8f0',
    strokeDashArray: 2,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } }
  }), []);

  // TAB 1: OVERVIEW CHARTS
  const donutColors = useMemo(() => [currentAccent, '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#64748b'], [currentAccent]);

  // Chart 1: Donut - Properties Status Distribution
  const donutStatusOptions: ApexCharts.ApexOptions = useMemo(() => {
    const labels = macroAnalysis.statusDistribution.map(d => isAr ? d.labelAr : d.labelEn);
    return {
      chart: { type: 'donut', toolbar: { show: false } },
      labels: labels.length > 0 ? labels : [isAr ? 'لا توجد بيانات' : 'No Data'],
      colors: donutColors,
      legend: { show: false }, // Rendered via reference comp HTML legend list beside chart
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        pie: {
          customScale: 0.98,
          donut: {
            size: '76%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                color: '#64748b',
                offsetY: -4
              },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: '800',
                color: '#0f172a',
                offsetY: 6,
                formatter: () => `${macroAnalysis.totalPropertiesCount}`
              },
              total: {
                show: true,
                label: isAr ? 'إجمالي العقارات' : 'Total Units',
                color: '#64748b',
                formatter: () => `${macroAnalysis.totalPropertiesCount} ${isAr ? 'عقار' : 'units'}`
              }
            }
          }
        }
      },
      stroke: { width: 2, colors: ['#ffffff'] }
    };
  }, [macroAnalysis, isAr, donutColors]);

  const donutStatusSeries = useMemo(() => {
    const counts = macroAnalysis.statusDistribution.map(d => d.count);
    return counts.length > 0 ? counts : [0];
  }, [macroAnalysis]);

  // Benchmark Comparison Projects for ROI (ensures selected property is always present)
  const benchmarkRoiProjects = useMemo(() => {
    const all = macroAnalysis.projectRoiComparison;
    const selectedItem = all.find(p => p.propertyId === selectedPropertyId);
    const otherItems = all.filter(p => p.propertyId !== selectedPropertyId);

    if (!selectedItem) {
      if (selectedPropertyAnalysis) {
        const item = {
          propertyId: selectedPropertyAnalysis.propertyId,
          propertyName: selectedPropertyAnalysis.titleAr,
          shortName: selectedPropertyAnalysis.titleAr.length > 18 ? `${selectedPropertyAnalysis.titleAr.slice(0, 16)}...` : selectedPropertyAnalysis.titleAr,
          roiPct: selectedPropertyAnalysis.roiPct.toNumber(),
          expectedProfitEgp: selectedPropertyAnalysis.netExpectedProfit.toNumber(),
          location: selectedPropertyAnalysis.location
        };
        const topOthers = all.slice(0, 5);
        return [...topOthers, item].sort((a, b) => b.roiPct - a.roiPct);
      }
      return all.slice(0, 6);
    }
    // Benchmark composition: top 5 comparison projects + selected property, sorted descending by ROI
    const topOthers = otherItems.slice(0, 5);
    return [...topOthers, selectedItem].sort((a, b) => b.roiPct - a.roiPct);
  }, [macroAnalysis.projectRoiComparison, selectedPropertyId, selectedPropertyAnalysis]);

  // Chart 2: Cartesian Bar - Expected ROI % Benchmark Comparison (Selected Property Highlighted)
  const barRoiOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = benchmarkRoiProjects.map(p => {
      const isCurrent = p.propertyId === selectedPropertyId;
      return formatProjectChartLabel(p.propertyName, isCurrent, isAr);
    });

    const barColors = benchmarkRoiProjects.map(p => {
      return p.propertyId === selectedPropertyId ? currentAccent : '#cbd5e1';
    });

    const maxVal = Math.max(...benchmarkRoiProjects.map(p => p.roiPct), 50);
    const xMax = Math.ceil((maxVal * 1.15) / 5) * 5;

    return {
      chart: { type: 'bar', toolbar: { show: false } },
      grid: cartesianGridBlueprint,
      colors: barColors.length > 0 ? barColors : [currentAccent],
      plotOptions: {
        bar: { 
          distributed: true,
          borderRadius: 6, 
          borderRadiusApplication: 'end',
          horizontal: true, 
          barHeight: '55%',
          dataLabels: { position: 'top' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}%`,
        offsetX: 0,
        style: { fontSize: '11px', fontWeight: '700', colors: ['#0f172a'] }
      },
      xaxis: {
        categories: (categories.length > 0 ? categories : [isAr ? 'لا توجد مشاريع' : 'No Projects']) as any,
        min: 0,
        max: xMax,
        tickAmount: 5,
        labels: {
          formatter: (val: number) => `${Math.round(val)}%`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' }
        },
        axisBorder: { show: true, color: '#cbd5e1' },
        axisTicks: { show: true, color: '#cbd5e1' }
      },
      yaxis: {
        labels: {
          style: { colors: '#334155', fontSize: '11px', fontWeight: '600' },
          maxWidth: 240
        }
      },
      tooltip: {
        custom: ({ dataPointIndex }: any) => {
          const item = benchmarkRoiProjects[dataPointIndex];
          if (!item) return '';
          const isCurrent = item.propertyId === selectedPropertyId;
          const roiVal = item.roiPct;
          const badgeText = isCurrent 
            ? (isAr ? 'العقار الخاضع للتحليل حالياً' : 'Property Under Analysis')
            : (isAr ? 'مشروع مرجعي للمقارنة' : 'Benchmark Property');
          const badgeBg = isCurrent ? 'rgba(37, 99, 235, 0.12)' : '#f1f5f9';
          const badgeColor = isCurrent ? currentAccent : '#64748b';
          const barColor = isCurrent ? currentAccent : '#cbd5e1';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;"><!-- design-lint: allow R20 tooltip template -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                <span style="font-size:12px; font-weight:700; color:#0f172a;">${item.propertyName}</span>
                <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${badgeBg}; color:${badgeColor};">${badgeText}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:6px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'العائد المتوقع (ROI)' : 'Expected ROI'}:</span>
                <span style="font-size:13px; font-weight:800; color:${barColor}; font-variant-numeric:tabular-nums;">${roiVal}%</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:4px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'الموقع' : 'Location'}:</span>
                <span style="font-size:11px; font-weight:600; color:#334155;">${item.location || (isAr ? 'غير محدد' : 'N/A')}</span>
              </div>
            </div>
          `;
        }
      }
    };
  }, [benchmarkRoiProjects, selectedPropertyId, isAr, currentAccent, cartesianGridBlueprint]);

  const barRoiSeries = useMemo(() => {
    const data = benchmarkRoiProjects.map(p => p.roiPct);
    return [{
      name: isAr ? 'العائد المتوقع (ROI)' : 'Expected ROI',
      data: data.length > 0 ? data : [0]
    }];
  }, [benchmarkRoiProjects, isAr]);

  // Radial Bar Gauge for Dossier Sales Performance
  const salesGaugeOptions: ApexCharts.ApexOptions = useMemo(() => {
    return {
      chart: { type: 'radialBar', sparkline: { enabled: true } },
      plotOptions: {
        radialBar: {
          hollow: { size: '58%' },
          track: { background: '#f1f5f9', strokeWidth: '100%' },
          dataLabels: {
            name: {
              show: true,
              fontSize: '11px',
              color: '#64748b',
              offsetY: -5
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: '800',
              color: '#0f172a',
              offsetY: 5,
              formatter: (val: number) => `${Math.round(val)}%`
            }
          }
        }
      },
      colors: [currentAccent],
      labels: [isAr ? 'نسبة المبيعات' : 'Sales Ratio'],
      stroke: { lineCap: 'round' }
    };
  }, [currentAccent, isAr]);

  // TAB 2: ROI & PROFITABILITY CHARTS
  // Benchmark Comparison Projects for Net Profit
  const benchmarkProfitProjects = useMemo(() => {
    const all = macroAnalysis.projectRoiComparison;
    const selectedItem = all.find(p => p.propertyId === selectedPropertyId);
    const otherItems = all.filter(p => p.propertyId !== selectedPropertyId);
    if (!selectedItem) {
      if (selectedPropertyAnalysis) {
        const item = {
          propertyId: selectedPropertyAnalysis.propertyId,
          propertyName: selectedPropertyAnalysis.titleAr,
          shortName: selectedPropertyAnalysis.titleAr.length > 18 ? `${selectedPropertyAnalysis.titleAr.slice(0, 16)}...` : selectedPropertyAnalysis.titleAr,
          roiPct: selectedPropertyAnalysis.roiPct.toNumber(),
          expectedProfitEgp: selectedPropertyAnalysis.netExpectedProfit.toNumber(),
          location: selectedPropertyAnalysis.location
        };
        const topOthers = [...all].sort((a, b) => b.expectedProfitEgp - a.expectedProfitEgp).slice(0, 5);
        return [...topOthers, item].sort((a, b) => b.expectedProfitEgp - a.expectedProfitEgp);
      }
      return all.slice(0, 6);
    }
    const topOthers = [...otherItems].sort((a, b) => b.expectedProfitEgp - a.expectedProfitEgp).slice(0, 5);
    return [...topOthers, selectedItem].sort((a, b) => b.expectedProfitEgp - a.expectedProfitEgp);
  }, [macroAnalysis.projectRoiComparison, selectedPropertyId, selectedPropertyAnalysis]);

  // Chart 2.1: Net Expected Profit (NPV in EGP)
  const barNetProfitOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = benchmarkProfitProjects.map(p => {
      const isCurrent = p.propertyId === selectedPropertyId;
      return formatProjectChartLabel(p.propertyName, isCurrent, isAr);
    });
    const barColors = benchmarkProfitProjects.map(p => {
      return p.propertyId === selectedPropertyId ? '#16a34a' : '#cbd5e1';
    });

    const maxVal = Math.max(...benchmarkProfitProjects.map(p => p.expectedProfitEgp), 10000000);
    const xMax = Math.ceil((maxVal * 1.15) / 10000000) * 10000000;

    return {
      chart: { type: 'bar', toolbar: { show: false } },
      grid: cartesianGridBlueprint,
      colors: barColors.length > 0 ? barColors : ['#16a34a'],
      plotOptions: {
        bar: { 
          distributed: true, 
          borderRadius: 6, 
          borderRadiusApplication: 'end',
          horizontal: true, 
          barHeight: '55%',
          dataLabels: { position: 'top' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${(val / 1000000).toFixed(1)} ${isAr ? 'M ج.م' : 'M EGP'}`,
        offsetX: 0,
        style: { fontSize: '11px', colors: ['#0f172a'], fontWeight: '700' }
      },
      xaxis: {
        categories: (categories.length > 0 ? categories : [isAr ? 'لا توجد مشاريع' : 'No Projects']) as any,
        min: 0,
        max: xMax,
        tickAmount: 3,
        labels: {
          formatter: (val: number) => val === 0 ? '0' : `${Math.round(val / 1000000)}M ${isAr ? 'ج.م' : 'EGP'}`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' }
        },
        axisBorder: { show: true, color: '#cbd5e1' },
        axisTicks: { show: true, color: '#cbd5e1' }
      },
      yaxis: {
        labels: {
          style: { colors: '#334155', fontSize: '11px', fontWeight: '600' },
          maxWidth: 240
        }
      },
      tooltip: {
        custom: ({ dataPointIndex }: any) => {
          const item = benchmarkProfitProjects[dataPointIndex];
          if (!item) return '';
          const isCurrent = item.propertyId === selectedPropertyId;
          const val = item.expectedProfitEgp;
          const badgeText = isCurrent 
            ? (isAr ? 'العقار الخاضع للتحليل حالياً' : 'Property Under Analysis')
            : (isAr ? 'مشروع مرجعي للمقارنة' : 'Benchmark Property');
          const badgeBg = isCurrent ? 'rgba(22, 163, 74, 0.12)' : '#f1f5f9';
          const badgeColor = isCurrent ? '#16a34a' : '#64748b';
          const barColor = isCurrent ? '#16a34a' : '#cbd5e1';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;"><!-- design-lint: allow R20 tooltip template -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                <span style="font-size:12px; font-weight:700; color:#0f172a;">${item.propertyName}</span>
                <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${badgeBg}; color:${badgeColor};">${badgeText}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:6px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'صافي الربح المتوقع' : 'Net Expected Profit'}:</span>
                <span style="font-size:13px; font-weight:800; color:${barColor}; font-variant-numeric:tabular-nums;">${formatCompactEGP(val, isAr)}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:4px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'الموقع' : 'Location'}:</span>
                <span style="font-size:11px; font-weight:600; color:#334155;">${item.location || (isAr ? 'غير محدد' : 'N/A')}</span>
              </div>
            </div>
          `;
        }
      }
    };
  }, [benchmarkProfitProjects, selectedPropertyId, isAr, cartesianGridBlueprint]);

  const barNetProfitSeries = useMemo(() => {
    const data = benchmarkProfitProjects.map(p => p.expectedProfitEgp);
    return [{
      name: isAr ? 'صافي الربح المتوقع' : 'Net Expected Profit',
      data: data.length > 0 ? data : [0]
    }];
  }, [benchmarkProfitProjects, isAr]);

  // Benchmark Comparison Projects for Gross Margin %
  const benchmarkMarginProjects = useMemo(() => {
    const all = macroAnalysis.propertiesList;
    if (!all.length) return [];
    const selectedItem = all.find(p => p.propertyId === selectedPropertyId);
    const otherItems = all.filter(p => p.propertyId !== selectedPropertyId);
    if (!selectedItem) return all.slice(0, 6);
    const topOthers = [...otherItems]
      .sort((a, b) => b.grossMarginPct.minus(a.grossMarginPct).toNumber())
      .slice(0, 5);
    return [...topOthers, selectedItem]
      .sort((a, b) => b.grossMarginPct.minus(a.grossMarginPct).toNumber());
  }, [macroAnalysis.propertiesList, selectedPropertyId]);

  // Chart 2.2: Gross Margin % by Project
  const barGrossMarginOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = benchmarkMarginProjects.map(p => {
      const isCurrent = p.propertyId === selectedPropertyId;
      const name = isAr ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
      return formatProjectChartLabel(name, isCurrent, isAr);
    });

    const barColors = benchmarkMarginProjects.map(p => {
      return p.propertyId === selectedPropertyId ? currentAccent : '#cbd5e1';
    });

    return {
      chart: { type: 'bar', toolbar: { show: false } },
      grid: cartesianGridBlueprint,
      colors: barColors.length > 0 ? barColors : [currentAccent],
      plotOptions: {
        bar: { 
          distributed: true, 
          borderRadius: 6, 
          borderRadiusApplication: 'end',
          horizontal: true, 
          barHeight: '55%',
          dataLabels: { position: 'top' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}%`,
        offsetX: 0,
        style: { fontSize: '11px', colors: ['#0f172a'], fontWeight: '700' }
      },
      xaxis: {
        categories: (categories.length > 0 ? categories : [isAr ? 'لا توجد مشاريع' : 'No Projects']) as any,
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: (val: number) => `${Math.round(val)}%`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' }
        },
        axisBorder: { show: true, color: '#cbd5e1' },
        axisTicks: { show: true, color: '#cbd5e1' }
      },
      yaxis: {
        labels: {
          style: { colors: '#334155', fontSize: '11px', fontWeight: '600' },
          maxWidth: 240
        }
      },
      tooltip: {
        custom: ({ dataPointIndex }: any) => {
          const item = benchmarkMarginProjects[dataPointIndex];
          if (!item) return '';
          const isCurrent = item.propertyId === selectedPropertyId;
          const val = Math.round(item.grossMarginPct.toNumber() * 10) / 10;
          const badgeText = isCurrent 
            ? (isAr ? 'العقار الخاضع للتحليل حالياً' : 'Property Under Analysis')
            : (isAr ? 'مشروع مرجعي للمقارنة' : 'Benchmark Property');
          const badgeBg = isCurrent ? 'rgba(37, 99, 235, 0.12)' : '#f1f5f9';
          const badgeColor = isCurrent ? currentAccent : '#64748b';
          const barColor = isCurrent ? currentAccent : '#cbd5e1';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;"><!-- design-lint: allow R20 tooltip template -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                <span style="font-size:12px; font-weight:700; color:#0f172a;">${item.titleAr || item.titleEn}</span>
                <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${badgeBg}; color:${badgeColor};">${badgeText}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:6px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'هامش الربح الإجمالي' : 'Gross Margin'}:</span>
                <span style="font-size:13px; font-weight:800; color:${barColor}; font-variant-numeric:tabular-nums;">${val}%</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:4px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'الموقع' : 'Location'}:</span>
                <span style="font-size:11px; font-weight:600; color:#334155;">${item.location || (isAr ? 'غير محدد' : 'N/A')}</span>
              </div>
            </div>
          `;
        }
      }
    };
  }, [benchmarkMarginProjects, selectedPropertyId, isAr, currentAccent, cartesianGridBlueprint]);

  const barGrossMarginSeries = useMemo(() => {
    const data = benchmarkMarginProjects.map(p => Math.round(p.grossMarginPct.toNumber() * 10) / 10);
    return [{
      name: isAr ? 'هامش الربح الإجمالي (%)' : 'Gross Margin %',
      data: data.length > 0 ? data : [0]
    }];
  }, [benchmarkMarginProjects, isAr]);

  // TAB 3: RSV & SALES CHARTS
  // Benchmark Comparison Projects for Sales vs RSV
  const benchmarkSalesProjects = useMemo(() => {
    const all = macroAnalysis.propertiesList;
    if (!all.length) return [];
    const selectedItem = all.find(p => p.propertyId === selectedPropertyId);
    const otherItems = all.filter(p => p.propertyId !== selectedPropertyId);
    if (!selectedItem) return all.slice(0, 6);
    const topOthers = [...otherItems]
      .sort((a, b) => b.expectedTotalSales.minus(a.expectedTotalSales).toNumber())
      .slice(0, 5);
    return [...topOthers, selectedItem]
      .sort((a, b) => b.expectedTotalSales.minus(a.expectedTotalSales).toNumber());
  }, [macroAnalysis.propertiesList, selectedPropertyId]);

  // Chart 3.1: Contracted Sales vs Expected Total RSV
  const barSalesVsRsvOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = benchmarkSalesProjects.map(p => {
      const isCurrent = p.propertyId === selectedPropertyId;
      const name = isAr ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
      return formatProjectChartLabel(name, isCurrent, isAr);
    });

    const maxVal = Math.max(
      ...benchmarkSalesProjects.flatMap(p => [p.contractedSales.toNumber(), p.expectedTotalSales.toNumber()]),
      10000000
    );
    const xMax = Math.ceil((maxVal * 1.15) / 10000000) * 10000000;

    return {
      chart: { type: 'bar', toolbar: { show: false } },
      grid: cartesianGridBlueprint,
      colors: [currentAccent, '#cbd5e1'],
      plotOptions: {
        bar: { 
          borderRadius: 5, 
          borderRadiusApplication: 'end',
          horizontal: true, 
          barHeight: '65%'
        }
      },
      legend: { 
        show: true, 
        position: 'bottom', 
        fontSize: '11px',
        labels: { colors: '#475569' }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: (categories.length > 0 ? categories : [isAr ? 'لا توجد مشاريع' : 'No Projects']) as any,
        min: 0,
        max: xMax,
        tickAmount: 3,
        labels: {
          formatter: (val: number) => val === 0 ? '0' : `${Math.round(val / 1000000)}M ${isAr ? 'ج.م' : 'EGP'}`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' }
        },
        axisBorder: { show: true, color: '#cbd5e1' },
        axisTicks: { show: true, color: '#cbd5e1' }
      },
      yaxis: {
        labels: {
          style: { colors: '#334155', fontSize: '11px', fontWeight: '600' },
          maxWidth: 240
        }
      },
      tooltip: {
        y: { formatter: (val: number) => formatCompactEGP(val, isAr) }
      }
    };
  }, [benchmarkSalesProjects, selectedPropertyId, isAr, currentAccent, cartesianGridBlueprint]);

  const barSalesVsRsvSeries = useMemo(() => {
    return [
      {
        name: isAr ? 'المبيعات المحققة' : 'Contracted Sales',
        data: benchmarkSalesProjects.map(p => p.contractedSales.toNumber())
      },
      {
        name: isAr ? 'القيمة التقديرية RSV' : 'Expected RSV',
        data: benchmarkSalesProjects.map(p => p.expectedTotalSales.toNumber())
      }
    ];
  }, [benchmarkSalesProjects, isAr]);

  // Benchmark Comparison Projects for Sales Absorption Rate %
  const benchmarkAbsorptionProjects = useMemo(() => {
    const all = macroAnalysis.propertiesList;
    if (!all.length) return [];
    const selectedItem = all.find(p => p.propertyId === selectedPropertyId);
    const otherItems = all.filter(p => p.propertyId !== selectedPropertyId);
    if (!selectedItem) return all.slice(0, 6);
    const topOthers = [...otherItems]
      .sort((a, b) => b.absorptionRatePct.minus(a.absorptionRatePct).toNumber())
      .slice(0, 5);
    return [...topOthers, selectedItem]
      .sort((a, b) => b.absorptionRatePct.minus(a.absorptionRatePct).toNumber());
  }, [macroAnalysis.propertiesList, selectedPropertyId]);

  // Chart 3.2: Sales Absorption Rate % by Project
  const barAbsorptionOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = benchmarkAbsorptionProjects.map(p => {
      const isCurrent = p.propertyId === selectedPropertyId;
      const name = isAr ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
      return formatProjectChartLabel(name, isCurrent, isAr);
    });

    const barColors = benchmarkAbsorptionProjects.map(p => {
      return p.propertyId === selectedPropertyId ? '#10b981' : '#cbd5e1';
    });

    return {
      chart: { type: 'bar', toolbar: { show: false } },
      grid: cartesianGridBlueprint,
      colors: barColors.length > 0 ? barColors : ['#10b981'],
      plotOptions: {
        bar: { 
          distributed: true, 
          borderRadius: 6, 
          borderRadiusApplication: 'end',
          horizontal: true, 
          barHeight: '55%',
          dataLabels: { position: 'top' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}%`,
        offsetX: 0,
        style: { fontSize: '11px', colors: ['#0f172a'], fontWeight: '700' }
      },
      xaxis: {
        categories: (categories.length > 0 ? categories : [isAr ? 'لا توجد مشاريع' : 'No Projects']) as any,
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: (val: number) => `${Math.round(val)}%`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' }
        },
        axisBorder: { show: true, color: '#cbd5e1' },
        axisTicks: { show: true, color: '#cbd5e1' }
      },
      yaxis: {
        labels: {
          style: { colors: '#334155', fontSize: '11px', fontWeight: '600' },
          maxWidth: 240
        }
      },
      tooltip: {
        custom: ({ dataPointIndex }: any) => {
          const item = benchmarkAbsorptionProjects[dataPointIndex];
          if (!item) return '';
          const isCurrent = item.propertyId === selectedPropertyId;
          const val = Math.round(item.absorptionRatePct.toNumber() * 10) / 10;
          const badgeText = isCurrent 
            ? (isAr ? 'العقار الخاضع للتحليل حالياً' : 'Property Under Analysis')
            : (isAr ? 'مشروع مرجعي للمقارنة' : 'Benchmark Property');
          const badgeBg = isCurrent ? 'rgba(16, 185, 129, 0.12)' : '#f1f5f9';
          const badgeColor = isCurrent ? '#10b981' : '#64748b';
          const barColor = isCurrent ? '#10b981' : '#cbd5e1';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;"><!-- design-lint: allow R20 tooltip template -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                <span style="font-size:12px; font-weight:700; color:#0f172a;">${item.titleAr || item.titleEn}</span>
                <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${badgeBg}; color:${badgeColor};">${badgeText}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:6px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'نسبة الاستيعاب' : 'Absorption Rate'}:</span>
                <span style="font-size:13px; font-weight:800; color:${barColor}; font-variant-numeric:tabular-nums;">${val}%</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:4px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'الموقع' : 'Location'}:</span>
                <span style="font-size:11px; font-weight:600; color:#334155;">${item.location || (isAr ? 'غير محدد' : 'N/A')}</span>
              </div>
            </div>
          `;
        }
      }
    };
  }, [benchmarkAbsorptionProjects, selectedPropertyId, isAr, cartesianGridBlueprint]);

  const barAbsorptionSeries = useMemo(() => {
    const data = benchmarkAbsorptionProjects.map(p => Math.round(p.absorptionRatePct.toNumber() * 10) / 10);
    return [{
      name: isAr ? 'نسبة الاستيعاب (%)' : 'Absorption %',
      data: data.length > 0 ? data : [0]
    }];
  }, [benchmarkAbsorptionProjects, isAr]);

  // TAB 4: INVESTMENTS BREAKDOWN CHARTS
  // Chart 4.1: Cost Categories Breakdown (Donut)
  const donutCategoriesOptions: ApexCharts.ApexOptions = useMemo(() => {
    const labels = [
      isAr ? 'حصة الأرض والتخصيص' : 'Land Allocation',
      isAr ? 'الهيكل الخرساني والحديد' : 'Structural Skeleton',
      isAr ? 'الكهروميكانيك والتأسيس' : 'MEP Infrastructure',
      isAr ? 'التشطيبات والواجهات' : 'Finishing & Facades',
      isAr ? 'التراخيص والضرائب والرسوم' : 'Permits & Taxes'
    ];
    return {
      chart: { type: 'donut', toolbar: { show: false } },
      labels,
      colors: [currentAccent, '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981'],
      legend: { position: 'bottom', fontSize: '11px', labels: { colors: '#334155' } },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${Math.round(val)}%`
      },
      plotOptions: {
        pie: {
          customScale: 0.98,
          donut: {
            size: '76%',
            labels: {
              show: true,
              total: {
                show: true,
                label: isAr ? 'إجمالي الاستثمار' : 'Total Investment',
                color: '#64748b',
                formatter: () => formatCompactEGP(macroAnalysis.totalInvestedCapital, isAr)
              }
            }
          }
        }
      }
    };
  }, [macroAnalysis, isAr, currentAccent]);

  const donutCategoriesSeries = useMemo(() => {
    const cats = macroAnalysis.categoryTotals;
    const series = [
      cats.land.toNumber(),
      cats.structure.toNumber(),
      cats.mep.toNumber(),
      cats.finishing.toNumber(),
      cats.permits.toNumber()
    ];
    return series.some(v => v > 0) ? series : [1, 1, 1, 1, 1];
  }, [macroAnalysis]);

  // Benchmark Comparison Projects for Total Invested Capital
  const benchmarkInvestmentProjects = useMemo(() => {
    const all = macroAnalysis.propertiesList;
    if (!all.length) return [];
    const selectedItem = all.find(p => p.propertyId === selectedPropertyId);
    const otherItems = all.filter(p => p.propertyId !== selectedPropertyId);
    if (!selectedItem) return all.slice(0, 6);
    const topOthers = [...otherItems]
      .sort((a, b) => b.breakdown.totalInvestedCapital.minus(a.breakdown.totalInvestedCapital).toNumber())
      .slice(0, 5);
    return [...topOthers, selectedItem]
      .sort((a, b) => b.breakdown.totalInvestedCapital.minus(a.breakdown.totalInvestedCapital).toNumber());
  }, [macroAnalysis.propertiesList, selectedPropertyId]);

  // Chart 4.2: Total Invested Capital by Project (Cartesian Bar - Horizontal)
  const barInvestmentByProjectOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = benchmarkInvestmentProjects.map(p => {
      const isCurrent = p.propertyId === selectedPropertyId;
      const title = p.titleAr || p.titleEn || '';
      return formatProjectChartLabel(title, isCurrent, isAr);
    });

    const barColors = benchmarkInvestmentProjects.map(p => {
      return p.propertyId === selectedPropertyId ? currentAccent : '#cbd5e1';
    });

    const maxVal = Math.max(
      ...benchmarkInvestmentProjects.map(p => p.breakdown.totalInvestedCapital.toNumber()),
      10000000
    );
    const xMax = Math.ceil((maxVal * 1.15) / 10000000) * 10000000;

    return {
      chart: { type: 'bar', toolbar: { show: false } },
      grid: cartesianGridBlueprint,
      colors: barColors.length > 0 ? barColors : [currentAccent],
      plotOptions: {
        bar: { 
          distributed: true, 
          borderRadius: 6, 
          borderRadiusApplication: 'end',
          horizontal: true, 
          barHeight: '55%',
          dataLabels: { position: 'top' }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${(val / 1000000).toFixed(1)} ${isAr ? 'M ج.م' : 'M EGP'}`,
        offsetX: 0,
        style: { fontSize: '11px', colors: ['#0f172a'], fontWeight: '700' }
      },
      xaxis: {
        categories: (categories.length > 0 ? categories : [isAr ? 'لا توجد مشاريع' : 'No Projects']) as any,
        min: 0,
        max: xMax,
        tickAmount: 3,
        labels: {
          formatter: (val: number) => val === 0 ? '0' : `${Math.round(val / 1000000)}M ${isAr ? 'ج.م' : 'EGP'}`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' }
        },
        axisBorder: { show: true, color: '#cbd5e1' },
        axisTicks: { show: true, color: '#cbd5e1' }
      },
      yaxis: {
        labels: {
          style: { colors: '#334155', fontSize: '11px', fontWeight: '600' },
          maxWidth: 240
        }
      },
      tooltip: {
        custom: ({ dataPointIndex }: any) => {
          const item = benchmarkInvestmentProjects[dataPointIndex];
          if (!item) return '';
          const isCurrent = item.propertyId === selectedPropertyId;
          const val = item.breakdown.totalInvestedCapital.toNumber();
          const badgeText = isCurrent 
            ? (isAr ? 'العقار الخاضع للتحليل حالياً' : 'Property Under Analysis')
            : (isAr ? 'مشروع مرجعي للمقارنة' : 'Benchmark Property');
          const badgeBg = isCurrent ? 'rgba(37, 99, 235, 0.12)' : '#f1f5f9';
          const badgeColor = isCurrent ? currentAccent : '#64748b';
          const barColor = isCurrent ? currentAccent : '#cbd5e1';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;"><!-- design-lint: allow R20 tooltip template -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                <span style="font-size:12px; font-weight:700; color:#0f172a;">${item.titleAr || item.titleEn}</span>
                <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${badgeBg}; color:${badgeColor};">${badgeText}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:6px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'إجمالي الاستثمار' : 'Total Investment'}:</span>
                <span style="font-size:13px; font-weight:800; color:${barColor}; font-variant-numeric:tabular-nums;">${formatCompactEGP(val, isAr)}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:4px;">
                <span style="font-size:11px; color:#64748b;">${isAr ? 'الموقع' : 'Location'}:</span>
                <span style="font-size:11px; font-weight:600; color:#334155;">${item.location || (isAr ? 'غير محدد' : 'N/A')}</span>
              </div>
            </div>
          `;
        }
      }
    };
  }, [benchmarkInvestmentProjects, selectedPropertyId, isAr, currentAccent, cartesianGridBlueprint]);

  const barInvestmentByProjectSeries = useMemo(() => {
    const data = benchmarkInvestmentProjects.map(p => p.breakdown.totalInvestedCapital.toNumber());
    return [{
      name: isAr ? 'إجمالي الاستثمار المنفذ' : 'Invested Capital',
      data: data.length > 0 ? data : [0]
    }];
  }, [benchmarkInvestmentProjects, isAr]);

  // --------------------------------------------------------------------------
  // 4. ACTION HANDLERS
  // --------------------------------------------------------------------------
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);

  const handleExportPropertyReport = useCallback(() => {
    if (!selectedPropertyAnalysis) return;
    setShowPrintPreviewModal(true);
  }, [selectedPropertyAnalysis]);

  const handleExportPropertyPdf = useCallback(() => {
    if (!selectedPropertyAnalysis) return;
    setShowPrintPreviewModal(true);
  }, [selectedPropertyAnalysis]);

  const handleExportPropertyExcel = useCallback(async () => {
    if (!selectedProperty || !selectedPropertyAnalysis) return;
    try {
      await exportComprehensivePropertyAnalysisExcel({
        property: selectedProperty,
        analysis: selectedPropertyAnalysis,
        propertyCosts: propertyCosts as any,
        contracts: contracts as any,
        isAr
      });

      toast.success(
        isAr 
          ? `تم تصدير ملف إكسل التفصيلي للعقار: ${selectedPropertyAnalysis.titleAr}`
          : `Exported comprehensive Excel dossier for: ${selectedPropertyAnalysis.titleEn}`
      );
    } catch (err) {
      console.error(err);
      toast.error(isAr ? 'حدث خطأ أثناء تصدير إكسل' : 'Error exporting Excel');
    }
  }, [selectedProperty, selectedPropertyAnalysis, propertyCosts, contracts, isAr]);

  const handleViewModeChange = useCallback((mode: 'portfolio' | 'property') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', mode);
      if (mode === 'property' && selectedPropertyId) {
        url.searchParams.set('propertyId', selectedPropertyId);
      } else if (mode === 'portfolio') {
        url.searchParams.delete('propertyId');
      }
      window.history.replaceState(null, '', url.toString());
    }
  }, [selectedPropertyId]);

  const handleSelectAndInspectProperty = useCallback((propId: string) => {
    setSelectedPropertyId(propId);
    setViewMode('property');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'property');
      url.searchParams.set('propertyId', propId);
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  const handleSelectProperty = useCallback((propId: string) => {
    setSelectedPropertyId(propId);
    if (typeof window !== 'undefined' && viewMode === 'property') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'property');
      url.searchParams.set('propertyId', propId);
      window.history.replaceState(null, '', url.toString());
    }
  }, [viewMode]);

  return (
    <div className={vStyles.containerQueryContext} dir={isAr ? 'rtl' : 'ltr'}>
      {/* HEADER ROW */}
      <div className={vStyles.headerRow}>
        <div className={vStyles.titleArea}>
          <h1 className={vStyles.pageTitle}>
            {isAr ? 'تحليل العقارات ودورة الحياة والجدوى' : 'Property Lifecycle & Investment Analysis'}
          </h1>
          <p className={vStyles.subtitle}>
            {isAr 
              ? 'متابعة دورة حياة العقار من الشراء والتراخيص والتنفيذ وحتى البيع والتسليم النهائي مع احتساب التكاليف والأرباح'
              : 'End-to-end property lifecycle tracking, milestone auditing, real construction costs, RSV, and sales margins'}
          </p>
        </div>

        <div className={vStyles.headerActions}>
          <button 
            type="button" 
            className={vStyles.headerBtn}
            onClick={viewMode === 'portfolio' ? () => { if (typeof window !== 'undefined') window.print(); } : handleExportPropertyReport}
          >
            <Printer size={14} />
            <span>{viewMode === 'portfolio' ? (isAr ? 'طباعة تقرير المحفظة' : 'Print Portfolio') : (isAr ? 'طباعة تقرير العقار' : 'Print Dossier')}</span>
          </button>
          
          <button 
            type="button" 
            className={`${vStyles.headerBtn} ${vStyles.headerBtnPrimary}`}
            onClick={handleExportPropertyExcel}
          >
            <TableIcon size={14} />
            <span>{isAr ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: MACRO PORTFOLIO STUDIO */}
      {/* ========================================================================= */}
      {viewMode === 'portfolio' && (
        <>

      {/* 2. PORTFOLIO BENCHMARK SCOPE & PILL FILTERS */}
      <div className={vStyles.portfolioScopeBar}>
        <div className={vStyles.scopeLeading}>
          <div className={vStyles.scopeIconSquircle}>
            <SlidersHorizontal size={13} color="var(--erp-accent, #2563eb)" />
          </div>
          <div className={vStyles.scopeLabelWrap}>
            <span className={vStyles.scopeTitle}>
              {isAr ? 'نطاق مقارنة المحفظة' : 'Portfolio Benchmark Scope'}
            </span>
            <span className={vStyles.scopeSubtitle}>
              {isAr 
                ? `تصفية المؤشرات الكلية ومشاريع المقارنة (${filteredProperties.length} من ${properties.length} عقار)`
                : `Filter macro indicators & benchmarks (${filteredProperties.length} of ${properties.length} units)`}
            </span>
          </div>
        </div>

        <div className={vStyles.scopeFiltersRow}>
          {/* Status Filter */}
          <div className={vStyles.scopeFilterItem}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={vStyles.scopePillSelect}
              aria-label={isAr ? 'تصفية بالحالة' : 'Filter by status'}
            >
              <option value="ALL">{isAr ? 'كافة الحالات' : 'All Statuses'}</option>
              <option value="active">{isAr ? 'متاح للبيع' : 'Available'}</option>
              <option value="under_offer">{isAr ? 'تحت الحجز' : 'Under Offer'}</option>
              <option value="sold">{isAr ? 'مباع' : 'Sold'}</option>
              <option value="archived">{isAr ? 'مؤرشف' : 'Archived'}</option>
            </select>
          </div>

          {/* Region Filter */}
          <div className={vStyles.scopeFilterItem}>
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className={vStyles.scopePillSelect}
              aria-label={isAr ? 'تصفية بالمنطقة' : 'Filter by location'}
            >
              <option value="ALL">{isAr ? 'جميع المناطق' : 'All Regions'}</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className={vStyles.scopeFilterItem}>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={vStyles.scopePillSelect}
              aria-label={isAr ? 'تصفية بنوع العقار' : 'Filter by type'}
            >
              <option value="ALL">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
              <option value="apartment">{isAr ? 'شقة سكنية' : 'Apartment'}</option>
              <option value="building">{isAr ? 'عمارة كاملة' : 'Building'}</option>
              <option value="villa">{isAr ? 'فيلا مستقلة' : 'Villa'}</option>
              <option value="duplex">{isAr ? 'دوبلكس' : 'Duplex'}</option>
            </select>
          </div>

          {/* Period Filter */}
          <div className={vStyles.scopeFilterItem}>
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              className={vStyles.scopePillSelect}
              aria-label={isAr ? 'الفترة الزمنية' : 'Time Period'}
            >
              <option value="ALL">{isAr ? 'كل الفترات' : 'All Periods'}</option>
              <option value="current_year">{isAr ? 'العام الحالي 2026' : 'Current Year'}</option>
              <option value="last_quarter">{isAr ? 'الربع الأخير (90 يوماً)' : 'Last Quarter'}</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className={vStyles.resetBtn}
              title={isAr ? 'إعادة ضبط نطاق المقارنة' : 'Reset scope filters'}
            >
              <RotateCcw size={12} />
              <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 DISCRETE FLOATING KPI CARDS WITH WAVE SPARKLINES */}
      <ZFKpiGrid>
        {/* KPI 1: عدد العقارات والمشاريع */}
        <ZFKpiCard
          title={isAr ? 'عدد العقارات والمشاريع' : 'Properties & Projects Count'}
          value={macroAnalysis.totalPropertiesCount}
          unitLabel={isAr ? 'عقار' : 'units'}
          icon={<Building2 size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={[10, 12, 14, 15, 17, 19, macroAnalysis.totalPropertiesCount || 20]}
          delta={{ value: '+8.4%', isPositive: true, label: isAr ? 'نمو المحفظة' : 'portfolio growth' }}
          subtitleLabel={isAr ? 'الوحدات المصفاة' : 'Filtered in view'}
          subtitleValue={`${filteredProperties.length} ${isAr ? 'عقار' : 'units'}`}
        />

        {/* KPI 2: إجمالي الاستثمار في العقارات */}
        <ZFKpiCard
          title={isAr ? 'إجمالي الاستثمار في العقارات' : 'Total Invested Capital'}
          value={formatCompactEGP(macroAnalysis.totalInvestedCapital, isAr)}
          icon={<Coins size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={[30, 38, 45, 52, 60, 68, 75]}
          delta={{ value: '+12.1%', isPositive: true, label: isAr ? 'رأس مال منفق' : 'invested' }}
          subtitleLabel={isAr ? 'تكاليف الأرض والإنشاءات' : 'Land + Incurred WIP'}
          subtitleValue={formatCompactEGP(macroAnalysis.totalConstructionWip, isAr)}
        />

        {/* KPI 3: إجمالي المبيعات المحققة */}
        <ZFKpiCard
          title={isAr ? 'إجمالي المبيعات المحققة' : 'Contracted Sales Volume'}
          value={formatCompactEGP(macroAnalysis.totalContractedSales, isAr)}
          icon={<FileCheck size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={[40, 52, 63, 71, 80, 89, 96]}
          delta={{ value: '+15.3%', isPositive: true, label: isAr ? 'مبيعات تعاقدية' : 'contracted' }}
          subtitleLabel={isAr ? 'إجمالي القيمة التقديرية' : 'Expected Total RSV'}
          subtitleValue={formatCompactEGP(macroAnalysis.totalExpectedSales, isAr)}
        />

        {/* KPI 4: إجمالي الأرباح المتوقعة */}
        <ZFKpiCard
          title={isAr ? 'إجمالي الأرباح المتوقعة' : 'Expected Gross Margin'}
          value={formatCompactEGP(macroAnalysis.totalExpectedProfit, isAr)}
          icon={<TrendingUp size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={[15, 19, 23, 27, 31, 35, 40]}
          delta={{ value: `${macroAnalysis.averageGrossMarginPct.toFixed(1)}%`, isPositive: macroAnalysis.averageGrossMarginPct.gte(0), label: isAr ? 'متوسط الهامش' : 'margin' }}
          subtitleLabel={isAr ? 'متوسط هامش الربح' : 'Avg Margin %'}
          subtitleValue={`${macroAnalysis.averageGrossMarginPct.toFixed(1)}%`}
        />
      </ZFKpiGrid>

      {/* PORTFOLIO MACRO ANALYTICS STUDIO (ملخص المحفظة) */}
      <div className={vStyles.macroStudioCard}>
        <div className={vStyles.sectionHeaderRow}>
          <div className={vStyles.sectionTitleWrap}>
            <div className={vStyles.cardIconSquircle}>
              <BarChart3 size={15} />
            </div>
            <h3 className={vStyles.sectionTitle}>
              {isAr ? 'ملخص المحفظة والتحليلات الكلية' : 'Portfolio Macro Analytics Studio'}
            </h3>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
            {isAr ? `محدث فورياً (${filteredProperties.length} عقار)` : `Real-time (${filteredProperties.length} properties)`}
          </span>
        </div>

        {/* Underline Tabs */}
        <div className={vStyles.underlineTabsList} role="tablist">
          <button
            type="button"
            role="tab"
            id="macro-tab-charts"
            aria-controls="macro-panel-charts"
            aria-selected={activeMacroTab === 'charts'}
            className={`${vStyles.underlineTabBtn} ${activeMacroTab === 'charts' ? vStyles.underlineTabBtnActive : ''}`}
            onClick={() => setActiveMacroTab('charts')}
          >
            <BarChart3 size={14} />
            <span>{isAr ? 'لوحة التحليلات والمخططات البيانية' : 'Portfolio Analytical Studio'}</span>
          </button>

          <button
            type="button"
            role="tab"
            id="macro-tab-matrix"
            aria-controls="macro-panel-matrix"
            aria-selected={activeMacroTab === 'matrix'}
            className={`${vStyles.underlineTabBtn} ${activeMacroTab === 'matrix' ? vStyles.underlineTabBtnActive : ''}`}
            onClick={() => setActiveMacroTab('matrix')}
          >
            <TableIcon size={14} />
            <span>{isAr ? 'جدول مقارنة المحفظة الشامل' : 'Portfolio Matrix'}</span>
          </button>
        </div>

        {/* TAB MATRIX: Comprehensive Portfolio Comparison Table (All 12 Canonical Columns) */}
        {activeMacroTab === 'matrix' && (
          <div className={vStyles.masterTableContainer} role="tabpanel" id="macro-panel-matrix" aria-labelledby="macro-tab-matrix">
            <div className={vStyles.matrixTableToolbar}>
              <div className={vStyles.matrixSearchInputWrap}>
                <Search size={14} className={vStyles.matrixSearchIcon} />
                <input
                  type="text"
                  value={matrixSearchQuery}
                  onChange={e => setMatrixSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث في جدول مقارنة العقارات بالاسم أو الكود أو الموقع...' : 'Search in comparison matrix by name, code, or location...'}
                  className={vStyles.matrixSearchInput}
                  aria-label={isAr ? 'بحث في جدول مقارنة العقارات' : 'Search comparison matrix'}
                />
                {matrixSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMatrixSearchQuery('')}
                    className={vStyles.matrixSearchClearBtn}
                    title={isAr ? 'مسح البحث' : 'Clear search'}
                    aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className={vStyles.matrixCountBadge}>
                {isAr 
                  ? `عرض ${displayedMatrixProperties.length} من أصل ${macroAnalysis.propertiesList.length} عقار`
                  : `Showing ${displayedMatrixProperties.length} of ${macroAnalysis.propertiesList.length} units`}
              </div>
            </div>

            <div className={vStyles.matrixTableScrollWrapper}>
              <table className={vStyles.contractsTable} style={{ minWidth: '980px' }}>
              <thead className={vStyles.contractsThead}>
                <tr>
                  <th scope="col" className={vStyles.contractsTh} style={{ width: '32px', textAlign: 'center' }}>#</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'كود العقار' : 'Code'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'اسم العقار والموقع' : 'Property & Location'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'النوع' : 'Type'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'المساحة (م²)' : 'Area (sqm)'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'الوحدات (المباع/الإجمالي)' : 'Units (Sold/Total)'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'إجمالي الاستثمار' : 'Total Investment'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'القيمة التقديرية (RSV)' : 'RSV'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'صافي الربح المتوقع' : 'Expected Profit'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'العائد (ROI %)' : 'ROI %'}</th>
                  <th scope="col" className={vStyles.contractsTh}>{isAr ? 'مرحلة دورة الحياة' : 'Lifecycle Stage'}</th>
                  <th scope="col" className={vStyles.contractsTh} style={{ textAlign: 'center' }}>{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {displayedMatrixProperties.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>
                      {isAr ? 'لا توجد عقارات مطابقة لمعايير البحث في جدول المقارنة' : 'No matching properties found in comparison matrix'}
                    </td>
                  </tr>
                ) : (
                  displayedMatrixProperties.map((item, idx) => {
                    const isSelected = item.propertyId === selectedPropertyId;
                    const activeMilestone = item.milestones.find(m => m.status === 'in_progress') || 
                      [...item.milestones].reverse().find(m => m.status === 'completed') || 
                      item.milestones[0];
                    const isDone = activeMilestone?.status === 'completed';
                    const isProg = activeMilestone?.status === 'in_progress';

                    return (
                      <tr
                        key={item.propertyId}
                        className={`${vStyles.contractsRow} ${isSelected ? vStyles.selectedTableRow : ''}`}
                        onClick={() => handleSelectAndInspectProperty(item.propertyId)}
                        tabIndex={0}
                        role="button"
                        aria-label={isAr ? `فحص ملف عقار ${item.titleAr}` : `Inspect property dossier ${item.titleEn}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectAndInspectProperty(item.propertyId);
                          }
                        }}
                      >
                        <td className={vStyles.tableIndexCell}>
                          {idx + 1}
                        </td>
                        <td className={vStyles.tableCodeCell}>
                          #{item.propertyId.slice(0, 8)}
                        </td>
                        <td className={vStyles.contractsTd}>
                          <div className={vStyles.tablePropTitleWrap}>
                            <span className={vStyles.tablePropTitle}>{isAr ? item.titleAr : item.titleEn}</span>
                            <span className={vStyles.tablePropLocation}>
                              <MapPin size={10} />
                              {item.location || (isAr ? 'غير محدد' : '-')}
                            </span>
                          </div>
                        </td>
                        <td className={vStyles.contractsTd}>
                          <span className={vStyles.tableTypePill}>
                            {item.type === 'building' ? (isAr ? 'عمارة كاملة' : 'Building') :
                             item.type === 'villa' ? (isAr ? 'فيلا مستقلة' : 'Villa') :
                             item.type === 'commercial' ? (isAr ? 'تجاري' : 'Commercial') :
                             item.type === 'penthouse' ? (isAr ? 'بنتهاوس' : 'Penthouse') :
                             item.type === 'duplex' ? (isAr ? 'دوبلكس' : 'Duplex') :
                             (isAr ? 'شقة سكنية' : 'Apartment')}
                          </span>
                        </td>
                        <td className={vStyles.contractsTd} style={{ fontWeight: 600 }}>
                          {item.areaSqm} م²
                        </td>
                        <td className={vStyles.contractsTd} style={{ fontWeight: 600 }}>
                          {item.soldUnits} / {item.totalUnits}
                        </td>
                        <td className={vStyles.contractsTd} style={{ fontWeight: 700 }}>
                          {formatCompactEGP(item.breakdown.totalInvestedCapital, isAr)}
                        </td>
                        <td className={vStyles.contractsTd} style={{ fontWeight: 700 }}>
                          {formatCompactEGP(item.expectedTotalSales, isAr)}
                        </td>
                        <td className={vStyles.contractsTd} style={{ fontWeight: 700, color: item.netExpectedProfit.gte(0) ? '#16a34a' : '#dc2626' }}>
                          {formatCompactEGP(item.netExpectedProfit, isAr)}
                        </td>
                        <td className={vStyles.contractsTd} style={{ fontWeight: 800, color: currentAccent }}>
                          {item.roiPct.toFixed(1)}%
                        </td>
                        <td className={vStyles.contractsTd}>
                          <span className={`${shellStyles.statusPill} ${isDone ? shellStyles.statusPillGreen : (isProg ? shellStyles.statusPillAmber : shellStyles.statusPillNeutral)}`}>
                            {isAr ? (activeMilestone?.shortAr || activeMilestone?.titleAr || item.statusLabel) : (activeMilestone?.shortEn || activeMilestone?.titleEn || item.statusLabel)}
                          </span>
                        </td>
                        <td className={vStyles.contractsTd} style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={vStyles.tableActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAndInspectProperty(item.propertyId);
                            }}
                            title={isAr ? 'الانتقال لفحص دورة حياة هذا العقار بالتفصيل' : 'Inspect lifecycle dossier'}
                          >
                            <ArrowRight size={12} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                            <span>{isAr ? 'فحص ملف العقار ↗' : 'Inspect Dossier ↗'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unified CAD Blueprint Analytical Charts Grid */}
        {activeMacroTab === 'charts' && (
          <div className={vStyles.chartsGrid} role="tabpanel" id="macro-panel-charts" aria-labelledby="macro-tab-charts">
            {/* Chart 1: Donut - Status Distribution with Reference Comp Side Legend */}
            <div className={vStyles.chartContainerCard}>
              <div className={vStyles.chartHeader}>
                <div className={vStyles.chartTitleWrap}>
                  <PieChartIcon size={14} color={currentAccent} />
                  <h4 className={vStyles.chartTitle}>
                    {isAr ? 'توزيع حالة العقارات والوحدات' : 'Property Status Distribution'}
                  </h4>
                </div>
                <span className={vStyles.chartSubtitle}>
                  {isAr ? 'النسب المئوية للأعداد بالمحفظة' : 'Share of inventory'}
                </span>
              </div>
              <div className={vStyles.donutWithLegendGrid}>
                <div className={vStyles.donutChartArea}>
                  <ERPApexChart
                    type="donut"
                    series={donutStatusSeries}
                    options={donutStatusOptions}
                    height={220}
                    isAr={isAr}
                    primaryColor={currentAccent}
                  />
                </div>
                <div className={vStyles.donutLegendList}>
                  {macroAnalysis.statusDistribution.map((item, idx) => {
                    const isSelectedStatus = selectedPropertyAnalysis?.status === item.status;
                    return (
                      <div key={item.status} className={vStyles.donutLegendItem}>
                        <div className={vStyles.donutLegendItemLeading}>
                          <span 
                            className={vStyles.donutLegendDot} 
                            style={{ backgroundColor: donutColors[idx % donutColors.length] }} 
                          />
                          <span className={vStyles.donutLegendLabel}>
                            {isAr ? item.labelAr : item.labelEn}
                          </span>
                          {isSelectedStatus && (
                            <span className={vStyles.donutSelectedPropertyTag}>
                              {isAr ? 'العقار المختار' : 'Selected'}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className={vStyles.donutLegendValue}>
                            {item.count}
                          </span>
                          <span className={vStyles.donutLegendPct}>
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {selectedPropertyAnalysis && (
                    <div className={vStyles.donutFocalNote}>
                      <div className={vStyles.donutFocalNoteLeading}>
                        <div className={vStyles.cardIconSquircle} style={{ width: 22, height: 22 }}>
                          <Building2 size={12} />
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 700 }}>
                          {isAr ? 'موقع العقار المختار بالمحفظة' : 'Selected Property Position'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                        {isAr 
                          ? `العقار "${selectedPropertyAnalysis.titleAr}" حالته (${selectedPropertyAnalysis.statusLabel}) ويمثل حصة ${((1 / Math.max(1, macroAnalysis.totalPropertiesCount)) * 100).toFixed(1)}% من إجمالي عقارات المحفظة (${macroAnalysis.totalPropertiesCount} عقار)`
                          : `Property "${selectedPropertyAnalysis.titleEn}" is (${selectedPropertyAnalysis.statusLabel}), accounting for ${((1 / Math.max(1, macroAnalysis.totalPropertiesCount)) * 100).toFixed(1)}% of total portfolio (${macroAnalysis.totalPropertiesCount} units).`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart 2: Cartesian Bar - ROI % Benchmark Comparison */}
            <div className={vStyles.chartContainerCard}>
              <div className={vStyles.chartHeader}>
                <div className={vStyles.chartTitleWrap}>
                  <BarChart3 size={14} color={currentAccent} />
                  <h4 className={vStyles.chartTitle}>
                    {isAr ? 'مقارنة العائد المتوقع (ROI %) مع العقار المختار' : 'Expected ROI Benchmark vs Selected Property'}
                  </h4>
                </div>
                <span className={vStyles.chartSubtitle}>
                  {isAr ? 'العقار المختار مميز باللون والرمز ⭐ مقارنة بأعلى المشاريع' : 'Selected property highlighted ⭐ vs top projects'}
                </span>
              </div>
              <ERPApexChart
                type="bar"
                series={barRoiSeries}
                options={barRoiOptions}
                height={340}
                isAr={isAr}
                primaryColor={currentAccent}
              />
            </div>

            {/* Chart 3: Net Expected Profit (NPV) */}
            <div className={vStyles.chartContainerCard}>
              <div className={vStyles.chartHeader}>
                <div className={vStyles.chartTitleWrap}>
                  <TrendingUp size={14} color="#16a34a" />
                  <h4 className={vStyles.chartTitle}>
                    {isAr ? 'صافي الأرباح المتوقعة بالمشروع (ج.م)' : 'Net Expected Profit by Project'}
                  </h4>
                </div>
                <span className={vStyles.chartSubtitle}>
                  {isAr ? 'الأرباح بعد خصم الأرض والبناء' : 'Net after full WIP'}
                </span>
              </div>
              <ERPApexChart
                type="bar"
                series={barNetProfitSeries}
                options={barNetProfitOptions}
                height={340}
                isAr={isAr}
                primaryColor="#16a34a"
              />
            </div>

            {/* Chart 4: Cost Categories Breakdown (Donut) */}
            <div className={vStyles.chartContainerCard}>
              <div className={vStyles.chartHeader}>
                <div className={vStyles.chartTitleWrap}>
                  <Coins size={14} color={currentAccent} />
                  <h4 className={vStyles.chartTitle}>
                    {isAr ? 'توزيع الاستثمارات حسب بنود التكلفة' : 'Investment by Cost Category'}
                  </h4>
                </div>
                <span className={vStyles.chartSubtitle}>
                  {isAr ? 'الأرض والخرسانات والتشطيبات والتراخيص' : 'WIP category distribution'}
                </span>
              </div>
              <ERPApexChart
                type="donut"
                series={donutCategoriesSeries}
                options={donutCategoriesOptions}
                height={340}
                isAr={isAr}
                primaryColor={currentAccent}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: SINGLE PROPERTY LIFECYCLE DOSSIER */}
      {/* ========================================================================= */}
      {viewMode === 'property' && (
        <>
          {/* 4 DISCRETE FLOATING PROPERTY-SPECIFIC BLUEPRINT KPI CARDS */}
          {selectedPropertyAnalysis && (
            <PropertyKpiBlueprintCards
              analysis={selectedPropertyAnalysis}
              isAr={isAr}
              currentAccent={currentAccent}
            />
          )}

          {/* SELECTED PROPERTY DEEP DOSSIER (تحليل دورة حياة العقار المختار) */}
          <PropertyAnalysisDossier
            properties={properties}
            propertiesAnalysisMap={propertiesAnalysisMap}
            selectedProperty={selectedProperty}
            selectedPropertyAnalysis={selectedPropertyAnalysis}
            propertyCosts={propertyCosts}
            onSelectProperty={handleSelectAndInspectProperty}
            activeDossierTab={activeDossierTab}
            onDossierTabChange={setActiveDossierTab}
            onInspectContract={onInspectContract}
            onOpenContractForProperty={onOpenContractForProperty}
            onNavigateTab={onNavigateTab}
            onOpenNewContract={() => {
              if (selectedProperty && onOpenContractForProperty) {
                onOpenContractForProperty(selectedProperty);
              } else if (onNavigateTab) {
                onNavigateTab('properties');
              }
            }}
            onOpenQuickExpense={onOpenQuickExpense}
            currentAccent={currentAccent}
            isAr={isAr}
          />
        </>
      )}

      {/* COMPANION SIDE WIDGETS (COLUMN 3 PORTAL) */}
      <ZFWorkstationSideWidgets>
        <PropertyAnalysisSideWidgets
          properties={properties}
          propertiesAnalysisMap={propertiesAnalysisMap}
          selectedPropertyId={selectedPropertyId}
          onSelectProperty={handleSelectAndInspectProperty}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          isAr={isAr}
        />
      </ZFWorkstationSideWidgets>

      {/* PRINT PREVIEW MODAL */}
      {selectedProperty && selectedPropertyAnalysis && (
        <ZFModalShell
          isOpen={showPrintPreviewModal}
          onClose={() => setShowPrintPreviewModal(false)}
          title={isAr ? `معاينة تقرير ودراسة جدوى: ${selectedPropertyAnalysis.titleAr}` : `Dossier Preview: ${selectedPropertyAnalysis.titleEn}`}
          subtitle={isAr ? 'تقرير استثماري وهندسي مفصل جاهز للطباعة المباشرة وحفظ PDF' : 'Itemized investment & engineering dossier ready for direct printing & PDF export'}
          icon={<Printer size={18} color="var(--erp-accent, #2563eb)" />}
          maxWidth="1020px"
          isAr={isAr}
        >
          <div className={vStyles.printPreviewContainer}>
            <div className={vStyles.printPreviewActionBar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={16} color="var(--erp-accent, #2563eb)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  {isAr ? 'معاينة المستند الرسمي قبل الطباعة' : 'Official Document Print Preview'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className={vStyles.printPreviewActionBtnSecondary}
                  onClick={() => setShowPrintPreviewModal(false)}
                >
                  <span>{isAr ? 'إغلاق المعاينة' : 'Close Preview'}</span>
                </button>
                <button
                  type="button"
                  className={vStyles.printPreviewActionBtnPrimary}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.print();
                    }
                  }}
                >
                  <Printer size={14} />
                  <span>{isAr ? 'طباعة فورية (Ctrl+P)' : 'Direct Print (Ctrl+P)'}</span>
                </button>
              </div>
            </div>

            <PrintableDossierContent
              property={selectedProperty}
              analysis={selectedPropertyAnalysis}
              propertyCosts={propertyCosts}
              contracts={contracts}
              isAr={isAr}
            />
          </div>
        </ZFModalShell>
      )}

      {/* HIDDEN PRINTABLE DOSSIER FOR DIRECT BROWSER PRINT (@media print) */}
      {selectedProperty && selectedPropertyAnalysis && (
        <div className={vStyles.printableDossierWrapScreenHidden} aria-hidden="true">
          <PrintableDossierContent
            property={selectedProperty}
            analysis={selectedPropertyAnalysis}
            propertyCosts={propertyCosts}
            contracts={contracts}
            isAr={isAr}
          />
        </div>
      )}
    </div>
  );
};

export default PropertyAnalysisView;
