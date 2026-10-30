      // ---- Materials library ("Materials" tab of Zones) ----
      //
      // Request 2026-10-09 ("do them all"): before each material was a loose
      // macro (macros/laser/mdf3mm.g) that only saved the focus height.
      // Now there is a table in 0:/sys/workshop/config/materials.json:
      //   {version: 1, materials: [{id, name, mode: "Laser"|"CNC", thickness,
      //     focus / inside (Laser), cut {...}, engrave {...}, ... (CNC), notes}]}
      // It is used by: the zone (Active zone > Material: writes H and T in its material
      // macro), the zone check, the Prepare assistant and the layers
      // of the Laser Editor ("Use material"). window.__workshopMaterials
      // exposes it to the other modules.

      var TMAT_FILE = "0:/sys/workshop/config/materials.json";
      var tmatItems = [];
      var tmatLoaded = false;

      function tmatLoad() {
        return tzGetText(TMAT_FILE)
          .then(function (t) {
            var o = JSON.parse(t);
            tmatItems = o && Array.isArray(o.materials) ? o.materials.filter(function (m) { return m && m.id && m.name; }) : [];
          })
          .catch(function () {
            tmatItems = [];
          })
          .then(function () {
            tmatLoaded = true;
            window.__workshopMaterials = tmatItems;
            return tmatItems;
          });
      }
      function tmatSave(list) {
        return tzPutText(TMAT_FILE, JSON.stringify({ version: 1, materials: list }, null, 1)).then(function () {
          tmatItems = list;
          window.__workshopMaterials = tmatItems;
        });
      }
      // Focus of a material (2026-10-10): the lens is a single one (tjLaserFocus);
      // the material only says how many mm it focuses INSIDE (0 = on the surface).
      function tmatInside(m) {
        if (!m) return 0;
        if (isFinite(m.inside) && m.inside !== null && m.inside !== "") return Math.max(0, Number(m.inside));
        return 0;
      }
      // Focus height H of a material: with a thickness it is the measured rule of the lens box (57-focus-rule.js: 3 mm -> 7.5, 6 mm -> 4.8);
      // without one, the focus of the lens minus how deep the material focuses. Before 2.8.5 the second formula was used for every material, and
      // a 3 mm macro ended at 2 mm instead of 7.5 as soon as a material was chosen for its zone.
      function tmatH(m) {
        var byRule = m && m.thickness > 0 ? tzFocusHeight(m.thickness) : null;
        return byRule !== null ? byRule : Math.round((tjLaserFocus() - tmatInside(m)) * 100) / 100;
      }
      function tmatById(id) {
        for (var i = 0; i < tmatItems.length; i++) if (tmatItems[i].id === id) return tmatItems[i];
        return null;
      }
      function tmatLabel(m) {
        if (!m) return "";
        return m.name + (m.thickness ? " (" + m.thickness + " mm)" : "");
      }
      function tmatNewId(list) {
        var n = 1;
        while (list.some(function (m) { return m.id === "m" + n; })) n++;
        return "m" + n;
      }
      // Thickness from the name ("MDF 3mm" -> 3).
      function tmatGuessThickness(name) {
        var m = String(name || "").match(/(\d+(?:[.,]\d+)?)\s*mm/i);
        return m ? parseFloat(m[1].replace(",", ".")) : null;
      }

      function tmatMountPage(ctx) {
        var tm2 = { ctx: ctx };
        tmatStart(tm2);
        return tmatApi(tm2);
      }
