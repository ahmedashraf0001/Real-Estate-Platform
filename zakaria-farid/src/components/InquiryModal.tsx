'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Shield, Building2, Phone, Mail, User, Send, MessageCircle, Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  propertyName?: string;
  propertyId?: string;
  locale?: string;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  title = 'Private Acquisition',
  propertyName,
  propertyId,
  locale = 'en'
}) => {
  const isAr = locale === 'ar';
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'whatsapp' | 'phone' | 'meet'>('whatsapp');
  const [notes, setNotes] = useState('');
  const [subscribeToPromos, setSubscribeToPromos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [faridWhatsAppUrl, setFaridWhatsAppUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scrolling when modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Stop Lenis smooth scroll
    if ((window as any).__masrLenis) {
      (window as any).__masrLenis.stop();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      if ((window as any).__masrLenis) {
        (window as any).__masrLenis.start();
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const channelOptions = [
    { id: 'whatsapp', en: 'WhatsApp', ar: 'واتساب' },
    { id: 'phone', en: 'Phone Call', ar: 'اتصال هاتفي' },
    { id: 'meet', en: 'Meet in Person', ar: 'مقابلة شخصية' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error(isAr ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please provide your name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const channelLabel = preferredChannel === 'whatsapp' ? 'WhatsApp' : preferredChannel === 'phone' ? 'Phone Call' : 'Meet in Person';

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          message: notes.trim() || null,
          property_id: propertyId || null,
          property_title: propertyName || null,
          preferred_channel: channelLabel,
          notes: `Protocol: ${channelLabel}${subscribeToPromos ? ' | Opted-in: Email Promotions' : ''}`,
          source: propertyName ? `Property Acquisition: ${propertyName}` : 'Private Acquisition Request',
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
            source: propertyName ? `Promotion Opt-in (Property: ${propertyName})` : 'Promotion Opt-in (Inquiry Modal)',
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
        toast.success(isAr ? 'تم استلام طلبكم بنجاح وإخطار آل زكريا' : 'Acquisition request dispatched to AL ZAKARIA');
      } else {
        toast.error(data.error || (isAr ? 'تعذر إرسال الطلب، يرجى المحاولة لاحقاً' : 'Could not submit inquiry'));
      }
    } catch {
      toast.error(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setFullName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setSubscribeToPromos(false);
    setFaridWhatsAppUrl(null);
    onClose();
  };

  const modalNode = (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="inquiry-modal-card" onClick={(e) => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        <button className="inquiry-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="inquiry-header">
              <span className="inquiry-eyebrow">{isAr ? 'خدمة الاستحواذ والشراء الخاص' : 'CONFIDENTIAL CONCIERGE'}</span>
              <h2 className="inquiry-title">
                {isAr ? 'طلب استحواذ وشراء' : 'Private Acquisition'}
              </h2>
              {propertyName && (
                <div className="inquiry-property-pill">
                  <Building2 size={13} className="pill-icon" />
                  <span>{propertyName}</span>
                </div>
              )}
              <p className="inquiry-sub">
                {isAr 
                  ? 'يقوم كبار مستشاري الاستحواذ بإعداد ملف الصفقة الفني والتواصل معكم خلال ساعتي عمل.'
                  : 'Our Senior Private Client Advisors will prepare a discreet dossier and contact you within 2 business hours.'}
              </p>
            </div>

            <form className="inquiry-form" onSubmit={handleSubmit}>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">{isAr ? 'الاسم واللقب' : 'FULL NAME / TITLE'}</label>
                  <div className="input-wrap">
                    <User size={15} className="input-icon" />
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'مثال: د. هشام الجمال' : 'e.g. Dr. Hisham El-Gammal'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{isAr ? 'رقم الهاتف / الواتساب' : 'PHONE / WHATSAPP'}</label>
                  <div className="input-wrap">
                    <Phone size={15} className="input-icon" />
                    <input
                      type="tel"
                      required
                      placeholder="+20 100 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{isAr ? 'البريد الإلكتروني (اختياري لاستلام الملف الفني)' : 'EMAIL ADDRESS (FOR TECHNICAL DOSSIER)'}</label>
                <div className="input-wrap">
                  <Mail size={15} className="input-icon" />
                  <input
                    type="email"
                    placeholder="client@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{isAr ? 'بروتوكول التواصل المفضل' : 'COMMUNICATION PROTOCOL'}</label>
                <div className="channel-chips-grid">
                  {channelOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`channel-chip-btn ${preferredChannel === c.id ? 'active' : ''}`}
                      onClick={() => setPreferredChannel(c.id as any)}
                    >
                      {isAr ? c.ar : c.en}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{isAr ? 'متطلبات خاصة أو استفسارات محددة (اختياري)' : 'CONFIDENTIAL SPECIFICATIONS (OPTIONAL)'}</label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'مثال: رغبة في تحديد موعد معاينة خاصة، شروط الدفع، الاستلام...' : 'e.g. Specific viewing schedule, financing terms, delivery timeline...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {/* Promotions Opt-in */}
              {email.trim().includes('@') && (
                <label className="promo-optin-label">
                  <input
                    type="checkbox"
                    className="promo-optin-checkbox"
                    checked={subscribeToPromos}
                    onChange={(e) => setSubscribeToPromos(e.target.checked)}
                  />
                  <Bell size={13} className="promo-bell-icon" />
                  <span>
                    {isAr
                      ? 'أرغب في استلام تنبيهات البريد الإلكتروني عن العروض والعقارات الجديدة'
                      : 'Notify me of new properties and exclusive promotions via email'}
                  </span>
                </label>
              )}

              <div className="inquiry-security-note">
                <Shield size={13} className="security-icon" />
                <span>{isAr ? 'جميع المراسلات والبيانات محمية ببروتوكولات الخصوصية والسرية المصرفية.' : 'All client correspondence is strictly protected by non-disclosure protocols.'}</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-inquiry-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="btn-spinner" />
                    <span>{isAr ? 'جاري إرسال الطلب...' : 'Transmitting to Senior Advisory…'}</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>{isAr ? 'إرسال طلب الاستحواذ للمكتب' : 'Submit Private Acquisition'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="inquiry-success-view">
            <div className="success-icon-wrap">
              <CheckCircle size={44} className="success-icon" />
            </div>
            <h2 className="success-title">{isAr ? 'تم استلام طلبكم بنجاح' : 'Inquiry Received'}</h2>
            <p className="success-message">
              {isAr ? (
                <>شكراً لك، <strong>{fullName}</strong>. تم تحويل طلبك مباشرة إلى فريق الاستشارات الخاصة بمكتب آل زكريا.</>
              ) : (
                <>Thank you, <strong>{fullName}</strong>. Your private inquiry has been assigned directly to AL ZAKARIA.</>
              )}
            </p>
            <p className="success-contact-note">
              {isAr ? (
                <>سنقوم بالتواصل معكم عبر <strong>{phone}</strong> وإرسال الملف الفني للعقار.</>
              ) : (
                <>We will contact you discreetly at <strong>{phone}</strong> and send the private architectural dossier to <strong>{email || 'your contact'}</strong>.</>
              )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '16px' }}>
              {faridWhatsAppUrl && (
                <a
                  href={faridWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="direct-farid-btn"
                >
                  <MessageCircle size={17} />
                  <span>{isAr ? 'فتح المحادثة المباشرة على واتساب المهندس زكريا' : 'Open Direct WhatsApp with Farid Zakaria'}</span>
                </a>
              )}

              <button className="success-close-action-btn" onClick={handleReset}>
                {isAr ? 'إغلاق والعودة للتصفح' : 'Return to Catalog'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 99999999 !important;
          background: rgba(0, 0, 0, 0.82) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1.5rem !important;
          overflow-y: auto !important;
          box-sizing: border-box !important;
          animation: fadeIn 200ms ease-out;
        }

        .inquiry-modal-card {
          position: relative !important;
          margin: auto !important;
          max-height: min(90vh, 720px) !important;
          width: 100% !important;
          max-width: 520px !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          border-radius: 28px !important;
          padding: 2rem 2.25rem !important;
          box-sizing: border-box !important;
          backdrop-filter: blur(28px) saturate(210%) contrast(106%) !important;
          -webkit-backdrop-filter: blur(28px) saturate(210%) contrast(106%) !important;
          transition: background var(--transition-smooth) !important;
        }

        [data-theme="dark"] .inquiry-modal-card {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.16) 0%,
            rgba(22, 28, 42, 0.90) 35%,
            rgba(10, 14, 24, 0.96) 100%
          ) !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
          box-shadow: 
            0 32px 80px rgba(0, 0, 0, 0.85), 
            0 0 30px rgba(229, 184, 105, 0.15),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.6) !important;
        }

        [data-theme="light"] .inquiry-modal-card {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.94) 0%,
            rgba(255, 255, 255, 0.86) 40%,
            rgba(248, 246, 242, 0.94) 100%
          ) !important;
          border: 1px solid rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.18), inset 0 2px 2.5px #FFFFFF !important;
        }

        .inquiry-close-btn {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        [dir="rtl"] .inquiry-close-btn {
          right: auto;
          left: 1.25rem;
        }

        [data-theme="light"] .inquiry-close-btn {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.08);
          color: #0D1117;
        }

        .inquiry-close-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-primary);
          transform: scale(1.06);
        }

        .inquiry-header {
          margin-bottom: 1.5rem;
        }

        .inquiry-eyebrow {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          display: block;
          margin-bottom: 0.35rem;
        }

        .inquiry-title {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
          line-height: 1.2;
        }

        .inquiry-property-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(229, 184, 105, 0.14);
          border: 1px solid rgba(229, 184, 105, 0.4);
          padding: 0.28rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--gold-primary);
          margin-bottom: 0.5rem;
        }

        .pill-icon {
          color: var(--gold-primary);
        }

        .inquiry-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
        }

        .inquiry-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }

        .form-label {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
        }

        .channel-chips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .channel-chip-btn {
          padding: 0.55rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: center;
          white-space: nowrap;
        }

        [data-theme="light"] .channel-chip-btn {
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(0, 0, 0, 0.08);
          color: #64748B;
        }

        .channel-chip-btn.active {
          background: rgba(229, 184, 105, 0.18);
          border-color: var(--gold-primary);
          color: var(--gold-primary);
          box-shadow: 0 0 12px rgba(229, 184, 105, 0.2);
        }

        [data-theme="light"] .channel-chip-btn.active {
          background: rgba(229, 184, 105, 0.15);
          border-color: rgba(184, 134, 11, 0.6);
          color: #906B27;
          box-shadow: 0 2px 8px rgba(184, 134, 11, 0.12);
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.85rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        [dir="rtl"] .input-icon {
          left: auto;
          right: 0.85rem;
        }

        .form-input, .form-textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 0.65rem 0.85rem 0.65rem 2.4rem;
          color: var(--text-primary);
          font-size: 0.85rem;
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
        }

        [dir="rtl"] .form-input {
          padding: 0.65rem 2.4rem 0.65rem 0.85rem;
        }

        [data-theme="light"] .form-input,
        [data-theme="light"] .form-textarea {
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(0, 0, 0, 0.12);
          color: #0D1117;
        }

        .form-textarea {
          padding: 0.65rem 0.85rem;
          resize: none;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: var(--gold-primary);
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 0 3px rgba(229, 184, 105, 0.15);
        }

        [data-theme="light"] .form-input:focus,
        [data-theme="light"] .form-textarea:focus {
          background: #FFFFFF;
          border-color: var(--gold-primary);
          box-shadow: 0 0 0 3px rgba(229, 184, 105, 0.2);
        }

        .inquiry-security-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.68rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .security-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        .submit-inquiry-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 0.8rem 1.5rem;
          border-radius: 14px;
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          background: linear-gradient(135deg, #E5B869 0%, #DDA752 50%, #C8923C 100%);
          color: #0A0C10;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(221, 167, 82, 0.35);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .submit-inquiry-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 12px 30px rgba(221, 167, 82, 0.45);
        }

        .submit-inquiry-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .inquiry-success-view {
          text-align: center;
          padding: 1.5rem 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .success-icon-wrap {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: rgba(229, 184, 105, 0.14);
          border: 1.5px solid var(--gold-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-icon {
          color: var(--gold-primary);
        }

        .success-title {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .success-message, .success-contact-note {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .direct-farid-btn {
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

        .direct-farid-btn:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.45);
        }

        .success-close-action-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        /* Promotion opt-in checkbox */
        .promo-optin-label {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          cursor: pointer;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px dashed rgba(221, 167, 82, 0.35);
          background: rgba(221, 167, 82, 0.05);
          transition: border-color 0.2s, background 0.2s;
          user-select: none;
          margin-top: 2px;
        }
        .promo-optin-label:hover {
          border-color: rgba(221, 167, 82, 0.65);
          background: rgba(221, 167, 82, 0.09);
        }
        .promo-optin-checkbox {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
          accent-color: #DDA752;
          margin-top: 1px;
          cursor: pointer;
        }
        .promo-bell-icon {
          flex-shrink: 0;
          margin-top: 1px;
          color: var(--gold-primary, #DDA752);
        }
        .promo-optin-label span {
          font-size: 0.79rem;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        @media (max-width: 600px) {
          .inquiry-modal-card {
            padding: 1.5rem 1.25rem;
          }
          .form-row-2 {
            grid-template-columns: 1fr;
          }
          .channel-chips-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalNode, document.body);
};
