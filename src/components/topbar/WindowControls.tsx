import React, { useEffect, useState } from 'react';

interface WindowBridge {
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximized: (cb: (value: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: { platform: string; window?: WindowBridge };
  }
}

/** True in the frameless desktop window on Windows / Linux, where the app
 *  draws its own window buttons. macOS keeps its traffic lights; the browser
 *  build has no window to control. */
export const hasOwnWindowControls = () =>
  !!window.electronAPI?.window && window.electronAPI.platform !== 'darwin';

const Glyph: React.FC<{ d: string }> = ({ d }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
       strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const btn =
  'no-drag w-8 h-[26px] flex items-center justify-center rounded-[8px] ' +
  'text-[rgba(235,235,236,0.5)] transition-all duration-150 active:scale-90';

/** Minimise / maximise / close, styled like the top bar's other pill groups.
 *  Close glows the app's coral accent on hover. */
export const WindowControls: React.FC = () => {
  const win = window.electronAPI?.window;
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!win) return;
    win.isMaximized().then(setMaximized);
    return win.onMaximized(setMaximized);
  }, [win]);

  if (!win || !hasOwnWindowControls()) return null;

  return (
    <div className="flex items-center gap-1 ml-1.5">
      <div className="h-4 w-px bg-[rgba(235,235,236,0.08)] mr-0.5" />
      <div className="flex items-center gap-px p-0.5 rounded-[10px] bg-[rgba(235,235,236,0.04)] border border-[rgba(235,235,236,0.08)]">
        <button onClick={win.minimize} title="Minimise"
                className={`${btn} hover:bg-[rgba(235,235,236,0.08)] hover:text-[rgb(235,235,236)]`}>
          <Glyph d="M2 5.5h6" />
        </button>
        <button onClick={win.toggleMaximize} title={maximized ? 'Restore' : 'Maximise'}
                className={`${btn} hover:bg-[rgba(235,235,236,0.08)] hover:text-[rgb(235,235,236)]`}>
          {maximized
            ? <Glyph d="M3.5 3.5V2.5a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H6.5 M1.5 4.3a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H2.3a.8.8 0 0 1-.8-.8z" />
            : <Glyph d="M2.3 1.8h5.4a.5.5 0 0 1 .5.5v5.4a.5.5 0 0 1-.5.5H2.3a.5.5 0 0 1-.5-.5V2.3a.5.5 0 0 1 .5-.5z" />}
        </button>
        <button onClick={win.close} title="Close"
                className={`${btn} hover:bg-[#ff6b4a] hover:text-white hover:shadow-[0_0_12px_rgba(255,107,74,0.45)]`}>
          <Glyph d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
        </button>
      </div>
    </div>
  );
};
