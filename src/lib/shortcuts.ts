// Every keyboard shortcut, grouped. Generated with docs/SHORTCUTS.md from one
// list - change both together.
export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
 {
  "group": "Tools",
  "items": [
   [
    "V",
    "Select / move"
   ],
   [
    "H",
    "Hand (pan)"
   ],
   [
    "F or A",
    "Frame (a screen; inside a frame, a frame in it)"
   ],
   [
    "S",
    "Section"
   ],
   [
    "R",
    "Rectangle"
   ],
   [
    "O",
    "Ellipse"
   ],
   [
    "L",
    "Line"
   ],
   [
    "Shift+L",
    "Arrow"
   ],
   [
    "T",
    "Text"
   ],
   [
    "B",
    "Button"
   ],
   [
    "I",
    "Input field"
   ],
   [
    "C",
    "Sticky note"
   ],
   [
    "Esc",
    "Back to Select (then: clear selection)"
   ]
  ]
 },
 {
  "group": "Drawing shapes",
  "items": [
   [
    "Shift (while drawing)",
    "Even shape - square, circle; lines in 45° steps"
   ],
   [
    "Alt (while drawing)",
    "Draw out from the centre"
   ],
   [
    "Click (no drag)",
    "Place at default size (Frame on canvas: a phone; in a frame: 100×100)"
   ]
  ]
 },
 {
  "group": "Selecting",
  "items": [
   [
    "Click",
    "Select (the outermost frame not yet stepped into)"
   ],
   [
    "Double-click",
    "Step one level into a frame / group"
   ],
   [
    "Ctrl+click",
    "Select the deepest thing under the pointer"
   ],
   [
    "Shift+click",
    "Add to / take from the selection"
   ],
   [
    "Drag on empty canvas",
    "Box select (Shift keeps the current selection)"
   ],
   [
    "Ctrl+A",
    "Select all at the current level"
   ],
   [
    "Esc",
    "Clear the selection"
   ]
  ]
 },
 {
  "group": "Edit",
  "items": [
   [
    "Ctrl+Z",
    "Undo"
   ],
   [
    "Ctrl+Shift+Z or Ctrl+Y",
    "Redo"
   ],
   [
    "Ctrl+C / Ctrl+X / Ctrl+V",
    "Copy / cut / paste (an image on the clipboard pastes as an image)"
   ],
   [
    "Ctrl+D",
    "Duplicate"
   ],
   [
    "Delete or Backspace",
    "Delete"
   ],
   [
    "Arrow keys",
    "Nudge 1px"
   ],
   [
    "Shift+Arrow keys",
    "Nudge 10px"
   ],
   [
    "Enter",
    "Edit the selected text / edit the points of the selected shape or vector"
   ]
  ]
 },
 {
  "group": "Layers & structure",
  "items": [
   [
    "Ctrl+]",
    "Bring forward"
   ],
   [
    "Ctrl+[",
    "Send backward"
   ],
   [
    "Ctrl+Shift+]",
    "Bring to front"
   ],
   [
    "Ctrl+Shift+[",
    "Send to back"
   ],
   [
    "Ctrl+G",
    "Group the selection (its box always fits what is in it)"
   ],
   [
    "Ctrl+Shift+G",
    "Ungroup (also takes things out of a frame)"
   ],
   [
    "Ctrl+Alt+G",
    "Wrap the selection in a frame"
   ],
   [
    "Shift+A",
    "Auto layout: wrap the selection in a frame (or turn it on for one frame)"
   ],
   [
    "Ctrl+Alt+F",
    "Convert the selected shape(s) to a frame"
   ]
  ]
 },
 {
  "group": "Boolean & vector",
  "items": [
   [
    "Ctrl+Alt+U",
    "Union"
   ],
   [
    "Ctrl+Alt+S",
    "Subtract"
   ],
   [
    "Ctrl+Alt+I",
    "Intersect"
   ],
   [
    "Ctrl+Alt+X",
    "Exclude"
   ],
   [
    "Ctrl+E",
    "Flatten into one vector"
   ]
  ]
 },
 {
  "group": "Resizing & rotating (handles)",
  "items": [
   [
    "Shift (drag a handle)",
    "Keep proportions (images and videos keep them by default)"
   ],
   [
    "Ctrl (drag a handle)",
    "Images / videos: stretch freely"
   ],
   [
    "Alt (drag a handle)",
    "Resize from the centre"
   ],
   [
    "Shift (rotate)",
    "Snap to 15°"
   ],
   [
    "Ctrl (while moving)",
    "Move without snapping to guides"
   ]
  ]
 },
 {
  "group": "Pen & point editing (vector edit)",
  "items": [
   [
    "Double-click a vector / shape, or Enter",
    "Edit its points"
   ],
   [
    "P",
    "Pen: click = corner point, click-drag = curve, click the first point = close"
   ],
   [
    "V or A",
    "Edit points"
   ],
   [
    "B or F",
    "Paint bucket: fill / empty a region"
   ],
   [
    "Shift (pen)",
    "Next point in 45° steps"
   ],
   [
    "Alt (dragging out a point)",
    "Pull only the outgoing handle"
   ],
   [
    "Drag a handle",
    "Both handles stay in line (lengths free); snaps back into line within 3°, lengths equal within 4px"
   ],
   [
    "Alt+drag a handle",
    "Move one handle alone"
   ],
   [
    "Click a point / Shift+click",
    "Select a point / add to the selection"
   ],
   [
    "Drag on empty space",
    "Box select points"
   ],
   [
    "Ctrl+A",
    "Select all points"
   ],
   [
    "Ctrl+click a point",
    "Sharp ↔ smooth"
   ],
   [
    "Ctrl+drag a point",
    "Pull out its curve handles"
   ],
   [
    "Click the dot mid-line",
    "Add a point there"
   ],
   [
    "Click a line",
    "Select the line (Delete removes it)"
   ],
   [
    "Drag a line / inside a shape",
    "Move the line / the shape (or its selected points)"
   ],
   [
    "Arrow keys / Shift+Arrow keys",
    "Nudge selected points 1px / 10px"
   ],
   [
    "Ctrl+J",
    "Join the selected points (two loose ends join; otherwise a new line between them)"
   ],
   [
    "Ctrl (moving points / pen)",
    "No snapping to other points' alignment"
   ],
   [
    "Delete or Backspace",
    "Delete selected points - delete and heal: the neighbours reshape to keep the curve (or the selected line)"
   ],
   [
    "Enter or Esc / double-click",
    "Done"
   ]
  ]
 },
 {
  "group": "Text",
  "items": [
   [
    "Double-click, Enter or Ctrl+A on a text",
    "Edit it (all text selected)"
   ],
   [
    "Click an already-selected text",
    "Edit it"
   ],
   [
    "Esc",
    "Stop editing"
   ]
  ]
 },
 {
  "group": "View",
  "items": [
   [
    "Space+drag, middle-drag, or scroll",
    "Pan"
   ],
   [
    "Ctrl+scroll",
    "Zoom at the pointer"
   ],
   [
    "Ctrl+= / Ctrl+-",
    "Zoom in / out"
   ],
   [
    "Ctrl+0 or Shift+0",
    "Zoom to 100%"
   ],
   [
    "Ctrl+1 or Shift+1",
    "Zoom to fit everything"
   ],
   [
    "Shift+R",
    "Rulers on / off"
   ],
   [
    "Tab",
    "Hide / show both side panels"
   ],
   [
    "Ctrl+\\",
    "Left panel on / off"
   ]
  ]
 },
 {
  "group": "Panels, menus & fields",
  "items": [
   [
    "Drag on a number field",
    "Change it: right +1, left −1 (Shift: ×10)"
   ],
   [
    "Click a number field",
    "Type a value (Enter to set)"
   ],
   [
    "Ctrl+Z in a panel field",
    "Undo the design change"
   ],
   [
    "Hover in font / weight / blend menus",
    "Live preview; Esc or leaving puts it back"
   ],
   [
    "↑ / ↓ and Enter in the font menu",
    "Move and pick"
   ]
  ]
 },
 {
  "group": "Project & prototype",
  "items": [
   [
    "Ctrl+S",
    "Save"
   ],
   [
    "Ctrl+O",
    "Open projects"
   ],
   [
    "W",
    "Switch Design / Prototype mode"
   ],
   [
    "P",
    "Play the prototype (Esc stops)"
   ],
   [
    "? or Ctrl+/",
    "This shortcut list"
   ]
  ]
 }
];
