'use client';

import React, { useEffect, useState } from 'react';
import { getCalApi } from '@calcom/embed-react';
import { Calendar, CheckCircle, MessageCircle, ShieldCheck, Clock } from 'lucide-react';

interface ViewingSchedulerProps {
  calLink: string | null;
  propertyId: string;
  propertySlug: string;
  propertyTitle: string;
  isAr: boolean;
  whatsappHref: string;
}

const CAL_NAMESPACE = 'property-viewing';

const ViewingScheduler: React.FC<ViewingSchedulerProps> = ({
  calLink,
  propertyId,
  propertySlug,
  propertyTitle,
  isAr,
  whatsappHref,
}) => {
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!calLink) return;
    let cancelled = false;
    (async () => {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE });
      if (cancelled) return;
      cal('ui', {
        cssVarsPerTheme: {
          dark: { 'cal-brand': '#DDA752' },
          light: { 'cal-brand': '#B8860B' },
        },
        hideEventTypeDetails: false,
        layout: 'month_view',
      });
      cal('on', {
        action: 'bookingSuccessful',
        callback: () => setBooked(true),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [calLink]);

  if (!calLink) return null;

  return (
    <div className="vs-root">
      {booked ? (
        <div className="vs-confirmed-box">
          <CheckCircle size={38} className="vs-confirmed-icon" />
          <h4 className="vs-confirmed-title">{isAr ? 'تم حجز المعاينة' : 'Viewing Scheduled'}</h4>
          <p className="vs-confirmed-note">
            {isAr
              ? 'وصلك تأكيد بالبريد الإلكتروني، وسيتواصل معك مستشارك لتأكيد تفاصيل الزيارة.'
              : 'A confirmation email is on its way. Your advisor will reach out to finalize the visit details.'}
          </p>
          <button type="button" className="vs-again-btn" onClick={() => setBooked(false)}>
            {isAr ? 'حجز موعد آخر' : 'Book another time'}
          </button>
        </div>
      ) : (
        <div className="vs-cta-stack">
          <div className="vs-benefits">
            <span className="vs-benefit-item">
              <Clock size={13} />
              <span>{isAr ? 'مواعيد مباشرة من تقويم المستشار' : 'Live slots from your advisor\u2019s calendar'}</span>
            </span>
            <span className="vs-benefit-item">
              <ShieldCheck size={13} />
              <span>{isAr ? 'تأكيد فوري بالبريد الإلكتروني' : 'Instant email confirmation'}</span>
            </span>
          </div>

          <button
            type="button"
            className="vs-book-btn btn-gold"
            data-cal-namespace={CAL_NAMESPACE}
            data-cal-link={calLink}
            data-cal-config={JSON.stringify({
              layout: 'month_view',
              'metadata[propertyId]': propertyId,
              'metadata[propertySlug]': propertySlug,
              'metadata[propertyTitle]': propertyTitle,
            })}
          >
            <Calendar size={16} />
            <span>{isAr ? 'اختر موعد المعاينة' : 'Pick a Viewing Time'}</span>
          </button>
        </div>
      )}

      <style>{`
        .vs-root {
          width: 100%;
        }

        .vs-cta-stack {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .vs-benefits {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .vs-benefit-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary, rgba(255, 255, 255, 0.65));
        }

        .vs-benefit-item svg {
          color: var(--gold-primary, #DDA752);
          flex-shrink: 0;
        }

        .vs-book-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.9rem 1.25rem;
          border-radius: 9999px;
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
        }

        .vs-fallback-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.85rem 1.25rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 700;
          text-decoration: none;
          background: rgba(37, 211, 102, 0.12);
          color: #25D366;
          border: 1px solid rgba(37, 211, 102, 0.35);
          transition: background 0.2s ease;
        }

        .vs-fallback-btn:hover {
          background: rgba(37, 211, 102, 0.2);
        }

        .vs-confirmed-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.6rem;
          padding: 1.25rem 0.75rem;
        }

        .vs-confirmed-icon {
          color: #10B981;
        }

        .vs-confirmed-title {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          margin: 0;
        }

        .vs-confirmed-note {
          font-size: 0.78rem;
          line-height: 1.5;
          color: var(--text-secondary, rgba(255, 255, 255, 0.65));
          margin: 0;
        }

        .vs-again-btn {
          margin-top: 0.4rem;
          padding: 0.55rem 1.1rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          background: transparent;
          color: var(--gold-primary, #DDA752);
          border: 1px solid rgba(221, 167, 82, 0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ViewingScheduler;
