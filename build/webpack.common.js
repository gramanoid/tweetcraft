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
    serviceWorker: './src/background/serviceWorkerEntry.ts',
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
    // CRITICAL: Set publicPath to empty string so __webpack_public_path__ override works
    // 'auto' prevents manual override in Chrome extension context
    publicPath: '',
    // Use chunk ID for filename to match webpack's internal mapping
    chunkFilename: '[id].chunk.js',
    // Service workers need different chunk loading than web pages
    // This ensures service worker uses importScripts instead of DOM-based loading
    chunkLoadingGlobal: 'webpackChunkTweetCraft',
    // Set environment-specific chunk loading
    environment: {
      // Service workers don't have DOM access
      document: false,
      // Use importScripts for chunk loading in workers
      dynamicImport: true,
    },
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
    // Enable code splitting for better bundle size management
    splitChunks: {
      chunks: (chunk) => {
        // Don't split the service worker or content script - they need to be single files
        // Only split lazy-loaded chunks
        return chunk.name !== 'serviceWorker' && chunk.name !== 'contentScript' && chunk.name !== 'popup';
      },
      minSize: 10000, // 10KB minimum chunk size
      maxSize: 100000, // 100KB maximum chunk size for optimal loading
      cacheGroups: {
        // Group large tab components separately
        tabs: {
          test: /[\\/]components[\\/]tabs[\\/]/,
          name: (module, chunks, cacheGroupKey) => {
            // Use consistent naming for tabs chunks
            return `tabs`;
          },
          priority: 10,
          reuseExistingChunk: true,
        },
        // Group services separately
        services: {
          test: /[\\/]services[\\/]/,
          name: (module, chunks, cacheGroupKey) => {
            // Use consistent naming for services chunks
            return `services`;
          },
          priority: 5,
          reuseExistingChunk: true,
        },
        // Vendor code splitting
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 20,
          reuseExistingChunk: true,
        },
      },
    },
    // Use deterministic chunk IDs for consistent naming
    chunkIds: 'deterministic',
    moduleIds: 'deterministic',
    // Enable tree shaking and minification for production
    usedExports: true,
    sideEffects: false,
    minimize: process.env.NODE_ENV === 'production',
    // Module concatenation for scope hoisting
    concatenateModules: true,
  },
};