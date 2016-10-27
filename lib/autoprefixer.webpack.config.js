var webpack = require('webpack');

module.exports = {
  entry: __dirname + "/../src/autoprefixer.js",
  output: {
    path: __dirname,
    filename: "/../dist/autoprefixer.min.js"
  },
  module: {
    loaders: [
      { test: /\.coffee$/, loader: "coffee-loader" },
      { test: /\.json/, loader: "json" }
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: true
      }
    })
  ],
  resolve: {
    extensions: [".webpack.js", ".web.js", ".js", ".coffee"]
  },
  node: {
    fs: 'empty'
  }
};
