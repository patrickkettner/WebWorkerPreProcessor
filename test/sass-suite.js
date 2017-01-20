// tests have to be manually converted from the ruby source. ALL tests should be here, with the exception of tests for CLI options or other literally impossible things to support. If you see something missing, please PR or open an issue!

describe('sass', function() {

  this.timeout(5 * 60 * 1000);
  var resolve_with_variable_warning;
  var render_with_variable_warning;
  var strict_superselector;
  var extend_doesnt_match;
  var no_variable_warning;
  var render_unification;
  var specificity_equals;
  var specificity_gte;
  var munge_filename;
  var superselector;
  var scanner_setup;
  var scanner_state;
  var extend_equals;
  var doesnt_parse;
  var doesnt_match;
  var err_message;
  var sassBuilder;
  var unification;
  var eval_equal;
  var func_parse;
  var eval_err;
  var compare;
  var matches;
  var parses;
  var equal;
  var sass;

  before(function() {
    sass = new Worker(__workerPath);

    sassBuilder = function(data, cb) {
      sass.onmessage = function(e) {
        cb(JSON.parse(e.data));
      };

      sass.postMessage(JSON.stringify(data));
    };

    scanner_setup = function() {
      return "a=Opal.Sass.$$scope.Util.$$scope.MultibyteStringScanner.$new('cölorfül');"
    }

    scanner_state = function(pos, byte_pos, matched_size, byte_matched_size) {
      return "(a.$pos()===" + pos + "&&a.$byte_pos()===" + byte_pos + "&&a.$matched_size()===" + matched_size + "&&a.$byte_matched_size()===" + byte_matched_size + ")";
    }

    func_parse = function(val, opts) {
      opts = opts || {}
      return 'Opal.Sass.$$scope.Script.$$scope.Parser.$parse("' + val + '", 0, 0,Opal.hash2(' + JSON.stringify(Object.keys(opts)) + ',' + JSON.stringify(opts) + ')).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()';
    }

    eval_equal = function (to_eval, expected, opts, done) {
      opts = opts || {}
      to_eval += '===' + expected;

      sassBuilder({eval: to_eval, options: opts}, function(result) {
        expect(result.err).to.be(undefined);
        expect(result.css).to.be(true);
        done();
      });
    }

    eval_err = function(to_eval, err_text, opts, done) {
      sassBuilder({eval: to_eval}, function(result) {
        expect(JSON.parse(result.err).message).to.contain(err_text);
        expect(result.css).to.be(undefined);
        done();
      });
    }

    err_message = function (css, message, opts, done) {
      opts = opts || {}

      sassBuilder({css: css, options: opts}, function(result) {
        var err = JSON.parse(result.err);
        expect(result.css).to.be(undefined)
          expect(result.err).to.not.be(undefined)
          expect(err.message).to.contain(message)
          done()
      })
    }

    equal = function (css, expected, opts, done, context) {
      opts = munge_filename(opts || {}, context);
      sassBuilder({css: css, options: opts}, function(result) {
        expect(result.err).to.be(undefined);
        expect(result.css).to.be(expected);
        done();
      });
    }

    doesnt_parse = function (css, expected, opts, done) {
      opts = opts || {}

      var err_sections = css.split("<err>");
      var after = err_sections[0];
      var was = err_sections[1];
      var line = (after.match(/\\n/g) || []).length + 1;

      after = after.replace(/\s*\n\s*$/g, '')
        after = after.replace(/.*\n/g, '')
        if (after.length > 18) {
          after = "..." + after.slice(-15, after.length)
        }

      was = was.replace(/^\s*\n\s*/g, '');
      was = was.replace(/\n.*/g, '');
      if (was.length > 18) {
        was = "..." + after.slice(0, 15)
      }

      css = css.replace("<err>", "")

        function finished (result ) {
          expect(result.err).to.not.be(undefined)
            expect(JSON.parse(result.err).message).to.contain("Invalid CSS after \"" + after + "\": expected " + expected + ", was \"" + was + "\"")
            expect(result.css).to.be(undefined)
            done()
        }

      if (semver.lt(window.__libVersion, "3.4.0")) {
        sassBuilder({css: css, options: opts}, finished)
      } else {

        css = css.replace(/\n/g, '\\n');
        var to_eval = 'var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + css + '\',\'\', Opal.nil).$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()'

          sassBuilder({eval: to_eval, options: {}}, finished)
      }
    }

    function munge_filename(opts, context) {

      var syntax = opts.syntax || 'sass'

        if (!opts.filename && context) {
          opts.filename = context.test.title + '_inline.' + syntax
        }
      return opts
    }

    parses = function (css, opts, done, context) {
      opts = munge_filename(opts || {}, context)

        sassBuilder({css: css, options: opts}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css.replace(/[\s\u0000]*$/, '')).to.equal(css.replace(/[\s\u0000]*$/, ''))
            done()
        })
    }

    matches = function (regexp_path, to_match, opts, done, doesMatch) {
      opts = opts || {}
      var to_eval = 'var a ="' + to_match + '".match(' + regexp_path.replace(/::/g, '.$$$scope.') + ');a&&a[0].length==="' + to_match+ '".length||false'

        if (doesMatch === undefined) {
          doesMatch = true
        }

      sassBuilder({eval: to_eval, options: opts}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.equal(doesMatch)
          done()
      })
    }

    doesnt_match = function (regexp_path, to_match, opts, cb) {
      matches(regexp_path, to_match, opts, cb, false)
    }

    extend_equals = function(selector, extension, result, opts, cb) {
      equal(selector + ' {a: b}\n' + extension, result + " {\n  a: b; }\n", opts, cb)
    }

    unification = function(selector, extension, unified, opts, cb) {
      extend_equals("%-a " + selector, extension + " -a {@extend %-a}", unified.split(', ').map(function(s){return "-a " + s}).join(', '), opts, cb)
    }

    render_extends = function(selector, extension, opts, done, shouldErr) {
      var scss = selector + ' {a: b}\n' + extension

        sassBuilder({css: scss, options: opts}, function(result) {
          if (shouldErr) {
            expect(result.err).to.not.be(undefined)
              done(result)
          } else {
            expect(result.err).to.be(undefined)
              done();
          }
        })
    }

    render_unification = function(selector, extension, opts, cb, shouldErr) {
      render_extends("%-a " + selector, extension + " -a {@extend %-a}", opts, cb, shouldErr)
    }

    extend_doesnt_match = function(fn, extender, trgt, reason, line, filename_for_test, syntax, cb) {
      syntax = syntax || 'scss'
        var warn = "\\\"" + extender + "\\\" failed to @extend \\\"" + trgt + "\\\"."
        var reason;
      if (reason === 'not_found') {
        reason = "The selector \\\"" + trgt + "\\\" was not found."
      } else {
        reason = "No selectors matching \\\"" + trgt  + "\\\" could be unified with \\\"" + extender + "\\\"."
      }

      ///////////////////////////////////////////////////
      // this changed from a warning to an error in 3.3.0
      ///////////////////////////////////////////////////
      if (semver.lt(window.__libVersion, "3.3.0")) {
        var WARNING = "WARNING on line " + line + " of " + filename_for_test + "." + syntax + ": " + warn + "\\n  " + reason + "\\n  This will be an error in future releases of Sass.\\n  Use \\\"@extend " + trgt + " !optional\\\" if the extend should be able to fail.\\n";

        function third(result) {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWithMatch(/" + WARNING + "/)===true&&(console.warn.restore(),true)", options: {syntax: syntax}}, function(result) {
            expect(result.err).to.be(undefined)
              expect(result.css).to.be(true)
              cb();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);

          fn(filename_for_test, syntax, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      } else {
        fn(filename_for_test, syntax, function(result) {
          expect(JSON.parse(result.err).message).to.match(new RegExp(reason))
            cb()
        })
      }
    }

    specificity_gte = function (sel1, sel2, cb) {
      var css = sel1 + " .a {\n  a: b; }\n";
      var scss = sel1 + " %-a {a: b}\n.a {@extend %-a}\n" + sel2 + ".a {@extend %-a}\n";
      equal(scss, css, {syntax: 'scss'}, cb)
    }

    specificity_equals = function (sel1, sel2, cb) {
      function second() {specificity_gte(sel2, sel1, cb)}
      specificity_gte(sel1, sel2, second);
    }

    superselector = function (supersel, subsel, cb, beFalse) {
      sassBuilder({eval: 'Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new("' + supersel + '","", Opal.nil).$parse_selector()[\'$superselector?\'](Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new("' + subsel + '","",Opal.nil).$parse_selector())', options: {}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(!beFalse)
          cb()
      })
    }

    strict_superselector = function(supersel, subsel, cb) {
      function second() { superselector(subsel, supersel, cb, true); }
      superselector(supersel, subsel, second);
    }

    resolve_with_variable_warning = function(str, expression, filename, cb) {
      function _second() { render_with_variable_warning( "a\n  --var: " + str, expression || str, 2, {syntax: 'sass', filename: filename + '.sass'}, filename + '.sass', cb)}

      render_with_variable_warning("a {--var: " + str + "}", expression || str, 1, {syntax: 'scss', filename: filename + '.scss'}, filename + '.scss', _second);
    }

    render_with_variable_warning = function(sass, expression, line, opts, filename, cb) {
      opts = opts || Opal.hash();

      function third() {
        eval_equal("console.warn.calledWith('DEPRECATION WARNING on line " + line + " of " + filename + ":\\nSass 3.6 will change the way CSS variables are parsed. Instead of being parsed as\\nnormal properties, they will not allow any Sass-specific behavior other than #{}.\\nFor forwards-compatibility, use #{}:\\n\\n  --variable: #{" + expression + "};\\n')&&(console.warn.restore(),true)", "true", opts, cb)
      }

      function second() {
        sassBuilder({css: sass, options: opts}, function(result) {
          expect(result.err).to.be(undefined);
          third();
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    }

    no_variable_warning = function(str, cb) {
      function fourth() {
        sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true);
          cb();
        })
      }

      function third(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({css: "a {--var: " + str + "}", options: {syntax: 'scss'}}, fourth)
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({css: "a\n  --var: " + str, options: {syntax: 'sass'}}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    }
  })

  window.__testFiles.forEach(function(url, i) {
    var testName = url.split('/').pop();

    describe(url, function() {
      var source = {};

      var bannedFunctions = [
        /@import/,
        / option\(/,
      ]

        before(function(done) {
          var cssUrl = url.replace(/template/, 'result') + '.css';
          var sassUrl = url + '.sass';

          $.when(
              $.ajax({
                url: sassUrl,
                success: function(response) {
                  source.sass = response;
                },
                error: done
              }),
              $.ajax({
                url: cssUrl,
                success: function(response) {
                  source.result = response;
                }
              })
              ).always(function() {
            done();
          })
        })

      it('runs correctly', function(done) {
        if (source.sass && !bannedFunctions.some(function(fn){return !!source.sass.match(fn)})) {

          var opts = {
            syntax: 'sass'
          };

          if (/more1|parent_ref|options|\/alt$|complex|compact|\/basic$|\/if$|\/script$/.test(url)) {
            opts.style = 'compact';
          } else if (/nested/.test(url)) {
            opts.style = 'nested';
          } else if (/compressed/.test(url)) {
            opts.style = 'compressed';
          } else if (/expanded|\/mixins$/.test(url)) {
            opts.style = 'expanded';
          }

          if (semver.eq(window.__libVersion, "3.4.14") && url.indexOf('sass/test/sass/templates/script') != -1) {
            // 3.4.14 was released with a discrepency between the templates file and the results file.
            // it was patched in 3.4.15, sha 14ec0d07
            this.test.title = 'includes a broken test...skipping...';
            this.test.skip();
            done();
          } else {
            sassBuilder({css: source.sass, options: opts}, function(response) {
              if (response.err === null) { response.err = undefined; }

              expect(response.err).to.be(undefined);
              expect(response.css).to.not.be(undefined);
              expect(response.css).to.eql(source.result);
              done();
            })
          }

        }  else {
          this.test.title = 'includes a banned function...skipping...';
          this.test.skip();
          done();
        }
      });
    })
  })

  describe('inline tests', function() {

    beforeEach(function(done) {
      sassBuilder({eval: 'Opal.gvars["!"]=Opal.nil;Opal.exceptions=[]'}, function(result) {
        done()
      })
    })

    it('test_basic_scss', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L12-L23
      // v3.1.0
      var source = "selector {\n  property: value;\n  property2: value; }\n"

        function second() {
          equal('sel{p:v}', "sel {\n  p: v; }\n", {syntax: 'scss'}, done)
        }

      parses(source, {syntax: 'scss'}, second)
    });

    it('test_empty_rule', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L25-L31
      // v3.1.0
      function second() {
        equal("#foo .bar {\n}\n", "", {syntax: 'scss'}, done)
      }

      equal("#foo .bar {}", "",{syntax: 'scss'}, second)
    });

    it('test_cdo_and_cdc_ignored_at_toplevel', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L33-L50
      // v3.1.0
      var source = "foo {\nbar: baz; }\n\nbar {\nbar: baz; }\n\nbaz {\nbar: baz; }\n"
        var expected = "foo {\n  bar: baz; }\n\nbar {\n  bar: baz; }\n\nbaz {\n  bar: baz; }\n"

        equal(source, expected, {syntax: 'scss'}, done)
    });

    it('test_unicode', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L65-L79
      // v3.1.0
      var source = "foo {\n  bar: föö bâr; }\n"
        var with_charset = "@charset \"UTF-8\";\nfoo {\n  bar: föö bâr; }\n"

        function second() {
          equal(source, with_charset, {syntax: 'scss'}, done)
        }

      parses(with_charset, {syntax: 'scss'}, second)
    });

    it('test_invisible_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L82-L95
      // v3.1.0
      var expected = "foo {\n  a: d; }\n";

      function second() {
        equal("foo {a: /* b; c: */ d}\n", expected, {syntax: 'scss'}, done)
      }

      equal("foo {a /*: b; c */: d}\n", expected, {syntax: 'scss'}, second)
    });

    it('test_crazy_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L97-L143
      // v3.1.0
      var source = "/* This is a CSS comment. */\n.one {color: green;} /* Another comment */\n/* The following should not be used:\n.two {color: red;} */\n.three {color: green; /* color: red; */}\n/**\n.four {color: red;} */\n.five {color: green;}\n/**/\n.six {color: green;}\n/*********/\n.seven {color: green;}\n/* a comment **/\n.eight {color: green;}\n";
      var expected = "/* This is a CSS comment. */\n.one {\n  color: green; }\n\n/* Another comment */\n/* The following should not be used:\n.two {color: red;} */\n.three {\n  color: green;\n  /* color: red; */ }\n\n/**\n.four {color: red;} */\n.five {\n  color: green; }\n\n/**/\n.six {\n  color: green; }\n\n/*********/\n.seven {\n  color: green; }\n\n/* a comment **/\n.eight {\n  color: green; }\n";

      equal(source, expected, {syntax: 'scss'}, done)
    });

    it('test_rule_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L145-L161
      // v3.1.0
      function second() {
        equal("/* Foo\n * Bar */.foo {\n  a: b; }\n", "/* Foo\n * Bar */\n.foo {\n  a: b; }\n", {syntax: 'scss'}, done)
      }

      parses( "/* Foo */\n.foo {\n  a: b; }\n", {syntax: 'scss'}, second)
    });

    it('test_property_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L163-L179
      // v3.1.0
      function second() {
        var scss = ".foo {\n  /* Foo\n   * Bar */a: b; }\n";
        var css = ".foo {\n  /* Foo\n   * Bar */\n  a: b; }\n";

        equal(scss, css,  {syntax: 'scss'}, done)
      }

      parses(".foo {\n  /* Foo */\n  a: b; }\n", {syntax: 'scss'}, second)
    });

    it('test_selector_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L181-L189
      // v3.1.0

      var css = ".foo #bar:baz(bip) {\n  a: b; }\n";
      var scss = ".foo /* .a #foo */ #bar:baz(/* bang )*/ bip) {\n  a: b; }\n";
      equal(scss, css, {syntax: 'scss'}, done)
    });

    it('test_lonely_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L191-L201
      // v3.1.0

      function second() {
        parses(".foo {\n  /* Foo\n   * Bar */ }\n", {syntax: 'scss'}, done)
      }

      parses("/* Foo\n * Bar */\n", {syntax: 'scss'}, second)
    });

    it('test_multiple_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L203-L225
      // v3.1.0

      function third() {
        var css = ".foo {\n  /* Foo Bar */\n  /* Baz Bang */ }\n";
        var scss = ".foo {\n  /* Foo Bar *//* Baz Bang */ }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      }

      function second() {
        parses(".foo {\n  /* Foo\n   * Bar */\n  /* Baz\n   * Bang */ }\n", {syntax: 'scss'}, third)
      }

      parses("/* Foo\n * Bar */\n/* Baz\n * Bang */\n", {syntax: 'scss'}, second)
    });

    it('test_bizarrely_formatted_comments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L227-L264
      // v3.1.0

      function fourth() {
        var css = ".foo {\n    /* Foo\n Bar\nBaz */\n  a: b; }\n";
        var scss = ".foo {/* Foo\n   Bar\n  Baz */\n  a: b; }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      }

      function third() {
        var css = ".foo {\n   /* Foo\nBar */\n  a: b; }\n";
        var scss = ".foo {/* Foo\n   Bar */\n  a: b; }\n";
        equal(scss, css, {syntax: 'scss'}, fourth)
      }

      function second() {
        parses(".foo {\n    /* Foo\nBar\n  Baz */\n  a: b; }\n", {syntax: 'scss'}, third)
      }

      parses(".foo {\n  /* Foo\nBar\n  Baz */\n  a: b; }\n", {syntax: 'scss'}, second)
    });

    it('test_vendor_properties', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L268-L274
      // v3.1.0

      parses("foo {\n  -moz-foo-bar: blat;\n  -o-flat-blang: wibble; }\n", {syntax: 'scss'}, done)
    });

    it('test_empty_declarations', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L276-L285
      // v3.1.0

      var css = "foo {\n  bar: baz; }\n";
      var scss = "foo {;;;;\n  bar: baz;;;;\n  ;;}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    });

    it('test_basic_property_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L287-L299
      // v3.1.0

      var source = "foo {\n  a: 2;\n  b: 2.3em;\n  c: 50%;\n  d: \"fraz bran\";\n  e: flanny-blanny-blan;\n  f: url(http://sass-lang.com);\n  g: U+ffa?;\n  h: #aabbcc; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_functions', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L301-L307
      // v3.1.0

      var source = "foo {\n  a: foo-bar(12);\n  b: -foo-bar-baz(13, 14 15); }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_unary_minus', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L309-L317
      // v3.1.0

      var source = "foo {\n  a: -2;\n  b: -2.3em;\n  c: -50%;\n  d: -foo(bar baz); }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_operators', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L319-L327
      // v3.1.0

      var source = "foo {\n  a: foo bar baz;\n  b: foo, #aabbcc, -12;\n  c: 1px/2px/-3px;\n  d: foo bar, baz/bang; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_important', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L329-L336
      // v3.1.0

      var source = "foo {\n  a: foo !important;\n  b: foo bar !important;\n  b: foo, bar !important; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_initial_hyphen', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L338-L344
      // v3.1.0

      var source = "foo {\n  a: -moz-bar-baz;\n  b: foo -o-bar-baz; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_ms_long_filter_syntax', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L346-L356
      // v3.1.0

      var css = "foo {\n  filter: progid:DXImageTransform.Microsoft.gradient(GradientType=1, startColorstr=#c0ff3300, endColorstr=#ff000000);\n  filter: progid:DXImageTransform.Microsoft.gradient(GradientType=1, startColorstr=#c0ff3300, endColorstr=#ff000000); }\n";
      var scss = "foo {\n  filter: progid:DXImageTransform.Microsoft.gradient(GradientType=1, startColorstr=#c0ff3300, endColorstr=#ff000000);\n  filter:progid:DXImageTransform.Microsoft.gradient(GradientType=1, startColorstr=#c0ff3300, endColorstr=#ff000000); }\n";

      equal(scss, css, {syntax: 'scss'}, done)
    });

    it('test_ms_short_filter_syntax', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L358-L365
      // v3.1.0

      var source = "foo {\n  filter: alpha(opacity=20);\n  filter: alpha(opacity=20, enabled=true);\n  filter: blaznicate(foo=bar, baz=bang bip, bart=#fa4600); }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_declaration_hacks', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L367-L379
      // v3.1.0

      var source = "foo {\n  _name: val;\n  *name: val;\n  :name: val;\n  .name: val;\n  #name: val;\n  name/**/: val;\n  name/*\\**/: val;\n  name: val; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_trailing_hash_hack', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L381-L388
      // v3.1.0

      var source = "foo {\n  foo: bar;\n  #baz: bang;\n  #bip: bop; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_zero_arg_functions', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L390-L396
      // v3.1.0

      var source = "foo {\n  a: foo();\n  b: bar baz-bang() bip; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_expression_function', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L398-L403
      // v3.1.0

      var source = "foo {\n  a: 12px expression(1 + (3 / Foo.bar(\"baz\" + \"bang\") + function() {return 12;}) % 12); }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_calc_function', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L405-L413
      // v3.1.0

      var source = "foo {\n  a: 12px calc(100%/3 - 2*1em - 2*1px);\n  b: 12px -moz-calc(100%/3 - 2*1em - 2*1px);\n  b: 12px -webkit-calc(100%/3 - 2*1em - 2*1px);\n  b: 12px -foobar-calc(100%/3 - 2*1em - 2*1px); }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_css_string_escapes', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L431-L440
      // v3.1.0

      var source = "foo {\n  a: \"\\foo bar\";\n  b: \"foo\\ bar\";\n  c: \"\\2022 \\0020\";\n  d: \"foo\\\\bar\";\n  e: \"foo\\\"'bar\"; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_css_ident_escapes', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L442-L451
      // v3.1.0

      var source = "foo {\n  a: \\foo bar;\n  b: foo\\ bar;\n  c: \\2022 \\0020;\n  d: foo\\\\bar;\n  e: foo\\\"\\'bar; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_media_directive', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L461-L478
      // v3.1.0

      function second() {
        parses("@media screen, print {\n  rule1 {\n    prop: val; }\n\n  rule2 {\n    prop: val; } }\n", {syntax: 'scss'}, done)
      }

      parses("@media all {\n  rule1 {\n    prop: val; }\n\n  rule2 {\n    prop: val; } }\n", {syntax: 'scss'}, second)
    });

    it('test_import_directive_with_media', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L499-L504
      // v3.1.0

      function fourth() {parses('@import "foo.css" screen, only print, screen and (foo: 0);', {syntax: 'scss'}, done) }
      function third() {parses('@import "foo.css" screen, print and (foo: 0);', {syntax: 'scss'}, fourth) }
      function second() {parses('@import "foo.css" screen, print;', {syntax: 'scss'}, third) }

      parses('@import "foo.css" screen;', {syntax: 'scss'}, second)
    });

    it('test_page_directive', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L506-L527
      // v3.1.0

      function fourth() {parses("@page flap:first {\n  prop1: val;\n  prop2: val; }\n", {syntax: 'scss'}, done) }
      function third() {parses("@page :first {\n  prop1: val;\n  prop2: val; }\n", {syntax: 'scss'}, fourth) }
      function second() {parses("@page flap {\n  prop1: val;\n  prop2: val; }\n", {syntax: 'scss'}, third) }

      parses("@page {\n  prop1: val;\n  prop2: val; }\n", {syntax: 'scss'}, second)
    });

    it('test_blockless_directive_without_semicolon', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L529-L531
      // v3.1.0

      var css = "@foo \"bar\";\n"
        var scss = '@foo "bar"'

        equal(scss, css, {syntax: 'scss'}, done)
    });

    it('test_directive_with_lots_of_whitespace', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L533-L535
      // v3.1.0

      var css = "@foo \"bar\";\n"
        var scss = '@foo    "bar"  ;'

        equal(scss, css, {syntax: 'scss'}, done)
    });

    it('test_empty_blockless_directive', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L537-L539
      // v3.1.0

      var source = "@foo;"

        parses(source, {syntax: 'scss'}, done)
    });

    it('test_multiple_blockless_directives', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L541-L546
      // v3.1.0

      var source = "@foo bar;\n@bar baz;\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_empty_block_directive', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L548-L554
      // v3.1.0

      var css = "@foo {}\n";
      var scss = "@foo {\n}\n";

      function second() { equal(scss, css, {syntax: 'scss'}, done) }

      parses("@foo {}", {syntax: 'scss'}, second)
    });

    it('test_block_directive_with_rule_and_property', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L566-L574
      // v3.1.0

      var source = "@foo {\n  rule {\n    a: b; }\n\n  a: b; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    it('test_attribute_selectors_with_identifiers', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L678-L684
      // v3.1.0

      function e(){parses('[foo~=bar] {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function d(){parses('[foo^=bar] {\n  a: b; }\n',{ syntax:'scss'},e)}
      function c(){parses('[foo$=bar] {\n  a: b; }\n',{ syntax:'scss'},d)}
      function b(){parses('[foo^=bar] {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses('[foo~=bar] {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_nth_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L686-L710
      // v3.1.0

      var css = ":nth-child(2n + 3) {\n  a: b; }\n";
      var scss = ":nth-child( 2n + 3 ) {\n  a: b; }\n";

      function m() { equal(scss, css, {syntax: 'scss'}, done)}
      function l(){  parses(':nth-child(-2n+ 3) {\n  a: b; }\n',{ syntax:'scss'},m)}
      function k(){  parses(':nth-child(-2n+3) {\n  a: b; }\n',{ syntax:'scss'},l)}
      function j(){  parses(':nth-child(+2n-3) {\n  a: b; }\n',{ syntax:'scss'},k)}
      function i(){  parses(':nth-child(2n-3) {\n  a: b; }\n',{ syntax:'scss'},j)}
      function h(){  parses(':nth-child(2n+3) {\n  a: b; }\n',{ syntax:'scss'},i)}
      function g(){  parses(':nth-child(+50) {\n  a: b; }\n',{ syntax:'scss'},h)}
      function f(){  parses(':nth-child(-50) {\n  a: b; }\n',{ syntax:'scss'},g)}
      function e(){  parses(':nth-child(50) {\n  a: b; }\n',{ syntax:'scss'},f)}
      function d(){  parses(':nth-child(odd) {\n  a: b; }\n',{ syntax:'scss'},e)}
      function c(){  parses(':nth-child(even) {\n  a: b; }\n',{ syntax:'scss'},d)}
      function b(){  parses(':nth-child(+n) {\n  a: b; }\n',{ syntax:'scss'},c)}
      parses(':nth-child(-n) {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_negation_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L712-L734
      // v3.1.0

      function n(){parses(':not(h1, h2, h3) {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function m(){parses(':not(#foo .bar > baz) {\n  a: b; }\n',{ syntax:'scss'},n)}
      function l(){parses(':not(a#foo.bar) {\n  a: b; }\n',{ syntax:'scss'},m)}
      function k(){parses(':not(:not(#foo)) {\n  a: b; }\n',{ syntax:'scss'},l)}
      function j(){parses(':not(:nth-child(2n + 3)) {\n  a: b; }\n',{ syntax:'scss'},k)}
      function i(){parses(':not(:hover) {\n  a: b; }\n',{ syntax:'scss'},j)}
      function h(){parses(':not([baz|foo~="bar"]) {\n  a: b; }\n',{ syntax:'scss'},i)}
      function g(){parses(':not([foo^="bar"]) {\n  a: b; }\n',{ syntax:'scss'},h)}
      function f(){parses(':not([foo]) {\n  a: b; }\n',{ syntax:'scss'},g)}
      function e(){parses(':not(.blah) {\n  a: b; }\n',{ syntax:'scss'},f)}
      function d(){parses(':not(#blah) {\n  a: b; }\n',{ syntax:'scss'},e)}
      function c(){parses(':not(*|*) {\n  a: b; }\n',{ syntax:'scss'},d)}
      function b(){parses(':not(*|bar) {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses(':not(foo|bar) {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_moz_any_selector', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L736-L740
      // v3.1.0

      function c(){parses(':-moz-any(foo bar, .baz > .bang) {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function b(){parses(':-moz-any(.foo) {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses(':-moz-any(h1, h2, h3) {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_namespaced_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L742-L747
      // v3.1.0

      function d(){parses('*|* {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function c(){parses('foo|* {\n  a: b; }\n',{ syntax:'scss'},d)}
      function b(){parses('*|E {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses('foo|E {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_namespaced_attribute_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L749-L753
      // v3.1.0

      function c(){parses('[foo|bar=baz] {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function b(){parses('[*|bar=baz] {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses('[foo|bar|=baz] {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_comma_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L755-L759
      // v3.1.0

      function c(){parses('E, F {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function b(){parses('E F, G H {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses('E > F, G > H {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_selectors_with_newlines', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L761-L765
      // v3.1.0

      function c(){parses('E, F\nG, H {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function b(){parses('E\nF {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses('E,\nF {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_functional_pseudo_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L775-L783
      // v3.1.0

      function g(){parses(':foo(-++--baz-"bar"12px) {\n  a: b; }\n',{syntax: 'scss'}, done)}
      function f(){parses(':foo(+"bar") {\n  a: b; }\n',{syntax: 'scss'},g)}
      function e(){parses(':foo(-) {\n  a: b; }\n',{syntax: 'scss'},f)}
      function d(){parses(':foo(+) {\n  a: b; }\n',{syntax: 'scss'},e)}
      function c(){parses(':foo(12px) {\n  a: b; }\n',{syntax: 'scss'},d)}
      function b(){parses(':foo(bar) {\n  a: b; }\n',{syntax: 'scss'},c)}

      parses(':foo("bar") {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_selector_hacks', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L785-L801
      // v3.1.0
      var css = "> > E {\n  a: b; }\n";
      var scss = ">> E {\n  a: b; }\n";

      function h(){parses('E*:hover {\n  a: b; }\n',{syntax: 'scss'}, done)}
      function g(){parses('E*.foo {\n  a: b; }\n',{syntax: 'scss'},h)}
      function f(){parses('E* {\n  a: b; }\n',{syntax: 'scss'},g)}
      function e(){equal(scss, css,{syntax: 'scss'},f)}
      function d(){parses('> > E {\n  a: b; }\n',{syntax: 'scss'},e)}
      function c(){parses('~ E {\n  a: b; }\n',{syntax: 'scss'},d)}
      function b(){parses('+ E {\n  a: b; }\n',{syntax: 'scss'},c)}

      parses('> E {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_invalid_directives', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L805-L808
      // v3.1.0

      function b() {doesnt_parse('@<err>12 "foo";','identifier',{syntax: 'scss'}, done)}
      doesnt_parse('@<err> import "foo";','identifier',{syntax: 'scss'},b)
    });

    it('test_invalid_classes', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L810-L813
      // v3.1.0

      function b() {doesnt_parse('p.<err>1foo {a: b}','class name',{syntax: 'scss'}, done)}
      doesnt_parse('p.<err> foo {a: b}','class name',{syntax: 'scss'},b)
    });

    it('test_invalid_ids', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L815-L817
      // v3.1.0

      doesnt_parse('p#<err> foo {a: b}','id name',{syntax: 'scss'}, done)
    });

    it('test_no_properties_at_toplevel', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L819-L821
      // v3.1.0

      doesnt_parse('a:<err> b;','pseudoclass or pseudoelement',{syntax: 'scss'}, done)
    });

    //TODO I'm not sure how this is supposed to be passing in the original repo (it isn't for me, even before our patches are applied). render tries to load the file, which doesnt exist. Since we don't support @import-ing anyway, skipping for now. PRs Welcome!
    it.skip('test_no_scss_directives', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L823-L829
      // v3.1.0

      var source = '@import "foo.sass";'
        parses(source, {syntax: 'scss'}, done, this)
    });

    it('test_no_variables', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L831-L834
      // v3.1.0

      doesnt_parse('foo { <err>!var = 12; }','"}"', {syntax: 'scss'}, done)
    });

    // TODO This throws an error, but a different error than the one that the test checks for. Therefore it errors out. Every version of Sass I have tested gives the same error as we are throwing, so assuming it is a broken test. PRs Welcome!
    it.skip('test_no_parent_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L836-L838
      // v3.1.0

      doesnt_parse('foo <err>&.bar {a: b}','"{"', {syntax: 'scss'}, done)
    });

    //TODO this does NOT throw an error, but it doesn't in the unpatched version of sass either. Assuming it is a bad test. PRs welcome!
    it.skip('test_no_selector_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L840-L842
      // v3.1.0

      doesnt_parse('foo <err>#{"bar"}.baz {a: b}','"{"', {syntax: 'scss'}, done)
    });

    //TODO this does NOT throw an error, but it doesn't in the unpatched version of sass either. Assuming it is a bad test. PRs welcome!
    it.skip('test_no_prop_name_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L844-L846
      // v3.1.0

      doesnt_parse('foo {a: b <err>#{"bar"} c}','"{"', {syntax: 'scss'}, done)
    });

    //TODO this does NOT throw an error, but it doesn't in the unpatched version of sass either. Assuming it is a bad test. PRs welcome!
    it.skip('test_no_prop_val_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L848-L850
      // v3.1.0

      doesnt_parse('foo {a: b <err>#{"bar"} c}','"{"', {syntax: 'scss'}, done)
    });

    //TODO this does NOT throw an error, but it doesn't in the unpatched version of sass either. Assuming it is a bad test. PRs welcome!
    it.skip('test_no_string_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L852-L857
      // v3.1.0

      var source = "foo {\n  a: \"bang #{1 +    \" bar \"} bip\"; }\n";

      parses(source, {syntax: 'scss'}, done)
    });

    // TODO This throws an error, but a different error than the one that the test checks for. Therefore the test fails. Every version of Sass I have tested gives the same error as we are throwing, so assuming it is a broken test. PRs Welcome!
    it.skip('test_no_sass_script_values', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L859-L861
      // v3.1.0

      doesnt_parse('foo {a: b <err>* c}','"{"', {syntax: 'scss'}, done)
    });

    //TODO this does NOT throw an error, but it doesn't in the unpatched version of sass either. Assuming it is a bad test. PRs welcome!
    it.skip('test_no_nested_rules', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L863-L866
      // v3.1.0

      function second(){doesnt_parse('foo {<err>[bar=baz] {a: b}}','"}"', {syntax: 'scss'}, done)}
      doesnt_parse('foo {bar <err>{a: b}}','":"', {syntax: 'scss'}, second)
    });

    //TODO this does NOT throw an error, but it doesn't in the unpatched version of sass either. Assuming it is a bad test. PRs welcome!
    it.skip('test_no_nested_properties', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L868-L871
      // v3.1.0

      function second(){doesnt_parse('foo {bar: bang <err>{a: b}}','expression (e.g. 1px, bold)', {syntax: 'scss'}, done)}
      doesnt_parse('foo {bar: <err>{a: b}}','expression (e.g. 1px, bold)', {syntax: 'scss'}, second)
    });

    //TODO this does NOT throw an error, but it doesn't in the unpatched version of sass either. Assuming it is a bad test. PRs welcome!
    it.skip('test_no_nested_directives', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L873-L875
      // v3.1.0

      doesnt_parse('foo {<err>@bar {a: b}}','"}"', {syntax: 'scss'}, done)
    });

    it('test_closing_line_comment_end_with_compact_output', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L890-L900
      // v3.1.0

      var css = "/* foo */\nbar { baz: bang; }\n";
      var scss = "/*\n * foo\n */\nbar {baz: bang}\n";

      equal(scss, css, {style: 'compact', syntax: 'scss', }, done)
    });

    it('test_underscores_in_identifiers', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L49-L56
      // v3.1.0

      function f(){ matches('Opal.Sass::SCSS::RX::IDENT', '_-foo',{ syntax:'scss'},done)}
      function e(){ matches('Opal.Sass::SCSS::RX::IDENT', '-_foo',{ syntax:'scss'},f)}
      function d(){ matches('Opal.Sass::SCSS::RX::IDENT', '_1foo',{ syntax:'scss'},e)}
      function c(){ matches('Opal.Sass::SCSS::RX::IDENT', '__foo',{ syntax:'scss'},d)}
      function b(){ matches('Opal.Sass::SCSS::RX::IDENT', '_\\xC3\\xBFfoo',{ syntax:'scss'},c)}
      matches('Opal.Sass::SCSS::RX::IDENT', 'foo_bar',{syntax: 'scss'},b)
    });

    it('test_double_quote_strings', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L71-L76
      // v3.1.0

      function d(){matches('Opal.Sass::SCSS::RX::STRING', '\\"\\t !#$%&(-~()*+,-./0123456789~\\"',{ syntax:'scss'},done)}
      function c(){matches('Opal.Sass::SCSS::RX::STRING', "\\\"\\\\\\\"\\\"",{ syntax:'scss'},d)}
      function b(){matches('Opal.Sass::SCSS::RX::STRING', '\\"foo\\\\nbar\\"',{ syntax:'scss'},c)}
      matches('Opal.Sass::SCSS::RX::STRING', '\\"foo bar\\"',{syntax: 'scss'},b)
    });

    it('test_single_quote_strings', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L78-L83
      // v3.1.0

      function d(){matches('Opal.Sass::SCSS::RX::STRING', '\'\\t !#$%&(-~()*+,-./0123456789~\'',{ syntax:'scss'},done)}
          function c(){matches('Opal.Sass::SCSS::RX::STRING', '\'\\\\\'\'',{ syntax:'scss'},d)}
          function b(){matches('Opal.Sass::SCSS::RX::STRING', '\'foo\\\\nbar\'',{ syntax:'scss'},c)}
          matches('Opal.Sass::SCSS::RX::STRING', '\'foo bar\'',{syntax: 'scss'},b)
          });

      it('test_invalid_strings', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L85-L90
        // v3.1.0

        function d(){doesnt_match('Opal.Sass::SCSS::RX::STRING', "\\\"foo\\nbar\\\"",{ syntax:'scss'},done)}
        function c(){doesnt_match('Opal.Sass::SCSS::RX::STRING', "\\\"foo\\\"bar\\\"", { syntax:'scss'},d)}
        function b(){doesnt_match('Opal.Sass::SCSS::RX::STRING', "\\'foo\\nbar\\'",{ syntax:'scss'},c)}
        doesnt_match('Opal.Sass::SCSS::RX::STRING', "\\'foo\\'bar\\'",{syntax: 'scss'},b)
      });

      it('test_uri', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L92-L97
        // v3.1.0

        function d(){matches('Opal.Sass::SCSS::RX::URI', "url(#\\\\%&**+,-./0123456789~)",{ syntax:'scss'},done)}
        function c(){matches('Opal.Sass::SCSS::RX::URI', 'url( \\"foo bar)\\" )',{ syntax:'scss'},d)}
        function b(){matches('Opal.Sass::SCSS::RX::URI', "url(\'foo bar)\')",{ syntax:'scss'},c)}
        matches('Opal.Sass::SCSS::RX::URI', 'url(\\"foo bar)\\")',{syntax: 'scss'},b)
      });

      it('test_invalid_uri', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L99-L101
        // v3.1.0

        doesnt_match('Opal.Sass::SCSS::RX::URI', 'url(foo)bar)',{syntax: 'scss'}, done)
      });

      it('test_unicode_range', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L103-L108
        // v3.1.0

        function d(){matches('Opal.Sass::SCSS::RX::UNICODERANGE', "U+00-Ff",{ syntax:'scss'},done)}
        function c(){matches('Opal.Sass::SCSS::RX::UNICODERANGE', 'u+980-9FF',{ syntax:'scss'},d)}
        function b(){matches('Opal.Sass::SCSS::RX::UNICODERANGE', "U+9aF??",{ syntax:'scss'},c)}
        matches('Opal.Sass::SCSS::RX::UNICODERANGE', 'U+??',{syntax: 'scss'},b)
      });

      it('test_escape_empty_ident', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L110-L112
        // v3.1.0

        eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("")', '""', {syntax: 'scss'}, done)
      });

      it('test_escape_just_prefix_ident', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L114-L117
        // v3.1.0

        function second() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("_")', '"\\\\_"', {syntax: 'scss'}, done)
        }

        eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("-")', '"\\\\-"', {syntax: 'scss'}, second)
      });

      it('test_escape_plain_ident', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L119-L125
        // v3.1.0

        function fifth() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("_foo_bar")', '"_foo_bar"', {syntax: 'scss'}, done)
        }

        function fourth() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("f2oo_bar")', '"f2oo_bar"', {syntax: 'scss'}, fifth)
        }

        function third() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("-foo-bar")', '"-foo-bar"', {syntax: 'scss'}, fourth)
        }

        function second() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("foo-1bar")', '"foo-1bar"', {syntax: 'scss'}, third)
        }

        eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("foo")', '"foo"', {syntax: 'scss'}, second)
      });

      it('test_escape_initial_funky_ident', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L127-L136
        // v3.1.0

        function sixth() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("- foo")', "'-\\\\ foo'", {syntax: 'scss'}, done)
        }

        function fifth() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("-&foo")', "'-\\\\&foo'", {syntax: 'scss'}, sixth)
        }

        function fourth() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("&foo")', "'\\\\&foo'", {syntax: 'scss'}, fifth)
        }

        function third() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("_5foo")', "'_\\\\000035foo'", {syntax: 'scss'}, fourth)
        }

        function second() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("-5foo")',  "'-\\\\000035foo'", {syntax: 'scss'}, third)
        }

        eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("5foo")', "'\\\\000035foo'", {syntax: 'scss'}, second)
      });

      it('test_escape_mid_funky_ident', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L138-L142
        // v3.1.0

        function third() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("foo\177bar")', "'foo\\\\00007fbar'", {syntax: 'scss'}, done)
        }

        function second() {
          eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("foo  bar")',  "'foo\\\\ \\\\ bar'", {syntax: 'scss'}, third)
        }

        eval_equal('Opal.Sass.$$scope.SCSS.$$scope.RX.$escape_ident("foo&bar")', "'foo\\\\&bar'", {syntax: 'scss'}, second)
      });

      it('test_one_line_comments', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L10-L27
        // v3.1.0
        function second() {
          var css = ".foo bar[val=\"//\"] {\n  baz: bang; }\n";
          var scss = ".foo bar[val=\"//\"] {\n  baz: bang; //}\n}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        var css = ".foo {\n  baz: bang; }\n";
        var scss = ".foo {// bar: baz;}\n  baz: bang; //}\n}\n";
        equal(scss, css,{syntax: 'scss'}, second)
      });

      it('test_variables', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L31-L52
        // v3.1.0

        var css = "blat {\n  a: foo; }\n";
        var scss = "$vär: foo;\n\nblat {a: $vär}\n";
        equal(scss, css,{syntax: 'scss'}, done)
      });

      it('test_guard_assign', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L65-L84
        // v3.1.0

        var css = "foo {\n  a: 3;\n  b: -1;\n  c: foobar;\n  d: 12px; }\n";
        var scss = "foo {\n  a: 1 + 2;\n  b: 1 - 2;\n  c: foo + bar;\n  d: floor(12.3px); }\n";
        equal(scss, css,{syntax: 'scss'}, done)
      });

      it('test_sass_script', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L86-L100
        // v3.1.0

        var css = "foo {\n  a: 3;\n  b: -1;\n  c: foobar;\n  d: 12px; }\n";
        var scss = "foo {\n  a: 1 + 2;\n  b: 1 - 2;\n  c: foo + bar;\n  d: floor(12.3px); }\n";
        equal(scss, css,{syntax: 'scss'}, done)
      });

      it('test_debug_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L102-L116
        // v3.1.0

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith(\"Line 2 DEBUG: hello world!\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)
              done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined)

            var css = "foo {\n  a: b; }\n\nbar {\n  c: d; }\n";
          var scss = "foo {a: b}\n@debug \"hello world!\";\nbar {c: d}\n";
          equal(scss, css,{syntax: 'scss'}, third)
        }

        // since the tests run in the worker, we have to inject sinon and wrap the console there, rather than in this context. Rather than bloat up the shipping code,
        // or ship code thats different than what we test, we eval it in
        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      });

      it('test_for_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L139-L164
        // v3.1.0

        function second() {
          var css = ".foo {\n  a: 1;\n  a: 2;\n  a: 3;\n  a: 4;\n  a: 5; }\n";
          var scss = ".foo {\n  @for $var from 1 through 5 {a: $var;}\n}\n";
          equal(scss, css,{syntax: 'scss'}, done)
        }

        var css = ".foo {\n  a: 1;\n  a: 2;\n  a: 3;\n  a: 4; }\n";
        var scss = ".foo {\n  @for $var from 1 to 5 {a: $var;}\n}\n";
        equal(scss, css,{syntax: 'scss'}, second)
      });

      it('test_if_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L166-L191
        // v3.1.0

        function third() {
          var css = "bar {\n  a: b; }\n";
          var scss = "@if \"foo\" != \"foo\" {foo {a: b}}\n@else {bar {a: b}}\n";
          equal(scss, css,{syntax: 'scss'}, done)
        }

        function second() {
          var css = "bar {\n  a: b; }\n";
          var scss = "@if \"foo\" != \"foo\" {foo {a: b}}\n@else if \"foo\" == \"foo\" {bar {a: b}}\n@else if true {baz {a: b}}\n";
          equal(scss, css,{syntax: 'scss'}, third)
        }

        var css = "foo {\n  a: b; }\n";
        var scss = "@if \"foo\" == \"foo\" {foo {a: b}}\n@if \"foo\" != \"foo\" {bar {a: b}}\n";
        equal(scss, css,{syntax: 'scss'}, second)
      });

      it('test_comment_after_if_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L193-L217
        // v3.1.0

        function second() {
          var css = "foo {\n  a: b;\n  /* This is a comment */\n  c: d; }\n";
          var scss = "foo {\n  @if true {a: b}\n  @else {x: y}\n  /* This is a comment */\n  c: d }\n";
          equal(scss, css,{syntax: 'scss'}, done)
        }

        var css = "foo {\n  a: b;\n  /* This is a comment */\n  c: d; }\n";
        var scss = "foo {\n  @if true {a: b}\n  /* This is a comment */\n  c: d }\n";
        equal(scss, css,{syntax: 'scss'}, second)
      });

      it('test_each_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L238-L263
        // v3.1.0

        var css = "a {\n  b: 1px;\n  b: 2px;\n  b: 3px;\n  b: 4px; }\n\nc {\n  d: foo;\n  d: bar;\n  d: baz;\n  d: bang; }\n";
        var scss = "a {\n  @each $number in 1px 2px 3px 4px {\n    b: $number;\n  }\n}\nc {\n  @each $str in foo, bar, baz, bang {\n    d: $str;\n  }\n}\n";
        equal(scss, css,{syntax: 'scss'}, done)
      });

      it('test_media_import', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L273-L275
        // v3.1.0

        var css = "@import \"./fonts.sass\" all;\n"
          var scss = "@import \"./fonts.sass\" all;"
          equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_url_import', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L282-L284
        // v3.1.0

        var css = "@import url(fonts.sass);\n"
          var scss = "@import url(fonts.sass);"
          equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_block_comment_in_script', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L286-L293
        // v3.1.0

        var css = "foo {\n  a: 1bar; }\n";
        var scss = "foo {a: 1 + /* flang */ bar}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_line_comment_in_script', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L295-L303
        // v3.1.0

        var css = "foo {\n  a: 1blang; }\n";
        var scss = "foo {a: 1 + // flang }\n  blang }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_nested_rules', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L307-L334
        // v3.1.0

        function third() {
          var css = "foo bar baz {\n  a: b; }\nfoo bang bip {\n  a: b; }\n";
          var scss = "foo {\n  bar {baz {a: b}}\n  bang {bip {a: b}}}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        function second() {
          var css = "foo bar {\n  a: b; }\nfoo baz {\n  b: c; }\n";
          var scss = "foo {\n  bar {a: b}\n  baz {b: c}}\n";
          equal(scss, css, {syntax: 'scss'}, third)
        }

        var css = "foo bar {\n  a: b; }\n";
        var scss = "foo {bar {a: b}}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_nested_rules_with_declarations', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L336-L382
        // v3.1.0

        function third() {
          var css = "foo {\n  ump: nump;\n  grump: clump; }\n  foo bar {\n    blat: bang;\n    habit: rabbit; }\n    foo bar baz {\n      a: b; }\n    foo bar bip {\n      c: d; }\n  foo bibble bap {\n    e: f; }\n";
          var scss = "foo {\n  ump: nump;\n  grump: clump;\n  bar {\n    blat: bang;\n    habit: rabbit;\n    baz {a: b}\n    bip {c: d}}\n  bibble {\n    bap {e: f}}}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        function second() {
          var css = "foo {\n  a: b; }\n  foo bar {\n    c: d; }\n";
          var scss = "foo {\n  bar {c: d}\n  a: b}\n";
          equal(scss, css, {syntax: 'scss'}, third)
        }

        var css = "foo {\n  a: b; }\n  foo bar {\n    c: d; }\n";
        var scss = "foo {\n  a: b;\n  bar {c: d}}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_almost_ambiguous_nested_rules_and_declarations', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L400-L414
        // v3.1.0

        var css = "foo {\n  bar: baz bang bop biddle woo look at all these elems; }\n  foo bar:baz:bang:bop:biddle:woo:look:at:all:these:pseudoclasses {\n    a: b; }\n  foo bar:baz bang bop biddle woo look at all these elems {\n    a: b; }\n";
        var scss = "foo {\n  bar:baz:bang:bop:biddle:woo:look:at:all:these:pseudoclasses {a: b};\n  bar:baz bang bop biddle woo look at all these elems {a: b};\n  bar:baz bang bop biddle woo look at all these elems; }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_newlines_in_selectors', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L336-L382
        // v3.1.0

        function fourth() {
          var css = "foo bang, foo bip\nbop, bar\nbaz bang, bar\nbaz bip\nbop {\n  a: b; }\n";
          var scss = "foo, bar\nbaz {\n  bang, bip\n  bop {a: b}}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        function third() {
          var css = "foo\nbar baz\nbang {\n  a: b; }\nfoo\nbar bip bop {\n  c: d; }\n";
          var scss = "foo\nbar {\n  baz\n  bang {a: b}\n\n  bip bop {c: d}}\n";
          equal(scss, css, {syntax: 'scss'}, fourth)
        }

        function second() {
          var css = "foo baz,\nfoo bang,\nbar baz,\nbar bang {\n  a: b; }\n";
          var scss = "foo,\nbar {\n  baz,\n  bang {a: b}}\n";
          equal(scss, css, {syntax: 'scss'}, third)
        }

        var css = "foo\nbar {\n  a: b; }\n";
        var scss = "foo\nbar {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_trailing_comma_in_selector', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L471-L485
        // v3.1.0

        var css = "#foo #bar,\n#baz #boom {\n  a: b; }\n\n#bip #bop {\n  c: d; }\n";
        var scss = "#foo #bar,,\n,#baz #boom, {a: b}\n\n#bip #bop, ,, {c: d}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_parent_selectors', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L487-L498
        // v3.1.0

        var css = "foo:hover {\n  a: b; }\nbar foo.baz {\n  c: d; }\n";
        var scss = "foo {\n  &:hover {a: b}\n  bar &.baz {c: d}}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_namespace_properties', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L502-L515
        // v3.1.0

        var css = "foo {\n  bar: baz;\n  bang-bip: 1px;\n  bang-bop: bar; }\n";
        var scss = "foo {\n  bar: baz;\n  bang: {\n    bip: 1px;\n    bop: bar;}}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_several_namespace_properties', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L517-L537
        // v3.1.0

        var css = "foo {\n  bar: baz;\n  bang-bip: 1px;\n  bang-bop: bar;\n  buzz-fram: \"foo\";\n  buzz-frum: moo; }\n";
        var scss = "foo {\n  bar: baz;\n  bang: {\n    bip: 1px;\n    bop: bar;}\n  buzz: {\n    fram: \"foo\";\n    frum: moo;\n  }\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_nested_namespace_properties', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L539-L554
        // v3.1.0

        var css = "foo {\n  bar: baz;\n  bang-bip: 1px;\n  bang-bop: bar;\n  bang-blat-baf: bort; }\n";
        var scss = "foo {\n  bar: baz;\n  bang: {\n    bip: 1px;\n    bop: bar;\n    blat:{baf:bort}}}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_namespace_properties_with_value', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L556-L568
        // v3.1.0

        var css = "foo {\n  bar: baz;\n    bar-bip: bop;\n    bar-bing: bop; }\n";
        var scss = "foo {\n  bar: baz {\n    bip: bop;\n    bing: bop; }}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_namespace_properties_with_script_value', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L570-L582
        // v3.1.0

        var css = "foo {\n  bar: bazbang;\n    bar-bip: bop;\n    bar-bing: bop; }\n";
        var scss = "foo {\n  bar: baz + bang {\n    bip: bop;\n    bing: bop; }}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_no_namespace_properties_without_space', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L584-L593
        // v3.1.0

        var css = "foo bar:baz {\n  bip: bop; }\n";
        var scss = "foo {\n  bar:baz {\n    bip: bop }}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_basic_mixins', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L612-L648
        // v3.1.0

        function third() {
          var css = "bar {\n  a: b;\n  c: d; }\n";
          var scss = "@mixin foo {a: b}\n\nbar {\n  @include foo;\n  c: d; }\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        function second() {
          var css = "bar {\n  c: d; }\n  bar .foo {\n    a: b; }\n";
          var scss = "@mixin foo {\n  .foo {a: b}}\n\nbar {\n  @include foo;\n  c: d; }\n";
          equal(scss, css, {syntax: 'scss'}, third)
        }

        var css = ".foo {\n  a: b; }\n";
        var scss = "@mixin foo {\n  .foo {a: b}}\n\n@include foo;\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_mixins_with_empty_args', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L650-L677
        // v3.1.0

        function third() {
          var css = ".foo {\n  a: b; }\n";
          var scss = "@mixin foo {a: b}\n\n.foo {@include foo();}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        function second() {
          var css = ".foo {\n  a: b; }\n";
          var scss = "@mixin foo() {a: b}\n\n.foo {@include foo;}\n";
          equal(scss, css, {syntax: 'scss'}, third)
        }

        var css = ".foo {\n  a: b; }\n";
        var scss = "@mixin foo() {a: b}\n\n.foo {@include foo();}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_mixins_with_args', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L650-L677
        // v3.1.0

        function second() {
          var css = ".foo {\n  a: bar;\n  b: 12px; }\n";
          var scss = "@mixin foo($a, $b) {\n  a: $a;\n  b: $b; }\n\n.foo {@include foo(bar, 12px)}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        var css = ".foo {\n  a: bar; }\n";
        var scss = "@mixin foo($a) {a: $a}\n\n.foo {@include foo(bar)}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_basic_function', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L704-L717
        // v3.1.0

        var css = "bar {\n  a: 3; }\n";
        var scss = "@function foo() {\n  @return 1 + 2;\n}\n\nbar {\n  a: foo();\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_function_args', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L719-L732
        // v3.1.0

        var css = "bar {\n  a: 3; }\n";
        var scss = "@function plus($var1, $var2) {\n  @return $var1 + $var2;\n}\n\nbar {\n  a: plus(1, 2);\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_only_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L757-L764
        // v3.1.0

        var css = "foo bar {\n  a: b; }\n";
        var scss = "#{\"foo\" + \" bar\"} {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_before_element_name', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L766-L773
        // v3.1.0

        var css = "foo barbaz {\n  a: b; }\n";
        var scss = "#{\"foo\" + \" bar\"}baz {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_in_string', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L775-L782
        // v3.1.0

        var css = "foo[val=\"bar foo bar baz\"] {\n  a: b; }\n";
        var scss = "foo[val=\"bar #{\"foo\" + \" bar\"} baz\"] {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_in_pseudoclass', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L784-L791
        // v3.1.0

        var css = "foo:nth-child(5n) {\n  a: b; }\n";
        var scss = "foo:nth-child(#{5 + \"n\"}) {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_at_class_begininng', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L793-L801
        // v3.1.0

        var css = ".zzz {\n  a: b; }\n";
        var scss = "$zzz: zzz;\n.#{$zzz} { a: b; }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_at_id_begininng', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L803-L811
        // v3.1.0

        var css = "#zzz {\n  a: b; }\n";
        var scss = "$zzz: zzz;\n##{$zzz} { a: b; }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_at_pseudo_begininng', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L813-L821
        // v3.1.0

        var css = ":zzz::zzz {\n  a: b; }\n";
        var scss = "$zzz: zzz;\n:#{$zzz}::#{$zzz} { a: b; }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_at_attr_beginning', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L823-L831
        // v3.1.0

        var css = "[zzz=foo] {\n  a: b; }\n";
        var scss = "$zzz: zzz;\n[#{$zzz}=foo] { a: b; }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_selector_interpolation_at_dashes', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L833-L842
        // v3.1.0

        var css = "div {\n  -foo-a-b-foo: foo; }\n";
        var scss = "$a : a;\n$b : b;\ndiv { -foo-#{$a}-#{$b}-foo: foo }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_basic_prop_name_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L844-L857

        function second() {
          var css = "foo {\n  bar3: blip; }\n";
          var scss = "foo {bar#{1 + 2}: blip}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        var css = "foo {\n  barbazbang: blip; }\n";
        var scss = "foo {bar#{\"baz\" + \"bang\"}: blip}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_prop_name_only_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L859-L866
        // v3.1.0

        var css = "foo {\n  bazbang: blip; }\n";
        var scss = "foo {#{\"baz\" + \"bang\"}: blip}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_rules_beneath_properties', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L881-L892
        // v3.1.0

        err_message("foo {\n  bar: {\n    baz {\n      bang: bop }}}\n", 'Illegal nesting: Only properties may be nested beneath properties.', {syntax: 'scss'}, done)
      });

      it('test_uses_property_exception_when_followed_by_open_bracket', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L949-L958
        // v3.1.0

        err_message("foo {\n  bar:{baz: .fail} }\n", 'Invalid CSS after "  bar:{baz: ": expected expression (e.g. 1px, bold), was ".fail} }"', {syntax: 'scss'}, done)
      });

      it('test_script_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L960-L969
        // v3.1.0

        err_message("foo {\n  bar: \"baz\" * * }\n", 'Invalid CSS after "  bar: "baz" * ": expected expression (e.g. 1px, bold), was "* }"', {syntax: 'scss'}, done)
      });

      it('test_multiline_script_syntax_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L971-L981
        // v3.1.0

        err_message("foo {\n  bar:\n    \"baz\" * * }\n", 'Invalid CSS after "    "baz" * ": expected expression (e.g. 1px, bold), was "* }"', {syntax: 'scss'}, done)
      });

      it('test_multiline_script_runtime_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L983-L994
        // v3.1.0

        err_message("foo {\n  bar: \"baz\" +\n    \"bar\" +\n    $bang }\n", "Undefined variable: \"$bang\".", {syntax: 'scss'}, done)
      });

      it('test_post_multiline_script_runtime_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L996-L1008
        // v3.1.0

        err_message("foo {\n  bar: \"baz\" +\n    \"bar\" +\n    \"baz\";\n  bip: $bop; }\n", "Undefined variable: \"$bop\".", {syntax: 'scss'}, done)
      });

      it('test_no_lonely_else', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1090-L1096
        // v3.1.0

        err_message("@else {foo: bar}\n", "Invalid CSS: @else must come after @if", {syntax: 'scss'}, done)
      });

      it('test_weird_added_space', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1090-L1096
        // v3.1.0

        var css = "foo {\n  bar: -moz-bip; }\n";
        var scss = "$value : bip;\n\nfoo {\n  bar: -moz-#{$value};\n}\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_interpolation_with_bracket_on_next_line', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1113-L1121
        // v3.1.0

        var css = "a.foo b {\n  color: red; }\n";
        var scss = "a.#{\"foo\"} b\n{color: red}\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_extra_comma_in_mixin_arglist_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1123-L1135
        // v3.1.0

        err_message("@mixin foo($a1, $a2) {\n  baz: $a1 $a2;\n}\n\n.bar {\n  @include foo(bar, );\n}\n", "Invalid CSS after \"...clude foo(bar, \": expected mixin argument, was \");\"", {syntax: 'scss'}, done)
      });

      it('test_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1137-L1145
        // v3.1.0

        var css = "ul li#foo a span.label {\n  foo: bar; }\n";
        var scss = "$bar : \"#foo\";\nul li#{$bar} a span.label { foo: bar; }\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_mixin_with_keyword_args', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1147-L1161
        // v3.1.0

        var css = ".mixed {\n  required: foo;\n  arg1: default-val1;\n  arg2: non-default-val2; }\n";
        var scss = "@mixin a-mixin($required, $arg1: default-val1, $arg2: default-val2) {\n  required: $required;\n  arg1: $arg1;\n  arg2: $arg2;\n}\n.mixed { @include a-mixin(foo, $arg2: non-default-val2); }";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_passing_required_args_as_a_keyword_arg', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1163-L1176
        // v3.1.0

        var css = ".mixed {\n  required: foo;\n  arg1: default-val1;\n  arg2: default-val2; }\n";
        var scss = "@mixin a-mixin($required, $arg1: default-val1, $arg2: default-val2) {\n  required: $required;\n  arg1: $arg1;\n  arg2: $arg2; }\n.mixed { @include a-mixin($required: foo); }\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_passing_all_as_keyword_args_in_opposite_order', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1178-L1191
        // v3.1.0

        var css = ".mixed {\n  required: foo;\n  arg1: non-default-val1;\n  arg2: non-default-val2; }\n";
        var scss = "@mixin a-mixin($required, $arg1: default-val1, $arg2: default-val2) {\n  required: $required;\n  arg1: $arg1;\n  arg2: $arg2; }\n.mixed { @include a-mixin($arg2: non-default-val2, $arg1: non-default-val1, $required: foo); }\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_keyword_args_in_functions', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1193-L1200
        // v3.1.0

        var css = ".keyed {\n  color: rgba(170, 119, 204, 0.4); }\n";
        var scss = ".keyed { color: rgba($color: #a7c, $alpha: 0.4) }\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_unknown_keyword_arg_raises_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1202-L1207
        // v3.1.0

        err_message("@mixin a($b: 1) { a: $b; }\ndiv { @include a(1, $c: 3); }\n", "Mixin a doesn't have an argument named $c", {syntax: 'scss'}, done)
      });

      it('test_keyword_args_in_functions', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1193-L1200
        // v3.1.0

        var css = ".keyed {\n  color: rgba(170, 119, 204, 0.4); }\n";
        var scss = ".keyed { color: rgba($color: #a7c, $alpha: 0.4) }\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_newlines_removed_from_selectors_when_compressed', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1210-L1221
        // v3.1.0

        var css = "z a,z b{display:block}\n";
        var scss = "a,\nb {\n  z & {\n    display: block;\n  }\n}\n";

        equal(scss, css, {syntax: 'scss', style: 'compressed'}, done)
      });

      it('test_multiline_var', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1230-L1248
        // v3.1.0

        var css = "foo {\n  a: 3;\n  b: false;\n  c: a b c; }\n";
        var scss = "foo {\n  $var1: 1 +\n    2;\n  $var2: true and\n    false;\n  $var3: a b\n    c;\n  a: $var1;\n  b: $var2;\n  c: $var3; }\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_basic', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L5-L12
        // v3.1.0

        function fourth() {
          var css = ".foo, .bar {\n  a: b; }\n\n.bar {\n  c: d; }\n";
          var scss = ".foo {a: b}\n.bar {@extend .foo; c: d}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        }

        function third() {
          var css = ".foo, .bar {\n  a: b; }\n\n.bar {\n  c: d; }\n";
          var scss = ".foo {a: b}\n.bar {c: d; @extend .foo}";
          equal(scss, css, {syntax: 'scss'}, fourth)
        }

        function second() {
          var css = ".foo, .bar {\n  a: b; }\n";
          var scss = ".bar {@extend .foo}\n.foo {a: b}\n";
          equal(scss, css, {syntax: 'scss'}, third)
        }

        var css = ".foo, .bar {\n  a: b; }\n";
        var scss = ".foo {a: b}\n.bar {@extend .foo}\n";

        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_indented_syntax', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L45-L65
        // v3.1.0

        function second() {
          var css = ".foo, .bar {\n  a: b; }\n";
          var sass = ".foo\n  a: b\n.bar\n  @extend #{\".foo\"}";

          equal(sass, css, {syntax: 'sass'}, done)
        }

        var css = ".foo, .bar {\n  a: b; }\n";
        var sass = ".foo\n  a: b\n.bar\n  @extend .foo\n";
        equal(sass, css, {syntax: 'sass'}, second)
      });

      it('test_multiple_targets', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L67-L79
        // v3.1.0

        var css = ".foo, .bar {\n  a: b; }\n\n.blip .foo, .blip .bar {\n  c: d; }\n";
        var scss = ".foo {a: b}\n.bar {@extend .foo}\n.blip .foo {c: d}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_multiple_extendees', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L81-L93
        // v3.1.0

        var css = ".foo, .baz {\n  a: b; }\n\n.bar, .baz {\n  c: d; }\n";
        var scss = ".foo {a: b}\n.bar {c: d}\n.baz {@extend .foo; @extend .bar}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_pseudoelement_goes_lefter_than_not', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L819-L835
        // v3.1.0

        function second() {
          var css = ".foo:not(.bang), .baz:not(.bang)::bar {\n  a: b; }\n";
          var scss = ".foo:not(.bang) {a: b}\n.baz::bar {@extend .foo}\n";

          equal(scss, css, {syntax: 'scss'}, done)
        }

        var css = ".foo::bar, .baz:not(.bang)::bar {\n  a: b; }\n";
        var scss = ".foo::bar {a: b}\n.baz:not(.bang) {@extend .foo}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      });

      it('test_nested_extender_merges_with_same_selector', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1189-L1198
        // v3.1.0

        var css = ".foo .bar, .foo .baz {\n  a: b; }\n";
        var scss = ".foo {\n  .bar {a: b}\n  .baz {@extend .bar} }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_extend_self_loop', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1212-L1219
        // v3.1.0

        var css = ".foo {\n  a: b; }\n";
        var scss = ".foo {a: b; @extend .foo}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_multiple_extender_merges_with_superset_selector', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1265-L1273
        // v3.1.0

        var css = "a.bar.baz, a.foo {\n  a: b; }\n";
        var scss = ".foo {@extend .bar; @extend .baz}\na.bar.baz {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_control_flow_if', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1275-L1294
        // v3.1.0

        var css = ".true, .also-true {\n  color: green; }\n\n.false, .also-false {\n  color: red; }\n";
        var scss = ".true  { color: green; }\n.false { color: red;   }\n.also-true {\n  @if true { @extend .true;  }\n  @else    { @extend .false; }\n}\n.also-false {\n  @if false { @extend .true;  }\n  @else     { @extend .false; }\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_control_flow_for', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1296-L1316
        // v3.1.0

        var css = ".base-0, .added {\n  color: green; }\n\n.base-1, .added {\n  display: block; }\n\n.base-2, .added {\n  border: 1px solid blue; }\n";
        var scss = ".base-0  { color: green; }\n.base-1  { display: block; }\n.base-2  { border: 1px solid blue; }\n.added {\n  @for $i from 0 to 3 {\n    @extend .base-#{$i};\n  }\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_control_flow_while', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1318-L1340
        // v3.1.0

        var css = ".base-0, .added {\n  color: green; }\n\n.base-1, .added {\n  display: block; }\n\n.base-2, .added {\n  border: 1px solid blue; }\n";
        var scss = ".base-0  { color: green; }\n.base-1  { display: block; }\n.base-2  { border: 1px solid blue; }\n.added {\n  $i : 0;\n  @while $i < 3 {\n    @extend .base-#{$i};\n    $i : $i + 1;\n  }\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_empty_render', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L162-L164
        // v3.1.0

        var css = "";
        var scss = ""
          equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_flexible_tabulation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L205-L210
        // v3.1.0

        function second() {
          var css = "p {\n  a: b; }\n  p q {\n    c: d; }\n"
            var scss = "p\n\ta: b\n\tq\n\t\tc: d\n"
            equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = "p {\n  a: b; }\n  p q {\n    c: d; }\n";
        var scss = "p\n a: b\n q\n  c: d\n"
          equal(scss, css, {syntax: 'sass'}, second)
      })

      it('test_default_function', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L641-L650
        // v3.1.0

        function second() {
          var css = "foo {\n  bar: url(); }\n"
            var scss = "foo\n  bar: url()\n"
            equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = "foo {\n  bar: url(\"foo.png\"); }\n";
        var scss = "foo\n  bar: url(\"foo.png\")\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_string_minus', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L652-L655
        // v3.1.0

        function second() {
          var css = "foo {\n  bar: -baz-boom; }\n"
            var scss = "foo\n  bar: -baz-boom"
            equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = "foo {\n  bar: baz-boom-bat; }\n"
          var scss = "foo\n  bar: baz-boom-bat"
          equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_string_div', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L657-L660
        // v3.1.0

        function second() {
          var css = "foo {\n  bar: /baz/boom; }\n"
            var scss = "foo\n  bar: /baz/boom"
            equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = "foo {\n  bar: baz/boom/bat; }\n"
          var scss = "foo\n  bar: baz/boom/bat"
          equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_basic_multiline_selector', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L662-L680
        // v3.1.0

        function g() { equal("#bip #bop,, ,\n  :foo bar", "#bip #bop {\n  foo: bar; }\n", {syntax: 'sass'}, done) }
        function f() { equal("#foo #bar,,\n,#baz #boom,\n  :foo bar","#foo #bar,\n#baz #boom {\n  foo: bar; }\n",{syntax: 'sass'}, g)}
        function e() {equal("#foo #bar,\n#baz #boom\n  :foo bar","#foo #bar,#baz #boom{foo:bar}\n", {syntax: 'sass', style: 'compressed'}, f)}
        function d() {equal("#foo #bar,\n#baz #boom\n  :foo bar", "#foo #bar, #baz #boom { foo: bar; }\n", {style: 'compact', syntax: 'sass'}, e)}
        function c() { equal("#foo,\n#bar\n  :foo bar\n  #baz\n    :foo bar", "#foo,\n#bar {\n  foo: bar; }\n  #foo #baz,\n  #bar #baz {\n    foo: bar; }\n", {syntax: 'sass'}, d)}
        function b() {equal("#foo\n  #bar,\n  #baz\n    :foo bar", "#foo #bar,\n#foo #baz {\n  foo: bar; }\n", {syntax: 'sass'}, c)}
        equal("#foo #bar,\n#baz #boom\n  :foo bar", "#foo #bar,\n#baz #boom {\n  foo: bar; }\n", {syntax: 'sass'}, b)
      })

      it('test_colon_only', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L686-L706
        // v3.1.0

        function second() {
          err_message("a\n  :b c","Illegal property syntax: can't use old syntax when :property_syntax => \"new\" is set.", {property_syntax: "new", syntax: 'sass'}, done)
        }

        err_message("a\n  b: c", "Illegal property syntax: can't use new syntax when :property_syntax => \"old\" is set.", {property_syntax: "old", syntax: 'sass'}, second)
      })

      it('test_pseudo_elements', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L708-L716
        // v3.1.0

        var css = "::first-line {\n  size: 10em; }\n";
        var scss = "::first-line\n  size: 10em\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L718-L777
        // v3.1.0
        function w(){equal("@a\n  :b c\n  #d\n    :e f\n  :g h\n","@a{b:c;#d{e:f}g:h}\n",  {style: 'compressed', syntax: 'sass'}, done)}
        function v(){equal("@a\n  :b c\n  #d\n    :e f\n  :g h\n","@a { b: c;\n  #d { e: f; }\n  g: h; }\n",  {style: 'compact', syntax: 'sass'}, w)}
        function u(){equal("@a\n  #foo, \n  #bar\n    :b c","@a{#foo,#bar{b:c}}\n",  {style: 'compressed', syntax: 'sass'}, v)}
        function t(){equal("@a\n  #foo, \n  #bar\n    :b c", "@a {\n  #foo,\n  #bar {\n    b: c;\n  }\n}\n", {style: 'expanded', syntax: 'sass'}, u)}
        function s(){equal("@a\n  #foo, \n  #bar\n    :b c","@a { #foo, #bar { b: c; } }\n",  {style: 'compact', syntax: 'sass'}, t)}
        function r(){equal("@a\n  #foo, \n  #bar\n    :b c", "@a {\n  #foo,\n  #bar {\n    b: c; } }\n", {syntax: 'sass'}, s)}
        function q(){equal("@a\n  #b\n    :a b\n    #c\n      :d e","@a{#b{a:b}#b #c{d:e}}\n",  {style: 'compressed', syntax: 'sass'}, r)}
        function p(){equal("@a\n  #b\n    :a b\n    #c\n      :d e", "@a {\n  #b {\n    a: b;\n  }\n  #b #c {\n    d: e;\n  }\n}\n", {style: 'expanded', syntax: 'sass'}, q)}
        function o(){equal("@a\n  #b\n    :a b\n    #c\n      :d e","@a { #b { a: b; }\n  #b #c { d: e; } }\n",  {style: 'compact', syntax: 'sass'}, p)}
        function n(){equal("@a\n  #b\n    :a b\n    #c\n      :d e","@a {\n  #b {\n    a: b; }\n    #b #c {\n      d: e; } }\n",  {syntax: 'sass'}, o)}
        function m(){equal("@a\n  #b\n    :c d","@a{#b{c:d}}\n",  {style: 'compressed', syntax: 'sass'}, n)}
        function l(){equal("@a\n  #b\n    :c d","@a {\n  #b {\n    c: d;\n  }\n}\n",  {style: 'expanded', syntax: 'sass'}, m)}
        function k(){equal("@a\n  #b\n    :c d", "@a { #b { c: d; } }\n", {style: 'compact', syntax: 'sass'}, l)}
        function j(){equal("@a\n  #b\n    :c d", "@a {\n  #b {\n    c: d; } }\n", {syntax: 'sass'}, k)}
        function i(){equal("@a\n  :b c\n  :d e", "@a{b:c;d:e}\n", {style: 'compressed', syntax: 'sass'}, j)}
        function h(){equal("@a\n  :b c\n  :d e", "@a {\n  b: c;\n  d: e;\n}\n", {style: 'expanded', syntax: 'sass'}, i)}
        function g(){equal("@a\n  :b c\n  :d e", "@a { b: c; d: e; }\n", {style: 'compact', syntax: 'sass'}, h)}
        function f(){equal("@a\n  :b c\n  :d e", "@a {\n  b: c;\n  d: e; }\n", {syntax: 'sass'}, g)}
        function e(){equal("@a\n  :b c", "@a{b:c}\n", {style: 'compressed', syntax: 'sass'}, f)}
        function d(){equal("@a\n  :b c", "@a {\n  b: c;\n}\n", {style: 'expanded', syntax: 'sass'}, e)}
        function c(){equal("@a\n  :b c", "@a { b: c; }\n", {style: 'compact', syntax: 'sass'}, d)}
        function b(){equal("@a\n  :b c", "@a {\n  b: c; }\n", {syntax: 'sass'}, c)}
        equal("@a b", "@a b;\n", {syntax: 'sass'}, b)
      })

      it('test_property_hacks', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L779-L799
        // v3.1.0

        var css = "foo {\n  _name: val;\n  *name: val;\n  #name: val;\n  .name: val;\n  name/**/: val;\n  name/*\\**/: val;\n  name: val; }\n";
        var scss = "foo\n  _name: val\n  *name: val\n  #name: val\n  .name: val\n  name/**/: val\n  name/*\\**/: val\n  name: val\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_properties_with_space_after_colon', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L801-L811
        // v3.1.0

        var css = "foo {\n  bar: baz;\n  bizz: bap; }\n";
        var scss = "foo\n  bar : baz\n  bizz\t: bap\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_line_annotations', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L801-L811
        // v3.1.0

        var css = "/* line 2, test_line_annotations_inline.sass */\nfoo bar { foo: bar; }\n/* line 5, test_line_annotations_inline.sass */\nfoo baz { blip: blop; }\n\n/* line 9, test_line_annotations_inline.sass */\nfloodle { flop: blop; }\n\n/* line 18, test_line_annotations_inline.sass */\nbup { mix: on; }\n/* line 15, test_line_annotations_inline.sass */\nbup mixin { moop: mup; }\n\n/* line 22, test_line_annotations_inline.sass */\nbip hop, skip hop { a: b; }\n";
        var scss = "foo\n  bar\n    foo: bar\n\n  baz\n    blip: blop\n\n\nfloodle\n\n  flop: blop\n\n=mxn\n  mix: on\n  mixin\n    moop: mup\n\nbup\n  +mxn\n\nbip, skip\n  hop\n    a: b\n";
        equal(scss, css, {style: 'compact', line_comments: true, syntax: 'sass', filename: 'test_line_annotations_inline.sass'}, done)
      })

      it('test_empty_first_line', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L940-L942
        // v3.1.0

        var css = "#a {\n  b: c; }\n"
          var scss = "#a\n\n  b: c"
          equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_escaped_rule', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L944-L947
        // v3.1.0

        function second() {
          var css = ":focus {\n  a: b; }\n"
            var scss = "\\:focus\n  a: b"
            equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = "a {\n  b: c; }\n  a :focus {\n    d: e; }\n"
          var scss = "\\a\n  b: c\n  \\:focus\n    d: e"
          equal(scss, css, {syntax: 'sass'}, second)
      })

      it('test_cr_newline', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L949-L951
        // v3.1.0

        var css = "foo {\n  a: b;\n  c: d;\n  e: f; }\n"
          var scss = "foo\r  a: b\r\n  c: d\n\r  e: f"
          equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_property_with_content_and_nested_props', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L953-L976
        // v3.1.0

        function second() {
          var css = "foo {\n  a: b;\n    a-c-e: f; }\n";
          var scss = "foo\n  a: b\n    c:\n      e: f\n";
          equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = "foo {\n  a: b;\n    a-c: d;\n      a-c-e: f; }\n";
        var scss = "foo\n  a: b\n    c: d\n      e: f\n";
        equal(scss, css, {syntax: 'sass'}, second)
      })

      it('test_guarded_assign', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L978-L981
        // v3.1.0

        function second() {
          var css = "foo {\n  a: b; }\n"
            var scss = "$foo: b !default\nfoo\n  a: $foo"
            equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = "foo {\n  a: b; }\n"
          var scss = "$foo: b\n$foo: c !default\nfoo\n  a: $foo"
          equal(scss, css, {syntax: 'sass'}, second)
      })

      it('test_directive_style_mixins', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L987-L998
        // v3.1.0

        var css = "bar {\n  prop: baz; }\n";
        var scss = "@mixin foo($arg)\n  prop: $arg\nbar\n  @include foo(baz)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_mixins_dont_interfere_with_sibling_combinator', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1000-L1003
        // v3.1.0

        var css = "foo + bar {\n  a: b; }\nfoo + baz {\n  c: d; }\n"
          var scss = "foo\n  +\n    bar\n      a: b\n    baz\n      c: d"
          equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_mixin_args', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1005-L1028
        // v3.1.0

        function third() {
          var css = "blat {\n  baz: 4;\n  baz: 3;\n  baz: 5;\n  bang: 3; }\n"
            var scss = "=foo($c: (6 + 4) / 2)\n  baz: $c\n$c: 3\nblat\n  +foo($c + 1)\n  +foo(($c + 3)/2)\n  +foo\n  bang: $c\n";
          equal(scss, css, {syntax: 'sass'}, done)
        }

        function second() {
          var css = "blat {\n  baz: 3; }\n";
          var scss = "=foo($a, $b)\n  baz: $a + $b\nblat\n  +foo(1, 2)\n";
          equal(scss, css, {syntax: 'sass'}, third)
        }

        var css = "blat {\n  baz: hi; }\n";
        var scss = "=foo($bar)\n  baz: $bar\nblat\n  +foo(hi)\n";
        equal(scss, css, {syntax: 'sass'}, second)
      })


      it('test_hyphen_underscore_insensitive_mixins', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1069-L1085
        // v3.1.0

        var css = "a {\n  b: 12;\n  c: foo; }\n";
        var scss = "=mixin-hyphen\n  b: 12\n=mixin_under\n  c: foo\na\n  +mixin_hyphen\n  +mixin-under\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_css_identifier_mixin', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1087-L1098
        // v3.1.0

        var css = "a {\n  foo: 12; }\n";
        var scss = "=\\{foo\\(12\\)($a)\n  foo: $a\n\na\n  +\\{foo\\(12\\)(12)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_basic_function', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1100-L1111
        // v3.1.0

        var css = "bar {\n  a: 3; }\n";
        var scss = "@function foo()\n  @return 1 + 2\n\nbar\n  a: foo()\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_function_args', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1113-L1124
        // v3.1.0

        var css = "bar {\n  a: 3; }\n";
        var scss = "@function plus($var1, $var2)\n  @return $var1 + $var2\nbar\n  a: plus(1, 2)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_function_arg_default', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1126-L1137
        // v3.1.0

        var css = "bar {\n  a: 3; }\n";
        var scss = "@function plus($var1, $var2: 2)\n  @return $var1 + $var2\nbar\n  a: plus(1)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_function_arg_keyword', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1139-L1150
        // v3.1.0

        var css = "bar {\n  a: 1bar; }\n";
        var scss = "@function plus($var1: 1, $var2: 2)\n  @return $var1 + $var2\nbar\n  a: plus($var2: bar)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_function_with_if', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1152-L1168
        // v3.1.0

        var css = "bar {\n  a: foo;\n  b: bar; }\n";
        var scss = "@function my-if($cond, $val1, $val2)\n  @if $cond\n    @return $val1\n  @else\n    @return $val2\nbar\n  a: my-if(true, foo, bar)\n  b: my-if(false, foo, bar)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_function_with_var', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1170-L1182
        // v3.1.0

        var css = "bar {\n  a: 1; }\n";
        var scss = "@function foo($val1, $val2)\n  $intermediate: $val1 + $val2\n  @return $intermediate/3\nbar\n  a: foo(1, 2)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1184-L1192
        // v3.1.0

        var css = "a-1 {\n  b-2-3: c-3; }\n"
          var scss = "$a: 1\n$b: 2\n$c: 3\na-#{$a}\n  b-#{$b}-#{$c}: c-#{$a + $b}\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_complex_property_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1194-L1205
        // v3.1.0

        var css = "a-1 {\n  b-2 3-fizzap18: c-3; }\n";
        var scss = "$a: 1\n$b: 2\n$c: 3\na-#{$a}\n  b-#{$b $c}-#{fizzap + ($c + 15)}: c-#{$a + $b}\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_if_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1207-L1216
        // v3.1.0

        var css = "a {\n  b: 1; }\n"
          var scss = "$var: true\na\n  @if $var\n    b: 1\n  @if not $var\n    b: 2\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_for', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1218-L1253
        // v3.1.0

        var css = "a-0 {\n  two-i: 0; }\n\na-1 {\n  two-i: 2; }\n\na-2 {\n  two-i: 4; }\n\na-3 {\n  two-i: 6; }\n\nb-1 {\n  j-1: 0; }\n\nb-2 {\n  j-1: 1; }\n\nb-3 {\n  j-1: 2; }\n\nb-4 {\n  j-1: 3; }\n";
        var scss = "$a: 3\n@for $i from 0 to $a + 1\n  a-#{$i}\n    two-i: 2 * $i\n@for $j from 1 through 4\n  b-#{$j}\n    j-1: $j - 1\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_else', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1280-L1318
        // v3.1.0

        var css = "a {\n  t1: t;\n  t2: t;\n  t3: t;\n  t4: t; }\n";
        var scss = "a\n  @if true\n    t1: t\n  @else\n    f1: f\n  @if false\n    f2: f\n  @else\n    t2: t\n  @if false\n    f3: f1\n  @else if 1 + 1 == 3\n    f3: f2\n  @else\n    t3: t\n  @if false\n    f4: f1\n  @else if 1 + 1 == 2\n    t4: t\n  @else\n    f4: f2\n  @if false\n    f5: f1\n  @else if false\n    f5: f2\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_each', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1320-L1341
        // v3.1.0

        var css = "a {\n  b: 1px;\n  b: 2px;\n  b: 3px;\n  b: 4px;\n  c: foo;\n  c: bar;\n  c: baz;\n  c: bang;\n  d: blue; }\n";
        var scss = "a\n  @each $number in 1px 2px 3px 4px\n    b: $number\n  @each $str in foo, bar, baz, bang\n    c: $str\n  @each $single in blue\n    d: $single\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_css_identifier_variable', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1405-L1415
        // v3.1.0

        var css = "a {\n  b: 12; }\n";
        var scss = "$\\{foo\\(12\\): 12\na\n  b: $\\{foo\\(12\\)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_important', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1417-L1426
        // v3.1.0

        var css = "a {\n  b: 12px !important; }\n";
        var scss = "$foo: 12px\na\n  b: $foo !important\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_argument_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1428-L1430
        // v3.1.0

        sassBuilder({css: "a\n  b: hsl(1)", options: {syntax: 'sass'}}, function(result) {
          expect(result.err).to.not.be(undefined)
            expect(result.css).to.be(undefined)
            done()
        })
      })

      it('test_comments_at_the_top_of_a_document', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1432-L1440
        // v3.1.0

        var css = "foo {\n  bar: baz; }\n";
        var scss = "//\n  This is a comment that\n  continues to the second line.\nfoo\n  bar: baz\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_loud_comments_containing_a_comment_close', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1442-L1456
        // v3.1.0

        var css = "/* This is a comment that\n * continues to the second line. */\nfoo {\n  bar: baz; }\n";
        var scss = "/*\n  This is a comment that\n  continues to the second line. */\nfoo\n  bar: baz\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_loud_comments_with_starred_lines', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1458-L1468
        // v3.1.0

        var css = "/* This is a comment that\n * continues to the second line.\n * And even to the third! */\n";
        var scss = "/* This is a comment that\n * continues to the second line.\n * And even to the third!\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_loud_comments_with_no_space_after_starred_lines', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1470-L1480
        // v3.1.0

        var css = "/*bip bop\n *beep boop\n *bap blimp */\n";
        var scss = "/*bip bop\n *beep boop\n *bap blimp\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_comment_indentation_at_beginning_of_doc', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1482-L1496
        // v3.1.0

        var css = "/* foo\n * bar\n *   baz */\nfoo {\n  a: b; }\n";
        var scss = "/* foo\n   bar\n     baz\nfoo\n  a: b\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_unusual_comment_indentation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1498-L1510
        // v3.1.0

        var css = "foo {\n  /* foo\n   * bar\n   *   baz */ }\n";
        var scss = "foo\n  /* foo\n     bar\n       baz\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_loud_comment_with_close', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1512-L1522
        // v3.1.0

        var css = "foo {\n  /* foo\n   * bar */ }\n";
        var scss = "foo\n  /* foo\n     bar */\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_loud_comment_with_separate_line_close', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1524-L1536
        // v3.1.0

        var css = "foo {\n  /* foo\n   * bar\n   */ }\n";
        var scss = "foo\n  /* foo\n   * bar\n   */\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_attribute_selector_with_spaces', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1579-L1588
        // v3.1.0

        var css = "a b[foo=bar] {\n  c: d; }\n";
        var scss = "a\n  b[foo = bar]\n    c: d\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_quoted_colon', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1590-L1599
        // v3.1.0

        var css = "a b[foo=\"bar: baz\"] {\n  c: d; }\n";
        var scss = "a\n  b[foo=\"bar: baz\"]\n    c: d\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_quoted_comma', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1601-L1610
        // v3.1.0

        var css = "a b[foo=\"bar, baz\"] {\n  c: d; }\n";
        var scss = "a\n  b[foo=\"bar, baz\"]\n    c: d\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_quoted_ampersand', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1612-L1621
        // v3.1.0

        var css = "a b[foo=\"bar & baz\"] {\n  c: d; }\n";
        var scss = "a\n  b[foo=\"bar & baz\"]\n    c: d\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_empty_selector_warning', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1623-L1628
        // v3.1.0

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('WARNING on line 1 of test_empty_selector_warning_inline.sass:\\nThis selector doesn\\'t have any properties and will not be rendered.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)

              done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({css: "foo bar", options: {syntax: 'sass', filename: 'test_empty_selector_warning_inline.sass'}}, third)
        }

        // since the tests run in the worker, we have to inject sinon and wrap the console there, rather than in this context. Rather than bloat up the shipping code,
        // or ship code thats different than what we test, we eval it in
        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })

      it('test_root_level_pseudo_class_with_new_properties', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1630-L1638
        // v3.1.0

        var css = ":focus {\n  outline: 0; }\n";
        var scss = ":focus\n  outline: 0\n";
        equal(scss, css, {syntax: 'sass', property_syntax: 'new'}, done)
      })

      it('test_pseudo_class_with_new_properties', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1640-L1649
        // v3.1.0

        var css = "p :focus {\n  outline: 0; }\n";
        var scss = "p\n  :focus\n    outline: 0\n";
        equal(scss, css, {syntax: 'sass', property_syntax: 'new'}, done)
      })

      it('test_nil_option', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1640-L1649
        // v3.1.0

        var css = "foo {\n  a: b; }\n";
        var scss = "foo\n  a: b\n";
        equal(scss, css, {syntax: 'sass', format: null}, done)
      })

      it('test_interpolation_in_raw_functions', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1661-L1669
        // v3.1.0

        var css = "foo {\n  filter: progid:Microsoft.foo.bar.Baz(flip=foobar, bang=#00ff00cc); }\n";
        var scss = "foo\n  filter: progid:Microsoft.foo.bar.Baz(flip=\#{foo + bar}, bang=#00ff00cc)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_plus_preserves_quotedness', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1673-L1691
        // v3.1.0

        var css = "foo {\n  a: \"foo1\";\n  b: \"1foo\";\n  c: foo1;\n  d: 1foo;\n  e: \"foobar\";\n  f: foobar; }\n";
        var scss = "foo\n  a: \"foo\" + 1\n  b: 1 + \"foo\"\n  c: foo + 1\n  d: 1 + foo\n  e: \"foo\" + bar\n  f: foo + \"bar\"\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_colon_properties_preserve_quotedness', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1693-L1707
        // v3.1.0

        var css = "foo {\n  a: \"foo\";\n  b: bar;\n  c: \"foo\" bar;\n  d: foo, \"bar\"; }\n";
        var scss = "foo\n  a: \"foo\"\n  b: bar\n  c: \"foo\" bar\n  d: foo, \"bar\"\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_colon_variables_preserve_quotedness', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1709-L1722
        // v3.1.0

        var css = "foo {\n  a: \"foo\";\n  b: bar; }\n";
        var scss = "$a: \"foo\"\n$b: bar\n\nfoo\n  a: $a\n  b: $b\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_colon_args_preserve_quotedness', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1724-L1741
        // v3.1.0

        var css = "foo {\n  a: \"foo\";\n  b: bar;\n  c: \"foo\" bar;\n  d: foo, \"bar\"; }\n";
        var scss = "=foo($a: \"foo\", $b: bar, $c: \"foo\" bar, $d: (foo, \"bar\"))\n  foo\n    a: $a\n    b: $b\n    c: $c\n    d: $d\n+foo\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_interpolation_unquotes_strings', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1743-L1759
        // v3.1.0

        function second() {
          var css = ".foo {\n  a: b c; }\n";
          var scss = ".foo\n  a: b #{\"c\"}\n";
          equal(scss, css, {syntax: 'sass'}, done)
        }

        var css = ".foo-bar {\n  a: b; }\n";
        var scss = ".foo-\#{\"bar\"}\n  a: b\n";
        equal(scss, css, {syntax: 'sass'}, second)
      })

      it('test_interpolation_unquotes_strings_in_vars', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1761-L1771
        // v3.1.0

        var css = ".foo-bar {\n  a: b; }\n";
        var scss = "$var: \"bar\"\n\n.foo-#{$var}\n  a: b\n";
        equal(scss, css, {syntax: 'sass'}, done)
      })

      it('test_warn_directive_when_quiet', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1808-L1815
        // v3.1.0

        function third() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)
              done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined)
            var css = ""
            var scss = "@warn \"this is a warning\"\n";
          equal(scss, css, {syntax: 'sass', quiet: true}, third)
        }

        // since the tests run in the worker, we have to inject sinon and wrap the console there, rather than in this context. Rather than bloat up the shipping code,
        // or ship code thats different than what we test, we eval it in
        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })

      //TODO we do not support imports currently. PRs welcome!
      it.skip('test_warn_with_imports', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1817-L1833
        // v3.1.0
      })

      it('test_media_bubbling', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L307-L334
        // v3.1.0

        function third() {
          var css = ".foo {\n  a: b;\n}\n@media bar {\n  .foo {\n    c: d;\n  }\n}\n.foo .baz {\n  e: f;\n}\n@media bip {\n  .foo .baz {\n    g: h;\n  }\n}\n\n.other {\n  i: j;\n}\n";
          var scss = ".foo\n  a: b\n  @media bar\n    c: d\n  .baz\n    e: f\n    @media bip\n      g: h\n\n.other\n  i: j\n";
          equal(scss, css, {syntax: 'sass', style: 'expanded'}, done)
        }

        function second() {
          var css = ".foo { a: b; }\n@media bar { .foo { c: d; } }\n.foo .baz { e: f; }\n@media bip { .foo .baz { g: h; } }\n\n.other { i: j; }\n";
          var scss = ".foo\n  a: b\n  @media bar\n    c: d\n  .baz\n    e: f\n    @media bip\n      g: h\n\n.other\n  i: j\n";
          equal(scss, css, {syntax: 'sass', style: 'compact'}, third)
        }

        var css = ".foo {\n  a: b; }\n  @media bar {\n    .foo {\n      c: d; } }\n  .foo .baz {\n    e: f; }\n    @media bip {\n      .foo .baz {\n        g: h; } }\n\n.other {\n  i: j; }\n";
        var scss = ".foo\n  a: b\n  @media bar\n    c: d\n  .baz\n    e: f\n    @media bip\n      g: h\n\n.other\n  i: j\n";
        equal(scss, css, {syntax: 'sass'}, second)
      });

      it('test_rule_media_rule_bubbling', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1949-L1965
        // v3.1.0

        var css = "@media bar {\n  .foo {\n    a: b;\n    e: f; }\n    .foo .baz {\n      c: d; } }\n";
        var scss = ".foo\n  @media bar\n    a: b\n    .baz\n      c: d\n    e: f\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_media_with_parent_references', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1994-L2007
        // v3.1.0

        var css = "@media print {\n  .outside.inside {\n    border: 1px solid black; } }\n";
        var scss = ".outside\n  @media print\n    &.inside\n      border: 1px solid black\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_parens_in_mixins', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2011-L2024
        // v3.1.0

        var css = ".foo {\n  color: #01ff7f;\n  background-color: #000102; }\n";
        var scss = "=foo($c1, $c2: rgb(0, 1, 2))\n  color: $c1\n  background-color: $c2\n\n.foo\n  +foo(rgb(1,255,127))\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_comment_beneath_prop', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2026-L2056
        // v3.1.0

        function third() {
          var css = ".box{border-style:solid}\n";
          var scss = ".box\n  :border\n    /*:color black\n    :style solid\n";
          equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
        }

        function second() {
          var css = ".box {\n  /* :color black */\n  border-style: solid; }\n";
          var scss = ".box\n  :border\n    /* :color black\n    :style solid\n";
          equal(scss, css, {syntax: 'sass'}, third)
        }

        var css = ".box {\n  border-style: solid; }\n";
        var scss = ".box\n  :border\n    //:color black\n    :style solid\n";
        equal(scss, css, {syntax: 'sass'}, second)
      });

      it('test_compressed_comment_beneath_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2058-L2066
        // v3.1.0

        var css = "@foo{a:b}\n";
        var scss = "@foo\n  a: b\n  /*b: c\n";
        equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_comment_with_crazy_indentation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2068-L2084
        // v3.1.0

        var css = "/* This is a loud comment:\n *          Where the indentation is wonky. */\n.comment {\n  width: 1px; }\n";
        var scss = "/*\n  This is a loud comment:\n           Where the indentation is wonky.\n//\n  This is a silent comment:\n           Where the indentation is wonky.\n.comment\n  width: 1px\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_plus_with_space', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2086-L2095
        // v3.1.0

        var css = "a + b {\n  color: green; }\n";
        var scss = "a\n  + b\n    color: green\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_empty_line_comment', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2097-L2108
        // v3.1.0

        var css = "/* Foo\n *\n * Bar */\n";
        var scss = "/*\n  Foo\n\n  Bar\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_empty_comment', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2110-L2122
        // v3.1.0

        var css = "/* */\na {\n  /* */\n  b: c; }\n";
        var scss = "/*\na\n  /*\n  b: c\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_mixin_no_arg_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2134-L2141
        // v3.1.0

        sassBuilder({css: "=foo($bar,)\n  bip: bap\n", options: {syntax: 'sass'}}, function(result) {
          expect(result.err).to.not.be(undefined)
            expect(result.css).to.be(undefined)
            done()
        })
      })

      it('test_import_with_commas_in_url', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2143-L2149
        // v3.1.0

        var css = "@import url(foo.css?bar,baz);\n";
        var scss = "@import url(foo.css?bar,baz)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_mixin_with_keyword_arg_variable_value', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2167-L2182
        // v3.1.0

        var css = ".mixed {\n  required: foo;\n  arg1: default-val1;\n  arg2: a-value; }\n";
        var scss = "=a-mixin($required, $arg1: default-val1, $arg2: default-val2)\n  required: $required\n  arg1: $arg1\n  arg2: $arg2\n.mixed\n  $a-value: a-value\n  +a-mixin(foo, $arg2: $a-value)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_mixin_keyword_args_handle_variable_underscore_dash_equivalence', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2184-L2198
        // v3.1.0

        var css = ".mixed {\n  required: foo;\n  arg1: non-default-val1;\n  arg2: non-default-val2; }\n";
        var scss = "=a-mixin($required, $arg-1: default-val1, $arg_2: default-val2)\n  required: $required\n  arg1: $arg_1\n  arg2: $arg-2\n.mixed\n  +a-mixin(foo, $arg-2: non-default-val2, $arg_1: non-default-val1)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_passing_required_args_as_a_keyword_arg', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2200-L2214
        // v3.1.0

        var css = ".mixed {\n  required: foo;\n  arg1: default-val1;\n  arg2: default-val2; }\n";
        var scss = "=a-mixin($required, $arg1: default-val1, $arg2: default-val2)\n  required: $required\n  arg1: $arg1\n  arg2: $arg2\n.mixed\n  +a-mixin($required: foo)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_passing_all_as_keyword_args_in_opposite_order', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2200-L2214
        // v3.1.0

        var css = ".mixed {\n  required: foo;\n  arg1: non-default-val1;\n  arg2: non-default-val2; }\n";
        var scss = "=a-mixin($required, $arg1: default-val1, $arg2: default-val2)\n  required: $required\n  arg1: $arg1\n  arg2: $arg2\n.mixed\n  +a-mixin($arg2: non-default-val2, $arg1: non-default-val1, $required: foo)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_function_output_with_comma', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2232-L2240
        // v3.1.0

        var css = "foo {\n  a: b(c), d(e); }\n";
        var scss = "foo\n  a: b(c), d(e)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_interpolation_with_comma', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2242-L2251
        // v3.1.0

        var css = "foo {\n  a: foo, bar; }\n";
        var scss = "$foo: foo\nfoo\n  a: #{$foo}, bar\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_string_interpolation_with_comma', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2253-L2262
        // v3.1.0

        var css = "foo {\n  a: \"bip foo bap\", bar; }\n";
        var scss = "$foo: foo\nfoo\n  a: \"bip #{$foo} bap\", bar\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      it('test_unknown_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2264-L2272
        // v3.1.0

        var css = "@baz {\n  c: d; }\n";
        var scss = "@baz\n  c: d\n";
        equal(scss, css, {syntax: 'sass'}, done)
      });

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_encoding_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2299-L2305
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_ascii_incompatible_encoding_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2307-L2315
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_same_charset_as_encoding', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2317-L2327
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_different_charset_than_encoding', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2329-L2339
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_different_encoding_than_system', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2341-L2350
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_multibyte_charset', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2352-L2362
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_multibyte_charset_without_endian_specifier', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2364-L2374
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_utf8_bom', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2376-L2385
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_utf16le_bom', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2387-L2396
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_utf32be_bom', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2398-L2408
        // v3.1.0
      })

      //TODO we do not support encoding currently. PRs welcome!
      it.skip('test_original_filename_set', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2410-L2421
        // v3.1.0
      })

      it('test_hsl_kwargs', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L73-L75
        // v3.1.0
        eval_equal(func_parse("hsl($hue: 180, $saturation: 60%, $lightness: 50%)"), '"#33cccc"', {}, done)
      });

      it('test_hsla', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L88-L93
        // v3.1.0
        function fourth() { eval_equal(func_parse("hsla($hue: 180, $saturation: 60%, $lightness: 50%, $alpha: 0.4)"), '"rgba(51, 204, 204, 0.4)"', {}, done) }
        function third() { eval_equal(func_parse("hsla(180, 60%, 50%, 0)"), '"rgba(51, 204, 204, 0)"', {}, fourth) }
        function second() { eval_equal(func_parse("hsla(180, 60%, 50%, 1)"), '"#33cccc"', {}, third) }
        eval_equal(func_parse("hsla(180, 60%, 50%, 0.4)"), '"rgba(51, 204, 204, 0.4)"', {}, second)
      });

      it('test_rgba', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L199-L204
        // v3.1.0

        function fourth() {eval_equal(func_parse("rgba($red: 0, $green: 255, $blue: 127, $alpha: 0)"), '"rgba(0, 255, 127, 0)"', {}, done)}
        function third() {eval_equal(func_parse("rgba(0, 255, 127, 0)"), '"rgba(0, 255, 127, 0)"', {}, fourth)}
        function second() { eval_equal(func_parse("rgba(190, 173, 237, 1)"), '"#beaded"', {}, third) }
        eval_equal(func_parse("rgba(18, 52, 86, 0.5)"), '"rgba(18, 52, 86, 0.5)"', {}, second)
      });

      it('test_rgba_tests_types', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L230-L234
        // v3.1.0

        function third() {eval_equal(func_parse('rgba(#102030, 0.5)'), '"rgba(16, 32, 48, 0.5)"', {}, done)}
        function second() { eval_equal(func_parse('rgba(blue, 0.5)'), '"rgba(0, 0, 255, 0.5)"', {}, third) }
        eval_equal(func_parse('rgba($color: blue, $alpha: 0.5)'), '"rgba(0, 0, 255, 0.5)"', {}, second)
      });

      it('test_rgba_tests_num_args', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L241-L246
        // v3.1.0

        function fourth() {eval_err(func_parse('rgba(1, 2, 3, 0.4, 5)'), 'wrong number of arguments (5 for 4)', {}, done)}
        function third() {eval_err(func_parse('rgba(1, 2, 3)'), 'wrong number of arguments (3 for 4)', {}, fourth)}
        function second() { eval_err(func_parse('rgba(blue)'), 'wrong number of arguments (1 for 4)', {}, third) }
        eval_err(func_parse('rgba()'), 'wrong number of arguments (0 for 4)', {}, second)
      });

      it('test_red', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L248-L251
        // v3.1.0

        function second() { eval_equal(func_parse("red(#123456)"), '"18"', {}, done) }
        eval_equal(func_parse("red($color: #123456)"), '"18"', {}, second)
      });

      it('test_green', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L257-L260
        // v3.1.0

        function second() { eval_equal(func_parse("green(#123456)"), '"52"', {}, done) }
        eval_equal(func_parse("green($color: #123456)"), '"52"', {}, second)
      });

      it('test_blue', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L266-L269
        // v3.1.0

        function second() { eval_equal(func_parse("blue(#123456)"), '"86"', {}, done) }
        eval_equal(func_parse("blue($color: #123456)"), '"86"', {}, second)
      });

      it('test_hue', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L275-L278
        // v3.1.0

        function second() { eval_equal(func_parse("hue(hsl(18, 50%, 20%))"), '"18deg"', {}, done) }
        eval_equal(func_parse("hue($color: hsl(18, 50%, 20%))"), '"18deg"', {}, second)
      });

      it('test_hue_exception', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L280-L282
        // v3.1.0

        eval_err(func_parse('hue(12)'), "12 is not a color", {}, done);
      });

      it('test_saturation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L284-L288
        // v3.1.0

        function third() { eval_equal(func_parse("saturation($color: hsl(20, 52, 20%))"), '"52%"', {}, done) }
        function second() { eval_equal(func_parse("saturation(hsl(20, 52, 20%))"), '"52%"', {}, third) }
        eval_equal(func_parse("saturation(hsl(20, 52%, 20%))"), '"52%"', {}, second)
      });

      it('test_lightness', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L294-L298
        // v3.1.0

        function third() { eval_equal(func_parse("lightness($color: hsl(120, 50%, 86%))"), '"86%"', {}, done) }
        function second() { eval_equal(func_parse("lightness(hsl(120, 50%, 86%))"), '"86%"', {}, third) }
        eval_equal(func_parse("lightness($color: hsl(120, 50%, 86))"), '"86%"', {}, second)
      });

      it('test_alpha', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L304-L309
        // v3.1.0

        function fourth() { eval_equal(func_parse("alpha(#123456)"), '"1"', {}, done) }
        function third() { eval_equal(func_parse("alpha(rgba(0, 1, 2, 0.34))"), '"0.34"', {}, fourth) }
        function second() { eval_equal(func_parse("alpha(hsla(0, 1, 2, 0))"), '"0"', {}, third) }
        eval_equal(func_parse("alpha($color: hsla(0, 1, 2, 0))"), '"0"', {}, second)
      });

      it('test_opacify', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L315-L324
        // v3.1.0

        function eigth() { eval_equal(func_parse("fade-in($color: rgba(0, 0, 0, 0.2), $amount: 0%)"), '"rgba(0, 0, 0, 0.2)"', {}, done) }
        function seventh() { eval_equal(func_parse("opacify($color: rgba(0, 0, 0, 0.2), $amount: 0%)"), '"rgba(0, 0, 0, 0.2)"', {}, eigth) }
        function sixth() { eval_equal(func_parse("opacify(rgba(0, 0, 0, 0.2), 0%)"), '"rgba(0, 0, 0, 0.2)"', {}, seventh) }
        function fifth() { eval_equal(func_parse("opacify(rgba(0, 0, 0, 0.2), 1)"), '"black"', {}, sixth) }
        function fourth() { eval_equal(func_parse("fade_in(rgba(0, 0, 0, 0.2), 0.8)"), '"black"', {}, fifth) }
        function third() { eval_equal(func_parse("fade-in(rgba(0, 0, 0, 0.2), 0.5px)"), '"rgba(0, 0, 0, 0.7)"', {}, fourth) }
        function second() { eval_equal(func_parse("opacify(rgba(0, 0, 0, 0.2), 0.1)"), '"rgba(0, 0, 0, 0.3)"', {}, third) }
        eval_equal(func_parse("opacify(rgba(0, 0, 0, 0.5), 0.25)"), '"rgba(0, 0, 0, 0.75)"', {}, second)
      });

      it('test_opacify_tests_bounds', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L326-L331
        // v3.1.0

        function second() {eval_err(func_parse('opacify(rgba(0, 0, 0, 0.2), 1.001)'), "Amount 1.001 must be between 0 and 1", {}, done)}
        eval_err(func_parse('opacify(rgba(0, 0, 0, 0.2), -0.001)'), "Amount -0.001 must be between 0 and 1", {}, second);
      });

      it('test_transparentize_tests_bounds', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L349-L354
        // v3.1.0

        function second() {eval_err(func_parse('transparentize(rgba(0, 0, 0, 0.2), -0.001)'), "Amount -0.001 must be between 0 and 1", {}, done)}
        eval_err(func_parse('transparentize(rgba(0, 0, 0, 0.2), 1.001)'), "Amount 1.001 must be between 0 and 1", {}, second);
      });

      it('test_lighten', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L361-L369
        // v3.1.0

        function seventh() { eval_equal(func_parse("lighten(hsl(0, 0, 0), 30%)"), '"#4d4d4d"', {}, done) }
        function sixth() { eval_equal(func_parse("lighten(#800, 20%)"), '"#ee0000"', {}, seventh) }
        function fifth() { eval_equal(func_parse("lighten(#fff, 20%)"), '"white"', {}, sixth) }
        function fourth() { eval_equal(func_parse("lighten(#800, 100%)"), '"white"', {}, fifth) }
        function third() { eval_equal(func_parse("lighten(#800, 0%)"), '"#880000"', {}, fourth) }
        function second() { eval_equal(func_parse("lighten(rgba(136, 0, 0, 0.5), 20%)"), '"rgba(238, 0, 0, 0.5)"', {}, third) }
        eval_equal(func_parse("lighten($color: rgba(136, 0, 0, 0.5), $amount: 20%)"), '"rgba(238, 0, 0, 0.5)"', {}, second)
      });

      it('test_lighten_tests_bounds', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L371-L376
        // v3.1.0

        function second() {eval_err(func_parse('lighten(#123, -0.001)'), "Amount -0.001 must be between 0% and 100%", {}, done)}
        eval_err(func_parse('lighten(#123, 100.001)'), "Amount 100.001 must be between 0% and 100%", {}, second);
      });

      it('test_darken', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L383-L391
        // v3.1.0

        function seventh() { eval_equal(func_parse("darken(hsl(25, 100, 80), 30%)"), '"#ff6a00"', {}, done) }
        function sixth() { eval_equal(func_parse("darken(#800, 20%)"), '"#220000"', {}, seventh) }
        function fifth() { eval_equal(func_parse("darken(#000, 20%)"), '"black"', {}, sixth) }
        function fourth() { eval_equal(func_parse("darken(#800, 100%)"), '"black"', {}, fifth) }
        function third() { eval_equal(func_parse("darken(#800, 0%)"), '"#880000"', {}, fourth) }
        function second() { eval_equal(func_parse("darken(rgba(136, 0, 0, 0.5), 20%)"), '"rgba(34, 0, 0, 0.5)"', {}, third) }
        eval_equal(func_parse("darken($color: rgba(136, 0, 0, 0.5), $amount: 20%)"), '"rgba(34, 0, 0, 0.5)"', {}, second)
      });

      it('test_darken_tests_bounds', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L393-L398
        // v3.1.0

        function second() {eval_err(func_parse('darken(#123, -0.001)'), "Amount -0.001 must be between 0% and 100%", {}, done)}
        eval_err(func_parse('darken(#123, 100.001)'), "Amount 100.001 must be between 0% and 100%", {}, second);
      });

      it('test_saturate', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L405-L414
        // v3.1.0

        function eight() { eval_equal(func_parse("saturate($color: rgba(136, 85, 85, 0.5), $amount: 20%)"), '"rgba(158, 63, 63, 0.5)"', {}, done) }
        function seventh() { eval_equal(func_parse("saturate(hsl(120, 30, 90), 20%)"), '"#d9f2d9"', {}, eight) }
        function sixth() { eval_equal(func_parse("saturate(#855, 20%)"), '"#9e3f3f"', {}, seventh) }
        function fifth() { eval_equal(func_parse("saturate(#000, 20%)"), '"black"', {}, sixth) }
        function fourth() { eval_equal(func_parse("saturate(#fff, 20%)"), '"white"', {}, fifth) }
        function third() { eval_equal(func_parse("saturate(#8a8, 100%)"), '"#33ff33"', {}, fourth) }
        function second() { eval_equal(func_parse("saturate(#8a8, 0%)"), '"#88aa88"', {}, third) }
        eval_equal(func_parse("saturate(rgba(136, 85, 85, 0.5), 20%)"), '"rgba(158, 63, 63, 0.5)"', {}, second)
      });

      it('test_saturate_tests_bounds', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L416-L421
        // v3.1.0

        function second() {eval_err(func_parse('saturate(#123, -0.001)'), "Amount -0.001 must be between 0% and 100%", {}, done)}
        eval_err(func_parse('saturate(#123, 100.001)'), "Amount 100.001 must be between 0% and 100%", {}, second);
      });

      it('test_desaturate', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L428-L437
        // v3.1.0

        function eight() { eval_equal(func_parse("desaturate(hsl(120, 30, 90), 20%)"), '"#e3e8e3"', {}, done) }
        function seventh() { eval_equal(func_parse("desaturate(#855, 20%)"), '"#726b6b"', {}, eight) }
        function sixth() { eval_equal(func_parse("desaturate(#000, 20%)"), '"black"', {}, seventh) }
        function fifth() { eval_equal(func_parse("desaturate(#fff, 20%)"), '"white"', {}, sixth) }
        function fourth() { eval_equal(func_parse("desaturate(#8a8, 100%)"), '"#999999"', {}, fifth) }
        function third() { eval_equal(func_parse("desaturate(#8a8, 0%)"), '"#88aa88"', {}, fourth) }
        function second() { eval_equal(func_parse("desaturate(rgba(136, 85, 85, 0.5), 20%)"), '"rgba(114, 107, 107, 0.5)"', {}, third) }
        eval_equal(func_parse("desaturate($color: rgba(136, 85, 85, 0.5), $amount: 20%)"), '"rgba(114, 107, 107, 0.5)"', {}, second)
      });

      it('test_desaturate_tests_bounds', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L439-L444
        // v3.1.0

        function second() {eval_err(func_parse('desaturate(#123, -0.001)'), "Amount -0.001 must be between 0% and 100%", {}, done)}
        eval_err(func_parse('desaturate(#123, 100.001)'), "Amount 100.001 must be between 0% and 100%", {}, second);
      });

      it('test_adjust_hue', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L451-L461
        // v3.1.0

        function ninth() { eval_equal(func_parse("adjust-hue($color: rgba(136, 17, 17, 0.5), $degrees: 45deg)"), '"rgba(136, 106, 17, 0.5)"', {}, done) }
        function eight() { eval_equal(func_parse("adjust-hue(hsl(120, 30, 90), 60deg)"), '"#deeded"', {}, ninth) }
        function seventh() { eval_equal(func_parse("adjust-hue(hsl(120, 30, 90), -60deg)"), '"#ededde"', {}, eight) }
        function sixth() { eval_equal(func_parse("adjust-hue(#811, 45deg)"), '"#886a11"', {}, seventh) }
        function fifth() { eval_equal(func_parse("adjust-hue(#000, 45deg)"), '"black"', {}, sixth) }
        function fourth() { eval_equal(func_parse("adjust-hue(#fff, 45deg)"), '"white"', {}, fifth) }
        function third() { eval_equal(func_parse("adjust-hue(#8a8, 360deg)"), '"#88aa88"', {}, fourth) }
        function second() { eval_equal(func_parse("adjust-hue(#8a8, 0deg)"), '"#88aa88"', {}, third) }
        eval_equal(func_parse("adjust-hue(rgba(136, 17, 17, 0.5), 45deg)"), '"rgba(136, 106, 17, 0.5)"', {}, second)
      });

      it('test_adjust_color', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L468-L520
        // v3.1.0

        function t() { eval_equal(func_parse("hsl(180, 30, 90)"), func_parse("adjust-color(hsl(120, 30, 90), $hue: 60deg)"), {}, done)}
        function s() { eval_equal(func_parse("hsl(120, 50, 90)"), func_parse("adjust-color(hsl(120, 30, 90), $saturation: 20%)"), {}, t)}
        function r() { eval_equal(func_parse("hsl(120, 30, 60)"), func_parse("adjust-color(hsl(120, 30, 90), $lightness: -30%)"), {}, s)}
        function q() { eval_equal(func_parse("rgb(15, 20, 30)"), func_parse("adjust-color(rgb(10, 20, 30), $red: 5)"), {}, r)}
        function p() { eval_equal(func_parse("rgb(10, 15, 30)"), func_parse("adjust-color(rgb(10, 20, 30), $green: -5)"), {}, q)}
        function o() { eval_equal(func_parse("rgb(10, 20, 40)"), func_parse("adjust-color(rgb(10, 20, 30), $blue: 10)"), {}, p)}
        function n() { eval_equal(func_parse("hsla(120, 30, 90, 0.65)"), func_parse("adjust-color(hsl(120, 30, 90), $alpha: -0.35)"), {}, o)}
        function m() { eval_equal(func_parse("rgba(10, 20, 30, 0.9)"), func_parse("adjust-color(rgba(10, 20, 30, 0.4), $alpha: 0.5)"), {}, n)}
        function l() { eval_equal(func_parse("hsl(180, 20, 90)"), func_parse("adjust-color(hsl(120, 30, 90), $hue: 60deg, $saturation: -10%)"), {}, m)}
        function k() { eval_equal(func_parse("hsl(180, 20, 95)"), func_parse("adjust-color(hsl(120, 30, 90), $hue: 60deg, $saturation: -10%, $lightness: 5%)"), {}, l)}
        function j() { eval_equal(func_parse("hsla(120, 20, 95, 0.3)"), func_parse("adjust-color(hsl(120, 30, 90), $saturation: -10%, $lightness: 5%, $alpha: -0.7)"), {}, k)}
        function i() { eval_equal(func_parse("rgb(15, 20, 29)"), func_parse("adjust-color(rgb(10, 20, 30), $red: 5, $blue: -1)"), {}, j)}
        function h() { eval_equal(func_parse("rgb(15, 45, 29)"), func_parse("adjust-color(rgb(10, 20, 30), $red: 5, $green: 25, $blue: -1)"), {}, i)}
        function g() { eval_equal(func_parse("rgba(10, 25, 29, 0.7)"), func_parse("adjust-color(rgb(10, 20, 30), $green: 5, $blue: -1, $alpha: -0.3)"), {}, h)}
        function f() { eval_equal(func_parse("hsl(120, 30, 90)"), func_parse("adjust-color(hsl(120, 30, 90), $hue: 720deg)"), {}, g)}
        function e() { eval_equal(func_parse("hsl(120, 0, 90)"), func_parse("adjust-color(hsl(120, 30, 90), $saturation: -90%)"), {}, f)}
        function d() { eval_equal(func_parse("hsl(120, 30, 100)"), func_parse("adjust-color(hsl(120, 30, 90), $lightness: 30%)"), {}, e)}
        function c() { eval_equal(func_parse("rgb(255, 20, 30)"), func_parse("adjust-color(rgb(10, 20, 30), $red: 250)"), {}, d)}
        function b() { eval_equal(func_parse("rgb(10, 0, 30)"), func_parse("adjust-color(rgb(10, 20, 30), $green: -30)"), {}, c)}
        eval_equal(func_parse("rgb(10, 20, 0)"), func_parse("adjust-color(rgb(10, 20, 30), $blue: -40)"), {}, b)
      });

      it('test_adjust_color_tests_arg_range', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L543-L571
        // v3.1.0

        function l() {eval_err(func_parse('adjust-color(blue, $blue: 256)'), "$blue: Amount 256 must be between -255 and 255", {}, done)}
        function k() {eval_err(func_parse('adjust-color(blue, $blue: -256)'), "$blue: Amount -256 must be between -255 and 255", {}, l)}
        function j() {eval_err(func_parse('adjust-color(blue, $alpha: 1.1)'), "$alpha: Amount 1.1 must be between -1 and 1", {}, k)}
        function i() {eval_err(func_parse('adjust-color(blue, $alpha: -1.1)'), "$alpha: Amount -1.1 must be between -1 and 1", {}, j)}
        function h() {eval_err(func_parse('adjust-color(blue, $saturation: 101%)'), "$saturation: Amount 101% must be between -100% and 100%", {}, i)}
        function g() {eval_err(func_parse('adjust-color(blue, $saturation: -101%)'), "$saturation: Amount -101% must be between -100% and 100%", {}, h)}
        function f() {eval_err(func_parse('adjust-color(blue, $lightness: 101%)'), "$lightness: Amount 101% must be between -100% and 100%", {}, g)}
        function e() {eval_err(func_parse('adjust-color(blue, $lightness: -101%)'), "$lightness: Amount -101% must be between -100% and 100%", {}, f)}
        function d() {eval_err(func_parse('adjust-color(blue, $red: 256)'), "$red: Amount 256 must be between -255 and 255", {}, e)}
        function c() {eval_err(func_parse('adjust-color(blue, $red: -256)'), "$red: Amount -256 must be between -255 and 255", {}, d)}
        function b() {eval_err(func_parse('adjust-color(blue, $green: 256)'), "$green: Amount 256 must be between -255 and 255", {}, c)}
        eval_err(func_parse('adjust-color(blue, $green: -256)'), "$green: Amount -256 must be between -255 and 255", {}, b);
      });

      it('test_adjust_color_argument_errors', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L573-L584
        // v3.1.0

        function e() {eval_err(func_parse('adjust-color(blue, $hoo: 260deg)'), "Unknown argument $hoo (260deg)", {}, done)}
        function d() {eval_err(func_parse('adjust-color(blue, $hue: 120deg, $red: 10)'), "Cannot specify HSL and RGB values", {}, e)}
        function c() {eval_err(func_parse('adjust-color(blue, 10px)'), "10px is not a keyword argument", {}, d)}
        function b() {eval_err(func_parse('adjust-color(blue, 10px, 20px)'), "10px is not a keyword argument", {}, c)}
        eval_err(func_parse('adjust-color(blue, 10px, $hue: 180deg)'), "10px is not a keyword argument", {}, b);
      });

      it('test_scale_color', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L586-L626
        // v3.1.0

        function o() { eval_equal(func_parse("hsl(120, 51, 90)"), func_parse("scale-color(hsl(120, 30, 90), $saturation: 30%)"), {}, done) }
        function n() { eval_equal(func_parse("hsl(120, 30, 76.5)"), func_parse("scale-color(hsl(120, 30, 90), $lightness: -15%)"), {}, o) }
        function m() { eval_equal(func_parse("rgb(157, 20, 30)"), func_parse("scale-color(rgb(10, 20, 30), $red: 60%)"), {}, n) }
        function l() { eval_equal(func_parse("rgb(10, 38.8, 30)"), func_parse("scale-color(rgb(10, 20, 30), $green: 8%)"), {}, m) }
        function k() { eval_equal(func_parse("rgb(10, 20, 20)"), func_parse("scale-color(rgb(10, 20, 30), $blue: -(1/3)*100%)"), {}, l) }
        function j() { eval_equal(func_parse("hsla(120, 30, 90, 0.86)"), func_parse("scale-color(hsl(120, 30, 90), $alpha: -14%)"), {}, k) }
        function i() { eval_equal(func_parse("rgba(10, 20, 30, 0.82)"), func_parse("scale-color(rgba(10, 20, 30, 0.8), $alpha: 10%)"), {}, j) }
        function h() { eval_equal(func_parse("hsl(120, 51, 76.5)"), func_parse("scale-color(hsl(120, 30, 90), $saturation: 30%, $lightness: -15%)"), {}, i) }
        function g() { eval_equal(func_parse("hsla(120, 51, 90, 0.2)"), func_parse("scale-color(hsl(120, 30, 90), $saturation: 30%, $alpha: -80%)"), {}, j) }
        function f() { eval_equal(func_parse("rgb(157, 38.8, 30)"), func_parse("scale-color(rgb(10, 20, 30), $red: 60%, $green: 8%)"), {}, g) }
        function e() { eval_equal(func_parse("rgb(157, 38.8, 20)"), func_parse("scale-color(rgb(10, 20, 30), $red: 60%, $green: 8%, $blue: -(1/3)*100%)"), {}, f) }
        function d() { eval_equal(func_parse("rgba(10, 38.8, 20, 0.55)"), func_parse("scale-color(rgba(10, 20, 30, 0.5), $green: 8%, $blue: -(1/3)*100%, $alpha: 10%)"), {}, e) }
        function c() { eval_equal(func_parse("hsl(120, 100, 90)"), func_parse("scale-color(hsl(120, 30, 90), $saturation: 100%)"), {}, d) }
        function b() { eval_equal(func_parse("hsl(120, 30, 90)"), func_parse("scale-color(hsl(120, 30, 90), $saturation: 0%)"), {}, c) }
        eval_equal(func_parse("hsl(120, 0, 90)"), func_parse("scale-color(hsl(120, 30, 90), $saturation: -100%)"), {}, b)
      });

      it('test_change_color', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L673-L697
        // v3.1.0

        function i() { eval_equal(func_parse("hsl(195, 30, 90)"), func_parse("change-color(hsl(120, 30, 90), $hue: 195deg)"), {}, done) }
        function h() { eval_equal(func_parse("hsl(120, 50, 90)"), func_parse("change-color(hsl(120, 30, 90), $saturation: 50%)"), {}, i) }
        function g() { eval_equal(func_parse("hsl(120, 30, 40)"), func_parse("change-color(hsl(120, 30, 90), $lightness: 40%)"), {}, h) }
        function f() { eval_equal(func_parse("rgb(123, 20, 30)"), func_parse("change-color(rgb(10, 20, 30), $red: 123)"), {}, g) }
        function e() { eval_equal(func_parse("rgb(10, 234, 30)"), func_parse("change-color(rgb(10, 20, 30), $green: 234)"), {}, f) }
        function d() { eval_equal(func_parse("rgb(10, 20, 198)"), func_parse("change-color(rgb(10, 20, 30), $blue: 198)"), {}, e) }
        function c() { eval_equal(func_parse("rgba(10, 20, 30, 0.76)"), func_parse("change-color(rgb(10, 20, 30), $alpha: 0.76)"), {}, d) }
        function b() { eval_equal(func_parse("hsl(56, 30, 47)"), func_parse("change-color(hsl(120, 30, 90), $hue: 56deg, $lightness: 47%)"), {}, c) }
        eval_equal(func_parse("hsla(56, 30, 47, 0.9)"), func_parse("change-color(hsl(120, 30, 90), $hue: 56deg, $lightness: 47%, $alpha: 0.9)"), {}, b)
      });

      it('test_change_color_argument_errors', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L714-L736
        // v3.1.0

        function b() {eval_err(func_parse('mix(#123, #456, -0.001)'), "Weight -0.001 must be between 0% and 100%", {}, done)}
        eval_err(func_parse('mix(#123, #456, 100.001)'), 'Weight 100.001 must be between 0% and 100%', {}, b);
      });

      it('test_grayscale', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L768-L775
        // v3.1.0

        function f() { eval_equal(func_parse("grayscale(#abc)"), '"#bbbbbb"', {}, done) }
        function e() { eval_equal(func_parse("grayscale(#f00)"), '"gray"', {}, f) }
        function d() { eval_equal(func_parse("grayscale(#00f)"), '"gray"', {}, e) }
        function c() { eval_equal(func_parse("grayscale(white)"), '"white"', {}, d) }
        function b() { eval_equal(func_parse("grayscale(black)"), '"black"', {}, c) }
        eval_equal(func_parse("grayscale($color: black)"), '"black"', {}, b)
      });

      it('test_invert', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L794-L797
        // v3.1.0

        function b() { eval_equal(func_parse("invert(#edc)"), '"#112233"', {}, done) }
        eval_equal(func_parse("invert(rgba(10, 20, 30, 0.5))"), '"rgba(245, 235, 225, 0.5)"', {}, b)
      });

      it('test_type_of', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L837-L844
        // v3.1.0

        function f() { eval_equal(func_parse('type-of(\\"asdf\\")'), '"string"', {}, done) }
        function e() { eval_equal(func_parse("type-of(asdf)"), '"string"', {}, f) }
        function d() { eval_equal(func_parse("type-of(1px)"), '"number"', {}, e) }
        function c() { eval_equal(func_parse("type-of(true)"), '"bool"', {}, d) }
        function b() { eval_equal(func_parse("type-of(#fff)"), '"color"', {}, c) }
        eval_equal(func_parse("type-of($value: #fff)"), '"color"', {}, b)
      });

      it('test_length', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L872-L880
        // v3.1.0

        function g() { eval_equal(func_parse("length(1 2 3 4 5)"), '"5"', {}, done) }
        function f() { eval_equal(func_parse("length((foo, bar, baz, bip))"), '"4"', {}, g) }
        function e() {eval_equal(func_parse("length((foo, bar, baz bip))"), '"3"', {}, f)}
        function d() { eval_equal(func_parse("length((foo, bar, (baz, bip)))"), '"3"', {}, e)}
        function c() { eval_equal(func_parse("length(#f00)"), '"1"', {}, d) }
        function b() {eval_equal(func_parse("length(())"),'"0"', {}, c);}
        eval_equal(func_parse("length(1 2 () 3)"), '"4"', {}, b)
      });

      it('test_join', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L896-L932
        // v3.1.0

        function ad() { eval_equal(func_parse("(1, 2, ()) == join((), (1, 2))"), '"false"', {}, done) }
        function ac() { eval_equal(func_parse("(1 2 ()) == join((), 1 2)"), '"false"', {}, ad) }
        function ab() { eval_equal(func_parse("(1, 2) == join((), (1, 2))"), '"true"', {}, ac) }
        function aa() { eval_equal(func_parse("(1 2) == join((), 1 2)"), '"true"', {}, ab) }
        function z() { eval_equal(func_parse("join((), (1, 2))"), '"1, 2"', {}, aa) }
        function y() { eval_equal(func_parse("join((), 1 2)"), '"1 2"', {}, z) }
        function x() { eval_equal(func_parse("(1, 2, ()) == join((1, 2), ())"), '"false"', {}, y) }
        function w() { eval_equal(func_parse("(1 2 ()) == join(1 2, ())"), '"false"', {}, x) }
        function v() { eval_equal(func_parse("(1, 2) == join((1, 2), ())"), '"true"', {}, w) }
        function u() { eval_equal(func_parse("(1 2) == join(1 2, ())"), '"true"', {}, v) }
        function t() { eval_equal(func_parse("join((1, 2), ())"), '"1, 2"', {}, u) }
        function s() { eval_equal(func_parse("join(1 2, ())"), '"1 2"', {}, t) }
        function r() { eval_equal(func_parse("join(1, 2, comma)"), '"1, 2"', {}, s) }
        function q() { eval_equal(func_parse("join((1, 2), (3, 4), space)"), '"1 2 3 4"', {}, r) }
        function p() { eval_equal(func_parse("join(1 2, 3 4, comma)"), '"1, 2, 3, 4"', {}, q) }
        function o() { eval_equal(func_parse("join(1, 2, auto)"), '"1 2"', {}, p) }
        function n() { eval_equal(func_parse("join((1, 2), 3 4)"), '"1, 2, 3, 4"', {}, o) }
        function m() { eval_equal(func_parse("join(1 2, (3, 4))"), '"1 2 3 4"', {}, n) }
        function l() { eval_equal(func_parse("join(1, 2)"), '"1 2"', {}, m) }
        function k() { eval_equal(func_parse("(1, 2, (3, 4)) == join((1, 2), (3, 4))"), '"false"', {}, l) }
        function j() { eval_equal(func_parse("(1, 2, 3, 4) == join((1, 2), (3, 4))"), '"true"', {}, k) }
        function i() { eval_equal(func_parse("join((1, 2), (3, 4))"), '"1, 2, 3, 4"', {}, j) }
        function h() { eval_equal(func_parse("join(1, (2, 3))"), '"1, 2, 3"', {}, i) }
        function g() { eval_equal(func_parse("join((1, 2), 3)"), '"1, 2, 3"', {}, h) }
        function f() { eval_equal(func_parse("(1 2 (3 4)) == join(1 2, 3 4)"), '"false"', {}, g) }
        function e() {eval_equal(func_parse("(1 2 3 4) == join(1 2, 3 4)"), '"true"', {}, f)}
        function d() { eval_equal(func_parse("join(1 2, 3 4)"), '"1 2 3 4"', {}, e)}
        function c() { eval_equal(func_parse("join(1, 2 3)"), '"1 2 3"', {}, d) }
        function b() {eval_equal(func_parse("join(1 2, 3)"), '"1 2 3"', {}, c);}
        eval_err(func_parse("join(1, 2, baboon)"), 'Separator name must be space, comma, or auto', {}, b)
      });

      it('test_append', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L934-L966
        // v3.1.0

        function z() { eval_equal(func_parse("append(1 2, 3)"), '"1 2 3"', {}, done) }
        function y() { eval_equal(func_parse("append(1 2, 3 4)"), '"1 2 3 4"', {}, z) }
        function x() { eval_equal(func_parse("(1 2 3 4) == append(1 2, 3 4)"), '"false"', {}, y) }
        function w() { eval_equal(func_parse("(1 2 (3 4)) == append(1 2, 3 4)"), '"true"', {}, x) }
        function v() { eval_equal(func_parse("append((1, 2), 3)"), '"1, 2, 3"', {}, w) }
        function u() { eval_equal(func_parse("append((1, 2), (3, 4))"), '"1, 2, 3, 4"', {}, v) }
        function t() { eval_equal(func_parse("(1, 2, 3, 4) == append((1, 2), (3, 4))"), '"false"', {}, u) }
        function s() { eval_equal(func_parse("(1, 2, (3, 4)) == append((1, 2), (3, 4))"), '"true"', {}, t) }
        function r() { eval_equal(func_parse("append(1, 2)"), '"1 2"', {}, s) }
        function q() { eval_equal(func_parse("append(1 2, (3, 4))"), '"1 2 3, 4"', {}, r) }
        function p() { eval_equal(func_parse("(1 2 (3, 4)) == append(1 2, (3, 4))"), '"true"', {}, q) }
        function o() { eval_equal(func_parse("append((1, 2), 3 4)"), '"1, 2, 3 4"', {}, p) }
        function n() { eval_equal(func_parse("(1, 2, 3 4) == append((1, 2), 3 4)"), '"true"', {}, o) }
        function m() { eval_equal(func_parse("append(1, 2, auto)"), '"1 2"', {}, n) }
        function l() { eval_equal(func_parse("append(1 2, 3 4, comma)"), '"1, 2, 3 4"', {}, m) }
        function k() { eval_equal(func_parse("append((1, 2), (3, 4), space)"), '"1 2 3, 4"', {}, l) }
        function j() { eval_equal(func_parse("append(1, 2, comma)"), '"1, 2"', {}, k) }
        function i() { eval_equal(func_parse("append(1 2, ())"), '"1 2"', {}, j) }
        function h() { eval_equal(func_parse("append((1, 2), ())"), '"1, 2"', {}, i) }
        function g() { eval_equal(func_parse("(1 2 ()) == append(1 2, ())"), '"true"', {}, h) }
        function f() { eval_equal(func_parse("(1, 2, ()) == append((1, 2), ())"), '"true"', {}, g) }
        function e() {eval_equal(func_parse("append((), 1 2)"), '"1 2"', {}, f)}
        function d() { eval_equal(func_parse("append((), (1, 2))"), '"1, 2"', {}, e)}
        function c() { eval_equal(func_parse("(1 2) == append((), 1 2)"), '"false"', {}, d) }
        function b() {eval_equal(func_parse("(1 2) == nth(append((), 1 2), 1)"), '"true"', {}, c);}
        eval_err(func_parse("append(1, 2, baboon)"), 'Separator name must be space, comma, or auto', {}, b)
      });

      it('test_if', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L968-L971
        // v3.1.0

        function b() {eval_equal(func_parse("if(false, 1px, 2px)"), '"2px"', {}, done);}
        eval_equal(func_parse("if(true, 1px, 2px)"), '"1px"', {}, b)
      });

      it('test_keyword_args_rgb', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L973-L975
        // v3.1.0

        eval_equal(func_parse("rgb($red: 255, $green: 255, $blue: 255)"), '"white"', {}, done)
      });

      it('test_keyword_args_rgba', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L977-L980
        // v3.1.0

        function b() {eval_equal(func_parse("rgba($red: 255, $green: 255, $blue: 255, $alpha: 0.5)"), '"rgba(255, 255, 255, 0.5)"', {}, done);}
        eval_equal(func_parse("rgba($color: #fff, $alpha: 0.5)"), '"rgba(255, 255, 255, 0.5)"', {}, b)
      });

      it('test_keyword_args_must_have_signature', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L988-L992
        // v3.1.0

        eval_err(func_parse("no-kw-args($fake: value)"), "Function no_kw_args doesn't support keyword arguments", {}, done);
      });

      it('test_keyword_args_with_missing_argument', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L994-L998
        // v3.1.0

        eval_err(func_parse("rgb($red: 255, $green: 255)"), "Function rgb requires an argument named $blue", {}, done);
      });

      it('test_rgba_color_math', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L43-L47
        // v3.1.0

        function e() { eval_equal(func_parse("rgba(1, 1, 2, 0.35) * rgba(50, 50, 50, 0.35)"), '"rgba(50, 50, 100, 0.35)"', {}, done) }
        function d() { eval_equal(func_parse("rgba(2, 2, 2, 0.25) + rgba(50, 50, 50, 0.25)"), '"rgba(52, 52, 52, 0.25)"', {}, e) }
        function c() {eval_err(func_parse('rgba(1, 2, 3, 0.15) + rgba(50, 50, 50, 0.75)'), "Alpha channels must be equal: rgba(1, 2, 3, 0.15) + rgba(50, 50, 50, 0.75)", {}, d)}
        function b() {eval_err(func_parse('#123456 * rgba(50, 50, 50, 0.75)'), "Alpha channels must be equal: #123456 * rgba(50, 50, 50, 0.75)", {}, c)}
        eval_err(func_parse('rgba(50, 50, 50, 0.75) / #123456'), "Alpha channels must be equal: rgba(50, 50, 50, 0.75) / #123456", {}, b);
      });

      it('test_rgba_number_math', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L77-L80
        // v3.1.0

        function b() { eval_equal(func_parse("rgba(50, 50, 50, 0.75) - 1"), '"rgba(49, 49, 49, 0.75)"', {}, done) }
        eval_equal(func_parse("rgba(50, 50, 50, 0.75) * 2"), '"rgba(100, 100, 100, 0.75)"', {}, b)
      });

      it('test_compressed_comma', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L98-L101
        // v3.1.0

        eval_equal(func_parse("foo, #baf, #f00", {style: 'compressed'}), '"foo,#baf,red"', {}, done)
      });

      it('test_basic_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L109-L118
        // v3.1.0

        function i() { eval_equal(func_parse("foo\#{1 + 2}bar"), '"foo3bar"', {}, done) }
        function h() { eval_equal(func_parse("foo\#{1 + 2} bar"), '"foo3 bar"', {}, i) }
        function g() { eval_equal(func_parse("foo \#{1 + 2}bar"), '"foo 3bar"', {}, h) }
        function f() { eval_equal(func_parse("foo \#{1 + 2} bar"), '"foo 3 bar"', {}, g) }
        function e() { eval_equal(func_parse("foo \#{1 + 2}\#{2 + 3} bar"), '"foo 35 bar"', {}, f) }
        function d() { eval_equal(func_parse("foo \#{1 + 2} \#{2 + 3} bar"), '"foo 3 5 bar"', {}, e) }
        function c() { eval_equal(func_parse("\#{1 + 2}bar"), '"3bar"', {}, d) }
        function b() { eval_equal(func_parse("foo\#{1 + 2}"), '"foo3"', {}, c) }
        eval_equal(func_parse("\#{1 + 2}"), '"3"', {}, b)
      });

      it('test_basic_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L109-L118
        // v3.1.0

        function c() { eval_equal(func_parse("flabnabbit(#{1 + \\\"foo\\\"})"), '"flabnabbit(1foo)"', {}, done) }
        function b() { eval_equal(func_parse("flabnabbit(foo #{1 + \\\"foo\\\"}baz)"), '"flabnabbit(foo 1foobaz)"', {}, c) }
        eval_equal(func_parse("flabnabbit(foo #{1 + \\\"foo\\\"}#{2 + \\\"bar\\\"} baz)"), '"flabnabbit(foo 1foo2bar baz)"', {}, b)
      });

      it('test_interpolation_near_operators', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L128-L163
        // v3.1.0

        function ab() { eval_equal(func_parse("#{1 + 2} , #{3 + 4}"), '"3 , 7"', {}, done) }
        function aa() { eval_equal(func_parse("#{1 + 2}, #{3 + 4}"), '"3, 7"', {}, ab) }
        function z() { eval_equal(func_parse("#{1 + 2} ,#{3 + 4}"), '"3 ,7"', {}, aa) }
        function y() { eval_equal(func_parse("#{1 + 2},#{3 + 4}"), '"3,7"', {}, z) }
        function x() { eval_equal(func_parse("3 / #{3 + 4}"), '"3 / 7"', {}, y) }
        function w() { eval_equal(func_parse("3 /#{3 + 4}"), '"3 /7"', {}, x) }
        function v() { eval_equal(func_parse("3/ #{3 + 4}"), '"3/ 7"', {}, w) }
        function u() { eval_equal(func_parse("3/#{3 + 4}"), '"3/7"', {}, v) }
        function t() { eval_equal(func_parse("#{1 + 2} * 7"), '"3 * 7"', {}, u) }
        function s() { eval_equal(func_parse("#{1 + 2}* 7"), '"3* 7"', {}, t) }
        function r() { eval_equal(func_parse("#{1 + 2} *7"), '"3 *7"', {}, s) }
        function q() { eval_equal(func_parse("#{1 + 2}*7"), '"3*7"', {}, r) }
        function p() { eval_equal(func_parse("-#{1 + 2}"), '"-3"', {}, q) }
        function o() { eval_equal(func_parse("- #{1 + 2}"), '"- 3"', {}, p) }
        function n() { eval_equal(func_parse("5 + #{1 + 2} * #{3 + 4}"), '"5 + 3 * 7"', {}, o) }
        function m() { eval_equal(func_parse("5 +#{1 + 2} * #{3 + 4}"), '"5 +3 * 7"', {}, n) }
        function l() { eval_equal(func_parse("5+#{1 + 2} * #{3 + 4}"), '"5+3 * 7"', {}, m) }
        function k() { eval_equal(func_parse("#{1 + 2} * #{3 + 4} + 5"), '"3 * 7 + 5"', {}, l) }
        function j() { eval_equal(func_parse("#{1 + 2} * #{3 + 4}+ 5"), '"3 * 7+ 5"', {}, k) }
        function i() { eval_equal(func_parse("#{1 + 2} * #{3 + 4}+5"), '"3 * 7+5"', {}, j) }
        function h() { eval_equal(func_parse("5 / (#{1 + 2} + #{3 + 4})"), '"5/3 + 7"', {}, i) }
        function g() { eval_equal(func_parse("5 /(#{1 + 2} + #{3 + 4})"), '"5/3 + 7"', {}, h) }
        function f() { eval_equal(func_parse("5 /( #{1 + 2} + #{3 + 4} )"), '"5/3 + 7"', {}, g) }
        function e() { eval_equal(func_parse("(#{1 + 2} + #{3 + 4}) / 5"), '"3 + 7/5"', {}, f) }
        function d() { eval_equal(func_parse("(#{1 + 2} + #{3 + 4})/ 5"), '"3 + 7/5"', {}, e) }
        function c() { eval_equal(func_parse("( #{1 + 2} + #{3 + 4} )/ 5"), '"3 + 7/5"', {}, d) }
        function b() { eval_equal(func_parse("#{1 + 2} + 2 + 3"), '"3 + 5"', {}, c) }
        eval_equal(func_parse("#{1 + 2} +2 + 3"), '"3 +5"', {}, b)
      });

      it('test_string_interpolation-1', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L165-L170
        // v3.1.0

        function d() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\\\\\#{\\#{\\"ba\\" + \\"r\\"} baz} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()', '"\\\"foo #{bar baz} bang\\\""', {}, done) }
        function c() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\#{\\"\\#{\\"ba\\" + \\"r\\"} baz\\"} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()', '"\\\"foo bar baz bang\\\""', {}, d) }
        function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\#{\\"bar\\"}, \\#{\\"baz\\"} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()',  '"\\\"foo bar, baz bang\\\""', {}, c) }
        eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\#{\\"\\\\\\#{\\" + \\"baz\\"} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()', '"\\\"foo #{baz bang\\\""', {}, b)
      });

      it('test_inaccessible_functions', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L196-L199
        // v3.1.0

        function b() { eval_equal(func_parse("send(to_s)"), '"send(to_s)"', {}, done) }
        eval_equal(func_parse("public_instance_methods()"), '"public_instance_methods()"', {}, b)
      });

      it('test_adding_functions_directly_to_functions_module', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L201-L206
        // v3.1.0

        function d() { eval_equal("!!Opal.Sass.$$scope.Script.$$scope.Functions.$send('remove_method', 'nonexistant')", 'true', {}, done) }
        function c() { eval_equal("Opal.Sass.$$scope.Script.$$scope.Functions['$callable?']('nonexistant')", 'true', {}, d)}
        function b() { eval_equal('var b=Opal.Sass.$$scope.Script.$$scope.Functions,a=b.$class_eval,T;(a.$$p = (T=function(){return Opal.def(b, "$nonexistant", function(){})},0, 0, T), a).call(b)', 'undefined', {}, c) }
        eval_equal("!Opal.Sass.$$scope.Script.$$scope.Functions['$callable?']('nonexistant')", 'true', {}, b)
      });

      it('test_default_functions', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L208-L211
        // v3.1.0

        function b() { eval_equal(func_parse("url(12)"), '"url(12)"', {}, done) }
        eval_equal(func_parse("blam('foo')"), '"blam(\\\"foo\\\")"', {}, b)
      });

      it('test_funcall_requires_no_whitespace_before_lparen', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L218-L221
        // v3.1.0

        function b() { eval_equal(func_parse("no-repeat (7px + 8px)"), '"no-repeat 15px"', {}, done) }
        eval_equal(func_parse("no-repeat(7px + 8px)"), '"no-repeat(15px)"', {}, b)
      });

      it('test_url_with_interpolation', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L230-L235
        // v3.1.0

        function d() { eval_equal(func_parse("\'url(http://sass-lang.com/images/\#{foo-bar})\'"), '"\\\"url(http://sass-lang.com/images/foo-bar)\\\""', {}, done) }
        function c() { eval_equal(func_parse("url('http://sass-lang.com/images/\#{foo-bar}')"), '"url(\\\"http://sass-lang.com/images/foo-bar\\\")"', {}, d)}
        eval_equal(func_parse("url('http://sass-lang.com/images/#{foo-bar}')"), '"url(\\\"http://sass-lang.com/images/foo-bar\\\")"', {}, c)
      });

      it('test_booleans', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L251-L254
        // v3.1.0

        function b() { eval_equal(func_parse("true"), '"true"', {}, done)}
        eval_equal(func_parse("false"), '"false"', {}, b)
      });

      it('test_boolean_ops', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L256-L274
        // v3.1.0

        function q() { eval_equal(func_parse("true and true"), '"true"', {}, done) }
        function p() { eval_equal(func_parse("false or true"), '"true"', {}, q) }
        function o() { eval_equal(func_parse("true or false"), '"true"', {}, p) }
        function n() { eval_equal(func_parse("true or true"), '"true"', {}, o) }
        function m() { eval_equal(func_parse("false or false"), '"false"', {}, n) }
        function l() { eval_equal(func_parse("false and true"), '"false"', {}, m) }
        function k() { eval_equal(func_parse("true and false"), '"false"', {}, l) }
        function j() { eval_equal(func_parse("false and false"), '"false"', {}, k) }
        function i() { eval_equal(func_parse("not false"), '"true"', {}, j) }
        function h() { eval_equal(func_parse("not true"), '"false"', {}, i) }
        function g() { eval_equal(func_parse("not not true"), '"true"', {}, h) }
        function f() { eval_equal(func_parse("false or 1"), '"1"', {}, g) }
        function e() { eval_equal(func_parse("false and 1"), '"false"', {}, f) }
        function d() { eval_equal(func_parse("2 or 3"), '"2"', {}, e) }
        eval_equal(func_parse("2 and 3"), '"3"', {}, d)
      });

      it('test_arithmetic_ops', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L276-L284
        // v3.1.0

        function f() { eval_equal(func_parse("1 + 1"), '"2"', {}, done) }
        function e() { eval_equal(func_parse("1 - 1"), '"0"', {}, f) }
        function d() { eval_equal(func_parse("2 * 4"), '"8"', {}, e) }
        function c() { eval_equal(func_parse("(2 / 4)"), '"0.5"', {}, d) }
        function b() { eval_equal(func_parse("(4 / 2)"), '"2"', {}, c) }
        eval_equal(func_parse("-1"), '"-1"', {}, b)
      });

      it('test_string_ops', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L286-L302
        // v3.1.0

        function n() { eval_equal(func_parse("\\\"foo\\\" \\\"bar\\\""), '"\\\"foo\\\" \\\"bar\\\""', {}, done) }
        function m() { eval_equal(func_parse("true 1"), '"true 1"', {}, n) }
        function l() { eval_equal(func_parse("\'foo\' , \'bar\'"), '"\\\"foo\\\", \\\"bar\\\""', {}, m) }
        function k() { eval_equal(func_parse("true , 1"), '"true, 1"', {}, l) }
        function j() { eval_equal(func_parse("\\\"foo\\\" + \\\"bar\\\""), '"\\\"foobar\\\""', {}, k) }
        function i() { eval_equal(func_parse("true + 1"), '"true1"', {}, j) }
        function h() { eval_equal(func_parse("\'foo\' - \'bar\'"), '"\\\"foo\\\"-\\\"bar\\\""', {}, i) }
        function g() { eval_equal(func_parse("true - 1"), '"true-1"', {}, h) }
        function f() { eval_equal(func_parse("\\\"foo\\\" / \\\"bar\\\""), '"\\\"foo\\\"/\\\"bar\\\""', {}, g) }
        function e() { eval_equal(func_parse("true / 1"), '"true/1"', {}, f) }
        function d() { eval_equal(func_parse("- \'bar\'"), '"-\\\"bar\\\""', {}, e) }
        function c() { eval_equal(func_parse("- true"), '"-true"', {}, d) }
        function b() { eval_equal(func_parse("/  \\\"bar\\\""), '"/\\\"bar\\\""', {}, c) }
        eval_equal(func_parse("/ true"), '"/true"', {}, b)
      });

      it('test_relational_ops', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L304-L317
        // v3.1.0

        function l() { eval_equal(func_parse("1 > 2"), '"false"', {}, done) }
        function k() { eval_equal(func_parse("2 > 2"), '"false"', {}, l) }
        function j() { eval_equal(func_parse("3 > 2"), '"true"', {}, k) }
        function i() { eval_equal(func_parse("1 >= 2"), '"false"', {}, j) }
        function h() { eval_equal(func_parse("2 >= 2"), '"true"', {}, i) }
        function g() { eval_equal(func_parse("3 >= 2"), '"true"', {}, h) }
        function f() { eval_equal(func_parse("1 < 2"), '"true"', {}, g) }
        function e() { eval_equal(func_parse("2 < 2"), '"false"', {}, f) }
        function d() { eval_equal(func_parse("3 < 2"), '"false"', {}, e) }
        function c() { eval_equal(func_parse("1 <= 2"), '"true"', {}, d) }
        function b() { eval_equal(func_parse("2 <= 2"), '"true"', {}, c) }
        eval_equal(func_parse("3 <= 2"), '"false"', {}, b)
      });

      it('test_operation_precedence', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L336-L343
        // v3.1.0

        function f() { eval_equal(func_parse("true and false false or true"), '"false true"', {}, done) }
        function e() { eval_equal(func_parse("false and true or true and true"), '"true"', {}, f) }
        function d() { eval_equal(func_parse("1 == 2 or 3 == 3"), '"true"', {}, e) }
        function c() { eval_equal(func_parse("1 < 2 == 3 >= 3"), '"true"', {}, d) }
        function b() { eval_equal(func_parse("1 + 3 > 4 - 2"), '"true"', {}, c) }
        eval_equal(func_parse("1 + 2 * 3 + 4"), '"11"', {}, b)
      });

      it('test_functions', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L345-L348
        // v3.1.0

        function b() { eval_equal(func_parse("hsl(120, 100%, 75%)"), '"#80ff80"', {}, done) }
        eval_equal(func_parse("hsl(120, 100%, 75%) + #010001"), '"#81ff81"', {}, b)
      });

      it('test_operator_unit_conversion', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L350-L356
        // v3.1.0

        function e() { eval_equal(func_parse("1cm + 1mm"), '"1.1cm"', {}, done) }
        function d() { eval_equal(func_parse("2mm < 1cm"), '"true"', {}, e) }
        function c() { eval_equal(func_parse("10mm == 1cm"), '"true"', {}, d) }
        function b() { eval_equal(func_parse("1 == 1cm"), '"true"', {}, c) }
        eval_equal(func_parse("1.1cm == 11mm"), '"true"', {}, b)
      });

      it('test_slash_compiles_literally_when_left_alone', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L363-L369
        // v3.1.0

        function d() { eval_equal(func_parse("1px/2px"), '"1px/2px"', {}, done) }
        function c() { eval_equal(func_parse("1px/2px/3px/4px"), '"1px/2px/3px/4px"', {}, d) }
        function b() { eval_equal(func_parse("1px/2px redpx bluepx"), '"1px/2px redpx bluepx"', {}, c) }
        eval_equal(func_parse("foo 1px/2px/3px bar"), '"foo 1px/2px/3px bar"', {}, b)
      });

      it('test_slash_compiles_literally_when_left_alone', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L363-L369
        // v3.1.0

        function c() { eval_equal(func_parse("(1px/2px)"), '"0.5"', {}, done) }
        function b() { eval_equal(func_parse("(1px)/2px"), '"0.5"', {}, c) }
        eval_equal(func_parse("1px/(2px)"), '"0.5"', {}, b)
      });

      it('test_operator_unit_conversion', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L350-L356
        // v3.1.0

        function d() { eval_equal(func_parse("1px*1px/2px"), '"0.5px"', {}, done) }
        function c() { eval_equal(func_parse("1px/2px*1px"), '"0.5px"', {}, d) }
        function b() { eval_equal(func_parse("0+1px/2px"), '"0.5"', {}, c) }
        eval_equal(func_parse("1px/2px+0"), '"0.5"', {}, b)
      });

      it('test_empty_list', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L409-L415
        // v3.1.0

        function e() {eval_err(func_parse('()'), "() isn't a valid CSS value.", {}, done)}
        function d() {eval_err(func_parse('nth(append((), ()), 1)'), "() isn't a valid CSS value.", {}, e)}
        function c() { eval_equal(func_parse("() 1 2 3"), '"1 2 3"', {}, d) }
        function b() { eval_equal(func_parse("1 2 3 ()"), '"1 2 3"', {}, c) }
        eval_equal(func_parse("1 2 () 3"), '"1 2 3"', {}, b)
      });

      it('test_funcall_has_higher_precedence_than_color_name', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L419-L424
        // v3.1.0

        function d() { eval_equal(func_parse("teal(12)"), '"teal(12)"', {}, done) }
        function c() { eval_equal(func_parse("tealbang(12)"), '"tealbang(12)"', {}, d) }
        function b() { eval_equal(func_parse("teal-bang(12)"), '"teal-bang(12)"', {}, c) }
        eval_equal(func_parse("teal\\\\+bang(12)"), '"teal\\\\+bang(12)"', {}, b)
      });

      it('test_interpolation_after_hash', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L426-L428
        // v3.1.0

        eval_equal(func_parse("\\\"##{1 + 1}\\\""), '"\\\"#2\\\""', {}, done)
      });

      it('test_misplaced_comma_in_funcall', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L430-L433
        // v3.1.0

        eval_err(func_parse('foo(bar, )'), "Invalid CSS after \"foo(bar, \": expected function argument, was \")\"", {}, done);
      });

      it('test_color_prefixed_identifier', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L435-L438
        // v3.1.0

        function b() { eval_equal(func_parse("tealbang"), '"tealbang"', {}, done) }
        eval_equal(func_parse("teal-bang"), '"teal-bang"', {}, b)
      });

      it('test_op_prefixed_identifier', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L440-L445
        // v3.1.0

        function d() { eval_equal(func_parse("notbang"), func_parse("notbang"), {}, done) }
        function c() { eval_equal(func_parse("not-bang"), func_parse("not-bang"), {}, d) }
        function b() { eval_equal(func_parse("or-bang"), func_parse("or-bang"), {}, c) }
        eval_equal(func_parse("and-bang"), func_parse("and-bang"), {}, b)
      });

      if (semver.lt(window.__libVersion, "3.1.6")) {
        // Spacing for the wanr directive changed in 3.1.6
        it('test_warn_directive__scss_test_3.1.0', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L118-L137
          // v3.1.0

          function third() {
            sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith(\"WARNING: this is a warning\\n        on line 2 of an unknown file\\n\")===true&&console.warn.calledWith(\"WARNING: this is a mixin\\n        on line 1 of an unknown file, in `foo'\\n        from line 3 of an unknown file\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
              expect(result.err).to.be(undefined)
                expect(result.css).to.be(true)
                done();
            })
          }

          function second(result) {
            var css = "bar {\n  c: d; }\n";
            var scss = "@mixin foo { @warn \"this is a mixin\";}\n@warn \"this is a warning\";\nbar {c: d; @include foo;}\n";

            expect(result.err).to.be(undefined)
              equal(scss, css,{syntax: 'scss'}, third)
          }

          sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
        });

        it('test_warn_directive', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1783-L1806
          // v3.1.0

          function third() {
            sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith('WARNING: this is a warning\\n        on line 4 of test_warn_directive_inline.sass\\n')===true&&console.warn.calledWith('WARNING: this is a mixin warning\\n        on line 2 of test_warn_directive_inline.sass, in `foo\\'\\n        from line 7 of test_warn_directive_inline.sass\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
              expect(result.err).to.be(undefined)
                expect(result.css).to.be(true)

                done();
            })
          }

          function second(result) {
            expect(result.err).to.be(undefined)
              var css = "bar {\n  c: d; }\n";
            var scss = "=foo\n  @warn \"this is a mixin warning\"\n\n@warn \"this is a warning\"\nbar\n  c: d\n  +foo";
            equal(scss, css, {syntax: 'sass', filename: 'test_warn_directive_inline.sass'}, third)
          }

          // since the tests run in the worker, we have to inject sinon and wrap the console there, rather than in this context. Rather than bloat up the shipping code,
          // or ship code thats different than what we test, we eval it in
          sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
        })
      }

      if (semver.lt(window.__libVersion, "3.1.8")) {
        // Message started being `rstrip`ed in 3.1.8
        it('test_parent_in_mid_selector_error', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1031-L1042
          // v3.1.0

          err_message("flim {\n  .foo.bar& {a: b}\n}", "Invalid CSS after \"  .foo.bar\": expected \"{\", was \"& {a: b}\"\n\nIn Sass 3, the parent selector & can only be used where element names are valid,\nsince it could potentially be replaced by an element name.\n", {syntax: 'scss'}, done)
        });

        it('test_double_parent_selector_error', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1057-L1068
          // v3.1.0

          err_message("flim {\n  && {a: b}\n}\n", "Invalid CSS after \"  &\": expected \"{\", was \"& {a: b}\"\n\nIn Sass 3, the parent selector & can only be used where element names are valid,\nsince it could potentially be replaced by an element name.\n", {syntax: 'scss'}, done)
        });

        it('test_interpolation_doesnt_deep_unquote_strings', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1773-L1781
          // v3.1.0

          var css = ".foo- \"bar\" \"baz\" {\n  a: b; }\n";
          var scss = ".foo-\#{\"bar\" \"baz\"}\n  a: b\n";
          equal(scss, css, {syntax: 'sass'}, done)
        })

      }

      if (semver.lt(window.__libVersion, "3.1.9")) {
        // Test was modified in 3.1.9
        it('test_loud_comment_is_evaluated', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1569-L1577
          // v3.1.0
          var css = "/*\n * Hue: 327.216deg */\n";
          var scss = "/*!\n  Hue: #{hue(#f836a0)}\n";
          equal(scss, css, {syntax: 'sass'}, done)
        })

        it('test_comment_interpolation_warning', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2274-L2281
          // v3.1.0

          function third() {
            sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('WARNING:\\nOn line 1 of \\'test_comment_interpolation_warning_inline.sass\\'\\nComments will evaluate the contents of interpolations (#{ ... }) in Sass 3.2.\\nPlease escape the interpolation by adding a backslash before the hash sign.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
              expect(result.err).to.be(undefined)
                expect(result.css).to.be(true)

                done();
            })
          }

          function second(result) {
            expect(result.err).to.be(undefined)
              sassBuilder({css: "/* \#{foo}", options: {syntax: 'sass', filename: 'test_comment_interpolation_warning_inline.sass'}}, third) }

          // since the tests run in the worker, we have to inject sinon and wrap the console there, rather than in this context. Rather than bloat up the shipping code,
          // or ship code thats different than what we test, we eval it in
          sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
        })

        it('test_loud_comment_in_silent_comment', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1551-L1567
          // v3.1.0

          var css = "foo{color:blue;/* foo */\n/* bar */\n/* */\n/* bip */\n/* baz */}\n";
          var scss = "foo\n  color: blue\n  //! foo\n  //! bar\n  //!\n    bip\n    baz\n";
          equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
        })
      }

      if (semver.lt(window.__libVersion, "3.1.21")) {
        // some tests were removed in 3.1.21
        it('test_unit', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L846-L854
          // v3.1.0

          function g() {eval_equal(func_parse("unit($number: 100px)"), '"\\"px\\""', {}, done)}
          function f() { eval_equal(func_parse("unit(100)"), '"\\"\\""', {}, g) }
          function e() { eval_equal(func_parse("unit(100px)"), '"\\"px\\""', {}, f) }
          function d() { eval_equal(func_parse("unit(10px * 5em)"), '"\\"em*px\\""', {}, e) }
          function c() { eval_equal(func_parse("unit(5em * 10px)"), '"\\"em*px\\""', {}, d) }
          function b() { eval_equal(func_parse("unit(10px * 5em / 30cm / 1rem)"), '"\\"em*px/cm*rem\\""', {}, c) }
          eval_err(func_parse('unit(#f00)'), "#ff0000 is not a number", {}, b);
        });
      }

      if (semver.lt(window.__libVersion, "3.1.17")) {
        // error message was changed in 3.1.17
        it('test_hsl_checks_bounds', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L77-L80
          // v3.1.0

          function second() { eval_err(func_parse("hsl(10, 10, 256%)"),"Lightness 256 must be between 0% and 100%", {}, done) }
          eval_err(func_parse("hsl(10, -114, 12)"),"Saturation -114 must be between 0% and 100%", {}, second)
        });

        it('test_hsl_checks_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L82-L86
          // v3.1.0

          function third() { eval_err(func_parse("hsl(10, 10, 256%)"), "Lightness 256 must be between 0% and 100%", {}, done) }
          function second() { eval_err(func_parse("hsl(10, 10, 256%)"), "Lightness 256 must be between 0% and 100%", {}, third) }
          eval_err(func_parse("hsl(10, -114, 12)"), "Saturation -114 must be between 0% and 100%", {}, second)
        });

        it('test_hsla_checks_bounds', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L95-L100
          // v3.1.0

          function fourth() { eval_err(func_parse("hsla(10, 10, 10, 1.1)"), "Alpha channel 1.1 must be between 0 and 1", {}, done) }
          function third() { eval_err(func_parse("hsla(10, 10, 10, -0.1)"), "Alpha channel -0.1 must be between 0 and 1", {}, fourth) }
          function second() { eval_err(func_parse("hsla(10, 10, 256%, 0)"), "Lightness 256 must be between 0% and 100%", {}, third) }
          eval_err(func_parse("hsla(10, -114, 12, 1)"), "Saturation -114 must be between 0% and 100%", {}, second)
        });

        it('test_rgb_test_percent_bounds', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
          // v3.1.0

          function third() {eval_err(func_parse('rgb(0, 0, 101%)'), "Color value 101% must be between 0% and 100% inclusive", {}, done)};
          function second() {eval_err(func_parse('rgb(0, -0.1%, 0)'), "Color value -0.1% must be between 0% and 100% inclusive", {}, third)};
          eval_err(func_parse('rgb(100.1%, 0, 0)'), "Color value 100.1% must be between 0% and 100% inclusive", {}, second);
        });

        it('test_color_checks_input', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L15-L18
          // v3.1.0

          function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [256, 2, 3] )', "Red value must be between 0 and 255", {}, done)}
          eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, -1] )', "Blue value must be between 0 and 255", {}, b);
        });

        it('test_change_color_argument_errors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L714-L736
          // v3.1.0

          function h() {eval_err(func_parse('change-color(blue, $saturation: 101%)'), "Saturation must be between 0 and 100", {}, done)}
          function g() {eval_err(func_parse('change-color(blue, $lightness: 101%)'), "Lightness must be between 0 and 100", {}, h)}
          function f() {eval_err(func_parse('change-color(blue, $red: -1)'), "Red value must be between 0 and 255", {}, g)}
          function e() {eval_err(func_parse('change-color(blue, $green: 256)'), "Green value must be between 0 and 255", {}, f)}
          function d() {eval_err(func_parse('change-color(blue, $blue: 500)'), "Blue value must be between 0 and 255", {}, e)}
          function c() {eval_err(func_parse('change-color(blue, $hoo: 80%)'), "Unknown argument $hoo (80%)", {}, d)}
          function b() {eval_err(func_parse('change-color(blue, 10px)'), "10px is not a keyword argument", {}, c)}
          eval_err(func_parse('change-color(blue, $lightness: 10%, $red: 120)'), "Cannot specify HSL and RGB values for a color at the same time", {}, b);
        });

        it('test_color_checks_rgba_input', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L20-L23
          // v3.1.0

          function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, 3, 1.1] )', "Alpha channel must be between 0 and 1", {}, done)}
          eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, 3, -0.1] )', "Alpha channel must be between 0 and 1", {}, b);
        });

        it('test_pseudo_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L689-L753
          // v3.1.0

          function seventh() {
            var css = "a.foo {\n  a: b; }\n";
            var scss = "a.foo {a: b}\nh1 {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function sixth() {
            var css = "*|a.foo, ns|a {\n  a: b; }\n";
            var scss = "*|a.foo {a: b}\nns|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, seventh)
          }

          function fifth() {
            var css = "a.foo, ns|a {\n  a: b; }\n";
            var scss = "a.foo {a: b}\nns|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, sixth)
          }

          function fourth() {
            var css = "*|a {\n  a: b; }\n";
            var scss = "*|a.foo {a: b}\n*|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fifth)
          }

          function third() {
            var css = "*|a.foo, a {\n  a: b; }\n";
            var scss = "*|a.foo {a: b}\na {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "a {\n  a: b; }\n";
            var scss = "a.foo {a: b}\n*|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "a {\n  a: b; }\n";
          var scss = "a.foo {a: b}\na {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_rgb_tests_bounds', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L171-L182
          // v3.1.0

          function fifth() {eval_err(func_parse('rgb(256, 1, 1)'), "Color value 256 must be between 0 and 255 inclusive", {}, done)};
          function fourth() {eval_err(func_parse('rgb(1, 256, 1)'), "Color value 256 must be between 0 and 255 inclusive", {}, fifth)};
          function third() {eval_err(func_parse('rgb(1, 1, 256)'), "Color value 256 must be between 0 and 255 inclusive", {}, fourth)};
          function second() {eval_err(func_parse('rgb(1, 256, 257)'), "Color value 256 must be between 0 and 255 inclusive", {}, third)};
          eval_err(func_parse('rgb(-1, 1, 1)'), "Color value -1 must be between 0 and 255 inclusive", {}, second);
        });

        it('test_rgba_tests_bounds', function(done) {
          // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L230-L245
          // v3.1.0

          function seventh() {eval_err(func_parse('rgba(1, 1, 1, 1.2)'), "Alpha channel 1.2 must be between 0 and 1 inclusive", {}, done)};
          function sixth() {eval_err(func_parse('rgba(1, 1, 1, -0.2)'), "Alpha channel -0.2 must be between 0 and 1 inclusive", {}, seventh)};
          function fifth() {eval_err(func_parse('rgba(-1, 1, 1, 0.3)'), "Color value -1 must be between 0 and 255 inclusive", {}, sixth)};
          function fourth() {eval_err(func_parse('rgba(1, 256, 257, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, fifth)};
          function third() {eval_err(func_parse('rgba(1, 1, 256, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, fourth)};
          function second() {eval_err(func_parse('rgba(1, 256, 1, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, third)};
          eval_err(func_parse('rgba(256, 1, 1, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, second);
        });

      }

      if (semver.lt(window.__libVersion, "3.2.0")) {
        // "url" was added in 3.2.0
        it('test_http_import', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L277-L280
          // v3.1.0

          var css = "@import \"http://fonts.googleapis.com/css?family=Droid+Sans\";\n"
            var scss = "@import \"http://fonts.googleapis.com/css?family=Droid+Sans\";"
            equal(scss, css, {syntax: 'scss'}, done)
        });

        // test was modified in 3.2.0
        it('test_double_media_bubbling', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1921-L1947
          // v3.1.0

          function second() {
            var css = "@media bar {\n  .foo {\n    a: b; } }\n  @media bar and baz {\n    .foo {\n      c: d; } }\n";
            var scss = ".foo\n  @media bar\n    a: b\n    @media baz\n      c: d\n";
            equal(scss, css, {syntax: 'sass'}, done)
          }

          var css = "@media bar and baz {\n  .foo {\n    c: d; } }\n";
          var scss = "@media bar\n  @media baz\n    .foo\n      c: d\n";
          equal(scss, css, {syntax: 'sass'}, second)
        });

        it('test_multiple_extends_with_single_extender_and_single_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L95-L111
          // v3.1.0

          function second() {
            var css = ".foo.bar, .baz {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\n.baz {@extend .foo; @extend .bar}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".foo .bar, .baz .bar, .foo .baz, .baz .baz {\n  a: b; }\n";
          var scss = ".foo .bar {a: b}\n.baz {@extend .foo; @extend .bar}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_multiple_extends_with_multiple_extenders_and_single_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L113-L131
          // v3.1.0

          function second() {
            var css = ".foo.bar, .bar.baz, .baz.bang, .foo.bang {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\n.baz {@extend .foo}\n.bang {@extend .bar}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".foo .bar, .baz .bar, .foo .bang, .baz .bang {\n  a: b; }\n";
          var scss = ".foo .bar {a: b}\n.baz {@extend .foo}\n.bang {@extend .bar}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_chained_extends', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L133-L143
          // v3.1.0

          var css = ".foo, .bar, .baz, .bip {\n  a: b; }\n";
          var scss = ".foo {a: b}\n.bar {@extend .foo}\n.baz {@extend .bar}\n.bip {@extend .bar}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_dynamic_extendee', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L145-L161
          // v3.1.0

          function second() {
            var css = "[baz^=\"blip12px\"], .bar {\n  a: b; }\n";
            var scss = "[baz^=\"blip12px\"] {a: b}\n.bar {@extend [baz^=\"blip#{12px}\"]}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".foo, .bar {\n  a: b; }\n";
          var scss = ".foo {a: b}\n.bar {@extend \#{\".foo\"}}";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_nested_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L163-L171
          // v3.1.0

          var css = ".foo .bar, .foo .baz {\n  a: b; }\n";
          var scss = ".foo .bar {a: b}\n.baz {@extend .bar}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_target_with_child', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L173-L181
          // v3.1.0

          var css = ".foo .bar, .baz .bar {\n  a: b; }\n";
          var scss = ".foo .bar {a: b}\n.baz {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_class_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L183-L199
          // v3.1.0

          var css = ".foo.bar, .bar.baz {\n  a: b; }\n";
          var scss = ".foo.bar {a: b}\n.baz {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_universal_unification_with_simple_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L227-L267
          // v3.1.0

          function fifth() {
            var css = ".foo.bar, ns|*.bar {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\nns|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function fourth() {
            var css = ".bar {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fifth)
          }

          function third() {
            var css = ".bar {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\n* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = ".foo, *|* {\n  a: b; }\n";
            var scss = ".foo {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = ".foo, * {\n  a: b; }\n";
          var scss = ".foo {a: b}\n* {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_universal_unification_with_namespaceless_universal_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L269-L317
          // v3.1.0

          function sixth() {
            var css = "*|*.foo, ns|* {\n  a: b; }\n";
            var scss = "*|*.foo {a: b}\nns|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function fifth() {
            var css = "*.foo, ns|* {\n  a: b; }\n";
            var scss = "*.foo {a: b}\nns|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, sixth)
          }

          function fourth() {
            var css = "*|* {\n  a: b; }\n";
            var scss = "*|*.foo {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fifth)
          }

          function third() {
            var css = "*|*.foo, * {\n  a: b; }\n";
            var scss = "*|*.foo {a: b}\n* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "* {\n  a: b; }\n";
            var scss = "*.foo {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "* {\n  a: b; }\n";
          var scss = "*.foo {a: b}\n* {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_universal_unification_with_namespaced_universal_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L269-L317
          // v3.1.0

          function fourth() {
            var css = "ns|* {\n  a: b; }\n";
            var scss = "ns|*.foo {a: b}\nns|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function third() {
            var css = "ns1|*.foo {\n  a: b; }\n";
            var scss = "ns1|*.foo {a: b}\nns2|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "ns|\* {\n  a: b; }\n";
            var scss = "ns|*.foo {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "ns|* {\n  a: b; }\n";
          var scss = "ns|*.foo {a: b}\n* {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_universal_unification_with_namespaceless_element_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L353-L401
          // v3.1.0

          function sixth() {
            var css = "*|a.foo, ns|a {\n  a: b; }\n";
            var scss = "*|a.foo {a: b}\nns|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function fifth() {
            var css = "a.foo, ns|a {\n  a: b; }\n";
            var scss = "a.foo {a: b}\nns|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, sixth)
          }

          function fourth() {
            var css = "*|a {\n  a: b; }\n";
            var scss = "*|a.foo {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fifth)
          }

          function third() {
            var css = "*|a.foo, a {\n  a: b; }\n";
            var scss = "*|a.foo {a: b}\n* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "a {\n  a: b; }\n";
            var scss = "a.foo {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "a {\n  a: b; }\n";
          var scss = "a.foo {a: b}\n* {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_universal_unification_with_namespaced_element_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L403-L435
          // v3.1.0

          function fourth() {
            var css = "ns|a {\n  a: b; }\n";
            var scss = "ns|a.foo {a: b}\nns|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function third() {
            var css = "ns1|a.foo {\n  a: b; }\n";
            var scss = "ns1|a.foo {a: b}\nns2|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "ns|a {\n  a: b; }\n";
            var scss = "ns|a.foo {a: b}\n*|* {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "ns|a {\n  a: b; }\n";
          var scss = "ns|a.foo {a: b}\n* {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_element_unification_with_simple_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L437-L469
          // v3.1.0

          function fourth() {
            var css = ".foo.bar, ns|a.bar {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\nns|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function third() {
            var css = ".foo.bar, *|a.bar {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\n*|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = ".foo.bar, a.bar {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\na {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = ".foo, a {\n  a: b; }\n";
          var scss =  ".foo {a: b}\na {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_element_unification_with_namespaceless_universal_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L471-L519
          // v3.1.0

          function sixth() {
            var css = "*|*.foo, ns|a {\n  a: b; }\n";
            var scss = "*|*.foo {a: b}\nns|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function fifth() {
            var css = "*.foo, ns|a {\n  a: b; }\n";
            var scss = "*.foo {a: b}\nns|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, sixth)
          }

          function fourth() {
            var css = "*|*.foo, *|a {\n  a: b; }\n";
            var scss = "*|*.foo {a: b}\n*|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fifth)
          }

          function third() {
            var css = "*|*.foo, a {\n  a: b; }\n";
            var scss = "*|*.foo {a: b}\na {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "*.foo, a {\n  a: b; }\n";
            var scss = "*.foo {a: b}\n*|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "*.foo, a {\n  a: b; }\n";
          var scss = "*.foo {a: b}\na {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_element_unification_with_namespaced_universal_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L521-L553
          // v3.1.0

          function fourth() {
            var css = "ns|*.foo, ns|a {\n  a: b; }\n";
            var scss = "ns|*.foo {a: b}\nns|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function third() {
            var css = "ns1|*.foo {\n  a: b; }\n";
            var scss = "ns1|*.foo {a: b}\nns2|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "ns|*.foo, ns|a {\n  a: b; }\n";
            var scss = "ns|*.foo {a: b}\n*|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "ns|*.foo, ns|a {\n  a: b; }\n";
          var scss = "ns|*.foo {a: b}\na {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_element_unification_with_namespaceless_universal_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L555-L611
          // v3.1.0

          function eighth() {
            var css = ":foo {\n  a: b; }\n";
            var scss = ":foo.baz {a: b}\n:foo {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function seventh() {
            var css = ":foo.baz, :foo:bar {\n  a: b; }\n";
            var scss = ":foo.baz {a: b}\n:bar {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, eighth)
          }

          function sixth() {
            var css = "::foo(2n+1) {\n  a: b; }\n";
            var scss = "::foo(2n+1).baz {a: b}\n::foo(2n+1) {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, seventh)
          }

          function fifth() {
            var css = "::foo {\n  a: b; }\n";
            var scss = "::foo.baz {a: b}\n::foo {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, sixth)
          }

          function fourth() {
            var css = "::foo.baz {\n  a: b; }\n";
            var scss = "::foo.baz {a: b}\n::foo(2n+1) {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, fifth)
          }

          function third() {
            var css = "::foo.baz {\n  a: b; }\n";
            var scss = "::foo.baz {a: b}\n::bar {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = ":foo.baz, :foo::foo {\n  a: b; }\n";
            var scss = ":foo.baz {a: b}\n::foo {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = ":foo.baz, :foo:foo(2n+1) {\n  a: b; }\n";
          var scss = ":foo.baz {a: b}\n:foo(2n+1) {@extend .baz}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_element_unification_with_namespaced_element_target', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L613-L645
          // v3.1.0

          function fourth() {
            var css = "ns|a {\n  a: b; }\n";
            var scss = "ns|a.foo {a: b}\nns|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function third() {
            var css = "ns1|a.foo {\n  a: b; }\n";
            var scss = "ns1|a.foo {a: b}\nns2|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "ns|a {\n  a: b; }\n";
            var scss = "ns|a.foo {a: b}\n*|a {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "ns|a {\n  a: b; }\n";
          var scss = "ns|a.foo {a: b}\na {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_attribute_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L647-L687
          // v3.1.0

          function fifth() {
            var css = "[foo=bar] {\n  a: b; }\n";
            var scss = "[foo=bar].baz {a: b}\n[foo=bar] {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function fourth() {
            var css = "[foo=bar].baz, [foo=bar][ns|foo=bar] {\n  a: b; }\n";
            var scss = "[foo=bar].baz {a: b}\n[ns|foo=bar] {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, fifth)
          }

          function third() {
            var css = "[foo=bar].baz, [foo=bar][foot=bar] {\n  a: b; }\n";
            var scss = "[foo=bar].baz {a: b}\n[foot=bar] {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, fourth)
          }

          function second() {
            var css = "[foo=bar].baz, [foo=bar][foo^=bar] {\n  a: b; }\n";
            var scss = "[foo=bar].baz {a: b}\n[foo^=bar] {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "[foo=bar].baz, [foo=bar][foo=baz] {\n  a: b; }\n";
          var scss = "[foo=bar].baz {a: b}\n[foo=baz] {@extend .baz}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_pseudoelement_remains_at_end_of_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L755-L771
          // v3.1.0

          function second() {
            var css = "a.foo::bar, a.baz::bar {\n  a: b; }\n";
            var scss = "a.foo::bar {a: b}\n.baz {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".foo::bar, .baz::bar {\n  a: b; }\n";
          var scss = ".foo::bar {a: b}\n.baz {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_pseudoclass_remains_at_end_of_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L773-L789
          // v3.1.0

          function second() {
            var css = "a.foo:bar, a.baz:bar {\n  a: b; }\n";
            var scss = "a.foo:bar {a: b}\n.baz {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".foo:bar, .baz:bar {\n  a: b; }\n";
          var scss = ".foo:bar {a: b}\n.baz {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_not_remains_at_end_of_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L791-L799
          // v3.1.0

          var css = ".foo:not(.bar), .baz:not(.bar) {\n  a: b; }\n";
          var scss = ".foo:not(.bar) {a: b}\n.baz {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_pseudoelement_goes_lefter_than_pseudoclass', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L801-L817
          // v3.1.0

          function second() {
            var css = ".foo:bar, .baz:bar::bang {\n  a: b; }\n";
            var scss = ".foo:bar {a: b}\n.baz::bang {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".foo::bar, .baz:bang::bar {\n  a: b; }\n";
          var scss = ".foo::bar {a: b}\n.baz:bang {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_negation_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L837-L861
          // v3.1.0

          function third() {
            var css = ":not([a=b]) {\n  a: b; }\n";
            var scss = ":not([a=b]).baz {a: b}\n:not([a = b]) {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function second() {
            var css = ":not(.foo) {\n  a: b; }\n";
            var scss = ":not(.foo).baz {a: b}\n:not(.foo) {@extend .baz}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = ":not(.foo).baz, :not(.foo):not(.bar) {\n  a: b; }\n";
          var scss = ":not(.foo).baz {a: b}\n:not(.bar) {@extend .baz}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        });

        it('test_long_extendee', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L865-L873
          // v3.1.0

          var css = ".foo.bar, .baz {\n  a: b; }\n";
          var scss = ".foo.bar {a: b}\n.baz {@extend .foo.bar}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_long_extendee_requires_all_selectors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L875-L883
          // v3.1.0

          var css = ".foo {\n  a: b; }\n";
          var scss = ".foo {a: b}\n.baz {@extend .foo.bar}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_long_extendee_matches_supersets', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L885-L893
          // v3.1.0

          var css = ".foo.bar.bap, .bap.baz {\n  a: b; }\n";
          var scss = ".foo.bar.bap {a: b}\n.baz {@extend .foo.bar}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_long_extendee_runs_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L895-L903
          // v3.1.0

          var css = "ns|*.foo.bar, ns|a.baz {\n  a: b; }\n";
          var scss = "ns|*.foo.bar {a: b}\na.baz {@extend .foo.bar}\n";

          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_long_extender', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L907-L915
          // v3.1.0

          var css = ".foo.bar, .bar.baz.bang {\n  a: b; }\n";
          var scss = ".foo.bar {a: b}\n.baz.bang {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_long_extender_runs_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L917-L925
          // v3.1.0

          var css = "ns|*.foo.bar, ns|a.bar.baz {\n  a: b; }\n";
          var scss = "ns|*.foo.bar {a: b}\na.baz {@extend .foo}\n";

          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_long_extender_aborts_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L927-L943
          // v3.1.0

          function second() {
            var css = "a.foo#bar {\n  a: b; }\n";
            var scss = "a.foo#bar {a: b}\nh1.baz {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = "a.foo#bar {\n  a: b; }\n";
          var scss = "a.foo#bar {a: b}\n.bang#baz {@extend .foo}\n";

          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L947-L955
          // v3.1.0

          var css = ".foo, foo bar {\n  a: b; }\n";
          var scss = ".foo {a: b}\nfoo bar {@extend .foo}\n";

          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_runs_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L957-L965
          // v3.1.0

          var css = ".foo.bar, foo bar.bar {\n  a: b; }\n";
          var scss = ".foo.bar {a: b}\nfoo bar {@extend .foo}\n";

          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_aborts_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L967-L975
          // v3.1.0

          var css = "baz.foo {\n  a: b; }\n";
          var scss = "baz.foo {a: b}\nfoo bar {@extend .foo}\n";

          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_alternates_parents', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L977-L985
          // v3.1.0

          var css = ".baz .bip .foo, .baz .bip foo .grank bar, foo .grank .baz .bip bar {\n  a: b; }\n";
          var scss = ".baz .bip .foo {a: b}\nfoo .grank bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_unifies_identical_parents', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L987-L995
          // v3.1.0

          var css = ".baz .bip .foo, .baz .bip bar {\n  a: b; }\n";
          var scss = ".baz .bip .foo {a: b}\n.baz .bip bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_unifies_common_substring', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L997-L1005
          // v3.1.0

          var css = ".baz .bip .bap .bink .foo, .baz .brat .bip .bap .bink bar, .brat .baz .bip .bap .bink bar {\n  a: b; }\n";
          var scss = ".baz .bip .bap .bink .foo {a: b}\n.brat .bip .bap bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_unifies_common_subseq', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1007-L1015
          // v3.1.0

          var css = ".a .x .b .y .foo, .a .x .n .b .y .m bar, .a .n .x .b .y .m bar, .a .x .n .b .m .y bar, .a .n .x .b .m .y bar {\n  a: b; }\n";
          var scss = ".a .x .b .y .foo {a: b}\n.a .n .b .m bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_chooses_first_subseq', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1017-L1025
          // v3.1.0

          var css = ".a .b .c .d .foo, .a .b .c .d .a .b .bar {\n  a: b; }\n";
          var scss = ".a .b .c .d .foo {a: b}\n.c .d .a .b .bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_counts_extended_subselectors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1027-L1035
          // v3.1.0

          var css = ".a .bip.bop .foo, .a .b .bip.bop .bar, .b .a .bip.bop .bar {\n  a: b; }\n";
          var scss = ".a .bip.bop .foo {a: b}\n.b .bip .bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_counts_extended_superselectors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1037-L1045
          // v3.1.0

          var css = ".a .bip .foo, .a .b .bip.bop .bar, .b .a .bip.bop .bar {\n  a: b; }\n";
          var scss = ".a .bip .foo {a: b}\n.b .bip.bop .bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_with_child_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1047-L1055
          // v3.1.0

          var css = ".baz .foo, .baz foo > bar {\n  a: b; }\n";
          var scss = ".baz .foo {a: b}\nfoo > bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_finds_common_selectors_around_child_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1057-L1073
          // v3.1.0

          function second() {
            var css = "a > b c .c1, a > b c .c2 {\n  a: b; }\n";
            var scss = "a > b c .c1 {a: b}\nb c .c2 {@extend .c1}\n";
            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = "a > b c .c1, a > b c .c2 {\n  a: b; }\n";
          var scss = "a > b c .c1 {a: b}\na c .c2 {@extend .c1}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        })

        it('test_nested_extender_doesnt_find_common_selectors_around_adjacent_sibling_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1075-L1099
          // v3.1.0

          function third() {
            var css = "a + b c .c1, a + b c .c2 {\n  a: b; }\n";
            var scss = "a + b c .c1 {a: b}\nb c .c2 {@extend .c1}\n";
            equal(scss, css, {syntax: 'scss'}, done)
          }

          function second() {
            var css = "a + b c .c1, a a + b c .c2 {\n  a: b; }\n";
            var scss = "a + b c .c1 {a: b}\na b .c2 {@extend .c1}\n";
            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "a + b c .c1, a + b a c .c2, a a + b c .c2 {\n  a: b; }\n";
          var scss = "a + b c .c1 {a: b}\na c .c2 {@extend .c1}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        })

        it('test_nested_extender_doesnt_find_common_selectors_around_sibling_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1101-L1125
          // v3.1.0

          function third() {
            var css = "a ~ b c .c1, a ~ b c .c2 {\n  a: b; }\n";
            var scss = "a ~ b c .c1 {a: b}\nb c .c2 {@extend .c1}\n";
            equal(scss, css, {syntax: 'scss'}, done)
          }

          function second() {
            var css = "a ~ b c .c1, a a ~ b c .c2 {\n  a: b; }\n";
            var scss = "a ~ b c .c1 {a: b}\na b .c2 {@extend .c1}\n";
            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = "a ~ b c .c1, a ~ b a c .c2, a a ~ b c .c2 {\n  a: b; }\n";
          var scss = "a ~ b c .c1 {a: b}\na c .c2 {@extend .c1}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        })

        it('test_nested_extender_with_child_selector_unifies', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1145-L1153
          // v3.1.0

          var css = ".baz.foo, foo > bar.baz {\n  a: b; }\n";
          var scss = ".baz.foo {a: b}\nfoo > bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_with_trailing_child_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1155-L1159
          // v3.1.0

          err_message("bar > {@extend .baz}", "can't extend: invalid selector", {syntax: 'scss'}, done)
        })

        it('test_nested_extender_with_sibling_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1161-L1169
          // v3.1.0

          var css = ".baz .foo, .baz foo + bar {\n  a: b; }\n";
          var scss = ".baz .foo {a: b}\nfoo + bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extender_with_hacky_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1171-L1187
          // v3.1.0

          function second() {
            var css = ".baz .foo, .baz > > bar {\n  a: b; }\n";
            var scss = ".baz .foo {a: b}\n> > bar {@extend .foo}\n";
            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".baz .foo, .baz foo + > > + bar {\n  a: b; }\n";
          var scss = ".baz .foo {a: b}\nfoo + > > + bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        })

        it('test_nested_extender_with_child_selector_merges_with_same_selector', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1200-L1208
          // v3.1.0

          var css = ".foo > .bar .baz, .foo > .bar .bang {\n  a: b; }\n";
          var scss = ".foo > .bar .baz {a: b}\n.foo > .bar .bang {@extend .baz}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_nested_extend_loop', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1251-L1263
          // v3.1.0

          var css = ".bar, .bar .foo {\n  a: b; }\n  .bar .foo, .bar .foo .foo {\n    c: d; }\n";
          var scss = ".bar {\n  a: b;\n  .foo {c: d; @extend .bar}\n}\n";
          equal(scss, css, {syntax: 'scss'}, done)
        })

        it('test_rgb', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L157-L162
          // v3.1.0

          function fourth() {eval_equal(func_parse("rgb($red: 0, $green: 255, $blue: 127)"), '"#00ff7f"', {}, done)}
          function third() {eval_equal(func_parse("rgb(0, 255, 127)"), '"#00ff7f"', {}, fourth)}
          function second() { eval_equal(func_parse("rgb(190, 173, 237)"), '"#beaded"', {}, third) }
          eval_equal(func_parse("rgb(18, 52, 86)"), '"#123456"', {}, second)
        });

        it('test_rgb_percent', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L164-L169
          // v3.1.0

          function fourth() {eval_equal(func_parse("rgb(0%, 100%, 50%)"), '"#00ff7f"', {}, done)}
          function third() {eval_equal(func_parse("rgb(190, 68%, 237)"), '"#beaded"', {}, fourth)}
          function second() { eval_equal(func_parse("rgb(74.7%, 173, 93%)"), '"#beaded"', {}, third) }
          eval_equal(func_parse("rgb(7.1%, 20.4%, 34%)"), '"#123456"', {}, second)
        });

        it('test_complement', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L781-L788
          // v3.1.0

          function f() { eval_equal(func_parse("complement(#abc)"), '"#ccbbaa"', {}, done) }
          function e() { eval_equal(func_parse("complement(red)"), '"aqua"', {}, f) }
          function d() { eval_equal(func_parse("complement(aqua)"), '"red"', {}, e) }
          function c() { eval_equal(func_parse("complement(white)"), '"white"', {}, d) }
          function b() { eval_equal(func_parse("complement(black)"), '"black"', {}, c) }
          eval_equal(func_parse("complement($color: black)"), '"black"', {}, b)
        });

        it('test_keyword_args_rgba_with_extra_args', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L982-L986
          // v3.1.0

          eval_err(func_parse("rgba($red: 255, $green: 255, $blue: 255, $alpha: 0.5, $extra: error)"), 'Function rgba doesn\'t take an argument named $extra', {}, done);
        });

        it('test_complement', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L781-L788
          // v3.1.0

          function f() { eval_equal(func_parse("complement(#abc)"), '"#ccbbaa"', {}, done) }
          function e() { eval_equal(func_parse("complement(red)"), '"aqua"', {}, f) }
          function d() { eval_equal(func_parse("complement(aqua)"), '"red"', {}, e) }
          function c() { eval_equal(func_parse("complement(white)"), '"white"', {}, d) }
          function b() { eval_equal(func_parse("complement(black)"), '"black"', {}, c) }
          eval_equal(func_parse("complement($color: black)"), '"black"', {}, b)
        });

        it('test_string_interpolation-2', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L37-L41
          // v3.1.0

          function c() { eval_equal(func_parse("foo#{1 + 1}bar"), '"foo2bar"', {}, done) }
          function b() { eval_equal(func_parse("foo#{1 + 1}bar"), '"foo2bar"', {}, c)}
          eval_equal(func_parse("foo#{1 + \\\"bar#{2 + 3}baz\\\" + 4}bang"), '"foo1bar5baz4bang"', {}, b)
        });

        it('test_rgba_rounding', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L82-L84
          // v3.1.0

          eval_equal(func_parse("rgba(10.0, 1.23456789, 0.0, 0.1234567)"), '"rgba(10, 1, 0, 0.123)"', {}, done)
        });

        it('test_media_directive_with_keywords', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L480-L489
          // v3.1.0

          function second() {
            parses("@media screen and (-webkit-min-device-pixel-ratio:0) {\n  a: b; }\n", {syntax: 'scss'}, done)
          }

          parses("@media only screen, print and (foo: 0px) and (bar: flam(12px solid)) {\n  a: b; }\n", {syntax: 'scss'}, second)
        });

        it('test_summarized_selectors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L592-L635
          // v3.2.0

          function ap(){parses('E ~ F {\n  a: b; }\n',{syntax: 'scss'}, done)}
          function ao(){parses('E + F {\n  a: b; }\n',{syntax: 'scss'},ap)}
          function an(){parses('E > F {\n  a: b; }\n',{syntax: 'scss'},ao)}
          function am(){parses('E F {\n  a: b; }\n',{syntax: 'scss'},an)}
          function al(){parses('E:not(s) {\n  a: b; }\n',{syntax: 'scss'},am)}
          function ak(){parses('E#myid {\n  a: b; }\n',{syntax: 'scss'},al)}
          function aj(){parses('E.warning {\n  a: b; }\n',{syntax: 'scss'},ak)}
          function ai(){parses('E::after {\n  a: b; }\n',{syntax: 'scss'},aj)}
          function ah(){parses('E::before {\n  a: b; }\n',{syntax: 'scss'},ai)}
          function ag(){parses('E::first-letter {\n  a: b; }\n',{syntax: 'scss'},ah)}
          function af(){parses('E::first-line {\n  a: b; }\n',{syntax: 'scss'},ag)}
          function ae(){parses('E:checked {\n  a: b; }\n',{syntax: 'scss'},af)}
          function ad(){parses('E:disabled {\n  a: b; }\n',{syntax: 'scss'},ae)}
          function ac(){parses('E:enabled {\n  a: b; }\n',{syntax: 'scss'},ad)}
          function ab(){parses('E:lang(fr) {\n  a: b; }\n',{syntax: 'scss'},ac)}
          function aa(){parses('E:target {\n  a: b; }\n',{syntax: 'scss'},ab)}
          function z(){parses('E:focus {\n  a: b; }\n',{syntax: 'scss'},aa)}
          function y(){parses('E:hover {\n  a: b; }\n',{syntax: 'scss'},z)}
          function x(){parses('E:active {\n  a: b; }\n',{syntax: 'scss'},y)}
          function w(){parses('E:visited {\n  a: b; }\n',{syntax: 'scss'},x)}
          function v(){parses('E:link {\n  a: b; }\n',{syntax: 'scss'},w)}
          function u(){parses('E:empty {\n  a: b; }\n',{syntax: 'scss'},v)}
          function t(){parses('E:only-of-type {\n  a: b; }\n',{syntax: 'scss'},u)}
          function s(){parses('E:only-child {\n  a: b; }\n',{syntax: 'scss'},t)}
          function r(){parses('E:last-of-type {\n  a: b; }\n',{syntax: 'scss'},s)}
          function q(){parses('E:first-of-type {\n  a: b; }\n',{syntax: 'scss'},r)}
          function p(){parses('E:last-child {\n  a: b; }\n',{syntax: 'scss'},q)}
          function o(){parses('E:first-child {\n  a: b; }\n',{syntax: 'scss'},p)}
          function n(){parses('E:nth-last-of-type(n) {\n  a: b; }\n',{syntax: 'scss'},o)}
          function m(){parses('E:nth-of-type(n) {\n  a: b; }\n',{syntax: 'scss'},n)}
          function l(){parses('E:nth-last-child(n) {\n  a: b; }\n',{syntax: 'scss'},m)}
          function k(){parses('E:nth-child(n) {\n  a: b; }\n',{syntax: 'scss'},l)}
          function j(){parses('E:root {\n  a: b; }\n',{syntax: 'scss'},k)}
          function i(){parses('E[foo|="en"] {\n  a: b; }\n',{syntax: 'scss'},j)}
          function h(){parses('E[foo*="bar"] {\n  a: b; }\n',{syntax: 'scss'},i)}
          function g(){parses('E[foo$="bar"] {\n  a: b; }\n',{syntax: 'scss'},h)}
          function f(){parses('E[foo^="bar"] {\n  a: b; }\n',{syntax: 'scss'},g)}
          function e(){parses('E[foo~="bar"] {\n  a: b; }\n',{syntax: 'scss'},f)}
          function d(){parses('E[foo="bar"] {\n  a: b; }\n',{syntax: 'scss'},e)}
          function c(){parses('E[foo] {\n  a: b; }\n',{syntax: 'scss'},d)}
          function b(){parses('E {\n  a: b; }\n',{syntax: 'scss'},c)}

          parses('* {\n  a: b; }\n',{syntax: 'scss'},b)
        });

        it('test_lonely_selectors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L639-L676
          // v3.1.0

          function aj(){parses(':not(s) {\n  a: b; }\n',{ syntax:'scss'}, done)}
          function ai(){parses('#myid {\n  a: b; }\n',{ syntax:'scss'},aj)}
          function ah(){parses('.warning {\n  a: b; }\n',{ syntax:'scss'},ai)}
          function ag(){parses('::after {\n  a: b; }\n',{ syntax:'scss'},ah)}
          function af(){parses('::before {\n  a: b; }\n',{ syntax:'scss'},ag)}
          function ae(){parses('::first-letter {\n  a: b; }\n',{ syntax:'scss'},af)}
          function ad(){parses('::first-line {\n  a: b; }\n',{ syntax:'scss'},ae)}
          function ac(){parses(':checked {\n  a: b; }\n',{ syntax:'scss'},ad)}
          function ab(){parses(':disabled {\n  a: b; }\n',{ syntax:'scss'},ac)}
          function aa(){parses(':enabled {\n  a: b; }\n',{ syntax:'scss'},ab)}
          function z(){parses(':lang(fr) {\n  a: b; }\n',{ syntax:'scss'},aa)}
          function y(){parses(':target {\n  a: b; }\n',{ syntax:'scss'},z)}
          function x(){parses(':focus {\n  a: b; }\n',{ syntax:'scss'},y)}
          function w(){parses(':hover {\n  a: b; }\n',{ syntax:'scss'},x)}
          function v(){parses(':active {\n  a: b; }\n',{ syntax:'scss'},w)}
          function u(){parses(':visited {\n  a: b; }\n',{ syntax:'scss'},v)}
          function t(){parses(':link {\n  a: b; }\n',{ syntax:'scss'},u)}
          function s(){parses(':empty {\n  a: b; }\n',{ syntax:'scss'},t)}
          function r(){parses(':only-of-type {\n  a: b; }\n',{ syntax:'scss'},s)}
          function q(){parses(':only-child {\n  a: b; }\n',{ syntax:'scss'},r)}
          function p(){parses(':last-of-type {\n  a: b; }\n',{ syntax:'scss'},q)}
          function o(){parses(':first-of-type {\n  a: b; }\n',{ syntax:'scss'},p)}
          function n(){parses(':last-child {\n  a: b; }\n',{ syntax:'scss'},o)}
          function m(){parses(':first-child {\n  a: b; }\n',{ syntax:'scss'},n)}
          function l(){parses(':nth-last-of-type(n) {\n  a: b; }\n',{ syntax:'scss'},m)}
          function k(){parses(':nth-of-type(n) {\n  a: b; }\n',{ syntax:'scss'},l)}
          function j(){parses(':nth-last-child(n) {\n  a: b; }\n',{ syntax:'scss'},k)}
          function i(){parses(':nth-child(n) {\n  a: b; }\n',{ syntax:'scss'},j)}
          function h(){parses(':root {\n  a: b; }\n',{ syntax:'scss'},i)}
          function g(){parses('[foo|="en"] {\n  a: b; }\n',{ syntax:'scss'},h)}
          function f(){parses('[foo*="bar"] {\n  a: b; }\n',{ syntax:'scss'},g)}
          function e(){parses('[foo$="bar"] {\n  a: b; }\n',{ syntax:'scss'},f)}
          function d(){parses('[foo^="bar"] {\n  a: b; }\n',{ syntax:'scss'},e)}
          function c(){parses('[foo~="bar"] {\n  a: b; }\n',{ syntax:'scss'},d)}
          function b(){parses('[foo="bar"] {\n  a: b; }\n',{ syntax:'scss'},c)}

          parses('[foo] {\n  a: b; }\n',{syntax: 'scss'},b)
        });

        it('test_css_import_directive', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L265-L271
          // v3.1.0

          function e(){equal('@import url(foo.css);',"@import url(foo.css);\n",{syntax: 'scss'},done)}
          function d(){equal("@import url('foo.css');","@import url('foo.css');\n",{syntax: 'scss'},e)}
          function c(){equal('@import url("foo.css");',"@import url(\"foo.css\");\n",{syntax: 'scss'},d)}
          function b(){equal("@import 'foo.css';","@import url(foo.css);\n",{syntax: 'scss'},c)}
          equal('@import "foo.css";',"@import url(foo.css);\n",{syntax: 'scss'}, b)
        });

        it('test_mixin_defs_only_at_toplevel', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L870-L879
          // v3.1.0

          err_message("foo {\n  @mixin bar {a: b}}\n", 'Mixins may only be defined at the root of a document.', {syntax: 'scss'}, done)
        });

        it('test_no_interpolation_in_media_queries', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1070-L1078
          // v3.1.0

          err_message("@media screen and (min-width: #{100}px) {\n  foo {bar: baz}\n}\n", "Invalid CSS after \"...nd (min-width: \": expected expression (e.g. 1px, bold), was \"#{100}px) {\"", {syntax: 'scss'}, done)
        });

        it('test_no_interpolation_in_unrecognized_directives', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1080-L1088
          // v3.1.0

          err_message("@foo #{100} {\n  foo {bar: baz}\n}\n", "Invalid CSS after \"@foo \": expected selector or at-rule, was \"#{100} {\"", {syntax: 'scss'}, done)
        });

        it('test_import_directive', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L491-L497
          // v3.1.0

          function third() {parses('@import url(foo.css);', {syntax: 'scss'}, done) }
          function second() {parses("@import url('foo.css');", {syntax: 'scss'}, third) }
          parses('@import url("foo.css");', {syntax: 'scss'}, second)
        });

        it('test_nested_media_around_properties', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1967-L1992
          // v3.1.0

          var css = ".outside {\n  color: red;\n  background: blue; }\n  @media print {\n    .outside {\n      color: black; } }\n    @media print and nested {\n      .outside .inside {\n        border: 1px solid black; } }\n  .outside .middle {\n    display: block; }\n";
          var scss = ".outside\n  color: red\n  @media print\n    color: black\n    .inside\n      @media nested\n        border: 1px solid black\n  background: blue\n  .middle\n    display: block\n";
          equal(scss, css, {syntax: 'sass'}, done)
        });

        it('test_number_printing', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L487-L495
          // v3.1.0

          function i() { eval_equal(func_parse("1"), '"1"', {}, done) }
          function h() { eval_equal(func_parse("1.0"), '"1"', {}, i) }
          function g() { eval_equal(func_parse("1.1214"), '"1.121"', {}, h) }
          function f() { eval_equal(func_parse("1.1215"), '"1.122"', {}, g) }
          function e() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1.0/0.0", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).value', 'Infinity', {}, f) }
          function d() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("-1.0/0.0", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).value', '-Infinity', {}, e) }
          eval_equal('Number.isNaN(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("0.0/0.0", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).value)', 'true', {}, d)
        });

        it('test_id_unification', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L201-L225
          // v3.1.0

          function third() {
            var css = ".foo.bar, .bar#baz {\n  a: b; }\n";
            var scss = ".foo.bar {a: b}\n#baz {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, done)
          }

          function second() {
            var css = "#baz {\n  a: b; }\n";
            var scss = ".foo#baz {a: b}\n#baz {@extend .foo}\n";

            equal(scss, css, {syntax: 'scss'}, third)
          }

          var css = ".foo.bar, .bar#baz {\n  a: b; }\n";
          var scss = ".foo.bar {a: b}\n#baz {@extend .foo}";
          equal(scss, css, {syntax: 'scss'}, second)
        });

      }

      if (semver.lt(window.__libVersion, "3.2.7")) {
        it('test_unary_ops', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L415-L429
          // v3.1.0

          var css = "foo {\n  a: -0.5em;\n  b: 0.5em;\n  c: -foo(12px);\n  d: +foo(12px); }\n";
          var scss = "foo {\n  a: -0.5em;\n  b: +0.5em;\n  c: -foo(12px);\n  d: +foo(12px); }\n";

          equal(scss, css, {syntax: 'scss'}, done)
        });
      }

      if (semver.lt(window.__libVersion, "3.2.10")) {
        // exclimation point stripping was removed in 3.2.10
        it('test_loud_comment_in_compressed_mode', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1538-L1550
          // v3.1.0

          var css = "foo{color:blue;/* foo\n * bar\n */}\n";
          var scss = "foo\n  color: blue\n  /*! foo\n   * bar\n   */\n";
          equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
        })

        it('test_loud_comment_interpolations_can_be_escaped', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L2283-L2294
          // v3.1.0

          function second() {
            var css = "/* \#{foo} */\n";
            var scss = "/*! \\#{foo}\n";
            equal(scss, css, {syntax: 'sass'}, done)
          }

          var css = "/* #{foo} */\n";
          var scss = "/* \\\#{foo}\n";
          equal(scss, css, {syntax: 'sass'}, done)
        });

        // test was renamed in 3.2.10
        it('test_nested_extender_with_early_child_selectors_doesnt_subseq_them', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1127-L1143
          // v3.1.0

          function second() {
            var css = ".bap > .bip .foo, .bap > .bip .bap > .grip .bar, .bap > .grip .bap > .bip .bar {\n  a: b; }\n";
            var scss = ".bap > .bip .foo {a: b}\n.bap > .grip .bar {@extend .foo}\n";
            equal(scss, css, {syntax: 'scss'}, done)
          }

          var css = ".bip > .bap .foo, .bip > .bap .grip > .bap .bar, .grip > .bap .bip > .bap .bar {\n  a: b; }\n";
          var scss = ".bip > .bap .foo {a: b}\n.grip > .bap .bar {@extend .foo}\n";
          equal(scss, css, {syntax: 'scss'}, second)
        })

        it('test_hsla_checks_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L102-L107
          // v3.1.0

          function fourth() {eval_err(func_parse('hsla(\\"foo\\", 10, 12, 0.3)'), "\"foo\" is not a number", {}, done)};
          function third() {eval_err(func_parse('hsla(10, \\"foo\\", 12, 0)'), "\"foo\" is not a number", {}, fourth)};
          function second() {eval_err(func_parse('hsla(10, 10, \\"foo\\", 1)'), "\"foo\" is not a number", {}, third)};
          eval_err(func_parse('hsla(10, 10, 10, \\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_percentage_checks_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L116-L120
          // v3.1.0

          function third() {eval_err(func_parse('percentage(\\"string\\")'), "\"string\" is not a unitless number", {}, done)};
          function second() {eval_err(func_parse("percentage(#ccc)"), "#cccccc is not a unitless number", {}, third)};
          eval_err(func_parse("percentage(25px)"), "25px is not a unitless number", {}, second);
        });

        it('test_round', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L122-L129
          // v3.1.0

          function fifth() {eval_equal(func_parse("round(4.8)"), '"5"', {}, done)}
          function fourth() {eval_equal(func_parse("round(4.8px)"), '"5px"', {}, fifth)}
          function third() {eval_equal(func_parse("round(5.49px)"), '"5px"', {}, fourth)}
          function second() { eval_equal(func_parse("round($value: 5.49px)"), '"5px"', {}, third) }
          eval_err(func_parse("round(#ccc)"), "#cccccc is not a number", {}, second);
        });

        it('test_floor', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L131-L137
          // v3.1.0

          function fourth() {eval_equal(func_parse("floor(4.8)"), '"4"', {}, done)}
          function third() {eval_equal(func_parse("floor(4.8px)"), '"4px"', {}, fourth)}
          function second() { eval_equal(func_parse("floor($value: 4.8px)"), '"4px"', {}, third) }
          eval_err(func_parse('floor(\\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_ceil', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L139-L145
          // v3.1.0

          function fourth() {eval_equal(func_parse("ceil(4.1)"), '"5"', {}, done)}
          function third() {eval_equal(func_parse("ceil(4.8px)"), '"5px"', {}, fourth)}
          function second() { eval_equal(func_parse("ceil($value: 4.8px)"), '"5px"', {}, third) }
          eval_err(func_parse('ceil(\\"a\\")'), "\"a\" is not a number", {}, second);
        });

        it('test_abs', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L147-L155
          // v3.1.0

          function sixth() {eval_equal(func_parse("abs(-5)"), '"5"', {}, done)}
          function fifth() {eval_equal(func_parse("abs(-5px)"), '"5px"', {}, sixth)}
          function fourth() {eval_equal(func_parse("abs(5)"), '"5"', {}, fifth)}
          function third() {eval_equal(func_parse("abs(5px)"), '"5px"', {}, fourth)}
          function second() { eval_equal(func_parse("abs($value: 5px)"), '"5px"', {}, third) }
          eval_err(func_parse('abs(#aaa)'), "#aaaaaa is not a number", {}, second);
        });

        it('test_rgb_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
          // v3.1.0

          function third() {eval_err(func_parse('rgb(\\"foo\\", 10, 12)'), '\"foo\" is not a number', {}, done)};
          function second() {eval_err(func_parse('rgb(10, \\"foo\\", 12)'), '\"foo\" is not a number', {}, third)};
          eval_err(func_parse('rgb(10, 10, \\"foo\\")'), '\"foo\" is not a number', {}, second);
        });

        it('test_rgba_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
          // v3.1.0

          function fourth() {eval_err(func_parse('rgba(10, 10, 10, \\"foo\\")'), "\"foo\" is not a number", {}, done)};
          function third() {eval_err(func_parse('rgba(10, 10, \\"foo\\", 0)'), "\"foo\" is not a number", {}, fourth)};
          function second() {eval_err(func_parse('rgba(10, \\"foo\\", 12, 0.1)'), "\"foo\" is not a number", {}, third)};
          eval_err(func_parse('rgba(\\"foo\\", 10, 12, 0.2)'), "\"foo\" is not a number", {}, second);
        });

        it('test_rgba_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L223-L228
          // v3.1.0

          function fourth() {eval_err(func_parse('rgba(\\"foo\\", 10, 12, 0.2)'), '\"foo\" is not a number', {}, done)}
          function third() {eval_err(func_parse('rgba(10, \\"foo\\", 12, 0.1)'), '\"foo\" is not a number', {}, fourth)}
          function second() { eval_err(func_parse('rgba(10, 10, \\"foo\\", 0)'), '\"foo\" is not a number', {}, third) }
          eval_err(func_parse('rgba(10, 10, 10, \\"foo\\")'), '\"foo\" is not a number', {}, second)
        });

        it('test_rgba_with_color_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L236-L239
          // v3.1.0

          function second() { eval_err(func_parse('rgba(\\"foo\\", 0.2)'), '\"foo\" is not a color', {}, done) }
          eval_err(func_parse('rgba(blue, \\"foo\\")'), '\"foo\" is not a number', {}, second)
        });

        it('test_red_exception', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L253-L255
          // v3.1.0

          eval_err(func_parse('red(12)'), "12 is not a color", {}, done);
        });

        it('test_green_exception', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L262-L264
          // v3.1.0

          eval_err(func_parse('green(12)'), "12 is not a color", {}, done);
        });

        it('test_blue_exception', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L271-L273
          // v3.1.0

          eval_err(func_parse('blue(12)'), "12 is not a color", {}, done);
        });

        it('test_saturation_exception', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L290-L292
          // v3.1.0

          eval_err(func_parse('saturation(12)'), "12 is not a color", {}, done);
        });

        it('test_lightness_exception', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L300-L302
          // v3.1.0

          eval_err(func_parse('lightness(12)'), "12 is not a color", {}, done);
        });

        it('test_alpha_exception', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L311-L313
          // v3.1.0

          eval_err(func_parse('alpha(12)'), "12 is not a color", {}, done);
        });

        it('test_opacify_tests_bounds', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L333-L336
          // v3.1.0

          function second() {eval_err(func_parse('opacify(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
          eval_err(func_parse('opacify(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_transparentize_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L356-L359
          // v3.1.0

          function second() {eval_err(func_parse('transparentize(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
          eval_err(func_parse('transparentize(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_lighten_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L378-L381
          // v3.1.0

          function second() {eval_err(func_parse('lighten(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
          eval_err(func_parse('lighten(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_darken_tests_bounds', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L393-L398
          // v3.1.0

          function second() {eval_err(func_parse('darken(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
          eval_err(func_parse('darken(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_saturate_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L423-L426
          // v3.1.0

          function second() {eval_err(func_parse('saturate(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
          eval_err(func_parse('saturate(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_desaturate_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L446-L449
          // v3.1.0

          function second() {eval_err(func_parse('desaturate(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
          eval_err(func_parse('desaturate(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
        });

        it('test_adjust_color_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L522-L541
          // v3.1.0

          function eighth() {eval_err(func_parse('adjust-color(foo, $hue: 10)'), "\"foo\" is not a color", {}, done)}
          function seventh() {eval_err(func_parse('adjust-color(blue, $hue: foo)'), "$hue: \"foo\" is not a number", {}, eighth)}
          function sixth() {eval_err(func_parse('adjust-color(blue, $saturation: foo)'), "$saturation: \"foo\" is not a number", {}, seventh)}
          function fifth() {eval_err(func_parse('adjust-color(blue, $lightness: foo)'), "$lightness: \"foo\" is not a number", {}, sixth)}
          function fourth() {eval_err(func_parse('adjust-color(blue, $red: foo)'), "$red: \"foo\" is not a number", {}, fifth)}
          function third() {eval_err(func_parse('adjust-color(blue, $green: foo)'), "$green: \"foo\" is not a number", {}, fourth)}
          function second() {eval_err(func_parse('adjust-color(blue, $blue: foo)'), "$blue: \"foo\" is not a number", {}, third)}
          eval_err(func_parse('adjust-color(blue, $alpha: foo)'), "$alpha: \"foo\" is not a number", {}, second);
        });

        it('test_scale_color_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L628-L645
          // v3.1.0

          function g() {eval_err(func_parse('scale-color(foo, $red: 10%)'), "\"foo\" is not a color", {}, done)}
          function f() {eval_err(func_parse('scale-color(blue, $saturation: foo)'), "$saturation: \"foo\" is not a number", {}, g)}
          function e() {eval_err(func_parse('scale-color(blue, $lightness: foo)'), "$lightness: \"foo\" is not a number", {}, f)}
          function d() {eval_err(func_parse('scale-color(blue, $red: foo)'), "$red: \"foo\" is not a number", {}, e)}
          function c() {eval_err(func_parse('scale-color(blue, $green: foo)'), "$green: \"foo\" is not a number", {}, d)}
          function b() {eval_err(func_parse('scale-color(blue, $blue: foo)'), "$blue: \"foo\" is not a number", {}, c)}
          eval_err(func_parse('scale-color(blue, $alpha: foo)'), "$alpha: \"foo\" is not a number", {}, b);
        });

        it('test_change_color_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L699-L712
          // v3.1.0

          function g() {eval_err(func_parse('change-color(blue, $alpha: foo)'), "$alpha: \"foo\" is not a number", {}, done)}
          function f() {eval_err(func_parse('change-color(blue, $blue: foo)'), "$blue: \"foo\" is not a number", {}, g)}
          function e() {eval_err(func_parse('change-color(blue, $green: foo)'), "$green: \"foo\" is not a number", {}, f)}
          function d() {eval_err(func_parse('change-color(blue, $red: foo)'), "$red: \"foo\" is not a number", {}, e)}
          function c() {eval_err(func_parse('change-color(blue, $lightness: foo)'), "$lightness: \"foo\" is not a number", {}, d)}
          function b() {eval_err(func_parse('change-color(blue, $saturation: foo)'), "$saturation: \"foo\" is not a number", {}, c)}
          eval_err(func_parse('change-color(foo, $red: 10%)'), "\"foo\" is not a color", {}, b);
        });

        it('test_change_color_argument_errors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L755-L759
          // v3.1.0

          function c() {eval_err(func_parse('mix(\\"foo\\", #f00, 10%)'), "\"foo\" is not a color", {}, done)}
          function b() {eval_err(func_parse('mix(#f00, \\"foo\\", 10%)'), "\"foo\" is not a color", {}, c)}
          eval_err(func_parse('mix(#f00, #baf, \\"foo\\")'), '"foo" is not a number', {}, b);
        });

        it('tets_grayscale_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L777-L779
          // v3.1.0

          eval_err(func_parse('grayscale(\\"foo\\")'), "\"foo\" is not a color", {}, done);
        });

        it('tets_complement_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L790-L792
          // v3.1.0

          eval_err(func_parse('complement(\\"foo\\")'), "\"foo\" is not a color", {}, done);
        });

        it('test_invert_tests_types', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L799-L801
          // v3.1.0

          eval_err(func_parse('invert(\\"foo\\")'), "\"foo\" is not a color", {}, done);
        });

        it('test_quote_tests_type', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L815-L817
          // v3.1.0

          eval_err(func_parse('quote(#f00)'), "#ff0000 is not a string", {}, done);
        });

        it('test_unitless', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L856-L861
          // v3.1.0

          function d() {eval_equal(func_parse("unitless(100)"), '"true"', {}, done)}
          function c() { eval_equal(func_parse("unitless(100px)"), '"false"', {}, d) }
          function b() { eval_equal(func_parse("unitless($number: 100px)"), '"false"', {}, c) }
          eval_err(func_parse('unitless(#f00)'), "#ff0000 is not a number", {}, b);
        });

        it('test_comparable', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L863-L870
          // v3.1.0

          function f() { eval_equal(func_parse("comparable($number-1: 100px, $number-2: 3em)"), '"false"', {}, done) }
          function e() {eval_equal(func_parse("comparable(2px, 1px)"), '"true"', {}, f)}
          function d() { eval_equal(func_parse("comparable(10cm, 3mm)"), '"true"', {}, e)}
          function c() { eval_equal(func_parse("comparable(100px, 3em)"), '"false"', {}, d) }
          function b() {eval_err(func_parse('comparable(#f00, 1px)'), "#ff0000 is not a number", {}, c);}
          eval_err(func_parse('comparable(1px, #f00)'), "#ff0000 is not a number", {}, b);
        });

      }

      if (semver.lt(window.__libVersion, "3.3.0")) {
        // test was modified in 3.3.0
        it('test_while', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1255-L1278
          // v3.1.0

          var css = "a-5 {\n  blooble: gloop; }\n\na-4 {\n  blooble: gloop; }\n\na-3 {\n  blooble: gloop; }\n\na-2 {\n  blooble: gloop; }\n\na-1 {\n  blooble: gloop; }\n";
          var scss = "$a: 5\n@while $a != 0\n  a-#{$a}\n    blooble: gloop\n  $a: $a - 1\n";
          equal(scss, css, {syntax: 'sass'}, done)
        })

        it('test_variable_reassignment', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1343-L1355
          // v3.1.0

          var css = "a {\n  b: 1;\n  c: 2; }\n";
          var scss = "$a: 1\na\n  b: $a\n  $a: 2\n  c: $a\n";
          equal(scss, css, {syntax: 'sass'}, done)
        })

        it('test_hyphen_underscore_insensitive_variables', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1382-L1403
          // v3.1.0

          var css = "a {\n  b: c; }\n\nd {\n  e: 13;\n  f: foobar; }\n";
          var scss = "$var-hyphen: 12\n$var_under: foo\na\n  $var_hyphen: 1 + $var_hyphen\n  $var-under: $var-under + bar\n  b: c\nd\n  e: $var-hyphen\n  f: $var_under\n";
          equal(scss, css, {syntax: 'sass'}, done)
        })

        it('test_percentage', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L109-L114
          // v3.1.0

          function fourth() {eval_equal(func_parse("percentage(.5)"), '"50%"', {}, done)}
          function third() {eval_equal(func_parse("percentage(1)"), '"100%"', {}, fourth)}
          function second() { eval_equal(func_parse("percentage($value: 0.5)"), '"50%"', {}, third) }
          eval_equal(func_parse("percentage(25px / 100px)"), '"25%"', {}, second)
        });

        it('test_transparentize', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L338-L347
          // v3.1.0

          function eigth() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.5), 0.2)"), '"rgba(0, 0, 0, 0.3)"', {}, done) }
          function seventh() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.2), 0.1)"), '"rgba(0, 0, 0, 0.1)"', {}, eigth) }
          function sixth() { eval_equal(func_parse("fade-out(rgba(0, 0, 0, 0.5), 0.3px)"), '"rgba(0, 0, 0, 0.2)"', {}, seventh) }
          function fifth() { eval_equal(func_parse("fade_out(rgba(0, 0, 0, 0.2), 0.2)"), '"rgba(0, 0, 0, 0)"', {}, sixth) }
          function fourth() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.2), 1)"), '"rgba(0, 0, 0, 0)"', {}, fifth) }
          function third() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.2), 0)"), '"rgba(0, 0, 0, 0.2)"', {}, fourth) }
          function second() { eval_equal(func_parse("transparentize($color: rgba(0, 0, 0, 0.2), $amount: 0)"), '"rgba(0, 0, 0, 0.2)"', {}, third) }
          eval_equal(func_parse("fade-out($color: rgba(0, 0, 0, 0.2), $amount: 0)"), '"rgba(0, 0, 0, 0.2)"', {}, second)
        });

        it('test_mix', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L738-L753
          // v3.1.0

          function n() { eval_equal(func_parse("mix(#f00, #00f)"), '"#7f007f"', {}, done) }
          function m() { eval_equal(func_parse("mix(#f00, #0ff)"), '"#7f7f7f"', {}, n) }
          function l() { eval_equal(func_parse("mix(#f70, #0aa)"), '"#7f9055"', {}, m) }
          function k() { eval_equal(func_parse("mix(#f00, #00f, 25%)"), '"#3f00bf"', {}, l) }
          function j() { eval_equal(func_parse("mix(rgba(255, 0, 0, 0.5), #00f)"), '"rgba(63, 0, 191, 0.75)"', {}, k) }
          function i() { eval_equal(func_parse("mix(#f00, #00f, 100%)"), '"red"', {}, j) }
          function h() { eval_equal(func_parse("mix(#f00, #00f, 0%)"), '"blue"', {}, i) }
          function g() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1))"), '"rgba(255, 0, 0, 0.5)"', {}, h) }
          function f() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f)"), '"rgba(0, 0, 255, 0.5)"', {}, g) }
          function e() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1), 100%)"), '"red"', {}, f) }
          function d() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f, 0%)"), '"blue"', {}, e) }
          function c() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1), 0%)"), '"rgba(0, 0, 255, 0)"', {}, d) }
          function b() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f, 100%)"), '"rgba(255, 0, 0, 0)"', {}, c) }
          eval_equal(func_parse("mix($color-1: transparentize(#f00, 1), $color-2: #00f, $weight: 100%)"), '"rgba(255, 0, 0, 0)"', {}, b)
        });

        it('test_nth', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L882-L894
          // v3.1.0

          function k() { eval_err(func_parse("nth((), 1)"), 'List index is 1 but list has no items', {}, done) }
          function j() { eval_err(func_parse("nth(foo, 0)"), 'List index 0 must be greater than or equal to 1', {}, k) }
          function i() { eval_err(func_parse("nth(foo, -10)"), 'List index -10 must be greater than or equal to 1', {}, j) }
          function h() { eval_err(func_parse("nth(foo, 1.5)"), 'List index 1.5 must be an integer', {}, i) }
          function g() { eval_err(func_parse("nth(1 2 3 4, 5)"), 'List index is 5 but list is only 4 items long', {}, h) }
          function f() { eval_err(func_parse("nth(foo, 2)"), 'List index is 2 but list is only 1 item long', {}, g) }
          function e() {eval_equal(func_parse("nth(foo (bar baz) bang, 2)"), '"bar baz"', {}, f)}
          function d() { eval_equal(func_parse("nth(foo, 1)"), '"foo"', {}, e)}
          function c() { eval_equal(func_parse("nth((1, 2, 3), 3)"), '"3"', {}, d) }
          function b() {eval_equal(func_parse("nth(1 2 3, 2)"), '"2"', {}, c);}
          eval_equal(func_parse("nth(1 2 3, 1)"), '"1"', {}, b)
        });

        it('test_rgba_color_literals', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L49-L60
          // v3.1.0

          function h() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("rgba(1, 2, 3, 0.75)", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$eq(Opal.Sass.$$scope.Script.$$scope.Color.$new([1, 2, 3, 0.75])).value', 'true', {}, done)}
          function g() { eval_equal(func_parse("rgba(1, 2, 3, 0.75)"), '"rgba(1, 2, 3, 0.75)"', {}, h) }
          function f() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("rgba(1, 2, 3, 0)", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$eq(Opal.Sass.$$scope.Script.$$scope.Color.$new([1, 2, 3, 0])).value', 'true', {}, g)}
          function e() { eval_equal(func_parse("rgba(1, 2, 3, 0)"), '"rgba(1, 2, 3, 0)"', {}, f) }
          function d() { eval_equal(func_parse("rgba(1, 2, 3, 1)"), 'Opal.Sass.$$scope.Script.$$scope.Color.$new([1, 2, 3]).$inspect()', {}, e) }
          function c() { eval_equal(func_parse("rgba(1, 2, 3, 1)"), 'Opal.Sass.$$scope.Script.$$scope.Color.$new([1, 2, 3, 1]).$inspect()', {}, d) }
          function b() { eval_equal(func_parse("rgba(1, 2, 3, 1)"), '"#010203"', {}, c)}
          eval_equal(func_parse("rgba(255, 255, 255, 1)"), '"white"', {}, b)
        });

        it('test_implicit_strings', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L104-L107
          // v3.1.0

          function h() { eval_equal('Opal.Sass.$$scope.Script.$$scope.String.$new("foo").$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("foo", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).value', 'true', {}, done) }
          eval_equal('Opal.Sass.$$scope.Script.$$scope.String.$new("foo/bar").$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("foo/bar", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).value', 'true', {}, h)
        });

        it('test_dynamic_url', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L223-L228
          // v3.1.0

          function d() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('foo', 'foo-bar');Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url($foo)', 0, 0).$perform(env).$to_s()", '"url(foo-bar)"', {}, done) }
          function c() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('foo',Opal.Sass.$$scope.Script.$$scope.String.$new('foo-bar'));env.$set_var('bar',Opal.Sass.$$scope.Script.$$scope.String.$new('baz'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url($foo $bar)', 0, 0).$perform(env).$to_s()", '"url(foo-bar baz)"', {}, d)}
          function b() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('bar',Opal.Sass.$$scope.Script.$$scope.String.$new('baz'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url(foo $bar)', 0, 0).$perform(env).$to_s()", '"url(foo baz)"', {}, c) }
          eval_equal(func_parse("url(foo    bar)"), '"url(foo bar)"', {}, b)
        });

        it('test_hyphenated_variables', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L237-L239
          // v3.1.0

          eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('a-b',Opal.Sass.$$scope.Script.$$scope.String.$new('a-b'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$a-b', 0, 0).$perform(env).$to_s()", '"a-b"', {}, done)
        });

        it('test_equals', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L319-L334
          // v3.1.0

          function m() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'foo\',Opal.Sass.$$scope.Script.$$scope.String.$new(\'foo\'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'"foo" == $foo\', 0, 0).$perform(env).$to_s()', '"true"', {}, done) }
          function l() { eval_equal(func_parse("1 == 1.0"), '"true"', {}, m) }
          function k() { eval_equal(func_parse("false != true"), '"true"', {}, l) }
          function j() { eval_equal(func_parse("1em == 1px"), '"false"', {}, k) }
          function i() { eval_equal(func_parse("12 != 12"), '"false"', {}, j) }
          function h() { eval_equal(func_parse("(foo bar baz) == (foo bar baz)"), '"true"', {}, i) }
          function g() { eval_equal(func_parse("(foo, bar, baz) == (foo, bar, baz)"), '"true"', {}, h) }
          function f() { eval_equal(func_parse("((1 2), (3, 4), (5 6)) == ((1 2), (3, 4), (5 6))"), '"true"', {}, g) }
          function e() { eval_equal(func_parse("((1 2), (3 4)) == (1 2, 3 4)"), '"true"', {}, f) }
          function d() { eval_equal(func_parse("((1 2) 3) == (1 2 3)"), '"false"', {}, e) }
          function c() { eval_equal(func_parse("(1 (2 3)) == (1 2 3)"), '"false"', {}, d) }
          function b() { eval_equal(func_parse("((1, 2) (3, 4)) == (1, 2 3, 4)"), '"false"', {}, c) }
          eval_equal(func_parse("(1 2 3) == (1, 2, 3)"), '"false"', {}, b)
        });

        it('test_while_directive', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L219-L236
          // v3.1.0

          var css = ".foo {\n  a: 1;\n  a: 2;\n  a: 3;\n  a: 4; }\n";
          var scss = "$i: 1;\n\n.foo {\n  @while $i != 5 {\n    a: $i;\n    $i: $i + 1;\n  }\n}\n";
          equal(scss, css,{syntax: 'scss'}, done)
        });

        it('test_multiple_block_directives', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L556-L564
          // v3.1.0

          var source = "@foo bar {\n  a: b; }\n\n@bar baz {\n  c: d; }\n";

          parses(source, {syntax: 'scss'}, done)
        });

        it('test_block_directive_with_semicolon', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L576-L587
          // v3.1.0

          var css = "@foo {\n  a: b; }\n\n@bar {\n  a: b; }\n";
          var scss = "@foo {a:b};\n@bar {a:b};\n";

          equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_unquote', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L803-L807
          // v3.1.0

          function c() { eval_equal(func_parse('unquote(\\"foo\\")'), '"foo"', {}, done) }
          function b() { eval_equal(func_parse('unquote(foo)'), '"foo"', {}, c) }
          eval_equal(func_parse('unquote($string: foo)'), '"foo"', {}, b)
        });

        it('test_quote', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L809-L813
          // v3.1.0

          function c() { eval_equal(func_parse('quote(\\"foo\\")'), '"\\"foo\\""', {}, done) }
          function b() { eval_equal(func_parse('quote(foo)'), '"\\"foo\\""', {}, c) }
          eval_equal(func_parse('quote($string: foo)'), '"\\"foo\\""', {}, b)
        });

        it('test_ruby_equality', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L241-L249
          // v3.1.0

          function g() { eval_equal(func_parse('foo'), func_parse('foo'), {}, done)}
          function f() { eval_equal(func_parse("1"), func_parse("1.0"), {}, g)}
          function e() { eval_equal(func_parse("1 2 3.0"), func_parse('1 2 3'), {}, f)}
          function d() { eval_equal(func_parse("1, 2, 3.0"), func_parse("1, 2, 3"), {}, e)}
          function c() { eval_equal(func_parse("(1 2), (3, 4), (5 6)"), func_parse("(1 2), (3, 4), (5 6)"), {}, d)}
          function b() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1, 2, 3", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1 2 3", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).value', 'false', {}, c)}
          eval_equal(func_parse("1"), func_parse("1"), {}, b)
        });

        it('test_slash_divides_with_variable', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L384-L388
          // v3.1.0

          function c() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()));Opal.Sass.$$scope.Script.$$scope.Parser.$parse("$var/2px", 0, 0).$perform(env).value',0.5, {}, done) }
          function b() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("2px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()));Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px/$var", 0, 0).$perform(env).value', 0.5, {}, c) }
          eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px/2px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).value);Opal.Sass.$$scope.Script.$$scope.Parser.$parse("$var", 0, 0).$perform(env)', 0.5, {}, b)
        });

      }

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_variable_scope', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1357-L1380
      // v3.1.0

      var css = "a {\n  b-1: c;\n  b-2: c;\n  d: 12; }\n\nb {\n  d: 17; }\n";
      var scss = "$i: 12\na\n  @for $i from 1 through 2\n    b-#{$i}: c\n  d: $i\n=foo\n  $i: 17\nb\n  +foo\n  d: $i\n";
      equal(scss, css, {syntax: 'sass'}, done)
    })

    it('test_basic_extend_loop', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1221-L1232
      // v3.1.0

      var css = ".bar, .foo {\n  a: b; }\n\n.foo, .bar {\n  c: d; }\n";
      var scss = ".foo {a: b; @extend .bar}\n.bar {c: d; @extend .foo}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })

    it('test_three_level_extend_loop', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1234-L1249
      // v3.1.0

      var css = ".baz, .bar, .foo {\n  a: b; }\n\n.foo, .baz, .bar {\n  c: d; }\n\n.bar, .foo, .baz {\n  e: f; }\n";
      var scss = ".foo {a: b; @extend .bar}\n.bar {c: d; @extend .baz}\n.baz {e: f; @extend .foo}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })

    it('test_color_checks_input', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L15-L18
      // v3.1.0

      eval_err(func_parse("rgb($red: 255, $green: 255)"), "Function rgb requires an argument named $blue", {}, done);
    });

    it('test_string_escapes', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L25-L35
      // v3.1.0

      function n() { eval_equal(func_parse("\\\"'\\\""), '"\\\"\'\\\""', {}, done) }
      function m() { eval_equal(func_parse("\\\"\\\\\\\\\\\""), "\'\\\"\\\\\\\\\\\"\'" , {}, n) }
      function l() { eval_equal(func_parse("\\\"\\\\\\\"\\\""), '"\'\\\"\'"', {}, m) }
      function k() { eval_equal(func_parse("\\\"\\\\02fa\\\""), '"\\\"\\\\02fa\\\""', {}, l) }
      function j() { eval_equal(func_parse("\'\\\\'\'"), '"\\\"\'\\\""', {}, k) }
      function i() { eval_equal(func_parse("\'\\\"\'"), '"\'\\\"\'"', {}, j) }
      function h() { eval_equal(func_parse("\\\\\\\\"), '"\\\\\\\\"', {}, i) }
      eval_equal(func_parse("\\\\02fa"), '"\\\\02fa"', {}, h)
    });

    it('test_color_names', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L43-L47
      // v3.1.0

      function c() { eval_equal(func_parse("white"), '"white"', {}, done) }
      function b() { eval_equal(func_parse("#ffffff"), '"white"', {}, c)}
      eval_equal(func_parse("white - #000001"), '"#fffffe"', {}, b)
    });

    it('test_compressed_colors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L86-L96
      // v3.1.0

      function o() {eval_equal(func_parse("This color is #{ white }", {style: 'compressed'}), '"This color is #fff"', {}, done)}
      function n() { eval_equal(func_parse("rgba(1, 2, 3, 0.5)", {style: 'compressed'}), '"rgba(1,2,3,0.5)"', {}, o) }
      function m() { eval_equal(func_parse("#112233", {style: 'compressed'}), '"#123"', {}, n) }
      function l() { eval_equal(func_parse("black", {style: 'compressed'}), '"#000"', {}, m) }
      function k() { eval_equal(func_parse("#f00", {style: 'compressed'}), '"red"', {}, l) }
      function j() { eval_equal(func_parse("#00f", {style: 'compressed'}), '"blue"', {}, k) }
      function i() { eval_equal(func_parse("#000080", {style: 'compressed'}), '"navy"', {}, j) }
      function h() { eval_equal(func_parse("#000080 white", {style: 'compressed'}), '"navy #fff"', {}, i) }
      eval_equal(func_parse("#123456", {style: 'compressed'}), '"#123456"', {}, h)
    });

    it('test_colors_with_wrong_number_of_digits', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L390-L401
      // v3.1.0

      function e() {eval_err(func_parse('#0'), "Colors must have either three or six digits: '#0'", {}, done)}
      function d() {eval_err(func_parse('#12'), "Colors must have either three or six digits: '#12'", {}, e)}
      function c() {eval_err(func_parse('#abcd'), "Colors must have either three or six digits: '#abcd'", {}, d)}
      function b() {eval_err(func_parse('#abcdE'), "Colors must have either three or six digits: '#abcdE'", {}, c)}
      eval_err(func_parse('#abcdEFA'), "Colors must have either three or six digits: '#abcdEFA'", {}, b);
    });

    it('test_case_insensitive_color_names', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L403-L407
      // v3.1.0

      function c() { eval_equal(func_parse("BLUE"), '"blue"', {}, done) }
      function b() { eval_equal(func_parse("rEd"), '"red"', {}, c) }
      eval_equal(func_parse("mix(GrEeN, ReD)"), '"#7f4000"', {}, b)
    });

    it('test_identifiers', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L9-L47
      // v3.1.0

      function ab(){matches('Opal.Sass::SCSS::RX::IDENT', "iden\\\\6000t\\\\6000",{ syntax:'scss'},done)}
      function aa(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\6000ident",{ syntax:'scss'},ab)}
      function z(){matches('Opal.Sass::SCSS::RX::IDENT', "IdE6n-3t0_6",{ syntax:'scss'},aa)}
      function y(){matches('Opal.Sass::SCSS::RX::IDENT', "c\\\\00006Cas\\\\000073",{ syntax:'scss'},z)}
      function x(){matches('Opal.Sass::SCSS::RX::IDENT', "c\\\\lass",{ syntax:'scss'},y)}
      function w(){matches('Opal.Sass::SCSS::RX::IDENT', "f012_23",{ syntax:'scss'},x)}
      function v(){matches('Opal.Sass::SCSS::RX::IDENT', "foo_-_bar",{ syntax:'scss'},w)}
      function u(){matches('Opal.Sass::SCSS::RX::IDENT', "f012-23",{ syntax:'scss'},v)}
      function t(){matches('Opal.Sass::SCSS::RX::IDENT', "foo-bar",{ syntax:'scss'},u)}
      function s(){matches('Opal.Sass::SCSS::RX::IDENT', "_\\\\f oo",{ syntax:'scss'},t)}
      function r(){matches('Opal.Sass::SCSS::RX::IDENT', "_\\xC3\\xBFoo",{ syntax:'scss'},s)}
      function q(){matches('Opal.Sass::SCSS::RX::IDENT', "_foo",{ syntax:'scss'},r)}
      function p(){matches('Opal.Sass::SCSS::RX::IDENT', "-\\\\f oo",{ syntax:'scss'},q)}
      function o(){matches('Opal.Sass::SCSS::RX::IDENT', "-\\xC3\\xBFoo",{ syntax:'scss'},p)}
      function n(){matches('Opal.Sass::SCSS::RX::IDENT', "-foo",{ syntax:'scss'},o)}
      function m(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\\\xC3\\xBFoo",{ syntax:'scss'},n)}
      function l(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\{oo",{ syntax:'scss'},m)}
      function k(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\\\\\oo",{ syntax:'scss'},l)}
      function j(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\~oo",{ syntax:'scss'},k)}
      function i(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\ oo",{ syntax:'scss'},j)}
      function h(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\f13abcoo",{ syntax:'scss'},i)}
      function g(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\f13a\\foo",{ syntax:'scss'},h)}
      function f(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\ff2\\\\roo",{ syntax:'scss'},g)}
      function e(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\fa\\too",{ syntax:'scss'},f)}
      function d(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\f oo",{ syntax:'scss'},e)}
      function c(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\123abcoo",{ syntax:'scss'},d)}
      function b(){matches('Opal.Sass::SCSS::RX::IDENT', "\\xC3\\xBFoo",{ syntax:'scss'},c)}

      matches('Opal.Sass::SCSS::RX::IDENT', 'foo' ,{syntax: 'scss'},b)
    });

    it('test_invalid_identifiers', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L49-L56
      // v3.1.0

      function h(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'back\\\\67\\n round',{ syntax:'scss'},done)}
      function g(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'c\\\\06C  ass',{ syntax:'scss'},h)}
      function f(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'foo~bar',{ syntax:'scss'},g)}
      function e(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'foo bar',{ syntax:'scss'},f)}
      function d(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', '--foo',{ syntax:'scss'},e)}
      function c(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', '-1foo',{ syntax:'scss'},d)}
      function b(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', '1foo',{ syntax:'scss'},c)}
      doesnt_match('Opal.Sass::SCSS::RX::IDENT', '',{syntax: 'scss'},b)
    });

    it('test_nested_rules_with_fancy_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L336-L382
      // v3.1.0

      var css = "foo .bar {\n  a: b; }\nfoo :baz {\n  c: d; }\nfoo bang:bop {\n  e: f; }\n";
      var scss = "foo {\n  .bar {a: b}\n  :baz {c: d}\n  bang:bop {e: f}}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    });

    it('test_no_namespace_properties_without_space_even_when_its_unambiguous', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L595-L608
      // v3.1.0

      err_message("foo {\n  bar:1px {\n    bip: bop }}\n", 'Invalid CSS: a space is required between a property and its definition\nwhen it has other properties nested beneath it.', {syntax: 'scss'}, done)
    });

    it('test_basic_selector_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L736-L755
      // v3.1.0

      function third() {
        var css = "foo.bar baz {\n  a: b; }\n";
        var scss = "#{\"foo\"}.bar baz {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      }

      function second() {
        var css = "foo.bar baz {\n  a: b; }\n";
        var scss = "foo#{\".bar\"} baz {a: b}\n";
        equal(scss, css, {syntax: 'scss'}, third)
      }

      var css = "foo 3 baz {\n  a: b; }\n";
      var scss = "foo #{1 + 2} baz {a: b}\n";
      equal(scss, css, {syntax: 'scss'}, second)
    });

    it('test_uses_rule_exception_with_dot_hack', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L916-L925
      // v3.1.0

      err_message("foo {\n  .bar:baz <fail>; }\n", 'Invalid CSS after "  .bar:baz ": expected "{", was "<fail>; }"', {syntax: 'scss'}, done)
    });

    it('test_post_resolution_selector_error', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1023-L1029
      // v3.1.0

      err_message("\n\nfoo \#{\") bar\"} {a: b}", 'Invalid CSS after "foo ": expected selector, was ") bar"', {syntax: 'scss'}, done)
    });

    it('test_default_values_for_mixin_arguments', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1030-L1067
      // v3.1.0

      function second() {
        var css = "one {\n  color: white;\n  padding: 1px;\n  margin: 4px; }\n\ntwo {\n  color: white;\n  padding: 2px;\n  margin: 5px; }\n\nthree {\n  color: white;\n  padding: 2px;\n  margin: 3px; }\n";
        var scss = "$a: 5px\n=foo($a, $b: 1px, $c: 3px + $b)\n  :color $a\n  :padding $b\n  :margin $c\none\n  +foo(#fff)\ntwo\n  +foo(#fff, 2px)\nthree\n  +foo(#fff, 2px, 3px)\n";
        equal(scss, css, {syntax: 'sass'}, done)
      }

      var css = "white {\n  color: white; }\n\nblack {\n  color: black; }\n"
        var scss = "=foo($a: #FFF)\n  :color $a\nwhite\n  +foo\nblack\n  +foo(#000)\n";
      equal(scss, css, {syntax: 'sass'}, second)
    })

    it('test_namespace_directive', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L455-L459
      // v3.1.0

      function third() {parses('@namespace html url("http://www.w3.org/Profiles/xhtml1-strict");', {syntax: 'scss'}, done)}
      function second() {parses('@namespace url(http://www.w3.org/Profiles/xhtml1-strict);', {syntax: 'scss'}, third)}
      parses('@namespace "http://www.w3.org/Profiles/xhtml1-strict";', {syntax: 'scss'}, second)
    });

    it('test_expression_fallback_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L767-L773
      // v3.1.0

      function e(){parses('"foo" {\n  a: b; }\n',{syntax: 'scss'}, done)}
      function d(){parses('12px {\n  a: b; }\n',{syntax: 'scss'},e)}
      function c(){parses('100% {\n  a: b; }\n',{syntax: 'scss'},d)}
      function b(){parses('60% {\n  a: b; }\n',{syntax: 'scss'},c)}

      parses('0% {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_uses_property_exception_with_star_hack', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L894-L903
      // v3.1.0

      err_message("foo {\n  *bar:baz [fail]; }\n", 'Invalid CSS after "  *bar:baz ": expected /[;}]/, was "[fail]; }"', {syntax: 'scss'}, done)
      });

  it('test_uses_property_exception_with_colon_hack', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L905-L914
    // v3.1.0

    err_message("foo {\n  :bar:baz [fail]; }\n", 'Invalid CSS after "  :bar:baz ": expected /[;}]/, was "[fail]; }"', {syntax: 'scss'}, done)
    });

  it('test_uses_property_exception_with_space_after_name', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L927-L936
    // v3.1.0

    err_message("foo {\n  bar: baz [fail]; }\n", 'Invalid CSS after "  bar: baz ": expected /[;}]/, was "[fail]; }"', {syntax: 'scss'}, done)
    });

  it('test_uses_property_exception_with_non_identifier_after_name', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L938-L947
    // v3.1.0

    err_message("foo {\n  bar: baz [fail]; }\n", 'Invalid CSS after "  bar: baz ": expected /[;}]/, was "[fail]; }"', {syntax: 'scss'}, done)
    });

  it('test_rule_interpolation', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L172-L194
    // v3.1.0

    function c() { equal("foo #{\"#{\"ba\" + \"r\"} baz\"} bang\n  a: b\n", "foo bar baz bang {\n  a: b; }\n", {syntax: 'sass'}, done) }
    function b() { equal("foo [bar=\"\\#{#{\"ba\" + \"r\"} baz}\"] bang\n  a: b\n", "foo [bar=\"#{bar baz}\"] bang {\n  a: b; }\n", {syntax: 'sass'}, c) }
    equal("foo [bar=\"#{\"\\#{\" + \"baz\"}\"] bang\n  a: b\n", "foo [bar=\"#{baz\"] bang {\n  a: b; }\n", {syntax: 'sass'}, b)
  });


  }



/*****************************************************************************************************
 * v3.1.1
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.1")) {
  it('test_silent_comment_in_prop_val_after_important', function(done) {
    // https://github.com/sass/sass/blob/3c705fdc9e072c5f461e48e296630b35a8ada83b/test/sass/engine_test.rb#L2151-L2159
    // v3.1.1
    var source = ".advanced\n  display: none !important // yeah, yeah. it's not really a style anyway.\n";
    var expected = ".advanced {\n  display: none !important; }\n";

    equal(source, expected, {syntax: 'sass'}, done)
  });
}

/*****************************************************************************************************
 * v3.1.2
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.2")) {
  it('test_zip', function(done) {
    // https://github.com/sass/sass/blob/bbba4167a62b8e49086313a648ca1d59597aa764/test/sass/functions_test.rb#L968-L971
    // v3.1.2

    function second() {eval_equal(func_parse("zip(1 2 3, 4 5 6, 7 8)"), '"1 4 7, 2 5 8"', {}, done)}
    eval_equal(func_parse("zip(1 2, 3 4, 5 6)"), '"1 3 5, 2 4 6"', {}, second)
  });

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_index', function(done) {
      // https://github.com/sass/sass/blob/bbba4167a62b8e49086313a648ca1d59597aa764/test/sass/functions_test.rb#L968-L971
      // v3.1.2

      function e() { eval_equal(func_parse("index(1px solid blue, notfound)"), '"false"', {}, done) }
      function d() { eval_equal(func_parse("index(1px solid blue, 1em)"), '"false"', {}, e) }
      function c() { eval_equal(func_parse("index(1px solid blue, #00f)"), '"3"', {}, d) }
      function b() { eval_equal(func_parse("index(1px solid blue, solid)"), '"2"', {}, c) }
      eval_equal(func_parse("index(1px solid blue, 1px)"), '"1"', {}, b)
    });
  }
}

/*****************************************************************************************************
 * v3.1.3
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.3")) {
  it('test_global_sass_logger_instance_exists', function(done) {
    // https://github.com/sass/sass/blob/0b65c0d4d588c131aa1c2ad4c32d21b938239585/test/sass/logger_test.rb#L26-L28
    // v3.1.3

    eval_equal("Opal.Sass.$logger()['$respond_to?']('warn')", 'true', {}, done)
  });

  it('test_logging_can_be_disabled', function(done) {
    // https://github.com/sass/sass/blob/0b65c0d4d588c131aa1c2ad4c32d21b938239585/test/sass/logger_test.rb#L49-L57
    // v3.1.3

    function second(result) {
      expect(result.err).to.be(undefined)

        sassBuilder({eval: "console.warn.callCount===0&&(_logger=Opal.Sass.$$scope.Logger.$$scope.Base.$new())&&_logger.$error(\'message #1\')&&console.warn.callCount===1&&(console.warn.reset(),true)&&(_logger.disabled=true)&&_logger.$error(\'message #2\')&&console.warn.calledWith(\'message #2\')===false&&console.warn.callCount===0&&(_logger=undefined,console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)
            done();
        })
    }

    // or ship code thats different than what we test, we eval it in
    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  });

  if (semver.lt(window.__libVersion, "3.4.14")) {
    it('test_nonexistent_import', function(done) {
      // https://github.com/sass/sass/blob/0b65c0d4d588c131aa1c2ad4c32d21b938239585/test/sass/engine_test.rb#L577-L584
      // v3.1.3

      err_message("@import nonexistent.sass", 'File to import not found or unreadable: nonexistent.sass.\nLoad path:', {syntax: 'sass'}, done)
    });

  }
}

/*****************************************************************************************************
 * v3.1.6
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.6")) {
  it('test_selector_tracing', function(done) {
    // https://github.com/sass/sass/blob/657300fc80ea23cab5669cb3ab83e0808604359c/test/sass/engine_test.rb#L308-L323
    // v3.1.6


    var source = "@mixin mixed {\n        .mixed { color: red; }\n      }\n      .context {\n        @include mixed;\n      }\n";
    var expected = "/* on line 2 of test_selector_tracing_inline.scss, in `mixed'\n   from line 5 of test_selector_tracing_inline.scss */\n.context .mixed {\n  color: red; }\n";

    equal(source, expected, {syntax: 'scss', trace_selectors: true, filename: 'test_selector_tracing_inline.scss'}, done)
  });

  it('test_options_passed_to_script', function(done) {
    // https://github.com/sass/sass/blob/657300fc80ea23cab5669cb3ab83e0808604359c/test/sass/scss/scss_test.rb#L1250-L1256
    // v3.1.6

    var source = "foo {color: darken(black, 10%)}\n";
    var expected = "foo{color:#000}\n";

    equal(source, expected, {syntax: 'scss', style: 'compressed'}, done)
  });

  it('test_warn_directive', function(done) {
    // https://github.com/sass/sass/blob/657300fc80ea23cab5669cb3ab83e0808604359c/test/sass/engine_test.rb#L1804-L1827
    // v3.1.6

    function third() {
      sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWithMatch(/WARNING: this is a warning\\n         on line 4 of test_warn_directive_inline.sass\\n/)===true&&console.warn.calledWithMatch(/WARNING: this is a mixin warning\\n         on line 2 of test_warn_directive_inline.sass, in `foo'\\n         from line 7 of test_warn_directive_inline.sass\\n/)===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)

          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined)
        var css = "bar {\n  c: d; }\n";
      var scss = "=foo\n  @warn \"this is a mixin warning\"\n\n@warn \"this is a warning\"\nbar\n  c: d\n  +foo";
      equal(scss, css, {syntax: 'sass', filename: 'test_warn_directive_inline.sass'}, third)
    }

    // since the tests run in the worker, we have to inject sinon and wrap the console there, rather than in this context. Rather than bloat up the shipping code,
    // or ship code thats different than what we test, we eval it in
    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })
}

/*****************************************************************************************************
 * v3.1.8
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.8")) {

  if (semver.lt(window.__libVersion, "3.2.0")) {
    it('test_deprecated_PRECISION', function(done) {
      // https://github.com/sass/sass/blob/58ad24d5cb12bc4d2e25da49e025ee768236841e/test/sass/engine_test.rb#L2455-L2459
      // v3.1.8

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith(\"Sass::Script::Number::PRECISION is deprecated and will be removed in a future release. Use Sass::Script::Number.precision_factor instead.\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined)

          eval_equal('Opal.Sass.$$scope.Script.$$scope.Number.$$scope.get(\'PRECISION\')', '1000', {syntax: 'scss'}, third)
              }

              sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
              });

          it('test_changing_precision', function(done) {
            // https://github.com/sass/sass/blob/58ad24d5cb12bc4d2e25da49e025ee768236841e/test/sass/engine_test.rb#L2460-L2475
            // v3.1.8

            function third() {
              sassBuilder({eval: "Opal.Sass.$$scope.Script.$$scope.Number[\"$precision=\"](3)", options: {syntax: 'scss'}}, function(result) {
                expect(result.css).to.be(1000)
                  done();
              })
            }

            function second() {
              var source = "div\n  maximum : 1.00000001\n  too-much: 1.000000001\n";
              // technically the test is 1.0, not 1. But since JS doesn't have an explicit float type, we can't maintain the .0 and remain a number. So we cheat a tiny bit and change the expected value to 1
              var expected = "div {\n  maximum: 1.00000001;\n  too-much: 1; }\n";

              equal(source, expected, {syntax: 'sass'}, third)
            }

            sassBuilder({eval: "Opal.Sass.$$scope.Script.$$scope.Number[\"$precision=\"](8)", options: {syntax: 'sass'}}, function(result) {
              expect(result.err).to.be(undefined);
              expect(result.css).to.be(100000000);
              second();
            })
          });
  }

  if (semver.lt(window.__libVersion, "3.2.2")) {
    it('test_parent_in_mid_selector_error', function(done) {
      // https://github.com/sass/sass/blob/58ad24d5cb12bc4d2e25da49e025ee768236841e/test/sass/scss/scss_test.rb#L1032-L1042
      // v3.1.8

      err_message("flim {\n  .foo.bar& {a: b}\n}\n", "Invalid CSS after \"  .foo.bar\": expected \"{\", was \"& {a: b}\"\n\n\"&\" may only be used at the beginning of a selector.", {syntax: 'scss'}, done)
    });

    it('test_parent_in_mid_selector_error', function(done) {
      // https://github.com/sass/sass/blob/58ad24d5cb12bc4d2e25da49e025ee768236841e/test/sass/scss/scss_test.rb#L1044-L1054
      // v3.1.8

      err_message("flim {\n  && {a: b}\n}\n", "Invalid CSS after \"  &\": expected \"{\", was \"& {a: b}\"\n\n\"&\" may only be used at the beginning of a selector.", {syntax: 'scss'}, done)
    });

    it('test_double_parent_selector_error', function(done) {
      // https://github.com/sass/sass/blob/58ad24d5cb12bc4d2e25da49e025ee768236841e/test/sass/scss/scss_test.rb#L1056-L1066
      // v3.1.8

      err_message("flim {\n  && {a: b}\n}\n", "Invalid CSS after \"  &\": expected \"{\", was \"& {a: b}\"\n\n\"&\" may only be used at the beginning of a selector", {syntax: 'scss'}, done)
    });
  }


  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_interpolation_doesnt_deep_unquote_strings', function(done) {
      // https://github.com/sass/sass/blob/face3172930b515ac2040e450d4db3ffe01c31b5/test/sass/engine_test.rb#L1796-L1804
      // v3.1.8

      var css = ".foo {\n  a: \"bar\" \"baz\"; }\n";
      var scss = ".foo\n  a: #{\"bar\" \"baz\"}\n";
      equal(scss, css, {syntax: 'sass'}, done)
    })
  }

}

/*****************************************************************************************************
 * v3.1.9
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.9")) {
  it('test_spaceless_combo_selectors', function(done) {
    // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/scss/css_test.rb#L803-L807
    // v3.1.9

    function third() { equal("E+F { a: b;} ", "E + F {\n  a: b; }\n", {syntax: 'scss'}, done) }
    function second() { equal("E~F { a: b;} ", "E ~ F {\n  a: b; }\n", {syntax: 'scss'}, third) }
    equal("E>F { a: b;} ", "E > F {\n  a: b; }\n", {syntax: 'scss'}, second)
  });

  if (semver.lt(window.__libVersion, "3.2.0")) {
    // test was removed in 3.2.0
    it('test_loud_silent_comment_warning', function(done) {
      // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/engine_test.rb#L2339-L2346
      // v3.1.9

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith(\"WARNING:\\nOn line 1 of 'test_loud_silent_comment_warning_inline.sass'\\n`//` comments will no longer be allowed to use the `!` flag in Sass 3.2.\\nPlease change to `/*` comments.\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'sass'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined)

          equal('//! \#{foo}', '/* foo */\n', {syntax: 'sass', filename: 'test_loud_silent_comment_warning_inline.sass'}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'sass'}}, second)
    });

    it('test_loud_comment_in_silent_comment', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1551-L1567
      // v3.1.9

      var css = "foo{color:blue;/* foo */\n/* bar */\n/* bip */\n/* baz */}\n";
      var scss = "foo\n  color: blue\n  //! foo\n  //! bar\n  //!\n    bip\n    baz\n";
      equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
    })

    it('test_loud_comment_is_evaluated', function(done) {
      // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/engine_test.rb#L1591-L1598
      // v3.1.9

      var css = "/* Hue: 327.216deg */\n";
      var sass = "/*!\n  Hue: #{hue(#f836a0)}\n";
      equal(sass, css, {syntax: 'sass'}, done)
    })

    // test was removed in 3.2
    it('test_comment_interpolation_warning', function(done) {
      // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/engine_test.rb#L2330-L2337
      // v3.1.9

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('WARNING:\\nOn line 1 of \\'test_comment_interpolation_warning_inline.sass\\'\\nComments will evaluate the contents of interpolations (#{ ... }) in Sass 3.2.\\nPlease escape the interpolation by adding a backslash before the `#`.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'sass'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)

            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined)
          sassBuilder({css: "/* \#{foo}", options: {syntax: 'sass', filename: 'test_comment_interpolation_warning_inline.sass'}}, third) }

      // since the tests run in the worker, we have to inject sinon and wrap the console there, rather than in this context. Rather than bloat up the shipping code,
      // or ship code thats different than what we test, we eval it in
      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'sass'}}, second)
    })
  }

  if (semver.lt(window.__libVersion, "3.2.10")) {
    // exclimation point stripping was removed in 3.2.10
    it('test_interpolated_comment_in_mixin', function(done) {
      // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/engine_test.rb#L2032-L2055
      // v3.1.9

      var source = "=foo($var)\n  /*! color: #{$var}\n  .foo\n    color: $var\n\n+foo(red)\n+foo(blue)\n+foo(green)\n";
      var expected = "/* color: red */\n.foo {\n  color: red; }\n\n/* color: blue */\n.foo {\n  color: blue; }\n\n/* color: green */\n.foo {\n  color: green; }\n";

      equal(source, expected, {syntax: 'sass'}, done)
    });
  }

}

/*****************************************************************************************************
 * v3.1.10
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.10")) {
  it('test_star_plus_and_parent', function(done) {
    // https://github.com/sass/sass/blob/d09db8d0ad9f020a1a87438f25ff951c87228927/test/sass/scss/scss_test.rb#L1098-L1105
    // v3.1.10

    var css = "* + html foo {\n  a: b; }\n";
    var scss = "foo {*+html & {a: b}}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });
}

/*****************************************************************************************************
 * v3.1.11
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.11")) {
  it('test_control_directive_in_nested_property', function(done) {
    // https://github.com/sass/sass/blob/4a1a0d1aaf4dd2a95cc7748b726cf0a90a432816/test/sass/engine_test.rb#L1206-L1216
    // v3.1.11

    var css = "foo {\n  a-b: c; }\n";
    var sass = "foo\n  a:\n    @if true\n      b: c\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_interpolation_near_operators', function(done) {
    // https://github.com/sass/sass/blob/4a1a0d1aaf4dd2a95cc7748b726cf0a90a432816/test/sass/script_conversion_test.rb#L226-L227
    // v3.1.11

    function b() { eval_equal(func_parse("3, #{3 + 4}, 11"), '"3, 7, 11"', {}, done) }
    eval_equal(func_parse("#{1 + 2}, #{3 + 4}, #{5 + 6}"), '"3, 7, 11"', {}, b)
  });

  it('test_prop_name_interpolation_after_hyphen', function(done) {
    // https://github.com/sass/sass/blob/4a1a0d1aaf4dd2a95cc7748b726cf0a90a432816/test/sass/scss/scss_test.rb#L1098-L1105
    // v3.1.11

    var css = "a {\n  -foo-bar: b; }\n";
    var scss = "a { -#{\"foo\"}-bar: b; }";
    equal(scss, css, {syntax: 'scss'}, done)
  });
}

/*****************************************************************************************************
 * v3.1.12
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.12")) {
  //TODO we do not support imports currently. PRs welcome!
  it.skip('test_basic_import_loop_exception', function() {
    // https://github.com/sass/sass/blob/fb5cb050ce2fd67f21284ce6fee2273fb761ddbc/test/sass/engine_test.rb#L473-L484
    // v3.1.12
  });

  //TODO we do not support imports currently. PRs welcome!
  it.skip('test_basic_import_loop_exception', function() {
    // https://git.skiphub.com/sass/sass/blob/fb5cb050ce2fd67f21284ce6fee2273fb761ddbc/test/sass/engine_test.rb#L486-L500
    // v3.1.12
  });

  //TODO we do not support imports currently. PRs welcome!
  it.skip('test_deep_import_loop_exception', function() {
    // https://git.skiphub.com/sass/sass/blob/fb5cb050ce2fd67f21284ce6fee2273fb761ddbc/test/sass/engine_test.rb#L502-L518
    // v3.1.12
  });

  //TODO we do not support imports currently. PRs welcome!
  it.skip('test_tricky_mixin_loop_exception', function() {
    // https://git.skiphub.com/sass/sass/blob/fb5cb050ce2fd67f21284ce6fee2273fb761ddbc/test/sass/engine_test.rb#L2104-L2120
    // v3.1.12
  });

  if (semver.lt(window.__libVersion, "3.2.0")) {
    it('test_double_media_bubbling_with_commas', function(done) {
      // https://github.com/sass/sass/blob/fb5cb050ce2fd67f21284ce6fee2273fb761ddbc/test/sass/engine_test.rb#L2029-L2040
      // v3.1.12

      var css = "@media foo and baz, foo and bang, bar and baz, bar and bang {\n  .foo {\n    c: d; } }\n";
      var sass = "@media foo, bar\n  @media baz, bang\n    .foo\n      c: d\n";
      equal(sass, css, {syntax: 'sass'}, done)
    });
  }
}

/*****************************************************************************************************
 * v3.1.13
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.13")) {
  //TODO we do not support imports currently. PRs welcome!
  it.skip('test_import_with_interpolation', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L615-L628
    // v3.1.13
  })

  it('test_selector_compression', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L2476-L2483
    // v3.1.12

    var css = "a>b,c+d,:-moz-any(e,f,g){h:i}\n";
    var sass = "a > b, c + d, :-moz-any(e, f, g)\n  h: i\n";
    equal(sass, css, {syntax: 'sass', style: 'compressed'}, done)
  });

  it('test_duplicated_selector_with_newlines', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/extend_test.rb#L1360-L1376
    // v3.1.13

    var css = ".example-1-1,\n.example-1-2,\n.my-page-1 .my-module-1-1,\n.example-1-3 {\n  a: b; }\n";
    var scss = ".example-1-1,\n.example-1-2,\n.example-1-3 {\n  a: b;\n}\n\n.my-page-1 .my-module-1-1 {@extend .example-1-2}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extendee', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/extend_test.rb#L1378-L1386
    // v3.1.13

    var css = "> .foo, > foo bar {\n  a: b; }\n";
    var scss = "> .foo {a: b}\nfoo bar {@extend .foo}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/extend_test.rb#L1388-L1396
    // v3.1.13

    var css = ".foo .bar, > .foo foo bar, > foo .foo bar {\n  a: b; }\n";
    var scss = ".foo .bar {a: b}\n> foo bar {@extend .bar}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender_and_extendee', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/extend_test.rb#L1398-L1406
    // v3.1.13

    var css = "> .foo, > foo bar {\n  a: b; }\n";
    var scss = "> .foo {a: b}\n> foo bar {@extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender_and_sibling_selector_extendee', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/extend_test.rb#L1408-L1416
    // v3.1.13

    var css = "~ .foo {\n  a: b; }\n";
    var scss = "~ .foo {a: b}\n> foo bar {@extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender_and_extendee_and_newline', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/extend_test.rb#L1418-L1428
    // v3.1.13

    var css = "> .foo, > flip,\n> foo bar {\n  a: b; }\n";
    var scss = "> .foo {a: b}\nflip,\n> foo bar {@extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_initial', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L11-L13
    // v3.1.13

    eval_equal(scanner_setup() + scanner_state(0,0,'Opal.nil','Opal.nil'), 'true', {}, done)
  })

  it('test_initial', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L11-L13
    // v3.1.13

    eval_equal(scanner_setup() + scanner_state(0,0,'Opal.nil','Opal.nil'), 'true', {}, done)
  })

  it('test_check', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L15-L22
    // v3.1.13

    function b() { eval_equal(scanner_state(0,0,2,3), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$check(/../)', '"cö"', {}, b)
  })

  it('test_check_until', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L24-L27
    // v3.1.13

    function b() { eval_equal(scanner_state(0,0,2,3), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$check_until(/f./)', '"cölorfü"', {}, b)
  })

  it('test_getch', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L29-L33
    // v3.1.13

    function c() { eval_equal(scanner_state(2,3,1,2), 'true', {}, done) }
    function b() { eval_equal('a.$getch()', '"ö"', {}, c) }
    eval_equal(scanner_setup() + 'a.$getch()', '"c"', {}, b)
  })

  it('test_match?', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L35-L38
    // v3.1.13

    function b() { eval_equal(scanner_state(0,0,2,3), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a[\'$match?\'](/../)', '2', {}, b)
  })

  it('test_peek', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L40-L43
    // v3.1.13

    function b() { eval_equal(scanner_state(0,0,'Opal.nil','Opal.nil'), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$peek(2)', '"cö"', {}, b)
  })

  it('test_rest_size', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L45-L48
    // v3.1.13

    function b() { eval_equal('a.$rest_size()', '6', {}, done) }
    eval_equal(scanner_setup() + 'a.$scan(/../)', '"cö"', {}, b)
  })

  it('test_scan', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L50_L53
    // v3.1.13

    function b() { eval_equal(scanner_state(2,3,2,3), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$scan(/../)', '"cö"', {}, b)
  })

  it('test_scan_until', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L55-L58
    // v3.1.13

    function b() { eval_equal(scanner_state(7,9,2,3), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$scan_until(/f./)', '"cölorfü"', {}, b)
  })

  it('test_skip', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L60-L63
    // v3.1.13

    function b() { eval_equal(scanner_state(2,3,2,3), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$skip(/../)', '2', {}, b)
  })

  it('test_skip_until', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L65-L68
    // v3.1.13

    function b() { eval_equal(scanner_state(7,9,2,3), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$skip_until(/f./)', '7', {}, b)
  })

  it('test_set_pos', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L70-L77
    // v3.1.13

    function f() { eval_equal(scanner_state(1,1,'Opal.nil','Opal.nil'), 'true', {}, done) }
    function e() { eval_equal('a[\'$pos=\'](1)', '1', {}, f) }
    function d() { eval_equal(scanner_state(6,7,'Opal.nil','Opal.nil'), 'true', {}, e) }
    function c() { eval_equal('a[\'$pos=\'](6)', '6', {}, d) }
    function b() { eval_equal(scanner_state(7,9,'Opal.nil','Opal.nil'), 'true', {}, c) }
    eval_equal(scanner_setup() + 'a[\'$pos=\'](7)', '7', {}, b)
  })

  it('test_reset', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L79-L83
    // v3.1.13

    eval_equal(scanner_setup() + 'a.$scan(/../);a.$reset();' + scanner_state(0,0,'Opal.nil','Opal.nil'), 'true', {}, done)
  })

  it('test_scan_full', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L85-L100
    // v3.1.13

    function h() { eval_equal(scanner_state(0,0,2,3), 'true', {}, done) }
    function g() { eval_equal('a.$reset();a.$scan_full(/../, false, false)', 'Opal.nil', {}, h) }
    function f() { eval_equal(scanner_state(2,3,2,3), 'true', {}, g) }
    function e() { eval_equal('a.$reset();a.$scan_full(/../, true, false)', 'Opal.nil', {}, f) }
    function d() { eval_equal(scanner_state(0,0,2,3), 'true', {}, e) }
    function c() { eval_equal('a.$reset();a.$scan_full(/../, false, true)', '"cö"', {}, d) }
    function b() { eval_equal(scanner_state(2,3,2,3), 'true', {}, c) }
    eval_equal(scanner_setup() + 'a.$scan_full(/../, true, true)', '"cö"', {}, b)
  })

  it('test_search_full', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L102-L117
    // v3.1.13

    function h() { eval_equal(scanner_state(0,0,2,3), 'true', {}, done) }
    function g() { eval_equal('a.$reset();a.$search_full(/f./, false, false)', 'Opal.nil', {}, h) }
    function f() { eval_equal(scanner_state(7,9,2,3), 'true', {}, g) }
    function e() { eval_equal('a.$reset();a.$search_full(/f./, true, false)', 'Opal.nil', {}, f) }
    function d() { eval_equal(scanner_state(0,0,2,3), 'true', {}, e) }
    function c() { eval_equal('a.$reset();a.$search_full(/f./, false, true)', '"cölorfü"', {}, d) }
    function b() { eval_equal(scanner_state(7,9,2,3), 'true', {}, c) }
    eval_equal(scanner_setup() + 'a.$search_full(/f./, true, true)', '"cölorfü"', {}, b)
  })

  it('test_set_string', function(done) {
    // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L119-L123
    // v3.1.13

    function b() { eval_equal(scanner_state(0,0,'Opal.nil','Opal.nil'), 'true', {}, done) }
    eval_equal(scanner_setup() + 'a.$scan(/../);a[\'$string=\'](\'föóbâr\')', '"föóbâr"', {}, b)
        })

    it('test_terminate', function(done) {
      // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L125-L129
      // v3.1.13

      eval_equal(scanner_setup() + 'a.$scan(/../);!!a.$terminate();' + scanner_state(8,10,'Opal.nil','Opal.nil') , 'true', {}, done)
    })

    it('test_unscan', function(done) {
      // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L125-L129
      // v3.1.13

      function b() { eval_equal(scanner_state(2,3,'Opal.nil','Opal.nil'), 'true', {}, done) }
      eval_equal(scanner_setup() + 'a.$scan(/../);a.$scan_until(/f./);a.$unscan()', 'Opal.nil', {}, b)
    })

    if (semver.lt(window.__libVersion, "3.4.0")) {
      it('test_debug_info_in_keyframes', function(done) {
        // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L1017-L1032
        // v3.1.12

        var css = "@-webkit-keyframes warm {\n  from {\n    color: black; }\n\n  to {\n    color: red; } }\n";
        var sass = "@-webkit-keyframes warm\n  from\n    color: black\n  to\n    color: red\n";
        equal(sass, css, {syntax: 'sass', debug_info: true}, done)
      });

      it('test_multibyte_and_interpolation', function(done) {
        // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L2611-L2622
        // v3.1.12

        var css = "#bar {\n  background: a 0%; }\n";
        var scss = "#bar {\n  // \n  background: #{a} 0%;\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_multibyte_prop_name', function(done) {
        // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L2600-L2609
        // v3.1.12

        var css = "@charset \"UTF-8\";\n#bar {\n  cölor: blue; }\n";
        var sass = "#bar\n  cölor: blue\n";
        equal(sass, css, {syntax: 'sass'}, done)
      });
    }

}

/*****************************************************************************************************
 * v3.1.15
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.15")) {
  it('test_comma_extendee', function(done) {
    // https://github.com/sass/sass/blob/8a7194a2c755dda7bc13852d502c8a46125b5683/test/sass/extend_test.rb#L879-L891
    // v3.1.15
    var scss = ".foo {a: b}\n.bar {c: d}\n.baz {@extend .foo, .bar}\n";
    var css = ".foo, .baz {\n  a: b; }\n\n.bar, .baz {\n  c: d; }\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_grayscale', function(done) {
    // https://github.com/sass/sass/blob/8a7194a2c755dda7bc13852d502c8a46125b5683/test/sass/functions_test.rb#L776-L777
    // v3.1.15

    function b() { eval_equal(func_parse("grayscale(-5px)"), '"grayscale(-5px)"', {}, done) }
    eval_equal(func_parse("grayscale(2)"), '"grayscale(2)"', {}, b)
  });

  //TODO we do not currently support imports. PRs welcome!
  it.skip('test_single_level_import_loop', function(done) {
    // https://github.com/sass/sass/blob/8a7194a2c755dda7bc13852d502c8a46125b5683/test/sass/plugin_test.rb#L113-L122
    // v3.1.15
  })

  //TODO we do not currently support imports. PRs welcome!
  it.skip('test_double_level_import_loop', function(done) {
    // https://github.com/sass/sass/blob/8a7194a2c755dda7bc13852d502c8a46125b5683/test/sass/plugin_test.rb#L124-L135
    // v3.1.15
  })

  if (semver.lt(window.__libVersion, "3.2.0")) {
    // err message was modified in 3.2
    it('test_comment_like_selector', function(done) {
      // https://github.com/sass/sass/blob/8a7194a2c755dda7bc13852d502c8a46125b5683/test/sass/engine_test.rb#L2485-L2490
      // v3.1.15

      err_message("/ foo\n  a: b\n", 'Invalid CSS after "": expected selector, was "/ foo"', {syntax: 'sass'}, done)
    })

    it('test_pseudo_unification', function(done) {
      // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/extend_test.rb#L754-L769
      // v3.1.13

      function second() {
        var css = ":foo {\n  a: b; }\n";
        var scss = ":foo.baz {a: b}\n:foo {@extend .baz}\n";

        equal(scss, css, {syntax: 'scss'}, done)
      }

      var css = ".baz:after, :foo:after {\n  a: b; }\n";
      var scss = ".baz:after {a: b}\n:foo {@extend .baz}\n";

      equal(scss, css, {syntax: 'scss'}, second)
    })
  }

}

/*****************************************************************************************************
 * v3.1.16
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.16")) {
  it('test_element_function', function(done) {
    // https://github.com/sass/sass/blob/425a472ce177231ce11447f8dd1a6f8329ec615e/test/sass/scss/css_test.rb#L415-L422
    // v3.1.16

    var source = "foo {\n  a: -moz-element(#foo);\n  b: -webkit-element(#foo);\n  b: -foobar-element(#foo); }\n";
    parses(source, {syntax: 'scss'}, done)
  })

  it('test_moz_document_directive', function(done) {
    // https://github.com/sass/sass/blob/425a472ce177231ce11447f8dd1a6f8329ec615e/test/sass/scss/css_test.rb#L598-L614
    // v3.1.16

    var css = "@-moz-document url(http://www.w3.org/),\n               url-prefix(http://www.w3.org/Style/),\n               domain(mozilla.org),\n               regexp(\"^https:.*\") {\n  .foo {\n    a: b; } }\n";
    var scss = "@-moz-document url(http://www.w3.org/),\n               url-prefix(http://www.w3.org/Style/),\n               domain(mozilla.org),\n               regexp(\"^https:.*\") {\n  .foo {a: b}\n}";
    equal(scss, css,{syntax: 'scss'}, done)
  })

  if (semver.lt(window.__libVersion, "3.4.14")) {
    it('test_supports', function(done) {
      // https://github.com/sass/sass/blob/425a472ce177231ce11447f8dd1a6f8329ec615e/test/sass/scss/css_test.rb#L616-L640
      // v3.1.16

      function second() {
        var css = "@-prefix-supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b; } }\n";
        var scss = "@-prefix-supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b;\n  }\n}\n";
        equal(scss, css,{syntax: 'scss'}, done)
      }

      var css = "@supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b; } }\n";
      var scss = "@supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b;\n  }\n}\n";
      equal(scss, css,{syntax: 'scss'}, second)
    })
  }
}

/*****************************************************************************************************
 * v3.1.17
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.17")) {
  it('test_change_color_argument_errors', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L714-L736
    // v3.1.17

    function h() {eval_err(func_parse('change-color(blue, $saturation: 101%)'), "Saturation 101% must be between 0% and 100%", {}, done)}
    function g() {eval_err(func_parse('change-color(blue, $lightness: 101%)'), "Lightness 101% must be between 0% and 100%", {}, h)}
    function f() {eval_err(func_parse('change-color(blue, $red: -1)'), "Red value -1 must be between 0 and 255", {}, g)}
    function e() {eval_err(func_parse('change-color(blue, $green: 256)'), "Green value 256 must be between 0 and 255", {}, f)}
    function d() {eval_err(func_parse('change-color(blue, $blue: 500)'), "Blue value 500 must be between 0 and 255", {}, e)}
    function c() {eval_err(func_parse('change-color(blue, $hoo: 80%)'), "Unknown argument $hoo (80%)", {}, d)}
    function b() {eval_err(func_parse('change-color(blue, 10px)'), "10px is not a keyword argument", {}, c)}
    eval_err(func_parse('change-color(blue, $lightness: 10%, $red: 120)'), "Cannot specify HSL and RGB values for a color at the same time", {}, b);
  });

  it('test_saturation_bounds', function(done) {
    // https://github.com/sass/sass/blob/62e38c1c71c18bd2fd661e68c1c551c6356be472/test/sass/functions_test.rb#L1026-L1028
    // v3.1.17

    eval_equal(func_parse("hsl(hue(#fbfdff), saturation(#fbfdff), lightness(#fbfdff))"), '"#fbfdff"', {}, done)
  })

  it('test_empty_rule', function(done) {
    // https://github.com/sass/sass/blob/62e38c1c71c18bd2fd661e68c1c551c6356be472/test/sass/scss/scss_test.rb#L833-L841
    // v3.1.17

    var css = "[foo=zzz] {\n  a: b; }\n";
    var scss = "$zzz: zzz;\n[foo=#{$zzz}] { a: b; }\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  if (semver.lt(window.__libVersion, "3.2.10")) {
    // err messages were changed in 3.2.10
    it('test_rgb_test_percent_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
      // v3.1.17

      function third() {eval_err(func_parse('rgb(0, 0, 101%)'), "Color value 101% must be between 0% and 100%", {}, done)};
      function second() {eval_err(func_parse('rgb(0, -0.1%, 0)'), "Color value -0.1% must be between 0% and 100%", {}, third)};
      eval_err(func_parse('rgb(100.1%, 0, 0)'), "Color value 100.1% must be between 0% and 100%", {}, second);
    });
  }

  if (semver.lt(window.__libVersion, "3.3.0")) {
    // Color namespace changes in 3.3.0
    it('test_color_checks_input', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L15-L18
      // v3.1.17

      function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [256, 2, 3] )', "Red value 256 must be between 0 and 255", {}, done)}
      eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, -1] )', "Blue value -1 must be between 0 and 255", {}, b);
    });

    it('test_color_checks_rgba_input', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L20-L23
      // v3.1.17

      function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, 3, 1.1] )', "Alpha channel 1.1 must be between 0 and 1", {}, done)}
      eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, 3, -0.1] )', "Alpha channel -0.1 must be between 0 and 1", {}, b);
    });

    it('test_boolean_ops_short_circuit', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L223-L228
      // v3.1.17

      function b() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('ie',Opal.Sass.$$scope.Script.$$scope.Bool.$new(false));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$ie and $ie <= 7', 0, 0).$perform(env).$to_s()", '"false"', {}, done) }
      eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('ie',Opal.Sass.$$scope.Script.$$scope.Bool.$new(true));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$ie or $undef', 0, 0).$perform(env).$to_s()", '"true"', {}, b)
    });

    it('test_scale_color_argument_errors-1', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L647-L671
      // v3.1.17

      function h() {eval_err(func_parse('scale-color(blue, 10px)'), "10px is not a keyword argument", {}, done)}
      function g() {eval_err(func_parse('scale-color(blue, $hue: 80%)'), "Unknown argument $hue (80%)", {}, h)}
      function f() {eval_err(func_parse('scale-color(blue, $alpha: 0.5)'), "$alpha: Amount 0.5 must be a % (e.g. 0.5%)", {}, g)}
      function e() {eval_err(func_parse('scale-color(blue, $saturation: 80)'), "$saturation: Amount 80 must be a % (e.g. 80%)", {}, f)}
      function d() {eval_err(func_parse('scale-color(blue, $alpha: -101%)'), "$alpha: Amount -101% must be between -100% and 100%", {}, e)}
      function c() {eval_err(func_parse('scale-color(blue, $red: -101%)'), "$red: Amount -101% must be between -100% and 100%", {}, d)}
      function b() {eval_err(func_parse('scale-color(blue, $saturation: 101%)'), "$saturation: Amount 101% must be between -100% and 100%", {}, c)}
      eval_err(func_parse('scale-color(blue, $lightness: 10%, $red: 20%)'), "Cannot specify HSL and RGB values", {}, b);
    });
  }

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_rgb_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/62e38c1c71c18bd2fd661e68c1c551c6356be472/test/sass/functions_test.rb#L206-L221
      // v3.1.17

      function seventh() {eval_err(func_parse('rgba(1, 1, 1, 1.2)'), "Alpha channel 1.2 must be between 0 and 1", {}, done)};
      function sixth() {eval_err(func_parse('rgba(1, 1, 1, -0.2)'), "Alpha channel -0.2 must be between 0 and 1", {}, seventh)};
      function fifth() {eval_err(func_parse('rgba(-1, 1, 1, 0.3)'), "Color value -1 must be between 0 and 255", {}, sixth)};
      function fourth() {eval_err(func_parse('rgba(1, 256, 257, 0.3)'), "Color value 256 must be between 0 and 255", {}, fifth)};
      function third() {eval_err(func_parse('rgba(1, 1, 256, 0.3)'), "Color value 256 must be between 0 and 255", {}, fourth)};
      function second() {eval_err(func_parse('rgba(1, 256, 1, 0.3)'), "Color value 256 must be between 0 and 255", {}, third)};
      eval_err(func_parse('rgba(256, 1, 1, 0.3)'), "Color value 256 must be between 0 and 255", {}, second);
    });


    it('test_hsl_checks_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L77-L80
      // v3.1.17

      function second() { eval_err(func_parse("hsl(10, 10, 256%)"),"Lightness 256% must be between 0% and 100%", {}, done) }
      eval_err(func_parse("hsl(10, -114, 12)"),"Saturation -114 must be between 0% and 100%", {}, second)
    });

    it('test_hsla_checks_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L95-L100
      // v3.1.17

      function fourth() { eval_err(func_parse("hsla(10, 10, 10, 1.1)"), "Alpha channel 1.1 must be between 0 and 1", {}, done) }
      function third() { eval_err(func_parse("hsla(10, 10, 10, -0.1)"), "Alpha channel -0.1 must be between 0 and 1", {}, fourth) }
      function second() { eval_err(func_parse("hsla(10, 10, 256%, 0)"), "Lightness 256% must be between 0% and 100%", {}, third) }
      eval_err(func_parse("hsla(10, -114, 12, 1)"), "Saturation -114 must be between 0% and 100%", {}, second)
    });

    it('test_hsl_checks_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L82-L86
      // v3.1.17

      function third() { eval_err(func_parse("hsl(10, 10, 256%)"), "Lightness 256% must be between 0% and 100%", {}, done) }
      function second() { eval_err(func_parse("hsl(10, 10, 256%)"), "Lightness 256% must be between 0% and 100%", {}, third) }
      eval_err(func_parse("hsl(10, -114, 12)"), "Saturation -114 must be between 0% and 100%", {}, second)
    });
  }

}

/*****************************************************************************************************
 * v3.1.18
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.18") && semver.lt(window.__libVersion, "3.1.19") ) {
  it('test_extend_in_media', function(done) {
    // https://github.com/sass/sass/blob/f0c840f08f0d518b1631e0ef3aa9dfad3a108253/test/sass/extend_test.rb#L1373-L1388
    // v3.1.18

    function third() {
      sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 3 of test_extend_in_unknown_directive_inline.sass:\\n  Using @extend within directives (e.g. @flooblehoof) is deprecated.\\n  It will be an error in Sass 3.2.\\n  This will only work once @extend is supported natively in the browser.\\n;')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)

          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);

      var css = ".foo {\n  a: b; }\n\n@flooblehoof {}\n";
      var scss = ".foo {a: b}\n@flooblehoof {\n  .bar {@extend .foo}\n}\n";
      equal(scss, css, {syntax: 'scss', filename: 'test_extend_in_unknown_directive_inline.sass'}, done)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_extend_in_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/f0c840f08f0d518b1631e0ef3aa9dfad3a108253/test/sass/extend_test.rb#L1390-L1407
    // v3.1.18

    function third() {
      sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 3 of test_extend_in_media_inline.sass:\\n  Using @extend within directives (e.g. @media) is deprecated.\\n  It will be an error in Sass 3.2.\\n  This will only work once @extend is supported natively in the browser.\\n;')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)

          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);

      var css = ".foo {\n  a: b; }\n";
      var scss = ".foo {a: b}\n@media screen {\n  .bar {@extend .foo}\n}\n";
      equal(scss, css, {syntax: 'scss', filename: 'test_extend_in_media_inline.sass'}, done)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })
}

/*****************************************************************************************************
 * v3.1.19
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.19")) {
  it('test_nested_empty_directive', function(done) {
    // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/engine_test.rb#L2495-L2509
    // v3.1.19

    var css = "@media screen {\n  .foo {\n    a: b; }\n\n  @unknown-directive; }\n";
    var sass = "@media screen\n  .foo\n    a: b\n\n  @unknown-directive\n";
    equal(sass, css, {syntax: 'sass', filename: 'test_extend_in_media_inline.sass'}, done)
  })

  it('test_extend_within_media', function(done) {
    // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1433-L1444
    // v3.1.19

    var css = "@media screen {\n  .foo, .bar {\n    a: b; } }\n";
    var scss = "@media screen {\n  .foo {a: b}\n  .bar {@extend .foo}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_extend_within_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1446-L1457
    // v3.1.19

    var css = "@flooblehoof {\n  .foo, .bar {\n    a: b; } }\n";
    var scss = "@flooblehoof {\n  .foo {a: b}\n  .bar {@extend .foo}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_extend_within_nested_directives', function(done) {
    // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1459-L1473
    // v3.1.19

    var css = "@media screen {\n  @flooblehoof {\n    .foo, .bar {\n      a: b; } } }\n";
    var scss = "@media screen {\n  @flooblehoof {\n    .foo {a: b}\n    .bar {@extend .foo}\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_extend_within_disparate_media', function(done) {
    // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1475-L1484
    // v3.1.19

    var css = "@media screen {\n  .foo, .bar {\n    a: b; } }\n";
    var scss = "@media screen {.foo {a: b}}\n@media screen {.bar {@extend .foo}}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_extend_within_disparate_nested_directives', function(done) {
    // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1499-L1511
    // v3.1.19

    var css = "@media screen {\n  @flooblehoof {\n    .foo, .bar {\n      a: b; } } }\n@media screen {\n  @flooblehoof {} }\n";
    var scss = "@media screen {@flooblehoof {.foo {a: b}}}\n@media screen {@flooblehoof {.bar {@extend .foo}}}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  if (semver.lt(window.__libVersion, "3.3.0")) {
    it('test_extend_out_of_media', function(done) {
      // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1372-L1388
      // v3.1.19

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 3 of test_extend_out_of_media_inline.sass:\\n  @extending an outer selector from within @media is deprecated.\\n  You may only @extend selectors within the same directive.\\n  This will be an error in Sass 3.3.\\n  It can only work once @extend is supported natively in the browser')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)

            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        var css = ".foo {\n  a: b; }\n\n@flooblehoof {}\n";
        var scss = ".foo {a: b}\n@flooblehoof {\n  .bar {@extend .foo}\n}\n";
        equal(scss, css, {syntax: 'scss', filename: 'test_extend_out_of_media_inline.sass'}, done)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    if (semver.lt(window.__libVersion, "3.3.0")) {
      it('test_extend_out_of_unknown_directive', function(done) {
        // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1390-L1408
        // v3.1.19

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 3 of test_extend_out_of_unknown_directive_inline.sass:\\n  @extending an outer selector from within @flooblehoof is deprecated.\\n  You may only @extend selectors within the same directive.\\n  This will be an error in Sass 3.3.\\n  It can only work once @extend is supported natively in the browser')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)

              done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);

          var css = ".foo {\n  a: b; }\n";
          var scss = ".foo {a: b}\n@media screen {\n  .bar {@extend .foo}\n}\n";
          equal(scss, css, {syntax: 'scss', filename: 'test_extend_in_media_inline.sass'}, done)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })
    }

    it('test_extend_out_of_nested_directives', function(done) {
      // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1410-L1431
      // v3.1.19

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 4 of test_extend_out_of_nested_directives_inline.sass:\\n  @extending an outer selector from within @flooblehoof is deprecated.\\n  You may only @extend selectors within the same directive.\\n  This will be an error in Sass 3.3.\\n  It can only work once @extend is supported natively in the browser')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)

            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        var css = "@media screen {\n  .foo {\n    a: b; }\n\n  @flooblehoof {} }\n";
        var scss = "@media screen {\n  .foo {a: b}\n  @flooblehoof {\n    .bar {@extend .foo}\n  }\n}\n";
        equal(scss, css, {syntax: 'scss', filename: 'test_extend_out_of_nested_directives_inline.sass'}, done)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_extend_within_and_without_media', function(done) {
      // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1513-L1534
      // v3.1.19

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 4 of test_extend_within_and_without_media_inline.sass:\\n  @extending an outer selector from within @media is deprecated.\\n  You may only @extend selectors within the same directive.\\n  This will be an error in Sass 3.3.\\n  It can only work once @extend is supported natively in the browser')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)

            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        var css = ".foo {\n  a: b; }\n\n@media screen {\n  .foo, .bar {\n    c: d; } }\n";
        var scss = ".foo {a: b}\n@media screen {\n  .foo {c: d}\n  .bar {@extend .foo}\n}\n";
        equal(scss, css, {syntax: 'scss', filename: 'test_extend_within_and_without_media_inline.sass'}, done)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_extend_within_and_without_unknown_directive', function(done) {
      // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1536-L1557
      // v3.1.19

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 4 of test_extend_within_and_without_unknown_directive_inline.sass:\\n  @extending an outer selector from within @flooblehoof is deprecated.\\n  You may only @extend selectors within the same directive.\\n  This will be an error in Sass 3.3.\\n  It can only work once @extend is supported natively in the browse')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)

            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        var css = ".foo {\n  a: b; }\n\n@flooblehoof {\n  .foo, .bar {\n    c: d; } }\n";
        var scss = ".foo {a: b}\n@flooblehoof {\n  .foo {c: d}\n  .bar {@extend .foo}\n}\n";
        equal(scss, css, {syntax: 'scss', filename: 'test_extend_within_and_without_unknown_directive_inline.sass'}, done)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_extend_within_and_without_nested_directives', function(done) {
      // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1559-L1583
      // v3.1.19

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 5 of test_extend_within_and_without_nested_directives_inline.sass:\\n  @extending an outer selector from within @flooblehoof is deprecated.\\n  You may only @extend selectors within the same directive.\\n  This will be an error in Sass 3.3.\\n  It can only work once @extend is supported natively in the browser')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)

            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        var css = "@media screen {\n  .foo {\n    a: b; }\n\n  @flooblehoof {\n    .foo, .bar {\n      c: d; } } }\n";
        var scss = "@media screen {\n  .foo {a: b}\n  @flooblehoof {\n    .foo {c: d}\n    .bar {@extend .foo}\n  }\n}\n";
        equal(scss, css, {syntax: 'scss', filename: 'test_extend_within_and_without_nested_directives_inline.sass'}, done)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_extend_within_disparate_unknown_directive', function(done) {
      // https://github.com/sass/sass/blob/609fb94ee2bf82d19bb0ebf846583da9e8c0e2b4/test/sass/extend_test.rb#L1486-L1497
      // v3.1.19

      var css = "@flooblehoof {\n  .foo, .bar {\n    a: b; } }\n\n@flooblehoof {}\n";
      var scss = "@flooblehoof {.foo {a: b}}\n@flooblehoof {.bar {@extend .foo}}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })

  }

}

/*****************************************************************************************************
 * v3.1.20
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.20")) {
  it('test_selector_without_closing_bracket', function(done) {
    // https://github.com/sass/sass/blob/02947c98036e7e95a726bf731818005d86a02f58/test/sass/scss/css_test.rb#L949-L951
    // v3.1.20

    doesnt_parse('foo[bar <err>{a: b}','"]"',{syntax: 'scss'},done)
  })

  it('test_saturate', function(done) {
    // https://github.com/sass/sass/blob/02947c98036e7e95a726bf731818005d86a02f58/test/sass/functions_test.rb#L426
    // v3.1.20

    eval_equal(func_parse("saturate(50%)"), '"saturate(50%)"', {}, done)
  });

  it('test_opacity', function(done) {
    // https://github.com/sass/sass/blob/02947c98036e7e95a726bf731818005d86a02f58/test/sass/functions_test.rb#L315-L321
    // v3.1.20

    function fifth() {eval_equal(func_parse('opacity(#123456)'), '"1"', {}, done) }
    function fourth() {eval_equal(func_parse('opacity(rgba(0, 1, 2, 0.34))'), '"0.34"', {}, fifth) }
    function third() {eval_equal(func_parse('opacity(hsla(0, 1, 2, 0))'), '"0"', {}, fourth) }
    function second() {eval_equal(func_parse('opacity($color: hsla(0, 1, 2, 0))'), '"0"', {}, third) }
    eval_equal(func_parse('opacity(20%)'), '"opacity(20%)"', {}, second)
  });

  it('test_invert', function(done) {
    // https://github.com/sass/sass/blob/02947c98036e7e95a726bf731818005d86a02f58/test/sass/functions_test.rb#L813
    // v3.1.20

    eval_equal(func_parse("invert(20%)"), '"invert(20%)"', {}, done)
  });


  if (semver.lt(window.__libVersion, "3.2.10")) {
    // err message was modified in 3.2.10
    it('test_opacity_exception', function(done) {
      // https://github.com/sass/sass/blob/02947c98036e7e95a726bf731818005d86a02f58/test/sass/functions_test.rb#L323-L325
      // v3.1.20

      eval_err(func_parse('opacity(foo)'), "\"foo\" is not a color", {}, done);
    });
  }

}

/*****************************************************************************************************
 * v3.1.21
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.1.21")) {
  it('test_unit', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L846-L854
    // v3.1.21

    function h() {eval_equal(func_parse("unit($number: 100px)"), '"\\"px\\""', {}, done)}
    function g() { eval_equal(func_parse("unit(100)"), '"\\"\\""', {}, h) }
    function f() { eval_equal(func_parse("unit(100px)"), '"\\"px\\""', {}, g) }
    function e() { eval_equal(func_parse("unit(10px * 5em)"), '"\\"em*px\\""', {}, f) }
    function d() { eval_equal(func_parse("unit(5em * 10px)"), '"\\"em*px\\""', {}, e) }
    function c() { eval_equal(func_parse("unit(10px * 5em / 30cm / 1rem)"), '"\\"em/rem\\""', {}, d) }
    function b() { eval_equal(func_parse("unit(10vh * 5em / 30cm / 1rem)"), '"\\"em*vh/cm*rem\\""', {}, c) }
    eval_err(func_parse('unit(#f00)'), "#ff0000 is not a number", {}, b);
  });

  it('test_operator_unit_conversion', function(done) {
    // https://github.com/sass/sass/blob/287abb9d6110aba75686a83624b9520d46d3a5aa/test/sass/script_test.rb#L362
    // v3.1.21

    eval_equal(func_parse("1in + 96px"), '"2in"', {}, done)
  });

  it('test_single_line_comment_within_multiline_comment', function(done) {
    // https://github.com/sass/sass/blob/287abb9d6110aba75686a83624b9520d46d3a5aa/test/sass/scss/css_test.rb#L965-L978
    // v3.1.21

    var css = "body {\n  /*\n  //comment here\n  */ }\n";
    var scss = "body {\n  /*\n  //comment here\n  */\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_newline_selector_rendered_multiple_times', function(done) {
    // https://github.com/sass/sass/blob/287abb9d6110aba75686a83624b9520d46d3a5aa/test/sass/scss/scss_test.rb#L1108-L1127
    // v3.1.21

    var css = "form input,\nform select {\n  color: white; }\n\nform input,\nform select {\n  color: white; }\n";
    var scss = "@for $i from 1 through 2 {\n  form {\n    input,\n    select {\n      color: white;\n    }\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })
}

/*****************************************************************************************************
 * v3.2.0
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.0")) {
  //TODO we do not currently support imports. PRs welcome!
  it.skip('test_import_from_global_load_paths', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L668-L676
    // v3.2.0
  })

  it('test_guarded_assign', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1084
    // v3.1.0

    var css = "foo {\n  a: b; }\n"
      var scss = "$foo: b !default\nfoo\n  a: $foo"
      equal(scss, css, {syntax: 'sass'}, done)
  })

  it('test_function_with_missing_argument', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1286-L1297
    // v3.2.0

    err_message("@function plus($var1, $var2)\n  @return $var1 + $var2\n\nbar\n  a: plus($var2: bar)", 'Function plus is missing argument $var1.', {syntax: 'sass'}, done)
  })

  it('test_function_with_extra_argument', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1299-L1310
    // v3.2.0

    err_message("@function plus($var1, $var2)\n  @return $var1 + $var2\n\nbar\n  a: plus($var1: foo, $var2: bar, $var3: baz)\n", 'Function plus doesn\'t have an argument named $var3.', {syntax: 'sass'}, done)
  })

  it('test_function_with_positional_and_keyword_argument', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1312-L1323
    // v3.2.0

    err_message("@function plus($var1, $var2)\n  @return $var1 + $var2\n\nbar\n  a: plus(foo, bar, $var2: baz)\n", 'Function plus was passed argument $var2 both by position and by name.', {syntax: 'sass'}, done)
  })

  it('test_function_with_keyword_before_positional_argument', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1325-L1336
    // v3.2.0

    err_message("@function plus($var1, $var2)\n  @return $var1 + $var2\n\nbar\n  a: plus($var2: foo, bar)\n", 'Positional arguments must come before keyword arguments.', {syntax: 'sass'}, done)
  })

  it('test_if_directive', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1415-L1423
    // v3.2.0

    var css = "a {\n  b: 2; }\n"
      var sass = "$var: null\na\n  @if $var\n    b: 1\n  @if not $var\n    b: 2\n";
    equal(sass, css,{syntax: 'sass'}, done)
  });

  it('test_nonprinting_empty_property', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1819-L1837
    // v3.2.0

    var css = "a {\n  c: \"\";\n  e: f; }\n";
    var sass = "$null-value: null\n$empty-string: ''\n$empty-list: (null)\na\n  b: $null-value\n  c: $empty-string\n  d: $empty-list\n  e: f\n\ng\n  h: null\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_double_media_bubbling', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2130-L2156
    // v3.2.0

    function second() {
      var css = "@media bar {\n  .foo {\n    a: b; } }\n  @media bar and (a: b) {\n    .foo {\n      c: d; } }\n";
      var scss = ".foo\n  @media bar\n    a: b\n    @media  (a: b)\n      c: d\n";
      equal(scss, css, {syntax: 'sass'}, done)
    }

    var css = "@media bar and (a: b) {\n  .foo {\n    c: d; } }\n";
    var scss = "@media bar\n  @media (a: b)\n    .foo\n      c: d\n";
    equal(scss, css, {syntax: 'sass'}, second)
  });

  it('test_double_media_bubbling_with_commas', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2158-L2169
    // v3.2.0

    var css = "@media (a: b) and (e: f), (c: d) and (e: f), (a: b) and (g: h), (c: d) and (g: h) {\n  .foo {\n    c: d; } }\n";
    var sass = "@media (a: b), (c: d)\n  @media (e: f), (g: h)\n    .foo\n      c: d\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_eliminated_media_bubbling', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2231-L2261
    // v3.2.0

    function third() {
      var css = "@media screen {\n  a: b; }\n";
      var sass = "@media screen\n  a: b\n  @media print\n    c: d\n";
      equal(sass, css, {syntax: 'sass'}, done)
    }

    function second() {
      var css = "@media not print {\n  a: b; }\n";
      var sass = "@media not print\n  a: b\n  @media print\n    c: d\n";
      equal(sass, css, {syntax: 'sass'}, done)
    }

    var css = "@media screen {\n  a: b; }\n";
    var sass = "@media screen\n  a: b\n  @media print\n    c: d\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_non_eliminated_media_bubbling', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2263-L2299
    // v3.2.0

    function third() {
      var css = "@media only screen {\n  a: b; }\n@media only screen and (a: b) {\n  c: d; }\n";
      var sass = "@media only screen\n  a: b\n  @media screen and (a: b)\n    c: d\n";
      equal(sass, css, {syntax: 'sass'}, done)
    }

    function second() {
      var css = "@media not print {\n  a: b; }\n@media screen {\n  c: d; }\n";
      var sass = "@media not print\n  a: b\n  @media screen\n    c: d\n";
      equal(sass, css, {syntax: 'sass'}, done)
    }

    var css = "@media screen {\n  a: b; }\n@media screen and (a: b) {\n  c: d; }\n";
    var sass = "@media screen\n  a: b\n  @media screen and (a: b)\n    c: d\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_directive_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2301-L2310
    // v3.2.0

    var css = "@foo bar12 qux {\n  a: b; }\n";
    var sass = "$baz: 12\n@foo bar#{$baz} qux\n  a: b\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_media_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2312-L2321
    // v3.2.0

    var css = "@media bar12 {\n  a: b; }\n";
    var sass = "$baz: 12\n@media bar#{$baz}\n  a: b\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_variables_in_media', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2323-L2335
    // v3.2.0

    var css = "@media screen and (-webkit-min-device-pixel-ratio-foo: 25), only print {\n  a: b; }\n";
    var sass = "$media1: screen\n$media2: print\n$var: -webkit-min-device-pixel-ratio\n$val: 20\n@media #{$media1} and ($var + \"-foo\": $val + 5), only #{$media2}\n  a: b\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_variable_in_media_in_mixin', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2339-L2358
    // v3.2.0

    var css = "@media screen and (min-width: 10px) {\n  body {\n    background: red; } }\n@media screen and (min-width: 20px) {\n  body {\n    background: blue; } }\n";
    var sass = "@mixin respond-to($width)\n  @media screen and (min-width: $width)\n    @content\n\nbody\n  @include respond-to(10px)\n    background: red\n  @include respond-to(20px)\n    background: blue\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_comment_like_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2698-L2703
    // v3.2.0

    err_message("/ foo\n  a: b\n", 'Invalid CSS after "/": expected identifier, was " foo"', {syntax: 'sass'}, done)
  })

  it('test_content', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2897-L2913
    // v3.2.0

    var css = ".children {\n  background-color: red;\n  color: blue;\n  border-color: red; }\n";
    var sass = "$color: blue\n=context($class, $color: red)\n  .#{$class}\n    background-color: $color\n    @content\n    border-color: $color\n+context(children)\n  color: $color\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_selector_in_content', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2915-L2933
    // v3.2.0

    var css = ".parent {\n  background-color: red;\n  border-color: red; }\n  .parent .children {\n    color: blue; }\n";
    var sass = "$color: blue\n=context($class, $color: red)\n  .#{$class}\n    background-color: $color\n    @content\n    border-color: $color\n+context(parent)\n  .children\n    color: $color\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_using_parent_mixin_in_content', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2935-L2959
    // v3.2.0

    var css = ".parent {\n  before-color: red;\n  after-color: red; }\n  .parent .sibling {\n    before-color: yellow;\n    after-color: yellow; }\n    .parent .sibling .child {\n      before-color: green;\n      color: blue;\n      after-color: green; }\n";
    var sass = "$color: blue\n=context($class, $color: red)\n  .#{$class}\n    before-color: $color\n    @content\n    after-color: $color\n+context(parent)\n  +context(sibling, $color: yellow)\n    +context(child, $color: green)\n      color: $color\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_content_more_than_once', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2961-L2978
    // v3.2.0

    var css = ".once {\n  color: blue; }\n\n.twice {\n  color: blue; }\n";
    var sass = "$color: blue\n=context($class, $color: red)\n  .once\n    @content\n  .twice\n    @content\n+context(parent)\n  color: $color\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_content_with_variable', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2980-L2992
    // v3.2.0

    var css = ".foo {\n  a: 1px; }\n";
    var sass = "=foo\n  .foo\n    @content\n+foo\n  $a: 1px\n  a: $a\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_nested_content_blocks', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2994-L3026
    // v3.2.0

    var css = ".foo {\n  a: foo; }\n  .foo .bar {\n    a: bar; }\n    .foo .bar .baz {\n      a: baz; }\n      .foo .bar .baz .outside {\n        a: outside;\n        color: red; }\n";
    var sass = "$a: outside\n=baz($a: baz)\n  .baz\n    a: $a\n    @content\n=bar($a: bar)\n  .bar\n    a: $a\n    +baz\n      @content\n=foo($a: foo)\n  .foo\n    a: $a\n    +bar\n      @content\n+foo\n  .outside\n    a: $a\n    color: red\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_content_not_seen_through_mixin', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L3028-L3049
    // v3.2.0

    var css = "a foo {\n  mixin: foo;\n  a: b; }\n  a foo bar {\n    mixin: bar; }\n";
    var sass = "=foo\n  foo\n    mixin: foo\n    @content\n    +bar\n=bar\n  bar\n    mixin: bar\n    @content\na\n  +foo\n    a: b\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_multiple_extends_with_single_extender_and_single_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L95-L99
    // v3.2.0

    function second() {
      extend_equals('.foo.bar', '.baz {@extend .foo; @extend .bar}', '.foo.bar, .baz', {syntax: 'scss'}, done)
    }

    extend_equals('.foo .bar', '.baz {@extend .foo; @extend .bar}', '.foo .bar, .baz .bar, .foo .baz, .baz .baz', {syntax: 'scss'}, second)
  });

  it('test_multiple_extends_with_multiple_extenders_and_single_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L101-L119
    // v3.2.0

    function second() {
      var css = ".foo.bar, .bar.baz, .baz.bang, .foo.bang {\n  a: b; }\n";
      var scss = ".foo.bar {a: b}\n.baz {@extend .foo}\n.bang {@extend .bar}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }
    var css = ".foo .bar, .baz .bar, .foo .bang, .baz .bang {\n  a: b; }\n";
    var scss = ".foo .bar {a: b}\n.baz {@extend .foo}\n.bang {@extend .bar}\n";
    equal(scss, css, {syntax: 'scss'}, second)
  });

  it('test_chained_extends', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L121-L131
    // v3.2.0

    var css = ".foo, .bar, .baz, .bip {\n  a: b; }\n";
    var scss = ".foo {a: b}\n.bar {@extend .foo}\n.baz {@extend .bar}\n.bip {@extend .bar}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_dynamic_extendee', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L133-L137
    // v3.2.0

    function second() {
      extend_equals('[baz^="blip12px"]', '.bar {@extend [baz^="blip#{12px}"]}', '[baz^="blip12px"], .bar', {syntax: 'scss'}, done)
    }
    extend_equals('.foo', '.bar {@extend #{".foo"}}', '.foo, .bar', {syntax: 'scss'}, second)
  });

  it('test_nested_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L139-L141
    // v3.1.0

    extend_equals('.foo .bar', '.baz {@extend .bar}', '.foo .bar, .foo .baz', {syntax: 'scss'}, done)
  });

  it('test_target_with_child', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L143-L145
    // v3.2.0

    extend_equals('.foo .bar', '.baz {@extend .foo}', '.foo .bar, .baz .bar', {syntax: 'scss'}, done)
  });

  it('test_class_unification', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L147-L150
    // v3.2.0
    function second() {
      unification('.foo.bar', '.baz {@extend .foo}', '.foo.bar, .bar.baz', {syntax: 'scss'}, done)
    }
    unification('.foo.baz', '.baz {@extend .foo}', '.baz', {syntax: 'scss'}, second)
  });

  it('test_universal_unification_with_simple_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L161-L167
    // v3.2.0

    function fifth() { unification('.foo.bar', 'ns|* {@extend .foo}', '.foo.bar, ns|*.bar', {syntax: 'scss'}, done) }
    function fourth() { unification('.foo.bar', '*|* {@extend .foo}', '.bar', {syntax: 'scss'}, fifth) }
    function third() { unification('.foo.bar', '* {@extend .foo}', '.bar', {syntax: 'scss'}, fourth) }
    function second() { unification('.foo', '*|* {@extend .foo}', '.foo, *|*', {syntax: 'scss'}, third) }
    unification('.foo', '* {@extend .foo}', '.foo, *', {syntax: 'scss'}, second)
  });

  it('test_universal_unification_with_namespaceless_universal_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L169-L176
    // v3.2.0

    function sixth() { unification('*|*.foo', 'ns|* {@extend .foo}', '*|*.foo, ns|*', {syntax: 'scss'}, done) }
    function fifth() { unification('*.foo', 'ns|* {@extend .foo}', '*.foo, ns|*', {syntax: 'scss'}, sixth) }
    function fourth() { unification('*|*.foo', '*|* {@extend .foo}', '*|*', {syntax: 'scss'}, fifth) }
    function third() { unification('*|*.foo', '* {@extend .foo}', '*|*.foo, *', {syntax: 'scss'}, fourth) }
    function second() { unification('*.foo', '*|* {@extend .foo}', '*', {syntax: 'scss'}, third) }
    unification('*.foo', '* {@extend .foo}', '*', {syntax: 'scss'}, third)
  });

  it('test_universal_unification_with_namespaceless_element_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L189-L196
    // v3.2.0

    function sixth() { unification('*|a.foo', 'ns|* {@extend .foo}', '*|a.foo, ns|a', {syntax: 'scss'}, done) }
    function fifth() { unification('a.foo', 'ns|* {@extend .foo}', 'a.foo, ns|a', {syntax: 'scss'}, sixth) }
    function fourth() { unification('*|a.foo', '*|* {@extend .foo}', '*|a', {syntax: 'scss'}, fifth) }
    function third() { unification('*|a.foo', '* {@extend .foo}', '*|a.foo, a', {syntax: 'scss'}, fourth) }
    function second() { unification('a.foo', '*|* {@extend .foo}', 'a', {syntax: 'scss'}, third) }
    unification('a.foo', '* {@extend .foo}', 'a', {syntax: 'scss'}, third)
  });

  it('test_element_unification_with_simple_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L209-L214
    // v3.2.0

    function fourth() { unification('.foo.bar', 'ns|a {@extend .foo}', '.foo.bar, ns|a.bar', {syntax: 'scss'}, done) }
    function third() { unification('.foo.bar', '*|a {@extend .foo}', '.foo.bar, *|a.bar', {syntax: 'scss'}, fourth) }
    function second() { unification('.foo.bar', 'a {@extend .foo}', '.foo.bar, a.bar', {syntax: 'scss'}, third) }
    unification('.foo', 'a {@extend .foo}', '.foo, a', {syntax: 'scss'}, third)
  });

  it('test_element_unification_with_namespaceless_universal_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L216-L223
    // v3.2.0

    function sixth() { unification('*|*.foo', 'ns|a {@extend .foo}', '*|*.foo, ns|a', {syntax: 'scss'}, done) }
    function fifth() { unification('*.foo', 'ns|a {@extend .foo}', '*.foo, ns|a', {syntax: 'scss'}, sixth) }
    function fourth() { unification('*|*.foo', '*|a {@extend .foo}', '*|*.foo, *|a', {syntax: 'scss'}, fifth) }
    function third() { unification('*|*.foo', 'a {@extend .foo}', '*|*.foo, a', {syntax: 'scss'}, fourth) }
    function second() { unification('*.foo', '*|a {@extend .foo}', '*.foo, a', {syntax: 'scss'}, third) }
    unification('*.foo', 'a {@extend .foo}', '*.foo, a', {syntax: 'scss'}, third)
  });

  it('test_element_unification_with_namespaceless_element_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L236-L247
    // v3.2.0

    function seventh() {
      extend_doesnt_match(function (filename, syntax, cb) {unification('a.foo', 'h1 {@extend .foo}', 'a.foo', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, 'h1', '.foo', 'failed_to_unify', 2, 'test_element_unification_with_namespaceless_element_target_inline', 'scss', done)
    }

    function sixth() { unification('*|a.foo', 'ns|a {@extend .foo}', '*|a.foo, ns|a', {syntax: 'scss'}, done) }
    function fifth() { unification('a.foo', 'ns|a {@extend .foo}', 'a.foo, ns|a', {syntax: 'scss'}, sixth) }
    function fourth() { unification('*|a.foo', '*|a {@extend .foo}', '*|a', {syntax: 'scss'}, done) }
    function third() { unification('*|a.foo', 'a {@extend .foo}', '*|a.foo, a', {syntax: 'scss'}, fourth) }
    function second() { unification('a.foo', '*|a {@extend .foo}', 'a', {syntax: 'scss'}, third) }
    unification('a.foo', 'a {@extend .foo}', 'a', {syntax: 'scss'}, third)
  });

  it('test_attribute_unification', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L260-L266
    // v3.2.0

    function fifth() { unification('%-a [foo=bar].bar', '[foo=bar] {@extend .bar}', '-a [foo=bar]', {syntax: 'scss'}, done) }
    function fourth() { unification('[foo=bar].baz', '[ns|foo=bar] {@extend .baz}', '[foo=bar].baz, [foo=bar][ns|foo=bar]', {syntax: 'scss'}, done) }
    function third() { unification('[foo=bar].baz', '[foot=bar] {@extend .baz}', '[foo=bar].baz, [foo=bar][foot=bar]', {syntax: 'scss'}, fourth) }
    function second() { unification('[foo=bar].baz', '[foo^=bar] {@extend .baz}', '[foo=bar].baz, [foo=bar][foo^=bar]', {syntax: 'scss'}, third) }
    unification('[foo=bar].baz', '[foo=baz] {@extend .baz}', '[foo=bar].baz, [foo=bar][foo=baz]', {syntax: 'scss'}, second)
  });

  it('test_pseudoelement_remains_at_end_of_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L288-L291
    // v3.2.0

    function second() { extend_equals('a.foo::bar', '.baz {@extend .foo}', 'a.foo::bar, a.baz::bar', {syntax: 'scss'}, done) }
    extend_equals('.foo::bar', '.baz {@extend .foo}', '.foo::bar, .baz::bar', {syntax: 'scss'}, second)
  });

  it('test_pseudoclass_remains_at_end_of_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L293-L296
    // v3.2.0

    function second() { extend_equals('a.foo:bar', '.baz {@extend .foo}', 'a.foo:bar, a.baz:bar', {syntax: 'scss'}, done) }
    extend_equals('.foo:bar', '.baz {@extend .foo}', '.foo:bar, .baz:bar', {syntax: 'scss'}, second)
  });

  it('test_not_remains_at_end_of_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L298-L300
    // v3.2.0

    extend_equals('.foo:not(.bar)', '.baz {@extend .foo}', '.foo:not(.bar), .baz:not(.bar)', {syntax: 'scss'}, done)
  });

  it('test_pseudoelement_goes_lefter_than_pseudoclass', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L302-L305
    // v3.2.0

    function second() { extend_equals('.foo:bar', '.baz::bang {@extend .foo}', '.foo:bar, .baz:bar::bang', {syntax: 'scss'}, done) }
    extend_equals('.foo::bar', '.baz:bang {@extend .foo}', '.foo::bar, .baz:bang::bar', {syntax: 'scss'}, second)
  });

  it('test_pseudoelement_goes_lefter_than_not', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L307-L310
    // v3.2.0

    function second() { extend_equals('.foo:not(.bang)', '.baz::bar {@extend .foo}', '.foo:not(.bang), .baz:not(.bang)::bar', {syntax: 'scss'}, done) }
    extend_equals('.foo::bar', '.baz:not(.bang) {@extend .foo}', '.foo::bar, .baz:not(.bang)::bar', {syntax: 'scss'}, second)
  });

  it('test_redundant_selector_elimination', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L332-L341
    // v3.2.0
    var css = ".foo.bar, .x, .y {\n  a: b; }\n";
    var scss = ".foo.bar {a: b}\n.x {@extend .foo, .bar}\n.y {@extend .foo, .bar}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_long_extendee', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L345-L347
    // v3.2.0

    extend_equals('.foo.bar', '.baz {@extend .foo.bar}', '.foo.bar, .baz', {syntax: 'scss'}, done)
  });

  it('test_long_extendee_matches_supersets', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L355-L357
    // v3.2.0

    extend_equals('.foo.bar.bap', '.baz {@extend .foo.bar}', '.foo.bar.bap, .bap.baz', {syntax: 'scss'}, done)
  });

  it('test_long_extendee_runs_unification', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L359-L361
    // v3.2.0

    extend_equals('ns|*.foo.bar', 'a.baz {@extend .foo.bar}', 'ns|*.foo.bar, ns|a.baz', {syntax: 'scss'}, done)
  });

  it('test_long_extender', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L365-L367
    // v3.2.0

    extend_equals('.foo.bar', '.baz.bang {@extend .foo}', '.foo.bar, .bar.baz.bang', {syntax: 'scss'}, done)
  });

  it('test_long_extender_runs_unification', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L369-L371
    // v3.2.0

    extend_equals('ns|*.foo.bar', 'a.baz {@extend .foo}', 'ns|*.foo.bar, ns|a.bar.baz', {syntax: 'scss'}, done)
  });

  it('test_nested_extender', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L385-L387
    // v3.2.0

    extend_equals('.foo', 'foo bar {@extend .foo}', '.foo, foo bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_runs_unification', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L389-L391
    // v3.2.0

    extend_equals('.foo.bar', 'foo bar {@extend .foo}', '.foo.bar, foo bar.bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_alternates_parents', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L399-L402
    // v3.2.0

    extend_equals('.baz .bip .foo', 'foo .grank bar {@extend .foo}', '.baz .bip .foo, .baz .bip foo .grank bar, foo .grank .baz .bip bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_unifies_identical_parents', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L404-L407
    // v3.2.0

    extend_equals('.baz .bip .foo', '.baz .bip bar {@extend .foo}', '.baz .bip .foo, .baz .bip bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_unifies_common_substring', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L409-L412
    // v3.2.0

    extend_equals('.baz .bip .bap .bink .foo', '.brat .bip .bap bar {@extend .foo}', '.baz .bip .bap .bink .foo, .baz .brat .bip .bap .bink bar, .brat .baz .bip .bap .bink bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_unifies_common_subseq', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L414-L417
    // v3.2.0

    extend_equals('.a .x .b .y .foo', '.a .n .b .m bar {@extend .foo}', '.a .x .b .y .foo, .a .x .n .b .y .m bar, .a .n .x .b .y .m bar, .a .x .n .b .m .y bar, .a .n .x .b .m .y bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_chooses_first_subseq', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L419-L422
    // v3.2.0

    extend_equals('.a .b .c .d .foo', '.c .d .a .b .bar {@extend .foo}', '.a .b .c .d .foo, .a .b .c .d .a .b .bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_counts_extended_subselectors', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L424-L427
    // v3.2.0

    extend_equals('.a .bip.bop .foo', '.b .bip .bar {@extend .foo}', '.a .bip.bop .foo, .a .b .bip.bop .bar, .b .a .bip.bop .bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_counts_extended_superselectors', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L424-L427
    // v3.2.0

    extend_equals('.a .bip .foo', '.b .bip.bop .bar {@extend .foo}', '.a .bip .foo, .a .b .bip.bop .bar, .b .a .bip.bop .bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_with_child_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L424-L427
    // v3.2.0

    extend_equals('.baz .foo', 'foo > bar {@extend .foo}', '.baz .foo, .baz foo > bar', {syntax: 'scss'}, done)
  });

  it('test_nested_extender_finds_common_selectors_around_child_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L438-L441
    // v3.2.0

    function second() {extend_equals('a > b c .c1', 'b c .c2 {@extend .c1}', 'a > b c .c1, a > b c .c2', {syntax: 'scss'}, done)}
    extend_equals('a > b c .c1', 'a c .c2 {@extend .c1}', 'a > b c .c1, a > b c .c2', {syntax: 'scss'}, second)
  });

  it('test_nested_extender_doesnt_find_common_selectors_around_adjacent_sibling_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L443-L447
    // v3.2.0

    function third() {extend_equals('a + b c .c1', 'b c .c2 {@extend .c1}', 'a + b c .c1, a + b c .c2', {syntax: 'scss'}, done)}
    function second() {extend_equals('a + b c .c1', 'a b .c2 {@extend .c1}', 'a + b c .c1, a a + b c .c2', {syntax: 'scss'}, third)}
    extend_equals('a + b c .c1', 'a c .c2 {@extend .c1}', 'a + b c .c1, a + b a c .c2, a a + b c .c2', {syntax: 'scss'}, second)
  });

  it('test_nested_extender_doesnt_find_common_selectors_around_sibling_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L449-L453
    // v3.2.0

    function third() {extend_equals('a ~ b c .c1', 'b c .c2 {@extend .c1}', 'a ~ b c .c1, a ~ b c .c2', {syntax: 'scss'}, done)}
    function second() {extend_equals('a ~ b c .c1', 'a b .c2 {@extend .c1}', 'a ~ b c .c1, a a ~ b c .c2', {syntax: 'scss'}, third)}
    extend_equals('a ~ b c .c1', 'a c .c2 {@extend .c1}', 'a ~ b c .c1, a ~ b a c .c2, a a ~ b c .c2', {syntax: 'scss'}, second)
  });

  it('test_nested_extender_doesnt_find_common_selectors_around_reference_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L455-L459
    // v3.2.0

    function third() {extend_equals('a /for/ b c .c1', 'a c .c2 {@extend .c1}', 'a /for/ b c .c1, a /for/ b a c .c2, a a /for/ b c .c2', {syntax: 'scss'}, done)}
    function second() {extend_equals('a /for/ b c .c1', 'a b .c2 {@extend .c1}', 'a /for/ b c .c1, a a /for/ b c .c2', {syntax: 'scss'}, third)}
    extend_equals('a /for/ b c .c1', 'b c .c2 {@extend .c1}', 'a /for/ b c .c1, a /for/ b c .c2', {syntax: 'scss'}, second)
  });

  it('test_nested_extender_with_early_child_selectors_doesnt_subseq_them', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L461-L466
    // v3.2.0

    function second() {extend_equals('.bap > .bip .foo', '.bap > .grip .bar {@extend .foo}', '.bap > .bip .foo, .bap > .bip .bap > .grip .bar, .bap > .grip .bap > .bip .bar', {syntax: 'scss'}, done)}
    extend_equals('.bip > .bap .foo', '.grip > .bap .bar {@extend .foo}', '.bip > .bap .foo, .bip > .bap .grip > .bap .bar, .grip > .bap .bip > .bap .bar', {syntax: 'scss'}, second)
  });

  it('test_nested_extender_with_child_selector_unifies', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L468-L490
    // v3.2.0

    function third() {
      var css = ".foo .bar, .foo > .baz {\n  a: b; }\n";
      var scss = ".foo {\n  .bar {a: b}\n  > .baz {@extend .bar}\n}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }

    function second() {
      var css = ".baz > .foo, .baz > .bar {\n  a: b; }\n";
      var scss = ".baz > {\n  .foo {a: b}\n  .bar {@extend .foo}\n}\n";
      equal(scss, css, {syntax: 'scss'}, third)
    }

    extend_equals('.baz.foo', 'foo > bar {@extend .foo}', '.baz.foo, foo > bar.baz', {syntax: 'scss'}, second)
  });

  it('test_nested_extender_with_early_child_selectors_doesnt_subseq_them', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L492-L516
    // v3.2.0

    function fifth() {
      extend_equals('.foo > .bar', '.bip > .baz {@extend .bar}', '.foo > .bar, .bip.foo > .baz', {syntax: 'scss'}, done)
    }

    function fourth() {
      extend_equals('.foo + .bar', '.bip > .baz {@extend .bar}', '.foo + .bar, .bip > .foo + .baz', {syntax: 'scss'}, fifth)
    }

    function third() {
      extend_equals('.foo > .bar', '.bip + .baz {@extend .bar}', '.foo > .bar, .foo > .bip + .baz', {syntax: 'scss'}, fourth)
    }

    function second() {
      var css = ".foo .bip .bar, .foo .bip .foo > .baz {\n  a: b; }\n";
      var scss = ".foo {\n  .bip .bar {a: b}\n  > .baz {@extend .bar}\n}\n";
      equal(scss, css, {syntax: 'scss'}, third)
    }

    var css = ".foo .bar, .foo .bip > .baz {\n  a: b; }\n";
    var scss = ".foo {\n  .bar {a: b}\n  .bip > .baz {@extend .bar}\n}\n";
    equal(scss, css, {syntax: 'scss'}, second)
  });

  it('test_nested_extender_with_sibling_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L524-L526
    // v3.2.0

    extend_equals('.baz .foo', 'foo + bar {@extend .foo}', '.baz .foo, .baz foo + bar', {syntax: 'scss'}, done)
  })

  it('test_nested_extender_with_hacky_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L528-L532
    // v3.2.0

    function second() {
      extend_equals('.baz .foo', '> > bar {@extend .foo}', '.baz .foo, > > .baz bar', {syntax: 'scss'}, done)
    }

    extend_equals('.baz .foo', 'foo + > > + bar {@extend .foo}', '.baz .foo, .baz foo + > > + bar, foo .baz + > > + bar', {syntax: 'scss'}, second)
  })

  it('test_nested_extender_with_child_selector_merges_with_same_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L545-L548
    // v3.2.0

    extend_equals('.foo > .bar .baz', '.foo > .bar .bang {@extend .baz}', '.foo > .bar .baz, .foo > .bar .bang', {syntax: 'scss'}, done)
  })

  it('test_combinator_unification_for_hacky_combinators', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L552-L560
    // v3.2.0

    function g() {extend_equals('.a > + x', '.b y {@extend x}', '.a > + x, .a .b > + y, .b .a > + y', {syntax: 'scss'}, done)}
    function f() {extend_equals('.a x', '.b > + y {@extend x}', '.a x, .a .b > + y, .b .a > + y', {syntax: 'scss'}, g)}
    function e() {extend_equals('.a > + x', '.b > + y {@extend x}', '.a > + x, .a .b > + y, .b .a > + y', {syntax: 'scss'}, f)}
    function d() {extend_equals('.a ~ > + x', '.b > + y {@extend x}', '.a ~ > + x, .a .b ~ > + y, .b .a ~ > + y', {syntax: 'scss'}, e)}
    function c() {extend_equals('.a + > x', '.b > + y {@extend x}', '.a + > x', {syntax: 'scss'}, d)}
    function b() {extend_equals('.a + > x', '.b > + y {@extend x}', '.a + > x', {syntax: 'scss'}, c)}
    extend_equals('.a ~ > + .b > x', '.c > + .d > y {@extend x}', '.a ~ > + .b > x, .a .c ~ > + .d.b > y, .c .a ~ > + .d.b > y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_double_tilde', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L562-L567
    // v3.2.0

    function d() {extend_equals('a.a ~ x', 'b.b ~ y {@extend x}', 'a.a ~ x, a.a ~ b.b ~ y, b.b ~ a.a ~ y', {syntax: 'scss'}, done)}
    function c() {extend_equals('.a ~ x', '.b ~ y {@extend x}', '.a ~ x, .a ~ .b ~ y, .b ~ .a ~ y, .b.a ~ y', {syntax: 'scss'}, d)}
    function b() {extend_equals('.a ~ x', '.a.b ~ y {@extend x}', '.a ~ x, .a.b ~ y', {syntax: 'scss'}, c)}
    extend_equals('.a.b ~ x', '.a ~ y {@extend x}', '.a.b ~ x, .a.b ~ y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_tilde_plus', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L569-L578
    // v3.2.0

    function h() {extend_equals('a.a ~ x', 'b.b + y {@extend x}', 'a.a ~ x, a.a ~ b.b + y', {syntax: 'scss'}, done)}
    function g() {extend_equals('.a ~ x', '.b + y {@extend x}', '.a ~ x, .a ~ .b + y, .a.b + y', {syntax: 'scss'}, h)}
    function f() {extend_equals('.a ~ x', '.a.b + y {@extend x}', '.a ~ x, .a.b + y', {syntax: 'scss'}, g)}
    function e() {extend_equals('.a.b ~ x', '.a + y {@extend x}', '.a.b ~ x, .a.b ~ .a + y, .a.b + y', {syntax: 'scss'}, f)}
    function d() {extend_equals('a.a + x', 'b.b ~ y {@extend x}', 'a.a + x, b.b ~ a.a + y', {syntax: 'scss'}, e)}
    function c() {extend_equals('.a + x', '.b ~ y {@extend x}', '.a + x, .b ~ .a + y, .b.a + y', {syntax: 'scss'}, d)}
    function b() {extend_equals('.a + x', '.a.b ~ y {@extend x}', '.a + x, .a.b ~ .a + y, .a.b + y', {syntax: 'scss'}, c)}
    extend_equals( '.a.b + x', '.a ~ y {@extend x}', '.a.b + x, .a.b + y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_angle_sibling', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L580-L585
    // v3.2.0

    function d() {extend_equals('.a + x', '.b > y {@extend x}', '.a + x, .b > .a + y', {syntax: 'scss'}, done)}
    function c() {extend_equals('.a ~ x', '.b > y {@extend x}', '.a ~ x, .b > .a ~ y', {syntax: 'scss'}, d)}
    function b() {extend_equals('.a > x', '.b + y {@extend x}', '.a > x, .a > .b + y', {syntax: 'scss'}, c)}
    extend_equals('.a > x', '.b ~ y {@extend x}', '.a > x, .a > .b ~ y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_double_angle', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L587-L592
    // v3.2.0

    function d() {extend_equals('a.a > x', 'b.b > y {@extend x}', 'a.a > x', {syntax: 'scss'}, done)}
    function c() {extend_equals('.a > x', '.b > y {@extend x}', '.a > x, .b.a > y', {syntax: 'scss'}, d)}
    function b() {extend_equals('.a > x', '.a.b > y {@extend x}', '.a > x, .a.b > y', {syntax: 'scss'}, c)}
    extend_equals('.a.b > x', '.b > y {@extend x}', '.a.b > x, .b.a > y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_double_plus', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L594-L599
    // v3.2.0

    function d() {extend_equals('a.a + x', 'b.b + y {@extend x}', 'a.a + x', {syntax: 'scss'}, done)}
    function c() {extend_equals('.a + x', '.b + y {@extend x}', '.a + x, .b.a + y', {syntax: 'scss'}, d)}
    function b() {extend_equals('.a + x', '.a.b + y {@extend x}', '.a + x, .a.b + y', {syntax: 'scss'}, c)}
    extend_equals('.a.b + x', '.b + y {@extend x}', '.a.b + x, .b.a + y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_angle_space', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L601-L608
    // v3.2.0

    function f() {extend_equals( '.a x', '.b > y {@extend x}', '.a x, .a .b > y', {syntax: 'scss'}, done)}
    function e() {extend_equals('.a x', '.a.b > y {@extend x}', '.a x, .a.b > y', {syntax: 'scss'}, f)}
    function d() {extend_equals('.a.b x', '.a > y {@extend x}', '.a.b x, .a.b .a > y', {syntax: 'scss'}, e)}
    function c() {extend_equals('.a > x', '.b y {@extend x}', '.a > x, .b .a > y', {syntax: 'scss'}, d)}
    function b() {extend_equals( '.a > x', '.a.b y {@extend x}', '.a > x, .a.b .a > y', {syntax: 'scss'}, c)}
    extend_equals('.a.b > x', '.a y {@extend x}', '.a.b > x, .a.b > y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_plus_space', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L610-L617
    // v3.2.0

    function f() {extend_equals('.a x', '.b + y {@extend x}', '.a x, .a .b + y', {syntax: 'scss'}, done)}
    function e() {extend_equals('.a x', '.a.b + y {@extend x}', '.a x, .a .a.b + y', {syntax: 'scss'}, f)}
    function d() {extend_equals('.a.b x', '.a + y {@extend x}', '.a.b x, .a.b .a + y', {syntax: 'scss'}, e)}
    function c() {extend_equals('.a + x', '.b y {@extend x}', '.a + x, .b .a + y', {syntax: 'scss'}, d)}
    function b() {extend_equals('.a + x', '.a.b y {@extend x}', '.a + x, .a.b .a + y', {syntax: 'scss'}, c)}
    extend_equals('.a.b + x', '.a y {@extend x}', '.a.b + x, .a .a.b + y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_nested', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L619-L622
    // v3.2.0

    function b() {extend_equals('.a > .b + x', '.c > y {@extend x}', '.a > .b + x, .c.a > .b + y', {syntax: 'scss'}, done)}
    extend_equals('.a > .b + x', '.c > .d + y {@extend x}', '.a > .b + x, .c.a > .d.b + y', {syntax: 'scss'}, b)
  })

  it('test_combinator_unification_with_newlines', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L624-L638
    // v3.2.0

    var css = ".a >\n.b\n+ x, .c.a > .d.b + y {\n  a: b; }\n";
    var scss = ".a >\n.b\n+ x {a: b}\n.c\n> .d +\ny {@extend x}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_nested_extend_loop', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L681-L693
    // v3.2.0

    var css = ".bar, .bar .foo {\n  a: b; }\n  .bar .foo {\n    c: d; }\n";
    var scss = ".bar {\n  a: b;\n  .foo {c: d; @extend .bar}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_basic_placeholder_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L772-L774
    // v3.2.0

    extend_equals('%foo', '.bar {@extend %foo}', '.bar', {syntax: 'scss'}, done)
  })

  it('test_unused_placeholder_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L776-L785
    // v3.2.0

    var css = ".baz {\n  color: blue; }\n";
    var scss = "%foo {color: blue}\n%bar {color: red}\n.baz {@extend %foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_placeholder_descendant_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L787-L789
    // v3.2.0

    extend_equals('#context %foo a', '.bar {@extend %foo}', '#context .bar a', {syntax: 'scss'}, done)
  })

  it('test_semi_placeholder_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L791-L798
    // v3.2.0

    var css = ".bar .baz {\n  color: blue; }\n";
    var scss = "#context %foo, .bar .baz {color: blue}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_placeholder_selector_with_multiple_extenders', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L791-L798
    // v3.2.0

    var css = ".bar, .baz {\n  color: blue; }\n";
    var scss = "%foo {color: blue}\n.bar {@extend %foo}\n.baz {@extend %foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_placeholder_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L824-L834
    // v3.2.0

    var css = ".bar {\n  color: blue; }\n";
    var scss = "$foo: foo;\n\n%#{$foo} {color: blue}\n.bar {@extend %foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_media_in_placeholder_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L836-L844
    // v3.2.0

    var css = ".baz {\n  c: d; }\n";
    var scss = "%foo {bar {@media screen {a: b}}}\n.baz {c: d}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_extend_with_subject_transfers_subject_to_extender', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1059-L1075
    // v3.2.0
    function second() {
      var css = "foo bar! baz, foo .bip .bap! baz, .bip foo .bap! baz {\n  a: b; }\n";
      var scss = "foo bar! baz {a: b}\n.bip .bap {@extend bar}\n";

      equal(scss, css,  {syntax: 'scss'}, done)
    }

    var css = "foo.x bar.y! baz.z, foo.x .bip bar.bap! baz.z, .bip foo.x bar.bap! baz.z {\n  a: b; }\n";
    var scss = "foo.x bar.y! baz.z {a: b}\n.bip .bap {@extend .y}\n";

    equal(scss, css,  {syntax: 'scss'}, second)
  });

  it('test_extend_with_subject_retains_subject_on_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1077-L1085
    // v3.2.0
    var css = ".foo! .bar, .foo! .bip .bap, .bip .foo! .bap {\n  a: b; }\n";
    var scss = ".foo! .bar {a: b}\n.bip .bap {@extend .bar}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  });

  it('test_extend_with_subject_transfers_subject_to_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1087-L1095
    // v3.2.0
    var css = "a.foo .bar, .bip a.bap! .bar {\n  a: b; }\n";
    var scss = "a.foo .bar {a: b}\n.bip .bap! {@extend .foo}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  });

  it('test_extend_with_subject_retains_subject_on_extender', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1097-L1105
    // v3.2.0
    var css = ".foo .bar, .foo .bip! .bap, .bip! .foo .bap {\n  a: b; }\n";
    var scss = ".foo .bar {a: b}\n.bip! .bap {@extend .bar}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  });

  it('test_extend_with_subject_fails_with_conflicting_subject', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1107-L1115
    // v3.2.0
    var css = "x! .bar {\n  a: b; }\n";
    var scss = "x! .bar {a: b}\ny! .bap {@extend .bar}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  });

  it('test_newline_near_combinator', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1189-L1201
    // v3.2.0
    var css = ".a +\n.b x, .a +\n.b .c y, .c .a +\n.b y {\n  a: b; }\n";
    var scss = ".a +\n.b x {a: b}\n.c y {@extend x}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  });

  it('test_nested_selector_with_child_selector_hack_extendee', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1221-L1223
    // v3.2.0

    extend_equals('> .foo', 'foo bar {@extend .foo}', '> .foo, > foo bar', {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1225-L1227
    // v3.2.0

    extend_equals('.foo .bar', '> foo bar {@extend .bar}', '.foo .bar, > .foo foo bar, > foo .foo bar', {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender_and_extendee', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1229-L1231
    // v3.2.0

    extend_equals('> .foo', '> foo bar {@extend .foo}', '> .foo, > foo bar', {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender_and_sibling_selector_extendee', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1233-L1235
    // v3.2.0

    extend_equals('~ .foo', '> foo bar {@extend .foo}', '~ .foo', {syntax: 'scss'}, done)
  })

  it('test_nested_selector_with_child_selector_hack_extender_and_extendee_and_newline', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1237-L1247
    // v3.2.0
    var css = "> .foo, > flip,\n> foo bar {\n  a: b; }\n";
    var scss = "> .foo {a: b}\nflip,\n> foo bar {@extend .foo}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  });

  it('test_extended_parent_and_child_redundancy_elimination', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1249-L1260
    // v3.2.0
    var css = "a b, d b, a c, d c {\n  a: b; }\n";
    var scss = "a {\n  b {a: b}\n  c {@extend b}\n}\nd {@extend a}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  });

  it('test_extend_redundancy_elimination_when_it_would_reduce_specificity', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1262-L1264
    // v3.2.0

    extend_equals('a', 'a.foo {@extend a}', 'a, a.foo', {syntax: 'scss'}, done)
  })

  it('test_extend_redundancy_elimination_when_it_would_preserve_specificity', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1266-L1268
    // v3.2.0

    extend_equals('.bar a', 'a.foo {@extend a}', '.bar a', {syntax: 'scss'}, done)
  })

  it('test_extend_redundancy_elimination_never_eliminates_base_selector', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1270-L1272
    // v3.2.0

    extend_equals('a.foo', '.foo {@extend a}', 'a.foo, .foo', {syntax: 'scss'}, done)
  })

  it('test_max', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L171-L179
    // v3.2.0

    function sixth() {eval_err(func_parse('max(3em, 4em, 1px)'), "Incompatible units: 'px' and 'em'.", {}, done)};
    function fifth() {eval_err(func_parse('max(#aaa)'), "#aaaaaa is not a number", {}, sixth)};
    function fourth() {eval_equal(func_parse("max(10cm, 6in)"), '"6in"', {}, fifth)}
    function third() {eval_equal(func_parse("max(4em)"), '"4em"', {}, fourth)}
    function second() { eval_equal(func_parse("max(3, 2px, 1px)"), '"3"', {}, third) }
    eval_equal(func_parse("max(1, 2, 3)"), '"3"', {}, second)
  });

  it('test_rgb', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L181-L186
    // v3.2.0

    function fourth() {eval_equal(func_parse("rgb($red: 0, $green: 255, $blue: 127)"), '"springgreen"', {}, done)}
    function third() {eval_equal(func_parse("rgb(0, 255, 127)"), '"springgreen"', {}, fourth)}
    function second() { eval_equal(func_parse("rgb(190, 173, 237)"), '"#beaded"', {}, third) }
    eval_equal(func_parse("rgb(18, 52, 86)"), '"#123456"', {}, second)
  });

  it('test_ie_hex_str', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L775-L780
    // v3.2.0

    function fourth() {eval_equal(func_parse("ie-hex-str(rgba(255, 0, 0, 0.5))"), '"#80FF0000"', {}, done)}
    function third() {eval_equal(func_parse("ie-hex-str(#A1c)"), '"#FFAA11CC"', {}, fourth)}
    function second() { eval_equal(func_parse("ie-hex-str(#a1c)"), '"#FFAA11CC"', {}, third) }
    eval_equal(func_parse("ie-hex-str(#aa11cc)"), '"#FFAA11CC"', {}, second)
  });

  it('test_complement', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L781-L788
    // v3.1.0

    function f() { eval_equal(func_parse("complement(#abc)"), '"#ccbbaa"', {}, done) }
    function e() { eval_equal(func_parse("complement(red)"), '"cyan"', {}, f) }
    function d() { eval_equal(func_parse("complement(cyan)"), '"red"', {}, e) }
    function c() { eval_equal(func_parse("complement(white)"), '"white"', {}, d) }
    function b() { eval_equal(func_parse("complement(black)"), '"black"', {}, c) }
    eval_equal(func_parse("complement($color: black)"), '"black"', {}, b)
  });

  it('test_type_of', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L892
    // v3.2.0

    eval_equal(func_parse("type-of(null)"), '"null"', {}, done)
  });

  it('test_if', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1034
    // v3.2.0

    eval_equal(func_parse("if(null, 1px, 2px)"), '"2px"', {}, done)
  });

  it('test_keyword_args_rgba_with_extra_args', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1046-L1051
    // v3.2.0

    eval_err(func_parse("rgba($red: 255, $green: 255, $blue: 255, $alpha: 0.5, $extra: error)"), 'Function rgba doesn\'t have an argument named $extra', {}, done);
  });

  it('test_keyword_args_with_extra_argument', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1067-L1072
    // v3.2.0

    eval_err(func_parse("rgb($red: 255, $green: 255, $blue: 255, $purple: 255)"), 'Function rgb doesn\'t have an argument named $purple', {}, done);
  });

  it('test_keyword_args_with_positional_and_keyword_argument', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1074-L1079
    // v3.2.0

    eval_err(func_parse("rgb(255, 255, 255, $red: 255)"), 'Function rgb was passed argument $red both by position and by name', {}, done);
  });

  it('test_keyword_args_with_keyword_before_positional_argument', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1081-L1086
    // v3.2.0

    eval_err(func_parse("rgb($red: 255, 255, 255)"), 'Positional arguments must come before keyword arguments.', {}, done);
  });

  it('test_saturation_bounds', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1098-L1100
    // v3.2.0

    eval_equal(func_parse("hsl(hue(#fbfdff), saturation(#fbfdff), lightness(#fbfdff))"), '"#fbfdff"', {}, done)
  });

  it('test_rgba_rounding', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L82-L84
    // v3.1.0

    eval_equal(func_parse("rgba(10.0, 1.23456789, 0.0, 0.1234567)"), '"rgba(10, 1, 0, 0.12346)"', {}, done)
  });

  it('test_string_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/script_test.rb#L174-L176
    // v3.2.0

    function c() {eval_equal(func_parse('\'foo#{1 + \\\"bar#{2 + 3}baz\\\" + 4}bang\''), '"foo1bar5baz4bang"', {}, b)}
    function b() {eval_equal(func_parse('"foo#{1 + 1}bar"'),  '"foo2bar"', {}, c) }
    eval_equal(func_parse('\'foo#{1 + 1}bar\''), '"\\\"foo2bar\\\""', {}, done)

  });

  it('test_null', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/script_test.rb#L263-L265
    // v3.2.0

    eval_equal(func_parse("null"), '""', {}, done)
  });

  it('test_boolean_ops', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/script_test.rb#L286-L297
    // v3.2.0

    function l() { eval_equal(func_parse("null and 1"), '""', {}, done) }
    function k() { eval_equal(func_parse("null or 1"), '"1"', {}, l) }
    function j() { eval_equal(func_parse("not null"), '"true"', {}, k) }
    function i() { eval_equal(func_parse("null and null"), '""', {}, j) }
    function h() { eval_equal(func_parse("true and null"), '""', {}, i) }
    function g() { eval_equal(func_parse("null and true"), '""', {}, h) }
    function f() { eval_equal(func_parse("null or true"), '"true"', {}, g) }
    function e() { eval_equal(func_parse("null or null"), '""', {}, f) }
    function d() { eval_equal(func_parse("true or null"), '"true"', {}, e) }
    eval_equal(func_parse("null or true"), '"true"', {}, d)
  });

  it('test_null_ops', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/script_test.rb#L342-L371
    // v3.2.0

    function n() {eval_err(func_parse('foo + null'), 'Invalid null operation: ""foo" plus null".', {}, done)}
    function m() {eval_err(func_parse('null + null'), 'Invalid null operation: "null plus null".', {}, n)}
    function l() {eval_err(func_parse('null < 1'), 'Invalid null operation: "null lt 1".', {}, m)}
    function k() {eval_err(func_parse('1 > null'), 'Invalid null operation: "1 gt null".', {}, l)}
    function j() {eval_err(func_parse('1 % null'), 'Invalid null operation: "1 mod null".', {}, k)}
    function i() {eval_err(func_parse('1 / null'), 'Invalid null operation: "1 div null".', {}, j)}
    function h() {eval_err(func_parse('1 * null'), 'Invalid null operation: "1 times null".', {}, i)}
    function g() {eval_err(func_parse('1 - null'), 'Invalid null operation: "1 minus null".', {}, h)}
    function f() {eval_err(func_parse('1 + null'), 'Invalid null operation: "1 plus null".', {}, g)}
    function e() {eval_err(func_parse('null % 1'), 'Invalid null operation: "null mod 1".', {}, f)}
    function d() {eval_err(func_parse('null / 1'), 'Invalid null operation: "null div 1".', {}, e)}
    function c() {eval_err(func_parse('null * 1'), 'Invalid null operation: "null times 1".', {}, d)}
    function b() {eval_err(func_parse('null - 1'), 'Invalid null operation: "null minus 1".', {}, c)}
    eval_err(func_parse('null + 1'), "Invalid null operation: \"null plus 1\".", {}, b);
  });

  it('test_equals', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/script_test.rb#L389-L398
    // v3.2.0

    function h() { eval_equal(func_parse("() != null"), '"true"', {}, done) }
    function g() { eval_equal(func_parse("0 != null"), '"true"', {}, h) }
    function f() { eval_equal(func_parse("\\\"null\\\" != null"), '"true"', {}, g) }
    function e() { eval_equal(func_parse("null != null"), '"false"', {}, f) }
    function d() { eval_equal(func_parse("() == null"), '"false"', {}, e) }
    function c() { eval_equal(func_parse("0 == null"), '"false"', {}, d) }
    function b() { eval_equal(func_parse("\\\"null\\\" == null"), '"false"', {}, c) }
    eval_equal(func_parse("null == null"), '"true"', {}, b)
  });

  it('test_list_with_nulls', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/script_test.rb#L482-L489
    // v3.2.0

    function f() { eval_equal(func_parse("null 1 2 3"), '"1 2 3"', {}, done) }
    function e() { eval_equal(func_parse("null, 1, 2, 3"), '"1, 2, 3"', {}, f) }
    function d() { eval_equal(func_parse("1 2 3 null"), '"1 2 3"', {}, e) }
    function c() { eval_equal(func_parse("1, 2, 3, null"), '"1, 2, 3"', {}, d) }
    function b() { eval_equal(func_parse("1 2 null 3"), '"1 2 3"', {}, c) }
    eval_equal(func_parse("1, 2, null, 3"), '"1, 2, 3"', {}, b)
  });

  it('test_media_directive_with_keywords', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L480-L489
    // v3.1.0

    function second() {
      parses("@media screen and (-webkit-min-device-pixel-ratio: 0) {\n  a: b; }\n", {syntax: 'scss'}, done)
    }

    parses("@media only screen, print and (foo: 0px) and (bar: flam(12px solid)) {\n  a: b; }\n", {syntax: 'scss'}, second)
  });

  it('test_css_import_directive', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L265-L271
    // v3.2.0

    function e(){equal('@import url(foo.css);',"@import url(foo.css);\n",{syntax: 'scss'},done)}
    function d(){equal("@import url(\"foo.css\");","@import url(\"foo.css\");\n",{syntax: 'scss'},e)}
    function c(){equal('@import url("foo.css");',"@import url(\"foo.css\");\n",{syntax: 'scss'},d)}
    function b(){equal("@import 'foo.css';","@import url(foo.css);\n",{syntax: 'scss'},c)}
    equal('@import "foo.css";',"@import url(foo.css);\n",{syntax: 'scss'}, b)
  });

  it('test_dynamic_media_import', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L277-L286
    // v3.2.0

    var css = "@import \"foo\" print and (-webkit-min-device-pixel-ratio-foo: 25);\n";
    var scss = "$media: print;\n$key: -webkit-min-device-pixel-ratio;\n$value: 20;\n@import \"foo\" #{$media} and ($key + \"-foo\": $value + 5);\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_import_with_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L293-L300
    // v3.2.0

    var css = "@import url(\"http://fonts.googleapis.com/css?family=Droid+Sans\");\n";
    var scss = "$family: unquote(\"Droid+Sans\");\n@import url(\"http://fonts.googleapis.com/css?family=#{$family}\");\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_parent_selector_with_subject', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L520-L534
    // v3.2.0

    var css = "bar foo.baz! .bip {\n  a: b; }\n\nbar foo bar.baz! .bip {\n  c: d; }\n";
    var scss = "foo {\n  bar &.baz! .bip {a: b}}\n\nfoo bar {\n  bar &.baz! .bip {c: d}}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_var_args', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L772-L785
    // v3.2.0

    var css = ".foo {\n  a: 1;\n  b: 2, 3, 4; }\n";
    var scss = "@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n.foo {@include foo(1, 2, 3, 4)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_empty_var_args', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L787-L800
    // v3.2.0

    var css = ".foo {\n  a: 1;\n  b: 0; }\n";
    var scss = "@mixin foo($a, $b...) {\n  a: $a;\n  b: length($b);\n}\n\n.foo {@include foo(1)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_var_args_act_like_list', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L802-L815
    // v3.2.0

    var css = ".foo {\n  a: 3;\n  b: 3; }\n";
    var scss = "@mixin foo($a, $b...) {\n  a: length($b);\n  b: nth($b, 2);\n}\n\n.foo {@include foo(1, 2, 3, 4)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_splat_args', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L817-L835
    // v3.2.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3;\n  d: 4; }\n";
    var scss = "@mixin foo($a, $b, $c, $d) {\n  a: $a;\n  b: $b;\n  c: $c;\n  d: $d;\n}\n\n$list: 2, 3, 4;\n.foo {@include foo(1, $list...)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_splat_expression', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L837-L854
    // v3.2.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3;\n  d: 4; }\n";
    var scss = "@mixin foo($a, $b, $c, $d) {\n  a: $a;\n  b: $b;\n  c: $c;\n  d: $d;\n}\n\n.foo {@include foo(1, (2, 3, 4)...)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_splat_args_with_var_args', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L856-L870
    // v3.2.0

    var css = ".foo {\n  a: 1;\n  b: 2, 3, 4; }\n";
    var scss = "@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n$list: 2, 3, 4;\n.foo {@include foo(1, $list...)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_splat_args_with_var_args_and_normal_args', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L872-L888
    // v3.2.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3, 4; }\n";
    var scss = "@mixin foo($a, $b, $c...) {\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n$list: 2, 3, 4;\n.foo {@include foo(1, $list...)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_splat_args_with_var_args_preserves_separator', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L890-L904
    // v3.2.0

    var css = ".foo {\n  a: 1;\n  b: 2 3 4 5; }\n";
    var scss = "@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n$list: 3 4 5;\n.foo {@include foo(1, 2, $list...)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_var_and_splat_args_pass_through_keywords', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L906-L925
    // v3.2.0

    var css = ".foo {\n  a: 3;\n  b: 1;\n  c: 2; }\n";
    var scss = "@mixin foo($a...) {\n  @include bar($a...);\n}\n\n@mixin bar($b, $c, $a) {\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n.foo {@include foo(1, $c: 2, $a: 3)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_function_var_args_passed_to_native', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1115-L1126
    // v3.2.0

    var css = ".foo {\n  val: #102035; }\n";
    var scss = "@function foo($args...) {\n  @return adjust-color($args...);\n}\n\n.foo {val: foo(#102030, $blue: 5)}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_selector_interpolation_in_reference_combinator', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1248-L1258
    // v3.2.0

    var css = ".foo /a/ .bar /b|c/ .baz {\n  a: b; }\n";
    var scss = "$a: a;\n$b: b;\n$c: c;\n.foo /#{$a}/ .bar /#{$b}|#{$c}/ .baz {a: b}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_parent_selector_with_parent_and_subject', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1260-L1269
    // v3.2.0

    var css = "bar foo.baz! .bip {\n  c: d; }\n";
    var scss = "$subject: \"!\";\nfoo {\n  bar &.baz#{$subject} .bip {c: d}}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_directive_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1295-L1303
    // v3.2.0

    var css = "@foo bar12 qux {\n  a: b; }\n";
    var scss = "$baz: 12;\n@foo bar#{$baz} qux {a: b}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_media_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1305-L1313
    // v3.2.0

    var css = "@media bar12 {\n  a: b; }\n";
    var scss = "$baz: 12;\n@media bar#{$baz} {a: b}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_script_in_media', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1315-L1334
    // v3.2.0

    function second() {
      var css = "@media screen and (-webkit-min-device-pixel-ratio: 13) {\n  a: b; }\n";
      var scss = "$vals: 1 2 3;\n@media screen and (-webkit-min-device-pixel-ratio: 5 + 6 + nth($vals, 2)) {a: b}\n";
      equal(scss,css,{syntax: 'scss'}, done)
    }

    var css = "@media screen and (-webkit-min-device-pixel-ratio: 20), only print {\n  a: b; }\n";
    var scss = "$media1: screen;\n$media2: print;\n$var: -webkit-min-device-pixel-ratio;\n$val: 20;\n@media #{$media1} and ($var: $val), only #{$media2} {a: b}\n";
    equal(scss,css,{syntax: 'scss'}, second)
  });

  it('test_media_interpolation_with_reparse', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1336-L1359
    // v3.2.0

    var css = "@media screen and (max-width: 300px) {\n  a: b; }\n@media screen and (max-width: 300px) {\n  a: b; }\n@media screen and (max-width: 300px) {\n  a: b; }\n@media screen and (max-width: 300px), print and (max-width: 300px) {\n  a: b; }\n";
    var scss = "$constraint: \"(max-width: 300px)\";\n$fragment: \"nd #{$constraint}\";\n$comma: \"een, pri\";\n@media screen and #{$constraint} {a: b}\n@media screen {\n  @media #{$constraint} {a: b}\n}\n@media screen a#{$fragment} {a: b}\n@media scr#{$comma}nt {\n  @media #{$constraint} {a: b}\n}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_moz_document_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1361-L1378
    // v3.2.0

    var css = "@-moz-document url(http://sass-lang.com/),\n               url-prefix(http://sass-lang.com/docs),\n               domain(sass-lang.com),\n               domain(\"sass-lang.com\") {\n  .foo {\n    a: b; } }\n";
    var scss = "$domain: \"sass-lang.com\";\n@-moz-document url(http://#{$domain}/),\n               url-prefix(http://#{$domain}/docs),\n               domain(#{$domain}),\n               #{domain($domain)} {\n  .foo {a: b}\n}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_supports_bubbling', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1395-L1413
    // v3.2.0

    var css = "@supports (foo: bar) {\n  a {\n    b: c; }\n    @supports (baz: bang) {\n      a {\n        d: e; } } }\n";
    var scss = "a {\n  @supports (foo: bar) {\n    b: c;\n    @supports (baz: bang) {\n      d: e;\n    }\n  }\n}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_random_directive_interpolation', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1415-L1432
    // v3.2.0

    var css = "@foo url(http://sass-lang.com/),\n     domain(\"sass-lang.com\"),\n     \"foobarbaz\",\n     foobarbaz {\n  .foo {\n    a: b; } }\n";
    var scss = "$domain: \"sass-lang.com\";\n@foo url(http://#{$domain}/),\n     #{domain($domain)},\n     \"foo#{'ba' + 'r'}baz\",\n     foo#{'ba' + 'r'}baz {\n  .foo {a: b}\n}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_nested_mixin_def', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1434-L1443
    // v3.2.0

    var css = "foo {\n  a: b; }\n";
    var scss = "foo {\n  @mixin bar {a: b}\n  @include bar; }\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_nested_mixin_shadow', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1445-L1462
    // v3.2.0

    var css = "foo {\n  c: d; }\n\nbaz {\n  a: b; }\n";
    var scss = "@mixin bar {a: b}\n\nfoo {\n  @mixin bar {c: d}\n  @include bar;\n}\n\nbaz {@include bar}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_nested_function_def', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1464-L1478
    // v3.2.0

    var css = "foo {\n  a: 1; }\n\nbar {\n  b: foo(); }\n";
    var scss = "foo {\n  @function foo() {@return 1}\n  a: foo(); }\n\nbar {b: foo()}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_nested_function_shadow', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1480-L1497
    // v3.2.0

    var css = "foo {\n  a: 2; }\n\nbaz {\n  b: 1; }\n";
    var scss = "@function foo() {@return 1}\n\nfoo {\n  @function foo() {@return 2}\n  a: foo();\n}\n\nbaz {b: foo()}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_defs_only_at_toplevel', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L870-L879
    // v3.1.0

    err_message("foo {\n  @mixin bar {a: b}}\nbar {@include bar}\n", "Undefined mixin 'bar'.", {syntax: 'scss'}, done)
  });

  it('test_reference_combinator_with_parent_ref', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1709-L1716
    // v3.2.0

    var css = "a /foo/ b {\n  c: d; }\n";
    var scss = "a {& /foo/ b {c: d}}\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_mixin_content', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1907-L1931
    // v3.2.0

    var css = ".parent {\n  background-color: red;\n  border-color: red; }\n  .parent .child {\n    background-color: yellow;\n    color: blue;\n    border-color: yellow; }\n";
    var scss = "$color: blue;\n@mixin context($class, $color: red) {\n  .#{$class} {\n    background-color: $color;\n    @content;\n    border-color: $color;\n  }\n}\n@include context(parent) {\n  @include context(child, $color: yellow) {\n    color: $color;\n  }\n}\n";

    equal(scss,css,{syntax: 'scss'}, done)
  });

  it('test_empty_content', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1933-L1941
    // v3.2.0

    var css = "a {\n  b: c; }\n";
    var scss = "@mixin foo { @content }\na { b: c; @include foo {} }\n";
    equal(scss,css,{syntax: 'scss'}, done)
  });

  if (semver.lt(window.__libVersion, "3.2.10")) {
    it('test_extend_does_not_warn_when_one_extension_fails_but_others_dont', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1157-L1170
      // v3.2.0

      function third() {
        sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({css: "a.bar {a: b}\n.bar {c: d}\nb.foo {@extend .bar}\n", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.equal("a.bar {\n  a: b; }\n\n.bar, b.foo {\n  c: d; }\n");
          third()
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

  }

  if (semver.lt(window.__libVersion, "3.2.12")) {
    // results were modified in 3.2.12
    it('test_extend_cross_branch_redundancy_elimination', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1274-L1282
      // v3.2.0

      function second() {
        var css = "e a c d, a c e d, e b c a d, b c a e d {\n  a: b; }\n";
        var scss = "e %z {a: b}\n%x c %y {@extend %z}\na, b {@extend %x}\na d {@extend %y}\n";
        equal(scss, css,  {syntax: 'scss'}, done)
      }

      var css = "a c d, b c a d {\n  a: b; }\n";
      var scss = "%x c %y {a: b}\na, b {@extend %x}\na d {@extend %y}\n";
      equal(scss, css,  {syntax: 'scss'}, second)
    });
  }

  if (semver.lt(window.__libVersion, "3.3.0")) {
    // functionality removed in 3.3.0
    it('test_deprecated_PRECISION', function(done) {
      // https://github.com/sass/sass/blob/58ad24d5cb12bc4d2e25da49e025ee768236841e/test/sass/engine_test.rb#L2455-L2459
      // v3.2.0

      function third() {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith(\"Sass::Script::Number::PRECISION is deprecated and will be removed in a future release. Use Sass::Script::Number.precision_factor instead.\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined)

          eval_equal('Opal.Sass.$$scope.Script.$$scope.Number.$$scope.get(\'PRECISION\')', '100000', {syntax: 'scss'}, third)
              }

              sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
              });

          it('test_changing_precision', function(done) {
            // https://github.com/sass/sass/blob/58ad24d5cb12bc4d2e25da49e025ee768236841e/test/sass/engine_test.rb#L2460-L2475
            // v3.2.0

            function third() {
              sassBuilder({eval: "Opal.Sass.$$scope.Script.$$scope.Number[\"$precision=\"](old_precision);Opal.Sass.$$scope.Script.$$scope.Number.$precision().valueOf()===old_precision", options: {syntax: 'scss'}}, function(result) {
                expect(result.err).to.be(undefined)
                  expect(result.css).to.be(true)
                  done();
              })
            }

            function second() {
              var source = "div\n  maximum : 1.00000001\n  too-much: 1.000000001\n";
              // technically the test is 1.0, not 1. But since JS doesn't have an explicit float type, we can't maintain the .0 and remain a number. So we cheat a tiny bit and change the expected value to 1
              var expected = "div {\n  maximum: 1.00000001;\n  too-much: 1; }\n";

              equal(source, expected, {syntax: 'sass'}, third)
            }

            sassBuilder({eval: "old_precision=Opal.Sass.$$scope.Script.$$scope.Number.$precision();Opal.Sass.$$scope.Script.$$scope.Number[\"$precision=\"](8)", options: {syntax: 'sass'}}, function(result) {
              expect(result.err).to.be(undefined);
              expect(result.css).to.be(100000000);
              second();
            })
          });

          it('test_id_unification-2', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L152-L159
            // v3.2.0

            function third() {
              extend_doesnt_match(function (filename, syntax, cb) {
                unification('.foo#baz', '#bar {@extend .foo}', '.foo#baz', {
                  filename: filename + '.' + syntax,
                  syntax: syntax
                }, cb)}, '#bar', '.foo', 'failed_to_unify', 2, 'test_id_unification_inline', 'scss', done)
            }

            function second() {
              unification('.foo#baz', '#baz {@extend .foo}', '#baz', {syntax: 'scss'}, third)
            }

            unification('.foo.bar', '#baz {@extend .foo}', '.foo.bar, .bar#baz', {syntax: 'scss'}, second)
          });

          it('test_universal_unification_with_namespaced_universal_target', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L178-L187
            // v3.2.0

            function fourth() {unification('ns|*.foo', 'ns|* {@extend .foo}', 'ns|*', {syntax: 'scss'}, done) }

            function third() {
              extend_doesnt_match(function (filename, syntax, cb) {unification('ns1|*.foo', 'ns2|* {@extend .foo}', 'ns1|*.foo', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, 'ns2|\\*', '.foo', 'failed_to_unify', 2, 'test_universal_unification_with_namespaced_universal_target_inline', 'scss', fourth)
            }
            function second() {unification('ns|*.foo', '*|* {@extend .foo}', 'ns|*', {syntax: 'scss'}, third) }
            unification('ns|*.foo', '* {@extend .foo}', 'ns|*', {syntax: 'scss'}, third)
          });

          it('test_universal_unification_with_namespaced_element_target', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L198-L207
            // v3.2.0

            function fourth() { unification('ns|a.foo', 'ns|* {@extend .foo}', 'ns|a', {syntax: 'scss'}, done) }

            function third() {
              extend_doesnt_match(function (filename, syntax, cb) {unification('ns1|a.foo', 'ns2|* {@extend .foo}', 'ns1|a.foo', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, 'ns2|\\*', '.foo', 'failed_to_unify', 2, 'test_universal_unification_with_namespaced_element_target_inline', 'scss', fourth)
            }

            function second() { unification('ns|a.foo', '*|* {@extend .foo}', 'ns|a', {syntax: 'scss'}, third) }
            unification('ns|a.foo', '* {@extend .foo}', 'ns|a', {syntax: 'scss'}, third)
          });

          it('test_element_unification_with_namespaced_element_target', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L249-L258
            // v3.2.0

            function fourth() { unification('ns|a.foo', 'ns|a {@extend .foo}', 'ns|a', {syntax: 'scss'}, done) }

            function third() {
              extend_doesnt_match(function (filename, syntax, cb) {unification('ns1|a.foo', 'ns2|a {@extend .foo}', 'ns1|a.foo', {filename: filename + '.' + syntax, syntax: syntax}, cb)},'ns2|a', '.foo', 'failed_to_unify', 2, 'test_element_unification_with_namespaced_element_target_inline', 'scss', fourth)
            }
            function second() { unification('ns|a.foo', '*|a {@extend .foo}', 'ns|a', {syntax: 'scss'}, third) }
            unification('ns|a.foo', 'a {@extend .foo}', 'ns|a', {syntax: 'scss'}, third)
          });

          it('test_pseudo_unification', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L268-L286
            // v3.2.0

            function eleventh() {unification(':foo.baz', ':foo {@extend .baz}', ':foo', {syntax: 'scss'}, done) }
            function tenth() {unification('.baz:after', ':foo {@extend .baz}', '.baz:after, :foo:after', {syntax: 'scss'}, eleventh) }
            function ninth() {unification('.baz:foo', ':after {@extend .baz}', '.baz:foo, :foo:after', {syntax: 'scss'}, tenth) }
            function eigth() {unification(':foo.baz', ':bar {@extend .baz}', ':foo.baz, :foo:bar', {syntax: 'scss'}, ninth) }
            function seventh() {unification('::foo(2n+1).baz', '::foo(2n+1) {@extend .baz}', '::foo(2n+1)', {syntax: 'scss'}, eigth) }
            function sixth() {unification('::foo.baz', '::foo {@extend .baz}', '::foo', {syntax: 'scss'}, seventh) }
            function fifth() {
              extend_doesnt_match(function (filename, syntax, cb) {
                unification('::foo.baz', '::bar {@extend .baz}', '::foo.baz', {filename: filename + '.' + syntax, syntax: syntax}, cb)
              }, '::bar', '.baz', 'failed_to_unify', 2, 'test_pseudo_unification_inline', 'scss', sixth)
            }
            function fourth() {unification('::foo.baz', '::bar {@extend .baz}', '::foo.baz', {syntax: 'scss'}, fifth) }

            function third() {
              extend_doesnt_match(function (filename, syntax, cb) {
                unification('::foo.baz', '::foo(2n+1) {@extend .baz}', '::foo.baz', {filename: filename + '.' + syntax, syntax: syntax}, cb)
              }, '::foo\\(2n\\+1\\)', '.baz', 'failed_to_unify', 2, 'test_pseudo_unification_inline', 'scss', fourth)
            }
            function second() { unification(':foo.baz', '::foo {@extend .baz}', ':foo.baz, :foo::foo', {syntax: 'scss'}, third) }
            unification(':foo.baz', ':foo(2n+1) {@extend .baz}', ':foo.baz, :foo:foo(2n+1)', {syntax: 'scss'}, second)
          });

          it('test_long_extendee_requires_all_selectors', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L349-L353
            // v3.2.0

            extend_doesnt_match(function (filename, syntax, cb) {unification('.foo', '.baz {@extend .foo.bar}', '.foo', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, '.baz', '.foo.bar', 'not_found', 2, 'test_long_extendee_requires_all_selectors_inline', 'scss', done)
          });

          it('test_long_extender_aborts_unification', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L373-L381
            // v3.2.0

            function second() {
              extend_doesnt_match(function (filename, syntax, cb) {extend_equals('a.foo#bar', '.bang#baz {@extend .foo}', 'a.foo#bar', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, '.bang#baz', '.foo', 'failed_to_unify', 2, 'test_long_extender_aborts_unification_inline', 'scss', done)
            }

            extend_doesnt_match(function (filename, syntax, cb) {extend_equals( 'a.foo#bar', 'h1.baz {@extend .foo}', 'a.foo#bar', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, 'h1.baz', '.foo', 'failed_to_unify', 2, 'test_long_extender_aborts_unification_inline', 'scss', second)
          });

          it('test_nested_extender_aborts_unification', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L393-L397
            // v3.2.0

            extend_doesnt_match(function (filename, syntax, cb) {extend_equals('baz.foo', 'foo bar {@extend .foo}', 'baz.foo', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, 'foo bar', '.foo', 'failed_to_unify', 2, 'test_nested_extender_aborts_unification_inline', 'scss', done)
          });

          it('test_placeholder_selector_as_modifier', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L811-L822
            // v3.2.0

            var css = "a.baz.bar {\n  color: blue; }\n"
              var scss = "a%foo.baz {color: blue}\n.bar {@extend %foo}\ndiv {@extend %foo}\n"

              extend_doesnt_match(function (filename, syntax, cb) {
                equal(scss, css, {filename: filename + '.' + syntax, syntax: syntax}, cb)
              }, 'div', '%foo', 'failed_to_unify', 3, 'test_placeholder_selector_as_modifier_inline', 'scss', done)
          })

          it('test_extend_warns_when_extendee_doesnt_exist', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1117-L1126
            // v3.2.0

            function third() {
              sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWithMatch(/WARNING on line 1 of test_extend_warns_when_extendee_doesnt_exist_inline.scss: \\\".foo\\\" failed to @extend \\\".bar\\\".\\n  The selector \\\".bar\\\" was not found.\\n  This will be an error in future releases of Sass.\\n  Use \\\"@extend .bar !optional\\\" if the extend should be able to fail.\\n/)===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
                expect(result.css).to.be(true)

                  done();
              })
            }

            function second(result) {
              expect(result.err).to.be(undefined);
              sassBuilder({css: ".foo {@extend .bar}\n", options: {syntax: 'scss', filename: 'test_extend_warns_when_extendee_doesnt_exist_inline.scss'}}, third)
            }

            sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
          })

          it('test_optional_extend_does_not_warn_when_extendee_doesnt_exist', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1171-L1175
            // v3.2.0

            function third() {
              sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
                expect(result.css).to.be(true)
                  done();
              })
            }

            function second(result) {
              expect(result.err).to.be(undefined);
              sassBuilder({css: ".foo {@extend .bar !optional}", options: {syntax: 'scss'}}, function(result) {
                expect(result.err).to.be(undefined);
                expect(result.css).to.equal("");
                third()
              })
            }

            sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
          })

          it('test_optional_extend_does_not_warn_when_extension_fails', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1177-L1185
            // v3.2.0

            function third() {
              sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
                expect(result.css).to.be(true)
                  done();
              })
            }

            function second(result) {
              expect(result.err).to.be(undefined);
              sassBuilder({css: "a.bar {a: b}\nb.foo {@extend .bar !optional}\n", options: {syntax: 'scss'}}, function(result) {
                expect(result.err).to.be(undefined);
                expect(result.css).to.equal("a.bar {\n  a: b; }\n");
                third()
              })
            }

            sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
          })

          it('test_only_var_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1088-L1090
            // v3.2.0

            eval_equal('(function($B){var s=$B.$$scope.Functions;Opal.defn(s,"$only_var_args",function(){var $b,T,s=this,$a=arguments,$l=$a.length,a=[];for(var $c=0;$c<$l;$c++){a[$c]=$a[$c]}return $B.$$scope.String.$new("only-var-args("+($b=a.$map,$b.$$p=(T=function(a){return a.$plus($B.$$scope.Number.$new(1)).$to_s()},s,1,T),$b).call(a).$join(", ")+")")},-1);s.$declare("only_var_args",[],Opal.hash2(["var_args"],{"var_args":true}));})(Opal.Sass.$$scope.Script);' + func_parse("only-var-args(1px, 2px, 3px)"), '"only-var-args(2px, 3px, 4px)"', {}, done)
          });

          it('test_min', function(done) {
            // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L171-L182
            // v3.2.0

            function fifth() {eval_err(func_parse('min(#aaa)'), "#aaaaaa is not a number", {}, done)};
            function fourth() {eval_err(func_parse('min(3em, 4em, 1px)'), "Incompatible units: 'px' and 'em'.", {}, fifth)};
            function third() {eval_equal(func_parse("min(10cm, 6in)"), '"10cm"', {}, fourth)}
            function second() { eval_equal(func_parse("min(4em)"), '"4em"', {}, third) }
            eval_equal(func_parse("min(3px, 2px, 1)"), '"1"', {}, second)
          });

          it('test_mixin_var_args_with_keyword', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L927-L936
            // v3.2.0

            err_message("@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n.foo {@include foo($a: 1, 2, 3, 4)}\n", 'Positional arguments must come before keyword arguments.', {syntax: 'scss'}, done)
          });

          it('test_mixin_keyword_for_var_arg', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L938-L947
            // v3.2.0

            err_message("@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n.foo {@include foo(1, $b: 2 3 4)}\n", 'Argument $b of mixin foo cannot be used as a named argument.', {syntax: 'scss'}, done)
          });

          it('test_mixin_keyword_for_unknown_arg_with_var_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L949-L958
            // v3.2.0

            err_message("@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n.foo {@include foo(1, $c: 2 3 4)}\n", 'Mixin foo doesn\'t have an argument named $c.', {syntax: 'scss'}, done)
          });

          it('test_function_var_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L960-L971
            // v3.2.0

            var css = ".foo {\n  val: \"a: 1, b: 2, 3, 4\"; }\n";
            var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {val: foo(1, 2, 3, 4)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_empty_var_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L973-L984
            // v3.2.0

            var css = ".foo {\n  val: \"a: 1, b: 0\"; }\n";
            var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{length($b)}\";\n}\n\n.foo {val: foo(1)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_var_args_act_like_list', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L986-L997
            // v3.2.0

            var css = ".foo {\n  val: \"a: 3, b: 3\"; }\n";
            var scss = "@function foo($a, $b...) {\n  @return \"a: #{length($b)}, b: #{nth($b, 2)}\";\n}\n\n.foo {val: foo(1, 2, 3, 4)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_splat_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L999-L1011
            // v3.2.0

            var css = ".foo {\n  val: \"a: 1, b: 2, c: 3, d: 4\"; }\n";
            var scss = "@function foo($a, $b, $c, $d) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}, d: #{$d}\";\n}\n\n$list: 2, 3, 4;\n.foo {val: foo(1, $list...)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_splat_expression', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1013-L1024
            // v3.2.0

            var css = ".foo {\n  val: \"a: 1, b: 2, c: 3, d: 4\"; }\n";
            var scss = "@function foo($a, $b, $c, $d) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}, d: #{$d}\";\n}\n\n.foo {val: foo(1, (2, 3, 4)...)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_splat_args_with_var_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1026-L1038
            // v3.2.0

            var css = ".foo {\n  val: \"a: 1, b: 2, 3, 4\"; }\n";
            var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n$list: 2, 3, 4;\n.foo {val: foo(1, $list...)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });


          it('test_function_splat_args_with_var_args_and_normal_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1040-L1052
            // v3.2.0

            var css = ".foo {\n  val: \"a: 1, b: 2, c: 3, 4\"; }\n";
            var scss = "@function foo($a, $b, $c...) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n$list: 2, 3, 4;\n.foo {val: foo(1, $list...)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_splat_args_with_var_args_preserves_separator', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1054-L1066
            // v3.2.0

            var css = ".foo {\n  val: \"a: 1, b: 2 3 4 5\"; }\n";
            var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n$list: 3 4 5;\n.foo {val: foo(1, 2, $list...)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_var_and_splat_args_pass_through_keywords', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1068-L1083
            // v3.2.0

            var css = ".foo {\n  val: \"a: 3, b: 1, c: 2\"; }\n";
            var scss = "@function foo($a...) {\n  @return bar($a...);\n}\n\n@function bar($b, $c, $a) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {val: foo(1, $c: 2, $a: 3)}\n";
            equal(scss,css,{syntax: 'scss'}, done)
          });

          it('test_function_var_args_with_keyword', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1085-L1093
            // v3.2.0

            err_message("@function foo($a, $b...) {\n  @return \"a: #{$a}, b: $b\";\n}\n\n.foo {val: foo($a: 1, 2, 3, 4)}\n", 'Positional arguments must come before keyword arguments.', {syntax: 'scss'}, done)
          });

          it('test_function_keyword_for_var_arg', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1095-L1103
            // v3.2.0

            err_message("@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {val: foo(1, $b: 2 3 4)}\n", 'Argument $b of function foo cannot be used as a named argument.', {syntax: 'scss'}, done)
          });

          it('test_function_keyword_for_unknown_arg_with_var_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1105-L1113
            // v3.2.0

            err_message("@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {val: foo(1, $c: 2 3 4)}\n", 'Function foo doesn\'t have an argument named $c.', {syntax: 'scss'}, done)
          });

          it('test_nested_media_around_properties-2', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L2189-L2214
            // v3.2.0

            var css = ".outside {\n  color: red;\n  background: blue; }\n  @media print {\n    .outside {\n      color: black; } }\n    @media print and (a: b) {\n      .outside .inside {\n        border: 1px solid black; } }\n  .outside .middle {\n    display: block; }\n";
            var scss = ".outside\n  color: red\n  @media print\n    color: black\n    .inside\n      @media (a: b)\n        border: 1px solid black\n  background: blue\n  .middle\n    display: block\n";
            equal(scss, css, {syntax: 'sass'}, done)
          });

          it('test_element_unification_with_namespaced_universal_target', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L225-L234
            // v3.2.0

            function fourth() { unification('ns|*.foo', 'ns|a {@extend .foo}', 'ns|*.foo, ns|a', {syntax: 'scss'}, done) }

            function third() {
              extend_doesnt_match(function (filename, syntax, cb) {unification('ns1|*.foo', 'ns2|a {@extend .foo}', 'ns1|*.foo', {filename: filename + '.' + syntax, syntax: syntax}, cb)}, 'ns2|a', '.foo', 'failed_to_unify', 2, 'test_element_unification_with_namespaced_universal_target', 'scss', fourth)
            }
            function second() { unification('ns|*.foo', '*|a {@extend .foo}', 'ns|*.foo, ns|a', {syntax: 'scss'}, third) }
            unification('ns|*.foo', 'a {@extend .foo}', 'ns|*.foo, ns|a', {syntax: 'scss'}, third)
          });

          it('test_extend_warns_when_extension_fails', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L1128-L1141
            // v3.2.0

            function third() {
              sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWithMatch(/WARNING on line 2 of test_extend_warns_when_extension_fails_inline.scss: \\\"b.foo\\\" failed to @extend \\\".bar\\\".\\n  No selectors matching \\\".bar\\\" could be unified with \\\"b.foo\\\".\\n  This will be an error in future releases of Sass.\\n  Use \\\"@extend .bar !optional\\\" if the extend should be able to fail.\\n/)===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
                expect(result.css).to.be(true)

                  done();
              })
            }

            function second(result) {
              expect(result.err).to.be(undefined);
              sassBuilder({css: "a.bar {a: b}\nb.foo {@extend .bar}\n", options: {syntax: 'scss', filename: 'test_extend_warns_when_extension_fails_inline.scss'}}, function(result) {
                expect(result.err).to.be(undefined);
                expect(result.css).to.equal("a.bar {\n  a: b; }\n");
                third()
              })
            }

            sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
          })

          it('test_only_kw_args', function(done) {
            // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L1092-L1094
            // v3.2.0

            eval_equal('(function($b){var s=$b.$$scope.Functions;Opal.defn(s,"$only_kw_args",function(k){return $b.$$scope.String.$new("only-kw-args("+k.$keys().$join(", ")+")")},0);s.$declare("only_kw_args",[],Opal.hash2(["var_kwargs"],{"var_kwargs":true}))})(Opal.Sass.$$scope.Script);' + func_parse("only-kw-args($a: 1, $b: 2, $c: 3)"), '"only-kw-args(a, b, c)"', {}, done)
          });

          it('test_number_printing-2', function(done) {
            // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L487-L495
            // v3.2.0

            function i() { eval_equal(func_parse("1"), '"1"', {}, done) }
            function h() { eval_equal(func_parse("1.0"), '"1"', {}, i) }
            function g() { eval_equal(func_parse("1.121214"), '"1.12121"', {}, h) }
            function f() { eval_equal(func_parse("1.121215"), '"1.12122"', {}, g) }
            function e() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1.0/0.0", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).value', 'Infinity', {}, f) }
            function d() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("-1.0/0.0", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).value', '-Infinity', {}, e) }
            eval_equal('Number.isNaN(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("0.0/0.0", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).value)', 'true', {}, d)
          });


  }

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_default_values_for_mixin_arguments', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L1172-L1200
      // v3.2.0

      var css = "one {\n  color: white;\n  padding: 1px;\n  margin: 4px; }\n\ntwo {\n  color: white;\n  padding: 2px;\n  margin: 5px; }\n\nthree {\n  color: white;\n  padding: 2px;\n  margin: 3px; }\n";
      var sass = "$a: 5px\n=foo($a, $b: 1px, $c: null)\n  $c: 3px + $b !default\n  color: $a\n  padding: $b\n  margin: $c\none\n  +foo(#fff)\ntwo\n  +foo(#fff, 2px)\nthree\n  +foo(#fff, 2px, 3px)\n";
      equal(sass, css, {syntax: 'sass'}, done)
    })

    it('test_negation_unification', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L312-L316
      // v3.2.0

      function third() { unification(':not([a=b]).baz', ':not([a = b]) {@extend .baz}', ':not([a=b])', {syntax: 'scss'}, done) }
      function second() { unification(':not(.foo).baz', ':not(.foo) {@extend .baz}', ':not(.foo)', {syntax: 'scss'}, third) }
      unification(':not(.foo).baz', ':not(.bar) {@extend .baz}', ':not(.foo).baz, :not(.foo):not(.bar)', {syntax: 'scss'}, second)
    });

    it('test_summarized_selectors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L592-L635
      // v3.2.0

      function bo(){parses('E /*|foo/ F {\n  a: b; }\n',{syntax: 'scss'}, done)}
                                function bn(){parses('E /ns|foo/ F {\n  a: b; }\n',{syntax: 'scss'}, bo)}
                                function bm(){parses('E! > F {\n  a: b; }\n',{syntax: 'scss'}, bn)}
                                function bl(){parses('E /foo/ F {\n  a: b; }\n',{syntax: 'scss'}, bm)}
                                function bk(){parses('E ~ F {\n  a: b; }\n',{syntax: 'scss'}, bl)}
                                function bj(){parses('E + F {\n  a: b; }\n',{syntax: 'scss'}, bk)}
                                function bi(){parses('E > F {\n  a: b; }\n',{syntax: 'scss'}, bj)}
                                function bh(){parses('E F {\n  a: b; }\n',{syntax: 'scss'}, bi)}
                                function bg(){parses('E:nth-last-column(n) {\n  a: b; }\n',{syntax: 'scss'}, bh)}
                                function bf(){parses('E:nth-column(n) {\n  a: b; }\n',{syntax: 'scss'}, bg)}

                                function az(){parses('E:column(selector) {\n  a: b; }\n',{syntax: 'scss'}, bf)}
                                function ay(){parses('E:nth-last-match(n of selector) {\n  a: b; }\n',{syntax: 'scss'}, az)}
                                function ax(){parses('E:nth-match(n of selector) {\n  a: b; }\n',{syntax: 'scss'}, ay)}
                                function aw(){parses('E:only-of-type {\n  a: b; }\n',{syntax: 'scss'}, ax)}
                                function av(){parses('E:nth-last-of-type(n) {\n  a: b; }\n',{syntax: 'scss'}, aw)}
                                function au(){parses('E:last-of-type {\n  a: b; }\n',{syntax: 'scss'}, av)}
                                function at(){parses('E:nth-of-type(n) {\n  a: b; }\n',{syntax: 'scss'}, au)}
                                function as(){parses('E:first-of-type {\n  a: b; }\n',{syntax: 'scss'}, at)}
                                function ar(){parses('E:only-child {\n  a: b; }\n',{syntax: 'scss'}, as)}
                                function aq(){parses('E:nth-last-child(n) {\n  a: b; }\n',{syntax: 'scss'}, ar)}

                                function ap(){parses('E:last-child {\n  a: b; }\n',{syntax: 'scss'}, aq)}
                                function ao(){parses('E:nth-child(n) {\n  a: b; }\n',{syntax: 'scss'},ap)}
                                function an(){parses('E:first-child {\n  a: b; }\n',{syntax: 'scss'},ao)}
                                function am(){parses('E:empty {\n  a: b; }\n',{syntax: 'scss'},an)}
                                function al(){parses('E:root {\n  a: b; }\n',{syntax: 'scss'},am)}
                                function ak(){parses('E:read-write {\n  a: b; }\n',{syntax: 'scss'},al)}
                                function aj(){parses('E:read-only {\n  a: b; }\n',{syntax: 'scss'},ak)}
                                function ai(){parses('E:optional {\n  a: b; }\n',{syntax: 'scss'},aj)}
                                function ah(){parses('E:required {\n  a: b; }\n',{syntax: 'scss'},ai)}
                                function ag(){parses('E:out-of-range {\n  a: b; }\n',{syntax: 'scss'},ah)}
                                function af(){parses('E:in-range {\n  a: b; }\n',{syntax: 'scss'},ag)}
                                function ae(){parses('E:default {\n  a: b; }\n',{syntax: 'scss'},af)}
                                function ad(){parses('E:indeterminate {\n  a: b; }\n',{syntax: 'scss'},ae)}
                                function ac(){parses('E:checked {\n  a: b; }\n',{syntax: 'scss'},ad)}
                                function ab(){parses('E:disabled {\n  a: b; }\n',{syntax: 'scss'},ac)}
                                function aa(){parses('E:enabled {\n  a: b; }\n',{syntax: 'scss'},ab)}
                                function z(){parses('E:focus {\n  a: b; }\n',{syntax: 'scss'},aa)}
                                function y(){parses('E:hover {\n  a: b; }\n',{syntax: 'scss'},z)}
                                function x(){parses('E:active {\n  a: b; }\n',{syntax: 'scss'},y)}
                                function w(){parses('E:future {\n  a: b; }\n',{syntax: 'scss'},x)}
                                function v(){parses('E:past {\n  a: b; }\n',{syntax: 'scss'},w)}
                                function u(){parses('E:current(s) {\n  a: b; }\n',{syntax: 'scss'},v)}
                                function t(){parses('E:current {\n  a: b; }\n',{syntax: 'scss'},u)}
                                function s(){parses('E:scope {\n  a: b; }\n',{syntax: 'scss'},t)}
                                function r(){parses('E:target {\n  a: b; }\n',{syntax: 'scss'},s)}
                                function q(){parses('E:local-link(0) {\n  a: b; }\n',{syntax: 'scss'},r)}
                                function p(){parses('E:local-link {\n  a: b; }\n',{syntax: 'scss'},q)}
                                function o(){parses('E:visited {\n  a: b; }\n',{syntax: 'scss'},p)}
                                function n(){parses('E:link {\n  a: b; }\n',{syntax: 'scss'},o)}
                                function m(){parses('E:any-link {\n  a: b; }\n',{syntax: 'scss'},n)}
                                function l(){parses('E:lang(zh, *-hant) {\n  a: b; }\n',{syntax: 'scss'},m)}
                                function k(){parses('E:lang(fr) {\n  a: b; }\n',{syntax: 'scss'},l)}
                                function j(){parses('E:dir(ltr) {\n  a: b; }\n',{syntax: 'scss'},k)}
                                function i(){parses('E[foo|="en"] {\n  a: b; }\n',{syntax: 'scss'},j)}
                                function h(){parses('E[foo*="bar"] {\n  a: b; }\n',{syntax: 'scss'},i)}
                                function g(){parses('E[foo$="bar"] {\n  a: b; }\n',{syntax: 'scss'},h)}
                                function f(){parses('E[foo^="bar"] {\n  a: b; }\n',{syntax: 'scss'},g)}
                                function e(){parses('E[foo~="bar"] {\n  a: b; }\n',{syntax: 'scss'},f)}
                                function da(){parses('E[foo="bar" i] {\n  a: b; }\n',{syntax: 'scss'},e)}
                                function d(){parses('E[foo="bar"] {\n  a: b; }\n',{syntax: 'scss'},da)}
                                function c(){parses('E[foo] {\n  a: b; }\n',{syntax: 'scss'},d)}
                                function be(){parses('E#myid {\n  a: b; }\n',{syntax: 'scss'},c)}
                                function bd(){parses('E.warning {\n  a: b; }\n',{syntax: 'scss'},be)}
                                function bc(){parses('E:matches(s1, s2) {\n  a: b; }\n',{syntax: 'scss'},bd)}
                                function bb(){parses('E:not(s1, s2) {\n  a: b; }\n',{syntax: 'scss'},bc)}
                                function ba(){parses('E:not(s) {\n  a: b; }\n',{syntax: 'scss'},bb)}
                                function b(){parses('E {\n  a: b; }\n',{syntax: 'scss'},ba)}

                                parses('* {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_summarized_selectors', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/css_test.rb#L654-L724
      // v3.2.0

      function bf(){parses(':nth-last-column(n) {\n  a: b; }\n',{ syntax:'scss'}, done)}
      function be(){parses(':nth-column(n) {\n  a: b; }\n',{ syntax:'scss'}, bf)}
      function bd(){parses(':column(selector) {\n  a: b; }\n',{ syntax:'scss'}, be)}
      function bc(){parses(':nth-last-match(n of selector) {\n  a: b; }\n',{ syntax:'scss'}, bd)}
      function bb(){parses(':nth-match(n of selector) {\n  a: b; }\n',{ syntax:'scss'}, bc)}
      function ba(){parses(':only-of-type {\n  a: b; }\n',{ syntax:'scss'}, bb)}

      function az(){parses(':nth-last-of-type(n) {\n  a: b; }\n',{ syntax:'scss'}, ba)}
      function ay(){parses(':last-of-type {\n  a: b; }\n',{ syntax:'scss'}, az)}
      function ax(){parses(':nth-of-type(n) {\n  a: b; }\n',{ syntax:'scss'}, ay)}
      function aw(){parses(':first-of-type {\n  a: b; }\n',{ syntax:'scss'}, ax)}
      function av(){parses(':only-child {\n  a: b; }\n',{ syntax:'scss'}, aw)}
      function au(){parses(':nth-last-child(n) {\n  a: b; }\n',{ syntax:'scss'}, av)}
      function at(){parses(':last-child {\n  a: b; }\n',{ syntax:'scss'}, au)}
      function as(){parses(':nth-child(n) {\n  a: b; }\n',{ syntax:'scss'}, at)}
      function ar(){parses(':first-child {\n  a: b; }\n',{ syntax:'scss'}, as)}
      function aq(){parses(':empty {\n  a: b; }\n',{ syntax:'scss'}, ar)}
      function ap(){parses(':root {\n  a: b; }\n',{ syntax:'scss'}, aq)}
      function ao(){parses(':read-write {\n  a: b; }\n',{ syntax:'scss'}, ap)}
      function an(){parses(':read-only {\n  a: b; }\n',{ syntax:'scss'}, ao)}
      function am(){parses(':optional {\n  a: b; }\n',{ syntax:'scss'}, an)}
      function al(){parses(':required {\n  a: b; }\n',{ syntax:'scss'}, am)}
      function ak(){parses(':out-of-range {\n  a: b; }\n',{ syntax:'scss'}, al)}
      function aj(){parses(':in-range {\n  a: b; }\n',{ syntax:'scss'}, ak)}
      function ai(){parses(':default {\n  a: b; }\n',{ syntax:'scss'},aj)}
      function ah(){parses(':indeterminate {\n  a: b; }\n',{ syntax:'scss'},ai)}
      function ag(){parses(':checked {\n  a: b; }\n',{ syntax:'scss'},ah)}
      function af(){parses(':disabled {\n  a: b; }\n',{ syntax:'scss'},ag)}
      function ae(){parses(':enabled {\n  a: b; }\n',{ syntax:'scss'},af)}
      function ad(){parses(':focus {\n  a: b; }\n',{ syntax:'scss'},ae)}
      function ac(){parses(':hover {\n  a: b; }\n',{ syntax:'scss'},ad)}
      function ab(){parses(':active {\n  a: b; }\n',{ syntax:'scss'},ac)}
      function aa(){parses(':future {\n  a: b; }\n',{ syntax:'scss'},ab)}
      function z(){parses(':past {\n  a: b; }\n',{ syntax:'scss'},aa)}
      function y(){parses(':current(s) {\n  a: b; }\n',{ syntax:'scss'},z)}
      function x(){parses(':current {\n  a: b; }\n',{ syntax:'scss'},y)}
      function w(){parses(':scope {\n  a: b; }\n',{ syntax:'scss'},x)}
      function v(){parses(':target {\n  a: b; }\n',{ syntax:'scss'},w)}
      function u(){parses(':local-link(0) {\n  a: b; }\n',{ syntax:'scss'},v)}
      function t(){parses(':local-link {\n  a: b; }\n',{ syntax:'scss'},u)}
      function s(){parses(':visited {\n  a: b; }\n',{ syntax:'scss'},t)}
      function r(){parses(':link {\n  a: b; }\n',{ syntax:'scss'},s)}
      function q(){parses(':any-link {\n  a: b; }\n',{ syntax:'scss'},r)}
      function p(){parses(':lang(zh, *-hant) {\n  a: b; }\n',{ syntax:'scss'},q)}
      function o(){parses(':lang(fr) {\n  a: b; }\n',{ syntax:'scss'},p)}
      function n(){parses(':dir(ltr) {\n  a: b; }\n',{ syntax:'scss'},o)}
      function m(){parses('[foo|="en"] {\n  a: b; }\n',{ syntax:'scss'},n)}
      function l(){parses('[foo*="bar"] {\n  a: b; }\n',{ syntax:'scss'},m)}
      function k(){parses('[foo$="bar"] {\n  a: b; }\n',{ syntax:'scss'},l)}
      function j(){parses('[foo^="bar"] {\n  a: b; }\n',{ syntax:'scss'},k)}
      function i(){parses('[foo~="bar"] {\n  a: b; }\n',{ syntax:'scss'},j)}
      function h(){parses('[foo="bar" i] {\n  a: b; }\n',{ syntax:'scss'},i)}
      function g(){parses('[foo="bar"] {\n  a: b; }\n',{ syntax:'scss'},h)}
      function f(){parses('[foo] {\n  a: b; }\n',{ syntax:'scss'},g)}
      function e(){parses('#myid {\n  a: b; }\n',{ syntax:'scss'},f)}
      function d(){parses('.warning {\n  a: b; }\n',{ syntax:'scss'},e)}
      function c(){parses(':matches(s1, s2) {\n  a: b; }\n',{ syntax:'scss'},d)}
      function b(){parses(':not(s1, s2) {\n  a: b; }\n',{ syntax:'scss'},c)}

      parses(':not(s) {\n  a: b; }\n',{syntax: 'scss'},b)
    });

    it('test_import_directive', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L491-L497
      // v3.2.0

      function second() {parses('@import url(foo.css);', {syntax: 'scss'}, done) }
      parses('@import url("foo.css");', {syntax: 'scss'}, second)
    });

    it('test_http_import', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/engine_test.rb#L623-L626
      // v3.2.0

      var css = "@import url(http://fonts.googleapis.com/css?family=Droid+Sans);\n"
        var scss = "@import \"http://fonts.googleapis.com/css?family=Droid+Sans\""
        equal(scss, css, {syntax: 'sass'}, done)
    });

  }

  if (semver.lt(window.__libVersion, "3.4.14")) {
    it('test_rgb_percent', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/functions_test.rb#L188-L193
      // v3.2.0

      function fourth() {eval_equal(func_parse("rgb(0%, 100%, 50%)"), '"springgreen"', {}, done)}
      function third() {eval_equal(func_parse("rgb(190, 68%, 237)"), '"#beaded"', {}, fourth)}
      function second() { eval_equal(func_parse("rgb(74.7%, 173, 93%)"), '"#beaded"', {}, third) }
      eval_equal(func_parse("rgb(7.1%, 20.4%, 34%)"), '"#123456"', {}, second)
    });

    it('test_supports', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/css_test.rb#L616-L649
      // v3.2.0

      function second() {
        var css = "@supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b; } }\n@supports (a: b) {\n  .foo {\n    a: b; } }\n";
        var scss = "@supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b;\n  }\n}\n\n@supports (a: b) {\n  .foo {\n    a: b;\n  }\n}\n";
        equal(scss, css,{syntax: 'scss'}, done)
      }

      var css = "@-prefix-supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b; } }\n";
      var scss = "@-prefix-supports (a: b) and (c: d) or (not (d: e)) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b;\n  }\n}\n";
      equal(scss, css,{syntax: 'scss'}, second)
    })

    it('test_supports_with_expressions', function(done) {
      // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/scss/scss_test.rb#L1380-L1393
      // v3.2.0

      var css = "@supports (feature1: val) and (feature2: val) or (not (feature23: val4)) {\n  foo {\n    a: b; } }\n";
      var scss = "$query: \"(feature1: val)\";\n$feature: feature2;\n$val: val;\n@supports #{$query} and ($feature: $val) or (not ($feature + 3: $val + 4)) {\n  foo {a: b}\n}\n";
      equal(scss,css,{syntax: 'scss'}, done)
    });

  }

}

/*****************************************************************************************************
 * v3.2.2
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.2")) {
  //TODO we do not currently support imports. PRs welcome!
  it.skip('test_import_same_name_different_ext', function(done) {
    // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/engine_test.rb#L221-L239
    // v3.2.2
  });

  //TODO we do not currently support imports. PRs welcome!
  it.skip('test_import_same_name_different_partiality', function(done) {
    // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/engine_test.rb#L241-L277
    // v3.2.2
  });

  //TODO we do not currently support imports. PRs welcome!
  it.skip('test_import_same_name', function(done) {
    // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/plugin_test.rb#L219-L230
    // v3.2.2
  })

  //TODO we do not currently support imports. PRs welcome!
  it.skip('test_cached_import_option', function(done) {
    // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/plugin_test.rb#L358-L373
    // v3.2.2
  })

  it('test_malformed_media', function(done) {
    // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/scss/css_test.rb#L1045-L1055
    // v3.2.2

    doesnt_parse('@media<err>{\n  margin: 0;\n}','media query (e.g. print, screen, print and screen)',{syntax: 'scss'}, done)
  });

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_protocol_relative_import', function(done) {
      // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/engine_test.rb#L668-L671
      // v3.2.2

      var css = "@import url(//fonts.googleapis.com/css?family=Droid+Sans);\n"
        var scss = "@import \"//fonts.googleapis.com/css?family=Droid+Sans\""
        equal(scss, css, {syntax: 'sass'}, done)
    });

    it('test_double_parent_selector_error', function(done) {
      // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/scss/scss_test.rb#L1692-L1702
      // v3.2.2

      err_message("flim {\n  && {a: b}\n}\n", "Invalid CSS after \"  &\": expected \"{\", was \"& {a: b}\"\n\n\"&\" may only be used at the beginning of a compound selector.", {syntax: 'scss'}, done)
    });

  it('test_parent_in_mid_selector_error', function(done) {
    // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/scss/scss_test.rb#L1668-L1678
    // v3.2.2

    err_message("flim {\n  .foo.bar& {a: b}\n}\n", "Invalid CSS after \"  .foo.bar\": expected \"{\", was \"& {a: b}\"\n\n\"&\" may only be used at the beginning of a compound selector.", {syntax: 'scss'}, done)
  });

  it('test_parent_after_selector_error', function(done) {
    // https://github.com/sass/sass/blob/9ebeb1d088d5bd9afb7ac6b506b198fbfbe006c2/test/sass/scss/scss_test.rb#L1680-L1690
    // v3.2.2

    err_message("flim {\n  && {a: b}\n}\n", "Invalid CSS after \"  &\": expected \"{\", was \"& {a: b}\"\n\n\"&\" may only be used at the beginning of a compound selector.", {syntax: 'scss'}, done)
  });

  }

}

/*****************************************************************************************************
 * v3.2.3
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.3")) {
  it('test_extend_in_media_in_rule', function(done) {
    // https://github.com/sass/sass/blob/af2bd6360ce9b41ba809e9e9b20dec4c43419fa2/test/sass/scss/scss_test.rb#L1981-L1999
    // v3.2.3

    var css = "@media screen {\n  .foo {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @extend %bar;\n  }\n}\n\n@media screen {\n  %bar {\n    a: b;\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });
}

/*****************************************************************************************************
 * v3.2.4
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.4")) {
  it('test_parsing_decimals_followed_by_comments_doesnt_take_forever', function(done) {
    // https://github.com/sass/sass/blob/76826f4fddf8f52a004d7e7362d2a422be9c4ff3/test/sass/scss/scss_test.rb#L1714-L1723
    // v3.2.4

    var css = ".foo {\n  padding: 4.21053% 4.21053% 5.63158%; }\n";
    var scss = ".foo {\n  padding: 4.21052631578947% 4.21052631578947% 5.631578947368421% /**/\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_parsing_many_numbers_doesnt_take_forever', function(done) {
    // https://github.com/sass/sass/blob/76826f4fddf8f52a004d7e7362d2a422be9c4ff3/test/sass/scss/scss_test.rb#L1725-L1735
    // v3.2.4

    var many_numbers = "80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%, 80% 90%"
      var css = ".foo {\n  padding: " + many_numbers + "; }\n";
    var scss = ".foo {\n  padding: \#{" + many_numbers + "};\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_import_comments_in_imports', function(done) {
    // https://github.com/sass/sass/blob/76826f4fddf8f52a004d7e7362d2a422be9c4ff3/test/sass/scss/scss_test.rb#L1737-L1747
    // v3.2.4

    var css = "@import url(foo.css);\n@import url(bar.css);\n@import url(baz.css);\n";
    var scss = "@import \"foo.css\", // this is a comment\n        \"bar.css\", /* this is another comment */\n        \"baz.css\"; // this is a third comment\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });
}

/*****************************************************************************************************
 * v3.2.5
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.5")) {
  it('test_partially_failed_extend', function(done) {
    // https://github.com/sass/sass/blob/f2ff5d2d60a461f7b1ecfdb036c558ad6fa34fa2/test/sass/extend_test.rb#L1189-L1201
    // v3.2.5

    function third() {
      sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      var css = ".rc, test {\n  color: white; }\n\n.prices span.pill span.rc {\n  color: red; }\n";
      var scss = "test { @extend .rc; }\n.rc {color: white;}\n.prices span.pill span.rc {color: red;}\n";

      sassBuilder({css: scss, options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined);
        expect(result.css).to.equal(css);
        third()
      })
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_line_numbers_with_dos_line_endings', function(done) {
      // https://github.com/sass/sass/blob/f2ff5d2d60a461f7b1ecfdb036c558ad6fa34fa2/test/sass/engine_test.rb#L2384-L2397
      // v3.2.5

      var css = "/* line 5, test_line_numbers_with_dos_line_endings_inline.sass */\n.foo {\n  a: b; }\n";
      var scss = "\r\n\r\n\r\n\r\n.foo\n  a: b\n";
      equal(scss, css, {syntax: 'sass', line_comments: true, filename: 'test_line_numbers_with_dos_line_endings_inline.sass'}, done)
    });
  }
}

/*****************************************************************************************************
 * v3.2.6
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.6")) {
  it('test_supports_bubbles', function(done) {
    // https://github.com/sass/sass/blob/ee1b8f46d7715be8a4c6e499895f0d2e9e0289df/test/sass/engine_test.rb#L2384-L2398
    // v3.2.6

    var css = "parent {\n  background: orange; }\n  @supports (perspective: 10px) or (-moz-perspective: 10px) {\n    parent child {\n      background: blue; } }\n";
    var sass = "parent\n  background: orange\n  @supports (perspective: 10px) or (-moz-perspective: 10px)\n    child\n      background: blue\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_extend_in_double_nested_media_query', function(done) {
    // https://github.com/sass/sass/blob/ee1b8f46d7715be8a4c6e499895f0d2e9e0289df/test/sass/extend_test.rb#L1189-L1202
    // v3.2.6

    var css = "@media all and (orientation: landscape) {\n  .bar {\n    color: blue; } }\n";
    var scss = "@media all {\n  @media (orientation: landscape) {\n    %foo {color: blue}\n    .bar {@extend %foo}\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });
}

/*****************************************************************************************************
 * v3.2.7
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.7")) {
  it('test_zip', function(done) {
    // https://github.com/sass/sass/blob/7709c66bc7bea6c5a25cc80936adde135a10243a/test/sass/functions_test.rb#L1021
    // v3.2.7

    eval_equal(func_parse("zip(1, 2, 3)"), '"1 2 3"', {}, done)
  });

  it('test_very_long_number_with_important_doesnt_take_forever', function(done) {
    // https://github.com/sass/sass/blob/7709c66bc7bea6c5a25cc80936adde135a10243a/test/sass/scss/css_test.rb#L1014-L1023
    // v3.2.7

    var css = ".foo {\n  width: 97.916666666666666666666666666667% !important; }\n";
    var scss = ".foo {\n  width: 97.916666666666666666666666666667% !important;\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_unary_ops', function(done) {
    // https://github.com/sass/sass/blob/7709c66bc7bea6c5a25cc80936adde135a10243a/test/sass/scss/css_test.rb#L424-L438
    // v3.2.7

    var css = "foo {\n  a: -0.5em;\n  b: +0.5em;\n  c: -foo(12px);\n  d: +foo(12px); }\n";
    var scss = "foo {\n  a: -0.5em;\n  b: +0.5em;\n  c: -foo(12px);\n  d: +foo(12px); }\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_index', function(done) {
      // https://github.com/sass/sass/blob/7709c66bc7bea6c5a25cc80936adde135a10243a/test/sass/functions_test.rb#L1028-L1031
      // v3.2.7

      function b() {eval_equal(func_parse("index(1px, #00f)"), '"false"', {}, done)}
      eval_equal(func_parse("index(1px, 1px)"), '"1"', {}, b)

    });
  }

}

/*****************************************************************************************************
 * v3.2.8
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.8")) {
  it('test_parent_mixin_in_content_nested', function(done) {
    // https://github.com/sass/sass/blob/0191df3b04802d34eb68ec77538145a95d013d4d/test/sass/engine_test.rb#L2399-L2415
    // v3.2.8

    var css = "a {\n  b: c; }\n";
    var sass = "=foo\n  @content\n\n=bar\n  +foo\n    +foo\n      a\n        b: c\n\n+bar\n";
    equal(sass, css, {syntax: 'sass'}, done)
  });

  it('test_nested_double_extend_optimization', function(done) {
    // https://github.com/sass/sass/blob/0191df3b04802d34eb68ec77538145a95d013d4d/test/sass/extend_test.rb#L1189-L1210
    // v3.2.8

    var css = ".parent1 .child {\n  a: b; }\n";
    var scss = "%foo %bar {\n  a: b;\n}\n\n.parent1 {\n  @extend %foo;\n  .child {\n    @extend %bar;\n  }\n}\n\n.parent2 {\n  @extend %foo;\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_interpolation_near_operators', function(done) {
    // https://github.com/sass/sass/blob/0191df3b04802d34eb68ec77538145a95d013d4d/test/sass/script_test.rb#L137
    // v3.2.8

    eval_equal(func_parse("3, 7, #{5 + 6}"), '"3, 7, 11"', {}, done)
  });

  it('test_double_space_string', function(done) {
    // https://github.com/sass/sass/blob/0191df3b04802d34eb68ec77538145a95d013d4d/test/sass/scss/css_test.rb#L1014-L1023
    // v3.2.8

    var css = ".a {\n  content: \"  a\"; }\n";
    var scss = ".a {\n  content: \"  a\";\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  if (semver.lt(window.__libVersion, "3.3.0")) {
    it('test_mixin_loop_with_content', function(done) {
      // https://github.com/sass/sass/blob/0191df3b04802d34eb68ec77538145a95d013d4d/test/sass/engine_test.rb#L526-L539
      // v3.2.8

      var sass = "=foo\n  @content\n=bar\n  +foo\n    +bar\n+bar\n";
      var err_text = "An @include loop has been found: bar includes itself";

      sassBuilder({css: sass, options: {syntax: 'sass'}}, function(result) {
        expect(JSON.parse(result.err).message).to.contain(err_text)
          expect(result.css).to.be(undefined)
          done()
      })
    });
  }

}

/*****************************************************************************************************
 * v3.2.9
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.9")) {
  it('test_nested_extend_specificity', function(done) {
    // https://github.com/sass/sass/blob/ab4b3b918bfa1fc77a9c4378e199ca1ed6f1704c/test/sass/extend_test.rb#L1189-L1201
    // v3.2.9

    var css = "a :b, a :b:c {\n  a: b; }\n";
    var scss = "%foo {a: b}\n\na {\n  :b {@extend %foo}\n  :b:c {@extend %foo}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_counter', function(done) {
    // https://github.com/sass/sass/blob/ab4b3b918bfa1fc77a9c4378e199ca1ed6f1704c/test/sass/functions_test.rb#L1040-L1044
    // v3.2.9
    function third() { eval_equal(func_parse("counter(item,\\\".\\\")"), '"counter(item,\\\".\\\")"', {}, done) }
    function second() { eval_equal(func_parse("counter(item, \\\".\\\")"), '"counter(item,\\\".\\\")"', {}, third) }
    eval_equal(func_parse("counter(foo)"), '"counter(foo)"', {}, second)
  });
}

/*****************************************************************************************************
 * v3.2.10
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.10")) {
  it('test_loud_comment_in_compressed_mode', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/engine_test.rb#L1805-L1817
    // v3.2.10

    var css = "foo{color:blue;/*! foo\n * bar\n */}\n";
    var scss = "foo\n  color: blue\n  /*! foo\n   * bar\n   */\n";
    equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
  })

  it('test_interpolated_comment_in_mixin', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/engine_test.rb#L2488-L2511
    // v3.2.10

    var source = "=foo($var)\n  /*! color: #{$var}\n  .foo\n    color: $var\n\n+foo(red)\n+foo(blue)\n+foo(green)\n";
    var expected = "/*! color: red */\n.foo {\n  color: red; }\n\n/*! color: blue */\n.foo {\n  color: blue; }\n\n/*! color: green */\n.foo {\n  color: green; }\n";

    equal(source, expected, {syntax: 'sass'}, done)
  });

  it('test_loud_comment_interpolations_can_be_escaped', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/engine_test.rb#L2786-L2797
    // v3.2.10

    function second() {
      var css = "/*! \#{foo} */\n";
      var scss = "/*! \\#{foo}\n";
      equal(scss, css, {syntax: 'sass'}, done)
    }

    var css = "/* #{foo} */\n";
    var scss = "/* \\\#{foo}\n";
    equal(scss, css, {syntax: 'sass'}, done)
  });

  it('test_nested_sibling_extend', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/extend_test.rb#L1175-L1191
    // v3.2.10

    var css = ".parent .bar, .parent .foo {\n  width: 2000px; }\n";
    var scss = ".foo {@extend .bar}\n.parent {\n  .bar {\n    width: 2000px;\n  }\n  \n  .foo {\n    @extend .bar\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_parent_and_sibling_extend', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/extend_test.rb#L1193-L1210
    // v3.2.10

    var css = ".parent1 .parent2 .child1.child2, .parent2 .parent1 .child1.child2 {\n  c: d; }\n";
    var scss = "%foo %bar%baz {c: d}\n\n.parent1 {\n  @extend %foo;\n  .child1 {@extend %bar}\n}\n\n.parent2 {\n  @extend %foo;\n  .child2 {@extend %baz}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_hsl_checks_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L86-L90
    // v3.2.10

    function fourth() {eval_err(func_parse('hsla(\\"foo\\", 10, 12, 0.3)'), "$hue: \"foo\" is not a number", {}, done)};
    function third() {eval_err(func_parse('hsla(10, \\"foo\\", 12, 0)'), "$saturation: \"foo\" is not a number", {}, fourth)};
    eval_err(func_parse('hsla(10, 10, \\"foo\\", 1)'), "$lightness: \"foo\" is not a number", {}, third)
  });

  it('test_hsla_checks_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L106-L111
    // v3.2.10

    function fourth() {eval_err(func_parse('hsla(\\"foo\\", 10, 12, 0.3)'), "$hue: \"foo\" is not a number", {}, done)};
    function third() {eval_err(func_parse('hsla(10, \\"foo\\", 12, 0)'), "$saturation: \"foo\" is not a number", {}, fourth)};
    function second() {eval_err(func_parse('hsla(10, 10, \\"foo\\", 1)'), "$lightness: \"foo\" is not a number", {}, third)};
    eval_err(func_parse('hsla(10, 10, 10, \\"foo\\")'), "$alpha: \"foo\" is not a number", {}, second);
  });

  it('test_rgb_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L217-L221
    // v3.2.10

    function third() {eval_err(func_parse('rgb(\\"foo\\", 10, 12)'), '$red: \"foo\" is not a number', {}, done)};
    function second() {eval_err(func_parse('rgb(10, \\"foo\\", 12)'), '$green: \"foo\" is not a number', {}, third)};
    eval_err(func_parse('rgb(10, 10, \\"foo\\")'), '$blue: \"foo\" is not a number', {}, second);
  });

  it('test_rgba_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L247-L252
    // v3.2.10

    function fourth() {eval_err(func_parse('rgba(10, 10, 10, \\"foo\\")'), "$alpha: \"foo\" is not a number", {}, done)};
    function third() {eval_err(func_parse('rgba(10, 10, \\"foo\\", 0)'), "$blue: \"foo\" is not a number", {}, fourth)};
    function second() {eval_err(func_parse('rgba(10, \\"foo\\", 12, 0.1)'), "$green: \"foo\" is not a number", {}, third)};
    eval_err(func_parse('rgba(\\"foo\\", 10, 12, 0.2)'), "$red: \"foo\" is not a number", {}, second);
  });

  it('test_rgba_with_color_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L260-L263
    // v3.2.10

    function second() { eval_err(func_parse('rgba(\\"foo\\", 0.2)'), '$color: \"foo\" is not a color', {}, done) }
    eval_err(func_parse('rgba(blue, \\"foo\\")'), '$alpha: \"foo\" is not a number', {}, second)
  });

  it('test_red_exception', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L277-L279
    // v3.2.10

    eval_err(func_parse('red(12)'), "$color: 12 is not a color", {}, done);
  });

  it('test_green_exception', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L286-L288
    // v3.2.10

    eval_err(func_parse('green(12)'), "$color: 12 is not a color", {}, done);
  });

  it('test_blue_exception', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L296-L297
    // v3.2.10

    eval_err(func_parse('blue(12)'), "$color: 12 is not a color", {}, done);
  });

  it('test_saturation_exception', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L314-L316
    // v3.2.10

    eval_err(func_parse('saturation(12)'), "$color: 12 is not a color", {}, done);
  });

  it('test_lightness_exception', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L324-L326
    // v3.2.10

    eval_err(func_parse('lightness(12)'), "$color: 12 is not a color", {}, done);
  });

  it('test_alpha_exception', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L335-L337
    // v3.2.10

    eval_err(func_parse('alpha(12)'), "$color: 12 is not a color", {}, done);
  });

  it('test_opacity_exception', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L347-L349
    // v3.2.10

    eval_err(func_parse('opacity(foo)'), "$color: \"foo\" is not a color", {}, done);
  });

  it('test_opacify_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L369-L372
    // v3.2.10

    function second() {eval_err(func_parse('opacify(\\"foo\\", 10%)'), "$color: \"foo\" is not a color", {}, done)}
    eval_err(func_parse('opacify(#fff, \\"foo\\")'), "$amount: \"foo\" is not a number", {}, second);
  });

  it('test_transparentize_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L392-L395
    // v3.2.10

    function second() {eval_err(func_parse('transparentize(\\"foo\\", 10%)'), "$color: \"foo\" is not a color", {}, done)}
    eval_err(func_parse('transparentize(#fff, \\"foo\\")'), "$amount: \"foo\" is not a number", {}, second);
  });

  it('test_lighten_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L414-L417
    // v3.2.10

    function second() {eval_err(func_parse('lighten(\\"foo\\", 10%)'), "$color: \"foo\" is not a color", {}, done)}
    eval_err(func_parse('lighten(#fff, \\"foo\\")'), "$amount: \"foo\" is not a number", {}, second);
  });

  it('test_darken_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L436-L439
    // v3.2.10

    function second() {eval_err(func_parse('darken(\\"foo\\", 10%)'), "$color: \"foo\" is not a color", {}, done)}
    eval_err(func_parse('darken(#fff, \\"foo\\")'), "$amount: \"foo\" is not a number", {}, second);
  });

  it('test_saturate_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L460-L463
    // v3.2.10

    function second() {eval_err(func_parse('saturate(\\"foo\\", 10%)'), "$color: \"foo\" is not a color", {}, done)}
    eval_err(func_parse('saturate(#fff, \\"foo\\")'), "$amount: \"foo\" is not a number", {}, second);
  });

  it('test_desaturate_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L483-L486
    // v3.2.10

    function second() {eval_err(func_parse('desaturate(\\"foo\\", 10%)'), "$color: \"foo\" is not a color", {}, done)}
    eval_err(func_parse('desaturate(#fff, \\"foo\\")'), "$amount: \"foo\" is not a number", {}, second);
  });

  it('test_adjust_hue_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L500-L503
    // v3.2.10

    function second() {eval_err(func_parse('adjust-hue(\\"foo\\", 10%)'), "$color: \"foo\" is not a color", {}, done)}
    eval_err(func_parse('adjust-hue(#fff, \\"foo\\")'), "$degrees: \"foo\" is not a number", {}, second);
  });

  it('test_adjust_color_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L559-L578
    // v3.2.10

    function eighth() {eval_err(func_parse('adjust-color(foo, $hue: 10)'), "$color: \"foo\" is not a color", {}, done)}
    function seventh() {eval_err(func_parse('adjust-color(blue, $hue: foo)'), "$hue: \"foo\" is not a number", {}, eighth)}
    function sixth() {eval_err(func_parse('adjust-color(blue, $saturation: foo)'), "$saturation: \"foo\" is not a number", {}, seventh)}
    function fifth() {eval_err(func_parse('adjust-color(blue, $lightness: foo)'), "$lightness: \"foo\" is not a number", {}, sixth)}
    function fourth() {eval_err(func_parse('adjust-color(blue, $red: foo)'), "$red: \"foo\" is not a number", {}, fifth)}
    function third() {eval_err(func_parse('adjust-color(blue, $green: foo)'), "$green: \"foo\" is not a number", {}, fourth)}
    function second() {eval_err(func_parse('adjust-color(blue, $blue: foo)'), "$blue: \"foo\" is not a number", {}, third)}
    eval_err(func_parse('adjust-color(blue, $alpha: foo)'), "$alpha: \"foo\" is not a number", {}, second);
  });

  it('test_scale_color_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L665-L682
    // v3.2.10

    function g() {eval_err(func_parse('scale-color(foo, $red: 10%)'), "$color: \"foo\" is not a color", {}, done)}
    function f() {eval_err(func_parse('scale-color(blue, $saturation: foo)'), "$saturation: \"foo\" is not a number", {}, g)}
    function e() {eval_err(func_parse('scale-color(blue, $lightness: foo)'), "$lightness: \"foo\" is not a number", {}, f)}
    function d() {eval_err(func_parse('scale-color(blue, $red: foo)'), "$red: \"foo\" is not a number", {}, e)}
    function c() {eval_err(func_parse('scale-color(blue, $green: foo)'), "$green: \"foo\" is not a number", {}, d)}
    function b() {eval_err(func_parse('scale-color(blue, $blue: foo)'), "$blue: \"foo\" is not a number", {}, c)}
    eval_err(func_parse('scale-color(blue, $alpha: foo)'), "$alpha: \"foo\" is not a number", {}, b);
  });

  it('test_change_color_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L736-L749
    // v3.2.10

    function g() {eval_err(func_parse('change-color(blue, $alpha: foo)'), "$alpha: \"foo\" is not a number", {}, done)}
    function f() {eval_err(func_parse('change-color(blue, $blue: foo)'), "$blue: \"foo\" is not a number", {}, g)}
    function e() {eval_err(func_parse('change-color(blue, $green: foo)'), "$green: \"foo\" is not a number", {}, f)}
    function d() {eval_err(func_parse('change-color(blue, $red: foo)'), "$red: \"foo\" is not a number", {}, e)}
    function c() {eval_err(func_parse('change-color(blue, $lightness: foo)'), "$lightness: \"foo\" is not a number", {}, d)}
    function b() {eval_err(func_parse('change-color(blue, $saturation: foo)'), "$saturation: \"foo\" is not a number", {}, c)}
    eval_err(func_parse('change-color(foo, $red: 10%)'), "$color: \"foo\" is not a color", {}, b);
  });

  it('tets_grayscale_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L824-L826
    // v3.2.10

    eval_err(func_parse('grayscale(\\"foo\\")'), "$color: \"foo\" is not a color", {}, done);
  });

  it('tets_complement_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L837-L839
    // v3.2.10

    eval_err(func_parse('complement(\\"foo\\")'), "$color: \"foo\" is not a color", {}, done);
  });

  it('test_invert_tests_types', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L847-L849
    // v3.2.10

    eval_err(func_parse('invert(\\"foo\\")'), "$color: \"foo\" is not a color", {}, done);
  });

  it('test_quote_tests_type', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L863-L865
    // v3.2.10

    eval_err(func_parse('quote(#f00)'), "$string: #ff0000 is not a string", {}, done);
  });

  it('test_unitless', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L906-L911
    // v3.2.10

    function d() {eval_equal(func_parse("unitless(100)"), '"true"', {}, done)}
    function c() { eval_equal(func_parse("unitless(100px)"), '"false"', {}, d) }
    function b() { eval_equal(func_parse("unitless($number: 100px)"), '"false"', {}, c) }
    eval_err(func_parse('unitless(#f00)'), "$number: #ff0000 is not a number", {}, b);
  });

  it('test_length', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L944
    // v3.2.10

    eval_err(func_parse('nth(1 2 3, foo)'), "$n: \"foo\" is not a number", {}, done);
  });

  it('test_join', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L983
    // 3.2.10

    eval_err(func_parse("join(1, 2, 12)"), '$separator: 12 is not a string', {}, done)
  });

  it('test_append', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L1018
    // v3.2.10

    eval_err(func_parse("append(1, 2, 12)"), '$separator: 12 is not a string', {}, done)
  });

  it('test_loud_comment_in_compressed_mode', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/scss/scss_test.rb#L1714-L1721
    // v3.2.10

    var css = "/*! foo */\n"
      var scss = "/*! foo */\n"
      equal(scss, css, {syntax: 'scss'}, done)
  });

  if (semver.lt(window.__libVersion, "3.3.0")) {
    it('test_loud_comment_is_evaluated', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/engine_test.rb#L1819-L1827
      // v3.2.10

      var css = "/*!\n * Hue: 327.21649deg */\n";
      var sass = "/*!\n  Hue: #{hue(#f836a0)}\n";
      equal(sass, css, {syntax: 'sass'}, done)
    })

    it('test_another_nested_extender_with_early_child_selectors_doesnt_subseq_them', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/extend_test.rb#L492-L516
      // v3.2.10

      function second() {
        var css = ".bap > .bip .foo, .bap > .bip .bap > .grip .bar, .bap > .grip .bap > .bip .bar {\n  a: b; }\n";
        var scss = ".bap > .bip .foo {a: b}\n.bap > .grip .bar {@extend .foo}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      }

      var css = ".bip > .bap .foo, .bip > .bap .grip > .bap .bar, .grip > .bap .bip > .bap .bar {\n  a: b; }\n";
      var scss = ".bip > .bap .foo {a: b}\n.grip > .bap .bar {@extend .foo}\n";
      equal(scss, css, {syntax: 'scss'}, second)
    })

    it('test_percentage_checks_types', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L120-L124
      // v3.2.10

      function third() {eval_err(func_parse('percentage(\\"string\\")'), "$value: \"string\" is not a unitless number", {}, done)};
      function second() {eval_err(func_parse("percentage(#ccc)"), "$value: #cccccc is not a unitless number", {}, third)};
      eval_err(func_parse("percentage(25px)"), "$value: 25px is not a unitless number", {}, second);
    });

    it('test_round', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L126-L133
      // v3.2.10

      function fifth() {eval_equal(func_parse("round(4.8)"), '"5"', {}, done)}
      function fourth() {eval_equal(func_parse("round(4.8px)"), '"5px"', {}, fifth)}
      function third() {eval_equal(func_parse("round(5.49px)"), '"5px"', {}, fourth)}
      function second() { eval_equal(func_parse("round($value: 5.49px)"), '"5px"', {}, third) }
      eval_err(func_parse("round(#ccc)"), "$value: #cccccc is not a number", {}, second);
    });

    it('test_floor', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L135-L141
      // v3.2.10

      function fourth() {eval_equal(func_parse("floor(4.8)"), '"4"', {}, done)}
      function third() {eval_equal(func_parse("floor(4.8px)"), '"4px"', {}, fourth)}
      function second() { eval_equal(func_parse("floor($value: 4.8px)"), '"4px"', {}, third) }
      eval_err(func_parse('floor(\\"foo\\")'), "$value: \"foo\" is not a number", {}, second);
    });

    it('test_ceil', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L143-L149
      // v3.2.10

      function fourth() {eval_equal(func_parse("ceil(4.1)"), '"5"', {}, done)}
      function third() {eval_equal(func_parse("ceil(4.8px)"), '"5px"', {}, fourth)}
      function second() { eval_equal(func_parse("ceil($value: 4.8px)"), '"5px"', {}, third) }
      eval_err(func_parse('ceil(\\"a\\")'), "$value: \"a\" is not a number", {}, second);
    });

    it('test_abs', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L151-L159
      // v3.2.10

      function sixth() {eval_equal(func_parse("abs(-5)"), '"5"', {}, done)}
      function fifth() {eval_equal(func_parse("abs(-5px)"), '"5px"', {}, sixth)}
      function fourth() {eval_equal(func_parse("abs(5)"), '"5"', {}, fifth)}
      function third() {eval_equal(func_parse("abs(5px)"), '"5px"', {}, fourth)}
      function second() { eval_equal(func_parse("abs($value: 5px)"), '"5px"', {}, third) }
      eval_err(func_parse('abs(#aaa)'), "$value: #aaaaaa is not a number", {}, second);
    });

    it('test_mix_tests_types', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L799-L803
      // v3.2.10

      function c() {eval_err(func_parse('mix(\\"foo\\", #f00, 10%)'), "$color-1: \"foo\" is not a color", {}, done)}
      function b() {eval_err(func_parse('mix(#f00, \\"foo\\", 10%)'), "$color-2: \"foo\" is not a color", {}, c)}
      eval_err(func_parse('mix(#f00, #baf, \\"foo\\")'), '$weight: "foo" is not a number', {}, b);
    });

    it('test_comparable', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L913-L920
      // v3.2.10

      function f() { eval_equal(func_parse("comparable($number-1: 100px, $number-2: 3em)"), '"false"', {}, done) }
      function e() {eval_equal(func_parse("comparable(2px, 1px)"), '"true"', {}, f)}
      function d() { eval_equal(func_parse("comparable(10cm, 3mm)"), '"true"', {}, e)}
      function c() { eval_equal(func_parse("comparable(100px, 3em)"), '"false"', {}, d) }
      function b() {eval_err(func_parse('comparable(#f00, 1px)'), "$number-1: #ff0000 is not a number", {}, c);}
      eval_err(func_parse('comparable(1px, #f00)'), "$number-2: #ff0000 is not a number", {}, b);
    });

  }

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_rgba_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
      // v3.2.10

      function seventh() {eval_err(func_parse('rgba(1, 1, 1, 1.2)'), "Alpha channel 1.2 must be between 0 and 1", {}, done)};
      function sixth() {eval_err(func_parse('rgba(1, 1, 1, -0.2)'), "Alpha channel -0.2 must be between 0 and 1", {}, seventh)};
      function fifth() {eval_err(func_parse('rgba(-1, 1, 1, 0.3)'), "$red: Color value -1 must be between 0 and 255", {}, sixth)};
      function fourth() {eval_err(func_parse('rgba(1, 256, 257, 0.3)'), "$green: Color value 256 must be between 0 and 255", {}, fifth)};
      function third() {eval_err(func_parse('rgba(1, 1, 256, 0.3)'), "$blue: Color value 256 must be between 0 and 255", {}, fourth)};
      function second() {eval_err(func_parse('rgba(1, 256, 1, 0.3)'), "$green: Color value 256 must be between 0 and 255", {}, third)};
      eval_err(func_parse('rgba(256, 1, 1, 0.3)'), "$red: Color value 256 must be between 0 and 255", {}, second);
    });

    it('test_rgb_test_percent_bounds', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L208-L215
      // v3.2.10

      function third() {eval_err(func_parse('rgb(0, 0, 101%)'), "$blue: Color value 101% must be between 0% and 100%", {}, done)};
      function second() {eval_err(func_parse('rgb(0, -0.1%, 0)'), "$green: Color value -0.1% must be between 0% and 100%", {}, third)};
      eval_err(func_parse('rgb(100.1%, 0, 0)'), "$red: Color value 100.1% must be between 0% and 100%", {}, second);
    });

    it('test_rgba_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L230-L245
      // v3.2.10

      function seventh() {eval_err(func_parse('rgba(1, 1, 1, 1.2)'), "Alpha channel 1.2 must be between 0 and 1", {}, done)};
      function sixth() {eval_err(func_parse('rgba(1, 1, 1, -0.2)'), "Alpha channel -0.2 must be between 0 and 1", {}, seventh)};
      function fifth() {eval_err(func_parse('rgba(-1, 1, 1, 0.3)'), "$red: Color value -1 must be between 0 and 255", {}, sixth)};
      function fourth() {eval_err(func_parse('rgba(1, 256, 257, 0.3)'), "$green: Color value 256 must be between 0 and 255", {}, fifth)};
      function third() {eval_err(func_parse('rgba(1, 1, 256, 0.3)'), "$blue: Color value 256 must be between 0 and 255", {}, fourth)};
      function second() {eval_err(func_parse('rgba(1, 256, 1, 0.3)'), "$green: Color value 256 must be between 0 and 255", {}, third)};
      eval_err(func_parse('rgba(256, 1, 1, 0.3)'), "$red: Color value 256 must be between 0 and 255", {}, second);
    });

    it('test_rgb_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L171-L182
      // v3.2.10

      function fifth() {eval_err(func_parse('rgb(256, 1, 1)'), "$red: Color value 256 must be between 0 and 255", {}, done)};
      function fourth() {eval_err(func_parse('rgb(1, 256, 1)'), "$green: Color value 256 must be between 0 and 255", {}, fifth)};
      function third() {eval_err(func_parse('rgb(1, 1, 256)'), "$blue: Color value 256 must be between 0 and 255", {}, fourth)};
      function second() {eval_err(func_parse('rgb(1, 256, 257)'), "$green: Color value 256 must be between 0 and 255", {}, third)};
      eval_err(func_parse('rgb(-1, 1, 1)'), "$red: Color value -1 must be between 0 and 255", {}, second);
    });

  }

}

/*****************************************************************************************************
 * v3.2.11
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.11")) {
  it('test_loud_comment_in_compressed_mode', function(done) {
    // https://github.com/sass/sass/blob/862a3234878fe7bc374ea0d85966dfd00f4175d0/test/sass/extend_test.rb#L1175-L1208
    // v3.2.11

    function sixth() {
      var css = "a#bar, a#bar:after {\n  a: b; }\n";
      var scss = "%x#bar {a: b}\n%y, %y:after {@extend %x}\na {@extend %y}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }

    function fifth() {
      var css = "a#bar, a#bar:before {\n  a: b; }\n";
      var scss = "%x#bar {a: b}\n%y, %y:before {@extend %x}\na {@extend %y}\n";
      equal(scss, css, {syntax: 'scss'}, sixth)
    }

    function fourth() {
      var css = "a#bar, a#bar:first-letter {\n  a: b; }\n";
      var scss = "%x#bar {a: b}\n%y, %y:first-letter {@extend %x}\na {@extend %y}\n";
      equal(scss, css, {syntax: 'scss'}, fifth)
    }

    function third() {
      var css = "a#bar, a#bar:first-line {\n  a: b; }\n";
      var scss = "%x#bar {a: b}\n%y, %y:first-line {@extend %x}\na {@extend %y}\n";
      equal(scss, css, {syntax: 'scss'}, fourth)
    }

    function second() {
      var css = "a#bar {\n  a: b; }\n";
      var scss = "%x#bar {a: b}\n%y, %y:fblthp {@extend %x}\na {@extend %y}\n";
      equal(scss, css, {syntax: 'scss'}, third)
    }

    var css = "a#bar, a#bar::fblthp {\n  a: b; }\n";
    var scss = "%x#bar {a: b} // Add an id to make the results have high specificity\n%y, %y::fblthp {@extend %x}\na {@extend %y}\n";
    equal(scss, css, {syntax: 'scss'}, second)
  })

  it('test_counters', function(done) {
    // https://github.com/sass/sass/blob/862a3234878fe7bc374ea0d85966dfd00f4175d0/test/sass/functions_test.rb#L1049-L1053
    // v3.2.11
    function third() { eval_equal(func_parse("counters(foo)"), '"counters(foo)"', {}, done) }
    function second() { eval_equal(func_parse("counters(item, \\\".\\\")"), '"counters(item,\\\".\\\")"', {}, third) }
    eval_equal(func_parse("counters(item,\\\".\\\")"), '"counters(item,\\\".\\\")"', {}, second)
  });
}

/*****************************************************************************************************
 * v3.2.12
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.12")) {

  it('test_counters', function(done) {
    // https://github.com/sass/sass/blob/6d00b417184ee8a7f7c1e5de311942e141256ac4/test/sass/extend_test.rb#L1210-L1229
    // 3.2.12

    var css = ".test-case, .test-case:active {\n  color: red; }\n\n.test-case:hover {\n  color: green; }\n";
    var scss = "%default-color {color: red}\n%alt-color {color: green}\n\n%default-style {\n  @extend %default-color;\n  &:hover {@extend %alt-color}\n  &:active {@extend %default-color}\n}\n\n.test-case {@extend %default-style}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_extend_cross_branch_redundancy_elimination', function(done) {
    // https://github.com/sass/sass/blob/6d00b417184ee8a7f7c1e5de311942e141256ac4/test/sass/extend_test.rb#L1419-L1438
    // v3.2.12

    function second() {
      var css = ".e .a .c .d, .a .c .e .d, .e .b .c .a .d, .b .c .a .e .d {\n  a: b; }\n";
      var scss = ".e %z {a: b}\n%x .c %y {@extend %z}\n.a, .b {@extend %x}\n.a .d {@extend %y}\n";
      equal(scss, css,  {syntax: 'scss'}, done)
    }

    var css = ".a .c .d, .b .c .a .d {\n  a: b; }\n";
    var scss = "%x .c %y {a: b}\n.a, .b {@extend %x}\n.a .d {@extend %y}\n";
    equal(scss, css,  {syntax: 'scss'}, second)
  });
}

/*****************************************************************************************************
 * v3.2.13
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.13")) {

  it('test_user_defined_function_forces_division', function(done) {
    // https://github.com/sass/sass/blob/d654bac5244e4a85bb5e84822a6e05f011fdb801/test/sass/script_test.rb#L513-L535
    // 3.2.12

    function second() {
      var css = "a {\n  b: 10px; }\n";
      var sass = "@function foo()\n  @return 20px\n\na\n  b: foo() / 2\n";
      equal(sass, css, {syntax: 'sass'}, done)
    }


    var css = "a {\n  b: 10px; }\n";
    var sass = "@function foo()\n  @return 20px\n\na\n  b: (foo() / 2)\n";
    equal(sass, css, {syntax: 'sass'}, second)
  })

  it('test_url_import_directive_with_media', function(done) {
    // https://github.com/sass/sass/blob/d654bac5244e4a85bb5e84822a6e05f011fdb801/test/sass/scss/css_test.rb#L515-L520
    // v3.2.13

    function fourth() {parses('@import url("foo.css") screen, only print, screen and (foo: 0);', {syntax: 'scss'}, done)}
    function third() {parses('@import url("foo.css") screen, print and (foo: 0);', {syntax: 'scss'}, fourth)}
    function second() {parses('@import url("foo.css") screen, print;', {syntax: 'scss'}, third)}

    parses('@import url("foo.css") screen;', {syntax: 'scss'}, second)
  });

  it('test_css_string_import_directive_with_media', function(done) {
    // https://github.com/sass/sass/blob/d654bac5244e4a85bb5e84822a6e05f011fdb801/test/sass/scss/scss_test.rb#L273-L278
    // v3.2.13

    function fourth() {parses('@import "foo.css" screen, only print, screen and (foo: 0);', {syntax: 'scss'}, done)}
    function third() {parses('@import "foo.css" screen, print and (foo: 0);', {syntax: 'scss'}, fourth)}
    function second() {parses('@import "foo.css" screen, print;', {syntax: 'scss'}, third)}

    parses('@import "foo.css" screen;', {syntax: 'scss'}, second)
  });

  it('test_css_url_import_directive_with_media', function(done) {
    // https://github.com/sass/sass/blob/d654bac5244e4a85bb5e84822a6e05f011fdb801/test/sass/scss/scss_test.rb#L280-L285
    // v3.2.13

    function fourth() {parses('@import url("foo.css") screen, only print, screen and (foo: 0);', {syntax: 'scss'}, done)}
    function third() {parses('@import url("foo.css") screen, print and (foo: 0);', {syntax: 'scss'}, fourth)}
    function second() {parses('@import url("foo.css") screen, print;', {syntax: 'scss'}, third)}

    parses('@import url("foo.css") screen;', {syntax: 'scss'}, second)
  });
}

/*****************************************************************************************************
 * v3.2.14
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.14")) {

  it('test_funcall_has_higher_precedence_than_true_false_null', function(done) {
    // https://github.com/sass/sass/blob/0459ca19f3556bc317bee0f5085f27f619e894ed/test/sass/script_test.rb#L544-L549
    // 3.2.14

    function d() { eval_equal(func_parse("teal(12)"), '"teal(12)"', {}, done) }
    function c() { eval_equal(func_parse("tealbang(12)"), '"tealbang(12)"', {}, d) }
    function b() { eval_equal(func_parse("teal-bang(12)"), '"teal-bang(12)"', {}, c) }
    eval_equal(func_parse("teal\\\\+bang(12)"), '"teal\\\\+bang(12)"', {}, b)
  })

  it('test_css_import_doesnt_move_through_comments', function(done) {
    // https://github.com/sass/sass/blob/0459ca19f3556bc317bee0f5085f27f619e894ed/test/sass/scss/scss_test.rb#L325-L338
    // 3.2.14

    var css = "/* Comment 1 */\n@import url(\"foo.css\");\n/* Comment 2 */\n@import url(\"bar.css\");\n";
    var scss = "/* Comment 1 */\n@import url(\"foo.css\");\n\n/* Comment 2 */\n@import url(\"bar.css\");\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_css_import_movement_stops_at_comments', function(done) {
    // https://github.com/sass/sass/blob/0459ca19f3556bc317bee0f5085f27f619e894ed/test/sass/scss/scss_test.rb#L340-L361
    // 3.2.14

    var css = "/* Comment 1 */\n@import url(\"foo.css\");\n/* Comment 2 */\n@import url(\"bar.css\");\n.foo {\n  a: b; }\n\n/* Comment 3 */\n";
    var scss = "/* Comment 1 */\n@import url(\"foo.css\");\n\n/* Comment 2 */\n\n.foo {a: b}\n\n/* Comment 3 */\n@import url(\"bar.css\");\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })
}

/*****************************************************************************************************
 * v3.2.15
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.2.15")) {
  it('test_parent_ref_with_newline', function(done) {
    // https://github.com/sass/sass/blob/85b821a179fa17785c0eea3b164e9382d62eda98/test/sass/scss/scss_test.rb#L1766-L1775
    // 3.2.15

    var css = "a.c\n, b.c {\n  x: y; }\n";
    var scss = "a\n, b {&.c {x: y}}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })
}

/*****************************************************************************************************
 * v3.3.0
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.0")) {
  it('test_recursive_mixin', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L470-L489
    // 3.3.0

    var css = ".foo .bar .baz {\n  color: blue; }\n.foo .bar .qux {\n  color: red; }\n.foo .zap {\n  color: green; }\n";
    var sass = "@mixin map-to-rule($map-or-color)\n  @if type-of($map-or-color) == map\n    @each $key, $value in $map-or-color\n      .#{$key}\n        @include map-to-rule($value)\n  @else\n    color: $map-or-color\n\n@include map-to-rule((foo: (bar: (baz: blue, qux: red), zap: green)))\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_user_defined_function_variable_scope', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1367-L1376
    // v3.3.0

    err_message("bar\n  -no-op: set-a-variable(variable, 5)\n  a: $variable\n", "Undefined variable: \"$variable\".", {syntax: 'sass'}, done)
  });

  it('test_user_defined_function_cannot_read_local_variable', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1391-L1403
    // v3.3.0

    function second() {
      var css = "bar {\n  global: 0;\n  local: undefined; }\n";
      var sass = "$global: 0\nbar\n  $local: 10\n  global: get-a-variable(global)\n  local: get-a-variable(local)\n";
      equal(sass, css, {syntax: 'sass'}, done)
    }

    var pre = "!function(n){Opal.defn(n.$$scope.Functions,'$get_a_variable',function(e){var $;return($=this.$environment().$var(e.$value()))!==!1&&$!==Opal.nil&&null!=$?$:n.$$scope.Value.$$scope.String.$new('undefined')},1)}(Opal.Sass.$$scope.Script);"

      sassBuilder({eval: pre, options: {}}, second)
  });

  it('test_while', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1497-L1520
    // v3.3.0

    var css = "a-5 {\n  blooble: gloop; }\n\na-4 {\n  blooble: gloop; }\n\na-3 {\n  blooble: gloop; }\n\na-2 {\n  blooble: gloop; }\n\na-1 {\n  blooble: gloop; }\n";
    var scss = "$a: 5\n@while $a != 0\n  a-#{$a}\n    blooble: gloop\n  $a: $a - 1 !global\n";
    equal(scss, css, {syntax: 'sass'}, done)
  })

  it('test_destructuring_each', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1585-L1604
    // v3.3.0

    var css = "a {\n  foo: 1px;\n  bar: 2px;\n  baz: 3px; }\n\nc {\n  foo: \"Value is bar\";\n  bar: \"Value is baz\";\n  bang: \"Value is \"; }\n";
    var scss = "a\n  @each $name, $number in (foo: 1px, bar: 2px, baz: 3px)\n    \#{$name}: $number\nc\n  @each $key, $value in (foo bar) (bar, baz) bang\n    \#{$key}: \"Value is \#{$value}\"\n";
    equal(scss, css, {syntax: 'sass'}, done)
  })

  it('test_variable_reassignment', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1606-L1618
    // v3.3.0

    var css = "a {\n  b: 1;\n  c: 2; }\n";
    var scss = "a\n  $a: 1\n  b: $a\n  $a: 2\n  c: $a\n";
    equal(scss, css, {syntax: 'sass'}, done)
  })

  it('test_hyphen_underscore_insensitive_variables', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1645-L1661
    // v3.3.0

    var css = "d {\n  e: 13;\n  f: foobar; }\n";
    var sass = "$var-hyphen: 12\n$var_under: foo\n\n$var_hyphen: 1 + $var_hyphen\n$var-under: $var-under + bar\n\nd\n  e: $var-hyphen\n  f: $var_under\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_loud_comment_is_evaluated', function(done) {
    //https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1810-L1816
    // v3.3.0

    var css = "/*! Hue: 327.21649deg */\n";
    var sass = "/*! Hue: #{hue(#f836a0)}\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_double_media_bubbling_with_surrounding_rules', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L2221-L2249
    // v3.3.0

    var css = "@media (min-width: 0) {\n  a {\n    a: a; }\n\n  b {\n    before: b;\n    after: b; } }\n  @media (min-width: 0) and (max-width: 5000px) {\n    b {\n      x: x; } }\n\n@media (min-width: 0) {\n  c {\n    c: c; } }\n";
    var sass = "@media (min-width: 0)\n  a\n    a: a\n  b\n    before: b\n    @media (max-width: 5000px)\n      x: x\n    after: b\n  c\n    c: c\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_nested_media_around_properties-3', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L2269-L2295
    // v3.3.0

    var css = ".outside {\n  color: red;\n  background: blue; }\n  @media print {\n    .outside {\n      color: black; } }\n  @media print and (a: b) {\n    .outside .inside {\n      border: 1px solid black; } }\n\n  .outside .middle {\n    display: block; }\n";
    var scss = ".outside\n  color: red\n  @media print\n    color: black\n    .inside\n      @media (a: b)\n        border: 1px solid black\n  background: blue\n  .middle\n    display: block\n";
    equal(scss, css, {syntax: 'sass'}, done)
  });

  it('test_at_root', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L2418-L2428
    // v3.3.0

    var css = ".bar {\n  a: b; }\n";
    var scss = ".foo\n  @at-root\n    .bar\n      a: b\n";
    equal(scss, css, {syntax: 'sass'}, done)
  });

  it('test_at_root_with_selector', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L2430-L2439
    // v3.3.0

    var css = ".bar {\n  a: b; }\n";
    var scss = ".foo\n  @at-root .bar\n    a: b\n";
    equal(scss, css, {syntax: 'sass'}, done)
  });

  it('test_at_root_with_query', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L2441-L2452
    // v3.3.0

    var css = ".foo .bar {\n  a: b; }\n";
    var scss = ".foo\n  @media screen\n    @at-root (without: media)\n      .bar\n        a: b\n";
    equal(scss, css, {syntax: 'sass'}, done)
  });

  it('test_variable_assignment_with_global', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L2454-L2471
    // v3.3.0

    function third() {
      sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined)
        var css = ".foo {\n  a: x; }\n\n.bar {\n  b: x; }\n";
      var scss = "$var: 1\n\n.foo\n  $var: x !global\n  a: $var\n\n.bar\n  b: $var\n";
      equal(scss, css, {syntax: 'sass'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_list_separator_with_arg_list', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L2475-L2486
    // v3.3.0

    var css = ".test {\n  separator: comma; }\n";
    var scss = "@mixin arglist-test($args...)\n  separator: list-separator($args)\n\n.test\n  @include arglist-test(this, is, comma, separated)\n";
    equal(scss, css, {syntax: 'sass'}, done)
  });

  it('test_changing_precision', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L3053-L3069
    // v3.3.0

    function third() {
      sassBuilder({eval: "Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number[\"$precision=\"](old_precision);Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$precision().valueOf()===old_precision", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)
          done();
      })
    }

    function second() {
      var source = "div\n  maximum : 1.00000001\n  too-much: 1.000000001\n";
      // technically until v3.4.21 the test is 1.0, not 1. But since JS doesn't have an explicit float type, we can't maintain the .0 and remain a number. So we cheat a tiny bit and change the expected value to 1
      var expected = "div {\n  maximum: 1.00000001;\n  too-much: 1; }\n";

      equal(source, expected, {syntax: 'sass'}, third)
    }

    sassBuilder({eval: "old_precision=Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$precision();Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number[\"$precision=\"](8)", options: {syntax: 'sass'}}, function(result) {
      expect(result.err).to.be(undefined);
      second();
    })
  });

  it('test_mixin_with_args_and_varargs_passed_no_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L3261-L3279
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3; }\n";
    var scss = "@mixin three-or-more-args($a, $b, $c, $rest...) {\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n.foo {\n  @include three-or-more-args($a: 1, $b: 2, $c: 3);\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_debug_inspects_sass_objects', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L3281-L3288
    // v3.3.0

    function fifth() {
      sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('test_debug_inspects_sass_objects_inline.scss:1 DEBUG: (a: 1, b: 2)\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)

          done();
      })
    }

    function fourth(result) {
      var css = "$map: (a: 1, b: 2); @debug $map";
      sassBuilder({css: css, options: {syntax: 'scss', filename: 'test_debug_inspects_sass_objects_inline.scss'}}, fifth)
    }

    function third() {
      sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('test_debug_inspects_sass_objects_inline.sass:1 DEBUG: (a: 1, b: 2)\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)

          fourth();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined)
        var css = "@debug (a: 1, b: 2)";
      sassBuilder({css: css, options: {syntax: 'sass', filename: 'test_debug_inspects_sass_objects_inline.sass'}}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_default_arg_before_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L3290-L3316
    // v3.3.0

    var css = ".foo-positional {\n  a: 1;\n  b: 2;\n  positional-arguments: 3, 4;\n  keyword-arguments: (); }\n\n.foo-keywords {\n  a: true;\n  positional-arguments: ();\n  keyword-arguments: (c: c, d: d); }\n";
    var scss = "@mixin foo($a: true, $b: null, $arguments...) {\n  a: $a;\n  b: $b;\n  positional-arguments: inspect($arguments);\n  keyword-arguments: inspect(keywords($arguments));\n}\n.foo-positional {\n  @include foo(1, 2, 3, 4);\n}\n.foo-keywords {\n  @include foo($c: c, $d: d);\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_id_unification-3', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L152-L159
    // v3.3.0

    function third() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_unification('.foo#baz', '#bar {@extend .foo}', {
          filename: filename + '.' + syntax,
          syntax: syntax
        }, cb, true)}, '#bar', '.foo', 'failed_to_unify', 2, 'test_id_unification_inline', 'scss', done)
    }

    function second() {
      unification('.foo#baz', '#baz {@extend .foo}', '#baz', {syntax: 'scss'}, third)
    }

    unification('.foo.bar', '#baz {@extend .foo}', '.foo.bar, .bar#baz', {syntax: 'scss'}, second)
  });

  it('test_universal_unification_with_namespaced_universal_target', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L178-L187
    // v3.3.0

    function fourth() {unification('ns|*.foo', 'ns|* {@extend .foo}', 'ns|*', {syntax: 'scss'}, done) }

    function third() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_unification('ns1|*.foo', 'ns2|* {@extend .foo}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
      }, 'ns2|\\*', '.foo', 'failed_to_unify', 2, 'test_universal_unification_with_namespaced_universal_target_inline', 'scss', fourth)
    }
    function second() {unification('ns|*.foo', '*|* {@extend .foo}', 'ns|*', {syntax: 'scss'}, third) }
    unification('ns|*.foo', '* {@extend .foo}', 'ns|*', {syntax: 'scss'}, third)
  });

  it('test_universal_unification_with_namespaced_element_target', function(done) {
    // https://github.com/sass/sass/blob/40b3181d8dafdb5feada33d0792150eda6a1e813/test/sass/extend_test.rb#L198-L207
    // v3.3.0

    function fourth() { unification('ns|a.foo', 'ns|* {@extend .foo}', 'ns|a', {syntax: 'scss'}, done) }

    function third() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_unification('ns1|a.foo', 'ns2|* {@extend .foo}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
      }, 'ns2|\\*', '.foo', 'failed_to_unify', 2, 'test_universal_unification_with_namespaced_element_target_inline', 'scss', fourth)
    }

    function second() { unification('ns|a.foo', '*|* {@extend .foo}', 'ns|a', {syntax: 'scss'}, third) }
    unification('ns|a.foo', '* {@extend .foo}', 'ns|a', {syntax: 'scss'}, third)
  });

  it('test_element_unification_with_namespaced_element_target', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L249-L258
    // v3.3.0

    function fourth() { unification('ns|a.foo', 'ns|a {@extend .foo}', 'ns|a', {syntax: 'scss'}, done) }

    function third() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_unification('ns1|a.foo', 'ns2|a {@extend .foo}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
      },'ns2|a', '.foo', 'failed_to_unify', 2, 'test_element_unification_with_namespaced_element_target_inline', 'scss', fourth)
    }
    function second() { unification('ns|a.foo', '*|a {@extend .foo}', 'ns|a', {syntax: 'scss'}, third) }
    unification('ns|a.foo', 'a {@extend .foo}', 'ns|a', {syntax: 'scss'}, third)
  });

  it('test_pseudo_unification', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L268-L278
    // v3.3.0

    function fourth() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_unification('::foo.baz', '::bar {@extend .baz}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
      }, '::bar', '.baz', 'failed_to_unify', 2, 'test_pseudo_unification_inline', 'scss', done)
    }

    function third() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_unification('::foo.baz', '::foo(2n+1) {@extend .baz}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
      }, '::foo\\(2n\\+1\\)', '.baz', 'failed_to_unify', 2, 'test_pseudo_unification_inline', 'scss', fourth)
    }
    function second() { unification(':foo.baz', '::foo {@extend .baz}', ':foo.baz, :foo::foo', {syntax: 'scss'}, third) }
    unification(':foo.baz', ':foo(2n+1) {@extend .baz}', ':foo.baz, :foo:foo(2n+1)', {syntax: 'scss'}, second)
  });

  it('test_long_extendee_requires_all_selectors', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L349-L353
    // v3.3.0

    extend_doesnt_match(function (filename, syntax, cb) {
      render_extends('.foo', '.baz {@extend .foo.bar}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)}
      , '.baz', '.foo.bar', 'not_found', 2, 'test_long_extendee_requires_all_selectors_inline', 'scss', done)
  });

  it('test_long_extender_aborts_unification', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L373-L376
    // v3.3.0

    function second() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_extends('a.foo#bar', '.bang#baz {@extend .foo}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
      }, '.bang#baz', '.foo', 'failed_to_unify', 2, 'test_long_extender_aborts_unification_inline', 'scss', done)
    }

    extend_doesnt_match(function (filename, syntax, cb) {
      render_extends('a.foo#bar', 'h1.baz {@extend .foo}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
    }, 'h1.baz', '.foo', 'failed_to_unify', 2, 'test_long_extender_aborts_unification_inline', 'scss', second)
  });

  it('test_nested_extender_aborts_unification', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L393-L397
    // v3.3.0

    extend_doesnt_match(function (filename, syntax, cb) {
      render_extends('baz.foo', 'foo bar {@extend .foo}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)
    }, 'foo bar', '.foo', 'failed_to_unify', 2, 'test_nested_extender_aborts_unification_inline', 'scss', done)
  });

  it('test_nested_extender_with_early_child_selector', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L461-L466
    // v3.3.0

    function second() {
      var css = ".bap > .bip .foo, .bap > .bip .bap > .grip .bar, .bap > .grip .bap > .bip .bar {\n  a: b; }\n";
      var scss = ".bap > .bip .foo {a: b}\n.bap > .grip .bar {@extend .foo}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }

    var css = ".bip > .bap .foo, .bip > .bap .grip > .bap .bar, .grip > .bap .bip > .bap .bar {\n  a: b; }\n";
    var scss = ".bip > .bap .foo {a: b}\n.grip > .bap .bar {@extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, second)
  })

  it('test_placeholder_selector_as_modifier', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L811-L819
    // v3.3.0

    var css = "a.baz.bar {\n  color: blue; }\n"
      var scss = "a%foo.baz {color: blue}\n.bar {@extend %foo}\ndiv {@extend %foo}\n"

      extend_doesnt_match(function (filename, syntax, cb) {
        sassBuilder({css: scss, options: {filename: filename + '.' + syntax, syntax: syntax}}, function(result) {
          expect(result.err).to.not.be(undefined)
            cb(result)
        }, true)
      }, 'div', '%foo', 'failed_to_unify', 3, 'test_placeholder_selector_as_modifier_inline', 'scss', done)
  })

  it('test_extend_out_of_media', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L843-L854
    // v3.3.0

    err_message(".foo {a: b}\n@media screen {\n  .bar {@extend .foo}\n}\n", "You may not @extend an outer selector from within @media.\nYou may only @extend selectors within the same directive.\nFrom \"@extend .foo\" on line 3 of test_extend_out_of_media_inline.scss.\n", {syntax: 'scss', filename: 'test_extend_out_of_media_inline.scss'}, done)

  })

  it('test_extend_out_of_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L856-L867
    // v3.3.0

    err_message(".foo {a: b}\n@flooblehoof {\n  .bar {@extend .foo}\n}\n", "You may not @extend an outer selector from within @flooblehoof.\nYou may only @extend selectors within the same directive.\nFrom \"@extend .foo\" on line 3 of test_extend_out_of_unknown_directive_inline.scss.\n", {syntax: 'scss', filename: 'test_extend_out_of_unknown_directive_inline.scss'}, done)
  })

  it('test_extend_out_of_nested_directives', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L869-L882
    // v3.3.0

    err_message("@media screen {\n  .foo {a: b}\n  @flooblehoof {\n    .bar {@extend .foo}\n  }\n}\n", "You may not @extend an outer selector from within @flooblehoof.\nYou may only @extend selectors within the same directive.\nFrom \"@extend .foo\" on line 4 of test_extend_out_of_nested_directives_inline.scss.\n", {syntax: 'scss', filename: 'test_extend_out_of_nested_directives_inline.scss'}, done)
  })

  it('test_extend_within_and_without_media', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L963-L975
    // v3.3.0

    err_message(".foo {a: b}\n@media screen {\n  .foo {c: d}\n  .bar {@extend .foo}\n}\n", "You may not @extend an outer selector from within @media.\nYou may only @extend selectors within the same directive.\nFrom \"@extend .foo\" on line 4 of test_extend_within_and_without_media_inline.scss.\n", {syntax: 'scss', filename: 'test_extend_within_and_without_media_inline.scss'}, done)
  })

  it('test_extend_within_and_without_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L977-L989
    // v3.3.0

    err_message(".foo {a: b}\n@flooblehoof {\n  .foo {c: d}\n  .bar {@extend .foo}\n}\n" ,"You may not @extend an outer selector from within @flooblehoof.\nYou may only @extend selectors within the same directive.\nFrom \"@extend .foo\" on line 4 of test_extend_within_and_without_unknown_directive_inline.scss.\n", {syntax: 'scss', filename: 'test_extend_within_and_without_unknown_directive_inline.scss'}, done)
  })

  it('test_extend_within_and_without_nested_directives', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L991-L1005
    // v3.3.0

    err_message("@media screen {\n  .foo {a: b}\n  @flooblehoof {\n    .foo {c: d}\n    .bar {@extend .foo}\n  }\n}\n", "You may not @extend an outer selector from within @flooblehoof.\nYou may only @extend selectors within the same directive.\nFrom \"@extend .foo\" on line 5 of test_extend_within_and_without_nested_directives_inline.scss.\n", {syntax: 'scss', filename: 'test_extend_within_and_without_nested_directives_inline.scss'}, done)
  })

  it('test_extend_warns_when_extendee_doesnt_exist', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L1065-L1073
    // v3.3.0

    err_message(".foo {@extend .bar}\n", "\".foo\" failed to @extend \".bar\".\nThe selector \".bar\" was not found.\nUse \"@extend .bar !optional\" if the extend should be able to fail.\n", {syntax: 'scss'}, done)
  })

  it('test_optional_extend_succeeds_when_extendee_doesnt_exist', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L1100-L1104
    // v3.3.0

    var css = ""
      var scss = ".foo {@extend .bar !optional}";
    equal(scss, css,  {syntax: 'scss'}, done)
  })

  it('test_optional_extend_succeeds_when_extension_fails', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L1106-L1114
    // v3.3.0

    var css = "a.bar {\n  a: b; }\n";
    var scss = "a.bar {a: b}\nb.foo {@extend .bar !optional}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  })

  it('test_extend_parent_selector_suffix', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L1118-L1126
    // v3.3.0

    var css = ".a-b, .c {\n  x: y; }\n";
    var scss = ".a {&-b {x: y}}\n.c {@extend .a-b}\n";
    equal(scss, css,  {syntax: 'scss'}, done)
  })

  it('test_only_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1435-L1437
    // v3.3.0

    eval_equal('!function($){function r($,r){return"number"==typeof $&&"number"==typeof r?$+r:$["$+"](r)}{var a,n,s=a=$.$$scope.Functions;s.$$proto,s.$$scope}Opal.defn(s,"$only_var_args",n=function(){var a,n,s,e,t=this,o=$.$$scope.Value.$$scope,l=arguments.length,p=l-0;0>p&&(p=0),e=Array(p);for(var u=0;l>u;u++)e[u-0]=arguments[u];return o.String.$new(r(r("only-var-args(",(a=(n=e).$map,a.$$p=(s=function($){s.$$s||this;return null==$&&($=nil),$.$plus(o.Number.$new(1)).$to_s()},s.$$s=t,s.$$arity=1,s),a).call(n).$join(", ")),")"))},n.$$arity=-1),s.$declare("only_var_args",[],Opal.hash2(["var_args"],{var_args:!0}))}(Opal.Sass.$$scope.Script);' + func_parse("only-var-args(1px, 2px, 3px)"), '"only-var-args(2px, 3px, 4px)"', {}, done)
  });

  it('test_percentage', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L119-L124
    // v3.3.0

    function fourth() {eval_equal(func_parse("percentage(.5)"), '"50%"', {}, done)}
    function third() {eval_equal(func_parse("percentage(1)"), '"100%"', {}, fourth)}
    function second() { eval_equal(func_parse("percentage($number: 0.5)"), '"50%"', {}, third) }
    eval_equal(func_parse("percentage(25px / 100px)"), '"25%"', {}, second)
  });

  it('test_percentage_checks_types', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L132-L136
    // v3.3.0

    function third() {eval_err(func_parse('percentage(\\"string\\")'), "$number: \"string\" is not a unitless number", {}, done)};
    function second() {eval_err(func_parse("percentage(#ccc)"), "$number: #cccccc is not a unitless number", {}, third)};
    eval_err(func_parse("percentage(25px)"), "$number: 25px is not a unitless number", {}, second);
  });

  it('test_round', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L138-L143
    // v3.3.0

    function fifth() {eval_equal(func_parse("round(4.8)"), '"5"', {}, done)}
    function fourth() {eval_equal(func_parse("round(4.8px)"), '"5px"', {}, fifth)}
    function third() {eval_equal(func_parse("round(5.49px)"), '"5px"', {}, fourth)}
    eval_equal(func_parse("round($number: 5.49px)"), '"5px"', {}, third)
  });

  it('test_floor', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L155-L159
    // v3.3.0

    function fourth() {eval_equal(func_parse("floor(4.8)"), '"4"', {}, done)}
    function third() {eval_equal(func_parse("floor(4.8px)"), '"4px"', {}, fourth)}
    eval_equal(func_parse("floor($number: 4.8px)"), '"4px"', {}, third)
  });

  it('test_ceil', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L171-L175
    // v3.3.0

    function third() {eval_equal(func_parse("ceil(4.1)"), '"5"', {}, done)}
    function second() {eval_equal(func_parse("ceil(4.8px)"), '"5px"', {}, third)}
    eval_equal(func_parse("ceil($number: 4.8px)"), '"5px"', {}, second)
  });

  it('test_abs', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L187-L193
    // v3.3.0

    function sixth() {eval_equal(func_parse("abs(-5)"), '"5"', {}, done)}
    function fifth() {eval_equal(func_parse("abs(-5px)"), '"5px"', {}, sixth)}
    function fourth() {eval_equal(func_parse("abs(5)"), '"5"', {}, fifth)}
    function third() {eval_equal(func_parse("abs(5px)"), '"5px"', {}, fourth)}
    eval_equal(func_parse("abs($number: 5px)"), '"5px"', {}, third)
  });

  it('test_min', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L205-L213
    // v3.3.0

    function sixth() {eval_equal(func_parse("min(1, 2, 3)"), '"1"', {}, done)}
    function fifth() {eval_err(func_parse('min(#aaa)'), "#aaaaaa is not a number", {}, sixth)};
    function fourth() {eval_err(func_parse('min(3em, 4em, 1px)'), "Incompatible units: 'px' and 'em'.", {}, fifth)};
    function third() {eval_equal(func_parse("min(10cm, 6in)"), '"10cm"', {}, fourth)}
    function second() { eval_equal(func_parse("min(4em)"), '"4em"', {}, third) }
    eval_equal(func_parse("min(3px, 2px, 1)"), '"1"', {}, second)
  });

  it('test_transparentize', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L418-L427
    // v3.3.0

    function eigth() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.5), 0.2)"), '"rgba(0, 0, 0, 0.3)"', {}, done) }
    function seventh() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.2), 0.1)"), '"rgba(0, 0, 0, 0.1)"', {}, eigth) }
    function sixth() { eval_equal(func_parse("fade-out(rgba(0, 0, 0, 0.5), 0.3px)"), '"rgba(0, 0, 0, 0.2)"', {}, seventh) }
    function fifth() { eval_equal(func_parse("fade_out(rgba(0, 0, 0, 0.2), 0.2)"), '"transparent"', {}, sixth) }
    function fourth() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.2), 1)"), '"transparent"', {}, fifth) }
    function third() { eval_equal(func_parse("transparentize(rgba(0, 0, 0, 0.2), 0)"), '"rgba(0, 0, 0, 0.2)"', {}, fourth) }
    function second() { eval_equal(func_parse("transparentize($color: rgba(0, 0, 0, 0.2), $amount: 0)"), '"rgba(0, 0, 0, 0.2)"', {}, third) }
    eval_equal(func_parse("fade-out($color: rgba(0, 0, 0, 0.2), $amount: 0)"), '"rgba(0, 0, 0, 0.2)"', {}, second)
  });

  it('test_scale_color_argument_errors', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L728-L752
    // v3.3.0

    function h() {eval_err(func_parse('scale-color(blue, 10px)'), "10px is not a keyword argument", {}, done)}
    function g() {eval_err(func_parse('scale-color(blue, $hue: 80%)'), "Unknown argument $hue (80%)", {}, h)}
    function f() {eval_err(func_parse('scale-color(blue, $alpha: 0.5)'), "Expected $alpha to have a unit of % but got 0.5 for `scale-color'", {}, g)}
    function e() {eval_err(func_parse('scale-color(blue, $saturation: 80)'), "Expected $saturation to have a unit of % but got 80 for `scale-color'", {}, f)}
    function d() {eval_err(func_parse('scale-color(blue, $alpha: -101%)'), "$alpha: Amount -101% must be between -100% and 100%", {}, e)}
    function c() {eval_err(func_parse('scale-color(blue, $red: -101%)'), "$red: Amount -101% must be between -100% and 100%", {}, d)}
    function b() {eval_err(func_parse('scale-color(blue, $saturation: 101%)'), "$saturation: Amount 101% must be between -100% and 100%", {}, c)}
    eval_err(func_parse('scale-color(blue, $lightness: 10%, $red: 20%)'), "Cannot specify HSL and RGB values", {}, b);
  });

  it('test_mix_tests_types', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L869-L873
    // v3.3.0

    function c() {eval_err(func_parse('mix(\\"foo\\", #f00, 10%)'), "$color1: \"foo\" is not a color", {}, done)}
    function b() {eval_err(func_parse('mix(#f00, \\"foo\\", 10%)'), "$color2: \"foo\" is not a color", {}, c)}
    eval_err(func_parse('mix(#f00, #baf, \\"foo\\")'), '$weight: "foo" is not a number', {}, b);
  });

  it('test_str_length', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L937-L939
    // v3.3.0

    eval_equal(func_parse('str-length(foo)'), '"3"', {}, done);
  });

  it('test_str_length_requires_a_string', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L941-L943
    // v3.3.0

    eval_err(func_parse('str-length(#f00)'), '$string: #ff0000 is not a string for `str-length\'', {}, done);
  });

  it('test_str_insert', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L945-L953
    // v3.3.0

    function g() { eval_equal(func_parse("str-insert(abcd, X, -1)"), '"abcdX"', {}, done) }
    function f() { eval_equal(func_parse("str-insert(abcd, X, -4)"), '"aXbcd"', {}, g) }
    function e() { eval_equal(func_parse("str-insert(abcd, X, -100)"), '"Xabcd"', {}, f) }
    function d() { eval_equal(func_parse("str-insert(abcd, X, 100)"), '"abcdX"', {}, e) }
    function c() { eval_equal(func_parse("str-insert(abcd, X, 4)"), '"abcXd"', {}, d) }
    function b() { eval_equal(func_parse("str-insert(abcd, X, 1)"), '"Xabcd"', {}, c) }
    eval_equal(func_parse("str-insert(abcd, X, 0)"), '"Xabcd"', {}, b)
  });

  it('test_str_insert_maintains_quote_of_primary_string', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L955-L959
    // v3.3.0

    function c() { eval_equal(func_parse("str-insert(foo, \\\"X\\\", 1)"), '"Xfoo"', {}, done) }
    function b() { eval_equal(func_parse("str-insert(\\\"foo\\\", \\\"X\\\", 1)"), '"\\\"Xfoo\\\""', {}, c) }
    eval_equal(func_parse("str-insert(\\\"foo\\\", X, 1)"), '"\\\"Xfoo\\\""', {}, b)
  });

  it('test_str_insert_asserts_types', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L961-L966
    // v3.3.0

    function d() {eval_err(func_parse('str-insert(foo, X, 10px)'), "Expected $index to be unitless but got 10px for `str-insert'", {}, done)}
    function c() {eval_err(func_parse('str-insert(foo, X, #f00)'), "$index: #ff0000 is not a number for `str-insert'", {}, d)}
    function b() {eval_err(func_parse('str-insert(foo, #f00, 1)'), "$insert: #ff0000 is not a string for `str-insert'", {}, c)}
    eval_err(func_parse('str-insert(#f00, X, 1)'), "$string: #ff0000 is not a string for `str-insert'", {}, b);
  });

  it('test_str_index', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L968-L973
    // v3.3.0

    function d() { eval_equal(func_parse("str-index(abcd, c)"), '"3"', {}, done) }
    function c() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("str-index(abcd, X)", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).$inspect()', 'Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Null.$new().$inspect()', {}, d) }
    function b() { eval_equal(func_parse("str-index(abcd, ab)"), '"1"', {}, c) }
    eval_equal(func_parse("str-index(abcd, a)"), '"1"', {}, b)
  });

  it('test_str_index_asserts_types', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L975-L978
    // v3.3.0

    function b() {eval_err(func_parse('str-index(#f00, X)'), "$string: #ff0000 is not a string for `str-index'", {}, done)}
    eval_err(func_parse('str-index(asdf, #f00)'), "$substring: #ff0000 is not a string for `str-index'", {}, b);
  });

  it('test_to_lower_case', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L980-L984
    // v3.3.0

    function c() { eval_err(func_parse('to-lower-case(#f00)'), "$string: #ff0000 is not a string for `to-lower-case'", {}, done);}
    function b() { eval_equal(func_parse("to-lower-case(\\\"ABCD\\\")"), '"\\\"abcd\\\""', {}, c) }
    eval_equal(func_parse("to-lower-case(ABCD)"), '"abcd"', {}, b)
  });

  it('test_to_upper_case', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L986-L990
    // v3.3.0

    function c() { eval_err(func_parse('to-upper-case(#f00)'), "$string: #ff0000 is not a string for `to-upper-case'", {}, done);}
    function b() { eval_equal(func_parse("to-upper-case(\\\"abcd\\\")"), '"\\\"ABCD\\\""', {}, c) }
    eval_equal(func_parse("to-upper-case(abcd)"), '"ABCD"', {}, b)
  });

  it('test_str_slice', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L992-L1011
    // v3.3.0

    function r() { eval_err(func_parse('str-slice(abcd,2px,3)'), "Expected $start-at to be unitless but got 2px for `str-slice'", {}, done);}
    function q() { eval_err(func_parse('str-slice(abcd,2,3px)'), "Expected $end-at to be unitless but got 3px for `str-slice'", {}, r);}
    function p() { eval_err(func_parse('str-slice(abcd,2,#f00)'), "$end-at: #ff0000 is not a number for `str-slice'", {}, q);}
    function o() { eval_err(func_parse('str-slice(abcd,#f00,3)'), "$start-at: #ff0000 is not a number for `str-slice'", {}, p);}
    function n() { eval_err(func_parse('str-slice(#f00,2,3)'), "$string: #ff0000 is not a string for `str-slice'", {}, o);}

    function m() { eval_equal(func_parse("str-slice(abcd,-3,-2)"), '"bc"', {}, n)}
    function l() { eval_equal(func_parse("str-slice(abcd,3,-3)"), '""', {}, m)}
    function k() { eval_equal(func_parse("str-slice(abcd,2,-2)"), '"bc"', {}, l)}
    function j() { eval_equal(func_parse("str-slice(abcd,-2)"), '"cd"', {}, k)}
    function i() { eval_equal(func_parse("str-slice(abcd,2)"), '"bcd"', {}, j)}
    function h() { eval_equal(func_parse("str-slice(\\\"abcd\\\",2,3)"), '"\\\"bc\\\""', {}, i)}
    function g() { eval_equal(func_parse("str-slice(abcd,2,1)"), "''", {}, h)}
    function f() { eval_equal(func_parse("str-slice(abcd,1,100)"), '"abcd"', {}, g)}
    function e() { eval_equal(func_parse("str-slice(abcd,0,4)"), '"abcd"', {}, f)}
    function d() { eval_equal(func_parse("str-slice(abcd,1,4)"), '"abcd"', {}, e)}
    function c() { eval_equal(func_parse("str-slice(abcd,1,2)"), '"ab"', {}, d)}
    function b() { eval_equal(func_parse("str-slice(abcd,1,1)"), '"a"', {}, c)}
    eval_equal(func_parse("str-slice(abcd,2,3)"), '"bc"', {}, b)
  });

  it('test_user_defined_function_using_environment', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1022-L1025
    // v3.3.0

    eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('variable', Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new('The variable'));env.$var('variable').$value().valueOf()", '"The variable"', {}, done)
  });

  it('test_options_on_new_values_fails', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1027-L1034
    // v3.3.0

    eval_err("Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new('foo').$options()['$[]']('foo')", "The #options attribute is not set on this Sass::Script::Value::String.\n  This error is probably occurring because #to_s was called\n  on this value within a custom Sass function without first\n  setting the #options attribute.\n", {}, done);
  });

  it('test_type_of', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1044-L1047
    // v3.3.0

    function d() { eval_equal(func_parse("type-of((foo: bar))"), '"map"', {}, done) }
    function c() { eval_equal(func_parse("type-of(())"), '"list"', {}, d) }
    function b() { eval_equal(func_parse("type-of((1, 2, 3))"), '"list"', {}, c) }
    eval_equal(func_parse("type-of(1 2 3)"), '"list"', {}, b)
  });

  it('test_feature_exists', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1050-L1060
    // v3.3.0

    function r() { eval_err(func_parse('str-slice(abcd,2px,3)'), "Expected $start-at to be unitless but got 2px for `str-slice'", {}, done);}
    function q() { eval_err(func_parse('str-slice(abcd,2,3px)'), "Expected $end-at to be unitless but got 3px for `str-slice'", {}, r);}
    function p() { eval_err(func_parse('str-slice(abcd,2,#f00)'), "$end-at: #ff0000 is not a number for `str-slice'", {}, q);}
    function o() { eval_err(func_parse('str-slice(abcd,#f00,3)'), "$start-at: #ff0000 is not a number for `str-slice'", {}, p);}
    function n() { eval_err(func_parse('str-slice(#f00,2,3)'), "$string: #ff0000 is not a string for `str-slice'", {}, o);}

    function m() { eval_equal(func_parse("str-slice(abcd,-3,-2)"), '"bc"', {}, n)}
    function l() { eval_equal(func_parse("str-slice(abcd,3,-3)"), '""', {}, m)}
    function k() { eval_equal(func_parse("str-slice(abcd,2,-2)"), '"bc"', {}, l)}
    function j() { eval_equal(func_parse("str-slice(abcd,-2)"), '"cd"', {}, k)}
    function i() { eval_equal(func_parse("str-slice(abcd,2)"), '"bcd"', {}, j)}
    function h() { eval_equal(func_parse("str-slice(\\\"abcd\\\",2,3)"), '"\\\"bc\\\""', {}, i)}
    function g() { eval_equal(func_parse("str-slice(abcd,2,1)"), '""', {}, h)}
    function f() { eval_equal(func_parse("str-slice(abcd,1,100)"), '"abcd"', {}, g)}
    function e() { eval_equal(func_parse("str-slice(abcd,0,4)"), '"abcd"', {}, f)}
    function d() { eval_equal(func_parse("str-slice(abcd,1,4)"), '"abcd"', {}, e)}
    function c() { eval_equal(func_parse("str-slice(abcd,1,2)"), '"ab"', {}, d)}
    function b() { eval_equal(func_parse("str-slice(abcd,1,1)"), '"a"', {}, c)}
    eval_err("Opal.Sass.$add_feature('my-test-feature')", "Plugin feature names must begin with a dash", {}, b);
  });

  it('test_comparable', function(done) {
    // https://github.com/sass/sass/blob/a75d4bccf90261c8b36cbe20fa5cde124696e3fb/test/sass/functions_test.rb#L913-L920
    // v3.2.10

    function d() {eval_equal(func_parse("comparable(2px, 1px)"), '"true"', {}, done)}
    function c() { eval_equal(func_parse("comparable(10cm, 3mm)"), '"true"', {}, d)}
    function b() { eval_equal(func_parse("comparable(100px, 3em)"), '"false"', {}, c) }
    eval_equal(func_parse("comparable($number1: 100px, $number2: 3em)"), '"false"', {}, b)
  });

  it('test_length', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1117
    // v3.3.0

    eval_equal(func_parse('length((foo: bar, bar: baz))'), '"2"', {}, done);
  });

  it('test_nth', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1120-L1139
    // v3.3.0

    function q() { eval_equal(func_parse("nth((foo: bar, bar: baz), 2)"), '"bar baz"', {}, done) }
    function p() { eval_equal(func_parse("nth((foo: bar, bar: baz), 1)"), '"foo bar"', {}, q) }
    function o() { eval_err(func_parse("nth(1 2 3, foo)"), '$n: \"foo\" is not a number for `nth\'', {}, p) }
    function n() { eval_err(func_parse("nth((), 1)"), 'List index is 1 but list has no items', {}, o) }
    function m() { eval_err(func_parse("nth(foo, 0)"), 'List index 0 must be a non-zero integer for `nth\'', {}, n) }
    function l() { eval_err(func_parse("nth(foo, -10)"), 'List index is -10 but list is only 1 item long for `nth\'', {}, m) }
    function k() { eval_err(func_parse("nth(foo, 1.5)"), 'List index 1.5 must be a non-zero integer for `nth\'', {}, l) }
    function j() { eval_err(func_parse("nth(1 2 3 4, 5)"), 'List index is 5 but list is only 4 items long', {}, k) }
    function i() { eval_err(func_parse("nth(foo, 2)"), 'List index is 2 but list is only 1 item long', {}, j) }
    function h() {eval_equal(func_parse("nth(foo (bar baz) bang, 2)"), '"bar baz"', {}, i)}
    function g() { eval_equal(func_parse("nth(foo, 1)"), '"foo"', {}, h)}

    function f() {eval_equal(func_parse("nth($list: (1, 2, 3), $n: 3)"), '"3"', {}, g) }
    function e() {eval_equal(func_parse("nth((1, 2, 3), 3)"), '"3"', {}, f) }
    function d() {eval_equal(func_parse("nth(1 2 3, -3)"), '"1"', {}, e);}
    function c() {eval_equal(func_parse("nth(1 2 3, -1)"), '"3"', {}, d);}
    function b() {eval_equal(func_parse("nth(1 2 3, 2)"), '"2"', {}, c);}
    eval_equal(func_parse("nth(1 2 3, 1)"), '"1"', {}, b)
  });

  it('test_set_nth', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1141-L1157
    // v3.3.0

    function o() { eval_err(func_parse("set-nth(1 2 3, foo, a)"), '$n: \"foo\" is not a number for `set-nth\'', {}, done) }
    function n() { eval_err(func_parse("set-nth((), 1, a)"), 'List index is 1 but list has no items for `set-nth\'', {}, o) }
    function m() { eval_err(func_parse("set-nth(foo, 2, a)"), 'List index is 2 but list is only 1 item long for `set-nth\'', {}, n) }
    function l() { eval_err(func_parse("set-nth(1 2 3 4, 5, a)"), 'List index is 5 but list is only 4 items long for `set-nth\'', {}, m) }
    function k() { eval_err(func_parse("set-nth(foo, 1.5, a)"), 'List index 1.5 must be a non-zero integer for `set-nth\'', {}, l) }
    function j() { eval_err(func_parse("set-nth(foo, -10, a)"), 'List index is -10 but list is only 1 item long for `set-nth\'', {}, k) }
    function i() { eval_err(func_parse("set-nth(foo, 0, a)"), 'List index 0 must be a non-zero integer for `set-nth\'', {}, j) }
    function h() {eval_equal(func_parse("set-nth((foo, bar, baz), 2, (a b))"), '"foo, a b, baz"', {}, i)}
    function g() { eval_equal(func_parse("set-nth(foo, 1, a)"), '"a"', {}, h)}
    function f() {eval_equal(func_parse("set-nth((1, 2, 3), 3, a)"), '"1, 2, a"', {}, g) }
    function e() {eval_equal(func_parse("set-nth($list: 1 2 3, $n: -3, $value: a)"), '"a 2 3"', {}, f) }
    function d() {eval_equal(func_parse("set-nth(1 2 3, -3, a)"), '"a 2 3"', {}, e);}
    function c() {eval_equal(func_parse("set-nth(1 2 3, -1, a)"), '"1 2 a"', {}, d);}
    function b() {eval_equal(func_parse("set-nth(1 2 3, 2, a)"), '"1 a 3"', {}, c);}
    eval_equal(func_parse("set-nth(1 2 3, 1, a)"), '"a 2 3"', {}, b)
  });

  it('test_join', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1196-L1209
    // v3.3.0

    function f() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"join((foo: bar, bar: baz), ())\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo bar, bar baz"', {}, done)}
    function e() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"join((), (baz: bip, bip: bop))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"baz bip, bip bop"', {}, f)}
    function d() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"join((foo: bar, bar: baz), bip bop)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo bar, bar baz, bip, bop"', {}, e)}
    function c() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"join(foo bar, (baz: bip, bip: bop))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo bar (baz bip) (bip bop)"', {}, d)}
    function b() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"join((foo: bar, bar: baz), (baz: bip, bip: bop), space)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo bar) (bar baz) (baz bip) (bip bop)"', {}, c)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"join((foo: bar, bar: baz), (baz: bip, bip: bop))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo bar, bar baz, baz bip, bip bop"', {}, b)
  });

  it('test_append', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1245-L1248
    // v3.3.0

    function c() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"append((foo: bar, bar: baz), (baz: bip))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo bar, bar baz, (baz: bip)"', {}, done)}
    function b() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"append((foo: bar, bar: baz), 1)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo bar, bar baz, 1"', {}, c)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"append(1 2, (foo: bar))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"1 2 (foo: bar)"', {}, b)
  });

  it('test_zip', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1255-L1256
    // v3.3.0

    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"zip((foo: bar, bar: baz), 1 2, 3 4)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo bar) 1 3, (bar baz) 2 4"', {}, done)
  });

  it('test_list_separator', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1332-L1342
    // v3.3.0

    function h() {eval_equal(func_parse("list-separator((foo: bar, bar: baz))"), '"comma"', {}, done)}
    function g() {eval_equal(func_parse("list-separator(1 2 () 3)"), '"space"', {}, h)}
    function f() {eval_equal(func_parse("list-separator(())"), '"space"', {}, g)}
    function e() {eval_equal(func_parse("list-separator(#f00)"), '"space"', {}, f)}
    function d() {eval_equal(func_parse("list-separator((foo, bar, (baz, bip)))"), '"comma"', {}, e)}
    function c() {eval_equal(func_parse("list-separator((foo, bar, baz bip))"), '"comma"', {}, d)}
    function b() {eval_equal(func_parse("list-separator((foo, bar, baz, bip))"), '"comma"', {}, c)}
    eval_equal(func_parse("list-separator(1 2 3 4 5)"), '"space"', {}, b)
  });

  it('test_if', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1348-L1370
    // v3.3.0

    function f() { equal(".if {\n  $splat: 1px, 2px;\n  result: if(true, $splat...);\n}\n",".if {\n  result: 1px; }\n", {syntax: 'scss'}, done)}
    function e() { equal(".if {\n  $something: yay;\n  result: if(true, $if-true: $something, $if-false: $broken);\n}\n",".if {\n  result: yay; }\n", {syntax: 'scss'}, f)}
    function d() {eval_equal(func_parse("if(true, $if-true: 1px, $if-false: $broken)"), '"1px"', {}, e);}
    function c() {eval_equal(func_parse("if(false, $if-true: $broken, $if-false: 1px)"), '"1px"', {}, d);}
    function b() {eval_equal(func_parse("if(false, $broken, 1px)"), '"1px"', {}, c);}
    eval_equal(func_parse("if(true, 1px, $broken)"), '"1px"', {}, b)
  });

  it('test_unique_id', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1443-L1451
    // v3.3.0

    eval_equal("var i=0,ret=true,last_id,current_id;while(i<50){i++;current_id=" + func_parse("unique-id()") + ";if(current_id.match(/u[a-z0-9]{8}/)===null||last_id===current_id){ret=false;break}};ret", 'true', {}, done)

  });

  it('test_map_get', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1453-L1458
    // v3.3.0

    function d() {
      eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-get((foo: 1, bar: 2), foo)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"1"', {}, done)}
    function c() {
      eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-get((foo: 1, bar: 2), bar)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"2"', {}, d)}
    function b() {
      eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-get((foo: 1, bar: 2), baz)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"null"', {}, c)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-get((), foo)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"null"', {}, b)
  });

  it('test_map_get_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1470-L1472
    // v3.3.0

    eval_err(func_parse('map-get(12, bar)'), '$map: 12 is not a map for `map-get\'', {}, done)
  });

  it('test_map_merge', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1474-L1481
    // v3.3.0

    function d() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-merge((foo: 1, bar: 2), (baz: 3))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, bar: 2, baz: 3)"', {}, done)}
    function c() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-merge((), (foo: 1, bar: 2))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, bar: 2)"', {}, d)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-merge((foo: 1, bar: 2), ())\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, bar: 2)"', {}, c)
  });

  it('test_map_merge_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1503-L1506
    // v3.3.0

    function b() {eval_err(func_parse('map-merge((foo: 1), 12)'), '$map2: 12 is not a map for `map-merge\'', {}, done)}
    eval_err(func_parse('map-merge(12, (foo: 1))'), '$map1: 12 is not a map for `map-merge\'', {}, b)
  });

  it('test_map_remove_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1525-L1527
    // v3.3.0

    eval_err(func_parse('map-remove(12, foo)'), '$map: 12 is not a map for `map-remove\'', {}, done)
  });

  it('test_map_keys', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1529-L1533
    // v3.3.0

    function b() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-keys(())\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"()"', {}, done)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-keys((foo: 1, bar: 2))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo, bar"', {}, b)
  });

  it('test_map_keys_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1546-L1548
    // v3.3.0

    eval_err(func_parse('map-keys(12)'), '$map: 12 is not a map for `map-keys\'', {}, done)
  });

  it('test_map_values', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1550-L1555
    // v3.3.0

    function c() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-values(())\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"()"', {}, done)}
    function b() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-values((foo: 1, bar: 2, baz: 2))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"1, 2, 2"', {}, c)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-values((foo: 1, bar: 2))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"1, 2"', {}, b)
  });

  it('test_map_values_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1567-L1569
    // v3.3.0

    eval_err(func_parse('map-values(12)'), '$map: 12 is not a map for `map-values\'', {}, done)
  });

  it('test_map_has_key', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1571-L1575
    // v3.3.0

    function c() {eval_equal(func_parse("map-has-key((), foo)"), '"false"', {}, done)}
    function b() {eval_equal(func_parse("map-has-key((foo: 1, bar: 1), baz)"), '"false"', {}, c)}
    eval_equal(func_parse("map-has-key((foo: 1, bar: 1), foo)"), '"true"', {}, b)
  });

  it('test_map_has_key_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1587-L1589
    // v3.3.0

    eval_err(func_parse('map-has-key(12, foo)'), '$map: 12 is not a map for `map-has-key\'', {}, done)
  });

  it('test_call_with_keyword_arguments', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1642-L1646
    // v3.3.0

    eval_equal(func_parse("lighten($color: blue, $amount: 5%)"), func_parse("call(lighten, $color: blue, $amount: 5%)"), {}, done)
  });

  it('test_call_with_keyword_and_positional_arguments', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1648-L1652
    // v3.3.0

    eval_equal(func_parse("lighten(blue, $amount: 5%)"), func_parse("call(lighten, blue, $amount: 5%)"), {}, done)
  });

  it('test_call_with_dynamic_name', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1654-L1659
    // v3.3.0

    eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('fn', Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new(\"lighten\"));Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"lighten($color: blue, $amount: 5%)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", 'Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"call($fn, $color: blue, $amount: 5%)\",0,0).$perform(env).$to_sass()', {}, done)
  });

  it('test_call_uses_local_scope', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1661-L1680
    // v3.3.0

    var css = ".first-scope {\n  a: local; }\n\n.second-scope {\n  a: global; }\n";
    var scss = "@function foo() {@return global}\n\n.first-scope {\n  @function foo() {@return local}\n  a: call(foo);\n}\n\n.second-scope {\n  a: call(foo);\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_call_unknown_function', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1682-L1684
    // v3.3.0

    eval_equal(func_parse("unknown(red, blue)"), func_parse("call(unknown, red, blue)"), {}, done)
  });

  it('test_call_with_non_string_argument', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1686-L1688
    // v3.3.0

    eval_err(func_parse('call(3px)'), '$name: 3px is not a string for `call\'', {}, done)
  });

  it('test_errors_in_called_function', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1690-L1692
    // v3.3.0

    eval_err(func_parse('call(lighten, 3px, 5%)'), '$color: 3px is not a color for `lighten\'', {}, done)
  });

  it('test_variable_exists', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1694-L1713
    // v3.3.0

    var css = ".test {\n  false: false;\n  true: true;\n  true: true;\n  true: true;\n  true: true; }\n";
    var scss = "$global-var: has-value;\n.test {\n  false: variable-exists(foo);\n  $foo: has-value;\n  true: variable-exists(foo);\n  true: variable-exists($name: foo);\n  true: variable-exists(global-var);\n  true: variable-exists($name: global-var);\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_variable_exists_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1715-L1717
    // v3.3.0

    eval_err(func_parse('variable-exists(1)'), '$name: 1 is not a string for `variable-exists\'', {}, done)
  });

  it('test_global_variable_exists', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1719-L1746
    // v3.3.0

    var css = ".test {\n  false: false;\n  false: false;\n  true: true;\n  true: true;\n  false: false;\n  true: true;\n  true: true; }\n";
    var scss = "$g: something;\n$h: null;\n$false: global-variable-exists(foo);\n$true: global-variable-exists(g);\n$named: global-variable-exists($name: g);\n.test {\n  $foo: locally-defined;\n  false: global-variable-exists(foo);\n  false: global-variable-exists(foo2);\n  true: global-variable-exists(g);\n  true: global-variable-exists(h);\n  false: $false;\n  true: $true;\n  true: $named;\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_global_variable_exists_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1748-L1751
    // v3.3.0

    eval_err(func_parse('global-variable-exists(1)'), '$name: 1 is not a string for `global-variable-exists\'', {}, done)
  });

  it('test_function_exists', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1753-L1770
    // v3.3.0

    function c() {
      var css = ".test {\n  foo-exists: true;\n  bar-exists: false; }\n";
      var scss = "@function foo() { @return \"foo\" }\n.test {\n  foo-exists: function-exists(foo);\n  bar-exists: function-exists(bar);\n}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }

    function b() {eval_equal(func_parse("function-exists($name: lighten)"), '"true"', {}, c)}

    eval_equal(func_parse("function-exists(lighten)"), '"true"', {}, b)
  });

  it('test_function_exists_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1748-L1751
    // v3.3.0

    eval_err(func_parse('function-exists(1)'), '$name: 1 is not a string for `function-exists\'', {}, done)
  });

  it('test_mixin_exists', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1776-L1791
    // v3.3.0

    function c() {
      var css = ".test {\n  foo-exists: true;\n  bar-exists: false; }\n";
      var scss = "@mixin foo() { foo: exists }\n.test {\n  foo-exists: mixin-exists(foo);\n  bar-exists: mixin-exists(bar);\n}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }

    function b() {eval_equal(func_parse("mixin-exists($name: foo)"), '"false"', {}, c)}

    eval_equal(func_parse("mixin-exists(foo)"), '"false"', {}, b)
  });

  it('test_mixin_exists_checks_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1793-L1795
    // v3.3.0

    eval_err(func_parse('mixin-exists(1)'), '$name: 1 is not a string for `mixin-exists\'', {}, done)
  });

  it('test_inspect', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1797-L1802
    // v3.3.0

    function d() { eval_equal(func_parse("inspect((a: 1, b: 2))"), '"(a: 1, b: 2)"', {}, done) }
    function c() { eval_equal(func_parse("inspect(1px null 3px)"), '"1px null 3px"', {}, d) }
    function b() {eval_equal(func_parse("inspect(null)"), '"null"', {}, c)}
    eval_equal(func_parse("inspect(())"), '"()"', {}, b)
  });

  it('test_random', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1804-L1808
    // v3.3.0

    // TODO the results of the random seeded stuff are different from the MRI seeded values. This was really only ever meant for consistent testing. Therefore rather than trying to find the exact magic numbers to replicate it exactly we are just accepting the difference as the "correct" value. PRs welcome!

    function b() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Functions[\"$random_seed=\"](1);" + func_parse("random(100)"), '"18"', {}, done)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Functions[\"$random_seed=\"](1);" + func_parse("random()"), '"0.17763"', {}, b)
  });

  it('test_random_works_without_a_seed', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1810-L1819
    // v3.3.0

    eval_equal("if(Opal.Sass.$$scope.Script.$$scope.Functions['$instance_variable_defined?'](\"@random_number_generator\")){Opal.Sass.$$scope.Script.$$scope.Functions.$send('remove_instance_variable', '@random_number_generator')}; var result=Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"random()\", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new());result.$value()>=0&&result.$value()<=1&&true", 'true', {}, done)
  });

  it('test_random_with_limit_one', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1821-L1826
    // v3.3.0

    eval_equal(func_parse("random(1)"), '"1"', {}, done)
  });

  it('test_random_with_limit_too_low', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1828-L1830
    // v3.3.0

    eval_err(func_parse('random(0)'), '$limit 0 must be greater than or equal to 1 for `random\'', {}, done)
  });

  it('test_random_with_non_integer_limit', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1832-L1834
    // v3.3.0

    eval_err(func_parse('random(1.5)'), 'Expected $limit to be an integer but got 1.5 for `random\'', {}, done)
  });

  it('test_inspect_nested_empty_lists', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1846-L1848
    // v3.3.0

    eval_equal(func_parse("inspect(() ())"), '"() ()"', {}, done)
  });

  it('test_funcall_with_hyphen_conversion_keyword_arg', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_conversion_test.rb#L61-L63
    // v3.3.0

    var source = '"foo($a-b_c: val)"'
      eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, done)
  });

  it('test_singleton_list', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_conversion_test.rb#L90-L94
    // v3.3.0

    function c() {
      var source = '"((1, 2, 3),)"'
        eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, done)
    }
    function b() {
      var source = '"(1 2 3,)"'
        eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, c)
    }
    var source = '"(1,)"'
      eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, b)
  });

  it('test_map', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_conversion_test.rb#L96-L100
    // v3.3.0

    function c() {
      var source = '"(foo: bar, baz: (bip: bap))"'
        eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, done)
    }

    function b() {
      var source = '"(foo: bar, baz: bip)"'
        eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, c)
    }

    var source = '"(foo: bar)"'
      eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, b)
  });

  it('test_map_in_list', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_conversion_test.rb#L102-L105
    // v3.3.0

    function b() {
      var source = '"(foo: bar), (baz: bip)"'
        eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, done)
    }

    var source = '"(foo: bar) baz"'
      eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, b)
  });

  it('test_list_in_map', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_conversion_test.rb#L107-L110
    // v3.3.0

    function b() {
      var source = '"(foo: (bar, baz), bip: bop)"'
        eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, done)
    }

    var source = '"(foo: bar baz)"'
      eval_equal('Opal.Sass.$$scope.Script.$parse(' + source + ',1,0).$to_sass()', source, {syntax: 'scss'}, b)
  });

  it('test_rgba_color_literals', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L49-L60
    // v3.3.0

    function h() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("rgba(1, 2, 3, 0.75)", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$eq(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([1, 2, 3, 0.75])).$value().valueOf()', 'true', {}, done)}
    function g() { eval_equal(func_parse("rgba(1, 2, 3, 0.75)"), '"rgba(1, 2, 3, 0.75)"', {}, h) }
    function f() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("rgba(1, 2, 3, 0)", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$eq(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([1, 2, 3, 0])).$value().valueOf()', 'true', {}, g)}
    function e() { eval_equal(func_parse("rgba(1, 2, 3, 0)"), '"rgba(1, 2, 3, 0)"', {}, f) }
    function d() { eval_equal(func_parse("rgba(1, 2, 3, 1)"), 'Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([1, 2, 3]).$inspect()', {}, e) }
    function c() { eval_equal(func_parse("rgba(1, 2, 3, 1)"), 'Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([1, 2, 3, 1]).$inspect()', {}, d) }
    function b() { eval_equal(func_parse("rgba(1, 2, 3, 1)"), '"#010203"', {}, c)}
    eval_equal(func_parse("rgba(255, 255, 255, 1)"), '"white"', {}, b)
  });

  it('test_compressed_colors', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L100
    // v3.3.0

    eval_equal(func_parse("rgba(0, 0, 0, 0)", {style: 'compressed'}), '"transparent"', {}, done)
  });

  it('test_implicit_strings', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L109-L112
    // v3.3.0

    function b() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new("foo").$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("foo", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).$value().valueOf()', 'true', {}, done) }
    eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new("foo/bar").$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("foo/bar", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).$value().valueOf()', 'true', {}, b)
  });

  it('test_dynamic_url', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L234-L239
    // v3.3.0

    function d() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('foo', 'foo-bar');Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url($foo)', 0, 0).$perform(env).$to_s()", '"url(foo-bar)"', {}, done) }
    function c() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('foo',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new('foo-bar'));env.$set_var('bar',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new('baz'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url($foo $bar)', 0, 0).$perform(env).$to_s()", '"url(foo-bar baz)"', {}, d)}
    function b() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('bar',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new('baz'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url(foo $bar)', 0, 0).$perform(env).$to_s()", '"url(foo baz)"', {}, c) }
    eval_equal(func_parse("url(foo    bar)"), '"url(foo bar)"', {}, b)
  });

  it('test_hyphenated_variables', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L248-L250
    // v3.3.0

    eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('a-b',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new('a-b'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$a-b', 0, 0).$perform(env).$to_s()", '"a-b"', {}, done)
  });

  it('test_equals', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L377-L402
    // v3.3.0

    function m() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'foo\',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new(\'foo\'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'"foo" == $foo\', 0, 0).$perform(env).$to_s()', '"true"', {}, done) }
    function l() { eval_equal(func_parse("1 == 1.0"), '"true"', {}, m) }
    function k() { eval_equal(func_parse("false != true"), '"true"', {}, l) }
    function j() { eval_equal(func_parse("1em == 1px"), '"false"', {}, k) }
    function i() { eval_equal(func_parse("12 != 12"), '"false"', {}, j) }
    function h() { eval_equal(func_parse("(foo bar baz) == (foo bar baz)"), '"true"', {}, i) }
    function g() { eval_equal(func_parse("(foo, bar, baz) == (foo, bar, baz)"), '"true"', {}, h) }
    function f() { eval_equal(func_parse("((1 2), (3, 4), (5 6)) == ((1 2), (3, 4), (5 6))"), '"true"', {}, g) }
    function e() { eval_equal(func_parse("((1 2), (3 4)) == (1 2, 3 4)"), '"true"', {}, f) }
    function d() { eval_equal(func_parse("((1 2) 3) == (1 2 3)"), '"false"', {}, e) }
    function c() { eval_equal(func_parse("(1 (2 3)) == (1 2 3)"), '"false"', {}, d) }
    function b() { eval_equal(func_parse("((1, 2) (3, 4)) == (1, 2 3, 4)"), '"false"', {}, c) }
    eval_equal(func_parse("(1 2 3) == (1, 2, 3)"), '"false"', {}, b)
  });

  it('test_mod', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L404-L408
    // v3.3.0

    function c() { eval_equal(func_parse("29px % 12px"), '"5px"', {}, done) }
    function b() { eval_equal(func_parse("29px % 12"), '"5px"', {}, c) }
    eval_equal(func_parse("29 % 12"), '"5"', {}, b)
  });

  it('test_map_can_have_trailing_comma', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L501-L503
    // v3.3.0

    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"(foo: 1, bar: 2,)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, bar: 2)"', {}, done)
  });

  it('test_list_can_have_trailing_comma', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L505-L507
    // v3.3.0

    eval_equal(func_parse("1, 2, 3,"), '"1, 2, 3"', {}, done)
  });

  it('test_trailing_comma_defines_singleton_list', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L509-L511
    // v3.3.0

    eval_equal(func_parse("nth((1 2 3,), 1)"), '"1 2 3"', {}, done)
  });

  it('test_non_duplicate_map_keys', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L531-L537
    // v3.3.0

    function d() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'("2px": foo, 2px: bar)\', 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).$inspect()', '"(\\\"2px\\\": foo, 2px: bar)"', {}, done); }
    function c() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'(2px: foo, 2em: bar)\', 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).$inspect()', '"(2px: foo, 2em: bar)"', {}, d); }
    function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'(2px: foo, 2: bar)\', 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).$inspect()', '"(2px: foo, 2: bar)"', {}, c); }
    eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'(foo: foo, bar: bar)\', 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).$inspect()', '"(foo: foo, bar: bar)"', {}, b);
  });

  it('test_map_syntax_errors', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L539-L552
    // v3.3.0

    function d() {eval_err(func_parse('(foo: bar, baz)'), 'Invalid CSS after "(foo: bar, baz": expected ":", was ")"', {}, done)}
    function c() {eval_err(func_parse('(foo, bar: baz)'), 'Invalid CSS after "(foo, bar": expected ")", was ": baz)"', {}, d)}
    function b() {eval_err(func_parse('(:bar)'), 'Invalid CSS after "(": expected ")", was ":bar)"', {}, c)}
    eval_err(func_parse('(foo:)'), "Invalid CSS after \"(foo:\": expected expression (e.g. 1px, bold), was \")\"", {}, b);
  });

  it('test_boolean_ops_short_circuit', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L568-L571
    // v3.3.0

    function b() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('ie',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Bool.$new(false));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$ie and $ie <= 7', 0, 0).$perform(env).$to_s()", '"false"', {}, done) }
    eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('ie',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Bool.$new(true));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$ie or $undef', 0, 0).$perform(env).$to_s()", '"true"', {}, b)
  });

  it('test_setting_global_variable_globally', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L618-L638
    // v3.3.0

    function third(result) {
      sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      var css = ".foo {\n  a: 1; }\n\n.bar {\n  b: 2; }\n";
      var scss = "$var: 1;\n\n.foo {\n  a: $var;\n}\n\n$var: 2;\n\n.bar {\n  b: $var;\n}\n";
      equal(scss, css, {syntax: 'scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_setting_global_variable_with_flag_and_default', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L640-L664
    // v3.3.0

    function third(result) {
      sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      var css = ".bar {\n  a: 1;\n  b: y;\n  c: z; }\n";
      var scss = "$var1: 1;\n\n.foo {\n  $var1: x !global !default;\n  $var2: y !global !default;\n  @each $var3 in _ {\n    $var3: z !global !default;\n  }\n}\n\n.bar {\n  a: $var1;\n  b: $var2;\n  c: $var3;\n}\n";
      equal(scss, css, {syntax: 'scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_minus_without_whitespace', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L693-L695
    // v3.3.0

    eval_equal(func_parse("15px-10px"), '"5px"', {}, done)
  });

  it('test_number_initialization', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L756-L759
    // v3.3.0

    function b() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, ["px"], ["em"]).$inspect()', 'Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, "px", "em").$inspect()', {}, done) }
    eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, ["px"]).$inspect()', 'Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, "px").$inspect()', {}, b)
  });

  it('test_is_unit', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L761-L767
    // v3.3.0

    function e() {eval_equal('!Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, ["px", "em"])["$is_unit?"]("px")', "true", {}, done);}
    function d() {eval_equal('!Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, [], "em")["$is_unit?"]("em")', "true", {}, e);}
    function c() {eval_equal('!Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, "px", "em")["$is_unit?"]("px")', "true", {}, d);}
    function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10)["$is_unit?"](Opal.nil)', "true", {}, c);}
    eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$new(10, "px")["$is_unit?"]("px")', "true", {}, b);
  });

  //TODO these tests fail because the redirects are not working. This is probably a problem with Opal, but not that important given that
  // we check in our diff's to ensure that the old versions are not being used anywhere. PR's welcome!
  it.skip('test_rename_redirect', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L769-L776
    // v3.3.0

    function sixth(result) {
      expect(result.err).to.be(undefined);
      sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function fifth(result) {
      expect(result.err).to.be(undefined);

      eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String', 'Opal.Sass.$$scope.Script.$$scope.String', {syntax: 'scss'}, third)
    }

    function fourth(result) {
      expect(result.err).to.be(undefined);

      eval_equal('Opal.Sass.$$scope.Script.$$scope.Tree.$$scope.Operation', 'Opal.Sass.$$scope.Script.$$scope.Operation', {syntax: 'scss'}, third)
    }

    function third(result) {
      expect(result.err).to.be(undefined);

      eval_equal('Opal.Sass.$$scope.Script.$$scope.Tree.$$scope.Node', 'Opal.Sass.$$scope.Script.$$scope.Node', {syntax: 'scss'}, fourth)
    }

    function second(result) {
      expect(result.err).to.be(undefined);

      eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Base', 'Opal.Sass.$$scope.Script.$$scope.Literal', {syntax: 'scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)

  });

  it('test_number_printing-3', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L778-L788
    // v3.3.0

    function i() { eval_equal(func_parse("(0.0/0.0)"), '"NaN"', {}, done)}
    function h() { eval_equal(func_parse("(-1.0/0.0)"), '"-Infinity"', {}, i)}
    function g() { eval_equal(func_parse("(1.0/0.0)"), '"Infinity"', {}, h)}
    function f() { eval_equal(func_parse("1.121215"), '"1.12122"', {}, g)}
    function e() { eval_equal(func_parse("1.121214"), '"1.12121"', {}, f)}
    function d() { eval_equal(func_parse("0.00001"), '"0.00001"', {}, e)}
    function c() { eval_equal(func_parse("1000000000"), '"1000000000"', {}, d)}
    function b() { eval_equal(func_parse("1.0"), '"1"', {}, c)}
    eval_equal(func_parse("1"), '"1"', {}, b)
  });

  it('test_for_directive_with_same_start_and_end', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L166-L182
    // v3.3.0


    function second() {
      var css = ".foo {\n  a: 1; }\n";
      var scss = ".foo {\n  @for $var from 1 through 1 {a: $var;}\n}\n";

      equal(scss, css, {syntax: 'scss'}, done)
    }

    var css = ""
      var scss = ".foo {\n  @for $var from 1 to 1 {a: $var;}\n}\n";

    equal(scss, css, {syntax: 'scss'}, second)
  });

  it('test_decrementing_estfor_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L184-L209
    // v3.3.0


    function second() {
      var css = ".foo {\n  a: 5;\n  a: 4;\n  a: 3;\n  a: 2; }\n";
      var scss = ".foo {\n  @for $var from 5 to 1 {a: $var;}\n}\n";

      equal(scss, css, {syntax: 'scss'}, done)
    }

    var css = ".foo {\n  a: 5;\n  a: 4;\n  a: 3;\n  a: 2;\n  a: 1; }\n";
    var scss = ".foo {\n  @for $var from 5 through 1 {a: $var;}\n}\n";

    equal(scss, css, {syntax: 'scss'}, second)
  });

  it('test_while_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L264-L281
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  a: 2;\n  a: 3;\n  a: 4; }\n";
    var scss = "$i: 1;\n\n.foo {\n  @while $i != 5 {\n    a: $i;\n    $i: $i + 1 !global;\n  }\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_destructuring_each_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L310-L333
    // v3.3.0

    var css = "a {\n  foo: 1px;\n  bar: 2px;\n  baz: 3px; }\n\nc {\n  foo: \"Value is bar\";\n  bar: \"Value is baz\";\n  bang: \"Value is \"; }\n";
    var scss = "a {\n  @each $name, $number in (foo: 1px, bar: 2px, baz: 3px) {\n    #{$name}: $number;\n  }\n}\nc {\n  @each $key, $value in (foo bar) (bar, baz) bang {\n    #{$key}: \"Value is #{$value}\";\n  }\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_parent_selector_with_suffix', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L663-L688
    // v3.3.0

    var css = ".foo-bar {\n  a: b; }\n.foo_bar {\n  c: d; }\n.foobar {\n  e: f; }\n.foo123 {\n  e: f; }\n\n:hover-suffix {\n  g: h; }\n";
    var scss = ".foo {\n  &-bar {a: b}\n  &_bar {c: d}\n  &bar {e: f}\n  &123 {e: f}\n}\n\n:hover {\n  &-suffix {g: h}\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_unknown_directive_bubbling', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L690-L702
    // v3.3.0

    var css = "@fblthp {\n  .foo .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @fblthp {\n    .bar {a: b}\n  }\n}\n";
    equal(scss, css,{syntax: 'scss', style: 'nested'}, done)
  });

  it('test_mixin_var_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1095-L1110
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3; }\n";
    var scss = "@mixin foo($args...) {\n  a: map-get(keywords($args), a);\n  b: map-get(keywords($args), b);\n  c: map-get(keywords($args), c);\n}\n\n.foo {@include foo($a: 1, $b: 2, $c: 3)}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_empty_var_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1112-L1123
    // v3.3.0

    var css = ".foo {\n  length: 0; }\n";
    var scss = "@mixin foo($args...) {\n  length: length(keywords($args));\n}\n\n.foo {@include foo}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_map_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1125-L1143
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3; }\n";
    var scss = "@mixin foo($a, $b, $c) {\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n.foo {\n  $map: (a: 1, b: 2, c: 3);\n  @include foo($map...);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_map_and_list_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1145-L1170
    // v3.3.0

    var css = ".foo {\n  a: x;\n  b: y;\n  c: z;\n  d: 1;\n  e: 2;\n  f: 3; }\n";
    var scss = "@mixin foo($a, $b, $c, $d, $e, $f) {\n  a: $a;\n  b: $b;\n  c: $c;\n  d: $d;\n  e: $e;\n  f: $f;\n}\n\n.foo {\n  $list: x y z;\n  $map: (d: 1, e: 2, f: 3);\n  @include foo($list..., $map...);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_map_splat_takes_precedence_over_pass_through', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1172-L1194
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: z; }\n";
    var scss = "@mixin foo($args...) {\n  $map: (c: z);\n  @include bar($args..., $map...);\n}\n\n@mixin bar($a, $b, $c) {\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n.foo {\n  @include foo(1, $b: 2, $c: 3);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_list_of_pairs_splat_treated_as_list', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1196-L1213
    // v3.3.0

    var css = ".foo {\n  a: a 1;\n  b: b 2;\n  c: c 3; }\n";
    var scss = "@mixin foo($a, $b, $c) {\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n.foo {\n  @include foo((a 1, b 2, c 3)...);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_splat_after_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1215-L1232
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3; }\n";
    var scss = "@mixin foo($a, $b, $c) {\n  a: 1;\n  b: 2;\n  c: 3;\n}\n\n.foo {\n  @include foo(1, $c: 3, 2...);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_keyword_args_after_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1234-L1251
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3; }\n";
    var scss = "@mixin foo($a, $b, $c) {\n  a: 1;\n  b: 2;\n  c: 3;\n}\n\n.foo {\n  @include foo(1, 2..., $c: 3);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_keyword_splat_after_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1253-L1270
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3; }\n";
    var scss = "@mixin foo($a, $b, $c) {\n  a: 1;\n  b: 2;\n  c: 3;\n}\n\n.foo {\n  @include foo(1, $b: 2, (c: 3)...);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_triple_keyword_splat_merge', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1272-L1299
    // v3.3.0

    var css = ".foo {\n  foo: 1;\n  bar: 2;\n  kwarg: 3;\n  a: 3;\n  b: 2;\n  c: 3; }\n";
    var scss = "@mixin foo($foo, $bar, $kwarg, $a, $b, $c) {\n  foo: $foo;\n  bar: $bar;\n  kwarg: $kwarg;\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n@mixin bar($args...) {\n  @include foo($args..., $bar: 2, $a: 2, $b: 2, (kwarg: 3, a: 3, c: 3)...);\n}\n\n.foo {\n  @include bar($foo: 1, $a: 1, $b: 1, $c: 1);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_map_splat_converts_hyphens_and_underscores_for_real_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1301-L1321
    // v3.3.0

    var css = ".foo {\n  a: 1;\n  b: 2;\n  c: 3;\n  d: 4; }\n";
    var scss = "@mixin foo($a-1, $b-2, $c_3, $d_4) {\n  a: $a-1;\n  b: $b-2;\n  c: $c_3;\n  d: $d_4;\n}\n\n.foo {\n  $map: (a-1: 1, b_2: 2, c-3: 3, d_4: 4);\n  @include foo($map...);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_map_splat_doesnt_convert_hyphens_and_underscores_for_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1323-L1342
    // v3.3.0

    var css = ".foo {\n  a-1: 1;\n  b_2: 2;\n  c-3: 3;\n  d_4: 4; }\n";
    var scss = "@mixin foo($args...) {\n  @each $key, $value in keywords($args) {\n    #{$key}: $value;\n  }\n}\n\n.foo {\n  $map: (a-1: 1, b_2: 2, c-3: 3, d_4: 4);\n  @include foo($map...);\n}\n";
    equal(scss, css,{syntax: 'scss'}, done)
  });

  it('test_mixin_conflicting_splat_after_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1344-L1358
    // v3.3.0

    err_message("@mixin foo($a, $b, $c) {\n  a: 1;\n  b: 2;\n  c: 3;\n}\n\n.foo {\n  @include foo(1, $b: 2, 3...);\n}\n", 'foo was passed argument $b both by position and by name.', {syntax: 'scss'}, done)
  });

  it('test_mixin_keyword_splat_must_have_string_keys', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1360-L1371
    // v3.3.0

    err_message("@mixin foo($a) {\n  a: $a;\n}\n\n.foo {@include foo((12: 1)...)}\n", "Variable keyword argument map must have string keys.\n12 is not a string in (12: 1).", {syntax: 'scss'}, done)
  });

  it('test_mixin_positional_arg_after_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1373-L1387
    // v3.3.0

    err_message("@mixin foo($a, $b, $c) {\n  a: 1;\n  b: 2;\n  c: 3;\n}\n\n.foo {\n  @include foo(1, 2..., 3);\n}\n", "Only keyword arguments may follow variable arguments (...).", {syntax: 'scss'}, done)
  });

  it('test_mixin_var_args_with_keyword', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1389-L1398
    // v3.3.0

    err_message("@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n.foo {@include foo($a: 1, 2, 3, 4)}\n", "Positional arguments must come before keyword arguments.", {syntax: 'scss'}, done)
  });

  it('test_mixin_keyword_for_unknown_arg_with_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1411-L1420
    // v3.3.0

    err_message("@mixin foo($a, $b...) {\n  a: $a;\n  b: $b;\n}\n\n.foo {@include foo(1, $c: 2 3 4)}\n", "Mixin foo doesn't have an argument named $c.", {syntax: 'scss'}, done)
  });

  it('test_mixin_map_splat_before_list_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1422-L1434
    // v3.3.0

    err_message("@mixin foo($a, $b, $c) {\n  a: $a;\n  b: $b;\n  c: $c;\n}\n\n.foo {\n  @include foo((a: 1)..., (2 3)...);\n}\n", "Variable keyword arguments must be a map (was (2 3)).", {syntax: 'scss'}, done)
  });

  it('test_mixin_map_splat_with_unknown_keyword', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1436-L1447
    // v3.3.0

    err_message("@mixin foo($a, $b) {\n  a: $a;\n  b: $b;\n}\n\n.foo {\n  @include foo(1, 2, (c: 1)...);\n}\n", "Mixin foo doesn't have an argument named $c.", {syntax: 'scss'}, done)
  });

  it('test_mixin_map_splat_with_wrong_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1449-L1460
    // v3.3.0

    err_message("@mixin foo($a, $b) {\n  a: $a;\n  b: $b;\n}\n\n.foo {\n  @include foo((1, 2)..., 12...);\n}\n", "Variable keyword arguments must be a map (was 12).", {syntax: 'scss'}, done)
  });

  it('test_function_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1462-L1473
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, 3, 4\"; }\n";
    var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {val: foo(1, 2, 3, 4)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_empty_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1475-L1486
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 0\"; }\n";
    var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{length($b)}\";\n}\n\n.foo {val: foo(1)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_var_args_act_like_list', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1488-L1499
    // v3.3.0

    var css = ".foo {\n  val: \"a: 3, b: 3\"; }\n";
    var scss = "@function foo($a, $b...) {\n  @return \"a: #{length($b)}, b: #{nth($b, 2)}\";\n}\n\n.foo {val: foo(1, 2, 3, 4)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_splat_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1501-L1513
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3, d: 4\"; }\n";
    var scss = "@function foo($a, $b, $c, $d) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}, d: #{$d}\";\n}\n\n$list: 2, 3, 4;\n.foo {val: foo(1, $list...)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_splat_expression', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1515-L1526
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3, d: 4\"; }\n";
    var scss = "@function foo($a, $b, $c, $d) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}, d: #{$d}\";\n}\n\n.foo {val: foo(1, (2, 3, 4)...)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_splat_args_with_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1528-L1540
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, 3, 4\"; }\n";
    var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n$list: 2, 3, 4;\n.foo {val: foo(1, $list...)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_splat_args_with_var_args_and_normal_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1542-L1554
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3, 4\"; }\n";
    var scss = "@function foo($a, $b, $c...) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n$list: 2, 3, 4;\n.foo {val: foo(1, $list...)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_splat_args_with_var_args_preserves_separator', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1556-L1568
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2 3 4 5\"; }\n";
    var scss = "@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n$list: 3 4 5;\n.foo {val: foo(1, 2, $list...)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_var_and_splat_args_pass_through_keywords', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1570-L1585
    // v3.3.0

    var css = ".foo {\n  val: \"a: 3, b: 1, c: 2\"; }\n";
    var scss = "@function foo($a...) {\n  @return bar($a...);\n}\n\n@function bar($b, $c, $a) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {val: foo(1, $c: 2, $a: 3)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_var_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1587-L1600
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3\"; }\n";
    var scss = "@function foo($args...) {\n  @return \"a: #{map-get(keywords($args), a)}, \" +\n    \"b: #{map-get(keywords($args), b)}, \" +\n    \"c: #{map-get(keywords($args), c)}\";\n}\n\n.foo {val: foo($a: 1, $b: 2, $c: 3)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_empty_var_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1602-L1613
    // v3.3.0

    var css = ".foo {\n  length: 0; }\n";
    var scss = "@function foo($args...) {\n  @return length(keywords($args));\n}\n\n.foo {length: foo()}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_map_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1615-L1629
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3\"; }\n";
    var scss = "@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  $map: (a: 1, b: 2, c: 3);\n  val: foo($map...);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_map_and_list_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1631-L1646
    // v3.3.0

    var css = ".foo {\n  val: \"a: x, b: y, c: z, d: 1, e: 2, f: 3\"; }\n";
    var scss = "@function foo($a, $b, $c, $d, $e, $f) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}, d: #{$d}, e: #{$e}, f: #{$f}\";\n}\n\n.foo {\n  $list: x y z;\n  $map: (d: 1, e: 2, f: 3);\n  val: foo($list..., $map...);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_map_splat_takes_precedence_over_pass_through', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1648-L1666
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: z\"; }\n";
    var scss = "@function foo($args...) {\n  $map: (c: z);\n  @return bar($args..., $map...);\n}\n\n@function bar($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo(1, $b: 2, $c: 3);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_ruby_function_map_splat_takes_precedence_over_pass_through', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1668-L1682
    // v3.3.0

    var css = ".foo {\n  val: 1 2 3 z; }\n";
    var scss = "@function foo($args...) {\n  $map: (val: z);\n  @return append($args..., $map...);\n}\n\n.foo {\n  val: foo(1 2 3, $val: 4)\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_list_of_pairs_splat_treated_as_list', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1684-L1697
    // v3.3.0

    var css = ".foo {\n  val: \"a: a 1, b: b 2, c: c 3\"; }\n";
    var scss = "@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo((a 1, b 2, c 3)...);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_splat_after_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1699-L1712
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3\"; }\n";
    var scss = "@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo(1, $c: 3, 2...);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_keyword_args_after_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1714-L1727
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3\"; }\n";
    var scss = "@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo(1, 2..., $c: 3);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_keyword_splat_after_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1729-L1742
    // v3.3.0

    var css = ".foo {\n  val: \"a: 1, b: 2, c: 3\"; }\n";
    var scss = "@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo(1, $b: 2, (c: 3)...);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_triple_keyword_splat_merge', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1744-L1761
    // v3.3.0

    var css = ".foo {\n  val: \"foo: 1, bar: 2, kwarg: 3, a: 3, b: 2, c: 3\"; }\n";
    var scss = "@function foo($foo, $bar, $kwarg, $a, $b, $c) {\n  @return \"foo: #{$foo}, bar: #{$bar}, kwarg: #{$kwarg}, a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n@function bar($args...) {\n  @return foo($args..., $bar: 2, $a: 2, $b: 2, (kwarg: 3, a: 3, c: 3)...);\n}\n\n.foo {\n  val: bar($foo: 1, $a: 1, $b: 1, $c: 1);\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_conflicting_splat_after_keyword_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1763-L1775
    // v3.3.0

    err_message("@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo(1, $b: 2, 3...);\n}\n", "Function foo was passed argument $b both by position and by name.", {syntax: 'scss'}, done)
  });

  it('test_function_positional_arg_after_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1777-L1789
    // v3.3.0

    err_message("@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo(1, 2..., 3);\n}\n", "Only keyword arguments may follow variable arguments (...).", {syntax: 'scss'}, done)
  });

  it('test_function_var_args_with_keyword', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1791-L1799
    // v3.3.0

    err_message("@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {val: foo($a: 1, 2, 3, 4)}\n", "Positional arguments must come before keyword arguments.", {syntax: 'scss'}, done)
  });

  it('test_function_keyword_for_var_arg', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1801-L1809
    // v3.3.0

    err_message("@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {val: foo(1, $b: 2 3 4)}\n", "Argument $b of function foo cannot be used as a named argument.", {syntax: 'scss'}, done)
  });

  it('test_function_keyword_for_unknown_arg_with_var_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1811-L1819
    // v3.3.0

    err_message("@function foo($a, $b...) {\n  @return \"a: #{$a}, b: #{length($b)}\";\n}\n\n.foo {val: foo(1, $c: 2 3 4)}\n", "Function foo doesn't have an argument named $c.", {syntax: 'scss'}, done)
  });

  it('test_function_var_args_passed_to_native', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1821-L1832
    // v3.3.0

    var css = ".foo {\n  val: #102035; }\n";
    var scss = "@function foo($args...) {\n  @return adjust-color($args...);\n}\n\n.foo {val: foo(#102030, $blue: 5)}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_function_map_splat_before_list_splat', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1834-L1844
    // v3.3.0

    err_message("@function foo($a, $b, $c) {\n  @return \"a: #{$a}, b: #{$b}, c: #{$c}\";\n}\n\n.foo {\n  val: foo((a: 1)..., (2 3)...);\n}\n", "Variable keyword arguments must be a map (was (2 3)).", {syntax: 'scss'}, done)
  });

  it('test_function_map_splat_with_unknown_keyword', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1846-L1856
    // v3.3.0

    err_message("@function foo($a, $b) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {\n  val: foo(1, 2, (c: 1)...);\n}\n", "Function foo doesn't have an argument named $c.", {syntax: 'scss'}, done)
  });

  it('test_function_map_splat_with_wrong_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1858-L1868
    // v3.3.0

    err_message("@function foo($a, $b) {\n  @return \"a: #{$a}, b: #{$b}\";\n}\n\n.foo {\n  val: foo((1, 2)..., 12...);\n}\n", "Variable keyword arguments must be a map (was 12).", {syntax: 'scss'}, done)
  });

  it('test_function_keyword_splat_must_have_string_keys', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L1870-L1881
    // v3.3.0

    err_message("@function foo($a) {\n  @return $a;\n}\n\n.foo {val: foo((12: 1)...)}\n", "Variable keyword argument map must have string keys.\n12 is not a string in (12: 1).", {syntax: 'scss'}, done)
  });

  it('test_at_root_in_mixin', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2280-L2293
    // v3.3.0

    var css = ".bar {\n  a: b; }\n";
    var scss = "@mixin bar {\n  @at-root .bar {a: b}\n}\n\n.foo {\n  @include bar;\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_in_media', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2295-L2307
    // v3.3.0

    var css = "@media screen {\n  .bar {\n    a: b; } }\n";
    var scss = "@media screen {\n  .foo {\n    @at-root .bar {a: b}\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_in_bubbled_media', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2309-L2321
    // v3.3.0

    var css = "@media screen {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @at-root .bar {a: b}\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_in_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2323-L2335
    // v3.3.0

    var css = "@fblthp {\n  .bar {\n    a: b; } }\n";
    var scss = "@fblthp {\n  .foo {\n    @at-root .bar {a: b}\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_comments_in_at_root', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2337-L2353
    // v3.3.0

    var css = "/* foo */\n.bar {\n  a: b; }\n\n/* baz */\n";
    var scss = ".foo {\n  @at-root {\n    /* foo */\n    .bar {a: b}\n    /* baz */\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_comments_in_at_root_in_media', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2355-L2374
    // v3.3.0

    var css = "@media screen {\n  /* foo */\n  .bar {\n    a: b; }\n\n  /* baz */ }\n";
    var scss = "@media screen {\n  .foo {\n    @at-root {\n      /* foo */\n      .bar {a: b}\n      /* baz */\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_comments_in_at_root_in_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2376-L2395
    // v3.3.0

    var css = "@fblthp {\n  /* foo */\n  .bar {\n    a: b; }\n\n  /* baz */ }\n";
    var scss = "@fblthp {\n  .foo {\n    @at-root {\n      /* foo */\n      .bar {a: b}\n      /* baz */\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_media_directive_in_at_root', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2397-L2409
    // v3.3.0

    var css = "@media screen {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @at-root {\n    @media screen {.bar {a: b}}\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_bubbled_media_directive_in_at_root', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2411-L2425
    // v3.3.0

    var css = "@media screen {\n  .bar .baz {\n    a: b; } }\n";
    var scss = ".foo {\n  @at-root {\n    .bar {\n      @media screen {.baz {a: b}}\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_unknown_directive_in_at_root', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2427-L2439
    // v3.3.0

    var css = "@fblthp {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @at-root {\n    @fblthp {.bar {a: b}}\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_in_at_root', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2441-L2452
    // v3.3.0

    var css = ".bar {\n  a: b; }\n";
    var scss = ".foo {\n  @at-root {\n    @at-root .bar {a: b}\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_parent_ref', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2454-L2465
    // v3.3.0

    var css = ".foo {\n  a: b; }\n";
    var scss = ".foo {\n  @at-root & {\n    a: b;\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_multi_level_at_root_with_parent_ref', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2467-L2482
    // v3.3.0

    var css = ".foo .bar {\n  a: b; }\n";
    var scss = ".foo {\n  @at-root & {\n    .bar {\n      @at-root & {\n        a: b;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_multi_level_at_root_with_inner_parent_ref', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2484-L2497
    // v3.3.0

    var css = ".bar {\n  a: b; }\n";
    var scss = ".foo {\n  @at-root .bar {\n    @at-root & {\n      a: b;\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_beneath_comma_selector', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2499-L2510
    // v3.3.0

    var css = ".baz {\n  a: b; }\n";
    var scss = ".foo, .bar {\n  @at-root .baz {\n    a: b;\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_parent_ref_and_class', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2512-L2523
    // v3.3.0

    var css = ".foo.bar {\n  a: b; }\n";
    var scss = ".foo {\n  @at-root &.bar {\n    a: b;\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_beneath_comma_selector_with_parent_ref', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2525-L2536
    // v3.3.0

    var css = ".foo.baz, .bar.baz {\n  a: b; }\n";
    var scss = ".foo, .bar {\n  @at-root &.baz {\n    a: b;\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_without_media', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2540-L2555
    // v3.3.0

    var css = ".foo .bar {\n  a: b; }\n";
    var scss = ".foo {\n  @media screen {\n    @at-root (without: media) {\n      .bar {\n        a: b;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_without_supports', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2557-L2572
    // v3.3.0

    var css = ".foo .bar {\n  a: b; }\n";
    var scss = ".foo {\n  @supports (foo: bar) {\n    @at-root (without: supports) {\n      .bar {\n        a: b;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_without_rule', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2574-L2590
    // v3.3.0

    var css = "@media screen {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @at-root (without: rule) {\n      .bar {\n        a: b;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_without_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2592-L2608
    // v3.3.0

    var css = "@fblthp {}\n.foo .bar {\n  a: b; }\n";
    var scss = ".foo {\n  @fblthp {\n    @at-root (without: fblthp) {\n      .bar {\n        a: b;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_without_multiple', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2610-L2628
    // v3.3.0

    var css = "@supports (foo: bar) {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @supports (foo: bar) {\n      @at-root (without: media rule) {\n        .bar {\n          a: b;\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_without_all', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2630-L2649
    // v3.3.0

    var css = "@supports (foo: bar) {\n  @fblthp {} }\n.bar {\n  a: b; }\n";
    var scss = ".foo {\n  @supports (foo: bar) {\n    @fblthp {\n      @at-root (without: all) {\n        .bar {\n          a: b;\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_media', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2651-L2672
    // v3.3.0

    var css = "@media screen {\n  @fblthp {}\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @fblthp {\n      @supports (foo: bar) {\n        @at-root (with: media) {\n          .bar {\n            a: b;\n          }\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_rule', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2674-L2695
    // v3.3.0

    var css = "@media screen {\n  @fblthp {} }\n.foo .bar {\n  a: b; }\n";
    var scss = ".foo {\n  @media screen {\n    @fblthp {\n      @supports (foo: bar) {\n        @at-root (with: rule) {\n          .bar {\n            a: b;\n          }\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_supports', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2697-L2719
    // v3.3.0

    var css = "@media screen {\n  @fblthp {} }\n@supports (foo: bar) {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @fblthp {\n      @supports (foo: bar) {\n        @at-root (with: supports) {\n          .bar {\n            a: b;\n          }\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2721-L2743
    // v3.3.0

    var css = "@media screen {\n  @fblthp {} }\n@fblthp {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @fblthp {\n      @supports (foo: bar) {\n        @at-root (with: fblthp) {\n          .bar {\n            a: b;\n          }\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_multiple', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2745-L2766
    // v3.3.0

    var css = "@media screen {\n  @fblthp {}\n  .foo .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @fblthp {\n      @supports (foo: bar) {\n        @at-root (with: media rule) {\n          .bar {\n            a: b;\n          }\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_with_all', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2768-L2790
    // v3.3.0

    var css = "@media screen {\n  @fblthp {\n    @supports (foo: bar) {\n      .foo .bar {\n        a: b; } } } }\n";
    var scss = ".foo {\n  @media screen {\n    @fblthp {\n      @supports (foo: bar) {\n        @at-root (with: all) {\n          .bar {\n            a: b;\n          }\n        }\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_dynamic_values', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2792-L2810
    // v3.3.0

    var css = "@media screen {\n  .bar {\n    a: b; } }\n";
    var scss = "$key: with;\n$value: media;\n.foo {\n  @media screen {\n    @at-root ($key: $value) {\n      .bar {\n        a: b;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_interpolated_query', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2812-L2828
    // v3.3.0

    var css = "@media screen {\n  .bar {\n    a: b; } }\n";
    var scss = ".foo {\n  @media screen {\n    @at-root (#{\"with: media\"}) {\n      .bar {\n        a: b;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_at_root_plus_extend', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2830-L2849
    // v3.3.0

    var css = ".foo .bar {\n  a: b; }\n";
    var scss = "%base {\n  a: b;\n}\n\n.foo {\n  @media screen {\n    @at-root (without: media) {\n      .bar {\n        @extend %base;\n      }\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_nested_mixin_def_is_scoped', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L2853-L2863
    // v3.3.0

    err_message("foo {\n  @mixin bar {a: b}}\nbar {@include bar}\n", "Undefined mixin 'bar'.", {syntax: 'scss'}, done)
  });

  it('test_failed_parent_selector_with_suffix', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L3059-L3099
    // v3.3.0

    function e() {err_message(".foo + {\n  &-bar {a: b}\n}\n", "Invalid parent selector for \"&-bar\": \".foo +\"", {syntax: 'scss'}, done)}
    function d() {err_message(":not(.foo) {\n  &-bar {a: b}\n}\n", "Invalid parent selector for \"&-bar\": \":not(.foo)\"", {syntax: 'scss'}, e)}
    function c() {err_message("::nth-child(2n+1) {\n  &-bar {a: b}\n}\n", "Invalid parent selector for \"&-bar\": \"::nth-child(2n+1)\"", {syntax: 'scss'}, d)}
    function b() {err_message("[foo=bar] {\n  &-bar {a: b}\n}\n", "Invalid parent selector for \"&-bar\": \"[foo=bar]\"", {syntax: 'scss'}, c)}
    err_message("* {\n  &-bar {a: b}\n}\n", "Invalid parent selector for \"&-bar\": \"*\"", {syntax: 'scss'}, b)
  });

  it('test_parent_ref_in_nested_at_root', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/scss_test.rb#L3114-L3130
    // v3.3.0

    var css = "#test {\n  border: 0; }\n  #test:hover {\n    display: none; }\n";
    var scss = "a {\n  @at-root #test {\n    border: 0;\n    &:hover{\n      display: none;\n    }\n  }\n}\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_multiple_block_directives', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/scss/css_test.rb#L572-L579
    // v3.3.0

    var source = "@foo bar {\n  a: b; }\n@bar baz {\n  c: d; }\n";

    parses(source, {syntax: 'scss'}, done)
  });

  it('test_normalized_map_does_not_error_when_released', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util/normalized_map_test.rb#L21-L26
    // v3.3.0

    eval_equal('Opal.Sass.$$scope.Util.$$scope.NormalizedMap.$new().$invert().$to_s()', '"{}"', {}, done)
  });

  it('test_basic_lifecycle', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util/normalized_map_test.rb#L28-L41
    // v3.3.0

    var pre = 'var m = Opal.Sass.$$scope.Util.$$scope.NormalizedMap.$new();m[\'$[]=\']("a-b", 1);';

    function i() {eval_equal(pre +'m[\'$[]=\']("a_b", 2);m.$as_stored().$to_s()', '"{\\\"a_b\\\"=>2}"', {}, done)};
    function h() {eval_equal(pre +'m.$delete(\'a-b\');!m[\'$has_key?\'](\'a-b\')', 'true', {}, i)};
    function g() {eval_equal(pre +'m.$delete(\'a-b\')', '1', {}, h)};
    function f() {eval_equal(pre +'m.$as_stored().$to_s()', '"{\\\"a-b\\\"=>1}"', {}, g)};
    function e() {eval_equal(pre +'m[\'$has_key?\'](\'a-b\')', 'true', {}, f)};
    function d() {eval_equal(pre +'m[\'$has_key?\'](\'a_b\')', 'true', {}, e)};
    function c() {eval_equal(pre +'m[\'$[]\'](\'a-b\')', '1', {}, d)};
    function b() {eval_equal(pre +'m[\'$[]\'](\'a_b\')', '1', {}, c)};
    eval_equal(pre + 'm.$keys().$to_s()', '"[\\\"a_b\\\"]"', {}, b);
  });

  it('test_dup', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util/normalized_map_test.rb#L43-L50
    // v3.3.0

    var pre = 'var m = Opal.Sass.$$scope.Util.$$scope.NormalizedMap.$new();m[\'$[]=\']("a-b", 1);var m2=m.$dup();m.$delete(\'a-b\');';
    function b() {eval_equal( pre + 'm2[\'$has_key?\'](\'a-b\')', 'true', {}, done)};
    eval_equal(pre + '!m[\'$has_key?\'](\'a-b\')', 'true', {}, b);
  });

  it('test_map_hash_with_normalized_map', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util_test.rb#L45-L52
    // v3.3.0

    var pre = 'var m=Opal.Sass.$$scope.Util.$$scope.NormalizedMap.$new(Opal.hash2(["foo-bar", "baz_bang"], {"foo-bar": 1, "baz_bang": 2}));var T,result=($a=($b=Opal.Sass.$$scope.Util).$map_hash,$a.$$p=(T=function($,l){T.$$s||this;return null==$&&($=nil),null==l&&(l=nil),[$,l.$to_s()]},T.$$s=self,T.$$arity=2,T),$a).call($b,m);';

    function d() {eval_equal(pre + 'result[\'$[]\']("baz_bang")', '"2"', {}, done)};
    function c() {eval_equal(pre + 'result[\'$[]\']("baz-bang")', '"2"', {}, d)};
    function b() {eval_equal(pre + 'result[\'$[]\']("foo_bar")', '"1"', {}, c)};

    eval_equal(pre + 'result[\'$[]\']("foo-bar")', '"1"', {}, b);
  });

  it('test_flatten_vertically', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util_test.rb#L214-L219
    // v3.3.0

    // we have to cheat a tiny bit, and compare the stringified versions of the array rather than true ararys because of the strict equality
    // we are using the test suite.
    function d() {eval_equal('Opal.Sass.$$scope.Util.$flatten_vertically([[1, 2, 3], [4, 5], 6]).$to_s()', '"[1, 4, 6, 2, 5, 3]"', {}, done)}
    function c() {eval_equal('Opal.Sass.$$scope.Util.$flatten_vertically([1, [2, 3], [4, 5, 6]]).$to_s()', '"[1, 2, 4, 3, 5, 6]"', {}, d)}
    function b() {eval_equal('Opal.Sass.$$scope.Util.$flatten_vertically([[1, 2], [3, 4], [5, 6]]).$to_s()', '"[1, 3, 5, 2, 4, 6]"', {}, c)}
    eval_equal('Opal.Sass.$$scope.Util.$flatten_vertically([1, 2, 3]).$to_s()', '"[1, 2, 3]"', {}, b)
  });

  it('test_json_escape_string', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util_test.rb#L348-L354
    // v3.3.0

    function d() {eval_equal('Opal.Sass.$$scope.Util.$json_escape_string("\\b\\f\\n\\r\\t")', '"\\\\b\\\\f\\\\n\\\\r\\\\t"', {}, done)}
    function c() {eval_equal('Opal.Sass.$$scope.Util.$json_escape_string("\'\\\"\\\\\'")',  '"\'\\\\\\"\\\\\\\\\'"', {}, d)}
    function b() {eval_equal('Opal.Sass.$$scope.Util.$json_escape_string("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")', '"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"', {}, c)}
    eval_equal('Opal.Sass.$$scope.Util.$json_escape_string(\"\")', '""', {}, b)
  });

  it('test_json_value_of', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util_test.rb#L360-L370
    // v3.3.0

    function h() {eval_equal('Opal.Sass.$$scope.Util.$json_value_of([1, "some\\nstr,ing", false, Opal.nil])', '"[1,\\\"some\\\\nstr,ing\\\",false,null]"', {}, done)}
    function g() {eval_equal('Opal.Sass.$$scope.Util.$json_value_of("Multi\\nLine\\rString")', '"\\\"Multi\\\\nLine\\\\rString\\\""', {}, h)}
    function f() {eval_equal('Opal.Sass.$$scope.Util.$json_value_of("\\\"\\\"")', '"\\\"\\\\\\\"\\\\\\\"\\\""', {}, g)}
    function e() {eval_equal('Opal.Sass.$$scope.Util.$json_value_of("")', '"\\\"\\\""', {}, f)}
    function d() {eval_equal('Opal.Sass.$$scope.Util.$json_value_of(false)', '"false"', {}, e)}
    function c() {eval_equal('Opal.Sass.$$scope.Util.$json_value_of(true)', '"true"', {}, d)}
    function b() {eval_equal('Opal.Sass.$$scope.Util.$json_value_of(-42)', '"-42"', {}, c)}
    eval_equal('Opal.Sass.$$scope.Util.$json_value_of(0)', '"0"', {}, b)
  });

  it('test_vlq', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/util_test.rb#L376-L381
    // v3.3.0

    function d() {eval_equal('Opal.Sass.$$scope.Util.$encode_vlq(120)', '"wH"', {}, done)}
    function c() {eval_equal('Opal.Sass.$$scope.Util.$encode_vlq(16)', '"gB"', {}, d)}
    function b() {eval_equal('Opal.Sass.$$scope.Util.$encode_vlq(15)', '"e"', {}, c)}
    eval_equal('Opal.Sass.$$scope.Util.$encode_vlq(0)', '"A"', {}, b)
  });

  it('test_bool', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L8-L13
    // v3.3.0

    function d() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Bool.$$scope.TRUE', 'Opal.Opal.$bool(Opal.Object.$new())', {}, done)}
    function c() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Bool.$$scope.FALSE', 'Opal.Opal.$bool(Opal.nil)', {}, d)}
    function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Bool.$$scope.FALSE', 'Opal.Opal.$bool(false)', {}, c)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Bool.$$scope.TRUE', 'Opal.Opal.$bool(true)', {}, b)
  });

  it('test_hex_color_without_hash', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L23-L29
    // v3.3.0

    function d() {eval_equal('Opal.Opal.$hex_color("FF007F").$alpha().valueOf()', '1', {}, done)}
    function c() {eval_equal('Opal.Opal.$hex_color("FF007F").$blue().valueOf()', '127', {}, d)}
    function b() {eval_equal('Opal.Opal.$hex_color("FF007F").$green().valueOf()', '0', {}, c)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hex_color("FF007F").$red().valueOf()', '255', {}, b)
  });

  it('test_hex_color_with_hash', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L31-L37
    // v3.3.0

    function d() {eval_equal('Opal.Opal.$hex_color("#FF007F").$alpha().valueOf()', '1', {}, done)}
    function c() {eval_equal('Opal.Opal.$hex_color("#FF007F").$blue().valueOf()', '127', {}, d)}
    function b() {eval_equal('Opal.Opal.$hex_color("#FF007F").$green().valueOf()', '0', {}, c)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hex_color("#FF007F").$red().valueOf()', '255', {}, b)
  });

  it('test_malformed_hex_color', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L39-L46
    // v3.3.0

    function b() {eval_err('Opal.Opal.$hex_color("#abcd")', '"#abcd" is not a valid hex color.', {}, done)}
    eval_err('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hex_color("green")', '"green" is not a valid hex color.', {}, b)
  });

  it('test_hex_color_with_alpha', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L49-L52
    // v3.3.0

    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hex_color("FF007F", 0.5).$alpha().valueOf()', '0.5', {}, done)
  });

  it('test_hsl_color_without_alpha', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L60-L66
    // v3.3.0

    function d() {eval_equal('Opal.Opal.$hsl_color(1, 0.5, 1).$alpha().valueOf()', '1', {}, done)}
    function c() {eval_equal('Opal.Opal.$hsl_color(1, 0.5, 1).$lightness().valueOf()', '1', {}, d)}
    function b() {eval_equal('Opal.Opal.$hsl_color(1, 0.5, 1).$saturation().valueOf()', '0.5', {}, c)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hsl_color(1, 0.5, 1).$hue()', '1', {}, b)
  });

  it('test_hsl_color_with_alpha', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L68-L74
    // v3.3.0

    function d() {eval_equal('Opal.Opal.$hsl_color(1, 0.5, 1, 0.5).$alpha().valueOf()', '0.5', {}, done)}
    function c() {eval_equal('Opal.Opal.$hsl_color(1, 0.5, 1, 0.5).$lightness().valueOf()', '1', {}, d)}
    function b() {eval_equal('Opal.Opal.$hsl_color(1, 0.5, 1, 0.5).$saturation().valueOf()', '0.5', {}, c)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hsl_color(1, 0.5, 1, 0.5).$hue()', '1', {}, b)
  });

  it('test_rgb_color_without_alpha', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L76-L82
    // v3.3.0

    function d() {eval_equal('Opal.Opal.$rgb_color(255, 0, 0).$alpha().valueOf()', '1', {}, done)}
    function c() {eval_equal('Opal.Opal.$rgb_color(255, 0, 0).$blue().valueOf()', '0', {}, d)}
    function b() {eval_equal('Opal.Opal.$rgb_color(255, 0, 0).$green().valueOf()', '0', {}, c)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$rgb_color(255, 0, 0).$red().valueOf()', '255', {}, b)
  });

  it('test_rgb_color_with_alpha', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L84-L90
    // v3.3.0

    function d() {eval_equal('Opal.Opal.$rgb_color(255, 255, 255, 0.5).$alpha().valueOf()', '0.5', {}, done)}
    function c() {eval_equal('Opal.Opal.$rgb_color(255, 255, 255, 0.5).$blue().valueOf()', '255', {}, d)}
    function b() {eval_equal('Opal.Opal.$rgb_color(255, 255, 255, 0.5).$green().valueOf()', '255', {}, c)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$rgb_color(255, 255, 255, 0.5).$red().valueOf()', '255', {}, b)
  });

  it('test_number', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L92-L96
    // v3.3.0

    function b() {eval_equal('Opal.Opal.$number(1).$to_sass()', '"1"', {}, done)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1).$value().valueOf()', '1', {}, b)
  });

  it('test_number_with_single_unit', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L98-L102
    // v3.3.0

    function b() {eval_equal('Opal.Opal.$number(1, "px").$to_sass()', '"1px"', {}, done)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1, "px").$value().valueOf()', '1', {}, b)
  });

  it('test_number_with_singal_numerator_and_denominator', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L104-L107
    // v3.3.0

    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1, "px/em").$to_sass()', '"1px/em"', {}, done)
  });

  it('test_number_with_many_numerator_and_denominator_units', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L109-L112
    // v3.3.0

    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1, "px*in/em*%").$to_sass()', '"1in*px/%*em"', {}, done)
  });

  it('test_number_with_many_numerator_and_denominator_units_with_spaces', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L114-L117
    // v3.3.0

    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1, "px * in / em * %").$to_sass()', '"1in*px/%*em"', {}, done)
  });

  it('test_number_with_malformed_units', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L119-L129
    // v3.3.0

    function c() {eval_err('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1, "px/")', 'Malformed unit string: px/', {}, done)}
    function b() {eval_err('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1, "/")', 'Malformed unit string: /', {}, c)}
    eval_err('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$number(1, "px/em/%")', 'Malformed unit string: px/em/%', {}, b)
  });

  it('test_missing_list_type', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L145-L149
    // v3.3.0

    eval_err('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$list(Opal.Opal.$number(1, "px"), Opal.Opal.$hex_color("#f71"))', "A list type of :space or :comma must be specified.", {}, done)
  });

  it('test_quoted_string', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L155-L162
    // v3.3.0

    function b() {eval_equal('var l = Opal.Opal.$quoted_string("sassy string");l["$options="](Opal.hash());l.$to_sass()', '"\\\"sassy string\\\""', {}, done)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);var l = Opal.Opal.$quoted_string("sassy string");l["$options="](Opal.hash());l.$value().valueOf()', '"sassy string"', {}, b)
  });

  it('test_identifier', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L164-L171
    // v3.3.0

    function b() {eval_equal('var l=Opal.Opal.$identifier("a-sass-ident");l["$options="](Opal.hash());l.$to_sass()', '"a-sass-ident"', {}, done)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);var l=Opal.Opal.$identifier("a-sass-ident");l["$options="](Opal.hash());l.$value().valueOf()', '"a-sass-ident"', {}, b)
  });

  it('test_unquoted_string', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L173-L180
    // v3.3.0

    function b() {
      eval_equal('Opal.Opal.$unquoted_string("a-sass-ident").$to_sass()', '"a-sass-ident"', {}, done)}
    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$unquoted_string("a-sass-ident").$value().valueOf()', '"a-sass-ident"', {}, b)
  });

  it('test_block_directive_with_semicolon', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L576-L587
    // v3.1.0

    var css = "@foo {\n  a: b; }\n@bar {\n  a: b; }\n";
    var scss = "@foo {a:b};\n@bar {a:b};\n";

    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_ruby_equality', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L241-L249
    // v3.3.0

    function g() { eval_equal(func_parse('foo'), func_parse('foo'), {}, done)}
    function f() { eval_equal(func_parse("1"), func_parse("1.0"), {}, g)}
    function e() { eval_equal(func_parse("1 2 3.0"), func_parse('1 2 3'), {}, f)}
    function d() { eval_equal(func_parse("1, 2, 3.0"), func_parse("1, 2, 3"), {}, e)}
    function c() { eval_equal(func_parse("(1 2), (3, 4), (5 6)"), func_parse("(1 2), (3, 4), (5 6)"), {}, d)}
    function b() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1, 2, 3", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new()).$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1 2 3", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).$value().valueOf()', 'false', {}, c)}
    eval_equal(func_parse("1"), func_parse("1"), {}, b)
  });

  it('test_slash_divides_with_variable', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L384-L388
    // v3.3.0

    function c() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()));Opal.Sass.$$scope.Script.$$scope.Parser.$parse("$var/2px", 0, 0).$perform(env).$value().valueOf()',0.5, {}, done) }
    function b() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("2px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()));Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px/$var", 0, 0).$perform(env).$value().valueOf()', 0.5, {}, c) }
    eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px/2px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$value().valueOf());Opal.Sass.$$scope.Script.$$scope.Parser.$parse("$var", 0, 0).$perform(env)', 0.5, {}, b)
  });

  it('test_extend_within_disparate_unknown_directive', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L937-L947
    // v3.3.0

    var css = "@flooblehoof {\n  .foo, .bar {\n    a: b; } }\n@flooblehoof {}\n";
    var scss = "@flooblehoof {.foo {a: b}}\n@flooblehoof {.bar {@extend .foo}}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_element_unification_with_namespaced_universal_target', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L225-L234
    // v3.3.0

    function fourth() { unification('ns|*.foo', 'ns|a {@extend .foo}', 'ns|*.foo, ns|a', {syntax: 'scss'}, done) }

    function third() {
      extend_doesnt_match(function (filename, syntax, cb) {
        render_unification('ns1|*.foo', 'ns2|a {@extend .foo}', {filename: filename + '.' + syntax, syntax: syntax}, cb, true)}, 'ns2|a', '.foo', 'failed_to_unify', 2, 'test_element_unification_with_namespaced_universal_target', 'scss', fourth)
    }
    function second() { unification('ns|*.foo', '*|a {@extend .foo}', 'ns|*.foo, ns|a', {syntax: 'scss'}, third) }
    unification('ns|*.foo', 'a {@extend .foo}', 'ns|*.foo, ns|a', {syntax: 'scss'}, third)
  });

  it('test_extend_warns_when_extension_fails', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/extend_test.rb#L1075-L1084
    // v3.3.0


    err_message("a.bar {a: b}\nb.foo {@extend .bar}\n", "\"b.foo\" failed to @extend \".bar\".\nNo selectors matching \".bar\" could be unified with \"b.foo\".\nUse \"@extend .bar !optional\" if the extend should be able to fail.\n", {syntax: 'scss'}, done)
  })

  it('test_only_kw_args', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1439-L1441
    // v3.3.0

    eval_equal('(function($b){var s=$b.$$scope.Functions;Opal.defn(s,"$only_kw_args",function(k){return $b.$$scope.String.$new("only-kw-args("+k.$keys().$join(", ")+")")},0);s.$declare("only_kw_args",[],Opal.hash2(["var_kwargs"],{"var_kwargs":true}))})(Opal.Sass.$$scope.Script.$$scope.Value);' + func_parse("only-kw-args($a: 1, $b: 2, $c: 3)"), '"only-kw-args(a, b, c)"', {}, done)
  });


  if (semver.lt(window.__libVersion, "3.3.4")) {
    // typo in warning message was correceted in 3.3.4
    it('test_index_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1272-L1306
      // v3.3.0


      function ninth(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"!= null\" on\\nthe return value.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      function eigth(result) {
        eval_equal(func_parse("null != index(1, 2 3 4)"), '"true"', {}, ninth)
      }

      function seventh(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"== false\" on\\nthe return value. For example, instead of \"@if index(...) == false\", just write\\n\"@if index(...)\".\\n        \\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)
            eigth();
        })
      }

      function sixth(result) {
        eval_equal(func_parse("false == index(1, 2 3 4)"), '"true"', {}, seventh)
      }

      function fifth(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"!= null\" on\\nthe return value.\\n        \\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)
            sixth();
        })
      }

      function fourth(result) {
        eval_equal(func_parse("index(1, 2 3 4) != null"), '"true"', {}, fifth)
      }

      function third(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"== false\" on\\nthe return value. For example, instead of \"@if index(...) == false\", just write\\n\"@if index(...)\".\\n        \\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            fourth();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        eval_equal(func_parse("index(1, 2 3 4) == false"), '"true"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_index', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1268-L1269
      // v3.3.0

      function b() {eval_equal(func_parse("index((foo: bar, bar: baz), (foo: bar))"), '"false"', {}, done)}
      eval_equal(func_parse("index((foo: bar, bar: baz), (foo bar))"), '"1"', {}, b)

    });

    it('test_color_checks_input', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L23-L26
      // v3.3.0

      function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new( [256, 2, 3] )', "Red value 256 must be between 0 and 255", {}, done)}
      eval_err('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new( [1, 2, -1] )', "Blue value -1 must be between 0 and 255", {}, b);
    });


  }

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_user_defined_function_can_change_global_variable', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/engine_test.rb#L1378-L1389
      // v3.3.0

      function second() {
        var css = "bar {\n  a: 5; }\n";
        var sass = "$variable: 0\nbar\n  $local: 10\n  -no-op: set-a-variable(variable, 5)\n  a: $variable\n";

        equal(sass, css, {syntax: 'sass'}, done)
      }

      var pre = "!function(e){var $=e.$$scope.Functions;Opal.defn($,'$set_a_variable',function($,n){return this.$environment().$set_var($.$value(),n),e.$$scope.Value.$$scope.Null.$new()},2)}(Opal.Sass.$$scope.Script);"

        sassBuilder({eval: pre, options: {}}, second)
    });

    it('test_percentage_deprecated_arg_name', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L126-L130
      // v3.3.0

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({eval: func_parse("percentage($value: 0.5)") + ";console.warn.callCount===1&&console.warn.calledWith(\"DEPRECATION WARNING: The `$value' argument for `percentage()' has been renamed to `$number'.\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_round_deprecated_arg_name', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L145-L149
      // v3.3.0

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({eval: func_parse("round($value: 5.49px)") + ";console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The `$value\\\' argument for `round()\\\' has been renamed to `$number\\\'.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_floor_deprecated_arg_name', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L161-L165
      // v3.3.0

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({eval: func_parse("floor($value: 4.8px)") + ";console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The `$value\\\' argument for `floor()\\\' has been renamed to `$number\\\'.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_ceil_deprecated_arg_name', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L177-L181
      // v3.3.0

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({eval: func_parse("ceil($value: 4.8px)") + ";console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The `$value\\\' argument for `ceil()\\\' has been renamed to `$number\\\'.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true);
          done();
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_abs_deprecated_arg_name', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L195-L199
      // v3.3.0

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({eval: func_parse("abs($value: 5px)") + ";console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The `$value\\\' argument for `abs()\\\' has been renamed to `$number\\\'.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true);
          done();
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_mix_deprecated_arg_name', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L843-L867
      // v3.3.0

      function seventh() {
        sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith(\"DEPRECATION WARNING: The `$color_1' argument for `mix()' has been renamed to `$color1'.\\n\")&&console.warn.calledWith(\"DEPRECATION WARNING: The `$color_2' argument for `mix()' has been renamed to `$color2'.\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      function sixth(result) {
        var css = '"rgba(0, 0, 255, 0.5)"'
          var scss = func_parse("mix($color_1: transparentize(#f00, 1), $color_2: #00f)")

          eval_equal(scss, css, {syntax: 'scss'}, seventh)
      }

      function fifth() {
        sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith(\"DEPRECATION WARNING: The `$color-1' argument for `mix()' has been renamed to `$color1'.\\n\")&&console.warn.calledWith(\"DEPRECATION WARNING: The `$color-2' argument for `mix()' has been renamed to `$color2'.\\n\")===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)
            sixth();
        })
      }

      function fourth(result) {
        var css = '"rgba(0, 0, 255, 0.5)"'
          var scss = func_parse("mix($color-1: transparentize(#f00, 1), $color-2: #00f)")

          eval_equal(scss, css, {syntax: 'scss'}, fifth)
      }

      function third() {
        sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith(\"DEPRECATION WARNING: The `$color-1' argument for `mix()' has been renamed to `$color1'.\\n\")&&console.warn.calledWith(\"DEPRECATION WARNING: The `$color-2' argument for `mix()' has been renamed to `$color2'.\\n\")===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)
            fourth();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined)
          var css = '"rgba(255, 0, 0, 0)"'
          var scss = func_parse("mix($color-1: transparentize(#f00, 1), $color-2: #00f, $weight: 100%)")

          eval_equal(scss, css, {syntax: 'scss'}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'sass'}}, second)
    });

    it('test_map_get_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1460-L1468
      // v3.3.0

      function second(result) {
        expect(result.err).to.be(undefined);
        sassBuilder({eval: func_parse("map-get((foo 1) (bar 2), foo)") + ";console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing lists of pairs to map-get is deprecated and will\\nbe removed in future versions of Sass. Use Sass maps instead. For details, see\\nhttp://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#maps.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_map_merge_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1483-L1501
      // v3.3.0

      function fifth(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing lists of pairs to map-merge is deprecated and will\\nbe removed in future versions of Sass. Use Sass maps instead. For details, see\\nhttp://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#maps.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      function fourth(result) {
        eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-merge((baz: 3), (foo 1, bar 2))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(baz: 3, foo: 1, bar: 2)"', {}, fifth)
      }

      function third(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing lists of pairs to map-merge is deprecated and will\\nbe removed in future versions of Sass. Use Sass maps instead. For details, see\\nhttp://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#maps.\\n        \\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            fourth();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-merge((foo 1, bar 2), (baz: 3))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, bar: 2, baz: 3)"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_map_keys_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1535-L1544
      // v3.3.0

      function third(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing lists of pairs to map-keys is deprecated and will\\nbe removed in future versions of Sass. Use Sass maps instead. For details, see\\nhttp://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#maps.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-keys((foo 1, bar 2))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"foo, bar"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_map_values_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1557-L1565
      // v3.3.0

      function third(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing lists of pairs to map-values is deprecated and will\\nbe removed in future versions of Sass. Use Sass maps instead. For details, see\\nhttp://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#maps.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-values((foo 1, bar 2))\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"1, 2"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_map_has_key_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1577-L1585
      // v3.3.0

      function third(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing lists of pairs to map-has-key is deprecated and will\\nbe removed in future versions of Sass. Use Sass maps instead. For details, see\\nhttp://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#maps.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        eval_equal(func_parse("map-has-key((foo 1, bar 1), foo)"), '"true"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_color_checks_rgba_input', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L28-L31
      // v3.3.0

      function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new( [1, 2, 3, 1.1] )', "Alpha channel 1.1 must be between 0 and 1", {}, done)}
      eval_err('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new( [1, 2, 3, -0.1] )', "Alpha channel -0.1 must be between 0 and 1", {}, b);
    });

    it('test_string_escapes', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L49-L50
      // v3.3.0

      function b() { eval_equal(func_parse("transparent"), '"transparent"', {}, done) }
      eval_equal(func_parse("rgba(0, 0, 0, 0)"), '"transparent"', {}, b)
    });

    it('test_map_cannot_have_duplicate_keys', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L513-L529
      // v3.3.0

      function e() {eval_err(func_parse('(blue: bar, #00f: baz)'), "Duplicate key #0000ff in map (blue: bar, blue: baz).", {}, done)}
      function d() {eval_err(func_parse('(2px: bar, 1px + 1px: baz)'), "Duplicate key 2px in map (2px: bar, 1px + 1px: baz).", {}, e)}
      function c() {eval_err(func_parse('(foo: bar, \'foo\': baz)'), "Duplicate key \"foo\" in map (foo: bar, \"foo\": baz).", {}, d)}
      function b() {eval_err(func_parse('(foo: bar, fo + o: baz)'), "Duplicate key \"foo\" in map (foo: bar, fo + o: baz).", {}, c)}
      eval_err(func_parse('(foo: bar, foo: baz)'), "Duplicate key \"foo\" in map (foo: bar, foo: baz).", {}, b);
    });

    it('test_setting_global_variable_locally_warns', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L573-L598
      // v3.3.0

      function third(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 4 of test_setting_global_variable_locally_warns_inline.scss:\\nAssigning to global variable \"$var\" by default is deprecated.\\nIn future versions of Sass, this will create a new local variable.\\nIf you want to assign to the global variable, use \"$var: x !global\" instead.\\nNote that this will be incompatible with Sass 3.2.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        var css = ".foo {\n  a: x; }\n\n.bar {\n  b: x; }\n";
        var scss = "$var: 1;\n\n.foo {\n  $var: x;\n  a: $var;\n}\n\n.bar {\n  b: $var;\n}\n";
        equal(scss, css, {syntax: 'scss', filename: 'test_setting_global_variable_locally_warns_inline.scss'}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_setting_global_variable_locally_warns_only_once', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L600-L616
      // v3.3.0

      function third(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 3 of test_setting_global_variable_locally_warns_only_once_inline.scss:\\nAssigning to global variable \"$var\" by default is deprecated.\\nIn future versions of Sass, this will create a new local variable.\\nIf you want to assign to the global variable, use \"$var: x !global\" instead.\\nNote that this will be incompatible with Sass 3.2.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        var css = ""
          var scss = "$var: 1;\n\n@mixin foo {$var: x}\n@include foo;\n@include foo;\n@include foo;\n";
        equal(scss, css, {syntax: 'scss', filename: 'test_setting_global_variable_locally_warns_only_once_inline.scss'}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_hex_color_alpha_enforces_0_to_1', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L54-L58
      // v3.3.0

      eval_err('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hex_color("FF007F", 50)', 'Alpha channel 50 must be between 0 and 1', {}, done)
    });

    it('test_space_list', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L131-L136
      // v3.3.0

      eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);var l = Opal.Opal.$list(Opal.Opal.$number(1, "px"), Opal.Opal.$hex_color("#f71"), "space".$to_sym());l["$options="](Opal.hash());l.$to_sass()', '"1px #ff7711"', {}, done)
    });

    it('test_comma_list', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/value_helpers_test.rb#L138-L143
      // v3.3.0

      eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);var l = Opal.Opal.$list(Opal.Opal.$number(1, "px"), Opal.Opal.$hex_color("#f71"), "comma".$to_sym());l["$options="](Opal.hash());l.$to_sass()', '"1px, #ff7711"', {}, done)
    });

    it('test_map_remove_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1514-L1523
      // v3.3.0

      function third(result) {
        sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing lists of pairs to map-remove is deprecated and will\\nbe removed in future versions of Sass. Use Sass maps instead. For details, see\\nhttp://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#maps.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);
        eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-remove((foo 1, bar 2, baz 3), bar)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, baz: 3)"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })


    it('test_comparable_deprecated_arg_name', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1087-L1101
      // v3.3.0


      function fifth(result) {

        sassBuilder({eval:  "console.warn.callCount===2&&console.warn.calledWith('DEPRECATION WARNING: The `$number_1\\\' argument for `comparable()\\\' has been renamed to `$number1\\\'.\\n')&&console.warn.calledWith('DEPRECATION WARNING: The `$number_2\\\' argument for `comparable()\\\' has been renamed to `$number2\\\'.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {

          expect(result.css).to.be(true);
          expect(result.err).to.be(undefined);
          done();
        })
      }


      function fourth(result) {
        eval_equal(func_parse("comparable($number_1: 100px, $number_2: 3em)"), '"false"', {}, fifth)
      }

      function third(result) {
        sassBuilder({eval:  "console.warn.callCount===2&&console.warn.calledWith('DEPRECATION WARNING: The `$number-1\\\' argument for `comparable()\\\' has been renamed to `$number1\\\'.\\n')&&console.warn.calledWith('DEPRECATION WARNING: The `$number-2\\\' argument for `comparable()\\\' has been renamed to `$number2\\\'.\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {

          expect(result.css).to.be(true);
          expect(result.err).to.be(undefined);
          fourth();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        eval_equal(func_parse("comparable($number-1: 100px, $number-2: 3em)"), '"false"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

    it('test_map_remove', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L1508-L1512
      // v3.3.0

      function b() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-remove((foo: 1, bar: 2, baz: 3), bar)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, baz: 3)"', {}, done)}
      eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-remove((), foo)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"()"', {}, b)
    });

  }

  if (semver.lt(window.__libVersion, "3.4.14")) {
    it('test_mix', function(done) {
      // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/functions_test.rb#L826-L841
      // v3.3.0

      function n() { eval_equal(func_parse("mix(#f00, #00f)"), '"#7f007f"', {}, done) }
      function m() { eval_equal(func_parse("mix(#f00, #0ff)"), '"#7f7f7f"', {}, n) }
      function l() { eval_equal(func_parse("mix(#f70, #0aa)"), '"#7f9055"', {}, m) }
      function k() { eval_equal(func_parse("mix(#f00, #00f, 25%)"), '"#3f00bf"', {}, l) }
      function j() { eval_equal(func_parse("mix(rgba(255, 0, 0, 0.5), #00f)"), '"rgba(63, 0, 191, 0.75)"', {}, k) }
      function i() { eval_equal(func_parse("mix(#f00, #00f, 100%)"), '"red"', {}, j) }
      function h() { eval_equal(func_parse("mix(#f00, #00f, 0%)"), '"blue"', {}, i) }
      function g() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1))"), '"rgba(255, 0, 0, 0.5)"', {}, h) }
      function f() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f)"), '"rgba(0, 0, 255, 0.5)"', {}, g) }
      function e() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1), 100%)"), '"red"', {}, f) }
      function d() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f, 0%)"), '"blue"', {}, e) }
      function c() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1), 0%)"), '"rgba(0, 0, 255, 0)"', {}, d) }
      function b() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f, 100%)"), '"rgba(255, 0, 0, 0)"', {}, c) }
      eval_equal(func_parse("mix($color1: transparentize(#f00, 1), $color2: #00f, $weight: 100%)"), '"rgba(255, 0, 0, 0)"', {}, b)
    });
  }
}

/*****************************************************************************************************
 * v3.3.4
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.4")) {
  it('test_top_level_unknown_directive_in_at_root', function(done) {
    // https://github.com/sass/sass/blob/e267c436bd949d4ba404ba719b029701c96fa95e/test/sass/scss/scss_test.rb#L3103-L3112
    // v3.3.4

    var css = "@fblthp {\n  a: b; }\n";
    var scss = "@at-root {\n  @fblthp {a: b}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })


  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_index_deprecation_warning', function(done) {
      // https://github.com/sass/sass/blob/e267c436bd949d4ba404ba719b029701c96fa95e/test/sass/functions_test.rb#L1272-L1306
      // v3.3.4


      function ninth(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"!= null\" on\\nthe return value.\\n        \\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined);
          expect(result.css).to.be(true)
            done();
        })
      }

      function eigth(result) {
        eval_equal(func_parse("null != index(1, 2 3 4)"), '"true"', {}, ninth)
      }

      function seventh(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"== false\" on\\nthe return value. For example, instead of \"@if index(...) == false\", just write\\n\"@if not index(...)\".\\n        \\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)
            eigth();
        })
      }

      function sixth(result) {
        eval_equal(func_parse("false == index(1, 2 3 4)"), '"true"', {}, seventh)
      }

      function fifth(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"!= null\" on\\nthe return value.\\n        \\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.err).to.be(undefined)
            expect(result.css).to.be(true)
            sixth();
        })
      }

      function fourth(result) {
        eval_equal(func_parse("index(1, 2 3 4) != null"), '"true"', {}, fifth)
      }

      function third(result) {
        sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: The return value of index() will change from \"false\" to\\n\"null\" in future versions of Sass. For compatibility, avoid using \"== false\" on\\nthe return value. For example, instead of \"@if index(...) == false\", just write\\n\"@if not index(...)\".\\n        \\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
          expect(result.css).to.be(true)
            fourth();
        })
      }

      function second(result) {
        expect(result.err).to.be(undefined);

        eval_equal(func_parse("index(1, 2 3 4) == false"), '"true"', {}, third)
      }

      sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
    })

  }
}

/*****************************************************************************************************
 * v3.3.5
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.5")) {
  it('test_minus_preceded_by_comment', function(done) {
    // https://github.com/sass/sass/blob/48f303dddea69e38dd3110ad6109d51191658493/test/sass/script_test.rb#L697-L699
    // v3.3.5

    eval_equal(func_parse("15px/**/-10px"), '"15px -10px"', {}, done)
  })
}

/*****************************************************************************************************
 * v3.3.6
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.6")) {
  it('test_inspect_divided_numbers', function(done) {
    // https://github.com/sass/sass/blob/48f303dddea69e38dd3110ad6109d51191658493/test/sass/script_test.rb#L697-L699
    // v3.3.6

    function b() {eval_equal(func_parse("inspect((1px/2px))"), '"0.5"', {}, done)}

    eval_equal(func_parse("inspect(1px/2px)"), '"1px/2px"', {}, b)
  })

  //TODO This actually takes forever :[
  it.skip('test_very_long_comment_doesnt_take_forever', function(done) {
    // https://github.com/sass/sass/blob/4e1d0ce421e2abf0f267576aa0a4de5942704b37/test/sass/scss/css_test.rb#L1019-L1030
    // v3.3.6

    var str = Array(100000).join('asdf')
      var css = "/*\n  " + str + "\n*/";
    var scss = "/*\n  " + str + "\n*/";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_long_unclosed_comment_doesnt_take_forever', function(done) {
      // https://github.com/sass/sass/blob/4e1d0ce421e2abf0f267576aa0a4de5942704b37/test/sass/scss/css_test.rb#L1032-L1038
      // v3.3.6

      err_message("/*\n//**************************************************************************\n", 'Invalid CSS after "/*": expected /\\//, was "//*************..."', {syntax: 'scss'}, done)
    })
  }
}

/*****************************************************************************************************
 * v3.3.8
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.8")) {
  it('test_at_root_doesnt_always_break_blocks', function(done) {
    // https://github.com/sass/sass/blob/a2fd37ed1b9fdeec501b50e98e5cd837828db5ce/test/sass/scss/scss_test.rb#L2851-L2877
    // v3.3.8

    var css = ".foo {\n  a: b; }\n\n@media screen {\n  .foo {\n    c: d; }\n  .bar {\n    e: f; } }\n";
    var scss = "%base {\n  a: b;\n}\n\n@media screen {\n  .foo {\n    c: d;\n    @at-root (without: media) {\n      @extend %base;\n    }\n  }\n\n  .bar {e: f}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_empty_media_query_error', function(done) {
    // https://github.com/sass/sass/blob/a2fd37ed1b9fdeec501b50e98e5cd837828db5ce/test/sass/scss/scss_test.rb#L3129-L3137
    // v3.3.8

    err_message("@media #{\"\"} {\n  foo {a: b}\n}\n", 'Invalid CSS after "": expected media query list, was ""', {syntax: 'scss'}, done)
  })

  it('test_replace_subseq', function(done) {
    // https://github.com/sass/sass/blob/a2fd37ed1b9fdeec501b50e98e5cd837828db5ce/test/sass/util_test.rb#L82-L89
    // v3.3.8

    function c() {eval_equal("Opal.Sass.$$scope.Util.$replace_subseq([1, 2, 3, 4, 5], [4, 5, 6], ['a'.$to_sym(), 'b'.$to_sym()]).$to_s()", '"[1, 2, 3, 4, 5]"', {}, done)}
    function b() {eval_equal("Opal.Sass.$$scope.Util.$replace_subseq([1, 2, 3, 4, 5], [3, 4, 6], ['a'.$to_sym(), 'b'.$to_sym()]).$to_s()", '"[1, 2, 3, 4, 5]"', {}, c)}
    eval_equal("Opal.Sass.$$scope.Util.$replace_subseq([1, 2, 3, 4, 5], [3, 4], ['a'.$to_sym(), 'b'.$to_sym()]).$to_s()", '"[1, 2, \\\"a\\\", \\\"b\\\", 5]"', {}, b)
  })
}

/*****************************************************************************************************
 * v3.3.9
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.9")) {
  it('test_and_or_not_disallowed_as_function_names', function(done) {
    // https://github.com/sass/sass/blob/31bca26cf46e5321ea4af8b4c94799484b1b7dc2/test/sass/script_test.rb#L744-L753
    // v3.3.9

    function c() {err_message("@function not()\n  @return null\n", 'Invalid function name "not".', {syntax: 'scss'}, done)}
    function b() {err_message("@function or()\n  @return null\n", 'Invalid function name "or".', {syntax: 'scss'}, c)}
    err_message("@function and()\n  @return null\n", 'Invalid function name "and".', {syntax: 'scss'}, b)
  })

  it('test_extend_top_leveled_by_at_root', function(done) {
    // https://github.com/sass/sass/blob/31bca26cf46e5321ea4af8b4c94799484b1b7dc2/test/sass/scss/scss_test.rb#L2882-L2895
    // v3.3.9

    err_message(".span-10 {\n  @at-root (without: all) {\n    @extend %column;\n  }\n}\n", 'Extend directives may only be used within rules.', {syntax: 'scss'}, done)
  })

  if (semver.lt(window.__libVersion, "3.4.0")) {
    it('test_keyframes', function(done) {
      // https://github.com/sass/sass/blob/31bca26cf46e5321ea4af8b4c94799484b1b7dc2/test/sass/scss/css_test.rb#L656-L680
      // v3.3.9

      var css = "@keyframes identifier {\n  0% {\n    top: 0;\n    left: 0; }\n\n  30% {\n    top: 50px; }\n\n  68%, 72% {\n    left: 50px; }\n\n  100% {\n    top: 100px;\n    left: 100%; } }\n";
      var scss = "@keyframes identifier {\n  0% {top: 0; left: 0}\n  30% {top: 50px}\n  68%, 72% {left: 50px}\n  100% {top: 100px; left: 100%}\n}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })

    it('test_keyframes_rules_in_content', function(done) {
      // https://github.com/sass/sass/blob/31bca26cf46e5321ea4af8b4c94799484b1b7dc2/test/sass/scss/scss_test.rb#L906-L934
      // v3.3.9

      var css = "@keyframes identifier {\n  0% {\n    top: 0;\n    left: 0; }\n\n  30% {\n    top: 50px; }\n\n  68%, 72% {\n    left: 50px; }\n\n  100% {\n    top: 100px;\n    left: 100%; } }\n";
      var scss = "@mixin keyframes {\n  @keyframes identifier { @content }\n}\n\n@include keyframes {\n  0% {top: 0; left: 0}\n  30% {top: 50px}\n  68%, 72% {left: 50px}\n  100% {top: 100px; left: 100%}\n}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })

  }

}

/*****************************************************************************************************
 * v3.3.11
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.11")) {
  it('test_str_slice', function(done) {
    // https://github.com/sass/sass/blob/7389dba62e521775e25cccb7fda99c7891edc188/test/sass/functions_test.rb#L998
    // v3.3.11

    eval_equal(func_parse('str-slice(abcd,1,0)'), '""', {}, done);
  })
}

/*****************************************************************************************************
 * v3.3.14
 *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.3.14")) {
  it('test_unclosed_special_fun', function(done) {
    // https://github.com/sass/sass/blob/86e991adc70597d690f038892104a968dcc98933/test/sass/script_test.rb#L691-L701
    // v3.3.14

    function c() {eval_err(func_parse('calc(\#{foo'), 'Invalid CSS after "calc(#{foo": expected "}", was ""', {}, done)};
    function b() {eval_err(func_parse('calc(\#{\')\'}'), 'Invalid CSS after "calc(#{\')\'}": expected ")", was ""', {}, c)};
    eval_err(func_parse('calc(foo()'), 'Invalid CSS after "calc(foo()": expected ")", was ""', {}, b)
        })
    };

/*****************************************************************************************************
  * v3.4.0
  *****************************************************************************************************/
if (semver.gte(window.__libVersion, "3.4.0")) {
    it('test_line_numbers_with_dos_line_endings', function(done) {
      // https://github.com/sass/sass/blob/f2ff5d2d60a461f7b1ecfdb036c558ad6fa34fa2/test/sass/engine_test.rb#L2384-L2397
      // v3.4.0

      var css = "/* line 9, test_line_numbers_with_dos_line_endings_inline.sass */\n.foo {\n  a: b; }\n";
      var scss = "\r\n\r\n\r\n\r\n.foo\n  a: b\n";
      equal(scss, css, {syntax: 'sass', line_comments: true, filename: 'test_line_numbers_with_dos_line_endings_inline.sass'}, done)
    });

  it('test_protocol_relative_import', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L625-L628
    // v3.4.0

    var scss = "@import \"//fonts.googleapis.com/css?family=Droid+Sans\""
      var css = "@import \"//fonts.googleapis.com/css?family=Droid+Sans\";\n"
      equal(scss, css, {syntax: 'sass'}, done)
  });

  it('test_debug_info_in_keyframes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L1029-L1043
    // v3.4.0

    var css = "@-webkit-keyframes warm {\n  from {\n    color: black; }\n  to {\n    color: red; } }\n";
    var sass = "@-webkit-keyframes warm\n  from\n    color: black\n  to\n    color: red\n";
    equal(sass, css, {syntax: 'sass', debug_info: true}, done)
  });

  it('test_default_values_for_mixin_arguments', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L1136-L1208
    // v3.4.0

    function third() {
      var css = "one {\n  color: #fff;\n  padding: 1px;\n  margin: 4px; }\n\ntwo {\n  color: #fff;\n  padding: 2px;\n  margin: 5px; }\n\nthree {\n  color: #fff;\n  padding: 2px;\n  margin: 3px; }\n";
      var sass = "$a: 5px\n=foo($a, $b: 1px, $c: null)\n  $c: 3px + $b !default\n  color: $a\n  padding: $b\n  margin: $c\none\n  +foo(#fff)\ntwo\n  +foo(#fff, 2px)\nthree\n  +foo(#fff, 2px, 3px)\n";
      equal(sass, css, {syntax: 'sass'}, done)
    }

    function second() {
      var css = "one {\n  color: #fff;\n  padding: 1px;\n  margin: 4px; }\n\ntwo {\n  color: #fff;\n  padding: 2px;\n  margin: 5px; }\n\nthree {\n  color: #fff;\n  padding: 2px;\n  margin: 3px; }\n";
      var sass = "$a: 5px\n=foo($a, $b: 1px, $c: 3px + $b)\n  :color $a\n  :padding $b\n  :margin $c\none\n  +foo(#fff)\ntwo\n  +foo(#fff, 2px)\nthree\n  +foo(#fff, 2px, 3px)\n";
      equal(sass, css, {syntax: 'sass'}, third)
    }

    var css = "white {\n  color: #FFF; }\n\nblack {\n  color: #000; }\n";
    var sass = "=foo($a: #FFF)\n  :color $a\nwhite\n  +foo\nblack\n  +foo(#000)\n";
    equal(sass, css, {syntax: 'sass'}, second)
  })

  it('test_user_defined_function_can_change_global_variable', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L1388-L1399
    // v3.4.0

    function second() {
      var css = "bar {\n  a: 5; }\n";
      var sass = "$variable: 0\nbar\n  $local: 10\n  -no-op: set-a-global-variable(variable, 5)\n  a: $variable\n";

      equal(sass, css, {syntax: 'sass'}, done)
    }

    var pre = "!function(e){var $=e.$$scope.Functions;Opal.defn($,'$set_a_global_variable',function($,n){return this.$environment().$set_global_var($.$value(),n),e.$$scope.Value.$$scope.Null.$new()},2)}(Opal.Sass.$$scope.Script);"

      sassBuilder({eval: pre, options: {}}, second)
  });

  it('test_interpolation_deep_unquotes_strings', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L2017-L2025
    // v3.4.0

    var css = ".foo {\n  a: bar baz; }\n";
    var scss = ".foo\n  a: #{\"bar\" \"baz\"}\n";
    equal(scss, css, {syntax: 'sass'}, done)
  })

  it('test_error_throws_sass_objects', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L3136-L3141
    // v3.4.0

    function b() {err_message("$map: (a: 1, b: 2); @error $map", '(a: 1, b: 2)', {syntax: 'scss'}, done)}
    err_message("@error (a: 1, b: 2)", '(a: 1, b: 2)', {syntax: 'scss'}, b)
  })

  it('test_keyframes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L3171-L3197
    // v3.4.0

    var css = "@keyframes identifier {\n  0% {\n    top: 0;\n    left: 0; }\n  30% {\n    top: 50px; }\n  68%, 72% {\n    left: 50px; }\n  100% {\n    top: 100px;\n    left: 100%; } }\n";
    var sass = "@keyframes identifier\n  0%\n    top: 0\n    left: 0\n  #{\"30%\"}\n    top: 50px\n  68%, 72%\n    left: 50px\n  100%\n    top: 100px\n    left: 100%\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_prefixed_keyframes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L3199-L3225
    // v3.4.0

    var css = "@-moz-keyframes identifier {\n  0% {\n    top: 0;\n    left: 0; }\n  30% {\n    top: 50px; }\n  68%, 72% {\n    left: 50px; }\n  100% {\n    top: 100px;\n    left: 100%; } }\n";
    var sass = "@-moz-keyframes identifier\n  0%\n    top: 0\n    left: 0\n  #{\"30%\"}\n    top: 50px\n  68%, 72%\n    left: 50px\n  100%\n    top: 100px\n    left: 100%\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_uppercase_keyframes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L3227-L3253
    // v3.4.0

    var css = "@KEYFRAMES identifier {\n  0% {\n    top: 0;\n    left: 0; }\n  30% {\n    top: 50px; }\n  68%, 72% {\n    left: 50px; }\n  100% {\n    top: 100px;\n    left: 100%; } }\n";
    var sass = "@KEYFRAMES identifier\n  0%\n    top: 0\n    left: 0\n  #{\"30%\"}\n    top: 50px\n  68%, 72%\n    left: 50px\n  100%\n    top: 100px\n    left: 100%\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_negation_unification', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L312-L316
    // v3.4.0

    function second() { extend_equals(':not(.foo).baz', ':not(.foo) {@extend .baz}', ':not(.foo).baz, :not(.foo)', {syntax: 'scss'}, done) }
    extend_equals(':not(.foo).baz', ':not(.bar) {@extend .baz}', ':not(.foo).baz, :not(.foo):not(.bar)', {syntax: 'scss'}, second)
  });

  it('test_prefixed_pseudoclass_unification', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L318-L333
    // v3.4.0

    function third() { unification(':nth-child(2n+1 of .foo).baz', ':nth-child(2n+1 of .foo) {@extend .baz}', ':nth-child(2n+1 of .foo)', {syntax: 'scss'}, done) }
    function second() { unification(':nth-child(2n+1 of .foo).baz', ':nth-child(2n+1 of .bar) {@extend .baz}', ':nth-child(2n+1 of .foo).baz, :nth-child(2n+1 of .foo):nth-child(2n+1 of .bar)' , {syntax: 'scss'}, third) }
    unification(':nth-child(2n+1 of .foo).baz', ':nth-child(2n of .foo) {@extend .baz}', ':nth-child(2n+1 of .foo).baz, :nth-child(2n+1 of .foo):nth-child(2n of .foo)', {syntax: 'scss'}, second)
  });

  it('test_extend_into_mergeable_pseudoclasses', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L344-L362
    // v3.4.0

    function j() { extend_equals(':nth-last-child(n of .foo)', '.x {@extend .foo}', ':nth-last-child(n of .foo, .x)', {syntax: 'scss'}, done) }
    function i() { extend_equals(':nth-child(n of .foo)', '.x {@extend .foo}', ':nth-child(n of .foo, .x)', {syntax: 'scss'}, j) }
    function h() { extend_equals(':host-context(.foo)', '.x {@extend .foo}', ':host-context(.foo, .x)', {syntax: 'scss'}, i) }
    function g() { extend_equals(':host(.foo)', '.x {@extend .foo}', ':host(.foo, .x)', {syntax: 'scss'}, h) }
    function f() { extend_equals(':has(.foo)', '.x {@extend .foo}', ':has(.foo, .x)', {syntax: 'scss'}, g) }
    function e() { extend_equals(':current(.foo)', '.x {@extend .foo}', ':current(.foo, .x)', {syntax: 'scss'}, f) }
    function d() { extend_equals(':-moz-any(.foo)', '.x {@extend .foo}', ':-moz-any(.foo, .x)', {syntax: 'scss'}, e) }
    function c() { extend_equals(':matches(.foo.bar, .baz.bar)', '.x {@extend .bar}', ':matches(.foo.bar, .foo.x, .baz.bar, .baz.x)', {syntax: 'scss'}, d) }
    function b() { extend_equals(':matches(.foo.bar)', '.x {@extend .bar}', ':matches(.foo.bar, .foo.x)', {syntax: 'scss'}, c) }
    extend_equals(':matches(.foo)', '.x {@extend .foo}', ':matches(.foo, .x)', {syntax: 'scss'}, b)
  });

  it('test_extend_over_selector_pseudoclass', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L385-L391
    // v3.4.0

    function second() { extend_equals(':matches(.foo, .bar)', '.x {@extend :matches(.foo, .bar)}', ':matches(.foo, .bar), .x', {syntax: 'scss'}, done) }
    extend_equals(':not(.foo)', '.x {@extend :not(.foo)}', ':not(.foo), .x', {syntax: 'scss'}, second)
  });

  it('test_matches_within_not', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L393-L398
    // v3.4.0

    extend_equals(':not(.foo, .bar)', ':matches(.x, .y) {@extend .foo}', ':not(.foo, .x, .y, .bar)', {syntax: 'scss'}, done)
  });

  it('test_pseudoclasses_merge', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L400-L412
    // v3.4.0

    function e() {extend_equals(':nth-last-child(n of .foo)', ':nth-last-child(n of .bar) {@extend .foo}', ':nth-last-child(n of .foo, .bar)', {syntax: 'scss'}, done)}
    function d() {extend_equals(':nth-child(n of .foo)', ':nth-child(n of .bar) {@extend .foo}', ':nth-child(n of .foo, .bar)', {syntax: 'scss'}, e)}
    function c() {extend_equals(':current(.foo)', ':current(.bar) {@extend .foo}', ':current(.foo, .bar)', {syntax: 'scss'}, d)}
    function b() {extend_equals(':matches(.foo)', ':matches(.bar) {@extend .foo}', ':matches(.foo, .bar)', {syntax: 'scss'}, c)}
    extend_equals(':matches(.foo)', ':matches(.bar) {@extend .foo}', ':matches(.foo, .bar)', {syntax: 'scss'}, b)
  });

  it('test_nesting_pseudoclasses_merge', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L414-L421
    // v3.4.0

    function c() {extend_equals(':host-context(.foo)', ':host-context(.bar) {@extend .foo}', ':host-context(.foo, :host-context(.bar))', {syntax: 'scss'}, done)}
    function b() {extend_equals(':host(.foo)', ':host(.bar) {@extend .foo}', ':host(.foo, :host(.bar))', {syntax: 'scss'}, c)}
    extend_equals(':has(.foo)', ':has(.bar) {@extend .foo}', ':has(.foo, :has(.bar))', {syntax: 'scss'}, b)
  });

  it('test_not_unifies_with_unique_values', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L423-L426
    // v3.4.0

    function b() {unification('#foo', ':not(#bar) {@extend #foo}', ':not(#bar)', {syntax: 'scss'}, done)}
    unification('foo', ':not(bar) {@extend foo}', ':not(bar)', {syntax: 'scss'}, b)
  });

  it('test_not_adds_no_specificity', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L428-L430
    // v3.4.0

    specificity_equals(':not(.foo)', '.foo', done)
  });

  it('test_matches_has_a_specificity_range', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L432-L457
    // v3.4.0

    function second() {
      var css = ".a .b, .a .b:matches(.foo, #bar) {\n  a: b; }\n";
      var scss = ".a %x {a: b}\n.b {@extend %x}\n.b:matches(.foo, #bar) {@extend %x}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }

    var css = ":matches(.foo, #bar) .a, :matches(.foo, #bar) #b.a {\n  a: b; }\n";
    var scss = ":matches(.foo, #bar) %x {a: b}\n.a {@extend %x}\n#b.a {@extend %x}\n";
    equal(scss, css, {syntax: 'scss'}, second)
  })

  it('test_extend_into_matches_and_normal_extend', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L470-L479
    // v3.4.0

    var css = ".x:matches(.y, .bar), .foo:matches(.y, .bar) {\n  a: b; }\n";
    var scss = ".x:matches(.y) {a: b}\n.foo {@extend .x}\n.bar {@extend .y}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_multilayer_pseudoclass_extend', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L481-L490
    // v3.4.0

    var css = ":matches(.x, .foo, .bar) {\n  a: b; }\n";
    var scss = ":matches(.x) {a: b}\n.foo {@extend .x}\n.bar {@extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_basic_extend_loop', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1221-L1232
    // v3.4.0

    var css = ".foo, .bar {\n  a: b; }\n\n.bar, .foo {\n  c: d; }\n";
    var scss = ".foo {a: b; @extend .bar}\n.bar {c: d; @extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_three_level_extend_loop', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1234-L1249
    // v3.4.0

    var css = ".foo, .baz, .bar {\n  a: b; }\n\n.bar, .foo, .baz {\n  c: d; }\n\n.baz, .bar, .foo {\n  e: f; }\n";
    var scss = ".foo {a: b; @extend .bar}\n.bar {c: d; @extend .baz}\n.baz {e: f; @extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_cross_loop', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L869-L879
    // v3.4.0

    var css = ".foo.bar, .foo, .bar {\n  a: b; }\n";
    var scss = ".foo.bar {a: b}\n.foo {@extend .bar}\n.bar {@extend .foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_placeholder_in_selector_pseudoclass', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L1019-L1028
    // v3.4.0

    var css = ":matches(.bar, .baz) {\n  color: blue; }\n";
    var scss = ":matches(%foo) {color: blue}\n.bar {@extend %foo}\n.baz {@extend %foo}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_hsl_clamps_bounds', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L93-L96
    // v3.4.0

    function b() {eval_equal(func_parse('hsl(10, -114, 12)'), '"#1f1f1f"', {}, done)}
    eval_equal(func_parse('hsl(10, 10, 256%)'), '"white"', {}, b)
  })

  it('test_hsla_clamps_bounds', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L111-L116
    // v3.4.0

    function d() {eval_equal(func_parse('hsla(10, 10, 10, 1.1)'), '"#1c1817"', {}, done)}
    function c() {eval_equal(func_parse('hsla(10, 10, 10, -0.1)'), '"rgba(28, 24, 23, 0)"', {}, d)}
    function b() {eval_equal(func_parse('hsla(10, 10, 256%, 0)'), '"rgba(255, 255, 255, 0)"', {}, c)}
    eval_equal(func_parse('hsla(10, -114, 12, 1)'), '"#1f1f1f"', {}, b)
  })

  it('test_rgb_clamps_bounds', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L215-L221
    // v3.4.0

    function e() {eval_equal(func_parse('rgb(-1, 1, 1)'), '"#000101"', {}, done)}
    function d() {eval_equal(func_parse('rgb(1, 256, 257)'), '"#01ffff"', {}, e)}
    function c() {eval_equal(func_parse('rgb(1, 1, 256)'), '"#0101ff"', {}, d)}
    function b() {eval_equal(func_parse('rgb(1, 256, 1)'), '"#01ff01"', {}, c)}
    eval_equal(func_parse('rgb(256, 1, 1)'), '"#ff0101"', {}, b)
  })

  it('test_rgb_clamps_percent_bounds', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L223-L227
    // v3.4.0

    function c() {eval_equal(func_parse('rgb(0, 0, 101%)'), '"blue"', {}, done)}
    function b() {eval_equal(func_parse('rgb(0, -0.1%, 0)'), '"black"', {}, c)}
    eval_equal(func_parse('rgb(100.1%, 0, 0)'), '"red"', {}, b)
  })

  it('test_rgba_clamps_bounds', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L242-L250
    // v3.4.0

    function g() {eval_equal(func_parse('rgba(1, 1, 1, 1.2)'), '"#010101"', {}, done)}
    function f() {eval_equal(func_parse('rgba(1, 1, 1, -0.2)'), '"rgba(1, 1, 1, 0)"', {}, g)}
    function e() {eval_equal(func_parse('rgba(-1, 1, 1, 0.3)'), '"rgba(0, 1, 1, 0.3)"', {}, f)}
    function d() {eval_equal(func_parse('rgba(1, 256, 257, 0.3)'), '"rgba(1, 255, 255, 0.3)"', {}, e)}
    function c() {eval_equal(func_parse('rgba(1, 1, 256, 0.3)'), '"rgba(1, 1, 255, 0.3)"', {}, d)}
    function b() {eval_equal(func_parse('rgba(1, 256, 1, 0.3)'), '"rgba(1, 255, 1, 0.3)"', {}, c)}
    eval_equal(func_parse('rgba(256, 1, 1, 0.3)'), '"rgba(255, 1, 1, 0.3)"', {}, b)
  })

  it('test_index', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1179-L1191
    // v3.4.0

    function i() { eval_equal(func_parse("index((foo: bar, bar: baz), (foo: bar))"), '""', {}, done) }
    function h() { eval_equal(func_parse("index((foo: bar, bar: baz), (foo bar))"), '"1"', {}, i) }
    function g() { eval_equal(func_parse("index(1px, #00f)"), '""', {}, h) }
    function f() { eval_equal(func_parse("index(1px solid blue, notfound)"), '""', {}, g) }
    function e() { eval_equal(func_parse("index(1px solid blue, 1em)"), '""', {}, f) }
    function d() { eval_equal(func_parse("index(1px, 1px)"), '"1"', {}, e) }
    function c() { eval_equal(func_parse("index(1px solid blue, #00f)"), '"3"', {}, d) }
    function b() { eval_equal(func_parse("index(1px solid blue, solid)"), '"2"', {}, c) }
    eval_equal(func_parse("index(1px solid blue, 1px)"), '"1"', {}, b)
  });

  it('test_map_remove', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1342-L1345
    // v3.4.0

    function b() {eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-remove($map: (foo: 1, bar: 2, baz: 3), $key: bar)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"(foo: 1, baz: 3)"', {}, done)}
    eval_equal("Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"map-remove((foo: 1, bar: 2, baz: 3), foo, bar, baz)\",0,0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_sass()", '"()"', {}, b)
  });

  it('test_deprecated_arg_names', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1638-L1662
    // v3.4.0

    function seventh() {
      sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith(\"DEPRECATION WARNING: The `$arg_1' argument for `deprecated-arg-fn()' has been renamed to `$arg1'.\\n\")&&console.warn.calledWith(\"DEPRECATION WARNING: The `$arg_2' argument for `deprecated-arg-fn()' has been renamed to `$arg2'.\\n\")===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function sixth(result) {
      var css = '"1 2"'
        var scss = func_parse("deprecated-arg-fn($arg_1: 1, $arg_2: 2)")

        eval_equal(scss, css, {syntax: 'scss'}, seventh)
    }

    function fifth() {
      sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith(\"DEPRECATION WARNING: The `$arg-1' argument for `deprecated-arg-fn()' has been renamed to `$arg1'.\\n\")&&console.warn.calledWith(\"DEPRECATION WARNING: The `$arg-2' argument for `deprecated-arg-fn()' has been renamed to `$arg2'.\\n\")===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)
          sixth();
      })
    }

    function fourth(result) {
      var css = '"1 2"'
        var scss = func_parse("deprecated-arg-fn($arg-1: 1, $arg-2: 2)")

        eval_equal(scss, css, {syntax: 'scss'}, fifth)
    }

    function third() {
      sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith(\"DEPRECATION WARNING: The `$arg-1' argument for `deprecated-arg-fn()' has been renamed to `$arg1'.\\n\")&&console.warn.calledWith(\"DEPRECATION WARNING: The `$arg-2' argument for `deprecated-arg-fn()' has been renamed to `$arg2'.\\n\")===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)
          fourth();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined)
        var css = '"1 2 3"'
        var scss = func_parse("deprecated-arg-fn($arg-1: 1, $arg-2: 2, $arg3: 3)")

        eval_equal(scss, css, {syntax: 'scss'}, third)
    }

    sassBuilder({eval: "!function(e){{var a,r=a=e.$$scope.Functions;r.$$proto,r.$$scope}Opal.defn(r,\"$deprecated_arg_fn\",function(a,r,t){var c;return null==t&&(t=Opal.nil),e.$$scope.Value.$$scope.List.$new([a,r,(c=t)!==!1&&c!==Opal.nil&&null!=c?c:e.$$scope.Value.$$scope.Null.$new()],\"space\")},-3),r.$declare(\"deprecated_arg_fn\",[\"arg1\",\"arg2\",\"arg3\"],Opal.hash2([\"deprecated\"],{deprecated:[\"arg_1\",\"arg_2\",\"arg3\"]})),r.$declare(\"deprecated_arg_fn\",[\"arg1\",\"arg2\"],Opal.hash2([\"deprecated\"],{deprecated:[\"arg_1\",\"arg_2\"]}))}(Opal.Sass.$$scope.Script);importScripts('/base/lib/js/sinon.js');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, 'warn');importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'sass'}}, second)
  });

  it('test_non_deprecated_arg_names', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1664-L1667
    // v3.4.0

    function b() {eval_equal(func_parse("deprecated-arg-fn($arg1: 1, $arg2: 2)"), '"1 2"', {}, done)}
    eval_equal(func_parse("deprecated-arg-fn($arg1: 1, $arg2: 2, $arg3: 3)"), '"1 2 3"', {}, b)
  });

  it('test_selector_argument_parsing', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1671-L1692
    // v3.4.0

    function i() { eval_equal(func_parse("selector-parse(('.foo, .bar' '.baz, .bang'))"), func_parse("selector-parse('.foo, .bar .baz, .bang')"), {}, done)}
    function h() { eval_equal(func_parse("selector-parse(('.foo .bar', '.baz .bang'))"), func_parse("selector-parse('.foo .bar, .baz .bang')"), {}, i)}
    function g() { eval_equal(func_parse("selector-parse(('.foo' '.bar', '.baz' '.bang'))"), func_parse("selector-parse('.foo .bar, .baz .bang')"), {}, h)}
    function f() { eval_equal(func_parse("selector-parse('.foo' '.bar') == selector-parse('.foo .bar')"), '"true"', {}, g)}
    function e() { eval_equal(func_parse("selector-parse(('.foo', '.bar')) == selector-parse('.foo, .bar')"), '"true"', {}, f)}
    function d() { eval_equal(func_parse("selector-parse('.foo %bar')"), '".foo %bar"', {}, e)}
    function c() { eval_equal(func_parse("selector-parse('.foo .bar, .baz .bang') == ('.foo' '.bar', '.baz' '.bang')"), '"true"', {}, d)}
    function b() { eval_equal(func_parse("selector-parse('.foo .bar') == ('.foo' '.bar',)"), '"true"', {}, c)}
    eval_equal(func_parse("selector-parse('.foo') == (join(('.foo',), (), space),)"), '"true"', {}, b)
  });

  it('test_selector_argument_validation', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1694-L1704
    // v3.4.0

    function d() {eval_err(func_parse("selector-parse('&.foo')"), '$selector: \"&.foo\" is not a valid selector: Invalid CSS after \"\": expected selector, was \"&.foo\" for `selector-parse\'', {}, done)}
    function c() {eval_err(func_parse("selector-parse('.#')"), '$selector: \".#\" is not a valid selector: Invalid CSS after \".\": expected class name, was \"#\" for `selector-parse\'', {}, d)}
    function b() {eval_err(func_parse("selector-parse(('.foo' '.bar', '.baz') ('.bang', '.qux'))"), '$selector: (((\".foo\" \".bar\"), \".baz\") (\".bang\", \".qux\")) is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-parse\'', {}, c)}
    eval_err(func_parse('selector-parse(12)'), '$selector: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-parse', {}, b)
  })

  it('test_selector_nest', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1706-L1713
    // v3.4.0

    function f() { eval_equal(func_parse("selector-nest('.foo', '&.bar', '.baz &')"), '".baz .foo.bar"', {}, done)}
    function e() { eval_equal(func_parse("selector-nest('.foo', '&.bar')"), '".foo.bar"', {}, f)}
    function d() { eval_equal(func_parse("selector-nest('.a .foo', '.b .bar')"), '".a .foo .b .bar"', {}, e)}
    function c() { eval_equal(func_parse("selector-nest('.foo', '.bar', '.baz')"), '".foo .bar .baz"', {}, d)}
    function b() { eval_equal(func_parse("selector-nest('.foo', '.bar')"), '".foo .bar"', {}, c)}
    eval_equal(func_parse("selector-nest('.foo')"), '".foo"', {}, b)
  });

  it('test_selector_nest_checks_types', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1715-L1722
    // v3.4.0

    function b() {eval_err(func_parse("selector-nest('.foo', 12)"), '$selectors: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-nest\'', {}, done)}
    eval_err(func_parse('selector-nest(12)'), '$selectors: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-nest\'', {}, b)
  })

  it('test_selector_nest_argument_validation', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1724-L1727
    // v3.4.0

    eval_err(func_parse('selector-nest()'), '$selectors: At least one selector must be passed for `selector-nest\'', {}, done)
  })

  it('test_selector_append', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1729-L1736
    // v3.4.0

    function f() { eval_equal(func_parse("selector-append('.foo', '.bar, --suffix')"), '".foo.bar, .foo--suffix"', {}, done)}
    function e() { eval_equal(func_parse("selector-append('.foo', '--suffix')"), '".foo--suffix"', {}, f)}
    function d() { eval_equal(func_parse("selector-append('.foo', '.bar, -suffix')"), '".foo.bar, .foo-suffix"', {}, e)}
    function c() { eval_equal(func_parse("selector-append('.foo', '-suffix')"), '".foo-suffix"', {}, d)}
    function b() { eval_equal(func_parse("selector-append('.a .foo', '.b .bar')"), '".a .foo.b .bar"', {}, c)}
    eval_equal(func_parse("selector-append('.foo', '.bar')"), '".foo.bar"', {}, b)
  });

  it('test_selector_append_checks_types', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1738-L1745
    // v3.4.0

    function b() {eval_err(func_parse("selector-append('.foo', 12)"), '$selectors: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-append\'', {}, done)}
    eval_err(func_parse('selector-append(12)'), '$selectors: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-append\'', {}, b)
  })

  it('test_selector_append_errors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1747-L1756
    // v3.4.0

    function d() {eval_err(func_parse("selector-append('.foo', 'ns|suffix')"), 'Can\'t append \"ns|suffix\" to \".foo\" for `selector-append\'', {}, done)}
    function c() {eval_err(func_parse("selector-append('.foo', '*.bar')"), 'Can\'t append \"*.bar\" to \".foo\" for `selector-append\'', {}, d)}
    function b() {eval_err(func_parse("selector-append('.foo', '> .bar')"), 'Can\'t append \"> .bar\" to \".foo\" for `selector-append\'', {}, c)}
    eval_err(func_parse('selector-append()'), '$selectors: At least one selector must be passed for `selector-append\'', {}, b)
  })

  it('test_selector_extend', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1758-L1769
    // v3.4.0

    function e() { eval_equal(func_parse("selector-extend('.foo.x', '.x', '.foo')"), '".foo.x, .foo"', {}, done)}
    function d() { eval_equal(func_parse("selector-extend('.foo .x', '.x', '.bar, .bang')"), '".foo .x, .foo .bar, .foo .bang"', {}, e)}
    function c() { eval_equal(func_parse("selector-extend('.y .x', '.x, .y', '.foo')"), '".y .x, .foo .x, .y .foo, .foo .foo"', {}, d)}
    function b() { eval_equal(func_parse("selector-extend('.foo .x, .x.bar', '.x', '.bang')"), '".foo .x, .foo .bang, .x.bar, .bar.bang"', {}, c)}
    eval_equal(func_parse("selector-extend('.foo .x', '.x', '.a .bar')"), '".foo .x, .foo .a .bar, .a .foo .bar"', {}, b)
  });

  it('test_selector_extend_checks_types', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1771-L1781
    // v3.4.0

    function c() {eval_err(func_parse("selector-extend('.foo', '.bar', 12)"), '$extender: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-extend\'', {}, done)}
    function b() {eval_err(func_parse("selector-extend('.foo', 12, '.bar')"), '$extendee: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-extend\'', {}, c)}
    eval_err(func_parse("selector-extend(12, '.foo', '.bar')"), '$selector: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-extend\'', {}, b)
  })

  it('test_selector_extend_errors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1771-L1781
    // v3.4.0

    function c() {eval_err(func_parse("selector-extend('.foo', '.bar', '.bang >')"), '.bang > can\'t extend: invalid selector for `selector-extend\'', {}, done)}
    function b() {eval_err(func_parse("selector-extend('.foo', '>', '.bang')"), 'Can\'t extend >: invalid selector for `selector-extend\'', {}, c)}
    eval_err(func_parse("selector-extend('.foo', '.bar', '.bang >')"), '.bang > can\'t extend: invalid selector for `selector-extend\'', {}, b)
  })

  it('test_selector_replace', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1792-L1801
    // v3.4.0

    function g() { eval_equal(func_parse("selector-replace(':not(.foo)', ':not(.foo)', '.bar')"), '".bar"', {}, done)}
    function f() { eval_equal(func_parse("selector-replace(':not(.foo)', '.foo', '.bar')"), '":not(.bar)"', {}, g)}
    function e() { eval_equal(func_parse("selector-replace('.foo.bar.baz', '.foo.baz', '.qux')"), '".bar.qux"', {}, f)}
    function d() { eval_equal(func_parse("selector-replace('.foo.bar', '.baz.bar', '.qux')"), '".foo.bar"', {}, e)}
    function c() { eval_equal(func_parse("selector-replace('.foo.bar', '.bar', '.a .baz')"), '".a .foo.baz"', {}, d)}
    function b() { eval_equal(func_parse("selector-replace('.foo.bar', '.bar', '.baz')"), '".foo.baz"', {}, c)}
    eval_equal(func_parse("selector-replace('.foo', '.foo', '.bar')"), '".bar"', {}, b)
  });

  it('test_selector_replace_checks_types', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1803-L1813
    // v3.4.0

    function c() {eval_err(func_parse("selector-replace('.foo', '.bar', 12)"), '$replacement: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-replace\'', {}, done)}
    function b() {eval_err(func_parse("selector-replace('.foo', 12, '.bar')"), '$original: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-replace\'', {}, c)}
    eval_err(func_parse("selector-replace(12, '.foo', '.bar')"), '$selector: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-replace\'', {}, b)
  })

  it('test_selector_replace_errors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1815-L1822
    // v3.4.0

    function c() {eval_err(func_parse("selector-replace('.foo', '.bar', '.bang >')"), '.bang > can\'t extend: invalid selector for `selector-replace\'', {}, done)}
    function b() {eval_err(func_parse("selector-replace('.foo', '>', '.bang')"), 'Can\'t extend >: invalid selector for `selector-replace\'', {}, c)}
    eval_err(func_parse("selector-replace('.foo', '.bar .baz', '.bang')"), 'Can\'t extend .bar .baz: can\'t extend nested selectors for `selector-replace\'', {}, b)
  })

  it('test_selector_unify', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1824-L1835
    // v3.4.0

    function i() { eval_equal(func_parse("selector-unify('.foo, .bar', '.baz, .bang')"), '".foo.baz, .foo.bang, .bar.baz, .bar.bang"', {}, done)}
    function h() { eval_equal(func_parse("selector-unify('.foo', '.bar >')"),'""', {}, i)}
    function g() { eval_equal(func_parse("selector-unify('.foo >', '.bar')"), '""', {}, h)}
    function f() { eval_equal(func_parse("selector-unify('p', 'a')"), '""', {}, g)}
    function e() { eval_equal(func_parse("selector-unify('.a .foo', '.a .bar')"), '".a .foo.bar"', {}, f)}
    function d() { eval_equal(func_parse("selector-unify('.a .foo', '.b .bar')"), '".a .b .foo.bar, .b .a .foo.bar"', {}, e)}
    function c() { eval_equal(func_parse("selector-unify('.foo.bar', '.bar.baz')"), '".foo.bar.baz"', {}, d)}
    function b() { eval_equal(func_parse("selector-unify('.foo', '.bar')"), '".foo.bar"', {}, c)}
    eval_equal(func_parse("selector-unify('.foo', '.foo')"), '".foo"', {}, b)
  });

  it('test_selector_unify_checks_types', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1837-L1844
    // v3.4.0

    function b() {eval_err(func_parse("selector-unify('.foo', 12)"), '$selector2: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-unify\'', {}, done)}
    eval_err(func_parse("selector-unify(12, '.foo')"), '$selector1: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `selector-unify\'', {}, b)
  })

  it('test_simple_selectors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1846-L1851
    // v3.4.0

    function c() {eval_equal(func_parse("inspect(simple-selectors('.foo.bar:pseudo(\\\"flip, flap\\\")'))"), '".foo, .bar, :pseudo(\\\"flip, flap\\\")"', {}, done)}
    function b() {eval_equal(func_parse("inspect(simple-selectors('.foo.bar'))"), '".foo, .bar"', {}, c)}
    eval_equal(func_parse("inspect(simple-selectors('.foo'))"), '"(.foo,)"', {}, b)
  });

  it('test_simple_selectors_checks_types', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1853-L1856
    // v3.4.0

    eval_err(func_parse("simple-selectors(12)"), '$selector: 12 is not a string for `simple-selectors\'', {}, done)
  })

  it('test_simple_selectors_errors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1858-L1865
    // v3.4.0

    function c() {eval_err(func_parse("simple-selectors('.foo .bar')"), '$selector: \".foo .bar\" is not a compound selector for `simple-selectors\'', {}, done)}
    function b() {eval_err(func_parse("simple-selectors('.foo,.bar')"), '$selector: \".foo,.bar\" is not a compound selector for `simple-selectors\'', {}, c)}
    eval_err(func_parse("simple-selectors('.#')"), '$selector: \".#\" is not a valid selector: Invalid CSS after \".\": expected class name, was \"#\" for `simple-selectors\'', {}, b)
  })

  it('test_is_superselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1867-L1875
    // v3.4.0

    function g() { eval_equal(func_parse("is-superselector('.foo > .bar', '.foo .bar')"), '"false"', {}, done)}
    function f() { eval_equal(func_parse("is-superselector('.foo .bar', '.foo > .bar')"), '"true"', {}, g)}
    function e() { eval_equal(func_parse("is-superselector('.foo .bar', '.bar')"), '"false"', {}, f)}
    function d() { eval_equal(func_parse("is-superselector('.bar', '.foo .bar')"), '"true"', {}, e)}
    function c() { eval_equal(func_parse("is-superselector('.foo', '.foo')"), '"true"', {}, d)}
    function b() { eval_equal(func_parse("is-superselector('.foo.bar', '.foo')"), '"false"', {}, c)}
    eval_equal(func_parse("is-superselector('.foo', '.foo.bar')"), '"true"', {}, b)
  });

  it('test_is_superselector_checks_types', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/functions_test.rb#L1867-L1875
    // v3.4.0

    function b() {eval_err(func_parse("is-superselector('.foo', 12)"), '$sub: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `is-superselector\'', {}, done)}
    eval_err(func_parse("is-superselector(12, '.foo')"), '$super: 12 is not a valid selector: it must be a string,\na list of strings, or a list of lists of strings for `is-superselector\'', {}, b)
  })

  it('test_color_clamps_input', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L24-L27
    // v3.4.0

    function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([1, 2, -1]).$blue()', '0', {}, done)}
    eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([256, 2, 3]).$red()', '255', {}, b)
  });

  it('test_color_clamps_rgba_input', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L29-L32
    // v3.4.0

    function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([1, 2, 3, -0.1]).$alpha().valueOf()', '0', {}, done)}
    eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([1, 2, 3, 1.1]).$alpha().valueOf()', '1', {}, b)
  });

  it('test_string_escapes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L34-L50
    // v3.4.0

    function s() { eval_equal(func_parse("\\\"\\\\\\E000\\\""), '\'\\\"\' + String.fromCharCode(57344) + \'\\\"\'', {}, done) }
    function r() { eval_equal(func_parse("\\\"\\\\\\DFFF\\\""), '\'\\\"\' + String.fromCharCode(65533) + \'\\\"\'', {}, s) }
    function q() { eval_equal(func_parse("\\\"\\\\\\D7FF\\\""), '\'\\\"\' + String.fromCharCode(55295) + \'\\\"\'', {}, r) }
    function p() { eval_equal(func_parse("\\\"\\\\\\D800\\\""), '\'\\\"\' + String.fromCharCode(65533) + \'\\\"\'', {}, q) }
    function o() { eval_equal(func_parse("\\\"\\\\\\FFFFFF\\\""), '\'\\\"\' + String.fromCharCode(65533) + \'\\\"\'', {}, p) }
    function n() { eval_equal(func_parse("\\\"\\\\0\\\""), '\'\\\"\' + String.fromCharCode(65533) + \'\\\"\'', {}, o) }
    function m() { eval_equal(func_parse("\\\"\\\\2603\\\""), '"\\\"\\☃\\\""' , {}, n) }
    function l() { eval_equal(func_parse("\\\"\\\\2603x\\\""), '"\\\"☃x\\\""', {}, m) }
    function k() { eval_equal(func_parse("\\\"\\\\2603 f\\\""), '"\\\"☃f\\\""', {}, l) }
    function j() { eval_equal(func_parse("\\\"\\\\\\\\2603\\\""), '"\\\"\\\\\\\\2603\\\""', {}, k) }
    function i() { eval_equal(func_parse("\\\"\\\\\\\\\\\""), '"\\\"\\\\\\\\\\\""', {}, j) }
    function h() { eval_equal(func_parse("\\\"\\\\\\\"\\\""), '"\'\\\"\'"', {}, i) }
    eval_equal(func_parse("\\\"'\\\""), '"\\\"\'\\\""', {}, h)
  });

  it('test_string_escapes_are_resolved_before_operators', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L52-L54
    // v3.4.0

    eval_equal(func_parse("\\\"abc\\\" == \\\"\\\\61\\\\62\\\\63\\\""), '"true"', {}, done)
  });

  it('test_string_quote', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L56-L69
    // v3.4.0

    function q() {eval_equal(func_parse("\\\"foo\\\\\\nbar\\\""), '"\\\"foobar\\\""', {}, done) }
    function p() {eval_equal(func_parse("\\\"\\\\\\\\\\\""), '"\\"\\\\\\\\\\\""', {}, q) }
    function o() {eval_equal(func_parse("\\\"\\\\2603 abcdef\\\""), '"\\\"☃abcdef\\\""', {}, p) }
    function n() {eval_equal(func_parse("\\\"\\\\a abcdef\\\""), '"\\\"\\\\a abcdef\\\""', {}, o) }
    function m() {eval_equal(func_parse("\\\"\\\\a\\\\20\\\""), '"\\\"\\\\a  \\\""' , {}, n) }
    function l() {eval_equal(func_parse("\\\"x\\\\a y\\\""), '"\\\"x\\\\ay\\\""', {}, m) }
    function k() {eval_equal(func_parse("\\\"foo\\\\a bar\\\""), '"\\\"foo\\\\a bar\\\""', {}, l) }
    function j() {eval_equal(func_parse("\\\"foo\\\\20 bar\\\""), '"\\\"foo bar\\\""', {}, k) }
    function i() {eval_equal(func_parse("'f\\\\\\'o\\\"o'"), '"\\\"f\'o\\\\\\\"o\\\""', {}, j) }
    function h() {eval_equal(func_parse("'f\\\\\\'oo'"), '"\\\"f\'oo\\\""', {}, i) }
    eval_equal(func_parse("\\\"foo\\\""), '"\\\"foo\\\""', {}, h)
  });

  it('test_color_names', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L71-L77
    // v3.4.0

    function e() { eval_equal(func_parse("rgba(0, 0, 0, 0)"), '"transparent"', {}, done) }
    function d() { eval_equal(func_parse("transparent"), '"transparent"', {}, e) }
    function c() { eval_equal(func_parse("white - #000001"), '"#fffffe"', {}, d) }
    function b() { eval_equal(func_parse("#ffffff"), '"#ffffff"', {}, c)}
    eval_equal(func_parse("white"), '"white"', {}, b)
  });

  it('test_compressed_colors', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L86-L96
    // v3.1.0

    function o() {eval_equal(func_parse("This color is #{ white }", {style: 'compressed'}), '"This color is #fff"', {}, done)}
    function n() { eval_equal(func_parse("rgba(1, 2, 3, 0.5)", {style: 'compressed'}), '"rgba(1,2,3,0.5)"', {}, o) }
    function m() { eval_equal(func_parse("#112233", {style: 'compressed'}), '"#123"', {}, n) }
    function l() { eval_equal(func_parse("black", {style: 'compressed'}), '"#000"', {}, m) }
    function k() { eval_equal(func_parse("#f00", {style: 'compressed'}), '"red"', {}, l) }
    function j() { eval_equal(func_parse("blue", {style: 'compressed'}), '"blue"', {}, k) }
    function i() { eval_equal(func_parse("#000080", {style: 'compressed'}), '"navy"', {}, j) }
    function h() { eval_equal(func_parse("#000080 white", {style: 'compressed'}), '"navy #fff"', {}, i) }
    eval_equal(func_parse("#123456", {style: 'compressed'}), '"#123456"', {}, h)
  });

  it('test_interpolation_with_newline', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L209-L212
    // v3.4.0

    function b() { eval_equal('Opal.Sass.$$scope.Script.$parse(\'\\\"#{\"\\\\a \\"}\\\\a bang\\\"\', 1, 0, Opal.hash()).$perform(Opal.Sass.$$scope.Environment.$new()).$value()', '"\\n\\nbang"', {}, done) }
    eval_equal('Opal.Sass.$$scope.Script.$parse(\"\\\"#{\'\\\\a \'}bang\\\"\", 1, 0, Opal.hash()).$perform(Opal.Sass.$$scope.Environment.$new()).$value()', '"\\nbang"', {}, b)
  });

  it('test_string_ops', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L350
    // v3.4.0

    eval_equal('Opal.Sass.$$scope.Script.$parse("\\\"\\\\a foo\\\" + \\\"\\\\\\axyz\\\"", 1, 0, Opal.hash()).$perform(Opal.Sass.$$scope.Environment.$new()).$value()', '"\\nfoo\\nxyz"', {}, done)
  });

  it('test_length_units', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L465-L472
    // v3.4.0

    function m() { eval_equal(func_parse("(1px/1in)"), '"0.01042"', {}, done) }
    function l() { eval_equal(func_parse("(1pt/1px)"), '"1.33333"', {}, m) }
    function k() { eval_equal(func_parse("(1pt/1px)"), '"1.33333"', {}, l) }
    function j() { eval_equal(func_parse("(1mm/1pt)"), '"2.83465"', {}, k) }
    function i() { eval_equal(func_parse("(1pc/1mm)"), '"4.23333"', {}, j) }
    function h() { eval_equal(func_parse("(1cm/1pc)"), '"2.3622"', {}, i) }
    eval_equal(func_parse("(1in/1cm)"), '"2.54"', {}, h)
  });

  it('test_angle_units', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L474-L479
    // v3.4.0

    function j() { eval_equal(func_parse("(1turn/1deg)"), '"360"', {}, done) }
    function i() { eval_equal(func_parse("(1rad/1turn)"), '"0.15915"', {}, j) }
    function h() { eval_equal(func_parse("(1grad/1rad)"), '"0.01571"', {}, i) }
    eval_equal(func_parse("(1deg/1grad)"), '"1.11111"', {}, h)
  });

  it('test_time_units', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L481-L483
    // v3.4.0

    eval_equal(func_parse("(1s/1ms)"), '"1000"', {}, done)
  });

  it('test_frequency_units', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L485-L487
    // v3.4.0

    eval_equal(func_parse("(1Hz/1kHz)"), '"0.001"', {}, done)
  });

  it('test_non_ident_colors_with_wrong_number_of_digits', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L527-L538
    // v3.4.0

    function e() {eval_err(func_parse('#1234567'), "Invalid CSS after \"\": expected expression (e.g. 1px, bold), was \"#1234567\"", {}, done)}
    function d() {eval_err(func_parse('#12345'), 'Invalid CSS after "": expected expression (e.g. 1px, bold), was "#12345"', {}, e)}
    function c() {eval_err(func_parse('#1234'), 'Invalid CSS after "": expected expression (e.g. 1px, bold), was "#1234"', {}, d)}
    function b() {eval_err(func_parse('#12'), 'Invalid CSS after "": expected expression (e.g. 1px, bold), was "#12"', {}, c)}
    eval_err(func_parse('#1'), 'Invalid CSS after "": expected expression (e.g. 1px, bold), was "#1"', {}, b);
  });

  it('test_map_cannot_have_duplicate_keys', function(done) {
    // https://github.com/sass/sass/blob/bd8d8db2eb2ec57b1ef851816a95ef23e68abbe9/test/sass/script_test.rb#L513-L529
    // v3.4.0

    function e() {eval_err(func_parse('(blue: bar, #00f: baz)'), "Duplicate key #0000ff in map (blue: bar, #00f: baz).", {}, done)}
    function d() {eval_err(func_parse('(2px: bar, 1px + 1px: baz)'), "Duplicate key 2px in map (2px: bar, 1px + 1px: baz).", {}, e)}
    function c() {eval_err(func_parse('(foo: bar, \'foo\': baz)'), "Duplicate key \"foo\" in map (foo: bar, \"foo\": baz).", {}, d)}
    function b() {eval_err(func_parse('(foo: bar, fo + o: baz)'), "Duplicate key \"foo\" in map (foo: bar, fo + o: baz).", {}, c)}
    eval_err(func_parse('(foo: bar, foo: baz)'), "Duplicate key \"foo\" in map (foo: bar, foo: baz).", {}, b);
  });

  it('test_selector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L635-L654
    // v3.4.0

    function _p(sel, str) {
      return 'env=Opal.Sass.$$scope.Environment.$new();env[\'$selector=\'](Opal.Sass.$$scope.SCSS.$$scope.StaticParser.$new(\'' + sel + '\', \'test_selector_inline.scss\', Opal.Sass.$$scope.Importers.$$scope.Filesystem.$new(\'.\')).$parse_selector());Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'' + str + '\', 0, 0).$perform(env).$to_s()'
    }

    function p1(str) {
      return _p('.foo.bar .baz.bang, .bip.bop', str)
    }


    function p2(str) {
      return _p('.foo > .bar', str)
    }

    function m() {eval_equal(p2("nth(nth(&, 1), 3)"), '".bar"', {}, done)}
    function l() {eval_equal(p2("nth(nth(&, 1), 2)"), '">"', {}, m)}
    function k() {eval_equal(p2("nth(nth(&, 1), 1)"), '".foo"', {}, l)}
    function j() {eval_equal(p2("nth(&, 1)"), '".foo > .bar"', {}, k)}
    function i() {eval_equal(p2("&"), '".foo > .bar"', {}, j)}
    function h() {eval_equal(p1("type-of(nth(nth(&, 1), 1))"), '"string"', {}, i)}
    function g() {eval_equal(p1("nth(nth(&, 2), 1)"), '".bip.bop"', {}, h)}
    function f() {eval_equal(p1("nth(nth(&, 1), 2)"), '".baz.bang"', {}, g)}
    function e() {eval_equal(p1("nth(nth(&, 1), 1)"), '".foo.bar"', {}, f)}
    function d() {eval_equal(p1("nth(&, 2)"), '".bip.bop"', {}, e)}
    function c() {eval_equal(p1('nth(&, 1)'), '".foo.bar .baz.bang"', {}, d) }
    function b() {eval_equal(p1('&'), '".foo.bar .baz.bang, .bip.bop"', {}, c) }
    eval_equal(func_parse("& == null"), '"true"', {}, b)
  });

  it('test_selector_with_newlines', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L656-L666
    // v3.4.0

    function p(sel) {
      return 'env=Opal.Sass.$$scope.Environment.$new();env[\'$selector=\'](Opal.Sass.$$scope.SCSS.$$scope.StaticParser.$new(\'.foo.bar\\n.baz.bang,\\n\\n.bip.bop\', \'test_selector__with_newlines_inline.scss\', Opal.Sass.$$scope.Importers.$$scope.Filesystem.$new(\'.\')).$parse_selector());Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\'' + sel + '\', 0, 0).$perform(env).$to_s()'
    }


    function g() {eval_equal(p("type-of(nth(nth(&, 1), 1))"), '"string"', {}, done)}
    function f() {eval_equal(p("nth(nth(&, 2), 1)"), '".bip.bop"', {}, g)}
    function e() {eval_equal(p("nth(nth(&, 1), 2)"), '".baz.bang"', {}, f)}
    function d() {eval_equal(p("nth(nth(&, 1), 1)"), '".foo.bar"', {}, e)}
    function c() {eval_equal(p("nth(&, 2)"), '".bip.bop"', {}, d) }
    function b() {eval_equal(p("nth(&, 1)"), '".foo.bar .baz.bang"', {}, c) }
    eval_equal(p("&"), '".foo.bar .baz.bang, .bip.bop"', {}, b)
  });

  it('test_setting_local_variable', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L741-L760
    // v3.4.0

    var css = ".a {\n  value: inside; }\n\n.b {\n  value: outside; }\n";
    var scss = "$var: outside;\n\n.a {\n  $var: inside;\n  value: $var;\n}\n\n.b {\n  value: $var;\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_setting_local_variable_from_inner_scope', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L762-L782
    // v3.4.0

    var css = ".a .b {\n  value: inside; }\n.a .c {\n  value: inside; }\n";
    var scss = ".a {\n  $var: outside;\n\n  .b {\n    $var: inside;\n    value: $var;\n  }\n\n  .c {\n    value: $var;\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_color_format_is_preserved_by_default', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L784-L791
    // v3.4.0

    function f() {eval_equal(func_parse('nth(blue #00F, 2)'), '"#00F"', {}, done)}
    function e() {eval_equal(func_parse('nth(blue #00F, 1)'), '"blue"', {}, f)}
    function d() {eval_equal(func_parse('blue #00F'), '"blue #00F"', {}, e)}
    function c() {eval_equal(func_parse('#00f'), '"#00f"', {}, d)}
    function b() {eval_equal(func_parse('bLuE'), '"bLuE"', {}, c)}
    eval_equal(func_parse('blue'), '"blue"', {}, b);
  });

  it('test_color_format_isnt_always_preserved_in_compressed_style', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L793-L798
    // v3.4.0

    function d() {eval_equal(func_parse('nth(red #f00, 2)', {style: 'compressed'}), '"red"', {}, done)}
    function c() {eval_equal(func_parse('red #f00', {style: 'compressed'}), '"red red"', {}, d)}
    function b() {eval_equal(func_parse('#f00', {style: 'compressed'}), '"red"', {}, c)}
    eval_equal(func_parse('red', {style: 'compressed'}), '"red"', {}, b);
  });

  it('test_color_format_is_sometimes_preserved_in_compressed_style', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L800-L804
    // v3.4.0

    function c() {eval_equal(func_parse('ReD', {style: 'compressed'}), '"ReD"', {}, done)}
    function b() {eval_equal(func_parse('blue', {style: 'compressed'}), '"blue"', {}, c)}
    eval_equal(func_parse('#00f', {style: 'compressed'}), '"#00f"', {}, b);
  });

  it('test_color_format_isnt_preserved_when_modified', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L806-L808
    // v3.4.0

    eval_equal(func_parse('#f00 + #00f'), '"magenta"', {}, done);
  });

  it('test_ids', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L810-L818
    // v3.4.0

    function g() { eval_equal(func_parse("#uvw + xyz"), '"#uvwxyz"', {}, done)}
    function f() { eval_equal(func_parse("#uvw_xyz"), '"#uvw_xyz"', {}, g)}
    function e() { eval_equal(func_parse("#uvw-xyz"), '"#uvw-xyz"', {}, f)}
    function d() { eval_equal(func_parse("#abc_def"), '"#abc_def"', {}, e)}
    function c() { eval_equal(func_parse("#abc-def"), '"#abc-def"', {}, d) }
    function b() { eval_equal(func_parse("#abcd"), '"#abcd"', {}, c) }
    eval_equal(func_parse("#foo"), '"#foo"', {}, b)
  });

  it('test_scientific_notation', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L820-L828
    // v3.4.0

    function g() { eval_equal(func_parse("1.234e1"), '"12.34"', {}, done)}
    function f() { eval_equal(func_parse("1234e-4"), '"0.1234"', {}, g)}
    function e() { eval_equal(func_parse("2.5e10"), '"25000000000"', {}, f)}
    function d() { eval_equal(func_parse("2e3em"), '"2000em"', {}, e)}
    function c() { eval_equal(func_parse("2e+3"), '"2000"', {}, d) }
    function b() { eval_equal(func_parse("2E3"), '"2000"', {}, c) }
    eval_equal(func_parse("2e3"), '"2000"', {}, b)
  });

  it('test_identifier_units', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L830-L834
    // v3.4.0

    function c() { eval_equal(func_parse("2-\\\\u2603 + 3-\\\\u2603"), '"5-\\\\u2603"', {}, done) }
    function b() { eval_equal(func_parse("2-foo- + 3-foo-"), '"5-foo-"', {}, c) }
    eval_equal(func_parse("2-foo + 3-foo"), '"5-foo"', {}, b)
  });

  it('test_backslash_newline_in_string', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L836-L839
    // v3.4.0

    function b() { eval_equal(func_parse("\\\"foo\\\\\\nbar\\\""), '"\\\"foobar\\\""', {}, done) }
    eval_equal(func_parse("\'foo\\\\\\nbar\'"), '"\\\"foobar\\\""', {}, b)
  });

  it('test_repeatedly_modified_color', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L860-L877
    // v3.4.0

    var css = "a {\n  link-color: #161C14;\n  link-color-hover: black;\n  link-color-tap: rgba(22, 28, 20, 0.3); }\n";
    var sass = "$green: #161C14\n$link-color: $green\n$link-color-hover: darken($link-color, 10%)\n$link-color-tap: rgba($green, 0.3)\n\na\n  link-color: $link-color\n  link-color-hover: $link-color-hover\n  link-color-tap: $link-color-tap\n";
    equal(sass, css, {syntax: 'sass'}, done)
  })

  it('test_minus_without_whitespace', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L886
    // v3.4.0

    eval_equal(func_parse("15px--10px-"), '"5px-"', {}, done)
  });

  it('test_import_directive', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L506-L510
    // v3.4.0

    var css = "@import \\\"foo.css\\\";\\n";
    var scss = "@import \\'foo.css\\';\\n";
    eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + scss + '\',\'test_import_directive_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '"' + css + '"', {}, done)
  })

  it('test_import_directive_with_backslash_newline', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L513-L520
    // v3.4.0

    var sass = "@import \"foo\\\nbar.css\";\\n";

    eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + sass + '\',\'test_import_directive_with_backslash_newline_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '"@import \\"foobar.css\\";\\n"', {}, done)
  })

  it('test_keyframes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L670-L691
    // v3.4.0

    var css = "@keyframes identifier {\n  0% {\n    top: 0;\n    left: 0; }\n  30% {\n    top: 50px; }\n  68%, 72% {\n    left: 50px; }\n  100% {\n    top: 100px;\n    left: 100%; } }\n";
    var scss = "@keyframes identifier {\n  0% {top: 0; left: 0}\n  30% {top: 50px}\n  68%, 72% {left: 50px}\n  100% {top: 100px; left: 100%}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_summarized_selectors', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L592-L635
    // v3.4.0

    function bx(){parses(':has(> s1, > s2) {\n  a: b; }\n',{syntax: 'scss'}, done)}
    function bw(){parses(':has(s1, s2) {\n  a: b; }\n',{syntax: 'scss'}, bx)}
    function bv() {
      sassBuilder({eval: "console.warn.callCount===1&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)
          bw();
      })
    }

    function bu(){parses('E! > F {\n  a: b; }\n',{syntax: 'scss'}, bv)}

    function bt() { sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'sass'}}, bu) }

    function bs(){parses('E:host-context(s) {\n  a: b; }\n',{syntax: 'scss'}, bt)}
    function br(){parses('E:host(s) {\n  a: b; }\n',{syntax: 'scss'}, bs)}
    function bq(){parses('E /ns|foo/ F {\n  a: b; }\n',{syntax: 'scss'}, br)}
    function bp(){parses('E! > F {\n  a: b; }\n',{syntax: 'scss'}, bq)}
    function bo(){parses('E /foo/ F {\n  a: b; }\n',{syntax: 'scss'}, bp)}
    function bn(){parses('E ~ F {\n  a: b; }\n',{syntax: 'scss'}, bo)}
    function bm(){parses('E + F {\n  a: b; }\n',{syntax: 'scss'}, bn)}
    function bl(){parses('E > F {\n  a: b; }\n',{syntax: 'scss'}, bm)}
    function bk(){parses('E F {\n  a: b; }\n',{syntax: 'scss'}, bl)}
    function bj(){parses('E:nth-last-column(n) {\n  a: b; }\n',{syntax: 'scss'}, bk)}
    function bi(){parses('E:nth-child(n) {\n  a: b; }\n',{syntax: 'scss'}, bj)}
    function bh(){parses('E:nth-last-child(n) {\n  a: b; }\n',{syntax: 'scss'}, bi)}

    function az(){parses('E:nth-child(n) {\n  a: b; }\n',{syntax: 'scss'}, bh)}
    function ay(){parses('E:nth-last-child(n of selector) {\n  a: b; }\n',{syntax: 'scss'}, az)}
    function ax(){parses('E:nth-child(n of selector) {\n  a: b; }\n',{syntax: 'scss'}, ay)}
    function aw(){parses('E:only-of-type {\n  a: b; }\n',{syntax: 'scss'}, ax)}
    function av(){parses('E:nth-last-of-type(n) {\n  a: b; }\n',{syntax: 'scss'}, aw)}
    function au(){parses('E:last-of-type {\n  a: b; }\n',{syntax: 'scss'}, av)}
    function at(){parses('E:nth-of-type(n) {\n  a: b; }\n',{syntax: 'scss'}, au)}
    function as(){parses('E:first-of-type {\n  a: b; }\n',{syntax: 'scss'}, at)}
    function ar(){parses('E:only-child {\n  a: b; }\n',{syntax: 'scss'}, as)}
    function aq(){parses('E:nth-last-child(n) {\n  a: b; }\n',{syntax: 'scss'}, ar)}

    function ap(){parses('E:last-child {\n  a: b; }\n',{syntax: 'scss'}, aq)}
    function ao(){parses('E:nth-child(n) {\n  a: b; }\n',{syntax: 'scss'},ap)}
    function an(){parses('E:first-child {\n  a: b; }\n',{syntax: 'scss'},ao)}
    function am(){parses('E:empty {\n  a: b; }\n',{syntax: 'scss'},an)}
    function al(){parses('E:root {\n  a: b; }\n',{syntax: 'scss'},am)}
    function ak(){parses('E:read-write {\n  a: b; }\n',{syntax: 'scss'},al)}
    function aj(){parses('E:read-only {\n  a: b; }\n',{syntax: 'scss'},ak)}
    function ai(){parses('E:optional {\n  a: b; }\n',{syntax: 'scss'},aj)}
    function ah(){parses('E:required {\n  a: b; }\n',{syntax: 'scss'},ai)}
    function ag(){parses('E:out-of-range {\n  a: b; }\n',{syntax: 'scss'},ah)}
    function af(){parses('E:in-range {\n  a: b; }\n',{syntax: 'scss'},ag)}
    function ae(){parses('E:default {\n  a: b; }\n',{syntax: 'scss'},af)}
    function ad(){parses('E:indeterminate {\n  a: b; }\n',{syntax: 'scss'},ae)}
    function ac(){parses('E:checked {\n  a: b; }\n',{syntax: 'scss'},ad)}
    function ab(){parses('E:disabled {\n  a: b; }\n',{syntax: 'scss'},ac)}
    function aa(){parses('E:enabled {\n  a: b; }\n',{syntax: 'scss'},ab)}
    function z(){parses('E:focus {\n  a: b; }\n',{syntax: 'scss'},aa)}
    function y(){parses('E:hover {\n  a: b; }\n',{syntax: 'scss'},z)}
    function x(){parses('E:active {\n  a: b; }\n',{syntax: 'scss'},y)}
    function w(){parses('E:future {\n  a: b; }\n',{syntax: 'scss'},x)}
    function v(){parses('E:past {\n  a: b; }\n',{syntax: 'scss'},w)}
    function u(){parses('E:current(s) {\n  a: b; }\n',{syntax: 'scss'},v)}
    function t(){parses('E:current {\n  a: b; }\n',{syntax: 'scss'},u)}
    function s(){parses('E:scope {\n  a: b; }\n',{syntax: 'scss'},t)}
    function r(){parses('E:target {\n  a: b; }\n',{syntax: 'scss'},s)}
    function q(){parses('E:local-link(0) {\n  a: b; }\n',{syntax: 'scss'},r)}
    function p(){parses('E:local-link {\n  a: b; }\n',{syntax: 'scss'},q)}
    function o(){parses('E:visited {\n  a: b; }\n',{syntax: 'scss'},p)}
    function n(){parses('E:link {\n  a: b; }\n',{syntax: 'scss'},o)}
    function m(){parses('E:any-link {\n  a: b; }\n',{syntax: 'scss'},n)}
    function l(){parses('E:lang(zh, *-hant) {\n  a: b; }\n',{syntax: 'scss'},m)}
    function k(){parses('E:lang(fr) {\n  a: b; }\n',{syntax: 'scss'},l)}
    function j(){parses('E:dir(ltr) {\n  a: b; }\n',{syntax: 'scss'},k)}
    function i(){parses('E[foo|="en"] {\n  a: b; }\n',{syntax: 'scss'},j)}
    function h(){parses('E[foo*="bar"] {\n  a: b; }\n',{syntax: 'scss'},i)}
    function g(){parses('E[foo$="bar"] {\n  a: b; }\n',{syntax: 'scss'},h)}
    function f(){parses('E[foo^="bar"] {\n  a: b; }\n',{syntax: 'scss'},g)}
    function e(){parses('E[foo~="bar"] {\n  a: b; }\n',{syntax: 'scss'},f)}
    function da(){parses('E[foo="bar" i] {\n  a: b; }\n',{syntax: 'scss'},e)}
    function d(){parses('E[foo="bar"] {\n  a: b; }\n',{syntax: 'scss'},da)}
    function c(){parses('E[foo] {\n  a: b; }\n',{syntax: 'scss'},d)}
    function bg(){parses('E:has(s1, s2) {\n  a: b; }\n',{syntax: 'scss'},c)}
    function bf(){parses('E:has(s1, s2) {\n  a: b; }\n',{syntax: 'scss'},bg)}
    function be(){parses('E#myid {\n  a: b; }\n',{syntax: 'scss'},bf)}
    function bd(){parses('E.warning {\n  a: b; }\n',{syntax: 'scss'},be)}
    function bc(){parses('E:matches(s1, s2) {\n  a: b; }\n',{syntax: 'scss'},bd)}
    function bb(){parses('E:not(s1, s2) {\n  a: b; }\n',{syntax: 'scss'},bc)}
    function ba(){parses('E:not(s) {\n  a: b; }\n',{syntax: 'scss'},bb)}
    function b(){parses('E {\n  a: b; }\n',{syntax: 'scss'},ba)}

    parses('* {\n  a: b; }\n',{syntax: 'scss'},b)
  });

  it('test_more_summarized_selectors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L774-L838
    // v3.4.0

    function bg(){parses(':host-context(s) {\n  a: b; }\n',{ syntax:'scss'}, done)}
    function bf(){parses(':host(s) {\n  a: b; }\n',{ syntax:'scss'}, bg)}
    function be(){parses(':nth-last-child(n) {\n  a: b; }\n',{ syntax:'scss'}, bf)}
    function bd(){parses(':nth-child(n) {\n  a: b; }\n',{ syntax:'scss'}, be)}
    function bc(){parses(':nth-last-child(n of selector) {\n  a: b; }\n',{ syntax:'scss'}, bd)}
    function bb(){parses(':nth-child(n of selector) {\n  a: b; }\n',{ syntax:'scss'}, bc)}
    function ba(){parses(':only-of-type {\n  a: b; }\n',{ syntax:'scss'}, bb)}

    function az(){parses(':nth-last-of-type(n) {\n  a: b; }\n',{ syntax:'scss'}, ba)}
    function ay(){parses(':last-of-type {\n  a: b; }\n',{ syntax:'scss'}, az)}
    function ax(){parses(':nth-of-type(n) {\n  a: b; }\n',{ syntax:'scss'}, ay)}
    function aw(){parses(':first-of-type {\n  a: b; }\n',{ syntax:'scss'}, ax)}
    function av(){parses(':only-child {\n  a: b; }\n',{ syntax:'scss'}, aw)}
    function au(){parses(':nth-last-child(n) {\n  a: b; }\n',{ syntax:'scss'}, av)}
    function at(){parses(':last-child {\n  a: b; }\n',{ syntax:'scss'}, au)}
    function as(){parses(':nth-child(n) {\n  a: b; }\n',{ syntax:'scss'}, at)}
    function ar(){parses(':first-child {\n  a: b; }\n',{ syntax:'scss'}, as)}
    function aq(){parses(':empty {\n  a: b; }\n',{ syntax:'scss'}, ar)}
    function ap(){parses(':root {\n  a: b; }\n',{ syntax:'scss'}, aq)}
    function ao(){parses(':read-write {\n  a: b; }\n',{ syntax:'scss'}, ap)}
    function an(){parses(':read-only {\n  a: b; }\n',{ syntax:'scss'}, ao)}
    function am(){parses(':optional {\n  a: b; }\n',{ syntax:'scss'}, an)}
    function al(){parses(':required {\n  a: b; }\n',{ syntax:'scss'}, am)}
    function ak(){parses(':out-of-range {\n  a: b; }\n',{ syntax:'scss'}, al)}
    function aj(){parses(':in-range {\n  a: b; }\n',{ syntax:'scss'}, ak)}
    function ai(){parses(':default {\n  a: b; }\n',{ syntax:'scss'},aj)}
    function ah(){parses(':indeterminate {\n  a: b; }\n',{ syntax:'scss'},ai)}
    function ag(){parses(':checked {\n  a: b; }\n',{ syntax:'scss'},ah)}
    function af(){parses(':disabled {\n  a: b; }\n',{ syntax:'scss'},ag)}
    function ae(){parses(':enabled {\n  a: b; }\n',{ syntax:'scss'},af)}
    function ad(){parses(':focus {\n  a: b; }\n',{ syntax:'scss'},ae)}
    function ac(){parses(':hover {\n  a: b; }\n',{ syntax:'scss'},ad)}
    function ab(){parses(':active {\n  a: b; }\n',{ syntax:'scss'},ac)}
    function aa(){parses(':future {\n  a: b; }\n',{ syntax:'scss'},ab)}
    function z(){parses(':past {\n  a: b; }\n',{ syntax:'scss'},aa)}
    function y(){parses(':current(s) {\n  a: b; }\n',{ syntax:'scss'},z)}
    function x(){parses(':current {\n  a: b; }\n',{ syntax:'scss'},y)}
    function w(){parses(':scope {\n  a: b; }\n',{ syntax:'scss'},x)}
    function v(){parses(':target {\n  a: b; }\n',{ syntax:'scss'},w)}
    function u(){parses(':local-link(0) {\n  a: b; }\n',{ syntax:'scss'},v)}
    function t(){parses(':local-link {\n  a: b; }\n',{ syntax:'scss'},u)}
    function s(){parses(':visited {\n  a: b; }\n',{ syntax:'scss'},t)}
    function r(){parses(':link {\n  a: b; }\n',{ syntax:'scss'},s)}
    function q(){parses(':any-link {\n  a: b; }\n',{ syntax:'scss'},r)}
    function p(){parses(':lang(zh, *-hant) {\n  a: b; }\n',{ syntax:'scss'},q)}
    function o(){parses(':lang(fr) {\n  a: b; }\n',{ syntax:'scss'},p)}
    function n(){parses(':dir(ltr) {\n  a: b; }\n',{ syntax:'scss'},o)}
    function m(){parses('[foo|="en"] {\n  a: b; }\n',{ syntax:'scss'},n)}
    function l(){parses('[foo*="bar"] {\n  a: b; }\n',{ syntax:'scss'},m)}
    function k(){parses('[foo$="bar"] {\n  a: b; }\n',{ syntax:'scss'},l)}
    function j(){parses('[foo^="bar"] {\n  a: b; }\n',{ syntax:'scss'},k)}
    function i(){parses('[foo~="bar"] {\n  a: b; }\n',{ syntax:'scss'},j)}
    function h(){parses('[foo="bar" i] {\n  a: b; }\n',{ syntax:'scss'},i)}
    function g(){parses('[foo="bar"] {\n  a: b; }\n',{ syntax:'scss'},h)}
    function f(){parses('[foo] {\n  a: b; }\n',{ syntax:'scss'},g)}
    function e(){parses('#myid {\n  a: b; }\n',{ syntax:'scss'},f)}
    function d(){parses('.warning {\n  a: b; }\n',{ syntax:'scss'},e)}
    function c(){parses(':matches(s1, s2) {\n  a: b; }\n',{ syntax:'scss'},d)}
    function b(){parses(':not(s1, s2) {\n  a: b; }\n',{ syntax:'scss'},c)}

    parses(':not(s) {\n  a: b; }\n',{syntax: 'scss'},b)
  });

  it('test_subject_selector_deprecation', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L981-L1002
    // v3.4.0


    function seventh(result) {
      sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1, column 1 of test_subject_selector_deprecation_inline.scss:\\nThe subject selector operator \"!\" is deprecated and will be removed in a future release.\\nThis operator has been replaced by \":has()\" in the CSS spec.\\nFor example: .foo .bar\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)
          done();
      })
    }

    function sixth(result) {
      var sel = ".foo .bar! {a: b}"
        eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + sel + '\',\'test_subject_selector_deprecation_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '".foo .bar! {\\n  a: b; }\\n"', {}, seventh)
    }

    function fifth(result) {
      sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1, column 1 of test_subject_selector_deprecation_inline.scss:\\nThe subject selector operator \"!\" is deprecated and will be removed in a future release.\\nThis operator has been replaced by \":has()\" in the CSS spec.\\nFor example: .foo .bar:has(> .baz)\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)
          sixth();
      })
    }

    function fourth(result) {
      var sel = ".foo .bar! > .baz {a: b}"
        eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + sel + '\',\'test_subject_selector_deprecation_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '".foo .bar! > .baz {\\n  a: b; }\\n"', {}, fifth)
    }

    function third(result) {
      sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1, column 1 of test_subject_selector_deprecation_inline.scss:\\nThe subject selector operator \"!\" is deprecated and will be removed in a future release.\\nThis operator has been replaced by \":has()\" in the CSS spec.\\nFor example: .foo .bar:has(.baz)\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          fourth();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);

      var sel = ".foo .bar! .baz {a: b}"
        eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + sel + '\',\'test_subject_selector_deprecation_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '".foo .bar! .baz {\\n  a: b; }\\n"', {}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_newline_in_property_value', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L1089-L1099
    // v3.4.0

    var css = ".foo {\n  bar: \"bazbang\"; }\n";
    var scss = ".foo {\n  bar: \"baz\\\nbang\";\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_identifiers', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/rx_test.rb#L9-L48
    // v3.1.0

    function ab(){matches('Opal.Sass::SCSS::RX::IDENT', "iden\\\\6000t\\\\6000",{ syntax:'scss'},done)}
    function aa(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\6000ident",{ syntax:'scss'},ab)}
    function z(){matches('Opal.Sass::SCSS::RX::IDENT', "IdE6n-3t0_6",{ syntax:'scss'},aa)}
    function y(){matches('Opal.Sass::SCSS::RX::IDENT', "c\\\\00006Cas\\\\000073",{ syntax:'scss'},z)}
    function x(){matches('Opal.Sass::SCSS::RX::IDENT', "c\\\\lass",{ syntax:'scss'},y)}
    function w(){matches('Opal.Sass::SCSS::RX::IDENT', "f012_23",{ syntax:'scss'},x)}
    function v(){matches('Opal.Sass::SCSS::RX::IDENT', "foo_-_bar",{ syntax:'scss'},w)}
    function u(){matches('Opal.Sass::SCSS::RX::IDENT', "f012-23",{ syntax:'scss'},v)}
    function t(){matches('Opal.Sass::SCSS::RX::IDENT', "foo-bar",{ syntax:'scss'},u)}
    function s(){matches('Opal.Sass::SCSS::RX::IDENT', "_\\\\f oo",{ syntax:'scss'},t)}
    function r(){matches('Opal.Sass::SCSS::RX::IDENT', "_\\xC3\\xBFoo",{ syntax:'scss'},s)}
    function q(){matches('Opal.Sass::SCSS::RX::IDENT', "_foo",{ syntax:'scss'},r)}
    function p(){matches('Opal.Sass::SCSS::RX::IDENT', "-\\\\f oo",{ syntax:'scss'},q)}
    function o(){matches('Opal.Sass::SCSS::RX::IDENT', "-\\xC3\\xBFoo",{ syntax:'scss'},p)}
    function n(){matches('Opal.Sass::SCSS::RX::IDENT', "-foo",{ syntax:'scss'},o)}
    function m(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\\\xC3\\xBFoo",{ syntax:'scss'},n)}
    function l(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\{oo",{ syntax:'scss'},m)}
    function k(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\\\\\oo",{ syntax:'scss'},l)}
    function j(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\~oo",{ syntax:'scss'},k)}
    function i(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\ oo",{ syntax:'scss'},j)}
    function h(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\f13abcoo",{ syntax:'scss'},i)}
    function g(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\f13a\\foo",{ syntax:'scss'},h)}
    function f(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\ff2\\\\roo",{ syntax:'scss'},g)}
    function e(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\fa\\too",{ syntax:'scss'},f)}
    function d(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\f oo",{ syntax:'scss'},e)}
    function c(){matches('Opal.Sass::SCSS::RX::IDENT', "\\\\123abcoo",{ syntax:'scss'},d)}
    function b(){matches('Opal.Sass::SCSS::RX::IDENT', "\\xC3\\xBFoo",{ syntax:'scss'},c)}

    matches('Opal.Sass::SCSS::RX::IDENT', 'foo' ,{syntax: 'scss'},b)
  });

  it('test_invalid_identifiers', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/rx_test.rb#L49-L56
    // v3.1.0

    function h(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'back\\\\67\\n round',{ syntax:'scss'},done)}
    function g(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'c\\\\06C  ass',{ syntax:'scss'},h)}
    function f(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'foo~bar',{ syntax:'scss'},g)}
    function e(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', 'foo bar',{ syntax:'scss'},f)}
    function c(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', '-1foo',{ syntax:'scss'},e)}
    function b(){doesnt_match('Opal.Sass::SCSS::RX::IDENT', '1foo',{ syntax:'scss'},c)}
    doesnt_match('Opal.Sass::SCSS::RX::IDENT', '',{syntax: 'scss'},b)
  });

  it('test_hex_color_alpha_clamps_0_to_1', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/value_helpers_test.rb#L54-L56
    // v3.4.0

    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);Opal.Opal.$hex_color("FF007F", 50).$alpha().valueOf()', '1', {}, done)
  });

  it('test_space_list', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/value_helpers_test.rb#L129-L134
    // v3.4.0

    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);var l = Opal.Opal.$list(Opal.Opal.$number(1, "px"), Opal.Opal.$hex_color("#f71"), "space".$to_sym());l["$options="](Opal.hash());l.$to_sass()', '"1px #f71"', {}, done)
  });

  it('test_comma_list', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/value_helpers_test.rb#L136-L141
    // v3.4.0

    eval_equal('Opal.top.$include(Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Helpers);var l = Opal.Opal.$list(Opal.Opal.$number(1, "px"), Opal.Opal.$hex_color("#f71"), "comma".$to_sym());l["$options="](Opal.hash());l.$to_sass()', '"1px, #f71"', {}, done)
  });

  it('test_error_directive', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L118-L124
    // v3.4.0

    err_message("foo {a: b}\n@error \"hello world!\";\nbar {c: d}\n", 'hello world!', {syntax: 'scss'}, done)
  })

  it('test_nested_rules_with_fancy_selectors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L539-L559
    // v3.4.0

    var css = "foo .bar {\n  a: b; }\nfoo :baz {\n  c: d; }\nfoo bang:bop {\n  e: f; }\nfoo ::qux {\n  g: h; }\nfoo zap::fblthp {\n  i: j; }\n";
    var scss = "foo {\n  .bar {a: b}\n  :baz {c: d}\n  bang:bop {e: f}\n  ::qux {g: h}\n  zap::fblthp {i: j}}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_no_namespace_properties_without_space_even_when_its_unambiguous', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L813-L823
    // v3.4.0

    err_message("foo {\n  bar:baz calc(1 + 2) {\n    bip: bop }}\n", 'Invalid CSS after "bar:baz calc": expected selector, was "(1 + 2)"', {syntax: 'scss'}, done)
  });

  it('test_namespace_properties_without_space_allowed_for_non_identifier', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L825-L835
    // v3.4.0

    var css = "foo {\n  bar: 1px;\n    bar-bip: bop; }\n";
    var scss = "foo {\n  bar:1px {\n    bip: bop }}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  });

  it('test_keyframes_rules_in_content', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L929-L954
    // v3.4.0

    var css = "@keyframes identifier {\n  0% {\n    top: 0;\n    left: 0; }\n  30% {\n    top: 50px; }\n  68%, 72% {\n    left: 50px; }\n  100% {\n    top: 100px;\n    left: 100%; } }\n";
    var scss = "@mixin keyframes {\n  @keyframes identifier { @content }\n}\n@include keyframes {\n  0% {top: 0; left: 0}\n  #{\"30%\"} {top: 50px}\n  68%, 72% {left: 50px}\n  100% {top: 100px; left: 100%}\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_basic_selector_interpolation', function(done) {
    // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L736-L755
    // v3.1.0

    function third() {
      var css = "foo.bar baz {\n  a: b; }\n";
      var scss = "#{\"foo\"}.bar baz {a: b}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    }

    function second() {
      var css = "foo.bar baz {\n  a: b; }\n";
      var scss = "foo#{\".bar\"} baz {a: b}\n";
      equal(scss, css, {syntax: 'scss'}, third)
    }

    var css = "foo ab baz {\n  a: b; }\n";
    var scss = "foo #{'a' + 'b'} baz {a: b}\n";
    equal(scss, css, {syntax: 'scss'}, second)
  });

  it('test_color_interpolation_warning_in_selector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2239-L2267
    // v3.4.0
    function third(result) {
      sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('WARNING on line 1, column 4 of test_color_interpolation_warning_in_selector.scss:\\nYou probably don\\'t mean to use the color value `blue\\' in interpolation here.\\nIt may end up represented as #0000ff, which will likely produce invalid CSS.\\nAlways quote color names when using them as strings (for example, \"blue\").\\nIf you really want to use the color value here, use `\"\" + blue\\'.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      equal("foo#{blue} {a: b}\n", "fooblue {\n  a: b; }\n", {syntax: 'scss', filename: 'test_color_interpolation_warning_in_selector.scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_color_interpolation_warning_in_directive', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2254-L2267
    // v3.4.0
    function third(result) {
      sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('WARNING on line 1, column 12 of test_color_interpolation_warning_in_property_name_inline.scss:\\nYou probably don\\\'t mean to use the color value `blue\\\' in interpolation here.\\nIt may end up represented as #0000ff, which will likely produce invalid CSS.\\nAlways quote color names when using them as strings (for example, \"blue\").\\nIf you really want to use the color value here, use `\\\"\\\" + blue\\\'.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      equal("@fblthp foo\#{blue} {a: b}\n", "@fblthp fooblue {\n  a: b; }\n", {syntax: 'scss', filename:'test_color_interpolation_warning_in_property_name_inline.scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss', filename: 'test_color_interpolation_warning_in_directive_inline.scss'}}, second)
  })

  it('test_color_interpolation_warning_in_property_name', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2269-L2282
    // v3.4.0
    function third(result) {
      sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('WARNING on line 1, column 8 of test_color_interpolation_warning_in_property_name.scss:\\nYou probably don\\'t mean to use the color value `blue\\' in interpolation here.\\nIt may end up represented as #0000ff, which will likely produce invalid CSS.\\nAlways quote color names when using them as strings (for example, \"blue\").\\nIf you really want to use the color value here, use `\"\" + blue\\'.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.err).to.be(undefined);
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      equal("foo {a-\#{blue}: b}\n", "foo {\n  a-blue: b; }\n", {syntax: 'scss', filename: 'test_color_interpolation_warning_in_property_name.scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_no_color_interpolation_warning_in_property_value', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2284-L2291
    // v3.4.0
    function third(result) {
      sassBuilder({eval:  "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      equal("foo {a: b-#{blue}}\n", "foo {\n  a: b-blue; }\n", {syntax: 'scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_no_color_interpolation_warning_for_nameless_color', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2284-L2291
    // v3.4.0
    function third(result) {
      sassBuilder({eval:  "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      equal("foo-\#{#abcdef} {a: b}\n", "foo-#abcdef {\n  a: b; }\n", {syntax: 'scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_at_root_without_keyframes_in_keyframe_rule', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2964-L2977
    // v3.4.0

    var css = ".foo {\n  a: b; }\n";
    var scss = "@keyframes identifier {\n  0% {\n    @at-root (without: keyframes) {\n      .foo {a: b}\n    }\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_at_root_without_rule_in_keyframe_rule', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2979-L2991
    // v3.4.0

    var css = "@keyframes identifier {\n  0% {\n    a: b; } }\n";
    var scss = "@keyframes identifier {\n  0% {\n    @at-root (without: rule) {a: b}\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_selector_script', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L2995-L3005
    // v3.4.0

    var css = ".foo .bar {\n  content: \".foo .bar\"; }\n";
    var scss = ".foo .bar {\n  content: \"#{&}\";\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_script', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3006-L3017
    // v3.4.0

    var css = ".foo .bar {\n  content: \".foo .bar\"; }\n";
    var scss = ".foo {\n  .bar {\n    content: \"#{&}\";\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_script_with_outer_comma_selector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3019-L3030
    // v3.4.0

    var css = ".foo .baz, .bar .baz {\n  content: \".foo .baz, .bar .baz\"; }\n";
    var scss = ".foo, .bar {\n  .baz {\n    content: \"#{&}\";\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_nested_selector_script_with_inner_comma_selector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3032-L3043
    // v3.4.0

    var css = ".foo .bar, .foo .baz {\n  content: \".foo .bar, .foo .baz\"; }\n";
    var scss = ".foo {\n  .bar, .baz {\n    content: \"#{&}\";\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_selector_script_through_mixin', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3045-L3058
    // v3.4.0

    var css = ".foo {\n  content: \".foo\"; }\n";
    var scss = "@mixin mixin {\n  content: \"#{&}\";\n}\n\n.foo {\n  @include mixin;\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_selector_script_through_content', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3060-L3075
    // v3.4.0

    var css = ".foo {\n  content: \".foo\"; }\n";
    var scss = "@mixin mixin {\n  @content;\n}\n\n.foo {\n  @include mixin {\n    content: \"#{&}\";\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_selector_script_through_function', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3077-L3090
    // v3.4.0

    var css = ".foo {\n  content: \".foo\"; }\n";
    var scss = "@function fn() {\n  @return \"#{&}\";\n}\n\n.foo {\n  content: fn();\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_selector_script_through_media', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3092-L3109
    // v3.4.0

    var css = ".foo {\n  content: \"outer\"; }\n  @media screen {\n    .foo .bar {\n      content: \".foo .bar\"; } }\n";
    var scss = ".foo {\n  content: \"outer\";\n  @media screen {\n    .bar {\n      content: \"#{&}\";\n    }\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_selector_script_save_and_reuse', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3111-L3125
    // v3.4.0

    var css = ".bar {\n  content: \".foo\"; }\n";
    var scss = "$var: null;\n.foo {\n  $var: & !global;\n}\n\n.bar {\n  content: \"#{$var}\";\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_selector_script_with_at_root', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3127-L3138
    // v3.4.0

    var css = ".foo-bar {\n  a: b; }\n";
    var scss = ".foo {\n  @at-root #{&}-bar {\n    a: b;\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_multi_level_at_root_with_inner_selector_script', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3140-L3153
    // v3.4.0

    var css = ".bar {\n  a: b; }\n";
    var scss = ".foo {\n  @at-root .bar {\n    @at-root #{&} {\n      a: b;\n    }\n  }\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_at_root_with_at_root_through_mixin', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3155-L3170
    // v3.4.0

    var css = ".bar-baz {\n  a: b; }\n";
    var scss = "@mixin foo {\n  .bar {\n    @at-root #{&}-baz {\n      a: b;\n    }\n  }\n}\n\n@include foo;\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_keyframes_rule_outside_of_keyframes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3218-L3227
    // v3.4.0
    err_message("0% {\n  top: 0; }\n", 'Invalid CSS after "": expected selector, was "0%"', {syntax: 'scss'}, done)
  })

  it('test_selector_rule_in_keyframes', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3229-L3239
    // v3.4.0
    err_message("@keyframes identifier {\n  .foo {\n    top: 0; } }\n", 'Invalid CSS after "": expected keyframes selector (e.g. 10%), was ".foo"', {syntax: 'scss'}, done)
  })

  it('test_uses_rule_exception_with_dot_hack', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3288-L3297
    // v3.4.0

    err_message("foo {\n  .bar:baz <fail>; }\n", 'Invalid CSS after "  .bar:baz <fail>": expected expression (e.g. 1px, bold), was "; }"', {syntax: 'scss'}, done)
  });

  it('test_post_resolution_selector_error', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3395-L3401
    // v3.4.0

    err_message("\n\nfoo \#{\") bar\"} {a: b}", 'Invalid CSS after "foo ": expected selector, was ") bar"', {syntax: 'scss'}, done)
  });

  it('test_double_parent_selector_error', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3427-L3437
    // v3.4.0

    err_message("flim {\n  && {a: b}\n}\n", "Invalid CSS after \"&\": expected \"{\", was \"&\"\n\n\"&\" may only be used at the beginning of a compound selector.", {syntax: 'scss'}, done)
  });

  it('test_newline_in_property_value', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3499-L3510
    // v3.4.0

    var css = ".foo {\n  bar: \"bazbang\"; }\n";
    var scss = ".foo {\n  $var: \"baz\\\nbang\";\n  bar: $var;\n}\n";
    equal(scss, css, {syntax: 'scss'}, done)
  })

  it('test_raw_newline_warning', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3512-L3527
    // v3.4.0
    function third(result) {
      sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 2, column 9 of test_raw_newline_warning_inline.scss:\\nUnescaped multiline strings are deprecated and will be removed in a future version of Sass.\\nTo include a newline in a string, use \"\\\\a\" or \"\\\\a \" as in CSS.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
        expect(result.css).to.be(true)
          done();
      })
    }

    function second(result) {
      expect(result.err).to.be(undefined);
      equal(".foo {\n  $var: \"baz\nbang\";\n  bar: $var;\n}\n", ".foo {\n  bar: \"baz\\a bang\"; }\n", {syntax: 'scss', filename: 'test_raw_newline_warning_inline.scss'}, third)
    }

    sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
  })

  it('test_smaller_compound_superselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L11-L16
    // v3.4.0

    function fourth(){strict_superselector('#b', 'a#b', done)}
    function third(){strict_superselector('a', 'a#b', fourth)}
    function second(){strict_superselector('.bar', '.foo.bar', third)}
    strict_superselector('.foo', '.foo.bar', second)
  })

  it('test_smaller_complex_superselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L18-L23
    // v3.4.0

    function fourth(){strict_superselector('.bar', '.foo ~ .bar', done)}
    function third(){strict_superselector('.bar', '.foo + .bar', fourth)}
    function second(){strict_superselector('.bar', '.foo > .bar', third)}
    strict_superselector('.bar', '.foo .bar', second)
  })

  it('test_selector_list_subset_superselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L25-L29
    // v3.4.0

    function third(){strict_superselector('.foo, .baz, .qux', '.foo.bar, .baz.bang', done)}
    function second(){strict_superselector('.foo, .bar, .baz', '.foo, .baz', third)}
    strict_superselector('.foo, .bar', '.foo', second)
  })

  it('test_leading_combinator_superselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L31-L34
    // v3.4.0

    function second(){superselector('+ .foo', '.bar + .foo', done, true)}
    superselector('+ .foo', '.foo', second, true)
  })

  it('test_trailing_combinator_superselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L36-L39
    // v3.4.0

    function second(){superselector('.foo +', '.foo + .bar', done, true)}
    superselector('.foo +', '.foo', second, true)
  })

  it('test_matching_combinator_superselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L41-L48
    // v3.4.0

    function sixth(){strict_superselector('.foo ~ .bar', '.foo.baz ~ .bar', done)}
    function fifth(){strict_superselector('.foo ~ .bar', '.foo ~ .bar.baz', sixth)}
    function fourth(){strict_superselector('.foo > .bar', '.foo.baz > .bar', fifth)}
    function third(){strict_superselector('.foo > .bar', '.foo > .bar.baz', fourth)}
    function second(){strict_superselector('.foo + .bar', '.foo.baz + .bar', third)}
    strict_superselector('.foo + .bar', '.foo + .bar.baz', second)
  })

  it('test_following_sibling_is_superselector_of_next_sibling', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L50-L53
    // v3.4.0

    function second(){strict_superselector('.foo ~ .bar', '.foo.baz + .bar', done)}
    strict_superselector('.foo ~ .bar', '.foo + .bar.baz', second)
  })

  it('test_descendant_is_superselector_of_child', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L55-L58
    // v3.4.0

    function second(){strict_superselector('.foo .bar', '.foo.baz > .bar', done)}
    strict_superselector('.foo .bar', '.foo > .bar.baz', second)
  })

  it('test_matches_is_superselector_of_constituent_selectors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L60-L66
    // v3.4.0

    function sixth(){strict_superselector(":-moz-any(.foo .bar, .baz)", '.x .foo .bar', done)}
    function fifth(){strict_superselector(":-moz-any(.foo, .bar)", '.bar.baz', sixth)}
    function fourth(){strict_superselector(":-moz-any(.foo, .bar)", '.foo.baz', fifth)}
    function third(){strict_superselector(":matches(.foo .bar, .baz)", '.x .foo .bar', fourth)}
    function second(){strict_superselector(":matches(.foo, .bar)", '.bar.baz', third)}
    strict_superselector(":matches(.foo, .bar)", '.foo.baz', second)
  })

  it('test_matches_is_superselector_of_subset_matches', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L68-L71
    // v3.4.0

    function second(){strict_superselector(':-moz-any(.foo, .bar, .baz)', '#x:-moz-any(.foo.bip, .baz.bang)', done)}
    strict_superselector(':matches(.foo, .bar, .baz)', '#x:matches(.foo.bip, .baz.bang)', second)
  })

  it('test_matches_is_not_superselector_of_any', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L73-L76
    // v3.4.0

    function second(){superselector(':-moz-any(.foo, .bar)', ':matches(.foo, .bar)', done, true)}
    superselector(':matches(.foo, .bar)', ':-moz-any(.foo, .bar)', second, true)
  })

  it('test_matches_is_superselector_of_constituent_selectors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L78-L84
    // v3.4.0

    function sixth(){strict_superselector('.foo', ":-moz-any(.foo.bar, .foo.baz)", done)}
    function fifth(){strict_superselector('.foo.bar', ":-moz-any(.foo.bar.baz)", sixth)}
    function fourth(){strict_superselector('.foo', ":-moz-any(.foo.bar)", fifth)}
    function third(){strict_superselector('.foo', ":matches(.foo.bar, .foo.baz)", fourth)}
    function second(){strict_superselector('.foo.bar', ":matches(.foo.bar.baz)", third)}
    strict_superselector('.foo', ":matches(.foo.bar)", second)
  })

  it('test_any_is_not_superselector_of_different_prefix', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L86-L88
    // v3.4.0

    superselector(':-moz-any(.foo, .bar)', ':-s-any(.foo, .bar)', done, true)
  })

  it('test_not_is_superselector_of_less_complex_not', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L90-L93
    // v3.4.0

    function second(){strict_superselector(':not(.foo .bar)', ':not(.bar)', done)}
    strict_superselector(':not(.foo.bar)', ':not(.foo)', second)
  })

  it('test_not_is_superselector_of_superset', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L95-L98
    // v3.4.0

    function second(){strict_superselector(':not(.foo.bip, .baz.bang)', ':not(.foo):not(.bar):not(.baz)', done)}
    strict_superselector(':not(.foo.bip, .baz.bang)', ':not(.foo, .bar, .baz)', second)
  })

  it('test_not_is_superselector_of_unique_selectors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L100-L103
    // v3.4.0

    function second(){strict_superselector(':not(.baz #foo)', '#bar', done)}
    strict_superselector(':not(h1.foo)', 'a', second)
  })

  it('test_not_is_not_superselector_of_non_unique_selectors', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L105-L108
    // v3.4.0

    function second(){superselector(':not(:hover)', ':visited', done, true)}
    superselector(':not(.foo)', '.bar', second, true)
  })

  it('test_current_is_superselector_with_identical_innards', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L110-L112
    // v3.4.0

    superselector(':current(.foo)', ':current(.foo)', done)
  })

  it('test_current_is_superselector_with_subselector_innards', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L114-L117
    // v3.4.0

    function second(){superselector(':current(.foo.bar)', ':current(.foo)', done, true)}
    superselector(':current(.foo)', ':current(.foo.bar)', second, true)
  })

  it('test_nth_match_is_superselector_of_subset_nth_match', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L119-L124
    // v3.4.0

    function second(){strict_superselector(':nth-last-child(2n of .foo, .bar, .baz)', '#x:nth-last-child(2n of .foo.bip, .baz.bang)', done)}
    strict_superselector(':nth-child(2n of .foo, .bar, .baz)', '#x:nth-child(2n of .foo.bip, .baz.bang)', second)
  })

  it('test_nth_match_is_not_superselector_of_nth_match_with_different_arg', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L126-L131
    // v3.4.0

    function second(){superselector(':nth-last-child(2n of .foo, .bar, .baz)', '#x:nth-last-child(2n + 1 of .foo.bip, .baz.bang)', done, true)}
    superselector(':nth-child(2n of .foo, .bar, .baz)', '#x:nth-child(2n + 1 of .foo.bip, .baz.bang)', second, true)
  })

  it('test_nth_match_is_not_superselector_of_nth_last_match', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L133-L136
    // v3.4.0

    function second(){superselector(':nth-child(2n of .foo, .bar)', ':nth-last-child(2n of .foo, .bar)', done, true)}
    superselector(':nth-last-child(2n of .foo, .bar)', ':nth-child(2n of .foo, .bar)', second, true)
  })

  it('test_nth_match_can_be_subselector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L138-L144
    // v3.4.0

    function sixth(){strict_superselector('.foo', ":nth-last-child(2n of .foo.bar, .foo.baz)", done)}
    function fifth(){strict_superselector('.foo.bar', ":nth-last-child(2n of .foo.bar.baz)", sixth)}
    function fourth(){strict_superselector('.foo', ":nth-last-child(2n of .foo.bar)", fifth)}
    function third(){strict_superselector('.foo', ":nth-child(2n of .foo.bar, .foo.baz)", fourth)}
    function second(){strict_superselector('.foo.bar', ":nth-child(2n of .foo.bar.baz)", third)}
    strict_superselector('.foo', ":nth-child(2n of .foo.bar)", second)
  })

  it('has_is_superselector_of_subset_host', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L146-L148
    // v3.4.0

    strict_superselector(':has(.foo, .bar, .baz)', ':has(.foo.bip, .baz.bang)', done)
  })

  //TODO this test fails, but in the same way as the vanilla 3.4.0 in MRI. PRs WElcome!
  it.skip('has_isnt_superselector_of_contained_selector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L150-L152
    // v3.4.0

    strict_superselector(':has(.foo, .bar, .baz)', '.foo', done)
  })

  it('host_is_superselector_of_subset_host', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L154-L156
    // v3.4.0

    strict_superselector(':host(.foo, .bar, .baz)', ':host(.foo.bip, .baz.bang)', done)
  })

  //TODO this test fails, but in the same way as the vanilla 3.4.0 in MRI. PRs WElcome!
  it.skip('host_isnt_superselector_of_contained_selector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L158-L160
    // v3.4.0

    strict_superselector(':host(.foo, .bar, .baz)', '.foo', done)
  })

  it('host_context_is_superselector_of_subset_host', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L162-L165
    // v3.4.0

    strict_superselector(':host-context(.foo, .bar, .baz)', ':host-context(.foo.bip, .baz.bang)', done)
  })

  //TODO this test fails, but in the same way as the vanilla 3.4.0 in MRI. PRs WElcome!
  it.skip('host_context_isnt_superselector_of_contained_selector', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/superselector_test.rb#L167-L169
    // v3.4.0

    strict_superselector(':host-context(.foo, .bar, .baz)', '.foo', done)
  })

  it('test_namespace_directive', function(done) {
    // https://github.com/sass/sass/blob/master/test/sass/scss/css_test.rb#L450-L454
    // v3.4.0

    function third() {
      var scss = '@namespace html url(\\\"http://www.w3.org/Profiles/xhtml1-strict\\\");'
        eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + scss + '\',\'test_namespace_directive_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '"' + scss + '\\n"', {}, done)
    }
    function second() {
      var scss = '@namespace url(http://www.w3.org/Profiles/xhtml1-strict);'
        eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + scss + '\',\'test_namespace_directive_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '"' + scss + '\\n"', {}, third)
    }

    var scss = '@namespace \\\"http://www.w3.org/Profiles/xhtml1-strict\\\";'
      eval_equal('var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + scss + '\',\'test_namespace_directive_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()', '"' + scss + '\\n"', {}, second)
  });

  it('test_uses_property_exception_with_star_hack', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3266-L3275
    // v3.4.0

    err_message("foo {\n  *bar:baz [fail]; }\n", 'Invalid CSS after "  *bar:baz ": expected ";", was "[fail]; }"', {syntax: 'scss'}, done)
  });

  it('test_uses_property_exception_with_colon_hack', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3277-L3286
    // v3.4.0

    err_message("foo {\n  :bar:baz [fail]; }\n", 'Invalid CSS after "  :bar:baz ": expected ";", was "[fail]; }"', {syntax: 'scss'}, done)
  });

  it('test_uses_property_exception_with_space_after_name', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3299-L3308
    // v3.4.0

    err_message("foo {\n  bar: baz [fail]; }\n", 'Invalid CSS after "  bar: baz ": expected ";", was "[fail]; }"', {syntax: 'scss'}, done)
  });

  it('test_uses_property_exception_with_non_identifier_after_name', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3310-L3319
    // v3.4.0

    err_message("foo {\n  bar:1px [fail]; }\n", 'Invalid CSS after "  bar:1px ": expected ";", was "[fail]; }"', {syntax: 'scss'}, done)
  });

  it('test_http_import', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/engine_test.rb#L620-L623
    // v3.4.0

    var css = "@import \"http://fonts.googleapis.com/css?family=Droid+Sans\";\n"
      var scss = "@import \"http://fonts.googleapis.com/css?family=Droid+Sans\"";
    equal(scss, css, {syntax: 'sass'}, done);
  });

  it('test_rule_interpolation', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L214-L236
    // v3.4.0

    function c() {
      var css = "foo [bar=\"#{baz\"] bang {\n  a: b; }\n";
      var sass = "foo [bar=\"#{\"\\#{\" + \"baz\"}\"] bang\n  a: b\n";
      equal(sass, css, {syntax: 'sass'}, done);
    }
    function b() {
      var css = "foo [bar=\"#{bar baz}\"] bang {\n  a: b; }\n";
      var sass = "foo [bar=\"\\#{#{\"ba\" + \"r\"} baz}\"] bang\n  a: b\n";
      equal(sass, css, {syntax: 'sass'}, c);
    }
    var css = "foo bar baz bang {\n  a: b; }\n";
    var sass = "foo #{\"#{\"ba\" + \"r\"} baz\"} bang\n  a: b\n";
    equal(sass, css, {syntax: 'sass'}, b);
  });

  it('test_parent_in_mid_selector_error', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3403-L3413
    // v3.4.0

    err_message("flim {\n  .foo&.bar {a: b}\n}\n", "Invalid CSS after \".foo\": expected \"{\", was \"&.bar\"\n\n\"&.bar\" may only be used at the beginning of a compound selector.", {syntax: 'scss'}, done)
  });

  it('test_parent_after_selector_error', function(done) {
    // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/scss_test.rb#L3415-L3425
    // v3.4.0

    err_message("flim {\n  .foo.bar& {a: b}\n}\n", "Invalid CSS after \".foo.bar\": expected \"{\", was \"&\"\n\n\"&\" may only be used at the beginning of a compound selector.", {syntax: 'scss'}, done)
  });

    it('test_long_unclosed_comment_doesnt_take_forever', function(done) {
      // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L1116-L1120
      // v3.4.0

      var css = "/*\\n//**************************************************************************\\n";
      var to_eval = 'var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + css + '\',\'\', Opal.nil).$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()';
      eval_err(to_eval, 'Invalid CSS after "/*": expected /\\//, was "//*************..."', {syntax: 'scss'}, done)
    })

    if (semver.lt(window.__libVersion, "3.4.1")) {
      it('test_extend_into_not', function(done) {
        // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L335-L342
        // v3.4.0

        function third() { extend_equals(':not(.foo.bar, .baz.bar)', '.x {@extend .bar}', ':not(.foo.bar, .foo.x, .baz.bar, .baz.x)', {syntax: 'scss'}, done) }
        function second() { extend_equals(':not(.foo)', '.x {@extend .foo}', ':not(.foo, .x)', {syntax: 'scss'}, third) }
        extend_equals(':not(.foo.bar)', '.x {@extend .bar}', ':not(.foo.bar, .foo.x)', {syntax: 'scss'}, second)
      });

    it('test_complex_extend_into_pseudoclass', function(done) {
      // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L364-L383
      // v3.4.0

      function i() { extend_equals(':nth-last-child(n of .bar)', '.x .y {@extend .bar}', ':nth-last-child(n of .bar, .x .y)', {syntax: 'scss'}, done) }
      function h() { extend_equals(':nth-child(n of .bar)', '.x .y {@extend .bar}', ':nth-child(n of .bar, .x .y)', {syntax: 'scss'}, i) }
      function g() { extend_equals(':-moz-any(.bar)', '.x .y {@extend .bar}', ':-moz-any(.bar, .x .y)', {syntax: 'scss'}, h) }
      function f() { extend_equals(':host-context(.bar)', '.x .y {@extend .bar}', ':host-context(.bar, .x .y)', {syntax: 'scss'}, g) }
      function e() { extend_equals(':host(.bar)', '.x .y {@extend .bar}', ':host(.bar, .x .y)', {syntax: 'scss'}, f) }
      function d() { extend_equals(':has(.bar)', '.x .y {@extend .bar}', ':has(.bar, .x .y)', {syntax: 'scss'}, e) }
      function c() { extend_equals(':current(.bar)', '.x .y {@extend .bar}', ':current(.bar, .x .y)', {syntax: 'scss'}, d) }
      function b() { extend_equals(':matches(.bar)', '.x .y {@extend .bar}', ':matches(.bar, .x .y)', {syntax: 'scss'}, c) }
      extend_equals(':not(.bar)', '.x .y {@extend .bar}', ':not(.bar, .x .y)', {syntax: 'scss'}, b)
    });

    it('test_extend_into_not_and_normal_extend', function(done) {
      // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/extend_test.rb#L459-L468
      // v3.4.0

      var css = ".x:not(.y, .bar), .foo:not(.y, .bar) {\n  a: b; }\n";
      var scss = ".x:not(.y) {a: b}\n.foo {@extend .x}\n.bar {@extend .y}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })
    }


    if (semver.lt(window.__libVersion, "3.4.13")) {
      it('test_expression_fallback_selectors', function(done) {
        // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/scss/css_test.rb#L939-L945
        // v3.4.0

        function _p(scss, cb) {
          return 'var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + scss + '\',\'test_namespace_directive_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()'
        }

        function e(){
            var scss = '@keyframes "foo" {\\n  a: b; }\\n'
            eval_equal(_p(scss), '\'' + scss + '\'', {}, done)
        }
        function d(){
            var scss = '@keyframes 12px {\\n  a: b; }\\n'
            eval_equal(_p(scss), '"' + scss + '"', {}, e)
        }
        function c(){
            var scss = '@keyframes 100% {\\n  a: b; }\\n'
            eval_equal(_p(scss), '"' + scss + '"', {}, d)
        }
        function b(){
            var scss = '@keyframes 60% {\\n  a: b; }\\n'
            eval_equal(_p(scss), '"' + scss + '"', {}, c)
        }

          var scss = '@keyframes 0% {\\n  a: b; }\\n'
          eval_equal(_p(scss), '"' + scss + '"', {}, b)
      });
    }

    if (semver.lt(window.__libVersion, "3.4.14")) {
      it('test_case_insensitive_color_names', function(done) {
        // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L540-L544
        // v3.4.0

        function c() { eval_equal(func_parse("BLUE"), '"BLUE"', {}, done) }
        function b() { eval_equal(func_parse("rEd"), '"rEd"', {}, c) }
        eval_equal(func_parse("mix(GrEeN, ReD)"), '"#7f4000"', {}, b)
      });
    }

    if (semver.lt(window.__libVersion, "3.4.23")) {
      it('test_resolution_units', function(done) {
        // https://github.com/sass/sass/blob/84e55254674508a4006517fff636f750da39ed64/test/sass/script_test.rb#L489-L493
        // v3.4.23

        function c() { eval_equal(func_parse("(1dppx/1dpi)"), '"0.01042"', {}, done)}
        function b() { eval_equal(func_parse("(1dpcm/1dppx)"), '"37.79528"', {}, c)}
        eval_equal(func_parse("(1dpi/1dpcm)"), '"2.54"', {}, b)
      });
    }

    }

/*****************************************************************************************************
  * v3.4.1
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.1")) {
      it('test_extend_into_not', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/extend_test.rb#L336-L342
        // v3.4.1

        function third() { extend_equals(':not(.foo.bar, .baz.bar)', '.x {@extend .bar}', ':not(.foo.bar, .foo.x, .baz.bar, .baz.x)', {syntax: 'scss'}, done) }
        function second() { extend_equals(':not(.foo)', '.x {@extend .foo}', ':not(.foo):not(.x)', {syntax: 'scss'}, third) }
        extend_equals(':not(.foo.bar)', '.x {@extend .bar}', ':not(.foo.bar):not(.foo.x)', {syntax: 'scss'}, second)
      });

      it('test_extend_into_not_and_normal_extend', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/extend_test.rb#L459-L468
        // v3.4.1

        var css = ".x:not(.y):not(.bar), .foo:not(.y):not(.bar) {\n  a: b; }\n";
        var scss = ".x:not(.y) {a: b}\n.foo {@extend .x}\n.bar {@extend .y}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_if_can_assign_to_global_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L784-L793
        // v3.4.1

        var css = ".a {\n  b: 2; }\n";
        var scss = "$var: 1;\n@if true {$var: 2}\n.a {b: $var}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_else_can_assign_to_global_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L795-L805
        // v3.4.1

        var css = ".a {\n  b: 2; }\n";
        var scss = "$var: 1;\n@if false {}\n@else {$var: 2}\n.a {b: $var}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_for_can_assign_to_global_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L807-L816
        // v3.4.1

        var css = ".a {\n  b: 2; }\n";
        var scss = "$var: 1;\n@for $i from 1 to 2 {$var: 2}\n.a {b: $var}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_each_can_assign_to_global_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L818-L827
        // v3.4.1

        var css = ".a {\n  b: 2; }\n";
        var scss = "$var: 1;\n@each $a in 1 {$var: 2}\n.a {b: $var}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_while_can_assign_to_global_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L829-L838
        // v3.4.1

        var css = ".a {\n  b: 2; }\n";
        var scss = "$var: 1;\n@while $var != 2 {$var: 2}\n.a {b: $var}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_if_doesnt_leak_local_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L840-L847
        // v3.4.1

        err_message("@if true {$var: 1}\n.a {b: $var}\n", 'Undefined variable: "$var".', {syntax: 'scss'}, done)
      })

      it('test_else_doesnt_leak_local_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L849-L857
        // v3.4.1

        err_message("@if false {}\n@else {$var: 1}\n.a {b: $var}\n", 'Undefined variable: "$var".', {syntax: 'scss'}, done)
      })

      it('test_for_doesnt_leak_local_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L859-L866
        // v3.4.1

        err_message("@for $i from 1 to 2 {$var: 1}\n.a {b: $var}\n", 'Undefined variable: "$var".', {syntax: 'scss'}, done)
      })

      it('test_each_doesnt_leak_local_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L868-L875
        // v3.4.1

        err_message("@each $a in 1 {$var: 1}\n.a {b: $var}\n", 'Undefined variable: "$var".', {syntax: 'scss'}, done)
      })

      it('test_while_doesnt_leak_local_variables', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/script_test.rb#L877-L888
        // v3.4.1

        err_message("$iter: true;\n@while $iter {\n  $var: 1;\n  $iter: false;\n}\n.a {b: $var}\n", 'Undefined variable: "$var".', {syntax: 'scss'}, done)
      })

      it('test_keyframes_with_empty_rules', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/scss/css_test.rb#L693-L705
        // v3.4.1

        var css = "@keyframes identifier {\n  50% {\n    background-color: black; } }\n";
        var scss = "@keyframes identifier {\n  0% {}\n  50% {background-color: black}\n  100% {}\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_keyframe_bubbling', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/scss/scss_test.rb#L718-L736
        // v3.4.1

        var css = "@keyframes spin {\n  0% {\n    transform: rotate(0deg); } }\n@-webkit-keyframes spin {\n  0% {\n    transform: rotate(0deg); } }\n";
        var scss = ".foo {\n  @keyframes spin {\n    0% {transform: rotate(0deg)}\n  }\n  @-webkit-keyframes spin {\n    0% {transform: rotate(0deg)}\n  }\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_attribute_selector_in_selector_pseudoclass', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/scss/scss_test.rb#L3551-L3562
        // v3.4.1

        var css = "[href^='http://'] {\n  color: red; }\n";
        var scss = "[href^='http://'] {\n  color: red;\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

    if (semver.lt(window.__libVersion, "3.4.8")) {
      it('test_complex_extend_into_pseudoclass', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/extend_test.rb#L364-L383
        // v3.4.1

        function i() { extend_equals(':nth-last-child(n of .bar)', '.x .y {@extend .bar}', ':nth-last-child(n of .bar, .x .y)', {syntax: 'scss'}, done) }
        function h() { extend_equals(':nth-child(n of .bar)', '.x .y {@extend .bar}', ':nth-child(n of .bar, .x .y)', {syntax: 'scss'}, i) }
        function g() { extend_equals(':-moz-any(.bar)', '.x .y {@extend .bar}', ':-moz-any(.bar, .x .y)', {syntax: 'scss'}, h) }
        function f() { extend_equals(':host-context(.bar)', '.x .y {@extend .bar}', ':host-context(.bar, .x .y)', {syntax: 'scss'}, g) }
        function e() { extend_equals(':host(.bar)', '.x .y {@extend .bar}', ':host(.bar, .x .y)', {syntax: 'scss'}, f) }
        function d() { extend_equals(':has(.bar)', '.x .y {@extend .bar}', ':has(.bar, .x .y)', {syntax: 'scss'}, e) }
        function c() { extend_equals(':current(.bar)', '.x .y {@extend .bar}', ':current(.bar, .x .y)', {syntax: 'scss'}, d) }
        function b() { extend_equals(':matches(.bar)', '.x .y {@extend .bar}', ':matches(.bar, .x .y)', {syntax: 'scss'}, c) }
        extend_equals(':not(.bar)', '.x .y {@extend .bar}', ':not(.bar):not(.x .y)', {syntax: 'scss'}, b)
      });
    }


    }

/*****************************************************************************************************
  * v3.4.2
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.2")) {

      it('test_interpolation_after_string', function(done) {
        // https://github.com/sass/sass/blob/33010e49d4ad18ed763507b5fd6200e4ee64ed6e/test/sass/script_test.rb#L966-L969
        // v3.4.2

        function second() { eval_equal(func_parse("calc(1 + 2) #{3}"), '"calc(1 + 2) 3"', {}, done) }
        eval_equal(func_parse('\\"foobar\\" #{2}'), '"\\\"foobar\\\" 2"', {}, second)
      })
    }

/*****************************************************************************************************
  * v3.4.3
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.3")) {

      it('test_mixin_splat_too_many_args', function(done) {
        // https://github.com/sass/sass/blob/56a8987648e3c59b6bfe25ee8cefc3b6d72fc34c/test/sass/scss/scss_test.rb#L1532-L1541
        // v3.4.3

        function third(result) {
          sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('WARNING: Mixin foo takes 2 arguments but 4 were passed.\\n        on line 2 of test_mixin_splat_too_many_args_inline.scss\\nThis will be an error in future versions of Sass.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)
              done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({css: "@mixin foo($a, $b) {}\n@include foo((1, 2, 3, 4)...);\n", options: {syntax: 'scss', filename: 'test_mixin_splat_too_many_args_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })

      it('test_function_splat_too_many_args', function(done) {
        // https://github.com/sass/sass/blob/56a8987648e3c59b6bfe25ee8cefc3b6d72fc34c/test/sass/scss/scss_test.rb#L1964-L1973
        // v3.4.3

        function third(result) {
          sassBuilder({eval:  "console.warn.callCount===1&&console.warn.calledWith('WARNING: Function foo takes 2 arguments but 4 were passed.\\n        on line 2 of test_function_splat_too_many_args_inline.scss\\nThis will be an error in future versions of Sass.\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)
              done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({css: "@function foo($a, $b) {@return null}\n$var: foo((1, 2, 3, 4)...);\n", options: {syntax: 'scss', filename: 'test_function_splat_too_many_args_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })
    }

/*****************************************************************************************************
  * v3.4.4
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.4")) {
      it('test_keyframes_with_custom_identifiers', function(done) {
        // https://github.com/sass/sass/blob/d0dbe59044334af0fb08c520425fc7af13950cba/test/sass/scss/css_test.rb#L707-L726
        // v3.4.4

        var css = "@-skrollr-keyframes identifier {\n  center-top {\n    left: 100%; }\n  top-bottom {\n    left: 0%; } }\n";
        var scss = "@-skrollr-keyframes identifier {\n  center-top {\n    left: 100%;\n  }\n  top-bottom {\n    left: 0%;\n  }\n}\n\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })
    }

/*****************************************************************************************************
  * v3.4.6
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.6")) {
      it('test_for_directive_with_float_bounds', function(done) {
        // https://github.com/sass/sass/blob/5389942fcf3b8b0dbd0edb8ce6fabe506aee2514/test/sass/scss/scss_test.rb#L3573-L3599
        // v3.4.6

        var css = ".a {\n  b: 0;\n  b: 1;\n  b: 2;\n  b: 3;\n  b: 4;\n  b: 5; }\n";
        var scss = ".a {\n  @for $i from 0.0 through 5.0 {b: $i}\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_parent_selector_in_function_pseudo_selector', function(done) {
        // https://github.com/sass/sass/blob/5389942fcf3b8b0dbd0edb8ce6fabe506aee2514/test/sass/scss/scss_test.rb#L3601-L3617
        // v3.4.6

        var css = ".bar:not(.foo) {\n  a: b; }\n\n.qux:nth-child(2n of .baz .bang) {\n  c: d; }\n";
        var scss = ".foo {\n  .bar:not(&) {a: b}\n}\n\n.baz .bang {\n  .qux:nth-child(2n of &) {c: d}\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })
    }

/*****************************************************************************************************
  * v3.4.7
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.7")) {
      it('test_nested_pseudo_selectors', function(done) {
        // https://github.com/sass/sass/blob/92e3b022669a6131500a048cd6c2e6f6504cc2d3/test/sass/extend_test.rb#L517-L527
        // v3.4.7

        var css = ".foo .bar:not(.baz), .bang .bar:not(.baz) {\n  a: b; }\n";
        var scss = ".foo {\n  .bar:not(.baz) {a: b}\n}\n.bang {@extend .foo}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_descendant_is_superselector_of_child', function(done) {
        // https://github.com/sass/sass/blob/92e3b022669a6131500a048cd6c2e6f6504cc2d3/test/sass/superselector_test.rb#L58
        // v3.4.7

        strict_superselector('.foo .baz', '.foo > .bar > .baz', done)
      })

  it('test_child_isnt_superselector_of_longer_child', function(done) {
    // https://github.com/sass/sass/blob/92e3b022669a6131500a048cd6c2e6f6504cc2d3/test/sass/superselector_test.rb#L61-L64
    // v3.4.7

    function second(){superselector('.foo > .baz', '.foo > .bar .baz', done, true)}
    superselector('.foo > .baz', '.foo > .bar > .baz', second, true)
  })

  it('test_following_sibling_isnt_superselector_of_longer_following_sibling', function(done) {
    // https://github.com/sass/sass/blob/92e3b022669a6131500a048cd6c2e6f6504cc2d3/test/sass/superselector_test.rb#L66-L69
    // v3.4.7

    function second(){superselector('.foo + .baz', '.foo + .bar + .baz', done, true)}
    superselector('.foo + .baz', '.foo + .bar .baz', second, true)
  })

  it('test_sibling_isnt_superselector_of_longer_sibling', function(done) {
    // https://github.com/sass/sass/blob/92e3b022669a6131500a048cd6c2e6f6504cc2d3/test/sass/superselector_test.rb#L71-L77
    // v3.4.7

    function second(){superselector('.foo ~ .baz', '.foo ~ .bar ~ .baz', done, true)}
    superselector('.foo ~ .baz', '.foo ~ .bar .baz', second, true)
  })
    }

/*****************************************************************************************************
  * v3.4.8
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.8")) {
      it('test_complex_extend_into_pseudoclass', function(done) {
        // https://github.com/sass/sass/blob/ca2f302cb680313d47bcb29502199366900fdafb/test/sass/extend_test.rb#L364-L383
        // v3.4.1

        function j() { extend_equals(':not(%bar)', '.x .y {@extend %bar}', ':not(.x .y)', {syntax: 'scss'}, done) }
        function i() { extend_equals(':nth-last-child(n of .bar)', '.x .y {@extend .bar}', ':nth-last-child(n of .bar, .x .y)', {syntax: 'scss'}, done) }
        function h() { extend_equals(':nth-child(n of .bar)', '.x .y {@extend .bar}', ':nth-child(n of .bar, .x .y)', {syntax: 'scss'}, i) }
        function g() { extend_equals(':-moz-any(.bar)', '.x .y {@extend .bar}', ':-moz-any(.bar, .x .y)', {syntax: 'scss'}, h) }
        function f() { extend_equals(':host-context(.bar)', '.x .y {@extend .bar}', ':host-context(.bar, .x .y)', {syntax: 'scss'}, g) }
        function e() { extend_equals(':host(.bar)', '.x .y {@extend .bar}', ':host(.bar, .x .y)', {syntax: 'scss'}, f) }
        function d() { extend_equals(':has(.bar)', '.x .y {@extend .bar}', ':has(.bar, .x .y)', {syntax: 'scss'}, e) }
        function c() { extend_equals(':current(.bar)', '.x .y {@extend .bar}', ':current(.bar, .x .y)', {syntax: 'scss'}, d) }
        function b() { extend_equals(':matches(.bar)', '.x .y {@extend .bar}', ':matches(.bar, .x .y)', {syntax: 'scss'}, c) }
        extend_equals(':not(.baz .bar)', '.x .y {@extend .bar}', ':not(.baz .bar):not(.baz .x .y):not(.x .baz .y)', {syntax: 'scss'}, b)
      });

      it('test_hsla_percent_warning', function(done) {
        // https://github.com/sass/sass/blob/ea254a0438b53725cde6d05ef439cd96aba63703/test/sass/functions_test.rb#L125-L130
        // v3.4.8

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing a percentage as the alpha value to hsla() will be\\ninterpreted differently in future versions of Sass. For now, use 40 instead.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)

              done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);

          sassBuilder({eval: func_parse("hsla(180, 60%, 50%, 40%)"), options: {syntax: 'scss', filename: 'test_hsla_percent_warning_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })

      it('test_hsla_unit_warning', function(done) {
        // https://github.com/sass/sass/blob/ea254a0438b53725cde6d05ef439cd96aba63703/test/sass/functions_test.rb#L125-L130
        // v3.4.8

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing a number with units as the alpha value to hsla() is\\ndeprecated and will be an error in future versions of Sass. Use 40 instead.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({eval: func_parse("hsla(180, 60%, 50%, 40em)"), options: {syntax: 'scss', filename: 'test_hsla_unit_warning_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })

      it('test_rgba_percent_warning', function(done) {
        // https://github.com/sass/sass/blob/ea254a0438b53725cde6d05ef439cd96aba63703/test/sass/functions_test.rb#L291-L296
        // v3.4.8

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing a percentage as the alpha value to rgba() will be\\ninterpreted differently in future versions of Sass. For now, use 40 instead.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({eval: func_parse("rgba(1, 2, 3, 40%)"), options: {syntax: 'scss', filename: 'test_hsla_unit_warning_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })

      it('test_rgba_unit_warning', function(done) {
        // https://github.com/sass/sass/blob/ea254a0438b53725cde6d05ef439cd96aba63703/test/sass/functions_test.rb#L291-L296
        // v3.4.8

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING: Passing a number with units as the alpha value to rgba() is\\ndeprecated and will be an error in future versions of Sass. Use 40 instead.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({eval: func_parse("rgba(1, 2, 3, 40em)"), options: {syntax: 'scss', filename: 'test_rgba_percent_warning_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })
    }
/*****************************************************************************************************
  * v3.4.10
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.10")) {

      it('test_unquote', function(done) {
        // https://github.com/sass/sass/blob/9bc12a9d936db67b22bf5f98dfafb8dfdbc5cd6a/test/sass/functions_test.rb#L888-L893
        // v3.4.10

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWithMatch(/DEPRECATION WARNING: Passing blue, a non-string value, to unquote\\(\\)\\nwill be an error in future versions of Sass\\.\\n/)===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({eval: func_parse("unquote(blue)"), options: {syntax: 'scss', filename: 'test_rgba_percent_warning_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      });

    it('test_inspect', function(done) {
      // https://github.com/sass/sass/blob/9bc12a9d936db67b22bf5f98dfafb8dfdbc5cd6a/test/sass/functions_test.rb#L1630-L1632
      // v3.4.10

      function c() { eval_equal(func_parse("inspect((a: 1, b: 2 3))"), '"(a: 1, b: 2 3)"', {}, done) }
      function b() {eval_equal(func_parse("inspect((a: 1, b: (2, 3)))"), '"(a: 1, b: (2, 3))"', {}, c)}
      eval_equal(func_parse("inspect((a: 1, b: (c: 2)))"), '"(a: 1, b: (c: 2))"', {}, b)
    });

      it('test_disallowed_function_names', function(done) {
        // https://github.com/sass/sass/blob/9bc12a9d936db67b22bf5f98dfafb8dfdbc5cd6a/test/sass/scss/scss_test.rb#L1008-L1056
        // v3.4.10

        function thirteenth() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1 of test_disallowed_function_names_inline.scss:\\nNaming a function \\\"url\\\" is disallowed and will be an error in future versions of Sass.\\nThis name conflicts with an existing CSS function with special parse rules.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function twelfth(result) {
          sassBuilder({css: "@function url() {}", options: {syntax: 'scss', filename: 'test_disallowed_function_names_inline.scss'}}, thirteenth)
        }

        function eleventh() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1 of test_disallowed_function_names_inline.scss:\\nNaming a function \\\"expression\\\" is disallowed and will be an error in future versions of Sass.\\nThis name conflicts with an existing CSS function with special parse rules.\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            twelfth();
          })
        }

        function tenth(result) {
          sassBuilder({css: "@function expression() {}", options: {syntax: 'scss', filename: 'test_disallowed_function_names_inline.scss'}}, eleventh)
        }

        function ninth() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1 of test_disallowed_function_names_inline.scss:\\nNaming a function \\\"-my-element\\\" is disallowed and will be an error in future versions of Sass.\\nThis name conflicts with an existing CSS function with special parse rules.\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            tenth();
          })
        }

        function eigth() {
          sassBuilder({css: "@function -my-element() {}", options: {syntax: 'scss', filename: 'test_disallowed_function_names_inline.scss'}}, ninth)
        }

        function seventh() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1 of test_disallowed_function_names_inline.scss:\\nNaming a function \\\"element\\\" is disallowed and will be an error in future versions of Sass.\\nThis name conflicts with an existing CSS function with special parse rules.\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            eigth();
          })
        }

        function sixth(result) {
          sassBuilder({css: "@function element() {}", options: {syntax: 'scss', filename: 'test_disallowed_function_names_inline.scss'}}, seventh)
        }

        function fifth() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1 of test_disallowed_function_names_inline.scss:\\nNaming a function \\\"-my-calc\\\" is disallowed and will be an error in future versions of Sass.\\nThis name conflicts with an existing CSS function with special parse rules.\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            sixth();
          })
        }

        function fourth(result) {
          sassBuilder({css: "@function -my-calc() {}", options: {syntax: 'scss', filename: 'test_disallowed_function_names_inline.scss'}}, fifth)
        }

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 1 of test_disallowed_function_names_inline.scss:\\nNaming a function \\\"calc\\\" is disallowed and will be an error in future versions of Sass.\\nThis name conflicts with an existing CSS function with special parse rules.\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            fourth();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({css: "@function calc() {}", options: {syntax: 'scss', filename: 'test_disallowed_function_names_inline.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      });

      it('test_allowed_function_names', function(done) {
        // https://github.com/sass/sass/blob/9bc12a9d936db67b22bf5f98dfafb8dfdbc5cd6a/test/sass/scss/scss_test.rb#L1058-L1076
        // v3.4.10

        function second() {
          var css = ".a {\n  b: c; }\n";
          var scss = "@function -my-url() {@return c}\n\n.a {b: -my-url()}\n";
          equal(scss, css, {syntax: 'scss'}, done)

        }

        var css = ".a {\n  b: c; }\n";
        var scss = "@function -my-expression() {@return c}\n\n.a {b: -my-expression()}\n";
        equal(scss, css, {syntax: 'scss'}, second)
      })
    }

/*****************************************************************************************************
  * v3.4.11
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.11")) {
      it('test_allowed_function_names', function(done) {
        // https://github.com/sass/sass/blob/57513c6eb9d92deea6753db5c39b6e115107c68d/test/sass/engine_test.rb#L2461-L2471
        // v3.4.11

        var css = ".foo,\n.bar {\n  a: b; }\n";
        var sass = ".foo,\n#{\".bar\"}\n  a: b\n";
        equal(sass, css, {syntax: 'sass'}, done)
      })

    it('test_space_list', function(done) {
      // https://github.com/sass/sass/blob/57513c6eb9d92deea6753db5c39b6e115107c68d/test/sass/script_conversion_test.rb#L79-L83
      // v3.4.11

      function c() {eval_equal('Opal.Sass.$$scope.Script.$parse(\"foo (bar, baz) bip\",1,0).$to_sass()', '"foo (bar, baz) bip"', {}, done)}
      function b() {eval_equal('Opal.Sass.$$scope.Script.$parse(\"foo (bar baz) bip\",1,0).$to_sass()', '"foo (bar baz) bip"', {}, c)}
      eval_equal("Opal.Sass.$$scope.Script.$parse(\"foo bar baz\",1,0).$to_sass()", '"foo bar baz"', {}, b)
    });

    it('test_comma_list', function(done) {
      // https://github.com/sass/sass/blob/57513c6eb9d92deea6753db5c39b6e115107c68d/test/sass/script_conversion_test.rb#L85-L89
      // v3.4.11

      function c() {eval_equal('Opal.Sass.$$scope.Script.$parse(\"foo, bar baz, bip\",1,0).$to_sass()', '"foo, bar baz, bip"', {}, done)}
      function b() {eval_equal('Opal.Sass.$$scope.Script.$parse(\"foo, (bar, baz), bip\",1,0).$to_sass()', '"foo, (bar, baz), bip"', {}, c)}
      eval_equal('Opal.Sass.$$scope.Script.$parse(\"foo, bar, baz\",1,0).$to_sass()', '"foo, bar, baz"', {}, b)
    });

    it('test_space_list_adds_parens_for_clarity', function(done) {
      // https://github.com/sass/sass/blob/57513c6eb9d92deea6753db5c39b6e115107c68d/test/sass/script_conversion_test.rb#L91-L93
      // v3.4.11

      eval_equal('Opal.Sass.$$scope.Script.$parse(\"(1 + 1) (2 / 4) (3 * 5)\",1,0).$to_sass()', '"(1 + 1) (2 / 4) (3 * 5)"', {}, done)
    });

    it('test_parent_selector_in_and_out_of_function_pseudo_selector', function(done) {
      // https://github.com/sass/sass/blob/57513c6eb9d92deea6753db5c39b6e115107c68d/test/sass/scss/scss_test.rb#L3696-L3719
      // v3.4.10

      function second() {
        var css = ".a:nth-child(2n of .a-b) {\n  x: y; }\n";
        var scss = ".a {\n  &:nth-child(2n of &-b) {\n    x: y;\n  }\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)

      }

      var css = ".a:not(.a-b) {\n  x: y; }\n";
      var scss = ".a {\n  &:not(&-b) {\n    x: y;\n  }\n}\n";
      equal(scss, css, {syntax: 'scss'}, second)
    })
    }

/*****************************************************************************************************
  * v3.4.12
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.12")) {
      it('test_random_with_float_integer_limit', function(done) {
        // https://github.com/sass/sass/blob/ddb2aa16a836dc81bdc55f57ee9960536012a674/test/sass/functions_test.rb#L1668-L1673
        // v3.4.12

        eval_equal('var result=Opal.Sass.$$scope.Script.$$scope.Parser.$parse("random(1.0)", 0, 0,Opal.hash()).$perform(Opal.Sass.$$scope.Environment.$new());result[\'$is_a?\'](Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Base)&&result.$value().valueOf() >= 0 && result.$value().valueOf() <= 1', 'true', {}, done)
      })

  it('test_interpolation_in_interpolation', function(done) {
    // https://github.com/sass/sass/blob/ddb2aa16a836dc81bdc55f57ee9960536012a674/test/sass/script_test.rb#L209-L214
    // v3.4.12

    function d() { eval_equal(func_parse("\\\"#{\\\"#{foo}\\\"}\\\""), '"\\\"foo\\\""', {}, done) }
    function c() { eval_equal(func_parse("#{\\\"#{foo}\\\"}"), '"foo"', {}, d) }
    function b() { eval_equal(func_parse("\\\"#{#{foo}}\\\""), '"\\\"foo\\\""', {}, c) }
    eval_equal(func_parse("#{#{foo}}"), '"foo"', {}, b)
  });
    }

/*****************************************************************************************************
  * v3.4.13
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.13")) {
      it('test_keyword_arg_scope', function(done) {
        // https://github.com/sass/sass/blob/d26e6fa17f55d64278c9f09b5ace5e256e363e3f/test/sass/scss/scss_test.rb#L3928-L3942
        // v3.4.13

        var css = ".mixed {\n  arg1: default;\n  arg2: non-default; }\n";
        var scss = "$arg1: default;\n$arg2: default;\n@mixin a-mixin($arg1: $arg1, $arg2: $arg2) {\n  arg1: $arg1;\n  arg2: $arg2;\n}\n.mixed { @include a-mixin($arg2: non-default); }\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_extend_with_middle_pseudo', function(done) {
        // https://github.com/sass/sass/blob/d26e6fa17f55d64278c9f09b5ace5e256e363e3f/test/sass/extend_test.rb#L1351-L1359
        // v3.4.13

        var css = ".btn:active.focus, :active.focus:before {\n  a: b; }\n";
        var scss = ".btn:active.focus {a: b}\n:before {@extend .btn}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      })

      it('test_root_only_allowed_at_root', function(done) {
        // https://github.com/sass/sass/blob/d26e6fa17f55d64278c9f09b5ace5e256e363e3f/test/sass/extend_test.rb#L506-L514
        // v3.4.13

          function fourth() { extend_equals('.foo:root > .bar .x', '.baz:root .bang .y {@extend .x}','.foo:root > .bar .x, .baz.foo:root > .bar .bang .y', {syntax: 'scss'}, done) }
          function third() { extend_equals('html:root .bar', 'xml:root .bang {@extend .bar}', 'html:root .bar', {syntax: 'scss'}, fourth) }
          function second() { extend_equals('.foo:root .bar', '.baz:root .bang {@extend .bar}','.foo:root .bar, .baz.foo:root .bang', {syntax: 'scss'}, third) }
        extend_equals(':root .foo', '.bar .baz {@extend .foo}',':root .foo, :root .bar .baz', {syntax: 'scss'}, second)
      })

      it('test_expression_fallback_selectors', function(done) {
        // https://github.com/sass/sass/blob/d26e6fa17f55d64278c9f09b5ace5e256e363e3f/test/sass/scss/css_test.rb#L974-L980
        // v3.4.13

        function _p(scss, cb) {
          return 'var tree = Opal.Sass.$$scope.SCSS.$$scope.CssParser.$new(\'' + scss + '\',\'test_namespace_directive_inline.scss\').$parse();tree[\'$options=\'](Opal.Sass.$$scope.Engine.$$scope.DEFAULT_OPTIONS.$merge(Opal.hash()));tree.$render()'
        }

        function e(){
            var scss = '@unknown "foo" {\\n  a: b; }\\n'
            eval_equal(_p(scss), '\'' + scss + '\'', {}, done)
        }
        function d(){
            var scss = '@unknown 12px {\\n  a: b; }\\n'
            eval_equal(_p(scss), '"' + scss + '"', {}, e)
        }
        function c(){
            var scss = '@unknown 100% {\\n  a: b; }\\n'
            eval_equal(_p(scss), '"' + scss + '"', {}, d)
        }
        function b(){
            var scss = '@unknown 60% {\\n  a: b; }\\n'
            eval_equal(_p(scss), '"' + scss + '"', {}, c)
        }

          var scss = '@unknown 0% {\\n  a: b; }\\n'
          eval_equal(_p(scss), '"' + scss + '"', {}, b)
      });
    }

/*****************************************************************************************************
  * v3.4.14
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.14")) {
      it('test_rgb_percent', function(done) {
        // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/functions_test.rb#L222-L227
        // v3.4.14

        function fourth() {eval_equal(func_parse("rgb(0%, 100%, 50%)"), '"#00ff80"', {}, done)}
        function third() {eval_equal(func_parse("rgb(190, 68%, 237)"), '"#beaded"', {}, fourth)}
        function second() { eval_equal(func_parse("rgb(74.7%, 173, 93%)"), '"#beaded"', {}, third) }
        eval_equal(func_parse("rgb(7.1%, 20.4%, 34%)"), '"#123457"', {}, second)
      });

      it('test_mix', function(done) {
        // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/functions_test.rb#L815-L830
        // v3.4.14

        function n() { eval_equal(func_parse("mix(#f00, #00f)"), '"purple"', {}, done) }
        function m() { eval_equal(func_parse("mix(#f00, #0ff)"), '"gray"', {}, n) }
        function l() { eval_equal(func_parse("mix(#f70, #0aa)"), '"#809155"', {}, m) }
        function k() { eval_equal(func_parse("mix(#f00, #00f, 25%)"), '"#4000bf"', {}, l) }
        function j() { eval_equal(func_parse("mix(rgba(255, 0, 0, 0.5), #00f)"), '"rgba(64, 0, 191, 0.75)"', {}, k) }
        function i() { eval_equal(func_parse("mix(#f00, #00f, 100%)"), '"red"', {}, j) }
        function h() { eval_equal(func_parse("mix(#f00, #00f, 0%)"), '"blue"', {}, i) }
        function g() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1))"), '"rgba(255, 0, 0, 0.5)"', {}, h) }
        function f() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f)"), '"rgba(0, 0, 255, 0.5)"', {}, g) }
        function e() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1), 100%)"), '"red"', {}, f) }
        function d() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f, 0%)"), '"blue"', {}, e) }
        function c() { eval_equal(func_parse("mix(#f00, transparentize(#00f, 1), 0%)"), '"rgba(0, 0, 255, 0)"', {}, d) }
        function b() { eval_equal(func_parse("mix(transparentize(#f00, 1), #00f, 100%)"), '"rgba(255, 0, 0, 0)"', {}, c) }
        eval_equal(func_parse("mix($color1: transparentize(#f00, 1), $color2: #00f, $weight: 100%)"), '"rgba(255, 0, 0, 0)"', {}, b)
      });

      it('test_color_from_hex', function(done) {
        // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/script_test.rb#L34-L37
        // v3.4.14

        function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([0,0,0]).$inspect()', 'Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$from_hex(\'#000000\').$inspect()', {}, done)};
        eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$new([0,0,0]).$inspect()', 'Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Color.$from_hex(\'000000\').$inspect()', {}, b);
      })

      it('test_case_insensitive_color_names', function(done) {
        // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/script_test.rb#L563-L567
        // v3.4.14

        function c() { eval_equal(func_parse("BLUE"), '"BLUE"', {}, done) }
        function b() { eval_equal(func_parse("rEd"), '"rEd"', {}, c) }
        eval_equal(func_parse("mix(GrEeN, ReD)"), '"#804000"', {}, b)
      });

    it('test_supports', function(done) {
      // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/scss/css_test.rb#L635-L656
      // v3.4.14

      var css = "@supports (((a: b) and (c: d)) or (not (d: e))) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b; } }\n@supports (a: b) {\n  .foo {\n    a: b; } }\n";
      var scss = "@supports (((a: b) and (c: d)) or (not (d: e))) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b;\n  }\n}\n\n@supports (a: b) {\n  .foo {\n    a: b;\n  }\n}\n";
      equal(scss, css,{syntax: 'scss'}, done)
    })

    it('test_supports_with_prefix', function(done) {
      // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/scss/css_test.rb#L658-L670
      // v3.4.14

      var css = "@-prefix-supports (((a: b) and (c: d)) or (not (d: e))) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b; } }\n";
      var scss = "@-prefix-supports (((a: b) and (c: d)) or (not (d: e))) and ((not (f: g)) or (not ((h: i) and (j: k)))) {\n  .foo {\n    a: b;\n  }\n}\n";
      equal(scss, css,{syntax: 'scss'}, done)
    })

    it('test_supports_allows_similar_operators_without_parens', function(done) {
      // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/scss/css_test.rb#L672-L693
      // v3.4.14

      var css = "@supports (a: b) and (c: d) and (e: f) {\n  .foo {\n    a: b; } }\n@supports (a: b) or (c: d) or (e: f) {\n  .foo {\n    a: b; } }\n";
      var scss = "@supports (a: b) and (c: d) and (e: f) {\n  .foo {\n    a: b;\n  }\n}\n\n@supports (a: b) or (c: d) or (e: f) {\n  .foo {\n    a: b;\n  }\n}\n";
      equal(scss, css,{syntax: 'scss'}, done)
    })

    it('test_supports_with_expressions', function(done) {
      // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/scss/scss_test.rb#L2297-L2310
      // v3.4.14

      var css = "@supports ((feature1: val) and (feature2: val)) or (not (feature23: val4)) {\n  foo {\n    a: b; } }\n";
      var scss = "$query: \"(feature1: val)\";\n$feature: feature2;\n$val: val;\n@supports (#{$query} and ($feature: $val)) or (not ($feature + 3: $val + 4)) {\n  foo {a: b}\n}\n";
      equal(scss,css,{syntax: 'scss'}, done)
    });

    it('test_nonexistent_import', function(done) {
      // https://github.com/sass/sass/blob/2e0f33b85a9f76ddf7a4f8ee924ab1c7ae798bd7/test/sass/engine_test.rb#L680-L686
      // v3.4.14

      err_message("@import nonexistent.sass", 'File to import not found or unreadable: nonexistent.sass.', {syntax: 'sass'}, done)
    });
    }

/*****************************************************************************************************
  * v3.4.16
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.16")) {
      it('test_no_static_hyphenated_units', function(done) {
        // https://github.com/sass/sass/blob/b4bbd962b3c91f6268d5fdfa3e96896d018020fc/test/sass/scss/rx_test.rb#L144-L146
        // v3.4.16

          doesnt_match('Opal.Sass::SCSS::RX::STATIC_VALUE', "20px-20px" ,{syntax: 'scss'},done)
      });

    it('test_supports_with_expressions', function(done) {
      // https://github.com/sass/sass/blob/b4bbd962b3c91f6268d5fdfa3e96896d018020fc/test/sass/scss/scss_test.rb#L460-L467
      // v3.4.16

      var css = "foo {\n  a: 0px; }\n";
      var scss = "foo {a: 10px-10px }\n";
      equal(scss,css,{syntax: 'scss'}, done)
    });
    }

/*****************************************************************************************************
  * v3.4.17
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.17")) {
      it('test_compressed_unknown_directive', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/engine_test.rb#L3268-L3277
        // v3.4.17

        var css = "x{@foo;a:b;@bar}\n";
        var sass = "x\n  @foo\n  a: b\n  @bar\n";
        equal(sass,css,{syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_compressed_unknown_directive_in_directive', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/engine_test.rb#L3279-L3288
        // v3.4.17

        var css = "@x{@foo;a:b;@bar}\n";
        var sass = "@x\n  @foo\n  a: b\n  @bar\n";
        equal(sass,css,{syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_compressed_unknown_directive_with_children_in_directive', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/engine_test.rb#L3290-L3301
        // v3.4.17

        var css = "@x{@foo{a:b}c:d;@bar{e:f}}\n";
        var sass = "@x\n  @foo\n    a: b\n  c: d\n  @bar\n    e: f\n";
        equal(sass,css,{syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_compressed_rule_in_directive', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/engine_test.rb#L3303-L3314
        // v3.4.17

        var css = "@x{foo{a:b}c:d;bar{e:f}}\n";
        var sass = "@x\n  foo\n    a: b\n  c: d\n  bar\n    e: f\n";
        equal(sass,css,{syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_rgb_calc', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/script_test.rb#L121-L123
        // v3.4.17

        eval_equal(func_parse("rgb(calc(255 - 5), 0, 0)"), '"rgb(calc(255 - 5), 0, 0)"', {}, done)
      });

      it('test_rgba_calc', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/script_test.rb#L125-L130
        // v3.4.17

        function b() {eval_equal(func_parse("rgba(127, 0, 0, calc(0.1 + 0.5))"), '"rgba(127, 0, 0, calc(0.1 + 0.5))"', {}, done)}
        eval_equal(func_parse("rgba(calc(255 - 5), 0, 0, 0.1)"), '"rgba(calc(255 - 5), 0, 0, 0.1)"', {}, b)
      });

      it('test_hsl_calc', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/script_test.rb#L137-L139
        // v3.4.17

        eval_equal(func_parse("hsl(calc(360 * 5 / 6), 50%, 50%)"), '"hsl(calc(360 * 5 / 6), 50%, 50%)"', {}, done)
      });

      it('test_hsla_calc', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/script_test.rb#L141-L146
        // v3.4.17

        function b() {eval_equal(func_parse("hsla(270, 50%, 50%, calc(0.1 + 0.1))"), '"hsla(270, 50%, 50%, calc(0.1 + 0.1))"', {}, done)}
        eval_equal(func_parse("hsla(calc(360 * 5 / 6), 50%, 50%, 0.1)"), '"hsla(calc(360 * 5 / 6), 50%, 50%, 0.1)"', {}, b)
      });

      it('test_slash_division_within_list', function(done) {
        // https://github.com/sass/sass/blob/c69ee0292ae6c45830d8ad9ed657ede11befe507/test/sass/script_test.rb#L578-L582
        // v3.4.17

        function c() {eval_equal(func_parse("(1/2,)"), '"1/2"', {}, done)}
        function b() {eval_equal(func_parse("(1/2 1/2)"), '"1/2 1/2"', {}, c)}
        eval_equal(func_parse("(1 1/2 1/2)"), '"1 1/2 1/2"', {}, b)
      });
    }

/*****************************************************************************************************
  * v3.4.18
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.18")) {
      it('test_import_two_css_files_issue_1806', function(done) {
        // https://github.com/sass/sass/blob/3761650b7d360d065c409e902e838270e520c8ff/test/sass/engine_test.rb#L3316-L3324
        // v3.4.18

        var css = "@import url(\"foo.css\");@import url(\"bar.css\");@import url(\"baz.css\")\n";
        var sass = "@import url(\"foo.css\");\n@import url(\"bar.css\");\n@import url(\"baz.css\");\n";
        equal(sass,css,{syntax: 'scss', style: 'compressed'}, done)
      });
    }

/*****************************************************************************************************
  * v3.4.19
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.19")) {
      it('test_string_escapes', function(done) {
        // https://github.com/sass/sass/blob/f4a7ddbc412aa71efa451d526d8182c575687e01/test/sass/script_test.rb#L47
        // v3.4.19

          eval_equal(func_parse("\\\"\\\\\\#{foo}\\\""), '"\\"#{foo}\\""' , {}, done)
      });

      it('test_string_quote', function(done) {
        // https://github.com/sass/sass/blob/f4a7ddbc412aa71efa451d526d8182c575687e01/test/sass/script_test.rb#L75
        // v3.4.19

          eval_equal(func_parse("'\\\\\\#{foo}'"), '"\\\"#{foo}\\\""' , {}, done)
      });

      it('test_equality_uses_an_epsilon', function(done) {
        // https://github.com/sass/sass/blob/f4a7ddbc412aa71efa451d526d8182c575687e01/test/sass/script_test.rb#L1167-L1172
        // v3.4.19

          eval_equal(func_parse("29 == (29 / 7 * 7)"), '"true"' , {}, done)
      });
    }

/*****************************************************************************************************
  * v3.4.20
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.20")) {

      it('test_import_with_supports_clause_interp', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/engine_test.rb#L3336-L3343
        // v3.4.20

        var css = "@import url(\"fallback-layout.css\") supports(not (display: flex))\n";
        var sass = "$display-type: flex\n@import url(\"fallback-layout.css\") supports(not (display: #{$display-type}))\n";
        equal(sass,css,{syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_import_with_supports_clause', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/engine_test.rb#L3345-L3351
        // v3.4.20

        var css = "@import url(\"fallback-layout.css\") supports(not (display: flex))\n";
        var sass = "@import url(\"fallback-layout.css\") supports(not (display: flex))\n";
        equal(sass,css,{syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_round', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/functions_test.rb#L157
        // v3.4.20

        eval_equal(func_parse("round(-5.5)"), '"-6"', {}, done)
      });

      it('test_min', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/functions_test.rb#L201
        // v3.2.0

        eval_equal(func_parse("min(1cm, 1q)"), '"1q"', {}, done)
      });

      it('test_max', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/functions_test.rb#L212
        // v3.4.20

        eval_equal(func_parse("max(11mm, 10q)"), '"11mm"', {}, done)
      });

      it('test_operator_unit_conversion', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L499-L508
        // v3.4.20

        function d() {eval_equal(func_parse("2px > 3q"), '"false"', {}, done)}
        function c() {eval_equal(func_parse("2mm == 8q"), '"true"', {}, d)}
        function b() {eval_equal(func_parse("40cm + 1q"), '"40.025cm"', {}, c)}
        eval_equal(func_parse("4q + 1mm"), '"8q"', {}, b)
      });

      it('test_length_units', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L530-L531
        // v3.4.20

        function b() { eval_equal(func_parse("(1q/1pc)"), '"0.05906"', {}, done) }
        eval_equal(func_parse("(1px/1q)"), '"1.05833"', {}, b)
      });

      it('test_compressed_output_of_numbers_with_leading_zeros', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L1182-L1187
        // v3.4.20

        function _z(val, opts) {
          return 'var opts=Opal.hash2(' + JSON.stringify(Object.keys(opts)) + ',' + JSON.stringify(opts) + '),val=Opal.Sass.$$scope.Script.$$scope.Parser.$parse("' + val + '", 0, 0,opts).$perform(Opal.Sass.$$scope.Environment.$new());val[\'$options=\'](opts);val.$to_s()';
        }

        function d() {eval_equal(_z("1.5", {style: 'compressed'}), '"1.5"', {}, done) }
        function c() {eval_equal(_z("0.5", {style: 'compressed'}), '".5"', {}, d) }
        function b() {eval_equal(_z("-0.5", {style: 'compressed'}), '"-.5"', {}, c) }
        eval_equal(_z("0.5", {style: 'compact'}), '"0.5"', {}, b)
      });

      it('test_interpolation_without_deprecation_warning', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L1189-L1207
        // v3.4.20

        function r() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            done();
          })
        }
        function q() { eval_equal(func_parse("b#{a}"), '"ba"', {}, r) }
        function p() { eval_equal(func_parse("1#{a}"), '"1a"', {}, q) }
        function o() { eval_equal(func_parse("#{a}b"), '"ab"', {}, p) }
        function n() { eval_equal(func_parse("#{a}1"), '"a1"', {}, o) }
        function m() { eval_equal(func_parse("#{a}-#{b}"), '"a-b"', {}, n) }
        function l() { eval_equal(func_parse("#{a}-1"), '"a-1"', {}, m) }
        function k() { eval_equal(func_parse("#{a}- 1"), '"a- 1"', {}, l) }
        function j() { eval_equal(func_parse("1-#{a}"), '"1-a"', {}, k) }
        function i() { eval_equal(func_parse("-#{a}"), '"-a"', {}, j) }
        function h() { eval_equal(func_parse("foo(#{a} = #{b})"), '"foo(a = b)"', {}, i) }
        function g() { eval_equal(func_parse("foo(1 = #{a})"), '"foo(1 = a)"', {}, h) }
        function f() { eval_equal(func_parse("#{a} / #{b}"), '"a / b"', {}, g) }
        function e() { eval_equal(func_parse("1 / #{a}"), '"1 / a"', {}, f) }
        function d() { eval_equal(func_parse("/ #{a}"), '"/ a"', {}, e) }
        function c() { eval_equal(func_parse("+ #{a}"), '"+ a"', {}, d) }
        function b() { eval_equal(func_parse("a#{b}c"), '"abc"', {}, c) }
        function a() {eval_equal(func_parse("#{a}"), '"a"', {}, b)}

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, a)
      });

      it('test_leading_interpolation_with_deprecation_warning', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L1209-L1232
        // v3.4.20


        function _z(contents) {
          return "console.warn.calledWith('DEPRECATION WARNING on line 0: #{} interpolation near operators will be simplified\\nin a future version of Sass. To preserve the current behavior, use quotes:\\n\\n  unquote(\\\"" + contents + "\\\")\\n\\nYou can use the sass-convert command to automatically fix most cases.\\n\\n')&&(console.warn.reset()&&true)"
        }

        function y() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            done();
          })
        }
        function x() {eval_equal(_z("1#{a + b}"), "true", {}, y)}
        function w() { eval_equal(func_parse("(1)#{a + b}"), '"1ab"', {}, x) }
        function v() {eval_equal(_z("#{a + b}1"), "true", {}, w)}
        function u() { eval_equal(func_parse("#{a + b}(1)"), '"ab1"', {}, v) }

        function t() {eval_equal(_z("#{$var}#{a + b}"), "true", {}, u)}
        function s() {eval_equal('var env =Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new(\'var\'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"$var#{a + b}\", 0, 0,Opal.hash()).$perform(env).$to_s()', '"varab"', {}, t) }

        function r() {eval_equal(_z("#{a + b}#{$var}"), "true", {}, s)}
        function q() {eval_equal('var env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\', Opal.Sass.$$scope.Script.$$scope.Value.$$scope.String.$new(\'var\'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse(\"#{a + b}$var\", 0, 0,Opal.hash()).$perform(env).$to_s()', '"abvar"', {}, r) }

        function p() {eval_equal(_z("#{a + b} - 1"), "true", {}, q)}
        function o() { eval_equal(func_parse("#{a + b} - 1"), '"ab - 1"', {}, p) }
        function n() {eval_equal(_z("#{a + b} * 1"), "true", {}, o)}
        function m() { eval_equal(func_parse("#{a + b} * 1"), '"ab * 1"', {}, n) }
        function l() {eval_equal(_z("#{a + b} <= 1"), "true", {}, m)}
        function k() { eval_equal(func_parse("#{a + b} <= 1"), '"ab <= 1"', {}, l) }
        function j() {eval_equal(_z("#{a + b} < 1"), "true", {}, k)}
        function i() { eval_equal(func_parse("#{a + b} < 1"), '"ab < 1"', {}, j) }
        function h() {eval_equal(_z("#{a + b} >= 1"), "true", {}, i)}
        function g() { eval_equal(func_parse("#{a + b} >= 1"), '"ab >= 1"', {}, h) }
        function f() {eval_equal(_z("#{a + b} > 1"), "true", {}, g)}
        function e() { eval_equal(func_parse("#{a + b} > 1"), '"ab > 1"', {}, f) }
        function d() {eval_equal(_z("#{a + b} != 1"), "true", {}, e)}
        function c() { eval_equal(func_parse("#{a + b} != 1"), '"ab != 1"', {}, d) }
        function b() {eval_equal(_z("#{a + b} == 1"), "true", {}, c)}
        function a() {eval_equal(func_parse("#{a + b} == 1"), '"ab == 1"', {}, b)}

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, a)
      });

      it('test_trailing_interpolation_with_deprecation_warning', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L1234-L1251
        // v3.4.20


        function _z(contents) {
         return "console.warn.calledWith('DEPRECATION WARNING on line 0: #{} interpolation near operators will be simplified\\nin a future version of Sass. To preserve the current behavior, use quotes:\\n\\n  unquote(\\\"" + contents + "\\\")\\n\\nYou can use the sass-convert command to automatically fix most cases.\\n\\n')&&(console.warn.reset()&&true)"
        }

        function ag() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            done();
          })
        }

        function af() {eval_equal(_z("- #{a + b} #{2 3}"), "true", {}, ag)}
        function ae() { eval_equal(func_parse("- #{a + b} 2 3"), '"- ab 2 3"', {}, af) }
        function ad() {eval_equal(_z("1- #{a + b}"), "true", {}, ae)}
        function ac() { eval_equal(func_parse("1- #{a + b}"), '"1- ab"', {}, ad) }
        function ab() {eval_equal(_z("- #{a + b}"), "true", {}, ac)}
        function aa() { eval_equal(func_parse("- #{a + b}"), '"- ab"', {}, ab) }
        function z() {eval_equal(_z("1 % #{a + b}"), "true", {}, aa)}
        function y() { eval_equal(func_parse("1 % #{a + b}"), '"1 % ab"', {}, z) }
        function x() {eval_equal(_z("1 - #{a + b}"), "true", {}, y)}
        function w() { eval_equal(func_parse("1 - #{a + b}"), '"1 - ab"', {}, x) }
        function v() {eval_equal(_z("1 * #{a + b}"), "true", {}, w)}
        function u() { eval_equal(func_parse("1 * #{a + b}"), '"1 * ab"', {}, v) }
        function t() {eval_equal(_z("1 + #{a + b}"), "true", {}, u)}
        function s() { eval_equal(func_parse('1 + #{a + b}'), '"1 + ab"', {}, t) }
        function r() {eval_equal(_z("1 <= #{a + b}"), "true", {}, s)}
        function q() { eval_equal(func_parse('1 <= #{a + b}'), '"1 <= ab"', {}, r) }
        function p() {eval_equal(_z("1 < #{a + b}"), "true", {}, q)}
        function o() { eval_equal(func_parse("1 < #{a + b}"), '"1 < ab"', {}, p) }
        function n() {eval_equal(_z("1 >= #{a + b}"), "true", {}, o)}
        function m() { eval_equal(func_parse("1 >= #{a + b}"), '"1 >= ab"', {}, n) }
        function l() {eval_equal(_z("1 > #{a + b}"), "true", {}, m)}
        function k() { eval_equal(func_parse("1 > #{a + b}"), '"1 > ab"', {}, l) }
        function j() {eval_equal(_z("1 != #{a + b}"), "true", {}, k)}
        function i() { eval_equal(func_parse("1 != #{a + b}"), '"1 != ab"', {}, j) }
        function h() {eval_equal(_z("1 == #{a + b}"), "true", {}, i)}
        function g() { eval_equal(func_parse("1 == #{a + b}"), '"1 == ab"', {}, h) }
        function f() {eval_equal(_z("1 or #{a + b}"), "true", {}, g)}
        function e() { eval_equal(func_parse("1 or #{a + b}"), '"1 or ab"', {}, f) }
        function d() {eval_equal(_z("1 and #{a + b}"), "true", {}, e)}
        function c() { eval_equal(func_parse("1 and #{a + b}"), '"1 and ab"', {}, d) }
        function b() {eval_equal(_z("not #{a + b}"), "true", {}, c)}
        function a() {eval_equal(func_parse("not #{a + b}"), '"not ab"', {}, b)}

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, a)
      });

      it('test_brackteing_interpolation_with_deprecation_warning', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L1253-L1264
        // v3.4.20


        function _z(contents) {
         return "console.warn.calledWith('DEPRECATION WARNING on line 0: #{} interpolation near operators will be simplified\\nin a future version of Sass. To preserve the current behavior, use quotes:\\n\\n  unquote(\\\"" + contents + "\\\")\\n\\nYou can use the sass-convert command to automatically fix most cases.\\n\\n')&&(console.warn.reset()&&true)"
        }

        function u() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            done();
          })
        }
        function t() {eval_equal(_z("#{a + b} % #{c + d}"), "true", {}, u)}
        function s() { eval_equal(func_parse("#{a + b} % #{c + d}"), '"ab % cd"', {}, t) }
        function r() {eval_equal(_z("#{a + b} - #{c + d}"), "true", {}, s)}
        function q() { eval_equal(func_parse("#{a + b} - #{c + d}"), '"ab - cd"', {}, r) }
        function p() {eval_equal(_z("#{a + b} * #{c + d}"), "true", {}, q)}
        function o() { eval_equal(func_parse("#{a + b} * #{c + d}"), '"ab * cd"', {}, p) }
        function n() {eval_equal(_z("#{a + b} + #{c + d}"), "true", {}, o)}
        function m() { eval_equal(func_parse("#{a + b} + #{c + d}"), '"ab + cd"', {}, n) }
        function l() {eval_equal(_z("#{a + b} <= #{c + d}"), "true", {}, m)}
        function k() { eval_equal(func_parse("#{a + b} <= #{c + d}"), '"ab <= cd"', {}, l) }
        function j() {eval_equal(_z("#{a + b} < #{c + d}"), "true", {}, k)}
        function i() { eval_equal(func_parse("#{a + b} < #{c + d}"), '"ab < cd"', {}, j) }
        function h() {eval_equal(_z("#{a + b} >= #{c + d}"), "true", {}, i)}
        function g() { eval_equal(func_parse("#{a + b} >= #{c + d}"), '"ab >= cd"', {}, h) }
        function f() {eval_equal(_z("#{a + b} > #{c + d}"), "true", {}, g)}
        function e() { eval_equal(func_parse("#{a + b} > #{c + d}"), '"ab > cd"', {}, f) }
        function d() {eval_equal(_z("#{a + b} != #{c + d}"), "true", {}, e)}
        function c() { eval_equal(func_parse("#{a + b} != #{c + d}"), '"ab != cd"', {}, d) }
        function b() {eval_equal(_z("#{a + b} == #{c + d}"), "true", {}, c)}
        function a() {eval_equal(func_parse("#{a + b} == #{c + d}"), '"ab == cd"', {}, b)}

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, a)
      });

      it('test_interp_warning_formatting', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L1266-L1278
        // v3.4.20


        function _z(contents) {
         return "console.warn.calledWith('DEPRECATION WARNING on line 0: #{} interpolation near operators will be simplified\\nin a future version of Sass. To preserve the current behavior, use quotes:\\n\\n  unquote(" + contents + ")\\n\\nYou can use the sass-convert command to automatically fix most cases.\\n\\n')&&(console.warn.reset()&&true)"
        }

        function q() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            done();
          })
        }
        function p() {eval_equal(_z("\\\"1 + \\\\\"\\'\\\\\\\\\\\\\"\\\\\"\\\""), "true", {}, q)}
        function o() {eval_equal(func_parse("#{1} + \\\"'\\\\\\\"\\\""), '"1 + \\\"\'\\\\\\\"\\\""', {}, p) }
        function n() {eval_equal(_z("\\\"1 + \\'\\\\\"\\'\\\""), "true", {}, o)}
        function m() {eval_equal(func_parse("#{1} + \'\\\"\\\'"), '"1 + \\\'\\\"\\\'"', {}, n) }
        function l() {eval_equal(_z("\\\"1 + \\\\\"\\'\\\\\"\\\""), "true", {}, m)}
        function k() {eval_equal(func_parse("#{1} + \\\"\\'\\\""), '"1 + \\"\'\\""', {}, l) }
        function j() {eval_equal(_z("\\'\\\"#{a + b}\\\" + 1 + \\\"#{c + d}\\\"\\'"), "true", {}, k)}
        function i() {eval_equal(func_parse("\\\"#{a + b}\\\" + #{1} + \\\"#{c + d}\\\""), '"\\\"ab\\\" + 1 + \\\"cd\\\""', {}, j) }
        function h() {eval_equal(_z("\\'\\\"#{a + b}\\\" + 1\\'"), "true", {}, i)}
        function g() {eval_equal(func_parse("\\\"#{a + b}\\\" + #{1}"), '"\\\"ab\\\" + 1"', {}, h) }
        function f() {eval_equal(_z("\\'1 + \\\"foo\\\"\\'"), "true", {}, g)}
        function e() {eval_equal(func_parse("#{1} + \\'foo\\'"), '"1 + \\\"foo\\\""', {}, f) }
        function d() {eval_equal(_z("\\'1 + \\\"foo\\\"\\'"), "true", {}, e)}
        function c() {eval_equal(func_parse("#{1} + \\\"foo\\\""), '"1 + \\\"foo\\\""', {}, d) }
        function b() {eval_equal(_z("\\\"1 + 1\\\""), "true", {}, c)}
        function a() {eval_equal(func_parse("#{1} + 1"), '"1 + 1"', {}, b)}

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, a)
      });

      it('test_inactive_lazy_interpolation_deprecation_warning', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/script_test.rb#L1280-L1296
        // v3.4.20

        function m() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.be(true);
            done();
          })
        }
        function l() { eval_equal(func_parse("selector-parse((a, #{b}, c))"), '"a, b, c"', {}, m) }
        function k() { eval_equal(func_parse("1 + (1, #{2}, 3)"), '"11, 2, 3"', {}, l) }
        function j() { eval_equal(func_parse("(1, #{2}, 3) + 1"), '"1, 2, 31"', {}, k) }
        function i() { eval_equal(func_parse("/#{1} 2 3"), '"/1 2 3"', {}, j) }
        function h() { eval_equal(func_parse("-#{1} 2 3"), '"-1 2 3"', {}, i) }
        function g() { eval_equal(func_parse("+#{1} 2 3"), '"+1 2 3"', {}, h) }
        function f() { eval_equal(func_parse("1 2 #{3}"), '"1 2 3"', {}, g) }
        function e() { eval_equal(func_parse("1 #{2} 3"), '"1 2 3"', {}, f) }
        function d() { eval_equal(func_parse("#{1} 2 3"), '"1 2 3"', {}, e) }
        function c() { eval_equal(func_parse("1,#{2},3"), '"1,2,3"', {}, d) }
        function b() { eval_equal(func_parse("1, 2, #{3}"), '"1, 2, 3"', {}, c) }
        function a() {eval_equal(func_parse("1, #{2}, 3"), '"1, 2, 3"', {}, b)}

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, a)
      });

      it('test_import_with_supports_clause_interp', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/scss/scss_test.rb#L4129-L4136
        // v3.4.20

        var css = "@import url(\"fallback-layout.css\") supports(not (display: flex))\n";
        var scss = "$display-type: flex;\n@import url(\"fallback-layout.css\") supports(not (display: #{$display-type}));\n";
        equal(scss,css,{syntax: 'scss', style: 'compressed'}, done)
      });

      it('test_import_with_supports_clause', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/scss/scss_test.rb#L4138-L4145
        // v3.4.20

        var css = "@import url(\"fallback-layout.css\") supports(not (display: flex));.foo{bar:baz}\n";
        var scss = "@import url(\"fallback-layout.css\") supports(not (display: flex));\n.foo { bar: baz; }\n";
        equal(scss,css,{syntax: 'scss', style: 'compressed'}, done)
      });

      it('test_round_respects_precision', function(done) {
        // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/util_test.rb#L357-L366
        // v3.4.20

        function sixth() {
          sassBuilder({eval: "Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number[\'$precision=\'](original_precision)", options: {syntax: 'scss'}}, function(result) {
            expect(result.err).to.be(undefined);
            expect(result.css).to.not.be(undefined);
            done();
          });
        }

        function fifth(result) {
          eval_equal('Opal.Sass.$$scope.Util.$round(0.49999999)', '1', {syntax: 'scss'}, sixth);
        }

        function fourth(result) {
          eval_equal('Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number[\'$precision=\'](6);Opal.Sass.$$scope.Util.$round(0.499999)', '0', {syntax: 'scss'}, fifth);
        }

        function third(result) {
          eval_equal('Opal.Sass.$$scope.Util.$round(0.499999)', '1', {syntax: 'scss'}, fourth);
        }

        function second(result) {
          eval_equal('Opal.Sass.$$scope.Util.$round(0.49999)', '0', {syntax: 'scss'}, third);
        }

        sassBuilder({eval: "original_precision=Opal.Sass.$$scope.Script.$$scope.Value.$$scope.Number.$precision()", options: {syntax: 'scss'}}, second);
      });

      if (semver.lt(window.__libVersion, "3.4.21")) {
        it('test_compressed_output_of_nth_selectors', function(done) {
          // https://github.com/sass/sass/blob/9077d95ffa6ab9388f59074483f1ef508d75d448/test/sass/engine_test.rb#L3325-L3334
          // v3.4.20

          var css = ":nth-of-type(2n-1),:nth-of-type(2n-1),:nth-of-type(2n-1),:nth-of-type(2n-1),:nth-of-type(2n-1){color:red}:nth-of-type(2n+1),:nth-of-type(2n+1),:nth-of-type(2n+1),:nth-of-type(2n+1),:nth-of-type(2n+1){color:red}\n";
          var scss = ":nth-of-type(2n-1), :nth-of-type(2n-  1), :nth-of-type(2n  -1), :nth-of-type(2n  -  1), :nth-of-type( 2n  -  1 ) {\n  color: red }\n:nth-of-type(2n+1), :nth-of-type(2n+  1), :nth-of-type(2n  +1), :nth-of-type(2n  +  1), :nth-of-type( 2n  +  1 ) {\n  color: red }\n";
          equal(scss,css,{syntax: 'scss', style: 'compressed'}, done)
        });
      }
    }

/*****************************************************************************************************
  * v3.4.21
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.21")) {
      it('test_numeric_formatting_of_integers', function(done) {
        // https://github.com/sass/sass/blob/957099ec811f0849f7f9b308f0d886732ae85c97/test/sass/engine_test.rb#L3325-L3336
        // v3.4.21

        var css = "a{near:3.00001;plus:3;minus:3;negative:-3}\n";
        var scss = "a {\n  near: (3 + 0.00001);\n  plus: (3 + 0.0000001);\n  minus: (3 - 0.0000001);\n  negative: (-3 + 0.0000001);\n}\n";
        equal(scss,css,{syntax: 'scss', style: 'compressed'}, done)
      });

      it('test_escaped_semicolons_are_not_compressed', function(done) {
        // https://github.com/sass/sass/blob/957099ec811f0849f7f9b308f0d886732ae85c97/test/sass/engine_test.rb#L3338-L3346
        // v3.4.21

        var css = "div{color:#f00000\\9\\0\\;}\n";
        var scss = "div {\n color: #f00000\\9\\0\\;\n}";
        equal(scss,css,{syntax: 'scss', style: 'compressed'}, done)
      });

      it('test_compressed_output_of_nth_selectors', function(done) {
        // https://github.com/sass/sass/blob/957099ec811f0849f7f9b308f0d886732ae85c97/test/sass/engine_test.rb#L3348-L3357
        // v3.4.21

        var css = ":nth-of-type(2n-1),:nth-child(2n-1),:nth(2n-1),:nth-of-type(2n-1),:nth-of-type(2n-1){color:red}:nth-of-type(2n+1),:nth-child(2n+1),:nth(2n+1),:nth-of-type(2n+1),:nth-of-type(2n+1){color:red}\n";
        var scss = ":nth-of-type(2n-1), :nth-child(2n-  1), :nth(2n  -1), :nth-of-type(2n  -  1), :nth-of-type( 2n  -  1 ) {\n  color: red }\n:nth-of-type(2n+1), :nth-child(2n+  1), :nth(2n  +1), :nth-of-type(2n  +  1), :nth-of-type( 2n  +  1 ) {\n  color: red }\n";
        equal(scss,css,{syntax: 'scss', style: 'compressed'}, done)
      });

      it('test_descendant_selectors_with_leading_dash', function(done) {
        // https://github.com/sass/sass/blob/957099ec811f0849f7f9b308f0d886732ae85c97/test/sass/engine_test.rb#L3359-L3366
        // v3.4.21

        var css = "a -b{color:red}\n";
        var scss = "a -b {\n  color: red }\n";
        equal(scss,css,{syntax: 'scss', style: 'compressed'}, done)
      });

      it('test_compressed_commas_in_attribute_selectors', function(done) {
        // https://github.com/sass/sass/blob/957099ec811f0849f7f9b308f0d886732ae85c97/test/sass/engine_test.rb#L3385-L3392
        // v3.4.21

        var css = ".classname[a=\"1, 2, 3\"],.another[b=\"4, 5, 6\"]{color:red}\n";
        var sass = ".classname[a=\"1, 2, 3\"], .another[b=\"4, 5, 6\"]\n  color: red\n";
        equal(sass,css,{syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_subtraction_vs_minus_vs_identifier', function(done) {
        // https://github.com/sass/sass/blob/957099ec811f0849f7f9b308f0d886732ae85c97/test/sass/script_test.rb#L387-L396
        // v3.4.21

        function h() { eval_equal(func_parse("1em - 0.75"), '"0.25em"', {}, done) }
        function g() { eval_equal(func_parse("1em - .75"), '"0.25em"', {}, h) }
        function f() { eval_equal(func_parse("1em- 0.75"), '"1em- 0.75"', {}, g) }
        function e() { eval_equal(func_parse("1em- .75"), '"1em- 0.75"', {}, f) }
        function d() { eval_equal(func_parse("1em -0.75"), '"1em -0.75"', {}, e) }
        function c() { eval_equal(func_parse("1em -.75"), '"1em -0.75"', {}, d) }
        function b() { eval_equal(func_parse("1em-0.75"), '"0.25em"', {}, c) }
        eval_equal(func_parse("1em-.75"), '"0.25em"', {}, b)
      });

      it('test_comparison_of_complex_units', function(done) {
        // https://github.com/sass/sass/blob/957099ec811f0849f7f9b308f0d886732ae85c97/test/sass/script_test.rb#L1320-L1338
        // v3.4.21

        function seventh() { eval_equal(func_parse("5px * 1px < 2px * 5px"), '"true"', {}, done) }
        function sixth() { eval_equal(func_parse("10px * 1px == 2px * 5px"), '"true"', {}, seventh) }

        function fifth() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 0 of test_comparison_of_complex_units_inline.sass:\\nThe result of `10 == 10px*px` will be `false` in future releases of Sass.\\nUnitless numbers will no longer be equal to the same numbers with units.\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)
              sixth();
          })
        }

        function fourth() {
          eval_equal(func_parse("10 == 2px * 5px", {filename: 'test_comparison_of_complex_units_inline.sass'}), '"true"', {}, fifth)
        }

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 0 of test_comparison_of_complex_units_inline.sass:\\nThe result of `10 == 10px` will be `false` in future releases of Sass.\\nUnitless numbers will no longer be equal to the same numbers with units.\\n\\n')===true&&(console.warn.reset(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true)
              fourth();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          eval_equal(func_parse("10 == 2 * 5px", {filename: 'test_comparison_of_complex_units_inline.sass'}), '"true"', {}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })
    }

/*****************************************************************************************************
  * v3.4.22
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.22")) {
      it('test_crlf', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/scss/scss_test.rb#L4147-L4155
        // v3.4.22

        var css = "p {\n  margin: 0; }\n";
        var scss = "p {\r\n   margin: 0;\r\n}\n";
        equal(scss,css,{syntax: 'scss'}, done)
      });

      it('test_variable_warning_for_operators', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L7-L18
        // v3.4.22

        function j() {resolve_with_variable_warning("1 % 1", undefined, 'test_variable_warning_for_operators_inline', done)}
        function i() {resolve_with_variable_warning("1 * 1", undefined, 'test_variable_warning_for_operators_inline', j)}
        function h() {resolve_with_variable_warning("1 - 1", undefined, 'test_variable_warning_for_operators_inline', i)}
        function g() {resolve_with_variable_warning("1 + 1", undefined, 'test_variable_warning_for_operators_inline', h)}
        function f() {resolve_with_variable_warning("1 >= 2", undefined, 'test_variable_warning_for_operators_inline', g)}
        function e() {resolve_with_variable_warning("1 > 2", undefined, 'test_variable_warning_for_operators_inline', f)}
        function d() {resolve_with_variable_warning("1 <= 2", undefined, 'test_variable_warning_for_operators_inline', e)}
        function c() {resolve_with_variable_warning("1 < 2", undefined, 'test_variable_warning_for_operators_inline', d)}
        function b() {resolve_with_variable_warning("1 != 2", undefined, 'test_variable_warning_for_operators_inline', c)}
        resolve_with_variable_warning("1 == 2", undefined, 'test_variable_warning_for_operators_inline', b)
      });

      it('test_variable_warning_for_variable', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L20-L27
        // v3.4.22

        render_with_variable_warning(".foo {\n  $var: value;\n  --var: $var;\n}\n", "$var", 3, {syntax: 'scss', filename: 'test_variable_warning_for_variable_inline'}, 'test_variable_warning_for_variable_inline', done)
      });

      it('test_variable_warning_for_core_function', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L29-L31
        // v3.4.22

        resolve_with_variable_warning("alpha(#abc)", undefined, 'test_variable_warning_for_core_function_inline', done)
      });

      it('test_variable_warning_for_sass_function', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L33-L38
        // v3.4.22

        render_with_variable_warning("@function my-fn() {@return null}\n.foo {--var: my-fn()}\n", "my-fn()", 2, {syntax: 'scss', filename: 'test_variable_warning_for_sass_function_inline'}, 'test_variable_warning_for_sass_function_inline', done)
      });

      it('test_variable_warning_for_parens', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L40-L43
        // v3.4.22

        function b() {resolve_with_variable_warning("(foo,)", undefined, 'test_variable_warning_for_parens_inline', done)}
        resolve_with_variable_warning("(foo)", "foo", 'test_variable_warning_for_parens_inline', b)
      });

      it('test_variable_warning_for_selector', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L45-L47
        // v3.4.22

        resolve_with_variable_warning("&", undefined, 'test_variable_warning_for_selector_inline', done)
      });

      it('test_variable_warning_for_nested_properties', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L49-L61
        // v3.4.22

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 2 of test_variable_warning_for_nested_properties.scss:\\nSass 3.6 will change the way CSS variables are parsed. Instead of being parsed as\\nnormal properties, they will not allow any Sass-specific behavior other than #{}.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function second(result) {
          expect(result.err).to.be(undefined);
          sassBuilder({css:".foo {\n  --var: {\n    a: b;\n  }\n}\n", options: {syntax: 'scss', filename: 'test_variable_warning_for_nested_properties.scss'}}, third)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      })

      it('test_no_warning', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L63-L73
        // v3.4.22

        function i() {no_variable_warning("asdf(foo=2)", done)}
        function h() {no_variable_warning("calc(1 + 1)", i)}
        function g() {no_variable_warning("asdf(foo)", h)}
        function f() {no_variable_warning("foo / bar", g)}
        function e() {no_variable_warning("1 / 2", f)}
        function d() {no_variable_warning("1 2", e)}
        function c() {no_variable_warning("1, 2", d)}
        function b() {no_variable_warning("true", c)}
        no_variable_warning("foo", b)
      });

      it('test_no_warning_within_interpolation', function(done) {
        // https://github.com/sass/sass/blob/22cee12649eb084b4c6ddff8773e4293d8998ae3/test/sass/css_variable_test.rb#L75-L78
        // v3.4.22

        function b() {no_variable_warning("#{alpha(#abc)}", done)}
        no_variable_warning("#{1 + 1}", b)
      });
    }

/*****************************************************************************************************
  * v3.4.23
  *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.4.23")) {
      it('test_resolution_units', function(done) {
        // https://github.com/sass/sass/blob/a6bf6fc993ef21d952a8db1e23b0fb22ef99210a/test/sass/script_test.rb#L560-L564
        // v3.4.23

        function c() {eval_equal(func_parse("(1dppx/1dpi)"), '"96"', {}, done) }
        function b() {eval_equal(func_parse("(1dpcm/1dppx)"), '"0.02646"', {}, c) }
        eval_equal(func_parse("(1dpi/1dpcm)"), '"0.3937"', {}, b)
      });

      it('test_no_interpolation_warning_in_nested_selector', function(done) {
        // https://github.com/sass/sass/blob/a6bf6fc993ef21d952a8db1e23b0fb22ef99210a/test/sass/scss/scss_test.rb#L3653-L3664
        // v3.4.23

        function third() {
          sassBuilder({eval: "console.warn.callCount===0&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function second() {
          var css = "z a:b(n+1) {\n  x: y; }\n";
          var scss = "z {\n  a:b(n+#{1}) {\n    x: y;\n  }\n}\n";
          equal(scss,css,{syntax: 'scss'}, done)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      });

      it('test_interpolation_warning_in_selector_like_property', function(done) {
        // https://github.com/sass/sass/blob/a6bf6fc993ef21d952a8db1e23b0fb22ef99210a/test/sass/scss/scss_test.rb#L3667-L3683
        // v3.4.23

        function third() {
          sassBuilder({eval: "console.warn.callCount===1&&console.warn.calledWith('DEPRECATION WARNING on line 2 of test_interpolation_warning_in_selector_like_property_inline.scss: #{} interpolation near operators will be simplified\\nin a future version of Sass. To preserve the current behavior, use quotes:\\n\\n  unquote(\\\"n+1\\\")\\n\\nYou can use the sass-convert command to automatically fix most cases.\\n\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
            expect(result.css).to.be(true);
            done();
          })
        }

        function second() {
          var css = "z {\n  a: b(n+1); }\n";
          var scss = "z {\n  a:b(n+#{1});\n}\n";
          equal(scss,css,{syntax: 'scss', filename: 'test_interpolation_warning_in_selector_like_property_inline.scss'}, done)
        }

        sassBuilder({eval: "importScripts(\'/base/lib/js/sinon.js\');console.warn=console.warn.reset ? console.warn.reset()&&console.warn : sinon.spy(console, \'warn\')", options: {syntax: 'scss'}}, second)
      });
    }
  })
});
