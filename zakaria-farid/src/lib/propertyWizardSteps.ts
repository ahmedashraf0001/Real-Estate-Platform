export const propertyWizardSteps = [
  { num: 1, title_en: 'Building & Partners', title_ar: 'بيانات المبنى والشركاء' },
  { num: 2, title_en: 'Location', title_ar: 'الموقع' },
  { num: 3, title_en: 'Description & media', title_ar: 'الوصف والوسائط' },
  { num: 4, title_en: 'Floor Plan & Finishes', title_ar: 'المخططات والتشطيب' },
  { num: 5, title_en: 'Review & Publish', title_ar: 'المراجعة والنشر' },
];

export function requiredFieldsForStep(step: number): Array<'title_en' | 'title_ar' | 'price_egp' | 'area_sqm' | 'location'> {
  if (step === 1) return ['title_en', 'title_ar', 'price_egp', 'area_sqm'];
  if (step === 2) return ['location'];
  return [];
}
