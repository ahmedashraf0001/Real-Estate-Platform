'use client';

import { Phone, MessageCircle } from 'lucide-react';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import styles from './MobileLeadBar.module.css';

interface MobileLeadBarProps {
  propertyTitle?: string;
  locale?: string;
}

export default function MobileLeadBar({ propertyTitle }: MobileLeadBarProps) {
  const waMessage = propertyTitle
    ? `Hello, I am interested in the property: ${propertyTitle}`
    : 'Hello, I am interested in a property.';

  return (
    <div className={styles.bar}>
      <a href={`tel:+${WHATSAPP_NUMBER}`} className={`${styles.btn} ${styles.call}`}>
        <Phone size={18} strokeWidth={1.5} />
        <span>Call</span>
      </a>
      <a
        href={whatsappUrl(WHATSAPP_NUMBER, waMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.btn} ${styles.wa}`}
      >
        <MessageCircle size={18} strokeWidth={1.5} />
        <span>WhatsApp</span>
      </a>
    </div>
  );
}
