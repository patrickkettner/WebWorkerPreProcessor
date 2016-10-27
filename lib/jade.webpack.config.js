var sortVer = require('semver-compare');
var webpack = require('webpack');
var plugins = [];

var version = require(`${__dirname}/pug/package`).version
console.log(version);

if (sortVer(version, '0.35.0') > 1) {
  plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: true
      }
    })
  )
}

module.exports = {
  context: `${__dirname}/pug`,
  devtool: "source-map",
  entry: __dirname + "/../src/jade",
  output: {
    path: __dirname,
    filename: "/../dist/jade.min.js"
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'string-replace',
      query: {
        multiple: [{
          search: "e.UglifyJS=n",
          replace: "module.exports=n"
        }]
      }
    }]
  },
  plugins: plugins,
  resolve: {
    alias: {
      'uglify-js': `${__dirname}/js/uglify.min.js`,
      'markdown-js': 'lodash.noop',
      'markdown': 'lodash.noop',
      'discount': 'lodash.noop',
      'marked': 'lodash.noop',
      'stylus': 'lodash.noop',
      'less': 'lodash.noop',
      'sass': 'lodash.noop',
      'coffee-script': 'lodash.noop'
    }
  },
  node: {
    fs: 'empty',
    http: 'empty'
  }
};
