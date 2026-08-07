import { getTranslations } from 'next-intl/server';
import ContactForm from '@/components/forms/ContactForm';
import { MessageCircle, Phone, MapPin, Sparkles, Clock } from 'lucide-react';
import { WHATSAPP_NUMBER, whatsappUrl } from '@/lib/utils/formatting';
import type { Metadata } from 'next';
import styles from './contact.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return {
    title: `${t('title')} — Zakaria Farid Real Estate`,
    description: 'Contact Zakaria Farid directly for private viewings and luxury property inquiries in Egypt.',
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  const isAr = locale === 'ar';

  return (
    <div className={styles.root}>
      {/* Hero Header */}
      <section className={styles.heroSection}>
        <div className="container">
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            <span>{isAr ? 'تواصل مع المالك مباشرة' : 'Direct Owner Consultation'}</span>
          </div>
          <h1 className={styles.heroTitle}>{t('title')}</h1>
          <p className={styles.heroSub}>
            {isAr
              ? 'تواصل مباشرة مع زكريا فريد للحصول على استشارة عقارية خاصة وحجز معاينات فورية بدون أي عمولات وساطة.'
              : 'Connect directly with Zakaria Farid for private property consultations and immediate viewing reservations.'}
          </p>
        </div>
      </section>

      {/* Body Content */}
      <section className={styles.contactSection}>
        <div className="container">
          <div className={styles.contactGrid}>
            {/* Info Column */}
            <div className={styles.infoCol}>
              <div>
                <h2 className={styles.infoHeading}>{isAr ? 'يسعدنا تواصلك' : 'Let\'s Discuss Your Property'}</h2>
                <p className={styles.infoSub}>
                  {isAr
                    ? 'تواصل معنا مباشرة عبر الهاتف أو الواتساب أو من خلال تقديم طلبك أدناه وسيتم الرد عليك في غضون دقائق.'
                    : 'Reach out directly via phone, WhatsApp, or by submitting your inquiry below. We respond promptly.'}
                </p>
              </div>

              <div className={styles.cardsStack}>
                <a href={`tel:+${WHATSAPP_NUMBER}`} className={styles.contactCard}>
                  <div className={styles.iconBoxPhone}>
                    <Phone size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className={styles.cardMetaLabel}>{isAr ? 'الهاتف المباشر' : 'Direct Phone'}</p>
                    <p className={styles.cardMetaVal}>+{WHATSAPP_NUMBER}</p>
                  </div>
                </a>

                <a href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحباً، أود الاستفسار عن عقاراتكم' : 'Hello, I would like to inquire about your properties')} target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.iconBoxWa}>
                    <MessageCircle size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className={styles.cardMetaLabel}>{isAr ? 'الواتساب المباشر' : 'WhatsApp Concierge'}</p>
                    <p className={styles.cardMetaVal}>{isAr ? 'مراسلة فورية عبر الواتساب' : 'Instant Chat on WhatsApp'}</p>
                  </div>
                </a>

                <div className={styles.contactCard}>
                  <div className={styles.iconBoxLoc}>
                    <MapPin size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className={styles.cardMetaLabel}>{isAr ? 'المناطق المغطاة' : 'Operating Hubs'}</p>
                    <p className={styles.cardMetaVal}>{isAr ? 'الشيخ زايد، التجمع الخامس، الساحل الشمالي' : 'Sheikh Zayed, New Cairo, North Coast'}</p>
                  </div>
                </div>
              </div>

              <div className={styles.responseGuaranty}>
                <Clock size={16} />
                <span>{isAr ? 'متوسط زمن الاستجابة: أقل من ١٥ دقيقة' : 'Average Response Time: Under 15 Minutes'}</span>
              </div>
            </div>

            {/* Form Column */}
            <div className={styles.formCard}>
              <ContactForm locale={locale} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
