import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { SHORTCUTS } from '../lib/shortcuts';

// Every shortcut, grouped, with a filter. Opened with ? or Ctrl+/ (see App).
export const ShortcutsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [q, setQ] = useState('');
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  const f = q.trim().toLowerCase();
  const groups = SHORTCUTS.map(g => ({ ...g, items: g.items.filter(([k, d]) => !f || k.toLowerCase().includes(f) || d.toLowerCase().includes(f) || g.group.toLowerCase().includes(f)) }))
    .filter(g => g.items.length);
  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-6" onMouseDown={onClose}>
      <div onMouseDown={e => e.stopPropagation()}
           className="w-full max-w-5xl max-h-full flex flex-col bg-[rgb(24,24,23)] border border-[rgba(235,235,236,0.15)] rounded-2xl shadow-2xl text-[rgb(235,235,236)]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(235,235,236,0.08)]">
          <Icons.Keyboard size={16} />
          <span className="font-bold text-sm">Keyboard shortcuts</span>
          <div className="flex items-center gap-2 bg-[rgba(235,235,236,0.06)] rounded-lg px-2 py-1 ml-auto w-64">
            <Icons.Search size={12} className="opacity-50" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Find a shortcut" className="bg-transparent outline-none text-xs flex-1" />
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)]" title="Close (Esc)"><Icons.X size={14} /></button>
        </div>
        <div className="overflow-y-auto p-5 columns-1 md:columns-2 lg:columns-3 gap-6">
          {groups.map(g => (
            <div key={g.group} className="break-inside-avoid mb-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(235,235,236,0.45)] mb-1.5">{g.group}</div>
              {g.items.map(([k, d]) => (
                <div key={k + d} className="flex items-start justify-between gap-3 py-1 border-b border-[rgba(235,235,236,0.05)] text-xs">
                  <span className="text-[rgba(235,235,236,0.75)]">{d}</span>
                  <kbd className="shrink-0 font-mono text-[10px] bg-[rgba(235,235,236,0.08)] border border-[rgba(235,235,236,0.12)] rounded px-1.5 py-0.5 text-right">{k}</kbd>
                </div>
              ))}
            </div>
          ))}
          {!groups.length && <div className="text-xs opacity-50">No shortcut matches.</div>}
        </div>
      </div>
    </div>
  );
};
