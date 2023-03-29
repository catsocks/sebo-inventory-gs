module.exports = {
  'env': {
    'es2021': true,
    'googleappsscript/googleappsscript': true,
  },
  'extends': [
    'google',
    'plugin:jsdoc/recommended',
  ],
  'rules': {
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-param-description': 'off',
    'jsdoc/require-returns-description': 'off',
    'require-jsdoc': 'off', // deprecated
    'valid-jsdoc': 'off', // deprecated
  },
  'overrides': [
  ],
  'parserOptions': {
    'ecmaVersion': 'latest',
  },
  'plugins': [
    'googleappsscript',
    'jsdoc',
  ],
};
