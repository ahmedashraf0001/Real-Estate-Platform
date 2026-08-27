'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle, 
  Navigation, 
  Compass, 
  Clock, 
  MessageCircle, 
  PhoneCall, 
  ArrowUpRight,
  Send,
  Loader2,
  Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { createCachedTileLayer } from '@/lib/mapCache';
import { usePlatformSettings } from '@/lib/hooks/usePlatformSettings';

export const ContactView: React.FC<{ locale?: string }> = ({ locale = 'en' }) => {
  const isAr = locale === 'ar';
  const { contact } = usePlatformSettings();

  // Form State aligned with CRM Pipeline Schema
  const [intent, setIntent] = useState<'acquire' | 'sell' | 'advisory'>('acquire');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [district, setDistrict] = useState<string>('New Cairo');
  const [budget, setBudget] = useState<string>('500,000 - 5,000,000 EGP');
  const [contactPref, setContactPref] = useState<'whatsapp' | 'phone' | 'hq'>('whatsapp');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [subscribeToPromos, setSubscribeToPromos] = useState<boolean>(false);
  const [faridWhatsAppUrl, setFaridWhatsAppUrl] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const intentOptions = [
    { id: 'acquire', en: 'Private Acquisition', ar: 'طلب شراء / استحواذ' },
    { id: 'sell', en: 'Exclusive Estate Listing', ar: 'عرض عقار للبيع' },
    { id: 'advisory', en: 'Architectural Advisory', ar: 'استشارات معمارية وتطوير' },
  ];

  const districtOptions = [
    { id: 'New Cairo', en: 'New Cairo & Katameya', ar: 'القاهرة الجديدة والقطامية' },
    { id: 'North Coast', en: 'North Coast (Sahel)', ar: 'الساحل الشمالي' },
    { id: 'El Gouna', en: 'El Gouna & Red Sea', ar: 'الجونة والبحر الأحمر' },
    { id: 'Sheikh Zayed', en: 'Sheikh Zayed & October', ar: 'الشيخ زايد وأكتوبر' },
    { id: 'General', en: 'Egypt-Wide / Flexible', ar: 'مصر ككل / مرن' },
  ];

  const budgetOptions = [
    '500,000 - 5,000,000 EGP',
    '5,000,000 - 15,000,000 EGP',
    '15,000,000 - 30,000,000 EGP',
    '30,000,000 - 60,000,000 EGP',
    '60,000,000 - 120,000,000 EGP',
    '120,000,000+ EGP (Trophy Sovereign Asset)',
  ];

  const channelOptions = [
    { id: 'whatsapp', en: 'WhatsApp Dossier', ar: 'واتساب فوري' },
    { id: 'phone', en: 'Discreet Phone Call', ar: 'اتصال هاتفي خاص' },
    { id: 'hq', en: 'Flagship HQ Meeting', ar: 'جلسة بالمقر الرئيسي' },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    if ((window as any).__masrLenis) {
      (window as any).__masrLenis.scrollTo(0, { immediate: true });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.023, 31.438],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: false
    });

    createCachedTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    const pinHtml = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(10, 14, 22, 0.92);
        border: 2px solid #DDA752;
        box-shadow: 0 0 20px rgba(221, 167, 82, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #E5B869;"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: pinHtml,
      className: 'grand-hq-map-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([30.023, 31.438], { icon: customIcon }).addTo(map);
    marker.bindTooltip(
      `<div style="font-family: var(--font-heading); font-size: 11px; font-weight: 800; color: #E5B869; background: #0A0C10; padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(229, 184, 105, 0.5); box-shadow: 0 8px 24px rgba(0,0,0,0.6);">AL ZAKARIA Flagship HQ · Financial District</div>`,
      { direction: 'top', offset: [0, -14], permanent: true, className: 'luxury-leaflet-tooltip' }
    );

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error(isAr ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please provide your name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const intentLabel = intent === 'sell' 
        ? 'Exclusive Listing Request' 
        : intent === 'advisory' 
        ? 'Architectural Advisory' 
        : 'Private Acquisition';

      const formattedNotes = [
        `Intent: ${intentLabel}`,
        `Region: ${district}`,
        `Budget: ${budget}`,
        `Channel: ${contactPref}`,
        message ? `Notes: ${message.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          message: message.trim() || `${intentLabel} consultation for ${district}`,
          budget,
          preferred_channel: contactPref === 'whatsapp' ? 'WhatsApp' : contactPref === 'phone' ? 'Direct Phone Call' : 'In-Person HQ Meeting',
          notes: formattedNotes + (subscribeToPromos ? ' | Opted-in: Email Promotions' : ''),
          source: `Executive Concierge Page (${intentLabel})`,
        }),
      });

      // Fire subscription request in parallel if opted in
      if (subscribeToPromos && email.trim().includes('@')) {
        fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            name: fullName.trim(),
            source: `Promotion Opt-in (Contact Page - ${intentLabel})`,
            locale,
          }),
        }).catch(() => {/* non-fatal */});
      }

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.farid_whatsapp_url) {
          setFaridWhatsAppUrl(data.farid_whatsapp_url);
        }
        setIsSubmitted(true);
        toast.success(isAr ? 'تم استلام رسالتكم وإخطار آل زكريا' : 'Inquiry dispatched to AL ZAKARIA directly');
      } else {
        toast.error(data.error || (isAr ? 'تعذر إرسال الطلب' : 'Failed to send message'));
      }
    } catch {
      toast.error(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="container">
        
        {/* 1. Header Section */}
        <section className="contact-header-section">
          <div className="contact-header-content">
            <motion.div
              className="hero-concierge-badge"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Compass size={13} className="badge-icon" />
              <span>{isAr ? 'مكتب خدمة كبار العملاء' : 'PRIVATE CLIENT DESK'}</span>
            </motion.div>

            <motion.h1 
              className="contact-main-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="header-scan-glow">
                {isAr ? 'الاستشارات الخاصة والوساطة الاستراتيجية' : 'Executive Concierge & Inquiries'}
              </span>
            </motion.h1>

            <motion.p 
              className="contact-hero-subtitle"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
            >
              {isAr 
                ? 'تواصل مباشرة مع مكتب الاستشارات الخاصة لإجراء الدراسات المعمارية، وطلبات الاستحواذ الفاخرة، والترتيب لجولات المعاينة الحصرية لكبرى العقارات السيادية في مصر.'
                : 'Connect directly with our private client advisory team for sovereign portfolio consultations, discrete property acquisitions, and chauffeured estate walkthroughs across Egypt.'}
            </motion.p>
          </div>
        </section>

        {/* 2. Main 2-Column Section: Inquiry Form + Direct Concierge Sidebar */}
        <section className="contact-form-grid-section">
          <div className="contact-two-col-grid">
            
            {/* Left: Streamlined Luxury Advisory Form */}
            <div className="acquisition-form-card">
              <div className="form-card-header">
                <span className="form-eyebrow">{isAr ? 'استمارة التواصل المباشر' : 'DIRECT ADVISORY DOSSIER'}</span>
                <h2 className="form-card-title">{isAr ? 'طلب استشارة أو استحواذ رسمي' : 'Executive Client Inquiry'}</h2>
                <p className="form-card-sub">
                  {isAr 
                    ? 'حدد متطلباتك ومعلومات التواصل الخاصة بك، وسيقوم فريق الاستشارات بالتواصل معكم خلال ساعتي عمل.'
                    : 'Provide your credentials and requirements below. Our private client team will prepare a discreet dossier within 2 business hours.'}
                </p>
              </div>

              {!isSubmitted ? (
                <form className="acquisition-form" onSubmit={handleSubmit}>
                  
                  {/* 1. Intent Selector */}
                  <div className="form-field-group">
                    <label className="form-field-label">{isAr ? 'نوع الاستشارة أو الطلب' : 'INQUIRY PURPOSE / INTENT'}</label>
                    <div className="intent-chips-grid">
                      {intentOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`selector-chip ${intent === opt.id ? 'active' : ''}`}
                          onClick={() => setIntent(opt.id as any)}
                        >
                          {isAr ? opt.ar : opt.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Client Credentials */}
                  <div className="form-inputs-grid">
                    <div className="form-field-group">
                      <label className="form-field-label">{isAr ? 'الاسم واللقب' : 'FULL NAME / TITLE'}</label>
                      <input 
                        type="text" 
                        required 
                        placeholder={isAr ? 'مثال: د. هشام الجمال' : 'e.g. Dr. Hisham El-Gammal'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="form-dark-input"
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="form-field-label">{isAr ? 'رقم الهاتف / الواتساب' : 'PHONE / WHATSAPP'}</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="+20 100 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="form-dark-input"
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">{isAr ? 'البريد الإلكتروني (اختياري لاستلام الملف الفني)' : 'EMAIL ADDRESS (FOR DOSSIER DELIVERY)'}</label>
                    <input 
                      type="email" 
                      placeholder="client@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-dark-input"
                    />
                  </div>

                  {/* 3. Target District & Capital Allocation */}
                  <div className="form-inputs-grid">
                    <div className="form-field-group">
                      <label className="form-field-label">{isAr ? 'المنطقة المستهدفة' : 'TARGET REGION'}</label>
                      <select 
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="form-dark-select"
                      >
                        {districtOptions.map((d) => (
                          <option key={d.id} value={d.id}>{isAr ? d.ar : d.en}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label className="form-field-label">{isAr ? 'الميزانية التقريبية' : 'CAPITAL ALLOCATION'}</label>
                      <select 
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="form-dark-select"
                      >
                        {budgetOptions.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 4. Preferred Communication Protocol */}
                  <div className="form-field-group">
                    <label className="form-field-label">{isAr ? 'بروتوكول التواصل المفضل' : 'PREFERRED COMMUNICATION PROTOCOL'}</label>
                    <div className="chips-row">
                      {channelOptions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`selector-chip ${contactPref === c.id ? 'active' : ''}`}
                          onClick={() => setContactPref(c.id as any)}
                        >
                          {isAr ? c.ar : c.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message / Notes */}
                  <div className="form-field-group">
                    <label className="form-field-label">{isAr ? 'المتطلبات الخاصة أو تفاصيل الطلب (اختياري)' : 'CONFIDENTIAL SPECIFICATIONS (OPTIONAL)'}</label>
                    <textarea 
                      rows={3}
                      placeholder={isAr ? 'مثال: مطلوب قصر مستقل بمساحة تتجاوز 1000م² مع حمام سباحة وإطلالة بانورامية...' : 'Describe specific architectural nuances, compound preferences, or inspection schedule...'}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="form-dark-textarea"
                    />
                  </div>

                  {/* Promotions Opt-in — show only when email is filled */}
                  {email.trim().includes('@') && (
                    <label className="contact-promo-optin">
                      <input
                        type="checkbox"
                        className="promo-optin-checkbox"
                        checked={subscribeToPromos}
                        onChange={(e) => setSubscribeToPromos(e.target.checked)}
                      />
                      <Bell size={13} className="contact-promo-bell" />
                      <span>
                        {isAr
                          ? 'أرغب في استلام تنبيهات البريد الإلكتروني عن العروض والعقارات الجديدة'
                          : 'Send me property alerts and exclusive promotions via email'}
                      </span>
                    </label>
                  )}

                  {/* Submit Button */}
                  <button type="submit" disabled={isSubmitting} className="submit-inquiry-btn btn-gold">
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>{isAr ? 'جاري إرسال الطلب...' : 'Transmitting dossier…'}</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>{isAr ? 'إرسال الطلب السري للمكتب' : 'Submit Confidential Dossier'}</span>
                        <ArrowUpRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="form-success-box">
                  <CheckCircle size={48} className="success-icon" />
                  <h3 className="success-title">{isAr ? 'تم استلام طلبكم بنجاح' : 'Inquiry Received'}</h3>
                  <p className="success-msg">
                    {isAr ? (
                      <>شكراً لك، <strong>{fullName}</strong>. تم استلام رسالتك وإشعار مكتب آل زكريا مباشرة. سنتواصل معك عبر <strong>{phone}</strong> في أقرب وقت.</>
                    ) : (
                      <>Thank you, <strong>{fullName}</strong>. Your message has been received and notified directly to AL ZAKARIA. We will reach out to you via <strong>{phone}</strong> shortly.</>
                    )}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '16px' }}>
                    {faridWhatsAppUrl && (
                      <a
                        href={faridWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="direct-whatsapp-action-link"
                      >
                        <MessageCircle size={17} />
                        <span>{isAr ? 'فتح المحادثة المباشرة على واتساب آل زكريا' : 'Open WhatsApp Chat with AL ZAKARIA'}</span>
                      </a>
                    )}

                    <button 
                      className="btn-dark reset-form-btn"
                      onClick={() => {
                        setIsSubmitted(false);
                        setMessage('');
                        setFaridWhatsAppUrl(null);
                      }}
                      type="button"
                    >
                      {isAr ? 'إرسال طلب آخر' : 'Submit Another Inquiry'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Direct Desk & WhatsApp Fast-Connect */}
            <div className="contact-sidebar-col">
              
              {/* Direct Concierge WhatsApp Card */}
              <div className="direct-agent-card">
                <div className="agent-card-top">
                  <span className="agent-badge">{isAr ? 'مستشار فوري' : 'LIVE CONCIERGE'}</span>
                </div>
                <h3 className="agent-card-title">{isAr ? 'مكتب خدمة العملاء عبر واتساب' : 'WhatsApp Client Desk'}</h3>
                <p className="agent-card-desc">
                  {isAr 
                    ? 'تواصل مباشرة مع المهندس زكريا فريد للحصول على الاستشارات الفورية، أو طلب الكتالوجات، أو حجز مواعيد المعاينات.'
                    : 'Connect immediately with our senior advisory team for real-time inquiries, catalog requests, or viewing schedules.'}
                </p>
                <a 
                  href={`https://wa.me/${(contact?.whatsapp || '+201009998888').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    isAr ? 'مرحباً، أود الاستفسار عن عقارات واستشارات آل زكريا.' : 'Hello, I am inquiring about AL ZAKARIA estates.'
                  )}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="chat-agent-link btn-gold"
                >
                  <MessageCircle size={16} />
                  <span>{isAr ? 'محادثة مباشرة عبر واتساب' : 'Chat on WhatsApp'}</span>
                </a>
              </div>

              {/* Direct Telephone Hotline */}
              <div className="direct-hotline-card">
                <h4 className="hotline-title">{isAr ? 'الخط الساخن المباشر' : 'Direct Client Hotline'}</h4>
                <a href={`tel:${(contact?.phone || '+20 2 19688').replace(/\s+/g, '')}`} className="hotline-num">
                  <PhoneCall size={18} className="hotline-icon" />
                  <span>{contact?.phone || '+20 2 19688'}</span>
                </a>
                <span className="hotline-sub">
                  {isAr ? 'متاح من الأحد إلى الخميس · ٩:٠٠ ص – ٦:٠٠ م' : 'Available Sun – Thu · 9:00 AM – 6:00 PM (EET)'}
                </span>
              </div>

              {/* Direct Email Card */}
              <div className="direct-hotline-card">
                <h4 className="hotline-title">{isAr ? 'الاستفسارات المؤسسية' : 'Corporate Inquiries'}</h4>
                <a href={`mailto:${contact?.email || 'concierge@zakariafarid.com'}`} className="hotline-num email-hotline">
                  <Mail size={18} className="hotline-icon" />
                  <span>{contact?.email || 'concierge@zakariafarid.com'}</span>
                </a>
                <span className="hotline-sub">
                  {isAr ? 'المكتب الرسمي للمراسلات الاستشارية' : 'Official advisory correspondence desk'}
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* 3. AL ZAKARIA Grand HQ Panoramic Satellite Map Stage */}
        <section className="grand-hq-map-section">
          <div className="grand-hq-banner">
            <div ref={mapContainerRef} className="grand-hq-leaflet-canvas" />
            <div className="grand-hq-vignette" />

            <div className="grand-hq-floating-card">
              <span className="hq-eyebrow-pill">{isAr ? 'المقر الرئيسي' : 'FLAGSHIP HEADQUARTERS'}</span>
              <h3 className="floating-hq-title">{isAr ? 'مقر آل زكريا الرئيسي' : 'AL ZAKARIA Grand HQ'}</h3>
              <p className="floating-hq-address">
                {isAr ? (contact?.addressAr || 'برج جراند G-08، الحي المالي، محور التسعين الجنوبي، القاهرة الجديدة، مصر') : (contact?.addressEn || 'G-08 Grand Tower, Financial District, South 90th Axis, New Cairo, Egypt')}
              </p>
              <div className="floating-hq-hours">
                <Clock size={13} className="hq-clock" />
                <span>{isAr ? 'مواعيد العمل: الأحد – الخميس · ٩:٠٠ ص – ٦:٠٠ م' : 'Open: Sun – Thu · 9:00 AM – 6:00 PM (EET)'}</span>
              </div>
              <a 
                href="https://maps.google.com/?q=New+Cairo+Financial+District" 
                target="_blank" 
                rel="noopener noreferrer"
                className="directions-btn"
              >
                <Navigation size={15} />
                <span>{isAr ? 'الاتجاهات وخرائط القيادة' : 'Get Driving Directions'}</span>
              </a>
            </div>
          </div>
        </section>

      </div>

      <style>{`
        .contact-page {
          background: var(--bg-primary);
          min-height: 100vh;
          padding-top: 155px;
          padding-bottom: 6rem;
          transition: background var(--transition-smooth);
        }

        /* 1. Header */
        .contact-header-section {
          margin-bottom: 2.5rem;
        }

        .contact-header-content {
          max-width: 820px;
        }

        .hero-concierge-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-radius: 9999px;
          padding: 0.45rem 1.25rem;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          margin-bottom: 1.25rem;
        }

        [data-theme="dark"] .hero-concierge-badge {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4);
        }

        [data-theme="light"] .hero-concierge-badge {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 4px 16px rgba(30, 24, 16, 0.06), inset 0 1.5px 1.5px #FFFFFF;
        }

        .badge-icon {
          color: var(--gold-primary);
        }

        .contact-main-title {
          font-family: var(--font-heading);
          font-size: clamp(2.35rem, 4vw, 3.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 1.25rem;
        }

        .contact-hero-subtitle {
          font-size: 1rem;
          line-height: 1.7;
          max-width: 740px;
        }

        [data-theme="dark"] .contact-hero-subtitle {
          color: #C7D2DF;
        }

        [data-theme="light"] .contact-hero-subtitle {
          color: #475569;
        }

        /* 2. Form & Sidebar Grid */
        .contact-form-grid-section {
          margin-bottom: 5rem;
        }

        .contact-two-col-grid {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr;
          gap: 3rem;
          align-items: start;
        }

        /* Left Form Card */
        .acquisition-form-card {
          backdrop-filter: blur(32px) saturate(210%);
          -webkit-backdrop-filter: blur(32px) saturate(210%);
          border-radius: 28px;
          padding: 3rem 2.75rem;
        }

        [data-theme="dark"] .acquisition-form-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.5);
        }

        [data-theme="light"] .acquisition-form-card {
          background: rgba(255, 255, 255, 0.60);
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 16px 45px rgba(30, 24, 16, 0.07), 0 2px 8px rgba(0, 0, 0, 0.02), inset 0 1.5px 1.5px #FFFFFF;
        }

        .form-card-header {
          margin-bottom: 2rem;
        }

        .form-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.35rem;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .form-eyebrow {
          color: #E8C87A;
        }

        [data-theme="light"] .form-eyebrow {
          color: #B8860B;
        }

        .form-card-title {
          font-family: var(--font-heading);
          font-size: 1.85rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem 0;
        }

        [data-theme="dark"] .form-card-title {
          color: #ffffff;
        }

        [data-theme="light"] .form-card-title {
          color: #0D1117;
        }

        .form-card-sub {
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0;
        }

        [data-theme="dark"] .form-card-sub {
          color: #C7D2DF;
        }

        [data-theme="light"] .form-card-sub {
          color: #334155;
          font-weight: 500;
        }

        .acquisition-form {
          display: flex;
          flex-direction: column;
          gap: 1.65rem;
        }

        .form-chip-group {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .form-field-label {
          font-family: var(--font-heading);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .form-field-label {
          color: #E8C87A;
        }

        [data-theme="light"] .form-field-label {
          color: #B8860B;
        }

        .chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .selector-chip {
          border-radius: 9999px;
          padding: 0.55rem 1.25rem;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .selector-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #C7D2DF;
          font-weight: 600;
        }

        [data-theme="dark"] .selector-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(221, 167, 82, 0.5);
          color: #ffffff;
        }

        [data-theme="dark"] .selector-chip.active {
          background: rgba(221, 167, 82, 0.20);
          border-color: #DDA752;
          color: #E8C87A;
          font-weight: 700;
          box-shadow: 0 0 14px rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .selector-chip {
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(0, 0, 0, 0.14);
          color: #1E293B;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        [data-theme="light"] .selector-chip:hover {
          background: #FFFFFF;
          border-color: #B8860B;
          color: #0D1117;
        }

        .intent-chips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        [data-theme="light"] .selector-chip.active {
          background: rgba(212, 160, 52, 0.16);
          border: 1.5px solid #B8860B;
          color: #8A6114;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(212, 160, 52, 0.18);
        }

        .form-inputs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .form-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-dark-input, .form-dark-select, .form-dark-textarea {
          width: 100%;
          border-radius: 12px;
          padding: 0.85rem 1.15rem;
          font-size: 0.9375rem;
          outline: none;
          transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
        }

        .form-dark-select {
          appearance: none;
          cursor: pointer;
        }

        [data-theme="dark"] .form-dark-input, 
        [data-theme="dark"] .form-dark-select,
        [data-theme="dark"] .form-dark-textarea {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        [data-theme="dark"] .form-dark-select option {
          background: #0A0D14;
          color: #FFFFFF;
        }

        [data-theme="dark"] .form-dark-input::placeholder, 
        [data-theme="dark"] .form-dark-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        [data-theme="dark"] .form-dark-input:focus, 
        [data-theme="dark"] .form-dark-select:focus,
        [data-theme="dark"] .form-dark-textarea:focus {
          border-color: #DDA752;
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 14px rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .form-dark-input, 
        [data-theme="light"] .form-dark-select,
        [data-theme="light"] .form-dark-textarea {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.16);
          color: #0D1117;
          font-weight: 500;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        [data-theme="light"] .form-dark-select option {
          background: #FFFFFF;
          color: #0D1117;
        }

        [data-theme="light"] .form-dark-input::placeholder, 
        [data-theme="light"] .form-dark-textarea::placeholder {
          color: #64748B;
        }

        [data-theme="light"] .form-dark-input:focus, 
        [data-theme="light"] .form-dark-select:focus,
        [data-theme="light"] .form-dark-textarea:focus {
          border-color: #A87E2C;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(197, 154, 69, 0.20);
        }

        .form-dark-textarea {
          resize: vertical;
        }

        .direct-whatsapp-action-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: #FFFFFF;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
          transition: all 0.2s ease;
        }

        .direct-whatsapp-action-link:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.45);
        }

        .submit-inquiry-btn {
          margin-top: 0.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.95rem 2.25rem;
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: 9999px;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 18px rgba(197, 154, 69, 0.25), inset 0 1px 1.5px rgba(255, 255, 255, 0.7);
          transition: all var(--transition-smooth);
          cursor: pointer;
        }

        .submit-inquiry-btn:hover {
          background: linear-gradient(135deg, #FFF0C8 0%, #E5BE7A 45%, #D4AF37 100%);
          box-shadow: 0 6px 24px rgba(197, 154, 69, 0.38), inset 0 1px 1.5px #FFFFFF;
          transform: translateY(-2px);
        }

        /* Success Box */
        .form-success-box {
          text-align: center;
          padding: 3rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .success-icon {
          color: var(--gold-primary);
        }

        .success-title {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0;
        }

        [data-theme="dark"] .success-title {
          color: #ffffff;
        }

        [data-theme="light"] .success-title {
          color: #0D1117;
        }

        .success-msg {
          font-size: 0.9375rem;
          line-height: 1.7;
          max-width: 480px;
        }

        [data-theme="dark"] .success-msg {
          color: #C7D2DF;
        }

        [data-theme="light"] .success-msg {
          color: #334155;
          font-weight: 500;
        }

        .reset-form-btn {
          margin-top: 1rem;
          padding: 0.75rem 1.75rem;
          font-size: 0.875rem;
          border-radius: 9999px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .reset-form-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        [data-theme="light"] .reset-form-btn {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #0D1117;
        }

        .reset-form-btn:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        /* Right Sidebar Column */
        .contact-sidebar-col {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: sticky;
          top: 110px;
        }

        .direct-agent-card {
          backdrop-filter: blur(32px) saturate(210%);
          -webkit-backdrop-filter: blur(32px) saturate(210%);
          border-radius: 24px;
          padding: 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        [data-theme="dark"] .direct-agent-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(221, 167, 82, 0.4);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="light"] .direct-agent-card {
          background: rgba(255, 255, 255, 0.62);
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 16px 45px rgba(30, 24, 16, 0.07), 0 2px 6px rgba(0, 0, 0, 0.02), inset 0 1.5px 1.5px #FFFFFF;
        }

        .agent-badge {
          align-self: flex-start;
          display: inline-block;
          font-family: var(--font-heading);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          border-radius: 8px;
          padding: 0.3rem 0.75rem;
        }

        [data-theme="dark"] .agent-badge {
          background: rgba(221, 167, 82, 0.15);
          border: 1px solid rgba(221, 167, 82, 0.45);
          color: #E8C87A;
        }

        [data-theme="light"] .agent-badge {
          background: rgba(255, 255, 255, 0.70);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(212, 160, 52, 0.40);
          box-shadow: 0 2px 8px rgba(212, 160, 52, 0.10), inset 0 1px 1px #FFFFFF;
          color: #B8860B;
        }

        .agent-card-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          margin: 0;
        }

        [data-theme="dark"] .agent-card-title {
          color: #ffffff;
        }

        [data-theme="light"] .agent-card-title {
          color: #0D1117;
        }

        .agent-card-desc {
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }

        [data-theme="dark"] .agent-card-desc {
          color: #C7D2DF;
        }

        [data-theme="light"] .agent-card-desc {
          color: #334155;
          font-weight: 500;
        }

        .chat-agent-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.85rem 1.6rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 18px rgba(197, 154, 69, 0.25), inset 0 1px 1.5px rgba(255, 255, 255, 0.7);
          transition: all var(--transition-smooth);
          text-decoration: none;
        }

        .chat-agent-link:hover {
          background: linear-gradient(135deg, #FFF0C8 0%, #E5BE7A 45%, #D4AF37 100%);
          box-shadow: 0 6px 24px rgba(197, 154, 69, 0.38), inset 0 1px 1.5px #FFFFFF;
          transform: translateY(-2px);
        }

        .direct-hotline-card {
          border-radius: 20px;
          padding: 1.75rem 1.85rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        [data-theme="dark"] .direct-hotline-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        [data-theme="light"] .direct-hotline-card {
          background: rgba(255, 255, 255, 0.62);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 12px 32px rgba(30, 24, 16, 0.05), inset 0 1.5px 1.5px #FFFFFF;
        }

        .hotline-title {
          font-family: var(--font-heading);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin: 0;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .hotline-title {
          color: #E8C87A;
        }

        [data-theme="light"] .hotline-title {
          color: #B8860B;
        }

        .hotline-num {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--gold-primary);
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .hotline-num.email-hotline {
          font-size: 1.05rem;
          word-break: break-all;
        }

        [data-theme="dark"] .hotline-num:hover {
          color: #ffffff;
        }

        [data-theme="light"] .hotline-num:hover {
          color: var(--gold-dark);
        }

        .hotline-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        .hotline-sub {
          font-size: 0.75rem;
          line-height: 1.4;
        }

        [data-theme="dark"] .hotline-sub {
          color: #94A3B8;
        }

        [data-theme="light"] .hotline-sub {
          color: #475569;
          font-weight: 600;
        }

        /* 3. Masr Grand HQ Panoramic Map Card */
        .grand-hq-banner {
          position: relative;
          width: 100%;
          height: 480px;
          border-radius: 28px;
          overflow: hidden;
          display: flex;
          align-items: center;
          padding: 0 3.5rem;
          background: #080A0E;
        }

        [data-theme="dark"] .grand-hq-banner {
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        }

        [data-theme="light"] .grand-hq-banner {
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.10), inset 0 1.5px 2px #FFFFFF;
        }

        .grand-hq-leaflet-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .grand-hq-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            ellipse at 50% 50%,
            transparent 50%,
            rgba(10, 14, 22, 0.3) 80%,
            rgba(10, 14, 22, 0.75) 100%
          );
          z-index: 2;
        }

        .grand-hq-floating-card {
          position: relative;
          z-index: 3;
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-radius: 24px;
          padding: 2.5rem 2.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-width: 440px;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .grand-hq-floating-card {
          background: rgba(10, 14, 22, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 25px rgba(221, 167, 82, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.45);
        }

        [data-theme="light"] .grand-hq-floating-card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.16), 
            0 4px 16px rgba(30, 24, 16, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(0, 0, 0, 0.03);
        }

        .hq-eyebrow-pill {
          align-self: flex-start;
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          padding: 0.35rem 0.85rem;
          border-radius: 8px;
        }

        [data-theme="dark"] .hq-eyebrow-pill {
          background: rgba(221, 167, 82, 0.15);
          border: 1px solid rgba(221, 167, 82, 0.4);
          color: #DDA752;
        }

        [data-theme="light"] .hq-eyebrow-pill {
          background: rgba(255, 255, 255, 0.70);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(197, 154, 69, 0.40);
          box-shadow: 0 2px 8px rgba(197, 154, 69, 0.10), inset 0 1px 1px #FFFFFF;
          color: var(--gold-primary);
        }

        .floating-hq-title {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          margin: 0;
        }

        [data-theme="dark"] .floating-hq-title {
          color: #ffffff;
        }

        [data-theme="light"] .floating-hq-title {
          color: #0D1117;
        }

        .floating-hq-address {
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
        }

        [data-theme="dark"] .floating-hq-address {
          color: #C7D2DF;
        }

        [data-theme="light"] .floating-hq-address {
          color: #475569;
        }

        .floating-hq-hours {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8125rem;
          color: var(--gold-primary);
          margin-bottom: 0.5rem;
        }

        .hq-clock {
          color: var(--gold-primary);
        }

        .directions-btn {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.85rem 1.85rem;
          font-size: 0.875rem;
          font-weight: 700;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 18px rgba(197, 154, 69, 0.25), inset 0 1px 1.5px rgba(255, 255, 255, 0.7);
          transition: all var(--transition-smooth);
          text-decoration: none;
        }

        .directions-btn:hover {
          background: linear-gradient(135deg, #FFF0C8 0%, #E5BE7A 45%, #D4AF37 100%);
          box-shadow: 0 6px 24px rgba(197, 154, 69, 0.38), inset 0 1px 1.5px #FFFFFF;
          transform: translateY(-2px);
        }

        /* Promotion opt-in checkbox — contact form */
        .contact-promo-optin {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          cursor: pointer;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px dashed rgba(221, 167, 82, 0.35);
          background: rgba(221, 167, 82, 0.05);
          transition: border-color 0.2s, background 0.2s;
          user-select: none;
          margin-top: 4px;
        }
        .contact-promo-optin:hover {
          border-color: rgba(221, 167, 82, 0.65);
          background: rgba(221, 167, 82, 0.09);
        }
        .contact-promo-optin .promo-optin-checkbox {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
          accent-color: #DDA752;
          margin-top: 1px;
          cursor: pointer;
        }
        .contact-promo-bell {
          flex-shrink: 0;
          margin-top: 1px;
          color: var(--gold-primary, #DDA752);
        }
        .contact-promo-optin span {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        /* Responsive */

        @media (max-width: 768px) {
          .contact-page {
            padding-top: 96px;
          }
        }

        @media (max-width: 1024px) {
          .contact-two-col-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .acquisition-form-card {
            order: 2;
          }
          .contact-sidebar-col {
            position: static;
            order: 1;
          }
          .grand-hq-banner {
            padding: 2rem 1.25rem;
            height: auto;
          }
          .grand-hq-floating-card {
            max-width: 100%;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          /* Compact side-by-side chips instead of stacked full-width buttons */
          .intent-chips-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .selector-chip {
            flex: 1 1 auto;
            padding: 0.5rem 0.8rem;
            font-size: 0.78rem;
            white-space: nowrap;
          }
          .form-inputs-grid {
            grid-template-columns: 1fr;
          }
          .acquisition-form-card {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};
