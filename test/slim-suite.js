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
    it('test_render_with_call_to_set_attribute', function(done) {
      // https://github.com/slim-template/slim/blob/f5addcd3397b611ad93b83a0e988b173e29cd958/test/slim/test_engine.rb#L79-L95
      // v0.2.0
      var template = "html\n  head\n    title Simple Test Title\n  body\n    h1 This is my title\n    p id=\"#{'notice'}\"\n      = 'Hello World from @env'\n";
      var expected = "<html><head><title>Simple Test Title</title></head><body><h1>This is my title</h1><p id=\"notice\">Hello World from @env</p></body></html>"

        compare(template, expected, done);
    })

    it('test_render_with_call_to_set_attribute_and_call_to_set_content', function(done) {
      // https://github.com/slim-template/slim/blob/f5addcd3397b611ad93b83a0e988b173e29cd958/test/slim/test_engine.rb#L97-L112
      // v0.2.0
      var template = "html\n  head\n    title Simple Test Title\n  body\n    h1 This is my title\n    p id=\"#{'notice'}\" = 'Hello World from @env'\n";
      var expected = "<html><head><title>Simple Test Title</title></head><body><h1>This is my title</h1><p id=\"notice\">Hello World from @env</p></body></html>"

        compare(template, expected, done);
    })
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
        // 
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

    it('test_render_without_html_safe', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_escaping.rb#L20-L26
      // v0.7.0
      var template = "\np = \"<strong>Hello World\\n, meet \\\"Slim\\\"</strong>.\"\n";
      var expected = "<p>&lt;strong&gt;Hello World\n, meet \&quot;Slim\&quot;&lt;&#47;strong&gt;.</p>"

        compare(template, expected, done);
    })

    it('test_method_call_in_attribute_without_quotes', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L61-L67
      // v0.7.0
      var template = "\nform action=('/action-' + [:page, :save].join('-')) method='post'\n";
      var expected = '<form action="&#47;action-page-save" method="post"></form>';

      compare(template, expected, done);
    })

    it('test_method_call_in_delimited_attribute_without_quotes', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L69-L75
      // v0.7.0
      var template = "\nform(action=('/action-' + [:page, :save].join('-')) method='post')\n"; 
      var expected = '<form action="&#47;action-page-save" method="post"></form>';

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

    it('test_hash_call_in_attribute_with_ruby_evaluation', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L101-L115
      // v0.7.0
      var template = "\np id={{a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a]} Test it\n";
      var expected = '<p id="The letter aThe letter a">Test it</p>';

      compare(template, expected, done);
    })

    it('test_hash_call_in_attribute_with_ruby_evaluation_2', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L117-L123
      // v0.7.0
      var template = "\np[id=({a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a])] Test it\n";
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
      var template ="\np= 'Hello World from @env'\np='Hello World from @env'\n";
      var expected = '<p>Hello World from @env</p><p>Hello World from @env</p>';

      compare(template, expected, done);
    })

    it('test_class_output_without_space', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L84-L91
      // v0.7.0
      var template = "\n.test='Hello World from @env'\n#test=='Hello World from @env'\n";
      var expected = '<div class="test">Hello World from @env</div><div id="test">Hello World from @env</div>';

      compare(template, expected, done);
    })

    it('test_attribute_output_without_space', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_output.rb#L93-L100
      // v0.7.0
      var template = "\np id=\"test\"='Hello World from @env'\np(id=\"test\")=='Hello World from @env'\n";
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

    it('test_render_with_javascript', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_embedded_engines.rb#L28-L34
      // v0.7.0
      var template ="\njavascript:   \n  $(function() {});\n";
      var expected = '<script type="text/javascript">$(function() {});</script>';

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
      var template = "\n- x = '\"'\n- content = '<x>'\np class=\"#{x}\" test #{content}\n";
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

    it('test_doctype', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L25-L32
      // v0.7.0
      var template = "\n! doctype 5\nhtml\n";
      var expected = '<!DOCTYPE html><html></html>';

      compare(template, expected, done);
    })

    it('test_single_quoted_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_html_structure.rb#L163-L169
      // v0.7.0
      var template ="\np class='underscored_class_name' = 1337\n";
      var expected = '<p class="underscored_class_name">1337</p>';

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

    if (semver.lt(window.__libVersion, "v0.7.1")) {
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

      it('test_method_call_in_delimited_attribute_without_quotes2', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L77-L83
        // v0.7.0
        var template = "\nform(method='post' action=('/action-' + [:page, :save].join('-')))\n"; 
        var expected = '<form method="post" action="&#47;action-page-save"></form>';

        compare(template, expected, done);
      })

      it('test_hash_call_in_attribute_with_ruby_evaluation_4', function(done) {
        // https://github.com/slim-template/slim/blob/2412a09b13cb8e4302e56804676e4543c6ab2784/test/slim/test_code_evaluation.rb#L133-L139
        // v0.7.0
        var template = "\np(id=[{a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a]] class=[{a:\"The letter a\"}[:a]]) Test it\n";
        var expected = '<p id="The letter aThe letter a" class="The letter a">Test it</p>';

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
  }

  /*****************************************************************************************************
   * v0.7.1
   *****************************************************************************************************/

  if (semver.gte(window.__libVersion, "v0.7.1")) {

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
      // v0.6.0
      var template = '\np#marvin.martian data-info="Illudium Q-36" = 1337\n';
      var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>';

      compare(template, expected, done);
    })

    it('test_parens_around_attributes', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_engine.rb#L439-L447
      // v0.6.1
      var template = "\np(id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\") = 1337\n";
      var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>';

      compare(template, expected, done);
    })

    it('test_parens_around_attributes_with_equal_sign_snug_to_right_paren', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_engine.rb#L449-L457
      // v0.6.1
      var template = "\np(id=\"marvin\" class=\"martian\" data-info=\"Illudium Q-36\")= 1337\n";
      var expected = '<p class="martian" data-info="Illudium Q-36" id="marvin">1337</p>';

      compare(template, expected, done);
    })

    it('test_render_with_spaced_parameterized_call_to_set_attributes_and_call_to_set_content', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_code_evaluation.rb#L37-L43
      // v0.7.0
      var template = "\np id=\"#{'notice'}\" class=\"hello world\" = \"Hello Ruby!\"\n";
      var expected = "<p class=\"hello world\" id=\"notice\">Hello Ruby!</p>"

        compare(template, expected, done);
    })

    it('test_method_call_in_delimited_attribute_without_quotes2', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_code_evaluation.rb#L77-L83
      // v0.7.0
      var template = "\nform(method='post' action=('/action-' + [:page, :save].join('-')))\n"; 
      var expected = '<form action="&#47;action-page-save" method="post"></form>';

      compare(template, expected, done);
    })

    it('test_hash_call_in_attribute_with_ruby_evaluation_4', function(done) {
      // https://github.com/slim-template/slim/blob/9bb706e831c6008e0bdd22c6a8b95f805815cb88/test/slim/test_code_evaluation.rb#L133-L139
      // v0.7.0
      var template = "\np(id=[{a:\"The letter a\"}[:a] + {a:\"The letter a\"}[:a]] class=[{a:\"The letter a\"}[:a]]) Test it\n";
      var expected = '<p class="The letter a" id="The letter aThe letter a">Test it</p>';

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
  }

  /*****************************************************************************************************
   * v0.7.2
   *****************************************************************************************************/
  if (semver.gte(window.__libVersion, "v0.7.2")) {

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

  /*****************************************************************************************************
   * v0.7.4
   *****************************************************************************************************/
  if (semver.gte(window.__libVersion, "v0.7.4")) {

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

  }


  /*****************************************************************************************************
   * v0.8.0
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.8.0")) {

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

      it('test_render_with_html_comments_2', function(done) {
        // https://github.com/slim-template/slim/blob/51bf666e7304eed27f9bd20b972a1f739526553f/test/slim/test_html_structure.rb#L272-L282
        // v0.8.3
        var template = "\np Hello\n/! This is a comment\n   Another comment\n  Last line of comment.\np World\n";
        var expected = "<p>Hello</p><!--This is a comment\n Another comment\nLast line of comment.--><p>World</p>"

          compare(template, expected, done);
      })
    }

  /*****************************************************************************************************
   * v0.8.4
   *****************************************************************************************************/
    if (semver.gte(window.__libVersion, "v0.8.4")) {

      it('test_render_with_auto_escape_true', function(done) {
        // https://github.com/slim-template/slim/blob/2c5ba08632330796f6c1f01b9bb703f4eb2eeddf/test/slim/test_code_escaping.rb#L36-L43
        // v0.8.4
        var template = "\n= \"<p>Hello</p>\"\n== \"<p>World</p>\"\n";
        var expected = "&lt;p&gt;Hello&lt;&#47;p&gt;<p>World</p>"

          compare(template, expected, done);
      })

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

      it('test_capitalized_doctype', function(done) {
        // https://github.com/slim-template/slim/blob/2c5ba08632330796f6c1f01b9bb703f4eb2eeddf/test/slim/test_html_structure.rb#L35-L42
        // v0.8.4
        var template = "\n! DOCTYPE 5\nhtml\n";
        var expected = '<!DOCTYPE html><html></html>'

          compare(template, expected, done);
      })
    }
});
