      // ---- Laser editor: pure helpers (geometry, SVG import, section UI, CSS) ----
      // Moved out of 40-cuts.js on 2026-10-16 (it had 3700 lines): the constants, the geometry and SVG functions that
      // come before the editor and the small helpers that come after it. Everything is one scope (the build joins the
      // files), so nothing changes for the editor itself: tcMountCuts stays in 40-cuts.js.

      var TC_STORE_KEY = "workshopCuts";
      var TC_JOB_FILE = "0:/sys/workshop/gcodes/cuts.gcode";
      var TC_TRAVEL_FEED = 6000;
      var TC_SHAPE_COLOR = "#e040fb";
      // Layers (2026-10-09, "like the cutting programs"): each layer = a color with its
      // power, speed, passes and air. They are cut in the order of the list.
      var TC_LAYER_COLORS = ["#ff1744", "#2979ff", "#00e676", "#ffea00", "#ff9100", "#d500f9", "#00e5ff", "#ff4081", "#8d6e63", "#bdbdbd"];
      var TC_CENTER_COLOR = "#00e5ff";

      // Least-squares circle fit (Kasa) for 3 or more points.
      // Returns {cx, cy, r, rms} or null if the points are aligned.
      // Usage help (2026-10-10, 'add usage information for all the functions'):
      // shown by the 'How it is used' button of each section (30-zones-page.js).
      var TC_HELP = {
        cuts: {
          title: i18nT('cuts.laser_editor_draw_arrange_in_layers'),
          steps: [
            i18nT('cuts.choose_the_zone_and_the_material'),
            i18nT('cuts.draw_a_shape_line_rectangle_circle'),
            i18nT('cuts.tapping_a_shape_selects_it_dragging'),
            i18nT('cuts.to_pick_several_shift_while_tapping'),
            i18nT('cuts.with_the_selection_duplicate_mirror_rotate'),
            i18nT('cuts.in_layers_each_layer_has_power'),
            i18nT('cuts.use_material_under_more_loads_power'),
            i18nT('cuts.show_cut_order_numbers_the_shapes'),
            i18nT('cuts.frame_with_the_pointer_or_with'),
            i18nT('cuts.cut_check_the_list_of_layers'),
          ],
          notes: [
            i18nT('cuts.layers_are_cut_from_top_to'),
            i18nT('cuts.a_layer_that_is_off_is'),
            i18nT('cuts.cutting_power_goes_from_1_to'),
            i18nT('cuts.everything_stays_inside_the_cutting_area'),
            i18nT('cuts.ctrl_z_undoes_ctrl_y_redoes'),
            i18nT('cuts.wear_blue_laser_goggles_and_don'),
          ],
        },
        center: {
          title: i18nT('cuts.find_center_measure_a_part_or'),
          steps: [
            i18nT('cuts.choose_what_to_measure_a_hole'),
            i18nT('cuts.choose_how_each_method_shows_in'),
            i18nT('cuts.choose_where_the_points_come_from'),
            i18nT('cuts.capture_the_points_it_asks_for'),
            i18nT('cuts.with_the_camera_the_machine_can'),
            i18nT('cuts.when_done_you_get_the_center'),
            i18nT('cuts.use_this_center_pointer_to_center'),
            i18nT('cuts.create_circle_or_rectangle_to_cut'),
            i18nT('cuts.fix_the_selected_shape_here_moves'),
            i18nT('cuts.save_as_position_it_goes_to'),
          ],
          notes: [
            i18nT('cuts.more_well_spread_points_give_a'),
            i18nT('cuts.a_fixed_shape_can_t_be'),
            i18nT('cuts.with_the_camera_dragging_the_image'),
            i18nT('cuts.the_camera_must_be_calibrated_in'),
          ],
        },
      };

      function tcFitCircle(pts) {
        if (pts.length < 3) return null;
        // Kasa fit on coordinates relative to the mean: on the raw bed
        // coordinates (hundreds of mm) a small hole loses precision in
        // r2 = cx^2 + cy^2 - F (big numbers minus big numbers).
        var n = pts.length, mx = 0, my = 0;
        pts.forEach(function (p) { mx += p.x; my += p.y; });
        mx /= n; my /= n;
        var sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
        pts.forEach(function (p0) {
          var p = { x: p0.x - mx, y: p0.y - my };
          var z = p.x * p.x + p.y * p.y;
          sx += p.x; sy += p.y; sxx += p.x * p.x; syy += p.y * p.y; sxy += p.x * p.y;
          sxz += p.x * z; syz += p.y * z; sz += z;
        });
        // [sxx sxy sx][D]   [-sxz]
        // [sxy syy sy][E] = [-syz]
        // [sx  sy  n ][F]   [-sz ]
        var A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
        var b = [-sxz, -syz, -sz];
        function det3(m) {
          return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        }
        var d = det3(A);
        // aligned points: the determinant scales with the spread^4 of the points
        var esc = Math.max(sxx, syy) / n;
        if (!(esc > 0) || Math.abs(d) < 1e-12 * esc * esc * n * n * n) return null;
        function col(k) {
          return A.map(function (row, i) {
            return row.map(function (v, j) {
              return j === k ? b[i] : v;
            });
          });
        }
        var D = det3(col(0)) / d, E = det3(col(1)) / d, F = det3(col(2)) / d;
        var ux = -D / 2, uy = -E / 2;
        var r2 = ux * ux + uy * uy - F;
        if (!(r2 > 0)) return null;
        var r = Math.sqrt(r2);
        var cx = ux + mx, cy = uy + my;
        // residual of each point: distance to the centre minus the radius
        // (+ outside the circle, - inside); 0 for 3 exact points
        var errs = pts.map(function (p) { return Math.hypot(p.x - cx, p.y - cy) - r; });
        var rms = Math.sqrt(errs.reduce(function (acc, e) { return acc + e * e; }, 0) / n);
        var iMax = 0;
        errs.forEach(function (e, i) { if (Math.abs(e) > Math.abs(errs[iMax])) iMax = i; });
        return { cx: cx, cy: cy, r: r, rms: rms, errs: errs, maxErr: Math.abs(errs[iMax]), iMax: iMax };
      }

      // Rectangle from 3 corners (in any order): the center is
      // the midpoint of the diagonal (the most separated pair); the other two
      // sides give width/height and the rotation angle.
      // poly (2026-10-13): the outline through the 3 measured corners (the 4th
      // one completes the parallelogram), so the drawn and created shape passes
      // through the points used. Before, a rotated result (any real
      // measurement) drew no outline at all on the map. cornerErr = how far
      // that 4th corner is from the one of a true rectangle (mm).
      function tcRectFrom3(p) {
        if (p.length !== 3) return null;
        var pairs = [[0, 1], [0, 2], [1, 2]].map(function (ij) {
          return { i: ij[0], j: ij[1], d: Math.hypot(p[ij[0]].x - p[ij[1]].x, p[ij[0]].y - p[ij[1]].y) };
        });
        pairs.sort(function (a, b) { return b.d - a.d; });
        var diag = pairs[0];
        var k = [0, 1, 2].filter(function (x) { return x !== diag.i && x !== diag.j; })[0];
        var corner = p[k];
        var a = p[diag.i], b = p[diag.j];
        var wv = { x: a.x - corner.x, y: a.y - corner.y };
        var hv = { x: b.x - corner.x, y: b.y - corner.y };
        var w = Math.hypot(wv.x, wv.y), h = Math.hypot(hv.x, hv.y);
        if (w < 0.5 || h < 0.5) return null;
        var cosA = (wv.x * hv.x + wv.y * hv.y) / (w * h); // ~0 si es un angulo recto
        var squareErr = Math.abs(90 - (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI);
        return {
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
          w: w,
          h: h,
          angle: (Math.atan2(wv.y, wv.x) * 180) / Math.PI,
          squareErr: squareErr,
          cornerErr: Math.min(w, h) * Math.sin((squareErr * Math.PI) / 180),
          poly: [[corner.x, corner.y], [a.x, a.y], [a.x + b.x - corner.x, a.y + b.y - corner.y], [b.x, b.y]],
          de3: true,
        };
      }

      // Bed point captured with the machine (2026-10-13). Bed coordinates are
      // where the POINTER falls (= X/Y machine position of the head); the laser
      // hits at head - correction (0:/sys/workshop/config/laser.json, the same
      // rule as "Laser to centre" and Vision). aim: "puntero" | "laser".
      // -> {x, y} or null (no homing, or laser without a measured correction).
      function tcCaptureBed(head, aim, correction) {
        if (!head || !isFinite(head.x) || !isFinite(head.y)) return null;
        if (aim !== "laser") return { x: head.x, y: head.y };
        if (!correction || !isFinite(correction.cx) || !isFinite(correction.cy)) return null;
        return { x: head.x - correction.cx, y: head.y - correction.cy };
      }
      // Where the head goes so that the chosen aim sits on the bed point (x, y).
      function tcHeadFor(x, y, aim, correction) {
        if (aim === "laser" && correction && isFinite(correction.cx) && isFinite(correction.cy)) return { x: x + correction.cx, y: y + correction.cy };
        return { x: x, y: y };
      }

      // Request 2026-10-08 ("more interactive ways to find the center"):
      // circle by 2 points of the edge + known diameter (there are TWO possible
      // circles, one on each side of the chord: sol = 0 | 1).
      function tcCircleFrom2(a, b, diam, sol) {
        var r = diam / 2;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.hypot(dx, dy);
        if (!(r > 0) || d < 0.1 || d > 2 * r + 1e-6) return null;
        var h = Math.sqrt(Math.max(0, r * r - (d / 2) * (d / 2)));
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var ux = -dy / d, uy = dx / d; // perpendicular a la cuerda
        var sg = sol ? -1 : 1;
        return { cx: mx + sg * h * ux, cy: my + sg * h * uy, r: r, alt: { cx: mx - sg * h * ux, cy: my - sg * h * uy } };
      }
      // Rectangulo por 2 esquinas OPUESTAS (lados paralelos a X/Y).
      function tcRectFrom2(a, b) {
        var w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
        if (w < 0.5 || h < 0.5) return null;
        return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, w: w, h: h, angle: 0, squareErr: 0 };
      }

      // ---- Editor (2026-10-09, request "advanced but lightweight graphic editor") ----
      // Besides line/rectangle/circle there is a general "path" type
      // ({pts:[{x,y}], closed}) -- what remains when ROTATING a rectangle or
      // scaling a circle differently in X than in Y. Every transformation goes
      // through tcTransformShape(s, f, kind): f maps a point; kind says whether it is
      // a move/uniform scale/rotation (to keep circles and
      // rectangles when possible).
      function tcCirclePts(cx, cy, r) {
        var out = [];
        var n = Math.max(32, Math.min(256, Math.round(r * 4)));
        for (var i = 0; i < n; i++) {
          var t = (2 * Math.PI * i) / n;
          out.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
        }
        return out;
      }
      function tcToPath(s) {
        if (s.type === "path") return s;
        var b = { type: "path", closed: s.type !== "line" };
        if (s.type === "line") b.pts = [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }];
        else if (s.type === "rect" && s.rr > 0) b.pts = tcShapePath(s).slice(0, -1);
        else if (s.type === "rect") b.pts = [{ x: s.x, y: s.y }, { x: s.x + s.w, y: s.y }, { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h }];
        else b.pts = tcCirclePts(s.cx, s.cy, s.r);
        return b;
      }
      // kind: {move:true} | {scale:[sx,sy]} | {rotate:true}
      function tcTransformShape(s, f, kind) {
        var o = JSON.parse(JSON.stringify(s));
        function keep(g) {
          ["id", "power", "speed", "passes", "layer", "fixed"].forEach(function (k) {
            if (o[k] !== undefined) g[k] = o[k];
          });
          return g;
        }
        if (o.type === "line") {
          var a = f({ x: o.x1, y: o.y1 }), b = f({ x: o.x2, y: o.y2 });
          o.x1 = a.x; o.y1 = a.y; o.x2 = b.x; o.y2 = b.y;
          return o;
        }
        if (o.type === "circle") {
          var uni = kind.move || kind.rotate || (kind.scale && Math.abs(Math.abs(kind.scale[0]) - Math.abs(kind.scale[1])) < 1e-9);
          if (uni) {
            var c = f({ x: o.cx, y: o.cy });
            o.cx = c.x; o.cy = c.y;
            if (kind.scale) o.r = Math.max(0.05, o.r * Math.abs(kind.scale[0]));
            return o;
          }
        }
        if (o.type === "rect" && !kind.rotate) {
          var p1 = f({ x: o.x, y: o.y }), p2 = f({ x: o.x + o.w, y: o.y + o.h });
          o.x = Math.min(p1.x, p2.x); o.y = Math.min(p1.y, p2.y);
          o.w = Math.abs(p2.x - p1.x); o.h = Math.abs(p2.y - p1.y);
          if (o.rr > 0 && kind.scale) o.rr = o.rr * Math.min(Math.abs(kind.scale[0]), Math.abs(kind.scale[1]));
          return o;
        }
        var pth = keep(tcToPath(o));
        pth.pts = pth.pts.map(f);
        return pth;
      }
      function tcMoveFn(dx, dy) {
        return function (q) { return { x: q.x + dx, y: q.y + dy }; };
      }
      function tcScaleFn(sx, sy, ox, oy) {
        return function (q) { return { x: ox + (q.x - ox) * sx, y: oy + (q.y - oy) * sy }; };
      }
      function tcRotateFn(deg, ox, oy) {
        var r = (deg * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
        return function (q) {
          var dx = q.x - ox, dy = q.y - oy;
          return { x: ox + dx * c - dy * sn, y: oy + dx * sn + dy * c };
        };
      }
      function tcPointInPoly(p, pts) {
        var inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          var a = pts[i], b = pts[j];
          if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
        }
        return inside;
      }

      // Path of a shape in bed coordinates (list of points).
      function tcShapePath(s) {
        if (s.type === "path") {
          var pp = (s.pts || []).map(function (q) { return { x: q.x, y: q.y }; });
          if (s.closed && pp.length > 2) pp.push({ x: pp[0].x, y: pp[0].y });
          return pp;
        }
        if (s.type === "line") return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }];
        if (s.type === "rect" && s.rr > 0) {
          // rounded corners: 4 arcs of radius rr (limited to half the shorter side)
          var rr = Math.min(s.rr, s.w / 2, s.h / 2);
          var nA = Math.max(4, Math.min(24, Math.round(rr * 2)));
          var cs = [
            { cx: s.x + s.w - rr, cy: s.y + rr, a0: -90 },
            { cx: s.x + s.w - rr, cy: s.y + s.h - rr, a0: 0 },
            { cx: s.x + rr, cy: s.y + s.h - rr, a0: 90 },
            { cx: s.x + rr, cy: s.y + rr, a0: 180 },
          ];
          var outR = [];
          cs.forEach(function (c) {
            for (var i = 0; i <= nA; i++) {
              var t = ((c.a0 + (90 * i) / nA) * Math.PI) / 180;
              outR.push({ x: c.cx + rr * Math.cos(t), y: c.cy + rr * Math.sin(t) });
            }
          });
          outR.push({ x: outR[0].x, y: outR[0].y });
          return outR;
        }
        if (s.type === "rect")
          return [
            { x: s.x, y: s.y },
            { x: s.x + s.w, y: s.y },
            { x: s.x + s.w, y: s.y + s.h },
            { x: s.x, y: s.y + s.h },
            { x: s.x, y: s.y },
          ];
        if (s.type === "circle") {
          // polygon with chord error <= 0.02 mm (between 24 and 720 sides);
          // it starts at the rightmost point and closes there.
          var tol = 0.02;
          var n = Math.ceil((2 * Math.PI) / (2 * Math.acos(Math.max(-1, 1 - tol / Math.max(s.r, tol)))));
          n = Math.max(24, Math.min(720, n || 24));
          var out = [];
          for (var i = 0; i <= n; i++) {
            var t = (2 * Math.PI * i) / n;
            out.push({ x: s.cx + s.r * Math.cos(t), y: s.cy + s.r * Math.sin(t) });
          }
          return out;
        }
        return [];
      }
      function tcBBox(shapes) {
        var b = null;
        shapes.forEach(function (s) {
          tcShapePath(s).forEach(function (p) {
            if (!b) b = { xmin: p.x, xmax: p.x, ymin: p.y, ymax: p.y };
            b.xmin = Math.min(b.xmin, p.x); b.xmax = Math.max(b.xmax, p.x);
            b.ymin = Math.min(b.ymin, p.y); b.ymax = Math.max(b.ymax, p.y);
          });
        });
        return b;
      }
      function tcPathLen(pts) {
        var L = 0;
        for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        return L;
      }

      var tcShiftDown = false;

      // Foldable sections of the Laser editor (2026-10-09, "it looks very tight
      // and confusing"): title + summary on the right; tapping the title folds.
      // What is folded is remembered on THIS screen.
      var TC_SECTIONS_KEY = "workshopEditorSections";
      function tcSectionState() {
        try {
          return JSON.parse(localStorage.getItem(TC_SECTIONS_KEY) || "{}") || {};
        } catch (e) {
          return {};
        }
      }
      // techOnly: a section only the Technician view shows (advanced layers / shapes of the editor, 20-role-view.js)
      function tcSection(parent, key, title, summary, defaultOpen, onToggle, techOnly) {
        var st = tcSectionState();
        var open = st[key] === undefined ? defaultOpen : !!st[key];
        var box = tzEl("div", "tc-sec");
        if (techOnly) tzTechOnly(box);
        var head = tzEl("div", "tc-sec-head");
        head.appendChild(tzEl("span", "tc-sec-arrow", open ? "▾" : "▸"));
        head.appendChild(tzEl("span", "tc-sec-title", title));
        if (summary) head.appendChild(tzEl("span", "tc-sec-sum", summary));
        head.addEventListener("click", function () {
          var s2 = tcSectionState();
          s2[key] = !open;
          try {
            localStorage.setItem(TC_SECTIONS_KEY, JSON.stringify(s2));
          } catch (e) {
            /* no critico */
          }
          if (onToggle) onToggle();
        });
        box.appendChild(head);
        var body = tzEl("div", "tc-sec-body");
        body.style.display = open ? "" : "none";
        box.appendChild(body);
        parent.appendChild(box);
        return body;
      }
      // Find center: methods (what is measured, name, when it serves, taps).
      var TC_CENTER_METHODS = {
        circle: { kind: "round", c: i18nT('cuts.3_points'), t: i18nT('cuts.3_or_more_points_on_the'), d: i18nT('cuts.the_most_accurate_with_more_than'), n: i18nT('cuts.3_touches'), rec: true },
        circle2: { kind: "round", c: i18nT('cuts.2_points_diameter'), t: i18nT('cuts.2_points_diameter'), d: i18nT('cuts.if_you_already_know_the_diameter'), n: i18nT('cuts.2_touches') },
        rect: { kind: "rect", c: i18nT('cuts.3_corners'), t: i18nT('cuts.3_corners'), d: i18nT('cuts.any_order_also_detects_if_the'), n: i18nT('cuts.3_touches_2'), rec: true },
        edges: { kind: "rect", c: i18nT('cuts.4_edges'), t: i18nT('cuts.4_edges'), d: i18nT('cuts.one_touch_on_each_side_works'), n: i18nT('cuts.4_touches') },
        rect2: { kind: "rect", c: i18nT('cuts.2_corners'), t: i18nT('cuts.2_opposite_corners'), d: i18nT('cuts.quick_if_the_sides_are_straight'), n: i18nT('cuts.2_touches') },
        rect1: { kind: "rect", c: i18nT('cuts.1_corner_size'), t: i18nT('cuts.1_corner_size'), d: i18nT('cuts.if_you_already_know_the_part'), n: i18nT('cuts.1_touch') },
        mid: { kind: "middle", c: i18nT('cuts.midpoint'), t: i18nT('cuts.midpoint'), d: i18nT('cuts.the_middle_between_two_points_a'), n: i18nT('cuts.2_touches') },
        camera: { kind: "*", c: i18nT('cuts.camera'), t: i18nT('cuts.the_camera_measures_the_whole_part'), d: i18nT('cuts.takes_a_photo_detects_whole_holes'), n: i18nT('cuts.no_touches') },
      };
      // Small drawing of where to tap: the numbered points; the next one
      // highlighted (n = points already captured; -1 = only the drawing).
      function tcCenterSvg(mode, n, o) {
        var NS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 120 70");
        function el(tag, at) {
          var e = document.createElementNS(NS, tag);
          Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); });
          svg.appendChild(e);
          return e;
        }
        var ln = { fill: "none", stroke: "currentColor", "stroke-opacity": "0.55", "stroke-width": "2" };
        var pts = [];
        if (mode === "circle" || mode === "circle2") {
          el("circle", Object.assign({ cx: 60, cy: 35, r: 26 }, ln));
          var ang = mode === "circle" ? [200, 320, 80] : [190, 350];
          pts = ang.map(function (a) { return [60 + 26 * Math.cos((a * Math.PI) / 180), 35 - 26 * Math.sin((a * Math.PI) / 180)]; });
          if (mode === "circle2") el("line", { x1: 34, y1: 66, x2: 86, y2: 66, stroke: "currentColor", "stroke-opacity": "0.5", "stroke-dasharray": "3 2" });
        } else if (mode === "rect" || mode === "rect2" || mode === "rect1" || mode === "edges") {
          el("rect", Object.assign({ x: 22, y: 12, width: 76, height: 46, rx: mode === "edges" ? 8 : 1 }, ln));
          if (mode === "rect") pts = [[22, 58], [98, 58], [98, 12]];
          else if (mode === "rect2") {
            pts = [[22, 58], [98, 12]];
            el("line", { x1: 22, y1: 58, x2: 98, y2: 12, stroke: "currentColor", "stroke-opacity": "0.35", "stroke-dasharray": "3 2" });
          } else if (mode === "rect1") {
            pts = [[22, 58]];
            el("line", { x1: 22, y1: 66, x2: 98, y2: 66, stroke: "currentColor", "stroke-opacity": "0.5", "stroke-dasharray": "3 2" });
            el("line", { x1: 106, y1: 12, x2: 106, y2: 58, stroke: "currentColor", "stroke-opacity": "0.5", "stroke-dasharray": "3 2" });
          } else pts = [[22, 30], [98, 42], [48, 58], [74, 12]];
        } else if (mode === "mid") {
          el("line", { x1: 20, y1: 50, x2: 100, y2: 20, stroke: "currentColor", "stroke-opacity": "0.35", "stroke-dasharray": "3 2" });
          pts = [[20, 50], [100, 20]];
        } else if (mode === "camera") {
          el("rect", Object.assign({ x: 30, y: 18, width: 60, height: 40, rx: 6 }, ln));
          el("circle", Object.assign({ cx: 60, cy: 38, r: 12 }, ln));
          el("rect", Object.assign({ x: 50, y: 12, width: 20, height: 6, rx: 2 }, ln));
        }
        var done = n >= pts.length && pts.length > 0 && mode !== "circle" ? true : mode === "circle" && n >= 3;
        if (done || n < 0 || mode === "camera") {
          // centro: cruz
          if (mode !== "camera") {
            var c = mode === "mid" ? [60, 35] : [60, 35];
            el("line", { x1: c[0] - 6, y1: c[1], x2: c[0] + 6, y2: c[1], stroke: "#00e5ff", "stroke-width": "2" });
            el("line", { x1: c[0], y1: c[1] - 6, x2: c[0], y2: c[1] + 6, stroke: "#00e5ff", "stroke-width": "2" });
          }
        }
        pts.forEach(function (q, i) {
          var hecho = o ? !!o.done[i] : n > i;
          var sig = o ? o.sig === i : n === i || (mode === "edges" && n % 4 === i && n < 4);
          // with o.pick: tapping the number chooses which point is captured (2026-10-11)
          if (o && o.pick) {
            var hit = el("circle", { cx: q[0], cy: q[1], r: 12, fill: "transparent", style: "cursor:pointer" });
            hit.addEventListener("click", function () { o.pick(i); });
          }
          var cc = el("circle", { cx: q[0], cy: q[1], r: sig ? 8 : 6.5, fill: hecho ? "#00e5ff" : sig ? "#ffb300" : "#37474f", stroke: sig ? "#ffe082" : "#fff", "stroke-width": sig ? "2" : "1" });
          var t = el("text", { x: q[0], y: q[1] + 3.5, "text-anchor": "middle", "font-size": "9", "font-weight": "bold", fill: hecho ? "#003238" : "#fff" });
          t.textContent = String(i + 1);
          if (o && o.pick) {
            [cc, t].forEach(function (x) {
              x.style.cursor = "pointer";
              x.addEventListener("click", function () { o.pick(i); });
            });
          }
        });
        return svg;
      }

      var TC_CSS_ID = "tc-editor-css";
      function tcEnsureCss() {
        if (document.getElementById(TC_CSS_ID)) return;
        var st = document.createElement("style");
        st.id = TC_CSS_ID;
        st.textContent = workshopCss([
          ".tc-sec{border:1px solid rgba(255,255,255,0.12);border-radius:8px;margin-top:10px;background:rgba(255,255,255,0.02);}",
          ".tc-sec-head{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;user-select:none;}",
          ".tc-sec-head:hover{background:rgba(255,255,255,0.04);}",
          ".tc-sec-arrow{width:12px;color:rgba(255,255,255,0.5);font-size:12px;}",
          ".tc-sec-title{font-size:14px;font-weight:500;}",
          ".tc-sec-sum{margin-left:auto;font-size:12px;color:rgba(255,255,255,0.55);}",
          ".tc-sec-body{padding:2px 10px 10px 10px;}",
          ".tc-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0;}",
          ".tc-layers{display:flex;flex-direction:column;gap:4px;}",
          ".tc-layer{display:grid;grid-template-columns:28px minmax(60px,1fr) minmax(46px,64px) minmax(54px,78px) minmax(44px,58px);gap:4px;align-items:center;padding:4px 6px;min-width:0;box-sizing:border-box;border-radius:6px;border:1px solid rgba(255,255,255,0.12);border-left-width:3px;}",
          ".tc-layer.active{border-color:#1976d2;background:rgba(25,118,210,0.14);}",
          ".tc-layer.apagada{opacity:0.6;}",
          ".tc-layer-cab{border:none;padding:0 6px;font-size:11px;color:var(--tz-t2,rgba(255,255,255,0.7));}",
          ".tc-layer-acc{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:4px;}",
          ".tc-layer-nom{display:flex;flex-direction:column;min-width:0;}",
          ".tc-layer-nb{background:none;border:none;color:inherit;font:inherit;font-weight:500;text-align:left;padding:0;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
          ".tc-layer .tz-input{width:100%;box-sizing:border-box;min-width:0;}",
          ".tc-color{width:28px;height:28px;padding:0;border:none;background:none;cursor:pointer;}",
          ".tc-layer-more{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 8px;margin:-2px 0 2px 0;border-radius:6px;background:rgba(255,255,255,0.05);}",
          ".theme--light .tc-layer{border-color:rgba(0,0,0,0.14);}",
          ".theme--light .tc-layer.active{border-color:#1976d2;background:rgba(25,118,210,0.08);}",
          ".theme--light .tc-layer-more{background:rgba(0,0,0,0.04);}",
          ".tc-group{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:4px 6px;border-radius:6px;background:rgba(255,255,255,0.05);}",
          ".tc-glabel{font-size:11px;color:rgba(255,255,255,0.5);margin-right:2px;text-transform:uppercase;letter-spacing:0.04em;}",
          ".tc-hint{font-size:12px;color:rgba(255,255,255,0.6);margin:4px 0;}",
          ".tc-inline{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;}",
          ".tc-inline label{display:block;font-size:11px;color:rgba(255,255,255,0.6);}",
          ".tc-inline input{width:84px;}",
          ".tc-floating{position:absolute;top:8px;left:8px;z-index:6;display:flex;flex-direction:column;gap:4px;padding:4px;border-radius:8px;background:rgba(30,39,44,0.92);border:1px solid rgba(255,255,255,0.18);box-shadow:0 2px 8px rgba(0,0,0,0.4);}",
          ".tc-ft{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:1px solid transparent;border-radius:6px;background:transparent;color:#eceff1;cursor:pointer;font-size:22px;line-height:1;padding:0;}",
          ".tc-ft:hover{background:rgba(255,255,255,0.1);}",
          ".tc-ft.on{background:#e65100;border-color:#ff7043;color:#fff;}",
          ".tc-ft-sep{height:1px;margin:2px 4px;background:rgba(255,255,255,0.18);}",
          ".tc-floating-sel{top:auto;left:50%;bottom:8px;transform:translateX(-50%);flex-direction:row;align-items:center;}",
          ".tc-floating-sel .tc-ft-sep{width:1px;height:28px;margin:0 4px;}",
          ".tc-ft-layer{max-width:150px;height:36px;}",
          ".tc-actions{position:sticky;bottom:0;z-index:4;margin-top:8px;padding:8px 0 4px;background:#1e272c;box-shadow:0 -8px 10px -6px rgba(0,0,0,0.45);}",
          ".theme--light .tc-actions{background:#fff;box-shadow:0 -8px 10px -6px rgba(0,0,0,0.2);}",
          ".tc-guide{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(230,81,0,0.08);border:1px dashed rgba(255,138,80,0.5);font-size:12px;}",
          ".tc-guide b{color:#ff8a50;}",
          ".theme--light .tc-sec{border-color:rgba(0,0,0,0.14);background:#fafafa;}",
          ".theme--light .tc-sec-head:hover{background:rgba(0,0,0,0.04);}",
          ".theme--light .tc-sec-arrow{color:#757575;}",
          ".theme--light .tc-sec-sum{color:#616161;}",
          ".theme--light .tc-group{background:#eceff1;}",
          ".theme--light .tc-glabel{color:#607d8b;}",
          ".theme--light .tc-hint,.theme--light .tc-inline label{color:#616161;}",
          ".theme--light .tc-guide{background:rgba(230,81,0,0.06);border-color:rgba(230,81,0,0.45);}",
          ".theme--light .tc-guide b{color:#e65100;}",
          // Find center (redesign 2026-10-10): cards with a drawing of where to tap
          ".tc-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(150px,100%),1fr));gap:8px;margin:8px 0;}",
          ".tc-tile{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:10px;border-radius:8px;min-width:0;max-width:100%;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere;height:auto;text-transform:none;letter-spacing:normal;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:inherit;cursor:pointer;font:inherit;}",
          ".tc-tile:hover{border-color:#00e5ff;background:rgba(0,229,255,0.07);}",
          ".tc-tile svg{width:100%;max-width:120px;height:70px;align-self:center;}",
          ".tc-tile-t{font-size:14px;font-weight:600;}",
          ".tc-tile-d{font-size:12px;color:var(--tz-t2,rgba(255,255,255,0.7));line-height:1.3;}",
          ".tc-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;}",
          ".tc-chip{font-size:11px;padding:1px 7px;border-radius:10px;background:rgba(255,255,255,0.08);color:var(--tz-t2,rgba(255,255,255,0.7));}",
          ".tc-chip.rec{background:rgba(0,229,255,0.16);color:#80deea;}",
          ".tc-back{background:none;border:none;color:#80deea;cursor:pointer;font:inherit;font-size:12px;padding:0;margin:2px 0;}",
          ".tc-run{display:flex;gap:10px;align-items:center;margin:6px 0;padding:8px;border-radius:8px;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.3);}",
          ".tc-run svg{width:150px;height:88px;flex:none;}",
          ".tc-chipbar{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}",
          ".tc-chipb{padding:3px 11px;min-height:30px;border-radius:15px;border:1px solid rgba(255,255,255,0.22);background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer;text-transform:none;letter-spacing:normal;}",
          ".tc-chipb.on{background:#00838f;border-color:#00e5ff;color:#fff;}",
          ".tc-chipbar.metodos .tc-chipb{min-height:26px;font-size:12px;}",
          ".tc-cdlg{position:fixed;z-index:2000;width:250px;background:#1e272c;color:#eceff1;border:1px solid rgba(0,229,255,0.5);border-radius:10px;padding:10px;box-shadow:0 6px 20px rgba(0,0,0,0.55);font:12.5px Roboto,sans-serif;line-height:1.35;}",
          ".tc-cdlg .t{font-weight:600;color:#80deea;margin-bottom:2px;}",
          ".tc-cdlg .tz-row{gap:4px;margin-top:8px;flex-wrap:wrap;}",
          ".theme--light .tc-chipb{border-color:rgba(0,0,0,0.2);}",
          ".theme--light .tc-chipb.on{background:#00838f;color:#fff;}",
          ".tc-run-t{font-size:13px;font-weight:600;}",
          ".tc-next{font-size:15px;font-weight:600;color:#80deea;margin-top:2px;}",
          ".tc-dots{display:flex;gap:4px;margin-top:4px;}",
          ".tc-dot{width:10px;height:10px;border-radius:50%;border:1px solid #80deea;}",
          ".tc-dot.on{background:#00e5ff;border-color:#00e5ff;}",
          ".theme--light .tc-tile{border-color:rgba(0,0,0,0.14);background:#fff;}",
          ".theme--light .tc-tile:hover{border-color:#00838f;background:rgba(0,131,143,0.06);}",
          ".theme--light .tc-chip{background:#eceff1;color:#455a64;}",
          ".theme--light .tc-chip.rec{background:rgba(0,131,143,0.12);color:#00695c;}",
          ".theme--light .tc-back,.theme--light .tc-next{color:#00838f;}",
          ".theme--light .tc-run{background:rgba(0,131,143,0.06);border-color:rgba(0,131,143,0.35);}",
          ".theme--light .tc-dot{border-color:#00838f;}.theme--light .tc-dot.on{background:#00838f;}",
        ].join(""));
        document.head.appendChild(st);
      }

      // ---- Import SVG (2026-10-09) ----
      // The browser does the hard part: the SVG is put into a hidden <svg> of the
      // page and each shape (path, rect, circle, ellipse, line, polyline,
      // polygon) is walked with getTotalLength/getPointAtLength, applying
      // its transformations (getCTM). Each subpath of a <path> (each "M")
      // is a separate shape. Units: if the SVG says width="...mm" + viewBox
      // it is respected; otherwise, 96 px per inch (Inkscape/browser). The SVG's Y
      // goes down; on the bed it goes up: it is inverted.
      function tcSimplify(pts, tol) {
        if (pts.length < 3) return pts;
        var keep = new Array(pts.length);
        keep[0] = keep[pts.length - 1] = true;
        var stack = [[0, pts.length - 1]];
        while (stack.length) {
          var se = stack.pop(), a = pts[se[0]], b = pts[se[1]], md = -1, mi = -1;
          for (var i = se[0] + 1; i < se[1]; i++) {
            var d = tcSecDist(pts[i], a, b);
            if (d > md) { md = d; mi = i; }
          }
          if (md > tol) {
            keep[mi] = true;
            stack.push([se[0], mi], [mi, se[1]]);
          }
        }
        return pts.filter(function (q, i) { return keep[i]; });
      }
      function tcSvgUnitMm(v) {
        var m = /^\s*([\d.]+)\s*(mm|cm|in|pt|px)?\s*$/.exec(String(v || ""));
        if (!m) return null;
        var n = parseFloat(m[1]);
        return n * ({ mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, px: 25.4 / 96 }[m[2] || "px"]);
      }
      // Devuelve [{pts:[{x,y}] en mm (Y hacia arriba), closed, color}]
      function tcParseSvg(text) {
        var doc = new DOMParser().parseFromString(text, "image/svg+xml");
        var root = doc.documentElement;
        if (!root || root.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) throw new Error(i18nT('cuts.is_not_a_valid_svg'));
        // escala usuario -> mm
        var vb = (root.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
        var wmm = tcSvgUnitMm(root.getAttribute("width"));
        var k = 25.4 / 96;
        if (vb.length === 4 && vb[2] > 0 && wmm) k = wmm / vb[2];
        var host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        host.setAttribute("style", "position:fixed;left:-10000px;top:0;width:10px;height:10px;opacity:0;pointer-events:none;");
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        host.appendChild(g);
        // copy the content (without the root <svg>: its viewBox is already in k)
        Array.prototype.forEach.call(root.childNodes, function (n) { g.appendChild(document.importNode(n, true)); });
        if (vb.length === 4) g.setAttribute("transform", "translate(" + -vb[0] + "," + -vb[1] + ")");
        document.body.appendChild(host);
        var out = [];
        try {
          var els = g.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
          var tol = 0.05 / k; // muestreo fino en unidades del SVG (~0.05 mm)
          Array.prototype.forEach.call(els, function (el) {
            if (el.closest("defs, clipPath, mask, symbol, marker, pattern")) return;
            var cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") return;
            var color = cs.stroke && cs.stroke !== "none" ? cs.stroke : cs.fill && cs.fill !== "none" ? cs.fill : "#000";
            var ctm = el.getCTM ? el.getCTM() : null;
            var gctm = g.getCTM ? g.getCTM() : null;
            var M = ctm && gctm ? gctm.inverse().multiply(ctm) : ctm; // relative to the group (without the screen position)
            var map = function (q) {
              var x = q.x, y = q.y;
              if (M) { var nx = M.a * x + M.c * y + M.e; y = M.b * x + M.d * y + M.f; x = nx; }
              if (vb.length === 4) { x += vb[0]; y += vb[1]; }
              return { x: x * k, y: -y * k };
            };
            // subpaths: each M/m of a path starts a new shape
            var subs = [];
            if (el.nodeName.toLowerCase() === "path") {
              var d = el.getAttribute("d") || "";
              var parts = d.match(/[Mm][^Mm]*/g) || [];
              var acc = "";
              parts.forEach(function (part) {
                var prev = acc;
                acc += part + " ";
                subs.push({ prev: prev, cur: acc, closed: /[Zz]\s*$/.test(part.trim()) });
              });
            } else subs.push(null);
            subs.forEach(function (sp) {
              var pe = el, L0 = 0, L1;
              if (sp) {
                pe = document.createElementNS("http://www.w3.org/2000/svg", "path");
                pe.setAttribute("d", sp.cur);
                g.appendChild(pe);
                if (sp.prev) {
                  var pp = document.createElementNS("http://www.w3.org/2000/svg", "path");
                  pp.setAttribute("d", sp.prev);
                  g.appendChild(pp);
                  L0 = pp.getTotalLength();
                  pp.remove();
                }
              }
              L1 = pe.getTotalLength ? pe.getTotalLength() : 0;
              var tag = el.nodeName.toLowerCase();
              var closed = sp ? sp.closed : tag !== "line" && tag !== "polyline";
              var n = Math.max(2, Math.min(4000, Math.ceil((L1 - L0) / tol)));
              var pts = [];
              for (var i = 0; i <= n; i++) {
                var q = pe.getPointAtLength(Math.min(L1, L0 + (L0 > 0 ? 1e-4 : 0) + ((L1 - L0 - (L0 > 0 ? 1e-4 : 0)) * i) / n)); // right after the start of the subpath (at exact L0 it gives the end of the previous one)
                pts.push(map(q));
              }
              if (sp) pe.remove();
              if (pts.length < 2) return;
              pts = tcSimplify(pts, 0.03);
              var f = pts[0], l = pts[pts.length - 1];
              if (Math.hypot(f.x - l.x, f.y - l.y) < 0.05) { closed = true; pts.pop(); }
              if (pts.length < 2) return;
              out.push({ pts: pts, closed: closed && pts.length > 2, color: color });
            });
          });
        } finally {
          host.remove();
        }
        return out;
      }
      function tcRgbToHex(c) {
        var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || "");
        if (!m) return /^#[0-9a-f]{6}$/i.test(c || "") ? c.toLowerCase() : "#000000";
        return "#" + [m[1], m[2], m[3]].map(function (v) { return ("0" + parseInt(v, 10).toString(16)).slice(-2); }).join("");
      }


      function tcDescribe(s) {
        var f = function (v) { return (Math.round(v * 100) / 100).toString(); };
        if (s.type === "line") return i18nT('cuts.line_mm', { f: f(s.x1), f2: f(s.y1), f3: f(s.x2), f4: f(s.y2), f5: f(Math.hypot(s.x2 - s.x1, s.y2 - s.y1)) });
        if (s.type === "rect") return i18nT('cuts.rectangle_x_from', { f: f(s.w), f2: f(s.h), v: s.rr > 0 ? i18nT('cuts.corners_r', { f: f(s.rr) }) : "", f3: f(s.x), f4: f(s.y) });
        if (s.type === "circle") return i18nT('cuts.circle_diam_centre', { f: f(s.r * 2), f2: f(s.cx), f3: f(s.cy) });
        if (s.type === "path") {
          var bb = tcBBox([s]);
          return i18nT('cuts.points_3', { v: s.closed ? i18nT('cuts.outline') : i18nT('cuts.polyline_2'), n: (s.pts || []).length, v2: bb ? ", " + f(bb.xmax - bb.xmin) + " x " + f(bb.ymax - bb.ymin) : "" });
        }
        return "?";
      }
      // The same for the comments of the generated job (always English).
      function tcDescribeGcode(s) {
        var f = function (v) { return (Math.round(v * 100) / 100).toString(); };
        if (s.type === "line") return "Line (" + f(s.x1) + "," + f(s.y1) + ") -> (" + f(s.x2) + "," + f(s.y2) + "), " + f(Math.hypot(s.x2 - s.x1, s.y2 - s.y1)) + " mm";
        if (s.type === "rect") return "Rectangle " + f(s.w) + " x " + f(s.h) + (s.rr > 0 ? " (corners R" + f(s.rr) + ")" : "") + " from (" + f(s.x) + "," + f(s.y) + ")";
        if (s.type === "circle") return "Circle diam " + f(s.r * 2) + " center (" + f(s.cx) + "," + f(s.cy) + ")";
        if (s.type === "path") {
          var bb = tcBBox([s]);
          return (s.closed ? "Outline " : "Polyline ") + (s.pts || []).length + " points" + (bb ? ", " + f(bb.xmax - bb.xmin) + " x " + f(bb.ymax - bb.ymin) : "");
        }
        return "?";
      }
      function tcMoveCenterTo(s, x, y) {
        if (s.type === "path") {
          var bb = tcBBox([s]);
          var dx = x - (bb.xmin + bb.xmax) / 2, dy = y - (bb.ymin + bb.ymax) / 2;
          s.pts = s.pts.map(function (q) { return { x: q.x + dx, y: q.y + dy }; });
          return;
        }
        if (s.type === "circle") { s.cx = x; s.cy = y; }
        else if (s.type === "rect") { s.x = x - s.w / 2; s.y = y - s.h / 2; }
        else if (s.type === "line") {
          var mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
          s.x1 += x - mx; s.x2 += x - mx; s.y1 += y - my; s.y2 += y - my;
        }
      }
      function tcSecDist(p, a, b) {
        var dx = b.x - a.x, dy = b.y - a.y;
        var L2 = dx * dx + dy * dy;
        var t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0;
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
      }
