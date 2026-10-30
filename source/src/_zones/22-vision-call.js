      // ---- The Vision service, asked through the WorkshopService API (not through its port) ----
      // The page never opens :8095: the service makes the call from the Pi (operations vision.get and vision.post), so the
      // browser needs no second port. Both resolve the JSON that Vision answers ({ok:false, error} included: the caller checks ok);
      // they reject with the message of the service when Vision is off.
      function tzVisionGet(path) {
        return workshopApi("vision.get", { path: path });
      }

      function tzVisionPost(path, body) {
        return workshopApi("vision.post", { path: path, body: body || {} });
      }
