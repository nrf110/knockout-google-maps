var sharedConfig = require('./karma-shared.conf');

module.exports = function(config) {
    sharedConfig(config);

    config.set({

        plugins: ['karma-mocha', 'karma-phantomjs-launcher', 'karma-expect', 'karma-junit-reporter'],

        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['junit'],

        junitReporter: {
            outputFile: 'test_reports/test-results.xml',
            suite: ''
        }
    });
};