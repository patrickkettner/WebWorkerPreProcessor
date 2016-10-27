//var ClosureCompilerPlugin = require('closure-compiler-webpack-plugin');
var webpack = require('webpack');

module.exports = {
  devtool: "source-map",
  entry: __dirname + "/../src/stylus.js",
  output: {
    path: __dirname,
    filename: "/../dist/stylus.min.js"
  },
  module: {
    loaders: [
    { test: /\.json/, loader: "json" },
    {
      test: /lib\/functions\/selector\.js$/,
      loader: 'string-replace',
      query: {
        search: "var Parser = new require('../parser')",
        replace: "var Parser = require('../parser')"
      }
    }, {
      test: /lib\/renderer\.js$/,
      loader: 'string-replace',
      query: {
        search: "options.imports = [join(__dirname, 'functions')]",
        replace: "options.imports = [];options.functions = options.functions = require('./functions')"
      }
    }]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        keep_fnames: true,
        warnings: true
      }
    })
  ],
  resolve: {
    alias: {
      glob: 'lodash.noop',
    }
  },
  node: {
    fs: 'empty'
  }
};
