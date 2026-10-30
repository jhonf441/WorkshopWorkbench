      // What the page (30-zones-page.js) calls on the Prepare step.
      function tpPrepareApi(tp) {
        return { render: tzBind(tpRender, tp), startupEl: tp.startup.el, startupRefresh: tzBind(tpStartupRefresh, tp) };
      }
