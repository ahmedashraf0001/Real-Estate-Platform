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
  Send
} from 'lucide-react';
import { motion } from 'framer-motion';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { createCachedTileLayer } from '@/lib/mapCache';

export const ContactView: React.FC<{ locale?: string }> = ({ locale = 'en' }) => {
  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [contactPref, setContactPref] = useState<string>('whatsapp');
  const [message, setMessage] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ((window as any).__masrLenis) {
      (window as any).__masrLenis.scrollTo(0, { immediate: true });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Real Leaflet map centered on MASR Grand HQ in New Cairo Financial District
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
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(10, 14, 22, 0.9);
        border: 2px solid #DDA752;
        box-shadow: 0 0 24px rgba(221, 167, 82, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #DDA752;"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: pinHtml,
      className: 'grand-hq-map-pin',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const marker = L.marker([30.023, 31.438], { icon: customIcon }).addTo(map);
    marker.bindTooltip(
      `<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 800; color: #DDA752; background: #0A0C10; padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(221, 167, 82, 0.5); box-shadow: 0 8px 24px rgba(0,0,0,0.6);">Zakaria Farid Flagship HQ · Financial District</div>`,
      { direction: 'top', offset: [0, -18], permanent: true, className: 'luxury-leaflet-tooltip' }
    );

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="contact-page">
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
              <span>PRIVATE CLIENT DESK</span>
            </motion.div>

            <motion.h1 
              className="contact-main-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="header-scan-glow">Executive Concierge & Inquiries</span>
            </motion.h1>

            <motion.p 
              className="contact-hero-subtitle"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
            >
              Connect directly with our client advisory team for private portfolio consultations, discrete property inquiries, and chauffeured estate walkthroughs across Egypt.
            </motion.p>
          </div>
        </section>

        {/* 2. Main 2-Column Section: Inquiry Form + Direct Concierge Sidebar */}
        <section className="contact-form-grid-section">
          <div className="contact-two-col-grid">
            
            {/* Left: Streamlined Inquiry Form */}
            <div className="acquisition-form-card">
              <div className="form-card-header">
                <span className="form-eyebrow">DIRECT INQUIRY</span>
                <h2 className="form-card-title">Send a Message</h2>
                <p className="form-card-sub">
                  Provide your details and inquiry below. Our private client team will respond within 24 hours.
                </p>
              </div>

              {!isSubmitted ? (
                <form className="acquisition-form" onSubmit={handleSubmit}>
                  
                  {/* Contact Info Fields */}
                  <div className="form-inputs-grid">
                    <div className="form-field-group">
                      <label className="form-field-label">FULL NAME</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Tarek Mansour"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="form-dark-input"
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="form-field-label">EMAIL ADDRESS</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="tarek@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-dark-input"
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">PHONE NUMBER</label>
                    <input 
                      type="tel" 
                      required 
                      placeholder="+20 100 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-dark-input"
                    />
                  </div>

                  {/* Preferred Channel */}
                  <div className="form-chip-group">
                    <label className="form-field-label">PREFERRED COMMUNICATION CHANNEL</label>
                    <div className="chips-row">
                      {[
                        { id: 'whatsapp', label: 'WhatsApp' },
                        { id: 'phone', label: 'Direct Phone Call' },
                        { id: 'email', label: 'Email Correspondence' },
                        { id: 'hq-meeting', label: 'In-Person HQ Meeting' }
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`selector-chip ${contactPref === c.id ? 'active' : ''}`}
                          onClick={() => setContactPref(c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">YOUR INQUIRY / MESSAGE</label>
                    <textarea 
                      rows={4}
                      required
                      placeholder="Describe your inquiry, property preferences, or desired viewing schedule..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="form-dark-textarea"
                    />
                  </div>

                  <button type="submit" className="submit-inquiry-btn btn-gold">
                    <span>Send Message</span>
                    <ArrowUpRight size={16} />
                  </button>
                </form>
              ) : (
                <div className="form-success-box">
                  <CheckCircle size={48} className="success-icon" />
                  <h3 className="success-title">Inquiry Received</h3>
                  <p className="success-msg">
                    Thank you, <strong>{fullName}</strong>. Our private advisory team has received your message and will reach out to you via <strong>{phone}</strong> or <strong>{email}</strong> shortly.
                  </p>
                  <button 
                    className="btn-dark reset-form-btn"
                    onClick={() => {
                      setIsSubmitted(false);
                      setMessage('');
                    }}
                    type="button"
                  >
                    Send Another Message
                  </button>
                </div>
              )}
            </div>

            {/* Right: Direct Desk & WhatsApp Fast-Connect */}
            <div className="contact-sidebar-col">
              
              {/* Direct Concierge WhatsApp Card */}
              <div className="direct-agent-card">
                <div className="agent-card-top">
                  <span className="agent-badge">LIVE CONCIERGE</span>
                </div>
                <h3 className="agent-card-title">WhatsApp Client Desk</h3>
                <p className="agent-card-desc">
                  Connect immediately with our advisory team for real-time inquiries, catalog requests, or viewing schedules.
                </p>
                <a 
                  href="https://wa.me/201001234567?text=Hello,%20I%20am%20inquiring%20about%20Zakaria%20Farid%20estates."
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="chat-agent-link btn-gold"
                >
                  <MessageCircle size={16} />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>

              {/* Direct Telephone Hotline */}
              <div className="direct-hotline-card">
                <h4 className="hotline-title">Direct Client Hotline</h4>
                <a href="tel:+20219688" className="hotline-num">
                  <PhoneCall size={18} className="hotline-icon" />
                  <span>+20 2 19688</span>
                </a>
                <span className="hotline-sub">Available Sun – Thu · 9:00 AM – 6:00 PM (EET)</span>
              </div>

              {/* Direct Email Card */}
              <div className="direct-hotline-card">
                <h4 className="hotline-title">Corporate Inquiries</h4>
                <a href="mailto:concierge@zakariafarid.com" className="hotline-num email-hotline">
                  <Mail size={18} className="hotline-icon" />
                  <span>concierge@zakariafarid.com</span>
                </a>
                <span className="hotline-sub">Official advisory correspondence desk</span>
              </div>

            </div>
          </div>
        </section>

        {/* 3. Zakaria Farid Grand HQ Panoramic Satellite Map Stage */}
        <section className="grand-hq-map-section">
          <div className="grand-hq-banner">
            <div ref={mapContainerRef} className="grand-hq-leaflet-canvas" />
            <div className="grand-hq-vignette" />

            <div className="grand-hq-floating-card">
              <span className="hq-eyebrow-pill">FLAGSHIP HEADQUARTERS</span>
              <h3 className="floating-hq-title">Zakaria Farid Grand HQ</h3>
              <p className="floating-hq-address">
                G-08 Grand Tower, Financial District, South 90th Axis, New Cairo, Egypt
              </p>
              <div className="floating-hq-hours">
                <Clock size={13} className="hq-clock" />
                <span>Open: Sun – Thu · 9:00 AM – 6:00 PM (EET)</span>
              </div>
              <a 
                href="https://maps.google.com/?q=New+Cairo+Financial+District" 
                target="_blank" 
                rel="noopener noreferrer"
                className="directions-btn"
              >
                <Navigation size={15} />
                <span>Get Driving Directions</span>
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

        .form-dark-input, .form-dark-textarea {
          width: 100%;
          border-radius: 12px;
          padding: 0.85rem 1.15rem;
          font-size: 0.9375rem;
          outline: none;
          transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
        }

        [data-theme="dark"] .form-dark-input, 
        [data-theme="dark"] .form-dark-textarea {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        [data-theme="dark"] .form-dark-input::placeholder, 
        [data-theme="dark"] .form-dark-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        [data-theme="dark"] .form-dark-input:focus, 
        [data-theme="dark"] .form-dark-textarea:focus {
          border-color: #DDA752;
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 14px rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .form-dark-input, 
        [data-theme="light"] .form-dark-textarea {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.16);
          color: #0D1117;
          font-weight: 500;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        [data-theme="light"] .form-dark-input::placeholder, 
        [data-theme="light"] .form-dark-textarea::placeholder {
          color: #64748B;
        }

        [data-theme="light"] .form-dark-input:focus, 
        [data-theme="light"] .form-dark-textarea:focus {
          border-color: #A87E2C;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(197, 154, 69, 0.20);
        }

        .form-dark-textarea {
          resize: vertical;
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

        /* Responsive */
        @media (max-width: 1024px) {
          .contact-two-col-grid {
            grid-template-columns: 1fr;
          }
          .contact-sidebar-col {
            position: static;
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
