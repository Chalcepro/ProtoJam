import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

export const VariablesPanel: React.FC = () => {
  const { variables, addVariable, updateVariable, deleteVariable } = useProjectStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const colorVars = variables.filter(v => v.type === 'color');
  const numberVars = variables.filter(v => v.type === 'number');

  const handleAddColor = () => {
    const id = addVariable(`color-${colorVars.length + 1}`, 'color', '#ff6b4a');
    setRenamingId(id);
  };

  const handleAddNumber = () => {
    const id = addVariable(`number-${numberVars.length + 1}`, 'number', 8);
    setRenamingId(id);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs text-[rgb(235,235,236)] select-none">
      <div className="p-2 border-b border-[rgba(235,235,236,0.06)] space-y-1.5 bg-[rgba(235,235,236,0.01)]">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold text-[rgba(235,235,236,0.45)] uppercase tracking-wider">
            Design Variables
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAddColor}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] text-[11px] font-semibold transition-colors"
          >
            <Icons.Plus size={11} /> Color
          </button>
          <button
            onClick={handleAddNumber}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] text-[11px] font-semibold transition-colors"
          >
            <Icons.Plus size={11} /> Number
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {variables.length === 0 && (
          <div className="text-center text-[rgba(235,235,236,0.4)] py-8">
            <Icons.Variable size={24} className="mx-auto mb-2 opacity-30 text-[rgb(235,235,236)]" />
            <p>No variables yet</p>
            <p className="text-[10px] mt-1 text-[rgba(235,235,236,0.3)]">
              Create a color or number token, then bind it to any fill or text color.
            </p>
          </div>
        )}

        {colorVars.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-[rgba(235,235,236,0.35)] uppercase tracking-wider mb-1 px-1">
              Colors
            </div>
            <div className="space-y-0.5">
              {colorVars.map(v => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgba(235,235,236,0.05)] group"
                >
                  <input
                    type="color"
                    value={v.value as string}
                    onChange={(e) => updateVariable(v.id, { value: e.target.value })}
                    className="w-6 h-6 rounded border-none cursor-pointer bg-transparent shrink-0"
                  />
                  {renamingId === v.id ? (
                    <input
                      autoFocus
                      value={v.name}
                      onChange={(e) => updateVariable(v.id, { name: e.target.value })}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setRenamingId(null)}
                      className="bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)] px-1.5 py-0.5 rounded outline-none text-xs flex-1 min-w-0"
                    />
                  ) : (
                    <span
                      onClick={() => setRenamingId(v.id)}
                      className="truncate flex-1 min-w-0 cursor-text text-xs"
                      title="Click to rename"
                    >
                      {v.name}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[rgba(235,235,236,0.4)] shrink-0">
                    {(v.value as string).toUpperCase()}
                  </span>
                  <button
                    onClick={() => deleteVariable(v.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[rgba(235,235,236,0.4)] hover:text-rose-400 shrink-0"
                    title="Delete variable"
                  >
                    <Icons.Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {numberVars.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-[rgba(235,235,236,0.35)] uppercase tracking-wider mb-1 px-1">
              Numbers
            </div>
            <div className="space-y-0.5">
              {numberVars.map(v => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgba(235,235,236,0.05)] group"
                >
                  <div className="w-6 h-6 rounded bg-[rgba(235,235,236,0.06)] flex items-center justify-center shrink-0 text-[rgba(235,235,236,0.5)]">
                    <Icons.Hash size={12} />
                  </div>
                  {renamingId === v.id ? (
                    <input
                      autoFocus
                      value={v.name}
                      onChange={(e) => updateVariable(v.id, { name: e.target.value })}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setRenamingId(null)}
                      className="bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)] px-1.5 py-0.5 rounded outline-none text-xs flex-1 min-w-0"
                    />
                  ) : (
                    <span
                      onClick={() => setRenamingId(v.id)}
                      className="truncate flex-1 min-w-0 cursor-text text-xs"
                      title="Click to rename"
                    >
                      {v.name}
                    </span>
                  )}
                  <input
                    type="number"
                    value={v.value as number}
                    onChange={(e) => updateVariable(v.id, { value: Number(e.target.value) })}
                    className="w-14 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-1.5 py-0.5 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-[11px] shrink-0"
                  />
                  <button
                    onClick={() => deleteVariable(v.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[rgba(235,235,236,0.4)] hover:text-rose-400 shrink-0"
                    title="Delete variable"
                  >
                    <Icons.Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
