# WorkshopWorkbench -- historial de versiones

## 2.22.1 -- 2026-10-30

- Work origins live only in the Workbench: the laser correction comes from the settings store, not from the zones

## 2.22.0 -- 2026-10-30

- CNC safety: the toolpaths card asks for its own safety list before Start (spindle and tool, workpiece, extraction, area clear, Z zero), recorded in Activity like the laser one; Start says why it is locked (off, emergency stop, busy, Z0 not set, list missing)
- CNC files start with sys/workshop/macros/cncguard.g: the job cancels itself unless the machine is in CNC mode, X Y Z are homed, the Z0 of the work system is set and the depth / safe height fit in the Z travel at that Z0
- The CNC plan is also checked against the real Z0 of the machine and the clamps of the map (the cutter may not pass over one; the safe Z must clear their height, editable in the clamp popup)

## 2.21.6 -- 2026-10-30

- Shorter lock texts; the reason the machine cannot move says off, emergency stop or no connection instead of busy

## 2.21.5 -- 2026-10-30

- Manifest: sbcRequired true (needs WorkshopService); side bar keeps the group names

## 2.21.4 -- 2026-10-29

- Phone layout fixes (44 px touch targets, no overflow), Workbench full-screen section picker, clamps hint, interrupted jobs off the table, Machine scale label

## 2.21.3 -- 2026-10-29

- Zones: Measure and focus shows a message at once while the probe works

## 2.21.2 -- 2026-10-29

- Audit and UX fixes: Jog owns workzeroaxis.g, restart notice with time, shared pulse table with update and download, side bar tooltips, spacing, wider field

## 2.21.1 -- 2026-10-29

- State chips with an icon: the icon carries the color and there is no dot (family.css); chosen chip tinted

## 2.21.0 -- 2026-10-29

- Side bars: no gray line, a chosen item goes to the start of its section; Printing: start-up chip without the mode rows, tests notice only when the chip is not green, no-sensor fault reading; Vision: settings cards packed in columns, laser crosses only with Laser mode; Zones: visible mode dot

## 2.20.10 -- 2026-10-28

- Design family: final shared styles

## 2.20.9 -- 2026-10-28

- Design family: page bar with badge, title and one line; section menu, tabs, cards, buttons and states are the shared wf-* classes; the map keeps its dark canvas

## 2.20.8 -- 2026-10-28

- Minimalist design: neutral header and cards, text tabs that wrap, gray icons, outline buttons, dot and word states, no tints or gradients

## 2.20.7 -- 2026-10-28

- The cut area writer is gone: the service writes cutarea.g

## 2.20.6 -- 2026-10-28

- Cut area card is read only: measuring and editing moved to Machine > Work area

## 2.20.5 -- 2026-10-28

- Risk dialogs get their colored side bar back; one type scale (Roboto in the panels, no half sizes)

## 2.20.4 -- 2026-10-28

- The reason the controls are locked (no home yet...) is shown in the header, not the footer

## 2.20.3 -- 2026-10-27

- Plan warnings in words, risk dialogs in DWC style, mesh point selection, link to Machine modes

## 2.20.2 -- 2026-10-27

- Side bar no longer makes the page jump when a shorter section is chosen; start-up chip as in every page (header, same wording)

## 2.20.1 -- 2026-10-26

- Run-time guard: the 3.6 build refuses to start on a host with window.DWC and the 3.7 build outside DWC 3.7.x (visible warning); shipped as a strict per-line zip (dwcVersion 3.6 / 3.7)

## 2.20.0 -- 2026-10-26

- The page opens on a help panel when the machine does not do laser or CNC work (printing only, or not answered yet): what the page is for, why it is closed, the Laser / CNC switches and a step-by-step guide. No map, tabs or bars are shown until a work mode is on. The answer is the shared machine profile (mode_policies); the link to Machine > Machine modes appears only if that plugin is installed. The mode macro rows of the start-up card appear only on machines that switch between modes.

