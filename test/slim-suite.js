// tests have to be manually converted from the ruby source. ALL tests should be here, with the exception of tests for CLI options or other literally impossible things to support. If you see something missing, please PR or open an issue!

describe('slim', function() {
  this.timeout(5 * 60 * 1000)
  var slimBuilder;
  var compare;
  var slim;

  before(function() {
    slim = new Worker(__workerPath)

      slimBuilder = function(data, cb) {
        slim.onmessage = function(e) {
          cb(JSON.parse(e.data));
        };

        slim.postMessage(JSON.stringify(data));
      };

    compare = function (template, expected, done, opts) {
      opts = opts || {}
      slimBuilder({html: template, options: opts}, function(result) {
        if (result.err) {
          throw result.err
        }
        expect(result.err).to.be(undefined)
        expect(result.html).to.be(expected)
          done()
      })
    }

    compareErr = function (template, done, opts) {
      opts = opts || {}
      slimBuilder({html: template, options: opts}, function(result) {
        expect(result.err).to.not.be(undefined)
        expect(result.html).to.be(undefined)
          done()
      })
    }

  });

  it('test_simple_render', function(done) {
    // https://github.com/slim-template/slim/blob/67e190ff9f165d9158a2d249bc6da96083a4efbf/test/slim/test_engine.rb#L9-L23
    // v0.1.0
    var template = "html\n  head\n    title Simple Test Title\n  body\n    p Hello World, meet Slim.\n";
    var expected = "<html><head><title>Simple Test Title</title></head><body><p>Hello World, meet Slim.</p></body></html>"

      compare(template, expected, done);
  });

  it('test_render_with_conditional', function(done) {
    // https://github.com/slim-template/slim/blob/67e190ff9f165d9158a2d249bc6da96083a4efbf/test/slim/test_engine.rb#L25-L42
    // v0.1.0
    var template = "html\n  head\n    title Simple Test Title\n  body\n    - if false\n        p The first paragraph\n    - else\n        p The second paragraph\n";
    var expected = "<html><head><title>Simple Test Title</title></head><body><p>The second paragraph</p></body></html>"

      compare(template, expected, done);
  });

  it('test_render_with_call', function(done) {
    // https://github.com/slim-template/slim/blob/67e190ff9f165d9158a2d249bc6da96083a4efbf/test/slim/test_engine.rb#L44-L52
    // v0.1.0
    var template = "html\n  head\n    title Simple Test Title\n  body\n    p\n      = 'Hello World from @env'\n";
    var expected = "<html><head><title>Simple Test Title</title></head><body><p>Hello World from @env</p></body></html>"

      compare(template, expected, done);
  });

  it('test_render_with_call_and_inline_text', function(done) {
    // https://github.com/slim-template/slim/blob/67e190ff9f165d9158a2d249bc6da96083a4efbf/test/slim/test_engine.rb#L61-L77
    // v0.1.0
    var template = "html\n  head\n    title Simple Test Title\n  body\n    h1 This is my title\n    p\n      = 'Hello World from @env'\n";
    var expected = "<html><head><title>Simple Test Title</title></head><body><h1>This is my title</h1><p>Hello World from @env</p></body></html>"

      compare(template, expected, done);
  });

  /*****************************************************************************************************
   * v0.2.0
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.2.0")) {
    if (semver.lt(window.__libVersion, "v1.0.2")) {
      it('test_render_with_call_to_set_attribute_and_call_to_set_content', function(done) {
        // https://github.com/slim-template/slim/blob/f5addcd3397b611ad93b83a0e988b173e29cd958/test/slim/test_engine.rb#L97-L112
        // v0.2.0
        var template = "html\n  head\n    title Simple Test Title\n  body\n    h1 This is my title\n    p id=\"#{'notice'}\" = 'Hello World from @env'\n";
        var expected = "<html><head><title>Simple Test Title</title></head><body><h1>This is my title</h1><p id=\"notice\">Hello World from @env</p></body></html>"

          compare(template, expected, done);
      })

      it('test_render_with_call_to_set_attribute', function(done) {
        // https://github.com/slim-template/slim/blob/f5addcd3397b611ad93b83a0e988b173e29cd958/test/slim/test_engine.rb#L79-L95
        // v0.2.0
        var template = "html\n  head\n    title Simple Test Title\n  body\n    h1 This is my title\n    p id=\"#{'notice'}\"\n      = 'Hello World from @env'\n";
        var expected = "<html><head><title>Simple Test Title</title></head><body><h1>This is my title</h1><p id=\"notice\">Hello World from @env</p></body></html>"

          compare(template, expected, done);
      })
    }

  }

  /*****************************************************************************************************
   * v0.4.0
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.4.0") && semver.lt(window.__libVersion, "v0.7.0")) {
      it('test_render_with_text_block', function(done) {
        // https://github.com/slim-template/slim/blob/9422947/test/slim/test_engine.rb#L114-L132
        // v0.4.0
        var template = "html\n  head\n    title Simple Test Title\n  body\n    h1 This is my title\n    p id=\"#{'notice'}\"\n      `\n        Phasellus ultricies vulputate lacus, eget pretium orci tincidunt tristique. Duis vitae luctus risus. Aliquam turpis massa, adipiscing in adipiscing ut, congue sed justo. Sed egestas ullamcorper nisl placerat dictum. Sed a leo lectus, sit amet vehicula nisl. Duis adipiscing congue tortor ut vulputate. Phasellus ligula lectus, congue non lobortis sed, dictum sed tellus. Vestibulum viverra vestibulum felis convallis pharetra. Phasellus a dignissim tellus. Proin dapibus malesuada lorem, et porttitor diam bibendum a. Donec et dui mauris, et tempus metus. Etiam pharetra varius dignissim. Maecenas lacinia, ligula ut tincidunt porttitor, sapien nisi pulvinar magna, nec sollicitudin libero odio bibendum nisi. Aenean ipsum eros, convallis id consequat nec, commodo eget diam. Integer malesuada, libero non dignissim varius, velit metus malesuada lectus, a consequat turpis purus ut elit.\n";
        var expected = "<html><head><title>Simple Test Title</title></head><body><h1>This is my title</h1><p id=\"notice\"> Phasellus ultricies vulputate lacus, eget pretium orci tincidunt tristique. Duis vitae luctus risus. Aliquam turpis massa, adipiscing in adipiscing ut, congue sed justo. Sed egestas ullamcorper nisl placerat dictum. Sed a leo lectus, sit amet vehicula nisl. Duis adipiscing congue tortor ut vulputate. Phasellus ligula lectus, congue non lobortis sed, dictum sed tellus. Vestibulum viverra vestibulum felis convallis pharetra. Phasellus a dignissim tellus. Proin dapibus malesuada lorem, et porttitor diam bibendum a. Donec et dui mauris, et tempus metus. Etiam pharetra varius dignissim. Maecenas lacinia, ligula ut tincidunt porttitor, sapien nisi pulvinar magna, nec sollicitudin libero odio bibendum nisi. Aenean ipsum eros, convallis id consequat nec, commodo eget diam. Integer malesuada, libero non dignissim varius, velit metus malesuada lectus, a consequat turpis purus ut elit.</p></body></html>"

          compare(template, expected, done);
      })

      it('test_render_with_text_block_with_subsequent_markup', function(done) {
        // https://github.com/slim-template/slim/blob/9422947/test/slim/test_engine.rb#L134-L152
        // v0.4.0
        var template = "html\n  head\n    title Simple Test Title\n  body\n    h1 This is my title\n    p id=\"#{'notice'}\"\n      `\n        Phasellus ultricies vulputate lacus, eget pretium orci tincidunt tristique. Duis vitae luctus risus. Aliquam turpis massa, adipiscing in adipiscing ut, congue sed justo. Sed egestas ullamcorper nisl placerat dictum. Sed a leo lectus, sit amet vehicula nisl. Duis adipiscing congue tortor ut vulputate. Phasellus ligula lectus, congue non lobortis sed, dictum sed tellus. Vestibulum viverra vestibulum felis convallis pharetra. Phasellus a dignissim tellus. Proin dapibus malesuada lorem, et porttitor diam bibendum a. Donec et dui mauris, et tempus metus. Etiam pharetra varius dignissim. Maecenas lacinia, ligula ut tincidunt porttitor, sapien nisi pulvinar magna, nec sollicitudin libero odio bibendum nisi. Aenean ipsum eros, convallis id consequat nec, commodo eget diam. Integer malesuada, libero non dignissim varius, velit metus malesuada lectus, a consequat turpis purus ut elit.\n    p Some more markup\n";
        var expected = "<html><head><title>Simple Test Title</title></head><body><h1>This is my title</h1><p id=\"notice\"> Phasellus ultricies vulputate lacus, eget pretium orci tincidunt tristique. Duis vitae luctus risus. Aliquam turpis massa, adipiscing in adipiscing ut, congue sed justo. Sed egestas ullamcorper nisl placerat dictum. Sed a leo lectus, sit amet vehicula nisl. Duis adipiscing congue tortor ut vulputate. Phasellus ligula lectus, congue non lobortis sed, dictum sed tellus. Vestibulum viverra vestibulum felis convallis pharetra. Phasellus a dignissim tellus. Proin dapibus malesuada lorem, et porttitor diam bibendum a. Donec et dui mauris, et tempus metus. Etiam pharetra varius dignissim. Maecenas lacinia, ligula ut tincidunt porttitor, sapien nisi pulvinar magna, nec sollicitudin libero odio bibendum nisi. Aenean ipsum eros, convallis id consequat nec, commodo eget diam. Integer malesuada, libero non dignissim varius, velit metus malesuada lectus, a consequat turpis purus ut elit.</p><p>Some more markup</p></body></html>"

          compare(template, expected, done);
      })
  }

  /*****************************************************************************************************
   * v0.5.0
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.5.0")) {
    it('test_render_with_conditional_5+', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L23-L35
      // v0.5.0
      var template = "\ndiv\n  - if false\n      p The first paragraph\n  - else\n      p The second paragraph\n      ";
      var expected = "<div><p>The second paragraph</p></div>"

        compare(template, expected, done);
    })

    it('test_render_with_parameterized_conditional', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L37-L49
      // v0.5.0
      var template = "\ndiv\n  - if false\n      p The first paragraph\n  - else\n      p The second paragraph\n";
      var expected = "<div><p>The second paragraph</p></div>"

        compare(template, expected, done);
    })

    it('test_render_with_call_5+', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L51-L60
      // v0.5.0
      var template = "\np\n  = 'Hello World from @env'\n";
      var expected = "<p>Hello World from @env</p>"

        compare(template, expected, done);
    })

    it('test_render_with_conditional_call', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L62-L71
      // v0.5.0
      var template = "\np\n  = 'Hello World from @env' if true\n";
      var expected = "<p>Hello World from @env</p>"

        compare(template, expected, done);
    })

    it('test_render_with_parameterized_call', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L73-L82
      // v0.5.0
      var template = "\np\n  = 'Hello Ruby!'\n";
      var expected = "<p>Hello Ruby!</p>"

        compare(template, expected, done);
    })

    it('test_render_with_call_and_inline_text_5+', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L106-L116
      // v0.5.0
      var template = "\nh1 This is my title\np\n  = 'Hello World from @env'\n";
      var expected = "<h1>This is my title</h1><p>Hello World from @env</p>"

        compare(template, expected, done);
    })

    if (semver.lt(window.__libVersion, "v0.7.0")) {
      // handeling of leading spaces changed in 0.7.0
      it('test_render_with_text_block_5+', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L192-L202
        // v0.5.0
        var template = "\np\n  `\n   Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n";
        var expected = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>"

          compare(template, expected, done);
      })

      it('test_render_with_text_block_with_subsequent_markup_5+', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L204-L215
        // v0.5.0
        var template = "\np\n  `\n    Lorem ipsum dolor sit amet, consectetur adipiscing elit.\np Some more markup\n";
        var expected = "<p> Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p><p>Some more markup</p>"

          compare(template, expected, done);
      })

      it('test_render_with_output_code_within_block', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_blocks.rb#L14-L22
        // v0.7.0
        var template = "\np\n  = [\"Hello Ruby!\"].each do\n    = \"Hello from within a block! \"\n";
        var expected = "<p>Hello from within a block! Hello Ruby!</p>"

          compare(template, expected, done);
      })

      it('test_render_with_output_code_block', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L217-L227
        // v0.5.0
        var template = "\np\n  = ['Hello Ruby!'].each do\n    | Hello from within a block!\n";
        var expected = "<p>Hello from within a block!Hello Ruby!</p>"

          compare(template, expected, done);
      })

      it('test_render_with_parameterized_call_to_set_attributes_and_call_to_set_content', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L162-L170
        // v0.5.0
        var template = "\np id=\"#{'notice'}\" class=\"hello world\" = \"Hello Ruby!\"\n";
        var expected = '<p id="notice" class="hello world">Hello Ruby!</p>';

        compare(template, expected, done);
      })

    }

    it('test_render_with_control_code_loop', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L241-L251
      // v0.5.0
      var template = "\np\n  - 3.times do\n    | Hey!\n";
      var expected = "<p>Hey!Hey!Hey!</p>"

        compare(template, expected, done);
    })

    it('test_render_with_inline_condition', function(done) {
      // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L253-L261
      // v0.5.0
      var template = "\np = 'Hello World from @env' if true\n";
      var expected = "<p>Hello World from @env</p>"

        compare(template, expected, done);
    })


    if (semver.lt(window.__libVersion, "v0.7.1")) {
      // 0.7.1 changes the order of class and id attributes
      it('test_render_with_call_to_set_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L118-L127
        // v0.5.0
        var template = "\np id=\"#{'notice'}\" class=\"hello world\"\n  = 'Hello World from @env'\n";
        var expected = "<p id=\"notice\" class=\"hello world\">Hello World from @env</p>"

          compare(template, expected, done);
      })

      it('test_render_with_call_to_set_custom_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L129-L138
        // v0.5.0
        var template = "\np data-id=\"#{'notice'}\" data-class=\"hello world\"\n  = 'Hello World from @env'\n";
        var expected = '<p data-id="notice" data-class="hello world">Hello World from @env</p>';

        compare(template, expected, done);
      })

      it('test_render_with_shortcut_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L140-L150
        // v0.5.0
        var template = "\nh1#title This is my title\n#notice.hello.world\n  = 'Hello World from @env'\n";
        var expected = "<h1 id=\"title\">This is my title</h1><div id=\"notice\" class=\"hello world\">Hello World from @env</div>"

          compare(template, expected, done);
      })

      it('test_render_with_call_to_set_attributes_and_call_to_set_content', function(done) {
        // https://github.com/slim-template/slim/blob/d144a325303d314414816b43ac6db4c2e99aa75b/test/slim/test_engine.rb#L152-L160
        // v0.5.0
        var template = "\np id=\"#{'notice'}\" class=\"hello world\" = 'Hello World from @env'\n";
        var expected = '<p id="notice" class="hello world">Hello World from @env</p>';

        compare(template, expected, done);
      })

    }
  }

  /*****************************************************************************************************
   * v0.5.1
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.5.1")) {
    it('test_render_with_consecutive_conditionals', function(done) {
      // https://github.com/slim-template/slim/blob/740ee9dfb2c5f701cd5a1c2998cdcad9e9770376/test/slim/test_engine.rb#L37-L44
      // v0.5.1
      var template = "\ndiv\n  - if true\n      p The first paragraph\n  - if true\n      p The second paragraph\n";
      var expected = "<div><p>The first paragraph</p><p>The second paragraph</p></div>"

        compare(template, expected, done);
    })
  }

  /*****************************************************************************************************
   * v0.6.0
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.6.0")) {
    it('test_hash_call', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L286-L294
      // v0.6.0
      var template = "\np = {:a => 'The letter a', :b => 'The letter b'}[:a] \n";
      var expected = "<p>The letter a</p>"

        compare(template, expected, done);
    })

    if (semver.lt(window.__libVersion, "v0.7.0")) {
      it('test_render_with_output_code_within_block', function(done) {
        // v0.5.0
        var template = "\np\n  = ['Hello Ruby!'].each do\n    = 'Hello from within a block! '\n";
        var expected = "<p>Hello from within a block! Hello Ruby!</p>"

          compare(template, expected, done);
      })

      it('test_escaping_evil_method', function(done) {
        // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L307-L315
        // v0.6.0
        var template = "\np = \"<script>do_something_evil();</script>\"\n";
        var expected = "<p>&lt;script&gt;do_something_evil();&lt;/script&gt;</p>"

          compare(template, expected, done);
      })
    }

    it('test_simple_paragraph_with_padding', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L353-L361
      // v0.6.0
      var template = "\np    There will be 3 spaces in front of this line.\n";
      var expected = "<p>   There will be 3 spaces in front of this line.</p>"

        compare(template, expected, done);
    })

    it('test_output_code_with_leading_spaces', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L363-L373
      // v0.6.0
      var template = "\np= 'Hello World from @env'\np = 'Hello World from @env'\np    = 'Hello World from @env'\n";
      var expected = "<p>Hello World from @env</p><p>Hello World from @env</p><p>Hello World from @env</p>"

        compare(template, expected, done);
    })

    if (semver.lt(window.__libVersion, "v0.7.0")) {
      it('test_interpolation_in_text', function(done) {
        // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L375-L387
        // v0.6.0
        var template ="\np \n | #{'Hello World from @env'}\np \n | \n  A message from the compiler: #{'Hello World from @env'}\n";
        var expected = "<p>Hello World from @env</p><p>A message from the compiler: Hello World from @env</p>"

          compare(template, expected, done);
      })
    }

    it('test_interpolation_in_tag', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L389-L397
      // v0.6.0
      var template = "\np #{'Hello World from @env'}\n";
      var expected = "<p>Hello World from @env</p>"

        compare(template, expected, done);
    })

    it('test_escape_interpolation', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L399-L407
      // v0.6.0
      var template ="\np \\#{hello_world}\n";
      var expected = "<p>\#{hello_world}</p>"

        compare(template, expected, done);
    })

    it('test_number_type_interpolation', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L409-L417
      // v0.6.0
      var template = "\np = 1337\n";
      var expected = "<p>1337</p>"

        compare(template, expected, done);
    })

    it('test_dashed_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L419-L427
      // v0.6.0
      var template = "\np data-info=\"Illudium Q-36\" = 1337\n";
      var expected = '<p data-info="Illudium Q-36">1337</p>';

      compare(template, expected, done);
    })

  if (semver.lt(window.__libVersion, "v0.7.1")) {
    // slim 0.7.1 changes the order id and class attributes
    it('test_dashed_attributes_with_shortcuts', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L429-L437
      // v0.6.0
      var template = "\np#marvin.martian data-info=\"Illudium Q-36\" = 1337\n";
      var expected = '<p id="marvin" class="martian" data-info="Illudium Q-36">1337</p>';

      compare(template, expected, done);
    })
  }


  if (semver.lt(window.__libVersion, "v0.7.4")) {
    // slim 0.7.4 changed the inclusion of newlines
    it('test_nested_text', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L318-L332
      // v0.6.0
      var template = "\np\n |\n  This is line one.\n   This is line two.\n    This is line three.\n     This is line four.\np This is a new paragraph.\n";
      var expected = "<p>This is line one. This is line two.  This is line three.   This is line four.</p><p>This is a new paragraph.</p>"

        compare(template, expected, done);
    })

    it('test_nested_text_with_nested_html', function(done) {
      // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L334-L350
      // v0.6.0
      var template = "\np\n |\n  This is line one.\n   This is line two.\n    This is line three.\n     This is line four.\n span.bold This is a bold line in the paragraph.\n |  This is more content.\n";
      var expected = "<p>This is line one. This is line two.  This is line three.   This is line four.<span class=\"bold\">This is a bold line in the paragraph.</span> This is more content.</p>"

        compare(template, expected, done);
    })

  }
  }

  /*****************************************************************************************************
   * v0.6.1
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.6.1") && semver.lt(window.__libVersion, "v0.7.1")) {
    it('test_parens_around_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_engine.rb#L439-L447
      // v0.6.1
      var template = "\np(id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\") = 1337\n";
      var expected = '<p id="marvin" class="martian" data-info="Illudium Q-36">1337</p>';

      compare(template, expected, done);
    })

    it('test_parens_around_attributes_with_equal_sign_snug_to_right_paren', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_engine.rb#L449-L457
      // v0.6.1
      var template = "\np(id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\")= 1337\n";
      var expected = '<p id="marvin" class="martian" data-info="Illudium Q-36">1337</p>';

      compare(template, expected, done);
    })
  }

  /*****************************************************************************************************
   * v0.7.0
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.7.0")) {

    it('test_render_with_control_code_loop_7+', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_blocks.rb#L24-L32
      // v0.7.0
      var template = "\np\n  - 3.times do\n    | Hey!\n";
      var expected = '<p>Hey!Hey!Hey!</p>';

      compare(template, expected, done);
    })

    it('test_hash_call_in_attribute_without_quotes', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L85-L91
      // v0.7.0
      var template = "\np id={a: \"The letter a\"}[:a] Test it\n";
      var expected = '<p id="The letter a">Test it</p>';

      compare(template, expected, done);
    })

    it('test_hash_call_in_delimited_attribute', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L93-L99
      // v0.7.0
      var template = "\np(id={a: \"The letter a\"}[:a]) Test it\n";
      var expected = '<p id="The letter a">Test it</p>';

      compare(template, expected, done);
    })

    it('test_hash_call_in_attribute_with_ruby_evaluation_2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L117-L123
      // v0.7.0
      var template = "\np[id=({a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a])] Test it\n";
      var expected = '<p id="The letter aThe letter a">Test it</p>';

      compare(template, expected, done);
    })

    it('test_computation_in_attribute', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L149-L155
      // v0.7.0
      var template = "\np id=(1 + 1)*5 Test it\n";
      var expected = '<p id="10">Test it</p>';

      compare(template, expected, done);
    })

    it('test_interpolation_in_text_7', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L157-L167
      // v0.7.0
      var template = "\np\n | #{'Hello World from @env'} with \"quotes\"\np\n |\n  A message from the compiler: #{'Hello World from @env'}\n";
      var expected = '<p>Hello World from @env with "quotes"</p><p>A message from the compiler: Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_ternary_operation_in_attribute', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L186-L190
      // v0.7.0
      var template = '\np id="#{(false ? \'notshown\' : \'shown\')}" = 1337\n';
      var expected = '<p id="shown">1337</p>';

      compare(template, expected, done);
    })

    it('test_class_attribute_merging', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L193-L198
      // v0.7.0
      var template = "\n.alpha class=\"beta\" Test it\n";
      var expected = '<div class="alpha beta">Test it</div>';

      compare(template, expected, done);
    })

    it('test_render_with_spaced_parameterized_call', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L31-L38
      // v0.7.0
      var template = "\np\n  =  \"Hello Ruby!\"\n";
      var expected ='<p>Hello Ruby!</p>';

      compare(template, expected, done);
    })

    it('test_render_with_call_and_inline_text', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L49-L57
      // v0.7.0
      var template = "\nh1 This is my title\np\n  = 'Hello World from @env'\n";
      var expected = '<h1>This is my title</h1><p>Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_tag_output_without_space', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L75-L82
      // v0.7.0
      var template ="\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\np= hello_world\np=hello_world\n";
      var expected = '<p>Hello World from @env</p><p>Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_class_output_without_space', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L84-L91
      // v0.7.0
      var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n.test=hello_world\n#test==hello_world\n";
      var expected = '<div class="test">Hello World from @env</div><div id="test">Hello World from @env</div>';

      compare(template, expected, done);
    })

    it('test_attribute_output_without_space', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L93-L100
      // v0.7.0
      var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\np id=\"test\"=hello_world\np(id=\"test\")==hello_world\n";
      var expected = '<p id="test">Hello World from @env</p><p id="test">Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_render_with_backslash_end', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L102-L115
      // v0.7.0
      var template = "\np = \"Hello\" + \" Ruby!\"\n- variable = 1 +       2 +  3\n= variable +   1\n";
      var expected = '<p>Hello Ruby!</p>7';

      compare(template, expected, done);
    })

    it('test_render_with_call_7+', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L4-L11
      // v0.7.0
      var template = "\np\n  = 'Hello World from @env'\n";
      var expected = '<p>Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_render_with_spaced_parameterized_call_7+', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L31-L38
      // v0.7.0
      var template = "\np\n  =  \"Hello Ruby!\"\n";
      var expected = '<p>Hello Ruby!</p>';

      compare(template, expected, done);
    })

    it('test_render_with_spaced_parameterized_call_2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L40-L47
      // v0.7.0
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\n-def id_helper()  \"notice\"; end\n\np\n  = hello_world \"Hello Ruby!\", :dummy => \"value\"\n";
      var expected = '<p>Hello Ruby!dummy value</p>';

      compare(template, expected, done);
    })

    it('test_render_with_attribute_starts_with_keyword', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L59-L65
      // v0.7.0
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\n- def in_keyword() \"starts with keyword\"; end\np = hello_world in_keyword\n";
      var expected = '<p>starts with keyword</p>';

      compare(template, expected, done);
    })

    it('test_render_with_case', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_structure.rb#L61-L73
      // v0.7.0
      var template = "\np\n  - case 42\n  - when 41\n    | 1\n  - when 42\n    | 42\n  |  is the answer\n";
      var expected = '<p>42 is the answer</p>';

      compare(template, expected, done);
    })

    it('test_render_with_comments', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_structure.rb#L75-L84
      // v0.7.0
      var template = "\np Hello\n/ This is a comment\n  Another comment\np World\n";
      var expected = '<p>Hello</p><p>World</p>';

      compare(template, expected, done);
    })

    it('test_render_with_ruby', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_embedded_engines.rb#L36-L44
      // v0.7.0
      var template = "\nruby:\n  variable = 1 +\n  2\n= variable\n";
      var expected = '3';

      compare(template, expected, done);
    })

    it('test_html_with_escaped_interpolation', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_escaping.rb#L24-L31
      // v0.7.0
      var template = "\n- x = '\"'\n- content = '<x>'\np class=\"\#{x}\" test \#{content}\n";
      var expected = '<p class="&quot;">test &lt;x&gt;</p>';

      compare(template, expected, done);
    })

    it('test_html_namespaces', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L16-L23
      // v0.7.0
      var template = "\nhtml:body\n  html:p html:id=\"test\" Text\n";
      var expected = '<html:body><html:p html:id="test">Text</html:p></html:body>';

      compare(template, expected, done);
    })

    it('test_single_quoted_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L163-L169
      // v0.7.0
      var template ="\np class='underscored_class_name' = 1337\n";
      var expected = '<p class="underscored_class_name">1337</p>';

      compare(template, expected, done);
    })

    // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
    it.skip('test_render_with_html_safe_true', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_escaping.rb#L38-L46
      // v0.7.0
      var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n";
      var expected = "<p><strong>Hello World\n, meet \"Slim\"</strong>.</p>"
      var opts = {
        use_html_safe: true
      }

      compare(template, expected, done, opts);
    })

    // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
    it.skip('test_render_with_global_html_safe_false', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_escaping.rb#L48-L57
      // v0.7.0
      var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n";
      var expected = "<p>&lt;strong&gt;Hello World\n, meet \&quot;Slim\&quot;&lt;&#47;strong&gt;.</p>";

      compare(template, expected, done);
    })

    // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
    it.skip('test_render_with_global_html_safe_true', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_escaping.rb#L59-L68
      // v0.7.0
      var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n";
      var expected = "<p><strong>Hello World\n, meet \"Slim\"</strong>.</p>"

      compare(template, expected, done);
    })

    it('test_hash_call_in_attribute', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L53-L59
      // v0.7.0
      var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np id=\"#{hash[:a]}\" Test it\n";
      var expected = '<p id="The letter a">Test it</p>'

      compare(template, expected, done);
    })

    it('test_hash_call_in_delimited_attribute_with_ruby_evaluation', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L109-L115
      // v0.7.0
      var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=(hash[:a] + hash[:a])) Test it\n";
      var expected = '<p id="The letter aThe letter a">Test it</p>';

      compare(template, expected, done);
    })

    it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L117-L123
      // v0.7.0
      var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np[id=(hash[:a] + hash[:a])] Test it\n";
      var expected = '<p id="The letter aThe letter a">Test it</p>';

      compare(template, expected, done);
    })

    it('test_list_of', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_helpers.rb#L10-L17
      // v0.7.0
      var template = "-def list_of(enum, &block) enum.map {|i| \"<li>#{yield(i)}</li>\"}.join(\"\\n\");end\n== list_of([1, 2, 3]) do |i|\n  = i\n";
      var expected = "<li>1</li>\n<li>2</li>\n<li>3</li>";
      var opts = {
        helpers: true
      }

      compare(template, expected, done);
    })

    // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
    it.skip('test_list_of_with_html_safe', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_helpers.rb#L19-L29
      // v0.7.0
      var template = "-def list_of(enum, &block) enum.map {|i| \"<li>#{yield(i)}</li>\"}.join(\"\\n\");end\n== list_of([1, 2, 3]) do |i|\n  = i\n";
      var expected = "<li>1</li>\n<li>2</li>\n<li>3</li>";
      var opts = {
        helpers: true,
        use_html_safe: true
      }

      compare(template, expected, done);
    })

    // TODO we do not include ERB support as of now. PRs welcome!
    it.skip('test_render_with_embedded_template', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_embedded_engines.rb#L5-L16
      // v0.7.0
      var template = "\np\n  - text = 'before erb block'\n  erb:\n    <b>Hello from <%= text.upcase %>!</b>\n    Second Line!\n    <% if true %><%= true %><% end %>\n";
      var expected = "<p><b>Hello from BEFORE ERB BLOCK!</b>\nSecond Line!\ntrue\n</p>"

      compare(template, expected, done);
    })

    // TODO we do not include Markdown support as of now. PRs welcome!
    it.skip('test_render_with_interpolated_embedded_template', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_embedded_engines.rb#L18-L26
      // v0.7.0
      var template = "\nmarkdown:\n  #Header\n  Hello from #{\"Markdown!\"}\n  \"Second Line!\"\n";
      var expected = "<h1>Header</h1>\n\n<p>Hello from Markdown!\n\"Second Line!\"</p>\n"

      compare(template, expected, done);
    })

    // TODO we do not include Liquid support as of now. PRs welcome!
    it.skip('test_render_with_liquid', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_embedded_engines.rb#L45-L54
      // v0.7.0
      var template = "\np\n  - text = 'before liquid block'\n  liquid:\n    <span>{{text}}</span>\n";
      var expected = "<p><span>before liquid block</span>\n</p>"

      compare(template, expected, done);
    })

    // TODO we do not include SCSS support as of now. PRs welcome!
    it.skip('test_render_with_scss', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_embedded_engines.rb#L56-L63
      // v0.7.0
      var template = "\nscss:\n  $color: #f00;\n  body { color: $color; }\n";
      var expected = "<style type=\"text/css\">body {\n  color: red; }\n</style>"

      compare(template, expected, done);
    })

    it('test_html_will_not_be_escaped', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_escaping.rb#L4-L10
      // v0.7.0
      var template = "\np <Hello> World, meet \"Slim\".\n";
      var expected = '<p><Hello> World, meet "Slim".</p>'

      compare(template, expected, done);
    })

    it('test_correct_filename', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L4-L11
      // v0.7.0
      var template = "\n! doctype 5\n  div Invalid\n";
      var opts = {
        file: 'test.slim'
      }

      compareErr(template, done, opts);
    })

    it('test_unexpected_indentation', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L13-L20
      // v0.7.0
      var template = "\n! doctype 5\n  div Invalid\n";

      compareErr(template, done);
    })

    it('test_malformed_indentation', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L32-L40
      // v0.7.0
      var template = "\np\n  div Valid\n div Invalid\n";

      compareErr(template, done);
    })

    it('test_unknown_line_indicator', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L42-L52
      // v0.7.0
      var template = "\np\n  div Valid\n  .valid\n  #valid\n  ?invalid\n";

      compareErr(template, done);
    })

    it('test_expected_closing_delimiter', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L54-L61
      // v0.7.0
      var template = "\np\n  img(src=\"img.jpg\" title={title}\n";")"

      compareErr(template, done);
    })

    it('test_expected_closing_delimiter', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L63-L70
      // v0.7.0
      var template = "-def hash() {:a => 'The letter a', :b => 'The letter b'; end\np\n  img src=[hash[1 + hash[2\n";

      compareErr(template, done);
    })

    it('test_unexpected_closing', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L72-L79
      // v0.7.0
      var template = "\np\n  img src=(1+1)]\n";

      compareErr(template, done);
    })

    it('test_invalid_empty_attribute', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L81-L88
      // v0.7.0
      var template = "\np\n  img{src= }\n";

      compareErr(template, done);
    })

    it('test_invalid_empty_attribute2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L90-L97
      // v0.7.0
      var template = "\np\n  img{src=}\n";

      compareErr(template, done);
    })

    it('test_invalid_empty_attribute3', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L99-L106
      // v0.7.0
      var template = "\np\n  img src=\n";

      compareErr(template, done);
    })

    it('test_broken_output_line', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L4-L12
      // v0.7.0
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\np = hello_world +   hello_world +   unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_broken_output_line2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L14-L23
      // v0.7.0
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\np = hello_world +   hello_world\np Hello\n= unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_output_block', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L25-L32
      // v0.7.0
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\np = hello_world \"Hello Ruby\" do\n  = unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_output_block2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L34-L43
      // v0.7.0
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\np = hello_world \"Hello Ruby\" do\n  = \"Hello from block\"\np Hello\n= unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_text_block', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L45-L53
      // v0.7.0
      var template = "\np Text line 1\n  Text line 2\n= unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_text_block2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L55-L64
      // v0.7.0
      var template = "\n|\n  Text line 1\n  Text line 2\n= unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_comment', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L66-L74
      // v0.7.0
      var template = "\n/ Comment line 1\n  Comment line 2\n= unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_embedded_ruby', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L76-L86
      // v0.7.0
      var template = "\nruby:\n  a = 1\n  b = 2\n= a + b\n= unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_embedded_javascript', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L88-L97
      // v0.7.0
      var template = "\njavascript:\n  alert();\n  alert();\n= unknown_ruby_method\n";

      compareErr(template, done);
    })

    it('test_invalid_nested_code', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L99-L106
      // v0.7.0
      var template = "\np\n  - test = 123\n    = \"Hello from within a block! \"\n";

      compareErr(template, done);
    })

    it('test_invalid_nested_output', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_ruby_errors.rb#L108-L115
      // v0.7.0
      var template = "\np\n  = \"Hello Ruby!\"\n    = \"Hello from within a block! \"\n";

      compareErr(template, done);
    })

    if (semver.lt(window.__libVersion, "v0.7.1")) {
      // class and id order was changed in 0.7.1

      it('test_method_call_in_delimited_attribute_without_quotes2', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L77-L83
        // v0.7.0
        var template = "\nform(method='post' action=('/action-' + [:page, :save].join('-')))\n";
        var expected = '<form method="post" action="&#47;action-page-save"></form>';

        compare(template, expected, done);
      })

      it('test_square_brackets_around_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L211-L217
        // v0.7.0
        var template = "-def output_number() 1337; end\np[id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\"] = output_number\n";
        var expected = '<p id="marvin" class="martian" data-info="Illudium Q-36">1337</p>';

        compare(template, expected, done);
      })


      it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_5', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L141-L147
        // v0.7.0
        var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=hash[:a] class=[hash[:a]]) Test it\n";
        var expected = '<p id="The letter a" class="The letter a">Test it</p>';

        compare(template, expected, done);
      })


      it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_4', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L133-L139
        // v0.7.0
        var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=[hash[:a] + hash[:a]] class=[hash[:a]]) Test it\n";
        var expected = '<p id="The letter aThe letter a" class="The letter a">Test it</p>';

        compare(template, expected, done);
      })


      it('test_render_with_spaced_parameterized_call_to_set_attributes_and_call_to_set_content_2', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L45-L51
        // v0.7.0
        var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n-def id_helper()  \"notice\"; end\np id=\"#{id_helper}\" class=\"hello world\" = hello_world \"Hello Ruby!\", :dummy => \"value\"\n";
        var expected = '<p id="notice" class="hello world">Hello Ruby!dummy value</p>';

          compare(template, expected, done);
      })

      it('test_nonstandard_shortcut_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L179-L185
        // v0.7.0
        var template ="\np#dashed-id.underscored_class_name = 1337\n";
        var expected = '<p id="dashed-id" class="underscored_class_name">1337</p>';

        compare(template, expected, done);
      })

      it('test_render_with_spaced_parameterized_call_to_set_attributes_and_call_to_set_content', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L37-L43
        // v0.7.0
        var template = "\np id=\"#{'notice'}\" class=\"hello world\" = \"Hello Ruby!\"\n";
        var expected = "<p id=\"notice\" class=\"hello world\">Hello Ruby!</p>"

          compare(template, expected, done);
      })

      it('test_hash_call_in_attribute_with_ruby_evaluation_5', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L141-L147
        // v0.7.0
        var template = "\np(id={a:\"The letter a\"}[:a] class=[{a:\"The letter a\"}[:a]]) Test it\n";
        var expected = '<p id="The letter a" class="The letter a">Test it</p>';

        compare(template, expected, done);
      })

      it('test_paragraph_with_attributes_and_nested_text', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L144-L151
        // v0.7.0
        var template = "\np#test class=\"paragraph\" This is line one.\n                         This is line two.\n";
        var expected = '<p id="test" class="paragraph">This is line one.This is line two.</p>';

        compare(template, expected, done);
      })

      it('test_nonstandard_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L163-L169
        // v0.7.0
        var template = "\np id=\"dashed-id\" class=\"underscored_class_name\" = 1337\n";
        var expected = '<p id="dashed-id" class="underscored_class_name">1337</p>';

        compare(template, expected, done);
      })

      it('test_render_with_conditional_and_end', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_structure.rb#L16-L27
        // v0.7.0
        var template = "\ndiv\n  - if false\n      p The first paragraph\n  - else\n      p The second paragraph\n  - end\n";
        var expected = '<div><p>The second paragraph</p></div>';

        compare(template, expected, done);
      })

    }

    if (semver.lt(window.__libVersion, "v0.7.4")) {
      // slim 0.7.4 changed the inclusion of newlines
      it('test_html_with_newline_will_not_be_escaped', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_escaping.rb#L12-L21
        // v0.7.0
        var template = "\np\n  |\n    <Hello> World,\n     meet \"Slim\".\n";
        var expected = '<p><Hello> World, meet "Slim".</p>';

        compare(template, expected, done);
      })

      it('test_nested_text_with_nested_html_one_same_line2', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L91-L101
        // v0.7.0
        var template = "\np\n |This is line one.\n   This is line two.\n span.bold This is a bold line in the paragraph.\n |  This is more content.\n";
        var expected = '<p>This is line one. This is line two.<span class="bold">This is a bold line in the paragraph.</span> This is more content.</p>';

        compare(template, expected, done);
      })

      it('test_paragraph_with_nested_text', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L126-L133
        // v0.7.0
        var template = "\np This is line one.\n   This is line two.\n";
        var expected = '<p>This is line one. This is line two.</p>';

        compare(template, expected, done);
      })

      it('test_paragraph_with_padded_nested_text', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L135-L142
        // v0.7.0
        var template = "\np  This is line one.\n   This is line two.\n";
        var expected = '<p> This is line one. This is line two.</p>';

        compare(template, expected, done);
      })


      // slim 0.7.4 removed the backtick operator in place of the pipe operator
      it('test_render_with_text_block_with_subsequent_markup_7+', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L54-L63
        // v0.7.0
        var template = "\np\n  `\n    Lorem ipsum dolor sit amet, consectetur adipiscing elit.\np Some more markup\n";
        var expected = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p><p>Some more markup</p>';

        compare(template, expected, done);
      })

      it('test_render_with_text_block_7+', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L44-L52
        // v0.7.0
        var template = "\np\n  `\n   Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n";
        var expected = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>"

          compare(template, expected, done);
      })


    }

    if (semver.lt(window.__libVersion, "v1.0.0")) {
      // 1.0.0 removed the ! prefix for doctype declerations
      it('test_doctype', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L25-L32
        // v0.7.0
        var template = "\n! doctype 5\nhtml\n";
        var expected = '<!DOCTYPE html><html></html>';

        compare(template, expected, done);
      })
    }

    if (semver.lt(window.__libVersion, "v1.3.0")) {
      // escaping changed in 1.3.1
      it('test_render_without_html_safe', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_escaping.rb#L20-L26
        // v0.7.0
        var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n";
        var expected = "<p>&lt;strong&gt;Hello World\n, meet \&quot;Slim\&quot;&lt;&#47;strong&gt;.</p>"

          compare(template, expected, done);
      })

      it('test_escaping_evil_method', function(done) {
        // https://github.com/slim-template/slim/blob/265c64b31aa77fb7599bca4eccf22f701dda5d1a/test/slim/test_engine.rb#L307-L315
        // v0.7.0
        var template = "\np = \"<script>do_something_evil();</script>\"\n";
        var expected = "<p>&lt;script&gt;do_something_evil();&lt;&#47;script&gt;</p>"

          compare(template, expected, done);
      })

      it('test_escaping_evil_method', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_escaping.rb#L4-L10
        // v0.7.0
        var template = "\np = \"<script>do_something_evil();</script>\"\n";
        var expected = "<p>&lt;script&gt;do_something_evil();&lt;&#47;script&gt;</p>"

          compare(template, expected, done);
      })

      it('test_method_call_in_attribute_without_quotes', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L61-L67
        // v0.7.0
        var template = "\nform action=('/action-' + [:page, :save].join('-')) method='post'\n";
        var expected = '<form action="&#47;action-page-save" method="post"></form>';

        compare(template, expected, done);
      })

    }

    if (semver.lt(window.__libVersion, "v1.3.1")) {
      it('test_method_call_in_delimited_attribute_without_quotes', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L69-L75
        // v0.7.0
        var template = "\nform(action=('/action-' + [:page, :save].join('-')) method='post')\n";
        var expected = '<form action="&#47;action-page-save" method="post"></form>';

        compare(template, expected, done);
      })
    }

    if (semver.lt(window.__libVersion, "v1.3.9")) {
      // 2.0 removed the ability to use [] notation
      it('test_hash_call_in_attribute_with_ruby_evaluation', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L101-L115
        // v0.7.0
        var template = "\np id={{a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a]} Test it\n";
        var expected = '<p id="The letter aThe letter a">Test it</p>';

        compare(template, expected, done);
      })

      it('test_hash_call_in_attribute_with_ruby_evaluation_3', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L125-L131
        // v0.7.0
        var template = "\np(id=[{a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a]]) Test it\n";
        var expected = '<p id="The letter aThe letter a">Test it</p>';

        compare(template, expected, done);
      })
    }

    if (semver.lt(window.__libVersion, "v2.0.0")) {
      it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_3', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L125-L131
        // v0.7.0
        var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=[hash[:a] + hash[:a]]) Test it\n";
        var expected = '<p id="The letter aThe letter a">Test it</p>';

        compare(template, expected, done);
      })
    }

    if (semver.lt(window.__libVersion, "v2.1.0")) {
      it('test_unexpected_text_indentation', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_parser_errors.rb#L22-L30
        // v0.7.0
        var template = "\np\n  | text block\n   text\n";

        compareErr(template, done);
      })
    }

    if (semver.lt(window.__libVersion, "v3.0.4")) {
      // v 3.0.4 rewrote a few tests
      it('test_render_with_javascript', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_embedded_engines.rb#L28-L34
        // v0.7.0
        var template ="\njavascript:   \n  $(function() {});\n";
        var expected = '<script type="text/javascript">$(function() {});</script>';

        compare(template, expected, done);
      })
    }
  }

  /*****************************************************************************************************
   * v0.7.1
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.7.1")) {

    it('test_square_brackets_around_attributes_7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_html_structure.rb#L211-L217
      // v0.7.1
      var template = "-def output_number() 1337; end\np[id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\"] = output_number\n";
      var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>'

      compare(template, expected, done);
    })


    it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_5__7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_evaluation.rb#L149-L155
      // v0.7.1
      var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=hash[:a] class=[hash[:a]]) Test it\n";
      var expected = '<p class="The letter a" id="The letter a">Test it</p>';

      compare(template, expected, done);
    })


      it('test_render_with_spaced_parameterized_call_to_set_attributes_and_call_to_set_content_2__7.1+', function(done) {
        // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_evaluation.rb#L45-L51
        // v0.7.1
        var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n-def id_helper()  \"notice\"; end\np id=\"#{id_helper}\" class=\"hello world\" = hello_world \"Hello Ruby!\", :dummy => \"value\"\n";
        var expected = '<p class="hello world" id="notice">Hello Ruby!dummy value</p>';

          compare(template, expected, done);
      })

    it('test_render_with_output_code_within_block_2', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_blocks.rb#L24-L33
      // v0.7.1
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\np\n  = hello_world \"Hello Ruby!\" do\n    = hello_world \"Hello from within a block!\" do\n      = hello_world \"And another one!\"\n\n";
      var expected = '<p>Hello Ruby! Hello from within a block! And another one! Hello from within a block! Hello Ruby!</p>'

      compare(template, expected, done);
    })

    it('test_output_block_with_arguments', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_blocks.rb#L35-L46
      // v0.7.1
      var template = "-def call_macro(name, *args) @macro[name.to_s].call(*args);end\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n- def define_macro(name, &block) @macro ||= {}; @macro[name.to_s] = block; '';end\np\n  = define_macro :person do |first_name, last_name|\n    .first_name = first_name\n    .last_name = last_name\n  == call_macro :person, 'John', 'Doe'\n  == call_macro :person, 'Max', 'Mustermann'\n";
      var expected = '<p><div class="first_name">John</div><div class="last_name">Doe</div><div class="first_name">Max</div><div class="last_name">Mustermann</div></p>';

      compare(template, expected, done);
    })

    it('test_captured_code_block_with_conditional', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_blocks.rb#L35-L46
      // v0.7.1
      var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\n= hello_world \"Hello Ruby!\" do\n  - if true\n    | Hello from within a block!\n";
      var expected = 'Hello Ruby! Hello from within a block! Hello Ruby!';

      compare(template, expected, done);
    })

    it('test_instance_variable_in_attribute_without_quotes', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_evaluation.rb#L61-L67
      // v0.7.1
      var template = "\n- @var = 'instance'\np id=@var\n";
      var expected = '<p id="instance"></p>';

      compare(template, expected, done);
    })

    it('test_render_with_no_trailing_character', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_output.rb#L117-L123
      // v0.7.1
      var template = "\np\n  = \"Hello World from @env\"\n";
      var expected = '<p>Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_render_with_conditional_and_following_nonconditonal', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_structure.rb#L40-L50
      // v0.7.1
      var template = "\ndiv\n  - if true\n      p The first paragraph\n  - var = 42\n  = var\n";
      var expected = '<div><p>The first paragraph</p>42</div>';

      compare(template, expected, done);
    })

    // TODO I have no idea how to support yield syntax, nor if it makes any sense to. PRs welcome!
    it.skip('test_render_with_yield', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_structure.rb#L85-L93
      // v0.7.1
      var template = "\ndiv\n  == yield :menu\n";
      var expected = '<div>This is the menu</div>'

      compare(template, expected, done);
    })

    it('test_invalid_embedded_engine', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_ruby_errors.rb#L117-L125
      // v0.7.1
      var template = "\np\n  embed_unknown:\n    1+1\n";

      compareErr(template, done);
    })

    it('test_explicit_end', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_ruby_errors.rb#L127-L136
      // v0.7.1
      var template = "\ndiv\n  - if show_first?\n      p The first paragraph\n  - end\n";

      compareErr(template, done);
    })

    it('test_id_attribute_merging2', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_ruby_errors.rb#L138-L143
      // v0.7.1
      var template = "\n#alpha id=\"beta\" Test it\n";

      compareErr(template, done);
    })

    it('test_closed_tag', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_html_structure.rb#L227-L233
      // v0.7.1
      var template = "\nclosed/\n";
      var expected = '<closed />';

      compare(template, expected, done, {format: 'xhtml'});
    })

    it('test_closed_tag_with_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_html_structure.rb#L224-L233
      // v0.7.1
      var template = "\nclosed id=\"test\" /\n";
      var expected = '<closed id="test" />';

      compare(template, expected, done, {format: 'xhtml'});
    })

    it('test_closed_tag_with_attributes_and_parens', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_html_structure.rb#L243-L249
      // v0.7.1
      var template = "\nclosed(id=\"test\")/\n";
      var expected = '<closed id="test" />';

      compare(template, expected, done, {format: 'xhtml'});
    })

    it('test_nonstandard_shortcut_attributes_7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_html_structure.rb#L179-L185
      // v0.7.1
      var template ="\np#dashed-id.underscored_class_name = 1337\n";
      var expected = '<p class="underscored_class_name" id="dashed-id">1337</p>';

      compare(template, expected, done);
    })

    it('test_render_with_call_to_set_attributes_7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_engine.rb#L118-L127
      // v0.7.1
      var template = "\np id=\"#{'notice'}\" class=\"hello world\"\n  = 'Hello World from @env'\n";
      var expected = "<p class=\"hello world\" id=\"notice\">Hello World from @env</p>"

        compare(template, expected, done);
    })

    it('test_render_with_call_to_set_custom_attributes_7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_engine.rb#L129-L138
      // v0.7.1
      var template = "\np data-id=\"#{'notice'}\" data-class=\"hello world\"\n  = 'Hello World from @env'\n";
      var expected = '<p data-class="hello world" data-id="notice">Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_render_with_shortcut_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_engine.rb#L140-L150
      // v0.7.1
      var template = "\nh1#title This is my title\n#notice.hello.world\n  = 'Hello World from @env'\n";
      var expected = "<h1 id=\"title\">This is my title</h1><div class=\"hello world\" id=\"notice\">Hello World from @env</div>"

        compare(template, expected, done);
    })

    it('test_render_with_call_to_set_attributes_and_call_to_set_content_7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_engine.rb#L152-L160
      // v0.7.1
      var template = "\np id=\"#{'notice'}\" class=\"hello world\" = 'Hello World from @env'\n";
      var expected = '<p class="hello world" id="notice">Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_render_with_parameterized_call_to_set_attributes_and_call_to_set_content_7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_engine.rb#L162-L170
      // v0.7.1
      var template = "\np id=\"#{'notice'}\" class=\"hello world\" = \"Hello Ruby!\"\n";
      var expected = '<p class="hello world" id="notice">Hello Ruby!</p>';

      compare(template, expected, done);
    })

    it('test_dashed_attributes_with_shortcuts_7.1+', function(done) {
      // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_engine.rb#L429-L437
      // v0.7.1
      var template = '\np#marvin.martian data-info="Illudium Q-36" = 1337\n';
      var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>';

      compare(template, expected, done);
    })

    it('test_parens_around_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_engine.rb#L439-L447
      // v0.7.1
      var template = "\np(id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\") = 1337\n";
      var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>';

      compare(template, expected, done);
    })

    it('test_parens_around_attributes_with_equal_sign_snug_to_right_paren', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_engine.rb#L449-L457
      // v0.7.1
      var template = "\np(id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\")= 1337\n";
      var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>';

      compare(template, expected, done);
    })

    it('test_render_with_spaced_parameterized_call_to_set_attributes_and_call_to_set_content', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_code_evaluation.rb#L37-L43
      // v0.7.1
      var template = "\np id=\"#{'notice'}\" class=\"hello world\" = \"Hello Ruby!\"\n";
      var expected = "<p class=\"hello world\" id=\"notice\">Hello Ruby!</p>"

        compare(template, expected, done);
    })

    it('test_hash_call_in_attribute_with_ruby_evaluation_5', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_code_evaluation.rb#L141-L147
      // v0.7.1
      var template = "\np(id={a:\"The letter a\"}[:a] class=[{a:\"The letter a\"}[:a]]) Test it\n";
      var expected = '<p class="The letter a" id="The letter a">Test it</p>';

      compare(template, expected, done);
    })


    it('test_nonstandard_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_html_structure.rb#L163-L169
      // v0.7.1
      var template = "\np id=\"dashed-id\" class=\"underscored_class_name\" = 1337\n";
      var expected = '<p class="underscored_class_name" id="dashed-id">1337</p>';

      compare(template, expected, done);
    })

    if (semver.lt(window.__libVersion, "v0.7.4")) {
      // slim 0.7.4 changed the inclusion of newlines
      it('test_paragraph_with_attributes_and_nested_text_7.1+', function(done) {
        // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_html_structure.rb#L144-L151
        // v0.7.1
        var template = "\np#test class=\"paragraph\" This is line one.\n                         This is line two.\n";
        var expected = '<p class="paragraph" id="test">This is line one.This is line two.</p>';

        compare(template, expected, done);
      })
    }

    if (semver.lt(window.__libVersion, "v0.9.3")) {
      // 0.9.3 renamed id_delimiter to attr_delimiter
      it('test_id_attribute_merging', function(done) {
        // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_evaluation.rb#L208-L213
        // v0.7.1
        var template = "\n#alpha id=\"beta\" Test it\n";
        var expected = '<div id="alpha_beta">Test it</div>';

        compare(template, expected, done, {id_delimiter: '_'});
      })

      it('test_id_attribute_merging2', function(done) {
        // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_evaluation.rb#L215-L220
        // v0.7.1
        var template = "\n#alpha id=\"beta\" Test it\n";
        var expected = '<div id="alpha-beta">Test it</div>';

        compare(template, expected, done, {id_delimiter: '-'});
      })

    }

    if (semver.lt(window.__libVersion, "v1.3.1")) {
      it('test_method_call_in_delimited_attribute_without_quotes2__1.3.1+', function(done) {
        // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_evaluation.rb#L85-L91
        // v0.7.1
        var template = "-def action_path(*args)\"/action-\#{args.join('-')}\"end\nform(method='post' action=('/action-' + [:page, :save].join('-')))\n";
        var expected = '<form action="&#47;action-page-save" method="post"></form>'

        compare(template, expected, done);
      })
    }



    if (semver.lt(window.__libVersion, "v2.0.0")) {

      it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_4__7.1+', function(done) {
        // https://github.com/slim-template/slim/blob/878a6735d1ea51bd90271247a9bb8570c7e630c5/test/slim/test_code_evaluation.rb#L141-L147
        // v0.7.1
        var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=[hash[:a] + hash[:a]] class=[hash[:a]]) Test it\n";
        var expected = '<p class="The letter a" id="The letter aThe letter a">Test it</p>';

        compare(template, expected, done);
      })


      it('test_hash_call_in_attribute_with_ruby_evaluation_4', function(done) {
        // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_code_evaluation.rb#L133-L139
        // v0.7.1
        var template = "\np(id=[{a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a]] class=[{a:\"The letter a\"}[:a]]) Test it\n";
        var expected = '<p class="The letter a" id="The letter aThe letter a">Test it</p>';

        compare(template, expected, done);
      })
    }
  }

  /*****************************************************************************************************
   * v0.7.2
   *****************************************************************************************************/
  if (semver.gte(window.__libVersion, "v0.7.2")) {

    if (semver.lt(window.__libVersion, "v1.3.0")) {
      // sections completly changed in 1.3.0
      it('test_sections', function(done) {
        // https://github.com/slim-template/slim/blob/8b794256f9fb64c637ac698b1e92c6cc9905d957/test/slim/test_sections.rb#L4-L19
        // v0.7.2
        var template = "\np\n - person\n  .name = name\n";
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>';
        var opts = {
          scope: {
            person: [
            { name: 'Joe' },
            { name: 'Jack' }
            ]
          },
          sections: true
        }

        compare(template, expected, done, opts);
      })

      it('test_inverted_section', function(done) {
        // https://github.com/slim-template/slim/blob/8b794256f9fb64c637ac698b1e92c6cc9905d957/test/slim/test_sections.rb#L59-L73
        // v0.7.2
        var template = "\np\n - person\n  .name = name\n -! person\n  | No person\n - !person\n  |  No person 2\n";
        var expected = '<p>No person No person 2</p>'
        var opts = {
          scope: {},
          sections: true
        }

        compare(template, expected, done, opts);
      })

      it('test_sections_string_access', function(done) {
        // https://github.com/slim-template/slim/blob/8b794256f9fb64c637ac698b1e92c6cc9905d957/test/slim/test_sections.rb#L21-L36
        // v0.7.2
        var template = "\np\n - person\n  .name = name\n";
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>';
        var opts = {
          scope: {
            person: [
            { name: 'Joe' },
            { name: 'Jack' }
            ]
          },
          dictionary_access: 'string',
          sections: true
        }

        compare(template, expected, done, opts);
      })

      it('test_flag_section', function(done) {
        // https://github.com/slim-template/slim/blob/8b794256f9fb64c637ac698b1e92c6cc9905d957/test/slim/test_sections.rb#L38-L57
        // v0.7.2
        var template = "\np\n - show_person\n   - person\n    .name = name\n - show_person\n   | shown\n";
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div>shown</p>'
          var opts = {
            scope: {
              show_person: true,
              person: [
              { name: 'Joe' },
              { name: 'Jack' }
              ]
            },
            sections: true
          }

        compare(template, expected, done, opts);
      })

    }
  }

  /*****************************************************************************************************
   * v0.7.4
   *****************************************************************************************************/
  if (semver.gte(window.__libVersion, "v0.7.4")) {

    it('test_disabled_embedded_engine', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_embedded_engines.rb#L65-L83
      // v0.7.4

        function second() {
          compareErr("\nruby:\n  Embedded Ruby\n", done, {enable_engines: ["javascript"]});
        }

        compareErr("\nruby:\n  Embedded Ruby\n", second, {enable_engines: ["javascript"]});
    })

    it('test_output_with_content', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_sections.rb#L75-L81
      // v0.7.4

        compareErr("\nruby:\n  Embedded Ruby\n", done, {sections: true});
    })

    it('test_render_with_text_block_with_trailing_whitespace', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_structure.rb#L85-L97
      // v0.7.4
      var template = "\n' this is\n  a link to\na href=\"link\" page\n";
      var expected = "this is\na link to <a href=\"link\">page</a>"

        compare(template, expected, done);
    })

    it('test_nested_text_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_engine.rb#L76-L88
      // v0.7.4
      var template = "\np\n |\n  This is line one.\n   This is line two.\n    This is line three.\n     This is line four.\np This is a new paragraph.\n";
      var expected = "<p>This is line one.\n This is line two.\n  This is line three.\n   This is line four.</p><p>This is a new paragraph.</p>"

        compare(template, expected, done);
    })

    it('test_nested_text_with_nested_html_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_engine.rb#L114-L127
      // v0.7.4
      var template = "\np\n |\n  This is line one.\n   This is line two.\n    This is line three.\n     This is line four.\n span.bold This is a bold line in the paragraph.\n |  This is more content.\n";
      var expected = "<p>This is line one.\n This is line two.\n  This is line three.\n   This is line four.<span class=\"bold\">This is a bold line in the paragraph.</span> This is more content.</p>";

      compare(template, expected, done);
    })

    it('test_html_with_newline_will_not_be_escaped_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_escaping.rb#L12-L21
      // v0.7.4
      var template = "\np\n  |\n    <Hello> World,\n     meet \"Slim\".\n";
      var expected = '<p><Hello> World,\n meet "Slim".</p>';

      compare(template, expected, done);
    })

    it('test_nested_text_with_nested_html_one_same_line2_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_structure.rb#L102-L112
      // v0.7.4
      var template = "\np\n |This is line one.\n   This is line two.\n span.bold This is a bold line in the paragraph.\n |  This is more content.\n";
      var expected = "<p>This is line one.\n This is line two.<span class=\"bold\">This is a bold line in the paragraph.</span> This is more content.</p>";

      compare(template, expected, done);
    })

    it('test_paragraph_with_nested_text_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_structure.rb#L137-L144
      // v0.7.4
      var template = "\np This is line one.\n   This is line two.\n";
      var expected = "<p>This is line one.\n This is line two.</p>"

        compare(template, expected, done);
    })

    it('test_paragraph_with_padded_nested_text_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_structure.rb#L135-L142
      // v0.7.4
      var template = "\np  This is line one.\n   This is line two.\n";
      var expected = "<p> This is line one.\n This is line two.</p>";

      compare(template, expected, done);
    })

    it('test_paragraph_with_attributes_and_nested_text_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_structure.rb#L155-L162
      // v0.7.4
      var template = "\np#test class=\"paragraph\" This is line one.\n                         This is line two.\n";
      var expected = "<p class=\"paragraph\" id=\"test\">This is line one.\nThis is line two.</p>";

      compare(template, expected, done);
    })

    it('test_render_with_text_block_with_subsequent_markup_7.4+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_structure.rb#L55-L64
      // v0.7.4
      var template = "\np\n  |\n    Lorem ipsum dolor sit amet, consectetur adipiscing elit.\np Some more markup\n";
      var expected = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p><p>Some more markup</p>';

      compare(template, expected, done);
    })

    it('test_render_with_text_block_7+', function(done) {
      // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_html_structure.rb#L45-L53
      // v0.7.4
      var template = "\np\n  |\n   Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n";
      var expected = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>"

        compare(template, expected, done);
    })

    if (semver.lt(window.__libVersion, "v3.0.4")) {
      // script type removed in 3.0.4
      it('test_enabled_embedded_engine', function(done) {
        // https://github.com/slim-template/slim/blob/940f88c414bb14c58e37908fd017126b8a02e534/test/slim/test_embedded_engines.rb#L85-L97
        // v0.7.4
        var template = "\njavascript:\n  $(function() {});\n";
        var expected = '<script type="text/javascript">$(function() {});</script>';
        var opts = {
          disable_engines: ['ruby']
        }

        compare(template, expected, done, opts);
      })
    }


  }


  /*****************************************************************************************************
   * v0.8.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.8.0") && semver.lt(window.__libVersion, "v1.3.0")) {

      it('test_sections_8+', function(done) {
        // https://github.com/slim-template/slim/blob/32e61b81f2e1d40eb6077035d9d3422dd1104a21/test/slim/test_embedded_engines.rb#L14-L20
        // v0.8.0
        var template = "\np\n - person\n  .name = name\n";
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>'
        var opts = {
          scope: {
            person: [
              { name: 'Joe' },
              { name: 'Jack' }
            ]
          },
          sections: true
        }

          compare(template, expected, done, opts);
        })

      // TODO I am not sure how to define a dictionary for use, since it needs to be included before the string we normally put ruby code in. PRs welcome!
      it.skip('test_with_array', function(done) {
        // https://github.com/slim-template/slim/blob/32e61b81f2e1d40eb6077035d9d3422dd1104a21/test/slim/test_wrapper.rb#L22-L30
        // v0.8.0
        var template = "- require 'forwardable';class Person;extend Forwardable;attr_accessor:name;def initialize(name)@name=name;end;def location=(location)@location=location;end;def_delegators:@location,:city;end;class Location;attr_accessor:city;def initialize(city)@city=city;end;end;class ViewEnv;def person()[{:name=>'Joe'},{:name=>'Jack'}];end;def people()%w(Andy Fred Daniel).collect{|n|Person.new(n)};end;def cities()%w{Atlanta Melbourne Karlsruhe};end;def people_with_locations()array=[];people.each_with_index{|p,i|p.location=Location.new cities[i];array<<p};array;end;end\nul\n - people_with_locations\n  li = name\n  li = city\n";
        var expected = '<ul><li>Andy</li><li>Atlanta</li><li>Fred</li><li>Melbourne</li><li>Daniel</li><li>Karlsruhe</li></ul>'
        var opts = {
          sections: true,
          dictionary: 'ViewEnv.new'
        }

          compare(template, expected, done, opts);
        })
      }

  /*****************************************************************************************************
   * v0.8.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.8.1")) {

      // TODO This works, but it isn't exposed on the webworker as it was only arond for a couple of versions of Slim before being moved upstream to Temple
      it.skip('test_valid_true?', function(done) {
        // https://github.com/slim-template/slim/blob/acd250b52890b5dafa3b3629ba56919c6308ceb6/test/slim/test_validator.rb#L4-L9
        // v0.8.1
        var template = "\np Slim\n";
        var expected = true

          // compareValid doesn't exist, but it would be a way to validate this if the API was exposed
          compareValid(template, expected, done);
        })

      // TODO This works, but it isn't exposed on the webworker as it was only arond for a couple of versions of Slim before being moved upstream to Temple
      it.skip('test_valid_false?', function(done) {
        // https://github.com/slim-template/slim/blob/acd250b52890b5dafa3b3629ba56919c6308ceb6/test/slim/test_validator.rb#L11-L17
        // v0.8.1
        var template = "\n p\n  Slim\n";
        var expected = false

          // compareValid doesn't exist, but it would be a way to validate this if the API was exposed
          compareValid(template, expected, done);
        })

      // TODO This works, but it isn't exposed on the webworker as it was only arond for a couple of versions of Slim before being moved upstream to Temple
      it.skip('test_valid!', function(done) {
        // https://github.com/slim-template/slim/blob/acd250b52890b5dafa3b3629ba56919c6308ceb6/test/slim/test_validator.rb#L19-L24
        // v0.8.1
        var template = "\np Slim\n";
        var expected = false

          // compareValid doesn't exist, but it would be a way to validate this if the API was exposed
          compareValid(template, expected, done);
        })

      // TODO This works, but it isn't exposed on the webworker as it was only arond for a couple of versions of Slim before being moved upstream to Temple
      it.skip('test_invalid!', function(done) {
        // https://github.com/slim-template/slim/blob/acd250b52890b5dafa3b3629ba56919c6308ceb6/test/slim/test_validator.rb#L26-L32
        // v0.8.1
        var template = "\n p\n  Slim\n";
        var expected = true

          // compareValid doesn't exist, but it would be a way to validate this if the API was exposed
          compareValid(template, expected, done);
        })
      }


  /*****************************************************************************************************
   * v0.8.2
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.8.2")) {

      it('test_complex_interpolation', function(done) {
        // https://github.com/slim-template/slim/blob/a127a53517cf243875874c5f9b963d502c104f3a/test/slim/test_text_interpolation.rb#L33-L39
        // v0.8.2
        var template = "\np Message: #{['hello', \"user #{1337}\"].join(' ')}\n";
        var expected = '<p>Message: hello user 1337</p>'

          compare(template, expected, done);
        })
      }

  /*****************************************************************************************************
   * v0.8.3
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.8.3")) {

      it('test_render_with_html_comments', function(done) {
        // https://github.com/slim-template/slim/blob/51bf666e7304eed27f9bd20b972a1f739526553f/test/slim/test_html_structure.rb#L262-L270
        // v0.8.3
        var template = "\np Hello\n/! This is a comment\np World\n";
        var expected = "<p>Hello</p><!--This is a comment--><p>World</p>"

          compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v1.0.1")) {
        // test was removed in v1.0.1
        it('test_render_with_html_comments_2', function(done) {
          // https://github.com/slim-template/slim/blob/51bf666e7304eed27f9bd20b972a1f739526553f/test/slim/test_html_structure.rb#L272-L282
          // v0.8.3
          var template = "\np Hello\n/! This is a comment\n   Another comment\n  Last line of comment.\np World\n";
          var expected = "<p>Hello</p><!--This is a comment\n Another comment\nLast line of comment.--><p>World</p>"

            compare(template, expected, done);
        })
      }
    }

  /*****************************************************************************************************
   * v0.8.4
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.8.4")) {

      if (semver.lt(window.__libVersion, "v0.9.3")) {
        // 0.9.3 changed auto_escape with disable_escape
        it('test_render_with_auto_escape_false', function(done) {
          // https://github.com/slim-template/slim/blob/2c5ba08632330796f6c1f01b9bb703f4eb2eeddf/test/slim/test_code_escaping.rb#L45-L52
          // v0.8.4
          var template = "\n= \"<p>Hello</p>\"\n== \"<p>World</p>\"\n";
          var expected = "<p>Hello</p><p>World</p>";
          var opts = {
            auto_escape: false
          }

          compare(template, expected, done, opts);
        })
      }

      if (semver.lt(window.__libVersion, "v1.0.0")) {
        // slim 1.0.0 removed this test
        it('test_capitalized_doctype', function(done) {
          // https://github.com/slim-template/slim/blob/2c5ba08632330796f6c1f01b9bb703f4eb2eeddf/test/slim/test_html_structure.rb#L35-L42
          // v0.8.4
          var template = "\n! DOCTYPE 5\nhtml\n";
          var expected = '<!DOCTYPE html><html></html>'

            compare(template, expected, done);
        })
      }


      if (semver.lt(window.__libVersion, "v1.3.1")) {
        it('test_render_with_auto_escape_true', function(done) {
          // https://github.com/slim-template/slim/blob/2c5ba08632330796f6c1f01b9bb703f4eb2eeddf/test/slim/test_code_escaping.rb#L36-L43
          // v0.8.4
          var template = "\n= \"<p>Hello</p>\"\n== \"<p>World</p>\"\n";
          var expected = "&lt;p&gt;Hello&lt;&#47;p&gt;<p>World</p>";

          compare(template, expected, done);
        })
      }
    }

  /*****************************************************************************************************
   * v0.9.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.9.0")) {

      it('test_attributs_with_parens_and_spaces', function(done) {
        // https://github.com/slim-template/slim/blob/589d62a4973ad7d07f5ab498591b5fdfbce6ac75/test/slim/test_html_structure.rb#L255-L258
        // v0.9.0
        var template = "label{ for='filter' }= 'Hello World from @env'";
        var expected = '<label for="filter">Hello World from @env</label>'

          compare(template, expected, done);
      })

      it('test_attributs_with_parens_and_spaces2', function(done) {
        // https://github.com/slim-template/slim/blob/589d62a4973ad7d07f5ab498591b5fdfbce6ac75/test/slim/test_html_structure.rb#L260-L263
        // v0.9.0
        var template = "label{ for='filter' } = 'Hello World from @env'";
        var expected = '<label for="filter">Hello World from @env</label>';

        compare(template, expected, done);
      })

      it('test_attributs_with_multiple_spaces', function(done) {
        // https://github.com/slim-template/slim/blob/589d62a4973ad7d07f5ab498591b5fdfbce6ac75/test/slim/test_html_structure.rb#L265-L268
        // v0.9.0
        var template = "label  for='filter'  class=\"test\" = 'Hello World from @env'";
        var expected = '<label class="test" for="filter">Hello World from @env</label>';

        compare(template, expected, done);
      })

      it('test_interpolation_without_escaping', function(done) {
        // https://github.com/slim-template/slim/blob/589d62a4973ad7d07f5ab498591b5fdfbce6ac75/test/slim/test_text_interpolation.rb#L49-L52
        // v0.9.0
        var template = "\n| #{{'<script>do_something_evil();</script>'}}\n";
        var expected = '<script>do_something_evil();</script>'

          compare(template, expected, done);
      })


      if (semver.lt(window.__libVersion, "v1.3.1")) {
        // escaping changed in 1.3.1
        it('test_interpolation_with_escaping', function(done) {
          // https://github.com/slim-template/slim/blob/589d62a4973ad7d07f5ab498591b5fdfbce6ac75/test/slim/test_text_interpolation.rb#L41-L47
          // v0.9.0
          var template = "\n| #{'<script>do_something_evil();</script>'}\n";
          var expected = '&lt;script&gt;do_something_evil();&lt;&#47;script&gt;';

          compare(template, expected, done);
        })
      }
    }


  /*****************************************************************************************************
   * v0.9.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.9.1")) {

      it('test_doctype_new_syntax', function(done) {
        // https://github.com/slim-template/slim/blob/dab7e0e766811eac75af05fe0ed3c2f1593bc16b/test/slim/test_html_structure.rb#L35-L42
        // v0.9.1
        var template = "\ndoctype 5\nhtml\n";
        var expected = '<!DOCTYPE html><html></html>'
          var opts =  {format: 'xhtml'}

        compare(template, expected, done, opts);
      })

      it('test_doctype_new_syntax_html5', function(done) {
        // https://github.com/slim-template/slim/blob/dab7e0e766811eac75af05fe0ed3c2f1593bc16b/test/slim/test_html_structure.rb#L44-L48
        // v0.9.1
        var template = "\ndoctype 5\nhtml\n";
        var expected = '<!DOCTYPE html><html></html>'
          var opts =  {format: 'xhtml'}

        compare(template, expected, done, opts);
      })

      if (semver.lt(window.__libVersion, "v0.9.1")) {
        // 1.0.0 removed the ! prefix
        it('test_doctype_9.1+', function(done) {
          // https://github.com/slim-template/slim/blob/dab7e0e766811eac75af05fe0ed3c2f1593bc16b/test/slim/test_html_structure.rb#L26-L33
          // v0.9.1
          var template = "\n! doctype 1.1\nhtml\n";
          var expected = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html></html>';
          var opts =  {format: 'xhtml'}

          compare(template, expected, done, opts);
        })
      }

      if (semver.lt(window.__libVersion, "v1.3.1")) {
        it('test_interpolation_with_escaping_and_delimiter', function(done) {
          // https://github.com/slim-template/slim/blob/dab7e0e766811eac75af05fe0ed3c2f1593bc16b/test/slim/test_text_interpolation.rb#L57-L62
          // v0.9.1
          var template = "- def evil_method() \"<script>do_something_evil();</script>\";end\n| #{(evil_method)}\n";
          var expected = '&lt;script&gt;do_something_evil();&lt;&#47;script&gt;';

          compare(template, expected, done);
        })


      }
    }

  /*****************************************************************************************************
   * v0.9.2
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.9.2")) {

      it('test_interpolation_in_attribute', function(done) {
        // https://github.com/slim-template/slim/blob/cd241c87b4ff9e94810d3e15151786933ec34114/test/slim/test_text_interpolation.rb#L4-L10
        // v0.9.2
        var template = "\np id=\"a#{'notice'}b\" = 'Hello World from @env'\n";
        var expected = '<p id="anoticeb">Hello World from @env</p>';

        compare(template, expected, done);
      })

      // TODO we do not currently support embedding haml. PRs welcome!
      it.skip('test_render_with_haml', function(done) {
        // https://github.com/slim-template/slim/blob/cd241c87b4ff9e94810d3e15151786933ec34114/test/slim/test_embedded_engines.rb#L8-L20
        // v0.9.2
        var template = "\np\n  - text = 'haml'\n  haml:\n    %b Hello from #{text.upcase}!\n    Second Line!\n    - if true\n      = true\n";
        var expected = "<p><b>Hello from HAML!</b>\nSecond Line!\ntrue\n</p>";

        compare(template, expected, done);
      })

      // TODO we do not currently support embedding creole. PRs welcome!
      it.skip('test_render_with_haml', function(done) {
        // https://github.com/slim-template/slim/blob/cd241c87b4ff9e94810d3e15151786933ec34114/test/slim/test_embedded_engines.rb#L45-L52
        // v0.9.2
        var template = "\ncreole:\n  = head1\n  == head2\n";
        var expected = "<h1>head1</h1><h2>head2</h2>"

        compare(template, expected, done);
      })

      // TODO we do not currently support embedding sass. PRs welcome!
      it.skip('test_render_with_haml', function(done) {
        // https://github.com/slim-template/slim/blob/cd241c87b4ff9e94810d3e15151786933ec34114/test/slim/test_pretty.rb#L12-L44
        // v0.9.2
        var template = "\ndoctype 5\nhtml\n  head\n    title Hello World!\n    sass:\n      body\n        background-color: red\n  body\n    #container\n      p Hello!\n";
        var expected = "<!DOCTYPE html>\n<html>\n  <head>\n    <title>Hello World!</title>\n    <style type=\"text/css\">\n      body {\n        background-color: red;\n      } \n    </style>\n  </head>\n  <body>\n    <div id=\"container\">\n      <p>Hello!</p>\n    </div>\n  </body>\n</html>";

        compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v1.0.2")) {
        // test rewritten in 1.0.3
        it('test_dynamic_empty_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/cd241c87b4ff9e94810d3e15151786933ec34114/test/slim/test_html_structure.rb#L273-L279
          // v0.9.2
          var template = "\np(id=\"marvin\" class=nil data-info=\"Illudium Q-36\")= 1337\n";
          var expected = '<p data-info="Illudium Q-36" id="marvin">1337</p>';

          compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v1.0.3")) {
        it('test_empty_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/cd241c87b4ff9e94810d3e15151786933ec34114/test/slim/test_html_structure.rb#L265-271
          // v0.9.2
          var template = "\np(id=\"marvin\" class=\"\" data-info=\"Illudium Q-36\")= 1337\n";
          var expected = '<p data-info="Illudium Q-36" id="marvin">1337</p>'

            compare(template, expected, done);
        })

      }
    }

  /*****************************************************************************************************
   * v0.9.3
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.9.3")) {

      it('test_class_attribute_merging_with_nil', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L196-L201
        // v0.9.3
        var template ="\n.alpha class=\"beta\" class=nil class=\"gamma\" Test it\n";
        var expected = '<div class="alpha beta gamma">Test it</div>';

        compare(template, expected, done);
      })

      it('test_boolean_attribute_false', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L225-L231
        // v0.9.3
        var template = "\noption selected=false Text\n";
        var expected = '<option>Text</option>';

        compare(template, expected, done);
      })

      it('test_html_nested_escaping', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_html_escaping.rb#L33-L39
        // v0.9.3
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n= hello_world do\n  | escaped &\n";
        var expected = 'Hello World from @env escaped &amp; Hello World from @env';

        compare(template, expected, done);
      })

      it('test_render_with_html_conditional_and_tag', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_html_structure.rb#L342-L349
        // v0.9.3
        var template = "\n/[ if IE ]\n p Get a better browser.\n";
        var expected = "<!--[if IE]><p>Get a better browser.</p><![endif]-->";

        compare(template, expected, done);
      })

      it('test_render_with_html_conditional_and_method_output', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_html_structure.rb#L351-L358
        // v0.9.3
        var template = "\n/[ if IE ]\n = 'hello'\n";
        var expected = "<!--[if IE]>hello<![endif]-->";

        compare(template, expected, done);
      })

      it('test_render_with_disable_escape_true', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_escaping.rb#L45-L52
        // v0.9.3
        var template = "\n= \"<p>Hello</p>\"\n== \"<p>World</p>\"\n";
        var expected = "<p>Hello</p><p>World</p>";
        var opts = {
          disable_escape: true
        }

        compare(template, expected, done, opts);
      })

      // TODO we do not currently support embedding markdown. PRs welcome!
      it.skip('test_embedded_markdown', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_ruby_errors.rb#L88-L98
        // v0.9.3
        var template = "\nmarkdown:\n  #Header\n  Hello from #{\"Markdown!\"}\n  \"Second Line!\"\n= unknown_ruby_method\n";

        compareErr(template, done);
      })

      // TODO we do not currently support embedding liquid. PRs welcome!
      it.skip('test_embedded_liquid', function(done) {
        // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_ruby_errors.rb#L100-L111
        // v0.9.3
        var template = "\n- text = 'before liquid block'\nliquid:\n  First\n  {{text}}\n  Third\n= unknown_ruby_method\n";

        compareErr(template, done);
      })

      if (semver.lt(window.__libVersion, "v1.0.0")) {
        it('test_non_boolean_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L233-L239
          // v0.9.3
          var template = "\n.alpha class=\"beta\" class=false\n";
          var expected = '<div class="alpha beta false"></div>'

            compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v1.0.0")) {
        // some tests changes in 1.0.0
        it('test_boolean_attribute_true', function(done) {
          // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L217-L223
          // v0.9.3
          var template = "\noption selected=1 Text\n";
          var expected = '<option selected="selected">Text</option>';

          compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v1.3.0")) {
        // test removed in 1.3.1
        it('test_bypassing_escape_in_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L93-L99
          // v0.9.3
          var template = "\n- def action_path(*args) \"/action-\#{args.join('-')}\" end\nform action==action_path(:page, :save) method='post'\n";
          var expected = '<form action="/action-page-save" method="post"></form>'

            compare(template, expected, done);
        })
      }


      if (semver.lt(window.__libVersion, "v1.3.2")) {
        // array merging changed in 1.3.2
        it('test_array_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L241-L247
          // v0.9.3
          var template = "\n.alpha class=\"beta\" class=[:gamma, nil, :delta, [true, false]]\n";
          var expected = '<div class="alpha beta gamma delta true false"></div>';

          compare(template, expected, done);
        })

        if (semver.lt(window.__libVersion, "v2.0.0")) {
          // attr_delimiter renamed in 2.0
          it('test_id_attribute_merging_9.3+', function(done) {
            // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L203-L208
            // v0.9.3
            var template = "\n#alpha id=\"beta\" Test it\n";
            var expected = '<div id="alpha_beta">Test it</div>';

            compare(template, expected, done, {attr_delimiter: {class: ' ', id: '_'}});
          })

          it('test_id_attribute_merging2_9.3+', function(done) {
            // https://github.com/slim-template/slim/blob/9bab6c27fb4748747dabd3e75e6c7bc6f69b013b/test/slim/test_code_evaluation.rb#L210-L215
            // v0.9.3
            var template = "\n#alpha id=\"beta\" Test it\n";
            var expected = '<div id="alpha-beta">Test it</div>';

            compare(template, expected, done, {attr_delimiter: {class: ' ', id: '-'}});
          })

        }
      }
    }

  /*****************************************************************************************************
   * v0.9.4
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.9.4")) {

      // TODO `sections` tests require a class to be passed into the engine as an option, similiar to `with` in javascript. Can't really think of a way to do this using the worker itself. PRs welcome!
      it.skip('test_method', function(done) {
        // https://github.com/slim-template/slim/blob/653b1891d509dd91432f7e6f2b1d6740c4a248df/test/slim/test_wrapper.rb#L32-L37
        // v0.9.4
        var template = "\n- def output_number() 1337; end\na href=output_number Link\n";
        var expected = '<a href="1337">Link</a>'
        var opts = {sections: true}

          compare(template, expected, done, opts);
      })
    }

  /*****************************************************************************************************
   * v1.0.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.0.0")) {

      it('test_boolean_attribute_false', function(done) {
        // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_evaluation.rb#l217-l223
        // v1.0.0
        var template =  "\noption selected=false text\n";
        var expected = '<option>text</option>';

          compare(template, expected, done);
      })

      it('test_boolean_attribute_string2', function(done) {
        // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_evaluation.rb#l249-l255
        // v1.0.0
        var template = "\noption selected=\"selected\" text\n";
        var expected = '<option selected="selected">text</option>';

          compare(template, expected, done);
      })

      it('test_render_with_trailing_whitespace', function(done) {
        // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_output.rb#l13-l20
        // v1.0.0
        var template = "\np\n  =' \"hello world from @env\"\n";
        var expected = '<p>hello world from @env </p>'

          compare(template, expected, done);
      })

      it('test_no_escape_render_with_trailing_whitespace', function(done) {
        // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_output.rb#l22-l29
        // v1.0.0
        var template = "\np\n  ==' \"hello world from @env\"\n";"'"
        var expected = '<p>hello world from @env </p>'

          compare(template, expected, done);
      })

        it('test_doctype_1.0.0+', function(done) {
          // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_html_structure.rb#l26-l33
          // v1.0.0
          var template = "\ndoctype 1.1\nhtml\n";
          var expected = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html></html>'
          var opts =  {format: 'xhtml'}

          compare(template, expected, done, opts);
        })

        it('test_boolean_attribute_nil', function(done) {
          // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_evaluation.rb#l241-l247
          // v1.0.0
          var template = "\noption selected=nil text\n"
          var expected =  '<option>text</option>';

          compare(template, expected, done);
        })

      if (semver.lt(window.__libVersion, "v1.3.2")) {
        // test was removed in 1.3.2
        it('test_boolean_attribute_dynamic', function(done) {
          // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_evaluation.rb#l235-l239
          // v1.0.0
          var template = "\n- def method_which_returns_true() true; end\noption selected=method_which_returns_true text\n"
            var expected = '<option selected="selected">text</option>';

          compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v2.0.1")) {
        it('test_boolean_attribute_true_1.0.0+', function(done) {
          // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_evaluation.rb#l225-l231
          // v1.0.0
          var template = "\noption selected=true text\n";
          var expected = '<option selected="selected">text</option>';

          compare(template, expected, done);
        })

        it('test_boolean_attribute_shortcut', function(done) {
          // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_code_evaluation.rb#l257-l264
          // v1.0.0
          var template = "\noption(class=\"clazz\" selected) text\noption(selected class=\"clazz\") text\n";
          var expected = '<option class="clazz" selected="selected">text</option><option class="clazz" selected="selected">text</option>';

            compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v3.0.1")) {
        it('test_expected_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/a50f0e32f98a35c8d270267969d33beb7f295727/test/slim/test_parser_errors.rb#L72-L79
          // v1.0.0

          compareErr("\np\n  img(src='img.png' whatsthis?!)\n", done);
        })
      }

    }

  /*****************************************************************************************************
   * v1.0.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.0.1")) {

      it('test_html_tag_with_text_and_empty_line', function(done) {
        // https://github.com/slim-template/slim/blob/f5759f0692397fd4e6ab54755877a246570541ed/test/slim/test_html_structure.rb#L17-L26
        // v1.0.1
        var template = "\np Hello\np World\n";
        var expected = "<p>Hello</p><p>World</p>";

        compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v1.3.1")) {
        it('test_ruby_attribute_with_unbalanced_delimiters', function(done) {
          // https://github.com/slim-template/slim/blob/f5759f0692397fd4e6ab54755877a246570541ed/test/slim/test_code_evaluation.rb#L77-L84
          // v1.0.1
          var template = "- def action_path(*args) \"/action-\#{args.join('-')}\" end\ndiv crazy=action_path('[') id=\"crazy_delimiters\"\n";
          var expected = '<div crazy="&#47;action-[" id="crazy_delimiters"></div>';

          compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v2.0.1")) {
        it('test_render_with_javascript_including_variable', function(done) {
          // https://github.com/slim-template/slim/blob/f5759f0692397fd4e6ab54755877a246570541ed/test/slim/test_embedded_engine.rb#L74-L82
          // v1.0.1
          var template = "\n- func = \"alert('hello');\"\njavascript:   \n  $(function() { \#{func} });\n";
          var expected = "<script type=\"text/javascript\">$(function() { alert('hello'); });</script>";

          compare(template, expected, done);
        })
      }

    }

  /*****************************************************************************************************
   * v1.0.2
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.0.2")) {

      it('test_nested_interpolation_in_attribute', function(done) {
        // https://github.com/slim-template/slim/blob/03fc13b65ee705a5be6bf012cb9a5177fc8343d0/test/slim/test_text_interpolation.rb#L12-L19
        // v1.0.2
        var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\np id=\"#{\"abc#{1+1}\" + \"(\"}\" = hello_world\n";
        var expected = '<p id="abc2(">Hello World from @env</p>';

        compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v1.2.0")) {
        // test was modified for 1.2.0
        it('test_render_with_overwritten_default_tag', function(done) {
          // https://github.com/slim-template/slim/blob/03fc13b65ee705a5be6bf012cb9a5177fc8343d0/test/slim/test_html_structure.rb#L74-L81
          // v1.0.2
          var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} \#{yield} #{text}\" : text) end\n#notice.hello.world\n  = hello_world\n";
          var expected = '<section class="hello world" id="notice">Hello World from @env</section>'
            var options = {default_tag: 'section'}

          compare(template, expected, done, options);
        })
      }
    }

  /*****************************************************************************************************
   * v1.0.3
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.0.3")) {


      // TODO we do not currently support embedding wiki syntax. PRs welcome!
      it.skip('test_render_with_wiki', function(done) {
        // https://github.com/slim-template/slim/blob/781c8687819d06b3e50b9736fd37e37731cb9f4a/test/slim/test_embedded_engines.rb#L41-L48
        // v1.0.3
        var template = "\nwiki:\n  = head1\n  == head2\n"
        var expected = "<h1>head1</h1><h2>head2</h2>";

        compare(template, expcted, done);
      })

      it('test_embedded_ruby2', function(done) {
        // https://github.com/slim-template/slim/blob/781c8687819d06b3e50b9736fd37e37731cb9f4a/test/slim/test_ruby_errors.rb#L109-L117
        // v1.0.3

        compareErr("\nruby:\n  a = 1\n  unknown_ruby_method\n", done);
      })

      it('test_render_with_trailing_whitespace_after_tag', function(done) {
        // https://github.com/slim-template/slim/blob/781c8687819d06b3e50b9736fd37e37731cb9f4a/test/slim/test_code_putput.rb#L22-L28
        // v1.0.3
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; if block_given? \"#{text} #{yield} #{text}\"; else text; end end\np=' hello_world\n";
        var expected =  '<p>Hello World from @env</p> ';

        compare(template, expected, done);
      })

      it('test_no_escape_render_with_trailing_whitespace_after_tag', function(done) {
        // https://github.com/slim-template/slim/blob/781c8687819d06b3e50b9736fd37e37731cb9f4a/test/slim/test_code_putput.rb#L39-L45
        // v1.0.3
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; if block_given? \"#{text} #{yield} #{text}\"; else text; end end\np==' hello_world\n";
        var expected = '<p>Hello World from @env</p> ';

        compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v1.3.0")) {
        it('test_dynamic_empty_attribute_1.0.3+', function(done) {
          // https://github.com/slim-template/slim/blob/781c8687819d06b3e50b9736fd37e37731cb9f4a/test/slim/test_html_structure.rb#L284-L290
          // v1.0.3
          var template = "\n- def output_number() 1337; end\np(id=\"marvin\" class=nil other_empty=(\"\".to_s) data-info=\"Illudium Q-36\")= output_number\n";
          var expected = '<p data-info="Illudium Q-36" id="marvin">1337</p>'

            compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v1.3.3")) {
        it('test_static_empty_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/781c8687819d06b3e50b9736fd37e37731cb9f4a/test/slim/test_html_structure.rb#L41-L48
          // v1.0.3
          var template = "\n- def output_number() 1337; end\np(id=\"marvin\" class=\"\" data-info=\"Illudium Q-36\")= output_number\n";
          var expected = '<p class="" data-info="Illudium Q-36" id="marvin">1337</p>';

          compare(template, expected, done);
        })

      }
    }

  /*****************************************************************************************************
   * v1.0.4
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.0.4") && semver.lt(window.__libVersion, "v2.0.0")) {

      // TODO we do not currently support embedding builder. PRs welcome!
      it.skip('test_render_with_builder', function(done) {
        // https://github.com/slim-template/slim/blob/aa465daaba39d9ddfeae8283e23222732914a068/test/slim/test_embedded_engines.rb#L47-L55
        // v1.0.4
        var template = "\nbuilder:\n  xml.p(:id => 'test') {\n    xml.text!('Hello')\n  }\n";
        var expected = "<p id=\"test\">\nHello</p>\n";

        compare(template, expected, done);
      })

      it('test_render_with_javascript_with_tabs', function(done) {
        // https://github.com/slim-template/slim/blob/aa465daaba39d9ddfeae8283e23222732914a068/test/slim/test_embedded_engines.rb#L79-L83
        // v1.0.4
        var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
        var expected = "<script type=\"text/javascript\">$(function() {});\nalert('hello')</script><p>Hi</p>";

        compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v1.1.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.1.0")) {

      // TODO we do not suport encoding changes because of Opal support. PRs welcome!
      it.skip('test_binary', function(done) {
        // https://github.com/slim-template/slim/blob/e25cfd7c0190677755abfcbf44a772eb46b5c9ed/test/slim/test_encoding.rb#L4-L8
        // v1.1.0
        var template = "| \xFF\xFF"
        var expected = "\xFF\xFF"

        compare(template, expected, done);
      })

      it('test_missing_tag_in_block_expansion', function(done) {
        // https://github.com/slim-template/slim/blob/e25cfd7c0190677755abfcbf44a772eb46b5c9ed/test/slim/test_parser_errors.rb#L108-L114
        // v1.1.0

        compareErr("\nhtml: body:\n", done);
      })

      it('test_invalid_tag_in_block_expansion', function(done) {
        // https://github.com/slim-template/slim/blob/e25cfd7c0190677755abfcbf44a772eb46b5c9ed/test/slim/test_parser_errors.rb#L116-L126
        // v1.1.0

        function second() {
          compareErr("\nhtml: body:/comment\n", done);
        }

        compareErr("\nhtml: body: /comment\n", second);
      })

      // TODO we do not currently support embedding ERB. PRs welcome!
      it.skip('test_embedded_erb', function(done) {
        // https://github.com/slim-template/slim/blob/e25cfd7c0190677755abfcbf44a772eb46b5c9ed/test/slim/test_ruby_errors.rb#L97-L111
        // v1.1.0

        compareErr("\nerb:\n  <%= 123 %>\n  Hello from ERB!\n  <%#\n    comment block\n  %>\n  <% if true %>\n  Text\n  <% end %>\n= unknown_ruby_method\n", done);
      })

      it('test_block_expansion_support', function(done) {
        // https://github.com/slim-template/slim/blob/e25cfd7c0190677755abfcbf44a772eb46b5c9ed/test/slim/test_html_structure.rb#L438-L446
        // v1.1.0
        var template = "\nul\n  li.first: a href='a' foo\n  li:       a href='b' bar\n  li.last:  a href='c' baz\n";
        var expected = "<ul><li class=\"first\"><a href=\"a\">foo</a></li><li><a href=\"b\">bar</a></li><li class=\"last\"><a href=\"c\">baz</a></li></ul>";

        compare(template, expected, done);
      })

      it('test_block_expansion_class_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/e25cfd7c0190677755abfcbfL4a772eb46b5c9ed/test/slim/test_html_structure.rb#L448-L453
        // v1.1.0
        var template = "\n.a: .b: #c d\n";
        var expected = "<div class=\"a\"><div class=\"b\"><div id=\"c\">d</div></div></div>";

        compare(template, expected, done);
      })

      it('test_block_expansion_nesting', function(done) {
        // https://github.com/slim-template/slim/blob/e25cfd7c0190677755abfcbfL4a772eb46b5c9ed/test/slim/test_html_structure.rb#L455-L461
        // v1.1.0
        var template = "\nhtml: body: .content\n  | Text\n";
        var expected = "<html><body><div class=\"content\">Text</div></body></html>";

        compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v1.1.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.1.1")) {

      it('test_render_with_comma_end', function(done) {
        // https://github.com/slim-template/slim/blob/2448a2bf23c5ba02b0d70ddf988a25dc6dfed740/test/slim/test_code_output.rb#L152-L159
        // v1.1.1
        var template = "\n- def message(*args) args.join(' '); end\np = message(\"Hello\",\n            \"Ruby!\")\n";
        var expected = '<p>Hello Ruby!</p>';

        compare(template, expected, done);
      })

      it('test_eval_attributes_once', function(done) {
        // https://github.com/slim-template/slim/blob/2448a2bf23c5ba02b0d70ddf988a25dc6dfed740/test/slim/test_html_structure.rb#L463-L469
        // v1.1.1
        var template = "\n- @x = 0\n- def succ_x() @x = @x.succ; end\ninput[value=succ_x]\ninput[value=succ_x]\n";
        var expected = '<input value="1" /><input value="2" />';

        compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v1.2.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.2.0")) {

      it('test_splat_multiple_id_attribute', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_ruby_errors.rb#L204-L209
        // v1.2.0

        compareErr("\n#alpha *{:id =>\"beta\"} Test it\n", done);
      })

      it('test_ternary_operation_in_attribute_2', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_code_evaluation.rb#L197-L203
        // v1.2.0
        var template = "\n- def output_number() 1337; end\n- def message(*args) args.join(' '); end\n\np id=(false ? 'notshown' : 'shown') = output_number\n";
        var expected = '<p id="shown">1337</p>';

        compare(template, expected, done);
      })

      it('test_render_with_overwritten_default_tag_1.2+', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L73-L80
        // v1.2.0
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} \#{yield} #{text}\" : text) end\n\n#notice.hello.world\n   = hello_world\n ";
        var expected = '<section class="hello world" id="notice">Hello World from @env</section>'
          var options = {default_tag: 'section'}

        compare(template, expected, done, options);
      })

      it('test_shortcut_splat', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L481-L487
        // v1.2.0
        var template = "-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n*hash This is my title\n";
        var expected = '<div a="The letter a" b="The letter b">This is my title</div>';

        compare(template, expected, done);
      })

      it('test_splat_tag_name', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L497-L503
        // v1.2.0
        var template = "\n*{:tag => 'h1', :id => 'title'} This is my title\n";
        var expected = '<h1 id="title">This is my title</h1>';

        compare(template, expected, done);
      })

      it('test_splat_with_id_shortcut', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L523-L529
        // v1.2.0
        var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n#myid*hash This is my title\n";
        var expected = '<div a="The letter a" b="The letter b" id="myid">This is my title</div>';

        compare(template, expected, done);
      })

      it('test_splat_with_class_shortcut', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L531-L537
        // v1.2.0
        var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n.myclass*hash This is my title\n";
        var expected = '<div a="The letter a" b="The letter b" class="myclass">This is my title</div>';

        compare(template, expected, done);
      })

      it('test_splat_with_id_and_class_shortcuts', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L539-L545
        // v1.2.0
        var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n#myid.myclass*hash This is my title\n";
        var expected = '<div a="The letter a" b="The letter b" class="myclass" id="myid">This is my title</div>';

        compare(template, expected, done);
      })

      it('test_splat_with_other_attributes', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L564-L570
        // v1.2.0
        var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\nh1 data-id=\"123\" *hash This is my title\n";
        var expected = '<h1 a="The letter a" b="The letter b" data-id="123">This is my title</h1>';

        compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v1.3.0")) {
        it('test_splat_empty_tag_name', function(done) {
          // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L506-L513
          // v1.2.0
          var template = "\n*{:tag => '', :id => 'test'} This is my title\n";
          var expected = '<div id="test">This is my title</div>'

            function second() {
              compare(template, expected, done, {remove_empty_attrs: false});
            }

          compare(template, expected, second, {remove_empty_attrs: true});
        })

      }

      if (semver.lt(window.__libVersion, "v1.3.1")) {
        it('test_splat_with_boolean_attribute', function(done) {
          // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L547-L553
          // v1.2.0
          var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n\n*{:disabled => true, :empty1 => false, :empty2 => '', :empty3 => nil} This is my title\n";
          var expected = '<div disabled="disabled">This is my title</div>'

            function second() {
              compare(template, '<div disabled="disabled" empty1="" empty2="" empty3="">This is my title</div>', done, {remove_empty_attrs: false});
            }
          compare(template, expected, second);
        })
    }


      if (semver.lt(window.__libVersion, "v1.3.6")) {
        // shortcut declerations changed in 1.3.6
        it('test_render_with_custom_shortcut', function(done) {
          // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L73-L80
          // v1.2.0
          var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n#notice.hello.world@test\n = hello_world\n@abc\n = hello_world\n";
          var expected = '<div class="hello world" id="notice" role="test">Hello World from @env</div><section role="abc">Hello World from @env</section>'
            var options = {
              shortcut: {
                '#': 'id',
                '.': 'class',
                '@': 'section role'
              }
            }

          compare(template, expected, done, options);
        })

        it('test_closed_splat_tag', function(done) {
          // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L515-L521
          // v1.2.0
          var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n*hash / This is my title\n";
          var expected = '<div a="The letter a" b="The letter b"/>';

          compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v2.0.0")) {
        // test was modified in v2.0
        it('test_splat', function(done) {
          // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L489-L495
          // v1.2.0
          var template = "-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\nh1 *hash This is my title\n";
          var expected = '<h1 a="The letter a" b="The letter b">This is my title</h1>';

          compare(template, expected, done);
        })

        it('test_splat_with_class_merging', function(done) {
          // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L547-L553
          // v1.2.0
          var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n#myid.myclass *{:class => [:secondclass, %w(x y z)]} *hash This is my title";
          var expected = '<div a="The letter a" b="The letter b" class="myclass secondclass x y z" id="myid">This is my title</div>';

          compare(template, expected, done);
        })


      }
    }

  /*****************************************************************************************************
   * v1.2.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.2.1")) {

      it('test_splat_merging_with_arrays', function(done) {
        // https://github.com/slim-template/slim/blob/71e577d0c78084dfbb05d2847ca14185cd130887/test/slim/test_html_structure.rb#L564-L5703
        // v1.2.1
        var template = "\n*{:a => 1, :b => 2} *[[:c, 3], [:d, 4]] *[[:e, 5], [:f, 6]] This is my title\n"
        var expected = '<div a="1" b="2" c="3" d="4" e="5" f="6">This is my title</div>';

        compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v1.2.2
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.2.2")) {

      it('test_render_with_when_string_in_condition', function(done) {
        // https://github.com/slim-template/slim/blob/3d0ea3213c5d6583277b9a92f1ce96065407cd64/test/slim/test_code_structure.rb#L40-L50
        // v1.2.2
        var template = "\n- if true\n  | Hello\n- unless 'when' == nil\n  |  world\n";
        var expected = 'Hello world'

        compare(template, expected, done);
      })
    }


  /*****************************************************************************************************
   * v1.3.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.3.0")) {

      // TODO we don't expose this API via the webworker, but it is correct. PRs welcome to correct this and allow for the test to run
      it.skip('test_default_mime_type', function(done) {
        // https://github.com/slim-template/slim/blob/47eaea7e2bbc72d7de9a34d90817f38e49d09f87/test/slim/test_slim_template.rb#L10-L12
        // v1.3.0
        var expected = 'text/html'

        compare("figure out way to test mimetype here", expected, done, options);
      })

      // TODO we don't currently support markdown, nor are we compiled with slim/translator. PRs welcome!
      it.skip('test_no_translation_of_embedded', function(done) {
        // https://github.com/slim-template/slim/blob/47eaea7e2bbc72d7de9a34d90817f38e49d09f87/test/slim/translator/test_translator.rb#L18-L31
        // v1.3.0
        var template = "\nmarkdown:\n  #Header\n  Hello from #{\"Markdown!\"}\n  #{1+2}\n  * one\n  * two\n";
        var expected = "<h1 id=\"header\">Header</h1>\n<p>Hello from Markdown!</p>\n\n<p>3</p>\n\n<ul>\n  <li>one</li>\n  <li>two</li>\n</ul>\n"

        function second() {
          compare(template, expected, done, {tr_mode: 'dynamic'});
        }

        compare(template, expected, second, {tr_mode: 'static'});
      })

      // TODO we don't currently compile with slim/translator. PRs welcome!
      it.skip('test_no_translation_of_attrs', function(done) {
        // https://github.com/slim-template/slim/blob/47eaea7e2bbc72d7de9a34d90817f38e49d09f87/test/slim/translator/test_translator.rb#L33-L42
        // v1.3.0
        var template = "\n' this is\n  a link to\na href=\"link\" page\n";
        var expected = "THIS IS\nA LINK TO <a href=\"link\">PAGE</a>"

        function second() {
          compare(template, expected, done, {tr_mode: 'dynamic'});
        }

        compare(template, expected, second, {tr_mode: 'static'});
      })

      // TODO we don't currently compile with slim/translator. PRs welcome!
      it.skip('test_translation_and_interpolation', function(done) {
        // https://github.com/slim-template/slim/blob/47eaea7e2bbc72d7de9a34d90817f38e49d09f87/test/slim/translator/test_translator.rb#L44-L54
        // v1.3.0
        var template = "\np translate #{hello_world} this\n  second line\n  third #{1+2} line\n";

        function third() {
          compare(template, "<p>translate Hello World from @env this\nsecond line\nthird 3 line</p>", done, {tr_mode: false});
        }

        function second() {
          compare(template, "<p>TRANSLATE Hello World from @env THIS\nSECOND LINE\nTHIRD 3 LINE</p>", third, {tr_mode: 'dynamic'});
        }

        compare(template,"<p>TRANSLATE Hello World from @env THIS\nSECOND LINE\nTHIRD 3 LINE</p>", second, {tr_mode: 'static'});
      })

      // TODO we don't currently compile with slim/translator. PRs welcome!
      it.skip('test_translation_reverse', function(done) {
        // https://github.com/slim-template/slim/blob/47eaea7e2bbc72d7de9a34d90817f38e49d09f87/test/slim/translator/test_translator.rb#L56-L63
        // v1.3.0
        var template = "\n' alpha #{1} beta #{2} gamma #{3}\n";
        var expected = "3 ammag 2 ateb 1 ahpla ";

        function second() {
          compare(template, expected, done, {tr_fn: 'TestSlimTranslator.tr_reverse'});
        }

        compare(template, expected, second, {tr_fn: 'TestSlimTranslator.tr_reverse'});
      })

      it('test_escaped_interpolation', function(done) {
        // https://github.com/slim-template/slim/blob/47eaea7e2bbc72d7de9a34d90817f38e49d09f87/test/slim/logic_less/test_logic_less.rb#L84-L90
        // v1.3.0
        var template = "\np text with \\\#{123} test\n";
        var expected = '<p>text with #{123} test</p>';

        compare(template, expected, done);
      })

      it('test_windows_crlf', function(done) {
        // https://github.com/slim-template/slim/blob/47eaea7e2bbc72d7de9a34d90817f38e49d09f87/test/slim/test_encoding.rb#L4-L8
        // v1.3.0
        var template = "a href='#' something\r\nbr\r\na href='#' others\r\n";
        var expected = "<a href=\"#\">something</a><br /><a href=\"#\">others</a>";

        compare(template, expected, done);
      })

    }

  /*****************************************************************************************************
   * v1.3.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.3.1")) {

      it('test_expected_closing_quote', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_parser_errors.rb#L79-L86
        // v1.3.1

        compareErr("\np\n  img(src=\"img.jpg\n", done);
      })

      it('test_render_without_html_safe_1.3.1+', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_code_escaping.rb#L12-L18
        // v1.3.1
        var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n";
        var expected = "<p>&lt;strong&gt;Hello World\n, meet \&quot;Slim\&quot;&lt;/strong&gt;.</p>"

          compare(template, expected, done);
      })

      it('test_escaping_evil_method_1.3.1', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_code_escaping.rb#L4-L10
        // v1.3.1
        var template = "- def evil_method() \"<script>do_something_evil();</script>\";end\np = evil_method\n";
        var expected = '<p>&lt;script&gt;do_something_evil();&lt;/script&gt;</p>';

          compare(template, expected, done);
      })

      it('test_render_with_disable_escape_false', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_code_escaping.rb#L4-L10
        // v1.3.1
        var template = "\n= \"<p>Hello</p>\"\n== \"<p>World</p>\"\n";
        var expected = "&lt;p&gt;Hello&lt;/p&gt;<p>World</p>";

          compare(template, expected, done);
      })

      it('test_method_call_in_attribute_without_quotes_1.3.1+', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L61-L67
        // v1.3.1
        var template = "\nform action=('/action-' + [:page, :save].join('-')) method='post'\n";
        var expected = '<form action="/action-page-save" method="post"></form>';

        compare(template, expected, done);
      })

      it('test_method_call_in_delimited_attribute_without_quotes2_1.3.1+', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_code_evaluation.rb#L93-L99
        // v1.3.1
        var template = "\nform(method='post' action=('/action-' + [:page, :save].join('-')))\n";
        var expected = '<form action="/action-page-save" method="post"></form>';

        compare(template, expected, done);
      })

      it('test_class_attribute_merging_with_empty_static', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_code_evaluation.rb#L211-L216
        // v1.3.1
        var template = "\n.alpha class=\"beta\" class=\"\" class=\"gamma\" Test it\n";
        var expected = '<div class="alpha beta gamma">Test it</div>';

        compare(template, expected, done);
      })

      it('test_html_ruby_attr_escape', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_html_escaping.rb#L50-L56
        // v1.3.1
        var template = "\np id=('&'.to_s) class==('&amp;'.to_s)\n";
        var expected = '<p class="&amp;" id="&amp;"></p>';

        compare(template, expected, done);
      })

        it('test_dynamic_empty_attribute_1.3.1+', function(done) {
          // https://github.com/slim-template/slim/blob/781c8687819d06b3e50b9736fd37e37731cb9f4a/test/slim/test_html_structure.rb#L284-L290
          // v1.3.1
          var template = "\n- def output_number() 1337; end\np(id=\"marvin\" class=nil noempty=(\"\".to_s) data-info=\"Illudium Q-36\")= output_number\n";

          var expected = '<p data-info="Illudium Q-36" id="marvin" noempty="">1337</p>'

            compare(template, expected, done);
        })

        it('test_splat_empty_tag_name_1.3.1+', function(done) {
          // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L506-L513
          // v1.3.1
          var template = "\n*{:tag => '', :id => 'test'} This is my title\n";
          var expected = '<div id="test">This is my title</div>'

          compare(template, expected, done);
        })

        it('test_html_line_indicator', function(done) {
          // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_html_structure.rb#L589-L601
          // v1.3.1
          var template = "- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"#{text} #{yield} #{text}\" : text) end\n<html>\n  head\n    meta name=\"keywords\" content=hello_world\n  - if true\n    <p>#{hello_world}</p>\n      span = hello_world\n</html>\n    ";
          var expected = '<html><head><meta content="Hello World from @env" name="keywords" /></head><p>Hello World from @env</p><span>Hello World from @env</span></html>';

          compare(template, expected, done);
        })

        it('test_interpolation_with_escaping_1.3.1+', function(done) {
          // https://github.com/slim-template/slim/blob/589d62a4973ad7d07f5ab498591b5fdfbce6ac75/test/slim/test_text_interpolation.rb#L41-L47
          // v1.3.1
          var template = "\n| #{'<script>do_something_evil();</script>'}\n";
          var expected = '&lt;script&gt;do_something_evil();&lt;/script&gt;';

          compare(template, expected, done);
        })

        it('test_interpolation_with_escaping_and_delimiter_1.3.1+', function(done) {
          // https://github.com/slim-template/slim/blob/dab7e0e766811eac75af05fe0ed3c2f1593bc16b/test/slim/test_text_interpolation.rb#L57-L62
          // v1.3.1
          var template = "- def evil_method() \"<script>do_something_evil();</script>\";end\n| #{(evil_method)}\n";
          var expected = '&lt;script&gt;do_something_evil();&lt;/script&gt;';

          compare(template, expected, done);
        })

        it('test_ruby_attribute_with_unbalanced_delimiters_1.3.1+', function(done) {
          // https://github.com/slim-template/slim/blob/f5759f0692397fd4e6ab54755877a246570541ed/test/slim/test_code_evaluation.rb#L77-L84
          // v1.3.1
          var template = "- def action_path(*args) \"/action-\#{args.join('-')}\" end\ndiv crazy=action_path('[') id=\"crazy_delimiters\"\n";
          var expected = '<div crazy="/action-[" id="crazy_delimiters"></div>';

          compare(template, expected, done);
        })

        if (semver.lt(window.__libVersion, "v1.3.3")) {
          it('test_attribute_merging', function(done) {
            // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_html_structure.rb#L578-L587
            // v1.3.1
            var template = "\na class=true class=false\na class=false *{:class=>true}\na class=true\na class=false\n";
            var expected = '<a class="true false"></a><a class="false true"></a><a class="class"></a><a></a>';

            compare(template, expected, done);
          })
        }

        if (semver.lt(window.__libVersion, "v2.0.0")) {
          // escaping was changed in 2.0.0
          it('test_html_quoted_attr_escape', function(done) {
            // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_html_escaping.rb#L41-L48
            // v1.3.1
            var template = "\np id=\"&\" class==\"&amp;\"\n";

            function second() {
              compare(template, '<p class="&amp;" id="&amp;"></p>', done, {escape_quoted_attrs: true});
            }

            compare(template, '<p class="&amp;" id="&"></p>', second);
          })

          it('test_thread_options', function(done) {
            // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_thread_options.rb#L4-L13
            // v1.3.1
            var template = "p.test"

              function second() {
                compare(template, '<p class=\'test\'></p>', done, {attr_wrapper: "'"});
              }

            compare(template, '<p class="test"></p>', second);
          })
        }

        if (semver.lt(window.__libVersion, "v2.0.1")) {
          it('test_splat_with_boolean_attribute_1.3.1', function(done) {
            // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_html_structure.rb#L554-L560
            // v1.3.1
            var template = "\n*{:disabled => true, :empty1 => false, :nonempty => '', :empty2 => nil} This is my title\n";
            var expected =  '<div disabled="disabled" nonempty="">This is my title</div>'

              compare(template, expected, done);
          })
        }
    }


  /*****************************************************************************************************
   * v1.3.3
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.3.3")) {

      // TODO BOM manipulation was removed because of encoding issues in Opal currently, PRs welcome!
      it.skip('test_bom', function(done) {
        // https://github.com/slim-template/slim/blob/ae14457c596c963144810ced65ac9c275498bffd/test/core/test_encoding.rb#L16-L20
        // v1.3.3
        var template =  "\xEF\xBB\xBFh1 Hello World!"
          var expected = '<h1>Hello World!</h1>'

          compare(template, expected, done);
      })

      it('test_array_attribute_merging_1.3.3+', function(done) {
        // https://github.com/slim-template/slim/blob/ae14457c596c963144810ced65ac9c275498bffd/test/core/test_html_attributes.rb#L102-L109
        // v1.3.3
        var template = "\n.alpha class=\"beta\" class=[[\"\"], :gamma, nil, :delta, [true, false]]\n.alpha class=:beta,:gamma\n";
        var expected = '<div class="alpha beta gamma delta true false"></div><div class="alpha beta gamma"></div>';

        compare(template, expected, done);
      })

      it('test_attribute_merging_1.3.3+', function(done) {
        // https://github.com/slim-template/slim/blob/d9f131f4402aedd08bbcfa7c68d6cf04080618ce/test/core/test_html_structure.rb#L578-L587
        // v1.3.3
        var template = "\na class=true class=false\na class=false *{:class=>true}\na class=true\na class=false\n";
        var expected = '<a class="true false"></a><a class="false true"></a><a class="true"></a><a class="false"></a>'

          compare(template, expected, done);
      })

      it('test_static_empty_attribute_1.3.3+', function(done) {
        // https://github.com/slim-template/slim/blob/ae14457c596c963144810ced65ac9c275498bffd/test/core/test_html_attributes.rb#L219-L225
        // v1.3.3
        var template = "\n- def output_number() 1337; end\np(id=\"marvin\" name=\"\" class=\"\" data-info=\"Illudium Q-36\")= output_number\n";
        var expected = '<p data-info="Illudium Q-36" id="marvin" name="">1337</p>'

          compare(template, expected, done);
      })

      it('test_dynamic_empty_attribute', function(done) {
        // https://github.com/slim-template/slim/blob/ae14457c596c963144810ced65ac9c275498bffd/test/core/test_html_attributes.rb#L227-L233
        // v1.3.3
        var template = "\n- def output_number() 1337; end\n\np(id=\"marvin\" class=nil nonempty=(\"\".to_s) data-info=\"Illudium Q-36\")= output_number\n";
        var expected = '<p data-info="Illudium Q-36" id="marvin" nonempty="">1337</p>';

        compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v1.3.5
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.3.5")) {

      // TODO I THINK this is failing because of the specific version of tilt that we use (which is different from the one slim requires, because of Opal). It isn't a common case for the webworker side of things (or a usable case at all, really). So skipping this one. PRs welcome!
      it.skip('test_conditional_parent', function(done) {
        // https://github.com/slim-template/slim/blob/8b1f1f550d997775004857a66ca04f1e5ed74103/test/logic_less/test_logic_less.rb#L257-L266
        // v1.3.5
        var template = "\n- prev_page\n  li.previous\n    a href=prev_page Older\n- next_page\n  li.next\n    a href=next_page Newer";
        var expected = '<li class="previous"><a href="prev">Older</a></li><li class="next"><a href="next">Newer</a></li>'
        var opts = {
          scope: {
            prev_page: 'prev',
            next_page: 'next'
          }
        }

        compare(template, expected, done, opts);
      })

      // TODO `sections` tests require a class to be passed into the engine as an option, similiar to `with` in javascript. Can't really think of a way to do this using the worker itself. PRs welcome!
      it.skip('test_symbol_hash', function(done) {
        // https://github.com/slim-template/slim/blob/8b1f1f550d997775004857a66ca04f1e5ed74103/test/logic_less/test_logic_less.rb#L46-L61
        // v1.3.5
        var template = "\np\n - person\n  .name = name\n";
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>'
          var opts = {
            scope: {
              person: [
                { name: 'Joe'  },
                { name: 'Jack' }
              ]
            }
          }

        compare(template, expected, done, opts);
      })

      // TODO `sections` tests require a class to be passed into the engine as an option, similiar to `with` in javascript. Can't really think of a way to do this using the worker itself. PRs welcome!
      it.skip('test_string_access', function(done) {
        // https://github.com/slim-template/slim/blob/8b1f1f550d997775004857a66ca04f1e5ed74103/test/logic_less/test_logic_less.rb#L64-L78
        // v1.3.5
        var template = "\np\n - person\n  .name = name\n";
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>'
          var opts = {
            scope: {
              person: [
                { name: 'Joe'  },
                { name: 'Jack' }
              ]
            },
            dictionary_access: 'string'
          }

        compare(template, expected, done, opts);
      })

      // TODO `sections` tests require a class to be passed into the engine as an option, similiar to `with` in javascript. Can't really think of a way to do this using the worker itself. PRs welcome!
      it.skip('test_instance_variable_access', function(done) {
        // https://github.com/slim-template/slim/blob/8b1f1f550d997775004857a66ca04f1e5ed74103/test/logic_less/test_logic_less.rb#L64-L78
        // v1.3.5
        var template = "??"
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>'
        var opts = {
          scope: {},
          dictionary_access: 'instance_variable'
        }

        compare(template, expected, done, opts);
      })

      // TODO `sections` tests require a class to be passed into the engine as an option, similiar to `with` in javascript. Can't really think of a way to do this using the worker itself. PRs welcome!
      it.skip('test_dictionary_option', function(done) {
        // https://github.com/slim-template/slim/blob/8b1f1f550d997775004857a66ca04f1e5ed74103/test/logic_less/test_logic_less.rb#L153-L160
        // v1.3.5
        var template = "??"
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>'
        var opts = {
          scope: 'Scope.new',
          dictionary_access: '@hash'
        }

        compare(template, expected, done, opts);
      })

      // TODO I have no idea how to make this work in our tests. PRs welcome!
      it.skip('test_lambda', function(done) {
        // https://github.com/slim-template/slim/blob/8b1f1f550d997775004857a66ca04f1e5ed74103/test/logic_less/test_logic_less.rb#L16-L44
        // v1.3.5
        var template = "??"
        var expected = '<p><b><div class="name">Joe</div></b><b><div class="name">Jack</div></b><div class="simple"><div class="hello">Hello!</div></div><ul><li>First</li><li>Second</li></ul></p>';
        var hash = {
          'no idea': 'how to do this'
        }
        var opts = {
          scope: hash
        }

        compare(template, expected, done, opts);
      })
    }

  /*****************************************************************************************************
   * v1.3.6
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.3.6")) {

        it('test_render_with_custom_shortcut_1.3.6+', function(done) {
          // https://github.com/slim-template/slim/blob/7bb859de6f91e2a4e3423951739c5c68dcd45fd9/test/core/test_html_structure.rb#L82-L91
          // v1.3.6
          var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n#notice.hello.world@test\n = hello_world\n@abc\n = hello_world\n";
          var expected = '<div class="hello world" id="notice" role="test">Hello World from @env</div><section role="abc">Hello World from @env</section>'
            var options = {
              shortcut: {
                '#': {
                  attr: 'id'
                },
                '.': {
                  attr: 'class'
                },
                '@': {
                  tag: 'section',
                  attr: 'role'
                }
              }
            }

          compare(template, expected, done, options);
        })
    }

  /*****************************************************************************************************
   * v1.3.7
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.3.7")) {

      it('test_unexpected_text_after_closed', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_parser_errors.rb#L153-L159
        // v1.3.7

        compareErr("\nimg / text\n", done);
      })

      it('test_single_tab1_expansion', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_tabs.rb#L9-L39
        // v1.3.7
        var template = "\n|\n\t0\n \t1\n  \t2\n   \t3\n    \t4\n     \t5\n      \t6\n       \t7\n        \t8\n";
        var expected =  "0\n 1\n  2\n   3\n    4\n     5\n      6\n       7\n        8"

        compare(template, expected, done, {tabsize: 1});
      })

      it('test_single_tab4_expansion', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_tabs.rb#L41-L71
        // v1.3.7
        var template = "\n|\n\t0\n \t1\n  \t2\n   \t3\n    \t4\n     \t5\n      \t6\n       \t7\n        \t8\n"
        var expected = "0\n1\n2\n3\n    4\n    5\n    6\n    7\n        8"

        compare(template, expected, done, {tabsize: 4});
      })

      it('test_multi_tab1_expansion', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_tabs.rb#L73-L119
        // v1.3.7
        var template = "|\n\t0\n \t\t1\n \t \t2\n \t  \t3\n \t   \t4\n  \t\t1\n  \t \t2\n  \t  \t3\n  \t   \t4\n   \t\t1\n   \t \t2\n   \t  \t3\n   \t   \t4\n    \t\t1\n    \t \t2\n    \t  \t3\n    \t   \t4";
        var expected = "0\n  1\n   2\n    3\n     4\n   1\n    2\n     3\n      4\n    1\n     2\n      3\n       4\n     1\n      2\n       3\n        4"

        compare(template, expected, done, {tabsize: 1});
      })

      it('test_multi_tab4_expansion', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_tabs.rb#L41-L71
        // v1.3.7
        var template = "\n|\n\t0\n \t\t1\n \t \t2\n \t  \t3\n \t   \t4\n  \t\t1\n  \t \t2\n  \t  \t3\n  \t   \t4\n   \t\t1\n   \t \t2\n   \t  \t3\n   \t   \t4\n    \t\t1\n    \t \t2\n    \t  \t3\n    \t   \t4\n"
        var expected = "0\n    1\n    2\n    3\n    4\n    1\n    2\n    3\n    4\n    1\n    2\n    3\n    4\n        1\n        2\n        3\n        4"


        compare(template, expected, done, {tabsize: 4});
      })

      // TODO we do not currently support partials
      it.skip('test_partials', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_pretty.rb#L84-L103
        // v1.3.7
        var template = "{body\n  == render content}\n\n    content = %q{div\n  | content}\n\n    source = %q{html\n  == render body, :scope => self, :locals => { :content => content }";"}"
        var expected = "<html>\n  <body>\n    <div>\n      content\n    </div>\n  </body>\n</html>";

        compare(template, expected, done);
      })

      // TODO we do not currently support embedding asciidoc syntax. PRs welcome!
      it.skip('test_render_with_wiki', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_embedded_engines.rb#L17-L66
        // v1.3.7
        var template = "\nasciidoc:\n  == Header\n  Hello from #{\"AsciiDoc!\"}\n  #{1+2}\n  * one\n  * two\n";
        var expected = "\n<div class=\"sect1\">\n<h2 id=\"_header\">Header</h2>\n<div class=\"sectionbody\">\n<div class=\"paragraph\">\n<p>Hello from AsciiDoc!</p>\n</div>\n<div class=\"paragraph\">\n<p>3</p>\n</div>\n<div class=\"ulist\">\n<ul>\n<li>\n<p>one</p>\n</li>\n<li>\n<p>two</p>\n</li>\n</ul>\n</div>\n</div>\n</div>\n";

        compare(template, expcted, done);
      })

      // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
      it.skip('test_render_with_html_safe_false', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_escaping.rb#L20-L28
        // v1.3.7
        var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n";
        var expected = "<p>&lt;strong&gt;Hello World\n, meet \&quot;Slim\&quot;&lt;/strong&gt;.</p>"
        var options = {
          use_html_safe: true
        }

        compare(template, expected, done, options);
      })

      it('test_escaping_evil_method_with_pretty', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_escaping.rb#L58-L64
        // v1.3.7
        var template = "-def evil_method() \"<script>do_something_evil();</script>\";end\np = evil_method\n";
        var expected = "<p>\n  &lt;script&gt;do_something_evil();&lt;/script&gt;\n</p>"
        var options = {
          pretty: true
        }

        compare(template, expected, done, options);
      })

      it('test_render_without_html_safe_with_pretty', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_escaping.rb#L66-L72
        // v1.3.7
        var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n"
        var expected = "<p>\n  &lt;strong&gt;Hello World\n  , meet \&quot;Slim\&quot;&lt;/strong&gt;.\n</p>";
        var options = {
          pretty: true
        }

        compare(template, expected, done, options);
      })

      // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
      it.skip('test_render_with_html_safe_false_with_pretty', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_escaping.rb#L74-L82
        // v1.3.7
        var template = "-def evil_method() \"<script>do_something_evil();</script>\";end\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>."
        var expected = "<p>\n  &lt;strong&gt;Hello World\n  , meet \&quot;Slim\&quot;&lt;/strong&gt;.\n</p>";
        var options = {
          pretty: true,
          use_html_safe: true
        }

        compare(template, expected, done, options);
      })

      // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
      it.skip('test_render_with_html_safe_true_with_pretty', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_escaping.rb#L84-L92
        // v1.3.7
        var template = "-def evil_method() \"<script>do_something_evil();</script>\";end\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\".html_safe\n";
        var expected = "<p>\n  <strong>Hello World\n  , meet \"Slim\"</strong>.\n</p>"
        var options = {
          use_html_safe: true,
          pretty: true
        }

        compare(template, expected, done, options);
      })


      it('test_render_with_disable_escape_false_with_pretty', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_escaping.rb#L94-L101
        // v1.3.7
        var template = "\n= \"<p>Hello</p>\"\n== \"<p>World</p>\"\n";
        var expected = "&lt;p&gt;Hello&lt;/p&gt;<p>World</p>"
        var options = {
          pretty: true
        }

        compare(template, expected, done, options);
      })

      it('test_render_with_disable_escape_true_with_pretty', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_escaping.rb#L94-L101
        // v1.3.7
        var template = "\n= \"<p>Hello</p>\"\n== \"<p>World</p>\"\n";
        var expected = "<p>Hello</p><p>World</p>"
        var options = {
          disable_escape: true,
          pretty: true
        }

        compare(template, expected, done, options);
      })

      it('test_render_with_begin_rescue', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_structure.rb#L108-L118
        // v1.3.7
        var template = "\n- begin\n  p Begin\n- rescue\n  p Rescue\np After\n";
        var expected = '<p>Begin</p><p>After</p>'

        compare(template, expected, done);
      })

      it('test_render_with_begin_rescue_exception', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_structure.rb#L120-L132
        // v1.3.7
        var template = "\n- begin\n  p Begin\n  - raise 'Boom'\n  p After Boom\n- rescue => ex\n  p = ex.message\np After\n";
        var expected = '<p>Begin</p><p>Boom</p><p>After</p>'

        compare(template, expected, done);
      })

      it('test_render_with_begin_rescue_ensure', function(done) {
        // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_code_structure.rb#L134-L148
        // v1.3.7
        var template = "\n- begin\n  p Begin\n  - raise 'Boom'\n  p After Boom\n- rescue => ex\n  p = ex.message\n- ensure\n  p Ensure\np After\n";
        var expected = '<p>Begin</p><p>Boom</p><p>Ensure</p><p>After</p>'

        compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v2.0.0")) {
        it('test_double_escape_warning', function(done) {
          // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_html_attributes.rb#L235-L241
          // v1.3.7
          var template = "\na href='http://slim-lang.com?a=1&amp;b=2'\n";
          var expected = '<a href="http://slim-lang.com?a=1&amp;b=2"></a>';

          compare(template, expected, done);
        })

        it('test_closed_splat_tag_1.3.7+', function(done) {
          // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_attributes.rb#L160-L166
          // v1.3.7
          var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n*hash /\n";
          var expected = '<div a="The letter a" b="The letter b"/>';

          compare(template, expected, done);
        })
      }

      if (semver.lt(window.__libVersion, "v3.0.4")) {
        //script type was removed in v3.0.4
        it('test_render_with_javascript_with_explicit_html_comment', function(done) {
          // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_embedded_engines.rb#L144-L149
          // v1.3.7
          var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
            var expected = "<script type=\"text/javascript\"><!--\n$(function() {});\nalert('hello')\n//--></script><p>Hi</p>"
            var opts = {
              js_wrapper: 'comment'
            }

          compare(template, expected, done, opts);
        })

        it('test_render_with_javascript_with_explicit_cdata_comment', function(done) {
          // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_embedded_engines.rb#L151-L156
          // v1.3.7
          var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
            var expected = "<script type=\"text/javascript\">\n//<![CDATA[\n$(function() {});\nalert('hello')\n//]]>\n</script><p>Hi</p>"
            var opts = {
              js_wrapper: 'cdata'
            }

          compare(template, expected, done, opts);
        })

        it('test_render_with_javascript_with_format_xhtml_comment', function(done) {
          // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_embedded_engines.rb#L158-L163
          // v1.3.7
          var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
            var expected = "<script type=\"text/javascript\">\n//<![CDATA[\n$(function() {});\nalert('hello')\n//]]>\n</script><p>Hi</p>"
            var opts = {
              js_wrapper: 'guess',
              format: 'xhtml'
            }

          compare(template, expected, done, opts);
        })

        it('test_render_with_javascript_with_format_html_comment', function(done) {
          // https://github.com/slim-template/slim/blob/68ee9ba09dbc1e3090a394ff1eee51d29d64e05b/test/core/test_embedded_engines.rb#L165-L170
          // v1.3.7
          var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
            var expected = "<script type=\"text/javascript\"><!--\n$(function() {});\nalert('hello')\n//--></script><p>Hi</p>"
            var opts = {
              js_wrapper: 'guess',
              format: 'html'
            }

          compare(template, expected, done, opts);
        })
      }


    }

  /*****************************************************************************************************
   * v1.3.8
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v1.3.8")) {

      it('test_id_attribute_merging4', function(done) {
        // https://github.com/slim-template/slim/blob/845a899ffd785d63180adb85491bc178a7e057a2/test/core/test_html_attributes.rb#L62-L68
        // v1.3.8
        var template = "\n#alpha id=\"beta\" Test it\n";
        var expected = '<div id="alpha-beta">Test it</div>';
          var options = {
            merge_attrs: {
              class: ' ',
              id: '-'
            }
          }

        compare(template, expected, done, options);
      })


      if (semver.lt(window.__libVersion, "v2.0.0")) {
        it('test_id_attribute_merging3', function(done) {
          // https://github.com/slim-template/slim/blob/845a899ffd785d63180adb85491bc178a7e057a2/test/core/test_html_attributes.rb#L55-L60
          // v1.3.8
          var template = "\n#alpha id=\"beta\" Test it\n";
          var expected = '<div id="alpha_beta">Test it</div>'
            var options = {
              merge_attrs: {
                class: ' ',
                id: '_'
              }
            }

          compare(template, expected, done, options);
        })
      }
    }

  /*****************************************************************************************************
   * v2.0.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v2.0.0")) {

      it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_3__2.0+', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_evaluation.rb#L141-L147
        // v2.0.0
        var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=(hash[:a] + hash[:a]) class=hash[:a]) Test it\n";
        var expected = '<p class="The letter a" id="The letter aThe letter a">Test it</p>';

        compare(template, expected, done);
      })

      it('test_hash_call_in_delimited_attribute_with_ruby_evaluation_4__2.0+', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_evaluation.rb#L149-L155
        // v2.0.0
        var template = "-  def hash(){:a => 'The letter a', :b => 'The letter b'};end\np(id=hash[:a] class=hash[:a]) Test it\n"
        var expected = '<p class="The letter a" id="The letter a">Test it</p>';

        compare(template, expected, done);
      })

      // TODO `sections` tests require a class to be passed into the engine as an option, similiar to `with` in javascript. Can't really think of a way to do this using the worker itself. PRs welcome!
      it.skip('test_to_s_access', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/logic_less/test_logic_less.rb#L136-L151
        // v2.0.0
        var template = "- require 'forwardable';class Person;extend Forwardable;attr_accessor:name;def initialize(name)@name=name;end;def location=(location)@location=location;end;def_delegators:@location,:city;end;class Location;attr_accessor:city;def initialize(city)@city=city;end;end;class ViewEnv;def person()[{:name=>'Joe'},{:name=>'Jack'}];end;def people()%w(Andy Fred Daniel).collect{|n|Person.new(n)};end;def cities()%w{Atlanta Melbourne Karlsruhe};end;\np\n - people\n  .name = self\n}\n\n    hash = {\n      :people => [\n        'Joe',\n        'Jack'\n      ]\n    ";
        var expected = '<p><div class="name">Joe</div><div class="name">Jack</div></p>'
        var opts = {
          scope: {
            people: [ 'Joe', 'Jack' ]
          },
          dictionary_access: 'symbol'
        }

        compare(template, expected, done);
      })

      // TODO we do not currently support ERB or conversion between other formats. PRs welcome!
      it.skip('test_converter', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_erb_converter.rb#L5-L66
        // v2.0.0
        var template = "\ndoctype 5\nhtml\n  head\n    title Hello World!\n    /! Meta tags\n       with long explanatory\n       multiline comment\n    meta name=\"description\" content=\"template language\"\n    /! Stylesheets\n    link href=\"style.css\" media=\"screen\" rel=\"stylesheet\" type=\"text/css\"\n    link href=\"colors.css\" media=\"screen\" rel=\"stylesheet\" type=\"text/css\"\n    /! Javascripts\n    script src=\"jquery.js\"\n    script src=\"jquery.ui.js\"\n    /[if lt IE 9]\n      script src=\"old-ie1.js\"\n      script src=\"old-ie2.js\"\n    sass:\n      body\n        background-color: red\n  body\n    #container\n      p Hello\n        World!\n      p= \"dynamic text with\nnewline\"\n";
        var expected = "<%\n%><!DOCTYPE html><%\n%><html><%\n%><head><%\n%><title>Hello World!</title><%\n%><!--Meta tags<%\n%>\nwith long explanatory<%\n%>\nmultiline comment--><%\n%><meta content=\"template language\" name=\"description\" /><%\n%><!--Stylesheets--><%\n%><link href=\"style.css\" media=\"screen\" rel=\"stylesheet\" type=\"text/css\" /><%\n%><link href=\"colors.css\" media=\"screen\" rel=\"stylesheet\" type=\"text/css\" /><%\n%><!--Javascripts--><%\n%><script src=\"jquery.js\"><%\n%></script><script src=\"jquery.ui.js\"><%\n%></script><!--[if lt IE 9]><%\n%><script src=\"old-ie1.js\"><%\n%></script><script src=\"old-ie2.js\"><%\n%></script><![endif]--><style type=\"text/css\">body{background-color:red}<%\n%><%\n%></style><%\n%></head><body><%\n%><div id=\"container\"><%\n%><p>Hello<%\n%>\nWorld!</p><%\n%><p><%= ::Temple::Utils.escape_html((\"dynamic text with\nnewline\")) %><%\n%></p></div></body></html>";

        compare(template, expcted, done);
      })

      // TODO we do not currently support embedding asciidoc syntax. PRs welcome!
      it.skip('test_wip_render_with_asciidoc', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_embedded_engines.rb#L17-L31
        // v2.0.0
        var template = "\nasciidoc:\n  == Header\n  Hello from #{\"AsciiDoc!\"}\n  #{1+2}\n  * one\n  * two\n";
        var expected = 'Hello from AsciiDoc!'

        compare(template, expcted, done);
      })

      it('test_render_with_output_code_block_without_do', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_blocks.rb#L14-L22
        // v2.0.0
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\np\n  = hello_world \"Hello Ruby!\"\n    | Hello from within a block!\n";
        var expected = '<p>Hello Ruby! Hello from within a block! Hello Ruby!</p>'

        compare(template, expected, done);
      })

      it('test_render_with_output_code_within_block_without_do', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_blocks.rb#L34-L42
        // v2.0.0
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\np\n  = hello_world \"Hello Ruby!\"\n    = hello_world \"Hello from within a block!\"\n";
        var expected = '<p>Hello Ruby! Hello from within a block! Hello Ruby!</p>'

        compare(template, expected, done);
      })

      it('test_render_with_output_code_within_block_2_without_do', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_blocks.rb#L55-L64
        // v2.0.0
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\np\n  = hello_world \"Hello Ruby!\"\n    = hello_world \"Hello from within a block!\"\n      = hello_world \"And another one!\"\n";
        var expected = '<p>Hello Ruby! Hello from within a block! And another one! Hello from within a block! Hello Ruby!</p>';

        compare(template, expected, done);
      })

      it('test_render_with_control_code_loop_without_do', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_blocks.rb#L90-L98
        // v2.0.0
        var template = "\np\n  - 3.times\n    | Hey!\n";
        var expected = '<p>Hey!Hey!Hey!</p>'

        compare(template, expected, done);
      })

      it('test_captured_code_block_with_conditional_without_do', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_blocks.rb#L110-L118
        // v2.0.0
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n= hello_world \"Hello Ruby!\"\n  - if true\n    | Hello from within a block!\n";
        var expected = 'Hello Ruby! Hello from within a block! Hello Ruby!';

        compare(template, expected, done);
      })

      it('test_hyphenated_attribute', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_blocks.rb#L111-L117
        // v2.0.0
        var template = "\n.alpha data={:a => 'alpha', :b => 'beta', :c_d => 'gamma', :c => {:e => 'epsilon'}}\n";
        var expected = '<div class="alpha" data-a="alpha" data-b="beta" data-c-d="gamma" data-c-e="epsilon"></div>';

        compare(template, expected, done);
      })

      it('test_splat_2.0', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_attributes.rb#L127-L133
        // v2.0.0
        var template = "-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\nh1 *hash class=[] This is my title\n";
        var expected = '<h1 a="The letter a" b="The letter b">This is my title</h1>';

        compare(template, expected, done);
      })

      it('test_closed_splat', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_attributes.rb#L135-L141
        // v2.0.0
        var template = "-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n*hash /\n";
        var expected = '<div a="The letter a" b="The letter b" />';

        compare(template, expected, done);
      })

      it('test_html_quoted_attr_escape_with_interpolation', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_escaping.rb#L49-L56
        // v2.0.0
        var template = "\np id=\"&#{'\"'}\" class==\"&amp;#{'\"'}\"\np id=\"&#{{'\"'}}\" class==\"&amp;#{{'\"'}}\"\n";
        var expected = '<p class="&amp;&quot;" id="&amp;&quot;"></p><p class="&amp;"" id="&amp;""></p>';

        compare(template, expected, done);
      })

      it('test_hash_call_in_attribute_with_ruby_evaluation_2.0+', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_code_evaluation.rb#L117-L123
        // v2.0.0
        var template = "-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\np id=(hash[:a] + hash[:a]) Test it\n";
        var expected = '<p id="The letter aThe letter a">Test it</p>';

        compare(template, expected, done);
      })

      it('test_id_attribute_merging_2.0.0+', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_attributes.rb#L41-L46
        // v2.0.0
        var template = "\n#alpha id=\"beta\" Test it\n";
        var expected = '<div id="alpha_beta">Test it</div>';

        compare(template, expected, done, {merge_attrs: {class: ' ', id: '_'}});
      })

      it('test_id_attribute_merging2_2.0.0+', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_attributes.rb#L48-L53
        // v2.0.0
        var template = "\n#alpha id=\"beta\" Test it\n";
        var expected = '<div id="alpha-beta">Test it</div>';

        compare(template, expected, done, {merge_attrs: {class: ' ', id: '-'}});
      })

      it('test_splat_with_class_merging_2.0.0+', function(done) {
        // https://github.com/slim-template/slim/blob/9f452c45f8a8cd8b12ad6023410c2e849aa28fb2/test/slim/test_html_structure.rb#L547-L553
        // v1.2.0
        var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n\n#myid.myclass *{:class => [:secondclass, %w(x y z)]} *hash This is my title\n";
        var expected = '<div a="The letter a" b="The letter b" class="myclass secondclass x y z" id="myid">This is my title</div>';

        compare(template, expected, done);
      })

      it('test_html_quoted_attr_escape_2.0.0+', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_escaping.rb#L41-L47
        // v2.0.0
        var template = "\np id=\"&\" class==\"&amp;\"\n";
        var expected = '<p class="&amp;" id="&amp;"></p>';

        compare(template, expected, done);
      })

      it('test_thread_options', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_thread_options.rb#L4-L17
        // v2.0.0
        var template = "p.test"

          function second() {
            compare(template, '<p class=\'test\'></p>', done, {attr_quote: "'"});
          }

        compare(template, '<p class="test"></p>', second);
      })

      it('test_closed_splat_tag_2.0.0+', function(done) {
        // https://github.com/slim-template/slim/blob/0652151acc24de548d8cb8e5de6bd7bbafdbd4c9/test/core/test_html_attributes.rb#L160-L166
        // v2.0.0
        var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n*hash /\n";
        var expected = '<div a="The letter a" b="The letter b" />';

        compare(template, expected, done);
      })
    }


  /*****************************************************************************************************
   * v2.0.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v2.0.1")) {

      it('test_render_without_html_safe2', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_code_escaping.rb#L20-L26
        // v2.0.1
        var template = "\np = \"<strong>Hello World\\n, meet 'Slim'</strong>.\"\n";
        var expected = "<p>&lt;strong&gt;Hello World\n, meet &#39;Slim&#39;&lt;/strong&gt;.</p>"

          compare(template, expected, done);
      })

      // TODO figure out how to get yield style blocks working
      it.skip('test_render_splat_with_html_safe_true', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_code_escaping.rb#L49-L57
        // v2.0.1
        var template = "\np *{ :title => '&'.html_safe }\n";
        var expected = "<p title=\"&amp;\"></p>"
        var opts = {
          use_html_safe: true
        }

          compare(template, expected, done, opts);
      })

      // TODO figure out how to get yield style blocks working
      it.skip('test_render_attribute_with_html_safe_true', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_code_escaping.rb#L59-L67
        // v2.0.1
        var template = "\np title=('&'.html_safe)\n"
        var expected = "<p title=\"&\"></p>"
        var opts = {
          use_html_safe: true
        }

          compare(template, expected, done, opts);
      })

      // TODO we do not currently support embedding org-ruby. PRs welcome!
      it.skip('test_render_with_org', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_embedded_engines.rb#L71-L81
        // v2.0.1
        var template = "\norg:\n  * point1\n  * point2\n";
        var expected = "<h1>point1</h1>\n<h1>point2</h1>\n"

          compare(template, expected, done);
      })

      it('test_boolean_attribute_true_2.0.1+', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_html_attributes.rb#L65-L73
        // v2.0.1
        var template = "\n- cond=true\noption selected=true Text\noption selected=cond Text2\n";
        var expected = '<option selected="">Text</option><option selected="">Text2</option>';

        compare(template, expected, done);
      })

      it('test_boolean_attribute_shortcut_2.0.1+', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_html_attributes.rb#L93-L100
        // v2.0.1
        var template = "\noption(class=\"clazz\" selected) Text\noption(selected class=\"clazz\") Text\n";
        var expected = '<option class="clazz" selected="">Text</option><option class="clazz" selected="">Text</option>';

        compare(template, expected, done);
      })

      it('test_illegal_shortcuts', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_parser_errors.rb#L161-L173
        // v2.0.1

        compareErr("\n.#test\n", done);
      })


      it('test_splat_without_content', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_html_attributes.rb#L119-L127
        // v2.0.1
        var template = "\n-def hash() {:a => 'The letter a', :b => 'The letter b'}; end\n*hash\np*hash\n";
        var expected = '<div a="The letter a" b="The letter b"></div><p a="The letter a" b="The letter b"></p>';

        compare(template, expected, done);
      })

      it('test_splat_with_boolean_attribute_2.0.1+', function(done) {
        // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_html_attributes.rb#L209-L215
        // v2.0.1
        var template = "\n*{:disabled => true, :empty1 => false, :nonempty => '', :empty2 => nil} This is my title\n";
        var expected =  '<div disabled="" nonempty="">This is my title</div>'

          compare(template, expected, done);
      })

      if (semver.lt(window.__libVersion, "v3.0.4")) {
        // script type was removed in 3.0.4
        it('test_render_with_javascript_including_variable_2.0.1+', function(done) {
          // https://github.com/slim-template/slim/blob/0da32066eb976c563cd50acd51eaf6e3836b7ea2/test/core/test_embedded_engines.rb#L120-L128
          // v2.0.1
          var template = "\n- func = \"alert('hello');\"\njavascript:   \n  $(function() { \#{func} });\n";
          var expected = "<script type=\"text/javascript\">$(function() { alert(&#39;hello&#39;); });</script>";

          compare(template, expected, done);
        })

      }
    }


  /*****************************************************************************************************
   * v2.0.2
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v2.0.2") && semver.lt(window.__libVersion, "v3.0.0")) {
      it('test_custom_attr_delims_option', function(done) {
        // https://github.com/slim-template/slim/blob/e855323d54634fd8188ad9f8c36cfdd353702480/test/core/test_html_structure.rb#L296-L304
        // v2.0.2
        var template = "\np { foo=\"bar\" }\n";

        function third() {
          compare(template, '<p>{ foo="bar" }</p>', done, {attr_delims: {'(': ')', '[': ']'}});
        }

          function second() {
            compare(template, '<p foo="bar"></p>', third, {attr_delims: {'{': '}'}});
          }

          compare(template, '<p foo="bar"></p>', second);
        })

      // TODO we do not currently have an API for exposing the delimiters, or any other option. Thats basically the only reason I can determine that this tests exists. We can create an option to return the options from the engine. PRs welcome!
      it.skip('test_default_attr_delims_option', function(done) {
        // https://github.com/slim-template/slim/blob/e855323d54634fd8188ad9f8c36cfdd353702480/test/core/test_html_structure.rb#L286-L294
        // v2.0.2
        var template = "\np<id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\">= output_number\n";
        var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>'

          compare(template, expected, done);
        })
    }

  /*****************************************************************************************************
   * v2.0.3
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v2.0.3")) {
      it('test_if_without_content', function(done) {
        // https://github.com/slim-template/slim/blob/9877df4756fcf59f5ce8c3f4df97c559f4bacd26/test/core/test_code_blocks.rb#L120-L125
        // v2.0.3
        var template = "\n- if true\n";
        var expected = ''

          compare(template, expected, done);
      })

      it('test_unless_without_content', function(done) {
        // https://github.com/slim-template/slim/blob/9877df4756fcf59f5ce8c3f4df97c559f4bacd26/test/core/test_code_blocks.rb#L127-L132
        // v2.0.3
        var template = "\n- unless true\n";
        var expected = ''

          compare(template, expected, done);
      })

      it('test_if_with_comment', function(done) {
        // https://github.com/slim-template/slim/blob/9877df4756fcf59f5ce8c3f4df97c559f4bacd26/test/core/test_code_blocks.rb#L134-L140
        // v2.0.3
        var template = "\n- if true\n  / comment\n";
        var expected = ''

          compare(template, expected, done);
      })

      it('test_control_do_with_comment', function(done) {
        // https://github.com/slim-template/slim/blob/9877df4756fcf59f5ce8c3f4df97c559f4bacd26/test/core/test_code_blocks.rb#L142-L148
        // v2.0.3
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n- hello_world \"Hello\"\n  / comment\n";
        var expected = ''

          compare(template, expected, done);
      })

      it('test_output_do_with_comment', function(done) {
        // https://github.com/slim-template/slim/blob/9877df4756fcf59f5ce8c3f4df97c559f4bacd26/test/core/test_code_blocks.rb#L150-L156
        // v2.0.3
        var template = "\n- def hello_world(text = \"Hello World from @env\", opts = {}) text += opts.to_a * \" \" if opts.any?; (block_given? ? \"\#{text} \#{yield} \#{text}\" : text) end\n= hello_world \"Hello\"\n  / comment\n";
        var expected = 'Hello'

          compare(template, expected, done);
      })

      it('test_output_if_without_content', function(done) {
        // https://github.com/slim-template/slim/blob/9877df4756fcf59f5ce8c3f4df97c559f4bacd26/test/core/test_code_blocks.rb#L158-L163
        // v2.0.3
        var template = "\n= if true\n";
        var expected = ''

          compare(template, expected, done);
      })

      it('test_output_if_with_comment', function(done) {
        // https://github.com/slim-template/slim/blob/9877df4756fcf59f5ce8c3f4df97c559f4bacd26/test/core/test_code_blocks.rb#L165-L171
        // v2.0.3
        var template = "\n= if true\n  / comment\n";
        var expected = ''

          compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v2.1.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v2.1.0")) {
      it('test_render_variable_ending_with_do', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_code_blocks.rb#L24-L32
        // v2.1.0
        var template = "\n- appelido=10\np= appelido\n- appelido\n";
        var expected = '<p>10</p>';

        compare(template, expected, done);
      })

      // TODO is_html_safe is a rails specific API, so we don't realy have a reason to mock this out to confim it works. PRs welcome!
      it.skip('test_render_splat_with_html_safe_false', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_code_escaping.rb#L58-L66
        // v2.1.0
        var template = "\np *{ :title => '&' }\n";
        var expected = "<p title=\"&amp;\"></p>"

        compare(template, expected, done, {use_html_safe: true});
      })

      // TODO we do not currently support embedding creole. PRs welcome!
      it.skip('test_render_with_creole_one_line', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_embedded_engines.rb#L72-L81
        // v2.1.0
        var template = "\ncreole: Hello **world**,\n  we can write one-line embedded markup now!\n  = Headline\n  Text\n.nested: creole: **Strong**\n";
        var expected = '<p>Hello <strong>world</strong>, we can write one-line embedded markup now!</p><h1>Headline</h1><p>Text</p><div class="nested"><p><strong>Strong</strong></p></div>';

        compare(template, expected, done, {use_html_safe: true});
      })

      // TODO ironically, we do not currently support embedding opal. PRs welcome!
      it.skip('test_render_with_opal', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_embedded_engines.rb#L127-L140
        // v2.1.0
        var template = "\nopal:\n  puts 'hello from opal'\n";
        var expected = '$puts("hello from opal")'

        compare(template, expected, done);
      })

      // TODO we do not support includes currently. PRs welcome!
      it.skip('test_include', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/include/test_include.rb#L5-L13
        // v2.1.0
        var template = "\na: include slimfile\nb: include textfile\nc: include slimfile.slim\nd: include subdir/test\n";
        var expected = '<a>slim1recslim2</a><b>1+2=3</b><c>slim1recslim2</c><d>subdir</d>'
        var opts = {
          include_dirs : 'pwd'
        }

        compare(template, expected, done);
      })

      // TODO we do not support includes currently. PRs welcome!
      it.skip('test_include_with_newline', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/include/test_include.rb#L15-L22
        // v2.1.0
        var template = "\na: include slimfile\n.content\n";
        var expected = '<a>slim1recslim2</a><div class="content"></div>'
        var opts = {
          include_dirs : 'pwd'
        }

        compare(template, expected, done);
      })

      it('test_correct_line_number', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_pretty.rb#L102-L115
        // v2.1.0

        compareErr("\nhtml\n  head\n  body\n    p Slim\n    = ''\n    = ''\n    = ''\n    = unknown_ruby_method\n", done);
      })

      it('test_relaxed_indentation_of_first_line', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_html_structure.rb#L17-L24
        // v2.1.0
        var template = "\n  p\n    .content\n";
        var expected = "<p><div class=\"content\"></div></p>";

        compare(template, expected, done);
      })

      it('test_relaxed_text_indentation', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_html_structure.rb#L221-L231
        // v2.1.0
        var template = "\np\n  | text block\n   text\n    line3\n";
        var expected = "<p>text block\ntext\n line3</p>";

        compare(template, expected, done);
      })

      it('test_custom_attr_list_delims_option', function(done) {
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/core/test_html_structure.rb#L334-L343
        // v2.1.0
        var template = "\np { foo=\"bar\" x=(1+1) }\np < x=(1+1) > Hello\n";

        function third() {
          compare(template, '<p>{ foo="bar" x=(1+1) }</p><p x="2">Hello</p>', done, {
            attr_list_delims: {'<': '>'},
            code_attr_delims: {'(': ')' }
          });
        }

          function second() {
            compare(template, '<p foo="bar" x="2"></p><p>< x=(1+1) > Hello</p>', third, {attr_list_delims: {'{': '}'}});
          }

          compare(template, '<p foo="bar" x="2"></p><p>< x=(1+1) > Hello</p>', second);
        })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_explicit_smart_text_recognition', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L8-L40
        // v2.1.0
        var template = "\n>\n  a\n>\n  b\n>\n  c\n>\n  d\n> e\nf\n> g\n  h\ni\n";
        var expected = "a\nb\nc\nd\ne\n<f></f>\ng\nh\n<i></i>";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_implicit_smart_text_recognition', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L42-L70
        // v2.1.0
        var template = "\np\n  A\np\n  B\np\n  C\np\n  D\np E\nF\np G\n  H\nI\n";
        var expected = "<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p>\nF\n<p>G\nH</p>\nI";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_multi_line_smart_text', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L72-L91
        // v2.1.0
        var template = "\np\n  First line.\n  Second line.\n  Third line\n   with a continuation\n   and one more.\n  Fourth line.\n";
        var expected = "<p>First line.\nSecond line.\nThird line\nwith a continuation\nand one more.\nFourth line.</p>";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_smart_text_escaping', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L93-L112
        // v2.1.0
        var template = "\n| Not escaped <&>.\np Escaped <&>.\np\n  Escaped <&>.\n  > Escaped <&>.\n  Protected &amp; &lt; &gt; &copy; &Aacute;.\n  Protected &#0129; &#x00ff;.\n  Escaped &#xx; &#1f; &;.\n";
        var expected = "Not escaped <&>.<p>Escaped &lt;&amp;&gt;.</p><p>Escaped &lt;&amp;&gt;.\nEscaped &lt;&amp;&gt;.\nProtected &amp; &lt; &gt; &copy; &Aacute;.\nProtected &#0129; &#x00ff;.\nEscaped &amp;#xx; &amp;#1f; &amp;;.</p>";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_smart_text_in_tag_escaping', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L137-L151
        // v2.1.0
        var template = "\np Escaped <&>.\n  Protected &amp; &lt; &gt; &copy; &Aacute;.\n  Protected &#0129; &#x00ff;.\n  Escaped &#xx; &#1f; &;.\n";
        var expected = "<p>Escaped &lt;&amp;&gt;.\nProtected &amp; &lt; &gt; &copy; &Aacute;.\nProtected &#0129; &#x00ff;.\nEscaped &amp;#xx; &amp;#1f; &amp;;.</p>";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_smart_text_mixed_with_tags', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L153-L195
        // v2.1.0
        var template = "\np\n  Text\n  br\n  >is\n  strong really\n  > recognized.\n  More\n  b text\n  .\n  And\n  i more\n  ...\n  span Really\n  ?!?\n  .bold Really\n  !!!\n  #id\n    #{'Good'}\n  !\n";
        var expected = "<p>Text\n<br />\nis\n<strong>really</strong>\nrecognized.\nMore\n<b>text</b>.\nAnd\n<i>more</i>...\n<span>Really</span>?!?\n<div class=\"bold\">Really</div>!!!\n<div id=\"id\">Good</div>!</p>";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_smart_text_mixed_with_links', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L197-L231
        // v2.1.0
        var template = "\np\n  Text with\n  a href=\"#1\" link\n  .\n  Text with\n  a href=\"#2\" another\n              link\n  > to somewhere else.\n  a href=\"#3\"\n    This link\n  > goes\n    elsewhere.\n  See (\n  a href=\"#4\" link\n  )?\n";
        var expected = "<p>Text with\n<a href=\"#1\">link</a>.\nText with\n<a href=\"#2\">another\nlink</a>\nto somewhere else.\n<a href=\"#3\">This link</a>\ngoes\nelsewhere.\nSee (<a href=\"#4\">link</a>)?</p>";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_smart_text_mixed_with_code', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L233-L252
        // v2.1.0
        var template = "\np\n  Try a list\n  ul\n    - 2.times do |i|\n      li\n        Item: #{i}\n  > which stops\n  b here\n  . Right?\n";
        var expected = "<p>Try a list\n<ul><li>Item: 0</li><li>Item: 1</li></ul>\nwhich stops\n<b>here</b>. Right?</p>";

        compare(template, expected, done);
      })

      // TODO we do not currently include slim/smart in our compiled versons
      it.skip('test_basic_unicode_smart_text', function(done) {
        // test skipped because it requires smart mode to be enabled at compile time, which breaks other tests
        // you can enable it by modifying slim.rb to add require 'slim/smart'
        // https://github.com/slim-template/slim/blob/4375f2ff1ac3c00a16df0f6b7f9198e01d80ffdb/test/smart/test_smart_text.rb#L256-L273
        // v2.1.0
        var template = "p\n 是\n čip\n Čip\n Žůžo\n šíp\n"
        var expected = "<p>是\n čip\n Čip\n Žůžo\n šíp</p>"

        compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v3.0.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v3.0.0")) {
      it('test_unicode_tags', function(done) {
        // https://github.com/slim-template/slim/blob/3d0b31bc097f245f3ae3d90c21d63816c7a82ebe/test/core/test_unicode.rb#L5-L9
        // v3.0.0
        var template = "Статья года"
        var expected = "<Статья>года</Статья>"

        compare(template, expected, done);
      })

      it('test_unicode_attrs', function(done) {
        // https://github.com/slim-template/slim/blob/3d0b31bc097f245f3ae3d90c21d63816c7a82ebe/test/core/test_unicode.rb#L11-L15
        // v3.0.0
        var template = "Статья года=123 content"
        var expected = "<Статья года=\"123\">content</Статья>"

        compare(template, expected, done);
      })

      it('test_custom_attr_delims_option_3.0.0+', function(done) {
        // https://github.com/slim-template/slim/blob/3d0b31bc097f245f3ae3d90c21d63816c7a82ebe/test/core/test_html_structure.rb#L319-L323
        // v3.0.0
        var template = "\np { foo=\"bar\" }\n";

        function third() {
          compare(template, '<p>{ foo="bar" }</p>', done, {attr_list_delims: {'(': ')', '[': ']'}});
        }

          function second() {
            compare(template, '<p foo="bar"></p>', third, {attr_list_delims: {'{': '}'}});
          }

          compare(template, '<p foo="bar"></p>', second);
        })
    }


  /*****************************************************************************************************
   * v3.0.1
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v3.0.1")) {
      it('test_weird_attribute', function(done) {
        // https://github.com/slim-template/slim/blob/bb7ca78c1ea9629d8b57a06fcb99c938c9d7640e/test/core/test_html_attributes.rb#L260-L267
        // v3.0.1
        var template = "\np\n  img(src='img.png' whatsthis?!)\n  img src='img.png' whatsthis?!=\"wtf\"\n";
        var expected = '<p><img src="img.png" whatsthis?!="" /><img src="img.png" whatsthis?!="wtf" /></p>'

          compare(template, expected, done);
      })
    }


  /*****************************************************************************************************
   * v3.0.4
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v3.0.4")) {
      it('test_render_with_javascript_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L114-L125
        // v3.0.4
        var template = "\njavascript:   \n  $(function() {});\n\n\n  alert('hello')\np Hi\n";
        var expected = "<script>$(function() {});\n\n\nalert('hello')</script><p>Hi</p>";

          compare(template, expected, done);
      })

      it('test_render_with_javascript_with_tabs_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L142-L145
        // v3.0.4
        var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
        var expected = "<script>$(function() {});\nalert('hello')</script><p>Hi</p>"

          compare(template, expected, done);
      })

      it('test_render_with_javascript_including_variable_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L147-L155
        // v3.0.4
        var template = "\n- func = \"alert('hello');\"\njavascript:   \n  $(function() { \#{func} });\n";
        var expected = "<script>$(function() { alert(&#39;hello&#39;); });</script>";

        compare(template, expected, done);
      })

      it('test_enabled_embedded_engine_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L227-L241
        // v3.0.4
        var template = "\njavascript:\n  $(function() {});\n";
        var expected = '<script>$(function() {});</script>';
        var opts = {
          disable_engines: ['ruby']
        }

        function second() {
          compare(template, expected, done, {enable_engines:  ['javascript']});
        }

        compare(template, expected, second, {disable_engines:  ['ruby']});
      })

      it('test_render_with_javascript_with_explicit_html_comment_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L157-L162
        // v3.0.4
        var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
          var expected = "<script><!--\n$(function() {});\nalert('hello')\n//--></script><p>Hi</p>"
          var opts = {
            js_wrapper: 'comment'
          }

        compare(template, expected, done, opts);
      })

      it('test_render_with_javascript_with_explicit_cdata_comment_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L164-L169
        // v3.0.4
        var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
        var expected = "<script>\n//<![CDATA[\n$(function() {});\nalert('hello')\n//]]>\n</script><p>Hi</p>";
          var opts = {
            js_wrapper: 'cdata'
          }

        compare(template, expected, done, opts);
      })

      it('test_render_with_javascript_with_format_xhtml_comment_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L171-L176
        // v3.0.4
        var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
        var expected = "<script>\n//<![CDATA[\n$(function() {});\nalert('hello')\n//]]>\n</script><p>Hi</p>"
        var opts = {
          js_wrapper: 'guess',
          format: 'xhtml'
        }

        compare(template, expected, done, opts);
      })

      it('test_render_with_javascript_with_format_html_comment_3.0.4+', function(done) {
        // https://github.com/slim-template/slim/blob/efaa090066c3bc2a8b0db48f4c296271148bc1e8/test/core/test_embedded_engines.rb#L178-L183
        // v3.0.4
        var template = "javascript:\n\t$(function() {});\n\talert('hello')\np Hi"
        var expected = "<script><!--\n$(function() {});\nalert('hello')\n//--></script><p>Hi</p>"
        var opts = {
          js_wrapper: 'guess',
          format: 'html'
        }

        compare(template, expected, done, opts);
      })

    }


  /*****************************************************************************************************
   * v3.0.7
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v3.0.7")) {
      it('test_render_with_begin', function(done) {
        // https://github.com/slim-template/slim/blob/cbeb8cacf479952b96e7689f74c133ec709f4941/test/core/test_code_structure.rb#L16-L32
        // v3.0.7
        var template = "\n- if true\n  - begin\n    p A\n- if true\n  - begin\n    p B\n- if true\n  - begin\n    p C\n  - rescue\n    p D\n";
        var expected = '<p>A</p><p>B</p><p>C</p>';

          compare(template, expected, done);
      })

      it('test_render_with_custom_array_shortcut', function(done) {
        // https://github.com/slim-template/slim/blob/cbeb8cacf479952b96e7689f74c133ec709f4941/test/core/test_html_structure.rb#L102-L107
        // v3.0.7
        var template = "\n#user@.admin Daniel\n";
        var expected = '<div class="admin" id="user" role="admin">Daniel</div>'
        var opts = {
          shortcut: {
              '#': {attr: 'id'},
              '.': {attr: 'class'},
              '@': {attr: 'role'},
              '@.': {attr: ['class', 'role']}
          }
        }

          compare(template, expected, done, opts);
      })

      // TODO need to determine how to pass a mixed hash and object like below into Slim as an option
      it.skip('test_render_with_custom_shortcut_and_additional_attrs', function(done) {
        // https://github.com/slim-template/slim/blob/cbeb8cacf479952b96e7689f74c133ec709f4941/test/core/test_html_structure.rb#L109-L116
        // v3.0.7
        var template = "\n^items\n  == \"[{'title':'item0'},{'title':'item1'},{'title':'item2'},{'title':'item3'},{'title':'item4'}]\"\n";
        var expected = '<script data-binding="items" type="application/json">[{\'title\':\'item0\'},{\'title\':\'item1\'},{\'title\':\'item2\'},{\'title\':\'item3\'},{\'title\':\'item4\'}]</script>'
          var opts = {"shortcut":{"^":{"tag":"script","attr":"data-binding","additional_attrs":{"type":"application/json"}}}}

          compare(template, expected, done);
      })
    }
});

