const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Common DefinePlugin config for all entries
const commonDefinePlugin = new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || ''),
  'process.env.OPENROUTER_BASE_URL': JSON.stringify(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'),
  'process.env.APP_NAME': JSON.stringify(process.env.APP_NAME || 'TweetCraft - AI Reply Assistant'),
  'process.env.APP_VERSION': JSON.stringify(process.env.APP_VERSION || '0.0.15'),
});

// Service Worker specific DefinePlugin (includes EXA_API_KEY)
const serviceWorkerDefinePlugin = new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || ''),
  'process.env.OPENROUTER_BASE_URL': JSON.stringify(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'),
  'process.env.APP_NAME': JSON.stringify(process.env.APP_NAME || 'TweetCraft - AI Reply Assistant'),
  'process.env.APP_VERSION': JSON.stringify(process.env.APP_VERSION || '0.0.15'),
  'process.env.EXA_API_KEY': JSON.stringify(process.env.EXA_API_KEY || ''),
});

// Base configuration
const baseConfig = {
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
  optimization: {
    // CRITICAL: Chrome extensions require each context to be self-contained
    // DO NOT enable chunk splitting - it breaks isolated contexts
    splitChunks: false,
  },
};

// Export as function to create separate configs per entry
module.exports = [
  // Content Script config
  {
    ...baseConfig,
    entry: {
      contentScript: './src/content/contentScript.ts',
    },
    plugins: [
      commonDefinePlugin,
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],
  },
  // Popup config
  {
    ...baseConfig,
    entry: {
      popup: './src/popup/popup-simple.ts'
    },
    plugins: [
      commonDefinePlugin,
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],
  },
  // Service Worker config (includes EXA_API_KEY)
  {
    ...baseConfig,
    entry: {
      serviceWorker: './src/background/serviceWorker.ts',
    },
    plugins: [
      serviceWorkerDefinePlugin,  // Has EXA_API_KEY
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new CopyPlugin({
        patterns: [
          { from: 'public', to: '.' },
        ],
      }),
    ],
  },
];