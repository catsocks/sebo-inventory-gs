/* exported formatBulletList, formatList, uncapitalize, removeSuffix */

const _listFormatter = new Intl.ListFormat('pt-BR',
    {style: 'long', type: 'conjunction'});

/**
 * Returns a bullet list from the given list.
 *
 * @param {Array.<string>} list
 * @param {string} separator
 * @param {string} itemEnd
 * @param {string} lastItemEnd
 * @returns {string}
 */
function formatBulletList(list, separator = '\u2001• ', itemEnd = ';',
    lastItemEnd = '.') {
  if (list.length == 0) {
    return '';
  }
  if (list.length == 1) {
    return separator + list[0] + lastItemEnd + '\n';
  }
  return separator + list.join(itemEnd + '\n' + separator) + lastItemEnd;
}

/**
 * Returns a textual representation of the given list.
 *
 * @param {Array.<string>} list
 * @returns {string}
 */
function formatList(list) {
  return _listFormatter.format(list);
}

/**
 * Returns the given text uncapitalized.
 *
 * @param {string} text
 * @returns {string}
 */
function uncapitalize(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * Returns the given text without the given suffix.
 *
 * @param {string} text
 * @param {string} suffix
 * @returns {string}
 */
function removeSuffix(text, suffix) {
  if (text.endsWith(suffix)) {
    return text.slice(0, text.length - suffix.length);
  }
  return text;
}
