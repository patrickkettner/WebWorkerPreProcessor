var webpack = require('webpack')

module.exports = {
  devtool: "source-map",
  entry: `${__dirname}/../src/slim.js`,
  output: {
    path: __dirname,
    filename: "/../dist/slim.min.js"
  },
  plugins: [
    new webpack.LoaderOptionsPlugin({
      test: /\.rb/,
      options: {
        opal: {
          stubs: ['e2mmap', 'rdoc/options', 'monitor', 'ripper'],
          loaders: [{
            test: /\/lib\/temple\/html\/fast\.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: 'str << trailing_newlines',
              replace: 'str += trailing_newlines'
            }
          }, {
            test: /\/lib\/temple\/(hash|map)\.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: '.handler.call.self, key, .* unless valid_key..key.',
              replace: '',
              flags: ''
            }
          }, {
            test: /\/lib\/temple\.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: 'autoload :Array,  ',
              replace: 'autoload :TEMPLE_Array,  '
            }
          }, {
            test: /\/lib\/temple\/filters\/code_merger\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '\\\\Z',
                replace: '$',
              }, {
                search: 'code << ',
                replace: 'code += ',
                flags: 'g'
              }]
            }
          }, {
            test: /\/lib\/temple\/generators\/string_buffer\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '#{buffer} = \'\'',
                replace: '#{buffer} = \[\]'
              }, {
                search: 'def postamble\\n        buffer\\n      end\\n\\n',
                replace: "def postamble\\n        \\\"#{buffer} = (#{buffer}.empty? ? \'\' : #{buffer}.join)\\\"\\n      end\\n\\n",
                flags: ''
              }, {
                search: 'def return_buffer\\n        buffer\\n      end\\n\\n',
                replace: "def return_buffer\\n        \\\"#{buffer} = (#{buffer}.empty? ? \'\' : #{buffer}.join)\\\"\\n      end\\n\\n",
                flags: ''
              }]
            }
          }, {
            test: /\/lib\/temple\/generators\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '#{buffer} = \'\'',
                replace: '#{buffer} = \[\]\\" end; def postamble() \\"#{buffer} = (#{buffer}.empty? ? \'\' : #{buffer}.join)'
              }, {
                search: 'def postamble\\n        buffer\\n      end\\n\\n',
                replace: '',
                flags: ''
              }]
            }
          }, {
            test: /\/lib\/temple\/generators\/array_buffer\.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: 'class ArrayBuffer < Array',
              replace: 'class ArrayBuffer < TEMPLE_Array'
            }
          }, {
            test: /\/lib\/temple\/generators\/array\.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: 'class Array < Generator',
              replace: 'class TEMPLE_Array < Temple::Generator'
            }
          }, {
            test: /\/lib\/temple\/parser\.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: 'include Utils',
              replace: 'include Temple::Utils'
            }
          }, {
            test: /\/lib\/temple\/mixins\/dispatcher.rb$/,
            loader: 'string-replace-loader',
            query:{
              multiple: [{
                search: 'code << .else.n  . << .call_method .. .exp.. <<',
                replace: 'code += \\"else\\\\n  \\" + (call_method || \\"exp\\") +',
                flags: ''
              }, {
                search: 'code << .else',
                replace: 'code += \\"else',
                flags: ''
              }, {
                search: '<< .when #{',
                replace: '+= \\"when #{',
                flags: ''
              }, {
                search: 'n *\\" *<<',
                replace:  'n  \\" +',
                flags: ''
              }, {
                search: 'n  .. << ..n.',
                replace: 'n  \\") + \\"\\n\\"',
                flags: ''
              }, {
                search: '\'exp\') << ',
                replace: '\'exp\') + '
              }, {
                search: 'freeze. <<',
                replace: 'freeze) + ',
                flags: ''
              }]
            }
          },{
            test: /\/lib\/tilt\/mapping\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: 'LOCK = Monitor.new',
                replace: ''
              }, {
                search: 'AUTOLOAD_IS_BROKEN = Tilt.autoload?(:Dummy)',
                replace: 'AUTOLOAD_IS_BROKEN = true'
              }]
            }
          }, {
            test: /\/lib\/temple\/html\/filter.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: 'include Dispatcher',
              replace: 'include Temple::HTML::Dispatcher'
            }
          },{
            test: /\/lib\/temple\/mixins\/options.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '= MutableHash',
                replace: '= Temple::MutableHash'
              }, {
                search: '= OptionHash',
                replace: '= Temple::OptionHash'
              }, {
                search: '= OptionMap',
                replace: '= Temple::OptionMap'
              }]
            }
          },{
            test: /\/lib\/temple\/mixins\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '= Utils::',
                replace: '= Temple::Utils::',
                flags: 'g'
              }, {
                search: 'engine.new(Utils::',
                replace: 'engine.new(Temple::Utils::'
              }]
            }
          },{
            test: /\/lib\/temple\/filter.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: 'include Utils',
              replace: 'include Temple::Utils'
            }
          }, {
            test: /\/lib\/temple\/html\/attribute_merger\.rb$/,
            loader: 'string-replace-loader',
            query: {
              search: '|_, _, name, value|',
              replace: '|a, b, name, value|'
            }
          }, {
            test: /\/lib\/temple\/filters\/static_merger\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: 'curr << exp[1]',
                replace: 'res[res.rindex{|x|x.length==2}][-1] += exp[1]'
              }, {
                search: 'text << exp.last',
                replace: 'result[result.rindex{|x|x.length==2}][-1] += exp.last'
              }]
            }
          }, {
            test: /\/lib\/temple\/core\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: 'class ArrayBuffer < Generator',
                replace: 'class ArrayBuffer < Temple::Generator'
              }, {
                search: "def preamble;  buffer \\\" = \'\'\\\"",
                replace: "def preamble; buffer \\\" = \[\]\\\""
              }, {
                search: "def postamble; buffer end",
                replace: "def postamble; buffer \\\".join\\\" end"
              }]
            }
          }, {
            test: /\/lib\/temple\/utils\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: 'text = text.gsub......A...s',
                replace: 'text = text.gsub(/^\s',
                flags: ''
              }, {
                search: 'text = text.sub...A.s',
                replace: 'text = text.sub(/^\s',
                flags: ''
              }, {
                search: 'CGI',
                replace: 'OLD_RUBY_CGI_ESCAPE',
                flags: 'g'
              },{
                search: '\\\/n',
                replace: '/',
                flags: 'g'
              },  {
                search: 'EscapeUtils',
                replace: 'OLD_RUBY_CGI_ESCAPE',
                flags: 'g'
              }, {
                search: 'require .escape_utils.',
                replace: 'require \\"OLD_RUBY_CGI_ESCAPE\\"',
                flags: ''
              }, {
                search: 'require .cgi.escape.',
                replace: 'require \\"OLD_RUBY_CGI_ESCAPE\\"',
                flags: ''
              }, {
                search: 'require .irb.ruby-lex.',
                replace: 'require \\"OLD_RUBY_CGI_ESCAPE\\"',
                flags: ''
              }, {
                search: 'LITERAL_TOKENS',
                replace: '#LITERAL_TOKENS',
                flags: 'g'
              }, {
                search: 'Regexp.union..ESCAPE_HTML.keys.',
                replace: 'ESCAPE_HTML.keys.map {|v| Regexp.escape v}.join(\'|\')',
                flags: 'g'
              }, {}]
            }
          }, {
            test: /\/lib\/temple\/filters\/dynamic_inliner\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: "curr.1. << ",
                replace: "curr[1] += ",
                flags: "g"
              }]
            }
          }, {
            test: /\/lib\/tilt\/template\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '<< preamble <<',
                replace: '+= preamble +'
              }, {
                search: ' << template <<',
                replace: '+ template +'
              }, {
                search: ' << postamble',
                replace: ' + postamble'
              }, {
                search: '/n, 1',
                replace: '/, 1'
              }, {
                search: 'TOPOBJECT.class_eval do',
                replace: '#{TOPOBJECT}.class_eval do'
              }, {
                search: ' [s-t][a-zA-Z]*\.force_encoding.*',
                replace: '',
                flags: 'g'
              }, {
                search: ' if ..data.valid_encoding.',
                replace: 'if false',
                flags: ''
              }, {
                search: 'if .data.respond_to...force_encoding.',
                replace: 'if false',
                flags: 'g'
              }, {
                search: 'source << ',
                replace: 'source += ',
                flags: 'g'
              }, {
                search: 'method_source.respond_to?(:force_encoding)',
                replace: 'false'
              }]
            }
          }, {
            test: /\/lib\/temple\/html\/pretty\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '.sub\(\/\\\\A',
                replace: '.sub(\/^',
              }, {
                search: '.sub\(\/\\\\\\\\A',
                replace: '.sub(\/^',
              }, {
                search: 'indent_code << ',
                replace: 'indent_code += ',
                flags: 'g'
              }]
            }
          }, {
            test: /\/lib\/temple\/filters\/remove_bom\.rb$/,
            loader: 'string-replace-loader',
            query: {
              multiple: [{
                search: '.new\(\\"\\\\A',
                replace: '.new(\/^',
              }, {
                search: '.gsub\(\/\\\\A',
                replace: '.gsub(\/^',
              }]
            }
          }]
        }
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        keep_fnames: true,
        warnings: true
      }
    })
  ]
};
