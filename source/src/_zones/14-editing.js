      // ---- Do not redraw a card while it is being typed in (2026-10-12) ----
      //
      // Reported: "in Offsets, when touching a field the keyboard does not open on the
      // touch screen". Cause: the Zones cards (Offsets, Active zone,
      // Prepare, Cutting area, probe offset assistant) are rebuilt
      // entirely (innerHTML = "") every time their key changes, and the key
      // includes things that change by themselves every poll second: the machine
      // state (idle/busy with any command from another plugin), the head's
      // position, the requirement LEDs... When rebuilding it, the touched field is
      // replaced by a new one WITHOUT focus: the on-screen keyboard
      // (which opens with focus) does not manage to open or closes right away, and
      // what was typed is lost.
      //
      // Fix: while a text/number field of the card has focus
      // it is not rebuilt; it is rebuilt when it is released (focusout), waiting for the
      // touch in progress to finish so as not to replace the button being
      // touched (e.g. "Save", which takes the focus from the field when pressed).
      // <select>s do not count: they do not open a keyboard and after choosing they keep
      // the focus (the card would be stale until tapping elsewhere).

      var TZ_ED_NO_TEXT = ["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"];
      var tzEdPressing = false;
      var tzEdInstalled = false;
      // The three listeners of window that follow the finger (pointerdown = pressed, up / cancel = released), and what each card that waits
      // holds (its focusout and pointerup listeners, its timer): all of it goes when the plugin stops (workshopOnStop).
      var TZ_ED_POINTER = { pointerdown: true, pointerup: false, pointercancel: false };
      var tzEdPointerFns = {};
      var tzEdWaiters = [];

      // true if the focus is on a typing field, inside `card`.
      function tzEditing(card) {
        var a = document.activeElement;
        if (!a || !card || a === card || !card.contains(a)) return false;
        var t = (a.tagName || "").toUpperCase();
        if (t === "TEXTAREA") return true;
        if (t !== "INPUT") return !!a.isContentEditable;
        return TZ_ED_NO_TEXT.indexOf(String(a.type || "").toLowerCase()) < 0;
      }

      function tzEdInstall() {
        if (tzEdInstalled) return;
        tzEdInstalled = true;
        Object.keys(TZ_ED_POINTER).forEach(function (type) {
          tzEdPointerFns[type] = function () { tzEdPressing = TZ_ED_POINTER[type]; };
          window.addEventListener(type, tzEdPointerFns[type], true);
        });
        workshopOnStop(tzEdUninstall);
      }

      // The plugin stopped: nothing stays on window, no card waits any more. tzEdInstalled stays true so that a page that is still open (DWC 3.6
      // cannot remove a route) does not put the listeners back (tzRedrawOnRelease does nothing once the plugin is stopped).
      function tzEdUninstall() {
        Object.keys(tzEdPointerFns).forEach(function (type) { window.removeEventListener(type, tzEdPointerFns[type], true); });
        tzEdPointerFns = {};
        tzEdPressing = false;
        tzEdWaiters.slice().forEach(function (drop) { drop(); });
      }

      // Calls fn() once, when `card` is no longer being typed in.
      // Several calls while waiting = a single wait.
      function tzRedrawOnRelease(card, fn) {
        if (pluginStopped) return; // a page left open by a stopped plugin: no wait, no listener that nobody would take away (the next draw finds the field released)
        tzEdInstall();
        card._tzEdFn = fn; // la ultima pedida
        if (card._tzEdWaiting) return;
        card._tzEdWaiting = true;
        var timer = null;
        function drop() {
          clearTimeout(timer);
          card._tzEdWaiting = false;
          card.removeEventListener("focusout", attempt);
          window.removeEventListener("pointerup", attempt, true);
          var i = tzEdWaiters.indexOf(drop);
          if (i >= 0) tzEdWaiters.splice(i, 1);
        }
        function attempt() {
          clearTimeout(timer);
          // 350 ms: the touched button's click has already happened (it comes right after
          // pointerup) before rebuilding the card
          timer = setTimeout(function () {
            if (!card._tzEdWaiting) return;
            if (tzEditing(card) || tzEdPressing) return; // sigue: el proximo focusout/pointerup reintenta
            drop();
            var f = card._tzEdFn;
            card._tzEdFn = null;
            if (f) f();
          }, 350);
        }
        tzEdWaiters.push(drop);
        card.addEventListener("focusout", attempt);
        window.addEventListener("pointerup", attempt, true);
      }
