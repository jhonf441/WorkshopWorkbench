      function tzTableRenderPositions(ptb, onlyIfChanged) {
        var hk = ptb.data.headNow();
        var pk = JSON.stringify([ptb.data.savedPos(), ptb.data.machineFree(), !!hk, ptb.posArmed, ptb.posMsg, ptb.posMsgOk]);
        if (onlyIfChanged && pk === ptb.posLastKey) return;
        ptb.posLastKey = pk;
        ptb.posCard.innerHTML = "";
        ptb.posCard.appendChild(tzEl("h3", null, i18nT('zoneActive.saved_positions')));
        ptb.posCard.appendChild(tzEl("div", "tz-muted tz-note", i18nT('zonesPage.the_same_as_the_jog_machine'))); // the note has its own line, apart from the controls
        var free = ptb.data.machineFree();
        // Compact (2026-10-10: it overflowed in the narrow column and in the
        // kiosk): flexible name, X/Y/Z in one column, buttons that drop
        // to the next line, and horizontal scroll INSIDE the card as a last resort.
        var tblBox = tzEl("div");
        tblBox.style.cssText = "max-width:100%;overflow-x:auto;";
        var tbl = tzEl("table", "tz-table");
        tbl.style.width = "100%";
        var hr = tzEl("tr");
        [i18nT('common.name'), "X / Y / Z", ""].forEach(function (x) { hr.appendChild(tzEl("th", null, x)); });
        tbl.appendChild(hr);
        if (!ptb.data.savedPos().length) {
          var er = tzEl("tr");
          var td = tzEl("td", "tz-muted", i18nT('zonesPage.there_are_no_positions_take_the'));
          td.colSpan = 3;
          er.appendChild(td);
          tbl.appendChild(er);
        }
        ptb.data.savedPos().forEach(function (q, i) { return tzTablePositionRow(ptb, free, tbl, q, i); });
        tblBox.appendChild(tbl);
        ptb.posCard.appendChild(tblBox);
        var ar = tzEl("div", "tz-row tz-actions");
        ar.style.cssText += "margin-top:6px;";
        var nin = document.createElement("input");
        nin.type = "text";
        nin.className = "tz-input";
        nin.placeholder = i18nT('zonesPage.name_empty_2', { next: workshopPosNextName(ptb.data.savedPos()) });
        nin.style.width = "190px";
        ar.appendChild(nin);
        var bAdd = tzBtn(i18nT('zonesPage.save_the_current_position'), "primary", function () {
          var h2 = ptb.data.headNow();
          if (!h2) return tzTablePosSet(ptb, i18nT('zonesPage.x_y_not_homed_homes_before'), false);
          var typed = nin.value.trim();
          workshopPosUpdate(function (list) {
            list.push({ name: typed || workshopPosNextName(list), x: h2.x, y: h2.y, z: h2.z });
            return list;
          }).then(function () { tzTablePosSet(ptb, i18nT('zonesPage.position_saved'), true); })
            .catch(function (e) { tzTablePosSet(ptb, i18nT('common.could_not_save_2', { err: e.message || e }), false); });
        });
        bAdd.disabled = !ptb.data.headNow();
        ar.appendChild(tzTip(bAdd, i18nT('zonesPage.saves_where_the_pointer_is_now')));
        ptb.posCard.appendChild(ar);
        if (ptb.posMsg) ptb.posCard.appendChild(tzEl("div", "tz-msg " + (ptb.posMsgOk ? "ok" : "err"), ptb.posMsg));
      }

      function tzTablePositionRow(ptb, free, tbl, q, i) {
        var tr = tzEl("tr");
        var tdN = tzEl("td");
        var ni = document.createElement("input");
        ni.type = "text";
        ni.className = "tz-input";
        ni.value = q.name || "";
        ni.style.width = "100%";
        ni.style.minWidth = "80px";
        ni.addEventListener("change", function () {
          var nn = ni.value.trim();
          if (!nn) return;
          workshopPosUpdate(function (list) {
            list.forEach(function (x) { if (workshopPosSame(x, q)) x.name = nn; });
            return list;
          }).catch(function (e) { tzTablePosSet(ptb, i18nT('zonesPage.could_not_rename', { err: e.message || e }), false); });
        });
        tdN.appendChild(ni);
        tr.appendChild(tdN);
        var tdC = tzEl("td", "tz-muted", tzFmt(q.x) + " / " + tzFmt(q.y) + " / " + (isFinite(q.z) && q.z !== null ? tzFmt(q.z) : "--"));
        tdC.style.whiteSpace = "nowrap";
        tr.appendChild(tdC);
        var tdA0 = tzEl("td");
        var tdA = tzEl("div");
        tdA.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;";
        tdA0.appendChild(tdA);
        var kGo = "go" + i;
        var bGo = tzBtn(ptb.posArmed === kGo ? i18nT('common.confirm') : i18nT('zcal.go'), ptb.posArmed === kGo ? "danger" : null, function () {
          if (!tzTablePosArm(ptb, kGo)) return;
          var h0 = ptb.data.headNow();
          workshopPosGo(q, h0 ? h0.z : NaN)
            .then(function () { tzTablePosSet(ptb, i18nT('zonesPage.going_to_raises_z_moves_in', { name: q.name }), true); })
            .catch(function (e) { tzTablePosSet(ptb, i18nT('prepare.could_not_go', { err: e.message || e }), false); });
        });
        bGo.disabled = !free || !ptb.data.headNow();
        tzTip(bGo, i18nT('zonesPage.takes_the_machine_to_this_position_2'));
        tdA.appendChild(bGo);
        var kUp = "up" + i;
        var bUp = tzBtn(ptb.posArmed === kUp ? i18nT('common.confirm') : i18nT('zonesPage.update'), null, function () {
          if (!tzTablePosArm(ptb, kUp)) return;
          var h1 = ptb.data.headNow();
          if (!h1) return tzTablePosSet(ptb, i18nT('cuts.x_y_not_homed'), false);
          workshopPosUpdate(function (list) {
            list.forEach(function (x) { if (workshopPosSame(x, q)) { x.x = h1.x; x.y = h1.y; x.z = h1.z; } });
            return list;
          }).then(function () { tzTablePosSet(ptb, i18nT('zonesPage.updated_to_where_the_pointer_is_2', { name: q.name }), true); });
        });
        tzTip(bUp, i18nT('zonesPage.replaces_x_y_z_of_this'));
        tdA.appendChild(bUp);
        var kDel = "del" + i;
        tdA.appendChild(
          tzBtn(ptb.posArmed === kDel ? i18nT('zonesPage.delete') : i18nT('common.delete'), "danger", function () {
            if (!tzTablePosArm(ptb, kDel)) return;
            workshopPosUpdate(function (list) { return list.filter(function (x) { return !workshopPosSame(x, q); }); });
          })
        );
        tr.appendChild(tdA0);
        tbl.appendChild(tr);
      }

