; probeHere.g
; Homes Z using the current position of the probe

G91
G1 H2 Z5 F3000 S0      ; raise Z 5 mm for safety
G90

G30
M98 P"0:/sys/workshop/macros/zsurface.g"                        ; thickness of what was measured (if there is a bed reference)
