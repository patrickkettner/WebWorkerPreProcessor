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
            loader: 'string-replace',
            query: {
              search: 'str << trailing_newlines',
              replace: 'str += trailing_newlines'
            }
          }, {
            test: /\/lib\/temple\/(hash|map)\.rb$/,
            loader: 'string-replace',
            query: {
              search: '.handler.call.self, key, .* unless valid_key..key.',
              replace: '',
              flags: ''
            }
          }, {
            test: /\/lib\/temple\.rb$/,
            loader: 'string-replace',
            query: {
              search: 'autoload :Array,  ',
              replace: 'autoload :TEMPLE_Array,  '
            }
          }, {
            test: /\/lib\/temple\/generators\/array_buffer\.rb$/,
            loader: 'string-replace',
            query: {
              search: 'class ArrayBuffer < Array',
              replace: 'class ArrayBuffer < TEMPLE_Array'
            }
          }, {
            test: /\/lib\/temple\/generators\/array\.rb$/,
            loader: 'string-replace',
            query: {
              search: 'class Array < Generator',
              replace: 'class TEMPLE_Array < Temple::Generator'
            }
          }, {
            test: /\/lib\/temple\/parser\.rb$/,
            loader: 'string-replace',
            query: {
              search: 'include Utils',
              replace: 'include Temple::Utils'
            }
          }, {
            test: /\/lib\/temple\/mixins\/dispatcher.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'code << .else.n  . << .call_method .. .exp.. <<',
                replace: 'code += \\"else\\\n  \\" + (call_method || \\"exp\\") +',
                flags: ''
              }, {
                search: '<< .when #{key.inspect}.n  . <<',
                replace: '+= \\"when #{key.inspect}\\\\n  \\" +',
                flags: ''
              }, {
                search: '. << \\"',
                replace: ') + \\"',
                flags: ''
              }]
            }
          }, {
            test: /\/lib\/tilt\/mapping\.rb$/,
            loader: 'string-replace',
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
            loader: 'string-replace',
            query: {
              search: 'include Dispatcher',
              replace: 'include Temple::HTML::Dispatcher'
            }
          }, {
            test: /\/lib\/temple\/mixins\/options.rb$/,
            loader: 'string-replace',
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
          }, {
            test: /\/lib\/temple\/mixins\.rb$/,
            loader: 'string-replace',
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
          }, {
            test: /\/lib\/temple\/filter.rb$/,
            loader: 'string-replace',
            query: {
              search: 'include Utils',
              replace: 'include Temple::Utils'
            }
          }, {
            test: /\/lib\/temple\/html\/attribute_merger\.rb$/,
            loader: 'string-replace',
            query: {
              search: '|_, _, name, value|',
              replace: '|a, b, name, value|'
            }
          }, {
            test: /\/lib\/temple\/filters\/static_merger\.rb$/,
            loader: 'string-replace',
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
            loader: 'string-replace',
            query: {
              search: 'class ArrayBuffer < Generator',
              replace: 'class ArrayBuffer < Temple::Generator'
            }
          }, {
            test: /\/lib\/temple\/utils\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: 'CGI',
                replace: 'OLD_RUBY_CGI_ESCAPE',
                flags: 'g'
              }, {
                search: '\\\/n',
                replace: '/',
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
              }]
            }
          }, {
            test: /\/lib\/temple\/filters\/dynamic_inliner\.rb$/,
            loader: 'string-replace',
            query: {
              multiple: [{
                search: "curr.1. << ",
                replace: "curr[1] += ",
                flags: "g"
              }]
            }
          }, {
            test: /\/lib\/tilt\/template\.rb$/,
            loader: 'string-replace',
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
                search: 'if .data.respond_to?(:force_encoding.',
                replace: 'if false',
                }, {
                  search: 'source << ',
                  replace: 'source += ',
                  flags: 'g'
                }, {
                  search: 'method_source.respond_to?(:force_encoding)',
                  replace: 'false'
              }]
            }
          }]
        }
      }
    })
  ]
};
