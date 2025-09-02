const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    contentScript: './src/content/contentScript.ts',
    serviceWorker: './src/background/serviceWorker.ts',
    popup: './src/popup/popup-simple.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  output: {
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
    path: path.resolve(__dirname, '../dist'),
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
      ],
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        arsenal: {
          test: /[\\/]src[\\/]services[\\/]arsenalService/,
          priority: 20,
          reuseExistingChunk: true,
        },
        imageService: {
          test: /[\\/]src[\\/]services[\\/]imageService/,
          priority: 20,
          reuseExistingChunk: true,
        },
        unifiedSelector: {
          test: /[\\/]src[\\/]content[\\/]unifiedSelector/,
          priority: 20,
          reuseExistingChunk: true,
        },
        templateSuggester: {
          test: /[\\/]src[\\/]services[\\/]templateSuggester/,
          priority: 20,
          reuseExistingChunk: true,
        },
      },
    },
  },
};