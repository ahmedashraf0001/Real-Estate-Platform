'use client';

import React from 'react';
import { ZFErpGuidedTour } from './ZFErpGuidedTour';

interface ZFErpAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGuidedTour?: () => void;
  onNavigateToModule?: (modId: string) => void;
  isAr?: boolean;
}

/**
 * ZFErpAcademyModal (Revamped)
 * 
 * Replaces the obsolete static "book" reading manual with the live,
 * automated Sovereign Alabaster Walkthrough Tour across all 9 core FIN-OS modules.
 */
export const ZFErpAcademyModal: React.FC<ZFErpAcademyModalProps> = ({
  isOpen,
  onClose,
  onNavigateToModule,
  isAr = true
}) => {
  if (!isOpen) return null;

  return (
    <ZFErpGuidedTour
      isActive={isOpen}
      onComplete={onClose}
      onSkip={onClose}
      onNavigateToModule={onNavigateToModule}
      isAr={isAr}
    />
  );
};
