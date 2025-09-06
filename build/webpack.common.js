const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const validateUrl = (url, defaultUrl) => {
  if (!url) return defaultUrl;
  try {
    const validated = new URL(url);
    if (validated.protocol !== 'http:' && validated.protocol !== 'https:') {
      console.warn(`Invalid protocol for ${url}. Falling back to ${defaultUrl}`);
      return defaultUrl;
    }
    return url;
  } catch (e) {
    console.warn(`Invalid URL: ${url}. Falling back to ${defaultUrl}`);
    return defaultUrl;
  }
};

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
      'process.env.APP_VERSION': JSON.stringify(process.env.APP_VERSION || '0.0.19'),
      'process.env.EXA_API_KEY': JSON.stringify(process.env.EXA_API_KEY || ''),
      'process.env.TWITTERAPI_IO_KEY': JSON.stringify(process.env.TWITTERAPI_IO_KEY || ''),
      'process.env.TWITTERAPI_IO_BASE_URL': JSON.stringify(validateUrl(process.env.TWITTERAPI_IO_BASE_URL, 'https://twitterapi.io/api/v1')),
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
    // Enable tree shaking and minification for production
    usedExports: true,
    sideEffects: false,
    minimize: process.env.NODE_ENV === 'production',
  },
};