import React from 'react';
import {
  Building2,
  Landmark,
  Building,
  Scale,
  ShieldCheck,
  Award,
  PiggyBank,
  TrendingUp,
  Coins,
  ArrowDownLeft,
  Receipt,
  CreditCard,
  FileMinus,
  Wallet,
  Users,
  HandCoins,
  Boxes,
  Layers,
  HardHat,
  Truck,
  Briefcase,
  Percent,
  Home,
  Wrench,
  PieChart,
  Megaphone
} from 'lucide-react';
import { ERPAccount } from '@/lib/erp/types';

export interface SemanticIconOptions {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

/**
 * Returns the semantic icon name for a given account code or ERPAccount.
 */
export function getAccountSemanticIconName(codeOrAcc: string | ERPAccount): string {
  const code = typeof codeOrAcc === 'string' ? codeOrAcc : codeOrAcc.account_code;
  const accType = typeof codeOrAcc === 'object' ? codeOrAcc.account_type : undefined;

  // Level 2/3/4 Specific account code prefix mappings
  if (code.startsWith('101')) return 'Wallet';
  if (code.startsWith('102')) return 'Landmark';
  if (code.startsWith('103')) return 'Users';
  if (code.startsWith('104')) return 'HandCoins';
  if (code.startsWith('105')) return 'Boxes';
  if (code.startsWith('106') || code.startsWith('107')) return 'Building';
  if (code.startsWith('15')) return 'HardHat'; // Construction WIP & Fixed Assets

  if (code.startsWith('201')) return 'Truck';
  if (code.startsWith('202')) return 'Briefcase';
  if (code.startsWith('203')) return 'Users';
  if (code.startsWith('204') || code.startsWith('205')) return 'Percent'; // Real Estate Disposition Taxes (204000) & Taxes (205)
  if (code.startsWith('206')) return 'HandCoins'; // Customer Refund Liability
  if (code.startsWith('207')) return 'ShieldCheck'; // Maintenance Escrow Trust Liability

  if (code.startsWith('301')) return 'PiggyBank';
  if (code.startsWith('302') || code.startsWith('304')) return 'ShieldCheck';
  if (code.startsWith('303')) return 'Award';

  if (code.startsWith('401') || code.startsWith('41')) return 'Home';
  if (code.startsWith('402') || code.startsWith('42') || code.startsWith('430')) return 'Coins';
  if (code.startsWith('403') || code.startsWith('43') || code.startsWith('440')) return 'TrendingUp';

  if (code.startsWith('501') || code.startsWith('503') || code.startsWith('504') || code.startsWith('51')) return 'Wrench';
  if (code.startsWith('502') || code.startsWith('520')) return 'FileMinus';
  if (code.startsWith('601') || code.startsWith('52')) return 'Megaphone';
  if (code.startsWith('602') || code.startsWith('53')) return 'Briefcase';
  if (code.startsWith('603') || code.startsWith('55')) return 'Truck';

  // Fallback to Account Type or Root Code
  if (accType === 'ASSET' || code.startsWith('1')) return 'Building2';
  if (accType === 'LIABILITY' || accType === 'CONTRA_LIABILITY' || code.startsWith('2')) return 'Scale';
  if (accType === 'EQUITY' || code.startsWith('3')) return 'ShieldCheck';
  if (accType === 'REVENUE' || code.startsWith('4')) return 'TrendingUp';
  if (accType === 'EXPENSE' || code.startsWith('5') || code.startsWith('6')) return 'Receipt';

  return 'Layers';
}

/**
 * Returns the semantic React element for a given account code or ERPAccount.
 */
export function getAccountSemanticIcon(
  codeOrAcc: string | ERPAccount,
  options: SemanticIconOptions = {}
): React.ReactElement {
  const { size = 15, className, style, color } = options;
  const iconName = getAccountSemanticIconName(codeOrAcc);

  const iconProps = {
    size,
    className,
    style: color ? { ...style, color } : style
  };

  switch (iconName) {
    case 'Wallet': return <Wallet {...iconProps} />;
    case 'Landmark': return <Landmark {...iconProps} />;
    case 'Users': return <Users {...iconProps} />;
    case 'HandCoins': return <HandCoins {...iconProps} />;
    case 'Boxes': return <Boxes {...iconProps} />;
    case 'Building': return <Building {...iconProps} />;
    case 'HardHat': return <HardHat {...iconProps} />;
    case 'Truck': return <Truck {...iconProps} />;
    case 'Briefcase': return <Briefcase {...iconProps} />;
    case 'Percent': return <Percent {...iconProps} />;
    case 'PiggyBank': return <PiggyBank {...iconProps} />;
    case 'ShieldCheck': return <ShieldCheck {...iconProps} />;
    case 'Award': return <Award {...iconProps} />;
    case 'Home': return <Home {...iconProps} />;
    case 'Coins': return <Coins {...iconProps} />;
    case 'Wrench': return <Wrench {...iconProps} />;
    case 'FileMinus': return <FileMinus {...iconProps} />;
    case 'Building2': return <Building2 {...iconProps} />;
    case 'Scale': return <Scale {...iconProps} />;
    case 'TrendingUp': return <TrendingUp {...iconProps} />;
    case 'Receipt': return <Receipt {...iconProps} />;
    case 'CreditCard': return <CreditCard {...iconProps} />;
    case 'Megaphone': return <Megaphone {...iconProps} />;
    case 'PieChart': return <PieChart {...iconProps} />;
    case 'ArrowDownLeft': return <ArrowDownLeft {...iconProps} />;
    default: return <Layers {...iconProps} />;
  }
}

/**
 * Returns the semantic icon name for COA hierarchy categories (Level 1 and Level 2).
 */
export function getCategorySemanticIconName(code: string): string {
  switch (code) {
    // 1. Assets
    case '1': return 'Building2';
    case '11': return 'Wallet';
    case '12': return 'Landmark';

    // 2. Liabilities
    case '2': return 'Scale';
    case '21': return 'CreditCard';
    case '22': return 'Landmark';

    // 3. Equity
    case '3': return 'Award';
    case '31': return 'Award';
    case '32': return 'ShieldCheck';
    case '33': return 'PieChart';

    // 4. Revenue
    case '4': return 'TrendingUp';
    case '41': return 'TrendingUp';
    case '42': return 'Coins';
    case '43': return 'ArrowDownLeft';

    // 5. Expenses
    case '5': return 'Receipt';
    case '51': return 'HardHat';
    case '52': return 'Megaphone';
    case '53': return 'Briefcase';
    case '55': return 'Truck';

    default: return 'Layers';
  }
}

/**
 * Returns the semantic React element for COA hierarchy categories (Level 1 and Level 2).
 */
export function getCategorySemanticIcon(
  code: string,
  _isSelected: boolean = false,
  size = 15
): React.ReactElement {
  const iconName = getCategorySemanticIconName(code);
  const iconProps = { size };

  switch (iconName) {
    case 'Building2': return <Building2 {...iconProps} />;
    case 'Wallet': return <Wallet {...iconProps} />;
    case 'Landmark': return <Landmark {...iconProps} />;
    case 'Scale': return <Scale {...iconProps} />;
    case 'CreditCard': return <CreditCard {...iconProps} />;
    case 'Award': return <Award {...iconProps} />;
    case 'ShieldCheck': return <ShieldCheck {...iconProps} />;
    case 'PieChart': return <PieChart {...iconProps} />;
    case 'TrendingUp': return <TrendingUp {...iconProps} />;
    case 'Coins': return <Coins {...iconProps} />;
    case 'ArrowDownLeft': return <ArrowDownLeft {...iconProps} />;
    case 'Receipt': return <Receipt {...iconProps} />;
    case 'HardHat': return <HardHat {...iconProps} />;
    case 'Megaphone': return <Megaphone {...iconProps} />;
    case 'Briefcase': return <Briefcase {...iconProps} />;
    case 'Truck': return <Truck {...iconProps} />;
    default: return <Layers {...iconProps} />;
  }
}
