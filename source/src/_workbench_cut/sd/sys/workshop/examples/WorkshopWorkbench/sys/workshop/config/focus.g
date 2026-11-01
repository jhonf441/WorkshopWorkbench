; focus.g -- the two numbers of the focus rule in the form RRF can read (RRF cannot read focus.json). focusrule.g loads this file.
; Keep them EQUAL to geometry.focusBelowBoxEdge and geometry.boxEdgeAboveReference of 0:/sys/workshop/config/focus.json: the Workbench
; reads the json to show the focus height, the macros read this file, and the Workbench warns when the two differ.
; These are the numbers of the reference laser: measure yours with focusref.g and write them in both files.
if !exists(global.focusTab)
    global focusTab = 8.0
if !exists(global.focusBoxEdge)
    global focusBoxEdge = 0.533
set global.focusTab = 8.0                       ; focusBelowBoxEdge: mm the focus is under the edge of the lens box with the tab (lever 0)
set global.focusBoxEdge = 0.533                 ; boxEdgeAboveReference: mm the edge of the box is above the reference the probe measures
