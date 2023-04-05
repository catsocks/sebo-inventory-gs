/* exported Product, getProducts, findProductSKUs */
'use strict';

class InvalidSKUError extends Error {
  constructor(rowNo) {
    super(`Row ${rowNo} does not contain a valid SKU in its first column.`);
    this.rowNo = rowNo;
  }
}

class ProductNotSupportedError extends Error {
  constructor(sku, productType) {
    if (productType === '') {
      super(`Could not guess the type of the product with SKU ${sku}. ` +
        `Please specify it.`);
    } else {
      super(`The product of type "${productType}" is not supported.`);
    }
    this.sku = sku;
    this.productType = productType;
  }
}

class Product extends MultiSheetRow {
  constructor(spreadsheet, sku) {
    super(spreadsheet, sku, 'Básico', 'Impressos', 'Shopee', 'Mercado Livre');

    const [guessed, type] = this.getTypeOrGuess(spreadsheet);
    if (type !== 'Impresso') {
      throw new ProductNotSupportedError(sku, type);
    }
    if (guessed) {
      this.setValue('Básico', 'Tipo', type);
    }

    this.descriptionStrings =
      mapRange(spreadsheet.getRangeByName('DescriçãoShopeePartes'));
  }

  getTypeOrGuess(spreadsheet) {
    let guessed = false;
    const type = this.getValue('Básico', 'Tipo');
    if (type !== '') {
      return [true, type];
    }
    guessed = true;
    return [guessed, Product.guessTypeFromSheet(spreadsheet.getActiveSheet())];
  }

  static guessTypeFromSheet(sheet) {
    const sheetName = sheet.getName();
    const typeBySheets = {'Impressos': 'Impresso'};
    if (sheetName in typeBySheets) {
      return typeBySheets[sheetName];
    }
    return null;
  }

  autofill(overwrite = false) {
    const filler = new ProductColumnsAutofiller();
    filler.add('Básico', 'Data criado', this.setDateCreated);
    filler.add('Básico', 'Estoque', this.setStock);
    filler.add('Básico', 'Referência', this.setReference);
    filler.add('Básico', 'Categoria', this.setCategory);
    filler.add('Básico', 'Cód. de barras (GTIN)', this.setGTIN);
    filler.add('Shopee', 'Título', this.setShopeeTitle);
    filler.add('Shopee', 'Descrição', this.setShopeeDescription);
    filler.add('Mercado Livre', 'Título', this.setMercadoLivreTitle);
    filler.add('Mercado Livre', 'Descrição', this.setMercadoLivreDescription);
    filler.autofill(this, overwrite);
  }

  setDateCreated() {
    this.setValue('Básico', 'Data criado', getTimelessDate());
  }

  setStock() {
    this.setValue('Básico', 'Estoque', 1);
  }

  setReference() {
    const title =
      this.getValue('Impressos', 'Título: Como na capa').substring(0, 40);
    if (title === '') {
      return;
    }

    const info = [title];
    const authors = this.getCSV('Impressos', 'Participantes: Autores');
    if (authors.length > 0) {
      info.push(authors[0]);
    }
    const query = encodeURIComponent(info.join(' '));
    this.setValue('Básico', 'Referência',
        'https://www.estantevirtual.com.br/busca?q=' + query);
  }

  setCategory() {
    const text = this.getValue('Impressos', 'Classificação').split(';')[0];
    this.setValue('Básico', 'Categoria', text);
  }

  setGTIN() {
    const isbn13 = this.getValue('Impressos', 'ISBN-13');
    this.setValue('Básico', 'Cód. de barras (GTIN)', isbn13);
  }

  setShopeeTitle() {
    this.setValue('Shopee', 'Título', this.createTitle());
  }

  setMercadoLivreTitle() {
    this.setValue('Mercado Livre', 'Título', this.createTitle());
  }

