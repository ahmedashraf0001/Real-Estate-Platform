'use client';
import React, { useState } from 'react';
import { X, CheckCircle, Shield, Building2, Phone, Mail, User, Send } from 'lucide-react';

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
  title = 'Private Acquisition Inquiry',
  propertyName,
  propertyId,
  locale = 'en'
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [budget, setBudget] = useState('30,000,000 - 60,000,000 EGP');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setFullName('');
    setEmail('');
    setPhone('');
    setNotes('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="inquiry-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="inquiry-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="inquiry-header">
              <span className="inquiry-eyebrow">CONFIDENTIAL CONCIERGE</span>
              <h2 className="inquiry-title">{title}</h2>
              {propertyName && (
                <div className="inquiry-property-pill">
                  <Building2 size={14} className="pill-icon" />
                  <span>{propertyName}</span>
                </div>
              )}
              <p className="inquiry-sub">
                Our Senior Private Client Advisors will prepare a discreet dossier and contact you within 2 business hours.
              </p>
            </div>

            <form className="inquiry-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">FULL NAME</label>
                <div className="input-wrap">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Hisham El-Gammal"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">EMAIL ADDRESS</label>
                  <div className="input-wrap">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      required
                      placeholder="hisham@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">PHONE / WHATSAPP</label>
                  <div className="input-wrap">
                    <Phone size={16} className="input-icon" />
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
                <label className="form-label">DESIRED ACQUISITION BUDGET</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="form-select"
                >
                  <option value="15,000,000 - 30,000,000 EGP">15,000,000 - 30,000,000 EGP</option>
                  <option value="30,000,000 - 60,000,000 EGP">30,000,000 - 60,000,000 EGP</option>
                  <option value="60,000,000 - 120,000,000 EGP">60,000,000 - 120,000,000 EGP</option>
                  <option value="120,000,000+ EGP (Trophy Sovereign Asset)">120,000,000+ EGP (Trophy Sovereign Asset)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">SPECIFIC ARCHITECTURAL REQUIREMENTS (OPTIONAL)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Minimalist brutalist facade, private golf course view, 50ft pool..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="nda-note">
                <Shield size={14} className="nda-icon" />
                <span>All client correspondence is strictly protected by non-disclosure protocols.</span>
              </div>

              <button type="submit" className="btn-gold inquiry-submit-btn">
                <Send size={16} />
                <span>Submit Confidential Inquiry</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="inquiry-success-state">
            <div className="success-icon-wrap">
              <CheckCircle size={48} className="success-icon" />
            </div>
            <h2 className="success-title">Inquiry Received</h2>
            <p className="success-message">
              Thank you, <strong>{fullName}</strong>. Your private inquiry has been assigned to our Executive Portfolio Director.
            </p>
            <p className="success-contact-note">
              We will contact you discreetly at <strong>{phone}</strong> and send the private architectural dossier to <strong>{email}</strong>.
            </p>
            <button className="btn-gold success-close-btn" onClick={handleReset}>
              Return to Catalog
            </button>
          </div>
        )}
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: fadeIn 200ms ease-out;
        }

        .inquiry-modal-card {
          position: relative;
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border-radius: var(--radius-xl);
          padding: 3rem;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          transition: background var(--transition-smooth);
        }

        [data-theme="dark"] .inquiry-modal-card {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(18, 24, 38, 0.85) 40%,
            rgba(10, 14, 24, 0.95) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 32px 80px rgba(0, 0, 0, 0.75), 
            0 0 30px rgba(252, 211, 77, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65);
        }

        [data-theme="light"] .inquiry-modal-card {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.94) 0%,
            rgba(255, 255, 255, 0.84) 40%,
            rgba(255, 255, 255, 0.92) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.15), inset 0 2px 2.5px #FFFFFF;
        }

        .inquiry-close-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }

        .inquiry-close-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          transform: scale(1.05);
        }

        .inquiry-header {
          margin-bottom: 2rem;
        }

        .inquiry-eyebrow {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: var(--gold-primary);
          display: block;
          margin-bottom: 0.4rem;
        }

        .inquiry-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .inquiry-property-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(197, 142, 54, 0.1);
          border: 1px solid var(--gold-border);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gold-primary);
          margin-bottom: 0.75rem;
        }

        .pill-icon {
          color: var(--gold-primary);
        }

        .inquiry-sub {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .inquiry-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 0.8125rem 1rem 0.8125rem 2.625rem;
          color: var(--text-primary);
          font-size: 0.9375rem;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }

        .form-select {
          padding-left: 1rem;
          appearance: none;
          background-color: var(--bg-card);
        }

        .form-textarea {
          padding: 0.8125rem 1rem;
          resize: vertical;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: var(--gold-primary);
          background: var(--bg-card-hover);
        }

        .nda-note {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .nda-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        .inquiry-submit-btn {
          margin-top: 0.5rem;
          padding: 1rem;
          width: 100%;
          font-size: 1rem;
        }

        .inquiry-success-state {
          text-align: center;
          padding: 2rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .success-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-full);
          background: rgba(197, 142, 54, 0.12);
          border: 2px solid var(--gold-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-icon {
          color: var(--gold-primary);
        }

        .success-title {
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .success-message, .success-contact-note {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .success-close-btn {
          margin-top: 1rem;
          padding: 0.875rem 2rem;
        }

        @media (max-width: 600px) {
          .inquiry-modal-card {
            padding: 2rem 1.5rem;
          }
          .form-row-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
