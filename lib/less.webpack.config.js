var webpack = require('webpack');
var path = require('path');

module.exports = {
  context: `${__dirname}/less`,
  devtool: "source-map",
  entry: __dirname + "/../src/less.js",
  output: {
    path: __dirname,
    filename: "/../dist/less.min.js"
  },
  module: {
    loaders: [
      { test: /\.json/, loader: "json-loader" },
      {
        test: /\.js$/,
        loader: 'string-replace-loader',
        query: {
          search: "require\\('less\\/",
          replace: `require('${__dirname}/less/lib/less/`,
          flags: 'g'
        }
      },{
        test: /index.js$/,
        loader: 'string-replace.loader',
        query: {
          multiple: [{
            search: "require\\(path.join\\('less', 'tree', n\\)\\);",
            replace: `require('${__dirname}/less/lib/less/tree/' + n);`,
            flags: "g"
          }, {
            search: "require.paths.unshift(path.join(__dirname, 'lib'));",
            replace: ""
          }, {
            search: "less.PluginLoader = require(\"./plugin-loader\");",
            replace: ""
          }
          ]
        }
      },{
        test: /lib\/less-node\/plugin-loader\.js$/,
        loader: 'string-replace-loader',
        query: {
          search: '\\s+this.require = require;\n',
          replace: '',
          flags: ''
        }
      },{
        test: /lib\/less-node\/index\.js$/,
        loader: 'string-replace-loader',
        query: {
          search: '\\s+UrlFileManager = require\\("\\.\/url-file-manager"\\),',
          replace: 'UrlFileManager = function(){},',
          flags: ''
        }
      }, {
        test: /lib\/less-node\/index\.js$/,
        loader: 'string-replace-loader',
        query: {
          search: 'require\\(\'\.\/image-size\'\\)(\\(less.environment\\))?',
          replace: 'function imageSize(fn) { throw new Error("error evaluating function `image-size`: \'" + fn + "\' wasn\'t found. Tried - " + fn + "," + fn)}',
          flags: ''
        }
      }
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
    alias: {
      request: 'lodash.noop',
      'graceful-fs': 'lodash.noop',
      './node-plugin-manager': 'lodash.noop'
    },
    mainFields: ["webpack", "web", "browserify", ["jam", "main"], "main"]
  },
  node: {
    fs: 'empty',
    http: 'empty'
  }
};
