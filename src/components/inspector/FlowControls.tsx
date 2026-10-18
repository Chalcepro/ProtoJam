import React from 'react';
import * as Icons from 'lucide-react';
import { NumberInput } from './NumberInput';
import { hintProps } from '../../lib/layoutHint';
import type { AutoLayoutSettings } from '../../types/components';

// How an auto layout frame flows - down, across, or in a grid - and the
// spaces between its things. Hovering or editing a gap shows those spaces on
// the canvas (SpacingHint).

const field = 'flex items-center gap-1.5 bg-[rgba(235,235,236,0.04)] rounded-lg px-2 py-1.5 border border-[rgba(235,235,236,0.08)]';
const num = 'bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs';

export const FlowControls: React.FC<{ id: string; al: AutoLayoutSettings; set: (u: Partial<AutoLayoutSettings>) => void }> = ({ id, al, set }) => {
  const dirs = [
    ['vertical', 'Down: one under another', Icons.ArrowDown],
    ['horizontal', 'Across: side by side', Icons.ArrowRight],
    ['grid', 'Grid: rows and columns', Icons.LayoutGrid]
  ] as const;
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 bg-[rgba(235,235,236,0.06)] rounded-lg p-0.5 border border-[rgba(235,235,236,0.08)]">
          {dirs.map(([d, label, Ic]) => (
            <button key={d} title={label}
                    onClick={() => set(d === 'grid' && !al.columns ? { direction: d, columns: 2, rowGap: al.gap } : { direction: d })}
                    className={`flex-1 flex justify-center py-1 rounded ${al.direction === d ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'}`}>
              <Ic size={13} />
            </button>
          ))}
        </div>
        {al.direction === 'horizontal' && (
          <button onClick={() => set({ wrap: !al.wrap })} title="Wrap onto more rows when out of room"
                  className={`p-1.5 rounded-lg border ${al.wrap ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] border-[rgb(235,235,236)]' : 'border-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'}`}>
            <Icons.WrapText size={13} />
          </button>
        )}
      </div>

      {al.direction === 'grid' ? (
        <div className="grid grid-cols-3 gap-1.5">
          <label className={field} title="Columns">
            <Icons.Columns3 size={12} className="text-[rgba(235,235,236,0.45)] shrink-0" />
            <NumberInput min={1} max={24} value={al.columns || 2} onChange={e => set({ columns: Math.max(1, Math.round(Number(e.target.value))) })} className={num} />
          </label>
          <label className={field} title="Gap between columns" {...hintProps(id, 'gap')}>
            <Icons.BetweenHorizontalStart size={12} className="text-[rgba(235,235,236,0.45)] shrink-0" />
            <NumberInput value={al.gap} onChange={e => set({ gap: Number(e.target.value) })} className={num} />
          </label>
          <label className={field} title="Gap between rows" {...hintProps(id, 'gap')}>
            <Icons.BetweenVerticalStart size={12} className="text-[rgba(235,235,236,0.45)] shrink-0" />
            <NumberInput value={al.rowGap ?? al.gap} onChange={e => set({ rowGap: Number(e.target.value) })} className={num} />
          </label>
        </div>
      ) : (
        <label className={field} title={al.direction === 'vertical' ? 'Gap between things, top to bottom' : 'Gap between things, left to right'} {...hintProps(id, 'gap')}>
          {al.direction === 'vertical'
            ? <Icons.BetweenVerticalStart size={12} className="text-[rgba(235,235,236,0.45)] shrink-0" />
            : <Icons.BetweenHorizontalStart size={12} className="text-[rgba(235,235,236,0.45)] shrink-0" />}
          <span className="text-[10px] text-[rgba(235,235,236,0.45)] shrink-0">Gap</span>
          <NumberInput value={al.gap} onChange={e => set({ gap: Number(e.target.value) })} className={num} />
          {al.wrap && al.direction === 'horizontal' && (
            <>
              <span className="text-[10px] text-[rgba(235,235,236,0.45)] shrink-0">Rows</span>
              <NumberInput value={al.rowGap ?? al.gap} onChange={e => set({ rowGap: Number(e.target.value) })} className={num} />
            </>
          )}
        </label>
      )}
    </>
  );
};
