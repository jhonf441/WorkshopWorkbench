      // ---- Favorites and recent commands (stage 5 of the redesign) ----
      //
      // Pure logic over a storage with getItem / setItem (the browser localStorage in the page, a fake one in the tests). They are
      // preferences of the person on this screen: they live in the browser (workshopWorkbenchFavorites, workshopWorkbenchRecent), never on the SD
      // or in the machine. Every read and write is protected: with no storage (private window, blocked data) the lists live in memory
      // and the page works the same.
      var TZ_FAVORITES_KEY = "workshopWorkbenchFavorites";
      var TZ_RECENT_KEY = "workshopWorkbenchRecent";

      function tzCreateMemoryCommands(store, opts) {
        opts = opts || {};
        var kFav = opts.keyFav || TZ_FAVORITES_KEY;
        var kRec = opts.keyRec || TZ_RECENT_KEY;
        var maxFav = opts.maxFav > 0 ? opts.maxFav : 30;
        var maxRec = opts.maxRec > 0 ? opts.maxRec : 8;
        function read(k) {
          var l = [];
          try {
            var v = JSON.parse(store.getItem(k) || "[]");
            if (Array.isArray(v)) l = v.filter(function (x, i) { return typeof x === "string" && x && v.indexOf(x) === i; });
          } catch (e) {
            l = [];
          }
          return l;
        }
        function save(k, l) {
          try { store.setItem(k, JSON.stringify(l)); } catch (e) { /* kept in memory only */ }
        }
        var fav = read(kFav).slice(0, maxFav);
        var rec = read(kRec).slice(0, maxRec);
        var api = {
          favorites: function () { return fav.slice(); },
          isFavorite: function (id) { return fav.indexOf(id) >= 0; },
          // marks or unmarks; returns whether it is a favorite now (false also when the list is full)
          toggleFavorite: function (id) {
            if (!id) return false;
            var i = fav.indexOf(id);
            if (i >= 0) fav.splice(i, 1);
            else if (fav.length < maxFav) fav.push(id);
            save(kFav, fav);
            return fav.indexOf(id) >= 0;
          },
          recent: function () { return rec.slice(); },
          // position in the list of recents (0 = the last used), -1 when it is not there
          posRecent: function (id) { return rec.indexOf(id); },
          // a command was used: first in the list, no repeats, the old ones go out
          use: function (id) {
            if (!id) return;
            var i = rec.indexOf(id);
            if (i >= 0) rec.splice(i, 1);
            rec.unshift(id);
            if (rec.length > maxRec) rec.length = maxRec;
            save(kRec, rec);
          },
          // forgets a command that no longer exists (a tool that left the mode, an old id)
          forget: function (id) {
            var a = fav.indexOf(id), b = rec.indexOf(id);
            if (a >= 0) { fav.splice(a, 1); save(kFav, fav); }
            if (b >= 0) { rec.splice(b, 1); save(kRec, rec); }
          },
          cleanRecent: function () { rec = []; save(kRec, rec); },
        };
        return api;
      }
