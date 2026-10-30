      function tzPagHelpTexts(pz, root, opts) {
        // Usage help for each section (2026-10-10, user's request: "add
        // usage information for all the functions"): a "How it is used" button
        // at the top of the panel, folded by default. Editor and Find center bring
        // their own from 40-cuts.js (TC_HELP).
        pz.TZ_HELP = {
          zones: {
            title: i18nT('zonesPage.work_zones'),
            steps: [
              i18nT('zonesPage.a_zone_g55_to_g59_3'),
              i18nT('zonesPage.active_zone_the_one_the_machine'),
              i18nT('zonesPage.all_zones_the_table_to_use'),
              i18nT('zonesPage.positions_saved_machine_places_to_go'),
            ],
            notes: [
              i18nT('zonesPage.on_the_map_press_and_hold'),
              i18nT('zonesPage.dragging_a_zone_s_origin_opens'),
            ],
          },
          job: {
            title: i18nT('zonesPage.job_in_progress'),
            steps: [
              i18nT('zonesPage.shows_on_the_map_the_path'),
              i18nT('zonesPage.laser_by_power_and_cnc_by_depth'),
              i18nT('zonesPage.it_works_the_same_for_file'),
            ],
            notes: [],
          },
          prepare: {
            title: i18nT('common.prepare'),
            steps: [
              i18nT('zonesPage.step_by_step_before_cutting_machine'),
              i18nT('zonesPage.each_step_checks_itself_when_done'),
            ],
            notes: [],
          },
          area: {
            title: i18nT('common.cut_area'),
            steps: [
              i18nT('zonesPage.it_is_the_bed_rectangle_where'),
              i18nT('zonesPage.frame_runs_along_the_outline_to'),
            ],
            notes: [i18nT('zonesPage.on_the_map_you_can_drag')],
          },
          simulate: {
            title: i18nT('tv.tab'),
            steps: [i18nT('zonesPage.help_simulate_1'), i18nT('zonesPage.help_simulate_2'), i18nT('zonesPage.help_simulate_3')],
            notes: [i18nT('zonesPage.help_simulate_note')],
          },
          large: {
            title: i18nT('zonesPage.cut_in_parts'),
            steps: [i18nT('zonesPage.help_large_1'), i18nT('zonesPage.help_large_2')],
            notes: [i18nT('zonesPage.help_large_note')],
          },
          materials: {
            title: i18nT('materials.materials'),
            steps: [
              i18nT('zonesPage.the_material_library_thickness_focus_power'),
              i18nT('zonesPage.assigning_a_material_to_a_zone'),
              i18nT('zonesPage.when_measuring_the_machine_compares_the'),
            ],
            notes: [],
          },
        };
        // the registered tools of the page bring their own (def.help, e.g. the Machine tabs of WorkshopMachine)
        pz.extraTools.forEach(function (d) { if (typeof d.help === "function") pz.TZ_HELP[d.id] = d.help(); });
        pz.TZ_HELP_KEY = "workshopWorkbenchHelpOpen";
        pz.helpOpen = false;
      }

      function tzPagHelpPaint(pz, root, opts) {
        try {
          pz.helpOpen = localStorage.getItem(pz.TZ_HELP_KEY) === "1";
        } catch (e) {
          /* plegada */
        }
        pz.helpBox = tzEl("div", "tz-card wf-card");
        pz.helpBox.style.cssText = "padding:8px 12px;margin-bottom:8px;";
        pz.zSubBar = null;
      }
