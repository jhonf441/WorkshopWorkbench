; focusrule.g -- focus height by thickness (the maker table of the laser + the geometry measured on 2026-10-15).
;
; Use:  M98 P"0:/sys/workshop/macros/focusrule.g" T6        ->  global.focusRuleH = height H (mm above the surface)
;
; H = 8.0 - 0.533 - lever(T), rounded to 0.1 mm
;   8.0    the tab of the lens box: with lever 0 the focus is 8 mm under the edge of the box
;   0.533  the reference of the laser (what the BLTouch measures) is 0.533 mm UNDER the edge of the box
;   lever  table of the maker: under 5 mm = 0, 5 = 2, 8 = 4, 10 = 5, 12 = 6, 15 or more = 7; interpolated between rows
; The same numbers are in 0:/sys/workshop/config/focus.json (this macro does not read it: RRF cannot read JSON).

if !exists(param.T)
    abort "focusrule: T (thickness in mm) missing"
if param.T <= 0 || param.T > 100
    abort {"focusrule: T" ^ param.T ^ " out of range (0 to 100 mm)"}
if !exists(global.focusRuleH)
    global focusRuleH = 0

var t = param.T
var lever = 0
if var.t >= 15
    set var.lever = 7
elif var.t >= 12
    set var.lever = 6 + (var.t - 12) / 3
elif var.t >= 10
    set var.lever = 5 + (var.t - 10) / 2
elif var.t >= 8
    set var.lever = 4 + (var.t - 8) / 2
elif var.t >= 5
    set var.lever = 2 + (var.t - 5) * 2 / 3
set global.focusRuleH = floor((8.0 - 0.533 - var.lever) * 10 + 0.5) / 10
