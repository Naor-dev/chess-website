module.exports = {
  ...require('../../.eslintrc.base.js'),
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
