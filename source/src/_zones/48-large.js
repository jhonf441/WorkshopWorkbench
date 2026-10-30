      // ---- Zones > Large part: cut in parts what does not fit (2026-10-10) ----
      //
      // Request: "I want an assistant for parts that are larger than the cutting
      // area, based on the camera, as automatic as possible". The user
      // adds nothing to their design: they choose the G-code, place the piece and the assistant
      //   1. splits the design by the cutting area (done by the Pi:
      //      WorkshopService/dsf/pieza_grande.py, API bigpart.*),
      //   2. burns 3 registration crosses where they do not get in the way (it picks the place itself),
      //   3. cuts the part, asks to move the piece and shows where to,
      //   4. finds the crosses (Vision camera or pointer with the jog) and
      //      computes how much the piece shifted and rotated,
      //   5. cuts the next part corrected. Until finished.
      // T = {giro (degrees), tx, ty}: design -> bed (where the beam lands). The
      // state lives in localStorage (it survives reloading the page).

      var TG_KEY = "workshopLarge";
      var TG_PREVIEW = "0:/sys/workshop/data/big-part.json";
      var TG_ERROR_OK = 0.6; // mm: more than this between the measured marks = check

      // API bigpart.<op> of WorkshopService (the old Spanish action names map here)
      var TG_OPS = { read: "read", counts: "counts", marks: "marks", part: "part", adjust: "fit" };
      function tgPi(action, datos) {
        return workshopApiText("bigpart." + (TG_OPS[action] || action), { data: datos || {} })
          .then(function (t) {
            var k = t.indexOf("{");
            if (k < 0) throw new Error(t.trim() || i18nT('large.no_response_from_the_system_service'));
            var d = JSON.parse(t.slice(k));
            if (d.ok === false) throw new Error(d.error || "error");
            return d;
          });
      }
      // geometria (igual que pieza_grande.py)
      function tgApply(T, x, y) {
        var a = ((T.rotation || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        return [c * x - s * y + (T.tx || 0), s * x + c * y + (T.ty || 0)];
      }
      function tgInverse(T, x, y) {
        var a = ((T.rotation || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        x -= T.tx || 0;
        y -= T.ty || 0;
        return [c * x + s * y, -s * x + c * y];
      }
      function tgRegion(T, A) {
        return [tgInverse(T, A.xmin, A.ymin), tgInverse(T, A.xmax, A.ymin), tgInverse(T, A.xmax, A.ymax), tgInverse(T, A.xmin, A.ymax)];
      }
      function tgInside(poly, ax, ay, bx, by) {
        var t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay;
        for (var i = 0; i < poly.length; i++) {
          var p = poly[i], q = poly[(i + 1) % poly.length];
          var nx = q[1] - p[1], ny = -(q[0] - p[0]);
          var num = nx * (ax - p[0]) + ny * (ay - p[1]);
          var den = nx * dx + ny * dy;
          if (Math.abs(den) < 1e-12) {
            if (num > 0) return null;
            continue;
          }
          var t = -num / den;
          if (den > 0) t1 = Math.min(t1, t);
          else t0 = Math.max(t0, t);
          if (t0 >= t1) return null;
        }
        return [t0, t1];
      }
      function tgSubtract(iv, remove) {
        var out = [iv];
        remove.forEach(function (q) {
          var nuevo = [];
          out.forEach(function (r) {
            if (q[1] <= r[0] || q[0] >= r[1]) return nuevo.push(r);
            if (q[0] > r[0]) nuevo.push([r[0], q[0]]);
            if (q[1] < r[1]) nuevo.push([q[1], r[1]]);
          });
          out = nuevo;
        });
        return out.filter(function (r) { return r[1] - r[0] > 1e-9; });
      }

      function tgMountLarge(ctx) {
        var tg = { ctx: ctx };
        tgGrStart(tg);
        return tgGrApi(tg);
      }