  createTitle() {
    const parts = [
      this.getValue('Impressos', 'Tipo'),
      this.getValue('Impressos', 'Título: Como na capa'),
    ];

    const authors = this.getCSV('Impressos', 'Participantes: Autores');
    if (authors.length > 0) {
      parts.push('de ' + formatList(authors));
    }

    const edition = this.getValue('Impressos', 'Edição: N.º');
    if (edition !== '') {
      parts.push(edition + 'ª edição');
    }

    const language = this.getValue('Impressos', 'Idioma');
    if (language !== '' && language !== 'Português') {
      parts.push('em ' + language);
    }

    return parts.join(' ');
  }

  /**
   * Return a given column with a product's comma/semicolon separated values as
   * a list.
   *
   * @param {string} sheetName
   * @param {string} column
   * @returns {Array.<string>}
   */
  getCSV(sheetName, column) {
    return Product.parseCSV(this.getValue(sheetName, column));
  }

  setShopeeDescription() {
    const parts = [];

    parts.push(this.descriptionStrings.get('Condição'));
    parts.push(this.createShopeeConditionDescription());
    parts.push(this.createShopeeDescriptionAttributes());
    parts.push(this.getValue('Impressos', 'Outros detalhes'));
    parts.push(this.descriptionStrings.get('Shopee: Chat'));
    parts.push(this.descriptionStrings.get('Fotos'));
    parts.push(this.createShopeeDescriptionSynopsis());

    const description = parts.filter((s) => s !== '').join('\n\n');
    this.setValue('Shopee', 'Descrição', description);
  }

  createShopeeConditionDescription() {
    const attribs = this.createShopeeConditionDescriptionAttributes();
    const otherDetails =
      this.getValue('Impressos', 'Condição: Outros detalhes');
    const text = [attribs, otherDetails].filter((s) => s !== '').join('\n\n');
    if (text === '') {
      return '';
    }
    const prefix = 'Detalhes da condição:';
    if (attribs === '') {
      return prefix + ' ' + uncapitalize(text);
    }
    return prefix + '\n' + text;
  }

  createShopeeConditionDescriptionAttributes() {
    const columnFormatters = ['uncapitalize', 'truncateSentence'];
    const fmt = new ProductAttributesFormatter('Impressos', columnFormatters);
    fmt.add('Condição: Grifos', 'Grifos');
    fmt.add('Condição: Anotações', 'Anotações');
    fmt.add('Condição: Manchas', 'Manchas');
    fmt.add('Condição: Sujeira', 'Sujeira');
    fmt.add('Condição: Machucados', 'Machucados');
    return fmt.format(this);
  }

  createShopeeDescriptionAttributes() {
    const fmt = new ProductAttributesFormatter('Impressos');
    fmt.add('Título: Secundário (subtítulo)', 'Subtítulo');
    fmt.add('Título: Original (da obra traduzida)', 'Título original');
    fmt.add('Título: Do volume', 'Título do volume');
    fmt.add('N.º do volume');
    fmt.add('N.º do tomo');
    fmt.add('Participantes: Autores', 'Autores', ['csv']);
    fmt.add('Participantes: Tradutores', 'Tradutores', ['csv']);
    fmt.add('Participantes: Editores', 'Editores', ['csv']);
    fmt.add('Participantes: Organizadores', 'Organizadores', ['csv']);
    fmt.add('Obra');
    fmt.add('Coleção');
    fmt.add('N.º do vol. da coleção', 'N.º do volume da coleção');
    fmt.add('Editora');
    fmt.add('Edição: Ano', 'Ano da edição');
    fmt.add('Edição: N.º', 'N.º da edição');
    fmt.add('Edição: Nome', 'Nome da edição');
    fmt.add('Tipo de capa', '', ['uncapitalize']);
    fmt.add('Idioma');
    fmt.add('Origem');
    fmt.add('N.º da reimpressão');
    fmt.add('ISBN-10');
    fmt.add('ISBN-13');
    fmt.add('ISBN-10 da coleção');
    fmt.add('ISBN-13 da coleção');
    fmt.add('Cód. de barras (GTIN)', 'Código de barras', [], 'Básico');
    fmt.add('SKU', 'Código interno');

    const text = fmt.format(this);
    if (text !== '') {
      return 'Outros detalhes:\n' + text;
    }
    return '';
  }

