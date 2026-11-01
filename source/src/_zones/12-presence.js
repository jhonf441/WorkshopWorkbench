      // ---- Other plugins: is it there? ----
      // Rule of the owner: a plugin that refers to another one shows nothing about it (no button, link, text, card or hint: hidden,
      // not disabled) while the other one is not installed or not enabled in DWC. The answer is workshopPluginActive(key) of
      // src/_shared/13-presence.js (the same for every plugin; it never looks at the routes). A text that names the other plugin comes in two
      // variants, "key" and "key_no_<plugin>" (the second says what cannot be done here without naming it, or is left out): tzTx picks.
      // Ask when a card is built or drawn, not once at load: a plugin can be started or stopped meanwhile.

      // The text that names the plugin `plugin` (a key of WORKSHOP_IDS), or its variant without the name when that plugin is not there
      function tzTx(key, plugin, params) {
        return i18nT(workshopPluginActive(plugin) ? key : key + "_no_" + plugin, params);
      }

      // The plugins this page refers to, for the signature that tells when one of them started or stopped
      var TZ_PRESENCE_KEYS = ["machine", "printing", "vision", "jog", "bar", "activity"];

      // One string that changes when any of those plugins starts or stops: part of the key of the cards that cache what they drew
      function tzPresenceKey() {
        return TZ_PRESENCE_KEYS.map(function (k) { return workshopPluginActive(k) ? 1 : 0; }).join("");
      }