## 2.19.2 -- 2026-10-26

- Universal zip: the DWC 3.6 side is now built with the official 3.6 pipeline, so its i18n catalogs are registered and the menu captions show names instead of raw plugins.* keys.

## 2.19.1 -- 2026-10-26

- Shared lifecycle cleanup, friendly transport errors and the confirmation texts of the shared JS code.

## 2.19.0 -- 2026-10-24

- Workbench 2.19.0 (live trace, interrupted counter, rotate handle, polyline snap, map ruler); Camera Studio phase 2 (stabilization, burst, rebuild a video), page without cameras with network search, flash row; shared start-up assistant fixes

## 2.18.0 -- 2026-10-24

- Workbench reads the job trace incrementally with trace.since (needs Service 2.19.3 or later)

## 2.17.0 -- 2026-10-24

- Workbench renewal: Laser and CNC only, Interrupted jobs tab, live job trail without CPU load, rotation in the laser editor, map layer cache, polyline snapping

## 2.16.9 -- 2026-10-24

- Cuts editor: the polyline snaps to existing points and vertices (the first point closes the outline); help of Job in progress no longer mentions 3D printing

## 2.16.8 -- 2026-10-23

- One sign-in for every tab (token in localStorage)

## 2.16.7 -- 2026-10-23

- Compact live job strip in the bar; page header treats an expired session as sign in; numeric PIN field

## 2.16.6 -- 2026-10-23

- Common page header: health chip, session chip, quiet start-up icon when ready

## 2.16.5 -- 2026-10-23

- Stop button: own class, Vuetify .amber no longer paints it yellow

## 2.16.4 -- 2026-10-23

- Safe stop button: solid amber when usable, outline when off

## 2.16.3 -- 2026-10-22

- Header says Off when the machine is off; interrupted jobs card always shown

## 2.16.2 -- 2026-10-22

- Safe stop button always in the header (off without a live job)

## 2.16.1 -- 2026-10-22

- Safe stop button in the page header

## 2.16.0 -- 2026-10-22

- Safe stop of the live job, interrupted jobs card and verified resume assistant

## 2.15.0 -- 2026-10-22

- Height calibration is a summary + button to Machine > Height; Find center 'Quitar dibujo' and its overlay only while the tool is open

## 2.14.0 -- 2026-10-22

- Work area (cutting / print area), footer always says why everything is locked, pin hidden when the bar is folded

## 2.13.0 -- 2026-10-22

- Header holds the live machine state (state, zone, position); footer only lock, control and job buttons; Zones notes apart from buttons

## 2.12.1 -- 2026-10-22

- Pin on every side bar, thin scrollbars, one sign-in dialog

## 2.12.0 -- 2026-10-22

- Flat Active zone: height and focus in one block, folded Advanced, pin on the side bar

## 2.11.10 -- 2026-10-22

- Sign-in never opens by itself; keyboard only on touch

## 2.11.9 -- 2026-10-22

- Fix names, values and catalog markers the English rename left behind

## 2.11.8 -- 2026-10-22

- Camera images that cannot load say why

## 2.11.7 -- 2026-10-22

- Sessions made clear: not-signed-in chip, sign-in on visitor 403, refusal toast

## 2.11.6 -- 2026-10-22

- Sign-in dialog focus and kiosk keyboard helper; Jog blocked touches explained

## 2.11.5 -- 2026-10-22

- Kiosk keyboard helper call, sign-in dialog font

## 2.11.4 -- 2026-10-22

- Jog and bars tell why an action is blocked and ask for the session; Jog loses the Machine pointer sections

## 2.11.3 -- 2026-10-22

- Sign-in dialog redesign and on-screen keyboard; single floating panel for power actions; risk bar on one line; Jog gear and scrollbar; side tabs transition

## 2.11.2 -- 2026-10-21

- PIN sign enters by itself when the PIN has the length that worked last time

## 2.11.1 -- 2026-10-21