  setMercadoLivreDescription() {
    const parts = [];

    parts.push(this.descriptionStrings.get('Condição'));
    parts.push(this.createShopeeConditionDescription());
    parts.push(this.getValue('Impressos', 'Outros detalhes'));
    parts.push(this.descriptionStrings.get('Mercado Livre: Perguntas'));
    parts.push(this.descriptionStrings.get('Fotos'));
    parts.push(this.createShopeeDescriptionSynopsis());

    const description = parts.filter((s) => s !== '').join('\n\n');
    this.setValue('Mercado Livre', 'Descrição', description);
  }

  static formatCSV(csv) {
    return formatList(Product.parseCSV(csv));
  }

  static parseCSV(csv) {
    return removeSuffix(csv, '; ...').split(';').filter((s) => s !== '');
  }

  createShopeeDescriptionSynopsis() {
    let synopsis = this.getValue('Impressos', 'Sinopse');
    if (synopsis === '') {
      return '';
    }
    synopsis = 'Sinopse: ' + synopsis;

    let source = this.getValue('Impressos', 'Sinopse: Fonte');
    if (source === '') {
      return synopsis;
    }
    source = 'Fonte da sinopse: ' + source;
    return synopsis + '\n\n' + source;
  }
}

class ProductAttributesFormatter {
  constructor(defaultSheet, defaultColumnFormatters) {
    this._defaultSheet = defaultSheet;
    this._defaultColumnFormatters = defaultColumnFormatters || [];
    this._list = [];
  }

  add(column, label, columnFormatters=[], sheet) {
    if (columnFormatters.length === 0) {
      columnFormatters = this._defaultColumnFormatters;
    }

    sheet = sheet || this._defaultSheet;
    if (sheet === undefined) {
      throw new Error('No sheet provided.');
    }

    this._list.push({
      sheet: sheet,
      column: column,
      label: label || '',
      columnFormatters: columnFormatters,
    });
  }

  format(product) {
    const list = [];
    for (const attr of this._list) {
      let val = product.getValue(attr.sheet, attr.column);
      if (val === '') {
        continue;
      }
      for (const formatter of attr.columnFormatters) {
        val = ProductAttributesFormatter.getColumnFormatter(formatter)(val);
      }
      list.push(`${attr.label || attr.column}: ${val}`);
    }
    return formatBulletList(list);
  }

  static getColumnFormatter(name) {
    if (name in ProductAttributesFormatter.columnFormatters) {
      return ProductAttributesFormatter.columnFormatters[name];
    }
    throw new Error(`Unknown column formatter ${name}.`);
  }
}

ProductAttributesFormatter.columnFormatters = {
  'csv': Product.formatCSV,
  'uncapitalize': uncapitalize,
  'truncateSentence': (s) => removeSuffix(s, '.'),
};

class ProductColumnsAutofiller {
  constructor() {
    this._list = [];
  }

  add(sheet, column, fn) {
    this._list.push({sheet, column, fn});
  }

  autofill(product, overwrite) {
    for (const {sheet, column, fn} of this._list) {
      if (product.getValue(sheet, column) === '' || overwrite) {
        fn.bind(product)();
      }
    }
  }
}

function findProductSKUs(rangeList) {
  const list = [];
  for (const range of rangeList.getRanges()) {
    const rowNo = range.getRow();
    const values =
        range.getSheet().getSheetValues(rowNo, 1, range.getHeight(), 1);
    for (const [i, value] of values.entries()) {
      const sku = parseInt(value);
      if (isNaN(sku)) {
        throw new InvalidSKUError(rowNo + i);
      }
      list.push(sku);
    }
  }
  return list;
}
