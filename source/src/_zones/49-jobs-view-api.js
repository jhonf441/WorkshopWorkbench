      // What the page can call on this module.
      function tvVisApi(tvs) {
        return {
          draw: tzBind(tvVisDraw, tvs),
          snapPoints: tzBind(tvVisSnapPoints, tvs),
          remove: tzBind(tvVisRemove, tvs),
          enable: function () { tvVisStart(tvs); },
          render: tzBind(tvVisRender, tvs),
          has: function () { return !!tvs.prev; },
        };
      }
