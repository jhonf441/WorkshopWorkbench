      // ---- Workbench page: a machine mode that another plugin serves (2026-10-24) ----
      // The Workbench serves Laser and CNC (TZ_PROFILES, 20-mode-profile.js). In a mode of TZ_MODES_ELSEWHERE (FFF: WorkshopPrinting) every
      // tab is hidden (tzToolVisible) and the inspector shows only this card: which mode the machine is in, that this page does not serve
      // it and a button to the page that does (or which plugin to install). The map stays: it still shows the bed and the head.

      function tzPagOtherMode(pz) {
        pz.otherModeCard = tzEl("div", "tz-card wf-card");
        pz.otherModeCard.style.cssText = "margin-top:12px;display:none;";
        pz.otherModeCard.setAttribute("data-other-mode", "");
        pz.page.insertBefore(pz.otherModeCard, pz.mainCol.parentNode);
        pz.otherModeSeen = "";
      }

      // the mode of the machine now, or "?" before the first status read
      function tzPageMode(pz) {
        var st = pz.data.st();
        return (st && st.mode) || "?";
      }

      // true when the mode is served by another plugin (the cards of the tabs stay hidden)
      function tzOtherModePaint(pz) {
        if (!pz.otherModeCard) return false; // applyLayout before the card exists
        var mode = tzPageMode(pz);
        var other = tzModeElsewhere(mode);
        pz.otherModeCard.style.display = other ? "" : "none";
        if (!other) { pz.otherModeSeen = ""; return false; }
        var has = workshopPathExists(other.path);
        var key = mode + "|" + has;
        if (key === pz.otherModeSeen) return true;
        pz.otherModeSeen = key;
        var card = pz.otherModeCard;
        card.textContent = "";
        var name = i18nT(other.name);
        card.appendChild(tzEl("h3", null, i18nT('zonesPage.other_mode_title', { mode: other.label })));
        card.appendChild(tzEl("div", "tz-note", i18nT('zonesPage.other_mode_text', { mode: other.label, page: name })));
        if (!has) {
          card.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.needs_other_plugin', { title: name, plugin: other.plugin })));
          return true;
        }
        var row = tzEl("div", "tz-row tz-actions");
        row.appendChild(tzBtn(i18nT('zonesPage.other_mode_open', { page: name }), "primary", function () { pz.nav.goPath(other.path); }));
        card.appendChild(row);
        return true;
      }
