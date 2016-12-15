// tests have to be manually converted from the ruby source. ALL tests should be here, with the exception of tests for CLI options or other literally impossible things to support. If you see something missing, please PR or open an issue!

describe('sass', function() {

  this.timeout(5 * 60 * 1000)
  var munge_filename;
  var scanner_state;
  var doesnt_parse;
  var err_message;
  var sassBuilder;
  var func_parse;
  var compare;
  var matches
  var parses;
  var equal;
  var sass;

  before(function() {
    sass = new Worker(__workerPath)

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
      return "(a.pos===" + pos + "&&a.$byte_pos()===" + byte_pos + "&&a.$matched_size()===" + matched_size + "&&a.$byte_matched_size()===" + byte_matched_size + ")";
    }

    func_parse = function(val, opts) {
      opts = opts || {}
     return 'Opal.Sass.$$scope.Script.$$scope.Parser.$parse("' + val + '", 0, 0,Opal.hash2(' + JSON.stringify(Object.keys(opts)) + ',' + JSON.stringify(opts) + ')).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()';
    }

    eval_equal = function (to_eval, expected, opts, done) {
      opts = opts || {}
      to_eval += '===' + expected
          console.log(to_eval)

      sassBuilder({eval: to_eval, options: opts}, function(result) {
          expect(result.err).to.be(undefined)
          expect(result.css).to.be(true)
          done()
      })
    }

    eval_err = function(to_eval, err_text, opts, done) {
      sassBuilder({eval: to_eval}, function(result) {
          expect(JSON.parse(result.err).message).to.contain(err_text)
          expect(result.css).to.be(undefined)
          done()
      })
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
      opts = munge_filename(opts || {}, context)
      sassBuilder({css: css, options: opts}, function(result) {
        expect(result.err).to.be(undefined)
          expect(result.css).to.be(expected)
          done()
      })
    }

    doesnt_parse = function (css, expected, opts, done) {
      opts = opts || {}

      var err_sections = css.split("<err>")
      var after = err_sections[0]
      var was = err_sections[1]
      var line = (after.match(/\\n/g) || []).length + 1;

      after = after.replace(/\s*\n\s*$/g, '')
      after = after.replace(/.*\n/g, '')
      if (after.length > 18) {
        after = "..." + after.slice(-15, after.length)
      }

      was = was.replace(/^\s*\n\s*/g, '')
      was = was.replace(/\n.*/g, '')
      if (was.length > 18) {
        was = "..." + after.slice(0, 15)
      }

      css = css.replace("<err>", "")

      sassBuilder({css: css, options: opts}, function(result) {
          expect(result.err).to.not.be(undefined)
          expect(JSON.parse(result.err).message).to.contain("Invalid CSS after \"" + after + "\": expected " + expected + ", was \"" + was + "\"")
          expect(result.css).to.be(undefined)
          done()
      })
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
      to_eval = 'var a ="' + to_match + '".match(' + regexp_path.replace(/::/g, '.$$$scope.') + ');a&&a[0].length==="' + to_match+ '".length||false'

        if (doesMatch === undefined) {
          doesMatch = true
        }

        sassBuilder({eval: to_eval, options: opts}, function(result) {
          expect(result.err).to.be(undefined)
          expect(result.css).to.equal(doesMatch)
          done()
        })
    }

    doesnt_match = function (regexp_path, to_match, opts, done) {
      matches(regexp_path, to_match, opts, done, false)
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

          sassBuilder({css: source.sass, options: opts}, function(response) {
            if (response.err === null) { response.err = undefined; }

            expect(response.err).to.be(undefined);
            expect(response.css).to.not.be(undefined);
            expect(response.css).to.eql(source.result);
            done();
          })
        } else {
          this.test.title = 'includes a banned function...skipping...';
          this.test.skip();
          done();
        }
      });
    })
  })

    describe('inline tests', function() {
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
          var css  = ".foo {\n  /* Foo\n   * Bar */\n  a: b; }\n";

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

      it('test_unary_ops', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L415-L429
        // v3.1.0

        var css = "foo {\n  a: -0.5em;\n  b: 0.5em;\n  c: -foo(12px);\n  d: +foo(12px); }\n";
        var scss = "foo {\n  a: -0.5em;\n  b: +0.5em;\n  c: -foo(12px);\n  d: +foo(12px); }\n";

        equal(scss, css, {syntax: 'scss'}, done)
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

      it('test_namespace_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L455-L459
        // v3.1.0

        function third() {parses('@namespace html url("http://www.w3.org/Profiles/xhtml1-strict");', {syntax: 'scss'}, done)}
        function second() {parses('@namespace url(http://www.w3.org/Profiles/xhtml1-strict);', {syntax: 'scss'}, third)}
        parses('@namespace "http://www.w3.org/Profiles/xhtml1-strict";', {syntax: 'scss'}, second)
      });

      it('test_media_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L461-L478
        // v3.1.0

        function second() {
          parses("@media screen, print {\n  rule1 {\n    prop: val; }\n\n  rule2 {\n    prop: val; } }\n", {syntax: 'scss'}, done)
        }

        parses("@media all {\n  rule1 {\n    prop: val; }\n\n  rule2 {\n    prop: val; } }\n", {syntax: 'scss'}, second)
      });

      it('test_media_directive_with_keywords', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L480-L489
        // v3.1.0

        function second() {
          parses("@media screen and (-webkit-min-device-pixel-ratio:0) {\n  a: b; }\n", {syntax: 'scss'}, done)
        }

        parses("@media only screen, print and (foo: 0px) and (bar: flam(12px solid)) {\n  a: b; }\n", {syntax: 'scss'}, second)
      });

      it('test_import_directive', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L491-L497
        // v3.1.0

        function third() {parses('@import url(foo.css);', {syntax: 'scss'}, done) }
        function second() {parses("@import url('foo.css');", {syntax: 'scss'}, third) }
        parses('@import url("foo.css");', {syntax: 'scss'}, second)
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

      it('test_multiple_block_directives', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L556-L564
        // v3.1.0

        var source = "@foo bar {\n  a: b; }\n\n@bar baz {\n  c: d; }\n";

        parses(source, {syntax: 'scss'}, done)
      });

      it('test_block_directive_with_rule_and_property', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L566-L574
        // v3.1.0

        var source = "@foo {\n  rule {\n    a: b; }\n\n  a: b; }\n";

        parses(source, {syntax: 'scss'}, done)
      });

      it('test_block_directive_with_semicolon', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L576-L587
        // v3.1.0

        var css = "@foo {\n  a: b; }\n\n@bar {\n  a: b; }\n";
        var scss = "@foo {a:b};\n@bar {a:b};\n";

        equal(scss, css, {syntax: 'scss'}, done)
      });

      it('test_summarized_selectors', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L592-L635
        // v3.1.0

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

      it('test_expression_fallback_selectors', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/css_test.rb#L767-L773
        // v3.1.0

        function e(){parses('"foo" {\n  a: b; }\n',{syntax: 'scss'}, done)}
        function d(){parses('12px {\n  a: b; }\n',{syntax: 'scss'},e)}
        function c(){parses('100% {\n  a: b; }\n',{syntax: 'scss'},d)}
        function b(){parses('60% {\n  a: b; }\n',{syntax: 'scss'},c)}

        parses('0% {\n  a: b; }\n',{syntax: 'scss'},b)
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

        it('test_while_directive', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L219-L236
          // v3.1.0

          var css = ".foo {\n  a: 1;\n  a: 2;\n  a: 3;\n  a: 4; }\n";
          var scss = "$i: 1;\n\n.foo {\n  @while $i != 5 {\n    a: $i;\n    $i: $i + 1;\n  }\n}\n";
          equal(scss, css,{syntax: 'scss'}, done)
        });

        it('test_each_directive', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L238-L263
          // v3.1.0

          var css = "a {\n  b: 1px;\n  b: 2px;\n  b: 3px;\n  b: 4px; }\n\nc {\n  d: foo;\n  d: bar;\n  d: baz;\n  d: bang; }\n";
          var scss = "a {\n  @each $number in 1px 2px 3px 4px {\n    b: $number;\n  }\n}\nc {\n  @each $str in foo, bar, baz, bang {\n    d: $str;\n  }\n}\n";
          equal(scss, css,{syntax: 'scss'}, done)
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

        it('test_media_import', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L273-L275
          // v3.1.0

          var css = "@import \"./fonts.sass\" all;\n"
            var scss = "@import \"./fonts.sass\" all;"
            equal(scss, css, {syntax: 'scss'}, done)
        });

        it('test_http_import', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L277-L280
          // v3.1.0

          var css = "@import \"http://fonts.googleapis.com/css?family=Droid+Sans\";\n"
            var scss = "@import \"http://fonts.googleapis.com/css?family=Droid+Sans\";"
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

        it('test_nested_rules_with_fancy_selectors', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L336-L382
          // v3.1.0

          var css = "foo .bar {\n  a: b; }\nfoo :baz {\n  c: d; }\nfoo bang:bop {\n  e: f; }\n";
          var scss = "foo {\n  .bar {a: b}\n  :baz {c: d}\n  bang:bop {e: f}}\n";
          equal(scss, css, {syntax: 'scss'}, done)
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

        it('test_no_namespace_properties_without_space_even_when_its_unambiguous', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L595-L608
          // v3.1.0

          err_message("foo {\n  bar:1px {\n    bip: bop }}\n", 'Invalid CSS: a space is required between a property and its definition\nwhen it has other properties nested beneath it.', {syntax: 'scss'}, done)
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

        it('test_mixin_defs_only_at_toplevel', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L870-L879
          // v3.1.0

          err_message("foo {\n  @mixin bar {a: b}}\n", 'Mixins may only be defined at the root of a document.', {syntax: 'scss'}, done)
        });

        it('test_rules_beneath_properties', function(done) {
          // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L881-L892
          // v3.1.0

          err_message("foo {\n  bar: {\n    baz {\n      bang: bop }}}\n", 'Illegal nesting: Only properties may be nested beneath properties.', {syntax: 'scss'}, done)
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

      it('test_uses_rule_exception_with_dot_hack', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L916-L925
        // v3.1.0

        err_message("foo {\n  .bar:baz <fail>; }\n", 'Invalid CSS after "  .bar:baz ": expected "{", was "<fail>; }"', {syntax: 'scss'}, done)
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

      it('test_post_resolution_selector_error', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/scss/scss_test.rb#L1023-L1029
        // v3.1.0

        err_message("\n\nfoo \#{\") bar\"} {a: b}", 'Invalid CSS after "foo ": expected selector, was ") bar"', {syntax: 'scss'}, done)
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
        var css = "ns|* {\n  a: b; }\n";
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

    it('test_nested_extender_merges_with_same_selector', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1189-L1198
      // v3.1.0

      var css = ".foo .bar, .foo .baz {\n  a: b; }\n";
      var scss = ".foo {\n  .bar {a: b}\n  .baz {@extend .bar} }\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })

    it('test_nested_extender_with_child_selector_merges_with_same_selector', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1200-L1208
      // v3.1.0

      var css = ".foo > .bar .baz, .foo > .bar .bang {\n  a: b; }\n";
      var scss = ".foo > .bar .baz {a: b}\n.foo > .bar .bang {@extend .baz}\n";
      equal(scss, css, {syntax: 'scss'}, done)
    })

    it('test_extend_self_loop', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1212-L1219
      // v3.1.0

      var css = ".foo {\n  a: b; }\n";
      var scss = ".foo {a: b; @extend .foo}\n";
      equal(scss, css, {syntax: 'scss'}, done)
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

    it('test_nested_extend_loop', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/extend_test.rb#L1251-L1263
      // v3.1.0

      var css = ".bar, .bar .foo {\n  a: b; }\n  .bar .foo, .bar .foo .foo {\n    c: d; }\n";
      var scss = ".bar {\n  a: b;\n  .foo {c: d; @extend .bar}\n}\n";
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

    it('test_while', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1255-L1278
      // v3.1.0

      var css = "a-5 {\n  blooble: gloop; }\n\na-4 {\n  blooble: gloop; }\n\na-3 {\n  blooble: gloop; }\n\na-2 {\n  blooble: gloop; }\n\na-1 {\n  blooble: gloop; }\n";
      var scss = "$a: 5\n@while $a != 0\n  a-#{$a}\n    blooble: gloop\n  $a: $a - 1\n";
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

    it('test_variable_reassignment', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1343-L1355
      // v3.1.0

      var css = "a {\n  b: 1;\n  c: 2; }\n";
      var scss = "$a: 1\na\n  b: $a\n  $a: 2\n  c: $a\n";
        equal(scss, css, {syntax: 'sass'}, done)
    })

    it('test_variable_scope', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1357-L1380
      // v3.1.0

      var css = "a {\n  b-1: c;\n  b-2: c;\n  d: 12; }\n\nb {\n  d: 17; }\n";
      var scss = "$i: 12\na\n  @for $i from 1 through 2\n    b-#{$i}: c\n  d: $i\n=foo\n  $i: 17\nb\n  +foo\n  d: $i\n";
        equal(scss, css, {syntax: 'sass'}, done)
    })

    it('test_hyphen_underscore_insensitive_variables', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1382-L1403
      // v3.1.0

      var css = "a {\n  b: c; }\n\nd {\n  e: 13;\n  f: foobar; }\n";
      var scss = "$var-hyphen: 12\n$var_under: foo\na\n  $var_hyphen: 1 + $var_hyphen\n  $var-under: $var-under + bar\n  b: c\nd\n  e: $var-hyphen\n  f: $var_under\n";
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

    it('test_loud_comment_in_compressed_mode', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1538-L1550
      // v3.1.0

      var css = "foo{color:blue;/* foo\n * bar\n */}\n";
      var scss = "foo\n  color: blue\n  /*! foo\n   * bar\n   */\n";
        equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
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

    it('test_interpolation_doesnt_deep_unquote_strings', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1773-L1781
      // v3.1.0

      var css = ".foo- \"bar\" \"baz\" {\n  a: b; }\n";
      var scss = ".foo-\#{\"bar\" \"baz\"}\n  a: b\n";
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

    it('test_rule_media_rule_bubbling', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1949-L1965
      // v3.1.0

      var css = "@media bar {\n  .foo {\n    a: b;\n    e: f; }\n    .foo .baz {\n      c: d; } }\n";
      var scss = ".foo\n  @media bar\n    a: b\n    .baz\n      c: d\n    e: f\n";
      equal(scss, css, {syntax: 'sass'}, done)
    });

    it('test_nested_media_around_properties', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1967-L1992
      // v3.1.0

      var css = ".outside {\n  color: red;\n  background: blue; }\n  @media print {\n    .outside {\n      color: black; } }\n    @media print and nested {\n      .outside .inside {\n        border: 1px solid black; } }\n  .outside .middle {\n    display: block; }\n";
      var scss = ".outside\n  color: red\n  @media print\n    color: black\n    .inside\n      @media nested\n        border: 1px solid black\n  background: blue\n  .middle\n    display: block\n";
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

    it('test_hsla', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L88-L93
      // v3.1.0
      function fourth() { eval_equal(func_parse("hsla($hue: 180, $saturation: 60%, $lightness: 50%, $alpha: 0.4)"), '"rgba(51, 204, 204, 0.4)"', {}, done) }
      function third() { eval_equal(func_parse("hsla(180, 60%, 50%, 0)"), '"rgba(51, 204, 204, 0)"', {}, fourth) }
      function second() { eval_equal(func_parse("hsla(180, 60%, 50%, 1)"), '"#33cccc"', {}, third) }
      eval_equal(func_parse("hsla(180, 60%, 50%, 0.4)"), '"rgba(51, 204, 204, 0.4)"', {}, second)
    });

    it('test_hsla_checks_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L95-L100
      // v3.1.0

      function fourth() { eval_err(func_parse("hsla(10, 10, 10, 1.1)"), "Alpha channel 1.1 must be between 0 and 1", {}, done) }
      function third() { eval_err(func_parse("hsla(10, 10, 10, -0.1)"), "Alpha channel -0.1 must be between 0 and 1", {}, fourth) }
      function second() { eval_err(func_parse("hsla(10, 10, 256%, 0)"), "Lightness 256 must be between 0% and 100%", {}, third) }
      eval_err(func_parse("hsla(10, -114, 12, 1)"), "Saturation -114 must be between 0% and 100%", {}, second)
    });

    it('test_hsla_checks_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L102-L107
      // v3.1.0

      function fourth() {eval_err(func_parse('hsla(\\"foo\\", 10, 12, 0.3)'), "\"foo\" is not a number", {}, done)};
      function third() {eval_err(func_parse('hsla(10, \\"foo\\", 12, 0)'), "\"foo\" is not a number", {}, fourth)};
      function second() {eval_err(func_parse('hsla(10, 10, \\"foo\\", 1)'), "\"foo\" is not a number", {}, third)};
      eval_err(func_parse('hsla(10, 10, 10, \\"foo\\")'), "\"foo\" is not a number", {}, second);
    });

    it('test_percentage', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L109-L114
      // v3.1.0

      function fourth() {eval_equal(func_parse("percentage(.5)"), '"50%"', {}, done)}
      function third() {eval_equal(func_parse("percentage(1)"), '"100%"', {}, fourth)}
      function second() { eval_equal(func_parse("percentage($value: 0.5)"), '"50%"', {}, third) }
      eval_equal(func_parse("percentage(25px / 100px)"), '"25%"', {}, second)
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
      function fourth() {eval_equal(func_parse("round(4.8px)"), '"5px"', {}, done)}
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

    it('test_rgb_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L171-L182
      // v3.1.0

      function fifth() {eval_err(func_parse('rgb(256, 1, 1)'), "Color value 256 must be between 0 and 255 inclusive", {}, done)};
      function fourth() {eval_err(func_parse('rgb(1, 256, 1)'), "Color value 256 must be between 0 and 255 inclusive", {}, fifth)};
      function third() {eval_err(func_parse('rgb(1, 1, 256)'), "Color value 256 must be between 0 and 255 inclusive", {}, fourth)};
      function second() {eval_err(func_parse('rgb(1, 256, 257)'), "Color value 256 must be between 0 and 255 inclusive", {}, third)};
      eval_err(func_parse('rgb(-1, 1, 1)'), "Color value -1 must be between 0 and 255 inclusive", {}, second);
    });

    it('test_rgb_test_percent_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
      // v3.1.0

      function third() {eval_err(func_parse('rgb(0, 0, 101%)'), "Color value 101% must be between 0% and 100% inclusive", {}, done)};
      function second() {eval_err(func_parse('rgb(0, -0.1%, 0)'), "Color value -0.1% must be between 0% and 100% inclusive", {}, third)};
      eval_err(func_parse('rgb(100.1%, 0, 0)'), "Color value 100.1% must be between 0% and 100% inclusive", {}, second);
    });

    it('test_rgb_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
      // v3.1.0

      function third() {eval_err(func_parse('rgb(\\"foo\\", 10, 12)'), '\"foo\" is not a number', {}, done)};
      function second() {eval_err(func_parse('rgb(10, \\"foo\\", 12)'), '\"foo\" is not a number', {}, third)};
      eval_err(func_parse('rgb(10, 10, \\"foo\\")'), '\"foo\" is not a number', {}, second);
    });

    it('test_rgba', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L199-L204
      // v3.1.0

      function fourth() {eval_equal(func_parse("rgba($red: 0, $green: 255, $blue: 127, $alpha: 0)"), '"rgba(0, 255, 127, 0)"', {}, done)}
      function third() {eval_equal(func_parse("rgba(0, 255, 127, 0)"), '"rgba(0, 255, 127, 0)"', {}, fourth)}
      function second() { eval_equal(func_parse("rgba(190, 173, 237, 1)"), '"#beaded"', {}, third) }
      eval_equal(func_parse("rgba(18, 52, 86, 0.5)"), '"rgba(18, 52, 86, 0.5)"', {}, second)
    });

    it('test_rgb_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L184-L191
      // v3.1.0

      function seventh() {eval_err(func_parse('rgba(1, 1, 1, 1.2)'), "Alpha channel 1.2 must be between 0 and 1 inclusive", {}, done)};
      function sixth() {eval_err(func_parse('rgba(1, 1, 1, -0.2)'), "Alpha channel -0.2 must be between 0 and 1 inclusive", {}, seventh)};
      function fifth() {eval_err(func_parse('rgba(-1, 1, 1, 0.3)'), "Color value -1 must be between 0 and 255 inclusive", {}, sixth)};
      function fourth() {eval_err(func_parse('rgba(1, 256, 257, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, fifth)};
      function third() {eval_err(func_parse('rgba(1, 1, 256, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, fourth)};
      function second() {eval_err(func_parse('rgba(1, 256, 1, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, third)};
      eval_err(func_parse('rgba(256, 1, 1, 0.3)'), "Color value 256 must be between 0 and 255 inclusive", {}, second);
    });

    it('test_rgb_tests_types', function(done) {
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

    it('test_rgba_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L230-L234
      // v3.1.0

      function third() {eval_equal(func_parse('rgba(#102030, 0.5)'), '"rgba(16, 32, 48, 0.5)"', {}, done)}
      function second() { eval_equal(func_parse('rgba(blue, 0.5)'), '"rgba(0, 0, 255, 0.5)"', {}, third) }
      eval_equal(func_parse('rgba($color: blue, $alpha: 0.5)'), '"rgba(0, 0, 255, 0.5)"', {}, second)
    });

    it('test_rgba_with_color_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L236-L239
      // v3.1.0

      function second() { eval_err(func_parse('rgba(\\"foo\\", 0.2)'), '\"foo\" is not a color', {}, done) }
      eval_err(func_parse('rgba(blue, \\"foo\\")'), '\"foo\" is not a number', {}, second)
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

    it('test_red_exception', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L253-L255
      // v3.1.0

      eval_err(func_parse('red(12)'), "12 is not a color", {}, done);
    });

    it('test_green', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L257-L260
      // v3.1.0

      function second() { eval_equal(func_parse("green(#123456)"), '"52"', {}, done) }
      eval_equal(func_parse("green($color: #123456)"), '"52"', {}, second)
    });

    it('test_green_exception', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L262-L264
      // v3.1.0

      eval_err(func_parse('green(12)'), "12 is not a color", {}, done);
    });

    it('test_blue', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L266-L269
      // v3.1.0

      function second() { eval_equal(func_parse("blue(#123456)"), '"86"', {}, done) }
      eval_equal(func_parse("blue($color: #123456)"), '"86"', {}, second)
    });

    it('test_blue_exception', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L271-L273
      // v3.1.0

      eval_err(func_parse('blue(12)'), "12 is not a color", {}, done);
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

    it('test_saturation_exception', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L290-L292
      // v3.1.0

      eval_err(func_parse('saturation(12)'), "12 is not a color", {}, done);
    });

    it('test_lightness', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L294-L298
      // v3.1.0

      function third() { eval_equal(func_parse("lightness($color: hsl(120, 50%, 86%))"), '"86%"', {}, done) }
      function second() { eval_equal(func_parse("lightness(hsl(120, 50%, 86%))"), '"86%"', {}, third) }
      eval_equal(func_parse("lightness($color: hsl(120, 50%, 86))"), '"86%"', {}, second)
    });

    it('test_lightness_exception', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L300-L302
      // v3.1.0

      eval_err(func_parse('lightness(12)'), "12 is not a color", {}, done);
    });

    it('test_alpha', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L304-L309
      // v3.1.0

      function fourth() { eval_equal(func_parse("alpha(#123456)"), '"1"', {}, done) }
      function third() { eval_equal(func_parse("alpha(rgba(0, 1, 2, 0.34))"), '"0.34"', {}, fourth) }
      function second() { eval_equal(func_parse("alpha(hsla(0, 1, 2, 0))"), '"0"', {}, third) }
      eval_equal(func_parse("alpha($color: hsla(0, 1, 2, 0))"), '"0"', {}, second)
    });

    it('test_alpha_exception', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L311-L313
      // v3.1.0

      eval_err(func_parse('alpha(12)'), "12 is not a color", {}, done);
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

    it('test_opacify_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L333-L336
      // v3.1.0

      function second() {eval_err(func_parse('opacify(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
      eval_err(func_parse('opacify(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
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

    it('test_transparentize_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L349-L354
      // v3.1.0

      function second() {eval_err(func_parse('transparentize(rgba(0, 0, 0, 0.2), -0.001)'), "Amount -0.001 must be between 0 and 1", {}, done)}
      eval_err(func_parse('transparentize(rgba(0, 0, 0, 0.2), 1.001)'), "Amount 1.001 must be between 0 and 1", {}, second);
    });

    it('test_transparentize_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L356-L359
      // v3.1.0

      function second() {eval_err(func_parse('transparentize(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
      eval_err(func_parse('transparentize(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
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

    it('test_lighten_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L378-L381
      // v3.1.0

      function second() {eval_err(func_parse('lighten(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
      eval_err(func_parse('lighten(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
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

    it('test_darken_tests_bounds', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L393-L398
      // v3.1.0

      function second() {eval_err(func_parse('darken(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
      eval_err(func_parse('darken(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
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

    it('test_saturate_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L423-L426
      // v3.1.0

      function second() {eval_err(func_parse('saturate(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
      eval_err(func_parse('saturate(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
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
      //https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L439-L444
      // v3.1.0

      function second() {eval_err(func_parse('desaturate(#123, -0.001)'), "Amount -0.001 must be between 0% and 100%", {}, done)}
      eval_err(func_parse('desaturate(#123, 100.001)'), "Amount 100.001 must be between 0% and 100%", {}, second);
    });

    it('test_desaturate_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L446-L449
      // v3.1.0

      function second() {eval_err(func_parse('desaturate(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
      eval_err(func_parse('desaturate(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
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

    it('test_adjust_hue_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L463-L466
      // v3.1.0

      function second() {eval_err(func_parse('adjust-hue(\\"foo\\", 10%)'), "\"foo\" is not a color", {}, done)}
      eval_err(func_parse('adjust-hue(#fff, \\"foo\\")'), "\"foo\" is not a number", {}, second);
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

    it('test_scale_color_argument_errors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L647-L671
      // v3.1.0

      function h() {eval_err(func_parse('scale-color(blue, 10px)'), "10px is not a keyword argument", {}, done)}
      function g() {eval_err(func_parse('scale-color(blue, $hue: 80%)'), "Unknown argument $hue (80%)", {}, h)}
      function f() {eval_err(func_parse('scale-color(blue, $alpha: 0.5)'), "$alpha: Amount 0.5 must be a % (e.g. 0.5%)", {}, g)}
      function e() {eval_err(func_parse('scale-color(blue, $saturation: 80)'), "$saturation: Amount 80 must be a % (e.g. 80%)", {}, f)}
      function d() {eval_err(func_parse('scale-color(blue, $alpha: -101%)'), "$alpha: Amount -101% must be between -100% and 100%", {}, e)}
      function c() {eval_err(func_parse('scale-color(blue, $red: -101%)'), "$red: Amount -101% must be between -100% and 100%", {}, d)}
      function b() {eval_err(func_parse('scale-color(blue, $saturation: 101%)'), "$saturation: Amount 101% must be between -100% and 100%", {}, c)}
      eval_err(func_parse('scale-color(blue, $lightness: 10%, $red: 20%)'), "Cannot specify HSL and RGB values", {}, b);
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

    it('test_change_color_argument_errors', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L755-L759
      // v3.1.0

      function c() {eval_err(func_parse('mix(\\"foo\\", #f00, 10%)'), "\"foo\" is not a color", {}, done)}
      function b() {eval_err(func_parse('mix(#f00, \\"foo\\", 10%)'), "\"foo\" is not a color", {}, c)}
      eval_err(func_parse('mix(#f00, #baf, \\"foo\\")'), '"foo" is not a number', {}, b);
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

    it('tets_grayscale_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L777-L779
      // v3.1.0

      eval_err(func_parse('grayscale(\\"foo\\")'), "\"foo\" is not a color", {}, done);
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

    it('tets_complement_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L790-L792
      // v3.1.0

      eval_err(func_parse('complement(\\"foo\\")'), "\"foo\" is not a color", {}, done);
    });

    it('test_invert', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L794-L797
      // v3.1.0

      function b() { eval_equal(func_parse("invert(#edc)"), '"#112233"', {}, done) }
      eval_equal(func_parse("invert(rgba(10, 20, 30, 0.5))"), '"rgba(245, 235, 225, 0.5)"', {}, b)
    });

    it('test_invert_tests_types', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L799-L801
      // v3.1.0

      eval_err(func_parse('invert(\\"foo\\")'), "\"foo\" is not a color", {}, done);
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

    it('test_quote_tests_type', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L815-L817
      // v3.1.0

      eval_err(func_parse('quote(#f00)'), "#ff0000 is not a string", {}, done);
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

    it('test_keyword_args_rgba_with_extra_args', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/functions_test.rb#L982-L986
      // v3.1.0

      eval_err(func_parse("rgba($red: 255, $green: 255, $blue: 255, $alpha: 0.5, $extra: error)"), 'Function rgba doesn\'t take an argument named $extra', {}, done);
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

    it('test_color_checks_input', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L15-L18
      // v3.1.0

      eval_err(func_parse("rgb($red: 255, $green: 255)"), "Function rgb requires an argument named $blue", {}, done);
    });

    it('test_color_checks_input', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L15-L18
      // v3.1.0

      function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [256, 2, 3] )', "Red value must be between 0 and 255", {}, done)}
      eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, -1] )', "Blue value must be between 0 and 255", {}, b);
    });

    it('test_color_checks_rgba_input', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L20-L23
      // v3.1.0

      function b() {eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, 3, 1.1] )', "Alpha channel must be between 0 and 1", {}, done)}
      eval_err('Opal.Sass.$$scope.Script.$$scope.Color.$new( [1, 2, 3, -0.1] )', "Alpha channel must be between 0 and 1", {}, b);
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

    it('test_string_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L37-L41
      // v3.1.0

      function c() { eval_equal(func_parse("foo#{1 + 1}bar"), '"foo2bar"', {}, done) }
      function b() { eval_equal(func_parse("foo#{1 + 1}bar"), '"foo2bar"', {}, c)}
      eval_equal(func_parse("foo#{1 + \\\"bar#{2 + 3}baz\\\" + 4}bang"), '"foo1bar5baz4bang"', {}, b)
    });

    it('test_color_names', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L43-L47
      // v3.1.0

      function c() { eval_equal(func_parse("white"), '"white"', {}, done) }
      function b() { eval_equal(func_parse("#ffffff"), '"white"', {}, c)}
      eval_equal(func_parse("white - #000001"), '"#fffffe"', {}, b)
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

    it('test_color_names', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L43-L47
      // v3.1.0

      function e() { eval_equal(func_parse("rgba(1, 1, 2, 0.35) * rgba(50, 50, 50, 0.35)"), '"rgba(50, 50, 100, 0.35)"', {}, done) }
      function d() { eval_equal(func_parse("rgba(2, 2, 2, 0.25) + rgba(50, 50, 50, 0.25)"), '"rgba(52, 52, 52, 0.25)"', {}, e) }
      function c() {eval_err(func_parse('rgba(1, 2, 3, 0.15) + rgba(50, 50, 50, 0.75)'), "Alpha channels must be equal: rgba(1, 2, 3, 0.15) + rgba(50, 50, 50, 0.75)", {}, d)}
      function b() {eval_err(func_parse('#123456 * rgba(50, 50, 50, 0.75)'), "Alpha channels must be equal: #123456 * rgba(50, 50, 50, 0.75)", {}, c)}
      eval_err(func_parse('rgba(50, 50, 50, 0.75) / #123456'), "Alpha channels must be equal: rgba(50, 50, 50, 0.75) / #123456", {}, b);
    });

    it('test_color_names', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L77-L80
      // v3.1.0

      function b() { eval_equal(func_parse("rgba(50, 50, 50, 0.75) - 1"), '"rgba(49, 49, 49, 0.75)"', {}, done) }
      eval_equal(func_parse("rgba(50, 50, 50, 0.75) * 2"), '"rgba(100, 100, 100, 0.75)"', {}, b)
    });

    it('test_rgba_rounding', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L82-L84
      // v3.1.0

      eval_equal(func_parse("rgba(10.0, 1.23456789, 0.0, 0.1234567)"), '"rgba(10, 1, 0, 0.123)"', {}, done)
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

    it('test_compressed_comma', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L98-L101
      // v3.1.0

      eval_equal(func_parse("foo, #baf, #f00", {style: 'compressed'}), '"foo,#baf,red"', {}, done)
    });

    it('test_implicit_strings', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L104-L107
      // v3.1.0

      function h() { eval_equal('Opal.Sass.$$scope.Script.$$scope.String.$new("foo").$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("foo", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).value', 'true', {}, done) }
      eval_equal('Opal.Sass.$$scope.Script.$$scope.String.$new("foo/bar").$eq(Opal.Sass.$$scope.Script.$$scope.Parser.$parse("foo/bar", 0, 0,Opal.hash2([],{})).$perform(Opal.Sass.$$scope.Environment.$new())).value', 'true', {}, h)
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

    it('test_string_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L165-L170
      // v3.1.0

      function d() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\\\\\#{\\#{\\"ba\\" + \\"r\\"} baz} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()', '"\\\"foo #{bar baz} bang\\\""', {}, done) }
      function c() { eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\#{\\"\\#{\\"ba\\" + \\"r\\"} baz\\"} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()', '"\\\"foo bar baz bang\\\""', {}, d) }
      function b() {eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\#{\\"bar\\"}, \\#{\\"baz\\"} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()',  '"\\\"foo bar, baz bang\\\""', {}, c) }
        eval_equal('Opal.Sass.$$scope.Script.$$scope.Parser.$parse("\\"foo \\#{\\"\\\\\\#{\\" + \\"baz\\"} bang\\"", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).$to_s()', '"\\\"foo #{baz bang\\\""', {}, b)
    });

    it('test_rule_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L172-L194
      // v3.1.0

      function c() { equal("foo #{\"#{\"ba\" + \"r\"} baz\"} bang\n  a: b\n", "foo bar baz bang {\n  a: b; }\n", {syntax: 'sass'}, done) }
      function b() { equal("foo [bar=\"\\#{#{\"ba\" + \"r\"} baz}\"] bang\n  a: b\n", "foo [bar=\"#{bar baz}\"] bang {\n  a: b; }\n", {syntax: 'sass'}, c) }
      equal("foo [bar=\"#{\"\\#{\" + \"baz\"}\"] bang\n  a: b\n", "foo [bar=\"#{baz\"] bang {\n  a: b; }\n", {syntax: 'sass'}, b)
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

    it('test_dynamic_url', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L223-L228
      // v3.1.0

      function d() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('foo', 'foo-bar');Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url($foo)', 0, 0).$perform(env).$to_s()", '"url(foo-bar)"', {}, done) }
      function c() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('foo',Opal.Sass.$$scope.Script.$$scope.String.$new('foo-bar'));env.$set_var('bar',Opal.Sass.$$scope.Script.$$scope.String.$new('baz'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url($foo $bar)', 0, 0).$perform(env).$to_s()", '"url(foo-bar baz)"', {}, d)}
      function b() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('bar',Opal.Sass.$$scope.Script.$$scope.String.$new('baz'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('url(foo $bar)', 0, 0).$perform(env).$to_s()", '"url(foo baz)"', {}, c) }
        eval_equal(func_parse("url(foo    bar)"), '"url(foo bar)"', {}, b)
    });

    it('test_url_with_interpolation', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L230-L235
      // v3.1.0

      function d() { eval_equal(func_parse("\'url(http://sass-lang.com/images/\#{foo-bar})\'"), '"\\\"url(http://sass-lang.com/images/foo-bar)\\\""', {}, done) }
      function c() { eval_equal(func_parse("url('http://sass-lang.com/images/\#{foo-bar}')"), '"url(\\\"http://sass-lang.com/images/foo-bar\\\")"', {}, d)}
      eval_equal(func_parse("url('http://sass-lang.com/images/#{foo-bar}')"), '"url(\\\"http://sass-lang.com/images/foo-bar\\\")"', {}, c)
    });

    it('test_hyphenated_variables', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L237-L239
      // v3.1.0

      eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('a-b',Opal.Sass.$$scope.Script.$$scope.String.$new('a-b'));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$a-b', 0, 0).$perform(env).$to_s()", '"a-b"', {}, done)
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

    it('test_slash_divides_with_variable', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L384-L388
      // v3.1.0

      function c() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()));Opal.Sass.$$scope.Script.$$scope.Parser.$parse("$var/2px", 0, 0).$perform(env).value',0.5, {}, done) }
      function b() { eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("2px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()));Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px/$var", 0, 0).$perform(env).value', 0.5, {}, c) }
        eval_equal('env=Opal.Sass.$$scope.Environment.$new();env.$set_var(\'var\',Opal.Sass.$$scope.Script.$$scope.Parser.$parse("1px/2px", 0, 0).$perform(Opal.Sass.$$scope.Environment.$new()).value);Opal.Sass.$$scope.Script.$$scope.Parser.$parse("$var", 0, 0).$perform(env)', 0.5, {}, b)
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

  /*****************************************************************************************************
   * v3.1.3
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.1.3")) {
      it('test_nonexistent_import', function(done) {
        // https://github.com/sass/sass/blob/0b65c0d4d588c131aa1c2ad4c32d21b938239585/test/sass/engine_test.rb#L577-L584
        // v3.1.3

        err_message("@import nonexistent.sass", 'File to import not found or unreadable: nonexistent.sass.\nLoad path:', {syntax: 'sass'}, done)
      });

      it('test_global_sass_logger_instance_exists', function(done) {
        // https://github.com/sass/sass/blob/0b65c0d4d588c131aa1c2ad4c32d21b938239585/test/sass/logger_test.rb#L26-L28
        // v3.1.3

        eval_equal("Opal.Sass.logger['$respond_to?']('warn')", 'true', {}, done)
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
          sassBuilder({eval: "console.warn.callCount===2&&console.warn.calledWith('WARNING: this is a warning\\n         on line 4 of test_warn_directive_inline.sass\\n')===true&&console.warn.calledWith('WARNING: this is a mixin warning\\n         on line 2 of test_warn_directive_inline.sass, in `foo\\'\\n         from line 7 of test_warn_directive_inline.sass\\n')===true&&(console.warn.restore(),true)", options: {syntax: 'scss'}}, function(result) {
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

    /*****************************************************************************************************
    * v3.1.9
    *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "3.1.9")) {
      it('test_interpolated_comment_in_mixin', function(done) {
        // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/engine_test.rb#L2032-L2055
        // v3.1.9

          var source = "=foo($var)\n  /*! color: #{$var}\n  .foo\n    color: $var\n\n+foo(red)\n+foo(blue)\n+foo(green)\n";
          var expected = "/* color: red */\n.foo {\n  color: red; }\n\n/* color: blue */\n.foo {\n  color: blue; }\n\n/* color: green */\n.foo {\n  color: green; }\n";

          equal(source, expected, {syntax: 'sass'}, done)
      });

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

      it('test_spaceless_combo_selectors', function(done) {
        // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/scss/css_test.rb#L803-L807
        // v3.1.9

          function third() { equal("E+F { a: b;} ", "E + F {\n  a: b; }\n", {syntax: 'scss'}, done) }
          function second() { equal("E~F { a: b;} ", "E ~ F {\n  a: b; }\n", {syntax: 'scss'}, third) }
          equal("E>F { a: b;} ", "E > F {\n  a: b; }\n", {syntax: 'scss'}, second)
      });

      it('test_loud_comment_is_evaluated', function(done) {
        // https://github.com/sass/sass/blob/943dc1d5aa88899d9f23a47e283e698d58c15c77/test/sass/engine_test.rb#L1591-L1598
        // v3.1.9

        var css = "/* Hue: 327.216deg */\n";
        var sass = "/*!\n  Hue: #{hue(#f836a0)}\n";
          equal(sass, css, {syntax: 'sass'}, done)
      })

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

      it('test_loud_comment_in_silent_comment', function(done) {
        // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/engine_test.rb#L1551-L1567
        // v3.1.9

        var css = "foo{color:blue;/* foo */\n/* bar */\n/* bip */\n/* baz */}\n";
        var scss = "foo\n  color: blue\n  //! foo\n  //! bar\n  //!\n    bip\n    baz\n";
          equal(scss, css, {syntax: 'sass', style: 'compressed'}, done)
      })
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

      it('test_double_media_bubbling_with_commas', function(done) {
        // https://github.com/sass/sass/blob/fb5cb050ce2fd67f21284ce6fee2273fb761ddbc/test/sass/engine_test.rb#L2029-L2040
        // v3.1.12

        var css = "@media foo and baz, foo and bang, bar and baz, bar and bang {\n  .foo {\n    c: d; } }\n";
        var sass = "@media foo, bar\n  @media baz, bang\n    .foo\n      c: d\n";
        equal(sass, css, {syntax: 'sass'}, done)
      });
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

      it('test_debug_info_in_keyframes', function(done) {
        // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L1017-L1032
        // v3.1.12

        var css = "@-webkit-keyframes warm {\n  from {\n    color: black; }\n\n  to {\n    color: red; } }\n";
        var sass = "@-webkit-keyframes warm\n  from\n    color: black\n  to\n    color: red\n";
        equal(sass, css, {syntax: 'sass', debug_info: true}, done)
      });

      it('test_selector_compression', function(done) {
        // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L2476-L2483
        // v3.1.12

        var css = "a>b,c+d,:-moz-any(e,f,g){h:i}\n";
        var sass = "a > b, c + d, :-moz-any(e, f, g)\n  h: i\n";
        equal(sass, css, {syntax: 'sass', style: 'compressed'}, done)
      });

      it('test_multibyte_prop_name', function(done) {
        // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L2600-L2609
        // v3.1.12

        var css = "@charset \"UTF-8\";\n#bar {\n  cölor: blue; }\n";
        var sass = "#bar\n  cölor: blue\n";
        equal(sass, css, {syntax: 'sass'}, done)
      });

      it('test_multibyte_and_interpolation', function(done) {
        // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/engine_test.rb#L2611-L2622
        // v3.1.12

        var css = "#bar {\n  background: a 0%; }\n";
        var scss = "#bar {\n  // \n  background: #{a} 0%;\n}\n";
        equal(scss, css, {syntax: 'scss'}, done)
      });

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

    it('test_dynamic_url', function(done) {
      // https://github.com/sass/sass/blob/e91fec7382b457f8e661b6480b5e6a485ce04c85/test/sass/script_test.rb#L223-L228
      // v3.1.0

      function b() { eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('ie',Opal.Sass.$$scope.Script.$$scope.Bool.$new(false));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$ie and $ie <= 7', 0, 0).$perform(env).$to_s()", '"false"', {}, done) }
      eval_equal("env=Opal.Sass.$$scope.Environment.$new();env.$set_var('ie',Opal.Sass.$$scope.Script.$$scope.Bool.$new(true));Opal.Sass.$$scope.Script.$$scope.Parser.$parse('$ie or $undef', 0, 0).$perform(env).$to_s()", '"true"', {}, b)
    });

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

      function b() { debugger; eval_equal(scanner_state(0,0,2,3), 'true', {}, done) }
      eval_equal(scanner_setup() + 'a.$check_until(/f./)', '"cölorfü"', {}, b)
    })

    it('test_getch', function(done) {
      // https://github.com/sass/sass/blob/d5dab66acf6ebc1ac36d86fe90b4625397450fe6/test/sass/util/multibyte_string_scanner_test.rb#L29-L33
      // v3.1.13

      function c() { eval_equal(scanner_state(2,3,1,2), 'true', {}, done) }
      function b() { eval_equal('a.$getch()', '"ö"', {}, c) }
      eval_equal(scanner_setup() + 'a.$getch()', '"c"', {}, b)
    })
    }
  })
});
