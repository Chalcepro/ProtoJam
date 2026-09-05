import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { SemanticElementRenderer } from '../canvas/SemanticElementRenderer';
import { UIElement } from '../../types/components';
import confetti from 'canvas-confetti';
import * as Icons from 'lucide-react';

export const PrototypePlayerModal: React.FC = () => {
  const {
    isPlaying,
    stopPlaying,
    frames,
    elements,
    currentPlayingFrameId,
    navigateInPlayer,
    navigateBackInPlayer,
    prototypeNavigationHistory
  } = useProjectStore();

  const [showHintFlash, setShowHintFlash] = useState(false);
  const [activeTransition, setActiveTransition] = useState<string>('none');
  const [deviceSkin, setDeviceSkin] = useState<'iphone' | 'macbook' | 'none'>('iphone');
  const [fitMode, setFitMode] = useState<'fit' | 'actual'>('fit');
  const [isHeaderMinimized, setIsHeaderMinimized] = useState(false);
  const [showFooterHint, setShowFooterHint] = useState(true);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [pressedElementId, setPressedElementId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1);

  const currentFrame = frames.find(f => f.id === currentPlayingFrameId) || frames[0];
  const frameElements = currentFrame 
    ? elements.filter(el => currentFrame.elementIds.includes(el.id) || el.parentId === currentFrame.id)
    : [];

  // Auto-fade the bottom hint after 3.5 seconds
  useEffect(() => {
    if (isPlaying) {
      setShowFooterHint(true);
      const timer = setTimeout(() => {
        setShowFooterHint(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isPlaying]);

  // Compute responsive auto-fit scale to guarantee the full device fits inside the window
  useEffect(() => {
    if (!isPlaying || !currentFrame) return;

    const computeScale = () => {
      const availWidth = window.innerWidth - 60;
      const availHeight = window.innerHeight - (isHeaderMinimized ? 60 : 130);

      // Include phone mockup outer chassis padding
      const frameW = currentFrame.width + (deviceSkin === 'iphone' ? 30 : 10);
      const frameH = currentFrame.height + (deviceSkin === 'iphone' ? 30 : 10);

      const scaleX = availWidth / frameW;
      const scaleY = availHeight / frameH;
      const bestScale = Math.min(scaleX, scaleY, 1.0); // max 100% or scale down to fit

      setAutoScale(fitMode === 'fit' ? bestScale : 1.0);
    };

    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, [isPlaying, currentFrame, deviceSkin, fitMode, isHeaderMinimized]);

  // Trigger confetti if visiting a success frame
  useEffect(() => {
    if (isPlaying && currentFrame && (currentFrame.name.toLowerCase().includes('success') || currentFrame.name.toLowerCase().includes('confirmed'))) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  }, [currentPlayingFrameId, isPlaying, currentFrame]);

  if (!isPlaying || !currentFrame) return null;

  const handleTriggerInteraction = (element: UIElement, trigger: string) => {
    const interaction = element.interactions.find(i => i.trigger === trigger);
    if (!interaction) return;

    if (interaction.action === 'back') {
      setActiveTransition('slideRight');
      setTimeout(() => {
        navigateBackInPlayer();
        setActiveTransition('none');
      }, interaction.durationMs || 250);
      return;
    }

    if (interaction.action === 'navigate' && interaction.targetFrameId) {
      setActiveTransition(interaction.transition || 'slideLeft');
      setTimeout(() => {
        navigateInPlayer(interaction.targetFrameId!);
        setActiveTransition('none');
      }, interaction.durationMs || 300);
    }
  };

  // Flash hints on clicking empty space
  const handleBackdropClick = () => {
    setShowHintFlash(true);
    setTimeout(() => setShowHintFlash(false), 500);
  };

  const getTransitionStyle = (): string => {
    switch (activeTransition) {
      case 'slideLeft':
        return 'translate-x-full opacity-0';
      case 'slideRight':
        return '-translate-x-full opacity-0';
      case 'slideUp':
        return 'translate-y-full opacity-0';
      case 'dissolve':
        return 'opacity-0';
      default:
        return 'translate-x-0 opacity-100';
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[rgb(20,20,19)]/96 backdrop-blur-2xl flex flex-col items-center justify-between p-3 select-none animate-in fade-in duration-200 overflow-hidden text-[rgb(235,235,236)]"
    >
      {/* Top Player Control Bar (Minimizable) */}
      {isHeaderMinimized ? (
        <button
          onClick={() => setIsHeaderMinimized(false)}
          className="fixed top-3 right-4 px-3 py-1.5 rounded-full bg-[rgb(20,20,19)]/90 border border-[rgba(235,235,236,0.15)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)] shadow-2xl flex items-center gap-1.5 text-xs z-50 glass-panel"
        >
          <Icons.Settings2 size={13} />
          <span>Show Controls</span>
        </button>
      ) : (
        <header className="w-full max-w-4xl flex items-center justify-between px-4 py-2 bg-[rgb(20,20,19)]/90 border border-[rgba(235,235,236,0.15)] rounded-2xl shadow-2xl z-50 glass-panel">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgb(235,235,236)] text-[rgb(20,20,19)] text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[rgb(20,20,19)] animate-ping" />
              <span>LIVE PROTOTYPE</span>
            </div>

            {/* Screen Switcher */}
            <select
              value={currentFrame.id}
              onChange={(e) => navigateInPlayer(e.target.value)}
              className="bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)] px-3 py-1 rounded-lg text-xs font-medium border border-[rgba(235,235,236,0.15)] outline-none cursor-pointer"
            >
              {frames.map(f => (
                <option key={f.id} value={f.id} className="bg-[rgb(20,20,19)]">
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Playback Controls & Fit Modes */}
          <div className="flex items-center gap-2 text-xs">
            {/* Auto Fit toggle */}
            <button
              onClick={() => setFitMode(fitMode === 'fit' ? 'actual' : 'fit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                fitMode === 'fit' 
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' 
                  : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.7)]'
              }`}
              title="Toggle Auto-Fit to Window"
            >
              <Icons.Scaling size={13} />
              <span>{fitMode === 'fit' ? `Fit (${Math.round(autoScale * 100)}%)` : '100%'}</span>
            </button>

            <button
              onClick={() => navigateBackInPlayer()}
              disabled={prototypeNavigationHistory.length <= 1}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] disabled:opacity-30 text-[rgb(235,235,236)] transition-colors"
              title="Go Back"
            >
              <Icons.ChevronLeft size={15} />
              <span>Back</span>
            </button>

            <button
              onClick={() => navigateInPlayer(frames[0]?.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] transition-colors"
              title="Restart Flow"
            >
              <Icons.RotateCcw size={13} />
              <span>Restart</span>
            </button>

            <div className="h-4 w-px bg-[rgba(235,235,236,0.15)] mx-0.5" />

            {/* Device Skin Toggle */}
            <button
              onClick={() => setDeviceSkin(deviceSkin === 'iphone' ? 'none' : 'iphone')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                deviceSkin === 'iphone' 
                  ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] font-bold' 
                  : 'bg-[rgba(235,235,236,0.05)] text-[rgba(235,235,236,0.5)]'
              }`}
            >
              📱 Mockup Frame
            </button>

            {/* Minimize Controls */}
            <button
              onClick={() => setIsHeaderMinimized(true)}
              className="p-1 rounded-lg hover:bg-[rgba(235,235,236,0.1)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]"
              title="Minimize Controls"
            >
              <Icons.ChevronUp size={16} />
            </button>

            {/* Close Player */}
            <button
              onClick={stopPlaying}
              className="p-1.5 rounded-lg bg-[rgba(235,235,236,0.08)] hover:bg-[rgb(235,235,236)] text-[rgb(235,235,236)] hover:text-[rgb(20,20,19)] transition-colors ml-1"
              title="Close Preview (Esc)"
            >
              <Icons.X size={16} />
            </button>
          </div>
        </header>
      )}

      {/* Main Interactive Screen Arena with Dynamic Auto-Fit Scaling */}
      <main
        onClick={handleBackdropClick}
        className="flex-1 w-full flex items-center justify-center relative overflow-hidden my-auto"
      >
        <div
          style={{
            transform: `scale(${autoScale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out'
          }}
        >
          {/* Device Frame Chassis (iPhone 16 Pro Style) */}
          <div
            style={{
              width: currentFrame.width,
              height: currentFrame.height
            }}
            className={`relative transition-all duration-300 ${
              deviceSkin === 'iphone'
                ? 'rounded-[50px] shadow-device ring-1 ring-[rgba(235,235,236,0.2)]'
                : 'rounded-2xl shadow-2xl border border-[rgba(235,235,236,0.15)]'
            }`}
          >
            {/* Dynamic Island on Phone */}
            {deviceSkin === 'iphone' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-[rgb(20,20,19)] rounded-full z-40 flex items-center justify-between px-3 border border-[rgba(235,235,236,0.15)] pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.1)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.05)] flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[rgb(235,235,236)] animate-pulse" />
                </div>
              </div>
            )}

            {/* Active Screen Surface */}
            <div
              style={{
                backgroundColor: currentFrame.backgroundColor || '#141413',
                width: '100%',
                height: '100%',
                borderRadius: deviceSkin === 'iphone' ? '46px' : '16px'
              }}
              className={`relative overflow-hidden transition-all duration-300 ${getTransitionStyle()}`}
            >
              {/* Render Interactive Elements */}
              {frameElements.map(element => {
                const hasInteractions = element.interactions.length > 0;
                return (
                  <div
                    key={element.id}
                    style={{
                      position: 'absolute',
                      left: Number(element.style.x),
                      top: Number(element.style.y),
                      width: Number(element.style.width),
                      height: Number(element.style.height),
                      zIndex: element.style.zIndex || 10
                    }}
                    className={`transition-transform ${hasInteractions ? 'cursor-pointer' : ''}`}
                    onMouseEnter={() => setHoveredElementId(element.id)}
                    onMouseLeave={() => {
                      setHoveredElementId(prev => prev === element.id ? null : prev);
                      setPressedElementId(prev => prev === element.id ? null : prev);
                    }}
                    onMouseDown={() => setPressedElementId(element.id)}
                    onMouseUp={() => setPressedElementId(prev => prev === element.id ? null : prev)}
                  >
                    <SemanticElementRenderer
                      element={element}
                      isInteractive={true}
                      isHovering={hoveredElementId === element.id}
                      isPressed={pressedElementId === element.id}
                      onTriggerInteraction={handleTriggerInteraction}
                    />

                    {/* Hotspot Click Hint Flash Indicator */}
                    {showHintFlash && hasInteractions && (
                      <div className="absolute inset-0 rounded-lg pointer-events-none hint-flash" />
                    )}
                  </div>
                );
              })}

              {/* Bottom Home Indicator */}
              {deviceSkin === 'iphone' && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-[rgba(235,235,236,0.3)] rounded-full z-40 pointer-events-none" />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Auto-fading Footer Hint — no close button, just fades out */}
      {showFooterHint && (
        <footer className="text-[rgba(235,235,236,0.5)] text-[11px] flex items-center gap-2.5 bg-[rgb(20,20,19)]/90 px-3.5 py-1.5 rounded-full border border-[rgba(235,235,236,0.1)] shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span>Click interactive elements to navigate</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[rgba(235,235,236,0.3)]" />
          <span>Press <kbd className="px-1 py-0.5 rounded bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)] font-mono text-[9px]">Esc</kbd> to exit</span>
        </footer>
      )}
    </div>
  );
};
