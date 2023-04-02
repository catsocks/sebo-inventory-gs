/* exported Product, getProducts */

class InvalidSKUError extends Error {
  constructor(rowNo) {
    super(`Row ${rowNo} does not contain a valid SKU in its first column.`);
    this.rowNo = rowNo;
  }
}

class Product extends MultiSheetRow {
  constructor(spreadsheet, sku) {
    super(spreadsheet, sku, 'Básico', 'Impressos', 'Shopee');

    this.descriptionStrings =
      mapRange(spreadsheet.getRangeByName('DescriçãoShopeePartes'));
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
    const title = this.getValue('Impressos', 'Título: Como na capa')
        .substring(0, 40);
    const url = 'https://www.estantevirtual.com.br/busca?q=' +
      encodeURIComponent(title);
    this.setValue('Básico', 'Referência', url);
  }

  setCategory() {
    const text = this.getValue('Impressos', 'Classificação').split(';')[0];
    this.setValue('Básico', 'Categoria', text);
  }

  setGTIN() {
    this.setValue('Básico', 'Categoria', this.getValue('Impressos', 'ISBN-13'));
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
    parts.push(this.getShopeeDescriptionMiscAttributes());
    parts.push(this.getValue('Impressos', 'Outros detalhes'));
    parts.push(this.descriptionStrings.get('Chat'));
    parts.push(this.descriptionStrings.get('Fotos'));
    parts.push(this.getShopeeDescriptionSynopsis());

    const description = parts.filter((s) => s !== '').join('\n\n');
    this.setValue('Shopee', 'Descrição', description);
  }

  getShopeeDescriptionCondition() {
    let attrs = this.getShopeeDescriptionConditionAttributes();
    if (attrs !== '') {
      attrs = 'Atributos da condição:\n' + attrs;
    }

    let otherDetails =
      this.getValue('Impressos', 'Condição: Outros detalhes');
    if (otherDetails !== '') {
      otherDetails = 'Descrição da condição: ' + otherDetails;
    }

    return [attrs, otherDetails].filter((s) => s !== '').join('\n\n');
  }

  getShopeeDescriptionConditionAttributes() {
    const attributes = [
      {sheet: 'Impressos', column: 'Condição: Grifos', label: 'Grifos'},
      {sheet: 'Impressos', column: 'Condição: Anotações', label: 'Anotações'},
      {sheet: 'Impressos', column: 'Condição: Manchas', label: 'Manchas'},
      {sheet: 'Impressos', column: 'Condição: Sujeira', label: 'Sujeira'},
      {sheet: 'Impressos', column: 'Condição: Machucados', label: 'Machucados'},
    ];
    return this.formatDescriptionAttributes(attributes);
  }

  getShopeeDescriptionMiscAttributes() {
    const attributes = [
      {column: 'Participantes: Autores', label: 'Autores',
        formatter: 'csv'},
      {column: 'Participantes: Tradutores', label: 'Tradutores',
        formatter: 'csv'},
      {column: 'Participantes: Editores', label: 'Editores', formatter: 'csv'},
      {column: 'Participantes: Organizadores', label: 'Organizadores',
        formatter: 'csv'},
      {column: 'Título: Secundário (subtítulo)', label: 'Subtítulo'},
      {column: 'Título: Original (da obra traduzida)',
        label: 'Título original'},
      {column: 'Título: Do volume', label: 'Título do volume'},
      {column: 'Idioma'},
      {column: 'Editora'},
      {column: 'Edição: Ano'},
      {column: 'Edição: N.º'},
      {column: 'Edição: Nome'},
      {column: 'N.º da reimpressão'},
      {column: 'Coleção'},
      {column: 'N.º do volume'},
      {column: 'N.º do tomo'},
      {column: 'ISBN-10'},
      {column: 'ISBN-13'},
      {column: 'Tipo de capa'},
    ];
    for (const attr of attributes) {
      attr.sheet = 'Impressos';
    }
    return this.formatDescriptionAttributes(attributes);
  }

  formatDescriptionAttributes(attributes) {
    const list = [];
    for (const attr of attributes) {
      let val = this.getValue(attr.sheet, attr.column);
      if (val === '') {
        continue;
      }
      if (attr.formatter) {
        val = Product.getFormatter(attr.formatter)(val);
      }
      list.push(`${attr.label || attr.column}: ${val}`);
    }
    return formatBulletList(list);
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

  static parseCSV(csv) {
    return removeSuffix(csv, '; ...').split(';');
  }

  static formatCSV(csv) {
    return formatList(Product.parseCSV(csv));
  }

  static getFormatter(name) {
    const formatters = {
      'csv': Product.formatCSV,
    };
    if (name in formatters) {
      return formatters[name];
    }
    throw new Error(`Unknown formatter ${name}.`);
  }
}

function getProducts(ss, rangeList) {
  const products = [];
  for (const range of rangeList.getRanges()) {
    const rowNo = range.getRow();
    const values =
        range.getSheet().getSheetValues(rowNo, 1, range.getHeight(), 1);
    for (const [i, value] of values.entries()) {
      const sku = parseInt(value);
      if (isNaN(sku)) {
        throw new InvalidSKUError(rowNo + i);
      }
      products.push(new Product(ss, sku));
    }
  }
  return products;
}
