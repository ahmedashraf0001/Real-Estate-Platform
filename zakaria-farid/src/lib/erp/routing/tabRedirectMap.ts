export interface TabRedirectTarget {
  path: string;
  defaultSub?: string;
}

export const TAB_REDIRECT_MAP: Record<string, TabRedirectTarget> = {
  dashboard: { path: '' },
  cockpit: { path: '' },
  operations: { path: 'operations' },
  portfolio: { path: 'properties' },
  properties: { path: 'properties' },
  construction: { path: 'construction' },
  payables: { path: 'construction' },
  ap: { path: 'construction' },
  'construction-payables': { path: 'construction' },
  feasibility: { path: 'calculator' },
  calculator: { path: 'calculator' },
  contracts: { path: 'contracts' },
  registry: { path: 'contracts' },
  handover: { path: 'contracts', defaultSub: 'handover' },
  pdc: { path: 'pdc' },
  vault: { path: 'pdc' },
  rescissions: { path: 'rescissions' },
  rescission: { path: 'rescissions' },
  ledger: { path: 'ledger' },
  journal: { path: 'ledger', defaultSub: 'journal' },
  'cost-allocation': { path: 'cost-allocation' },
  rsv: { path: 'cost-allocation' },
  costallocation: { path: 'cost-allocation' },
  tax: { path: 'tax' },
  taxes: { path: 'tax' },
  partners: { path: 'partners' },
  partner: { path: 'partners' },
  investors: { path: 'partners' },
  financiers: { path: 'partners' },
  analysis: { path: 'analysis' },
  'property-analysis': { path: 'analysis' },
  lifecycle: { path: 'analysis' },
  'feasibility-analysis': { path: 'analysis' },
};

export function resolveTabRedirect(
  locale: string,
  searchParams: Record<string, string | string[] | undefined>
): string | null {
  const rawTab = Array.isArray(searchParams.tab) ? searchParams.tab[0] : searchParams.tab;
  if (!rawTab || typeof rawTab !== 'string') return null;

  const mapping = TAB_REDIRECT_MAP[rawTab.toLowerCase()];
  if (!mapping) return null;

  const targetPath = mapping.path ? `/${mapping.path}` : '';
  const newParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'tab') continue;
    if (typeof value === 'string') {
      newParams.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach(v => newParams.append(key, v));
    }
  }

  if (mapping.defaultSub && !newParams.has('sub')) {
    newParams.set('sub', mapping.defaultSub);
  }

  const safeLocale = locale || 'ar';
  const queryString = newParams.toString();
  return `/fin-os/${safeLocale}${targetPath}${queryString ? `?${queryString}` : ''}`;
}

export const TABS_WITH_SIDE_WIDGETS = new Set<string>([
  'dashboard',
  'cockpit',
  'operations',
  'daily-operations',
  'analysis',
  'partners',
  'partner',
  'calculator',
  'feasibility',
]);

export function isSideWidgetsTab(tab: string): boolean {
  if (!tab || typeof tab !== 'string') return false;
  return TABS_WITH_SIDE_WIDGETS.has(tab.toLowerCase());
}
