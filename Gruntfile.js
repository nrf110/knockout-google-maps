'use strict';

module.exports = function(grunt) {
    //grunt plugins
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');

    var banner = '// <%= pkg.name %> - v<%= pkg.version %> \n' +
        '// (c) Nick Fisher - https://github.com/nrf110/knockout-google-maps\n' +
        '// License: MIT (http://www.opensource.org/licenses/mit-license.php)\n';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        /*karma: {
            unit: {
                configFile: 'karma-dev.conf.js',
                background: true
            },
            ci: {
                configFile: 'karma-ci.conf.js',
                singleRun: true
            }
        },*/
        watch: {
            options: {
                livereload: true
            },
            example: {
                files: ['example/**.js', 'example/**.html', 'src/**.js']
            }/*,
            karma: {
                files: ['src/*.js', 'spec/**.js'],
                tasks: ['karma:unit:run']
            }*/
        },
        uglify: {
            options: {
                mangle: false,
                banner: banner
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['src/<%= pkg.name %>.js']
                }
            }
        },
        concat: {
            dist: {
                options: {
                    banner: banner
                },
                src: ['src/<%= pkg.name %>.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        connect: {
            server: {
                options: {
                    port: 9000,
                    base: ''
                }
            }
        }
    });

    grunt.registerTask('run', [
        //'karma:unit',
        'connect',
        'watch'
    ]);

    grunt.registerTask('dist', [
        'karma:ci',
        'concat',
        'uglify'
    ]);
};
