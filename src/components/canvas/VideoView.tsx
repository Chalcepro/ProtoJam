import React, { useEffect, useState } from 'react';
import { UIElement } from '../../types/components';
import { assetUrl } from '../../lib/assets';

// A video on the canvas: plays muted on a loop, like a moving image.
export const VideoView: React.FC<{ element: UIElement; style: React.CSSProperties }> = ({ element, style }) => {
  const src = element.semanticProps.videoSrc || element.semanticProps.src || '';
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    setMissing(false);
    assetUrl(src).then(u => live && setUrl(u)).catch(() => live && setMissing(true));
    return () => { live = false; };
  }, [src]);

  if (missing || !src) {
    return (
      <div style={{ ...style, background: 'rgba(235,235,236,0.06)' }}
           className="flex items-center justify-center text-[11px] text-[rgba(235,235,236,0.45)]">
        {src ? 'Video not on this computer' : 'Drop a video file here'}
      </div>
    );
  }
  return (
    <video src={url || undefined} autoPlay loop muted playsInline draggable={false}
           style={{ ...style, objectFit: 'cover', backgroundColor: undefined }}
           className="pointer-events-none select-none" />
  );
};
