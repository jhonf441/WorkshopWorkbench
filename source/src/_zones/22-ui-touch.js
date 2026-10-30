      // ---- Touch screens (the kiosk): the side bar and the cards that were redone are at least 44 px high ----
      // (a file of its own: it must load after 22-ui-style.js, which creates TZ_CSS_EXTRA)
      TZ_CSS_EXTRA.push([
        "@media (pointer:coarse),(hover:none){",
        ".tz-nav .tz-tab{min-height:44px;}",
        ".tz-tabs.sub .tz-tab{height:44px;}",
        ".tp-step .tz-btn,.tp-step select.tz-input,.tp-step input.tz-input{min-height:44px;}",
        "}",
      ].join("\n"));
