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
              {isAr ? 'نظام FIN-OS ERP — ملف دراسة الجدوى والتحليل المالي والهندسي المعتمد' : 'FIN-OS ERP — Executive Feasibility & Engineering Dossier'}
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
            <span className={vStyles.printKpiVal} style={{ color: '#0ea5e9' }}>
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
  const separator = [' – ', ' - ', ' — '].find(sep => name.includes(sep));
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

  // Macro Studio Tabs: 5 discrete analytical dimensions (including Comprehensive Matrix)
  const [activeMacroTab, setActiveMacroTab] = useState<'overview' | 'matrix' | 'roi' | 'rsv' | 'investments'>('overview');

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
      return p.propertyId === selectedPropertyId ? currentAccent : '#94a3b8';
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
          const barColor = isCurrent ? currentAccent : '#94a3b8';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;">
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
      return p.propertyId === selectedPropertyId ? '#16a34a' : '#94a3b8';
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
          const barColor = isCurrent ? '#16a34a' : '#94a3b8';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;">
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
      return p.propertyId === selectedPropertyId ? currentAccent : '#94a3b8';
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
          const barColor = isCurrent ? currentAccent : '#94a3b8';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;">
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
      colors: [currentAccent, '#94a3b8'],
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
      return p.propertyId === selectedPropertyId ? '#10b981' : '#94a3b8';
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
          const barColor = isCurrent ? '#10b981' : '#94a3b8';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;">
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
      return p.propertyId === selectedPropertyId ? currentAccent : '#94a3b8';
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
          const barColor = isCurrent ? currentAccent : '#94a3b8';

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; box-shadow:0 4px 12px rgba(15,23,42,0.08); direction:${isAr ? 'rtl' : 'ltr'}; text-align:${isAr ? 'right' : 'left'}; font-family:inherit; min-width:220px;">
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
            id="macro-tab-overview"
            aria-controls="macro-panel-overview"
            aria-selected={activeMacroTab === 'overview'}
            className={`${vStyles.underlineTabBtn} ${activeMacroTab === 'overview' ? vStyles.underlineTabBtnActive : ''}`}
            onClick={() => setActiveMacroTab('overview')}
          >
            <PieChartIcon size={14} />
            <span>{isAr ? 'تحليل العقارات وحالتها' : 'Property Breakdown'}</span>
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

          <button
            type="button"
            role="tab"
            id="macro-tab-roi"
            aria-controls="macro-panel-roi"
            aria-selected={activeMacroTab === 'roi'}
            className={`${vStyles.underlineTabBtn} ${activeMacroTab === 'roi' ? vStyles.underlineTabBtnActive : ''}`}
            onClick={() => setActiveMacroTab('roi')}
          >
            <TrendingUp size={14} />
            <span>{isAr ? 'تحليل الربحية و ROI' : 'Profitability & ROI'}</span>
          </button>

          <button
            type="button"
            role="tab"
            id="macro-tab-rsv"
            aria-controls="macro-panel-rsv"
            aria-selected={activeMacroTab === 'rsv'}
            className={`${vStyles.underlineTabBtn} ${activeMacroTab === 'rsv' ? vStyles.underlineTabBtnActive : ''}`}
            onClick={() => setActiveMacroTab('rsv')}
          >
            <Layers size={14} />
            <span>{isAr ? 'تحليل RSV وتخصيص التكاليف' : 'RSV & Allocation'}</span>
          </button>

          <button
            type="button"
            role="tab"
            id="macro-tab-investments"
            aria-controls="macro-panel-investments"
            aria-selected={activeMacroTab === 'investments'}
            className={`${vStyles.underlineTabBtn} ${activeMacroTab === 'investments' ? vStyles.underlineTabBtnActive : ''}`}
            onClick={() => setActiveMacroTab('investments')}
          >
            <Coins size={14} />
            <span>{isAr ? 'توزيع الاستثمارات الإنشائية' : 'Investment Allocation'}</span>
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
        )}

        {/* 2-Column Cartesian Charts (Dynamically toggled per macro tab) */}
        {activeMacroTab !== 'matrix' && (
          <div className={vStyles.chartsGrid} role="tabpanel" id={`macro-panel-${activeMacroTab}`} aria-labelledby={`macro-tab-${activeMacroTab}`}>
            {/* TAB 1: OVERVIEW */}
            {activeMacroTab === 'overview' && (
              <>
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
                      {isAr ? 'النسب المئوية للأعداد' : 'Share of inventory'}
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
              </>
            )}

          {/* TAB 2: ROI & PROFITABILITY */}
          {activeMacroTab === 'roi' && (
            <>
              {/* Chart 1: Net Expected Profit (NPV) */}
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

              {/* Chart 2: Gross Margin % */}
              <div className={vStyles.chartContainerCard}>
                <div className={vStyles.chartHeader}>
                  <div className={vStyles.chartTitleWrap}>
                    <Percent size={14} color={currentAccent} />
                    <h4 className={vStyles.chartTitle}>
                      {isAr ? 'مقارنة هامش الربح الإجمالي (%)' : 'Gross Margin % Comparison'}
                    </h4>
                  </div>
                  <span className={vStyles.chartSubtitle}>
                    {isAr ? 'النسبة المئوية لهامش المشروع' : 'Margin % across projects'}
                  </span>
                </div>
                <ERPApexChart
                  type="bar"
                  series={barGrossMarginSeries}
                  options={barGrossMarginOptions}
                  height={340}
                  isAr={isAr}
                  primaryColor={currentAccent}
                />
              </div>
            </>
          )}

          {/* TAB 3: RSV & ALLOCATION */}
          {activeMacroTab === 'rsv' && (
            <>
              {/* Chart 1: Contracted Sales vs RSV */}
              <div className={vStyles.chartContainerCard}>
                <div className={vStyles.chartHeader}>
                  <div className={vStyles.chartTitleWrap}>
                    <Layers size={14} color={currentAccent} />
                    <h4 className={vStyles.chartTitle}>
                      {isAr ? 'المبيعات المحققة مقابل القيمة التقديرية (RSV)' : 'Contracted Sales vs Total RSV'}
                    </h4>
                  </div>
                  <span className={vStyles.chartSubtitle}>
                    {isAr ? 'المبيعات المبرمة مقارنة بالمستهدف' : 'Sales volume comparison'}
                  </span>
                </div>
                <ERPApexChart
                  type="bar"
                  series={barSalesVsRsvSeries}
                  options={barSalesVsRsvOptions}
                  height={350}
                  isAr={isAr}
                  primaryColor={currentAccent}
                />
              </div>

              {/* Chart 2: Absorption % */}
              <div className={vStyles.chartContainerCard}>
                <div className={vStyles.chartHeader}>
                  <div className={vStyles.chartTitleWrap}>
                    <FileCheck size={14} color="#10b981" />
                    <h4 className={vStyles.chartTitle}>
                      {isAr ? 'معدل استيعاب الوحدات والمبيعات (%)' : 'Sales Absorption Rate (%)'}
                    </h4>
                  </div>
                  <span className={vStyles.chartSubtitle}>
                    {isAr ? 'نسبة الوحدات المباعة للوحدات المتاحة' : 'Units sold ratio'}
                  </span>
                </div>
                <ERPApexChart
                  type="bar"
                  series={barAbsorptionSeries}
                  options={barAbsorptionOptions}
                  height={340}
                  isAr={isAr}
                  primaryColor="#10b981"
                />
              </div>
            </>
          )}

          {/* TAB 4: INVESTMENTS BREAKDOWN */}
          {activeMacroTab === 'investments' && (
            <>
              {/* Chart 1: Donut - Cost Categories Breakdown */}
              <div className={vStyles.chartContainerCard}>
                <div className={vStyles.chartHeader}>
                  <div className={vStyles.chartTitleWrap}>
                    <Coins size={14} color={currentAccent} />
                    <h4 className={vStyles.chartTitle}>
                      {isAr ? 'توزيع الاستثمارات حسب بنود التكلفة' : 'Investment by Cost Category'}
                    </h4>
                  </div>
                  <span className={vStyles.chartSubtitle}>
                    {isAr ? 'الأرض والخرسانات والتشطيبات' : 'WIP category distribution'}
                  </span>
                </div>
                <ERPApexChart
                  type="donut"
                  series={donutCategoriesSeries}
                  options={donutCategoriesOptions}
                  height={260}
                  isAr={isAr}
                  primaryColor={currentAccent}
                />
              </div>

              {/* Chart 2: Total Invested Capital by Project */}
              <div className={vStyles.chartContainerCard}>
                <div className={vStyles.chartHeader}>
                  <div className={vStyles.chartTitleWrap}>
                    <BarChart3 size={14} color={currentAccent} />
                    <h4 className={vStyles.chartTitle}>
                      {isAr ? 'إجمالي الاستثمار المنفذ حسب المشروع' : 'Invested Capital by Project'}
                    </h4>
                  </div>
                  <span className={vStyles.chartSubtitle}>
                    {isAr ? 'إجمالي تكاليف الأرض والبناء' : 'Total Land + WIP'}
                  </span>
                </div>
                <ERPApexChart
                  type="bar"
                  series={barInvestmentByProjectSeries}
                  options={barInvestmentByProjectOptions}
                  height={340}
                  isAr={isAr}
                  primaryColor={currentAccent}
                />
              </div>
            </>
          )}
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
          {/* 4 DISCRETE FLOATING PROPERTY-SPECIFIC KPI CARDS WITH WAVE SPARKLINES */}
          <ZFKpiGrid>
            {/* Property KPI 1: Invested Capital */}
            <ZFKpiCard
              title={isAr ? 'إجمالي رأس المال المستثمر' : 'Invested Capital (Cost)'}
              value={selectedPropertyAnalysis ? formatCompactEGP(selectedPropertyAnalysis.breakdown.totalInvestedCapital, isAr) : '0 ج.م'}
              icon={<Coins size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={[15, 25, 38, 50, 65, 78, 90]}
              delta={{ value: '+8.4%', isPositive: true, label: isAr ? 'رأس مال منفق' : 'invested' }}
              subtitleLabel={isAr ? 'تكلفة المتر التقديرية' : 'Estimated Cost / m²'}
              subtitleValue={selectedPropertyAnalysis ? `${formatCompactEGP(selectedPropertyAnalysis.costPerSqm, isAr)} / م²` : '0'}
            />

            {/* Property KPI 2: Expected RSV */}
            <ZFKpiCard
              title={isAr ? 'القيمة البيعية المتوقعة (RSV)' : 'Expected Sales Value (RSV)'}
              value={selectedPropertyAnalysis ? formatCompactEGP(selectedPropertyAnalysis.expectedTotalSales, isAr) : '0 ج.م'}
              icon={<FileCheck size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={[20, 35, 48, 62, 75, 88, 100]}
              delta={{ value: '+14.2%', isPositive: true, label: isAr ? 'قيمة تعاقدية' : 'contracted' }}
              subtitleLabel={isAr ? 'المبيعات الفعلية المحققة' : 'Contracted Sales'}
              subtitleValue={selectedPropertyAnalysis ? formatCompactEGP(selectedPropertyAnalysis.contractedSales, isAr) : '0 ج.م'}
            />

            {/* Property KPI 3: Net Profit NPV & ROI */}
            <ZFKpiCard
              title={isAr ? 'صافي الربح المتوقع (NPV)' : 'Net Expected Profit'}
              value={selectedPropertyAnalysis ? formatCompactEGP(selectedPropertyAnalysis.netExpectedProfit, isAr) : '0 ج.م'}
              icon={<TrendingUp size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={[10, 16, 24, 30, 38, 44, 52]}
              delta={{ value: selectedPropertyAnalysis ? `${selectedPropertyAnalysis.roiPct.toFixed(1)}%` : '0%', isPositive: selectedPropertyAnalysis ? selectedPropertyAnalysis.roiPct.gte(0) : true, label: isAr ? 'عائد ROI' : 'ROI' }}
              subtitleLabel={isAr ? 'العائد على الاستثمار' : 'ROI %'}
              subtitleValue={selectedPropertyAnalysis ? `${selectedPropertyAnalysis.roiPct.toFixed(1)}% ROI` : '0%'}
            />

            {/* Property KPI 4: Sales Absorption */}
            <ZFKpiCard
              title={isAr ? 'نسبة الامتصاص والمبيعات' : 'Sales Absorption Rate'}
              value={selectedPropertyAnalysis ? `${selectedPropertyAnalysis.absorptionRatePct.toFixed(1)}%` : '0%'}
              icon={<Percent size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={[0, 15, 30, 45, 60, 75, Math.min(100, Math.max(0, Math.round(selectedPropertyAnalysis ? selectedPropertyAnalysis.absorptionRatePct.toNumber() : 0)))]}
              delta={{ value: selectedPropertyAnalysis ? `${selectedPropertyAnalysis.soldUnits}/${selectedPropertyAnalysis.totalUnits}` : '0', isPositive: true, label: isAr ? 'وحدات مباعة' : 'units' }}
              subtitleLabel={isAr ? 'الوحدات المتعاقد عليها' : 'Sold Units'}
              subtitleValue={selectedPropertyAnalysis ? `${selectedPropertyAnalysis.soldUnits} ${isAr ? 'من' : 'of'} ${selectedPropertyAnalysis.totalUnits} ${isAr ? 'وحدة' : 'units'}` : '0'}
            />
          </ZFKpiGrid>

          {/* SELECTED PROPERTY DEEP DOSSIER (تحليل دورة حياة العقار المختار) */}
          <div className={vStyles.dossierCard} id="property-dossier-section">
            {/* Dossier Header */}
            <div className={vStyles.propertyPickerBar}>
              <div className={vStyles.pickerLeading}>
                <div className={vStyles.cardIconSquircle}>
                  <Building2 size={15} />
                </div>
                <div>
                  <div className={vStyles.pickerTitle}>
                    {isAr ? 'ملف دورة حياة العقار ودراسة الجدوى' : 'Property Lifecycle Dossier & Feasibility'}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>
                    {selectedProperty ? (isAr ? selectedProperty.title_ar : selectedProperty.title_en) : ''}
                  </span>
                </div>
              </div>

              {selectedPropertyAnalysis && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className={`${shellStyles.statusPill} ${selectedPropertyAnalysis.status === 'sold' ? shellStyles.statusPillNeutral : shellStyles.statusPillGreen}`}>
                    {selectedPropertyAnalysis.statusLabel}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                    #{selectedPropertyAnalysis.propertyId.slice(0, 8)}
                  </span>
                </div>
              )}
            </div>

            {/* 3 Consolidated Underline Dossier Tabs */}
            <div className={vStyles.underlineTabsList} role="tablist">
              {/* Tab 1: دورة الحياة والبيانات الهندسية */}
              <button
                type="button"
                role="tab"
                id="dossier-tab-lifecycle"
                aria-controls="dossier-panel-lifecycle"
                aria-selected={activeDossierTab === 'lifecycle'}
                className={`${vStyles.underlineTabBtn} ${activeDossierTab === 'lifecycle' ? vStyles.underlineTabBtnActive : ''}`}
                onClick={() => setActiveDossierTab('lifecycle')}
              >
                <Clock size={14} />
                <span>{isAr ? 'دورة الحياة والبيانات الهندسية' : 'Lifecycle & Engineering Feasibility'}</span>
              </button>

              {/* Tab 2: الجدوى المالية والمبيعات */}
              <button
                type="button"
                role="tab"
                id="dossier-tab-feasibility"
                aria-controls="dossier-panel-feasibility"
                aria-selected={activeDossierTab === 'feasibility'}
                className={`${vStyles.underlineTabBtn} ${activeDossierTab === 'feasibility' ? vStyles.underlineTabBtnActive : ''}`}
                onClick={() => setActiveDossierTab('feasibility')}
              >
                <TrendingUp size={14} />
                <span>{isAr ? 'الجدوى المالية والمبيعات' : 'Financial Feasibility & Sales'}</span>
              </button>

              {/* Tab 3: سجل بنود التكاليف والمصروفات */}
              <button
                type="button"
                role="tab"
                id="dossier-tab-costs"
                aria-controls="dossier-panel-costs"
                aria-selected={activeDossierTab === 'costs'}
                className={`${vStyles.underlineTabBtn} ${activeDossierTab === 'costs' ? vStyles.underlineTabBtnActive : ''}`}
                onClick={() => setActiveDossierTab('costs')}
              >
                <TableIcon size={14} />
                <span>{isAr ? 'سجل بنود التكاليف والمصروفات' : 'Cost & Expense Register'}</span>
                {selectedPropertyCostList.length > 0 && (
                  <span className={vStyles.tabBadgeCount}>
                    {selectedPropertyCostList.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENTS */}
            {selectedPropertyAnalysis ? (
              <div>
                {/* TAB 1: دورة الحياة والبيانات الهندسية (SPLIT GRID) */}
                {activeDossierTab === 'lifecycle' && (
                  <div
                    role="tabpanel"
                    id="dossier-panel-lifecycle"
                    aria-labelledby="dossier-tab-lifecycle"
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                  >
                    <div className={vStyles.lifecycleSplitGrid}>
                      {/* Side A: Vertical Architectural Lifecycle Pipeline */}
                      <div className={vStyles.verticalPipelineContainer}>
                        <div className={vStyles.pipelineSpineLine} />

                        {selectedPropertyAnalysis.milestones.map((m, mIdx) => {
                          const isCompleted = m.status === 'completed';
                          const isInProgress = m.status === 'in_progress';
                          const stepNumber = String(mIdx + 1).padStart(2, '0');

                          return (
                            <div key={m.id} className={vStyles.pipelineStepRow}>
                              <div className={vStyles.pipelineStepLeading}>
                                <div className={vStyles.pipelineSquircle}>
                                  {mIdx === 0 ? <Home size={14} /> :
                                   mIdx === 1 ? <FileCheck size={14} /> :
                                   mIdx === 2 ? <Layers size={14} /> :
                                   mIdx === 3 ? <Sparkles size={14} /> :
                                   mIdx === 4 ? <Coins size={14} /> :
                                   <Check size={14} />}
                                </div>
                                <span className={vStyles.pipelineStepNum}>{stepNumber}</span>
                              </div>

                              <div className={`${vStyles.pipelineStepCard} ${
                                isCompleted ? vStyles.pipelineStepCardCompleted :
                                isInProgress ? vStyles.pipelineStepCardInProgress :
                                vStyles.pipelineStepCardPending
                              }`}>
                                <div className={vStyles.pipelineCardHeader}>
                                  <div className={vStyles.pipelineCardTitleWrap}>
                                    <span className={vStyles.pipelineCardTitle}>
                                      {isAr ? m.titleAr : m.titleEn}
                                    </span>
                                    <span className={`${shellStyles.statusPill} ${
                                      isCompleted ? shellStyles.statusPillGreen :
                                      isInProgress ? shellStyles.statusPillAmber :
                                      shellStyles.statusPillNeutral
                                    }`}>
                                      {isCompleted ? (isAr ? 'مكتمل' : 'Completed') :
                                       isInProgress ? (isAr ? 'قيد التنفيذ' : 'In Progress') :
                                       (isAr ? 'مخطط' : 'Pending')}
                                    </span>
                                  </div>

                                  <div className={vStyles.pipelineCardBadges}>
                                    {m.date && (
                                      <span className={vStyles.pipelineDateBadge}>
                                        <Calendar size={12} />
                                        <span>{m.date}</span>
                                      </span>
                                    )}
                                    {Number(m.costLoggedEgp) > 0 && (
                                      <span className={vStyles.pipelineCostBadge}>
                                        <Coins size={12} />
                                        <span>
                                          {isAr
                                            ? (m.id === 'm5_sales' ? `المبيعات: ${formatCompactEGP(m.costLoggedEgp, true)}` : `التكلفة: ${formatCompactEGP(m.costLoggedEgp, true)}`)
                                            : (m.id === 'm5_sales' ? `Sales: ${formatCompactEGP(m.costLoggedEgp, false)}` : `Cost: ${formatCompactEGP(m.costLoggedEgp, false)}`)}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <p className={vStyles.pipelineAuditSummary}>
                                  {isAr ? m.summaryAr : m.summaryEn}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Side B: Property Specs & Cost Center Distribution Card */}
                      <div className={vStyles.specsCard}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <SlidersHorizontal size={15} color={currentAccent} />
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                              {isAr ? 'مواصفات وتوزيع مراكز التكلفة' : 'Engineering Specs & Cost Centers'}
                            </span>
                          </div>
                          <span className={`${shellStyles.statusPill} ${selectedPropertyAnalysis.status === 'sold' ? shellStyles.statusPillNeutral : shellStyles.statusPillGreen}`}>
                            {selectedPropertyAnalysis.statusLabel}
                          </span>
                        </div>

                        {/* Specs 2x2 Grid */}
                        <div className={vStyles.showcaseSpecs2x2}>
                          <div className={vStyles.showcaseSpecItem}>
                            <span className={vStyles.showcaseSpecLabel}>{isAr ? 'المساحة الكلية' : 'Total Area'}</span>
                            <span className={vStyles.showcaseSpecVal}>{selectedPropertyAnalysis.areaSqm} م²</span>
                          </div>
                          <div className={vStyles.showcaseSpecItem}>
                            <span className={vStyles.showcaseSpecLabel}>{isAr ? 'عدد الوحدات' : 'Units Count'}</span>
                            <span className={vStyles.showcaseSpecVal}>{selectedPropertyAnalysis.totalUnits} {isAr ? 'وحدة' : 'units'}</span>
                          </div>
                          <div className={vStyles.showcaseSpecItem}>
                            <span className={vStyles.showcaseSpecLabel}>{isAr ? 'تكلفة المتر التقديرية' : 'Estimated Cost / m²'}</span>
                            <span className={vStyles.showcaseSpecVal}>{formatCompactEGP(selectedPropertyAnalysis.costPerSqm, isAr)}/م²</span>
                          </div>
                          <div className={vStyles.showcaseSpecItem}>
                            <span className={vStyles.showcaseSpecLabel}>{isAr ? 'متوسط مساحة الوحدة' : 'Avg Unit Area'}</span>
                            <span className={vStyles.showcaseSpecVal}>
                              {selectedPropertyAnalysis.totalUnits > 0 ? (selectedPropertyAnalysis.areaSqm / selectedPropertyAnalysis.totalUnits).toFixed(0) : '0'} م²
                            </span>
                          </div>
                        </div>

                        {/* Itemized Cost Centers Distribution */}
                        <div className={vStyles.specsTable}>
                          <div className={vStyles.specRow}>
                            <span className={vStyles.specLabel}>{isAr ? 'حصة الأرض والتخصيص (150000)' : 'Land Allocation (150000)'}</span>
                            <span className={vStyles.specValue}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.landCost, isAr)}</span>
                          </div>

                          <div className={vStyles.specRow}>
                            <span className={vStyles.specLabel}>{isAr ? 'الهيكل الخرساني والحديد (151000)' : 'Structural & Skeleton (151000)'}</span>
                            <span className={vStyles.specValue}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.structureWip, isAr)}</span>
                          </div>

                          <div className={vStyles.specRow}>
                            <span className={vStyles.specLabel}>{isAr ? 'التجهيزات والكهروميكانيك (152000)' : 'MEP Infrastructure (152000)'}</span>
                            <span className={vStyles.specValue}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.mepWip, isAr)}</span>
                          </div>

                          <div className={vStyles.specRow}>
                            <span className={vStyles.specLabel}>{isAr ? 'التشطيبات والواجهات والمصاعد (153000)' : 'Finishing & Elevators (153000)'}</span>
                            <span className={vStyles.specValue}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.finishingWip, isAr)}</span>
                          </div>

                          <div className={vStyles.specRow}>
                            <span className={vStyles.specLabel}>{isAr ? 'التراخيص والرسوم الحكومية (154000)' : 'Permits, Taxes & Fees (154000)'}</span>
                            <span className={vStyles.specValue}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.permitsFees, isAr)}</span>
                          </div>

                          <div className={`${vStyles.specRow} ${vStyles.specRowHighlighted}`}>
                            <span className={vStyles.specLabel} style={{ color: currentAccent }}>{isAr ? 'إجمالي الاستثمار المنفذ' : 'Total Invested Capital'}</span>
                            <span className={vStyles.specValue} style={{ color: currentAccent }}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.totalInvestedCapital, isAr)}</span>
                          </div>
                        </div>

                        {/* Export Action Bar */}
                        <div className={vStyles.bottomActionBar} style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            className={vStyles.bottomActionBtn}
                            onClick={handleExportPropertyExcel}
                            title={isAr ? 'تصدير دراسة الجدوى كملف إكسل رسمي' : 'Export Excel Feasibility'}
                          >
                            <TableIcon size={14} color="#16a34a" />
                            <span>{isAr ? 'تصدير تقرير Excel' : 'Export Excel'}</span>
                          </button>

                          <button
                            type="button"
                            className={vStyles.bottomActionBtn}
                            onClick={handleExportPropertyPdf}
                            title={isAr ? 'طباعة تقرير العقار الرسمي وحفظه PDF' : 'Print PDF Dossier'}
                          >
                            <Printer size={14} color={currentAccent} />
                            <span>{isAr ? 'طباعة تقرير PDF' : 'Print PDF'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: الجدوى المالية والمبيعات */}
                {activeDossierTab === 'feasibility' && (
                  <div
                    role="tabpanel"
                    id="dossier-panel-feasibility"
                    aria-labelledby="dossier-tab-feasibility"
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                  >
                    {/* RSV Metrics Grid */}
                    <div className={vStyles.rsvMetricsGrid}>
                      {/* Expected Value at Completion */}
                      <div className={vStyles.rsvMetricCard}>
                        <span className={vStyles.rsvMetricLabel}>{isAr ? 'القيمة الإجمالية المتوقعة (RSV)' : 'Expected Sales at Completion'}</span>
                        <span className={vStyles.rsvMetricValue}>
                          {formatCompactEGP(selectedPropertyAnalysis.expectedTotalSales, isAr)}
                        </span>
                        <span className={vStyles.rsvMetricSub}>
                          {isAr ? 'مستندة للأسعار التعاقدية ودراسة السوق' : 'Based on contracts & market price'}
                        </span>
                      </div>

                      {/* Unit Meter Cost vs Sales Meter Price */}
                      <div className={vStyles.rsvMetricCard}>
                        <span className={vStyles.rsvMetricLabel}>{isAr ? 'سعر بيع المتر مقابل التكلفة' : 'Selling Price vs Meter Cost'}</span>
                        <span className={vStyles.rsvMetricValue}>
                          {formatCompactEGP(selectedPropertyAnalysis.salesMeterPrice, isAr)}
                        </span>
                        <span className={vStyles.rsvMetricSub}>
                          {isAr ? `التكلفة: ${formatCompactEGP(selectedPropertyAnalysis.unitMeterCost, isAr)}/م²` : `Cost: ${formatCompactEGP(selectedPropertyAnalysis.unitMeterCost, false)}/sqm`}
                        </span>
                      </div>

                      {/* Net Expected Profit */}
                      <div className={vStyles.rsvMetricCard}>
                        <span className={vStyles.rsvMetricLabel}>{isAr ? 'صافي الربح المتوقع (NPV)' : 'Net Expected Profit'}</span>
                        <span className={vStyles.rsvMetricValue} style={{ color: selectedPropertyAnalysis.netExpectedProfit.gte(0) ? '#16a34a' : '#dc2626' }}>
                          {formatCompactEGP(selectedPropertyAnalysis.netExpectedProfit, isAr)}
                        </span>
                        <span className={vStyles.rsvMetricSub}>
                          {isAr ? 'بعد خصم كافة فواتير البناء والأرض' : 'Net after land & full construction'}
                        </span>
                      </div>

                      {/* Gross Margin % & ROI */}
                      <div className={vStyles.rsvMetricCard}>
                        <span className={vStyles.rsvMetricLabel}>{isAr ? 'هامش الربح وعائد الاستثمار (ROI)' : 'Gross Margin & ROI'}</span>
                        <span className={vStyles.rsvMetricValue}>
                          {selectedPropertyAnalysis.grossMarginPct.toFixed(1)}%
                        </span>
                        <span className={vStyles.rsvMetricSub}>
                          {isAr ? `عائد الاستثمار: ${selectedPropertyAnalysis.roiPct.toFixed(1)}% ROI` : `ROI: ${selectedPropertyAnalysis.roiPct.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>

                    {/* Absorption Progress & Cash vs Receivables */}
                    <div className={vStyles.salesGaugeRow}>
                      {/* Sales Absorption Progress */}
                      <div className={vStyles.absorptionProgressCard}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                            {isAr ? 'معدل استيعاب المبيعات والحجوزات' : 'Sales Absorption Rate'}
                          </span>
                          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                            {selectedPropertyAnalysis.absorptionRatePct.toFixed(1)}%
                          </span>
                        </div>

                        <div className={vStyles.progressTrack}>
                          <div 
                            className={vStyles.progressBar} 
                            style={{ 
                              width: `${Math.min(100, Math.max(0, selectedPropertyAnalysis.absorptionRatePct.toNumber()))}%`,
                              backgroundColor: currentAccent
                            }} 
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b' }}>
                          <span>{isAr ? `تم بيع ${selectedPropertyAnalysis.soldUnits} من أصل ${selectedPropertyAnalysis.totalUnits} وحدة` : `Sold ${selectedPropertyAnalysis.soldUnits} of ${selectedPropertyAnalysis.totalUnits} units`}</span>
                          <span>{isAr ? `المتبقي: ${selectedPropertyAnalysis.remainingUnits} وحدة` : `Remaining: ${selectedPropertyAnalysis.remainingUnits} units`}</span>
                        </div>
                      </div>

                      {/* Cash Collected vs Receivables */}
                      <div className={vStyles.absorptionProgressCard}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                            {isAr ? 'التحصيلات النقدية والأقساط المستحقة' : 'Cash Collected vs A/R'}
                          </span>
                          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
                            {formatCompactEGP(selectedPropertyAnalysis.contractedSales, isAr)}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                          <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.70rem', color: '#64748b' }}>{isAr ? 'النقدية المحصلة' : 'Cash Collected'}</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCompactEGP(selectedPropertyAnalysis.collectedCash, isAr)}
                            </div>
                          </div>

                          <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.70rem', color: '#64748b' }}>{isAr ? 'أقساط وشيكات مستحقة A/R' : 'Pending Receivables'}</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCompactEGP(selectedPropertyAnalysis.pendingReceivables, isAr)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CAD Blueprint Cartesian ApexChart */}
                    <div className={vStyles.macroChartCard}>
                      <div className={vStyles.chartCardHeader}>
                        <div className={vStyles.chartTitleWrap}>
                          <BarChart3 size={15} color={currentAccent} />
                          <span className={vStyles.chartTitle}>
                            {isAr ? 'مخطط التوازن المالي والجدوى (CAD Blueprint)' : 'Financial Balance & Feasibility CAD Blueprint'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {isAr ? 'مقارنة القيمة البيعية والتكاليف والأرباح والتدفقات' : 'Comparison of RSV, Costs, Profits & Cashflows'}
                        </span>
                      </div>
                      <ERPApexChart
                        type="bar"
                        series={feasibilityComparisonSeries}
                        options={feasibilityComparisonOptions}
                        height={300}
                        isAr={isAr}
                        primaryColor={currentAccent}
                      />
                    </div>

                    {/* Contracts Table */}
                    <div className={vStyles.contractsTableCard}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--erp-border, #cbd5e1)', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                          {isAr ? 'عقود البيع المسجلة على هذا العقار' : 'Registered Sales Contracts on Property'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {selectedPropertyAnalysis.associatedContracts.length} {isAr ? 'عقد رسمي' : 'contracts'}
                        </span>
                      </div>

                      {selectedPropertyAnalysis.associatedContracts.length > 0 ? (
                        <table className={vStyles.contractsTable}>
                          <thead className={vStyles.contractsThead}>
                            <tr>
                              <th scope="col" className={vStyles.contractsTh}>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                              <th scope="col" className={vStyles.contractsTh}>{isAr ? 'اسم العميل' : 'Client Name'}</th>
                              <th scope="col" className={vStyles.contractsTh}>{isAr ? 'الوحدة' : 'Unit'}</th>
                              <th scope="col" className={vStyles.contractsTh}>{isAr ? 'قيمة العقد' : 'Contract Value'}</th>
                              <th scope="col" className={vStyles.contractsTh}>{isAr ? 'المحصل' : 'Collected'}</th>
                              <th scope="col" className={vStyles.contractsTh}>{isAr ? 'الحالة' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPropertyAnalysis.associatedContracts.map(c => {
                              const handleSelect = () => {
                                if (onInspectContract) {
                                  onInspectContract(c);
                                } else if (onOpenContractForProperty && selectedProperty) {
                                  onOpenContractForProperty(selectedProperty);
                                } else if (onNavigateTab) {
                                  onNavigateTab('contracts', { contractId: c.contract_id });
                                }
                              };

                              return (
                                <tr 
                                  key={c.contract_id} 
                                  className={vStyles.contractsRow}
                                  role="button"
                                  tabIndex={0}
                                  onClick={handleSelect}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleSelect();
                                    }
                                  }}
                                  title={isAr ? 'فحص تفاصيل العقد' : 'Inspect contract'}
                                  aria-label={`${c.contract_number} - ${c.buyer_name}`}
                                >
                                  <td className={vStyles.contractsTd} style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                    {c.contract_number}
                                  </td>
                                  <td className={vStyles.contractsTd}>
                                    {c.buyer_name}
                                  </td>
                                  <td className={vStyles.contractsTd}>
                                    {c.building_unit_number || c.unit_id || '-'}
                                  </td>
                                  <td className={vStyles.contractsTd} style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                    {formatCompactEGP(c.gross_contract_value, isAr)}
                                  </td>
                                  <td className={vStyles.contractsTd} style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatCompactEGP(c.total_cash_collected, isAr)}
                                  </td>
                                  <td className={vStyles.contractsTd}>
                                    <span className={`${shellStyles.statusPill} ${c.status === 'Active' ? shellStyles.statusPillGreen : shellStyles.statusPillNeutral}`}>
                                      {c.status === 'Active' ? (isAr ? 'ساري' : 'Active') : c.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.80rem' }}>
                          {isAr ? 'لا توجد عقود بيع مسجلة بعد على هذا العقار.' : 'No contracts recorded yet for this property.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: سجل بنود التكاليف والمصروفات (CANONICAL TABLE CARD) */}
                {activeDossierTab === 'costs' && (
                  <div
                    role="tabpanel"
                    id="dossier-panel-costs"
                    aria-labelledby="dossier-tab-costs"
                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  >
                    <div className={`${shellStyles.canonicalTableCard} ${vStyles.costRegisterCard}`}>
                      <div className={vStyles.costRegisterHeader}>
                        <div className={vStyles.costRegisterTitleWrap}>
                          <div className={vStyles.cardIconSquircle}>
                            <Coins size={15} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                              {isAr ? 'سجل بنود التكاليف والمصروفات المعتمدة للعقار' : 'Property Costs & Incurred Expenses Register'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {isAr ? `إجمالي البنود: ${filteredCostItems.length} بند مسجل` : `Total ${filteredCostItems.length} logged items`}
                            </div>
                          </div>
                        </div>

                        <div className={vStyles.costRegisterControls}>
                          {/* Category Filter */}
                          <select
                            value={costCategoryFilter}
                            onChange={(e) => {
                              setCostCategoryFilter(e.target.value);
                              setCostCurrentPage(1);
                            }}
                            className={shellStyles.canonicalFilterSelect}
                          >
                            <option value="ALL">{isAr ? 'كل بنود التكلفة' : 'All Categories'}</option>
                            <option value="land_allocation">{isAr ? 'حصة الأرض والتخصيص' : 'Land Allocation'}</option>
                            <option value="civil_structure">{isAr ? 'الهيكل الخرساني والحديد' : 'Civil & Structure'}</option>
                            <option value="labor_subcontractor">{isAr ? 'مصنعيات ومقاولات باطن' : 'Labor & Subcontractor'}</option>
                            <option value="mep_infrastructure">{isAr ? 'شبكات الكهروميكانيك' : 'MEP Infrastructure'}</option>
                            <option value="finishing_interior">{isAr ? 'تشطيبات وديكور داخلي' : 'Interior Finishes'}</option>
                            <option value="site_facade">{isAr ? 'واجهات ومداخل الموقع' : 'Facades & Site'}</option>
                            <option value="permits_engineering">{isAr ? 'تراخيص واستشارات هندسية' : 'Permits & Engineering'}</option>
                            <option value="taxes_fees">{isAr ? 'ضرائب ورسوم حكومية' : 'Taxes & Fees'}</option>
                          </select>

                          {/* Status Filter */}
                          <select
                            value={costStatusFilter}
                            onChange={(e) => {
                              setCostStatusFilter(e.target.value);
                              setCostCurrentPage(1);
                            }}
                            className={shellStyles.canonicalFilterSelect}
                          >
                            <option value="ALL">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                            <option value="verified">{isAr ? 'معتمد' : 'Verified'}</option>
                            <option value="capitalized">{isAr ? 'مرسمل' : 'Capitalized'}</option>
                            <option value="pending_audit">{isAr ? 'قيد التدقيق' : 'Pending Audit'}</option>
                          </select>

                          {/* Search Input */}
                          <input
                            type="text"
                            value={costSearchQuery}
                            onChange={(e) => {
                              setCostSearchQuery(e.target.value);
                              setCostCurrentPage(1);
                            }}
                            placeholder={isAr ? 'بحث في البيان أو المورد...' : 'Search description / vendor...'}
                            className={vStyles.costSearchInput}
                          />

                          {/* Add Cost Action Button */}
                          <button
                            type="button"
                            className={vStyles.costAddBtn}
                            onClick={() => {
                              if (onOpenQuickExpense && selectedProperty) {
                                onOpenQuickExpense(selectedProperty.id);
                              } else if (onOpenQuickExpense) {
                                onOpenQuickExpense();
                              } else {
                                toast.info(isAr ? 'فتح نموذج تسجيل تكلفة جديدة' : 'Open Cost Entry Form');
                              }
                            }}
                          >
                            <Plus size={14} />
                            <span>{isAr ? 'إضافة تكلفة / مصروف' : 'Add Cost / Expense'}</span>
                          </button>
                        </div>
                      </div>

                      <div className={shellStyles.tableContainer}>
                        {filteredCostItems.length > 0 ? (
                          <table className={shellStyles.canonicalTable}>
                            <thead className={shellStyles.canonicalThead}>
                              <tr>
                                <th scope="col" className={shellStyles.canonicalTh}>{isAr ? 'التاريخ' : 'Date'}</th>
                                <th scope="col" className={shellStyles.canonicalTh}>{isAr ? 'التصنيف' : 'Category'}</th>
                                <th scope="col" className={shellStyles.canonicalTh}>{isAr ? 'بيان المصروف' : 'Description'}</th>
                                <th scope="col" className={shellStyles.canonicalTh}>{isAr ? 'المورد / المقاول' : 'Vendor'}</th>
                                <th scope="col" className={shellStyles.canonicalTh}>{isAr ? 'المرحلة الهندسية' : 'Phase'}</th>
                                <th scope="col" className={shellStyles.canonicalTh}>{isAr ? 'المبلغ' : 'Amount'}</th>
                                <th scope="col" className={shellStyles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedCostItems.map((item, itemIdx) => {
                                const isApproved = item.status === 'verified' || item.status === 'capitalized';
                                const isPending = item.status === 'pending_audit';

                                return (
                                  <tr key={item.item_id || item.id || `cost-${itemIdx}`} className={shellStyles.canonicalRow}>
                                    <td className={shellStyles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                                      {item.logged_date || (item.created_at ? item.created_at.slice(0, 10) : '-')}
                                    </td>
                                    <td className={shellStyles.canonicalTd}>
                                      <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`} style={{ fontSize: '0.70rem' }}>
                                        {getCostCategoryLabel(item.category, isAr)}
                                      </span>
                                    </td>
                                    <td className={shellStyles.canonicalTd} style={{ fontWeight: 600, color: '#0f172a' }}>
                                      {isAr ? item.item_name_ar : (item.item_name_en || item.item_name_ar)}
                                    </td>
                                    <td className={shellStyles.canonicalTd} style={{ color: '#475569' }}>
                                      {item.supplier_contractor || '-'}
                                    </td>
                                    <td className={shellStyles.canonicalTd} style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                      {getCostPhaseLabel(item.phase, isAr)}
                                    </td>
                                    <td className={shellStyles.canonicalTd} style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                                      {formatCompactEGP(item.total_cost_egp, isAr)}
                                    </td>
                                    <td className={shellStyles.canonicalTd}>
                                      <span className={`${shellStyles.statusPill} ${
                                        isApproved ? shellStyles.statusPillGreen :
                                        isPending ? shellStyles.statusPillAmber :
                                        shellStyles.statusPillNeutral
                                      }`}>
                                        {item.status === 'verified' ? (isAr ? 'معتمد' : 'Verified') :
                                         item.status === 'capitalized' ? (isAr ? 'مرسمل' : 'Capitalized') :
                                         item.status === 'pending_audit' ? (isAr ? 'قيد التدقيق' : 'Pending Audit') :
                                         item.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                            {selectedPropertyCostList.length === 0
                              ? (isAr ? 'لا توجد بنود تكاليف أو مصروفات مسجلة على هذا العقار حتى الآن.' : 'No costs or expenses recorded yet for this property.')
                              : (isAr ? 'لا توجد بنود تكلفة تطابق خيارات التصفية الحالية.' : 'No cost items match the current filters.')}
                          </div>
                        )}
                      </div>

                      {/* Table Footer with Pagination */}
                      <div className={shellStyles.canonicalTableFooter}>
                        <div className={shellStyles.canonicalFooterLeading}>
                          <span className={shellStyles.canonicalFooterCount}>
                            {isAr
                              ? `عرض ${Math.min(filteredCostItems.length, (costCurrentPage - 1) * costPageSize + 1)} إلى ${Math.min(filteredCostItems.length, costCurrentPage * costPageSize)} من أصل ${filteredCostItems.length} سجل`
                              : `Showing ${Math.min(filteredCostItems.length, (costCurrentPage - 1) * costPageSize + 1)} to ${Math.min(filteredCostItems.length, costCurrentPage * costPageSize)} of ${filteredCostItems.length} records`}
                          </span>
                          <select
                            value={costPageSize}
                            onChange={(e) => {
                              setCostPageSize(Number(e.target.value));
                              setCostCurrentPage(1);
                            }}
                            className={shellStyles.canonicalPageSizeSelect}
                          >
                            <option value={5}>5 / {isAr ? 'صفحة' : 'page'}</option>
                            <option value={10}>10 / {isAr ? 'صفحة' : 'page'}</option>
                            <option value={20}>20 / {isAr ? 'صفحة' : 'page'}</option>
                            <option value={50}>50 / {isAr ? 'صفحة' : 'page'}</option>
                          </select>
                        </div>

                        <div className={shellStyles.canonicalPaginationGroup}>
                          <button
                            type="button"
                            disabled={costCurrentPage <= 1}
                            onClick={() => setCostCurrentPage(p => Math.max(1, p - 1))}
                            className={shellStyles.canonicalPaginationBtn}
                            aria-label={isAr ? 'الصفحة السابقة' : 'Previous Page'}
                          >
                            {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                          </button>

                          {Array.from({ length: totalCostPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCostCurrentPage(pageNum)}
                              className={`${shellStyles.canonicalPaginationBtn} ${pageNum === costCurrentPage ? shellStyles.canonicalPaginationBtnActive : ''}`}
                            >
                              {pageNum}
                            </button>
                          ))}

                          <button
                            type="button"
                            disabled={costCurrentPage >= totalCostPages}
                            onClick={() => setCostCurrentPage(p => Math.min(totalCostPages, p + 1))}
                            className={shellStyles.canonicalPaginationBtn}
                            aria-label={isAr ? 'الصفحة التالية' : 'Next Page'}
                          >
                            {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                {isAr ? 'يرجى اختيار عقار من القائمة لعرض تفاصيل دورة الحياة.' : 'Please select a property to inspect lifecycle dossier.'}
              </div>
            )}
          </div>
        </>
      )}

      {/* COMPANION SIDE WIDGETS (COLUMN 3 PORTAL) */}
      <ZFWorkstationSideWidgets>
        <div className={vStyles.sideWidgetsWrap}>
          {/* Card 0: دليل المشروعات السريع (Quick Projects Directory) */}
          <div className={vStyles.sideWidgetCard}>
            <div className={vStyles.directoryHeader}>
              <div className={vStyles.sideWidgetTitleWrap}>
                <div className={vStyles.cardIconSquircle}>
                  <Building2 size={15} />
                </div>
                <h4 className={vStyles.sideWidgetTitle}>
                  {isAr ? 'دليل المشروعات السريع' : 'Quick Projects Directory'}
                </h4>
              </div>
              <span className={vStyles.directoryCountPill}>
                {directoryFilteredProperties.length} {isAr ? 'مشروع' : 'projects'}
              </span>
            </div>

            {/* Sticky Search Input */}
            <div className={vStyles.directorySearchWrap}>
              <Search size={14} className={vStyles.directorySearchIcon} />
              <input
                type="text"
                value={directorySearchQuery}
                onChange={(e) => setDirectorySearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالعقار أو الموقع...' : 'Search property or location...'}
                className={vStyles.directorySearchInput}
              />
            </div>

            {/* عرض النظرة الكلية للمحفظة at top */}
            <button
              type="button"
              className={`${vStyles.directoryOverviewCard} ${viewMode === 'portfolio' ? vStyles.directoryOverviewCardActive : ''}`}
              onClick={() => handleViewModeChange('portfolio')}
            >
              <div className={vStyles.overviewLeading}>
                <div className={vStyles.overviewIconSquircle}>
                  <BarChart3 size={15} />
                </div>
                <div className={vStyles.overviewTextWrap}>
                  <span className={vStyles.overviewTitle}>
                    {isAr ? 'عرض النظرة الكلية للمحفظة' : 'All Properties Overview'}
                  </span>
                  <span className={vStyles.overviewSub}>
                    {isAr ? 'التحليلات والمقارنة الاستثمارية' : 'Aggregate benchmarks'}
                  </span>
                </div>
              </div>
              <span className={vStyles.overviewCountBadge}>
                {properties.length}
              </span>
            </button>

            {/* Scrollable list of properties */}
            <div className={vStyles.directoryListScroll}>
              {directoryFilteredProperties.length > 0 ? (
                directoryFilteredProperties.map(p => {
                  const pAnalysis = propertiesAnalysisMap.get(p.id);
                  const isSelected = viewMode === 'property' && selectedPropertyId === p.id;
                  const totalUnits = pAnalysis ? pAnalysis.totalUnits : (p.building_units?.length || 0);
                  const actualCost = pAnalysis ? pAnalysis.breakdown.totalInvestedCapital : new Decimal(0);
                  const isSold = p.listing_status === 'sold' || pAnalysis?.status === 'sold';
                  const isUnderOffer = p.listing_status === 'under_offer' || pAnalysis?.status === 'under_offer';
                  const isReady = p.completion_status === 'ready' || pAnalysis?.status === 'ready';

                  return (
                    <div
                      key={p.id}
                      className={`${vStyles.directoryPropertyItem} ${isSelected ? vStyles.directoryPropertyItemActive : ''}`}
                      onClick={() => handleSelectAndInspectProperty(p.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectAndInspectProperty(p.id);
                        }
                      }}
                    >
                      <div className={vStyles.directoryItemTop}>
                        <div className={vStyles.directoryItemLeading}>
                          <div className={vStyles.directorySquircleIcon}>
                            <Building2 size={13} />
                          </div>
                          <div className={vStyles.directoryTitleWrap}>
                            <span className={vStyles.directoryPropertyTitle} title={isAr ? p.title_ar : p.title_en}>
                              {isAr ? p.title_ar : p.title_en}
                            </span>
                            <div className={vStyles.directoryPropertyMeta}>
                              <span>{p.location || (isAr ? 'غير محدد' : 'N/A')}</span>
                              <span>•</span>
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalUnits} {isAr ? 'وحدة' : 'units'}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`${shellStyles.statusPill} ${
                          isSold ? shellStyles.statusPillNeutral :
                          isReady ? shellStyles.statusPillGreen :
                          isUnderOffer ? shellStyles.statusPillAmber :
                          shellStyles.statusPillAmber
                        }`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                          {isSold ? (isAr ? 'مباع' : 'Sold') :
                           isReady ? (isAr ? 'جاهز' : 'Ready') :
                           isUnderOffer ? (isAr ? 'تحت الحجز' : 'Under Offer') :
                           (isAr ? 'قيد التنفيذ' : 'In Progress')}
                        </span>
                      </div>

                      <div className={vStyles.directoryItemBottom}>
                        <span className={vStyles.directoryCostLabel}>
                          {isAr ? 'المنصرف الفعلي:' : 'Incurred Cost:'}
                        </span>
                        <span className={vStyles.directoryCostVal}>
                          {formatCompactEGP(actualCost, isAr)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={vStyles.directoryEmptyState}>
                  {isAr ? 'لا توجد مشاريع تطابق البحث' : 'No properties found'}
                </div>
              )}
            </div>
          </div>

          {viewMode === 'portfolio' ? (
            <>
              {/* Card 1: Portfolio Health & Structure */}
              <div className={vStyles.sideWidgetCard}>
                <div className={vStyles.sideWidgetHeader}>
                  <div className={vStyles.sideWidgetTitleWrap}>
                    <div className={vStyles.cardIconSquircle}>
                      <BarChart3 size={15} />
                    </div>
                    <h4 className={vStyles.sideWidgetTitle}>
                      {isAr ? 'مؤشرات صحة المحفظة' : 'Portfolio Health Index'}
                    </h4>
                  </div>
                  <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                    {isAr ? `${filteredProperties.length} عقار متاح` : `${filteredProperties.length} Properties`}
                  </span>
                </div>

                {/* 2x2 Specs Grid */}
                <div className={vStyles.showcaseSpecs2x2}>
                  <div className={vStyles.showcaseSpecItem}>
                    <span className={vStyles.showcaseSpecLabel}>{isAr ? 'إجمالي المشاريع' : 'Total Projects'}</span>
                    <span className={vStyles.showcaseSpecVal}>{macroAnalysis.totalPropertiesCount}</span>
                  </div>
                  <div className={vStyles.showcaseSpecItem}>
                    <span className={vStyles.showcaseSpecLabel}>{isAr ? 'متاح للبيع' : 'Available'}</span>
                    <span className={vStyles.showcaseSpecVal}>
                      {macroAnalysis.statusDistribution.find(s => s.status === 'active')?.count || 0}
                    </span>
                  </div>
                  <div className={vStyles.showcaseSpecItem}>
                    <span className={vStyles.showcaseSpecLabel}>{isAr ? 'تحت الحجز' : 'Reserved'}</span>
                    <span className={vStyles.showcaseSpecVal}>
                      {macroAnalysis.statusDistribution.find(s => s.status === 'under_offer')?.count || 0}
                    </span>
                  </div>
                  <div className={vStyles.showcaseSpecItem}>
                    <span className={vStyles.showcaseSpecLabel}>{isAr ? 'مباع بالكامل' : 'Sold Out'}</span>
                    <span className={vStyles.showcaseSpecVal}>
                      {macroAnalysis.statusDistribution.find(s => s.status === 'sold')?.count || 0}
                    </span>
                  </div>
                </div>

                {/* Financial Summary Table */}
                <div className={vStyles.specsTable}>
                  <div className={vStyles.specRow}>
                    <span className={vStyles.specLabel}>{isAr ? 'رأس المال المستثمر' : 'Total Invested'}</span>
                    <span className={vStyles.specValue}>{formatCompactEGP(macroAnalysis.totalInvestedCapital, isAr)}</span>
                  </div>
                  <div className={vStyles.specRow}>
                    <span className={vStyles.specLabel}>{isAr ? 'المبيعات الفعلية' : 'Realized Sales'}</span>
                    <span className={vStyles.specValue}>{formatCompactEGP(macroAnalysis.totalContractedSales, isAr)}</span>
                  </div>
                  <div className={vStyles.specRow}>
                    <span className={vStyles.specLabel}>{isAr ? 'الأرباح التقديرية' : 'Expected Profit'}</span>
                    <span className={vStyles.specValue} style={{ color: '#16a34a' }}>{formatCompactEGP(macroAnalysis.totalExpectedProfit, isAr)}</span>
                  </div>
                  <div className={`${vStyles.specRow} ${vStyles.specRowHighlighted}`}>
                    <span className={vStyles.specLabel} style={{ color: currentAccent }}>{isAr ? 'متوسط العائد ROI' : 'Average ROI'}</span>
                    <span className={vStyles.specValue} style={{ color: currentAccent }}>{macroAnalysis.averageRoiPct.toFixed(1)}%</span>
                  </div>
                </div>

                {selectedProperty && (
                  <button
                    type="button"
                    className={vStyles.showcaseFullDetailsBtn}
                    onClick={() => handleViewModeChange('property')}
                  >
                    <span>{isAr ? `فحص ملف: ${selectedProperty.title_ar || selectedProperty.title_en} ↗` : `Inspect ${selectedProperty.title_en || selectedProperty.title_ar} ↗`}</span>
                    {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
              </div>

              {/* Card 2: Quick Portfolio Operations */}
              <div className={vStyles.sideWidgetCard}>
                <div className={vStyles.sideWidgetHeader}>
                  <div className={vStyles.sideWidgetTitleWrap}>
                    <div className={vStyles.cardIconSquircle}>
                      <Sparkles size={15} />
                    </div>
                    <h4 className={vStyles.sideWidgetTitle}>
                      {isAr ? 'إجراءات المحفظة السريعة' : 'Portfolio Operations'}
                    </h4>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Action 1: Add Cost / Expense */}
                  <button
                    type="button"
                    className={vStyles.sideQuickActionBtn}
                    onClick={() => {
                      if (onOpenQuickExpense) {
                        onOpenQuickExpense();
                      } else {
                        toast.info(isAr ? 'فتح نافذة تسجيل المصروفات السريعة' : 'Open Quick Expense Modal');
                      }
                    }}
                  >
                    <div className={vStyles.sideQuickActionLeading}>
                      <div className={vStyles.sideQuickActionIconBox} style={{ color: '#16a34a' }}>
                        <Plus size={14} />
                      </div>
                      <span className={vStyles.sideQuickActionText}>
                        {isAr ? 'إضافة تكلفة / مصروف للمشاريع' : 'Add Cost / Expense'}
                      </span>
                    </div>
                    {isAr ? <ChevronLeft size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                  </button>

                  {/* Action 2: Inspect Selected Property */}
                  {selectedProperty && (
                    <button
                      type="button"
                      className={vStyles.sideQuickActionBtn}
                      onClick={() => handleViewModeChange('property')}
                    >
                      <div className={vStyles.sideQuickActionLeading}>
                        <div className={vStyles.sideQuickActionIconBox} style={{ color: currentAccent }}>
                          <Building2 size={14} />
                        </div>
                        <span className={vStyles.sideQuickActionText}>
                          {isAr ? 'فتح ملف العقار المحدد' : 'Open Property Dossier'}
                        </span>
                      </div>
                      {isAr ? <ChevronLeft size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                    </button>
                  )}

                  {/* Action 3: Export Feasibility Excel */}
                  <button
                    type="button"
                    className={vStyles.sideQuickActionBtn}
                    onClick={handleExportPropertyExcel}
                  >
                    <div className={vStyles.sideQuickActionLeading}>
                      <div className={vStyles.sideQuickActionIconBox} style={{ color: '#0ea5e9' }}>
                        <TableIcon size={14} />
                      </div>
                      <span className={vStyles.sideQuickActionText}>
                        {isAr ? 'تصدير دراسة الجدوى Excel' : 'Export Feasibility Excel'}
                      </span>
                    </div>
                    {isAr ? <ChevronLeft size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                  </button>

                  {/* Action 4: Construction Hub */}
                  <button
                    type="button"
                    className={vStyles.sideQuickActionBtn}
                    onClick={() => {
                      if (onNavigateTab) {
                        onNavigateTab('construction');
                      } else {
                        toast.info(isAr ? 'لوحة إدارة المشاريع والإنشاءات' : 'Construction Projects Hub');
                      }
                    }}
                  >
                    <div className={vStyles.sideQuickActionLeading}>
                      <div className={vStyles.sideQuickActionIconBox} style={{ color: '#d97706' }}>
                        <Layers size={14} />
                      </div>
                      <span className={vStyles.sideQuickActionText}>
                        {isAr ? 'مركز إدارة المشاريع والإنشاءات' : 'Construction Projects Hub'}
                      </span>
                    </div>
                    {isAr ? <ChevronLeft size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                  </button>

                  {/* Action 5: Print Portfolio Summary */}
                  <button
                    type="button"
                    className={vStyles.sideQuickActionBtn}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.print();
                      }
                    }}
                  >
                    <div className={vStyles.sideQuickActionLeading}>
                      <div className={vStyles.sideQuickActionIconBox} style={{ color: '#6366f1' }}>
                        <Printer size={14} />
                      </div>
                      <span className={vStyles.sideQuickActionText}>
                        {isAr ? 'طباعة تقرير المحفظة' : 'Print Portfolio Summary'}
                      </span>
                    </div>
                    {isAr ? <ChevronLeft size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
          {selectedPropertyAnalysis && (
            <div className={vStyles.sideWidgetCard}>
              <div className={vStyles.sideWidgetHeader}>
                <div className={vStyles.sideWidgetTitleWrap}>
                  <div className={vStyles.cardIconSquircle}>
                    <Building2 size={15} />
                  </div>
                  <h4 className={vStyles.sideWidgetTitle}>
                    {isAr ? 'بطاقة هوية العقار' : 'Property Showcase'}
                  </h4>
                </div>
                <span className={`${shellStyles.statusPill} ${selectedPropertyAnalysis.status === 'sold' ? shellStyles.statusPillNeutral : shellStyles.statusPillGreen}`}>
                  {selectedPropertyAnalysis.statusLabel}
                </span>
              </div>

              <div className={vStyles.propertyShowcaseImageWrap}>
                <div className={vStyles.showcaseBadgeOverlay}>
                  <span className={`${shellStyles.statusPill} ${selectedPropertyAnalysis.status === 'sold' ? shellStyles.statusPillNeutral : shellStyles.statusPillGreen}`}>
                    {selectedPropertyAnalysis.statusLabel}
                  </span>
                </div>
                {selectedPropertyAnalysis.property.property_images && selectedPropertyAnalysis.property.property_images.length > 0 ? (
                  <img
                    src={selectedPropertyAnalysis.property.property_images[0].url}
                    alt={selectedPropertyAnalysis.titleAr}
                    className={vStyles.propertyShowcaseImage}
                  />
                ) : (
                  <div className={vStyles.propertyShowcasePlaceholder}>
                    <Building2 size={32} />
                    <span style={{ fontSize: '0.72rem' }}>{isAr ? 'صورة العقار الرسمية' : 'Property Showcase'}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? selectedPropertyAnalysis.titleAr : selectedPropertyAnalysis.titleEn}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} />
                  {selectedPropertyAnalysis.location || (isAr ? 'غير محدد' : 'N/A')}
                </span>
              </div>

              {/* 2x2 Specs Grid */}
              <div className={vStyles.showcaseSpecs2x2}>
                <div className={vStyles.showcaseSpecItem}>
                  <span className={vStyles.showcaseSpecLabel}>{isAr ? 'المساحة الكلية' : 'Total Area'}</span>
                  <span className={vStyles.showcaseSpecVal}>{selectedPropertyAnalysis.areaSqm} م²</span>
                </div>
                <div className={vStyles.showcaseSpecItem}>
                  <span className={vStyles.showcaseSpecLabel}>{isAr ? 'نوع العقار' : 'Property Type'}</span>
                  <span className={vStyles.showcaseSpecVal}>
                    {selectedPropertyAnalysis.property.type === 'apartment' ? (isAr ? 'شقة سكنية' : 'Apartment')
                      : selectedPropertyAnalysis.property.type === 'building' ? (isAr ? 'عمارة كاملة' : 'Building')
                      : selectedPropertyAnalysis.property.type === 'villa' ? (isAr ? 'فيلا مستقلة' : 'Villa')
                      : (isAr ? 'دوبلكس' : 'Duplex')}
                  </span>
                </div>
                <div className={vStyles.showcaseSpecItem}>
                  <span className={vStyles.showcaseSpecLabel}>{isAr ? 'عدد الوحدات' : 'Units Count'}</span>
                  <span className={vStyles.showcaseSpecVal}>{selectedPropertyAnalysis.totalUnits} {isAr ? 'وحدة' : 'units'}</span>
                </div>
                <div className={vStyles.showcaseSpecItem}>
                  <span className={vStyles.showcaseSpecLabel}>{isAr ? 'سعر المستهدف' : 'Target Price'}</span>
                  <span className={vStyles.showcaseSpecVal}>{formatCompactEGP(selectedPropertyAnalysis.expectedTotalSales, isAr)}</span>
                </div>
              </div>

              <button
                type="button"
                className={vStyles.showcaseFullDetailsBtn}
                onClick={() => {
                  const el = document.getElementById('property-dossier-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span>{isAr ? 'عرض التفاصيل الكاملة' : 'View Full Details'}</span>
                {isAr ? <ArrowDownLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          )}

          {/* Card 2: Detailed Financial Specs */}
          {selectedPropertyAnalysis && (
            <div className={vStyles.sideWidgetCard}>
              <div className={vStyles.sideWidgetHeader}>
                <div className={vStyles.sideWidgetTitleWrap}>
                  <div className={vStyles.cardIconSquircle}>
                    <SlidersHorizontal size={15} />
                  </div>
                  <h4 className={vStyles.sideWidgetTitle}>
                    {isAr ? 'المواصفات المالية والهندسية' : 'Financial & Engineering Specs'}
                  </h4>
                </div>
              </div>

              <div className={vStyles.specsTable}>
                <div className={vStyles.specRow}>
                  <span className={vStyles.specLabel}>{isAr ? 'كود العقار' : 'Property ID'}</span>
                  <span className={vStyles.specValue}>#{selectedPropertyAnalysis.propertyId.slice(0, 8)}</span>
                </div>

                <div className={vStyles.specRow}>
                  <span className={vStyles.specLabel}>{isAr ? 'المساحة الإجمالية' : 'Total Area'}</span>
                  <span className={vStyles.specValue}>{selectedPropertyAnalysis.areaSqm} م²</span>
                </div>

                <div className={vStyles.specRow}>
                  <span className={vStyles.specLabel}>{isAr ? 'عدد الوحدات / الطوابق' : 'Units / Floors'}</span>
                  <span className={vStyles.specValue}>{selectedPropertyAnalysis.totalUnits} {isAr ? 'وحدة' : 'units'}</span>
                </div>

                <div className={vStyles.specRow}>
                  <span className={vStyles.specLabel}>{isAr ? 'حصة الأرض' : 'Land Share'}</span>
                  <span className={vStyles.specValue}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.landCost, isAr)}</span>
                </div>

                <div className={vStyles.specRow}>
                  <span className={vStyles.specLabel}>{isAr ? 'مصاريف البناء WIP' : 'Construction WIP'}</span>
                  <span className={vStyles.specValue}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.totalConstructionWip, isAr)}</span>
                </div>

                <div className={`${vStyles.specRow} ${vStyles.specRowHighlighted}`}>
                  <span className={vStyles.specLabel} style={{ color: currentAccent }}>{isAr ? 'إجمالي الاستثمار' : 'Total Investment'}</span>
                  <span className={vStyles.specValue} style={{ color: currentAccent }}>{formatCompactEGP(selectedPropertyAnalysis.breakdown.totalInvestedCapital, isAr)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Analysis & Auditing Notes */}
          <div className={vStyles.sideWidgetCard}>
            <div className={vStyles.sideWidgetHeader}>
              <div className={vStyles.sideWidgetTitleWrap}>
                <div className={vStyles.cardIconSquircle}>
                  <FileText size={15} />
                </div>
                <h4 className={vStyles.sideWidgetTitle}>
                  {isAr ? 'ملاحظات التحليل والمراجعة' : 'Audit & Analysis Notes'}
                </h4>
              </div>
            </div>

            <textarea
              value={selectedProperty ? (propertyNotes[selectedProperty.id] || '') : ''}
              onChange={e => {
                if (selectedProperty) {
                  const val = e.target.value;
                  setPropertyNotes(prev => ({ ...prev, [selectedProperty.id]: val }));
                }
              }}
              placeholder={isAr ? 'أدخل ملاحظات التدقيق ودراسة الجدوى وتوصيات التسعير...' : 'Enter feasibility audit notes and pricing recommendations...'}
              className={vStyles.auditNotesTextarea}
            />
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {isAr ? 'يتم حفظ الملاحظات تلقائياً أثناء جلسة العمل' : 'Notes auto-saved during active session'}
            </span>
          </div>
        </>
      )}
    </div>
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
