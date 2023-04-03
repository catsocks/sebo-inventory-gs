/* exported Product, getProducts, findProductSKUs */

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
    super(spreadsheet, sku, 'Básico', 'Impressos', 'Shopee');

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
    const values = [
      [['Básico', 'Referência'], this.setReference],
      [['Básico', 'Categoria'], this.setCategory],
      [['Básico', 'Cód. de barras (GTIN)'], this.setGTIN],
      [['Shopee', 'Título'], this.setShopeeTitle],
      [['Shopee', 'Descrição'], this.setShopeeDescription],
    ];

    for (const [path, fn] of values) {
      if (this.getValue(...path) === '' || overwrite) {
        fn.bind(this)();
      }
    }
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

    this.setValue('Shopee', 'Título', parts.join(' '));
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
    parts.push(this.getShopeeDescriptionCondition());
    parts.push(this.getShopeeDescriptionMiscProductAttributes());
    parts.push(this.getValue('Impressos', 'Outros detalhes'));
    parts.push(this.descriptionStrings.get('Chat'));
    parts.push(this.descriptionStrings.get('Fotos'));
    parts.push(this.getShopeeDescriptionSynopsis());

    const description = parts.filter((s) => s !== '').join('\n\n');
    this.setValue('Shopee', 'Descrição', description);
  }

  getShopeeDescriptionCondition() {
    let attribs = this.getShopeeDescriptionConditionProductAttributes();
    if (attribs !== '') {
      attribs = 'Detalhes da condição:\n' + attribs;
    }

    const otherDetails =
    this.getValue('Impressos', 'Condição: Outros detalhes');

    return [attribs, otherDetails].filter((s) => s !== '').join('\n\n');
  }

  getShopeeDescriptionConditionProductAttributes() {
    const formatters = ['uncapitalize', 'truncateSentence'];
    const attribs = new ProductAttributes(this, 'Impressos', formatters);
    attribs.add('Condição: Grifos', 'Grifos');
    attribs.add('Condição: Anotações', 'Anotações');
    attribs.add('Condição: Manchas', 'Manchas');
    attribs.add('Condição: Sujeira', 'Sujeira');
    attribs.add('Condição: Machucados', 'Machucados');
    return attribs.format();
  }

  getShopeeDescriptionMiscProductAttributes() {
    const attribs = new ProductAttributes(this, 'Impressos');
    attribs.add('Título: Secundário (subtítulo)', 'Subtítulo');
    attribs.add('Título: Original (da obra traduzida)', 'Título original');
    attribs.add('Título: Do volume', 'Título do volume');
    attribs.add('N.º do volume');
    attribs.add('N.º do tomo');
    attribs.add('Participantes: Autores', 'Autores', ['csv']);
    attribs.add('Participantes: Tradutores', 'Tradutores', ['csv']);
    attribs.add('Participantes: Editores', 'Editores', ['csv']);
    attribs.add('Participantes: Organizadores', 'Organizadores', ['csv']);
    attribs.add('Obra');
    attribs.add('Coleção');
    attribs.add('N.º do vol. da coleção', 'N.º do volume da coleção');
    attribs.add('Editora');
    attribs.add('Edição: Ano', 'Ano da edição');
    attribs.add('Edição: N.º', 'N.º da edição');
    attribs.add('Edição: Nome', 'Nome da edição');
    attribs.add('Tipo de capa', '', ['uncapitalize']);
    attribs.add('Idioma');
    attribs.add('Origem');
    attribs.add('N.º da reimpressão');
    attribs.add('ISBN-10');
    attribs.add('ISBN-13');
    attribs.add('ISBN-10 da coleção');
    attribs.add('ISBN-13 da coleção');
    attribs.add('Cód. de barras (GTIN)', 'Código de barras', [], 'Básico');
    attribs.add('SKU', 'Código interno');

    const text = attribs.format();
    if (text !== '') {
      return 'Outros detalhes:\n' + text;
    }
    return '';
  }

  static formatCSV(csv) {
    return formatList(Product.parseCSV(csv));
  }

  static parseCSV(csv) {
    return removeSuffix(csv, '; ...').split(';').filter((s) => s !== '');
  }

  getShopeeDescriptionSynopsis() {
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

class ProductAttributes {
  constructor(product, defaultSheet, defaultFormatters) {
    this._product = product;
    this._defaultSheet = defaultSheet;
    this._defaultFormatters = defaultFormatters || [];
    this._list = [];
  }

  add(column, label, formatters=[], sheet) {
    if (formatters.length === 0) {
      formatters = this._defaultFormatters;
    }

    sheet = sheet || this._defaultSheet;
    if (sheet === undefined) {
      throw new Error('No sheet provided.');
    }

    this._list.push({
      sheet: sheet,
      column: column,
      label: label || '',
      formatters: formatters,
    });
  }

  format() {
    const list = [];
    for (const attr of this._list) {
      let val = this._product.getValue(attr.sheet, attr.column);
      if (val === '') {
        continue;
      }
      for (const formatter of attr.formatters) {
        val = ProductAttributes.getFormatter(formatter)(val);
      }
      list.push(`${attr.label || attr.column}: ${val}`);
    }
    return formatBulletList(list);
  }

  static getFormatter(name) {
    const formatters = {
      'csv': Product.formatCSV,
      'uncapitalize': uncapitalize,
      'truncateSentence': (s) => removeSuffix(s, '.'),
    };
    if (name in formatters) {
      return formatters[name];
    }
    throw new Error(`Unknown formatter ${name}.`);
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
