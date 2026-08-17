'use client';
import React, { useEffect } from 'react';

export const LuxuryCursor: React.FC = () => {
  useEffect(() => {
    // Ensure native cursor cleanup
    document.body.classList.remove('custom-cursor-active');
    document.documentElement.style.cursor = '';
    document.body.style.cursor = '';
  }, []);

  return null;
};
