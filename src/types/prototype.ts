export type InteractionTrigger = 
  | 'onClick' 
  | 'onHover' 
  | 'onMouseDown' 
  | 'onMouseUp' 
  | 'afterDelay';

export type InteractionActionType = 
  | 'navigate' 
  | 'openOverlay' 
  | 'closeOverlay' 
  | 'back' 
  | 'scrollTo' 
  | 'openUrl' 
  | 'toggleState';

export type TransitionType = 
  | 'instant' 
  | 'dissolve' 
  | 'slideLeft' 
  | 'slideRight' 
  | 'slideUp' 
  | 'slideDown' 
  | 'pushLeft' 
  | 'pushRight';

export type OverlayPosition = 
  | 'center' 
  | 'bottom' 
  | 'top' 
  | 'right' 
  | 'left';

export interface PrototypeInteraction {
  id: string;
  trigger: InteractionTrigger;
  delayMs?: number; // for afterDelay
  action: InteractionActionType;
  targetFrameId?: string; // Target screen ID
  transition: TransitionType;
  durationMs: number;
  easing?: 'linear' | 'ease' | 'ease-in-out' | 'spring';
  overlayPosition?: OverlayPosition;
  closeOnClickOutside?: boolean;
  dimBackground?: boolean;
  url?: string;
}

export interface PrototypeFlow {
  id: string;
  name: string;
  startingFrameId: string;
  description?: string;
}
