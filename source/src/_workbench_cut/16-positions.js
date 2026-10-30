      // ---- Saved positions: go to one (the file and its changes are in _shared/17-positions.js) ----
      // Go to a position: rises to the highest Z (the current or the saved one),
      // goes in X/Y and lowers -- same as the jog's "Go". G53 = machine
      // coords; S0 = laser off.
      function workshopPosGo(pos, curZ) {
        // without the jog (if the jog is not loaded): moderate fixed feeds
        var feed = typeof jogMaxFeedXY === "function" ? jogMaxFeedXY() : 3000;
        var feedZ = typeof jogMaxFeedZ === "function" ? jogMaxFeedZ() : 300;
        var z = isFinite(pos.z) ? pos.z : curZ;
        var safeZ = Math.max(isFinite(z) ? z : 0, isFinite(curZ) ? curZ : -Infinity);
        var codes = ["G90"];
        if (isFinite(safeZ)) codes.push("G53 G1 Z" + safeZ.toFixed(3) + " F" + feedZ.toFixed(0) + " S0");
        codes.push("G53 G1 X" + pos.x.toFixed(3) + " Y" + pos.y.toFixed(3) + " F" + feed.toFixed(0) + " S0");
        if (isFinite(z)) codes.push("G53 G1 Z" + z.toFixed(3) + " F" + feedZ.toFixed(0) + " S0");
        // A single request (motion audit, finding 10): with the G90 and
        // the G53 G1 in separate requests, another client of the same channel could
        // leave G91 in between (or a G1 stay in relative).
        return postCode(codes.join("\n"));
      }
