      // ---- Workbench page, roles (F3-W, 2026-10-21): Operator / Technician view, read only for a viewer, gate of the Machine page ----
      // The pure rules are in 20-role-view.js; this file applies them to the page. The service refuses what the role cannot do; the page
      // only hides it. The view is a class on the page (tz-view-technician | tz-view-operator | tz-view-viewer) and the CSS below hides the
      // elements marked tz-tech / tz-act, so a login or a change of role needs no redraw of the cards.
      TZ_CSS_EXTRA.push([
        ".tz-view-operator .tz-tech,.tz-view-viewer .tz-tech{display:none !important}",
        ".tz-view-technician .tz-opdata{display:none !important}",
        ".tz-view-viewer .tz-act,.tz-view-viewer .tz-ws-side .tz-btn,.tz-view-viewer .tz-ws-side select,.tz-view-viewer .tz-ws-side input,.tz-view-viewer .tz-ws-side textarea{display:none !important}",
        ".tz-gated>*:not(.tz-gate):not(.tz-hd){display:none !important}",
        ".tz-gate h3{margin:0 0 6px 0;}",
      ].join("\n"));

      // The last step of tzMountPage: from here on the page follows the role of the person.
      function tzPagRole(pz, root, opts) {
        pz.roleViewName = "";
        pz.sectionEls = {};
        pz.gate = tzEl("div", "tz-gate wf-card");
        pz.gate.style.display = "none";
        pz.gate.appendChild(tzEl("h3", null, i18nT('role.technicians_only')));
        pz.gate.appendChild(tzEl("div", "tz-muted", i18nT('role.technicians_only_tip')));
        if (typeof workshopLogin === "function") pz.gate.appendChild(tzBtn(i18nT('role.log_in'), "primary", function () { workshopLogin(); }));
        pz.page.insertBefore(pz.gate, pz.header.nextSibling);
        pz.roChip = tzEl("span", "wf-pill tz-chip-ro", i18nT('role.read_only'));
        pz.roChip.style.display = "none";
        pz.headRight.insertBefore(pz.roChip, pz.modeChip);
        // a tab the role does not have cannot be opened (a stored last view, a link, a button of another tool)
        pz.nav.setGuard(function (l) {
          if (tzTabAllowed(pz.pag, tzViewNow(), l, "?")) return true;
          tzAgilityNotice(pz.nav.notice(), i18nT('role.technicians_only'));
          return false;
        });
        tzWorkStart(pz); // the work state of the service (22-work-state.js): Prepare marks, focus applied
        pz.unRole = typeof workshopOnIdentity === "function" ? workshopOnIdentity(function () { if (pz.shell.alive()) tzRoleApply(pz); }) : null;
        tzRoleApply(pz);
      }

      // The identity is known or changed: classes of the page, tabs, gate and modules of the view.
      function tzRoleApply(pz) {
        var view = tzViewNow();
        pz.roleViewName = view;
        TZ_VIEWS.forEach(function (v) { pz.page.classList.toggle("tz-view-" + v, v === view); });
        var gated = tzPageGated(pz.pag, view);
        pz.page.classList.toggle("tz-gated", gated);
        pz.gate.style.display = gated ? "" : "none";
        pz.roChip.style.display = view === "viewer" && !gated ? "" : "none";
        tzRoleSyncModules(pz, view);
        tzRoleFixLayout(pz, view);
        if (pz.data.st()) pz.tzMarkGroups(pz.data.st().mode);
        else tzPaintTabs(pz, "?", view); // before the state arrives
        pz.applyLayout();
      }

      // The open tab must exist in the view: if not, the first one the view has (or the one the page opens on)
      function tzRoleFixLayout(pz, view) {
        var mode = pz.modeSeen || "?";
        if (tzTabAllowed(pz.pag, view, pz.nav.layout(), mode)) return;
        var want = tzInitialTab(pz.pag, mode, pz.data.st(), null);
        if (!tzTabAllowed(pz.pag, view, want, mode)) {
          var plan = tzTabPlan(pz.pag, view, mode);
          if (plan.length) want = plan[0].tools[0];
        }
        pz.nav.setLayout(want);
      }

      // Mounts the modules the view gets and closes the ones it lost (the command palette and shortcuts are the technician's)
      function tzRoleSyncModules(pz, view) {
        pz.moduleOn = pz.moduleOn || {};
        TZ_MODULES_EXTRA.forEach(function (m) {
          var want = tzModuleForView(m, view);
          if (want && !pz.moduleOn[m.id]) {
            try {
              pz.moduleApis[m.id] = m.mount(pz.host);
              pz.moduleOn[m.id] = true;
            } catch (e) {
              console.error("[Workbench] the module " + m.id + " could not be mounted", e);
            }
          } else if (!want && pz.moduleOn[m.id]) {
            try {
              if (typeof m.destroy === "function") m.destroy(pz.host, pz.moduleApis[m.id]);
            } catch (e) {
              console.error("[Workbench] the module " + m.id + " failed while closing", e);
            }
            pz.moduleApis[m.id] = null;
            pz.moduleOn[m.id] = false;
          }
        });
      }

      // Puts the tab buttons and the headers of the groups in the order of the plan of the view; what the plan does not have is hidden
      function tzPaintTabs(pz, mode, view) {
        var plan = tzTabPlan(pz.pag, view, mode);
        var inPlan = {};
        Object.keys(pz.tabGroupEls).forEach(function (k) { pz.tabGroupEls[k].style.display = "none"; });
        Object.keys(pz.sectionEls).forEach(function (k) { pz.sectionEls[k].style.display = "none"; });
        plan.forEach(function (s, gi) {
          var head = view === "technician" ? pz.tabGroupEls[gi] : pz.sectionEls[s.id] || (pz.sectionEls[s.id] = tzEl("div", "wf-nav-group tzn-group", i18nT(s.key)));
          head.setAttribute("data-group", gi);
          head.style.display = s.tools.length ? "" : "none";
          pz.tabBar.appendChild(head);
          s.tools.forEach(function (id) {
            inPlan[id] = true;
            pz.layoutButtons[id].setAttribute("data-group", gi);
            pz.tabBar.appendChild(pz.layoutButtons[id]);
          });
        });
        Object.keys(pz.layoutButtons).forEach(function (k) { pz.layoutButtons[k].style.display = inPlan[k] ? "" : "none"; });
      }
