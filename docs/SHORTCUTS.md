# ProtoJam keyboard shortcuts

Press `?` (or `Ctrl+/`) in the app to see this list. On a Mac, Ctrl is Cmd.

## Tools

| Keys | Does |
|---|---|
| V | Select / move |
| H | Hand (pan) |
| F or A | Frame (a screen; inside a frame, a frame in it) |
| S | Section |
| R | Rectangle |
| O | Ellipse |
| L | Line |
| Shift+L | Arrow |
| T | Text |
| B | Button |
| I | Input field |
| C | Sticky note |
| Esc | Back to Select (then: clear selection) |

## Drawing shapes

| Keys | Does |
|---|---|
| Shift (while drawing) | Even shape - square, circle; lines in 45° steps |
| Alt (while drawing) | Draw out from the centre |
| Click (no drag) | Place at default size (Frame on canvas: a phone; in a frame: 100×100) |

## Selecting

| Keys | Does |
|---|---|
| Click | Select (the outermost frame not yet stepped into) |
| Double-click | Step one level into a frame / group |
| Ctrl+click | Select the deepest thing under the pointer |
| Shift+click | Add to / take from the selection |
| Drag on empty canvas | Box select (Shift keeps the current selection) |
| Ctrl+A | Select all at the current level |
| Esc | Clear the selection |

## Edit

| Keys | Does |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Shift+Z or Ctrl+Y | Redo |
| Ctrl+C / Ctrl+X / Ctrl+V | Copy / cut / paste (an image on the clipboard pastes as an image) |
| Ctrl+D | Duplicate |
| Delete or Backspace | Delete |
| Arrow keys | Nudge 1px |
| Shift+Arrow keys | Nudge 10px |
| Enter | Edit the selected text / edit the points of the selected shape or vector |

## Layers & structure

| Keys | Does |
|---|---|
| Ctrl+] | Bring forward |
| Ctrl+[ | Send backward |
| Ctrl+Shift+] | Bring to front |
| Ctrl+Shift+[ | Send to back |
| Ctrl+G | Group the selection (its box always fits what is in it) |
| Ctrl+Shift+G | Ungroup (also takes things out of a frame) |
| Ctrl+Alt+G | Wrap the selection in a frame (one group selected: it becomes a frame) |
| Shift+A | Auto layout: wrap the selection in a frame (or turn it on for one frame; a group becomes an auto layout frame) |
| Ctrl+Alt+F | Convert the selected shape(s) or group(s) to a frame |

## Boolean & vector

| Keys | Does |
|---|---|
| Ctrl+Alt+U | Union |
| Ctrl+Alt+S | Subtract |
| Ctrl+Alt+I | Intersect |
| Ctrl+Alt+X | Exclude |
| Ctrl+Alt+M | Use as mask: the bottom selected layer cuts the rest to its shape (again on a mask: take it off) |
| Ctrl+E | Flatten into one vector |

## Resizing & rotating (handles)

| Keys | Does |
|---|---|
| Shift (drag a handle) | Keep proportions (images and videos keep them by default) |
| Ctrl (drag a handle) | Images / videos: stretch freely |
| Ctrl + drag a side | Grab anywhere along a side and pull it in or out (the other side stays) |
| Alt (drag a handle) | Resize from the centre |
| Shift (rotate) | Snap to 15° |
| Ctrl (while moving) | Move without snapping to guides |

## Pen & point editing (vector edit)

| Keys | Does |
|---|---|
| Double-click a vector / shape, or Enter | Edit its points |
| P | Pen: click = corner point, click-drag = curve, click the first point = close |
| V or A | Edit points |
| B or F | Paint bucket: fill / empty a region |
| Shift (pen) | Next point in 45° steps |
| Alt (dragging out a point) | Pull only the outgoing handle |
| Drag a handle | Both handles stay in line (lengths free); snaps back into line within 3°, lengths equal within 4px |
| Alt+drag a handle | Move one handle alone |
| Click a point / Shift+click | Select a point / add to the selection |
| Drag on empty space | Box select points |
| Ctrl+A | Select all points |
| Ctrl+click a point | Sharp ↔ smooth |
| Ctrl+drag a point | Pull out its curve handles |
| Click the dot mid-line | Add a point there |
| Click a line | Select the line (Delete removes it) |
| Drag a line / inside a shape | Move the line / the shape (or its selected points) |
| Arrow keys / Shift+Arrow keys | Nudge selected points 1px / 10px |
| S / R (points selected) | Scale / rotate them with the mouse, as in Blender: X / Y one axis, click or Enter keeps, Esc or right-click undoes |
| Box round selected points | Drag a side or corner to scale (Shift: evenly, Alt: from the middle); just outside a corner to rotate |
| Ctrl+J | Join the selected points (two loose ends join; otherwise a new line between them) |
| Ctrl (moving points / pen) | No snapping (other points, layers, guides, ruler marks) |
| Delete or Backspace | Delete selected points - delete and heal: the neighbours reshape to keep the curve (or the selected line) |
| Enter or Esc / double-click empty space | Done - lines that cross get a point where they cross |

## Text

| Keys | Does |
|---|---|
| Double-click, Enter or Ctrl+A on a text | Edit it (all text selected) |
| Click an already-selected text | Edit it |
| Esc | Stop editing |
| Ctrl+B | Bold: the words selected while typing, else the whole selected text layers |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+Shift+X | Strikethrough |

## View

| Keys | Does |
|---|---|
| Space+drag, middle-drag, or scroll | Pan |
| Ctrl+scroll | Zoom at the pointer |
| Ctrl+= / Ctrl+- | Zoom in / out |
| Ctrl+0 or Shift+0 | Zoom to 100% |
| Ctrl+1 or Shift+1 | Zoom to fit everything |
| Shift+R | Rulers on / off |
| Tab | Hide / show both side panels |
| Ctrl+\ | Left panel on / off |

## Panels, menus & fields

| Keys | Does |
|---|---|
| Drag on a number field | Change it: right +1, left −1 |
| Shift / Ctrl (dragging a number) | Fine: a tenth as fast, to 0.1 (as in Blender) / fast: ×10 |
| Click a number field | Type a value (Enter to set) |
| Drag a row in Layers | Reorder: drop above / below a row; on the middle of a frame, group or screen row = put it inside (rest there to open a closed one); on Canvas objects = out onto the canvas |
| Ctrl+Z in a panel field | Undo the design change |
| Hover in font / weight / blend menus | Live preview; Esc or leaving puts it back |
| ↑ / ↓ and Enter in the font menu | Move and pick |

## Project & prototype

| Keys | Does |
|---|---|
| Ctrl+S | Save |
| Ctrl+O | Open projects |
| W | Switch Design / Prototype mode |
| P | Play the prototype (Esc stops) |
| ? or Ctrl+/ | This shortcut list |
