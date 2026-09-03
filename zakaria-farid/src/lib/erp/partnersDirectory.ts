// ============================================================================
// PARTNERS & CONTRIBUTORS REGISTRY AND BALANCING ENGINE
// ============================================================================

export interface SystemPartner {
  name: string;
  role: string;
  isPermanent?: boolean;
}

export interface PartnerShareItem {
  partnerName: string;
  sharePct: number;
  isPermanent?: boolean;
}

export const PRIMARY_DEVELOPER_NAME = 'زكريا فريد';

export const INITIAL_REGISTERED_PARTNERS: SystemPartner[] = [
  { name: PRIMARY_DEVELOPER_NAME, role: 'المطور الرئيسي / مالك المنظومة', isPermanent: true }
];

/**
 * Returns a unified single source of truth for all registered and active partners
 * across Contributed Capital (partner calls), Properties, and Sales Contracts.
 */
export function getUnifiedPartnersDirectory(
  partnerCalls: Array<{ partner_name?: string }> = [],
  properties: Array<{ partner_splits?: any[] }> = [],
  contracts: Array<{ partner_splits?: any[] }> = []
): SystemPartner[] {
  const map = new Map<string, SystemPartner>();

  // Zakaria Farid is always the primary developer
  map.set(PRIMARY_DEVELOPER_NAME, {
    name: PRIMARY_DEVELOPER_NAME,
    role: 'المطور الرئيسي / مالك المنظومة',
    isPermanent: true
  });

  // Collect from Contributed Capital calls
  partnerCalls.forEach(pc => {
    const name = (pc.partner_name || '').trim();
    if (name && !map.has(name) && name !== 'شريك 2') {
      map.set(name, {
        name,
        role: 'شريك ممول (Contributed Capital)',
        isPermanent: false
      });
    }
  });

  // Collect from Properties
  properties.forEach(p => {
    (p.partner_splits || []).forEach((split: any) => {
      const name = (split.partnerName || split.partner_name || '').trim();
      if (name && !map.has(name)) {
        map.set(name, {
          name,
          role: 'شريك مساهم في العقار',
          isPermanent: false
        });
      }
    });
  });

  // Collect from Contracts
  contracts.forEach(c => {
    (c.partner_splits || []).forEach((split: any) => {
      const name = (split.partnerName || split.partner_name || '').trim();
      if (name && !map.has(name)) {
        map.set(name, {
          name,
          role: 'شريك بحصة إيراد تعاقدي',
          isPermanent: false
        });
      }
    });
  });

  return Array.from(map.values());
}

/**
 * Normalizes partner list so Zakaria Farid is always present and non-removable.
 */
export function normalizePartnerSplits(
  splits?: Array<{ partnerName?: string; partner_name?: string; sharePct?: number; share_percentage?: number | string }> | null
): PartnerShareItem[] {
  if (!splits || splits.length === 0) {
    return [{ partnerName: PRIMARY_DEVELOPER_NAME, sharePct: 100, isPermanent: true }];
  }

  const items: PartnerShareItem[] = splits.map(s => {
    const name = (s.partnerName || s.partner_name || '').trim();
    const rawPct = s.sharePct !== undefined ? s.sharePct : (s.share_percentage !== undefined ? s.share_percentage : 0);
    const pct = typeof rawPct === 'string' ? parseFloat(rawPct.replace('%', '')) || 0 : Number(rawPct) || 0;
    return {
      partnerName: name,
      sharePct: Math.round(pct),
      isPermanent: name === PRIMARY_DEVELOPER_NAME
    };
  }).filter(p => p.partnerName.length > 0);

  // Ensure Zakaria Farid exists
  const hasPrimary = items.some(p => p.partnerName === PRIMARY_DEVELOPER_NAME);
  if (!hasPrimary) {
    items.unshift({ partnerName: PRIMARY_DEVELOPER_NAME, sharePct: 50, isPermanent: true });
  }

  // If only 1 partner, ensure 100%
  if (items.length === 1) {
    items[0].sharePct = 100;
  }

  return items;
}

/**
 * Smart Partner Removal:
 * - If Zakaria Farid: block removal.
 * - When removed, if only 1 partner remains, set to 100%.
 * - Otherwise, automatically add the removed share to Zakaria Farid so total stays 100%.
 */
export function smartRemovePartner(
  current: PartnerShareItem[],
  indexToRemove: number
): PartnerShareItem[] {
  const target = current[indexToRemove];
  if (!target || target.isPermanent || target.partnerName === PRIMARY_DEVELOPER_NAME) {
    return current; // Protected
  }

  const removedShare = target.sharePct;
  const remaining = current.filter((_, idx) => idx !== indexToRemove);

  if (remaining.length === 1) {
    remaining[0].sharePct = 100;
    return remaining;
  }

  // Re-absorb the freed equity share into Zakaria Farid
  const primaryIdx = remaining.findIndex(p => p.partnerName === PRIMARY_DEVELOPER_NAME);
  if (primaryIdx !== -1) {
    remaining[primaryIdx].sharePct = Math.min(100, remaining[primaryIdx].sharePct + removedShare);
  }

  return remaining;
}

/**
 * Smart Partner Addition:
 * - Docks requested share from Zakaria Farid if he has surplus, keeping sum at 100%.
 */
export function smartAddPartner(
  current: PartnerShareItem[],
  newPartnerName: string,
  requestedSharePct: number = 25
): PartnerShareItem[] {
  const name = newPartnerName.trim();
  if (!name || current.some(p => p.partnerName.toLowerCase() === name.toLowerCase())) {
    return current;
  }

  const currentTotal = current.reduce((sum, p) => sum + p.sharePct, 0);
  const primaryIdx = current.findIndex(p => p.partnerName === PRIMARY_DEVELOPER_NAME);

  let newShare = requestedSharePct;

  if (primaryIdx !== -1 && currentTotal >= 100) {
    const primaryShare = current[primaryIdx].sharePct;
    // Don't reduce Zakaria below 10%
    const maxDeduct = Math.max(0, primaryShare - 10);
    newShare = Math.min(requestedSharePct, maxDeduct);
    current[primaryIdx].sharePct = primaryShare - newShare;
  } else if (currentTotal < 100) {
    newShare = Math.max(5, 100 - currentTotal);
  }

  return [
    ...current,
    {
      partnerName: name,
      sharePct: newShare,
      isPermanent: name === PRIMARY_DEVELOPER_NAME
    }
  ];
}

/**
 * Auto-balances shares so total is exactly 100% by adjusting Zakaria Farid.
 */
export function autoBalanceShares(current: PartnerShareItem[]): PartnerShareItem[] {
  if (current.length === 0) {
    return [{ partnerName: PRIMARY_DEVELOPER_NAME, sharePct: 100, isPermanent: true }];
  }
  if (current.length === 1) {
    return [{ ...current[0], sharePct: 100 }];
  }

  const othersSum = current
    .filter(p => p.partnerName !== PRIMARY_DEVELOPER_NAME)
    .reduce((sum, p) => sum + p.sharePct, 0);

  const primaryShare = Math.max(1, 100 - othersSum);

  return current.map(p => {
    if (p.partnerName === PRIMARY_DEVELOPER_NAME) {
      return { ...p, sharePct: primaryShare };
    }
    return p;
  });
}
