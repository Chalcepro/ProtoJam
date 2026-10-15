import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { DEVICE_PRESETS, DevicePreset } from '../../presets/devicePresets';
import * as Icons from 'lucide-react';

const GROUPS: { id: DevicePreset['category']; label: string }[] = [
  { id: 'mobile', label: 'Phone' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'presentation', label: 'Presentation & slides' },
  { id: 'video', label: 'Video' },
  { id: 'social', label: 'Social media' },
  { id: 'watch', label: 'Watch' },
  { id: 'paper', label: 'Paper' },
  { id: 'custom', label: 'Custom' }
];

// Every screen size, grouped as in Figma's frame panel. Picking one adds the
// frame; onPicked lets the caller (the frame tool) step back to select.
export const FramePresetsPanel: React.FC<{ onPicked?: () => void }> = ({ onPicked }) => {
  const { addFrame } = useProjectStore(useShallow((s) => ({ addFrame: s.addFrame })));
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();

  const renderIcon = (name: string) => {
    const IconComp = (Icons as any)[name] || Icons.Frame;
    return <IconComp size={14} className="text-[rgba(235,235,236,0.6)] shrink-0" />;
  };
  const toggle = (id: string) => setClosed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="flex flex-col h-full text-xs text-[rgb(235,235,236)]">
      <div className="p-3 pb-2">
        <div className="text-[11px] font-semibold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
          Frame sizes
        </div>
        <div className="flex items-center gap-2 bg-[rgba(235,235,236,0.05)] rounded-lg px-2 py-1.5 border border-[rgba(235,235,236,0.08)]">
          <Icons.Search size={12} className="opacity-50" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sizes"
                 className="bg-transparent outline-none flex-1 min-w-0 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        {GROUPS.map(g => {
          const items = DEVICE_PRESETS.filter(p => p.category === g.id && (!q || p.name.toLowerCase().includes(q)));
          if (!items.length) return null;
          const isOpen = q !== '' || !closed.has(g.id);
          return (
            <div key={g.id} className="mb-1">
              <button onClick={() => toggle(g.id)}
                      className="w-full flex items-center gap-1 px-1.5 py-1.5 text-[11px] font-semibold text-[rgba(235,235,236,0.75)] hover:text-[rgb(235,235,236)]">
                {isOpen ? <Icons.ChevronDown size={12} /> : <Icons.ChevronRight size={12} />}
                {g.label}
                <span className="ml-auto font-normal text-[10px] text-[rgba(235,235,236,0.35)]">{items.length}</span>
              </button>
              {isOpen && items.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => { addFrame(preset); onPicked?.(); }}
                  className="w-full flex items-center gap-2.5 pl-5 pr-2 py-1.5 rounded-md hover:bg-[rgba(235,235,236,0.07)] text-left"
                >
                  {renderIcon(preset.iconName)}
                  <span className="truncate flex-1">{preset.name.replace(/\s*\(\d+\s*×\s*\d+[^)]*\)\s*$/, '')}</span>
                  <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono shrink-0">{preset.width}×{preset.height}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
