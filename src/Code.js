/* exported onOpen, jumpToSheetFromUi, jumpToRowFromUi,
autofillProductsFromUi */

const menuItems = {
  'jumpToRowFromUi': 'Pular para fileira',
  'jumpToSheetFromUi': 'Pular para planilha',
  'autofillProductsFromUi': 'Preencher produtos automaticamente',
};

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Shop')
      .addItem(menuItems['jumpToRowFromUi'], 'jumpToRowFromUi')
      .addItem(menuItems['jumpToSheetFromUi'], 'jumpToSheetFromUi')
      .addSeparator()
      .addItem(menuItems['autofillProductsFromUi'], 'autofillProductsFromUi')
      .addToUi();
}

/**
 * Jump to the first sheet whose name matches a given string. Then jump to the
 * first row whose first column shares the same value as that of the first row
 * in the active range, if available.
 *
 * The user is prompted for the string that should match the name of the sheet.
 *
 * To be invoked through a custom menu.
 */
function jumpToSheetFromUi() {
  const promptTitle = menuItems['jumpToRowFromUi'];

  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(promptTitle,
      'Forneça o nome da planilha a ser pesquisada. Uma fileira com ' +
      'o mesmo valor da primeira coluna da primeira fileira no intervalo ' +
      'ativo também será pesquisada.', ui.ButtonSet.OK);
  if (resp.getSelectedButton() === ui.Button.CLOSE) {
    return;
  }
  const respText = resp.getResponseText();
  if (respText === '') {
    ui.alert(promptTitle,
        'É necessário informar pelo menos parte do nome de uma planilha a ' +
      'ser pesquisada.', ui.ButtonSet.OK);
    return;
  }

  let targetSheet;
  const ss = SpreadsheetApp.getActive();
  for (const sheet of ss.getSheets()) {
    if (sheet.getName().startsWith(respText)) {
      targetSheet = sheet;
    }
  }
  if (targetSheet === undefined) {
    ui.alert(promptTitle, 'Não foi possível encontrar uma planilha que ' +
      `começasse com "${respText}".`, ui.ButtonSet.OK);
    return;
  }

  const activeRange = ss.getActiveRange();
  if (activeRange === null) {
    ss.setActiveSheet(targetSheet);
  }

  // Try to find a row that shares the same first column value to set as active.
  const activeSheet = SpreadsheetApp.getActiveSheet();
  const value = activeSheet.getRange(activeRange.getRow(), 1).getValue();
  if (value !== '') {
    const range = targetSheet.getRange(1, 1, targetSheet.getLastRow());
    const match = range.createTextFinder(value).findNext();
    if (match !== null) {
      targetSheet.setActiveRange(match);
      return;
    }
  }

  ss.setActiveSheet(targetSheet);
}

/**
 * Jump to the first row containing a given value in its first column.
 *
 * The user is prompted to provide the value.
 *
 * To be invoked through a custom menu.
 */
function jumpToRowFromUi() {
  const promptTitle = menuItems['jumpToSheetFromUi'];

  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(promptTitle, 'Forneça o valor da primeira coluna da ' +
    'fileira a ser pesquisada.', ui.ButtonSet.OK);
  if (resp.getSelectedButton() === ui.Button.CLOSE) {
    return;
  }
  const respText = resp.getResponseText();
  if (respText === '') {
    ui.alert(promptTitle, 'É necessário informar um valor a ser pesquisado.',
        ui.ButtonSet.OK);
    return;
  }

  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange(1, 1, sheet.getLastRow());
  const match = range.createTextFinder(respText).findNext();
  if (match) {
    sheet.setActiveRange(match);
    return;
  }

  ui.alert(promptTitle, `Não foi possível encontrar uma fileira com o valor ` +
    `"${respText}" na primeira coluna.`, ui.ButtonSet.OK);
}

/**
 * Autofill the rows for products across sheets.
 *
 * To be invoked through a custom menu.
 */
function autofillProductsFromUi() {
  const alertTitle = menuItems['autofillProductsFromUi'];

  const ss = SpreadsheetApp.getActive();
  const rangeList = ss.getActiveRangeList();
  const ui = SpreadsheetApp.getUi();
  if (rangeList === null) {
    ui.alert(alertTitle,
        'É necessário selecionar um intervalo de SKUs de produtos.',
        ui.ButtonSet.OK);
    return;
  }

  let products;
  try {
    products = getProducts(ss, rangeList);
  } catch (e) {
    if (e instanceof FullSheetError) {
      ui.alert(alertTitle, 'É necessário criar mais fileiras na planilha ' +
        `${e.sheetName} para continuar.`, ui.ButtonSet.OK);
      return;
    } else if (e instanceof InvalidSKUError) {
      ui.alert(alertTitle, `A fileira ${e.rowNo} não contém um SKU válido em ` +
        `sua primeira coluna.`, ui.ButtonSet.OK);
      return;
    }
    throw e;
  }

  for (const product of products) {
    try {
      product.autofill();
    } catch (e) {
      if (e instanceof ColumnNotFoundError) {
        ui.alert(alertTitle, `Não foi possível encontrar a coluna ` +
          `rotulada "${e.column}" na planilha ${e.sheetName}.`,
        ui.ButtonSet.OK);
        return;
      }
      throw e;
    }
    product.save();
  }
}