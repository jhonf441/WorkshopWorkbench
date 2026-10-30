; focushere.g -- "Focus here" (WorkshopJog, steps that need the laser
; focused, e.g. Measure the probe offset). Like laserfocus.g but WITHOUT
; changing zone or moving in X/Y: it measures the surface with the BLTouch where
; it is now (the probe touches at head + G31 offset) and leaves the laser at H mm.
;
; Use:  M98 P"0:/sys/workshop/macros/focushere.g" H7.5      (H = focus in mm ABOVE the surface)

var en = exists(global.workshopLanguage) ? (global.workshopLanguage == "en") : false   ; messages in English (DWC language, see sys/workshop/macros/language.g)
var clearZ = 10                                 ; minimum height before deploying the probe

if !exists(param.H)
    abort {var.en ? ("Focus: H missing (focus height in mm)") : ("Enfocar: falta H (altura de foco en mm)")}
if param.H < 1 || param.H > 60
    abort {var.en ? ("Focus: H" ^ param.H ^ " out of range (1 to 60 mm)") : ("Enfocar: H" ^ param.H ^ " fuera de rango (1 a 60 mm)")}
if !move.axes[0].homed || !move.axes[1].homed || !move.axes[2].homed
    abort {var.en ? ("Focus: home all axes first") : ("Enfocar: primero hace homing de todos los ejes")}

; The BLTouch pin has to be STOWED before moving (request
; 2026-10-08): if it was left out (e.g. probe offset wizard) a possible alarm
; is cleared and it is stowed. If it was already stowed nothing happens.
M280 P0 S160                                    ; clear the BLTouch alarm (raises the pin)
G4 P300
M402                                            ; stow the pin
G4 P300

M400
G90
G53 G0 Z{max(move.axes[2].machinePosition, var.clearZ)}   ; leave room to deploy the probe
G30                                             ; measure: Z0 = surface under the probe
M98 P"0:/sys/workshop/macros/zsurface.g" T{exists(param.T) ? param.T : 0}   ; thickness
G53 G0 Z{param.H}                               ; laser H mm above that surface
M400
var tmsg1 = "Enfocado aqui: laser a " ^ param.H ^ " mm sobre la superficie (medida en X" ^ (move.axes[0].machinePosition + sensors.probes[0].offsets[0]) ^ " Y" ^ (move.axes[1].machinePosition + sensors.probes[0].offsets[1]) ^ ")"
if var.en
    set var.tmsg1 = "Focused here: laser at " ^ param.H ^ " mm above the surface (measured at X" ^ (move.axes[0].machinePosition + sensors.probes[0].offsets[0]) ^ " Y" ^ (move.axes[1].machinePosition + sensors.probes[0].offsets[1]) ^ ")"
M118 P0 S{var.tmsg1}
