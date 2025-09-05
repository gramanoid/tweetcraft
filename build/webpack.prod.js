const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

// Handle array of configs from common.js
const configs = Array.isArray(common) ? common : [common];

module.exports = configs.map(config => 
  merge(config, {
    mode: 'production',
    devtool: 'source-map',
  })
);