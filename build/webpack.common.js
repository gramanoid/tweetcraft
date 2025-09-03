const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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
    path: path.resolve(__dirname, '../dist'),
    clean: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || ''),
      'process.env.OPENROUTER_BASE_URL': JSON.stringify(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'),
      'process.env.APP_NAME': JSON.stringify(process.env.APP_NAME || 'TweetCraft - AI Reply Assistant'),
      'process.env.APP_VERSION': JSON.stringify(process.env.APP_VERSION || '0.0.15'),
    }),
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
    // CRITICAL: Chrome extensions require each context to be self-contained
    // DO NOT enable chunk splitting - it breaks isolated contexts
    splitChunks: false,
  },
};