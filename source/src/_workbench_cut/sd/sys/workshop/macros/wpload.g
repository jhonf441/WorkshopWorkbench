; wpload.g -- applies ONLY the saved origins again (sys/workshop/zones/p<N>.g),
; without reloading the cut area or checking the travel. Used by
; sys/workshop/macros/laseroffset.g when the offset flag changes: measured 2026-10-08,
; workplaces.g took ~2.9 s (the 9-turn loop with checks) and this
; ~0.6 s. Each p<N>.g already computes its origin with global.laserOffsetOn.
; workplaces.g (startup, material macros) still does everything.

if fileexists("0:/sys/workshop/zones/p1.g")
    M98 P"0:/sys/workshop/zones/p1.g"
if fileexists("0:/sys/workshop/zones/p2.g")
    M98 P"0:/sys/workshop/zones/p2.g"
if fileexists("0:/sys/workshop/zones/p3.g")
    M98 P"0:/sys/workshop/zones/p3.g"
if fileexists("0:/sys/workshop/zones/p4.g")
    M98 P"0:/sys/workshop/zones/p4.g"
if fileexists("0:/sys/workshop/zones/p5.g")
    M98 P"0:/sys/workshop/zones/p5.g"
if fileexists("0:/sys/workshop/zones/p6.g")
    M98 P"0:/sys/workshop/zones/p6.g"
if fileexists("0:/sys/workshop/zones/p7.g")
    M98 P"0:/sys/workshop/zones/p7.g"
if fileexists("0:/sys/workshop/zones/p8.g")
    M98 P"0:/sys/workshop/zones/p8.g"
if fileexists("0:/sys/workshop/zones/p9.g")
    M98 P"0:/sys/workshop/zones/p9.g"
