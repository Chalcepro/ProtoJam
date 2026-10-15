import React, { useEffect, useState, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';

export const Minimap: React.FC<{ containerRef?: React.RefObject<HTMLDivElement | null> }> = ({ containerRef }) => {
  const { frames, sections, viewport, setViewport, canvasSettings } = useProjectStore(useShallow((s) => ({ frames: s.frames, sections: s.sections, viewport: s.viewport, setViewport: s.setViewport, canvasSettings: s.canvasSettings })));
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

  // The canvas draws world points at screen = world * zoom + viewport, so the
  // part of the world on screen starts at -viewport / zoom.
  const rect = containerRef?.current?.getBoundingClientRect();
  const cw = rect?.width ?? window.innerWidth;
  const ch = rect?.height ?? window.innerHeight;
  const view = { x: -viewport.x / viewport.zoom, y: -viewport.y / viewport.zoom, w: cw / viewport.zoom, h: ch / viewport.zoom };

  // Bounds = every frame and section, padded, plus the view itself - so the
  // view box is always inside the map instead of pinned to an edge.
  let minX = view.x, minY = view.y, maxX = view.x + view.w, maxY = view.y + view.h;
  const pad = 240;
  [...frames, ...sections].forEach(f => {
    minX = Math.min(minX, f.x - pad);
    minY = Math.min(minY, f.y - pad);
    maxX = Math.max(maxX, f.x + f.width + pad);
    maxY = Math.max(maxY, f.y + f.height + pad);
  });

  // The drawing area under the 20px header is 160 x 84.
  const mapWidth = 160;
  const mapHeight = 84;
  const scale = Math.min(mapWidth / (maxX - minX), mapHeight / (maxY - minY));
  // Centre the world in the map rather than hugging the top-left corner.
  const offX = (mapWidth - (maxX - minX) * scale) / 2;
  const offY = (mapHeight - (maxY - minY) * scale) / 2;
  const toMap = (x: number, y: number) => ({ left: offX + (x - minX) * scale, top: offY + (y - minY) * scale });

  const vp = toMap(view.x, view.y);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const worldX = minX + (e.clientX - r.left - offX) / scale;
    const worldY = minY + (e.clientY - r.top - offY) / scale;
    // Put the clicked point in the middle of the canvas.
    setViewport({ x: cw / 2 - worldX * viewport.zoom, y: ch / 2 - worldY * viewport.zoom });
  };

  return (
    <div
      className={`absolute bottom-20 right-4 w-[160px] h-[104px] bg-[rgb(20,20,19)]/95 backdrop-blur-md border border-[rgba(235,235,236,0.18)] rounded-xl overflow-hidden shadow-2xl z-30 cursor-pointer select-none transition-all duration-300 text-[rgb(235,235,236)] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="text-[9px] font-bold text-[rgba(235,235,236,0.5)] px-2 py-0.5 bg-[rgba(235,235,236,0.04)] border-b border-[rgba(235,235,236,0.1)] flex justify-between items-center">
        <span>RADAR</span>
        <span className="text-[rgb(235,235,236)] font-mono font-bold">{Math.round(viewport.zoom * 100)}%</span>
      </div>

      <div onClick={handleMinimapClick} className="relative w-full h-[84px] bg-[rgb(20,20,19)]">
        {/* Render mini sections */}
        {sections.map(s => {
          return (
            <div
              key={s.id}
              style={{ ...toMap(s.x, s.y), width: s.width * scale, height: s.height * scale }}
              className="absolute bg-[rgba(235,235,236,0.02)] border border-[rgba(235,235,236,0.15)] border-dashed rounded-sm"
            />
          );
        })}

        {/* Render mini frames */}
        {frames.map(f => {
          return (
            <div
              key={f.id}
              style={{ ...toMap(f.x, f.y), width: f.width * scale, height: f.height * scale }}
              className="absolute bg-[rgba(235,235,236,0.06)] border border-[rgba(235,235,236,0.3)] rounded-sm"
            />
          );
        })}

        {/* Viewport indicator box */}
        <div
          style={{ ...vp, width: view.w * scale, height: view.h * scale }}
          className="absolute border border-[rgb(235,235,236)] bg-[rgba(235,235,236,0.15)] rounded-sm pointer-events-none transition-all duration-75"
        />
      </div>
    </div>
  );
};
