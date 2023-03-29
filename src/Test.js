/* exported runTests */

function itShouldFormatBulletList() {
  const parameters = [
    [['apples'], '\u2001• apples.\n'],
    [['apples', 'oranges'], '\u2001• apples;\n\u2001• oranges.'],
  ];
  for (const [input, expected] of parameters) {
    if (formatBulletList(input) !== expected) {
      console.log('itShouldFormatBulletList:\n', formatBulletList(input));
      return false;
    }
  }
  return true;
}

function itShouldFormatList() {
  const parameters = [
    [['maçãs'], 'maçãs'],
    [['maçãs', 'laranjas'], 'maçãs e laranjas'],
    [['maçãs', 'laranjas', 'uvas'], 'maçãs, laranjas e uvas'],
  ];
  for (const [input, expected] of parameters) {
    if (formatList(input) !== expected) {
      console.log('itShouldFormatList:\n', formatList(input));
      return false;
    }
  }
  return true;
}

function itShouldUncapitalize() {
  return uncapitalize('Maçã') === 'maçã';
}

function itShouldRemoveSuffix() {
  return removeSuffix('Maçãs, laranjas, uvas, ...', ', ...') ===
    'Maçãs, laranjas, uvas';
}

/**
 * Should be invoked through the Google Apps Script editor or Clasp from the
 * terminal with the command `clasp run runTests`.
 *
 * @returns {string} - Summary of the test results.
 */
function runTests() {
  const tests = [
    itShouldFormatBulletList,
    itShouldFormatList,
    itShouldUncapitalize,
    itShouldRemoveSuffix,
  ];

  let passed = 0;
  for (const test of tests) {
    if (test()) {
      passed++;
    } else {
      console.error(`${test.name}: FAILED`);
    }
  }

  return `${passed} test(s) out of ${tests.length} passed.`;
}
