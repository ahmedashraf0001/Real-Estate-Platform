'use client';
import React, { useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { PropertyDetailView } from './PropertyDetailView';
import { usePlatformSettings, useSettingsPreview } from '@/lib/hooks/usePlatformSettings';
import { DEFAULT_ABOUT_CONTENT } from '@/lib/siteContent/defaults';
import { buildZoneInstances } from '@/lib/layering/instances';
import { adaptProperty } from '@/lib/utils/propertyAdapter';
import type { Property } from '@/lib/supabase/types';

// Explicitly requested preview-only sample. Never enters the catalog data, counts or persistence.
export function PreviewEmptyProperty({ locale }: { locale: string }) {
  const { active, value } = useSettingsPreview();
  const settings = usePlatformSettings();
  const property = useMemo(() => {
    const [latitude, longitude] = DEFAULT_ABOUT_CONTENT.coordinates.en.match(/[\d.]+/g)!.map(Number);
    const district = settings.marketDistricts[0];
    const record: Property = { id: 'settings-preview', slug: 'settings-preview',
      title_en: settings.home!.featuredTitle1En!, title_ar: settings.home!.featuredTitle1Ar!, description_en: '', description_ar: '',
      price_egp: district?.pricePerSqm || 0, area_sqm: 0, bedrooms: 0, bathrooms: 0, type: 'apartment', location: district?.district || '',
      latitude, longitude, completion_status: 'ready', listing_status: 'active', is_featured: false, created_at: '', property_images: [],
      spec_layers: buildZoneInstances('apartment', 'fully_finished') };
    return adaptProperty(record, locale === 'ar' ? 'ar' : 'en');
  }, [locale, settings]);
  if (!active) return null;
  return <section className="settings-preview-sample">
    <p>{locale === 'ar' ? 'مثال للمعاينة' : 'Preview sample'}</p>
    <div data-preview-target="price"><PropertyCard property={property} locale={locale} preview /></div>
    {['plans', 'commute'].includes(value?.target || '') && <PropertyDetailView property={property} locale={locale} preview />}
  </section>;
}
