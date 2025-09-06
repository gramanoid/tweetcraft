const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  devtool: false, // Remove source maps in production to reduce size
  performance: {
    hints: 'warning',
    maxEntrypointSize: 250000, // 244KB target
    maxAssetSize: 250000,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false, // KEEP console logs for debugging
            drop_debugger: true,
            passes: 3, // More passes for better compression
            pure_funcs: [], // Don't remove console functions
            collapse_vars: true,
            reduce_vars: true,
            dead_code: true,
            inline: 2,
            unused: true,
            if_return: true,
            join_vars: true,
            sequences: true,
            booleans: true,
            loops: true,
            toplevel: true,
            hoist_funs: true,
            keep_fargs: false,
            keep_infinity: false,
            side_effects: false,
          },
          mangle: {
            safari10: true,
            toplevel: true,
            properties: {
              regex: /^_/, // Mangle properties starting with underscore
            },
          },
          format: {
            comments: false,
            ascii_only: true, // Better compatibility
          },
          ecma: 2020, // Use modern JS features for smaller output
          module: true,
          toplevel: true,
        },
        extractComments: false,
        parallel: true, // Use multi-process parallel running
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              discardUnused: true,
              mergeIdents: true,
              reduceIdents: true,
              calc: false,
              cssDeclarationSorter: false,
            },
          ],
        },
      }),
    ],
    usedExports: true,
    sideEffects: false,
    providedExports: true,
    concatenateModules: true, // Scope hoisting
    innerGraph: true, // Better tree shaking
    removeAvailableModules: true,
    removeEmptyChunks: true,
    mergeDuplicateChunks: true,
    flagIncludedChunks: true,
    nodeEnv: 'production',
  },
});
