'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import styles from './ContactForm.module.css';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ContactFormProps {
  propertyId?: string;
  propertyTitle?: string;
  locale?: string;
  compact?: boolean;
}

export default function ContactForm({ propertyId, propertyTitle, locale = 'en', compact = false }: ContactFormProps) {
  const t = useTranslations('contact');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, property_id: propertyId ?? null }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('success'));
      reset();
    } catch {
      toast.error(t('error'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`${styles.form} ${compact ? styles.compact : ''}`}>
      {propertyTitle && !compact && (
        <p className={styles.propertyRef}>
          {t('property_ref')}: <strong>{propertyTitle}</strong>
        </p>
      )}

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="cf-name">{t('name')}</label>
        <input
          id="cf-name"
          placeholder={locale === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
          className={`input ${errors.name ? styles.inputError : ''}`}
          {...register('name')}
        />
        {errors.name && <p className={styles.error}>{errors.name.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="cf-phone">{t('phone')}</label>
        <input
          id="cf-phone"
          type="tel"
          placeholder={locale === 'ar' ? 'رقم الهاتف / الواتساب' : 'Phone Number'}
          className={`input ${errors.phone ? styles.inputError : ''}`}
          {...register('phone')}
        />
        {errors.phone && <p className={styles.error}>{errors.phone.message}</p>}
      </div>

      {!compact && (
        <>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="cf-email">{t('email')}</label>
            <input
              id="cf-email"
              type="email"
              placeholder="example@domain.com"
              className={`input ${errors.email ? styles.inputError : ''}`}
              {...register('email')}
            />
            {errors.email && <p className={styles.error}>{errors.email.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="cf-message">{t('message')}</label>
            <textarea
              id="cf-message"
              placeholder={locale === 'ar' ? 'تفاصيل الاستفسار...' : 'Inquiry details...'}
              className="input"
              {...register('message')}
              rows={3}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', height: '46px', marginTop: '6px', borderRadius: '12px' }}
      >
        {isSubmitting ? (
          <Loader2 size={16} className="spin" />
        ) : (
          <>
            <Send size={15} strokeWidth={2} />
            <span>{locale === 'ar' ? 'حجز موعد معاينة' : 'Schedule Viewing'}</span>
          </>
        )}
      </button>
    </form>
  );
}
