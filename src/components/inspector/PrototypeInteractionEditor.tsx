import React from 'react';
import { UIElement } from '../../types/components';
import { PrototypeInteraction, InteractionTrigger, InteractionActionType, TransitionType } from '../../types/prototype';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

interface PrototypeInteractionEditorProps {
  element: UIElement;
}

export const PrototypeInteractionEditor: React.FC<PrototypeInteractionEditorProps> = ({ element }) => {
  const { frames, addInteraction, removeInteraction, startWiring, startPlaying } = useProjectStore();

  const handleAddNewInteraction = () => {
    const defaultTarget = frames.find(f => f.id !== element.parentId)?.id || frames[0]?.id;
    const newInteraction: PrototypeInteraction = {
      id: `interaction-${Date.now()}`,
      trigger: 'onClick',
      action: 'navigate',
      targetFrameId: defaultTarget,
      transition: 'slideLeft',
      durationMs: 300,
      easing: 'spring'
    };
    addInteraction(element.id, newInteraction);
  };

  const handleUpdateInteraction = (interactionId: string, updates: Partial<PrototypeInteraction>) => {
    const existing = element.interactions.find(i => i.id === interactionId);
    if (!existing) return;
    removeInteraction(element.id, interactionId);
    addInteraction(element.id, { ...existing, ...updates });
  };

  return (
    <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] select-none">
      
      {/* Header & Add Flow Button */}
      <div className="flex items-center justify-between pb-2 border-b border-[rgba(235,235,236,0.08)]">
        <div>
          <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider block">
            Interaction Flows
          </span>
          <span className="text-[10px] text-[rgba(235,235,236,0.5)]">
            {element.interactions.length} link{element.interactions.length === 1 ? '' : 's'} configured
          </span>
        </div>
        <button
          onClick={handleAddNewInteraction}
          className="flex items-center gap-1 text-[11px] bg-[rgb(235,235,236)] text-[rgb(20,20,19)] px-2.5 py-1 rounded-lg font-bold transition-all hover:brightness-110 active:scale-95 shadow-sm"
        >
          <Icons.Plus size={12} />
          <span>Add Link</span>
        </button>
      </div>

      {/* Canvas Wire Handle helper */}
      <div className="p-2.5 rounded-xl bg-[rgba(235,235,236,0.02)] border border-[rgba(235,235,236,0.08)] flex items-center justify-between">
        <div className="text-[11px] text-[rgba(235,235,236,0.6)]">
          Drag the <span className="text-[rgb(235,235,236)] font-bold">connector handle</span> on canvas.
        </div>
        <button
          onClick={() => startWiring(element.id, element.parentId)}
          className="p-1.5 bg-[rgba(235,235,236,0.08)] hover:bg-[rgb(235,235,236)] text-[rgb(235,235,236)] hover:text-[rgb(20,20,19)] rounded-lg transition-colors"
          title="Start interactive wiring"
        >
          <Icons.GitFork size={13} />
        </button>
      </div>

      {/* Interactions List */}
      {element.interactions.length === 0 ? (
        <div className="text-center text-[rgba(235,235,236,0.4)] py-6 space-y-1.5">
          <Icons.Zap size={22} className="mx-auto opacity-30 text-[rgb(235,235,236)]" />
          <p className="font-medium text-xs text-[rgba(235,235,236,0.7)]">No interactions on this element</p>
          <p className="text-[10px] text-[rgba(235,235,236,0.4)]">Click '+ Add Link' to connect this component to another frame.</p>
        </div>
      ) : (
        element.interactions.map((interaction, idx) => (
          <div key={interaction.id} className="p-3 rounded-xl bg-[rgba(235,235,236,0.02)] border border-[rgba(235,235,236,0.08)] space-y-3">
            
            {/* Flow Header */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-[rgb(235,235,236)] text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(235,235,236)]" />
                <span>Interaction #{idx + 1}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startPlaying(interaction.targetFrameId || element.parentId)}
                  className="p-1 text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)] rounded"
                  title="Test in Player"
                >
                  <Icons.Play size={11} fill="currentColor" />
                </button>
                <button
                  onClick={() => removeInteraction(element.id, interaction.id)}
                  className="p-1 text-[rgba(235,235,236,0.4)] hover:text-rose-400 rounded"
                  title="Remove interaction"
                >
                  <Icons.Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Trigger Selection */}
            <div>
              <label className="text-[10px] font-medium text-[rgba(235,235,236,0.5)] block mb-1">Trigger Event</label>
              <select
                value={interaction.trigger}
                onChange={(e) => handleUpdateInteraction(interaction.id, { trigger: e.target.value as InteractionTrigger })}
                className="w-full bg-[rgb(20,20,19)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.12)] outline-none text-xs"
              >
                <option value="onClick">On Click / Tap</option>
                <option value="onHover">While Hovering (Mouse Enter)</option>
                <option value="onDrag">On Drag / Swipe</option>
                <option value="afterDelay">After Delay (Timer)</option>
                <option value="keyDown">Key / Gamepad Button</option>
              </select>
            </div>

            {/* Delay (if afterDelay) */}
            {interaction.trigger === 'afterDelay' && (
              <div className="flex items-center justify-between bg-[rgba(235,235,236,0.04)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)]">
                <span className="text-[10px] text-[rgba(235,235,236,0.5)]">Delay Timeout</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={interaction.delayMs || 1000}
                    onChange={(e) => handleUpdateInteraction(interaction.id, { delayMs: Number(e.target.value) })}
                    className="w-16 bg-transparent text-[rgb(235,235,236)] outline-none text-right font-mono text-xs"
                  />
                  <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono">ms</span>
                </div>
              </div>
            )}

            {/* Action Type */}
            <div>
              <label className="text-[10px] font-medium text-[rgba(235,235,236,0.5)] block mb-1">Action Type</label>
              <select
                value={interaction.action}
                onChange={(e) => handleUpdateInteraction(interaction.id, { action: e.target.value as InteractionActionType })}
                className="w-full bg-[rgb(20,20,19)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.12)] outline-none text-xs"
              >
                <option value="navigate">Navigate to Screen</option>
                <option value="openOverlay">Open Modal / Overlay</option>
                <option value="closeOverlay">Close Current Overlay</option>
                <option value="back">Go Back / Previous Screen</option>
                <option value="scroll">Scroll to Position</option>
                <option value="url">Open External URL</option>
              </select>
            </div>

            {/* Destination Screen */}
            {interaction.action !== 'back' && interaction.action !== 'closeOverlay' && (
              <div>
                <label className="text-[10px] font-medium text-[rgba(235,235,236,0.5)] block mb-1">Destination Target</label>
                <select
                  value={interaction.targetFrameId || ''}
                  onChange={(e) => handleUpdateInteraction(interaction.id, { targetFrameId: e.target.value })}
                  className="w-full bg-[rgb(20,20,19)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.12)] outline-none text-xs"
                >
                  {frames.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.width}×{f.height})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Animation & Easing */}
            <div>
              <label className="text-[10px] font-medium text-[rgba(235,235,236,0.5)] block mb-1">Animation & Easing</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={interaction.transition}
                  onChange={(e) => handleUpdateInteraction(interaction.id, { transition: e.target.value as TransitionType })}
                  className="w-full bg-[rgb(20,20,19)] text-[rgb(235,235,236)] px-2 py-1.5 rounded-lg border border-[rgba(235,235,236,0.12)] outline-none text-xs"
                >
                  <option value="instant">Instant</option>
                  <option value="dissolve">Dissolve</option>
                  <option value="slideLeft">Slide Left ➔</option>
                  <option value="slideRight">Slide Right ⬅</option>
                  <option value="slideUp">Slide Up ⬆</option>
                  <option value="slideDown">Slide Down ⬇</option>
                  <option value="push">Push Screen</option>
                  <option value="smartAnimate">Smart Animate</option>
                </select>

                <div className="flex items-center bg-[rgba(235,235,236,0.04)] px-2 py-1 rounded-lg border border-[rgba(235,235,236,0.12)]">
                  <input
                    type="number"
                    value={interaction.durationMs || 300}
                    onChange={(e) => handleUpdateInteraction(interaction.id, { durationMs: Number(e.target.value) })}
                    className="bg-transparent text-[rgb(235,235,236)] outline-none w-full text-xs font-mono"
                  />
                  <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono ml-1">ms</span>
                </div>
              </div>
            </div>

          </div>
        ))
      )}
    </div>
  );
};
