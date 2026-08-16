import React, { useState } from 'react';
import { LayersPanel } from './LayersPanel';
import { FramePresetsPanel } from './FramePresetsPanel';
import { ComponentLibraryPanel } from './ComponentLibraryPanel';
import * as Icons from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'layers' | 'frames' | 'components'>('layers');

  const tabs = [
    { id: 'layers' as const, label: 'Layers', icon: Icons.Layers },
    { id: 'frames' as const, label: 'Screens', icon: Icons.Smartphone },
    { id: 'components' as const, label: 'UI Kit', icon: Icons.LayoutGrid },
  ];

  return (
    <aside className="w-72 bg-[rgb(20,20,19)] border-r border-[rgba(235,235,236,0.08)] flex flex-col h-full select-none z-20 shrink-0 text-[rgb(235,235,236)] relative">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.015)] px-1">
        {tabs.map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium border-b-2 transition-all duration-150 ${
                isActive
                  ? 'border-[rgb(235,235,236)] text-[rgb(235,235,236)] font-bold'
                  : 'border-transparent text-[rgba(235,235,236,0.35)] hover:text-[rgba(235,235,236,0.7)]'
              }`}
            >
              <IconComp size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'layers' && <LayersPanel />}
        {activeTab === 'frames' && <FramePresetsPanel />}
        {activeTab === 'components' && <ComponentLibraryPanel />}
      </div>
    </aside>
  );
};
