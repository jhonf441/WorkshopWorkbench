      // ---- Active zone: the card (state read, redraw key, the blocks in order) ----
      function tzActRender(za) {
        var zr = tzActReadState(za);
        if (!zr) return;
        var key = tzActRenderKey(za, zr);
        if (key === za.lastKey) return;
        if (tzEditing(za.ctx.card)) return tzRedrawOnRelease(za.ctx.card, tzBind(tzActRender, za)); // a field has the focus: redo it when released (14-editing.js)
        za.lastKey = key;
        zr.card = za.ctx.card;
        zr.card.innerHTML = "";
        zr.card.classList.add("za-card");
        tzActHead(za, zr);
        tzActHeight(za, zr);
        tzActOrigin(za, zr);
        tzActAdvanced(za, zr);
      }

      // Everything the blocks read, in one object (null while the state of the machine is not known or the tab is closed).
      function tzActReadState(za) {
        var zr = {};
        if (!za.ctx.visible()) return null;
        zr.s = za.ctx.machine.getSt();
        if (!zr.s || !zr.s.axes || !zr.s.axes.X) return null;
        zr.zones = za.ctx.data.zones();
        zr.focus = za.ctx.data.focusPerZone();
        zr.free = za.ctx.machine.free();
        zr.wn = zr.s.wn;
        zr.z = zr.zones[zr.wn];
        zr.correction = zr.z && (zr.z.correctionX || zr.z.correctionY) ? { cx: zr.z.correctionX || 0, cy: zr.z.correctionY || 0 } : null;
        zr.laserMode = zr.s.mode === "Laser";
        zr.cncMode = zr.s.mode === "CNC";
        zr.ax = zr.s.axes;
        zr.offX = zr.ax.X.workplaceOffsets[zr.wn] || 0;
        zr.offY = zr.ax.Y.workplaceOffsets[zr.wn] || 0;
        zr.homedXY = !!(zr.ax.X.homed && zr.ax.Y.homed);
        zr.allHomed = !!(zr.ax.X.homed && zr.ax.Y.homed && zr.ax.Z.homed);
        zr.mat = tmatById(za.ctx.data.material(zr.wn));
        zr.f = zr.focus[zr.wn];
        zr.zp = za.ctx.data.point(zr.wn);
        zr.po = za.ctx.data.offsetProbe();
        return zr;
      }

      // What changes what is drawn (the card is only redrawn when this changes)
      function tzActRenderKey(za, zr) {
        var s = zr.s, ax = zr.ax;
        return JSON.stringify([
          zr.wn, s.offsetOn, s.mode, zr.free, s.status, zr.offX, zr.offY,
          zr.zones.map(function (q) { return q ? [q.name, q.refX, q.refY, q.correctionX, q.correctionY] : null; }),
          zr.focus[zr.wn] || null, za.aimAsk, za.M.text, za.M.ok, tjNeedsKey(s), za.ctx.data.focusList(),
          zr.zp, zr.po, za.ctx.data.pointsRef().length, za.ctx.data.posSaved().length, za.secOpen.advanced, za.hDraft,
          tmatById(za.ctx.data.material(zr.wn)), za.ctx.data.controls(zr.wn), (window.__workshopMaterials || []).length, s.globals && s.globals.workshopThickness,
          Math.round(ax.X.machinePosition * 10), Math.round(ax.Y.machinePosition * 10), ax.X.homed, ax.Y.homed, ax.Z.homed,
          tzActSignedOut(), tzcKey(s),
        ]);
      }
