import React, { useEffect, useState, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const Minimap: React.FC = () => {
  const { frames, sections, viewport, setViewport, canvasSettings } = useProjectStore();
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevViewportRef = useRef(viewport);

  // Show minimap when viewport changes (zoom or pan), auto-hide after 1.5s idle
  useEffect(() => {
    const prev = prevViewportRef.current;
    const changed = prev.x !== viewport.x || prev.y !== viewport.y || prev.zoom !== viewport.zoom;
    prevViewportRef.current = viewport;

    if (!changed) return;

    setIsVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [viewport]);

  if (!canvasSettings.showMinimap || (frames.length === 0 && sections.length === 0)) return null;

  // Compute bounding box of all frames and sections
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  [...frames, ...sections].forEach(f => {
    minX = Math.min(minX, f.x);
    minY = Math.min(minY, f.y);
    maxX = Math.max(maxX, f.x + f.width);
    maxY = Math.max(maxY, f.y + f.height);
  });

  const pad = 240;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  // 20% smaller dimensions: 160px × 104px
  const mapWidth = 160;
  const mapHeight = 104;
  const scale = Math.min(mapWidth / worldWidth, mapHeight / worldHeight);

  // Viewport rect calculation in minimap coords
  const vpX = ((-viewport.x - minX) * scale);
  const vpY = ((-viewport.y - minY) * scale);
  const vpW = ((window.innerWidth / viewport.zoom) * scale);
  const vpH = ((window.innerHeight / viewport.zoom) * scale);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetWorldX = minX + clickX / scale;
    const targetWorldY = minY + clickY / scale;

    setViewport({
      x: -(targetWorldX - window.innerWidth / (2 * viewport.zoom)),
      y: -(targetWorldY - window.innerHeight / (2 * viewport.zoom))
    });
  };

  return (
    <div
      onClick={handleMinimapClick}
      className={`fixed bottom-16 right-4 w-[160px] h-[104px] bg-[rgb(20,20,19)]/95 backdrop-blur-md border border-[rgba(235,235,236,0.18)] rounded-xl overflow-hidden shadow-2xl z-30 cursor-pointer select-none transition-all duration-300 text-[rgb(235,235,236)] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="text-[9px] font-bold text-[rgba(235,235,236,0.5)] px-2 py-0.5 bg-[rgba(235,235,236,0.04)] border-b border-[rgba(235,235,236,0.1)] flex justify-between items-center">
        <span>RADAR</span>
        <span className="text-[rgb(235,235,236)] font-mono font-bold">{Math.round(viewport.zoom * 100)}%</span>
      </div>

      <div className="relative w-full h-[84px] bg-[rgb(20,20,19)]">
        {/* Render mini sections */}
        {sections.map(s => {
          const sx = (s.x - minX) * scale;
          const sy = (s.y - minY) * scale;
          const sw = s.width * scale;
          const sh = s.height * scale;
          return (
            <div
              key={s.id}
              style={{ left: sx, top: sy, width: sw, height: sh }}
              className="absolute bg-[rgba(235,235,236,0.02)] border border-[rgba(235,235,236,0.15)] border-dashed rounded-sm"
            />
          );
        })}

        {/* Render mini frames */}
        {frames.map(f => {
          const fx = (f.x - minX) * scale;
          const fy = (f.y - minY) * scale;
          const fw = f.width * scale;
          const fh = f.height * scale;

          return (
            <div
              key={f.id}
              style={{
                left: fx,
                top: fy,
                width: fw,
                height: fh
              }}
              className="absolute bg-[rgba(235,235,236,0.06)] border border-[rgba(235,235,236,0.3)] rounded-sm"
            />
          );
        })}

        {/* Viewport indicator box */}
        <div
          style={{
            left: Math.max(0, vpX),
            top: Math.max(0, vpY),
            width: Math.min(mapWidth, vpW),
            height: Math.min(mapHeight, vpH)
          }}
          className="absolute border border-[rgb(235,235,236)] bg-[rgba(235,235,236,0.15)] rounded-sm pointer-events-none transition-all duration-75"
        />
      </div>
    </div>
  );
};
