/* exported onOpen, insertNumberSequenceFromUi, jumpToSheetFromUi,
jumpToRowFromUi */

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Shop')
      .addItem('Pular para fileira', 'jumpToRowFromUi')
      .addItem('Pular para planilha', 'jumpToSheetFromUi')
      // .addSeparator()
      // .addItem('Preencher produto automaticamente', 'autofillProductFromUi')
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
  const promptTitle = 'Pular para planilha';

  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(promptTitle,
      'Forneça o nome da planilha a ser pesquisada. Uma fileira com ' +
      'o mesmo valor da primeira coluna da primeira fileira no intervalo ' +
      ' ativo também será pesquisada.', ui.ButtonSet.OK);
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
  const text = activeSheet.getRange(activeRange.getRow(), 1).getValue();
  if (text) {
    const range = targetSheet.getRange(1, 1, targetSheet.getLastRow());
    const match = range.createTextFinder(text).findNext();
    if (match) {
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
  const promptTitle = 'Pular para fileira';

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

// function autofillProductFromUi() {

// }
