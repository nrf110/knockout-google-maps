'use strict';

module.exports = function(grunt) {
    //grunt plugins
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');
    // TODO: JSHint

    grunt.initConfig({
        copy: {
            dist: {
                files: [

                ]
            }
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                background: true
            },
            continuous: {
                configFile: 'karma.conf.js',
                singleRun: true,
                browsers: ['PhantomJS']
            }
        },
        watch: {
            karma: {
                files: ['knockout-google-maps.js', 'spec/**.js'],
                tasks: ['karma:unit:run']
            },
            js: {
                files: ['knockout-google-maps.js'],
                tasks: []
            }
        }
    });
};
