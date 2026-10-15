import React, { useState } from 'react';

// A number field that behaves while you type.
//
// The plain inputs wrote Number(text) on every keystroke, and an empty field
// is Number('') = 0 - so clearing a field put a 0 straight back, and typing
// after it gave "05". Here the text is the field's own while it has focus:
// it can be empty, or half a number, and only a real number (inside min /
// max) is passed on. Leaving the field shows the value again.
//
// min >= 0 also refuses the minus key, so a radius, a size or an opacity can
// never be typed negative.
//
// Drag on it to scrub, as in Figma: right adds, left takes away - one step
// per pixel, ten with Shift. A click without dragging goes in to type.
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
  value: number | string | undefined | null;
};

export const NumberInput: React.FC<Props> = ({ value, onChange, onFocus, onBlur, onKeyDown, min, max, ...rest }) => {
  const [text, setText] = useState<string | null>(null);     // null: not being edited
  const fallback = value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value))
    ? '' : String(value);
  const lo = min !== undefined ? Number(min) : undefined;
  const hi = max !== undefined ? Number(max) : undefined;
  const step = Number(rest.step) || 1;

  const scrub = (e: React.PointerEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (e.button !== 0 || document.activeElement === input || rest.disabled) return;   // typing: leave it be
    e.preventDefault();                       // not focused yet: a drag or a click decides
    const x0 = e.clientX, v0 = Number(fallback) || 0;
    const decimals = (String(step).split('.')[1] || '').length;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 3) return;
      moved = true;
      document.body.style.cursor = 'ew-resize';
      let n = v0 + Math.round(dx) * step * (ev.shiftKey ? 10 : 1);
      if (lo !== undefined) n = Math.max(lo, n);
      if (hi !== undefined) n = Math.min(hi, n);
      n = Number(n.toFixed(decimals));
      onChange?.({ target: { value: String(n) }, currentTarget: { value: String(n) } } as unknown as React.ChangeEvent<HTMLInputElement>);
    };
    const up = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      document.body.style.cursor = '';
      if (!moved) { input.focus(); input.select(); }
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  };

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={text ?? fallback}
      onPointerDown={scrub}
      onFocus={(e) => { setText(fallback); onFocus?.(e); }}
      onBlur={(e) => { setText(null); onBlur?.(e); }}
      onKeyDown={(e) => {
        if (lo !== undefined && lo >= 0 && (e.key === '-' || e.key === 'e' || e.key === 'E')) e.preventDefault();
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        onKeyDown?.(e);
      }}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === '' || t === '-' || t === '.' || t === '-.') return;     // still being typed
        const n = Number(t);
        if (Number.isNaN(n)) return;
        if (lo !== undefined && n < lo) return;
        if (hi !== undefined && n > hi) return;
        onChange?.(e);
      }}
    />
  );
};
