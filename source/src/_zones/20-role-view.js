      // ---- Operator / Technician views of the Workbench (F3-W of the redesign, 2026-10-21; pure, no DOM) ----
      //
      // The service applies the roles (WorkshopService dsf/permissions.py: viewer < operator < technician < admin; without users everybody
      // is admin). The page only SHOWS what the role can use:
      //   technician  technician and admin, and any case where the identity is not known (old client or service, or the answer has not
      //               arrived): the tabs as they always were (the compatibility view)
      //   operator    three sections, in this order: Job (choose or open the design / file), Prepare (zone, material, focus, frame) and
      //               Run (progress, pause / resume / cancel, trace). Nothing technical: no zone table, cut area, height calibration,
      //               laser correction, laser power setting, command palette or advanced editor layers
      //   viewer      the same three sections in read only: the map and the state, no buttons that act
      // What a tool needs is TZ_TOOLS_ROLE (20-mode-profile.js). An element INSIDE a tool that only a technician may use carries the class
      // `tz-tech` (tzTechOnly); one that only acts (a viewer must not see it) carries `tz-act` (tzActOnly): the CSS of
      // 30-zones-page-role.js hides them by the class that tzPagRole puts on the page, so a login or a change of role needs no redraw.

      var TZ_VIEWS = ["technician", "operator", "viewer"];
      // the sections of the Operator (and viewer) view: id, i18n key of the name, icon and the tools in each one
      var TZ_OPERATOR_SECTIONS = [
        { id: "work", key: "role.section_work", tools: ["simulate", "cuts", "large"] },
        { id: "prepare", key: "role.section_prepare", tools: ["prepare"] },
        { id: "run", key: "role.section_run", tools: ["job", "interrupted"] },
      ];

      // role of an identity (the answer of auth.whoami): "viewer" | "operator" | "technician" | "admin", or "" when it is not known.
      // A service with users where nobody is logged in answers role null: that is a viewer, not an unknown identity.
      function tzRoleOfIdentity(identity) {
        if (!identity || typeof identity !== "object") return "";
        if (typeof identity.role === "string" && TZ_ROLE_RANK[identity.role] !== undefined) return identity.role;
        return identity.configured === true && identity.role === null ? "viewer" : "";
      }

      // the view for an identity (see the top of the file); an unknown identity gets the Technician view
      function tzRoleView(identity) {
        var role = tzRoleOfIdentity(identity);
        if (!role || TZ_ROLE_RANK[role] >= TZ_ROLE_RANK.technician) return "technician";
        return role === "operator" ? "operator" : "viewer";
      }

      // role used to decide which tools exist in a view: the viewer sees what the operator sees, without the buttons
      function tzViewToolRole(view) {
        return view === "technician" ? "technician" : "operator";
      }

      // The tabs of a page grouped for a view: [{id, label, key, tools}] with only the tools that exist in the mode and for the role. In the
      // Technician view the groups are those of the page (pag.groups: [label, tools, step]); in the others, the operator sections.
      function tzTabPlan(pag, view, mode) {
        var role = tzViewToolRole(view);
        function shown(id) {
          return pag.layouts.indexOf(id) !== -1 && tzToolVisible(mode, id) && tzToolVisibleForRole(role, id);
        }
        if (view === "technician") {
          return pag.groups.map(function (g, i) {
            return { id: "g" + i, label: g[0], key: null, tools: g[1].filter(shown) };
          });
        }
        return TZ_OPERATOR_SECTIONS.map(function (s) {
          return { id: s.id, label: null, key: s.key, tools: s.tools.filter(shown) };
        }).filter(function (s) { return s.tools.length > 0; });
      }

      // can the view open the tab `id`? (a stored last view or a link may name a tab the role does not have)
      function tzTabAllowed(pag, view, id, mode) {
        return tzTabPlan(pag, view, mode || "?").some(function (s) { return s.tools.indexOf(id) !== -1; });
      }

      // does this view keep out of the whole page? (the Machine page is for technicians: its plugin is separate and is redone apart)
      function tzPageGated(pag, view) {
        return pag.minRole === "technician" && view !== "technician";
      }

      // the modules (command palette, shortcuts...) that a view mounts
      function tzModuleForView(def, view) {
        var need = def.minRole || "operator";
        return TZ_ROLE_RANK[tzViewToolRole(view)] >= TZ_ROLE_RANK[need];
      }

      // Can this identity run the machine in `mode` (Laser | CNC | ...)? Only the operator is limited: user.modes lists the modes the
      // administrator enabled (the default is Laser only); a technician changes mode and head, so it has them all.
      function tzModeAllowed(identity, mode) {
        if (tzRoleView(identity) !== "operator") return true;
        var modes = identity && identity.user && identity.user.modes;
        if (!Array.isArray(modes) || !mode || mode === "?") return true;
        return modes.indexOf(String(mode).toLowerCase()) !== -1;
      }

      // marks an element that only the Technician view shows / one that acts (hidden to a viewer); returns the element
      function tzTechOnly(el) {
        if (el && el.classList) el.classList.add("tz-tech");
        return el;
      }
      function tzActOnly(el) {
        if (el && el.classList) el.classList.add("tz-act");
        return el;
      }

      // the view of this browser now (the identity may arrive after the page is mounted)
      function tzViewNow() {
        return tzRoleView(typeof workshopIdentity === "function" ? workshopIdentity() : null);
      }
