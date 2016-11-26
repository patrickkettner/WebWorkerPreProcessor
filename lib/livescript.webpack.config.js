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
      loader: 'string-replace',
      query: {
        search: "if (require.extensions)",
        replace: "if (true)"
      }
    }, {
      test: /node\.js$/,
      loader: 'string-replace',
      query: {
        search: "require.extensions",
        replace: "({})"
      }
    }]
  },
  resolve: {
    mainFields: ["webpack", "web", "browserify", ["jam", "main"], "main"]
  },
  plugins: [],
  node: {
    fs: 'empty',
    http: 'empty'
  }
};