- Page routes in English with redirects from the old ones, localStorage keys migrated to English; camera relay requests carry the identity

## 2.11.0 -- 2026-10-21

- Operator and technician views by role, Ready to cut card with manual laser safety list, work state shared in the service, pause/resume/cancel in the status bar, required focus, who has the control

## 2.10.0 -- 2026-10-21

- English migration: texts through the catalog, no in-browser translator, interfaces per part

## 2.9.1 -- 2026-10-20

- English names: remaining values, ids, theme panels and the Vision backend keys (fixes a mismatch with the page)

## 2.9.0 -- 2026-10-20

- All the code, data keys and enum values are in English; stored data is converted by the one-off migration script

## 2.8.10 -- 2026-10-20

- Zones: ask-for-material checkbox shown inline and kept after saving

## 2.8.9 -- 2026-10-20

- Zones: option to ask if there is material before focusing (Q1 in laserfocus.g)

## 2.8.8 -- 2026-10-19

- Simple cuts frame goes through the service (box or outline, once / N times / continuous, Stop), no job file; dragging a shape no longer opens the browser copy/search bubble

## 2.8.7 -- 2026-10-19

- Z measuring point can be dragged on the map and saved; taps outside the machine travel open nothing; the Move card can be dragged off the map

## 2.8.6 -- 2026-10-18

- Find center: default name Centre N, visible save confirmation with See positions button, tap the found center to copy G-code or save, laser head note

## 2.8.5 -- 2026-10-18

- Material focus follows the thickness rule (macro carries T, no H); laserfocus.g/livemark.g stop the job when the probe or BLTouch fails; zone point shown where the macro measures

## 2.8.4 -- 2026-10-18

- Zones: the map shows where the material macro really measures (orange ring) and can align it; map popup gets Measure focus here

## 2.8.3 -- 2026-10-18

- Zone card: fix the render error (appendChild of undefined) while a live job runs

## 2.8.2 -- 2026-10-18

- Internal: local names in English (no visible change)

## 2.8.1 -- 2026-10-18

- Laser editor: corner arrows follow the diagonal on screen

## 2.8.0 -- 2026-10-18

- Laser editor: selection strip over the map (move, duplicate, layer, delete)

## 2.7.0 -- 2026-10-18

- Redesign: groups by function, laser editor tools over the map, personal shortcuts, bed photo button, neutral Spanish

## 2.6.14 -- 2026-10-18

- Start-up entry is a chip in the page header

## 2.6.13 -- 2026-10-18

- Map tools: a picked point is clamped to the bed, nothing can be placed outside it

## 2.6.12 -- 2026-10-17

- Fix freeze of the Zones page: Prepare step loop never ended when the machine was ready

## 2.6.11 -- 2026-10-17

- Machine free rule follows the movement owner settings (like Duet / release seconds)

## 2.6.10 -- 2026-10-17

- Rebuild with the no-monoliths refactor

## 2.6.9 -- 2026-10-16

- Start-up strip with the same spacing as the other pages

## 2.6.8 -- 2026-10-16

- Cortes and Mesh rebuilt without monoliths: explicit state object, plain functions, section functions (behaviour traced identical); structure tests forbid new monoliths

## 2.6.7 -- 2026-10-16

- Zones table: clicking the name opens the editor (the Edit button scrolled out of sight on narrow screens, hiding material width/height)

## 2.6.6 -- 2026-10-16

- zsurface.g: the not-comparable message is split into three short ones (the long one failed with Failed to serialize code and stopped the macro)

## 2.6.5 -- 2026-10-16

- Map toolbar buttons keep their icon after a click and no longer overflow; the active zone cannot be deleted (it stays listed anyway)

## 2.6.4 -- 2026-10-16

- Jog header: the no-limits chip is a small padlock icon so the title and the minimize button are visible again; Workbench: pure helpers of the laser editor and the mesh moved to their own files

## 2.6.3 -- 2026-10-16

