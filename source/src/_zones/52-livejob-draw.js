      // ---- Live job: the path of an interrupted job on the map (2026-10-22) ----
      // While a row of the "Interrupted jobs" tab is selected its path is drawn by the map module of that tab (52-livejob-tool.js): what was cut
      // in amber, the travels grey and dashed, and a ring where it stopped. The record keeps the path in PROGRAM coordinates (tzLjPathSegments
      // puts it on the map); the laser correction applies only to a laser record (the beam lands at machine - correction).
      // lt = the state of the mounted tab ({ctx}: ctx.cut.correction() of the contract, 21-contract.js).
      function tzLjCorrectionOf(lt, rec) {
        var c = String((rec && rec.mode) || "").toLowerCase() === "laser" && lt.ctx.cut.correction ? lt.ctx.cut.correction() : null;
        return { cx: (c && c.cx) || 0, cy: (c && c.cy) || 0 };
      }

      function tzLjDraw(lt, node, w) {
        var s = tzLj();
        var rec = s.selected ? s.records.filter(function (r) { return r.id === s.selected; })[0] : null;
        var det = rec ? s.detail[rec.id] : null;
        if (!rec || !det || !det.path) return;
        var c = tzLjCorrectionOf(lt, rec);
        var sw = w / 300;
        tzLjPathSegments(det.path, rec, c).forEach(function (seg) {
          node("polyline", {
            points: seg.pts, fill: "none", stroke: seg.cut ? "#ffa726" : "#9e9e9e", "stroke-width": seg.cut ? sw * 1.6 : sw * 0.7,
            "stroke-opacity": seg.cut ? 0.95 : 0.5, "stroke-dasharray": seg.cut ? "" : w / 150 + " " + w / 150, "stroke-linejoin": "round",
          });
        });
        var pos = rec.position && rec.position.machine;
        if (pos && isFinite(pos.x) && isFinite(pos.y)) {
          node("circle", { cx: pos.x - c.cx, cy: -(pos.y - c.cy), r: sw * 5, fill: "none", stroke: "#ffca28", "stroke-width": sw * 2 });
        }
      }
