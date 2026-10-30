      // What the page can call on this module.
      function tmatApi(tm2) {
        return { render: tzBind(tmatRender, tm2) };
      }
