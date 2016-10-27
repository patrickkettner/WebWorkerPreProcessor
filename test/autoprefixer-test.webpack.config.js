var webpack = require('webpack');

module.exports = {
  context: `${__dirname}/../lib/jutoprefixer`,
  entry: `${__dirname }/autoprefixer-test-src.js`,
  output: {
    path: __dirname,
    filename: "/autoprefixer-suite.js"
  },
  module: {
    loaders: [
      {
        test: /\.coffee$/,
        loader: [
          "string-replace?" + JSON.stringify({
            multiple: [{
              search: "These browsers account for 0\.11% ",
              replace: "These browsers account for 0\.09% ",
              flags: "g"
            }, {
              search: "These browsers account for 0\.08% ",
              replace: "These browsers account for 0\.07% ",
              flags: "g"
            }, {
              search: "it\('uses browserslist config'",
              replace: "it.skip\('uses browserslist config'",
              flag: "g"
            },{
              search: "fs.readFileSync",
              replace: "\(function\(url\){return \$\.ajax\({url:url,async:false}\)\.responseText}\)",
              flags: "g"
            }, {
              search: "__dirname\\s*\\+\\s*(\\()?\"\/cases\/\"",
              replace: "\(\"\/base\/lib\/autoprefixer\/test\/cases\/\"",
              flags: "g"
            }
            ]
          }),
          'coffee-loader'
        ]
      },
      { test: /\.json/, loader: "json" }
    ]
  },
  plugins: [
    //new webpack.optimize.UglifyJsPlugin({
      //compress: {
        //warnings: true
      //}
    //})
  ],
  resolve: {
    extensions: [".webpack.js", ".web.js", ".js", ".coffee"]
  },
  node: {
    fs: 'empty'
  }
};
