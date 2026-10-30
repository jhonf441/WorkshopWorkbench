      // What the page can call on this module.
      function tcmApi(tcm) {
        return {
          info: tzBind(tcmInfo, tcm),
          fingerprint: tzBind(tcmFingerprint, tcm),
          inCarriage: tzBind(tcmInCarriage, tcm),
          // resolution of the incoming video (0 x 0 without an image)
          res: function () { return { w: tcm.img.naturalWidth || 0, h: tcm.img.naturalHeight || 0 }; },
          // Vision installed (its configuration exists): without Vision (WorkshopJog
          // published alone) the Camera tool and Find center
          // with the camera are not shown. undefined = still reading.
          hasVision: function () { return tcm.vcfg === undefined ? undefined : tcm.vcfg !== null && workshopPathExists("/Plugins/Vision"); },
          place: tzBind(tcmPlace, tcm),
          sync: function () { tcmSync(tcm); tcmPlace(tcm); },
          reload: tzBind(tcmReload, tcm),
          hasCalibration: tzBind(tcmUsable, tcm),
          notice: tzBind(tcmNotice, tcm),
        };
      }
