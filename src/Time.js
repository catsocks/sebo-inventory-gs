/* exported getTimelessDate */
'use strict';

/**
 * Return the current date without time information.
 *
 * @returns {Date}
 */
function getTimelessDate() {
  const now = new Date();
  const timeZone = SpreadsheetApp.getActiveSpreadsheet()
      .getSpreadsheetTimeZone();
  const string =
    Utilities.formatDate(now, timeZone, 'yyyy-MM-dd 00:00:00 Z');
  return new Date(string);
}
