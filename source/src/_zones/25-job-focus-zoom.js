      function tzFocusZoomToJob(pjf, force) {
        var ti = pjf.nav.module("job").info();
        if (!ti || !ti.bbox || !pjf.view.mapFull()) return false;
        var b = ti.bbox;
        var w = Math.max(b.xmax - b.xmin, 60), h = Math.max(b.ymax - b.ymin, 60);
        var cx = (b.xmin + b.xmax) / 2, cy = (b.ymin + b.ymax) / 2;
        var vw = Math.max(w, (h * pjf.view.mapFull().w) / pjf.view.mapFull().h) * 1.6; // margen alrededor
        if (vw >= pjf.view.mapFull().w * 0.85 && !force) return false; // it already takes up almost the whole bed
        var vh = vw * (pjf.view.mapFull().h / pjf.view.mapFull().w);
        pjf.view.setMapView(pjf.view.mapClampView({ x: cx - vw / 2, y: -cy - vh / 2, w: vw, h: vh }));
        pjf.view.setFocusZoom(!!pjf.view.mapView());
        pjf.view.paintZoomLbl();
        return pjf.view.focusZoom();
      }

      function tzFocusPaintBanner(pjf) {
        var bn = {};

        if (tzFocusBannerJob(pjf, bn)) return;
        tzFocusBannerButtons(pjf, bn);
      }


      function tzFocusOtherMode(pjf) {
        if (pjf.otherZones !== "auto") return pjf.otherZones;
        return pjf.nav.layout() === "zones" ? "name" : "outline";
      }

      function tzFocusPaintOther(pjf) {
        pjf.otherBox.innerHTML = "";
        [["auto", i18nT('cuts.automatic')], ["outline", i18nT('zonesPage.outline_only')], ["name", i18nT('zonesPage.outline_and_name')], ["ocultas", i18nT('zonesPage.hidden_2')]].forEach(function (o) {
          var b = tzBtn(o[1], o[0] === pjf.otherZones ? "primary" : null, function () {
            pjf.otherZones = o[0];
            try {
              localStorage.setItem(pjf.TZ_OTHER_KEY, pjf.otherZones);
            } catch (e) {
              /* no critico */
            }
            tzFocusPaintOther(pjf);
            if (pjf.data.st()) pjf.shell.renderMap();
          });
          pjf.otherBox.appendChild(b);
        });
        pjf.otherBox.appendChild(tzEl("div", "tzm-ld", i18nT('zonesPage.the_active_zone_is_always_shown')));
      }

      // Zones (with a measure) that contain point p
      function tzFocusZonesAt(pjf, p) {
        var out = [];
        pjf.data.zones().forEach(function (z, i) {
          var sz = pjf.data.zoneSizes()[i];
          if (!z || !sz || !(sz.w > 0) || !(sz.h > 0)) return;
          if (tzFocusOtherMode(pjf) === "ocultas" && i !== pjf.data.st().wn) return;
          if (p.x >= z.refX && p.x <= z.refX + sz.w && p.y >= z.refY && p.y <= z.refY + sz.h) out.push(i);
        });
        return out;
      }

      function tzFocusBannerJob(pjf, bn) {
        var jr = pjf.data.jobRunning();
        if (jr !== pjf.cameraJobBefore) {
          pjf.cameraJobBefore = jr;
          if (!jr) pjf.camera.setForced(false);
          if (pjf.layerState.layers().camera) pjf.camera.map().sync(); // pause / resume the video of the camera layer
        }
        if (!pjf.data.jobRunning()) {
          pjf.banner.style.display = "none";
          pjf.bannerKey = "";
          if (pjf.view.focusZoom()) { pjf.view.setFocusZoom(false); pjf.view.setMapView(null); } // al terminar vuelve a toda la cama
          return true;
        }
        // when a job starts (and as soon as something is cut) the map zooms in by itself, once
        var jk = (pjf.data.st().liveJob ? "lb" + pjf.data.st().liveJob.since : "f" + ((pjf.data.st().job && pjf.data.st().job.file && pjf.data.st().job.file.fileName) || ""));
        if (jk !== pjf.focusJobKey && !pjf.viewTodo && pjf.nav.module("job").info() && pjf.nav.module("job").info().bbox) {
          pjf.focusJobKey = jk;
          if (tzFocusZoomToJob(pjf, false)) { setTimeout(function () { if (pjf.data.st()) pjf.shell.renderMap(); }, 0); }
        }
        // zoomed in and the cut goes out of view: rearrange so that everything fits
        else if (pjf.view.focusZoom() && pjf.view.mapView() && pjf.nav.module("job").info() && pjf.nav.module("job").info().bbox) {
          var tb = pjf.nav.module("job").info().bbox, mv = pjf.view.mapView(), mg = mv.w * 0.04;
          if (tb.xmin < mv.x + mg || tb.xmax > mv.x + mv.w - mg || -tb.ymax < mv.y + mg || -tb.ymin > mv.y + mv.h - mg) {
            if (tzFocusZoomToJob(pjf, true)) setTimeout(function () { if (pjf.data.st()) pjf.shell.renderMap(); }, 0);
          }
        }
        var j = pjf.data.st().job || {};
        var lbName = pjf.data.st().liveJob && pjf.data.st().liveJob.name && !workshopDefaultKey(pjf.data.st().liveJob.name, ["svc.live_job_default_name"]) ? " · " + pjf.data.st().liveJob.name : "";
        var name = pjf.data.st().liveJob ? i18nT('zonesPage.live_job_2', { lbName: lbName }) : String((j.file && j.file.fileName) || "").split("/").pop() || i18nT('job.job');
        var ti = pjf.nav.module("job").info();
        var carries = ti && ti.elapsed > 0 ? Math.floor(ti.elapsed / 60) : null;
        var size = j.file && j.file.size;
        bn.pct = !pjf.data.st().liveJob && size ? Math.max(0, Math.min(100, Math.round(((j.filePosition || 0) / size) * 100))) : null;
        var left = j.timesLeft ? j.timesLeft.file || j.timesLeft.slicer || null : null;
        bn.pHits = pjf.nav.module("job").hits(pjf.data.clampsAct());
        // 2026-10-12 (pending 6): last activity of the job opened with job.start (WorkshopService job_live.py)
        bn.lastAct = pjf.data.st().liveJob && pjf.data.st().liveJob.lastActivity ? (/T(\d\d:\d\d)/.exec(String(pjf.data.st().liveJob.lastActivity)) || [])[1] || null : null;
        var key = [name, bn.pct, left && Math.round(left / 60), pjf.data.st().status, pjf.data.st().wn, pjf.viewTodo, bn.pHits.join(","), carries, pjf.view.focusZoom(), bn.lastAct, tzLjBannerSig()].join("|");
        if (key === pjf.bannerKey) return true;
        pjf.bannerKey = key;
        pjf.banner.innerHTML = "";
        pjf.banner.style.display = "flex";
        if (bn.pct !== null) pjf.banner.appendChild(tzEl("b", null, bn.pct + "%"));
        var paused = pjf.data.st().status === "paused" || pjf.data.st().status === "pausing";
        pjf.banner.appendChild(tzEl("span", null, (paused ? i18nT('zonesPage.paused_2') : "") + name + " · " + TZ_CODES[pjf.data.st().wn] + (carries !== null ? i18nT('zonesPage.min_so_far', { v: carries < 1 ? "<1" : carries }) : "") + (left ? i18nT('zonesPage.min_left', { max: Math.max(1, Math.round(left / 60)) }) : "")));
        if (ti && ti.bbox) {
          var bz = tzBtn(pjf.view.focusZoom() ? i18nT('zonesPage.show_the_bed') : i18nT('zonesPage.zoom_to_the_job'), null, function () {
            if (pjf.view.focusZoom()) { pjf.view.setFocusZoom(false); pjf.view.setMapView(null); }
            else tzFocusZoomToJob(pjf, true);
            pjf.bannerKey = "";
            pjf.shell.renderMap();
          });
          tzTip(bz, i18nT('zonesPage.zooms_the_map_to_what_is'));
          pjf.banner.appendChild(bz);
        }
        bn.b = tzBtn(pjf.viewTodo ? i18nT('zonesPage.only_the_job') : i18nT('zonesPage.show_everything'), null, function () {
          pjf.viewTodo = !pjf.viewTodo;
          pjf.bannerKey = "";
          pjf.shell.renderMap();
        });
        tzTip(bn.b, i18nT('zonesPage.while_a_job_runs_the_map'));
      }

      function tzFocusBannerButtons(pjf, bn) {
        pjf.banner.appendChild(bn.b);
        // Close by hand a job opened with job.start (API) that did not receive the end
        // (live job cut off, file without the final line). Double tap (DESIGN.md): the Pi
        // closes it counting up to its last activity, not up to now.
        if (pjf.data.st().liveJob) {
          if (bn.lastAct) pjf.banner.appendChild(tzEl("span", null, i18nT('zonesPage.last_activity_2', { lastAct: bn.lastAct })));
          var bc = tzBtn(
            i18nT('zonesPage.close_job'),
            null,
            function () {
              workshopApiText("job.close").then(
                function (r) {
                  var t = String(r || "").trim();
                  pjf.shell.pageMessage(t, !/^(Error|Warning)/i.test(t));
                  pjf.data.refreshAll();
                },
                function (e) {
                  pjf.shell.pageMessage(i18nT('zonesPage.could_not_close_the_job_2', { e: e }), false);
                }
              );
            },
            i18nT('zonesPage.tap_again_close_the_job'),
            "close-job"
          );
          tzTip(bc, i18nT(workshopPathExists("/Plugins/Activity") ? 'zonesPage.closes_the_live_job_that_was' : 'zonesPage.closes_the_live_job_that_was_no_activity'));
          // the safe stop is in the header of the page (33-space-head.js), visible in every section
          pjf.banner.appendChild(bc);
        }
        if (bn.pHits.length) {
          var pw = tzEl("div", null, i18nT('zonesPage.the_path_goes_over_pause_if', { list: bn.pHits.map(function (k) { return pjf.data.clamps()[k].name || "prensa"; }).join(", ") }));
          pw.style.cssText = "flex:1 1 100%;color:#ef9a9a;font-weight:600;";
          pjf.banner.appendChild(pw);
        }
        if (bn.pct !== null) {
          var bp = tzEl("div", "bp");
          var bi = tzEl("i");
          bi.style.width = bn.pct + "%";
          bp.appendChild(bi);
          pjf.banner.appendChild(bp);
        }
      }
