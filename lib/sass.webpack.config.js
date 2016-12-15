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
            test: /sass\/tree\/rule_node\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'require \\\'uri\\\'',
                replace: ''
              }, {
                search: 'URI.',
                replace: ''
              }]
            }
          }, {
            test: /\/corelib\/string\/encoding\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'Encoding.register \\"UTF-16LE\\" do',
                replace: 'Encoding.register \\"UTF-16LE\\" do\\n\\ndef bytes(str); %x{var ret=[],enc_str=utf8.encode(str);for(var i=0,l=enc_str.length;i<l;i++) ret.push(enc_str[i].charCodeAt(0)); return ret};end'
              }, {
                search: '  def bytesize\\n    bytes.length',
                replace: '  def bytesize(str)\\n    bytes(str).length',
                flags: 'g'
              }]
            }
          }, {
            test: /\/stdlib\/strscan\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'new RegExp(\'^(?:\' + pattern.toString().substr(1, pattern.toString().length - 2) + \')\')',
                replace: 'var p=pattern,t=(\'\'+p).match(/\\\\/([^\\/]+)$/);t=t&&t[1]||void 0; return RegExp(\'^(?:\'+p.source+\')\',t)'
              }, {
                search: 'def post_match',
                replace: 'def matched_size() %x{return #@matched===nil?nil:#@matched.length}; end\\n    def post_match'
              }, {
                search: '#@matched = result.substr.-1.;',
                replace: '',
                flags: 'g'
              }, {
                search: '        return #@matched;',
                replace: '        return #@string.substr(#@pos, pos - #@pos - 1 + result[0].length);',
              }, {
                search: '^        #@matched  = #@string.substr\(#@pos, pos - #@pos - 1 \+ result\[0\].length\);',
                replace: '        #@matched = result[0];',
                flags: ''
              }]
            }
          }, {
            test: /\/corelib\/string\.rb$/,
            loader: 'string-replace',
            query: {
              search: '  def lstrip',
              replace: 'def ascii_only?() `self.match(/[ -~\\\\n]*/)[0] === self`;end\\n  def lstrip'
            }
          }]
        }
      }
    })
  ]
};
