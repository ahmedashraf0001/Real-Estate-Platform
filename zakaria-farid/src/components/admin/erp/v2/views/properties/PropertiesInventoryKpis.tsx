'use client';

import React from 'react';
import { Tag, Layers, Coins, TrendingUp } from 'lucide-react';
import { Decimal } from '@/lib/erp/math';
import { ZFKpiGrid, ZFKpiCard } from '../../ZFKpiCard';

export interface PropertiesInventoryKpisProps {
  totalUnitsCount: number;
  availableUnitsCount: number;
  contractedUnitsCount: number;
  totalCatalogVal: Decimal;
  availableInventoryVal: Decimal;
  contractedSalesVal: Decimal;
  totalAreaSqm: Decimal;
  avgPricePerSqm: Decimal;
  totalWipInvested: Decimal;
  costItemsCount?: number;
  isAr?: boolean;
}

/** Inventory & pricing KPIs — the same 4-card row every FIN-OS page uses. */
export const PropertiesInventoryKpis: React.FC<PropertiesInventoryKpisProps> = ({
  totalUnitsCount,
  availableUnitsCount,
  contractedUnitsCount,
  totalCatalogVal,
  availableInventoryVal,
  contractedSalesVal,
  totalAreaSqm,
  avgPricePerSqm,
  totalWipInvested,
  costItemsCount = 0,
  isAr = true,
}) => {
  const cur = isAr ? 'ج.م' : 'EGP';
  const fmt = (d: Decimal) => Math.round(d.toNumber()).toLocaleString('en-US');
  const total = totalCatalogVal.toNumber();
  const pct = (d: Decimal) => (total > 0 ? Math.min(100, Math.max(0, Math.round((d.toNumber() / total) * 100))) : 0);
  const units = (n: number) => (isAr ? `${n} وحدة` : `${n} units`);

  return (
    <ZFKpiGrid>
      <ZFKpiCard
        title={isAr ? 'متوسط سعر المتر' : 'Average price per m²'}
        value={fmt(avgPricePerSqm)}
        currency={isAr ? 'ج.م/م²' : 'EGP/m²'}
        icon={<Tag size={16} />}
        accentColor="accent"
        subtitleLabel={isAr ? 'إجمالي المساحات' : 'Total area'}
        subtitleValue={`${fmt(totalAreaSqm)} ${isAr ? 'م²' : 'm²'}`}
      />
      <ZFKpiCard
        title={isAr ? 'قيمة المتاح للبيع' : 'Available inventory'}
        value={fmt(availableInventoryVal)}
        currency={cur}
        icon={<Layers size={16} />}
        accentColor="amber"
        progress={pct(availableInventoryVal)}
        subtitleLabel={isAr ? 'وحدات متاحة' : 'Available units'}
        subtitleValue={`${units(availableUnitsCount)} • ${pct(availableInventoryVal)}%`}
      />
      <ZFKpiCard
        title={isAr ? 'تكلفة البناء المسجلة' : 'Recorded building cost'}
        value={fmt(totalWipInvested)}
        currency={cur}
        icon={<Coins size={16} />}
        accentColor="slate"
        subtitleLabel={isAr ? 'بنود التكلفة' : 'Cost items'}
        subtitleValue={isAr ? `${costItemsCount} بند` : `${costItemsCount} items`}
      />
      <ZFKpiCard
        title={isAr ? 'قيمة المبيعات المتعاقد عليها' : 'Contracted sales'}
        value={fmt(contractedSalesVal)}
        currency={cur}
        icon={<TrendingUp size={16} />}
        accentColor="emerald"
        progress={pct(contractedSalesVal)}
        subtitleLabel={isAr ? 'وحدات مباعة' : 'Units sold'}
        subtitleValue={`${units(contractedUnitsCount)} ${isAr ? 'من' : 'of'} ${totalUnitsCount} • ${pct(contractedSalesVal)}%`}
      />
    </ZFKpiGrid>
  );
};

export default PropertiesInventoryKpis;
