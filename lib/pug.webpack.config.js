var webpack = require('webpack');
var path = require('path');

module.exports = {
  context: `${__dirname}/pug`,
  devtool: "source-map",
  entry: __dirname + "/../src/pug.js",
  output: {
    path: __dirname,
    filename: "/../dist/pug.min.js"
  },
  module: {
    loaders: [{
      test: /lib\/index\.js$/,
      loader: 'string-replace',
      query: {
        search: "[\S+\n\r\s]+exports\.",
        replace: "module.exports.",
        flags: "g"
      }
    }]
  },
  plugins: [
    //new webpack.optimize.UglifyJsPlugin({
      //compress: {
        //warnings: true
      //}
    //})
  ],
  resolve: {
    alias: {
      'uglify-js': 'lodash.noop',
      resolve: 'lodash.noop'
    }
  },
  node: {
    fs: 'empty',
    http: 'empty'
  }
};
