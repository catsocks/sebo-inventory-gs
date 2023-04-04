/* exported Row, MultiSheetRow, mapRange */
'use strict';

class ColumnNotFoundError extends Error {
  constructor(sheetName, column) {
    super(`A column named "${column}" in the sheet ${sheetName} wasn't found.`);
    this.sheetName = sheetName;
    this.column = column;
  }
}

class FullSheetError extends Error {
  constructor(sheetName) {
    super(`The sheet ${sheetName} is full.`);
    this.sheetName = sheetName;
  }
}

/**
 * Represent a row beloging to a sheet with a header row with a few conveniences
 * for retrieving and changing columns.
 *
 * Assumes values stylized with italic are auto-generated and should not be set.
 */
class Row {
  /**
   * Store the values of a given row mapped to the values of the sheet's header
   * row.
   *
   * @param {object} sheet - Sheets sheet.
   * @param {number} rowNo
   */
  constructor(sheet, rowNo) {
    if (rowNo === 1) {
      throw new Error('The first row cannot be used. It should be reserved ' +
        'for the header row.');
    }

    this._sheet = sheet;
    // NOTE: Is Sheet.getSheetValues() faster than Sheet.getRange().getValues()?
    this._headerValues =
      sheet.getSheetValues(1, 1, 1, sheet.getLastColumn())[0];
    this._range = sheet.getRange(rowNo, 1, 1, sheet.getLastColumn());
    this._values = this._range.getValues()[0];
    const styles = this._range.getTextStyles();
    this._italicValues = styles[0].map((v) => v.isItalic());
    this._dirty = false;
  }

  /**
   * Return the cached value of a given column from the row.
   *
   * @param {*} column
   * @returns {*}
   */
  getValue(column) {
    const idx = this._headerValues.indexOf(column);
    if (idx >= 0) {
      return this._values[idx];
    }
    throw new ColumnNotFoundError(this._sheet.getName(), column);
  }

  /**
   * Change the cached value of a given column from the row.
   *
   * @param {*} column
   * @param {*} value
   * @returns {*}
   */
  setValue(column, value) {
    const idx = this._headerValues.indexOf(column);
    if (this._italicValues[idx]) {
      throw new Error(`Cannot change "${column}" value in italic.`);
    }
    if (idx >= 0) {
      this._dirty = true;
      return this._values[idx] = value;
    }
    throw new ColumnNotFoundError(this._sheet.getName(), column);
  }

  setValues(...values) {
    if (values.length > this._values.length) {
      throw new Error('There are more values to set than columns in the row.');
    }
    for (let i = 0; i < values.length; i++) {
      this._values[i] = values[i];
    }
    this._dirty = true;
  }

  /**
   * Save the cached values of the row back to the sheet.
   */
  save() {
    if (!this._dirty) {
      return;
    }
    // Values which are assumed to be auto-generated, by a function such as
    // ARRAYFORMULA, are set to blank to avoid array expansion errors, as well
    // as to avoid making multiple slow calls to setValues or setValues.
    const values = this._values.map((v, i) => (this._italicValues[i]) ? '' : v);
    this._range.setValues([values]);
    this._dirty = false;
  }

  /**
   * Return a Row representation of the first row in the given sheet whose
   * first colum natches the given value.
   *
   * @param {object} sheet - Sheets sheet.
   * @param {*} value
   * @returns {Row}
   */
  static getByFirstColumn(sheet, value) {
    const range = sheet.getRange(1, 1, sheet.getLastRow());
    const cell = range.createTextFinder(value).findNext();
    if (cell === null) {
      return null;
    }
    return new Row(sheet, cell.getRow());
  }

  /**
   * Return a Row representation of the first row in the given sheet whose
   * first colum is empty.
   *
   * @param {object} sheet - Sheets sheet.
   * @returns {Row}
   */
  static getByFirstEmptyColumn(sheet) {
    // It's much simpler to find an empty row with Sheet.getLastRow(), but a row
    // filled with default values, such as that of an checkbox, is still
    // considered empty for the purpose of this function.
    const values = sheet.getSheetValues(1, 1, sheet.getMaxRows(), 1);
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === '') {
        return new Row(sheet, i + 1);
      }
    }
    return null;
  }
}

class MultiSheetRow {
  /**
   * Represent rows across multiple sheets that share a first column value in
   * common.
   *
   * @param {object} spreadsheet - Sheets spreadsheet.
   * @param {*} firstValue
   * @param {Array.<string>} sheetNames
   */
  constructor(spreadsheet, firstValue, ...sheetNames) {
    if (sheetNames.length === 0) {
      throw new Error('At least one sheet name is needed.');
    }

    this._rowsBySheet = {};
    for (const name of sheetNames) {
      const sheet = spreadsheet.getSheetByName(name);
      if (sheet === null) {
        throw new Error(`Sheet ${name} does not exist.`);
      }

      let row = Row.getByFirstColumn(sheet, firstValue);
      if (row !== null) {
        this._rowsBySheet[name] = row;
        continue;
      }
      row = Row.getByFirstEmptyColumn(sheet);
      if (row === null) {
        throw new FullSheetError(name);
      }
      row.setValues(firstValue);
      this._rowsBySheet[name] = row;
    }
  }

  getValue(sheetName, column) {
    return this.getSheet(sheetName).getValue(column);
  }

  setValue(sheetName, column, value) {
    return this.getSheet(sheetName).setValue(column, value);
  }

  getSheet(sheetName) {
    if (sheetName in this._rowsBySheet) {
      return this._rowsBySheet[sheetName];
    }
    throw new Error(`Sheet "${sheetName}" was not found in multi sheet row.`);
  }

  save() {
    const rows = Object.values(this._rowsBySheet);
    for (const row of rows) {
      row.save();
    }
  }
}

function mapRange(range) {
  const values = range.getValues();
  if (range.getWidth() !== 2) {
    throw new Error('Cannot map range wider than 2 cells.');
  }
  const map = new Map();
  for (let i = 0; i < values.length; i++) {
    map.set(values[i][0], values[i][1]);
  }
  return map;
}
