import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { COMPONENT_TEMPLATES } from '../../presets/uiComponentDefs';
import * as Icons from 'lucide-react';

export const ComponentLibraryPanel: React.FC = () => {
  const { addElement, frames, selectedFrameIds } = useProjectStore();
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Structure', 'Navigation', 'Forms & Inputs', 'Actions', 'Content & Media', 'FigJam Tools'];

  const filteredComponents = activeCategory === 'All'
    ? COMPONENT_TEMPLATES
    : COMPONENT_TEMPLATES.filter(c => c.category === activeCategory);

  const handleAddComponent = (template: typeof COMPONENT_TEMPLATES[0]) => {
    const targetFrameId = selectedFrameIds.length > 0 ? selectedFrameIds[0] : (frames[0]?.id || undefined);
    const targetFrame = frames.find(f => f.id === targetFrameId);
    
    const posX = targetFrame ? 20 : 200;
    const posY = targetFrame ? 100 : 200;

    addElement(template.type, posX, posY, targetFrameId);
  };

  const renderIcon = (name: string) => {
    const IconComp = (Icons as any)[name] || Icons.Box;
    return <IconComp size={16} className="text-[rgb(235,235,236)] shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 text-xs select-none text-[rgb(235,235,236)]">
      <div className="text-[11px] font-semibold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2 flex items-center justify-between">
        <span>UI Elements & Kit</span>
        <span className="text-[9px] text-[rgba(235,235,236,0.4)]">Drag or Click to add</span>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
              activeCategory === cat
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow-sm'
                : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of UI Component Templates */}
      <div className="grid grid-cols-1 gap-2">
        {filteredComponents.map((template, idx) => (
          <div
            key={`${template.type}-${template.title}-${idx}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/protojam-component', template.type);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => handleAddComponent(template)}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-[rgba(235,235,236,0.03)] hover:bg-[rgba(235,235,236,0.07)] border border-[rgba(235,235,236,0.1)] hover:border-[rgba(235,235,236,0.25)] transition-all text-left group cursor-grab active:cursor-grabbing"
          >
            <div className="p-2 rounded-md bg-[rgba(235,235,236,0.08)] group-hover:bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]">
              {renderIcon(template.iconName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[rgb(235,235,236)] text-xs truncate">
                {template.title}
              </div>
              <div className="text-[10px] text-[rgba(235,235,236,0.45)] truncate mt-0.5">
                {template.description}
              </div>
            </div>
            <Icons.GripVertical size={14} className="text-[rgba(235,235,236,0.35)] group-hover:text-[rgb(235,235,236)] shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
};
