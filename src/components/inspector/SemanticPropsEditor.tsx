import React from 'react';
import { UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';

interface SemanticPropsEditorProps {
  element: UIElement;
}

export const SemanticPropsEditor: React.FC<SemanticPropsEditorProps> = ({ element }) => {
  const { updateElementSemanticProps } = useProjectStore();
  const { semanticProps, type } = element;

  return (
    <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)]">
      <div className="flex items-center justify-between pb-2 border-b border-[rgba(235,235,236,0.1)]">
        <span className="text-[11px] font-semibold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">
          Semantic Properties
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[rgba(235,235,236,0.1)] text-[rgb(235,235,236)] font-mono font-semibold">
          {type}
        </span>
      </div>

      {/* Label / Text Content */}
      <div>
        <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] block mb-1.5">
          Label / Title
        </label>
        <textarea
          rows={2}
          value={semanticProps.label || ''}
          onChange={(e) => updateElementSemanticProps(element.id, { label: e.target.value })}
          placeholder="Component label..."
          className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] p-2 rounded-lg border border-[rgba(235,235,236,0.1)] outline-none text-xs resize-none focus:border-[rgba(235,235,236,0.3)]"
        />
      </div>

      {/* Placeholder (if applicable) */}
      {('placeholder' in semanticProps || type === 'textInput' || type === 'passwordInput' || type === 'searchBar' || type === 'card') && (
        <div>
          <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] block mb-1.5">
            Placeholder / Subtitle
          </label>
          <input
            type="text"
            value={semanticProps.placeholder || ''}
            onChange={(e) => updateElementSemanticProps(element.id, { placeholder: e.target.value })}
            placeholder="Placeholder text..."
            className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.1)] outline-none text-xs focus:border-[rgba(235,235,236,0.3)]"
          />
        </div>
      )}

      {/* Value (if applicable) */}
      {('value' in semanticProps || type === 'metricCard' || type === 'slider') && (
        <div>
          <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] block mb-1.5">
            Metric / Input Value
          </label>
          <input
            type="text"
            value={semanticProps.value?.toString() || ''}
            onChange={(e) => updateElementSemanticProps(element.id, { value: e.target.value })}
            className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.1)] outline-none text-xs focus:border-[rgba(235,235,236,0.3)]"
          />
        </div>
      )}

      {/* Icon Selector */}
      {('iconName' in semanticProps || type === 'button' || type === 'navbar' || type === 'badge') && (
        <div>
          <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] block mb-1.5">
            Icon
          </label>
          <select
            value={semanticProps.iconName || 'None'}
            onChange={(e) => updateElementSemanticProps(element.id, { iconName: e.target.value === 'None' ? undefined : e.target.value })}
            className="w-full bg-[rgb(20,20,19)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.1)] outline-none text-xs cursor-pointer focus:border-[rgba(235,235,236,0.3)]"
          >
            <option value="None">None</option>
            <option value="ArrowRight">Arrow Right</option>
            <option value="ArrowLeft">Arrow Left</option>
            <option value="Check">Checkmark</option>
            <option value="ShieldCheck">Shield Check</option>
            <option value="Send">Send</option>
            <option value="Plus">Plus</option>
            <option value="Search">Search</option>
            <option value="Home">Home</option>
            <option value="CreditCard">Credit Card</option>
            <option value="TrendingUp">Trending Up</option>
            <option value="Bell">Bell</option>
            <option value="User">User</option>
            <option value="Laptop">Laptop</option>
          </select>
        </div>
      )}

      {/* FigJam Sticky Tone */}
      {type === 'stickyNote' && (
        <div>
          <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] block mb-1.5">
            Sticky Note Shade
          </label>
          <div className="flex items-center gap-2">
            {[
              { color: 'rgb(235, 235, 236)', name: 'White', text: 'rgb(20, 20, 19)' },
              { color: 'rgba(235, 235, 236, 0.8)', name: 'Light Grey', text: 'rgb(20, 20, 19)' },
              { color: 'rgba(235, 235, 236, 0.2)', name: 'Dark Grey', text: 'rgb(235, 235, 236)' },
              { color: 'rgb(40, 40, 39)', name: 'Charcoal', text: 'rgb(235, 235, 236)' }
            ].map(c => (
              <button
                key={c.name}
                onClick={() => updateElementSemanticProps(element.id, { stickyColor: c.name.toLowerCase() as any })}
                style={{ backgroundColor: c.color }}
                className="w-6 h-6 rounded-md shadow-sm border border-[rgba(235,235,236,0.2)] hover:scale-110 transition-transform"
                title={c.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
