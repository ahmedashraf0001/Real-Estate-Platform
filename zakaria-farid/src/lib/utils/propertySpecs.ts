import type { Property } from '@/types';
import type { PropertyType } from '@/lib/supabase/types';

type SpecId = 'floors' | 'units' | 'bedrooms' | 'bathrooms' | 'area' | 'year' | 'finishing' | 'status' | 'type';
export interface PropertySpec { id: SpecId; label: string; value: string }
const types: Record<PropertyType | 'chalet', [string, string]> = {
  apartment: ['شقة سكنية', 'Apartment'], building: ['عمارة سكنية', 'Building'],
  garage: ['جراج', 'Garage'], villa: ['فيلا', 'Villa'], duplex: ['دوبلكس', 'Duplex'],
  penthouse: ['بنتهاوس', 'Penthouse'], townhouse: ['تاون هاوس', 'Townhouse'],
  commercial: ['عقار تجاري', 'Commercial'], chalet: ['شاليه', 'Chalet'],
};
const completion: Record<string, [string, string]> = {
  ready: ['جاهز للاستلام', 'Ready'], off_plan: ['تحت الإنشاء', 'Under construction'],
};
const finishing: Record<string, [string, string]> = {
  red_brick: ['طوب أحمر', 'Red brick'], semi_finished: ['نصف تشطيب', 'Semi finished'],
  fully_finished: ['تشطيب كامل', 'Fully finished'],
};

export function buildPropertySpecs(property: Partial<Property>, locale: string): PropertySpec[] {
  const ar = locale === 'ar';
  const cards: PropertySpec[] = [];
  const type = (property.type ?? property.propertyType ?? '').toLowerCase();
  const number = (id: SpecId, value: number | undefined, labelAr: string, labelEn: string, unitAr = '', unitEn = '') => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      cards.push({ id, label: ar ? labelAr : labelEn, value: `${value}${(ar ? unitAr : unitEn) ? ` ${ar ? unitAr : unitEn}` : ''}` });
    }
  };
  if (type === 'building') {
    // Floors and units come from the recorded units when the property has no explicit count.
    const units = property.building_units ?? [];
    const unitFloors = units.map(u => Number(u.floor)).filter(Number.isFinite);
    const floors = property.floors || (unitFloors.length ? Math.max(...unitFloors) + 1 : undefined);
    number('floors', floors, 'عدد الأدوار', 'Floors', 'أدوار', 'floors');
    number('units', units.length || property.total_units_count, 'عدد الوحدات', 'Units', 'وحدات', 'units');
  } else if (['apartment', 'villa', 'duplex', 'chalet', 'townhouse', 'penthouse'].includes(type)) {
    number('bedrooms', property.beds, 'غرف النوم', 'Bedrooms', 'غرف', 'rooms');
    number('bathrooms', property.baths, 'الحمامات', 'Bathrooms', 'حمام', 'bathrooms');
  }
  number('area', property.sqm, type === 'building' ? 'مساحة المباني' : 'المساحة', type === 'building' ? 'Built-up area' : 'Area', 'م²', 'sqm');
  number('year', property.builtYear, 'سنة الإنجاز', 'Completion year');
  const statusLabel = property.completion_status ? completion[property.completion_status] : undefined;
  if (statusLabel) cards.push({ id: 'status', label: ar ? 'حالة الإنشاء' : 'Construction', value: statusLabel[ar ? 0 : 1] });
  const finishLabel = property.finishing ? finishing[property.finishing] : undefined;
  if (finishLabel) cards.push({ id: 'finishing', label: ar ? 'التشطيب' : 'Finishing', value: finishLabel[ar ? 0 : 1] });
  const typeLabel = types[type as keyof typeof types];
  if (typeLabel) cards.push({ id: 'type', label: ar ? 'نوع العقار' : 'Property type', value: typeLabel[ar ? 0 : 1] });
  return cards;
}

export function getSpecGridColumns(count: number): 1 | 2 | 3 {
  return count <= 1 ? 1 : count === 2 || count === 4 ? 2 : 3;
}