- One shared way to start a job file (cuts, mesh, big pieces, CNC) that also reports an error answer; Jog step tab only shows the axes the machine has; Printing mode macros have assistant questions

## 2.6.2 -- 2026-10-16

- Start-up dialog: sans-serif font, dark scrollbars, and a card with a single ready row no longer repeats its name

## 2.6.1 -- 2026-10-16

- Zone card finds material macros made with T (mdf3mm.g) and offers Measure and focus; zsurface.g explains what it measured when the bed has no compensation; the bottom status bar only sticks on tall screens; Jog minimize button is 40 px and works with a finger

## 2.6.0 -- 2026-10-16

- Start-up card is now a dialog opened from a strip on the page (one card per function, progress, step-by-step assistant), with a plain explanation for every row

## 2.5.7 -- 2026-10-16

- Map dock icons only by default

## 2.5.6 -- 2026-10-16

- livemark.g: the bridge is told about live jobs only

## 2.5.5 -- 2026-10-16

- Tabs act on tap; map buttons keep their text

## 2.5.4 -- 2026-10-16

- Step bar on top removed

## 2.5.3 -- 2026-10-16

- Start-up assistant (shared piece), Lights: the strip pin is chosen in Advanced (plain LED removed)

## 2.5.2 -- 2026-10-15

- Start-up card (shared piece): Printing assistant renamed so it no longer collides with the card

## 2.5.1 -- 2026-10-15

- Simulate: the From here and Send buttons work again (their functions had been removed)

## 2.5.0 -- 2026-10-15

- Redesign stages 3-7: page split in parts with one state object, step bar + inspector + status bar, command palette / shortcuts / global undo / favourites, FFF layers and 3D view, CNC toolpaths; camera layer rows follow Vision live; diagonal measures; points assistant as a button; focus height by thickness (laserfocus.g without H)

## 2.4.1 -- 2026-10-15

- Redesign stage 2: single documented ctx contract, one machine-state helper, one message helper

## 2.4.0 -- 2026-10-15

- Redesign stage 1: profiles by mode, steps of the flow, accent per mode

## 2.3.26 -- 2026-10-15

- Laser editor: copy and paste, center fields, mm units, no point dialog while editing shapes

## 2.3.25 -- 2026-10-15

- Laser editor: move by, linear array, matrix naming

## 2.3.24 -- 2026-10-15

- Laser editor: accounts in the fields; Enter closes the keyboard

## 2.3.23 -- 2026-10-15

- Laser editor: shapes already cut are marked, left out of the next cut and can be taken off and brought back

## 2.3.22 -- 2026-10-15

- Frame without a job: once, N times or until stopped

## 2.3.21 -- 2026-10-15

- Simulate job: layers with colours, send from a point

## 2.3.20 -- 2026-10-15

- Simulate job: board of several jobs and magnet points of the jobs on the map

## 2.3.19 -- 2026-10-15

- Mesh: region out of the probe reach is drawn as such

## 2.3.18 -- 2026-10-15

- Map toolbar: one row on a small screen

## 2.3.17 -- 2026-10-15

- zsurface.g without M99: fixes the unknown variable en error of the laser focus

## 2.3.16 -- 2026-10-15

- Simulate job: layer by layer view for 3D printing

## 2.3.15 -- 2026-10-15

- Own tab Simulate job: preview, simulate, frame and send a job file

## 2.3.14 -- 2026-10-15

- Work: Clean the table button

## 2.3.13 -- 2026-10-15

- Fix: job preview draw

## 2.3.12 -- 2026-10-15

- Work: view, simulate and frame a job file

## 2.3.11 -- 2026-10-15

- Spanish texts with accents and enie

## 2.3.10 -- 2026-10-15

- Map: leaving the Camera tool turns the camera layer off again when the tool had turned it on

## 2.3.9 -- 2026-10-15

- Map: turning the Camera layer off closes the Camera tool and its strip; the word Camera no longer overflows its button

