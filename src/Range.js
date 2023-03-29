/* exported insertNumberSequence */

/**
 * Fill the first column in the given range with an ascending sequence of
 * numbers.
 *
 * The top-left cell in the given range is used as the start of the sequence,
 * if available.
 *
 * @param {object} range - A Google Sheets range.
 * @param {number} start - The initial value of the sequence.
 */
function insertNumberSequence(range, start = 1) {
  const val = range.getValue();
  if (Number.isInteger(val)) {
    start = val;
  }

  const vals = range.getValues();
  for (let i = 0; i < vals.length; i++) {
    vals[i][0] = start + i;
  }
  range.setValues(vals);
}
