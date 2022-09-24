const path = require('path');

module.exports = {
  entry: './src/client/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['js', 'mjs'],
    alias: {
      '@client': path.resolve(__dirname, 'src', 'client'),
      '@gameboy': path.resolve(__dirname, 'src', 'gameboy'),
      '@common': path.resolve(__dirname, 'src', 'common'),
    }
  }
};