## 2.3.8 -- 2026-10-14

- Hide every mention of another plugin when it is absent; see the dependency audit; zoom and camera layer fixes

## 2.3.7 -- 2026-10-14

- Camera layer: closing it aborts the video for sure and a hidden page does not hold the stream

## 2.3.6 -- 2026-10-14

- Work zones: zoom and pan stop the automatic fit to the job, the camera layer pauses during a job, toolbar wraps, file job never taken for a live one

## 2.3.5 -- 2026-10-14

- Work zones: path built in chunks (only the changed ones are redrawn) and rebuilt when the zone changes during the job

## 2.3.4 -- 2026-10-14

- Work zones: the job is not drawn live (the path is built once, progress every 20 s from the page's own status, a live job is drawn when it ends)

## 2.3.3 -- 2026-10-14

- Cleanup: no more lookups of the old service Id (PiCustomCodes) or mentions of the removed custom G-codes

## 2.3.2 -- 2026-10-14

- Nivelar Z: the measurement points table no longer spills out of its card; Laser editor: the layer rows fit their column

## 2.3.1 -- 2026-10-14

- Header is a card like the other pages and the page has no extra side padding

## 2.3.0 -- 2026-10-13

- The cut area, the saved positions and their SD macros live in their own folder (_workbench_cut); the shared base with the Jog is now only files, help and laser.json

## 2.2.0 -- 2026-10-13

- Level Z probe points: labels no longer overlap (dark outline), a legend that says what each mark is, and tapping a point or a leadscrew shows its information

## 2.1.0 -- 2026-10-13

- Level Z as its own tab in General, Find centre through the used points with P labels, camera layer caption and homing check, Z drivers text

## 2.0.2 -- 2026-10-13

- Files and macros written by the plugin are in English; bilingual risk texts

## 2.0.1 -- 2026-10-13

- Official localization completed, no Spanish text left in the sources

## 2.0.0 -- 2026-10-13

- Needs WorkshopService 2.0: calls its central API (POST /machine/WorkshopService/api) instead of the custom codes M9003 / M9010, which are gone
- Moving G-code asks the owner of the movement first; buttons are blocked while another page holds a reservation or the G-code bridge sends orders
- Close live job, level Z saving, big part wizard and the job view heartbeat through the API

## 1.2.1 -- 2026-10-13

- Fix: the i18n helper no longer clashes with local variables named tt

## 1.2.0 -- 2026-10-13

- Built with the official DWC pipeline: official localization (plugins.WorkshopWorkbench.*)

## 1.1.1 -- 2026-10-13

- Sidebar closed rail and settings; shared updates; English texts pending

## 1.1.0 -- 2026-10-12

- Nivelar Z (Offsets), guardia de foco en Cortes y Malla, trabajo en pausa permite mover, avisos de riesgo con las rutas nuevas, estado desde DWC; dwcVersion 3.6

## 1.0.6 -- 2026-10-11

- Camara del mapa: si no se puede mover (sin homing u ocupada), la vista previa de la rueda queda en rojo con el motivo

## 1.0.5 -- 2026-10-11

- Traducciones nuevas (barra de Vision, aviso del jog sin limites)

## 1.0.4 -- 2026-10-11

- Camara del mapa: con la rueda del mouse la vista previa queda hasta mostrar el destino

## 1.0.3 -- 2026-10-11

- Traducciones del detalle del PID

## 1.0.2 -- 2026-10-11

- Traducciones nuevas; el traductor tambien cubre Impresion 3D, Timelapses y Servicio de la Pi

## 1.0.1 -- 2026-10-11

- Historial de trabajos en lista compacta con su propio desplazamiento (no se sale del panel)

## 1.0.0 -- 2026-10-11

- Mesa de trabajo como complemento propio (antes dentro de WorkshopJog): zonas, Mesh, trabajo en curso, offsets, preparar, editor laser, hallar centro, cortar por partes, area de corte y materiales
