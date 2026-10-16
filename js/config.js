/* Site settings. Months are 0-based in JavaScript: 9 = October. */
window.CONFIG = {
  // Visible countdown in the corner of every page: midnight at the start of
  // Oct 17 2026, in the visitor's own local time zone.
  BIRTHDAY: [2026, 9, 17, 0, 0, 0],

  // The secret countdown (unlocks after every page has been tried).
  SECRET_TARGET: [2026, 9, 17, 10, 0, 0],

  // Testing helpers. Set BOTH to false before the final deploy (see README).
  //   DEBUG_MENU: Shift+D opens the skip / fake-time menu.
  //   DEBUG_URL:  ?page=quiz and ?t=-10 style URL parameters work.
  DEBUG_MENU: false,
  DEBUG_URL: false,
};
