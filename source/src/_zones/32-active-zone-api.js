      // What the page can call on this module.
      function tzActApi(za) {
        return { render: tzBind(tzActRender, za) };
      }
