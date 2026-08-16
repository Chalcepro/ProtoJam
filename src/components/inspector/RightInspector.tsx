import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { DesignProperties } from './DesignProperties';
import { SemanticPropsEditor } from './SemanticPropsEditor';
import { PrototypeInteractionEditor } from './PrototypeInteractionEditor';
import * as Icons from 'lucide-react';

export const RightInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'design' | 'semantic' | 'prototype'>('design');
  const { elements, frames, selectedElementIds, selectedFrameIds } = useProjectStore();

  const selectedElement = elements.find(el => selectedElementIds.includes(el.id));
  const selectedFrame = frames.find(f => selectedFrameIds.includes(f.id));

  return (
    <aside className="w-80 bg-[rgb(20,20,19)] border-l border-[rgba(235,235,236,0.1)] flex flex-col h-full select-none z-20 shrink-0 text-[rgb(235,235,236)]">
      {/* Inspector Tabs */}
      <div className="flex items-center border-b border-[rgba(235,235,236,0.1)] bg-[rgba(235,235,236,0.02)] px-1">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'design'
              ? 'border-[rgb(235,235,236)] text-[rgb(235,235,236)] font-bold'
              : 'border-transparent text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]'
          }`}
        >
          <Icons.Paintbrush size={14} />
          <span>Design</span>
        </button>

        <button
          onClick={() => setActiveTab('semantic')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'semantic'
              ? 'border-[rgb(235,235,236)] text-[rgb(235,235,236)] font-bold'
              : 'border-transparent text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]'
          }`}
        >
          <Icons.Code2 size={14} />
          <span>Props</span>
        </button>

        <button
          onClick={() => setActiveTab('prototype')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'prototype'
              ? 'border-[rgb(235,235,236)] text-[rgb(235,235,236)] font-bold'
              : 'border-transparent text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]'
          }`}
        >
          <Icons.Zap size={14} />
          <span>Prototype</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'design' && (
          <DesignProperties element={selectedElement} frame={selectedFrame} />
        )}
        {activeTab === 'semantic' && (
          selectedElement ? (
            <SemanticPropsEditor element={selectedElement} />
          ) : (
            <div className="p-6 text-center text-[rgba(235,235,236,0.4)] text-xs">
              <Icons.Code2 size={20} className="mx-auto mb-2 opacity-30 text-[rgb(235,235,236)]" />
              <p>Select a UI element to customize its props, labels, and states.</p>
            </div>
          )
        )}
        {activeTab === 'prototype' && (
          selectedElement ? (
            <PrototypeInteractionEditor element={selectedElement} />
          ) : (
            <div className="p-6 text-center text-[rgba(235,235,236,0.4)] text-xs">
              <Icons.Zap size={20} className="mx-auto mb-2 opacity-30 text-[rgb(235,235,236)]" />
              <p>Select an interactive UI element to configure its prototype link.</p>
            </div>
          )
        )}
      </div>
    </aside>
  );
};
