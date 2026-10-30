      // ---- Live job: the "Interrupted jobs" tab (2026-10-24, docs-internal/MESA-RENOVADA.md section 3) ----
      // The jobs stopped safely (or cut by a reboot) used to be a block at the bottom of the "Job in progress" card, only read while that tab
      // was open. They are a procedure of their own (choose, read why not, arm, send again, verify), needed exactly when nothing runs, so they
      // are a tab of the "Design and cut" group with a count on it. The tab owns: the list (52-livejob-card.js), the assistant
      // (52-livejob-assistant.js) and the path on the map (52-livejob-draw.js). The job card keeps one line that opens it (tzLjJobLine).
      // State: the shared tzLj() (52-livejob-state.js) plus lt = {ctx, card, tab, badge, key} of the mounted tab.
      var TZ_LJ_TOOL_ID = "interrupted";

      TZ_CSS_EXTRA.push([
        ".tzm-tabbadge{flex:none;margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#e65100;color:#fff;font-size:12px;font-weight:600;line-height:20px;text-align:center;letter-spacing:0;}",
        ".tz-nav.collapsed .tz-tab{position:relative;}",
        ".collapsed .tzm-tabbadge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;line-height:16px;padding:0 4px;font-size:10px;}",
      ].join("\n"));

      function tzLjToolCreate(host, card) {
        var lt = { ctx: host.createCtx(TZ_LJ_TOOL_ID, { card: card }), card: card, tab: (host.nav.tabButtons() || {})[TZ_LJ_TOOL_ID] || null, badge: null, key: "" };
        // the list is read while the page is in view (not only this tab): the count on the tab has to be true from any tab
        tzLjStart(function () { return workshopPageVisible(card); });
        tzLjOnChange(function () { tzLjToolChanged(lt); });
        tzLjToolBadge(lt);
        return lt;
      }

      function tzLjToolChanged(lt) {
        tzLjToolBadge(lt);
        if (!lt.ctx.visible()) return;
        tzLjToolRender(lt);
        lt.ctx.map.redraw();
      }

      // the number of records on the tab (nothing when there are none)
      function tzLjToolBadge(lt) {
        if (!lt.tab) return;
        var n = tzLj().records.length;
        if (!n) {
          if (lt.badge && lt.badge.parentNode) lt.badge.parentNode.removeChild(lt.badge);
          lt.badge = null;
          return;
        }
        if (!lt.badge) lt.badge = tzEl("span", "tzm-tabbadge");
        lt.badge.textContent = String(n);
        lt.badge.title = i18nT('livejob.badge_tip', { n: n });
        if (lt.badge.parentNode !== lt.tab) lt.tab.appendChild(lt.badge);
      }

      function tzLjToolRender(lt) {
        var key = tzLjSig();
        if (key === lt.key) return;
        lt.key = key;
        lt.card.textContent = "";
        var h = tzEl("h3", null, i18nT('livejob.card_title'));
        lt.card.appendChild(h);
        lt.card.appendChild(tzEl("div", "tz-note", i18nT('livejob.tab_intro')));
        tzLjRenderCard(lt.card);
      }

      // the tab was just opened: with one record and nothing chosen, its path is shown right away
      function tzLjToolEnable(lt) {
        var s = tzLj();
        var onTable = s.records.filter(function (r) { return !r.hidden; });
        if (!s.selected && onTable.length === 1) {
          s.selected = onTable[0].id;
          tzLjLoadDetail(s.selected);
        }
        lt.key = "";
        tzLjToolRender(lt);
      }

      // the map module of the tab: it only draws (no taps of its own)
      function tzLjToolMap(lt) {
        return {
          draw: function (node, w) { tzLjDraw(lt, node, w); },
          tipLines: function () { return []; },
          snapPoints: function () { return []; },
          wantsClick: function () { return false; },
          onClick: function () {},
          pointerDown: function () { return false; },
          pointerMove: function () {},
          pointerUp: function () {},
          cursorAt: function () { return ""; },
          dragging: function () { return false; },
        };
      }

      function tzLjToolHelp() {
        return {
          title: i18nT('livejob.card_title'),
          steps: [i18nT('livejob.help_what'), i18nT('livejob.help_resume'), i18nT('livejob.help_restart')],
          notes: [i18nT('livejob.help_map'), i18nT('livejob.help_take_off')],
        };
      }

      // The line the "Job in progress" card keeps: how many interrupted jobs there are, and the button to their tab
      function tzLjJobLine(tj, card) {
        var s = tzLj();
        if (!tzLjCan("livejob.interrupted.list")) return;
        if (!tj.ljSub) {
          tj.ljSub = true;
          tzLjOnChange(function () { tj.lastKey = ""; tjTrRender(tj); });
        }
        if (tj.viewId || !s.records.length) return;
        var row = tzEl("div", "tz-row tz-actions");
        row.setAttribute("data-lj", "job-line");
        row.style.cssText += "align-items:center;margin-top:10px;";
        row.appendChild(tzEl("span", "wf-state tz-badge warn", i18nT('livejob.job_line', { n: s.records.length })));
        row.appendChild(tzBtn(i18nT('livejob.open_tab'), null, function () { tj.ctx.nav.go(TZ_LJ_TOOL_ID); }));
        card.appendChild(row);
      }

      if (typeof tzRegisterTool === "function") {
        tzRegisterTool({
          id: TZ_LJ_TOOL_ID, step: 2, minRole: "operator", modes: TZ_WORK_MODES.slice(), name: "livejob.tab", tip: "livejob.tab_tip", icon: "restore",
          help: tzLjToolHelp,
          mount: function (host, card) {
            var lt = tzLjToolCreate(host, card);
            var map = tzLjToolMap(lt);
            return {
              render: function () { tzLjToolRender(lt); },
              enable: function () { tzLjToolEnable(lt); },
              tick: function () { tzLjToolBadge(lt); },
              modMap: map,
            };
          },
        });
      }
