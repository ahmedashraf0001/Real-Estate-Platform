'use client';

import { Phone, MessageCircle } from 'lucide-react';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import styles from './MobileLeadBar.module.css';

interface MobileLeadBarProps {
  propertyTitle?: string;
  locale?: string;
  onOpenLeadModal?: (action: 'call' | 'whatsapp') => void;
}

export default function MobileLeadBar({ propertyTitle, onOpenLeadModal }: MobileLeadBarProps) {
  const waMessage = propertyTitle
    ? `Hello, I am interested in the property: ${propertyTitle}`
    : 'Hello, I am interested in a property.';

  return (
    <div className={styles.bar}>
      <button
        type="button"
        onClick={() => onOpenLeadModal ? onOpenLeadModal('call') : (window.location.href = `tel:+${WHATSAPP_NUMBER}`)}
        className={`${styles.btn} ${styles.call}`}
      >
        <Phone size={18} strokeWidth={1.5} />
        <span>Call</span>
      </button>
      <button
        type="button"
        onClick={() => onOpenLeadModal ? onOpenLeadModal('whatsapp') : window.open(whatsappUrl(WHATSAPP_NUMBER, waMessage), '_blank')}
        className={`${styles.btn} ${styles.wa}`}
      >
        <MessageCircle size={18} strokeWidth={1.5} />
        <span>WhatsApp</span>
      </button>
    </div>
  );
}
