import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { startGesture } from '../../lib/gesture';

// A number field that behaves while you type.
//
// The plain inputs wrote Number(text) on every keystroke, and an empty field
// is Number('') = 0 - so clearing a field put a 0 straight back, and typing
// after it gave "05". Here the text is the field's own while it has focus:
// it can be empty, or half a number, and only a real number (inside min /
// max) is passed on. Leaving the field shows the value again.
//
// Nothing goes below 0 unless the field is `signed` (a position, an offset):
// a size, a radius, a font size or a gap is never negative. min >= 0 also
// refuses the minus key.
//
// Drag on it to scrub, as in Figma: right adds, left takes away - one step
// per pixel. Shift: fine, as in Blender - ten times slower, to a tenth of a
// step. Ctrl: ten steps per pixel. A click without dragging goes in to type.
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
  value: number | string | undefined | null;
  signed?: boolean;
  // A sign that sticks (gaps): any value can be typed, but dragging or the
  // arrow keys never cross zero by accident - from a positive value they stop
  // at 1, from a negative one at -1. Only from 0 can they go either way. To
  // go negative, type -1.
  stickySign?: boolean;
};

// the range a drag / arrow key may move in, given where it started
const signRange = (start: number, lo?: number, hi?: number): [number | undefined, number | undefined] =>
  start > 0 ? [Math.max(lo ?? 1, 1), hi] : start < 0 ? [lo, Math.min(hi ?? -1, -1)] : [lo, hi];

// What the keys do while scrubbing - at the canvas's bottom right corner,
// next to the right panel.
const ScrubHint: React.FC<{ fine: boolean; fast: boolean }> = ({ fine, fast }) => {
  const r = document.querySelector('main')?.getBoundingClientRect();
  if (!r) return null;
  const key = (k: string, on: boolean, what: string) => (
    <span className={on ? 'text-[rgb(235,235,236)]' : 'text-[rgba(235,235,236,0.45)]'}>
      <kbd className={`px-1 rounded border font-mono text-[10px] ${on ? 'border-[#31C3F3] text-[#31C3F3]' : 'border-[rgba(235,235,236,0.2)]'}`}>{k}</kbd> {what}
    </span>
  );
  return createPortal(
    <div className="fixed z-[10001] pointer-events-none flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[rgb(28,28,27)] border border-[rgba(235,235,236,0.12)] shadow-xl text-[11px]"
         style={{ left: r.right - 12, top: r.bottom - 12, transform: 'translate(-100%, -100%)' }}>
      {key('Shift', fine, 'fine')}
      {key('Ctrl', fast, '×10')}
    </div>,
    document.body
  );
};

export const NumberInput: React.FC<Props> = ({ value, onChange, onFocus, onBlur, onKeyDown, min, max, signed, stickySign, ...rest }) => {
  const [text, setText] = useState<string | null>(null);     // null: not being edited
  const fallback = value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value))
    ? '' : String(value);
  const lo = min !== undefined ? Number(min) : signed || stickySign ? undefined : 0;
  const [hint, setHint] = useState<{ fine: boolean; fast: boolean } | null>(null);
  const hi = max !== undefined ? Number(max) : undefined;
  const step = Number(rest.step) || 1;

  const scrub = (e: React.PointerEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (e.button !== 0 || document.activeElement === input || rest.disabled) return;   // typing: leave it be
    e.preventDefault();                       // not focused yet: a drag or a click decides
    const x0 = e.clientX;
    const decimals = (String(step).split('.')[1] || '').length;
    // added up move by move, so pressing or letting go of a key mid-drag
    // changes the speed from there on, never jumps
    let acc = Number(fallback) || 0, lastX = x0;
    const [sLo, sHi] = stickySign ? signRange(acc, lo, hi) : [lo, hi];
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < 3) return;
      moved = true;
      document.body.style.cursor = 'ew-resize';
      const fine = ev.shiftKey, fast = ev.ctrlKey || ev.metaKey;
      setHint(h => h && h.fine === fine && h.fast === fast ? h : { fine, fast });
      acc += (ev.clientX - lastX) * step * (fine ? 0.1 : fast ? 10 : 1);
      lastX = ev.clientX;
      if (sLo !== undefined) acc = Math.max(sLo, acc);
      if (sHi !== undefined) acc = Math.min(sHi, acc);
      const n = Number(acc.toFixed(decimals + (fine ? 1 : 0)));
      onChange?.({ target: { value: String(n) }, currentTarget: { value: String(n) } } as unknown as React.ChangeEvent<HTMLInputElement>);
    };
    const off = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      document.body.style.cursor = '';
      setHint(null);
    };
    const up = () => {
      off();
      end();
      if (!moved) { input.focus(); input.select(); }
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    // right-click or Esc mid-drag puts it all back (src/lib/gesture.ts)
    const end = startGesture(off);
  };

  return (
    <>
    {hint && <ScrubHint {...hint} />}
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
        // arrow keys step without crossing zero, as dragging does
        if (stickySign && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const v = Number(text ?? fallback) || 0;
          const [a, b] = signRange(v, lo, hi);
          let n = v + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
          if (a !== undefined) n = Math.max(a, n);
          if (b !== undefined) n = Math.min(b, n);
          setText(String(n));
          onChange?.({ target: { value: String(n) }, currentTarget: { value: String(n) } } as unknown as React.ChangeEvent<HTMLInputElement>);
        }
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
    </>
  );
};
