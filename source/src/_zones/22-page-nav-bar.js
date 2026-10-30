      // ---- Workbench side bar (tz-nav): pin and fold buttons ----
      // The same bar as Vision (tv-nav) and Camera (ctl-nav): a head with the pin (always visible, with its name when the bar is open)
      // and the fold arrow. Pinned = the bar stays as it is when a section is chosen; not pinned = it folds to its icons after the
      // choice. Both choices are remembered in this browser (screen preferences only, never working state).
      var TZ_NAV_COLLAPSED_KEY = "workshopWorkbenchNavCollapsed";
      var TZ_NAV_PINNED_KEY = "workshopWorkbenchNavPinned";

      // pure: the stored value of a flag ("1" / "0" / null) with a default for a browser that has not chosen yet
      function tzNavFlag(raw, fallback) {
        return raw === null || raw === undefined ? fallback : raw === "1";
      }

      function tzNavBarRead(key, fallback) {
        try {
          return tzNavFlag(localStorage.getItem(key), fallback);
        } catch (e) {
          return fallback;
        }
      }

      function tzNavBarWrite(key, on) {
        try {
          localStorage.setItem(key, on ? "1" : "0");
        } catch (e) {
          /* a screen preference: without storage it lasts until the page is closed */
        }
      }

      // Puts the head in pz.tabBar. Returns {collapseAfterChoice, state} (the page calls collapseAfterChoice when a section is chosen).
      function tzNavBarMount(pz) {
        // under 480 px (a phone) the bar always starts folded, whatever an earlier visit on a wide screen stored: open it covers the page
        var nb = { collapsed: window.innerWidth < 480 || tzNavBarRead(TZ_NAV_COLLAPSED_KEY, window.innerWidth < 900), pinned: tzNavBarRead(TZ_NAV_PINNED_KEY, false) };
        pz.tabBar.classList.add("tz-nav");
        nb.head = tzEl("div", "tzn-head");
        nb.pin = tzEl("button", "tzn-fold tzn-pin");
        nb.pin.type = "button";
        nb.fold = tzEl("button", "tzn-fold");
        nb.fold.type = "button";
        nb.head.appendChild(nb.pin);
        nb.head.appendChild(nb.fold);
        pz.tabBar.insertBefore(nb.head, pz.tabBar.firstChild);
        nb.pin.addEventListener("click", function () {
          nb.pinned = !nb.pinned;
          tzNavBarWrite(TZ_NAV_PINNED_KEY, nb.pinned);
          tzNavBarPaint(pz, nb);
        });
        nb.fold.addEventListener("click", function () {
          nb.collapsed = !nb.collapsed;
          tzNavBarWrite(TZ_NAV_COLLAPSED_KEY, nb.collapsed);
          tzNavBarPaint(pz, nb);
          if (pz.data.st()) pz.shell.renderMap(); // the map gains or loses width
        });
        pz.navBar = {
          afterChoice: function () {
            if (nb.pinned || nb.collapsed) return;
            nb.collapsed = true;
            tzNavBarWrite(TZ_NAV_COLLAPSED_KEY, true);
            tzNavBarPaint(pz, nb);
            if (pz.data.st()) pz.shell.renderMap();
          },
          state: function () { return { collapsed: nb.collapsed, pinned: nb.pinned }; },
        };
        tzNavBarPaint(pz, nb);
        return pz.navBar;
      }

      function tzNavBarPaint(pz, nb) {
        pz.tabBar.classList.toggle("collapsed", nb.collapsed);
        nb.pin.classList.toggle("pinned", nb.pinned);
        nb.pin.setAttribute("aria-pressed", nb.pinned ? "true" : "false");
        nb.pin.setAttribute("data-tip", nb.pinned ? i18nT('zonesPage.unpin_bar') : i18nT('zonesPage.pin_bar'));
        nb.pin.innerHTML = '<span class="mdi mdi-' + (nb.pinned ? "pin" : "pin-outline") + '"></span>' + (nb.collapsed ? "" : '<span class="tx">' + i18nT('zonesPage.pin_label') + "</span>");
        nb.fold.innerHTML = '<span class="mdi mdi-' + (nb.collapsed ? "chevron-double-right" : "chevron-double-left") + '"></span>';
        nb.fold.setAttribute("data-tip", nb.collapsed ? i18nT('zonesPage.show_the_section_names') : i18nT('zonesPage.collapse_the_bar_icons_only'));
        Object.keys(pz.layoutButtons).forEach(function (k) {
          var tx = pz.layoutButtons[k].querySelector(".tz-tab-txt");
          if (nb.collapsed && tx) pz.layoutButtons[k].setAttribute("title", tx.textContent);
          else pz.layoutButtons[k].removeAttribute("title");
        });
      }
