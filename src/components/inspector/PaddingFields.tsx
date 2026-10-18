import React, { useState } from 'react';
import { NumberInput } from './NumberInput';
import { hintProps } from '../../lib/layoutHint';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Pad = Record<Side, number>;

const ZERO: Pad = { top: 0, right: 0, bottom: 0, left: 0 };

// A box with the padded edges drawn bold, as Figma marks its padding fields.
const SideIcon: React.FC<{ sides: Side[] }> = ({ sides }) => {
  const bar = (s: Side, x1: number, y1: number, x2: number, y2: number) => sides.includes(s) &&
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 mr-2 text-[rgba(235,235,236,0.55)]">
      <rect x="3.5" y="3.5" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      {bar('left', 1, 2, 1, 10)}
      {bar('right', 11, 2, 11, 10)}
      {bar('top', 2, 1, 10, 1)}
      {bar('bottom', 2, 11, 10, 11)}
    </svg>
  );
};

// Padding as Figma lays it out: left & right in one field and top & bottom in
// the other, since that is how padding is nearly always set. The toggle opens
// all four sides for exact values. A pair whose sides differ reads "Mixed";
// typing into it sets both again.
export const PaddingFields: React.FC<{ value?: Pad; onChange: (p: Pad) => void; hintId?: string }> = ({ value, onChange, hintId }) => {
  const p = value || ZERO;
  const [individual, setIndividual] = useState(p.left !== p.right || p.top !== p.bottom);

  const field = (label: string, sides: Side[]) => {
    const same = sides.every(s => p[s] === p[sides[0]]);
    return (
      <div key={label} title={label}
           className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
        <SideIcon sides={sides} />
        <NumberInput
          value={same ? p[sides[0]] : ''}
          placeholder="Mixed"
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ ...p, ...Object.fromEntries(sides.map(s => [s, v])) });
          }}
          className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs placeholder:text-[rgba(235,235,236,0.35)]"
        />
      </div>
    );
  };

  return (
    // hovering or editing these shows the padding on the canvas
    <div className="mt-2" {...(hintId ? hintProps(hintId, 'padding') : {})}>
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-[rgba(235,235,236,0.5)]">Padding</span>
        <button onClick={() => setIndividual(!individual)}
                title={individual ? 'Back to left & right / top & bottom' : 'Set each side on its own'}
                className={`p-1 rounded transition-colors ${individual ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : 'text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)]'}`}>
          <svg width="11" height="11" viewBox="0 0 12 12">
            <rect x="3.5" y="3.5" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeOpacity="0.5" />
            <path d="M1 3v6M11 3v6M3 1h6M3 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {individual
          ? [field('Left', ['left']), field('Top', ['top']), field('Right', ['right']), field('Bottom', ['bottom'])]
          : [field('Left & right', ['left', 'right']), field('Top & bottom', ['top', 'bottom'])]}
      </div>
    </div>
  );
};
