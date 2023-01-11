const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/client/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.mjs'],
    alias: {
      '@root': path.resolve(__dirname),
      '@client': path.resolve(__dirname, 'src', 'client'),
      '@gameboy': path.resolve(__dirname, 'src', 'gameboy'),
      '@common': path.resolve(__dirname, 'src', 'common'),
    },
  },
  plugins: [
    new HtmlWebPackPlugin({
      title: 'GameBoy.js',
      template: './src/client/index.html',
    }),
  ],
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
  },
  experiments: {
    topLevelAwait: true,
  },
};
