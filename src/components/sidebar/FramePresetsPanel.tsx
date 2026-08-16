import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { DEVICE_PRESETS, DevicePreset } from '../../presets/devicePresets';
import * as Icons from 'lucide-react';

export const FramePresetsPanel: React.FC = () => {
  const { addFrame } = useProjectStore();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'mobile' | 'tablet' | 'desktop' | 'watch'>('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'mobile', label: 'Phones' },
    { id: 'tablet', label: 'Tablets' },
    { id: 'desktop', label: 'Desktop' },
    { id: 'watch', label: 'Watch' }
  ];

  const filteredPresets = selectedCategory === 'all' 
    ? DEVICE_PRESETS 
    : DEVICE_PRESETS.filter(p => p.category === selectedCategory);

  const renderIcon = (name: string) => {
    const IconComp = (Icons as any)[name] || Icons.Frame;
    return <IconComp size={16} className="text-[rgb(235,235,236)] shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 text-xs text-[rgb(235,235,236)]">
      <div className="text-[11px] font-semibold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
        Screen Artboard Presets
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow-sm'
                : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Preset List */}
      <div className="space-y-1.5">
        {filteredPresets.map(preset => (
          <button
            key={preset.id}
            onClick={() => addFrame(preset)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[rgba(235,235,236,0.03)] hover:bg-[rgba(235,235,236,0.07)] border border-[rgba(235,235,236,0.1)] hover:border-[rgba(235,235,236,0.25)] transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-[rgba(235,235,236,0.08)] group-hover:bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]">
                {renderIcon(preset.iconName)}
              </div>
              <div>
                <div className="font-semibold text-[rgb(235,235,236)] text-xs">
                  {preset.name}
                </div>
                <div className="text-[10px] text-[rgba(235,235,236,0.45)] font-mono">
                  {preset.width} × {preset.height} pt
                </div>
              </div>
            </div>
            <Icons.Plus size={14} className="text-[rgba(235,235,236,0.4)] group-hover:text-[rgb(235,235,236)] transition-transform group-hover:scale-125" />
          </button>
        ))}
      </div>
    </div>
  );
};
