'use strict';

module.exports = function(grunt) {
    //grunt plugins
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');
    // TODO: JSHint
    // TODO: Uglify and dist

    grunt.initConfig({
        karma: {
            unit: {
                configFile: 'karma-dev.conf.js',
                background: true
            },
            ci: {
                configFile: 'karma-ci.conf.js',
                singleRun: true
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

    grunt.registerTask('run', [
        'karma:unit',
        'watch'
    ]);
};
