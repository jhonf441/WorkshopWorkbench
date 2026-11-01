      // ---- The Vision service, asked through the WorkshopService API (not through its port) ----
      // The page never opens :8095: the service makes the call from the Pi (operation vision.post), so the browser needs no second port.
      // It resolves the JSON that Vision answers ({ok:false, error} included: the caller checks ok); it rejects with the message of the
      // service when Vision is off. Vision's settings (where the camera is mounted, the calibration) are not asked here: they are read and
      // saved through the settings store (workshopSettings, "vision").
      function tzVisionPost(path, body) {
        return workshopApi("vision.post", { path: path, body: body || {} });
      }
