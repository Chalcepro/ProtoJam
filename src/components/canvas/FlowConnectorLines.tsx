import React from 'react';
import { DeviceFrame, UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';

interface FlowConnectorLinesProps {
  frames: DeviceFrame[];
  elements: UIElement[];
}

export const FlowConnectorLines: React.FC<FlowConnectorLinesProps> = ({ frames, elements }) => {
  const { isWiring, wireSourceElementId, wireMousePos, selectedElementIds } = useProjectStore();

  // Helper to find frame and element absolute canvas bounding box
  const getElementCanvasRect = (element: UIElement) => {
    const parentFrame = frames.find(f => f.id === element.parentId);
    const frameX = parentFrame ? parentFrame.x : 0;
    const frameY = parentFrame ? parentFrame.y : 0;

    const elX = frameX + Number(element.style.x);
    const elY = frameY + Number(element.style.y);
    const elW = Number(element.style.width);
    const elH = Number(element.style.height);

    return {
      x: elX,
      y: elY,
      width: elW,
      height: elH,
      centerX: elX + elW / 2,
      centerY: elY + elH / 2,
      right: elX + elW,
      bottom: elY + elH
    };
  };

  const getFrameCanvasRect = (frame: DeviceFrame) => {
    return {
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      centerX: frame.x + frame.width / 2,
      centerY: frame.y + frame.height / 2,
      left: frame.x,
      top: frame.y
    };
  };

  // Collect all active prototype interactions to render
  const wiresToRender: Array<{
    id: string;
    sourceRect: ReturnType<typeof getElementCanvasRect>;
    targetRect: ReturnType<typeof getFrameCanvasRect>;
    label?: string;
    isSelected: boolean;
  }> = [];

  elements.forEach(element => {
    element.interactions.forEach(interaction => {
      if (interaction.targetFrameId) {
        const targetFrame = frames.find(f => f.id === interaction.targetFrameId);
        if (targetFrame) {
          const sourceRect = getElementCanvasRect(element);
          const targetRect = getFrameCanvasRect(targetFrame);
          wiresToRender.push({
            id: interaction.id,
            sourceRect,
            targetRect,
            label: `${interaction.trigger.replace('on', '')} → ${interaction.transition}`,
            isSelected: selectedElementIds.includes(element.id)
          });
        }
      }
    });
  });

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 8 3.5, 0 7" fill="rgb(235, 235, 236)" />
        </marker>
        <marker
          id="arrowhead-active"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 8 3.5, 0 7" fill="rgb(235, 235, 236)" />
        </marker>
        <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgb(235, 235, 236)" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Render established prototype wires */}
      {wiresToRender.map(wire => {
        const startX = wire.sourceRect.right;
        const startY = wire.sourceRect.centerY;
        const endX = wire.targetRect.left;
        const endY = wire.targetRect.top + 50;

        const deltaX = Math.abs(endX - startX);
        const control1X = startX + Math.max(deltaX * 0.5, 60);
        const control1Y = startY;
        const control2X = endX - Math.max(deltaX * 0.5, 60);
        const control2Y = endY;

        const pathD = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2 - 12;

        return (
          <g key={wire.id} className="transition-opacity">
            {/* Background halo */}
            <path
              d={pathD}
              fill="none"
              stroke="rgba(235, 235, 236, 0.15)"
              strokeWidth="5"
            />
            {/* Main wire */}
            <path
              d={pathD}
              fill="none"
              stroke="rgb(235, 235, 236)"
              strokeWidth={wire.isSelected ? "2.5" : "1.5"}
              strokeDasharray={wire.isSelected ? "none" : "5 3"}
              markerEnd="url(#arrowhead)"
              filter="url(#wire-glow)"
              opacity={wire.isSelected ? 1 : 0.75}
            />

            {/* Wire origin handle dot */}
            <circle
              cx={startX}
              cy={startY}
              r={wire.isSelected ? "5" : "3.5"}
              fill="rgb(235, 235, 236)"
              stroke="rgb(20, 20, 19)"
              strokeWidth="1.5"
            />

            {/* Interaction badge label */}
            {wire.label && (
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  x="-40"
                  y="-10"
                  width="80"
                  height="20"
                  rx="6"
                  fill="rgb(20, 20, 19)"
                  stroke="rgba(235, 235, 236, 0.3)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="4"
                  fill="rgb(235, 235, 236)"
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {wire.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Live wire currently being dragged from hotspot to a destination frame */}
      {isWiring && wireSourceElementId && wireMousePos && (() => {
        const sourceElement = elements.find(e => e.id === wireSourceElementId);
        if (!sourceElement) return null;
        const sourceRect = getElementCanvasRect(sourceElement);

        const startX = sourceRect.right;
        const startY = sourceRect.centerY;
        const endX = wireMousePos.x;
        const endY = wireMousePos.y;

        const deltaX = Math.abs(endX - startX);
        const control1X = startX + Math.max(deltaX * 0.5, 50);
        const control1Y = startY;
        const control2X = endX - Math.max(deltaX * 0.5, 50);
        const control2Y = endY;

        const livePathD = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;

        return (
          <g>
            <path
              d={livePathD}
              fill="none"
              stroke="rgba(235, 235, 236, 0.2)"
              strokeWidth="6"
            />
            <path
              d={livePathD}
              fill="none"
              stroke="rgb(235, 235, 236)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              markerEnd="url(#arrowhead-active)"
              className="animate-pulse"
            />
            <circle
              cx={startX}
              cy={startY}
              r="6"
              fill="rgb(235, 235, 236)"
              stroke="rgb(20, 20, 19)"
              strokeWidth="2"
            />
            <circle
              cx={endX}
              cy={endY}
              r="4"
              fill="rgb(235, 235, 236)"
            />
          </g>
        );
      })()}
    </svg>
  );
};
