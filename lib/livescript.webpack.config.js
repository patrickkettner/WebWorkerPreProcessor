var webpack = require('webpack');

module.exports = {
  context: `${__dirname}/livescript`,
  devtool: "source-map",
  entry: __dirname + "/../src/livescript",
  output: {
    path: __dirname,
    filename: "/../dist/livescript.min.js"
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'string-replace-loader',
      query: {
        search: "if (require.extensions)",
        replace: "if (true)"
      }
    }, {
      test: /node\.js$/,
      loader: 'string-replace-loader',
      query: {
        search: "require.extensions",
        replace: "({})"
      }
    }, {
      test: /\.js$/,
      loader: 'string-replace-loader',
      query: {
        search: "importAll$(LiveScript",
        replace: "LiveScript._run=LiveScript.run;LiveScript.run=function(){return eval(LiveScript.compile.apply(LiveScript, arguments))};importAll$(LiveScript"
      }
    }]
  },
  resolve: {
    mainFields: ["webpack", "web", "browserify", ["jam", "main"], "main"]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: true
      }
    })
  ],
  node: {
    fs: 'empty',
    http: 'empty'
  }
};
