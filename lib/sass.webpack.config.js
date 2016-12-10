var webpack = require('webpack')

module.exports = {
  devtool: "source-map",
  entry: `${__dirname}/../src/sass.js`,
  output: {
    path: __dirname,
    filename: "/../dist/sass.min.js"
  },
  plugins: [
    new webpack.LoaderOptionsPlugin({
      test: /\.rb/,
      options: {
        opal: {
          stubs: ['fssm'],
          loaders: [{
            test: /\/stdlib\/strscan\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'new RegExp(\'^(?:\' + pattern.toString().substr(1, pattern.toString().length - 2) + \')\')',
                replace: 'var p=pattern,t=(\'\'+p).match(/\\\\/([^\\/]+)$/);t=t&&t[1]||void 0; return RegExp(\'^(?:\'+p.source+\')\',t)'
              }, {
                search: 'def post_match',
                replace: 'def matched_size() %x{return #@matched===nil?nil:#@matched.length}; end\\n    def post_match'
              }]
            }
          }]
        }
      }
    })
  ]
};
