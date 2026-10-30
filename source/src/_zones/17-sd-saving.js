      // ---- Tool data on the Pi's card (2026-10-11) ----
      //
      // The Laser Editor designs, the mesh and the Cut in parts assistant
      // lived ONLY in the browser (localStorage): another screen did not
      // see them, clearing the browser data lost them and they were not in the
      // backups. Now they also go to 0:/sys/workshop/data/<file>.json:
      //  - on open: the browser's data is used instantly and the card is read; if the
      //    card has something newer, it is taken (alLlegar) and this browser's data
      //    stays in <key>.before-sd just in case; if the card has nothing, this
      //    browser's is uploaded (the move);
      //  - on save: to the browser right away and to the card 1.5 s after the
      //    last change (with the safe saving of 11-safe-saving.js).
      // "_ts" (ms) says which is newer.
      function tzSdStore(key, path, alReach) {
        var url = "/machine/file/" + encodeURIComponent(path);
        var local = null;
        try {
          local = JSON.parse(localStorage.getItem(key) || "null");
        } catch (e) {
          local = null;
        }
        var timer = null,
          pending = null;
        function raise(o) {
          return fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: JSON.stringify(o),
          }).catch(function () {
            /*  no network: it stays in the browser and is uploaded on the next change */
          });
        }
        function alBrowser(o) {
          try {
            localStorage.setItem(key, JSON.stringify(o));
          } catch (e) {
            /*  no storage: the card remains */
          }
        }
        fetch(url + "?_=" + Date.now(), { cache: "no-store" })
          .then(function (r) {
            return r.ok ? r.json() : null;
          })
          .catch(function () {
            return null;
          })
          .then(function (sd) {
            var tl = (local && local._ts) || 0,
              ts = (sd && sd._ts) || 0;
            if (sd && ts > tl) {
              if (local) {
                try {
                  localStorage.setItem(key + ".before-sd", JSON.stringify(local));
                } catch (e) {
                  /* no critico */
                }
              }
              alBrowser(sd);
              local = sd;
              if (alReach) alReach(sd);
            } else if (local && (!sd || tl > ts)) {
              if (!local._ts) local._ts = Date.now();
              alBrowser(local);
              raise(local);
            }
          });
        return {
          local: local,
          save: function (o) {
            o._ts = Date.now();
            alBrowser(o);
            pending = o;
            clearTimeout(timer);
            timer = setTimeout(function () {
              raise(pending);
            }, 1500);
          },
        };
      }
