import React, { useRef } from 'react';

/**
 * MagneticButton — slides toward cursor on hover, glows on focus.
 * Wrap any button content with this component.
 */
export default function MagneticButton({ children, onClick, disabled, className = '', style = {}, variant = 'primary' }) {
  const btnRef = useRef(null);

  const handleMouseMove = (e) => {
    if (disabled) return;
    const btn = btnRef.current;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.28;
    const dy = (e.clientY - cy) * 0.28;
    btn.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
  };

  const handleMouseLeave = () => {
    const btn = btnRef.current;
    btn.style.transform = '';
  };

  return (
    <button
      ref={btnRef}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{ transition: 'transform 0.12s ease, box-shadow 0.2s ease, background 0.2s', ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}
