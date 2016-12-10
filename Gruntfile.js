var spawn = require('child_process').spawn;

module.exports = function(grunt) {
  'use strict';
  var rubyLibs = [
    'haml',
    'sass',
    'slim'
  ]

  var webpackCallback = function(done) {
    return function(err, stats) {
      if (err) throw new Error(err)

        if (stats.hasErrors()) {
          grunt.log.error(
              stats.toString({
                chunks: false, // Makes the build much quieter
                colors: false
              }))
        }

      if (stats.hasWarnings()) {
        grunt.log.write(
            stats.toString({
              chunks: false, // Makes the build much quieter
              colors: false
            }))
      }

      done();
    }
  }

  function isRubyLib(lib) {
    return rubyLibs.indexOf(lib) > -1
  }

  function filterGitLog(logs) {
    // by default, the prop is gitlog.TARGET.result
    // hacky, but only way to get target from existing data
    var target = this.prop.split('.')[1];

    var result = logs.map(log => {
      let tag = log.tag.match(/tag: (v?\d+\.\d+(?:\.\d+)?)($|, )/)

        if (tag) {
          tag = tag[1]
        } else {
          return
        }

      return tag
    })
    .filter(tag => !!tag)
      .reverse()
    .forEach(tag => {
      grunt.task.run([`build:${target}:${tag}`])
    })
  }

    function opalPath(l) {
      return {
        'OPAL_LOAD_PATH': () => `${__dirname}/lib/${l}/lib/:${
            grunt.file.expand([
              './ruby/*/gems/opal*/*',
              './ruby/*/gems/*/lib/',
              './ruby/*/bundler/gems/*/',
              './ruby/*/bundler/gems/*/lib/'
            ]).join(':')}`
      }
    }


  // load grunt dependencies
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    env: {
      slim: opalPath('slim'),
      sass: opalPath('sass')
    },
    clean: {
      autoprefixer: ['./dist/autoprefixer-*', './lib/autoprefixer/node_modules', './test/autoprefixer-suite.js'],
      livescript: ['./dist/livescript-*', './lib/livescript/node_modules'],
      stylus: ['./dist/stylus-*', './lib/stylus/node_modules'],
      less: ['./dist/less-*', './lib/less/node_modules'],
      jade: ['./dist/jade-*', './lib/pug/node_modules'],
      pug: ['./dist/pug-*', './lib/pug/node_modules'],
      haml: ['./dist/haml-*', './lib/haml/.bundle'],
      slim: ['./dist/slim-*', './lib/slim/.bundle'],
      sass: ['./dist/sass-*', './lib/sass/.bundle'],
      RUBY: ['./Gemfile.lock', './ruby']
    },
    karma: {
      options: {
        files: [
          {pattern: 'dist/*', included: false},
          {pattern: 'lib/**/*', included: false},
          './lib/js/sinon.js',
          './test/currentTag.js',
          './lib/js/semver.min.js',
          './node_modules/expect.js/index.js',
          './node_modules/jquery/dist/jquery.min.js',
          './test/<%= grunt.config.get("lib") %>-suite.js'
        ]
      },
      full: {
        configFile: 'karma.conf.js',
        fullRun: true
      },
      fast: {
        configFile: 'karma.conf.js',
        browsers: ['Chrome']
      }
    },

    gitlog: {
      options: {
        pretty: '{"tag": "%D", "hash": "%H"} --grunt-gitlog-separator--',
        callback: filterGitLog
      },
      jade: {
        options: {
          cwd: './lib/pug',
          to: '3196639',
          from: '0.24.0'
        },
      },
      pug: {
        options: {
          cwd: './lib/pug',
          from: '1.11.0',
        },
      },
      haml: {
        options: {
          cwd: './lib/haml',
          from: '0.4.0'
        },
      },
      livescript: {
        options: {
          cwd: './lib/livescript'
        },
      },
      stylus: {
        options: {
          cwd: './lib/stylus',
          from: '0.44.0^',
          to: 'dev',
        },
      },
      autoprefixer: {
        options: {
          cwd: './lib/autoprefixer'
        },
      },
      slim: {
        options: {
          tags: true,
          noWalk: true,
          cwd: './lib/slim'
        },
      },
      sass: {
        options: {
          cwd: './lib/sass',
          from: '3.1.0'
        },
      },
      less: {
        options: {
          cwd: './lib/less',
          to: '3.x',
        },
      }
    },
    gitpull: {
      autoprefixer: { options: { cwd: './lib/autoprefixer' } },
      livescript: { options: { cwd: './lib/livescript' } },
      stylus: { options: { cwd: './lib/stylus' } },
      haml: { options: { cwd: './lib/haml' } },
      less: { options: { cwd: './lib/less' } },
      jade: { options: { cwd: './lib/pug', branch: 'master'} },
      slim: { options: { cwd: './lib/slim' } },
      sass: { options: { cwd: './lib/sass' } },
      pug: { options: { cwd: './lib/pug' } }
    },
    gitcheckout: {
      options: { branch: '<%= grunt.config.get("currentTag") %>' },
      autoprefixer: { options: { cwd: './lib/autoprefixer' } },
      livescript: { options: { cwd: './lib/livescript' } },
      stylus: { options: { cwd: './lib/stylus' } },
      haml: { options: { cwd: './lib/haml' } },
      less: { options: { cwd: './lib/less' } },
      jade: { options: { cwd: './lib/pug' } },
      slim: { options: { cwd: './lib/slim' } },
      sass: { options: { cwd: './lib/sass' } },
      pug: { options: { cwd: './lib/pug' } }
    },
    gitapply: { options: {
        patchFiles: '../../diffs/<%= grunt.config.get("lib") %>/<%= grunt.config.get("currentTag") %>.patch',
        whitespace: 'fix'
      },
      slim: { options: { cwd: './lib/slim' } },
      sass: { options: { cwd: './lib/sass' } }
    },
    gitreset: {
      options: { mode: 'hard' },
      livescript: { options: { cwd: './lib/livescript' } },
      stylus: { options: { cwd: './lib/stylus' } },
      haml: { options: { cwd: './lib/haml' } },
      less: { options: { cwd: './lib/less' } },
      jade: { options: { cwd: './lib/pug' } },
      sass: { options: { cwd: './lib/sass' } },
      slim: { options: { cwd: './lib/slim' } },
      pug: { options: { cwd: './lib/pug' } }
    },

    'npm-command': {
      options: {
        cwd: './lib/<%= grunt.config.get("libPath") %>',
      },
      prune: {
        options: {
          cmd: 'prune'
        }
      },
      update: {
        options: {
          cmd: 'update',
          args: ['--cache-min', '31540000', '--production']
        }
      }
    },

    update: {
      autoprefixer: { defaultBranch: 'master' },
      livescript: { defaultBranch: 'master' },
      jade: { defaultBranch: '1.11.0' },
      stylus: { defaultBranch: 'dev' },
      pug: { defaultBranch: 'master' },
      haml: {defaultBranch: 'master'},
      sass: {defaultBranch: 'stable'},
      slim: {defaultBranch: 'master'},
      less: { defaultBranch: '3.x' }
    },
    webpack: {
      livescript: {},
      stylus: {},
      less: {},
      jade: {},
      sass: {},
      slim: {},
      pug: {},
    },
    testFile: {
      jade: [
        './test/**/*.jade',
        './test/**/filters.cdata.jade',
        '!./**/auxiliary/*',
        '!./**/*extend*.jade',
        '!./**/*filter*.jade',
        '!./**/*include*.jade',
        '!./**/append*/*.jade',
        '!./**/mixin-hoist.jade',
        '!./**/fixtures/**/*.jade',
        '!./**/dependencies/*.jade',
      ],
      pug: [
        './test/**/*.pug',
        '!./test/anti-cases/**/*.pug',
        '!./test/dependencies/**/*.pug'
      ],
      less: [
        './test/less/**/*.less',
        '!./test/less/*Plugin/*',
        '!./test/less/debug/**/*',
        '!./test/less/nested-*/**/*',
        '!./test/**/*import*/**/*.less',
        '!./test/less/**/functions.less',
        '!./test/**/javascript-error.less',
        '!./test/less/**/*Processor*/*.less'
      ],
      sass: [
        './test/sass/**/*.sass',
        '!./test/sass/**/_*.sass',
        '!./test/sass/**/*bork*.sass',
        '!./test/sass/**/*_imported.sass',
        '!./test/sass/templates/subdir/**/*.sass',
      ],
      slim: [],
      haml: [],
      livescript: [],
      stylus: [ './test/cases/**/*.styl', './test/converter/**/*.styl' ],
    }
  });

  grunt.registerMultiTask('webpack', 'run our webpack command', function() {
    var done = this.async();

    var tag = grunt.config.get('currentTag');
    var proj = this.target;

    // we do this via spawn instead of the webpack node API because opal-webpack
    // checks the enviroment variable for OPAL_LOAD_PATH only at load time. Since
    // this changes for us over time, we need to be in a clean state. deleting
    // the loader via require.cache caused other errors, so this is the cleanest
    // way to accomplish it
    var wP = spawn('./node_modules/.bin/webpack', [
      '--output-path',
      `${__dirname}/dist/`,
      '--output-filename',
      `${proj}-${tag}.min.js`,
      '--config',
      `${__dirname}/lib/${proj}.webpack.config.js`
      ])

      wP.stdout.on('data', (data) => {
        grunt.log.write(data)
      });

      wP.stderr.on('data', (data) => {
        grunt.log.error(data)
      });

      wP.on('close', done);
  });

  grunt.registerMultiTask('testFile', function() {
    var webpack = require('webpack');
    var done = this.async();
    var lib = this.target;

    // pug is the new name for jade, so they share a repo. So for loading files
    // from said repo, we need to use the latest name - pug.
    var libPath = (lib === 'jade') ? 'pug' : lib;
    grunt.config.set('libPath', libPath);

    var rewrite = function(files) {
      return files.map(f => f.replace(/(^\.|\.[^.]+$)/g, ''))
        .map(f => `/base/lib/${libPath}${f}`)
    }

    if (lib === 'autoprefixer') {
      webpack('./test/autoprefixer-test.webpack.config', webpackCallback(() => {
        clearRequire.all()
        done();
      }));
    } else {
      var files = rewrite(grunt.file.expand({ cwd: `./lib/${libPath}` }, this.data))
      var tag = grunt.config.get('currentTag')

      grunt.file.write('./test/currentTag.js', `
        window.__testFiles=${JSON.stringify(files)};
        window.__libVersion="${tag}";
        window.__workerPath="/base/dist/${lib}-${tag}.min.js"
      `)
      done();
    }
  })

  // ensure that each given project has pulled down all of the latests updates
  grunt.registerMultiTask('update', function() {
    var tag = this.data.defaultBranch;

    grunt.config.set('currentTag', this.data.defaultBranch);
    grunt.task.run([`gitreset:${this.target}`]);
    grunt.task.run([`gitcheckout:${this.target}`]);

    if (tag) {
      grunt.task.run([`gitpull:${this.target}`]);
    }
  })

  // update dependencies, and apply changes to the library to ready it for processing
  grunt.registerTask('prepareLib', function(lib, tag) {

    if (isRubyLib(lib)) {
      grunt.task.run([`gitapply:${lib}`, 'clean:RUBY', `bundlerInstall:${lib}`, `env:${lib}`])
    } else {
      grunt.task.run(['npm-command:update', 'npm-command:prune']);
    }
  })


  grunt.registerTask('bundlerInstall', function(lib) {
    var done = this.async()

    grunt.util.spawn({
      cmd: 'bundler',
      args: ['install', '--with', lib, '--without'].concat(rubyLibs.filter( l => l != lib))
    }, function(err, result) {
      if (err) {
        grunt.log.error(result)
      }

      grunt.log.write(result)
      done()
    })
  })


  // delete the old files, update the projects, then get new tags (via log) and
  // then trigger then build for each tag, then update again to switch back to
  // latest commit to prevent commiting an old sha to our submodule
  grunt.registerTask('generate', function(lib, full_run) {
    if (full_run === 'undefined') {full_run = undefined};
    grunt.config.set('FULL_RUN', !!full_run);
    grunt.config.set('lib', lib);
    grunt.task.run([`clean:${lib}`, `update:${lib}`, `gitlog:${lib}`, `update:${lib}`])
  });

  // create an individual build of the library. Called in a loop, with the results
  // of the gitlog task
  grunt.registerTask('build', function(lib, tag) {
      grunt.config.set('lib', lib);
      grunt.config.set('currentTag', tag);

      var libPath = (lib === 'jade') ? 'pug' : lib;

      grunt.config.set('libPath', libPath);

      grunt.task.run([`gitreset:${lib}`, `gitcheckout:${lib}:${tag}`, `prepareLib:${lib}:${tag}`, grunt.config.get('FULL_RUN') ? `generateAndTestTag:${lib}:${tag}` : `generateTag:${lib}:${tag}`]);
  })

  // quickly generate files, by just testing the results in a local build of chrome
  grunt.registerTask('generateTag', function(lib) {
    grunt.task.run([`webpack:${lib}`, `testFile:${lib}`, 'karma:fast']);
  });

  // generate files, and test in browsers matched on saucelabs in the karma config
  grunt.registerTask('generateAndTestTag', function(lib) {
    grunt.task.run([`webpack:${lib}`, `testFile:${lib}`, 'karma:full'])
  });

  // generate files, and test in browsers matched on saucelabs in the karma config
  grunt.registerTask('everything', function(full) {
    Object
      .keys(grunt.config.data.webpack)
      .map(lib => grunt.task.run(`generate:${lib}:${full}`));
  });
};
