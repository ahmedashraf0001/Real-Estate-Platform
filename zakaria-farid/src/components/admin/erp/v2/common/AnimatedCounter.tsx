'use client';

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 900,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  style = {},
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const currentValRef = useRef<number>(0);
  const startValRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startValRef.current = currentValRef.current;
    startTimeRef.current = null;
    const targetValue = Number.isFinite(value) ? value : 0;
    const safeDuration = Math.max(duration, 50);

    // If user prefers reduced motion, skip the animation loop
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentValRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    if (Math.abs(startValRef.current - targetValue) < 0.001) {
      currentValRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / safeDuration, 1);

      // Ease-out cubic for realistic, satisfying momentum
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (targetValue - startValRef.current) * easeOut;

      currentValRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        currentValRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  const formattedNumber = decimals > 0
    ? displayValue.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(displayValue).toLocaleString('en-US');

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
        ...style,
      }}
    >
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
