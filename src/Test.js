/* exported runTests */

function assertEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(String.raw`Expected "${expected}", got "${actual}"`);
  }
}

function assertIsNotNull(value, message) {
  if (value === null) {
    throw new Error(message);
  }
}

class Fixture {
  constructor(spreadsheet, testName, numSheets) {
    this._spreadsheet = spreadsheet;

    this.sheets = [];
    this.sheetNames = [];
    const baseSheetName = testName;
    const numSheetsTotal = spreadsheet.getNumSheets();
    for (let i = 0; i < numSheets; i++) {
      const sheetName = baseSheetName + i.toString();
      if (spreadsheet.getSheetByName(sheetName)) {
        throw new Error(`Cannot run test ${testName} because it would ` +
          `overwrite the sheet ${sheetName}.`);
      }
      this.sheets.push(spreadsheet.insertSheet(sheetName, numSheetsTotal + i));
      this.sheetNames.push(sheetName);
    }
  }

  cleanup() {
    for (const sheet of this.sheets) {
      this._spreadsheet.deleteSheet(sheet);
    }
  }

  withCleanup(fn) {
    try {
      fn(this);
    } finally {
      this.cleanup();
    }
  }
}

class RowFixture extends Fixture {
  constructor(spreadsheet, testName) {
    super(spreadsheet, testName, 1);

    this.values = [
      ['SKU', 'Título'],
      [1, 'Olá'],
    ];
    const range = this.sheets[0].getRange(1, 1, 2, 2);
    range.setValues(this.values);
  }
}

class MultiRowFixture extends Fixture {
  constructor(spreadsheet, testName) {
    super(spreadsheet, testName, 2);

    this.headers = [
      ['SKU', 'Título'],
      ['SKU', 'Preço'],
    ];
    let range = this.sheets[0].getRange(1, 1, 1, 2);
    range.setValues([this.headers[0]]);
    range = this.sheets[1].getRange(1, 1, 1, 2);
    range.setValues([this.headers[1]]);
  }
}

function itShouldFormatBulletList() {
  const parameters = [
    [['apples'], '\u2001• apples.'],
    [['apples', 'oranges'], '\u2001• apples;\n\u2001• oranges.'],
  ];
  for (const [input, expected] of parameters) {
    assertEqual(formatBulletList(input), expected);
  }
}

function itShouldFormatList() {
  const parameters = [
    [['maçãs'], 'maçãs'],
    [['maçãs', 'laranjas'], 'maçãs e laranjas'],
    [['maçãs', 'laranjas', 'uvas'], 'maçãs, laranjas e uvas'],
  ];
  for (const [input, expected] of parameters) {
    assertEqual(formatList(input), expected);
  }
}

function itShouldUncapitalize() {
  assertEqual(uncapitalize('Maçã'), 'maçã');
}

function itShouldRemoveSuffix() {
  assertEqual(removeSuffix('Maçãs, laranjas, uvas, ...', ', ...'),
      'Maçãs, laranjas, uvas');
}

function itShouldSlugify() {
  assertEqual(slugify('Maçãs e laranjas'), 'macas-e-laranjas');
}

function itShouldChangeRowValue(spreadsheet, testName) {
  const fixture = new RowFixture(spreadsheet, testName);
  fixture.withCleanup((fixture) => {
    const sheet = fixture.sheets[0];
    const row = new Row(sheet, 2);
    assertEqual(row.getValue('Título'), fixture.values[1][1]);

    const newValue = 'Olá Mundo';
    row.setValue('Título', newValue);
    row.save();
    assertEqual(sheet.getRange(2, 2).getValue(), newValue);
  });
}

function itShouldFindRows(spreadsheet, testName) {
  const fixture = new RowFixture(spreadsheet, testName);
  fixture.withCleanup((fixture) => {
    const sheet = fixture.sheets[0];
    let row = Row.getByFirstColumn(sheet, 1);
    assertEqual(row.getValue('Título'), fixture.values[1][1]);

    row = Row.getByFirstEmptyColumn(sheet);
    assertIsNotNull(row, 'getByFirstEmptyColumn returned null');
    assertEqual(row.getValue('SKU'), '');
    assertEqual(row.getValue('Título'), '');
  });
}

function itShouldChangeMultipleRows(spreadsheet, testName) {
  const fixture = new MultiRowFixture(spreadsheet, testName, 2);
  fixture.withCleanup((fixture) => {
    const newValues = ['Laranja', 5];
    const row = new MultiSheetRow(spreadsheet, 1, ...fixture.sheetNames);
    row.setValue(fixture.sheetNames[0], fixture.headers[0][1], newValues[0]);
    row.setValue(fixture.sheetNames[1], fixture.headers[1][1], newValues[1]);
    row.save();

    assertEqual(fixture.sheets[0].getRange(2, 2).getValue(), newValues[0]);
    assertEqual(fixture.sheets[1].getRange(2, 2).getValue(), newValues[1]);
  });
}

/**
 * Should be invoked through the Apps Script editor or Clasp from the terminal
 * with the command `clasp run runTests`.
 *
 * @returns {string}
 */
function runTests() {
  const ss = SpreadsheetApp.getActive();

  const tests = [
    itShouldFormatBulletList,
    itShouldFormatList,
    itShouldUncapitalize,
    itShouldRemoveSuffix,
    itShouldSlugify,
    itShouldChangeRowValue,
    itShouldFindRows,
    itShouldChangeMultipleRows,
  ];

  let passed = 0;
  for (const test of tests) {
    try {
      test(ss, test.name);
    } catch (e) {
      console.error(`Test ${test.name}: FAILED: ${e}`);
      continue;
    }

    passed++;
  }

  const summary = `${passed} test(s) out of ${tests.length} passed.`;
  if (passed !== tests.length) {
    return summary + ' Check logs for errors.';
  }
  return summary;
}
