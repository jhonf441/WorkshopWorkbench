      // ---- Workbench page: the CSS of the page and of the modules (stage 3 of the redesign: moved out of 30-zones-page.js) ----
      // HOOK etapa 4/5/6/7: CSS added by other files (each one pushes its text at load time: TZ_CSS_EXTRA.push(".x{...}")): it goes
      // at the end of the style element, after the CSS above, so it can override it.
      var TZ_CSS_EXTRA = [];
      function tzInjectStyle() {
        workshopInjectFamily(); // the design family (wf-* classes), once per page
        if (document.getElementById(TZ_STYLE_ID)) return;
        var st = document.createElement("style");
        st.id = TZ_STYLE_ID;
        st.textContent = workshopCss(TZ_CSS_BASE.concat(TZ_CSS_EXTRA));
        document.head.appendChild(st);
      }
