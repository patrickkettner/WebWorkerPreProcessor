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
            test: /opal\/opal\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'require \\\'corelib/process\\\'',
                replace: 'require \\\'corelib/process\\\';require \\\'patched_random\\\''
              }]
            }
          }, {
            test: /corelib\/array\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'block(result[i]);',
                replace: 'Opal.yieldX(block, result[i])'
              }]
            }
          }, {
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
                search: '@match *= nil',
                replace: '@match = nil;@matched=nil',
                flags: 'g'
              }, {
                search: 'new RegExp(\'^(?:\' + pattern.toString().substr(1, pattern.toString().length - 2) + \')\')',
                replace: 'var p=pattern,t=(\'\'+p).match(/\\\\/([^\\/]+)$/);t=t&&t[1]||void 0; return RegExp(\'^(?:\'+p.source+\')\',t)'
              }, {
                search: 'def post_match',
                replace: 'def matched_size() %x{return #@matched===nil?nil:utf8.encode(#@matched).length}; end\\n   def string=(str);@string=str;reset;str;end\\n def post_match'
              }, {
                search: '#@matched = result.substr.-1.;',
                replace: '',
                flags: 'g'
              }, {
                search: '        return #@matched;',
                replace: '        return ret_val',
              }, {
                search: '#@matched  = #@string.substr(#@pos, pos - #@pos - 1 + result[0].length);',
                replace: 'var ret_val  = #@string.substr(#@pos, pos - #@pos - 1 + result[0].length);#@matched = result[0];',
              }, {
                search: 'result      = #@matched = #@working.substring(0, 1);',
                replace: '#@pos      += utf8.encode(result).length;',
              }, {
                search: '#@pos      += 1;',
                replace: 'result     = #@matched = #@working.substring(0, 1);'
              }, {
                search: 'def scan(pattern)',
                replace: 'def scan(pattern);__scan_full(pattern,true,true,true);end\\n def scan_full(p,a,r);__scan_full(p,a,r,true);end\\n def __scan_full(pattern, advance, return_str)\\n'
              }, {
                search: '        #@prev_pos = #@pos;\\n        #@pos     += result[0].length;',
                replace: 'if (advance){#@prev_pos = #@pos; #@pos     += result[0].length;}'
              }, {
                search: ' return result[0];',
                replace: 'if(return_str){ return result[0];}'
              }, {
                search: '#@pos     += result.length;',
                replace: 'if (advance){#@pos     += result.length;}'
              }, {
                search: '        return result;',
                replace: 'return return_str ? result : Opal.nil;'
              }, {
                search: 'def scan_until(pattern)',
                replace: 'def scan_until(p);__scan_until(p,true,true);end\\ndef search_full(p,a,r); __scan_until(p,a,r);end\\ndef __scan_until(pattern, advance, return_str)'
              }, {
                search: '#@prev_pos = pos - 1;\\n        #@pos      = pos;',
                replace: 'if (advance) {#@prev_pos = pos - 1;\\n        #@pos      = pos;}'
              }, {
                search: '        return #@matched;',
                replace: 'var s=#@matched;        return return_str ? s : utf8.encode(s).length'
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
