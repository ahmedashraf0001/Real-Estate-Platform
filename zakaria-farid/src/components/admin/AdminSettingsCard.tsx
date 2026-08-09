'use client';

import { useState } from 'react';
import { Palette, Check, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { updateAccentColor } from '@/app/actions/settings';
import styles from './AdminSettingsCard.module.css';

interface Props {
  initialColor: string;
  isAr?: boolean;
}

const COLOR_PRESETS = [
  { name: 'Emerald Gold (Default)', ar: 'ذهبي زمردي (افتراضي)', hex: '#C9A96A' },
  { name: 'Royal Bronze', ar: 'برونزي ملكي', hex: '#B8860B' },
  { name: 'Warm Amber', ar: 'عنبر دافئ', hex: '#D4AF37' },
  { name: 'Deep Forest Emerald', ar: 'زمردي غامق', hex: '#2D6A4F' },
  { name: 'Rose Gold', ar: 'روز جولد', hex: '#B76E79' },
];

export default function AdminSettingsCard({ initialColor = '#C9A96A', isAr = false }: Props) {
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAccentColor(selectedColor);
      if (res.success) {
        toast.success(isAr ? 'تم تحديث اللون المميز للموقع بنجاح!' : 'Site accent color updated successfully!');
      } else {
        toast.error(res.error || (isAr ? 'فشل حفظ التعديلات' : 'Failed to save color'));
      }
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء الحفظ' : 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.settingsCard} dir={isAr ? 'rtl' : 'ltr'}>
      <div className={styles.cardHeader}>
        <div className={styles.headerTitleWrap}>
          <Palette size={20} className={styles.goldIcon} />
          <div>
            <h3 className={styles.cardTitle}>{isAr ? 'تخصيص لون الهوية المميز (Accent Color)' : 'Customize Branding Accent Color'}</h3>
            <p className={styles.cardSub}>{isAr ? 'اختر لون الهوية المميز للأزرار والشارات ومؤشرات الموقع' : 'Select the primary accent color used across badges, buttons, and active states'}</p>
          </div>
        </div>
      </div>

      {/* Preset Swatches */}
      <div className={styles.presetsSection}>
        <span className={styles.sectionLabel}>{isAr ? 'الألوان المعتمدة مسبقاً:' : 'Pre-approved Luxury Palettes:'}</span>
        <div className={styles.presetGrid}>
          {COLOR_PRESETS.map((preset) => {
            const isSelected = selectedColor.toUpperCase() === preset.hex.toUpperCase();
            return (
              <button
                key={preset.hex}
                type="button"
                className={`${styles.presetBtn} ${isSelected ? styles.presetActive : ''}`}
                onClick={() => setSelectedColor(preset.hex)}
              >
                <span className={styles.colorDot} style={{ background: preset.hex }} />
                <span>{isAr ? preset.ar : preset.name}</span>
                {isSelected && <Check size={14} className={styles.checkIcon} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Picker & Input */}
      <div className={styles.customPickerRow}>
        <span className={styles.sectionLabel}>{isAr ? 'أو اختر لوناً مخصصاً (Hex):' : 'Or Custom Hex Code:'}</span>
        <div className={styles.pickerControls}>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className={styles.colorInputSquare}
          />
          <input
            type="text"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className={styles.colorTextInput}
            placeholder="#C9A96A"
          />
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => setSelectedColor('#C9A96A')}
            title={isAr ? 'إعادة اللون الافتراضي' : 'Reset to Default Gold'}
          >
            <RefreshCw size={14} />
            <span>{isAr ? 'الافتراضي' : 'Reset Gold'}</span>
          </button>
        </div>
      </div>

      {/* Live Component Preview Box */}
      <div className={styles.previewBox}>
        <span className={styles.previewLabel}>
          <Sparkles size={13} style={{ color: selectedColor }} />
          {isAr ? 'معاينة حية للمكونات بهذا اللون:' : 'Live Component Preview:'}
        </span>
        <div className={styles.previewComponentsGrid}>
          {/* Badge Preview */}
          <div className={styles.previewItem}>
            <span className={styles.previewPill} style={{ background: `${selectedColor}22`, color: selectedColor, borderColor: `${selectedColor}44` }}>
              تشطيب كامل ✨
            </span>
          </div>

          {/* Button Preview */}
          <div className={styles.previewItem}>
            <button className={styles.previewBtn} style={{ background: selectedColor, color: '#102A21' }}>
              معاينة العقارات ↗
            </button>
          </div>

          {/* Active Ring Preview */}
          <div className={styles.previewItem}>
            <div className={styles.previewRing} style={{ borderColor: selectedColor, boxShadow: `0 0 0 4px ${selectedColor}33` }}>
              <span style={{ color: selectedColor, fontWeight: 800 }}>ZF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Trigger */}
      <div className={styles.cardFooter}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={styles.saveBtn}
          style={{ background: selectedColor }}
        >
          {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تطبيق وحفظ لون الموقع' : 'Save & Apply Accent Color')}
        </button>
      </div>
    </div>
  );
}
