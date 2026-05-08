import React, { useEffect, useRef, useState } from 'react';

/* ── Animated Number Counter ── */
export default function AnimatedNumber({ value, prefix = '', suffix = '', color, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);

  return (
    <span style={{ color }} className={value !== 0 ? 'count-pop' : ''}>
      {prefix}{display.toLocaleString('uk-UA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}
